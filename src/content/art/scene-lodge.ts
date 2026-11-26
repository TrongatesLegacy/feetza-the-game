// Alpine Lodge (Act 2, waves 21–24), redrawn with the location kit (src/art/scene): a log cabin high in the mountains
// as the day goes. Hewn logs with pale chinking under a heavy ceiling beam; a river-stone chimney breast on the left,
// the fire in its arched firebox on a slate hearth, split wood stacked beside it, a mounted rack of antlers on a
// walnut shield over the mantel and candles in pewter sticks; a wide three-light window onto the peaks (alpenglow, a
// forest of firs, snow drifting on the outside sill) between tartan curtains on tie-backs; a brass sconce; skis and
// bamboo poles leaning on the logs; a tartan cloth on the table.
//
// Live, the heroes:
// - the fire: painted tongue by tongue in soft layers (a red skin to a white-hot core) at 8 phases of its cycle and
//   played cross-faded, smoke curling into the throat, the front log's cracks breathing; a second painted cycle
//   of low, guttering flames. A stomp knocks it down (it gutters, the room's light dipping with it, ash puffing out of
//   the mouth), then it flares back with a burst of sparks. Embers stream up the flue; the bed of coals breathes;
// - the snow: from a still alpenglow (a few flakes) through dusk and nightfall to a blizzard. Two depths of painted
//   flakes beyond the glass, near flakes tumbling past, a whiteout and raking painted veils in the blizzard, frost ferns
//   creeping over the panes, and the drift on the outside sill building wave by wave. A stomp shakes the snow off the
//   eave over the window in a powdery fall, clumps breaking off its lip and bursting on the drift;
// - the antlers rattle on their nail when the table's hit (a stiff spring), soot sifting off the mantel; the skis
//   clatter against the logs; the candles duck and recover.
// Across the stage the light outside goes from pink alpenglow to dusk, to night and the blizzard, and the room falls
// into the dark from its far end, the fire holding the left side warm.

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
  crevice,
  creviceV,
  ellPath,
  glowAt,
  gradeAll,
  haze,
  lightPool,
  lineAt,
  rectPath,
  rim,
  rrPath,
  solid,
  vfill,
  vignetteAll,
  within,
} from '../../art/scene/kit';
import type { SceneSpec } from '../../art/scene/layers';
import { aoHalo, lampOnWall, lightPatch } from '../../art/scene/light';
import { grain, tableFalloff, tableSeam, woodGrain } from '../../art/scene/materials';
import { drift, grime, lay, noiseMask, softly, surface } from '../../art/scene/paint';
import { candle, flameShape, glassPane } from '../../art/scene/props';
import { cloud, skyFill, stars } from '../../art/scene/sky';
import { makeCanvas, mix, rgba, shade } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { Loop, Parts, Rate, Spring, Swing, flameFrame, sheet } from '../../game/sceneAnim';
import { type KitLive, calm, flicker, registerKitScene, waveK } from '../../game/sceneLive';
import { type Sett, conifer, foldedFront, frontX, ridgePath, smokeFrame, tartanCloth, treeLine, wave1 } from './sceneBits';

// ——— layout ———

export const LG = {
  front: 1040,
  /** The ceiling beam's foot. */
  beam: 46,
  chim: { x0: 24, x1: 470 },
  mantel: { y: 446, h: 34 },
  fire: { x: 247, y: 742, mouthHalf: 132, archTop: 556 },
  win: { x0: 610, x1: 1290, y0: 150, y1: 520 },
  sconce: { x: 1452, y: 330 },
  skis: { x: 1700 },
  candles: [104, 398] as const,
  antlers: { x: 247, y: 262 },
  pile: { x0: 484, x1: 604, top: 614 },
};

const P2 = Math.PI * 2;
const LOG = '#8a5a34';
const WIN = LG.win;
const WIN_BOX = { x: WIN.x0, y: WIN.y0, w: WIN.x1 - WIN.x0, h: WIN.y1 - WIN.y0 };
const PANE_W = (WIN.x1 - WIN.x0) / 3;
/** The transom bar's middle. */
const MID_Y = (WIN.y0 + WIN.y1) / 2 - 20;

// ——— the wall ———

const LOG_H = 50;

function logs(ctx: Ctx, r: R): void {
  ctx.fillStyle = '#c8b896';
  ctx.fillRect(0, 0, W, TY);
  for (let y = LG.beam - 14, i = 0; y < TY; y += LOG_H, i++) {
    const col = shade(LOG, (r() - 0.5) * 0.16);
    // a log lying along the wall: a cylinder lit along its upper curve, its underside turned away into shade
    const lp = rrPath(-20, y, W + 40, LOG_H - 7, 20);
    ctx.save();
    lp(ctx);
    ctx.clip();
    surface(ctx, r, { x: 0, y, w: W, h: LOG_H - 7 }, col, { vary: 0.35, cells: 9, mottle: 0.25, strokes: 0.5, strokeAng: 0, strokeLen: 140, grain: 0.16, seed: 31 + i });
    woodGrain(ctx, r, { x: 0, y: y + 3, w: W, h: LOG_H - 12 }, col, false, 0.55);
    vfill(ctx, 0, y, W, LOG_H - 7, [[0, 'rgba(20,8,2,0.45)'], [0.16, 'rgba(255,214,160,0.16)'], [0.32, 'rgba(255,214,160,0.06)'], [0.62, 'rgba(20,8,2,0)'], [1, 'rgba(20,8,2,0.55)']]);
    // adze facets hewn along it, and drying checks with dark lips
    for (let k = 0; k < 9; k++) {
      const cx = r() * W;
      const len = 60 + r() * 140;
      ctx.fillStyle = rgba('#ffe0b0', 0.05);
      ctx.beginPath();
      ctx.ellipse(cx, y + 14, len / 2, 5, 0, 0, P2);
      ctx.fill();
    }
    for (let k = 0; k < 5; k++) {
      const cx = r() * W;
      const cy = y + 16 + r() * 16;
      const len = 40 + r() * 150;
      ctx.strokeStyle = rgba(shade(col, -0.65), 0.7);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.quadraticCurveTo(cx + len / 2, cy + (r() - 0.5) * 4, cx + len, cy + (r() - 0.5) * 3);
      ctx.stroke();
      ctx.strokeStyle = rgba('#ffd8a8', 0.12);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy + 1.6);
      ctx.lineTo(cx + len, cy + 1.6);
      ctx.stroke();
    }
    // knots, each with its ring of grain and its dark heart
    for (let k = 0; k < 2; k++) {
      const kx = r() * W;
      const ky = y + 16 + r() * 10;
      ctx.strokeStyle = rgba(shade(col, -0.4), 0.5);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(kx, ky, 13, 6, 0, 0, P2);
      ctx.stroke();
      ctx.fillStyle = rgba(shade(col, -0.6), 0.8);
      ctx.beginPath();
      ctx.ellipse(kx, ky, 5, 3, 0, 0, P2);
      ctx.fill();
    }
    ctx.restore();
    // the chinking: pale mortar pressed between the logs, recessed in their shadow
    vfill(ctx, 0, y + LOG_H - 9, W, 11, [[0, 'rgba(26,12,4,0.85)'], [0.35, 'rgba(176,160,128,0.95)'], [0.8, 'rgba(206,190,156,0.95)'], [1, 'rgba(30,14,6,0.6)']]);
    lay(ctx, noiseMask(30, 61 + i, { cover: 0.4, soft: 0.2, col: '#5a4630', w: 240, h: 12 }), { x: 0, y: y + LOG_H - 8, w: W, h: 8 }, 0.5);
  }
  lay(ctx, drift('#ffcf9a', '#2a140a', 5, 41, 200, 90), { x: 0, y: 0, w: W, h: TY }, 0.16);
  // the light: dark up under the beam, the fire's warmth on the left, the window's cool light round it, the sconce
  vfill(ctx, 0, 0, W, TY, [[0, 'rgba(20,8,2,0.66)'], [0.35, 'rgba(20,8,2,0.24)'], [0.75, 'rgba(20,8,2,0.18)'], [1, 'rgba(20,8,2,0.42)']]);
  lightPool(ctx, LG.fire.x + 240, 600, 560, 260, '#ff8a3a', 0.16);
  lightPool(ctx, (WIN.x0 + WIN.x1) / 2, WIN.y1 + 70, 520, 130, '#c8b0d8', 0.07);
  // the key: warm from the top left, the wall falling off into shade towards the bottom right
  const kg = ctx.createRadialGradient(-200, -300, 200, -200, -300, 2300);
  kg.addColorStop(0, rgba('#ffcf94', 0.16));
  kg.addColorStop(0.5, rgba('#ffcf94', 0.05));
  kg.addColorStop(1, rgba('#ffcf94', 0));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = kg;
  ctx.fillRect(0, 0, W, TY);
  ctx.restore();
  const g = ctx.createLinearGradient(400, 0, W, TY * 1.6);
  g.addColorStop(0, 'rgba(14,6,4,0)');
  g.addColorStop(0.55, 'rgba(14,6,4,0.18)');
  g.addColorStop(1, 'rgba(14,6,4,0.5)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, TY);
  // the sconce: a small parchment-shaded lamp, its pool soft and well under the key
  lampOnWall(ctx, LG.sconce.x, LG.sconce.y + 22, 30, { col: '#ffd090', a: 0.26, reach: 240, spread: 170, gap: 140, above: 0.2, op: 'lighter' });
  lightPool(ctx, LG.sconce.x, LG.sconce.y + 30, 150, 120, '#ffc880', 0.1);
  grime(ctx, { x: 0, y: 0, w: W, h: TY }, { top: 110, bottom: 70, right: 90, a: 0.35, patchy: 0.5, seed: 43, col: '#140804' });
  crevice(ctx, 0, W, TY, -70, 0.45);
}

/** The ceiling beam across the top: a squared timber with adze marks, its underside lit faintly by the fire. */
function ceilingBeam(ctx: Ctx, r: R): void {
  const h = LG.beam;
  const p = rectPath(-10, -10, W + 20, h + 10);
  castShadow(ctx, p, 12, 22, 0.6);
  solid(ctx, p, { x: 0, y: 0, w: W, h }, 'wood', '#4a2e1a', { depth: 0.1, line: false, formSize: 10 });
  within(ctx, p, () => {
    woodGrain(ctx, r, { x: 0, y: 0, w: W, h }, '#4a2e1a', false, 0.8);
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = rgba('#140804', 0.25);
      ctx.beginPath();
      ctx.ellipse(r() * W, 10 + r() * 26, 22 + r() * 20, 3.5, 0, 0, P2);
      ctx.fill();
    }
    vfill(ctx, 0, 0, W, h, [[0, 'rgba(10,4,2,0.55)'], [0.7, 'rgba(10,4,2,0.1)'], [0.86, rgba('#ffb070', 0.14)], [1, 'rgba(10,4,2,0.5)']]);
    lightPool(ctx, LG.fire.x + 120, h, 520, 22, '#ff9040', 0.18);
  });
  ctx.strokeStyle = '#140804';
  ctx.lineWidth = lineAt(0.1);
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(W, h);
  ctx.stroke();
  // iron straps bolted round it
  for (const x of [700, 1220, 1760]) {
    const s = rectPath(x - 7, 0, 14, h + 2);
    solid(ctx, s, { x: x - 7, y: 0, w: 14, h: h + 2 }, 'iron', '#2a2626', { depth: 0.1, line: 1.2, formSize: 3 });
    for (const by of [12, 32]) {
      ctx.fillStyle = '#5a5250';
      ctx.beginPath();
      ctx.arc(x, by, 2.6, 0, P2);
      ctx.fill();
      ctx.fillStyle = rgba('#ffe0c0', 0.5);
      ctx.fillRect(x - 1.5, by - 2, 1.5, 1.2);
    }
  }
}

// ——— the window and the mountains ———

interface ViewCols {
  sky: [number, string][];
  peakLit: string;
  peakShade: string;
  rock: string;
  /** The far range, through more air. */
  far: string;
  forest: string;
  near: [string, string, string];
  snow: string;
  snowShade: string;
  air: Air;
  cloud?: [string, string, string];
  /** Snow lying on the near firs (it builds through the stage). */
  fir: number;
  night?: boolean;
  glow?: [number, number, number, string, number];
}

// wave 1: alpenglow, the peaks burning pink and orange over a valley already in blue shadow
const DAY: ViewCols = {
  sky: [[0, '#4a6cb4'], [0.38, '#9a9cd0'], [0.66, '#f0b0a0'], [0.85, '#ffc898'], [1, '#ffd8b0']],
  peakLit: '#ffa888',
  peakShade: '#6676b2',
  rock: '#3e3a64',
  far: '#a090c0',
  forest: '#24345a',
  near: ['#0e1a2c', '#1c3248', '#4a6a86'],
  snow: '#d8dcf4',
  snowShade: '#8894c8',
  air: { color: '#b8a8d8', far: 0.7 },
  cloud: ['#ffd0b0', '#d8a0b0', '#7a76a8'],
  fir: 0.45,
  glow: [WIN.x0 + 40, WIN.y0 + 250, 460, '#ffb080', 0.3],
};
const DUSK: ViewCols = {
  sky: [[0, '#22265a'], [0.45, '#5e4888'], [0.78, '#c46a8a'], [1, '#e89088']],
  peakLit: '#ff8aa8',
  peakShade: '#423f80',
  rock: '#2a2648',
  far: '#6a5a98',
  forest: '#1c2240',
  near: ['#0a1018', '#16222e', '#3e4e66'],
  snow: '#b8b0d8',
  snowShade: '#5a5a92',
  air: { color: '#7a6aa8', far: 0.65 },
  cloud: ['#ffa098', '#9a6090', '#36345e'],
  fir: 0.6,
  glow: [WIN.x0 + 40, WIN.y0 + 260, 420, '#ff8080', 0.26],
};
const NIGHT: ViewCols = {
  sky: [[0, '#050818'], [0.5, '#101838'], [1, '#262c54']],
  peakLit: '#c4d0f0',
  peakShade: '#323c6a',
  rock: '#14142a',
  far: '#2a3260',
  forest: '#0c1424',
  near: ['#04080e', '#0c1a20', '#2e4a5c'],
  snow: '#a0b0d4',
  snowShade: '#46527e',
  air: { color: '#262c54', far: 0.6 },
  cloud: ['#8a96c8', '#3a4272', '#1a1e40'],
  fir: 0.8,
  night: true,
};

/** Snow lying on a fir's boughs: an irregular drooping cap on each tier (the tiers as sceneBits' conifer() lays
 * them), lit on its top left, blue-grey underneath, clumps breaking its top and lobes hanging off its lower edge. */
