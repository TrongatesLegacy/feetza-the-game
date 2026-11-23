// The Ski Slopes (Stage 11, waves 51–54), redrawn with the location kit (src/art/scene): the sun terrace of a
// mid-mountain hut, high on the same range as the lodge, looking across the red run. A big alpine sky over a wall of
// glaciated peaks (the Summit's horn in the middle, the yeti's mountain), lit from the left; our own mountain's
// shoulder with its fir forest; the run itself coming over the crest on the right and sweeping down across the view,
// groomed into corduroy, marked by red poles, three floodlight masts along its lower edge; a chairlift climbing
// through a cut in the forest on the left; the terrace's timber balustrade with snow on its rails, a drift piled
// against it, a trail sign, skis and poles stuck in the snow and a big laden fir on the right. The table is the
// terrace's weathered larch table, a mug of hot chocolate and a pair of goggles on it.
//
// Live, the heroes:
// - the skiers: a racer in a speed suit, a dad in a retro one-piece with a bobble hat and a scarf, a teenage
//   snowboarder in baggy clothes, each painted through a turn cycle on one rig (the body flexing into each turn and
//   extending through the edge change, the skis' angle following the line, the pole planted at each transition, the
//   pom-pom and the scarf following through), coming over the crest small and carving down the run towards us in
//   S-turns, throwing lit powder at the end of each turn, a contact shadow under them; a stomp makes the nearest one
//   wobble (painted windmilling frames) and recover;
// - the chairlift: chairs on two cables in perspective (shrinking up the line, coming back down empty), riders of
//   different builds on the up-line kicking their skis (painted frames), each chair swinging on its hanger, knocked
//   when it rolls over a tower's sheaves, the cables sagging and bouncing; a stomp bounces the whole line;
// - the snow: diamond dust glinting in the sun, a squall of falling snow in two depths, flurries in the floodlights;
//   a stomp shakes snow off the big fir's boughs (clumps falling and bursting into powder) and off the railing.
// Across the stage: a bluebird morning, a warm afternoon with cloud building on the peaks, a snow squall that
// swallows the range, and night skiing under the floodlights and a moon, a piste basher grooming its way up the run.

import Phaser from 'phaser';
import {
  type Air,
  type Ctx,
  type PathFn,
  type R,
  TY,
  W,
  airMix,
  calmLanes,
  castShadow,
  glowAt,
  gradeAll,
  groundShadow,
  haze,
  lightPool,
  polyPath,
  rectPath,
  rrPath,
  solid,
  vfill,
  vignetteAll,
  within,
} from '../../art/scene/kit';
import type { SceneSpec } from '../../art/scene/layers';
import { tableFalloff, tableSeam, planksPlane } from '../../art/scene/materials';
import { drift, lay, noiseMask, softly, surface } from '../../art/scene/paint';
import { cloud, horizonGlow, skyFill, stars, sun } from '../../art/scene/sky';
import { hashStr, mix, rgba, rng, shade } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { Loop, Parts, Rate, Spring, Swing, sheet, steamFrame } from '../../game/sceneAnim';
import { type KitLive, calm, registerKitScene, waveK } from '../../game/sceneLive';
import { conifer, firSilhouette, ridgePath, wave1 } from './sceneBits';
import { type Pt, ik, seg, poly, lit, along } from './scene-rink';

// ——— layout ———

export const SL = {
  front: 1040,
  sun: { x: 300, y: 116, r: 34 },
  /** The far layers' foot (the sky and the range: our own mountain's crest is in front of it). */
  far: 470,
  /** The chairlift: its line from the near end (off the left edge, depth 1) to the far end over the crest. */
  liftA: { x: -90, cable: 196, ground: 700 },
  liftB: { x: 822, cable: 452, ground: 474 },
  liftZ: 8,
  towers: [0.07, 0.27, 0.52, 0.8],
  /** The run's two edges, from the crest down across the view (screen points). */
  pisteUp: [[1340, 462], [1100, 498], [700, 530], [300, 554], [-10, 566]] as Pt[],
  pisteLo: [[1600, 462], [1500, 518], [1200, 570], [820, 608], [400, 630], [-10, 642]] as Pt[],
  /** Floodlight masts along the run's lower edge: foot x, foot y, height. */
  masts: [[1476, 530, 112], [1120, 584, 148], [700, 619, 182]] as [number, number, number][],
  rail: { top: 618, mid: 684, bank: 700, posts: [64, 384, 704, 1024, 1344, 1664] },
  sign: { x: 120, top: 498 },
  skis: { x: 1700 },
  fir: { x: 1866, base: 706, h: 470 },
  mug: { x: 1728, y: 884 },
  goggles: { x: 120, y: 1000 },
};

const P2 = Math.PI * 2;
const FAR = SL.far;
const AIR: Air = { color: '#d2e2f2', far: 0.8 };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** A point on a polyline by x (the run's edges). */
function edgeY(pts: Pt[], x: number): number {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    if ((x <= ax && x >= bx) || (x >= ax && x <= bx)) {
      const t = (x - ax) / (bx - ax || 1);
      return ay + (by - ay) * t;
    }
  }
  return x > pts[0][0] ? pts[0][1] : pts[pts.length - 1][1];
}

/** The chairlift's line at s (0 near … 1 far): screen x, the cable's y, the ground's y under it, and its scale. */
export function liftAt(s: number): { x: number; cy: number; gy: number; k: number } {
  const { liftA: A, liftB: B, liftZ: Z } = SL;
  const z = 1 + s * (Z - 1);
  const t = (1 - 1 / z) / (1 - 1 / Z);
  return { x: lerp(A.x, B.x, t), cy: lerp(A.cable, B.cable, t), gy: lerp(A.ground, B.ground, t), k: 1 / z };
}

/** Our mountain's skyline: the crest the run comes over. */
const crestY = (x: number): number => 452 + wave1(x, 3) * 6 + Math.sin(x / 640) * 5;

// ——— the far scene: sky and range, in three lights ———

export interface View {
  sky: [number, string][];
  air: Air;
  lit: string;
  shade: string;
  rock: string;
  far: string;
  glow?: [number, number, number, string, number];
  sun?: boolean;
  /** Where the sun stands (default the morning's). */
  sunAt?: [number, number, number];
  night?: boolean;
  grey?: boolean;
}

const DAY: View = {
  sky: [[0, '#1c56b0'], [0.3, '#3478cc'], [0.62, '#77aee4'], [0.86, '#b8d8f2'], [1, '#dcecf8']],
  air: AIR,
  lit: '#fff0da',
  shade: '#6a86c4',
  rock: '#2a3150',
  far: '#9cbce6',
  sun: true,
};
const PM: View = {
  sky: [[0, '#2a5aa8'], [0.35, '#5a88c8'], [0.65, '#a8b8d8'], [0.86, '#f0c8b0'], [1, '#ffdcb8']],
  air: { color: '#e8d4d0', far: 0.75 },
  lit: '#ffc8a4',
  shade: '#6a6eb0',
  rock: '#3a3050',
  far: '#c4a8c4',
  sun: true,
  sunAt: [250, 290, 38],
};
const GREY: View = {
  sky: [[0, '#56606e'], [0.4, '#7a8492'], [0.8, '#a2aab4'], [1, '#b8bec6']],
  air: { color: '#b4bcc6', far: 0.92 },
  lit: '#dfe4ea',
  shade: '#8a96a6',
  rock: '#5a6270',
  far: '#a4acb8',
  grey: true,
};
export const NIGHT: View = {
  sky: [[0, '#040816'], [0.45, '#0c1634'], [0.8, '#1c2a52'], [1, '#2a3a64']],
  air: { color: '#26365e', far: 0.7 },
  lit: '#c8d6f4',
  shade: '#34466e',
  rock: '#141a30',
  far: '#2c3c68',
  night: true,
};

/** A summit: its x, its height above the range's foot, its half-widths (left, right) and how concave its flanks are. */
export type Summit = [number, number, number, number, number];
const MAIN: Summit[] = [
  [292, 250, 300, 210, 1.5],
  [470, 150, 80, 120, 0.8],
  [660, 176, 190, 150, 0.7],
  [1058, 336, 250, 160, 1.12],
  [1236, 214, 70, 130, 1.25],
  [1480, 216, 200, 120, 0.85],
  [1600, 190, 70, 90, 1.1],
  [1740, 262, 130, 120, 1.6],
  [1850, 276, 110, 240, 1.35],
];
const FARS: Summit[] = [
  [140, 120, 220, 200, 1.3],
  [760, 150, 240, 220, 1.3],
  [1340, 140, 250, 200, 1.3],
  [1640, 170, 210, 260, 1.3],
];
const bumpOf = (x: number, [cx, h, wl, wr, p]: Summit): number => {
  const d = x - cx;
  const w = d < 0 ? wl : wr;
  const u = 1 - Math.abs(d) / w;
  return u > 0 ? h * u ** p : 0;
};
/** Ridged noise: sharp crests, rounded troughs (towers and notches along a ridge). */
const ridged = (x: number, seed: number): number =>
  (1 - Math.abs(Math.sin(x * 0.021 + seed))) * 0.5 + (1 - Math.abs(Math.sin(x * 0.053 + seed * 1.9))) * 0.3 + (1 - Math.abs(Math.sin(x * 0.13 + seed * 2.7))) * 0.2;
export const topOf = (list: Summit[], foot: number, floor: number, seed: number) => (x: number): number => {
  let h = floor + wave1(x, seed) * 14;
  let tallest = 0;
  for (const s of list) {
    const b = bumpOf(x, s);
    if (b > h) h = b;
    tallest = Math.max(tallest, b);
  }
  // the ridges broken into towers and notches, more so up high
  h += (ridged(x, seed) - 0.5) * (8 + tallest * 0.1);
  return foot - h;
};
const farTop0 = topOf(FARS, 420, 30, 5);
const mainTop0 = topOf(MAIN, FAR + 4, 56, 13);
/** The horn's summit hooked over to the right, its shoulder stepping down. */
const mainTop = (x: number): number => mainTop0(x) - Math.exp(-(((x - 1080) / 20) ** 2)) * 16 - Math.exp(-(((x - 1150) / 26) ** 2)) * 10;
const farTop = farTop0;

/** The slope's facing at x along a skyline (−1 rising to the right, i.e. facing the light on the left … +1). */
export const slopeAt = (top: (x: number) => number, x: number, d = 6): number => (top(x + d) - top(x - d)) / (2 * d);

/**
 * A massif against the sky: snow on every face, the faces turned to the light on the left bright and warm, those
 * turned away cool blue; each summit's arête running down to the right between them; ribs of rock coming down from
 * the ridge (lit on their left flank, a shadowed couloir on their right) and streaks of rock where the snow can't
 * hold, thick up high, thinning out on the gentler slopes below; the ridge's snow catching the light.
 */
export function massif(ctx: Ctx, r: R, top: (x: number) => number, foot: number, list: Summit[], v: View, depth: number, detail: number): void {
  const air = v.air;
  const ridge = ridgePath(0, W, foot + 8, top, 3);
  const litC = airMix(v.lit, depth, air);
  const shadeC = airMix(v.shade, depth, air);
  const rockLit = airMix(mix(v.rock, '#a48a72', v.night ? 0.15 : 0.62), depth, air);
  const rockShade = airMix(v.rock, depth, air);
  const seed = Math.floor(r() * 1000);
  // where the snow can't hold: the steep pitches below the ridges, deepest under the summits, ribs reaching down
  const H = (x: number) => foot - top(x);
  const steepAt = (x: number) => clamp01((Math.abs(slopeAt(top, x, 10)) - 0.35) * 1.5);
  const rockDepth = (x: number): number => {
    const n = 0.5 + 0.5 * wave1(x * 2.3, seed);
    const spikes = Math.abs(Math.sin(x * 0.083 + seed)) ** 5 + Math.abs(Math.sin(x * 0.031 + seed * 2)) ** 7 * 0.6;
    return H(x) * (0.03 + steepAt(x) * (0.14 + 0.22 * n + spikes * 0.3)) * detail;
  };
  const rockZone = (c: Ctx) => {
    c.beginPath();
    c.moveTo(-4, top(-4));
    for (let x = -4; x <= W + 4; x += 3) c.lineTo(x, top(x) - 1);
    for (let x = W + 4; x >= -4; x -= 3) c.lineTo(x, top(x) + rockDepth(x));
    c.closePath();
  };
  // the rock's own pattern, painted the same twice (in shade, then in the light within the lit faces): snow
  // gullies cutting down through it, ribs of rock running on below it, snow ledges across it
  const rockDetail = (rockCol: string, snowCol: string) => {
    const rr = rng(seed + 7);
    rockZone(ctx);
    ctx.fillStyle = rockCol;
    ctx.fill();
    for (let x = 0; x < W; x += (4 + rr() * 8) / detail) {
      const d = rockDepth(x);
      const sl = slopeAt(top, x, 10);
      const ty = top(x);
      if (d > 8) {
        // a gully of snow from inside the rock down out of it
        const y0 = ty + d * (0.1 + rr() * 0.5);
        const len = d * (0.6 + rr() * 0.8);
        const dx = sl * len * 0.12 + (rr() - 0.5) * 4;
        const w0 = (0.8 + rr() * 2.2) * detail;
        ctx.fillStyle = rgba(snowCol, 0.65 + rr() * 0.35);
        ctx.beginPath();
        ctx.moveTo(x - w0, y0 + len);
        ctx.quadraticCurveTo(x - w0 * 1.2 + dx * 0.5, y0 + len * 0.4, x + dx * 0.1, y0);
        ctx.quadraticCurveTo(x + w0 * 1.2 + dx * 0.5, y0 + len * 0.4, x + w0, y0 + len);
        ctx.closePath();
        ctx.fill();
      }
      if (rr() < 0.3 + steepAt(x) * 0.5) {
        // a rib of rock reaching on down the slope below the rock band
        const y0 = ty + d - 2;
        const len = (8 + rr() * 40) * detail * (0.4 + steepAt(x));
        const w0 = (1 + rr() * 2.6) * detail;
        const dx = sl * len * 0.15;
        ctx.fillStyle = rgba(rockCol, 0.6 + rr() * 0.4);
        ctx.beginPath();
        ctx.moveTo(x - w0, y0);
        ctx.quadraticCurveTo(x - w0 * 0.4 + dx * 0.5, y0 + len * 0.6, x + dx, y0 + len);
        ctx.quadraticCurveTo(x + w0 * 0.4 + dx * 0.5, y0 + len * 0.6, x + w0, y0);
        ctx.closePath();
        ctx.fill();
      }
    }
    // cliff bands lower down, each with its ledge of snow on top
    for (let i = 0; i < 22 * detail; i++) {
      const x = rr() * W;
      const hh = H(x);
      if (hh < 80) continue;
      const y = top(x) + hh * (0.25 + rr() * 0.3);
      const w = (20 + rr() * 60) * detail;
      const sl = slopeAt(top, x, 20);
      ctx.fillStyle = rgba(rockCol, 0.7);
      ctx.beginPath();
      ctx.moveTo(x - w / 2, y + sl * -w * 0.25);
      for (let k = 0; k <= 6; k++) ctx.lineTo(x - w / 2 + (k / 6) * w, y + sl * (k / 6 - 0.5) * w * 0.5 - rr() * 2);
      for (let k = 6; k >= 0; k--) ctx.lineTo(x - w / 2 + (k / 6) * w, y + sl * (k / 6 - 0.5) * w * 0.5 + (2 + rr() * 6) * detail);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = rgba(snowCol, 0.8);
      ctx.lineWidth = 1.2 * detail;
      ctx.beginPath();
      ctx.moveTo(x - w / 2, y - 1 + sl * -w * 0.25);
      ctx.lineTo(x + w / 2, y - 1 + sl * w * 0.25);
      ctx.stroke();
    }
  };
  ridge(ctx);
  ctx.fillStyle = shadeC;
  ctx.fill();
  within(ctx, ridge, () => {
    // the shade side: the sky's blue bounced into it, paler low down in the haze
    vfill(ctx, 0, foot - 360, W, 368, [[0, airMix(shade(v.shade, -0.1), depth, air)], [0.7, shadeC], [1, airMix(v.shade, depth + 0.25, air)]]);
    rockDetail(rockShade, airMix(shade(v.shade, 0.12), depth, air));
    // the lit faces: from each summit back along the skyline to its saddle, down to the arête running to the right
    const peaks = list.map(([cx]) => {
      let sx = cx;
      for (let x = cx - 70; x < cx + 70; x += 2) if (top(x) < top(sx)) sx = x;
      return sx;
    });
    const saddle = (a: number, b: number) => {
      let m = a;
      for (let x = a; x < b; x += 3) if (top(x) > top(m)) m = x;
      return m;
    };
    const faces: PathFn[] = [];
    const arete: [number, number, number, number][] = [];
    for (const [i, [, , wl]] of list.entries()) {
      const sx = peaks[i];
      const sy = top(sx);
      const sL = i > 0 ? saddle(peaks[i - 1], sx) : sx - wl * 1.1;
      const sR = i < list.length - 1 ? saddle(sx, peaks[i + 1]) : W + 20;
      const reach = Math.min(sR - sx - 10, (sR - sx) * 0.55);
      const span = foot - sy;
      faces.push((c: Ctx) => {
        c.beginPath();
        c.moveTo(sx, sy);
        for (let x = sx; x > sL; x -= 3) c.lineTo(x, top(x));
        c.lineTo(sL, top(sL));
        c.lineTo(sL, foot + 8);
        c.lineTo(sx + reach, foot + 8);
        c.bezierCurveTo(sx + reach * 0.75, sy + span * 0.6, sx + reach * 0.18, sy + span * 0.28, sx + 1, sy);
        c.closePath();
      });
      arete.push([sx, sy, reach, span]);
    }
    for (const [i, face] of faces.entries()) {
      const [sx, sy, reach] = arete[i];
      ctx.save();
      face(ctx);
      ctx.clip();
      const g = ctx.createLinearGradient(sx - 120, sy, sx + reach * 0.2, foot);
      g.addColorStop(0, litC);
      g.addColorStop(0.55, airMix(mix(v.lit, v.shade, 0.2), depth + 0.05, air));
      g.addColorStop(1, airMix(mix(v.lit, v.shade, 0.45), depth + 0.2, air));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, foot + 10);
      rockDetail(rockLit, litC);
      ctx.restore();
    }
    // the arêtes: a hard edge where the lit face turns into the shade
    for (const [sx, sy, reach, span] of arete) {
      ctx.strokeStyle = rgba(rockShade, 0.5);
      ctx.lineWidth = 2 * detail;
      ctx.beginPath();
      ctx.moveTo(sx + 2, sy + 1);
      ctx.bezierCurveTo(sx + reach * 0.18 + 2, sy + span * 0.28, sx + reach * 0.75 + 2, sy + span * 0.6, sx + reach + 2, foot + 8);
      ctx.stroke();
    }
    // wind-slab texture on the snow, and the haze lying in the valleys at the range's foot
    lay(ctx, noiseMask(16, 51, { cover: 0.4, soft: 0.4, col: shadeC, w: 320, h: 60 }), { x: 0, y: foot - 300, w: W, h: 300 }, 0.16);
    vfill(ctx, 0, foot - 110, W, 118, [[0, rgba(air.color, 0)], [1, rgba(air.color, 0.75)]]);
  });
  // the snow along the ridges catching the light, where they face it
  ctx.strokeStyle = rgba(v.lit, v.night ? 0.45 : 0.8);
  ctx.lineWidth = 1.6 * detail;
  ctx.beginPath();
  for (let x = 0; x < W; x += 3) {
    if (slopeAt(top, x, 5) < -0.04 && top(x) < foot - 40) ctx.lineTo(x, top(x) + 1.2);
    else ctx.moveTo(x, top(x) + 1.2);
  }
  ctx.stroke();
}

function farRange(ctx: Ctx, r: R, v: View): void {
  // the back range fading into the sky's blue
  const skyAir: Air = { color: mix(v.sky[3][1], v.air.color, 0.4), far: 0.9 };
  massif(ctx, r, farTop, 420, FARS, { ...v, air: skyAir, lit: mix(v.lit, v.far, 0.25), shade: v.far }, 0.85, 0.6);
}

function mainRange(ctx: Ctx, r: R, v: View): void {
  massif(ctx, r, mainTop, FAR + 4, MAIN, v, 0.34, 1);
}

