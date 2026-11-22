// Raw dough in the style kit, shared by Dough Boy (bosses-3.ts) and Dough Toes (roster-4.ts): lumpy blob
// silhouettes (smooth closed curves, no corners), the dough's matte floury skin with blisters, finger pokes,
// popped bubbles and pressed folds, flour that fades out down the foot, a warm glow where it's thin and an outline
// that lightens on the lit side. Plus the leg they stand on: an irregular rope of dough (registerLegKind 'dough').

import { CX } from '../../art/feetCommon';
import { LIGHT, type PathFn, type Pose, STYLE, pxPerUnit, softFill, softStroke, spec, texture } from '../../art/style/kit';
import { registerLegKind, wrapTile } from '../../art/style/legs';
import { Sil, lobe } from '../../art/style/sil';
import { blotches } from '../../art/style/details';
import { LX, LY, fill, heatLayer, lin, rad } from '../../art/style/kit-bosses';
import { type Ctx, hashStr, mix, rgba, rng, shade } from '../../art/util';

const DOUGH_INK = '#4a2610';

export const ell = (x: number, y: number, rx: number, ry: number, rot = 0): PathFn => (c) => {
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
};

/** A smooth closed curve through points (Catmull-Rom as Béziers): no corners anywhere. */
function smoothPath(pts: [number, number][]): PathFn {
  return (c) => {
    const n = pts.length;
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n];
      const p1 = pts[i];
      const p2 = pts[(i + 1) % n];
      const p3 = pts[(i + 2) % n];
      c.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
    }
    c.closePath();
  };
}

/** A lumpy ellipse: an ellipse whose radius wobbles (seeded, so every pose gets the same lump). */
function lumpPath(x: number, y: number, rx: number, ry: number, rot: number, seed: number, amp = 0.09): PathFn {
  const r = rng(seed);
  const n = 8;
  const pts: [number, number][] = [];
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.2;
    const k = 1 + (r() - 0.5) * 2 * amp;
    const ex = Math.cos(a) * rx * k;
    const ey = Math.sin(a) * ry * k;
    pts.push([x + ex * c - ey * s, y + ex * s + ey * c]);
  }
  return smoothPath(pts);
}

// ——— a blob of dough at a pose ———

/** A dough blob's design: its outline above the rig band (never changes) and below it (spread by a splat, gathered
 * by a curl), its toe lumps (x offsets from CX, radii, tilt) and the heavy mass it slumps into. */
export interface BlobDef {
  contact: number;
  /** Outline points, clockwise from the top left: `fixed` ones are absolute, the rest (the low part) move with the
   * pose, x relative to CX. */
  outline: ({ at: [number, number] } | { lo: [number, number] })[];
  /** How far the low part can spread sideways before it would leave the texture (design units from CX). */
  maxSpread: number;
  toes: { x: number; rx: number; ry: number; rot: number }[];
  toeSeed: number;
  /** The heavy lump (centre relative to CX, as a low point), radii, tilt, seed. */
  bulge: { at: [number, number]; rx: number; ry: number; rot: number; seed: number };
}

export interface BlobShape {
  body: PathFn;
  toes: { path: PathFn; x: number; y: number; rx: number; ry: number }[];
  bulge: PathFn;
}

/**
 * The silhouette at a pose. Above the rig band it never changes; below it the curl spreads the dough out and
 * flattens the lumps (a splat, curl < 0) or gathers them in and up (curl > 0), and the wiggle makes them ooze.
 */
export function blobShape(d: BlobDef, p: Pose): BlobShape {
  const splat = Math.max(0, -p.curl);
  const gather = Math.max(0, p.curl);
  const spread = 1 + splat * 0.1 - gather * 0.07;
  const lo = (x: number, y: number): [number, number] => [CX + Math.sign(x) * Math.min(d.maxSpread, Math.abs(x) * spread), y + splat * 3 - gather * 4];
  const body = smoothPath(d.outline.map((o) => ('at' in o ? o.at : lo(o.lo[0], o.lo[1]))));
  const toes = d.toes.map((t, i) => {
    const w = p.wiggle[i + 1] ?? 0;
    const rx = t.rx * (1 + splat * 0.22 - gather * 0.1) + w * 1.2;
    const ry = t.ry * (1 - splat * 0.3 + gather * 0.04) - w * 0.8;
    const x = CX + t.x * (1 + splat * 0.2 - gather * 0.1) + w * 2.4;
    const y = d.contact - ry - gather * 8 + Math.abs(w) * 0.6;
    return { path: lumpPath(x, y, rx, ry, t.rot * (1 - splat * 0.5), d.toeSeed + i * 13), x, y, rx, ry };
  });
  const b = d.bulge;
  const [bx, by] = lo(b.at[0], b.at[1]);
  return { body, toes, bulge: lumpPath(bx, by, b.rx * spread, b.ry, b.rot, b.seed, 0.06) };
}

