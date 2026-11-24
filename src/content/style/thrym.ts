// THRYM THE FROST KING (the Act 8 boss): the king of the frost giants, in a boot carved from glacier ice.
//
// - A giant's boot seen front-on like every foot in the game, coming down toe first: the shaft under the fur running
//   down to the ankle, then swelling low into a broad rounded toe box, wider than the shaft, sitting on the table.
// - Glacier ice carved in big planes: a lit strip down the shaft, a raised tongue carved down the front, the instep's
//   sides flaring out (the near one lit, the far one in shadow), a toe cap cut like a gem in three facets (near lit,
//   middle, far dark), crisp edges where the planes turn. Inside them: a deep teal core, fracture sheets, cracks and trapped bubbles. Thurisaz, the
//   giants' rune, cut deep up the shaft, breathing cold light.
// - Armour: a rune-cut iron band across the front of the toe, riveted, rimed along its top.
// - His crown: a ring of tall faceted ice crystals round the leg above the fur, rising from an iron circlet, tallest at
//   the front and stepping down round the sides, varied in height and lean, lit facet by facet, glowing at the roots.
// - A white bear's fur cuff under the crown; a broken giant's chain hanging off the circlet (it swings in play).
// - The sole: dark compacted ice with a crisp bottom edge, frost along its welt, a few irregular translucent icicles
//   at its ends.
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

/** The boot, front-on: the shaft under the fur running down to the ankle, then swelling low and fast into the broad
 * rounded toe box at the bottom. */
const bodyPath: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 66, 54);
  c.lineTo(CX - 60, 100);
  c.lineTo(CX - 58, 136);
  c.bezierCurveTo(CX - 58, 172, CX - 112, 170, CX - 117, 214);
  c.bezierCurveTo(CX - 120, 242, CX - 108, 260, CX - 84, 264);
  c.quadraticCurveTo(CX, 272, CX + 84, 264);
  c.bezierCurveTo(CX + 108, 260, CX + 120, 242, CX + 117, 214);
  c.bezierCurveTo(CX + 112, 170, CX + 58, 172, CX + 58, 136);
  c.lineTo(CX + 60, 100);
  c.lineTo(CX + 66, 54);
  c.closePath();
};

/** The sole, front-on: a thin rand of dark compacted ice following the toe's round bottom and up its corners, a crisp
 * bottom edge. */
const WELT: Pt[] = [
  [CX - 120, 236],
  [CX - 116, 234],
  [CX - 112, 250],
  [CX - 98, 259],
  [CX - 50, 265],
  [CX, 266],
  [CX + 50, 265],
  [CX + 98, 259],
  [CX + 112, 250],
  [CX + 116, 234],
  [CX + 120, 236],
];
const SOLE: Pt[] = [...WELT, [CX + 121, 252], [CX + 112, 264], [CX + 92, 271], [CX + 50, 274], [CX - 50, 274], [CX - 92, 271], [CX - 112, 264], [CX - 121, 252]];
const solePath = poly(SOLE);

/** The iron band across the front of the toe, the rim of its cap: it follows the toe box round, so it dips in the
 * middle. */
const bandTop = (x: number) => 180 + 22 * (1 - ((x - CX) / 108) ** 2);
const BAND_H = 14;
const BAND_X = 108;
const bandPath: PathFn = (c) => {
  c.beginPath();
  for (let x = CX - BAND_X; x <= CX + BAND_X; x += 5) (x === CX - BAND_X ? c.moveTo(x, bandTop(x)) : c.lineTo(x, bandTop(x)));
  c.quadraticCurveTo(CX + BAND_X + 4, bandTop(CX + BAND_X) + BAND_H / 2, CX + BAND_X + 1, bandTop(CX + BAND_X) + BAND_H);
  for (let x = CX + BAND_X; x >= CX - BAND_X; x -= 5) c.lineTo(x, bandTop(x) + BAND_H);
  c.quadraticCurveTo(CX - BAND_X - 4, bandTop(CX - BAND_X) + BAND_H / 2, CX - BAND_X, bandTop(CX - BAND_X));
  c.closePath();
};
/** A point along the band's middle (u 0 left … 1 right). */
const onBand = (u: number): Pt => {
  const x = CX - BAND_X + u * BAND_X * 2;
  return [x, bandTop(x) + BAND_H / 2];
};
/** The crown's iron circlet round the leg: it follows the leg round, so it dips at the front. */
const ringTop = (x: number) => 32 + 9 * (1 - ((x - CX) / 80) ** 2);
const RING_H = 9;
const RING_X = 80;
const ringPath: PathFn = (c) => {
  c.beginPath();
  for (let x = CX - RING_X; x <= CX + RING_X; x += 4) (x === CX - RING_X ? c.moveTo(x, ringTop(x)) : c.lineTo(x, ringTop(x)));
  c.quadraticCurveTo(CX + RING_X + 3, ringTop(CX + RING_X) + RING_H / 2, CX + RING_X, ringTop(CX + RING_X) + RING_H);
  for (let x = CX + RING_X; x >= CX - RING_X; x -= 4) c.lineTo(x, ringTop(x) + RING_H);
  c.quadraticCurveTo(CX - RING_X - 3, ringTop(CX - RING_X) + RING_H / 2, CX - RING_X, ringTop(CX - RING_X));
  c.closePath();
};

