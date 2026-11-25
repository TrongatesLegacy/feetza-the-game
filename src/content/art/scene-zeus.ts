// The Storm Throne (the arena of ZEUS, the boss of Tartarus when the Kratos hero peel is equipped, wave 90:
// src/game/nemesis.ts), redrawn with the location kit (src/art/scene). Of a piece with the redrawn Act 9 below it
// (scene-tartarus.ts, scene-hades.ts, scene-titanking.ts), but the opposite of their dark: Olympus itself, white
// marble and gold under a storm, torn out of the heavens and dragged down to the gates of Tartarus.
//
// The god's throne hall, open to the sky: a platform of white marble afloat on a sea of storm cloud, two colonnades of
// colossal fluted columns (marble bases with a gold fillet, gold-banded capitals) running away from us along its
// edges, stepped down into the void at its sides. The roof is gone. Pieces of the entablature still ride the far
// columns, and a cross beam spans the far end, broken through over the throne; golden eagles of our own design stand
// on the last two columns, wings half raised. The platform's far end is broken off just past the dais: beyond the
// break two columns of the rear colonnade topple back into the cloud, a length of architrave falling with them. One
// column of the right colonnade is snapped off, its drums lying where they fell; rubble lies along the break.
//
// At the far end, on a stepped dais of white marble edged in gold, the god's colossal throne: a marble seat with gold
// mounts, a storm-blue cushion, arms ending in gold eagles' heads, a towering back of white marble carved with rays
// of storm-light bursting from a gold thunderbolt, a gold eagle standing on its top, rising through the gap in the
// broken lintels into the split in the sky (the rift) where the light and the lightning pour through. Beside it,
// smaller and empty, the thrones of two of the other Olympians: the sea god's (a trident of three wave-crests on a
// sea-green panel, cracked through, its corner fallen) and the queen's (a fan of peacock eyes); by the left colonnade
// the war god's, cracked (a war-helm with a crest of blades). All of them dim, small and at the back, out of the way
// of the fight's own trident, helm and peacock gems. Two gold tripod braziers on the floor burn with blue
// lightning-fire.
//
// The sky is a vortex of storm cloud round the rift; far below, through gaps in the cloud sea, the red glow of
// Tartarus. The floor is wet with rain, mirroring the columns and the rift, scarred by lightning, cracked where the
// end broke away. The table is a slab of the same white marble, veined grey and gold, its front a marble step inlaid
// with a gold meander. Every emblem is our own.
//
// Live, the heroes:
// - the lightning: forks poured down through the rift into the cloud sea, crawlers along the clouds' bases, flashes
//   inside the cloud sea; each a structured channel (a main stroke, branches, restrikes) painted to a canvas, flickering
//   in a strike pattern, the rift flaring and the whole hall lit white with it (a live-only relight of the marble);
// - the braziers' blue lightning-fire (a painted frame loop, arcs crackling through the tongues), sparks rising;
// - the cloud sea drifting below and round the hall (painted cloud wisps at their depths), storm scud racing over
//   the sky, the red of Tartarus breathing in the gaps, and rain falling in the rift's light.
// Stomps knock marble dust and grit off the entablature, duck the braziers' fires and break a chunk off the fallen
// end or the platform's edge, which falls away into the cloud.
//
// It answers the fight (the zeus brain in src/game/bosses/kratos.ts emits these):
// - 'zeus-bolt' (x): a bolt pours out of the rift and the hall lights white;
// - 'zeus-olympian' ('poseidon' | 'ares' | 'hera'): the cloud sea heaves, the fires flare red, or a gold and
//   turquoise shimmer runs over the gold;
// - 'zeus-crown' (1 when Hera's crown settles on him, 0 when it goes): the shimmer holds while he's crowned and
//   bursts when it goes.
// The listeners are removed on scene SHUTDOWN. On the stages page the biggest stomps play these cues in turn.

import Phaser from 'phaser';
import { type Ctx, type R, TY, W, calmLanes, castShadow, crevice, groundShadow, haze, lightPool, polyPath, vfill, vignetteAll, within } from '../../art/scene/kit';
import type { SceneSpec } from '../../art/scene/layers';
import { grain, tableFalloff } from '../../art/scene/materials';
import { crack, drift, lay, noiseMask, softly, streaks, surface } from '../../art/scene/paint';
import { cloud, skyFill } from '../../art/scene/sky';
import { shaft } from '../../art/scene/light';
import { ZB, xAt, yAt, zFront } from '../../art/sceneKit';
import { hashStr, makeCanvas, mix, rgba, rng, shade } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { save } from '../../systems/save';
import { Loop, Parts, Rate, Spring, sheet } from '../../game/sceneAnim';
import { type KitLive, calm, flicker, registerKitScene } from '../../game/sceneLive';
import { KEY_U, SLAB } from './scene-tartarus';

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
// Metres: X across, Y up from the hall's floor, z away. The eye EH above the floor, the vanishing point in the middle
// at HZ (the cloud sea's horizon, far below, sits on it). (The table has the game's own perspective.)

const F = 1100;
const HZ = 400;
const EH = 4;
const sx = (X: number, z: number) => 960 + (F * X) / z;
const sy = (Y: number, z: number) => HZ + (F * (EH - Y)) / z;
const P = (X: number, Y: number, z: number): Pt => [sx(X, z), sy(Y, z)];
/** Screen px per metre at depth z. */
const pz = (z: number) => F / z;

/** The layout the live layer relies on. */
export const ZS = {
  front: 1040,
  /** The colonnades: their columns' X (each side), the rows' z, the radius; the shaft, capital and entablature
   * heights (architrave, frieze, cornice top). */
  colX: 10.5,
  rows: [13.5, 20, 26.5, 33, 39.5],
  colR: 0.95,
  shaftY: 10.2,
  capY: 11,
  archY: 12.1,
  friezeY: 13.1,
  corY: 13.7,
  /** The platform's edge (X, each side) and its two steps down into the void. */
  edgeX: 12.4,
  /** The dais: its first step's front, each step's depth and rise, how many, its half width; the throne's seat front. */
  dais: { z0: 33.6, step: 0.9, rise: 0.45, n: 3, hw: 8.8, back: 44.6 },
  throne: { X: 0, z: 39.6 },
  /** The gold tripod braziers (X, z) and their bowls' rim height. */
  braziers: [
    [-7.2, 21],
    [7.2, 21],
  ] as Pt[],
  brazierY: 1.7,
  /** The other Olympians' thrones at the back (X, the seat's front z). */
  council: { X: 6.7, z: 42.2 },
  /** The war god's throne, toppled (X, z). */
  toppled: { X: -8.6, z: 29.5 },
  /** The split in the sky the light pours through. */
  rift: { x: 960, y: 66, w: 640 },
};
const DA = ZS.dais;
const TOP_Y = DA.rise * DA.n;
const stepZ = (i: number) => DA.z0 + DA.step * i;

/** The far end's break: (X, z) round from the left edge to the right; the left corner has fallen away. */
const BREAK: Pt[] = [
  [-ZS.edgeX, 37.6],
  [-11.4, 38.9],
  [-10.1, 41.4],
  [-8.4, 42.2],
  [-7.4, 45.6],
  [-5.6, 46.4],
  [-3.4, 45.9],
  [-1.2, 46.8],
  [1.6, 46.2],
  [3.8, 47.2],
  [6.0, 46.5],
  [7.6, 46.9],
  [8.6, 45.6],
  [10.2, 45.0],
  [11.3, 46.0],
  [ZS.edgeX, 45.4],
];

// ——— palettes and light ———

const MARB = { deep: '#12132a', shade: '#2c2c58', body: '#8486aa', lit: '#ece8e2', white: '#fbf8f2', vein: '#6a6e8c' };
const GOLD = { white: '#fff6d8', lit: '#ffe39a', body: '#d4a440', shade: '#80561c', deep: '#3a2408' };
const LAPIS = { deep: '#0a1236', body: '#1a2e7a', lit: '#4a6ad0' };
const BLUE = { deep: '#1838c8', body: '#3a98ff', core: '#e4f6ff', glow: 0x5ab0ff };
const RED = { deep: '#4a0a0a', body: '#c8301a', hot: '#ff8a40', glow: 0xff4a1c };
const SEA = { deep: '#141830', body: '#3a3e64', lit: '#9a9cc4', top: '#c8cae4' };

/** The storm's light from the high left (cool, dim); the rift's white light above the throne; the braziers. */
const KEY: V3 = norm([-0.8, 0.55, -0.3]);
const RIFT_P: V3 = [0, 30, 47];
const FIRES: V3[] = ZS.braziers.map(([X, z]): V3 => [X, ZS.brazierY + 0.8, z]);

/** A surface's colour under the storm: base lit by the key, the rift and the blue fires, and the red of Tartarus from
 * below (n its normal). */
function lit(base: string, X: number, Y: number, z: number, n: V3, o: { key?: number; rift?: number; fire?: number; red?: number; reach?: number } = {}): string {
  let c = mix(base, '#f2ece2', clamp01(dot(n, KEY)) * (o.key ?? 0.35));
  const v: V3 = [RIFT_P[0] - X, RIFT_P[1] - Y, RIFT_P[2] - z];
  const d = Math.hypot(...v);
  const lam = clamp01(dot(n, [v[0] / d, v[1] / d, v[2] / d]));
  c = mix(c, '#fbfaff', lam * (1 / (1 + (d / 34) ** 2)) * (o.rift ?? 0.8));
  for (const f of FIRES) {
    const w: V3 = [f[0] - X, f[1] - Y, f[2] - z];
    const dd = Math.hypot(...w);
    const l2 = clamp01(dot(n, [w[0] / dd, w[1] / dd, w[2] / dd]));
    c = mix(c, '#5aa8ff', l2 * (1 / (1 + (dd / (o.reach ?? 4)) ** 2)) * (o.fire ?? 0.45));
  }
  if (o.red) c = mix(c, '#c83a20', clamp01(-n[1]) * o.red);
  return c;
}
/** How bright a colour is (0…1). */
const lum = (c: string) => (parseInt(c.slice(1, 3), 16) * 0.3 + parseInt(c.slice(3, 5), 16) * 0.55 + parseInt(c.slice(5, 7), 16) * 0.15) / 255;

// ——— small helpers ———

const quad = (a: Pt, b: Pt, c: Pt, d: Pt) => polyPath([a, b, c, d]);
/** A face square to us at depth z. */
const faceAt = (X0: number, X1: number, Y0: number, Y1: number, z: number) => quad(P(X0, Y0, z), P(X1, Y0, z), P(X1, Y1, z), P(X0, Y1, z));
/** A face along z at X. */
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
/** White marble in a path: its colour, cloudy depth, grey veins wandering through it. */
function marble(ctx: Ctx, path: (c: Ctx) => void, col: string, b: Box, seed: number, veins = 0.35): void {
  fillPath(ctx, path, col);
  within(ctx, path, () => {
    lay(ctx, drift(shade(col, 0.08), shade(col, -0.18), 3, seed, 48, 64), b, 0.5);
    lay(ctx, noiseMask(5, seed + 7, { kind: 'web', cover: 0.2, soft: 0.04, col: MARB.vein, w: 90, h: 120 }), b, veins * 0.55);
    lay(ctx, noiseMask(9, seed + 11, { kind: 'web', cover: 0.12, soft: 0.03, col: '#5a5e78', w: 120, h: 160 }), b, veins * 0.3);
  });
}
/** Gold: a face of it, lit by the light at n, with a broad sheen and the deep in its recesses. */
function goldFill(ctx: Ctx, path: (c: Ctx) => void, b: Box, X: number, Y: number, z: number, n: V3, vertical = true, k = 1): void {
  const c = lit(GOLD.shade, X, Y, z, n, { key: 0.5 * k, rift: 0.9 * k, fire: 0.3 });
  const hi = mix(c, GOLD.lit, 0.65 * k);
  const g = vertical
    ? lin(ctx, [b.x, b.y], [b.x, b.y + b.h], [[0, GOLD.white], [0.12, hi], [0.45, c], [0.8, shade(c, -0.35)], [1, GOLD.deep]])
    : lin(ctx, [b.x, 0], [b.x + b.w, 0], [[0, hi], [0.18, GOLD.white], [0.3, hi], [0.6, c], [1, GOLD.deep]]);
  fillPath(ctx, path, g);
}

// ——— the sky: the storm's vortex round the rift ———

export const SKY_BOX: Box = { x: 0, y: 0, w: W, h: HZ + 24 };
const RF = ZS.rift;
/** The rift's lips: its upper and lower edge (screen points, left to right): a jagged tear along a zigzag spine,
 * pinched at its ends and torn wide in two places. */
const RIFT_LIPS = (() => {
  const r = rng(hashStr('zs:rift'));
  const top: Pt[] = [];
  const bot: Pt[] = [];
  const n = 34;
  let y = RF.y + 10;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const x = RF.x - RF.w / 2 + u * RF.w + (r() - 0.5) * 10;
    // the spine zigzags, falling a little to the left
    y += (r() - 0.5) * 9 + (i % 5 === 0 ? (r() - 0.5) * 14 : 0);
    y = RF.y + (y - RF.y) * 0.85 + (0.5 - u) * 3;
    const open = Math.sin(u * Math.PI) ** 1.2 * (0.45 + 0.55 * Math.max(Math.exp(-(((u - 0.38) / 0.09) ** 2)), Math.exp(-(((u - 0.62) / 0.12) ** 2)) * 0.8));
    const w = 2 + open * 26;
    top.push([x, y - w * (0.4 + r() * 0.5)]);
    bot.push([x + (r() - 0.5) * 6, y + w * (0.5 + r() * 0.6)]);
  }
  return { top, bot };
})();
const riftPath = (grow = 0) => (c: Ctx) => {
  const { top, bot } = RIFT_LIPS;
  c.beginPath();
  top.forEach(([x, y], i) => {
    const m = (y + bot[i][1]) / 2;
    const yy = y - (m - y) * grow - grow * 3;
    if (i) c.lineTo(x, yy);
    else c.moveTo(x - grow * 20, m);
  });
  for (let i = bot.length - 1; i >= 0; i--) {
    const m = (top[i][1] + bot[i][1]) / 2;
    c.lineTo(bot[i][0] + (i === bot.length - 1 ? grow * 20 : 0), bot[i][1] + (bot[i][1] - m) * grow + grow * 3);
  }
  c.closePath();
};

/** The light of the rift itself: the tear's bright core, its glow, the storm-light pouring down from it (tear: false
 * leaves the tear itself out, for the sky to paint over its clouds). */
function riftLight(ctx: Ctx, r: R, k = 1, tear = true): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  softly(ctx, { x: 0, y: 0, w: W, h: HZ + 20 }, (q) => {
    const g = q.createRadialGradient(RF.x, RF.y + 10, 10, RF.x, RF.y + 10, 560);
    g.addColorStop(0, rgba('#cfe0ff', 0.5 * k));
    g.addColorStop(0.25, rgba('#7a9ad8', 0.22 * k));
    g.addColorStop(1, 'rgba(60,80,160,0)');
    q.save();
    q.translate(RF.x, RF.y + 10);
    q.scale(1.5, 0.75);
    q.translate(-RF.x, -RF.y - 10);
    q.fillStyle = g;
    q.fillRect(0, 0, W, HZ + 20);
    q.restore();
    // the light poured down out of it: a broad fan of rays into the haze, brightest straight down onto the throne
    for (let i = 0; i < 14; i++) {
      const u = (i + r()) / 14;
      const x0 = RF.x - RF.w * 0.38 + u * RF.w * 0.76;
      const spread = (x0 - RF.x) * 0.9;
      const w0 = 10 + r() * 22;
      const a = (0.05 + r() * 0.07) * (1 - Math.abs(u - 0.5)) * k;
      const lg = q.createLinearGradient(0, RF.y, 0, HZ + 20);
      lg.addColorStop(0, rgba('#dfe8ff', a));
      lg.addColorStop(1, 'rgba(200,220,255,0)');
      q.fillStyle = lg;
      q.beginPath();
      q.moveTo(x0 - w0 * 0.3, RF.y + 20);
      q.lineTo(x0 + w0 * 0.3, RF.y + 20);
      q.lineTo(x0 + spread + w0 * 2, HZ + 20);
      q.lineTo(x0 + spread - w0 * 2, HZ + 20);
      q.closePath();
      q.fill();
    }
  }, 0.25);
  ctx.restore();
  if (tear) riftTear(ctx, k);
}

