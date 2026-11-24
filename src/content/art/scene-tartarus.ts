// Tartarus (Stage 18, Act 9, waves 86–89), redrawn with the location kit (src/art/scene): the pit beneath the
// underworld. (Its second pass, raising the location kit's first pilot to the bar of the later scenes; the old art is
// kept in scenes-act9.ts for the before/after page.)
//
// We stand on the near bank of the Styx in a cavern of columnar basalt, a little above the water, and look across the
// black river to the far bank, where the palace-temple of the underworld's lord stands wedged in the cavern's mouth:
// black marble, a deep porch of six heavy Doric columns with bronze capitals, a pediment carved with the lord enthroned
// (a bident in one hand, a key in the other, his hound at his feet, winged attendants and the dead in procession to
// him from both corners), bronze doors half open with the firelight of the hall spilling out between them and down a
// long stair to the water. Bronze keepers on pedestals flank the stair's foot, fire held up in their bowls; the right
// one has lost its head. The temple is cracked and sinking: its right end has settled, the corner column has fallen
// (its drums lie on the steps), the entablature and the pediment's end have broken away over it, and the stair's
// lowest steps run down under the river. Behind and above it the abyss burns red to the horizon, spires of rock
// standing in its smoke.
//
// The cavern: walls of columnar basalt rising to a roof of hanging columns and stalactites, lit red from below by the
// pit; a lava fall pours out of a cave mouth in each wall into the Styx, steam boiling up where it hits the water.
// The Styx is black glass with a cold green-blue depth, the temple and the falls mirrored in it, faces of the dead
// drifting under its surface. On our bank: stepped clusters of basalt columns at either side, their tops lit; two
// broken columns bound in heavy bronze chains; Charon's jetty (weathered planks on piles, a lantern post with a cold
// green flame) and a path of flagstones to it; blue soul-fire in two bronze tripods; grey asphodel and bones in the
// ash. The table is an obsidian slab with a bronze key-pattern rim.
//
// The stage's four waves: 1, a dim smouldering underworld; 2, the pit brighter, more embers; 3, the first eruptions
// in the far abyss (a fountain of lava over the temple, a flash behind the spires); 4, the pit erupting: fountains
// in the distance, the sky glowing, ash falling thick, the Styx lit red.
//
// Live, the heroes:
// - the lava falls: painted at 10 phases (molten sheets folding over the lip, plates of crust riding down, gobbets
//   tearing off the foot), steam boiling up where they hit the water, splashes with physics;
// - Charon poling his ferry across behind the columns and the jetty (painted at 8 phases of his stroke), rings
//   spreading where his pole goes in, a wake behind him;
// - the soul-fires: painted at 10 phases, blue wisps rising off them; a stomp ducks them and they flare;
// - the dead drifting under the Styx, fading in and out.
// Stomps: grit and dust shaken from the stalactites (it plops into the river or bounces on the bank), a ripple run
// across the Styx from under the stomp, the soul-fires ducking, the dead scattering.

import Phaser from 'phaser';
import { type Air, type Ctx, type R, TY, W, airMix, calmLanes, castShadow, crevice, glowAt, groundShadow, haze, lightPool, polyPath, solid, vfill, vignetteAll, within } from '../../art/scene/kit';
import type { SceneSpec } from '../../art/scene/layers';
import { grain, tableFalloff, water } from '../../art/scene/materials';
import { crack, drift, lay, noiseMask, softly, streaks, surface } from '../../art/scene/paint';
import { cloud } from '../../art/scene/sky';
import { ZB, xAt, zFront } from '../../art/sceneKit';
import { hashStr, makeCanvas, mix, rgba, rng, shade } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { save } from '../../systems/save';
import { Loop, Parts, Rate, Spring, sheet } from '../../game/sceneAnim';
import { type KitLive, calm, flicker, lerp, registerKitScene, waveK } from '../../game/sceneLive';
import { fireFrame, smokeFrame } from './sceneBits';

type Pt = [number, number];
type Box = { x: number; y: number; w: number; h: number };
const P2 = Math.PI * 2;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (e0: number, e1: number, v: number) => {
  const t = clamp01((v - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
const boxOfPts = (pts: Pt[], pad = 4): Box => {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x = Math.min(...xs) - pad;
  const y = Math.min(...ys) - pad;
  return { x, y, w: Math.max(...xs) - x + pad, h: Math.max(...ys) - y + pad };
};

// ——— the view ———
//
// One perspective for the cavern: the water is level ground (Y = 0), our eye is one unit above it, the vanishing point
// at (960, HZ). A unit is about four metres: the temple's columns are five and a half metres tall, Charon is the
// height of a man. (The table has its own perspective, the game's.)

const F = 1210;
const HZ = 360;
export const sx = (X: number, z: number) => 960 + (F * X) / z;
export const sy = (Y: number, z: number) => HZ + (F * (1 - Y)) / z;
export const P = (X: number, Y: number, z: number): Pt => [sx(X, z), sy(Y, z)];
/** Screen px per unit at depth z. */
const pz = (z: number) => F / z;
/** The depth of the water (or level ground) at screen y. */
const zAtY = (y: number) => F / Math.max(1, y - HZ);

export const TA = {
  horizon: HZ,
  /** The Styx between its far and near shores (screen y, roughly). */
  river: { y0: 506, y1: 638 },
  /** The depth Charon's ferry crosses at. */
  ferryZ: 5.5,
  /** The lava falls: x, the lip they pour from, where they hit the water, their width at the lip. */
  falls: [
    { x: 586, top: 172, bot: 512, w: 15 },
    { x: 1336, top: 204, bot: 512, w: 13 },
  ],
  /** The soul-fire tripods (X, z) and the height of their bowls. */
  braziers: [
    [-0.86, 3.55],
    [0.86, 3.55],
  ] as Pt[],
  bowlY: 0.36,
  /** The broken columns in chains. */
  pillars: [
    { X: -2.05, z: 3.45, rad: 0.19, top: 1.58, seed: 3 },
    { X: 2.06, z: 3.5, rad: 0.18, top: 1.44, seed: 8 },
  ],
  /** Charon's jetty: half width, from the shore out to its end, the deck's height. */
  jetty: { hw: 0.3, z0: 4.05, z1: 5.15, deck: 0.075 },
  front: 1040,
};

/** The near shore and the far shore (the cliffs' feet, the far bank's lip and the stair's foot). */
export const nearEdge = (x: number) => 638 + Math.sin(x * 0.0041 + 1.2) * 4 + Math.sin(x * 0.013 + 0.4) * 2;
export const farEdge = (x: number) => 508 + Math.sin(x * 0.0063 + 0.7) * 3 + Math.sin(x * 0.019 + 2) * 1.6 + Math.max(0, 330 - Math.min(x, W - x)) * 0.14;

/** The abyss's air (smoke lit red from below) and the cavern's (cold and dark). */
const PIT: Air = { color: '#4a1a1c', far: 0.7 };
const CAVE: Air = { color: '#1c1424', far: 0.55 };
const BRZ = { lit: '#e8b46a', body: '#a8742e', shade: '#5a3a1c', deep: '#24140a', green: '#4a8a72' };
const SOUL = { deep: '#1640c8', body: '#3a98f0', core: '#9ad4ff' };

// ——— the cavern's mouth: the cliffs' inner edges ———

const EL: Pt[] = [[452, -10], [540, 60], [596, 110], [614, 170], [620, 258], [624, 320], [630, 380], [638, 440], [648, 500], [656, 540]];
const ER: Pt[] = [[1466, -10], [1380, 60], [1326, 110], [1308, 170], [1302, 258], [1298, 320], [1292, 380], [1284, 440], [1274, 500], [1266, 540]];
const ER_M = ER.map(([x, y]): Pt => [W - x, y]);
/** A cliff's inner edge (x) at screen y. */
const edgeX = (pts: Pt[], y: number): number => {
  if (y <= pts[0][1]) return pts[0][0];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    if (y <= y1) return x0 + ((x1 - x0) * (y - y0)) / (y1 - y0);
  }
  return pts[pts.length - 1][0];
};
/** Where a cliff's inner edge reaches screen x (its y), measured from the cliff's own side. */
const edgeY = (pts: Pt[], x: number, left: boolean): number => {
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const inside = left ? x <= x1 : x >= x1;
    if (inside) return x1 === x0 ? y1 : y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return 9999;
};
/** The cavern's roof: its lowest edge at screen x (between the cliffs). */
const ceilY = (x: number) => 52 + Math.sin(x * 0.0047 + 0.4) * 12 + Math.sin(x * 0.017) * 4 - Math.max(0, Math.abs(x - 954) - 380) * 0.12;

// ——— the abyss's spires (fixed, so the live layer's mask knows where they stand) ———

interface Spire {
  depth: number;
  x: number;
  base: number;
  tip: Pt;
  w: number;
  left: Pt[];
  right: Pt[];
}
const SPIRES: Spire[] = (() => {
  const r = rng(hashStr('ta:spires'));
  const out: Spire[] = [];
  const ranks: [number, number, number, number, number][] = [
    [0.94, 392, 26, 40, 120],
    [0.82, 404, 18, 70, 170],
    [0.68, 426, 11, 110, 230],
  ];
  for (const [depth, base, n, h0, h1] of ranks) {
    for (let i = 0; i < n; i++) {
      const x = 520 + ((i + 0.1 + r() * 0.8) / n) * 880;
      const side = clamp01((Math.abs(x - 960) - 120) / 320);
      const flank = Math.exp(-(((Math.abs(x - 960) - 190) / 90) ** 2));
      const h = (h0 + r() * (h1 - h0)) * (0.55 + 0.6 * side) + flank * (1 - depth) * 420;
      const w = (12 + r() * 16) * (1.4 - depth * 0.5) * (0.7 + h / 300);
      const lean = (r() - 0.5) * w * 0.8;
      const tip: Pt = [x + lean, base - h];
      const left: Pt[] = [[x - w, base]];
      const right: Pt[] = [[x + w, base]];
      for (const t of [0.22, 0.46, 0.68, 0.86]) {
        left.push([x - w * (1 - t) ** 1.1 + lean * t * t + (r() - 0.5) * w * 0.3, base - h * t + (r() - 0.5) * 6]);
        right.push([x + w * (1 - t) ** 1.2 + lean * t * t + (r() - 0.5) * w * 0.3, base - h * t + (r() - 0.5) * 6]);
      }
      out.push({ depth, x, base, tip, w, left, right });
    }
  }
  return out;
})();
/** The top of the spires at screen x. */
function spireTop(x: number): number {
  let y = 9999;
  for (const s of SPIRES) {
    const [tx, ty] = s.tip;
    if (x < s.x - s.w || x > s.x + s.w) continue;
    const t = x < tx ? (tx - x) / Math.max(1, tx - (s.x - s.w)) : (x - tx) / Math.max(1, s.x + s.w - tx);
    y = Math.min(y, ty + (s.base - ty) * t ** 0.8);
  }
  return y;
}

// ——— the abyss ———

/** The void over the pit, its smoke, the fire far below, the spires. e: 0 smouldering … 1 erupting. */
function abyss(ctx: Ctx, r: R, e = 0): void {
  const m = (a: string, b: string) => mix(a, b, e);
  vfill(ctx, 0, 0, W, 540, [
    [0, m('#050308', '#16060a')],
    [0.22, m('#0a0510', '#2a080c')],
    [0.44, m('#1c0a12', '#5a140e')],
    [0.58, m('#331014', '#8e2610')],
    [0.66, m('#4a1814', '#c4421a')],
    [0.7, m('#3e1612', '#a8341a')],
    [0.8, m('#22100f', '#5a1a10')],
    [1, m('#120810', '#2a0e0e')],
  ]);
  // the fire's light along the horizon: a long low band, broken by the smoke, not a hotspot
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [x, rad, a] of [[700, 360, 0.12], [1210, 380, 0.12], [960, 520, 0.08]] as const) glowAt(ctx, x, HZ + 4, rad, m('#c8401e', '#ff6a2a'), a + e * 0.22, 0.12);
  ctx.restore();
  // smoke banks rolling over the pit, lit from beneath: their undersides glow, their tops sink into the dark
  for (let i = 0; i < 8; i++) {
    const x = 380 + r() * 1160;
    const y = 120 + r() * 210;
    const low = clamp01((y - 120) / 210);
    cloud(ctx, r, x, y, 340 + r() * 380, 50 + r() * 40, {
      kind: 'bank', lit: mix(m('#6a2420', '#d8582a'), m('#a8402a', '#ff8a40'), low), body: m('#24101a', '#4a1414'), shadow: '#0c0610',
      sunX: 960, sunY: HZ + 300, rim: 0.12 + low * 0.18 + e * 0.2, wisp: 0.55, a: 0.32 + low * 0.24 + e * 0.15, res: 0.4,
    });
  }
  if (e > 0) {
    // the eruption's plumes: columns of smoke boiling up out of the pit, lit from their roots
    for (const [px, top] of [[742, 40], [1190, 70], [972, 10]] as const) {
      for (let k = 0; k < 6; k++) {
        const t = k / 5;
        const y = HZ - 10 - t * (HZ - 10 - top);
        cloud(ctx, r, px + Math.sin(k * 1.7) * 30 + t * 40, y, 150 + t * 220, 70 + t * 60, {
          kind: 'cumulus', lit: mix('#ffb060', '#c04a24', t), body: mix('#7a2a18', '#2a0e10', t), shadow: '#140808',
          sunX: px, sunY: HZ + 120, rim: 0.5 * (1 - t), wisp: 0.5, a: 0.75 - t * 0.35, res: 0.35,
        });
      }
    }
  }
  // the fire far below the far bank's lip: rivers of lava on the pit's floor, glimpsed through the smoke
  const fr = rng(hashStr('ta:floor'));
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const t = fr() ** 1.4;
    let y = HZ + 6 + t * 70;
    let x = 520 + fr() * 880;
    ctx.strokeStyle = rgba(m('#ff7a2a', '#ffc060'), (0.25 + fr() * 0.25) * (1 - t * 0.5) + e * 0.25);
    ctx.lineWidth = 0.8 + t * 1.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 5; k++) ctx.lineTo((x += (12 + fr() * 30) * (0.5 + t)), (y += (fr() - 0.4) * 3 * (0.5 + t)));
    ctx.stroke();
  }
  ctx.restore();
  haze(ctx, HZ - 10, HZ + 70, m('#7a2a1e', '#d0502a'), 0.45, 0.35);
  // the spires: three ranks, the farthest lost in the smoke; backlit by the fire behind them (a hot rim on each
  // edge), their roots lit from below, their tips going dark
  for (const depth of [0.94, 0.82, 0.68]) {
    const body = airMix(m('#120a10', '#1e0c0c'), depth, PIT);
    const glow = airMix(m('#5a1c16', '#a8361a'), depth, PIT);
    for (const s of SPIRES.filter((q) => q.depth === depth)) {
      const pts: Pt[] = [...s.left, s.tip, ...[...s.right].reverse()];
      const path = polyPath(pts);
      ctx.fillStyle = body;
      path(ctx);
      ctx.fill();
      within(ctx, path, () => {
        const top = s.tip[1];
        vfill(ctx, s.x - s.w - 4, top, s.w * 2 + 8, s.base - top, [[0, rgba(glow, 0)], [0.55, rgba(glow, 0.25)], [1, rgba(glow, 0.85)]]);
        // a facet down the side towards the falls' light, and the cracks between its columns
        const side = s.x < 960 ? -1 : 1;
        ctx.fillStyle = rgba(airMix('#8a3a28', depth, PIT), 0.22 + e * 0.15);
        ctx.beginPath();
        ctx.moveTo(s.tip[0], s.tip[1]);
        for (const p of side < 0 ? s.left : s.right) ctx.lineTo(p[0], p[1]);
        ctx.lineTo(s.x + side * s.w * 0.1, s.base);
        ctx.lineTo(s.tip[0] + side * 2, s.tip[1] + 30);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = rgba('#000000', 0.25);
        ctx.lineWidth = 1;
        for (let k = 0; k < 2; k++) {
          const cx = s.x + (r() - 0.5) * s.w;
          ctx.beginPath();
          ctx.moveTo(cx, s.base);
          ctx.lineTo(cx + (s.tip[0] - cx) * 0.6, s.base - (s.base - top) * (0.4 + r() * 0.3));
          ctx.stroke();
        }
      });
      // the hot rim where the fire behind catches its edges
      ctx.strokeStyle = rgba(m('#e0602a', '#ffa050'), (0.5 - depth * 0.3) + e * 0.25);
      ctx.lineWidth = 1.4 - depth * 0.6;
      ctx.beginPath();
      [...s.left, s.tip, ...[...s.right].reverse()].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    }
    // smoke drifting through each rank's roots
    haze(ctx, 300 + (1 - depth) * 140, 450, m('#4a1a18', '#a03a20'), 0.32 * depth + e * 0.1, 0.7, 480, 1440);
  }
  // the smoke over the whole pit, thickest low down: between us and the spires
  haze(ctx, 220, 460, m('#3a141a', '#8a2a1a'), 0.22, 0.75, 400, 1520);
}

// ——— the cavern: cliffs of columnar basalt, the roof, stalactites ———

/** One column of a cliff's colonnade (in the left cliff's frame: the right cliff is the same, mirrored). */
interface CCol {
  x0: number;
  x1: number;
  top: number;
  bot: number;
  lf: number;
  rf: number;
  tone: number;
}
/** Where a cliff's colonnade meets the mass of thin crooked columns over it. */
const seamY = (x: number, right: boolean) => 252 + Math.sin(x * 0.011 + (right ? 2 : 0)) * 24 + Math.sin(x * 0.04) * 7;
/** The cliffs' columns (fixed: the eruption's sky is cut round them). */
const CLIFF: Record<'l' | 'r', { cols: CCol[]; upper: Pt[] }> = (() => {
  const build = (right: boolean) => {
    const r = rng(hashStr('ta:cliff' + (right ? 'r' : 'l')));
    const pts = right ? ER_M : EL;
    const footY = (x: number) => farEdge(right ? W - x : x) + 3;
    const xEnd = pts[pts.length - 1][0];
    const cols: CCol[] = [];
    let x = -14;
    let prevTop = 0;
    while (x < xEnd + 6) {
      const far = clamp01(x / 640);
      const w = (46 - far * 22) * (0.8 + r() * 0.4);
      const x0 = x;
      const x1 = x + w;
      x = x1;
      const xm = (x0 + x1) / 2;
      const seam = seamY(xm, right);
      const edge = edgeY(pts, xm, true);
      const under = edge < seam - 2;
      let top = under ? seam - 3 - r() * 8 : edge + (r() - 0.35) * 46;
      // (free-standing neighbours step: never two at one height)
      if (!under && cols.length && Math.abs(top - prevTop) < 6) top += 8;
      prevTop = top;
      const bot = footY(xm);
      if (top >= bot - 10) continue;
      cols.push({ x0, x1, top, bot, lf: 0.18 + r() * 0.1, rf: 0.24 + r() * 0.1, tone: r() });
    }
    // the mass over the colonnade: its inner edge broken into the ends of thin crooked columns
    const upper: Pt[] = [[-20, -20]];
    let y = -20;
    while (y < 300) {
      const ex = edgeX(pts, y);
      if (y > seamY(ex, right) - 6) break;
      upper.push([ex + (r() - 0.6) * 18, y]);
      upper.push([ex + (r() - 0.4) * 10, y + 7 + r() * 8]);
      y += 14 + r() * 10;
    }
    const ex = upper[upper.length - 1][0];
    for (let xx = ex; xx >= -20; xx -= 12) upper.push([xx, seamY(xx, right) + (r() - 0.5) * 8]);
    return { cols, upper };
  };
  return { l: build(false), r: build(true) };
})();

/** A cliff of columnar basalt: the regular lower colonnade, each column a hexagonal prism showing three faces (the one
 * turned to the pit lit red), cut across by its joints, the inner ones broken off lower and stepping down towards
 * the pit (their tops showing once they're below our eye); over it, a mass of thin crooked columns fanning up into
 * the roof. Painted for the left cliff; the right one is the same, mirrored. */