/** The white bear's fur cuff under the crown: shaggy locks hanging over the top of the boot. */
const FUR_LOCKS = (() => {
  const r = rng(hashStr('thrym-locks'));
  const out: { x0: number; x1: number; tip: Pt; point: boolean }[] = [];
  // uneven widths, uneven lengths, some locks drawn to a point, some heavy and blunt
  let x0 = CX + 92;
  while (x0 > CX - 92) {
    const x1 = Math.max(CX - 92, x0 - (14 + r() * 16));
    const mid = (x0 + x1) / 2;
    const side = (mid - CX) / 92;
    out.push({ x0, x1, tip: [mid + side * 6 + (r() - 0.5) * 6, 62 + r() * 13 - Math.abs(side) * 4], point: r() < 0.45 });
    x0 = x1;
  }
  return out;
})();
const furPath: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 80, 32);
  c.quadraticCurveTo(CX, 40, CX + 80, 32);
  c.bezierCurveTo(CX + 88, 36, CX + 93, 46, CX + 90, 58);
  // shaggy locks: some heavy and blunt, some drawn to a point
  for (const l of FUR_LOCKS) {
    const [tx, ty] = l.tip;
    const w = l.x0 - l.x1;
    if (l.point) {
      c.quadraticCurveTo(l.x0 - w * 0.1, ty - 6, tx, ty + 2);
      c.quadraticCurveTo(l.x1 + w * 0.15, ty - 8, l.x1, 57);
    } else {
      c.bezierCurveTo(l.x0 + 1, ty - 4, tx + w * 0.45, ty + 1, tx, ty + 1);
      c.bezierCurveTo(tx - w * 0.45, ty + 1, l.x1 - 1, ty - 4, l.x1, 57);
    }
  }
  c.bezierCurveTo(CX - 93, 46, CX - 88, 36, CX - 80, 32);
  c.closePath();
};

/** A crystal of the crown (dx from the middle along the circlet, length, width, lean in radians, where its point sits
 * across it, how long its termination is). */
interface Crystal {
  dx: number;
  len: number;
  w: number;
  a: number;
  skew: number;
  term: number;
}
/** The crown: a ring of crystals round the leg, tallest at the front and stepping down round the sides, each a little
 * different (seeded jitter on length, lean and point), small ones between; drawn back to front. */
const CROWN: Crystal[] = (() => {
  const r = rng(hashStr('thrym-crown'));
  const out: Crystal[] = [];
  // (the lit left a little taller than the right; widths vary; a few lean off true)
  const add = (dx: number, len: number, w: number, a: number, tilt = 0) =>
    out.push({ dx: dx + (r() - 0.5) * 2, len: len * (0.9 + r() * 0.2) * (1 - (dx / 80) * 0.14), w: w * (0.75 + r() * 0.55), a: a + tilt + (r() - 0.5) * 0.1, skew: (r() - 0.5) * 0.35, term: 0.27 + r() * 0.1 });
  // small ones between the big ones, behind them (a gap on the right where none grew)
  for (const [dx, len, w, a] of [[-50, 12, 7, -0.2], [-26, 18, 8, 0.1], [-10, 24, 9, 0.3], [10, 22, 9, -0.3], [50, 12, 7, 0.2]] as const) add(dx, len, w, a);
  // the big ones, from the sides in to the front: stepping up hard to the front, a few knocked off true
  const tilts: Record<number, number> = { [-56]: -0.22, 44: 0.24, [-31]: 0.16 };
  for (const [dx, len, w, a] of [[77, 10, 9, 1.05], [67, 14, 11, 0.82], [56, 19, 13, 0.6], [44, 25, 15, 0.42], [31, 32, 16, 0.27], [17, 39, 18, 0.13]] as const)
    for (const s of [-1, 1]) {
      // a gap: one of the right side's crystals broke off
      if (s === 1 && dx === 67) continue;
      add(s * dx, len, w, s * a, tilts[s * dx] ?? 0);
    }
  out.push({ dx: 0, len: 46, w: 23, a: 0.02, skew: 0.05, term: 0.28 });
  return out;
})();
const crystalBase = (cr: Crystal): Pt => [CX + cr.dx, ringTop(CX + cr.dx) + 2];
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
export const THRYM_TIPS: Pt[] = CROWN.filter((cr) => cr.len > 20).map((cr) => crystalGeom(cr).tip);