// ——— the dough's surface ———

/** A finger poke: a deep soft dent, its upper-left wall in shadow, its lower-right wall and lip catching the light. */
export function poke(g: Ctx, x: number, y: number, r: number): void {
  softFill(g, ell(x - LX * r * 0.2, y - LY * r * 0.2, r * 1.05, r * 0.9), rgba('#7a4414', 0.42), r * 0.3);
  softFill(g, ell(x - LX * r * 0.3, y - LY * r * 0.3, r * 0.6, r * 0.5), rgba('#4a2008', 0.35), r * 0.25);
  softStroke(g, (c) => c.ellipse(x, y, r * 0.78, r * 0.66, 0, -0.2, 1.9), rgba('#fff4dc', 0.75), r * 0.24, r * 0.1);
  // the rim round it bulges up: lit where it faces the light, a soft shadow beyond it on the far side
  softStroke(g, (c) => c.ellipse(x, y, r * 1.12, r * 1, 0, Math.PI + 0.1, Math.PI * 1.8), rgba('#fffaf0', 0.5), r * 0.22, r * 0.14);
  softStroke(g, (c) => c.ellipse(x, y, r * 1.2, r * 1.08, 0, 0.1, 1.6), rgba('#8a4a14', 0.25), r * 0.25, r * 0.2);
}

/** A raised air bubble stretched along the ooze (a blister): lit at the top left with a glossy rim, its shadow at
 * the bottom right. */
export function blister(g: Ctx, x: number, y: number, rx: number, ry: number, rot: number): void {
  softFill(g, ell(x - LX * 1.6, y - LY * 1.6, rx, ry, rot), rgba('#8a5018', 0.32), 1.4);
  fill(g, ell(x, y, rx, ry, rot), rad(g, x + LX * rx * 0.4, y + LY * ry * 0.4, 0.3, x, y, Math.max(rx, ry), [
    [0, 'rgba(255,250,236,0.9)'],
    [0.6, 'rgba(250,232,196,0.55)'],
    [1, 'rgba(226,184,120,0.3)'],
  ]));
  // a wet, glossy rim on its lit side
  softStroke(g, (c) => c.ellipse(x, y, rx * 0.86, ry * 0.86, rot, Math.PI * 0.95, Math.PI * 1.75), rgba('#ffffff', 0.8), Math.min(rx, ry) * 0.35, 0.3);
  spec(g, x + LX * rx * 0.35, y + LY * ry * 0.35, rx * 0.3, ry * 0.22, 0.6, rot);
}

/** A popped bubble: a little hole with a lit lower lip. */
export function popped(g: Ctx, x: number, y: number, r: number): void {
  fill(g, ell(x, y, r, r * 0.75), rgba('#7a4414', 0.4));
  softStroke(g, (c) => c.ellipse(x, y, r, r * 0.75, 0, 0.1, Math.PI - 0.1), rgba('#fff6e0', 0.6), r * 0.35, 0.4);
}

/** Paint on a layer of its own, faded out from `y0` (full) to `y1` (none), then lay it on g. */
function fadedDown(g: Ctx, y0: number, y1: number, paint: (l: Ctx) => void): void {
  const c = document.createElement('canvas');
  c.width = g.canvas.width;
  c.height = g.canvas.height;
  const l = c.getContext('2d')!;
  l.setTransform(g.getTransform());
  paint(l);
  l.globalCompositeOperation = 'destination-in';
  l.fillStyle = lin(l, 0, y0, 0, y1, [
    [0, '#000000'],
    [0.4, 'rgba(0,0,0,0.75)'],
    [1, 'rgba(0,0,0,0)'],
  ]);
  l.fillRect(-4000, -4000, 8000, 8000);
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(c, 0, 0);
  g.restore();
}

/** Flour: soft drifts and speckles on the top surfaces, fading out to almost nothing down the foot (as a layer, so
 * it never stops at a line). `depth` is how far down it reaches. */