function cliff(ctx: Ctx, r: R, right: boolean): void {
  const { cols, upper } = CLIFF[right ? 'r' : 'l'];
  const xEnd = (right ? ER_M : EL)[EL.length - 1][0];
  const all = (c: Ctx) => {
    c.beginPath();
    upper.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
    for (const q of cols) c.rect(q.x0, q.top - 8, q.x1 - q.x0, q.bot - q.top + 8);
  };
  ctx.save();
  if (right) {
    ctx.translate(W, 0);
    ctx.scale(-1, 1);
  }
  // the upper mass: thin crooked columns, fanning
  const up = polyPath(upper);
  ctx.fillStyle = '#140e16';
  up(ctx);
  ctx.fill();
  within(ctx, up, () => {
    ctx.lineCap = 'round';
    for (let x = -14; x < xEnd; x += 5 + r() * 6) {
      const s = seamY(x, right);
      const fan = (x - 260) * 0.0012 + (r() - 0.5) * 0.1;
      const len = 18 + r() * 40;
      const y0 = s + 6 - r() * 200;
      const lit = r() < 0.45;
      ctx.strokeStyle = lit ? rgba(mix('#2c2430', '#4a2220', clamp01(x / 600)), 0.45) : 'rgba(6,4,8,0.5)';
      ctx.lineWidth = 2 + r() * 4;
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x + Math.sin(fan) * len, y0 - Math.cos(fan) * len);
      ctx.stroke();
    }
    lay(ctx, drift('#3a2e38', '#06040a', 4, right ? 31 : 13, 64, 64), { x: -20, y: -20, w: xEnd + 40, h: 340 }, 0.45);
    // its broken edge towards the pit, lit
    const g = ctx.createLinearGradient(xEnd - 120, 0, xEnd - 20, 0);
    g.addColorStop(0, 'rgba(255,80,36,0)');
    g.addColorStop(1, 'rgba(255,80,36,0.28)');
    ctx.fillStyle = g;
    ctx.fillRect(-20, -20, xEnd + 40, 340);
  });
  ctx.strokeStyle = 'rgba(255,110,50,0.3)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (const [x, y] of upper.slice(1)) {
    if (y > seamY(x, right) - 10) break;
    ctx.lineTo(x, y);
  }
  ctx.stroke();
  // the colonnade
  const dy = (y: number) => (y - HZ) * 0.03;
  for (const q of cols) {
    const w = q.x1 - q.x0;
    const heat = clamp01((q.x0 - 160) / 480);
    const xa = q.x0 + w * q.lf;
    const xb = q.x1 - w * q.rf;
    const { top, bot } = q;
    const td = dy(top);
    const faces: [number, number, string, number][] = [
      [q.x0, xa, mix('#0a080c', '#22090c', heat * 0.5), 0],
      [xa, xb, mix(mix('#221c26', '#2c2430', q.tone), '#3a1a1e', heat * 0.55), 1],
      [xb, q.x1, mix('#3a3242', '#a83a22', 0.15 + heat * 0.7), 2],
    ];
    for (const [fa, fb, col, f] of faces) {
      const g = ctx.createLinearGradient(0, top, 0, bot);
      g.addColorStop(0, shade(col, -0.25));
      g.addColorStop(0.45, col);
      g.addColorStop(1, mix(col, '#6a2216', 0.2 + heat * 0.25));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(fa, top + (f === 0 ? 0 : td));
      ctx.lineTo(fb, top + (f === 2 ? 0 : td));
      ctx.lineTo(fb, bot);
      ctx.lineTo(fa, bot);
      ctx.closePath();
      ctx.fill();
    }
    // the arris between its front and its lit face catches the light
    ctx.fillStyle = rgba(mix('#8a7a90', '#ff8a50', heat), 0.18 + heat * 0.2);
    ctx.fillRect(xb - 0.5, top + td, 1.4, bot - top - td);
    if (top > HZ) {
      // below our eye its top shows: a flattened hexagon, lit by the glowing smoke over the cavern
      const hh = Math.max(2.5, (top - HZ) * 0.045 * (w / 30));
      ctx.fillStyle = mix('#5a4652', '#b0502e', heat * 0.65);
      ctx.beginPath();
      ctx.moveTo(q.x0, top);
      ctx.lineTo(xa, top - hh);
      ctx.lineTo(xb, top - hh);
      ctx.lineTo(q.x1, top);
      ctx.lineTo(xb, top + td);
      ctx.lineTo(xa, top + td);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(4,2,6,0.7)';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      // above it: a broken end, its edge hot against the abyss where it stands clear of the cliff
      ctx.strokeStyle = rgba('#ff7a3a', 0.1 + heat * 0.45);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(q.x0, top);
      ctx.lineTo(xa, top + td);
      ctx.lineTo(xb, top + td);
      ctx.lineTo(q.x1, top);
      ctx.stroke();
    }
    // the joints across it, each a shallow chevron, its lower lip lit
    for (let y = top + 14 + r() * 40; y < bot - 8; y += 24 + r() * 56) {
      const d = dy(y);
      ctx.strokeStyle = 'rgba(4,2,8,0.65)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(q.x0, y);
      ctx.lineTo(xa, y + d);
      ctx.lineTo(xb, y + d);
      ctx.lineTo(q.x1, y);
      ctx.stroke();
      ctx.strokeStyle = rgba(mix('#8a7a90', '#ff7a4a', heat), 0.14 + heat * 0.08);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(xa, y + d + 2);
      ctx.lineTo(xb, y + d + 2);
      ctx.lineTo(q.x1, y + 2);
      ctx.stroke();
    }
    // the crevice down its side
    ctx.fillStyle = 'rgba(2,1,4,0.75)';
    ctx.fillRect(q.x0 - 1, top, 2.4, bot - top);
  }
  within(ctx, all, () => {
    grain(ctx, { x: -20, y: -20, w: xEnd + 40, h: 600 }, 'stone', 0.26, 1.4);
    // stains run down from the joints, soot, the pit's red rising up it and strongest at its inner end
    lay(ctx, noiseMask(5, right ? 77 : 71, { cover: 0.4, soft: 0.4, col: '#05030a', w: 48, h: 64 }), { x: -20, y: 0, w: xEnd + 40, h: 580 }, 0.4);
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(xEnd, 0, xEnd - 480, 0);
    g.addColorStop(0, 'rgba(255,80,36,0.22)');
    g.addColorStop(0.5, 'rgba(255,70,30,0.06)');
    g.addColorStop(1, 'rgba(255,70,30,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-20, 0, xEnd + 40, 580);
    const g2 = ctx.createLinearGradient(0, 560, 0, 380);
    g2.addColorStop(0, 'rgba(255,90,40,0.16)');
    g2.addColorStop(1, 'rgba(255,90,40,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(-20, 380, xEnd + 40, 200);
    ctx.globalCompositeOperation = 'source-over';
    // the roof's darkness coming down over its top, and its near end lost in the cavern's gloom
    vfill(ctx, -20, -20, xEnd + 40, 240, [[0, 'rgba(4,2,8,0.85)'], [1, 'rgba(4,2,8,0)']]);
    const n = ctx.createLinearGradient(0, 0, 340, 0);
    n.addColorStop(0, 'rgba(4,2,8,0.65)');
    n.addColorStop(1, 'rgba(4,2,8,0)');
    ctx.fillStyle = n;
    ctx.fillRect(-20, 0, 360, 600);
  });
  ctx.restore();
}

interface RoofEnd {
  x: number;
  w: number;
  y: number;
  back: number;
  /** A stalactite off its end: where, how long, how wide, its bend. */
  drip?: [number, number, number, number];
}
const ROOF_X0 = 360;
const ROOF_X1 = 1560;
/** The roof's hanging columns (fixed: the eruption's sky is cut round them) in two ranks, the farther shorter, the
 * nearer hanging lower in clusters (a run of long ones, a gap); now and then a stalactite off one's end. */
const ROOF: RoofEnd[] = (() => {
  const r = rng(hashStr('ta:roof'));
  const out: RoofEnd[] = [];
  for (const back of [1, 0]) {
    for (let x = ROOF_X0 + back * 9; x < ROOF_X1; ) {
      const w = 13 + r() * 20;
      const cl = Math.sin(x * 0.011 + back * 2) * 0.5 + Math.sin(x * 0.029 + 1) * 0.3 + 0.5;
      const len = back ? 4 + r() * 16 : Math.max(0, cl * 44 + (r() - 0.4) * 30);
      const y = ceilY(x + w / 2) - 14 + len;
      if (len > 2 || back) {
        const e: RoofEnd = { x, w, y, back };
        if (!back && r() < 0.45) {
          const near = 1 - Math.min(1, Math.abs(x + w / 2 - 960) / 620);
          e.drip = [x + w * (0.3 + r() * 0.4), 14 + r() * 40 * (0.5 + near * 0.5), Math.min(w * 0.5, 6 + r() * 8), (r() - 0.5) * 5];
        }
        out.push(e);
      }
      x += w * (back ? 1 : 1 + (r() < 0.2 ? 0.8 : 0));
    }
  }
  // draw the farther rank first, then the shorter ends before the longer
  return out.sort((a, b) => b.back - a.back || a.y - b.y);
})();
/** How far the underside of a hanging column shows (px). */
const roofHH = (e: RoofEnd) => Math.max(3, (HZ - e.y) * 0.025 * (e.w / 24));
/** The stalactites' tips (for the grit the live layer shakes off them). */
const STALACTITES: Pt[] = ROOF.filter((e) => e.drip).map((e) => {
  const [dx, len, , bend] = e.drip!;
  return [dx + bend, e.y + roofHH(e) * 0.6 + len];
});

/** The roof: hanging columns broken off at their own lengths (we see their undersides, lit red from the pit below,
 * brightest over the middle), stalactites dripping from them. */
function roof(ctx: Ctx): void {
  ctx.fillStyle = '#0a070c';
  ctx.beginPath();
  ctx.moveTo(ROOF_X0, -10);
  for (let x = ROOF_X0; x <= ROOF_X1; x += 10) ctx.lineTo(x, ceilY(x) - 12);
  ctx.lineTo(ROOF_X1, -10);
  ctx.closePath();
  ctx.fill();
  for (const e of ROOF) {
    const { x, w, y, back, drip } = e;
    const near = (1 - Math.min(1, Math.abs(x + w / 2 - 960) / 620)) * (back ? 0.5 : 1);
    const xa = x + w * 0.22;
    const xb = x + w * 0.74;
    const hh = roofHH(e);
    // its three faces, dark, the red from below creeping up them
    for (const [fa, fb, col] of [[x, xa, '#0c080c'], [xa, xb, '#1c1218'], [xb, x + w, '#2a1418']] as const) {
      const g = ctx.createLinearGradient(0, y - 60, 0, y);
      g.addColorStop(0, col);
      g.addColorStop(1, mix(col, '#5a2016', 0.15 + near * 0.3));
      ctx.fillStyle = g;
      ctx.fillRect(fa, -10, fb - fa, y + 10);
    }
    ctx.fillStyle = 'rgba(2,1,4,0.7)';
    ctx.fillRect(x - 0.5, -10, 1.6, y + 10);
    // its underside: a flattened hexagon, glowing with the pit's light
    ctx.fillStyle = mix('#24100f', '#8a3420', 0.15 + near * 0.5);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(xa, y + hh);
    ctx.lineTo(xb, y + hh);
    ctx.lineTo(x + w, y);
    ctx.lineTo(xb, y - hh * 0.5);
    ctx.lineTo(xa, y - hh * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(4,2,6,0.7)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // a stalactite off its end
    if (drip) {
      const [sx2, len, sw, bend] = drip;
      const y0 = y + hh * 0.6;
      const path = (c: Ctx) => {
        c.beginPath();
        c.moveTo(sx2 - sw / 2, y0);
        c.bezierCurveTo(sx2 - sw * 0.42, y0 + len * 0.45, sx2 - sw * 0.12 + bend, y0 + len * 0.8, sx2 + bend, y0 + len);
        c.bezierCurveTo(sx2 + sw * 0.14 + bend, y0 + len * 0.78, sx2 + sw * 0.4, y0 + len * 0.42, sx2 + sw / 2, y0);
        c.closePath();
      };
      ctx.fillStyle = '#1a1018';
      path(ctx);
      ctx.fill();
      within(ctx, path, () => {
        const g = ctx.createLinearGradient(sx2 - sw / 2, 0, sx2 + sw / 2, 0);
        g.addColorStop(0, 'rgba(0,0,0,0.3)');
        g.addColorStop(0.7, 'rgba(160,60,40,0.3)');
        g.addColorStop(1, 'rgba(200,80,50,0.45)');
        ctx.fillStyle = g;
        ctx.fillRect(sx2 - sw, y0, sw * 2, len);
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 1;
        for (let k = 1; k < 4; k++) {
          const yy = y0 + (len * k) / 4;
          ctx.beginPath();
          ctx.moveTo(sx2 - sw, yy);
          ctx.quadraticCurveTo(sx2, yy + 2, sx2 + sw, yy);
          ctx.stroke();
        }
      });
      ctx.fillStyle = rgba('#ffb070', 0.5);
      ctx.beginPath();
      ctx.arc(sx2 + bend, y0 + len - 1, 1.1, 0, P2);
      ctx.fill();
    }
  }
}

/** The roof's silhouette (added to the current path): its mass and every hanging end and stalactite. */
function roofSil(ctx: Ctx): void {
  ctx.moveTo(ROOF_X0, -20);
  for (let x = ROOF_X0; x <= ROOF_X1; x += 10) ctx.lineTo(x, ceilY(x) - 10);
  ctx.lineTo(ROOF_X1, -20);
  ctx.closePath();
  for (const e of ROOF) {
    ctx.rect(e.x - 0.5, -20, e.w + 1, e.y + 26);
    if (e.drip) {
      const [dx, len, sw] = e.drip;
      ctx.rect(dx - sw / 2 - 1, e.y, sw + 2, len + 12);
    }
  }
}

/** The cave mouth a lava fall pours from, broken into the columns: dark inside, the rock round it reddened by the
 * heat, a tongue of lava welling over its lip; and the fall's light on the cliff round it. */
function fallMouths(ctx: Ctx, r: R): void {
  for (const f of TA.falls) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    lightPool(ctx, f.x, (f.top + f.bot) / 2 + 40, 120, 240, '#ff5a1a', 0.26);
    lightPool(ctx, f.x, f.bot - 20, 160, 60, '#ff8a3a', 0.3);
    glowAt(ctx, f.x, f.top - 4, 70, '#ff6a2a', 0.3, 0.8);
    ctx.restore();
    const mw = f.w * 1.9;
    // where it comes out: a low dark notch broken into the columns, its lip running with lava
    const hole = (c: Ctx) => {
      c.beginPath();
      c.moveTo(f.x - mw * 0.9, f.top + 7);
      c.lineTo(f.x - mw * 0.55, f.top - 2);
      c.lineTo(f.x - mw * 0.1, f.top - 4);
      c.lineTo(f.x + mw * 0.4, f.top - 1);
      c.lineTo(f.x + mw * 0.85, f.top + 6);
      c.closePath();
    };
    ctx.fillStyle = '#1c0604';
    hole(ctx);
    ctx.fill();
    within(ctx, hole, () => vfill(ctx, f.x - mw, f.top - 5, mw * 2, 14, [[0, 'rgba(20,4,4,1)'], [1, 'rgba(200,80,26,1)']]));
    // the lava welling over the lip, lumpy, its crust cracking
    const lip = (c: Ctx) => {
      c.beginPath();
      c.moveTo(f.x - mw * 0.75, f.top + 7);
      c.quadraticCurveTo(f.x - mw * 0.3, f.top + 4, f.x + 2, f.top + 5);
      c.quadraticCurveTo(f.x + mw * 0.4, f.top + 3, f.x + mw * 0.65, f.top + 7);
      c.quadraticCurveTo(f.x, f.top + 11, f.x - mw * 0.75, f.top + 7);
      c.closePath();
    };
    ctx.fillStyle = '#e8701e';
    lip(ctx);
    ctx.fill();
    within(ctx, lip, () => {
      ctx.fillStyle = 'rgba(80,16,6,0.6)';
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.ellipse(f.x + (r() - 0.5) * mw * 1.2, f.top + 3 + r() * 6, 3 + r() * 5, 1.4 + r() * 1.5, (r() - 0.5) * 0.6, 0, P2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,230,160,0.7)';
      ctx.fillRect(f.x - mw * 0.4, f.top + 6, mw * 0.8, 1.5);
    });
  }
}

function cavern(ctx: Ctx, r: R): void {
  cliff(ctx, r, false);
  cliff(ctx, r, true);
  roof(ctx);
  fallMouths(ctx, r);
}

// ——— the lava falls ———

const FALL = { w: 96, h: 352 };
/**
 * One frame (phase ph of a seamless loop) of a lava fall, the lip at (w/2, 6), the water at the bottom: a ribbon of
 * molten rock folding over the lip and falling, widening; plates of dark crust riding down it, faster as they fall;
 * bright ropes in it; at its foot it tears into gobbets and throws up a splash.
 */
function fallFrame(c: Ctx, ph: number, w = FALL.w, h = FALL.h, seed = 1): void {
  const sr = rng(hashStr('ta:fall' + seed));
  const cx = w / 2;
  const top = 6;
  const bot = h - 14;
  const L = bot - top;
  const N = 36;
  // (it leaves the lip narrow and hot, spreads and thins as it falls, and splits low down into two sheets)
  const half = (t: number) => w * 0.12 * (0.7 + t * 0.95);
  const wob = (t: number, k: number) => Math.sin(P2 * (t * 3 - ph) + k) * 1.1 * (0.3 + t) + Math.sin(P2 * (t * 8 - ph * 2) + k * 2) * 0.5;
  const cxAt = (t: number) => cx + Math.sin(t * Math.PI * 0.9) * 4 + Math.sin(P2 * (t * 2 - ph) + seed) * 1.2 * t;
  const edgeL = (t: number) => cxAt(t) - half(t) + wob(t, 0);
  const edgeR = (t: number) => cxAt(t) + half(t) + wob(t, 3);
  const ribbon = (c2: Ctx, k = 1) => {
    c2.beginPath();
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      c2.lineTo(cxAt(t) + (edgeL(t) - cxAt(t)) * k, top + t * L);
    }
    for (let i = N; i >= 0; i--) {
      const t = i / N;
      c2.lineTo(cxAt(t) + (edgeR(t) - cxAt(t)) * k, top + t * L);
    }
    c2.closePath();
  };
  // its heat on the air either side
  c.save();
  c.globalCompositeOperation = 'lighter';
  const hg = c.createLinearGradient(0, 0, w, 0);
  hg.addColorStop(0, 'rgba(255,80,24,0)');
  hg.addColorStop(0.5, 'rgba(255,80,24,0.2)');
  hg.addColorStop(1, 'rgba(255,80,24,0)');
  c.fillStyle = hg;
  c.fillRect(0, top, w, L);
  c.restore();
  // the sheet: crusted dark red at its edges, orange, a hot broken core
  ribbon(c);
  c.fillStyle = '#9a2a0a';
  c.fill();
  c.save();
  ribbon(c);
  c.clip();
  for (let i = 0; i < N; i++) {
    const t = i / N;
    const y = top + t * L;
    const g = c.createLinearGradient(edgeL(t), 0, edgeR(t), 0);
    const cool = t * 0.5;
    g.addColorStop(0, '#5a1206');
    g.addColorStop(0.2, mix('#d8461a', '#a8300c', cool));
    g.addColorStop(0.42, mix('#ff9a2c', '#e8701c', cool));
    g.addColorStop(0.5, mix('#ffb448', '#f88a28', cool));
    g.addColorStop(0.62, mix('#ff9a30', '#e0601a', cool));
    g.addColorStop(0.85, mix('#c03a10', '#8a2208', cool));
    g.addColorStop(1, '#4a0e04');
    c.fillStyle = g;
    c.fillRect(0, y - 0.5, w, L / N + 1.2);
  }
  // the folds: long bright ropes and dark troughs, twisting as they come down
  c.lineCap = 'round';
  for (let k = 0; k < 9; k++) {
    const off = ((k + 0.5) / 9 - 0.5) * 1.5 + (sr() - 0.5) * 0.15;
    const hot = Math.abs(off) < 0.45 ? sr() < 0.7 : sr() < 0.25;
    c.strokeStyle = hot ? `rgba(255,232,160,${0.25 + sr() * 0.25})` : `rgba(90,14,4,${0.3 + sr() * 0.25})`;
    c.lineWidth = hot ? 0.8 + sr() * 1.2 : 1.2 + sr() * 1.8;
    c.beginPath();
    const t0 = sr() * 0.4;
    const t1 = t0 + 0.4 + sr() * 0.6;
    for (let i = Math.round(t0 * N); i <= Math.min(N, Math.round(t1 * N)); i++) {
      const t = i / N;
      c.lineTo(cxAt(t) + off * half(t) * 0.6 + Math.sin(P2 * (t * 1.2 - ph) + k * 2.1) * half(t) * 0.06, top + t * L);
    }
    c.stroke();
  }
  // skins of crust stretched into long dark streaks by the fall, riding down faster as they go, the hot rock
  // showing through where they tear
  for (let k = 0; k < 16; k++) {
    const u = (k / 16 + ph * (0.9 + (k % 3) * 0.1) + sr() * 0.3) % 1;
    const t = u ** 1.25;
    const len = (14 + sr() * 30) * (0.4 + t * 1.4);
    const off = (sr() - 0.5) * 1.5;
    const a = smooth(0, 0.08, t) * (1 - smooth(0.82, 1, t)) * (0.35 + sr() * 0.35);
    const x = cxAt(t) + off * half(t) * 0.7;
    const y = top + t * L;
    c.strokeStyle = rgba(sr() < 0.6 ? '#3a0c04' : '#6a1808', a);
    c.lineWidth = 1.5 + sr() * 3 * (0.5 + t);
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + Math.sin(P2 * (t * 1.5 - ph) + k) * 1.5, y + len);
    c.stroke();
  }
  c.restore();
  // the pour over the lip: a bulge of the hottest rock
  c.fillStyle = 'rgba(255,190,100,0.55)';
  c.beginPath();
  c.ellipse(cxAt(0) + 1, top + 4, half(0) * 1.05, 4, 0, 0, P2);
  c.fill();
  // its foot: gobbets tearing off the edges, and the splash thrown up where it hits the water
  for (let k = 0; k < 8; k++) {
    const u = (k / 8 + ph * 2) % 1;
    const side = k % 2 ? 1 : -1;
    const x = cxAt(1) + side * (half(1) * (0.7 + u * 1.5)) + (sr() - 0.5) * 4;
    const y = bot - 34 + u * 34 - Math.sin(u * Math.PI) * 12;
    const rr = (2 + sr() * 1.5) * (1 - u * 0.6);
    c.fillStyle = rgba(u < 0.4 ? '#ffc060' : '#e8501a', 0.9 * (1 - u * 0.7));
    c.beginPath();
    c.ellipse(x, y, rr, rr * 1.5, side * 0.4, 0, P2);
    c.fill();
  }
  const sp = 0.5 + 0.5 * Math.sin(P2 * ph * 2);
  c.save();
  c.globalCompositeOperation = 'lighter';
  const sg = c.createRadialGradient(cxAt(1), bot, 1, cxAt(1), bot, half(1) * 3.4);
  sg.addColorStop(0, 'rgba(255,200,110,0.75)');
  sg.addColorStop(0.4, 'rgba(255,110,40,0.3)');
  sg.addColorStop(1, 'rgba(255,80,20,0)');
  c.fillStyle = sg;
  c.beginPath();
  c.ellipse(cxAt(1), bot, half(1) * 3.4, half(1) * 1.2, 0, 0, P2);
  c.fill();
  c.restore();
  for (let k = 0; k < 9; k++) {
    const a = Math.PI + ((k + 0.5) / 9) * Math.PI;
    const rr = half(1) * (1.1 + sp * 0.7 + (k % 3) * 0.15);
    c.fillStyle = k % 2 ? 'rgba(255,190,90,0.85)' : 'rgba(255,120,40,0.8)';
    c.beginPath();
    c.ellipse(cxAt(1) + Math.cos(a) * rr, bot + Math.sin(a) * rr * (0.5 + sp * 0.45), 1.4, 2.4, a, 0, P2);
    c.fill();
  }
  c.fillStyle = '#ffcf80';
  c.beginPath();
  c.ellipse(cxAt(1), bot + 1, half(1) * 1.3, 2.6, 0, 0, P2);
  c.fill();
}

const FALL_RES = 0.7;
/** The falls painted in the still (the live layer plays them). */
function fallsStill(ctx: Ctx): void {
  for (const [i, f] of TA.falls.entries()) {
    ctx.save();
    ctx.translate(f.x - FALL.w / 2, f.top - 6);
    ctx.scale(1, (f.bot - f.top + 20) / FALL.h);
    fallFrame(ctx, 0.35 + i * 0.3, FALL.w, FALL.h, i + 1);
    ctx.restore();
    steamStill(ctx, f.x, f.bot);
  }
}

function steamStill(ctx: Ctx, x: number, y: number): void {
  ctx.save();
  ctx.translate(x - STEAM.w / 2, y - STEAM.h + 8);
  smokeFrame(ctx, STEAM.w, STEAM.h, 0.4, STEAM.o);
  ctx.restore();
}
const STEAM = { w: 120, h: 200, o: { lit: '#ffc8a0', body: '#c8908a', shade: '#5a3840', wind: 0.15, lobes: 10, a: 0.4, toLight: [0, 1] as [number, number], seed: 4 } };

// ——— the temple ———

const ZT = 10.6;
const ZC = 11.9;
const ZP = 9.7;
const ZS = 7.9;
const Y_SHELF = 0.08;
const Y_POD = 0.44;
const Y_STY = 0.62;
const Y_SH = 1.74;
const Y_ECH = 1.82;
const Y_ABA = 1.88;
const Y_ARC = 2.08;
const Y_FRZ = 2.27;
const Y_COR = 2.36;
const Y_APX = 2.98;
const COLX = [-2.1, -1.33, -0.56, 0.56, 1.33, 2.1];
const STY = 2.42;
const POD = 2.55;
const STAIR = 1.2;
const CHEEK = 1.48;
const NSTEP = 9;
/** Where the right end has broken away (X): the entablature and pediment end here. */
const BREAK_X = 1.72;
/** The temple has settled: rotated about the left end of its stylobate, its right end sunk. */
const TILT = 0.011;
const MARBLE = { body: '#221a22', lit: '#4a3a40', shade: '#100a10', vein: '#6a5a60' };
export const TEMPLE_BOX = { x: 590, y: 110, w: 740, h: 420 };

/** The door's gap (X) and the light inside it. */
const GAP: [number, number] = [-0.22, 0.02];
const LIGHT_SRC = { X: -0.1, z: ZC + 1.5 };

const faceRect = (X0: number, X1: number, Y0: number, Y1: number, z: number) => polyPath([P(X0, Y0, z), P(X1, Y0, z), P(X1, Y1, z), P(X0, Y1, z)]);
const treadQuad = (X0: number, X1: number, Y: number, z0: number, z1: number) => polyPath([P(X0, Y, z0), P(X1, Y, z0), P(X1, Y, z1), P(X0, Y, z1)]);
/** The lit part of a tread (X range) at depth z: the light from the hall falling through the doors' gap. */
const spillAt = (z: number): [number, number] => {
  const k = (LIGHT_SRC.z - z) / (LIGHT_SRC.z - ZC);
  return [LIGHT_SRC.X + (GAP[0] - LIGHT_SRC.X) * k, LIGHT_SRC.X + (GAP[1] - LIGHT_SRC.X) * k];
};

let templeCache: HTMLCanvasElement | null = null;
/** The temple and its stair, painted once and shared by the temple layer and its reflection in the Styx. */
function templeCanvas(): HTMLCanvasElement {
  if (templeCache) return templeCache;
  const b = TEMPLE_BOX;
  const [c, ctx] = makeCanvas(b.w, b.h);
  ctx.translate(-b.x, -b.y);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  templePaint(ctx, rng(hashStr('ta:temple')));
  templeCache = c;
  return c;
}

function marbleFill(ctx: Ctx, path: (c: Ctx) => void, col: string, box: Box, seed: number, veins = 0.35): void {
  ctx.fillStyle = col;
  path(ctx);
  ctx.fill();
  within(ctx, path, () => {
    lay(ctx, drift(shade(col, 0.25), shade(col, -0.35), 3, seed, 48, 48), box, 0.55);
    if (veins) lay(ctx, noiseMask(9, seed + 5, { cover: 0.55, soft: 0.04, col: MARBLE.vein, kind: 'web', w: 160, h: 120 }), box, veins);
  });
}

function templePaint(ctx: Ctx, r: R): void {
  const ink = '#08040a';
  const [ax, ay] = P(-STY, Y_STY, ZT - 0.2);
  // ——— the temple proper (settled: rotated about its left end) ———
  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(TILT);
  ctx.translate(-ax, -ay);
  // the cella's front wall, deep in the porch's shade, and the doors
  const cw = faceRect(-STY + 0.15, STY - 0.15, Y_STY, Y_ABA, ZC);
  marbleFill(ctx, cw, '#0e0a0e', boxOfPts([P(-STY, Y_ABA, ZC), P(STY, Y_STY, ZC)]), 41, 0.08);
  doors(ctx, r);
  // the porch's ceiling (we look up at it between the architrave and the wall: coffers, lit from the doors)
  const soff = polyPath([P(-STY, Y_ABA, ZT + 0.15), P(STY, Y_ABA, ZT + 0.15), P(STY, Y_ABA, ZC), P(-STY, Y_ABA, ZC)]);
  ctx.fillStyle = '#0c080c';
  soff(ctx);
  ctx.fill();
  within(ctx, soff, () => {
    for (let X = -STY + 0.2; X < STY; X += 0.34) {
      const q = polyPath([P(X + 0.04, Y_ABA, ZT + 0.3), P(X + 0.28, Y_ABA, ZT + 0.3), P(X + 0.28, Y_ABA, ZC - 0.1), P(X + 0.04, Y_ABA, ZC - 0.1)]);
      ctx.fillStyle = rgba('#ff8a3a', 0.12 * (1 - Math.min(1, Math.abs(X + 0.1) / 1.6)));
      q(ctx);
      ctx.fill();
    }
  });
  // the porch floor and the light lying across it from the doors
  const pf = treadQuad(-STY, STY, Y_STY, ZT - 0.2, ZC);
  ctx.fillStyle = '#1a1218';
  pf(ctx);
  ctx.fill();
  const [s0, s1] = spillAt(ZT - 0.2);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgba(255,120,50,0.55)';
  polyPath([P(GAP[0], Y_STY, ZC), P(GAP[1], Y_STY, ZC), P(s1, Y_STY, ZT - 0.2), P(s0, Y_STY, ZT - 0.2)])(ctx);
  ctx.fill();
  ctx.restore();
  // the colonnade
  for (const [i, X] of COLX.entries()) column(ctx, r, X, i === 5 ? 1.24 : Y_SH, i);
  // the entablature (to the break)
  entablature(ctx, r);
  pediment(ctx, r);
  // the crepidoma: three steps up to the stylobate
  for (let s = 0; s < 3; s++) {
    const Y1 = Y_POD + ((s + 1) / 3) * (Y_STY - Y_POD);
    const Y0 = Y_POD + (s / 3) * (Y_STY - Y_POD);
    const zf = ZT - 0.2 - (2 - s) * 0.16;
    const hw = STY + (2 - s) * 0.1;
    const tread = treadQuad(-hw, hw, Y1, zf, zf + 0.16);
    ctx.fillStyle = mix(MARBLE.lit, '#7a3a2a', 0.3);
    tread(ctx);
    ctx.fill();
    const riser = faceRect(-hw, hw, Y0, Y1, zf);
    marbleFill(ctx, riser, MARBLE.body, boxOfPts([P(-hw, Y1, zf), P(hw, Y0, zf)]), 50 + s, 0.25);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1;
    riser(ctx);
    ctx.stroke();
    // the hall's light on the steps below the doors
    const [l0, l1] = spillAt(zf);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,120,50,0.4)';
    treadQuad(l0, l1, Y1, zf, zf + 0.16)(ctx);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,110,40,0.22)';
    faceRect(l0, l1, Y0, Y1, zf)(ctx);
    ctx.fill();
    ctx.restore();
  }
  // the fallen corner column: its drums lying where they rolled on the steps
  for (const [X, z, len, ang] of [[2.05, ZT - 0.55, 0.5, 0.18], [1.62, ZT - 0.7, 0.42, -0.35]] as const) drum(ctx, X, Y_POD + 0.02, z, len, ang);
  ctx.restore();

  // ——— the podium, the stair and the keepers (not settled with it: their own cracks) ———
  for (const side of [-1, 1]) {
    // the podium's face either side of the stair: courses of black ashlar, a bronze band along its top
    const f = faceRect(side < 0 ? -POD : CHEEK, side < 0 ? -CHEEK : POD, Y_SHELF, Y_POD, ZP);
    const fb = boxOfPts([P(side < 0 ? -POD : CHEEK, Y_POD, ZP), P(side < 0 ? -CHEEK : POD, Y_SHELF, ZP)]);
    marbleFill(ctx, f, '#1a1218', fb, 60 + side, 0.2);
    within(ctx, f, () => {
      ctx.strokeStyle = 'rgba(2,0,4,0.7)';
      ctx.lineWidth = 1.2;
      for (let Y = Y_SHELF + 0.12; Y < Y_POD; Y += 0.12) {
        const [x0, y] = P(-POD, Y, ZP);
        const [x1] = P(POD, Y, ZP);
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(x1, y);
        ctx.stroke();
        for (let X = -POD + ((Y * 7) % 0.4); X < POD; X += 0.42) {
          const [jx, jy] = P(X, Y, ZP);
          ctx.beginPath();
          ctx.moveTo(jx, jy);
          ctx.lineTo(jx, jy + 0.12 * pz(ZP));
          ctx.stroke();
        }
      }
      // the pit's red glancing along its foot, and the hot water's light
      vfill(ctx, fb.x, fb.y + fb.h * 0.5, fb.w, fb.h * 0.5, [[0, 'rgba(255,80,30,0)'], [1, 'rgba(255,80,30,0.2)']]);
    });
    const band = faceRect(side < 0 ? -POD : CHEEK, side < 0 ? -CHEEK : POD, Y_POD - 0.035, Y_POD, ZP);
    ctx.fillStyle = BRZ.shade;
    band(ctx);
    ctx.fill();
    ctx.strokeStyle = rgba(BRZ.lit, 0.4);
    ctx.lineWidth = 1;
    const [bx0, by0] = P(side < 0 ? -POD : CHEEK, Y_POD - 0.005, ZP);
    const [bx1] = P(side < 0 ? -CHEEK : POD, Y_POD, ZP);
    ctx.beginPath();
    ctx.moveTo(bx0, by0);
    ctx.lineTo(bx1, by0);
    ctx.stroke();
    // the terrace's top, a hair of it
    ctx.fillStyle = '#3a2a30';
    treadQuad(side < 0 ? -POD : CHEEK, side < 0 ? -CHEEK : POD, Y_POD, ZP, ZT - 0.7)(ctx);
    ctx.fill();
  }
  stair(ctx, r);
  for (const side of [-1, 1] as const) keeper(ctx, side);
  // the light on it all: the falls' from either side, the doors' down the middle, the smoke's dark over its top
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  for (const [f, a] of [[TA.falls[0], 0.3], [TA.falls[1], 0.24]] as const) {
    const g = ctx.createRadialGradient(f.x, 330, 10, f.x, 330, 300);
    g.addColorStop(0, rgba('#ff7a3a', a));
    g.addColorStop(1, rgba('#ff7a3a', 0));
    ctx.fillStyle = g;
    ctx.fillRect(TEMPLE_BOX.x, TEMPLE_BOX.y, TEMPLE_BOX.w, TEMPLE_BOX.h);
  }
  const dg = ctx.createRadialGradient(950, 440, 10, 950, 440, 200);
  dg.addColorStop(0, 'rgba(255,110,40,0.16)');
  dg.addColorStop(1, 'rgba(255,110,40,0)');
  ctx.fillStyle = dg;
  ctx.fillRect(TEMPLE_BOX.x, TEMPLE_BOX.y, TEMPLE_BOX.w, TEMPLE_BOX.h);
  vfill(ctx, TEMPLE_BOX.x, TEMPLE_BOX.y, TEMPLE_BOX.w, 200, [[0, 'rgba(10,4,8,0.3)'], [1, 'rgba(10,4,8,0)']]);
  ctx.restore();
  // cracks where it settled: up through the podium under the sunk end, across the stair
  const cr = rng(hashStr('ta:cracks'));
  for (const [X, Y, z, ang, len] of [[1.85, Y_SHELF + 0.02, ZP, -1.4, 52], [0.9, 0.3, ZP - 0.6, -2.6, 70], [-1.9, Y_SHELF + 0.05, ZP, -1.7, 30]] as const) {
    const [x, y] = P(X, Y, z);
    crack(ctx, cr, x, y, ang, len, { col: '#020004', lip: '#8a5a50', w: 1.6, a: 0.85 });
  }
}