/** Icicles at the sole's ends: few, irregular (x, y of the root, length, width, lean). */
const ICICLES: [number, number, number, number, number][] = [
  [CX - 108, 264, 21, 10, -3],
  [CX - 92, 269, 10, 6, 1],
  [CX + 106, 264, 17, 9, 2],
];
/** Where meltwater drips from in play: the icicles' tips. */
export const THRYM_DRIPS: Pt[] = ICICLES.map(([x, y, len, , lean]) => [x + lean, y + len]);
/** Where frost creeps in play: along the circlet, the instep plate's top and the welt (x from, x to, y). */
export const THRYM_CREEP: [number, number, number][] = [
  [CX - 76, CX + 76, 36],
  [CX - 96, CX + 96, 192],
  [CX - 108, CX + 108, 262],
];

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

/** The chain: a broken giant's chain hanging from a staple on the circlet's right (its own sprite in play, so it
 * swings). */
export const THRYM_CHAIN = { x: CX + 62, y: 38 };
const LINKS = 4;
const LINK = 15.5;
/** Each link's size: forged by hand, no two alike. */
const LINK_K = [1, 1.1, 0.92, 1.06];
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
    // the staple through the circlet
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

/** The carved planes of the boot and the light or shadow each takes (+ lit, − shaded). */
const PLANES: { pts: Pt[]; tone: number }[] = [
  // a lit strip down the shaft's near side, its far side turned away
  { pts: [[CX - 66, 54], [CX - 46, 54], [CX - 42, 140], [CX - 58, 140]], tone: 0.3 },
  { pts: [[CX + 42, 54], [CX + 66, 54], [CX + 58, 140], [CX + 42, 140]], tone: -0.4 },
  // the tongue: a raised panel carved down the front from the fur to the toe
  { pts: [[CX - 26, 66], [CX + 26, 66], [CX + 30, 150], [CX + 38, 204], [CX - 38, 204], [CX - 30, 150]], tone: 0.24 },
  // the instep flaring out to the toe box: the near side lit, the far side turning into shadow
  { pts: [[CX - 58, 136], [CX - 42, 140], [CX - 30, 150], [CX - 38, 204], [CX - 118, 192], [CX - 100, 172], [CX - 70, 162]], tone: 0.2 },
  { pts: [[CX + 58, 136], [CX + 42, 140], [CX + 30, 150], [CX + 38, 204], [CX + 118, 192], [CX + 100, 172], [CX + 70, 162]], tone: -0.45 },
  // the toe cap, cut like a gem in three facets running down to its front: near lit, middle, far in shadow
  { pts: [[CX - 118, 196], [CX - 40, 212], [CX - 18, 268], [CX - 92, 262], [CX - 116, 244]], tone: 0.34 },
  { pts: [[CX - 40, 212], [CX + 40, 212], [CX + 18, 268], [CX - 18, 268]], tone: 0.06 },
  { pts: [[CX + 40, 212], [CX + 118, 196], [CX + 116, 244], [CX + 92, 262], [CX + 18, 268]], tone: -0.58 },
];
/** The crisp edges where the planes turn: bright where the edge catches the light, dark where it turns away. */
const EDGES: { pts: Pt[]; lit: boolean }[] = [
  { pts: [[CX - 46, 54], [CX - 42, 140]], lit: true },
  { pts: [[CX + 42, 54], [CX + 42, 140]], lit: false },
  { pts: [[CX - 26, 66], [CX - 30, 150], [CX - 38, 204]], lit: true },
  { pts: [[CX + 26, 66], [CX + 30, 150], [CX + 38, 204]], lit: false },
  { pts: [[CX - 40, 212], [CX - 18, 266]], lit: true },
  { pts: [[CX + 40, 212], [CX + 18, 266]], lit: false },
];

