// Medusa's Garden (the arena of MEDUSA, the Labyrinth's boss, Act 9), redrawn with the location kit (src/art/scene):
// a sunken garden court at dusk, walled in Cretan limestone like the Labyrinth and the Heart of the Maze
// (scene-labyrinth.ts, scene-minotaur.ts: their limestone, red tapering columns and horns of consecration).
//
// The court: its walls run round us, their coping set with horns of consecration (one coping block to each pair of
// horns), dark cypresses standing over them on the terraces, ivy pouring down their faces. Opposite us, across a long
// still pool, a little portico of red Minoan columns on three steps, its pediment carved with her own face, the
// Gorgoneion (staring eyes of green glass, the grin, the tusks, the snakes for hair); its right-hand bay has fallen, a
// column snapped, the cornice's blocks lying on the steps. The pool is green-black and still: the portico, the sky
// and the statues hang upside down in it, and something down in it glows a sickly green. Round it, her garden of
// statues: the heroes who came before, caught mid-stride and mid-swing and turned to grey stone. On the left a
// hoplite in his crested helmet, sword raised over his head, the blade snapped off at the hilt; his shield lies where
// he dropped it at his feet. On the right a youth recoiling a step, his arm flung up over his eyes, too late; a crack
// runs through him and his hand has broken off. Two more by the portico: a kneeling archer, his bow broken, and a
// spearman lunging. One lies toppled on the paving, broken at the waist, his head rolled away. Moss in their folds,
// black streaks down them where the rain runs, lichen on their shoulders.
//
// The light: the sun has just gone down behind the left-hand terrace. The sky is rose and amber low on the left,
// violet overhead; the last of its warmth catches only the high things (the pediment's raking cornice, the right-hand
// wall's coping, the statues' crests and raised arms); everything else is in the blue of dusk, and the pool lights
// the court from below in green. The table is a slab of dark green-veined marble (verde antico), low in contrast, so
// her stone pizzas stand out pale against it; the statues stay to the sides and back.
//
// An arena, not a location: no waves. It answers the fight (read from the game scene, as the Minotaur's does):
// - the pool: the reflection wobbles (cut into strips and rippled), slow rings spread from drips at its edge
//   (painted at 12 phases), the green glow breathes, motes rise from it; a stomp sends rings across it;
// - snakes slide over the stones (painted at 12 phases, their curves staying put on the ground as they go): along the
//   pool's kerb, over the toppled hero, along the portico's step;
// - the cypresses and the ivy stir;
// - a stomp shakes grit off the statues and a pebble off the cracked one, bouncing where they land;
// - when her eyes glow a green flash runs out from the pool over the garden, statue by statue, and the Gorgoneion's
//   eyes flare; when the stare turns a pizza to stone, the pool flares and rings.

import Phaser from 'phaser';
import { type Air, type Ctx, type R, TY, W, airMix, innerEdge, calmLanes, crevice, glowAt, groundShadow, lightPool, polyPath, vfill, vignetteAll, within } from '../../art/scene/kit';
import type { SceneSpec } from '../../art/scene/layers';
import { grain, tableFalloff, tableSeam } from '../../art/scene/materials';
import { chips, crack, drift, lay, noiseMask, softly, streaks, surface } from '../../art/scene/paint';
import { cloud, skyFill, stars } from '../../art/scene/sky';
import { ZB, yAt, zFront } from '../../art/sceneKit';
import { makeCanvas, mix, rgba, rng, shade } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { Loop, Parts, Rate, Spring, Swing, sheet } from '../../game/sceneAnim';
import { type KitLive, calm, registerKitScene } from '../../game/sceneLive';
import { COLUMN, HORNS, hornsPaint, spirals } from './scene-labyrinth';

type Pt = [number, number];
type Box = { x: number; y: number; w: number; h: number };
const P2 = Math.PI * 2;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

// ——— the court's perspective ———
//
// X across, Y up, z away (metres), the eye EH up with its horizon at VY. The court is sunk below its terraces: its
// walls (WALL.h) stand a little higher than the eye, so we see no land beyond them, only the terraces' cypresses.

const F = 600;
const VY = 440;
const EH = 1.7;
export const sx = (X: number, z: number) => 960 + (X * F) / z;
export const sy = (Y: number, z: number) => VY + ((EH - Y) * F) / z;
export const P = (X: number, Y: number, z: number): Pt => [sx(X, z), sy(Y, z)];
const ppu = (z: number) => F / z;
/** The floor's depth at a screen y. */
const zFloor = (y: number) => (EH * F) / Math.max(1, y - VY);

export const MD = {
  front: 1040,
  /** The court's walls: the back wall's face (z), their height, the side walls' X, the coping's thickness. */
  wall: { z: 11.4, h: 1.9, x: 7.2, cope: 0.15 },
  /** The portico: three steps from z0, its columns (on the top step), entablature and pediment. */
  stylo: { z0: 9.7, X: 6.3, rise: 0.15, tread: 0.32 },
  cols: { z: 10.92, X: [-5.6, -4, -2.4, -0.8, 0.8, 2.4, 4, 5.6], Y0: 0.45, h: 2.7, r0: 0.145, r1: 0.2 },
  ent: { z: 10.7, X: 6.05, Y0: 3.15, Y1: 3.8 },
  ped: { X: 6.2, h: 1.75 },
  /** The pool: half-width, near and far outer kerb, the kerb's width and height, the water's level. */
  pool: { X: 3.0, z0: 3.62, z1: 8.9, kw: 0.32, kh: 0.3, wY: 0.17 },
  /** The statues: the two big ones on plinths either side of the pool, the two by the portico. */
  statL: { X: -4.85, z: 3.78 },
  statR: { X: 4.9, z: 3.86 },
  statBL: { X: -3.95, z: 8.3 },
  statBR: { X: 3.95, z: 8.4 },
};
const WL = MD.wall;
const PL = MD.pool;

// ——— palettes ———

/** The dusk air: violet-grey, thick enough to take the far terrace. */
const AIR: Air = { color: '#6a6488', far: 0.55 };
/** The last warm light (the afterglow, low on the left) and the pool's green. */
const DUSK = '#ffb47c';
const GLOW = '#8cff8a';
const GLOW_N = 0x8cff8a;
/** Cretan limestone in the dusk: the walls' shade and their faint warm light. */
const WALLC = { lit: '#b8a48c', body: '#6e6876', shade: '#4a4660', deep: '#262434' };
/** The statues' grey stone (a cool marble gone grey with weather). */
const STONE = { lit: '#cec4b2', body: '#6c6a66', shade: '#363846', deep: '#14161e', warm: '#ffc89a' };
const MOSS = ['#56662e', '#6e7e38', '#3e4e26', '#8a9446'];
const LEAF = { dark: '#16241c', body: '#24382a', lit: '#3e5a3a', warm: '#6a7048' };
/** The sun is down beyond the left-hand terrace: where its glow comes from. */
const SUN_AT: Pt = [120, 470];

// ——— small helpers ———

const quad = (a: Pt, b: Pt, c: Pt, d: Pt) => polyPath([a, b, c, d]);
/** A face square to us at depth z. */
const faceAt = (X0: number, X1: number, Y0: number, Y1: number, z: number) => quad(P(X0, Y0, z), P(X1, Y0, z), P(X1, Y1, z), P(X0, Y1, z));
/** A level top at height Y between z0 and z1. */
const topAt = (X0: number, X1: number, z0: number, z1: number, Y: number) => quad(P(X0, Y, z0), P(X1, Y, z0), P(X1, Y, z1), P(X0, Y, z1));
/** A face along z (a side wall's) at X. */
const sideAt = (X: number, z0: number, z1: number, Y0: number, Y1: number) => quad(P(X, Y0, z0), P(X, Y0, z1), P(X, Y1, z1), P(X, Y1, z0));
const boxOfPts = (pts: Pt[], pad = 4): Box => {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x = Math.floor(Math.min(...xs) - pad);
  const y = Math.floor(Math.min(...ys) - pad);
  return { x, y, w: Math.ceil(Math.max(...xs) + pad - x), h: Math.ceil(Math.max(...ys) + pad - y) };
};
/** A gradient between two points. */
function lin(ctx: Ctx, a: Pt, b: Pt, stops: [number, string][]): CanvasGradient {
  const g = ctx.createLinearGradient(a[0], a[1], b[0], b[1]);
  for (const [t, c] of stops) g.addColorStop(t, c);
  return g;
}
/** Fill a path with a fill. */
function fillPath(ctx: Ctx, path: (c: Ctx) => void, fill: string | CanvasGradient): void {
  path(ctx);
  ctx.fillStyle = fill;
  ctx.fill();
}
/** Stroke a path. */
function strokePath(ctx: Ctx, path: (c: Ctx) => void, col: string, w: number): void {
  path(ctx);
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

// ——— the sky ———

export const SKY_BOX = { x: 0, y: 0, w: W, h: 452 };

function sky(ctx: Ctx, r: R): void {
  const b = SKY_BOX;
  // violet overhead, rose and amber low down where the sun has gone
  skyFill(ctx, b, [[0, '#1b1c3a'], [0.28, '#2e2f58'], [0.52, '#544a72'], [0.72, '#906078'], [0.86, '#c47a70'], [1, '#e89c72']], 0.04);
  // the afterglow: warm and wide on the left, where the sun went down behind the terrace
  glowAt(ctx, SUN_AT[0], SUN_AT[1], 1100, '#ff9a6a', 0.26, 0.42);
  glowAt(ctx, SUN_AT[0], SUN_AT[1], 520, '#ffc890', 0.32, 0.5);
  glowAt(ctx, SUN_AT[0] + 40, SUN_AT[1] - 10, 200, '#fff0c8', 0.28, 0.6);
  // the east (right) already cooling into night
  const eg = ctx.createRadialGradient(1900, 0, 0, 1900, 0, 900);
  eg.addColorStop(0, rgba('#141634', 0.55));
  eg.addColorStop(1, rgba('#141634', 0));
  ctx.fillStyle = eg;
  ctx.fillRect(900, 0, 1020, 452);
  // the first stars, only where the sky is darkest
  ctx.save();
  ctx.beginPath();
  ctx.rect(700, 0, 1220, 200);
  ctx.clip();
  stars(ctx, r, { x: 700, y: 0, w: 1220, h: 200 }, 26, '#e8e4ff');
  ctx.restore();
  // the evening star, bright and alone
  glowAt(ctx, 1312, 118, 16, '#fff6e0', 0.5);
  ctx.fillStyle = '#fffaf0';
  ctx.beginPath();
  ctx.arc(1312, 118, 2, 0, P2);
  ctx.fill();
  // long bars of cloud lit from below by the sun under the horizon: rose undersides, dusky violet tops
  const cl = (x: number, y: number, w: number, h: number, a: number, lit: string, kind: 'cumulus' | 'stratus') =>
    cloud(ctx, r, x, y, w, h, { lit, body: '#56466a', shadow: '#2c2a4c', sunX: SUN_AT[0] - 200, sunY: SUN_AT[1] + 420, rim: 0.9, kind, wisp: 0.5, a, depth: 0.4, air: AIR, res: 0.5 });
  cl(1400, 200, 460, 120, 0.92, '#ffb48a', 'cumulus');
  cl(620, 262, 520, 96, 0.9, '#ffbc8c', 'cumulus');
  cl(250, 344, 380, 74, 0.85, '#ffc898', 'cumulus');
  cl(1000, 120, 380, 64, 0.55, '#e8a0a0', 'cumulus');
  cl(1700, 330, 300, 30, 0.6, '#d8909a', 'stratus');
  // the haze over the terraces, thick and warm near the ground
  vfill(ctx, 0, 330, W, 122, [[0, rgba('#d88a78', 0)], [0.7, rgba('#d88a78', 0.22)], [1, rgba('#c08080', 0.3)]]);
}

// ——— the far terraces: what shows over the walls ———
//
// Beyond the back wall the ground runs on level with the coping: a far ruined colonnade, olive and laurel, cypress
// spires, all dark against the afterglow, a warm rim where they face the west.

export const TERRACE_BOX = { x: 0, y: 220, w: W, h: 240 };

/** A clump of round-headed shrubs (laurel, olive, oleander) on the terrace, dark, lit on the left. */
function shrubs(ctx: Ctx, r: R, x0: number, x1: number, baseY: number, h: number, depth: number): void {
  const col = airMix(LEAF.body, depth, AIR);
  const litC = airMix('#8a6a58', depth, AIR);
  for (let x = x0; x < x1; ) {
    const rad = h * (0.4 + r() * 0.45);
    const cy = baseY - rad * (0.55 + r() * 0.3);
    ctx.fillStyle = col;
    ctx.beginPath();
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * P2;
      const rr = rad * (0.86 + r() * 0.2);
      ctx.lineTo(x + Math.cos(a) * rr * 1.15, Math.min(baseY + 2, cy + Math.sin(a) * rr));
    }
    ctx.closePath();
    ctx.fill();
    // the afterglow on its western shoulder
    ctx.save();
    ctx.clip();
    const g = ctx.createLinearGradient(x - rad, cy - rad, x + rad * 0.4, cy + rad * 0.3);
    g.addColorStop(0, rgba(litC, 0.55));
    g.addColorStop(1, rgba(litC, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - rad * 1.3, cy - rad * 1.2, rad * 2.6, rad * 2.4);
    ctx.restore();
    x += rad * (1.1 + r() * 0.6);
  }
}

/** A distant column of the ruined colonnade on the terrace (red, gone dark in the dusk), maybe broken. */
function farColumn(ctx: Ctx, X: number, z: number, h: number, broken: number): void {
  const k = ppu(z);
  const [bx, by] = P(X, WL.h, z);
  const top = by - (h - broken) * k;
  const r0 = 0.15 * k;
  const r1 = 0.2 * k;
  const col = airMix(COLUMN.shade, 0.75, AIR);
  const lit = airMix('#c06a50', 0.7, AIR);
  ctx.beginPath();
  ctx.moveTo(bx - r0, by);
  ctx.lineTo(bx - r1 * (1 - broken / h * 0.3), top);
  if (broken) {
    ctx.lineTo(bx - r1 * 0.2, top - 3);
    ctx.lineTo(bx + r1 * 0.3, top + 2);
  }
  ctx.lineTo(bx + r1 * (1 - broken / h * 0.3), top);
  ctx.lineTo(bx + r0, by);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, [bx - r1, 0], [bx + r1, 0], [[0, lit], [0.35, col], [1, airMix(COLUMN.cap, 0.7, AIR)]]);
  ctx.fill();
  if (!broken) {
    ctx.fillStyle = airMix(COLUMN.cap, 0.7, AIR);
    ctx.fillRect(bx - r1 * 1.5, top - k * 0.22, r1 * 3, k * 0.22);
  }
}

function terrace(ctx: Ctx, r: R): void {
  terraceBody(ctx, r);
  // the evening mist gathering low over the terraces, the far things fading into it
  vfill(ctx, 0, 300, W, 150, [[0, rgba('#8a7090', 0)], [0.7, rgba('#8a7090', 0.2)], [1, rgba('#7a6488', 0.28)]]);
}

function terraceBody(ctx: Ctx, r: R): void {
  // far shrubs along the back terrace
  shrubs(ctx, r, 520, 1420, sy(WL.h, 16) + 2, 30, 0.85);
  // the far colonnade, a stretch of it still standing, its architrave on two columns, the rest broken
  const fz = 17;
  for (const X of [-8.6, -7.0, 4.8, 6.4]) farColumn(ctx, X, fz, 3.1, 0);
  const archi = (X0: number, X1: number) => {
    const [ax, ay] = P(X0, WL.h + 3.1 + 0.22, fz);
    const [bx2] = P(X1, 0, fz);
    const hh = 0.32 * ppu(fz);
    ctx.fillStyle = airMix('#7a6a70', 0.8, AIR);
    ctx.fillRect(ax, ay - hh, bx2 - ax, hh);
    ctx.fillStyle = rgba(airMix(DUSK, 0.6, AIR), 0.5);
    ctx.fillRect(ax, ay - hh, bx2 - ax, 1.5);
  };
  archi(-8.9, -6.7);
  archi(4.5, 6.7);
  // nearer shrubs at the foot of the cypresses, either side
  shrubs(ctx, r, 0, 600, sy(WL.h, 9) + 2, 44, 0.6);
  shrubs(ctx, r, 1320, W, sy(WL.h, 9) + 2, 44, 0.6);
  // far cypress spires over the back terrace
  for (const [X, z, hgt] of [[-6.6, 15, 8], [-5.2, 16.5, 9], [5.6, 15.5, 8.5], [7.4, 16, 7.5], [-2.6, 19, 10], [2.2, 20, 9.5]] as [number, number, number][]) {
    cypress(ctx, rng(Math.round(X * 100 + z)), sx(X, z), sy(WL.h, z) + 4, 1.1 * ppu(z), hgt * ppu(z), 0.8);
  }
  // the lower parts of the side terraces' cypresses (their crowns are sprites that stir)
  for (const c of CYP) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(c.x - c.w, CUT, c.w * 2, 60);
    ctx.clip();
    cypress(ctx, rng(c.seed), c.x, c.base, c.w, c.h, c.depth);
    ctx.restore();
  }
}

// ——— cypresses ———
//
// A columnar cypress: a tall flame of dense dark foliage, its edge broken into tufts, the sprays inside it lit on the
// west (left) by the afterglow and falling into blue-black on the right; a spire at the top.

/** The side terraces' cypresses (crowns cut at CUT: sprites that stir; the rest painted in the terrace). */
const CUT = 392;
const CYP = [
  { x: 370, z: 8.6, X: -8.3 },
  { x: 488, z: 10.6, X: -8.2 },
  { x: 1440, z: 10.4, X: 8.3 },
  { x: 1548, z: 8.9, X: 8.4 },
].map((c, i) => {
  const k = ppu(c.z);
  const w = 1.25 * k;
  const h = (8.6 - (i % 2)) * k;
  return { ...c, w, h, base: sy(WL.h, c.z) + 6, depth: clamp01((c.z - 4) / 12), seed: 40 + i * 7 };
});
const cypBox = (i: number): Box => {
  const c = CYP[i];
  const x = Math.max(0, Math.floor(c.x - c.w * 0.62));
  const x1 = Math.min(W, Math.ceil(c.x + c.w * 0.62));
  return { x, y: 0, w: x1 - x, h: CUT };
};

/** The cypress's half-width at t (0 base … 1 tip). */
const cypHalf = (t: number) => (t < 0.18 ? 0.42 + t * 0.4 : 0.5 * Math.pow(Math.max(0, 1 - (t - 0.18) / 0.82), 0.62)) * (1 + 0.04 * Math.sin(t * 40));

function cypress(ctx: Ctx, r: R, x: number, base: number, w: number, h: number, depth: number): void {
  const dark = airMix(LEAF.dark, depth, AIR);
  const body = airMix(LEAF.body, depth, AIR);
  const lit = airMix(LEAF.lit, depth, AIR);
  const warm = airMix('#9a7a5a', depth, AIR);
  // the mass
  ctx.beginPath();
  const n = 60;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    ctx.lineTo(x - cypHalf(t) * w * (0.92 + r() * 0.16), base - t * h);
  }
  for (let i = n; i >= 0; i--) {
    const t = i / n;
    ctx.lineTo(x + cypHalf(t) * w * (0.92 + r() * 0.16), base - t * h);
  }
  ctx.closePath();
  ctx.fillStyle = lin(ctx, [x - w / 2, 0], [x + w / 2, 0], [[0, body], [0.45, dark], [1, mix(dark, '#0a0c18', 0.4)]]);
  ctx.fill();
  // the sprays: tufts of foliage, each a little fan of scale-leaves, lit on the left, dark on the right
  const nt = Math.min(700, Math.round((w * h) / 70));
  for (let i = 0; i < nt; i++) {
    const t = Math.pow(r(), 0.9);
    const hw = cypHalf(t) * w;
    const u = (r() * 2 - 1) * 1.02;
    const tx = x + u * hw;
    const ty = base - t * h;
    const s = Math.max(1.5, w * (0.05 + r() * 0.06));
    const litK = clamp01(0.5 - u * 0.6 + (r() - 0.5) * 0.4);
    const col = litK > 0.75 ? mix(lit, warm, (litK - 0.75) * 2) : mix(dark, lit, litK);
    ctx.fillStyle = rgba(col, 0.55 + r() * 0.35);
    ctx.beginPath();
    const ang = -Math.PI / 2 + u * 0.5 + (r() - 0.5) * 0.6;
    ctx.ellipse(tx, ty, s * 0.55, s * 1.25, ang + Math.PI / 2, 0, P2);
    ctx.fill();
    if (r() < 0.4) {
      ctx.fillStyle = rgba(mix(dark, '#05080a', 0.5), 0.45);
      ctx.beginPath();
      ctx.ellipse(tx + s * 0.4, ty + s * 0.9, s * 0.5, s * 0.9, ang + Math.PI / 2, 0, P2);
      ctx.fill();
    }
  }
  // the afterglow along its western edge
  ctx.strokeStyle = rgba(warm, 0.35 * (1 - depth * 0.5));
  ctx.lineWidth = Math.max(1, w * 0.03);
  ctx.beginPath();
  for (let i = 4; i <= n; i++) {
    const t = i / n;
    ctx.lineTo(x - cypHalf(t) * w * 0.9, base - t * h);
  }
  ctx.stroke();
}

/** One cypress crown (a sprite): everything above CUT. */
function cypCrown(ctx: Ctx, i: number): void {
  const c = CYP[i];
  ctx.save();
  ctx.beginPath();
  ctx.rect(c.x - c.w, 0, c.w * 2, CUT);
  ctx.clip();
  cypress(ctx, rng(c.seed), c.x, c.base, c.w, c.h, c.depth);
  ctx.restore();
}

// ——— the court's walls ———
//
// Limestone ashlar in five courses, a projecting coping on top set with horns of consecration: one coping block to
// each pair of horns, the joints falling halfway between them (on the back wall, the joints fall behind the portico's
// columns and each bay shows one pair). The left wall faces east and is in deep shade; the right faces the west and
// its coping still holds a little of the afterglow. Ivy pours over the coping, damp and moss gather at the foot.

export const WALLS_BOX = { x: 0, y: CUT, w: W, h: 330 };
const COURSES = 5;
const NEAR_Z = 3.0;
/** The coping's blocks along the back wall (X joints) and the side walls (z joints): one pair of horns each. */
const BACK_JOINTS = [-7.2, -5.6, -4, -2.4, -0.8, 0.8, 2.4, 4, 5.6, 7.2];
const SIDE_STEP = 1.2;
const SIDE_JOINTS = Array.from({ length: 8 }, (_, i) => WL.z - i * SIDE_STEP);
const HORN = { w: 0.44, h: 0.3 };

/** Rough ashlar over a wall face: bed joints along Y, head joints staggered, each block its own tone. */
function ashlar(ctx: Ctx, r: R, map: (u: number, Y: number) => Pt, u0: number, u1: number, step: number, lit: number, base: string): void {
  const hs = [0.44, 0.36, 0.41, 0.33, 0.36];
  const tot = hs.reduce((a, b) => a + b, 0);
  const dir = Math.sign(u1 - u0);
  let Yc = 0;
  for (let c = 0; c < COURSES; c++) {
    const Y0 = Yc;
    const Y1 = (Yc += (hs[c] / tot) * WL.h);
    let u = u0 - dir * r() * step * 0.8;
    while ((u1 - u) * dir > 0) {
      const len = step * (0.7 + r() * 0.6);
      const ua = u;
      const ub = u + dir * len;
      const pts = [map(ua, Y0), map(ub, Y0), map(ub, Y1), map(ua, Y1)];
      const tone = shade(base, (r() - 0.5) * 0.14);
      ctx.fillStyle = rgba(tone, 0.5);
      polyPath(pts)(ctx);
      ctx.fill();
      // each block a cushion: its top catches the light, its foot falls into the joint's shadow
      ctx.fillStyle = lin(ctx, pts[3], pts[0], [[0, rgba('#e8d8c0', 0.08 * lit)], [0.25, rgba('#e8d8c0', 0)], [0.8, rgba('#1a1828', 0)], [1, rgba('#1a1828', 0.22)]]);
      ctx.fill();
      if (r() < 0.12) {
        // a spalled face: the skin of the block flaked off, a paler, rougher hollow under a crisp dark edge
        const sp = [lerp2p(pts[3], pts[2], 0.2), lerp2p(pts[3], pts[2], 0.7), lerp2p(lerp2p(pts[3], pts[0], 0.6), lerp2p(pts[2], pts[1], 0.6), 0.65), lerp2p(lerp2p(pts[3], pts[0], 0.7), lerp2p(pts[2], pts[1], 0.7), 0.25)];
        fillPath(ctx, polyPath(sp), rgba(shade(base, 0.12), 0.5));
        ctx.strokeStyle = rgba('#14121c', 0.5);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(...sp[0]);
        ctx.lineTo(...sp[1]);
        ctx.stroke();
      }
      // the head joint
      ctx.strokeStyle = rgba('#1a1622', 0.42);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(...pts[1]);
      ctx.lineTo(...pts[2]);
      ctx.stroke();
      u = ub;
    }
    // the bed joint: a dark recess, its lower lip lit
    const a = map(u0, Y1);
    const b = map(u1, Y1);
    ctx.strokeStyle = rgba('#141220', 0.5);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(...a);
    ctx.lineTo(...b);
    ctx.stroke();
    ctx.strokeStyle = rgba('#d8c8b8', 0.1 * lit + 0.04);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1] + 2);
    ctx.lineTo(b[0], b[1] + 2);
    ctx.stroke();
  }
}

/** A pair of horns of consecration standing on the coping, in the plane given by map (u along the wall, Y up). */
function horns(ctx: Ctx, map: (u: number, Y: number) => Pt, uc: number, Y0: number, lit: boolean, lw: number): void {
  const pts = HORNS.map(([u, v]) => map(uc + (u - 0.5) * HORN.w, Y0 + v * HORN.h));
  const path = polyPath(pts);
  const bb = boxOfPts(pts, 0);
  hornsPaint(ctx, path, bb, lit, lw, Math.max(1, lw * 0.9));
}

/** Ivy pouring over a wall's coping from (x, y), w wide, hanging len px: leafy strands, longest in the middle. */
function ivy(ctx: Ctx, r: R, x: number, y: number, w: number, len: number, s: number, depth = 0.3, litK = 0.5): void {
  const dark = airMix('#142418', depth, AIR);
  const body = airMix('#284a2c', depth, AIR);
  const lit = airMix('#5a7a40', depth, AIR);
  const n = Math.max(3, Math.round(w / (s * 2.2)));
  // the back of the mass: bigger, darker leaves in the shade behind the strands
  for (let i = 0; i < (w / s) * (len / s) * 0.12; i++) {
    const u = r();
    const t = Math.pow(r(), 1.5);
    leaf(ctx, r, x - w / 2 + u * w, y + t * len * Math.sin(u * Math.PI) * 0.8, s * (1.1 + r() * 0.5), mix(dark, '#05080a', 0.4), dark, body, 0.05);
  }
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const sx0 = x - w / 2 + u * w + (r() - 0.5) * s;
    const l = len * (0.35 + 0.65 * Math.sin(u * Math.PI)) * (0.6 + r() * 0.5) * (r() < 0.12 ? 1.7 : 1);
    ctx.strokeStyle = rgba(dark, 0.7);
    ctx.lineWidth = Math.max(0.8, s * 0.12);
    ctx.beginPath();
    ctx.moveTo(sx0, y);
    const bend = (r() - 0.5) * s * 2;
    ctx.quadraticCurveTo(sx0 + bend, y + l * 0.5, sx0 + bend * 0.4, y + l);
    ctx.stroke();
    const nl = Math.round(l / (s * 0.55));
    for (let j = 0; j < nl; j++) {
      const t = j / Math.max(1, nl);
      const lx = sx0 + bend * (2 * t * (1 - t)) + bend * 0.4 * t * t + (r() - 0.5) * s * 1.6 * (1 - t * 0.5);
      const ly = y + t * l + (r() - 0.5) * s * 0.4;
      leaf(ctx, r, lx, ly, s * (0.75 + r() * 0.5) * (1 - t * 0.3), dark, body, lit, litK);
    }
  }
  // the mat over the coping itself
  for (let i = 0; i < w / (s * 0.5); i++) {
    leaf(ctx, r, x - w / 2 + r() * w, y - s * 0.3 + (r() - 0.4) * s * 1.2, s * (0.8 + r() * 0.5), dark, body, lit, litK + 0.15);
  }
}

/** One ivy leaf: a three-lobed blade, lit on its upper left, a pale vein. */
function leaf(ctx: Ctx, r: R, x: number, y: number, s: number, dark: string, body: string, lit: string, litK: number): void {
  const a = (r() - 0.5) * 1.6;
  const k = clamp01(litK + (r() - 0.5) * 0.6);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  const blade = () => {
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.5);
    ctx.quadraticCurveTo(s * 0.55, -s * 0.55, s * 0.5, -s * 0.05);
    ctx.quadraticCurveTo(s * 0.4, s * 0.25, s * 0.12, s * 0.2);
    ctx.quadraticCurveTo(s * 0.1, s * 0.5, 0, s * 0.6);
    ctx.quadraticCurveTo(-s * 0.1, s * 0.5, -s * 0.12, s * 0.2);
    ctx.quadraticCurveTo(-s * 0.4, s * 0.25, -s * 0.5, -s * 0.05);
    ctx.quadraticCurveTo(-s * 0.55, -s * 0.55, 0, -s * 0.5);
    ctx.closePath();
  };
  if (s > 2.5) {
    ctx.save();
    ctx.translate(s * 0.18, s * 0.26);
    blade();
    ctx.fillStyle = 'rgba(6,8,10,0.35)';
    ctx.fill();
    ctx.restore();
  }
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.5);
  ctx.quadraticCurveTo(s * 0.55, -s * 0.55, s * 0.5, -s * 0.05);
  ctx.quadraticCurveTo(s * 0.4, s * 0.25, s * 0.12, s * 0.2);
  ctx.quadraticCurveTo(s * 0.1, s * 0.5, 0, s * 0.6);
  ctx.quadraticCurveTo(-s * 0.1, s * 0.5, -s * 0.12, s * 0.2);
  ctx.quadraticCurveTo(-s * 0.4, s * 0.25, -s * 0.5, -s * 0.05);
  ctx.quadraticCurveTo(-s * 0.55, -s * 0.55, 0, -s * 0.5);
  ctx.closePath();
  ctx.fillStyle = k > 0.6 ? mix(body, lit, (k - 0.6) * 2.2) : mix(dark, body, k / 0.6);
  ctx.fill();
  if (s > 3) {
    ctx.strokeStyle = rgba('#a8b880', 0.18);
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.4);
    ctx.lineTo(0, s * 0.45);
    ctx.stroke();
  }
  ctx.restore();
}