/** The doors: a heavy frame; inside, the hall burning, a throne at its far end; two leaves of bronze, the left swung
 * far open, the right ajar. */
function doors(ctx: Ctx, r: R): void {
  const D = { X0: -0.44, X1: 0.44, Y0: Y_STY, Y1: 1.62 };
  const opening = faceRect(D.X0, D.X1, D.Y0, D.Y1, ZC);
  const ob = boxOfPts([P(D.X0, D.Y1, ZC), P(D.X1, D.Y0, ZC)]);
  // the wall round the door lit by it
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const [gx, gy] = P(-0.1, 0.9, ZC);
  glowAt(ctx, gx, gy, ob.w * 1.4, '#ff7a30', 0.16, 1.2);
  ctx.restore();
  // the hall: firelight brightest low and far, the walls going up into the dark
  within(ctx, opening, () => {
    vfill(ctx, ob.x, ob.y, ob.w, ob.h, [[0, '#3a0e08'], [0.35, '#8a2a12'], [0.7, '#c84a1c'], [1, '#e06a28']]);
    // the far end: a throne on its dais, black against the fire
    const [tx, ty] = P(-0.08, 0.66, ZC + 3.2);
    const s = pz(ZC + 3.2);
    ctx.fillStyle = '#1a0806';
    ctx.beginPath();
    ctx.rect(tx - s * 0.3, ty - s * 0.06, s * 0.6, s * 0.06);
    ctx.rect(tx - s * 0.16, ty - s * 0.5, s * 0.32, s * 0.44);
    ctx.rect(tx - s * 0.2, ty - s * 0.68, s * 0.06, s * 0.6);
    ctx.rect(tx + s * 0.14, ty - s * 0.68, s * 0.06, s * 0.6);
    ctx.fill();
    // the hall's columns going back, and the light on its floor
    for (const X of [-0.7, 0.55]) {
      for (let z = ZC + 0.6; z < ZC + 3; z += 0.8) {
        const [cx, cy] = P(X, D.Y0, z);
        const cs = pz(z);
        ctx.fillStyle = rgba('#120404', 0.75);
        ctx.fillRect(cx - cs * 0.09, cy - cs * 1.4, cs * 0.18, cs * 1.4);
      }
    }
    lightPool(ctx, gx, ob.y + ob.h - 2, ob.w * 0.6, 6, '#ffb060', 0.5);
  });
  // the frame: marble jambs and a heavy lintel with bronze bosses
  for (const [X0, X1] of [[D.X0 - 0.1, D.X0], [D.X1, D.X1 + 0.1]]) {
    const j = faceRect(X0, X1, D.Y0, D.Y1 + 0.1, ZC - 0.02);
    marbleFill(ctx, j, '#241a20', boxOfPts([P(X0, D.Y1 + 0.1, ZC), P(X1, D.Y0, ZC)]), 70, 0.2);
  }
  const lin = faceRect(D.X0 - 0.16, D.X1 + 0.16, D.Y1, D.Y1 + 0.14, ZC - 0.03);
  marbleFill(ctx, lin, '#2a1e24', boxOfPts([P(D.X0 - 0.16, D.Y1 + 0.14, ZC), P(D.X1 + 0.16, D.Y1, ZC)]), 72, 0.2);
  for (let X = D.X0 - 0.06; X <= D.X1 + 0.07; X += 0.13) {
    const [bx, by] = P(X, D.Y1 + 0.07, ZC - 0.04);
    ctx.fillStyle = BRZ.body;
    ctx.beginPath();
    ctx.arc(bx, by, 1.6, 0, P2);
    ctx.fill();
    ctx.fillStyle = rgba(BRZ.lit, 0.8);
    ctx.fillRect(bx - 0.8, by - 1.2, 1, 1);
  }
  // the left leaf swung far in (foreshortened, its face catching the fire), the right one ajar
  const leaf = (hinge: number, ang: number, lit: number) => {
    const wd = 0.44;
    // (swung in about its hinge: its free edge goes back into the hall)
    const far: [number, number] = [hinge - Math.sign(hinge) * Math.cos(ang) * wd, ZC + Math.sin(ang) * wd];
    const path = polyPath([P(hinge, D.Y0, ZC), P(far[0], D.Y0, far[1]), P(far[0], D.Y1, far[1]), P(hinge, D.Y1, ZC)]);
    const lb = boxOfPts([P(hinge, D.Y1, ZC), P(far[0], D.Y0, far[1])], 1);
    ctx.fillStyle = mix(BRZ.deep, BRZ.shade, 0.3);
    path(ctx);
    ctx.fill();
    within(ctx, path, () => {
      // panels of studs
      for (let Y = D.Y0 + 0.12; Y < D.Y1 - 0.05; Y += 0.12) {
        for (let u = 0.15; u < 1; u += 0.28) {
          const X = hinge + (far[0] - hinge) * u;
          const z = ZC + (far[1] - ZC) * u;
          const [bx, by] = P(X, Y, z);
          ctx.fillStyle = rgba(BRZ.lit, 0.15 + lit * 0.3);
          ctx.beginPath();
          ctx.arc(bx, by, Math.max(0.8, pz(z) * 0.012), 0, P2);
          ctx.fill();
        }
      }
      const g = ctx.createLinearGradient(lb.x, 0, lb.x + lb.w, 0);
      g.addColorStop(0, rgba('#ff8a3a', lit * (hinge < 0 ? 0.04 : 0.3)));
      g.addColorStop(1, rgba('#ff8a3a', lit * (hinge < 0 ? 0.3 : 0.04)));
      ctx.fillStyle = g;
      ctx.fillRect(lb.x, lb.y, lb.w, lb.h);
    });
    ctx.strokeStyle = '#0a0404';
    ctx.lineWidth = 1;
    path(ctx);
    ctx.stroke();
    // its edge in the light
    const [ex, ey0] = P(far[0], D.Y0, far[1]);
    const [, ey1] = P(far[0], D.Y1, far[1]);
    ctx.strokeStyle = rgba('#ffb060', 0.7 * lit);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(ex, ey0);
    ctx.lineTo(ex, ey1);
    ctx.stroke();
  };
  leaf(D.X0, 1.05, 0.9);
  leaf(D.X1, 0.28, 0.6);
  void r;
}

/** A Doric column of black marble at X on the colonnade (its shaft to Y1: lower is broken off), a bronze capital. */
function column(ctx: Ctx, r: R, X: number, Y1: number, i: number): void {
  const z = ZT;
  const k = pz(z);
  const r0 = 0.17;
  const r1 = 0.135;
  const broken = Y1 < Y_SH;
  const rad = (Y: number) => r0 + (r1 - r0) * ((Y - Y_STY) / (Y_SH - Y_STY)) - Math.sin(((Y - Y_STY) / (Y_SH - Y_STY)) * Math.PI) * 0.004;
  const N = 12;
  const L: Pt[] = [];
  const Rr: Pt[] = [];
  for (let j = 0; j <= N; j++) {
    const Y = Y_STY + ((Y1 - Y_STY) * j) / N;
    L.push(P(X - rad(Y), Y, z));
    Rr.push(P(X + rad(Y), Y, z));
  }
  const pts: Pt[] = [...L];
  if (broken) {
    // a jagged break across its top
    const [lx, ly] = L[N];
    const [rx] = Rr[N];
    for (let j = 1; j < 6; j++) pts.push([lx + ((rx - lx) * j) / 6, ly + (j % 2 ? -6 : 5) + (r() - 0.5) * 4]);
  }
  pts.push(...[...Rr].reverse());
  const path = polyPath(pts);
  const bx = boxOfPts(pts, 2);
  // its shadow thrown back on the cella wall by the firelight between the columns? (no: the hall's light is behind
  // it; it stands dark against the porch, edged in the falls' light)
  const [cx] = P(X, 1, z);
  const half = rad(Y_STY) * k;
  ctx.fillStyle = MARBLE.body;
  path(ctx);
  ctx.fill();
  within(ctx, path, () => {
    // the cylinder: lit at both edges by the two falls (the left warmer), dark down the middle
    const g = ctx.createLinearGradient(cx - half, 0, cx + half, 0);
    g.addColorStop(0, '#8a4a34');
    g.addColorStop(0.12, '#5a3632');
    g.addColorStop(0.42, '#1e161e');
    g.addColorStop(0.7, '#120c12');
    g.addColorStop(0.9, '#3a2228');
    g.addColorStop(1, '#6a3428');
    ctx.fillStyle = g;
    ctx.fillRect(bx.x, bx.y, bx.w, bx.h);
    // flutes: twenty round it, ten in view, closer together towards its edges
    for (let f = 1; f < 10; f++) {
      const a = -Math.PI / 2 + (f / 10) * Math.PI;
      const u = Math.sin(a);
      const lit = u < 0 ? 0.35 * -u : 0.2 * u;
      ctx.strokeStyle = rgba('#000000', 0.35);
      ctx.lineWidth = Math.max(0.8, Math.cos(a) * 1.8);
      ctx.beginPath();
      ctx.moveTo(cx + u * half, bx.y);
      ctx.lineTo(cx + u * half * (r1 / r0), bx.y + bx.h);
      ctx.stroke();
      ctx.strokeStyle = rgba('#ff9a6a', lit);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(cx + u * half + 1.2, bx.y);
      ctx.lineTo(cx + u * half * (r1 / r0) + 1.2, bx.y + bx.h);
      ctx.stroke();
    }
    // the drums' joints and the veins of the marble
    for (let Y = Y_STY + 0.26 + (i % 2) * 0.08; Y < Y1; Y += 0.28) {
      const [, yy] = P(X, Y, z);
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bx.x, yy);
      ctx.quadraticCurveTo(cx, yy + 2, bx.x + bx.w, yy);
      ctx.stroke();
    }
    lay(ctx, noiseMask(7, 90 + i, { cover: 0.5, soft: 0.03, col: MARBLE.vein, kind: 'web', w: 40, h: 120 }), bx, 0.12);
    // the soot and the damp low down
    vfill(ctx, bx.x, bx.y + bx.h * 0.6, bx.w, bx.h * 0.4, [[0, 'rgba(6,2,6,0)'], [1, 'rgba(6,2,6,0.45)']]);
  });
  ctx.strokeStyle = '#06030a';
  ctx.lineWidth = 1.1;
  path(ctx);
  ctx.stroke();
  if (broken) return;
  // the capital: a bronze echinus flaring out to a square bronze abacus
  const [ex0, ey0] = P(X - r1, Y_SH, z);
  const [ex1] = P(X + r1, Y_SH, z);
  const [, ey1] = P(X, Y_ECH, z);
  const aw = 0.2 * k;
  const ech = (c: Ctx) => {
    c.beginPath();
    c.moveTo(ex0, ey0);
    c.bezierCurveTo(ex0 - 2, ey0 - 3, cx - aw - 1, ey1 + 2, cx - aw, ey1);
    c.lineTo(cx + aw, ey1);
    c.bezierCurveTo(cx + aw + 1, ey1 + 2, ex1 + 2, ey0 - 3, ex1, ey0);
    c.closePath();
  };
  bronzeFill(ctx, ech, { x: cx - aw, y: ey1, w: aw * 2, h: ey0 - ey1 }, 0.8);
  const [, ay1] = P(X, Y_ABA, z);
  const aba = polyPath([[cx - aw - 1, ey1], [cx + aw + 1, ey1], [cx + aw + 1, ay1], [cx - aw - 1, ay1]]);
  bronzeFill(ctx, aba, { x: cx - aw - 1, y: ay1, w: aw * 2 + 2, h: ey1 - ay1 }, 1);
  // the necking rings under it
  ctx.strokeStyle = rgba(BRZ.lit, 0.6);
  ctx.lineWidth = 1;
  for (const dY of [0.02, 0.045]) {
    const [nx0, ny] = P(X - r1, Y_SH - dY, z);
    const [nx1] = P(X + r1, Y_SH - dY, z);
    ctx.beginPath();
    ctx.moveTo(nx0, ny);
    ctx.lineTo(nx1, ny);
    ctx.stroke();
  }
}

/** Bronze, lit from both sides by the falls, the edges hot; verdigris in its hollows. */
function bronzeFill(ctx: Ctx, path: (c: Ctx) => void, b: Box, lit: number): void {
  path(ctx);
  const g = ctx.createLinearGradient(b.x, 0, b.x + b.w, 0);
  g.addColorStop(0, mix(BRZ.body, BRZ.lit, 0.6 * lit));
  g.addColorStop(0.3, BRZ.shade);
  g.addColorStop(0.65, BRZ.deep);
  g.addColorStop(1, mix(BRZ.shade, '#d86a3a', 0.6 * lit));
  ctx.fillStyle = g;
  ctx.fill();
  within(ctx, path, () => {
    lay(ctx, noiseMask(4, Math.round(b.x), { cover: 0.35, soft: 0.25, col: BRZ.green, w: 24, h: 12 }), b, 0.3);
    ctx.fillStyle = rgba(BRZ.lit, 0.5 * lit);
    ctx.fillRect(b.x, b.y, b.w, Math.max(1, b.h * 0.18));
  });
  ctx.strokeStyle = '#120804';
  ctx.lineWidth = 1;
  path(ctx);
  ctx.stroke();
}

/** A column drum lying on its side on the steps. */
function drum(ctx: Ctx, X: number, Y: number, z: number, len: number, ang: number): void {
  const k = pz(z);
  const rad = 0.15 * k;
  const [x, y] = P(X, Y, z);
  const dx = Math.cos(ang) * len * k * 0.5;
  const dy = Math.sin(ang) * len * k * 0.12;
  groundShadow(ctx, x + 4, y + 2, len * k * 0.55, rad * 0.35, 0.6, '#000000');
  const body = polyPath([[x - dx, y - dy - rad * 2], [x + dx, y + dy - rad * 2], [x + dx, y + dy], [x - dx, y - dy]]);
  ctx.fillStyle = MARBLE.body;
  body(ctx);
  ctx.fill();
  within(ctx, body, () => {
    vfill(ctx, x - Math.abs(dx) - 2, y - rad * 2 - Math.abs(dy), Math.abs(dx) * 2 + 4, rad * 2 + Math.abs(dy) * 2, [[0, '#6a3a30'], [0.4, '#2a1c22'], [1, '#0c080c']]);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    for (let f = 1; f < 5; f++) {
      ctx.beginPath();
      ctx.moveTo(x - dx, y - dy - (rad * 2 * f) / 5);
      ctx.lineTo(x + dx, y + dy - (rad * 2 * f) / 5);
      ctx.stroke();
    }
  });
  // its broken end towards us
  const endX = ang > 0 ? x + dx : x - dx;
  const endY = ang > 0 ? y + dy : y - dy;
  ctx.fillStyle = '#3a2a2e';
  ctx.beginPath();
  ctx.ellipse(endX, endY - rad, rad * 0.4, rad, 0, 0, P2);
  ctx.fill();
  ctx.strokeStyle = '#06030a';
  ctx.lineWidth = 1;
  ctx.stroke();
  body(ctx);
  ctx.stroke();
}

/** The architrave, the frieze of triglyphs and metopes, the cornice: from the left corner to the break. */
function entablature(ctx: Ctx, r: R): void {
  const z = ZT - 0.18;
  const k = pz(z);
  const X0 = -STY;
  const X1 = BREAK_X;
  // a jagged end where the corner fell away
  const brk = (Y0: number, Y1: number): Pt[] => {
    const out: Pt[] = [];
    for (let j = 0; j <= 5; j++) {
      const Y = Y1 - ((Y1 - Y0) * j) / 5;
      out.push(P(X1 + (j % 2 ? 0.05 : -0.03) + (r() - 0.5) * 0.05, Y, z));
    }
    return out;
  };
  const arch = polyPath([P(X0, Y_ABA, z), ...brk(Y_ABA, Y_ARC).reverse(), P(X0, Y_ARC, z)]);
  const ab = boxOfPts([P(X0, Y_ARC, z), P(X1 + 0.1, Y_ABA, z)]);
  marbleFill(ctx, arch, '#2a2026', ab, 81, 0.25);
  within(ctx, arch, () => {
    // a bronze fascia along its top, and the soffit's shadow on it from the cornice above
    vfill(ctx, ab.x, ab.y, ab.w, ab.h, [[0, 'rgba(255,120,60,0.12)'], [1, 'rgba(0,0,0,0.3)']]);
  });
  ctx.strokeStyle = '#06030a';
  ctx.lineWidth = 1;
  arch(ctx);
  ctx.stroke();
  const [, ty0] = P(0, Y_ARC + 0.025, z);
  const [, ty1] = P(0, Y_ARC, z);
  const [fx0] = P(X0, 0, z);
  const [fx1] = P(X1, 0, z);
  ctx.fillStyle = BRZ.shade;
  ctx.fillRect(fx0, ty0, fx1 - fx0, ty1 - ty0);
  ctx.fillStyle = rgba(BRZ.lit, 0.45);
  ctx.fillRect(fx0, ty0, fx1 - fx0, 1);
  // the frieze: metopes (each with a bronze pomegranate, Persephone's fruit) between triglyphs, one over each column
  // and over each bay's middle (two in the wide middle bay): every triglyph on the colonnade's shared spacing
  const fr = polyPath([P(X0, Y_ARC + 0.025, z), ...brk(Y_ARC + 0.025, Y_FRZ).reverse(), P(X0, Y_FRZ, z)]);
  const fb = boxOfPts([P(X0, Y_FRZ, z), P(X1 + 0.1, Y_ARC, z)]);
  marbleFill(ctx, fr, '#161016', fb, 83, 0.15);
  const trig: number[] = [];
  for (let j = 0; j < COLX.length; j++) {
    trig.push(COLX[j]);
    if (j < COLX.length - 1) {
      const a = COLX[j];
      const b = COLX[j + 1];
      if (b - a > 1) trig.push(a + (b - a) / 3, a + ((b - a) * 2) / 3);
      else trig.push((a + b) / 2);
    }
  }
  trig[0] = -STY + 0.09;
  trig[trig.length - 1] = STY - 0.09;
  within(ctx, fr, () => {
    const tw = 0.15;
    for (let j = 0; j < trig.length; j++) {
      const X = trig[j];
      if (X > X1 + 0.05) continue;
      // the metope after it: its pomegranate
      if (j < trig.length - 1) {
        const mX = (X + trig[j + 1]) / 2;
        const [mx, my] = P(mX, (Y_ARC + Y_FRZ) / 2 + 0.01, z);
        const s = k * 0.03;
        ctx.fillStyle = mix(BRZ.deep, BRZ.shade, 0.6);
        ctx.beginPath();
        ctx.arc(mx, my, s, 0, P2);
        ctx.fill();
        ctx.fillStyle = rgba(BRZ.lit, 0.35);
        ctx.beginPath();
        ctx.arc(mx - s * 0.3, my - s * 0.3, s * 0.3, 0, P2);
        ctx.fill();
        ctx.fillStyle = BRZ.shade;
        ctx.fillRect(mx - s * 0.35, my - s * 1.35, s * 0.7, s * 0.45);
      }
      const t = faceRect(X - tw / 2, X + tw / 2, Y_ARC + 0.03, Y_FRZ, z - 0.02);
      ctx.fillStyle = '#2e2228';
      t(ctx);
      ctx.fill();
      // its grooves
      for (const g of [-0.25, 0.25]) {
        const [gx, gy0] = P(X + g * tw, Y_ARC + 0.05, z - 0.02);
        const [, gy1] = P(X + g * tw, Y_FRZ - 0.01, z - 0.02);
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.lineWidth = Math.max(1, k * 0.018);
        ctx.beginPath();
        ctx.moveTo(gx, gy0);
        ctx.lineTo(gx, gy1);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,140,90,0.25)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(gx - 1.2, gy0);
        ctx.lineTo(gx - 1.2, gy1);
        ctx.stroke();
      }
      // its guttae under the taenia
      const [gx0, gy] = P(X - tw * 0.4, Y_ARC + 0.01, z - 0.03);
      const [gx1] = P(X + tw * 0.4, Y_ARC + 0.01, z - 0.03);
      ctx.fillStyle = rgba(BRZ.lit, 0.5);
      for (let q = 0; q <= 5; q++) ctx.fillRect(gx0 + ((gx1 - gx0) * q) / 5 - 0.5, gy - 1, 1.2, 1.6);
    }
  });
  ctx.strokeStyle = '#06030a';
  fr(ctx);
  ctx.stroke();
  // the cornice: projecting, its top lit by the glowing smoke over it, its underside throwing the frieze into shadow
  const cz = ZT - 0.3;
  const cor = polyPath([P(X0 - 0.06, Y_FRZ, cz), P(X1 + 0.02, Y_FRZ - 0.01, cz), P(X1 - 0.03, Y_COR, cz), P(X0 - 0.06, Y_COR, cz)]);
  const cb = boxOfPts([P(X0 - 0.06, Y_COR, cz), P(X1 + 0.02, Y_FRZ, cz)]);
  marbleFill(ctx, cor, '#2a2026', cb, 85, 0.2);
  within(ctx, cor, () => vfill(ctx, cb.x, cb.y, cb.w, cb.h, [[0, 'rgba(255,110,60,0.35)'], [0.4, 'rgba(255,110,60,0)'], [1, 'rgba(0,0,0,0.35)']]));
  ctx.strokeStyle = '#06030a';
  cor(ctx);
  ctx.stroke();
  const [sx0, sy0] = P(X0, Y_FRZ - 0.005, z);
  const [sx1] = P(X1, Y_FRZ, z);
  vfill(ctx, sx0, sy0, sx1 - sx0, 6, [[0, 'rgba(0,0,0,0.5)'], [1, 'rgba(0,0,0,0)']]);
}

/** The pediment: the tympanum and its relief, the raking cornices, the acroteria; broken away at its right end. */
function pediment(ctx: Ctx, r: R): void {
  const z = ZT - 0.3;
  const zt = ZT - 0.1;
  const k = pz(zt);
  const apex = P(0, Y_APX, z);
  const lc = P(-STY - 0.06, Y_COR, z);
  const rcY = Y_COR + (Y_APX - Y_COR) * (1 - (BREAK_X + 0.06) / (STY + 0.06));
  // the tympanum (recessed), a triangle cut short on the right by the break
  const tl = P(-STY + 0.2, Y_COR + 0.03, zt);
  const ta = P(0, Y_APX - 0.08, zt);
  const brY = Y_COR + 0.03 + (Y_APX - 0.08 - Y_COR - 0.03) * (1 - BREAK_X / (STY - 0.2));
  const tympanum = polyPath([tl, ta, P(BREAK_X - 0.02, brY, zt), P(BREAK_X + 0.04, (brY + Y_COR) / 2 + 0.02, zt), P(BREAK_X, Y_COR + 0.03, zt)]);
  const tb = boxOfPts([tl, ta, P(BREAK_X, Y_COR, zt)]);
  marbleFill(ctx, tympanum, '#120c12', tb, 91, 0.12);
  within(ctx, tympanum, () => {
    vfill(ctx, tb.x, tb.y, tb.w, tb.h, [[0, 'rgba(0,0,0,0.4)'], [1, 'rgba(0,0,0,0)']]);
    relief(ctx, k, P(0, Y_COR + 0.03, zt));
  });
  // the raking cornices: lit along their tops (the glowing smoke), shadow under them on the tympanum
  const rake = polyPath([lc, apex, P(BREAK_X + 0.06, rcY, z), P(BREAK_X - 0.02, rcY - 0.09, z), P(0, Y_APX - 0.1, z), P(-STY + 0.12, Y_COR, z)]);
  const rb = boxOfPts([lc, apex, P(BREAK_X, rcY, z)]);
  marbleFill(ctx, rake, '#2a2026', rb, 93, 0.2);
  ctx.strokeStyle = '#06030a';
  ctx.lineWidth = 1;
  rake(ctx);
  ctx.stroke();
  ctx.strokeStyle = rgba('#ff8a4a', 0.55);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(lc[0], lc[1] - 1);
  ctx.lineTo(apex[0], apex[1] - 1);
  ctx.lineTo(...P(BREAK_X + 0.06, rcY + 0.005, z));
  ctx.stroke();
  // acroteria: a bronze flame-palmette on the apex, another on the left corner (the right one fell with the corner)
  for (const [x, y, s] of [[apex[0], apex[1], 1], [lc[0] + 4, lc[1], 0.75]] as const) {
    const h = k * 0.32 * s;
    const p = (c: Ctx) => {
      c.beginPath();
      c.moveTo(x - h * 0.3, y);
      c.bezierCurveTo(x - h * 0.45, y - h * 0.45, x - h * 0.1, y - h * 0.7, x, y - h);
      c.bezierCurveTo(x + h * 0.1, y - h * 0.7, x + h * 0.45, y - h * 0.45, x + h * 0.3, y);
      c.closePath();
    };
    bronzeFill(ctx, p, { x: x - h * 0.45, y: y - h, w: h * 0.9, h }, 1);
    ctx.strokeStyle = rgba(BRZ.deep, 0.8);
    ctx.lineWidth = 0.8;
    for (const d of [-0.15, 0, 0.15]) {
      ctx.beginPath();
      ctx.moveTo(x + d * h, y - 1);
      ctx.quadraticCurveTo(x + d * h * 1.6, y - h * 0.5, x + d * h * 0.4, y - h * 0.85);
      ctx.stroke();
    }
  }
  void r;
}