/** Thurisaz, the giants' rune, cut up the shaft. */
const RUNE = { x: CX - 15, y: 92, w: 28, h: 50 };
const runeStroke = (c: Ctx) => runeGlyph(c, 1, RUNE.x, RUNE.y, RUNE.w, RUNE.h);

function paintBody(g: Ctx, box: { x: number; y: number; w: number; h: number }): void {
  within(g, bodyPath, () => {
    // thick ice is deep blue-green inside the foot and pale where it thins at the edges
    const ig = g.createRadialGradient(CX + 14, 210, 6, CX, 180, 140);
    ig.addColorStop(0, mix(ICE.core, ICE.abyss, 0.55));
    ig.addColorStop(0.32, mix(ICE.core, ICE.teal, 0.25));
    ig.addColorStop(0.65, mix(ICE.body, ICE.teal, 0.2));
    ig.addColorStop(1, mix(ICE.body, ICE.lit, 0.45));
    g.fillStyle = ig;
    g.fillRect(box.x, box.y, box.w, box.h);
    // cores at different depths
    softFill(g, (c) => {
      c.beginPath();
      c.ellipse(CX + 34, 232, 50, 22, 0.15, 0, Math.PI * 2);
    }, rgba(ICE.abyss, 0.45), 14);
    softFill(g, (c) => {
      c.beginPath();
      c.ellipse(CX - 50, 236, 40, 16, -0.1, 0, Math.PI * 2);
    }, rgba(ICE.teal, 0.4), 10);
    softFill(g, (c) => {
      c.beginPath();
      c.ellipse(CX + 10, 100, 24, 34, 0, 0, Math.PI * 2);
    }, rgba(ICE.core, 0.35), 12);
    // the cold light from within, behind the rune
    softFill(g, (c) => {
      c.beginPath();
      c.ellipse(RUNE.x + RUNE.w * 0.4, RUNE.y + RUNE.h * 0.5, 24, 32, 0, 0, Math.PI * 2);
    }, rgba(ICE.glow, 0.22), 12);
    texture(g, 'speckle', box, 0.08, 1.2);
    // the carved planes, each lit or shaded as it faces, fading across itself so it reads as a plane in light
    for (const p of PLANES) {
      const [a, b] = [p.pts[0], p.pts[Math.floor(p.pts.length / 2)]];
      const col = p.tone > 0 ? mix(ICE.lit, '#ffffff', 0.3) : ICE.abyss;
      const gr = g.createLinearGradient(a[0], a[1], b[0], b[1]);
      gr.addColorStop(0, rgba(col, Math.abs(p.tone) * 1.1));
      gr.addColorStop(1, rgba(col, Math.abs(p.tone) * 0.55));
      poly(p.pts)(g);
      g.fillStyle = gr;
      g.fill();
    }
    // the toe box swells towards us: light on its near shoulder, the deep cold low down and under its far side
    softFill(g, (c) => {
      c.beginPath();
      c.ellipse(CX - 74, 222, 30, 16, -0.3, 0, Math.PI * 2);
    }, rgba(ICE.lit, 0.35), 10);
    softFill(g, (c) => {
      c.beginPath();
      c.ellipse(CX + 6, 262, 110, 14, 0, 0, Math.PI * 2);
    }, rgba(ICE.abyss, 0.45), 10);
    softFill(g, (c) => {
      c.beginPath();
      c.ellipse(CX + 84, 230, 26, 30, 0, 0, Math.PI * 2);
    }, rgba('#04102a', 0.35), 10);
    // the edges where the planes turn: a crisp line, bright or dark, with a soft bloom
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (const e of EDGES) {
      softStroke(g, line(e.pts), e.lit ? rgba('#ffffff', 0.35) : rgba(ICE.abyss, 0.4), 4, 2);
      g.beginPath();
      line(e.pts)(g);
      g.strokeStyle = e.lit ? rgba('#ffffff', 0.85) : rgba(ICE.abyss, 0.6);
      g.lineWidth = e.lit ? 1.4 : 1.2;
      g.stroke();
    }
    g.restore();
    // fracture sheets deep inside, and the cracks running off them
    fracture(g, [[CX - 96, 172], [CX - 56, 160], [CX - 52, 174], [CX - 90, 184]], 0.75, 211);
    fracture(g, [[CX + 50, 214], [CX + 92, 210], [CX + 94, 224], [CX + 56, 232]], 0.6, 223);
    fracture(g, [[CX + 14, 66], [CX + 34, 96], [CX + 28, 106], [CX + 8, 80]], 0.55, 227);
    const r = rng(hashStr('thrym-ice'));
    crackLine(g, crackWalk(r, CX - 36, 62, 1.5, 4, 8), 1, 0.6);
    crackLine(g, crackWalk(r, CX + 50, 160, 0.6, 4, 8), 0.9, 0.5);
    crackLine(g, crackWalk(r, CX - 96, 218, 0.3, 5, 8), 0.9, 0.55);
    // bubbles: a few trails rising through the toe, fine clusters low down where the ice is oldest
    for (const [x0, y0, n, drift] of [[CX - 6, 254, 7, 3], [CX + 30, 252, 5, -3]] as const) {
      let y = y0;
      for (let i = 0; i < n; i++) {
        const t = i / n;
        if (r() < 0.25) continue;
        bubble(g, x0 + Math.sin(i * 1.3) * 3 + drift * t + (r() - 0.5) * 5, y, (2.4 - t * 1.6) * (0.6 + r() * 0.7), 0.9, 1 + r() * 0.5);
        y -= 4 + i * 1.4 + r() * 4;
      }
    }
    for (let i = 0; i < 40; i++) bubble(g, CX - 104 + r() * 208, 230 + r() ** 0.6 * 28, 0.6 + r() * 1.5, 0.6, 1 + r() * 0.6);
    // the rune: a V-cut, its far wall in shadow, its near lip lit, cold light at the bottom of the groove; its light
    // seen again deeper in the ice, bent by it
    g.save();
    g.translate(5, 7);
    softStroke(g, runeStroke, rgba(ICE.glow, 0.2), 5, 3);
    g.restore();
    g.save();
    g.translate(LX * 1.8, LY * 1.8);
    softStroke(g, runeStroke, rgba(ICE.abyss, 0.5), 7, 1.4);
    g.restore();
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.translate(-LX * 2, -LY * 2);
    g.beginPath();
    runeStroke(g);
    g.strokeStyle = rgba('#ffffff', 0.55);
    g.lineWidth = 5;
    g.stroke();
    g.restore();
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    runeStroke(g);
    g.strokeStyle = mix(ICE.core, ICE.abyss, 0.3);
    g.lineWidth = 6;
    g.stroke();
    g.restore();
    hotLine(g, runeStroke, ICE.glow, 2.2, 0.75);
    // hoarfrost: thick under the fur where the cold pours out, on the toe's near shoulder, along the far side
    hoarfrost(g, { x: CX - 66, y: 54, w: 132, h: 26 }, r, 0.75, 241, 8, 0.05, 0.6);
    hoarfrost(g, { x: CX - 120, y: 200, w: 40, h: 56 }, r, 0.45, 243, 4, 0.2, 0.2);
    hoarfrost(g, { x: CX + 84, y: 150, w: 34, h: 100 }, r, 0.3, 245, 3, 0.2, 0.2);
    // glassy highlights following the form: down the shaft's lit strip, along the instep, on the toe's shoulder
    softStroke(g, line([[CX - 57, 72], [CX - 52, 132]]), rgba('#ffffff', 0.5), 5, 2.5);
    softStroke(g, line([[CX - 64, 160], [CX - 98, 182]]), rgba('#ffffff', 0.45), 5, 3);
    spec(g, CX - 80, 218, 14, 4.5, 0.85, -0.5);
    spec(g, CX + 110, 228, 2.6, 16, 0.5, -0.05, ICE.moon);
  });
  glint(g, CX - 88, 213, 5, 0.95);
}