function farScene(ctx: Ctx, r: R, v: View): void {
  const box = { x: 0, y: 0, w: W, h: FAR };
  skyFill(ctx, box, v.sky, 0.04);
  lay(ctx, drift(shade(v.sky[2][1], 0.15), shade(v.sky[0][1], -0.1), 3, 91, 160, 48), box, 0.12);
  if (v.sun) {
    // the sun's warmth through the thin air round it, the sky paling towards the range
    const [sx, sy, sr] = v.sunAt ?? [SL.sun.x, SL.sun.y, SL.sun.r];
    glowAt(ctx, sx, sy + 30, 900, v.sunAt ? '#ffc890' : '#fff2d6', v.sunAt ? 0.3 : 0.18, 0.8);
    horizonGlow(ctx, FAR - 40, 150, '#eef6fc', 0.45);
    sun(ctx, sx, sy, sr, { disc: v.sunAt ? '#fff2d0' : '#fffcf0', glow: v.sunAt ? '#ffc070' : '#ffe8b8', a: 1, bloom: 14, squash: v.sunAt ? 0.6 : 1 });
    glowAt(ctx, sx, sy, 160, v.sunAt ? '#ffd8a0' : '#fff4d8', 0.18);
  }
  if (v.night) {
    stars(ctx, r, { x: 0, y: 0, w: W, h: 300 }, 260, '#eef2ff');
    // the moon high on the left (the key stays on that side), its halo in the thin cold air
    glowAt(ctx, 360, 124, 260, '#a8b8ff', 0.2);
    ctx.fillStyle = '#f4f2e6';
    ctx.beginPath();
    ctx.arc(360, 124, 26, 0, P2);
    ctx.fill();
    ctx.fillStyle = rgba('#a6a490', 0.35);
    for (const [dx, dy, rr] of [[-8, -6, 6], [6, 5, 5], [-3, 11, 3.5], [10, -8, 3]] as const) {
      ctx.beginPath();
      ctx.arc(360 + dx, 124 + dy, rr, 0, P2);
      ctx.fill();
    }
    // the resort's light on the low cloud over the valley
    horizonGlow(ctx, FAR - 20, 120, '#5a5a8a', 0.4);
  }
  if (v.grey) {
    // the squall's lid: low nimbostratus rolls, rain-dark in their middles
    for (let i = 0; i < 10; i++) {
      cloud(ctx, r, r() * W, 40 + i * 24 + r() * 16, 500 + r() * 500, 40 + r() * 30, { kind: 'stratus', lit: '#b4bcc6', body: '#6a7482', shadow: '#3e4652', sunX: SL.sun.x, sunY: SL.sun.y, rim: 0.2, wisp: 0.5, a: 0.75 });
    }
  }
  farRange(ctx, r, v);
  mainRange(ctx, r, v);
  if (v.grey) {
    // the squall coming down over the range: a veil of falling snow burying the summits, the nearer ridges ghosting
    // through it, darker where the cloud base hangs lowest
    vfill(ctx, 0, 60, W, FAR - 60, [[0, 'rgba(140,148,160,0.9)'], [0.45, 'rgba(156,164,176,0.82)'], [0.8, 'rgba(172,180,192,0.62)'], [1, 'rgba(184,192,202,0.5)']]);
    lay(ctx, noiseMask(6, 57, { cover: 0.5, soft: 0.6, col: '#6e7684', w: 160, h: 48 }), { x: 0, y: 40, w: W, h: 260 }, 0.35);
    for (let i = 0; i < 7; i++) cloud(ctx, r, r() * W, 300 + r() * 150, 420 + r() * 300, 40 + r() * 30, { kind: 'bank', lit: '#c8ced6', body: '#a0a8b4', shadow: '#7a8290', sunX: SL.sun.x, sunY: SL.sun.y, a: 0.5, depth: 0.4 });
  }
  if (v.night) {
    // the floodlit run's glow on the air over the crest
    glowAt(ctx, 1200, FAR + 30, 520, '#ffd9a0', 0.14, 0.4);
  }
}

/** The fair-weather clouds (a moving sprite): cumulus heaping round the peaks, a banner streaming off the horn. */
function cloudsDay(ctx: Ctx, r: R): void {
  const o = { lit: '#ffffff', body: '#e6eef8', shadow: '#8ea2c4', sunX: SL.sun.x, sunY: SL.sun.y, rim: 0.6, wisp: 0.45, air: AIR };
  cloud(ctx, r, 1420, 196, 360, 86, { ...o, kind: 'cumulus', depth: 0.5 });
  cloud(ctx, r, 1700, 150, 260, 60, { ...o, kind: 'cumulus', depth: 0.55 });
  cloud(ctx, r, 700, 190, 300, 64, { ...o, kind: 'cumulus', depth: 0.5 });
  cloud(ctx, r, 160, 260, 220, 40, { ...o, kind: 'cumulus', depth: 0.65 });
  // the horn's banner cloud: torn off its summit by the wind and streaming away on its lee side, feathered
  softly(ctx, { x: 1040, y: 100, w: 360, h: 130 }, (g) => {
    for (let i = 0; i < 16; i++) {
      const u = i / 15;
      const x = 1090 + u * 230 + (r() - 0.5) * 20;
      const y = 150 + u * 26 + (r() - 0.5) * 14;
      const rad = 16 + Math.sin(u * Math.PI) * 26 + r() * 10;
      const a = 0.55 * (1 - u * 0.75);
      const rg = g.createRadialGradient(x - rad * 0.3, y - rad * 0.3, 0, x, y, rad);
      rg.addColorStop(0, `rgba(255,255,255,${a.toFixed(3)})`);
      rg.addColorStop(0.6, `rgba(232,240,250,${(a * 0.5).toFixed(3)})`);
      rg.addColorStop(1, 'rgba(220,232,248,0)');
      g.fillStyle = rg;
      g.save();
      g.translate(x, y);
      g.scale(1.6, 0.6);
      g.translate(-x, -y);
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      g.restore();
    }
  }, 0.25);
}

/** The afternoon's cloud (live only, the second wave): cumulus building up off the peaks, their sunward faces gold,
 * a cap of cloud on the horn, low cloud lying along the range's foot. */
function cloudsPM(ctx: Ctx, r: R): void {
  const o = { lit: '#fff0d4', body: '#ece4ea', shadow: '#8a8eb4', sunX: SL.sun.x - 200, sunY: SL.sun.y + 260, rim: 0.7, wisp: 0.4, air: AIR };
  cloud(ctx, r, 470, 392, 380, 112, { ...o, kind: 'cumulus', depth: 0.45 });
  cloud(ctx, r, 1340, 372, 440, 128, { ...o, kind: 'cumulus', depth: 0.4 });
  cloud(ctx, r, 1780, 330, 260, 92, { ...o, kind: 'cumulus', depth: 0.5 });
  cloud(ctx, r, 1110, 250, 300, 120, { ...o, kind: 'cumulus', depth: 0.45 });
  cloud(ctx, r, 1066, 178, 190, 34, { ...o, kind: 'stratus', depth: 0.45, wisp: 0.6, a: 0.85 });
  cloud(ctx, r, 800, 350, 280, 84, { ...o, kind: 'cumulus', depth: 0.55, a: 0.9 });
  softly(ctx, { x: 0, y: 360, w: W, h: 110 }, (g) => {
    const lg = g.createLinearGradient(0, 360, 0, 470);
    lg.addColorStop(0, 'rgba(250,236,226,0)');
    lg.addColorStop(0.6, 'rgba(250,236,226,0.55)');
    lg.addColorStop(1, 'rgba(250,236,226,0.2)');
    g.fillStyle = lg;
    g.fillRect(0, 360, W, 110);
  }, 0.25);
}

// ——— our mountain: the crest, the forest, the run ———

interface FirOpts {
  depth: number;
  snow: number;
  big?: boolean;
}
const FIR = { dark: '#081c20', mid: '#163834', lit: '#3c6a4e' };
const FAR_AIR: Air = { color: '#c4d6ee', far: 0.95 };
const SNOW = { lit: '#fbfdff', body: '#e2eaf6', shade: '#a8bcdc', deep: '#8099c4' };

/** A fir standing in the snow, its shadow thrown down and to the right over the snow, a powder well at its foot. */
function fir(ctx: Ctx, r: R, x: number, y: number, h: number, o: FirOpts): void {
  // each its own: some leaning a little, some slimmer or fuller, cooler and paler the further off they stand
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((r() - 0.5) * 0.09);
  ctx.translate(-x, -y);
  snowFir(ctx, r, x, y, h, h * (0.34 + r() * 0.2), o.depth, o.snow, FAR_AIR);
  ctx.restore();
  // snow drifted round its foot
  ctx.fillStyle = airMix(SNOW.body, o.depth * 0.8, AIR);
  ctx.beginPath();
  ctx.ellipse(x, y + 1, h * 0.16, Math.max(1.5, h * 0.03), 0, Math.PI, 0);
  ctx.fill();
}

/**
 * A snow-laden fir: tiers of drooping needle skirts, dark green in their own shade, each carrying a layer of snow on
 * its upper face (lit and warm on the left, blue where it turns away), a fringe of needles under each hem, a lit
 * edge on the left, seen through the air with distance.
 */
export function snowFir(ctx: Ctx, r: R, x: number, base: number, h: number, w: number, depth: number, snow: number, air: Air = AIR, cols: { dark: string; mid: string; lit: string; snow: string; snowShade: string } = { dark: FIR.dark, mid: FIR.mid, lit: FIR.lit, snow: SNOW.lit, snowShade: SNOW.shade }): void {
  const n = Math.max(4, Math.round(h / 13));
  const top = base - h;
  const dark = airMix(cols.dark, depth, air);
  const mid = airMix(cols.mid, depth, air);
  const litC = airMix(cols.lit, depth, air);
  const sLit = airMix(cols.snow, depth * 0.7, air);
  const sSh = airMix(cols.snowShade, depth * 0.7, air);
  ctx.fillStyle = dark;
  ctx.fillRect(x - w * 0.04, base - h * 0.12, w * 0.08, h * 0.12);
  for (let i = 0; i < n; i++) {
    const t0 = i / n;
    const t1 = Math.min(1, (i + 1.6) / n);
    const ty = top + t0 * h * 0.88;
    const by = top + t1 * h * 0.9;
    const hw = (w / 2) * (0.14 + 0.86 * t1) * (0.88 + r() * 0.24);
    const droop = (by - ty) * 0.3;
    const lean = (r() - 0.5) * hw * 0.12;
    // the skirt: down from the tier's top to a scalloped hem, drooping at its tips
    const k = 3 + Math.floor(r() * 2);
    const hem: Pt[] = [];
    for (let j = 0; j <= k; j++) {
      const u = -1 + (2 * j) / k;
      hem.push([x + lean + hw * u, by + droop * (Math.abs(u) > 0.9 ? 1 : 0.3 * (1 - Math.abs(u))) + (r() - 0.5) * droop * 0.4]);
    }
    const skirt = (c: Ctx) => {
      c.beginPath();
      c.moveTo(x, ty);
      c.quadraticCurveTo(x - hw * 0.4, (ty + by) / 2, hem[0][0], hem[0][1]);
      for (let j = 1; j < hem.length; j++) c.quadraticCurveTo((hem[j - 1][0] + hem[j][0]) / 2, Math.min(hem[j - 1][1], hem[j][1]) - droop * 0.25, hem[j][0], hem[j][1]);
      c.quadraticCurveTo(x + hw * 0.4, (ty + by) / 2, x, ty);
      c.closePath();
    };
    const g = ctx.createLinearGradient(x - hw, ty, x + hw, by);
    g.addColorStop(0, litC);
    g.addColorStop(0.45, mid);
    g.addColorStop(1, dark);
    ctx.fillStyle = g;
    skirt(ctx);
    ctx.fill();
    // needles fringing the hem
    ctx.strokeStyle = dark;
    ctx.lineWidth = Math.max(0.8, w * 0.014);
    ctx.beginPath();
    for (let j = 0; j < 6 + hw * 0.2; j++) {
      const u = -0.95 + 1.9 * r();
      const nx = x + lean + hw * u;
      const ny = by + droop * 0.3 * (1 - Math.abs(u)) + (Math.abs(u) > 0.85 ? droop * 0.8 : 0);
      ctx.moveTo(nx, ny - 2);
      ctx.lineTo(nx + (u < 0 ? -1 : 1) * 1.5, ny + 2 + r() * 3);
    }
    ctx.stroke();
    if (snow > 0) {
      // the snow lying on the tier's upper face: from near its top out along the boughs, thicker in the middle
      const cover = 0.5 + snow * 0.25;
      const sy = ty + (by - ty) * 0.08;
      const ey = ty + (by - ty) * cover;
      const shw = hw * (0.25 + cover * 0.62);
      const cap = (c: Ctx) => {
        c.beginPath();
        c.moveTo(x, sy);
        c.quadraticCurveTo(x - shw * 0.5, (sy + ey) / 2 - 1, x - shw, ey + droop * 0.5);
        // the snow's lower edge: lobed, hanging off the boughs
        for (let j = 1; j <= 4; j++) {
          const u = -1 + j / 2;
          const lx = x + lean * 0.5 + shw * u;
          c.quadraticCurveTo(lx - shw * 0.25, ey + droop * 0.15 + (by - ty) * 0.12 * r(), lx, ey + (Math.abs(u) > 0.9 ? droop * 0.5 : -droop * 0.1));
        }
        c.quadraticCurveTo(x + shw * 0.5, (sy + ey) / 2 - 1, x, sy);
        c.closePath();
      };
      const sg = ctx.createLinearGradient(x - shw, sy, x + shw, ey);
      sg.addColorStop(0, sLit);
      sg.addColorStop(0.5, mix(sLit, sSh, 0.3));
      sg.addColorStop(1, sSh);
      ctx.fillStyle = sg;
      cap(ctx);
      ctx.fill();
    }
  }
}

/** The crest the run comes over: a long snowfield with the forest's ragged top along it. */
function crestRidge(ctx: Ctx, r: R): void {
  const p = ridgePath(0, W, 640, crestY, 4);
  p(ctx);
  ctx.fillStyle = SNOW.body;
  ctx.fill();
  within(ctx, p, () => {
    vfill(ctx, 0, 440, W, 60, [[0, rgba(SNOW.lit, 0.9)], [0.4, rgba(SNOW.body, 0)], [1, rgba(SNOW.shade, 0.25)]]);
    // the wind's ripples along the crest, lit on the left
    for (let i = 0; i < 40; i++) {
      const x = r() * W;
      const y = crestY(x) + 4 + r() * 20;
      ctx.strokeStyle = rgba(SNOW.shade, 0.35);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 20, y - 2, x + 46, y + 1);
      ctx.stroke();
    }
  });
  // the far edge of the forest along the crest (left of the run, and to the right of it)
  const trees: [number, number, number][] = [];
  for (let x = -20; x < W + 20; x += 9 + r() * 12) {
    if (x > 1290 && x < 1640) continue;
    const lift = Math.abs(x - liftAt(0.9).x) < 26;
    if (lift) continue;
    trees.push([x, crestY(x) + 2 + r() * 8, 18 + r() * 22]);
  }
  for (const [x, y, h] of trees) firSilhouette(ctx, r, x, y, h, h * 0.42, airMix(FIR.mid, 0.6, AIR), airMix(SNOW.lit, 0.3, AIR), 0.55);
  haze(ctx, 430, 480, '#e6eef8', 0.35, 0.8);
}

/** The run: groomed snow between its edges, corduroy running down its fall line, the berms of loose snow at its
 * edges, ski tracks, red marker poles. */
function piste(ctx: Ctx, r: R): void {
  const U = SL.pisteUp;
  const L = SL.pisteLo;
  const path = polyPath([...U, ...[...L].reverse()]);
  // the groomed snow: brighter and smoother than the loose snow round it
  path(ctx);
  const g = ctx.createLinearGradient(0, 460, 0, 650);
  g.addColorStop(0, '#f2f6fc');
  g.addColorStop(1, '#e4ecf8');
  ctx.fillStyle = g;
  ctx.fill();
  within(ctx, path, () => {
    // corduroy: fine ridges running down the fall line, converging up towards the crest
    const top0: Pt = U[0];
    const top1: Pt = L[0];
    const bot0: Pt = U[U.length - 1];
    const bot1: Pt = L[L.length - 1];
    for (let i = 0; i <= 90; i++) {
      const f = i / 90;
      const a: Pt = [lerp(top0[0], top1[0], f), lerp(top0[1], top1[1], f)];
      const b: Pt = [lerp(bot0[0], bot1[0], f), lerp(bot0[1], bot1[1], f)];
      const m: Pt = [lerp(a[0], b[0], 0.45) - 40 * Math.sin(f * 3), lerp(a[1], b[1], 0.45) + 18];
      ctx.strokeStyle = rgba(i % 2 ? '#8ea4cc' : '#ffffff', i % 2 ? 0.3 : 0.5);
      ctx.lineWidth = 1 + f * 1.2;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.quadraticCurveTo(m[0], m[1], b[0], b[1]);
      ctx.stroke();
    }
    // the sun across it, the shade of the forest along its upper edge
    // the sun's warmth on the snow it reaches, the run a touch quieter behind the lanes
    lightPool(ctx, 500, 580, 800, 110, '#ffe6c0', 0.2, 'screen');
    lightPool(ctx, 960, 560, 520, 70, '#8aa0cc', 0.1, 'source-over');
    for (let x = -10; x < 1350; x += 20) {
      const y = edgeY(U, x);
      ctx.fillStyle = rgba(SNOW.deep, 0.22);
      ctx.beginPath();
      ctx.ellipse(x + 20, y + 6, 26, 7, 0.12, 0, P2);
      ctx.fill();
    }
    // ski tracks: long S-curves cut down the corduroy, the sun catching their lit lips
    for (let k = 0; k < 5; k++) {
      let x = 1440 - k * 30 + r() * 40;
      let y = 470;
      const amp = 20 + r() * 20;
      const ph = r() * P2;
      ctx.strokeStyle = rgba('#8aa0c8', 0.35);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let u = 0; u <= 1; u += 0.01) {
        const cx = lerp(1460, 260, u);
        const cy = lerp(472, 610, u ** 0.9);
        const s = 0.25 + u * 0.75;
        x = cx + Math.sin(u * 14 + ph) * amp * 0.25 * s;
        y = cy + Math.sin(u * 14 + ph) * amp * s + (k - 2) * 8 * s;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    lay(ctx, noiseMask(24, 61, { cover: 0.3, soft: 0.3, col: '#b4c4e0', w: 320, h: 48 }), { x: 0, y: 460, w: 1620, h: 190 }, 0.14);
  });
  // the berms of loose snow along its edges: a lit lip, a shadow on the groomed side
  for (const [pts, up] of [[U, true], [L, false]] as const) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgba(up ? SNOW.shade : '#ffffff', up ? 0.6 : 0.8);
    ctx.lineWidth = up ? 3 : 2.4;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + (up ? 2 : -1)) : ctx.moveTo(x, y + (up ? 2 : -1))));
    ctx.stroke();
  }
  // the red marker poles along both edges, shrinking up the run
  for (const [pts, n] of [[U, 9], [L, 10]] as const) {
    for (let i = 0; i < n; i++) {
      const u = (i / (n - 1)) ** 1.6;
      const x = lerp(pts[0][0], pts[pts.length - 1][0] + 60, u);
      const y = edgeY(pts, x) + (pts === L ? 2 : -1);
      const h = 7 + u * 30;
      const w = Math.max(1.2, h * 0.07);
      ctx.fillStyle = rgba(SNOW.deep, 0.4);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + h * 0.7, y + h * 0.08);
      ctx.lineTo(x + h * 0.7, y + h * 0.12);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#c82a22';
      ctx.fillRect(x - w / 2, y - h, w, h);
      ctx.fillStyle = '#fff4ee';
      ctx.fillRect(x - w / 2, y - h * 0.62, w, h * 0.12);
      ctx.fillStyle = 'rgba(255,220,200,0.5)';
      ctx.fillRect(x - w / 2, y - h, w * 0.4, h);
    }
  }
}

/** A floodlight mast (unlit by day): a galvanised pole on a concrete foot, a head of four lamps facing down the run. */
function mast(ctx: Ctx, x: number, y: number, h: number): void {
  const k = h / 180;
  const top = y - h;
  ctx.fillStyle = rgba(SNOW.deep, 0.35);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + h * 0.8, y + h * 0.08);
  ctx.lineTo(x + h * 0.8, y + h * 0.1);
  ctx.lineTo(x, y + 3);
  ctx.closePath();
  ctx.fill();
  const pole = polyPath([[x - 4 * k, y], [x - 2.4 * k, top + 10 * k], [x + 2.4 * k, top + 10 * k], [x + 4 * k, y]]);
  solid(ctx, pole, { x: x - 6, y: top, w: 12, h }, 'iron', '#9aa2aa', { depth: 0.35, air: AIR, line: Math.max(1, 1.6 * k), formSize: 3 });
  // the head: a bar with four lamp housings, their glass catching the sky
  const bar = rectPath(x - 18 * k, top, 36 * k, 4 * k);
  solid(ctx, bar, { x: x - 20 * k, y: top - 2, w: 40 * k, h: 8 * k }, 'iron', '#7a8088', { depth: 0.35, air: AIR, line: Math.max(1, 1.2 * k), formSize: 2 });
  for (let i = 0; i < 4; i++) {
    const lx = x - 15 * k + i * 10 * k;
    const lamp = rrPath(lx - 4 * k, top - 9 * k, 8 * k, 9 * k, 2 * k);
    solid(ctx, lamp, { x: lx - 5 * k, y: top - 10 * k, w: 10 * k, h: 11 * k }, 'iron', '#5a6068', { depth: 0.35, air: AIR, line: Math.max(1, 1 * k), formSize: 2 });
    ctx.fillStyle = rgba('#dfe8f4', 0.8);
    ctx.fillRect(lx - 3 * k, top - 2.5 * k, 6 * k, 1.6 * k);
  }
  // the concrete foot in its well of snow
  ctx.fillStyle = '#b8bcc4';
  ctx.fillRect(x - 7 * k, y - 6 * k, 14 * k, 6 * k);
  ctx.fillStyle = rgba(SNOW.body, 1);
  ctx.beginPath();
  ctx.ellipse(x, y, 14 * k, 3.5 * k, 0, Math.PI, 0);
  ctx.fill();
}

/** Our mountainside: snow from the crest down to the terrace (its rolls lit and shaded, wind-ripples), the forest
 * on the upper left (cut by the lift line), the run, the open snow below it with a few firs, the forest on the right,
 * the floodlight masts. */