export function flour(g: Ctx, box: { x: number; y: number; w: number; h: number }, seed: number, depth = 170, n = 260): void {
  const r = rng(seed);
  fadedDown(g, box.y + 10, box.y + depth, (l) => {
    blotches(l, box, '#ffffff', 0.66, 13, 0.44, 0.24, seed + 1);
    blotches(l, box, '#fffdf6', 0.35, 7, 0.58, 0.18, seed + 2);
    for (let i = 0; i < n; i++) {
      const y = box.y + Math.pow(r(), 1.6) * depth;
      const x = box.x + r() * box.w;
      l.fillStyle = rgba('#ffffff', 0.4 + r() * 0.55);
      l.beginPath();
      l.arc(x, y, 0.5 + r() * 1.2, 0, Math.PI * 2);
      l.fill();
    }
  });
}

/** A fold where a flap of dough was pressed down: a soft lens-shaped ridge along a cubic curve (p0…p3), tapered at
 * both ends, its lip lit on the top left and a soft shadow under it. `w` scales it. */
export function pressFold(g: Ctx, p0: [number, number], p1: [number, number], p2: [number, number], p3: [number, number], w = 1): void {
  const pts: [number, number][] = [];
  const n = 24;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const a = 1 - u;
    const x = a * a * a * p0[0] + 3 * a * a * u * p1[0] + 3 * a * u * u * p2[0] + u * u * u * p3[0];
    const y = a * a * a * p0[1] + 3 * a * a * u * p1[1] + 3 * a * u * u * p2[1] + u * u * u * p3[1];
    pts.push([x, y]);
  }
  /** The lens: the curve thickened by up to `w` towards (dx, dy), tapering to nothing at both ends. */
  const lens = (lw: number, dx: number, dy: number): PathFn => (c) => {
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    for (let i = n; i >= 0; i--) {
      const k = Math.sin((i / n) * Math.PI) * lw;
      c.lineTo(pts[i][0] + dx * k, pts[i][1] + dy * k);
    }
    c.closePath();
  };
  softFill(g, lens(7 * w, 0.8, 0.6), rgba('#8a4a14', 0.34), 3.2 * w);
  softFill(g, lens(2 * w, 0.8, 0.6), rgba('#6a3410', 0.3), 0.8 * w);
  softFill(g, lens(4.5 * w, -0.8, -0.6), rgba('#fff8e8', 0.6), 1.4 * w);
}

/** Lay a warm tan over the outline on the lit (top-left) side: the parts stroked, kept outside the silhouette, faded
 * out along the light. */
function litOutline(ctx: Ctx, sil: Sil, parts: PathFn[]): void {
  const c = document.createElement('canvas');
  c.width = ctx.canvas.width;
  c.height = ctx.canvas.height;
  const l = c.getContext('2d')!;
  l.setTransform(ctx.getTransform());
  l.lineJoin = 'round';
  l.strokeStyle = '#b07a44';
  l.lineWidth = STYLE.outline * 1.4;
  for (const p of parts) {
    l.beginPath();
    p(l);
    l.stroke();
  }
  l.globalCompositeOperation = 'destination-in';
  // strongest up the left and over the shoulders, gone by the middle; never above the leg's join
  l.fillStyle = lin(l, CX - 150, 40, CX + 20, 230, [
    [0, 'rgba(0,0,0,0.85)'],
    [0.5, 'rgba(0,0,0,0.5)'],
    [1, 'rgba(0,0,0,0)'],
  ]);
  l.fillRect(-4000, 8, 8000, 8000);
  l.setTransform(1, 0, 0, 1, 0, 0);
  l.globalCompositeOperation = 'destination-out';
  l.drawImage(sil.mask, 0, 0);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(c, 0, 0);
  ctx.restore();
}

/** The dough's skin over a blob: a warm cream lit from the top left, going to tan where it sags and presses on the
 * sole (from `sag` down), grain and mottling, then the heavy mass and the toe lumps, each with its own soft form
 * fading into the body. Returns false when it drew the overheat layer instead (then the caller stops). */
