// The Throne of the Underworld (the arena of HADES, the boss of Tartarus and the last fight of Act 9), redrawn with
// the location kit (src/art/scene). Inside the black-marble temple the Styx runs past in Tartarus (scene-tartarus.ts)
// and behind the gate the hound keeps (scene-cerberus.ts): the throne hall itself, the act's finale.
//
// A long hall of colossal columns of black marble, fluted, on bronze bases, with bronze capitals, receding in true
// perspective to an apse; a great beam crosses the nave where the colonnade ends, and over the apse the coffered
// ceiling is lost in the dark. The apse (a flat end wall, turned forward either side, a third pair of columns engaged
// in it rising out of the chasm) is black marble seamed with thin veins of gold and set with gems (garnet, sapphire,
// the green of the river's depths), a cypress carved in a niche in each turned wall, and high on the end wall a
// bronze roundel, a black sun rayed in bronze, clamped to the wall, the bident in it: a halo over the empty throne. On a
// high stepped dais the lord's throne of black stone and bronze (cypress finials, a lapis panel with the bident, a
// purple drape thrown over the seat, lion's feet) and Persephone's smaller throne beside it (an arched back carved
// with a pomegranate tree, a dark red cushion); at its foot, on the floor, a bronze stand holding a bowl of
// pomegranates, one split open and its seeds spilled down the stand onto the floor. The dead's fares lie heaped at
// the throne's foot and spill down the steps. Two bronze tripods on the dais and two cressets on the nearest
// columns burn with cold blue soul-fire.
//
// Behind the dais the floor is cut through by the chasm down into Tartarus, where the Titans are chained: its far
// wall is columnar basalt lit red from below, its glow climbing the end wall behind the throne; great bronze chains
// run from rings on blocks set in the floor over its lip and down into it. The floor is polished black marble on one
// shared grid (each column centred on its slab), mirroring the soul-fires and the chasm's red. The table is a slab of
// the same marble, faintly veined, its bronze rim in the key pattern.
//
// An arena, not a location: no waves. It answers the fight (the hades brain in src/game/bosses/act9.ts emits
// 'hades-titan' with the Titan's kind when one is raised, and 'hades-banish' when one is beaten):
// - when a Titan rises the chasm flares (red, gold for Kronos, white-hot for Hyperion), its chains go taut and
//   strain, grinding at the lip and shaking their blocks, and dust pours from the ceiling;
// - when one is banished the chasm dims and the soul-fires gutter low, then flare back cold blue;
// - a stomp ducks the soul-fires, sets coins sliding off the heaps and knocks dust off the ceiling and the beam.
// Hero animations: the soul-fires (painted at 10 phases, wisps rising off them), the chasm (its glow breathing,
// embers rising, smoke lit from below and heat shimmer, both painted frame loops), the chains (bronze links on ropes
// with physics, straining), and wisps of souls drifting through the hall (a painted frame loop).

import Phaser from 'phaser';
import { type Air, type Ctx, type R, TY, W, castShadow, crevice, glowAt, groundShadow, haze, lightPool, polyPath, solid, vfill, vignetteAll, within, calmLanes } from '../../art/scene/kit';
import type { SceneSpec } from '../../art/scene/layers';
import { grain, tableFalloff } from '../../art/scene/materials';
import { crack, drift, lay, noiseMask, softly, streaks, surface } from '../../art/scene/paint';
import { ZB, xAt, yAt, zFront } from '../../art/sceneKit';
import { makeCanvas, mix, rgba, shade } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { Loop, Parts, Rate, Spring, sheet } from '../../game/sceneAnim';
import { type KitLive, calm, flicker, registerKitScene } from '../../game/sceneLive';
import { smokeFrame } from './sceneBits';
import { BRONZE_M, BRZ, KEY_U, SLAB, rimBand } from './scene-tartarus';

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
const norm = (v: V3): V3 => {
  const l = Math.hypot(...v) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// ——— the view ———
//
// Metres: X across, Y up, z away. The eye EH above the hall's floor, low (the hall towers); the vanishing point in the
// middle at HZ. (The table has the game's own perspective.)

const F = 1100;
const HZ = 360;
const EH = 5;
const sx = (X: number, z: number) => 960 + (F * X) / z;
const sy = (Y: number, z: number) => HZ + (F * (EH - Y)) / z;
const P = (X: number, Y: number, z: number): Pt => [sx(X, z), sy(Y, z)];
/** Screen px per metre at depth z. */
const pz = (z: number) => F / z;

/** The hall's grid: slabs GX across and GZ deep, every column centred on its slab; ornaments keep the same spacing. */
const GX = 2.45;
const GZ = 3.5;

export const HD = {
  front: 1040,
  /** The colonnade: its columns' X (each side), the rows' z, the radius; the base, shaft, capital and beam heights. */
  colX: 9.8,
  rows: [12, 19, 26],
  colR: 1.3,
  baseY: 1.05,
  shaftY: 11,
  capY: 12,
  beamY: 15.5,
  /** The coffered ceiling over the apse, the side walls, the apse's end wall. */
  ceilY: 16,
  wallX: 16,
  backZ: 57,
  /** The dais: its first step's front, each step's depth and rise, how many, its half width at the bottom and the
   * top, its back (the chasm's lip). */
  dais: { z0: 31.25, step: 0.7, rise: 0.6, n: 5, hw0: 5.9, hw1: 5.1, back: 41.5 },
  /** The thrones: the lord's and Persephone's (X, the seat's front z). */
  throne: { X: -1.6, z: 36.8 },
  queen: { X: 2.3, z: 37.0 },
  /** The chasm: its near lip, its far lip, its half width. */
  chasm: { z0: 41.75, z1: 56.4, hw: 15 },
  /** The soul-fire tripods on the dais (X, z) and their bowls' height above it; the cressets on the near columns. */
  tripods: [
    [-4.35, 35.6],
    [4.35, 35.6],
  ] as Pt[],
  tripodY: 1.8,
  cressets: [
    [-7.85, 12.3],
    [7.85, 12.3],
  ] as Pt[],
  cressetY: 4.4,
  /** The chain blocks (X, z) and where each chain goes over the chasm's lip. */
  anchors: [
    [-9.4, 33.2],
    [-11.6, 37.2],
    [9.4, 33.2],
    [11.6, 37.2],
  ] as Pt[],
  lips: [
    [-10.2, 42.1],
    [-12.6, 42.7],
    [10.2, 42.1],
    [12.6, 42.7],
  ] as Pt[],
  /** Persephone's bowl of pomegranates on its stand, at the dais's foot. */
  bowl: { X: 4.6, z: 28.4, Y: 1.45, r: 1.3 },
};
const DA = HD.dais;
/** The apse: its end wall's half width; either side of it the wall turns forward at 45 degrees to meet the side walls
 * at z APSE_Z. */
const APSE_X = 9;
const APSE_Z = HD.backZ - (HD.wallX - APSE_X);
/** The apse wall's z at X. */
const wallZ = (X: number) => (Math.abs(X) <= APSE_X ? HD.backZ : HD.backZ - (Math.abs(X) - APSE_X));
const TOP_Y = DA.rise * DA.n;
const stepZ = (i: number) => DA.z0 + DA.step * i;
const stepHW = (i: number) => DA.hw0 + ((DA.hw1 - DA.hw0) * i) / (DA.n - 1);

// ——— palettes and light ———

const HALL: Air = { color: '#140e16', far: 0.6 };
const MARBLE = { body: '#16121a', lit: '#3a3240', shade: '#08060a', vein: '#6a6070' };
const GOLD = { lit: '#ffe6a0', body: '#d8a840', shade: '#7a5418', deep: '#3a2408' };
const SOUL = { deep: '#1640c8', body: '#3a98f0', core: '#bfe8ff', glow: 0x4fb8ff };
const CHAIN = { deep: '#120a06', body: '#5a4228', lit: '#9a7a52', shade: '#3a2a1a' };
const RED = { deep: '#6a0e0a', body: '#d8401a', hot: '#ffb060', glow: 0xff4a1c };

/** The faint key from the high left (no source seen: the hall's own dark light); the chasm's glow below the floor
 * behind the dais; the soul-fires. */
const KEY: V3 = norm([-0.45, 0.75, -0.48]);
const RIFT_P: V3 = [0, -4, 47];
const FIRES: V3[] = [
  ...HD.cressets.map(([X, z]): V3 => [X, HD.cressetY + 0.5, z]),
  ...HD.tripods.map(([X, z]): V3 => [X, TOP_Y + HD.tripodY + 0.4, z]),
];

/** A surface's colour under the hall's lights: base lit by the key, the chasm and the soul-fires (n its normal). */
function lit(base: string, X: number, Y: number, z: number, n: V3, o: { key?: number; rift?: number; soul?: number; reach?: number } = {}): string {
  let c = mix(base, '#5a5468', clamp01(dot(n, KEY)) * (o.key ?? 0.25));
  const v: V3 = [RIFT_P[0] - X, RIFT_P[1] - Y, RIFT_P[2] - z];
  const d = Math.hypot(...v);
  const lam = clamp01(dot(n, [v[0] / d, v[1] / d, v[2] / d]));
  c = mix(c, '#e8401a', lam * (1 / (1 + (d / 15) ** 2)) * (o.rift ?? 0.85));
  for (const f of FIRES) {
    const w: V3 = [f[0] - X, f[1] - Y, f[2] - z];
    const dd = Math.hypot(...w);
    const l2 = clamp01(dot(n, [w[0] / dd, w[1] / dd, w[2] / dd]));
    c = mix(c, '#4fb8ff', l2 * (1 / (1 + (dd / (o.reach ?? 4.5)) ** 2)) * (o.soul ?? 0.5));
  }
  return c;
}

// ——— small helpers ———

const quad = (a: Pt, b: Pt, c: Pt, d: Pt) => polyPath([a, b, c, d]);
/** A face square to us at depth z. */
const faceAt = (X0: number, X1: number, Y0: number, Y1: number, z: number) => quad(P(X0, Y0, z), P(X1, Y0, z), P(X1, Y1, z), P(X0, Y1, z));
/** A face along z at X (a wall, a block's side). */
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
function line(ctx: Ctx, a: Pt, b: Pt, col: string, w: number): void {
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
}
/** Black marble in a path: its body colour, cloudy depth, pale veins wandering across it. */
function marble(ctx: Ctx, path: (c: Ctx) => void, col: string, b: Box, seed: number, veins = 0.35): void {
  fillPath(ctx, path, col);
  within(ctx, path, () => {
    lay(ctx, drift(shade(col, 0.3), shade(col, -0.6), 3, seed, 48, 64), b, 0.55);
    lay(ctx, noiseMask(5, seed + 7, { kind: 'web', cover: 0.2, soft: 0.04, col: MARBLE.vein, w: 90, h: 120 }), b, veins * 0.9);
    lay(ctx, noiseMask(9, seed + 11, { kind: 'web', cover: 0.14, soft: 0.03, col: '#9a90a0', w: 120, h: 160 }), b, veins * 0.45);
  });
}

/** A vein of gold through the rock, given as points on a wall (map: wall coordinates to screen): a seam that thickens
 * and thins, its gold catching the light in glints, gems set along it. */
function goldVein(ctx: Ctx, r: R, pts: Pt[], w: number, a: number, gems = 0): void {
  if (pts.length < 2) return;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // one smooth seam (a curve through the points), thickening and thinning, with hairline branches off it
  const seam = (q: Pt[], wd: number, al: number) => {
    ctx.beginPath();
    ctx.moveTo(q[0][0], q[0][1]);
    for (let i = 1; i < q.length - 1; i++) ctx.quadraticCurveTo(q[i][0], q[i][1], (q[i][0] + q[i + 1][0]) / 2, (q[i][1] + q[i + 1][1]) / 2);
    ctx.lineTo(q[q.length - 1][0], q[q.length - 1][1]);
    ctx.strokeStyle = rgba(mix(GOLD.shade, GOLD.body, 0.5), al);
    ctx.lineWidth = wd;
    ctx.stroke();
  };
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  seam(pts, w * 4, 0.05 * a);
  ctx.restore();
  seam(pts, w, 0.55 * a);
  seam(pts.slice(Math.floor(pts.length * 0.3), Math.floor(pts.length * 0.7)), w * 1.6, 0.35 * a);
  for (let b = 0; b < 3; b++) {
    const i = 1 + Math.floor(r() * (pts.length - 3));
    const [x0, y0] = pts[i];
    const dx = (r() - 0.5) * 40;
    const dy = (r() - 0.5) * 40;
    seam([[x0, y0], [x0 + dx * 0.5 + (r() - 0.5) * 8, y0 + dy * 0.5], [x0 + dx, y0 + dy]], Math.max(0.6, w * 0.5), 0.4 * a);
  }
  // a few glints where it catches the light
  for (let i = 1; i < pts.length; i += 3) {
    if (r() < 0.6) continue;
    const [x, y] = pts[i];
    ctx.fillStyle = rgba(GOLD.lit, a * (0.4 + r() * 0.4));
    ctx.fillRect(x - 0.6, y - 0.6, 1.2, 1.2);
  }
  // a gem cluster, rarely, where it swells
  for (let g = 0; g < gems; g++) {
    if (r() < 0.5) continue;
    const i = Math.floor(pts.length * (0.35 + r() * 0.3));
    gem(ctx, r, pts[i][0], pts[i][1], Math.max(2, w * 1.8), r() < 0.5 ? 'garnet' : r() < 0.6 ? 'sapphire' : 'beryl', a);
  }
}
const GEMS = {
  garnet: { deep: '#2a0408', body: '#8a1020', lit: '#ff5a6a', glint: '#ffd0d8' },
  sapphire: { deep: '#040a2a', body: '#1a3a9a', lit: '#5aa8ff', glint: '#e0f0ff' },
  beryl: { deep: '#03140e', body: '#126a4a', lit: '#4ad8a0', glint: '#d8fff0' },
};
/** A cluster of 2–4 crystals (faceted hexagonal points) in the rock: a dark socket, each face lit by its turn. */
function gem(ctx: Ctx, r: R, x: number, y: number, s: number, kind: keyof typeof GEMS, a = 1): void {
  const g = GEMS[kind];
  ctx.fillStyle = rgba('#020104', 0.7 * a);
  ctx.beginPath();
  ctx.ellipse(x, y, s * 1.2, s * 0.8, 0, 0, P2);
  ctx.fill();
  const n = 2 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const ang = -Math.PI / 2 + (r() - 0.5) * 1.6;
    const len = s * (0.8 + r() * 0.9);
    const wd = s * (0.3 + r() * 0.2);
    const bx = x + (r() - 0.5) * s;
    const by = y + (r() - 0.3) * s * 0.4;
    const tx = bx + Math.cos(ang) * len;
    const ty = by + Math.sin(ang) * len;
    const px = -Math.sin(ang) * wd;
    const py = Math.cos(ang) * wd;
    const mx = bx + Math.cos(ang) * len * 0.72;
    const my = by + Math.sin(ang) * len * 0.72;
    // two faces: the one turned to the light (left), the other in shade
    ctx.fillStyle = rgba(g.body, a);
    ctx.beginPath();
    ctx.moveTo(bx + px, by + py);
    ctx.lineTo(mx + px, my + py);
    ctx.lineTo(tx, ty);
    ctx.lineTo(mx, my);
    ctx.lineTo(bx, by);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgba(g.deep, a);
    ctx.beginPath();
    ctx.moveTo(bx - px, by - py);
    ctx.lineTo(mx - px, my - py);
    ctx.lineTo(tx, ty);
    ctx.lineTo(mx, my);
    ctx.lineTo(bx, by);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(g.lit, 0.8 * a);
    ctx.lineWidth = Math.max(0.6, s * 0.12);
    ctx.beginPath();
    ctx.moveTo(mx + px, my + py);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.fillStyle = rgba(g.glint, 0.9 * a);
    ctx.fillRect(tx - 0.6, ty + len * 0.12, 1.2, 1.2);
  }
}

// ——— the hall: its walls, the apse's end wall, the beam across the nave, the coffered ceiling ———

/** Points along a wall at X (z, Y) seen on screen. */
const onSide = (X: number) => (z: number, Y: number): Pt => P(X, Y, z);
const onBack = (X: number, Y: number): Pt => P(X, Y, HD.backZ);

/** A vein's course on a wall: a wandering line through wall coordinates from (u0, v0) to (u1, v1). */
function veinPts(r: R, u0: number, v0: number, u1: number, v1: number, n: number, wob: number, map: (u: number, v: number) => Pt): Pt[] {
  const out: Pt[] = [];
  const ph = r() * 9;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = u0 + (u1 - u0) * t + Math.sin(t * 7 + ph) * wob * 0.5;
    const v = v0 + (v1 - v0) * t + Math.sin(t * 5 + ph * 1.7) * wob + Math.sin(t * 13 + ph) * wob * 0.25;
    out.push(map(u, v));
  }
  return out;
}

export const HALL_BOX: Box = { x: 0, y: 0, w: W, h: TY };

function sideWall(ctx: Ctx, r: R, side: -1 | 1): void {
  const X = side * HD.wallX;
  const z0 = 7;
  const z1 = APSE_Z;
  const path = sideAt(X, z0, z1, 0, HD.capY);
  const b = boxOfPts([P(X, 0, z0), P(X, HD.capY, z0), P(X, 0, z1)], 2);
  const bb = { x: Math.max(0, b.x), y: Math.max(0, b.y), w: Math.min(W, b.x + b.w) - Math.max(0, b.x), h: Math.min(TY, b.y + b.h) - Math.max(0, b.y) };
  marble(ctx, path, lit(MARBLE.body, X, 4, 30, [-side, 0, 0], { key: 0.3, rift: 0.6, soul: 0.15, reach: 4 }), bb, 30 + side, 0.16);
  within(ctx, path, () => {
    // darker high up and away, the soul-fire's light near the cresset, the chasm's red at the far end
    vfill(ctx, bb.x, bb.y, bb.w, bb.h, [[0, 'rgba(2,1,4,0.85)'], [0.45, 'rgba(2,1,4,0.5)'], [1, 'rgba(2,1,4,0.35)']]);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const [cx, cy] = P(side * HD.cressets[0][0] * 1.05, HD.cressetY + 0.8, HD.cressets[0][1] + 5);
    glowAt(ctx, cx, cy, 200, '#2a78d0', 0.08, 1.3);
    const [rx, ry] = P(X, 1, HD.backZ - 6);
    glowAt(ctx, rx, ry, 160, '#c83818', 0.22, 1.2);
    ctx.restore();
    // a pilaster behind each column, on the colonnade's spacing, and a dado of bronze along its foot
    for (const z of [...HD.rows, 33, 40]) {
      const pw = 0.9;
      const face = sideAt(X, z - pw, z + pw, 0, HD.shaftY);
      fillPath(ctx, face, rgba('#000000', 0.22));
      line(ctx, P(X, 0.2, z - pw), P(X, HD.shaftY, z - pw), rgba('#c8b8d0', 0.08), 1);
      line(ctx, P(X, 0.2, z + pw), P(X, HD.shaftY, z + pw), 'rgba(0,0,0,0.45)', 1.4);
    }
    const dado = sideAt(X, z0, z1, 1.0, 1.35);
    fillPath(ctx, dado, rgba(BRZ.shade, 0.7));
    line(ctx, P(X, 1.35, z0), P(X, 1.35, z1), rgba(BRZ.lit, 0.35), 1.2);
    // veins of gold running up through the marble, gems where they swell
    for (let i = 0; i < 9; i++) {
      const za = 9 + r() * 44;
      const pts = veinPts(r, za, 0.3 + r() * 2, za + (r() - 0.5) * 9, 6 + r() * 6, 14, 0.7, onSide(X));
      goldVein(ctx, r, pts, Math.max(1.4, pz(za) * 0.09), 0.6, za < 30 ? 2 : 1);
    }
    // the joints of its courses
    for (let Y = 2.4; Y < HD.capY; Y += 2.4) line(ctx, P(X, Y, z0), P(X, Y, z1), 'rgba(0,0,0,0.35)', 1);
  });
}

/** A point on the apse's wall: u runs along it from the left side wall (-1) through the end (0) to the right (+1). */
const onApse = (u: number, Y: number): Pt => {
  const L = HD.wallX - APSE_X;
  const s = Math.sign(u) || 1;
  const a = Math.abs(u);
  // the end wall takes the middle half of u, the turned walls the outer quarters
  if (a <= 0.5) return P(u * 2 * APSE_X, Y, HD.backZ);
  const t = (a - 0.5) * 2;
  return P(s * (APSE_X + L * t), Y, HD.backZ - L * t);
};

/** A cypress carved in relief in a niche (the tree of the dead): a flame of foliage in tiers of scale-like leaves,
 * lit red along its lower left by the chasm. */
function cypress(ctx: Ctx, r: R, nb: Box): void {
  const cx = nb.x + nb.w / 2;
  const top = nb.y + nb.h * 0.06;
  const foot = nb.y + nb.h * 0.94;
  const wd = nb.w * 0.36;
  const crown = foot - (foot - top) * 0.12;
  const tree = (c: Ctx) => {
    c.beginPath();
    c.moveTo(cx, top);
    c.bezierCurveTo(cx + wd * 0.7, top + (foot - top) * 0.25, cx + wd * 1.1, top + (foot - top) * 0.62, cx + wd * 0.5, crown);
    c.lineTo(cx + wd * 0.12, crown);
    c.lineTo(cx + wd * 0.12, foot);
    c.lineTo(cx - wd * 0.12, foot);
    c.lineTo(cx - wd * 0.12, crown);
    c.lineTo(cx - wd * 0.5, crown);
    c.bezierCurveTo(cx - wd * 1.1, top + (foot - top) * 0.62, cx - wd * 0.7, top + (foot - top) * 0.25, cx, top);
    c.closePath();
  };
  castShadow(ctx, tree, 2.5, 2, 0.6, '#000000');
  fillPath(ctx, tree, lin(ctx, [nb.x, 0], [nb.x + nb.w, 0], [[0, '#2a1e1e'], [0.5, '#16100e'], [1, '#0a0606']]));
  within(ctx, tree, () => {
    // its foliage: small scale-like sprays in rows, each lit on its upper left, dark under
    const ls = Math.max(2.2, nb.w * 0.07);
    let row = 0;
    for (let y = top + ls; y < crown; y += ls * 0.8, row++) {
      for (let x = cx - wd * 1.1 + (row % 2) * ls * 0.6; x < cx + wd * 1.1; x += ls * 1.2) {
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath();
        ctx.ellipse(x + 0.6, y + 0.8, ls * 0.6, ls * 0.42, 0.3, 0, P2);
        ctx.fill();
        ctx.fillStyle = rgba(r() < 0.5 ? '#3a2c26' : '#2e221e', 0.9);
        ctx.beginPath();
        ctx.ellipse(x, y, ls * 0.55, ls * 0.38, 0.3, 0, P2);
        ctx.fill();
        ctx.fillStyle = rgba('#ff7a4a', 0.12);
        ctx.fillRect(x - ls * 0.3, y - ls * 0.25, ls * 0.4, 0.8);
      }
    }
    vfill(ctx, nb.x, nb.y, nb.w, nb.h, [[0, 'rgba(0,0,0,0.25)'], [0.65, rgba('#ff5a2a', 0.05)], [1, rgba('#ff5a2a', 0.28)]]);
  });
  strokePath(ctx, tree, rgba('#ff7040', 0.22), 0.8);
}

/** The apse: black marble seamed with gold, the end wall flat behind the thrones and turned forward either side to
 * meet the side walls; tall niches with cypresses in the turned walls; pilasters at its corners; the great roundel
 * high on the end wall, above the thrones. */