function mountain(ctx: Ctx, r: R): void {
  crestRidge(ctx, r);
  // the snow below the crest: rolls of drift lit on the left, the slope falling into the cool shade towards us
  ctx.save();
  const below = ridgePath(0, W, 722, (x) => crestY(x) + 14, 8);
  below(ctx);
  ctx.clip();
  surface(ctx, r, { x: 0, y: 450, w: W, h: 272 }, '#e4ecf8', { vary: 0.35, warm: '#fffaf0', cool: '#b0c2e0', cells: 6, mottle: 0.25, strokes: 0.3, strokeAng: 0.08, strokeLen: 200, grain: 0.06, seed: 23 });
  vfill(ctx, 0, 450, W, 272, [[0, 'rgba(255,255,255,0)'], [0.5, rgba(SNOW.shade, 0.12)], [1, rgba(SNOW.deep, 0.3)]]);
  for (let i = 0; i < 9; i++) {
    const x = r() * W;
    const y = 520 + r() * 120;
    const w = 200 + r() * 260;
    ctx.fillStyle = rgba('#ffffff', 0.22);
    ctx.beginPath();
    ctx.ellipse(x - w * 0.15, y - 8, w * 0.5, 10, -0.03, 0, P2);
    ctx.fill();
    ctx.fillStyle = rgba(SNOW.deep, 0.14);
    ctx.beginPath();
    ctx.ellipse(x + w * 0.2, y + 6, w * 0.5, 9, -0.03, 0, P2);
    ctx.fill();
  }
  // the sun's warmth on the left, the cool on the right
  const lg = ctx.createLinearGradient(0, 0, W, 0);
  lg.addColorStop(0, 'rgba(255,226,180,0.22)');
  lg.addColorStop(0.5, 'rgba(255,236,206,0)');
  lg.addColorStop(1, 'rgba(90,120,190,0.12)');
  ctx.fillStyle = lg;
  ctx.fillRect(0, 440, W, 282);
  ctx.restore();
  // the open snow below the run, falling away towards us out of the sun: cooler, wind-lumped powder
  const lowP = polyPath([...SL.pisteLo, [-10, 720], [W + 10, 720], [W + 10, 462]]);
  within(ctx, lowP, () => {
    vfill(ctx, 0, 470, W, 250, [[0, rgba(SNOW.shade, 0.12)], [0.5, rgba(SNOW.shade, 0.3)], [1, rgba(SNOW.deep, 0.4)]]);
    for (let i = 0; i < 70; i++) {
      const x = r() * W;
      const y = edgeY(SL.pisteLo, Math.min(x, 1600)) + 6 + r() * 120;
      if (y > SL.rail.top) continue;
      const s = 0.3 + (y - 470) / 200;
      ctx.fillStyle = rgba('#ffffff', 0.3);
      ctx.beginPath();
      ctx.ellipse(x - 4 * s, y - 2 * s, 22 * s, 4 * s, 0, 0, P2);
      ctx.fill();
      ctx.fillStyle = rgba(SNOW.deep, 0.22);
      ctx.beginPath();
      ctx.ellipse(x + 8 * s, y + 3 * s, 22 * s, 4 * s, 0, 0, P2);
      ctx.fill();
    }
    // fresh tracks in the powder: a snowboarder's carve and a skier's line off the run
    ctx.strokeStyle = rgba('#7088bc', 0.35);
    ctx.lineWidth = 2.4;
    for (const [x0, y0, x1, y1, a] of [[1440, 530, 1060, 628, 14], [1260, 568, 860, 640, 10]] as const) {
      ctx.beginPath();
      for (let u = 0; u <= 1; u += 0.02) ctx.lineTo(lerp(x0, x1, u) + Math.sin(u * 9) * a * 0.3, lerp(y0, y1, u) + Math.sin(u * 9) * a * (0.4 + u));
      ctx.stroke();
    }
  });
  piste(ctx, r);
  // the forest between the crest and the run, on the upper left: stands of firs with glades between them, the lift
  // line cut through
  const trees: [number, number, number][] = [];
  const hAt = (y: number) => Math.max(16, (y - 436) * 0.82);
  const inCut = (x: number, y: number) => {
    const t = (x - SL.liftA.x) / (SL.liftB.x - SL.liftA.x);
    const gy = lerp(SL.liftA.ground, SL.liftB.ground, t);
    return x > 60 && x < 850 && Math.abs(y - gy) < 8 + (y - 466) * 0.3;
  };
  for (let cx = -40; cx < 1330; ) {
    const cw = 50 + r() * 150;
    const n = Math.round(cw / (6 + r() * 4));
    for (let i = 0; i < n; i++) {
      const x = cx + r() * cw;
      const y0 = crestY(x) + 6;
      const y1 = edgeY(SL.pisteUp, x) - 3;
      if (y1 < y0 + 4) continue;
      // thicker towards the run's edge, a ragged top
      const y = lerp(y0, y1, Math.sqrt(r()));
      if (inCut(x, y)) continue;
      trees.push([x, y, hAt(y) * (0.55 + r() * 0.8)]);
    }
    cx += cw + 6 + r() * 50;
  }
  // a line of firs along the run's upper edge (the forest's edge)
  for (let x = -20; x < 1300; x += 26 + r() * 40) {
    const y = edgeY(SL.pisteUp, x) - 2 - r() * 6;
    if (!inCut(x, y)) trees.push([x, y, hAt(y) * (0.8 + r() * 0.5)]);
  }
  // the forest on the right, down the far side of the run to the terrace
  for (let i = 0; i < 40; i++) {
    const x = 1580 + r() * 360;
    const top = edgeY(SL.pisteLo, Math.min(x, 1600)) + (x - 1580) * 0.15;
    const y = top + r() ** 0.8 * (680 - top);
    trees.push([x, y, hAt(y) * (0.7 + r() * 0.5)]);
  }
  // a stand and a few firs alone in the open snow below the run
  for (const [x, y, h] of [[1004, 640, 96], [1044, 650, 70], [980, 652, 60], [1330, 612, 88], [1356, 618, 60]] as const) trees.push([x, y, h]);
  // their shadows first, long and blue across the snow (the run's upper edge in the forest's shade)
  for (const [x, y, h] of trees) {
    const w = h * 0.34;
    const near = clamp01((y - 460) / 200);
    ctx.fillStyle = rgba(airMix('#5a78b4', 0.5 - near * 0.4, AIR), 0.34);
    ctx.beginPath();
    ctx.moveTo(x - w * 0.5, y);
    ctx.quadraticCurveTo(x + h * 0.7, y + h * 0.06, x + h * 1.6, y + h * 0.34);
    ctx.quadraticCurveTo(x + h * 0.75, y + h * 0.22, x + w * 0.4, y + h * 0.05);
    ctx.closePath();
    ctx.fill();
  }
  trees.sort((a, b) => a[1] - b[1]);
  for (const [x, y, h] of trees) fir(ctx, r, x, y, h, { depth: 0.75 - clamp01((y - 460) / 170) * 0.68, snow: 0.45 });
  for (const s of SL.towers) {
    const p = liftAt(s);
    towerShadow(ctx, p.x, p.gy, p.gy - p.cy, p.k, 0.15 + (1 - p.k) * 0.6);
  }
  for (const [x, y, h] of SL.masts) mast(ctx, x, y, h);
  haze(ctx, 460, 520, '#f0f4fa', 0.25, 0.3);
}

// ——— the chairlift ———

const STEEL = '#8a969c';

/** A lift tower at its scale k: a tapered steel tube on a concrete foot, a maintenance ladder, the crossarm with
 * its catwalk and a sheave train at each end (the cables run through them), lit from the left. Drawn about its foot
 * (0, 0), its top at (0, -h). */
export function tower(ctx: Ctx, h: number, k: number, depth: number): void {
  const air = AIR;
  const bw = 15 * k;
  const tw = 10 * k;
  const tube = polyPath([[-bw, 0], [-tw, -h + 20 * k], [tw, -h + 20 * k], [bw, 0]]);
  solid(ctx, tube, { x: -bw - 2, y: -h, w: bw * 2 + 4, h }, 'iron', STEEL, { depth, air, line: lineW(k), formSize: 6 * k });
  within(ctx, tube, () => {
    // bolted flanges where the sections join, a rust run under each
    for (const u of [0.33, 0.66]) {
      const y = -h * u;
      ctx.fillStyle = rgba('#2a3036', 0.6);
      ctx.fillRect(-bw, y - 2 * k, bw * 2, 3 * k);
      ctx.fillStyle = rgba('#e8eef4', 0.35);
      ctx.fillRect(-bw, y - 3 * k, bw * 2, 1.2 * k);
      ctx.fillStyle = rgba('#8a4a2a', 0.2);
      ctx.fillRect(-bw * 0.4, y, 2 * k, 14 * k);
    }
  });
  // the ladder up its right side
  ctx.strokeStyle = airMix('#3a4248', depth, air);
  ctx.lineWidth = Math.max(0.8, 1.4 * k);
  ctx.beginPath();
  ctx.moveTo(bw + 3 * k, -4 * k);
  ctx.lineTo(tw + 3 * k, -h + 26 * k);
  ctx.moveTo(bw + 9 * k, -4 * k);
  ctx.lineTo(tw + 9 * k, -h + 26 * k);
  for (let y = -10 * k; y > -h + 30 * k; y -= 9 * k) {
    const u = -y / h;
    const x0 = lerp(bw, tw, u) + 3 * k;
    ctx.moveTo(x0, y);
    ctx.lineTo(x0 + 6 * k, y);
  }
  ctx.stroke();
  // the crossarm, its catwalk railing, the sheave trains under each end
  const arm = rectPath(-78 * k, -h, 156 * k, 9 * k);
  solid(ctx, arm, { x: -80 * k, y: -h - 2, w: 160 * k, h: 12 * k }, 'iron', shade(STEEL, -0.1), { depth, air, line: lineW(k), formSize: 3 * k });
  ctx.strokeStyle = airMix('#3a4248', depth, air);
  ctx.lineWidth = Math.max(0.7, 1.1 * k);
  ctx.beginPath();
  ctx.moveTo(-74 * k, -h);
  ctx.lineTo(-74 * k, -h - 12 * k);
  ctx.lineTo(74 * k, -h - 12 * k);
  ctx.lineTo(74 * k, -h);
  for (let x = -54; x <= 54; x += 27) {
    ctx.moveTo(x * k, -h);
    ctx.lineTo(x * k, -h - 12 * k);
  }
  ctx.stroke();
  for (const sx of [-64, 64]) {
    const tr = rrPath((sx - 16) * k, -h + 8 * k, 32 * k, 7 * k, 3 * k);
    solid(ctx, tr, { x: (sx - 18) * k, y: -h + 6 * k, w: 36 * k, h: 11 * k }, 'iron', '#5a6268', { depth, air, line: lineW(k) * 0.8, formSize: 2 * k });
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = airMix('#20262a', depth, air);
      ctx.beginPath();
      ctx.arc((sx - 12 + i * 8) * k, -h + 15 * k, 3.4 * k, 0, P2);
      ctx.fill();
      ctx.fillStyle = airMix('#b8c2ca', depth, air);
      ctx.beginPath();
      ctx.arc((sx - 12.6 + i * 8) * k, -h + 14.4 * k, 1.4 * k, 0, P2);
      ctx.fill();
    }
  }
  // snow on the crossarm and the catwalk, the concrete foot in its well of snow
  ctx.fillStyle = SNOW.lit;
  ctx.beginPath();
  ctx.ellipse(-30 * k, -h, 44 * k, 2.6 * k, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = airMix('#c4c6cc', depth, air);
  ctx.fillRect(-bw * 1.4, -6 * k, bw * 2.8, 6 * k);
  ctx.fillStyle = airMix(SNOW.body, depth * 0.8, air);
  ctx.beginPath();
  ctx.ellipse(0, 1, bw * 2.6, 5 * k, 0, Math.PI, 0);
  ctx.fill();
}
const lineW = (k: number) => Math.max(0.9, 2.6 * k);

/** A tower's shadow on the snow (painted with the mountainside: the towers themselves are live). */
function towerShadow(ctx: Ctx, x: number, y: number, h: number, k: number, depth: number): void {
  const bw = 15 * k;
  ctx.fillStyle = rgba(airMix('#5a78b4', depth, AIR), 0.34);
  ctx.beginPath();
  ctx.moveTo(x - bw, y);
  ctx.lineTo(x + h * 1.3, y + h * 0.2);
  ctx.lineTo(x + h * 1.3 + 30 * k, y + h * 0.22);
  ctx.lineTo(x + bw, y + 2);
  ctx.closePath();
  ctx.fill();
}

/** The tower foot's lateral cable offset (the up-line on the right, the down-line on the left) at scale k. */
export const CABLE_OFF = 64;
/** A chair's hanger length at scale 1 (grip on the cable to the seat). */
export const HANG = 92;

/** The cable's sag between towers (and from the left edge to the first): extra y at s. */
export function sagAt(s: number): number {
  const ts = [-0.2, ...SL.towers, 1.2];
  for (let i = 0; i < ts.length - 1; i++) {
    if (s >= ts[i] && s <= ts[i + 1]) {
      const u = (s - ts[i]) / (ts[i + 1] - ts[i]);
      const k = liftAt(s).k;
      return Math.sin(u * Math.PI) * 26 * k * (ts[i + 1] - ts[i]) * 3;
    }
  }
  return 0;
}

/** The cables (still): two lines through the towers' sheave trains, sagging between them. */
function cablesStill(ctx: Ctx): void {
  for (const side of [-1, 1]) {
    ctx.strokeStyle = '#1e2428';
    ctx.beginPath();
    for (let s = -0.02; s <= 1.0001; s += 0.005) {
      const p = liftAt(s);
      const x = p.x + side * CABLE_OFF * p.k;
      const y = p.cy + 14 * p.k + sagAt(s);
      ctx.lineWidth = Math.max(0.8, 3 * p.k);
      if (s <= -0.015) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

// ——— figures: one rig for the skiers, the snowboarder and the lift's riders ———

const INK = '#141a28';

export interface Kit {
  skin: string;
  suit: string;
  suit2: string;
  pants: string;
  hat: string;
  hat2?: string;
  boot: string;
  ski: string;
  ski2: string;
  goggles: string;
  /** helmet, a bobble hat (its pom-pom follows through), a beanie. */
  head: 'helmet' | 'bobble' | 'beanie';
  scarf?: string;
  board?: boolean;
}
export interface Build {
  s: number;
  hip: number;
  thigh: number;
  shin: number;
  torso: number;
  head: number;
  chest: number;
  belly: number;
  /** Forward lean, how deep the flex into each turn, the skis' length, the arms' spread. */
  lean: number;
  flex: number;
  ski: number;
  arms: number;
  w: number;
}

export const BUILDS: Record<'racer' | 'dad' | 'board', Build> = {
  racer: { s: 1, hip: 50, thigh: 27, shin: 27, torso: 34, head: 8.5, chest: 9, belly: 0, lean: 0.62, flex: 1, ski: 118, arms: 0.4, w: 0.95 },
  dad: { s: 1, hip: 54, thigh: 26, shin: 27, torso: 34, head: 9.6, chest: 12, belly: 6, lean: 0.24, flex: 0.6, ski: 98, arms: 1, w: 1.02 },
  board: { s: 1, hip: 50, thigh: 28, shin: 27, torso: 33, head: 9, chest: 10.5, belly: 0, lean: 0.1, flex: 0.8, ski: 104, arms: 1, w: 1.15 },
};
export const KITS: Record<'racer' | 'dad' | 'board', Kit> = {
  racer: { skin: '#e8b48e', suit: '#d42a2a', suit2: '#f4f2ee', pants: '#d42a2a', hat: '#f4f2ee', hat2: '#d42a2a', boot: '#f2f2f0', ski: '#1a1c22', ski2: '#e8c020', goggles: '#ffb020', head: 'helmet' },
  dad: { skin: '#f0c0a0', suit: '#1a9a9a', suit2: '#e8388a', pants: '#1a9a9a', hat: '#e8388a', hat2: '#ffd030', boot: '#3a3a44', ski: '#f2f0e8', ski2: '#2a6ad0', goggles: '#a0e0ff', head: 'bobble', scarf: '#ffd030' },
  board: { skin: '#a8724e', suit: '#d8a028', suit2: '#3a3020', pants: '#5a6a3a', hat: '#3a3a4e', hat2: '#e85a2a', boot: '#2a2a30', ski: '#6a3aa0', ski2: '#40e0c0', goggles: '#ff70c0', head: 'beanie', board: true },
};

/** A skier's frame: fw × fh at paint size, the feet on the snow at (ox, base), facing right (travelling right). */
export const SKF = { fw: 160, fh: 146, ox: 80, base: 132, n: 10, wob: 6, k: 0.72 };

/** A pose through the turn cycle (ph 0…1: two turns; edge changes at 0 and 0.5, the deepest flex at 0.25 and 0.75),
 * or the windmilling wobble (wob 0…1) after a stomp. Joints are relative to the feet on the snow. */
function skierPose(ph: number, b: Build, wob = -1) {
  const t = ph * P2;
  // deep in the turn at each apex, extending tall through the edge change between
  const fl = Math.sin(t) ** 2 * b.flex;
  const ext = Math.cos(t) ** 2;
  // the flail after a stomp: windmilling, the hips thrown back and out, then a recovery (wk fades it out)
  const wf = wob >= 0 ? wob : 0;
  const wk = wob < 0 ? 0 : wob < 0.66 ? 1 : 1 - ((wob - 0.66) / 0.34) * 0.8;
  const whirl = wf * P2 * 1.6;
  // the skis' visible pitch follows the line: tips up while the turn carries across and up the screen, down while
  // it drops towards us (level at each apex, where the body is deepest in the turn)
  const pitch = Math.cos(t) * 0.2 * (1 - wk) + wk * Math.sin(whirl) * 0.16;
  const hipH = b.hip * (1 - 0.3 * fl + 0.04 * ext * b.flex) - wk * (5 + 5 * Math.sin(wf * Math.PI));
  const back = -wk * (8 + Math.sin(whirl * 1.3) * 5);
  const hip: Pt = [-5 * fl + back + 2, -hipH];
  const lean = b.lean + fl * 0.28 - ext * 0.06 + wk * (-b.lean - 0.3 + Math.sin(whirl) * 0.25);
  const sh = along(hip, Math.PI - lean, b.torso);
  const headC = along(sh, Math.PI - lean * 0.5 + wk * Math.sin(whirl * 1.4) * 0.3, b.head + 4.5);
  // the feet: on the skis at the binding, the far one a little back and higher (seen past the near)
  const ankleN: Pt = [0, -7];
  const ankleF: Pt = [-5 - wk * 6 * Math.sin(whirl), -9 - wk * 5 * Math.max(0, Math.sin(whirl))];
  const kneeN = ik(hip, ankleN, b.thigh, b.shin);
  const kneeF = ik([hip[0] - 3, hip[1] - 1], ankleF, b.thigh, b.shin);
  // the arms reaching forward, the downhill pole planted at each edge change
  const plant = (q: number) => Math.max(0, Math.cos(((((ph - q) % 1) + 1) % 1) * P2)) ** 6;
  const pn = plant(0.22) * (1 - wk);
  const pf = plant(0.72) * (1 - wk);
  const spread = b.arms;
  const armOf = (base: number, p: number, side: number) => {
    let a = base + p * 0.45 + fl * 0.15;
    let bend = 0.6 - p * 0.2 + fl * 0.2;
    if (wk > 0) {
      // windmilling: both arms whirling round the shoulder, out of step, the elbows loose
      a = lerp(a, whirl * 1.3 + (side > 0 ? 0.6 : 3.0), wk);
      bend = lerp(bend, 0.35 + Math.sin(whirl + side) * 0.3, wk);
    }
    const el = along(sh, a, 17 * (0.9 + spread * 0.1));
    const hand = along(el, a + bend, 15);
    return { el, hand, plant: p };
  };
  const near = armOf(0.55 + spread * 0.25, pn, 1);
  const far = armOf(0.45 + spread * 0.15, pf, -1);
  return { hip, sh, headC, lean, kneeN, kneeF, ankleN, ankleF, near, far, pitch, fl, t, wk, whirl };
}

/** Ski (or board) along x at the feet, pitched; a tip turned up at the front, tail at the back. */
function skiShape(c: Ctx, x: number, y: number, len: number, pitch: number, col: string, top: string, dim: number, board: boolean): void {
  c.save();
  c.translate(x, y);
  c.rotate(-pitch);
  const th = board ? 5 : 3.2;
  const tipL = len * 0.56;
  const tailL = len * 0.44;
  const p = (g: Ctx) => {
    g.beginPath();
    g.moveTo(-tailL, -th / 2);
    g.lineTo(tipL - 12, -th / 2);
    g.quadraticCurveTo(tipL - 2, -th / 2, tipL + 2, -th / 2 - 7);
    g.quadraticCurveTo(tipL + 3, -th / 2 - 3, tipL - 4, th / 2);
    g.lineTo(-tailL + (board ? 6 : 0), th / 2);
    if (board) g.quadraticCurveTo(-tailL - 4, th / 2, -tailL - 6, -th / 2 - 5);
    g.closePath();
  };
  c.lineWidth = 2;
  c.strokeStyle = INK;
  p(c);
  c.stroke();
  const g = c.createLinearGradient(0, -th, 0, th);
  g.addColorStop(0, shade(top, 0.15 + dim));
  g.addColorStop(0.5, shade(col, dim));
  g.addColorStop(1, shade(col, -0.35 + dim));
  c.fillStyle = g;
  p(c);
  c.fill();
  c.fillStyle = rgba('#ffffff', 0.45);
  c.fillRect(-tailL + 6, -th / 2, len * 0.7, 1);
  c.restore();
}

function boot(c: Ctx, x: number, y: number, col: string, dim: number): void {
  poly(c, [[x - 6, y + 1], [x - 6, y - 12], [x + 2, y - 14], [x + 5, y - 6], [x + 10, y - 3], [x + 10, y + 1]], lit(c, [x - 6, y - 12], [x + 10, y], 7, shade(col, dim)), 1.8);
}

/** The head: goggles strapped round it, a helmet, a bobble hat with its pom-pom lagging, or a beanie. */
function skierHead(c: Ctx, P: ReturnType<typeof skierPose>, b: Build, o: Kit, lag: number): void {
  const [hx, hy] = P.headC;
  const r = b.head;
  c.fillStyle = INK;
  c.beginPath();
  c.arc(hx, hy, r + 1.3, 0, P2);
  c.fill();
  const fg = c.createRadialGradient(hx - r * 0.35, hy - r * 0.4, 1, hx, hy, r);
  fg.addColorStop(0, shade(o.skin, 0.14));
  fg.addColorStop(1, shade(o.skin, -0.2));
  c.fillStyle = fg;
  c.beginPath();
  c.arc(hx, hy, r, 0, P2);
  c.fill();
  // the nose and chin, a cold-pink cheek, the mouth
  c.fillStyle = shade(o.skin, -0.02);
  c.strokeStyle = INK;
  c.lineWidth = 1.1;
  c.beginPath();
  c.moveTo(hx + r * 0.84, hy - r * 0.05);
  c.lineTo(hx + r * 1.2, hy + r * 0.3);
  c.lineTo(hx + r * 0.86, hy + r * 0.42);
  c.fill();
  c.stroke();
  c.fillStyle = 'rgba(236,80,100,0.42)';
  c.beginPath();
  c.arc(hx + r * 0.38, hy + r * 0.42, r * 0.26, 0, P2);
  c.fill();
  c.strokeStyle = INK;
  c.lineWidth = 1.2;
  c.beginPath();
  c.arc(hx + r * 0.58, hy + r * 0.52, r * 0.22, 0.2, 1.6);
  c.stroke();
  // the hat or helmet
  const cap = (col: string, h: number) => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI * (0.96 + (i / 12) * 1.08);
      pts.push([hx + Math.cos(a) * (r + 2), hy - 2 + Math.sin(a) * (r + h)]);
    }
    poly(c, pts, lit(c, [hx - r, hy - r], [hx + r, hy - r], r, col), 1.8);
  };
  if (o.head === 'helmet') {
    cap(o.hat, 3.5);
    c.fillStyle = o.hat2 ?? o.suit;
    c.beginPath();
    c.ellipse(hx - r * 0.1, hy - r * 0.75, r * 0.9, r * 0.22, -0.15, 0, P2);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.65)';
    c.beginPath();
    c.ellipse(hx - r * 0.35, hy - r * 0.95, r * 0.4, r * 0.13, -0.3, 0, P2);
    c.fill();
  } else if (o.head === 'bobble') {
    cap(o.hat, 3);
    // the turned-up brim in its stripe, the pom-pom on top lagging the body's bob
    c.fillStyle = o.hat2 ?? '#ffffff';
    c.fillRect(hx - r - 1, hy - r * 0.45, r * 2 + 2, r * 0.3);
    const px = hx - r * 0.3 - lag * 3;
    const py = hy - r * 1.55 - lag * 1.5;
    seg(c, [hx - r * 0.1, hy - r * 1.1], [px, py], 2.5, 2, o.hat);
    c.fillStyle = INK;
    c.beginPath();
    c.arc(px, py, r * 0.5, 0, P2);
    c.fill();
    const pg = c.createRadialGradient(px - 2, py - 2, 0, px, py, r * 0.45);
    pg.addColorStop(0, shade(o.hat2 ?? '#ffffff', 0.3));
    pg.addColorStop(1, shade(o.hat2 ?? '#ffffff', -0.15));
    c.fillStyle = pg;
    c.beginPath();
    c.arc(px, py, r * 0.42, 0, P2);
    c.fill();
  } else {
    // a slouchy beanie, its tail flopping back
    cap(o.hat, 3.5);
    poly(c, [[hx - r * 0.6, hy - r * 1.05], [hx - r * 1.7 - lag * 2, hy - r * 0.6 + lag], [hx - r * 0.95, hy - r * 0.15]], lit(c, [hx - r, hy - r], [hx - 2 * r, hy], r, o.hat), 1.6);
    c.fillStyle = o.hat2 ?? '#ffffff';
    c.fillRect(hx - r * 0.2, hy - r * 1.02, r * 0.7, r * 0.22);
  }
  // goggles: a strap round the head, the lens mirrored with the sky
  c.fillStyle = INK;
  c.fillRect(hx - r - 1, hy - r * 0.32, r * 1.6, r * 0.3);
  c.beginPath();
  c.ellipse(hx + r * 0.62, hy - r * 0.18, r * 0.5, r * 0.36, 0.1, 0, P2);
  c.fill();
  const gg = c.createLinearGradient(hx + r * 0.3, hy - r * 0.5, hx + r, hy + r * 0.1);
  gg.addColorStop(0, shade(o.goggles, 0.4));
  gg.addColorStop(0.5, o.goggles);
  gg.addColorStop(1, shade(o.goggles, -0.4));
  c.fillStyle = gg;
  c.beginPath();
  c.ellipse(hx + r * 0.64, hy - r * 0.18, r * 0.38, r * 0.25, 0.1, 0, P2);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.8)';
  c.fillRect(hx + r * 0.45, hy - r * 0.32, r * 0.3, 1.2);
}

