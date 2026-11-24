// THRYM THE FROST KING (the Act 8 boss): the king of the frost giants, in a boot carved and grown from glacier ice.
//
// - The boot is cut from one block of glacier ice: chisel facets down its flanks, a front arris, translucent depth
//   with blue-green cores, fracture planes and trapped bubble trails inside, white rime and hoarfrost on its edges,
//   the moon's cold rim on the right and a cold light from within. Thurisaz, the giants' rune, is cut deep up the
//   front and breathes cold light.
// - His kingship is a crown of ice crystals grown out of the cuff: hexagonal prisms of varied size and angle, fused
//   at their roots in rime, each faceted and lit by the one light, with phantom growth lines inside.
// - His giant heritage: an old band of rune-cut blued iron round the cuff, a white bear's fur where the leg goes in,
//   an iron greave up the leg, and a broken giant's chain hanging off the band, rimed with frost (it swings in play).
// - Underneath, a rounded toe, and a heavy rand of old compacted glacier ice wrapped round the bottom and up the
//   sides, dark, stratified, chipped at its edge; a few irregular translucent icicles at its drip corners.
//
// Its life in play (mist pooling off the sole, frost creeping, glints, flakes shedding; melting when overheated) is
// in src/content/styleLive/thrym.ts. Its leg's iron greave is the 'thrymgreave' leg kind below (its colours:
// src/content/style/legs-final.ts).

import type { FootArt } from '../../data/feet';
import { CX } from '../../art/feetCommon';
import { type PathFn, type Pose, ao, glint, inkOf, softFill, softStroke, spec, texture } from '../../art/style/kit';
import { Sil } from '../../art/style/sil';
import { registerStyle } from '../../art/style/registry';
import { registerLegKind, wrapTile } from '../../art/style/legs';
import { blotches, contact, rivet } from '../../art/style/details';
import { furCoat } from '../../art/style/kit-bosses';
import { type Ctx, hashStr, mix, rgba, rng, shade } from '../../art/util';
import { LX, LY, glowOnly, hoarfrost, hotLine, runeGlyph } from './acts-d-kit';
import { piece, prop, within } from './roster-kit';

type Opts = { live: boolean; emissive?: boolean; heat?: boolean };
type Pt = [number, number];

/** The palette: the ice's cores, its body, its lit and rimed edges, the cold light inside, the blued iron. */
const ICE = {
  abyss: '#0a2c4e',
  core: '#11577a',
  teal: '#1f8a9a',
  body: '#4f9fd2',
  lit: '#bfe8f8',
  rime: '#f2fbff',
  glow: '#8af0ff',
  moon: '#d8ecff',
  iron: '#465670',
  ironDark: '#141c2a',
};

const poly = (pts: Pt[]): PathFn => (c) => {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
};
const line = (pts: Pt[]) => (c: Ctx) => pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));

// ——— the shapes ———

/** The boot's body: one block of ice, its shaft cut in straight chisel facets, swelling into a rounded toe pushed out
 * to our left (the boot turned a little, its toe to the lit side), the heel side on our right straight and upright, so
 * it has a front and a back. */
const BODY: Pt[] = [
  [CX - 74, 52],
  [CX - 74, 80],
  [CX - 81, 104],
  [CX - 95, 128],
  [CX - 110, 156],
  [CX - 118, 186],
  [CX - 120, 214],
  [CX - 114, 238],
  [CX - 90, 254],
  [CX - 50, 260],
  [CX - 6, 260],
  [CX + 36, 256],
  [CX + 70, 248],
  [CX + 88, 236],
  [CX + 94, 212],
  [CX + 95, 184],
  [CX + 92, 156],
  [CX + 86, 128],
  [CX + 80, 104],
  [CX + 76, 80],
  [CX + 75, 52],
];
const bodyPath = poly(BODY);

/** The sole: a heavy rand of old compacted ice wrapped round the bottom of the boot and up its sides, higher round the
 * toe than the heel, chipped along its edge: its outer edge, then its top edge (where it meets the boot) back. */
const RAND_OUT: Pt[] = [
  [CX - 120, 182],
  [CX - 124, 208],
  [CX - 125, 236],
  [CX - 119, 256],
  [CX - 104, 266],
  [CX - 84, 270],
  [CX - 79, 268],
  [CX - 72, 271],
  [CX - 30, 273],
  [CX + 6, 274],
  [CX + 40, 273],
  [CX + 47, 271],
  [CX + 53, 273],
  [CX + 80, 269],
  [CX + 94, 262],
  [CX + 100, 250],
  [CX + 101, 232],
  [CX + 98, 216],
];
const RAND_TOP: Pt[] = [
  [CX + 90, 218],
  [CX + 88, 234],
  [CX + 74, 244],
  [CX + 40, 251],
  [CX + 4, 254],
  [CX - 40, 254],
  [CX - 82, 248],
  [CX - 106, 234],
  [CX - 112, 210],
  [CX - 112, 184],
];
const solePath = poly([...RAND_OUT, ...RAND_TOP]);

/** The iron band round the cuff: it follows the boot round, so it dips at the front. */
const bandTop = (x: number) => 34 + 8 * (1 - ((x - CX) / 90) ** 2);
const BAND_H = 20;
const BAND_X = 89;
const bandPath: PathFn = (c) => {
  c.beginPath();
  for (let x = CX - BAND_X; x <= CX + BAND_X; x += 4) (x === CX - BAND_X ? c.moveTo(x, bandTop(x)) : c.lineTo(x, bandTop(x)));
  c.quadraticCurveTo(CX + BAND_X + 3, bandTop(CX + BAND_X) + BAND_H / 2, CX + BAND_X, bandTop(CX + BAND_X) + BAND_H);
  for (let x = CX + BAND_X; x >= CX - BAND_X; x -= 4) c.lineTo(x, bandTop(x) + BAND_H);
  c.quadraticCurveTo(CX - BAND_X - 3, bandTop(CX - BAND_X) + BAND_H / 2, CX - BAND_X, bandTop(CX - BAND_X));
  c.closePath();
};

/** The white bear's fur where the leg goes in: shaggy locks hanging over the band. */
const FUR_LOCKS = (() => {
  const r = rng(hashStr('thrym-locks'));
  const n = 13;
  const out: { x0: number; x1: number; tip: Pt }[] = [];
  for (let i = 0; i < n; i++) {
    const x0 = CX + 92 - (i * 184) / n;
    const x1 = CX + 92 - ((i + 1) * 184) / n;
    const mid = (x0 + x1) / 2;
    const side = (mid - CX) / 92;
    out.push({ x0, x1, tip: [mid + side * 6 + (r() - 0.5) * 5, 29 + r() * 7 - Math.abs(side) * 3] });
  }
  return out;
})();
const furPath: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 80, -8);
  c.lineTo(CX + 80, -8);
  c.bezierCurveTo(CX + 88, -2, CX + 95, 8, CX + 92, 22);
  for (const l of FUR_LOCKS) {
    c.quadraticCurveTo(l.x0 - 2, 26, l.tip[0], l.tip[1]);
    c.quadraticCurveTo(l.x1 + 3, 28, l.x1, 23);
  }
  c.bezierCurveTo(CX - 95, 8, CX - 88, -2, CX - 80, -8);
  c.closePath();
};