function paintSole(g: Ctx, box: { x: number; y: number; w: number; h: number }): void {
  contact(g, (c) => {
    solePath(c);
    c.fill();
  }, 0.5, 1.6, 2.5, '#04102a');
  within(g, solePath, () => {
    // old glacier ice, pressed hard and dark
    const sg = g.createLinearGradient(0, 240, 0, 274);
    sg.addColorStop(0, mix(ICE.core, ICE.abyss, 0.35));
    sg.addColorStop(0.5, ICE.abyss);
    sg.addColorStop(1, '#06142a');
    g.fillStyle = sg;
    g.fillRect(box.x, 234, box.w, 44);
    const lg = g.createLinearGradient(CX - 126, 0, CX + 126, 0);
    lg.addColorStop(0, rgba(ICE.lit, 0.18));
    lg.addColorStop(0.4, rgba(ICE.lit, 0));
    lg.addColorStop(1, rgba('#000000', 0.25));
    g.fillStyle = lg;
    g.fillRect(box.x, 234, box.w, 44);
    // strata and grit frozen in
    const r = rng(hashStr('thrym-strata'));
    for (let k = 0; k < 2; k++) {
      const y0 = 266 + k * 2.5 + r() * 1;
      g.strokeStyle = k % 2 ? rgba(ICE.lit, 0.18) : rgba('#02060e', 0.4);
      g.lineWidth = 0.9;
      g.beginPath();
      for (let x = CX - 128; x <= CX + 128; x += 8) (x === CX - 128 ? g.moveTo(x, y0 + Math.sin(x * 0.06 + k) * 0.8) : g.lineTo(x, y0 + Math.sin(x * 0.06 + k) * 0.8));
      g.stroke();
    }
    for (let i = 0; i < 30; i++) {
      g.fillStyle = rgba('#1a2030', 0.3 + r() * 0.3);
      g.beginPath();
      g.arc(CX - 122 + r() * 244, 258 + r() * 14, 0.4 + r() * 0.7, 0, Math.PI * 2);
      g.fill();
    }
    // a crisp lit chamfer along its bottom edge, chips knocked out of it
    g.save();
    g.lineCap = 'round';
    g.strokeStyle = rgba(ICE.lit, 0.55);
    g.lineWidth = 1.1;
    g.beginPath();
    line([[CX - 110, 263], [CX - 92, 270], [CX - 50, 273], [CX + 50, 273], [CX + 92, 270], [CX + 110, 263]])(g);
    g.stroke();
    g.restore();
    for (const [x, y] of [[CX - 72, 273], [CX + 60, 273], [CX - 116, 256]] as const) {
      g.fillStyle = rgba(ICE.lit, 0.4);
      g.beginPath();
      g.moveTo(x - 4, y + 1);
      g.lineTo(x, y - 4);
      g.lineTo(x + 4, y + 1);
      g.closePath();
      g.fill();
    }
    // the welt: a bevel catching the light, crusted with frost
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    line(WELT)(g);
    g.strokeStyle = rgba('#ffffff', 0.75);
    g.lineWidth = 1.8;
    g.stroke();
    g.restore();
    hoarfrost(g, { x: CX - 122, y: 232, w: 244, h: 36 }, r, 0.55, 251, 6, 0.25, 0.45);
  });
}