function firSnow(ctx: Ctx, r: R, x: number, y: number, h: number, w: number, amt: number, lit: string, body: string, under: string): void {
  if (amt <= 0) return;
  const tiers = Math.max(5, Math.round(h / 34));
  for (let i = 0; i < tiers; i++) {
    const t = (i + 0.5) / tiers;
    const ty = y - h + t * h * 0.94;
    const half = (w / 2) * (0.12 + t * 0.88) * (0.75 + amt * 0.2);
    const rad = Math.max(4, (h / tiers) * 0.62);
    const n = 9;
    const topE: [number, number][] = [];
    const botE: [number, number][] = [];
    // (each cap lies on part of the bough only: more of it as the snow builds)
    const ua = -1 + r() * (1 - amt) * 0.9;
    const ub = 1 - r() * (1 - amt) * 0.9;
    for (let k = 0; k <= n; k++) {
      const u = ua + (k / n) * (ub - ua);
      const px = x + u * half;
      const droop = Math.abs(u) ** 1.6 * rad * 0.9;
      const bump = (r() - 0.5) * rad * 0.25 * amt;
      topE.push([px, ty - rad * 0.5 + droop - (1 - Math.abs(u)) * rad * 0.15 * amt + bump]);
      // thick in the middle of the bough, thin at its tips; lobes sagging off it
      const th = rad * (0.18 + 0.4 * amt) * (1 - Math.abs(u) ** 2 * 0.7) * (0.8 + r() * 0.5);
      botE.push([px, ty - rad * 0.5 + droop + th]);
    }
    const cap = (c: Ctx) => {
      c.beginPath();
      c.moveTo(topE[0][0], topE[0][1]);
      for (let k = 1; k < topE.length; k++) {
        const [ax, ay] = topE[k - 1];
        const [bx, by] = topE[k];
        c.quadraticCurveTo(ax, ay - rad * 0.12, (ax + bx) / 2, (ay + by) / 2);
      }
      c.lineTo(topE[n][0], topE[n][1]);
      for (let k = n; k > 0; k--) {
        const [ax, ay] = botE[k];
        const [bx, by] = botE[k - 1];
        c.quadraticCurveTo((ax + bx) / 2, Math.max(ay, by) + rad * 0.18, bx, by);
      }
      c.closePath();
    };
    const g = ctx.createLinearGradient(x - half, ty - rad, x + half * 0.6, ty + rad * 0.6);
    g.addColorStop(0, lit);
    g.addColorStop(0.5, body);
    g.addColorStop(1, under);
    ctx.fillStyle = g;
    cap(ctx);
    ctx.fill();
    // the underside in the cap's own shade
    within(ctx, cap, () => {
      ctx.strokeStyle = rgba(under, 0.8);
      ctx.lineWidth = rad * 0.22;
      ctx.beginPath();
      for (let k = 0; k <= n; k++) ctx.lineTo(botE[k][0], botE[k][1]);
      ctx.stroke();
    });
    // the lit lip along the top, on the left half (towards the light)
    ctx.strokeStyle = rgba('#ffffff', 0.55);
    ctx.lineWidth = Math.max(1, rad * 0.1);
    ctx.beginPath();
    for (let k = 0; k <= n / 2 + 1; k++) ctx.lineTo(topE[k][0], topE[k][1] + 1);
    ctx.stroke();
    // clumps sitting on top
    for (let k = 0; k < 2 + amt * 2; k++) {
      const u = (r() - 0.5) * 1.4;
      const kx = x + u * half;
      const ky = ty - rad * 0.5 + Math.abs(u) ** 1.6 * rad * 0.9 - rad * 0.08;
      const kr = rad * (0.14 + r() * 0.12) * (0.6 + amt * 0.5);
      const kg = ctx.createRadialGradient(kx - kr * 0.4, ky - kr * 0.4, 0, kx, ky, kr);
      kg.addColorStop(0, lit);
      kg.addColorStop(1, body);
      ctx.fillStyle = kg;
      ctx.beginPath();
      ctx.arc(kx, ky, kr, 0, P2);
      ctx.fill();
    }
  }
}

function view(ctx: Ctx, r: R, v: ViewCols): void {
  const { x0, x1, y0, y1 } = WIN;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, x1 - x0, y1 - y0);
  ctx.clip();
  skyFill(ctx, WIN_BOX, v.sky, 0.04);
  if (v.night) {
    stars(ctx, r, { x: x0, y: y0, w: x1 - x0, h: 170 }, 70);
    // the moon over the left-hand peak, its halo in the thin air
    glowAt(ctx, x0 + 150, y0 + 70, 130, '#a8b8ff', 0.22);
    ctx.fillStyle = '#f2eedc';
    ctx.beginPath();
    ctx.arc(x0 + 150, y0 + 70, 17, 0, P2);
    ctx.fill();
    ctx.fillStyle = rgba('#a8a490', 0.35);
    for (const [dx, dy, rr] of [[-5, -4, 4], [4, 3, 3], [-2, 7, 2.5]] as const) {
      ctx.beginPath();
      ctx.arc(x0 + 150 + dx, y0 + 70 + dy, rr, 0, P2);
      ctx.fill();
    }
  } else if (v.glow) glowAt(ctx, v.glow[0], v.glow[1], v.glow[2], v.glow[3], v.glow[4], 0.6);
  const sun = { sunX: x0 - 260, sunY: y0 + 230 };
  // the far range: hazy, low, a long saw of summits lit along their left edges
  const farTop = (x: number) => y0 + 215 - 46 * Math.abs(Math.sin((x - x0) * 0.011 + 0.8)) - 30 * Math.abs(Math.sin((x - x0) * 0.027 + 2)) + wave1(x * 2.2, 9) * 5;
  const farR = ridgePath(x0, x1, y0 + 300, farTop, 3);
  farR(ctx);
  ctx.fillStyle = airMix(v.far, 0.75, v.air);
  ctx.fill();
  within(ctx, farR, () => {
    for (let x = x0; x < x1; x += 3) {
      const sl = (farTop(x + 8) - farTop(x - 8)) / 16;
      if (sl < -0.15) {
        ctx.fillStyle = rgba(airMix(v.peakLit, 0.7, v.air), Math.min(0.7, -sl * 0.8));
        ctx.fillRect(x, farTop(x), 3.2, 40);
      }
    }
    vfill(ctx, x0, y0 + 160, x1 - x0, 140, [[0, rgba(v.air.color, 0)], [1, rgba(v.air.color, 0.7)]]);
  });
  // a soft bank of cloud lying in the valley behind the massif, its underside lit by the low light
  if (v.cloud) {
    for (const [cx, cw] of [[x0 + 300, 300], [x0 + 560, 260]] as const) cloud(ctx, r, cx, y0 + 214, cw, 44, { kind: 'cumulus', lit: v.cloud[0], body: v.cloud[1], shadow: v.cloud[2], ...sun, a: 0.6, depth: 0.7, air: v.air, rim: 0.6 });
    cloud(ctx, r, x0 + 120, y0 + 96, 260, 40, { kind: 'cumulus', lit: v.cloud[0], body: v.cloud[1], shadow: v.cloud[2], ...sun, a: v.night ? 0.35 : 0.6, depth: 0.75, air: v.air, rim: 0.7 });
  }
  // the massif: each column shaded by the slope it faces (snow burning where it turns to the low light on the left,
  // cool in shade), ridges running down from the summits, rock bands showing through on the steep pitches
  const base = y0 + 290;
  const bump = (x: number, c: number, w: number, h: number) => h * Math.exp(-(((x - c) / w) ** 2));
  const top = (x: number) => y0 + 250 - bump(x, x0 + 230, 120, 180) - bump(x, x0 + 470, 90, 125) - bump(x, x0 + 640, 140, 92) + wave1(x * 1.6, 3) * 10 + Math.abs(Math.sin(x * 0.05)) * 6;
  const ridge = ridgePath(x0, x1, base + 40, top, 3);
  ridge(ctx);
  ctx.fillStyle = airMix(v.peakShade, 0.6, v.air);
  ctx.fill();
  within(ctx, ridge, () => {
    // the faces in shade, cooler and hazier lower down
    vfill(ctx, x0, y0 + 40, x1 - x0, base - y0, [[0, airMix(v.peakShade, 0.5, v.air)], [0.6, airMix(v.peakShade, 0.62, v.air)], [1, airMix(v.peakShade, 0.8, v.air)]]);
    // each summit's lit face: from its left flank round to a crest running down and to the right from the summit
    for (const [cx, reach] of [[x0 + 640, 120], [x0 + 470, 110], [x0 + 230, 150]] as const) {
      let sx = cx;
      for (let x = cx - 60; x < cx + 60; x += 2) if (top(x) < top(sx)) sx = x;
      const sy = top(sx);
      const face = (c: Ctx) => {
        c.beginPath();
        c.moveTo(sx, sy);
        for (let x = sx; x > sx - 280; x -= 4) c.lineTo(x, top(x));
        c.lineTo(sx - 280, base + 40);
        c.lineTo(sx + reach * 0.9, base + 40);
        c.bezierCurveTo(sx + reach * 0.75, sy + (base - sy) * 0.65, sx + reach * 0.2, sy + (base - sy) * 0.35, sx + 2, sy);
        c.closePath();
      };
      const g = ctx.createLinearGradient(sx - 60, sy, sx + 40, base + 30);
      g.addColorStop(0, airMix(v.peakLit, 0.45, v.air));
      g.addColorStop(0.45, airMix(mix(v.peakLit, v.peakShade, 0.35), 0.55, v.air));
      g.addColorStop(1, airMix(mix(v.peakLit, v.peakShade, 0.75), 0.75, v.air));
      ctx.fillStyle = g;
      face(ctx);
      ctx.fill();
      // the crest's edge: the lit face turning sharply into shade
      ctx.strokeStyle = rgba(airMix(v.peakShade, 0.5, v.air), 0.6);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx + 2, sy);
      ctx.bezierCurveTo(sx + reach * 0.2, sy + (base - sy) * 0.35, sx + reach * 0.75, sy + (base - sy) * 0.65, sx + reach * 0.9, base + 40);
      ctx.stroke();
    }
    // spurs running down from each summit: lit on their left flank, a shadowed gully to their right
    for (const [px, len] of [[x0 + 230, 170], [x0 + 470, 120], [x0 + 640, 90]] as const) {
      for (let k = 0; k < 3; k++) {
        const sx = px + (k - 1) * 30 + (r() - 0.5) * 24;
        const sy = top(sx) + 6 + r() * 14;
        const ex = sx + (k - 1) * (30 + r() * 40) + (r() - 0.5) * 30;
        const ey = sy + len * (0.35 + r() * 0.45);
        const gw = 5 + r() * 12;
        const bend = (r() - 0.5) * 30;
        ctx.fillStyle = rgba(airMix(v.rock, 0.55, v.air), 0.22 + r() * 0.12);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo((sx + ex) / 2 + bend, (sy + ey) / 2, ex, ey);
        ctx.quadraticCurveTo((sx + ex) / 2 + bend + gw, (sy + ey) / 2, sx + 3, sy);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = rgba(airMix(v.peakLit, 0.5, v.air), 0.35);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(sx - 1, sy);
        ctx.quadraticCurveTo((sx + ex) / 2 + bend - 2, (sy + ey) / 2, ex - 1, ey);
        ctx.stroke();
      }
    }
    // rock bands: dark broken strata on the steep faces
    lay(ctx, noiseMask(10, 47, { cover: 0.32, soft: 0.12, col: v.rock }), { x: x0, y: y0 + 40, w: x1 - x0, h: 220 }, 0.3);
    // the alpenglow along the summit ridges
    ctx.strokeStyle = rgba(v.peakLit, 0.7);
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let x = x0; x < x1; x += 3) {
      const sl = (top(x + 6) - top(x - 6)) / 12;
      if (sl < 0) ctx.lineTo(x, top(x) + 1.2);
      else ctx.moveTo(x, top(x) + 1.2);
    }
    ctx.stroke();
  });
  haze(ctx, base - 60, base + 30, v.air.color, 0.5, 0.8, x0, x1);
  // the forest on the lower slopes, through the valley's air
  treeLine(ctx, r, x0, x1, base + 30, 30, 60, v.forest, { depth: 0.55, air: v.air, rim: v.snow, rimA: 0.3, mist: v.air.color, mistA: 0.5, step: 22 });
  // the near slope: snow in the blue shadow of the valley, and three firs close to the window
  const gy = y1 - 60;
  const ground = ridgePath(x0, x1, y1 + 4, (x) => gy + wave1(x, 11) * 14, 4);
  ground(ctx);
  const sg = ctx.createLinearGradient(0, gy - 20, 0, y1);
  sg.addColorStop(0, v.snow);
  sg.addColorStop(1, mix(v.snow, v.snowShade, 0.6));
  ctx.fillStyle = sg;
  ctx.fill();
  within(ctx, ground, () => {
    // wind ripples in the snow, lit on their windward faces
    for (let i = 0; i < 18; i++) {
      const sx = x0 + r() * (x1 - x0);
      const sy = gy + 10 + r() * 40;
      ctx.strokeStyle = rgba(v.snowShade, 0.35);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(sx + 30, sy - 4, sx + 70, sy);
      ctx.stroke();
    }
  });
  for (const [tx, th] of [[x0 + 110, 200], [x1 - 150, 240], [x1 - 62, 170]] as const) {
    const ty = gy + 10 + wave1(tx, 11) * 14;
    // its shadow on the snow, cast away from the light on the left
    ctx.fillStyle = rgba(v.snowShade, 0.5);
    ctx.beginPath();
    ctx.ellipse(tx + th * 0.3, ty + 3, th * 0.38, 7, 0, 0, P2);
    ctx.fill();
    conifer(ctx, r, tx, ty, th, th * 0.5, { dark: v.near[0], mid: v.near[1], lit: v.near[2], rim: v.snow, rimA: 0.3 });
    firSnow(ctx, r, tx, ty, th, th * 0.5, v.fir, mix(v.snow, '#ffffff', 0.5), v.snow, v.snowShade);
  }
  // the roof's eave over the window: its dark soffit, a lip of snow hanging off it, icicles
  const ey = y0 + 16;
  vfill(ctx, x0, y0, x1 - x0, 18, [[0, '#120c10'], [1, '#2a2028']]);
  ctx.fillStyle = v.night ? '#8a9ac4' : mix(v.snow, '#ffffff', 0.3);
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x0, ey);
  for (let x = x0; x <= x1; x += 10) ctx.lineTo(x, ey + 3 + wave1(x * 3, 7) * 4 + (r() < 0.12 ? 5 : 0));
  ctx.lineTo(x1, y0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgba(v.snowShade, 0.8);
  ctx.fillRect(x0, ey + 4, x1 - x0, 2);
  for (let i = 0; i < 22; i++) {
    const ix = x0 + 10 + r() * (x1 - x0 - 20);
    const il = 6 + r() * r() * 26;
    const ig = ctx.createLinearGradient(ix, ey, ix, ey + il);
    ig.addColorStop(0, rgba('#eef4ff', 0.9));
    ig.addColorStop(1, rgba('#a8c0e8', 0.2));
    ctx.fillStyle = ig;
    ctx.beginPath();
    ctx.moveTo(ix - 2.2, ey + 2);
    ctx.lineTo(ix + 2.2, ey + 2);
    ctx.lineTo(ix, ey + il);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** The blizzard over the view (live only): a whiteout of driven snow, thickest far off and up high, burying the moon,
 * the range and the far trees in grey; the near firs show through. */
function whiteout(ctx: Ctx, r: R): void {
  const { x0, x1, y0, y1 } = WIN;
  vfill(ctx, x0, y0, x1 - x0, y1 - y0, [[0, 'rgba(120,130,168,0.96)'], [0.45, 'rgba(132,142,176,0.9)'], [0.7, 'rgba(140,150,184,0.7)'], [1, 'rgba(150,160,192,0.35)']]);
  for (let i = 0; i < 9; i++) {
    cloud(ctx, r, x0 + r() * (x1 - x0), y0 + 40 + r() * 200, 260 + r() * 200, 50 + r() * 40, { kind: 'bank', lit: '#c8d0ec', body: '#8a92b8', shadow: '#5a6290', sunX: x0 - 200, sunY: y0, a: 0.55, depth: 0.5 });
  }
}
/** The snow drifted against the glass on the outside sill (level 0…1): a long drift, deepest in the corners. */
const bankTop = (x: number, lev: number): number => {
  const u = (x - WIN.x0) / (WIN.x1 - WIN.x0);
  const corner = Math.exp(-((u / 0.08) ** 2)) + Math.exp(-(((1 - u) / 0.08) ** 2));
  return WIN.y1 - lev * (20 + corner * 26 + wave1(x * 1.3, 5) * 6 + 8);
};

function bank(ctx: Ctx, lev: number, night: boolean): void {
  const { x0, x1, y1 } = WIN;
  const p = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x0, y1 + 2);
    for (let x = x0; x <= x1; x += 6) c.lineTo(x, bankTop(x, lev));
    c.lineTo(x1, y1 + 2);
    c.closePath();
  };
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, WIN.y0, x1 - x0, y1 - WIN.y0 + 2);
  ctx.clip();
  p(ctx);
  const g = ctx.createLinearGradient(0, bankTop(x0, lev), 0, y1);
  g.addColorStop(0, night ? '#c4d0ec' : '#fbf6fa');
  g.addColorStop(0.5, night ? '#8a9ac4' : '#d8d4ec');
  g.addColorStop(1, night ? '#5a6894' : '#a4a8cc');
  ctx.fillStyle = g;
  ctx.fill();
  within(ctx, p, () => {
    // the crust: a lit lip along the top, sparkles, the glass's shade at the foot
    ctx.strokeStyle = rgba('#ffffff', 0.85);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = x0; x <= x1; x += 6) ctx.lineTo(x, bankTop(x, lev) + 1.5);
    ctx.stroke();
    let s = 17 + Math.round(lev * 10);
    const rr = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 60 * lev; i++) {
      const sx = x0 + rr() * (x1 - x0);
      ctx.fillStyle = rgba('#ffffff', 0.5 + rr() * 0.5);
      ctx.fillRect(sx, bankTop(sx, lev) + 3 + rr() * 14, 1.6, 1.6);
    }
    crevice(ctx, x0, x1, y1 + 2, -14, 0.35, '#2a3060');
  });
  ctx.restore();
}