/** The crown: crystals grown out of the cuff, varied in size and angle, the biggest in a cluster on the lit left, smaller
 * ones trailing off to the right (dx from the middle, length, width, lean in
 * radians, where the termination's point sits across the crystal, how long the termination is). Outer ones first. */
interface Crystal {
  dx: number;
  len: number;
  w: number;
  a: number;
  skew: number;
  term: number;
}
const CROWN: Crystal[] = [
  { dx: -82, len: 26, w: 12, a: -1.12, skew: 0.15, term: 0.36 },
  { dx: 80, len: 18, w: 10, a: 1.05, skew: -0.1, term: 0.4 },
  { dx: -68, len: 34, w: 15, a: -0.8, skew: -0.1, term: 0.33 },
  { dx: 64, len: 15, w: 9, a: 0.7, skew: 0.2, term: 0.42 },
  { dx: -54, len: 14, w: 8, a: -0.25, skew: 0, term: 0.45 },
  { dx: 50, len: 22, w: 11, a: 0.42, skew: 0.1, term: 0.38 },
  { dx: -44, len: 40, w: 17, a: -0.5, skew: 0.12, term: 0.31 },
  { dx: 36, len: 14, w: 8, a: 0.1, skew: -0.15, term: 0.42 },
  { dx: 24, len: 28, w: 13, a: 0.32, skew: 0.15, term: 0.34 },
  { dx: -36, len: 20, w: 9, a: 0.1, skew: -0.2, term: 0.4 },
  { dx: -8, len: 34, w: 15, a: 0.18, skew: 0.1, term: 0.31 },
  { dx: 8, len: 20, w: 10, a: 0.55, skew: 0.1, term: 0.36 },
  { dx: -28, len: 46, w: 19, a: -0.3, skew: 0.08, term: 0.28 },
  { dx: -16, len: 52, w: 23, a: -0.08, skew: 0.05, term: 0.27 },
  { dx: -22, len: 18, w: 9, a: -0.75, skew: -0.1, term: 0.38 },
];
const crystalBase = (cr: Crystal): Pt => [CX + cr.dx, bandTop(CX + cr.dx) + 5];
/** A point on a crystal: s along its axis from the root, t across it. */
function onCrystal(cr: Crystal, s: number, t: number): Pt {
  const [bx, by] = crystalBase(cr);
  const ux = Math.sin(cr.a);
  const uy = -Math.cos(cr.a);
  return [bx + ux * s - uy * t, by + uy * s + ux * t];
}
function crystalGeom(cr: Crystal) {
  const h = cr.w / 2;
  const e = [-h, -h * 0.36, h * 0.36, h];
  const sh0 = cr.len * (1 - cr.term);
  // the inner edges run further up before they turn to the point
  const sh = [sh0, sh0 + cr.len * cr.term * 0.32, sh0 + cr.len * cr.term * 0.26, sh0 - cr.len * 0.04];
  const tip = onCrystal(cr, cr.len, h * cr.skew);
  const root = e.map((t) => onCrystal(cr, -4, t));
  const shoulder = e.map((t, i) => onCrystal(cr, sh[i], t));
  return { e, root, shoulder, tip };
}
const crystalPath = (cr: Crystal): PathFn => {
  const { root, shoulder, tip } = crystalGeom(cr);
  return poly([root[0], shoulder[0], tip, shoulder[3], root[3]]);
};
/** The crown's crystal tips (design space), where it glints in play. */
export const THRYM_TIPS: Pt[] = CROWN.map((cr) => crystalGeom(cr).tip);

/** Icicles at the sole's drip corners: few, irregular (x, y of the root, length, width, lean). */
const ICICLES: [number, number, number, number, number][] = [
  [CX - 114, 258, 27, 12, -3],
  [CX - 96, 266, 13, 7, 1],
  [CX + 90, 263, 23, 11, 3],
];
/** Where meltwater drips from in play: the icicles' tips. */
export const THRYM_DRIPS: Pt[] = ICICLES.map(([x, y, len, , lean]) => [x + lean, y + len]);

/** An icicle: thick at the root, wavering and swelling in drip rings, pulled to a fine point. */
function iciclePts(x: number, y: number, len: number, w: number, lean: number): Pt[] {
  const r = rng(hashStr(`thrym-icicle-${x}`));
  const n = 7;
  const L: Pt[] = [];
  const R: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const half = (w / 2) * (1 - t) ** 1.25 * (1 + (i > 0 && i < n ? (r() - 0.4) * 0.35 : 0));
    const cx = x + lean * t * t;
    L.push([cx - half, y - 4 + t * (len + 4)]);
    R.push([cx + half, y - 4 + t * (len + 4)]);
  }
  return [...L, ...R.slice(0, -1).reverse()];
}
const iciclePath = (ic: (typeof ICICLES)[number]): PathFn => poly(iciclePts(...ic));

/** The chain: a broken giant's chain hanging from a staple on the band (its own sprite in play, so it swings). */
export const THRYM_CHAIN = { x: CX + 66, y: 46 };
const LINKS = 5;
const LINK = 15.5;
/** Each link's size: forged by hand, no two alike. */
const LINK_K = [1, 1.1, 0.92, 1.14, 1.04];
function chainLinks(): { x: number; y: number; face: boolean; k: number }[] {
  const out: { x: number; y: number; face: boolean; k: number }[] = [];
  let y = THRYM_CHAIN.y + 11;
  for (let i = 0; i < LINKS; i++) {
    const k = LINK_K[i];
    out.push({ x: THRYM_CHAIN.x + Math.sin(i * 0.5) * 0.8, y, face: i % 2 === 0, k });
    y += LINK * (k + (LINK_K[i + 1] ?? 1)) * 0.5;
  }
  return out;
}
const chainParts = (): PathFn[] => [
  (c) => {
    c.beginPath();
    c.ellipse(THRYM_CHAIN.x, THRYM_CHAIN.y + 1, 7, 5, 0, 0, Math.PI * 2);
  },
  ...chainLinks().map(({ x, y, face, k }, i): PathFn => (c) => {
    c.beginPath();
    if (i === LINKS - 1) {
      // sheared open: a C with its ends bent apart
      c.ellipse(x, y, 8 * k, 11.5 * k, 0, Math.PI * 0.12, Math.PI * 1.9);
      c.ellipse(x, y, 4.2 * k, 7.6 * k, 0, Math.PI * 1.86, Math.PI * 0.16, true);
      c.closePath();
    } else if (face) c.ellipse(x, y, 8 * k, 11.5 * k, 0, 0, Math.PI * 2);
    else c.roundRect(x - 3.4 * k, y - 12 * k, 6.8 * k, 24 * k, 3.4 * k);
  }),
];