/** The side wall at X = sgn·WL.x: its face, courses, coping and horns, its foot in the damp. */
function sideWall(ctx: Ctx, r: R, sgn: number): void {
  const X = sgn * WL.x;
  const z1 = WL.z;
  const z0 = NEAR_Z;
  const faceP = sideAt(X, z0, z1, 0, WL.h);
  const map = (z: number, Y: number) => P(X, Y, z);
  const lit = sgn > 0 ? 1 : 0.35;
  const base = sgn > 0 ? mix(WALLC.body, '#9a8478', 0.25) : mix(WALLC.body, WALLC.shade, 0.35);
  const bb = boxOfPts([P(X, 0, z0), P(X, WL.h, z0), P(X, 0, z1), P(X, WL.h, z1)], 2);
  within(ctx, faceP, () => {
    surface(ctx, r, bb, base, { vary: 0.45, cells: 5, mottle: 0.4, strokes: 0.25, strokeAng: Math.PI / 2, strokeLen: 70, strokeW: 10, grain: 0.14, grainKind: 'speckle', seed: 21 + sgn });
    ashlar(ctx, r, map, z1, z0, 0.9, lit, base);
    // rain stains run down from under the coping; damp and moss rise at the foot
    for (let i = 0; i < 9; i++) {
      const z = z0 + 0.8 + r() * (z1 - z0 - 1.2);
      const [x, y] = P(X, WL.h, z);
      streaks(ctx, r, x, y, (30 * ppu(z)) / 100, WL.h * 0.7 * ppu(z), '#2a2834', 0.16, 3);
    }
    ctx.fillStyle = lin(ctx, P(X, 0.7, z0), P(X, 0, z0), [[0, rgba('#2a3420', 0)], [1, rgba('#2a3420', 0.45)]]);
    ctx.fillRect(bb.x, bb.y, bb.w, bb.h);
    lay(ctx, noiseMask(9, 31 + sgn, { cover: 0.3, soft: 0.2, col: MOSS[2], w: 160, h: 40 }), { x: bb.x, y: bb.y + bb.h * 0.6, w: bb.w, h: bb.h * 0.4 }, 0.5);
    // damp in great blotches where the water seeps through from the terrace behind
    lay(ctx, noiseMask(5, 35 + sgn, { cover: 0.42, soft: 0.3, col: '#1a1824', w: 120, h: 40 }), bb, 0.38);
    lay(ctx, noiseMask(11, 37 + sgn, { cover: 0.25, soft: 0.2, col: '#2a3424', w: 160, h: 40 }), bb, 0.25);
    // the wall in the dusk: the shaded one darker towards us, the lit one's afterglow fading down it
    if (sgn < 0) ctx.fillStyle = lin(ctx, [bb.x + bb.w, 0], [bb.x, 0], [[0, rgba('#1c1a2c', 0.18)], [1, rgba('#1c1a2c', 0.45)]]);
    else ctx.fillStyle = lin(ctx, [0, bb.y], [0, bb.y + bb.h], [[0, rgba('#ff9a70', 0.12)], [0.4, rgba('#ff9a70', 0)], [1, rgba('#1c1a2c', 0.3)]]);
    ctx.fillRect(bb.x, bb.y, bb.w, bb.h);
  });
  // the coping: a projecting slab, its top lit by the sky
  const Yc = WL.h;
  const Xo = X - sgn * 0.08;
  const capTop = quad(P(Xo, Yc + WL.cope, z0), P(Xo, Yc + WL.cope, z1), P(X + sgn * 0.3, Yc + WL.cope, z1), P(X + sgn * 0.3, Yc + WL.cope, z0));
  const capFace = quad(P(Xo, Yc, z0), P(Xo, Yc, z1), P(Xo, Yc + WL.cope, z1), P(Xo, Yc + WL.cope, z0));
  fillPath(ctx, capFace, sgn > 0 ? '#a8908a' : '#6a6478');
  fillPath(ctx, capTop, sgn > 0 ? '#d4b8a0' : '#8a8498');
  within(ctx, capFace, () => {
    const cb = boxOfPts([P(Xo, Yc, z0), P(Xo, Yc + WL.cope, z0), P(Xo, Yc, z1)], 4);
    grain(ctx, cb, 'speckle', 0.25, 0.9);
    if (sgn > 0) {
      ctx.fillStyle = lin(ctx, P(Xo, Yc, z1), P(Xo, Yc, z0), [[0, rgba('#ffb890', 0.35)], [1, rgba('#ffb890', 0.1)]]);
      ctx.fillRect(cb.x, cb.y, cb.w, cb.h);
    }
  });
  strokePath(ctx, capFace, rgba('#1a1622', 0.6), 1.2);
  // its blocks' joints (one pair of horns to each block) and the horns themselves
  for (const zj of SIDE_JOINTS) {
    if (zj <= z0 + 0.1) continue;
    const a = P(Xo, Yc, zj);
    const b = P(Xo, Yc + WL.cope, zj);
    ctx.strokeStyle = rgba('#1a1622', 0.6);
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(...a);
    ctx.lineTo(...b);
    ctx.stroke();
  }
  const hmap = (z: number, Y: number) => P(X + sgn * 0.05, Y, z);
  for (let i = 0; i < SIDE_JOINTS.length - 1; i++) {
    const zc = SIDE_JOINTS[i] - SIDE_STEP / 2;
    if (zc < 4.4) continue;
    horns(ctx, hmap, zc, Yc + WL.cope, false, Math.max(1, 1.6 * Math.min(1, 6 / zc)));
  }
  // the drip shadow under the coping
  const d0 = P(X, Yc, z0);
  const d1 = P(X, Yc, z1);
  ctx.strokeStyle = rgba('#141220', 0.45);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(d0[0], d0[1] + 2);
  ctx.lineTo(d1[0], d1[1] + 2);
  ctx.stroke();
}

function backWall(ctx: Ctx, r: R): void {
  const z = WL.z;
  const X0 = -WL.x;
  const X1 = WL.x;
  const faceP = faceAt(X0, X1, 0, WL.h, z);
  const bb = boxOfPts([P(X0, 0, z), P(X1, WL.h + WL.cope, z)], 2);
  within(ctx, faceP, () => {
    surface(ctx, r, bb, mix(WALLC.body, WALLC.shade, 0.5), { vary: 0.4, cells: 5, mottle: 0.4, strokes: 0.2, strokeAng: Math.PI / 2, strokeLen: 40, strokeW: 8, grain: 0.14, grainKind: 'speckle', seed: 23 });
    ashlar(ctx, r, (u, Y) => P(u, Y, z), X0, X1, 0.95, 0.5, WALLC.shade);
    for (let i = 0; i < 12; i++) {
      const X = X0 + r() * (X1 - X0);
      const [x, y] = P(X, WL.h, z);
      streaks(ctx, r, x, y, 18, WL.h * ppu(z) * 0.8, '#22202c', 0.18, 3);
    }
    lay(ctx, noiseMask(6, 39, { cover: 0.4, soft: 0.3, col: '#1a1824', w: 140, h: 24 }), bb, 0.35);
    vfill(ctx, bb.x, bb.y, bb.w, bb.h, [[0, rgba('#1c1a2c', 0.15)], [1, rgba('#1c1a2c', 0.5)]]);
  });
  // the coping and its horns, one pair to a block, the joints behind the columns
  const Yc = WL.h;
  const zf = z - 0.08;
  const capFace = faceAt(X0, X1, Yc, Yc + WL.cope, zf);
  fillPath(ctx, topAt(X0, X1, zf, z + 0.3, Yc + WL.cope), '#9a90a4');
  fillPath(ctx, capFace, '#7a7286');
  within(ctx, capFace, () => {
    grain(ctx, boxOfPts([P(X0, Yc, zf), P(X1, Yc + WL.cope, zf)], 2), 'speckle', 0.25, 0.9);
    // the afterglow on its western (left) end
    const [lx, ly] = P(X0, Yc, zf);
    ctx.fillStyle = lin(ctx, [lx, ly], [lx + 420, ly], [[0, rgba('#ffb08a', 0.28)], [1, rgba('#ffb08a', 0)]]);
    ctx.fillRect(lx, ly - 20, 420, 30);
  });
  for (const X of BACK_JOINTS) {
    const [x, y] = P(X, Yc, zf);
    ctx.strokeStyle = rgba('#1a1622', 0.6);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - WL.cope * ppu(zf));
    ctx.stroke();
  }
  for (let i = 0; i < BACK_JOINTS.length - 1; i++) {
    const Xc = (BACK_JOINTS[i] + BACK_JOINTS[i + 1]) / 2;
    horns(ctx, (u, Y) => P(u, Y, z - 0.02), Xc, Yc + WL.cope, Xc < -4, 1.2);
  }
  const [ax, ay] = P(X0, Yc, z);
  const [bx] = P(X1, Yc, z);
  ctx.strokeStyle = rgba('#141220', 0.45);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(ax, ay + 2);
  ctx.lineTo(bx, ay + 2);
  ctx.stroke();
  // the evening air thick between us and it
  vfill(ctx, bb.x, bb.y, bb.w, bb.h, [[0, rgba(AIR.color, 0.16)], [1, rgba(AIR.color, 0.06)]]);
  // the inner corners where the side walls meet it
  for (const s of [-1, 1]) {
    const [cx, cy0] = P(s * WL.x, WL.h, z);
    const [, cy1] = P(s * WL.x, 0, z);
    const g = ctx.createLinearGradient(cx, 0, cx - s * 40, 0);
    g.addColorStop(0, rgba('#0c0a14', 0.45));
    g.addColorStop(1, rgba('#0c0a14', 0));
    ctx.fillStyle = g;
    ctx.fillRect(Math.min(cx, cx - s * 40), cy0, 40, cy1 - cy0);
  }
}

function walls(ctx: Ctx, r: R): void {
  backWall(ctx, r);
  sideWall(ctx, r, -1);
  sideWall(ctx, r, 1);
  // the ivy over the coping: the side walls' heavy curtains, the back wall's lighter falls
  const iv = rng(77);
  for (const [X, z, w, l] of [[-7.2, 4.6, 1.6, 1.2], [-7.2, 6.3, 0.9, 0.7], [-7.2, 10.3, 1.2, 1.1], [7.2, 4.8, 1.3, 1.3], [7.2, 6.5, 0.8, 0.6], [7.2, 10.6, 1.0, 0.9], [-6.5, 11.4, 0.9, 1.3], [6.4, 11.4, 1.0, 1.2], [-1.6, 11.4, 0.6, 0.5], [3.2, 11.4, 0.5, 0.4]] as [number, number, number, number][]) {
    const [x, y] = P(X, WL.h + WL.cope, z);
    const k = ppu(z);
    const along = Math.abs(X) > 7 ? (Math.abs(X) * F * w) / (z * z) : w * k;
    ivy(ctx, iv, x, y, Math.max(16, along), l * k, Math.max(3, 0.1 * k), clamp01((z - 3) / 12) * 0.6, X > 0 ? 0.55 : 0.35);
  }
  // the garden pressing in from the terraces: more ivy over the side walls, and roots spilling over the coping
  for (const sg of [-1, 1]) {
    for (let z = 4.3; z < WL.z - 0.3; z += 0.55 + iv() * 0.6) {
      const quiet = sg < 0 ? z > 7.4 && z < 11 : z > 7.6 && z < 11;
      if (iv() < (quiet ? 0.35 : 0.65)) {
        const [x, y] = P(sg * WL.x, WL.h + WL.cope, z);
        const k = ppu(z);
        const w = (WL.x * F * (0.4 + iv() * 0.6)) / (z * z);
        ivy(ctx, iv, x, y, Math.max(12, w), (quiet ? 0.3 : 0.5 + iv() * 0.8) * k, Math.max(3, 0.1 * k), clamp01((z - 3) / 12) * 0.6, sg > 0 ? 0.5 : 0.3);
      }
      if (iv() < 0.3) root(ctx, iv, ...P(sg * (WL.x - 0.02), WL.h + WL.cope, z), (0.5 + iv() * 0.9) * ppu(z), ppu(z));
    }
  }
  for (const X of [-6.9, -3.2, 1.6, 5.0, 6.8]) root(ctx, iv, ...P(X, WL.h + WL.cope, WL.z - 0.06), (0.4 + iv() * 0.6) * ppu(WL.z), ppu(WL.z));
  // where the walls meet the floor: occlusion along their feet
  for (const s of [-1, 1]) {
    const a = P(s * WL.x, 0, NEAR_Z);
    const b = P(s * WL.x, 0, WL.z);
    ctx.strokeStyle = rgba('#0c0a14', 0.4);
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(...a);
    ctx.lineTo(...b);
    ctx.stroke();
  }
  const [fx0, fy] = P(-WL.x, 0, WL.z);
  const [fx1] = P(WL.x, 0, WL.z);
  crevice(ctx, fx0, fx1, fy, 10, 0.5, '#0c0a14');
}

/** A root from the terrace above spilling over the coping and down the wall's face: woody, twisting, tapering,
 * its rootlets clutching the joints. */
function root(ctx: Ctx, r: R, x: number, y: number, len: number, k: number): void {
  const pts: Pt[] = [[x, y - 0.06 * k]];
  let px = x;
  let py = y;
  let a = Math.PI / 2 + (r() - 0.5) * 0.6;
  for (let l = 0; l < len; ) {
    const st = 0.06 * k;
    a += (r() - 0.5) * 0.5;
    a += (Math.PI / 2 - a) * 0.2;
    px += Math.cos(a) * st;
    py += Math.sin(a) * st;
    pts.push([px, py]);
    l += st;
  }
  const w0 = Math.max(1.5, 0.045 * k);
  ctx.lineCap = 'round';
  for (let i = 0; i < pts.length - 1; i++) {
    const t = i / (pts.length - 1);
    const w = w0 * (1 - t * 0.8);
    ctx.strokeStyle = rgba('#0c0a10', 0.4);
    ctx.lineWidth = w + 1.5;
    ctx.beginPath();
    ctx.moveTo(pts[i][0] + 1.5, pts[i][1] + 1.5);
    ctx.lineTo(pts[i + 1][0] + 1.5, pts[i + 1][1] + 1.5);
    ctx.stroke();
    ctx.strokeStyle = '#2e2420';
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(...pts[i]);
    ctx.lineTo(...pts[i + 1]);
    ctx.stroke();
    ctx.strokeStyle = rgba('#8a7a68', 0.35);
    ctx.lineWidth = w * 0.3;
    ctx.beginPath();
    ctx.moveTo(pts[i][0] - w * 0.25, pts[i][1]);
    ctx.lineTo(pts[i + 1][0] - w * 0.25, pts[i + 1][1]);
    ctx.stroke();
    if (r() < 0.25) {
      const ra = a + (r() < 0.5 ? -1 : 1) * (0.8 + r() * 0.6);
      ctx.strokeStyle = '#2e2420';
      ctx.lineWidth = Math.max(0.7, w * 0.35);
      ctx.beginPath();
      ctx.moveTo(...pts[i]);
      ctx.quadraticCurveTo(pts[i][0] + Math.cos(ra) * w * 3, pts[i][1] + Math.sin(ra) * w * 2, pts[i][0] + Math.cos(ra) * w * 5, pts[i][1] + w * 4);
      ctx.stroke();
    }
  }
}

/** The two ivy curtains that stir (sprites): hanging over the side walls' coping. */
const IVY = [
  { id: 'ivyL', X: -7.2, z: 8.0, w: 1.1, l: 1.0, seed: 81 },
  { id: 'ivyR', X: 7.2, z: 8.3, w: 1.0, l: 0.95, seed: 83 },
].map((v) => {
  const [x, y] = P(v.X, WL.h + WL.cope, v.z);
  const k = ppu(v.z);
  const w = Math.max(16, (Math.abs(v.X) * F * v.w) / (v.z * v.z));
  return { ...v, x, y, k, pw: w, box: { x: Math.floor(x - w / 2 - 14), y: Math.floor(y - 10), w: Math.ceil(w + 28), h: Math.ceil(v.l * k + 22) } };
});
function ivyCurtain(ctx: Ctx, i: number): void {
  const v = IVY[i];
  ivy(ctx, rng(v.seed), v.x, v.y, v.pw, v.l * v.k, Math.max(3, 0.1 * v.k), 0.35, v.X > 0 ? 0.55 : 0.35);
}

// ——— the floor ———
//
// Big limestone flags, laid in rows across the court, their joints full of moss and grass; damp and darker round the
// pool, worn paler down the middle where feet have walked to the portico; the pool's green light pooled round it.

export const FLOOR_BOX = { x: 0, y: 526, w: W, h: TY - 526 + 2 };

const lerp2p = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

function floor(ctx: Ctx, r: R): void {
  const z0 = zFloor(TY + 2);
  const z1 = WL.z;
  const X = WL.x;
  const path = quad(P(-X, 0, z0), P(X, 0, z0), P(X, 0, z1), P(-X, 0, z1));
  const box = FLOOR_BOX;
  within(ctx, path, () => {
    vfill(ctx, 0, box.y, W, box.h, [[0, '#4a4658'], [0.5, '#5a5664'], [1, '#625c66']]);
    surface(ctx, r, box, '#5a5664', { over: true, vary: 0.4, cells: 6, mottle: 0.35, strokes: 0.15, strokeAng: 0, strokeLen: 200, strokeW: 5, grain: 0.12, grainKind: 'speckle', seed: 51 });
    // the flags: rows of different depths, each row's joints staggered, each flag its own tone
    let z = z0;
    let row = 0;
    while (z < z1) {
      const dz = 0.62 + r() * 0.5;
      const za = z;
      const zb = Math.min(z1, z + dz);
      let Xa = -X - r() * 1.2;
      while (Xa < X) {
        const wX = 0.9 + r() * 0.8;
        const Xb = Xa + wX;
        const ja = za + (r() - 0.5) * 0.06;
        const pts = [P(Xa, 0, ja), P(Xb, 0, ja + (r() - 0.5) * 0.05), P(Xb, 0, zb), P(Xa, 0, zb)];
        const pth = polyPath(pts);
        // its own front edge: the joint in front of it, ragged, soil and moss in it, sometimes a step up or down
        {
          const kk = ppu(za);
          const step = r() < 0.3 ? (r() - 0.5) * 0.025 * kk : 0;
          ctx.strokeStyle = rgba('#12160f', 0.62);
          ctx.lineWidth = Math.max(1, (0.022 + r() * 0.02) * kk);
          ctx.beginPath();
          for (let j = 0; j <= 5; j++) {
            const q = lerp2p(pts[0], pts[1], j / 5);
            const jy = q[1] + (j && j < 5 ? (r() - 0.5) * 2 : 0);
            if (j) ctx.lineTo(q[0], jy);
            else ctx.moveTo(q[0], jy);
          }
          ctx.stroke();
          if (step) {
            ctx.fillStyle = rgba(step > 0 ? '#b0a8bc' : '#08060c', 0.35);
            ctx.fillRect(pts[0][0], pts[0][1] + 1, pts[1][0] - pts[0][0], Math.abs(step));
          }
        }
        const kz = ppu((za + zb) / 2);
        ctx.fillStyle = rgba(r() < 0.5 ? '#77707a' : '#3e3a4a', 0.08 + r() * 0.14);
        pth(ctx);
        ctx.fill();
        // each slab settled its own way: tilted (lighter where it tips up to the sky, darker where it tips away),
        // sunk (a dark dish, a puddle in it catching the sky), or lifted at an edge by a root (a lit lip, a shadow)
        const kind = r();
        const [cx, cy] = P((Xa + Xb) / 2, 0, (za + zb) / 2);
        if (kind < 0.45) {
          const a = r() * P2;
          const rad = Math.max(wX * kz, 20) * 0.6;
          ctx.fillStyle = lin(ctx, [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad * 0.3], [cx - Math.cos(a) * rad, cy - Math.sin(a) * rad * 0.3], [[0, rgba('#a8a0b4', 0.24)], [1, rgba('#14121c', 0.28)]]);
          pth(ctx);
          ctx.fill();
        } else if (kind < 0.62) {
          within(ctx, pth, () => {
            lightPool(ctx, cx, cy, wX * kz * 0.5, dz * kz * 0.11, '#14121c', 0.5, 'source-over');
            if (r() < 0.8 && kz > 55 && Math.abs((Xa + Xb) / 2) > PL.X + 0.6) {
              // a puddle: the dusk sky lying in it, a dark rim
              const pr = wX * kz * (0.18 + r() * 0.15);
              ctx.fillStyle = rgba('#0c0a14', 0.4);
              ctx.beginPath();
              ctx.ellipse(cx + 1, cy + 1, pr * 1.06, pr * 0.24, 0, 0, P2);
              ctx.fill();
              ctx.fillStyle = lin(ctx, [cx, cy - pr * 0.22], [cx, cy + pr * 0.22], [[0, '#c88a84'], [1, '#5a4a70']]);
              ctx.beginPath();
              ctx.ellipse(cx, cy, pr, pr * 0.22, 0, 0, P2);
              ctx.fill();
              ctx.strokeStyle = rgba('#f0c8b0', 0.4);
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(cx - pr * 0.5, cy - pr * 0.05);
              ctx.lineTo(cx + pr * 0.2, cy - pr * 0.05);
              ctx.stroke();
            }
          });
        } else if (kind < 0.72) {
          // lifted at its far edge: the lip catches the sky, the joint behind is a black gap
          const [lx0, ly] = P(Xa, 0, zb);
          const [lx1] = P(Xb, 0, zb);
          ctx.fillStyle = rgba('#08060c', 0.6);
          ctx.fillRect(lx0, ly - 0.03 * kz, lx1 - lx0, 0.03 * kz);
          ctx.fillStyle = rgba('#b0a8bc', 0.4);
          ctx.fillRect(lx0, ly, lx1 - lx0, Math.max(1, 0.012 * kz));
        }
        // the head joint: ragged, its width varying, moss and soil in it
        ctx.strokeStyle = rgba('#141a12', 0.6);
        ctx.lineWidth = Math.max(1, (0.02 + r() * 0.02) * ppu(za));
        ctx.beginPath();
        for (let j = 0; j <= 4; j++) {
          const q = lerp2p(pts[1], pts[2], j / 4);
          const jx = q[0] + (j && j < 4 ? (r() - 0.5) * 3 : 0);
          if (j) ctx.lineTo(jx, q[1]);
          else ctx.moveTo(jx, q[1]);
        }
        ctx.stroke();
        Xa = Xb;
      }
      // the bed joint, moss in it
      const [ax, ay] = P(-X - 2, 0, za);
      const [bx] = P(X + 2, 0, za);
      const k = ppu(za);
      void bx;
      ctx.strokeStyle = rgba(MOSS[0], 0.35);
      ctx.lineWidth = Math.max(1, 0.02 * k);
      ctx.beginPath();
      for (let x = ax; x < bx; x += 6 + r() * 14) {
        const l = 2 + r() * 10 * (k / 100);
        ctx.moveTo(x, ay - 0.5);
        ctx.lineTo(x + l, ay - 0.5 + (r() - 0.5));
      }
      ctx.stroke();
      // tufts of grass in the joints, nearer and taller
      if (k > 50) {
        for (let i = 0; i < 14 + r() * 14; i++) {
          const gx = ax + r() * (bx - ax);
          grass(ctx, r, gx, ay, k * 0.05);
        }
      }
      z = zb;
      row++;
    }
    void row;
    // flags cracked and lifted by the roots under them: a crack, its lip catching the sky, a weed in it
    for (let i = 0; i < 26; i++) {
      const zz = z0 + Math.pow(r(), 0.8) * (z1 - z0);
      const XX = (r() * 2 - 1) * X;
      if (Math.abs(XX) < PL.X + 0.3 && zz > PL.z0 - 0.3 && zz < PL.z1 + 0.3) continue;
      const [cx, cy] = P(XX, 0, zz);
      const k = ppu(zz);
      crack(ctx, r, cx, cy, (r() - 0.5) * 0.5 + (r() < 0.5 ? 0 : Math.PI), 0.5 * k, { col: '#14121c', lip: '#9a94a8', w: Math.max(1, 0.02 * k), a: 0.6, branch: 0.3 });
      if (k > 60 && r() < 0.6) grass(ctx, r, cx + (r() - 0.5) * 0.2 * k, cy, k * 0.07);
    }
    // the walk to the portico, worn paler; damp round the pool
    softly(ctx, box, (g) => {
      const [cx, cy] = P(0, 0, 9.3);
      g.fillStyle = rgba('#8a8496', 0.1);
      g.beginPath();
      g.ellipse(cx, cy, 160, 14, 0, 0, P2);
      g.fill();
      for (const s of [-1, 1]) {
        g.strokeStyle = rgba('#1c2420', 0.4);
        g.lineWidth = 26;
        g.beginPath();
        g.moveTo(...P(s * (PL.X + 0.15), 0, PL.z0 - 0.1));
        g.lineTo(...P(s * (PL.X + 0.15), 0, PL.z1 + 0.1));
        g.stroke();
      }
    }, 0.25);
    // roots from the terraces heaving up through the paving along the walls
    for (const [sg, zr] of [[-1, 4.6], [-1, 7.8], [1, 5.4], [1, 9.2]] as Pt[]) {
      const pts2: Pt[] = [];
      for (let t = 0; t <= 1; t += 0.1) pts2.push(P(sg * (WL.x - t * 1.6), 0.02 + Math.sin(t * Math.PI) * 0.05, zr + Math.sin(t * 5) * 0.25 - t * 0.4));
      const kk = ppu(zr);
      ctx.lineCap = 'round';
      for (const [col, w, oy] of [['#08060c', 0.07, 2], ['#2e2420', 0.05, 0], ['#6a5a48', 0.015, -1.5]] as [string, number, number][]) {
        ctx.strokeStyle = col === '#08060c' ? rgba(col, 0.45) : col;
        ctx.lineWidth = w * kk;
        ctx.beginPath();
        pts2.forEach(([px, py], j) => (j ? ctx.lineTo(px, py + oy) : ctx.moveTo(px, py + oy)));
        ctx.stroke();
      }
    }
    // drifts of cypress needles blown against the walls' feet
    for (let i = 0; i < 500; i++) {
      const sg = r() < 0.5 ? -1 : 1;
      const zz = z0 + r() * (z1 - z0);
      const XX = sg * (WL.x - Math.pow(r(), 2.5) * 1.1);
      const [x, y] = P(XX, 0, zz);
      const k = ppu(zz);
      ctx.strokeStyle = rgba(r() < 0.5 ? '#5a4628' : '#3a3420', 0.7);
      ctx.lineWidth = Math.max(0.6, 0.008 * k);
      const a = r() * P2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * 0.03 * k, y + Math.sin(a) * 0.01 * k);
      ctx.stroke();
    }
    // fallen cypress sprigs, needles and dead leaves
    for (let i = 0; i < 160; i++) {
      const zz = z0 + Math.pow(r(), 0.7) * (z1 - z0);
      const XX = (r() * 2 - 1) * X;
      if (Math.abs(XX) < PL.X + 0.4 && zz > PL.z0 - 0.3 && zz < PL.z1 + 0.3) continue;
      const [x, y] = P(XX, 0, zz);
      const k = ppu(zz);
      if (r() < 0.5) {
        ctx.fillStyle = rgba(['#6a4a26', '#8a6a34', '#4a3a22'][Math.floor(r() * 3)], 0.75);
        ctx.beginPath();
        ctx.ellipse(x, y, 0.04 * k, 0.012 * k, (r() - 0.5) * 0.8, 0, P2);
        ctx.fill();
      }
    }
    for (let i = 0; i < 70; i++) {
      const zz = z0 + Math.pow(r(), 0.7) * (z1 - z0);
      const XX = (r() * 2 - 1) * X;
      if (Math.abs(XX) < PL.X + 0.4 && zz > PL.z0 - 0.3 && zz < PL.z1 + 0.3) continue;
      const [x, y] = P(XX, 0, zz);
      const k = ppu(zz);
      ctx.strokeStyle = rgba(r() < 0.5 ? '#3a3020' : '#2a3420', 0.5);
      ctx.lineWidth = Math.max(0.8, k * 0.012);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (r() - 0.5) * k * 0.12, y + (r() - 0.5) * k * 0.02);
      ctx.stroke();
    }
    // the pool's green light on the floor round it, and the dusk falling off towards us
    lightPool(ctx, ...P(0, 0, 6.2), 680, 110, GLOW, 0.15);
    lightPool(ctx, ...P(0, 0, 9.4), 340, 26, GLOW, 0.04);
    vfill(ctx, 0, box.y, W, box.h, [[0, rgba('#1a1828', 0.05)], [1, rgba('#1a1828', 0.22)]]);
  });
}

