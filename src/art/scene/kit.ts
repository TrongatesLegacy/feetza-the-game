// The location style kit: the scene-scale counterpart of the foot style kit (src/art/style). Backdrops painted with
// it share the feet's one light, line and materials, so a foot and the room it stomps in look lit by one world.
//
// The rules every redrawn location follows (see the before/after page: ?dev&stages, or the "🏞 Stages" dev button):
// - Layered depth: sky/far, mid, near, then the table (and floor). Each layer has a depth (0 near … 1 far) and is
//   painted through the air: colours shift towards the air colour, contrast and line weight fall with distance.
// - One key light from the top left (LIGHT.dir, the feet's), a cool rim on the far (bottom-right) edges. Things cast
//   soft shadows down and to the right, ambient occlusion darkens where things meet, lamps and fires lay light pools.
// - Real materials at scene scale (materials.ts): plaster, brick, wood, cloth, tile, stone, sand, water, metal, glass.
// - One silhouette per prop with one ink outline (thinner and lighter with depth); detail painted inside the forms.
// - A readable play area: values stay calm behind the feet's lanes (calmLanes) and on the table under the pizzas.
// - Light that adds (glows, pools, beams: 'lighter') belongs in still layers that stay in the live base: a layer baked
//   on its own has nothing under it to add to.
// - Parallax-ready: a scene is a stack of named layers (layers.ts); the ones that move are baked to their own
//   sprites for the live code (src/game/sceneLive.ts), and the still shows everything painted in place.
//
// Everything draws in screen space: 1920×1080, the table's back edge at TY.
//
// The kit's other modules: paint.ts (painterly surfaces and wear), light.ts (lamps, windows, shafts, bounce,
// occlusion, long shadows), sky.ts (skies, sun, clouds), materials.ts (scene materials), props.ts. README.md is
// the guide for redrawing a place: API, layer and live conventions, the quality checklist, budgets, checks.

import { H, HY, TY, VX, W } from '../backdrops';
import { type Box, type PathFn, LIGHT, STYLE, ao, inkOf, innerEdge, pxPerUnit, trace } from '../style/kit';
import { type Material, type MaterialId, MATERIALS, paint } from '../style/materials';
import { type Ctx, mix, rgba, shade } from '../util';

export { H, HY, TY, VX, W, LIGHT, STYLE, ao, inkOf, innerEdge, trace };
export type { Box, PathFn, Ctx };

type R = () => number;
export type { R };

// ——— the light ———

/** Unit vector the key light travels along (from the top left towards the bottom right): shadows fall this way. */
export const FALL: readonly [number, number] = (() => {
  const [x, y] = LIGHT.dir;
  const l = Math.hypot(x, y);
  return [-x / l, -y / l] as const;
})();

// ——— depth and air ———

/** The air a scene is seen through: far things take its colour and lose contrast. */
export interface Air {
  /** The colour of the distance (sky haze, room murk, cavern smoke). */
  color: string;
  /** How much of it the farthest layer (depth 1) takes (0…1). */
  far: number;
}

/** A colour seen at `depth` (0 near … 1 far) through `air`. */
export function airMix(col: string, depth: number, air: Air): string {
  const k = Math.max(0, Math.min(1, depth)) ** 1.25 * air.far;
  return mix(col, air.color, k);
}

/** Outline width at a depth: the feet's line near the table, thinning to a hairline in the distance. */
export function lineAt(depth: number): number {
  return Math.max(1.2, STYLE.outline * (1 - depth * 0.72));
}

/** The ink for a material colour at a depth (pulled into the air with distance). */
export function inkAt(base: string, depth: number, air?: Air): string {
  const ink = inkOf(base);
  return air ? airMix(ink, Math.min(1, depth * 1.1), air) : ink;
}

// ——— forms ———

export interface SolidOpts {
  /** 0 near … 1 far (air and line weight). Default 0.2 (the back wall's props). */
  depth?: number;
  air?: Air;
  /** false: no outline; a number: its width. */
  line?: boolean | number;
  /** Outline colour (default the material's ink). */
  ink?: string;
  texA?: number;
  formSize?: number;
  form?: number;
  spec?: boolean;
}

/** A prop's one silhouette: filled with a material lit by the one light, seen through the air, outlined once. */
export function solid(ctx: Ctx, path: PathFn, box: Box, mat: Material | MaterialId, base: string, o: SolidOpts = {}): void {
  const depth = o.depth ?? 0.2;
  const b = o.air ? airMix(base, depth, o.air) : base;
  const m = typeof mat === 'string' ? MATERIALS[mat] : mat;
  // the distance flattens the form: less ramp, softer texture
  const flat = 1 - depth * 0.55;
  paint(ctx, path, box, { ...m, ramp: m.ramp * flat, rim: m.rim * flat }, b, { texA: (o.texA ?? m.texA ?? 0.3) * flat, formSize: o.formSize, form: (o.form ?? m.form) * flat, spec: o.spec });
  if (o.line !== false) {
    trace(ctx, path);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = o.ink ?? inkAt(base, depth, o.air);
    ctx.lineWidth = typeof o.line === 'number' ? o.line : lineAt(depth);
    ctx.stroke();
  }
}