/** Paint the chain (with its own outline): blued iron rimed with frost, the last link broken open, an icicle on it. */
function paintChain(ctx: Ctx): void {
  const box = { x: THRYM_CHAIN.x - 14, y: THRYM_CHAIN.y - 8, w: 28, h: LINKS * LINK + 34 };
  const links = chainLinks();
  const parts = chainParts();
  // its shadow on the ice behind it
  ctx.save();
  ctx.translate(-LX * 3, -LY * 3);
  for (const p of parts) softFill(ctx, p, rgba('#04102a', 0.4), 2.2);
  ctx.restore();
  prop(ctx, parts, box, (g) => {
    // the staple through the band
    piece(g, parts[0], box, 'iron', ICE.iron, { shadow: 0.5, size: 3 });
    fillEll(g, THRYM_CHAIN.x, THRYM_CHAIN.y + 1, 3.6, 2.2, ICE.ironDark);
    links.forEach(({ x, y, face, k }, i) => {
      const p = parts[i + 1];
      piece(g, p, box, 'iron', i % 2 ? shade(ICE.iron, -0.12) : ICE.iron, { shadow: 0.55, size: 3, spec: false });
      // the hole through a face-on link, the next link threaded through it (the broken one is open)
      if (face && i < LINKS - 1) fillEll(g, x, y, 4 * k, 7.4 * k, ICE.ironDark);
      // the broken ends: bright raw metal where it sheared
      if (i === LINKS - 1) for (const a of [Math.PI * 0.14, Math.PI * -0.1]) fillEll(g, x + Math.cos(a) * 6 * k, y + Math.sin(a) * 9.5 * k, 1.8, 1.4, rgba('#c8d8f0', 0.85));
      // a cold highlight on the lit side, frost along the top
      g.strokeStyle = rgba(ICE.moon, 0.7);
      g.lineWidth = 1.1;
      g.beginPath();
      if (face) g.ellipse(x, y, 6.4 * k, 9.8 * k, 0, Math.PI * 1.05, Math.PI * 1.45);
      else {
        g.moveTo(x - 1.5, y - 8);
        g.lineTo(x - 1.5, y + 6);
      }
      g.stroke();
      blotches(g, { x: x - 8, y: y - 12 * k, w: 16, h: 7 }, ICE.rime, 0.9, 2.2, 0.45, 0.1, 401 + i);
    });
    texture(g, 'cast', box, 0.35, 0.8);
  }, inkOf('#1a2a44'), { w: 3.2 });
}

function fillEll(g: Ctx, x: number, y: number, rx: number, ry: number, col: string | CanvasGradient): void {
  g.fillStyle = col;
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
}

// ——— the ice ———

/** A bubble trapped in the ice: a clear lens, lit on its upper-left rim and dark on its lower-right. */
function bubble(g: Ctx, x: number, y: number, r: number, a = 1, stretch = 1): void {
  g.save();
  g.translate(x, y);
  g.scale(1, stretch);
  g.fillStyle = rgba(ICE.lit, 0.16 * a);
  g.beginPath();
  g.arc(0, 0, r, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = Math.max(0.5, r * 0.32);
  g.strokeStyle = rgba('#ffffff', 0.7 * a);
  g.beginPath();
  g.arc(0, 0, r, Math.PI * 0.85, Math.PI * 1.75);
  g.stroke();
  g.strokeStyle = rgba(ICE.abyss, 0.4 * a);
  g.beginPath();
  g.arc(0, 0, r, -0.1, Math.PI * 0.7);
  g.stroke();
  g.restore();
  if (r > 1.4) spec(g, x - r * 0.35, y - r * 0.4 * stretch, r * 0.35, r * 0.25, 0.9 * a, -0.6);
}

/** A crack walking from (x, y): a fine bright line with a faint dark partner below it (seen in depth). */
function crackWalk(r: () => number, x: number, y: number, ang: number, n: number, step: number): Pt[] {
  const pts: Pt[] = [[x, y]];
  for (let i = 0; i < n; i++) {
    ang += (r() - 0.5) * 0.9;
    x += Math.cos(ang) * step * (0.6 + r() * 0.7);
    y += Math.sin(ang) * step * (0.6 + r() * 0.7);
    pts.push([x, y]);
  }
  return pts;
}
function crackLine(g: Ctx, pts: Pt[], w: number, a: number): void {
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.translate(0.7, 0.9);
  g.beginPath();
  line(pts)(g);
  g.strokeStyle = rgba(ICE.abyss, 0.35 * a);
  g.lineWidth = w;
  g.stroke();
  g.restore();
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  line(pts)(g);
  g.strokeStyle = rgba('#ffffff', 0.75 * a);
  g.lineWidth = w * 0.8;
  g.stroke();
  g.restore();
}

/** A fracture plane deep in the ice: a thin sheet catching the light, a crisp bright edge, cracks off its ends. */
function fracture(g: Ctx, pts: Pt[], a: number, seed: number): void {
  const [p0, p1, p2] = pts;
  const gr = g.createLinearGradient(p0[0], p0[1], p2[0], p2[1]);
  gr.addColorStop(0, rgba('#ffffff', 0.42 * a));
  gr.addColorStop(0.3, rgba(ICE.lit, 0.28 * a));
  gr.addColorStop(1, rgba(ICE.teal, 0.12 * a));
  g.fillStyle = gr;
  poly(pts)(g);
  g.fill();
  // its far edge in shadow, so the sheet has a thickness
  g.save();
  g.lineCap = 'round';
  g.strokeStyle = rgba(ICE.abyss, 0.35 * a);
  g.lineWidth = 1.2;
  g.beginPath();
  line([pts[2], pts[3]])(g);
  g.stroke();
  g.restore();
  // the edge where the sheet meets the light: crisp, with a soft bloom
  softStroke(g, line([p0, p1]), rgba('#ffffff', 0.45 * a), 3, 1.4);
  g.save();
  g.lineCap = 'round';
  g.strokeStyle = rgba('#ffffff', 0.85 * a);
  g.lineWidth = 0.9;
  g.beginPath();
  line([p0, p1])(g);
  g.stroke();
  g.restore();
  const r = rng(seed);
  for (const [x, y] of [p0, p1]) {
    const ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) + (x === p0[0] ? Math.PI : 0);
    crackLine(g, crackWalk(r, x, y, ang + (r() - 0.5), 4, 6), 1, 0.7 * a);
  }
}