/** One frame of a skier (ph through the turn cycle, or the wobble), facing right, at paint size. */
export function skierFrame(c: Ctx, ph: number, b: Build, o: Kit, wob = -1): void {
  c.save();
  c.translate(SKF.ox, SKF.base);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  const P = skierPose(ph, b, wob);
  const W0 = b.w;
  const lag = Math.sin(P.t * 2 - 1.2);
  const legCol = (dim: number) => shade(o.pants, dim);
  if (o.board) {
    // the board under both feet, side on; the rider stands across it (front on): knees driven down and apart into
    // each turn, rising through the edge change; hips and shoulders counter-rotating; the flail throws the hips out
    const wk = P.wk;
    const feet: [Pt, Pt] = [[-20, -8], [20, -8]];
    const sink = P.fl * 14 + wk * 8;
    const hip: Pt = [Math.sin(P.t) * 4 - wk * Math.sin(P.whirl) * 9, -b.hip + sink + 4];
    skiShape(c, 0, -2, b.ski, P.pitch * 0.8, o.ski, o.ski2, 0, true);
    for (const [i, f] of feet.entries()) {
      const hp: Pt = [hip[0] + (i ? 8 : -8), hip[1]];
      // front on, the knees bend towards us: seen as the legs shortening and the knees opening out over the board
      const knee: Pt = [lerp(hp[0], f[0], 0.45) + (i ? 1 : -1) * (2 + 9 * P.fl + wk * 4), lerp(hp[1], f[1], 0.5) + 2];
      seg(c, hp, knee, 14 * W0, 10 * W0, legCol(i ? 0 : -0.2));
      seg(c, knee, f, 10.5 * W0, 8 * W0, legCol(i ? 0 : -0.2));
      // baggy trousers bunched at the knee
      c.fillStyle = rgba(shade(o.pants, -0.35), 0.7);
      c.beginPath();
      c.ellipse(knee[0], knee[1] + 1, 4, 2, (i ? -1 : 1) * 0.6, 0, P2);
      c.fill();
      boot(c, f[0] - 2, f[1] + 5, o.boot, 0);
    }
    // the torso front on, its shoulders counter-rotated against the hips (seen as the shoulder line tilting and
    // swinging the other way), a baggy jacket lit from the left
    const twist = -Math.sin(P.t) * 0.22 + wk * Math.sin(P.whirl * 1.2) * 0.35;
    const sh: Pt = [hip[0] - Math.sin(P.t) * 5, hip[1] - b.torso + P.fl * 2];
    const shL: Pt = [sh[0] - b.chest, sh[1] + Math.sin(twist) * b.chest];
    const shR: Pt = [sh[0] + b.chest, sh[1] - Math.sin(twist) * b.chest];
    const body: Pt[] = [[hip[0] - 13, hip[1] + 5], [shL[0] - 2, shL[1] + 6], [shL[0] + 2, shL[1] - 2], [shR[0] - 2, shR[1] - 2], [shR[0] + 2, shR[1] + 6], [hip[0] + 13, hip[1] + 5]];
    poly(c, body, lit(c, [sh[0] - 10, sh[1]], [hip[0] + 10, hip[1]], 12, o.suit), 2.2);
    within(c, polyPath(body), () => {
      c.strokeStyle = rgba(shade(o.suit, -0.35), 0.7);
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(sh[0], sh[1] + 2);
      c.lineTo(hip[0], hip[1] + 4);
      c.stroke();
      c.fillStyle = o.suit2;
      c.fillRect(hip[0] - 14, hip[1] - 9, 28, 4);
      // folds of the baggy jacket across the belly, the light on the left
      c.strokeStyle = rgba(shade(o.suit, -0.25), 0.6);
      c.lineWidth = 1.2;
      for (const u of [0.35, 0.6]) {
        c.beginPath();
        c.moveTo(lerp(shL[0], hip[0] - 12, u), lerp(shL[1], hip[1], u));
        c.quadraticCurveTo(lerp(sh[0], hip[0], u), lerp(sh[1], hip[1], u) + 3, lerp(shR[0], hip[0] + 12, u), lerp(shR[1], hip[1], u));
        c.stroke();
      }
      c.fillStyle = 'rgba(255,255,255,0.25)';
      c.fillRect(shL[0] + 2, shL[1] + 2, 5, b.torso * 0.6);
    });
    // the arms: the leading one reaching down the run with the elbow bent, the trailing one back and low; in the
    // flail both whirl
    const lead = (s0: Pt, sd: number) => {
      let a1 = sd > 0 ? 1.9 + Math.sin(P.t) * 0.3 + P.fl * 0.3 : -1.2 - Math.sin(P.t) * 0.3;
      let bend = sd > 0 ? -0.9 - P.fl * 0.3 : 0.7 + P.fl * 0.2;
      if (wk > 0) {
        a1 = lerp(a1, P.whirl * 1.3 * sd + (sd > 0 ? 2 : -2), wk);
        bend = lerp(bend, 0.4 * sd, wk);
      }
      const el = along(s0, a1, 15);
      const ha = along(el, a1 + bend, 14);
      seg(c, s0, el, 10 * W0, 8.5 * W0, o.suit);
      seg(c, el, ha, 8.5 * W0, 7 * W0, o.suit);
      c.fillStyle = INK;
      c.beginPath();
      c.arc(ha[0], ha[1], 4.8, 0, P2);
      c.fill();
      c.fillStyle = shade(o.suit2, 0.1);
      c.beginPath();
      c.arc(ha[0], ha[1], 3.6, 0, P2);
      c.fill();
    };
    lead([shL[0] + 3, shL[1] + 3], -1);
    lead([shR[0] - 3, shR[1] + 3], 1);
    const head: ReturnType<typeof skierPose> = { ...P, headC: [sh[0] + 1 + Math.sin(twist) * 3, sh[1] - b.head - 3] };
    seg(c, sh, [sh[0], sh[1] - 4], 6, 6, o.skin);
    skierHead(c, head, b, o, lag);
    c.restore();
    return;
  }
  // far side first: the far pole and arm, the far ski and leg
  const pole = (A: ReturnType<typeof skierPose>['near'], dim: number) => {
    const hand = A.hand;
    const tip: Pt = A.plant > 0.15 ? [hand[0] + 18 + A.plant * 6, 0] : [hand[0] - 34, hand[1] + 32];
    const len = Math.hypot(tip[0] - hand[0], tip[1] - hand[1]);
    const end: Pt = [hand[0] + ((tip[0] - hand[0]) * 52) / len, hand[1] + ((tip[1] - hand[1]) * 52) / len];
    c.strokeStyle = INK;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(hand[0], hand[1] - 3);
    c.lineTo(end[0], end[1]);
    c.stroke();
    c.strokeStyle = shade('#c8ccd4', dim);
    c.lineWidth = 1.5;
    c.stroke();
    c.strokeStyle = INK;
    c.lineWidth = 1.2;
    c.beginPath();
    const bx = hand[0] + (end[0] - hand[0]) * 0.9;
    const by = hand[1] + (end[1] - hand[1]) * 0.9;
    c.ellipse(bx, by, 4, 1.5, 0, 0, P2);
    c.stroke();
  };
  const arm = (A: ReturnType<typeof skierPose>['near'], dim: number) => {
    const col = shade(o.suit, dim);
    seg(c, P.sh, A.el, 8.5 * W0, 7 * W0, col);
    seg(c, A.el, A.hand, 7 * W0, 6 * W0, col);
    c.fillStyle = INK;
    c.beginPath();
    c.arc(A.hand[0], A.hand[1], 4.6, 0, P2);
    c.fill();
    c.fillStyle = shade(o.suit2, dim);
    c.beginPath();
    c.arc(A.hand[0], A.hand[1], 3.4, 0, P2);
    c.fill();
  };
  if (P.wk < 0.5) pole(P.far, -0.3);
  arm(P.far, -0.3);
  skiShape(c, P.ankleF[0] + 2, -2.5, b.ski, P.pitch, o.ski, o.ski2, -0.25, false);
  const hipF: Pt = [P.hip[0] - 3, P.hip[1] - 1];
  seg(c, hipF, P.kneeF, 12 * W0, 9.5 * W0, legCol(-0.3));
  seg(c, P.kneeF, P.ankleF, 9.5 * W0, 8 * W0, legCol(-0.3));
  boot(c, P.ankleF[0], P.ankleF[1] + 6, o.boot, -0.25);
  // the scarf's tail streaming back behind the shoulders, flapping
  if (o.scarf) {
    // a ribbon of knit streaming back from the neck, a wave running down it (lagging the body)
    const s0 = along(P.sh, Math.PI - P.lean, -3);
    const pts: Pt[] = [];
    for (let i = 0; i <= 8; i++) {
      const u = i / 8;
      pts.push([s0[0] - u * 30, s0[1] + u * 6 + Math.sin(P.t * 4 - u * 5) * 4 * u]);
    }
    const wd = (u: number) => 4.5 - u * 1.5;
    const ribbon: Pt[] = [...pts.map(([x, y], i) => [x, y - wd(i / 8)] as Pt), ...pts.map(([x, y], i) => [x, y + wd(i / 8)] as Pt).reverse()];
    poly(c, ribbon, lit(c, s0, pts[8], 5, o.scarf), 1.5);
    // its stripes and fringe
    for (const i of [3, 6]) {
      c.strokeStyle = shade(o.scarf, -0.35);
      c.lineWidth = 1.6;
      c.beginPath();
      c.moveTo(pts[i][0], pts[i][1] - wd(i / 8) + 0.8);
      c.lineTo(pts[i][0], pts[i][1] + wd(i / 8) - 0.8);
      c.stroke();
    }
    c.strokeStyle = shade(o.scarf, -0.2);
    c.lineWidth = 1.2;
    c.beginPath();
    for (let k = -1; k <= 1; k++) {
      c.moveTo(pts[8][0], pts[8][1] + k * 2);
      c.lineTo(pts[8][0] - 5, pts[8][1] + k * 2.6 + Math.sin(P.t * 4 + k) * 1.5);
    }
    c.stroke();
  }
  // the torso: chest, waist, the dad's belly, lit across
  const ang = Math.PI - P.lean;
  const ax = Math.sin(ang);
  const ay = Math.cos(ang);
  const px = -ay;
  const py = ax;
  const at = (t: number, wd: number): Pt => [P.hip[0] + ax * b.torso * t + px * wd, P.hip[1] + ay * b.torso * t + py * wd];
  const body: Pt[] = [at(-0.1, -9), at(0.4, -b.chest * 0.9), at(0.82, -b.chest), at(1.04, -b.chest * 0.5), at(1.06, b.chest * 0.45), at(0.82, b.chest * 0.95), at(0.45, b.chest * 0.8 + b.belly), at(0.1, 9 + b.belly * 0.6), at(-0.1, 9)];
  const tg = c.createLinearGradient(P.sh[0] - 12, P.sh[1] - 8, P.hip[0] + 12, P.hip[1] + 8);
  tg.addColorStop(0, shade(o.suit, 0.22));
  tg.addColorStop(0.5, o.suit);
  tg.addColorStop(1, mix(shade(o.suit, -0.32), '#1a2040', 0.2));
  poly(c, body, tg, 2.3);
  within(c, polyPath(body), () => {
    // a racing suit's panels, the one-piece's chest stripe, a zip
    c.strokeStyle = o.suit2;
    c.lineCap = 'butt';
    if (o.head === 'helmet') {
      c.lineWidth = 5;
      c.beginPath();
      c.moveTo(...at(0.1, -12));
      c.lineTo(...at(0.95, 2));
      c.stroke();
    } else {
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(...at(0.7, -14));
      c.lineTo(...at(0.7, 16));
      c.stroke();
      c.strokeStyle = shade(o.suit2, 0.3);
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(...at(0.6, -14));
      c.lineTo(...at(0.6, 16));
      c.stroke();
    }
    c.lineCap = 'round';
    c.strokeStyle = rgba('#ffffff', 0.3);
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(...at(0.2, -b.chest * 0.5));
    c.lineTo(...at(0.85, -b.chest * 0.6));
    c.stroke();
  });
  // the near leg, ski, boot
  skiShape(c, P.ankleN[0] + 2, -1, b.ski, P.pitch, o.ski, o.ski2, 0, false);
  seg(c, P.hip, P.kneeN, 12.5 * W0, 10 * W0, legCol(0));
  seg(c, P.kneeN, P.ankleN, 10 * W0, 8.5 * W0, legCol(0));
  if (o.head === 'helmet') {
    // the racer's shin guards
    seg(c, [lerp(P.kneeN[0], P.ankleN[0], 0.15), lerp(P.kneeN[1], P.ankleN[1], 0.15)], [lerp(P.kneeN[0], P.ankleN[0], 0.7), lerp(P.kneeN[1], P.ankleN[1], 0.7)], 9, 8, '#2a2a30');
  }
  boot(c, P.ankleN[0], P.ankleN[1] + 6, o.boot, 0);
  // neck, head, the near arm and pole over everything
  seg(c, P.sh, [P.headC[0] - 2, P.headC[1] + b.head * 0.6], 5.5, 5, shade(o.suit, -0.1));
  skierHead(c, P, b, o, lag);
  if (P.wk < 0.5) pole(P.near, 0);
  arm(P.near, 0.04);
  c.restore();
}

// ——— the lift's chairs and riders ———

/** A chair and its riders: fw × fh at scale 1, the grip on the cable at (ox, 6). */
export const CHF = { fw: 100, fh: 150, ox: 50, n: 6, k: 0.7 };
export type Who = 'broad' | 'slim' | 'kid' | 'board' | 'solo' | 'none';
export type Riders = Who[];
/** A rider's jacket, their helmet or hat, the gear hanging under them, and what's on their head. */
export interface RiderKit {
  jacket: string;
  hat: string;
  gear: string;
  head: 'helmet' | 'beanie' | 'hood';
  hair?: string;
  /** Points out the run now and then. */
  point?: boolean;
}
/** The pairs riding up: two adults chatting (heads turning to each other), a parent pointing out the run to a kid
 * who can't keep their legs still, a snowboarder with the board hanging off one foot beside a skier, and someone
 * riding alone, leaning back with an arm along the backrest. */
export const RIDERS: { who: Riders; kits: RiderKit[] }[] = [
  { who: ['broad', 'slim'], kits: [{ jacket: '#2a5ad0', hat: '#f2f0e8', gear: '#f2f0e8', head: 'helmet' }, { jacket: '#e8402a', hat: '#2a2a30', gear: '#2a2a30', head: 'helmet', hair: '#e8b050' }] },
  { who: ['broad', 'kid'], kits: [{ jacket: '#3a8a4a', hat: '#ffd030', gear: '#ffd030', head: 'helmet', point: true }, { jacket: '#ff7ab0', hat: '#7a3ab0', gear: '#f2f0f8', head: 'beanie' }] },
  { who: ['board', 'broad'], kits: [{ jacket: '#6a4a9a', hat: '#6a4a9a', gear: '#40e0c0', head: 'hood' }, { jacket: '#f0b020', hat: '#2a2a30', gear: '#2a2a30', head: 'helmet' }] },
  { who: ['none', 'solo'], kits: [{ jacket: '#000000', hat: '#000000', gear: '#000000', head: 'helmet' }, { jacket: '#1a1a26', hat: '#e8388a', gear: '#e8388a', head: 'beanie', hair: '#3a2418' }] },
];

/** A rider seen from behind, seated: sloped shoulders in a padded jacket, a hood bunched at the collar, elbows out to
 * the bar (or an arm raised to point, or laid along the backrest), the head in its helmet or hat, turning to talk. */
