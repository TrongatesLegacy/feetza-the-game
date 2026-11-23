// Painterly surfaces for the location kit: no flat fills. A wall, a floor or a sky is a base colour broken by soft
// colour drift (warm lights, cool darks), a mid-scale mottle, the painter's strokes and a fine grain; then wear:
// grime gathered in corners and along edges, stains run down from ledges, hairline cracks with a lit lip.
//
// Every noise field here is small (≤ 256 px), cached, and drawn stretched: the cost of a surface is a few
// drawImage calls, whatever its size.

import { type TextureKind, texture, vnoise } from '../style/kit';
import { type Ctx, makeCanvas, rgba, shade } from '../util';
import { type Box, type R, LIGHT } from './kit';

// ——— noise fields ———

const cache = new Map<string, HTMLCanvasElement>();

/** Fractal noise on a w×h grid, contrast-stretched to about 0…1 (0.5 the mean). */
function fbmAt(i: number, j: number, w: number, h: number, cells: number, seed: number, oct: number, gain: number): number {
  let s = 0;
  let a = 1;
  let f = cells / Math.max(w, h);
  let n = 0;
  for (let o = 0; o < oct; o++) {
    s += vnoise(i * f, j * f, seed + o * 31) * a;
    n += a;
    a *= gain;
    f *= 2;
  }
  return Math.max(0, Math.min(1, 0.5 + (s / n - 0.5) * 2.2));
}

function cached(key: string, w: number, h: number, px: (v: number, i: number, j: number) => [number, number, number, number], cells: number, seed: number, oct = 4, gain = 0.55): HTMLCanvasElement {
  const hit = cache.get(key);
  if (hit) return hit;
  const [c, ctx] = makeCanvas(w, h);
  const img = ctx.createImageData(w, h);
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const [r, g, b, a] = px(fbmAt(i, j, w, h, cells, seed, oct, gain), i, j);
      const k = (j * w + i) * 4;
      img.data[k] = r;
      img.data[k + 1] = g;
      img.data[k + 2] = b;
      img.data[k + 3] = a;
    }
  ctx.putImageData(img, 0, 0);
  cache.set(key, c);
  return c;
}

const rgbOf = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/**
 * Two-tone colour drift: where the noise is high, `light` shows through (up to alpha `amt`); where it's low, `dark`.
 * Laid over a base colour it breaks it like a painter's broken colour, without the grey cast of an overlay.
 */
export function drift(light: string, dark: string, cells: number, seed: number, w = 160, h = 90): HTMLCanvasElement {
  const L = rgbOf(light);
  const D = rgbOf(dark);
  return cached(`drift:${light}:${dark}:${cells}:${seed}:${w}x${h}`, w, h, (v) => {
    const s = (v - 0.5) * 2;
    return s > 0 ? [L[0], L[1], L[2], Math.round(s * 255)] : [D[0], D[1], D[2], Math.round(-s * 255)];
  }, cells, seed);
}

/**
 * A noise mask: colour `col`, its alpha the noise pushed through a soft threshold so about `cover` of the field
 * shows. kind 'web' makes a net of thin lines (lace foam, caustics, crazing) instead of blotches.
 */
export function noiseMask(cells: number, seed: number, o: { cover?: number; soft?: number; col?: string; kind?: 'blot' | 'web'; w?: number; h?: number; oct?: number } = {}): HTMLCanvasElement {
  const cover = o.cover ?? 0.5;
  const soft = o.soft ?? 0.12;
  const col = rgbOf(o.col ?? '#000000');
  const w = o.w ?? 160;
  const h = o.h ?? 90;
  const kind = o.kind ?? 'blot';
  return cached(`mask:${cells}:${seed}:${cover}:${soft}:${o.col}:${kind}:${w}x${h}:${o.oct}`, w, h, (v) => {
    let a: number;
    if (kind === 'web') {
      // thin where the noise crosses its middle: a cellular net
      const d = Math.abs(v - 0.5) * 2;
      a = 1 - smooth(cover * 0.35 - soft, cover * 0.35 + soft, d);
    } else a = smooth(1 - cover - soft, 1 - cover + soft, v);
    return [col[0], col[1], col[2], Math.round(a * 255)];
  }, cells, seed, o.oct ?? 4);
}