/** Paint an icicle (inside a silhouette): clear, blue at the root, the light passing through it, a bead at its tip. */
function paintIcicle(g: Ctx, ic: (typeof ICICLES)[number]): void {
  const [x, y, len, w, lean] = ic;
  const path = iciclePath(ic);
  within(g, path, () => {
    const gr = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    gr.addColorStop(0, mix(ICE.lit, '#ffffff', 0.4));
    gr.addColorStop(0.35, ICE.lit);
    gr.addColorStop(0.7, ICE.body);
    gr.addColorStop(1, ICE.core);
    g.fillStyle = gr;
    g.fillRect(x - w, y - 6, w * 2 + Math.abs(lean) * 2, len + 8);
    // deeper at the root where it joins the sole
    const vg = g.createLinearGradient(0, y - 4, 0, y + len);
    vg.addColorStop(0, rgba(ICE.core, 0.55));
    vg.addColorStop(0.5, rgba(ICE.core, 0));
    vg.addColorStop(1, rgba('#ffffff', 0.25));
    g.fillStyle = vg;
    g.fillRect(x - w, y - 6, w * 2 + Math.abs(lean) * 2, len + 8);
    // drip rings
    for (let k = 1; k < 4; k++) {
      const yy = y + (len * k) / 4.4;
      g.strokeStyle = rgba('#ffffff', 0.3);
      g.lineWidth = 0.6;
      g.beginPath();
      g.moveTo(x - w, yy);
      g.quadraticCurveTo(x, yy + 1.4, x + w, yy);
      g.stroke();
    }
    g.strokeStyle = rgba('#ffffff', 0.85);
    g.lineWidth = Math.max(0.7, w * 0.13);
    g.beginPath();
    g.moveTo(x - w * 0.22, y - 2);
    g.quadraticCurveTo(x - w * 0.12, y + len * 0.5, x + lean * 0.85, y + len * 0.9);
    g.stroke();
  });
  spec(g, x + lean, y + len - 1.6, 1.6, 2.2, 0.95, 0);
}

/** Paint one crystal of the crown: three faces of a hexagonal prism and its termination, each lit by the one light
 * by which way it faces; clear at the point, deeper and glowing cold at the root; a phantom of an earlier growth
 * inside; bright arrises on the lit edges. */
function paintCrystal(g: Ctx, cr: Crystal): void {
  const { e, root, shoulder, tip } = crystalGeom(cr);
  const ux = Math.sin(cr.a);
  const uy = -Math.cos(cr.a);
  const nx = -uy;
  const ny = ux;
  // light from the top left and a little in front of us
  const lit = (fx: number, fy: number, fz: number) => {
    const d = Math.hypot(fx, fy, fz) || 1;
    return Math.max(0, Math.min(1, ((fx * LX + fy * LY) * 0.85 + fz * 0.55) / d));
  };
  const sides: [number, number, number][] = [
    [-nx * 0.75, -ny * 0.75, 0.66],
    [0, 0, 1],
    [nx * 0.75, ny * 0.75, 0.66],
  ];
  const tone = (b: number) => (b > 0.5 ? mix(ICE.body, mix(ICE.lit, '#ffffff', 0.25), (b - 0.5) * 2) : mix(mix(ICE.core, ICE.abyss, 0.3), ICE.body, b * 2));
  const [bx, by] = crystalBase(cr);
  contact(g, (c) => {
    crystalPath(cr)(c);
    c.fill();
  }, 0.55, 2.2, 2.6, '#06142a');
  for (let i = 0; i < 3; i++) {
    const [fx, fy, fz] = sides[i];
    const b = lit(fx, fy, fz);
    // the prism face: deep and glowing at the root, its own tone up to the shoulder
    const face = poly([root[i], shoulder[i], shoulder[i + 1], root[i + 1]]);
    const end = onCrystal(cr, cr.len * 0.8, 0);
    const gr = g.createLinearGradient(bx, by, end[0], end[1]);
    gr.addColorStop(0, mix(ICE.teal, ICE.core, 0.4));
    gr.addColorStop(0.25, mix(tone(b), ICE.teal, 0.3));
    gr.addColorStop(1, tone(Math.min(1, b + 0.12)));
    face(g);
    g.fillStyle = gr;
    g.fill();
    // the termination facet over it, turned up towards the light
    const tb = lit(fx * 0.7 + ux * 0.8, fy * 0.7 + uy * 0.8, fz * 0.8);
    poly([shoulder[i], tip, shoulder[i + 1]])(g);
    g.fillStyle = tone(Math.min(1, tb + 0.08));
    g.fill();
  }
  within(g, crystalPath(cr), () => {
    // light through the ice: a soft clear band down the lit face
    const mid = onCrystal(cr, cr.len * 0.5, e[1] * 0.6);
    spec(g, mid[0], mid[1], cr.len * 0.32, cr.w * 0.16, 0.45, Math.atan2(uy, ux));
    // the cold light inside, at the root
    softFill(g, (c) => {
      c.beginPath();
      c.ellipse(bx, by - 3, cr.w * 0.45, 6, cr.a, 0, Math.PI * 2);
    }, rgba(ICE.glow, 0.45), 3);
    // a phantom: the outline of an earlier, smaller crystal inside this one
    if (cr.len > 20) {
      const k = 0.62;
      const ph = [onCrystal(cr, cr.len * (1 - cr.term) * k, e[0] * 0.55), onCrystal(cr, cr.len * k, cr.w * 0.5 * cr.skew * 0.6), onCrystal(cr, cr.len * (1 - cr.term) * k, e[3] * 0.55)];
      g.strokeStyle = rgba('#ffffff', 0.3);
      g.lineWidth = 0.7;
      g.beginPath();
      line(ph)(g);
      g.stroke();
    }
  });
  // the arrises: the lit edge bright, the far one dark; the termination's edges catch the light
  g.save();
  g.lineCap = 'round';
  g.strokeStyle = rgba('#ffffff', 0.8);
  g.lineWidth = Math.max(0.7, cr.w * 0.07);
  g.beginPath();
  line([root[1], shoulder[1], tip])(g);
  g.stroke();
  g.strokeStyle = rgba('#ffffff', 0.45);
  g.lineWidth = 0.6;
  g.beginPath();
  line([shoulder[0], tip])(g);
  g.stroke();
  g.strokeStyle = rgba(ICE.abyss, 0.45);
  g.lineWidth = 0.8;
  g.beginPath();
  line([root[2], shoulder[2], tip])(g);
  g.stroke();
  // a fine dark line round the far side, so crystals stand off the ones behind them
  g.strokeStyle = rgba(ICE.abyss, 0.55);
  g.lineWidth = 0.9;
  g.beginPath();
  line([tip, shoulder[3], root[3]])(g);
  g.stroke();
  g.restore();
  if (cr.len > 30) glint(g, tip[0] - ux * 2.5, tip[1] - uy * 2.5, cr.len * 0.09, 0.9);
}

/** The carved facets on the boot's flanks (chisel cuts): their planes, the inner edge where each turns, the light or
 * shadow each takes. */
const FACETS: { pts: Pt[]; edge: Pt[]; tone: number }[] = [
  { pts: [[CX - 76, 58], [CX - 40, 58], [CX - 50, 112], [CX - 82, 110]], edge: [[CX - 40, 58], [CX - 50, 112], [CX - 82, 110]], tone: 0.28 },
  { pts: [[CX - 82, 110], [CX - 50, 112], [CX - 66, 182], [CX - 112, 196], [CX - 112, 150]], edge: [[CX - 50, 112], [CX - 66, 182]], tone: 0.12 },
  { pts: [[CX + 44, 58], [CX + 78, 58], [CX + 82, 106], [CX + 52, 110]], edge: [[CX + 44, 58], [CX + 52, 110], [CX + 82, 106]], tone: -0.2 },
  { pts: [[CX + 52, 110], [CX + 80, 104], [CX + 92, 150], [CX + 95, 200], [CX + 62, 188]], edge: [[CX + 52, 110], [CX + 62, 188]], tone: -0.3 },
];
/** The front arris running down the boot, where the lit and the shaded planes meet. */
const ARRIS: Pt[] = [
  [CX + 2, 60],
  [CX + 6, 110],
  [CX + 10, 150],
  [CX + 8, 178],
];

