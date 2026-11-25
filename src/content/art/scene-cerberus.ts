// The Gates of Hades (the arena of CERBERUS, the mini-boss of Tartarus, Act 9), redrawn with the location kit
// (src/art/scene): the threshold of the underworld proper, the great gate the hound keeps. Of a piece with Tartarus
// (scene-tartarus.ts: its columnar basalt, black marble, bronze, the Styx's black water, asphodel and bones).
//
// The gate: a colossal gateway cut into a cliff of columnar basalt, the columns running up out of sight. Two piers of
// black marble with bronze capitals carry a lintel of three great blocks, carved in relief: in the middle the hound
// himself, his three heads front-on and snarling, a chain from his collar running out to either end of the stone;
// towards him from both ends, the dead in procession, hooded and stooped, each with the coin for the ferryman in
// his hand. Between the piers the doors, shut: bronze leaves on iron straps, studded with rivets, a hound's-head
// boss on each holding a ring; they are dented outwards (something inside has hammered on them) and scored, low
// down, by sets of huge claw marks. A chain as thick as a man runs from each ring down to a ring set in a boss of
// rock before each pier, and a third ties the rings together. A dull red light leaks through the seam.
//
// The floor before the gate is the tops of basalt columns, a causeway of hexagons, and in front of the doors it is
// worn into a great smooth hollow where the dog lies: the bones of the heroes who tried (a crested helmet, a shield, a
// broken spear, skulls), his giant spiked collar of bronze lying open and bolted to the rock, a column drum he gnaws,
// his three bronze bowls (one for each head), and honey cakes the dead have thrown him. On the left the river
// (the Styx, black water with a cold depth) laps a black shingle shore, its far bank a wall of basalt lost in smoke,
// the abyss glowing red beyond the cliff's broken end. Three bronze tripods burn with the hound's three tempers:
// fire on the left by the river, ice and poison on the right. They are the arena's colour story and stay out of the
// play area; the doors, the lanes and the table's back edge are dark and calm. The table is the gate's threshold: a
// worn basalt slab, its bronze rim in the key pattern.
//
// An arena, not a location: no waves. It answers the fight (read from the game scene):
// - the three temper fires (painted at 10 phases each), each with its own breath: fire throws embers and smoke, ice
//   sheds cold vapour that spills over the bowl and sinks, poison bubbles and fumes; a stomp ducks them; when a paw
//   uses its temper its tripod roars;
// - the chains (real painted links on a hanging rope with physics) sway and clank at every stomp, shed grit;
// - each stomp knocks grit off the lintel, the cornice and the piers' capitals, bouncing where it lands;
// - when the pack HOWLS the three fires flare together, the doors shudder in their frame (the red seam flickering),
//   dust pours from the lintel and the chains leap;
// - the river: its shore lapping on the shingle (painted at 8 phases), mist rolling off it (painted at 8 phases);
//   embers and motes in the air.

import Phaser from 'phaser';
import { type Air, type Ctx, type R, TY, W, airMix, calmLanes, castShadow, crevice, glowAt, groundShadow, haze, lightPool, polyPath, solid, vfill, vignetteAll, within } from '../../art/scene/kit';
import type { SceneSpec } from '../../art/scene/layers';
import { grain, tableFalloff, water } from '../../art/scene/materials';
import { crack, drift, lay, noiseMask, softly, streaks, surface } from '../../art/scene/paint';
import { cloud } from '../../art/scene/sky';
import { ZB, xAt, yAt, zFront } from '../../art/sceneKit';
import { hashStr, mix, rgba, rng, shade } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { Loop, Parts, Rate, Spring, sheet } from '../../game/sceneAnim';
import { type KitLive, calm, flicker, registerKitScene } from '../../game/sceneLive';
import { fireFrame, smokeFrame } from './sceneBits';
import { BRONZE_M, BRZ, KEY_U, ROCK, SLAB, asphodel, bone, rimBand, skull } from './scene-tartarus';

type Pt = [number, number];
type Box = { x: number; y: number; w: number; h: number };
type V3 = [number, number, number];
const P2 = Math.PI * 2;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const boxOfPts = (pts: Pt[], pad = 4): Box => {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x = Math.floor(Math.min(...xs) - pad);
  const y = Math.floor(Math.min(...ys) - pad);
  return { x, y, w: Math.ceil(Math.max(...xs) + pad - x), h: Math.ceil(Math.max(...ys) + pad - y) };
};

// ——— the view ———
//
// Metres: X across, Y up, z away. We look from the threshold, the eye EH above the floor, at the gate GZ away; the
// doors are twelve and a half metres tall. (The table has the game's own perspective.)

const F = 1100;
const HZ = 500;
const EH = 3;
export const sx = (X: number, z: number) => 960 + (F * X) / z;
export const sy = (Y: number, z: number) => HZ + (F * (EH - Y)) / z;
export const P = (X: number, Y: number, z: number): Pt => [sx(X, z), sy(Y, z)];
/** Screen px per metre at depth z. */
const pz = (z: number) => F / z;
/** The X of screen x at depth z. */
const XAt = (x: number, z: number) => ((x - 960) * z) / F;

export type Temper = 'fire' | 'ice' | 'poison';

export const CB = {
  front: 1040,
  /** The doors' plane, half the opening's width, the doors' height, the sill they stand on. */
  gate: { z: 31, hw: 8.6, h: 12.5, sill: 0.35 },
  /** The piers' front face, their inner and outer X. */
  pier: { z: 28.6, x0: 8.6, x1: 11.2 },
  /** The lintel's half width and its bottom and top. */
  lintel: { hw: 12, Y0: 12.5, Y1: 15.4 },
  /** The cliff's face behind the piers, and the X its broken left end comes to. */
  cliffZ: 31.6,
  cliffEnd: -16.6,
  /** The three tempers' tripods (X, z) and the height of their bowls. */
  braziers: [
    { X: -9.6, z: 13.6, t: 'fire' as Temper },
    { X: 19.8, z: 24, t: 'ice' as Temper },
    { X: 9.0, z: 13.4, t: 'poison' as Temper },
  ],
  bowlY: 2.2,
  /** The rings in the doors (X, Y on the doors' plane) and the rings in the rock the chains run to (X, z). */
  rings: [-1.45, 1.45],
  ringY: 2.75,
  anchors: [
    [-11.9, 26.6],
    [11.9, 26.6],
  ] as Pt[],
  /** The dog's hollow: its middle and radii (X, z). */
  hollow: { X: 0, z: 21, rx: 8.4, rz: 5.4 },
};
const G = CB.gate;
const PR = CB.pier;
const LT = CB.lintel;

/** The near shore of the river on the left (X at depth z): it bends out to the cliff's broken end. */
const shoreX = (z: number) => -11.8 - Math.max(0, z - 23) * 0.55 + Math.sin(z * 0.9) * 0.18;
/** The far bank's X at depth z. */
const FAR_X = -36;

// ——— palettes and light ———

/** The cavern's air (cold smoke) and the abyss's (smoke lit red from below). */
const CAVE: Air = { color: '#1a1422', far: 0.55 };
const PIT: Air = { color: '#4a1a1c', far: 0.72 };
const MARBLE = { body: '#181216', lit: '#3e3238', shade: '#0a070a', vein: '#6a5a62' };
const IRON = { lit: '#6a6a78', body: '#2a2a32', shade: '#121216', deep: '#08080a', rust: '#4a2a18' };
const BASALT = { dark: '#09080b', body: '#201c25', lit: '#3c3642' };

export const TEMPER: Record<Temper, { cols: [string, string, string]; glow: number; css: string; coal: string; smoke: string }> = {
  fire: { cols: ['#d0400e', '#f49a3a', '#fff2c8'], glow: 0xff7a30, css: '#ff8a40', coal: '#ffb060', smoke: '#6a5450' },
  ice: { cols: ['#1a5ad8', '#6ac8ff', '#eefaff'], glow: 0x6ac8ff, css: '#7ad0ff', coal: '#bfe8ff', smoke: '#9ab8d0' },
  poison: { cols: ['#2a8a1c', '#8ee04a', '#f0ffc8'], glow: 0x8ee04a, css: '#8ee04a', coal: '#c8ff8a', smoke: '#4a6a3a' },
};

/** The lights that reach the gate and the floor: the faint key from the high left, the abyss's red past the cliff's
 * end (low, from the left and behind), and the three fires. */
const KEY: V3 = (() => {
  const v: V3 = [-0.55, 0.62, -0.56];
  const l = Math.hypot(...v);
  return [v[0] / l, v[1] / l, v[2] / l];
})();
const PIT_DIR: V3 = (() => {
  const v: V3 = [-0.86, 0.12, 0.5];
  const l = Math.hypot(...v);
  return [v[0] / l, v[1] / l, v[2] / l];
})();
const FIRES = CB.braziers.map((b) => ({ p: [b.X, CB.bowlY + 0.7, b.z] as V3, col: TEMPER[b.t].cols[1], t: b.t }));

/** A surface's colour under the scene's lights: base lit by the key, the abyss and the fires (n its normal). */
function lit(base: string, X: number, Y: number, z: number, n: V3, o: { key?: number; pit?: number; fire?: number; reach?: number } = {}): string {
  const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  let c = mix(base, '#6e5e66', clamp01(dot(n, KEY)) * (o.key ?? 0.3));
  // the abyss: strongest on the left of the scene, fading to the right
  const pk = clamp01(dot(n, PIT_DIR)) * clamp01(1 - (X + 16) / 34) * (o.pit ?? 0.5);
  c = mix(c, '#c8401c', pk);
  for (const f of FIRES) {
    const v: V3 = [f.p[0] - X, f.p[1] - Y, f.p[2] - z];
    const d = Math.hypot(...v);
    const lam = clamp01(dot(n, [v[0] / d, v[1] / d, v[2] / d]));
    const fall = 1 / (1 + (d / (o.reach ?? 4.5)) ** 2);
    c = mix(c, f.col, lam * fall * (o.fire ?? 0.5));
  }
  return c;
}

// ——— small helpers ———

const quad = (a: Pt, b: Pt, c: Pt, d: Pt) => polyPath([a, b, c, d]);
/** A face square to us at depth z. */
const faceAt = (X0: number, X1: number, Y0: number, Y1: number, z: number) => quad(P(X0, Y0, z), P(X1, Y0, z), P(X1, Y1, z), P(X0, Y1, z));
/** A face along z at X (a reveal, a pier's side). */
const sideAt = (X: number, z0: number, z1: number, Y0: number, Y1: number) => quad(P(X, Y0, z0), P(X, Y0, z1), P(X, Y1, z1), P(X, Y1, z0));
/** A level face at height Y between z0 and z1. */
const topAt = (X0: number, X1: number, z0: number, z1: number, Y: number) => quad(P(X0, Y, z0), P(X1, Y, z0), P(X1, Y, z1), P(X0, Y, z1));
function fillPath(ctx: Ctx, path: (c: Ctx) => void, fill: string | CanvasGradient): void {
  path(ctx);
  ctx.fillStyle = fill;
  ctx.fill();
}
function strokePath(ctx: Ctx, path: (c: Ctx) => void, col: string, w: number): void {
  path(ctx);
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.lineJoin = 'round';
  ctx.stroke();
}
function lin(ctx: Ctx, a: Pt, b: Pt, stops: [number, string][]): CanvasGradient {
  const g = ctx.createLinearGradient(a[0], a[1], b[0], b[1]);
  for (const [t, c] of stops) g.addColorStop(t, c);
  return g;
}
/** Black marble in a path: its body colour, cloudy depth, white veins wandering across it. */
function marble(ctx: Ctx, path: (c: Ctx) => void, col: string, b: Box, seed: number, veins = 0.35): void {
  fillPath(ctx, path, col);
  within(ctx, path, () => {
    lay(ctx, drift(shade(col, 0.3), shade(col, -0.6), 3, seed, 48, 64), b, 0.55);
    lay(ctx, noiseMask(5, seed + 7, { kind: 'web', cover: 0.2, soft: 0.04, col: MARBLE.vein, w: 90, h: 120 }), b, veins * 0.9);
    lay(ctx, noiseMask(9, seed + 11, { kind: 'web', cover: 0.14, soft: 0.03, col: '#9a8a92', w: 120, h: 160 }), b, veins * 0.5);
  });
}

// ——— the far view: past the cliff's broken end, the river runs off into the smoke under its far bank ———

/** The far bank's columns: two ranks along the river's far side, broken off at stepped heights. */
const FAR_BANK: Col[] = (() => {
  const r = rng(hashStr('cb:farbank'));
  const out: Col[] = [];
  let seed = 500;
  let groupY = 12;
  let left = 0;
  for (let z = 36; z < 120; ) {
    if (left-- <= 0) {
      left = 2 + Math.floor(r() * 4);
      groupY = r() < 0.25 ? 4 + r() * 4 : 9 + r() * 12;
    }
    const rad = 0.8 + r() * 0.3;
    for (const dX of [0, -1.5]) {
      const Y1 = Math.max(2, groupY + (r() - 0.5) * 2 + (dX ? 3 : 0));
      out.push({ X: FAR_X + dX + (r() - 0.5) * 0.3, z: z + (dX ? 0.8 : 0), Y0: -0.5, Y1, verts: colVerts(r, rad), tilt: (r() - 0.5) * 1.6, joints: colJoints(r, 0, Y1, 2.2), chip: -1, seed: seed++ });
    }
    z += rad * 1.7 * (1 + (z - 36) / 60);
  }
  return out.sort((a, b) => b.z - a.z);
})();

export const FAR_BOX: Box = { x: 0, y: 0, w: 560, h: TY + 6 };
/** The far bank's top (screen y) at x: a wall of columns lost in the smoke. */
const farTop = (x: number) => {
  const z = (F * -FAR_X) / Math.max(40, 960 - x);
  const Y = 15 + Math.sin(x * 0.021) * 2.2 + Math.sin(x * 0.057 + 1) * 1.1 + (Math.floor(x / 19) % 3) * 0.7;
  return sy(Y, z);
};
const farFoot = (x: number) => sy(0, (F * -FAR_X) / Math.max(40, 960 - x));

function far(ctx: Ctx, r: R): void {
  const b = FAR_BOX;
  // the smoke over the underworld: black above, the abyss's red glowing up from below the far bank
  vfill(ctx, b.x, b.y, b.w, 640, [[0, '#07050a'], [0.35, '#120a10'], [0.62, '#2e1014'], [0.78, '#4a1812'], [0.86, '#3a1412'], [1, '#1a0c10']]);
  surface(ctx, r, { x: 0, y: 0, w: b.w, h: 640 }, '#1a0c10', { over: true, vary: 0.4, cells: 4, mottle: 0.25, strokes: 0.1, strokeAng: 0.05, strokeLen: 200, strokeW: 14, warm: '#5a2014', cool: '#0c0814', seed: 31 });
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glowAt(ctx, 170, 520, 380, '#ff4a1c', 0.22, 0.5);
  glowAt(ctx, 90, 540, 180, '#ff8a3a', 0.16, 0.4);
  ctx.restore();
  // banks of smoke, lit red from below
  for (const [x, y, w, h, a] of [[140, 300, 420, 70, 0.5], [380, 230, 380, 60, 0.38], [60, 430, 360, 60, 0.55], [330, 410, 400, 50, 0.45]] as const) {
    cloud(ctx, r, x, y, w, h, { kind: 'bank', lit: '#b8452a', body: '#3a1618', shadow: '#0c0610', sunX: 170, sunY: 640, rim: 0.25, wisp: 0.55, a, res: 0.4 });
  }
  // spires of rock far off in the smoke, lit along their left edges
  for (const [x, w, top] of [[60, 34, 330], [150, 22, 380], [300, 40, 300], [410, 26, 370], [500, 30, 340]] as const) {
    const base = 560;
    const path = polyPath([[x - w, base], [x - w * 0.5, top + 40], [x - w * 0.15, top + 6], [x, top], [x + w * 0.2, top + 14], [x + w * 0.6, top + 60], [x + w, base]]);
    fillPath(ctx, path, airMix('#1e1418', 0.9, PIT));
    strokePath(ctx, (c) => {
      c.beginPath();
      c.moveTo(x - w * 0.5, top + 40);
      c.lineTo(x - w * 0.15, top + 6);
      c.lineTo(x, top);
    }, rgba('#ff6a3a', 0.35), 1.4);
  }
  haze(ctx, 380, 600, '#5a1e18', 0.45, 0.6, 0, b.w);
  // the far bank: columns standing out of the water in stepped ranks, dark against the red smoke, their broken
  // tops rimmed by the glow behind
  for (const h of FAR_BANK) column(ctx, h, { dim: 0.45, air: 0.7, shadow: false });
  // the smoke settling over the bank, thick at its top
  vfill(ctx, 0, 100, b.w, 400, [[0, rgba('#2a1014', 0.85)], [0.55, rgba('#3a1416', 0.45)], [1, rgba('#3a1416', 0)]]);
  // smoke drifting along in front of it, and the red glow along its foot on the water
  for (const [x, y, w, h, a] of [[120, 470, 380, 40, 0.5], [380, 500, 300, 30, 0.45], [40, 530, 260, 26, 0.4]] as const) {
    cloud(ctx, r, x, y, w, h, { kind: 'bank', lit: '#c0502a', body: '#3a1618', shadow: '#0c0610', sunX: 170, sunY: 640, rim: 0.3, wisp: 0.6, a, res: 0.4 });
  }
  vfill(ctx, 0, 500, b.w, 80, [[0, rgba('#ff5a2a', 0)], [1, rgba('#ff5a2a', 0.12)]]);
  // the river under it, from the far bank to our shore
  riverNear(ctx, r);
}

// ——— the cliff of columnar basalt, and the gateway cut in it ———

/** A basalt column standing at (X, z): a prism of 5 to 7 uneven sides (verts: angle and radius of each corner) from
 * Y0 up to Y1 (its top tilted a little), cracked across by its joints. */
interface Col {
  X: number;
  z: number;
  Y0: number;
  Y1: number;
  verts: [number, number][];
  tilt: number;
  joints: number[];
  chip: number;
  seed: number;
}

/** A column (or a column's stump) under the scene's lights. dim darkens it (the cliff behind the lanes). */
function column(ctx: Ctx, h: Col, o: { dim?: number; air?: number; shadow?: boolean } = {}): void {
  const n = h.verts.length;
  const at = (i: number, Y: number): Pt => {
    const [a, rr] = h.verts[i % n];
    return P(h.X + Math.cos(a) * rr, Y + h.tilt * Math.cos(a), h.z + Math.sin(a) * rr);
  };
  const wpt = (i: number): [number, number] => {
    const [a, rr] = h.verts[i % n];
    return [h.X + Math.cos(a) * rr, h.z + Math.sin(a) * rr];
  };
  const k = pz(h.z);
  const dim = o.dim ?? 0;
  const faces: { i: number; nx: number; nz: number; d: number }[] = [];
  for (let i = 0; i < n; i++) {
    const [x0, z0] = wpt(i);
    const [x1, z1] = wpt(i + 1);
    let nx = z1 - z0;
    let nz = -(x1 - x0);
    const nl = Math.hypot(nx, nz) || 1;
    nx /= nl;
    nz /= nl;
    if (nx * ((x0 + x1) / 2 - h.X) + nz * ((z0 + z1) / 2 - h.z) < 0) {
      nx = -nx;
      nz = -nz;
    }
    const vis = nx * -(x0 + x1) / 2 + nz * -(z0 + z1) / 2;
    if (vis > 0) faces.push({ i, nx, nz, d: vis });
  }
  faces.sort((a, b) => a.d - b.d);
  if (o.shadow !== false && h.Y0 <= 0.01) groundShadow(ctx, sx(h.X, h.z) + k * 0.25, sy(0, h.z) + 1, k * 0.55, k * 0.1, 0.55, '#000000');
  const ym = (h.Y0 + Math.min(h.Y1, 14)) / 2;
  const vals: number[] = [];
  for (const f of faces) {
    const quadPts: Pt[] = [at(f.i, h.Y0), at(f.i + 1, h.Y0), at(f.i + 1, h.Y1), at(f.i, h.Y1)];
    const path = polyPath(quadPts);
    const fb = boxOfPts(quadPts, 1);
    const [mx, mz] = [(wpt(f.i)[0] + wpt(f.i + 1)[0]) / 2, (wpt(f.i)[1] + wpt(f.i + 1)[1]) / 2];
    let col = lit(mix(BASALT.body, h.seed % 3 ? BASALT.dark : BASALT.lit, ((h.seed * 37) % 10) / 40), mx, ym, mz, [f.nx, 0, f.nz], { key: 0.45, pit: 0.65, fire: 0.5, reach: 4 });
    col = mix(col, BASALT.dark, dim);
    if (o.air) col = airMix(col, o.air, PIT);
    const v = (parseInt(col.slice(1, 3), 16) + parseInt(col.slice(3, 5), 16) + parseInt(col.slice(5, 7), 16)) / 765;
    vals.push(v);
    fillPath(ctx, path, col);
    within(ctx, path, () => {
      // darker towards its foot and up into the dark; a wet sheen down the face; the joints across it
      vfill(ctx, fb.x, fb.y, fb.w, fb.h, [[0, 'rgba(0,0,0,0.25)'], [0.5, 'rgba(0,0,0,0)'], [0.85, 'rgba(0,0,0,0.1)'], [1, 'rgba(2,1,4,0.45)']]);
      ctx.fillStyle = rgba('#c8c0d8', 0.04 + v * 0.1);
      ctx.fillRect(fb.x + fb.w * (0.2 + (h.seed % 5) * 0.12), fb.y, Math.max(1, fb.w * 0.07), fb.h);
      for (const Y of h.joints) {
        if (Y >= h.Y1 - 0.03 || Y <= h.Y0) continue;
        const a0 = at(f.i, Y);
        const a1 = at(f.i + 1, Y);
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = Math.max(1, k * 0.03);
        ctx.beginPath();
        ctx.moveTo(a0[0], a0[1]);
        ctx.lineTo(a1[0], a1[1]);
        ctx.stroke();
        ctx.strokeStyle = rgba('#b8a8c0', 0.06 + v * 0.3);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a0[0], a0[1] + 1.5);
        ctx.lineTo(a1[0], a1[1] + 1.5);
        ctx.stroke();
      }
    });
    ctx.strokeStyle = 'rgba(2,1,4,0.45)';
    ctx.lineWidth = 1;
    path(ctx);
    ctx.stroke();
  }
  // the arrises between a lit face and a dark one catch the light
  for (let q = 1; q < faces.length; q++) {
    const a = faces[q - 1];
    const b = faces[q];
    const shared = (a.i + 1) % n === b.i ? b.i : (b.i + 1) % n === a.i ? a.i : -1;
    if (shared < 0) continue;
    const [x0, y0] = at(shared, h.Y0 + 0.05);
    const [x1, y1] = at(shared, h.Y1 - 0.02);
    ctx.strokeStyle = rgba('#d8d0e8', 0.05 + Math.abs(vals[q] - vals[q - 1]) * 0.7);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  // its top, if we look down on it: ash settled on it, its back edge rimmed by the abyss
  if (h.Y1 < EH - 0.05) {
    const top = Array.from({ length: n }, (_, i) => at(i, h.Y1));
    const tp = polyPath(top);
    const tb = boxOfPts(top, 1);
    fillPath(ctx, tp, mix(lit('#363036', h.X, h.Y1, h.z, [0, 1, 0], { key: 0.45, fire: 0.45, reach: 4 }), BASALT.dark, dim));
    within(ctx, tp, () => {
      lay(ctx, drift('#7a6a70', '#20181e', 2, h.seed, 16, 16), tb, 0.45);
      lay(ctx, noiseMask(3, h.seed + 3, { cover: 0.42, soft: 0.35, col: '#8a8288', w: 12, h: 12 }), tb, 0.45);
      if (h.chip >= 0) {
        const c0 = top[h.chip];
        const c1 = top[(h.chip + 1) % n];
        const c2 = top[(h.chip + n - 1) % n];
        ctx.fillStyle = 'rgba(16,12,16,0.85)';
        ctx.beginPath();
        ctx.moveTo(c0[0], c0[1]);
        ctx.lineTo(c0[0] + (c1[0] - c0[0]) * 0.45, c0[1] + (c1[1] - c0[1]) * 0.45 + 2);
        ctx.lineTo((c0[0] + c1[0] + c2[0]) / 3, (c0[1] + c1[1] + c2[1]) / 3 + 2);
        ctx.lineTo(c0[0] + (c2[0] - c0[0]) * 0.45, c0[1] + (c2[1] - c0[1]) * 0.45 + 2);
        ctx.closePath();
        ctx.fill();
      }
    });
    ctx.strokeStyle = 'rgba(2,1,4,0.9)';
    ctx.lineWidth = 1.2;
    tp(ctx);
    ctx.stroke();
    for (let i = 0; i < n; i++) {
      const [p0x, p0y] = top[i];
      const [p1x, p1y] = top[(i + 1) % n];
      const back = (p0y + p1y) / 2 < sy(h.Y1, h.z);
      ctx.strokeStyle = back ? rgba('#ff6a3a', 0.22 * (1 - dim)) : rgba('#d0c4d0', 0.1 * (1 - dim));
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p0x, p0y + (back ? 0.6 : -0.6));
      ctx.lineTo(p1x, p1y + (back ? 0.6 : -0.6));
      ctx.stroke();
    }
  } else if (h.Y1 < 60) {
    // a broken end above our eye: a jagged top against the smoke, rimmed by the abyss
    const top = Array.from({ length: n }, (_, i) => at(i, h.Y1));
    ctx.strokeStyle = rgba('#ff6a3a', 0.3 * (1 - dim));
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  }
}