export function doughSkin(sil: Sil, box: { x: number; y: number; w: number; h: number }, dough: string, sh: BlobShape, o: { heat?: boolean; sag: [number, number]; bulgeFade: [number, number]; seed: number }): boolean {
  const g = sil.g;
  if (o.heat) {
    // baking: a golden-brown crust glow
    heatLayer(sil, box, { seed: 113, y0: 270, y1: 0, hot: '#ffe08a', mid: '#e8901a', deep: '#a04a08' });
    return false;
  }
  sil.form({ base: dough, shadowTint: '#9a5418', ramp: 0.75, form: 0.42, formSize: 36, bevel: 0.3, rim: 0 });
  g.fillStyle = lin(g, 0, o.sag[0], 0, o.sag[1], [
    [0, rgba('#d8a460', 0)],
    [0.6, rgba('#d8a460', 0.18)],
    [1, rgba('#c08848', 0.42)],
  ]);
  g.fillRect(box.x, box.y, box.w, box.h);
  texture(g, 'grain', box, 0.12, 2, 'soft-light');
  blotches(g, box, '#c8925a', 0.16, 16, 0.55, 0.25, o.seed);
  lobe(g, sh.bulge, box, o.bulgeFade[0], o.bulgeFade[1], '#8a4a14', 0.3, 16, 0.35);
  for (const t of sh.toes) lobe(g, t.path, { x: t.x - t.rx - 6, y: t.y - t.ry - 8, w: t.rx * 2 + 12, h: t.ry * 2 + 16 }, t.y - t.ry * 0.4, t.y + t.ry * 0.3, '#7a3c10', 0.36, 8, 0.45);
  return true;
}

/** Finish a blob of dough: flour on top, the warm glow just inside its far edges where it's thin, then the cool rim,
 * the outline, and the outline lightened on the lit side. */
export function doughFinish(ctx: Ctx, sil: Sil, box: { x: number; y: number; w: number; h: number }, parts: PathFn[], flourSeed: number, flourDepth = 170, flourN = 260): void {
  flour(sil.g, box, flourSeed, flourDepth, flourN);
  sil.edge(rgba('#ffb46a', 0.45), 6, LX * 3.5, LY * 3.5);
  sil.edge(rgba(LIGHT.rim, 0.7), 3, LX * 2.6, LY * 2.6);
  sil.finish(DOUGH_INK, { openTop: -4, inner: 0.35 });
  litOutline(ctx, sil, parts);
}

// ════════════════════════════ the rope of dough (leg) ════════════════════════════
// Hand-rolled, not machined: a fat, irregular rope of dough that bulges into uneven lumps and pinches in here and
// there, its edges wandering on their own. A few twist grooves start at one edge, wander part way across and fade
// out (no regular spiral), one flap is folded over and pressed down, and flour has settled in the creases and the
// pinches. Lit from the top left (the light follows the wobble: the top of a lump catches it, the underside falls
// into shadow), a warm tan shade on the right and a cool rim. Everything repeats every tile height H.

/** Lumps (positive) and pinches (negative) along the rope: where (fraction of the tile), how long (fraction), how
 * far each edge bulges out (design units). */
const ROPE_LUMPS: { at: number; w: number; l: number; r: number }[] = [
  { at: 0.08, w: 0.02, l: -5, r: -6 },
  { at: 0.14, w: 0.04, l: 5, r: 3 },
  { at: 0.22, w: 0.018, l: -4, r: -6.5 },
  { at: 0.36, w: 0.09, l: 3, r: 8 },
  { at: 0.46, w: 0.045, l: 6, r: 2 },
  // a flap folded over, bulging out past the left edge
  { at: 0.525, w: 0.024, l: 12, r: 0 },
  { at: 0.62, w: 0.022, l: -6, r: -4 },
  { at: 0.665, w: 0.03, l: 3, r: 5 },
  { at: 0.71, w: 0.02, l: -5, r: -5 },
  { at: 0.84, w: 0.1, l: 6, r: 5 },
  { at: 0.95, w: 0.035, l: 1, r: 6 },
];

/** Shortest distance between two tile fractions (the tile wraps). */
const wrapD = (a: number, b: number) => {
  const d = Math.abs(a - b) % 1;
  return Math.min(d, 1 - d);
};

/** How much each edge bulges out at tile fraction u (lumps and pinches, plus a slow wander of its own). */
function ropeBulge(u: number): [number, number] {
  const t = u * Math.PI * 2;
  // the whole rope fattens and thins over the tile (both edges together), and each edge wanders a little of its own
  const fat = 3 * Math.sin(t + 0.4);
  let l = fat + 1.2 * Math.sin(t * 3 + 2.2);
  let r = fat + 1.1 * Math.sin(t * 2 + 1.3) + 0.6 * Math.sin(t * 5 + 0.2);
  for (const b of ROPE_LUMPS) {
    const k = Math.exp(-((wrapD(u, b.at) / b.w) ** 2));
    l += b.l * k;
    r += b.r * k;
  }
  return [l, r];
}