/**
 * The relief in the tympanum (base middle at (bx, by), k px per unit): the lord of the dead enthroned in the middle,
 * a bident raised in his right hand, a key in his left, his three-headed hound lying at his feet; a winged attendant
 * bowing either side; the dead coming to him in procession from both corners, smaller as the roof comes down, the
 * last ones on their knees. Carved in relief: each figure lit on its left by the left fall, a shadow on its right.
 */
function relief(ctx: Ctx, k: number, [bx, by]: Pt): void {
  const s = k / 115;
  const H = (Y_APX - Y_COR - 0.13) * k;
  const stone = '#4a3a40';
  const carve = (path: (c: Ctx) => void, col = stone) => {
    ctx.save();
    ctx.translate(1.6 * s, 1.2 * s);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    path(ctx);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = col;
    path(ctx);
    ctx.fill();
    ctx.save();
    ctx.translate(-0.9 * s, -0.6 * s);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,150,100,0.35)';
    ctx.lineWidth = 0.8;
    ctx.save();
    ctx.translate(-0.5, -0.4);
    path(ctx);
    ctx.stroke();
    ctx.restore();
  };
  // the throne: a high back with finials, arms, a footstool
  const tw = 15 * s;
  const th = H * 0.86;
  carve((c) => {
    c.beginPath();
    c.rect(bx - tw, by - th, 3 * s, th);
    c.rect(bx + tw - 3 * s, by - th, 3 * s, th);
    c.rect(bx - tw, by - th * 0.42, tw * 2, 3 * s);
    c.rect(bx - tw * 1.15, by - 3 * s, tw * 2.3, 3 * s);
  }, '#3a2c32');
  for (const d of [-1, 1]) {
    ctx.fillStyle = BRZ.body;
    ctx.beginPath();
    ctx.arc(bx + d * (tw - 1.5 * s), by - th - 1.5 * s, 2 * s, 0, P2);
    ctx.fill();
  }
  // the lord: seated, robed, crowned, bearded; bident in his right (our left), a key in his left
  const hy = by - th * 0.8;
  carve((c) => {
    c.beginPath();
    // head and crown
    c.ellipse(bx, hy, 4.2 * s, 5 * s, 0, 0, P2);
    c.moveTo(bx - 4 * s, hy - 3.5 * s);
    c.lineTo(bx - 3.4 * s, hy - 9 * s);
    c.lineTo(bx + 3.4 * s, hy - 9 * s);
    c.lineTo(bx + 4 * s, hy - 3.5 * s);
    // beard
    c.moveTo(bx - 3.5 * s, hy + 2 * s);
    c.quadraticCurveTo(bx, hy + 11 * s, bx + 3.5 * s, hy + 2 * s);
    // shoulders, robe, lap, the robe falling over his knees to his feet
    c.moveTo(bx - 9 * s, hy + 7 * s);
    c.quadraticCurveTo(bx, hy + 3 * s, bx + 9 * s, hy + 7 * s);
    c.lineTo(bx + 10 * s, by - th * 0.38);
    c.lineTo(bx + 12 * s, by - th * 0.34);
    c.lineTo(bx + 10 * s, by - 3 * s);
    c.lineTo(bx - 10 * s, by - 3 * s);
    c.lineTo(bx - 12 * s, by - th * 0.34);
    c.lineTo(bx - 10 * s, by - th * 0.38);
    c.closePath();
  }, '#54424a');
  // the folds of his robe
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 0.8;
  for (const d of [-5, -1.5, 2, 5.5]) {
    ctx.beginPath();
    ctx.moveTo(bx + d * s, by - th * 0.34);
    ctx.lineTo(bx + d * 1.2 * s, by - 4 * s);
    ctx.stroke();
  }
  // the gilt crown and his eyes in shadow
  ctx.fillStyle = BRZ.body;
  ctx.fillRect(bx - 3.4 * s, hy - 9 * s, 6.8 * s, 2 * s);
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(bx - 2.6 * s, hy - 1 * s, 5.2 * s, 1.4 * s);
  // the bident: up from beside his foot past his head, two prongs
  ctx.strokeStyle = BRZ.body;
  ctx.lineWidth = 1.4 * s;
  const px = bx - 13 * s;
  ctx.beginPath();
  ctx.moveTo(px, by - 2 * s);
  ctx.lineTo(px, hy - 15 * s);
  ctx.moveTo(px - 2.5 * s, hy - 18 * s);
  ctx.lineTo(px - 2.5 * s, hy - 12 * s);
  ctx.lineTo(px + 2.5 * s, hy - 12 * s);
  ctx.lineTo(px + 2.5 * s, hy - 18 * s);
  ctx.stroke();
  // his arm to it
  ctx.strokeStyle = '#54424a';
  ctx.lineWidth = 2.4 * s;
  ctx.beginPath();
  ctx.moveTo(bx - 8 * s, hy + 9 * s);
  ctx.quadraticCurveTo(bx - 12 * s, hy + 10 * s, px + 1, hy + 4 * s);
  ctx.stroke();
  // the key in his left, resting on his knee
  ctx.strokeStyle = BRZ.lit;
  ctx.lineWidth = 1 * s;
  ctx.beginPath();
  ctx.arc(bx + 9 * s, by - th * 0.3, 1.6 * s, 0, P2);
  ctx.moveTo(bx + 10.5 * s, by - th * 0.3);
  ctx.lineTo(bx + 16 * s, by - th * 0.3);
  ctx.lineTo(bx + 16 * s, by - th * 0.3 + 2.5 * s);
  ctx.stroke();
  // his hound at his feet: three heads, lying
  const dx = bx - 30 * s;
  const dy = by - 2 * s;
  carve((c) => {
    c.beginPath();
    c.ellipse(dx, dy - 3 * s, 9 * s, 3.4 * s, 0, 0, P2);
    for (const [hx, hy2] of [[7, -7], [10, -5], [12.5, -8]] as const) {
      c.moveTo(dx + hx * s + 3 * s, dy + hy2 * s);
      c.ellipse(dx + hx * s, dy + hy2 * s, 2.6 * s, 2.2 * s, 0, 0, P2);
      c.moveTo(dx + hx * s + 2.6 * s, dy + hy2 * s + 0.5 * s);
      c.lineTo(dx + hx * s + 5.5 * s, dy + hy2 * s + 1.2 * s);
      c.lineTo(dx + hx * s + 2.2 * s, dy + hy2 * s + 2 * s);
    }
    c.moveTo(dx - 9 * s, dy - 3 * s);
    c.quadraticCurveTo(dx - 15 * s, dy - 8 * s, dx - 13 * s, dy - 1 * s);
  });
  // the winged attendants, bowing towards him
  for (const d of [-1, 1]) {
    const ax = bx + d * 46 * s;
    const top = by - H * (1 - 46 / 250) * 0.82;
    carve((c) => {
      c.beginPath();
      // wings, swept up behind
      c.moveTo(ax - d * 2 * s, top + 8 * s);
      c.quadraticCurveTo(ax - d * 16 * s, top - 2 * s, ax - d * 20 * s, top + 4 * s);
      c.quadraticCurveTo(ax - d * 14 * s, top + 10 * s, ax - d * 6 * s, top + 16 * s);
      c.closePath();
      // the body bowing towards the middle, its head low
      c.moveTo(ax + d * 7 * s, top + 6 * s);
      c.ellipse(ax + d * 5 * s, top + 6 * s, 2.8 * s, 3.2 * s, 0, 0, P2);
      c.moveTo(ax + d * 3 * s, top + 9 * s);
      c.quadraticCurveTo(ax - d * 2 * s, top + 8 * s, ax - d * 4 * s, top + 16 * s);
      c.lineTo(ax - d * 5 * s, by - 3 * s);
      c.lineTo(ax + d * 4 * s, by - 3 * s);
      c.quadraticCurveTo(ax + d * 5 * s, top + 16 * s, ax + d * 3 * s, top + 9 * s);
    }, '#4a3a42');
  }
  // the dead in procession from each corner: hooded, bowed, the last ones kneeling
  for (const d of [-1, 1]) {
    for (let j = 0; j < 6; j++) {
      const off = (76 + j * 27) * s;
      const room = H * clamp01(1 - off / (250 * s)) * 0.85;
      if (room < 5 * s) continue;
      const x = bx + d * off;
      const kneel = j >= 4;
      const hgt = kneel ? room * 0.7 : room;
      carve((c) => {
        c.beginPath();
        const hr = Math.max(1.6, hgt * 0.11);
        const hx = x + d * hr * 0.8;
        const hy3 = by - hgt + hr;
        c.ellipse(hx, hy3, hr, hr * 1.15, 0, 0, P2);
        c.moveTo(hx + d * hr * 0.4, hy3 + hr);
        c.quadraticCurveTo(x + d * hgt * 0.2, by - hgt * 0.6, x + d * hgt * 0.16, by - 3 * s);
        c.lineTo(x - d * hgt * (kneel ? 0.28 : 0.16), by - 3 * s);
        c.quadraticCurveTo(x - d * hgt * 0.12, by - hgt * 0.6, hx - d * hr, hy3 + hr * 0.6);
        c.closePath();
        // arms out towards the throne
        c.moveTo(x + d * hgt * 0.05, by - hgt * 0.62);
        c.lineTo(x + d * hgt * 0.34, by - hgt * 0.5);
        c.lineTo(x + d * hgt * 0.3, by - hgt * 0.44);
        c.lineTo(x + d * hgt * 0.04, by - hgt * 0.5);
      }, mix('#463840', '#3a2e34', j / 6));
    }
  }
  // the river and its ferry in the left corner
  ctx.strokeStyle = 'rgba(90,70,80,0.8)';
  ctx.lineWidth = 0.9;
  for (let j = 0; j < 3; j++) {
    const y = by - 2 * s - j * 2.4 * s;
    ctx.beginPath();
    for (let x = bx - 238 * s; x < bx - 238 * s + (40 - j * 10) * s; x += 3 * s) ctx.lineTo(x, y + Math.sin(x * 0.6) * 0.7);
    ctx.stroke();
  }
}

/** The stair from the podium down to the water, its last steps going under; the light from the doors down it. */
function stair(ctx: Ctx, r: R): void {
  const rise = (Y_POD - 0) / NSTEP;
  const run = (ZP - ZS) / NSTEP;
  for (let i = 0; i < NSTEP + 2; i++) {
    const Yt = Y_POD - (i + 1) * rise;
    const z0 = ZP - i * run;
    const z1 = z0 - run;
    const sunk = Yt < 0;
    // the riser at z0, the tread in front of it (seen from above)
    const riser = faceRect(-STAIR, STAIR, Yt, Yt + rise, z0);
    const tread = treadQuad(-STAIR, STAIR, Yt, z1, z0);
    const wear = 0.08 + r() * 0.08;
    ctx.fillStyle = sunk ? '#0e0a0e' : mix('#1e161c', '#120c12', i / NSTEP);
    riser(ctx);
    ctx.fill();
    ctx.fillStyle = sunk ? '#160e12' : mix('#3a2a30', '#2a1e24', i / NSTEP);
    tread(ctx);
    ctx.fill();
    within(ctx, tread, () => {
      const tb = boxOfPts([P(-STAIR, Yt, z1), P(STAIR, Yt, z0)]);
      lay(ctx, drift('#5a4048', '#120a10', 3, 110 + i, 48, 8), tb, 0.5);
      // worn hollow down the middle where the dead have walked
      ctx.fillStyle = rgba('#000000', wear);
      ctx.beginPath();
      ctx.ellipse(...P(-0.1, Yt, (z0 + z1) / 2), pz(z0) * 0.5, Math.max(1, tb.h * 0.4), 0, 0, P2);
      ctx.fill();
    });
    // chipped nosing: the tread's front edge lit, broken in places
    const [nx0, ny] = P(-STAIR, Yt, z1);
    const [nx1] = P(STAIR, Yt, z1);
    ctx.strokeStyle = rgba('#a86a58', sunk ? 0.08 : 0.35);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = nx0; x < nx1; x += 6 + r() * 14) {
      const l = 4 + r() * 18;
      ctx.moveTo(x, ny);
      ctx.lineTo(Math.min(nx1, x + l), ny);
    }
    ctx.stroke();
    // the light from the doors lying down the stair, widening and fading as it comes towards us
    const [l0, l1] = spillAt((z0 + z1) / 2);
    const fade = (1 - i / (NSTEP + 2)) * (sunk ? 0.3 : 1);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rgba('#ff7a30', 0.42 * fade);
    treadQuad(Math.max(-STAIR, l0), Math.min(STAIR, l1), Yt, z1, z0)(ctx);
    ctx.fill();
    ctx.fillStyle = rgba('#ff6a24', 0.16 * fade);
    faceRect(Math.max(-STAIR, l0), Math.min(STAIR, l1), Yt, Yt + rise, z0)(ctx);
    ctx.fill();
    ctx.restore();
  }
  // the cheek walls either side of the stair, their inner faces in shade, their tops lit
  for (const d of [-1, 1]) {
    const Xi = d * STAIR;
    const Xo = d * CHEEK;
    const zB = ZS + 0.35;
    const YB = 0.24;
    const inner = polyPath([P(Xi, Y_POD + 0.1, ZP), P(Xi, YB, zB), P(Xi, 0, zB), P(Xi, 0, ZP)]);
    ctx.fillStyle = '#0c080c';
    inner(ctx);
    ctx.fill();
    within(ctx, inner, () => {
      const ib = boxOfPts([P(Xi, Y_POD + 0.1, ZP), P(Xi, 0, zB)]);
      vfill(ctx, ib.x, ib.y, ib.w, ib.h, [[0, 'rgba(255,100,40,0.18)'], [1, 'rgba(0,0,0,0)']]);
    });
    const topF = polyPath([P(Xi, Y_POD + 0.1, ZP), P(Xo, Y_POD + 0.1, ZP), P(Xo, YB, zB), P(Xi, YB, zB)]);
    ctx.fillStyle = '#3e2c32';
    topF(ctx);
    ctx.fill();
    const front = faceRect(Math.min(Xi, Xo), Math.max(Xi, Xo), 0, YB, zB);
    marbleFill(ctx, front, '#1e161c', boxOfPts([P(Xi, YB, zB), P(Xo, 0, zB)]), 120 + d, 0.2);
    ctx.strokeStyle = '#06030a';
    ctx.lineWidth = 1;
    for (const p of [inner, topF, front]) {
      p(ctx);
      ctx.stroke();
    }
  }
}

/** A bronze keeper on its pedestal at the foot of the stair (side −1 left, 1 right), a bowl of fire held up in both
 * hands; the right one has lost its head and leans where its pedestal has sunk. */
function keeper(ctx: Ctx, side: -1 | 1): void {
  const X = side * (STAIR + 0.14);
  const z = ZS + 0.35;
  const k = pz(z);
  const [px, py] = P(X, 0.24, z);
  const h = 0.8 * k;
  const w = 0.14 * k;
  const headless = side > 0;
  // the pedestal
  const ped = faceRect(X - 0.13, X + 0.13, 0, 0.24, z);
  marbleFill(ctx, ped, '#241a20', boxOfPts([P(X - 0.13, 0.24, z), P(X + 0.13, 0, z)]), 150 + side, 0.25);
  ctx.strokeStyle = '#06030a';
  ctx.lineWidth = 1;
  ped(ctx);
  ctx.stroke();
  const [, pTop] = P(X, 0.24, z);
  ctx.fillStyle = '#3a2c32';
  ctx.fillRect(P(X - 0.13, 0.24, z)[0], pTop - 1.5, 0.26 * k, 2);
  ctx.save();
  if (headless) {
    // its pedestal has sunk on the river side: it leans
    ctx.translate(px, py);
    ctx.rotate(0.07);
    ctx.translate(-px, -py);
  }
  const Y = (t: number) => py - h * t;
  // the robe and hood (or the broken neck), one silhouette
  const body = (c: Ctx) => {
    c.beginPath();
    c.moveTo(px - w * 1.15, py);
    c.bezierCurveTo(px - w * 1.0, Y(0.25), px - w * 0.55, Y(0.4), px - w * 0.6, Y(0.5));
    c.quadraticCurveTo(px - w * 0.82, Y(0.62), px - w * 0.74, Y(0.72));
    if (!headless) {
      c.quadraticCurveTo(px - w * 0.5, Y(0.78), px - w * 0.36, Y(0.8));
      c.quadraticCurveTo(px - w * 0.42, Y(0.95), px + w * 0.02, Y(0.99));
      c.quadraticCurveTo(px + w * 0.44, Y(0.95), px + w * 0.36, Y(0.8));
    } else {
      c.lineTo(px - w * 0.3, Y(0.77));
      c.lineTo(px - w * 0.2, Y(0.83));
      c.lineTo(px - w * 0.05, Y(0.8));
      c.lineTo(px + w * 0.08, Y(0.85));
      c.lineTo(px + w * 0.22, Y(0.8));
      c.lineTo(px + w * 0.3, Y(0.77));
    }
    c.quadraticCurveTo(px + w * 0.5, Y(0.78), px + w * 0.74, Y(0.72));
    c.quadraticCurveTo(px + w * 0.82, Y(0.62), px + w * 0.6, Y(0.5));
    c.bezierCurveTo(px + w * 0.55, Y(0.4), px + w * 1.0, Y(0.25), px + w * 1.15, py);
    c.closePath();
  };
  // the arms raised in a V, sleeves hanging from them, hands under the bowl
  const arm = (d: number) => (c: Ctx) => {
    c.beginPath();
    c.moveTo(px + d * w * 0.5, Y(0.7));
    c.quadraticCurveTo(px + d * w * 1.15, Y(0.76), px + d * w * 1.05, Y(0.86));
    c.lineTo(px + d * w * 0.62, Y(1.02));
    c.lineTo(px + d * w * 0.46, Y(1.0));
    c.lineTo(px + d * w * 0.82, Y(0.86));
    c.quadraticCurveTo(px + d * w * 0.86, Y(0.8), px + d * w * 0.66, Y(0.62));
    c.closePath();
  };
  const fb = { x: px - w * 1.3, y: Y(1.08), w: w * 2.6, h: h * 1.08 };
  const fill = (path: (c: Ctx) => void) => {
    path(ctx);
    const g = ctx.createLinearGradient(fb.x, 0, fb.x + fb.w, 0);
    g.addColorStop(0, '#8a6036');
    g.addColorStop(0.3, '#4a321c');
    g.addColorStop(0.65, '#20160c');
    g.addColorStop(1, '#6a4024');
    ctx.fillStyle = g;
    ctx.fill();
    within(ctx, path, () => {
      lay(ctx, noiseMask(4, 140 + side, { cover: 0.42, soft: 0.25, col: BRZ.green, w: 16, h: 32 }), fb, 0.5);
      vfill(ctx, fb.x, fb.y, fb.w, fb.h * 0.35, [[0, 'rgba(255,150,70,0.5)'], [1, 'rgba(255,150,70,0)']]);
    });
    ctx.strokeStyle = '#0c0604';
    ctx.lineWidth = 1;
    path(ctx);
    ctx.stroke();
  };
  castShadow(ctx, body, 3, 3, 0.45, '#000000');
  fill(body);
  within(ctx, body, () => {
    // the folds falling from the waist, a cord at it
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1;
    for (const d of [-0.6, -0.2, 0.2, 0.6]) {
      ctx.beginPath();
      ctx.moveTo(px + d * w * 0.7, Y(0.48));
      ctx.quadraticCurveTo(px + d * w * 0.95, Y(0.25), px + d * w * 1.15, py);
      ctx.stroke();
    }
    ctx.strokeStyle = rgba(BRZ.lit, 0.4);
    ctx.beginPath();
    ctx.moveTo(px - w * 0.62, Y(0.5));
    ctx.quadraticCurveTo(px, Y(0.47), px + w * 0.62, Y(0.5));
    ctx.stroke();
    if (!headless) {
      // the dark inside the hood
      ctx.fillStyle = 'rgba(4,2,2,0.9)';
      ctx.beginPath();
      ctx.ellipse(px + w * 0.02, Y(0.86), w * 0.2, w * 0.26, 0, 0, P2);
      ctx.fill();
    } else {
      // the break: rough bright metal at the neck
      ctx.fillStyle = rgba('#c89050', 0.6);
      ctx.fillRect(px - w * 0.25, Y(0.82), w * 0.5, 1.5);
    }
  });
  for (const d of [-1, 1]) fill(arm(d));
  // the bowl over its head (the fire in it is the live layer's, painted in the still)
  const by = Y(1.04);
  const bowl = (c: Ctx) => {
    c.beginPath();
    c.moveTo(px - w * 0.95, by - 2);
    c.quadraticCurveTo(px - w * 0.7, by + w * 0.38, px, by + w * 0.4);
    c.quadraticCurveTo(px + w * 0.7, by + w * 0.38, px + w * 0.95, by - 2);
    c.closePath();
  };
  bronzeFill(ctx, bowl, { x: px - w * 0.95, y: by - 2, w: w * 1.9, h: w * 0.45 }, 1);
  ctx.fillStyle = '#ffb060';
  ctx.beginPath();
  ctx.ellipse(px, by - 2, w * 0.88, w * 0.12, 0, 0, P2);
  ctx.fill();
  ctx.restore();
}

/** Where the keepers' bowls are (screen), for the fire. */
const KEEPER_FIRE: Pt[] = [-1, 1].map((side) => {
  const X = side * (STAIR + 0.14);
  const z = ZS + 0.35;
  const k = pz(z);
  const [px, py] = P(X, 0.24, z);
  const dy = -0.8 * k * 1.04 - 2;
  // (the right one leans 0.07 rad about its foot)
  const a = side < 0 ? 0 : 0.07;
  return [px - dy * Math.sin(a), py + dy * Math.cos(a)] as Pt;
});

/** The far bank: a shelf of basalt from cliff to cliff, its back edge the abyss's lip, the temple on it. */
function farBank(ctx: Ctx, r: R): void {
  const lipY = (x: number) => 440 + Math.sin(x * 0.03) * 2 + Math.sin(x * 0.11) * 1.2;
  const yA = 436;
  const xa = edgeX(EL, yA) - 8;
  const xb = edgeX(ER, yA) + 8;
  const pts: Pt[] = [];
  for (let x = xa; x <= xb; x += 8) pts.push([x, lipY(x)]);
  for (let y = 440; y <= 530; y += 10) pts.push([edgeX(ER, y) + 6, y]);
  for (let x = xb + 20; x >= xa - 20; x -= 8) pts.push([x, farEdge(x) + 2]);
  for (let y = 530; y >= 440; y -= 10) pts.push([edgeX(EL, y) - 6, y]);
  const path = polyPath(pts);
  const box = boxOfPts(pts, 2);
  ctx.fillStyle = '#1e161c';
  path(ctx);
  ctx.fill();
  within(ctx, path, () => {
    surface(ctx, r, box, '#1e161c', { over: true, vary: 0.6, cells: 6, mottle: 0.5, strokes: 0.3, strokeAng: 0, strokeLen: 90, strokeW: 4, warm: '#5a2a26', cool: '#0c0a16', seed: 171 });
    // the abyss's glow rising over its back edge, the falls' light at its ends, ash lying on it
    vfill(ctx, box.x, 436, box.w, 30, [[0, 'rgba(255,90,40,0.4)'], [1, 'rgba(255,90,40,0)']]);
    lay(ctx, noiseMask(8, 173, { cover: 0.4, soft: 0.3, col: '#6a5a60', w: 120, h: 16 }), box, 0.3);
    for (const f of TA.falls) lightPool(ctx, f.x, f.bot - 8, 110, 24, '#ff7a30', 0.35);
    // its wet foot along the water
    vfill(ctx, box.x, box.y + box.h - 14, box.w, 14, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.5)']]);
  });
  // the lip, edged in the fire below it
  ctx.strokeStyle = 'rgba(255,120,60,0.55)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let x = xa; x <= xb; x += 8) ctx.lineTo(x, lipY(x));
  ctx.stroke();
}

function templeLayer(ctx: Ctx, r: R): void {
  farBank(ctx, r);
  const b = TEMPLE_BOX;
  // its shadow cast forward on the shelf by the abyss behind it
  ctx.drawImage(templeCanvas(), b.x, b.y);
  // the haze between us and it: the smoke off the water, thickest low down
  haze(ctx, 300, 520, '#3a1820', 0.32, 0.8, b.x, b.x + b.w);
  haze(ctx, 460, 515, '#6a2a28', 0.2, 0.6, b.x, b.x + b.w);
}

/** The keepers' fires, painted in the still (the live layer's flicker). */
function keeperFireStill(ctx: Ctx): void {
  for (const [i, [x, y]] of KEEPER_FIRE.entries()) {
    glowAt(ctx, x, y - 6, 30, '#ff8a3a', 0.3);
    fireFrame(ctx, x, y + 1, 14, 18, 0.2 + i * 0.4, { tongues: 3, seed: i + 2, cols: ['#e0501a', '#ffa030', '#ffe0a0'] });
  }
}

// ——— the Styx ———

export const STYX_BOX = { x: 0, y: 494, w: W, h: 160 };

const styxPath = () => (c: Ctx) => {
  c.beginPath();
  for (let x = -10; x <= W + 10; x += 10) c.lineTo(x, farEdge(x));
  for (let x = W + 10; x >= -10; x -= 10) c.lineTo(x, nearEdge(x) + 14);
  c.closePath();
};