function paintToeBand(g: Ctx): void {
  const bb = { x: CX - BAND_X - 4, y: 176, w: BAND_X * 2 + 8, h: 44 };
  contact(g, (c) => {
    bandPath(c);
    c.fill();
  }, 0.65, 2.6, 3.5, '#04102a');
  piece(g, bandPath, bb, 'iron', ICE.iron, { shadow: 0, size: 6, texA: 0.55 });
  within(g, bandPath, () => {
    // blued iron: cold blue where it catches the light, rust-black in the pits
    blotches(g, bb, '#2a1a14', 0.35, 4, 0.6, 0.15, 261, 'multiply');
    blotches(g, bb, '#6a8ab8', 0.25, 6, 0.55, 0.2, 263, 'screen');
    const run = (dy: number) => (c: Ctx) => {
      for (let x = CX - BAND_X; x <= CX + BAND_X; x += 5) (x === CX - BAND_X ? c.moveTo(x, bandTop(x) + dy) : c.lineTo(x, bandTop(x) + dy));
    };
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    run(1.4)(g);
    g.strokeStyle = rgba(ICE.moon, 0.75);
    g.lineWidth = 1.6;
    g.stroke();
    g.beginPath();
    run(BAND_H - 1.4)(g);
    g.strokeStyle = rgba('#03060c', 0.7);
    g.lineWidth = 1.8;
    g.stroke();
    g.restore();
    // runes cut along it, a thread of cold light in each
    [3, 0, 6, 1, 2, 5, 7].forEach((ri, i) => {
      const u = 0.14 + i * 0.12;
      const [x, y] = onBand(u);
      // squeezed towards the ends as the band turns away
      const w = 8 * Math.cos((u - 0.5) * 2.2);
      for (const [dx, dy, col, lw] of [[-LX * 0.8, -LY * 0.8, rgba(ICE.moon, 0.45), 1.6], [0, 0, rgba('#03060c', 0.85), 1.8], [0, 0, rgba(ICE.glow, 0.5), 0.7]] as const) {
        g.save();
        g.lineCap = 'round';
        g.lineJoin = 'round';
        g.translate(dx, dy);
        g.beginPath();
        runeGlyph(g, ri, x - w / 2, y - 5, w, 10);
        g.strokeStyle = col;
        g.lineWidth = lw;
        g.stroke();
        g.restore();
      }
    });
    // frost settled along its top
    for (let x = CX - BAND_X; x < CX + BAND_X; x += 12) blotches(g, { x, y: bandTop(x + 6) - 3, w: 12, h: 7 }, ICE.rime, 0.6, 2.6, 0.55, 0.1, 267 + x);
  });
  for (const u of [0.03, 0.97]) {
    const [x, y] = onBand(u);
    rivet(g, x, y, 3, '#7a8aa8');
  }
}