/** Run fn clipped to a path. */
export function within(ctx: Ctx, path: PathFn, fn: () => void): void {
  ctx.save();
  trace(ctx, path);
  ctx.clip();
  fn();
  ctx.restore();
}

/** The cool rim light along a silhouette's far (bottom-right) edge. */
export function rim(ctx: Ctx, path: PathFn, a = 0.5, w = 3, col: string = LIGHT.rim): void {
  const [lx, ly] = LIGHT.dir;
  innerEdge(ctx, path, rgba(col, a), w, lx * w * 1.1, ly * w * 1.1);
}

/** A warm bounce or fire light along the edge that faces a point (a glow source the key light doesn't explain). */
export function bounce(ctx: Ctx, path: PathFn, fromX: number, fromY: number, at: [number, number], col: string, a = 0.5, w = 6): void {
  const dx = at[0] - fromX;
  const dy = at[1] - fromY;
  const l = Math.hypot(dx, dy) || 1;
  innerEdge(ctx, path, rgba(col, a), w, (dx / l) * w * 1.2, (dy / l) * w * 1.2, 'lighter');
}

// ——— shadows and occlusion ———

/**
 * A soft shadow a shape casts on the surface behind it: the silhouette pushed along the light's fall by `dist` and
 * blurred by `soft` (a wall a hand's width behind a sign: small dist, small soft; a lamp far from the wall: more).
 */
export function castShadow(ctx: Ctx, path: PathFn, dist: number, soft: number, a = 0.4, col = '#1a0c14'): void {
  // two parts, as a real shadow has: a wide soft penumbra, and a tighter, darker core near the thing casting it
  shadowPass(ctx, path, dist, soft, a * 0.75, col);
  shadowPass(ctx, path, dist * 0.4, soft * 0.32, a * 0.45, col);
}

function shadowPass(ctx: Ctx, path: PathFn, dist: number, soft: number, a: number, col: string): void {
  // (canvas shadows ignore the transform: offsets and blur are in device pixels, so scale them by it; a piece
  // baked at res < 1 gets the same shadow as the still)
  const k = pxPerUnit(ctx);
  const OFF = 20000;
  ctx.save();
  ctx.translate(-OFF, 0);
  ctx.shadowColor = rgba(col, a);
  ctx.shadowBlur = soft * k;
  ctx.shadowOffsetX = (OFF + FALL[0] * dist) * k;
  ctx.shadowOffsetY = FALL[1] * dist * k;
  trace(ctx, path);
  ctx.fillStyle = '#000';
  ctx.fill();
  ctx.restore();
}

/** A shadow on the ground (table, sand, floor): the shape's footprint squashed and thrown down-right. */
export function groundShadow(ctx: Ctx, x: number, y: number, rx: number, ry: number, a = 0.45, col = '#1a0c14', len = 1): void {
  ao(ctx, x + rx * 0.35 * len, y + ry * 0.2, rx * (1 + 0.3 * len), ry, a, 0, col);
  ao(ctx, x, y, rx * 0.7, ry * 0.55, a * 0.9, 0, col);
}

/** Ambient occlusion along a line where two surfaces meet (a wall and a floor, a shelf and a wall): a soft dark band
 * on one side of it, `h` deep (negative h darkens upwards). */
export function crevice(ctx: Ctx, x0: number, x1: number, y: number, h: number, a = 0.4, col: string = LIGHT.ao): void {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, rgba(col, a));
  g.addColorStop(0.35, rgba(col, a * 0.4));
  g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x0, Math.min(y, y + h), x1 - x0, Math.abs(h));
}

/** The same, vertical (a wall meeting a pillar): darkens to the right of x for positive w. */
export function creviceV(ctx: Ctx, x: number, y0: number, y1: number, w: number, a = 0.4, col: string = LIGHT.ao): void {
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, rgba(col, a));
  g.addColorStop(0.35, rgba(col, a * 0.4));
  g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g;
  ctx.fillRect(Math.min(x, x + w), y0, Math.abs(w), y1 - y0);
}

// ——— light ———