/** A column's corners: 5 to 7 uneven sides. */
function colVerts(r: R, rad: number): [number, number][] {
  const sides = 5 + Math.floor(r() * 3);
  const rot = r() * P2;
  return Array.from({ length: sides }, (_, i) => [rot + ((i + (r() - 0.5) * 0.3) / sides) * P2, rad * (0.88 + r() * 0.2)]);
}
function colJoints(r: R, Y0: number, Y1: number, step: number): number[] {
  const out: number[] = [];
  for (let y = Y0 + step * (0.3 + r() * 0.7); y < Math.min(Y1, 40); y += step * (0.6 + r() * 0.9)) out.push(y);
  return out;
}

/** The cliff: a wall of tall columns along CB.cliffZ from the broken left end to the right edge, broken off at
 * stepped heights towards its end, the gateway cut through it. */
const CLIFF: Col[] = (() => {
  const r = rng(hashStr('cb:cliff'));
  const out: Col[] = [];
  let seed = 1;
  // the upper cliff, set back: tall columns lost up in the dark
  for (let X = CB.cliffEnd + 2.4; X < 34; ) {
    const rad = 0.75 + r() * 0.25;
    if (Math.abs(X) > LT.hw - 1) out.push({ X, z: CB.cliffZ + 3.2 + r() * 0.8, Y0: 6, Y1: 60, verts: colVerts(r, rad), tilt: 0, joints: colJoints(r, 6, 60, 3), chip: -1, seed: seed++ });
    X += rad * 1.62;
  }
  // the main face: broken off at stepped heights above our heads, stepping down to its broken end; beside the gate
  // its columns come forward to the piers, buttressing the gateway
  let stepY = 12;
  for (let X = CB.cliffEnd + 0.6; X < 32; ) {
    const rad = 0.7 + r() * 0.22;
    const ax = Math.abs(X);
    const beside = ax > PR.x1 + 0.1 && ax < PR.x1 + 4.5;
    const z = beside ? PR.z + 0.25 + (ax - PR.x1) * 0.55 + r() * 0.2 : CB.cliffZ + 0.4 + r() * 0.8;
    const fromEnd = X - CB.cliffEnd;
    if (r() < 0.3) stepY = 8 + r() * 9;
    let Y1 = beside ? 60 : stepY + (r() - 0.5) * 1.2;
    if (fromEnd < 5) Y1 = Math.min(Y1, 1.6 + fromEnd * 2.4 + r() * 2);
    out.push({ X, z, Y0: 0, Y1, verts: colVerts(r, rad), tilt: (r() - 0.5) * 0.06, joints: colJoints(r, 0, Y1, 2.2), chip: r() < 0.4 ? Math.floor(r() * 5) : -1, seed: seed++ });
    X += rad * 1.62 + (r() - 0.5) * 0.2;
  }
  // a front rank, nearer, at the cliff's foot on the right: broken off at stepped heights
  const rad0 = 0.6;
  const rowZ = rad0 * Math.sqrt(3);
  for (let row = 0; row < 2; row++) {
    for (let c = 0; c < 22; c++) {
      const X = PR.x1 + 2.2 + c * rad0 * 1.5 + (r() - 0.5) * 0.08;
      const z = CB.cliffZ - 0.9 - row * rowZ - (c % 2) * rowZ * 0.5 + (r() - 0.5) * 0.06;
      const out_ = clamp01((X - 13) / 12);
      let Y1 = 0.3 + out_ ** 1.2 * 1.9 + (r() - 0.5) * 0.5 + (1 - row) * 0.3;
      Y1 = Math.min(2.6, Math.max(0.2, Math.round(Y1 / 0.3) * 0.3));
      out.push({ X, z, Y0: 0, Y1, verts: colVerts(r, rad0 * (0.9 + r() * 0.15)), tilt: (r() - 0.5) * 0.08, joints: colJoints(r, 0, Y1, 0.5), chip: r() < 0.35 ? Math.floor(r() * 5) : -1, seed: seed++ });
    }
  }
  return out.sort((a, b) => b.z - a.z);
})();

/** Where the gateway is cut through the cliff (the piers and the lintel stand in it). */
const cutPath = () => polyPath([P(-PR.x1, 40, PR.z), P(PR.x1, 40, PR.z), P(PR.x1, 0, PR.z), P(-PR.x1, 0, PR.z)]);

export const CLIFF_BOX: Box = { x: 0, y: 0, w: W, h: 612 };

function cliff(ctx: Ctx, r: R): void {
  // the dark at the back of the cut, between the cliff's columns and the gate's frame
  for (const h of CLIFF) {
    const x = sx(h.X, h.z);
    // the columns behind the gate's frame are hidden: skip them (the frame paints over its own cut)
    if (Math.abs(h.X) < LT.hw - 0.8 && h.z > PR.z) continue;
    if (x < -80 || x > W + 80) continue;
    // behind the lanes the cliff is kept dark and calm
    const lane = clamp01(1 - Math.abs(x - 960) / 760) * 0.45;
    column(ctx, h, { dim: lane + (h.Y1 > 20 ? 0.1 : 0), shadow: h.Y1 < 20 });
  }
  // water seeping down the columns in dark stains, from the joints high up
  for (const x of [120, 330, 1480, 1600, 1760, 1880]) streaks(ctx, r, x + (r() - 0.5) * 40, 60 + r() * 120, 60, 260 + r() * 200, '#000000', 0.3, 4);
  // the cliff fades up into the dark, and the smoke hangs in front of its foot
  vfill(ctx, 0, 0, W, 260, [[0, 'rgba(4,2,8,0.82)'], [1, 'rgba(4,2,8,0)']]);
  haze(ctx, 470, 612, '#2a1820', 0.35, 0.7, 380, W);
  // the cut round the gate: soot from the fires, dark in its corners
  within(ctx, cutPath(), () => {
    ctx.fillStyle = '#060408';
    ctx.fillRect(0, 0, W, 612);
  });
  // the doors' opening, behind the doors: the underworld's red, deep inside
  const [ox0, oy0] = P(-G.hw, G.h, G.z + 0.4);
  const [ox1, oy1] = P(G.hw, G.sill, G.z + 0.4);
  ctx.fillStyle = '#0a0406';
  ctx.fillRect(ox0, oy0, ox1 - ox0, oy1 - oy0);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(960 - 40, 0, 960 + 40, 0);
  g.addColorStop(0, 'rgba(255,60,20,0)');
  g.addColorStop(0.5, 'rgba(255,80,30,0.7)');
  g.addColorStop(1, 'rgba(255,60,20,0)');
  ctx.fillStyle = g;
  ctx.fillRect(920, oy0, 80, oy1 - oy0);
  ctx.restore();
}

// ——— the gate's frame: black marble piers with bronze capitals, the lintel carved in relief ———

/** A carved shape in relief on a face lit from the high left: its shadow thrown down-right onto the ground of the
 * relief, its body shaded from a lit upper-left to a dark lower-right, a thin lit lip and a dark outline. */
function carve(ctx: Ctx, path: (c: Ctx) => void, b: Box, col: string, k: number, o: { lip?: number; shadow?: number } = {}): void {
  castShadow(ctx, path, 2.2 * k, 1.6 * k, o.shadow ?? 0.7, '#000000');
  fillPath(ctx, path, lin(ctx, [b.x, b.y], [b.x + b.w, b.y + b.h], [[0, shade(col, 0.32)], [0.55, col], [1, shade(col, -0.45)]]));
  within(ctx, path, () => {
    // the edge turned away from the light, in shadow; the lit lip on the other side
    ctx.save();
    ctx.translate(-1.2 * k, -1.4 * k);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 2.4 * k;
    path(ctx);
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.translate(1 * k, 1.1 * k);
    ctx.strokeStyle = rgba('#d8c8d0', o.lip ?? 0.22);
    ctx.lineWidth = 1.2 * k;
    path(ctx);
    ctx.stroke();
    ctx.restore();
  });
  strokePath(ctx, path, 'rgba(4,2,6,0.7)', 0.8 * k);
}

/** One of the hound's heads, front-on, snarling: broad skull, ears laid up and out, brows drawn down, the muzzle
 * narrowing to the nose, lips drawn back off the fangs. (x, y) the brow's middle, s px per unit (the head is about
 * 2 units wide), turn leans it towards one side. */
function houndHead(ctx: Ctx, x: number, y: number, s: number, turn: number, col: string): void {
  const k = s / 40;
  ctx.save();
  ctx.translate(x, y);
  ctx.transform(1, 0, turn * 0.18, 1, 0, 0);
  const u = (a: number, b: number): Pt => [a * s, b * s];
  const b: Box = { x: -1.2 * s, y: -1.4 * s, w: 2.4 * s, h: 2.8 * s };
  // the ears, laid back and up
  for (const d of [-1, 1]) {
    const ear = polyPath([u(d * 0.55, -0.55), u(d * 1.05, -1.38), u(d * 1.12, -1.3), u(d * 1.02, -0.4), u(d * 0.82, -0.1)]);
    carve(ctx, ear, b, shade(col, -0.08), k);
    const inner = polyPath([u(d * 0.68, -0.5), u(d * 1.02, -1.12), u(d * 0.94, -0.42)]);
    fillPath(ctx, inner, 'rgba(0,0,0,0.4)');
  }
  // the skull and cheeks, tapering into the muzzle
  const head = (c: Ctx) => {
    c.beginPath();
    c.moveTo(-0.95 * s, -0.2 * s);
    c.bezierCurveTo(-0.95 * s, -0.95 * s, 0.95 * s, -0.95 * s, 0.95 * s, -0.2 * s);
    c.bezierCurveTo(1.0 * s, 0.25 * s, 0.7 * s, 0.4 * s, 0.48 * s, 0.62 * s);
    c.lineTo(0.38 * s, 1.15 * s);
    c.quadraticCurveTo(0, 1.32 * s, -0.38 * s, 1.15 * s);
    c.lineTo(-0.48 * s, 0.62 * s);
    c.bezierCurveTo(-0.7 * s, 0.4 * s, -1.0 * s, 0.25 * s, -0.95 * s, -0.2 * s);
    c.closePath();
  };
  carve(ctx, head, b, col, k);
  within(ctx, head, () => {
    // the brows drawn down in a snarl, the eyes deep under them
    for (const d of [-1, 1]) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath();
      ctx.moveTo(d * 0.12 * s, -0.12 * s);
      ctx.lineTo(d * 0.62 * s, -0.36 * s);
      ctx.lineTo(d * 0.6 * s, -0.06 * s);
      ctx.quadraticCurveTo(d * 0.36 * s, 0.08 * s, d * 0.14 * s, 0.0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba('#ff5a2a', 0.4);
      ctx.beginPath();
      ctx.ellipse(d * 0.38 * s, -0.1 * s, 0.07 * s, 0.035 * s, -d * 0.35, 0, P2);
      ctx.fill();
      ctx.strokeStyle = rgba('#d8c8d0', 0.25);
      ctx.lineWidth = 1 * k;
      ctx.beginPath();
      ctx.moveTo(d * 0.12 * s, -0.16 * s);
      ctx.lineTo(d * 0.6 * s, -0.4 * s);
      ctx.stroke();
    }
    // the wrinkles of the snarl over the nose, and the nose
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1.2 * k;
    for (const yy of [0.22, 0.32, 0.42]) {
      ctx.beginPath();
      ctx.moveTo(-0.22 * s, yy * s);
      ctx.quadraticCurveTo(0, (yy - 0.07) * s, 0.22 * s, yy * s);
      ctx.stroke();
    }
    ctx.fillStyle = '#0a0608';
    ctx.beginPath();
    ctx.ellipse(0, 0.66 * s, 0.2 * s, 0.12 * s, 0, 0, P2);
    ctx.fill();
    ctx.fillStyle = rgba('#d8c8d0', 0.3);
    ctx.beginPath();
    ctx.ellipse(-0.06 * s, 0.62 * s, 0.07 * s, 0.03 * s, 0, 0, P2);
    ctx.fill();
  });
  // the open jaws under the muzzle: the dark of the mouth, the fangs over it, the lower jaw
  const mouth = (c: Ctx) => {
    c.beginPath();
    c.moveTo(-0.44 * s, 0.86 * s);
    c.quadraticCurveTo(0, 0.98 * s, 0.44 * s, 0.86 * s);
    c.lineTo(0.3 * s, 1.36 * s);
    c.quadraticCurveTo(0, 1.46 * s, -0.3 * s, 1.36 * s);
    c.closePath();
  };
  fillPath(ctx, mouth, '#060304');
  for (const d of [-1, 1]) {
    fillPath(ctx, polyPath([u(d * 0.34, 0.88), u(d * 0.24, 0.9), u(d * 0.28, 1.14)]), shade(col, 0.5));
    fillPath(ctx, polyPath([u(d * 0.22, 1.36), u(d * 0.14, 1.36), u(d * 0.19, 1.18)]), shade(col, 0.4));
  }
  const jaw = (c: Ctx) => {
    c.beginPath();
    c.moveTo(-0.32 * s, 1.36 * s);
    c.quadraticCurveTo(0, 1.48 * s, 0.32 * s, 1.36 * s);
    c.quadraticCurveTo(0.22 * s, 1.62 * s, 0, 1.64 * s);
    c.quadraticCurveTo(-0.22 * s, 1.62 * s, -0.32 * s, 1.36 * s);
    c.closePath();
  };
  carve(ctx, jaw, b, shade(col, -0.1), k);
  ctx.restore();
}

/** A shade of the dead in the procession: hooded, stooped, a long robe, one hand held out with the ferryman's coin.
 * (x, y) its feet, h its height, dir the way it walks. */