/** A tuft of grass: a few blades, lit on the left. */
function grass(ctx: Ctx, r: R, x: number, y: number, h: number): void {
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (r() - 0.5) * 1.1;
    const l = h * (0.5 + r() * 0.7);
    ctx.strokeStyle = rgba(r() < 0.6 ? '#4a5a2a' : '#6a7a3a', 0.7);
    ctx.lineWidth = Math.max(0.8, h * 0.1);
    ctx.beginPath();
    ctx.moveTo(x + (r() - 0.5) * h * 0.3, y);
    ctx.quadraticCurveTo(x + Math.cos(a) * l * 0.5, y + Math.sin(a) * l * 0.6, x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
}

// ——— the portico ———
//
// Three steps, eight red Minoan columns (tapering downwards, black cushion capitals), a limestone architrave whose
// blocks meet over the columns' centres, a frieze of running spirals, and over it all a pediment carved with the
// Gorgoneion. Horns of consecration stand as its acroteria. The right-hand bay has fallen: its column snapped, the
// architrave and the pediment's corner broken away, the drum and capital lying on the steps.

const ST = MD.stylo;
const CO = MD.cols;
const EN = MD.ent;
const PD = MD.ped;
const stepZ = (i: number) => ST.z0 + i * ST.tread;
const TOPZ = stepZ(3);
/** Where the ruin breaks off the entablature and the pediment (X). */
const BREAK_X = 4.62;
export const PORTICO_BOX = (() => {
  const a = P(-PD.X - 0.3, 0, ST.z0 - 0.5);
  const b = P(PD.X + 0.3, EN.Y1 + PD.h + 0.6, EN.z);
  return { x: Math.floor(a[0] - 4), y: Math.floor(b[1] - 4), w: Math.ceil(b[0] - a[0] + 8), h: Math.ceil(a[1] - b[1] + 12) };
})();
const DRUMS = { z: 9.35, X0: 4.5, X1: 6.05, r: 0.2 };

/** A Minoan column (tapering down): shaft, black cushion capital, square abacus. Returns its silhouette. */
function redColumn(ctx: Ctx, r: R, X: number, z: number, Y0: number, Y1: number, broken = 0): void {
  const k = ppu(z);
  const capH = 0.22;
  const top = broken ? Y0 + broken : Y1 - capH;
  const rt = CO.r0 + (CO.r1 - CO.r0) * ((top - Y0) / (Y1 - capH - Y0));
  const [bx, by] = P(X, Y0, z);
  const [, ty] = P(X, top, z);
  const shaft = (c: Ctx) => {
    c.beginPath();
    c.moveTo(bx - CO.r0 * k, by);
    c.lineTo(bx - rt * k, ty);
    if (broken) {
      // a jagged break
      const n = 6;
      for (let i = 1; i < n; i++) c.lineTo(bx - rt * k + (2 * rt * k * i) / n, ty - (i % 2 ? 6 : -2) * (k / 60) * (0.6 + r() * 0.8));
    }
    c.lineTo(bx + rt * k, ty);
    c.lineTo(bx + CO.r0 * k, by);
    c.closePath();
  };
  // lit faintly from the sky on the left, the pool's green coming up its front, deep shade on the right
  const g = ctx.createLinearGradient(bx - rt * k, 0, bx + rt * k, 0);
  g.addColorStop(0, mix(COLUMN.body, '#6a3a4a', 0.4));
  g.addColorStop(0.22, mix(COLUMN.lit, '#b0606a', 0.55));
  g.addColorStop(0.5, mix(COLUMN.body, '#5a2a3a', 0.35));
  g.addColorStop(0.85, mix(COLUMN.shade, '#1a1428', 0.35));
  g.addColorStop(1, '#2a1a2c');
  shaft(ctx);
  ctx.fillStyle = g;
  ctx.fill();
  within(ctx, shaft, () => {
    const bb = { x: bx - rt * k, y: ty, w: rt * k * 2, h: by - ty };
    lay(ctx, noiseMask(9, Math.round(X * 100 + 7), { cover: 0.16, soft: 0.06, col: '#a89888', w: 24, h: 140 }), bb, 0.22);
    lay(ctx, drift('#d06a5a', '#2a0c14', 5, Math.round(X * 31 + 3), 20, 80), bb, 0.28);
    // the capital's shadow at the top, the pool's green at the foot
    if (!broken) vfill(ctx, bb.x, ty, bb.w, bb.h * 0.2, [[0, rgba('#120c10', 0.55)], [1, rgba('#120c10', 0)]]);
    vfill(ctx, bb.x, by - bb.h * 0.45, bb.w, bb.h * 0.45, [[0, rgba(GLOW, 0)], [1, rgba(GLOW, 0.18 * (1 - Math.abs(X) / 9))]]);
    // moss up its foot
    lay(ctx, noiseMask(5, Math.round(X * 13 + 2), { cover: 0.45, soft: 0.2, col: MOSS[0], w: 16, h: 40 }), { x: bb.x, y: by - bb.h * 0.25, w: bb.w, h: bb.h * 0.25 }, 0.6);
  });
  ctx.strokeStyle = '#1a1018';
  ctx.lineWidth = Math.max(1, k * 0.022);
  shaft(ctx);
  ctx.stroke();
  if (broken) {
    // the broken top: the pale stone inside the red paint
    ctx.fillStyle = rgba('#b8a898', 0.6);
    ctx.beginPath();
    ctx.ellipse(bx, ty - 1, rt * k * 0.9, rt * k * 0.25, 0, 0, P2);
    ctx.fill();
  } else {
    // the capital: a black cushion and the square abacus over it
    const [, cy0] = P(X, top, z);
    const [, cy1] = P(X, top + capH * 0.55, z);
    const [, cy2] = P(X, Y1, z);
    const cw = CO.r1 * 1.55 * k;
    const cush = (c: Ctx) => {
      c.beginPath();
      c.moveTo(bx - rt * k, cy0);
      c.bezierCurveTo(bx - cw * 1.08, cy0 - (cy0 - cy1) * 0.2, bx - cw * 1.1, cy1 + (cy0 - cy1) * 0.1, bx - cw, cy1);
      c.lineTo(bx + cw, cy1);
      c.bezierCurveTo(bx + cw * 1.1, cy1 + (cy0 - cy1) * 0.1, bx + cw * 1.08, cy0 - (cy0 - cy1) * 0.2, bx + rt * k, cy0);
      c.closePath();
    };
    cush(ctx);
    ctx.fillStyle = lin(ctx, [bx - cw, 0], [bx + cw, 0], [[0, '#3a3040'], [0.3, '#4a4050'], [0.65, '#1c1620'], [1, '#0c0a10']]);
    ctx.fill();
    ctx.strokeStyle = '#0a080c';
    ctx.stroke();
    ctx.fillStyle = '#2a2430';
    ctx.fillRect(bx - cw * 1.06, cy2, cw * 2.12, cy1 - cy2);
    ctx.fillStyle = rgba('#a8a0b0', 0.3);
    ctx.fillRect(bx - cw * 1.06, cy2, cw * 2.12, Math.max(1, (cy1 - cy2) * 0.25));
    ctx.strokeRect(bx - cw * 1.06, cy2, cw * 2.12, cy1 - cy2);
  }
  // its base: a limestone disc on the step, and occlusion round it
  ctx.fillStyle = '#6a6474';
  ctx.beginPath();
  ctx.ellipse(bx, by, CO.r0 * k * 1.6, CO.r0 * k * 0.42, 0, 0, P2);
  ctx.fill();
  ctx.fillStyle = rgba('#0c0a14', 0.35);
  ctx.beginPath();
  ctx.ellipse(bx + 3, by + 2, CO.r0 * k * 1.9, CO.r0 * k * 0.45, 0, 0, Math.PI);
  ctx.fill();
}

/** The Gorgoneion, carved in relief out of the pediment's own stone, front-on, archaic: her broad round face, the
 * brows knotted over staring eyes (their drilled pupils once held green glass), the flat nose, the grin stretched from
 * cheek to cheek with its tusks and the tongue lolling over her chin, and her hair of snakes writhing out round it.
 * Every raised form is lit on its upper left and drops a shadow to the lower right; the mouth and the eye sockets are
 * cut in. Weathered as the pediment is: grain, chips, a crack, moss in the hollows, dark streaks. Centre (cx, cy),
 * face radius R (px). */
export function gorgoneion(c: Ctx, cx: number, cy: number, R: number, eyes = 0.5): void {
  const sc = c.getTransform().a || 1;
  const base = '#7a7290';
  const lit = '#d8c0b8';
  const dark = '#18141e';
  const rr = rng(9091);
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  /** A raised form: its shadow on the ground behind, the stone, the light on its upper left, the shade on its lower right. */
  const raised = (path: (g: Ctx) => void, h: number, col = base) => {
    c.save();
    c.shadowColor = rgba(dark, 0.65);
    c.shadowBlur = h * 1.4 * sc;
    c.shadowOffsetX = h * 0.7 * sc;
    c.shadowOffsetY = h * 0.9 * sc;
    path(c);
    c.fillStyle = col;
    c.fill();
    c.restore();
    innerEdge(c, path, rgba(lit, 0.75), h * 0.9, h * 0.6, h * 0.7);
    innerEdge(c, path, rgba(dark, 0.6), h * 0.9, -h * 0.55, -h * 0.65);
  };
  /** A form cut into the stone: in shade on its upper left, catching the light on its lower right. */
  const cut = (path: (g: Ctx) => void, h: number, col = '#3a3446') => {
    path(c);
    c.fillStyle = col;
    c.fill();
    innerEdge(c, path, rgba(dark, 0.85), h * 1.1, h * 0.7, h * 0.8);
    innerEdge(c, path, rgba(lit, 0.45), h * 0.6, -h * 0.4, -h * 0.5);
  };
  const tube = (pts: Pt[], w0: number, w1: number) => {
    const L: Pt[] = [];
    const Rr: Pt[] = [];
    pts.forEach((p, i) => {
      const q = pts[Math.min(pts.length - 1, i + 1)];
      const o = pts[Math.max(0, i - 1)];
      const dx = q[0] - o[0];
      const dy = q[1] - o[1];
      const l = Math.hypot(dx, dy) || 1;
      const w = w0 + (w1 - w0) * (i / (pts.length - 1));
      L.push([p[0] - (dy / l) * w, p[1] + (dx / l) * w]);
      Rr.push([p[0] + (dy / l) * w, p[1] - (dx / l) * w]);
    });
    return polyPath([...L, ...Rr.reverse()]);
  };
  // the snakes: thirteen writhing out from her scalp, each tapering to its tail behind its raised head
  for (let i = 0; i < 13; i++) {
    const a = Math.PI * (0.98 + (i / 12) * 1.04);
    const len = 0.6 + (i % 3) * 0.12;
    const wig = i * 1.3;
    const pts: Pt[] = [];
    for (let t = 0; t <= 1.0001; t += 1 / 14) {
      const rad = R * (0.85 + t * len);
      const aa = a + Math.sin(t * Math.PI * 2.2 + wig) * 0.2 * t;
      pts.push([cx + Math.cos(aa) * rad, cy + Math.sin(aa) * rad]);
    }
    raised(tube(pts, R * 0.075, R * 0.04), R * 0.05);
    // scales cut along the back
    for (let j = 2; j < pts.length - 1; j += 2) {
      c.strokeStyle = rgba(dark, 0.35);
      c.lineWidth = R * 0.012;
      c.beginPath();
      c.arc(pts[j][0], pts[j][1], R * 0.035, 0, Math.PI);
      c.stroke();
    }
    const [hx, hy] = pts[pts.length - 1];
    const [px, py] = pts[pts.length - 2];
    const ang = Math.atan2(hy - py, hx - px);
    raised((g) => {
      g.beginPath();
      g.ellipse(hx + Math.cos(ang) * R * 0.05, hy + Math.sin(ang) * R * 0.05, R * 0.09, R * 0.06, ang, 0, P2);
    }, R * 0.05);
    c.fillStyle = dark;
    c.beginPath();
    c.arc(hx + Math.cos(ang - 0.6) * R * 0.06, hy + Math.sin(ang - 0.6) * R * 0.06, R * 0.014, 0, P2);
    c.fill();
  }
  // the face: a broad, high boss of stone
  const face = (g: Ctx) => {
    g.beginPath();
    g.ellipse(cx, cy, R, R * 0.97, 0, 0, P2);
  };
  raised(face, R * 0.12);
  c.save();
  face(c);
  c.clip();
  const fg = c.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R * 1.05);
  fg.addColorStop(0, rgba(lit, 0.35));
  fg.addColorStop(0.6, rgba(lit, 0));
  fg.addColorStop(1, rgba(dark, 0.25));
  c.fillStyle = fg;
  c.fillRect(cx - R, cy - R, R * 2, R * 2);
  c.restore();
  // her cheeks, swelling
  for (const sg of [-1, 1]) raised((g) => {
    g.beginPath();
    g.ellipse(cx + sg * R * 0.55, cy + R * 0.18, R * 0.26, R * 0.22, 0, 0, P2);
  }, R * 0.04);
  // the brows: heavy ridges knotted in a scowl
  for (const sg of [-1, 1]) raised(tube([[cx + sg * R * 0.06, cy - R * 0.22], [cx + sg * R * 0.3, cy - R * 0.44], [cx + sg * R * 0.62, cy - R * 0.32]], R * 0.06, R * 0.04), R * 0.05);
  // the eyes: deep sockets, the staring balls, the pupils drilled (the glass in them still catches a little green)
  for (const sg of [-1, 1]) {
    const ex = cx + sg * R * 0.35;
    const ey = cy - R * 0.13;
    cut((g) => {
      g.beginPath();
      g.ellipse(ex, ey, R * 0.21, R * 0.16, 0, 0, P2);
    }, R * 0.05);
    raised((g) => {
      g.beginPath();
      g.ellipse(ex, ey + R * 0.01, R * 0.15, R * 0.11, 0, 0, P2);
    }, R * 0.03, '#857d98');
    c.fillStyle = '#0c0a10';
    c.beginPath();
    c.arc(ex, ey + R * 0.01, R * 0.055, 0, P2);
    c.fill();
    c.fillStyle = rgba(mix('#2a6a3a', GLOW, eyes), 0.55);
    c.beginPath();
    c.arc(ex - R * 0.01, ey, R * 0.035, 0, P2);
    c.fill();
  }
  // the nose: broad and flat, its nostrils flared
  raised(polyPath([[cx - R * 0.07, cy - R * 0.16], [cx + R * 0.07, cy - R * 0.16], [cx + R * 0.2, cy + R * 0.17], [cx, cy + R * 0.24], [cx - R * 0.2, cy + R * 0.17]]), R * 0.06);
  for (const sg of [-1, 1]) {
    c.fillStyle = rgba(dark, 0.85);
    c.beginPath();
    c.ellipse(cx + sg * R * 0.11, cy + R * 0.18, R * 0.045, R * 0.028, 0, 0, P2);
    c.fill();
  }
  // the grin: cut deep from cheek to cheek
  const mouth = (g: Ctx) => {
    g.beginPath();
    g.moveTo(cx - R * 0.62, cy + R * 0.3);
    g.quadraticCurveTo(cx, cy + R * 0.42, cx + R * 0.62, cy + R * 0.3);
    g.quadraticCurveTo(cx + R * 0.42, cy + R * 0.74, cx, cy + R * 0.76);
    g.quadraticCurveTo(cx - R * 0.42, cy + R * 0.74, cx - R * 0.62, cy + R * 0.3);
    g.closePath();
  };
  cut(mouth, R * 0.08, '#2a2434');
  c.save();
  mouth(c);
  c.clip();
  // the teeth along the top, carved
  for (let i = -3; i <= 3; i++) {
    const tx = cx + i * R * 0.12;
    const ty = cy + R * (0.37 + (1 - Math.abs(i) / 4) * 0.04);
    raised((g) => {
      g.beginPath();
      g.rect(tx - R * 0.045, ty, R * 0.09, R * 0.08);
    }, R * 0.02, '#8a829c');
  }
  c.restore();
  // the tusks: up from the lower jaw, down from the upper
  for (const sg of [-1, 1]) {
    raised(polyPath([[cx + sg * R * 0.42, cy + R * 0.36], [cx + sg * R * 0.5, cy + R * 0.68], [cx + sg * R * 0.31, cy + R * 0.4]]), R * 0.03, '#8e86a0');
    raised(polyPath([[cx + sg * R * 0.25, cy + R * 0.72], [cx + sg * R * 0.31, cy + R * 0.44], [cx + sg * R * 0.15, cy + R * 0.72]]), R * 0.03, '#8e86a0');
  }
  // the tongue, lolling out over her chin, the old red still in its groove
  raised((g) => {
    g.beginPath();
    g.moveTo(cx - R * 0.16, cy + R * 0.58);
    g.quadraticCurveTo(cx - R * 0.2, cy + R * 0.98, cx, cy + R * 1.02);
    g.quadraticCurveTo(cx + R * 0.2, cy + R * 0.98, cx + R * 0.16, cy + R * 0.58);
    g.closePath();
  }, R * 0.06, mix(base, '#8a4a40', 0.35));
  c.strokeStyle = rgba('#5a2020', 0.5);
  c.lineWidth = R * 0.025;
  c.beginPath();
  c.moveTo(cx, cy + R * 0.62);
  c.lineTo(cx, cy + R * 0.92);
  c.stroke();
  // the weather on her: grain, a crack across her brow, chips off the snakes' coils, moss in the hollows, streaks
  const box = { x: cx - R * 1.8, y: cy - R * 1.8, w: R * 3.6, h: R * 3.6 };
  const [sil, sg] = makeCanvas(c.canvas.width, c.canvas.height);
  sg.drawImage(c.canvas, 0, 0);
  grain(c, box, 'speckle', 0.35, 0.6);
  lay(c, noiseMask(6, 9093, { cover: 0.35, soft: 0.25, col: '#2a2434', w: 40, h: 40 }), box, 0.3);
  crack(c, rr, cx + R * 0.5, cy - R * 0.75, Math.PI * 0.62, R * 0.9, { col: '#100c14', lip: lit, w: R * 0.03, a: 0.7, branch: 0.15 });
  for (const [mx, my] of [[cx - R * 0.5, cy - R * 0.4], [cx + R * 0.3, cy + R * 0.75], [cx - R * 0.8, cy + R * 0.1], [cx + R * 0.9, cy - R * 0.5]] as Pt[]) moss(c, rr, mx, my, R * 0.18, R * 0.08, 0.3);
  streaks(c, rr, cx - R * 0.3, cy + R * 0.7, R * 0.4, R * 0.8, '#14101a', 0.3, 3);
  streaks(c, rr, cx + R * 0.45, cy + R * 0.6, R * 0.3, R * 0.6, '#14101a', 0.25, 2);
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = 'destination-in';
  c.drawImage(sil, 0, 0);
  c.restore();
}

/** The Gorgoneion's place on the pediment (screen) and its face radius. */
export const GORGON = (() => {
  const [x, y] = P(0, EN.Y1 + 0.8, EN.z - 0.05);
  return { x, y, R: 0.6 * ppu(EN.z) };
})();
/** Her eyes on the pediment (for the live layer's glows). */
export const GORGON_EYES: Pt[] = [-1, 1].map((s) => [GORGON.x + s * GORGON.R * 0.36, GORGON.y - GORGON.R * 0.14] as Pt);

function portico(ctx: Ctx, r: R): void {
  const zf = EN.z;
  // ——— the steps (far to near: the platform, then each tread and riser) ———
  const stoneTop = '#7a7484';
  const stoneFace = '#5c5668';
  fillPath(ctx, topAt(-ST.X, ST.X, TOPZ, WL.z, 0.45), stoneTop);
  for (let i = 2; i >= 0; i--) {
    const Yt = (i + 1) * ST.rise;
    const za = stepZ(i);
    const zb = stepZ(i + 1);
    const tread = topAt(-ST.X - i * 0.05, ST.X + i * 0.05, za, zb, Yt);
    fillPath(ctx, tread, mix(stoneTop, '#8a8494', 0.3));
    within(ctx, tread, () => {
      const bb = boxOfPts([P(-ST.X, Yt, za), P(ST.X, Yt, zb)], 2);
      grain(ctx, bb, 'speckle', 0.22, 0.9);
      lay(ctx, noiseMask(14, 60 + i, { cover: 0.25, soft: 0.15, col: MOSS[0], w: 200, h: 12 }), bb, 0.5);
    });
    const riser = faceAt(-ST.X - i * 0.05, ST.X + i * 0.05, Yt - ST.rise, Yt, za);
    fillPath(ctx, riser, stoneFace);
    within(ctx, riser, () => {
      const bb = boxOfPts([P(-ST.X, Yt - ST.rise, za), P(ST.X, Yt, za)], 2);
      grain(ctx, bb, 'speckle', 0.25, 0.9);
      // the pool's green on the risers, strongest at the middle of the lowest
      lightPool(ctx, 960, bb.y + bb.h / 2, 420, 40, GLOW, 0.07 + (2 - i) * 0.03);
      // the joints of its blocks
      for (let X = -ST.X + 0.4 + r() * 0.5; X < ST.X; X += 0.9 + r() * 0.6) {
        const [jx, jy] = P(X, Yt - ST.rise, za);
        ctx.strokeStyle = rgba('#1a1622', 0.5);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(jx, jy);
        ctx.lineTo(jx, jy - ST.rise * ppu(za));
        ctx.stroke();
      }
    });
    // the nosing: a lit arris, chipped
    const [nx0, ny] = P(-ST.X - i * 0.05, Yt, za);
    const [nx1] = P(ST.X + i * 0.05, Yt, za);
    ctx.fillStyle = rgba('#b8b0c0', 0.45);
    ctx.fillRect(nx0, ny - 1, nx1 - nx0, 1.5);
    chips(ctx, r, nx0, nx1, ny, 10, '#7a7484', 2.5);
    // the next tread's shadow on this riser's top
    crevice(ctx, nx0, nx1, ny - ST.rise * ppu(za) * 0, 3, 0.3, '#0c0a14');
  }
  // ——— the columns ———
  for (const X of CO.X) {
    if (X > BREAK_X) redColumn(ctx, r, X, CO.z, CO.Y0, CO.Y0 + CO.h, 1.25);
    else redColumn(ctx, r, X, CO.z, CO.Y0, CO.Y0 + CO.h);
  }
  // ——— the entablature, broken off over the last bay ———
  const Y0 = EN.Y0;
  const Ya = Y0 + 0.32;
  const Yf = EN.Y1 - 0.1;
  const Y1 = EN.Y1;
  const XL = -EN.X;
  const XR = BREAK_X;
  const brk = (Yb: number, Yt: number, X: number, j: number) => {
    const pts: Pt[] = [];
    const n = 5;
    for (let i = 0; i <= n; i++) pts.push(P(X + Math.sin(i * 1.7 + j) * 0.12 + (i % 2) * 0.08, Yt - ((Yt - Yb) * i) / n, zf));
    return pts;
  };
  const archPts = [P(XL, Y0, zf), P(XL, Ya, zf), ...brk(Y0, Ya, XR + 0.25, 1)] as Pt[];
  const arch = polyPath(archPts);
  fillPath(ctx, arch, '#8a8296');
  within(ctx, arch, () => {
    const bb = boxOfPts(archPts, 2);
    surface(ctx, r, bb, '#7e788a', { vary: 0.4, cells: 4, mottle: 0.4, strokes: 0, grain: 0.2, grainKind: 'speckle', seed: 90 });
    vfill(ctx, bb.x, bb.y, bb.w, bb.h, [[0, rgba('#e8d0c0', 0.12)], [0.3, rgba('#e8d0c0', 0)], [1, rgba('#141220', 0.35)]]);
    // the blocks meet over the columns' centres
    for (const X of CO.X) {
      if (X > XR) continue;
      const [jx, jy] = P(X, Y0, zf);
      ctx.strokeStyle = rgba('#141220', 0.6);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(jx, jy);
      ctx.lineTo(jx, jy - (Ya - Y0) * ppu(zf));
      ctx.stroke();
    }
    // a crack where the broken bay pulled on it
    crack(ctx, r, ...P(XR - 0.6, Ya - 0.02, zf), 1.9, 16, { col: '#141018', lip: '#c8c0d0', w: 1.1, a: 0.6 });
  });
  strokePath(ctx, arch, '#141018', 1.4);
  const friezePts = [P(XL, Ya, zf), P(XL, Yf, zf), ...brk(Ya, Yf, XR + 0.05, 2)] as Pt[];
  const frieze = polyPath(friezePts);
  fillPath(ctx, frieze, '#6a6274');
  within(ctx, frieze, () => {
    const bb = boxOfPts(friezePts, 2);
    // its painted band of running spirals, faded: blue-black on ochre, the paint mostly gone
    ctx.fillStyle = rgba('#b08a5a', 0.3);
    ctx.fillRect(bb.x, bb.y, bb.w, bb.h);
    const [, fy] = P(0, (Ya + Yf) / 2, zf);
    spirals(ctx, bb.x - 10, bb.x + bb.w, fy, 0.5 * ppu(zf), 0.09 * ppu(zf), rgba('#1e2a3a', 0.55), rgba('#1e2a3a', 0.4), 1.6);
    lay(ctx, noiseMask(8, 93, { cover: 0.4, soft: 0.2, col: '#6a6274', w: 120, h: 10 }), bb, 0.7);
    grain(ctx, bb, 'speckle', 0.22, 0.9);
  });
  strokePath(ctx, frieze, '#141018', 1.2);
  // the cornice: a projecting slab, its underside in deep shadow
  const corPts = [P(XL - 0.12, Yf, zf - 0.1), P(XL - 0.12, Y1, zf - 0.1), ...brk(Yf, Y1, XR - 0.1, 3)] as Pt[];
  const cor = polyPath(corPts);
  fillPath(ctx, cor, '#8e88a0');
  within(ctx, cor, () => {
    const bb = boxOfPts(corPts, 2);
    vfill(ctx, bb.x, bb.y, bb.w, bb.h, [[0, rgba('#e8c8b0', 0.2)], [1, rgba('#141220', 0.3)]]);
  });
  strokePath(ctx, cor, '#141018', 1.2);
  const [cx0, cy0] = P(XL - 0.12, Yf, zf - 0.1);
  const [cx1] = P(XR, Yf, zf - 0.1);
  crevice(ctx, cx0, cx1, cy0, 5, 0.55, '#0c0a14');
  // ——— the pediment ———
  const apex = P(0, Y1 + PD.h, zf);
  const left = P(-PD.X, Y1, zf);
  const right = P(PD.X, Y1, zf);
  // the broken corner: everything right of a jagged line falling from the slope to the cornice
  const breakTop = P(BREAK_X - 0.3, Y1 + PD.h * (1 - (BREAK_X - 0.3) / PD.X), zf);
  const breakLine: Pt[] = [breakTop, P(BREAK_X - 0.1, Y1 + 0.3, zf), P(BREAK_X + 0.15, Y1 + 0.18, zf), P(BREAK_X - 0.05, Y1, zf)];
  const tymPts: Pt[] = [left, apex, ...breakLine];
  const tym = polyPath(tymPts);
  const tbb = boxOfPts([left, apex, right], 4);
  fillPath(ctx, tym, '#625c70');
  within(ctx, tym, () => {
    surface(ctx, r, tbb, '#625c70', { vary: 0.35, cells: 4, mottle: 0.35, strokes: 0, grain: 0.2, grainKind: 'speckle', seed: 95 });
    // traces of the old blue ground behind the carving
    lay(ctx, noiseMask(6, 97, { cover: 0.35, soft: 0.2, col: '#3a5070', w: 80, h: 24 }), tbb, 0.35);
    // the recess: shade under the raking cornice
    vfill(ctx, tbb.x, tbb.y, tbb.w, tbb.h, [[0, rgba('#0c0a14', 0.45)], [0.5, rgba('#0c0a14', 0.12)], [1, rgba('#0c0a14', 0)]]);
    // two serpents carved in the corners, coiling towards her
    tymSerpent(ctx, -1);
    tymSerpent(ctx, 1);
    // the Gorgoneion, carved large in the middle, painted at 3x and drawn down
    const S = 3;
    const RR = GORGON.R;
    const size = Math.ceil(RR * 4.2);
    const [gc, g] = makeCanvas(size * S, size * S);
    g.scale(S, S);
    gorgoneion(g, size / 2, size / 2 - RR * 0.1, RR);
    // its relief's shadow on the tympanum (down-right), then the carving
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.filter = 'blur(2px) brightness(0)';
    ctx.drawImage(gc, GORGON.x - size / 2 + 3, GORGON.y - size / 2 + RR * 0.1 + 3, size, size);
    ctx.restore();
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(gc, GORGON.x - size / 2, GORGON.y - size / 2 + RR * 0.1, size, size);
    // the broken edge's crack running in towards her
    crack(ctx, r, breakTop[0] - 4, breakTop[1] + 8, Math.PI * 0.85, 40, { col: '#141018', lip: '#c8c0d0', w: 1.2, a: 0.55 });
  });
  strokePath(ctx, tym, '#141018', 1.2);
  // the raking cornices: lit along their tops by the last of the sky, the left one warm
  const rake = (a: Pt, b: Pt, warm: boolean) => {
    const d = 0.16 * ppu(zf);
    const pts: Pt[] = [a, b, [b[0], b[1] - d], [a[0], a[1] - d]];
    const p = polyPath(pts);
    fillPath(ctx, p, lin(ctx, [0, Math.min(a[1], b[1]) - d], [0, Math.max(a[1], b[1])], [[0, warm ? '#d8a890' : '#9a90a8'], [1, '#625c70']]));
    strokePath(ctx, p, '#141018', 1.3);
    ctx.strokeStyle = rgba(warm ? '#ffc8a0' : '#c8c0d8', warm ? 0.75 : 0.35);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1] - d);
    ctx.lineTo(b[0], b[1] - d);
    ctx.stroke();
  };
  rake([left[0] - 8, left[1]], [apex[0], apex[1]], true);
  rake([apex[0], apex[1]], [breakTop[0], breakTop[1]], false);
  // the acroteria: horns of consecration on the apex and the left corner (the right one fell with its corner)
  const hz = (u: number, Y: number) => P(u, Y, zf);
  horns(ctx, hz, 0, Y1 + PD.h + 0.12, true, 1.3);
  horns(ctx, hz, -PD.X + 0.25, Y1 + 0.12, true, 1.3);
  // ——— the entablature's weight and weather: the soffit's deep shadow under the architrave, rain stains run down
  // from the cornice, moss and grass on its top, chips knocked off its arrises; the steps' treads stained and mossy ———
  const [sx0, sy0] = P(XL, Y0, zf);
  const [sx1] = P(XR, Y0, zf);
  vfill(ctx, sx0, sy0, sx1 - sx0, 10, [[0, rgba('#08060c', 0.55)], [1, rgba('#08060c', 0)]]);
  for (let i = 0; i < 16; i++) {
    const X = XL + 0.3 + r() * (XR - XL - 0.6);
    const [x, y] = P(X, Y1 - 0.02, zf);
    streaks(ctx, r, x, y, 14, (Y1 - Y0) * ppu(zf) * (0.6 + r() * 0.4), '#14101a', 0.22, 3);
  }
  const [cx0b, cyb] = P(XL - 0.12, Y1, zf - 0.1);
  const [cx1b] = P(XR - 0.1, Y1, zf - 0.1);
  for (let i = 0; i < 14; i++) moss(ctx, r, cx0b + r() * (cx1b - cx0b), cyb - 1, 6 + r() * 14, 2.5, 0.4);
  for (let i = 0; i < 8; i++) grass(ctx, r, cx0b + r() * (cx1b - cx0b), cyb, 6);
  chips(ctx, r, cx0b, cx1b, cyb + 1, 14, '#8e88a0', 2.5);
  chips(ctx, r, sx0, sx1, sy0 - 1, 12, '#8a8296', 2.5);
  for (let i = 0; i < 3; i++) {
    const Yt = (i + 1) * ST.rise;
    const [tx0, ty] = P(-ST.X, Yt, stepZ(i + 1) - 0.02);
    const [tx1] = P(ST.X, Yt, stepZ(i + 1) - 0.02);
    for (let j = 0; j < 10; j++) moss(ctx, r, tx0 + r() * (tx1 - tx0), ty, 8 + r() * 16, 2, 0.4);
    for (let j = 0; j < 5; j++) grass(ctx, r, tx0 + r() * (tx1 - tx0), ty + 1, 5);
    const [rx0, ry0] = P(-ST.X, Yt, stepZ(i));
    const [rx1] = P(ST.X, Yt, stepZ(i));
    for (let j = 0; j < 8; j++) streaks(ctx, r, rx0 + r() * (rx1 - rx0), ry0 + 1, 10, ST.rise * ppu(stepZ(i)) * 0.9, '#14101a', 0.25, 2);
  }
  // ——— the ruin: the fallen drum and capital lying on the steps and the floor ———
  fallenDrum(ctx, r);
  // ivy up the first column and hanging from the entablature's left end
  const iv = rng(101);
  const [c0x, c0y] = P(CO.X[0], CO.Y0 + CO.h, CO.z);
  for (let i = 0; i < 70; i++) {
    const t = i / 70;
    const k = ppu(CO.z);
    const lx = c0x + Math.sin(t * 9) * CO.r1 * k * 1.1;
    const ly = c0y + t * CO.h * k;
    leaf(ctx, iv, lx, ly, 3 + iv() * 2.5, '#142418', '#284a2c', '#4a6a3a', 0.4);
  }
  ivy(ctx, iv, ...P(XL + 0.6, Y0, zf), 46, 50, 4, 0.4, 0.4);
  ivy(ctx, iv, ...P(-2.0, Y0, zf), 24, 22, 3.5, 0.4, 0.4);
  // the air between us and it: the portico a step back into the dusk
  const pb = PORTICO_BOX;
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  vfill(ctx, pb.x, pb.y, pb.w, pb.h - 30, [[0, rgba(AIR.color, 0.12)], [1, rgba(AIR.color, 0.04)]]);
  ctx.restore();
}