function windowFrame(ctx: Ctx, r: R): void {
  const { x0, x1, y0, y1 } = WIN;
  // the old glass, a little wavy, the room (the fire) reflected faintly
  glassPane(ctx, rectPath(x0, y0, x1 - x0, y1 - y0), WIN_BOX, { sheen: 0, tint: 'rgba(170,190,220,0.05)', reflect: [x0 + 80, y1 - 40, 220, '#ff9a50'], dirt: 0.12 });
  // the frame: heavy pine, mortised, three lights wide and two high
  const fw = 24;
  const ob = { x: x0 - fw, y: y0 - fw, w: x1 - x0 + fw * 2, h: y1 - y0 + fw * 2 };
  const outer = rectPath(ob.x, ob.y, ob.w, ob.h);
  // the frame's shadow on the logs (outside the opening only)
  ctx.save();
  ctx.beginPath();
  ctx.rect(ob.x - 40, ob.y - 40, ob.w + 80, ob.h + 80);
  ctx.rect(x0, y0, x1 - x0, y1 - y0);
  ctx.clip('evenodd');
  castShadow(ctx, outer, 20, 22, 0.6);
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.rect(ob.x, ob.y, ob.w, ob.h);
  ctx.rect(x0, y0, x1 - x0, y1 - y0);
  ctx.clip('evenodd');
  solid(ctx, outer, ob, 'wood', '#6a4226', { depth: 0.15, line: false, formSize: 10 });
  woodGrain(ctx, r, ob, '#6a4226', false, 0.7);
  // the reveal: the inner edge of the frame in shade on the top and left (the light comes from the top left)
  vfill(ctx, x0, y0 - 6, x1 - x0, 12, [[0, 'rgba(20,8,2,0)'], [1, 'rgba(20,8,2,0.5)']]);
  ctx.fillStyle = rgba('#ffd8a8', 0.2);
  ctx.fillRect(ob.x, ob.y, ob.w, 2);
  ctx.restore();
  ctx.strokeStyle = '#1e0e06';
  ctx.lineWidth = lineAt(0.15);
  ctx.strokeRect(ob.x, ob.y, ob.w, ob.h);
  ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  // the glazing bars, each throwing its shadow on the snow beyond (soft, the light is behind them) and lit on top
  for (const bx of [x0 + PANE_W, x0 + PANE_W * 2]) {
    const bar = rectPath(bx - 7, y0, 14, y1 - y0);
    solid(ctx, bar, { x: bx - 7, y: y0, w: 14, h: y1 - y0 }, 'wood', '#7a5030', { depth: 0.15, line: 1.4, formSize: 4 });
  }
  const hb = rectPath(x0, MID_Y - 7, x1 - x0, 14);
  solid(ctx, hb, { x: x0, y: MID_Y - 7, w: x1 - x0, h: 14 }, 'wood', '#7a5030', { depth: 0.15, line: 1.4, formSize: 4 });
  ctx.fillStyle = rgba('#ffe0b8', 0.25);
  ctx.fillRect(x0, MID_Y - 7, x1 - x0, 1.5);
  // the sill: a deep board, its nose lit, its shadow on the logs below
  const sy = y1 + fw - 4;
  const sill = rrPath(x0 - 44, sy, x1 - x0 + 88, 24, 3);
  castShadow(ctx, sill, 20, 20, 0.6);
  solid(ctx, sill, { x: x0 - 44, y: sy, w: x1 - x0 + 88, h: 24 }, 'wood', '#7a5030', { depth: 0.15, formSize: 6 });
  within(ctx, sill, () => woodGrain(ctx, r, { x: x0 - 44, y: sy, w: x1 - x0 + 88, h: 24 }, '#7a5030', false, 0.6));
  ctx.fillStyle = rgba('#ffd8a8', 0.32);
  ctx.fillRect(x0 - 42, sy + 1, x1 - x0 + 84, 1.5);
}

/** Frost ferns creeping in from the corners of each pane, a milky bloom along the frame (live only: the blizzard). */
function frost(ctx: Ctx, r: R): void {
  const { x0, y0, y1 } = WIN;
  const panes: [number, number, number, number][] = [];
  for (let i = 0; i < 3; i++) {
    panes.push([x0 + i * PANE_W + 7, y0, PANE_W - 14, MID_Y - 7 - y0]);
    panes.push([x0 + i * PANE_W + 7, MID_Y + 7, PANE_W - 14, y1 - MID_Y - 7]);
  }
  const fern = (x: number, y: number, ang: number, len: number, w: number, depth: number) => {
    let px = x;
    let py = y;
    const n = Math.max(3, Math.round(len / 8));
    let a = ang;
    for (let i = 0; i < n; i++) {
      const step = len / n;
      a += (r() - 0.5) * 0.35;
      const nx = px + Math.cos(a) * step;
      const ny = py + Math.sin(a) * step;
      ctx.strokeStyle = rgba('#f4f8ff', 0.55 * (1 - i / n) + 0.15);
      ctx.lineWidth = w * (1 - i / n) + 0.4;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(nx, ny);
      ctx.stroke();
      // barbs off both sides, shorter towards the tip
      if (depth > 0 && i % 2 === 0) for (const s of [-1, 1]) fern(nx, ny, a + s * (0.9 + r() * 0.3), len * 0.32 * (1 - i / n), w * 0.6, depth - 1);
      px = nx;
      py = ny;
    }
  };
  for (const [px, py, pw, ph] of panes) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(px, py, pw, ph);
    ctx.clip();
    const g = ctx.createRadialGradient(px + pw / 2, py + ph / 2, Math.min(pw, ph) * 0.28, px + pw / 2, py + ph / 2, Math.max(pw, ph) * 0.72);
    g.addColorStop(0, 'rgba(230,240,255,0)');
    g.addColorStop(0.7, 'rgba(230,240,255,0.22)');
    g.addColorStop(1, 'rgba(236,244,255,0.75)');
    ctx.fillStyle = g;
    ctx.fillRect(px, py, pw, ph);
    for (const [cx, cy, a0] of [[px, py, 0.6], [px + pw, py, Math.PI - 0.6], [px, py + ph, -0.6], [px + pw, py + ph, Math.PI + 0.6]] as const)
      for (let k = 0; k < 3; k++) fern(cx, cy, a0 + (k - 1) * 0.45, 40 + r() * 50, 1.6, 2);

    ctx.restore();
  }
}

const CURT = { top: WIN.y0 - 48, bot: WIN.y1 + 74, tie: WIN.y1 - 40, folds: 5 };

/** A tartan curtain's edges at height y (side −1 left of the window, 1 right): the outer edge hangs straight by the
 * wall, the inner one sweeps in to the tie-back and fans out below it. */
function curtainEdges(side: number, y: number): [number, number] {
  const e = side < 0 ? WIN.x0 - 40 : WIN.x1 + 40;
  const d = -side;
  const { top, bot, tie } = CURT;
  const inner = y < tie ? 72 - 54 * Math.pow(Math.max(0, (y - top) / (tie - top)), 1.6) : 18 + 30 * Math.pow((y - tie) / (bot - tie), 0.7);
  const outer = -82 + (y > tie - 60 && y < tie + 60 ? 8 * Math.cos(((y - tie) / 60) * Math.PI * 0.5) : 0);
  const a = e + d * outer;
  const b = e + d * inner;
  return side < 0 ? [a, b] : [b, a];
}

const TARTAN_CURTAIN: [number, string, number][] = [
  // [start, colour, width] across a 40 px sett: green bands, a navy line, a gold overcheck
  [12, '#0e3420', 12],
  [24, '#16244a', 3],
  [18, '#e8c86a', 1.4],
];

function curtains(ctx: Ctx, _r: R): void {
  const { x0, x1, y0 } = WIN;
  const { top, bot, tie, folds } = CURT;
  // the rod on its brackets, with finials
  const rod = rrPath(x0 - 128, y0 - 54, x1 - x0 + 256, 11, 5);
  castShadow(ctx, rod, 8, 8, 0.45);
  solid(ctx, rod, { x: x0 - 128, y: y0 - 54, w: x1 - x0 + 256, h: 11 }, 'iron', '#2a2420', { depth: 0.12, line: 1.4, formSize: 3 });
  for (const fx of [x0 - 132, x1 + 132]) {
    const f = ellPath(fx, y0 - 48, 10, 10);
    solid(ctx, f, { x: fx - 10, y: y0 - 58, w: 20, h: 20 }, 'iron', '#3a3028', { depth: 0.12, line: 1.4, formSize: 4 });
  }
  for (const side of [-1, 1]) {
    const path = (c: Ctx) => {
      c.beginPath();
      for (let y = top; y <= bot; y += 4) c.lineTo(curtainEdges(side, y)[0], y);
      // the hem: a little scalloped where each fold ends
      for (let i = 0; i <= folds * 4; i++) {
        const [a, b] = curtainEdges(side, bot);
        const u = i / (folds * 4);
        c.lineTo(a + (b - a) * u, bot + Math.sin(u * folds * P2) * 3);
      }
      for (let y = bot; y >= top; y -= 4) c.lineTo(curtainEdges(side, y)[1], y);
      c.closePath();
    };
    const [l0, r0] = curtainEdges(side, top);
    const box = { x: Math.min(l0, curtainEdges(side, bot)[0]) - 4, y: top, w: Math.max(r0 - l0, 160) + 8, h: bot - top + 6 };
    castShadow(ctx, path, 18, 22, 0.6);
    ctx.save();
    path(ctx);
    ctx.clip();
    // the cloth, row by row: the warp stripes run down the folds (squeezed together at the tie-back), the weft
    // stripes run across, the folds shaded across each row
    const phase = side < 0 ? 0.3 : 0.75;
    for (let y = top; y < bot + 6; y += 2) {
      const [a, b] = curtainEdges(side, Math.min(y, bot));
      const w = b - a;
      const near = 1 - Math.min(1, Math.abs(y - tie) / 220);
      ctx.fillStyle = '#9a1c20';
      ctx.fillRect(a - 2, y, w + 4, 2.2);
      // the weft: horizontal bands, sagging a hair in each fold's valley
      const v = (((y - top) % 40) + 40) % 40;
      for (const [s0, col, sw] of TARTAN_CURTAIN)
        if (v >= s0 && v < s0 + sw) {
          ctx.fillStyle = rgba(col, col === '#e8c86a' ? 0.55 : 0.5);
          ctx.fillRect(a - 2, y, w + 4, 2.2);
        }
      // the warp, at fixed places across the cloth (u), following the folds down
      for (let k = 0; k < 5; k++)
        for (const [s0, col, sw] of TARTAN_CURTAIN) {
          const u0 = (k * 40 + s0) / 160;
          const u1 = (k * 40 + s0 + sw) / 160;
          if (u0 > 1) continue;
          ctx.fillStyle = rgba(col, col === '#e8c86a' ? 0.5 : 0.45);
          ctx.fillRect(a + w * u0, y, Math.max(1, w * (Math.min(1, u1) - u0)), 2.2);
        }
      // the folds: lit on the flank turned to the key light (left), deep in the valleys, deepest at the tie-back
      const g = ctx.createLinearGradient(a, 0, b, 0);
      const depth = 0.28 + near * 0.3;
      for (let i = 0; i <= folds * 6; i++) {
        const u = i / (folds * 6);
        const sv = Math.sin((u * folds + phase) * P2);
        g.addColorStop(u, sv > 0 ? rgba('#ffe0c0', sv * 0.16) : rgba('#1a0206', -sv * depth));
      }
      ctx.fillStyle = g;
      ctx.fillRect(a - 2, y, w + 4, 2.2);
    }
    // the weave, the cloth's shading top to bottom (the rod's shadow at the top, the room's dark below)
    lay(ctx, noiseMask(40, 77 + side, { cover: 0.5, soft: 0.1, col: '#2a0608', w: 60, h: 160 }), box, 0.18);
    vfill(ctx, box.x, top, box.w, bot - top, [[0, 'rgba(20,2,4,0.5)'], [0.08, 'rgba(20,2,4,0.1)'], [0.7, 'rgba(20,2,4,0.05)'], [1, 'rgba(20,2,4,0.4)']]);
    // the window's light glowing through the edge nearest the glass
    const [ia, ib] = curtainEdges(side, (top + tie) / 2);
    const gx = side < 0 ? ib : ia;
    const tg = ctx.createLinearGradient(gx, 0, gx - side * -40, 0);
    tg.addColorStop(0, rgba('#ffc0a0', 0.18));
    tg.addColorStop(1, rgba('#ffc0a0', 0));
    ctx.fillStyle = tg;
    ctx.fillRect(box.x, top, box.w, tie - top);
    crevice(ctx, box.x, box.x + box.w, bot, -12, 0.35);
    ctx.restore();
    rim(ctx, path, 0.2, 2);
    ctx.strokeStyle = 'rgba(30,4,6,0.8)';
    ctx.lineWidth = lineAt(0.12) * 0.7;
    path(ctx);
    ctx.stroke();
    // the rings on the rod, one at the head of each fold
    for (let i = 0; i <= folds; i++) {
      const u = (i + 0.25) / (folds + 0.5);
      const rx = l0 + (r0 - l0) * u;
      ctx.strokeStyle = '#3a3230';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(rx, y0 - 48, 6, 8, 0, 0, P2);
      ctx.stroke();
      ctx.strokeStyle = rgba('#d8c0a0', 0.4);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(rx, y0 - 48, 6, Math.PI * 1.1, Math.PI * 1.5);
      ctx.stroke();
    }
    // the tie-back: a leather strap round the gathered cloth to a brass hook in the logs
    const [ta, tb] = curtainEdges(side, tie);
    const strap = (c: Ctx) => {
      c.beginPath();
      c.moveTo(ta - 4, tie - 8);
      c.quadraticCurveTo((ta + tb) / 2, tie - 2, tb + 4, tie - 8);
      c.lineTo(tb + 4, tie + 6);
      c.quadraticCurveTo((ta + tb) / 2, tie + 12, ta - 4, tie + 6);
      c.closePath();
    };
    castShadow(ctx, strap, 5, 6, 0.45);
    solid(ctx, strap, { x: ta - 4, y: tie - 8, w: tb - ta + 8, h: 20 }, 'leather', '#3a2414', { depth: 0.12, line: 1.4, formSize: 3 });
    const hx = side < 0 ? ta - 4 : tb + 4;
    const hook = ellPath(hx, tie - 1, 6, 6);
    solid(ctx, hook, { x: hx - 6, y: tie - 7, w: 12, h: 12 }, 'chrome', '#b8904a', { depth: 0.12, line: 1.2, formSize: 3 });
  }
}
// ——— the chimney ———