export const smooth = (e0: number, e1: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0 || 1e-6)));
  return t * t * (3 - 2 * t);
};

/** Draw a cached field stretched over a box. */
export function lay(ctx: Ctx, f: HTMLCanvasElement, box: Box, a: number, op: GlobalCompositeOperation = 'source-over'): void {
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.globalCompositeOperation = op;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(f, box.x, box.y, box.w, box.h);
  ctx.restore();
}

/**
 * Paint something soft cheaply: `draw` (in screen coordinates) goes onto a small offscreen at scale k (default 1/4)
 * covering `box`, which is then drawn back up over the box with `op`. The upscale is the blur: no ctx.filter over a
 * big area. Use it for anything big and soft (soot, glow paths, reflections, wisps).
 */
export function softly(ctx: Ctx, box: Box, draw: (g: Ctx) => void, k = 0.25, op: GlobalCompositeOperation = 'source-over'): void {
  const [c, g] = makeCanvas(box.w * k, box.h * k);
  g.scale(k, k);
  g.translate(-box.x, -box.y);
  draw(g);
  ctx.save();
  ctx.globalCompositeOperation = op;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(c, box.x, box.y, box.w, box.h);
  ctx.restore();
}

// ——— the painted surface ———

export interface SurfaceOpts {
  /** Colour drift: warm lights and cool darks wandering over the surface (0…1, default 0.5). */
  vary?: number;
  /** The drift's colours (default: the key light's warm and a cool violet-blue). */
  warm?: string;
  cool?: string;
  /** How many big blotches across the box (default 4). */
  cells?: number;
  /** Mid-scale mottle (0…1, default 0.35). */
  mottle?: number;
  /** Painter's strokes (count per 100×100 px, default 0.4): long, faint, along `strokeAng` (radians, ± jitter). */
  strokes?: number;
  strokeAng?: number;
  strokeLen?: number;
  strokeW?: number;
  /** Fine grain (texture kind and strength, default 'grain' 0.18). */
  grain?: number;
  grainKind?: TextureKind;
  grainScale?: number;
  /** Skip the base fill (paint the variation over what's there). */
  over?: boolean;
  seed?: number;
}

/**
 * The location kit's base for any big surface: base colour, soft warm/cool drift at two scales, painter's strokes,
 * fine grain. Clip first if the surface isn't a rectangle.
 */
export function surface(ctx: Ctx, r: R, box: Box, base: string, o: SurfaceOpts = {}): void {
  const seed = o.seed ?? 7;
  const vary = o.vary ?? 0.5;
  const warm = o.warm ?? shade(base, 0.28);
  const cool = o.cool ?? shade(mixCool(base), -0.3);
  if (!o.over) {
    ctx.fillStyle = base;
    ctx.fillRect(box.x, box.y, box.w, box.h);
  }
  const cells = o.cells ?? 4;
  lay(ctx, drift(warm, cool, cells, seed), box, vary * 0.55);
  lay(ctx, drift(shade(base, 0.12), shade(base, -0.16), cells * 4, seed + 3), box, (o.mottle ?? 0.35) * 0.7);
  const ns = Math.round(((box.w * box.h) / 10000) * (o.strokes ?? 0.4));
  if (ns > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(box.x, box.y, box.w, box.h);
    ctx.clip();
    ctx.lineCap = 'round';
    const ang = o.strokeAng ?? 0;
    const L = o.strokeLen ?? 120;
    const sw = o.strokeW ?? 22;
    for (let i = 0; i < ns; i++) {
      const x = box.x + r() * box.w;
      const y = box.y + r() * box.h;
      const len = L * (0.5 + r());
      const a = ang + (r() - 0.5) * 0.5;
      const lightSide = r() < 0.55;
      ctx.strokeStyle = rgba(lightSide ? shade(base, 0.1 + r() * 0.08) : shade(base, -0.08 - r() * 0.08), 0.05 + r() * 0.07);
      ctx.lineWidth = sw * (0.5 + r());
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + Math.cos(a) * len * 0.5 + (r() - 0.5) * sw, y + Math.sin(a) * len * 0.5 + (r() - 0.5) * sw, x + Math.cos(a) * len, y + Math.sin(a) * len);
      ctx.stroke();
    }
    ctx.restore();
  }
  const g = o.grain ?? 0.18;
  if (g > 0) texture2(ctx, box, o.grainKind ?? 'grain', g, o.grainScale ?? 1.3);
}