/** The tear: a glow round it, pale blue lips, a white-hot seam down its middle, cracks of light running off its ends. */
function riftTear(ctx: Ctx, k = 1): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const b = boxOfPts([...RIFT_LIPS.top, ...RIFT_LIPS.bot], 2);
  softly(ctx, { x: b.x - 160, y: b.y - 120, w: b.w + 320, h: b.h + 240 }, (q) => {
    q.fillStyle = rgba('#5a46c8', 0.4 * k);
    riftPath(5)(q);
    q.fill();
    q.fillStyle = rgba('#5ab4ff', 0.45 * k);
    riftPath(2)(q);
    q.fill();
  }, 0.15);
  softly(ctx, { x: b.x - 30, y: b.y - 30, w: b.w + 60, h: b.h + 60 }, (q) => {
    q.fillStyle = rgba('#a8e0ff', 0.85 * k);
    riftPath(0.5)(q);
    q.fill();
    q.fillStyle = rgba('#ffffff', 0.9 * k);
    riftPath(0)(q);
    q.fill();
  }, 0.5);
  // the seam
  const { top, bot } = RIFT_LIPS;
  const mid: Pt[] = top.map(([x, y], i) => [x, (y + bot[i][1]) / 2 + 1]);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [w, a] of [[5, 0.35], [2, 0.9]] as const) {
    ctx.strokeStyle = rgba('#ffffff', a * k);
    ctx.lineWidth = w;
    ctx.beginPath();
    mid.slice(2, -2).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  }
  // cracks of light running on into the cloud from its ends
  const rr = rng(hashStr('zs:riftcracks'));
  for (const [ex, ey, dir] of [[mid[0][0], mid[0][1], -1], [mid[mid.length - 1][0], mid[mid.length - 1][1], 1]] as const) {
    for (let j = 0; j < 3; j++) {
      let x = ex;
      let y = ey;
      let a = (dir < 0 ? Math.PI : 0) + (rr() - 0.5) * 0.9;
      ctx.strokeStyle = rgba('#c8d8ff', (0.7 - j * 0.15) * k);
      ctx.lineWidth = 1.6 - j * 0.3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let i = 0; i < 7; i++) {
        a += (rr() - 0.5) * 0.8;
        x += Math.cos(a) * (8 + rr() * 10);
        y += Math.sin(a) * (5 + rr() * 6);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

function sky(ctx: Ctx, r: R): void {
  const b = SKY_BOX;
  skyFill(ctx, b, [[0, '#05060f'], [0.3, '#0b1026'], [0.62, '#18204a'], [0.86, '#2a3060'], [1, '#363a68']], 0.04);
  lay(ctx, drift('#2a3264', '#060818', 5, 401, 160, 60), b, 0.35);
  riftLight(ctx, r, 1, false);
  // the storm's ceiling: banks of cloud wheeling round the rift, their edges towards it lit cold white, heavier and
  // darker overhead and out to the sides; under them the lower storm, its bellies lit faintly red from far below
  const ring: [number, number, number, number, number][] = [];
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * P2 + r() * 0.3;
    const rad = 360 + r() * 520;
    const x = RF.x + Math.cos(a) * rad * 1.35;
    const y = RF.y + 40 + Math.sin(a) * rad * 0.32 + rad * 0.12;
    if (y > HZ - 70 || y < -60) continue;
    ring.push([x, y, 260 + r() * 360, 60 + r() * 70, a]);
  }
  ring.sort((p, q) => Math.hypot(q[0] - RF.x, (q[1] - RF.y) * 2) - Math.hypot(p[0] - RF.x, (p[1] - RF.y) * 2));
  for (const [x, y, w, h] of ring) {
    const d = Math.hypot(x - RF.x, (y - RF.y) * 2.2);
    const near = clamp01(1 - d / 900);
    cloud(ctx, r, x, y, w, h, {
      kind: 'bank',
      lit: mix('#3a4274', '#aabcf0', near * 0.8),
      body: mix('#0c1026', '#262e5a', near * 0.6),
      shadow: '#03040c',
      sunX: RF.x,
      sunY: RF.y,
      rim: 0.3 + near * 0.7,
      wisp: 0.55,
      a: 0.92,
    });
  }
  // the lips of the rift: ragged cloud right at its edges, lit hard from inside it
  for (let i = 0; i < 7; i++) {
    const u = (i + 0.5) / 7;
    const x = RF.x - RF.w * 0.5 + u * RF.w;
    const up = i % 2 === 0;
    const y = RF.y + (up ? -34 : 46) + (r() - 0.5) * 10;
    cloud(ctx, r, x, y + (up ? 0 : 24), 150 + r() * 90, 34 + r() * 18, { kind: 'bank', lit: '#dce8ff', body: '#1c244c', shadow: '#060818', sunX: RF.x, sunY: RF.y + (up ? 30 : -30), rim: 1, wisp: 0.6, a: 0.9 });
  }
  riftTear(ctx);
  ctx.save();
  shaft(ctx, r, [RF.x - 150, RF.y + 30, RF.x + 130, RF.y + 30], [RF.x - 330, HZ + 70, RF.x + 310, HZ + 70], '#c8d8ff', 0.16, { streaks: 7, motes: 0 });
  ctx.restore();
  // the lower storm over the horizon: long dark bars, their bellies touched with the red from below
  for (let i = 0; i < 6; i++) {
    const x = (i + 0.2 + r() * 0.6) * (W / 6);
    const y = HZ - 24 - r() * 80;
    cloud(ctx, r, x, y, 420 + r() * 300, 30 + r() * 24, { kind: 'stratus', lit: '#5a5e8e', body: '#1e2246', shadow: '#3a1a2a', sunX: RF.x, sunY: RF.y, rim: 0.25, wisp: 0.6, a: 0.7 });
  }
  haze(ctx, HZ - 90, HZ + 24, '#4a4a7a', 0.45, 0.85);
}

// ——— the cloud sea far below, the red of Tartarus in its gaps, and the hall's far end sinking into it ———

export const SEA_BOX: Box = { x: 0, y: HZ - 30, w: W, h: TY - HZ + 30 };
/** The gaps in the cloud sea (screen x, y at their middle, half width): Tartarus glows red in them. */
export const GAPS: [number, number, number][] = [
  [262, 548, 96],
  [1668, 560, 100],
  [742, 452, 46],
  [1186, 458, 52],
  [468, 470, 30],
];

/** One cloud head of the sea: a heap of lobes in its body colour, a lit crown along its top (turned to the storm's
 * light and the rift), shading into the dark of the valley below it; red underneath when a gap is near. */
function seaHead(q: Ctx, r: R, x: number, y: number, s: number, red: number): void {
  const n = 3 + Math.floor(r() * 4);
  const lobes: V3[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n - 0.5;
    const rad = s * (0.5 + (1 - Math.abs(t) * 1.6) * 0.45) * (0.7 + r() * 0.6);
    lobes.push([x + t * s * 2.6 + (r() - 0.5) * s * 0.4, y - rad * 0.5 - (1 - Math.abs(t) * 2) * s * 0.3, rad]);
  }
  const toRift = clamp01(1 - Math.abs(x - 960) / 1000);
  const body = mix(SEA.body, SEA.deep, 0.15);
  // the mass
  q.fillStyle = body;
  q.beginPath();
  for (const [lx, ly, lr] of lobes) {
    q.moveTo(lx + lr * 1.5, ly);
    q.ellipse(lx, ly, lr * 1.5, lr, 0, 0, P2);
  }
  q.fill();
  // its crown, lit: each lobe's top-left, a soft crescent
  for (const [lx, ly, lr] of lobes) {
    const g = q.createRadialGradient(lx - lr * 0.4, ly - lr * 0.7, lr * 0.1, lx - lr * 0.2, ly - lr * 0.3, lr * 1.2);
    g.addColorStop(0, rgba(mix(SEA.lit, SEA.top, toRift * 0.8), 0.95));
    g.addColorStop(0.5, rgba(mix(SEA.body, SEA.lit, 0.5), 0.5));
    g.addColorStop(1, rgba(body, 0));
    q.fillStyle = g;
    q.beginPath();
    q.ellipse(lx, ly, lr * 1.5, lr, 0, Math.PI * 0.95, Math.PI * 2.05);
    q.fill();
  }
  // the valley's dark under it, and the red from below
  const vg = q.createLinearGradient(0, y - s * 0.3, 0, y + s * 0.4);
  vg.addColorStop(0, rgba(SEA.deep, 0));
  vg.addColorStop(1, rgba(red > 0 ? mix(SEA.deep, '#b02c16', red) : SEA.deep, 0.8));
  q.fillStyle = vg;
  q.beginPath();
  for (const [lx, ly, lr] of lobes) {
    q.moveTo(lx + lr * 1.5, ly);
    q.ellipse(lx, ly, lr * 1.5, lr, 0, 0, P2);
  }
  q.fill();
}

function seaRows(q: Ctx, r: R): void {
  // rows of heads from the horizon down to us, bigger and further apart nearer us, each overlapping the one behind;
  // none where the gaps open
  for (let y = HZ + 3; y < TY + 40; ) {
    const d = y - HZ;
    const s = 4 + d * 0.36;
    let x = -40 - r() * s * 2;
    while (x < W + 60) {
      let red = 0;
      let inGap = false;
      for (const [gx, gy, hw] of GAPS) {
        const e = Math.hypot((x - gx) / hw, (y - gy) / (hw * 0.32 * (0.7 + (gy - HZ) / 240)));
        if (e < 0.85) inGap = true;
        red = Math.max(red, clamp01(1.6 - e) * 0.9);
      }
      const sz = s * (0.6 + r() * 0.9);
      if (!inGap) seaHead(q, r, x, y + (r() - 0.5) * s * 0.4, sz, red);
      x += sz * (1.8 + r() * 1.8);
    }
    y += s * (0.5 + r() * 0.35);
  }
}

function sea(ctx: Ctx, r: R): void {
  const b = SEA_BOX;
  vfill(ctx, 0, b.y, W, b.h, [[0, '#3a3c68'], [0.1, '#363a66'], [0.35, '#262a52'], [1, '#14162e']]);
  softly(ctx, b, (q) => seaRows(q, r), 0.4);
  // the gaps: holes down through the cloud, red with the fires of Tartarus far below, soft-edged in the mist
  for (const [gx, gy, hw] of GAPS) {
    const hh = hw * 0.3 * (0.7 + (gy - HZ) / 240);
    softly(ctx, { x: gx - hw * 2, y: gy - hh * 3, w: hw * 4, h: hh * 6 }, (q) => {
      const g = q.createRadialGradient(gx, gy + hh * 0.25, 0, gx, gy, hw * 1.2);
      g.addColorStop(0, '#f07a34');
      g.addColorStop(0.2, '#a82a16');
      g.addColorStop(0.5, '#3a0e10');
      g.addColorStop(0.8, rgba('#262a52', 0.6));
      g.addColorStop(1, rgba('#262a52', 0));
      q.save();
      q.translate(gx, gy);
      q.scale(1, hh / hw);
      q.translate(-gx, -gy);
      q.fillStyle = g;
      q.fillRect(gx - hw * 2, gy - hw * 2, hw * 4, hw * 4);
      q.restore();
      // its near lip: the cloud's edge overhanging the hole, lit red from below, a cold crown on top
      for (let i = 0; i < 3; i++) {
        const t = (i + 0.5) / 3 - 0.5;
        seaHead(q, r, gx + t * hw * 1.3, gy + hh * (1.05 - Math.abs(t) * 0.6), hh * (1.2 + r() * 0.4), 1);
      }
    }, 0.5);
  }
  // nearer and bigger in the windows at the sides: heaped cumulus, soft and broken, lit cold on top, their
  // undersides red where a gap opens beneath them
  for (const [x, y, w, h] of [[90, 612, 300, 100], [400, 632, 260, 90], [140, 488, 240, 70], [430, 506, 200, 64], [330, 452, 180, 50], [1830, 618, 300, 100], [1520, 636, 260, 90], [1780, 496, 240, 70], [1490, 512, 200, 64], [1610, 458, 180, 50]] as [number, number, number, number][]) {
    let red = 0;
    for (const [gx, gy, hw] of GAPS) red = Math.max(red, clamp01(1 - Math.hypot(x - gx, (y - gy) * 2) / (hw * 3)));
    cloud(ctx, r, x, y, w, h, { kind: 'cumulus', lit: '#b8bcdc', body: '#3e4270', shadow: mix('#161830', '#a83018', red), sunX: 960, sunY: 40, rim: 0.45, wisp: 0.5, a: 0.95 });
  }
  // the gaps' glow bleeding up through the mist over them
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [gx, gy, hw] of GAPS) {
    lightPool(ctx, gx, gy - hw * 0.15, hw * 1.9, hw * 0.6, '#ff5a24', 0.26);
    lightPool(ctx, gx, gy, hw * 0.7, hw * 0.25, '#ffb060', 0.3);
  }
  ctx.restore();
  // the haze over the sea at the horizon, and the sea darkening below us
  haze(ctx, HZ - 10, HZ + 60, '#4a4c7e', 0.55, 0.3);
  vfill(ctx, 0, HZ + 150, W, TY - HZ - 120, [[0, 'rgba(6,6,18,0)'], [1, 'rgba(6,6,18,0.4)']]);
}

/** The far end breaking away: beyond the fallen left corner, two columns of the rear colonnade, their footing gone,
 * topple back and out over the break into the cloud (their feet already below the broken lip), a length of
 * architrave and rubble falling with them, dust and grit streaming up off them. */
const TOPPLE: { X: number; z: number; len: number; dir: V3; broken: boolean }[] = [
  { X: -7.2, z: 47.4, len: 13, dir: norm([-0.45, 0.85, 0.25]), broken: false },
  { X: 7.4, z: 48.2, len: 9.4, dir: norm([0.5, 0.82, 0.3]), broken: true },
];
const TOPPLE_Y = -1.8;
export const FALLEN_BOX: Box = { x: 640, y: 236, w: 640, h: 300 };

function fallen(ctx: Ctx, r: R): void {
  const B = FALLEN_BOX;
  const [cv, c] = makeCanvas(B.w, B.h);
  c.translate(-B.x, -B.y);
  c.lineJoin = 'round';
  // dust streaming up off them, lit cold by the rift
  softly(c, B, (q) => {
    for (const t of TOPPLE) {
      for (let i = 0; i < 9; i++) {
        const u = 0.2 + i * 0.1;
        const [x, y] = P(t.X + t.dir[0] * t.len * u + 0.6, TOPPLE_Y + t.dir[1] * t.len * u + 1.5 + i * 0.3, t.z + t.dir[2] * t.len * u);
        const rad = 8 + i * 3;
        const g = q.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, rgba('#8a8cb8', 0.4));
        g.addColorStop(1, rgba('#8a8cb8', 0));
        q.fillStyle = g;
        q.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
    }
  }, 0.5);
  for (const t of TOPPLE) {
    const top = t.len;
    const pAt = (Y: number): Pt => P(t.X + t.dir[0] * Y, TOPPLE_Y + t.dir[1] * Y, t.z + t.dir[2] * Y);
    const [bx, by] = pAt(0);
    const [tx, ty] = pAt(top);
    const rr = ZS.colR * pz(t.z + 2);
    const ax = tx - bx;
    const ay = ty - by;
    const al = Math.hypot(ax, ay) || 1;
    const nx = -ay / al;
    const ny = ax / al;
    const sh = polyPath([[bx - nx * rr, by - ny * rr], [bx + nx * rr, by + ny * rr], [tx + nx * rr * 0.9, ty + ny * rr * 0.9], [tx - nx * rr * 0.9, ty - ny * rr * 0.9]]);
    // lit on the side turned to the rift (the right), its far side in the storm's dark
    fillPath(c, sh, lin(c, [bx - nx * rr, by - ny * rr], [bx + nx * rr, by + ny * rr], [[0, '#c8ccec'], [0.35, '#8a8eb4'], [1, '#2c2e56']]));
    for (let i = 1; i < 8; i++) {
      const o = (-1 + i / 4) * rr * 0.95;
      line(c, [bx + nx * o, by + ny * o], [tx + nx * o * 0.9, ty + ny * o * 0.9], 'rgba(20,22,52,0.22)', 1);
    }
    // a crack across it where it's giving way
    const cm = pAt(top * 0.45);
    line(c, [cm[0] - nx * rr, cm[1] - ny * rr], [cm[0] + nx * rr * 0.4, cm[1] + ny * rr * 0.4 + 3], 'rgba(16,16,40,0.7)', 1.4);
    strokePath(c, sh, 'rgba(16,18,40,0.75)', 1.1);
    if (t.broken) {
      const prof = [0.2, 0.9, 0.4, 1.4, 0.6, 0.3];
      const pts: Pt[] = prof.map((h, i): Pt => {
        const o = (-1 + (i / (prof.length - 1)) * 2) * rr * 0.9;
        return [tx + nx * o + (ax / al) * h * rr * 0.6, ty + ny * o + (ay / al) * h * rr * 0.6];
      });
      fillPath(c, polyPath([[tx - nx * rr * 0.9, ty - ny * rr * 0.9], ...pts, [tx + nx * rr * 0.9, ty + ny * rr * 0.9]]), '#a8acd0');
    } else {
      // its capital, tipped with it
      const cw = rr * 1.45;
      const ch = rr * 0.5;
      const cap = polyPath([[tx - nx * rr, ty - ny * rr], [tx + nx * rr, ty + ny * rr], [tx + nx * cw + (ax / al) * ch, ty + ny * cw + (ay / al) * ch], [tx - nx * cw + (ax / al) * ch, ty - ny * cw + (ay / al) * ch]]);
      fillPath(c, cap, '#9a9ec4');
      strokePath(c, cap, 'rgba(16,18,40,0.75)', 1);
      const band = polyPath([[tx - nx * rr, ty - ny * rr], [tx + nx * rr, ty + ny * rr], [tx + nx * rr + (ax / al) * 2, ty + ny * rr + (ay / al) * 2], [tx - nx * rr + (ax / al) * 2, ty - ny * rr + (ay / al) * 2]]);
      fillPath(c, band, GOLD.body);
    }
  }
  // a length of architrave falling, turning end over end, and the rubble going with it
  const [fx, fy] = P(-9.4, 8.6, 52.5);
  c.save();
  c.translate(fx, fy);
  c.rotate(-0.65);
  const k = pz(50);
  const aw = k * 3.2;
  const ah = k * 0.9;
  c.fillStyle = lin(c, [0, -ah / 2], [0, ah / 2], [[0, '#b8bcdc'], [0.5, '#7a7ea8'], [1, '#30325a']]);
  c.beginPath();
  c.moveTo(-aw / 2, -ah / 2);
  c.lineTo(aw / 2 - 4, -ah / 2);
  c.lineTo(aw / 2, -ah / 4);
  c.lineTo(aw / 2 - 6, 0);
  c.lineTo(aw / 2 - 2, ah / 2);
  c.lineTo(-aw / 2, ah / 2);
  c.closePath();
  c.fill();
  c.strokeStyle = 'rgba(16,18,40,0.75)';
  c.lineWidth = 1;
  c.stroke();
  c.fillStyle = rgba(GOLD.body, 0.7);
  c.fillRect(-aw / 2 + 2, -ah * 0.05, aw - 12, ah * 0.14);
  c.restore();
  for (let i = 0; i < 12; i++) {
    const x = (i % 2 ? 1150 : 690) + r() * 90;
    const y = 280 + r() * 180;
    const s0 = 2 + r() * 4;
    c.fillStyle = r() < 0.5 ? '#9a9ec4' : '#5a5e88';
    c.beginPath();
    c.moveTo(x - s0, y);
    c.lineTo(x, y - s0 * 0.8);
    c.lineTo(x + s0, y + s0 * 0.2);
    c.lineTo(x + s0 * 0.2, y + s0);
    c.closePath();
    c.fill();
  }
  // seen through a little of the storm's air
  c.globalCompositeOperation = 'source-atop';
  c.fillStyle = rgba('#3a3e6a', 0.18);
  c.fillRect(B.x, B.y, B.w, B.h);
  ctx.drawImage(cv, B.x, B.y);
}

// ——— the floor: the platform's white marble, wet with rain, its edges stepping down into the void ———

/** The slabs: GX across (each column in the middle of its slab), GZ deep (two to a bay). */
const GX = 2.1;
const GZ = 3.25;
const Z0 = 11.4;
/** The platform's outline on screen (its near edge below the table's back). */
const floorPts = (grow = 0): Pt[] => [P(-ZS.edgeX - grow, 0, Z0), P(-ZS.edgeX - grow, 0, BREAK[0][1]), ...BREAK.map(([X, z]) => P(X, 0, z + grow * 0.6)), P(ZS.edgeX + grow, 0, Z0)];
const floorPath = (grow = 0) => polyPath(floorPts(grow));
/** The two steps down from the platform's edge (each side): their top faces. */
const stepPath = (s: -1 | 1, i: number) => {
  const X0 = s * (ZS.edgeX + i * 0.8);
  const X1 = s * (ZS.edgeX + (i + 1) * 0.8);
  const Y = -(i + 1) * 0.38;
  const zEnd = s < 0 ? BREAK[0][1] - i * 1.2 : BREAK[BREAK.length - 1][1] - i * 0.8;
  return quad(P(X0, Y, Z0), P(X1, Y, Z0), P(X1, Y, zEnd), P(X0, Y, zEnd));
};
/** Lightning scars burnt into the floor (X, z, size). */
const SCARS: V3[] = [
  [4.6, 17.5, 2.2],
  [-6.2, 27.5, 1.6],
  [7.4, 35.2, 1.3],
];
/** Rain lying on the floor (X, z, half width, half depth). */
const PUDDLES: [number, number, number, number][] = [
  [-3.6, 15.4, 1.6, 0.9],
  [6.8, 19.2, 1.2, 0.8],
  [-8.4, 22.6, 1.0, 0.7],
  [1.8, 26.8, 1.6, 1.1],
  [-2.4, 31.4, 1.2, 0.8],
];

/** A puddle's outline on the floor. */
function puddlePts(Xp: number, zp: number, hw: number, hd: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * P2;
    const wob = 1 + Math.sin(a * 3 + Xp) * 0.18 + Math.sin(a * 5 + zp) * 0.08;
    pts.push(P(Xp + Math.cos(a) * hw * wob, 0, zp + Math.sin(a) * hd * wob));
  }
  return pts;
}

export const FLOOR_FAR: Box = { x: 482, y: 470, w: 961, h: 150 };
const FLOOR_SIDE_L: Box = { x: 0, y: 470, w: 482, h: 150 };
const FLOOR_SIDE_R: Box = { x: 1443, y: 470, w: 477, h: 150 };
export const FLOOR_NEAR: Box = { x: 0, y: 620, w: W, h: TY - 620 };