function backWall(ctx: Ctx, r: R): void {
  const z = HD.backZ;
  const k = pz(z);
  const L = HD.wallX - APSE_X;
  const faces: { path: (c: Ctx) => void; n: V3; X: number; zc: number; s: number }[] = [
    { path: faceAt(-APSE_X, APSE_X, 0, HD.ceilY, z), n: [0, 0, -1], X: 0, zc: z, s: 0 },
    ...([-1, 1] as const).map((s) => ({ path: quad(P(s * APSE_X, 0, z), P(s * HD.wallX, 0, APSE_Z), P(s * HD.wallX, HD.ceilY, APSE_Z), P(s * APSE_X, HD.ceilY, z)), n: norm([-s, 0, -1]) as V3, X: s * (APSE_X + L / 2), zc: z - L / 2, s })),
  ];
  const all = boxOfPts([P(-HD.wallX, HD.ceilY, APSE_Z), P(HD.wallX, 0, APSE_Z)], 0);
  for (const f of faces) {
    const fb = boxOfPts(f.s === 0 ? [P(-APSE_X, HD.ceilY, z), P(APSE_X, 0, z)] : [P(f.s * APSE_X, HD.ceilY, z), P(f.s * HD.wallX, 0, APSE_Z), P(f.s * HD.wallX, HD.ceilY, APSE_Z)], 0);
    marble(ctx, f.path, lit(MARBLE.body, f.X, 6, f.zc, f.n, { key: 0.25, rift: 0.6, soul: 0.2, reach: 5 }), fb, 51 + f.s, 0.22);
    within(ctx, f.path, () => {
      // the chasm's glow climbing it from below, fading into the dark above; the turned walls a little darker
      vfill(ctx, all.x, all.y, all.w, all.h, [[0, 'rgba(2,1,4,0.85)'], [0.35, 'rgba(2,1,4,0.45)'], [0.7, 'rgba(2,1,4,0.05)'], [1, 'rgba(0,0,0,0)']]);
      if (f.s) {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(fb.x, fb.y, fb.w, fb.h);
      }
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      softly(ctx, fb, (q) => {
        const g = q.createLinearGradient(0, fb.y + fb.h, 0, fb.y);
        g.addColorStop(0, rgba('#ff5a24', 0.55));
        g.addColorStop(0.18, rgba('#d83a18', 0.3));
        g.addColorStop(0.5, rgba('#8a1a10', 0.1));
        g.addColorStop(1, rgba('#4a0a08', 0));
        q.fillStyle = g;
        q.fillRect(fb.x, fb.y, fb.w, fb.h);
      }, 0.25, 'lighter');
      ctx.restore();
      // its courses
      const u0 = f.s === 0 ? -0.5 : f.s < 0 ? -1 : 0.5;
      const u1 = f.s === 0 ? 0.5 : f.s < 0 ? -0.5 : 1;
      for (let Y = 2; Y < HD.ceilY; Y += 2) line(ctx, onApse(u0, Y), onApse(u1, Y), 'rgba(0,0,0,0.3)', 1);
      // veins of gold through it, gems here and there along them
      for (let i = 0; i < (f.s ? 3 : 4); i++) {
        const ua = u0 + (u1 - u0) * (0.1 + r() * 0.8);
        const pts = veinPts(r, ua * 20, 0.5 + r() * 3, (ua + (r() - 0.5) * 0.12) * 20, 6 + r() * 8, 14, 0.5, (u, v) => onApse(Math.max(u0, Math.min(u1, u / 20)), v));
        goldVein(ctx, r, pts, Math.max(1, k * 0.05), 0.65, 1);
      }
    });
    strokePath(ctx, f.path, 'rgba(2,1,4,0.8)', 1);
  }
  // the niches in the turned walls, each with its cypress, a bronze lunette over it
  for (const s of [-1, 1] as const) {
    const ua = s * 0.62;
    const ub = s * 0.88;
    const corners = [onApse(ua, 10.4), onApse(ub, 10.4), onApse(ub, 1.6), onApse(ua, 1.6)];
    const niche = polyPath(corners);
    const nb = boxOfPts(corners, 0);
    fillPath(ctx, niche, 'rgba(0,0,0,0.45)');
    within(ctx, niche, () => {
      vfill(ctx, nb.x, nb.y, nb.w, nb.h, [[0, 'rgba(0,0,0,0.4)'], [0.7, rgba('#8a2010', 0.08)], [1, rgba('#d84a20', 0.22)]]);
      cypress(ctx, r, { x: nb.x + 2, y: nb.y + 4, w: nb.w - 4, h: nb.h - 4 });
    });
    line(ctx, corners[0], corners[1], 'rgba(0,0,0,0.7)', 2.2);
    line(ctx, corners[3], corners[2], rgba('#ff7a4a', 0.35), 1.2);
    const [hx0, hy0] = corners[s < 0 ? 1 : 0];
    const [hx1, hy1] = corners[s < 0 ? 0 : 1];
    const hr = (hx1 - hx0) / 2;
    const hy = (hy0 + hy1) / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.moveTo(hx0, hy0);
    ctx.ellipse(hx0 + hr, hy, hr, hr * 1.1, 0, Math.PI, 0);
    ctx.lineTo(hx1, hy1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(BRZ.body, 0.5);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(hx0 + hr, hy, hr, hr * 1.1, 0, Math.PI, 0);
    ctx.stroke();
  }
  // pilasters where the end wall turns, bronze capitals on them
  for (const s of [-1, 1] as const) {
    const X = s * APSE_X;
    const pw = 0.8;
    const zp = z - 0.5;
    const pf = faceAt(X - pw, X + pw, 0, HD.shaftY, zp);
    const pb = boxOfPts([P(X - pw, HD.shaftY, zp), P(X + pw, 0, zp)], 0);
    marble(ctx, pf, lit(MARBLE.body, X, 5, zp, [0, 0, -1], { key: 0.25, rift: 0.7, soul: 0.3 }), pb, 60 + s, 0.2);
    within(ctx, pf, () => {
      vfill(ctx, pb.x, pb.y, pb.w, pb.h, [[0, 'rgba(2,1,4,0.7)'], [0.6, 'rgba(2,1,4,0.15)'], [1, rgba('#ff5a2a', 0.12)]]);
      ctx.fillStyle = lin(ctx, [pb.x, 0], [pb.x + pb.w, 0], [[0, rgba('#c8a8b0', 0.1)], [0.4, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.35)']]);
      ctx.fillRect(pb.x, pb.y, pb.w, pb.h);
      for (let i = 1; i < 5; i++) line(ctx, [pb.x + (pb.w * i) / 5, pb.y + 4], [pb.x + (pb.w * i) / 5, pb.y + pb.h - 6], 'rgba(0,0,0,0.4)', 1);
    });
    strokePath(ctx, pf, 'rgba(2,1,4,0.85)', 1);
    const cap = faceAt(X - pw * 1.35, X + pw * 1.35, HD.shaftY, HD.capY, zp - 0.1);
    const cb = boxOfPts([P(X - pw * 1.35, HD.capY, zp - 0.1), P(X + pw * 1.35, HD.shaftY, zp - 0.1)], 0);
    solid(ctx, cap, cb, BRONZE_M, lit(BRZ.shade, X, HD.shaftY, zp, [0, -0.3, -1], { rift: 0.6 }), { depth: 0.3, air: HALL, line: 1, formSize: 4 });
    line(ctx, [cb.x, cb.y + cb.h - 1], [cb.x + cb.w, cb.y + cb.h - 1], rgba('#ff8a50', 0.35), 1);
  }
  // the roundel, high on the end wall over the thrones: a black sun, a disc of obsidian in a bronze ring with bronze
  // rays standing out round it, held to the wall by four clamps; the bident in the middle, a cold light inlaid in it
  const [rx, ry] = onBack(0, 13.2);
  const rr = 2.0 * k;
  const rays = (c: Ctx) => {
    c.beginPath();
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * P2 - Math.PI / 2;
      const long = i % 2 === 0;
      const r1 = rr * (long ? 1.42 : 1.22);
      const wa = long ? 0.07 : 0.05;
      c.moveTo(rx + Math.cos(a - wa) * rr * 0.95, ry + Math.sin(a - wa) * rr * 0.95);
      c.lineTo(rx + Math.cos(a) * r1, ry + Math.sin(a) * r1);
      c.lineTo(rx + Math.cos(a + wa) * rr * 0.95, ry + Math.sin(a + wa) * rr * 0.95);
      c.closePath();
    }
  };
  castShadow(ctx, rays, 4, 3, 0.7, '#000000');
  solid(ctx, rays, { x: rx - rr * 1.45, y: ry - rr * 1.45, w: rr * 2.9, h: rr * 2.9 }, BRONZE_M, BRZ.shade, { depth: 0.5, air: HALL, line: 1, formSize: 8 });
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba('#ff6a30', 0.3);
  ctx.lineWidth = 1;
  rays(ctx);
  ctx.stroke();
  ctx.restore();
  const ring = (c: Ctx) => {
    c.beginPath();
    c.arc(rx, ry, rr, 0, P2);
    c.arc(rx, ry, rr * 0.82, 0, P2, true);
  };
  castShadow(ctx, ring, 4, 3, 0.6, '#000000');
  solid(ctx, ring, { x: rx - rr, y: ry - rr, w: rr * 2, h: rr * 2 }, BRONZE_M, mix(BRZ.shade, BRZ.body, 0.5), { depth: 0.5, air: HALL, line: 1.2, formSize: 10 });
  const disc = (c: Ctx) => {
    c.beginPath();
    c.arc(rx, ry, rr * 0.82, 0, P2);
  };
  const dg = ctx.createRadialGradient(rx - rr * 0.3, ry - rr * 0.35, 1, rx, ry, rr * 0.82);
  dg.addColorStop(0, '#24202c');
  dg.addColorStop(0.5, '#0a080e');
  dg.addColorStop(1, '#030205');
  fillPath(ctx, disc, dg);
  within(ctx, disc, () => {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glowAt(ctx, rx, ry, rr * 0.55, '#2a78d0', 0.25);
    ctx.restore();
    ctx.fillStyle = rgba('#c8c0e0', 0.1);
    ctx.beginPath();
    ctx.ellipse(rx - rr * 0.35, ry - rr * 0.4, rr * 0.3, rr * 0.12, -0.6, 0, P2);
    ctx.fill();
  });
  // the clamps
  for (const a of [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75]) {
    const cx = rx + Math.cos(a) * rr * 0.92;
    const cy = ry + Math.sin(a) * rr * 0.92;
    const cl = polyPath([[cx - 3, cy - 3], [cx + 3, cy - 3], [cx + 3, cy + 3], [cx - 3, cy + 3]]);
    solid(ctx, cl, { x: cx - 3, y: cy - 3, w: 6, h: 6 }, BRONZE_M, BRZ.deep, { depth: 0.5, air: HALL, line: 1, formSize: 2 });
  }
  // the bident in it, bronze, the cold line of light down its shaft
  const bk = k;
  const shaft = polyPath([[rx - bk * 0.08, ry - rr * 0.45], [rx + bk * 0.08, ry - rr * 0.45], [rx + bk * 0.08, ry + rr * 0.7], [rx - bk * 0.08, ry + rr * 0.7]]);
  const fork = (c: Ctx) => {
    const w = rr * 0.32;
    const yb = ry - rr * 0.32;
    c.beginPath();
    c.moveTo(rx - w - bk * 0.08, ry - rr * 0.62);
    c.lineTo(rx - w + bk * 0.08, ry - rr * 0.62);
    c.lineTo(rx - w + bk * 0.08, yb - bk * 0.15);
    c.quadraticCurveTo(rx, yb + bk * 0.25, rx + w - bk * 0.08, yb - bk * 0.15);
    c.lineTo(rx + w - bk * 0.08, ry - rr * 0.62);
    c.lineTo(rx + w + bk * 0.08, ry - rr * 0.62);
    c.lineTo(rx + w + bk * 0.08, yb);
    c.quadraticCurveTo(rx, yb + bk * 0.5, rx - w - bk * 0.08, yb);
    c.closePath();
  };
  for (const pth of [shaft, fork]) {
    castShadow(ctx, pth, 2, 1.5, 0.6, '#000000');
    solid(ctx, pth, { x: rx - rr * 0.5, y: ry - rr * 0.7, w: rr, h: rr * 1.4 }, BRONZE_M, BRZ.body, { depth: 0.5, air: HALL, line: 1, formSize: 5 });
  }
  line(ctx, [rx, ry - rr * 0.4], [rx, ry + rr * 0.65], rgba('#7fd0ff', 0.45), 1);
}

/** The ceiling over the apse: coffers on the hall's grid, deep in the dark, their far faces catching the chasm's red. */
function ceiling(ctx: Ctx): void {
  const Y = HD.ceilY;
  const zA = 30;
  const zB = HD.backZ;
  const X = HD.wallX;
  const path = topAt(-X, X, zA, zB, Y);
  fillPath(ctx, path, '#07050a');
  within(ctx, path, () => {
    const [, y0] = P(0, Y, zB);
    vfill(ctx, 0, 0, W, y0 + 2, [[0, '#040306'], [0.6, '#0a070c'], [1, '#1a0c0e']]);
    // the coffers: one per GZ deep, nine across, each a recess with stepped frames, its far face lit
    const nx = 9;
    const cw = (X * 2) / nx;
    for (let zi = zB; zi > zA; zi -= GZ) {
      const z0 = zi - GZ;
      for (let i = 0; i < nx; i++) {
        const xa = -X + i * cw;
        const xb = xa + cw;
        const ins = 0.38;
        // the recess's far face (turned towards us and the chasm): a lit strip
        const far = quad(P(xa + ins, Y, zi - ins), P(xb - ins, Y, zi - ins), P(xb - ins * 1.8, Y + 0.6, zi - ins * 1.8), P(xa + ins * 1.8, Y + 0.6, zi - ins * 1.8));
        const t = clamp01((zi - 36) / 22);
        fillPath(ctx, far, rgba(mix('#1a0a0c', '#6a2014', t), 0.2 + t * 0.25));
        // its frame: the beams between coffers, dark, a lit lip on their near edge
        line(ctx, P(xa, Y, z0), P(xa, Y, zi), 'rgba(0,0,0,0.75)', 1.4);
        line(ctx, P(xa, Y, zi), P(xb, Y, zi), 'rgba(0,0,0,0.75)', 1.4);
        line(ctx, P(xa, Y, z0 + 0.15), P(xb, Y, z0 + 0.15), rgba('#ff6a3a', 0.08 + t * 0.12), 1);
        // a bronze rosette in the middle
        const [cx, cy] = P((xa + xb) / 2, Y + 0.6, zi - GZ / 2);
        ctx.fillStyle = rgba(BRZ.body, 0.25 + t * 0.25);
        ctx.beginPath();
        ctx.ellipse(cx, cy, pz(zi) * 0.28, pz(zi) * 0.07, 0, 0, P2);
        ctx.fill();
      }
    }
    // the dark swallows it towards us
    vfill(ctx, 0, 0, W, y0, [[0, 'rgba(2,1,4,0.92)'], [0.7, 'rgba(2,1,4,0.6)'], [1, 'rgba(2,1,4,0.25)']]);
  });
}

/** The beam across the nave where the colonnade ends (resting on the third columns), and the colonnades' beams: their
 * faces and soffits, a bronze key-pattern band on the shared spacing. */
function beams(ctx: Ctx): void {
  const zc = HD.rows[2];
  const half = HD.colR * 1.25;
  const Y0 = HD.capY;
  const Y1 = HD.beamY + 1.5;
  // the colonnades' beams, over each row: their soffits and inner faces
  for (const s of [-1, 1] as const) {
    const xi = s * (HD.colX - half);
    const xo = s * (HD.colX + half);
    const sof = topAt(xi, xo, 6, zc + half, Y0);
    fillPath(ctx, sof, '#0a070c');
    const face = sideAt(xi, 6, zc - half, Y0, Y1);
    fillPath(ctx, face, '#0c0a10');
    within(ctx, face, () => {
      const fb = boxOfPts([P(xi, Y0, zc), P(xi, Y0, 9), P(xi, Y1, zc)], 0);
      vfill(ctx, fb.x, fb.y, fb.w, fb.h, [[0, 'rgba(0,0,0,0.6)'], [1, 'rgba(60,20,20,0.2)']]);
      // its bronze band, and the triglyphs over the columns and between them
      line(ctx, P(xi, Y0 + 1.1, 6), P(xi, Y0 + 1.1, zc), rgba(BRZ.body, 0.35), 2);
      for (let z = 12; z < zc; z += GZ) {
        const tq = sideAt(xi, z - 0.4, z + 0.4, Y0 + 1.8, Y0 + 3.2);
        fillPath(ctx, tq, 'rgba(0,0,0,0.45)');
      }
    });
  }
  // the transverse beam: its soffit seen from below, its face
  const xa = -HD.colX - half;
  const xb = HD.colX + half;
  const sof = topAt(xa, xb, zc - half, zc + half, Y0);
  const sb = boxOfPts([P(xa, Y0, zc - half), P(xb, Y0, zc + half)], 0);
  fillPath(ctx, sof, '#0a0709');
  within(ctx, sof, () => {
    vfill(ctx, sb.x, sb.y, sb.w, sb.h, [[0, 'rgba(0,0,0,0.5)'], [1, rgba('#c83a1c', 0.22)]]);
    // its coffers: sunk panels on the grid, the far edge of each catching the red from the apse
    for (let X = -HD.colX + GX / 2; X < HD.colX - GX / 2 + 0.01; X += GX) {
      const pnl = topAt(X - GX * 0.38, X + GX * 0.38, zc - half * 0.6, zc + half * 0.6, Y0);
      fillPath(ctx, pnl, 'rgba(0,0,0,0.45)');
      line(ctx, P(X - GX * 0.38, Y0, zc + half * 0.6), P(X + GX * 0.38, Y0, zc + half * 0.6), rgba('#ff6a3a', 0.25), 1);
    }
  });
  const face = faceAt(xa, xb, Y0, Y1, zc - half);
  const fb = boxOfPts([P(xa, Y1, zc - half), P(xb, Y0, zc - half)], 0);
  marble(ctx, face, '#100c12', { x: fb.x, y: Math.max(0, fb.y), w: fb.w, h: fb.y + fb.h - Math.max(0, fb.y) }, 71, 0.22);
  within(ctx, face, () => {
    vfill(ctx, fb.x, Math.max(0, fb.y), fb.w, fb.y + fb.h - Math.max(0, fb.y), [[0, 'rgba(0,0,0,0.6)'], [1, 'rgba(0,0,0,0.15)']]);
    // the architrave's fasciae and the bronze band of key pattern, one unit per grid slab, centred on each
    const z = zc - half;
    const k = pz(z);
    for (const Yf of [Y0 + 0.45, Y0 + 0.95]) {
      line(ctx, P(xa, Yf, z), P(xb, Yf, z), 'rgba(0,0,0,0.6)', 1.4);
      line(ctx, P(xa, Yf - 0.04, z), P(xb, Yf - 0.04, z), rgba('#c8b0c0', 0.1), 1);
    }
    const [, by0] = P(0, Y0 + 1.75, z);
    const [, by1] = P(0, Y0 + 1.2, z);
    ctx.fillStyle = lin(ctx, [0, by0], [0, by1], [[0, BRZ.body], [0.5, BRZ.shade], [1, BRZ.deep]]);
    ctx.fillRect(fb.x, by0, fb.w, by1 - by0);
    const u = (GX / 2) * k;
    const kh = (by1 - by0) * 0.6;
    const cy = (by0 + by1) / 2;
    ctx.lineJoin = 'miter';
    for (let x0 = 960 - u * Math.ceil(960 / u) - u * 0.5; x0 < W; x0 += u) {
      const draw = (dx: number, dy: number, col: string, lw: number) => {
        ctx.strokeStyle = col;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(x0 + dx, cy + kh / 2 + dy);
        ctx.lineTo(x0 + dx, cy - kh / 2 + dy);
        ctx.lineTo(x0 + u * 0.75 + dx, cy - kh / 2 + dy);
        ctx.lineTo(x0 + u * 0.75 + dx, cy + kh * 0.25 + dy);
        ctx.lineTo(x0 + u * 0.3 + dx, cy + kh * 0.25 + dy);
        ctx.lineTo(x0 + u * 0.3 + dx, cy - kh * 0.1 + dy);
        ctx.moveTo(x0 + dx, cy + kh / 2 + dy);
        ctx.lineTo(x0 + u + dx, cy + kh / 2 + dy);
        ctx.stroke();
      };
      draw(0.8, 1, 'rgba(10,4,2,0.8)', 2.4);
      draw(0, 0, rgba(BRZ.lit, 0.55), 1.4);
    }
    line(ctx, [fb.x, by1 + 1], [fb.x + fb.w, by1 + 1], rgba('#ff7a4a', 0.2), 1);
  });
  // its foot: the edge where the soffit turns into the face, lit from the apse behind
  line(ctx, P(xa, Y0, zc - half), P(xb, Y0, zc - half), rgba('#ff8a5a', 0.25), 1.2);
}

function hall(ctx: Ctx, r: R): void {
  // the dark of the hall behind everything
  vfill(ctx, 0, 0, W, TY, [[0, '#030205'], [0.5, '#0a070c'], [1, '#0e0a10']]);
  ceiling(ctx);
  backWall(ctx, r);
  sideWall(ctx, r, -1);
  sideWall(ctx, r, 1);
  // the aisles' ceilings at the capitals' height, over the side walls
  for (const s of [-1, 1] as const) {
    const ac = topAt(s * HD.colX, s * HD.wallX, 6, HD.rows[2] + 2, HD.capY);
    fillPath(ctx, ac, '#060408');
  }
  // a third pair of columns, engaged in the apse's turned walls, rising out of the chasm (their feet down in it): hazy
  for (const s of [-1, 1] as const) column(ctx, r, s * 10.6, wallZ(10.6) - 1.1, HD.colR, 760 + s, { base: false });
  beams(ctx);
  // smoke hanging in the apse, lit red from below
  haze(ctx, 200, 470, '#4a1612', 0.35, 0.8, 560, 1360);
}

// ——— the floor: polished black marble on the hall's grid, mirroring what stands on it ———

export const FLOOR_BOX: Box = { x: 0, y: 440, w: W, h: TY - 440 };

/** The near and far lips of the chasm (X at the lip's z): jagged, the floor's slabs broken off along it. */
const lipZ = (X: number, far: boolean): number => {
  const t = X / HD.chasm.hw;
  const bow = (1 - t * t) * (far ? 0.6 : -0.9);
  const jag = Math.sin(X * 3.1 + (far ? 2 : 0)) * 0.22 + Math.sin(X * 7.3 + 1) * 0.12 + (Math.floor(X * 1.7) % 2 ? 0.1 : -0.06);
  return (far ? HD.chasm.z1 : HD.chasm.z0) + bow + jag;
};
const lipPts = (far: boolean): Pt[] => {
  const out: Pt[] = [];
  const hw = HD.chasm.hw;
  for (let X = -hw; X <= hw + 0.001; X += 0.25) {
    // the ends pinch together
    const t = Math.abs(X) / hw;
    const zz = lipZ(X, far);
    const mid = (HD.chasm.z0 + HD.chasm.z1) / 2;
    out.push(P(X, 0, Math.min(wallZ(X) - 0.25, mid + (zz - mid) * Math.sqrt(Math.max(0, 1 - t ** 6)))));
  }
  return out;
};

function floor(ctx: Ctx, r: R): void {
  const b = FLOOR_BOX;
  const zN = 13;
  const zF = HD.backZ;
  const X = HD.wallX;
  const fl = polyPath([P(-X, 0, zN), P(X, 0, zN), P(X, 0, APSE_Z), P(APSE_X, 0, zF), P(-APSE_X, 0, zF), P(-X, 0, APSE_Z)]);
  fillPath(ctx, fl, '#0e0b12');
  within(ctx, fl, () => {
    vfill(ctx, 0, b.y, W, b.h, [[0, '#1a1018'], [0.12, '#120c14'], [0.5, '#0c0a10'], [1, '#100c14']]);
    surface(ctx, r, b, '#0e0b12', { over: true, vary: 0.3, cells: 4, mottle: 0.2, strokes: 0.03, strokeAng: 0, strokeLen: 300, strokeW: 3, grain: 0.03, grainKind: 'grain', warm: '#24141a', cool: '#0a0c18', seed: 21 });
    // each slab its own stone: a little lighter or darker, a vein or two crossing it
    for (let z = 10.25; z < zF; z += GZ) {
      for (let Xs = -X; Xs < X; Xs += GX) {
        const x0 = Math.round(Xs / GX - 0.5) * GX + GX / 2;
        void x0;
        const xa = Xs;
        const xb = Xs + GX;
        const s = quad(P(xa, 0, z), P(xb, 0, z), P(xb, 0, z + GZ), P(xa, 0, z + GZ));
        const v = r();
        fillPath(ctx, s, v < 0.5 ? rgba('#000000', 0.08 + v * 0.12) : rgba('#3a3040', (v - 0.5) * 0.12));
        // a vein across it, in perspective
        if (r() < 0.75) {
          const za = z + r() * GZ;
          const zb = z + r() * GZ;
          const ph = r() * 6;
          ctx.strokeStyle = rgba('#8a8098', 0.05 + r() * 0.07);
          ctx.lineWidth = Math.max(0.6, pz(z) * 0.02);
          ctx.beginPath();
          for (let i = 0; i <= 10; i++) {
            const t = i / 10;
            const [px, py] = P(xa + GX * t, 0, za + (zb - za) * t + Math.sin(t * 5 + ph) * 0.25);
            if (i) ctx.lineTo(px, py);
            else ctx.moveTo(px, py);
          }
          ctx.stroke();
        }
      }
    }
    // the joints: centred so each column stands in the middle of its slab
    for (let Xj = -X - GX / 2; Xj <= X + GX / 2; Xj += GX) {
      line(ctx, P(Xj, 0, zN), P(Xj, 0, zF), 'rgba(0,0,0,0.55)', 1.2);
      line(ctx, P(Xj + 0.04, 0, zN), P(Xj + 0.04, 0, zF), rgba('#a098c0', 0.05), 1);
    }
    for (let z = 10.25; z < zF; z += GZ) {
      line(ctx, P(-X, 0, z), P(X, 0, z), 'rgba(0,0,0,0.55)', Math.max(1, pz(z) * 0.03));
      line(ctx, P(-X, 0, z - 0.05), P(X, 0, z - 0.05), rgba('#a098c0', 0.05), 1);
    }
    // the polish: at a grazing angle the far floor mirrors the end wall's red, the near floor is dark glass
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const [, yb] = P(0, 0, zF);
    vfill(ctx, 0, yb, W, 120, [[0, rgba('#c83a1c', 0.3)], [0.4, rgba('#8a2414', 0.1)], [1, rgba('#4a1410', 0)]]);
    // the chasm's glow mirrored down the floor either side of the dais, broken by the joints
    for (const s of [-1, 1] as const) {
      const [lx] = P(s * 10.6, 0, HD.chasm.z0);
      softly(ctx, { x: lx - 120, y: 480, w: 240, h: 260 }, (q) => {
        const g = q.createLinearGradient(0, 488, 0, 740);
        g.addColorStop(0, rgba('#ff5a24', 0.4));
        g.addColorStop(0.25, rgba('#c83a18', 0.16));
        g.addColorStop(1, rgba('#6a1a10', 0));
        q.fillStyle = g;
        q.beginPath();
        q.moveTo(lx - 50, 488);
        q.lineTo(lx + 50, 488);
        q.lineTo(lx + 95 + s * 30, 740);
        q.lineTo(lx - 95 + s * 30, 740);
        q.closePath();
        q.fill();
      }, 0.1, 'lighter');
    }
    // the soul-fires mirrored: a long streak under each tripod, a broad cold sheen under the cressets
    for (const [Xf, zf] of HD.tripods) {
      const [fx] = P(Xf, 0, zf);
      const yr = sy(-(TOP_Y + HD.tripodY + 0.4), zf);
      softly(ctx, { x: fx - 60, y: yr - 80, w: 120, h: 220 }, (q) => {
        const g = q.createRadialGradient(fx, yr, 0, fx, yr, 90);
        g.addColorStop(0, rgba('#6ac8ff', 0.4));
        g.addColorStop(0.4, rgba('#3a88e0', 0.14));
        g.addColorStop(1, rgba('#1a40a0', 0));
        q.fillStyle = g;
        q.save();
        q.translate(fx, yr);
        q.scale(0.3, 1.2);
        q.translate(-fx, -yr);
        q.fillRect(fx - 90, yr - 90, 180, 180);
        q.restore();
      }, 0.15, 'lighter');
    }
    for (const [Xf, zf] of HD.cressets) {
      const [fx] = P(Xf, 0, zf + 4);
      lightPool(ctx, fx, 700, 230, 80, '#2a70d0', 0.3);
    }
    ctx.restore();
    // the light pooled on the floor at the chasm's lip, and the lip's dark edge over it
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const s of [-1, 1] as const) {
      const [lx, ly] = P(s * 10.5, 0, HD.chasm.z0 - 0.6);
      lightPool(ctx, lx, ly + 6, 150, 22, '#ff5a24', 0.45);
    }
    ctx.restore();
    // the columns' and the dais's shadows thrown towards us by the chasm's light behind them, long and soft
    for (const s of [-1, 1] as const) {
      for (const z of HD.rows) {
        const Xc = s * HD.colX;
        const d = [Xc - RIFT_P[0], z - RIFT_P[2]];
        const l = Math.hypot(d[0], d[1]);
        const ux = d[0] / l;
        const uz = d[1] / l;
        const wd = HD.colR * 0.9;
        const len = 9;
        const sh = quad(P(Xc - uz * wd, 0, z + ux * wd), P(Xc + uz * wd, 0, z - ux * wd), P(Xc + uz * wd * 2 + ux * len, 0, z - ux * wd * 2 + uz * len), P(Xc - uz * wd * 2 + ux * len, 0, z + ux * wd * 2 + uz * len));
        const sb = boxOfPts([P(Xc, 0, z), P(Xc + ux * len, 0, z + uz * len)], 60);
        softly(ctx, sb, (q) => fillPath(q, sh, 'rgba(0,0,0,0.4)'), 0.15);
      }
    }
    const dsh = quad(P(-DA.hw0, 0, DA.z0), P(DA.hw0, 0, DA.z0), P(DA.hw0 * 1.6, 0, DA.z0 - 9), P(-DA.hw0 * 1.6, 0, DA.z0 - 9));
    softly(ctx, { x: 560, y: 520, w: 800, h: 240 }, (q) => fillPath(q, dsh, 'rgba(0,0,0,0.35)'), 0.15);
    // the floor mirrors the columns standing on it: each one's base and shaft upside down under it, fading
    for (const s of [-1, 1] as const) {
      for (const z of HD.rows) {
        const Xc = s * HD.colX;
        const k = pz(z);
        const [cx, cy] = P(Xc, 0, z);
        if (cy > TY) continue;
        const rr = HD.colR * k;
        const len = k * 3.2;
        softly(ctx, { x: cx - rr * 1.6, y: cy, w: rr * 3.2, h: len }, (q) => {
          const g = q.createLinearGradient(cx - rr, 0, cx + rr, 0);
          g.addColorStop(0, rgba('#1a1420', 0));
          g.addColorStop(0.3, rgba('#2a2230', 0.5));
          g.addColorStop(0.5 - s * 0.3, rgba('#4a2a30', 0.55));
          g.addColorStop(1, rgba('#1a1420', 0));
          q.fillStyle = g;
          q.fillRect(cx - rr, cy + k * 0.5, rr * 2, len - k * 0.5);
          q.fillStyle = rgba(BRZ.shade, 0.5);
          q.fillRect(cx - rr * 1.2, cy, rr * 2.4, k * 0.5);
          q.globalCompositeOperation = 'destination-in';
          const fg = q.createLinearGradient(0, cy, 0, cy + len);
          fg.addColorStop(0, 'rgba(0,0,0,1)');
          fg.addColorStop(1, 'rgba(0,0,0,0)');
          q.fillStyle = fg;
          q.fillRect(cx - rr * 1.6, cy, rr * 3.2, len);
        }, 0.35);
      }
    }
    // cracks running back from the chasm through the slabs near it (dark, not glowing)
    for (const s of [-1, 1] as const) {
      for (let i = 0; i < 3; i++) {
        const [cx, cy] = P(s * (7.5 + r() * 5), 0, HD.chasm.z0 - 0.3);
        crack(ctx, r, cx, cy, Math.PI / 2 + (r() - 0.5) * 1.2, 30 + r() * 40, { col: '#020103', lip: '#ff6a3a', w: 1, a: 0.5 });
      }
    }
  });
  // where the floor meets the walls
  for (const s of [-1, 1] as const) {
    const [ax, ay] = P(s * HD.wallX, 0, 14);
    const [bx, by] = P(s * HD.wallX, 0, APSE_Z);
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
  }
  const [bx0, by] = P(-APSE_X, 0, HD.backZ);
  const [bx1] = P(APSE_X, 0, HD.backZ);
  crevice(ctx, bx0, bx1, by, 6, 0.6, '#000000');
}

// ——— the chasm ———

const CHASM_PATH = (): ((c: Ctx) => void) => {
  const near = lipPts(false);
  const far = lipPts(true);
  return polyPath([...far, ...near.reverse()]);
};
export const CHASM_BOX: Box = (() => boxOfPts([...lipPts(false), ...lipPts(true)], 12))();

/** The far wall of the chasm: columnar basalt dropping away, lit red and orange from the fires far below; smoke in
 * it; the floor's broken lip along its near edge. */
function chasm(ctx: Ctx, r: R): void {
  const path = CHASM_PATH();
  const b = CHASM_BOX;
  fillPath(ctx, path, '#1a0806');
  within(ctx, path, () => {
    // the far wall, top to bottom: dark rock at the far lip, brighter down into the heat
    vfill(ctx, b.x, b.y, b.w, b.h, [[0, '#0c0406'], [0.35, '#1e0808'], [0.7, '#4a1008'], [0.9, '#a02a10'], [1, '#e85a20']]);
    // its columns: vertical prisms dropping from the far lip, each face lit by its turn to the glow below
    const far = lipPts(true);
    for (let i = 0; i < far.length - 1; i += 1) {
      const [x0, y0] = far[i];
      const [x1] = far[i + 1];
      const wd = x1 - x0;
      const v = r();
      ctx.fillStyle = v < 0.5 ? rgba('#000000', 0.25 + v * 0.3) : rgba('#ff8a4a', (v - 0.5) * 0.14);
      ctx.fillRect(x0, y0, wd, b.y + b.h - y0);
      ctx.fillStyle = rgba('#ff9a60', 0.04 + r() * 0.06);
      ctx.fillRect(x0 + wd * 0.8, y0 + 2, 1, b.y + b.h - y0);
      // joints across them
      if (r() < 0.5) {
        const jy = y0 + 6 + r() * 14;
        ctx.fillStyle = 'rgba(20,4,2,0.5)';
        ctx.fillRect(x0, jy, wd, 1.4);
      }
    }
    // smoke rising out of it, darker against the glow
    for (let i = 0; i < 9; i++) {
      const x = b.x + r() * b.w;
      const y = b.y + b.h * (0.2 + r() * 0.5);
      const g = ctx.createRadialGradient(x, y, 0, x, y, 30 + r() * 30);
      g.addColorStop(0, rgba('#3a1010', 0.35));
      g.addColorStop(1, rgba('#3a1010', 0));
      ctx.fillStyle = g;
      ctx.fillRect(x - 60, y - 60, 120, 120);
    }
    // the heat welling up from the depths at the near edge
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const near = lipPts(false);
    for (let i = 0; i < near.length; i += 4) {
      const [x, y] = near[i];
      glowAt(ctx, x, y - 1, 20, '#ff8a30', 0.18, 0.35);
    }
    ctx.restore();
  });
  // the far lip: the floor's broken edge, its top rimmed by the glow
  const far = lipPts(true);
  ctx.strokeStyle = 'rgba(10,2,2,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  far.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.strokeStyle = rgba('#ff8a4a', 0.5);
  ctx.lineWidth = 1;
  ctx.beginPath();
  far.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + 1.2) : ctx.moveTo(x, y + 1.2)));
  ctx.stroke();
  // the near lip: the broken slabs' edges, thick and dark, lit along their top from below and in front
  const near = lipPts(false);
  const lipBand = (c: Ctx) => {
    c.beginPath();
    near.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    for (let i = near.length - 1; i >= 0; i--) c.lineTo(near[i][0], near[i][1] - 3.2 - Math.abs(Math.sin(i * 1.7)) * 1.6);
    c.closePath();
  };
  fillPath(ctx, lipBand, '#0a0406');
  ctx.strokeStyle = rgba('#ffb070', 0.75);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  near.forEach(([x, y], i) => (i ? ctx.lineTo(x, y - 0.4) : ctx.moveTo(x, y - 0.4)));
  ctx.stroke();
  // the chains of the Titans below: from rings on the far ledge, straight down the far wall into the glow
  for (const X of [-13.2, -11.4, -9.6, 9.6, 11.4, 13.2]) {
    const zr = Math.min(wallZ(X) - 0.5, HD.chasm.z1 + 0.2);
    const [rx2, ry2] = P(X, 0.15, zr);
    const ls = Math.max(3, pz(zr) * 0.22);
    ctx.save();
    ctx.globalAlpha = 0.9;
    for (let j = 0; j < 10; j++) {
      const y = ry2 + ls * 0.8 + j * ls * 1.5;
      const fade = clamp01(1 - j / 9);
      bronzeLink(ctx, rx2, y, Math.PI / 2, ls, j % 2 === 0);
      ctx.fillStyle = rgba('#ff6a2a', 0.25 * (1 - fade));
      ctx.fillRect(rx2 - ls, y - ls, ls * 2, ls * 2);
    }
    ctx.restore();
    // the ring it hangs from, on the ledge
    ctx.strokeStyle = BRZ.deep;
    ctx.lineWidth = Math.max(2, ls * 0.5);
    ctx.beginPath();
    ctx.ellipse(rx2, ry2, ls * 1.1, ls * 0.5, 0, 0, P2);
    ctx.stroke();
    ctx.strokeStyle = rgba(BRZ.body, 0.9);
    ctx.lineWidth = Math.max(1, ls * 0.25);
    ctx.stroke();
  }
  // chips and broken slab corners tipped over the edge
  for (let i = 0; i < 10; i++) {
    const [x, y] = near[Math.floor(r() * near.length)];
    const s = 2 + r() * 4;
    fillPath(ctx, polyPath([[x - s, y - 1], [x + s * 0.6, y - s * 0.6], [x + s, y + s * 0.3], [x - s * 0.4, y + s * 0.5]]), '#0e0608');
  }
}