/** A base colour's cool counterpart (for the drift's darks): pulled towards violet-blue. */
function mixCool(base: string): string {
  const [r, g, b] = rgbOf(base);
  const t = 0.35;
  const c = [0x5a, 0x5c, 0x9a];
  const h = (v: number) => Math.round(v).toString(16).padStart(2, '0');
  return `#${h(r + (c[0] - r) * t)}${h(g + (c[1] - g) * t)}${h(b + (c[2] - b) * t)}`;
}

function texture2(ctx: Ctx, box: Box, kind: TextureKind, a: number, scale: number): void {
  texture(ctx, kind, box, a, scale, 'overlay');
}

// ——— wear ———

export interface GrimeOpts {
  col?: string;
  /** Overall strength (0…1, default 0.5). */
  a?: number;
  /** Band depths (px) of grime gathering along each edge: bottom (scuffs and damp), top (soot), sides (corners). */
  bottom?: number;
  top?: number;
  left?: number;
  right?: number;
  /** How patchy it is (0 even … 1 very broken, default 0.6). */
  patchy?: number;
  seed?: number;
}

/** Grime and wear where a surface meets others: darker, patchy bands along its edges, densest in the corners. */
export function grime(ctx: Ctx, box: Box, o: GrimeOpts = {}): void {
  const k = 0.25;
  const [c, g] = makeCanvas(box.w * k, box.h * k);
  g.scale(k, k);
  const col = o.col ?? LIGHT.ao;
  const a = o.a ?? 0.5;
  const band = (x0: number, y0: number, x1: number, y1: number, depth: number) => {
    if (!depth) return;
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, rgba(col, a));
    gr.addColorStop(0.4, rgba(col, a * 0.35));
    gr.addColorStop(1, rgba(col, 0));
    g.fillStyle = gr;
    g.fillRect(0, 0, box.w, box.h);
  };
  band(0, box.h, 0, box.h - (o.bottom ?? 0), o.bottom ?? 0);
  band(0, 0, 0, o.top ?? 0, o.top ?? 0);
  band(0, 0, o.left ?? 0, 0, o.left ?? 0);
  band(box.w, 0, box.w - (o.right ?? 0), 0, o.right ?? 0);
  // break it up: keep it where the noise says (never fully gone, never even)
  const p = o.patchy ?? 0.6;
  g.globalCompositeOperation = 'destination-in';
  g.globalAlpha = 1;
  const m = noiseMask(10, o.seed ?? 5, { cover: 0.55, soft: 0.3 });
  g.setTransform(1, 0, 0, 1, 0, 0);
  // (destination-in with a translucent mask: draw the mask, then lift the floor with a flat fill under it)
  const [mc, mg] = makeCanvas(c.width, c.height);
  mg.fillStyle = rgba('#000000', 1 - p);
  mg.fillRect(0, 0, c.width, c.height);
  mg.globalAlpha = p;
  mg.drawImage(m, 0, 0, c.width, c.height);
  g.drawImage(mc, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(c, box.x, box.y, box.w, box.h);
  ctx.restore();
}