/** A serpent carved in the tympanum's corner (s: -1 left, 1 right): its tail in the corner, its body coiling along
 * the cornice, thickening, its head reared up towards her face. */
function tymSerpent(ctx: Ctx, s: number): void {
  const zf = EN.z;
  const Y = EN.Y1;
  const k = ppu(zf);
  const n = 40;
  const C: Pt[] = [];
  const Wd: number[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const X = s * (PD.X - 0.55 - t * (PD.X - 1.75));
    const room = PD.h * (1 - Math.abs(X) / PD.X);
    const rear = Math.max(0, (t - 0.82) / 0.18);
    const Yy = Y + 0.05 + room * (0.32 + 0.2 * Math.sin(t * Math.PI * 4.2) * (1 - rear) + rear * 0.3);
    C.push(P(X, Yy, zf));
    Wd.push((0.05 + 0.16 * Math.pow(t, 0.6)) * k);
  }
  ctx.lineCap = 'round';
  for (const [col, wk, ox, oy] of [['#100c14', 1.25, 1.5, 2], ['#4e4860', 1, 0, 0], ['#8a8298', 0.62, -0.6, -0.8], [rgba('#d8d0e0', 0.5), 0.22, -1.2, -1.6]] as [string, number, number, number][]) {
    for (let i = 0; i < n; i++) {
      ctx.strokeStyle = col;
      ctx.lineWidth = Math.max(0.8, Wd[i] * wk);
      ctx.beginPath();
      ctx.moveTo(C[i][0] + ox * (Wd[i] / 8), C[i][1] + oy * (Wd[i] / 8));
      ctx.lineTo(C[i + 1][0] + ox * (Wd[i] / 8), C[i + 1][1] + oy * (Wd[i] / 8));
      ctx.stroke();
    }
  }
  // the reared head, its jaws open at her
  const [hx, hy] = C[n];
  const hw = Wd[n] * 0.9;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.scale(-s, 1);
  ctx.beginPath();
  ctx.moveTo(-hw * 0.6, -hw * 0.5);
  ctx.quadraticCurveTo(hw * 0.4, -hw * 1.0, hw * 1.5, -hw * 0.5);
  ctx.lineTo(hw * 0.5, -hw * 0.05);
  ctx.lineTo(hw * 1.3, hw * 0.35);
  ctx.quadraticCurveTo(hw * 0.2, hw * 0.7, -hw * 0.6, hw * 0.5);
  ctx.closePath();
  ctx.fillStyle = '#7a7288';
  ctx.fill();
  ctx.strokeStyle = '#100c14';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#100c14';
  ctx.beginPath();
  ctx.arc(hw * 0.3, -hw * 0.45, Math.max(0.8, hw * 0.12), 0, P2);
  ctx.fill();
  ctx.restore();
}

/** The fallen bay: a column drum lying on the floor before the steps, the capital tipped on the lowest step, the
 * architrave block broken on the treads. */
function fallenDrum(ctx: Ctx, r: R): void {
  const D = DRUMS;
  const k = ppu(D.z);
  // the architrave block, cracked in two on the steps
  for (const [X0, X1, z, Y, tilt] of [[4.7, 5.5, 10.2, 0.3, 0.08], [5.55, 6.2, 10.4, 0.45, -0.12]] as [number, number, number, number, number][]) {
    const h = 0.3;
    const a = P(X0, Y, z);
    const b = P(X1, Y + tilt, z);
    const kk = ppu(z);
    const front: Pt[] = [a, b, [b[0], b[1] - h * kk], [a[0], a[1] - h * kk]];
    const topP: Pt[] = [[a[0], a[1] - h * kk], [b[0], b[1] - h * kk], [b[0] + 8, b[1] - h * kk - 6], [a[0] + 8, a[1] - h * kk - 6]];
    fillPath(ctx, polyPath(topP), '#9a92a8');
    fillPath(ctx, polyPath(front), '#6e6880');
    within(ctx, polyPath(front), () => grain(ctx, boxOfPts(front, 2), 'speckle', 0.25, 0.9));
    strokePath(ctx, polyPath([...front.slice(0, 2), ...topP.slice(1, 3).reverse(), topP[3], front[3]] as Pt[]), '#141018', 1.2);
    groundShadow(ctx, (a[0] + b[0]) / 2 + 8, a[1] + 2, (b[0] - a[0]) * 0.55, 5, 0.45, '#0c0a14');
  }
  // the drum lying across the floor, seen side on: a red cylinder, its broken end pale
  const [x0, y0] = P(D.X0, D.r, D.z);
  const [x1] = P(D.X1, D.r, D.z);
  const rr = D.r * k;
  groundShadow(ctx, (x0 + x1) / 2 + 10, y0 + rr + 2, (x1 - x0) * 0.6, rr * 0.35, 0.55, '#0c0a14');
  const body = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x0, y0 - rr);
    c.lineTo(x1, y0 - rr * 1.15);
    c.ellipse(x1, y0, rr * 0.35, rr * 1.15, 0, -Math.PI / 2, Math.PI / 2);
    c.lineTo(x0, y0 + rr);
    c.closePath();
  };
  fillPath(ctx, body, lin(ctx, [0, y0 - rr], [0, y0 + rr], [[0, '#7a3a42'], [0.3, mix(COLUMN.body, '#3a1a2a', 0.5)], [0.8, '#2a1420'], [1, '#1a0c14']]));
  within(ctx, body, () => {
    lay(ctx, noiseMask(7, 103, { cover: 0.3, soft: 0.1, col: '#a89888', w: 60, h: 20 }), { x: x0, y: y0 - rr * 1.2, w: x1 - x0 + rr, h: rr * 2.4 }, 0.3);
    lay(ctx, noiseMask(6, 104, { cover: 0.4, soft: 0.2, col: MOSS[1], w: 40, h: 12 }), { x: x0, y: y0 - rr * 1.2, w: x1 - x0, h: rr }, 0.5);
    // its flutes running along it, each a dark groove with a lit edge
    for (let f = -3; f <= 3; f++) {
      const fy = y0 + Math.sin((f / 4) * (Math.PI / 2)) * rr * 0.95;
      ctx.strokeStyle = rgba('#12080c', 0.45);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x0, fy);
      ctx.lineTo(x1, fy - rr * 0.08);
      ctx.stroke();
      ctx.strokeStyle = rgba('#c08080', 0.2);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x0, fy - 1.5);
      ctx.lineTo(x1, fy - 1.5 - rr * 0.08);
      ctx.stroke();
    }
  });
  strokePath(ctx, body, '#1a1018', 1.3);
  // the near end: snapped, the pale stone showing
  ctx.beginPath();
  ctx.ellipse(x0, y0, rr * 0.32, rr, 0, 0, P2);
  ctx.fillStyle = '#6e6470';
  ctx.fill();
  ctx.strokeStyle = '#1a1018';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = rgba('#4a3a3a', 0.5);
    ctx.beginPath();
    ctx.moveTo(x0 + (r() - 0.5) * rr * 0.3, y0 + (r() - 0.5) * rr * 1.6);
    ctx.lineTo(x0 + (r() - 0.5) * rr * 0.3, y0 + (r() - 0.5) * rr * 1.6);
    ctx.stroke();
  }
  // the capital, tipped on its side against the lowest step
  const [qx, qy] = P(6.1, 0.18, 9.75);
  const qk = ppu(9.75);
  ctx.save();
  ctx.translate(qx, qy);
  ctx.rotate(0.5);
  const cw = CO.r1 * 1.55 * qk;
  ctx.fillStyle = '#241c24';
  ctx.beginPath();
  ctx.ellipse(0, 0, cw, 0.12 * qk, 0, 0, P2);
  ctx.fill();
  ctx.fillStyle = '#3a3240';
  ctx.fillRect(-cw * 1.05, -0.2 * qk, cw * 2.1, 0.1 * qk);
  ctx.strokeStyle = '#0a080c';
  ctx.lineWidth = 1;
  ctx.strokeRect(-cw * 1.05, -0.2 * qk, cw * 2.1, 0.1 * qk);
  ctx.restore();
  // rubble: a scatter of broken stone round them
  for (let i = 0; i < 16; i++) {
    const X = 4.3 + r() * 2.3;
    const z = 9.0 + r() * 1.2;
    const [px, py] = P(X, 0, z);
    const s = (0.03 + r() * 0.06) * ppu(z);
    ctx.fillStyle = r() < 0.3 ? '#8a4a4a' : '#7a7488';
    ctx.beginPath();
    ctx.ellipse(px, py - s * 0.4, s, s * 0.6, r(), 0, P2);
    ctx.fill();
    ctx.fillStyle = rgba('#0c0a14', 0.35);
    ctx.beginPath();
    ctx.ellipse(px + s * 0.4, py + 1, s * 0.9, s * 0.25, 0, 0, P2);
    ctx.fill();
  }
}

// ——— the pool ———
//
// A long basin with a limestone kerb, its blocks laid evenly (the joints every metre along the front, five to a side).
// The water stands a hand below the kerb: green-black, still, the portico and the sky hanging upside down in it,
// something far down glowing a sickly green. The kerb's inner faces take the green; its outer front is in the dusk.

const KX = PL.X - PL.kw;
/** The steps going down into the water at the far end (half-width). */
const STEP_X = 1.15;
const KZ0 = PL.z0 + PL.kw;
const KZ1 = PL.z1 - PL.kw;
/** Where the water line disappears behind the front kerb's top. */
const ZC = ((EH - PL.wY) * F) / (sy(PL.kh, KZ0) - VY);
/** The water you can see (screen polygon), and its box. */
export const WATER: Pt[] = [P(-KX, PL.wY, KZ1), P(KX, PL.wY, KZ1), P(KX, PL.wY, ZC), P(-KX, PL.wY, ZC)];
export const WATER_BOX = boxOfPts(WATER, 1);
export const POOL_BOX = (() => {
  const b = boxOfPts([P(-PL.X, 0, PL.z0), P(PL.X, 0, PL.z0), P(-PL.X, PL.kh, PL.z1), P(PL.X, PL.kh, PL.z1)], 10);
  return { ...b, h: b.h + 6 };
})();
/** The water's left and right edges at a screen y (for the live layer's rings). */
export const waterSpan = (y: number): [number, number] => {
  const t = clamp01((y - WATER[0][1]) / (WATER[3][1] - WATER[0][1]));
  return [WATER[0][0] + (WATER[3][0] - WATER[0][0]) * t, WATER[1][0] + (WATER[2][0] - WATER[1][0]) * t];
};

function pool(ctx: Ctx, r: R): void {
  const kerbTop = '#7e788c';
  // the far kerb's inner face (above the water, facing us, lit green from the water)
  for (const [a, b] of [[-KX, -STEP_X], [STEP_X, KX]]) fillPath(ctx, faceAt(a, b, PL.wY, PL.kh, KZ1), mix('#3a3e48', GLOW, 0.08));
  // the side kerbs' inner faces
  for (const s of [-1, 1]) {
    const f = sideAt(s * KX, KZ0, KZ1, PL.wY, PL.kh);
    fillPath(ctx, f, mix('#3a3e48', GLOW, 0.07));
    within(ctx, f, () => grain(ctx, boxOfPts([P(s * KX, PL.wY, KZ0), P(s * KX, PL.kh, KZ1)], 2), 'speckle', 0.25, 0.9));
  }
  // the kerb's top: back, sides, front, its blocks laid evenly
  const tops: [number, number, number, number][] = [[-PL.X, -STEP_X, KZ1, PL.z1], [STEP_X, PL.X, KZ1, PL.z1], [-PL.X, -KX, PL.z0, PL.z1], [KX, PL.X, PL.z0, PL.z1], [-PL.X, PL.X, PL.z0, KZ0]];
  for (const [X0, X1, z0, z1] of tops) {
    const p = topAt(X0, X1, z0, z1, PL.kh);
    fillPath(ctx, p, kerbTop);
    within(ctx, p, () => {
      const bb = boxOfPts([P(X0, PL.kh, z0), P(X1, PL.kh, z0), P(X0, PL.kh, z1), P(X1, PL.kh, z1)], 2);
      surface(ctx, r, bb, kerbTop, { over: true, vary: 0.4, cells: 3, mottle: 0.4, strokes: 0, grain: 0.22, grainKind: 'speckle', seed: 111 });
      lay(ctx, noiseMask(12, 113 + Math.round(X0 * 3), { cover: 0.22, soft: 0.15, col: MOSS[1], w: 200, h: 20 }), bb, 0.55);
      // the inner edge lit by the water's glow
      lightPool(ctx, 960, bb.y + bb.h * 0.5, 600, 60, GLOW, 0.08);
    });
  }
  // joints: one metre along the front and back, five blocks to a side
  const joint = (a: Pt, b: Pt) => {
    ctx.strokeStyle = rgba('#141220', 0.6);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(...a);
    ctx.lineTo(...b);
    ctx.stroke();
  };
  for (let X = -PL.X + 1; X < PL.X - 0.01; X += 1) {
    joint(P(X, PL.kh, PL.z0), P(X, PL.kh, KZ0));
    if (Math.abs(X) > STEP_X) joint(P(X, PL.kh, KZ1), P(X, PL.kh, PL.z1));
  }
  const side = (PL.z1 - PL.z0) / 5;
  for (let i = 1; i < 5; i++) {
    const z = PL.z0 + i * side;
    for (const s of [-1, 1]) joint(P(s * PL.X, PL.kh, z), P(s * KX, PL.kh, z));
  }
  // the kerb worn round at its inner edge (a soft shade where it rolls over into the water), moss cushions along it
  ctx.strokeStyle = rgba('#14121c', 0.3);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(...P(-KX, PL.kh, KZ0));
  ctx.lineTo(...P(-KX, PL.kh, KZ1));
  ctx.lineTo(...P(-STEP_X, PL.kh, KZ1));
  ctx.moveTo(...P(STEP_X, PL.kh, KZ1));
  ctx.lineTo(...P(KX, PL.kh, KZ1));
  ctx.lineTo(...P(KX, PL.kh, KZ0));
  ctx.stroke();
  for (let i = 0; i < 46; i++) {
    const side = r();
    let p: Pt;
    if (side < 0.45) p = P(-PL.X + r() * PL.X * 2, PL.kh, PL.z0 + r() * PL.kw);
    else if (side < 0.72) p = P(-PL.X + r() * PL.kw, PL.kh, PL.z0 + r() * (PL.z1 - PL.z0));
    else p = P(PL.X - r() * PL.kw, PL.kh, PL.z0 + r() * (PL.z1 - PL.z0));
    const kk = ppu(zFloor(p[1] + 40));
    moss(ctx, r, p[0], p[1], (0.06 + r() * 0.12) * kk, (0.02 + r() * 0.03) * kk, 0.1);
  }
  // the front: the kerb's outer face, in the dusk, damp and green with algae at its foot
  const front = faceAt(-PL.X, PL.X, 0, PL.kh, PL.z0);
  const fb = boxOfPts([P(-PL.X, 0, PL.z0), P(PL.X, PL.kh, PL.z0)], 2);
  fillPath(ctx, front, '#4e4a5c');
  within(ctx, front, () => {
    surface(ctx, r, fb, '#4e4a5c', { over: true, vary: 0.4, cells: 5, mottle: 0.4, strokes: 0, grain: 0.25, grainKind: 'speckle', seed: 117 });
    vfill(ctx, fb.x, fb.y, fb.w, fb.h, [[0, rgba('#c8c0d8', 0.12)], [0.15, rgba('#c8c0d8', 0)], [0.6, rgba('#24301c', 0)], [1, rgba('#24301c', 0.5)]]);
    lay(ctx, noiseMask(14, 119, { cover: 0.3, soft: 0.2, col: MOSS[2], w: 220, h: 14 }), { x: fb.x, y: fb.y + fb.h * 0.5, w: fb.w, h: fb.h * 0.5 }, 0.6);
    for (let X = -PL.X + 1; X < PL.X - 0.01; X += 1) {
      const [jx, jy] = P(X, 0, PL.z0);
      joint([jx, jy], [jx, jy - PL.kh * ppu(PL.z0)]);
    }
    // a crack down one block
    crack(ctx, r, ...P(1.42, PL.kh, PL.z0), Math.PI * 0.55, 40, { col: '#141018', lip: '#a8a0b8', w: 1.4, a: 0.55 });
  });
  // the front arris: worn round (a soft light rolling over it), bitten into by broken chunks, each a dark hollow
  // with a pale fracture and a lit lower lip
  const [ax0, ay] = P(-PL.X, PL.kh, PL.z0);
  const [ax1] = P(PL.X, PL.kh, PL.z0);
  vfill(ctx, ax0, ay - 3, ax1 - ax0, 7, [[0, rgba('#a8a0b8', 0)], [0.45, rgba('#a8a0b8', 0.28)], [1, rgba('#a8a0b8', 0)]]);
  strokePath(ctx, front, rgba('#100e18', 0.55), 1.2);
  for (let i = 0; i < 14; i++) {
    const x = ax0 + 20 + r() * (ax1 - ax0 - 40);
    const w = 6 + Math.pow(r(), 2) * 50;
    const h = 2 + r() * w * 0.35;
    const pts: Pt[] = [[x - w / 2, ay - 2]];
    for (let j = 1; j < 6; j++) pts.push([x - w / 2 + (w * j) / 6 + (r() - 0.5) * w * 0.12, ay - 2 + h * Math.pow(Math.sin((j / 6) * Math.PI), 0.6 + r()) * (0.5 + r() * 0.7)]);
    pts.push([x + w / 2, ay - 2]);
    fillPath(ctx, polyPath(pts), '#2e2a38');
    ctx.strokeStyle = rgba('#a8a0b8', 0.45);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    pts.slice(1, -1).forEach((p2, j) => (j ? ctx.lineTo(p2[0], p2[1] + 1) : ctx.moveTo(p2[0], p2[1] + 1)));
    ctx.stroke();
  }
  // the front-left corner broken off: a jagged bite out of the block, rubble at its foot
  const [cx0, cy0] = P(-PL.X, PL.kh, PL.z0);
  const bite: Pt[] = [[cx0 - 2, cy0 - 4], [cx0 + 46, cy0 - 3], [cx0 + 38, cy0 + 9], [cx0 + 24, cy0 + 16], [cx0 + 14, cy0 + 30], [cx0 - 2, cy0 + 36]];
  fillPath(ctx, polyPath(bite), '#3a3644');
  ctx.strokeStyle = rgba('#9a92a8', 0.5);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  bite.slice(1, -1).forEach((p2, j) => (j ? ctx.lineTo(...p2) : ctx.moveTo(...p2)));
  ctx.stroke();
  for (let i = 0; i < 7; i++) {
    const [px, py] = [cx0 - 20 + r() * 60, cy0 + 48 + r() * 8];
    ctx.fillStyle = rgba('#0a0812', 0.4);
    ctx.beginPath();
    ctx.ellipse(px + 3, py + 2, 5 + r() * 4, 2, 0, 0, P2);
    ctx.fill();
    ctx.fillStyle = r() < 0.5 ? '#6e687c' : '#8a8498';
    ctx.beginPath();
    ctx.ellipse(px, py, 3 + r() * 4, 2 + r() * 2, r(), 0, P2);
    ctx.fill();
  }
  // its foot on the floor: occlusion and a damp halo
  crevice(ctx, ax0 - 6, ax1 + 6, fb.y + fb.h - 2, 10, 0.55, '#0c0a14');
  // the sides' outer arrises where they meet the floor
  for (const s of [-1, 1]) {
    const a = P(s * PL.X, 0, PL.z0);
    const b = P(s * PL.X, 0, PL.z1);
    ctx.strokeStyle = rgba('#0c0a14', 0.45);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(...a);
    ctx.lineTo(...b);
    ctx.stroke();
  }
  // the green light the water throws up over the kerb and the air above it
  lightPool(ctx, 960, sy(PL.kh, (KZ0 + KZ1) / 2), 520, 70, GLOW, 0.04);
  glowAt(ctx, 980, sy(0.9, 7), 600, GLOW, 0.035, 0.32);
}

