// The foot style kit (Feetza 2.0 "one silhouette" style): one light for the whole game, form shading for any
// closed silhouette, creases, ambient occlusion, highlights and procedural material textures.
//
// The rules every redrawn foot follows (see the style sheet: ?dev&style, or the "🦶 Style" dev button):
// - One continuous silhouette per foot, stroked once (outline()). Everything inside it is painted clipped to it
//   (inside()), so there are no seams and no stacked outlines. Inner boundaries are creases or seams, never ink.
// - One key light from the top left (LIGHT.dir), a cool rim light on the bottom-right edge, soft ambient
//   occlusion where parts meet, shadows that shift towards the material's shadow tint rather than to grey.
// - Materials (materials.ts) set the ramp, the texture, the spec and the rim for each surface.
//
// Everything here draws in the feet's design space (centre x = CX = 110, ankle near y = -6, sole near y = 260).

import { type Ctx, makeCanvas, mix, rgba, shade } from '../util';

/** The one light. dir points from the surface towards the key light (top left). */
export const LIGHT = {
  dir: [-0.6, -0.8] as const,
  key: '#fff2d8',
  rim: '#cfe2ff',
  /** Ambient occlusion colour (multiplied in). */
  ao: '#2a1206',
};

/** Line and palette rules. */
export const STYLE = {
  /** Silhouette outline width (design units; the old style's was 5.5). */
  outline: 4.5,
  /** The ink every outline is mixed towards. */
  ink: '#22130b',
  /** How much an outline takes from the ink (the rest is the material's deep shade). */
  inkMix: 0.5,
  /** Textures for redrawn feet are drawn this much larger than shown (the old style's ART_RES was 1.35). */
  res: 2,
  /** But never more than this many texels per design unit in total (scale × res), so bosses stay affordable. */
  maxTexel: 3,
};

/** A foot's pose for the rig: frames of the texture are drawn at a few poses and cross-faded in play. */
export interface Pose {
  /** Toes curl under (anticipation): 0 rest … 1 fully curled. Negative splays them (landing). */
  curl: number;
  /** Per-toe wiggle offsets (−1…1), little toe first. */
  wiggle: readonly number[];
  /** Animation time for parts that boil or flow (s). */
  t: number;
  /** Heat 0…1 (overheat state), for art that bakes it in. */
  heat: number;
}

export const REST: Pose = { curl: 0, wiggle: [0, 0, 0, 0, 0], t: 0, heat: 0 };

export const pose = (p: Partial<Pose>): Pose => ({ ...REST, ...p });

// ——— geometry helpers ———

/** Device pixels per design unit at ctx's current transform. */
export function pxPerUnit(ctx: Ctx): number {
  const m = ctx.getTransform();
  return Math.hypot(m.a, m.b) || 1;
}

export type PathFn = (ctx: Ctx) => void;