function floor(ctx: Ctx, clip: Box): void {
  const r = rng(hashStr('zs:floor'));
  const b: Box = { x: 0, y: 470, w: W, h: TY - 470 };
  ctx.save();
  ctx.beginPath();
  ctx.rect(clip.x, clip.y, clip.w, clip.h);
  ctx.clip();
  // the steps down at the sides, into the void
  for (const s of [-1, 1] as const) {
    for (let i = 0; i < 2; i++) {
      const st = stepPath(s, i);
      fillPath(ctx, st, mix('#3a3e5c', '#5a5e7c', 0.5 - i * 0.3));
      within(ctx, st, () => vfill(ctx, 0, b.y, W, b.h, [[0, 'rgba(20,22,44,0.5)'], [1, 'rgba(20,22,44,0)']]));
      strokePath(ctx, st, 'rgba(10,10,26,0.6)', 1);
    }
  }
  const fl = floorPath();
  fillPath(ctx, fl, '#4a4e6c');
  within(ctx, fl, () => {
    // white marble under a storm: lit cold far off where the rift's light falls, dimmer towards us
    vfill(ctx, 0, b.y, W, b.h, [[0, '#9aa0bc'], [0.15, '#7a809e'], [0.45, '#585c7e'], [1, '#42466a']]);
    surface(ctx, r, b, '#585c7e', { over: true, vary: 0.25, cells: 4, mottle: 0.25, strokes: 0.03, strokeAng: 0, strokeLen: 300, strokeW: 3, grain: 0.04, grainKind: 'stone', warm: '#9a9cb4', cool: '#4a5076', seed: 31 });
    // the rift's light on the far floor round the dais
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    lightPool(ctx, 960, 520, 620, 70, '#aab8e8', 0.22);
    ctx.restore();
    // each slab its own stone: a touch lighter or darker, a grey vein or two crossing it
    for (let z = Z0 + 0.475; z < 47; z += GZ) {
      for (let Xs = -ZS.edgeX - 0.2; Xs < ZS.edgeX; Xs += GX) {
        const xa = Math.round((Xs + GX / 2) / GX) * GX - GX / 2;
        const xb = xa + GX;
        const s = quad(P(xa, 0, z), P(xb, 0, z), P(xb, 0, z + GZ), P(xa, 0, z + GZ));
        const v = r();
        fillPath(ctx, s, v < 0.5 ? rgba('#1a1c34', 0.03 + v * 0.08) : rgba('#e0e4f4', (v - 0.5) * 0.08));
        if (r() < 0.7) {
          const za = z + r() * GZ;
          const zb = z + r() * GZ;
          const ph = r() * 6;
          ctx.strokeStyle = rgba(r() < 0.2 ? GOLD.shade : '#3a3e5c', 0.08 + r() * 0.1);
          ctx.lineWidth = Math.max(0.6, pz(z) * 0.025);
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
    // the joints
    for (let Xj = -ZS.edgeX - GX / 2; Xj <= ZS.edgeX + GX; Xj += GX) {
      const X = Math.round((Xj + GX / 2) / GX) * GX - GX / 2;
      line(ctx, P(X, 0, Z0), P(X, 0, 47), 'rgba(16,18,40,0.28)', 1.1);
      line(ctx, P(X + 0.05, 0, Z0), P(X + 0.05, 0, 47), rgba('#e8ecff', 0.06), 1);
    }
    for (let z = Z0 + 0.475; z < 47; z += GZ) {
      line(ctx, P(-ZS.edgeX, 0, z), P(ZS.edgeX, 0, z), 'rgba(16,18,40,0.28)', Math.max(1, pz(z) * 0.03));
      line(ctx, P(-ZS.edgeX, 0, z - 0.06), P(ZS.edgeX, 0, z - 0.06), rgba('#e8ecff', 0.05), 1);
    }
    // the processional way to the dais: a band of storm-grey marble between thin gold fillets
    const way = quad(P(-2.1, 0, Z0), P(2.1, 0, Z0), P(2.1, 0, DA.z0), P(-2.1, 0, DA.z0));
    fillPath(ctx, way, rgba('#2a2e4c', 0.22));
    for (const s of [-1, 1]) {
      line(ctx, P(s * 2.1, 0, Z0), P(s * 2.1, 0, DA.z0), rgba(GOLD.body, 0.4), 1.4);
      line(ctx, P(s * 1.85, 0, Z0), P(s * 1.85, 0, DA.z0), rgba(GOLD.shade, 0.3), 1);
    }
    // the wet: the floor mirrors at a grazing angle. The rift's light down the nave, the dais standing in its own
    // reflection, the columns upside down under themselves, the fires' blue
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    softly(ctx, { x: 700, y: 500, w: 520, h: 260 }, (q) => {
      const g = q.createLinearGradient(0, 520, 0, 760);
      g.addColorStop(0, rgba('#c8d8ff', 0.3));
      g.addColorStop(0.35, rgba('#8aa0e0', 0.12));
      g.addColorStop(1, rgba('#4a60b0', 0));
      q.fillStyle = g;
      q.beginPath();
      q.moveTo(900, 520);
      q.lineTo(1020, 520);
      q.lineTo(1120, 760);
      q.lineTo(800, 760);
      q.closePath();
      q.fill();
    }, 0.1, 'lighter');
    // the throne standing in its own reflection: its marble and gold upside down under the dais, broken by the joints
    softly(ctx, { x: 780, y: 520, w: 360, h: 220 }, (q) => {
      const g = q.createLinearGradient(0, 530, 0, 720);
      g.addColorStop(0, rgba('#d8d4e0', 0.3));
      g.addColorStop(1, rgba('#d8d4e0', 0));
      q.fillStyle = g;
      q.fillRect(840, 530, 240, 190);
      const gg = q.createLinearGradient(0, 530, 0, 680);
      gg.addColorStop(0, rgba(GOLD.lit, 0.35));
      gg.addColorStop(1, rgba(GOLD.body, 0));
      q.fillStyle = gg;
      q.fillRect(945, 530, 30, 150);
      q.fillRect(868, 530, 12, 110);
      q.fillRect(1040, 530, 12, 110);
    }, 0.2, 'lighter');
    for (const [Xf, zf] of ZS.braziers) {
      const [fx] = P(Xf, 0, zf);
      const yr = sy(-(ZS.brazierY + 1), zf);
      softly(ctx, { x: fx - 70, y: yr - 90, w: 140, h: 230 }, (q) => {
        const g = q.createRadialGradient(fx, yr, 0, fx, yr, 90);
        g.addColorStop(0, rgba('#6ac0ff', 0.42));
        g.addColorStop(0.4, rgba('#3a88e0', 0.14));
        g.addColorStop(1, rgba('#1a40a0', 0));
        q.fillStyle = g;
        q.save();
        q.translate(fx, yr);
        q.scale(0.32, 1.2);
        q.translate(-fx, -yr);
        q.fillRect(fx - 90, yr - 90, 180, 180);
        q.restore();
      }, 0.15, 'lighter');
      lightPool(ctx, fx, sy(0, zf) + 6, 170, 40, '#3a88f0', 0.42);
    }
    ctx.restore();
    for (const s of [-1, 1] as const) {
      for (const [i, z] of ZS.rows.entries()) {
        const Xc = s * ZS.colX;
        const k = pz(z);
        const [cx, cy] = P(Xc, 0, z);
        if (cy > TY + 10) continue;
        const rr = ZS.colR * k * 1.15;
        const len = k * (i === 3 && s > 0 ? 2.2 : 3.6);
        softly(ctx, { x: cx - rr * 1.6, y: cy, w: rr * 3.2, h: len }, (q) => {
          const g = q.createLinearGradient(cx - rr, 0, cx + rr, 0);
          g.addColorStop(0, rgba('#c8cce0', 0));
          g.addColorStop(0.5 + s * 0.25, rgba('#d8dcf0', 0.42));
          g.addColorStop(1, rgba('#c8cce0', 0.05));
          q.fillStyle = g;
          q.fillRect(cx - rr, cy, rr * 2, len);
          q.globalCompositeOperation = 'destination-in';
          const fg = q.createLinearGradient(0, cy, 0, cy + len);
          fg.addColorStop(0, 'rgba(0,0,0,1)');
          fg.addColorStop(1, 'rgba(0,0,0,0)');
          q.fillStyle = fg;
          q.fillRect(cx - rr * 1.6, cy, rr * 3.2, len);
        }, 0.35);
      }
    }
    // the puddles: still water mirroring the storm sky, crisp edges, a lit lip on the far side
    for (const [Xp, zp, hw, hd] of PUDDLES) {
      const pts = puddlePts(Xp, zp, hw, hd);
      const pp = polyPath(pts);
      const pb = boxOfPts(pts, 0);
      fillPath(ctx, pp, rgba('#20243e', 0.35));
      within(ctx, pp, () => {
        ctx.fillStyle = lin(ctx, [0, pb.y], [0, pb.y + pb.h], [[0, rgba('#8890c0', 0.45)], [1, rgba('#3a4070', 0.2)]]);
        ctx.fillRect(pb.x, pb.y, pb.w, pb.h);
        // the sky's streaks in it
        for (let i = 0; i < 4; i++) {
          const y = pb.y + r() * pb.h;
          line(ctx, [pb.x, y], [pb.x + pb.w, y + (r() - 0.5) * 2], rgba('#c8d0f4', 0.08 + r() * 0.1), 1);
        }
      });
      ctx.strokeStyle = rgba('#e0e6ff', 0.22);
      ctx.lineWidth = 1;
      ctx.beginPath();
      pts.slice(10, 17).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    }
    // lightning scars: the marble burnt in branching figures where bolts struck, a little gold fused in them
    for (const [Xs, zs, sz] of SCARS) {
      const [cx, cy] = P(Xs, 0, zs);
      const k = pz(zs);
      const flat = 0.38 * (EH / zs) * 4;
      const branch = (x: number, y: number, ang: number, len: number, w: number, d: number) => {
        let px = x;
        let py = y;
        let a = ang;
        for (let s = 0; s < len; s += 4) {
          a += (r() - 0.5) * 0.9;
          const nx = px + Math.cos(a) * 4;
          const ny = py + Math.sin(a) * 4 * flat;
          ctx.strokeStyle = rgba('#141428', 0.55 * (1 - s / len) + 0.1);
          ctx.lineWidth = Math.max(0.5, w * (1 - s / len));
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(nx, ny);
          ctx.stroke();
          px = nx;
          py = ny;
          if (d < 3 && r() < 0.14) branch(px, py, a + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.6), len * 0.45, w * 0.6, d + 1);
        }
      };
      const glowR = sz * k;
      ctx.fillStyle = rgba('#1a1a30', 0.22);
      ctx.beginPath();
      ctx.ellipse(cx, cy, glowR * 0.5, glowR * 0.5 * flat, 0, 0, P2);
      ctx.fill();
      for (let i = 0; i < 6; i++) branch(cx, cy, (i / 6) * P2 + r() * 0.5, sz * k * (0.6 + r() * 0.5), Math.max(1, k * 0.05), 0);
      ctx.fillStyle = rgba(GOLD.body, 0.35);
      ctx.beginPath();
      ctx.ellipse(cx, cy, k * 0.12, k * 0.12 * flat, 0, 0, P2);
      ctx.fill();
    }
    // the shadows of the columns thrown towards us by the rift's light behind them, long and soft
    for (const s of [-1, 1] as const) {
      for (const [i, z] of ZS.rows.entries()) {
        const Xc = s * ZS.colX;
        const d = [Xc - RIFT_P[0], z - RIFT_P[2]];
        const l = Math.hypot(d[0], d[1]);
        const ux = d[0] / l;
        const uz = d[1] / l;
        const wd = ZS.colR * 0.9;
        const len = i === 3 && s > 0 ? 5 : 10;
        const sh = quad(P(Xc - uz * wd, 0, z + ux * wd), P(Xc + uz * wd, 0, z - ux * wd), P(Xc + uz * wd * 2 + ux * len, 0, z - ux * wd * 2 + uz * len), P(Xc - uz * wd * 2 + ux * len, 0, z + ux * wd * 2 + uz * len));
        const sb = boxOfPts([P(Xc, 0, z), P(Xc + ux * len, 0, z + uz * len)], 70);
        softly(ctx, sb, (q) => fillPath(q, sh, 'rgba(14,16,40,0.3)'), 0.15);
      }
    }
    const dsh = quad(P(-DA.hw, 0, DA.z0), P(DA.hw, 0, DA.z0), P(DA.hw * 1.5, 0, DA.z0 - 8), P(-DA.hw * 1.5, 0, DA.z0 - 8));
    softly(ctx, { x: 600, y: 500, w: 720, h: 140 }, (q) => fillPath(q, dsh, 'rgba(14,16,40,0.25)'), 0.15);
    // cracks running forward from the broken end through the slabs near it
    for (const [X, z] of BREAK.filter((_, i) => i % 3 === 1)) {
      const [cx, cy] = P(X, 0, z - 0.1);
      crack(ctx, r, cx, cy, Math.PI / 2 + (r() - 0.5) * 1.4, 26 + r() * 40, { col: '#141630', lip: '#c8d0f0', w: 1.1, a: 0.55 });
    }
    // the floor darkens towards us (the platform's middle is in the storm's shadow), calm under the lanes
    vfill(ctx, 0, 560, W, TY - 560, [[0, 'rgba(18,20,44,0)'], [1, 'rgba(18,20,44,0.35)']]);
  });
  // the broken end: a thin lit lip where the slab snapped, the void under it
  const brk = BREAK.map(([X, z]) => P(X, 0, z));
  ctx.strokeStyle = rgba('#e8ecff', 0.35);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  brk.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.strokeStyle = 'rgba(10,10,26,0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  brk.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + 1.5) : ctx.moveTo(x, y + 1.5)));
  ctx.stroke();
  // rubble along the break: chunks of slab, each lit on top, in its own shadow
  for (let i = 0; i < 16; i++) {
    const j = Math.floor(r() * (BREAK.length - 1));
    const t = r();
    const X = BREAK[j][0] + (BREAK[j + 1][0] - BREAK[j][0]) * t;
    const z = BREAK[j][1] + (BREAK[j + 1][1] - BREAK[j][1]) * t - 0.4 - r() * 1.6;
    rubble(ctx, r, X, z, 0.2 + r() * 0.35);
  }
  ctx.restore();
}

/** A chunk of marble lying on the floor at (X, z), size s metres: a lit top, a darker front, its shadow. */
function rubble(ctx: Ctx, r: R, X: number, z: number, s: number): void {
  rubbleAt(ctx, r, X, 0, z, s);
}
function rubbleAt(ctx: Ctx, r: R, X: number, Y: number, z: number, s: number): void {
  const k = pz(z);
  const [cx, cy] = P(X, Y, z);
  const w = s * k;
  const h = w * (0.5 + r() * 0.3);
  groundShadow(ctx, cx + w * 0.3, cy + 1, w * 1.1, w * 0.22, 0.5, '#0e1028');
  const pts: Pt[] = [];
  const n = 6;
  for (let i = 0; i < n; i++) {
    const a = Math.PI + (i / (n - 1)) * Math.PI;
    pts.push([cx + Math.cos(a) * w * (0.8 + r() * 0.3), cy + Math.sin(a) * h * (0.7 + r() * 0.4)]);
  }
  pts.push([cx + w * 0.8, cy + 1], [cx - w * 0.8, cy + 1]);
  const p = polyPath(pts);
  fillPath(ctx, p, lin(ctx, [cx, cy - h], [cx, cy], [[0, mix(MARB.lit, '#c8d0f0', 0.3)], [0.45, MARB.body], [1, MARB.shade]]));
  strokePath(ctx, p, 'rgba(14,16,34,0.7)', Math.max(0.8, k * 0.02));
}

// ——— the right colonnade's broken column: its drums where they fell ———

const DRUMS: { X: number; z: number; len: number; ang: number }[] = [
  { X: 9.0, z: 29.6, len: 1.5, ang: 0.35 },
  { X: 7.6, z: 31.4, len: 1.3, ang: -0.5 },
];
export const DRUMS_BOX: Box = { x: 1150, y: 480, w: 260, h: 110 };

function drums(ctx: Ctx, r: R): void {
  for (const d of DRUMS) {
    const R0 = ZS.colR;
    // a drum lying on its side: its axis level, along the floor at angle ang (0: across)
    const ax = Math.cos(d.ang);
    const az = Math.sin(d.ang);
    const a0: V3 = [d.X - (ax * d.len) / 2, R0 * 0.92, d.z - (az * d.len) / 2];
    const a1: V3 = [d.X + (ax * d.len) / 2, R0 * 0.92, d.z + (az * d.len) / 2];
    const k = pz(d.z);
    const [p0x, p0y] = P(...a0);
    const [p1x, p1y] = P(...a1);
    groundShadow(ctx, (p0x + p1x) / 2 + k * 0.4, sy(0, d.z) + 2, Math.abs(p1x - p0x) / 2 + R0 * k, R0 * k * 0.32, 0.55, '#0e1028');
    const rr = R0 * 0.92 * k;
    // the barrel: a band from end to end, lit on top
    const bar = polyPath([[p0x, p0y - rr], [p1x, p1y - rr], [p1x, p1y + rr], [p0x, p0y + rr]]);
    fillPath(ctx, bar, lin(ctx, [0, Math.min(p0y, p1y) - rr], [0, Math.max(p0y, p1y) + rr], [[0, lit(MARB.body, d.X, 1.8, d.z, [0, 1, 0], { key: 0.5, rift: 0.6 })], [0.45, MARB.body], [1, MARB.deep]]));
    within(ctx, bar, () => {
      for (let i = 1; i < 8; i++) {
        const o = -rr + (i / 8) * rr * 2;
        line(ctx, [p0x, p0y + o], [p1x, p1y + o], rgba(i < 4 ? '#f0f4ff' : '#0a0c20', 0.12), 1);
      }
    });
    strokePath(ctx, bar, 'rgba(14,16,34,0.75)', 1.2);
    // the end turned to us: a fluted disc, its broken face rough
    const near = p0y > p1y ? [p0x, p0y] : [p1x, p1y];
    const ex = near[0];
    const ey = near[1];
    const end = (c: Ctx) => {
      c.beginPath();
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * P2;
        const fl = i % 2 ? 0.94 : 1;
        const px = ex + Math.cos(a) * rr * 0.45 * fl;
        const py = ey + Math.sin(a) * rr * fl;
        if (i) c.lineTo(px, py);
        else c.moveTo(px, py);
      }
      c.closePath();
    };
    fillPath(ctx, end, lin(ctx, [ex - rr * 0.4, ey - rr], [ex + rr * 0.4, ey + rr], [[0, MARB.lit], [1, MARB.shade]]));
    within(ctx, end, () => {
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = rgba('#1a1c34', 0.15);
        ctx.beginPath();
        ctx.arc(ex + (r() - 0.5) * rr * 0.6, ey + (r() - 0.5) * rr * 1.4, 1 + r() * 2.5, 0, P2);
        ctx.fill();
      }
    });
    strokePath(ctx, end, 'rgba(14,16,34,0.75)', 1.1);
  }
  rubble(ctx, r, 8.4, 30.3, 0.4);
  rubble(ctx, r, 10.1, 31.8, 0.5);
  rubble(ctx, r, 6.9, 30.0, 0.25);
}

// ——— the colonnades ———

const BASE_Y = 0.9;
/** The right colonnade's fourth column, snapped off at this height (its drums lie on the floor). */
const BROKEN_TOP = 5.9;