function rider(c: Ctx, x0: number, seatY: number, w: Who, o: RiderKit, ph: number, i: number, partner: number): void {
  const s = w === 'kid' ? 0.74 : 1;
  const broad = w === 'broad' ? 1.16 : w === 'slim' ? 0.9 : w === 'board' ? 1.08 : 1;
  const t = ph * P2;
  // a breath and a bounce with the cable
  const bob = Math.sin(t + i * 2.1) * 0.6;
  const sy = seatY - 4;
  const top = sy - 30 * s + bob * 0.4 + (w === 'solo' ? 2 : 0);
  const sw = 12 * s * broad;
  // the shoulders shifting as the chair sways and they settle
  const shift = Math.sin(t + i * 1.3) * 1.6;
  // talking: the head turns to the partner and back; the kid fidgets; the solo rider looks out at the view
  const turn = w === 'solo' ? 0.55 + Math.sin(t) * 0.4 : w === 'kid' ? Math.sin(t * 2) * 0.8 : partner * 1.2 * Math.max(0, Math.sin(t + (i ? 1.4 : 0))) ** 1.5;
  const jg = (a: Pt, b: Pt, wd: number) => lit(c, a, b, wd, o.jacket);
  // arms behind the body first: the far elbow out to the bar
  const arm = (sd: number, raise: number) => {
    const sh: Pt = [x0 + sd * (sw - 2), top + 6 * s];
    if (raise > 0) {
      // pointing out the run: the arm up and out, the mitten's finger extended
      const el: Pt = [x0 + sd * (sw + 6 * s), top - 6 * s * raise];
      const ha: Pt = [x0 + sd * (sw + 14 * s), top - 20 * s * raise];
      seg(c, sh, el, 8 * s, 7 * s, shade(o.jacket, -0.05));
      seg(c, el, ha, 7 * s, 6 * s, shade(o.jacket, -0.05));
      c.fillStyle = INK;
      c.beginPath();
      c.arc(ha[0], ha[1], 4.2 * s, 0, P2);
      c.fill();
      c.fillStyle = shade(o.hat, -0.1);
      c.beginPath();
      c.arc(ha[0], ha[1], 3 * s, 0, P2);
      c.fill();
      return;
    }
    if (w === 'solo' && sd < 0) {
      // the arm laid along the backrest
      const el: Pt = [x0 + sd * (sw + 8), top + 12];
      const ha: Pt = [x0 + sd * (sw + 20), top + 16];
      seg(c, sh, el, 8, 7, shade(o.jacket, -0.1));
      seg(c, el, ha, 7, 6, shade(o.jacket, -0.1));
      return;
    }
    seg(c, sh, [x0 + sd * (sw + 4 * s), top + 18 * s], 8 * s, 7 * s, shade(o.jacket, -0.12));
  };
  const point = o.point ? Math.max(0, Math.sin(t - 0.6)) ** 1.5 : 0;
  arm(-1, 0);
  arm(1, point);
  // the back of the jacket: padded, a seam down the middle, a quilting line, the hem bunched on the seat
  const back: Pt[] = [[x0 - sw + 1, sy + 2], [x0 - sw - 1.5 + shift, top + 9 * s + shift * 0.4], [x0 - sw + 3 * s + shift, top + 1 + shift * 0.5], [x0 - 4 * s + shift, top - 1], [x0 + 4 * s + shift, top - 1], [x0 + sw - 3 * s + shift, top + 1 - shift * 0.5], [x0 + sw + 1.5 + shift, top + 9 * s - shift * 0.4], [x0 + sw - 1, sy + 2]];
  poly(c, back, jg([x0 - sw, top], [x0 + sw, sy], sw), 1.8);
  within(c, polyPath(back), () => {
    c.strokeStyle = rgba(shade(o.jacket, -0.35), 0.7);
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(x0, top + 2);
    c.lineTo(x0, sy);
    for (const u of [0.38, 0.68]) {
      c.moveTo(x0 - sw, top + (sy - top) * u);
      c.quadraticCurveTo(x0, top + (sy - top) * u + 2, x0 + sw, top + (sy - top) * u);
    }
    c.stroke();
    // the light on the left shoulder, the shade under the right
    c.fillStyle = rgba('#ffffff', 0.22);
    c.beginPath();
    c.ellipse(x0 - sw * 0.5, top + 5 * s, sw * 0.45, 3 * s, -0.2, 0, P2);
    c.fill();
    if (w === 'board') {
      // a pack's straps over the hoodie
      c.strokeStyle = rgba('#1a1a22', 0.8);
      c.lineWidth = 2.4;
      c.beginPath();
      c.moveTo(x0 - sw * 0.5, top + 2);
      c.lineTo(x0 - sw * 0.4, sy);
      c.moveTo(x0 + sw * 0.5, top + 2);
      c.lineTo(x0 + sw * 0.4, sy);
      c.stroke();
    }
  });
  // the hood bunched at the collar (or up over the head)
  const hx = x0 + turn * 2.5 * s + shift;
  const hy = top - 8.5 * s;
  const hr = (w === 'kid' ? 9.4 : 8) * s * (w === 'kid' ? 1.12 : 1);
  if (o.head !== 'hood') poly(c, [[x0 - 7 * s, top + 1], [x0 - 5 * s, top - 4 * s], [x0 + 5 * s, top - 4 * s], [x0 + 7 * s, top + 1]], lit(c, [x0 - 7, top - 4], [x0 + 7, top], 5, shade(o.jacket, -0.2)), 1.4);
  // the head: the ear and cheek showing as they turn, the hair (a ponytail swinging under the helmet)
  if (o.hair) {
    const sw2 = Math.sin(t * 2 + i) * 2;
    seg(c, [hx - turn * 3, hy + hr * 0.6], [hx - turn * 4 + sw2, hy + hr * 1.6], 5 * s, 3 * s, o.hair);
  }
  c.fillStyle = INK;
  c.beginPath();
  c.arc(hx, hy, hr + 1.3, 0, P2);
  c.fill();
  if (Math.abs(turn) > 0.1) {
    // the side of the face: cheek, ear, the tip of the nose past the curve of the head
    const sd = Math.sign(turn);
    const k = Math.min(1, Math.abs(turn));
    c.fillStyle = INK;
    c.beginPath();
    c.ellipse(hx + sd * hr * (0.55 + 0.3 * k), hy + hr * 0.35, hr * 0.5, hr * 0.42, 0, 0, P2);
    c.fill();
    c.fillStyle = '#eab894';
    c.beginPath();
    c.ellipse(hx + sd * hr * (0.55 + 0.3 * k), hy + hr * 0.35, hr * 0.42, hr * 0.34, 0, 0, P2);
    c.fill();
    c.fillStyle = '#e88a8a';
    c.beginPath();
    c.arc(hx + sd * hr * (0.6 + 0.3 * k), hy + hr * 0.42, hr * 0.14, 0, P2);
    c.fill();
  }
  const hg = c.createRadialGradient(hx - hr * 0.4, hy - hr * 0.5, 1, hx, hy, hr * 1.05);
  hg.addColorStop(0, shade(o.hat, 0.3));
  hg.addColorStop(0.6, o.hat);
  hg.addColorStop(1, shade(o.hat, -0.3));
  c.fillStyle = hg;
  if (o.head === 'hood') {
    // the hood up: a soft peaked shape over the head, its drawstring, the fabric folded at the neck
    c.beginPath();
    c.moveTo(hx - hr - 1, hy + hr + 2);
    c.quadraticCurveTo(hx - hr - 2, hy - hr * 1.1, hx, hy - hr * 1.15);
    c.quadraticCurveTo(hx + hr + 2, hy - hr * 1.1, hx + hr + 1, hy + hr + 2);
    c.closePath();
    c.fill();
    c.strokeStyle = rgba(shade(o.hat, -0.4), 0.8);
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(hx, hy - hr);
    c.quadraticCurveTo(hx - 1, hy, hx, hy + hr);
    c.stroke();
  } else {
    c.beginPath();
    c.arc(hx, hy, hr, 0, P2);
    c.fill();
    if (o.head === 'helmet') {
      // vents along the shell, the rim
      c.fillStyle = rgba(shade(o.hat, -0.45), 0.8);
      for (const dx of [-0.35, 0, 0.35]) {
        c.beginPath();
        c.ellipse(hx + dx * hr, hy - hr * 0.55, hr * 0.08, hr * 0.26, dx * 0.6, 0, P2);
        c.fill();
      }
      c.strokeStyle = rgba(shade(o.hat, -0.5), 0.8);
      c.lineWidth = 1;
      c.beginPath();
      c.arc(hx, hy, hr * 0.92, 0.15, Math.PI - 0.15);
      c.stroke();
    } else {
      // a knitted beanie: its ribbed cuff, a pom-pom bobbing on top
      c.fillStyle = shade(o.hat, -0.18);
      c.fillRect(hx - hr, hy + hr * 0.15, hr * 2, hr * 0.42);
      c.strokeStyle = rgba(shade(o.hat, -0.4), 0.6);
      c.lineWidth = 0.8;
      for (let k = -3; k <= 3; k++) {
        c.beginPath();
        c.moveTo(hx + k * hr * 0.28, hy + hr * 0.15);
        c.lineTo(hx + k * hr * 0.28, hy + hr * 0.57);
        c.stroke();
      }
      const py = hy - hr * 1.2 - Math.abs(Math.sin(t * 2 + i)) * 1.5;
      c.fillStyle = INK;
      c.beginPath();
      c.arc(hx + Math.sin(t * 2 + i) * 1.2, py, hr * 0.42, 0, P2);
      c.fill();
      c.fillStyle = shade(o.gear, 0.1);
      c.beginPath();
      c.arc(hx + Math.sin(t * 2 + i) * 1.2, py, hr * 0.34, 0, P2);
      c.fill();
    }
    // the goggles' strap round the back of the head
    c.fillStyle = INK;
    c.fillRect(hx - hr, hy + hr * 0.02, hr * 2, hr * 0.3);
    c.fillStyle = o.gear === o.hat ? '#e8388a' : o.gear;
    c.fillRect(hx - hr, hy + hr * 0.08, hr * 2, hr * 0.12);
  }
}

/** One frame of a chair seen from behind on the up-line (ph: the riders' legs swinging), or empty from the front. */
export function chairFrame(c: Ctx, ph: number, who: Riders | null, kits: RiderKit[] = [], front = false): void {
  c.save();
  c.translate(CHF.ox, 6);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  const seatY = HANG;
  const STEEL2 = '#7a848a';
  // the grip on the cable and the hanger bar down to the seat
  poly(c, [[-9, -4], [9, -4], [7, 8], [-7, 8]], lit(c, [-9, 0], [9, 0], 6, '#5a6268'), 1.8);
  seg(c, [0, 8], [0, seatY - 30], 6, 6, STEEL2);
  seg(c, [0, seatY - 30], [-30, seatY - 12], 5, 5, STEEL2);
  seg(c, [0, seatY - 30], [30, seatY - 12], 5, 5, STEEL2);
  if (front) {
    // an empty chair coming back down, seen from the front: the bar raised up out of the way, the padded backrest's
    // two cushions, the seat's top in perspective, the footrest hanging under it
    seg(c, [-34, seatY - 30], [-34, seatY - 50], 3.5, 3.5, '#5a6268');
    seg(c, [-34, seatY - 50], [34, seatY - 50], 3.5, 3.5, '#5a6268');
    seg(c, [34, seatY - 30], [34, seatY - 50], 3.5, 3.5, '#5a6268');
    seg(c, [-36, seatY - 32], [-36, seatY + 4], 4, 4, STEEL2);
    seg(c, [36, seatY - 32], [36, seatY + 4], 4, 4, STEEL2);
    for (const x of [-18, 18]) {
      poly(c, [[x - 16, seatY - 30], [x + 16, seatY - 30], [x + 15, seatY - 6], [x - 15, seatY - 6]], lit(c, [x - 16, seatY - 30], [x + 16, seatY - 6], 10, '#c8302a'), 1.5);
      c.strokeStyle = 'rgba(40,8,8,0.45)';
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(x - 12, seatY - 18);
      c.lineTo(x + 12, seatY - 18);
      c.stroke();
    }
    poly(c, [[-38, seatY - 6], [38, seatY - 6], [42, seatY + 4], [-42, seatY + 4]], lit(c, [-38, seatY - 6], [42, seatY + 4], 5, '#e04a3a'), 1.6);
    poly(c, [[-42, seatY + 4], [42, seatY + 4], [41, seatY + 8], [-41, seatY + 8]], '#7a1a16', 1.4);
    seg(c, [-26, seatY + 8], [-26, seatY + 22], 3, 3, '#5a6268');
    seg(c, [26, seatY + 8], [26, seatY + 22], 3, 3, '#5a6268');
    seg(c, [-30, seatY + 22], [30, seatY + 22], 3.5, 3.5, '#5a6268');
    c.fillStyle = 'rgba(250,252,255,0.9)';
    c.fillRect(-36, seatY - 7, 72, 2);
    c.restore();
    return;
  }
  const riders = who ?? [];
  const seats = [-17, 17];
  const swing = (i: number) => Math.sin(ph * P2 + i * 2.1);
  // their legs and gear hanging under the seat: shins swinging from bent knees, boots, skis dangling tail down
  riders.forEach((w, i) => {
    if (w === 'none') return;
    const x0 = seats[i];
    const gear = kits[i].gear;
    const pants = shade(kits[i].jacket, -0.45);
    const s = w === 'kid' ? 0.75 : 1;
    if (w === 'board') {
      // one boot strapped in, the board hanging off it and swinging; the free foot resting on top
      const a = swing(i) * 0.18;
      seg(c, [x0 - 6, seatY + 4], [x0 - 7 + a * 10, seatY + 20], 9, 7.5, pants);
      seg(c, [x0 + 6, seatY + 4], [x0 + 8, seatY + 16], 9, 7.5, pants);
      c.save();
      c.translate(x0 - 2 + a * 10, seatY + 25);
      c.rotate(a);
      poly(c, [[-22, -4], [22, -4], [24, 3], [-24, 3]], lit(c, [-22, -4], [22, 3], 4, gear), 1.6);
      c.fillStyle = '#1a1a22';
      c.fillRect(-10, -9, 8, 6);
      c.fillRect(6, -9, 8, 6);
      c.restore();
      return;
    }
    for (const sd of [-1, 1]) {
      // the kick: the shin swings about the knee (under the seat's front edge), foreshortening as it comes back
      const a = swing(i + sd * (w === 'kid' ? 1.6 : 0.5)) * (w === 'kid' ? 0.65 : 0.38);
      const kx = x0 + sd * 5.5 * s;
      const ky = seatY + 4;
      const len = (17 - Math.max(0, a) * 6) * s;
      const ax = kx + Math.sin(a) * 5 * s + sd * 1.2;
      const ay = ky + len;
      // the knee's bulge just under the seat, the shin tapering to the boot cuff
      c.fillStyle = INK;
      c.beginPath();
      c.ellipse(kx, ky + 1, 5 * s, 3.6 * s, 0, 0, P2);
      c.fill();
      seg(c, [kx, ky], [ax, ay], 8.5 * s, 6.5 * s, pants);
      // the boot, seen from behind: heel, cuff, a buckle catching the light
      poly(c, [[ax - 4.5 * s, ay - 3 * s], [ax + 4.5 * s, ay - 3 * s], [ax + 5 * s, ay + 6 * s], [ax - 5 * s, ay + 6 * s]], lit(c, [ax - 5, ay - 3], [ax + 5, ay + 6], 5, '#30303a'), 1.3);
      c.fillStyle = 'rgba(220,226,236,0.8)';
      c.fillRect(ax - 3 * s, ay, 6 * s, 1.2);
      // the ski: its tail hanging down nearest us, foreshortened as the leg kicks forward, tilted with the boot
      const tl = (20 + Math.cos(a) * 12) * s;
      const tx = Math.sin(a) * 8 * s;
      poly(c, [[ax - 3.4 * s, ay + 5 * s], [ax + 3.4 * s, ay + 5 * s], [ax + 3.8 * s + tx, ay + 5 * s + tl], [ax - 3.8 * s + tx, ay + 5 * s + tl]], lit(c, [ax - 3, ay], [ax + 3, ay + tl], 3, gear), 1.3);
      c.fillStyle = rgba('#ffffff', 0.5);
      c.fillRect(ax - 3 * s + tx * 0.5, ay + 6 * s, 1.2, tl * 0.8);
    }
  });
  // the seat's back edge
  poly(c, [[-38, seatY - 2], [38, seatY - 2], [36, seatY + 6], [-36, seatY + 6]], lit(c, [-38, seatY], [38, seatY + 6], 4, '#c8302a'), 1.8);
  riders.forEach((w, i) => {
    if (w === 'none') return;
    const other = riders[1 - i];
    rider(c, seats[i], seatY, w, kits[i], ph, i, other && other !== 'none' ? (i ? -1 : 1) : 0);
  });
  // the backrest in front of their backs (we see it from behind): its padded panel and frame
  poly(c, [[-37, seatY - 20], [37, seatY - 20], [37, seatY - 4], [-37, seatY - 4]], lit(c, [-37, seatY - 20], [37, seatY - 4], 8, '#a82a24'), 1.5);
  c.fillStyle = 'rgba(255,255,255,0.25)';
  c.fillRect(-35, seatY - 19, 70, 2);
  c.fillStyle = 'rgba(20,10,20,0.3)';
  c.fillRect(-36, seatY - 13, 72, 1.5);
  seg(c, [-36, seatY - 30], [-36, seatY + 2], 4, 4, STEEL2);
  seg(c, [36, seatY - 30], [36, seatY + 2], 4, 4, STEEL2);
  // the safety bar down over the riders, its footrest under their boots
  seg(c, [-34, seatY - 26], [-34, seatY + 12], 3, 3, '#5a6268');
  seg(c, [34, seatY - 26], [34, seatY + 12], 3, 3, '#5a6268');
  seg(c, [-34, seatY + 12], [34, seatY + 12], 3, 3, '#5a6268');
  c.fillStyle = 'rgba(250,252,255,0.85)';
  c.fillRect(-36, seatY - 21, 72, 2);
  c.restore();
}

function liftStill(ctx: Ctx): void {
  // towers far to near, the cables, then the chairs at their places on both lines
  const ts = [...SL.towers].reverse();
  const chairsAt = (side: number, ss: number[], ri: number[]) => {
    for (const [j, s] of ss.entries()) {
      const p = liftAt(s);
      const x = p.x + side * CABLE_OFF * p.k;
      const y = p.cy + 14 * p.k + sagAt(s);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(p.k, p.k);
      ctx.translate(-CHF.ox, -6);
      const v = ri[j] >= 0 ? RIDERS[ri[j]] : null;
      chairFrame(ctx, j * 0.3, v ? v.who : null, v ? v.kits : [], side < 0);
      ctx.restore();
    }
  };
  chairsAt(-1, [0.04, 0.17, 0.4, 0.62, 0.88], [-1, -1, -1, -1, -1]);
  for (const s of ts) {
    const p = liftAt(s);
    ctx.save();
    ctx.translate(p.x, p.gy);
    tower(ctx, p.gy - p.cy, p.k, 0.15 + (1 - p.k) * 0.6);
    ctx.restore();
  }
  cablesStill(ctx);
  chairsAt(1, [0.12, 0.33, 0.58, 0.9], [0, 1, 2, 3]);
}

// ——— the terrace ———

const LARCH = '#a07650';

/** The terrace's timber balustrade: squared posts, a thick top rail with a cap of snow, a mid rail; a drift piled
 * against it from the table's edge, deepest at the posts. */
function railing(ctx: Ctx, r: R): void {
  const { top, mid, bank, posts } = SL.rail;
  // the rails, behind the posts
  for (const [y, h] of [[mid, 14], [top, 22]] as const) {
    const p = rectPath(-10, y, W + 20, h);
    solid(ctx, p, { x: 0, y, w: W, h }, 'wood', LARCH, { depth: 0.06, line: 2.4, formSize: 6 });
    within(ctx, p, () => {
      surface(ctx, r, { x: 0, y, w: W, h }, LARCH, { over: true, vary: 0.4, cells: 9, strokes: 2, strokeAng: 0, strokeLen: 200, strokeW: 1.5, grain: 0.2, seed: 41 + y });
      vfill(ctx, 0, y, W, h, [[0, rgba('#fff0d8', 0.25)], [0.35, 'rgba(0,0,0,0)'], [1, 'rgba(30,14,6,0.45)']]);
    });
  }
  for (const x of posts) {
    const p = rectPath(x - 15, top - 8, 30, TY - top + 8);
    solid(ctx, p, { x: x - 16, y: top - 10, w: 32, h: TY - top + 10 }, 'wood', shade(LARCH, -0.05), { depth: 0.05, line: 2.6, formSize: 8 });
    within(ctx, p, () => {
      surface(ctx, r, { x: x - 15, y: top - 8, w: 30, h: TY - top }, LARCH, { over: true, vary: 0.4, cells: 3, strokes: 4, strokeAng: Math.PI / 2, strokeLen: 80, strokeW: 1.4, grain: 0.22, seed: x });
      const g = ctx.createLinearGradient(x - 15, 0, x + 15, 0);
      g.addColorStop(0, rgba('#fff0d8', 0.22));
      g.addColorStop(0.4, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(30,14,6,0.45)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 15, top - 8, 30, TY - top + 8);
    });
    // its cap: a pyramid of snow
    snowCap(ctx, r, x - 20, x + 20, top - 8, 14);
  }
  // snow along the top rail: a soft cap, lit on top, blue underneath, overhanging in lobes
  snowCap(ctx, r, -10, W + 10, top, 13);
  snowCap(ctx, r, -10, W + 10, mid, 7);
  // the drift against the railing: rolling up to each post, wind-scooped hollows between
  const driftTop = (x: number) => {
    // blown in from the left: piled against the posts unevenly (some deep, some scoured almost bare), long tails in
    // their lee, a few drifts of its own between, the wind cutting its edges
    let y = SL.rail.bank - 2 + wave1(x, 17) * 12 + wave1(x * 2.7, 29) * 5 + Math.abs(Math.sin(x * 0.045)) * 3;
    for (const [i, px] of posts.entries()) {
      const amp = [30, 14, 38, 22, 34, 10][i % 6];
      const lw = [40, 70, 55, 30, 65, 45][i % 6];
      const tail = [170, 90, 230, 120, 150, 260][i % 6];
      const d = x - px;
      const k = d < 0 ? Math.max(0, 1 + d / lw) ** 2.2 : Math.max(0, 1 - d / tail) ** 1.4;
      y -= k * amp;
    }
    for (const [cx, w, a] of [[200, 120, 16], [880, 160, 12], [1530, 110, 18]] as const) y -= Math.max(0, 1 - Math.abs(x - cx) / w) ** 2 * a;
    return y;
  };
  const dp = ridgePath(-10, W + 10, TY, driftTop, 6);
  dp(ctx);
  const dg = ctx.createLinearGradient(0, bank - 40, 0, TY);
  dg.addColorStop(0, SNOW.lit);
  dg.addColorStop(0.5, SNOW.body);
  dg.addColorStop(1, SNOW.shade);
  ctx.fillStyle = dg;
  ctx.fill();
  within(ctx, dp, () => {
    softly(ctx, { x: 0, y: SL.rail.bank - 60, w: W, h: TY - SL.rail.bank + 60 }, (g) => {
      for (let x = 0; x < W; x += 4) {
        const sl = (driftTop(x + 8) - driftTop(x - 8)) / 16;
        const lg = g.createLinearGradient(0, driftTop(x), 0, driftTop(x) + 40);
        const col = sl > 0 ? SNOW.deep : '#ffffff';
        const a = sl > 0 ? Math.min(0.5, sl * 1.1) : Math.min(0.55, -sl * 1.3);
        lg.addColorStop(0, rgba(col, a));
        lg.addColorStop(1, rgba(col, 0));
        g.fillStyle = lg;
        g.fillRect(x, driftTop(x), 4.5, 40);
      }
    }, 0.5);
    lay(ctx, noiseMask(30, 71, { cover: 0.35, soft: 0.25, col: '#ffffff', w: 384, h: 40 }), { x: 0, y: bank - 40, w: W, h: TY - bank + 40 }, 0.25);
    // the blue underside where each wind-cut lip overhangs
    ctx.strokeStyle = rgba(SNOW.deep, 0.5);
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (let x = -10; x <= W + 10; x += 6) ctx.lineTo(x, driftTop(x) + 4);
    ctx.stroke();
    // glints: ice crystals catching the sun
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = rgba('#ffffff', 0.5 + r() * 0.5);
      const x = r() * W;
      ctx.fillRect(x, driftTop(x) + 2 + r() * 40, 1.6, 1.6);
    }
    vfill(ctx, 0, TY - 26, W, 26, [[0, 'rgba(60,80,130,0)'], [1, 'rgba(60,80,130,0.3)']]);
  });
  // the wind-carved lip: a crisp lit edge
  ctx.strokeStyle = rgba('#ffffff', 0.9);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let x = -10; x <= W + 10; x += 6) ctx.lineTo(x, driftTop(x) + 0.5);
  ctx.stroke();
}