/** The still's share of the rift's live light: the glow breathing out of it, embers, the smoke lit from below. */
function riftStill(ctx: Ctx, r: R): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const s of [-1, 1] as const) {
    const [x, y] = P(s * 10.4, 0, HD.chasm.z0 + 3);
    glowAt(ctx, x, y - 4, 120, '#ff4a1c', 0.2, 0.5);
    glowAt(ctx, x, y - 60, 130, '#c8301a', 0.08, 1.1);
  }
  glowAt(ctx, 960, 470, 300, '#ff4a1c', 0.12, 0.6);
  ctx.restore();
  // embers caught rising
  for (let i = 0; i < 40; i++) {
    const s = r() < 0.5 ? -1 : 1;
    const x = s < 0 ? 620 + r() * 140 : 1160 + r() * 140;
    const y = 480 - r() * 260;
    ctx.fillStyle = rgba(r() < 0.5 ? '#ffb040' : '#ff6a20', 0.5 + r() * 0.4);
    ctx.fillRect(x, y, 1.6, 1.6 + r() * 2);
  }
}

// ——— the columns ———

/** A column of black marble at (X, z): fluted, on a bronze base, a bronze capital, under the hall's lights. The
 * near ones run up out of sight. */
function column(ctx: Ctx, r: R, X: number, z: number, R0: number, seed: number, o: { base?: boolean } = {}): void {
  const k = pz(z);
  const cx = sx(X, z);
  const yb = sy(HD.baseY - 0.1, z - R0 * 0.3);
  const yt = sy(HD.shaftY, z - R0 * 0.88);
  const rb = R0 * k;
  const rt = R0 * 0.88 * k;
  const ytop = Math.max(yt, -40);
  const tTop = (yb - ytop) / (yb - yt);
  const rTop = rb + (rt - rb) * tTop;
  const shaft = polyPath([[cx - rb, yb], [cx + rb, yb], [cx + rTop, ytop], [cx - rTop, ytop]]);
  // the view on it: the normal turned to the eye, and the one turned to screen-right
  const el = Math.hypot(X, z);
  const e = [-X / el, -z / el];
  const q = [-e[1], e[0]];
  const nAt = (u: number): V3 => {
    const c = Math.sqrt(Math.max(0, 1 - u * u));
    return [e[0] * c + q[0] * u, 0, e[1] * c + q[1] * u];
  };
  const g = ctx.createLinearGradient(cx - rb, 0, cx + rb, 0);
  for (let i = 0; i <= 16; i++) {
    const u = -1 + i / 8;
    const n = nAt(u * 0.995);
    // (the edges turn away into the dark: a cylinder's falloff)
    const edge = 1 - Math.abs(u) ** 2.4 * 0.75;
    // a broad soft light on the side turned to the key (the hall's dim light from the high left)
    const key = Math.max(0, 1 - Math.abs(u + 0.35) / 0.75);
    g.addColorStop((u + 1) / 2, shade(mix(lit(MARBLE.body, X + n[0] * R0, 3, z + n[2] * R0, n, { key: 0.45, rift: 1.0, soul: 0.22, reach: 3.5 }), '#4a4458', key * 0.35), (edge - 1) * 0.95));
  }
  fillPath(ctx, shaft, g);
  const sb: Box = { x: cx - rb, y: ytop, w: rb * 2, h: yb - ytop };
  /** Where on its width (u, -1..1) the polished stone mirrors a light from direction (lx, lz). */
  const gleamU = (lx: number, lz: number) => {
    const ll = Math.hypot(lx, lz) || 1;
    const hx = lx / ll + e[0];
    const hz = lz / ll + e[1];
    const hl = Math.hypot(hx, hz) || 1;
    return (hx / hl) * q[0] + (hz / hl) * q[1];
  };
  within(ctx, shaft, () => {
    lay(ctx, drift('#2a2430', '#040306', 3, seed, 24, 64), sb, 0.35);
    lay(ctx, noiseMask(4, seed + 3, { kind: 'web', cover: 0.14, soft: 0.03, col: MARBLE.vein, w: 40, h: 220 }), sb, 0.13);
    // the flutes: twenty around, each a shallow channel, an arris between each pair catching the light
    const N = 24;
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * P2;
      const a1 = ((i + 1) / N) * P2;
      const n0: V3 = [Math.cos(a0), 0, Math.sin(a0)];
      const n1: V3 = [Math.cos(a1), 0, Math.sin(a1)];
      const v0 = n0[0] * e[0] + n0[2] * e[1];
      const v1 = n1[0] * e[0] + n1[2] * e[1];
      if (v0 < 0.02 && v1 < 0.02) continue;
      const u0 = n0[0] * q[0] + n0[2] * q[1];
      const u1 = n1[0] * q[0] + n1[2] * q[1];
      const [ua, ub] = u0 < u1 ? [u0, u1] : [u1, u0];
      const vis = clamp01(Math.max(v0, v1));
      const fl = polyPath([[cx + ua * rb, yb], [cx + ub * rb, yb], [cx + ub * rTop, ytop], [cx + ua * rTop, ytop]]);
      const fg = ctx.createLinearGradient(cx + ua * rb, 0, cx + ub * rb, 0);
      fg.addColorStop(0, rgba('#000000', 0.5 * vis));
      fg.addColorStop(0.4, rgba('#000000', 0.1 * vis));
      fg.addColorStop(0.8, rgba('#000000', 0));
      fg.addColorStop(1, rgba('#000000', 0.12 * vis));
      fillPath(ctx, fl, fg);
      // the arris, lit by how it turns to the lights
      const nl = lit('#000000', X + n0[0] * R0, 3, z + n0[2] * R0, n0, { key: 1, rift: 1, soul: 0.6, reach: 4 });
      const lv = (parseInt(nl.slice(1, 3), 16) + parseInt(nl.slice(3, 5), 16) + parseInt(nl.slice(5, 7), 16)) / 765;
      if (v0 > 0.05) line(ctx, [cx + u0 * rb, yb], [cx + u0 * rTop, ytop], rgba(mix('#d0c8e0', nl, 0.6), (0.05 + lv * 0.8) * v0), Math.max(1, rb * 0.02));
    }
    // the polished stone mirrors its lights in soft vertical gleams: the key's grey, the chasm's red on the side
    // turned to the middle, the nearest soul-fire's blue
    const gleam = (u: number, col: string, a: number, wd: number) => {
      if (Math.abs(u) > 0.97 || a < 0.01) return;
      const x0 = cx + u * rb;
      const gg = ctx.createLinearGradient(x0 - wd * rb, 0, x0 + wd * rb, 0);
      gg.addColorStop(0, rgba(col, 0));
      gg.addColorStop(0.5, rgba(col, a));
      gg.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = gg;
      ctx.fillRect(x0 - wd * rb, ytop, wd * rb * 2, sb.h);
    };
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    gleam(gleamU(KEY[0], KEY[2]), '#a8a0b8', 0.1, 0.16);
    const toRift = [RIFT_P[0] - X, RIFT_P[2] - z];
    const rk = 1 / (1 + (Math.hypot(toRift[0], toRift[1]) / 18) ** 2);
    gleam(gleamU(toRift[0], toRift[1]), '#ff5a2a', 0.3 * rk, 0.1);
    let best = 1e9;
    let bf: V3 = FIRES[0];
    for (const f of FIRES) {
      const d = Math.hypot(f[0] - X, f[2] - z);
      if (d < best) {
        best = d;
        bf = f;
      }
    }
    const near = 1 / (1 + (best / 4) ** 2);
    const gu = gleamU(bf[0] - X, bf[2] - z);
    gleam(gu, '#8ad0ff', 0.45 * near, 0.08);
    // the fire's light washing the side of the shaft turned to it
    if (near > 0.2) {
      const side = gu > 0 ? 1 : -1;
      const x0 = cx + side * rb;
      ctx.fillStyle = lin(ctx, [x0, 0], [cx - side * rb * 0.2, 0], [[0, rgba('#3a90ff', 0.24 * near)], [0.5, rgba('#3a90ff', 0.08 * near)], [1, rgba('#3a90ff', 0)]]);
      ctx.fillRect(cx - rb, ytop, rb * 2, sb.h);
    }
    ctx.restore();
    // the cylinder's turn into shadow at both edges, over the veins too, so they follow the form
    ctx.fillStyle = lin(ctx, [cx - rb, 0], [cx + rb, 0], [[0, 'rgba(0,0,0,0.55)'], [0.2, 'rgba(0,0,0,0.12)'], [0.5, 'rgba(0,0,0,0)'], [0.8, 'rgba(0,0,0,0.15)'], [1, 'rgba(0,0,0,0.65)']]);
    ctx.fillRect(cx - rb, ytop, rb * 2, sb.h);
    // darker up into the dark; the bronze base bouncing warm light up its foot
    vfill(ctx, sb.x, sb.y, sb.w, sb.h, [[0, 'rgba(1,0,2,0.8)'], [0.5, 'rgba(1,0,2,0.3)'], [0.85, 'rgba(0,0,0,0)'], [1, rgba(BRZ.body, 0.1)]]);
    streaks(ctx, r, cx, ytop, rb * 1.4, sb.h * 0.6, '#000000', 0.15, 4);
  });
  // the outline, thin
  ctx.strokeStyle = 'rgba(2,1,4,0.8)';
  ctx.lineWidth = Math.max(1, k * 0.015);
  ctx.beginPath();
  ctx.moveTo(cx - rb, yb);
  ctx.lineTo(cx - rTop, ytop);
  ctx.moveTo(cx + rb, yb);
  ctx.lineTo(cx + rTop, ytop);
  ctx.stroke();
  // the base: a bronze torus on a square plinth, in contact with the floor
  if (o.base !== false && sy(0, z) < TY + 20) {
    const [fx0, fy] = P(X, 0, z);
    groundShadow(ctx, fx0 + k * 0.2, fy + 1, rb * 1.6, k * 0.12, 0.7, '#000000');
    const pw = R0 * 1.3;
    const plTop = 0.55;
    // its contact shadow on the floor, thrown forward a little by the chasm's light behind
    const [, pfy] = P(X, 0, z - pw);
    groundShadow(ctx, cx, pfy + k * 0.05, pw * k * 1.1, k * 0.22, 0.75, '#000000');
    // the plinth: black marble, its top catching a little light, its inner side the chasm's red
    fillPath(ctx, topAt(X - pw, X + pw, z - pw, z + pw, plTop), lit('#0c0a0e', X, plTop, z, [0, 1, 0], { key: 0.25, soul: 0.1, reach: 3 }));
    const inner = X < 0 ? X + pw : X - pw;
    fillPath(ctx, sideAt(inner, z - pw, z + pw, 0, plTop), lit('#0c080c', inner, 0.2, z, [X < 0 ? 1 : -1, 0, 0], { rift: 1.2, soul: 0.2 }));
    const pf = faceAt(X - pw, X + pw, 0, plTop, z - pw);
    const pfb = boxOfPts([P(X - pw, plTop, z - pw), P(X + pw, 0, z - pw)], 0);
    marble(ctx, pf, lit(MARBLE.body, X, 0.2, z - pw, [0, 0, -1], { key: 0.4, soul: 0.15 }), pfb, seed + 20, 0.2);
    within(ctx, pf, () => vfill(ctx, pfb.x, pfb.y, pfb.w, pfb.h, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.5)']]));
    line(ctx, [pfb.x, pfb.y + 0.5], [pfb.x + pfb.w, pfb.y + 0.5], rgba('#c8b8d0', 0.12), 1);
    strokePath(ctx, pf, 'rgba(2,1,4,0.85)', 1);
    crevice(ctx, pfb.x - 2, pfb.x + pfb.w + 2, pfb.y + pfb.h, 5, 0.7, '#000000');
    // the torus: a fat ring of bronze round the shaft's foot, seen from above as a band between the front of its
    // outer rim and the shaft's own round foot
    /** How round a level circle at height Y looks from the eye (its height over its width). */
    const ell = (Y: number) => (EH - Y) / z;
    const tr = R0 * 1.22 * k;
    const yLo = sy(0.7, z);
    const yTop = sy(HD.baseY, z);
    const tor = (c: Ctx) => {
      c.beginPath();
      c.ellipse(cx, yLo, tr, tr * ell(0.7), 0, Math.PI, 0, true);
      c.lineTo(cx + rb * 1.04, yTop);
      c.ellipse(cx, yTop, rb * 1.04, rb * 1.04 * ell(HD.baseY), 0, 0, Math.PI, false);
      c.closePath();
    };
    const ryLo = tr * ell(0.7);
    const tb = { x: cx - tr, y: yTop, w: tr * 2, h: yLo + ryLo - yTop };
    // its shadow on the plinth, and the plinth's top round it in occlusion
    groundShadow(ctx, cx + k * 0.1, yLo + ryLo * 0.6, tr * 1.05, ryLo * 0.7, 0.55, '#000000');
    solid(ctx, tor, tb, BRONZE_M, lit(BRZ.shade, X, 0.6, z - R0, [0, 0.3, -1], { key: 0.5, soul: 0.3, rift: 0.6 }), { depth: 0.2, air: HALL, line: Math.max(1, k * 0.016), formSize: 8 });
    within(ctx, tor, () => {
      lay(ctx, noiseMask(5, seed + 40, { cover: 0.3, soft: 0.2, col: BRZ.green, w: 40, h: 12 }), tb, 0.15);
      ctx.fillStyle = lin(ctx, [tb.x, 0], [tb.x + tb.w, 0], [[0, rgba(BRZ.lit, 0.2)], [0.3, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.55)']]);
      ctx.fillRect(tb.x, tb.y, tb.w, tb.h);
      // round in section: lit on its upper curve, the underside in shadow
      const gy = ctx.createLinearGradient(0, yTop, 0, yLo + ryLo);
      gy.addColorStop(0, rgba('#000000', 0.45));
      gy.addColorStop(0.25, rgba(BRZ.lit, 0.22));
      gy.addColorStop(0.55, 'rgba(0,0,0,0)');
      gy.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = gy;
      ctx.fillRect(tb.x, tb.y, tb.w, tb.h);
    });
  }
  // the capital, of bronze: a necking ring, an echinus swelling out, a square abacus throwing its shadow down the shaft
  if (yt > -30) {
    const [, ny0] = P(X, HD.shaftY, z - R0 * 0.88);
    const [, ny1] = P(X, HD.shaftY + 0.16, z - R0 * 0.9);
    const [, ey] = P(X, HD.shaftY + 0.62, z - R0 * 1.42);
    const [, ay] = P(X, HD.capY, z);
    const neck = polyPath([[cx - rt * 1.02, ny0], [cx + rt * 1.02, ny0], [cx + rt * 1.02, ny1], [cx - rt * 1.02, ny1]]);
    solid(ctx, neck, { x: cx - rt, y: ny1, w: rt * 2, h: ny0 - ny1 }, BRONZE_M, lit(BRZ.shade, X, HD.shaftY, z - R0, [0, -0.4, -1], { rift: 0.8, soul: 0.5 }), { depth: 0.2, air: HALL, line: 1, formSize: 4 });
    const ew = R0 * 1.3 * k;
    const ech = (c: Ctx) => {
      c.beginPath();
      c.moveTo(cx - rt, ny1);
      c.quadraticCurveTo(cx - ew * 1.02, ny1 - (ny1 - ey) * 0.3, cx - ew, ey);
      c.lineTo(cx + ew, ey);
      c.quadraticCurveTo(cx + ew * 1.02, ny1 - (ny1 - ey) * 0.3, cx + rt, ny1);
      c.closePath();
    };
    const eb = { x: cx - ew, y: ey, w: ew * 2, h: ny1 - ey };
    solid(ctx, ech, eb, BRONZE_M, lit(BRZ.body, X, HD.shaftY + 0.3, z - R0, [0, -0.6, -1], { rift: 1, soul: 0.6, key: 0.2 }), { depth: 0.4, air: HALL, line: 1, formSize: 8 });
    within(ctx, ech, () => {
      vfill(ctx, eb.x, eb.y, eb.w, eb.h, [[0, 'rgba(0,0,0,0.5)'], [1, rgba('#ff7a40', 0.25)]]);
      // egg-and-dart round it, on the flutes' spacing
      for (let i = 0; i < 9; i++) {
        const u = -0.88 + (i / 8) * 1.76;
        const ex = cx + u * ew * 0.92;
        const eyy = ey + eb.h * 0.5;
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(ex, eyy, ew * 0.07 * Math.sqrt(1 - u * u), eb.h * 0.3, 0, 0, P2);
        ctx.fill();
      }
    });
    const aw = R0 * 1.42;
    const ab = faceAt(X - aw, X + aw, HD.shaftY + 0.62, HD.capY, z - aw);
    const abb = boxOfPts([P(X - aw, HD.capY, z - aw), P(X + aw, HD.shaftY + 0.62, z - aw)], 0);
    fillPath(ctx, topAt(X - aw, X + aw, z - aw, z + aw, HD.shaftY + 0.62), '#140a06');
    castShadow(ctx, ab, 8, 6, 0.6, '#000000');
    solid(ctx, ab, abb, BRONZE_M, shade(lit(BRZ.shade, X, HD.capY - 0.2, z - aw, [0, 0, -1], { rift: 0.7, soul: 0.2, key: 0.2 }), -0.3), { depth: 0.2, air: HALL, line: 1, formSize: 6 });
    line(ctx, [abb.x + 2, ay + 1], [abb.x + abb.w - 2, ay + 1], rgba(BRZ.lit, 0.3), 1);
  }
}

const colBox = (X: number, z: number, R0: number): Box => {
  const k = pz(z);
  const cx = sx(X, z);
  const pad = R0 * 1.6 * k;
  const x0 = Math.max(0, Math.floor(cx - pad - 4));
  const x1 = Math.min(W, Math.ceil(cx + pad + 8));
  const y1 = Math.min(TY, Math.ceil(sy(0, z) + k * 0.4 + 8));
  return { x: x0, y: 0, w: x1 - x0, h: y1 };
};
const COL_R = (i: number) => (i === 0 ? HD.colR * 1.04 : HD.colR);

/** A cresset on the near column's inner face: an iron-and-bronze bracket holding a bowl of soul-fire. */
function cresset(ctx: Ctx, side: -1 | 1): void {
  const [X, z] = HD.cressets[side < 0 ? 0 : 1];
  const k = pz(z);
  const Y = HD.cressetY;
  const [bx, by] = P(X, Y, z);
  // the column it hangs on: its middle and radius on screen, its edge turned to the nave
  const zc = HD.rows[0];
  const kc = pz(zc);
  const ccx = sx(side * HD.colX, zc);
  const crb = COL_R(0) * kc;
  const wx = ccx - side * crb * 0.97;
  // a bronze band round the shaft carrying the arm: beaded at its edges, a running key between, no rivets
  const [, by0] = P(side * HD.colX, Y - 0.72, zc);
  const [, by1] = P(side * HD.colX, Y - 1.08, zc);
  const bulge = (by1 - by0) * 0.3;
  const band = (c: Ctx) => {
    c.beginPath();
    c.moveTo(ccx - crb * 1.02, by0);
    c.quadraticCurveTo(ccx, by0 + bulge, ccx + crb * 1.02, by0);
    c.lineTo(ccx + crb * 1.02, by1);
    c.quadraticCurveTo(ccx, by1 + bulge, ccx - crb * 1.02, by1);
    c.closePath();
  };
  const bbx = { x: ccx - crb, y: by0, w: crb * 2, h: by1 - by0 + bulge };
  castShadow(ctx, band, 4, 3, 0.5, '#000000');
  fillPath(ctx, band, lin(ctx, [ccx - crb, 0], [ccx + crb, 0], [[0, BRZ.deep], [0.22, BRZ.shade], [0.4, BRZ.body], [0.7, BRZ.shade], [1, BRZ.deep]]));
  within(ctx, band, () => {
    lay(ctx, noiseMask(5, 520 + side, { cover: 0.3, soft: 0.2, col: BRZ.green, w: 60, h: 8 }), bbx, 0.2);
    // its beads, top and bottom, following the shaft's curve
    for (const [yy, a] of [[by0 + 2, 0.5], [by1 - 2, 0.35]] as const) {
      ctx.strokeStyle = rgba(BRZ.lit, a);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(ccx - crb, yy);
      ctx.quadraticCurveTo(ccx, yy + bulge, ccx + crb, yy);
      ctx.stroke();
    }
    // the fire's light on the band's near side
    ctx.fillStyle = lin(ctx, [wx, 0], [ccx, 0], [[0, rgba('#6ac0ff', 0.2)], [1, rgba('#6ac0ff', 0)]]);
    ctx.fillRect(bbx.x, bbx.y, bbx.w, bbx.h);
  });
  strokePath(ctx, band, 'rgba(10,4,2,0.85)', 1.2);
  // the plate bolted to the shaft below, where the strut comes from
  const [, pY0] = P(X, Y - 2.1, z);
  const [, pY1] = P(X, Y - 2.75, z);
  const plate = polyPath([[wx + side * k * 0.02, pY0], [wx - side * k * 0.22, pY0 + k * 0.04], [wx - side * k * 0.22, pY1 - k * 0.04], [wx + side * k * 0.02, pY1]]);
  castShadow(ctx, plate, 4, 3, 0.55, '#000000');
  solid(ctx, plate, boxOfPts([[wx, pY0], [wx - side * k * 0.22, pY1]], 2), BRONZE_M, BRZ.shade, { depth: 0.1, air: HALL, line: 1.2, formSize: 3 });
  for (const yy of [pY0 + k * 0.1, pY1 - k * 0.1]) {
    ctx.fillStyle = BRZ.lit;
    ctx.beginPath();
    ctx.arc(wx - side * k * 0.1, yy, Math.max(1.5, k * 0.03), 0, P2);
    ctx.fill();
  }
  // the arm out from the band, the stem up to the bowl, the strut curving up from the plate to the arm's end
  const [, armY] = P(X, Y - 0.9, z);
  const strutY = (pY0 + pY1) / 2;
  const [, stemTop] = P(X, Y - 0.45, z);
  const aw = Math.max(3, k * 0.09);
  const arm = polyPath([[wx - side * 2, armY - aw], [bx + side * k * 0.12, armY - aw], [bx + side * k * 0.12, armY + aw], [wx - side * 2, armY + aw]]);
  const stem = polyPath([[bx - aw * 0.8, stemTop], [bx + aw * 0.8, stemTop], [bx + aw, armY], [bx - aw, armY]]);
  const strut = (c: Ctx) => {
    c.beginPath();
    c.moveTo(wx - side * k * 0.05, strutY - aw * 0.7);
    c.quadraticCurveTo(bx - side * k * 0.25, strutY - (strutY - armY) * 0.3, bx + side * aw * 0.4, armY + aw * 0.5);
    c.lineTo(bx + side * aw * 1.4, armY + aw * 0.9);
    c.quadraticCurveTo(bx - side * k * 0.1, strutY - (strutY - armY) * 0.1, wx - side * k * 0.05, strutY + aw * 0.7);
    c.closePath();
  };
  for (const pth of [strut, arm, stem]) {
    castShadow(ctx, pth, 5, 4, 0.55, '#000000');
    solid(ctx, pth, boxOfPts([[wx, stemTop], [bx + side * k * 0.2, strutY]], aw), BRONZE_M, BRZ.body, { depth: 0.1, air: HALL, line: 1.4, formSize: 5 });
  }
  // a scroll curling off the strut where it leaves the plate
  ctx.strokeStyle = BRZ.deep;
  ctx.lineWidth = Math.max(2, k * 0.04);
  ctx.beginPath();
  ctx.arc(wx + side * k * 0.08, strutY - k * 0.12, k * 0.08, 0, P2 * 0.8);
  ctx.stroke();
  ctx.strokeStyle = BRZ.body;
  ctx.lineWidth = Math.max(1, k * 0.02);
  ctx.stroke();
  // the bowl
  const rx = 0.62 * k;
  const [, byl] = P(X, Y - 0.5, z);
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
  solid(ctx, bowl, bb, BRONZE_M, mix(BRZ.shade, BRZ.body, 0.5), { depth: 0.1, air: HALL, line: 1.8, formSize: 10, spec: false });
  within(ctx, bowl, () => {
    lay(ctx, noiseMask(5, 500 + side, { cover: 0.35, soft: 0.2, col: BRZ.green, w: 40, h: 16 }), bb, 0.4);
    // a band of key pattern round it: ten units, centred
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
    vfill(ctx, bb.x, by - 4, bb.w, (byl - by) * 0.5, [[0, rgba('#6ac8ff', 0.35)], [1, rgba('#6ac8ff', 0)]]);
    ctx.fillStyle = lin(ctx, [bb.x, 0], [bb.x + bb.w, 0], [[0, 'rgba(0,0,0,0)'], [0.6, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.4)']]);
    ctx.fillRect(bb.x, bb.y, bb.w, bb.h);
  });
  ctx.strokeStyle = mix(BRZ.body, SOUL.core, 0.45);
  ctx.lineWidth = Math.max(2, k * 0.035);
  ctx.beginPath();
  ctx.moveTo(bx - rx * 1.06, by - k * 0.015);
  ctx.lineTo(bx + rx * 1.06, by - k * 0.015);
  ctx.stroke();
  ctx.fillStyle = SOUL.deep;
  ctx.beginPath();
  ctx.ellipse(bx, by - k * 0.02, rx * 0.94, k * 0.04, 0, 0, P2);
  ctx.fill();
  ctx.fillStyle = SOUL.core;
  ctx.beginPath();
  ctx.ellipse(bx, by - k * 0.022, rx * 0.5, k * 0.016, 0, 0, P2);
  ctx.fill();
  // its light on the column's face above and beside it
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.beginPath();
  ctx.rect(Math.min(ccx, wx), 0, Math.abs(wx - ccx) + 2, TY);
  ctx.clip();
  glowAt(ctx, wx, by - k * 0.5, k * 2.4, '#3a90ff', 0.4, 1.5);
  ctx.restore();
}

function colLayer(ctx: Ctx, r: R, row: number, side: -1 | 1): void {
  column(ctx, r, side * HD.colX, HD.rows[row], COL_R(row), 700 + row * 10 + side);
  if (row === 0) cresset(ctx, side);
}

// ——— the dais, the thrones, the dead's fares, the pomegranates, the tripods ———

/** One step of the dais: a block of black marble from the floor up to its tread, its front lit, a bronze nosing. */
function step(ctx: Ctx, r: R, i: number): void {
  const z = stepZ(i);
  const hw = stepHW(i);
  const Y1 = DA.rise * (i + 1);
  const Y0 = Y1 - DA.rise;
  const zn = i < DA.n - 1 ? stepZ(i + 1) : DA.back;
  // the tread (its visible strip in front of the next step)
  const tr = topAt(-hw, hw, z, zn, Y1);
  fillPath(ctx, tr, lit('#18141c', 0, Y1, z, [0, 1, 0], { key: 0.45, soul: 0.3, rift: 0.2, reach: 4 }));
  const tb = boxOfPts([P(-hw, Y1, z), P(hw, Y1, zn)], 0);
  within(ctx, tr, () => {
    lay(ctx, noiseMask(6, 300 + i, { kind: 'web', cover: 0.18, soft: 0.04, col: MARBLE.vein, w: 120, h: 30 }), tb, 0.3);
    // polished: the tripods' blue mirrored in it
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [Xf] of HD.tripods) {
      const [fx] = P(Xf, Y1, z);
      vfill(ctx, fx - 30, tb.y, 60, tb.h, [[0, rgba('#4fb8ff', 0.1)], [1, rgba('#4fb8ff', 0.02)]]);
    }
    ctx.restore();
  });
  // its riser, facing us
  const fr = faceAt(-hw, hw, Y0, Y1, z);
  const fb = boxOfPts([P(-hw, Y1, z), P(hw, Y0, z)], 0);
  marble(ctx, fr, lit(MARBLE.body, 0, Y0 + 0.3, z, [0, 0, -1], { key: 0.4, soul: 0.2, reach: 4 }), fb, 310 + i, 0.2);
  within(ctx, fr, () => {
    vfill(ctx, fb.x, fb.y, fb.w, fb.h, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.45)']]);
    // the soul-fires' light on it either side
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [Xf] of HD.tripods) {
      const [fx] = P(Xf, Y1, z);
      glowAt(ctx, fx, fb.y, 70, '#3a90ff', 0.12, 0.6);
    }
    ctx.restore();
    // its slabs' joints on the floor's grid
    for (let Xj = -GX * 2.5; Xj <= GX * 2.5; Xj += GX) line(ctx, P(Xj, Y0, z), P(Xj, Y1, z), 'rgba(0,0,0,0.5)', 1);
  });
  // the bronze nosing along its edge, rubbed bright in the middle where feet went up
  const [nx0, ny] = P(-hw, Y1, z);
  const [nx1] = P(hw, Y1, z);
  ctx.fillStyle = lin(ctx, [nx0, 0], [nx1, 0], [[0, BRZ.shade], [0.4, BRZ.body], [0.5, BRZ.lit], [0.6, BRZ.body], [1, BRZ.deep]]);
  ctx.fillRect(nx0, ny - 1, nx1 - nx0, Math.max(2, pz(z) * 0.07));
  // the step's outline
  strokePath(ctx, fr, 'rgba(2,1,4,0.8)', 1);
  void r;
}

/** A lion's paw, front-on, of bronze, standing at (x, y): the foot of a throne or a tripod. */
function paw(ctx: Ctx, x: number, y: number, s: number): void {
  groundShadow(ctx, x + s * 0.3, y + s * 0.05, s * 1.2, s * 0.25, 0.6, '#000000');
  const p = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x - s * 0.55, y - s * 1.3);
    c.lineTo(x + s * 0.55, y - s * 1.3);
    c.quadraticCurveTo(x + s * 0.6, y - s * 0.6, x + s * 0.95, y - s * 0.3);
    c.quadraticCurveTo(x + s * 1.05, y, x + s * 0.7, y);
    c.lineTo(x - s * 0.7, y);
    c.quadraticCurveTo(x - s * 1.05, y, x - s * 0.95, y - s * 0.3);
    c.quadraticCurveTo(x - s * 0.6, y - s * 0.6, x - s * 0.55, y - s * 1.3);
    c.closePath();
  };
  solid(ctx, p, { x: x - s, y: y - s * 1.3, w: s * 2, h: s * 1.3 }, BRONZE_M, BRZ.body, { depth: 0.4, air: HALL, line: 1, formSize: 4 });
  ctx.strokeStyle = 'rgba(20,10,2,0.7)';
  ctx.lineWidth = 1;
  for (const d of [-0.42, 0, 0.42]) {
    ctx.beginPath();
    ctx.moveTo(x + d * s, y - s * 0.45);
    ctx.lineTo(x + d * s * 1.1, y);
    ctx.stroke();
  }
}