/** A pool of light on a surface (soft ellipse, added). */
export function lightPool(ctx: Ctx, x: number, y: number, rx: number, ry: number, col: string, a: number, op: GlobalCompositeOperation = 'lighter'): void {
  ctx.save();
  ctx.globalCompositeOperation = op;
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, rgba(col, a));
  g.addColorStop(0.45, rgba(col, a * 0.5));
  g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A shaft of light (a lamp's cone, a sunbeam through a window): a quad from a narrow top to a wide bottom, fading. */
export function beam(ctx: Ctx, top: [number, number, number, number], bottom: [number, number, number, number], col: string, a: number): void {
  const [x0, y0, x1] = top;
  const [x2, y2, x3] = bottom;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(0, y0, 0, y2);
  g.addColorStop(0, rgba(col, a));
  g.addColorStop(0.6, rgba(col, a * 0.35));
  g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, top[3]);
  ctx.lineTo(x3, bottom[3]);
  ctx.lineTo(x2, y2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** A soft radial glow (added). */
export function glowAt(ctx: Ctx, x: number, y: number, r: number, col: string, a: number, sy = 1): void {
  lightPool(ctx, x, y, r, r * sy, col, a);
}

// ——— atmosphere ———

/** A band of haze (mist over water, smoke in a cavern, heat over sand): a vertical gradient peaking at `peak`. */
export function haze(ctx: Ctx, y0: number, y1: number, col: string, a: number, peak = 0.5, x0 = 0, x1 = W): void {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, rgba(col, 0));
  g.addColorStop(peak, rgba(col, a));
  g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
}

/** Wash a region towards the air at a depth (after painting a far layer in its own colours). */
export function airWash(ctx: Ctx, box: Box, depth: number, air: Air, op: GlobalCompositeOperation = 'source-atop'): void {
  ctx.save();
  ctx.globalCompositeOperation = op;
  ctx.fillStyle = rgba(air.color, Math.max(0, Math.min(1, depth)) ** 1.25 * air.far);
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.restore();
}

// ——— finishing: a scene's grade (pixel-local) and shade (plain-alpha darkening), see layers.ts ———

/** Calm the values behind the play lanes: a soft, wide wash of `col` over where the feet hover and come down
 * (centre of the wall, above the table), so the feet, pizzas and HUD never fight the backdrop. */
export function calmLanes(ctx: Ctx, a: number, col: string, y0 = 60, y1 = TY - 20): void {
  ctx.save();
  ctx.translate(VX, (y0 + y1) / 2);
  ctx.scale(1, ((y1 - y0) / 2) / 820);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 820);
  g.addColorStop(0, rgba(col, a));
  g.addColorStop(0.6, rgba(col, a * 0.7));
  g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g;
  ctx.fillRect(-1000, -820, 2000, 1640);
  ctx.restore();
}

/** The warm/cool split every scene shares with the feet: warm light from the top left (the key), cool in the
 * shadowed bottom right (the rim and the sky's fill). Strength a (0…1, about 0.2–0.4). */
export interface Split {
  warm: string;
  cool: string;
  a: number;
}

/** A warm key from the top left and a cool fill to the bottom right: the default split. */
export const SPLIT: Split = { warm: '#ffc27a', cool: '#5a78c8', a: 0.25 };

/** Desaturate and tint the whole canvas (the scene's colour grade): per pixel, whatever its alpha, so a layer
 * baked on its own gets exactly the colour it has in the still. With `split`, the grade also lays the warm/cool
 * split across the screen (by each pixel's screen position, so a baked piece matches the still). */