function styx(ctx: Ctx, r: R): void {
  const b = STYX_BOX;
  const path = styxPath();
  within(ctx, path, () => {
    water(ctx, r, 0, W, 496, 656, {
      far: '#2a1416', deep: '#0b1a1e', near: '#03070a', sky: '#7a2a1c', skyA: 0.3,
      ripple: '#4ab8a8', ripples: 150, swells: 6, crest: '#1e5a58', glitterX: 960, glitter: '#ff8a40', glitterA: 0.18, glitterW: 90, seed: 63,
    });
    // the cold depth: a green-blue light down in the black water
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [x, rad, a] of [[420, 260, 0.07], [1060, 320, 0.06], [1560, 220, 0.07]] as const) glowAt(ctx, x, 594, rad, '#2affc0', a, 0.22);
    ctx.restore();
    // the temple mirrored: its colonnade and the doors' fire, broken by the water into strips
    const t = templeCanvas();
    const tb = TEMPLE_BOX;
    const mirror = sy(0, ZT);
    ctx.save();
    ctx.globalAlpha = 0.6;
    for (let y = 500; y < 650; y += 3) {
      const src = 2 * mirror - y;
      if (src < tb.y || src > tb.y + tb.h - 3) continue;
      const off = Math.sin(y * 0.9) * (1 + (y - 500) * 0.03) + Math.sin(y * 0.31) * 1.5;
      ctx.drawImage(t, 0, src - tb.y - 3, tb.w, 3, tb.x + off, y, tb.w, 3.2);
    }
    ctx.restore();
    vfill(ctx, 0, 500, W, 150, [[0, 'rgba(3,6,8,0.2)'], [1, 'rgba(3,6,8,0.55)']]);
    // the falls in the water: long broken streaks of orange under each
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const f of TA.falls) {
      for (let i = 0; i < 46; i++) {
        const t2 = r() ** 1.3;
        const y = f.bot + 2 + t2 * 120;
        const len = 4 + r() * 18;
        ctx.fillStyle = rgba(i % 3 ? '#ff7a2a' : '#ffc060', (0.5 - t2 * 0.4) * (0.4 + r() * 0.6));
        ctx.fillRect(f.x + (r() - 0.5) * (14 + t2 * 30) - len / 2, y, len, 1.4 + t2);
      }
      glowAt(ctx, f.x, f.bot + 6, 70, '#ff6a2a', 0.25, 0.35);
    }
    // the keepers' fires and the doors' light, broken on the water under the stair
    for (const [x] of KEEPER_FIRE) {
      for (let i = 0; i < 14; i++) ctx.fillRect(x + (r() - 0.5) * 10, 514 + r() * 40, 3 + r() * 8, 1.2);
    }
    // the lantern on the jetty, a cold green streak
    const [lx] = LANTERN;
    ctx.fillStyle = 'rgba(120,255,200,0.28)';
    for (let i = 0; i < 16; i++) ctx.fillRect(lx + (r() - 0.5) * 8 - 4, 600 + r() * 40, 4 + r() * 8, 1.2);
    ctx.restore();
    // mist lying on the water, and the far shore's wet lip
    haze(ctx, 500, 560, '#4a3a48', 0.22, 0.3);
    ctx.strokeStyle = 'rgba(255,120,70,0.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 10) ctx.lineTo(x, farEdge(x) + 2);
    ctx.stroke();
  });
  void b;
}

/** The water lit red by the eruption (live only): the burning sky and the falls mirrored brighter, a red glitter. */
function styxRed(ctx: Ctx, r: R): void {
  within(ctx, styxPath(), () => {
    vfill(ctx, 0, 496, W, 160, [[0, 'rgba(200,50,20,0.65)'], [0.4, 'rgba(140,30,14,0.4)'], [1, 'rgba(60,10,6,0.2)']]);
    ctx.fillStyle = 'rgba(255,120,50,0.5)';
    for (let i = 0; i < 260; i++) {
      const t = r() ** 0.9;
      const y = 500 + t * 140;
      const len = (6 + r() * 26) * (0.4 + t);
      ctx.fillRect(r() * W - len / 2, y, len, 1 + t * 1.5);
    }
  });
}

// ——— the dead under the water ———

const SOUL_F = { w: 120, h: 72 };
/** A face of the dead under the water: pale, long, hollow-eyed, mouth open, its edges trailing off like smoke. */
function soulFrame(c: Ctx, i: number): void {
  const sr = rng(hashStr('ta:soul' + i));
  const [cv, g] = makeCanvas(SOUL_F.w, SOUL_F.h);
  const x = SOUL_F.w / 2 + (sr() - 0.5) * 8;
  const y = SOUL_F.h / 2;
  const fw = 15 + sr() * 5;
  const fh = 19 + sr() * 5;
  // the trailing wisps (hair, or the shroud) behind it
  g.strokeStyle = 'rgba(200,255,240,0.35)';
  g.lineWidth = 3;
  g.lineCap = 'round';
  for (let k = 0; k < 5; k++) {
    g.beginPath();
    g.moveTo(x + fw * 0.5, y - fh * 0.5 + k * fh * 0.25);
    g.bezierCurveTo(x + fw * 1.1, y - fh * 0.6 + k * 8, x + fw * 1.5, y + (sr() - 0.5) * 20, x + fw * 2.0, y + (sr() - 0.5) * 24);
    g.stroke();
  }
  const fg = g.createRadialGradient(x, y - 2, 2, x, y, fh * 1.1);
  fg.addColorStop(0, 'rgba(225,255,245,0.95)');
  fg.addColorStop(0.6, 'rgba(170,240,225,0.6)');
  fg.addColorStop(1, 'rgba(140,220,210,0)');
  g.fillStyle = fg;
  g.beginPath();
  g.ellipse(x, y, fw, fh, 0, 0, P2);
  g.fill();
  // hollow eyes and an open mouth (cut out: the dark water shows through)
  g.globalCompositeOperation = 'destination-out';
  for (const d of [-1, 1]) {
    g.fillStyle = 'rgba(0,0,0,0.85)';
    g.beginPath();
    g.ellipse(x + d * fw * 0.36, y - fh * 0.15, fw * 0.17, fh * 0.17 + sr() * 2, d * 0.2, 0, P2);
    g.fill();
  }
  g.beginPath();
  g.ellipse(x, y + fh * 0.42, fw * 0.17, fh * 0.2 + sr() * 3, 0, 0, P2);
  g.fill();
  g.globalCompositeOperation = 'source-over';
  // smeared by the water
  c.save();
  c.filter = 'blur(2.6px)';
  c.drawImage(cv, 0, 0);
  c.globalAlpha = 0.5;
  c.drawImage(cv, 4, 1);
  c.filter = 'none';
  c.restore();
}

const SOULS_STILL: [number, number, number, number][] = [
  [330, 560, 0.8, 0],
  [760, 600, 1, 1],
  [1170, 572, 0.85, 2],
  [1530, 612, 1, 3],
  [1810, 548, 0.7, 4],
];
function soulsStill(ctx: Ctx): void {
  const [cv, g] = makeCanvas(SOUL_F.w, SOUL_F.h);
  for (const [x, y, s, i] of SOULS_STILL) {
    g.clearRect(0, 0, SOUL_F.w, SOUL_F.h);
    soulFrame(g, i);
    const k = (pz(zAtY(y)) / 220) * s;
    ctx.save();
    ctx.globalAlpha = 0.13;
    ctx.translate(x, y);
    ctx.scale(k * 1.15, k * 0.8);
    ctx.drawImage(cv, -SOUL_F.w / 2, -SOUL_F.h / 2);
    ctx.restore();
  }
}

// ——— Charon and his ferry ———

const BOAT = { w: 340, h: 130, deck: 64, water: 92 };
/** The ferry (facing right): a long black boat, its high prow curling up, a lantern hung from it; its reflection. */
function boatPaint(c: Ctx): void {
  const { deck, water: wl } = BOAT;
  const hull = (g: Ctx) => {
    g.beginPath();
    g.moveTo(24, deck - 6);
    g.quadraticCurveTo(26, wl + 2, 90, wl + 4);
    g.lineTo(250, wl + 2);
    g.quadraticCurveTo(298, wl - 2, 312, deck - 14);
    // the prow rising and curling over
    g.bezierCurveTo(322, deck - 40, 320, 10, 304, 8);
    g.bezierCurveTo(294, 6, 292, 20, 300, 22);
    g.bezierCurveTo(306, 22, 308, 30, 302, 44);
    g.quadraticCurveTo(290, deck - 6, 250, deck);
    g.lineTo(60, deck);
    g.quadraticCurveTo(36, deck - 2, 30, deck - 16);
    g.quadraticCurveTo(22, deck - 18, 24, deck - 6);
    g.closePath();
  };
  // the reflection under it, broken by the water
  c.save();
  c.globalAlpha = 0.35;
  c.translate(0, wl * 2 + 6);
  c.scale(1, -0.8);
  c.fillStyle = '#020304';
  hull(c);
  c.fill();
  c.restore();
  hull(c);
  const g = c.createLinearGradient(0, deck - 20, 0, wl + 4);
  g.addColorStop(0, '#3a2a2e');
  g.addColorStop(0.3, '#1c1418');
  g.addColorStop(1, '#08060a');
  c.fillStyle = g;
  c.fill();
  c.save();
  hull(c);
  c.clip();
  // strakes, tarred and split
  c.strokeStyle = 'rgba(0,0,0,0.6)';
  c.lineWidth = 1.4;
  for (const dy of [8, 16, 24]) {
    c.beginPath();
    c.moveTo(28, deck + dy - 4);
    c.quadraticCurveTo(150, deck + dy + 4, 300, deck + dy - 16);
    c.stroke();
  }
  c.strokeStyle = 'rgba(255,120,80,0.15)';
  c.lineWidth = 1;
  for (const dy of [9, 17]) {
    c.beginPath();
    c.moveTo(28, deck + dy - 4);
    c.quadraticCurveTo(150, deck + dy + 4, 300, deck + dy - 16);
    c.stroke();
  }
  // the pit's red along its gunwale and prow, the water's cold sheen low down
  c.fillStyle = 'rgba(255,100,60,0.28)';
  c.fillRect(0, deck - 40, BOAT.w, 10);
  c.fillStyle = 'rgba(90,230,200,0.16)';
  c.fillRect(0, wl - 6, BOAT.w, 8);
  c.restore();
  c.strokeStyle = '#020102';
  c.lineWidth = 2.2;
  hull(c);
  c.stroke();
  // the gunwale, lit
  c.strokeStyle = 'rgba(230,140,110,0.5)';
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(32, deck - 1);
  c.lineTo(250, deck - 1);
  c.quadraticCurveTo(290, deck - 8, 304, deck - 26);
  c.stroke();
  // the lantern hung from the prow's curl: a bronze cage, a cold green flame
  c.strokeStyle = '#140c08';
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(300, 24);
  c.lineTo(322, 24);
  c.lineTo(322, 34);
  c.stroke();
  const lg = c.createRadialGradient(322, 46, 1, 322, 46, 26);
  lg.addColorStop(0, 'rgba(140,255,200,0.6)');
  lg.addColorStop(1, 'rgba(140,255,200,0)');
  c.fillStyle = lg;
  c.fillRect(296, 20, 52, 52);
  c.fillStyle = '#6a4a22';
  c.beginPath();
  c.roundRect(316, 34, 12, 20, 2);
  c.fill();
  c.fillStyle = '#9affd0';
  c.fillRect(318.5, 38, 7, 12);
  c.fillStyle = '#eafff4';
  c.fillRect(320.5, 41, 3, 6);
  c.strokeStyle = '#140c08';
  c.lineWidth = 1;
  c.strokeRect(316, 34, 12, 20);
  c.beginPath();
  c.moveTo(322, 34);
  c.lineTo(322, 54);
  c.stroke();
}

const CHARON = { w: 250, h: 300, footX: 82, deck: 208, pole: 250 };
/**
 * Charon at phase ph of his stroke (facing right): the long push, the pole's foot planted behind him on the river bed
 * as the boat runs on past it, his body leaning into it; then the recovery, the pole lifted, dripping, swung forward
 * and planted again. The gunwale is at y = deck: his robe ends there (the hull is drawn over its foot), the pole goes
 * on down past the hull into the water.
 */
function charonFrame(c: Ctx, ph: number): void {
  const deck = CHARON.deck;
  const fx = CHARON.footX;
  const pushing = ph < 0.62;
  const p = pushing ? ph / 0.62 : 1;
  const q = pushing ? 0 : (ph - 0.62) / 0.38;
  // lean into the push, straighten in the recovery
  const lean = pushing ? Math.sin(p * Math.PI * 0.5) * 0.28 : 0.28 * (1 - smooth(0, 1, q));
  // the pole's foot: under the water behind him, sliding back as the boat goes on; lifted and swung forward after
  const wl = deck + (BOAT.water - BOAT.deck);
  const bx = pushing ? fx + 18 - p * 92 : fx - 74 + smooth(0, 1, q) * 92;
  const by = wl + 26 - (pushing ? 0 : Math.sin(q * Math.PI) * 56);
  // the grip, at his chest
  const sh: Pt = [fx + 10 + lean * 70, deck - 92 + lean * 18];
  const grip: Pt = [sh[0] + 22 + lean * 8, sh[1] + 22];
  const ang = Math.atan2(grip[0] - bx, by - grip[1]);
  const L = CHARON.pole;
  const top: Pt = [bx + Math.sin(ang) * L, by - Math.cos(ang) * L];
  // the pole (behind his near arm): dark wood, wet below where it has been in the water
  c.lineCap = 'round';
  c.strokeStyle = '#0a0604';
  c.lineWidth = 5.5;
  c.beginPath();
  c.moveTo(bx, by);
  c.lineTo(top[0], top[1]);
  c.stroke();
  c.strokeStyle = '#4a3020';
  c.lineWidth = 2.6;
  c.stroke();
  c.strokeStyle = 'rgba(255,130,90,0.4)';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(bx - 1.5, by);
  c.lineTo(top[0] - 1.5, top[1]);
  c.stroke();
  // his robe: one long hooded silhouette leaning into the stroke, its hem ragged
  const hx = sh[0] + 6 + lean * 20;
  const hy = sh[1] - 26;
  const robe = (g: Ctx) => {
    g.beginPath();
    g.moveTo(fx - 26, deck + 2);
    g.quadraticCurveTo(fx - 28 + lean * 10, deck - 60, sh[0] - 20, sh[1] + 4);
    // the hood
    g.quadraticCurveTo(hx - 22, hy - 4, hx - 6, hy - 18);
    g.quadraticCurveTo(hx + 12, hy - 22, hx + 16, hy + 2);
    g.quadraticCurveTo(hx + 14, hy + 12, sh[0] + 14, sh[1] + 6);
    g.quadraticCurveTo(fx + 26 + lean * 30, deck - 50, fx + 24 + lean * 20, deck + 2);
    g.closePath();
  };
  const rb = { x: fx - 34, y: hy - 24, w: 90, h: deck - hy + 26 };
  robe(c);
  const rg = c.createLinearGradient(rb.x, 0, rb.x + rb.w, 0);
  rg.addColorStop(0, '#3a2a36');
  rg.addColorStop(0.4, '#1c1622');
  rg.addColorStop(1, '#0c0a10');
  c.fillStyle = rg;
  c.fill();
  c.save();
  robe(c);
  c.clip();
  // folds hanging from the shoulders, the pit's red on his back, his lantern's green on his front
  c.strokeStyle = 'rgba(0,0,0,0.5)';
  c.lineWidth = 1.6;
  for (const d of [-14, -4, 6, 16]) {
    c.beginPath();
    c.moveTo(sh[0] + d * 0.6, sh[1] + 10);
    c.quadraticCurveTo(fx + d + lean * 30, deck - 40, fx + d * 1.3 + lean * 14, deck + 2);
    c.stroke();
  }
  const bg = c.createLinearGradient(rb.x, 0, rb.x + 30, 0);
  bg.addColorStop(0, 'rgba(255,100,60,0.6)');
  bg.addColorStop(1, 'rgba(255,90,50,0)');
  c.fillStyle = bg;
  c.fillRect(rb.x, rb.y, 30, rb.h);
  const fg = c.createLinearGradient(rb.x + rb.w, 0, rb.x + rb.w - 26, 0);
  fg.addColorStop(0, 'rgba(110,255,190,0.35)');
  fg.addColorStop(1, 'rgba(110,255,190,0)');
  c.fillStyle = fg;
  c.fillRect(rb.x + rb.w - 26, rb.y, 26, rb.h);
  c.restore();
  c.strokeStyle = '#030204';
  c.lineWidth = 2.2;
  robe(c);
  c.stroke();
  // the hot rim down his back and over his hood, from the pit and the fall behind him
  c.save();
  robe(c);
  c.clip();
  c.strokeStyle = 'rgba(255,120,70,0.7)';
  c.lineWidth = 3;
  c.translate(2.5, 1.5);
  robe(c);
  c.stroke();
  c.restore();
  // the dark inside the hood and two cold points of light
  c.fillStyle = '#030204';
  c.beginPath();
  c.ellipse(hx + 6, hy - 2, 7, 9, -0.2, 0, P2);
  c.fill();
  c.fillStyle = 'rgba(160,255,220,0.9)';
  c.fillRect(hx + 6, hy - 4, 2.2, 1.6);
  c.fillRect(hx + 10.5, hy - 3.5, 2, 1.5);
  // the near arm, a ragged sleeve reaching to the pole, and his bony hands on it
  const lower: Pt = [bx + Math.sin(ang) * (L * 0.38), by - Math.cos(ang) * (L * 0.38)];
  const upper: Pt = [grip[0] + Math.sin(ang) * 26, grip[1] - Math.cos(ang) * 26];
  for (const [hand, from] of [[upper, [sh[0] + 4, sh[1] + 6]], [lower, [sh[0] + 8, sh[1] + 16]]] as [Pt, Pt][]) {
    c.strokeStyle = '#0a080e';
    c.lineWidth = 9;
    c.beginPath();
    c.moveTo(from[0], from[1]);
    c.quadraticCurveTo((from[0] + hand[0]) / 2 + 4, Math.max(from[1], hand[1]) + 8, hand[0] - 3, hand[1]);
    c.stroke();
    c.strokeStyle = '#241c2a';
    c.lineWidth = 5.5;
    c.stroke();
    c.fillStyle = '#c8c0a8';
    c.beginPath();
    c.ellipse(hand[0], hand[1], 3.4, 2.6, ang, 0, P2);
    c.fill();
    c.strokeStyle = '#3a3028';
    c.lineWidth = 0.8;
    c.stroke();
  }
  // drips off the lifted pole
  if (!pushing && q > 0.1 && q < 0.8) {
    c.fillStyle = 'rgba(160,240,230,0.7)';
    for (let k = 0; k < 3; k++) {
      c.beginPath();
      c.ellipse(bx + k * 0.5, by + 6 + k * 8 + q * 10, 1, 1.8, 0, 0, P2);
      c.fill();
    }
  }
}

// the pole's foot in frame coordinates (for the live layer's rings): same maths as charonFrame
const POLE_PLANT_PH = 0.0;

const FERRY_STILL = { x: 1420, scale: 0.78 };
/** Charon's stroke, painted at this many phases. */
const CH_N = 12;
function ferryStill(ctx: Ctx): void {
  const [cv, g] = makeCanvas(BOAT.w, BOAT.h);
  boatPaint(g);
  const [cc, g2] = makeCanvas(CHARON.w, CHARON.h);
  charonFrame(g2, 0.3);
  const s = FERRY_STILL.scale;
  const y = sy(0, TA.ferryZ);
  ctx.save();
  ctx.translate(FERRY_STILL.x, y);
  ctx.scale(s, s);
  ctx.drawImage(cv, -BOAT.w / 2, -BOAT.water);
  ctx.drawImage(cc, -BOAT.w / 2 + 40, -BOAT.water - CHARON.deck + BOAT.deck);
  ctx.drawImage(cv, 0, 0, BOAT.w, BOAT.water + 4, -BOAT.w / 2, -BOAT.water, BOAT.w, BOAT.water + 4);
  ctx.restore();
  void POLE_PLANT_PH;
}

// ——— the near bank ———

/** A hexagonal basalt column standing on the ground at (X, z): radius rad, its top at Y (broken tops slope). */
interface Hex {
  X: number;
  z: number;
  rad: number;
  Y: number;
  rot: number;
  tilt: number;
}

function hexColumn(ctx: Ctx, r: R, h: Hex): void {
  const verts = (Y: number, tilt = 0): Pt[] =>
    Array.from({ length: 6 }, (_, i) => {
      const a = h.rot + (i * Math.PI) / 3;
      const X = h.X + Math.cos(a) * h.rad;
      const z = h.z + Math.sin(a) * h.rad;
      return P(X, Y + tilt * Math.cos(a), z);
    });
  const top = verts(h.Y, h.tilt);
  const bot = verts(0);
  const k = pz(h.z);
  // the faces turned to us, back to front; each shaded by the way it faces
  const faces: { i: number; nx: number; nz: number; d: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const am = h.rot + ((i + 0.5) * Math.PI) / 3;
    const nx = Math.cos(am);
    const nz = Math.sin(am);
    const vis = nx * -h.X + nz * -h.z;
    if (vis > 0) faces.push({ i, nx, nz, d: vis });
  }
  faces.sort((a, b) => a.d - b.d);
  const [bXs, bZs] = TA.braziers[h.X < 0 ? 0 : 1];
  let lx = bXs - h.X;
  let lz = bZs - h.z;
  const ll = Math.hypot(lx, lz);
  lx /= ll;
  lz /= ll;
  const reach = clamp01(1.5 - ll * 0.45);
  groundShadow(ctx, sx(h.X, h.z) + k * 0.12, sy(0, h.z) + 2, k * h.rad * 1.6, k * h.rad * 0.4, 0.55, '#000000');
  for (const f of faces) {
    const j = (f.i + 1) % 6;
    const quad: Pt[] = [bot[f.i], bot[j], top[j], top[f.i]];
    const path = polyPath(quad);
    // lit by the soul-fire beside it (cold blue on the faces turned to it), the key faint from the left
    const blue = clamp01(f.nx * lx + f.nz * lz) * reach;
    const key = clamp01(-f.nx * 0.8 - f.nz * 0.4);
    const lit = Math.max(blue, key * 0.5);
    const col = mix(mix('#120e16', '#40587e', blue * 0.75), '#5a4248', key * 0.3);
    ctx.fillStyle = col;
    path(ctx);
    ctx.fill();
    within(ctx, path, () => {
      const fb = boxOfPts(quad, 1);
      // its joints across it
      for (let Y = 0.12 + r() * 0.15; Y < h.Y - 0.05; Y += 0.14 + r() * 0.22) {
        const a0 = P(h.X + Math.cos(h.rot + (f.i * Math.PI) / 3) * h.rad, Y, h.z + Math.sin(h.rot + (f.i * Math.PI) / 3) * h.rad);
        const a1 = P(h.X + Math.cos(h.rot + (j * Math.PI) / 3) * h.rad, Y, h.z + Math.sin(h.rot + (j * Math.PI) / 3) * h.rad);
        ctx.strokeStyle = 'rgba(0,0,0,0.55)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(a0[0], a0[1]);
        ctx.lineTo(a1[0], a1[1]);
        ctx.stroke();
        ctx.strokeStyle = rgba('#a8909a', 0.12 + lit * 0.12);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a0[0], a0[1] + 1.5);
        ctx.lineTo(a1[0], a1[1] + 1.5);
        ctx.stroke();
      }
      // the ground's dark creeping up its foot
      vfill(ctx, fb.x, fb.y + fb.h - 30, fb.w, 30, [[0, 'rgba(4,2,6,0)'], [1, 'rgba(4,2,6,0.6)']]);
    });
    ctx.strokeStyle = 'rgba(2,1,4,0.85)';
    ctx.lineWidth = 1;
    path(ctx);
    ctx.stroke();
  }
  // the top, when it's below our eye: a hexagon lit by the glowing smoke over the cavern, the pit's red on its far
  // edge
  if (h.Y < 0.97) {
    const tp = polyPath(top);
    ctx.fillStyle = mix('#5a4652', '#7a3a34', 0.35);
    tp(ctx);
    ctx.fill();
    within(ctx, tp, () => {
      const tb = boxOfPts(top, 1);
      lay(ctx, drift('#8a6a70', '#2a1c24', 2, Math.round(h.X * 77 + h.z * 13), 16, 16), tb, 0.5);
      const g = ctx.createLinearGradient(0, tb.y, 0, tb.y + tb.h);
      g.addColorStop(0, 'rgba(255,110,60,0.35)');
      g.addColorStop(1, 'rgba(255,110,60,0)');
      ctx.fillStyle = g;
      ctx.fillRect(tb.x, tb.y, tb.w, tb.h);
      // ash lying in its pits
      lay(ctx, noiseMask(3, Math.round(h.X * 31 + h.z * 7), { cover: 0.35, soft: 0.3, col: '#8a8088', w: 12, h: 12 }), tb, 0.35);
    });
    ctx.strokeStyle = 'rgba(2,1,4,0.9)';
    ctx.lineWidth = 1.2;
    tp(ctx);
    ctx.stroke();
    // its near edges catch the light
    ctx.strokeStyle = 'rgba(200,170,180,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const f of faces) {
      const j = (f.i + 1) % 6;
      ctx.moveTo(top[f.i][0], top[f.i][1]);
      ctx.lineTo(top[j][0], top[j][1]);
    }
    ctx.stroke();
  } else {
    // above our eye: a broken end against the cavern, a hot rim from the pit behind
    ctx.strokeStyle = 'rgba(255,110,50,0.35)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  }
}

/** The stepped clusters of basalt columns at either side of our bank, tall at the frame's edge, stepping down to
 * the water towards the middle. */
const HEXES: Hex[] = (() => {
  const r = rng(hashStr('ta:hexes'));
  const out: Hex[] = [];
  const rad = 0.12;
  const rowZ = rad * Math.sqrt(3);
  for (const d of [-1, 1]) {
    for (let c = 0; c < 12; c++) {
      const X = d * (3.55 - c * rad * 1.5);
      for (let row = 0; row < 7; row++) {
        const z = 3.15 + row * rowZ + (c % 2) * rowZ * 0.5;
        if (Math.abs(X) < 1.72 + (z - 3.1) * 0.25) continue;
        const x = sx(X, z);
        if (x < -70 || x > W + 70) continue;
        const outer = clamp01((Math.abs(X) - 1.8) / 1.6);
        let Y = 0.12 + outer ** 1.5 * 1.15 + (r() - 0.5) * 0.14 - (z - 3.15) * 0.14;
        if (r() < 0.07) Y += 0.35;
        out.push({ X, z, rad: rad * (0.95 + r() * 0.05), Y: Math.max(0.06, Y), rot: (r() - 0.5) * 0.12, tilt: (r() - 0.5) * 0.04 });
      }
    }
  }
  // far to near
  return out.sort((a, b) => b.z - a.z);
})();