/** The lord's throne: a seat block of black stone, legs on lion's paws, arms ending in bronze scrolls, a tall back
 * with a lapis panel and the bident, cypress finials of bronze; a purple drape over the seat. Seen from in front,
 * backlit by the chasm. */
function lordThrone(ctx: Ctx, r: R): void {
  const { X, z } = HD.throne;
  const k = pz(z);
  const Yb = TOP_Y;
  const zb = z + 1.9;
  const hw = 2.1;
  const seatY = Yb + 1.75;
  const backY = Yb + 6.4;
  // its shadow thrown forward over the platform by the chasm behind it
  const sh = topAt(X - hw * 1.1, X + hw * 1.1, DA.z0 + DA.step * (DA.n - 1) + 0.2, z, Yb + 0.01);
  softly(ctx, boxOfPts([P(X - hw * 1.3, Yb, z), P(X + hw * 1.3, Yb, stepZ(DA.n - 1))], 20), (q) => fillPath(q, sh, 'rgba(0,0,0,0.5)'), 0.2);
  // the back: a tall slab with a stepped head, a gable and three finials
  const bw = 1.85;
  const back = polyPath([P(X - bw, seatY - 0.2, zb), P(X + bw, seatY - 0.2, zb), P(X + bw, backY - 1.2, zb), P(X + bw * 0.78, backY - 1.2, zb), P(X + bw * 0.78, backY - 0.7, zb), P(X, backY, zb), P(X - bw * 0.78, backY - 0.7, zb), P(X - bw * 0.78, backY - 1.2, zb), P(X - bw, backY - 1.2, zb)]);
  const bb = boxOfPts([P(X - bw, backY, zb), P(X + bw, seatY, zb)], 0);
  marble(ctx, back, lit('#0e0a0e', X, backY - 3, zb, [0, 0, -1], { key: 0.3, soul: 0.2, reach: 3 }), bb, 401, 0.2);
  within(ctx, back, () => {
    vfill(ctx, bb.x, bb.y, bb.w, bb.h, [[0, 'rgba(0,0,0,0.3)'], [1, 'rgba(0,0,0,0.5)']]);
    // the lapis panel: deep blue flecked with gold, the bident on it in bronze, a cold line of light along it
    const pX = bw * 0.62;
    const pY0 = seatY + 1.0;
    const pY1 = backY - 1.45;
    const pnl = faceAt(X - pX, X + pX, pY0, pY1, zb);
    const pb = boxOfPts([P(X - pX, pY1, zb), P(X + pX, pY0, zb)], 0);
    fillPath(ctx, pnl, '#081228');
    within(ctx, pnl, () => {
      lay(ctx, drift('#14306a', '#040818', 3, 77, 24, 48), pb, 0.7);
      for (let i = 0; i < 18; i++) {
        ctx.fillStyle = rgba(GOLD.body, 0.2 + r() * 0.35);
        ctx.fillRect(pb.x + r() * pb.w, pb.y + r() * pb.h, 1, 1);
      }
      vfill(ctx, pb.x, pb.y, pb.w, pb.h, [[0, 'rgba(0,0,0,0.25)'], [1, rgba('#4fb8ff', 0.08)]]);
      const [cx] = P(X, 0, zb);
      const sw = Math.max(2, k * 0.12);
      const [, yTop] = P(X, pY1 - 0.25, zb);
      const [, yBot] = P(X, pY0 + 0.2, zb);
      const [, yFork] = P(X, pY1 - (pY1 - pY0) * 0.42, zb);
      const fw = k * 0.6;
      const bident = (c: Ctx) => {
        c.beginPath();
        c.rect(cx - sw / 2, yFork, sw, yBot - yFork);
        c.moveTo(cx - fw - sw / 2, yTop);
        c.lineTo(cx - fw + sw / 2, yTop);
        c.lineTo(cx - fw + sw / 2, yFork - sw * 1.4);
        c.quadraticCurveTo(cx, yFork + sw * 0.8, cx + fw - sw / 2, yFork - sw * 1.4);
        c.lineTo(cx + fw - sw / 2, yTop);
        c.lineTo(cx + fw + sw / 2, yTop);
        c.lineTo(cx + fw + sw / 2, yFork - sw * 0.3);
        c.quadraticCurveTo(cx, yFork + sw * 2.4, cx - fw - sw / 2, yFork - sw * 0.3);
        c.closePath();
      };
      castShadow(ctx, bident, 2, 1.5, 0.6, '#000000');
      solid(ctx, bident, pb, BRONZE_M, BRZ.body, { depth: 0.5, air: HALL, line: 1, formSize: 4 });
      ctx.strokeStyle = rgba('#7fd8ff', 0.35);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, yFork + 2);
      ctx.lineTo(cx, yBot - 2);
      ctx.stroke();
    });
    strokePath(ctx, pnl, rgba(BRZ.body, 0.7), Math.max(1.5, k * 0.05));
    // a bronze border round the back
    strokePath(ctx, back, rgba(BRZ.shade, 0.7), Math.max(2, k * 0.08));
  });
  // the chasm's red along its edges, behind and below
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  strokePath(ctx, back, rgba('#ff5a2a', 0.5), 3.2);
  strokePath(ctx, back, rgba('#ffb070', 0.3), 1);
  ctx.restore();
  strokePath(ctx, back, 'rgba(2,1,4,0.85)', 1.2);
  // the finials: cypresses of bronze, the tallest on the gable
  for (const [fX, fY, fs] of [[X, backY, 0.8], [X - bw * 0.9, backY - 1.2, 0.75], [X + bw * 0.9, backY - 1.2, 0.75]] as const) {
    const [fx, fy] = P(fX, fY, zb);
    const fh = k * fs;
    const fwid = k * fs * 0.22;
    const fin = (c: Ctx) => {
      c.beginPath();
      c.moveTo(fx, fy - fh);
      c.bezierCurveTo(fx + fwid * 1.2, fy - fh * 0.6, fx + fwid * 1.3, fy - fh * 0.2, fx + fwid * 0.4, fy - fh * 0.05);
      c.lineTo(fx + fwid * 0.4, fy);
      c.lineTo(fx - fwid * 0.4, fy);
      c.lineTo(fx - fwid * 0.4, fy - fh * 0.05);
      c.bezierCurveTo(fx - fwid * 1.3, fy - fh * 0.2, fx - fwid * 1.2, fy - fh * 0.6, fx, fy - fh);
      c.closePath();
    };
    solid(ctx, fin, { x: fx - fwid * 1.3, y: fy - fh, w: fwid * 2.6, h: fh }, BRONZE_M, BRZ.shade, { depth: 0.5, air: HALL, line: 1, formSize: 4 });
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    strokePath(ctx, fin, rgba('#ff6a30', 0.3), 1.2);
    ctx.restore();
  }
  // the arms: blocks on the seat's sides, ending in front in a bronze scroll
  const armT = 0.62;
  for (const s of [-1, 1] as const) {
    const ax0 = X + s * hw;
    const ax1 = X + s * (hw - armT);
    const [A0, A1] = s < 0 ? [ax0, ax1] : [ax1, ax0];
    const arm = faceAt(A0, A1, seatY, seatY + 1.2, z + 0.1);
    const ab = boxOfPts([P(A0, seatY + 1.2, z + 0.1), P(A1, seatY, z + 0.1)], 0);
    marble(ctx, arm, lit('#120e14', X + s * hw, seatY + 0.5, z, [0, 0, -1], { key: 0.4, soul: 0.35, reach: 3 }), ab, 410 + s, 0.2);
    strokePath(ctx, arm, 'rgba(2,1,4,0.85)', 1);
    const [scx, scy] = P((A0 + A1) / 2, seatY + 1.05, z);
    const sr2 = k * 0.36;
    const scroll = (c: Ctx) => {
      c.beginPath();
      c.arc(scx, scy, sr2, 0, P2);
    };
    solid(ctx, scroll, { x: scx - sr2, y: scy - sr2, w: sr2 * 2, h: sr2 * 2 }, BRONZE_M, BRZ.body, { depth: 0.4, air: HALL, line: 1, formSize: 4 });
    ctx.strokeStyle = BRZ.deep;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(scx, scy, sr2 * 0.55, 0, P2 * 0.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(scx + sr2 * 0.1, scy, sr2 * 0.25, 0, P2 * 0.85);
    ctx.stroke();
  }
  // the seat block and its legs
  const seat = faceAt(X - hw, X + hw, Yb + 0.35, seatY, z);
  const sb = boxOfPts([P(X - hw, seatY, z), P(X + hw, Yb, z)], 0);
  marble(ctx, seat, lit('#141016', X, seatY - 0.6, z, [0, 0, -1], { key: 0.4, soul: 0.35, reach: 3 }), sb, 420, 0.25);
  within(ctx, seat, () => {
    vfill(ctx, sb.x, sb.y, sb.w, sb.h, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.4)']]);
    // a bronze band of key pattern under the seat's edge
    const [, ky0] = P(X, seatY - 0.12, z);
    const [, ky1] = P(X, seatY - 0.5, z);
    ctx.fillStyle = lin(ctx, [0, ky0], [0, ky1], [[0, BRZ.body], [1, BRZ.deep]]);
    ctx.fillRect(sb.x, ky0, sb.w, ky1 - ky0);
    // sunk panels carved in its front, a bronze rosette in each
    for (const d of [-1, 1]) {
      const p0 = faceAt(X + d * 0.4, X + d * (hw - 0.35), Yb + 0.55, seatY - 0.65, z);
      const pb = boxOfPts([P(X + d * 0.4, seatY - 0.65, z), P(X + d * (hw - 0.35), Yb + 0.55, z)], 0);
      fillPath(ctx, p0, 'rgba(0,0,0,0.35)');
      line(ctx, [pb.x, pb.y + pb.h], [pb.x + pb.w, pb.y + pb.h], rgba('#c8b0c0', 0.18), 1);
      line(ctx, [pb.x + pb.w, pb.y], [pb.x + pb.w, pb.y + pb.h], rgba('#c8b0c0', 0.12), 1);
      const rcx = pb.x + pb.w / 2;
      const rcy = pb.y + pb.h / 2;
      for (let q = 0; q < 8; q++) {
        const a = (q / 8) * P2;
        ctx.fillStyle = rgba(BRZ.body, 0.8);
        ctx.beginPath();
        ctx.ellipse(rcx + Math.cos(a) * k * 0.12, rcy + Math.sin(a) * k * 0.12, k * 0.08, k * 0.04, a, 0, P2);
        ctx.fill();
      }
      ctx.fillStyle = BRZ.lit;
      ctx.beginPath();
      ctx.arc(rcx, rcy, Math.max(1.2, k * 0.05), 0, P2);
      ctx.fill();
    }
  });
  crevice(ctx, sb.x, sb.x + sb.w, sb.y + sb.h, -6, 0.6, '#000000');
  strokePath(ctx, seat, 'rgba(2,1,4,0.85)', 1.2);
  // the drape: heavy purple wool thrown over the seat and hanging down its front in folds, a gold key border
  const [dx0, dy0] = P(X - hw * 0.72, seatY + 0.05, z - 0.05);
  const [dx1] = P(X + hw * 0.62, seatY + 0.05, z - 0.05);
  const [, dy1] = P(X, Yb + 0.55, z - 0.1);
  const folds = 6;
  const drape = (c: Ctx) => {
    c.beginPath();
    c.moveTo(dx0, dy0);
    c.lineTo(dx1, dy0);
    c.quadraticCurveTo(dx1 + 4, (dy0 + dy1) / 2, dx1 + 2, dy1);
    for (let i = folds; i >= 0; i--) {
      const fx = dx0 + ((dx1 - dx0) * i) / folds;
      c.quadraticCurveTo(fx + (dx1 - dx0) / folds / 2, dy1 + (i % 2 ? 5 : -2), fx, dy1 + (i % 2 ? 0 : 3));
    }
    c.quadraticCurveTo(dx0 - 4, (dy0 + dy1) / 2, dx0, dy0);
    c.closePath();
  };
  const drb = { x: dx0 - 4, y: dy0, w: dx1 - dx0 + 8, h: dy1 - dy0 + 6 };
  castShadow(ctx, drape, 3, 3, 0.55, '#000000');
  solid(ctx, drape, drb, 'canvas', '#3a1a4a', { depth: 0.4, air: HALL, line: 1, formSize: 10, texA: 0.25 });
  within(ctx, drape, () => {
    for (let i = 0; i <= folds; i++) {
      const fx = dx0 + ((dx1 - dx0) * (i + 0.5)) / folds;
      ctx.fillStyle = lin(ctx, [fx - 8, 0], [fx + 8, 0], [[0, 'rgba(0,0,0,0)'], [0.5, 'rgba(0,0,0,0.4)'], [1, 'rgba(0,0,0,0)']]);
      ctx.fillRect(fx - 8, dy0 + 6, 16, dy1 - dy0);
      ctx.fillStyle = rgba('#9a6ac8', 0.12);
      ctx.fillRect(fx - 9, dy0 + 6, 2, dy1 - dy0);
    }
    vfill(ctx, drb.x, drb.y, drb.w, drb.h, [[0, rgba('#c8a0ff', 0.1)], [0.25, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.3)']]);
    // the border: a running band of gold along its hem
    ctx.strokeStyle = rgba(GOLD.body, 0.6);
    ctx.lineWidth = Math.max(1.5, k * 0.06);
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const fx = dx0 + (dx1 - dx0) * t;
      const yy = dy1 - 3 + Math.sin(t * folds * Math.PI) * 2;
      if (i) ctx.lineTo(fx, yy);
      else ctx.moveTo(fx, yy);
    }
    ctx.stroke();
  });
  // the legs: lion's paws at the seat's corners
  for (const s of [-1, 1] as const) {
    const [px, py] = P(X + s * (hw - 0.3), Yb, z - 0.1);
    paw(ctx, px, py, k * 0.32);
  }
  // a footstool before it
  const fs = faceAt(X - 1.2, X + 1.2, Yb, Yb + 0.32, z - 0.9);
  const fsb = boxOfPts([P(X - 1.2, Yb + 0.32, z - 0.9), P(X + 1.2, Yb, z - 0.9)], 0);
  fillPath(ctx, topAt(X - 1.2, X + 1.2, z - 0.9, z - 0.2, Yb + 0.32), lit('#2a222e', X, Yb + 0.32, z, [0, 1, 0], { soul: 0.7, key: 0.4 }));
  solid(ctx, fs, fsb, BRONZE_M, BRZ.shade, { depth: 0.4, air: HALL, line: 1, formSize: 4 });
  // the tripods' blue on its outer flanks
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  within(ctx, back, () => {
    const [tx, ty] = P(HD.tripods[0][0], TOP_Y + HD.tripodY + 0.4, HD.tripods[0][1]);
    glowAt(ctx, tx, ty, k * 2.6, '#3a90ff', 0.16, 1.4);
  });
  const [tx0, ty0] = P(HD.tripods[0][0], TOP_Y + HD.tripodY + 0.4, HD.tripods[0][1]);
  within(ctx, seat, () => glowAt(ctx, tx0, ty0, k * 2.2, '#3a90ff', 0.22, 1));
  ctx.restore();
  // the chasm's red rim along the seat's top edge and arms (light from behind, wrapping)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  line(ctx, P(X - hw, seatY + 1.2, z + 0.1), P(X + hw, seatY + 1.2, z + 0.1), rgba('#ff6a30', 0.25), 1.4);
  ctx.restore();
}

/** Persephone's throne beside his: smaller, gentler, an arched back carved with a pomegranate tree, a dark red
 * cushion, bronze legs ending in paws. */
function queenThrone(ctx: Ctx, r: R): void {
  const { X, z } = HD.queen;
  const k = pz(z);
  const Yb = TOP_Y;
  const zb = z + 1.5;
  const hw = 1.5;
  const seatY = Yb + 1.5;
  const backY = Yb + 5.4;
  const sh = topAt(X - hw * 1.1, X + hw * 1.1, stepZ(DA.n - 1) + 0.6, z, Yb + 0.01);
  softly(ctx, boxOfPts([P(X - hw * 1.3, Yb, z), P(X + hw * 1.3, Yb, stepZ(DA.n - 1))], 20), (q) => fillPath(q, sh, 'rgba(0,0,0,0.45)'), 0.2);
  // the seat's left side, turned to the eye
  const sideP = sideAt(X - hw, z, zb, Yb + 0.3, seatY);
  fillPath(ctx, sideP, lit('#0c080c', X - hw, seatY - 0.5, z + 0.7, [-1, 0, 0], { key: 0.4, soul: 0.6, reach: 3 }));
  strokePath(ctx, sideP, 'rgba(2,1,4,0.85)', 1);
  const bw = 1.3;
  const [bx0, by0] = P(X - bw, seatY - 0.2, zb);
  const [bx1, byTop] = P(X + bw, backY - bw, zb);
  const rr = (bx1 - bx0) / 2;
  const back = (c: Ctx) => {
    c.beginPath();
    c.moveTo(bx0, by0);
    c.lineTo(bx0, byTop);
    c.arc(bx0 + rr, byTop, rr, Math.PI, 0);
    c.lineTo(bx1, by0);
    c.closePath();
  };
  const bb = { x: bx0, y: byTop - rr, w: bx1 - bx0, h: by0 - byTop + rr };
  marble(ctx, back, lit('#100c10', X, backY - 2, zb, [0, 0, -1], { key: 0.3, soul: 0.2, reach: 3 }), bb, 430, 0.2);
  within(ctx, back, () => {
    vfill(ctx, bb.x, bb.y, bb.w, bb.h, [[0, 'rgba(0,0,0,0.25)'], [1, 'rgba(0,0,0,0.5)']]);
    // the pomegranate tree carved on it: a trunk, branches, leaves and fruit, the fruit inlaid in red stone
    const cx = bx0 + rr;
    const ty = by0 - (by0 - byTop) * 0.12;
    const tt = byTop - rr * 0.3;
    ctx.strokeStyle = rgba(BRZ.shade, 0.9);
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1.5, k * 0.09);
    ctx.beginPath();
    ctx.moveTo(cx, ty);
    ctx.quadraticCurveTo(cx - 3, (ty + tt) / 2, cx, tt + 10);
    ctx.stroke();
    const branches: [number, number][] = [];
    for (let i = 0; i < 7; i++) {
      const by = ty - (ty - tt) * (0.25 + i * 0.1);
      const d = i % 2 ? 1 : -1;
      const ex = cx + d * rr * (0.45 + r() * 0.35);
      const ey = by - 8 - r() * 8;
      ctx.lineWidth = Math.max(1, k * 0.05);
      ctx.beginPath();
      ctx.moveTo(cx, by);
      ctx.quadraticCurveTo(cx + d * rr * 0.2, by - 4, ex, ey);
      ctx.stroke();
      branches.push([ex, ey]);
    }
    for (const [ex, ey] of branches) {
      for (let j = 0; j < 4; j++) {
        ctx.fillStyle = rgba(j % 2 ? '#3a4a2a' : '#2a3a20', 0.8);
        ctx.beginPath();
        ctx.ellipse(ex + (r() - 0.5) * 10, ey + (r() - 0.5) * 6, 3, 1.4, r() * 3, 0, P2);
        ctx.fill();
      }
      ctx.fillStyle = '#7a1418';
      ctx.beginPath();
      ctx.arc(ex, ey + 3, Math.max(2, k * 0.09), 0, P2);
      ctx.fill();
      ctx.fillStyle = rgba('#ff8a8a', 0.4);
      ctx.fillRect(ex - 1, ey + 1.5, 1.2, 1.2);
    }
  });
  strokePath(ctx, back, rgba(BRZ.shade, 0.8), Math.max(2, k * 0.07));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  strokePath(ctx, back, rgba('#ff5a2a', 0.45), 3);
  strokePath(ctx, back, rgba('#ffb070', 0.25), 1);
  ctx.restore();
  strokePath(ctx, back, 'rgba(2,1,4,0.85)', 1);
  // a finial on the arch: a pomegranate of bronze
  const [fx, fy] = [bx0 + rr, byTop - rr];
  const fr = k * 0.22;
  solid(ctx, (c) => {
    c.beginPath();
    c.arc(fx, fy - fr * 0.8, fr, 0, P2);
  }, { x: fx - fr, y: fy - fr * 1.8, w: fr * 2, h: fr * 2 }, BRONZE_M, BRZ.body, { depth: 0.5, air: HALL, line: 1, formSize: 3 });
  // the seat, and its cushion
  const seat = faceAt(X - hw, X + hw, Yb + 0.3, seatY, z);
  const sb = boxOfPts([P(X - hw, seatY, z), P(X + hw, Yb, z)], 0);
  marble(ctx, seat, lit('#141016', X, seatY - 0.5, z, [0, 0, -1], { key: 0.4, soul: 0.35, reach: 3 }), sb, 440, 0.25);
  within(ctx, seat, () => {
    vfill(ctx, sb.x, sb.y, sb.w, sb.h, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.45)']]);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const [tx, ty] = P(HD.tripods[1][0], TOP_Y + HD.tripodY + 0.4, HD.tripods[1][1]);
    glowAt(ctx, tx, ty, k * 2.2, '#3a90ff', 0.22, 1);
    ctx.restore();
  });
  crevice(ctx, sb.x, sb.x + sb.w, sb.y + sb.h, -5, 0.6, '#000000');
  strokePath(ctx, seat, 'rgba(2,1,4,0.85)', 1.2);
  const [cx0, cy0] = P(X - hw * 0.9, seatY + 0.35, z + 0.2);
  const [cx1, cy1] = P(X + hw * 0.9, seatY - 0.05, z + 0.2);
  const cushion = (c: Ctx) => {
    c.beginPath();
    c.moveTo(cx0, cy1);
    c.quadraticCurveTo(cx0 - 3, cy0, cx0 + 6, cy0);
    c.quadraticCurveTo((cx0 + cx1) / 2, cy0 - 3, cx1 - 6, cy0);
    c.quadraticCurveTo(cx1 + 3, cy0, cx1, cy1);
    c.quadraticCurveTo((cx0 + cx1) / 2, cy1 + 4, cx0, cy1);
    c.closePath();
  };
  solid(ctx, cushion, { x: cx0, y: cy0 - 3, w: cx1 - cx0, h: cy1 - cy0 + 7 }, 'canvas', '#5a1018', { depth: 0.4, air: HALL, line: 1, formSize: 6, texA: 0.2 });
  for (const s of [-1, 1] as const) {
    const [px, py] = P(X + s * (hw - 0.25), Yb, z - 0.1);
    paw(ctx, px, py, k * 0.26);
    // the arm: a low rail ending in a pomegranate finial
    const [ax, ay] = P(X + s * (hw - 0.2), seatY + 0.9, z);
    const [, ay0] = P(X, seatY, z);
    const post = polyPath([[ax - k * 0.08, ay], [ax + k * 0.08, ay], [ax + k * 0.1, ay0], [ax - k * 0.1, ay0]]);
    solid(ctx, post, { x: ax - k * 0.1, y: ay, w: k * 0.2, h: ay0 - ay }, BRONZE_M, BRZ.body, { depth: 0.4, air: HALL, line: 1, formSize: 3 });
    solid(ctx, (c) => {
      c.beginPath();
      c.arc(ax, ay - k * 0.1, k * 0.15, 0, P2);
    }, { x: ax - k * 0.15, y: ay - k * 0.25, w: k * 0.3, h: k * 0.3 }, BRONZE_M, BRZ.body, { depth: 0.4, air: HALL, line: 1, formSize: 3 });
  }
}