/** The water and all it reflects (the live layer lays a copy of it, `pad` px wider each side, over it in strips). */
function reflection(ctx: Ctx, r: R, pad: number): void {
  const wb = { ...WATER_BOX, x: WATER_BOX.x - pad, w: WATER_BOX.w + pad * 2 };
  const [a, b, c, d] = WATER;
  within(ctx, polyPath([[a[0] - pad, a[1]], [b[0] + pad, b[1]], [c[0] + pad, c[1]], [d[0] - pad, d[1]]]), () => {
    // what's mirrored: far, the back wall in its shade; near, the sky over it through the columns
    const yWall = sy(2 * PL.wY - (WL.h + WL.cope), WL.z);
    vfill(ctx, wb.x, wb.y, wb.w, wb.h, [[0, '#2e2c3c'], [clamp01((yWall - wb.y) / wb.h) - 0.02, '#3a3648'], [clamp01((yWall - wb.y) / wb.h) + 0.03, '#6e5276'], [1, '#5c4a70']]);
    // the warm sky in it, low on the left
    lightPool(ctx, wb.x + 40, wb.y + wb.h, 380, 40, '#ff9a7a', 0.18, 'source-over');
    // the coping and its horns, upside down along the wall's reflected top
    ctx.fillStyle = '#2c2838';
    const [cx0, cy0] = P(-WL.x, 2 * PL.wY - WL.h, WL.z);
    const [cx1] = P(WL.x, 0, WL.z);
    ctx.fillRect(cx0, cy0 - 1, cx1 - cx0, (WL.cope * F) / WL.z + 1);
    for (let i = 0; i < BACK_JOINTS.length - 1; i++) {
      const Xc = (BACK_JOINTS[i] + BACK_JOINTS[i + 1]) / 2;
      const pts = HORNS.map(([u, v]) => P(Xc + (u - 0.5) * HORN.w, 2 * PL.wY - (WL.h + WL.cope + v * HORN.h), WL.z));
      fillPath(ctx, polyPath(pts), '#2a2636');
    }
    // the far cypresses' spires, hanging down into the sky
    for (const [X, z, hgt] of [[-6.6, 15, 8], [-5.2, 16.5, 9], [5.6, 15.5, 8.5], [7.4, 16, 7.5], [-2.6, 19, 10], [2.2, 20, 9.5]] as [number, number, number][]) {
      const [x, y] = P(X, 2 * PL.wY - WL.h, z);
      const k = ppu(z);
      ctx.fillStyle = '#22242c';
      ctx.beginPath();
      ctx.moveTo(x - 0.5 * k, y);
      ctx.quadraticCurveTo(x - 0.55 * k, y + hgt * k * 0.4, x, y + hgt * k);
      ctx.quadraticCurveTo(x + 0.55 * k, y + hgt * k * 0.4, x + 0.5 * k, y);
      ctx.closePath();
      ctx.fill();
    }
    // the columns, upside down: dark red shafts, green where their feet were lit
    for (const X of CO.X) {
      const top = X > BREAK_X ? CO.Y0 + 1.25 : CO.Y0 + CO.h;
      const a = P(X, 2 * PL.wY - CO.Y0, CO.z);
      const b = P(X, 2 * PL.wY - top, CO.z);
      const k = ppu(CO.z);
      ctx.fillStyle = lin(ctx, a, b, [[0, mix('#5a3a40', GLOW, 0.25)], [0.3, '#4a2630'], [1, '#2e1a24']]);
      ctx.beginPath();
      ctx.moveTo(a[0] - CO.r0 * k, a[1]);
      ctx.lineTo(b[0] - CO.r1 * k, b[1]);
      ctx.lineTo(b[0] + CO.r1 * k, b[1]);
      ctx.lineTo(a[0] + CO.r0 * k, a[1]);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba('#a86a6a', 0.25);
      ctx.fillRect(a[0] - CO.r0 * k * 0.7, b[1], CO.r0 * k * 0.4, a[1] - b[1]);
    }
    // the two statues by the portico, upside down
    for (const [st, pose, dir] of [[MD.statBL, POSE.archer, 1], [MD.statBR, POSE.spear, -1]] as const) {
      const k = ppu(st.z);
      const ym = sy(PL.wY, st.z);
      ctx.save();
      ctx.translate(0, 2 * ym);
      ctx.scale(1, -1);
      ctx.globalAlpha = 0.55;
      plinth(ctx, rng(5), st.X, st.z, 0.76, 0.3, 0.75, false);
      hero(ctx, ...P(st.X, 0.3, st.z), k, pose, dir, { depth: 0.6, seed: 9, simple: true });
      ctx.restore();
    }
    // the steps going down into it at the far end, seen through the water: dim, then lost in the murk
    for (const [Yt, za, zb] of [[0.06, 7.78, 8.06], [-0.06, 7.5, 7.78]] as Pt3[]) {
      fillPath(ctx, topAt(-STEP_X, STEP_X, za, zb, Yt), '#3a3844');
      fillPath(ctx, faceAt(-STEP_X, STEP_X, Yt - 0.12, Yt, za), '#2a2834');
    }
    fillPath(ctx, faceAt(-STEP_X, STEP_X, 0.06, PL.wY, 8.06), '#34323e');
    // the water over it all: black and still, darker still as we look down into it near us
    vfill(ctx, wb.x, wb.y, wb.w, wb.h, [[0, rgba('#0a1212', 0.45)], [0.5, rgba('#060c0c', 0.62)], [1, rgba('#040808', 0.78)]]);
    // the glow down in the depths: murky, uneven, drifting in clouds rather than filling it
    softly(ctx, wb, (g) => {
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 9; i++) {
        const cx = 900 + (r() - 0.4) * 300;
        const cy = wb.y + wb.h * (0.45 + r() * 0.35);
        const rad = 18 + r() * 40;
        const gr = g.createRadialGradient(cx, cy, 0, cx, cy, rad);
        gr.addColorStop(0, rgba(GLOW, 0.04 + r() * 0.05));
        gr.addColorStop(1, rgba(GLOW, 0));
        g.fillStyle = gr;
        g.save();
        g.translate(cx, cy);
        g.scale(1, 0.32);
        g.translate(-cx, -cy);
        g.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
        g.restore();
      }
    }, 0.25);
    lay(ctx, noiseMask(5, 211, { cover: 0.4, soft: 0.3, col: '#020404', w: 60, h: 14 }), wb, 0.35);
    // what has sunk in it: a statue's head lying face up, a hand reaching up beside it, half lost in the murk
    drowned(ctx, 1010, wb.y + wb.h * 0.7);
    // the sheen: a few thin lines of sky lying along the surface where it's clear
    for (let i = 0; i < 14; i++) {
      const t = Math.pow(r(), 1.4);
      const y = wb.y + 3 + t * (wb.h - 6);
      const [x0, x1] = waterSpan(y);
      const x = x0 + 60 + r() * (x1 - x0 - 120);
      const l = (20 + r() * 70) * (0.4 + t);
      ctx.strokeStyle = rgba(r() < 0.6 ? '#d8a8a0' : '#a8c0b8', 0.1 + r() * 0.08);
      ctx.lineWidth = 0.8 + t;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + l, y);
      ctx.stroke();
    }
    // the scum: a skin of green-grey gathered along the edges and in the corners, breaking up the reflection
    const edgeScum = (x0: number, y0: number, w: number, h: number, seed: number, a: number) => lay(ctx, noiseMask(7, seed, { cover: 0.5, soft: 0.18, col: '#4a5634', w: 60, h: 24 }), { x: x0, y: y0, w, h }, a);
    edgeScum(wb.x, wb.y, 200, wb.h, 221, 0.55);
    edgeScum(wb.x + wb.w - 200, wb.y, 200, wb.h, 223, 0.55);
    edgeScum(wb.x + 80, wb.y, wb.w - 160, 18, 225, 0.6);
    edgeScum(wb.x + 200, wb.y + wb.h - 26, 300, 26, 227, 0.5);
    lay(ctx, noiseMask(14, 229, { cover: 0.22, soft: 0.1, col: '#5a6a40', w: 120, h: 30 }), wb, 0.2);
    // duckweed specks along the edges
    for (let i = 0; i < 220; i++) {
      const sdir = r() < 0.5 ? -1 : 1;
      const y = wb.y + r() * wb.h;
      const [x0, x1] = waterSpan(y);
      const x = sdir < 0 ? x0 + Math.pow(r(), 2.2) * 90 : x1 - Math.pow(r(), 2.2) * 90;
      ctx.fillStyle = rgba(r() < 0.5 ? '#7a9a44' : '#5a7a34', 0.6);
      ctx.beginPath();
      ctx.ellipse(x, y, 1.2 + r() * 1.6, 0.5 + r() * 0.6, 0, 0, P2);
      ctx.fill();
    }
    // lily pads, a pale flower among them, and fallen leaves floating
    for (const [lx, ly, lr] of [[1262, 640, 14], [1238, 627, 9], [1280, 622, 8], [1208, 645, 7], [640, 642, 12], [662, 630, 8], [618, 630, 7], [800, 556, 6], [1120, 560, 7]] as Pt3[]) {
      ctx.fillStyle = rgba('#020404', 0.45);
      ctx.beginPath();
      ctx.ellipse(lx + 2, ly + lr * 0.2, lr, lr * 0.3, 0, 0, P2);
      ctx.fill();
      ctx.fillStyle = '#2a4224';
      ctx.beginPath();
      ctx.ellipse(lx, ly, lr, lr * 0.3, 0, 0.35, P2);
      ctx.lineTo(lx, ly);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba('#7a9a52', 0.45);
      ctx.beginPath();
      ctx.ellipse(lx - lr * 0.2, ly - lr * 0.08, lr * 0.6, lr * 0.14, 0, 0, P2);
      ctx.fill();
      ctx.strokeStyle = rgba('#12200e', 0.5);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(lx, ly, lr, lr * 0.3, 0, 0.35, P2);
      ctx.stroke();
    }
    for (const [fx, fy] of [[1250, 616], [652, 620]] as Pt[]) {
      for (let j = 0; j < 6; j++) {
        const a = (j / 6) * P2;
        ctx.fillStyle = j % 2 ? '#d8d0c8' : '#f0e8e0';
        ctx.beginPath();
        ctx.ellipse(fx + Math.cos(a) * 2.6, fy - 3 + Math.sin(a) * 1, 2.6, 1.3, a, 0, P2);
        ctx.fill();
      }
      ctx.fillStyle = '#d8b860';
      ctx.beginPath();
      ctx.arc(fx, fy - 3.4, 1.2, 0, P2);
      ctx.fill();
    }
    for (let i = 0; i < 30; i++) {
      const y = wb.y + r() * wb.h;
      const [x0, x1] = waterSpan(y);
      const x = x0 + r() * (x1 - x0);
      const sc = 0.5 + (y - wb.y) / wb.h;
      ctx.fillStyle = rgba(r() < 0.5 ? '#6a4a28' : '#8a6a30', 0.7);
      ctx.beginPath();
      ctx.ellipse(x, y, 3 * sc, 1.1 * sc, (r() - 0.5) * 0.6, 0, P2);
      ctx.fill();
    }
    // the step that stands just clear of the water at the far end, wet and dark, moss on its nosing
    fillPath(ctx, topAt(-STEP_X, STEP_X, 8.28, KZ1, 0.22), '#34323e');
    fillPath(ctx, faceAt(-STEP_X, STEP_X, PL.wY, 0.22, 8.28), '#201e28');
    fillPath(ctx, faceAt(-STEP_X, STEP_X, 0.22, PL.kh, KZ1), '#2a2834');
    // the steps going down into it from the left-hand kerb: one just clear of the water, two more under it
    for (const [X0, X1, Yt, a] of [[-KX, -2.38, 0.22, 1], [-2.38, -2.08, 0.07, 0.6], [-2.08, -1.78, -0.08, 0.35]] as [number, number, number, number][]) {
      const za = 5.5;
      const zb = 6.7;
      ctx.globalAlpha = a;
      fillPath(ctx, quad(P(X0, Yt, za), P(X1, Yt, za), P(X1, Yt, zb), P(X0, Yt, zb)), Yt > 0.17 ? '#4e4a5a' : '#3a4044');
      fillPath(ctx, quad(P(X1, Yt, za), P(X1, Yt - 0.14, za), P(X1, Yt - 0.14, zb), P(X1, Yt, zb)), '#24222c');
      ctx.globalAlpha = 1;
    }
    for (let i = 0; i < 4; i++) {
      const [mx, my] = P(-KX + 0.05, 0.22, 5.6 + i * 0.3);
      moss(ctx, r, mx, my, 6, 2, 0.3);
    }
    const [nx0, ny] = P(-STEP_X, 0.22, 8.28);
    const [nx1] = P(STEP_X, 0.22, 8.28);
    moss(ctx, r, (nx0 + nx1) / 2, ny, (nx1 - nx0) * 0.5, 2, 0.4);
  });
}
type Pt3 = [number, number, number];

/** What has sunk in the pool: a statue's head lying face up just under the surface (its brow, its nose, its open
 * mouth), a stone hand reaching up beside it; murky, the green coming up round them. */
function drowned(ctx: Ctx, x: number, y: number): void {
  ctx.save();
  ctx.globalAlpha = 0.42;
  const g = ctx.createRadialGradient(x - 30, y - 2, 1, x - 30, y, 22);
  g.addColorStop(0, '#9ab8a4');
  g.addColorStop(1, '#3a5448');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x - 30, y, 22, 7.5, -0.08, 0, P2);
  ctx.fill();
  ctx.fillStyle = '#0c1812';
  for (const [ex, ey, rx] of [[-38, -1, 3.5], [-24, -2, 3.5], [-30, 3, 2.6]] as Pt3[]) {
    ctx.beginPath();
    ctx.ellipse(x + ex, y + ey, rx, rx * 0.45, 0, 0, P2);
    ctx.fill();
  }
  ctx.fillStyle = '#b8d8c4';
  ctx.fillRect(x - 32, y - 4, 4, 1.4);
  // the hand, fingers just breaking the dark
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = '#8aa89a';
  ctx.beginPath();
  ctx.moveTo(x + 13, y + 10);
  ctx.lineTo(x + 15, y - 2);
  for (let i = 0; i < 4; i++) {
    const fx = x + 15 + i * 3.4;
    const up = i === 1 || i === 2 ? 3 : 0;
    ctx.lineTo(fx, y - 8 - up);
    ctx.lineTo(fx + 2.3, y - 8 - up);
    ctx.lineTo(fx + 2.5, y - 3);
  }
  ctx.lineTo(x + 29, y - 4);
  ctx.lineTo(x + 27, y + 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ——— reeds and ferns ———
//
// Reeds stand in the pool's far corners, rising out of the water: tapering blades, some bent over, a few bulrush heads,
// their reflections broken under them. Ferns crowd the near corners on the paving, their fronds arching over.

/** A clump of reeds rising from (x, y), h px tall. */
function reeds(ctx: Ctx, r: R, x: number, y: number, h: number, n: number, depth: number): void {
  const dark = airMix('#142016', depth, AIR);
  const body = airMix('#2e4a2a', depth, AIR);
  const lit = airMix('#7a8a50', depth, AIR);
  // their dark reflections in the water under them
  ctx.fillStyle = rgba('#040806', 0.4);
  ctx.beginPath();
  ctx.ellipse(x, y + 2, h * 0.28, h * 0.05, 0, 0, P2);
  ctx.fill();
  for (let i = 0; i < n; i++) {
    const bx = x + (r() - 0.5) * h * 0.4;
    const hh = h * (0.5 + r() * 0.6);
    const bend = (r() - 0.4) * hh * 0.5;
    const tipX = bx + bend;
    const tipY = y - hh + Math.abs(bend) * 0.3;
    const w = Math.max(1.2, h * 0.025);
    const k2 = r();
    ctx.fillStyle = k2 < 0.4 ? dark : k2 < 0.8 ? body : mix(body, lit, 0.5);
    ctx.beginPath();
    ctx.moveTo(bx - w, y);
    ctx.quadraticCurveTo(bx - w * 0.6, y - hh * 0.5, tipX, tipY);
    ctx.quadraticCurveTo(bx + w * 0.6, y - hh * 0.5, bx + w, y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(lit, 0.35);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(bx - w * 0.6, y - 2);
    ctx.quadraticCurveTo(bx - w * 0.5, y - hh * 0.5, tipX, tipY);
    ctx.stroke();
    if (r() < 0.22) {
      // a bulrush head on its own stalk
      const sx2 = bx + (r() - 0.5) * 6;
      const st = y - hh * 1.05;
      ctx.strokeStyle = dark;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx2, y);
      ctx.lineTo(sx2 + bend * 0.2, st);
      ctx.stroke();
      ctx.fillStyle = airMix('#3a2618', depth, AIR);
      ctx.beginPath();
      ctx.ellipse(sx2 + bend * 0.2, st + h * 0.06, w * 1.6, h * 0.07, 0, 0, P2);
      ctx.fill();
      ctx.fillStyle = rgba(airMix('#a07a50', depth, AIR), 0.5);
      ctx.beginPath();
      ctx.ellipse(sx2 + bend * 0.2 - w * 0.6, st + h * 0.05, w * 0.5, h * 0.05, 0, 0, P2);
      ctx.fill();
    }
  }
}

/** A fern on the paving at (x, y): fronds arching out and over, each with its leaflets, lit on their tops. */
function fern(ctx: Ctx, r: R, x: number, y: number, s: number, depth: number): void {
  const dark = airMix('#122014', depth, AIR);
  const body = airMix('#2c4a28', depth, AIR);
  const lit = airMix('#6a8a44', depth, AIR);
  groundShadow(ctx, x + s * 0.1, y + 2, s * 0.6, s * 0.12, 0.5, '#0a0812');
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * 2.6 + (r() - 0.5) * 0.2;
    const len = s * (0.7 + r() * 0.4) * (1 - Math.abs(i / (n - 1) - 0.5) * 0.5);
    const tipX = x + Math.cos(a) * len;
    const tipY = y + Math.sin(a) * len * 0.75 + len * 0.25;
    const cX = x + Math.cos(a) * len * 0.55;
    const cY = y + Math.sin(a) * len * 0.9 - len * 0.12;
    const pts: Pt[] = [];
    for (let j = 0; j <= 12; j++) {
      const t = j / 12;
      pts.push([(1 - t) * (1 - t) * x + 2 * t * (1 - t) * cX + t * t * tipX, (1 - t) * (1 - t) * y + 2 * t * (1 - t) * cY + t * t * tipY]);
    }
    // the leaflets along the rachis, shrinking to the tip
    for (let j = 1; j < 12; j++) {
      const [px, py] = pts[j];
      const [qx, qy] = pts[j + 1];
      const ang = Math.atan2(qy - py, qx - px);
      const ll = s * 0.1 * (1 - j / 13);
      for (const sg of [-1, 1]) {
        ctx.fillStyle = sg < 0 ? mix(body, lit, 0.4) : dark;
        ctx.beginPath();
        ctx.ellipse(px + Math.cos(ang + sg * 1.2) * ll * 0.6, py + Math.sin(ang + sg * 1.2) * ll * 0.6, ll * 0.6, ll * 0.22, ang + sg * 1.2, 0, P2);
        ctx.fill();
      }
    }
    ctx.strokeStyle = body;
    ctx.lineWidth = Math.max(0.8, s * 0.012);
    ctx.beginPath();
    pts.forEach((p, j) => (j ? ctx.lineTo(...p) : ctx.moveTo(...p)));
    ctx.stroke();
  }
}

const REEDS_L = P(-2.5, PL.wY, 8.35);
const REEDS_R = P(2.48, PL.wY, 8.25);
const FERN_L = P(-3.25, 0, 3.78);
const FERN_R = P(3.3, 0, 3.72);
const reedBox = (p: Pt) => ({ x: Math.floor(p[0] - 50), y: Math.floor(p[1] - 82), w: 100, h: 92 });
const fernBox = (p: Pt) => ({ x: Math.floor(p[0] - 80), y: Math.floor(p[1] - 66), w: 160, h: 80 });

// ——— the statues ———
//
// Each hero is posed as a skeleton (metres: u forward, v up, feet on v = 0) and sculpted part by part on one canvas at
// twice the size: every form filled with the stone and modelled by the light (a lit mass turned to the dusk on the
// left, a core shadow, the last warm light along its upper edges, the pool's green coming up under it and along the
// side that faces the water), every nearer part throwing a soft shadow on what's behind it. The anatomy is carved into
// the forms (pectorals, the abdominal grid, the iliac line, knees and calves, the deltoid), the faces are cut with
// their open mouths and raised brows, the hands have fingers, the drapery folds. Then the whole is weathered as one
// stone: grain, black rain streaks from the shoulders, moss in the hollows, lichen on the lit side, cracks and chips
// with lit lips, a fracture face where a limb broke off; and outlined once, thinly.

type HandKind = 'open' | 'fist' | 'eyes' | 'bow';
interface Pose {
  /** [far, near] pairs. */
  an: [Pt, Pt];
  toe: [Pt, Pt];
  kn: [Pt, Pt];
  hip: [Pt, Pt];
  sh: [Pt, Pt];
  el: [Pt, Pt];
  ha: [Pt, Pt];
  hands: [HandKind, HandKind];
  waist: Pt;
  neck: Pt;
  head: Pt;
  /** The head's tilt (rad, + back). */
  tilt?: number;
  helm?: 'crest' | 'cap';
  beard?: boolean;
  dress: 'kilt' | 'chiton';
  cloak?: Pt[];
  blade?: [Pt, Pt];
  spear?: [Pt, Pt];
  bow?: boolean;
  /** An arm broken off partway down the forearm (its fracture face showing). */
  stump?: 0 | 1;
  /** Hairline cracks: (u, v, angle, length m). */
  cracks?: [number, number, number, number][];
  /** Moss in the hollows and on the tops. */
  moss?: Pt[];
  /** The far arm is behind the body (else in front of it). */
  farBehind?: boolean;
}

const POSE: Record<'hoplite' | 'youth' | 'archer' | 'spear' | 'fallen', Pose> = {
  // mid-swing: his weight thrown onto his front leg, hip up over it, the shoulders tipped the other way; the sword up
  // over his head to bring it down, the other hand thrown out flat before him; his face turned to her, mouth open
  hoplite: {
    an: [[-0.38, 0.12], [0.3, 0.08]],
    toe: [[-0.27, 0.0], [0.45, 0.01]],
    kn: [[-0.22, 0.5], [0.31, 0.52]],
    hip: [[-0.09, 0.93], [0.09, 0.98]],
    waist: [0.04, 1.15],
    sh: [[0.21, 1.48], [-0.1, 1.42]],
    el: [[0.13, 1.8], [0.33, 1.3]],
    ha: [[-0.06, 1.98], [0.5, 1.37]],
    hands: ['fist', 'open'],
    neck: [0.12, 1.55],
    head: [0.17, 1.69],
    tilt: 0.12,
    helm: 'crest',
    beard: true,
    dress: 'kilt',
    cloak: [[0.18, 1.52], [-0.08, 1.5], [-0.24, 1.38], [-0.34, 1.12], [-0.4, 0.86], [-0.43, 0.64], [-0.34, 0.6], [-0.27, 0.66], [-0.18, 0.61], [-0.13, 0.8], [-0.06, 1.1], [0.0, 1.3]],
    blade: [[-0.06, 1.98], [-0.2, 2.08]],
    farBehind: true,
    cracks: [[0.02, 1.3, 1.9, 0.22], [0.31, 0.38, 1.3, 0.18]],
    moss: [[-0.1, 1.44], [0.2, 1.49], [0.0, 0.92], [0.35, 0.1], [-0.33, 0.11], [-0.5, 0.64], [0.06, 1.15]],
  },
  // recoiling a step, his weight back on his rear leg, one arm flung up over his eyes (too late), the other thrown back:
  // its forearm broken away
  youth: {
    an: [[-0.27, 0.08], [0.3, 0.14]],
    toe: [[-0.15, 0.0], [0.44, 0.01]],
    kn: [[-0.2, 0.5], [0.21, 0.53]],
    hip: [[-0.15, 0.97], [0.03, 0.92]],
    waist: [-0.08, 1.13],
    sh: [[0.04, 1.42], [-0.27, 1.46]],
    el: [[-0.42, 1.24], [0.24, 1.55]],
    ha: [[-0.62, 1.1], [0.1, 1.84]],
    hands: ['open', 'eyes'],
    neck: [-0.08, 1.55],
    head: [-0.04, 1.67],
    tilt: 0.28,
    dress: 'chiton',
    stump: 0,
    farBehind: true,
    cracks: [[-0.05, 1.25, 2.6, 0.5], [0.12, 0.7, 1.4, 0.3]],
    moss: [[-0.27, 1.47], [0.04, 1.44], [-0.1, 0.85], [0.31, 0.16], [-0.26, 0.1], [-0.6, 1.02]],
  },
  // kneeling, drawing his bow: the bow broken across
  archer: {
    an: [[-0.48, 0.08], [0.32, 0.07]],
    toe: [[-0.58, 0.0], [0.46, 0.0]],
    kn: [[-0.2, 0.06], [0.3, 0.5]],
    hip: [[-0.06, 0.58], [0.06, 0.57]],
    waist: [0.0, 0.76],
    sh: [[0.14, 1.07], [-0.12, 1.08]],
    el: [[0.36, 1.1], [-0.24, 1.04]],
    ha: [[0.55, 1.1], [0.0, 1.13]],
    hands: ['bow', 'fist'],
    neck: [0.03, 1.17],
    head: [0.05, 1.29],
    helm: 'cap',
    dress: 'kilt',
    bow: true,
    farBehind: false,
    moss: [[-0.12, 1.09], [0.14, 1.08], [-0.2, 0.08]],
  },
  // lunging with his spear raised over his shoulder: the shaft snapped
  spear: {
    an: [[-0.5, 0.09], [0.42, 0.09]],
    toe: [[-0.62, 0.0], [0.58, 0.01]],
    kn: [[-0.28, 0.48], [0.38, 0.5]],
    hip: [[-0.05, 0.9], [0.1, 0.88]],
    waist: [0.08, 1.05],
    sh: [[0.28, 1.36], [0.0, 1.38]],
    el: [[0.14, 1.62], [0.3, 1.16]],
    ha: [[0.32, 1.72], [0.5, 1.2]],
    hands: ['fist', 'open'],
    neck: [0.2, 1.47],
    head: [0.26, 1.58],
    helm: 'crest',
    dress: 'kilt',
    spear: [[-0.25, 1.6], [0.62, 1.8]],
    farBehind: true,
    moss: [[0.0, 1.4], [0.28, 1.38], [-0.5, 0.1]],
  },
  // the toppled one, standing as he stood (painted lying down), one arm thrown up
  fallen: {
    an: [[-0.06, 0.08], [0.1, 0.08]],
    toe: [[0.06, 0.0], [0.24, 0.0]],
    kn: [[-0.04, 0.5], [0.12, 0.5]],
    hip: [[-0.04, 0.95], [0.1, 0.95]],
    waist: [0.03, 1.12],
    sh: [[0.2, 1.45], [-0.14, 1.45]],
    el: [[0.3, 1.74], [-0.24, 1.2]],
    ha: [[0.36, 2.0], [-0.26, 0.98]],
    hands: ['open', 'fist'],
    neck: [0.03, 1.55],
    head: [0.03, 1.67],
    helm: 'crest',
    beard: true,
    dress: 'kilt',
    farBehind: true,
    moss: [[0.0, 1.2], [0.1, 0.6], [-0.14, 1.45]],
  },
};

interface HeroOpts {
  depth: number;
  seed: number;
  /** Which side faces the pool (screen): its green comes up that side. */
  pool?: number;
  /** A quick version (the far ones and the reflections): flat forms half-lost in the dusk, no weathering. */
  simple?: boolean;
  /** The pool's green coming up from below (0…1). */
  uplight?: number;
  /** The light's direction in the figure's own frame (when it's painted turned: the toppled one). */
  light?: Pt;
  /** Leave the head off (the toppled one's rolled away), or paint only the head. */
  noHead?: boolean;
  onlyHead?: boolean;
}

const LIGHT_V: Pt = (() => {
  const l = Math.hypot(0.55, 0.83);
  return [-0.55 / l, -0.83 / l];
})();

/** A capsule from a (radius ra) to b (radius rb), swelling to rm a third of the way down (a muscle). */
function capsule(a: Pt, b: Pt, ra: number, rb: number, rm = 0): (c: Ctx) => void {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const an = Math.atan2(ny, nx);
  return (c: Ctx) => {
    const m1: Pt = [a[0] + dx * 0.34, a[1] + dy * 0.34];
    const m2: Pt = [a[0] + dx * 0.42, a[1] + dy * 0.42];
    const r1 = Math.max(rm * 1.2, (ra + rb) / 2);
    const r2 = Math.max(rm * 1.1, (ra + rb) / 2);
    c.beginPath();
    c.moveTo(a[0] + nx * ra, a[1] + ny * ra);
    c.quadraticCurveTo(m1[0] + nx * r1, m1[1] + ny * r1, b[0] + nx * rb, b[1] + ny * rb);
    c.arc(b[0], b[1], rb, an, an + Math.PI, true);
    c.quadraticCurveTo(m2[0] - nx * r2, m2[1] - ny * r2, a[0] - nx * ra, a[1] - ny * ra);
    c.arc(a[0], a[1], ra, an + Math.PI, an + P2, true);
    c.closePath();
  };
}

/** A patch of moss: a dense speckle of tiny cushions, thickest in the middle, ragged at the edge. */
function moss(c: Ctx, r: R, x: number, y: number, rx: number, ry: number, depth = 0): void {
  const n = Math.round(Math.max(12, rx * ry * 0.5));
  for (let i = 0; i < n; i++) {
    const a = r() * P2;
    const d = Math.pow(r(), 0.7);
    const px = x + Math.cos(a) * d * rx;
    const py = y + Math.sin(a) * d * ry;
    const s = Math.max(0.5, rx * (0.04 + r() * 0.06) * (1.2 - d));
    c.fillStyle = rgba(airMix(MOSS[Math.floor(r() * 4)], depth, AIR), 0.55 + r() * 0.35);
    c.beginPath();
    c.arc(px, py, s, 0, P2);
    c.fill();
  }
}

/** Bounds of a set of points with a margin. */
const boundsOf = (pts: Pt[], pad: number): Box => boxOfPts(pts, pad);