function bankPath(): (c: Ctx) => void {
  return (c) => {
    c.beginPath();
    for (let x = -10; x <= W + 10; x += 10) c.lineTo(x, nearEdge(x));
    c.lineTo(W + 10, TY + 2);
    c.lineTo(-10, TY + 2);
    c.closePath();
  };
}

export const BANK_BOX = { x: 0, y: 640, w: W, h: TY - 640 };

function bank(ctx: Ctx, r: R): void {
  const path = bankPath();
  const b = BANK_BOX;
  ctx.fillStyle = '#1e1820';
  path(ctx);
  ctx.fill();
  within(ctx, path, () => {
    surface(ctx, r, b, '#1e1820', { over: true, vary: 0.6, cells: 7, mottle: 0.6, strokes: 0.25, strokeAng: 0.02, strokeLen: 200, strokeW: 10, warm: '#4a3238', cool: '#0e0e1c', seed: 61 });
    grain(ctx, b, 'stone', 0.3, 1.3);
    // ash: drifts of it, pale on top, banked against things
    lay(ctx, noiseMask(10, 63, { cover: 0.42, soft: 0.25, col: '#6a6068', w: 200, h: 20 }), b, 0.45);
    // the shore: a wet black lip, cold light off the water on it
    crevice(ctx, 0, W, 640, 26, 0.55, '#020104');
    ctx.strokeStyle = 'rgba(120,230,210,0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 10) ctx.lineTo(x, nearEdge(x) + 1.5);
    ctx.stroke();
    // the soul-fires' blue on the ground round them, and the pit's red faint down the middle
    for (const [X, z] of TA.braziers) {
      const [x, y] = P(X, 0, z);
      lightPool(ctx, x, y, 300, 56, '#3a7aff', 0.2);
      lightPool(ctx, x, y, 140, 26, '#8ad0ff', 0.25);
    }
    lightPool(ctx, 960, 660, 600, 50, '#ff5a2a', 0.08);
    // the table's back edge throws the bank behind it into shade
    crevice(ctx, 0, W, TY, -46, 0.5, '#000000');
  });
  path_(ctx, r);
  for (const f of FISSURES) fissure(ctx, f);
}

/** Either side of our bank: the stepped basalt columns, the broken column in its chains, asphodel and bones. */
function side(ctx: Ctx, r: R, left: boolean): void {
  for (const h of HEXES) if (h.X < 0 === left) hexColumn(ctx, r, h);
  pillar(ctx, left ? 0 : 1);
  ash(ctx, r, left);
}

/** The path of flagstones from the table to the jetty: irregular slabs in courses, worn, their edges chipped. */
function path_(ctx: Ctx, r: R): void {
  const z0 = 2.95;
  const z1 = TA.jetty.z0 + 0.05;
  const hw = (z: number) => 0.48 + (z1 - z) * 0.08;
  let z = z0;
  while (z < z1) {
    const dz = 0.16 + r() * 0.08;
    const za = z;
    const zb = Math.min(z1, z + dz);
    z = zb;
    let X = -hw(za) - r() * 0.1;
    const end = hw(za) + r() * 0.1;
    while (X < end) {
      const w = 0.26 + r() * 0.28;
      const Xa = X;
      const Xb = Math.min(end, X + w);
      X = Xb;
      const g = 0.018;
      const j = () => (r() - 0.5) * 0.025;
      const pts: Pt[] = [P(Xa + g + j(), 0.005, za + g), P(Xb - g + j(), 0.005, za + g), P(Xb - g + j(), 0.005, zb - g), P(Xa + g + j(), 0.005, zb - g)];
      const p = polyPath(pts);
      const pb = boxOfPts(pts, 1);
      const mid = 1 - Math.min(1, Math.abs((Xa + Xb) / 2) / 0.6);
      ctx.fillStyle = mix('#3a3040', '#4a3e4c', mid * 0.6 + r() * 0.2);
      p(ctx);
      ctx.fill();
      within(ctx, p, () => {
        lay(ctx, drift('#6a5a68', '#1a1420', 2, Math.round(Xa * 100 + za * 37), 24, 12), pb, 0.45);
        // worn smooth and paler down the middle; the pit's red glancing off the polish
        ctx.fillStyle = rgba('#ff7a50', 0.07 * mid);
        ctx.fillRect(pb.x, pb.y, pb.w, pb.h);
        // its far edge in shadow, its near edge lit
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(pb.x, pb.y, pb.w, Math.max(1.5, pb.h * 0.18));
      });
      ctx.strokeStyle = 'rgba(4,2,6,0.85)';
      ctx.lineWidth = 1.2;
      p(ctx);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(190,170,190,0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pts[3][0], pts[3][1] - 1);
      ctx.lineTo(pts[2][0], pts[2][1] - 1);
      ctx.stroke();
      if (r() < 0.35) {
        const [cx, cy] = P((Xa + Xb) / 2, 0, (za + zb) / 2);
        crack(ctx, r, cx - pb.w * 0.3, cy, (r() - 0.5) * 0.6, pb.w * 0.5, { col: '#040206', lip: '#6a5a68', w: 1, a: 0.6 });
      }
    }
  }
}

type Fissure = Pt[];
const FISSURES: Fissure[] = [
  [[420, 702], [470, 712], [520, 704], [580, 722], [620, 744]],
  [[1330, 742], [1372, 718], [1430, 726], [1500, 712]],
];
/** A fissure in the rock with lava in it: its heat on the stone round it, a dark crust lip, the molten core. */
function fissure(ctx: Ctx, pts: Fissure): void {
  const line = (c: Ctx) => {
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  };
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  softly(ctx, boxOfPts(pts, 30), (q) => {
    q.strokeStyle = 'rgba(255,74,16,0.45)';
    q.lineWidth = 24;
    line(q);
    q.stroke();
  }, 0.25, 'lighter');
  ctx.strokeStyle = 'rgba(18,6,8,0.85)';
  ctx.lineWidth = 6;
  line(ctx);
  ctx.stroke();
  const n = pts.length - 1;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const w = Math.sin(t * Math.PI) ** 0.7;
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    for (const [kk, col, al] of [[3, '#e0561a', 0.7], [1, '#ffb060', 0.65]] as const) {
      ctx.strokeStyle = rgba(col, al);
      ctx.lineWidth = Math.max(0.6, kk * w);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ——— the jetty ———

const LANTERN: Pt = P(-TA.jetty.hw + 0.1, 0.5, TA.jetty.z1 - 0.06);
export const JETTY_BOX = (() => {
  const j = TA.jetty;
  return boxOfPts([P(-j.hw - 0.08, 0.66, j.z1), P(j.hw + 0.08, -0.05, j.z0), P(-j.hw - 0.08, -0.05, j.z0)], 16);
})();

/** Charon's jetty: weathered planks laid across two stringers on piles, a missing plank, a coil of rope, a lantern
 * post at its end with a cold green flame in a bronze cage. */
function jetty(ctx: Ctx, r: R): void {
  const j = TA.jetty;
  const Yd = j.deck;
  // the piles, far to near: dark, wet to the waterline, slimed; their reflections
  const piles: [number, number][] = [];
  for (const z of [j.z1 - 0.04, j.z1 - 0.42, j.z1 - 0.8]) for (const X of [-j.hw - 0.02, j.hw + 0.02]) piles.push([X, z]);
  for (const [X, z] of piles) {
    const k = pz(z);
    const pw = 0.06 * k;
    const [x, yTop] = P(X, Yd + 0.05, z);
    const [, yW] = P(X, 0, z);
    ctx.fillStyle = 'rgba(2,4,6,0.6)';
    ctx.fillRect(x - pw / 2, yW, pw, pw * 2.4);
    const p = polyPath([[x - pw / 2, yTop], [x + pw / 2, yTop], [x + pw / 2, yW + 2], [x - pw / 2, yW + 2]]);
    ctx.fillStyle = '#2a2024';
    p(ctx);
    ctx.fill();
    within(ctx, p, () => {
      vfill(ctx, x - pw, yTop, pw * 2, yW - yTop, [[0, '#4a3a36'], [0.5, '#241a1c'], [1, '#0a0c0e']]);
      ctx.fillStyle = 'rgba(80,140,120,0.35)';
      ctx.fillRect(x - pw, yW - pw * 0.6, pw * 2, pw * 0.5);
    });
    ctx.strokeStyle = '#040204';
    ctx.lineWidth = 1;
    p(ctx);
    ctx.stroke();
    // the ring of water round its foot
    ctx.strokeStyle = 'rgba(120,220,210,0.3)';
    ctx.beginPath();
    ctx.ellipse(x, yW + 1, pw * 0.9, pw * 0.22, 0, 0, P2);
    ctx.stroke();
  }
  // the deck: planks across, grey with age, gaps between, one gone, nail heads rusted
  const z0 = j.z0;
  const z1 = j.z1;
  const deck = polyPath([P(-j.hw, Yd, z1), P(j.hw, Yd, z1), P(j.hw, Yd, z0), P(-j.hw, Yd, z0)]);
  // its shadow on the water and the bank under it
  ctx.save();
  ctx.translate(6, 10);
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#000000';
  deck(ctx);
  ctx.fill();
  ctx.restore();
  const pw = 0.085;
  let n = 0;
  for (let z = z1; z > z0 + 0.01; z -= pw, n++) {
    const za = Math.max(z0, z - pw + 0.012);
    if (n === 4) continue;
    const jag = (r() - 0.5) * 0.04;
    const plank = polyPath([P(-j.hw - 0.02 + jag, Yd, z), P(j.hw + 0.02 + jag, Yd, z), P(j.hw + 0.02 + jag, Yd, za), P(-j.hw - 0.02 + jag, Yd, za)]);
    const pb = boxOfPts([P(-j.hw - 0.03, Yd, z), P(j.hw + 0.03, Yd, za)], 1);
    ctx.fillStyle = mix('#6a6260', '#4a3e3a', r());
    plank(ctx);
    ctx.fill();
    within(ctx, plank, () => {
      // the grain along it, split ends, the pit's red on its worn top
      ctx.strokeStyle = 'rgba(20,14,14,0.45)';
      ctx.lineWidth = 0.8;
      for (let g = 0; g < 3; g++) {
        const yy = pb.y + (pb.h * (g + 0.5)) / 3;
        ctx.beginPath();
        ctx.moveTo(pb.x, yy + (r() - 0.5));
        ctx.bezierCurveTo(pb.x + pb.w * 0.3, yy + (r() - 0.5) * 2, pb.x + pb.w * 0.7, yy + (r() - 0.5) * 2, pb.x + pb.w, yy);
        ctx.stroke();
      }
      ctx.fillStyle = rgba('#ff8a5a', 0.08);
      ctx.fillRect(pb.x, pb.y, pb.w, pb.h);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(pb.x, pb.y + pb.h - 1.5, pb.w, 1.5);
    });
    ctx.strokeStyle = 'rgba(10,6,6,0.9)';
    ctx.lineWidth = 0.9;
    plank(ctx);
    ctx.stroke();
    for (const X of [-j.hw + 0.05, j.hw - 0.05]) {
      const [nx, ny] = P(X, Yd, (z + za) / 2);
      ctx.fillStyle = '#3a1a10';
      ctx.fillRect(nx - 1, ny - 0.5, 2, 1.5);
    }
  }
  // through the missing plank: the stringers and the black water
  // a coil of rope on the deck by the post, and the mooring ring
  const [rx, ry] = P(j.hw - 0.12, Yd, z1 - 0.25);
  const rk = pz(z1 - 0.25);
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = i % 2 ? '#6a5a40' : '#4a3a28';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(rx, ry - i * 1.2, rk * (0.09 - i * 0.012), rk * 0.025, 0, 0, P2);
    ctx.stroke();
  }
  // the lantern post: a squared timber, an arm, a bronze cage with the cold flame
  const [px0, py0] = P(-j.hw + 0.02, Yd, z1 - 0.06);
  const [, pyT] = P(-j.hw + 0.02, 0.62, z1 - 0.06);
  const pk = pz(z1 - 0.06);
  const postW = 0.05 * pk;
  const post = polyPath([[px0 - postW / 2, pyT], [px0 + postW / 2, pyT], [px0 + postW / 2, py0 + 4], [px0 - postW / 2, py0 + 4]]);
  castShadow(ctx, post, 6, 4, 0.4, '#000000');
  solid(ctx, post, { x: px0 - postW / 2, y: pyT, w: postW, h: py0 - pyT }, 'wood', '#4a3a30', { depth: 0.3, air: CAVE, line: 1.4, formSize: 3 });
  within(ctx, post, () => {
    ctx.fillStyle = 'rgba(120,255,200,0.2)';
    ctx.fillRect(px0, pyT, postW / 2, 40);
  });
  const [lx, ly] = LANTERN;
  ctx.strokeStyle = '#1a100a';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(px0, pyT + 6);
  ctx.lineTo(lx + 2, pyT + 6);
  ctx.lineTo(lx + 2, ly - 12);
  ctx.stroke();
  glowAt(ctx, lx, ly, 40, '#6affc0', 0.22);
  ctx.fillStyle = '#5a3c1c';
  ctx.beginPath();
  ctx.roundRect(lx - 6, ly - 12, 13, 22, 2);
  ctx.fill();
  ctx.fillStyle = '#8affc8';
  ctx.fillRect(lx - 3.5, ly - 8, 8, 14);
  ctx.fillStyle = '#eafff2';
  ctx.fillRect(lx - 1, ly - 5, 3, 8);
  ctx.strokeStyle = '#140a04';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(lx - 6, ly - 12, 13, 22);
  ctx.beginPath();
  ctx.moveTo(lx + 0.5, ly - 12);
  ctx.lineTo(lx + 0.5, ly + 10);
  ctx.stroke();
  ctx.fillStyle = '#3a2410';
  ctx.beginPath();
  ctx.moveTo(lx - 8, ly - 12);
  ctx.lineTo(lx + 0.5, ly - 18);
  ctx.lineTo(lx + 9, ly - 12);
  ctx.fill();
}

// ——— the broken columns in chains ———

/** A link of a heavy bronze chain at (x, y) along direction ang: face-on (a ring) or edge-on (a bar). */
function link(ctx: Ctx, x: number, y: number, ang: number, s: number, face: boolean, lit = 1, squash = 1): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.scale(squash, 1);
  if (face) {
    ctx.strokeStyle = '#140a04';
    ctx.lineWidth = s * 0.55;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.95, s * 0.55, 0, 0, P2);
    ctx.stroke();
    ctx.strokeStyle = mix(mix(BRZ.shade, BRZ.body, 0.35), BRZ.green, 0.25);
    ctx.lineWidth = s * 0.32;
    ctx.stroke();
    ctx.strokeStyle = rgba(BRZ.lit, 0.5 * lit);
    ctx.lineWidth = s * 0.14;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.95, s * 0.55, 0, Math.PI * 1.05, Math.PI * 1.7);
    ctx.stroke();
    ctx.strokeStyle = rgba(BRZ.green, 0.5);
    ctx.lineWidth = s * 0.12;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.95, s * 0.55, 0, Math.PI * 0.2, Math.PI * 0.6);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#140a04';
    ctx.beginPath();
    ctx.roundRect(-s * 1.05, -s * 0.24, s * 2.1, s * 0.48, s * 0.24);
    ctx.fill();
    ctx.fillStyle = BRZ.shade;
    ctx.beginPath();
    ctx.roundRect(-s * 0.95, -s * 0.15, s * 1.9, s * 0.3, s * 0.15);
    ctx.fill();
    ctx.fillStyle = rgba(BRZ.lit, 0.7 * lit);
    ctx.fillRect(-s * 0.7, -s * 0.14, s * 1.3, s * 0.08);
  }
  ctx.restore();
}

/** A chain of real links along a curve given as points (squash(t): how foreshortened the links are along it). */
function chain(ctx: Ctx, pts: Pt[], s: number, lit = 1, squash: (t: number) => number = () => 1): void {
  const seg: number[] = [0];
  for (let i = 1; i < pts.length; i++) seg.push(seg[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = seg[seg.length - 1];
  let n = 0;
  for (let d = s; d < total; n++) {
    let i = 1;
    while (i < seg.length - 1 && seg[i] < d) i++;
    const t = (d - seg[i - 1]) / Math.max(0.001, seg[i] - seg[i - 1]);
    const x = pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t;
    const y = pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t;
    const ang = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]);
    const q = squash(d / total);
    link(ctx, x, y, ang, s, n % 2 === 0, lit * (0.6 + q * 0.4), q);
    d += s * 1.5 * Math.max(0.35, q);
  }
}
const sag = (x0: number, y0: number, x1: number, y1: number, s: number, n = 24): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * s] as Pt;
  });

function pillar(ctx: Ctx, i: number): void {
  const p = TA.pillars[i];
  const k = pz(p.z);
  const side = p.X < 0 ? -1 : 1;
  const [x, yb] = P(p.X, 0, p.z);
  const [, yp] = P(p.X, 0.16, p.z);
  const [, yt] = P(p.X, p.top, p.z);
  const rad = p.rad * k;
  const rTop = rad * 0.9;
  // the plinth: a square block, a corner broken off it
  const pw = rad * 1.35;
  const plinth = polyPath([[x - pw, yp], [x + pw, yp], [x + pw, yb], [x - pw, yb]]);
  groundShadow(ctx, x + k * 0.15, yb + 2, pw * 1.5, k * 0.06, 0.65, '#000000', 1.3);
  solid(ctx, plinth, { x: x - pw, y: yp, w: pw * 2, h: yb - yp }, 'stone', '#4a4252', { depth: 0.15, air: CAVE, line: 1.6, formSize: 6 });
  within(ctx, plinth, () => {
    vfill(ctx, x - pw, yp, pw * 2, yb - yp, [[0, 'rgba(180,170,200,0.12)'], [1, 'rgba(0,0,0,0.35)']]);
    ctx.fillStyle = '#16121a';
    ctx.beginPath();
    ctx.moveTo(x + side * pw, yp);
    ctx.lineTo(x + side * pw * 0.6, yp);
    ctx.lineTo(x + side * pw * 0.78, yp + (yb - yp) * 0.5);
    ctx.lineTo(x + side * pw, yp + (yb - yp) * 0.62);
    ctx.fill();
  });
  // the shaft, fluted, tapering, broken off in a jagged break
  const sr = rng(hashStr('ta:pillar' + p.seed));
  const pts: Pt[] = [[x - rad, yp], [x - rTop, yt + 10]];
  for (let j = 1; j < 7; j++) pts.push([x - rTop + (rTop * 2 * j) / 7, yt + (j % 2 ? -10 : 8) + (sr() - 0.5) * 12 + (j > 3 ? side * 6 : 0)]);
  pts.push([x + rTop, yt + 4], [x + rad, yp]);
  const shaft = polyPath(pts);
  const sb = boxOfPts(pts, 2);
  castShadow(ctx, shaft, 18, 16, 0.45, '#000000');
  ctx.fillStyle = '#3e3846';
  shaft(ctx);
  ctx.fill();
  within(ctx, shaft, () => {
    // the cylinder: the soul-fire's blue on the side towards its tripod, the pit's red on the far edge, dark between
    const g = ctx.createLinearGradient(x - rad, 0, x + rad, 0);
    const blue = side < 0 ? 1 : 0;
    g.addColorStop(0, side < 0 ? '#5a3a36' : '#3a5274');
    g.addColorStop(0.15, side < 0 ? '#3e3644' : '#44506a');
    g.addColorStop(0.45, '#3a3442');
    g.addColorStop(0.75, '#241f2c');
    g.addColorStop(0.92, side < 0 ? '#3a5274' : '#2a2430');
    g.addColorStop(1, side < 0 ? '#4a6a94' : '#5a3a36');
    ctx.fillStyle = g;
    ctx.fillRect(sb.x, sb.y, sb.w, sb.h);
    void blue;
    // twenty flutes, ten in view
    for (let f = 1; f < 10; f++) {
      const a = -Math.PI / 2 + (f / 10) * Math.PI;
      const u = Math.sin(a);
      ctx.strokeStyle = 'rgba(10,6,20,0.35)';
      ctx.lineWidth = Math.max(1, Math.cos(a) * 3.4);
      ctx.beginPath();
      ctx.moveTo(x + u * rTop, yt);
      ctx.lineTo(x + u * rad, yp);
      ctx.stroke();
      ctx.strokeStyle = rgba('#d8d0ff', 0.08 + Math.max(0, -u) * 0.12);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x + u * rTop + 2.5, yt);
      ctx.lineTo(x + u * rad + 2.5, yp);
      ctx.stroke();
    }
    lay(ctx, drift('#8a80a0', '#141020', 3, 17 + p.seed, 24, 96), sb, 0.4);
    lay(ctx, noiseMask(6, 30 + p.seed, { cover: 0.45, soft: 0.2, col: '#0a0610', w: 20, h: 90 }), sb, 0.35);
    streaks(ctx, sr, x, yt + 40, rad * 1.8, 260, '#08060c', 0.3, 7);
    // the drums' joints, one off true where it shifted
    for (let Y = 0.42; Y < p.top - 0.1; Y += 0.36) {
      const [, jy] = P(p.X, Y, p.z);
      const off = Y > 0.9 && Y < 1.3 ? side * 3 : 0;
      ctx.strokeStyle = 'rgba(6,4,10,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - rad + off, jy);
      ctx.quadraticCurveTo(x + off, jy + 5, x + rad + off, jy);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(200,190,230,0.14)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - rad + off, jy + 2);
      ctx.quadraticCurveTo(x + off, jy + 7, x + rad + off, jy + 2);
      ctx.stroke();
    }
    // soot up its foot, chips off its arrises, cracks from the break down
    vfill(ctx, sb.x, yb - 160, sb.w, 160, [[0, 'rgba(6,4,10,0)'], [1, 'rgba(6,4,10,0.55)']]);
    crack(ctx, sr, x + side * rTop * 0.3, yt + 14, Math.PI / 2 + side * 0.15, 140, { col: '#05030a', lip: '#b8b0e0', w: 1.8, a: 0.7 });
    crack(ctx, sr, x - rad * 0.8, yt + 230, 0.3, 50, { col: '#05030a', lip: '#b8b0e0', w: 1.4, a: 0.6 });
  });
  ctx.strokeStyle = inkOfStone;
  ctx.lineWidth = 2.4;
  shaft(ctx);
  ctx.stroke();
  // the break's broken edge, rim-lit by the abyss behind
  ctx.strokeStyle = 'rgba(255,120,60,0.45)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  pts.slice(1, -2).forEach(([px, py], j) => (j ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.stroke();
  // the chains: two bands wrapped round it, the links foreshortened towards its edges; a third run out to a ring
  // in a boulder at its foot, sagging
  const s = k * 0.035;
  for (const [Y, tilt] of [[p.top * 0.62, 0.05], [p.top * 0.34, -0.04]] as const) {
    const [, cy] = P(p.X, Y, p.z);
    const band: Pt[] = [];
    for (let j = 0; j <= 16; j++) {
      const a = -Math.PI / 2 + (j / 16) * Math.PI;
      const rr = rad * (1 - (Y / p.top) * 0.1) + s * 0.5;
      band.push([x + Math.sin(a) * rr, cy + Math.cos(a) * rr * 0.22 + Math.sin(a) * rr * tilt + 3]);
    }
    castShadow(ctx, (c) => {
      c.beginPath();
      band.forEach(([bx, by], j) => (j ? c.lineTo(bx, by) : c.moveTo(bx, by)));
      c.lineTo(band[band.length - 1][0], band[band.length - 1][1] + s);
      c.lineTo(band[0][0], band[0][1] + s);
      c.closePath();
    }, 4, 3, 0.5, '#000000');
    chain(ctx, band, s, 0.65, (t) => Math.max(0.3, Math.sin(t * Math.PI)));
  }
  const [, cy] = P(p.X, p.top * 0.34, p.z);
  const ax = x - side * k * 0.6;
  const ay = yb + k * 0.02;
  // the boulder and its ring
  const boulder = (c: Ctx) => {
    c.beginPath();
    c.ellipse(ax, ay - k * 0.05, k * 0.14, k * 0.075, 0, Math.PI, 0);
    c.lineTo(ax + k * 0.15, ay);
    c.lineTo(ax - k * 0.15, ay);
    c.closePath();
  };
  groundShadow(ctx, ax + 8, ay + 2, k * 0.18, k * 0.03, 0.6, '#000000');
  solid(ctx, boulder, { x: ax - k * 0.15, y: ay - k * 0.13, w: k * 0.3, h: k * 0.13 }, ROCK, '#2a2430', { depth: 0.12, air: CAVE, formSize: 8 });
  const run = sag(x - side * rad * 0.95, cy + 4, ax, ay - k * 0.1, k * 0.1);
  chain(ctx, run, s, 0.65);
  ctx.strokeStyle = '#140a04';
  ctx.lineWidth = s * 0.6;
  ctx.beginPath();
  ctx.ellipse(ax, ay - k * 0.1, s * 1.2, s * 1.4, 0, 0, P2);
  ctx.stroke();
  ctx.strokeStyle = BRZ.body;
  ctx.lineWidth = s * 0.3;
  ctx.stroke();
}
const inkOfStone = '#0e0a14';
/** Cast bronze: duller than the kit's chrome, its highlights warm. */
const BRONZE_M = { name: 'Bronze', base: BRZ.body, shadowTint: '#1a0c08', ramp: 0.8, form: 0.6, bevel: 0.45, rim: 0.5, tex: 'cast' as const, texA: 0.3, texScale: 1.2, specA: 0.35, specSize: 0.14 };
const ROCK = { name: 'Basalt', base: '#2e2a36', shadowTint: '#0c0818', ramp: 0.6, form: 0.6, bevel: 0.4, rim: 0.5, tex: 'cast' as const, texA: 0.35, texScale: 1.3, specA: 0.05, specSize: 0.2 };

// ——— the soul-fire tripods ———

function brazierBox(i: number): Box {
  const [X, z] = TA.braziers[i];
  return boxOfPts([P(X - 0.36, TA.bowlY + 0.06, z), P(X + 0.36, -0.06, z)], 8);
}

/** A bronze tripod: three legs on lion's paws, a ring tying them, a stem and a deep bowl banded with key pattern
 * (the blue fire in it is the live layer's). Legs front-on, standing on the ground. */