/** Run `fn` clipped to `path`. */
export function inside(ctx: Ctx, path: PathFn, fn: () => void): void {
  ctx.save();
  path(ctx);
  ctx.clip();
  fn();
  ctx.restore();
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The outline colour for a material colour: its deep shade pulled towards the ink. */
export function inkOf(base: string): string {
  return mix(shade(base, -0.62), STYLE.ink, STYLE.inkMix);
}

/** Stroke the silhouette once. */
export function outline(ctx: Ctx, path: PathFn, col: string, w = STYLE.outline): void {
  path(ctx);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.stroke();
}

/**
 * Inner shadow (or glow) along a silhouette's inside edge: the area outside the path casts a blurred shadow
 * offset by (dx, dy) design units. A shadow offset towards the light shades the far edges (form shading);
 * a light colour offset away from the light makes a bevel highlight on the near edges.
 */
export function innerEdge(ctx: Ctx, path: PathFn, col: string, blur: number, dx: number, dy: number, op: GlobalCompositeOperation = 'source-over'): void {
  // canvas shadows ignore the transform: blur and offset are in device pixels
  const k = pxPerUnit(ctx);
  ctx.save();
  path(ctx);
  ctx.clip();
  ctx.globalCompositeOperation = op;
  ctx.shadowColor = col;
  ctx.shadowBlur = blur * k;
  ctx.shadowOffsetX = dx * k;
  ctx.shadowOffsetY = dy * k;
  // the path (it begins its own) plus a huge rect round it: filled even-odd, that is everything outside the path
  path(ctx);
  ctx.rect(-3000, -3000, 6000, 6000);
  ctx.fillStyle = '#000';
  ctx.fill('evenodd');
  ctx.restore();
}

export interface FormOpts {
  /** Lit base colour. */
  base: string;
  /** The colour shadows shift towards (subsurface red for skin, cool violet for most things). */
  shadowTint?: string;
  /** Strength of the form shadow on the far edges (0…1). */
  form?: number;
  /** Size of the form shadow, design units. */
  formSize?: number;
  /** Bevel highlight on the near edges (0…1). */
  bevel?: number;
  /** Rim light strength on the far edge (0…1). */
  rim?: number;
  /** Light-to-dark ramp across the form (0…1). */
  ramp?: number;
}

/** Fill a silhouette with the base colour lit by the key light: a ramp along the light, a form shadow on the far
 * edges, a bevel highlight on the near edges and the rim light. Does not stroke. */
export function formFill(ctx: Ctx, path: PathFn, box: Box, o: FormOpts): void {
  const tint = o.shadowTint ?? '#2c2448';
  const ramp = o.ramp ?? 0.5;
  const [lx, ly] = LIGHT.dir;
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const r = Math.max(box.w, box.h) / 2;
  const g = ctx.createLinearGradient(cx + lx * r, cy + ly * r, cx - lx * r, cy - ly * r);
  g.addColorStop(0, shade(o.base, 0.22 * ramp));
  g.addColorStop(0.45, o.base);
  g.addColorStop(1, mix(shade(o.base, -0.42 * ramp), tint, 0.25 * ramp));
  path(ctx);
  ctx.fillStyle = g;
  ctx.fill();
  const fs = o.formSize ?? Math.min(box.w, box.h) * 0.16;
  const form = o.form ?? 0.55;
  if (form > 0) innerEdge(ctx, path, rgba(mix(shade(o.base, -0.75), tint, 0.4), form), fs, lx * fs * 0.55, ly * fs * 0.55);
  const bevel = o.bevel ?? 0.35;
  if (bevel > 0) innerEdge(ctx, path, rgba(LIGHT.key, bevel), fs * 0.45, -lx * fs * 0.22, -ly * fs * 0.22);
  const rim = o.rim ?? 0.45;
  if (rim > 0) innerEdge(ctx, path, rgba(LIGHT.rim, rim), 2.2, lx * 2.4, ly * 2.4);
}

/** A soft ambient-occlusion blot (where parts meet). */
export function ao(ctx: Ctx, x: number, y: number, rx: number, ry: number, a: number, rot = 0, col = LIGHT.ao): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, rgba(col, a));
  g.addColorStop(0.55, rgba(col, a * 0.45));
  g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A soft highlight with a hotter core (specular), elongated along `rot`. */
export function spec(ctx: Ctx, x: number, y: number, rx: number, ry: number, a: number, rot = -0.6, col = '#ffffff'): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, rgba(col, a));
  g.addColorStop(0.3, rgba(col, a * 0.55));
  g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A sharp four-point glint (polished metal, wet eyes). */
export function glint(ctx: Ctx, x: number, y: number, s: number, a = 0.95): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = rgba('#ffffff', a);
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.quadraticCurveTo(s * 0.12, -s * 0.12, s, 0);
  ctx.quadraticCurveTo(s * 0.12, s * 0.12, 0, s);
  ctx.quadraticCurveTo(-s * 0.12, s * 0.12, -s, 0);
  ctx.quadraticCurveTo(-s * 0.12, -s * 0.12, 0, -s);
  ctx.fill();
  ctx.restore();
}

/** An engraved line lit from the top left: a dark groove with a light lip below/right of it. `draw` adds the
 * path's segments (no beginPath). */
export function crease(ctx: Ctx, draw: (ctx: Ctx) => void, w: number, dark: string, a = 0.55, lightA = 0.35): void {
  const [lx, ly] = LIGHT.dir;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.translate(-lx * w * 0.45, -ly * w * 0.45);
  ctx.beginPath();
  draw(ctx);
  ctx.strokeStyle = rgba(LIGHT.key, lightA);
  ctx.lineWidth = w * 0.7;
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  draw(ctx);
  ctx.strokeStyle = rgba(dark, a);
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.restore();
}