/** How far the rope's left and right edges sit in from its full width at y. */
function ropeEdge(y: number, H: number): [number, number] {
  const [l, r] = ropeBulge(y / H);
  return [Math.max(0, 15.5 - l), Math.max(0, 15.5 - r)];
}

/** The twist grooves: where each starts (tile fraction, and across the rope 0…1), where it ends across, how far it
 * drops (design units; negative rises), how deep and wide it is and how much it wanders. They don't line up into a
 * spiral: different slopes, lengths and depths, some running out from the left edge, some from the right. */
const ROPE_GROOVES: { y: number; x0: number; x1: number; drop: number; depth: number; w: number; wob: number }[] = [
  { y: 0.03, x0: -0.05, x1: 0.55, drop: 30, depth: 1, w: 4.2, wob: 3 },
  { y: 0.3, x0: 0.45, x1: 1.05, drop: -22, depth: 0.7, w: 3.4, wob: 2.5 },
  { y: 0.41, x0: 0.05, x1: 0.4, drop: 8, depth: 0.55, w: 3, wob: 2 },
  { y: 0.78, x0: 0.2, x1: 0.9, drop: 40, depth: 0.9, w: 4.4, wob: 3.5 },
  { y: 0.9, x0: 0.55, x1: 1.05, drop: -6, depth: 0.45, w: 2.6, wob: 1.5 },
];

