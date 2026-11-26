// Rooftop Slice (Act 1, waves 6–9), redrawn with the location kit (src/art/scene): a table on a city roof at golden
// hour. The sun hangs low over the skyline on the left (the feet's key light), the far towers lost in warm haze, the
// neighbours' roofs backlit (a cedar water tower on the left, a chimney stack on the right); the brick parapet's coping
// gilded along its top, its face in cool shade; terracotta pots on the coping (a lemon tree, geraniums, an agave, a
// herb trough); festoon lights strung between two posts; a blue gingham cloth on the table.
// Live: thin cloud drifts, pigeons wheel past, the chimney smokes, the lemon tree stirs; across the stage's waves the
// golden hour burns to sunset, the city's windows and the festoon lights come on at dusk, and night falls with the
// moon and stars, a plane blinking over, the candle lit on the table.

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
  ellPath,
  glowAt,
  gradeAll,
  groundShadow,
  haze,
  lightPool,
  lineAt,
  polyPath,
  rectPath,
  rim,
  rrPath,
  solid,
  vfill,
  vignetteAll,
  within,
} from '../../art/scene/kit';
import type { SceneSpec } from '../../art/scene/layers';
import { groundCast } from '../../art/scene/light';
import { bricks, grain, tableFalloff, tableSeam, woodGrain } from '../../art/scene/materials';
import { chips, drift, grime, lay, noiseMask, streaks, surface } from '../../art/scene/paint';
import { bottle, candle, flameShape, glassPane } from '../../art/scene/props';
import { cirrus, cloud, horizonGlow, skyFill, stars, sun } from '../../art/scene/sky';
import { ao } from '../../art/style/kit';
import { mix, rgba, rng, shade } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { type KitLive, calm, flicker, lerp, registerKitScene, waveK, wander } from '../../game/sceneLive';
import { type Sett, bulb, foldedFront, frontX, leafMass, smokeFrame, swag, tartanCloth, wire } from './sceneBits';
import { Loop, Particles, Spring, sheet } from './liveBits';

// ——— layout ———

export const RT = {
  /** The parapet's coping (its top) and the face down to the table. */
  coping: 590,
  front: 1040,
  /** Where the sky stops (the lowest sky seen between the far towers). */
  skyEnd: 560,
  sun: { x: 410, y: 452, r: 34 },
  sunset: { x: 520, y: 548, r: 46 },
  moon: { x: 300, y: 150, r: 24 },
  posts: [40, 1880] as const,
  postTop: 96,
  tower: { x: 300, y: 436, w: 128 },
  chimney: { x: 1652, y: 404 },
  lemon: { x: 150, cx: 168, cy: 330 },
  geranium: { x: 492 },
  herbs: { x0: 1330, x1: 1520 },
  agave: { x: 1770 },
  candle: { x: 1760, y: 816 },
};

/** The golden-hour air over the city: warm haze. */
const CITY: Air = { color: '#e9c4a0', far: 0.78 };

// ——— the city (generated once, the same for the day and night layers) ———

export interface Block {
  x: number;
  w: number;
  top: number;
  kind: 'flat' | 'step' | 'dome' | 'spire' | 'tank';
  col: string;
}

export const FAR: Block[] = (() => {
  const r = rng(6061);
  const out: Block[] = [];
  let x = -30;
  while (x < W + 40) {
    const w = 60 + r() * 120;
    const mid = Math.abs(x + w / 2 - 960) < 380;
    // lower and hazier behind the lanes; the tall towers stand to the sides
    const top = mid ? 440 + r() * 60 : 340 + r() * 140;
    const k = r();
    const kind: Block['kind'] = mid ? (k < 0.3 ? 'tank' : 'flat') : k < 0.2 ? 'step' : k < 0.3 ? 'dome' : k < 0.36 ? 'spire' : k < 0.55 ? 'tank' : 'flat';
    out.push({ x, w, top, kind, col: ['#6a6684', '#5e6080', '#76708a', '#625a78'][Math.floor(r() * 4)] });
    x += w * (0.75 + r() * 0.35);
  }
  return out;
})();

/** A tower's silhouette (setbacks, a dome, a slender spire), as a path. */
export function blockPath(b: Block): PathFn {
  return (c) => {
    const { x, w, top } = b;
    const base = 620;
    c.beginPath();
    c.moveTo(x, base);
    if (b.kind === 'step') {
      c.lineTo(x, top + 60);
      c.lineTo(x + w * 0.14, top + 60);
      c.lineTo(x + w * 0.14, top + 26);
      c.lineTo(x + w * 0.3, top + 26);
      c.lineTo(x + w * 0.3, top);
      c.lineTo(x + w * 0.7, top);
      c.lineTo(x + w * 0.7, top + 26);
      c.lineTo(x + w * 0.86, top + 26);
      c.lineTo(x + w * 0.86, top + 60);
      c.lineTo(x + w, top + 60);
    } else if (b.kind === 'dome') {
      c.lineTo(x, top + 30);
      c.lineTo(x + w * 0.18, top + 30);
      c.bezierCurveTo(x + w * 0.2, top - w * 0.3, x + w * 0.8, top - w * 0.3, x + w * 0.82, top + 30);
      c.lineTo(x + w, top + 30);
    } else if (b.kind === 'spire') {
      // a deco crown and a needle, tapering smoothly (no facets)
      c.lineTo(x, top + 40);
      c.lineTo(x + w * 0.2, top + 40);
      c.quadraticCurveTo(x + w * 0.24, top + 4, x + w * 0.42, top - 6);
      c.quadraticCurveTo(x + w * 0.49, top - 50, x + w * 0.5, top - 120);
      c.quadraticCurveTo(x + w * 0.51, top - 50, x + w * 0.58, top - 6);
      c.quadraticCurveTo(x + w * 0.76, top + 4, x + w * 0.8, top + 40);
      c.lineTo(x + w, top + 40);
    } else if (b.kind === 'tank') {
      c.lineTo(x, top);
      c.lineTo(x + w * 0.55, top);
      // a little water tank on legs
      c.lineTo(x + w * 0.55, top - 10);
      c.lineTo(x + w * 0.6, top - 10);
      c.lineTo(x + w * 0.6, top - 30);
      c.quadraticCurveTo(x + w * 0.7, top - 44, x + w * 0.8, top - 30);
      c.lineTo(x + w * 0.8, top - 10);
      c.lineTo(x + w * 0.85, top - 10);
      c.lineTo(x + w * 0.85, top);
      c.lineTo(x + w, top);
    } else {
      c.lineTo(x, top);
      c.lineTo(x + w, top);
    }
    c.lineTo(x + w, base);
    c.closePath();
  };
}

/** Lit windows (seeded per block: the same windows light every night). */
export function windowsOf(b: Block, seed: number): [number, number, number, number, number][] {
  const r = rng(seed);
  const out: [number, number, number, number, number][] = [];
  const cw = 9;
  const ch = 12;
  for (let y = b.top + (b.kind === 'step' ? 70 : b.kind === 'spire' || b.kind === 'dome' ? 48 : 14); y < 600; y += ch + 7)
    for (let x = b.x + 8; x < b.x + b.w - 12; x += cw + 6) out.push([x, y, cw, ch, r()]);
  return out;
}

// ——— the sky ———

const SKY_BOX = { x: 0, y: 0, w: W, h: RT.skyEnd };

function sky(ctx: Ctx, r: R): void {
  // golden hour: a clear blue overhead warming through rose to the bright gold haze over the skyline
  skyFill(ctx, { x: 0, y: 0, w: W, h: RT.skyEnd + 30 }, [[0, '#33528c'], [0.32, '#6a88ba'], [0.6, '#c9b0a8'], [0.8, '#f2c286'], [1, '#ffd89c']]);
  lay(ctx, drift('#ffe4b8', '#4a64a0', 3, 61, 160, 48), SKY_BOX, 0.16);
  glowAt(ctx, RT.sun.x, RT.sun.y + 20, 1100, '#ffb060', 0.3, 0.55);
  cirrus(ctx, r, { x: 0, y: 60, w: W, h: 160 }, '#ffeede', 0.16, -0.04, 18);
  horizonGlow(ctx, RT.skyEnd + 20, 160, '#ffd8a0', 0.55);
  sun(ctx, RT.sun.x, RT.sun.y, RT.sun.r, { disc: '#fffaf0', glow: '#ffc070', a: 0.9, bloom: 12, squash: 0.7 });
}