function paintRing(g: Ctx): void {
  const rb = { x: CX - RING_X - 4, y: 30, w: RING_X * 2 + 8, h: 22 };
  piece(g, ringPath, rb, 'iron', ICE.iron, { shadow: 0.6, size: 4, texA: 0.5 });
  within(g, ringPath, () => {
    blotches(g, rb, '#6a8ab8', 0.25, 5, 0.55, 0.2, 273, 'screen');
    g.save();
    g.beginPath();
    for (let x = CX - RING_X; x <= CX + RING_X; x += 4) (x === CX - RING_X ? g.moveTo(x, ringTop(x) + 1.4) : g.lineTo(x, ringTop(x) + 1.4));
    g.strokeStyle = rgba(ICE.moon, 0.7);
    g.lineWidth = 1.2;
    g.stroke();
    g.restore();
  });
  for (const dx of [-74, 74]) rivet(g, CX + dx, ringTop(CX + dx) + RING_H / 2, 2.2, '#7a8aa8');
}

function paintFur(g: Ctx, white: string): void {
  const fb = { x: CX - 96, y: 28, w: 192, h: 48 };
  piece(g, furPath, fb, 'plush', white, { shadow: 0.6, size: 10, texA: 0.25 });
  within(g, furPath, () => {
    const r = rng(hashStr('thrym-fur'));
    furCoat(g, r, fb, (x) => Math.PI / 2 + (x - CX) / 260, mix(white, '#c8d8e4', 0.35), '#3a4a6a', { n: 0.3, len: 12, w: 1.1 });
    // each lock combed into its point
    g.save();
    g.lineCap = 'round';
    for (const l of FUR_LOCKS) {
      const [tx, ty] = l.tip;
      // strands combed down into the clump, its underside in shadow
      for (let k = 0; k < 9; k++) {
        const sx = l.x1 + (l.x0 - l.x1) * (0.08 + k * 0.105);
        g.strokeStyle = rgba(k % 3 === 0 ? '#8a9ab8' : '#ffffff', 0.5);
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(sx, 46);
        g.quadraticCurveTo(sx, 58, tx + (sx - tx) * 0.55, ty - 2);
        g.stroke();
      }
      ao(g, tx + 2, ty - 2, (l.x0 - l.x1) * 0.5, 5, 0.45, 0, '#2a3a60');
    }
    g.restore();
    // the fur's underside in cool shadow where it hangs over the ice
    const ug = g.createLinearGradient(0, 52, 0, 76);
    ug.addColorStop(0, rgba('#3a4a70', 0));
    ug.addColorStop(1, rgba('#3a4a70', 0.5));
    g.fillStyle = ug;
    g.fillRect(fb.x, 52, fb.w, 26);
    // shadow under the circlet; the fur rolls round and catches the moon on its right
    ao(g, CX, 44, 84, 7, 0.5, 0, '#1a2440');
    const lg = g.createLinearGradient(CX - 90, 0, CX + 95, 0);
    lg.addColorStop(0, rgba('#ffffff', 0.15));
    lg.addColorStop(0.5, rgba('#ffffff', 0));
    lg.addColorStop(1, rgba('#2a3a60', 0.35));
    g.fillStyle = lg;
    g.fillRect(fb.x, fb.y, fb.w, fb.h);
  });
}