function chimney(ctx: Ctx, r: R): void {
  const { x0, x1 } = LG.chim;
  const box = { x: x0, y: LG.beam, w: x1 - x0, h: TY - LG.beam };
  const breast = rectPath(x0, LG.beam, x1 - x0, TY - LG.beam);
  castShadow(ctx, breast, 20, 28, 0.6);
  ctx.save();
  breast(ctx);
  ctx.clip();
  // the mortar bed, then river stones packed in rough courses, each rounded and lit from the top left
  surface(ctx, r, box, '#6a6052', { vary: 0.3, cells: 4, grain: 0.3, seed: 5 });
  for (let y = LG.beam - 20, row = 0; y < TY; y += 36, row++) {
    for (let x = x0 - 30 + (row % 2) * 22; x < x1 + 30; ) {
      const w = 40 + r() * 38;
      const h = 27 + r() * 12;
      const cx = x + w / 2;
      const cy = y + 18 + (r() - 0.5) * 6;
      const col = ['#b0a890', '#9a9080', '#a89a88', '#c0b8a4', '#8a8478', '#a8907a', '#9aa0a0'][Math.floor(r() * 7)];
      const rot = (r() - 0.5) * 0.25;
      const st = (c: Ctx) => {
        c.beginPath();
        c.ellipse(cx, cy, w / 2 - 2, h / 2 - 2, rot, 0, P2);
      };
      // the stone's own shadow in the mortar, down and right
      ctx.fillStyle = 'rgba(20,12,6,0.45)';
      ctx.beginPath();
      ctx.ellipse(cx + 3, cy + 3, w / 2 - 1, h / 2 - 1, rot, 0, P2);
      ctx.fill();
      // (a rounded river stone: lit on its top left, turning away into shade at its lower right)
      st(ctx);
      const sg = ctx.createRadialGradient(cx - w * 0.18, cy - h * 0.22, 1, cx, cy, w * 0.55);
      sg.addColorStop(0, shade(col, 0.22));
      sg.addColorStop(0.55, col);
      sg.addColorStop(1, mix(shade(col, -0.38), '#2a2030', 0.2));
      ctx.fillStyle = sg;
      ctx.fill();
      ctx.strokeStyle = rgba('#fff0dc', 0.22);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(cx, cy, w / 2 - 4, h / 2 - 4, rot, Math.PI * 1.05, Math.PI * 1.6);
      ctx.stroke();
      ctx.strokeStyle = '#2a2018';
      ctx.lineWidth = 1.3;
      st(ctx);
      ctx.stroke();
      x += w + 2;
    }
  }
  // the stones' grain and mottling, once over the whole breast
  grain(ctx, box, 'stone', 0.45, 1.3);
  lay(ctx, noiseMask(18, 23, { cover: 0.35, soft: 0.25, col: '#5a4a3a' }), box, 0.22);
  // soot up the breast from the firebox, darkest over the arch, blown left by the draught
  softly(ctx, box, (g) => {
    const sg = g.createRadialGradient(LG.fire.x, LG.fire.archTop, 20, LG.fire.x - 10, LG.fire.archTop - 70, 280);
    sg.addColorStop(0, 'rgba(14,8,4,0.9)');
    sg.addColorStop(0.5, 'rgba(14,8,4,0.45)');
    sg.addColorStop(1, 'rgba(14,8,4,0)');
    g.fillStyle = sg;
    g.fillRect(x0, 0, x1 - x0, TY);
  }, 0.25);
  // light: the fire under the arch on the stones round it, the room's dark up top, the breast's right flank in shade
  lightPool(ctx, LG.fire.x, LG.fire.y - 70, 300, 230, '#ff8a3a', 0.38);
  vfill(ctx, x0, 0, x1 - x0, TY, [[0, 'rgba(14,6,2,0.6)'], [0.45, 'rgba(14,6,2,0.15)'], [1, 'rgba(14,6,2,0.15)']]);
  const sg = ctx.createLinearGradient(x0, 0, x1, 0);
  sg.addColorStop(0, rgba('#ffd8a8', 0.1));
  sg.addColorStop(0.7, 'rgba(10,4,2,0)');
  sg.addColorStop(1, 'rgba(10,4,2,0.42)');
  ctx.fillStyle = sg;
  ctx.fillRect(x0, 0, x1 - x0, TY);
  crevice(ctx, x0, x1, LG.beam, 30, 0.6);
  ctx.restore();
  ctx.strokeStyle = '#1a0e06';
  ctx.lineWidth = lineAt(0.12);
  breast(ctx);
  ctx.stroke();
  // where the breast stands proud of the logs: occlusion down its right edge
  creviceV(ctx, x1, LG.beam, TY, 40, 0.5);
}

const mouthPath: PathFn = (c) => {
  const f = LG.fire;
  c.beginPath();
  c.moveTo(f.x - f.mouthHalf, f.y + 18);
  c.lineTo(f.x - f.mouthHalf, f.archTop + 72);
  c.quadraticCurveTo(f.x - f.mouthHalf, f.archTop, f.x, f.archTop);
  c.quadraticCurveTo(f.x + f.mouthHalf, f.archTop, f.x + f.mouthHalf, f.archTop + 72);
  c.lineTo(f.x + f.mouthHalf, f.y + 18);
  c.closePath();
};

function firebox(ctx: Ctx, r: R): void {
  const f = LG.fire;
  // the arch's voussoirs: big dressed stones round the opening
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI + (i / n) * Math.PI;
    const a1 = Math.PI + ((i + 1) / n) * Math.PI;
    const rx = f.mouthHalf;
    const ry = 72;
    const cy = f.archTop + 72;
    const vp = (c: Ctx) => {
      c.beginPath();
      c.moveTo(f.x + Math.cos(a0) * rx, cy + Math.sin(a0) * ry);
      c.lineTo(f.x + Math.cos(a0) * (rx + 34), cy + Math.sin(a0) * (ry + 34));
      c.lineTo(f.x + Math.cos(a1) * (rx + 34), cy + Math.sin(a1) * (ry + 34));
      c.lineTo(f.x + Math.cos(a1) * rx, cy + Math.sin(a1) * ry);
      c.closePath();
    };
    solid(ctx, vp, { x: f.x - rx - 34, y: f.archTop - 34, w: (rx + 34) * 2, h: ry + 34 }, 'stone', i === 4 ? '#a89c88' : shade('#8a8274', (r() - 0.5) * 0.12), { depth: 0.12, line: 1.4, formSize: 10 });
  }
  // the jambs
  for (const s of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const jy = f.archTop + 72 + k * 34;
      const jx = s < 0 ? f.x - f.mouthHalf - 34 : f.x + f.mouthHalf;
      const jp = rectPath(jx, jy, 34, Math.min(34, f.y + 18 - jy));
      solid(ctx, jp, { x: jx, y: jy, w: 34, h: 34 }, 'stone', shade('#8a8274', (r() - 0.5) * 0.12), { depth: 0.12, line: 1.4, formSize: 8 });
    }
  }
  // the stones round the mouth lit by the fire from below
  ctx.save();
  ctx.beginPath();
  ctx.rect(f.x - f.mouthHalf - 40, f.archTop - 40, f.mouthHalf * 2 + 80, f.y - f.archTop + 60);
  ctx.clip();
  lightPool(ctx, f.x, f.y - 20, f.mouthHalf + 50, 150, '#ff7a2a', 0.3);
  ctx.restore();
  within(ctx, mouthPath, () => {
    // inside: sooted firebrick, the back lit orange by the fire
    vfill(ctx, f.x - f.mouthHalf, f.archTop, f.mouthHalf * 2, f.y - f.archTop + 18, [[0, '#050201'], [0.5, '#180a06'], [1, '#4a1c0a']]);
    for (let y = f.archTop, row = 0; y < f.y + 18; y += 18, row++)
      for (let x = f.x - f.mouthHalf + (row % 2) * 20 - 20; x < f.x + f.mouthHalf; x += 40) {
        ctx.fillStyle = rgba(shade('#4a1c0e', (r() - 0.5) * 0.3), 0.22 * Math.min(1, (y - f.archTop) / 140));
        ctx.fillRect(x + 1, y + 1, 38, 16);
        ctx.strokeStyle = 'rgba(0,0,0,0.45)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, 40, 18);
      }
    glowAt(ctx, f.x, f.y - 30, 150, '#ff6a1a', 0.38, 0.6);
    // the splayed cheeks in shade, the throat black
    crevice(ctx, f.x - f.mouthHalf, f.x + f.mouthHalf, f.archTop + 6, 70, 0.8, '#000000');
    creviceV(ctx, f.x - f.mouthHalf, f.archTop, f.y + 18, 30, 0.6, '#000000');
    creviceV(ctx, f.x + f.mouthHalf, f.archTop, f.y + 18, -30, 0.6, '#000000');
  });
  ctx.strokeStyle = '#120804';
  ctx.lineWidth = lineAt(0.12);
  mouthPath(ctx);
  ctx.stroke();
  // the bed of coals and ash under the grate
  const bed = ellPath(f.x, f.y + 6, f.mouthHalf - 16, 13);
  solid(ctx, bed, { x: f.x - f.mouthHalf, y: f.y - 8, w: f.mouthHalf * 2, h: 28 }, 'soot', '#3a2a24', { depth: 0.12, line: false, formSize: 6 });
  within(ctx, bed, () => {
    for (let i = 0; i < 40; i++) {
      const cx = f.x + (r() - 0.5) * (f.mouthHalf * 2 - 50);
      const cy = f.y + r() * 14;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 6 + r() * 6);
      g.addColorStop(0, rgba(r() < 0.5 ? '#ffd060' : '#ff7020', 0.9));
      g.addColorStop(1, 'rgba(255,90,20,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - 12, cy - 12, 24, 24);
    }
  });
  // the back log on the grate (the front one lies in front of the flames: andirons())
  grateLog(ctx, r, f.x + 8, f.y - 30, 172, -0.09, '#4a2c18');
  // the hearth: a slab of slate in front, worn at the middle, lit by the fire
  const hearth = rrPath(f.x - f.mouthHalf - 52, f.y + 2, f.mouthHalf * 2 + 104, TY - f.y - 2, 3);
  solid(ctx, hearth, { x: f.x - f.mouthHalf - 52, y: f.y + 2, w: f.mouthHalf * 2 + 104, h: TY - f.y - 2 }, 'stone', '#4e5058', { depth: 0.12, formSize: 5 });
  ctx.save();
  hearth(ctx);
  ctx.clip();
  lightPool(ctx, f.x, f.y + 6, 220, 16, '#ff8a3a', 0.5);
  ctx.restore();
}

/** A log on the grate, bark charred, the cracks glowing, its sawn end showing. */
function grateLog(ctx: Ctx, r: R, lx: number, ly: number, lw: number, rot: number, col: string): void {
  ctx.save();
  ctx.translate(lx, ly);
  ctx.rotate(rot);
  const log = rrPath(-lw / 2, -15, lw, 30, 15);
  solid(ctx, log, { x: -lw / 2, y: -15, w: lw, h: 30 }, 'wood', col, { depth: 0.12, line: 1.6, formSize: 7 });
  within(ctx, log, () => {
    // the char: black, crazed into irregular scales whose seams glow, hottest on the underside over the coals
    ctx.fillStyle = 'rgba(12,6,4,0.55)';
    ctx.fillRect(-lw / 2, -15, lw, 30);
    for (let i = 0; i < 26; i++) {
      const x = -lw / 2 + 8 + r() * (lw - 16);
      const y = -12 + r() * 24;
      const hot = (y + 15) / 30;
      ctx.strokeStyle = rgba(hot > 0.6 ? '#ffb040' : '#ff6a20', 0.25 + hot * 0.6);
      ctx.lineWidth = 0.8 + hot * 1.2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 4 + r() * 6, y + (r() - 0.5) * 6);
      ctx.lineTo(x + 8 + r() * 10, y + (r() - 0.5) * 8);
      ctx.stroke();
    }
    // the bark's ridges catching the light along the top
    ctx.strokeStyle = rgba('#8a6a4a', 0.35);
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const x = -lw / 2 + r() * lw;
      ctx.beginPath();
      ctx.moveTo(x, -12);
      ctx.lineTo(x + 20 + r() * 30, -11);
      ctx.stroke();
    }
    vfill(ctx, -lw / 2, -15, lw, 30, [[0, 'rgba(0,0,0,0.2)'], [0.55, 'rgba(0,0,0,0)'], [1, 'rgba(255,110,40,0.5)']]);
  });
  // the sawn end: rings, the heart glowing
  const end = ellPath(-lw / 2 + 4, 0, 9, 15);
  solid(ctx, end, { x: -lw / 2 - 5, y: -15, w: 18, h: 30 }, 'wood', '#8a6038', { depth: 0.12, line: 1.4, formSize: 4 });
  ctx.restore();
}

/** The front log and the andirons, in front of the flames. */
function andirons(ctx: Ctx, r: R): void {
  const f = LG.fire;
  grateLog(ctx, r, f.x - 12, f.y - 6, 196, 0.05, '#3a2214');
  for (const ax of [f.x - 84, f.x + 84]) {
    const leg = (c: Ctx) => {
      c.beginPath();
      c.moveTo(ax - 14, f.y + 10);
      c.quadraticCurveTo(ax - 6, f.y - 6, ax - 5, f.y - 46);
      c.lineTo(ax + 5, f.y - 46);
      c.quadraticCurveTo(ax + 6, f.y - 6, ax + 14, f.y + 10);
      c.closePath();
    };
    castShadow(ctx, leg, 5, 5, 0.5, '#000000');
    solid(ctx, leg, { x: ax - 14, y: f.y - 46, w: 28, h: 56 }, 'iron', '#2a2420', { depth: 0.12, line: 1.4, formSize: 4 });
    const knob = ellPath(ax, f.y - 52, 9, 9);
    solid(ctx, knob, { x: ax - 9, y: f.y - 61, w: 18, h: 18 }, 'chrome', '#b8904a', { depth: 0.12, line: 1.4, formSize: 4 });
    // the fire's light on its inner flank and the brass
    ctx.fillStyle = rgba('#ff9a40', 0.5);
    ctx.fillRect(ax + (ax < f.x ? 3 : -5), f.y - 40, 2, 40);
    ctx.fillStyle = rgba('#fff0c0', 0.8);
    ctx.fillRect(ax - 4, f.y - 57, 3, 2);
  }
}