/** Thurisaz, the giants' rune, cut up the front. */
const RUNE = { x: CX - 40, y: 92, w: 44, h: 84 };
const runeStroke = (c: Ctx) => runeGlyph(c, 1, RUNE.x, RUNE.y, RUNE.w, RUNE.h);

function paintBody(g: Ctx, box: { x: number; y: number; w: number; h: number }): void {
  within(g, bodyPath, () => {
    // thick ice is deep blue-green in the middle and pale where it thins at the edges
    const ig = g.createRadialGradient(CX + 22, 168, 6, CX + 6, 150, 132);
    ig.addColorStop(0, mix(ICE.core, ICE.abyss, 0.5));
    ig.addColorStop(0.3, mix(ICE.core, ICE.teal, 0.3));
    ig.addColorStop(0.62, mix(ICE.body, ICE.teal, 0.2));
    ig.addColorStop(0.85, ICE.body);
    ig.addColorStop(1, mix(ICE.body, ICE.lit, 0.6));
    g.fillStyle = ig;
    g.fillRect(box.x, box.y, box.w, box.h);
    // the one light across it: lit top left, cold and deep bottom right
    const lg = g.createLinearGradient(CX - 100, 50, CX + 110, 250);
    lg.addColorStop(0, rgba(ICE.lit, 0.32));
    lg.addColorStop(0.45, rgba(ICE.lit, 0));
    lg.addColorStop(1, rgba(ICE.abyss, 0.5));
    g.fillStyle = lg;
    g.fillRect(box.x, box.y, box.w, box.h);
    // cores deep in the ice: blue-green clouds at different depths
    softFill(g, (c) => {
      c.beginPath();
      c.ellipse(CX + 34, 178, 40, 26, 0.5, 0, Math.PI * 2);
    }, rgba(ICE.teal, 0.4), 14);
    softFill(g, (c) => {
      c.beginPath();
      c.ellipse(CX - 54, 196, 26, 38, -0.3, 0, Math.PI * 2);
    }, rgba(ICE.abyss, 0.35), 16);
    softFill(g, (c) => {
      c.beginPath();
      c.ellipse(CX + 52, 92, 30, 18, 0.2, 0, Math.PI * 2);
    }, rgba(ICE.teal, 0.25), 12);
    // the cold light from within, behind the rune
    softFill(g, (c) => {
      c.beginPath();
      c.ellipse(RUNE.x + RUNE.w * 0.4, RUNE.y + RUNE.h * 0.5, 36, 56, 0, 0, Math.PI * 2);
    }, rgba(ICE.glow, 0.22), 18);
    texture(g, 'speckle', box, 0.08, 1.2);
    // the carved facets, with crisp edges where they turn
    for (const f of FACETS) {
      const p = poly(f.pts);
      const [a, b] = [f.pts[0], f.pts[2]];
      const gr = g.createLinearGradient(a[0], a[1], b[0], b[1]);
      const col = f.tone > 0 ? ICE.lit : ICE.abyss;
      gr.addColorStop(0, rgba(col, Math.abs(f.tone) * 1.3));
      gr.addColorStop(1, rgba(col, Math.abs(f.tone) * 0.5));
      p(g);
      g.fillStyle = gr;
      g.fill();
    }
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (const f of FACETS) {
      // the inner edge of each cut: bright where it turns to the light, dark where it turns away
      g.strokeStyle = f.tone > 0 ? rgba('#ffffff', 0.55) : rgba(ICE.abyss, 0.28);
      g.lineWidth = 1.1;
      g.beginPath();
      line(f.edge)(g);
      g.stroke();
    }
    g.restore();
    // the front arris: the left plane lit, the right a little darker
    {
      const right: Pt[] = [...ARRIS, [CX + 62, 188], [CX + 52, 110], [CX + 44, 58]];
      poly(right)(g);
      g.fillStyle = rgba(ICE.abyss, 0.16);
      g.fill();
      softFill(g, line([[CX + 14, 70], [CX + 30, 110], [CX + 34, 176], [CX + 16, 176], [CX + 8, 110]]), rgba(ICE.abyss, 0.25), 8);
      softStroke(g, line(ARRIS), rgba('#ffffff', 0.25), 4, 2);
      g.save();
      g.lineCap = 'round';
      g.strokeStyle = rgba('#ffffff', 0.5);
      g.lineWidth = 0.9;
      g.beginPath();
      line(ARRIS)(g);
      g.stroke();
      g.restore();
    }
    // fracture planes deep inside, and the cracks running off them
    fracture(g, [[CX + 26, 100], [CX + 70, 148], [CX + 58, 166], [CX + 20, 122]], 0.9, 211);
    fracture(g, [[CX - 96, 168], [CX - 54, 148], [CX - 50, 166], [CX - 90, 188]], 0.75, 223);
    fracture(g, [[CX + 30, 200], [CX + 86, 186], [CX + 90, 204], [CX + 40, 214]], 0.6, 227);
    const r = rng(hashStr('thrym-ice'));
    crackLine(g, crackWalk(r, CX - 62, 70, 1.3, 6, 9), 1.1, 0.8);
    crackLine(g, crackWalk(r, CX + 62, 74, 1.9, 5, 9), 1, 0.6);
    crackLine(g, crackWalk(r, CX - 20, 204, -0.6, 5, 8), 0.9, 0.55);
    // bubbles: a few trails rising through the ice, and fine clusters low down where the ice is oldest
    for (const [x0, y0, n, drift] of [[CX + 44, 214, 9, 6], [CX - 70, 214, 7, -4], [CX + 80, 160, 6, -3]] as const) {
      let y = y0;
      for (let i = 0; i < n; i++) {
        const t = i / n;
        if (r() < 0.25) continue;
        bubble(g, x0 + Math.sin(i * 1.3) * 3 + drift * t + (r() - 0.5) * 5, y, (2.6 - t * 1.8) * (0.6 + r() * 0.7), 0.9, 1 + r() * 0.5);
        y -= 4 + i * 1.5 + r() * 5;
      }
    }
    for (let i = 0; i < 46; i++) {
      const x = CX - 90 + r() * 180;
      const y = 150 + r() ** 0.6 * 90;
      bubble(g, x, y, 0.6 + r() * 1.5, 0.65, 1 + r() * 0.6);
    }
    // the rune seen again through the ice, bent by it: a faint blurred ghost of its light deeper in
    g.save();
    g.translate(7, 9);
    softStroke(g, runeStroke, rgba(ICE.glow, 0.22), 5, 3);
    g.restore();
    // the rune: a deep V-cut, its far wall in shadow, its near lip lit, cold light at the bottom of the groove
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.translate(LX * 2, LY * 2);
    softStroke(g, runeStroke, rgba(ICE.abyss, 0.5), 8, 1.6);
    g.restore();
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.translate(-LX * 2.2, -LY * 2.2);
    g.beginPath();
    runeStroke(g);
    g.strokeStyle = rgba('#ffffff', 0.6);
    g.lineWidth = 6;
    g.stroke();
    g.restore();
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    runeStroke(g);
    g.strokeStyle = mix(ICE.core, ICE.abyss, 0.3);
    g.lineWidth = 7;
    g.stroke();
    g.restore();
    hotLine(g, runeStroke, ICE.glow, 2.4, 0.75);
    // hoarfrost: thick under the band where the cold pours out, along the flanks, on the old ice at the bottom
    hoarfrost(g, { x: CX - 104, y: 48, w: 208, h: 44 }, r, 0.75, 241, 14, 0.05, 0.6);
    hoarfrost(g, { x: CX - 112, y: 80, w: 48, h: 150 }, r, 0.5, 243, 6, 0.2, 0.2);
    hoarfrost(g, { x: CX + 70, y: 100, w: 44, h: 130 }, r, 0.3, 245, 4, 0.2, 0.2);
    // the big glassy highlights, following the form
    softStroke(g, (c) => {
      c.moveTo(CX - 64, 92);
      c.quadraticCurveTo(CX - 96, 150, CX - 92, 196);
    }, rgba('#ffffff', 0.5), 7, 3);
    spec(g, CX - 72, 122, 5, 22, 0.85, 0.35);
    spec(g, CX + 82, 150, 3, 24, 0.45, -0.15, ICE.moon);
  });
}