function brazier(ctx: Ctx, X: number, z: number): void {
  const k = pz(z);
  const Y = TA.bowlY;
  const R0 = 0.125;
  const legTop = Y - 0.1;
  const footR = 0.16;
  const [fx, fy] = P(X, 0, z);
  groundShadow(ctx, fx + k * 0.06, fy + k * 0.02, k * 0.3, k * 0.06, 0.75, '#020104');
  const legs = [Math.PI * 0.5, Math.PI * 1.17, Math.PI * 1.83];
  const legPath = (a: number) => {
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const [tx, ty] = P(X + ca * 0.05, legTop, z + sa * 0.05);
    const [kx, ky] = P(X + ca * 0.075, 0.17, z + sa * 0.075);
    const [bx, by] = P(X + ca * footR, 0.04, z + sa * footR);
    const w = 0.022 * k;
    return (c: Ctx) => {
      c.beginPath();
      c.moveTo(tx - w * 0.8, ty);
      c.bezierCurveTo(kx - w * 1.1, ky, kx - w * 0.9 + (bx - kx) * 0.3, by - (by - ky) * 0.25, bx - w * 0.7, by);
      c.lineTo(bx + w * 0.7, by);
      c.bezierCurveTo(kx + w * 0.9 + (bx - kx) * 0.3, by - (by - ky) * 0.25, kx + w * 1.1, ky, tx + w * 0.8, ty);
      c.closePath();
    };
  };
  const paw = (a: number) => {
    const [px, py] = P(X + Math.cos(a) * footR, 0.02, z + Math.sin(a) * footR);
    groundShadow(ctx, px + 2, py + 2, k * 0.035, k * 0.012, 0.5, '#020104');
    const p = (c: Ctx) => {
      c.beginPath();
      c.ellipse(px, py, k * 0.03, k * 0.022, 0, Math.PI, 0);
      c.lineTo(px + k * 0.034, py + k * 0.015);
      c.lineTo(px - k * 0.034, py + k * 0.015);
      c.closePath();
    };
    solid(ctx, p, { x: px - k * 0.04, y: py - k * 0.03, w: k * 0.08, h: k * 0.05 }, BRONZE_M, BRZ.shade, { depth: 0.15, air: CAVE, line: Math.max(1, k * 0.006), formSize: 3 });
  };
  const legBox = boxOfPts([P(X - footR, legTop, z), P(X + footR, 0, z)], k * 0.05);
  const order = [...legs].sort((a, b) => Math.sin(b) - Math.sin(a));
  const ring = (front: boolean) => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 24; i++) {
      const a = front ? Math.PI + (i / 24) * Math.PI : (i / 24) * Math.PI;
      pts.push(P(X + Math.cos(a) * 0.085, 0.17, z + Math.sin(a) * 0.085));
    }
    ctx.strokeStyle = BRZ.deep;
    ctx.lineWidth = Math.max(1.2, k * 0.016);
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.strokeStyle = front ? BRZ.body : BRZ.shade;
    ctx.lineWidth = Math.max(0.8, k * 0.009);
    ctx.stroke();
  };
  for (const [i, a] of order.entries()) {
    if (i === 1) ring(false);
    solid(ctx, legPath(a), legBox, BRONZE_M, Math.sin(a) > 0 ? BRZ.shade : BRZ.body, { depth: 0.15, air: CAVE, line: Math.max(1, k * 0.006), formSize: 4 });
    paw(a);
  }
  ring(true);
  const [bx, by] = P(X, Y, z);
  const rx = R0 * k;
  const [, byl] = P(X, Y - 0.1, z);
  const [, sy0] = P(X, Y - 0.085, z);
  const [, sy1] = P(X, legTop - 0.015, z);
  const stem = polyPath([[bx - k * 0.025, sy0], [bx + k * 0.025, sy0], [bx + k * 0.035, sy1], [bx - k * 0.035, sy1]]);
  solid(ctx, stem, { x: bx - k * 0.04, y: sy0, w: k * 0.08, h: sy1 - sy0 + 2 }, BRONZE_M, BRZ.body, { depth: 0.15, air: CAVE, line: Math.max(1, k * 0.005), formSize: 3 });
  const bowl = (c: Ctx) => {
    c.beginPath();
    c.moveTo(bx - rx, by);
    c.bezierCurveTo(bx - rx * 0.96, by + (byl - by) * 0.7, bx - rx * 0.5, byl, bx, byl);
    c.bezierCurveTo(bx + rx * 0.5, byl, bx + rx * 0.96, by + (byl - by) * 0.7, bx + rx, by);
    c.lineTo(bx + rx * 1.05, by - k * 0.008);
    c.lineTo(bx - rx * 1.05, by - k * 0.008);
    c.closePath();
  };
  const bb = { x: bx - rx * 1.1, y: by - k * 0.02, w: rx * 2.2, h: byl - by + k * 0.03 };
  solid(ctx, bowl, bb, BRONZE_M, mix(BRZ.shade, BRZ.body, 0.5), { depth: 0.15, air: CAVE, line: Math.max(1.2, k * 0.006), formSize: 8, spec: false });
  within(ctx, bowl, () => {
    lay(ctx, noiseMask(5, Math.round(z * 100 + X * 10), { cover: 0.35, soft: 0.2, col: BRZ.green, w: 40, h: 16 }), bb, 0.45);
    // a band of key pattern round its belly: one unit per tenth of its width, centred
    const ky = by + (byl - by) * 0.32;
    const u = (rx * 2) / 10;
    const kh = (byl - by) * 0.22;
    ctx.strokeStyle = rgba(BRZ.deep, 0.75);
    ctx.lineWidth = Math.max(0.8, k * 0.005);
    for (let j = 0; j < 10; j++) {
      const x0 = bx - rx + j * u + u * 0.1;
      const w = u * 0.8;
      ctx.beginPath();
      ctx.moveTo(x0, ky + kh);
      ctx.lineTo(x0, ky);
      ctx.lineTo(x0 + w, ky);
      ctx.lineTo(x0 + w, ky + kh * 0.75);
      ctx.lineTo(x0 + w * 0.35, ky + kh * 0.75);
      ctx.lineTo(x0 + w * 0.35, ky + kh * 0.35);
      ctx.stroke();
    }
    // the cold fire's light down into it
    vfill(ctx, bb.x, by - 4, bb.w, (byl - by) * 0.45, [[0, rgba('#6ab8ff', 0.3)], [1, rgba('#6ab8ff', 0)]]);
  });
  within(ctx, bowl, () => vfill(ctx, bb.x, bb.y, bb.w, bb.h * 0.5, [[0, 'rgba(10,6,4,0.35)'], [1, 'rgba(10,6,4,0)']]));
  ctx.strokeStyle = mix(BRZ.body, '#bfe8ff', 0.35);
  ctx.lineWidth = Math.max(1.5, k * 0.012);
  ctx.beginPath();
  ctx.moveTo(bx - rx * 1.05, by - k * 0.004);
  ctx.lineTo(bx + rx * 1.05, by - k * 0.004);
  ctx.stroke();
  // the coals in the bowl, burning cold
  ctx.fillStyle = '#2a5aa8';
  ctx.beginPath();
  ctx.ellipse(bx, by - k * 0.006, rx * 0.92, k * 0.012, 0, 0, P2);
  ctx.fill();
  ctx.fillStyle = '#b8ecff';
  ctx.beginPath();
  ctx.ellipse(bx, by - k * 0.007, rx * 0.5, k * 0.006, 0, 0, P2);
  ctx.fill();
}

function soulFireStill(ctx: Ctx): void {
  for (const [i, [X, z]] of TA.braziers.entries()) {
    const k = pz(z);
    const [x, y] = P(X, TA.bowlY, z);
    glowAt(ctx, x, y - k * 0.14, k * 0.38, '#4fb8ff', 0.2);
    fireFrame(ctx, x, y + 3, k * 0.21, k * 0.32, 0.3 + i * 0.4, { tongues: 5, seed: 3 + i, cols: [SOUL.deep, SOUL.body, SOUL.core] });
  }
}

// ——— asphodel, bones ———

function asphodel(ctx: Ctx, r: R, x: number, y: number, s: number): void {
  // a tuft of narrow leaves
  ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (r() - 0.5) * 1.6;
    const len = (14 + r() * 16) * s;
    ctx.strokeStyle = mix('#2a3a30', '#4a5a48', r());
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(a) * len * 0.6, y + Math.sin(a) * len * 0.7, x + Math.cos(a) * len + (a < -Math.PI / 2 ? -4 : 4) * s, y + Math.sin(a) * len * 0.8);
    ctx.stroke();
  }
  // the stalks, and their spikes of grey-white star flowers, buds at the top
  const n = 1 + Math.floor(r() * 3);
  for (let j = 0; j < n; j++) {
    const h = (40 + r() * 34) * s;
    const lean = (r() - 0.5) * 12 * s;
    ctx.strokeStyle = '#2e3a30';
    ctx.lineWidth = 1.3 * s;
    ctx.beginPath();
    ctx.moveTo(x + (j - 1) * 3 * s, y);
    ctx.quadraticCurveTo(x + lean * 0.4, y - h * 0.5, x + lean, y - h);
    ctx.stroke();
    for (let f = 0; f < 8; f++) {
      const t = 0.45 + (f / 8) * 0.55;
      const fx = x + lean * t * t + (f % 2 ? 3 : -3) * s;
      const fy = y - h * t;
      const bud = f > 5;
      const fr = (bud ? 1.6 : 3.4) * s;
      ctx.fillStyle = bud ? '#6a6a62' : mix('#a8a49c', '#cfcbc2', r());
      ctx.beginPath();
      for (let pp = 0; pp < (bud ? 1 : 6); pp++) {
        const a = (pp / 6) * P2 + r() * 0.3;
        ctx.ellipse(fx + Math.cos(a) * fr * 0.55, fy + Math.sin(a) * fr * 0.4, fr * 0.5, fr * 0.24, a, 0, P2);
      }
      ctx.fill();
      if (!bud) {
        ctx.fillStyle = '#6a3a3a';
        ctx.fillRect(fx - 0.6 * s, fy - 0.6 * s, 1.2 * s, 1.2 * s);
      }
    }
  }
}

function skull(ctx: Ctx, x: number, y: number, s: number, turn = 0): void {
  const cr = (c: Ctx) => {
    c.beginPath();
    c.ellipse(x, y - 8 * s, 15 * s, 13 * s, 0, Math.PI * 0.9, Math.PI * 2.1);
    c.quadraticCurveTo(x + 12 * s, y + 3 * s, x + 7 * s, y + 6 * s);
    c.lineTo(x + 6 * s, y + 9 * s);
    c.lineTo(x - 6 * s, y + 9 * s);
    c.lineTo(x - 7 * s, y + 6 * s);
    c.quadraticCurveTo(x - 12 * s, y + 3 * s, x - 14.5 * s, y - 4 * s);
    c.closePath();
  };
  groundShadow(ctx, x + 5 * s, y + 9 * s, 18 * s, 4 * s, 0.6, '#000000');
  solid(ctx, cr, { x: x - 15 * s, y: y - 21 * s, w: 30 * s, h: 30 * s }, 'stone', '#a89a80', { depth: 0.1, air: CAVE, line: 1.8, formSize: 6 * s });
  within(ctx, cr, () => {
    ctx.fillStyle = 'rgba(255,120,70,0.15)';
    ctx.fillRect(x - 15 * s, y - 21 * s, 12 * s, 30 * s);
    ctx.fillStyle = 'rgba(90,160,255,0.18)';
    ctx.fillRect(x + 4 * s, y - 21 * s, 12 * s, 30 * s);
  });
  ctx.fillStyle = '#0e080a';
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(x + d * 6 * s + turn * 2 * s, y - 3 * s, 4.4 * s, 4 * s, d * 0.2, 0, P2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(x + turn * 2 * s, y + 1 * s);
  ctx.lineTo(x - 2 * s + turn * 2 * s, y + 5 * s);
  ctx.lineTo(x + 2 * s + turn * 2 * s, y + 5 * s);
  ctx.fill();
  ctx.strokeStyle = 'rgba(30,20,20,0.7)';
  ctx.lineWidth = 0.8;
  for (let t = -4; t <= 4; t += 2) {
    ctx.beginPath();
    ctx.moveTo(x + t * s, y + 6 * s);
    ctx.lineTo(x + t * s, y + 9 * s);
    ctx.stroke();
  }
}

function bone(ctx: Ctx, x: number, y: number, len: number, ang: number): void {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const p = (g: Ctx) => {
    g.beginPath();
    g.moveTo(x - c * len * 0.5 - s * 3, y - s * len * 0.5 + c * 3);
    g.lineTo(x + c * len * 0.5 - s * 3, y + s * len * 0.5 + c * 3);
    g.arc(x + c * len * 0.5 + s * 2, y + s * len * 0.5 - c * 2, 4.5, ang + Math.PI / 2, ang - Math.PI / 2, true);
    g.arc(x + c * len * 0.5 - s * 3, y + s * len * 0.5 + c * 3, 4.5, ang + Math.PI / 2, ang - Math.PI / 2, true);
    g.lineTo(x - c * len * 0.5 + s * 3, y - s * len * 0.5 - c * 3);
    g.arc(x - c * len * 0.5 - s * 2, y - s * len * 0.5 + c * 2, 4.5, ang - Math.PI / 2, ang + Math.PI / 2, true);
    g.closePath();
  };
  groundShadow(ctx, x + 4, y + 5, len * 0.55, 4, 0.5, '#000000');
  solid(ctx, p, { x: x - len / 2 - 6, y: y - 10, w: len + 12, h: 20 }, 'stone', '#a4967c', { depth: 0.1, air: CAVE, line: 1.6, formSize: 3 });
}

function ash(ctx: Ctx, r: R, left: boolean): void {
  const xs = left ? [70, 150, 320, 430, 520] : [1400, 1500, 1610, 1760, 1850];
  for (const x of xs) {
    const y = 690 + r() * 60;
    asphodel(ctx, r, x + (r() - 0.5) * 30, y, 1.15 + (y - 690) / 120);
  }
  if (left) {
    skull(ctx, 600, 738, 1);
    bone(ctx, 652, 748, 50, 0.25);
    bone(ctx, 560, 752, 36, -0.6);
  } else {
    skull(ctx, 1338, 730, 0.8, 0.6);
    bone(ctx, 1290, 744, 46, -0.4);
  }
}

// ——— the table: an obsidian slab, a bronze key-pattern rim ———

/** The key pattern's unit at the rim (px) and the slab joints, every SLAB units, centred on the middle. */
const KEY_U = 48;
const SLAB = 8;

function table(ctx: Ctx, r: R): void {
  const f = TA.front;
  const zf = zFront(f);
  const box = { x: 0, y: TY, w: W, h: f - TY };
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, f - TY + 4);
  ctx.clip();
  vfill(ctx, 0, TY, W, f - TY + 4, [[0, '#0a080e'], [0.5, '#14101a'], [1, '#1c1622']]);
  surface(ctx, r, box, '#14101a', { over: true, vary: 0.35, cells: 4, mottle: 0.25, strokes: 0.12, strokeAng: 0, strokeLen: 300, strokeW: 3, grain: 0.05, grainKind: 'grain', warm: '#2a1c24', cool: '#0a0c1a', seed: 91 });
  // the slabs' joints, on the rim's key-pattern spacing (each slab holds a whole run of key units)
  const jointsX: number[] = [];
  for (let n = -4; n <= 4; n++) jointsX.push(960 + (n + 0.5) * KEY_U * SLAB);
  for (const xf of jointsX) {
    const X = (xf - 960) * (zf / 1210);
    ctx.strokeStyle = 'rgba(0,0,0,0.65)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(xAt(X, ZB), TY);
    ctx.lineTo(xAt(X, zf), f + 4);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(150,140,200,0.12)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(xAt(X, ZB) + 2, TY);
    ctx.lineTo(xAt(X, zf) + 3, f + 4);
    ctx.stroke();
  }
  // conchoidal fractures: shell-like ripples of glass where the slabs were knapped, near their joints and edges
  for (let i = 0; i < 9; i++) {
    const jx = jointsX[1 + Math.floor(r() * (jointsX.length - 2))];
    const y = TY + 30 + r() * (f - TY - 60);
    const t = (y - TY) / (f - TY);
    const x = jx + (r() < 0.5 ? -1 : 1) * (10 + t * 20);
    const rad = (30 + r() * 50) * (0.5 + t);
    const a0 = r() * P2;
    for (let k = 0; k < 5; k++) {
      const rr = rad * (0.4 + k * 0.15);
      ctx.strokeStyle = rgba('#000000', 0.18);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(x, y, rr, rr * (0.35 + t * 0.15), 0, a0, a0 + 1.6);
      ctx.stroke();
      ctx.strokeStyle = rgba('#b8b0e8', 0.06);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(x, y - 1.5, rr, rr * (0.35 + t * 0.15), 0, a0, a0 + 1.6);
      ctx.stroke();
    }
  }
  // the glass: the soul-fires and the pit mirrored in long soft streaks, the cavern's dim light as a sheen
  for (const [X, z] of TA.braziers) {
    const bx = sx(X, z);
    ctx.save();
    ctx.translate(bx, TY + 60);
    ctx.scale(1, 5);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 60);
    g.addColorStop(0, rgba('#6ac8ff', 0.2));
    g.addColorStop(0.4, rgba('#3a8aff', 0.08));
    g.addColorStop(1, rgba('#3a8aff', 0));
    ctx.fillStyle = g;
    ctx.fillRect(-60, -60, 120, 120);
    ctx.restore();
  }
  ctx.save();
  ctx.translate(960, TY + 10);
  ctx.scale(1, 2.6);
  const pg = ctx.createRadialGradient(0, 0, 0, 0, 0, 260);
  pg.addColorStop(0, rgba('#ff6a3a', 0.1));
  pg.addColorStop(1, rgba('#ff6a3a', 0));
  ctx.fillStyle = pg;
  ctx.fillRect(-260, -260, 520, 520);
  ctx.restore();
  vfill(ctx, 0, TY, W, 60, [[0, rgba('#8a80c0', 0.12)], [1, rgba('#8a80c0', 0)]]);
  // a band of glassy highlight across the slab's far third, broken by the joints: the polish
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  softly(ctx, { x: 0, y: TY, w: W, h: 90 }, (q) => {
    const g = q.createLinearGradient(0, TY + 20, 0, TY + 70);
    g.addColorStop(0, 'rgba(160,150,220,0)');
    g.addColorStop(0.5, 'rgba(160,150,220,0.06)');
    g.addColorStop(1, 'rgba(160,150,220,0)');
    q.fillStyle = g;
    q.fillRect(0, TY, W, 90);
  }, 0.25, 'lighter');
  ctx.restore();
  grain(ctx, box, 'stone', 0.12, 1.4);
  ctx.restore();
  tableFalloff(ctx, f, 0.45, '#04020a');
  crevice(ctx, 0, W, TY, 30, 0.6, '#000000');
  ctx.fillStyle = 'rgba(160,150,220,0.18)';
  ctx.fillRect(0, TY, W, 2);
  rimBand(ctx, f);
}

/** The bronze rim along the table's front: a running key pattern, one unit every KEY_U px from the middle, a bronze
 * boss on each slab joint (between two runs, so each slab's run of the pattern sits centred on it). */
function rimBand(ctx: Ctx, f: number): void {
  const h = 1080 - f;
  const g = ctx.createLinearGradient(0, f, 0, 1080);
  g.addColorStop(0, '#c08a40');
  g.addColorStop(0.2, '#8a5a26');
  g.addColorStop(0.6, '#5a3816');
  g.addColorStop(1, '#2a1a0a');
  ctx.fillStyle = g;
  ctx.fillRect(0, f, W, h);
  lay(ctx, noiseMask(12, 191, { cover: 0.3, soft: 0.3, col: BRZ.green, w: 240, h: 6 }), { x: 0, y: f, w: W, h }, 0.25);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, f, W, h);
  ctx.clip();
  const cy = f + h / 2 + 1;
  const kh = h * 0.56;
  const u = KEY_U;
  for (let n = -Math.ceil(960 / u) - 1; n <= Math.ceil(960 / u); n++) {
    const x0 = 960 + n * u;
    const w = u;
    // the meander: one hook per unit, linked to the next
    const draw = (dx: number, dy: number, col: string, lw: number) => {
      ctx.strokeStyle = col;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(x0 + dx, cy + kh / 2 + dy);
      ctx.lineTo(x0 + dx, cy - kh / 2 + dy);
      ctx.lineTo(x0 + w * 0.75 + dx, cy - kh / 2 + dy);
      ctx.lineTo(x0 + w * 0.75 + dx, cy + kh * 0.25 + dy);
      ctx.lineTo(x0 + w * 0.3 + dx, cy + kh * 0.25 + dy);
      ctx.lineTo(x0 + w * 0.3 + dx, cy - kh * 0.1 + dy);
      ctx.moveTo(x0 + dx, cy + kh / 2 + dy);
      ctx.lineTo(x0 + w + dx, cy + kh / 2 + dy);
      ctx.stroke();
    };
    draw(1, 1.5, 'rgba(30,14,4,0.85)', 4);
    draw(0, 0, '#e8b860', 2.6);
  }
  // a boss on each slab joint, where one slab's run of the pattern meets the next
  for (let n = -4; n <= 4; n++) {
    const x = 960 + (n + 0.5) * KEY_U * SLAB;
    const br = h * 0.36;
    ctx.fillStyle = 'rgba(20,10,2,0.8)';
    ctx.beginPath();
    ctx.arc(x + 1.5, cy + 2, br, 0, P2);
    ctx.fill();
    const g2 = ctx.createRadialGradient(x - br * 0.3, cy - br * 0.35, 1, x, cy, br);
    g2.addColorStop(0, '#ffe0a0');
    g2.addColorStop(0.35, '#c08a40');
    g2.addColorStop(1, '#4a2c10');
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.arc(x, cy, br, 0, P2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,14,4,0.8)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    for (let q = 0; q < 8; q++) {
      const a = (q / 8) * P2;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * br * 0.35, cy + Math.sin(a) * br * 0.35);
      ctx.lineTo(x + Math.cos(a) * br * 0.85, cy + Math.sin(a) * br * 0.85);
      ctx.stroke();
    }
  }
  ctx.fillStyle = 'rgba(255,230,170,0.5)';
  ctx.fillRect(0, f, W, 2);
  ctx.fillStyle = 'rgba(30,14,4,0.8)';
  ctx.fillRect(0, f + 2, W, 2);
  ctx.restore();
}

// ——— the eruption sky (live only) ———

/** Everything that stands in front of the sky: the cliffs, the roof, the temple and its bank, the columns, the post. */
function frontCut(ctx: Ctx): void {
  ctx.beginPath();
  for (const right of [false, true]) {
    const { cols, upper } = CLIFF[right ? 'r' : 'l'];
    const X = (x: number) => (right ? W - x : x);
    upper.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), y) : ctx.moveTo(X(x), y)));
    ctx.closePath();
    for (const q of cols) {
      ctx.moveTo(X(q.x0) , q.top - 2);
      ctx.lineTo(X(q.x1), q.top - 2);
      ctx.lineTo(X(q.x1), q.bot);
      ctx.lineTo(X(q.x0), q.bot);
      ctx.closePath();
    }
  }
  roofSil(ctx);
  ctx.fill();
  // the far bank and the temple
  ctx.fillRect(560, 436, 800, 140);
  const [ax, ay] = P(-STY - 0.08, Y_COR, ZT - 0.3);
  const [px, py] = P(0, Y_APX + 0.06, ZT - 0.3);
  const [bx, by] = P(BREAK_X + 0.1, Y_COR + (Y_APX - Y_COR) * (1 - BREAK_X / STY), ZT - 0.3);
  const [cx, cy] = P(STY + 0.1, Y_SH - 0.5, ZT);
  ctx.beginPath();
  ctx.moveTo(ax, ay + 4);
  ctx.lineTo(px, py - 12);
  ctx.lineTo(bx, by + 2);
  ctx.lineTo(bx + 6, ay + 6);
  ctx.lineTo(cx, cy);
  ctx.lineTo(cx, 450);
  ctx.lineTo(ax - 4, 450);
  ctx.closePath();
  ctx.fill();
}

export const SKY_BOX = { x: 0, y: 0, w: W, h: 470 };
function eruptSky(ctx: Ctx, r: R): void {
  abyss(ctx, r, 1);
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = '#000';
  frontCut(ctx);
  ctx.restore();
}

/** The top of the cliffs' colonnades at screen x. */
function cliffTop(x: number): number {
  let y = 9999;
  for (const q of CLIFF.l.cols) if (x >= q.x0 && x <= q.x1) y = Math.min(y, q.top);
  for (const q of CLIFF.r.cols) if (W - x >= q.x0 && W - x <= q.x1) y = Math.min(y, q.top);
  return y;
}

/** The visible sky (for the fountains' mask): between the cliffs, under the roof, over the spires and the temple. */
function skyMask(): Pt[] {
  const topE: Pt[] = [];
  const botE: Pt[] = [];
  const [ax, ay] = P(-STY - 0.08, Y_COR, ZT - 0.3);
  const [px, py] = P(0, Y_APX, ZT - 0.3);
  const [bx, by] = P(BREAK_X, Y_COR + (Y_APX - Y_COR) * (1 - BREAK_X / STY), ZT - 0.3);
  const templeTop = (x: number) => {
    if (x < ax || x > bx + 60) return 9999;
    if (x <= px) return ay + ((py - ay) * (x - ax)) / (px - ax) - 2;
    if (x <= bx) return py + ((by - py) * (x - px)) / (bx - px) - 2;
    return P(0, Y_SH - 0.5, ZT)[1];
  };
  for (let x = 420; x <= 1500; x += 6) {
    const top = ceilY(x) + 30;
    let bot = Math.min(spireTop(x), templeTop(x), 440);
    bot = Math.min(bot, edgeY(EL, x, true) - 2, edgeY(ER_M, W - x, true) - 2, cliffTop(x) - 2);
    topE.push([x, top]);
    botE.push([x, Math.max(top, bot)]);
  }
  return [...topE, ...botE.reverse()];
}

// ——— the grade and the shade ———

function grade(ctx: Ctx): void {
  ctx.globalCompositeOperation = 'source-atop';
  const g = ctx.createLinearGradient(0, 0, W * 0.8, 1080);
  g.addColorStop(0, rgba('#ff9a70', 0.06));
  g.addColorStop(0.45, rgba('#ff9a70', 0));
  g.addColorStop(0.62, rgba('#4a5ad0', 0));
  g.addColorStop(1, rgba('#4a5ad0', 0.1));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, 1080);
}

function shadeOver(ctx: Ctx): void {
  calmLanes(ctx, 0.14, '#0a0410', 60, 560);
  vignetteAll(ctx, 0.7, '#040208');
  vfill(ctx, 0, 0, W, 140, [[0, 'rgba(2,1,6,0.45)'], [1, 'rgba(2,1,6,0)']]);
}

// ——— the stack ———

const FALL_SLOTS = TA.falls.map((f) => ({ x: f.x - FALL.w / 2, y: f.top - 10, w: FALL.w, h: STYX_BOX.y - (f.top - 10) }));
/** Charon, the dead and the rings on the water: they stay above the near shore (the bank is in the base). */
const FERRY_BOX = { x: 0, y: 360, w: W, h: 278 };
const SIDE_L = { x: 0, y: 100, w: 700, h: TY - 100 };
const SIDE_R = { x: W - 700, y: 100, w: 700, h: TY - 100 };