function shadeFigure(ctx: Ctx, x: number, y: number, h: number, dir: number, stoop: number, col: string, k: number, kind: number): void {
  const s = h;
  const X = (v: number) => x + v * s * dir;
  const lean = stoop * 0.12;
  // a cloak from the trailing hem up the bowed back to a rounded hood (its brim over the face), down the chest
  // to the arm held out; kind: 0 a coin held out, 1 leaning on a staff, 2 a bundle on the back, 3 hands clasped
  const fig = (c: Ctx) => {
    c.beginPath();
    c.moveTo(X(-0.18), y);
    c.quadraticCurveTo(X(-0.17), y - s * 0.42, X(-0.11 + lean * 0.4), y - s * 0.7);
    c.bezierCurveTo(X(-0.1 + lean), y - s * 0.95, X(0.06 + lean), y - s * 1.02, X(0.11 + lean), y - s * 0.9);
    c.quadraticCurveTo(X(0.12 + lean), y - s * 0.84, X(0.08 + lean), y - s * 0.8);
    c.quadraticCurveTo(X(0.1 + lean * 0.6), y - s * 0.75, X(0.12 + lean * 0.4), y - s * 0.72);
    if (kind === 0) {
      c.lineTo(X(0.27 + lean * 0.3), y - s * 0.62);
      c.lineTo(X(0.31 + lean * 0.3), y - s * 0.63);
      c.lineTo(X(0.3 + lean * 0.3), y - s * 0.58);
      c.lineTo(X(0.13 + lean * 0.2), y - s * 0.6);
    } else if (kind === 1) {
      c.lineTo(X(0.22 + lean * 0.3), y - s * 0.6);
      c.lineTo(X(0.25 + lean * 0.3), y - s * 0.57);
      c.lineTo(X(0.14 + lean * 0.2), y - s * 0.56);
    } else {
      c.quadraticCurveTo(X(0.17 + lean * 0.3), y - s * 0.6, X(0.14), y - s * 0.52);
    }
    c.quadraticCurveTo(X(0.16), y - s * 0.3, X(0.21), y - s * 0.04);
    c.lineTo(X(0.25), y);
    c.closePath();
  };
  carve(ctx, fig, { x: x - s * 0.3, y: y - s, w: s * 0.6, h: s }, col, k, { shadow: 0.55, lip: 0.16 });
  if (kind === 1) {
    // the staff, planted ahead of him
    strokePath(ctx, (c) => {
      c.beginPath();
      c.moveTo(X(0.26 + lean * 0.3), y - s * 0.7);
      c.lineTo(X(0.34), y);
    }, shade(col, 0.2), 2 * k);
  } else if (kind === 2) {
    // a bundle on his back
    const bun = (c: Ctx) => {
      c.beginPath();
      c.ellipse(X(-0.14 + lean * 0.5), y - s * 0.68, s * 0.09, s * 0.12, dir * 0.4, 0, P2);
    };
    carve(ctx, bun, { x: x - s * 0.3, y: y - s * 0.85, w: s * 0.3, h: s * 0.3 }, shade(col, 0.06), k, { shadow: 0.5, lip: 0.14 });
  }
  // the face lost in the hood's shadow, the folds down the cloak, the coin
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.beginPath();
  ctx.ellipse(X(0.07 + lean), y - s * 0.86, s * 0.035, s * 0.05, dir * 0.3, 0, P2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 0.9 * k;
  for (const f of [-0.1, -0.02, 0.07]) {
    ctx.beginPath();
    ctx.moveTo(X(f + lean * 0.5), y - s * 0.62);
    ctx.quadraticCurveTo(X(f + 0.01), y - s * 0.3, X(f + 0.03), y - 1);
    ctx.stroke();
  }
  if (kind === 0) {
    ctx.fillStyle = rgba(BRZ.lit, 0.5);
    ctx.beginPath();
    ctx.arc(X(0.315 + lean * 0.3), y - s * 0.6, Math.max(1, s * 0.022), 0, P2);
    ctx.fill();
  }
}

/** The dentils, the key pattern and the joints share one spacing: each of the lintel's three blocks holds 15 units,
 * its middle unit on its middle, so its joints fall between units. */
const BLOCK = 8;
const UNIT = BLOCK / 15;
const blockMids = [-BLOCK, 0, BLOCK];

function lintel(ctx: Ctx, r: R): void {
  const z = PR.z;
  const k = pz(z) / 38;
  // its soffit over the opening, seen from below: in shadow, the fires' light faint along it
  const soffit = topAt(-G.hw, G.hw, z, G.z, LT.Y0);
  fillPath(ctx, soffit, '#0c080c');
  within(ctx, soffit, () => {
    const [a0] = P(-G.hw, LT.Y0, z);
    const [a1] = P(G.hw, LT.Y0, z);
    ctx.fillStyle = lin(ctx, [a0, 0], [a1, 0], [[0, rgba('#ff7a3a', 0.12)], [0.5, 'rgba(0,0,0,0)'], [1, rgba('#7ae04a', 0.08)]]);
    ctx.fillRect(a0, 0, a1 - a0, 200);
    const [, yb] = P(0, LT.Y0, G.z);
    vfill(ctx, a0, yb - 10, a1 - a0, 10, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.6)']]);
  });
  // the cornice's underside at the top of the frame
  const cz = z - 0.8;
  const under = topAt(-LT.hw - 0.6, LT.hw + 0.6, cz, z, LT.Y1);
  fillPath(ctx, under, '#140e14');
  within(ctx, under, () => {
    const [x0, y0] = P(-LT.hw - 0.6, LT.Y1, cz);
    vfill(ctx, x0, y0 - 2, 1000, 20, [[0, 'rgba(0,0,0,0.5)'], [1, 'rgba(60,40,50,0.4)']]);
  });
  // the lintel's face: black marble in three blocks
  const face = faceAt(-LT.hw, LT.hw, LT.Y0, LT.Y1, z);
  const fb = boxOfPts([P(-LT.hw, LT.Y1, z), P(LT.hw, LT.Y0, z)], 0);
  for (const [i, m] of blockMids.entries()) {
    const x0 = Math.max(-LT.hw, m - BLOCK / 2);
    const x1 = Math.min(LT.hw, m + BLOCK / 2);
    const bp = faceAt(x0, x1, LT.Y0, LT.Y1, z);
    const bb = boxOfPts([P(x0, LT.Y1, z), P(x1, LT.Y0, z)], 0);
    marble(ctx, bp, lit(MARBLE.body, m, 14, z, [0, 0, -1], { key: 0.45, pit: 0.3, fire: 0.25 }), bb, 40 + i * 7, 0.28);
  }
  within(ctx, face, () => {
    // the light: from the high left, falling off to the right; dark under the cornice
    ctx.fillStyle = lin(ctx, [fb.x, 0], [fb.x + fb.w, 0], [[0, rgba('#c88a6a', 0.12)], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.25)']]);
    ctx.fillRect(fb.x, fb.y, fb.w, fb.h);
    vfill(ctx, fb.x, fb.y, fb.w, 22, [[0, 'rgba(0,0,0,0.6)'], [1, 'rgba(0,0,0,0)']]);
    // the fascia under the cornice: a running key pattern, one hook per unit
    const [, fy0] = P(0, LT.Y1 - 0.05, z);
    const [, fy1] = P(0, LT.Y1 - 0.42, z);
    const kh = fy1 - fy0;
    ctx.lineCap = 'square';
    for (const m of blockMids) {
      for (let j = -7; j <= 7; j++) {
        const X = m + j * UNIT;
        if (Math.abs(X) > LT.hw - UNIT * 0.4) continue;
        const [ux] = P(X - UNIT * 0.42, 0, z);
        const [ux1] = P(X + UNIT * 0.42, 0, z);
        const w = ux1 - ux;
        const hook = (dx: number, dy: number, col: string, lw: number) => {
          ctx.strokeStyle = col;
          ctx.lineWidth = lw;
          ctx.beginPath();
          ctx.moveTo(ux + dx, fy1 + dy);
          ctx.lineTo(ux + dx, fy0 + dy + kh * 0.12);
          ctx.lineTo(ux + w * 0.78 + dx, fy0 + dy + kh * 0.12);
          ctx.lineTo(ux + w * 0.78 + dx, fy1 - kh * 0.28 + dy);
          ctx.lineTo(ux + w * 0.34 + dx, fy1 - kh * 0.28 + dy);
          ctx.lineTo(ux + w * 0.34 + dx, fy0 + kh * 0.5 + dy);
          ctx.moveTo(ux + dx, fy1 + dy);
          ctx.lineTo(ux + w * 1.19 + dx, fy1 + dy);
          ctx.stroke();
        };
        hook(0.8 * k, 0.8 * k, 'rgba(0,0,0,0.6)', 1.8 * k);
        hook(0, 0, rgba('#9a8a90', 0.45), 1.1 * k);
      }
    }
    ctx.lineCap = 'round';
    // the joints between the blocks
    for (const m of [-BLOCK / 2, BLOCK / 2]) {
      const [jx, jy0] = P(m, LT.Y1, z);
      const [, jy1] = P(m, LT.Y0, z);
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(jx - 1, jy0, 2.2, jy1 - jy0);
      ctx.fillStyle = rgba('#b8a8b0', 0.18);
      ctx.fillRect(jx + 1.2, jy0, 1, jy1 - jy0);
    }
  });
  // the relief: the hound in the middle, the dead coming to him from both ends
  const [, ry0] = P(0, LT.Y1 - 0.55, z);
  const [, ry1] = P(0, LT.Y0 + 0.28, z);
  const ground = ry1;
  const relief = lit('#3a2e36', 0, 14, z, [0, 0, -1], { key: 0.5, pit: 0.2, fire: 0.2 });
  const pm = pz(z);
  within(ctx, face, () => {
    // the ground line the figures walk on, and the chains carved running out from his collar
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(fb.x + 10, ground, fb.w - 20, 2);
    // the hound: three heads on one chest, front-on, the middle head highest
    const hs = pm * 0.47;
    const heads: [number, number, number, number][] = [
      [960 - pm * 1.38, ry0 + hs * 1.25 + pm * 0.26, hs * 0.86, -1],
      [960 + pm * 1.38, ry0 + hs * 1.25 + pm * 0.26, hs * 0.86, 1],
      [960, ry0 + hs * 1.25, hs, 0],
    ];
    const collarOf = ([x, y, w]: [number, number, number, number]) => [x, y + w * 1.55, w] as const;
    const sideCollar = collarOf(heads[0])[1];
    // the chains carved from the side collars out along the stone to the dead
    for (const d of [-1, 1]) {
      const pts: Pt[] = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        pts.push([960 + d * (pm * 1.9 + t * pm * 1.6), sideCollar + pm * 0.1 + Math.sin(t * Math.PI) * pm * 0.14 + t * (ground - sideCollar - pm * 0.4)]);
      }
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i];
        const [bx, by] = pts[i + 1];
        ctx.strokeStyle = 'rgba(0,0,0,0.55)';
        ctx.lineWidth = 1.6 * k;
        ctx.beginPath();
        ctx.ellipse((ax + bx) / 2 + 0.8, (ay + by) / 2 + 1, Math.hypot(bx - ax, by - ay) * 0.62, i % 2 ? 1.2 : 2.6, Math.atan2(by - ay, bx - ax), 0, P2);
        ctx.stroke();
        ctx.strokeStyle = rgba('#a89aa0', 0.4);
        ctx.lineWidth = 1 * k;
        ctx.stroke();
      }
    }
    // the ruff: one shaggy mass of fur the three necks rise from, carved in locks, its edge ragged
    const ruffTop = sideCollar - pm * 0.12;
    const ruff = (c: Ctx) => {
      c.beginPath();
      c.moveTo(960 - pm * 2.0, ground - pm * 0.02);
      for (let i = 0; i <= 16; i++) {
        const t = i / 16;
        const x = 960 - pm * 2.0 + t * pm * 4.0;
        const y = ruffTop + Math.sin(t * Math.PI) * -pm * 0.12 + (i % 2 ? pm * 0.09 : 0);
        c.lineTo(x, y);
      }
      c.lineTo(960 + pm * 2.0, ground - pm * 0.02);
      for (let i = 12; i >= 0; i--) {
        const t = i / 12;
        c.lineTo(960 - pm * 2.0 + t * pm * 4.0, ground - pm * 0.02 + (i % 2 ? -pm * 0.07 : 0));
      }
      c.closePath();
    };
    carve(ctx, ruff, { x: 960 - pm * 2, y: ruffTop - pm * 0.2, w: pm * 4, h: ground - ruffTop + pm * 0.2 }, shade(relief, -0.14), k, { lip: 0.12 });
    ctx.strokeStyle = 'rgba(0,0,0,0.38)';
    ctx.lineWidth = 1 * k;
    for (let i = 0; i < 14; i++) {
      const fx = 960 - pm * 1.8 + (i / 13) * pm * 3.6;
      const fy = ruffTop + pm * (0.1 + (i % 3) * 0.12);
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.quadraticCurveTo(fx + pm * 0.07, fy + pm * 0.12, fx - pm * 0.02, fy + pm * 0.26);
      ctx.stroke();
    }
    // the heads, then a spiked collar round each neck
    for (const [x, y, w, turn] of heads) houndHead(ctx, x, y, w, turn, shade(relief, turn ? 0 : 0.08));
    for (const hd of heads) {
      const [cx, cy, w] = collarOf(hd);
      const band = (c: Ctx) => {
        c.beginPath();
        c.moveTo(cx - w * 0.62, cy - w * 0.05);
        c.quadraticCurveTo(cx, cy + w * 0.12, cx + w * 0.62, cy - w * 0.05);
        c.lineTo(cx + w * 0.6, cy + w * 0.15);
        c.quadraticCurveTo(cx, cy + w * 0.32, cx - w * 0.6, cy + w * 0.15);
        c.closePath();
      };
      carve(ctx, band, { x: cx - w * 0.6, y: cy - w * 0.1, w: w * 1.2, h: w * 0.4 }, shade(relief, 0.12), k, { lip: 0.18 });
      for (let i = -2; i <= 2; i++) {
        const sxp = cx + i * w * 0.24;
        const syp = cy + w * 0.22 - Math.abs(i) * w * 0.03;
        fillPath(ctx, polyPath([[sxp - 1.8 * k, syp], [sxp + 1.8 * k, syp], [sxp, syp + w * 0.2]]), shade(relief, 0.3));
      }
    }
    // the dead in procession towards him, from both ends, each with his coin
    const fr = rng(hashStr('cb:shades'));
    for (const d of [-1, 1]) {
      for (let j = 0; j < 5; j++) {
        const X = d * (BLOCK + (j - 2) * 1.45) + (fr() - 0.5) * 0.2;
        const hgt = pm * (1.4 + fr() * 0.45);
        const [fx] = P(X, 0, z);
        shadeFigure(ctx, fx, ground, hgt, -d, 0.2 + fr() * 0.8, shade(relief, (fr() - 0.5) * 0.1), k, (j + (d > 0 ? 2 : 0)) % 4);
      }
    }
    // wear: soot from the fires below up the face, a crack from each joint
    vfill(ctx, fb.x, fb.y + fb.h - 30, fb.w, 30, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.5)']]);
    crack(ctx, r, sx(BLOCK / 2, z) + 2, ry1 + 4, -Math.PI / 2 - 0.3, 46, { col: '#020103', lip: '#a898a0', w: 1.4, a: 0.6 });
    crack(ctx, r, sx(-BLOCK / 2, z) - 2, ry1 + 4, -Math.PI / 2 + 0.4, 34, { col: '#020103', lip: '#a898a0', w: 1.2, a: 0.5 });
  });
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  within(ctx, face, () => {
    const g = ctx.createRadialGradient(960, fb.y + fb.h + 10, 0, 960, fb.y + fb.h + 10, 260);
    g.addColorStop(0, rgba('#ff4a1c', 0.14));
    g.addColorStop(1, rgba('#ff4a1c', 0));
    ctx.fillStyle = g;
    ctx.fillRect(fb.x, fb.y, fb.w, fb.h);
  });
  ctx.restore();
  strokePath(ctx, face, 'rgba(2,1,4,0.9)', 1.4);
  // the dentils under the cornice, one per unit
  const dz = z - 0.45;
  for (const m of blockMids) {
    for (let j = -7; j <= 7; j++) {
      const X = m + j * UNIT;
      if (Math.abs(X) > LT.hw + 0.4) continue;
      const dp = faceAt(X - UNIT * 0.3, X + UNIT * 0.3, LT.Y1 + 0.02, LT.Y1 + 0.3, dz);
      fillPath(ctx, dp, '#1c141a');
      const [dx0, dy0] = P(X - UNIT * 0.3, LT.Y1 + 0.02, dz);
      const [dx1] = P(X + UNIT * 0.3, LT.Y1 + 0.02, dz);
      ctx.fillStyle = rgba('#b8a0a8', 0.14);
      ctx.fillRect(dx0, dy0 - 1.5, dx1 - dx0, 1.2);
    }
  }
}

/** A pier: black marble, a moulded plinth, a sunk panel carved with a torch turned down (the torch of the dead),
 * a capital of bronze. Its inner face, the reveal, runs back to the doors. */