function fireStill(ctx: Ctx): void {
  const f = LG.fire;
  // the back of the firebox lit by the flames, then the flames themselves (the live sheet's own painter)
  glowAt(ctx, f.x, f.y - 70, 170, '#ff6a20', 0.3, 0.9);
  const [c, g] = makeCanvas(FIRE_W, FIRE_H);
  hearthFrame(g, FIRE_W, FIRE_H, 0.55);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(c, f.x - FIRE_W / 2, f.y - 4 - FIRE_H);
  ctx.restore();
  glowAt(ctx, f.x, f.y - 60, 200, '#ff7a2a', 0.18);
}

/** The hearth fire's frame size (its live sheet and the still). */
export const FIRE_W = 230;
export const FIRE_H = 190;

/** Split wood stacked beside the hearth: rounds, halves and quarters end-on, bark on their curved sides, the split
 * faces pale with their rings, each sitting on the ones below. */
function woodpile(ctx: Ctx, r: R): void {
  const { x0, x1, top } = LG.pile;
  const rows = 4;
  const rh = (TY - top) / rows;
  const outline = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x0, TY);
    c.lineTo(x0 + 4, top + 16);
    c.quadraticCurveTo((x0 + x1) / 2, top - 14, x1 - 4, top + 16);
    c.lineTo(x1, TY);
    c.closePath();
  };
  // the pile's shadow on the logs, and the dark between the pieces
  castShadow(ctx, outline, 20, 20, 0.65);
  aoHalo(ctx, outline, 18, 0.5);
  ctx.fillStyle = 'rgba(10,4,2,0.6)';
  ctx.beginPath();
  ctx.ellipse((x0 + x1) / 2 + 10, TY - 2, (x1 - x0) / 2 + 22, 9, 0, 0, P2);
  ctx.fill();
  ctx.save();
  outline(ctx);
  ctx.fillStyle = '#1a0e08';
  ctx.fill();
  ctx.restore();
  for (let j = 0; j < rows; j++) {
    const cy = TY - rh * (j + 0.5);
    const n = j === rows - 1 ? 2 : 3;
    const span = x1 - x0 - (j === rows - 1 ? 30 : 0);
    for (let i = 0; i < n; i++) {
      const x = x0 + (x1 - x0 - span) / 2 + span * ((i + 0.5) / n) + (r() - 0.5) * 6;
      const y = cy + (r() - 0.5) * 4;
      const rad = rh * (0.56 + r() * 0.08);
      // which piece: a round, a half or a quarter (the pith at the corner where the split faces meet)
      const kind = r();
      const a0 = r() * P2;
      const sweep = kind < 0.25 ? P2 : kind < 0.6 ? Math.PI : Math.PI / 2 + 0.3;
      // centre the piece's mass on (x, y)
      const off = sweep === Math.PI ? 0.42 : 0.55;
      const mx = sweep < P2 ? Math.cos(a0 + sweep / 2) * rad * off : 0;
      const my = sweep < P2 ? Math.sin(a0 + sweep / 2) * rad * off : 0;
      const px = x - mx;
      const py = y - my;
      const piece = (c: Ctx) => {
        c.beginPath();
        if (sweep < P2) c.moveTo(px, py);
        c.arc(px, py, rad, a0, a0 + sweep);
        c.closePath();
      };
      const bb = { x: px - rad, y: py - rad, w: rad * 2, h: rad * 2 };
      solid(ctx, piece, bb, 'wood', '#c89a68', { depth: 0.12, line: 1.4, formSize: 5, texA: 0.2 });
      within(ctx, piece, () => {
        const g = ctx.createRadialGradient(px - rad * 0.3, py - rad * 0.4, 0, px, py, rad * 1.1);
        g.addColorStop(0, 'rgba(255,236,200,0.35)');
        g.addColorStop(1, 'rgba(90,50,20,0.3)');
        ctx.fillStyle = g;
        ctx.fillRect(bb.x, bb.y, bb.w, bb.h);
        // growth rings round the pith, a check or two
        ctx.strokeStyle = 'rgba(120,70,30,0.4)';
        ctx.lineWidth = 0.9;
        for (let k = 1; k < 6; k++) {
          ctx.beginPath();
          ctx.arc(px, py, rad * 0.16 * k + (r() - 0.5) * 1.5, 0, P2);
          ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(50,24,8,0.7)';
        ctx.lineWidth = 1.3;
        const ca = a0 + r() * sweep;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + Math.cos(ca) * rad * 0.8, py + Math.sin(ca) * rad * 0.8);
        ctx.stroke();
        // the fire's warmth on the faces nearer the hearth
        ctx.fillStyle = rgba('#ff9a50', 0.2 * Math.max(0, 1 - (x - x0) / 120));
        ctx.fillRect(bb.x, bb.y, bb.w, bb.h);
      });
      // the bark: a thick dark rind round the curved side
      ctx.strokeStyle = '#3a2416';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(px, py, rad - 2.5, a0 + 0.05, a0 + sweep - 0.05);
      ctx.stroke();
      ctx.strokeStyle = rgba('#8a6a4a', 0.5);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(px, py, rad - 3.5, a0 + 0.2, a0 + sweep - 0.2);
      ctx.stroke();
      ctx.strokeStyle = '#1a0c06';
      ctx.lineWidth = 1.4;
      piece(ctx);
      ctx.stroke();
    }
  }
  // the pile's far right and its top in the room's shade
  ctx.save();
  outline(ctx);
  ctx.clip();
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, 'rgba(10,4,2,0)');
  g.addColorStop(1, 'rgba(10,4,2,0.35)');
  ctx.fillStyle = g;
  ctx.fillRect(x0, top - 20, x1 - x0, TY - top + 20);
  ctx.restore();
}

function mantel(ctx: Ctx, r: R): void {
  const { x0, x1 } = LG.chim;
  const { y, h } = LG.mantel;
  // the mantel beam: a hewn timber on two iron corbels, adze marks, its top in the light, its face warm from below
  for (const cx of [x0 + 40, x1 - 40]) {
    const cb = (c: Ctx) => {
      c.beginPath();
      c.moveTo(cx - 14, y + h);
      c.lineTo(cx + 14, y + h);
      c.lineTo(cx + 10, y + h + 26);
      c.quadraticCurveTo(cx, y + h + 36, cx - 10, y + h + 26);
      c.closePath();
    };
    castShadow(ctx, cb, 8, 10, 0.5);
    solid(ctx, cb, { x: cx - 14, y: y + h, w: 28, h: 36 }, 'iron', '#2a2420', { depth: 0.12, line: 1.3, formSize: 4 });
  }
  const beam = rectPath(x0 - 16, y, x1 - x0 + 32, h);
  castShadow(ctx, beam, 16, 20, 0.6);
  solid(ctx, beam, { x: x0 - 16, y, w: x1 - x0 + 32, h }, 'wood', '#5a3a22', { depth: 0.12, formSize: 10 });
  within(ctx, beam, () => {
    woodGrain(ctx, r, { x: x0 - 16, y, w: x1 - x0 + 32, h }, '#5a3a22', false, 0.9);
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = rgba('#1a0c04', 0.25);
      ctx.beginPath();
      ctx.ellipse(x0 + r() * (x1 - x0), y + 10 + r() * 14, 16, 3, 0, 0, P2);
      ctx.fill();
    }
    vfill(ctx, x0, y, x1 - x0, h, [[0, rgba('#ffe0b8', 0.32)], [0.15, 'rgba(0,0,0,0)'], [1, rgba('#ff8a3a', 0.22)]]);
  });
  // on it: a pewter tankard and a little carved bear, between the candlesticks
  const tx = x0 + 150;
  const tk = rrPath(tx - 13, y - 34, 26, 34, 4);
  castShadow(ctx, tk, 7, 6, 0.5);
  solid(ctx, tk, { x: tx - 13, y: y - 34, w: 26, h: 34 }, 'chrome', '#8a8e90', { depth: 0.12, line: 1.4, formSize: 5 });
  ctx.strokeStyle = '#4a4c50';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(tx + 15, y - 18, 8, -1.2, 1.2);
  ctx.stroke();
  // candles in pewter sticks at each end (their flames are live)
  for (const cx of LG.candles) {
    const st = (c: Ctx) => {
      c.beginPath();
      c.ellipse(cx, y - 2, 16, 4, 0, 0, P2);
      c.rect(cx - 5, y - 26, 10, 24);
      c.ellipse(cx, y - 26, 11, 3.5, 0, 0, P2);
    };
    castShadow(ctx, st, 8, 6, 0.5);
    solid(ctx, st, { x: cx - 16, y: y - 30, w: 32, h: 32 }, 'chrome', '#8a8a86', { depth: 0.12, line: 1.3, formSize: 4 });
    candle(ctx, cx, y - 26, 62, '#f2e6cc', false);
  }
  // the light on the stones above from the candles
  for (const cx of LG.candles) lightPool(ctx, cx, y - 110, 90, 70, '#ffb04a', 0.14);
}

function candleStill(ctx: Ctx): void {
  for (const cx of LG.candles) {
    lightPool(ctx, cx, LG.mantel.y - 100, 70, 60, '#ffb04a', 0.25);
    flameShape(ctx, cx, LG.mantel.y - 89, 11, 28);
  }
}

// ——— the antlers ———

/** A tapering limb along a polyline (widths w0 → w1): its outline as a path. */
function taper(pts: [number, number][], w0: number, w1: number): PathFn {
  const L: [number, number][] = [];
  const Rt: [number, number][] = [];
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i];
    const [ax, ay] = pts[Math.max(0, i - 1)];
    const [bx, by] = pts[Math.min(pts.length - 1, i + 1)];
    const dx = bx - ax;
    const dy = by - ay;
    const l = Math.hypot(dx, dy) || 1;
    const w = (w0 + (w1 - w0) * (i / (pts.length - 1))) / 2;
    L.push([x - (dy / l) * w, y + (dx / l) * w]);
    Rt.push([x + (dy / l) * w, y - (dx / l) * w]);
  }
  return (c) => {
    c.beginPath();
    c.moveTo(L[0][0], L[0][1]);
    for (const p of L.slice(1)) c.lineTo(p[0], p[1]);
    const tip = pts[pts.length - 1];
    c.lineTo(tip[0], tip[1]);
    for (const p of Rt.slice().reverse()) c.lineTo(p[0], p[1]);
    c.closePath();
  };
}

/** A smooth curve through control points as a polyline. */
function curve(p: [number, number][], n = 14): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    // quadratic/cubic Bézier by de Casteljau
    let q = p.slice();
    while (q.length > 1) {
      const nq: [number, number][] = [];
      for (let k = 0; k < q.length - 1; k++) nq.push([q[k][0] + (q[k + 1][0] - q[k][0]) * t, q[k][1] + (q[k + 1][1] - q[k][1]) * t]);
      q = nq;
    }
    out.push(q[0]);
  }
  return out;
}

const ANTLER_BOX = { x: LG.antlers.x - 200, y: LG.antlers.y - 200, w: 410, h: 320 };

function antlers(ctx: Ctx): void {
  const { x: ax, y: ay } = LG.antlers;
  // the shield: walnut, a bevelled edge, hung on its nail
  const shield = (c: Ctx) => {
    c.beginPath();
    c.moveTo(ax - 50, ay - 40);
    c.quadraticCurveTo(ax, ay - 58, ax + 50, ay - 40);
    c.lineTo(ax + 48, ay + 20);
    c.quadraticCurveTo(ax + 40, ay + 58, ax, ay + 76);
    c.quadraticCurveTo(ax - 40, ay + 58, ax - 48, ay + 20);
    c.closePath();
  };
  castShadow(ctx, shield, 12, 14, 0.6);
  solid(ctx, shield, { x: ax - 50, y: ay - 58, w: 100, h: 134 }, 'wood', '#5a3018', { depth: 0.12, formSize: 16 });
  within(ctx, shield, () => {
    ctx.strokeStyle = rgba('#ffd8a8', 0.25);
    ctx.lineWidth = 2;
    ctx.save();
    ctx.translate(ax, ay + 8);
    ctx.scale(0.8, 0.8);
    ctx.translate(-ax, -ay - 8);
    shield(ctx);
    ctx.stroke();
    ctx.restore();
  });
  // the frontlet: the skull cap, wrapped in dark hide
  const cap = ellPath(ax, ay - 14, 28, 22);
  castShadow(ctx, cap, 8, 8, 0.5);
  solid(ctx, cap, { x: ax - 28, y: ay - 36, w: 56, h: 44 }, 'leather', '#3a2416', { depth: 0.12, line: 1.5, formSize: 8 });
  // the rack: two main beams sweeping up and out from the burrs, the tines rising off them; bone ivory with the
  // bases browner and the tips polished pale
  for (const s of [-1, 1]) {
    const bx = ax + s * 18;
    const by = ay - 28;
    const main = curve([[bx, by], [bx + s * 56, by - 8], [bx + s * 112, by - 52], [bx + s * 122, by - 158]], 18);
    const limbs: [PathFn, [number, number][]][] = [[taper(main, 21, 6), main]];
    for (const [t, len, lean] of [[0.08, 44, 0.45], [0.38, 64, 0.08], [0.62, 58, 0.02], [0.82, 42, 0.18]] as const) {
      const k = Math.round(t * (main.length - 1));
      const [tx, ty] = main[k];
      const tine = curve([[tx, ty], [tx + s * (lean * len + 6), ty - len * 0.55], [tx + s * (lean * len * 1.6 + 2), ty - len]], 10);
      limbs.push([taper(tine, 13 - t * 4, 3.5), tine]);
    }
    for (const [p] of limbs) castShadow(ctx, p, 16, 12, 0.5);
    for (const [p, pts] of limbs) {
      const xs = pts.map((q) => q[0]);
      const ys = pts.map((q) => q[1]);
      const bb = { x: Math.min(...xs) - 10, y: Math.min(...ys) - 10, w: Math.max(...xs) - Math.min(...xs) + 20, h: Math.max(...ys) - Math.min(...ys) + 20 };
      solid(ctx, p, bb, 'stone', '#d8c8a4', { depth: 0.12, line: 1.5, formSize: 5, texA: 0.25 });
      within(ctx, p, () => {
        // the beading on the base (a rough, darker band), the tips polished pale
        const g = ctx.createLinearGradient(pts[0][0], pts[0][1], pts[pts.length - 1][0], pts[pts.length - 1][1]);
        g.addColorStop(0, rgba('#5a3a20', 0.55));
        g.addColorStop(0.4, rgba('#7a5a3a', 0.15));
        g.addColorStop(0.85, rgba('#fff8e8', 0.1));
        g.addColorStop(1, rgba('#fffaf0', 0.5));
        ctx.fillStyle = g;
        ctx.fillRect(bb.x, bb.y, bb.w, bb.h);
        // the candles' warm light on the faces turned down and in
        ctx.fillStyle = rgba('#ffb060', 0.08);
        ctx.fillRect(bb.x, bb.y, bb.w, bb.h);
      });
    }
    // the burr: a knobbly ring where the antler meets the skull
    const burr = ellPath(bx, by, 11, 8);
    solid(ctx, burr, { x: bx - 11, y: by - 8, w: 22, h: 16 }, 'stone', '#8a7050', { depth: 0.12, line: 1.4, formSize: 4, texA: 0.5 });
  }
  // the nail head it hangs on
  ctx.fillStyle = '#2a2420';
  ctx.beginPath();
  ctx.arc(ax, ay - 46, 3, 0, P2);
  ctx.fill();
}