function sunsetSky(ctx: Ctx, r: R): void {
  skyFill(ctx, { x: 0, y: 0, w: W, h: RT.skyEnd + 4 }, [[0, '#262760'], [0.3, '#5e3d7c'], [0.58, '#c4566c'], [0.8, '#f4874e'], [1, '#ffb862']]);
  lay(ctx, drift('#ffb080', '#3a2a6a', 3, 63, 160, 48), SKY_BOX, 0.2);
  glowAt(ctx, RT.sunset.x, RT.skyEnd, 1100, '#ff8a4a', 0.32, 0.4);
  for (let i = 0; i < 6; i++) {
    const x = 120 + r() * 1700;
    const y = 220 + r() * 200;
    cloud(ctx, r, x, y, 280 + r() * 380, 22 + r() * 16, { kind: 'stratus', lit: '#ffb27a', body: '#9a5a7e', shadow: '#5a3a6a', sunX: RT.sunset.x, sunY: RT.skyEnd + 60, rim: 0.7, wisp: 0.55, a: 0.8 });
  }
  horizonGlow(ctx, RT.skyEnd + 10, 180, '#ffb070', 0.6);
  sun(ctx, RT.sunset.x, RT.sunset.y, RT.sunset.r, { disc: '#fff0c0', glow: '#ff9a4a', a: 0.8, bloom: 9, squash: 0.45 });
}