function pier(ctx: Ctx, r: R, side: -1 | 1): void {
  const z = PR.z;
  const k = pz(z) / 38;
  const xi = side * PR.x0;
  const xo = side * PR.x1;
  const [X0, X1] = side < 0 ? [xo, xi] : [xi, xo];
  // the reveal: the pier's inner face, back to the doors, in its own shade
  const rev = sideAt(xi, z, G.z, 0, LT.Y0);
  const rb = boxOfPts([P(xi, LT.Y0, z), P(xi, 0, G.z)], 1);
  marble(ctx, rev, lit(MARBLE.body, xi, 5, (z + G.z) / 2, [-side, 0, 0], { key: 0.3, pit: 0.5, fire: 0.5 }), rb, 70 + side, 0.2);
  within(ctx, rev, () => {
    vfill(ctx, rb.x, rb.y, rb.w, rb.h, [[0, 'rgba(0,0,0,0.5)'], [0.6, 'rgba(0,0,0,0.15)'], [1, 'rgba(0,0,0,0.4)']]);
    ctx.fillStyle = side < 0 ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.45)';
    ctx.fillRect(rb.x, rb.y, rb.w, rb.h);
  });
  // the front face
  const face = faceAt(X0, X1, 0, LT.Y0, z);
  const fb = boxOfPts([P(X0, LT.Y0, z), P(X1, 0, z)], 0);
  marble(ctx, face, lit(MARBLE.body, xi, 6, z, [0, 0, -1], { key: 0.45, pit: 0.45, fire: 0.6 }), fb, 80 + side * 3, 0.32);
  within(ctx, face, () => {
    // the light: its lit edge on the left, darker to the right; the fires' light up its foot
    ctx.fillStyle = lin(ctx, [fb.x, 0], [fb.x + fb.w, 0], [[0, rgba('#d8a88a', 0.1)], [0.4, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.3)']]);
    ctx.fillRect(fb.x, fb.y, fb.w, fb.h);
    const fireCol = side < 0 ? TEMPER.fire.cols[1] : TEMPER.poison.cols[1];
    vfill(ctx, fb.x, fb.y + fb.h * 0.55, fb.w, fb.h * 0.45, [[0, rgba(fireCol, 0)], [1, rgba(fireCol, 0.16)]]);
    // the sunk panel and its torch
    const pX0 = X0 + 0.42;
    const pX1 = X1 - 0.42;
    const pb = boxOfPts([P(pX0, 10.6, z), P(pX1, 2.2, z)], 0);
    fillPath(ctx, faceAt(pX0, pX1, 2.2, 10.6, z), 'rgba(0,0,0,0.28)');
    // its edges: the top and left in shadow (the light is high left), the bottom and right lit
    const [a0x, a0y] = P(pX0, 10.6, z);
    const [a1x, a1y] = P(pX1, 2.2, z);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(a0x, a0y, a1x - a0x, 3 * k);
    ctx.fillRect(a0x, a0y, 3 * k, a1y - a0y);
    ctx.fillStyle = rgba('#c8b0b8', 0.2);
    ctx.fillRect(a0x, a1y - 1.5 * k, a1x - a0x, 1.5 * k);
    ctx.fillRect(a1x - 1.5 * k, a0y, 1.5 * k, a1y - a0y);
    const tx = (a0x + a1x) / 2;
    const pm = pz(z);
    // the key of the underworld, carved down the panel: its bow a ring with the hound's three heads in it, a long
    // shaft, the bit's wards at its foot
    const stone = '#2e242a';
    const bowY = a0y + pm * 1.0;
    const bowR = pm * 0.62;
    const bow = (c: Ctx) => {
      c.beginPath();
      c.arc(tx, bowY, bowR, 0, P2);
      c.arc(tx, bowY, bowR * 0.62, 0, P2, true);
    };
    carve(ctx, bow, { x: tx - bowR, y: bowY - bowR, w: bowR * 2, h: bowR * 2 }, stone, k);
    for (const d of [-1, 0, 1]) {
      const hp = (c: Ctx) => {
        c.beginPath();
        c.arc(tx + d * bowR * 0.28, bowY + (d ? bowR * 0.05 : -bowR * 0.12), bowR * 0.13, 0, P2);
      };
      carve(ctx, hp, { x: tx - bowR, y: bowY - bowR, w: bowR * 2, h: bowR * 2 }, stone, k * 0.6, { shadow: 0.5 });
    }
    const collarK = polyPath([[tx - pm * 0.3, bowY + bowR * 0.95], [tx + pm * 0.3, bowY + bowR * 0.95], [tx + pm * 0.3, bowY + bowR * 1.35], [tx - pm * 0.3, bowY + bowR * 1.35]]);
    const shaft = polyPath([[tx - pm * 0.13, bowY + bowR * 1.3], [tx + pm * 0.13, bowY + bowR * 1.3], [tx + pm * 0.13, a0y + pm * 7.4], [tx - pm * 0.13, a0y + pm * 7.4]]);
    carve(ctx, shaft, pb, stone, k);
    carve(ctx, collarK, pb, stone, k);
    const wards = polyPath([
      [tx + pm * 0.1, a0y + pm * 6.0], [tx + pm * 0.62, a0y + pm * 6.0], [tx + pm * 0.62, a0y + pm * 6.35], [tx + pm * 0.42, a0y + pm * 6.35],
      [tx + pm * 0.42, a0y + pm * 6.6], [tx + pm * 0.62, a0y + pm * 6.6], [tx + pm * 0.62, a0y + pm * 7.4], [tx + pm * 0.1, a0y + pm * 7.4],
    ]);
    carve(ctx, side < 0 ? wards : (c: Ctx) => {
      c.save();
      c.translate(tx * 2, 0);
      c.scale(-1, 1);
      wards(c);
      c.restore();
    }, pb, stone, k);
    streaks(ctx, r, tx, a0y + pm * 0.4, pm * 1.3, pm * 8, '#000000', 0.25, 5);
    // soot and grime up its foot, a crack down its inner arris
    vfill(ctx, fb.x, fb.y + fb.h - 80, fb.w, 80, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.55)']]);
    crack(ctx, r, side < 0 ? fb.x + fb.w - 3 : fb.x + 3, fb.y + fb.h * 0.42, Math.PI / 2 + side * 0.2, 60, { col: '#020103', lip: '#a898a0', w: 1.3, a: 0.55 });
  });
  strokePath(ctx, face, 'rgba(2,1,4,0.9)', 1.4);
  // the plinth: a moulded block standing proud of the face
  const pz0 = z - 0.35;
  const plX0 = X0 - 0.3;
  const plX1 = X1 + 0.3;
  fillPath(ctx, topAt(plX0, plX1, pz0, z, 1.4), lit('#3a2e36', xi, 1.4, z, [0, 1, 0], { key: 0.6, fire: 0.6 }));
  fillPath(ctx, sideAt(side < 0 ? plX1 : plX0, pz0, z, 0, 1.4), side < 0 ? '#120c10' : '#0e0a0e');
  const pfront = faceAt(plX0, plX1, 0, 1.4, pz0);
  const pfb = boxOfPts([P(plX0, 1.4, pz0), P(plX1, 0, pz0)], 0);
  marble(ctx, pfront, lit(MARBLE.body, xi, 0.7, pz0, [0, 0, -1], { key: 0.4, pit: 0.4, fire: 0.7 }), pfb, 90 + side, 0.3);
  within(ctx, pfront, () => {
    const [, my] = P(0, 1.08, pz0);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(pfb.x, my, pfb.w, 2);
    ctx.fillStyle = rgba('#c8b0b8', 0.15);
    ctx.fillRect(pfb.x, my + 2, pfb.w, 1);
    vfill(ctx, pfb.x, pfb.y, pfb.w, pfb.h, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.45)']]);
  });
  strokePath(ctx, pfront, 'rgba(2,1,4,0.9)', 1.2);
  // the capital, of bronze: a necking ring, an echinus flaring out under a square abacus that overhangs and throws
  // its shadow down the pier
  const cz0 = z - 0.35;
  const neckY = LT.Y0 - 1.15;
  const abY = LT.Y0 - 0.42;
  const capCol = lit(BRZ.body, xi, 11.5, cz0, [0, 0, -1], { key: 0.45, pit: 0.3, fire: 0.2 });
  const [n0x, n0y] = P(X0 + 0.05, neckY, z - 0.05);
  const [n1x] = P(X1 - 0.05, neckY, z - 0.05);
  const [, n1y] = P(X1, neckY - 0.18, z - 0.05);
  const neck = polyPath([[n0x, n0y], [n1x, n0y], [n1x, n1y], [n0x, n1y]]);
  solid(ctx, neck, { x: n0x, y: n0y, w: n1x - n0x, h: n1y - n0y }, BRONZE_M, shade(capCol, -0.15), { depth: 0.5, air: CAVE, line: 1, formSize: 4 });
  const [e0x, e0y] = P(X0 - 0.38, abY, cz0);
  const [e1x] = P(X1 + 0.38, abY, cz0);
  const ech = (c: Ctx) => {
    c.beginPath();
    c.moveTo(n0x, n0y);
    c.quadraticCurveTo(n0x - (n0x - e0x) * 0.1, e0y + (n0y - e0y) * 0.2, e0x, e0y);
    c.lineTo(e1x, e0y);
    c.quadraticCurveTo(n1x + (e1x - n1x) * 0.1, e0y + (n0y - e0y) * 0.2, n1x, n0y);
    c.closePath();
  };
  const eb = { x: e0x, y: e0y, w: e1x - e0x, h: n0y - e0y };
  castShadow(ctx, ech, 8, 6, 0.6, '#000000');
  solid(ctx, ech, eb, BRONZE_M, capCol, { depth: 0.5, air: CAVE, line: 1.2, formSize: 10 });
  within(ctx, ech, () => {
    lay(ctx, noiseMask(5, 120 + side, { cover: 0.35, soft: 0.2, col: '#3a5040', w: 40, h: 16 }), eb, 0.3);
    vfill(ctx, eb.x, eb.y, eb.w, eb.h, [[0, 'rgba(0,0,0,0.55)'], [0.6, 'rgba(0,0,0,0.1)'], [1, rgba(BRZ.lit, 0.25)]]);
    // egg-and-dart round its belly, one egg per unit, centred
    const n = 5;
    const ey = e0y + eb.h * 0.55;
    for (let i = 0; i < n; i++) {
      const [ex] = P((X0 + X1) / 2 + (i - (n - 1) / 2) * UNIT, 0, cz0);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.ellipse(ex + 1, ey + 1, 3.6 * k, 4.6 * k, 0, 0, P2);
      ctx.fill();
      ctx.fillStyle = rgba(BRZ.lit, 0.4);
      ctx.beginPath();
      ctx.ellipse(ex - 0.6, ey - 0.8, 2.4 * k, 3.2 * k, 0, 0, P2);
      ctx.fill();
    }
  });
  // the abacus: a slab overhanging the echinus, its underside in shadow, its face catching the light along its top
  const [a0x, a0y] = P(X0 - 0.48, LT.Y0, cz0 - 0.12);
  const [a1x, a1y] = P(X1 + 0.48, abY, cz0 - 0.12);
  const under = topAt(X0 - 0.48, X1 + 0.48, cz0 - 0.12, z, abY);
  fillPath(ctx, under, '#140c06');
  const ab = polyPath([[a0x, a0y], [a1x, a0y], [a1x, a1y], [a0x, a1y]]);
  castShadow(ctx, ab, 12, 8, 0.65, '#000000');
  solid(ctx, ab, { x: a0x, y: a0y, w: a1x - a0x, h: a1y - a0y }, BRONZE_M, shade(capCol, 0.05), { depth: 0.5, air: CAVE, line: 1.2, formSize: 6 });
  ctx.fillStyle = rgba(BRZ.lit, 0.45);
  ctx.fillRect(a0x + 2, a0y + 1, a1x - a0x - 4, 1.4);
  // the rim lights of the fires down the pier's outer edge: orange on the left pier, green on the right
  const rimX = side < 0 ? X0 : X1;
  const [rx0, ry0] = P(rimX, LT.Y0 - 1.3, z);
  const [, ry1] = P(rimX, 0.1, z);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = lin(ctx, [0, ry0], [0, ry1], [[0, 'rgba(0,0,0,0)'], [1, rgba(side < 0 ? TEMPER.fire.cols[1] : TEMPER.poison.cols[1], 0.3)]]);
  ctx.fillRect(rx0 - (side < 0 ? 0 : 3), ry0, 3, ry1 - ry0);
  ctx.restore();
}

// ——— the doors ———

/** The doors' plane: px per metre, and a point on it. */
const DK = pz(G.z);
const D = (X: number, Y: number): Pt => P(X, Y, G.z);
/** A leaf's box (side −1 left, 1 right): from the opening's edge to its middle, the sill to the lintel. */
export const leafBox = (side: -1 | 1): Box => {
  const [xa, ya] = D(side < 0 ? -G.hw : 0, G.h);
  const [xb, yb] = D(side < 0 ? 0 : G.hw, G.sill);
  const x0 = Math.round(Math.min(xa, xb));
  const x1 = Math.round(Math.max(xa, xb));
  return { x: x0, y: Math.floor(ya), w: x1 - x0, h: Math.ceil(yb) - Math.floor(ya) };
};
/** The iron straps across the leaves (their middles); rivets one per unit along them, each leaf 11 units wide. */
const STRAPS = [1.0, 3.9, 6.8, 9.7, 12.05];
const STRAP_H = 0.5;
const D_UNIT = G.hw / 11;
/** Where the leaves are dented outwards (X, Y, radius) by blows from inside. */
const DENTS: [number, number, number][] = [
  [-5.2, 8.3, 1.25], [-2.3, 10.9, 0.9], [-6.4, 5.3, 0.8], [3.4, 8.2, 1.35], [6.3, 5.3, 1.0], [2.0, 5.6, 0.7], [-2.6, 2.5, 0.75], [5.4, 10.9, 0.8],
];
/** The claw marks: sets of gouges (from X, Y to X, Y, how many), low down where a paw reaches. */
const CLAWS: [number, number, number, number, number][] = [
  [-7.6, 3.0, -5.9, 0.6, 4],
  [-4.4, 2.8, -2.9, 0.7, 3],
  [2.7, 2.9, 4.2, 0.6, 4],
  [7.4, 2.7, 5.9, 0.6, 3],
];

function leaf(ctx: Ctx, r: R, side: -1 | 1): void {
  const b = leafBox(side);
  const Xout = side * G.hw;
  const [X0, X1] = side < 0 ? [Xout, 0] : [0, Xout];
  const body = faceAt(X0, X1, G.sill, G.h, G.z);
  const k = DK / 36;
  ctx.save();
  ctx.beginPath();
  ctx.rect(b.x, b.y, b.w, b.h);
  ctx.clip();
  // cast bronze, dark with age: the fires' light on its lower outer corner, the key's sheen across its top
  fillPath(ctx, body, lit('#3a2810', side * 4, 6, G.z, [0, 0, -1], { key: 0.3, pit: 0.15, fire: 0.12 }));
  within(ctx, body, () => {
    surface(ctx, r, b, '#34240f', { over: true, vary: 0.5, cells: 3, mottle: 0.4, strokes: 0.2, strokeAng: Math.PI / 2, strokeLen: 120, strokeW: 6, grain: 0.14, warm: '#6a4a26', cool: '#140e08', seed: 50 + side });
    lay(ctx, noiseMask(6, 60 + side, { cover: 0.32, soft: 0.25, col: '#3a5040', w: 60, h: 90 }), b, 0.12);
    lay(ctx, noiseMask(14, 64 + side, { cover: 0.3, soft: 0.2, col: '#0a0604', w: 120, h: 160 }), b, 0.18);
    const fireCol = side < 0 ? TEMPER.fire.cols[1] : TEMPER.poison.cols[1];
    const gx = side < 0 ? b.x : b.x + b.w;
    ctx.fillStyle = lin(ctx, [gx, b.y + b.h], [gx - side * b.w * 0.5, b.y + b.h * 0.7], [[0, rgba(fireCol, side < 0 ? 0.16 : 0.07)], [1, rgba(fireCol, 0)]]);
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = lin(ctx, [b.x, b.y], [b.x + b.w * 0.7, b.y + b.h * 0.5], [[0, rgba('#d8a070', side < 0 ? 0.12 : 0.06)], [1, 'rgba(0,0,0,0)']]);
    ctx.fillRect(b.x, b.y, b.w, b.h);
    // the bronze's sheen: a long soft band of the key light down the leaf, the near fire's warmth in its foot
    const shx = side < 0 ? b.x + b.w * 0.3 : b.x + b.w * 0.22;
    ctx.fillStyle = lin(ctx, [shx - b.w * 0.18, 0], [shx + b.w * 0.18, 0], [[0, 'rgba(0,0,0,0)'], [0.5, rgba('#c88a4a', 0.1)], [1, 'rgba(0,0,0,0)']]);
    ctx.fillRect(b.x, b.y, b.w, b.h);
    // the plates: one broad cast plate between each pair of straps, a raised rim round it (lit along its top and
    // left, shaded along its foot and right)
    for (let i = 0; i < STRAPS.length - 1; i++) {
      const [ax, ay] = D(X0 + 0.55, STRAPS[i + 1] - STRAP_H / 2 - 0.25);
      const [bx, by] = D(X1 - 0.55, STRAPS[i] + STRAP_H / 2 + 0.25);
      const bw = 0.3 * DK;
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(ax + bw, ay + bw, bx - ax - 2 * bw, by - ay - 2 * bw);
      ctx.strokeStyle = rgba('#d8a060', 0.16);
      ctx.lineWidth = 2 * k;
      ctx.beginPath();
      ctx.moveTo(ax + bw, by - bw);
      ctx.lineTo(ax + bw, ay + bw);
      ctx.lineTo(bx - bw, ay + bw);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.moveTo(bx - bw, ay + bw);
      ctx.lineTo(bx - bw, by - bw);
      ctx.lineTo(ax + bw, by - bw);
      ctx.stroke();
    }
    // the dents: the bronze pushed out towards us from inside, domes lit on their upper left, each throwing a
    // soft shadow off its lower right onto the plate; the metal round them stretched, its rim lines bent
    for (const [X, Y, rad] of DENTS) {
      if (X * side < 0) continue;
      const [cx, cy] = D(X, Y);
      const rr = rad * DK;
      const sh = ctx.createRadialGradient(cx + rr * 0.35, cy + rr * 0.4, rr * 0.5, cx + rr * 0.35, cy + rr * 0.4, rr * 1.25);
      sh.addColorStop(0, 'rgba(0,0,0,0.28)');
      sh.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sh;
      ctx.fillRect(cx - rr, cy - rr, rr * 2.8, rr * 2.8);
      const dome = ctx.createRadialGradient(cx - rr * 0.4, cy - rr * 0.45, rr * 0.05, cx, cy, rr);
      dome.addColorStop(0, rgba('#f0c080', 0.32));
      dome.addColorStop(0.4, rgba('#a8763c', 0.14));
      dome.addColorStop(0.85, 'rgba(0,0,0,0)');
      dome.addColorStop(1, 'rgba(0,0,0,0.12)');
      ctx.fillStyle = dome;
      ctx.beginPath();
      ctx.arc(cx, cy, rr, 0, P2);
      ctx.fill();
      ctx.strokeStyle = rgba('#e8b070', 0.18);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, rr * 1.02, Math.PI * 0.95, Math.PI * 1.7);
      ctx.stroke();
      // the stretched metal cracking round its crown
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        const a = r() * P2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * rr * 0.6, cy + Math.sin(a) * rr * 0.6);
        ctx.lineTo(cx + Math.cos(a) * rr * (1.0 + r() * 0.25), cy + Math.sin(a) * rr * (1.0 + r() * 0.25));
        ctx.stroke();
      }
    }
    // the iron straps across, rivets on them one per unit; the iron stiles up both edges and the muntin
    const strap = (Y: number) => {
      const [ax, ay] = D(X0, Y + STRAP_H / 2);
      const [bx, by] = D(X1, Y - STRAP_H / 2);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(ax + 2, ay + 3, bx - ax, by - ay);
      ctx.fillStyle = lin(ctx, [0, ay], [0, by], [[0, IRON.lit], [0.25, IRON.body], [1, IRON.shade]]);
      ctx.fillRect(ax, ay, bx - ax, by - ay);
      lay(ctx, noiseMask(4, Math.round(Y * 10) + side, { cover: 0.4, soft: 0.3, col: IRON.rust, w: 80, h: 6 }), { x: ax, y: ay, w: bx - ax, h: by - ay }, 0.5);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(ax, by - 1.4, bx - ax, 1.4);
      for (let i = 0; i < 11; i++) {
        const X = X0 + (i + 0.5) * D_UNIT;
        const [rx, ry] = D(X, Y);
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath();
        ctx.arc(rx + 1.2, ry + 1.4, 3.4 * k, 0, P2);
        ctx.fill();
        ctx.fillStyle = IRON.body;
        ctx.beginPath();
        ctx.arc(rx, ry, 3.2 * k, 0, P2);
        ctx.fill();
        ctx.fillStyle = rgba('#b8b8c8', 0.4);
        ctx.beginPath();
        ctx.arc(rx - 0.9, ry - 1, 1.4 * k, 0, P2);
        ctx.fill();
      }
    };
    for (const [i, X] of [X0, X1].entries()) {
      const w = 0.42;
      const xa = i === 0 ? X : X - w;
      const [ax, ay] = D(xa, G.h);
      const [bx, by] = D(xa + w, G.sill);
      ctx.fillStyle = lin(ctx, [ax, 0], [bx, 0], [[0, IRON.lit], [0.3, IRON.body], [1, IRON.shade]]);
      ctx.fillRect(ax, ay, bx - ax, by - ay);
      lay(ctx, noiseMask(4, Math.round(X * 10) + 3, { cover: 0.4, soft: 0.3, col: IRON.rust, w: 6, h: 80 }), { x: ax, y: ay, w: bx - ax, h: by - ay }, 0.45);
    }
    for (const Y of STRAPS) strap(Y);
    // the claw marks, low where a paw reaches: sets of tapering gouges, a dark groove, a bright lip of torn bronze
    // curled up along one side
    for (const [x0, y0, x1, y1, n] of CLAWS) {
      if ((x0 + x1) * side < 0) continue;
      const len = Math.hypot(x1 - x0, y1 - y0);
      const nx = -(y1 - y0) / len;
      const ny = (x1 - x0) / len;
      for (let i = 0; i < n; i++) {
        const o = (i - (n - 1) / 2) * 0.38;
        const sh = (r() - 0.5) * 0.3;
        const a = D(x0 + nx * o + sh * 0.3, y0 + ny * o + sh);
        const e = D(x1 + nx * o * 0.8, y1 + ny * o * 0.8);
        const dx = e[0] - a[0];
        const dy = e[1] - a[1];
        const l = Math.hypot(dx, dy);
        const px = -dy / l;
        const py = dx / l;
        const w0 = (3.2 + r()) * k;
        const groove = polyPath([[a[0] + px * w0, a[1] + py * w0], [a[0] + dx * 0.25 + px * w0 * 1.1, a[1] + dy * 0.25 + py * w0 * 1.1], [e[0], e[1]], [a[0] + dx * 0.25 - px * w0 * 0.8, a[1] + dy * 0.25 - py * w0 * 0.8], [a[0] - px * w0 * 0.7, a[1] - py * w0 * 0.7]]);
        fillPath(ctx, groove, 'rgba(10,5,2,0.55)');
        ctx.strokeStyle = rgba('#f0c890', 0.38);
        ctx.lineWidth = 1.2 * k;
        ctx.beginPath();
        ctx.moveTo(a[0] - px * w0 * 0.9, a[1] - py * w0 * 0.9);
        ctx.lineTo(a[0] + dx * 0.25 - px * w0, a[1] + dy * 0.25 - py * w0);
        ctx.lineTo(e[0] - px * 0.5, e[1] - py * 0.5);
        ctx.stroke();
      }
    }
    // the shadow of the lintel over its top; scuffs and grime along its foot
    const [, ty] = D(0, G.h);
    vfill(ctx, b.x, ty, b.w, DK * 1.4, [[0, 'rgba(0,0,0,0.75)'], [1, 'rgba(0,0,0,0)']]);
    const [, fy] = D(0, G.sill);
    vfill(ctx, b.x, fy - DK * 1.6, b.w, DK * 1.6, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(10,6,4,0.55)']]);
    // darker towards the meeting edge, where the opening's red leaks through
    const ex = side < 0 ? b.x + b.w : b.x;
    ctx.fillStyle = lin(ctx, [ex, 0], [ex - side * DK * 1.2, 0], [[0, 'rgba(0,0,0,0.35)'], [1, 'rgba(0,0,0,0)']]);
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = lin(ctx, [ex, 0], [ex - side * -22, 0], [[0, rgba('#ff4a1c', 0.28)], [1, rgba('#ff4a1c', 0)]]);
    ctx.fillRect(b.x, b.y + 6, b.w, b.h - 8);
    ctx.restore();
    ctx.fillStyle = rgba('#ff6a2a', 0.6);
    ctx.fillRect(side < 0 ? b.x + b.w - 1.6 : b.x, b.y + 8, 1.6, b.h - 12);
  });
  // the hound's-head boss and its ring, on the inner panel
  const RX = CB.rings[side < 0 ? 0 : 1];
  const [hx, hy] = D(RX, CB.ringY + 0.95);
  const hs = DK * 0.62;
  const plate = (c: Ctx) => {
    c.beginPath();
    c.arc(hx, hy + hs * 0.2, hs * 1.35, 0, P2);
  };
  const pb = { x: hx - hs * 1.4, y: hy - hs * 1.2, w: hs * 2.8, h: hs * 2.8 };
  castShadow(ctx, plate, 8, 6, 0.6, '#000000');
  solid(ctx, plate, pb, BRONZE_M, lit(BRZ.body, RX, 6, G.z, [0, 0, -1], { key: 0.5, fire: 0.3 }), { depth: 0.45, air: CAVE, line: 1.2, formSize: 8 });
  within(ctx, plate, () => {
    lay(ctx, noiseMask(4, 80 + side, { cover: 0.4, soft: 0.25, col: BRZ.green, w: 20, h: 20 }), pb, 0.45);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * P2;
      const px = hx + Math.cos(a) * hs * 1.18;
      const py = hy + hs * 0.2 + Math.sin(a) * hs * 1.18;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.arc(px + 0.8, py + 0.8, 2 * k, 0, P2);
      ctx.fill();
      ctx.fillStyle = rgba(BRZ.lit, 0.45);
      ctx.beginPath();
      ctx.arc(px, py, 1.4 * k, 0, P2);
      ctx.fill();
    }
  });
  houndHead(ctx, hx, hy - hs * 0.15, hs * 0.72, 0, lit('#8a6030', RX, 6, G.z, [0, 0, -1], { key: 0.6, fire: 0.3 }));
  // the ring, held in its jaws
  const [rcx, rcy] = D(RX, CB.ringY);
  const rr = DK * 0.72;
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 7 * k;
  ctx.beginPath();
  ctx.ellipse(rcx + 3, rcy + 4, rr, rr, 0, 0, P2);
  ctx.stroke();
  ctx.strokeStyle = '#1a0e06';
  ctx.lineWidth = 7.5 * k;
  ctx.beginPath();
  ctx.ellipse(rcx, rcy, rr, rr, 0, 0, P2);
  ctx.stroke();
  ctx.strokeStyle = lit(BRZ.body, RX, CB.ringY, G.z - 0.5, [0, 0, -1], { key: 0.5, fire: 0.4 });
  ctx.lineWidth = 5 * k;
  ctx.stroke();
  ctx.strokeStyle = rgba(BRZ.lit, 0.55);
  ctx.lineWidth = 1.8 * k;
  ctx.beginPath();
  ctx.ellipse(rcx, rcy, rr, rr, 0, Math.PI * 1.05, Math.PI * 1.65);
  ctx.stroke();
  ctx.strokeStyle = rgba(BRZ.green, 0.5);
  ctx.beginPath();
  ctx.ellipse(rcx, rcy, rr, rr, 0, Math.PI * 0.15, Math.PI * 0.55);
  ctx.stroke();
  ctx.restore();
  strokePath(ctx, body, 'rgba(4,2,2,0.9)', 1.6);
}

/** Where a chain hangs from a door's ring (screen px: the ring's foot). */
export const ringFoot = (i: number): Pt => D(CB.rings[i], CB.ringY - 0.72);

/** The frame's boxes: they stop at the doors' edges (the doors are sprites). */
const leafL = leafBox(-1);
const leafR = leafBox(1);
export const FRAME_L: Box = (() => {
  const x0 = Math.floor(sx(-PR.x1 - 0.5, PR.z - 0.4)) - 12;
  const y0 = Math.floor(sy(LT.Y0, PR.z - 0.4)) - 2;
  return { x: x0, y: y0, w: leafL.x - x0, h: Math.ceil(sy(0, PR.z - 0.35)) + 4 - y0 };
})();
export const FRAME_R: Box = (() => {
  const x1 = Math.ceil(sx(PR.x1 + 0.5, PR.z - 0.4)) + 12;
  const x0 = leafR.x + leafR.w;
  return { x: x0, y: FRAME_L.y, w: x1 - x0, h: FRAME_L.h };
})();
export const LINTEL_BOX: Box = { x: FRAME_L.x - 30, y: 0, w: FRAME_R.x + FRAME_R.w - FRAME_L.x + 60, h: leafL.y };

// ——— the floor: the tops of basalt columns, a causeway of hexagons, worn into the dog's hollow before the doors ———

/** The near shore on screen, from the table's edge back to the cliff's end. */
const SHORE: Pt[] = (() => {
  const pts: Pt[] = [];
  for (let z = 12.4; z <= CB.cliffZ + 0.3; z += 0.25) pts.push(P(shoreX(z), 0, z));
  return pts;
})();
/** Our side of the river: from the shore across to the right edge, from the table back to the cliff's foot. */
const landPath = () => (c: Ctx) => {
  c.beginPath();
  SHORE.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  const yb = sy(0, CB.cliffZ + 0.3);
  c.lineTo(W + 10, yb);
  c.lineTo(W + 10, TY + 4);
  c.lineTo(SHORE[0][0], TY + 4);
  c.closePath();
};
export const FLOOR_BOX: Box = { x: 0, y: 590, w: W, h: TY + 6 - 590 };

const HEX_R = 0.5;
/** Inside the hollow (0 at its rim … 1 in its middle). */
const inHollow = (X: number, z: number) => {
  const h = CB.hollow;
  const d = Math.hypot((X - h.X) / h.rx, (z - h.z) / h.rz);
  return clamp01(1 - d);
};