function column(ctx: Ctx, r: R, X: number, z: number, seed: number, o: { top?: number; cracked?: boolean } = {}): void {
  const R0 = ZS.colR;
  const k = pz(z);
  const cx = sx(X, z);
  const topY = o.top ?? ZS.shaftY;
  const yb = sy(BASE_Y - 0.1, z - R0 * 0.3);
  const yt = sy(topY, z - R0 * 0.88);
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
    const edge = 1 - Math.abs(u) ** 2.4 * 0.7;
    g.addColorStop((u + 1) / 2, shade(lit(mix(MARB.shade, MARB.body, 0.2), X + n[0] * R0, 6, z + n[2] * R0, n, { key: 0.85, rift: 1.2, fire: 0.4, reach: 3.5 }), (edge - 1) * 0.85));
  }
  fillPath(ctx, shaft, g);
  const sb: Box = { x: cx - rb, y: ytop, w: rb * 2, h: yb - ytop };
  const gleamU = (lx: number, lz: number) => {
    const ll = Math.hypot(lx, lz) || 1;
    const hx = lx / ll + e[0];
    const hz = lz / ll + e[1];
    const hl = Math.hypot(hx, hz) || 1;
    return (hx / hl) * q[0] + (hz / hl) * q[1];
  };
  within(ctx, shaft, () => {
    lay(ctx, drift('#e8ecf8', '#3a3e5c', 3, seed, 24, 64), sb, 0.18);
    lay(ctx, noiseMask(4, seed + 3, { kind: 'web', cover: 0.14, soft: 0.03, col: MARB.vein, w: 40, h: 220 }), sb, 0.22);
    // the flutes: twenty-four round, each a shallow channel in shadow, an arris between each pair catching the light
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
      fg.addColorStop(0, rgba('#10122a', 0.36 * vis));
      fg.addColorStop(0.4, rgba('#10122a', 0.08 * vis));
      fg.addColorStop(0.8, rgba('#10122a', 0));
      fg.addColorStop(1, rgba('#10122a', 0.1 * vis));
      fillPath(ctx, fl, fg);
      const nl = lit('#000000', X + n0[0] * R0, 6, z + n0[2] * R0, n0, { key: 1, rift: 1, fire: 0.6, reach: 4 });
      if (v0 > 0.05) line(ctx, [cx + u0 * rb, yb], [cx + u0 * rTop, ytop], rgba(mix('#ffffff', nl, 0.5), (0.04 + lum(nl) * 0.6) * v0), Math.max(1, rb * 0.022));
    }
    // the gleams: the rift's white on the side turned to the middle, the nearest fire's blue
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
    const toRift = [RIFT_P[0] - X, RIFT_P[2] - z];
    gleam(gleamU(toRift[0], toRift[1]), '#e8eeff', 0.34, 0.1);
    // the rim: the rift's light along the edge turned to the nave
    gleam(X < 0 ? 0.9 : -0.9, '#dce6ff', 0.3 * clamp01(1 - z / 60), 0.06);
    let best = 1e9;
    let bf: V3 = FIRES[0];
    for (const f of FIRES) {
      const d = Math.hypot(f[0] - X, f[2] - z);
      if (d < best) {
        best = d;
        bf = f;
      }
    }
    const near = 1 / (1 + (best / 5) ** 2);
    gleam(gleamU(bf[0] - X, bf[2] - z), '#7ac0ff', 0.35 * near, 0.08);
    // and its light thrown on the lower shaft, on the side turned to it
    if (near > 0.15) {
      const fs = Math.sign(bf[0] - X);
      lightPool(ctx, cx + fs * rb * 0.6, yb - k * 1.2, rb * 1.1, k * 1.6, '#3a88f0', 0.4 * near);
    }
    ctx.restore();
    // weathering: rain stains run down from the capital, darker in the flutes
    streaks(ctx, r, cx, ytop, rb * 1.5, sb.h * 0.55, '#2a2e4a', 0.12, 7);
    // the cylinder's turn into shadow at both edges, over the veins too
    ctx.fillStyle = lin(ctx, [cx - rb, 0], [cx + rb, 0], [[0, 'rgba(14,16,40,0.45)'], [0.18, 'rgba(14,16,40,0.08)'], [0.5, 'rgba(0,0,0,0)'], [0.82, 'rgba(14,16,40,0.1)'], [1, 'rgba(14,16,40,0.5)']]);
    ctx.fillRect(cx - rb, ytop, rb * 2, sb.h);
    // the key's broad soft light on the side turned to it: white marble catching the storm's light
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const ku = gleamU(KEY[0], KEY[2]) * 0.6 - 0.25;
    ctx.fillStyle = lin(ctx, [cx - rb, 0], [cx + rb, 0], [[0, 'rgba(0,0,0,0)'], [clamp01((ku + 1) / 2 - 0.3), 'rgba(0,0,0,0)'], [clamp01((ku + 1) / 2), rgba('#d8ccbc', 0.4)], [clamp01((ku + 1) / 2 + 0.28), 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0)']]);
    ctx.fillRect(cx - rb, ytop, rb * 2, sb.h);
    // the red of Tartarus from the gaps below the platform's edge, on the side turned out to the void, low down
    const out = X < 0 ? -1 : 1;
    const hgt = Math.min(sb.h, k * 6);
    const [rc, rq] = makeCanvas(Math.max(2, Math.ceil(rb * 2)), Math.max(2, Math.ceil(hgt)));
    rq.fillStyle = lin(rq, [out > 0 ? rb * 2 : 0, 0], [rb, 0], [[0, rgba('#c8401a', 0.22)], [1, 'rgba(0,0,0,0)']]);
    rq.fillRect(0, 0, rb * 2, hgt);
    rq.globalCompositeOperation = 'destination-in';
    rq.fillStyle = lin(rq, [0, 0], [0, hgt], [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,1)']]);
    rq.fillRect(0, 0, rb * 2, hgt);
    ctx.drawImage(rc, cx - rb, yb - hgt);
    ctx.restore();
    // the storm's dark overhead, the floor's bounce at the foot
    vfill(ctx, sb.x, sb.y, sb.w, sb.h, [[0, 'rgba(8,10,28,0.3)'], [0.4, 'rgba(8,10,28,0.06)'], [0.85, 'rgba(0,0,0,0)'], [1, rgba('#c8d0f0', 0.1)]]);
    if (o.cracked) {
      crack(ctx, r, cx - rb * 0.2, ytop + sb.h * 0.15, Math.PI / 2 + 0.25, sb.h * 0.5, { col: '#141630', lip: '#e8ecff', w: Math.max(1, k * 0.04), a: 0.7, branch: 0.18 });
    }
  });
  ctx.strokeStyle = 'rgba(14,16,36,0.75)';
  ctx.lineWidth = Math.max(1, k * 0.016);
  ctx.beginPath();
  ctx.moveTo(cx - rb, yb);
  ctx.lineTo(cx - rTop, ytop);
  ctx.moveTo(cx + rb, yb);
  ctx.lineTo(cx + rTop, ytop);
  ctx.stroke();
  // its foot: a square plinth of marble, a fat torus, a gold fillet where the shaft begins
  if (sy(0, z) < TY + 30) {
    const pw = R0 * 1.2;
    const plTop = 0.45;
    const [, pfy] = P(X, 0, z - pw);
    groundShadow(ctx, cx + k * 0.15, pfy + k * 0.05, pw * k * 1.15, k * 0.2, 0.6, '#0e1028');
    const ptop = topAt(X - pw, X + pw, z - pw, z + pw, plTop);
    marble(ctx, ptop, shade(lit(MARB.shade, X, plTop, z, [0, 1, 0], { key: 0.4, rift: 0.5, fire: 0.25, reach: 3 }), -0.12), boxOfPts([P(X - pw, plTop, z + pw), P(X + pw, plTop, z - pw)], 0), seed + 10, 0.2);
    // its edge worn and its top wet: a thin lit arris at the front, darker towards the shaft
    line(ctx, P(X - pw, plTop, z - pw), P(X + pw, plTop, z - pw), rgba('#e8ecff', 0.18), 1);
    const inner = X < 0 ? X + pw : X - pw;
    fillPath(ctx, sideAt(inner, z - pw, z + pw, 0, plTop), lit(MARB.shade, inner, 0.2, z, [X < 0 ? 1 : -1, 0, 0], { key: 0.3, rift: 0.6, fire: 0.3 }));
    const pf = faceAt(X - pw, X + pw, 0, plTop, z - pw);
    const pfb = boxOfPts([P(X - pw, plTop, z - pw), P(X + pw, 0, z - pw)], 0);
    marble(ctx, pf, lit(MARB.shade, X, 0.2, z - pw, [0, 0, -1], { key: 0.45, rift: 0.3, fire: 0.25 }), pfb, seed + 20, 0.25);
    within(ctx, pf, () => vfill(ctx, pfb.x, pfb.y, pfb.w, pfb.h, [[0, 'rgba(255,255,255,0.06)'], [1, 'rgba(14,16,40,0.35)']]));
    strokePath(ctx, pf, 'rgba(14,16,36,0.8)', 1);
    crevice(ctx, pfb.x - 2, pfb.x + pfb.w + 2, pfb.y + pfb.h, 5, 0.55, '#0e1028');
    const ell = (Y: number) => (EH - Y) / z;
    const tr = R0 * 1.2 * k;
    const yLo = sy(0.68, z);
    const yTop = sy(BASE_Y, z);
    const tor = (c: Ctx) => {
      c.beginPath();
      c.ellipse(cx, yLo, tr, tr * ell(0.68), 0, Math.PI, 0, true);
      c.lineTo(cx + rb * 1.04, yTop);
      c.ellipse(cx, yTop, rb * 1.04, rb * 1.04 * ell(BASE_Y), 0, 0, Math.PI, false);
      c.closePath();
    };
    const ryLo = tr * ell(0.68);
    const tb = { x: cx - tr, y: yTop, w: tr * 2, h: yLo + ryLo - yTop };
    groundShadow(ctx, cx + k * 0.1, yLo + ryLo * 0.6, tr * 1.05, ryLo * 0.7, 0.45, '#0e1028');
    marble(ctx, tor, lit(MARB.body, X, 0.6, z - R0, [0, 0.3, -1], { key: 0.5, rift: 0.4, fire: 0.3 }), tb, seed + 30, 0.15);
    within(ctx, tor, () => {
      ctx.fillStyle = lin(ctx, [tb.x, 0], [tb.x + tb.w, 0], [[0, 'rgba(255,255,255,0.12)'], [0.3, 'rgba(0,0,0,0)'], [1, 'rgba(14,16,40,0.45)']]);
      ctx.fillRect(tb.x, tb.y, tb.w, tb.h);
      const gy = ctx.createLinearGradient(0, yTop, 0, yLo + ryLo);
      gy.addColorStop(0, rgba('#0e1028', 0.4));
      gy.addColorStop(0.3, rgba('#ffffff', 0.12));
      gy.addColorStop(0.6, 'rgba(0,0,0,0)');
      gy.addColorStop(1, 'rgba(14,16,40,0.5)');
      ctx.fillStyle = gy;
      ctx.fillRect(tb.x, tb.y, tb.w, tb.h);
    });
    strokePath(ctx, tor, 'rgba(14,16,36,0.7)', Math.max(1, k * 0.014));
    // the gold fillet
    const fy0 = sy(BASE_Y, z - R0 * 0.3);
    const fy1 = sy(BASE_Y + 0.14, z - R0 * 0.3);
    const fil = polyPath([[cx - rb * 1.02, fy0], [cx + rb * 1.02, fy0], [cx + rb * 1.02, fy1], [cx - rb * 1.02, fy1]]);
    goldFill(ctx, fil, { x: cx - rb, y: fy1, w: rb * 2, h: fy0 - fy1 }, X, BASE_Y, z - R0, [0, 0, -1], false, 0.8);
  }
  // a broken top: a jagged fracture, its rough face turned up to the rift's light
  if (o.top !== undefined) {
    // a ragged fracture: low where it gave way, a long shard still standing on the side turned from the blow
    const prof = [0.15, 0.05, 0.3, 0.2, 0.55, 1.6, 1.25, 0.7, 0.45];
    const brk: Pt[] = prof.map((h, i): Pt => [cx + (-1 + i / 4) * rt * 1.02 + (r() - 0.5) * 2, yt - h * rt * (0.8 + r() * 0.3)]);
    const face = polyPath([[cx - rt * 1.02, yt + rt * 0.25], ...brk, [cx + rt * 1.02, yt + rt * 0.25]]);
    fillPath(ctx, face, lin(ctx, [cx, yt - rt * 1.6], [cx, yt + rt * 0.25], [[0, mix(MARB.body, MARB.lit, 0.6)], [0.5, MARB.body], [1, MARB.shade]]));
    within(ctx, face, () => {
      for (let i = 0; i < 10; i++) {
        ctx.fillStyle = rgba(r() < 0.5 ? '#1a1c34' : '#ffffff', 0.12);
        ctx.beginPath();
        ctx.arc(cx + (r() - 0.5) * rt * 1.8, yt - r() * rt * 0.8, 1 + r() * 3, 0, P2);
        ctx.fill();
      }
    });
    strokePath(ctx, face, 'rgba(14,16,36,0.75)', Math.max(1, k * 0.016));
    return;
  }
  // the capital: a gold necking ring, an echinus of marble swelling out with gold egg-and-dart, a square abacus
  if (yt > -30) {
    const [, ny0] = P(X, ZS.shaftY, z - R0 * 0.88);
    const [, ny1] = P(X, ZS.shaftY + 0.16, z - R0 * 0.9);
    const [, ey] = P(X, ZS.shaftY + 0.56, z - R0 * 1.42);
    const neck = polyPath([[cx - rt * 1.03, ny0], [cx + rt * 1.03, ny0], [cx + rt * 1.03, ny1], [cx - rt * 1.03, ny1]]);
    goldFill(ctx, neck, { x: cx - rt, y: ny1, w: rt * 2, h: ny0 - ny1 }, X, ZS.shaftY, z - R0, [0, -0.3, -1], false, 0.9);
    const ew = R0 * 1.32 * k;
    const ech = (c: Ctx) => {
      c.beginPath();
      c.moveTo(cx - rt, ny1);
      c.quadraticCurveTo(cx - ew * 1.02, ny1 - (ny1 - ey) * 0.3, cx - ew, ey);
      c.lineTo(cx + ew, ey);
      c.quadraticCurveTo(cx + ew * 1.02, ny1 - (ny1 - ey) * 0.3, cx + rt, ny1);
      c.closePath();
    };
    const eb = { x: cx - ew, y: ey, w: ew * 2, h: ny1 - ey };
    marble(ctx, ech, lit(MARB.shade, X, ZS.shaftY + 0.3, z - R0, [0, -0.6, -1], { key: 0.3, rift: 0.8, fire: 0.5 }), eb, seed + 40, 0.15);
    within(ctx, ech, () => {
      ctx.fillStyle = lin(ctx, [eb.x, 0], [eb.x + eb.w, 0], [[0, 'rgba(14,16,40,0.4)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(14,16,40,0.45)']]);
      ctx.fillRect(eb.x, eb.y, eb.w, eb.h);
      for (let i = 0; i < 9; i++) {
        const u = -0.88 + (i / 8) * 1.76;
        const ex = cx + u * ew * 0.92;
        const eyy = ey + eb.h * 0.52;
        ctx.fillStyle = rgba(GOLD.body, 0.55 * Math.sqrt(1 - u * u));
        ctx.beginPath();
        ctx.ellipse(ex, eyy, ew * 0.07 * Math.sqrt(1 - u * u), eb.h * 0.28, 0, 0, P2);
        ctx.fill();
        ctx.fillStyle = rgba(GOLD.lit, 0.4 * Math.sqrt(1 - u * u));
        ctx.fillRect(ex - 0.5, eyy - eb.h * 0.2, 1, 1);
      }
    });
    strokePath(ctx, ech, 'rgba(14,16,36,0.7)', 1);
    const aw = R0 * 1.42;
    const ab = faceAt(X - aw, X + aw, ZS.shaftY + 0.56, ZS.capY, z - aw);
    const abb = boxOfPts([P(X - aw, ZS.capY, z - aw), P(X + aw, ZS.shaftY + 0.56, z - aw)], 0);
    fillPath(ctx, topAt(X - aw, X + aw, z - aw, z + aw, ZS.shaftY + 0.56), MARB.deep);
    marble(ctx, ab, lit(MARB.shade, X, ZS.capY - 0.2, z - aw, [0, 0, -1], { key: 0.45, rift: 0.4, fire: 0.3 }), abb, seed + 50, 0.15);
    castShadow(ctx, ab, 5, 5, 0.35, '#0e1028');
    strokePath(ctx, ab, 'rgba(14,16,36,0.75)', 1);
    line(ctx, [abb.x + 2, abb.y + 1], [abb.x + abb.w - 2, abb.y + 1], rgba('#ffffff', 0.25), 1);
  }
}

const colBox = (X: number, z: number): Box => {
  const k = pz(z);
  const cx = sx(X, z);
  // (tight: the third columns are baked apart from the second, the second stay in the live base)
  const pad = ZS.colR * 1.3 * k;
  const x0 = Math.max(0, Math.floor(cx - pad));
  const x1 = Math.min(W, Math.ceil(cx + pad + 8));
  const y1 = Math.min(TY, Math.ceil(sy(0, z) + k * 0.45 + 8));
  return { x: x0, y: 0, w: x1 - x0, h: y1 };
};

function colLayer(ctx: Ctx, r: R, row: number, side: -1 | 1): void {
  const z = ZS.rows[row];
  const X = side * ZS.colX;
  const broken = row === 3 && side > 0;
  column(ctx, r, X, z, 200 + row * 17 + (side > 0 ? 7 : 0), { top: broken ? BROKEN_TOP : undefined, cracked: (row === 4 && side < 0) || (row === 1 && side > 0) });
}

// ——— the entablature still riding the columns, and the cross beam over the throne, broken through ———

const EW = 1.05;
/** A length of the side entablature along z at side s, from za to zb, each end jagged where it's broken. */
function sideBeam(ctx: Ctx, r: R, s: -1 | 1, za: number, zb: number, brokenA: boolean, brokenB: boolean, seed: number): void {
  const Xi = s * (ZS.colX - EW);
  const Xo = s * (ZS.colX + EW);
  const Y0 = ZS.capY;
  // the soffit: we look up at it
  const sof = quad(P(Xi, Y0, za), P(Xo, Y0, za), P(Xo, Y0, zb), P(Xi, Y0, zb));
  fillPath(ctx, sof, lit(MARB.deep, 0, Y0, (za + zb) / 2, [0, -1, 0], { key: 0, rift: 0, fire: 0.6, red: 0.08, reach: 6 }));
  strokePath(ctx, sof, 'rgba(10,12,30,0.6)', 1);
  // the inner face: architrave (three fasciae), frieze (a gold meander), cornice
  const bands: [number, number, string, number][] = [
    [Y0, Y0 + 0.36, MARB.shade, 0],
    [Y0 + 0.36, Y0 + 0.72, MARB.shade, 0.04],
    [Y0 + 0.72, ZS.archY, MARB.shade, 0.08],
    [ZS.archY, ZS.friezeY, MARB.shade, 0.02],
  ];
  const n: V3 = [-s, 0, 0];
  for (const [ya, yb2, col, lift] of bands) {
    const f = sideAt(Xi, za, zb, ya, yb2);
    const fb = boxOfPts([P(Xi, yb2, za), P(Xi, ya, zb)], 0);
    marble(ctx, f, shade(lit(col, Xi, ya, (za + zb) / 2, n, { key: 0.5, rift: 0.9, fire: 0.2 }), lift), fb, seed + ya * 10, 0.2);
    line(ctx, P(Xi, yb2, za), P(Xi, yb2, zb), rgba('#ffffff', 0.18), 1);
  }
  // the frieze's meander, a thread of gold running away along it
  const fy = (ZS.archY + ZS.friezeY) / 2;
  ctx.strokeStyle = rgba(GOLD.body, 0.55);
  ctx.lineWidth = Math.max(1, pz(zb) * 0.05);
  ctx.beginPath();
  const step = 0.55;
  for (let zz = za; zz < zb - step; zz += step) {
    const a = P(Xi, fy - 0.22, zz);
    const b = P(Xi, fy + 0.22, zz);
    const c = P(Xi, fy + 0.22, zz + step * 0.7);
    const d = P(Xi, fy - 0.05, zz + step * 0.7);
    const e = P(Xi, fy - 0.05, zz + step * 0.35);
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.lineTo(c[0], c[1]);
    ctx.lineTo(d[0], d[1]);
    ctx.lineTo(e[0], e[1]);
  }
  ctx.stroke();
  // the cornice: projecting, its underside dark, its face lit
  const Xc = Xi + s * -0.3;
  const cu = quad(P(Xc, ZS.friezeY, za), P(Xi, ZS.friezeY, za), P(Xi, ZS.friezeY, zb), P(Xc, ZS.friezeY, zb));
  fillPath(ctx, cu, MARB.deep);
  const cf = sideAt(Xc, za, zb, ZS.friezeY, ZS.corY);
  marble(ctx, cf, lit(MARB.body, Xc, ZS.corY, (za + zb) / 2, n, { key: 0.55, rift: 1, fire: 0.1 }), boxOfPts([P(Xc, ZS.corY, za), P(Xc, ZS.friezeY, zb)], 0), seed + 99, 0.15);
  line(ctx, P(Xc, ZS.corY, za), P(Xc, ZS.corY, zb), rgba('#ffffff', 0.3), 1);
  strokePath(ctx, sideAt(Xi, za, zb, Y0, ZS.friezeY), 'rgba(10,12,30,0.6)', 1);
  // a broken end: the near face, ragged
  for (const [zz, brk] of [[za, brokenA], [zb, brokenB]] as const) {
    if (!brk) continue;
    const dir = zz === za ? 1 : -1;
    const prof = [0, 0.9, 0.3, 1.5, 0.6, 1.1, 0.2];
    const pts: Pt[] = [P(Xi, Y0, zz + dir * 0.9), P(Xi, ZS.archY, zz + dir * 0.3), P(Xc, ZS.corY, zz + dir * 0.5)];
    for (let i = 0; i < prof.length; i++) {
      const t = i / (prof.length - 1);
      const X = Xc + (Xo - Xc) * t;
      pts.push(P(X, ZS.corY - prof[i] * 0.9, zz + dir * (prof[(i + 2) % prof.length] * 0.8)));
    }
    pts.push(P(Xo, Y0 + 0.8, zz + dir * 0.2), P(Xo - s * 0.4, Y0, zz + dir * 1.1));
    const p = polyPath(pts);
    const bb = boxOfPts(pts, 0);
    fillPath(ctx, p, lit(MARB.shade, Xi, 12, zz, [0, 0.4, -1], { key: 0.6, rift: 0.3 }));
    within(ctx, p, () => {
      // facets of the fracture: lit planes and shadowed ones
      for (let i = 0; i < 6; i++) {
        const a = pts[2 + Math.floor(r() * (pts.length - 3))];
        const b = pts[2 + Math.floor(r() * (pts.length - 3))];
        fillPath(ctx, polyPath([a, b, [(a[0] + b[0]) / 2 + (r() - 0.5) * bb.w * 0.4, bb.y + bb.h * (0.4 + r() * 0.5)]]), r() < 0.5 ? rgba('#f0ece8', 0.22) : rgba('#10102c', 0.3));
      }
      lay(ctx, noiseMask(3, seed + 5, { cover: 0.4, soft: 0.2, col: '#1a1c34' }), bb, 0.25);
    });
    strokePath(ctx, p, 'rgba(10,12,30,0.8)', 1.4);
  }
}

/** The cross beam at the far end (front face at z), from X0 to X1, broken at its inner end. */
function crossBeam(ctx: Ctx, r: R, X0: number, X1: number, z: number, seed: number): void {
  const zf = z - EW;
  const Y0 = ZS.capY;
  const inner = Math.abs(X0) < Math.abs(X1) ? X0 : X1;
  const outer = inner === X0 ? X1 : X0;
  const s = Math.sign(outer);
  // its soffit, then its front: architrave, frieze, cornice
  fillPath(ctx, topAt(Math.min(X0, X1), Math.max(X0, X1), zf, z + EW, Y0), lit(MARB.deep, 0, Y0, z, [0, -1, 0], { key: 0, rift: 0, fire: 0.5, red: 0.06, reach: 8 }));
  // the front, its inner end ragged
  const jag: Pt[] = [];
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    const Y = ZS.corY - t * (ZS.corY - Y0);
    jag.push(P(inner + (r() - 0.5) * 0.5 - s * (i % 2) * 0.35, Y, zf));
  }
  const front = polyPath([P(outer, Y0, zf), P(outer, ZS.corY, zf), ...jag.map((p): Pt => p), P(outer, Y0, zf)]);
  const fb = boxOfPts([P(outer, ZS.corY, zf), P(inner, Y0, zf)], 2);
  marble(ctx, front, lit(MARB.shade, (X0 + X1) / 2, 12, zf, [0, 0, -1], { key: 0.55, rift: 0.2, fire: 0.1 }), fb, seed, 0.2);
  within(ctx, front, () => {
    for (const [Y, a] of [[Y0 + 0.36, 0.2], [Y0 + 0.72, 0.2], [ZS.archY, 0.3], [ZS.friezeY, 0.35]] as const) {
      line(ctx, P(outer, Y, zf), P(inner, Y, zf), rgba('#0e1030', a), 1);
      line(ctx, P(outer, Y + 0.05, zf), P(inner, Y + 0.05, zf), rgba('#ffffff', 0.12), 1);
    }
    // the frieze: a run of gold thunderbolts on the storm-blue ground, our own ornament
    const fy0 = sy(ZS.archY, zf);
    const fy1 = sy(ZS.friezeY, zf);
    const xa = Math.min(sx(outer, zf), sx(inner, zf));
    const xb = Math.max(sx(outer, zf), sx(inner, zf));
    ctx.fillStyle = rgba(LAPIS.body, 0.55);
    ctx.fillRect(xa, fy1 + 2, xb - xa, fy0 - fy1 - 4);
    const k = pz(zf);
    for (let x = xa + k * 0.4; x < xb - k * 0.3; x += k * 0.8) {
      const h = fy0 - fy1 - 6;
      const y = fy1 + 3;
      ctx.fillStyle = rgba(GOLD.body, 0.85);
      ctx.beginPath();
      ctx.moveTo(x + h * 0.12, y);
      ctx.lineTo(x - h * 0.12, y + h * 0.5);
      ctx.lineTo(x + h * 0.04, y + h * 0.5);
      ctx.lineTo(x - h * 0.1, y + h);
      ctx.lineTo(x + h * 0.16, y + h * 0.42);
      ctx.lineTo(x + 0, y + h * 0.42);
      ctx.closePath();
      ctx.fill();
    }
    // the storm's dark from above and the rift's light along its lower edge
    vfill(ctx, fb.x, fb.y, fb.w, fb.h, [[0, 'rgba(8,10,30,0.3)'], [0.8, 'rgba(0,0,0,0)'], [1, rgba('#dce6ff', 0.12)]]);
  });
  strokePath(ctx, front, 'rgba(10,12,30,0.8)', 1);
  line(ctx, P(outer, ZS.corY, zf), P(inner, ZS.corY, zf), rgba('#ffffff', 0.3), 1);
}

// ——— the golden eagles on the last columns ———

/** A golden eagle standing on the cornice at (x, y) (its feet), s px per unit, facing dir (1: right). Our own
 * design: wings half raised, primaries fingered, head turned in, a hooked beak; lit from the rift on its inner side. */
function eagle(ctx: Ctx, x: number, y: number, s: number, dir: 1 | -1): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir * s, s);
  const g = (a: Pt, b: Pt) => {
    const gg = ctx.createLinearGradient(a[0], a[1], b[0], b[1]);
    gg.addColorStop(0, GOLD.white);
    gg.addColorStop(0.25, GOLD.lit);
    gg.addColorStop(0.6, GOLD.body);
    gg.addColorStop(1, GOLD.deep);
    return gg;
  };
  const ink = 'rgba(30,16,4,0.85)';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 1.4 / s;
  // the far wing, behind: raised, darker
  ctx.beginPath();
  ctx.moveTo(-6, -36);
  ctx.bezierCurveTo(-18, -52, -30, -66, -34, -86);
  ctx.lineTo(-27, -80);
  ctx.lineTo(-28, -90);
  ctx.lineTo(-20, -78);
  ctx.lineTo(-18, -88);
  ctx.lineTo(-12, -72);
  ctx.bezierCurveTo(-6, -60, 2, -50, 4, -40);
  ctx.closePath();
  ctx.fillStyle = g([10, -40], [-30, -80]);
  ctx.fill();
  ctx.fillStyle = 'rgba(40,20,6,0.45)';
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.stroke();
  // the tail, fanned down behind the perch
  ctx.beginPath();
  ctx.moveTo(-8, -18);
  ctx.lineTo(-26, 6);
  ctx.lineTo(-20, 8);
  ctx.lineTo(-16, 4);
  ctx.lineTo(-12, 9);
  ctx.lineTo(-4, -10);
  ctx.closePath();
  ctx.fillStyle = g([0, -14], [-20, 8]);
  ctx.fill();
  ctx.stroke();
  // the body: a chest swelling forward, the legs feathered to the talons gripping the cornice's edge
  ctx.beginPath();
  ctx.moveTo(-10, -20);
  ctx.bezierCurveTo(-14, -34, -6, -48, 6, -50);
  ctx.bezierCurveTo(16, -50, 20, -40, 18, -28);
  ctx.bezierCurveTo(16, -14, 8, -4, 4, 0);
  ctx.lineTo(-4, 0);
  ctx.closePath();
  ctx.fillStyle = g([20, -46], [-10, -4]);
  ctx.fill();
  ctx.stroke();
  // breast feathers, scalloped
  ctx.strokeStyle = 'rgba(80,44,10,0.5)';
  ctx.lineWidth = 0.9 / s;
  for (let row = 0; row < 4; row++) {
    for (let i = 0; i < 3; i++) {
      const fx = 4 + i * 4 - row * 1.2;
      const fy = -38 + row * 7 + i * 1.5;
      ctx.beginPath();
      ctx.arc(fx, fy, 2.4, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
  }
  // talons over the edge
  ctx.fillStyle = GOLD.shade;
  for (const tx of [-2, 4, 9]) {
    ctx.beginPath();
    ctx.moveTo(tx - 1.5, -1);
    ctx.quadraticCurveTo(tx + 1, 2, tx + 0.5, 5);
    ctx.lineTo(tx + 2, -1);
    ctx.closePath();
    ctx.fill();
  }
  // the head turned in: a crest of short feathers at the nape, a heavy brow, the hooked beak
  ctx.beginPath();
  ctx.moveTo(4, -48);
  ctx.bezierCurveTo(4, -58, 10, -64, 18, -63);
  ctx.bezierCurveTo(24, -62, 27, -58, 28, -55);
  ctx.bezierCurveTo(32, -55, 34, -52, 32, -48);
  ctx.quadraticCurveTo(30, -50, 27, -50);
  ctx.bezierCurveTo(24, -48, 20, -46, 16, -44);
  ctx.closePath();
  ctx.lineWidth = 1.4 / s;
  ctx.strokeStyle = ink;
  ctx.fillStyle = g([22, -64], [8, -44]);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(30,16,4,0.9)';
  ctx.beginPath();
  ctx.arc(20, -57, 1.3, 0, P2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(30,16,4,0.7)';
  ctx.beginPath();
  ctx.moveTo(15, -59.5);
  ctx.lineTo(23, -58.5);
  ctx.stroke();
  // the near wing: half raised and spread, the primaries fingered at its tip, the coverts in rows
  ctx.beginPath();
  ctx.moveTo(-4, -40);
  ctx.bezierCurveTo(-12, -48, -16, -62, -14, -80);
  ctx.lineTo(-9, -74);
  ctx.lineTo(-7, -92);
  ctx.lineTo(-2, -78);
  ctx.lineTo(2, -94);
  ctx.lineTo(5, -78);
  ctx.lineTo(10, -90);
  ctx.lineTo(11, -74);
  ctx.bezierCurveTo(12, -60, 8, -44, 0, -26);
  ctx.closePath();
  ctx.lineWidth = 1.4 / s;
  ctx.strokeStyle = ink;
  ctx.fillStyle = g([12, -80], [-8, -30]);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(80,44,10,0.55)';
  ctx.lineWidth = 0.8 / s;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-8 + i * 1.5, -46 - i * 7);
    ctx.quadraticCurveTo(0, -50 - i * 7, 8 - i * 0.5, -48 - i * 8);
    ctx.stroke();
  }
  // the rim: the rift's light along its top edges
  ctx.strokeStyle = rgba('#fff6d8', 0.7);
  ctx.lineWidth = 1.2 / s;
  ctx.beginPath();
  ctx.moveTo(-14, -80);
  ctx.lineTo(-7, -92);
  ctx.moveTo(2, -94);
  ctx.lineTo(10, -90);
  ctx.moveTo(10, -63);
  ctx.quadraticCurveTo(20, -66, 28, -55);
  ctx.stroke();
  ctx.restore();
}