/** Stains run down a wall from a ledge, a pipe or a crack: soft streaks, darker at their tide-line. */
export function streaks(ctx: Ctx, r: R, x: number, y: number, w: number, len: number, col: string, a = 0.2, n = 5): void {
  ctx.save();
  ctx.filter = 'blur(2.5px)';
  for (let i = 0; i < n; i++) {
    const sx = x + (r() - 0.5) * w;
    const sl = len * (0.4 + r() * 0.6);
    const sw = 3 + r() * (w / n);
    const g = ctx.createLinearGradient(0, y, 0, y + sl);
    g.addColorStop(0, rgba(col, a * (0.6 + r() * 0.4)));
    g.addColorStop(0.75, rgba(col, a * 0.5));
    g.addColorStop(0.92, rgba(col, a * 0.9));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(sx - sw / 2, y);
    ctx.quadraticCurveTo(sx - sw * 0.4 + (r() - 0.5) * 4, y + sl * 0.5, sx - 1, y + sl);
    ctx.lineTo(sx + 1, y + sl);
    ctx.quadraticCurveTo(sx + sw * 0.4 + (r() - 0.5) * 4, y + sl * 0.5, sx + sw / 2, y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export interface CrackOpts {
  /** Line colour (the dark of the gap) and the lit lip's. */
  col?: string;
  lip?: string;
  /** Width at the root (px), tapering to a hair. */
  w?: number;
  a?: number;
  /** Chance per step of a side branch. */
  branch?: number;
}

/**
 * A hairline crack from (x, y) heading along `ang` for about `len` px: a dark gap with a lit lip on its lower
 * side (the key light is top left), tapering, with a few short branches. Cracks belong where stress gathers: the
 * corners of openings, under beams, at the foot of a wall; never scattered at random.
 */
export function crack(ctx: Ctx, r: R, x: number, y: number, ang: number, len: number, o: CrackOpts = {}, depth = 0): void {
  const w0 = (o.w ?? 1.8) * (depth ? 0.6 : 1);
  const a = o.a ?? 0.6;
  const pts: [number, number][] = [[x, y]];
  let px = x;
  let py = y;
  let d = ang;
  for (let s = 0; s < len; ) {
    const step = 5 + r() * 9;
    d += (r() - 0.5) * 0.7;
    // (keep heading roughly the way it started)
    d += (ang - d) * 0.25;
    px += Math.cos(d) * step;
    py += Math.sin(d) * step;
    pts.push([px, py]);
    s += step;
    if (depth < 2 && r() < (o.branch ?? 0.12)) crack(ctx, r, px, py, d + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.5), len * (0.2 + r() * 0.25), o, depth + 1);
  }
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const n = pts.length - 1;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const w = Math.max(0.5, w0 * (1 - t * 0.8));
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    ctx.strokeStyle = rgba(o.lip ?? LIGHT.key, a * 0.45 * (1 - t * 0.6));
    ctx.lineWidth = w * 0.8;
    ctx.beginPath();
    ctx.moveTo(ax + 0.9, ay + 1.1);
    ctx.lineTo(bx + 0.9, by + 1.1);
    ctx.stroke();
    ctx.strokeStyle = rgba(o.col ?? '#2a1208', a * (1 - t * 0.55));
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
  }
  ctx.restore();
}

/** Small chips knocked out of an edge (an arris, a step, a table's lip): each a dark pit with a lit far side. */
export function chips(ctx: Ctx, r: R, x0: number, x1: number, y: number, n: number, col: string, size = 4): void {
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * (x1 - x0);
    const s = size * (0.5 + r());
    ctx.fillStyle = rgba(shade(col, -0.45), 0.55);
    ctx.beginPath();
    ctx.ellipse(x, y + s * 0.3, s, s * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(LIGHT.key, 0.3);
    ctx.beginPath();
    ctx.ellipse(x + s * 0.4, y + s * 0.6, s * 0.6, s * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}