export const TARTARUS: SceneSpec = {
  id: 'tartarus',
  info: {
    name: 'Tartarus',
    subtitle: 'Waves 86–89',
    ambient: [],
    // (the pit, the falls and the fires are the live layer's)
    glows: [],
    light: '#c8a8e8',
    tableTint: '#ece4f4',
  },
  layers: [
    { id: 'abyss', box: { x: 0, y: 0, w: W, h: 540 }, draw: (c, r) => abyss(c, r, 0) },
    { id: 'cavern', box: { x: 0, y: 0, w: W, h: 580 }, draw: cavern },
    { id: 'temple', box: { x: 540, y: TEMPLE_BOX.y, w: 840, h: 420 }, draw: templeLayer },
    { id: 'fallL', box: FALL_SLOTS[0], motion: 'slot', draw: () => {} },
    { id: 'fallR', box: FALL_SLOTS[1], motion: 'slot', draw: () => {} },
    { id: 'fallsStill', box: { x: 520, y: 150, w: 880, h: 380 }, stillOnly: true, draw: (c) => fallsStill(c) },
    { id: 'keeperFire', box: { x: 780, y: 360, w: 360, h: 120 }, stillOnly: true, draw: (c) => keeperFireStill(c) },
    { id: 'styx', box: STYX_BOX, draw: styx },
    { id: 'styxRed', box: { x: 0, y: STYX_BOX.y, w: W, h: 146 }, liveOnly: true, res: 0.4, draw: styxRed },
    { id: 'soulsStill', box: STYX_BOX, stillOnly: true, draw: (c) => soulsStill(c) },
    { id: 'styxLife', box: FERRY_BOX, motion: 'slot', draw: () => {} },
    { id: 'ferryStill', box: { x: 1260, y: 360, w: 340, h: 290 }, stillOnly: true, draw: (c) => ferryStill(c) },
    { id: 'bank', box: BANK_BOX, draw: bank },
    { id: 'jetty', box: JETTY_BOX, draw: jetty },
    { id: 'brazierL', box: brazierBox(0), draw: (c) => brazier(c, ...TA.braziers[0]) },
    { id: 'brazierR', box: brazierBox(1), draw: (c) => brazier(c, ...TA.braziers[1]) },
    { id: 'soulFire', box: { x: 520, y: 380, w: 880, h: 220 }, stillOnly: true, draw: (c) => soulFireStill(c) },
    { id: 'sideL', box: SIDE_L, draw: (c, r) => side(c, r, true) },
    { id: 'sideR', box: SIDE_R, draw: (c, r) => side(c, r, false) },
    { id: 'eruptSky', box: SKY_BOX, liveOnly: true, res: 0.4, draw: eruptSky },
    { id: 'table', box: { x: 0, y: TY, w: W, h: 1080 - TY }, draw: table },
    { id: 'top', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

// ——— live ———

registerKitScene(TARTARUS, (k: KitLive, wave0: number) => {
  const ADD = Phaser.BlendModes.ADD;
  const cm0 = () => calm();
  const top = k.slot('top');
  const life = k.slot('styxLife');
  const fallC = [k.slot('fallL'), k.slot('fallR')];
  const sky = k.sprite('eruptSky');
  const red = k.sprite('styxRed').setBlendMode(ADD);
  // the containers over everything, in order: the far fire (masked to the sky), the falls' steam, the fires, motes
  const farC = k.sc.add.container(0, 0);
  const steamC = k.sc.add.container(0, 0);
  const fireC = k.sc.add.container(0, 0);
  const partC = k.sc.add.container(0, 0);
  top.add([farC, steamC, fireC, partC]);
  const mask = k.sc.make.graphics({}, false);
  mask.fillStyle(0xffffff, 1);
  mask.fillPoints(skyMask().map(([x, y]) => new Phaser.Geom.Point(x, y)), true);
  farC.setMask(mask.createGeometryMask());

  // ——— the pit's light ———
  const horizon = [700, 1220].map((x) => k.glow(x, HZ + 6, 360, 0xff4a1a, 0, { into: farC, sy: 0.22 }));
  const flash = k.glow(960, HZ - 40, 760, 0xff7a2a, 0, { into: farC, sy: 0.45 });
  const redWash = k.wash(0xff3a1a, 0, ADD, partC);
  // the roof's undersides lit red from the erupting pit
  const roofGlow = k.glow(960, 60, 700, 0xff4a1a, 0, { into: steamC, sy: 0.16 });
  const vents = [690, 820, 1100, 1250];
  const lava = new Parts(k, { frame: 'ember', add: true, into: farC, max: 220 });
  const ventGlow = vents.map((x) => k.glow(x, HZ + 10, 90, 0xffa040, 0, { into: farC, sy: 0.6 }));
  // the jet itself: a column of glowing spray standing over the vent while it blows
  const jets = vents.map((x) => k.glow(x, HZ - 90, 60, 0xffb050, 0, { into: farC, sy: 3.4 }));
  const ventHeat = vents.map(() => 0);
  const burst = (i: number, p: number) => {
    const x = vents[i];
    ventHeat[i] = 1;
    for (let j = 0; j < 28 + p * 40; j++) {
      const v = 420 + crand() * 300 * p;
      const a = -Math.PI / 2 + (crand() - 0.5) * 0.55;
      lava.spawn({ x: x + (crand() - 0.5) * 20, y: HZ + 20, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 2.4 + crand(), r0: 3 + crand() * 2.5, r1: 1, a: 1, tint: crand() < 0.4 ? 0xffd880 : 0xff7a24, grav: 340, streak: 0.016, fade: 0.04 });
    }
  };

  // ——— the lava falls: painted loops, steam, splashes ———
  const fallKey = sheet(k, 'ta_fall', FALL.w * FALL_RES, FALL.h * FALL_RES, 10, (c, ph) => {
    c.scale(FALL_RES, FALL_RES);
    fallFrame(c, ph, FALL.w, FALL.h, 1);
  });
  const falls = TA.falls.map((f, i) => new Loop(k, fallKey, 10, f.x - FALL.w / 2, f.top - 6, { into: fallC[i], origin: [0, 0], sx: 1 / FALL_RES, sy: (f.bot - f.top + 20) / FALL.h / FALL_RES, fps: 11 + i, phase: i * 4 }));
  const steamKey = sheet(k, 'ta_steam', STEAM.w / 2, STEAM.h / 2, 8, (c, ph) => {
    c.scale(0.5, 0.5);
    smokeFrame(c, STEAM.w, STEAM.h, ph, STEAM.o);
  });
  const steam = TA.falls.map((f, i) => new Loop(k, steamKey, 8, f.x, f.bot + 8, { into: steamC, origin: [0.5, 1], scale: 2, fps: 2.2, phase: i * 3 }));
  const splashGlow = TA.falls.map((f) => k.glow(f.x, f.bot, 70, 0xff8a3a, 0.3, { into: steamC, sy: 0.4 }));
  const fallGlow = TA.falls.map((f) => k.glow(f.x, (f.top + f.bot) / 2, 150, 0xff5a1a, 0.1, { into: steamC, sy: 1.8 }));
  const gobs = new Parts(k, { frame: 'ember', add: true, into: steamC, max: 80 });
  const gobRate = [new Rate(), new Rate()];

  // ——— the keepers' fires on the temple stair ———
  const KFW = 40;
  const KFH = 52;
  const kfKey = sheet(k, 'ta_kfire', KFW, KFH, 8, (c, ph) => fireFrame(c, KFW / 2, KFH - 3, KFW * 0.7, KFH * 0.85, ph, { tongues: 3, seed: 2, cols: ['#e0501a', '#ffa030', '#ffe0a0'] }));
  const kfires = KEEPER_FIRE.map(([x, y], i) => new Loop(k, kfKey, 8, x, y + 2, { into: fireC, origin: [0.5, (KFH - 3) / KFH], scale: 0.42, fps: 12, phase: i * 3 }));
  const kglow = KEEPER_FIRE.map(([x, y]) => k.glow(x, y - 6, 34, 0xff8a3a, 0.25, { into: fireC }));

  // ——— the soul-fires ———
  const FW = 150;
  const FH = 190;
  const RF = 0.7;
  const fireKey = sheet(k, 'ta_soulfire', FW * RF, FH * RF, 10, (c, ph) => {
    c.scale(RF, RF);
    fireFrame(c, FW / 2, FH - 8, FW * 0.85, FH * 0.85, ph, { tongues: 5, seed: 3, cols: [SOUL.deep, SOUL.body, SOUL.core] });
  });
  const souls = TA.braziers.map(([X, z], i) => {
    const kk = pz(z);
    const [x, y] = P(X, TA.bowlY, z);
    const s = (kk * 0.21) / (FW * 0.85);
    const fl = new Loop(k, fireKey, 10, x, y + 3, { into: fireC, origin: [0.5, (FH - 8) / FH], scale: s / RF, fps: 11 + i, phase: i * 4 });
    const glow = k.glow(x, y - kk * 0.14, kk * 0.55, 0x4fb8ff, 0.2, { into: fireC });
    const pool = k.glow(x, sy(0, z), kk * 0.9, 0x3a7aff, 0.1, { into: fireC, sy: 0.2 });
    return { x, y, kk, s, fl, glow, pool, seed: i * 2.3 };
  });
  const wisps = new Parts(k, { frame: 'soft', add: true, into: fireC, max: 60 });
  const wispRate = [new Rate(), new Rate()];
  const duck = new Spring(0, 30, 5);

  // ——— the Styx: the dead, rings, glints; Charon ———
  const soulKey = sheet(k, 'ta_soul', SOUL_F.w, SOUL_F.h, 6, (c, _ph, i) => soulFrame(c, i));
  const dead = Array.from({ length: 7 }, (_, i) => {
    const im = k.sc.add.image(0, 0, soulKey, i % 6).setAlpha(0).setTint(0x9affe0);
    life.add(im);
    const d = { im, x: 0, y: 0, v: 0, age: 0, life: 1, s: 1, flee: 0, seed: i * 1.9 };
    const spawn = (first: boolean) => {
      d.y = 522 + crand() * 78;
      d.x = 60 + crand() * (W - 120);
      d.v = (crand() < 0.5 ? -1 : 1) * (6 + crand() * 10);
      d.life = 9 + crand() * 8;
      d.age = first ? crand() * d.life : 0;
      d.s = (pz(zAtY(d.y)) / 220) * (0.75 + crand() * 0.4);
      im.setFrame(Math.floor(crand() * 6));
      im.setFlipX(d.v > 0);
    };
    spawn(true);
    return { d, spawn };
  });
  const ringKey = k.tex('ta_ring', 160, 40, (c) => {
    for (const [rr, a, w] of [[0.92, 0.5, 2.2], [0.75, 0.25, 1.4], [0.55, 0.12, 1]] as const) {
      c.strokeStyle = `rgba(255,255,255,${a})`;
      c.lineWidth = w;
      c.beginPath();
      c.ellipse(80, 20, 78 * rr, 18 * rr, 0, 0, P2);
      c.stroke();
    }
  });
  const rings: { im: Phaser.GameObjects.Image; age: number; life: number; s: number }[] = [];
  const ringAt = (x: number, y: number, s: number, a = 0.4, tint = 0xb8fff0) => {
    if (rings.length > 40) return;
    const im = k.sc.add.image(x, y, ringKey).setBlendMode(ADD).setTint(tint).setAlpha(0);
    life.addAt(im, dead.length);
    rings.push({ im, age: 0, life: 1.6 + s * 0.4, s: s * a });
  };
  const glints = new Parts(k, { frame: 'spark', add: true, into: life, max: 30 });
  const plops = new Parts(k, { frame: 'drop', into: life, max: 60 });

  const fz = TA.ferryZ;
  const fscale = FERRY_STILL.scale;
  const boatKey = k.tex('ta_boat', Math.ceil(BOAT.w * fscale), Math.ceil(BOAT.h * fscale), (c) => {
    c.scale(fscale, fscale);
    boatPaint(c);
  });
  // (painted a little under the size it's shown at: he's soft-edged, and it keeps the sheet small)
  const CHR = 0.68;
  const chKey = sheet(k, 'ta_charon', CHARON.w * CHR, CHARON.h * CHR, CH_N, (c, ph) => {
    c.scale(CHR, CHR);
    charonFrame(c, ph);
  });
  const boat = k.sc.add.image(0, 0, boatKey).setOrigin(0.5, BOAT.water / BOAT.h);
  const charon = new Loop(k, chKey, CH_N, 0, 0, { into: life, origin: [0.5, 1], scale: fscale / CHR, fps: 0 });
  life.add(boat);
  // (the hull goes over his robe's foot: Charon first, then the boat)
  charon.each((im) => life.bringToTop(im));
  life.bringToTop(boat);
  const lanternGlow = k.glow(0, 0, 40, 0x6affc0, 0.3, { into: life });
  let bx = -200 - crand() * 400;
  let dir = 1;
  let stroke = crand();
  let wait = 0;
  let wakeT = 0;
  const wy = sy(0, fz);
  /** Charon's frame centre from the boat's (his frame's middle is where the pole goes in at the plant). */
  const cxo = () => (-BOAT.w / 2 + 40 + CHARON.w / 2) * fscale * dir;

  // ——— in the air: embers, ash, grit off the stalactites ———
  const embers = new Parts(k, { frame: 'ember', add: true, into: partC, max: 120 });
  const emberRate = new Rate();
  const ashP = new Parts(k, { frame: 'flake', into: partC, max: 220 });
  const ashRate = new Rate();
  const grit = new Parts(k, { frame: 'mote', into: partC, max: 120 });
  const dust = new Parts(k, { frame: 'puff', into: partC, max: 40 });
  const runs: { x: number; dir: number; t: number; n: number; p: number }[] = [];

  let kw = waveK(wave0);
  let shown = kw;
  let nextErupt = 3 + crand() * 4;
  let erupt = 0;
  const flashes = () => save.settings.flashes && !save.settings.reducedMotion;
  const sync = () => {
    const m = k.root.getWorldTransformMatrix();
    mask.setPosition(m.tx, m.ty).setScale(m.scaleX, m.scaleY);
  };

  return {
    setWave: (w) => (kw = waveK(w)),
    impact(x, _y, p) {
      // grit and dust shaken off the stalactites over the stomp (some plop into the river, some bounce on the bank)
      const near = STALACTITES.filter(([sx2]) => Math.abs(sx2 - x) < 360);
      for (let i = 0; i < 2 + p * 6 && near.length; i++) {
        const [tx, ty] = near[Math.floor(crand() * near.length)];
        const intoWater = crand() < 0.7;
        const floor = intoWater ? 520 + crand() * 110 : 650 + crand() * 90;
        for (let j = 0; j < 3; j++) {
          grit.spawn({
            x: tx + (crand() - 0.5) * 4, y: ty, vx: (crand() - 0.5) * 30, vy: crand() * 40, life: 3, r0: 1.2 + crand() * 1.6, a: 0.9, tint: crand() < 0.5 ? 0x6a5058 : 0x9a7a7a, grav: 520, drag: 0.2, floor, bounce: intoWater ? 0 : 0.3, fade: 0.02,
            onFloor: intoWater ? (gx, gy) => {
              ringAt(gx, gy, pz(zAtY(gy)) / 400, 0.5);
              for (let q = 0; q < 3; q++) plops.spawn({ x: gx, y: gy, vx: (crand() - 0.5) * 40, vy: -60 - crand() * 60, life: 0.6, r0: 1.2, a: 0.7, tint: 0x9affe8, grav: 500, floor: gy + 2, fade: 0.05 });
            } : undefined,
          });
        }
        dust.spawn({ x: tx, y: ty - 4, vx: (crand() - 0.5) * 20, vy: 10 + crand() * 20, life: 2, r0: 6, r1: 22 + p * 20, a: 0.25, tint: 0x6a5058, drag: 1.2, fade: 0.2 });
      }
      // a ripple run across the Styx from under the stomp, both ways
      runs.push({ x, dir: -1, t: 0, n: 0, p }, { x, dir: 1, t: 0, n: 0, p });
      // the soul-fires duck, then flare; the dead scatter
      duck.v -= 3 + p * 6;
      for (const { d } of dead) d.flee = Math.max(d.flee, p * (1 - Math.min(1, Math.abs(d.x - x) / 700)));
      // the falls' feet splash up
      for (const f of TA.falls) {
        for (let j = 0; j < 4 + p * 8; j++) gobs.spawn({ x: f.x + (crand() - 0.5) * 14, y: f.bot - 6, vx: (crand() - 0.5) * 140, vy: -90 - crand() * 160 * p, life: 1.3, r0: 1.6 + crand() * 1.4, r1: 0.6, a: 0.9, tint: crand() < 0.5 ? 0xffc060 : 0xff6a20, grav: 420, floor: f.bot + 4, fade: 0.05, streak: 0.01 });
      }
    },
    update(dt, t) {
      const cm = cm0();
      sync();
      shown += (kw - shown) * Math.min(1, dt * 0.6);
      const breath = 0.85 + Math.sin(t * 1.3) * 0.1 + Math.sin(t * 3.7) * 0.05;

      // the pit: the sky glowing, the eruptions
      sky.setAlpha(smooth(0.15, 1, shown) * (0.35 + 0.65 * smooth(0.6, 1, shown)));
      roofGlow.setAlpha(smooth(0.5, 1, shown) * 0.35 * breath);
      red.setAlpha(smooth(0.5, 1, shown) * (0.75 + 0.25 * breath));
      for (const h of horizon) h.setAlpha(lerp(0.1, 0.42, shown) * breath);
      redWash.setAlpha(lerp(0, 0.05, shown) * breath);
      if (shown > 0.4) {
        nextErupt -= dt;
        if (nextErupt < 0) {
          erupt = 1;
          const i = Math.floor(crand() * vents.length);
          burst(i, shown);
          if (shown > 0.85 && crand() < 0.5) burst((i + 2) % vents.length, shown * 0.7);
          nextErupt = lerp(9, 2.5, shown) + crand() * 3;
        }
      }
      // at the last wave the vents never quite stop
      if (shown > 0.8) for (let i = 0; i < vents.length; i++) if (crand() < dt * 3 * (shown - 0.8) * 5) lava.spawn({ x: vents[i] + (crand() - 0.5) * 10, y: HZ + 20, vx: (crand() - 0.5) * 90, vy: -200 - crand() * 220, life: 1.6, r0: 1.8, r1: 0.6, a: 0.8, tint: 0xff8a30, grav: 300, streak: 0.01, fade: 0.04 });
      erupt = Math.max(0, erupt - dt * 0.6);
      flash.setAlpha(erupt * erupt * (flashes() ? 0.5 : 0.16));
      for (let i = 0; i < vents.length; i++) {
        ventHeat[i] = Math.max(0, ventHeat[i] - dt * 0.5);
        ventGlow[i].setAlpha((ventHeat[i] * 0.6 + (shown > 0.8 ? 0.2 : 0)) * breath);
        jets[i].setAlpha(ventHeat[i] ** 1.5 * 0.55 * breath);
      }

      // the falls
      for (const [i, f] of falls.entries()) {
        f.step(dt, (1 + shown * 0.25) * cm);
        const heat = Math.round(lerp(0xb8, 0xff, shown));
        f.each((im) => im.setTint((0xff << 16) | (heat << 8) | heat));
        steam[i].step(dt, cm);
        steam[i].alpha = 0.7 + shown * 0.2;
        splashGlow[i].setAlpha((0.28 + flicker(t, i * 3) * 0.12) * (1 + shown * 0.4));
        fallGlow[i].setAlpha((0.08 + shown * 0.08) * breath);
        const fx = TA.falls[i].x;
        const fb = TA.falls[i].bot;
        gobRate[i].tick((3 + shown * 5) * cm, dt, () => {
          gobs.spawn({ x: fx + (crand() - 0.5) * 12, y: fb - 6, vx: (crand() - 0.5) * 90, vy: -60 - crand() * 110, life: 1.2, r0: 1.6 + crand() * 1.4, r1: 0.6, a: 0.9, tint: crand() < 0.5 ? 0xffc060 : 0xff6a20, grav: 400, floor: fb + 4, fade: 0.05, streak: 0.01 });
        });
      }
      for (const [i, kf] of kfires.entries()) {
        kf.step(dt, cm);
        kglow[i].setAlpha(0.22 + flicker(t, 5 + i) * 0.08);
      }

      // the soul-fires: ducked by a stomp, flaring back up
      const d = duck.step(0, dt);
      for (const [i, s] of souls.entries()) {
        const fk = flicker(t * 0.9, s.seed);
        s.fl.step(dt, cm);
        const h = (1 + d * 0.5) * (0.95 + 0.05 * fk);
        s.fl.each((im) => im.setScale((s.s / RF) * (1 - d * 0.1), (s.s / RF) * Math.max(0.15, h)));
        s.glow.setAlpha((0.18 + 0.05 * fk) * (1 + Math.max(0, d) * 0.6));
        s.pool.setAlpha((0.1 + 0.03 * fk) * (1 + Math.max(0, d) * 0.4));
        wispRate[i].tick((2.5 + Math.max(0, d) * 10) * cm, dt, () => {
          wisps.spawn({ x: s.x + (crand() - 0.5) * s.kk * 0.18, y: s.y - s.kk * 0.25, vx: (crand() - 0.5) * 12, vy: -30 - crand() * 30, life: 1.8 + crand(), r0: s.kk * 0.02, r1: s.kk * 0.06, a: 0.35, tint: crand() < 0.5 ? 0x6ac8ff : 0xb8ecff, grav: -8, drag: 0.4, fade: 0.2 });
        });
      }

      // the dead under the water
      for (const { d: s, spawn } of dead) {
        s.age += dt;
        if (s.age > s.life) spawn(false);
        s.flee = Math.max(0, s.flee - dt * 0.5);
        s.x += s.v * dt * cm;
        const u = s.age / s.life;
        const a = Math.sin(u * Math.PI) ** 1.5 * (0.15 + shown * 0.05) * (1 - s.flee);
        const wob = Math.sin(t * 1.3 + s.seed) * 0.06;
        s.im.setPosition(s.x, s.y + Math.sin(t * 0.7 + s.seed) * 2).setScale(s.s * (1.1 + wob), s.s * (0.78 - wob * 0.5)).setAlpha(a);
      }
      // rings spreading
      for (let i = rings.length - 1; i >= 0; i--) {
        const g = rings[i];
        g.age += dt;
        const u = g.age / g.life;
        if (u >= 1) {
          g.im.destroy();
          rings.splice(i, 1);
          continue;
        }
        const sc = (0.15 + u * 0.85) * g.s * 2.2;
        g.im.setScale(sc, sc).setAlpha((1 - u) ** 1.5 * 0.75);
      }
      // the stomp's ripple running across the river
      for (let i = runs.length - 1; i >= 0; i--) {
        const w = runs[i];
        w.t += dt;
        while (w.n < 10 && w.t > w.n * 0.07) {
          const x = w.x + w.dir * w.n * 95;
          if (x > -40 && x < W + 40) {
            const y = 600 + Math.sin(x * 0.01) * 8;
            ringAt(x, y, (pz(zAtY(y)) / 260) * (0.7 + w.p * 0.5), 0.6 * (1 - w.n / 12));
            if (w.n % 3 === 0) glints.spawn({ x, y: y - 2, life: 0.5, r0: 4, r1: 1, a: 0.7, tint: 0xd8fff4, fade: 0.2 });
          }
          w.n++;
        }
        if (w.n >= 10) runs.splice(i, 1);
      }
      if (crand() < dt * 2) {
        const x = crand() * W;
        glints.spawn({ x, y: 520 + crand() * 110, vx: 4, life: 0.8, r0: 2.5, r1: 1, a: 0.5, tint: crand() < 0.5 ? 0xffa070 : 0x9affe8, fade: 0.3 });
      }

      // Charon: poling across, the boat surging on each push and gliding through the recovery
      if (wait > 0) {
        wait -= dt;
      } else {
        stroke = (stroke + (dt / 3.2) * cm) % 1;
        const push = stroke < 0.62 ? Math.sin((stroke / 0.62) * Math.PI) : 0;
        bx += dir * (14 + push * 30) * dt * cm;
        if ((dir > 0 && bx > W + 220) || (dir < 0 && bx < -220)) {
          dir = -dir as 1 | -1;
          wait = 6 + crand() * 8;
        }
        // the pole going in: rings where it enters
        if (stroke < dt / 3.2 + 0.001) ringAt(bx + cxo() + (CHARON.footX + 18 - CHARON.w / 2) * fscale * dir, wy + 6, 0.35, 0.6);
        wakeT -= dt;
        if (wakeT < 0) {
          wakeT = 0.5;
          ringAt(bx - dir * BOAT.w * 0.42 * fscale, wy + 4, 0.3, 0.35);
        }
      }
      const bob = Math.sin(t * 1.4) * 2;
      boat.setPosition(bx, wy + bob).setRotation(Math.sin(t * 1.1) * 0.015).setFlipX(dir < 0);
      // (each phase held, then a quick cross-fade to the next: no ghost of the pole in two places)
      const cp = stroke * CH_N;
      charon.show(Math.floor(cp) + smooth(0.65, 1, cp - Math.floor(cp)));
      // (his frame's deck line on the boat's gunwale)
      charon.each((im) => im.setPosition(bx + cxo(), wy + bob - (BOAT.water - BOAT.deck) * fscale + (CHARON.h - CHARON.deck) * fscale).setFlipX(dir < 0));
      lanternGlow.setPosition(bx + dir * (322 - BOAT.w / 2) * fscale, wy + bob - (BOAT.water - 46) * fscale).setAlpha(0.22 + flicker(t, 4) * 0.08);

      // embers rising out of the abyss and off the falls; ash coming down, thicker as it erupts
      emberRate.tick((4 + shown * 16) * cm, dt, () => {
        const fromFall = crand() < 0.4;
        const f = TA.falls[crand() < 0.5 ? 0 : 1];
        embers.spawn({ x: fromFall ? f.x + (crand() - 0.5) * 30 : 560 + crand() * 800, y: fromFall ? f.bot - 10 : 450, vx: (crand() - 0.3) * 30, vy: -40 - crand() * 60, life: 3 + crand() * 3, r0: 1.4 + crand() * 1.4, r1: 0.4, a: 0.85, tint: crand() < 0.5 ? 0xffb050 : 0xff6a20, grav: -6, drag: 0.15, streak: 0.015, fade: 0.1 });
      });
      ashRate.tick((1 + smooth(0.4, 1, shown) * 45) * cm, dt, () => {
        ashP.spawn({ x: crand() * (W + 200) - 100, y: -10, vx: 10 + (crand() - 0.5) * 30, vy: 30 + crand() * 40, life: 14, r0: 1.4 + crand() * 2.2, a: 0.55 + crand() * 0.3, tint: crand() < 0.6 ? 0x8a8088 : 0x5a5058, grav: 0, drag: 0, spin: (crand() - 0.5) * 3, fade: 0.05, floor: 640 + crand() * 120 });
      });
      lava.update(dt);
      gobs.update(dt);
      wisps.update(dt);
      glints.update(dt);
      plops.update(dt);
      embers.update(dt);
      ashP.update(dt);
      grit.update(dt);
      dust.update(dt);
    },
    destroy() {
      mask.destroy();
      for (const g of rings) g.im.destroy();
    },
  };
});