/** Where the eagles stand (on the cornice over the last columns: screen x, y of their feet, scale). */
const EAGLES = ([-1, 1] as const).map((s) => {
  const z = ZS.rows[4];
  const [x, y] = P(s * (ZS.colX - 0.2), ZS.corY, z - 0.5);
  return { x, y: y + 1, s: pz(z) * 0.038, dir: (s < 0 ? 1 : -1) as 1 | -1 };
});

/** The entablature pieces and the eagles: the left side's long run, the right's stubs, the cross beam. */
export const BEAMS_BOX: Box = { x: 470, y: 0, w: 840, h: 230 };
function beams(ctx: Ctx, r: R): void {
  sideBeam(ctx, r, -1, 26.2, 41.2, true, false, 300);
  sideBeam(ctx, r, 1, 37.4, 41.2, true, false, 310);
  crossBeam(ctx, r, -ZS.colX - EW, -4.9, ZS.rows[4] + 1.2, 320);
  crossBeam(ctx, r, 5.1, ZS.colX + EW, ZS.rows[4] + 1.2, 330);
  for (const e of EAGLES) {
    groundShadow(ctx, e.x, e.y - 1, 16 * e.s * 20 * 0.06, 3, 0.4, '#0e1028');
    eagle(ctx, e.x, e.y, e.s, e.dir);
  }
}
/** The right colonnade's near run (over the second and third columns), in two pieces either side of the storm's
 * slot's edge. */
const NEAR_BEAMS_A: Box = { x: 1300, y: 0, w: 155, h: 140 };
const NEAR_BEAMS_B: Box = { x: 1455, y: 0, w: 215, h: 140 };
function nearBeams(ctx: Ctx, clip: Box): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(clip.x, clip.y, clip.w, clip.h);
  ctx.clip();
  sideBeam(ctx, rng(hashStr('zs:nearBeams')), 1, 12.4, 27.6, false, true, 340);
  ctx.restore();
}

// ——— the dais and the throne ———

const T0 = ZS.throne;
const SEAT = { hw: 3.4, z0: T0.z, z1: T0.z + 3.4, top: TOP_Y + 2.6 };
const ARM = { w: 1.05, z0: T0.z - 0.2, top: SEAT.top + 2.1 };
const BACK = { hw: 3.8, z0: SEAT.z1, z1: SEAT.z1 + 0.7, top: 15.6 };

/** A marble face of the throne or dais: lit by the key from the front, with the depth of the stone. */
function face(ctx: Ctx, path: (c: Ctx) => void, b: Box, X: number, Y: number, z: number, n: V3, seed: number, o: { base?: string; key?: number; rift?: number } = {}): void {
  marble(ctx, path, lit(o.base ?? MARB.shade, X, Y, z, n, { key: o.key ?? 0.6, rift: o.rift ?? 0.5, fire: 0.25, reach: 6 }), b, seed, 0.2);
}

/** A gold eagle's head (an arm's end) in profile, looking out (dir), s px a unit: the neck's ruff, the heavy brow,
 * the hooked beak. */