function hero(ctx: Ctx, x: number, y: number, k: number, pose: Pose, dir: number, o: HeroOpts): void {
  const Q = o.simple ? 1 : 2;
  const S = (p: Pt): Pt => [x + dir * p[0] * k, y - p[1] * k];
  const LV = o.light ?? LIGHT_V;
  const T = (c: string) => airMix(c, o.depth, AIR);
  const lit = T(STONE.lit);
  const body = T(STONE.body);
  const shd = T(STONE.shade);
  const deep = T(STONE.deep);
  const ink = T('#16141c');
  const warm = T(STONE.warm);
  const detail = !o.simple;
  const up = o.uplight ?? 0.25;
  const poolSide = o.pool ?? 0;
  const all: Pt[] = [...pose.an, ...pose.toe, ...pose.kn, ...pose.hip, ...pose.sh, ...pose.el, ...pose.ha, pose.head, ...(pose.cloak ?? []), ...(pose.blade ?? []), ...(pose.spear ?? [])].map(S);
  all.push(S([pose.head[0] - 0.34, pose.head[1] + 0.4]), S([pose.head[0] + 0.2, pose.head[1] + 0.34]));
  const bb = boundsOf(all, 0.2 * k);
  const [cv, g] = makeCanvas(bb.w * Q, bb.h * Q);
  g.scale(Q, Q);
  g.translate(-bb.x, -bb.y);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const lw = Math.max(0.5, k * 0.005);
  const rr = rng(o.seed * 13 + 5);

  /** The shadow a part throws on what's already carved behind it. */
  const throwShadow = (path: (c: Ctx) => void, d = 0.03) => {
    if (!detail) return;
    const OFF = 6000;
    g.save();
    g.globalCompositeOperation = 'source-atop';
    g.translate(-OFF, 0);
    g.shadowColor = rgba(deep, 0.6);
    g.shadowBlur = d * k * Q;
    g.shadowOffsetX = (OFF - LV[0] * d * k) * Q;
    g.shadowOffsetY = -LV[1] * d * k * Q;
    path(g);
    g.fillStyle = '#000';
    g.fill();
    g.restore();
  };
  /** Carve one form: the stone, modelled along its own contour (a broad light turned to the dusk on the upper left,
   * the shade gathering along the far edge), the last warm light crisp on its lit edge, the pool's green under it and
   * along the side that faces the water. */
  const form = (path: (c: Ctx) => void, box: Box, base = body, edge = 0.025) => {
    throwShadow(path);
    path(g);
    g.fillStyle = base;
    g.fill();
    const sz = Math.min(box.w, box.h);
    if (!detail) {
      path(g);
      g.fillStyle = '#2e2c38';
      g.fill();
      innerEdge(g, path, rgba(T('#b8a8a8'), 0.4), sz * 0.08, -LV[0] * sz * 0.08, -LV[1] * sz * 0.08);
      innerEdge(g, path, rgba(GLOW, 0.22 * up), sz * 0.12, 0, -sz * 0.1);
      return;
    }
    const e = edge * k;
    const m = Math.max(e * 1.6, sz * 0.32);
    innerEdge(g, path, rgba(lit, 0.9), m * 0.55, -LV[0] * m * 0.5, -LV[1] * m * 0.5);
    innerEdge(g, path, rgba(lit, 0.5), m * 0.25, -LV[0] * m * 0.18, -LV[1] * m * 0.18);
    innerEdge(g, path, rgba(deep, 0.92), m * 0.55, LV[0] * m * 0.62, LV[1] * m * 0.62);
    innerEdge(g, path, rgba(warm, 0.7), e * 0.5, -LV[0] * e * 0.5, -LV[1] * e * 0.5);
    innerEdge(g, path, rgba(GLOW, 0.5 * up), e * 1.2, 0, -e * 0.9);
    if (poolSide) innerEdge(g, path, rgba(mix(GLOW, '#9ad8c8', 0.4), 0.3 * up + 0.12), e * 0.9, -poolSide * e * 0.8, 0);
    g.strokeStyle = rgba(ink, 0.22);
    g.lineWidth = lw;
    path(g);
    g.stroke();
  };
  /** A carved line: a soft groove (dark) or a ridge catching the light. */
  const mark = (pts: Pt[], w: number, dark: boolean, a: number) => {
    if (!detail) return;
    const sp = pts.map(S);
    const col = dark ? deep : lit;
    for (const [ww, aa] of [[w * 2.4, a * 0.35], [w, a]] as Pt[]) {
      g.strokeStyle = rgba(col, aa);
      g.lineWidth = ww * k;
      g.beginPath();
      g.moveTo(...sp[0]);
      if (sp.length === 3) g.quadraticCurveTo(...sp[1], ...sp[2]);
      else for (const p of sp.slice(1)) g.lineTo(...p);
      g.stroke();
    }
  };
  const blob = (c: Pt, rx: number, ry: number, col: string, a: number, rot = 0) => {
    if (!detail) return;
    const [cx, cy] = S(c);
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry) * k);
    gr.addColorStop(0, rgba(col, a));
    gr.addColorStop(1, rgba(col, 0));
    g.save();
    g.translate(cx, cy);
    g.rotate(rot);
    g.scale(1, ry / rx);
    g.translate(-cx, -cy);
    g.fillStyle = gr;
    g.beginPath();
    g.arc(cx, cy, rx * k, 0, P2);
    g.fill();
    g.restore();
  };
  const limb = (a: Pt, b: Pt, ra: number, rb: number, rm: number) => {
    const A = S(a);
    const B = S(b);
    const path = capsule(A, B, ra * k, rb * k, rm * k);
    form(path, boundsOf([A, B], Math.max(ra, rm) * k * 1.2));
  };
  /** One continuous limb from a through the joint b to c: a smooth spine (the joint's corner rounded), its outline
   * offset either side by width profiles (front and back, half-widths in metres over 0 … 1 of its length). */
  const limb3 = (a: Pt, b: Pt, c: Pt, front: Pt[], back: Pt[]) => {
    const spine: Pt[] = [];
    const n = 28;
    const q0 = lerp2(a, b, 0.8);
    const q1 = lerp2(b, c, 0.2);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      if (t < 0.4) spine.push(lerp2(a, q0, t / 0.4));
      else if (t < 0.6) {
        const u = (t - 0.4) / 0.2;
        spine.push([(1 - u) * (1 - u) * q0[0] + 2 * u * (1 - u) * b[0] + u * u * q1[0], (1 - u) * (1 - u) * q0[1] + 2 * u * (1 - u) * b[1] + u * u * q1[1]]);
      } else spine.push(lerp2(q1, c, (t - 0.6) / 0.4));
    }
    const prof = (pr: Pt[], t: number) => {
      for (let i = 1; i < pr.length; i++) {
        if (t <= pr[i][0]) {
          const u = (t - pr[i - 1][0]) / (pr[i][0] - pr[i - 1][0] || 1);
          const sm = u * u * (3 - 2 * u);
          return pr[i - 1][1] + (pr[i][1] - pr[i - 1][1]) * sm;
        }
      }
      return pr[pr.length - 1][1];
    };
    const F: Pt[] = [];
    const Bk: Pt[] = [];
    for (let i = 0; i <= n; i++) {
      const p = spine[i];
      const qa = spine[Math.max(0, i - 1)];
      const qb = spine[Math.min(n, i + 1)];
      const dx = qb[0] - qa[0];
      const dy = qb[1] - qa[1];
      const l = Math.hypot(dx, dy) || 1;
      const nx = -dy / l;
      const ny = dx / l;
      const t = i / n;
      const wf = prof(front, t);
      const wb = prof(back, t);
      F.push(S([p[0] + nx * wf, p[1] + ny * wf]));
      Bk.push(S([p[0] - nx * wb, p[1] - ny * wb]));
    }
    const ea = S(a);
    const ec = S(c);
    const path = (cc: Ctx) => {
      cc.beginPath();
      F.forEach((p, i) => (i ? cc.lineTo(...p) : cc.moveTo(...p)));
      cc.quadraticCurveTo(ec[0] + (ec[0] - S(lerp2(b, c, 0.9))[0]) * 0.6, ec[1] + (ec[1] - S(lerp2(b, c, 0.9))[1]) * 0.6, ...Bk[n]);
      for (let i = n; i >= 0; i--) cc.lineTo(...Bk[i]);
      cc.quadraticCurveTo(ea[0] + (ea[0] - S(lerp2(a, b, 0.1))[0]) * 0.6, ea[1] + (ea[1] - S(lerp2(a, b, 0.1))[1]) * 0.6, ...F[0]);
      cc.closePath();
    };
    form(path, boundsOf([...F, ...Bk], 2), body, 0.03);
  };
  const lerp2 = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const perp = (a: Pt, b: Pt, w: number): Pt => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    return [(-dy / l) * w, (dx / l) * w];
  };
  const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];

  // ——— hands and feet ———
  const hand = (i: 0 | 1) => {
    const kind = pose.hands[i];
    const el = pose.el[i];
    const wr = pose.ha[i];
    const dx = wr[0] - el[0];
    const dy = wr[1] - el[1];
    const l = Math.hypot(dx, dy) || 1;
    const ax: Pt = [dx / l, dy / l];
    const nx: Pt = [-ax[1], ax[0]];
    const at = (u: number, w: number): Pt => [wr[0] + ax[0] * u + nx[0] * w, wr[1] + ax[1] * u + nx[1] * w];
    if (kind === 'fist' || kind === 'bow') {
      // a closed fist: the knuckles' row, the fingers curled round under it, the thumb over them
      const pts = [at(-0.01, 0.035), at(0.06, 0.042), at(0.09, 0.02), at(0.09, -0.02), at(0.06, -0.04), at(0.0, -0.035)].map(S);
      form(polyPath(pts), boundsOf(pts, 2), body, 0.012);
      for (let f = 0; f < 3; f++) mark([at(0.035 + f * 0.0, -0.03 + f * 0.022), at(0.085, -0.025 + f * 0.022)], 0.004, true, 0.5);
      mark([at(0.02, 0.035), at(0.07, 0.01)], 0.006, false, 0.45);
      return;
    }
    // an open hand: the palm, four fingers spread, the thumb out to the side
    const spread = kind === 'eyes' ? 0.18 : 0.3;
    const palm = [at(-0.01, 0.035), at(0.075, 0.042), at(0.08, -0.04), at(-0.01, -0.032)].map(S);
    form(polyPath(palm), boundsOf(palm, 2), body, 0.012);
    for (let f = 0; f < 4; f++) {
      const t = (f - 1.5) / 1.5;
      const base = at(0.075, t * 0.03);
      const ang = t * spread;
      const len = 0.09 - Math.abs(t) * 0.012 - (f === 3 ? 0.014 : 0);
      const tip: Pt = [base[0] + (ax[0] * Math.cos(ang) - nx[0] * Math.sin(ang)) * len, base[1] + (ax[1] * Math.cos(ang) - nx[1] * Math.sin(ang)) * len];
      const p = capsule(S(base), S(tip), 0.0095 * k, 0.0075 * k);
      form(p, boundsOf([S(base), S(tip)], 0.015 * k), body, 0.008);
    }
    const tb = at(0.02, 0.035);
    const tt: Pt = add(tb, [nx[0] * 0.05 + ax[0] * 0.035, nx[1] * 0.05 + ax[1] * 0.035]);
    const tp = capsule(S(tb), S(tt), 0.012 * k, 0.009 * k);
    form(tp, boundsOf([S(tb), S(tt)], 0.02 * k), body, 0.008);
  };
  const foot = (i: 0 | 1) => {
    const A = S(pose.an[i]);
    const Tt = S(pose.toe[i]);
    const back: Pt = [A[0] - (Tt[0] - A[0]) * 0.3, A[1] + 0.02 * k];
    const fp = (c: Ctx) => {
      c.beginPath();
      c.moveTo(back[0], back[1] - 0.05 * k);
      c.quadraticCurveTo(A[0], A[1] - 0.07 * k, Tt[0], Tt[1] - 0.03 * k);
      c.quadraticCurveTo(Tt[0] + dir * 0.03 * k, Tt[1], Tt[0], Tt[1] + 0.005 * k);
      c.lineTo(back[0], back[1] + 0.005 * k);
      c.closePath();
    };
    form(fp, boundsOf([back, A, Tt], 0.05 * k), body, 0.015);
    // the toes and the sandal's straps
    for (let t = 0; t < 4; t++) {
      const tx = Tt[0] - dir * t * 0.016 * k;
      g.strokeStyle = rgba(deep, 0.45);
      g.lineWidth = lw;
      g.beginPath();
      g.moveTo(tx, Tt[1] - 0.025 * k);
      g.lineTo(tx - dir * 0.004 * k, Tt[1]);
      g.stroke();
    }
    mark([pose.an[i], [pose.an[i][0] + 0.06, pose.an[i][1] - 0.04]], 0.006, true, 0.5);
  };

  // ——— legs and arms, with their anatomy ———
  const leg = (i: 0 | 1) => {
    const hp = pose.hip[i];
    const kn = pose.kn[i];
    const an = pose.an[i];
    limb3(hp, kn, an, [[0, 0.082], [0.22, 0.085], [0.42, 0.06], [0.5, 0.05], [0.6, 0.044], [0.85, 0.032], [1, 0.027]], [[0, 0.092], [0.2, 0.075], [0.44, 0.052], [0.52, 0.05], [0.62, 0.068], [0.78, 0.045], [1, 0.03]]);
    foot(i);
    // the knee cap, the teardrop of the vastus above it, the shin's ridge, the calf
    blob(lerp2(kn, hp, 0.02), 0.035, 0.03, lit, 0.45);
    mark([lerp2(kn, hp, 0.05), add(lerp2(kn, an, 0.05), perp(kn, an, -0.02))], 0.005, true, 0.45);
    mark([lerp2(hp, kn, 0.55), add(lerp2(hp, kn, 0.78), perp(hp, kn, 0.05)), lerp2(hp, kn, 0.92)], 0.005, true, 0.35);
    mark([lerp2(kn, an, 0.2), lerp2(kn, an, 0.8)], 0.006, false, 0.35);
    mark([add(lerp2(kn, an, 0.15), perp(kn, an, -0.05)), add(lerp2(kn, an, 0.4), perp(kn, an, -0.06)), lerp2(kn, an, 0.75)], 0.005, true, 0.35);
  };
  const arm = (i: 0 | 1) => {
    const sh = pose.sh[i];
    const el = pose.el[i];
    const broken = pose.stump === i;
    const ha = broken ? lerp2(el, pose.ha[i], 0.45) : pose.ha[i];
    const out: Pt[] = [[0, 0.07], [0.15, 0.072], [0.32, 0.05], [0.5, 0.04], [0.62, 0.05], [0.85, 0.034], [1, broken ? 0.042 : 0.028]];
    const inn: Pt[] = [[0, 0.06], [0.28, 0.058], [0.46, 0.042], [0.52, 0.04], [0.64, 0.046], [0.85, 0.032], [1, broken ? 0.042 : 0.026]];
    limb3(sh, el, ha, out, inn);
    // the deltoid's edge, the biceps' hollow, the elbow
    mark([lerp2(sh, el, 0.05), add(lerp2(sh, el, 0.25), perp(sh, el, 0.05)), lerp2(sh, el, 0.42)], 0.005, true, 0.45);
    mark([lerp2(sh, el, 0.5), lerp2(sh, el, 0.85)], 0.006, false, 0.3);
    blob(el, 0.03, 0.025, deep, 0.3);
    if (broken) {
      // the fracture face: rough pale stone, its pits dark
      const [fx, fy] = S(ha);
      const ang = Math.atan2(S(ha)[1] - S(el)[1], S(ha)[0] - S(el)[0]);
      g.save();
      g.translate(fx, fy);
      g.rotate(ang);
      g.beginPath();
      const n = 9;
      for (let j = 0; j <= n; j++) {
        const a = -Math.PI / 2 + (j / n) * Math.PI;
        const rad = 0.044 * k * (0.85 + rr() * 0.3);
        g.lineTo(Math.cos(a) * rad * 0.45 + (rr() - 0.3) * 0.01 * k, Math.sin(a) * rad);
      }
      g.closePath();
      g.fillStyle = T('#c8c0b2');
      g.fill();
      for (let j = 0; j < 6; j++) {
        g.fillStyle = rgba(T('#5a5660'), 0.6);
        g.beginPath();
        g.arc((rr() - 0.3) * 0.015 * k, (rr() - 0.5) * 0.06 * k, (0.003 + rr() * 0.005) * k, 0, P2);
        g.fill();
      }
      g.strokeStyle = rgba(ink, 0.5);
      g.lineWidth = lw;
      g.stroke();
      g.restore();
      return;
    }
    hand(i);
  };

  // ——— the body ———
  const torso = () => {
    const P0: Pt = lerp2(pose.hip[0], pose.hip[1], 0.5);
    const N0 = pose.neck;
    const sx0 = N0[0] - P0[0];
    const sy0 = N0[1] - P0[1];
    const sl = Math.hypot(sx0, sy0);
    const su: Pt = [sx0 / sl, sy0 / sl];
    const sn: Pt = [su[1], -su[0]];
    const at = (t: number, w: number): Pt => [P0[0] + su[0] * sl * t + sn[0] * w, P0[1] + su[1] * sl * t + sn[1] * w];
    const side = (sg: number) => [at(-0.04, sg * 0.165), at(0.3, sg * 0.135), at(0.62, sg * 0.18), at(0.86, sg * 0.2), at(1, sg * 0.12)];
    const R = side(1).map(S);
    const L = side(-1).map(S);
    const tp = (c: Ctx) => {
      c.beginPath();
      c.moveTo(...L[0]);
      c.quadraticCurveTo(...L[1], ...L[2]);
      c.quadraticCurveTo(...L[3], ...L[4]);
      c.quadraticCurveTo(...S(at(1.08, 0)), ...R[4]);
      c.quadraticCurveTo(...R[3], ...R[2]);
      c.quadraticCurveTo(...R[1], ...R[0]);
      c.quadraticCurveTo(...S(at(-0.1, 0)), ...L[0]);
      c.closePath();
    };
    form(tp, boundsOf([...R, ...L], 4), body, 0.03);
    // the anatomy: collarbones, the pectorals' lower edges and their lit masses, the sternum, the abdominal grid,
    // the navel, the obliques and the iliac line (the chiton covers most of it on the youth)
    if (pose.dress !== 'chiton') {
      for (const sg of [-1, 1]) {
        mark([at(0.97, sg * 0.02), at(0.95, sg * 0.1), at(0.98, sg * 0.17)], 0.005, false, 0.5);
        mark([at(0.72, sg * 0.01), at(0.66, sg * 0.1), at(0.74, sg * 0.18)], 0.008, true, 0.55);
        blob(at(0.8, sg * 0.09), 0.07, 0.045, lit, 0.3);
        for (const t of [0.36, 0.46, 0.56]) mark([at(t, sg * 0.01), at(t + 0.01, sg * 0.07)], 0.005, true, 0.4);
        mark([at(0.45, sg * 0.12), at(0.25, sg * 0.14), at(0.05, sg * 0.07)], 0.006, true, 0.45);
        blob(at(0.2, sg * 0.1), 0.05, 0.06, lit, 0.2);
      }
      mark([at(0.86, 0), at(0.28, 0)], 0.005, true, 0.45);
      blob(at(0.3, 0), 0.012, 0.012, deep, 0.7);
    }
    // the neck, the sterno-mastoid's line
    limb(N0, lerp2(N0, pose.head, 0.6), 0.058, 0.052, 0.06);
    mark([lerp2(N0, pose.head, 0.1), add(lerp2(N0, pose.head, 0.6), [0.03, 0])], 0.005, true, 0.4);
  };
  const dress = () => {
    const P0: Pt = lerp2(pose.hip[0], pose.hip[1], 0.5);
    const W0 = pose.waist;
    if (pose.dress === 'kilt') {
      // a short kilt wrapped round the hips, belted, folds falling from the knot at his side
      const pts: Pt[] = [add(W0, [-0.17, -0.02]), add(W0, [0.17, 0.0]), add(P0, [0.2, -0.24]), add(P0, [0.06, -0.28]), add(P0, [-0.08, -0.26]), add(P0, [-0.22, -0.2])];
      const sp = pts.map(S);
      const pth = polyPath(sp);
      form(pth, boundsOf(sp, 2), body, 0.02);
      g.save();
      pth(g);
      g.clip();
      for (let f = 0; f < 7; f++) {
        const t = f / 6;
        const top = lerp2(pts[0], pts[1], 0.3 + t * 0.5);
        const bot = lerp2(pts[5], pts[2], t);
        mark([top, lerp2(top, bot, 0.5), bot], 0.012, f % 2 === 0, 0.4);
      }
      g.restore();
      mark([add(W0, [-0.18, 0]), add(W0, [0.18, 0.01])], 0.018, true, 0.55);
      mark([add(W0, [-0.17, 0.012]), add(W0, [0.17, 0.022])], 0.006, false, 0.4);
    } else {
      // a chiton: falling from the far shoulder (the near one bare), belted, folds running down to its hem
      const pts: Pt[] = [add(pose.sh[0], [0.03, 0.04]), add(pose.neck, [0.03, -0.03]), add(pose.sh[1], [0.09, -0.05]), add(pose.sh[1], [0.06, -0.16]), add(W0, [-0.15, 0]), add(P0, [-0.21, -0.3]), add(P0, [-0.03, -0.35]), add(P0, [0.19, -0.3]), add(W0, [0.15, 0.01]), add(pose.sh[0], [0.05, -0.14])];
      const sp = pts.map(S);
      const pth = polyPath(sp);
      form(pth, boundsOf(sp, 2), mix(body, lit, 0.08), 0.025);
      g.save();
      pth(g);
      g.clip();
      for (let f = 0; f < 9; f++) {
        const t = f / 8;
        const top = lerp2(pts[4], pts[8], t);
        const bot = lerp2(pts[5], pts[7], t);
        mark([top, add(lerp2(top, bot, 0.5), [(rr() - 0.5) * 0.03, 0]), bot], 0.012, f % 2 === 1, 0.42);
        const sh = lerp2(pts[2], pts[0], t);
        mark([sh, lerp2(sh, top, 0.6), top], 0.008, f % 2 === 0, 0.3);
      }
      g.restore();
      mark([add(W0, [-0.2, 0]), add(W0, [0.19, 0.02])], 0.02, true, 0.5);
    }
  };
  const cloak = () => {
    if (!pose.cloak) return;
    const pts = pose.cloak;
    const sp = pts.map(S);
    const pth = polyPath(sp);
    form(pth, boundsOf(sp, 2), mix(body, shd, 0.15), 0.025);
    // its folds: from the pin over the shoulder down to the hem, ridges catching the light, valleys deep
    g.save();
    pth(g);
    g.clip();
    const pin = pts[0];
    const n = pts.length;
    for (let i = 2; i < n - 1; i++) {
      const q = pts[i];
      const mid: Pt = [(pin[0] + q[0]) / 2 + 0.05, (pin[1] + q[1]) / 2];
      mark([lerp2(pin, q, 0.1), mid, q], i % 2 ? 0.018 : 0.01, i % 2 === 1, i % 2 ? 0.5 : 0.4);
    }
    g.restore();
  };
  const head = () => {
    if (o.noHead) return;
    const H = pose.head;
    const f = 1;
    const tilt = pose.tilt ?? 0;
    // the head in its own frame (u to the face, v up), tilted back
    const hp = (u: number, v: number): Pt => {
      const c = Math.cos(tilt);
      const s = Math.sin(tilt);
      return [H[0] + (u * c - v * s) * f, H[1] + (u * s + v * c)];
    };
    const cran = (c: Ctx) => {
      c.beginPath();
      const n = 24;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * P2;
        const p = S(hp(-0.012 + Math.cos(a) * 0.1, 0.01 + Math.sin(a) * 0.112));
        if (i) c.lineTo(...p);
        else c.moveTo(...p);
      }
      c.closePath();
    };
    // the face's profile: brow, nose, the open mouth, chin, jaw
    const prof: [number, number][] = [[0.02, 0.105], [0.085, 0.06], [0.1, 0.03], [0.098, 0.012], [0.135, -0.03], [0.108, -0.045], [0.112, -0.058], [0.098, -0.07], [0.104, -0.092], [0.098, -0.118], [0.07, -0.135], [0.02, -0.125], [-0.04, -0.07], [-0.05, 0.0]];
    const facePts = prof.map(([u, v]) => S(hp(u, v)));
    const facePath = polyPath(facePts);
    form(cran, boundsOf([S(hp(-0.12, -0.11)), S(hp(0.1, 0.13))], 2), body, 0.02);
    form(facePath, boundsOf(facePts, 2), body, 0.015);
    // the features: raised brows (terror), the socket's shadow and the blank eyeball, the nose's lit ridge and its
    // nostril, the fold from nose to mouth, the mouth wide open, the cheekbone, the ear
    blob(hp(0.06, 0.012), 0.03, 0.02, deep, 0.75);
    blob(hp(0.066, 0.008), 0.016, 0.012, lit, 0.55);
    mark([hp(0.035, 0.045), hp(0.065, 0.06), hp(0.094, 0.045)], 0.006, false, 0.7);
    mark([hp(0.03, 0.075), hp(0.06, 0.082), hp(0.09, 0.072)], 0.003, true, 0.45);
    mark([hp(0.1, 0.025), hp(0.13, -0.025)], 0.005, false, 0.6);
    blob(hp(0.105, -0.035), 0.01, 0.007, deep, 0.8);
    mark([hp(0.1, -0.04), hp(0.085, -0.06), hp(0.08, -0.085)], 0.004, true, 0.5);
    blob(hp(0.05, -0.02), 0.035, 0.025, lit, 0.35);
    // the mouth: a dark oval, the lit lower lip under it
    const [mx, my] = S(hp(0.09, -0.078));
    g.fillStyle = rgba(T('#0e0c12'), 0.9);
    g.beginPath();
    g.ellipse(mx, my, 0.02 * k, 0.025 * k, -tilt, 0, P2);
    g.fill();
    mark([hp(0.076, -0.096), hp(0.09, -0.102), hp(0.104, -0.094)], 0.005, false, 0.6);
    // the ear
    const [ex, ey] = S(hp(-0.02, 0.0));
    g.strokeStyle = rgba(deep, 0.6);
    g.lineWidth = Math.max(0.6, 0.006 * k);
    g.beginPath();
    g.ellipse(ex, ey, 0.016 * k, 0.026 * k, 0, -1.2, 2.4);
    g.stroke();
    // the hair: a cap of tight curls over the crown and the nape; the beard a mass of curls along his jaw
    const curls = (pts: Pt[], n: number, s2: number) => {
      const sp = pts.map((p) => S(hp(p[0], p[1])));
      const pth = polyPath(sp);
      form(pth, boundsOf(sp, 2), mix(body, shd, 0.1), 0.015);
      if (!detail) return;
      const b2 = boundsOf(sp, 0);
      g.save();
      pth(g);
      g.clip();
      for (let i = 0; i < n; i++) {
        const cx = b2.x + rr() * b2.w;
        const cy = b2.y + rr() * b2.h;
        g.strokeStyle = rgba(deep, 0.55);
        g.lineWidth = Math.max(0.5, s2 * k * 0.35);
        g.beginPath();
        g.arc(cx, cy, s2 * k, 0.4, 4.6);
        g.stroke();
        g.strokeStyle = rgba(lit, 0.45);
        g.beginPath();
        g.arc(cx - 0.3, cy - 0.3, s2 * k * 0.8, 3.4, 5.6);
        g.stroke();
      }
      g.restore();
    };
    if (!pose.helm) curls([[-0.11, 0.02], [-0.1, 0.09], [-0.03, 0.125], [0.05, 0.115], [0.09, 0.085], [0.06, 0.07], [0.0, 0.08], [-0.04, 0.04], [-0.06, -0.04], [-0.1, -0.05]], 26, 0.012);
    else curls([[-0.11, 0.04], [-0.1, -0.06], [-0.06, -0.05], [-0.04, 0.03]], 10, 0.012);
    if (pose.beard) curls([[-0.035, -0.04], [0.0, -0.075], [0.07, -0.1], [0.095, -0.11], [0.09, -0.145], [0.04, -0.16], [-0.02, -0.12]], 18, 0.01);
    if (pose.helm === 'crest') {
      // a Corinthian helmet pushed up on his crown (its face-guard jutting forward over his brow), its crest arching
      // back on a short stilt, the horsehair combed
      const arc = (cxu: number, cyv: number, rx: number, ry: number, a0: number, a1: number, n: number) => Array.from({ length: n + 1 }, (_, i) => {
        const a = a0 + ((a1 - a0) * i) / n;
        return hp(cxu + Math.cos(a) * rx, cyv + Math.sin(a) * ry);
      });
      const outer = arc(-0.09, 0.1, 0.2, 0.19, 0.35, 2.75, 14);
      const inner = arc(-0.09, 0.1, 0.13, 0.11, 2.75, 0.35, 14);
      const crest = [...outer, ...inner].map(S);
      form(polyPath(crest), boundsOf(crest, 2), mix(body, shd, 0.12), 0.02);
      if (detail) {
        g.save();
        polyPath(crest)(g);
        g.clip();
        for (let i = 0; i < 22; i++) {
          const a = 0.35 + (2.4 * i) / 21;
          mark([hp(-0.09 + Math.cos(a) * 0.12, 0.1 + Math.sin(a) * 0.1), hp(-0.09 + Math.cos(a) * 0.21, 0.1 + Math.sin(a) * 0.2)], 0.0035, i % 2 === 0, 0.45);
        }
        g.restore();
      }
      const dome = [...arc(0.0, 0.03, 0.115, 0.115, Math.PI * 1.0, Math.PI * 0.06, 12), hp(0.17, 0.08), hp(0.175, 0.055), hp(0.11, 0.035), hp(0.03, 0.05), hp(-0.06, 0.02), hp(-0.115, 0.0)].map(S);
      form(polyPath(dome), boundsOf(dome, 2), body, 0.02);
      // the eye-holes of the raised face-guard, black, and its brow ridge
      const slot = [hp(0.11, 0.065), hp(0.165, 0.065), hp(0.16, 0.052), hp(0.11, 0.05)].map(S);
      g.fillStyle = rgba(T('#0e0c12'), detail ? 0.85 : 0);
      polyPath(slot)(g);
      g.fill();
      mark([hp(0.0, 0.1), hp(0.08, 0.11), hp(0.16, 0.085)], 0.005, false, 0.55);
    } else if (pose.helm === 'cap') {
      const cpts = [hp(-0.11, 0.0), hp(-0.08, 0.1), hp(0.0, 0.14), hp(0.09, 0.1), hp(0.11, 0.05), hp(-0.1, 0.03)].map(S);
      form(polyPath(cpts), boundsOf(cpts, 2), body, 0.02);
    }
  };
  const weapon = () => {
    if (pose.blade) {
      // the hilt in his fist and a hand's length of blade, snapped off
      const [a, b] = pose.blade.map(S);
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const nx = -Math.sin(ang);
      const ny = Math.cos(ang);
      const w = 0.026 * k;
      const pts: Pt[] = [[a[0] + nx * w, a[1] + ny * w], [b[0] + nx * w * 0.8, b[1] + ny * w * 0.8], [b[0] + Math.cos(ang) * w * 0.6, b[1] + Math.sin(ang) * w * 0.6], [b[0] - nx * w * 0.2, b[1] - ny * w * 0.2], [b[0] + Math.cos(ang) * w * 0.3 - nx * w * 0.8, b[1] + Math.sin(ang) * w * 0.3 - ny * w * 0.8], [a[0] - nx * w, a[1] - ny * w]];
      form(polyPath(pts), boundsOf(pts, 2), body, 0.01);
      const gp: Pt[] = [[a[0] + nx * 0.065 * k, a[1] + ny * 0.065 * k], [a[0] - nx * 0.065 * k, a[1] - ny * 0.065 * k]];
      g.strokeStyle = rgba(ink, 0.6);
      g.lineWidth = 0.028 * k;
      g.beginPath();
      g.moveTo(...gp[0]);
      g.lineTo(...gp[1]);
      g.stroke();
      g.strokeStyle = body;
      g.lineWidth = 0.02 * k;
      g.stroke();
    }
    if (pose.spear) {
      const [a, b] = pose.spear.map(S);
      g.strokeStyle = rgba(ink, 0.6);
      g.lineWidth = 0.045 * k;
      g.beginPath();
      g.moveTo(...a);
      g.lineTo(...b);
      g.stroke();
      g.strokeStyle = body;
      g.lineWidth = 0.03 * k;
      g.stroke();
    }
    if (pose.bow) {
      const [hx, hy] = S(pose.ha[0]);
      g.strokeStyle = rgba(ink, 0.6);
      g.lineWidth = 0.035 * k;
      g.beginPath();
      g.moveTo(hx, hy);
      g.quadraticCurveTo(hx + dir * 0.12 * k, hy + 0.2 * k, hx + dir * 0.02 * k, hy + 0.42 * k);
      g.stroke();
      g.strokeStyle = body;
      g.lineWidth = 0.022 * k;
      g.stroke();
    }
  };

  // ——— carve it: far limbs, the cloak behind, the body, near limbs, the head ———
  if (o.onlyHead) head();
  else {
    if (pose.farBehind) arm(0);
    cloak();
    leg(0);
    torso();
    leg(1);
    dress();
    if (!pose.farBehind) arm(0);
    head();
    weapon();
    arm(1);
  }
  if (detail) {
    // ——— weathering: one piece of stone (painted over it, then cut back to its silhouette) ———
    const [sil, sg] = makeCanvas(cv.width, cv.height);
    sg.drawImage(cv, 0, 0);
    const box = { x: bb.x, y: bb.y, w: bb.w, h: bb.h };
    grain(g, box, 'speckle', 0.32, 0.6);
    lay(g, drift(mix(lit, '#e8d8c0', 0.3), mix(deep, '#1a1c14', 0.4), 4, o.seed, 40, 60), box, 0.14);
    lay(g, noiseMask(26, o.seed + 3, { cover: 0.25, soft: 0.05, col: deep, kind: 'web', w: 90, h: 160 }), box, 0.08);
    // black streaks where the rain runs down from the head, the shoulders, the raised arm, the belt
    for (const p of [pose.head, pose.sh[0], pose.sh[1], pose.el[0], pose.waist, lerp2(pose.hip[0], pose.kn[0], 0.3)]) {
      const [px, py] = S(p);
      streaks(g, rr, px, py, 0.16 * k, 0.55 * k, T('#14161a'), 0.3, 3);
    }
    // moss in the hollows and on the tops, lichen spotting the lit side
    for (const m of pose.moss ?? []) {
      const [mx, my] = S(m);
      moss(g, rr, mx, my, 0.07 * k, 0.04 * k, o.depth);
    }
    for (let i = 0; i < 40; i++) {
      const px = bb.x + rr() * bb.w * 0.7;
      const py = bb.y + rr() * bb.h * 0.7;
      const cl = rr() < 0.6 ? T('#c4c48a') : T('#c8945a');
      for (let j = 0; j < 3; j++) {
        g.fillStyle = rgba(cl, 0.3 + rr() * 0.2);
        g.beginPath();
        g.arc(px + (rr() - 0.5) * 0.02 * k, py + (rr() - 0.5) * 0.02 * k, (0.003 + rr() * 0.006) * k, 0, P2);
        g.fill();
      }
    }
    // the dusk settling on it: darker low down where the ground's shade reaches, the green coming up from below
    vfill(g, bb.x, bb.y, bb.w, bb.h, [[0, rgba('#0e1018', 0)], [0.55, rgba('#0e1018', 0.06)], [1, rgba('#0a1410', 0.35)]]);
    vfill(g, bb.x, bb.y + bb.h * 0.4, bb.w, bb.h * 0.6, [[0, rgba(GLOW, 0)], [1, rgba(GLOW, 0.22 * up)]]);
    // cracks with a lit lip, chips knocked out of the edges
    for (const [cu, cv2, ca, cl] of pose.cracks ?? []) crack(g, rr, ...S([cu, cv2]), ca * (dir > 0 ? 1 : -1) + (dir > 0 ? 0 : Math.PI), cl * k, { col: T('#100e14'), lip: T('#e0d8cc'), w: Math.max(0.8, k * 0.007), a: 0.75, branch: 0.12 });
    for (const p of [pose.kn[1], pose.el[1], pose.sh[1], pose.toe[1]]) {
      const [px, py] = S(p);
      g.fillStyle = rgba(T('#d8d0c4'), 0.55);
      g.beginPath();
      g.ellipse(px + 0.03 * k, py + 0.01 * k, 0.012 * k, 0.007 * k, 0.5, 0, P2);
      g.fill();
      g.fillStyle = rgba(deep, 0.5);
      g.beginPath();
      g.ellipse(px + 0.026 * k, py + 0.005 * k, 0.008 * k, 0.004 * k, 0.5, 0, P2);
      g.fill();
    }
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(sil, 0, 0);
    g.restore();
    // one thin outline round the whole: the silhouette in ink, a hair larger, under it
    const [oc, og] = makeCanvas(cv.width, cv.height);
    og.drawImage(cv, 0, 0);
    og.globalCompositeOperation = 'source-in';
    og.fillStyle = rgba(ink, 0.85);
    og.fillRect(0, 0, oc.width, oc.height);
    const ow = Math.max(0.8, k * 0.008);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * P2;
      ctx.drawImage(oc, bb.x + Math.cos(a) * ow, bb.y + Math.sin(a) * ow, bb.w, bb.h);
    }
  }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(cv, bb.x, bb.y, bb.w, bb.h);
}