/** A cap of snow lying along a rail (x0…x1 at y, depth d): its top rounded and lit, its underside lobed and blue. */
function snowCap(ctx: Ctx, r: R, x0: number, x1: number, y: number, d: number): void {
  const topE: Pt[] = [];
  const botE: Pt[] = [];
  for (let x = x0; x <= x1 + 1; x += Math.min(14, (x1 - x0) / 3)) {
    const xx = Math.min(x, x1);
    const end = Math.min(1, (xx - x0) / 10, (x1 - xx) / 10);
    topE.push([xx, y - d * 0.55 * end - wave1(xx * 2, 7) * 2 * end]);
    botE.push([xx, y + d * 0.35 * end + (r() < 0.2 ? d * 0.4 : 0) * end]);
  }
  const p: PathFn = (c) => {
    c.beginPath();
    c.moveTo(topE[0][0], topE[0][1]);
    for (let i = 1; i < topE.length; i++) c.quadraticCurveTo(topE[i - 1][0], topE[i - 1][1] - d * 0.1, (topE[i - 1][0] + topE[i][0]) / 2, (topE[i - 1][1] + topE[i][1]) / 2);
    c.lineTo(topE[topE.length - 1][0], topE[topE.length - 1][1]);
    for (let i = botE.length - 1; i > 0; i--) c.quadraticCurveTo((botE[i][0] + botE[i - 1][0]) / 2, Math.max(botE[i][1], botE[i - 1][1]) + d * 0.2, botE[i - 1][0], botE[i - 1][1]);
    c.closePath();
  };
  const g = ctx.createLinearGradient(0, y - d * 0.6, 0, y + d * 0.6);
  g.addColorStop(0, SNOW.lit);
  g.addColorStop(0.55, SNOW.body);
  g.addColorStop(1, SNOW.shade);
  ctx.fillStyle = g;
  p(ctx);
  ctx.fill();
  ctx.strokeStyle = rgba('#5a6c98', 0.45);
  ctx.lineWidth = 1.2;
  p(ctx);
  ctx.stroke();
  ctx.strokeStyle = rgba('#ffffff', 0.9);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let i = 0; i < topE.length * 0.6; i++) ctx.lineTo(topE[i][0], topE[i][1] + 1);
  ctx.stroke();
}

/** The trail sign: a larch post stuck in the drift, arrow boards for the runs (painted, chipped, snow on their tops). */
function sign(ctx: Ctx, r: R): void {
  const { x, top } = SL.sign;
  const post = rectPath(x - 7, top, 14, TY - top);
  solid(ctx, post, { x: x - 8, y: top, w: 16, h: TY - top + 6 }, 'wood', '#7a5434', { depth: 0.04, line: 2.4, formSize: 5 });
  const boards: [string, string, number, number][] = [
    ['PIZZA RUN', '#c8261e', 1, top + 10],
    ['SUMMIT', '#1a1c22', 1, top + 42],
    ['LODGE', '#1e58b8', -1, top + 74],
  ];
  for (const [text, col, dir, y] of boards) {
    const w = 104;
    const x0 = dir > 0 ? x - 10 : x - w + 10;
    const tip = dir > 0 ? x0 + w + 14 : x0 - 14;
    const back = dir > 0 ? x0 : x0 + w;
    const p = polyPath([[back, y], [dir > 0 ? x0 + w : x0, y], [tip, y + 13], [dir > 0 ? x0 + w : x0, y + 26], [back, y + 26]]);
    solid(ctx, p, { x: Math.min(back, tip) - 2, y: y - 2, w: w + 20, h: 30 }, 'enamel', col, { depth: 0.04, line: 2.2, formSize: 4 });
    within(ctx, p, () => {
      // weathered: the paint chipped back to the wood at the edges, a frost of rime
      lay(ctx, noiseMask(12, 83 + y, { cover: 0.18, soft: 0.05, col: '#8a6a4a', w: 104, h: 26 }), { x: Math.min(back, tip), y, w: w + 14, h: 26 }, 0.7);
      ctx.fillStyle = col === '#1a1c22' ? '#f4f2ea' : '#ffffff';
      ctx.font = 'bold 13px "Arial Black", Arial, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillText(text, (back + tip) / 2 + (dir > 0 ? -4 : 4), y + 14);
      vfill(ctx, Math.min(back, tip), y, w + 14, 26, [[0, rgba('#ffffff', 0.2)], [0.4, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.3)']]);
    });
    snowCap(ctx, r, Math.min(back, tip) + 4, Math.max(back, tip) - 6, y, 6);
  }
  // the run's difficulty badge and the cap of snow on the post
  snowCap(ctx, r, x - 10, x + 10, top, 10);
  ctx.fillStyle = rgba('#2a3a6a', 0.3);
  ctx.beginPath();
  ctx.ellipse(x + 10, TY - 6, 28, 5, 0, 0, P2);
  ctx.fill();
}

/** Skis and poles stuck upright in the drift (a moving sprite: they rattle when the table's hit). */
function skisStuck(ctx: Ctx): void {
  const x = SL.skis.x;
  const base = TY - 18;
  const one = (sx: number, rot: number, col: string, top: string, len: number) => {
    ctx.save();
    ctx.translate(sx, base);
    ctx.rotate(rot);
    const p: PathFn = (c) => {
      c.beginPath();
      c.moveTo(-11, 0);
      c.lineTo(-10, -len + 30);
      c.quadraticCurveTo(-9, -len - 4, 4, -len - 12);
      c.quadraticCurveTo(12, -len + 4, 11, -len + 30);
      c.lineTo(11, 0);
      c.closePath();
    };
    castShadow(ctx, p, 12, 14, 0.4, '#3a4a70');
    solid(ctx, p, { x: -14, y: -len - 14, w: 28, h: len + 14 }, 'plastic', col, { depth: 0.04, line: 2.4, formSize: 6 });
    within(ctx, p, () => {
      // the top sheet's graphic, the steel edges catching the light, the binding's toe piece
      ctx.fillStyle = top;
      ctx.beginPath();
      ctx.moveTo(-10, -len * 0.25);
      ctx.lineTo(10, -len * 0.45);
      ctx.lineTo(10, -len * 0.38);
      ctx.lineTo(-10, -len * 0.18);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba('#ffffff', 0.5);
      ctx.fillRect(-10, -len + 30, 2, len - 30);
      ctx.fillStyle = '#2a2c34';
      ctx.fillRect(-10, -len * 0.62, 20, 16);
      ctx.fillStyle = rgba('#d8dce4', 0.7);
      ctx.fillRect(-10, -len * 0.62, 20, 3);
    });
    ctx.restore();
  };
  // the mound they were rammed into: heaped snow, lit on its top left, a blue shadow pooled to its right
  ctx.fillStyle = rgba('#5a6ca0', 0.35);
  ctx.beginPath();
  ctx.ellipse(x + 40, base + 8, 150, 10, 0, 0, P2);
  ctx.fill();
  const moundP: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - 120, base + 18);
    c.bezierCurveTo(x - 80, base + 6, x - 40, base - 22, x + 10, base - 22);
    c.bezierCurveTo(x + 70, base - 24, x + 120, base + 6, x + 165, base + 18);
    c.closePath();
  };
  const mg = ctx.createLinearGradient(x - 60, base - 26, x + 80, base + 18);
  mg.addColorStop(0, SNOW.lit);
  mg.addColorStop(0.55, SNOW.body);
  mg.addColorStop(1, SNOW.shade);
  ctx.fillStyle = mg;
  moundP(ctx);
  ctx.fill();
  // the poles first (behind), crossed, their baskets and straps
  for (const [px, rot] of [[x - 54, -0.2], [x + 104, 0.17]] as const) {
    ctx.save();
    ctx.translate(px, base + 2);
    ctx.rotate(rot);
    const p = rrPath(-3.5, -268, 7, 268, 3);
    castShadow(ctx, p, 12, 12, 0.35, '#3a4a70');
    solid(ctx, p, { x: -5, y: -270, w: 10, h: 270 }, 'chrome', '#c8ccd6', { depth: 0.04, line: 2, formSize: 3 });
    const gp = rrPath(-6, -274, 12, 46, 5);
    solid(ctx, gp, { x: -7, y: -276, w: 14, h: 50 }, 'rubber', '#2a2a32', { depth: 0.04, line: 2, formSize: 3 });
    ctx.strokeStyle = '#e8388a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-5, -270);
    ctx.quadraticCurveTo(-18, -246, -6, -232);
    ctx.stroke();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, -14, 16, 4.5, 0, 0, P2);
    ctx.stroke();
    ctx.restore();
  }
  one(x, -0.08, '#e8c020', '#1a1c22', 300);
  one(x + 34, 0.05, '#e8c020', '#1a1c22', 300);
  // the mound's front lip over their buried feet: snow pushed up round each, the shade in the holes
  const lipR = rng(5);
  const lip: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - 130, base + 18);
    for (let k = 0; k <= 14; k++) {
      const u = k / 14;
      const lx = x - 130 + u * 300;
      c.lineTo(lx, base + 18 - Math.sin(u * Math.PI) ** 0.7 * (24 + lipR() * 5));
    }
    c.lineTo(x + 170, base + 18);
    c.closePath();
  };
  const lg = ctx.createLinearGradient(0, base - 14, 0, base + 18);
  lg.addColorStop(0, SNOW.lit);
  lg.addColorStop(0.5, SNOW.body);
  lg.addColorStop(1, mix(SNOW.shade, '#7a90c0', 0.4));
  ctx.fillStyle = lg;
  lip(ctx);
  ctx.fill();
  for (const hx of [x - 54, x - 4, x + 34, x + 104]) {
    ctx.fillStyle = rgba('#4a5c90', 0.4);
    ctx.beginPath();
    ctx.ellipse(hx + 4, base - 4, 14, 3.5, 0, 0, P2);
    ctx.fill();
  }
}
const SKIS_BOX = { x: SL.skis.x - 130, y: TY - 340, w: 320, h: 340 };

/** The big fir at the right-hand edge, laden with snow, its shadow on the drift and the rail. */
function bigFir(ctx: Ctx, r: R): void {
  const { x, base, h } = SL.fir;
  ctx.fillStyle = rgba('#3a4a70', 0.25);
  ctx.beginPath();
  ctx.ellipse(x - 30, base + 10, 140, 18, 0, 0, P2);
  ctx.fill();
  conifer(ctx, r, x, base, h, h * 0.5, { dark: FIR.dark, mid: FIR.mid, lit: FIR.lit, rim: '#e8f0ff', rimA: 0.3, snow: 0.9, size: 5, tiers: 13 });
  firLoad(ctx, r, x, base, h, h * 0.5, 0.85);
}

/** Snow lying heavy on a fir's boughs (the tiers as sceneBits' conifer lays them): caps lit on their top left, blue
 * underneath, lobes hanging off them. */
function firLoad(ctx: Ctx, r: R, x: number, y: number, h: number, w: number, amt: number): void {
  const tiers = 13;
  for (let i = 0; i < tiers; i++) {
    const t = (i + 0.5) / tiers;
    const ty = y - h + t * h * 0.94;
    const half = (w / 2) * (0.12 + t * 0.88) * 0.85;
    const rad = (h / tiers) * 0.62;
    const pts: Pt[] = [];
    const bot: Pt[] = [];
    for (let k = 0; k <= 10; k++) {
      const u = -0.9 + (k / 10) * 1.6;
      const px = x + u * half;
      const droop = Math.abs(u) ** 1.6 * rad * 0.9;
      pts.push([px, ty - rad * 0.55 + droop - (1 - Math.abs(u)) * rad * 0.15 + (r() - 0.5) * rad * 0.2]);
      bot.push([px, ty - rad * 0.55 + droop + rad * (0.2 + 0.35 * amt) * (1 - Math.abs(u) ** 2 * 0.7) * (0.8 + r() * 0.5)]);
    }
    const cap: PathFn = (c) => {
      c.beginPath();
      c.moveTo(pts[0][0], pts[0][1]);
      for (let k = 1; k < pts.length; k++) c.quadraticCurveTo(pts[k - 1][0], pts[k - 1][1] - rad * 0.12, (pts[k - 1][0] + pts[k][0]) / 2, (pts[k - 1][1] + pts[k][1]) / 2);
      for (let k = bot.length - 1; k > 0; k--) c.quadraticCurveTo((bot[k][0] + bot[k - 1][0]) / 2, Math.max(bot[k][1], bot[k - 1][1]) + rad * 0.2, bot[k - 1][0], bot[k - 1][1]);
      c.closePath();
    };
    const g = ctx.createLinearGradient(x - half, ty - rad, x + half * 0.6, ty + rad * 0.6);
    g.addColorStop(0, SNOW.lit);
    g.addColorStop(0.5, SNOW.body);
    g.addColorStop(1, SNOW.shade);
    ctx.fillStyle = g;
    cap(ctx);
    ctx.fill();
    within(ctx, cap, () => {
      ctx.strokeStyle = rgba(SNOW.deep, 0.7);
      ctx.lineWidth = rad * 0.2;
      ctx.beginPath();
      bot.forEach(([bx, by], k) => (k ? ctx.lineTo(bx, by) : ctx.moveTo(bx, by)));
      ctx.stroke();
    });
    ctx.strokeStyle = rgba('#ffffff', 0.7);
    ctx.lineWidth = Math.max(1, rad * 0.1);
    ctx.beginPath();
    for (let k = 0; k < 6; k++) ctx.lineTo(pts[k][0], pts[k][1] + 1);
    ctx.stroke();
  }
}
const FIR_BOX = { x: SL.fir.x - 180, y: SL.fir.base - SL.fir.h - 16, w: W - SL.fir.x + 180, h: SL.fir.h + 46 };

// ——— the table ———

function table(ctx: Ctx, r: R): void {
  // the terrace's picnic table: weathered larch, silvered where the sun and snow have had it, snow in the gaps
  planksPlane(ctx, r, SL.front, '#b48c64', 0.3, 0.014, false);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, SL.front - TY + 4);
  ctx.clip();
  lay(ctx, drift('#efe6da', '#5a4636', 5, 95, 256, 48), { x: 0, y: TY, w: W, h: SL.front - TY }, 0.16);
  // a thin drift of snow blown along the back edge, crumbs of it on the boards
  vfill(ctx, 0, TY, W, 30, [[0, rgba('#f2f6fc', 0.9)], [0.35, rgba('#e4ecf8', 0.4)], [1, rgba('#e4ecf8', 0)]]);
  for (let x = 0; x < W; x += 30) {
    ctx.fillStyle = rgba('#f8fbff', 0.6);
    ctx.beginPath();
    ctx.ellipse(x + r() * 20, TY + 4 + r() * 6, 20 + r() * 20, 3 + r() * 2, 0, 0, P2);
    ctx.fill();
  }
  // the sun's warmth on the left, the cool sky's light over the rest
  lightPool(ctx, 520, 880, 760, 160, '#fff0d4', 0.12, 'screen');
  const lg = ctx.createLinearGradient(0, 0, W, 0);
  lg.addColorStop(0, 'rgba(255,230,190,0.08)');
  lg.addColorStop(0.5, 'rgba(255,230,190,0)');
  lg.addColorStop(1, 'rgba(80,110,170,0.12)');
  ctx.fillStyle = lg;
  ctx.fillRect(0, TY, W, SL.front - TY);
  ctx.restore();
  tableFalloff(ctx, SL.front, 0.3, '#16182a');
  tableSeam(ctx, 0.4, '#2a3048', false);
  // the front: the end grain of the boards, a batten screwed across
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, SL.front, W, 1080 - SL.front);
  ctx.clip();
  surface(ctx, r, { x: 0, y: SL.front, w: W, h: 40 }, '#6a4c34', { vary: 0.4, cells: 8, strokes: 1, strokeAng: 0, strokeLen: 160, strokeW: 3, grain: 0.25, seed: 99 });
  vfill(ctx, 0, SL.front, W, 40, [[0, 'rgba(255,240,220,0.18)'], [0.2, 'rgba(20,14,10,0)'], [1, 'rgba(20,14,10,0.5)']]);
  ctx.restore();
  ctx.fillStyle = rgba('#f4ece0', 0.35);
  ctx.fillRect(0, SL.front - 3, W, 3);
  ctx.fillStyle = 'rgba(20,12,8,0.75)';
  ctx.fillRect(0, SL.front, W, 2);
}

/** A mug of hot chocolate (enamel, chipped), cream and marshmallows on top, its ring of melt-water on the wood. */
function mug(ctx: Ctx): void {
  const { x, y } = SL.mug;
  groundShadow(ctx, x + 14, y + 4, 62, 10, 0.5, '#1a1a2a', 1.4);
  const body: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - 38, y - 84);
    c.lineTo(x - 35, y - 6);
    c.quadraticCurveTo(x, y + 6, x + 35, y - 6);
    c.lineTo(x + 38, y - 84);
    c.closePath();
  };
  // the handle on the right
  const handle: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x + 36, y - 70);
    c.bezierCurveTo(x + 70, y - 72, x + 70, y - 22, x + 35, y - 24);
    c.lineTo(x + 35, y - 34);
    c.bezierCurveTo(x + 58, y - 34, x + 58, y - 62, x + 37, y - 60);
    c.closePath();
  };
  solid(ctx, handle, { x: x + 30, y: y - 76, w: 44, h: 56 }, 'enamel', '#2a5ab8', { depth: 0.02, line: 2.4, formSize: 5 });
  solid(ctx, body, { x: x - 40, y: y - 88, w: 80, h: 96 }, 'enamel', '#2a5ab8', { depth: 0.02, line: 2.6, formSize: 10, spec: true });
  within(ctx, body, () => {
    // white speckles of the enamel, a chip at the rim showing the black iron, the reflected sky
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = rgba('#ffffff', 0.5);
      ctx.fillRect(x - 36 + ((i * 37) % 72), y - 80 + ((i * 53) % 70), 1.6, 1.6);
    }
    ctx.fillStyle = '#14141c';
    ctx.beginPath();
    ctx.ellipse(x - 18, y - 82, 6, 3, 0, 0, P2);
    ctx.fill();
    ctx.fillStyle = rgba('#dceeff', 0.35);
    ctx.fillRect(x - 28, y - 76, 6, 62);
  });
  // the rim, the cocoa, the cream and two marshmallows
  ctx.fillStyle = '#e8eef8';
  ctx.beginPath();
  ctx.ellipse(x, y - 84, 38, 9, 0, 0, P2);
  ctx.fill();
  ctx.strokeStyle = '#141a30';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#5a3018';
  ctx.beginPath();
  ctx.ellipse(x, y - 83, 33, 6.5, 0, 0, P2);
  ctx.fill();
  const cream: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - 30, y - 84);
    c.quadraticCurveTo(x - 26, y - 104, x - 8, y - 102);
    c.quadraticCurveTo(x - 2, y - 120, x + 10, y - 104);
    c.quadraticCurveTo(x + 30, y - 104, x + 30, y - 84);
    c.closePath();
  };
  solid(ctx, cream, { x: x - 32, y: y - 122, w: 64, h: 40 }, 'plush', '#fffaf2', { depth: 0.02, line: 2, formSize: 6 });
  for (const [mx, my, rot] of [[x - 18, y - 92, -0.4], [x + 14, y - 96, 0.5]] as const) {
    const m = (c: Ctx) => {
      c.beginPath();
      c.save();
      c.translate(mx, my);
      c.rotate(rot);
      c.roundRect(-8, -6, 16, 12, 4);
      c.restore();
    };
    solid(ctx, m, { x: mx - 10, y: my - 10, w: 20, h: 20 }, 'plush', '#ffd8e8', { depth: 0.02, line: 1.6, formSize: 3 });
  }
  // a dusting of cocoa on the cream
  for (let i = 0; i < 24; i++) {
    ctx.fillStyle = rgba('#6a3a1a', 0.6);
    ctx.fillRect(x - 20 + ((i * 29) % 40), y - 108 + ((i * 17) % 18), 1.4, 1.4);
  }
}