function eagleHead(ctx: Ctx, x: number, y: number, s: number, dir: 1 | -1): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * dir, s);
  ctx.lineJoin = 'round';
  ctx.lineWidth = 1.2 / s;
  const g = ctx.createLinearGradient(0, -1.2, 0, 1);
  g.addColorStop(0, GOLD.white);
  g.addColorStop(0.3, GOLD.lit);
  g.addColorStop(0.7, GOLD.body);
  g.addColorStop(1, GOLD.shade);
  // the neck rising from the arm, the head, the beak hooked down and out
  ctx.beginPath();
  ctx.moveTo(-0.7, 1);
  ctx.bezierCurveTo(-0.9, 0.2, -0.8, -0.8, -0.1, -1.0);
  ctx.bezierCurveTo(0.4, -1.1, 0.8, -0.85, 0.95, -0.55);
  ctx.bezierCurveTo(1.35, -0.5, 1.5, -0.2, 1.3, 0.12);
  ctx.quadraticCurveTo(1.15, -0.1, 0.9, -0.05);
  ctx.bezierCurveTo(0.6, 0.1, 0.5, 0.4, 0.6, 1);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(30,16,4,0.85)';
  ctx.stroke();
  // the eye under its brow, the gape
  ctx.fillStyle = 'rgba(30,16,4,0.9)';
  ctx.beginPath();
  ctx.arc(0.45, -0.55, 0.09, 0, P2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(30,16,4,0.7)';
  ctx.beginPath();
  ctx.moveTo(0.2, -0.7);
  ctx.lineTo(0.7, -0.68);
  ctx.moveTo(0.85, -0.32);
  ctx.lineTo(1.15, -0.3);
  ctx.stroke();
  // ruff feathers down the neck
  ctx.strokeStyle = 'rgba(80,44,10,0.5)';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(-0.2 + (i % 2) * 0.3, 0.1 + i * 0.22, 0.18, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  ctx.restore();
}

/** Our thunderbolt: a zigzag of three strokes with forked ends, gold, at (x, y), h px tall. */
function thunderbolt(ctx: Ctx, x: number, y: number, h: number, fill: string, ink: string): void {
  const w = h * 0.32;
  const pts: Pt[] = [
    [x + w * 0.35, y - h * 0.5],
    [x - w * 0.45, y + h * 0.04],
    [x - w * 0.02, y + h * 0.04],
    [x - w * 0.42, y + h * 0.5],
    [x + w * 0.5, y - h * 0.1],
    [x + w * 0.06, y - h * 0.1],
    [x + w * 0.62, y - h * 0.5],
  ];
  fillPath(ctx, polyPath(pts), fill);
  strokePath(ctx, polyPath(pts), ink, Math.max(1, h * 0.03));
}

export const THRONE_BOX: Box = (() => {
  const b = boxOfPts([P(-DA.hw - 0.3, 0, DA.z0), P(DA.hw + 0.3, 0, DA.z0), P(-BACK.hw, BACK.top + 3.4, BACK.z0), P(BACK.hw, BACK.top + 3.4, BACK.z0)], 30);
  return { x: b.x - 60, y: b.y, w: b.w + 120, h: b.h + 10 };
})();

function throne(ctx: Ctx): void {
  // the dais: three steps of white marble, a gold nosing on each
  const [dx0, dy0] = P(-DA.hw, 0, DA.z0);
  const [dx1] = P(DA.hw, 0, DA.z0);
  groundShadow(ctx, (dx0 + dx1) / 2 + 20, dy0 + 3, (dx1 - dx0) * 0.58, 14, 0.55, '#0e1028');
  crevice(ctx, dx0 - 6, dx1 + 6, dy0 + 1, 7, 0.65, '#0e1028');
  for (let i = 0; i < DA.n; i++) {
    const hw = DA.hw - i * 0.4;
    const z0 = stepZ(i);
    const z1 = i === DA.n - 1 ? DA.back : stepZ(i + 1);
    const Y0 = i * DA.rise;
    const Y1 = (i + 1) * DA.rise;
    const top = topAt(-hw, hw, z0, z1, Y1);
    const tb = boxOfPts([P(-hw, Y1, z1), P(hw, Y1, z0)], 0);
    face(ctx, top, tb, 0, Y1, (z0 + z1) / 2, [0, 1, 0], 400 + i, { base: MARB.body, key: 0.4, rift: 0.9 });
    within(ctx, top, () => vfill(ctx, tb.x, tb.y, tb.w, tb.h, [[0, rgba('#e8eeff', 0.12)], [1, 'rgba(0,0,0,0)']]));
    const fr = faceAt(-hw, hw, Y0, Y1, z0);
    const fb = boxOfPts([P(-hw, Y1, z0), P(hw, Y0, z0)], 0);
    face(ctx, fr, fb, 0, (Y0 + Y1) / 2, z0, [0, 0, -1], 410 + i, { key: 0.55, rift: 0 });
    within(ctx, fr, () => vfill(ctx, fb.x, fb.y, fb.w, fb.h, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(14,16,40,0.35)']]));
    // the gold nosing
    const no = faceAt(-hw, hw, Y1 - 0.08, Y1, z0);
    goldFill(ctx, no, boxOfPts([P(-hw, Y1, z0), P(hw, Y1 - 0.08, z0)], 0), 0, Y1, z0, [0, 0.5, -1], false, 0.8);
    strokePath(ctx, fr, 'rgba(14,16,36,0.7)', 1);
    crevice(ctx, fb.x, fb.x + fb.w, fb.y + fb.h, 4, 0.5, '#0e1028');
  }
  // the seat's shadow on the dais top
  const [sx0, sy0] = P(-SEAT.hw - ARM.w, TOP_Y, SEAT.z0);
  const [sx1] = P(SEAT.hw + ARM.w, TOP_Y, SEAT.z0);
  groundShadow(ctx, (sx0 + sx1) / 2 + 8, sy0 + 2, (sx1 - sx0) * 0.6, 6, 0.6, '#0e1028');

  // the back: a tall slab, a gold frame round a lapis panel, the thunderbolt inlaid
  const bk = (c: Ctx) => {
    const [ax, ay] = P(-BACK.hw, SEAT.top, BACK.z0);
    const [bx, by] = P(BACK.hw, SEAT.top, BACK.z0);
    const [, ty] = P(0, BACK.top, BACK.z0);
    const [, sh] = P(0, BACK.top - 1.6, BACK.z0);
    c.beginPath();
    c.moveTo(ax, ay);
    c.lineTo(ax, sh);
    c.quadraticCurveTo(ax, ty, (ax + bx) / 2, ty - 6);
    c.quadraticCurveTo(bx, ty, bx, sh);
    c.lineTo(bx, by);
    c.closePath();
  };
  const bb = boxOfPts([P(-BACK.hw, BACK.top, BACK.z0), P(BACK.hw, SEAT.top, BACK.z0)], 8);
  castShadow(ctx, bk, 10, 10, 0.25, '#0e1028');
  face(ctx, bk, bb, 0, 8, BACK.z0, [0, 0, -1], 420, { key: 0.6, rift: 0 });
  within(ctx, bk, () => {
    // the rift's light behind it spilling round its edges; dark down its middle
    ctx.fillStyle = lin(ctx, [bb.x, 0], [bb.x + bb.w, 0], [[0, rgba('#c8d4ff', 0.18)], [0.12, 'rgba(0,0,0,0)'], [0.88, 'rgba(0,0,0,0)'], [1, rgba('#c8d4ff', 0.12)]]);
    ctx.fillRect(bb.x, bb.y, bb.w, bb.h);
    vfill(ctx, bb.x, bb.y, bb.w, bb.h, [[0, rgba('#dce6ff', 0.15)], [0.15, 'rgba(0,0,0,0)'], [1, 'rgba(14,16,40,0.25)']]);
  });
  // a gold moulding round its edge, gold palmettes at its shoulders
  strokePath(ctx, bk, rgba(GOLD.body, 0.85), 2.4);
  strokePath(ctx, bk, 'rgba(30,16,4,0.7)', 1);
  for (const d of [-1, 1]) {
    const [px, py] = P(d * BACK.hw, BACK.top - 1.6, BACK.z0);
    const ps = pz(BACK.z0) * 0.5;
    ctx.fillStyle = lin(ctx, [px, py - ps * 1.6], [px, py], [[0, GOLD.lit], [1, GOLD.shade]]);
    ctx.beginPath();
    ctx.moveTo(px - ps * 0.5, py);
    for (let i = 0; i <= 4; i++) {
      const a = Math.PI + (i / 4) * Math.PI;
      ctx.quadraticCurveTo(px + Math.cos(a - 0.4) * ps * 0.9, py - ps * 0.6 + Math.sin(a - 0.4) * ps * 1.2, px + Math.cos(a) * ps * 0.7, py - ps * 0.6 + Math.sin(a) * ps * 1.1);
    }
    ctx.lineTo(px + ps * 0.5, py);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,16,4,0.8)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // a gold fillet round a sunk panel of the same white marble, carved with rays of storm-light bursting from the
  // thunderbolt, every other ray inlaid with gold
  const pn = (inset: number) => {
    const [ax, ay] = P(-BACK.hw + inset, SEAT.top + 0.5 + inset * 0.4, BACK.z0);
    const [bx] = P(BACK.hw - inset, SEAT.top, BACK.z0);
    const [, ty] = P(0, BACK.top - 0.7 - inset, BACK.z0);
    const [, sh] = P(0, BACK.top - 2.1 - inset, BACK.z0);
    return (c: Ctx) => {
      c.beginPath();
      c.moveTo(ax, ay);
      c.lineTo(ax, sh);
      c.quadraticCurveTo(ax, ty, (ax + bx) / 2, ty - 4);
      c.quadraticCurveTo(bx, ty, bx, sh);
      c.lineTo(bx, ay);
      c.closePath();
    };
  };
  const frame = pn(0.4);
  const panel = pn(0.66);
  goldFill(ctx, frame, bb, 0, 8, BACK.z0, [0, 0.3, -1], true, 0.8);
  strokePath(ctx, frame, 'rgba(30,16,4,0.8)', 1.2);
  const [ex, ey] = P(0, (SEAT.top + BACK.top) / 2 + 0.4, BACK.z0);
  const pk = pz(BACK.z0);
  face(ctx, panel, bb, 0, 8, BACK.z0 + 0.15, [0, 0, -1], 425, { key: 0.5, rift: 0 });
  within(ctx, panel, () => {
    // sunk: shadow under its upper and left edges, its lower inner edge lit
    ctx.save();
    ctx.translate(3, 4);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.lineWidth = 7;
    ctx.strokeStyle = 'rgba(16,14,44,0.35)';
    panel(ctx);
    ctx.stroke();
    ctx.restore();
    // the rays: sixteen round the bolt, carved grooves between gold inlay
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * P2 + 0.09;
      const L = pk * 9;
      const w0 = 0.08;
      const pts: Pt[] = [[ex + Math.cos(a - w0) * pk * 1.3, ey + Math.sin(a - w0) * pk * 1.3], [ex + Math.cos(a) * L, ey + Math.sin(a) * L], [ex + Math.cos(a + w0) * pk * 1.3, ey + Math.sin(a + w0) * pk * 1.3]];
      if (i % 2) {
        fillPath(ctx, polyPath(pts), lin(ctx, [ex, ey], [ex + Math.cos(a) * L * 0.5, ey + Math.sin(a) * L * 0.5], [[0, GOLD.lit], [0.5, GOLD.body], [1, GOLD.shade]]));
      } else {
        fillPath(ctx, polyPath(pts), 'rgba(20,18,50,0.2)');
        line(ctx, pts[0], pts[1], 'rgba(255,250,240,0.3)', 1);
      }
    }
    // a carved roundel of cloud round the bolt, its lip catching the light
    ctx.fillStyle = lit(MARB.body, 0, 9, BACK.z0, [0, 0.2, -1], { key: 0.6, rift: 0 });
    ctx.beginPath();
    ctx.ellipse(ex, ey, pk * 1.45, pk * 2.05, 0, 0, P2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(20,18,50,0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = rgba(GOLD.body, 0.85);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(ex, ey, pk * 1.32, pk * 1.92, 0, 0, P2);
    ctx.stroke();
    vfill(ctx, bb.x, bb.y, bb.w, bb.h, [[0, 'rgba(255,255,255,0.04)'], [1, 'rgba(20,18,50,0.25)']]);
  });
  strokePath(ctx, panel, 'rgba(30,16,4,0.6)', 1);
  thunderbolt(ctx, ex, ey, pk * 3.4, GOLD.body, 'rgba(30,16,4,0.85)');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  thunderbolt(ctx, ex - 1.5, ey - 1.5, pk * 3.4, rgba(GOLD.white, 0.4), 'rgba(0,0,0,0)');
  ctx.restore();
  // the crest: a gold eagle standing on the back's top, wings half raised, in the rift's light
  const [cx, cy] = P(0, BACK.top - 0.15, BACK.z0 + 0.3);
  const cs = pk * 0.042;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  lightPool(ctx, cx, cy - 46 * cs, 90 * cs, 70 * cs, '#c8d8ff', 0.22);
  ctx.restore();
  groundShadow(ctx, cx + 4, cy, 22 * cs, 4 * cs, 0.5, '#0e1028');
  eagle(ctx, cx + 4 * cs, cy, cs, -1);

  // the seat: a block of marble, a gold-framed panel on its front, gold claws at its feet; a storm-blue cushion
  const sf = faceAt(-SEAT.hw, SEAT.hw, TOP_Y, SEAT.top, SEAT.z0);
  const sfb = boxOfPts([P(-SEAT.hw, SEAT.top, SEAT.z0), P(SEAT.hw, TOP_Y, SEAT.z0)], 0);
  face(ctx, sf, sfb, 0, 2.4, SEAT.z0, [0, 0, -1], 440, { key: 0.6, rift: 0 });
  within(ctx, sf, () => vfill(ctx, sfb.x, sfb.y, sfb.w, sfb.h, [[0, 'rgba(255,255,255,0.05)'], [1, 'rgba(14,16,40,0.4)']]));
  const sp = faceAt(-SEAT.hw + 0.4, SEAT.hw - 0.4, TOP_Y + 0.35, SEAT.top - 0.45, SEAT.z0);
  strokePath(ctx, sp, rgba(GOLD.body, 0.8), 1.6);
  // a small gold thunderbolt in the panel's middle, a gold laurel either side
  const [pcx, pcy] = P(0, (TOP_Y + SEAT.top) / 2, SEAT.z0);
  thunderbolt(ctx, pcx, pcy, pz(SEAT.z0) * 1.1, GOLD.body, 'rgba(30,16,4,0.8)');
  for (const d of [-1, 1]) {
    ctx.strokeStyle = rgba(GOLD.body, 0.7);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(pcx + d * 12, pcy + 10);
    ctx.quadraticCurveTo(pcx + d * 34, pcy + 6, pcx + d * 46, pcy - 8);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const lx = pcx + d * (18 + i * 8);
      const ly = pcy + 8 - i * 4.5;
      ctx.fillStyle = rgba(GOLD.body, 0.75);
      ctx.beginPath();
      ctx.ellipse(lx, ly - 3, 1.8, 3.6, d * 0.6, 0, P2);
      ctx.fill();
    }
  }
  strokePath(ctx, sf, 'rgba(14,16,36,0.8)', 1.2);
  const cu = topAt(-SEAT.hw, SEAT.hw, SEAT.z0, SEAT.z1, SEAT.top);
  const cb = boxOfPts([P(-SEAT.hw, SEAT.top, SEAT.z1), P(SEAT.hw, SEAT.top, SEAT.z0)], 0);
  const cush = (c: Ctx) => {
    const [ax, ay] = P(-SEAT.hw + 0.1, SEAT.top, SEAT.z0 + 0.1);
    const [bx] = P(SEAT.hw - 0.1, SEAT.top, SEAT.z0 + 0.1);
    const [, by] = P(0, SEAT.top + 0.45, SEAT.z0 + 1.4);
    c.beginPath();
    c.moveTo(ax, ay + 2);
    c.quadraticCurveTo(ax - 2, by, (ax + bx) / 2, by - 2);
    c.quadraticCurveTo(bx + 2, by, bx, ay + 2);
    c.quadraticCurveTo((ax + bx) / 2, ay + 6, ax, ay + 2);
    c.closePath();
  };
  fillPath(ctx, cu, MARB.shade);
  void cb;
  const kb = boxOfPts([P(-SEAT.hw, SEAT.top + 0.5, SEAT.z0), P(SEAT.hw, SEAT.top, SEAT.z0)], 4);
  fillPath(ctx, cush, lin(ctx, [0, kb.y], [0, kb.y + kb.h], [[0, '#5a78c8'], [0.5, '#24387a'], [1, '#10183a']]));
  strokePath(ctx, cush, 'rgba(10,10,30,0.85)', 1.1);
  // its gold tassels at the corners
  for (const d of [-1, 1]) {
    const [tx, ty] = P(d * (SEAT.hw - 0.15), SEAT.top - 0.1, SEAT.z0);
    ctx.strokeStyle = GOLD.body;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx, ty + 9);
    ctx.stroke();
    ctx.fillStyle = GOLD.lit;
    ctx.beginPath();
    ctx.ellipse(tx, ty + 10, 2, 3.4, 0, 0, P2);
    ctx.fill();
  }
  // the arms: marble blocks, their inner faces turned to us, gold eagles' heads at their ends
  for (const d of [-1, 1] as const) {
    const Xi = d * SEAT.hw;
    const Xo = d * (SEAT.hw + ARM.w);
    const inner = sideAt(Xi, ARM.z0, SEAT.z1, SEAT.top, ARM.top);
    face(ctx, inner, boxOfPts([P(Xi, ARM.top, ARM.z0), P(Xi, SEAT.top, SEAT.z1)], 0), Xi, 4.5, (ARM.z0 + SEAT.z1) / 2, [-d, 0, 0], 450 + d, { key: 0.4, rift: 0.4 });
    strokePath(ctx, inner, 'rgba(14,16,36,0.7)', 1);
    const fr = faceAt(Math.min(Xi, Xo), Math.max(Xi, Xo), TOP_Y, ARM.top, ARM.z0);
    const frb = boxOfPts([P(Xi, ARM.top, ARM.z0), P(Xo, TOP_Y, ARM.z0)], 0);
    face(ctx, fr, frb, Xo, 3, ARM.z0, [0, 0, -1], 460 + d, { key: 0.65, rift: 0 });
    within(ctx, fr, () => vfill(ctx, frb.x, frb.y, frb.w, frb.h, [[0, 'rgba(255,255,255,0.06)'], [1, 'rgba(14,16,40,0.4)']]));
    strokePath(ctx, fr, 'rgba(14,16,36,0.8)', 1.1);
    // a gold claw foot
    const [fx, fy] = P((Xi + Xo) / 2, TOP_Y, ARM.z0 - 0.1);
    ctx.fillStyle = lin(ctx, [fx, fy - 8], [fx, fy], [[0, GOLD.lit], [1, GOLD.shade]]);
    for (let t = -1; t <= 1; t++) {
      ctx.beginPath();
      ctx.ellipse(fx + t * 5, fy - 2, 3, 4, 0, Math.PI, 0);
      ctx.fill();
    }
    // the eagle's head at the arm's end
    const [hx, hy] = P((Xi + Xo) / 2, ARM.top + 0.2, ARM.z0 - 0.2);
    eagleHead(ctx, hx - d * 5, hy + 2, pz(ARM.z0) * 0.55, d);
  }
}

// ——— the other Olympians' thrones ———

/** A lesser throne at the back (X, seat front z), its back panel painted by `panel` in screen space. */
function lesserThrone(ctx: Ctx, r: R, X: number, z: number, seed: number, panelCol: string, panel: (b: Box) => void, broken = false, Y0 = TOP_Y): void {
  const hw = 1.25;
  const seatTop = Y0 + 1.8;
  const top = Y0 + 6.4;
  const zb = z + 1.5;
  const [gx, gy] = P(X, Y0, z);
  groundShadow(ctx, gx + 6, gy + 2, hw * pz(z) * 1.4, 5, 0.5, '#0e1028');
  const bk = (c: Ctx) => {
    const [ax, ay] = P(X - hw, seatTop, zb);
    const [bx] = P(X + hw, seatTop, zb);
    const [, ty] = P(X, top, zb);
    const [, sh] = P(X, top - 1.2, zb);
    c.beginPath();
    c.moveTo(ax, ay);
    c.lineTo(ax, sh);
    if (broken) {
      // its top left corner broken away
      c.lineTo(ax + (bx - ax) * 0.18, sh - 4);
      c.lineTo(ax + (bx - ax) * 0.3, sh + 6);
      c.lineTo(ax + (bx - ax) * 0.42, ty + 2);
    } else c.quadraticCurveTo(ax, ty, (ax + bx) / 2, ty - 3);
    c.quadraticCurveTo(bx, ty, bx, sh);
    c.lineTo(bx, ay);
    c.closePath();
  };
  const bb = boxOfPts([P(X - hw, top, zb), P(X + hw, seatTop, zb)], 6);
  face(ctx, bk, bb, X, 4, zb, [0, 0, -1], seed, { key: 0.5, rift: 0 });
  // its panel (dimmed: the fight's own trident, helm and gems are the ones that must read)
  const ins = boxOfPts([P(X - hw + 0.35, top - 0.9, zb), P(X + hw - 0.35, seatTop + 0.4, zb)], 0);
  ctx.fillStyle = panelCol;
  ctx.fillRect(ins.x, ins.y, ins.w, ins.h);
  ctx.strokeStyle = rgba(GOLD.body, 0.7);
  ctx.lineWidth = 1.2;
  ctx.strokeRect(ins.x, ins.y, ins.w, ins.h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(ins.x, ins.y, ins.w, ins.h);
  ctx.clip();
  panel(ins);
  ctx.fillStyle = 'rgba(40,40,72,0.42)';
  ctx.fillRect(ins.x, ins.y, ins.w, ins.h);
  ctx.restore();
  if (broken) {
    // the crack running down from the break, through the panel
    const [ax] = P(X - hw, 0, zb);
    crack(ctx, r, ax + bb.w * 0.32, bb.y + 14, Math.PI / 2 + 0.35, bb.h * 0.75, { col: '#141630', lip: '#e8ecff', w: 1.4, a: 0.75, branch: 0.1 });
  }
  strokePath(ctx, bk, 'rgba(14,16,36,0.8)', 1.1);
  // the seat block
  const sf = faceAt(X - hw, X + hw, Y0, seatTop, z);
  const sfb = boxOfPts([P(X - hw, seatTop, z), P(X + hw, Y0, z)], 0);
  fillPath(ctx, topAt(X - hw, X + hw, z, zb, seatTop), MARB.shade);
  face(ctx, sf, sfb, X, Y0 + 1, z, [0, 0, -1], seed + 1, { key: 0.6, rift: 0 });
  within(ctx, sf, () => vfill(ctx, sfb.x, sfb.y, sfb.w, sfb.h, [[0, 'rgba(255,255,255,0.05)'], [1, 'rgba(14,16,40,0.45)']]));
  line(ctx, P(X - hw, seatTop - 0.1, z), P(X + hw, seatTop - 0.1, z), rgba(GOLD.body, 0.7), 1.4);
  strokePath(ctx, sf, 'rgba(14,16,36,0.8)', 1.1);
}

export const COUNCIL_BOX = (s: -1 | 1): Box => {
  const X = s * ZS.council.X;
  const b = boxOfPts([P(X - 1.6, TOP_Y + 6.8, ZS.council.z + 1.5), P(X + 1.6, TOP_Y - 0.2, ZS.council.z)], 10);
  return s < 0 ? { x: b.x - 30, y: b.y, w: b.w + 30, h: b.h + 4 } : b;
};

function council(ctx: Ctx, r: R, s: -1 | 1): void {
  const X = s * ZS.council.X;
  const z = ZS.council.z;
  if (s < 0) {
    // the sea god's: sea-green, three wave-crests rising to the tines of a trident; cracked through, its corner fallen
    lesserThrone(ctx, r, X, z, 500, '#1a4a50', (b) => {
      lay(ctx, drift('#2a6a6a', '#0a2428', 3, 503, 30, 60), b, 0.6);
      const cx = b.x + b.w / 2;
      ctx.strokeStyle = rgba(GOLD.body, 0.75);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, b.y + b.h - 3);
      ctx.lineTo(cx, b.y + b.h * 0.3);
      for (const d of [-1, 0, 1]) {
        const tx = cx + d * b.w * 0.24;
        ctx.moveTo(tx, b.y + b.h * 0.42);
        ctx.quadraticCurveTo(tx + d * 3 - 3, b.y + b.h * 0.24, tx + 2, b.y + 4);
      }
      ctx.moveTo(cx - b.w * 0.24, b.y + b.h * 0.42);
      ctx.quadraticCurveTo(cx, b.y + b.h * 0.52, cx + b.w * 0.24, b.y + b.h * 0.42);
      ctx.stroke();
      // the waves at its foot
      ctx.lineWidth = 1;
      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        for (let x = b.x; x <= b.x + b.w; x += 2) {
          const y = b.y + b.h * (0.78 + i * 0.1) + Math.sin((x - b.x) * 0.45) * 2;
          if (x === b.x) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }, true);
    // the corner that broke off, lying at its foot
    rubbleAt(ctx, r, X - 1.6, TOP_Y, z - 0.6, 0.5);
    rubbleAt(ctx, r, X - 0.7, TOP_Y, z - 1.1, 0.22);
  } else {
    // the queen's: a fan of peacock eyes in gold and turquoise
    lesserThrone(ctx, r, X, z, 520, '#122a3a', (b) => {
      lay(ctx, drift('#1a4a5a', '#081420', 3, 523, 30, 60), b, 0.5);
      const cx = b.x + b.w / 2;
      const by = b.y + b.h - 2;
      const R1 = b.h * 0.82;
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + (i - 3) * 0.32;
        ctx.strokeStyle = rgba(GOLD.body, 0.5);
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(cx, by);
        ctx.lineTo(cx + Math.cos(a) * R1, by + Math.sin(a) * R1);
        ctx.stroke();
        const ex = cx + Math.cos(a) * R1 * 0.78;
        const ey = by + Math.sin(a) * R1 * 0.78;
        ctx.fillStyle = rgba('#2ab0a0', 0.8);
        ctx.beginPath();
        ctx.ellipse(ex, ey, 3.4, 4.6, a + Math.PI / 2, 0, P2);
        ctx.fill();
        ctx.fillStyle = rgba(GOLD.lit, 0.85);
        ctx.beginPath();
        ctx.ellipse(ex, ey, 1.9, 2.6, a + Math.PI / 2, 0, P2);
        ctx.fill();
        ctx.fillStyle = rgba('#10204a', 0.95);
        ctx.beginPath();
        ctx.arc(ex, ey, 1.1, 0, P2);
        ctx.fill();
      }
    });
  }
}

/** The war god's throne, on the floor by the left colonnade, cracked: a war-helm of our own on a blood-red panel, its
 * crest a fan of bronze blades. */
const ARES = { X: -9.2, z: 36.2 };
export const ARES_BOX: Box = (() => {
  const { X, z } = ARES;
  return boxOfPts([P(X - 1.8, 6.9, z + 1.5), P(X + 1.8, -0.3, z)], 12);
})();
function aresThrone(ctx: Ctx, r: R): void {
  lesserThrone(ctx, r, ARES.X, ARES.z, 540, '#3a1210', (b) => {
    lay(ctx, drift('#5a1a14', '#1a0606', 3, 543, 30, 60), b, 0.5);
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h * 0.56;
    const hr = b.w * 0.26;
    ctx.strokeStyle = rgba(GOLD.body, 0.6);
    ctx.fillStyle = rgba(GOLD.shade, 0.45);
    ctx.lineWidth = 1.2;
    // the bowl of the helm, its cheek-guards, the eye-slot
    ctx.beginPath();
    ctx.moveTo(cx - hr, cy + hr * 0.9);
    ctx.lineTo(cx - hr, cy - hr * 0.1);
    ctx.quadraticCurveTo(cx - hr, cy - hr, cx, cy - hr);
    ctx.quadraticCurveTo(cx + hr, cy - hr, cx + hr, cy - hr * 0.1);
    ctx.lineTo(cx + hr, cy + hr * 0.9);
    ctx.lineTo(cx + hr * 0.3, cy + hr * 0.5);
    ctx.lineTo(cx + hr * 0.3, cy + hr * 0.05);
    ctx.lineTo(cx - hr * 0.3, cy + hr * 0.05);
    ctx.lineTo(cx - hr * 0.3, cy + hr * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // its crest: a fan of blades
    for (let i = -3; i <= 3; i++) {
      const a = -Math.PI / 2 + i * 0.22;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * hr * 0.9, cy - hr * 0.6 + Math.sin(a) * hr * 0.3);
      ctx.lineTo(cx + Math.cos(a) * hr * 2.1, cy - hr * 0.6 + Math.sin(a) * hr * 1.3);
      ctx.stroke();
    }
  }, true, 0);
  rubble(ctx, r, ARES.X - 1.4, ARES.z - 0.5, 0.45);
}

// ——— the braziers: gold tripods, their bowls of blue lightning-fire ———

const BOWL_R = 0.78;
const BOWL_LO = 1.25;
export const BRAZIER_BOX = (i: number): Box => {
  const [X, z] = ZS.braziers[i];
  return boxOfPts([P(X - 1.3, ZS.brazierY + 0.3, z), P(X + 1.3, -0.3, z)], 12);
};
/** The top of a bowl (screen x, y) and its radius on screen: where the fire stands. */
export const FIRE_AT = ZS.braziers.map(([X, z]) => {
  const [x, y] = P(X, ZS.brazierY, z);
  return { x, y, rr: BOWL_R * pz(z), k: pz(z) };
});

function brazier(ctx: Ctx, i: number): void {
  const [X, z] = ZS.braziers[i];
  const k = pz(z);
  const [fx, fy] = P(X, 0, z);
  // its shadow and the blue light it throws on the floor round it
  groundShadow(ctx, fx + k * 0.25, fy + 2, k * 1.1, k * 0.18, 0.55, '#0e1028');
  // three legs, splayed, ending in lion's paws
  for (const a of [-0.9, 0.1, 1.0]) {
    const Xl = X + Math.sin(a) * 0.7;
    const zl = z - Math.cos(a) * 0.5;
    const [lx, ly] = P(Xl, 0.05, zl);
    const [tx, ty] = P(X + Math.sin(a) * 0.35, BOWL_LO, z - Math.cos(a) * 0.25);
    const w = k * 0.1;
    const leg = polyPath([[lx - w, ly], [lx + w, ly], [tx + w * 0.8, ty], [tx - w * 0.8, ty]]);
    fillPath(ctx, leg, lin(ctx, [lx - w, 0], [lx + w, 0], [[0, GOLD.lit], [0.5, GOLD.body], [1, GOLD.deep]]));
    strokePath(ctx, leg, 'rgba(30,16,4,0.8)', 1);
    ctx.fillStyle = lin(ctx, [lx, ly - w * 2], [lx, ly], [[0, GOLD.lit], [1, GOLD.shade]]);
    ctx.beginPath();
    ctx.ellipse(lx, ly - w * 0.5, w * 1.8, w * 1.1, 0, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,16,4,0.8)';
    ctx.stroke();
  }
  // the bowl: a wide gold basin, a meander round its band, the fire's light inside its rim
  const rr = BOWL_R * k;
  const [, yr] = P(X, ZS.brazierY, z);
  const [, yl] = P(X, BOWL_LO, z);
  const ell = (EH - ZS.brazierY) / z;
  const bowl = (c: Ctx) => {
    c.beginPath();
    c.moveTo(fx - rr, yr);
    c.bezierCurveTo(fx - rr, yl + (yl - yr) * 0.4, fx - rr * 0.4, yl + 2, fx, yl + 2);
    c.bezierCurveTo(fx + rr * 0.4, yl + 2, fx + rr, yl + (yl - yr) * 0.4, fx + rr, yr);
    c.ellipse(fx, yr, rr, rr * ell, 0, 0, Math.PI, false);
    c.closePath();
  };
  const bb = { x: fx - rr, y: yr - rr * ell, w: rr * 2, h: yl - yr + rr * ell + 4 };
  fillPath(ctx, bowl, lin(ctx, [fx - rr, 0], [fx + rr, 0], [[0, GOLD.lit], [0.3, GOLD.body], [0.75, GOLD.shade], [1, GOLD.deep]]));
  within(ctx, bowl, () => {
    // the fire's blue light on its upper band, and the meander
    ctx.fillStyle = lin(ctx, [0, yr], [0, yl], [[0, rgba('#6ab8ff', 0.4)], [0.4, rgba('#3a78d0', 0.1)], [1, 'rgba(0,0,0,0.2)']]);
    ctx.fillRect(bb.x, bb.y, bb.w, bb.h);
    const yb = yr + (yl - yr) * 0.35;
    ctx.strokeStyle = 'rgba(40,20,4,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = fx - rr; x < fx + rr; x += 7) {
      ctx.moveTo(x, yb + 4);
      ctx.lineTo(x, yb - 2);
      ctx.lineTo(x + 5, yb - 2);
      ctx.lineTo(x + 5, yb + 2);
      ctx.lineTo(x + 2.5, yb + 2);
    }
    ctx.stroke();
  });
  strokePath(ctx, bowl, 'rgba(30,16,4,0.85)', 1.2);
  // the rim: we look down into the bowl, its far inside wall lit by the fire, a heap of glowing coals
  const rim = (c: Ctx) => {
    c.beginPath();
    c.ellipse(fx, yr, rr, rr * ell, 0, 0, P2);
  };
  fillPath(ctx, rim, '#0a1030');
  within(ctx, rim, () => {
    const g = ctx.createRadialGradient(fx, yr + rr * ell * 0.3, 0, fx, yr, rr);
    g.addColorStop(0, rgba('#e4f6ff', 0.95));
    g.addColorStop(0.35, rgba('#4aa0ff', 0.8));
    g.addColorStop(1, rgba('#1838c8', 0.3));
    ctx.fillStyle = g;
    ctx.fillRect(fx - rr, yr - rr, rr * 2, rr * 2);
  });
  ctx.strokeStyle = GOLD.lit;
  ctx.lineWidth = 1.6;
  rim(ctx);
  ctx.stroke();
}

// ——— the blue lightning-fire ———

const FIRE_F = { w: 120, h: 150 };
/** One frame of the braziers' fire (phase 0…1 loops), its base at (x, y): tongues of blue flame (deep blue, sky
 * blue, a white-hot core) leaning and curling, and white arcs crackling up through them, new ones every frame.
 * `war`: the war god's red. */
function fireFrame(c: Ctx, x: number, y: number, w: number, h: number, ph: number, seed: number, war = false): void {
  const cols: [string, string, string] = war ? ['#8a1008', '#ff4a1a', '#ffc070'] : [BLUE.deep, BLUE.body, BLUE.core];
  c.save();
  c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(x, y - h * 0.2, 0, x, y - h * 0.2, w * 0.75);
  g.addColorStop(0, rgba(cols[1], 0.35));
  g.addColorStop(1, rgba(cols[0], 0));
  c.fillStyle = g;
  c.fillRect(x - w, y - h, w * 2, h * 1.2);
  // tongues of uneven height and lean, each licking up in a wavering ribbon that breaks into a flickering tip
  const n = 7;
  const fr = rng(hashStr(`zs:tongues:${seed}:${war}`));
  const base = Array.from({ length: n }, () => [fr(), fr(), fr()]);
  const p = P2 * ph;
  for (let i = 0; i < n; i++) {
    const [ra, rb, rc] = base[i];
    const u = (i + 0.5) / n;
    const mid = 1 - Math.abs(u - 0.5) * 1.4;
    const tx = x + (u - 0.5) * w * 0.84 + (ra - 0.5) * w * 0.08;
    const th = h * (0.35 + mid * 0.65) * (0.62 + rb * 0.3 + Math.sin(p * 2 + i * 2.3 + seed) * 0.16 + Math.sin(p * 5 + i * 1.1) * 0.07);
    const tw = (w / n) * (1.6 + rc * 0.8);
    for (const [kk, col, al] of [[1, cols[0], 0.6], [0.66, cols[1], 0.75], [0.34, cols[2], 0.9]] as const) {
      const ww = tw * kk;
      const hh = th * (0.5 + kk * 0.5);
      // the tongue's centre line wavers as it climbs; its two edges follow it, narrowing to a ragged tip
      const pts: Pt[] = [];
      const steps = 10;
      for (let j = 0; j <= steps; j++) {
        const t = j / steps;
        const cxp = tx + Math.sin(t * 3.2 - p * 2 + i * 1.7) * ww * 0.35 * t + Math.sin(p * 3 + i) * ww * 0.15 * t * t;
        const half = ww * 0.5 * Math.sin(Math.min(1, (1 - t) * 1.15) * Math.PI * 0.5) * (1 - t * 0.2);
        pts.push([cxp, y - hh * t, half] as unknown as Pt);
      }
      c.beginPath();
      for (let j = 0; j <= steps; j++) {
        const q = pts[j] as unknown as number[];
        if (j) c.lineTo(q[0] - q[2], q[1]);
        else c.moveTo(q[0] - q[2], q[1]);
      }
      for (let j = steps; j >= 0; j--) {
        const q = pts[j] as unknown as number[];
        c.lineTo(q[0] + q[2], q[1]);
      }
      c.closePath();
      c.fillStyle = rgba(col, al);
      c.fill();
    }
    // a flicker breaking off the tip
    const fq = (ph * 2 + ra) % 1;
    if (fq < 0.6) {
      const fy = y - th * (1 + fq * 0.35);
      const fs = tw * 0.14 * (1 - fq / 0.6);
      c.fillStyle = rgba(cols[1], 0.35 * (1 - fq / 0.6));
      c.beginPath();
      c.ellipse(tx + Math.sin(p + i) * tw * 0.3, fy, fs * 0.6, fs * 1.4, 0, 0, P2);
      c.fill();
    }
  }
  c.fillStyle = rgba(cols[2], 0.6);
  c.beginPath();
  c.ellipse(x, y - 2, w * 0.4, h * 0.05, 0, 0, P2);
  c.fill();
  // the arcs: jagged filaments leaping from the bowl up through the flame, a glow round each
  const rr = rng(hashStr(`zs:arc:${Math.round(ph * 100)}:${seed}:${war}`));
  const arcs = 1 + Math.floor(rr() * 2.5);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  for (let j = 0; j < arcs; j++) {
    const pts: Pt[] = [[x + (rr() - 0.5) * w * 0.6, y - 2]];
    const top = h * (0.45 + rr() * 0.5);
    let px = pts[0][0];
    for (let s = 0; s < top; s += 6 + rr() * 8) {
      px += (rr() - 0.5) * 12;
      pts.push([px, y - 2 - s]);
    }
    for (const [lw, col, a] of [[5, cols[1], 0.25], [2.2, war ? '#ffd0a0' : '#c8e8ff', 0.8], [1, '#ffffff', 1]] as const) {
      c.strokeStyle = rgba(col, a);
      c.lineWidth = lw;
      c.beginPath();
      pts.forEach(([px2, py2], i) => (i ? c.lineTo(px2, py2) : c.moveTo(px2, py2)));
      c.stroke();
    }
  }
  c.restore();
}

/** The fire's size at each brazier (screen px). */
const fireSize = (f: (typeof FIRE_AT)[number]) => ({ w: f.rr * 2.1, h: f.k * 1.65 });

export const FIRES_BOX: Box = (() => {
  const xs = FIRE_AT.map((f) => f.x);
  return { x: Math.floor(Math.min(...xs) - 120), y: 330, w: Math.ceil(Math.max(...xs) - Math.min(...xs) + 240), h: 300 };
})();
function firesStill(ctx: Ctx): void {
  for (const [i, f] of FIRE_AT.entries()) {
    const { w, h } = fireSize(f);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    lightPool(ctx, f.x, f.y - h * 0.3, w * 1.4, w * 1.3, '#3a88f0', 0.3);
    ctx.restore();
    fireFrame(ctx, f.x, f.y + 2, w, h, 0.3 + i * 0.41, 3 + i);
  }
}

// ——— the flash: the hall lit white by a bolt out of the rift (live only, added over the stack) ———

export const FLASH_BOX: Box = { x: 0, y: 0, w: W, h: TY };
function flashLight(ctx: Ctx): void {
  // the sky whitening, the cloud sea's far band lit from above, the floor's far end round the dais, the wet nave
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  vfill(ctx, 0, 0, W, HZ + 40, [[0, rgba('#a8b8f0', 0.35)], [0.6, rgba('#8090d0', 0.18)], [1, 'rgba(128,144,208,0)']]);
  softly(ctx, { x: 0, y: 330, w: W, h: 440 }, (q) => {
    const g = q.createRadialGradient(960, 470, 0, 960, 470, 760);
    g.addColorStop(0, rgba('#c8d8ff', 0.5));
    g.addColorStop(0.5, rgba('#8aa0e0', 0.2));
    g.addColorStop(1, 'rgba(120,140,220,0)');
    q.save();
    q.translate(960, 470);
    q.scale(1.6, 0.32);
    q.translate(-960, -470);
    q.fillStyle = g;
    q.fillRect(0, 0, W, 1080);
    q.restore();
    // the wet nave mirroring the bolt
    const lg = q.createLinearGradient(0, 520, 0, TY);
    lg.addColorStop(0, rgba('#e8f0ff', 0.45));
    lg.addColorStop(1, rgba('#8aa0e0', 0));
    q.fillStyle = lg;
    q.beginPath();
    q.moveTo(880, 520);
    q.lineTo(1040, 520);
    q.lineTo(1160, TY);
    q.lineTo(760, TY);
    q.closePath();
    q.fill();
    for (const [Xp, zp, hw, hd] of PUDDLES) {
      const [px, py] = P(Xp, 0, zp);
      lightPool(q, px, py, hw * pz(zp) * 1.3, hd * pz(zp) * (EH / zp) * 2.2, '#c8d4ff', 0.16);
    }
  }, 0.25);
  // each column's side turned to the rift, white
  for (const s of [-1, 1] as const) {
    for (const [i, z] of ZS.rows.entries()) {
      const X = s * ZS.colX;
      const k = pz(z);
      const cx = sx(X, z);
      const rb = ZS.colR * k;
      const yb = sy(BASE_Y, z);
      const topY = i === 3 && s > 0 ? BROKEN_TOP : ZS.shaftY;
      const yt = Math.max(-10, sy(topY, z));
      const u = -s * 0.55;
      const g = ctx.createLinearGradient(cx - rb, 0, cx + rb, 0);
      g.addColorStop(0, rgba('#dce8ff', 0));
      g.addColorStop(clamp01((u + 1) / 2 - 0.2), rgba('#dce8ff', 0));
      g.addColorStop((u + 1) / 2, rgba('#eef4ff', 0.55));
      g.addColorStop(clamp01((u + 1) / 2 + 0.25), rgba('#dce8ff', 0));
      g.addColorStop(1, rgba('#dce8ff', 0));
      ctx.fillStyle = g;
      ctx.fillRect(cx - rb, yt, rb * 2, yb - yt);
      // the floor round its foot
      lightPool(ctx, cx - s * rb * 1.4, sy(0, z) + 2, rb * 2.2, rb * 0.4, '#c8d8ff', 0.25);
    }
  }
  // the throne's edges and its gold, the dais's steps
  const [tx, ty] = P(0, BACK.top, BACK.z0);
  lightPool(ctx, tx, ty + 6, 140, 60, '#fff2d0', 0.4);
  for (let i = 0; i < DA.n; i++) {
    const hw = DA.hw - i * 0.4;
    const z1 = i === DA.n - 1 ? DA.back : stepZ(i + 1);
    fillPath(ctx, topAt(-hw, hw, stepZ(i), z1, (i + 1) * DA.rise), rgba('#dce6ff', 0.3));
  }
  const bk = boxOfPts([P(-BACK.hw, BACK.top, BACK.z0), P(BACK.hw, SEAT.top, BACK.z0)], 0);
  ctx.fillStyle = lin(ctx, [bk.x, 0], [bk.x + bk.w, 0], [[0, rgba('#dce6ff', 0.4)], [0.12, rgba('#dce6ff', 0)], [0.88, rgba('#dce6ff', 0)], [1, rgba('#dce6ff', 0.4)]]);
  ctx.fillRect(bk.x, bk.y, bk.w, bk.h);
  // the entablature's undersides and the cornices' edges
  for (const [Xa, za, zb] of [[-ZS.colX, 26.2, 41.2], [ZS.colX, 37.4, 41.2], [ZS.colX, 12.4, 27.6]] as const) {
    const s = Math.sign(Xa);
    const Xi = s * (ZS.colX - EW);
    ctx.strokeStyle = rgba('#e8f0ff', 0.6);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(...P(Xi, ZS.corY, za));
    ctx.lineTo(...P(Xi, ZS.corY, zb));
    ctx.moveTo(...P(Xi, ZS.capY, za));
    ctx.lineTo(...P(Xi, ZS.capY, zb));
    ctx.stroke();
  }
  for (const [X0, X1] of [[-ZS.colX - EW, -4.9], [5.1, ZS.colX + EW]]) {
    ctx.strokeStyle = rgba('#e8f0ff', 0.55);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(...P(X0, ZS.corY, ZS.rows[4] + 0.15));
    ctx.lineTo(...P(X1, ZS.corY, ZS.rows[4] + 0.15));
    ctx.stroke();
  }
  for (const e of EAGLES) lightPool(ctx, e.x, e.y - 40, 50, 46, '#fff2d0', 0.35);
  ctx.restore();
}

export const RIFT_BOX: Box = { x: 480, y: 0, w: 960, h: HZ };

// ——— the table: a slab of the hall's white marble, veined grey and gold; its front a step inlaid with a meander ———

function table(ctx: Ctx, r: R): void {
  const f = ZS.front;
  const zf = zFront(f);
  const box = { x: 0, y: TY, w: W, h: f - TY };
  const T = (X: number, z: number): Pt => [xAt(X, z), yAt(z)];
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, f - TY + 4);
  ctx.clip();
  vfill(ctx, 0, TY, W, f - TY + 4, [[0, '#94919e'], [0.5, '#a4a0ac'], [1, '#aca8b2']]);
  surface(ctx, r, box, '#a4a0ac', { over: true, vary: 0.18, cells: 3, mottle: 0.08, strokes: 0.03, strokeAng: 0, strokeLen: 400, strokeW: 3, grain: 0.03, grainKind: 'stone', warm: '#c4bcb4', cool: '#8a8aa6', seed: 95 });
  // long soft veins of grey running across the whole slab, over its joints, each with a faint cloud round it
  softly(ctx, box, (q) => {
    const rv = rng(hashStr('zs:tableveins'));
    for (let i = 0; i < 7; i++) {
      let x = -100 + rv() * 2100;
      let y = TY + rv() * (f - TY);
      const a0 = -0.35 + (rv() - 0.5) * 0.4;
      q.strokeStyle = rgba('#7a7890', 0.16);
      q.lineWidth = 10 + rv() * 14;
      q.beginPath();
      q.moveTo(x, y);
      for (let j = 0; j < 30; j++) {
        x += Math.cos(a0 + Math.sin(j * 0.7 + i) * 0.4) * 40;
        y += Math.sin(a0 + Math.sin(j * 0.7 + i) * 0.4) * 14;
        q.lineTo(x, y);
      }
      q.stroke();
    }
  }, 0.25);
  // its veins: long seams of grey and threads of gold wandering across the slab in its perspective
  ctx.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const z0 = ZB + (zf - ZB) * r();
    const X0 = (r() - 0.5) * 5;
    const ang = (r() - 0.5) * 1.2;
    const len = 1 + r() * 2.5;
    const ph = r() * 9;
    const gold = i % 4 === 0;
    const pts: Pt[] = [];
    for (let t = 0; t <= 1.001; t += 0.05) {
      const X = X0 + Math.cos(ang) * len * t + Math.sin(t * 6 + ph) * 0.05;
      const z = z0 + Math.sin(ang) * len * t * 0.3 + Math.sin(t * 9 + ph) * 0.02;
      pts.push(T(X, Math.max(ZB, Math.min(zf, z))));
    }
    const near = (pts[0][1] - TY) / (f - TY);
    ctx.strokeStyle = gold ? rgba(GOLD.body, 0.28) : rgba('#5a586e', 0.1 + r() * 0.08);
    ctx.lineWidth = (0.6 + r() * 1.4) * (0.5 + near);
    ctx.beginPath();
    pts.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
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
    line(ctx, [xAt(X, ZB), TY], [xAt(X, zf), f + 4], 'rgba(20,22,48,0.45)', 2);
    line(ctx, [xAt(X, ZB) + 2, TY], [xAt(X, zf) + 3, f + 4], 'rgba(240,244,255,0.12)', 1.2);
  }
  // its polish: the rift's light mirrored soft down the middle, the fires' blue either side
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
  sheen(960, '#e8ecff', 0.1, 240);
  for (const fa of FIRE_AT) sheen(fa.x, '#4aa8ff', 0.07, 90);
  ctx.restore();
  vfill(ctx, 0, TY, W, 50, [[0, rgba('#20244a', 0.25)], [1, rgba('#20244a', 0)]]);
  grain(ctx, box, 'stone', 0.05, 1.4);
  ctx.restore();
  tableFalloff(ctx, f, 0.3, '#14162e');
  crevice(ctx, 0, W, TY, 26, 0.45, '#10122a');
  ctx.fillStyle = 'rgba(230,236,255,0.3)';
  ctx.fillRect(0, TY, W, 2);
  goldRim(ctx, f);
}