/** A heap of the dead's fares: obols of bronze, silver and gold piled in a mound, the top ones lit, the heap's foot
 * spread thin; a contact shadow under it. (X, z) its middle, w its width, h its height (m), on a surface at Y. */
function coinHeap(ctx: Ctx, r: R, X: number, z: number, w: number, h: number, Y: number): void {
  const k = pz(z);
  const [cx, cy] = P(X, Y, z);
  const hw = (w / 2) * k;
  const hh = h * k;
  groundShadow(ctx, cx + hw * 0.1, cy + 1, hw * 1.15, k * 0.12, 0.7, '#000000');
  const mound = (c: Ctx) => {
    c.beginPath();
    c.moveTo(cx - hw, cy);
    c.bezierCurveTo(cx - hw * 0.6, cy - hh * 0.3, cx - hw * 0.35, cy - hh, cx, cy - hh);
    c.bezierCurveTo(cx + hw * 0.35, cy - hh, cx + hw * 0.6, cy - hh * 0.3, cx + hw, cy);
    c.quadraticCurveTo(cx, cy + k * 0.1, cx - hw, cy);
    c.closePath();
  };
  fillPath(ctx, mound, '#3a2610');
  const cs = Math.max(2.2, k * 0.13);
  within(ctx, mound, () => {
    vfill(ctx, cx - hw, cy - hh, hw * 2, hh, [[0, '#6a4a1c'], [1, '#1a1006']]);
    const n = Math.round(hw * hh * 0.09) + 20;
    for (let i = 0; i < n; i++) {
      const x = cx + (r() - 0.5) * hw * 2;
      const y = cy - r() * hh * 1.05;
      const top = 1 - (cy - y) / hh;
      const metal = r();
      const col = metal < 0.6 ? mix(BRZ.shade, BRZ.body, r()) : metal < 0.85 ? mix('#5a5a68', '#a8a8b8', r()) : mix(GOLD.shade, GOLD.body, r());
      const tilt = 0.35 + r() * 0.5;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.ellipse(x + 0.6, y + 0.8, cs, cs * tilt, (r() - 0.5) * 0.6, 0, P2);
      ctx.fill();
      ctx.fillStyle = shade(col, -0.25 * top);
      ctx.beginPath();
      ctx.ellipse(x, y, cs, cs * tilt, (r() - 0.5) * 0.6, 0, P2);
      ctx.fill();
      if (r() < 0.35) {
        ctx.fillStyle = rgba(r() < 0.5 ? '#ffe0a0' : '#bfe8ff', 0.5);
        ctx.fillRect(x - cs * 0.4, y - cs * tilt * 0.4, cs * 0.6, 0.9);
      }
    }
    // the soul-fires' blue on its top, the dark at its foot
    vfill(ctx, cx - hw, cy - hh, hw * 2, hh, [[0, rgba('#4fb8ff', 0.1)], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.35)']]);
  });
  // strays rolled out from it
  for (let i = 0; i < 8; i++) {
    const x = cx + (r() - 0.5) * hw * 3;
    const y = cy - 1 + r() * k * 0.25;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(x + 0.6, y + 0.8, cs, cs * 0.35, 0, 0, P2);
    ctx.fill();
    ctx.fillStyle = mix(BRZ.shade, BRZ.body, r());
    ctx.beginPath();
    ctx.ellipse(x, y, cs, cs * 0.35, 0, 0, P2);
    ctx.fill();
  }
}

/** A pomegranate: a round fruit, its crown of sepals on top, deep red lit from the left; split, its rind opened on the
 * seeds packed in white pith. */
function pomegranate(ctx: Ctx, x: number, y: number, s: number, split = false): void {
  const body = (c: Ctx) => {
    c.beginPath();
    c.ellipse(x, y, s, s * 0.94, 0, 0, P2);
  };
  solid(ctx, body, { x: x - s, y: y - s, w: s * 2, h: s * 2 }, 'leather', '#8a1420', { depth: 0.3, air: HALL, line: Math.max(1, s * 0.1), formSize: s, texA: 0.1 });
  within(ctx, body, () => {
    ctx.fillStyle = rgba('#e8a060', 0.18);
    ctx.beginPath();
    ctx.ellipse(x - s * 0.3, y - s * 0.2, s * 0.4, s * 0.6, 0.4, 0, P2);
    ctx.fill();
  });
  // the crown
  ctx.fillStyle = '#5a1014';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.28, y - s * 0.8);
  for (let i = 0; i <= 4; i++) ctx.lineTo(x - s * 0.28 + i * s * 0.14, y - s * (i % 2 ? 1.0 : 1.18));
  ctx.lineTo(x + s * 0.28, y - s * 0.8);
  ctx.closePath();
  ctx.fill();
  if (split) {
    // the cleft (unused for the bowl's top fruit, which is cut in half): the rind peeled back, the pith and the seeds glistening
    const cl = (c: Ctx) => {
      c.beginPath();
      c.moveTo(x - s * 0.55, y - s * 0.45);
      c.quadraticCurveTo(x - s * 0.1, y - s * 0.75, x + s * 0.55, y - s * 0.35);
      c.quadraticCurveTo(x + s * 0.65, y + s * 0.2, x + s * 0.2, y + s * 0.55);
      c.quadraticCurveTo(x - s * 0.5, y + s * 0.4, x - s * 0.55, y - s * 0.45);
      c.closePath();
    };
    fillPath(ctx, cl, '#e8d0b8');
    within(ctx, cl, () => {
      for (let i = 0; i < 26; i++) {
        const a = (i * 2.399) % P2;
        const rr = Math.sqrt(i / 26) * s * 0.55;
        const px = x + Math.cos(a) * rr;
        const py = y + Math.sin(a) * rr * 0.8;
        ctx.fillStyle = i % 3 ? '#c81830' : '#8a0c1c';
        ctx.beginPath();
        ctx.ellipse(px, py, s * 0.11, s * 0.13, a, 0, P2);
        ctx.fill();
        ctx.fillStyle = rgba('#ffd0d8', 0.7);
        ctx.fillRect(px - s * 0.04, py - s * 0.06, Math.max(0.8, s * 0.05), Math.max(0.8, s * 0.05));
      }
    });
    strokePath(ctx, cl, '#3a080c', Math.max(1, s * 0.08));
  }
}