/** Ski goggles left on the table: the strap curled, the lens mirrored with the sky and the sun's glint. */
function goggles(ctx: Ctx): void {
  const { x, y } = SL.goggles;
  groundShadow(ctx, x + 12, y + 8, 84, 10, 0.45, '#1a1a2a', 1.2);
  // the strap: a loop of patterned elastic lying behind the frame
  // the strap's shadow on the boards, then the strap itself: thick elastic, its edge in shade
  ctx.strokeStyle = 'rgba(20,16,30,0.35)';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(x - 62, y - 8);
  ctx.bezierCurveTo(x - 104, y + 22, x - 16, y + 38, x + 44, y + 30);
  ctx.bezierCurveTo(x + 104, y + 24, x + 94, y - 4, x + 70, y - 8);
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(x - 66, y - 14);
  ctx.bezierCurveTo(x - 110, y + 14, x - 20, y + 30, x + 40, y + 22);
  ctx.bezierCurveTo(x + 100, y + 16, x + 90, y - 10, x + 66, y - 14);
  ctx.stroke();
  ctx.strokeStyle = '#a81e5a';
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.strokeStyle = '#e8388a';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.strokeStyle = '#ffd030';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 8]);
  ctx.stroke();
  ctx.setLineDash([]);
  const frame: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - 70, y - 30);
    c.quadraticCurveTo(x, y - 48, x + 70, y - 30);
    c.quadraticCurveTo(x + 76, y - 4, x + 58, y + 4);
    c.quadraticCurveTo(x + 22, y + 4, x + 8, y - 6);
    c.quadraticCurveTo(x, y - 10, x - 8, y - 6);
    c.quadraticCurveTo(x - 22, y + 4, x - 58, y + 4);
    c.quadraticCurveTo(x - 76, y - 4, x - 70, y - 30);
    c.closePath();
  };
  solid(ctx, frame, { x: x - 78, y: y - 50, w: 156, h: 58 }, 'rubber', '#f2f2f0', { depth: 0.02, line: 2.6, formSize: 8 });
  const lens: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - 62, y - 28);
    c.quadraticCurveTo(x, y - 42, x + 62, y - 28);
    c.quadraticCurveTo(x + 66, y - 8, x + 54, y - 3);
    c.quadraticCurveTo(x + 22, y - 3, x + 8, y - 12);
    c.quadraticCurveTo(x, y - 15, x - 8, y - 12);
    c.quadraticCurveTo(x - 22, y - 3, x - 54, y - 3);
    c.quadraticCurveTo(x - 66, y - 8, x - 62, y - 28);
    c.closePath();
  };
  within(ctx, lens, () => {
    // a mirrored orange-to-violet lens with the sky and the peaks reflected in it
    vfill(ctx, x - 66, y - 44, 132, 44, [[0, '#ffb020'], [0.45, '#ff5a6a'], [1, '#6a3ab0']]);
    ctx.fillStyle = rgba('#2a1a5a', 0.45);
    ctx.beginPath();
    ctx.moveTo(x - 66, y - 10);
    for (let k = 0; k <= 12; k++) ctx.lineTo(x - 66 + k * 11, y - 18 - Math.abs(Math.sin(k * 1.3)) * 8);
    ctx.lineTo(x + 66, y);
    ctx.lineTo(x - 66, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgba('#ffffff', 0.7);
    ctx.beginPath();
    ctx.ellipse(x - 30, y - 30, 14, 4, -0.2, 0, P2);
    ctx.fill();
    glowAt(ctx, x - 34, y - 30, 22, '#ffffff', 0.6);
  });
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  lens(ctx);
  ctx.stroke();
}

// ——— the skiers' line down the run ———

/** The run's fall line, from over the crest (u 0) out at the left behind the railing (u 1): a screen point and the
 * scale of a figure there (relative to the paint size; constant speed in u is constant speed on the snow). */
export function skiLine(u: number): { x: number; y: number; k: number } {
  const z = lerp(6, 1.4, u);
  const t = (1 / z - 1 / 6) / (1 / 1.4 - 1 / 6);
  return { x: lerp(1470, 200, t), y: lerp(476, 598, t), k: 1.2 / z };
}

export interface Rider {
  id: 'racer' | 'dad' | 'board';
  /** Turns over the whole run, how wide they swing (paint px), the time the run takes (s). */
  turns: number;
  swing: number;
  dur: number;
}
export const SKIERS: Rider[] = [
  { id: 'racer', turns: 7, swing: 44, dur: 10 },
  { id: 'dad', turns: 5.5, swing: 60, dur: 17 },
  { id: 'board', turns: 4.5, swing: 70, dur: 13 },
];

/** Where a skier is at u along the run: the S of their turns laid across the fall line (towards us and away, so
 * mostly up and down the screen), the phase of their turn cycle (the frame), the scale. */
export function skierAt(sk: Rider, u: number): { x: number; y: number; k: number; ph: number } {
  const p = skiLine(u);
  const ph = (u * sk.turns) % 1;
  const off = -Math.sin(ph * P2) * sk.swing * p.k;
  return { x: p.x + off * 0.35, y: p.y + off, k: p.k, ph };
}

function skiersStill(ctx: Ctx): void {
  for (const [i, u] of [[2, 0.66], [0, 0.4], [1, 0.16]] as const) {
    const sk = SKIERS[i];
    const p = skierAt(sk, u);
    groundShadow(ctx, p.x + 18 * p.k, p.y + 2, 40 * p.k, 4.5 * p.k, 0.32, '#3a4a80', 1.4);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(-p.k, p.k);
    ctx.translate(-SKF.ox, -SKF.base);
    skierFrame(ctx, p.ph, BUILDS[sk.id], KITS[sk.id]);
    ctx.restore();
  }
}

/** The mug's steam (still): a faint curl over the cream. */
function steamStill(ctx: Ctx): void {
  ctx.save();
  ctx.translate(SL.mug.x - 40, SL.mug.y - 222);
  steamFrame(ctx, 80, 110, 0.3, { a: 0.3, lit: '#ffffff', body: '#eef2f8', shade: '#a8b4c8', n: 6, lean: 0.4 });
  ctx.restore();
}

// ——— painted frames for the live layer ———

/** The piste basher (night): a red snowcat side on, facing right, its tracks running (phase), a blade in front, the
 * tiller combing corduroy behind, a light bar on the cab roof. Paint size SC.fw × SC.fh, the tracks' foot at (ox, base). */
export const SC = { fw: 240, fh: 120, ox: 116, base: 112, n: 4, k: 0.6 };
export function snowcatFrame(c: Ctx, ph: number): void {
  c.save();
  c.translate(SC.ox, SC.base);
  c.lineJoin = 'round';
  c.lineCap = 'round';
  const red = '#d8261c';
  // the tiller and its finisher flap dragging behind, the fresh corduroy it leaves
  poly(c, [[-112, -6], [-82, -30], [-70, -30], [-74, -4], [-110, 0]], lit(c, [-112, -30], [-70, 0], 12, '#6a6e78'), 2);
  c.strokeStyle = 'rgba(30,34,44,0.6)';
  c.lineWidth = 1.2;
  for (let i = 0; i < 6; i++) {
    c.beginPath();
    c.moveTo(-108 + i * 6, -3);
    c.lineTo(-104 + i * 6, -12);
    c.stroke();
  }
  // the tracks: a long loop round the drive sprocket and the road wheels, the grousers moving with the phase
  const trk = (g: Ctx) => {
    g.beginPath();
    g.roundRect(-76, -34, 154, 34, 17);
  };
  poly(c, [[-76, -17], [-59, -34], [61, -34], [78, -17], [61, 0], [-59, 0]], '#24262e', 2.4);
  within(c, trk, () => {
    c.fillStyle = '#3a3c46';
    for (let i = -2; i < 16; i++) {
      const x = -80 + ((i * 11 + ph * 11) % 176);
      c.fillRect(x, -34, 4, 4);
      c.fillRect(x - ph * 22, -4, 4, 4);
    }
  });
  for (let i = 0; i < 6; i++) {
    const x = -52 + i * 21;
    c.fillStyle = '#14161c';
    c.beginPath();
    c.arc(x, -15, 11, 0, P2);
    c.fill();
    const g = c.createRadialGradient(x - 3, -18, 1, x, -15, 9);
    g.addColorStop(0, '#9aa0aa');
    g.addColorStop(1, '#4a4e58');
    c.fillStyle = g;
    c.beginPath();
    c.arc(x, -15, 8.5, 0, P2);
    c.fill();
    // a spoke turning with the phase
    const a = ph * P2 + i;
    c.strokeStyle = '#2a2c34';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x + Math.cos(a) * 7, -15 + Math.sin(a) * 7);
    c.lineTo(x - Math.cos(a) * 7, -15 - Math.sin(a) * 7);
    c.stroke();
  }
  // the body over the tracks, the engine cover, the cab with its big windows and roof lights
  poly(c, [[-74, -34], [-74, -58], [-30, -62], [-22, -100], [40, -100], [56, -66], [80, -60], [84, -34]], lit(c, [-60, -100], [80, -34], 30, red), 2.6);
  within(c, polyPath([[-74, -34], [-74, -58], [-30, -62], [-22, -100], [40, -100], [56, -66], [80, -60], [84, -34]]), () => {
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.fillRect(-74, -46, 160, 4);
    c.fillStyle = 'rgba(30,10,10,0.35)';
    c.fillRect(-74, -40, 160, 6);
  });
  const win = polyPath([[-16, -94], [36, -94], [50, -66], [-20, -66]]);
  win(c);
  const wg = c.createLinearGradient(-16, -94, 50, -66);
  wg.addColorStop(0, '#5a6a8a');
  wg.addColorStop(0.5, '#1a2236');
  wg.addColorStop(1, '#0a0e1a');
  c.fillStyle = wg;
  c.fill();
  c.strokeStyle = '#1a1a22';
  c.lineWidth = 2;
  c.stroke();
  c.strokeStyle = '#1a1a22';
  c.beginPath();
  c.moveTo(14, -94);
  c.lineTo(18, -66);
  c.stroke();
  c.fillStyle = 'rgba(200,220,255,0.35)';
  c.beginPath();
  c.moveTo(-10, -92);
  c.lineTo(0, -92);
  c.lineTo(-8, -70);
  c.lineTo(-16, -70);
  c.closePath();
  c.fill();
  // the driver's silhouette in the cab
  c.fillStyle = '#0a0c14';
  c.beginPath();
  c.arc(28, -80, 6, 0, P2);
  c.fill();
  c.fillRect(22, -74, 12, 8);
  // the roof light bar and the beacon
  poly(c, [[-18, -104], [42, -104], [42, -100], [-18, -100]], '#2a2c34', 1.6);
  for (let i = 0; i < 4; i++) {
    c.fillStyle = '#fff4d8';
    c.fillRect(-12 + i * 14, -108, 8, 4);
  }
  poly(c, [[2, -114], [10, -114], [11, -106], [1, -106]], '#ff8a1a', 1.4);
  // the blade in front: a curved plough lit along its top edge, on its push arms
  seg(c, [70, -40], [100, -30], 5, 5, '#3a3c44');
  poly(c, [[96, -52], [112, -56], [118, -26], [112, -2], [96, -4], [100, -28]], lit(c, [96, -56], [118, -2], 10, '#d8dce4'), 2.4);
  c.fillStyle = 'rgba(255,255,255,0.7)';
  c.fillRect(100, -54, 10, 2);
  // the headlights on the front of the cab
  c.fillStyle = '#fffbe8';
  c.beginPath();
  c.arc(80, -54, 4, 0, P2);
  c.fill();
  c.restore();
}

/** A tile of falling snow (depth 0 far: many small soft flakes; 1 near: fewer, bigger, each lit on its top left). */
export function snowTile(c: Ctx, size: number, d: number): void {
  const rr = rng(hashStr('slopes:snow' + d));
  const n = [260, 60][d];
  for (let i = 0; i < n; i++) {
    const x = rr() * size;
    const y = rr() * size;
    const rad = [1.2, 2.6][d] * (0.6 + rr() * 0.8);
    const a = [0.75, 0.9][d] * (0.5 + rr() * 0.5);
    for (const [ox, oy] of [[0, 0], [size, 0], [-size, 0], [0, size], [0, -size]] as const) {
      const cx = x + ox;
      const cy = y + oy;
      if (cx < -6 || cx > size + 6 || cy < -6 || cy > size + 6) continue;
      const g = c.createRadialGradient(cx - rad * 0.3, cy - rad * 0.3, 0, cx, cy, rad * 1.6);
      g.addColorStop(0, `rgba(255,255,255,${a.toFixed(3)})`);
      g.addColorStop(0.5, `rgba(236,242,252,${(a * 0.7).toFixed(3)})`);
      g.addColorStop(1, 'rgba(220,230,250,0)');
      c.fillStyle = g;
      c.fillRect(cx - rad * 2, cy - rad * 2, rad * 4, rad * 4);
    }
  }
}

/** A clump of snow knocked off a bough (frame i of a few): an irregular lump lit on its top left, blue below. */
export function clumpFrame(c: Ctx, half: number, i: number): void {
  const rr = rng(hashStr('slopes:clump' + i));
  const cx = half;
  const cy = half;
  const pts: Pt[] = [];
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * P2;
    const rad = half * (0.55 + rr() * 0.35);
    pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad * 0.85]);
  }
  const g = c.createLinearGradient(cx - half, cy - half, cx + half, cy + half);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.5, '#e6eef8');
  g.addColorStop(1, '#7f98c8');
  c.fillStyle = g;
  c.beginPath();
  pts.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fill();
  c.strokeStyle = 'rgba(60,80,140,0.75)';
  c.lineWidth = 1.6;
  c.stroke();
}

// ——— the grade and shade ———

function grade(ctx: Ctx): void {
  gradeAll(ctx, 0.02, '#e4f0fa', 0.04, { warm: '#ffdcaa', cool: '#4a70c0', a: 0.22 });
}

function shadeOver(ctx: Ctx): void {
  calmLanes(ctx, 0.07, '#0e1a30', 80, 600);
  vignetteAll(ctx, 0.45, '#060a18');
}

// ——— the stack ———

const FAR_BOX = { x: 0, y: 0, w: W, h: FAR };
const CLOUD_BOX = { x: 0, y: 30, w: W, h: 300 };
const PM_BOX = { x: 0, y: 30, w: W, h: 440 };
const MOUNT_BOX = { x: 0, y: 384, w: W, h: 722 - 384 };
const LIFT_BOX = { x: 0, y: 150, w: 900, h: 328 };
const SKI_BOX = { x: 260, y: 440, w: 1360, h: 146 };
const RAIL_BOX = { x: 0, y: SL.rail.top - 30, w: W, h: TY - SL.rail.top + 30 };
const SIGN_BOX = { x: 0, y: SL.sign.top - 20, w: 250, h: TY - SL.sign.top + 20 };
const FLOOD_BOX = { x: 280, y: 380, w: 1440, h: 322 };