export function gradeAll(ctx: Ctx, desat: number, tint?: string, tintA = 0, split?: Split): void {
  const c = ctx.canvas;
  const cw = c.width;
  const ch = c.height;
  const img = ctx.getImageData(0, 0, cw, ch);
  const d = img.data;
  // soft light (W3C), mixed in by k: one 256-entry table per channel
  const soft = (b: number, s: number) => (s <= 0.5 ? b - (1 - 2 * s) * b * (1 - b) : b + (2 * s - 1) * ((b <= 0.25 ? ((16 * b - 12) * b + 4) * b : Math.sqrt(b)) - b));
  const rgb01 = (h: string) => {
    const n = parseInt(h.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  };
  const lutFor = (col: number[], k: number) => col.map((s) => Float32Array.from({ length: 256 }, (_, v) => (v / 255 + (soft(v / 255, s) - v / 255) * k) * 255));
  // desaturation and tint folded into the tables where they can be (tint), per pixel where they can't (desat)
  const lut = tint && tintA > 0 ? lutFor(rgb01(tint), tintA) : null;
  const [tr, tg, tb] = lut ?? [null, null, null];
  // the split: warm and cool tables as deltas, mixed per pixel by its position across the light
  const wd = split ? lutFor(rgb01(split.warm), 1).map((t) => t.map((v, i) => v - i)) : null;
  const cd = split ? lutFor(rgb01(split.cool), 1).map((t) => t.map((v, i) => v - i)) : null;
  // each pixel back to screen space (a baked piece is painted translated and scaled); u runs 0 towards the key
  // (top left) … 1 away from it (bottom right), linear in x and y, so it's stepped, not recomputed
  const m = ctx.getTransform();
  const ia = 1 / (m.a || 1);
  const idd = 1 / (m.d || 1);
  const [lx, ly] = LIGHT.dir;
  const ku = -1 / (Math.hypot(lx, ly) * 1100);
  const sa = split?.a ?? 0;
  const du = ku * lx * ia;
  for (let j = 0; j < ch; j++) {
    const y = (j - m.f) * idd;
    let u = 0.5 + ku * ((-m.e * ia - W / 2) * lx + (y - H / 2) * ly);
    for (let i = 0, p = j * cw * 4; i < cw; i++, p += 4, u += du) {
      if (d[p + 3] === 0) continue;
      let r = d[p];
      let g = d[p + 1];
      let b = d[p + 2];
      if (wd && cd) {
        const uu = u < 0 ? 0 : u > 1 ? 1 : u;
        const kw = sa * (1 - uu * 1.6 > 0 ? 1 - uu * 1.6 : 0);
        const kc = sa * (uu * 1.6 - 0.6 > 0 ? uu * 1.6 - 0.6 : 0);
        r += wd[0][r] * kw + cd[0][r] * kc;
        g += wd[1][g] * kw + cd[1][g] * kc;
        b += wd[2][b] * kw + cd[2][b] * kc;
      }
      if (desat > 0) {
        const l = 0.3 * r + 0.59 * g + 0.11 * b;
        r += (l - r) * desat;
        g += (l - g) * desat;
        b += (l - b) * desat;
      }
      if (tr && tg && tb) {
        r = tr[r < 0 ? 0 : r > 255 ? 255 : (r + 0.5) | 0];
        g = tg[g < 0 ? 0 : g > 255 ? 255 : (g + 0.5) | 0];
        b = tb[b < 0 ? 0 : b > 255 ? 255 : (b + 0.5) | 0];
      }
      d[p] = r;
      d[p + 1] = g;
      d[p + 2] = b;
    }
  }
  ctx.putImageData(img, 0, 0);
}

/** A soft vignette: the edges and corners fall into `col` (plain alpha, so it can be a scene's shade). */
export function vignetteAll(ctx: Ctx, a: number, col = '#0a0604', inner = 0.5): void {
  const g = ctx.createRadialGradient(VX, H * 0.46, H * inner * 0.6, VX, H * 0.46, H * 1.12);
  g.addColorStop(0, rgba(col, 0));
  g.addColorStop(0.6, rgba(col, a * 0.35));
  g.addColorStop(1, rgba(col, a));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// ——— small shared bits ———

/** A specular streak on glass or glaze: a thin bright stroke with a soft halo. */
export function glassStreak(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, w: number, a = 0.8): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba('#ffffff', a * 0.25);
  ctx.lineWidth = w * 2.6;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.strokeStyle = rgba('#ffffff', a);
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.restore();
}

/** Lighter/darker variants of a base by a signed amount, hue-kept (for painterly colour jitter). */
export function jitter(base: string, r: R, amt: number): string {
  return shade(base, (r() - 0.5) * 2 * amt);
}

/** A vertical gradient fill of a rect. */
export function vfill(ctx: Ctx, x: number, y: number, w: number, h: number, stops: [number, string][]): void {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  for (const [t, c] of stops) g.addColorStop(t, c);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

/** A path from a list of points (closed). */
export function polyPath(pts: [number, number][]): PathFn {
  return (c) => {
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
  };
}

/** Bounding box of points. */
export function boxOf(pts: [number, number][], pad = 0): Box {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x = Math.min(...xs) - pad;
  const y = Math.min(...ys) - pad;
  return { x, y, w: Math.max(...xs) + pad - x, h: Math.max(...ys) + pad - y };
}

/** A rect path. */
export const rectPath = (x: number, y: number, w: number, h: number): PathFn => (c) => {
  c.beginPath();
  c.rect(x, y, w, h);
};

/** A rounded-rect path. */
export const rrPath = (x: number, y: number, w: number, h: number, r: number): PathFn => (c) => {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
};

/** An ellipse path. */
export const ellPath = (x: number, y: number, rx: number, ry: number, rot = 0): PathFn => (c) => {
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
};

/** The horizon (eye level) for the table's perspective: scenes keep their own horizons near it. */
export const EYE = HY;