/** A pomegranate cut in half, the cut face to us: the red rind round it, white pith walls dividing it into chambers,
 * each packed with glossy red seeds, the crown on top. */
function splitHalf(ctx: Ctx, x: number, y: number, s: number): void {
  const rind = (c: Ctx) => {
    c.beginPath();
    c.ellipse(x, y, s, s * 0.95, 0, 0, P2);
  };
  solid(ctx, rind, { x: x - s, y: y - s, w: s * 2, h: s * 2 }, 'leather', '#7a1018', { depth: 0.3, air: HALL, line: Math.max(1, s * 0.1), formSize: s, texA: 0.1 });
  // the crown
  ctx.fillStyle = '#4a0c10';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.26, y - s * 0.86);
  for (let i = 0; i <= 4; i++) ctx.lineTo(x - s * 0.26 + i * s * 0.13, y - s * (i % 2 ? 1.02 : 1.2));
  ctx.lineTo(x + s * 0.26, y - s * 0.86);
  ctx.closePath();
  ctx.fill();
  const face = (c: Ctx) => {
    c.beginPath();
    c.ellipse(x, y + s * 0.05, s * 0.82, s * 0.78, 0, 0, P2);
  };
  fillPath(ctx, face, '#d8b49a');
  within(ctx, face, () => {
    // the pith walls: five chambers
    ctx.strokeStyle = '#f4e4cc';
    ctx.lineWidth = Math.max(0.8, s * 0.05);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * P2 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(x, y + s * 0.05);
      ctx.lineTo(x + Math.cos(a) * s * 0.85, y + s * 0.05 + Math.sin(a) * s * 0.8);
      ctx.stroke();
    }
    // the seeds packed in each chamber
    for (let i = 0; i < 70; i++) {
      const a = (i * 2.399) % P2;
      const rr = Math.sqrt(i / 70) * 0.78 * s;
      const px = x + Math.cos(a) * rr;
      const py = y + s * 0.05 + Math.sin(a) * rr * 0.95;
      ctx.fillStyle = i % 3 ? '#c0142c' : '#8a0a1c';
      ctx.beginPath();
      ctx.ellipse(px, py, s * 0.1, s * 0.12, a, 0, P2);
      ctx.fill();
      ctx.fillStyle = rgba('#ffe0e6', 0.8);
      ctx.fillRect(px - s * 0.03, py - s * 0.05, Math.max(0.8, s * 0.04), Math.max(0.8, s * 0.04));
    }
  });
  strokePath(ctx, face, '#4a0a10', Math.max(1, s * 0.08));
}

/** Persephone's bowl: a bronze stand on three lion's legs at the dais's foot, a shallow bowl heaped with pomegranates,
 * one split open, its seeds spilled down the stand and across the floor. */
function bowlStand(ctx: Ctx, r: R): void {
  const { X, z, Y, r: br } = HD.bowl;
  const k = pz(z);
  const [fx, fy] = P(X, 0, z);
  groundShadow(ctx, fx + k * 0.15, fy + 1, k * 0.55, k * 0.1, 0.7, '#000000');
  // the pedestal: a round foot of bronze on the floor, a fluted stem swelling to a knop, a collar under the bowl
  const footR = 0.48;
  const [, fyTop] = P(X, 0.16, z);
  const fry = footR * k * (EH / z);
  const foot = (c: Ctx) => {
    c.beginPath();
    c.ellipse(fx, fy, footR * k, fry, 0, 0, Math.PI, false);
    c.lineTo(fx - footR * k * 0.8, fyTop);
    c.ellipse(fx, fyTop, footR * k * 0.8, fry * 0.8, 0, Math.PI, 0, false);
    c.closePath();
  };
  solid(ctx, foot, { x: fx - footR * k, y: fyTop - fry, w: footR * k * 2, h: fy + fry - fyTop + fry }, BRONZE_M, BRZ.shade, { depth: 0.3, air: HALL, line: 1, formSize: 4 });
  const [, sy0] = P(X, Y - 0.2, z);
  const sw0 = k * 0.09;
  const sw1 = k * 0.13;
  const [, kn] = P(X, (Y - 0.2) * 0.55, z);
  const stem = (c: Ctx) => {
    c.beginPath();
    c.moveTo(fx - sw0, sy0);
    c.lineTo(fx + sw0, sy0);
    c.quadraticCurveTo(fx + sw1 * 1.6, kn, fx + sw1, fyTop);
    c.lineTo(fx - sw1, fyTop);
    c.quadraticCurveTo(fx - sw1 * 1.6, kn, fx - sw0, sy0);
    c.closePath();
  };
  const stb = { x: fx - sw1 * 1.6, y: sy0, w: sw1 * 3.2, h: fyTop - sy0 };
  solid(ctx, stem, stb, BRONZE_M, BRZ.body, { depth: 0.3, air: HALL, line: 1, formSize: 4 });
  within(ctx, stem, () => {
    ctx.fillStyle = lin(ctx, [stb.x, 0], [stb.x + stb.w, 0], [[0, rgba(BRZ.lit, 0.3)], [0.35, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.5)']]);
    ctx.fillRect(stb.x, stb.y, stb.w, stb.h);
    for (const d of [-0.5, 0, 0.5]) line(ctx, [fx + d * sw0, sy0], [fx + d * sw1, fyTop], 'rgba(20,10,2,0.5)', 1);
  });
  // the knop: a ring round the stem
  const knop = (c: Ctx) => {
    c.beginPath();
    c.ellipse(fx, kn, sw1 * 1.75, k * 0.07, 0, 0, P2);
  };
  solid(ctx, knop, { x: fx - sw1 * 1.75, y: kn - k * 0.07, w: sw1 * 3.5, h: k * 0.14 }, BRONZE_M, BRZ.body, { depth: 0.3, air: HALL, line: 1, formSize: 3 });
  // the bowl
  const [cx, cy] = P(X, Y, z);
  const rx = br * k;
  const [, cyl] = P(X, Y - 0.22, z);
  const bowl = (c: Ctx) => {
    c.beginPath();
    c.moveTo(cx - rx, cy);
    c.quadraticCurveTo(cx - rx * 0.8, cyl, cx, cyl);
    c.quadraticCurveTo(cx + rx * 0.8, cyl, cx + rx, cy);
    c.closePath();
  };
  // the fruit heaped in it (behind the rim first)
  const fs = k * 0.33;
  const fruit: [number, number, boolean][] = [[-0.5, -0.12, false], [0.45, -0.15, false], [-0.02, -0.2, false], [-0.27, -0.6, false], [0.25, -0.58, false]];
  for (const [u, v, split] of fruit) pomegranate(ctx, cx + u * rx, cy + v * fs * 2.2, fs, split);
  // the split one on top: cut in half, its cut face turned to us, a wedge of it fallen against the rim
  splitHalf(ctx, cx + 0.02 * rx, cy - fs * 2.25, fs * 1.05);
  solid(ctx, bowl, { x: cx - rx, y: cy, w: rx * 2, h: cyl - cy }, BRONZE_M, BRZ.body, { depth: 0.3, air: HALL, line: 1.2, formSize: 6 });
  ctx.strokeStyle = rgba(BRZ.lit, 0.6);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(cx - rx, cy);
  ctx.lineTo(cx + rx, cy);
  ctx.stroke();
  // the split fruit's seeds spilled over the rim, down the stand and over the floor, catching the light
  for (let i = 0; i < 16; i++) {
    const t = r();
    let x: number;
    let y: number;
    if (i < 6) {
      x = cx + rx * (0.25 + r() * 0.5);
      y = cy - 2 + r() * (cyl - cy);
    } else {
      x = fx + k * 0.5 + (r() - 0.5) * k * 0.7;
      y = fy - 1 + r() * k * 0.2;
    }
    ctx.fillStyle = t < 0.5 ? '#b0142a' : '#7a0a18';
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(1, k * 0.04), Math.max(0.8, k * 0.035), r(), 0, P2);
    ctx.fill();
    ctx.fillStyle = rgba('#ffe0e6', 0.85);
    ctx.fillRect(x - 0.6, y - 0.9, 1.2, 1.2);
  }
}

/** A bronze tripod on the dais: three legs on lion's paws, a ring tying them, a deep bowl banded in the key pattern,
 * its coals burning cold blue (the fire over it is the live layer's). */
function tripod(ctx: Ctx, i: number): void {
  const [X, z] = HD.tripods[i];
  const k = pz(z);
  const Y0 = TOP_Y;
  const bowlY = Y0 + HD.tripodY;
  const R = { bowl: 0.55, foot: 0.5, legTop: Y0 + 1.5, ring: Y0 + 0.45 };
  const [fx, fy] = P(X, Y0, z);
  groundShadow(ctx, fx + k * 0.2, fy + k * 0.03, k * 0.75, k * 0.13, 0.75, '#020104');
  const legs = [Math.PI * 0.5, Math.PI * 1.17, Math.PI * 1.83].sort((a, b) => Math.sin(b) - Math.sin(a));
  for (const [j, a] of legs.entries()) {
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const [tx, ty] = P(X + ca * 0.14, R.legTop, z + sa * 0.14);
    const [kx, ky] = P(X + ca * 0.24, R.ring, z + sa * 0.24);
    const [bx, by] = P(X + ca * R.foot, Y0 + 0.1, z + sa * R.foot);
    const w = 0.06 * k;
    const leg = (c: Ctx) => {
      c.beginPath();
      c.moveTo(tx - w * 0.8, ty);
      c.bezierCurveTo(kx - w * 1.1, ky, kx - w * 0.9 + (bx - kx) * 0.3, by - (by - ky) * 0.25, bx - w * 0.7, by);
      c.lineTo(bx + w * 0.7, by);
      c.bezierCurveTo(kx + w * 0.9 + (bx - kx) * 0.3, by - (by - ky) * 0.25, kx + w * 1.1, ky, tx + w * 0.8, ty);
      c.closePath();
    };
    const col = lit(sa > 0 ? BRZ.shade : BRZ.body, X + ca * 0.3, Y0 + 1, z + sa * 0.3, [ca, 0, sa], { key: 0.4, soul: 0.3, rift: 0.5 });
    solid(ctx, leg, boxOfPts([[tx, ty], [bx, by]], w * 2), BRONZE_M, col, { depth: 0.3, air: HALL, line: 1, formSize: 4 });
    paw(ctx, bx, by + k * 0.04, k * 0.07);
    if (j === 0) {
      // the ring's back half
      ctx.strokeStyle = BRZ.deep;
      ctx.lineWidth = Math.max(1.5, k * 0.04);
      ctx.beginPath();
      for (let q = 0; q <= 16; q++) {
        const aa = (q / 16) * Math.PI;
        const [x, y] = P(X + Math.cos(aa) * 0.24, R.ring, z + Math.sin(aa) * 0.24);
        if (q) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
  }
  ctx.strokeStyle = BRZ.body;
  ctx.lineWidth = Math.max(1.5, k * 0.035);
  ctx.beginPath();
  for (let q = 0; q <= 16; q++) {
    const aa = Math.PI + (q / 16) * Math.PI;
    const [x, y] = P(X + Math.cos(aa) * 0.24, R.ring, z + Math.sin(aa) * 0.24);
    if (q) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.stroke();
  const [bx, by] = P(X, bowlY, z);
  const rx = R.bowl * k;
  const [, byl] = P(X, bowlY - 0.36, z);
  const [, s0] = P(X, bowlY - 0.32, z);
  const [, s1] = P(X, R.legTop - 0.05, z);
  solid(ctx, polyPath([[bx - k * 0.07, s0], [bx + k * 0.07, s0], [bx + k * 0.1, s1], [bx - k * 0.1, s1]]), { x: bx - k * 0.1, y: s0, w: k * 0.2, h: s1 - s0 + 2 }, BRONZE_M, BRZ.body, { depth: 0.3, air: HALL, line: 1, formSize: 3 });
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
  solid(ctx, bowl, bb, BRONZE_M, mix(BRZ.shade, BRZ.body, 0.55), { depth: 0.3, air: HALL, line: 1.2, formSize: 8, spec: false });
  within(ctx, bowl, () => {
    const ky = by + (byl - by) * 0.32;
    const u = (rx * 2) / 8;
    const kh = (byl - by) * 0.24;
    ctx.strokeStyle = rgba(BRZ.deep, 0.75);
    ctx.lineWidth = 1;
    for (let j = 0; j < 8; j++) {
      const x0 = bx - rx + j * u + u * 0.1;
      const w = u * 0.8;
      ctx.beginPath();
      ctx.moveTo(x0, ky + kh);
      ctx.lineTo(x0, ky);
      ctx.lineTo(x0 + w, ky);
      ctx.lineTo(x0 + w, ky + kh * 0.75);
      ctx.lineTo(x0 + w * 0.35, ky + kh * 0.75);
      ctx.stroke();
    }
    vfill(ctx, bb.x, by - 3, bb.w, (byl - by) * 0.5, [[0, rgba('#6ac8ff', 0.35)], [1, rgba('#6ac8ff', 0)]]);
  });
  ctx.strokeStyle = mix(BRZ.body, SOUL.core, 0.45);
  ctx.lineWidth = Math.max(1.5, k * 0.03);
  ctx.beginPath();
  ctx.moveTo(bx - rx * 1.06, by - k * 0.015);
  ctx.lineTo(bx + rx * 1.06, by - k * 0.015);
  ctx.stroke();
  ctx.fillStyle = SOUL.deep;
  ctx.beginPath();
  ctx.ellipse(bx, by - k * 0.02, rx * 0.94, k * 0.035, 0, 0, P2);
  ctx.fill();
  ctx.fillStyle = SOUL.core;
  ctx.beginPath();
  ctx.ellipse(bx, by - k * 0.022, rx * 0.5, k * 0.015, 0, 0, P2);
  ctx.fill();
}

export const DAIS_BOX: Box = (() => {
  const b = boxOfPts([P(-DA.hw0 - 0.5, 0, DA.z0), P(DA.hw0 + 0.5, 0, DA.z0), P(HD.throne.X, TOP_Y + 9.5, HD.throne.z + 2), P(HD.bowl.X + 1.2, 0, HD.bowl.z)], 14);
  return b;
})();

function dais(ctx: Ctx, r: R): void {
  // the platform's top, from the top step back to the chasm (lit blue by the tripods, red rim at the back)
  const hwT = stepHW(DA.n - 1);
  for (let i = 0; i < DA.n; i++) step(ctx, r, i);
  // the light on the platform: the tripods' pools, the chasm's red rimming its back edge
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [Xf, zf] of HD.tripods) {
    const [px, py] = P(Xf, TOP_Y, zf);
    lightPool(ctx, px, py, 70, 10, '#3a90ff', 0.25);
  }
  line(ctx, P(-hwT, TOP_Y, DA.back), P(hwT, TOP_Y, DA.back), rgba('#ff6a30', 0.4), 1.4);
  ctx.restore();
  // the thrones (hers first: she sits a little further back)
  queenThrone(ctx, r);
  lordThrone(ctx, r);
  // the dead's fares: heaped at his feet on the platform, spilling down the steps, piled at the dais's foot
  coinHeap(ctx, r, HD.throne.X + 0.3, stepZ(DA.n - 1) + 0.9, 3.2, 0.5, TOP_Y);
  for (let i = DA.n - 2; i >= 0; i--) coinHeap(ctx, r, HD.throne.X + 0.6 + (i % 2 ? 0.4 : -0.3), stepZ(i) + 0.38, 1.2 + i * 0.25, 0.22, DA.rise * (i + 1));
  coinHeap(ctx, r, -3.2, DA.z0 - 0.7, 2.6, 0.6, 0);
  coinHeap(ctx, r, 0.6, DA.z0 - 0.9, 2.2, 0.45, 0);
  coinHeap(ctx, r, 2.6, DA.z0 - 0.5, 1.4, 0.3, 0);
  for (let i = 0; i < 2; i++) tripod(ctx, i);
  bowlStand(ctx, r);
  // where the dais meets the floor
  const [x0, y0] = P(-DA.hw0, 0, DA.z0);
  const [x1] = P(DA.hw0, 0, DA.z0);
  crevice(ctx, x0, x1, y0, -5, 0.6, '#000000');
}

// ——— the chain blocks ———

const RING_Y = 2.25;
/** The ring's top on a block (screen). */
const ringTop = (i: number): Pt => {
  const [X, z] = HD.anchors[i];
  return P(X + (X < 0 ? 0.15 : -0.15), RING_Y + 0.42, z + 0.15);
};
const lipAt = (i: number): Pt => {
  const [X, z] = HD.lips[i];
  return P(X, 0, z);
};

/** A block of black stone set in the floor, capped in bronze, a great bronze ring stapled to its top, tilted towards
 * the chasm by the chain's pull. Its inner side faces the eye. */
function anchor(ctx: Ctx, i: number): void {
  const [X, z] = HD.anchors[i];
  const k = pz(z);
  const s = X < 0 ? -1 : 1;
  const hw = 0.8;
  const H = 1.7;
  const [fx, fy] = P(X, 0, z);
  groundShadow(ctx, fx + k * 0.3, fy + 2, k * 1.2, k * 0.18, 0.7, '#000000');
  const inner = X - s * hw;
  const side = sideAt(inner, z - hw, z + hw, 0, H);
  fillPath(ctx, side, lit('#100c12', inner, 1, z, [-s, 0, 0], { key: 0.3, rift: 1, soul: 0.2 }));
  within(ctx, side, () => {
    const sb = boxOfPts([P(inner, H, z - hw), P(inner, 0, z + hw)], 0);
    vfill(ctx, sb.x, sb.y, sb.w, sb.h, [[0, 'rgba(0,0,0,0.2)'], [1, rgba('#ff5a2a', 0.15)]]);
  });
  const front = faceAt(X - hw, X + hw, 0, H, z - hw);
  const fb = boxOfPts([P(X - hw, H, z - hw), P(X + hw, 0, z - hw)], 0);
  marble(ctx, front, lit('#120e14', X, 1, z - hw, [0, 0, -1], { key: 0.35, soul: 0.15 }), fb, 600 + i, 0.18);
  within(ctx, front, () => vfill(ctx, fb.x, fb.y, fb.w, fb.h, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.45)']]));
  strokePath(ctx, front, 'rgba(2,1,4,0.85)', 1);
  strokePath(ctx, side, 'rgba(2,1,4,0.85)', 1);
  // the bronze cap: a slab on top, its face banded
  const cap = topAt(X - hw - 0.08, X + hw + 0.08, z - hw - 0.08, z + hw + 0.08, H + 0.18);
  fillPath(ctx, cap, lit(BRZ.body, X, H, z, [0, 1, 0], { key: 0.6, soul: 0.4 }));
  const capF = faceAt(X - hw - 0.08, X + hw + 0.08, H, H + 0.18, z - hw - 0.08);
  solid(ctx, capF, boxOfPts([P(X - hw, H + 0.18, z - hw), P(X + hw, H, z - hw)], 2), BRONZE_M, BRZ.shade, { depth: 0.4, air: HALL, line: 1, formSize: 3 });
  // the staple, and the ring standing up in it, tilted towards the chasm
  const [sxp, syp] = P(X, H + 0.18, z);
  ctx.fillStyle = BRZ.deep;
  ctx.fillRect(sxp - k * 0.12, syp - k * 0.12, k * 0.24, k * 0.12);
  const [rcx, rcy] = P(X + s * -0.1, RING_Y, z + 0.1);
  const rr = 0.42 * k;
  ctx.save();
  ctx.translate(rcx, rcy);
  ctx.rotate(-s * 0.35);
  ctx.strokeStyle = '#140a04';
  ctx.lineWidth = rr * 0.42;
  ctx.beginPath();
  ctx.ellipse(0, 0, rr * 0.55, rr, 0, 0, P2);
  ctx.stroke();
  ctx.strokeStyle = BRZ.body;
  ctx.lineWidth = rr * 0.26;
  ctx.stroke();
  ctx.strokeStyle = rgba(BRZ.lit, 0.6);
  ctx.lineWidth = rr * 0.08;
  ctx.beginPath();
  ctx.ellipse(0, 0, rr * 0.55, rr, 0, Math.PI * 1.1, Math.PI * 1.6);
  ctx.stroke();
  ctx.strokeStyle = rgba('#ff7a40', 0.5);
  ctx.beginPath();
  ctx.ellipse(0, 0, rr * 0.55, rr, 0, Math.PI * 0.1, Math.PI * 0.5);
  ctx.stroke();
  ctx.restore();
}

export const ANCHOR_BOX = (side: -1 | 1): Box => {
  const ids = side < 0 ? [0, 1] : [2, 3];
  const pts: Pt[] = [];
  for (const i of ids) {
    const [X, z] = HD.anchors[i];
    pts.push(P(X - 1.2, 0, z - 1), P(X + 1.2, 0, z - 1), P(X, RING_Y + 1, z));
  }
  return boxOfPts(pts, 16);
};

// ——— the chains: bronze links on ropes (Verlet, screen px) from each ring to its lip ———

/** A link of a great bronze chain: face-on (a ring) or edge-on (a bar), lit from the high left, red underneath. */
function bronzeLink(ctx: Ctx, x: number, y: number, ang: number, s: number, face: boolean): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  if (face) {
    ctx.strokeStyle = CHAIN.deep;
    ctx.lineWidth = s * 0.6;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.95, s * 0.56, 0, 0, P2);
    ctx.stroke();
    ctx.strokeStyle = CHAIN.shade;
    ctx.lineWidth = s * 0.38;
    ctx.stroke();
    ctx.strokeStyle = rgba(BRZ.green, 0.2);
    ctx.lineWidth = s * 0.18;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.95, s * 0.56, 0, Math.PI * 0.2, Math.PI * 0.7);
    ctx.stroke();
    ctx.strokeStyle = rgba(CHAIN.body, 0.8);
    ctx.lineWidth = s * 0.12;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.95, s * 0.56, 0, Math.PI * 1.08, Math.PI * 1.62);
    ctx.stroke();
    ctx.strokeStyle = rgba('#ff6a30', 0.4);
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.95, s * 0.56, 0, Math.PI * 0.05, Math.PI * 0.35);
    ctx.stroke();
  } else {
    ctx.fillStyle = CHAIN.deep;
    ctx.beginPath();
    ctx.roundRect(-s * 1.08, -s * 0.27, s * 2.16, s * 0.54, s * 0.27);
    ctx.fill();
    ctx.fillStyle = CHAIN.shade;
    ctx.beginPath();
    ctx.roundRect(-s * 0.98, -s * 0.17, s * 1.96, s * 0.34, s * 0.17);
    ctx.fill();
    ctx.fillStyle = rgba(CHAIN.shade, 0.7);
    ctx.fillRect(-s * 0.7, s * 0.02, s * 1.3, s * 0.12);
    ctx.fillStyle = rgba(CHAIN.body, 0.85);
    ctx.fillRect(-s * 0.75, -s * 0.15, s * 1.35, s * 0.07);
  }
  ctx.restore();
}