function drawThrym(ctx: Ctx, art: FootArt, _p: Pose, o: Opts): void {
  const white = art.secondary ?? '#eaf8ff';
  const box = { x: CX - 130, y: -10, w: 260, h: 290 };
  const crown = CROWN.map(crystalPath);
  const icicles = ICICLES.map(iciclePath);
  const iceParts = [bodyPath, solePath, ...icicles, ...crown];
  if (o.emissive) {
    glowOnly(ctx, [...iceParts, bandPath, ringPath], box, (g) => {
      // the rune breathing cold light, the crown glowing at its roots, the plate's runes, light along the fractures
      hotLine(g, runeStroke, ICE.glow, 4, 0.95);
      const cx = RUNE.x + RUNE.w * 0.4;
      const cy = RUNE.y + RUNE.h * 0.5;
      const gr = g.createRadialGradient(cx, cy, 4, cx, cy, 50);
      gr.addColorStop(0, rgba(ICE.glow, 0.35));
      gr.addColorStop(1, rgba(ICE.glow, 0));
      g.fillStyle = gr;
      g.fillRect(box.x, box.y, box.w, box.h);
      for (const cr of CROWN) {
        const [bx, by] = crystalBase(cr);
        const mid = onCrystal(cr, cr.len * 0.45, 0);
        softStroke(g, line([[bx, by], mid]), rgba(ICE.glow, 0.55), cr.w * 0.35, cr.w * 0.25);
      }
      for (let i = 0; i < 7; i++) {
        const [x, y] = onBand(0.14 + i * 0.12);
        softFill(g, (c) => {
          c.beginPath();
          c.ellipse(x, y, 5, 7, 0, 0, Math.PI * 2);
        }, rgba(ICE.glow, 0.4), 2);
      }
      softStroke(g, line([[CX - 96, 172], [CX - 56, 160]]), rgba(ICE.glow, 0.35), 2.5, 2);
      softStroke(g, line([[CX + 50, 214], [CX + 92, 210]]), rgba(ICE.glow, 0.3), 2.5, 2);
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
      // wet speculars: hard bright streaks on the lit planes
      spec(g, CX - 55, 100, 3, 24, 0.6, 0);
      spec(g, CX - 80, 174, 14, 3.5, 0.6, -0.5);
      spec(g, CX - 80, 220, 14, 3.5, 0.6, -0.5);
      const sg = g.createLinearGradient(CX - 125, 0, CX, 0);
      sg.addColorStop(0, rgba('#eaf8ff', 0.22));
      sg.addColorStop(1, rgba('#eaf8ff', 0));
      g.fillStyle = sg;
      g.fillRect(box.x, 40, box.w, 240);
      // meltwater running down in wavering rivulets from under the fur, a bead swelling at each one's end
      const r = rng(hashStr('thrym-melt'));
      for (let i = 0; i < 8; i++) {
        const x0 = CX - 56 + (i + r() * 0.6) * 14;
        const y0 = 64 + r() * 20;
        const len = 30 + r() * 60;
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
  const sil = new Sil(ctx, [...iceParts, bandPath, furPath, ringPath], box);
  const g = sil.g;
  paintBody(g, box);
  paintSole(g, box);
  ICICLES.forEach((ic, i) => {
    contact(g, (c) => {
      icicles[i](c);
      c.fill();
    }, 0.4, 1.5, 2, '#06142a');
    paintIcicle(g, ic);
  });
  paintToeBand(g);
  paintFur(g, white);
  paintRing(g);
  for (const cr of CROWN) paintCrystal(g, cr);
  // rime fusing the crystals' roots into the circlet
  {
    const r = rng(hashStr('thrym-roots'));
    for (const cr of CROWN) {
      const [bx, by] = crystalBase(cr);
      softFill(g, (c) => {
        c.beginPath();
        c.ellipse(bx, by - 1, cr.w * 0.6, 2.6, cr.a * 0.3, 0, Math.PI * 2);
      }, rgba(ICE.rime, 0.5), 1.1);
    }
    hoarfrost(g, { x: CX - 82, y: 28, w: 164, h: 12 }, r, 0.4, 271, 6, 0.3, 0.3);
  }
  // the one light over the whole silhouette: the far side into deep cold, frost on the lit edges, the moon's rim
  sil.edge(rgba('#04102a', 0.5), 18, LX * 10, LY * 10);
  sil.edge(rgba(ICE.rime, 0.55), 3.2, -LX * 2.4, -LY * 2.4);
  sil.edge(rgba(ICE.moon, 0.9), 2.4, LX * 3, LY * 3);
  sil.finish(inkOf('#163a6a'), { openTop: -5 });
  if (!o.live) paintChain(ctx);
}

registerStyle('thrym', {
  contactY: 274,
  halfWidth: 112,
  // (the leg runs down behind the crown to the fur)
  leg: { kind: 'thrymgreave', hw: 62, join: 'into', end: 50 },
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