// ——— the sconce and the skis ———

function sconce(ctx: Ctx): void {
  const { x, y } = LG.sconce;
  const plate = rrPath(x - 13, y + 42, 26, 46, 7);
  castShadow(ctx, plate, 8, 8, 0.5);
  solid(ctx, plate, { x: x - 13, y: y + 42, w: 26, h: 46 }, 'chrome', '#b08a4a', { depth: 0.12, line: 1.4, formSize: 4 });
  const arm = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x - 2, y + 64);
    c.bezierCurveTo(x + 26, y + 58, x + 22, y + 34, x - 2, y + 26);
    c.lineTo(x + 2, y + 22);
    c.bezierCurveTo(x + 30, y + 32, x + 32, y + 62, x + 2, y + 70);
    c.closePath();
  };
  castShadow(ctx, arm, 7, 6, 0.45);
  solid(ctx, arm, { x: x - 2, y: y + 22, w: 34, h: 48 }, 'chrome', '#9a7840', { depth: 0.12, line: 1.2, formSize: 3 });
  const shadeP = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x - 18, y - 10);
    c.lineTo(x + 18, y - 10);
    c.lineTo(x + 31, y + 24);
    c.quadraticCurveTo(x, y + 29, x - 31, y + 24);
    c.closePath();
  };
  castShadow(ctx, shadeP, 10, 12, 0.4);
  solid(ctx, shadeP, { x: x - 31, y: y - 10, w: 62, h: 39 }, 'canvas', '#f0d8a8', { depth: 0.12, line: 1.4, formSize: 6, spec: false });
  // the light glowing through the parchment, brightest low down
  within(ctx, shadeP, () => lightPool(ctx, x, y + 18, 36, 20, '#fff0c0', 0.65));
  glowAt(ctx, x, y + 28, 80, '#ffc070', 0.3);
}

const SKI_BOX = { x: LG.skis.x - 90, y: 100, w: 360, h: TY - 100 };

function skis(ctx: Ctx, r: R): void {
  const x = LG.skis.x;
  // where the tails and the pole tips stand: a dark contact shadow on the boards, spreading down-right
  for (const [cx, rx] of [[x - 34, 26], [x + 36, 26], [x + 98, 22]] as const) {
    ctx.fillStyle = 'rgba(14,6,2,0.55)';
    ctx.beginPath();
    ctx.ellipse(cx + 8, TY - 3, rx, 6, 0, 0, P2);
    ctx.fill();
  }
  for (const [dx, col, ang] of [[-40, '#b8241e', 0.1], [30, '#1e4a9a', 0.13]] as const) {
    ctx.save();
    ctx.translate(x + dx, TY - 2);
    ctx.rotate(ang);
    const ski = (c: Ctx) => {
      c.beginPath();
      c.moveTo(-10, 0);
      c.lineTo(-10, -560);
      c.quadraticCurveTo(-10, -604, 7, -616);
      c.quadraticCurveTo(13, -592, 10, -560);
      c.lineTo(10, 0);
      c.closePath();
    };
    castShadow(ctx, ski, 22, 16, 0.6);
    solid(ctx, ski, { x: -10, y: -616, w: 23, h: 616 }, 'enamel', col, { depth: 0.1, formSize: 6 });
    within(ctx, ski, () => {
      // the hickory showing at the edges where the lacquer's worn, a pinstripe, the maker's decal
      ctx.fillStyle = rgba('#c8a060', 0.5);
      ctx.fillRect(-10, -540, 2.5, 520);
      ctx.fillStyle = rgba('#f0e8d8', 0.85);
      ctx.fillRect(-1.5, -520, 3, 200);
      ctx.fillRect(-1.5, -230, 3, 200);
      ctx.fillStyle = rgba('#f4e8c8', 0.9);
      ctx.fillRect(-7, -470, 14, 26);
      ctx.fillStyle = col;
      ctx.fillRect(-5, -466, 10, 3);
      ctx.fillRect(-5, -458, 10, 3);
      ctx.fillRect(-5, -450, 10, 3);
      vfill(ctx, -10, -40, 20, 40, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(10,4,2,0.5)']]);
    });
    // the cable binding: toe iron and heel spring
    const bind = rrPath(-13, -300, 26, 46, 5);
    solid(ctx, bind, { x: -13, y: -300, w: 26, h: 46 }, 'chrome', '#8a8a90', { depth: 0.1, line: 1.4, formSize: 4 });
    ctx.strokeStyle = '#2a2a30';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-11, -256);
    ctx.quadraticCurveTo(0, -200, 11, -256);
    ctx.stroke();
    ctx.restore();
  }
  // a pair of bamboo poles with leather baskets, leaning further over
  for (const [dx, ang] of [[86, 0.19], [102, 0.23]] as const) {
    ctx.save();
    ctx.translate(x + dx, TY - 2);
    ctx.rotate(ang);
    const pole = rectPath(-3.5, -520, 7, 520);
    castShadow(ctx, pole, 18, 12, 0.5);
    solid(ctx, pole, { x: -3.5, y: -520, w: 7, h: 520 }, 'wood', '#c8a060', { depth: 0.1, line: 1.2, formSize: 2 });
    for (let ny = -500; ny < -20; ny += 70 + r() * 20) {
      ctx.fillStyle = rgba('#5a3a1a', 0.7);
      ctx.fillRect(-3.5, ny, 7, 2);
    }
    // the grip and strap
    const grip = rrPath(-5, -520, 10, 70, 4);
    solid(ctx, grip, { x: -5, y: -520, w: 10, h: 70 }, 'leather', '#3a2414', { depth: 0.1, line: 1.2, formSize: 3 });
    ctx.strokeStyle = '#2a1a0e';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, -44, 20, 6, 0, 0, P2);
    ctx.stroke();
    ctx.restore();
  }
}

// ——— the table ———

const TARTAN: Sett = [['#a8141c', 0.11], ['#16244a', 0.03], ['#0e4428', 0.06], ['#e8d08a', 0.008], ['#0e4428', 0.06], ['#16244a', 0.03]];

function table(ctx: Ctx, r: R): void {
  tartanCloth(ctx, r, LG.front, '#9a141a', TARTAN, { off: 0.02 });
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, LG.front - TY + 4);
  ctx.clip();
  // the fire's warmth on the left of the cloth, the sconce on the right
  lightPool(ctx, LG.fire.x + 160, 850, 620, 150, '#ff9a4a', 0.22, 'screen');
  lightPool(ctx, LG.sconce.x, 850, 380, 110, '#ffd090', 0.1, 'screen');
  // calm under the pizzas: the weave's contrast eased back down the middle of the table
  const g = ctx.createRadialGradient(W / 2, 900, 100, W / 2, 900, 900);
  g.addColorStop(0, 'rgba(60,20,16,0.22)');
  g.addColorStop(1, 'rgba(60,20,16,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, TY, W, LG.front - TY);
  ctx.restore();
  tableFalloff(ctx, LG.front, 0.42, '#140604');
  tableSeam(ctx, 0.6, '#1e0e06', false);
  const full: Sett = [...TARTAN, ...TARTAN.slice(0, -1).reverse()];
  const period = full.reduce((s, [, w]) => s + w, 0);
  const at = (X: number) => {
    let u = ((X % period) + period) % period;
    for (const [c, w] of full) {
      if (u < w) return c;
      u -= w;
    }
    return full[0][0];
  };
  foldedFront(ctx, LG.front, (x, y) => {
    const X = frontX(x, LG.front) - 0.02;
    return mix(at(X), at((y - LG.front) / 140), 0.45);
  }, 8);
  // the front: the same cloth turning over the table's edge, a lit lip where it rolls, then down into shade
  vfill(ctx, 0, LG.front - 2, W, 1080 - LG.front + 2, [[0, 'rgba(255,214,170,0.22)'], [0.12, 'rgba(255,214,170,0.05)'], [0.3, 'rgba(16,4,4,0.3)'], [1, 'rgba(10,2,2,0.68)']]);
  // the back: the cloth runs up to the logs and falls off into the shade there, a dark contact line where it meets
  // them and the hem's shadow along it
  vfill(ctx, 0, TY, W, 110, [[0, 'rgba(14,4,2,0.55)'], [0.25, 'rgba(14,4,2,0.22)'], [1, 'rgba(14,4,2,0)']]);
  ctx.fillStyle = 'rgba(10,3,2,0.85)';
  ctx.fillRect(0, TY, W, 3);
  ctx.strokeStyle = rgba('#ffcf9a', 0.12);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, TY + 6);
  for (let x = 0; x <= W; x += 40) ctx.lineTo(x, TY + 6 + Math.sin(x * 0.03) * 1.2);
  ctx.stroke();
  // the fire's light spilling over the cloth in front of the hearth
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, LG.front - TY);
  ctx.clip();
  lightPool(ctx, LG.fire.x + 20, TY + 18, 330, 46, '#ff9a4a', 0.3);
  ctx.restore();
}

/** The alpenglow through the window laid on the cloth (the still; it fades as the light goes). */
function dayLight(ctx: Ctx): void {
  lightPatch(ctx, [[WIN.x0 + 40, TY + 4], [WIN.x1 - 40, TY + 4], [WIN.x1 + 160, 930], [WIN.x0 - 120, 930]], { col: '#ffc8b8', a: 0.14, barsU: [1 / 3, 2 / 3], bar: 0.02, soft: 18, fade: 0.8 });
}

/** The night's cold light through the window, on the sill and the logs below it (live only, added). */
function nightSpill(ctx: Ctx): void {
  const { x0, x1, y1 } = WIN;
  lightPatch(ctx, [[x0 + 10, y1 + 24], [x1 - 10, y1 + 24], [x1 + 200, TY - 4], [x0 - 80, TY - 4]], { col: '#7a96e8', a: 0.3, barsU: [1 / 3, 2 / 3], bar: 0.025, soft: 22, fade: 0.85 });
}

function grade(ctx: Ctx): void {
  gradeAll(ctx, 0.04, '#ffb880', 0.06, { warm: '#ffbe72', cool: '#5a70c8', a: 0.24 });
}

function shadeOver(ctx: Ctx): void {
  calmLanes(ctx, 0.12, '#1a0c06', 80, 640);
  vignetteAll(ctx, 0.6, '#0e0602');
}

// ——— the stack ———

const FIRE_SLOT = { x: LG.fire.x - LG.fire.mouthHalf, y: LG.fire.archTop, w: LG.fire.mouthHalf * 2, h: LG.fire.y + 8 - LG.fire.archTop };
const ANDIRON_BOX = { x: LG.fire.x - 125, y: LG.fire.y - 72, w: 250, h: TY - LG.fire.y + 72 };
const WINDOW_BOX = { x: WIN.x0 - 64, y: WIN.y0 - 34, w: WIN.x1 - WIN.x0 + 150, h: WIN.y1 - WIN.y0 + 132 };
const CURTAIN_BOX = { x: WIN.x0 - 150, y: WIN.y0 - 74, w: WIN.x1 - WIN.x0 + 300, h: WIN.y1 - WIN.y0 + 168 };
const NIGHT_SPILL = { x: WIN.x0 - 120, y: WIN.y1 + 20, w: WIN.x1 - WIN.x0 + 360, h: TY - WIN.y1 - 22 };
const BANK_BOX = { x: WIN.x0, y: WIN.y1 - 70, w: WIN.x1 - WIN.x0, h: 72 };