/** The chains: from each block's ring to the chasm's lip (slack: length over span; s: link size, px). */
const CHAINS = HD.anchors.map((_, i) => ({ a: () => ringTop(i), b: () => lipAt(i), slack: 1.025, s: Math.max(5, pz(HD.anchors[i][1]) * 0.22), n: 12 }));
const GRAV = 900;

class Rope {
  x: number[] = [];
  y: number[] = [];
  px: number[] = [];
  py: number[] = [];
  seg: number;
  readonly span: number;
  constructor(a: Pt, b: Pt, slack: number, readonly n: number) {
    this.span = Math.hypot(b[0] - a[0], b[1] - a[1]);
    this.seg = (this.span * slack) / (n - 1);
    const sagD = Math.sqrt(Math.max(0, 0.375 * this.span * (this.span * slack - this.span)));
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
  /** Set how slack it hangs (length over span). */
  setSlack(slack: number): void {
    this.seg = (this.span * slack) / (this.n - 1);
  }
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
  kick(vx: number, vy: number, dt: number, at = 0.5): void {
    for (let i = 1; i < this.n - 1; i++) {
      const w = Math.max(0, 1 - Math.abs(i / (this.n - 1) - at) * 2.2);
      this.px[i] -= vx * dt * w;
      this.py[i] -= vy * dt * w;
    }
  }
  pts(): Pt[] {
    return this.x.map((x, i) => [x, this.y[i]] as Pt);
  }
}

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
  for (let d = s * 0.6; d < total - s * 0.2; d += s * 1.5, n++) {
    while (i < seg.length - 1 && seg[i] < d) i++;
    const t = (d - seg[i - 1]) / Math.max(0.001, seg[i] - seg[i - 1]);
    out.push({ x: pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, y: pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t, ang: Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]), face: n % 2 === 0 });
  }
  return out;
}
const LINK_COUNT = (() => settledRopes().map((rp, i) => linkPlaces(rp.pts(), CHAINS[i].s).length))();

export const CHAINS_BOX: Box = (() => {
  const pts: Pt[] = [];
  for (let i = 0; i < CHAINS.length; i++) pts.push(CHAINS[i].a(), CHAINS[i].b());
  return boxOfPts(pts, 40);
})();

function chainsStill(ctx: Ctx): void {
  for (const [i, rope] of settledRopes().entries()) {
    const c = CHAINS[i];
    const places = linkPlaces(rope.pts(), c.s).slice(0, LINK_COUNT[i]);
    // their shadows on the floor, thrown towards us by the chasm's light
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    for (const p of places) {
      ctx.beginPath();
      ctx.ellipse(p.x + 3, p.y + c.s * 0.9, c.s * 0.9, c.s * 0.3, 0, 0, P2);
      ctx.fill();
    }
    for (const p of places) bronzeLink(ctx, p.x, p.y, p.ang, c.s, p.face);
  }
}

// ——— the still's soul-fires and souls ———

/** A fire's bed of tongues at phase ph (as sceneBits' fireFrame, without the loose tongue breaking off the top: the
 * souls rising out of it are the soul-fire's own). */
function tonguesFrame(ctx: Ctx, x: number, y: number, w: number, h: number, ph: number, n: number, cols: [string, string, string], s: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y - h * 0.15, 0, x, y - h * 0.15, w * 0.75);
  g.addColorStop(0, rgba(cols[1], 0.4));
  g.addColorStop(1, rgba(cols[0], 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - w, y - h, w * 2, h * 1.2);
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0.5 : i / (n - 1);
    const mid = 1 - Math.abs(u - 0.5) * 1.3;
    const p = P2 * ph;
    const tx = x + (u - 0.5) * w * 0.8 + Math.sin(p * 2 + i * 2.1 + s) * w * 0.03;
    const th = h * mid * (0.72 + Math.sin(p * 3 + i * 1.7 + s) * 0.16 + Math.sin(p * 5 + i * 2.9) * 0.08);
    const tw = (w / n) * 1.7 * (0.9 + Math.sin(p * 2 + i) * 0.12);
    const lean = Math.sin(p * 2 + i * 1.3 + s) * 0.12;
    const curl = Math.sin(p * 4 + i) * 0.2;
    for (const [kk, col, al] of [[1, cols[0], 0.7], [0.68, cols[1], 0.8], [0.36, cols[2], 0.9]] as const) {
      const ww = tw * kk;
      const hh = th * (0.55 + kk * 0.45);
      ctx.beginPath();
      ctx.moveTo(tx - ww / 2, y);
      ctx.bezierCurveTo(tx - ww * 0.7, y - hh * 0.45, tx - ww * 0.15 + lean * hh * 0.4 - curl * ww, y - hh * 0.72, tx + lean * hh, y - hh);
      ctx.bezierCurveTo(tx + ww * 0.2 + lean * hh * 0.4 + curl * ww, y - hh * 0.7, tx + ww * 0.7, y - hh * 0.42, tx + ww / 2, y);
      ctx.quadraticCurveTo(tx, y + ww * 0.25, tx - ww / 2, y);
      ctx.fillStyle = rgba(col, al);
      ctx.fill();
    }
  }
  ctx.restore();
}

function soulFireFrame(c: Ctx, x: number, y: number, w: number, h: number, ph: number, seed: number): void {
  tonguesFrame(c, x, y, w, h, ph, 5, [SOUL.deep, SOUL.body, SOUL.core], seed);
  // the souls in it: pale wisps curling up out of the tongues, each born at the base and rising over the cycle
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.lineCap = 'round';
  for (let j = 0; j < 3; j++) {
    const q = (ph + j / 3 + seed * 0.13) % 1;
    const bx = x + Math.sin((j + seed) * 2.1) * w * 0.25;
    const top = y - h * (0.3 + q * 0.75);
    const a = Math.sin(q * Math.PI) * 0.55;
    c.strokeStyle = rgba('#e0f6ff', a);
    c.lineWidth = Math.max(1, w * 0.035) * (1 - q * 0.5);
    c.beginPath();
    for (let t = 0; t <= 1.001; t += 0.1) {
      const yy = top + h * 0.35 * t;
      const xx = bx + Math.sin(t * 5 + q * P2 + j) * w * 0.12 * (1 - t * 0.5);
      if (t) c.lineTo(xx, yy);
      else c.moveTo(xx, yy);
    }
    c.stroke();
    // the head of the wisp: a faint face of the dead
    const hg = c.createRadialGradient(bx, top, 0, bx, top, w * 0.09);
    hg.addColorStop(0, rgba('#f0fbff', a * 1.2));
    hg.addColorStop(1, rgba('#9ad8ff', 0));
    c.fillStyle = hg;
    c.fillRect(bx - w * 0.1, top - w * 0.1, w * 0.2, w * 0.2);
  }
  c.restore();
}

const FIRE_SPOTS = (): { x: number; y: number; w: number; h: number; kk: number }[] => [
  ...HD.cressets.map(([X, z]) => {
    const kk = pz(z);
    const [x, y] = P(X, HD.cressetY, z);
    return { x, y: y + 2, w: kk * 0.62 * 1.6, h: kk * 1.1, kk };
  }),
  ...HD.tripods.map(([X, z]) => {
    const kk = pz(z);
    const [x, y] = P(X, TOP_Y + HD.tripodY, z);
    return { x, y: y + 1, w: kk * 0.55 * 1.7, h: kk * 1.1, kk };
  }),
];

function firesStill(ctx: Ctx): void {
  for (const [i, f] of FIRE_SPOTS().entries()) {
    glowAt(ctx, f.x, f.y - f.h * 0.35, f.w * 1.1, '#3a98f0', 0.25);
    soulFireFrame(ctx, f.x, f.y, f.w, f.h, 0.3 + i * 0.37, 3 + i);
  }
  // a few souls drifting in the hall
  const [cv, g] = makeCanvas(WISP.w, WISP.h);
  for (const [x, y, s, ph, dir] of [[470, 520, 0.8, 0.2, 1], [1420, 470, 0.6, 0.6, -1]] as const) {
    g.clearRect(0, 0, WISP.w, WISP.h);
    wispFrame(g, ph);
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.translate(x, y);
    ctx.scale(s * dir, s);
    ctx.drawImage(cv, -WISP.w * 0.7, -WISP.h / 2);
    ctx.restore();
  }
}

/** A soul drifting through the hall (phase 0…1 loops): a pale hooded head, front-turned, its shroud streaming back
 * in a long tail that ripples, fading to nothing. Faces right. */
const WISP = { w: 220, h: 90 };
function wispFrame(c: Ctx, ph: number): void {
  const hx = WISP.w * 0.72;
  const hy = WISP.h * 0.48;
  const hr = 13;
  c.save();
  // the tail: a ribbon from the head back to the left, rippling with the phase, thinning and fading
  const N = 28;
  const top: Pt[] = [];
  const bot: Pt[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = hx - t * (WISP.w * 0.66);
    const wave = Math.sin(t * 7 - ph * P2) * 9 * t + Math.sin(t * 3 - ph * P2 * 2) * 3 * t;
    const half = hr * (1 - t) ** 0.8 + 1;
    top.push([x, hy + wave - half]);
    bot.push([x, hy + wave + half * 0.9]);
  }
  const g = c.createLinearGradient(hx, 0, hx - WISP.w * 0.66, 0);
  g.addColorStop(0, rgba('#bfe8ff', 0.75));
  g.addColorStop(0.4, rgba('#6ab8f0', 0.35));
  g.addColorStop(1, rgba('#3a78c8', 0));
  c.fillStyle = g;
  c.beginPath();
  top.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  for (let i = bot.length - 1; i >= 0; i--) c.lineTo(bot[i][0], bot[i][1]);
  c.closePath();
  c.fill();
  // the folds in it: fainter strands running back
  c.strokeStyle = rgba('#e8f8ff', 0.25);
  c.lineWidth = 1.2;
  for (const off of [-0.4, 0.15, 0.55]) {
    c.beginPath();
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const x = hx - t * (WISP.w * 0.62);
      const wave = Math.sin(t * 7 - ph * P2 + off) * 9 * t;
      const y = hy + wave + off * hr * (1 - t);
      if (i) c.lineTo(x, y);
      else c.moveTo(x, y);
    }
    c.stroke();
  }
  // the head: a hood of light, the face inside it dark and hollow-eyed, turned to us
  const hg = c.createRadialGradient(hx, hy - 2, 2, hx, hy, hr * 1.5);
  hg.addColorStop(0, rgba('#f4fcff', 0.95));
  hg.addColorStop(0.55, rgba('#bfe8ff', 0.6));
  hg.addColorStop(1, rgba('#6ab8f0', 0));
  c.fillStyle = hg;
  c.beginPath();
  c.ellipse(hx, hy, hr * 1.4, hr * 1.5, 0, 0, P2);
  c.fill();
  c.globalCompositeOperation = 'destination-out';
  c.fillStyle = 'rgba(0,0,0,0.55)';
  for (const d of [-1, 1]) {
    c.beginPath();
    c.ellipse(hx + d * hr * 0.38, hy - hr * 0.05, hr * 0.2, hr * 0.26, 0, 0, P2);
    c.fill();
  }
  c.beginPath();
  c.ellipse(hx, hy + hr * 0.55, hr * 0.16, hr * 0.24 + Math.sin(ph * P2) * 1.5, 0, 0, P2);
  c.fill();
  c.restore();
}

// ——— the table: a slab of the hall's black marble, faintly veined, its bronze rim in the key pattern ———

function table(ctx: Ctx, r: R): void {
  const f = HD.front;
  const zf = zFront(f);
  const box = { x: 0, y: TY, w: W, h: f - TY };
  const T = (X: number, z: number): Pt => [xAt(X, z), yAt(z)];
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, f - TY + 4);
  ctx.clip();
  vfill(ctx, 0, TY, W, f - TY + 4, [[0, '#0a080e'], [0.5, '#110e16'], [1, '#17121c']]);
  surface(ctx, r, box, '#120e18', { over: true, vary: 0.25, cells: 4, mottle: 0.2, strokes: 0.04, strokeAng: 0, strokeLen: 300, strokeW: 3, grain: 0.03, grainKind: 'grain', warm: '#24141c', cool: '#0a0c1c', seed: 95 });
  // its veins: long faint seams of white and a thread of gold, wandering across the slab in its perspective
  ctx.lineCap = 'round';
  for (let i = 0; i < 22; i++) {
    const z0 = ZB + (zf - ZB) * r();
    const X0 = (r() - 0.5) * 5;
    const ang = (r() - 0.5) * 1.2;
    const len = 1 + r() * 2.5;
    const ph = r() * 9;
    const gold = i % 5 === 0;
    const pts: Pt[] = [];
    for (let t = 0; t <= 1.001; t += 0.05) {
      const X = X0 + Math.cos(ang) * len * t + Math.sin(t * 6 + ph) * 0.05;
      const z = z0 + Math.sin(ang) * len * t * 0.3 + Math.sin(t * 9 + ph) * 0.02;
      pts.push(T(X, Math.max(ZB, Math.min(zf, z))));
    }
    const near = (pts[0][1] - TY) / (f - TY);
    ctx.strokeStyle = gold ? rgba(GOLD.body, 0.16) : rgba('#a8a0c0', 0.07 + r() * 0.06);
    ctx.lineWidth = (0.6 + r() * 1.4) * (0.5 + near);
    ctx.beginPath();
    pts.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    // a branch off it
    if (r() < 0.6) {
      const j = Math.floor(r() * pts.length);
      const [bx, by] = pts[j];
      ctx.lineWidth *= 0.6;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + (r() - 0.5) * 80, by + (r() - 0.5) * 20, bx + (r() - 0.5) * 140, by + (r() - 0.3) * 40 * (0.5 + near));
      ctx.stroke();
    }
  }
  // the slabs' joints on the rim's spacing
  for (let n = -4; n <= 4; n++) {
    const xf = 960 + (n + 0.5) * KEY_U * SLAB;
    const X = (xf - 960) * (zf / 1210);
    line(ctx, [xAt(X, ZB), TY], [xAt(X, zf), f + 4], 'rgba(0,0,0,0.7)', 2.5);
    line(ctx, [xAt(X, ZB) + 2, TY], [xAt(X, zf) + 3, f + 4], 'rgba(150,140,200,0.08)', 1.2);
  }
  // its polish: the hall's lights mirrored soft in it: the chasm's red faint down the middle, the soul-fires' blue
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
  sheen(960, '#ff5a2a', 0.04, 200);
  for (const f2 of FIRE_SPOTS().slice(0, 2)) sheen(f2.x, '#4aa8ff', 0.06, 90);
  ctx.restore();
  vfill(ctx, 0, TY, W, 50, [[0, rgba('#8a80c0', 0.08)], [1, rgba('#8a80c0', 0)]]);
  // chips along the front edge
  for (let x = 30 + r() * 60; x < W - 20; x += 110 + r() * 160) {
    const rw = 10 + r() * 20;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(x, f - 1, rw, 5 + r() * 5, 0, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = 'rgba(170,160,200,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x, f - 1, rw, 5, 0, Math.PI * 1.1, Math.PI * 1.5);
    ctx.stroke();
  }
  grain(ctx, box, 'stone', 0.07, 1.4);
  ctx.restore();
  tableFalloff(ctx, f, 0.4, '#04020a');
  crevice(ctx, 0, W, TY, 30, 0.6, '#000000');
  ctx.fillStyle = 'rgba(160,150,220,0.14)';
  ctx.fillRect(0, TY, W, 2);
  rimBand(ctx, f);
}

// ——— the grade and the shade ———

function grade(ctx: Ctx): void {
  ctx.globalCompositeOperation = 'source-atop';
  const g = ctx.createLinearGradient(0, 0, W * 0.8, 1080);
  g.addColorStop(0, rgba('#6a8ad0', 0.05));
  g.addColorStop(0.45, rgba('#6a8ad0', 0));
  g.addColorStop(0.62, rgba('#d0603a', 0));
  g.addColorStop(1, rgba('#d0603a', 0.05));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, 1080);
}

