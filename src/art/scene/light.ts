// Light for the location kit: the shapes real light makes in a room or a landscape. A lamp under a shade throws a
// scalloped pool down the wall behind it (and leaves the wall above in its shade); a window lays a bright patch,
// cut by its glazing bars, on whatever it falls on; light in dusty or smoky air shows as shafts with motes in
// them; a bright surface bounces its colour onto the ones beside it; and everything sits in a soft occlusion halo.
//
// Light here is added with 'screen' (it brightens without burning out) and belongs in still layers that stay in
// the live base (a layer baked on its own has nothing under it to brighten: see kit.ts).

import { type Ctx, makeCanvas, rgba } from '../util';
import { type Box, type PathFn, type R, FALL, trace } from './kit';
import { pxPerUnit } from '../style/kit';
import { noiseMask } from './paint';

// ——— lamps ———

export interface LampOpts {
  col?: string;
  /** Strength (0…1, default 0.5). */
  a?: number;
  /** How far down the wall the pool reaches (px, default 420). */
  reach?: number;
  /** Half-width of the pool at the bottom of its reach (px, default reach × 0.75). */
  spread?: number;
  /** How far behind the lamp the wall is: the further, the softer the pool's edge and the lower its top (px). */
  gap?: number;
  /** Darken the wall above the shade a touch (0…1, default 0.25): the shade blocks the light going up. */
  above?: number;
  /** How the light is laid on (default 'screen'; 'lighter' for a strong lamp in a dim room). */
  op?: GlobalCompositeOperation;
}

/**
 * The light a shaded lamp throws on the wall behind it. (x, rimY) is the middle of the shade's rim, rimHalf its
 * half-width. The pool starts at a curved edge just under the rim (the shade's own shadow line), is hottest right
 * under the bulb, and spreads and fades down the wall.
 */
export function lampOnWall(ctx: Ctx, x: number, rimY: number, rimHalf: number, o: LampOpts = {}): void {
  const col = o.col ?? '#ffd89a';
  const a = o.a ?? 0.5;
  const reach = o.reach ?? 420;
  const spread = o.spread ?? reach * 0.75;
  const gap = o.gap ?? 30;
  const soft = 3 + gap * 0.12;
  // the wall above the shade: a soft darkening (only bounce light gets up there)
  const above = o.above ?? 0.25;
  if (above > 0) {
    ctx.save();
    ctx.translate(x, rimY - 20);
    ctx.scale(1, 0.55);
    const g = ctx.createRadialGradient(0, 0, rimHalf * 0.5, 0, 0, rimHalf * 2.6);
    g.addColorStop(0, rgba('#1a0a04', above * 0.5));
    g.addColorStop(1, rgba('#1a0a04', 0));
    ctx.fillStyle = g;
    ctx.fillRect(-rimHalf * 3, -rimHalf * 3, rimHalf * 6, rimHalf * 6);
    ctx.restore();
  }
  // the pool, painted on a small offscreen and blurred, then screened on
  const pad = soft * 2 + 4;
  const bw = spread * 2 + pad * 2;
  const bh = reach + pad * 2;
  const k = 0.5;
  const [c, g] = makeCanvas(bw * k, bh * k);
  g.scale(k, k);
  g.translate(bw / 2, pad);
  const top = gap * 0.15;
  g.beginPath();
  g.moveTo(-rimHalf * 1.05, top);
  // the shade's shadow line: an arc bowing down under the rim
  g.quadraticCurveTo(0, top + rimHalf * 0.28 + gap * 0.1, rimHalf * 1.05, top);
  g.bezierCurveTo(spread * 0.55, reach * 0.35, spread, reach * 0.7, spread * 0.7, reach);
  g.quadraticCurveTo(0, reach * 1.08, -spread * 0.7, reach);
  g.bezierCurveTo(-spread, reach * 0.7, -spread * 0.55, reach * 0.35, -rimHalf * 1.05, top);
  g.closePath();
  const rg = g.createRadialGradient(0, top, 0, 0, top, reach);
  rg.addColorStop(0, rgba(col, a));
  rg.addColorStop(0.2, rgba(col, a * 0.85));
  rg.addColorStop(0.55, rgba(col, a * 0.45));
  rg.addColorStop(1, rgba(col, 0));
  g.filter = `blur(${(soft * k).toFixed(1)}px)`;
  g.fillStyle = rg;
  g.fill();
  g.filter = 'none';
  // the hot spot on the wall right behind the bulb
  g.save();
  g.translate(0, top + rimHalf * 0.3);
  g.scale(1, 0.6);
  const hg = g.createRadialGradient(0, 0, 0, 0, 0, rimHalf * 1.4);
  hg.addColorStop(0, rgba('#fff6e0', a * 0.8));
  hg.addColorStop(1, rgba('#fff6e0', 0));
  g.fillStyle = hg;
  g.fillRect(-rimHalf * 1.5, -rimHalf * 1.5, rimHalf * 3, rimHalf * 3);
  g.restore();
  ctx.save();
  ctx.globalCompositeOperation = o.op ?? 'screen';
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(c, x - bw / 2, rimY - pad, bw, bh);
  ctx.restore();
}