/** A plinth (X, z its centre on the floor; w wide, h high, d deep): a block with a moulded cap and base, its front
 * and the side that faces the middle showing, moss on its top, the weather down its faces. */
function plinth(ctx: Ctx, r: R, X: number, z: number, w: number, h: number, d: number, detail = true): void {
  const s = X < 0 ? 1 : -1;
  const zf = z - d / 2;
  const zb = z + d / 2;
  const Xn = X + (s * w) / 2;
  const Xo = X - (s * w) / 2;
  const front = faceAt(X - w / 2, X + w / 2, 0, h, zf);
  const sideP = sideAt(Xn, zf, zb, 0, h);
  const capH = 0.08;
  const base = '#7a7488';
  // its shadow on the floor (down and to the right)
  if (detail) {
    const [fx, fy] = P(X + 0.08, 0, z - d / 2 + 0.02);
    groundShadow(ctx, fx, fy, w * ppu(z) * 0.56, d * ppu(z) * 0.18, 0.65, '#06050a', 0.6);
  }
  fillPath(ctx, sideP, mix(base, '#3a3648', 0.45));
  fillPath(ctx, front, base);
  const fb = boxOfPts([P(X - w / 2, 0, zf), P(X + w / 2, h, zf)], 2);
  if (detail) {
    within(ctx, front, () => {
      surface(ctx, r, fb, base, { over: true, vary: 0.3, cells: 3, mottle: 0.3, strokes: 0, grain: 0.22, grainKind: 'speckle', seed: 131 + Math.round(X) });
      vfill(ctx, fb.x, fb.y, fb.w, fb.h, [[0, rgba('#d8c8c0', 0.1)], [0.3, rgba('#d8c8c0', 0)], [1, rgba('#1a2018', 0.45)]]);
      streaks(ctx, r, fb.x + fb.w * 0.5, fb.y + 4, fb.w * 0.8, fb.h * 0.7, '#1c1a22', 0.2, 6);
      lay(ctx, noiseMask(6, 133 + Math.round(X), { cover: 0.3, soft: 0.2, col: MOSS[2], w: 40, h: 30 }), { x: fb.x, y: fb.y + fb.h * 0.55, w: fb.w, h: fb.h * 0.45 }, 0.6);
      // a worn dedication, its letters gone to scratches
      const [lx, ly] = P(X - w * 0.32, h * 0.55, zf);
      ctx.strokeStyle = rgba('#24202c', 0.4);
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 7; i++) {
        const cx = lx + i * w * 0.095 * ppu(zf);
        ctx.beginPath();
        ctx.moveTo(cx, ly);
        ctx.lineTo(cx + (r() - 0.5) * 6, ly - 0.07 * ppu(zf));
        if (r() < 0.6) {
          ctx.moveTo(cx - 3, ly - 0.035 * ppu(zf));
          ctx.lineTo(cx + 4, ly - 0.035 * ppu(zf));
        }
        ctx.stroke();
      }
    });
    within(ctx, sideP, () => {
      const sb = boxOfPts([P(Xn, 0, zf), P(Xn, h, zb)], 2);
      grain(ctx, sb, 'speckle', 0.22, 0.9);
      vfill(ctx, sb.x, sb.y, sb.w, sb.h, [[0, rgba('#c8c0d0', 0.08)], [1, rgba('#14121c', 0.3)]]);
      // the pool's green on the side that faces it
      ctx.fillStyle = rgba(GLOW, 0.14);
      ctx.fillRect(sb.x, sb.y, sb.w, sb.h);
    });
  }
  // the moulded cap: a slab a little wider all round, its top lit by the sky, moss on it
  const cw = 0.06;
  const capFront = faceAt(X - w / 2 - cw, X + w / 2 + cw, h - capH, h, zf - cw);
  const capTop = topAt(X - w / 2 - cw, X + w / 2 + cw, zf - cw, zb + cw, h);
  const capSide = sideAt(Xn + s * cw, zf - cw, zb + cw, h - capH, h);
  fillPath(ctx, capSide, mix(base, '#3a3648', 0.35));
  fillPath(ctx, capTop, '#9a94a8');
  fillPath(ctx, capFront, '#8a8498');
  if (detail) {
    within(ctx, capTop, () => {
      const tb = boxOfPts([P(X - w / 2 - cw, h, zf - cw), P(X + w / 2 + cw, h, zb + cw)], 2);
      lay(ctx, noiseMask(8, 137 + Math.round(X), { cover: 0.4, soft: 0.2, col: MOSS[1], w: 60, h: 12 }), tb, 0.7);
    });
    chips(ctx, r, ...(() => {
      const [a, y] = P(X - w / 2 - cw, h, zf - cw);
      const [b] = P(X + w / 2 + cw, h, zf - cw);
      return [a, b, y] as [number, number, number];
    })(), 6, '#8a8498', 3);
    // the cap's shadow on the block under it
    const [c0, cy] = P(X - w / 2, h - capH, zf);
    const [c1] = P(X + w / 2, h - capH, zf);
    crevice(ctx, c0, c1, cy, 8, 0.45, '#0c0a14');
  }
  for (const p of [capFront, capSide, front, sideP]) strokePath(ctx, p, rgba('#100e16', 0.6), 1.2);
  // the base moulding
  const bf = faceAt(X - w / 2 - cw * 0.6, X + w / 2 + cw * 0.6, 0, 0.07, zf - cw * 0.6);
  fillPath(ctx, bf, '#6a6478');
  strokePath(ctx, bf, rgba('#100e16', 0.6), 1);
  void Xo;
  // where it stands on the floor
  const [b0, by] = P(X - w / 2 - 0.05, 0, zf - 0.04);
  const [b1] = P(X + w / 2 + 0.05, 0, zf - 0.04);
  crevice(ctx, b0, b1, by, 6, 0.5, '#0a0812');
}

/** A statue on its plinth at (X, z). */
function statueOn(ctx: Ctx, r: R, st: { X: number; z: number }, pose: Pose, dir: number, ph: number, depth: number, seed: number, uplight = 0.25, simple = false): void {
  const pw = 0.95 * (ph > 0.4 ? 1 : 0.8);
  plinth(ctx, r, st.X, st.z, pw, ph, 0.75);
  const k = ppu(st.z);
  const [x, y] = P(st.X, ph, st.z);
  // the contact: a dark seam where the feet meet the plinth's top
  ctx.fillStyle = rgba('#0c0a14', 0.4);
  ctx.beginPath();
  ctx.ellipse(x + 0.05 * k, y + 0.02 * k, 0.45 * k, 0.06 * k, 0, 0, P2);
  ctx.fill();
  hero(ctx, x, y, k, pose, dir, { depth, seed, pool: st.X < 0 ? 1 : -1, uplight, simple });
}

export const STAT_L_BOX = { x: 64, y: 250, w: 250, h: TY - 250 };
export const STAT_R_BOX = { x: 1602, y: 290, w: 262, h: TY - 290 };
export const PROPS_L_BOX = { x: 196, y: 630, w: 300, h: TY - 630 };
export const STAT_BL_BOX = { x: 590, y: 380, w: 170, h: 196 };
export const STAT_BR_BOX = { x: 1150, y: 370, w: 180, h: 206 };

function statueL(ctx: Ctx, r: R): void {
  statueOn(ctx, r, MD.statL, POSE.hoplite, 1, 0.55, 0.12, 11);
}

/** What he dropped: the snapped blade lying where it fell, and his shield at his feet. */
function propsL(ctx: Ctx): void {
  // the snapped blade lying where it fell, behind the plinth, and his shield, dropped at his feet
  const [bx, by] = P(-3.9, 0, 4.55);
  const bk = ppu(4.55);
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(-0.12);
  ctx.fillStyle = rgba('#0a0812', 0.55);
  ctx.beginPath();
  ctx.ellipse(0.0 * bk + 4, 3.5, 0.3 * bk, 3.5, 0, 0, P2);
  ctx.fill();
  ctx.fillStyle = lin(ctx, [0, -4], [0, 3], [[0, '#a8a2b0'], [1, '#5a566a']]);
  ctx.beginPath();
  ctx.moveTo(-0.3 * bk, -3);
  ctx.lineTo(0.22 * bk, -2.5);
  ctx.lineTo(0.28 * bk, 0);
  ctx.lineTo(0.22 * bk, 2.5);
  ctx.lineTo(-0.3 * bk, 2);
  ctx.lineTo(-0.27 * bk, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#141018';
  ctx.lineWidth = 1.1;
  ctx.stroke();
  ctx.restore();
  shield(ctx);
}

/** His shield (a hoplite's round aspis), dropped on its back at the plinth's foot, the bronze facing gone green-black
 * with verdigris, a dent in it, its blazon (a scorpion) barely there. */
function shield(ctx: Ctx): void {
  const z = 3.42;
  const [cx, cy] = P(-3.9, 0.05, z);
  const k = ppu(z);
  const rx = 0.4 * k;
  const ry = rx * (EH / z) * 1.15;
  groundShadow(ctx, cx + 10, cy + 6, rx * 1.05, ry * 0.95, 0.6, '#0a0812');
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.08);
  // its face: a shallow bronze dome gone brown-green, a dull sheen of the sky on its upper slope
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, P2);
  ctx.fillStyle = '#20241a';
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-rx * 0.02, -ry * 0.04, rx * 0.86, ry * 0.82, 0, 0, P2);
  const g = ctx.createRadialGradient(-rx * 0.3, -ry * 0.45, rx * 0.05, 0, 0, rx);
  g.addColorStop(0, '#8a8a62');
  g.addColorStop(0.35, '#55583e');
  g.addColorStop(0.8, '#2c3224');
  g.addColorStop(1, '#1a1e16');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  lay(ctx, noiseMask(7, 141, { cover: 0.35, soft: 0.25, col: '#5a9a7a', w: 40, h: 20 }), { x: -rx, y: -ry, w: rx * 2, h: ry * 2 }, 0.35);
  lay(ctx, noiseMask(5, 143, { cover: 0.25, soft: 0.2, col: MOSS[2], w: 30, h: 16 }), { x: -rx, y: -ry, w: rx * 2, h: ry * 2 }, 0.4);
  // its blazon, painted in red-brown and mostly worn away: a scorpion, tail curled over its back
  ctx.strokeStyle = rgba('#6a3424', 0.45);
  ctx.fillStyle = rgba('#6a3424', 0.45);
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.ellipse(-rx * 0.05, ry * 0.05, rx * 0.14, ry * 0.2, 0, 0, P2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(rx * 0.08, 0);
  ctx.quadraticCurveTo(rx * 0.35, -ry * 0.05, rx * 0.36, -ry * 0.4);
  ctx.quadraticCurveTo(rx * 0.33, -ry * 0.62, rx * 0.2, -ry * 0.5);
  ctx.stroke();
  for (const sg of [-1, 1]) {
    for (let l = 0; l < 3; l++) {
      ctx.beginPath();
      ctx.moveTo(-rx * 0.05, ry * 0.05 + sg * ry * 0.12);
      ctx.lineTo(-rx * (0.1 + l * 0.06), sg * ry * (0.35 + l * 0.06));
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-rx * 0.15, sg * ry * 0.08);
    ctx.quadraticCurveTo(-rx * 0.38, sg * ry * 0.22, -rx * 0.42, sg * ry * 0.05);
    ctx.stroke();
  }
  // a dent, its dark hollow and lit lip
  ctx.fillStyle = rgba('#0a0e0c', 0.45);
  ctx.beginPath();
  ctx.ellipse(-rx * 0.4, ry * 0.3, rx * 0.12, ry * 0.08, 0.4, 0, P2);
  ctx.fill();
  ctx.restore();
  // the rolled rim: lit along its far edge, the green glow from the pool along its right
  ctx.lineWidth = Math.max(2, rx * 0.06);
  ctx.strokeStyle = rgba('#b8b088', 0.5);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 0.93, ry * 0.9, 0, Math.PI * 1.05, Math.PI * 1.75);
  ctx.stroke();
  ctx.strokeStyle = rgba(GLOW, 0.3);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 0.93, ry * 0.9, 0, -0.6, 0.5);
  ctx.stroke();
  ctx.strokeStyle = '#0c100c';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, P2);
  ctx.stroke();
  ctx.restore();
}

function statueR(ctx: Ctx, r: R): void {
  statueOn(ctx, r, MD.statR, POSE.youth, -1, 0.55, 0.12, 23);
  // his broken-off hand lying on the plinth's foot
  const [hx, hy] = P(4.25, 0.02, 3.42);
  const k = ppu(3.42);
  ctx.fillStyle = rgba('#0a0812', 0.4);
  ctx.beginPath();
  ctx.ellipse(hx + 4, hy + 2, 0.08 * k, 0.025 * k, 0, 0, P2);
  ctx.fill();
  ctx.fillStyle = lin(ctx, [hx, hy - 8], [hx, hy + 2], [[0, '#c8c2b8'], [1, '#6a6878']]);
  ctx.beginPath();
  ctx.ellipse(hx, hy - 0.025 * k, 0.07 * k, 0.03 * k, -0.2, 0, P2);
  ctx.fill();
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(hx + (i - 1.5) * 0.025 * k, hy - 0.05 * k, 0.018 * k, 0.04 * k);
  }
  ctx.strokeStyle = '#141018';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(hx, hy - 0.025 * k, 0.07 * k, 0.03 * k, -0.2, 0, P2);
  ctx.stroke();
}

/** The toppled one: lying on his back on the paving by the pool, broken at the waist, his feet under the plinth's
 * edge, his helmeted head rolled away to the kerb. */
const FALL = { X: 3.45, z: 4.75, len: 1.58 };
export const FALLEN_BOX = (() => {
  const k = ppu(FALL.z);
  const [x, y] = P(FALL.X, 0, FALL.z);
  return { x: Math.floor(x - 0.44 * k), y: Math.floor(y - 0.6 * k), w: Math.ceil(2.2 * k), h: Math.ceil(0.85 * k) };
})();

function fallen(ctx: Ctx, r: R): void {
  const z = FALL.z;
  const k = ppu(z);
  const [x0, y] = P(FALL.X, 0, z);
  const feet = x0 + FALL.len * k;
  groundShadow(ctx, (x0 + feet) / 2 + 0.1 * k, y + 0.02 * k, FALL.len * k * 0.55, 0.07 * k, 0.55, '#0a0812', 1);
  // painted standing, turned to lie along the floor (head to the left, face up) and squashed onto it; cut in two
  const piece = (fx: number, rot: number, from: number, to: number) => {
    ctx.save();
    ctx.translate(fx, y - 0.13 * k);
    ctx.scale(1, 0.8);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.rect(-0.9 * k, -to * k, 1.8 * k, (to - from) * k);
    ctx.clip();
    hero(ctx, 0, 0, k, POSE.fallen, 1, { depth: 0.2, seed: 31, pool: 0, noHead: true, light: [0.884, -0.468] });
    ctx.restore();
  };
  // the body beyond the break, a hand's width off and askew; then the legs
  piece(feet - 0.06 * k, -Math.PI / 2 - 0.05, 1.0, 2.0);
  piece(feet, -Math.PI / 2, 0, 0.99);
  // the break: pale fresh stone between the halves, chips of him scattered round it
  const bx = feet - 1.0 * k;
  ctx.fillStyle = rgba('#d8d0c4', 0.6);
  ctx.beginPath();
  ctx.ellipse(bx - 0.02 * k, y - 0.13 * k, 0.03 * k, 0.09 * k, 0.1, 0, P2);
  ctx.fill();
  for (let i = 0; i < 9; i++) {
    const px = bx + (r() - 0.6) * 0.5 * k;
    const py = y - 0.02 * k + r() * 0.08 * k;
    ctx.fillStyle = rgba('#0a0812', 0.35);
    ctx.beginPath();
    ctx.ellipse(px + 2, py + 1, 2.5 + r() * 2, 1, 0, 0, P2);
    ctx.fill();
    ctx.fillStyle = r() < 0.5 ? '#b0aca2' : '#7a7686';
    ctx.beginPath();
    ctx.ellipse(px, py - 1, 1.6 + r() * 2.4, 1.2 + r(), r(), 0, P2);
    ctx.fill();
  }
  // his head, rolled away to the kerb, still in its helmet
  const hz = 4.36;
  const hk = ppu(hz);
  const [hx, hy] = P(3.5, 0, hz);
  groundShadow(ctx, hx + 6, hy + 1, 0.2 * hk, 0.04 * hk, 0.55, '#0a0812');
  const ra = -0.5;
  ctx.save();
  ctx.translate(hx, hy - 0.13 * hk);
  ctx.rotate(ra);
  hero(ctx, 0, 0, hk, { ...POSE.fallen, head: [0, 0] }, -1, { depth: 0.2, seed: 33, pool: 0, onlyHead: true, light: [LIGHT_V[0] * Math.cos(-ra) - LIGHT_V[1] * Math.sin(-ra), LIGHT_V[0] * Math.sin(-ra) + LIGHT_V[1] * Math.cos(-ra)] });
  ctx.restore();
}

function statueBL(ctx: Ctx, r: R): void {
  statueOn(ctx, r, MD.statBL, POSE.archer, 1, 0.3, 0.62, 41, 0.9, true);
}
function statueBR(ctx: Ctx, r: R): void {
  statueOn(ctx, r, MD.statBR, POSE.spear, -1, 0.3, 0.62, 43, 0.9, true);
}

// ——— the snakes ———
//
// A snake sliding over stone by lateral undulation: its body follows one fixed path on the ground, so as it goes the
// curves stay where they are and the body flows through them. Painted at 12 phases of one wavelength (the curves
// travelling back down the frame as the sprite moves forward by one wavelength a loop): olive-bronze, a row of dark
// saddles down its back, its pale belly showing on the turns, lit along its top; a soft shadow under it; its tongue
// flickers. Seen from above at a slant, so the curves are flattened.

export const SNK = { w: 260, h: 64, len: 214, wave: 80, amp: 13, thick: 12 };
/** Where they slide (screen): along the pool's front kerb, over the toppled hero, along the portico's top step. */
export const SNAKES = [
  { x0: 560, x1: 1360, y: sy(PL.kh, PL.z0 + PL.kw * 0.5), s: 0.95 },
  { x0: 1410, x1: 1600, y: sy(0, FALL.z) - 0.33 * ppu(FALL.z), s: 0.72 },
  { x0: 700, x1: 1210, y: sy(3 * ST.rise, (stepZ(2) + TOPZ) / 2), s: 0.4 },
];

function snakeFrame(c: Ctx, ph: number): void {
  const { w, h, len, wave, amp, thick } = SNK;
  const hx = w - 24;
  const cy = h / 2;
  const n = 60;
  // the body's centre line: s from the head (0) to the tail; the curves fixed on the ground
  const at = (s: number): Pt => {
    const env = Math.min(1, 0.35 + s / 50) * (1 - Math.max(0, (s - len * 0.85) / (len * 0.6)));
    return [hx - s, cy + amp * env * Math.sin(P2 * (ph - s / wave))];
  };
  const wid = (s: number) => {
    const t = s / len;
    return thick * (t < 0.06 ? 0.75 + t * 2 : t < 0.35 ? 0.88 + (t - 0.06) * 0.4 : Math.max(0.12, 1 - (t - 0.35) * 1.4));
  };
  const L: Pt[] = [];
  const Rr: Pt[] = [];
  const C: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const s = (i / n) * len;
    const p = at(s);
    const q = at(s + 1);
    const dx = q[0] - p[0];
    const dy = q[1] - p[1];
    const l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l;
    const ny = dx / l;
    const ww = wid(s) / 2;
    C.push(p);
    L.push([p[0] + nx * ww, p[1] + ny * ww]);
    Rr.push([p[0] - nx * ww, p[1] - ny * ww]);
  }
  const body = (cc: Ctx, ox = 0, oy = 0) => {
    cc.beginPath();
    L.forEach(([x, y], i) => (i ? cc.lineTo(x + ox, y + oy) : cc.moveTo(x + ox, y + oy)));
    for (let i = Rr.length - 1; i >= 0; i--) cc.lineTo(Rr[i][0] + ox, Rr[i][1] + oy);
    cc.closePath();
  };
  // its shadow on the stone
  c.fillStyle = 'rgba(6,8,10,0.4)';
  body(c, 2.5, 3.5);
  c.fill();
  // the body: olive above, the pale belly showing below on the turns
  body(c);
  c.fillStyle = '#4e5028';
  c.fill();
  c.save();
  body(c);
  c.clip();
  c.lineCap = 'round';
  // the belly along the lower edge
  c.strokeStyle = '#7a7450';
  c.lineWidth = thick * 0.4;
  c.beginPath();
  C.forEach(([x, y], i) => {
    const ww = wid((i / n) * len) * 0.42;
    if (i) c.lineTo(x, y + ww);
    else c.moveTo(x, y + ww);
  });
  c.stroke();
  // the saddles down its back
  for (let s = 10; s < len * 0.92; s += 11) {
    const [x, y] = at(s);
    const ww = wid(s);
    c.fillStyle = '#26281a';
    c.beginPath();
    c.ellipse(x, y - ww * 0.08, ww * 0.42, ww * 0.38, 0, 0, P2);
    c.fill();
  }
  // the light along its top, and the scales' sheen
  c.strokeStyle = 'rgba(190,204,150,0.4)';
  c.lineWidth = thick * 0.16;
  c.beginPath();
  C.forEach(([x, y], i) => {
    const ww = wid((i / n) * len) * 0.3;
    if (i) c.lineTo(x, y - ww);
    else c.moveTo(x, y - ww);
  });
  c.stroke();
  c.fillStyle = 'rgba(220,230,180,0.25)';
  for (let s = 6; s < len; s += 4) {
    const [x, y] = at(s);
    c.fillRect(x, y - wid(s) * 0.2, 1, 1);
  }
  c.restore();
  c.strokeStyle = '#121408';
  c.lineWidth = 1;
  body(c);
  c.stroke();
  // the head: a blunt wedge, a little wider than the neck, its eye and the tongue flickering out
  const [hx0, hy0] = at(0);
  const [nx0, ny0] = at(6);
  const ang = Math.atan2(hy0 - ny0, hx0 - nx0);
  c.save();
  c.translate(hx0, hy0);
  c.rotate(ang);
  const flick = Math.sin(ph * P2 * 3);
  if (flick > 0.3) {
    c.strokeStyle = '#a83030';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(thick * 0.9, 0);
    c.lineTo(thick * 1.6, 0);
    c.lineTo(thick * 1.9, -2);
    c.moveTo(thick * 1.6, 0);
    c.lineTo(thick * 1.9, 2);
    c.stroke();
  }
  c.beginPath();
  c.moveTo(-thick * 0.3, -thick * 0.5);
  c.quadraticCurveTo(thick * 0.6, -thick * 0.65, thick * 1.0, -thick * 0.15);
  c.quadraticCurveTo(thick * 1.1, 0, thick * 1.0, thick * 0.15);
  c.quadraticCurveTo(thick * 0.6, thick * 0.6, -thick * 0.3, thick * 0.45);
  c.closePath();
  c.fillStyle = '#5a5c2e';
  c.fill();
  c.strokeStyle = '#121408';
  c.stroke();
  c.fillStyle = 'rgba(200,214,150,0.45)';
  c.beginPath();
  c.ellipse(thick * 0.3, -thick * 0.28, thick * 0.4, thick * 0.12, 0, 0, P2);
  c.fill();
  c.fillStyle = '#e8d860';
  c.beginPath();
  c.arc(thick * 0.55, -thick * 0.2, 1.4, 0, P2);
  c.fill();
  c.fillStyle = '#080804';
  c.fillRect(thick * 0.55 - 0.3, -thick * 0.2 - 1.2, 0.7, 2.4);
  c.restore();
}

/** The snakes where they lie in the still. */
function snakesStill(ctx: Ctx): void {
  const [cv, g] = makeCanvas(SNK.w, SNK.h);
  snakeFrame(g, 0.2);
  for (const [i, s] of SNAKES.entries()) {
    const x = s.x0 + (s.x1 - s.x0) * [0.36, 0.5, 0.62][i];
    ctx.save();
    ctx.translate(x, s.y);
    ctx.scale(i === 1 ? -s.s : s.s, s.s);
    ctx.drawImage(cv, -SNK.w / 2, -SNK.h / 2);
    ctx.restore();
  }
}

// ——— the table ———
//
// A slab of verde antico: a breccia of dark green serpentine and near-black clasts set in a web of pale green and white
// calcite veins, polished once, now dulled and worn; kept low in contrast so the pizzas (and her stone ones, pale
// grey) stand out on it. The pool's green and the afterglow touch its back edge; the front of the slab is carved with
// a band of running spirals, worn soft.

export const TABLE_BOX = { x: 0, y: TY, w: W, h: 1080 - TY };
const HY0 = yAt(1e9);