function shadeOver(ctx: Ctx): void {
  calmLanes(ctx, 0.18, '#06030a', 120, 640);
  vignetteAll(ctx, 0.55, '#040208');
  vfill(ctx, 0, 0, W, 170, [[0, 'rgba(2,1,6,0.6)'], [1, 'rgba(2,1,6,0)']]);
  // the bottom corners, where Atlas's hand rises, kept dark
  for (const cx of [0, W]) {
    const g = ctx.createRadialGradient(cx, 1080, 0, cx, 1080, 420);
    g.addColorStop(0, 'rgba(2,1,6,0.35)');
    g.addColorStop(1, 'rgba(2,1,6,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - 420, 660, 840, 420);
  }
}

// ——— the stack ———

const TABLE_BOX: Box = { x: 0, y: TY, w: W, h: 1080 - TY };
export const RIFT_BOX: Box = { x: 596, y: 96, w: 728, h: 580 };
const FIRES_BOX: Box = { x: 0, y: 200, w: W, h: 480 };

export const HADES: SceneSpec = {
  id: 'hades',
  info: {
    name: 'Throne of the Underworld',
    subtitle: 'Boss: HADES',
    ambient: [],
    // (the soul-fires and the chasm's light are the live layer's)
    glows: [],
    light: '#c8b8e8',
    tableTint: '#ece6f2',
  },
  layers: [
    { id: 'hall', box: HALL_BOX, draw: hall },
    { id: 'floor', box: FLOOR_BOX, draw: floor },
    { id: 'chasm', box: CHASM_BOX, draw: chasm },
    { id: 'rift', box: RIFT_BOX, motion: 'slot', draw: () => {} },
    { id: 'riftStill', box: RIFT_BOX, stillOnly: true, draw: riftStill },
    { id: 'col3L', box: colBox(-HD.colX, HD.rows[2], COL_R(2)), draw: (c, r) => colLayer(c, r, 2, -1) },
    { id: 'col3R', box: colBox(HD.colX, HD.rows[2], COL_R(2)), draw: (c, r) => colLayer(c, r, 2, 1) },
    { id: 'dais', box: DAIS_BOX, draw: dais },
    { id: 'anchorL', box: ANCHOR_BOX(-1), draw: (c) => [1, 0].forEach((i) => anchor(c, i)) },
    { id: 'anchorR', box: ANCHOR_BOX(1), draw: (c) => [3, 2].forEach((i) => anchor(c, i)) },
    { id: 'chains', box: CHAINS_BOX, motion: 'slot', draw: () => {} },
    { id: 'chainsStill', box: CHAINS_BOX, stillOnly: true, draw: (c) => chainsStill(c) },
    { id: 'col2L', box: colBox(-HD.colX, HD.rows[1], COL_R(1)), draw: (c, r) => colLayer(c, r, 1, -1) },
    { id: 'col2R', box: colBox(HD.colX, HD.rows[1], COL_R(1)), draw: (c, r) => colLayer(c, r, 1, 1) },
    { id: 'col1L', box: colBox(-HD.colX, HD.rows[0], COL_R(0)), draw: (c, r) => colLayer(c, r, 0, -1) },
    { id: 'col1R', box: colBox(HD.colX, HD.rows[0], COL_R(0)), draw: (c, r) => colLayer(c, r, 0, 1) },
    { id: 'firesStill', box: FIRES_BOX, stillOnly: true, draw: (c) => firesStill(c) },
    { id: 'table', box: TABLE_BOX, draw: table },
    { id: 'top', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

// ——— live ———

export type Titan = 'kronos' | 'atlas' | 'hyperion';
/** Each Titan's colour in the chasm's flare. */
const TITAN_FLARE: Record<Titan, { glow: number; hot: number }> = {
  kronos: { glow: 0xff8a2a, hot: 0xffd27a },
  atlas: { glow: 0xff3a1c, hot: 0xff8a50 },
  hyperion: { glow: 0xff6a1c, hot: 0xfff0c0 },
};

registerKitScene(HADES, (k: KitLive) => {
  const top = k.slot('top');
  const riftC = k.slot('rift');
  const chainC = k.slot('chains');

  // ——— the chasm: its glow breathing, smoke lit from below, heat shimmer, embers ———
  const lipL = P(-10.4, 0, HD.chasm.z0 + 2);
  const lipR = P(10.4, 0, HD.chasm.z0 + 2);
  const glows = [
    k.glow(lipL[0], lipL[1] - 6, 150, RED.glow, 0.25, { into: riftC, sy: 0.4 }),
    k.glow(lipR[0], lipR[1] - 6, 150, RED.glow, 0.25, { into: riftC, sy: 0.4 }),
  ];
  const hots = [
    k.glow(lipL[0], lipL[1] - 2, 70, 0xff7a30, 0.14, { into: riftC, sy: 0.22 }),
    k.glow(lipR[0], lipR[1] - 2, 70, 0xff7a30, 0.14, { into: riftC, sy: 0.22 }),
  ];
  // the glow climbing the end wall behind the throne, and the pillar of light when a Titan rises
  const wallGlow = k.glow(960, 430, 330, RED.glow, 0.1, { into: riftC, sy: 0.75 });
  const pillar = k.glow(960, 320, 260, RED.glow, 0, { into: riftC, sy: 1.4 });
  const mirror = [-1, 1].map((s) => k.glow(sx(s * 10.6, HD.chasm.z0), 560, 110, RED.glow, 0, { into: riftC, sy: 1.1 }));
  // smoke rising out of it, lit red from beneath (painted at 8 phases)
  const SMW = 200;
  const SMH = 320;
  const RS = 0.4;
  const smokeKey = sheet(k, 'hd_smoke', SMW * RS, SMH * RS, 8, (c, ph) => {
    c.scale(RS, RS);
    smokeFrame(c, SMW, SMH, ph, { lit: '#ff8a50', body: '#3a1416', shade: '#0c0408', wind: 0.12, lobes: 14, a: 0.42, toLight: [0, 1], seed: 4 });
  });
  const smokes = [
    { x: lipL[0] + 10, y: lipL[1] - 2, s: 1.0, ph: 0 },
    { x: lipR[0] - 10, y: lipR[1] - 2, s: 1.0, ph: 3.5 },
    { x: 900, y: 440, s: 1.25, ph: 1.7 },
    { x: 1040, y: 440, s: 1.1, ph: 5.3 },
  ].map((m) => ({ m, l: new Loop(k, smokeKey, 8, m.x, m.y, { into: riftC, origin: [0.5, 1], scale: m.s / RS, fps: 1.2, phase: m.ph }) }));
  // heat shimmer: wavering ribbons of hot air over the rift (painted at 8 phases)
  const SHW = 90;
  const SHH = 220;
  const shimmerKey = sheet(k, 'hd_shimmer', SHW, SHH, 8, (c, ph) => {
    c.globalCompositeOperation = 'lighter';
    for (let j = 0; j < 5; j++) {
      const x0 = SHW * (0.15 + j * 0.17);
      c.strokeStyle = rgba(j % 2 ? '#ffb070' : '#ff7040', 0.07);
      c.lineWidth = 6 + (j % 3) * 3;
      c.beginPath();
      for (let y = SHH; y >= 0; y -= 6) {
        const t = 1 - y / SHH;
        const x = x0 + Math.sin(t * 9 - ph * P2 * 2 + j * 1.3) * (3 + t * 7) + Math.sin(t * 23 - ph * P2 * 3 + j) * 1.5;
        if (y === SHH) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();
    }
    // fade it at the top and the bottom
    c.globalCompositeOperation = 'destination-in';
    const g = c.createLinearGradient(0, 0, 0, SHH);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.4, 'rgba(0,0,0,0.6)');
    g.addColorStop(0.85, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, SHW, SHH);
  });
  const shimmers = [
    { x: lipL[0], y: lipL[1] + 4, s: 1.4 },
    { x: lipR[0], y: lipR[1] + 4, s: 1.4 },
    { x: 960, y: 430, s: 2.0 },
  ].map((m, i) => ({ m, l: new Loop(k, shimmerKey, 8, m.x, m.y, { into: riftC, add: true, origin: [0.5, 1], scale: m.s, fps: 5, phase: i * 2.7 }) }));
  const embers = new Parts(k, { frame: 'ember', add: true, into: riftC, max: 160 });
  const emberRate = new Rate();
  let flare = 0;
  let flareCol = TITAN_FLARE.atlas;
  let dim = 0;

  // ——— the chains ———
  const LS = 2.6;
  const linkKey = sheet(k, 'hd_link', 26 * LS, 16 * LS, 2, (c, _p, i) => {
    c.scale(LS, LS);
    bronzeLink(c, 13, 8, 0, 9.5, i === 0);
  });
  const ropes = settledRopes();
  const chains = CHAINS.map((ch, i) => {
    const sh = Array.from({ length: LINK_COUNT[i] }, () => k.img(linkKey, 0, 0, { into: chainC, tint: 0x000000, alpha: 0.3 }));
    const ls = Array.from({ length: LINK_COUNT[i] }, () => k.img(linkKey, 0, 0, { into: chainC }));
    return { ch, rope: ropes[i], ls, sh, scale: ch.s / 9.5 / LS, a0: ch.a(), b0: ch.b() };
  });
  const chainAcc = { t: 0 };
  let strain = 0;
  const grit = new Parts(k, { frame: 'mote', into: chainC, max: 120 });
  const sparks = new Parts(k, { frame: 'spark', add: true, into: chainC, max: 60 });
  const gritRate = new Rate();

  // ——— the soul-fires ———
  const FW = 150;
  const FH = 200;
  const RF = 0.7;
  const FN = 10;
  const fireKey = sheet(k, 'hd_soulfire', FW * RF, FH * RF, FN, (c, ph) => {
    c.scale(RF, RF);
    soulFireFrame(c, FW / 2, FH - 8, FW * 0.85, FH * 0.85, ph, 3);
  });
  const fires = FIRE_SPOTS().map((f, i) => {
    const s = f.w / (FW * 0.85);
    const halo = k.glow(f.x, f.y - f.h * 0.35, f.w * 1.2, SOUL.glow, 0, { into: top });
    const fl = new Loop(k, fireKey, FN, f.x, f.y, { into: top, origin: [0.5, (FH - 8) / FH], scale: s / RF, fps: 10 + i, phase: i * 2.6 });
    const coal = k.glow(f.x, f.y - 2, f.w * 0.5, SOUL.glow, 0.5, { into: top, sy: 0.3 });
    // its mirror in the polished floor or the dais below it
    const refl = i >= 2 ? k.glow(f.x, sy(-(TOP_Y + HD.tripodY + 0.4), HD.tripods[i - 2][1]), 40, SOUL.glow, 0.12, { into: top, sy: 2.4 }) : null;
    return { f, s, halo, fl, coal, refl, seed: i * 1.7, rate: new Rate(), jolt: new Spring(0, 200, 9) };
  });
  const wisps = new Parts(k, { frame: 'soft', add: true, into: top, max: 70 });
  const duck = new Spring(0, 34, 5);
  let gutter = 0;
  let blaze = 0;

  // ——— the dust: off the ceiling and the beam on a stomp, pouring when a Titan rises ———
  const dust = new Parts(k, { frame: 'puff', into: top, max: 140 });
  const motes = new Parts(k, { frame: 'mote', into: top, max: 220 });
  const pourRate = new Rate();
  const [, beamY] = P(0, HD.capY, HD.rows[2] - HD.colR * 1.25);
  const floorY = (x: number) => (Math.abs(x - 960) < 220 ? sy(0, DA.z0) : Math.abs(x - 960) < 360 ? sy(0, HD.chasm.z0 - 0.5) : sy(0, HD.rows[2]));
  const shed = (n: number, p: number) => {
    for (let i = 0; i < n; i++) {
      const fromBeam = crand() < 0.6;
      const x = fromBeam ? 520 + crand() * 880 : 700 + crand() * 520;
      const y = fromBeam ? beamY + crand() * 4 : 60 + crand() * 60;
      motes.spawn({ x, y, vx: (crand() - 0.5) * 20, vy: crand() * 30, life: 2.8, r0: 1 + crand() * 1.6, a: 0.85, tint: crand() < 0.5 ? 0x8a7a88 : 0x5a4e5a, grav: 700, drag: 0.3, floor: floorY(x) + crand() * 10, bounce: 0.25, fade: 0.02 });
    }
    for (let i = 0; i < 1 + p * 4; i++) {
      const x = 560 + crand() * 800;
      dust.spawn({ x, y: beamY + 4, vx: (crand() - 0.5) * 10, vy: 16 + crand() * 24, life: 2.6 + crand(), r0: 6, r1: 24 + crand() * 18, a: 0.22, tint: 0x7a6a72, grav: 20, drag: 1.1, fade: 0.15 });
    }
  };

  // ——— the dead's fares, sliding off the heaps ———
  const CS = 24;
  const coinKey = sheet(k, 'hd_coin', CS, CS, 6, (c, _p, i) => {
    const t = 0.15 + (i / 5) * 0.85;
    const metal = i % 3 === 0 ? [GOLD.shade, GOLD.body, GOLD.lit] : [BRZ.shade, BRZ.body, BRZ.lit];
    c.fillStyle = '#140a04';
    c.beginPath();
    c.ellipse(CS / 2, CS / 2, CS * 0.42, CS * 0.42 * t + 1, 0, 0, P2);
    c.fill();
    const g = c.createLinearGradient(CS * 0.2, CS * 0.2, CS * 0.8, CS * 0.8);
    g.addColorStop(0, metal[2]);
    g.addColorStop(0.5, metal[1]);
    g.addColorStop(1, metal[0]);
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(CS / 2, CS / 2, CS * 0.36, CS * 0.36 * t, 0, 0, P2);
    c.fill();
    c.strokeStyle = rgba('#140a04', 0.5);
    c.lineWidth = 1;
    c.beginPath();
    c.ellipse(CS / 2, CS / 2, CS * 0.24, CS * 0.24 * t, 0, 0, P2);
    c.stroke();
  });
  const coins = new Parts(k, { frame: 'spark', sheet: { key: coinKey, n: 6, half: CS / 2 }, into: top, max: 40 });
  const coinFloor = sy(0, DA.z0 - 0.4);
  const slide = (n: number) => {
    for (let i = 0; i < n; i++) {
      const fromTop = crand() < 0.5;
      const [hx, hy] = fromTop ? P(HD.throne.X + (crand() - 0.5) * 2.4, TOP_Y + 0.3, stepZ(DA.n - 1) + 0.9) : P(-3.2 + (crand() < 0.5 ? 0 : 3.8) + (crand() - 0.5) * 1.2, 0.4, DA.z0 - 0.7);
      const kk = pz(fromTop ? 35 : 30.5);
      coins.spawn({ x: hx, y: hy, vx: (crand() - 0.5) * 60, vy: -20 - crand() * 30, life: 1.8 + crand(), r0: kk * 0.14, a: 1, tint: 0xffffff, grav: 600, drag: 0.4, floor: coinFloor + crand() * 8, bounce: 0.35, spin: (crand() - 0.5) * 12, fade: 0.2 });
    }
  };

  // ——— the souls drifting through the hall ———
  const wispKey = sheet(k, 'hd_wisp', WISP.w * 0.5, WISP.h * 0.5, 8, (c, ph) => {
    c.scale(0.5, 0.5);
    wispFrame(c, ph);
  });
  /** Each soul drifts along an aisle from near to far (towards the throne), bobbing; dir: which way it faces. */
  const souls = [0, 1, 2].map((i) => ({
    l: new Loop(k, wispKey, 8, 0, 0, { into: top, add: true, origin: [0.7, 0.5], scale: 1, fps: 6, phase: i * 2.5 }),
    t: i * 0.33 + crand() * 0.1,
    side: i % 2 ? 1 : -1,
    speed: 0.035 + crand() * 0.015,
    lane: 5.5 + crand() * 2,
  }));

  // ——— the fight, heard ———
  let tNow = 0;
  const rise = (kind: Titan) => {
    flare = 1;
    flareCol = TITAN_FLARE[kind] ?? TITAN_FLARE.atlas;
    strain = 1;
    dim = 0;
    for (const c of chains) c.rope.kick((c.b0[0] - c.a0[0]) * 0.6, 60, 1 / 60, 0.5);
    shed(30, 1);
    for (const f of fires) f.jolt.v -= 120 + crand() * 60;
    for (let i = 0; i < 40; i++) emberBurst(1.6);
  };
  const banish = () => {
    dim = 1;
    flare = 0;
    strain = 0;
    gutter = 1;
    blaze = 0;
  };
  const emberBurst = (p: number) => {
    const s = crand() < 0.5 ? -1 : 1;
    const behind = crand() < 0.3;
    const x = behind ? 800 + crand() * 320 : s < 0 ? 625 + crand() * 125 : 1170 + crand() * 125;
    const y = behind ? 440 : 492 - crand() * 6;
    embers.spawn({ x, y, vx: (crand() - 0.5) * 40 * p, vy: (-60 - crand() * 120) * p, life: 1.6 + crand() * 2, r0: 1.6 + crand() * 2, r1: 0.5, a: 0.9, tint: crand() < 0.4 ? flareCol.hot : crand() < 0.5 ? 0xff7a2a : 0xff4a1c, grav: -10, drag: 0.4, streak: 0.02, fade: 0.1 });
  };
  const ev = k.sc.events;
  const onTitan = (kind: Titan) => rise(kind);
  const onBanish = () => banish();
  ev.on('hades-titan', onTitan);
  ev.on('hades-banish', onBanish);
  const unlisten = () => {
    ev.off('hades-titan', onTitan);
    ev.off('hades-banish', onBanish);
    ev.off(Phaser.Scenes.Events.SHUTDOWN, unlisten);
  };
  ev.once(Phaser.Scenes.Events.SHUTDOWN, unlisten);
  /** In a fight (the game scene has its boss slots), or on the stages page. */
  const inFight = 'miniFoot' in (k.sc as object);
  let demo = 0;

  return {
    impact(x, _y, p) {
      // a stomp: the soul-fires duck, coins slide off the heaps, dust off the ceiling and the beam
      duck.v -= 3 + p * 5;
      slide(Math.round(1 + p * 5));
      shed(Math.round(3 + p * 10), p);
      for (const c of chains) c.rope.kick((x < 960 ? 1 : -1) * 6 * p, -10 * p, 1 / 60, 0.5);
      // (on the stages page, with no fight to hear, the biggest blows stand in for a Titan rising and being sent back)
      if (!inFight && p >= 0.95) {
        if (demo++ % 2 === 0) rise((['kronos', 'atlas', 'hyperion'] as Titan[])[Math.floor(demo / 2) % 3]);
        else banish();
      }
    },
    update(dt, t) {
      tNow = t;
      const cm = calm();
      flare = Math.max(0, flare - dt * 0.22);
      dim = Math.max(0, dim - dt * 0.25);
      gutter = Math.max(0, gutter - dt * 0.4);
      if (gutter <= 0.05 && dim > 0 && blaze === 0) blaze = 1;
      blaze = Math.max(0, blaze - dt * 0.7);
      strain = Math.max(0, strain - dt * 0.12);
      const fl2 = flare * flare;
      const lowK = 1 - dim * 0.7;

      // the chasm: breathing, flaring with a Titan's rising, dimmed when one is sent back
      const br = (0.85 + 0.15 * flicker(t * 0.6, 2)) * lowK;
      for (const [i, g] of glows.entries()) {
        g.setAlpha((0.24 * br + fl2 * 0.5) * cm + 0.02).setTint(fl2 > 0.05 ? flareCol.glow : RED.glow);
        hots[i].setAlpha((0.12 * br + 0.04 * flicker(t * 2.1, i + 4)) * lowK + fl2 * 0.45);
      }
      wallGlow.setAlpha((0.1 * br + fl2 * 0.35) * lowK);
      pillar.setAlpha(fl2 * 0.55).setTint(flareCol.glow).setScale((520 / 256) * (1 + fl2 * 0.2), (520 / 256) * 1.4 * (0.8 + fl2 * 0.5));
      for (const m of mirror) m.setAlpha(fl2 * 0.3 + 0.03 * br);
      for (const s of smokes) {
        s.l.step(dt, (1 + fl2 * 1.5) * cm);
        s.l.alpha = (0.55 + fl2 * 0.35) * (0.6 + 0.4 * lowK);
        s.l.each((im) => im.setTint(fl2 > 0.2 ? flareCol.hot : 0xffffff));
      }
      for (const [i, s] of shimmers.entries()) {
        s.l.step(dt, (1 + fl2) * cm);
        s.l.alpha = (0.5 + 0.2 * flicker(t * 0.5, i) + fl2 * 0.5) * lowK;
      }
      emberRate.tick((7 + fl2 * 60) * lowK * cm, dt, () => emberBurst(1 + fl2));

      // the chains: slack at rest, taut and straining while a Titan is out, grinding at the lip
      chainAcc.t += Math.min(dt, 0.1);
      const H = 1 / 120;
      const st = clamp01(strain * 1.6);
      while (chainAcc.t >= H) {
        chainAcc.t -= H;
        for (const c of chains) {
          // a strain pulls the lip end down into the chasm and draws the rope taut; it judders as the Titan heaves
          const jerk = st * (Math.sin(tNow * 23 + c.ch.s) * 0.5 + Math.sin(tNow * 41 + c.ch.s * 2) * 0.5) * 2.2 * cm;
          c.rope.setSlack(1.025 - st * 0.03);
          c.rope.step(H, [c.a0[0] + jerk * 0.3, c.a0[1] + Math.abs(jerk) * 0.4], [c.b0[0], c.b0[1] + st * 6 + jerk]);
        }
      }
      for (const c of chains) {
        c.rope.kick(Math.sin(t * 0.6 + c.ch.s) * 0.8 * cm * dt, 0, 1, 0.5);
        const places = linkPlaces(c.rope.pts(), c.ch.s);
        for (let j = 0; j < c.ls.length; j++) {
          const p = places[Math.min(j, places.length - 1)];
          c.ls[j].setFrame(p.face ? 0 : 1).setPosition(p.x, p.y).setRotation(p.ang).setScale(c.scale);
          c.sh[j].setFrame(p.face ? 0 : 1).setPosition(p.x + 3, p.y + c.ch.s * 0.9).setRotation(p.ang * 0.3).setScale(c.scale, c.scale * 0.35);
        }
      }
      gritRate.tick(st * 26 * cm, dt, () => {
        const i = Math.floor(crand() * chains.length);
        const [bx, by] = chains[i].b0;
        if (crand() < 0.55) sparks.spawn({ x: bx + (crand() - 0.5) * 8, y: by - 2, vx: (crand() - 0.5) * 120, vy: -40 - crand() * 80, life: 0.4 + crand() * 0.3, r0: 1.6, r1: 0.4, a: 1, tint: 0xffd080, grav: 600, streak: 0.03, fade: 0.1 });
        grit.spawn({ x: bx + (crand() - 0.5) * 14, y: by - 3, vx: (crand() - 0.5) * 30, vy: -10 - crand() * 30, life: 1.2, r0: 1 + crand(), a: 0.8, tint: 0x6a5a60, grav: 500, floor: by + 4, fade: 0.1 });
        // the blocks shake grit off themselves
        const [ax, ay] = chains[i].a0;
        if (crand() < 0.3) grit.spawn({ x: ax + (crand() - 0.5) * 20, y: ay + 6, vx: (crand() - 0.5) * 20, vy: 0, life: 1.2, r0: 1 + crand(), a: 0.8, tint: 0x5a4e5a, grav: 600, floor: ay + 40 + crand() * 10, bounce: 0.2, fade: 0.1 });
      });

      // dust pouring from the ceiling while a Titan rises
      pourRate.tick(fl2 * 60 * cm, dt, () => {
        const x = 560 + crand() * 800;
        dust.spawn({ x, y: beamY + 2, vx: (crand() - 0.5) * 6, vy: 30 + crand() * 40, life: 2.4 + crand(), r0: 4, r1: 18 + crand() * 14, a: 0.24, tint: 0x6a5a62, grav: 50, drag: 0.8, fade: 0.1 });
        if (crand() < 0.6) motes.spawn({ x, y: beamY, vx: (crand() - 0.5) * 10, vy: 10, life: 2.4, r0: 1 + crand() * 1.2, a: 0.8, tint: 0x8a7a88, grav: 700, floor: floorY(x) + crand() * 8, bounce: 0.25, fade: 0.02 });
      });

      // the soul-fires: a stomp ducks them; when a Titan is sent back they gutter low, then flare cold blue
      const d = duck.step(0, dt);
      const gk = gutter * gutter;
      for (const f of fires) {
        const fk = flicker(t * 1.1, f.seed);
        const jy = f.jolt.step(0, dt) * cm * 0.3;
        const low = 1 - gk * 0.75;
        const boost = 1 + blaze * blaze * 0.8 + fl2 * 0.15;
        f.fl.step(dt, (0.9 + blaze * 0.6) * cm * (1 - gk * 0.5));
        const hgt = (0.95 + 0.05 * fk) * (1 + d * 0.5) * low * boost * (1 + gk * 0.3 * Math.sin(t * 31 + f.seed));
        f.fl.alpha = 1 - gk * 0.4;
        f.fl.each((im) => {
          im.setScale((f.s / RF) * (1 + (boost - 1) * 0.3), (f.s / RF) * Math.max(0.12, hgt));
          im.setPosition(f.f.x, f.f.y + jy);
        });
        f.halo.setAlpha((0.16 + 0.06 * fk) * (1 + Math.max(0, d) * 0.4) * low * boost);
        f.coal.setAlpha((0.45 + 0.1 * fk) * (1 - gk * 0.5) + blaze * 0.3);
        f.refl?.setAlpha((0.1 + 0.03 * fk) * low * boost);
        f.rate.tick((2.2 + Math.max(0, d) * 8 + blaze * 14) * cm * low, dt, () => {
          wisps.spawn({ x: f.f.x + (crand() - 0.5) * f.f.w * 0.3, y: f.f.y - f.f.h * 0.4, vx: (crand() - 0.5) * 12, vy: -24 - crand() * 30, life: 1.8 + crand(), r0: f.f.kk * 0.03, r1: f.f.kk * 0.09, a: 0.32, tint: crand() < 0.5 ? 0x6ac8ff : 0xbfe8ff, grav: -8, drag: 0.4, fade: 0.2 });
        });
      }

      // the souls drifting towards the throne along the aisles, shrinking away, fading in and out
      for (const s of souls) {
        s.t += dt * s.speed * cm;
        if (s.t > 1) {
          s.t -= 1;
          s.side = crand() < 0.5 ? -1 : 1;
          s.lane = 5.5 + crand() * 2.5;
        }
        const z = 14 + s.t * 22;
        const X = s.side * (s.lane - s.t * 2.5);
        const Y = 2.2 + Math.sin(t * 0.7 + s.lane) * 0.4;
        const [x, y] = P(X, Y, z);
        const sc = pz(z) / 30;
        s.l.step(dt, cm);
        s.l.alpha = Math.sin(s.t * Math.PI) ** 1.5 * 0.35 * (1 - gk * 0.5);
        s.l.each((im) => im.setPosition(x, y).setScale(-s.side * sc * 0.9, sc * 0.9));
      }

      embers.update(dt);
      grit.update(dt);
      sparks.update(dt);
      wisps.update(dt);
      dust.update(dt);
      motes.update(dt);
      coins.update(dt);
    },
    destroy() {
      unlisten();
    },
  };
});