/** The table's front: a step of white marble inlaid with a gold meander, a gold boss on each slab joint. */
function goldRim(ctx: Ctx, f: number): void {
  const h = 1080 - f;
  const g = ctx.createLinearGradient(0, f, 0, 1080);
  g.addColorStop(0, '#c8ccdc');
  g.addColorStop(0.25, '#9a9eb4');
  g.addColorStop(0.7, '#6a6e88');
  g.addColorStop(1, '#3a3c56');
  ctx.fillStyle = g;
  ctx.fillRect(0, f, W, h);
  lay(ctx, noiseMask(5, 193, { kind: 'web', cover: 0.18, soft: 0.04, col: '#5a5e78', w: 240, h: 8 }), { x: 0, y: f, w: W, h }, 0.3);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, f, W, h);
  ctx.clip();
  const cy = f + h / 2 + 1;
  const kh = h * 0.52;
  const u = KEY_U;
  for (let n = -Math.ceil(960 / u) - 1; n <= Math.ceil(960 / u); n++) {
    const x0 = 960 + n * u;
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
    // sunk into the marble (a shadow on its upper side), the gold catching the light
    draw(-0.8, -1, 'rgba(20,22,44,0.6)', 3.6);
    draw(0, 0, '#d8a840', 2.4);
    draw(-0.4, -0.5, rgba('#ffe8a8', 0.6), 0.9);
  }
  for (let n = -4; n <= 4; n++) {
    const x = 960 + (n + 0.5) * KEY_U * SLAB;
    const br = h * 0.34;
    ctx.fillStyle = 'rgba(20,22,44,0.6)';
    ctx.beginPath();
    ctx.arc(x + 1.5, cy + 2, br, 0, P2);
    ctx.fill();
    const g2 = ctx.createRadialGradient(x - br * 0.3, cy - br * 0.35, 1, x, cy, br);
    g2.addColorStop(0, '#fff2c0');
    g2.addColorStop(0.35, '#d8a840');
    g2.addColorStop(1, '#5a3a10');
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.arc(x, cy, br, 0, P2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,22,4,0.8)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // a little thunderbolt struck on each boss
    thunderbolt(ctx, x, cy, br * 1.3, 'rgba(90,56,12,0.8)', 'rgba(0,0,0,0)');
  }
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillRect(0, f, W, 2);
  ctx.fillStyle = 'rgba(20,22,44,0.6)';
  ctx.fillRect(0, f + 2, W, 2);
  ctx.restore();
}

// ——— the shade ———

function shadeOver(ctx: Ctx): void {
  calmLanes(ctx, 0.16, '#0a0c22', 120, 700);
  vignetteAll(ctx, 0.5, '#05060f');
  // the nearest columns and the corners kept dark, framing the lit hall
  for (const [x0, x1] of [[0, 300], [W, W - 300]]) {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, 'rgba(4,5,16,0.45)');
    g.addColorStop(1, 'rgba(4,5,16,0)');
    ctx.fillStyle = g;
    ctx.fillRect(Math.min(x0, x1), 0, 300, TY);
  }
  // under the HUD: the top kept dark
  vfill(ctx, 0, 0, W, 170, [[0, 'rgba(4,5,14,0.38)'], [1, 'rgba(4,5,14,0)']]);
}

// ——— the stack ———

const TABLE_BOX: Box = { x: 0, y: TY, w: W, h: 1080 - TY };
/** Where the live layer's storm goes: the sky and the cloud sea behind the hall, between the second pair of columns
 * (those and the nearest stay in the live base, so the storm's things keep clear of them). */
export const STORM_BOX: Box = { x: 482, y: 0, w: 961, h: 620 };

export const ZEUS: SceneSpec = {
  id: 'zeus',
  info: {
    name: 'The Storm Throne',
    subtitle: 'Boss: ZEUS',
    ambient: [],
    // (the lightning, the rift and the fires are the live layer's)
    glows: [],
    light: '#c8d4f4',
    tableTint: '#eef0fa',
  },
  layers: [
    { id: 'sky', box: SKY_BOX, draw: sky },
    { id: 'sea', box: SEA_BOX, draw: sea },
    { id: 'riftGlow', box: RIFT_BOX, liveOnly: true, res: 0.5, draw: (c, r) => riftLight(c, r, 1) },
    { id: 'storm', box: STORM_BOX, motion: 'slot', draw: () => {} },
    { id: 'fallen', box: FALLEN_BOX, draw: fallen },
    { id: 'floorFar', box: FLOOR_FAR, draw: (c) => floor(c, FLOOR_FAR) },
    { id: 'floorNear', box: FLOOR_NEAR, draw: (c) => floor(c, FLOOR_NEAR) },
    { id: 'floorSideL', box: FLOOR_SIDE_L, draw: (c) => floor(c, FLOOR_SIDE_L) },
    { id: 'floorSideR', box: FLOOR_SIDE_R, draw: (c) => floor(c, FLOOR_SIDE_R) },
    { id: 'drums', box: DRUMS_BOX, draw: drums },
    { id: 'col5L', box: colBox(-ZS.colX, ZS.rows[4]), draw: (c, r) => colLayer(c, r, 4, -1) },
    { id: 'ares', box: ARES_BOX, draw: aresThrone },
    { id: 'col5R', box: colBox(ZS.colX, ZS.rows[4]), draw: (c, r) => colLayer(c, r, 4, 1) },
    { id: 'throne', box: THRONE_BOX, draw: throne },
    { id: 'councilL', box: COUNCIL_BOX(-1), draw: (c, r) => council(c, r, -1) },
    { id: 'councilR', box: COUNCIL_BOX(1), draw: (c, r) => council(c, r, 1) },
    { id: 'col4L', box: colBox(-ZS.colX, ZS.rows[3]), draw: (c, r) => colLayer(c, r, 3, -1) },
    { id: 'col4R', box: colBox(ZS.colX, ZS.rows[3]), draw: (c, r) => colLayer(c, r, 3, 1) },
    { id: 'col3L', box: colBox(-ZS.colX, ZS.rows[2]), draw: (c, r) => colLayer(c, r, 2, -1) },
    { id: 'col3R', box: colBox(ZS.colX, ZS.rows[2]), draw: (c, r) => colLayer(c, r, 2, 1) },
    { id: 'beams', box: BEAMS_BOX, draw: beams },
    { id: 'brazierL', box: BRAZIER_BOX(0), draw: (c) => brazier(c, 0) },
    { id: 'brazierR', box: BRAZIER_BOX(1), draw: (c) => brazier(c, 1) },
    { id: 'col2L', box: colBox(-ZS.colX, ZS.rows[1]), draw: (c, r) => colLayer(c, r, 1, -1) },
    { id: 'col2R', box: colBox(ZS.colX, ZS.rows[1]), draw: (c, r) => colLayer(c, r, 1, 1) },
    { id: 'nearBeamsA', box: NEAR_BEAMS_A, draw: (c) => nearBeams(c, NEAR_BEAMS_A) },
    { id: 'nearBeamsB', box: NEAR_BEAMS_B, draw: (c) => nearBeams(c, NEAR_BEAMS_B) },
    { id: 'col1L', box: colBox(-ZS.colX, ZS.rows[0]), draw: (c, r) => colLayer(c, r, 0, -1) },
    { id: 'col1R', box: colBox(ZS.colX, ZS.rows[0]), draw: (c, r) => colLayer(c, r, 0, 1) },
    { id: 'firesStill', box: FIRES_BOX, stillOnly: true, draw: (c) => firesStill(c) },
    { id: 'flash', box: FLASH_BOX, liveOnly: true, res: 0.4, draw: (c) => flashLight(c) },
    { id: 'table', box: TABLE_BOX, draw: table },
    { id: 'top', motion: 'top', draw: () => {} },
  ],
  shade: shadeOver,
};

// ——— live ———

type Kind = 'rift' | 'crawl' | 'sea';
type Olympian = 'poseidon' | 'ares' | 'hera';

/** A lightning channel from a to b: midpoint displacement, its kinks sharp; rough is the offset per length. */
function channel(a: Pt, b: Pt, rough: number, depth = 6): Pt[] {
  if (depth === 0) return [a, b];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  const off = (crand() - 0.5) * len * rough;
  const m: Pt = [(a[0] + b[0]) / 2 - (dy / (len || 1)) * off, (a[1] + b[1]) / 2 + (dx / (len || 1)) * off];
  return [...channel(a, m, rough, depth - 1).slice(0, -1), ...channel(m, b, rough, depth - 1)];
}

/** Paint a fork of lightning into c: a main channel from a to b, branches forking off it and dying away; each
 * stroke a wide blue glow, a pale body and a white core, tapering. */
function paintBolt(c: Ctx, a: Pt, b: Pt, w0: number, branches: number): void {
  const strokes: { pts: Pt[]; w: number; a: number }[] = [];
  const main = channel(a, b, 0.28);
  strokes.push({ pts: main, w: w0, a: 1 });
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  for (let i = 0; i < branches; i++) {
    const j = Math.floor(main.length * (0.12 + crand() * 0.6));
    const s = main[j];
    const ba = ang + (crand() < 0.5 ? -1 : 1) * (0.35 + crand() * 0.7);
    const bl = len * (0.15 + crand() * 0.3);
    const e: Pt = [s[0] + Math.cos(ba) * bl, s[1] + Math.sin(ba) * bl];
    const pts = channel(s, e, 0.35, 5);
    strokes.push({ pts, w: w0 * 0.5, a: 0.7 });
    if (crand() < 0.5) {
      const k2 = Math.floor(pts.length * (0.3 + crand() * 0.4));
      const s2 = pts[k2];
      const b2 = ba + (crand() - 0.5) * 1.4;
      strokes.push({ pts: channel(s2, [s2[0] + Math.cos(b2) * bl * 0.45, s2[1] + Math.sin(b2) * bl * 0.45], 0.4, 4), w: w0 * 0.3, a: 0.5 });
    }
  }
  c.lineCap = 'round';
  c.lineJoin = 'round';
  const pass = (wk: number, col: string, al: number, blur: number) => {
    c.shadowBlur = blur;
    c.shadowColor = 'rgba(120,150,255,0.9)';
    for (const st of strokes) {
      const n = st.pts.length - 1;
      // in a few runs, each a little thinner and fainter towards the tip
      const runs = 4;
      for (let q = 0; q < runs; q++) {
        const i0 = Math.floor((q / runs) * n);
        const i1 = Math.floor(((q + 1) / runs) * n);
        const t = q / runs;
        c.strokeStyle = rgba(col, al * st.a * (1 - t * 0.55));
        c.lineWidth = Math.max(0.6, st.w * wk * (1 - t * 0.6));
        c.beginPath();
        for (let i = i0; i <= i1; i++) {
          if (i === i0) c.moveTo(st.pts[i][0], st.pts[i][1]);
          else c.lineTo(st.pts[i][0], st.pts[i][1]);
        }
        c.stroke();
      }
    }
    c.shadowBlur = 0;
  };
  pass(4.5, '#5a7aff', 0.22, 18);
  pass(1.8, '#b8ccff', 0.75, 0);
  pass(0.7, '#ffffff', 1, 0);
}

/** Where gold catches the light (screen ellipses: x, y, rx, ry): Hera's shimmer runs over these. */
const GOLD_SPOTS: [number, number, number, number][] = (() => {
  const [cx, cy] = P(0, BACK.top + 1.4, BACK.z0);
  const [bx, by] = P(0, (SEAT.top + BACK.top) / 2, BACK.z0);
  return [
    [cx, cy, 52, 26],
    [bx, by, 62, 110],
    ...EAGLES.map((e): [number, number, number, number] => [e.x, e.y - 34, 20, 30]),
    ...FIRE_AT.map((f): [number, number, number, number] => [f.x, f.y + 10, f.rr, 10]),
    ...([-1, 1] as const).map((d): [number, number, number, number] => {
      const [hx, hy] = P(d * (SEAT.hw + ARM.w / 2), ARM.top + 0.2, ARM.z0);
      return [hx, hy - 6, 12, 10];
    }),
  ];
})();

/** Where a stomp shakes dust off the stone: the entablature's undersides (screen segments and the floor's y under
 * them). */
const DUST_LINES: { a: Pt; b: Pt; floor: number }[] = [
  { a: P(-(ZS.colX - EW), ZS.capY, 27), b: P(-(ZS.colX - EW), ZS.capY, 41), floor: sy(0, 33) },
  { a: P(-ZS.colX - EW, ZS.capY, ZS.rows[4] + 0.15), b: P(-4.9, ZS.capY, ZS.rows[4] + 0.15), floor: sy(0, 39) },
  { a: P(5.1, ZS.capY, ZS.rows[4] + 0.15), b: P(ZS.colX + EW, ZS.capY, ZS.rows[4] + 0.15), floor: sy(0, 39) },
  { a: P(ZS.colX - EW, ZS.capY, 21), b: P(ZS.colX - EW, ZS.capY, 27.6), floor: sy(0, 24) },
];
/** The platform's broken corners, where a stomp knocks a chunk off the lip (beside the dais, clear of it). */
const LIP_PTS: Pt[] = BREAK.filter(([X]) => Math.abs(X) > 8).map(([X, z]) => P(X, 0, z));