// ——— windows ———

export interface PatchOpts {
  col?: string;
  a?: number;
  /** Glazing bars across the patch, as fractions 0…1 along its u (left→right) and v (near edge→far edge). */
  barsU?: number[];
  barsV?: number[];
  /** Bar width as a fraction of the patch (default 0.03). */
  bar?: number;
  /** Edge softness in px (default 8). */
  soft?: number;
  /** The patch fades from its first edge (pts[0]→pts[1], the window side) to the opposite one (0…1, default 0.4). */
  fade?: number;
}

/**
 * The light a window throws on a surface: a quad (pts in order: window-side edge first, then round) filled with
 * the light, cut by the glazing bars' shadows, softened, screened on.
 */
export function lightPatch(ctx: Ctx, pts: [number, number][], o: PatchOpts = {}): void {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const soft = o.soft ?? 8;
  const pad = soft * 2 + 2;
  const box = { x: Math.min(...xs) - pad, y: Math.min(...ys) - pad, w: Math.max(...xs) - Math.min(...xs) + pad * 2, h: Math.max(...ys) - Math.min(...ys) + pad * 2 };
  const [c, g] = makeCanvas(box.w, box.h);
  g.translate(-box.x, -box.y);
  const col = o.col ?? '#ffd8a0';
  const a = o.a ?? 0.4;
  const at = (u: number, v: number): [number, number] => {
    const [p0, p1, p2, p3] = pts;
    const ax = p0[0] + (p1[0] - p0[0]) * u;
    const ay = p0[1] + (p1[1] - p0[1]) * u;
    const bx = p3[0] + (p2[0] - p3[0]) * u;
    const by = p3[1] + (p2[1] - p3[1]) * u;
    return [ax + (bx - ax) * v, ay + (by - ay) * v];
  };
  g.filter = `blur(${soft.toFixed(1)}px)`;
  const [m0, m1] = [at(0.5, 0), at(0.5, 1)];
  const lg = g.createLinearGradient(m0[0], m0[1], m1[0], m1[1]);
  const fade = o.fade ?? 0.4;
  lg.addColorStop(0, rgba(col, a));
  lg.addColorStop(1, rgba(col, a * (1 - fade)));
  g.fillStyle = lg;
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  g.fill();
  // the bars' shadows cut out of it
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = 'rgba(0,0,0,0.9)';
  const bar = o.bar ?? 0.03;
  for (const u of o.barsU ?? []) {
    const q = [at(u - bar / 2, 0), at(u + bar / 2, 0), at(u + bar / 2, 1), at(u - bar / 2, 1)];
    g.beginPath();
    q.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.fill();
  }
  for (const v of o.barsV ?? []) {
    const q = [at(0, v - bar / 2), at(1, v - bar / 2), at(1, v + bar / 2), at(0, v + bar / 2)];
    g.beginPath();
    q.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.fill();
  }
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.drawImage(c, box.x, box.y);
  ctx.restore();
}