function floor(ctx: Ctx, r: R): void {
  const land = landPath();
  const b = FLOOR_BOX;
  fillPath(ctx, land, '#16121a');
  within(ctx, land, () => {
    surface(ctx, r, b, '#16121a', { over: true, vary: 0.5, cells: 6, mottle: 0.4, strokes: 0.2, strokeAng: 0, strokeLen: 260, strokeW: 6, grain: 0.15, warm: '#3a2a2c', cool: '#0a0a16', seed: 71 });
    // the columns' tops: hexagons, each its own shade, lit by the fires; joints dark, a lit lip on their near side
    const rowZ = HEX_R * 1.5;
    const colX = HEX_R * Math.sqrt(3);
    for (let row = 0; ; row++) {
      const z = CB.cliffZ + 0.2 - row * rowZ;
      if (z < 12.2) break;
      const k = pz(z);
      const off = row % 2 ? colX / 2 : 0;
      const Xmin = XAt(-60, z);
      const Xmax = XAt(W + 60, z);
      for (let X = Math.floor(Xmin / colX) * colX + off; X < Xmax; X += colX) {
        const jx = X + (r() - 0.5) * 0.08;
        const jz = z + (r() - 0.5) * 0.06;
        if (jx < shoreX(jz) + 0.4) continue;
        const pts: Pt[] = [];
        for (let i = 0; i < 6; i++) {
          const a = Math.PI / 6 + (i * Math.PI) / 3 + (r() - 0.5) * 0.12;
          const rr = HEX_R * (0.78 + r() * 0.34);
          pts.push(P(jx + Math.cos(a) * rr, 0, jz + Math.sin(a) * rr));
        }
        const hp = polyPath(pts);
        const wear = inHollow(jx, jz);
        let col = lit(mix('#221e28', '#18151d', r()), jx, 0, jz, [0, 1, 0], { key: 0.25, pit: 0.15, fire: 0.8, reach: 4.5 });
        col = mix(col, '#0e0c12', wear * 0.55);
        col = mix(col, '#0c0a10', clamp01((z - 24) / 8) * 0.35);
        fillPath(ctx, hp, col);
        // the joints: fading out where the hollow's worn them smooth
        const ja = 0.55 * (1 - wear * 0.85) * (0.6 + 0.4 * clamp01((z - 13) / 6)) * (r() < 0.15 ? 0.35 : 1);
        // a crack across some of them
        if (k > 40 && r() < 0.18) {
          const a = pts[Math.floor(r() * 6)];
          const bq = pts[Math.floor(r() * 6)];
          ctx.strokeStyle = 'rgba(0,0,0,0.45)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo((a[0] + bq[0]) / 2 + (r() - 0.5) * 6, (a[1] + bq[1]) / 2);
          ctx.lineTo(bq[0], bq[1]);
          ctx.stroke();
        }
        ctx.strokeStyle = rgba('#020104', ja);
        ctx.lineWidth = Math.max(0.6, k * 0.035);
        hp(ctx);
        ctx.stroke();
        if (k > 45) {
          ctx.strokeStyle = rgba('#a898a8', 0.06 * (1 - wear));
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(pts[0][0], pts[0][1] - 1);
          ctx.lineTo(pts[1][0], pts[1][1] - 1);
          ctx.lineTo(pts[2][0], pts[2][1] - 1);
          ctx.stroke();
        }
      }
    }
    lay(ctx, noiseMask(9, 72, { cover: 0.45, soft: 0.3, col: '#4a4048', w: 240, h: 24 }), b, 0.22);
    // the hollow: worn smooth and dark, its far slope turned to us and polished, its near lip in shadow
    const h = CB.hollow;
    const ring = (s: number, dz = 0) => {
      const pts: Pt[] = [];
      for (let i = 0; i <= 48; i++) {
        const a = (i / 48) * P2;
        pts.push(P(h.X + Math.cos(a) * h.rx * s, 0, h.z + dz + Math.sin(a) * h.rz * s));
      }
      return polyPath(pts);
    };
    const [hx, hy] = P(h.X, 0, h.z);
    softly(ctx, { x: hx - 520, y: hy - 70, w: 1040, h: 140 }, (q) => {
      ring(1.05)(q);
      q.fillStyle = 'rgba(0,0,0,0.42)';
      q.fill();
      ring(0.7)(q);
      q.fillStyle = 'rgba(0,0,0,0.25)';
      q.fill();
    }, 0.25);
    within(ctx, ring(1.0), () => {
      // the far slope, catching the fires: a polished sheen, orange on the left, green on the right
      const [fx0, fy] = P(h.X - h.rx, 0, h.z + h.rz * 0.6);
      const [fx1] = P(h.X + h.rx, 0, h.z + h.rz * 0.6);
      ctx.fillStyle = lin(ctx, [fx0, 0], [fx1, 0], [[0, rgba(TEMPER.fire.cols[1], 0.1)], [0.45, rgba('#8a7a90', 0.05)], [1, rgba(TEMPER.poison.cols[1], 0.08)]]);
      ctx.fillRect(fx0, fy - 14, fx1 - fx0, 20);
      // the dog's scrabbling: long scratches in sets of three, curving round the hollow
      ctx.lineCap = 'round';
      for (let i = 0; i < 9; i++) {
        const a0 = r() * P2;
        const span = 0.5 + r() * 0.7;
        const s0 = 0.35 + r() * 0.55;
        for (let j = 0; j < 3; j++) {
          const s = s0 + j * 0.035;
          ctx.strokeStyle = j === 1 ? rgba('#9a8a98', 0.12) : 'rgba(0,0,0,0.45)';
          ctx.lineWidth = j === 1 ? 1 : 1.6;
          ctx.beginPath();
          for (let q = 0; q <= 10; q++) {
            const a = a0 + (q / 10) * span;
            const [x, y] = P(h.X + Math.cos(a) * h.rx * s, 0, h.z + Math.sin(a) * h.rz * s);
            if (q) ctx.lineTo(x, y);
            else ctx.moveTo(x, y);
          }
          ctx.stroke();
        }
      }
    });
    // its far rim catching the fires' light, its near rim falling into shadow, polish where he lies
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = rgba('#b8a0a0', 0.18);
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const a = Math.PI * 0.08 + (i / 24) * Math.PI * 0.84;
      const [x, y] = P(h.X + Math.cos(a) * h.rx * 0.97, 0, h.z + Math.sin(a) * h.rz * 0.97);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
    lightPool(ctx, hx - 60, hy - 4, 200, 14, '#c8a8b0', 0.06);
    ctx.save();
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const a = Math.PI * 1.08 + (i / 24) * Math.PI * 0.84;
      const [x, y] = P(h.X + Math.cos(a) * h.rx, 0, h.z + Math.sin(a) * h.rz);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
    // light on the floor: each fire's pool, the abyss's red along the shore, the doors' seam leaking red
    for (const bz of CB.braziers) {
      const [x, y] = P(bz.X, 0, bz.z);
      const k = pz(bz.z);
      lightPool(ctx, x, y, k * 5.5, k * 0.9, TEMPER[bz.t].cols[0], 0.2);
      lightPool(ctx, x, y, k * 2.2, k * 0.4, TEMPER[bz.t].cols[1], 0.22);
    }
    lightPool(ctx, 260, 640, 420, 60, '#ff4a1c', 0.08);
    const [, sy0] = P(0, 0, G.z - 2.4);
    lightPool(ctx, 960, sy0 + 2, 90, 10, '#ff4a20', 0.12);
    // the shore: a band of black shingle along the water, wet and glinting at its edge
    for (let i = 0; i < 900; i++) {
      const z = 12.4 + r() ** 0.8 * (CB.cliffZ - 12.4);
      const d = r() ** 1.6 * 1.6;
      const X = shoreX(z) + 0.15 + d;
      const [x, y] = P(X, 0, z);
      if (x < -10 || x > 560) continue;
      const k = pz(z);
      const rx = k * (0.05 + r() * 0.07);
      const ry = rx * (0.45 + r() * 0.15);
      ctx.fillStyle = mix('#0c0a0e', '#3a343e', r() * 0.7);
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, (r() - 0.5) * 0.4, 0, P2);
      ctx.fill();
      ctx.fillStyle = rgba(d < 0.35 ? '#9ad0d0' : '#a89aa8', d < 0.35 ? 0.35 : 0.14);
      ctx.beginPath();
      ctx.ellipse(x - rx * 0.25, y - ry * 0.35, rx * 0.35, ry * 0.25, 0, 0, P2);
      ctx.fill();
    }
    // the table's edge throws the floor behind it into shade
    crevice(ctx, 0, W, TY, -40, 0.55, '#000000');
  });
  // the wet black edge where the water laps
  ctx.strokeStyle = 'rgba(0,0,0,0.65)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  SHORE.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + 1) : ctx.moveTo(x, y + 1)));
  ctx.stroke();
  // the sill the doors stand on: a long black-marble step, scuffed
  const sill = faceAt(-G.hw, G.hw, 0, G.sill, PR.z);
  const top = topAt(-G.hw, G.hw, PR.z, G.z, G.sill);
  fillPath(ctx, top, lit('#2a2028', 0, G.sill, G.z - 1, [0, 1, 0], { key: 0.5, fire: 0.6 }));
  within(ctx, top, () => {
    const [x0, y0] = P(-G.hw, G.sill, G.z);
    vfill(ctx, x0, y0, 620, 8, [[0, 'rgba(0,0,0,0.55)'], [1, 'rgba(0,0,0,0)']]);
    ctx.fillStyle = lin(ctx, [940, 0], [980, 0], [[0, 'rgba(255,80,30,0)'], [0.5, 'rgba(255,80,30,0.3)'], [1, 'rgba(255,80,30,0)']]);
    ctx.fillRect(900, y0, 120, 10);
  });
  const sb = boxOfPts([P(-G.hw, G.sill, PR.z), P(G.hw, 0, PR.z)], 0);
  marble(ctx, sill, lit(MARBLE.body, 0, 0.2, PR.z, [0, 0, -1], { key: 0.4, fire: 0.5 }), sb, 99, 0.25);
  within(ctx, sill, () => vfill(ctx, sb.x, sb.y, sb.w, sb.h, [[0, rgba('#b8a0a8', 0.15)], [0.2, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.5)']]));
  strokePath(ctx, sill, 'rgba(2,1,4,0.9)', 1.2);
  // the cliff's foot: occlusion along it
  crevice(ctx, 0, W, sy(0, CB.cliffZ + 0.3), 10, 0.6, '#000000');
}

// ——— the river ———

/** The river (in the far layer): its water from the far bank to our shore, black glass, the abyss's red along it. */
function riverNear(ctx: Ctx, r: R): void {
  const path = (c: Ctx) => {
    c.beginPath();
    for (let x = -4; x <= 560; x += 8) c.lineTo(x, farFoot(x));
    c.lineTo(560, sy(0, CB.cliffZ));
    for (let i = SHORE.length - 1; i >= 0; i--) c.lineTo(SHORE[i][0], SHORE[i][1] + 2);
    c.lineTo(-4, TY + 4);
    c.closePath();
  };
  within(ctx, path, () => {
    water(ctx, r, 0, 560, 540, TY + 4, {
      far: '#3a1412', deep: '#0c1418', near: '#03070a', sky: '#8a2a18', skyA: 0.3,
      ripple: '#4aa89a', ripples: 160, swells: 7, crest: '#2a5a58', glitterX: 180, glitter: '#ff7a3a', glitterA: 0.32, glitterW: 110, seed: 33,
    });
    // the cold depth: a green-blue light down in the black water
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glowAt(ctx, 180, 650, 200, '#2affc0', 0.06, 0.3);
    glowAt(ctx, 200, 600, 300, '#ff4a1c', 0.16, 0.2);
    glowAt(ctx, 120, 700, 200, '#ff6a2a', 0.08, 0.3);
    // the far bank mirrored dark, broken into strips
    ctx.restore();
    ctx.fillStyle = rgba('#000000', 0.3);
    for (let x = 0; x < 560; x += 3) {
      const y0 = farFoot(x);
      ctx.fillRect(x, y0 + 1, 3, (y0 - farTop(x)) * 0.2 * (0.7 + Math.sin(x * 0.3) * 0.3));
    }
    // the fire's light laid across the water from our shore
    const [fx, fy] = P(CB.braziers[0].X, 0, CB.braziers[0].z);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 40; i++) {
      const t = r();
      const y = fy - 20 - t * 120;
      const len = (4 + r() * 16) * (1 - t * 0.6);
      ctx.fillStyle = rgba(i % 3 ? '#ff7a2a' : '#ffc060', 0.25 * (1 - t) * (0.4 + r() * 0.6));
      ctx.fillRect(fx - 60 - t * 40 + (r() - 0.5) * 50 - len / 2, y, len, 1.2);
    }
    ctx.restore();
    // long swells lit along their crests by the abyss's glow
    for (let j = 0; j < 9; j++) {
      const y = 590 + j * j * 1.9;
      ctx.strokeStyle = rgba('#ff8a5a', 0.18 - j * 0.012);
      ctx.lineWidth = 1 + j * 0.15;
      ctx.beginPath();
      for (let x = 0; x <= 560; x += 12) ctx.lineTo(x, y + Math.sin(x * 0.03 + j * 1.7) * (1 + j * 0.3));
      ctx.stroke();
    }
    haze(ctx, 560, 700, '#3a2a34', 0.18, 0.4, 0, 560);
  });
}

// ——— the tripods ———

const TRIPOD = { bowlR: 0.72, footR: 0.62, legTop: 1.9, ringY: 0.55 };
export function tripodBox(i: number): Box {
  const bz = CB.braziers[i];
  const b = boxOfPts([P(bz.X - TRIPOD.bowlR - 0.25, CB.bowlY + 0.25, bz.z), P(bz.X + TRIPOD.bowlR + 0.25, -0.2, bz.z)], 10);
  // (it stops at the table's back edge, which hides its feet's shadows' last pixels: the table stays in the base)
  return { ...b, h: Math.min(b.h, TY - b.y) };
}

/** A bronze tripod: three legs on lion's paws (front-on, standing on the floor), a ring tying them, a deep bowl
 * banded with key pattern, its coals burning in its temper's colour (the fire over them is the live layer's). */
function tripod(ctx: Ctx, i: number): void {
  const bz = CB.braziers[i];
  const tp = TEMPER[bz.t];
  const X = bz.X;
  const z = bz.z;
  const k = pz(z);
  const Y = CB.bowlY;
  const [fx, fy] = P(X, 0, z);
  groundShadow(ctx, fx + k * 0.25, fy + k * 0.03, k * 0.95, k * 0.16, 0.75, '#020104');
  const legs = [Math.PI * 0.5, Math.PI * 1.17, Math.PI * 1.83];
  const legPath = (a: number) => {
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const [tx, ty] = P(X + ca * 0.18, TRIPOD.legTop, z + sa * 0.18);
    const [kx, ky] = P(X + ca * 0.3, TRIPOD.ringY, z + sa * 0.3);
    const [bx, by] = P(X + ca * TRIPOD.footR, 0.12, z + sa * TRIPOD.footR);
    const w = 0.07 * k;
    return (c: Ctx) => {
      c.beginPath();
      c.moveTo(tx - w * 0.8, ty);
      c.bezierCurveTo(kx - w * 1.1, ky, kx - w * 0.9 + (bx - kx) * 0.3, by - (by - ky) * 0.25, bx - w * 0.7, by);
      c.lineTo(bx + w * 0.7, by);
      c.bezierCurveTo(kx + w * 0.9 + (bx - kx) * 0.3, by - (by - ky) * 0.25, kx + w * 1.1, ky, tx + w * 0.8, ty);
      c.closePath();
    };
  };
  const legBox = boxOfPts([P(X - TRIPOD.footR, TRIPOD.legTop, z), P(X + TRIPOD.footR, 0, z)], k * 0.2);
  const paw = (a: number) => {
    const [px, py] = P(X + Math.cos(a) * TRIPOD.footR, 0.05, z + Math.sin(a) * TRIPOD.footR);
    groundShadow(ctx, px + 3, py + 3, k * 0.11, k * 0.035, 0.6, '#020104');
    // a lion's paw, front-on: a pad and three toes
    const p = (c: Ctx) => {
      c.beginPath();
      c.ellipse(px, py, k * 0.1, k * 0.07, 0, Math.PI, 0);
      c.lineTo(px + k * 0.11, py + k * 0.05);
      c.lineTo(px - k * 0.11, py + k * 0.05);
      c.closePath();
    };
    solid(ctx, p, { x: px - k * 0.12, y: py - k * 0.09, w: k * 0.24, h: k * 0.15 }, BRONZE_M, BRZ.shade, { depth: 0.1, air: CAVE, line: Math.max(1, k * 0.012), formSize: 4 });
    ctx.strokeStyle = 'rgba(10,6,2,0.7)';
    ctx.lineWidth = Math.max(1, k * 0.01);
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(px + d * k * 0.035, py - k * 0.03);
      ctx.lineTo(px + d * k * 0.04, py + k * 0.045);
      ctx.stroke();
    }
  };
  const order = [...legs].sort((a, b) => Math.sin(b) - Math.sin(a));
  const ring = (front: boolean) => {
    const pts: Pt[] = [];
    for (let j = 0; j <= 24; j++) {
      const a = front ? Math.PI + (j / 24) * Math.PI : (j / 24) * Math.PI;
      pts.push(P(X + Math.cos(a) * 0.3, TRIPOD.ringY, z + Math.sin(a) * 0.3));
    }
    ctx.strokeStyle = BRZ.deep;
    ctx.lineWidth = Math.max(1.5, k * 0.05);
    ctx.beginPath();
    pts.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.strokeStyle = front ? BRZ.body : BRZ.shade;
    ctx.lineWidth = Math.max(1, k * 0.028);
    ctx.stroke();
  };
  for (const [j, a] of order.entries()) {
    if (j === 1) ring(false);
    const col = lit(Math.sin(a) > 0 ? BRZ.shade : BRZ.body, X + Math.cos(a) * 0.3, 1, z + Math.sin(a) * 0.3, [Math.cos(a), 0, Math.sin(a)], { key: 0.4, fire: 0.25, reach: 4 });
    solid(ctx, legPath(a), legBox, BRONZE_M, col, { depth: 0.1, air: CAVE, line: Math.max(1, k * 0.014), formSize: 6 });
    paw(a);
  }
  ring(true);
  // the stem and the bowl
  const [bx, by] = P(X, Y, z);
  const rx = TRIPOD.bowlR * k;
  const [, byl] = P(X, Y - 0.42, z);
  const [, sy0] = P(X, Y - 0.38, z);
  const [, sy1] = P(X, TRIPOD.legTop - 0.05, z);
  const stem = polyPath([[bx - k * 0.08, sy0], [bx + k * 0.08, sy0], [bx + k * 0.12, sy1], [bx - k * 0.12, sy1]]);
  solid(ctx, stem, { x: bx - k * 0.13, y: sy0, w: k * 0.26, h: sy1 - sy0 + 2 }, BRONZE_M, BRZ.body, { depth: 0.1, air: CAVE, line: Math.max(1, k * 0.012), formSize: 4 });
  const bowl = (c: Ctx) => {
    c.beginPath();
    c.moveTo(bx - rx, by);
    c.bezierCurveTo(bx - rx * 0.96, by + (byl - by) * 0.7, bx - rx * 0.5, byl, bx, byl);
    c.bezierCurveTo(bx + rx * 0.5, byl, bx + rx * 0.96, by + (byl - by) * 0.7, bx + rx, by);
    c.lineTo(bx + rx * 1.06, by - k * 0.03);
    c.lineTo(bx - rx * 1.06, by - k * 0.03);
    c.closePath();
  };
  const bb = { x: bx - rx * 1.1, y: by - k * 0.05, w: rx * 2.2, h: byl - by + k * 0.07 };
  solid(ctx, bowl, bb, BRONZE_M, mix(BRZ.shade, BRZ.body, 0.55), { depth: 0.1, air: CAVE, line: Math.max(1.4, k * 0.016), formSize: 10, spec: false });
  within(ctx, bowl, () => {
    lay(ctx, noiseMask(5, 300 + i, { cover: 0.35, soft: 0.2, col: BRZ.green, w: 40, h: 16 }), bb, 0.45);
    // a band of key pattern round its belly: ten units across its width, centred
    const ky = by + (byl - by) * 0.3;
    const u = (rx * 2) / 10;
    const kh = (byl - by) * 0.24;
    ctx.strokeStyle = rgba(BRZ.deep, 0.75);
    ctx.lineWidth = Math.max(1, k * 0.014);
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
    // its own fire's light down its rim, the side away in shadow
    vfill(ctx, bb.x, by - 4, bb.w, (byl - by) * 0.5, [[0, rgba(tp.cols[1], 0.32)], [1, rgba(tp.cols[1], 0)]]);
    ctx.fillStyle = lin(ctx, [bb.x, 0], [bb.x + bb.w, 0], [[0, 'rgba(0,0,0,0)'], [0.6, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.4)']]);
    ctx.fillRect(bb.x, bb.y, bb.w, bb.h);
  });
  // the lip, lit by the fire in it
  ctx.strokeStyle = mix(BRZ.body, tp.cols[2], 0.4);
  ctx.lineWidth = Math.max(2, k * 0.035);
  ctx.beginPath();
  ctx.moveTo(bx - rx * 1.06, by - k * 0.015);
  ctx.lineTo(bx + rx * 1.06, by - k * 0.015);
  ctx.stroke();
  // the coals in it, burning in the temper's colour
  ctx.fillStyle = tp.cols[0];
  ctx.beginPath();
  ctx.ellipse(bx, by - k * 0.02, rx * 0.94, k * 0.04, 0, 0, P2);
  ctx.fill();
  ctx.fillStyle = tp.coal;
  ctx.beginPath();
  ctx.ellipse(bx, by - k * 0.022, rx * 0.55, k * 0.018, 0, 0, P2);
  ctx.fill();
  if (bz.t === 'ice') {
    // frost on the ice fire's bowl and legs: rime along the lip and up from the coals
    ctx.strokeStyle = rgba('#e8f8ff', 0.5);
    ctx.lineWidth = 1;
    for (let j = 0; j < 14; j++) {
      const x = bx - rx + (j / 13) * rx * 2;
      ctx.beginPath();
      ctx.moveTo(x, by);
      ctx.lineTo(x + (j % 2 ? 2 : -2), by + 4 + (j % 3) * 2);
      ctx.stroke();
    }
  }
  if (bz.t === 'poison') {
    // the poison's slime run over the lip and down the bowl
    ctx.fillStyle = rgba('#6ac03a', 0.55);
    for (const [dx, len] of [[-0.6, 0.6], [-0.1, 0.35], [0.45, 0.7]] as const) {
      ctx.beginPath();
      ctx.moveTo(bx + dx * rx - k * 0.03, by);
      ctx.lineTo(bx + dx * rx + k * 0.03, by);
      ctx.quadraticCurveTo(bx + dx * rx + k * 0.03, by + (byl - by) * len, bx + dx * rx, by + (byl - by) * len + k * 0.03);
      ctx.quadraticCurveTo(bx + dx * rx - k * 0.03, by + (byl - by) * len, bx + dx * rx - k * 0.03, by);
      ctx.fill();
    }
  }
}

/** The still's fires (the live layer runs its own). */
function firesStill(ctx: Ctx): void {
  for (const [i, bz] of CB.braziers.entries()) {
    const k = pz(bz.z);
    const [x, y] = P(bz.X, CB.bowlY, bz.z);
    const tp = TEMPER[bz.t];
    glowAt(ctx, x, y - k * 0.45, k * 1.3, tp.cols[1], 0.22);
    fireFrame(ctx, x, y + 2, k * TRIPOD.bowlR * 1.7, k * 1.15, 0.3 + i * 0.37, { tongues: 6, seed: 3 + i, cols: tp.cols });
  }
}

// ——— the dog's things: his bowls, his collar, his drum, the bones of the heroes, the honey cakes ———

/** One of his bowls: a wide bronze basin on a low foot, one for each head. */
function dogBowl(ctx: Ctx, r: R, X: number, z: number, rad: number, what: 'water' | 'cakes' | 'empty', tilt = 0): void {
  const k = pz(z);
  const H = rad * 0.42;
  const [cx, cy] = P(X, H, z);
  const [, fy] = P(X, 0, z);
  const rx = rad * k;
  const ry = Math.max(3, (sy(H, z - rad) - sy(H, z + rad)) / 2);
  groundShadow(ctx, cx + rx * 0.2, fy + 2, rx * 1.05, ry * 1.4 + 3, 0.7, '#020104');
  const body = (c: Ctx) => {
    c.beginPath();
    c.moveTo(cx - rx, cy);
    c.bezierCurveTo(cx - rx * 0.98, cy + (fy - cy) * 0.75, cx - rx * 0.55, fy - 2, cx - rx * 0.4, fy);
    c.lineTo(cx + rx * 0.4, fy);
    c.bezierCurveTo(cx + rx * 0.55, fy - 2, cx + rx * 0.98, cy + (fy - cy) * 0.75, cx + rx, cy);
    c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI, true);
    c.closePath();
  };
  ctx.save();
  ctx.translate(cx, fy);
  ctx.rotate(tilt);
  ctx.translate(-cx, -fy);
  const bb = { x: cx - rx * 1.05, y: cy - ry - 2, w: rx * 2.1, h: fy - cy + ry + 4 };
  solid(ctx, body, bb, BRONZE_M, lit(mix(BRZ.shade, BRZ.deep, 0.4), X, H, z, [0, 0, -1], { key: 0.35, fire: 0.5, reach: 5 }), { depth: 0.3, air: CAVE, line: 1.3, formSize: 10 });
  within(ctx, body, () => {
    lay(ctx, noiseMask(5, Math.round(X * 10), { cover: 0.35, soft: 0.25, col: '#3a5a48', w: 40, h: 14 }), bb, 0.3);
    // its belly: a ring of three heads round it, very worn, and a dent
    ctx.strokeStyle = rgba(BRZ.lit, 0.2);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx, cy + (fy - cy) * 0.35, rx * 0.92, ry * 0.9, 0, 0.1, Math.PI - 0.1);
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(cx + rx * (r() - 0.5), cy + (fy - cy) * 0.5, rx * 0.16, (fy - cy) * 0.18, 0, 0, P2);
    ctx.fill();
    ctx.fillStyle = lin(ctx, [bb.x, 0], [bb.x + bb.w, 0], [[0, rgba('#e0a060', 0.12)], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.35)']]);
    ctx.fillRect(bb.x, bb.y, bb.w, bb.h);
  });
  // the inside: its far wall licked bright, and what's in it
  const inside = (c: Ctx) => {
    c.beginPath();
    c.ellipse(cx, cy, rx * 0.93, ry * 0.82, 0, 0, P2);
  };
  fillPath(ctx, inside, '#140c06');
  within(ctx, inside, () => {
    vfill(ctx, cx - rx, cy - ry, rx * 2, ry * 2, [[0, rgba('#b8823a', 0.5)], [0.5, rgba('#6a4418', 0.2)], [1, 'rgba(0,0,0,0)']]);
    if (what === 'water') {
      ctx.fillStyle = '#060a0c';
      ctx.beginPath();
      ctx.ellipse(cx, cy + ry * 0.2, rx * 0.82, ry * 0.55, 0, 0, P2);
      ctx.fill();
      ctx.fillStyle = rgba('#ff8a4a', 0.35);
      ctx.fillRect(cx - rx * 0.4, cy + ry * 0.1, rx * 0.25, 1);
    } else if (what === 'cakes') {
      for (let j = 0; j < 3; j++) honeyCake(ctx, cx + (j - 1) * rx * 0.42, cy + ry * 0.25, k * 0.6, r);
    }
  });
  ctx.strokeStyle = rgba(BRZ.lit, 0.5);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, Math.PI * 0.05, Math.PI * 0.95);
  ctx.stroke();
  ctx.strokeStyle = '#120a04';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, P2);
  ctx.stroke();
  ctx.restore();
}