function paintFore(g: Ctx): void {
  within(g, bodyPath, () => {
    // the toe: its far side falls into the deep cold, its thickest ice the darkest
    softFill(g, (c) => {
      c.beginPath();
      c.ellipse(CX + 50, 222, 52, 30, -0.4, 0, Math.PI * 2);
    }, rgba(ICE.abyss, 0.45), 16);
    softFill(g, (c) => {
      c.beginPath();
      c.ellipse(CX - 14, 222, 62, 24, 0, 0, Math.PI * 2);
    }, rgba(ICE.core, 0.3), 14);
    // the toe's round top catches the light in a long curved window
    softStroke(g, (c) => {
      c.moveTo(CX - 112, 228);
      c.quadraticCurveTo(CX - 98, 202, CX - 50, 196);
    }, rgba('#ffffff', 0.45), 5, 3);
    spec(g, CX - 78, 204, 15, 4.5, 0.75, -0.3);
    const r = rng(hashStr('thrym-toe'));
    for (let i = 0; i < 26; i++) bubble(g, CX - 80 + r() * 160, 228 + r() * 24, 0.6 + r() * 1.6, 0.7);
  });
  glint(g, CX - 82, 202, 5, 0.95);
}

function paintSole(g: Ctx, box: { x: number; y: number; w: number; h: number }): void {
  // the boot sits down in it: a soft shadow on the ice just above its top edge
  within(g, bodyPath, () => {
    g.save();
    g.translate(0, -3);
    softStroke(g, line(RAND_TOP), rgba(ICE.abyss, 0.55), 9, 4);
    g.restore();
  });
  within(g, solePath, () => {
    // old glacier ice, pressed hard and dark, in strata
    const sg = g.createLinearGradient(0, 200, 0, 274);
    sg.addColorStop(0, mix(ICE.core, ICE.abyss, 0.15));
    sg.addColorStop(0.55, ICE.abyss);
    sg.addColorStop(1, '#06142a');
    g.fillStyle = sg;
    g.fillRect(box.x, 190, box.w, 90);
    const lg = g.createLinearGradient(CX - 120, 0, CX + 120, 0);
    lg.addColorStop(0, rgba(ICE.lit, 0.16));
    lg.addColorStop(0.4, rgba(ICE.lit, 0));
    lg.addColorStop(1, rgba(ICE.abyss, 0.4));
    g.fillStyle = lg;
    g.fillRect(box.x, 190, box.w, 90);
    const r = rng(hashStr('thrym-strata'));
    for (let k = 0; k < 6; k++) {
      const y0 = 244 + k * 5 + r() * 3;
      const dark = k % 2 === 0;
      g.strokeStyle = dark ? rgba('#0a1a30', 0.35) : rgba(ICE.lit, 0.25);
      g.lineWidth = dark ? 1.4 : 0.9;
      g.beginPath();
      for (let x = CX - 120; x <= CX + 120; x += 8) {
        const y = y0 + Math.sin(x * 0.05 + k) * 1.4 + (x - CX) * 0.012 * (k - 3);
        if (x === CX - 120) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    }
    // grit frozen into the old ice
    for (let i = 0; i < 40; i++) {
      g.fillStyle = rgba('#1a2030', 0.25 + r() * 0.3);
      g.beginPath();
      g.arc(CX - 110 + r() * 220, 240 + r() * 28, 0.4 + r() * 0.8, 0, Math.PI * 2);
      g.fill();
    }
    texture(g, 'stone', { x: box.x, y: 228, w: box.w, h: 48 }, 0.12, 1.1);
    // the top edge: a bevel catching the light, crusted with rime
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    line(RAND_TOP)(g);
    g.strokeStyle = rgba('#ffffff', 0.75);
    g.lineWidth = 2.4;
    g.stroke();
    g.restore();
    softStroke(g, line(RAND_TOP), rgba(ICE.lit, 0.4), 7, 3);
    // chips knocked out of the bottom edge show paler, fresher ice
    for (const [x, y] of [[CX - 80, 268], [CX + 50, 271], [CX + 98, 246], [CX - 122, 232]] as const) {
      g.fillStyle = rgba(ICE.lit, 0.45);
      g.beginPath();
      g.moveTo(x - 6, y + 2);
      g.lineTo(x, y - 5);
      g.lineTo(x + 6, y + 2);
      g.closePath();
      g.fill();
    }
    spec(g, CX + 96, 246, 3, 10, 0.5, 0, ICE.moon);
  });
}

function paintBand(g: Ctx): void {
  const bb = { x: CX - BAND_X - 4, y: 30, w: BAND_X * 2 + 8, h: 32 };
  piece(g, bandPath, bb, 'iron', ICE.iron, { shadow: 0.6, size: 7, texA: 0.55 });
  within(g, bandPath, () => {
    // blued iron: cold blue in the light, rust-black in the pits
    blotches(g, bb, '#2a1a14', 0.35, 4, 0.6, 0.15, 261, 'multiply');
    blotches(g, bb, '#6a8ab8', 0.25, 6, 0.55, 0.2, 263, 'screen');
    // the lit top edge and the dark lower lip of a raised strap
    g.save();
    g.beginPath();
    for (let x = CX - BAND_X; x <= CX + BAND_X; x += 4) (x === CX - BAND_X ? g.moveTo(x, bandTop(x) + 2) : g.lineTo(x, bandTop(x) + 2));
    g.strokeStyle = rgba(ICE.moon, 0.6);
    g.lineWidth = 1.4;
    g.stroke();
    g.beginPath();
    for (let x = CX - BAND_X; x <= CX + BAND_X; x += 4) (x === CX - BAND_X ? g.moveTo(x, bandTop(x) + BAND_H - 2) : g.lineTo(x, bandTop(x) + BAND_H - 2));
    g.strokeStyle = rgba('#05080e', 0.6);
    g.lineWidth = 1.6;
    g.stroke();
    g.restore();
    // runes cut into it, squeezed towards its ends as the band turns away
    const runes = [3, 7, 0, 2, 5, 6, 4];
    runes.forEach((ri, i) => {
      const u = (i - (runes.length - 1) / 2) / (runes.length / 2);
      const x = CX + Math.sin(u * 1.2) * 82;
      const w = 9 * Math.cos(u * 1.2);
      if (Math.abs(x - THRYM_CHAIN.x) < 9) return;
      const y = bandTop(x) + 3.5;
      g.save();
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.translate(-LX * 0.8, -LY * 0.8);
      g.beginPath();
      runeGlyph(g, ri, x - w / 2, y, w, 10);
      g.strokeStyle = rgba(ICE.moon, 0.4);
      g.lineWidth = 1.3;
      g.stroke();
      g.restore();
      g.save();
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.beginPath();
      runeGlyph(g, ri, x - w / 2, y, w, 10);
      g.strokeStyle = rgba('#03060c', 0.8);
      g.lineWidth = 1.5;
      g.stroke();
      g.strokeStyle = rgba(ICE.glow, 0.35);
      g.lineWidth = 0.6;
      g.stroke();
      g.restore();
    });
    // rime on its upper edge
    blotches(g, { x: bb.x, y: 30, w: bb.w, h: 9 }, ICE.rime, 0.65, 3, 0.5, 0.12, 267);
  });
  for (const dx of [-84, 84]) rivet(g, CX + dx, bandTop(CX + dx) + BAND_H / 2, 2.6, '#7a8aa8');
}

function paintFur(g: Ctx, white: string): void {
  const fb = { x: CX - 96, y: -10, w: 192, h: 48 };
  piece(g, furPath, fb, 'plush', white, { shadow: 0.6, size: 10, texA: 0.25 });
  within(g, furPath, () => {
    const r = rng(hashStr('thrym-fur'));
    furCoat(g, r, fb, (x) => Math.PI / 2 + (x - CX) / 260, mix(white, '#c8d8e4', 0.35), '#3a4a6a', { n: 0.32, len: 13, w: 1.1 });
    // each lock combed into its point
    g.save();
    g.lineCap = 'round';
    for (const l of FUR_LOCKS) {
      const [tx, ty] = l.tip;
      for (let k = 0; k < 7; k++) {
        const sx = l.x1 + (l.x0 - l.x1) * (0.15 + k * 0.12);
        g.strokeStyle = rgba(k % 3 === 0 ? '#8a9ab8' : '#ffffff', 0.55);
        g.lineWidth = 1.1;
        g.beginPath();
        g.moveTo(sx, 12);
        g.quadraticCurveTo(sx, 24, tx + (sx - tx) * 0.2, ty - 1.5);
        g.stroke();
      }
    }
    g.restore();
    // the leg goes in at the top: deep shadow there; the fur rolls over and catches the moon on its right
    ao(g, CX, -6, 84, 10, 0.6, 0, '#1a2440');
    g.fillStyle = (() => {
      const lg = g.createLinearGradient(CX - 90, 0, CX + 95, 0);
      lg.addColorStop(0, rgba('#ffffff', 0.15));
      lg.addColorStop(0.5, rgba('#ffffff', 0));
      lg.addColorStop(1, rgba('#2a3a60', 0.35));
      return lg;
    })();
    g.fillRect(fb.x, fb.y, fb.w, fb.h);
  });
}

function drawThrym(ctx: Ctx, art: FootArt, _p: Pose, o: Opts): void {
  const white = art.secondary ?? '#eaf8ff';
  const box = { x: CX - 128, y: -10, w: 250, h: 300 };
  const crown = CROWN.map(crystalPath);
  const icicles = ICICLES.map(iciclePath);
  const iceParts = [bodyPath, solePath, ...icicles, ...crown];
  if (o.emissive) {
    glowOnly(ctx, [...iceParts, bandPath], box, (g) => {
      // the rune breathing cold light, the crown glowing at its roots, light caught along the fractures
      hotLine(g, runeStroke, ICE.glow, 4.2, 0.95);
      g.fillStyle = (() => {
        const gr = g.createRadialGradient(RUNE.x + RUNE.w * 0.4, RUNE.y + RUNE.h * 0.5, 4, RUNE.x + RUNE.w * 0.4, RUNE.y + RUNE.h * 0.5, 60);
        gr.addColorStop(0, rgba(ICE.glow, 0.35));
        gr.addColorStop(1, rgba(ICE.glow, 0));
        return gr;
      })();
      g.fillRect(box.x, box.y, box.w, box.h);
      for (const cr of CROWN) {
        const [bx, by] = crystalBase(cr);
        const mid = onCrystal(cr, cr.len * 0.45, 0);
        softStroke(g, line([[bx, by], mid]), rgba(ICE.glow, 0.5), cr.w * 0.35, cr.w * 0.25);
      }
      softStroke(g, line([[CX + 26, 96], [CX + 74, 150]]), rgba(ICE.glow, 0.35), 2.5, 2);
      softStroke(g, line([[CX - 92, 150], [CX - 50, 132]]), rgba(ICE.glow, 0.3), 2.5, 2);
    });
    return;
  }
  if (o.heat) {
    glowOnly(ctx, iceParts, box, (g, hs) => {
      // the ice melting: a clean warm glow low down and round its edges, the surface wet and glassy, meltwater
      const hg = g.createLinearGradient(0, 274, 0, 120);
      hg.addColorStop(0, rgba('#ffb47a', 0.45));
      hg.addColorStop(0.35, rgba('#ff8a5a', 0.15));
      hg.addColorStop(1, rgba('#ff8a5a', 0));
      g.fillStyle = hg;
      g.fillRect(box.x, box.y, box.w, box.h);
      hs.edge(rgba('#ffb47a', 0.75), 6, 0, 0);
      // wet speculars: hard bright streaks on the lit side
      spec(g, CX - 80, 130, 4, 26, 0.6, 0.3);
      spec(g, CX - 60, 204, 14, 3.5, 0.6, -0.25);
      // the surface going wet and glassy: a broad sheen on the lit side
      const sg = g.createLinearGradient(CX - 110, 0, CX + 20, 0);
      sg.addColorStop(0, rgba('#eaf8ff', 0.22));
      sg.addColorStop(1, rgba('#eaf8ff', 0));
      g.fillStyle = sg;
      g.fillRect(box.x, 40, box.w, 240);
      // meltwater running down in wavering rivulets from under the band, a bead swelling at each one's end
      const r = rng(hashStr('thrym-melt'));
      for (let i = 0; i < 9; i++) {
        const x0 = CX - 92 + (i + r() * 0.6) * 20;
        const y0 = 58 + r() * 30;
        const len = 30 + r() * 70;
        const pts: Pt[] = [[x0, y0]];
        let x = x0;
        for (let k = 1; k <= 6; k++) {
          x += (r() - 0.5) * 4;
          pts.push([x, y0 + (len * k) / 6]);
        }
        softStroke(g, line(pts), rgba('#e8fbff', 0.35), 2.2, 1.2);
        g.save();
        g.lineCap = 'round';
        g.strokeStyle = rgba('#ffffff', 0.55);
        g.lineWidth = 0.8;
        g.beginPath();
        line(pts)(g);
        g.stroke();
        g.restore();
        spec(g, x, y0 + len + 1, 2.4, 3, 0.8, 0);
      }
      for (const cr of CROWN) {
        const tip = crystalGeom(cr).tip;
        softStroke(g, line([crystalBase(cr), tip]), rgba('#fff0e0', 0.4), cr.w * 0.3, cr.w * 0.2);
      }
      hotLine(g, runeStroke, '#ffc89a', 2.6, 0.6);
    });
    return;
  }
  const sil = new Sil(ctx, [...iceParts, bandPath, furPath], box);
  const g = sil.g;
  paintBody(g, box);
  paintFore(g);
  paintSole(g, box);
  ICICLES.forEach((ic, i) => {
    contact(g, (c) => {
      icicles[i](c);
      c.fill();
    }, 0.4, 1.5, 2, '#06142a');
    paintIcicle(g, ic);
  });
  paintBand(g);
  paintFur(g, white);
  for (const cr of CROWN) paintCrystal(g, cr);
  // rime fusing the crystals' roots into the band
  {
    const r = rng(hashStr('thrym-roots'));
    for (const cr of CROWN) {
      const [bx, by] = crystalBase(cr);
      softFill(g, (c) => {
        c.beginPath();
        c.ellipse(bx, by - 1, cr.w * 0.62, 3.2, cr.a * 0.3, 0, Math.PI * 2);
      }, rgba(ICE.rime, 0.85), 1.2);
    }
    hoarfrost(g, { x: CX - 92, y: 30, w: 184, h: 18 }, r, 0.9, 271, 10, 0.3, 0.3);
  }
  // the one light over the whole silhouette: the far side into deep cold, frost on the lit edges, the moon's rim
  sil.edge(rgba('#04102a', 0.5), 20, LX * 11, LY * 11);
  sil.edge(rgba(ICE.rime, 0.55), 3.5, -LX * 2.6, -LY * 2.6);
  sil.edge(rgba(ICE.moon, 0.95), 2.4, LX * 3.2, LY * 3.2);
  sil.edge(rgba('#7ad8ff', 0.2), 8, LX * 6, LY * 6);
  sil.finish(inkOf('#163a6a'), { openTop: -5 });
  if (!o.live) paintChain(ctx);
}

registerStyle('thrym', {
  contactY: 274,
  halfWidth: 112,
  leg: { kind: 'thrymgreave', hw: 62, join: 'into' },
  parts: {
    chain: {
      box: { x: THRYM_CHAIN.x - 16, y: THRYM_CHAIN.y - 10, w: 36, h: LINKS * LINK + 44 },
      frames: 1,
      pivot: [THRYM_CHAIN.x, THRYM_CHAIN.y],
      draw: (g) => paintChain(g),
    },
  },
  draw(ctx, art, p, o) {
    drawThrym(ctx, art, p, o);
  },
});

// ——— the leg: an iron greave ———

/** Each tile's period must divide its height so it wraps: the nearest period that does to the one wanted. */
const per = (H: number, want: number) => H / Math.max(1, Math.round(H / want));

// The frost king's greave: old blued iron, pitted, banded with riveted straps, a rune cut between them with a thread
// of cold light in it, rime settled on every strap's top edge.
registerLegKind('thrymgreave', {
  tint: '#0a1430',
  sheen: 0.32,
  draw(ctx, x0, w, H, base, accent) {
    const glow = accent ?? ICE.glow;
    texture(ctx, 'cast', { x: x0, y: 0, w, h: H }, 0.5, 1.2);
    blotches(ctx, { x: x0, y: 0, w, h: H }, '#2a1a14', 0.25, 5, 0.62, 0.15, 291, 'multiply');
    const p = per(H, 96);
    const n = Math.round(H / p);
    wrapTile(ctx, H, () => {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 0; i < n; i++) {
        const y = i * p;
        // a raised strap: a dark shadow under it, its face, a lit top edge with rime on it
        ctx.fillStyle = rgba('#03060c', 0.45);
        ctx.fillRect(x0, y + 13, w, 3);
        ctx.fillStyle = rgba(shade(base, -0.25), 0.9);
        ctx.fillRect(x0, y, w, 13);
        ctx.fillStyle = rgba(ICE.moon, 0.45);
        ctx.fillRect(x0, y, w, 1.6);
        blotches(ctx, { x: x0, y: y - 2, w, h: 5 }, ICE.rime, 0.7, 2.5, 0.5, 0.1, 293 + i);
        // rivets round the strap, foreshortened as the leg turns away
        for (const u of [0.12, 0.34, 0.5, 0.66, 0.88]) {
          const k = Math.sin(u * Math.PI);
          const rx = x0 + u * w;
          ctx.fillStyle = rgba('#03060c', 0.5);
          ctx.beginPath();
          ctx.ellipse(rx + 0.6, y + 7.6, 2.4 * k, 2.4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = mix(base, '#c8d8f0', 0.35);
          ctx.beginPath();
          ctx.ellipse(rx, y + 6.6, 2.2 * k, 2.2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = rgba('#ffffff', 0.7);
          ctx.beginPath();
          ctx.arc(rx - 0.6 * k, y + 5.8, 0.7, 0, Math.PI * 2);
          ctx.fill();
        }
        // the rune between the straps: a dark groove, a lit lip, a thread of cold light
        const rx = x0 + w * 0.42;
        const ry = y + 30;
        const rh = Math.min(48, p - 40);
        for (const [dx, dy, col, lw] of [[-LX, -LY, rgba(ICE.moon, 0.35), 3.4], [0, 0, rgba('#03060c', 0.8), 3.4], [0, 0, rgba(glow, 0.3), 2.6], [0, 0, rgba(mix(glow, '#ffffff', 0.4), 0.9), 1.1]] as const) {
          ctx.save();
          ctx.translate(dx, dy);
          ctx.beginPath();
          runeGlyph(ctx, i % 2 ? 2 : 1, rx, ry, rh * 0.45, rh);
          ctx.strokeStyle = col;
          ctx.lineWidth = lw;
          ctx.stroke();
          ctx.restore();
        }
        // frost creeping down from the strap above
        blotches(ctx, { x: x0, y: y + 16, w, h: 18 }, ICE.rime, 0.25, 4, 0.62, 0.2, 297 + i);
      }
    });
    // a long cold gleam down the lit side, and the moon on the far edge
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0.14, rgba('#ffffff', 0));
    g.addColorStop(0.24, rgba('#e8f4ff', 0.28));
    g.addColorStop(0.32, rgba('#ffffff', 0));
    g.addColorStop(0.84, rgba(ICE.moon, 0));
    g.addColorStop(0.95, rgba(ICE.moon, 0.5));
    g.addColorStop(1, rgba(ICE.moon, 0.15));
    ctx.fillStyle = g;
    ctx.fillRect(x0, 0, w, H);
  },
});