function table(ctx: Ctx, r: R): void {
  const f = MD.front;
  const box = { x: 0, y: TY, w: W, h: f - TY };
  const zf = zFront(f);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, f - TY + 4);
  ctx.clip();
  vfill(ctx, 0, TY, W, f - TY, [[0, '#1c2822'], [0.5, '#223028'], [1, '#26342c']]);
  surface(ctx, r, box, '#22302a', { over: true, vary: 0.35, cells: 5, mottle: 0.35, strokes: 0.12, strokeAng: 0, strokeLen: 300, strokeW: 4, grain: 0.07, grainKind: 'speckle', seed: 171 });
  // the clasts: angular pieces, flattened by the perspective, each its own green or black
  for (let i = 0; i < 110; i++) {
    const z = ZB - Math.pow(r(), 0.8) * (ZB - zf);
    const y = yAt(z);
    const x = r() * W;
    const sc = (y - HY0) / (TY - HY0);
    const s = (14 + r() * 40) * sc;
    const n = 5 + Math.floor(r() * 3);
    ctx.fillStyle = rgba(['#121a16', '#2c4034', '#18241e', '#34483a'][Math.floor(r() * 4)], 0.12 + r() * 0.12);
    ctx.beginPath();
    for (let j = 0; j < n; j++) {
      const a = (j / n) * P2 + r() * 0.5;
      const rr = s * (0.5 + r() * 0.5);
      ctx.lineTo(x + Math.cos(a) * rr * 1.4, y + Math.sin(a) * rr * 0.5);
    }
    ctx.closePath();
    ctx.fill();
  }
  // the calcite web between them, stretched across by the perspective
  lay(ctx, noiseMask(26, 173, { cover: 0.42, soft: 0.05, col: '#8ab89a', kind: 'web', w: 360, h: 70 }), { x: -40, y: TY, w: W + 80, h: f - TY }, 0.09);
  lay(ctx, noiseMask(14, 175, { cover: 0.3, soft: 0.04, col: '#c8e0d0', kind: 'web', w: 240, h: 50 }), { x: -40, y: TY, w: W + 80, h: f - TY }, 0.06);
  // a few bold white veins, crisp, running across the slab
  ctx.save();
  ctx.lineJoin = 'round';
  for (let i = 0; i < 6; i++) {
    let x = r() * W;
    let y = TY + 10 + r() * (f - TY - 30);
    const ang = (r() - 0.5) * 0.5 + (r() < 0.5 ? 0 : Math.PI);
    const pts: Pt[] = [[x, y]];
    for (let j = 0; j < 30; j++) {
      const sc = (y - HY0) / (TY - HY0);
      x += Math.cos(ang + (r() - 0.5) * 0.9) * 22 * sc;
      y += Math.sin(ang + (r() - 0.5) * 0.9) * 5 * sc;
      if (y < TY + 4 || y > f - 4) break;
      pts.push([x, y]);
    }
    const sc = (pts[0][1] - HY0) / (TY - HY0);
    ctx.strokeStyle = rgba('#0c1410', 0.25);
    ctx.lineWidth = 3.4 * sc;
    ctx.beginPath();
    pts.forEach((p, j) => (j ? ctx.lineTo(...p) : ctx.moveTo(...p)));
    ctx.stroke();
    ctx.strokeStyle = rgba('#d8ece0', 0.15);
    ctx.lineWidth = 1.4 * sc;
    ctx.stroke();
  }
  ctx.restore();
  grain(ctx, box, 'speckle', 0.1, 1.1);
  // the old polish: a soft sheen of the sky lying on the far part, warm on the left
  softly(ctx, box, (g) => {
    const lg = g.createLinearGradient(0, TY, 0, TY + 90);
    lg.addColorStop(0, rgba('#c89a9a', 0.14));
    lg.addColorStop(1, rgba('#c89a9a', 0));
    g.fillStyle = lg;
    g.fillRect(0, TY, W * 0.6, 90);
    // dull patches worn by use, and the scratches of plates
    for (let i = 0; i < 10; i++) {
      g.fillStyle = rgba('#5a6a60', 0.08);
      g.beginPath();
      g.ellipse(r() * W, TY + 40 + r() * (f - TY - 80), 120 + r() * 160, 26 + r() * 30, 0, 0, P2);
      g.fill();
    }
  }, 0.25);
  // a few old cracks, from the front edge where weight bore on it
  for (let i = 0; i < 4; i++) crack(ctx, r, r() * W, TY + 40 + r() * (f - TY - 80), (r() - 0.5) * 0.8, 50 + r() * 80, { col: '#0a100c', lip: '#8ab09a', w: 1.1, a: 0.35, branch: 0.3 });
  // chips out of its back edge
  for (let i = 0; i < 36; i++) {
    const x = r() * W;
    const s = 2 + r() * 4;
    ctx.fillStyle = rgba('#0a100c', 0.5);
    ctx.beginPath();
    ctx.ellipse(x, TY + 2, s * 1.2, s * 0.5, 0, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = rgba('#8ab09a', 0.22);
    ctx.beginPath();
    ctx.ellipse(x + s * 0.3, TY + 2 + s * 0.4, s * 0.8, s * 0.2, 0, 0, Math.PI);
    ctx.fill();
  }
  // the light: the pool's green along its back edge, the afterglow from the left, the dusk falling off to the front
  vfill(ctx, 0, TY, W, 70, [[0, rgba(GLOW, 0.07)], [1, rgba(GLOW, 0)]]);
  const lg = ctx.createLinearGradient(0, TY, W * 0.75, f + 200);
  lg.addColorStop(0, rgba('#ffb890', 0.06));
  lg.addColorStop(0.5, rgba('#ffb890', 0));
  lg.addColorStop(1, rgba('#0a0c18', 0.25));
  ctx.fillStyle = lg;
  ctx.fillRect(0, TY, W, f - TY);
  ctx.restore();
  tableFalloff(ctx, f, 0.3, '#06080a');
  tableSeam(ctx, 0.45, '#06080a', false);
  crevice(ctx, 0, W, TY, 18, 0.55, '#06080a');
  // the front: the slab's thickness, its carved band of running spirals worn soft, its arris rounded
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, f, W, 1080 - f);
  ctx.clip();
  vfill(ctx, 0, f, W, 1080 - f, [[0, '#26342c'], [1, '#141c18']]);
  lay(ctx, noiseMask(20, 177, { cover: 0.4, soft: 0.05, col: '#6a9a7a', kind: 'web', w: 400, h: 12 }), { x: 0, y: f, w: W, h: 1080 - f }, 0.18);
  spirals(ctx, -20, W, f + 21, 46, 11, rgba('#060a08', 0.4), rgba('#060a08', 0.3), 3);
  ctx.save();
  ctx.translate(1, 1.4);
  spirals(ctx, -20, W, f + 21, 46, 11, rgba('#9ac8a8', 0.14), rgba('#9ac8a8', 0), 1.4);
  ctx.restore();
  vfill(ctx, 0, f, W, 1080 - f, [[0, 'rgba(6,8,10,0)'], [1, 'rgba(6,8,10,0.4)']]);
  ctx.restore();
  ctx.fillStyle = '#34463a';
  ctx.fillRect(0, f - 5, W, 5);
  ctx.fillStyle = rgba('#b8d8c4', 0.3);
  ctx.fillRect(0, f - 5, W, 1.4);
  chips(ctx, r, 0, W, f - 4, 30, '#34463a', 4);
  ctx.fillStyle = rgba('#040605', 0.7);
  ctx.fillRect(0, f, W, 1.6);
}

// ——— the grade and the shade ———
//
// The grade is the warm/cool split laid as one plain-alpha mix (source-atop), as the Heart of the Maze does: linear,
// so a baked piece gets exactly the colour it has in the still, and it costs one fill instead of a pass over pixels.

function grade(ctx: Ctx): void {
  ctx.globalCompositeOperation = 'source-atop';
  const g = ctx.createLinearGradient(0, 0, W * 0.8, 1080);
  g.addColorStop(0, rgba('#ffa878', 0.1));
  g.addColorStop(0.4, rgba('#ffa878', 0));
  g.addColorStop(0.6, rgba('#3a4c90', 0));
  g.addColorStop(1, rgba('#2a3a78', 0.14));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, 1080);
}

function shadeOver(ctx: Ctx): void {
  calmLanes(ctx, 0.14, '#0a0c14', 70, 700);
  // the band behind the table's back edge: calm and a little darker
  vfill(ctx, 0, 600, W, TY - 600, [[0, 'rgba(8,10,14,0)'], [1, 'rgba(8,10,14,0.2)']]);
  // the dusk deeper at the court's sides, away from the pool's light
  const SW = 460;
  const [sc, sg2] = makeCanvas(SW / 4, (TY - 340) / 4);
  sg2.scale(0.25, 0.25);
  const hg = sg2.createLinearGradient(0, 0, SW, 0);
  hg.addColorStop(0, 'rgba(8,8,16,0.32)');
  hg.addColorStop(1, 'rgba(8,8,16,0)');
  sg2.fillStyle = hg;
  sg2.fillRect(0, 0, SW, TY - 340);
  sg2.globalCompositeOperation = 'destination-in';
  const vg = sg2.createLinearGradient(0, 0, 0, 90);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,1)');
  sg2.fillStyle = vg;
  sg2.fillRect(0, 0, SW, TY - 340);
  ctx.drawImage(sc, 0, 340, SW, TY - 340);
  ctx.save();
  ctx.translate(W, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(sc, 0, 340, SW, TY - 340);
  ctx.restore();
  vignetteAll(ctx, 0.74, '#05060a');
  for (const [cx, cy] of [[0, 0], [W, 0], [0, TY], [W, TY]] as Pt[]) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 520);
    g.addColorStop(0, 'rgba(5,6,10,0.35)');
    g.addColorStop(1, 'rgba(5,6,10,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - 520, cy - 520, 1040, 1040);
  }
}

// ——— frames for the live layer ———

/** One frame of the pool's slow life (phase 0…1 loops), in the water box's coordinates at scale k: rings spreading
 * from three drips at its edges (each ring a lit crest with a dark trough inside it, flattened by the depth), and long
 * low swells drifting towards us. */
const DRIPS: [number, number][] = [[-2.25, 8.2], [2.35, 7.9], [-1.1, 6.4]];
function rippleFrame(c: Ctx, ph: number, k: number): void {
  const wb = WATER_BOX;
  c.save();
  c.scale(k, k);
  c.translate(-wb.x, -wb.y);
  polyPath(WATER)(c);
  c.clip();
  for (const [di, [X, z]] of DRIPS.entries()) {
    const [x, y] = P(X, PL.wY, z);
    const kk = ppu(z);
    const sq = (EH - PL.wY) / z;
    for (let j = 0; j < 3; j++) {
      const u = (ph + j / 3 + di * 0.21) % 1;
      const rad = (0.08 + u * 0.95) * kk;
      const a = Math.pow(1 - u, 1.6) * 0.55;
      c.strokeStyle = rgba('#e8fff0', a);
      c.lineWidth = 1.3;
      c.beginPath();
      c.ellipse(x, y, rad, rad * sq, 0, 0, P2);
      c.stroke();
      c.strokeStyle = rgba('#020806', a * 0.7);
      c.lineWidth = 1.6;
      c.beginPath();
      c.ellipse(x, y + 1, rad * 0.94, rad * sq * 0.9, 0, 0, P2);
      c.stroke();
    }
  }
  // the swells: long faint bands, lit on their far side, crowding towards the far kerb
  for (let j = 0; j < 5; j++) {
    const u = (j + ph) / 5;
    const y = wb.y + Math.pow(u, 1.6) * wb.h;
    const a = Math.sin(u * Math.PI) * 0.16;
    c.strokeStyle = rgba('#f0d0c0', a);
    c.lineWidth = 0.8 + u * 1.4;
    c.beginPath();
    for (let x = wb.x; x <= wb.x + wb.w; x += 12) {
      const yy = y + Math.sin(x * 0.02 + j * 2 + ph * P2) * (1 + u * 2);
      if (x === wb.x) c.moveTo(x, yy);
      else c.lineTo(x, yy);
    }
    c.stroke();
  }
  c.restore();
}

/** A stomp's ring on the water: a lit crest and the dark trough inside it (flattened 4:1; scaled by the live layer). */
function ringTex(c: Ctx): void {
  const cx = 128;
  const cy = 40;
  // the trough inside the crest, a soft dark band
  for (const [w, a] of [[9, 0.12], [5, 0.2]] as Pt[]) {
    c.strokeStyle = `rgba(4,12,8,${a})`;
    c.lineWidth = w;
    c.beginPath();
    c.ellipse(cx, cy + 2, 110, 25.5, 0, 0, P2);
    c.stroke();
  }
  // the crest: the sky caught along its far side, the green along its near side
  for (const [w, a] of [[6, 0.1], [3, 0.22], [1.4, 0.5]] as Pt[]) {
    c.strokeStyle = `rgba(232,250,236,${a})`;
    c.lineWidth = w;
    c.beginPath();
    c.ellipse(cx, cy - 1, 118, 28.5, 0, Math.PI * 1.02, Math.PI * 1.98);
    c.stroke();
    c.strokeStyle = `rgba(170,255,170,${a * 0.6})`;
    c.beginPath();
    c.ellipse(cx, cy - 1, 118, 28.5, 0, 0.05, Math.PI - 0.05);
    c.stroke();
  }
}

/** A chip of grey stone (frame i of 6, each 2·CH px square): lit on its top left, a dark underside. */
const CH = 8;
function chipFrame(c: Ctx, i: number): void {
  const rr = rng(500 + i);
  const n = 5 + (i % 3);
  const pts: Pt[] = [];
  for (let j = 0; j < n; j++) {
    const a = (j / n) * P2 + rr() * 0.6;
    const rad = CH * (0.45 + rr() * 0.4);
    pts.push([CH + Math.cos(a) * rad, CH + Math.sin(a) * rad * 0.8]);
  }
  const p = polyPath(pts);
  p(c);
  c.fillStyle = lin(c, [2, 2], [CH * 2 - 2, CH * 2 - 2], [[0, '#e0dace'], [0.5, '#a09c94'], [1, '#4a4a58']]);
  c.fill();
  c.strokeStyle = '#18161e';
  c.lineWidth = 1;
  c.stroke();
}

// ——— the stack ———
//
// The cypress crowns and the ivy curtains are sprites (they stir); nothing still after them overlaps them. The pool's
// water is still (in the base); the live layer lays a rippling copy of it over itself in strips, masked to the water.
// Everything the live layer adds under the shade goes in the 'under' slot, last before the table's top.

const sprite = (id: string, box: Box, draw: (c: Ctx) => void) => ({ id, box, motion: 'sprite' as const, draw });

export const MEDUSA: SceneSpec = {
  id: 'medusa',
  info: {
    name: "Medusa's Garden",
    subtitle: 'Boss: MEDUSA',
    ambient: [],
    // (the pool's glow is the live layer's)
    glows: [],
    light: '#d0e8cc',
    tableTint: '#eef4ec',
  },
  layers: [
    { id: 'sky', box: SKY_BOX, draw: sky },
    { id: 'terrace', box: TERRACE_BOX, draw: terrace },
    ...CYP.map((_, i) => sprite('cyp' + i, cypBox(i), (c) => cypCrown(c, i))),
    { id: 'floor', box: FLOOR_BOX, draw: floor },
    { id: 'walls', box: WALLS_BOX, draw: walls },
    ...IVY.map((v, i) => sprite(v.id, v.box, (c) => ivyCurtain(c, i))),
    { id: 'portico', box: PORTICO_BOX, draw: portico },
    { id: 'statBL', box: STAT_BL_BOX, draw: statueBL },
    { id: 'statBR', box: STAT_BR_BOX, draw: statueBR },
    { id: 'pool', box: POOL_BOX, draw: pool },
    { id: 'water', box: WATER_BOX, draw: (c, r) => reflection(c, r, 0) },
    { id: 'poolLive', box: WATER_BOX, motion: 'slot', draw: () => {} },
    { id: 'reedsL', box: reedBox(REEDS_L), draw: (c, r) => reeds(c, r, ...REEDS_L, 70, 26, 0.45) },
    { id: 'reedsR', box: reedBox(REEDS_R), draw: (c, r) => reeds(c, r, ...REEDS_R, 62, 22, 0.45) },
    { id: 'fallen', box: FALLEN_BOX, draw: fallen },
    { id: 'fernL', box: fernBox(FERN_L), draw: (c, r) => fern(c, r, ...FERN_L, 62, 0.1) },
    { id: 'fernR', box: fernBox(FERN_R), draw: (c, r) => fern(c, r, ...FERN_R, 56, 0.1) },
    { id: 'statL', box: STAT_L_BOX, draw: statueL },
    { id: 'propsL', box: PROPS_L_BOX, draw: propsL },
    { id: 'statR', box: STAT_R_BOX, draw: statueR },
    { id: 'snakesStill', stillOnly: true, draw: snakesStill },
    { id: 'table', box: TABLE_BOX, draw: table },
    { id: 'under', box: { x: 0, y: 0, w: W, h: 1080 }, motion: 'slot', draw: () => {} },
    { id: 'top', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

// ——— live ———

interface Gorgon {
  alive: boolean;
  type?: { id: string };
  hoverY: number | null;
}

/** Points on the statues (and the pediment) that shed grit when the ground shakes: where it falls from, where it
 * lands. */
const GRIT: { x: number; y: number; floor: number }[] = (() => {
  const out: { x: number; y: number; floor: number }[] = [];
  const add = (st: { X: number; z: number }, pose: Pose, dir: number, ph: number) => {
    const k = ppu(st.z);
    const [x, y] = P(st.X, ph, st.z);
    for (const p of [pose.head, pose.sh[0], pose.sh[1], pose.el[0], pose.el[1], pose.ha[0]]) out.push({ x: x + dir * p[0] * k, y: y - p[1] * k, floor: y + 4 });
  };
  add(MD.statL, POSE.hoplite, 1, 0.55);
  add(MD.statR, POSE.youth, -1, 0.55);
  add(MD.statBL, POSE.archer, 1, 0.3);
  add(MD.statBR, POSE.spear, -1, 0.3);
  for (let X = -5; X <= 4; X += 1.5) {
    const [x, y] = P(X, EN.Y1, EN.z);
    out.push({ x, y, floor: sy(0.45, TOPZ) });
  }
  return out;
})();
/** The crack in the recoiling youth that drops pebbles. */
const CRACKED = (() => {
  const st = MD.statR;
  const k = ppu(st.z);
  const [x, y] = P(st.X, 0.55, st.z);
  return { x: x - POSE.youth.cracks![0][0] * k, y: y - POSE.youth.cracks![0][1] * k, floor: y + 6 };
})();
/** Where the green flash lights the garden (statue by statue, out from the pool). */
const FLASH_AT: { x: number; y: number; r: number; sy: number }[] = [
  { x: sx(MD.statBL.X, MD.statBL.z), y: sy(1.2, MD.statBL.z), r: 90, sy: 1.8 },
  { x: sx(MD.statBR.X, MD.statBR.z), y: sy(1.2, MD.statBR.z), r: 90, sy: 1.8 },
  { x: 960, y: sy(2.0, CO.z), r: 340, sy: 0.6 },
  { x: sx(FALL.X + 0.8, FALL.z), y: sy(0.2, FALL.z), r: 160, sy: 0.6 },
  { x: sx(MD.statL.X, MD.statL.z), y: sy(1.6, MD.statL.z), r: 170, sy: 1.9 },
  { x: sx(MD.statR.X, MD.statR.z), y: sy(1.6, MD.statR.z), r: 170, sy: 1.9 },
];

registerKitScene(MEDUSA, (k: KitLive) => {
  const ADD = Phaser.BlendModes.ADD;
  const top = k.slot('top');
  const under = k.slot('under');
  const sc = k.sc as unknown as { bossFoot?: Gorgon | null };
  const gorgon = (): Gorgon | null => {
    const f = sc.bossFoot;
    return f && f.alive && f.type?.id === 'medusa' ? f : null;
  };

  // ——— the cypresses and the ivy, stirring ———
  const cyps = CYP.map((c, i) => new Swing(k.pivot(k.sprite('cyp' + i), c.x, CUT), { k: 5, c: 0.8, idle: 0.004 + 0.003 * (1 - c.depth), seed: i * 1.9, speed: 0.45 + i * 0.04 }));
  const ivies = IVY.map((v, i) => new Swing(k.pivot(k.sprite(v.id), v.x, v.y), { k: 7, c: 1.1, idle: 0.03, seed: 3 + i * 2.3, speed: 0.6 }));

  // ——— the pool: its water copied (a little wider than it shows) and rippled in strips, masked to the water ———
  const wb = WATER_BOX;
  const PAD = 8;
  const reflKey = k.tex('md_refl', wb.w + PAD * 2, wb.h, (c) => {
    c.translate(-(wb.x - PAD), -wb.y);
    reflection(c, rng(7), PAD);
    grade(c);
  });
  const poolC = k.sc.add.container(0, 0);
  k.slot('poolLive').add(poolC);
  const mask = k.sc.make.graphics({}, false);
  mask.fillStyle(0xffffff, 1);
  mask.fillPoints(WATER.map(([x, y]) => new Phaser.Geom.Point(x, y)), true);
  poolC.setMask(mask.createGeometryMask());
  const NS = 24;
  const SH = wb.h / NS;
  const strips = Array.from({ length: NS }, (_, i) => {
    const im = k.sc.add.image(wb.x - PAD, wb.y, reflKey).setOrigin(0, 0);
    im.setCrop(0, Math.floor(i * SH), wb.w + PAD * 2, Math.ceil(SH) + 1);
    poolC.add(im);
    return im;
  });
  const wob = new Spring(0, 30, 2.2);
  // the slow rings from the drips and the swells (painted at 12 phases)
  const RR = 0.5;
  const ripKey = sheet(k, 'md_ripple', wb.w * RR, wb.h * RR, 12, (c, ph) => rippleFrame(c, ph, RR));
  const ripple = new Loop(k, ripKey, 12, wb.x, wb.y, { into: poolC, origin: [0, 0], scale: 1 / RR, fps: 2.4 });
  // the glow down in it, breathing
  const deep = k.glow(990, wb.y + wb.h * 0.64, 220, GLOW_N, 0.06, { into: poolC, sy: 0.3 });
  const airGlow = k.glow(960, wb.y + wb.h * 0.3, 640, GLOW_N, 0, { into: top, sy: 0.32 });
  // a stomp's rings
  const ringKey = k.tex('md_ring', 256, 80, ringTex);
  const rings: { im: Phaser.GameObjects.Image; t: number; life: number; r0: number; r1: number; sq: number; delay: number }[] = [];
  const ringAt = (x: number, y: number, p: number) => {
    const z = ((EH - PL.wY) * F) / Math.max(1, y - VY);
    const sq = (EH - PL.wY) / z;
    const kk = ppu(z);
    for (let j = 0; j < 3; j++) {
      const im = k.sc.add.image(x, y, ringKey).setAlpha(0).setBlendMode(Phaser.BlendModes.NORMAL);
      poolC.add(im);
      rings.push({ im, t: 0, life: 1.3 + p * 0.4, r0: 0.05 * kk, r1: (0.9 + p * 1.6) * kk * (1 - j * 0.22), sq, delay: j * 0.16 });
    }
  };
  // motes rising off the water, lit green
  const motes = new Parts(k, { frame: 'mote', add: true, into: under, max: 70 });
  const moteRate = new Rate();
  const mote = (boost = 0) => {
    const y = wb.y + 6 + crand() * (wb.h - 12);
    const [x0, x1] = waterSpan(y);
    const x = x0 + 10 + crand() * (x1 - x0 - 20);
    const kk = ppu(((EH - PL.wY) * F) / Math.max(1, y - VY));
    motes.spawn({ x, y: y - 2, vx: (crand() - 0.5) * 10, vy: -(8 + crand() * 18) * (1 + boost), life: 3.5 + crand() * 3, r0: (0.012 + crand() * 0.012) * kk, r1: 0.6, a: 0.75, tint: crand() < 0.6 ? 0xb4ff9a : 0xe4ffc8, grav: -3, drag: 0.25, fade: 0.25 });
  };
  for (let i = 0; i < 25; i++) mote();

  // ——— the snakes sliding over the stones ———
  const SN = 12;
  const snakeKey = sheet(k, 'md_snake', SNK.w, SNK.h, SN, (c, ph) => snakeFrame(c, ph));
  const snakes = SNAKES.map((s, i) => ({
    ...s,
    loop: new Loop(k, snakeKey, SN, s.x0, s.y, { into: under, scale: s.s, fps: 7, phase: 0 }),
    state: 0 as 0 | 1,
    wait: 0.5 + i * 2.2,
    x: s.x0,
    dir: i === 1 ? -1 : 1,
    fade: 0,
  }));
  let startle = 0;

  // ——— grit off the statues, pebbles off the cracked one ———
  const grit = new Parts(k, { frame: 'mote', into: under, max: 140 });
  const chipKey = sheet(k, 'md_chip', CH * 2, CH * 2, 6, (c, _p, i) => chipFrame(c, i));
  const pebbles = new Parts(k, { frame: 'flake', sheet: { key: chipKey, n: 6, half: CH }, into: under, max: 24 });
  const dust = new Parts(k, { frame: 'puff', into: under, max: 40 });
  const shed = (n: number, p: number) => {
    for (let i = 0; i < n; i++) {
      const g = GRIT[Math.floor(crand() * GRIT.length) % GRIT.length];
      const kk = Math.max(40, (g.floor - VY) * 0.8);
      grit.spawn({ x: g.x + (crand() - 0.5) * 8, y: g.y + (crand() - 0.5) * 6, vx: (crand() - 0.5) * 30, vy: -crand() * 20 * p, life: 2.2, r0: (1 + crand() * 1.4) * (kk / 160), a: 0.9, tint: crand() < 0.5 ? 0xb8b4ac : 0x8a8896, grav: 7 * kk, drag: 0.2, floor: g.floor + crand() * 4, bounce: 0.25, fade: 0.02 });
    }
  };
  const pebble = (p: number) => {
    const c = CRACKED;
    pebbles.spawn({ x: c.x + (crand() - 0.5) * 6, y: c.y, vx: (crand() - 0.3) * 60 * (0.5 + p), vy: -20 - crand() * 40, life: 2.6, r0: 3 + crand() * 2.5, a: 1, tint: 0xd8d4cc, grav: 1100, drag: 0.1, floor: c.floor + crand() * 8, bounce: 0.35, spin: (crand() - 0.5) * 14, fade: 0.02 });
    dust.spawn({ x: c.x, y: c.y, vx: (crand() - 0.5) * 10, vy: 8, life: 1.4, r0: 4, r1: 18, a: 0.3, tint: 0xb0aca4, drag: 1.2, fade: 0.1 });
  };

  // ——— her stare: the green flash running over the garden ———
  const wash = k.wash(GLOW_N, 0, ADD, top);
  const flashGlows = FLASH_AT.map((f) => ({ f, im: k.glow(f.x, f.y, f.r, GLOW_N, 0, { into: top, sy: f.sy }), d: Math.hypot(f.x - 960, f.y - (wb.y + wb.h / 2)) / 1400 }));
  const eyes = GORGON_EYES.map(([x, y]) => k.glow(x, y, Math.max(5, GORGON.R * 0.35), GLOW_N, 0.15, { into: top }));
  let flashT = 99;
  let flashA = 0;
  let wasGlowing = false;
  const env = (t: number) => (t < 0 ? 0 : t < 0.12 ? t / 0.12 : Math.exp(-(t - 0.12) * 1.6));
  const flash = (a: number) => {
    flashT = 0;
    flashA = a;
  };

  return {
    impact(x, _y, p) {
      // rings across the pool from the nearest point of the water to the blow
      const y = wb.y + wb.h * (0.5 + crand() * 0.4);
      const [x0, x1] = waterSpan(y);
      ringAt(Math.max(x0 + 20, Math.min(x1 - 20, x)), y, p);
      if (p > 0.6) ringAt(x0 + 40 + crand() * (x1 - x0 - 80), wb.y + wb.h * (0.3 + crand() * 0.3), p * 0.5);
      wob.v += 30 + p * 90;
      shed(Math.round(2 + p * 10), p);
      if (crand() < 0.35 + p * 0.6) pebble(p);
      if (p > 0.7) pebble(p);
      startle = Math.min(1.5, startle + p);
      for (const c of cyps) c.kick((crand() - 0.5) * 0.012 * p);
      for (const v of ivies) v.kick((crand() < 0.5 ? -1 : 1) * 0.08 * p);
      for (let i = 0; i < 6 * p; i++) mote(1);
    },
    update(dt, t) {
      const cm = calm();
      // her stare (the boss leans in low while her eyes glow): flash out over the garden; when it ends, the stone
      const f = gorgon();
      const glowing = !!f && f.hoverY === 640;
      if (glowing && !wasGlowing) flash(0.75);
      if (!glowing && wasGlowing && f) {
        flash(1);
        ringAt(990, wb.y + wb.h * 0.6, 1);
        shed(12, 0.6);
      }
      wasGlowing = glowing;
      flashT += dt;
      const e = env(flashT) * flashA;
      wash.setAlpha(0.09 * e);
      for (const g of flashGlows) g.im.setAlpha(0.6 * env(flashT - g.d) * flashA + (glowing ? 0.12 + 0.05 * Math.sin(t * 7 + g.d * 9) : 0));
      const eyeA = glowing ? 0.55 + 0.15 * Math.sin(t * 9) : 0.14 + 0.06 * Math.sin(t * 0.9);
      for (const im of eyes) im.setAlpha(Math.max(eyeA, 0.9 * e));
      // the pool: the glow breathing; dead still while she stares
      const breathe = 0.5 + 0.5 * Math.sin(t * 0.85);
      deep.setAlpha(0.05 + 0.05 * breathe + 0.3 * e + (glowing ? 0.08 : 0));
      airGlow.setAlpha(0.03 + 0.02 * breathe + 0.16 * e);
      const still = glowing ? 0.25 : 1;
      const jolt = wob.step(0, dt);
      for (const [i, im] of strips.entries()) {
        const u = i / (NS - 1);
        const amp = (0.5 + u * 1.6) * still * cm + jolt * (0.02 + u * 0.05);
        const dx = amp * (Math.sin(t * 1.3 + i * 0.85) * 0.7 + Math.sin(t * 2.9 - i * 1.7) * 0.3);
        im.setPosition(wb.x - PAD + dx, wb.y);
      }
      ripple.step(dt, still * cm);
      ripple.alpha = 0.85 * still;
      for (let i = rings.length - 1; i >= 0; i--) {
        const rg = rings[i];
        rg.t += dt;
        const tt = (rg.t - rg.delay) / rg.life;
        if (tt < 0) continue;
        if (tt >= 1) {
          rg.im.destroy();
          rings.splice(i, 1);
          continue;
        }
        const rad = rg.r0 + (rg.r1 - rg.r0) * (1 - Math.pow(1 - tt, 2));
        rg.im.setScale(rad / 118, (rad * rg.sq) / 28.5).setAlpha(Math.pow(1 - tt, 1.5) * 0.75);
      }
      moteRate.tick((2.2 + e * 30) * cm, dt, () => mote(e));
      // the snakes
      startle = Math.max(0, startle - dt * 0.8);
      for (const s of snakes) {
        if (s.state === 0) {
          s.wait -= dt;
          s.fade = Math.max(0, s.fade - dt * 2);
          if (s.wait <= 0) {
            s.state = 1;
            s.dir = crand() < 0.5 ? -1 : 1;
            s.x = s.dir > 0 ? s.x0 : s.x1;
          }
        } else {
          const sp = (1 + startle * 1.6) * cm;
          const v = (SNK.wave * s.s * s.loop.fps * sp) / SN;
          s.x += s.dir * v * dt;
          s.loop.step(dt, sp);
          const edge = Math.min(s.x - s.x0, s.x1 - s.x) / (SNK.len * s.s * 0.6);
          s.fade = clamp01(edge);
          if ((s.dir > 0 && s.x >= s.x1) || (s.dir < 0 && s.x <= s.x0)) {
            s.state = 0;
            s.wait = 2 + crand() * 5;
          }
        }
        s.loop.alpha = s.fade;
        if (s.state === 0) s.loop.step(dt, 0);
        s.loop.each((im) => im.setPosition(s.x, s.y).setFlipX(s.dir < 0).setVisible(s.fade > 0.01));
      }
      for (const c of cyps) c.update(dt, t);
      for (const v of ivies) v.update(dt, t);
      // keep the water's mask on the water wherever the stage is drawn (scaled into a card, shaken in play)
      const m = k.root.getWorldTransformMatrix();
      mask.setPosition(m.tx, m.ty).setScale(m.scaleX, m.scaleY);
      motes.update(dt);
      grit.update(dt);
      pebbles.update(dt);
      dust.update(dt);
    },
    destroy() {
      mask.destroy();
    },
  };
});