registerKitScene(ZEUS, (k: KitLive) => {
  const sc = k.sc;
  const top = k.slot('top');
  const storm = k.slot('storm');
  const ev = sc.events;
  const ADD = Phaser.BlendModes.ADD;
  const flashes = () => save.settings.flashes && !save.settings.reducedMotion;
  const sm = (e0: number, e1: number, v: number) => {
    const t = clamp01((v - e0) / (e1 - e0));
    return t * t * (3 - 2 * t);
  };

  // ——— the rift's glow and the hall's flash (live-only layers, added over the stack) ———
  const riftG = k.sprite('riftGlow').setBlendMode(ADD);
  const flashS = k.sprite('flash').setBlendMode(ADD);

  // ——— the lightning ———
  const BW = 600;
  const BH = 470;
  const BK = 0.8;
  const boltTex = (sc.textures.exists('zs_bolt') ? sc.textures.get('zs_bolt') : sc.textures.createCanvas('zs_bolt', BW * BK, BH * BK)) as Phaser.Textures.CanvasTexture;
  const boltImg = sc.add.image(0, 0, 'zs_bolt').setOrigin(0, 0).setBlendMode(ADD).setAlpha(0).setScale(1 / BK);
  storm.add(boltImg);
  // the cloud lit from inside where it strikes, and the sea below the rift
  // (their middles kept far enough in that they fade out before the second columns, outside the slot)
  const cloudGlow = k.glow(960, 240, 220, 0xb8c8ff, 0, { into: storm, sy: 0.55 });
  const seaGlow = k.glow(960, 450, 240, 0xb8c8ff, 0, { into: storm, sy: 0.3 });
  const clampX = (x: number) => Math.max(STORM_BOX.x + 230, Math.min(STORM_BOX.x + STORM_BOX.w - 230, x));
  let strike: { t: number; pulses: number[]; kind: Kind; power: number } | null = null;
  let nextStrike = 1.5 + crand() * 2;
  /** Paint a new fork and start its flicker. */
  const fire = (kind: Kind, power = 1, atX?: number) => {
    const ctx = boltTex.context;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, BW * BK, BH * BK);
    ctx.setTransform(BK, 0, 0, BK, 0, 0);
    let ox: number;
    let oy: number;
    if (kind === 'rift') {
      // poured down out of the rift, past the throne, into the cloud sea behind the hall
      const { top: tl } = RIFT_LIPS;
      const want = atX === undefined ? RF.x + (crand() - 0.5) * RF.w * 0.7 : Math.max(RF.x - RF.w * 0.4, Math.min(RF.x + RF.w * 0.4, atX));
      let best = tl[0];
      for (const p of tl) if (Math.abs(p[0] - want) < Math.abs(best[0] - want)) best = p;
      const x0 = best[0];
      const y0 = best[1] + 6;
      // (now and then straight down onto the eagle on the throne's crest)
      const crest = atX === undefined && crand() < 0.35;
      const [cx0, cy0] = P(0, BACK.top + 2.6, BACK.z0);
      const x1 = crest ? cx0 + (crand() - 0.5) * 10 : Math.max(540, Math.min(1380, x0 + (crand() - 0.5) * 260));
      const y1 = crest ? cy0 : 430 + crand() * 40;
      ox = Math.round((x0 + x1) / 2 - BW / 2);
      oy = Math.round(y0 - 10);
      paintBolt(ctx, [x0 - ox, y0 - oy], [x1 - ox, y1 - oy], 5 * power, 6);
      seaGlow.setPosition(clampX(x1), y1 + 6);
      cloudGlow.setPosition(clampX(x0), y0 + 20);
    } else if (kind === 'crawl') {
      // crawling along the cloud base between the columns
      const x0 = 530 + crand() * 380;
      const y0 = 170 + crand() * 160;
      const x1 = Math.min(1400, x0 + 260 + crand() * 200);
      const y1 = y0 + (crand() - 0.5) * 90;
      ox = Math.round(x0 - 40);
      oy = Math.round((y0 + y1) / 2 - BH / 2);
      paintBolt(ctx, [x0 - ox, y0 - oy], [x1 - ox, y1 - oy], 2.8 * power, 7);
      cloudGlow.setPosition(clampX((x0 + x1) / 2), (y0 + y1) / 2);
      seaGlow.setPosition(clampX((x0 + x1) / 2), 440);
    } else {
      // inside the cloud sea: a short fork lighting the cloud from within, far off
      const x0 = 560 + crand() * 800;
      const y0 = HZ + 6;
      const x1 = x0 + (crand() - 0.5) * 180;
      const y1 = HZ + 40 + crand() * 50;
      ox = Math.round((x0 + x1) / 2 - BW / 2);
      oy = Math.round(y0 - 20);
      paintBolt(ctx, [x0 - ox, y0 - oy], [x1 - ox, y1 - oy], 1.4 * power, 3);
      seaGlow.setPosition(clampX(x1), y1 - 10);
      cloudGlow.setPosition(clampX(x0), y0 - 40);
    }
    boltTex.refresh();
    boltImg.setPosition(ox, oy);
    const pulses = [0, 0.1 + crand() * 0.06];
    if (crand() < 0.6) pulses.push(0.26 + crand() * 0.1);
    if (power > 1.1) pulses.push(0.45 + crand() * 0.1);
    strike = { t: 0, pulses, kind, power };
  };

  // ——— the braziers' blue lightning-fire, and the war god's red ———
  const FW = FIRE_F.w;
  const FH = FIRE_F.h;
  const fireKey = sheet(k, 'zs_fire', FW, FH, 10, (c, ph) => fireFrame(c, FW / 2, FH - 6, FW * 0.8, FH * 0.9, ph, 3));
  const warKey = sheet(k, 'zs_fireWar', 96, 120, 8, (c, ph) => fireFrame(c, 48, 114, 78, 108, ph, 5, true));
  const fires = FIRE_AT.map((f, i) => {
    const { w, h } = fireSize(f);
    const s0 = w / (FW * 0.8);
    const blue = new Loop(k, fireKey, 10, f.x, f.y + 2, { into: top, add: true, origin: [0.5, (FH - 6) / FH], scale: s0, fps: 11, phase: i * 4.3 });
    const red = new Loop(k, warKey, 8, f.x, f.y + 2, { into: top, add: true, origin: [0.5, 114 / 120], scale: (w / 78) * 1.15, fps: 13, phase: i * 3.1 });
    red.alpha = 0;
    const halo = k.glow(f.x, f.y - h * 0.35, w * 1.4, BLUE.glow, 0.3, { into: top, sy: 1.1 });
    const pool = k.glow(f.x, sy(0, ZS.braziers[i][1]) + 4, w * 1.8, BLUE.glow, 0.12, { into: top, sy: 0.22 });
    return { f, w, h, s0, blue, red, halo, pool, duck: new Spring(0, 40, 6), rate: new Rate(), seed: i * 2.3 };
  });
  const sparks = new Parts(k, { frame: 'spark', add: true, into: top, max: 90 });

  // ——— the cloud sea drifting below, the storm's scud racing over the sky ———
  const WF = { w: 220, h: 80 };
  const wispKey = sheet(k, 'zs_wisp', WF.w, WF.h, 4, (c, _p, i) => {
    const rr = rng(hashStr('zs:wisp' + i));
    const n = 6 + i;
    for (let j = 0; j < n; j++) {
      const t = (j + 0.5) / n;
      const x = WF.w * (0.12 + t * 0.76) + (rr() - 0.5) * 12;
      const rad = WF.h * (0.16 + Math.sin(t * Math.PI) * 0.2) * (0.7 + rr() * 0.5);
      const y = WF.h * 0.62 - Math.sin(t * Math.PI) * WF.h * 0.12 + (rr() - 0.5) * 6;
      const g = c.createRadialGradient(x - rad * 0.3, y - rad * 0.45, 0, x, y, rad * 1.2);
      g.addColorStop(0, rgba('#d8dcf4', 0.85));
      g.addColorStop(0.45, rgba('#8a8eb8', 0.7));
      g.addColorStop(0.8, rgba('#4a4e7a', 0.4));
      g.addColorStop(1, rgba('#4a4e7a', 0));
      c.fillStyle = g;
      c.beginPath();
      c.ellipse(x, y, rad * 1.5, rad, 0, 0, P2);
      c.fill();
    }
  });
  type Wisp = { img: Phaser.GameObjects.Image; x: number; y: number; s: number; v: number; a: number; d: number; sea: boolean; seed: number };
  const wisps: Wisp[] = [];
  const X0 = STORM_BOX.x + 8;
  const X1 = STORM_BOX.x + STORM_BOX.w - 8;
  for (let i = 0; i < 10; i++) {
    const d = (i + crand() * 0.8) / 10;
    const s = 0.4 + d * 1.1;
    const y = HZ + 10 + d ** 1.4 * 150;
    const img = sc.add.image(0, y, wispKey, i % 4).setScale(s).setAlpha(0);
    storm.add(img);
    wisps.push({ img, x: X0 + crand() * (X1 - X0), y, s, v: 5 + d * 14, a: 0.45 + d * 0.25, d, sea: true, seed: crand() * 9 });
  }
  for (let i = 0; i < 5; i++) {
    const s = 0.9 + crand() * 0.7;
    const y = 150 + crand() * 190;
    const img = sc.add.image(0, y, wispKey, i % 4).setScale(s * 1.6, s).setAlpha(0).setTint(0x2a3060);
    storm.add(img);
    wisps.push({ img, x: X0 + crand() * (X1 - X0), y, s, v: 26 + crand() * 22, a: 0.5, d: 0, sea: false, seed: crand() * 9 });
  }
  // the red of Tartarus breathing in the gaps
  const inSlot = (x: number) => x > STORM_BOX.x && x < STORM_BOX.x + STORM_BOX.w;
  const gapGlows = GAPS.map(([gx, gy, hw], i) => ({ img: k.glow(gx, gy, inSlot(gx) ? hw * 1.5 : hw * 0.8, RED.glow, 0.15, { into: inSlot(gx) ? storm : top, sy: 0.35 }), seed: i * 1.9 }));
  // rain falling in the rift's light, down past the throne into the cloud far below
  const rain = new Parts(k, { frame: 'drop', add: true, into: storm, max: 120 });
  const rainRate = new Rate();

  // ——— stomps: dust off the entablature, chunks knocked off the broken lip ———
  const CS = 14;
  const chipKey = sheet(k, 'zs_chip', CS, CS, 6, (c, _p, i) => {
    const rr = rng(hashStr('zs:chip' + i));
    const n = 5 + (i % 3);
    const pts: Pt[] = [];
    for (let j = 0; j < n; j++) {
      const a = (j / n) * P2 + rr() * 0.5;
      const rad = CS * (0.25 + rr() * 0.2);
      pts.push([CS / 2 + Math.cos(a) * rad, CS / 2 + Math.sin(a) * rad]);
    }
    c.fillStyle = '#8a8eaa';
    polyPath(pts)(c);
    c.fill();
    c.fillStyle = rgba('#eef2ff', 0.7);
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    c.lineTo(pts[1][0], pts[1][1]);
    c.lineTo(CS / 2, CS / 2);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(14,16,40,0.7)';
    c.lineWidth = 0.8;
    polyPath(pts)(c);
    c.stroke();
  });
  const chunks = new Parts(k, { frame: 'spark', sheet: { key: chipKey, n: 6, half: CS / 2 }, into: storm, max: 30 });
  const pebbles = new Parts(k, { frame: 'spark', sheet: { key: chipKey, n: 6, half: CS / 2 }, into: top, max: 50 });
  const grit = new Parts(k, { frame: 'mote', into: top, max: 140 });
  const dust = new Parts(k, { frame: 'puff', into: top, max: 70 });
  const shed = (n: number, p: number) => {
    for (let i = 0; i < n; i++) {
      const L = DUST_LINES[Math.floor(crand() * DUST_LINES.length)];
      const t = crand();
      const x = L.a[0] + (L.b[0] - L.a[0]) * t;
      const y = L.a[1] + (L.b[1] - L.a[1]) * t + 2;
      if (y < -10) continue;
      if (crand() < 0.3) pebbles.spawn({ x, y, vx: (crand() - 0.5) * 30, vy: crand() * 40, life: 2.2, r0: 1.4 + crand() * 2.2, a: 1, tint: 0xffffff, grav: 900, drag: 0.1, spin: (crand() - 0.5) * 10, floor: L.floor, bounce: 0.3, fade: 0.02 });
      else grit.spawn({ x, y, vx: (crand() - 0.5) * 16, vy: crand() * 30, life: 2.4, r0: 0.8 + crand() * 1.1, a: 0.85, tint: crand() < 0.5 ? 0xc8ccdc : 0x9a9eb8, grav: 600, drag: 0.4, floor: L.floor, fade: 0.02 });
    }
    for (let i = 0; i < Math.round(1 + p * 4); i++) {
      const L = DUST_LINES[Math.floor(crand() * DUST_LINES.length)];
      const t = crand();
      const x = L.a[0] + (L.b[0] - L.a[0]) * t;
      const y = L.a[1] + (L.b[1] - L.a[1]) * t + 6;
      if (y < 0) continue;
      dust.spawn({ x, y, vx: (crand() - 0.5) * 10, vy: 16 + crand() * 22, life: 2.6 + crand(), r0: 6, r1: 22 + crand() * 18, a: 0.22, tint: 0xb8bcd4, grav: 14, drag: 1.1, fade: 0.15 });
    }
  };
  /** A chunk knocked off the broken lip: it hops up and tips over the edge into the cloud (the floor hides it). */
  const breakOff = (p: number) => {
    const [x, y] = LIP_PTS[Math.floor(crand() * LIP_PTS.length)];
    const out = x < 960 ? -1 : 1;
    for (let i = 0; i < 1 + Math.round(p * 2); i++) {
      chunks.spawn({ x: x + (crand() - 0.5) * 20, y: y - 2, vx: out * (20 + crand() * 50), vy: -110 - crand() * 120 * p, life: 1.4, r0: 2.2 + crand() * 2.4, a: 1, tint: 0xffffff, grav: 700, spin: out * (4 + crand() * 6), fade: 0.02 });
    }
    for (let i = 0; i < 3; i++) grit.spawn({ x: x + (crand() - 0.5) * 30, y: y - 2, vx: out * crand() * 30, vy: -40 - crand() * 60, life: 1, r0: 0.9, a: 0.8, tint: 0xc8ccdc, grav: 500, fade: 0.05 });
  };

  // ——— the gold's shimmer (Hera) ———
  const glints = new Parts(k, { frame: 'spark', add: true, into: top, max: 90 });
  const glintRate = new Rate();
  const crownGlow = k.glow(GOLD_SPOTS[0][0], GOLD_SPOTS[0][1] + 10, 140, 0xffd27a, 0, { into: top, sy: 0.7 });
  const teal = k.glow(960, 450, 700, 0x4fd0e0, 0, { into: storm, sy: 0.18 });
  const glint = (big = false) => {
    const [gx, gy, rx, ry] = GOLD_SPOTS[Math.floor(crand() * GOLD_SPOTS.length)];
    const a = crand() * P2;
    const rr = Math.sqrt(crand());
    glints.spawn({ x: gx + Math.cos(a) * rx * rr, y: gy + Math.sin(a) * ry * rr, vy: -6, life: 0.5 + crand() * 0.6, r0: (big ? 3 : 1.8) + crand() * 2, r1: 0.3, a: 1, tint: crand() < 0.55 ? 0xfff0b0 : 0x5fe0d0, fade: 0.25 });
  };

  // ——— the fight, heard ———
  let heave = 0;
  let war = 0;
  let shimmer = 0;
  let crown = 0;
  let crownT = 0;
  const onBolt = (x?: number) => fire('rift', 1.35, typeof x === 'number' ? x : undefined);
  const onOlympian = (who?: Olympian) => {
    if (who === 'poseidon') {
      heave = 1;
      fire('sea', 1.2);
    } else if (who === 'ares') {
      war = 1;
      for (const f of fires) f.duck.v += 3;
    } else if (who === 'hera') {
      shimmer = 1;
      for (let i = 0; i < 30; i++) glint(true);
    }
  };
  const onCrown = (on?: number) => {
    crownT = on ? 1 : 0;
    if (!on && crown > 0.3) {
      shimmer = 1;
      for (let i = 0; i < 40; i++) glint(true);
    }
  };
  ev.on('zeus-bolt', onBolt);
  ev.on('zeus-olympian', onOlympian);
  ev.on('zeus-crown', onCrown);
  const unlisten = () => {
    ev.off('zeus-bolt', onBolt);
    ev.off('zeus-olympian', onOlympian);
    ev.off('zeus-crown', onCrown);
    ev.off(Phaser.Scenes.Events.SHUTDOWN, unlisten);
  };
  ev.once(Phaser.Scenes.Events.SHUTDOWN, unlisten);
  /** In a fight (the game scene has its boss slots), or on the stages page. */
  const inFight = 'miniFoot' in (sc as object);
  let demo = 0;
  let demoCrown = 0;

  return {
    impact(x, _y, p) {
      // a stomp: the fires duck, dust and grit shaken off the entablature, a chunk knocked off the broken lip
      for (const f of fires) f.duck.v -= 2 + p * 5;
      shed(Math.round(4 + p * 16), p);
      if (p > 0.45) breakOff(p);
      void x;
      // (on the stages page, with no fight to hear, the biggest blows play the fight's cues in turn)
      if (!inFight && p >= 0.95) {
        const cue = demo++ % 4;
        if (cue === 0) onBolt(700 + crand() * 520);
        else if (cue === 1) onOlympian('poseidon');
        else if (cue === 2) onOlympian('ares');
        else {
          onOlympian('hera');
          onCrown(1);
          demoCrown = 5;
        }
      }
    },
    update(dt, t) {
      const cm = calm();
      const fk = flashes() ? 1 : 0.25;
      heave = Math.max(0, heave - dt * 0.18);
      war = Math.max(0, war - dt * 0.15);
      shimmer = Math.max(0, shimmer - dt * 0.3);
      crown += (crownT - crown) * Math.min(1, dt * 1.5);
      if (demoCrown > 0) {
        demoCrown -= dt;
        if (demoCrown <= 0) onCrown(0);
      }

      // ——— lightning
      nextStrike -= dt * cm;
      if (nextStrike <= 0) {
        nextStrike = 2.6 + crand() * 4.5;
        const u = crand();
        fire(u < 0.42 ? 'rift' : u < 0.72 ? 'crawl' : 'sea', 0.8 + crand() * 0.35);
      }
      let st = 0;
      if (strike) {
        strike.t += dt;
        for (const p0 of strike.pulses) {
          const u = strike.t - p0;
          if (u >= 0) st = Math.max(st, u < 0.05 ? 1 : Math.exp(-(u - 0.05) * 9));
        }
        if (strike.t > 1.6) strike = null;
      }
      const kind = strike?.kind ?? 'sea';
      const pw = Math.min(1.4, strike?.power ?? 1);
      boltImg.setAlpha(Math.min(1, st * pw) * (fk < 1 ? 0.6 : 1));
      riftG.setAlpha(Math.min(1, (0.1 + 0.05 * Math.sin(t * 0.7) + st * (kind === 'rift' ? 0.9 : 0.3) * pw) * (fk < 1 ? Math.min(1, 0.4 + 0.6 * fk) : 1)));
      flashS.setAlpha(Math.min(1, st * (kind === 'rift' ? 0.8 : kind === 'crawl' ? 0.38 : 0.18) * pw * fk));
      cloudGlow.setAlpha(st * (kind === 'crawl' ? 0.55 : 0.35) * fk);
      seaGlow.setAlpha(st * (kind === 'sea' ? 0.6 : 0.4) * fk);
      seaGlow.setTint(heave > 0.2 ? 0x8ae8ff : 0xb8c8ff);

      // ——— the fires: a frame loop each, ducking on a stomp; red with Ares's war cry
      for (const f of fires) {
        const d = f.duck.step(0, dt);
        const sy0 = Math.max(0.35, 1 + d * 0.12 + war * 0.35);
        const sx0 = 1 - d * 0.04 + war * 0.15;
        f.blue.alpha = 1 - Math.min(1, war * 1.6) * 0.95;
        f.red.alpha = Math.min(1, war * 1.4);
        f.blue.step(dt, (1 + war) * cm);
        f.red.step(dt, cm);
        f.blue.each((im) => im.setScale(f.s0 * sx0, f.s0 * sy0));
        f.red.each((im) => im.setScale(((f.w / 78) * 1.15) * sx0, ((f.w / 78) * 1.15) * sy0));
        const fl = flicker(t * 1.3, f.seed);
        f.halo.setAlpha((0.16 + 0.06 * fl + st * 0.08 + war * 0.15) * cm + 0.03).setTint(war > 0.3 ? 0xff6a3a : BLUE.glow);
        f.pool.setAlpha((0.1 + 0.04 * fl + war * 0.1) * cm);
        f.rate.tick((3 + war * 14) * cm, dt, () => {
          sparks.spawn({ x: f.f.x + (crand() - 0.5) * f.w * 0.6, y: f.f.y - f.h * (0.2 + crand() * 0.4), vx: (crand() - 0.5) * 30, vy: -60 - crand() * 80, life: 0.5 + crand() * 0.7, r0: 1.4 + crand() * 1.6, r1: 0.3, a: 1, tint: war > 0.3 ? (crand() < 0.5 ? 0xff8a3a : 0xffd080) : crand() < 0.5 ? 0xc8e8ff : 0x6ab8ff, grav: -40, drag: 0.6, streak: 0.02, fade: 0.1 });
        });
      }
      sparks.update(dt);

      // ——— the cloud: the sea drifting, heaving with Poseidon; scud racing over the sky; both lit by the flashes
      const hv = heave * heave;
      for (const w of wisps) {
        const sp = w.v * (1 + hv * 3) * cm;
        w.x += sp * dt;
        const half = WF.w * w.s * (w.sea ? 0.5 : 0.8);
        if (w.x - half > X1) w.x = X0 - half;
        // (faded out before reaching the second columns, which stand outside the storm's slot)
        const edge = sm(X0, X0 + half * 1.1, w.x - half) * sm(X1, X1 - half * 1.1, w.x + half);
        const bob = w.sea ? Math.sin(t * 0.25 + w.seed) * 3 - hv * 18 * (0.4 + w.d) * (0.6 + 0.4 * Math.sin(t * 2.2 + w.seed)) : 0;
        const sc0 = w.sea ? w.s * (1 + hv * 0.25) : w.s;
        w.img.setPosition(w.x, w.y + bob).setScale(w.sea ? sc0 : sc0 * 1.6, sc0);
        w.img.setAlpha(w.a * edge * (w.sea ? 1 : 0.6) * (0.85 + 0.15 * Math.sin(t * 0.3 + w.seed)));
        const lit = Math.min(1, st * (w.sea ? 0.7 : 1));
        const base = w.sea ? 0xffffff : 0x2a3060;
        w.img.setTint(lit > 0.02 ? Phaser.Display.Color.GetColor(...([base >> 16, (base >> 8) & 255, base & 255].map((c) => Math.round(c + (255 - c) * lit)) as [number, number, number])) : base);
      }
      teal.setAlpha(hv * 0.35 * (0.7 + 0.3 * Math.sin(t * 3)));
      for (const g of gapGlows) g.img.setAlpha((0.14 + 0.06 * flicker(t * 0.5, g.seed) + war * 0.12) * cm + 0.03);

      // ——— rain in the rift's light
      rainRate.tick((26 + hv * 60 + st * 20) * cm, dt, () => {
        const x = RF.x - 300 + crand() * 600;
        rain.spawn({ x, y: 70 + crand() * 60, vx: -40 - crand() * 30, vy: 700 + crand() * 300, life: 0.55 + crand() * 0.25, r0: 1.1 + crand() * 0.6, a: 0.3 + st * 0.4, tint: 0xc8d8ff, streak: 0.022, floor: 420 + crand() * 60, fade: 0.05 });
      });
      rain.update(dt);

      // ——— stomps' debris
      chunks.update(dt);
      pebbles.update(dt);
      grit.update(dt);
      dust.update(dt);

      // ——— the gold's shimmer: Hera's cameo, and while her crown is on him
      const sh = Math.max(shimmer, crown * 0.45);
      glintRate.tick(sh * 30 * cm, dt, () => glint());
      glints.update(dt);
      crownGlow.setAlpha((crown * 0.3 + shimmer * 0.3) * (0.8 + 0.2 * Math.sin(t * 4)));
    },
    destroy() {
      unlisten();
    },
  };
});