registerLegKind('dough', {
  tint: '#9a5418',
  ownShading: true,
  edge: ropeEdge,
  // (a long tile: the lumps and grooves repeat less often)
  tile: 2,
  draw(ctx, x0, w, H, base) {
    const k = pxPerUnit(ctx);
    // the light, row by row across the rope's own width (so the rim follows its wobble)
    // (one row per texel, on the pixel grid: rows a fraction of a pixel apart would stripe)
    const px = 1 / k;
    for (let y = 0; y < H; y += px) {
      const [l, r] = ropeEdge(y + px / 2, H);
      const a = x0 + l;
      const b = x0 + w - r;
      const gr = ctx.createLinearGradient(a, 0, b, 0);
      gr.addColorStop(0, shade(base, -0.04));
      gr.addColorStop(0.2, shade(base, 0.1));
      gr.addColorStop(0.5, base);
      gr.addColorStop(0.8, mix(shade(base, -0.16), '#c08040', 0.22));
      gr.addColorStop(0.92, mix(shade(base, -0.1), '#ffb46a', 0.25));
      gr.addColorStop(1, mix(base, LIGHT.rim, 0.4));
      ctx.fillStyle = gr;
      ctx.fillRect(a - 1, y, b - a + 2, px);
    }
    // each lump's own light: its top catches the light (more on the lit left), its underside falls into shadow
    wrapTile(ctx, H, () => {
      for (const b of ROPE_LUMPS) {
        const y = b.at * H;
        const len = b.w * H;
        for (const [amp, side] of [[b.l, -1], [b.r, 1]] as const) {
          if (amp < 2.5) continue;
          const ex = side < 0 ? x0 + w * 0.2 : x0 + w * 0.76;
          const k2 = Math.min(1, amp / 7);
          softFill(ctx, ell(ex, y - len * 0.4, w * 0.15, len * 0.6, side * -0.3), rgba('#fff6e4', (side < 0 ? 0.26 : 0.12) * k2), len * 0.45);
          softFill(ctx, ell(ex + side * 4, y + len * 0.75, w * 0.18, len * 0.4, side * 0.3), rgba('#8a4a14', (side < 0 ? 0.16 : 0.26) * k2), len * 0.4);
        }
      }
    });
    // (scale 1: the texture's period divides the tile, so it wraps)
    texture(ctx, 'grain', { x: x0, y: 0, w, h: H }, 0.12, 1, 'soft-light');
    const r = rng(hashStr('dough-rope'));
    // the creases: the twist grooves, plus one where each pinch necks in (from the left edge, part way round). Each is
    // a tapered trough that wanders and fades out, lit along its upper lip, with flour settled in it
    const creases = [
      ...ROPE_GROOVES,
      // (from one side or the other, part way round)
      ...ROPE_LUMPS.filter((b) => b.l + b.r <= -8).map((b, i) => ({ y: b.at, x0: i % 2 ? 0.3 : -0.4, x1: i % 2 ? 1.4 : 0.55 + (i % 3) * 0.12, drop: (i % 2 ? -1 : 1) * (4 + i * 2), depth: Math.min(1, -(b.l + b.r) / 13), w: 3.2, wob: 1.2 })),
    ].map((gv) => {
      const n = 18;
      const c: [number, number, number][] = [];
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        const x = x0 + w * (gv.x0 + (gv.x1 - gv.x0) * u);
        // a slight S as it crosses the curve of the rope, and its own wander
        const yy = gv.y * H - gv.drop / 2 + gv.drop * (u * 0.7 + 0.3 * u * u) + Math.sin(u * 5.2 + gv.y * 20) * gv.wob;
        c.push([x, yy, Math.pow(Math.sin(u * Math.PI), 0.8)]);
      }
      const dust: [number, number, number, number][] = [];
      for (let i = 0; i < 26 * gv.depth; i++) {
        const u = 0.12 + r() * 0.76;
        const [px, py, e] = c[Math.min(n - 1, Math.floor(u * n))];
        if (r() > e) continue;
        dust.push([px + (r() - 0.5) * 4, py + (r() - 0.5) * 2.4, 0.4 + r() * 0.8, 0.45 + r() * 0.45]);
      }
      return { gv, c, dust };
    });
    wrapTile(ctx, H, () => {
      for (const { gv, c, dust } of creases) {
        const band = (wd: number, dx: number, dy: number): void => {
          ctx.beginPath();
          for (const p of c) ctx.lineTo(p[0] + dx, p[1] + dy - p[2] * wd);
          for (let i = c.length - 1; i >= 0; i--) ctx.lineTo(c[i][0] + dx, c[i][1] + dy + c[i][2] * wd);
          ctx.closePath();
        };
        ctx.save();
        ctx.filter = `blur(${(2.4 * k).toFixed(1)}px)`;
        band(gv.w, 0.8, 1.2);
        ctx.fillStyle = rgba('#8a4a14', 0.38 * gv.depth);
        ctx.fill();
        ctx.filter = `blur(${(1.6 * k).toFixed(1)}px)`;
        band(gv.w * 0.55, -1, -gv.w - 1.5);
        ctx.fillStyle = rgba('#fff6e0', 0.42 * gv.depth);
        ctx.fill();
        ctx.filter = 'none';
        ctx.restore();
        for (const [x, y, rr, a] of dust) {
          ctx.fillStyle = rgba('#ffffff', a);
          ctx.beginPath();
          ctx.arc(x, y, rr, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });
    // the odd fold: a flap pressed over on the lit side, about a third down the tile
    wrapTile(ctx, H, () => {
      // (over the flap that bulges out of the left edge)
      const y = 0.525 * H;
      pressFold(ctx, [x0 + w * 0.06, y - 14], [x0 + w * 0.26, y - 8], [x0 + w * 0.3, y + 6], [x0 + w * 0.12, y + 14], 0.8);
    });
    // flour and a few stretched bubbles
    const dots: [number, number, number, number][] = [];
    for (let i = 0; i < 200; i++) dots.push([x0 + Math.pow(r(), 1.7) * w, r() * H, 0.4 + r() * 0.9, 0.3 + r() * 0.5]);
    const bubbles: [number, number, number][] = [];
    for (let i = 0; i < 10; i++) bubbles.push([x0 + 10 + r() * (w - 20), r() * H, 0.7 + r() * 0.6]);
    wrapTile(ctx, H, () => {
      // a couple of soft drifts of flour on the lit side
      for (const fy of [0.13, 0.36, 0.62, 0.84]) softFill(ctx, ell(x0 + w * 0.3, fy * H, w * 0.16, 9, -0.3), rgba('#ffffff', 0.22), 5);
      for (const [x, y, rr, a] of dots) {
        ctx.fillStyle = rgba('#ffffff', a);
        ctx.beginPath();
        ctx.arc(x, y, rr, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const [x, y, s] of bubbles) {
        ctx.fillStyle = rgba('#8a5018', 0.22);
        ctx.beginPath();
        ctx.ellipse(x + 0.8, y + 1, 1.6 * s, 3.4 * s, 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgba('#fff6e2', 0.6);
        ctx.beginPath();
        ctx.ellipse(x, y, 1.4 * s, 3 * s, 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  },
});