export const LODGE: SceneSpec = {
  id: 'lodge',
  info: {
    name: 'Alpine Lodge',
    subtitle: 'Waves 21–24',
    ambient: [],
    glows: [
      { x: LG.fire.x, y: LG.fire.y - 60, r: 280, color: '#ff7a1a', flicker: 0.8 },
      { x: LG.sconce.x, y: LG.sconce.y + 20, r: 160, color: '#ffc070', flicker: 0.12 },
    ],
    light: '#ffc890',
    tableTint: '#fff0e0',
  },
  layers: [
    { id: 'logs', box: { x: 0, y: 0, w: W, h: TY + 2 }, draw: logs },
    { id: 'chimney', box: { x: 0, y: LG.beam - 10, w: LG.chim.x1 + 60, h: TY - LG.beam + 12 }, draw: chimney },
    { id: 'beam', box: { x: 0, y: 0, w: W, h: LG.beam + 40 }, draw: ceilingBeam },
    { id: 'pile', box: { x: LG.pile.x0 - 20, y: LG.pile.top - 30, w: LG.pile.x1 - LG.pile.x0 + 60, h: TY - LG.pile.top + 32 }, draw: woodpile },
    { id: 'mantel', box: { x: 0, y: LG.mantel.y - 120, w: LG.chim.x1 + 70, h: 200 }, draw: mantel },
    // (the moving pieces of the left wall, kept clear of the window's boxes so nothing cascades into overlays)
    { id: 'antlers', box: ANTLER_BOX, motion: 'sprite', draw: (c) => antlers(c) },
    { id: 'candles', box: { x: 40, y: LG.mantel.y - 170, w: 420, h: 160 }, stillOnly: true, draw: (c) => candleStill(c) },
    { id: 'sconce', box: { x: LG.sconce.x - 90, y: LG.sconce.y - 70, w: 180, h: 190 }, draw: (c) => sconce(c) },
    { id: 'skis', box: SKI_BOX, motion: 'sprite', draw: skis },
    { id: 'firebox', box: { x: LG.fire.x - LG.fire.mouthHalf - 60, y: LG.fire.archTop - 40, w: LG.fire.mouthHalf * 2 + 120, h: TY - LG.fire.archTop + 40 }, draw: firebox },
    { id: 'fire', box: { x: LG.fire.x - 160, y: LG.fire.archTop - 40, w: 320, h: LG.fire.y - LG.fire.archTop + 60 }, stillOnly: true, draw: (c) => fireStill(c) },
    { id: 'fireLive', box: FIRE_SLOT, motion: 'slot', draw: () => {} },
    { id: 'andirons', box: ANDIRON_BOX, draw: andirons },
    { id: 'view', box: WIN_BOX, draw: (c, r) => view(c, r, DAY) },
    { id: 'dusk', box: WIN_BOX, liveOnly: true, res: 0.6, draw: (c, r) => view(c, r, DUSK) },
    { id: 'night', box: WIN_BOX, liveOnly: true, res: 0.6, draw: (c, r) => view(c, r, NIGHT) },
    { id: 'whiteout', box: { x: WIN.x0, y: WIN.y0 + 24, w: WIN.x1 - WIN.x0, h: WIN.y1 - WIN.y0 - 24 }, liveOnly: true, res: 0.33, draw: whiteout },
    { id: 'bank', box: BANK_BOX, draw: (c) => bank(c, 0.35, false) },
    { id: 'bankDeep', box: BANK_BOX, liveOnly: true, draw: (c) => bank(c, 1, true) },
    // falling snow beyond the glass, the eave's powder, the clumps on the drift
    { id: 'snow', box: WIN_BOX, motion: 'slot', draw: () => {} },
    { id: 'frost', box: WIN_BOX, liveOnly: true, res: 0.5, draw: frost },
    { id: 'window', box: WINDOW_BOX, draw: windowFrame },
    { id: 'curtains', box: CURTAIN_BOX, draw: curtains },
    { id: 'nightSpill', box: NIGHT_SPILL, liveOnly: true, res: 0.33, draw: (c) => nightSpill(c) },
    { id: 'table', box: { x: 0, y: TY, w: W, h: 1080 - TY }, draw: table },
    { id: 'daylight', box: { x: WIN.x0 - 180, y: TY - 20, w: WIN.x1 - WIN.x0 + 380, h: 200 }, motion: 'sprite', res: 0.33, draw: (c) => dayLight(c) },
    { id: 'top', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

// ——— live: painted frames ———

/** One frame of blown snow (phase 0…1 loops): veils and streams of fine snow curling across, w×h. */
function gustFrame(c: Ctx, w: number, h: number, ph: number): void {
  let s = 71;
  const rr = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  // sheets of driven snow raking down to the left with the wind, undulating as they go
  for (let i = 0; i < 30; i++) {
    const y0 = rr() * h * 1.4 - h * 0.45;
    const amp = 3 + rr() * 8;
    const k = 1 + Math.floor(rr() * 2);
    const width = 2 + rr() * 7;
    const a = 0.07 + rr() * 0.14;
    // each sheet travels leftwards a whole cycle width per cycle (seamless)
    const x0 = ((rr() + 1 - ((ph * k) % 1)) % 1) * w * 2 - w * 0.5;
    const len = w * (0.4 + rr() * 0.5);
    for (const off of [0, -w * 2]) {
      const xa = x0 + off;
      const g = c.createLinearGradient(xa, 0, xa + len, 0);
      g.addColorStop(0, 'rgba(236,242,255,0)');
      g.addColorStop(0.45, `rgba(236,242,255,${a.toFixed(3)})`);
      g.addColorStop(1, 'rgba(236,242,255,0)');
      c.strokeStyle = g;
      c.lineWidth = width;
      c.beginPath();
      for (let u = 0; u <= 1.001; u += 0.1) {
        const x = xa + u * len;
        const y = y0 + Math.sin(u * 4 + ph * P2 * k + i) * amp + (1 - u) * len * 0.45;
        if (u === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();
    }
  }
}

/** A tile of falling snow at one depth (it scrolls): shaped flakes, lit on top, soft at the far depth. */
function snowTile(c: Ctx, size: number, d: number): void {
  let s = 101 + d * 7;
  const rr = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const n = [130, 60][d];
  for (let i = 0; i < n; i++) {
    const x = rr() * size;
    const y = rr() * size;
    const sz = [1.3, 2.4][d] * (0.7 + rr() * 0.7);
    for (const [ox, oy] of [[0, 0], [size, 0], [-size, 0], [0, size], [0, -size]] as const) {
      const g = c.createRadialGradient(x + ox - sz * 0.3, y + oy - sz * 0.35, 0, x + ox, y + oy, sz);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.55, 'rgba(226,234,252,0.7)');
      g.addColorStop(1, 'rgba(190,204,236,0)');
      c.fillStyle = g;
      c.fillRect(x + ox - sz, y + oy - sz, sz * 2, sz * 2);
    }
  }
}

/**
 * One frame of the hearth fire (phase 0…1 loops), w×h, the bed along the bottom middle: tongues that lick up, lean
 * and fall back on their own beats, painted in soft layers from a deep red skin through orange to a yellow body and a
 * white-hot core low down (each layer painted small and drawn up, so its edges are soft, the core crisper). A loose
 * tongue breaks off the top in only one part of the cycle. `low` (0…1) flattens and widens it (the guttering cycle).
 */
export function hearthFrame(c: Ctx, w: number, h: number, ph: number, o: { tongues?: number; low?: number; seed?: number } = {}): void {
  const n = o.tongues ?? 7;
  const low = o.low ?? 0;
  const s = o.seed ?? 1;
  const by = h - 6;
  const cx = w / 2;
  const span = w * (0.78 + low * 0.12);
  const tongues: [number, number, number, number][] = [];
  for (let j = 0; j < n; j++) {
    const u = j / (n - 1);
    const mid = 1 - Math.abs(u - 0.5) * 1.25;
    const p = ph * P2;
    const x = cx + (u - 0.5) * span + Math.sin(p * 2 + j * 2.1 + s) * w * 0.025;
    const th = h * (0.92 - low * 0.55) * mid * (0.7 + Math.sin(p * 2 + j * 1.7 + s) * 0.17 + Math.sin(p * 3 + j * 2.9) * 0.09);
    const tw = (span / n) * 1.9 * (0.9 + Math.sin(p + j) * 0.1);
    const lean = Math.sin(p + j * 1.3 + s) * 0.14 + low * 0.35;
    tongues.push([x, th, tw, lean]);
  }
  const shape = (g: Ctx, k: number, grow: number) => {
    for (const [x, th, tw, lean] of tongues) {
      const ww = tw * k;
      const hh = th * (0.5 + k * 0.5) * grow;
      g.beginPath();
      g.moveTo(x - ww / 2, by);
      g.bezierCurveTo(x - ww * 0.72, by - hh * 0.45, x - ww * 0.18 + lean * hh * 0.4, by - hh * 0.75, x + lean * hh, by - hh);
      g.bezierCurveTo(x + ww * 0.22 + lean * hh * 0.4, by - hh * 0.7, x + ww * 0.72, by - hh * 0.42, x + ww / 2, by);
      g.quadraticCurveTo(x, by + ww * 0.2, x - ww / 2, by);
      g.fill();
    }
  };
  // the layers: [scale of the tongues, colour, alpha, paint resolution]
  const layers: [number, string, number, number][] = [
    [1.08, '#b8280a', 0.75, 0.22],
    [0.92, '#f0601a', 0.85, 0.3],
    [0.74, '#ffa22a', 0.9, 0.4],
    [0.52, '#ffd86a', 0.95, 0.55],
    [0.3, '#fff4d0', 0.95, 0.8],
  ];
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (const [k, col, a, res] of layers) {
    const [lc, lg] = makeCanvas(Math.ceil(w * res), Math.ceil(h * res));
    lg.scale(res, res);
    lg.fillStyle = rgba(col, a);
    shape(lg, k, k < 0.4 ? 0.8 : 1);
    c.imageSmoothingEnabled = true;
    c.drawImage(lc, 0, 0, w, h);
  }
  // the white-hot heart of the bed, low down between the logs
  const hg = c.createRadialGradient(cx, by - 8, 0, cx, by - 8, span * 0.45);
  hg.addColorStop(0, 'rgba(255,250,230,0.55)');
  hg.addColorStop(0.4, 'rgba(255,200,110,0.25)');
  hg.addColorStop(1, 'rgba(255,120,40,0)');
  c.fillStyle = hg;
  c.save();
  c.translate(cx, by - 8);
  c.scale(1, 0.4);
  c.translate(-cx, -(by - 8));
  c.fillRect(0, 0, w, h);
  c.restore();
  // a loose tongue breaking off the tallest tip, only in the first quarter of the cycle
  const q = ph / 0.25;
  if (q < 1 && low < 0.5) {
    const [tx, th, tw] = tongues.reduce((a, b) => (b[1] > a[1] ? b : a));
    const ty = by - th - q * h * 0.22;
    const lw = tw * 0.35 * (1 - q * 0.7);
    const [lc, lg] = makeCanvas(Math.ceil(w * 0.4), Math.ceil(h * 0.4));
    lg.scale(0.4, 0.4);
    lg.fillStyle = rgba('#ff9a2a', 0.85 * (1 - q));
    lg.beginPath();
    lg.ellipse(tx + q * 6, ty, lw / 2, lw * 1.2, 0, 0, P2);
    lg.fill();
    lg.fillStyle = rgba('#ffe08a', 0.8 * (1 - q));
    lg.beginPath();
    lg.ellipse(tx + q * 6, ty + lw * 0.2, lw / 4, lw * 0.6, 0, 0, P2);
    lg.fill();
    c.drawImage(lc, 0, 0, w, h);
  }
  c.restore();
}

registerKitScene(LODGE, (k: KitLive, wave0) => {
  const f = LG.fire;
  const clamp = Phaser.Math.Clamp;
  const fireSlot = k.slot('fireLive');
  const top = k.slot('top');
  const snowSlot = k.slot('snow');
  const dusk = k.sprite('dusk');
  const night = k.sprite('night');
  const deep = k.sprite('bankDeep');
  const frostS = k.sprite('frost');
  const daylight = k.sprite('daylight').setBlendMode(Phaser.BlendModes.ADD);
  const white = k.sprite('whiteout');
  const spill = k.sprite('nightSpill').setBlendMode(Phaser.BlendModes.ADD);

  // ——— the room's light: cooler as night comes, the far end falling into the dark first, the fire's side holding
  const cool = k.wash(0x8a96d0, 0, Phaser.BlendModes.MULTIPLY, top);
  const gloomKey = k.tex('lg_gloom', 96, 54, (c) => {
    c.fillStyle = '#2e2a48';
    c.fillRect(0, 0, 96, 54);
    c.save();
    c.translate(14, 34);
    c.scale(1.5, 1);
    const g = c.createRadialGradient(0, 0, 2, 0, 0, 52);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.45, 'rgba(232,224,236,1)');
    g.addColorStop(1, 'rgba(46,42,72,1)');
    c.fillStyle = g;
    c.fillRect(-60, -60, 140, 120);
    c.restore();
  });
  const gloom = k.img(gloomKey, 0, 0, { into: top, origin: [0, 0], scale: 20, alpha: 0 });
  gloom.setBlendMode(Phaser.BlendModes.MULTIPLY);
  // (the fire's light on the room: added over the gloom so it holds as the room darkens)
  const roomFire = k.glow(f.x + 120, 560, 620, 0xff7a2a, 0.1, { into: top, sy: 0.8 });
  const tableFire = k.glow(f.x + 200, 840, 560, 0xff8a3a, 0.06, { into: top, sy: 0.35 });
  const breastFire = k.glow(f.x, f.y - 90, 260, 0xff8a3a, 0.12, { into: top, sy: 0.9 });
  const sconceGlow = k.glow(LG.sconce.x, LG.sconce.y + 30, 110, 0xffc070, 0.16, { into: top });
  // the dip when the fire gutters: the room's light drops with it
  const dipWash = k.wash(0x60402c, 0, Phaser.BlendModes.MULTIPLY, top);
  void dipWash;

  // ——— hero: the fire ———
  const FN = 8;
  const fireKey = sheet(k, 'lg_fire', FIRE_W, FIRE_H, FN, (c, ph) => hearthFrame(c, FIRE_W, FIRE_H, ph));
  // the firebox's back and cheeks lit by it (behind the flames), breathing with it
  const mouthGlow = k.glow(f.x, f.y - 70, 170, 0xff6a20, 0.3, { into: fireSlot, sy: 0.9 });
  const fire = new Loop(k, fireKey, FN, f.x, f.y - 4, { into: fireSlot, fps: 10, add: true, origin: [0.5, 1] });
  // the guttering cycle: low, wide tongues bowing over, painted on their own
  const GH = 110;
  const GN = 6;
  const gutKey = sheet(k, 'lg_gutter', FIRE_W, GH, GN, (c, ph) => hearthFrame(c, FIRE_W, GH, ph, { tongues: 9, low: 0.6, seed: 4 }));
  const gutter = new Loop(k, gutKey, GN, f.x, f.y - 4, { into: fireSlot, fps: 14, add: true, origin: [0.5, 1] });
  // smoke curling up into the throat, lit orange from below (painted frames, normal blend, fading into the dark)
  const SW = 70;
  const SH = 90;
  const smokeKey = sheet(k, 'lg_smoke', SW, SH, 8, (c, ph) => {
    smokeFrame(c, SW, SH, ph, { lit: '#c87a4a', body: '#4a3a34', shade: '#1a1210', wind: -0.15, lobes: 7, a: 0.55, seed: 3 });
    // (it thins out into the flue)
    c.globalCompositeOperation = 'destination-in';
    const g = c.createLinearGradient(0, 0, 0, SH);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.5, 'rgba(0,0,0,0.8)');
    g.addColorStop(1, 'rgba(0,0,0,0.3)');
    c.fillStyle = g;
    c.fillRect(0, 0, SW, SH);
  });
  const smoke = new Loop(k, smokeKey, 8, f.x + 6, f.archTop + 112, { into: fireSlot, origin: [0.5, 1], scale: 1.6, fps: 6 });
  smoke.each((im) => fireSlot.sendToBack(im));
  const bed = k.glow(f.x, f.y - 12, 150, 0xff5a10, 0.5, { into: fireSlot, sy: 0.35 });
  const hot = k.glow(f.x, f.y - 40, 110, 0xffd070, 0.25, { into: fireSlot, sy: 0.7 });
  // the front log's cracks glowing and breathing (over the painted log)
  const logGlowKey = k.tex('lg_logglow', 200, 36, (c) => {
    let s = 5;
    const rr = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 34; i++) {
      const x = 8 + rr() * 184;
      const y = 6 + rr() * 26;
      const hotK = y / 36;
      c.strokeStyle = rgba(hotK > 0.55 ? '#ffc060' : '#ff6a20', 0.35 + hotK * 0.6);
      c.lineWidth = 1 + hotK * 1.6;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + 4 + rr() * 6, y + (rr() - 0.5) * 6);
      c.lineTo(x + 8 + rr() * 10, y + (rr() - 0.5) * 8);
      c.stroke();
    }
    const g = c.createLinearGradient(0, 0, 0, 36);
    g.addColorStop(0.5, 'rgba(255,110,30,0)');
    g.addColorStop(1, 'rgba(255,120,40,0.5)');
    c.fillStyle = g;
    c.fillRect(6, 0, 188, 36);
  });
  const logGlow = k.img(logGlowKey, f.x - 12, f.y - 6, { into: top, add: true }).setRotation(0.05);
  // its light spilling out over the arch, the hearth and the front of the table
  const archGlow = k.glow(f.x, f.archTop + 30, 210, 0xff8a3a, 0.1, { into: top, sy: 0.7 });
  const hearthGlow = k.glow(f.x + 20, TY + 14, 330, 0xff8a3a, 0.2, { into: top, sy: 0.18 });
  const embers = new Parts(k, { frame: 'ember', add: true, into: top, max: 70 });
  const ash = new Parts(k, { frame: 'puff', into: top, max: 40 });
  const emberRate = new Rate();
  /** 1 knocked down … 0 burning steady; then the flare as it recovers. */
  let gut = 0;
  let flare = 0;
  const fireSq = new Spring(0, 30, 5);
  const burst = (n: number, power: number) => {
    for (let i = 0; i < n; i++)
      embers.spawn({ x: f.x + (crand() - 0.5) * 150, y: f.y - 30 - crand() * 40, vx: (crand() - 0.5) * 140, vy: -160 - crand() * 260 * power, life: 1 + crand() * 1.2, r0: 7 + crand() * 5, r1: 2, a: 1, tint: crand() < 0.4 ? 0xffe080 : 0xff8a30, grav: -40, drag: 0.9, streak: 0.012, fade: 0.05 });
  };

  // ——— the candles ———
  const CN = 8;
  const candleKey = sheet(k, 'lg_candle', 24, 44, CN, (c, ph) => flameFrame(c, 24, 44, ph, ['#e86a1a', '#ffc04a', '#fffbe8'], 1, 2));
  const candles = LG.candles.map((cx, i) => ({
    loop: new Loop(k, candleKey, CN, cx, LG.mantel.y - 86, { into: top, fps: 9 + i, add: true, origin: [0.5, 1] }),
    halo: k.glow(cx, LG.mantel.y - 98, 80, 0xffb04a, 0.28, { into: top }),
    s: new Spring(0, 40, 6),
  }));

  // ——— the antlers on their nail, the skis against the logs ———
  const rack = new Swing(k.pivot(k.sprite('antlers'), LG.antlers.x, LG.antlers.y - 46), { k: 60, c: 2.2, idle: 0 });
  const skiS = new Swing(k.pivot(k.sprite('skis'), LG.skis.x, TY - 2), { k: 30, c: 3.5, idle: 0 });
  const soot = new Parts(k, { frame: 'mote', into: top, max: 60 });

  // ——— hero: the snow ———
  const wb = WIN_BOX;
  const TILE = 256;
  const far = k.sc.add.tileSprite(wb.x, wb.y, wb.w, wb.h, k.tex('lg_snow0', TILE, TILE, (c) => snowTile(c, TILE, 0))).setOrigin(0, 0).setAlpha(0);
  const mid = k.sc.add.tileSprite(wb.x, wb.y, wb.w, wb.h, k.tex('lg_snow1', TILE, TILE, (c) => snowTile(c, TILE, 1))).setOrigin(0, 0).setAlpha(0);
  snowSlot.add([far, mid]);
  // the blizzard's veils: painted frames of blown snow (half size, drawn up)
  const GW = Math.ceil(wb.w / 3);
  const GHt = Math.ceil(wb.h / 3);
  const VN = 8;
  const veilKey = sheet(k, 'lg_veil', GW, GHt, VN, (c, ph) => gustFrame(c, GW, GHt, ph));
  const veil = new Loop(k, veilKey, VN, wb.x, wb.y, { into: snowSlot, origin: [0, 0], scale: 3, fps: 8 });
  // (a nearer, faster sheet of the same, offset)
  const veil2 = new Loop(k, veilKey, VN, wb.x, wb.y, { into: snowSlot, origin: [0, 0], scale: 3, fps: 11, phase: 4 });
  // the near flakes: tumbling past the glass, landing on the drift
  const flakes = new Parts(k, { frame: 'mote', into: snowSlot, max: 120 });
  const flakeRate = new Rate();
  // the eave's powder (a stomp shakes it off the roof over the window) and clumps knocked off the drift
  const powder = new Parts(k, { frame: 'puff', into: snowSlot, max: 70 });
  // a clump of snow: soft, rounded and broken, lit on its top left, blue-grey underneath, crumbs round it
  const clumpKey = k.tex('lg_clump', 44, 36, (c) => {
    for (const [bx, by, br] of [[22, 20, 11], [13, 22, 8], [31, 23, 8], [18, 13, 7], [28, 14, 6], [24, 27, 7]] as const) {
      const g = c.createRadialGradient(bx - br * 0.4, by - br * 0.45, 0, bx, by, br);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.6, 'rgba(226,232,248,0.95)');
      g.addColorStop(1, 'rgba(150,164,206,0.6)');
      c.fillStyle = g;
      c.beginPath();
      c.arc(bx, by, br, 0, P2);
      c.fill();
    }
    for (const [cx, cy] of [[6, 14], [38, 12], [8, 30], [37, 31], [22, 5]] as const) {
      c.fillStyle = 'rgba(240,244,255,0.8)';
      c.beginPath();
      c.arc(cx, cy, 1.8, 0, P2);
      c.fill();
    }
  });
  type Clump = { img: Phaser.GameObjects.Image; x: number; y: number; vx: number; vy: number; rot: number; live: boolean };
  const clumps: Clump[] = Array.from({ length: 8 }, () => ({ img: k.img(clumpKey, 0, 0, { into: snowSlot }).setVisible(false), x: 0, y: 0, vx: 0, vy: 0, rot: 0, live: false }));
  /** How deep the drift on the sill is (0…1, follows the wave and the snow). */
  let level = 0.35;
  const shake = (x: number, p: number) => {
    // the eave: a sheet of powder sliding off the roof over the window and falling past the glass
    const n = Math.round(10 + p * 30);
    for (let i = 0; i < n; i++) {
      const px = wb.x + crand() * wb.w;
      powder.spawn({ x: px, y: wb.y - 10 + crand() * 20, vx: (crand() - 0.5) * 30, vy: 40 + crand() * 160, life: 1.4 + crand() * 0.8, r0: 10 + crand() * 10, r1: 34 + crand() * 30, a: 0.55, tint: 0xf4f6ff, grav: 260, drag: 1.6, floor: bankTop(px, level) - 4, fade: 0.08 });
    }
    for (let i = 0; i < Math.round(4 + p * 10); i++) flakes.spawn({ x: wb.x + crand() * wb.w, y: wb.y + crand() * 30, vx: (crand() - 0.5) * 40, vy: 160 + crand() * 200, life: 1.5, r0: 16 + crand() * 12, a: 0.95, tint: 0xffffff, grav: 600, floor: WIN.y1 - 8, spin: (crand() - 0.5) * 8, fade: 0.02 });
    // clumps broken off the eave's lip, tumbling down past the glass onto the drift
    let m = Math.round(2 + p * 4);
    for (const c of clumps) {
      if (c.live || m <= 0) continue;
      m--;
      c.live = true;
      c.x = clamp(x + (crand() - 0.5) * 600, wb.x + 30, wb.x + wb.w - 30);
      c.y = wb.y + 22;
      c.vx = (crand() - 0.5) * 30;
      c.vy = 20 + crand() * 80;
      c.rot = (crand() - 0.5) * 6;
      c.img.setVisible(true).setPosition(c.x, c.y).setAlpha(1).setScale(0.8 + crand() * 0.5);
    }
  };

  let kw = waveK(wave0);
  let shown = kw;
  return {
    setWave: (w) => (kw = waveK(w)),
    impact(x, _y, p) {
      // the fire ducks and gutters, ash puffs out of the mouth, then it flares back
      gut = Math.max(gut, 0.55 + p * 0.45);
      fireSq.v -= 6 * p;
      for (let i = 0; i < 4 + p * 10; i++) ash.spawn({ x: f.x + (crand() - 0.5) * 200, y: f.y - crand() * 10, vx: (crand() - 0.5) * 160, vy: -20 - crand() * 60, life: 1.4 + crand(), r0: 6, r1: 22 + crand() * 18, a: 0.35, tint: 0x8a8078, grav: 30, drag: 1.4, fade: 0.1 });
      for (const c of candles) c.s.v -= 5 * p;
      rack.kick((x < LG.antlers.x ? 1 : -1) * (0.9 + crand() * 0.3) * p + (crand() - 0.5) * 0.3 * p);
      // dust shaken off the rack and out from behind the shield
      for (let i = 0; i < 3 + p * 6; i++) ash.spawn({ x: LG.antlers.x + (crand() - 0.5) * 220, y: LG.antlers.y - 40 - crand() * 100, vx: (crand() - 0.5) * 40, vy: 10 + crand() * 30, life: 1.2 + crand(), r0: 4, r1: 16 + crand() * 10, a: 0.3, tint: 0x9a8a78, grav: 40, drag: 1.5, fade: 0.1 });
      skiS.kick((crand() < 0.5 ? -1 : 1) * 0.15 * p);
      for (let i = 0; i < 3 + p * 10; i++) soot.spawn({ x: LG.chim.x0 + 30 + crand() * (LG.chim.x1 - LG.chim.x0 - 60), y: LG.mantel.y + LG.mantel.h + crand() * 4, vx: (crand() - 0.5) * 16, vy: 20 + crand() * 30, life: 2 + crand() * 1.5, r0: 2.5 + crand() * 2, a: 0.6, tint: 0x3a3028, grav: 30, drag: 1.2, fade: 0.05 });
      shake(x, p);
    },
    update(dt, t) {
      shown += (kw - shown) * Math.min(1, dt * 0.6);
      // 0 alpenglow (wave 1) … dusk (2) … night (3) … 1 the blizzard (4)
      const duskK = clamp(shown / 0.33, 0, 1);
      const nightK = clamp((shown - 0.33) / 0.33, 0, 1);
      const storm = clamp((shown - 0.66) / 0.34, 0, 1);
      dusk.setAlpha(Phaser.Math.Easing.Sine.InOut(duskK));
      night.setAlpha(Phaser.Math.Easing.Sine.InOut(nightK));
      frostS.setAlpha(storm * 0.9);
      daylight.setAlpha(1 - duskK * 0.7 - nightK * 0.3);
      cool.setAlpha(duskK * 0.08 + nightK * 0.1 + storm * 0.06);
      // (the room darkens steadily from the second wave, the far end first)
      gloom.setAlpha(duskK * 0.4 + nightK * 0.4 + storm * 0.15);
      white.setAlpha(storm * (0.93 + Math.sin(t * 0.4) * 0.05));
      spill.setAlpha(nightK * (1 - storm * 0.3));

      // ——— the fire
      gut = Math.max(0, gut - dt * 0.9);
      // (it recovers with a flare: the flare peaks as the gutter clears)
      flare = gut > 0.05 ? Math.max(flare, 1 - gut) * (gut > 0.3 ? 0 : 1) : Math.max(0, flare - dt * 0.8);
      const g = Phaser.Math.Easing.Quadratic.Out(clamp(gut / 0.6, 0, 1));
      const sq = fireSq.step(0, dt);
      fire.alpha = 1 - g * 0.85;
      fire.step(dt, 1 + flare * 0.6);
      fire.each((im) => im.setScale(1 + flare * 0.12 - sq * 0.15, Math.max(0.2, 1 + flare * 0.3 + sq * 0.5 - g * 0.4)));
      gutter.alpha = g;
      gutter.step(dt);
      gutter.each((im) => im.setVisible(g > 0.01));
      const n = flicker(t, 1.7);
      const light = (1 - g * 0.55) * (1 + flare * 0.35) * (0.9 + n * 0.12);
      bed.setAlpha((0.42 + n * 0.12 + g * 0.2) * calm() + 0.1);
      hot.setAlpha(0.22 * light);
      // the fire matters more as the outside light goes
      const fireK = 1 + duskK * 0.3 + nightK * 0.7 + storm * 0.3;
      roomFire.setAlpha(0.11 * light * fireK);
      tableFire.setAlpha(0.08 * light * fireK);
      breastFire.setAlpha(0.13 * light * fireK);
      mouthGlow.setAlpha(0.3 * light);
      archGlow.setAlpha(0.1 * light * fireK);
      hearthGlow.setAlpha(0.2 * light * fireK);
      logGlow.setAlpha(clamp(0.55 + flicker(t * 0.6, 3) * 0.3 + g * 0.3, 0, 1));
      smoke.alpha = 0.8 - g * 0.4;
      smoke.step(dt, 1 + flare);
      dipWash.setAlpha(g * 0.12);
      sconceGlow.setAlpha((0.14 + nightK * 0.08) * (0.97 + flicker(t * 0.3, 7) * 0.03));
      emberRate.tick((2.5 + flare * 14 + storm * 1.5) * calm(), dt, () => {
        embers.spawn({ x: f.x + (crand() - 0.5) * 110, y: f.y - 60 - crand() * 30, vx: (crand() - 0.5) * 50, vy: -80 - crand() * 100, life: 1.4 + crand() * 1.2, r0: 5 + crand() * 3, r1: 1.5, a: 0.9, tint: crand() < 0.3 ? 0xffd070 : 0xff7a2a, grav: -20, drag: 0.6, streak: 0.01, fade: 0.1 });
      });
      if (flare > 0.6 && crand() < dt * 6) burst(6, 0.6);
      embers.update(dt);
      ash.update(dt);
      soot.update(dt);

      // ——— the candles: they duck on a stomp and recover, and burn a little taller in the dark
      for (const c of candles) {
        const d = c.s.step(0, dt);
        c.loop.step(dt);
        c.loop.each((im) => im.setScale(1 - d * 0.2, Math.max(0.3, 1 + d * 0.6 + nightK * 0.08)));
        c.halo.setAlpha((0.22 + flicker(t * 0.8, c.loop.a.x) * 0.06) * (0.8 + nightK * 0.5) * (1 + Math.min(0, d)));
      }
      rack.update(dt, t);
      skiS.update(dt, t);

      // ——— the snow: a few flakes in the alpenglow, a steady fall at dusk and nightfall, the blizzard
      const fall = 0.15 + duskK * 0.35 + nightK * 0.3 + storm * 0.2;
      const wind = 6 + duskK * 10 + storm * 230;
      far.setAlpha(clamp(fall * 1.2, 0, 0.85));
      mid.setAlpha(clamp((fall - 0.2) * 1.3, 0, 0.9));
      far.tilePositionY -= (26 + storm * 30) * dt * calm();
      far.tilePositionX -= (wind * 0.5 + Math.sin(t * 0.5) * 6) * dt * calm();
      mid.tilePositionY -= (48 + storm * 60) * dt * calm();
      mid.tilePositionX -= (wind * 0.8 + Math.sin(t * 0.7 + 1) * 10) * dt * calm();
      mid.tileScaleX = mid.tileScaleY = 1;
      veil.alpha = storm * (0.85 + Math.sin(t * 0.7) * 0.15);
      veil.step(dt, (0.8 + storm * 1.4) * calm());
      veil.each((im) => im.setVisible(storm > 0.02));
      veil2.alpha = storm * (0.6 + Math.sin(t * 1.1 + 2) * 0.25);
      veil2.step(dt, (1.2 + storm * 1.6) * calm());
      veil2.each((im) => im.setVisible(storm > 0.02));
      flakeRate.tick(fall * fall * 30 * calm(), dt, () => {
        const x = wb.x + crand() * (wb.w + wind * 0.8);
        flakes.spawn({ x, y: wb.y - 6, vx: -wind * (0.9 + crand() * 0.4) + Math.sin(t + x) * 20, vy: 50 + crand() * 50 + storm * 80, life: 4, r0: 8 + crand() * 7, a: 0.85, tint: 0xf4f8ff, floor: bankTop(Phaser.Math.Clamp(x, wb.x, wb.x + wb.w), level) - 2 + crand() * 6, spin: (crand() - 0.5) * 3, fade: 0.05 });
      });
      flakes.update(dt);
      powder.update(dt);
      // the drift builds through the stage
      level = 0.35 + shown * 0.65;
      deep.setAlpha(clamp((shown - 0.25) / 0.75, 0, 1));
      for (const c of clumps) {
        if (!c.live) continue;
        c.vy += 700 * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.img.setPosition(c.x, c.y).setRotation(c.img.rotation + c.rot * dt);
        // a trail of powder shed as it falls
        if (crand() < dt * 30) powder.spawn({ x: c.x + (crand() - 0.5) * 12, y: c.y - 6, vx: (crand() - 0.5) * 20, vy: c.vy * 0.3, life: 0.6 + crand() * 0.4, r0: 5, r1: 16, a: 0.4, tint: 0xf0f4ff, drag: 3, fade: 0.1 });
        // it bursts on the drift
        const floor = bankTop(c.x, level) - 4;
        if (c.y > floor) {
          for (let i = 0; i < 7; i++) powder.spawn({ x: c.x + (crand() - 0.5) * 16, y: floor, vx: (crand() - 0.5) * 120, vy: -30 - crand() * 70, life: 0.7 + crand() * 0.5, r0: 6, r1: 18 + crand() * 10, a: 0.6, tint: 0xf4f6ff, grav: 200, drag: 2.5, fade: 0.05 });
          c.live = false;
          c.img.setVisible(false);
        }
      }
    },
  };
});

void [grain, rgba, makeCanvas];