function nightSky(ctx: Ctx, r: R): void {
  skyFill(ctx, { x: 0, y: 0, w: W, h: RT.skyEnd + 4 }, [[0, '#070a20'], [0.45, '#141a42'], [0.78, '#2e2a58'], [1, '#5a3a5c']]);
  lay(ctx, drift('#3a3a7a', '#04061a', 3, 65, 160, 48), SKY_BOX, 0.22);
  stars(ctx, r, { x: 0, y: 0, w: W, h: 380 }, 200);
  // the city's glow on the haze low over the roofs
  horizonGlow(ctx, RT.skyEnd + 10, 200, '#c46a5a', 0.4);
  // the moon, high on the left (the night's key light comes from the same side as the day's)
  glowAt(ctx, RT.moon.x, RT.moon.y, 220, '#9ab0ff', 0.18);
  glowAt(ctx, RT.moon.x, RT.moon.y, 70, '#e0e8ff', 0.25);
  ctx.save();
  const g = ctx.createRadialGradient(RT.moon.x - 8, RT.moon.y - 8, 2, RT.moon.x, RT.moon.y, RT.moon.r);
  g.addColorStop(0, '#fffdf2');
  g.addColorStop(0.8, '#ece6d4');
  g.addColorStop(1, '#c8c4b8');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(RT.moon.x, RT.moon.y, RT.moon.r, 0, Math.PI * 2);
  ctx.fill();
  // maria, soft
  ctx.fillStyle = 'rgba(150,150,140,0.28)';
  for (const [dx, dy, s] of [[-6, -4, 7], [6, 5, 6], [-2, 9, 4], [8, -8, 3]] as const) {
    ctx.beginPath();
    ctx.arc(RT.moon.x + dx, RT.moon.y + dy, s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // a few slate bars of cloud under the moon, lit on top
  for (let i = 0; i < 4; i++) cloud(ctx, r, 300 + r() * 1400, 260 + r() * 160, 300 + r() * 300, 18 + r() * 12, { kind: 'stratus', lit: '#8a8ab8', body: '#2e2e58', shadow: '#16163a', sunX: RT.moon.x, sunY: RT.moon.y, rim: 0.5, wisp: 0.6, a: 0.7 });
}

function clouds(ctx: Ctx, r: R): void {
  // thin drifts of altostratus, gilded underneath by the low sun: long, soft, never heaped
  const o = { lit: '#fff0d0', body: '#e0c4c0', shadow: '#9890b0', sunX: RT.sun.x, sunY: RT.sun.y + 60, depth: 0.5, air: CITY, rim: 0.7, wisp: 0.85, a: 0.55 };
  cloud(ctx, r, 1180, 250, 520, 40, { ...o, kind: 'stratus' });
  cloud(ctx, r, 1560, 196, 380, 30, { ...o, kind: 'stratus', depth: 0.6 });
  cloud(ctx, r, 820, 318, 360, 24, { ...o, kind: 'stratus', depth: 0.7 });
  cloud(ctx, r, 260, 230, 300, 22, { ...o, kind: 'stratus', depth: 0.6 });
}

// ——— the city ———

function far(ctx: Ctx, r: R): void {
  for (const b of FAR) {
    const p = blockPath(b);
    // the furthest (lower, behind the lanes) deepest in the haze; the tall ones nearer and firmer
    const depth = b.top > 430 ? 0.86 : 0.66;
    const col = airMix(b.col, depth, CITY);
    within(ctx, p, () => {
      surface(ctx, r, { x: b.x - 4, y: b.top - 130, w: b.w + 8, h: 760 - b.top }, col, { vary: 0.35, cells: 2, mottle: 0.3, strokes: 0.5, strokeAng: Math.PI / 2, strokeLen: 60, strokeW: 8, grain: 0.06, seed: Math.round(b.x) });
      // the windows by day: a grid of darker glass; the ones turned to the sun flash gold
      for (const [x, y, w, h, v] of windowsOf(b, Math.round(b.x * 7))) {
        ctx.fillStyle = rgba(shade(col, -0.18 - v * 0.08), 0.55);
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = rgba(shade(col, 0.15), 0.35);
        ctx.fillRect(x, y + h, w, 1.2);
        if (b.x > RT.sun.x + 200 && v > 0.9) {
          ctx.fillStyle = rgba('#ffe4a8', 0.4 + (v - 0.9) * 5);
          ctx.fillRect(x, y, w, h * 0.6);
        }
      }
      // the light: the sun low behind on the left; the faces to it gilded, the faces to us cool and in shade
      const lit = b.x + b.w / 2 > RT.sun.x;
      const fg = ctx.createLinearGradient(b.x, 0, b.x + b.w, 0);
      fg.addColorStop(0, lit ? rgba('#ffcf8a', 0.5) : 'rgba(60,50,90,0.1)');
      fg.addColorStop(lit ? 0.12 : 0.85, lit ? rgba('#ffcf8a', 0.05) : 'rgba(60,50,90,0.1)');
      fg.addColorStop(1, lit ? 'rgba(60,50,90,0.22)' : rgba('#ffcf8a', 0.45));
      ctx.fillStyle = fg;
      ctx.fillRect(b.x - 2, b.top - 130, b.w + 4, 760);
      // the roof line catches the sky
      ctx.fillStyle = rgba('#ffe2b8', 0.4);
      ctx.fillRect(b.x, b.top, b.w, 2);
      vfill(ctx, b.x, b.top, b.w, 120, [[0, 'rgba(255,220,170,0.12)'], [1, 'rgba(255,220,170,0)']]);
    });
  }
  // the low sun burning through the haze over the towers near it (plain alpha: the air itself lit)
  const g = ctx.createRadialGradient(RT.sun.x, RT.sun.y, 10, RT.sun.x, RT.sun.y, 460);
  g.addColorStop(0, rgba('#fff0c8', 0.6));
  g.addColorStop(0.3, rgba('#ffd090', 0.24));
  g.addColorStop(1, rgba('#ffc080', 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 280, 960, 340);
  haze(ctx, 500, 610, '#f2c898', 0.42, 0.8);
}

const L_BLOCK = { x0: -20, x1: 560, top: 470 };
const R_BLOCK = { x0: 1390, x1: 1940, top: 486 };

function mid(ctx: Ctx, r: R): void {
  const AIR = 0.42;
  // two neighbours' upper floors, backlit: their faces in cool shade, the roof edges gilded
  for (const [b, col] of [[L_BLOCK, '#7a4e44'], [R_BLOCK, '#6a5a5e']] as const) {
    const p = rectPath(b.x0, b.top, b.x1 - b.x0, 620 - b.top);
    const c = airMix(col, AIR, CITY);
    ctx.save();
    p(ctx);
    ctx.clip();
    bricks(ctx, r, { x: b.x0, y: b.top, w: b.x1 - b.x0, h: 620 - b.top }, [c, shade(c, 0.05), shade(c, -0.05), shade(c, 0.08)], shade(c, 0.12), 36, 14);
    // in shade (the sun is behind them), a little warm sky bounce up top
    vfill(ctx, b.x0, b.top, b.x1 - b.x0, 160, [[0, 'rgba(30,24,50,0.25)'], [1, 'rgba(30,24,50,0.45)']]);
    // windows: dark glass with the sky's gold in their upper panes
    for (let wx = b.x0 + 40; wx < b.x1 - 60; wx += 96) {
      const wy = b.top + 44;
      ctx.fillStyle = '#2a2436';
      ctx.fillRect(wx, wy, 46, 70);
      const gg = ctx.createLinearGradient(0, wy, 0, wy + 70);
      gg.addColorStop(0, rgba('#ffc890', 0.5));
      gg.addColorStop(0.5, rgba('#a88aa0', 0.18));
      gg.addColorStop(1, rgba('#2a2436', 0));
      ctx.fillStyle = gg;
      ctx.fillRect(wx, wy, 46, 70);
      ctx.fillStyle = rgba('#1a1420', 0.7);
      ctx.fillRect(wx + 21, wy, 3, 70);
      ctx.fillRect(wx, wy + 33, 46, 3);
      ctx.fillStyle = rgba(shade(c, 0.25), 0.9);
      ctx.fillRect(wx - 5, wy + 70, 56, 6);
      crevice(ctx, wx - 5, wx + 51, wy + 76, 10, 0.3);
    }
    ctx.restore();
    // the cornice: a stone band, its top lit by the sun skimming over
    const cp = rectPath(b.x0, b.top - 14, b.x1 - b.x0, 16);
    solid(ctx, cp, { x: b.x0, y: b.top - 14, w: b.x1 - b.x0, h: 16 }, 'stone', airMix('#b8a894', AIR, CITY), { depth: AIR, air: CITY, formSize: 5 });
    ctx.fillStyle = rgba('#ffd8a0', 0.7);
    ctx.fillRect(b.x0, b.top - 14, b.x1 - b.x0, 2.5);
    crevice(ctx, b.x0, b.x1, b.top + 2, 14, 0.45);
  }
  waterTower(ctx, r);
  chimney(ctx, r);
  // the air between us and them
  haze(ctx, 440, 600, '#e8c4a4', 0.22, 0.8);
}

function waterTower(ctx: Ctx, r: R): void {
  const { x, y, w } = RT.tower;
  const AIR = 0.38;
  const tankTop = y - 150;
  const tankBot = y - 46;
  const steel = airMix('#3a3438', AIR, CITY);
  // the stand: four legs with cross-bracing
  ctx.strokeStyle = steel;
  ctx.lineCap = 'butt';
  for (const lx of [x - w * 0.42, x - w * 0.14, x + w * 0.14, x + w * 0.42]) {
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(lx, tankBot);
    ctx.lineTo(lx + (lx - x) * 0.12, y + 34);
    ctx.stroke();
  }
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const [a, b] of [[-0.42, -0.14], [-0.14, 0.14], [0.14, 0.42]] as const) {
    ctx.moveTo(x + w * a, tankBot + 4);
    ctx.lineTo(x + w * b * 1.06, y + 30);
    ctx.moveTo(x + w * b, tankBot + 4);
    ctx.lineTo(x + w * a * 1.06, y + 30);
  }
  ctx.stroke();
  ctx.fillStyle = shade(steel, -0.2);
  ctx.fillRect(x - w * 0.5, tankBot - 2, w, 8);
  // the tank: cedar staves bound with steel hoops, round: the sun on its left flank, the right turning into shade
  const tank = rrPath(x - w / 2, tankTop, w, tankBot - tankTop, 4);
  const cedar = airMix('#8a5a3a', AIR, CITY);
  solid(ctx, tank, { x: x - w / 2, y: tankTop, w, h: tankBot - tankTop }, 'wood', cedar, { depth: AIR, air: CITY, formSize: 40, line: lineAt(AIR) * 0.8 });
  within(ctx, tank, () => {
    for (let i = 1; i < 14; i++) {
      const u = i / 14;
      const sx = x - w / 2 + w * (0.5 - Math.cos(u * Math.PI) * 0.5);
      ctx.fillStyle = rgba('#2a160c', 0.32);
      ctx.fillRect(sx, tankTop, 1.4, tankBot - tankTop);
    }
    woodGrain(ctx, r, { x: x - w / 2, y: tankTop, w, h: tankBot - tankTop }, cedar, true, 0.5);
    const cg = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    cg.addColorStop(0, rgba('#ffcf8a', 0.5));
    cg.addColorStop(0.3, rgba('#ffcf8a', 0.08));
    cg.addColorStop(0.65, 'rgba(30,20,40,0.12)');
    cg.addColorStop(1, 'rgba(30,20,40,0.5)');
    ctx.fillStyle = cg;
    ctx.fillRect(x - w / 2, tankTop, w, tankBot - tankTop);
    for (const hy of [tankTop + 18, tankTop + 46, tankTop + 74, tankBot - 10]) {
      ctx.fillStyle = rgba(steel, 0.9);
      ctx.fillRect(x - w / 2, hy, w, 3);
      ctx.fillStyle = rgba('#ffd8a0', 0.35);
      ctx.fillRect(x - w / 2, hy, w * 0.3, 1);
    }
    streaks(ctx, r, x - w / 2, tankTop + 6, w, 70, '#2a160c', 0.18, 10);
  });
  // the conical roof with its finial
  const roof = polyPath([[x - w / 2 - 6, tankTop + 2], [x, tankTop - 52], [x + w / 2 + 6, tankTop + 2]]);
  ctx.save();
  roof(ctx);
  const rg = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  rg.addColorStop(0, airMix('#a07050', AIR, CITY));
  rg.addColorStop(0.5, airMix('#6a4632', AIR, CITY));
  rg.addColorStop(1, airMix('#3a2a2a', AIR, CITY));
  ctx.fillStyle = rg;
  ctx.fill();
  ctx.clip();
  for (let k = -8; k <= 8; k++) {
    ctx.strokeStyle = rgba('#1a0e08', 0.25);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, tankTop - 52);
    ctx.lineTo(x + k * 9, tankTop + 2);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = inkOfAir('#3a2418', AIR);
  ctx.lineWidth = lineAt(AIR) * 0.8;
  roof(ctx);
  ctx.stroke();
  ctx.fillStyle = steel;
  ctx.fillRect(x - 2, tankTop - 70, 4, 20);
  ctx.beginPath();
  ctx.arc(x, tankTop - 70, 4, 0, Math.PI * 2);
  ctx.fill();
  // its ladder
  ctx.strokeStyle = rgba(steel, 0.9);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.3, tankTop + 6);
  ctx.lineTo(x + w * 0.3, y + 34);
  ctx.moveTo(x + w * 0.38, tankTop + 6);
  ctx.lineTo(x + w * 0.38, y + 34);
  for (let ly = tankTop + 14; ly < y + 34; ly += 9) {
    ctx.moveTo(x + w * 0.3, ly);
    ctx.lineTo(x + w * 0.38, ly);
  }
  ctx.stroke();
}

const inkOfAir = (c: string, depth: number) => airMix(shade(c, -0.5), depth, CITY);

function chimney(ctx: Ctx, r: R): void {
  const { x, y } = RT.chimney;
  const AIR = 0.4;
  const w = 96;
  const stack = rectPath(x - w / 2, y, w, R_BLOCK.top - y);
  const c = airMix('#8a4a38', AIR, CITY);
  ctx.save();
  stack(ctx);
  ctx.clip();
  bricks(ctx, r, { x: x - w / 2, y, w, h: R_BLOCK.top - y }, [c, shade(c, 0.06), shade(c, -0.06)], shade(c, 0.15), 24, 10);
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  g.addColorStop(0, rgba('#ffc888', 0.4));
  g.addColorStop(0.25, rgba('#ffc888', 0));
  g.addColorStop(0.7, 'rgba(30,20,40,0.15)');
  g.addColorStop(1, 'rgba(30,20,40,0.5)');
  ctx.fillStyle = g;
  ctx.fillRect(x - w / 2, y, w, R_BLOCK.top - y);
  // soot round the top where the smoke curls over
  vfill(ctx, x - w / 2, y, w, 40, [[0, 'rgba(20,14,14,0.55)'], [1, 'rgba(20,14,14,0)']]);
  ctx.restore();
  ctx.strokeStyle = inkOfAir('#5a2a1a', AIR);
  ctx.lineWidth = lineAt(AIR) * 0.8;
  stack(ctx);
  ctx.stroke();
  const cap = rectPath(x - w / 2 - 6, y - 8, w + 12, 10);
  solid(ctx, cap, { x: x - w / 2 - 6, y: y - 8, w: w + 12, h: 10 }, 'stone', airMix('#b0a090', AIR, CITY), { depth: AIR, air: CITY, formSize: 4 });
  // three terracotta pots
  for (const [px, ph] of [[-28, 34], [0, 42], [28, 30]] as const) {
    const pot = polyPath([[x + px - 10, y - 8], [x + px - 7, y - 8 - ph], [x + px + 7, y - 8 - ph], [x + px + 10, y - 8]]);
    solid(ctx, pot, { x: x + px - 10, y: y - 8 - ph, w: 20, h: ph }, 'stone', airMix('#c06a40', AIR, CITY), { depth: AIR, air: CITY, formSize: 6 });
    ctx.fillStyle = rgba('#1a0e0a', 0.8);
    ctx.beginPath();
    ctx.ellipse(x + px, y - 8 - ph, 7, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The city's windows lit at dusk (live only: fades in over the day). */
function cityLights(ctx: Ctx): void {
  const warm = ['#ffd27a', '#ffc060', '#fff0b8', '#a8d0ff'];
  // the far city by night, over the day's (the neighbours' roofs, nearer, stay out of it)
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, CITY_BOX.y, W, CITY_BOX.h);
  ctx.rect(L_BLOCK.x0, L_BLOCK.top - 16, L_BLOCK.x1 - L_BLOCK.x0, 400);
  ctx.rect(R_BLOCK.x0, R_BLOCK.top - 16, R_BLOCK.x1 - R_BLOCK.x0, 400);
  ctx.rect(RT.tower.x - 76, RT.tower.y - 228, 152, 230);
  ctx.rect(RT.chimney.x - 56, RT.chimney.y - 56, 112, 90);
  ctx.clip('evenodd');
  const sg = ctx.createLinearGradient(0, 0, 0, RT.skyEnd + 4);
  for (const [t, c] of [[0, '#070a20'], [0.45, '#141a42'], [0.78, '#2e2a58'], [1, '#5a3a5c']] as const) sg.addColorStop(t, c);
  ctx.fillStyle = sg;
  ctx.fillRect(0, CITY_BOX.y, W, CITY_BOX.h);
  horizonGlow(ctx, RT.skyEnd + 10, 200, '#c46a5a', 0.4);
  for (const b of FAR) {
    blockPath(b)(ctx);
    const depth = b.top > 430 ? 0.86 : 0.66;
    ctx.fillStyle = mix(shade(b.col, -0.55), '#3a3260', depth * 0.5);
    ctx.fill();
  }
  haze(ctx, 500, 610, '#6a4a6a', 0.35, 0.8);
  for (const b of FAR) {
    const p = blockPath(b);
    within(ctx, p, () => {
      for (const [x, y, w, h, v] of windowsOf(b, Math.round(b.x * 7))) {
        if (v > 0.38) continue;
        ctx.fillStyle = rgba(warm[Math.floor(v * 10) % 4], 0.55 + v);
        ctx.fillRect(x, y, w, h);
      }
    });
  }
  ctx.restore();
  for (const b of [L_BLOCK, R_BLOCK]) {
    let i = 0;
    for (let wx = b.x0 + 40; wx < b.x1 - 60; wx += 96, i++) {
      if ((i * 5 + b.x0) % 3 === 0) continue;
      const wy = b.top + 44;
      const g = ctx.createLinearGradient(0, wy, 0, wy + 70);
      g.addColorStop(0, '#ffe2a0');
      g.addColorStop(1, '#ffb860');
      ctx.fillStyle = g;
      ctx.fillRect(wx, wy, 46, 70);
      ctx.fillStyle = rgba('#3a2010', 0.8);
      ctx.fillRect(wx + 21, wy, 3, 70);
      ctx.fillRect(wx, wy + 33, 46, 3);
      glowAt(ctx, wx + 23, wy + 35, 60, '#ffb860', 0.25);
    }
  }
  // the spire's warning light and the dome lit from below
  for (const b of FAR) {
    if (b.kind === 'spire') glowAt(ctx, b.x + b.w * 0.5, b.top - 120, 10, '#ff4a3a', 0.8);
    if (b.kind === 'dome') lightPool(ctx, b.x + b.w / 2, b.top + 20, b.w * 0.4, 30, '#ffe0b0', 0.3, 'source-over');
  }
}

// ——— the parapet ———

const PAR_FACE = RT.coping + 20;

function parapet(ctx: Ctx, r: R): void {
  const box = { x: 0, y: PAR_FACE, w: W, h: TY - PAR_FACE + 4 };
  // old London stock brick, face in the shade of the low sun behind it
  bricks(ctx, r, box, ['#9a5a44', '#a6654a', '#8c4e3c', '#b0704e', '#93584a', '#7e4838', '#a86a50'], '#b8a48a', 62, 24);
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  // backlit: the face falls into a cool shade, the sky's blue in it; a warm bounce off the roof near its foot
  vfill(ctx, 0, PAR_FACE, W, TY - PAR_FACE, [[0, 'rgba(40,30,70,0.42)'], [0.6, 'rgba(40,30,70,0.26)'], [1, 'rgba(60,30,30,0.2)']]);
  lay(ctx, drift('#ffb890', '#2a2050', 4, 71, 200, 30), box, 0.18);
  // a century of weather: rain stains run down from each coping joint, salts blooming white low on the wall
  for (let x = 60; x < W; x += 124) streaks(ctx, r, x - 10, PAR_FACE, 24, 60 + r() * 60, '#2a1810', 0.16, 4);
  lay(ctx, noiseMask(10, 73, { cover: 0.22, soft: 0.12, col: '#e8e0d0', w: 320, h: 40 }), { x: 0, y: TY - 70, w: W, h: 70 }, 0.1);
  // moss in the mortar where the damp sits at the foot
  lay(ctx, noiseMask(14, 75, { cover: 0.3, soft: 0.08, col: '#4a5a2a', w: 320, h: 30 }), { x: 0, y: TY - 34, w: W, h: 34 }, 0.4);
  grime(ctx, box, { bottom: 60, left: 80, right: 80, a: 0.35, patchy: 0.5, seed: 77, col: '#1a1010' });
  ctx.restore();
  // the coping overhang's shadow on the face
  crevice(ctx, 0, W, PAR_FACE, 34, 0.55, '#140c18');
  // the coping: limestone slabs; their tops in the sun, their fronts in shade, joints, a chip here and there
  for (let x = -30; x < W; x += 124) {
    const top = polyPath([[x, RT.coping + 1], [x + 122, RT.coping + 1], [x + 124, RT.coping + 8], [x - 2, RT.coping + 8]]);
    const face = rectPath(x - 2, RT.coping + 8, 126, 12);
    const stone = shade('#d2c2a6', (r() - 0.5) * 0.08);
    solid(ctx, face, { x: x - 2, y: RT.coping + 8, w: 126, h: 12 }, 'stone', shade(stone, -0.22), { depth: 0.2, line: false, formSize: 4 });
    ctx.fillStyle = mix(stone, '#ffd8a0', 0.35);
    top(ctx);
    ctx.fill();
    grain(ctx, { x: x - 2, y: RT.coping, w: 126, h: 20 }, 'stone', 0.1, 1.6);
    ctx.fillStyle = 'rgba(30,20,20,0.6)';
    ctx.fillRect(x + 122, RT.coping + 1, 2, 19);
  }
  ctx.fillStyle = rgba('#fff2d8', 0.6);
  ctx.fillRect(0, RT.coping, W, 1.5);
  ctx.strokeStyle = 'rgba(30,18,14,0.75)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, RT.coping);
  ctx.lineTo(W, RT.coping);
  ctx.moveTo(0, PAR_FACE);
  ctx.lineTo(W, PAR_FACE);
  ctx.stroke();
  chips(ctx, r, 0, W, RT.coping + 9, 26, '#c8b89c', 3);
  // a cast-iron rain scupper, its rust run down the brick
  const sx = 1250;
  streaks(ctx, r, sx - 14, PAR_FACE + 34, 28, 90, '#7a3a18', 0.35, 6);
  const sp = rrPath(sx - 22, PAR_FACE + 16, 44, 22, 4);
  castShadow(ctx, sp, 8, 6, 0.4);
  solid(ctx, sp, { x: sx - 22, y: PAR_FACE + 16, w: 44, h: 22 }, 'iron', '#3a3432', { depth: 0.2, formSize: 5 });
  ctx.fillStyle = '#120c0c';
  ctx.beginPath();
  ctx.ellipse(sx, PAR_FACE + 30, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // the table's back edge throws the parapet's foot into shade
  crevice(ctx, 0, W, TY, -60, 0.4);
}

// ——— pots and plants ———

/** A terracotta pot standing on the coping, its shadow laid along it away from the low sun. */
function pot(ctx: Ctx, r: R, x: number, topW: number, botW: number, h: number, col = '#c4673e'): PathFn {
  const y = RT.coping + 4;
  const body = polyPath([[x - botW / 2, y], [x - topW / 2 + 4, y - h + 12], [x + topW / 2 - 4, y - h + 12], [x + botW / 2, y]]);
  // a long low shadow thrown right along the coping
  groundCast(ctx, rectPath(x - botW / 2, y - h, botW, h), y, 0.9, 0.06, 0.4, 5, '#3a2030');
  ao(ctx, x, y, botW * 0.6, 4, 0.5);
  solid(ctx, body, { x: x - topW / 2, y: y - h, w: topW, h }, 'stone', col, { depth: 0.18, formSize: Math.max(8, topW * 0.2) });
  within(ctx, body, () => {
    // salts and damp on old terracotta
    lay(ctx, noiseMask(5, Math.round(x), { cover: 0.3, soft: 0.2, col: '#efe6d8' }), { x: x - topW / 2, y: y - h, w: topW, h }, 0.25);
    const g = ctx.createLinearGradient(x - topW / 2, 0, x + topW / 2, 0);
    g.addColorStop(0, rgba('#ffd8a0', 0.35));
    g.addColorStop(0.35, rgba('#ffd8a0', 0));
    g.addColorStop(1, 'rgba(40,20,50,0.35)');
    ctx.fillStyle = g;
    ctx.fillRect(x - topW / 2, y - h, topW, h);
  });
  const lip = rrPath(x - topW / 2, y - h, topW, 14, 3);
  solid(ctx, lip, { x: x - topW / 2, y: y - h, w: topW, h: 14 }, 'stone', shade(col, 0.06), { depth: 0.18, formSize: 4 });
  ctx.fillStyle = rgba('#fff0d0', 0.4);
  ctx.fillRect(x - topW / 2 + 3, y - h + 1, topW * 0.4, 1.5);
  ctx.fillStyle = '#2a1810';
  ctx.beginPath();
  ctx.ellipse(x, y - h + 2, topW / 2 - 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  void r;
  return body;
}

const LEAF = { dark: '#1e3a1c', mid: '#3e6a2a', lit: '#a8b860', rim: '#9ab0d8', rimA: 0.35 };

function potsL(ctx: Ctx, r: R): void {
  // the lemon tree's pot and trunk (its crown is a layer of its own: it stirs in the breeze)
  const L = RT.lemon;
  pot(ctx, r, L.x, 112, 84, 96);
  ctx.strokeStyle = '#4a3424';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(L.x, RT.coping - 88);
  ctx.quadraticCurveTo(L.x + 6, L.cy + 90, L.cx, L.cy + 30);
  ctx.stroke();
  ctx.strokeStyle = rgba('#d8a878', 0.5);
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(L.x - 3, RT.coping - 88);
  ctx.quadraticCurveTo(L.x + 3, L.cy + 90, L.cx - 3, L.cy + 30);
  ctx.stroke();
  // geraniums in a wide bowl
  const G = RT.geranium;
  pot(ctx, r, G.x, 120, 92, 58, '#b85a36');
  leafMass(ctx, r, [[G.x - 38, RT.coping - 66, 30], [G.x + 6, RT.coping - 80, 34], [G.x + 44, RT.coping - 64, 28], [G.x - 10, RT.coping - 58, 30]], { ...LEAF, mid: '#4a7a30', size: 13, shape: 'round', density: 1.2 });
  for (const [fx, fy] of [[G.x - 40, RT.coping - 100], [G.x + 8, RT.coping - 118], [G.x + 46, RT.coping - 96], [G.x - 6, RT.coping - 84]] as const)
    leafMass(ctx, r, [[fx, fy, 15]], { dark: '#8a1426', mid: '#d8283a', lit: '#ff8a8a', size: 5, shape: 'round', density: 1.4, body: false });
}

function potsR(ctx: Ctx, r: R): void {
  // the herb trough: a weathered wooden box of basil and rosemary
  const { x0, x1 } = RT.herbs;
  const by = RT.coping + 4;
  const box = rectPath(x0, by - 50, x1 - x0, 50);
  groundCast(ctx, box, by, 0.7, 0.05, 0.35, 5, '#3a2030');
  solid(ctx, box, { x: x0, y: by - 50, w: x1 - x0, h: 50 }, 'wood', '#8a7a62', { depth: 0.18, formSize: 10 });
  within(ctx, box, () => {
    woodGrain(ctx, r, { x: x0, y: by - 50, w: x1 - x0, h: 50 }, '#8a7a62', false, 0.7);
    ctx.fillStyle = 'rgba(30,20,10,0.4)';
    ctx.fillRect(x0, by - 26, x1 - x0, 2);
  });
  leafMass(ctx, r, [[x0 + 30, by - 70, 26], [x0 + 76, by - 76, 30], [x0 + 128, by - 72, 28], [x1 - 26, by - 68, 24]], { ...LEAF, mid: '#4e8a30', lit: '#b8d070', size: 11, density: 1.3 });
  for (let i = 0; i < 18; i++) {
    // rosemary sprigs standing up out of it
    const sx = x0 + 100 + r() * 70;
    ctx.strokeStyle = mix('#3a5a3a', '#9ab88a', r());
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx, by - 60);
    ctx.quadraticCurveTo(sx + (r() - 0.5) * 10, by - 90, sx + (r() - 0.5) * 16, by - 110 - r() * 20);
    ctx.stroke();
  }
  // the agave: thick blue leaves, lit on top, a spine at each tip
  const A = RT.agave;
  pot(ctx, r, A.x, 96, 72, 74, '#b4603a');
  const cy = RT.coping - 80;
  const leaves = [-2.7, -2.25, -1.9, -1.57, -1.25, -0.9, -0.45].map((a) => a + (r() - 0.5) * 0.1);
  for (const a of leaves) {
    const len = 80 + r() * 30;
    const ex = A.x + Math.cos(a) * len;
    const ey = cy + Math.sin(a) * len * 0.9 + 18;
    const nx = -Math.sin(a) * 13;
    const ny = Math.cos(a) * 13;
    const lf = (c: Ctx) => {
      c.beginPath();
      c.moveTo(A.x - nx, cy + 6 - ny * 0.3);
      c.quadraticCurveTo((A.x + ex) / 2 - nx, (cy + ey) / 2 - ny, ex, ey);
      c.quadraticCurveTo((A.x + ex) / 2 + nx, (cy + ey) / 2 + ny, A.x + nx, cy + 6 + ny * 0.3);
      c.closePath();
    };
    solid(ctx, lf, { x: Math.min(A.x, ex) - 14, y: Math.min(cy, ey) - 14, w: Math.abs(ex - A.x) + 28, h: Math.abs(ey - cy) + 28 }, 'plastic', mix('#6a9a96', '#88aaa0', r()), { depth: 0.18, line: 1.4, formSize: 8, spec: false });
    ctx.strokeStyle = '#3a2418';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex + Math.cos(a) * 7, ey + Math.sin(a) * 7);
    ctx.stroke();
  }
}

function lemonCrown(ctx: Ctx, r: R): void {
  const { cx, cy } = RT.lemon;
  const blobs: [number, number, number][] = [[cx - 44, cy + 10, 50], [cx + 30, cy - 4, 56], [cx - 6, cy - 46, 52], [cx + 54, cy + 36, 40], [cx - 60, cy + 46, 36], [cx + 6, cy + 30, 50]];
  leafMass(ctx, r, blobs, { ...LEAF, size: 15, density: 1.15, toLight: [RT.sun.x - cx, RT.sun.y - cy] });
  // the lemons, ripe among the leaves: lit on the sun's side
  for (let i = 0; i < 11; i++) {
    const [bx, by, rad] = blobs[i % blobs.length];
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * rad * 0.8;
    const lx = bx + Math.cos(a) * d;
    const ly = by + Math.sin(a) * d;
    const lemon = ellPath(lx, ly, 9, 7, 0.3);
    solid(ctx, lemon, { x: lx - 9, y: ly - 7, w: 18, h: 14 }, 'plastic', '#f0c828', { depth: 0.15, line: 1.2, formSize: 4 });
  }
}

// ——— posts and lights ———

const SWAGS: [number, number, number, number, number][] = [
  [RT.posts[0], RT.postTop + 14, RT.posts[1], RT.postTop + 14, 120],
  [RT.posts[0], RT.postTop + 64, RT.posts[1], RT.postTop + 64, 70],
];
export const BULBS: [number, number][] = SWAGS.flatMap(([x0, y0, x1, y1, sag], i) => swag(x0 + 30, y0, x1 - 30, y1, sag, i ? 22 : 26));

function post(ctx: Ctx, r: R, px: number): void {
  {
    const p = rectPath(px - 13, RT.postTop, 26, TY - RT.postTop);
    castShadow(ctx, p, 10, 10, 0.4);
    solid(ctx, p, { x: px - 13, y: RT.postTop, w: 26, h: TY - RT.postTop }, 'wood', '#6a5040', { depth: 0.12, formSize: 8 });
    within(ctx, p, () => woodGrain(ctx, r, { x: px - 13, y: RT.postTop, w: 26, h: TY - RT.postTop }, '#6a5040', true, 0.8));
    rim(ctx, p, 0.35, 2);
    // a galvanised bracket strapping it to the parapet
    const br = rectPath(px - 16, RT.coping + 22, 32, 30);
    solid(ctx, br, { x: px - 16, y: RT.coping + 22, w: 32, h: 30 }, 'chrome', '#8a8a90', { depth: 0.12, line: 1.4, formSize: 4 });
    for (const by of [RT.coping + 30, RT.coping + 44]) {
      ctx.fillStyle = '#2a2a30';
      ctx.beginPath();
      ctx.arc(px, by, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // the eye bolts the wires hang from
    for (const [, y] of SWAGS.map((s) => [0, s[1]])) {
      ctx.strokeStyle = '#3a3a40';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px + (px < 960 ? 15 : -15), y, 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function lights(ctx: Ctx): void {
  for (const [x0, y0, x1, y1, sag] of SWAGS) wire(ctx, x0 + 18, y0, x1 - 18, y1, sag, '#1e1814', 2);
  for (const [x, y] of BULBS) bulb(ctx, x, y + 2, 11, 0);
}

// ——— the table ———

const GINGHAM: Sett = [['#2c4f9c', 0.07], ['#f6f6f8', 0.07]];

function table(ctx: Ctx, r: R): void {
  // a blue gingham: blue and white stripes woven both ways, mid blue where blue crosses white, deep where they cross
  tartanCloth(ctx, r, RT.front, '#f2f3f6', GINGHAM, { off: 0.035 });
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, RT.front - TY + 4);
  ctx.clip();
  // the low sun skims over the parapet onto the back of the cloth, warm on the left; the right in the sky's blue
  lightPool(ctx, RT.sun.x + 200, TY + 50, 900, 120, '#ffc880', 0.2, 'screen');
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, 'rgba(255,200,140,0.06)');
  g.addColorStop(0.6, 'rgba(60,70,130,0)');
  g.addColorStop(1, 'rgba(60,70,130,0.14)');
  ctx.fillStyle = g;
  ctx.fillRect(0, TY, W, RT.front - TY);
  // the parapet's shadow along the back of the table
  vfill(ctx, 0, TY, W, 46, [[0, 'rgba(30,24,60,0.32)'], [1, 'rgba(30,24,60,0)']]);
  ctx.restore();
  tableFalloff(ctx, RT.front, 0.34, '#1a1430');
  tableSeam(ctx, 0.5, '#2a1a20', false);
  const cell = 0.07;
  foldedFront(ctx, RT.front, (x, y) => {
    const X = frontX(x, RT.front) - 0.035;
    const a = Math.floor(X / cell) % 2 === 0;
    const b = Math.floor((y - RT.front) / 10) % 2 === 0;
    return a && b ? '#2a4890' : a || b ? '#8ea4d0' : '#f2f3f6';
  }, 6);
}

function tableProps(ctx: Ctx, r: R): void {
  // a lemonade carafe and a candle in a jar at the back right
  const { x, y } = RT.candle;
  groundShadow(ctx, x - 92, y + 2, 34, 7, 0.4, '#1a1430', 1.4);
  bottle(ctx, x - 96, y, 120, '#e8d890', { kind: 'wine', depth: 0.05, cork: '#d8c8a0' });
  // the jar: clear glass, the candle down inside
  groundShadow(ctx, x + 6, y + 2, 26, 6, 0.4, '#1a1430', 1.3);
  candle(ctx, x, y - 4, 30, '#f2e6cc', false);
  const jar = rrPath(x - 28, y - 76, 56, 76, 10);
  glassPane(ctx, jar, { x: x - 28, y: y - 76, w: 56, h: 76 }, { sheen: 0.25, dirt: 0.05 });
  ctx.strokeStyle = rgba('#e0e8f0', 0.3);
  ctx.lineWidth = 1.6;
  jar(ctx);
  ctx.stroke();
  // a slice of lemon on the cloth
  const sl = ellPath(x + 70, y + 6, 14, 6);
  solid(ctx, sl, { x: x + 56, y: y, w: 28, h: 12 }, 'plastic', '#f6d84a', { depth: 0.05, line: 1.2, formSize: 3 });
  ao(ctx, x - 40, y + 4, 140, 8, 0.35);
  void r;
}

function candleStill(_ctx: Ctx): void {
  // (the candle is unlit at golden hour: it's lit by the live layer at night)
}

// ——— finishing ———

function grade(ctx: Ctx): void {
  gradeAll(ctx, 0.03, '#ffc890', 0.06, { warm: '#ffc27a', cool: '#5a6ac8', a: 0.24 });
}

function shadeOver(ctx: Ctx): void {
  // the HUD's corner calm, the lanes calm, a vignette
  const g = ctx.createRadialGradient(180, 70, 40, 180, 70, 520);
  g.addColorStop(0, 'rgba(20,14,30,0.42)');
  g.addColorStop(0.5, 'rgba(20,14,30,0.22)');
  g.addColorStop(1, 'rgba(20,14,30,0)');
  ctx.save();
  ctx.scale(1, 0.4);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 760, 520);
  ctx.restore();
  calmLanes(ctx, 0.08, '#3a2a40', 160, 640);
  vignetteAll(ctx, 0.45, '#1a1020');
}

// ——— the stack ———

const CLOUD_BOX = { x: 0, y: 140, w: W, h: 240 };
const CITY_BOX = { x: 0, y: 200, w: W, h: RT.coping - 2 - 200 };
const LIGHTS_BOX = { x: 0, y: RT.postTop, w: W, h: 160 };
const LEMON_BOX = { x: 40, y: 220, w: 290, h: 240 };

export const ROOFTOP: SceneSpec = {
  id: 'rooftop',
  info: {
    name: 'Rooftop Slice',
    subtitle: 'Waves 6–9',
    ambient: [],
    glows: [{ x: RT.sun.x, y: RT.sun.y, r: 360, color: '#ffc070', flicker: 0.03 }],
    light: '#ffd0a0',
    tableTint: '#fff0e4',
  },
  layers: [
    { id: 'sky', box: { x: 0, y: 0, w: W, h: RT.skyEnd + 30 }, draw: sky },
    { id: 'sunset', box: SKY_BOX, liveOnly: true, res: 0.5, draw: sunsetSky },
    { id: 'night', box: SKY_BOX, liveOnly: true, res: 0.5, draw: nightSky },
    { id: 'clouds', box: CLOUD_BOX, motion: 'sprite', res: 0.5, draw: clouds },
    { id: 'far', box: { x: 0, y: 200, w: W, h: RT.coping - 2 - 200 }, draw: far },
    { id: 'mid', box: { x: 0, y: 200, w: W, h: RT.coping - 2 - 200 }, draw: mid },
    { id: 'cityLights', box: CITY_BOX, liveOnly: true, res: 0.75, draw: (c) => cityLights(c) },
    { id: 'parapet', box: { x: 0, y: RT.coping - 2, w: W, h: TY - RT.coping + 6 }, draw: parapet },
    { id: 'potsL', box: { x: 60, y: 210, w: 570, h: RT.coping + 24 - 210 }, draw: potsL },
    { id: 'potsR', box: { x: 1300, y: 400, w: 580, h: RT.coping + 24 - 400 }, draw: potsR },
    { id: 'lemon', box: LEMON_BOX, motion: 'sprite', draw: lemonCrown },
    { id: 'postL', box: { x: 0, y: RT.postTop - 4, w: 90, h: TY - RT.postTop + 4 }, draw: (c, r) => post(c, r, RT.posts[0]) },
    { id: 'postR', box: { x: 1830, y: RT.postTop - 4, w: 90, h: TY - RT.postTop + 4 }, draw: (c, r) => post(c, r, RT.posts[1]) },
    { id: 'lights', box: LIGHTS_BOX, motion: 'sprite', draw: (c) => lights(c) },
    { id: 'table', box: { x: 0, y: TY, w: W, h: 1080 - TY }, draw: table },
    { id: 'tableProps', box: { x: 1600, y: TY - 120, w: 320, h: 180 }, draw: tableProps },
    { id: 'candle', box: { x: RT.candle.x - 40, y: RT.candle.y - 90, w: 80, h: 80 }, stillOnly: true, draw: candleStill },
    // the bulbs' light, the candle, birds and smoke: over everything
    { id: 'life', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

// ——— live ———

/** A pigeon at a phase of its pecking cycle (body bobbing, the head dipping to peck twice, the tail flicking). */
function pigeonPeck(c: Ctx, ph: number): void {
  const T = Math.PI * 2;
  const peck = Math.max(0, Math.sin(T * ph * 2)) ** 3;
  const bob = Math.sin(T * ph * 2) * 0.8;
  pigeon(c, 32, 46 + bob, peck, Math.sin(T * ph) * 0.15, null);
}

/** A pigeon flapping (wings through a full beat). */
function pigeonFlap(c: Ctx, ph: number): void {
  pigeon(c, 32, 40, -0.3, 0.2, Math.sin(Math.PI * 2 * ph));
}

function pigeon(c: Ctx, x: number, y: number, peck: number, tail: number, wing: number | null): void {
  // feet on the ground (perched) or tucked (flying)
  if (wing === null) {
    c.strokeStyle = '#c86a6a';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(x - 2, y - 4);
    c.lineTo(x - 3, y + 1);
    c.moveTo(x + 4, y - 4);
    c.lineTo(x + 5, y + 1);
    c.stroke();
  }
  // tail
  c.save();
  c.translate(x + 12, y - 12);
  c.rotate(tail);
  c.fillStyle = '#4a4e5e';
  c.beginPath();
  c.moveTo(0, -3);
  c.lineTo(16, -1);
  c.lineTo(16, 4);
  c.lineTo(0, 4);
  c.fill();
  c.restore();
  // body: soft grey, lit from the top left, a cool belly
  const g = c.createRadialGradient(x - 6, y - 20, 2, x, y - 12, 17);
  g.addColorStop(0, '#c8cad6');
  g.addColorStop(0.6, '#8a8ea2');
  g.addColorStop(1, '#4e5266');
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(x + 2, y - 12, 15, 9.5, -0.12, 0, Math.PI * 2);
  c.fill();
  // the wing: folded, with two dark bars; or beating
  c.fillStyle = '#7a7e92';
  c.beginPath();
  if (wing === null) c.ellipse(x + 5, y - 13, 10, 6, -0.15, 0, Math.PI * 2);
  else {
    const wy = wing * 18;
    c.moveTo(x - 2, y - 15);
    c.quadraticCurveTo(x + 6, y - 15 - wy * 1.2, x + 20, y - 14 - wy);
    c.quadraticCurveTo(x + 10, y - 10 - wy * 0.3, x + 8, y - 10);
    c.closePath();
  }
  c.fill();
  c.strokeStyle = 'rgba(40,40,56,0.6)';
  c.lineWidth = 1.4;
  if (wing === null) {
    c.beginPath();
    c.moveTo(x + 2, y - 15);
    c.lineTo(x + 8, y - 12);
    c.moveTo(x + 5, y - 11);
    c.lineTo(x + 11, y - 9);
    c.stroke();
  }
  // neck and head (iridescent neck), dipping to peck
  const hx = x - 12 - peck * 4;
  const hy = y - 24 + peck * 16;
  const ng = c.createLinearGradient(x - 8, y - 24, x - 8, y - 10);
  ng.addColorStop(0, '#6a8a7a');
  ng.addColorStop(1, '#7a5a8a');
  c.fillStyle = ng;
  c.beginPath();
  c.moveTo(x - 4, y - 18);
  c.quadraticCurveTo(hx + 2, hy + 4, hx + 5, hy + 2);
  c.lineTo(hx + 8, hy + 8);
  c.quadraticCurveTo(x - 2, y - 8, x + 2, y - 10);
  c.closePath();
  c.fill();
  c.fillStyle = '#8a8ea2';
  c.beginPath();
  c.arc(hx, hy, 5.5, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#d8d0c0';
  c.beginPath();
  c.moveTo(hx - 5, hy);
  c.lineTo(hx - 10, hy + 1.5 + peck * 2);
  c.lineTo(hx - 5, hy + 2.5);
  c.fill();
  c.fillStyle = '#ff8a3a';
  c.beginPath();
  c.arc(hx - 1.5, hy - 1, 1.6, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = 'rgba(255,240,220,0.5)';
  c.beginPath();
  c.ellipse(x - 4, y - 19, 6, 2.5, -0.4, 0, Math.PI * 2);
  c.fill();
}

registerKitScene(ROOFTOP, (k: KitLive, wave0) => {
  const sunset = k.sprite('sunset');
  const night = k.sprite('night');
  const city = k.sprite('cityLights');
  const cl = k.sprite('clouds');
  const lemon = k.pivot(k.sprite('lemon'), RT.lemon.x + 4, RT.coping - 96);
  const wires = k.pivot(k.sprite('lights'), 960, RT.postTop + 14);
  const life = k.slot('life');
  const parts = new Particles(k, life, 60);
  // the light over everything: warm at sunset, a deep blue at night
  const warm = k.wash(0xffa070, 0, Phaser.BlendModes.MULTIPLY);
  const blue = k.wash(0x3a40a0, 0, Phaser.BlendModes.MULTIPLY);
  // hero: the chimney's smoke, a painted volume billowing up and leaning off with the breeze (12 frames)
  const smokeKey = sheet(k, 'rt_smoke', 12, 150, 340, (c, ph) => smokeFrame(c, 150, 340, ph, { lit: '#fff0d8', body: '#c8bcc0', shade: '#6a6080', wind: 0.55, lobes: 10, a: 0.55 }));
  const smoke = new Loop(k, smokeKey, RT.chimney.x + 4, RT.chimney.y - 40, { into: life, fps: 7, origin: [0.5, 1], scale: 1.1 });
  // the festoon bulbs: halos that come on at dusk, each with its own shimmer, and their light on the cloth
  const halos = BULBS.map(([x, y], i) => ({ x, y: y + 13, img: k.glow(x, y + 13, 22, 0xffc070, 0, { into: life }), core: k.glow(x, y + 13, 6, 0xfff4d8, 0, { into: life }), seed: i * 1.37 }));
  const pools = [380, 960, 1540].map((x) => k.glow(x, 900, 520, 0xffb860, 0, { into: life, sy: 0.22 }));
  const wireSpring = new Spring(18, 1.6);
  const lemonSpring = new Spring(24, 2.4);
  // the candle in its jar
  const ft = k.tex('rt_flame', 64, 128, (c) => flameShape(c, 32, 122, 46, 116, ['#ff8a2a', '#ffcf5a', '#fffbe8']));
  const cFlame = k.img(ft, RT.candle.x, RT.candle.y - 28, { into: life, add: true, origin: [0.5, 0.96], sx: 0.2, sy: 0.22, alpha: 0 });
  const cHalo = k.glow(RT.candle.x, RT.candle.y - 36, 90, 0xffb04a, 0, { into: life });
  // hero: pigeons on the coping, pecking (12 painted frames), taking off when the table's stomped (flap frames)
  const peckKey = sheet(k, 'rt_pigeon_peck', 12, 64, 48, (c, ph) => pigeonPeck(c, ph));
  const flapKey = sheet(k, 'rt_pigeon_flap', 6, 64, 48, (c, ph) => pigeonFlap(c, ph));
  type Bird = { home: number; peck: Loop; flap: Loop; x: number; y: number; vx: number; vy: number; state: 'perch' | 'fly' | 'away' | 'land'; t: number };
  const birds: Bird[] = [620, 668, 1210].map((home, i) => {
    const peck = new Loop(k, peckKey, home, RT.coping + 2, { into: life, fps: 6 + i, origin: [0.5, 1], scale: 0.9 });
    const flap = new Loop(k, flapKey, home, RT.coping + 2, { into: life, fps: 16, origin: [0.5, 1], scale: 0.9 });
    flap.visible = false;
    peck.each((im) => im.setFlipX(i === 1));
    return { home, peck, flap, x: home, y: RT.coping + 2, vx: 0, vy: 0, state: 'perch', t: 0 };
  });
  const scare = (b: Bird) => {
    if (b.state !== 'perch') return;
    b.state = 'fly';
    b.x = b.home;
    b.y = RT.coping + 2;
    b.vx = (b.home < 960 ? -1 : 1) * (160 + crand() * 120);
    b.vy = -220 - crand() * 80;
    b.t = 0;
    b.peck.visible = false;
    b.flap.visible = true;
    b.flap.each((im) => im.setFlipX(b.vx > 0));
  };
  // a plane crossing high at night, its lights blinking
  const plane = k.glow(-60, 120, 10, 0xff4a4a, 0, { into: life });
  const planeW = k.glow(-60, 120, 6, 0xffffff, 0, { into: life });
  let planeT = 8;
  let kw = waveK(wave0);
  let shown = kw;
  const C = Phaser.Display.Color;
  const tint = (a: number, b: number, t: number) => {
    const c = C.Interpolate.ColorWithColor(C.ValueToColor(a), C.ValueToColor(b), 100, Math.round(Phaser.Math.Clamp(t, 0, 1) * 100));
    return C.GetColor(c.r, c.g, c.b);
  };
  return {
    setWave: (w) => (kw = waveK(w)),
    impact(x, _y, p) {
      wireSpring.kick(0.12 * p);
      lemonSpring.kick((x < RT.lemon.x ? 1 : -1) * 0.12 * p);
      for (const b of birds) if (p > 0.3 || Math.abs(b.home - x) < 500) scare(b);
      // a few leaves shaken off the lemon tree
      if (p > 0.4) for (let i = 0; i < 3 + p * 4; i++) parts.emit('flake', RT.lemon.cx + (crand() - 0.5) * 120, RT.lemon.cy + (crand() - 0.5) * 80, (crand() - 0.3) * 40, 10, { life: 3.5, size: 0.9, tint: 0x6a8a3a });
    },
    update(dt, t) {
      shown += (kw - shown) * Math.min(1, dt * 0.6);
      // 0 golden hour (wave 1) … sunset … dusk … 1 night
      const eve = Phaser.Math.Clamp(shown / 0.4, 0, 1);
      const nt = Phaser.Math.Clamp((shown - 0.4) / 0.5, 0, 1);
      sunset.setAlpha(Phaser.Math.Easing.Sine.InOut(eve));
      night.setAlpha(Phaser.Math.Easing.Sine.InOut(nt));
      warm.setAlpha(eve * 0.26 * (1 - nt * 0.6));
      blue.setAlpha(nt * 0.4);
      const ct = nt > 0 ? tint(0xffa898, 0x4a4a78, nt) : tint(0xffffff, 0xffa898, eve);
      cl.setTint(ct).setAlpha(1 - nt * 0.6);
      cl.x = Math.sin(t * 0.025 + 2) * 90 * calm();
      // the smoke: lit gold, then rose, then grey-blue in the city's glow
      smoke.update(dt);
      smoke.each((im) => im.setTint(nt > 0 ? tint(0xffb0a0, 0x6a6890, nt) : tint(0xffffff, 0xffb8a0, eve)));
      const on = Phaser.Math.Clamp((shown - 0.5) / 0.25, 0, 1);
      city.setAlpha(on * (0.92 + Math.sin(t * 0.7) * 0.04));
      // the wires: a slow breeze, and a swing after a stomp (the sag deepens and recovers)
      const sw = wireSpring.step(dt, Math.sin(t * 0.6) * 0.015 * calm());
      wires.scaleY = 1 + sw;
      for (const h of halos) {
        const s = 0.9 + Math.sin(t * 2.1 + h.seed) * 0.05 + Math.sin(t * 7.3 + h.seed * 3) * 0.03;
        const y = RT.postTop + 14 + (h.y - RT.postTop - 14) * (1 + sw);
        h.img.setPosition(h.x, y).setAlpha(on * 0.55 * s);
        h.core.setPosition(h.x, y).setAlpha(on * 0.8 * s);
      }
      for (const p of pools) p.setAlpha(on * (0.1 + nt * 0.06));
      lemon.rotation = (Math.sin(t * 0.8) * 0.6 + Math.sin(t * 1.9) * 0.3) * 0.02 * calm() + lemonSpring.step(dt);
      // the candle, lit with the bulbs
      const cn = flicker(t * 0.8, 3.3);
      cFlame.setAlpha(on).setScale(0.18 + cn * 0.03, 0.18 + cn * 0.07).setRotation(wander(t, 4, 0.7) * 0.1 * calm());
      cHalo.setAlpha(on * (0.28 + cn * 0.1));
      // the pigeons
      for (const b of birds) {
        b.t += dt;
        if (b.state === 'perch') {
          b.peck.update(dt);
          b.peck.each((im) => im.setTint(tint(0xffffff, 0x6a6a90, nt)));
          if (nt > 0.85) scare(b);
        } else if (b.state === 'fly') {
          b.flap.update(dt);
          b.vy += 60 * dt;
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          b.flap.each((im) => im.setPosition(b.x, b.y).setScale(0.9 + b.t * 0.15));
          if (b.y < -60 || b.x < -80 || b.x > W + 80) {
            b.state = 'away';
            b.t = 0;
            b.flap.visible = false;
          }
        } else if (b.state === 'away') {
          // back after a while (not at night)
          if (b.t > 16 && nt < 0.6) {
            b.state = 'land';
            b.t = 0;
            b.flap.visible = true;
            b.flap.each((im) => im.setFlipX(b.home < 960).setScale(0.9));
          }
        } else {
          b.flap.update(dt);
          const u = Math.min(1, b.t / 2.4);
          const x = lerp(b.home + (b.home < 960 ? -500 : 500), b.home, Phaser.Math.Easing.Sine.Out(u));
          const y = lerp(RT.coping - 260, RT.coping + 2, Phaser.Math.Easing.Quadratic.In(u));
          b.flap.each((im) => im.setPosition(x, y));
          if (u >= 1) {
            b.state = 'perch';
            b.flap.visible = false;
            b.peck.visible = true;
          }
        }
      }
      parts.update(dt, t);
      // the plane, at night
      planeT += dt;
      if (planeT > 40) planeT = 0;
      const px = lerp(W + 80, -80, planeT / 40);
      const blink = Math.sin(t * 6) > 0.6 ? 1 : 0.15;
      plane.setPosition(px, 120 + planeT * 1.2).setAlpha(nt * blink * 0.9);
      planeW.setPosition(px + 8, 120 + planeT * 1.2).setAlpha(nt * (Math.sin(t * 6 + 2) > 0.8 ? 0.9 : 0));
    },
  };
});