/** A honey cake: a round bun glazed with honey, a cross cut in its top. (x, y) its foot, s px per metre. */
function honeyCake(ctx: Ctx, x: number, y: number, s: number, r: R): void {
  const rx = s * 0.26;
  const h = s * 0.2;
  groundShadow(ctx, x + rx * 0.3, y + 1, rx * 1.15, rx * 0.22, 0.7, '#000000');
  const p = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x - rx, y);
    c.bezierCurveTo(x - rx, y - h * 1.1, x + rx, y - h * 1.1, x + rx, y);
    c.quadraticCurveTo(x, y + rx * 0.18, x - rx, y);
    c.closePath();
  };
  solid(ctx, p, { x: x - rx, y: y - h, w: rx * 2, h: h * 1.2 }, 'leather', mix('#7a4a1a', '#5a3410', r()), { depth: 0.3, air: CAVE, line: 1, formSize: 4 });
  // the honey glaze catching the fire, the cross cut in its crown, sesame
  ctx.fillStyle = rgba('#ffb848', 0.45);
  ctx.beginPath();
  ctx.ellipse(x - rx * 0.32, y - h * 0.62, rx * 0.32, h * 0.18, -0.3, 0, P2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(30,12,2,0.75)';
  ctx.lineWidth = Math.max(1, s * 0.012);
  ctx.beginPath();
  ctx.moveTo(x - rx * 0.45, y - h * 0.55);
  ctx.quadraticCurveTo(x, y - h * 0.78, x + rx * 0.45, y - h * 0.55);
  ctx.moveTo(x - rx * 0.05, y - h * 0.86);
  ctx.lineTo(x + rx * 0.05, y - h * 0.2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,230,180,0.45)';
  for (let i = 0; i < 5; i++) ctx.fillRect(x + (r() - 0.5) * rx * 1.2, y - h * (0.3 + r() * 0.5), 1, 1);
}

/** His collar: a ring of bronze as tall as a man, studded with spikes, propped open against a boss of rock and
 * bolted to it by an iron staple, a broken length of chain trailing from its hasp. */
function collar(ctx: Ctx, r: R): void {
  const X = -6.4;
  const z = 23.6;
  const k = pz(z);
  const R0 = 1.35;
  const Y = 0.12;
  const at = (a: number, s: number): Pt => P(X + Math.cos(a) * R0 * s, Y, z + Math.sin(a) * R0 * s);
  const [cx, cy] = P(X, 0, z);
  groundShadow(ctx, cx + k * 0.3, cy + 3, R0 * k * 1.15, k * 0.22, 0.7, '#020104');
  // open: a gap in its ring where the hasp is undone
  const gap0 = -0.35;
  const gap1 = 0.15;
  const NS = 14;
  const spikesAt = (back: boolean) => {
    for (let j = 0; j < NS; j++) {
      const a = gap1 + 0.15 + (j / NS) * (P2 - (gap1 - gap0) - 0.3);
      if ((Math.sin(a) > 0) !== back) continue;
      // spikes stand up off the band
      const [bx, by] = at(a, 1.0);
      const h = k * 0.32;
      spike(ctx, [bx - k * 0.06, by], [bx + k * 0.06, by], [bx + Math.cos(a) * k * 0.04, by - h], k, back);
    }
  };
  spikesAt(true);
  const band = (c: Ctx) => {
    c.beginPath();
    for (let j = 0; j <= 60; j++) {
      const a = gap1 + (j / 60) * (P2 - (gap1 - gap0));
      const p = at(a, 1.06);
      if (j) c.lineTo(p[0], p[1]);
      else c.moveTo(p[0], p[1]);
    }
    for (let j = 60; j >= 0; j--) {
      const a = gap1 + (j / 60) * (P2 - (gap1 - gap0));
      const p = at(a, 0.86);
      c.lineTo(p[0], p[1] - k * 0.1);
    }
    c.closePath();
  };
  const bb = { x: cx - R0 * k * 1.1, y: cy - k * 0.4, w: R0 * k * 2.2, h: k * 0.6 };
  solid(ctx, band, bb, BRONZE_M, lit(BRZ.body, X, 0.2, z, [0, 1, 0], { key: 0.5, fire: 0.4 }), { depth: 0.35, air: CAVE, line: 1.3, formSize: 6 });
  within(ctx, band, () => {
    lay(ctx, noiseMask(5, 333, { cover: 0.38, soft: 0.25, col: '#3a5040', w: 40, h: 10 }), bb, 0.35);
    ctx.strokeStyle = rgba('#e8c088', 0.25);
    ctx.lineWidth = 1;
    for (let j = 0; j < 6; j++) {
      const p = at(r() * P2, 0.96);
      ctx.beginPath();
      ctx.moveTo(p[0] - 4, p[1] - 1);
      ctx.lineTo(p[0] + 5, p[1] + 1);
      ctx.stroke();
    }
  });
  spikesAt(false);
  // the iron staple pinning it to the rock, the broken chain from its hasp
  const [sx0, sy0] = at(Math.PI * 0.5, 1.0);
  const staple = polyPath([[sx0 - k * 0.2, sy0 + 2], [sx0 - k * 0.2, sy0 - k * 0.22], [sx0 + k * 0.2, sy0 - k * 0.22], [sx0 + k * 0.2, sy0 + 2], [sx0 + k * 0.11, sy0 + 2], [sx0 + k * 0.11, sy0 - k * 0.12], [sx0 - k * 0.11, sy0 - k * 0.12], [sx0 - k * 0.11, sy0 + 2]]);
  solid(ctx, staple, { x: sx0 - k * 0.22, y: sy0 - k * 0.25, w: k * 0.44, h: k * 0.28 }, 'iron', IRON.body, { depth: 0.35, air: CAVE, line: 1.1, formSize: 3 });
  const [hx, hy] = at(gap1, 1.0);
  for (let j = 0; j < 4; j++) ironLink(ctx, hx + 6 + j * k * 0.3, hy - 2 + j * 1.5, 0.08 + j * 0.05, k * 0.12, j % 2 === 0, 0.6);
}

function spike(ctx: Ctx, a: Pt, b: Pt, tip: Pt, k: number, back: boolean): void {
  const p = polyPath([a, tip, b]);
  fillPath(ctx, p, back ? '#3a2410' : lin(ctx, a, b, [[0, BRZ.lit], [0.5, BRZ.body], [1, BRZ.shade]]));
  strokePath(ctx, p, '#140a04', Math.max(1, k * 0.012));
}

/** The column drum he gnaws: a fluted drum of black marble lying on its side, its end towards us, bitten round its
 * edge. */
function drum(ctx: Ctx, r: R): void {
  const X0 = -11.2;
  const X1 = -9.0;
  const z = 18.4;
  const rad = 0.66;
  const k = pz(z);
  const end = (X: number) => P(X, rad, z);
  const [ax, ay] = end(X0);
  const [bx, by] = end(X1);
  const R0 = rad * pz(z);
  // its shadow, then the shaft: a cylinder lying along X, flutes running along it, lit on its top
  groundShadow(ctx, (ax + bx) / 2 + k * 0.4, sy(0, z) + 2, (bx - ax) * 0.62, k * 0.16, 0.8, '#020104', 1.2);
  const bites = [0.3, 0.62];
  const shaft = (c: Ctx) => {
    c.beginPath();
    c.moveTo(ax, ay - R0);
    for (let i = 0; i <= 30; i++) {
      const t = i / 30;
      let dy = 0;
      for (const bt of bites) {
        const d = Math.abs(t - bt);
        if (d < 0.07) dy += R0 * 0.34 * Math.sqrt(1 - (d / 0.07) ** 2);
      }
      c.lineTo(ax + (bx - ax) * t, ay - R0 + (by - ay) * t + dy);
    }
    c.lineTo(bx, by + R0);
    c.lineTo(ax, ay + R0);
    c.closePath();
  };
  const sb = { x: ax, y: ay - R0, w: bx - ax, h: R0 * 2 };
  const base = lit(MARBLE.body, (X0 + X1) / 2, rad, z, [0, 0, -1], { key: 0.45, pit: 0.5, fire: 0.35 });
  marble(ctx, shaft, base, sb, 140, 0.3);
  within(ctx, shaft, () => {
    // its roundness: lit along the top, dark under
    vfill(ctx, sb.x, sb.y, sb.w, sb.h, [[0, rgba('#c8a890', 0.2)], [0.35, 'rgba(0,0,0,0)'], [0.75, 'rgba(0,0,0,0.35)'], [1, 'rgba(0,0,0,0.6)']]);
    // the flutes: twenty round it, ten seen, crowding to its top and bottom edges
    for (let f = 1; f < 10; f++) {
      const a = -Math.PI / 2 + (f / 10) * Math.PI;
      const y = (ay + by) / 2 + Math.sin(a) * R0;
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = Math.max(1, Math.cos(a) * 2.6);
      ctx.beginPath();
      ctx.moveTo(ax, y);
      ctx.lineTo(bx, y);
      ctx.stroke();
      ctx.strokeStyle = rgba('#c8b8c0', 0.08 + Math.max(0, -Math.sin(a)) * 0.12);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ax, y + 2);
      ctx.lineTo(bx, y + 2);
      ctx.stroke();
    }
    // the bites' tooth marks, raw and paler
    for (const bt of bites) {
      const x = ax + (bx - ax) * bt;
      for (let j = -3; j <= 3; j++) {
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x + j * k * 0.045, ay - R0 + R0 * 0.3);
        ctx.lineTo(x + j * k * 0.05, ay - R0 + R0 * 0.65);
        ctx.stroke();
      }
      ctx.fillStyle = rgba('#a8909a', 0.25);
      ctx.beginPath();
      ctx.ellipse(x, ay - R0 + R0 * 0.36, k * 0.12, R0 * 0.1, 0, 0, P2);
      ctx.fill();
    }
    ctx.fillStyle = lin(ctx, [sb.x + sb.w, 0], [sb.x, 0], [[0, rgba(TEMPER.fire.cols[1], 0.18)], [1, 'rgba(0,0,0,0)']]);
    ctx.fillRect(sb.x, sb.y, sb.w, sb.h);
    crack(ctx, r, ax + (bx - ax) * 0.8, ay - R0 * 0.6, 1.9, R0 * 1.3, { col: '#020103', lip: '#a898a0', w: 1.2, a: 0.5 });
  });
  strokePath(ctx, shaft, 'rgba(2,1,4,0.9)', 1.4);
  // its end towards the middle, seen across: an ellipse, its flutes scalloping its rim, the dowel hole
  const ex = bx;
  const erx = Math.abs(sx(X1, z - rad) - sx(X1, z + rad)) / 2;
  const endP = (c: Ctx) => {
    c.beginPath();
    for (let i = 0; i <= 80; i++) {
      const a = (i / 80) * P2;
      const rr = 1 - 0.04 * Math.abs(Math.sin(a * 10));
      const x = ex + Math.cos(a) * erx * rr;
      const y = by + Math.sin(a) * R0 * rr;
      if (i) c.lineTo(x, y);
      else c.moveTo(x, y);
    }
    c.closePath();
  };
  marble(ctx, endP, lit(MARBLE.body, X1, rad, z, [1, 0, 0], { key: 0.3, fire: 0.6 }), { x: ex - erx, y: by - R0, w: erx * 2, h: R0 * 2 }, 141, 0.25);
  within(ctx, endP, () => {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(ex - erx * 0.25, by - R0 * 0.12, erx * 0.5, R0 * 0.24);
    ctx.fillStyle = rgba(TEMPER.fire.cols[1], 0.12);
    ctx.fillRect(ex - erx, by - R0, erx * 2, R0 * 2);
  });
  strokePath(ctx, endP, 'rgba(2,1,4,0.9)', 1.3);
}

/** A hero's crested helmet, front-on: the bowl, the eye-slots and nose guard, the cheek pieces, a horsehair crest. */
function helmet(ctx: Ctx, x: number, y: number, s: number): void {
  groundShadow(ctx, x + s * 0.2, y + 1, s * 0.7, s * 0.12, 0.7, '#000000');
  const bowl = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x - s * 0.42, y);
    c.lineTo(x - s * 0.46, y - s * 0.45);
    c.bezierCurveTo(x - s * 0.46, y - s * 0.95, x + s * 0.46, y - s * 0.95, x + s * 0.46, y - s * 0.45);
    c.lineTo(x + s * 0.42, y);
    c.lineTo(x + s * 0.12, y - s * 0.05);
    c.lineTo(x + s * 0.06, y - s * 0.4);
    c.lineTo(x - s * 0.06, y - s * 0.4);
    c.lineTo(x - s * 0.12, y - s * 0.05);
    c.closePath();
  };
  const crest = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x - s * 0.08, y - s * 0.84);
    c.quadraticCurveTo(x - s * 0.15, y - s * 1.3, x + s * 0.05, y - s * 1.36);
    c.quadraticCurveTo(x + s * 0.18, y - s * 1.2, x + s * 0.08, y - s * 0.84);
    c.closePath();
  };
  solid(ctx, crest, { x: x - s * 0.2, y: y - s * 1.4, w: s * 0.4, h: s * 0.6 }, 'fur', '#5a1a14', { depth: 0.3, air: CAVE, line: 1, formSize: 3 });
  solid(ctx, bowl, { x: x - s * 0.5, y: y - s * 0.95, w: s, h: s }, BRONZE_M, lit(BRZ.body, -2, 0.4, 17, [0, 0, -1], { key: 0.4, fire: 0.4, reach: 6 }), { depth: 0.3, air: CAVE, line: 1.1, formSize: 4 });
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + d * s * 0.08, y - s * 0.42);
    ctx.lineTo(x + d * s * 0.36, y - s * 0.48);
    ctx.lineTo(x + d * s * 0.32, y - s * 0.34);
    ctx.lineTo(x + d * s * 0.08, y - s * 0.3);
    ctx.closePath();
    ctx.fill();
  }
}

/** A hero's round shield lying on its back, its rim bronze, a blazon worn off its face. */
function shield(ctx: Ctx, X: number, z: number, rad: number): void {
  const k = pz(z);
  const [cx, cy] = P(X, 0.06, z);
  const rx = rad * k;
  const ry = Math.max(3, (sy(0.06, z - rad) - sy(0.06, z + rad)) / 2) * 1.6;
  groundShadow(ctx, cx + rx * 0.15, cy + ry * 0.6, rx * 1.05, ry * 0.8, 0.6, '#000000');
  const p = (c: Ctx) => {
    c.beginPath();
    c.ellipse(cx, cy, rx, ry, -0.06, 0, P2);
  };
  solid(ctx, p, { x: cx - rx, y: cy - ry, w: rx * 2, h: ry * 2 }, BRONZE_M, lit(BRZ.shade, X, 0.1, z, [0, 1, 0], { key: 0.5, fire: 0.6, reach: 6 }), { depth: 0.3, air: CAVE, line: 1.1, formSize: 5 });
  ctx.strokeStyle = rgba(BRZ.lit, 0.4);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * 0.82, ry * 0.78, -0.06, 0, P2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * 0.35, ry * 0.34, -0.06, 0, P2);
  ctx.stroke();
}

/** The bones of the heroes who tried, the honey cakes, asphodel at the floor's edges. */
export const LAIR_BOX: Box = { x: 0, y: 594, w: W, h: TY + 6 - 594 };

/** The rock bosses the chains run to, each with its iron ring, before each pier. */
function anchor(ctx: Ctx, i: number): void {
  const [X, z] = CB.anchors[i];
  const k = pz(z);
  const [x, fy] = P(X, 0, z);
  const [, ty] = P(X, 0.9, z);
  groundShadow(ctx, x + k * 0.2, fy + 2, k * 0.8, k * 0.12, 0.75, '#020104');
  const rock = polyPath([[x - k * 0.85, fy + 1], [x - k * 0.78, fy - k * 0.35], [x - k * 0.52, ty + k * 0.12], [x - k * 0.2, ty - k * 0.06], [x + k * 0.12, ty + k * 0.04], [x + k * 0.4, ty - k * 0.02], [x + k * 0.62, fy - k * 0.42], [x + k * 0.8, fy - k * 0.18], [x + k * 0.86, fy + 1]]);
  solid(ctx, rock, { x: x - k * 0.8, y: ty - k * 0.1, w: k * 1.6, h: fy - ty + k * 0.1 }, ROCK, lit('#2e2a36', X, 0.6, z, [0, 0, -1], { key: 0.5, fire: 0.7, reach: 6 }), { depth: 0.3, air: CAVE, line: 1.3, formSize: 8 });
  // the iron eye leaded into it, its ring
  const [ex, ey] = P(X, 0.92, z);
  ctx.fillStyle = '#0a080a';
  ctx.beginPath();
  ctx.ellipse(ex, ey, k * 0.14, k * 0.04, 0, 0, P2);
  ctx.fill();
  ctx.strokeStyle = '#08060a';
  ctx.lineWidth = k * 0.1;
  ctx.beginPath();
  ctx.ellipse(ex, ey - k * 0.2, k * 0.2, k * 0.24, 0, 0, P2);
  ctx.stroke();
  ctx.strokeStyle = IRON.body;
  ctx.lineWidth = k * 0.06;
  ctx.stroke();
  ctx.strokeStyle = rgba(IRON.lit, 0.5);
  ctx.lineWidth = k * 0.025;
  ctx.beginPath();
  ctx.ellipse(ex, ey - k * 0.2, k * 0.2, k * 0.24, 0, Math.PI * 1.1, Math.PI * 1.6);
  ctx.stroke();
}
/** Where a chain is shackled to its rock (screen px: the top of the anchor's ring). */
export const anchorTop = (i: number): Pt => {
  const [X, z] = CB.anchors[i];
  const k = pz(z);
  const [ex, ey] = P(X, 0.92, z);
  return [ex, ey - k * 0.4];
};

function lair(ctx: Ctx, r: R): void {
  const h = CB.hollow;
  anchor(ctx, 0);
  anchor(ctx, 1);
  collar(ctx, r);
  // his three bowls, in a row before the right-hand pier
  dogBowl(ctx, r, 7.6, 22.4, 1.15, 'empty', 0.03);
  dogBowl(ctx, r, 5.1, 19.2, 1.15, 'water');
  dogBowl(ctx, r, 9.4, 19.6, 1.15, 'cakes', -0.02);
  // the heroes' things in the hollow, low and dark
  const [hx, hy] = P(-2.8, 0, h.z - 2.6);
  helmet(ctx, hx, hy, pz(h.z - 2.6) * 0.42);
  shield(ctx, 3.4, h.z + 0.5, 0.55);
  const [s1x, s1y] = P(1.2, 0, h.z + 2.2);
  skull(ctx, s1x, s1y, 0.48, 0.4);
  const [s2x, s2y] = P(-4.6, 0, h.z + 1.4);
  skull(ctx, s2x, s2y, 0.42, -0.5);
  // a pile of them where he lies, gnawed, and strays across the hollow
  const br = rng(hashStr('cb:bones'));
  for (let i = 0; i < 14; i++) {
    const X = -1.8 + (br() - 0.5) * 2.2;
    const dz = 0.4 + (br() - 0.5) * 1.2;
    const [bx, by] = P(X, 0.05 + br() * 0.08, h.z + dz);
    bone(ctx, bx, by - i * 0.25, (10 + br() * 20) * (pz(h.z + dz) / 52), (br() - 0.5) * 2.4);
  }
  for (const [X, dz, len, ang] of [[0.2, -1.6, 26, -0.25], [2.2, 2.8, 14, 0.6], [4.6, -1.4, 20, 0.15], [-5.8, 2.6, 12, 0.4]] as const) {
    const [bx, by] = P(X, 0, h.z + dz);
    bone(ctx, bx, by, len * (pz(h.z + dz) / 52), ang);
  }
  // a broken spear across the hollow's rim
  const [p0x, p0y] = P(-6.0, 0.05, h.z - 3.6);
  const [p1x, p1y] = P(-2.2, 0.05, h.z - 4.4);
  ctx.strokeStyle = '#1a120a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(p0x, p0y);
  ctx.lineTo(p1x, p1y);
  ctx.stroke();
  ctx.strokeStyle = rgba('#8a6a40', 0.5);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(p0x, p0y - 1);
  ctx.lineTo(p1x, p1y - 1);
  ctx.stroke();
  fillPath(ctx, polyPath([[p0x - 2, p0y - 2], [p0x - 16, p0y + 2], [p0x - 2, p0y + 3]]), lit(BRZ.body, -6, 0.1, h.z - 3.6, [0, 1, 0], { key: 0.4, fire: 0.5, reach: 6 }));
  // the gnawed drum by the shore
  drum(ctx, r);
  // the honey cakes the dead throw him as they pass: by the shore, and dropped on the way to the gate
  for (const [X, z] of [[-10.6, 20.6], [-9.9, 21.8], [-11.2, 23.0], [-8.2, 24.6], [-9.2, 15.4], [-4.8, 26.8]] as const) {
    const [x, y] = P(X, 0, z);
    honeyCake(ctx, x, y, pz(z), r);
  }
  // asphodel where the floor meets the cliff on the right, and along the shore
  for (const [X, z, s] of [[13.2, 26, 0.7], [16.8, 24.6, 0.8], [19.5, 27.5, 0.7], [-11.2, 18.6, 0.9], [-11.6, 22.2, 0.75], [12.4, 15.8, 1.1], [-8.4, 13.2, 1.2]] as const) {
    const [x, y] = P(X, 0, z);
    asphodel(ctx, r, x, y, s * (pz(z) / 60));
  }
}