/** A soft, wide, blurred stroke (a fold, a tendon's shadow) using a canvas blur when the browser has one. */
export function softStroke(ctx: Ctx, draw: (ctx: Ctx) => void, col: string | CanvasGradient, w: number, blur: number): void {
  const k = pxPerUnit(ctx);
  ctx.save();
  if ('filter' in ctx) ctx.filter = `blur(${(blur * k).toFixed(1)}px)`;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  draw(ctx);
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.restore();
}

/** Fill a path blurred by `blur` design units (soft painted shapes: bruises, glows, soot). */
export function softFill(ctx: Ctx, path: PathFn, fill: string | CanvasGradient, blur: number, op: GlobalCompositeOperation = 'source-over'): void {
  const k = pxPerUnit(ctx);
  ctx.save();
  if ('filter' in ctx) ctx.filter = `blur(${(blur * k).toFixed(1)}px)`;
  ctx.globalCompositeOperation = op;
  path(ctx);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

// ——— noise ———

function hash2(x: number, y: number, s: number): number {
  let h = (x * 374761393 + y * 668265263 + s * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth 2D value noise in [0, 1). */
export function vnoise(x: number, y: number, seed = 0): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, seed);
  const b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed);
  const d = hash2(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Fractal value noise (octaves of vnoise) in roughly [0, 1). */
export function fbm(x: number, y: number, oct = 4, seed = 0): number {
  let s = 0;
  let a = 0.5;
  let f = 1;
  let n = 0;
  for (let i = 0; i < oct; i++) {
    s += vnoise(x * f, y * f, seed + i * 17) * a;
    n += a;
    a *= 0.5;
    f *= 2;
  }
  return s / n;
}

// ——— material textures ———
// Small tileable canvases, drawn once at 1 texel per device pixel and laid over a surface as a pattern.

export type TextureKind = 'pores' | 'grain' | 'leather' | 'canvas' | 'knit' | 'brushed' | 'cast' | 'stone' | 'scales' | 'wood' | 'fleece' | 'rubber' | 'speckle';

const TEX = 128;
const texCache = new Map<TextureKind, HTMLCanvasElement>();

/** Signed tile: mid grey 128 means no change (draw it with 'overlay' or 'soft-light'). */
function makeTexture(kind: TextureKind): HTMLCanvasElement {
  const [c, x] = makeCanvas(TEX, TEX);
  const img = x.createImageData(TEX, TEX);
  const d = img.data;
  const tile = (fx: (u: number, v: number) => number) => {
    for (let j = 0; j < TEX; j++)
      for (let i = 0; i < TEX; i++) {
        const v = Math.max(0, Math.min(255, 128 + fx(i, j) * 127));
        const o = (j * TEX + i) * 4;
        d[o] = d[o + 1] = d[o + 2] = v;
        d[o + 3] = 255;
      }
  };
  // tileable noise: sample on a torus by blending the four wrapped copies
  const tn = (i: number, j: number, f: number, seed: number) => {
    const u = i / TEX;
    const v = j / TEX;
    const n = (a: number, b: number) => vnoise(a * f, b * f, seed);
    return n(u, v) * (1 - u) * (1 - v) + n(u + 1, v) * u * (1 - v) + n(u, v + 1) * (1 - u) * v + n(u + 1, v + 1) * u * v;
  };
  const r = (i: number, j: number, s: number) => hash2(i, j, s);
  switch (kind) {
    case 'pores':
      tile((i, j) => (tn(i, j, 24, 1) - 0.5) * 0.35 + (r(i, j, 2) - 0.5) * 0.25 - (r(i, j, 3) > 0.985 ? 0.9 : 0));
      break;
    case 'grain':
    case 'speckle':
      tile((i, j) => (r(i, j, 5) - 0.5) * (kind === 'grain' ? 0.5 : 0.9) + (tn(i, j, 16, 6) - 0.5) * 0.3);
      break;
    case 'leather':
      // pebbled: cells with dark rims
      tile((i, j) => {
        const a = tn(i, j, 22, 7);
        const b = tn(i, j, 44, 8);
        const cell = Math.abs(a - 0.5) * 2;
        return (cell < 0.08 ? -0.7 : 0.15) * 0.6 + (b - 0.5) * 0.4 + (r(i, j, 9) - 0.5) * 0.15;
      });
      break;
    case 'canvas':
      tile((i, j) => {
        const wx = Math.sin((i / TEX) * Math.PI * 2 * 32);
        const wy = Math.sin((j / TEX) * Math.PI * 2 * 32);
        const over = ((Math.floor((i / TEX) * 32) + Math.floor((j / TEX) * 32)) & 1) ? wx : wy;
        return over * 0.45 + (r(i, j, 10) - 0.5) * 0.25;
      });
      break;
    case 'knit':
      tile((i, j) => {
        const cw = TEX / 16;
        const ch = TEX / 12;
        const u = (i % cw) / cw;
        const v = (j % ch) / ch;
        const lane = Math.abs(u - 0.5) * 2;
        const vee = Math.abs(v - lane * 0.5 - 0.25);
        return (vee < 0.18 ? 0.45 : -0.35) * (1 - lane * 0.4) + (r(i, j, 11) - 0.5) * 0.2;
      });
      break;
    case 'brushed':
      tile((i, j) => (tn(i * 0.02, j, 40, 12) - 0.5) * 0.9 + (r(i >> 3, j, 13) - 0.5) * 0.4);
      break;
    case 'cast':
      tile((i, j) => (tn(i, j, 12, 14) - 0.5) * 0.5 + (r(i, j, 15) - 0.5) * 0.35 - (r(i, j, 16) > 0.975 ? 0.8 : 0));
      break;
    case 'stone':
      tile((i, j) => {
        const n = tn(i, j, 10, 17);
        const vein = Math.abs(tn(i, j, 5, 18) - 0.5) < 0.02 ? -0.8 : 0;
        return (n - 0.5) * 0.8 + (r(i, j, 19) - 0.5) * 0.4 + vein;
      });
      break;
    case 'scales':
      tile((i, j) => {
        const s = TEX / 8;
        const row = Math.floor(j / (s * 0.5));
        const ox = row & 1 ? s / 2 : 0;
        const u = (((i + ox) % s) / s) * 2 - 1;
        const v = ((j % (s * 0.5)) / (s * 0.5)) * 2 - 1;
        const d0 = Math.hypot(u, v * 1.2 + 0.4);
        return d0 > 0.92 ? -0.8 : (0.6 - d0) * 0.8;
      });
      break;
    case 'wood':
      tile((i, j) => {
        const w = Math.sin((j / TEX) * Math.PI * 2 * 6 + tn(i, j, 6, 20) * 6);
        return w * 0.4 + (tn(i * 0.1, j, 30, 21) - 0.5) * 0.4;
      });
      break;
    case 'fleece':
      tile((i, j) => {
        const n = tn(i, j, 20, 22);
        const curl = Math.sin(n * 40);
        return curl * 0.35 + (r(i, j, 23) - 0.5) * 0.25;
      });
      break;
    case 'rubber':
      tile((i, j) => (tn(i, j, 30, 24) - 0.5) * 0.25 + (r(i, j, 25) - 0.5) * 0.12);
      break;
  }
  x.putImageData(img, 0, 0);
  return c;
}

/** Lay a material texture over the current clip: `a` its strength, `scale` its size (1 = a texel per device px). */
export function texture(ctx: Ctx, kind: TextureKind, box: Box, a: number, scale = 1, op: GlobalCompositeOperation = 'overlay'): void {
  let c = texCache.get(kind);
  if (!c) {
    c = makeTexture(kind);
    texCache.set(kind, c);
  }
  const p = ctx.createPattern(c, 'repeat');
  if (!p) return;
  const k = pxPerUnit(ctx);
  p.setTransform(new DOMMatrix().scale(scale / k, scale / k));
  ctx.save();
  ctx.globalAlpha = a;
  ctx.globalCompositeOperation = op;
  ctx.fillStyle = p;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.restore();
}