// ——— light in the air ———

export interface ShaftOpts {
  /** Streaks along the shaft (light broken by the air's dust and the window's edges), default 9. */
  streaks?: number;
  /** Dust motes caught in it, default 40. */
  motes?: number;
  moteCol?: string;
}

/**
 * A shaft of light through dusty or smoky air, from a narrow edge (top: x0, y0 → x1, y1) to a wide one (bottom):
 * fading along its length, broken into soft streaks, with motes of dust lit in it.
 */
export function shaft(ctx: Ctx, r: R, top: [number, number, number, number], bottom: [number, number, number, number], col: string, a: number, o: ShaftOpts = {}): void {
  const [x0, y0, x1, y1] = top;
  const [x3, y3, x2, y2] = bottom;
  const quad = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x0, y0);
    c.lineTo(x1, y1);
    c.lineTo(x2, y2);
    c.lineTo(x3, y3);
    c.closePath();
  };
  // (painted at a quarter size and drawn up: the softness is free, no blur filter over a big area)
  const xs = [x0, x1, x2, x3];
  const ys = [y0, y1, y2, y3];
  const bx0 = Math.min(...xs) - 8;
  const by0 = Math.min(...ys) - 8;
  const bw0 = Math.max(...xs) - bx0 + 8;
  const bh0 = Math.max(...ys) - by0 + 8;
  const k = 0.25;
  const [sc, sctx] = makeCanvas(bw0 * k, bh0 * k);
  sctx.scale(k, k);
  sctx.translate(-bx0, -by0);
  const midTop: [number, number] = [(x0 + x1) / 2, (y0 + y1) / 2];
  const midBot: [number, number] = [(x2 + x3) / 2, (y2 + y3) / 2];
  const g = sctx.createLinearGradient(midTop[0], midTop[1], midBot[0], midBot[1]);
  g.addColorStop(0, rgba(col, a));
  g.addColorStop(0.5, rgba(col, a * 0.45));
  g.addColorStop(1, rgba(col, 0));
  sctx.fillStyle = g;
  quad(sctx);
  sctx.fill();
  // streaks: thin quads from top to bottom, brighter and dimmer
  const n = o.streaks ?? 9;
  for (let i = 0; i < n; i++) {
    const u = r();
    const w = 0.02 + r() * 0.06;
    const lerp = (p: number, q: number, t: number) => p + (q - p) * t;
    const tx = lerp(x0, x1, u);
    const ty = lerp(y0, y1, u);
    const bx = lerp(x3, x2, u);
    const by = lerp(y3, y2, u);
    const tw = Math.hypot(x1 - x0, y1 - y0) * w;
    const bw = Math.hypot(x2 - x3, y2 - y3) * w;
    const sg = sctx.createLinearGradient(tx, ty, bx, by);
    const sa = a * (0.3 + r() * 0.6);
    sg.addColorStop(0, rgba(col, sa));
    sg.addColorStop(1, rgba(col, 0));
    sctx.fillStyle = sg;
    sctx.beginPath();
    sctx.moveTo(tx - tw / 2, ty);
    sctx.lineTo(tx + tw / 2, ty);
    sctx.lineTo(bx + bw / 2, by);
    sctx.lineTo(bx - bw / 2, by);
    sctx.closePath();
    sctx.fill();
  }
  ctx.save();
  quad(ctx);
  ctx.clip();
  ctx.globalCompositeOperation = 'screen';
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(sc, bx0, by0, bw0, bh0);
  // motes
  const m = o.motes ?? 40;
  for (let i = 0; i < m; i++) {
    const u = r();
    // (motes show against the dark air near the source, not over the lit surfaces it lands on)
    const v = r() ** 1.3 * 0.7;
    const tx = x0 + (x1 - x0) * u;
    const ty = y0 + (y1 - y0) * u;
    const bx = x3 + (x2 - x3) * u;
    const by = y3 + (y2 - y3) * u;
    const x = tx + (bx - tx) * v;
    const y = ty + (by - ty) * v;
    ctx.fillStyle = rgba(o.moteCol ?? '#fff6e0', (0.25 + r() * 0.55) * (1 - v * 0.7));
    ctx.beginPath();
    ctx.arc(x, y, 0.8 + r() * 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Motes of dust (or ash, or pollen) in a box, brighter where `lit` says (0…1 at a point). */
export function motes(ctx: Ctx, r: R, box: Box, n: number, col: string, a = 0.5, lit: (x: number, y: number) => number = () => 1): void {
  for (let i = 0; i < n; i++) {
    const x = box.x + r() * box.w;
    const y = box.y + r() * box.h;
    const k = lit(x, y);
    if (k <= 0.02) continue;
    ctx.fillStyle = rgba(col, a * k * (0.3 + r() * 0.7));
    ctx.beginPath();
    ctx.arc(x, y, 0.7 + r() * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Bounce light: a bright surface (a sunlit floor, a red cloth, a fire) colouring the one that meets it. The band
 * starts at y (the meeting line) and fades over h px (negative h fades upwards). */
export function bounceBand(ctx: Ctx, x0: number, x1: number, y: number, h: number, col: string, a: number): void {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, rgba(col, a));
  g.addColorStop(0.45, rgba(col, a * 0.35));
  g.addColorStop(1, rgba(col, 0));
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = g;
  ctx.fillRect(x0, Math.min(y, y + h), x1 - x0, Math.abs(h));
  ctx.restore();
}

// ——— occlusion ———

/**
 * The soft occlusion halo round a thing that stands against (or close in front of) a surface: no direction, just
 * less light reaching the surface near it. Paint it before the thing itself. A small offset along the light's fall
 * (lean, px) keeps it consistent with the cast shadow.
 */
export function aoHalo(ctx: Ctx, path: PathFn, size: number, a = 0.35, col = '#1a0c08', lean = 0): void {
  const k = pxPerUnit(ctx);
  const OFF = 20000;
  ctx.save();
  ctx.translate(-OFF, 0);
  ctx.shadowColor = rgba(col, a);
  ctx.shadowBlur = size * k;
  ctx.shadowOffsetX = (OFF + FALL[0] * lean) * k;
  ctx.shadowOffsetY = FALL[1] * lean * k;
  trace(ctx, path);
  ctx.fillStyle = '#000';
  ctx.fill();
  ctx.restore();
}

/**
 * A shadow laid down on the ground by a low light (a late sun, a fire on the floor): the thing's silhouette,
 * standing on the ground at baseY, flattened and thrown along (kx, ky) per pixel of its height (kx > 0 to the
 * right; ky > 0 towards us for a light behind the scene, ky < 0 away from us for one in front), softened with
 * distance. Paint it before the thing itself.
 */
export function groundCast(ctx: Ctx, path: PathFn, baseY: number, kx: number, ky: number, a = 0.35, soft = 6, col = '#3a2a4a'): void {
  ctx.save();
  ctx.filter = `blur(${soft.toFixed(1)}px)`;
  ctx.transform(1, 0, -kx, -ky, kx * baseY, baseY * (1 + ky));
  trace(ctx, path);
  ctx.fillStyle = rgba(col, a);
  ctx.fill();
  ctx.restore();
}

/** Light broken by leaves or thatch: dapples of `col` scattered over a box (cut by a noise mask), screened on. */
export function dapple(ctx: Ctx, box: Box, col: string, a: number, cells = 14, seed = 3, cover = 0.35): void {
  const m = noiseMask(cells, seed, { cover, soft: 0.08, col });
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = a;
  ctx.filter = 'blur(3px)';
  ctx.drawImage(m, box.x, box.y, box.w, box.h);
  ctx.restore();
}