// ——— the table: the gate's threshold, a slab of worn basalt with a bronze key-pattern rim ———

function table(ctx: Ctx, r: R): void {
  const f = CB.front;
  const zf = zFront(f);
  const box = { x: 0, y: TY, w: W, h: f - TY };
  const T = (X: number, z: number): Pt => [xAt(X, z), yAt(z)];
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, f - TY + 4);
  ctx.clip();
  // fine-grained basalt, near black, a little violet; worn smooth and faintly polished down the middle
  vfill(ctx, 0, TY, W, f - TY + 4, [[0, '#0c0a10'], [0.5, '#141018'], [1, '#1a141e']]);
  surface(ctx, r, box, '#141018', { over: true, vary: 0.35, cells: 5, mottle: 0.3, strokes: 0.08, strokeAng: 0, strokeLen: 260, strokeW: 4, grain: 0.06, grainKind: 'grain', warm: '#26181c', cool: '#0a0c18', seed: 93 });
  lay(ctx, noiseMask(14, 94, { cover: 0.5, soft: 0.2, col: '#2e2834', w: 300, h: 40 }), box, 0.25);
  // vesicles: the gas bubbles frozen in the rock, tiny dark pits with a lit lip
  for (let i = 0; i < 520; i++) {
    const X = (r() - 0.5) * 4.6;
    const z = ZB + (zf - ZB) * r();
    const [x, y] = T(X, z);
    const t = (y - TY) / (f - TY);
    const s = (0.6 + r() * 1.4) * (0.5 + t);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(x, y, s, s * 0.6, 0, 0, P2);
    ctx.fill();
    ctx.fillStyle = 'rgba(150,140,170,0.1)';
    ctx.fillRect(x - s * 0.5, y + s * 0.4, s, 0.8);
  }
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
    ctx.strokeStyle = 'rgba(150,140,200,0.08)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(xAt(X, ZB) + 2, TY);
    ctx.lineTo(xAt(X, zf) + 3, f + 4);
    ctx.stroke();
  }
  // the wear: a smooth hollow trodden down the middle of each slab, faint scratches from the dog's claws
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const sheen = (x: number, col: string, a: number, wd: number) => {
    softly(ctx, { x: x - wd * 2, y: TY, w: wd * 4, h: f - TY }, (q) => {
      const g = q.createLinearGradient(0, TY, 0, f);
      g.addColorStop(0, rgba(col, a));
      g.addColorStop(0.5, rgba(col, a * 0.45));
      g.addColorStop(1, rgba(col, 0));
      q.fillStyle = g;
      q.beginPath();
      q.moveTo(x - wd * 0.3, TY);
      q.lineTo(x + wd * 0.3, TY);
      q.lineTo(x + wd * 1.6, f);
      q.lineTo(x - wd * 1.6, f);
      q.closePath();
      q.fill();
    }, 0.05, 'lighter');
  };
  // the fires mirrored faintly in the worn stone: orange at the left, green and blue at the right
  sheen(sx(CB.braziers[0].X, CB.braziers[0].z), TEMPER.fire.cols[1], 0.06, 90);
  sheen(sx(CB.braziers[2].X, CB.braziers[2].z), TEMPER.poison.cols[1], 0.05, 80);
  sheen(sx(CB.braziers[1].X, CB.braziers[1].z), TEMPER.ice.cols[1], 0.035, 50);
  ctx.restore();
  ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const X = (r() - 0.5) * 3.6;
    const z = ZB + (zf - ZB) * (0.2 + r() * 0.7);
    const ang = (r() - 0.5) * 0.8;
    for (let j = 0; j < 3; j++) {
      const [x0, y0] = T(X + j * 0.04, z);
      const [x1, y1] = T(X + j * 0.04 + Math.sin(ang) * 0.4, z + Math.cos(ang) * 0.3);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(160,150,190,0.07)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x0 + 1, y0 + 1);
      ctx.lineTo(x1 + 1, y1 + 1);
      ctx.stroke();
    }
  }
  // chipped along the front edge
  for (let x = 30 + r() * 60; x < W - 20; x += 90 + r() * 140) {
    const rw = 10 + r() * 22;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(x, f - 1, rw, 6 + r() * 6, 0, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = 'rgba(170,160,200,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x, f - 1, rw, 6, 0, Math.PI * 1.1, Math.PI * 1.5);
    ctx.stroke();
  }
  grain(ctx, box, 'stone', 0.08, 1.4);
  ctx.restore();
  tableFalloff(ctx, f, 0.4, '#04020a');
  crevice(ctx, 0, W, TY, 30, 0.6, '#000000');
  ctx.fillStyle = 'rgba(160,150,200,0.12)';
  ctx.fillRect(0, TY, W, 2);
  rimBand(ctx, f);
}

// ——— the grade and the shade ———

function grade(ctx: Ctx): void {
  ctx.globalCompositeOperation = 'source-atop';
  const g = ctx.createLinearGradient(0, 0, W * 0.8, 1080);
  g.addColorStop(0, rgba('#ff9a70', 0.05));
  g.addColorStop(0.45, rgba('#ff9a70', 0));
  g.addColorStop(0.62, rgba('#4a5ad0', 0));
  g.addColorStop(1, rgba('#4a5ad0', 0.08));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, 1080);
}

function shadeOver(ctx: Ctx): void {
  calmLanes(ctx, 0.2, '#06030a', 120, 640);
  vignetteAll(ctx, 0.72, '#040208');
  vfill(ctx, 0, 0, W, 150, [[0, 'rgba(2,1,6,0.5)'], [1, 'rgba(2,1,6,0)']]);
  // the upper corners deep in the dark, so the gate is what the eye finds
  for (const cx of [0, W]) {
    const g = ctx.createRadialGradient(cx, 0, 0, cx, 0, 620);
    g.addColorStop(0, 'rgba(2,1,6,0.6)');
    g.addColorStop(1, 'rgba(2,1,6,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - 620, 0, 1240, 620);
  }
}

/** A link of a chain as thick as a man, forged iron: face-on (a ring) or edge-on (a bar), lit from the high left,
 * rust in its underside. */
function ironLink(ctx: Ctx, x: number, y: number, ang: number, s: number, face: boolean, lit = 1): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  if (face) {
    ctx.strokeStyle = '#050406';
    ctx.lineWidth = s * 0.6;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.95, s * 0.56, 0, 0, P2);
    ctx.stroke();
    ctx.strokeStyle = IRON.body;
    ctx.lineWidth = s * 0.38;
    ctx.stroke();
    ctx.strokeStyle = rgba(IRON.rust, 0.6);
    ctx.lineWidth = s * 0.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.95, s * 0.56, 0, Math.PI * 0.15, Math.PI * 0.75);
    ctx.stroke();
    ctx.strokeStyle = rgba('#b8b4c4', 0.5 * lit);
    ctx.lineWidth = s * 0.12;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.95, s * 0.56, 0, Math.PI * 1.08, Math.PI * 1.62);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#050406';
    ctx.beginPath();
    ctx.roundRect(-s * 1.08, -s * 0.27, s * 2.16, s * 0.54, s * 0.27);
    ctx.fill();
    ctx.fillStyle = IRON.body;
    ctx.beginPath();
    ctx.roundRect(-s * 0.98, -s * 0.17, s * 1.96, s * 0.34, s * 0.17);
    ctx.fill();
    ctx.fillStyle = rgba(IRON.rust, 0.5);
    ctx.fillRect(-s * 0.7, s * 0.02, s * 1.3, s * 0.12);
    ctx.fillStyle = rgba('#b8b4c4', 0.55 * lit);
    ctx.fillRect(-s * 0.75, -s * 0.15, s * 1.35, s * 0.07);
  }
  ctx.restore();
}

// ——— the chains: a rope of points hung between two fixed ends (Verlet, in screen px), links laid along it ———

/** The chains: from each door's ring down to its rock, and across between the rings. slack: length over span. */
const CHAINS = [
  { a: () => ringFoot(0), b: () => anchorTop(0), slack: 1.05, s: 17, n: 18 },
  { a: () => ringFoot(1), b: () => anchorTop(1), slack: 1.05, s: 17, n: 18 },
  { a: () => ringFoot(0), b: () => ringFoot(1), slack: 1.3, s: 14, n: 9 },
];
const GRAV = 900;

class Rope {
  x: number[] = [];
  y: number[] = [];
  px: number[] = [];
  py: number[] = [];
  seg: number;
  constructor(a: Pt, b: Pt, slack: number, readonly n: number) {
    const span = Math.hypot(b[0] - a[0], b[1] - a[1]);
    this.seg = (span * slack) / (n - 1);
    const sagD = Math.sqrt(Math.max(0, 0.375 * span * (span * slack - span)));
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const x = a[0] + (b[0] - a[0]) * t;
      const y = a[1] + (b[1] - a[1]) * t + Math.sin(t * Math.PI) * sagD;
      this.x.push(x);
      this.y.push(y);
      this.px.push(x);
      this.py.push(y);
    }
  }
  /** One step of dt seconds with its ends held at a and b. */
  step(dt: number, a: Pt, b: Pt, damp = 0.985): void {
    const n = this.n;
    for (let i = 1; i < n - 1; i++) {
      const vx = (this.x[i] - this.px[i]) * damp;
      const vy = (this.y[i] - this.py[i]) * damp;
      this.px[i] = this.x[i];
      this.py[i] = this.y[i];
      this.x[i] += vx;
      this.y[i] += vy + GRAV * dt * dt;
    }
    this.x[0] = a[0];
    this.y[0] = a[1];
    this.x[n - 1] = b[0];
    this.y[n - 1] = b[1];
    for (let it = 0; it < 12; it++) {
      for (let i = 0; i < n - 1; i++) {
        const dx = this.x[i + 1] - this.x[i];
        const dy = this.y[i + 1] - this.y[i];
        const d = Math.hypot(dx, dy) || 0.001;
        const diff = (d - this.seg) / d;
        const wa = i === 0 ? 0 : i + 1 === n - 1 ? 1 : 0.5;
        const wb = i === 0 ? 1 : i + 1 === n - 1 ? 0 : 0.5;
        this.x[i] += dx * diff * wa;
        this.y[i] += dy * diff * wa;
        this.x[i + 1] -= dx * diff * wb;
        this.y[i + 1] -= dy * diff * wb;
      }
    }
  }
  /** Give it a push (px/s) around point i (falling off along it). */
  kick(vx: number, vy: number, dt: number, at = 0.5): void {
    const n = this.n;
    for (let i = 1; i < n - 1; i++) {
      const w = Math.max(0, 1 - Math.abs(i / (n - 1) - at) * 2.2);
      this.px[i] -= vx * dt * w;
      this.py[i] -= vy * dt * w;
    }
  }
  pts(): Pt[] {
    return this.x.map((x, i) => [x, this.y[i]] as Pt);
  }
}

/** The ropes hung and settled (what the still shows, and where the live ones start). */
function settledRopes(): Rope[] {
  return CHAINS.map((c) => {
    const rope = new Rope(c.a(), c.b(), c.slack, c.n);
    for (let i = 0; i < 400; i++) rope.step(1 / 120, c.a(), c.b(), 0.95);
    return rope;
  });
}

/** Where a chain's links lie along its rope: every 1.5 s px, each turned along it, face-on and edge-on in turn. */
function linkPlaces(pts: Pt[], s: number): { x: number; y: number; ang: number; face: boolean }[] {
  const seg: number[] = [0];
  for (let i = 1; i < pts.length; i++) seg.push(seg[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = seg[seg.length - 1];
  const out: { x: number; y: number; ang: number; face: boolean }[] = [];
  let n = 0;
  let i = 1;
  for (let d = s * 0.6; d < total - s * 0.3; d += s * 1.5, n++) {
    while (i < seg.length - 1 && seg[i] < d) i++;
    const t = (d - seg[i - 1]) / Math.max(0.001, seg[i] - seg[i - 1]);
    out.push({ x: pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, y: pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t, ang: Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]), face: n % 2 === 0 });
  }
  return out;
}

/** How many links each chain has (fixed: the live chains keep their links as they swing). */
const LINK_COUNT = (() => settledRopes().map((rp, i) => linkPlaces(rp.pts(), CHAINS[i].s).length))();

export const GATE_LIVE: Box = (() => {
  const a0 = anchorTop(0);
  const a1 = anchorTop(1);
  return { x: Math.floor(a0[0] - 40), y: Math.floor(ringFoot(0)[1] - 40), w: Math.ceil(a1[0] - a0[0] + 80), h: Math.ceil(sy(0, CB.anchors[0][1]) + 30 - (ringFoot(0)[1] - 40)) };
})();

function chainsStill(ctx: Ctx): void {
  for (const [i, rope] of settledRopes().entries()) {
    const c = CHAINS[i];
    const places = linkPlaces(rope.pts(), c.s).slice(0, LINK_COUNT[i]);
    // their shadows on the doors and the floor first, thrown down-right
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    for (const p of places) {
      ctx.save();
      ctx.translate(p.x + 9, p.y + 13);
      ctx.rotate(p.ang);
      if (p.face) {
        ctx.lineWidth = c.s * 0.55;
        ctx.beginPath();
        ctx.ellipse(0, 0, c.s * 0.95, c.s * 0.55, 0, 0, P2);
        ctx.stroke();
      } else ctx.fillRect(-c.s * 1.05, -c.s * 0.24, c.s * 2.1, c.s * 0.48);
      ctx.restore();
    }
    ctx.save();
    ctx.globalAlpha = 0.78;
    for (const p of places) ironLink(ctx, p.x, p.y, p.ang, c.s, p.face, 0.6);
    ctx.restore();
  }
}

// ——— the river's life: its shore lapping, mist rolling off it ———

/** The lapping shore's frame: from the table back along the shore to the cliff's end. */
export const LAP_BOX: Box = (() => {
  const b = boxOfPts(SHORE.filter(([x]) => x > -40 && x < 600), 14);
  return { x: 0, y: b.y, w: Math.min(560, b.x + b.w), h: Math.min(TY, b.y + b.h) - b.y };
})();
const LAP_RES = 0.75;

/** One frame of the shore lapping (phase 0…1 loops), in LAP_BOX's coordinates: the water running up the shingle and
 * back, a lace of foam at its edge, a wet sheen behind it, small waves coming in. */
function lapFrame(c: Ctx, ph: number): void {
  c.translate(-LAP_BOX.x, -LAP_BOX.y);
  const zs: number[] = [];
  for (let z = 12.4; z <= CB.cliffZ; z += 0.2) zs.push(z);
  const line = (dX: number, wob: number, phase: number) =>
    zs.map((z) => P(shoreX(z) + dX + Math.sin(z * 2.3 + phase) * wob, 0, z));
  // the run-up: up the shingle and back over the cycle
  const run = 0.12 + 0.3 * (0.5 - 0.5 * Math.cos(ph * P2));
  const edge = line(run, 0.06, ph * P2);
  // the wet sheen it leaves on the shingle, darker and glossy
  const wet = line(Math.max(run, 0.36), 0.04, 1.3);
  c.fillStyle = 'rgba(2,4,6,0.35)';
  c.beginPath();
  wet.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  for (let i = zs.length - 1; i >= 0; i--) c.lineTo(...P(shoreX(zs[i]) - 0.05, 0, zs[i]));
  c.closePath();
  c.fill();
  // the water over the shingle, a thin film reflecting the red glow
  c.fillStyle = 'rgba(30,20,26,0.55)';
  c.beginPath();
  edge.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  for (let i = zs.length - 1; i >= 0; i--) c.lineTo(...P(shoreX(zs[i]) - 0.1, 0, zs[i]));
  c.closePath();
  c.fill();
  // the foam at its edge: broken lace, brightest as it turns
  const turn = 1 - Math.abs(Math.sin(ph * P2));
  c.lineCap = 'round';
  for (const [dX, a, w] of [[0, 0.55, 2], [-0.08, 0.25, 1.2]] as const) {
    for (let i = 0; i < edge.length - 1; i++) {
      if ((Math.sin(zs[i] * 7.1 + ph * 9) + Math.sin(zs[i] * 3.3)) < -0.6) continue;
      const k = pz(zs[i]) / 60;
      const [x0, y0] = P(shoreX(zs[i]) + run + dX + Math.sin(zs[i] * 2.3 + ph * P2) * 0.06, 0, zs[i]);
      const [x1, y1] = P(shoreX(zs[i + 1]) + run + dX + Math.sin(zs[i + 1] * 2.3 + ph * P2) * 0.06, 0, zs[i + 1]);
      c.strokeStyle = rgba('#c8e4e0', Math.min(1, a * 1.3) * (0.55 + turn * 0.45));
      c.lineWidth = w * k;
      c.beginPath();
      c.moveTo(x0, y0);
      c.lineTo(x1, y1);
      c.stroke();
    }
  }
  // the small waves coming in, three to a cycle, lit red along their crests
  for (let j = 0; j < 3; j++) {
    const q = (ph + j / 3) % 1;
    const dX = -0.15 - (1 - q) * 1.4;
    const a = Math.sin(q * Math.PI) * 0.45;
    c.strokeStyle = rgba('#ff8a5a', a * 0.35);
    c.lineWidth = 1.2;
    c.beginPath();
    zs.forEach((z, i) => {
      const [x, y] = P(shoreX(z) + dX + Math.sin(z * 1.7 + j) * 0.1, 0, z);
      if (i) c.lineTo(x, y);
      else c.moveTo(x, y);
    });
    c.stroke();
    c.strokeStyle = rgba('#000000', a * 0.5);
    c.beginPath();
    zs.forEach((z, i) => {
      const [x, y] = P(shoreX(z) + dX - 0.08 + Math.sin(z * 1.7 + j) * 0.1, 0, z);
      if (i) c.lineTo(x, y + 1.5);
      else c.moveTo(x, y + 1.5);
    });
    c.stroke();
  }
}

/** The mist's frame (phase 0…1 loops): low rolling banks moving across, each lobe lit warm on its top left by the
 * fires and the abyss, cool and dark under. w×h. */
const MIST = { w: 620, h: 160 };
const MIST_RES = 0.5;
function mistFrame(c: Ctx, ph: number, w: number, h: number, seed: number): void {
  const r = rng(hashStr('cb:mist' + seed));
  const n = 16;
  for (let i = 0; i < n; i++) {
    const base = r();
    const q = (base + ph) % 1;
    const x = -w * 0.15 + q * w * 1.3;
    const y = h * (0.5 + r() * 0.35) - Math.sin(q * Math.PI * 2 + i) * h * 0.06;
    const rad = h * (0.22 + r() * 0.22) * (0.8 + Math.sin(q * Math.PI) * 0.3);
    const a = Math.sin(q * Math.PI) ** 1.2 * (0.35 + r() * 0.25);
    const g = c.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, rgba('#6e6070', a));
    g.addColorStop(0.6, rgba('#5a4a5c', a * 0.6));
    g.addColorStop(1, rgba('#5a4a5c', 0));
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(x, y, rad * 1.8, rad * 0.7, 0, 0, P2);
    c.fill();
    const gl = c.createRadialGradient(x - rad * 0.5, y - rad * 0.25, 0, x - rad * 0.5, y - rad * 0.25, rad);
    gl.addColorStop(0, rgba('#c88a70', a * 0.45));
    gl.addColorStop(1, rgba('#c88a70', 0));
    c.fillStyle = gl;
    c.beginPath();
    c.ellipse(x - rad * 0.4, y - rad * 0.2, rad * 1.3, rad * 0.5, 0, 0, P2);
    c.fill();
  }
}
/** Where the mist banks lie: over the river and spilling onto the shingle. */
const MISTS = [
  { x: 90, y: 672, s: 0.75, a: 0.5, fps: 0.06, ph: 0 },
  { x: 250, y: 600, s: 0.5, a: 0.45, fps: 0.045, ph: 3.7 },
];
export const SHORE_BOX: Box = { x: 0, y: Math.min(LAP_BOX.y, 560), w: 600, h: TY - Math.min(LAP_BOX.y, 560) };

function shoreStill(ctx: Ctx): void {
  ctx.save();
  ctx.translate(LAP_BOX.x, LAP_BOX.y);
  lapFrame(ctx, 0.2);
  ctx.restore();
  for (const m of MISTS) {
    ctx.save();
    ctx.translate(m.x - (MIST.w * m.s) / 2, m.y - MIST.h * m.s * 0.6);
    ctx.scale(m.s, m.s);
    ctx.globalAlpha = m.a;
    mistFrame(ctx, m.ph / 8, MIST.w, MIST.h, 1);
    ctx.restore();
  }
}

// ——— the stack ———

const FIRES_BOX: Box = (() => {
  const bs = CB.braziers.map((_, i) => tripodBox(i));
  return { x: 0, y: Math.min(...bs.map((b) => b.y)) - 160, w: W, h: Math.max(...bs.map((b) => b.y)) - Math.min(...bs.map((b) => b.y)) + 260 };
})();

const TABLE_BOX: Box = { x: 0, y: TY, w: W, h: 1080 - TY };