export const SLOPES: SceneSpec = {
  id: 'slopes',
  info: {
    name: 'Ski Slopes',
    subtitle: 'Waves 51–54',
    ambient: [],
    glows: [],
    light: '#f4f8ff',
    tableTint: '#fbfcff',
  },
  layers: [
    { id: 'far', box: FAR_BOX, draw: (c, r) => farScene(c, r, DAY) },
    { id: 'farPM', box: FAR_BOX, liveOnly: true, res: 0.4, draw: (c, r) => farScene(c, r, PM) },
    { id: 'clouds', box: CLOUD_BOX, motion: 'sprite', res: 0.4, draw: cloudsDay },
    { id: 'cloudsPM', box: PM_BOX, liveOnly: true, res: 0.4, draw: cloudsPM },
    { id: 'farGrey', box: FAR_BOX, liveOnly: true, res: 0.4, draw: (c, r) => farScene(c, r, GREY) },
    { id: 'farNight', box: FAR_BOX, liveOnly: true, res: 0.5, draw: (c, r) => farScene(c, r, NIGHT) },
    { id: 'mountain', box: MOUNT_BOX, draw: mountain },
    // the afternoon's long shadows across the run (live only)
    { id: 'shadowsPM', box: { x: 0, y: 470, w: W, h: 160 }, liveOnly: true, res: 0.5, draw: (c, r) => longShadows(c, r) },
    // the floodlights' glow (live only, set to ADD at night)
    { id: 'floods', box: FLOOD_BOX, liveOnly: true, res: 0.5, draw: (c) => floods(c) },
    // the chairlift's towers, cables and chairs, and the skiers on the run (the live code's own)
    { id: 'lift', box: LIFT_BOX, stillOnly: true, draw: (c) => liftStill(c) },
    { id: 'liftLive', box: LIFT_BOX, motion: 'slot', draw: () => {} },
    { id: 'skiers', box: SKI_BOX, stillOnly: true, draw: (c) => skiersStill(c) },
    { id: 'skiLive', box: SKI_BOX, motion: 'slot', draw: () => {} },
    { id: 'railing', box: RAIL_BOX, draw: railing },
    { id: 'sign', box: SIGN_BOX, draw: sign },
    { id: 'fir', box: FIR_BOX, draw: bigFir },
    { id: 'skis', box: SKIS_BOX, motion: 'sprite', draw: (c) => skisStuck(c) },
    { id: 'table', box: { x: 0, y: TY, w: W, h: 1080 - TY }, draw: table },
    { id: 'goggles', box: { x: 0, y: SL.goggles.y - 70, w: SL.goggles.x + 150, h: 80 }, draw: (c) => goggles(c) },
    { id: 'mug', box: { x: SL.mug.x - 60, y: SL.mug.y - 124, w: 160, h: 144 }, draw: (c) => mug(c) },
    { id: 'steam', box: { x: SL.mug.x - 40, y: SL.mug.y - 222, w: 80, h: 110 }, stillOnly: true, draw: (c) => steamStill(c) },
    { id: 'top', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

/** The low afternoon sun's shadows (live only): the forest edge and the lone firs throwing long blue shadows down
 * and to the right across the run, the floodlight masts' and the towers' with them. */
function longShadows(ctx: Ctx, r: R): void {
  ctx.fillStyle = rgba('#5a6ab0', 0.3);
  const streak = (x: number, y: number, h: number) => {
    const w = h * 0.3;
    ctx.beginPath();
    ctx.moveTo(x - w * 0.5, y);
    ctx.quadraticCurveTo(x + h * 1.2, y + h * 0.1, x + h * 2.6, y + h * 0.5);
    ctx.quadraticCurveTo(x + h * 1.2, y + h * 0.3, x + w * 0.5, y + h * 0.04);
    ctx.closePath();
    ctx.fill();
  };
  for (let x = -40; x < 1320; x += 10 + r() * 22) {
    const y = edgeY(SL.pisteUp, x) - 3;
    streak(x, y, Math.max(16, (y - 436) * 0.82) * (0.6 + r() * 0.6));
  }
  for (const [x, y, h] of [[1004, 640, 96], [1330, 612, 88]] as const) streak(x, y, h * 0.5);
  for (const [x, y, h] of SL.masts) {
    ctx.beginPath();
    ctx.moveTo(x - 3, y);
    ctx.lineTo(x + h * 2.4, y + h * 0.45);
    ctx.lineTo(x + h * 2.4 + 6, y + h * 0.47);
    ctx.lineTo(x + 3, y + 2);
    ctx.closePath();
    ctx.fill();
  }
}

/** The floodlights at night (live only, added): the lamp heads blazing, their cones down through the air onto the
 * run, the pools of light on the snow. */
function floods(ctx: Ctx): void {
  for (const [x, y, h] of SL.masts) {
    const k = h / 180;
    const top = y - h;
    // the pool on the snow, thrown down the run in front of each mast
    const px = x - 90 * k;
    const py = y + 6;
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(1, 0.22);
    const pg = ctx.createRadialGradient(0, 0, 0, 0, 0, 230 * k);
    pg.addColorStop(0, 'rgba(255,226,170,0.55)');
    pg.addColorStop(0.45, 'rgba(255,210,150,0.2)');
    pg.addColorStop(0.8, 'rgba(255,205,145,0.05)');
    pg.addColorStop(1, 'rgba(255,200,140,0)');
    ctx.fillStyle = pg;
    ctx.fillRect(-300 * k, -300 * k, 600 * k, 600 * k);
    ctx.restore();
    // the cone through the falling snow, soft-edged
    softly(ctx, { x: px - 260 * k, y: top - 10, w: 460 * k, h: py - top + 20 }, (g) => {
      const cg = g.createLinearGradient(x, top, px, py);
      cg.addColorStop(0, 'rgba(255,232,190,0.26)');
      cg.addColorStop(1, 'rgba(255,220,170,0)');
      g.fillStyle = cg;
      g.beginPath();
      g.moveTo(x - 12 * k, top);
      g.lineTo(x + 12 * k, top);
      g.lineTo(px + 130 * k, py);
      g.lineTo(px - 200 * k, py);
      g.closePath();
      g.fill();
    }, 0.2);
    // the lamps
    for (let i = 0; i < 4; i++) {
      const lx = x - 15 * k + i * 10 * k;
      const g = ctx.createRadialGradient(lx, top - 3 * k, 0, lx, top - 3 * k, 18 * k);
      g.addColorStop(0, 'rgba(255,250,236,1)');
      g.addColorStop(0.3, 'rgba(255,236,190,0.6)');
      g.addColorStop(1, 'rgba(255,220,160,0)');
      ctx.fillStyle = g;
      ctx.fillRect(lx - 20 * k, top - 24 * k, 40 * k, 40 * k);
    }
    const hg = ctx.createRadialGradient(x, top, 0, x, top, 60 * k);
    hg.addColorStop(0, 'rgba(255,236,200,0.5)');
    hg.addColorStop(1, 'rgba(255,220,170,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(x - 60 * k, top - 60 * k, 120 * k, 120 * k);
  }
}

// ——— live ———

type Img = Phaser.GameObjects.Image;

/** Two images showing a run of frames (base … base + n − 1) cross-faded at a fractional position. */
class Pair {
  readonly a: Img;
  readonly b: Img;
  constructor(k: KitLive, key: string, into: Phaser.GameObjects.Container, origin: [number, number]) {
    this.a = k.img(key, 0, 0, { into, origin });
    this.b = k.img(key, 0, 0, { into, origin });
  }
  show(base: number, n: number, ph: number, alpha: number): void {
    const f = ((ph % n) + n) % n;
    const i = Math.floor(f);
    this.a.setFrame(base + i).setAlpha(alpha);
    this.b.setFrame(base + ((i + 1) % n)).setAlpha(alpha * (f - i));
  }
  hold(frame: number, alpha: number): void {
    this.a.setFrame(frame).setAlpha(alpha);
    this.b.setAlpha(0);
  }
  each(fn: (im: Img) => void): void {
    fn(this.a);
    fn(this.b);
  }
}

/** Where s sits in its span between towers (0 … 1). */
function spanU(s: number): number {
  const ts = [-0.2, ...SL.towers, 1.2];
  for (let i = 0; i < ts.length - 1; i++) if (s >= ts[i] && s <= ts[i + 1]) return (s - ts[i]) / (ts[i + 1] - ts[i]);
  return 0;
}

registerKitScene(SLOPES, (k: KitLive, wave0) => {
  const clamp = Phaser.Math.Clamp;
  const ease = Phaser.Math.Easing.Sine.InOut;
  const top = k.slot('top');
  const liftSlot = k.slot('liftLive');
  const skiSlot = k.slot('skiLive');
  const clouds = k.sprite('clouds');
  const cloudsPMs = k.sprite('cloudsPM');
  const farPMs = k.sprite('farPM');
  const shadowsPMs = k.sprite('shadowsPM');
  const pmX = cloudsPMs.x;
  const farGrey = k.sprite('farGrey');
  const farNight = k.sprite('farNight');
  const floodsS = k.sprite('floods');
  const cloudX = clouds.x;

  // ——— hero: the chairlift ———
  const downC = k.sc.add.container(0, 0);
  const towersC = k.sc.add.container(0, 0);
  const cablesG = k.sc.add.graphics();
  const upC = k.sc.add.container(0, 0);
  liftSlot.add([downC, towersC, cablesG, upC]);
  for (const [i, s] of SL.towers.entries()) {
    const p = liftAt(s);
    const h = p.gy - p.cy;
    const pad = 16 * p.k + 4;
    const tw = Math.ceil(170 * p.k + 8);
    const th = Math.ceil(pad + h + 8 * p.k + 4);
    const key = k.tex(`sl_tower${i}`, tw, th, (c) => {
      c.translate(tw / 2, pad + h);
      tower(c, h, p.k, 0.15 + (1 - p.k) * 0.6);
    });
    k.img(key, p.x, p.gy, { into: towersC, origin: [0.5, (pad + h) / th] });
  }
  const CN = RIDERS.length * CHF.n + 2;
  const chairKey = sheet(k, 'sl_chair', CHF.fw * CHF.k, CHF.fh * CHF.k, CN, (c, _p, i) => {
    c.scale(CHF.k, CHF.k);
    if (i < RIDERS.length * CHF.n) {
      const v = RIDERS[Math.floor(i / CHF.n)];
      chairFrame(c, (i % CHF.n) / CHF.n, v.who, v.kits);
    } else chairFrame(c, 0, null, [], i === CN - 2);
  });
  const ORIGIN: [number, number] = [CHF.ox / CHF.fw, 6 / CHF.fh];
  interface Chair { s: number; side: number; v: number; pair: Pair; sw: Spring; ph: number; fps: number; seed: number }
  const SPEED = 0.017;
  const chairs: Chair[] = [];
  const N = 11;
  for (let i = 0; i < N; i++) {
    chairs.push({ s: -0.12 + (i / N) * 1.14, side: 1, v: Math.floor(crand() * RIDERS.length), pair: new Pair(k, chairKey, upC, ORIGIN), sw: new Spring(0, 5, 0.6), ph: crand() * CHF.n, fps: 0.9 + crand() * 0.8, seed: crand() * 9 });
    chairs.push({ s: -0.12 + ((i + 0.5) / N) * 1.14, side: -1, v: -1, pair: new Pair(k, chairKey, downC, ORIGIN), sw: new Spring(0, 5, 0.6), ph: 0, fps: 0, seed: crand() * 9 });
  }
  const bounce = new Spring(0, 16, 1.4);
  const cableAt = (s: number, side: number): [number, number, number] => {
    const p = liftAt(s);
    return [p.x + side * CABLE_OFF * p.k, p.cy + 14 * p.k + sagAt(s) + bounce.x * Math.sin(spanU(s) * Math.PI) * p.k * (0.6 + 0.4 * side), p.k];
  };

  // ——— hero: the skiers ———
  const SKN = SKF.n + SKF.wob;
  const shadowKey = k.tex('sl_skshadow', 96, 20, (c) => {
    const g = c.createRadialGradient(48, 10, 0, 48, 10, 48);
    g.addColorStop(0, 'rgba(40,60,120,0.5)');
    g.addColorStop(1, 'rgba(40,60,120,0)');
    c.save();
    c.scale(1, 20 / 96);
    c.fillStyle = g;
    c.fillRect(0, 0, 96, 96);
    c.restore();
  });
  const fx = k.sc.add.container(0, 0);
  const powder = new Parts(k, { frame: 'puff', into: skiSlot, max: 120 });
  const glints = new Parts(k, { frame: 'spark', add: true, into: top, max: 90 });
  const skiers = SKIERS.map((sk, i) => {
    const key = sheet(k, `sl_sk_${sk.id}`, SKF.fw * SKF.k, SKF.fh * SKF.k, SKN, (c, _p, f) => {
      c.scale(SKF.k, SKF.k);
      if (f < SKF.n) skierFrame(c, f / SKF.n, BUILDS[sk.id], KITS[sk.id]);
      else skierFrame(c, 0.25, BUILDS[sk.id], KITS[sk.id], (f - SKF.n) / SKF.wob);
    });
    const shadow = k.img(shadowKey, 0, 0, { into: skiSlot });
    const pair = new Pair(k, key, skiSlot, [SKF.ox / SKF.fw, SKF.base / SKF.fh]);
    return { sk, u: [0.42, 0.12, 0.7][i], wait: 0, wob: -1, shadow, pair, lastPh: 0, x: 0, y: 0, kk: 0 };
  });

  // ——— the piste basher at night ———
  const catKey = sheet(k, 'sl_cat', SC.fw * SC.k, SC.fh * SC.k, SC.n, (c, ph) => {
    c.scale(SC.k, SC.k);
    snowcatFrame(c, ph);
  });
  const cat = new Pair(k, catKey, skiSlot, [SC.ox / SC.fw, SC.base / SC.fh]);
  let catU = 0.6;
  let catPh = 0;
  const beamKey = k.tex('sl_beam', 256, 64, (c) => {
    const g = c.createLinearGradient(0, 0, 256, 0);
    g.addColorStop(0, 'rgba(255,248,220,0.9)');
    g.addColorStop(0.3, 'rgba(255,244,210,0.4)');
    g.addColorStop(1, 'rgba(255,240,200,0)');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(0, 30);
    c.lineTo(256, 0);
    c.lineTo(256, 64);
    c.lineTo(0, 34);
    c.closePath();
    c.fill();
    c.globalCompositeOperation = 'destination-in';
    const v = c.createLinearGradient(0, 0, 0, 64);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(0.5, 'rgba(0,0,0,1)');
    v.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = v;
    c.fillRect(0, 0, 256, 64);
  });

  // ——— the snow: falling in two depths, knocked off the fir and the rails ———
  const T = 256;
  const snowFar = k.sc.add.tileSprite(0, 0, W, 1080, k.tex('sl_snow0', T, T, (c) => snowTile(c, T, 0))).setOrigin(0, 0).setAlpha(0);
  const snowNear = k.sc.add.tileSprite(0, 0, W, 1080, k.tex('sl_snow1', T, T, (c) => snowTile(c, T, 1))).setOrigin(0, 0).setAlpha(0);
  top.add([snowFar, snowNear, fx]);
  const CH = 12;
  const clumpKey = sheet(k, 'sl_clump', CH * 2, CH * 2, 4, (c, _p, i) => clumpFrame(c, CH, i));
  const clumps = new Parts(k, { frame: 'puff', sheet: { key: clumpKey, n: 4, half: CH }, into: fx, max: 70 });
  const puffs = new Parts(k, { frame: 'puff', into: fx, max: 90 });
  const poof = (x: number, y: number, s = 1) => {
    for (let i = 0; i < 3; i++) puffs.spawn({ x: x + (crand() - 0.5) * 10 * s, y: y - 4, vx: (crand() - 0.5) * 70 * s, vy: -20 - crand() * 50 * s, life: 0.7 + crand() * 0.5, r0: 6 * s, r1: 22 * s, a: 0.65, tint: 0xf4f8ff, drag: 2.5, grav: 30, fade: 0.08 });
  };
  // the mug's steam, bolder in the cold
  const steamKey = sheet(k, 'sl_steam', 80, 110, 8, (c, ph) => steamFrame(c, 80, 110, ph, { a: 0.4, lit: '#ffffff', body: '#eef2f8', shade: '#a8b4c8', n: 6, lean: 0.4 }));
  const steam = new Loop(k, steamKey, 8, SL.mug.x, SL.mug.y - 112, { into: fx, origin: [0.5, 1], fps: 5 });

  // ——— the light over everything: afternoon warmth, the squall's grey, the night ———
  const warm = k.wash(0xffd6a6, 0, Phaser.BlendModes.MULTIPLY, top);
  const grey = k.wash(0xaab4c2, 0, Phaser.BlendModes.MULTIPLY, top);
  const night = k.wash(0x34446e, 0, Phaser.BlendModes.MULTIPLY, top);
  const sunGlow = k.glow(SL.sun.x, SL.sun.y + 80, 900, 0xffcf8a, 0, { into: top });
  top.add(floodsS);
  floodsS.setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
  const flurries = new Parts(k, { frame: 'soft', add: true, into: top, max: 120 });
  const catBeam = k.img(beamKey, 0, 0, { into: top, add: true, origin: [0, 0.5] }).setAlpha(0);
  const catBar = k.glow(0, 0, 40, 0xfff2d0, 0, { into: top });
  const catBeacon = k.glow(0, 0, 30, 0xff8a1a, 0, { into: top });
  const lampDip = new Spring(0, 40, 4);

  // the skis in the drift, rattling
  const skisSw = new Swing(k.pivot(k.sprite('skis'), SL.skis.x + 17, TY - 14), { k: 40, c: 2.2, idle: 0.004, seed: 3 });

  const glintRate = new Rate();
  const flurryRate = new Rate();
  let kw = waveK(wave0);
  let shown = kw;
  let greyK = 0;
  let nightK = 0;

  return {
    setWave: (w) => (kw = waveK(w)),
    impact(x, _y, p) {
      // the whole line bounces on its cables, every chair swinging
      bounce.v += 60 * p;
      for (const c of chairs) c.sw.v += (crand() - 0.5) * 2.2 * p + (c.side > 0 ? 0.6 : -0.6) * p;
      // the skier nearest the stomp wobbles
      if (p > 0.15) {
        let best = -1;
        let bd = 1e9;
        skiers.forEach((s, i) => {
          if (s.wait > 0 || s.wob >= 0) return;
          const d = Math.abs(s.x - x);
          if (d < bd) {
            bd = d;
            best = i;
          }
        });
        if (best >= 0) skiers[best].wob = 0;
      }
      skisSw.kick((x < SL.skis.x ? 1 : -1) * (0.5 + crand() * 0.4) * p);
      lampDip.v -= 12 * p;
      // snow shaken off the top rail near the stomp, bursting in the drift
      for (let i = 0; i < 3 + 7 * p; i++) {
        clumps.spawn({ x: x + (crand() - 0.5) * 520, y: SL.rail.top - 6, vx: (crand() - 0.5) * 60, vy: -40 - crand() * 140 * p, life: 1.6, r0: 7 + crand() * 7, a: 1, tint: 0xffffff, grav: 1100, fade: 0.01, floor: SL.rail.bank - 4 + crand() * 50, onFloor: (fx2, fy) => poof(fx2, fy, 0.7), spin: (crand() - 0.5) * 8 });
      }
      // the big fir sheds the snow off its boughs: clumps tumbling, powder sifting down after them
      if (p > 0.2) {
        const { x: fxx, base, h } = SL.fir;
        for (let i = 0; i < 10 + 16 * p; i++) {
          const t = 0.15 + crand() * 0.8;
          const bx = fxx + (crand() - 0.5) * h * 0.5 * t;
          const by = base - h + t * h * 0.94;
          clumps.spawn({ x: bx, y: by, vx: (crand() - 0.5) * 80, vy: -20 - crand() * 60, life: 2.2, r0: 9 + crand() * 9, a: 1, tint: 0xffffff, grav: 900, fade: 0.01, floor: 700 + crand() * 40, onFloor: (fx2, fy) => poof(fx2, fy, 1), spin: (crand() - 0.5) * 6 });
          puffs.spawn({ x: bx, y: by, vx: (crand() - 0.5) * 30, vy: 10 + crand() * 30, life: 1.8 + crand(), r0: 14, r1: 60, a: 0.55, tint: 0xeef4ff, drag: 1.5, grav: 25, fade: 0.15 });
        }
      }
    },
    update(dt, t) {
      shown += (kw - shown) * Math.min(1, dt * 0.6);
      // 0 the morning (wave 1) … the afternoon (2) … the squall (3) … 1 night skiing (4)
      const pmK = clamp(shown / 0.33, 0, 1) * (1 - clamp((shown - 0.33) / 0.33, 0, 1));
      greyK = ease(clamp((shown - 0.33) / 0.33, 0, 1));
      nightK = ease(clamp((shown - 0.66) / 0.34, 0, 1));
      const fairK = (1 - greyK) * (1 - nightK);
      farGrey.setAlpha(greyK);
      farNight.setAlpha(nightK);
      clouds.setAlpha(fairK * (1 - pmK * 0.4)).setTint(Phaser.Display.Color.GetColor(255, Math.round(255 - pmK * 22), Math.round(255 - pmK * 50)));
      clouds.x = cloudX + Math.sin(t * 0.015) * 60 * calm();
      cloudsPMs.setAlpha(clamp(pmK * 1.6, 0, 1) * (1 - greyK));
      farPMs.setAlpha(clamp(pmK * 1.4, 0, 1));
      shadowsPMs.setAlpha(clamp(pmK * 1.3, 0, 1));
      cloudsPMs.x = pmX + Math.sin(t * 0.012 + 1) * 40 * calm();
      warm.setAlpha(pmK * 0.3);
      sunGlow.setAlpha(pmK * 0.2);
      grey.setAlpha(greyK * 0.32 * (1 - nightK));
      night.setAlpha(nightK * 0.6);
      const dip = lampDip.step(0, dt);
      const floodK = nightK * clamp(1 + dip * 0.1 + (Math.abs(dip) > 0.6 ? (crand() - 0.5) * 0.5 : 0), 0, 1.2);
      floodsS.setAlpha(floodK);
      const wind = 1 + greyK * 1.5;

      // ——— the chairlift
      const b = bounce.step(0, dt);
      void b;
      for (const c of chairs) {
        const s0 = c.s;
        c.s += c.side * SPEED * dt * calm();
        if (c.side > 0 && c.s > 1.02) {
          c.s = -0.12;
          c.v = Math.floor(crand() * RIDERS.length);
        }
        if (c.side < 0 && c.s < -0.12) c.s = 1.02;
        // rolling over a tower's sheaves jolts it
        for (const ts of SL.towers) if ((s0 - ts) * (c.s - ts) < 0) c.sw.v += (crand() < 0.5 ? -1 : 1) * 0.35;
        const [x, y, kk] = cableAt(c.s, c.side);
        const sway = Math.sin(t * 0.9 + c.seed) * 0.015 * wind * calm();
        const ang = c.sw.step(sway, dt);
        const alpha = clamp((1.0 - c.s) / 0.06, 0, 1) * clamp((c.s + 0.12) / 0.03, 0, 1);
        c.pair.each((im) => im.setPosition(x, y).setScale(kk / CHF.k).setRotation(ang).setDepth(-c.s));
        if (c.side > 0) {
          c.ph += dt * c.fps * calm();
          c.pair.show(c.v * CHF.n, CHF.n, c.ph, alpha);
        } else c.pair.hold(CN - 2, alpha);
      }
      upC.sort('depth');
      downC.sort('depth');
      // the cables through the sheaves, sagging and bouncing
      cablesG.clear();
      for (const side of [-1, 1]) {
        let prev: [number, number, number] | null = null;
        for (let s = -0.14; s <= 1.0001; s += 0.01) {
          const q = cableAt(s, side);
          if (prev) {
            cablesG.lineStyle(Math.max(0.8, 3 * q[2]), 0x1e2428, 1);
            cablesG.lineBetween(prev[0], prev[1], q[0], q[1]);
          }
          prev = q;
        }
      }

      // ——— the skiers
      for (const s of skiers) {
        if (s.wait > 0) {
          s.wait -= dt;
          s.pair.each((im) => im.setVisible(false));
          s.shadow.setVisible(false);
          if (s.wait <= 0) s.u = 0;
          continue;
        }
        s.u += (dt / s.sk.dur) * (s.wob >= 0 ? 0.6 : 1) * calm();
        if (s.u >= 1) {
          s.wait = 1 + crand() * 4;
          continue;
        }
        const p = skierAt(s.sk, s.u);
        s.x = p.x;
        s.y = p.y;
        s.kk = p.k;
        const alpha = clamp(s.u / 0.03, 0, 1) * clamp((1 - s.u) / 0.03, 0, 1);
        s.pair.each((im) => im.setVisible(true).setPosition(p.x, p.y).setScale(-p.k / SKF.k, p.k / SKF.k).setDepth(p.y));
        s.shadow.setVisible(true).setPosition(p.x + 14 * p.k, p.y + 1).setScale(p.k * 1.1, p.k).setAlpha(alpha * (1 - nightK * 0.5)).setDepth(p.y - 1);
        if (s.wob >= 0) {
          s.wob += dt / 1.3;
          if (s.wob >= 1) s.wob = -1;
          else s.pair.hold(SKF.n + Math.min(SKF.wob - 1, Math.floor(s.wob * SKF.wob)), alpha);
        }
        if (s.wob < 0) s.pair.show(0, SKF.n, p.ph * SKF.n, alpha);
        // powder thrown off the skis at each turn's end, out of the turn and back up the hill
        const apex = (q: number) => (s.lastPh - q) * (p.ph - q) < 0 && Math.abs(s.lastPh - p.ph) < 0.5;
        if (apex(0.25) || apex(0.75)) {
          const out = p.ph < 0.5 ? -1 : 1;
          const n = Math.round(4 + p.k * 10);
          for (let i = 0; i < n; i++) {
            powder.spawn({ x: p.x + 30 * p.k + crand() * 20 * p.k, y: p.y - 4 * p.k, vx: (60 + crand() * 140) * p.k, vy: (out * 30 - 40 - crand() * 90) * p.k, life: 0.7 + crand() * 0.6, r0: 4 * p.k, r1: (16 + crand() * 14) * p.k, a: 0.75, tint: 0xffffff, drag: 2.2, grav: 60 * p.k, fade: 0.06 });
          }
          if (fairK > 0.2) for (let i = 0; i < 4; i++) glints.spawn({ x: p.x + 30 * p.k + crand() * 30 * p.k, y: p.y - 10 * p.k - crand() * 30 * p.k, vx: (40 + crand() * 60) * p.k, vy: -30 * p.k, life: 0.5 + crand() * 0.4, r0: 5 * p.k + 1.5, r1: 1, a: 0.9 * fairK, tint: 0xfff8e0, grav: 80, fade: 0.2 });
        }
        s.lastPh = p.ph;
      }
      powder.update(dt);

      // ——— the piste basher grooming its way up the run at night
      const catOn = nightK > 0.05;
      cat.each((im) => im.setVisible(catOn));
      catBeam.setVisible(catOn);
      if (catOn) {
        catU -= (dt / 70) * calm();
        if (catU < 0.02) catU = 0.88;
        const p = skiLine(catU);
        const cx = p.x + 60 * p.k;
        const cy = p.y + 26 * p.k;
        catPh += dt * 6 * calm();
        const a = nightK * clamp(catU / 0.05, 0, 1) * clamp((0.88 - catU) / 0.05, 0, 1);
        cat.each((im) => im.setPosition(cx, cy).setScale(p.k / SC.k).setDepth(cy));
        cat.show(0, SC.n, catPh, a);
        const sc = p.k;
        catBeam.setPosition(cx + 80 * sc, cy - 54 * sc).setScale(sc * 1.6, sc * 1.4).setRotation(-0.12).setAlpha(a * 0.75);
        catBar.setPosition(cx + 15 * sc, cy - 106 * sc).setScale((60 * sc) / 128).setAlpha(a * 0.7);
        catBeacon.setPosition(cx + 6 * sc, cy - 112 * sc).setScale((40 * sc) / 128).setAlpha(a * (0.4 + 0.6 * Math.max(0, Math.sin(t * 7))));
      } else {
        catBar.setAlpha(0);
        catBeacon.setAlpha(0);
      }
      skiSlot.sort('depth');

      // ——— the snow: diamond dust in the sun, the squall, flurries in the floodlights
      const snowK = greyK * (1 - nightK) * 0.95 + nightK * 0.4;
      snowFar.setAlpha(snowK * 0.85);
      snowNear.setAlpha(clamp((snowK - 0.25) * 1.3, 0, 0.85));
      snowFar.tilePositionY -= 50 * dt * calm();
      snowFar.tilePositionX -= (12 + 30 * greyK) * Math.sin(t * 0.3) * dt * calm() + 20 * greyK * dt;
      snowNear.tilePositionY -= 110 * dt * calm();
      snowNear.tilePositionX -= (30 + 50 * greyK) * Math.sin(t * 0.25 + 1) * dt * calm() + 50 * greyK * dt;
      glintRate.tick(14 * fairK * calm(), dt, () => {
        glints.spawn({ x: crand() * W, y: 60 + crand() * 520, vx: 6 + crand() * 10, vy: 10 + crand() * 14, life: 1 + crand() * 1.5, r0: 2 + crand() * 3, r1: 0.5, a: 0.8 * fairK, tint: 0xfffaf0, fade: 0.4 });
      });
      glints.update(dt);
      flurryRate.tick(40 * nightK * calm(), dt, () => {
        const [mx, my, mh] = SL.masts[Math.floor(crand() * SL.masts.length)];
        const u = crand();
        const kk = mh / 180;
        flurries.spawn({ x: mx - u * 200 * kk + (crand() - 0.5) * 80 * kk, y: my - mh + u * mh + (crand() - 0.5) * 30, vx: -10 - crand() * 20, vy: 30 + crand() * 30, life: 1.2 + crand(), r0: 1.5 + crand() * 2 * kk, a: 0.8 * floodK, tint: 0xfff0d0, fade: 0.3 });
      });
      flurries.update(dt);
      clumps.update(dt);
      puffs.update(dt);
      steam.step(dt, calm());
      steam.alpha = 0.55 + greyK * 0.2;
      skisSw.update(dt, t);
    },
  };
});