export const CERBERUS: SceneSpec = {
  id: 'cerberus',
  info: {
    name: 'The Gates of Hades',
    subtitle: 'Boss: CERBERUS',
    ambient: [],
    // (the fires and the seam's glow are the live layer's)
    glows: [],
    light: '#e8b8a8',
    tableTint: '#f0e6ea',
  },
  layers: [
    { id: 'far', box: FAR_BOX, draw: far },
    { id: 'floor', box: FLOOR_BOX, draw: floor },
    { id: 'cliff', box: CLIFF_BOX, draw: cliff },
    { id: 'doorL', box: leafBox(-1), motion: 'sprite', draw: (c, r) => leaf(c, r, -1) },
    { id: 'doorR', box: leafBox(1), motion: 'sprite', draw: (c, r) => leaf(c, r, 1) },
    { id: 'lintel', box: LINTEL_BOX, draw: lintel },
    { id: 'pierL', box: FRAME_L, draw: (c, r) => pier(c, r, -1) },
    { id: 'pierR', box: FRAME_R, draw: (c, r) => pier(c, r, 1) },
    { id: 'lair', box: { ...LAIR_BOX, y: leafBox(-1).y + leafBox(-1).h, h: LAIR_BOX.y + LAIR_BOX.h - (leafBox(-1).y + leafBox(-1).h) }, draw: lair },
    { id: 'gateLive', box: GATE_LIVE, motion: 'slot', draw: () => {} },
    { id: 'chainsStill', box: GATE_LIVE, stillOnly: true, draw: (c) => chainsStill(c) },
    { id: 'shore', box: SHORE_BOX, motion: 'slot', draw: () => {} },
    { id: 'shoreStill', box: SHORE_BOX, stillOnly: true, draw: (c) => shoreStill(c) },
    { id: 'tripod0', box: tripodBox(0), motion: 'sprite', draw: (c) => tripod(c, 0) },
    { id: 'tripod1', box: tripodBox(1), motion: 'sprite', draw: (c) => tripod(c, 1) },
    { id: 'tripod2', box: tripodBox(2), motion: 'sprite', draw: (c) => tripod(c, 2) },
    { id: 'firesStill', box: FIRES_BOX, stillOnly: true, draw: (c) => firesStill(c) },
    { id: 'table', box: TABLE_BOX, draw: table },
    { id: 'top', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

// ——— live ———

/** The fight's sounds, heard by the backdrop: the game scene's sfx is wrapped once, and listeners come and go. */
const HOOK = '__cbSfxListeners';
function sfxListeners(sc: Phaser.Scene): Set<(key: string) => void> | null {
  const s = sc as unknown as Record<string, unknown> & { sfx?: (key: string, o?: unknown) => void };
  if (typeof s.sfx !== 'function') return null;
  if (!s[HOOK]) {
    const set = new Set<(key: string) => void>();
    const prev = s.sfx;
    s.sfx = function (this: unknown, key: string, o?: unknown) {
      for (const f of set) f(key);
      return prev.call(this, key, o);
    };
    s[HOOK] = set;
  }
  return s[HOOK] as Set<(key: string) => void>;
}

registerKitScene(CERBERUS, (k: KitLive) => {
  const top = k.slot('top');
  const gate = k.slot('gateLive');
  const shoreC = k.slot('shore');

  // ——— the doors, hinged at their outer feet; the red seam between them ———
  const doors = ([-1, 1] as const).map((side) => {
    const img = k.sprite(side < 0 ? 'doorL' : 'doorR');
    const b = leafBox(side);
    const hx = side < 0 ? b.x : b.x + b.w;
    k.pivot(img, hx, b.y + b.h);
    return { img, side, x0: img.x, y0: img.y };
  });
  const lb = leafBox(-1);
  const seam = k.glow(960, lb.y + lb.h / 2, 26, 0xff4a20, 0.12, { into: gate, sy: lb.h / 2 / 26 });
  const seamFoot = k.glow(960, lb.y + lb.h + 16, 240, 0xff4a20, 0.08, { into: gate, sy: 0.14 });
  let shudder = 0;

  // ——— the chains ———
  const LS = 2.6;
  const linkKey = sheet(k, 'cb_link', 26 * LS, 16 * LS, 2, (c, _p, i) => {
    c.scale(LS, LS);
    ironLink(c, 13, 8, 0, 9.5, i === 0, 0.85);
  });
  const ropes = settledRopes();
  const chains = CHAINS.map((ch, i) => {
    const sh = Array.from({ length: LINK_COUNT[i] }, () => k.img(linkKey, 0, 0, { into: gate, tint: 0x000000, alpha: 0.2 }));
    const ls = Array.from({ length: LINK_COUNT[i] }, () => k.img(linkKey, 0, 0, { into: gate, tint: i === 0 ? 0xc8b0a4 : i === 1 ? 0xacc0a8 : 0xbcb4b4, alpha: 0.85 }));
    return { ch, rope: ropes[i], ls, sh, scale: ch.s / 9.5 / LS };
  });
  /** A door's ring, moved with its leaf. */
  const doorOff = (side: -1 | 1): Pt => {
    const d = doors[side < 0 ? 0 : 1];
    return [d.img.x - d.x0, d.img.y - d.y0];
  };
  const endA = (i: number): Pt => {
    const p = CHAINS[i].a();
    const o = doorOff(-1);
    return [p[0] + o[0], p[1] + o[1]];
  };
  const endB = (i: number): Pt => {
    const p = CHAINS[i].b();
    if (i < 2) return p;
    const o = doorOff(1);
    return [p[0] + o[0], p[1] + o[1]];
  };
  const chainAcc = { t: 0 };
  /** Waves running along the chains (from the door's end to the rock's): each pushes the links it passes. */
  const waves: { rope: Rope; t: number; vx: number; vy: number }[] = [];
  const wave = (rope: Rope, vx: number, vy: number) => waves.push({ rope, t: 0, vx, vy });

  // ——— the fires ———
  const FW = 150;
  const FH = 200;
  const RF = 0.7;
  const FN = 10;
  const SMW = 120;
  const SMH = 300;
  const RS = 0.4;
  const smokeLook: Record<Temper, { lit: string; body: string; shade: string; wind: number; a: number; lobes: number }> = {
    fire: { lit: '#ffb080', body: '#4a3a3c', shade: '#140c12', wind: 0.25, a: 0.32, lobes: 24 },
    ice: { lit: '#f0fbff', body: '#9ab8d0', shade: '#3a4a68', wind: -0.1, a: 0.2, lobes: 20 },
    poison: { lit: '#d8ff9a', body: '#3e6a2c', shade: '#122010', wind: 0.15, a: 0.3, lobes: 22 },
  };
  const fires = CB.braziers.map((bz, i) => {
    const tp = TEMPER[bz.t];
    const kk = pz(bz.z);
    const img = k.sprite('tripod' + i);
    const [x, y] = P(bz.X, CB.bowlY, bz.z);
    const fireKey = sheet(k, `cb_fire_${bz.t}`, FW * RF, FH * RF, FN, (c, ph) => {
      c.scale(RF, RF);
      fireFrame(c, FW / 2, FH - 8, FW * 0.85, FH * 0.85, ph, { tongues: 6, seed: 3 + i * 2, cols: tp.cols });
    });
    const sl = smokeLook[bz.t];
    const smokeKey = sheet(k, `cb_smoke_${bz.t}`, SMW * RS, SMH * RS, 8, (c, ph) => {
      c.scale(RS, RS);
      smokeFrame(c, SMW, SMH, ph, { lit: sl.lit, body: sl.body, shade: sl.shade, wind: sl.wind, lobes: sl.lobes, a: sl.a, toLight: [-0.6, -0.8], seed: 2 + i });
    });
    const w = kk * TRIPOD.bowlR * 1.75;
    const s = w / (FW * 0.85);
    const halo = k.glow(x, y - kk * 0.5, kk * 1.5, tp.glow, 0, { into: top });
    const pool = k.glow(x, sy(0, bz.z), kk * 3.2, tp.glow, 0, { into: top, sy: 0.22 });
    const smoke = new Loop(k, smokeKey, 8, x, y - kk * 0.55, { into: top, origin: [0.5, 1], scale: (kk * 2.6) / (SMH * RS), fps: 1.5, phase: i * 2.1 });
    const fl = new Loop(k, fireKey, FN, x, y + 2, { into: top, origin: [0.5, (FH - 8) / FH], scale: s / RF, fps: 11 + i, phase: i * 2.6 });
    const coal = k.glow(x, y - 2, kk * 0.75, tp.glow, 0.5, { into: top, sy: 0.3 });
    return { bz, tp, img, x0: img.x, y0: img.y, x, y, kk, s, halo, pool, smoke, fl, coal, seed: i * 1.7, jolt: new Spring(0, 240, 9), roar: 0, rate: new Rate(), rate2: new Rate() };
  });
  const embers = new Parts(k, { frame: 'ember', add: true, into: top, max: 120 });
  const vapour = new Parts(k, { frame: 'puff', into: top, max: 60 });
  const bubbles = new Parts(k, { frame: 'bubble', into: top, max: 30 });
  const drips = new Parts(k, { frame: 'drop', into: top, max: 20 });
  const glints = new Parts(k, { frame: 'spark', add: true, into: top, max: 30 });
  const duck = new Spring(0, 34, 5);
  let flare = 0;

  // ——— the gate shedding grit and dust ———
  const grit = new Parts(k, { frame: 'mote', into: gate, max: 220 });
  const dust = new Parts(k, { frame: 'puff', into: gate, max: 140 });
  const ash = new Parts(k, { frame: 'mote', into: top, max: 50 });
  const ashRate = new Rate();
  const pourRate = new Rate();
  const [, sillY] = P(0, G.sill, G.z - 0.6);
  const floorAt = (x: number) => (Math.abs(x - 960) < 315 ? sillY : sy(0, PR.z - 0.6));
  /** Grit and flakes of stone off the gate: from the lintel's foot, the capitals, the cornice. */
  const shed = (n: number, p: number, x0 = 640, x1 = 1280) => {
    for (let i = 0; i < n; i++) {
      const src = crand();
      let x: number;
      let y: number;
      if (src < 0.6) {
        x = x0 + crand() * (x1 - x0);
        y = sy(LT.Y0, PR.z) + crand() * 4;
      } else if (src < 0.85) {
        const side = crand() < 0.5 ? -1 : 1;
        x = sx(side * (PR.x0 + 1.3), PR.z - 0.4) + (crand() - 0.5) * 100;
        y = sy(LT.Y0 - 1.05, PR.z - 0.4);
      } else {
        x = 520 + crand() * 880;
        y = 18 + crand() * 10;
      }
      grit.spawn({ x, y, vx: (crand() - 0.5) * 30, vy: crand() * 30, life: 2.6, r0: 1.2 + crand() * 1.8, a: 0.9, tint: crand() < 0.5 ? 0x8a7a88 : 0x5a4e5a, grav: 900, drag: 0.2, floor: floorAt(x) + crand() * 10, bounce: 0.3, fade: 0.02 });
    }
    for (let i = 0; i < 2 + p * 5; i++) {
      const x = x0 + crand() * (x1 - x0);
      dust.spawn({ x, y: sy(LT.Y0, PR.z) + 4, vx: (crand() - 0.5) * 10, vy: 20 + crand() * 30, life: 2.4 + crand(), r0: 6, r1: 22 + crand() * 18, a: 0.32, tint: 0x8a7a80, grav: 24, drag: 1.2, fade: 0.15 });
    }
  };
  /** A puff where something lands at the gate's foot. */
  const puff = (x: number, a: number) => dust.spawn({ x, y: floorAt(x) - 2, vx: (crand() - 0.5) * 40, vy: -8 - crand() * 16, life: 1.6 + crand(), r0: 8, r1: 30 + crand() * 20, a, tint: 0x5a4c54, drag: 1.2, fade: 0.15 });

  // ——— the river: the shore lapping, the mist ———
  const LW = Math.ceil(LAP_BOX.w * LAP_RES);
  const LH = Math.ceil(LAP_BOX.h * LAP_RES);
  const lapKey = sheet(k, 'cb_lap', LW, LH, 8, (c, ph) => {
    c.scale(LAP_RES, LAP_RES);
    lapFrame(c, ph);
  });
  const lap = new Loop(k, lapKey, 8, LAP_BOX.x, LAP_BOX.y, { into: shoreC, origin: [0, 0], scale: 1 / LAP_RES, fps: 1.4 });
  const mistKey = sheet(k, 'cb_mist', MIST.w * MIST_RES, MIST.h * MIST_RES, 8, (c, ph) => {
    c.scale(MIST_RES, MIST_RES);
    mistFrame(c, ph, MIST.w, MIST.h, 1);
  });
  const mists = MISTS.map((m) => ({ m, l: new Loop(k, mistKey, 8, m.x, m.y, { into: shoreC, origin: [0.5, 0.6], scale: m.s / MIST_RES, fps: m.fps * 8, phase: m.ph }) }));

  // ——— the fight, heard ———
  const listeners = sfxListeners(k.sc);
  let howlAt = -9;
  let tNow = 0;
  const howl = () => {
    if (tNow - howlAt < 0.8) return;
    howlAt = tNow;
    flare = 1;
    shudder = 1;
    for (const f of fires) f.jolt.v -= 200 + crand() * 80;
    shed(30, 1);
    // a ring of dust bursting off each dent, as if something inside struck the doors
    for (const [X, Y, rad] of DENTS) {
      const [cx, cy] = P(X, Y, G.z);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * P2 + crand() * 0.5;
        dust.spawn({ x: cx + Math.cos(a) * rad * DK, y: cy + Math.sin(a) * rad * DK, vx: Math.cos(a) * 40, vy: Math.sin(a) * 40 + 10, life: 1.4 + crand(), r0: 4, r1: 16 + crand() * 10, a: 0.28, tint: 0x7a6a70, grav: 30, drag: 1.6, fade: 0.1 });
      }
    }
    for (const c of chains) wave(c.rope, (crand() - 0.5) * 40, -26 - crand() * 10);
  };
  const onSfx = (key: string) => {
    if (key === 'sfx_cerberus_howl') howl();
    else if (key === 'sfx_cerberus_fire') fires[0].roar = 1;
    else if (key === 'sfx_cerberus_ice') fires[1].roar = 1;
    else if (key === 'sfx_cerberus_poison') fires[2].roar = 1;
  };
  listeners?.add(onSfx);

  return {
    impact(x, _y, p) {
      // a stomp: grit off the gate, the chains jump and sway, the fires duck
      shed(Math.round(3 + p * 12), p);
      duck.v -= 3 + p * 5;
      for (const c of chains) wave(c.rope, (x < 960 ? 1 : -1) * (6 + crand() * 8) * p, -(8 + crand() * 8) * p);
      if (p > 0.5) shudder = Math.max(shudder, 0.25 * p);
      // (on the stages page, with no fight to hear, the biggest blows stand in for the howl)
      if (!listeners && p >= 0.95) howl();
    },
    update(dt, t) {
      tNow = t;
      const cm = calm();
      // the doors: shuddering in their frame (fast, small, dying away), the seam flickering
      shudder = Math.max(0, shudder - dt * 0.7);
      const sh = shudder * shudder * cm;
      for (const d of doors) {
        const jx = (Math.sin(t * 57 + d.side * 1.3) + Math.sin(t * 91 + d.side) * 0.5) * sh * 2.4;
        const jy = Math.sin(t * 73 + d.side * 2) * sh * 1.2;
        d.img.setPosition(d.x0 + jx, d.y0 + jy);
        d.img.setRotation(Math.sin(t * 43 + d.side) * sh * 0.004);
        d.img.setScale(1 + sh * 0.012 * (0.6 + 0.4 * Math.sin(t * 31 + d.side)));
      }
      seam.setAlpha(0.12 + 0.05 * flicker(t * 0.8, 3) + sh * 0.9 + flare * 0.25);
      seamFoot.setAlpha(0.08 + sh * 0.5 + flare * 0.15);
      // dust pouring off the lintel while they shudder
      pourRate.tick(sh * 70, dt, () => {
        const x = 650 + crand() * 620;
        dust.spawn({ x, y: sy(LT.Y0, G.z) + 2, vx: (crand() - 0.5) * 6, vy: 30 + crand() * 40, life: 2.2 + crand(), r0: 4, r1: 16 + crand() * 14, a: 0.3, tint: 0x6a5a62, grav: 60, drag: 0.8, fade: 0.1 });
        if (crand() < 0.5) grit.spawn({ x, y: sy(LT.Y0, G.z), vx: (crand() - 0.5) * 10, vy: 10, life: 2.2, r0: 1 + crand() * 1.4, a: 0.85, tint: 0x8a7a88, grav: 900, floor: floorAt(x) + crand() * 8, bounce: 0.25, fade: 0.02 });
        if (crand() < 0.06) puff(x, 0.18);
      });

      // the chains: their ends follow the doors, they swing, settle and hang
      chainAcc.t += Math.min(dt, 0.1);
      const H = 1 / 120;
      while (chainAcc.t >= H) {
        chainAcc.t -= H;
        for (const [i, c] of chains.entries()) c.rope.step(H, endA(i), endB(i));
      }
      for (let i = waves.length - 1; i >= 0; i--) {
        const w = waves[i];
        w.t += dt;
        if (w.t > 0.45) waves.splice(i, 1);
        else w.rope.kick(w.vx * cm, w.vy * cm, dt, w.t / 0.45);
      }
      for (const c of chains) {
        // a faint idle stir, as if the doors breathed
        c.rope.kick(Math.sin(t * 0.7 + c.ch.s) * 1.2 * cm * dt, 0, 1, 0.5);
        const places = linkPlaces(c.rope.pts(), c.ch.s);
        for (let j = 0; j < c.ls.length; j++) {
          const p = places[Math.min(j, places.length - 1)];
          const im = c.ls[j];
          im.setFrame(p.face ? 0 : 1).setPosition(p.x, p.y).setRotation(p.ang).setScale(c.scale);
          c.sh[j].setFrame(p.face ? 0 : 1).setPosition(p.x + 9, p.y + 13).setRotation(p.ang).setScale(c.scale);
        }
      }

      // the fires: a stomp ducks them, the howl flares all three, a paw's breath roars its own
      const d = duck.step(0, dt);
      flare = Math.max(0, flare - dt * 0.55);
      const fl2 = flare * flare;
      for (const f of fires) {
        f.roar = Math.max(0, f.roar - dt * 0.8);
        const fk = flicker(t * 1.1, f.seed);
        const boost = 1 + fl2 * 0.9 + f.roar * 0.55;
        const jy = f.jolt.step(0, dt) * cm;
        f.img.setPosition(f.x0, f.y0 + jy);
        f.fl.step(dt, (0.9 + fl2 * 0.8 + f.roar * 0.5) * cm);
        const hgt = (0.95 + 0.05 * fk) * (1 + d * 0.5) * boost;
        f.fl.each((im) => {
          im.setScale((f.s / RF) * (1 + (boost - 1) * 0.35), (f.s / RF) * Math.max(0.15, hgt));
          im.setPosition(f.x, f.y + 2 + jy);
        });
        f.halo.setAlpha((0.14 + 0.06 * fk) * (1 + Math.max(0, d) * 0.4) * (1 + fl2 * 2 + f.roar));
        f.pool.setAlpha((0.1 + 0.04 * fk) * (1 + fl2 * 2.2 + f.roar * 1.2));
        f.coal.setAlpha(0.45 + 0.1 * fk + fl2 * 0.4).setPosition(f.x, f.y - 2 + jy);
        f.smoke.step(dt, (1 + fl2) * cm);
        f.smoke.alpha = 0.55 + fl2 * 0.3;
        f.smoke.each((im) => im.setPosition(f.x, f.y - f.kk * 0.55 + jy));
        const kk = f.kk;
        const burst = 1 + fl2 * 6 + f.roar * 4;
        if (f.bz.t === 'fire') {
          // embers thrown up, curling, cooling as they rise
          f.rate.tick((6 + Math.max(0, d) * 20) * burst * cm, dt, () => {
            embers.spawn({ x: f.x + (crand() - 0.5) * kk * 0.8, y: f.y - kk * 0.25, vx: (crand() - 0.45) * 50, vy: (-90 - crand() * 140) * (1 + fl2), life: 1.4 + crand() * 1.6, r0: 2 + crand() * 2.4, r1: 0.6, a: 0.9, tint: crand() < 0.5 ? 0xffb040 : 0xff6a20, grav: -12, drag: 0.5, streak: 0.02, fade: 0.08 });
          });
        } else if (f.bz.t === 'ice') {
          // cold vapour spilling over the bowl's lip and sinking down the legs; frost glinting
          f.rate.tick(5 * burst * cm, dt, () => {
            const side = crand() < 0.5 ? -1 : 1;
            vapour.spawn({ x: f.x + side * kk * TRIPOD.bowlR * (0.8 + crand() * 0.3), y: f.y + 2, vx: side * (6 + crand() * 10), vy: 6 + crand() * 10, life: 2.4 + crand(), r0: kk * 0.08, r1: kk * (0.3 + crand() * 0.2), a: 0.22, tint: 0xcfe8ff, grav: 14, drag: 0.9, fade: 0.2 });
          });
          f.rate2.tick(3 * burst * cm, dt, () => {
            glints.spawn({ x: f.x + (crand() - 0.5) * kk * 1.2, y: f.y - kk * (0.1 + crand() * 0.8), vx: 0, vy: -10, life: 0.6, r0: 2.4, r1: 0.6, a: 0.8, tint: 0xe8f8ff, fade: 0.3 });
          });
        } else {
          // the poison: bubbles rising off it and popping, slime dripping from the lip
          f.rate.tick(5 * burst * cm, dt, () => {
            bubbles.spawn({ x: f.x + (crand() - 0.5) * kk * TRIPOD.bowlR * 1.4, y: f.y - 2, vx: (crand() - 0.5) * 8, vy: -14 - crand() * 18, life: 0.7 + crand() * 0.6, r0: 2 + crand() * 2, r1: 4 + crand() * 3, a: 0.8, tint: 0xb8ff7a, fade: 0.1 });
          });
          f.rate2.tick(0.5 * burst * cm, dt, () => {
            const dx = (crand() < 0.5 ? -1 : 1) * kk * TRIPOD.bowlR * (0.5 + crand() * 0.4);
            drips.spawn({ x: f.x + dx, y: f.y + kk * 0.25, vx: 0, vy: 0, life: 2, r0: 2.2, a: 0.85, tint: 0x8ee04a, grav: 700, floor: sy(0, f.bz.z) + 2, fade: 0.02 });
          });
        }
      }

      // the river: the shore lapping, the mist rolling off it
      lap.step(dt, cm);
      for (const [i, m] of mists.entries()) {
        m.l.step(dt, cm);
        m.l.alpha = m.m.a * (0.85 + 0.15 * Math.sin(t * 0.21 + i * 2));
        m.l.each((im) => im.setPosition(m.m.x + Math.sin(t * 0.05 + i) * 16, m.m.y));
      }

      // ash drifting down through the dark, only where the air is dark (over the cliff, the far smoke)
      ashRate.tick(4 * cm, dt, () => {
        const x = crand() * W;
        if (x > 520 && x < 1400) return;
        ash.spawn({ x, y: -10, vx: (crand() - 0.5) * 12, vy: 20 + crand() * 20, life: 9, r0: 1 + crand() * 1.4, a: 0.5, tint: 0x8a7a80, grav: 0, drag: 0, fade: 0.1 });
      });

      embers.update(dt);
      vapour.update(dt);
      bubbles.update(dt);
      drips.update(dt);
      glints.update(dt);
      grit.update(dt);
      dust.update(dt);
      ash.update(dt);
    },
    destroy() {
      listeners?.delete(onSfx);
    },
  };
});
