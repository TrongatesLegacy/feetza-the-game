// The Pier (Stage 9, waves 41–44), redrawn with the location kit (src/art/scene): the end of an old seaside pier on a
// northern sea, looking out over the railing. A fresh, breezy morning: a high sun on the left laying a glitter path
// down a green-blue sea, white cumulus sailing over; a far headland on the right with a white lighthouse on its point,
// surf working at the rocks at its foot. The pier's cast-iron balustrade (teal paint, rust weeping from its bolts, a
// salt-worn mahogany handrail) along its timber deck; a Victorian lamp standard on the left with a lifebuoy hung on
// its column; a coin-operated sea viewer on the right; a herring gull on a post; the table a slab of sea-bleached
// pier timber with a cone of chips on it.
//
// Live, the heroes:
// - the sea: swells painted as long broken crests rolling in from the horizon and swelling as they near the pier,
//   glints winking along the sun's path; surf bursting on the headland's rocks (painted frames). From the third wave
//   the sea turns slate and white-capped, and waves hit the pier's legs below the railing, sending sheets of spray up
//   over the rail (painted frames of a plume rising, breaking and falling back, and lit drops thrown over the rail
//   onto the deck). A stomp jolts the pier and slaps a plume up at the rail nearest it;
// - the gull: it idles on its post (breathing, a tilt of the head) and now and then throws its head back for a long
//   call; a stomp startles it into the air (painted flap cycle), it wheels off and later glides back in and lands.
//   Far gulls wheel over the sea in the fair weather;
// - the storm: the day clouds over (a heavy grey sky) and then turns to a storm at nightfall: rain in two depths,
//   splashes on the deck and the table, lightning over the far sea (painted bolts and the sky flashing), the
//   lighthouse lit and its beam sweeping round, the pier's lamps lit (a stomp makes them flicker), the lifebuoy
//   swinging on its hook and the sea viewer nodding on its yoke when the table's hit.
// Across the stage: bright morning, a hazier, cloudier afternoon, a grey squall coming in, the storm at nightfall.

import Phaser from 'phaser';
import { xAt, yAt, ZB } from '../../art/backdrops';
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
  glowAt,
  gradeAll,
  groundShadow,
  haze,
  lightPool,
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
import { aoHalo, groundCast } from '../../art/scene/light';
import { planksPlane, tableFalloff, tableSeam, water } from '../../art/scene/materials';
import { drift, grime, lay, noiseMask, softly, streaks, surface } from '../../art/scene/paint';
import { hang } from '../../art/scene/props';
import { cloud, farLand, horizonGlow, skyFill, sun } from '../../art/scene/sky';
import { rgba, shade } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { Loop, Parts, Rate, Spring, Swing, sheet } from '../../game/sceneAnim';
import { type KitLive, calm, flicker, registerKitScene, waveK } from '../../game/sceneLive';

// ——— layout ———

export const PR = {
  /** The sea's horizon. */
  hz: 404,
  /** The balustrade: the top of the handrail, the bottom rail, the deck at its foot. */
  rail: 596,
  railLow: 680,
  deck: 700,
  posts: [100, 340, 580, 820, 1060, 1300, 1540, 1780],
  /** The post caps' top face. */
  cap: 574,
  lamp: { x: 168, base: 722, arm: 300 },
  buoy: { hookY: 468, cy: 548, r: 40 },
  viewer: { x: 1716, base: 724 },
  gull: { x: 1300, y: 574 },
  /** The lighthouse: its foot and its lantern. */
  lh: { x: 1708, foot: 376, lantern: 288 },
  sun: { x: 372, y: 132, r: 32 },
  front: 1040,
};

const P2 = Math.PI * 2;
const HZ = PR.hz;
const SEA_AIR: Air = { color: '#d4e4ea', far: 0.72 };
const IRON = '#2c6a64';
const IRON_INK = '#0c201e';
const RAILWOOD = '#6a3a24';

// ——— the sky ———

interface SkyCols {
  stops: [number, string][];
  drift: [string, string];
  glow: string;
  glowA: number;
}

const DAY_SKY: SkyCols = {
  stops: [[0, '#2f6cb4'], [0.35, '#5a96d0'], [0.7, '#9cc4e2'], [0.92, '#d2e6ee'], [1, '#e6f0f0']],
  drift: ['#d8ecf8', '#3a6aa8'],
  glow: '#f4f0dc',
  glowA: 0.45,
};

function sky(ctx: Ctx, _r: R): void {
  const box = { x: 0, y: 0, w: W, h: HZ + 4 };
  skyFill(ctx, box, DAY_SKY.stops);
  lay(ctx, drift(DAY_SKY.drift[0], DAY_SKY.drift[1], 3, 91, 160, 48), box, 0.14);
  // the sun's warmth through the high air round it, the haze thickening low over the sea
  glowAt(ctx, PR.sun.x, PR.sun.y + 40, 900, '#fff2d0', 0.22, 0.7);
  horizonGlow(ctx, HZ, 110, DAY_SKY.glow, DAY_SKY.glowA);
  sun(ctx, PR.sun.x, PR.sun.y, PR.sun.r, { disc: '#fffcf0', glow: '#fff0c8', a: 0.75, bloom: 11 });
}

/** The squall's sky (live only, the third wave): a low grey lid of nimbostratus, a pale band left at the horizon. */
function greySky(ctx: Ctx, r: R): void {
  const box = { x: 0, y: 0, w: W, h: HZ + 4 };
  skyFill(ctx, box, [[0, '#3e4a58'], [0.4, '#5c6a78'], [0.78, '#8a96a0'], [1, '#b4bcbc']]);
  lay(ctx, drift('#9aa6b0', '#2a3442', 3, 93, 160, 48), box, 0.3);
  // the lid's underside: heavy rolls, darker in their middles, lit faintly along their lower edges
  for (let i = 0; i < 11; i++) {
    const x = r() * W;
    const y = 40 + i * 26 + r() * 20;
    cloud(ctx, r, x, y, 500 + r() * 500, 40 + r() * 30, { kind: 'stratus', lit: '#aab4bc', body: '#5a6674', shadow: '#2e3846', sunX: PR.sun.x, sunY: PR.sun.y + 200, rim: 0.3, wisp: 0.5, a: 0.8 });
  }
  // rain hanging from the cloud base over the far sea in grey veils
  softly(ctx, { x: 0, y: 200, w: W, h: HZ - 196 }, (g) => {
    for (const [x, w] of [[300, 260], [820, 180], [1240, 320]] as const) {
      const lg = g.createLinearGradient(0, 220, 0, HZ);
      lg.addColorStop(0, 'rgba(70,80,96,0)');
      lg.addColorStop(0.5, 'rgba(70,80,96,0.4)');
      lg.addColorStop(1, 'rgba(70,80,96,0.15)');
      g.fillStyle = lg;
      g.beginPath();
      g.moveTo(x, 220);
      g.lineTo(x + w, 220);
      g.lineTo(x + w - 60, HZ);
      g.lineTo(x - 60, HZ);
      g.closePath();
      g.fill();
    }
  }, 0.2);
  horizonGlow(ctx, HZ, 70, '#d8dcd4', 0.4);
}

/** The storm at nightfall (live only, the fourth wave): a bruised sky, a last sulphur-pale break low on the left. */
function stormSky(ctx: Ctx, r: R): void {
  const box = { x: 0, y: 0, w: W, h: HZ + 4 };
  skyFill(ctx, box, [[0, '#0c121c'], [0.4, '#1a2230'], [0.75, '#2e3644'], [0.93, '#52525a'], [1, '#6a6460']]);
  lay(ctx, drift('#3a4456', '#06080e', 3, 95, 160, 48), box, 0.35);
  // the break: a slot of cold yellow light under the cloud base, far off on the left
  softly(ctx, { x: 0, y: HZ - 90, w: 1100, h: 94 }, (g) => {
    const lg = g.createRadialGradient(380, HZ - 10, 0, 380, HZ - 10, 520);
    lg.addColorStop(0, 'rgba(232,204,150,0.75)');
    lg.addColorStop(0.5, 'rgba(180,150,120,0.3)');
    lg.addColorStop(1, 'rgba(120,110,110,0)');
    g.save();
    g.translate(380, HZ - 10);
    g.scale(1, 0.14);
    g.translate(-380, -(HZ - 10));
    g.fillStyle = lg;
    g.fillRect(-200, HZ - 600, 1500, 1200);
    g.restore();
  }, 0.25);
  // the storm's clouds: towering, dark, their undersides caught by the break's light
  for (let i = 0; i < 9; i++) {
    const x = r() * W;
    const y = 70 + i * 34 + r() * 20;
    cloud(ctx, r, x, y, 560 + r() * 520, 50 + r() * 40, { kind: 'stratus', lit: '#8a7c6c', body: '#262e3c', shadow: '#0c1018', sunX: 380, sunY: HZ + 40, rim: 0.45, wisp: 0.55, a: 0.9 });
  }
  cloud(ctx, r, 1180, 210, 640, 170, { kind: 'cumulus', lit: '#6a6a72', body: '#20283a', shadow: '#0a0e16', sunX: 380, sunY: HZ + 60, rim: 0.4, wisp: 0.5, a: 0.92 });
  // rain shafts sweeping the far sea
  softly(ctx, { x: 0, y: 150, w: W, h: HZ - 146 }, (g) => {
    for (const [x, w] of [[620, 300], [1100, 220], [1500, 360]] as const) {
      const lg = g.createLinearGradient(0, 170, 0, HZ);
      lg.addColorStop(0, 'rgba(40,48,62,0)');
      lg.addColorStop(0.45, 'rgba(40,48,62,0.55)');
      lg.addColorStop(1, 'rgba(40,48,62,0.25)');
      g.fillStyle = lg;
      g.beginPath();
      g.moveTo(x, 170);
      g.lineTo(x + w, 170);
      g.lineTo(x + w - 90, HZ);
      g.lineTo(x - 90, HZ);
      g.closePath();
      g.fill();
    }
  }, 0.2);
  horizonGlow(ctx, HZ, 50, '#b0a080', 0.25, 0, 1000);
}

/** The fair-weather clouds (a moving sprite): heaped cumulus sailing in from the sea, lit from the sun's side. */
function cloudsDay(ctx: Ctx, r: R): void {
  const o = { lit: '#ffffff', body: '#e4ecf4', shadow: '#8496b4', sunX: PR.sun.x, sunY: PR.sun.y, rim: 0.6, wisp: 0.4, air: SEA_AIR };
  // far banks lying low over the horizon, flat and hazy
  softly(ctx, { x: 0, y: HZ - 70, w: W, h: 72 }, (g) => {
    for (const [cx, w, h] of [[980, 520, 22], [1240, 300, 16], [260, 360, 14], [700, 260, 12]] as const) {
      const rg = g.createRadialGradient(cx, HZ - 10, 0, cx, HZ - 10, w);
      rg.addColorStop(0, 'rgba(246,248,250,0.75)');
      rg.addColorStop(0.6, 'rgba(232,240,246,0.35)');
      rg.addColorStop(1, 'rgba(232,240,246,0)');
      g.save();
      g.translate(cx, HZ - 10);
      g.scale(1, h / w);
      g.translate(-cx, -(HZ - 10));
      g.fillStyle = rg;
      g.fillRect(cx - w, HZ - 10 - w, w * 2, w * 2);
      g.restore();
    }
  }, 0.25);
  // middle distance: fair-weather cumulus with flat grey bases, smaller as they near the horizon
  cloud(ctx, r, 880, 318, 300, 70, { ...o, kind: 'cumulus', depth: 0.7 });
  cloud(ctx, r, 1200, 300, 220, 54, { ...o, kind: 'cumulus', depth: 0.72 });
  cloud(ctx, r, 600, 330, 180, 40, { ...o, kind: 'cumulus', depth: 0.78 });
  // nearer and higher: two big heaps on the right, one on the left past the sun
  cloud(ctx, r, 1460, 210, 520, 150, { ...o, kind: 'cumulus', depth: 0.4 });
  cloud(ctx, r, 940, 150, 340, 90, { ...o, kind: 'cumulus', depth: 0.5 });
  cloud(ctx, r, 1820, 300, 260, 60, { ...o, kind: 'cumulus', depth: 0.65 });
}

// ——— the far land ———

/** How far right the headland sits (clear of the hovering feet over the right lane). */
export const HX = 230;

/** The headland's top edge (from x = 1380 + HX to the right edge). */
const headTop = (x0: number): number => {
  const x = x0 - HX;
  if (x < 1440) return HZ - (x - 1380) * 0.4;
  if (x < 1530) return HZ - 24 - Math.sin(((x - 1440) / 90) * Math.PI) * 6;
  // the cliff rising to the downs
  const t = Math.min(1, (x - 1530) / 140);
  return HZ - 24 - t * t * (3 - 2 * t) * 64 - Math.sin(x * 0.02) * 3 - (x > 1700 ? (x - 1700) * 0.05 : 0);
};

export function farLeft(ctx: Ctx, r: R): void {
  // a low far coast on the left, a town's pale smudge on it
  const pts: [number, number][] = [[-10, HZ + 1]];
  for (let x = -10; x <= 560; x += 20) pts.push([x, HZ - 10 - Math.sin(x * 0.006) * 6 - (x < 200 ? (200 - x) * 0.04 : 0) + (r() - 0.5) * 1.5 + (x > 480 ? (x - 480) * 0.14 : 0)]);
  pts.push([560, HZ + 1]);
  farLand(ctx, pts, HZ, '#5a7a6a', 0.92, SEA_AIR, '#fff4d8', 0.3);
  for (let i = 0; i < 26; i++) {
    const x = 40 + r() * 340;
    ctx.fillStyle = rgba(r() < 0.5 ? '#eef2f0' : '#c8d0d0', 0.4);
    ctx.fillRect(x, HZ - 12 - r() * 6, 2 + r() * 5, 3 + r() * 4);
  }
}

export function headland(ctx: Ctx, r: R): void {
  const pts: [number, number][] = [[1376 + HX, HZ + 1]];
  for (let x = 1380 + HX; x <= W + 10; x += 6) pts.push([x, headTop(x) + (r() - 0.5) * 1.2]);
  pts.push([W + 10, HZ + 1]);
  const col = '#4a5a50';
  farLand(ctx, pts, HZ, col, 0.62, SEA_AIR, '#f8f0d0', 0.4);
  const path = polyPath(pts);
  within(ctx, path, () => {
    // the cliff face: strata running across it, buttresses lit on their sun side, gullies in shade
    for (let k = 0; k < 18; k++) {
      const x = 1540 + HX + r() * (W - 1540 - HX);
      const top = headTop(x) + 6;
      ctx.strokeStyle = rgba(airMix('#2a3430', 0.6, SEA_AIR), 0.5);
      ctx.lineWidth = 2 + r() * 3;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x + 6 + r() * 8, HZ);
      ctx.stroke();
      ctx.strokeStyle = rgba('#e8e4d0', 0.16);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - 3, top + 2);
      ctx.lineTo(x + 2 + r() * 6, HZ);
      ctx.stroke();
    }
    for (let k = 0; k < 6; k++) {
      ctx.strokeStyle = rgba('#e0dccc', 0.08);
      ctx.lineWidth = 2;
      ctx.beginPath();
      const y = HZ - 34 + k * 5;
      ctx.moveTo(1530 + HX, y);
      ctx.lineTo(W, y - 3);
      ctx.stroke();
    }
    // the grassy downs on top, catching the sun
    ctx.beginPath();
    for (let x = 1380 + HX; x <= W + 10; x += 6) ctx.lineTo(x, headTop(x) - 1);
    for (let x = W + 10; x >= 1380 + HX; x -= 6) ctx.lineTo(x, headTop(x) + (x > 1540 + HX ? 7 : 4));
    ctx.closePath();
    ctx.fillStyle = rgba(airMix('#7a9a4a', 0.6, SEA_AIR), 0.85);
    ctx.fill();
    // the low point: dark wet rocks at the waterline
    vfill(ctx, 1376 + HX, HZ - 12, 560 - HX, 14, [[0, 'rgba(30,40,40,0)'], [1, 'rgba(30,40,40,0.55)']]);
  });
  // the path up to the light, and the keeper's cottage beside it
  const { x, foot } = PR.lh;
  ctx.strokeStyle = rgba('#e8e0c8', 0.4);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x + 20, foot + 2);
  ctx.quadraticCurveTo(x + 70, foot + 8, x + 120, headTop(x + 120) + 2);
  ctx.stroke();
  const cot = rectPath(x + 22, foot - 12, 26, 13);
  solid(ctx, cot, { x: x + 22, y: foot - 12, w: 26, h: 13 }, 'stone', '#ece6da', { depth: 0.65, air: SEA_AIR, line: 0.8 });
  const roof = polyPath([[x + 19, foot - 11], [x + 35, foot - 20], [x + 51, foot - 11]]);
  solid(ctx, roof, { x: x + 19, y: foot - 20, w: 32, h: 10 }, 'stone', '#5a5a64', { depth: 0.65, air: SEA_AIR, line: 0.8 });
  lighthouse(ctx);
}

/** The lighthouse on the headland's point: a tapering white tower with a red band, its gallery and lantern. */
function lighthouse(ctx: Ctx): void {
  const { x, foot, lantern } = PR.lh;
  const top = lantern + 14;
  const tw = (y: number) => 11 - ((foot - y) / (foot - top)) * 4;
  const tower: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - tw(foot), foot);
    c.lineTo(x - tw(top), top);
    c.lineTo(x + tw(top), top);
    c.lineTo(x + tw(foot), foot);
    c.closePath();
  };
  const o = { depth: 0.6, air: SEA_AIR };
  solid(ctx, tower, { x: x - 12, y: top, w: 24, h: foot - top }, 'stone', '#f4f2ea', { ...o, line: 1 });
  within(ctx, tower, () => {
    ctx.fillStyle = airMix('#b02a24', 0.6, SEA_AIR);
    ctx.fillRect(x - 14, top + 22, 28, 18);
    // round tower: lit on the sun's side, shaded right
    const g = ctx.createLinearGradient(x - 12, 0, x + 12, 0);
    g.addColorStop(0, 'rgba(255,250,236,0.35)');
    g.addColorStop(0.45, 'rgba(255,250,236,0)');
    g.addColorStop(1, 'rgba(40,50,70,0.4)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 14, top, 28, foot - top);
    ctx.fillStyle = 'rgba(30,40,50,0.6)';
    ctx.fillRect(x - 1.5, top + 50, 3, 5);
  });
  // gallery, lantern glazing, cupola and vane
  ctx.fillStyle = airMix('#1a1e24', 0.55, SEA_AIR);
  ctx.fillRect(x - 11, top - 2, 22, 3);
  ctx.fillStyle = airMix('#e8eef0', 0.5, SEA_AIR);
  ctx.fillRect(x - 6, lantern, 12, 12);
  ctx.strokeStyle = airMix('#1a1e24', 0.55, SEA_AIR);
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 6, lantern, 12, 12);
  ctx.beginPath();
  ctx.moveTo(x, lantern);
  ctx.lineTo(x, lantern + 12);
  ctx.stroke();
  ctx.fillStyle = airMix('#222a30', 0.55, SEA_AIR);
  ctx.beginPath();
  ctx.moveTo(x - 8, lantern);
  ctx.quadraticCurveTo(x, lantern - 12, x + 8, lantern);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(x - 0.6, lantern - 16, 1.2, 6);
  // the base: whitewashed plinth, the rock under it
  ctx.fillStyle = airMix('#d8d4c8', 0.6, SEA_AIR);
  ctx.fillRect(x - 15, foot - 3, 30, 4);
}

// ——— the sea ———

const SEA_BOX = { x: 0, y: HZ, w: W, h: PR.deck - HZ + 4 };

function sea(ctx: Ctx, r: R): void {
  water(ctx, r, 0, W, HZ, PR.deck + 4, {
    far: '#a8c4c8', deep: '#2c6e80', near: '#1a5464', sky: '#e8f2f2', skyA: 0.55,
    ripple: '#eaf6f6', ripples: 300, swells: 11, crest: '#e4f2f2',
    seed: 47,
  });
  glitter(ctx, r, PR.sun.x + 40, '#fffae6', 1);
  // the shelf's paler green over the shallows by the headland, and its shadow on the water
  lightPool(ctx, 1640 + HX, HZ + 30, 300, 22, '#5aa8a0', 0.25, 'source-over');
  haze(ctx, HZ - 2, HZ + 30, '#e8f0f0', 0.55, 0.1);
  // the cloud shadows lying on the sea in long dark patches
  lay(ctx, noiseMask(5, 61, { cover: 0.35, soft: 0.3, col: '#123a48', w: 200, h: 30 }), { x: 0, y: HZ + 40, w: W, h: 220 }, 0.25);
  // the headland's reflection, broken by the swell
  ctx.save();
  ctx.globalAlpha = 0.18;
  for (let y = HZ + 2; y < HZ + 40; y += 3) {
    const w = 540 - HX - (y - HZ) * 4;
    ctx.fillStyle = airMix('#3a4a44', 0.6, SEA_AIR);
    ctx.fillRect(1380 + HX + (r() - 0.5) * 10 + (y - HZ) * 2, y, w, 1.5);
  }
  ctx.restore();
  nearSwells(ctx, r, '#0e3a48', '#bfe2e4', 0.9);
  // the near water darkening under the pier's own shadow
  vfill(ctx, 0, PR.deck - 70, W, 74, [[0, 'rgba(8,30,40,0)'], [1, 'rgba(8,30,40,0.45)']]);
}

/** The sun's path on the water: no edges, a soft column of light and the sparkles thick in its middle, spreading
 * and growing as the water comes nearer. */
export function glitter(ctx: Ctx, r: R, gx: number, col: string, a: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(gx, HZ);
  ctx.scale(1, 2.2);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 200);
  g.addColorStop(0, rgba(col, 0.3 * a));
  g.addColorStop(0.4, rgba(col, 0.1 * a));
  g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g;
  ctx.fillRect(-200, 0, 400, 200);
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 700; i++) {
    const t = r() ** 0.9;
    const y = HZ + 2 + t * (PR.deck - HZ - 6);
    const spread = 20 + t * 230;
    const u = r() + r() + r() - 1.5;
    const x = gx + u * spread;
    const len = (3 + r() * 14) * (0.4 + t);
    const al = a * (0.25 + r() * 0.75) * (1 - Math.abs(u) / 1.5) * (1 - t * 0.45);
    ctx.fillStyle = rgba(col, al);
    ctx.fillRect(x - len / 2, y, len, Math.max(1, 1.8 * (0.4 + t)));
  }
  ctx.restore();
}

/** The long swells in the near half of the sea: each a dark trough under a lit back slope and a crest broken into
 * light where it faces the sun, wider apart and taller the nearer they come. */
function nearSwells(ctx: Ctx, r: R, trough: string, lit: string, a: number): void {
  const y0 = HZ + 60;
  const y1 = PR.deck - 8;
  for (let j = 0; j < 9; j++) {
    const t = ((j + 0.5) / 9) ** 1.5;
    const y = y0 + t * (y1 - y0);
    const amp = 2 + t * 9;
    const f = 0.004 + (1 - t) * 0.006;
    const ph = r() * 10;
    const yy = (x: number) => y + Math.sin(x * f + ph) * amp + Math.sin(x * f * 2.7 + ph * 1.3) * amp * 0.35;
    // the trough: a soft dark band under the crest
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, yy(0));
    for (let x = 0; x <= W; x += 16) ctx.lineTo(x, yy(x));
    for (let x = W; x >= 0; x -= 16) ctx.lineTo(x, yy(x) + 4 + t * 16);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, y - amp, 0, y + amp + 4 + t * 16);
    g.addColorStop(0, rgba(trough, 0.3 * a));
    g.addColorStop(1, rgba(trough, 0));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
    // the crest line, broken, lit where it turns to the sun
    ctx.lineCap = 'round';
    ctx.lineWidth = 1 + t * 2.2;
    let on = false;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 10) {
      const vis = Math.sin(x * 0.011 + j * 2 + ph) + Math.sin(x * 0.031 + j) > -0.1;
      if (vis && !on) ctx.moveTo(x, yy(x) - 1);
      else if (vis) ctx.lineTo(x, yy(x) - 1);
      on = vis;
    }
    ctx.strokeStyle = rgba(lit, (0.18 + t * 0.2) * a);
    ctx.stroke();
  }
}

/** The sea in the squall and the storm (live only): slate water, white horses on every crest. */
function seaGrey(ctx: Ctx, r: R): void {
  water(ctx, r, 0, W, HZ, PR.deck + 4, {
    far: '#7a8a90', deep: '#2c3e48', near: '#16262e', sky: '#b0b8bc', skyA: 0.4,
    ripple: '#c8d4d8', ripples: 360, swells: 14, crest: '#dfe8ea', seed: 49,
  });
  // white horses: broken crests in rows, smaller and more crowded towards the horizon
  for (let i = 0; i < 240; i++) {
    const t = r() ** 1.3;
    const y = HZ + 6 + t * (PR.deck - HZ - 10);
    const x = r() * W;
    const s = 0.3 + t * 1.6;
    const len = (14 + r() * 30) * s;
    ctx.fillStyle = rgba('#eef4f4', 0.35 + r() * 0.4);
    ctx.beginPath();
    ctx.moveTo(x - len / 2, y);
    ctx.quadraticCurveTo(x - len * 0.1, y - 3.5 * s, x + len / 2, y + 0.5);
    ctx.quadraticCurveTo(x, y + 1.5 * s, x - len / 2, y);
    ctx.fill();
    // the streak of foam blown down the back of it
    ctx.strokeStyle = rgba('#dfe8ea', 0.15);
    ctx.lineWidth = Math.max(1, s);
    ctx.beginPath();
    ctx.moveTo(x + len / 2, y + 1);
    ctx.lineTo(x + len * 1.4, y + 2 * s);
    ctx.stroke();
  }
  haze(ctx, HZ - 2, HZ + 50, '#9aa4aa', 0.6, 0.1);
  vfill(ctx, 0, PR.deck - 80, W, 84, [[0, 'rgba(4,12,18,0)'], [1, 'rgba(4,12,18,0.5)']]);
}

// ——— the pier ———

/** The deck beyond the table: boards laid across the pier, gaps between them showing the sea's dark below. */
function deck(ctx: Ctx, r: R): void {
  const y0 = PR.deck - 6;
  ctx.fillStyle = '#14100c';
  ctx.fillRect(0, y0, W, TY - y0 + 2);
  // boards laid across, foreshortened (each nearer one a little deeper)
  let y = y0;
  let i = 0;
  while (y < TY) {
    const h = 9 + i * 2.4;
    const col = shade('#8a7a68', (r() - 0.5) * 0.14 + i * 0.02);
    surface(ctx, r, { x: 0, y, w: W, h: h - 1.4 }, col, { vary: 0.4, cells: 6, mottle: 0.4, strokes: 0.8, strokeAng: 0, strokeLen: 200, strokeW: 3, grain: 0.2, seed: 70 + i });
    // the lit front arris of each board, its dark gap
    ctx.fillStyle = rgba('#fff2dc', 0.08);
    ctx.fillRect(0, y, W, 1);
    ctx.fillStyle = 'rgba(10,8,6,0.6)';
    ctx.fillRect(0, y + h - 1.4, W, 1.4);
    // butt joints and their nail heads
    for (let k = 0; k < 7; k++) {
      const x = r() * W;
      ctx.fillStyle = 'rgba(16,10,6,0.7)';
      ctx.fillRect(x, y, 1.6, h - 1.4);
      ctx.fillStyle = 'rgba(30,20,14,0.6)';
      ctx.fillRect(x - 5, y + h * 0.45, 2, 1.4);
      ctx.fillRect(x + 4, y + h * 0.45, 2, 1.4);
    }
    y += h;
    i++;
  }
  // salt-grey at the seaward edge, worn darker down the middle where people walk
  vfill(ctx, 0, y0, W, 16, [[0, 'rgba(200,210,210,0.25)'], [1, 'rgba(200,210,210,0)']]);
  grime(ctx, { x: 0, y: y0, w: W, h: TY - y0 }, { top: 10, bottom: 18, a: 0.35, patchy: 0.6, seed: 77, col: '#1a120c' });
  // the toe board along the edge, under the railing
  const tb = rectPath(-4, y0 - 10, W + 8, 12);
  solid(ctx, tb, { x: 0, y: y0 - 10, w: W, h: 12 }, 'wood', '#5a4a3c', { depth: 0.3, line: 1.2, formSize: 4 });
  crevice(ctx, 0, W, y0 + 2, 10, 0.5);
}

/** The cast-iron balustrade: square stanchions with capped tops, a mahogany handrail, a band of rings, balusters. */
function railing(ctx: Ctx, r: R): void {
  const { rail, railLow, deck: dk, posts, cap } = PR;
  const ringY = rail + 30;
  const midY = rail + 14;
  const sh = (p: PathFn) => groundCast(ctx, p, dk - 4, 0.3, 0.55, 0.32, 2.5, '#0e1a1e');
  // the railing's shadow on the deck boards: thrown towards us and to the right by the high sun behind it
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, dk - 6, W, TY - dk + 6);
  ctx.clip();
  sh((c) => {
    c.beginPath();
    for (let x = 0; x < W; x += 16) c.rect(x - 1.5, midY, 3, dk - midY);
    for (const px of posts) c.rect(px - 9, cap, 18, dk - cap);
    c.rect(0, railLow - 3, W, 6);
  });
  ctx.restore();
  // the balusters, dog-bars between them low down
  ctx.lineCap = 'butt';
  for (let x = 8; x < W; x += 16) {
    if (posts.some((p) => Math.abs(p - x) < 12)) continue;
    const top = ringY + 16;
    ctx.strokeStyle = IRON_INK;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, dk - 6);
    ctx.stroke();
    ctx.strokeStyle = IRON;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = rgba('#a8e0d4', 0.45);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 0.8, top);
    ctx.lineTo(x - 0.8, dk - 6);
    ctx.stroke();
    // a collar halfway down
    ctx.fillStyle = IRON_INK;
    ctx.fillRect(x - 3, ringY + 34, 6, 4);
    ctx.fillStyle = rgba('#5aa098', 0.9);
    ctx.fillRect(x - 2.5, ringY + 34, 5, 1.5);
  }
  // the bottom rail and the middle rail
  for (const [y, h] of [[railLow, 7], [midY, 6]] as const) {
    const p = rectPath(-4, y - h / 2, W + 8, h);
    solid(ctx, p, { x: 0, y: y - h / 2, w: W, h }, 'iron', IRON, { depth: 0.25, line: 1.4, ink: IRON_INK, formSize: 3 });
  }
  // the band of rings between the rails: each ring a cast loop, lit on its upper left
  for (let x = 8; x < W; x += 16) {
    if (posts.some((p) => Math.abs(p - x) < 12)) continue;
    ctx.strokeStyle = IRON_INK;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.ellipse(x, ringY + 8, 7, 8.5, 0, 0, P2);
    ctx.stroke();
    ctx.strokeStyle = IRON;
    ctx.lineWidth = 2.6;
    ctx.stroke();
    ctx.strokeStyle = rgba('#b0e8dc', 0.5);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.ellipse(x, ringY + 8, 7, 8.5, 0, Math.PI * 1.05, Math.PI * 1.6);
    ctx.stroke();
  }
  // the stanchions, capped, each with its bolt plates and the rust weeping from them
  for (const px of posts) {
    const p = rectPath(px - 8, cap + 6, 16, dk - cap - 8);
    solid(ctx, p, { x: px - 8, y: cap, w: 16, h: dk - cap }, 'iron', IRON, { depth: 0.25, line: 1.6, ink: IRON_INK, formSize: 5 });
    rim(ctx, p, 0.35, 2);
    // a raised panel cast in its face
    ctx.strokeStyle = rgba(IRON_INK, 0.5);
    ctx.lineWidth = 1;
    ctx.strokeRect(px - 4, ringY - 2, 8, 50);
    ctx.strokeStyle = rgba('#a0d8cc', 0.25);
    ctx.strokeRect(px - 5, ringY - 3, 8, 50);
    // the cap: a stepped block, its flat top catching the sky
    const capP = polyPath([[px - 12, cap + 8], [px - 10, cap], [px + 10, cap], [px + 12, cap + 8]]);
    solid(ctx, capP, { x: px - 12, y: cap, w: 24, h: 8 }, 'iron', IRON, { depth: 0.25, line: 1.4, ink: IRON_INK, formSize: 3 });
    ctx.fillStyle = rgba('#d8f0ea', 0.5);
    ctx.fillRect(px - 9, cap, 18, 1.6);
    // gull lime on the caps (the gull's post the worst)
    if (r() < 0.6 || px === PR.gull.x) {
      ctx.fillStyle = rgba('#f4f2ea', 0.75);
      for (let k = 0; k < (px === PR.gull.x ? 5 : 2); k++) {
        const sx = px - 8 + r() * 16;
        ctx.fillRect(sx, cap + 4, 1.6 + r() * 2, 4 + r() * 10);
      }
    }
    for (const by of [rail + 16, railLow]) {
      ctx.fillStyle = '#4a2a1a';
      ctx.beginPath();
      ctx.arc(px, by, 2.4, 0, P2);
      ctx.fill();
      streaks(ctx, r, px - 3, by + 2, 6, 14 + r() * 20, '#8a4a22', 0.35, 2);
    }
  }
  // the handrail: salt-worn mahogany, rounded, its top polished pale by hands
  const hp = rrPath(-6, rail - 6, W + 12, 13, 6);
  castShadow(ctx, hp, 4, 6, 0.3, '#0e1a1e');
  solid(ctx, hp, { x: 0, y: rail - 6, w: W, h: 13 }, 'wood', RAILWOOD, { depth: 0.22, line: 1.6, formSize: 4 });
  within(ctx, hp, () => {
    vfill(ctx, 0, rail - 6, W, 13, [[0, 'rgba(255,230,200,0.3)'], [0.35, 'rgba(255,230,200,0.08)'], [0.7, 'rgba(20,8,4,0)'], [1, 'rgba(20,8,4,0.45)']]);
    lay(ctx, noiseMask(30, 81, { cover: 0.35, soft: 0.15, col: '#c8bca8', w: 300, h: 6 }), { x: 0, y: rail - 6, w: W, h: 6 }, 0.35);
  });
  // rust and salt bloom along the bottom rail
  lay(ctx, noiseMask(26, 83, { cover: 0.3, soft: 0.2, col: '#8a4a26', w: 300, h: 8 }), { x: 0, y: railLow - 3, w: W, h: 8 }, 0.45);
  lay(ctx, noiseMask(30, 85, { cover: 0.3, soft: 0.2, col: '#e8ece4', w: 300, h: 10 }), { x: 0, y: dk - 16, w: W, h: 10 }, 0.25);
}

/** The lamp standard: a fluted cast-iron column on a flared plinth, two opal globes on scrolled arms. */
function lampPath(): PathFn {
  const { x, base, arm } = PR.lamp;
  return (c) => {
    c.beginPath();
    c.moveTo(x - 30, base);
    c.lineTo(x - 26, base - 18);
    c.quadraticCurveTo(x - 16, base - 40, x - 15, base - 84);
    c.lineTo(x - 10, arm + 20);
    c.lineTo(x - 12, arm);
    c.lineTo(x + 12, arm);
    c.lineTo(x + 10, arm + 20);
    c.lineTo(x + 15, base - 84);
    c.quadraticCurveTo(x + 16, base - 40, x + 26, base - 18);
    c.lineTo(x + 30, base);
    c.closePath();
  };
}

const LAMP_GLOBES: [number, number][] = [[PR.lamp.x - 62, PR.lamp.arm - 34], [PR.lamp.x + 62, PR.lamp.arm - 34]];

function lamp(ctx: Ctx, r: R): void {
  const { x, base, arm } = PR.lamp;
  const p = lampPath();
  // its shadow laid along the deck towards us and to the right (the high sun is out over the sea)
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - 40, base - 24, 210, TY - base + 24);
  ctx.clip();
  groundCast(ctx, p, base, 0.22, 0.07, 0.4, 3, '#0e1a1e');
  ctx.restore();
  groundShadow(ctx, x + 18, base, 46, 7, 0.5, '#0e1414', 1.4);
  castShadow(ctx, p, 8, 10, 0.25, '#0e1a1e');
  solid(ctx, p, { x: x - 30, y: arm, w: 60, h: base - arm }, 'iron', IRON, { depth: 0.12, ink: IRON_INK, formSize: 10 });
  within(ctx, p, () => {
    // flutes down the column, each lit on its left edge
    for (let k = -2; k <= 2; k++) {
      ctx.strokeStyle = rgba(IRON_INK, 0.45);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x + k * 4.2, arm + 26);
      ctx.lineTo(x + k * 5.6, base - 92);
      ctx.stroke();
      ctx.strokeStyle = rgba('#a8e0d4', 0.25);
      ctx.beginPath();
      ctx.moveTo(x + k * 4.2 - 1.4, arm + 26);
      ctx.lineTo(x + k * 5.6 - 1.4, base - 92);
      ctx.stroke();
    }
    // the plinth's band: a cast wreath, a dolphin's head in relief
    ctx.fillStyle = rgba(IRON_INK, 0.4);
    ctx.fillRect(x - 30, base - 70, 60, 3);
    ctx.fillRect(x - 30, base - 22, 60, 3);
    ctx.fillStyle = rgba('#a8e0d4', 0.3);
    ctx.fillRect(x - 30, base - 73, 60, 1.5);
    ctx.strokeStyle = rgba('#a8e0d4', 0.35);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(x - 2, base - 46, 9, Math.PI * 0.8, Math.PI * 2.1);
    ctx.stroke();
    ctx.strokeStyle = rgba(IRON_INK, 0.5);
    ctx.beginPath();
    ctx.arc(x, base - 44, 9, Math.PI * 0.8, Math.PI * 2.1);
    ctx.stroke();
    // salt and rust: rust weeping from the base's joint, paint flaking at the foot
    streaks(ctx, r, x - 20, base - 70, 40, 30, '#8a4a22', 0.3, 4);
    lay(ctx, noiseMask(18, 87, { cover: 0.35, soft: 0.2, col: '#d8ddd4', w: 64, h: 40 }), { x: x - 30, y: base - 26, w: 60, h: 26 }, 0.35);
  });
  // a hook for the lifebuoy on the column
  ctx.strokeStyle = IRON_INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 6, PR.buoy.hookY - 8);
  ctx.quadraticCurveTo(x + 18, PR.buoy.hookY - 6, x + 12, PR.buoy.hookY + 2);
  ctx.stroke();
  // the arms: scrolled brackets swept out to the globes
  for (const s of [-1, 1]) {
    const gx = x + s * 62;
    const gy = arm - 34;
    const armP: PathFn = (c) => {
      c.beginPath();
      c.moveTo(x, arm + 4);
      c.quadraticCurveTo(x + s * 40, arm - 6, gx, gy + 18);
      c.lineTo(gx - s * 1, gy + 24);
      c.quadraticCurveTo(x + s * 38, arm + 2, x, arm + 12);
      c.closePath();
    };
    solid(ctx, armP, { x: Math.min(x, gx) - 4, y: gy, w: 70, h: arm - gy + 14 }, 'iron', IRON, { depth: 0.12, ink: IRON_INK, line: 2, formSize: 3 });
    // the scroll curling under it
    ctx.strokeStyle = IRON_INK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + s * 4, arm + 26);
    ctx.bezierCurveTo(x + s * 34, arm + 26, x + s * 44, arm + 4, x + s * 30, arm - 2);
    ctx.stroke();
    ctx.strokeStyle = IRON;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + s * 30, arm + 4, 5, 0, P2);
    ctx.strokeStyle = IRON_INK;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    // the gallery cup the globe sits in
    const cup = polyPath([[gx - 13, gy + 14], [gx + 13, gy + 14], [gx + 8, gy + 24], [gx - 8, gy + 24]]);
    solid(ctx, cup, { x: gx - 13, y: gy + 14, w: 26, h: 10 }, 'iron', IRON, { depth: 0.12, ink: IRON_INK, line: 1.8, formSize: 3 });
    globe(ctx, gx, gy, false);
  }
  // the finial: a crown and a spike over the column
  const fin = polyPath([[x - 10, arm], [x - 6, arm - 18], [x, arm - 44], [x + 6, arm - 18], [x + 10, arm]]);
  solid(ctx, fin, { x: x - 10, y: arm - 44, w: 20, h: 44 }, 'iron', IRON, { depth: 0.12, ink: IRON_INK, line: 1.8, formSize: 3 });
  ctx.fillStyle = '#c8a040';
  ctx.beginPath();
  ctx.arc(x, arm - 46, 4, 0, P2);
  ctx.fill();
  ctx.strokeStyle = IRON_INK;
  ctx.lineWidth = 1.4;
  ctx.stroke();
}

/** An opal glass globe (lit: glowing from inside; unlit: milky, the sky reflected in it). */
function globe(ctx: Ctx, x: number, y: number, lit: boolean): void {
  const rr = 17;
  const g = ctx.createRadialGradient(x - 5, y - 6, 1, x, y, rr);
  if (lit) {
    g.addColorStop(0, '#fffef0');
    g.addColorStop(0.6, '#ffe8b0');
    g.addColorStop(1, '#e8b870');
  } else {
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.5, '#e8eef0');
    g.addColorStop(1, '#9aaab4');
  }
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, rr, 0, P2);
  ctx.fill();
  ctx.strokeStyle = IRON_INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  // the window's reflection and a cool rim
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.ellipse(x - 6, y - 7, 4, 2.4, -0.6, 0, P2);
  ctx.fill();
  ctx.strokeStyle = rgba('#5a7aa0', 0.35);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, rr - 2, 0.1, 1.3);
  ctx.stroke();
  // its crown
  ctx.fillStyle = IRON;
  ctx.beginPath();
  ctx.ellipse(x, y - rr + 1, 6, 3, 0, 0, P2);
  ctx.fill();
  ctx.strokeStyle = IRON_INK;
  ctx.lineWidth = 1.4;
  ctx.stroke();
}

/** The lifebuoy hung from its hook on the lamp's column by a loop of rope (a sprite: it swings). */
function buoy(ctx: Ctx): void {
  const { hookY, cy, r: R0 } = PR.buoy;
  const x = PR.lamp.x + 14;
  // the rope loop to the hook
  hang(ctx, x - 2, hookY, x - 20, cy - R0 + 6, 4, '#c8b088', 2.4);
  hang(ctx, x - 2, hookY, x + 18, cy - R0 + 6, 4, '#c8b088', 2.4);
  const ring: PathFn = (c) => {
    c.beginPath();
    c.arc(x, cy, R0, 0, P2);
    c.moveTo(x + R0 * 0.52, cy);
    c.arc(x, cy, R0 * 0.52, 0, P2, true);
  };
  aoHalo(ctx, ring, 8, 0.4, '#0a1414', 6);
  solid(ctx, ring, { x: x - R0, y: cy - R0, w: R0 * 2, h: R0 * 2 }, 'rubber', '#f2ece0', { depth: 0.1, line: 2.4, formSize: 12 });
  within(ctx, ring, () => {
    // four red quarters, faded by the sun on their upper sides
    for (let k = 0; k < 4; k++) {
      const a0 = (k / 4) * P2 + 0.4;
      ctx.fillStyle = k % 2 ? '#c83a26' : 'rgba(0,0,0,0)';
      if (k % 2) {
        ctx.beginPath();
        ctx.moveTo(x, cy);
        ctx.arc(x, cy, R0 + 2, a0, a0 + P2 / 4);
        ctx.closePath();
        ctx.fill();
      }
    }
    // the ring's round section: lit along its upper-left curve, shaded lower right, a crease of shadow inside
    const g = ctx.createLinearGradient(x - R0, cy - R0, x + R0, cy + R0);
    g.addColorStop(0, 'rgba(255,250,240,0.35)');
    g.addColorStop(0.5, 'rgba(255,250,240,0)');
    g.addColorStop(1, 'rgba(20,20,40,0.4)');
    ctx.fillStyle = g;
    ctx.fillRect(x - R0, cy - R0, R0 * 2, R0 * 2);
    ctx.strokeStyle = 'rgba(30,20,30,0.3)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, cy, R0 * 0.76, 0, P2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, cy, R0 * 0.86, Math.PI * 1.05, Math.PI * 1.5);
    ctx.stroke();
    // grime and salt where it's been handled
    lay(ctx, noiseMask(12, 89, { cover: 0.3, soft: 0.2, col: '#6a5a4a', w: 40, h: 40 }), { x: x - R0, y: cy - R0, w: R0 * 2, h: R0 * 2 }, 0.3);
  });
  // the grab line round it, looped through four seizings
  ctx.strokeStyle = '#d8c49a';
  ctx.lineWidth = 2.4;
  for (let k = 0; k < 4; k++) {
    const a0 = (k / 4) * P2 + 0.4 + 0.3;
    const a1 = a0 + P2 / 4 - 0.6;
    ctx.beginPath();
    ctx.arc(x, cy, R0 + 3, a0, a1);
    ctx.stroke();
    const sx = x + Math.cos(a1 + 0.3) * R0;
    const sy = cy + Math.sin(a1 + 0.3) * R0;
    ctx.fillStyle = '#8a7450';
    ctx.fillRect(sx - 2.5, sy - 2.5, 5, 5);
  }
  // its name stencilled on a white quarter
  ctx.save();
  ctx.translate(x, cy);
  ctx.fillStyle = 'rgba(40,40,60,0.7)';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.rotate(-0.9);
  ctx.fillText('FEETZA', 0, -R0 * 0.62);
  ctx.restore();
}

const BUOY_BOX = { x: PR.lamp.x - 60, y: PR.buoy.hookY - 14, w: 140, h: PR.buoy.r * 2 + 92 };

/** The sea viewer's pedestal (still) and its head (a sprite: it nods on its yoke). */
function viewerPost(ctx: Ctx, r: R): void {
  const { x, base } = PR.viewer;
  const p: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - 34, base);
    c.quadraticCurveTo(x - 30, base - 16, x - 14, base - 22);
    c.lineTo(x - 9, base - 150);
    c.lineTo(x + 9, base - 150);
    c.lineTo(x + 14, base - 22);
    c.quadraticCurveTo(x + 30, base - 16, x + 34, base);
    c.closePath();
  };
  groundShadow(ctx, x + 18, base, 44, 7, 0.5, '#0e1414', 1.4);
  castShadow(ctx, p, 6, 8, 0.25, '#0e1a1e');
  solid(ctx, p, { x: x - 34, y: base - 150, w: 68, h: 150 }, 'enamel', '#8a1e22', { depth: 0.12, formSize: 8 });
  within(ctx, p, () => {
    lay(ctx, noiseMask(16, 91, { cover: 0.35, soft: 0.2, col: '#4a2a1e', w: 60, h: 120 }), { x: x - 34, y: base - 150, w: 68, h: 150 }, 0.3);
    streaks(ctx, r, x - 8, base - 96, 16, 50, '#6a3a1e', 0.25, 3);
  });
  // the coin box on the column with its brass slot and plate
  const box = rrPath(x - 16, base - 120, 32, 40, 4);
  solid(ctx, box, { x: x - 16, y: base - 120, w: 32, h: 40 }, 'enamel', '#9a2226', { depth: 0.1, formSize: 6 });
  ctx.fillStyle = '#d8b050';
  ctx.fillRect(x - 6, base - 112, 12, 3);
  ctx.strokeStyle = '#3a2410';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 6, base - 112, 12, 3);
  ctx.fillStyle = '#e8dcb8';
  ctx.fillRect(x - 11, base - 102, 22, 14);
  ctx.fillStyle = '#3a2a24';
  ctx.font = 'bold 6px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('VIEW 20p', x, base - 96);
  ctx.fillText('THE SEA', x, base - 90);
  // the yoke
  ctx.strokeStyle = '#2a0c0e';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x - 20, base - 176);
  ctx.lineTo(x - 18, base - 150);
  ctx.lineTo(x + 18, base - 150);
  ctx.lineTo(x + 20, base - 176);
  ctx.stroke();
  ctx.strokeStyle = '#a82a2e';
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

function viewerHead(ctx: Ctx): void {
  const { x, base } = PR.viewer;
  const y = base - 180;
  // the binocular head: a rounded body, its hood over the eyepieces turned towards us, the lenses to the sea
  const body = rrPath(x - 40, y - 22, 80, 40, 14);
  castShadow(ctx, body, 5, 6, 0.25, '#0e1a1e');
  solid(ctx, body, { x: x - 40, y: y - 22, w: 80, h: 40 }, 'enamel', '#a82428', { depth: 0.1, formSize: 12 });
  within(ctx, body, () => {
    vfill(ctx, x - 40, y - 22, 80, 40, [[0, 'rgba(255,230,220,0.25)'], [0.4, 'rgba(255,230,220,0)'], [1, 'rgba(30,6,8,0.35)']]);
    lay(ctx, noiseMask(14, 93, { cover: 0.3, soft: 0.2, col: '#5a2a1e', w: 60, h: 30 }), { x: x - 40, y: y - 22, w: 80, h: 40 }, 0.3);
  });
  // the hood and the two brass-rimmed eyepieces
  const hood = rrPath(x - 32, y - 2, 64, 22, 8);
  solid(ctx, hood, { x: x - 32, y: y - 2, w: 64, h: 22 }, 'rubber', '#2a2224', { depth: 0.1, formSize: 6 });
  for (const s of [-1, 1]) {
    const ex = x + s * 15;
    // a rubber eyecup, deep in the hood's shadow, a glint of the lens at the back
    ctx.fillStyle = '#141012';
    ctx.beginPath();
    ctx.ellipse(ex, y + 11, 9, 6, 0, 0, P2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,110,110,0.5)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(ex, y + 11, 9, 6, 0, Math.PI * 1.1, Math.PI * 1.8);
    ctx.stroke();
    ctx.fillStyle = 'rgba(150,190,220,0.35)';
    ctx.beginPath();
    ctx.ellipse(ex - 1, y + 10, 2.4, 1.4, -0.4, 0, P2);
    ctx.fill();
  }
  // the hood's brim shading the eyecups
  const brim = rrPath(x - 36, y - 6, 72, 9, 4);
  solid(ctx, brim, { x: x - 36, y: y - 6, w: 72, h: 9 }, 'enamel', '#8a1c20', { depth: 0.1, formSize: 4 });
  vfill(ctx, x - 32, y + 3, 64, 8, [[0, 'rgba(10,4,4,0.55)'], [1, 'rgba(10,4,4,0)']]);
  // the pivot boss on each side
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#d8b050';
    ctx.beginPath();
    ctx.arc(x + s * 40, y + 4, 4.5, 0, P2);
    ctx.fill();
    ctx.strokeStyle = '#3a2410';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
}

const VIEWER_HEAD_BOX = { x: PR.viewer.x - 56, y: PR.viewer.base - 216, w: 112, h: 60 };

// ——— the gull ———

interface GullPose {
  /** 0 … 1: the neck stretched up (the long call). */
  stretch: number;
  /** 0 … 1: the head thrown back. */
  back: number;
  /** 0 … 1: the bill open. */
  open: number;
  /** -1 … 1: the head tilted (down … up). */
  tilt: number;
  /** Breathing: the body's swell (0 … 1). */
  breath: number;
  /** 0 … 1: crouched (about to leap). */
  crouch: number;
}

/** A herring gull standing, side on, facing left, its feet at (x, y), about 76 px tall at scale 1. */
export function gullStanding(c: Ctx, x: number, y: number, s: number, p: GullPose): void {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  const cr = p.crouch;
  const by = -cr * 6;
  // the legs (pink, scaly) and webbed feet gripping the cap
  c.lineCap = 'round';
  for (const [lx, dl] of [[3, 0], [-4, 1]] as const) {
    c.strokeStyle = '#4a2a2a';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(lx + 2, by - 18);
    c.lineTo(lx - 1 + cr * 2, -6 + cr * 1);
    c.lineTo(lx, 0);
    c.stroke();
    c.strokeStyle = dl ? '#d88a84' : '#e8a49c';
    c.lineWidth = 2.4;
    c.stroke();
    c.fillStyle = dl ? '#c87a74' : '#e09890';
    c.beginPath();
    c.moveTo(lx, -1);
    c.lineTo(lx - 9, 0.5);
    c.lineTo(lx - 7, 1.6);
    c.lineTo(lx + 3, 1.6);
    c.closePath();
    c.fill();
  }
  const sw = 1 + p.breath * 0.03;
  // the body: a teardrop, the chest full, the tail tapering off right
  const neckX = -14 - p.stretch * 2 + p.back * 4;
  const headX = -20 - p.stretch * 2 + p.back * 9;
  const headY = by - 58 - p.stretch * 12 + p.back * 2 - cr * 2;
  const body: PathFn = (q) => {
    q.beginPath();
    q.moveTo(40, by - 32);
    q.bezierCurveTo(26, by - 44 * sw, 4, by - 50 * sw, neckX + 6, by - 46);
    q.quadraticCurveTo(neckX - 2, headY + 16, headX + 6, headY + 4);
    q.lineTo(headX - 2, headY + 9);
    q.quadraticCurveTo(neckX - 8, headY + 22, -20 * sw, by - 32);
    q.bezierCurveTo(-21 * sw, by - 18, -4, by - 13 * sw, 14, by - 18);
    q.quadraticCurveTo(28, by - 22, 40, by - 30);
    q.closePath();
  };
  c.save();
  const bg = c.createLinearGradient(-20, by - 56, 20, by - 10);
  bg.addColorStop(0, '#ffffff');
  bg.addColorStop(0.55, '#eef0f2');
  bg.addColorStop(1, '#9aa6ba');
  body(c);
  c.fillStyle = bg;
  c.fill();
  c.restore();
  // the head
  const hr = 10.5;
  const hg = c.createRadialGradient(headX - 3, headY - 4, 1, headX, headY, hr + 2);
  hg.addColorStop(0, '#ffffff');
  hg.addColorStop(0.7, '#f0f2f4');
  hg.addColorStop(1, '#b8c0cc');
  c.fillStyle = hg;
  c.beginPath();
  c.ellipse(headX, headY, hr + 1, hr, -0.1 - p.back * 0.5 + p.tilt * 0.15, 0, P2);
  c.fill();
  // the folded wing: grey mantle over the back, white tertial crescent, black primaries crossed over the tail
  const wing: PathFn = (q) => {
    q.beginPath();
    q.moveTo(neckX + 8, by - 44);
    q.bezierCurveTo(10, by - 50 * sw, 34, by - 42, 52, by - 30);
    q.lineTo(54, by - 27);
    q.bezierCurveTo(36, by - 26, 16, by - 24, -6, by - 30);
    q.quadraticCurveTo(neckX + 4, by - 36, neckX + 8, by - 44);
    q.closePath();
  };
  wing(c);
  const wg = c.createLinearGradient(0, by - 50, 0, by - 24);
  wg.addColorStop(0, '#b8c4d0');
  wg.addColorStop(0.6, '#9aa8b8');
  wg.addColorStop(1, '#7a8698');
  c.fillStyle = wg;
  c.fill();
  // the primaries: black, with white mirrors at the tips
  c.fillStyle = '#16181c';
  c.beginPath();
  c.moveTo(28, by - 36);
  c.quadraticCurveTo(44, by - 34, 56, by - 28);
  c.lineTo(52, by - 25);
  c.quadraticCurveTo(38, by - 26, 26, by - 28);
  c.closePath();
  c.fill();
  c.fillStyle = '#f4f4f4';
  for (const [mx, my] of [[50, by - 28.5], [44, by - 28]] as const) {
    c.beginPath();
    c.ellipse(mx, my, 1.8, 1.1, 0.3, 0, P2);
    c.fill();
  }
  // the white trailing edge of the secondaries and tertials
  c.strokeStyle = 'rgba(255,255,255,0.85)';
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(-4, by - 30.5);
  c.quadraticCurveTo(12, by - 26, 28, by - 28.5);
  c.stroke();
  c.strokeStyle = 'rgba(70,80,100,0.4)';
  c.lineWidth = 1;
  for (const k of [0, 1, 2]) {
    c.beginPath();
    c.moveTo(4 + k * 7, by - 41 + k);
    c.quadraticCurveTo(10 + k * 7, by - 35, 8 + k * 8, by - 30);
    c.stroke();
  }
  // the bill: yellow, hooked, the red spot on the lower mandible; it opens
  const bx = headX - hr + 2;
  const byy = headY + 2;
  const ang = -0.12 - p.back * 0.7 + p.tilt * 0.2;
  c.save();
  c.translate(bx, byy);
  c.rotate(ang);
  const open = p.open * 0.45;
  // lower mandible
  c.save();
  c.rotate(-open * 0.6);
  c.fillStyle = '#e8b830';
  c.beginPath();
  c.moveTo(1, 0);
  c.lineTo(-16, 1.5);
  c.quadraticCurveTo(-13, 4.5, -6, 4);
  c.lineTo(2, 3.5);
  c.closePath();
  c.fill();
  c.fillStyle = '#d8382a';
  c.beginPath();
  c.ellipse(-12, 2.6, 2, 1.4, 0, 0, P2);
  c.fill();
  c.strokeStyle = '#5a3a10';
  c.lineWidth = 0.8;
  c.stroke();
  c.restore();
  // the mouth's inside when open
  if (p.open > 0.1) {
    c.fillStyle = '#c04a4a';
    c.beginPath();
    c.moveTo(1, 0.5);
    c.lineTo(-12, 0.5);
    c.lineTo(-10 * Math.cos(open), 0.5 + 10 * Math.sin(open));
    c.closePath();
    c.fill();
  }
  // upper mandible with its hook
  c.save();
  c.rotate(open * 0.4);
  c.fillStyle = '#f4c838';
  c.beginPath();
  c.moveTo(2, -4.5);
  c.quadraticCurveTo(-8, -5, -15, -2.5);
  c.quadraticCurveTo(-19, -1.5, -17, 2);
  c.quadraticCurveTo(-15, 0.4, -12, 0.6);
  c.lineTo(2, 0.8);
  c.closePath();
  c.fill();
  c.strokeStyle = '#6a4a10';
  c.lineWidth = 0.9;
  c.stroke();
  c.fillStyle = 'rgba(255,255,230,0.6)';
  c.fillRect(-10, -4, 8, 1.2);
  c.restore();
  c.restore();
  // the eye: pale iris, black pupil, the orange-red ring, a glint
  const ex = headX - 4 + p.back * 1;
  const ey = headY - 2;
  c.fillStyle = '#d84a2a';
  c.beginPath();
  c.arc(ex, ey, 2.8, 0, P2);
  c.fill();
  c.fillStyle = '#f4e8a0';
  c.beginPath();
  c.arc(ex, ey, 2, 0, P2);
  c.fill();
  c.fillStyle = '#101010';
  c.beginPath();
  c.arc(ex - 0.3, ey, 1, 0, P2);
  c.fill();
  c.fillStyle = '#ffffff';
  c.fillRect(ex - 1.2, ey - 1.4, 0.9, 0.9);
  // one outline round the whole bird (body, head, wing), thin
  c.strokeStyle = '#2a3040';
  c.lineWidth = 1.4;
  body(c);
  c.stroke();
  wing(c);
  c.stroke();
  c.beginPath();
  c.ellipse(headX, headY, hr + 1, hr, -0.1 - p.back * 0.5 + p.tilt * 0.15, Math.PI * 1.2, Math.PI * 2.35);
  c.stroke();
  c.restore();
}

/**
 * A herring gull flying left, side on, at a phase of its wingbeat (0 … 1 loops: the downstroke from the top, then the
 * upstroke with the hand folded back), body centre at (x, y). `glide` (0 … 1) holds the wings out flat.
 */
export function gullFlying(c: Ctx, x: number, y: number, s: number, ph: number, glide = 0): void {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  const e = Math.cos(ph * P2) * (1 - glide) + glide * 0.15;
  // the hand lags the arm: folded back on the upstroke, spread on the down
  const lag = Math.sin(ph * P2) * (1 - glide);
  const wingAt = (near: boolean) => {
    const sh = near ? [2, -3] : [6, -6];
    const k = near ? 1 : 0.8;
    const arm = 30 * k;
    const hand = 36 * k * (1 - Math.max(0, lag) * 0.35);
    const aa = -Math.PI / 2 + (1 - e) * 1.25;
    const wx = sh[0] + Math.cos(aa) * arm * 0.35 + 6;
    const wy = sh[1] + Math.sin(aa) * arm;
    const ha = aa + 0.25 + lag * 0.5;
    const tx = wx + Math.cos(ha) * hand * 0.4 + 14;
    const ty = wy + Math.sin(ha) * hand;
    const chord = 12 * k;
    const p: PathFn = (q) => {
      q.beginPath();
      q.moveTo(sh[0] - 8, sh[1]);
      q.quadraticCurveTo((sh[0] + wx) / 2 - 6, (sh[1] + wy) / 2, wx - 4, wy);
      q.quadraticCurveTo((wx + tx) / 2 - 4, (wy + ty) / 2, tx, ty);
      q.quadraticCurveTo((wx + tx) / 2 + chord * 0.6, (wy + ty) / 2 + chord * 0.2, wx + chord, wy + chord * 0.3 * Math.sign(wy - sh[1] || 1));
      q.quadraticCurveTo((sh[0] + wx) / 2 + chord, (sh[1] + wy) / 2, sh[0] + 14, sh[1]);
      q.closePath();
    };
    p(c);
    const g = c.createLinearGradient(sh[0], sh[1], tx, ty);
    g.addColorStop(0, near ? '#b4c0cc' : '#8a96a6');
    g.addColorStop(0.62, near ? '#a4b0c0' : '#7a8696');
    g.addColorStop(0.75, '#16181c');
    g.addColorStop(1, '#16181c');
    c.fillStyle = g;
    c.fill();
    c.strokeStyle = '#2a3040';
    c.lineWidth = 1.2;
    c.stroke();
    // the white trailing edge and a mirror at the tip
    c.fillStyle = 'rgba(255,255,255,0.9)';
    c.beginPath();
    c.ellipse(tx - (tx - wx) * 0.1, ty - (ty - wy) * 0.1, 1.8, 1.2, 0, 0, P2);
    c.fill();
  };
  wingAt(false);
  // the body: a torpedo, white beneath, the grey of the mantle along its back
  const body: PathFn = (q) => {
    q.beginPath();
    q.moveTo(-30, -4);
    q.quadraticCurveTo(-24, -12, -12, -8);
    q.quadraticCurveTo(10, -10, 34, -2);
    q.lineTo(38, 1);
    q.quadraticCurveTo(14, 8, -12, 5);
    q.quadraticCurveTo(-26, 4, -30, -4);
    q.closePath();
  };
  body(c);
  const bg = c.createLinearGradient(0, -10, 0, 8);
  bg.addColorStop(0, '#f8f8fa');
  bg.addColorStop(0.6, '#e8ecf0');
  bg.addColorStop(1, '#a0aabc');
  c.fillStyle = bg;
  c.fill();
  c.strokeStyle = '#2a3040';
  c.lineWidth = 1.3;
  c.stroke();
  // head, bill, eye, the feet tucked under
  c.fillStyle = '#f4c838';
  c.beginPath();
  c.moveTo(-29, -5);
  c.lineTo(-40, -3);
  c.quadraticCurveTo(-41, -1, -38, -0.5);
  c.lineTo(-29, -1.5);
  c.closePath();
  c.fill();
  c.strokeStyle = '#6a4a10';
  c.lineWidth = 0.8;
  c.stroke();
  c.fillStyle = '#d8382a';
  c.fillRect(-36, -2, 2, 1.4);
  c.fillStyle = '#101010';
  c.beginPath();
  c.arc(-24, -6.5, 1.2, 0, P2);
  c.fill();
  c.fillStyle = '#e8a49c';
  c.beginPath();
  c.ellipse(16, 5.5, 5, 1.6, 0.1, 0, P2);
  c.fill();
  wingAt(true);
  c.restore();
}

/** The still's gull, standing on its post. */
function gullStill(ctx: Ctx): void {
  groundShadow(ctx, PR.gull.x + 8, PR.gull.y + 2, 18, 2.5, 0.35, '#0e1a1e', 0.6);
  gullStanding(ctx, PR.gull.x, PR.gull.y + 4, 1.2, { stretch: 0, back: 0, open: 0, tilt: 0, breath: 0.5, crouch: 0 });
}

// ——— the table ———

function table(ctx: Ctx, r: R): void {
  // sea-bleached pier timber: silver-grey planks, salt in the grain, iron bolt heads rusting
  planksPlane(ctx, r, PR.front, '#a49684', 0.24, 0.01);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, PR.front - TY + 4);
  ctx.clip();
  lay(ctx, drift('#e8e4dc', '#5a5048', 5, 95, 256, 48), { x: 0, y: TY, w: W, h: PR.front - TY }, 0.18);
  lay(ctx, noiseMask(40, 97, { cover: 0.25, soft: 0.15, col: '#f0f0ea', w: 384, h: 64 }), { x: 0, y: TY, w: W, h: PR.front - TY }, 0.12);
  // bolt heads in rows across the planks, each with its rust bloom
  for (const z of [ZB * 0.92, ZB * 0.62]) {
    const y = yAt(z);
    for (let X = -2.88; X < 2.88; X += 0.24) {
      const bx = xAt(X + 0.12, z);
      const s = 1210 / z;
      ctx.fillStyle = rgba('#7a3a1a', 0.3);
      ctx.beginPath();
      ctx.ellipse(bx + 2, y + 2, s * 0.03, s * 0.012, 0, 0, P2);
      ctx.fill();
      ctx.fillStyle = '#2a1c16';
      ctx.beginPath();
      ctx.ellipse(bx, y, s * 0.012, s * 0.005, 0, 0, P2);
      ctx.fill();
      ctx.fillStyle = rgba('#d8c8b0', 0.4);
      ctx.fillRect(bx - s * 0.008, y - s * 0.004, s * 0.008, 1);
    }
  }
  // the sky's light on the bleached wood: pale and cool at the back, the sun's warmth on the left
  vfill(ctx, 0, TY, W, 120, [[0, 'rgba(220,236,240,0.16)'], [1, 'rgba(220,236,240,0)']]);
  lightPool(ctx, PR.sun.x + 100, TY + 60, 700, 120, '#fff4d8', 0.1, 'screen');
  // warm where the sun reaches from the left, cooling to the right
  const lg = ctx.createLinearGradient(0, 0, W, 0);
  lg.addColorStop(0, 'rgba(255,226,180,0.1)');
  lg.addColorStop(0.5, 'rgba(255,226,180,0)');
  lg.addColorStop(1, 'rgba(70,90,140,0.1)');
  ctx.fillStyle = lg;
  ctx.fillRect(0, TY, W, PR.front - TY);
  ctx.restore();
  tableFalloff(ctx, PR.front, 0.32, '#1a1410');
  tableSeam(ctx, 0.45, '#1a120c', false);
  // the front: the slab's thick edge, weathered, an iron strap bolted across each joint
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, PR.front, W, 1080 - PR.front);
  ctx.clip();
  surface(ctx, r, { x: 0, y: PR.front, w: W, h: 40 }, '#6a5e52', { vary: 0.4, cells: 8, strokes: 1, strokeAng: 0, strokeLen: 160, strokeW: 3, grain: 0.25, seed: 99 });
  vfill(ctx, 0, PR.front, W, 40, [[0, 'rgba(255,240,220,0.18)'], [0.2, 'rgba(20,14,10,0)'], [1, 'rgba(20,14,10,0.5)']]);
  for (let x = 120; x < W; x += 340) {
    ctx.fillStyle = '#3a3634';
    ctx.fillRect(x, PR.front + 4, 26, 36);
    ctx.fillStyle = rgba('#8a8a88', 0.5);
    ctx.fillRect(x, PR.front + 4, 26, 2);
    for (const by of [PR.front + 12, PR.front + 28]) {
      ctx.fillStyle = '#1a1614';
      ctx.beginPath();
      ctx.arc(x + 13, by, 3, 0, P2);
      ctx.fill();
    }
    streaks(ctx, r, x, PR.front + 30, 26, 12, '#7a3a1a', 0.4, 3);
  }
  ctx.restore();
  ctx.fillStyle = rgba('#f4ece0', 0.35);
  ctx.fillRect(0, PR.front - 3, W, 3);
  ctx.fillStyle = 'rgba(20,12,8,0.75)';
  ctx.fillRect(0, PR.front, W, 2);
}

/** A cone of chips in newspaper on the table's left corner, a wooden fork stuck in, salt crystals spilled round it. */
function chips(ctx: Ctx, r: R): void {
  const x = 150;
  const y = 870;
  groundShadow(ctx, x + 30, y + 6, 90, 12, 0.45, '#1a1410', 1.3);
  // the cone lies on its side, its mouth to the right, chips spilling out
  const cone: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - 80, y - 10);
    c.lineTo(x + 40, y - 52);
    c.quadraticCurveTo(x + 62, y - 26, x + 48, y + 6);
    c.closePath();
  };
  solid(ctx, cone, { x: x - 80, y: y - 52, w: 142, h: 58 }, 'canvas', '#ece6d6', { depth: 0.04, formSize: 10, line: 2 });
  within(ctx, cone, () => {
    // newsprint: columns of grey type, a headline, grease spots soaking through
    ctx.fillStyle = 'rgba(60,60,64,0.32)';
    for (let row = 0; row < 9; row++) {
      for (let k = 0; k < 6; k++) {
        const lx = x - 70 + k * 22 + row * 3;
        const ly = y - 40 + row * 5 + k * -3.4;
        ctx.fillRect(lx, ly, 16 + r() * 4, 1.4);
      }
    }
    ctx.fillStyle = 'rgba(30,30,34,0.6)';
    ctx.save();
    ctx.translate(x - 30, y - 26);
    ctx.rotate(-0.33);
    ctx.font = 'bold 12px serif';
    ctx.fillText('FEET SIGHTED', 0, 0);
    ctx.restore();
    for (let k = 0; k < 5; k++) {
      ctx.fillStyle = rgba('#c8a868', 0.35);
      ctx.beginPath();
      ctx.ellipse(x - 50 + r() * 90, y - 30 + r() * 26, 8 + r() * 8, 5 + r() * 4, r() * 3, 0, P2);
      ctx.fill();
    }
    vfill(ctx, x - 80, y - 52, 142, 58, [[0, 'rgba(255,255,250,0.2)'], [0.6, 'rgba(0,0,0,0)'], [1, 'rgba(40,30,30,0.3)']]);
  });
  // the chips: golden, lit on their tops, a few spilled on the table
  const chip = (cx: number, cy: number, len: number, ang: number) => {
    const p: PathFn = (c) => {
      c.beginPath();
      c.save();
      c.translate(cx, cy);
      c.rotate(ang);
      c.roundRect(-len / 2, -4, len, 8, 2.5);
      c.restore();
    };
    solid(ctx, p, { x: cx - len, y: cy - len, w: len * 2, h: len * 2 }, 'wood', '#e8b850', { depth: 0.04, line: 1.4, formSize: 3 });
    within(ctx, p, () => {
      ctx.fillStyle = 'rgba(180,110,30,0.35)';
      ctx.fillRect(cx - len, cy + 1, len * 2, 4);
    });
  };
  for (let k = 0; k < 7; k++) chip(x + 40 + r() * 20, y - 34 + k * 5, 30 + r() * 14, -0.5 + r() * 1.2);
  for (const [cx, cy, l, a] of [[x + 92, y - 2, 30, 0.3], [x + 120, y + 10, 26, -0.6], [x + 74, y + 14, 28, 1.2]] as const) {
    groundShadow(ctx, cx + 4, cy + 4, l * 0.5, 3, 0.35, '#1a1410', 0.5);
    chip(cx, cy, l, a);
  }
  // the little wooden fork
  const fork = polyPath([[x + 50, y - 40], [x + 54, y - 42], [x + 96, y - 66], [x + 91, y - 67]]);
  solid(ctx, fork, { x: x + 50, y: y - 67, w: 46, h: 27 }, 'wood', '#d8c090', { depth: 0.04, line: 1.4, formSize: 2 });
  for (let k = 0; k < 3; k++) {
    ctx.strokeStyle = '#4a3a20';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 91 + k * 2, y - 66);
    ctx.lineTo(x + 97 + k * 2, y - 72);
    ctx.stroke();
  }
  // salt crystals catching the light
  for (let k = 0; k < 40; k++) {
    ctx.fillStyle = rgba('#ffffff', 0.5 + r() * 0.5);
    ctx.fillRect(x + r() * 180 - 40, y - 4 + r() * 24, 1.4, 1.4);
  }
}

/** A gull's feather fallen on the table, and wet rings from a cup. */
function tableBits(ctx: Ctx): void {
  const x = 1640;
  const y = 900;
  groundShadow(ctx, x + 6, y + 5, 46, 5, 0.45, '#1a1410', 0.8);
  const vane: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - 46, y + 6);
    c.quadraticCurveTo(x - 10, y - 10, x + 40, y - 6);
    c.quadraticCurveTo(x + 4, y + 8, x - 46, y + 6);
    c.closePath();
  };
  solid(ctx, vane, { x: x - 46, y: y - 10, w: 86, h: 18 }, 'plush', '#d8dee6', { depth: 0.05, line: 1.2, formSize: 3 });
  within(ctx, vane, () => {
    ctx.strokeStyle = 'rgba(60,70,90,0.25)';
    ctx.lineWidth = 0.8;
    for (let k = 0; k < 14; k++) {
      const u = k / 14;
      const sx = x - 40 + u * 76;
      ctx.beginPath();
      ctx.moveTo(sx, y + 2 - u * 6);
      ctx.lineTo(sx + 6, y - 6 - u * 2);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(30,30,40,0.7)';
    ctx.beginPath();
    ctx.ellipse(x + 30, y - 4, 10, 3, -0.1, 0, P2);
    ctx.fill();
  });
  ctx.strokeStyle = '#f4f0e8';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x - 56, y + 9);
  ctx.quadraticCurveTo(x - 10, y - 2, x + 42, y - 6);
  ctx.stroke();
}

/** Paint fn scaled about a point. */
function scaled(ctx: Ctx, x: number, y: number, k: number, fn: () => void): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.translate(-x, -y);
  fn();
  ctx.restore();
}

// ——— the grade and shade ———

function grade(ctx: Ctx): void {
  gradeAll(ctx, 0.03, '#d8ecf0', 0.04, { warm: '#ffe0a8', cool: '#4a72b8', a: 0.22 });
}

function shadeOver(ctx: Ctx): void {
  calmLanes(ctx, 0.08, '#0e1c26', 80, 600);
  vignetteAll(ctx, 0.5, '#060c12');
}

// ——— the stack ———

const SKY_BOX = { x: 0, y: 0, w: W, h: HZ + 4 };
/** The live skies stop at the horizon (so the sea under them stays in the base). */
const SKY_HIGH = { x: 0, y: 0, w: W, h: HZ };
const CLOUD_BOX = { x: 0, y: 40, w: W, h: HZ - 40 };
const HEAD_BOX = { x: 1370 + HX, y: PR.lh.lantern - 24, w: W - 1370 - HX, h: HZ - PR.lh.lantern + 24 };
const LEFT_BOX = { x: 0, y: HZ - 50, w: 580, h: 50 };
const RAIL_BOX = { x: 0, y: PR.cap - 4, w: W, h: TY - PR.cap + 4 };
const LAMP_BOX = { x: PR.lamp.x - 90, y: PR.lamp.arm - 100, w: 260, h: TY - PR.lamp.arm + 100 };
const VIEWER_BOX = { x: PR.viewer.x - 60, y: PR.viewer.base - 160, w: 140, h: 176 };
const GULL_BOX = { x: PR.gull.x - 64, y: PR.gull.y - 106, w: 144, h: 118 };
/** Where the spray plumes rise from behind the rail. */
const SPRAY_BOX = { x: 0, y: 300, w: W, h: PR.deck - 300 };

export const PIER: SceneSpec = {
  id: 'pier',
  info: {
    name: 'The Pier',
    subtitle: 'Waves 41–44',
    ambient: [],
    // (the sun's bloom is painted; the lamps are unlit by day: the live layer lights them from the squall on)
    glows: [],
    light: '#e8f2f4',
    tableTint: '#f4f4f0',
  },
  layers: [
    { id: 'sky', box: SKY_BOX, draw: sky },
    { id: 'skyGrey', box: SKY_HIGH, liveOnly: true, res: 0.5, draw: greySky },
    { id: 'skyStorm', box: SKY_HIGH, liveOnly: true, res: 0.5, draw: stormSky },
    { id: 'clouds', box: CLOUD_BOX, motion: 'sprite', res: 0.5, draw: cloudsDay },
    // lightning and the lighthouse's beam: over the sky, behind the far land and the sea
    { id: 'storm', box: { x: 0, y: 0, w: W, h: HZ }, motion: 'slot', draw: () => {} },
    { id: 'farLeft', box: LEFT_BOX, draw: farLeft },
    { id: 'headland', box: HEAD_BOX, draw: headland },
    { id: 'sea', box: SEA_BOX, draw: sea },
    { id: 'seaGrey', box: SEA_BOX, liveOnly: true, res: 0.4, draw: seaGrey },
    // the swells rolling in, the surf on the rocks, the plumes of spray rising from behind the rail
    { id: 'spray', box: SPRAY_BOX, motion: 'slot', draw: () => {} },
    { id: 'deck', box: { x: 0, y: PR.deck - 18, w: W, h: TY - PR.deck + 18 }, draw: deck },
    { id: 'railing', box: RAIL_BOX, draw: railing },
    { id: 'gull', box: GULL_BOX, stillOnly: true, draw: (c) => gullStill(c) },
    { id: 'lamp', box: LAMP_BOX, draw: lamp },
    { id: 'buoy', box: BUOY_BOX, motion: 'sprite', draw: (c) => buoy(c) },
    { id: 'viewer', box: VIEWER_BOX, draw: viewerPost },
    { id: 'viewerHead', box: VIEWER_HEAD_BOX, motion: 'sprite', draw: (c) => viewerHead(c) },
    { id: 'table', box: { x: 0, y: TY, w: W, h: 1080 - TY }, draw: table },
    { id: 'chips', box: { x: 0, y: TY, w: 440, h: 220 }, draw: (c, r) => scaled(c, 150, 880, 1.2, () => chips(c, r)) },
    { id: 'feather', box: { x: 1700, y: 960, w: 210, h: 70 }, draw: (c) => scaled(c, 1640, 900, 1.5, () => { c.translate(113, 67); tableBits(c); }) },
    { id: 'top', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};



// ——— live: painted frames ———

const rngOf = (seed: number) => {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
};

/**
 * One frame of a plume of spray (t 0 … 1 through its life, not a loop), w×h, its root at (w/2, h - 4): a wave
 * striking the pier's legs below the deck and throwing a sheet of water up. Packets of white water launched on
 * ballistic paths (a few late, so the sheet has a body), swelling and thinning as they fly and fall back, lit on
 * their upper left and shaded blue-grey below; a skirt of foam at the root early on, fine drops flung off the top.
 */
export function plumeFrame(c: Ctx, w: number, h: number, t: number): void {
  const rr = rngOf(23);
  const T = 1.7;
  const G = 2.1 * h;
  const by = h - 4;
  const blob = (x: number, y: number, rad: number, a: number) => {
    if (a <= 0.01 || rad <= 0.5) return;
    const g = c.createRadialGradient(x - rad * 0.3, y - rad * 0.35, 0, x, y, rad);
    g.addColorStop(0, `rgba(255,255,255,${(a * 0.95).toFixed(3)})`);
    g.addColorStop(0.55, `rgba(226,238,244,${(a * 0.7).toFixed(3)})`);
    g.addColorStop(0.85, `rgba(150,176,196,${(a * 0.35).toFixed(3)})`);
    g.addColorStop(1, 'rgba(150,176,196,0)');
    c.fillStyle = g;
    c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  };
  // the sheet's body: packets
  for (let i = 0; i < 56; i++) {
    const d = rr() * 0.22;
    const vx = (rr() - 0.5) * w * (0.2 + rr() * 0.3);
    const vy = -h * (1.15 + rr() * 0.75);
    const r0 = 3 + rr() * 6;
    const tau = t * T - d;
    if (tau <= 0) continue;
    const x = w / 2 + vx * tau;
    const y = by + vy * tau + 0.5 * G * tau * tau;
    if (y > by + 4) continue;
    const life = tau / (T - d);
    const rad = Math.min(w * 0.16, r0 * (1 + tau * 2.2));
    const a = (1 - life) ** 1.1 * Math.min(1, tau * 8) * 0.95;
    blob(x, y, rad, a);
  }
  // the foam skirt boiling up at the root, early on
  const sk = Math.max(0, 1 - t * 1.8);
  for (let i = 0; i < 10; i++) {
    const x = w / 2 + (rr() - 0.5) * w * 0.6 * (0.5 + t);
    blob(x, by - rr() * 30, 12 + rr() * 16, sk * 0.35);
  }
  // fine drops flung off the top, crisp, falling faster than the sheet
  for (let i = 0; i < 70; i++) {
    const d = 0.1 + rr() * 0.25;
    const vx = (rr() - 0.5) * w * 0.7;
    const vy = -h * (1.2 + rr() * 0.8);
    const tau = t * T - d;
    if (tau <= 0) continue;
    const x = w / 2 + vx * tau;
    const y = by + vy * tau + 0.5 * G * 1.25 * tau * tau;
    if (y > by || x < 0 || x > w) continue;
    const a = (1 - tau / (T - d)) * 0.95;
    if (a <= 0) continue;
    const sz = 0.8 + rr() * 1.4;
    c.fillStyle = `rgba(250,253,255,${a.toFixed(3)})`;
    c.beginPath();
    c.arc(x, y, sz, 0, P2);
    c.fill();
    c.fillStyle = `rgba(90,120,140,${(a * 0.4).toFixed(3)})`;
    c.beginPath();
    c.arc(x + sz * 0.5, y + sz * 0.5, sz * 0.6, 0, P2);
    c.fill();
  }
  // feather the frame's sides and top, so nothing is cut square at its edge
  c.globalCompositeOperation = 'destination-in';
  const eg = c.createLinearGradient(0, 0, w, 0);
  eg.addColorStop(0, 'rgba(0,0,0,0)');
  eg.addColorStop(0.12, 'rgba(0,0,0,1)');
  eg.addColorStop(0.88, 'rgba(0,0,0,1)');
  eg.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = eg;
  c.fillRect(0, 0, w, h);
  const tg = c.createLinearGradient(0, 0, 0, h);
  tg.addColorStop(0, 'rgba(0,0,0,0)');
  tg.addColorStop(0.15, 'rgba(0,0,0,1)');
  tg.addColorStop(0.8, 'rgba(0,0,0,1)');
  tg.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = tg;
  c.fillRect(0, 0, w, h);
  c.globalCompositeOperation = 'source-over';
}

/** One frame of the surf at the headland's foot (phase 0 … 1 loops): a swell running up the rocks in a white
 * sheet, hanging, and draining back in lace; a puff of spray at its height. w×h, the waterline along the bottom. */
export function surfFrame(c: Ctx, w: number, h: number, ph: number): void {
  const rr = rngOf(31);
  const up = Math.sin(Math.min(1, ph / 0.45) * Math.PI * 0.5);
  const drain = ph < 0.45 ? 0 : (ph - 0.45) / 0.55;
  const top = h - 4 - (h * 0.55) * (up * (1 - drain * 0.8));
  c.save();
  // the sheet: a band up the rock face, ragged top
  c.beginPath();
  c.moveTo(0, h);
  for (let x = 0; x <= w; x += 4) c.lineTo(x, top + Math.sin(x * 0.2 + ph * 9) * 3 + (1 - Math.sin((x / w) * Math.PI)) * h * 0.25);
  c.lineTo(w, h);
  c.closePath();
  const g = c.createLinearGradient(0, top, 0, h);
  g.addColorStop(0, `rgba(255,255,255,${(0.9 - drain * 0.5).toFixed(3)})`);
  g.addColorStop(1, `rgba(210,226,232,${(0.6 - drain * 0.4).toFixed(3)})`);
  c.fillStyle = g;
  c.fill();
  // lace holes as it drains
  if (drain > 0) {
    c.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 26; i++) {
      c.fillStyle = `rgba(0,0,0,${(drain * 0.8).toFixed(3)})`;
      c.beginPath();
      c.ellipse(rr() * w, top + rr() * (h - top), 2 + rr() * 6 * drain, 1 + rr() * 3, 0, 0, P2);
      c.fill();
    }
    c.globalCompositeOperation = 'source-over';
  }
  // the burst of spray at the top of the run
  const b = Math.max(0, Math.sin(Math.min(1, Math.max(0, (ph - 0.25) / 0.5)) * Math.PI));
  for (let i = 0; i < 12; i++) {
    const x = w * (0.2 + rr() * 0.6);
    const y = top - rr() * h * 0.4 * b;
    const rad = 3 + rr() * 6 * (0.5 + b);
    const rg = c.createRadialGradient(x, y, 0, x, y, rad);
    rg.addColorStop(0, `rgba(255,255,255,${(0.6 * b).toFixed(3)})`);
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = rg;
    c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // its ends feather into the sea
  c.globalCompositeOperation = 'destination-in';
  const eg = c.createRadialGradient(w / 2, h, 0, w / 2, h, w / 2);
  eg.addColorStop(0, 'rgba(0,0,0,1)');
  eg.addColorStop(0.6, 'rgba(0,0,0,0.8)');
  eg.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = eg;
  c.fillRect(0, 0, w, h);
  c.restore();
}

/** One swell crest (frame i of 3 variants), w×h: a dark trough under a lit back slope and a crest line broken into
 * light, its ends fading out. Drawn stretched across the sea and moved in by the live code. */
export function swellStrip(c: Ctx, w: number, h: number, i: number): void {
  const rr = rngOf(41 + i * 13);
  const ph = rr() * 10;
  const f = 0.012 + rr() * 0.006;
  const mid = h * 0.45;
  const yy = (x: number) => mid + Math.sin(x * f + ph) * h * 0.14 + Math.sin(x * f * 2.6 + ph * 2) * h * 0.06;
  // the lit back of the swell (towards the horizon), the trough on the face below it
  c.beginPath();
  c.moveTo(0, yy(0));
  for (let x = 0; x <= w; x += 6) c.lineTo(x, yy(x));
  for (let x = w; x >= 0; x -= 6) c.lineTo(x, yy(x) + h * 0.45);
  c.closePath();
  const g = c.createLinearGradient(0, mid - h * 0.2, 0, mid + h * 0.5);
  g.addColorStop(0, 'rgba(6,30,40,0.5)');
  g.addColorStop(1, 'rgba(6,30,40,0)');
  c.fillStyle = g;
  c.fill();
  c.beginPath();
  c.moveTo(0, yy(0));
  for (let x = 0; x <= w; x += 6) c.lineTo(x, yy(x));
  for (let x = w; x >= 0; x -= 6) c.lineTo(x, yy(x) - h * 0.3);
  c.closePath();
  const lg = c.createLinearGradient(0, mid - h * 0.4, 0, mid);
  lg.addColorStop(0, 'rgba(200,236,240,0)');
  lg.addColorStop(1, 'rgba(200,236,240,0.22)');
  c.fillStyle = lg;
  c.fill();
  // the crest, broken into light where it curls
  c.lineCap = 'round';
  for (let x = 0; x < w; x += 4) {
    const vis = Math.sin(x * 0.03 + ph) + Math.sin(x * 0.071 + i) > 0.25;
    if (!vis) continue;
    c.strokeStyle = `rgba(236,250,250,${(0.35 + rr() * 0.4).toFixed(3)})`;
    c.lineWidth = 1 + rr() * 1.2;
    c.beginPath();
    c.moveTo(x, yy(x) - 0.5);
    c.lineTo(x + 5, yy(x + 5) - 0.5);
    c.stroke();
  }
  // its ends fade out
  c.globalCompositeOperation = 'destination-in';
  const eg = c.createLinearGradient(0, 0, w, 0);
  eg.addColorStop(0, 'rgba(0,0,0,0)');
  eg.addColorStop(0.15, 'rgba(0,0,0,1)');
  eg.addColorStop(0.85, 'rgba(0,0,0,1)');
  eg.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = eg;
  c.fillRect(0, 0, w, h);
  c.globalCompositeOperation = 'source-over';
}

/** A tile of rain at one depth (it scrolls): streaks slanting with the wind, lit faintly, soft at the far depth. */
export function rainTile(c: Ctx, size: number, d: number): void {
  const rr = rngOf(51 + d * 7);
  const n = [220, 70][d];
  c.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = rr() * size;
    const y = rr() * size;
    const len = [14, 34][d] * (0.6 + rr() * 0.8);
    const a = [0.35, 0.45][d] * (0.5 + rr() * 0.5);
    for (const [ox, oy] of [[0, 0], [size, 0], [-size, 0], [0, size], [0, -size]] as const) {
      const g = c.createLinearGradient(x + ox, y + oy, x + ox - len * 0.25, y + oy + len);
      g.addColorStop(0, 'rgba(220,232,244,0)');
      g.addColorStop(1, `rgba(220,232,244,${a.toFixed(3)})`);
      c.strokeStyle = g;
      c.lineWidth = [1, 1.8][d];
      c.beginPath();
      c.moveTo(x + ox, y + oy);
      c.lineTo(x + ox - len * 0.25, y + oy + len);
      c.stroke();
    }
  }
}

/** One fork of lightning (frame i), w×h, striking down to (w/2 ± …, h): a jagged main channel with branches, a soft
 * violet-white glow round it and a white-hot core. */
export function boltFrame(c: Ctx, w: number, h: number, i: number): void {
  const rr = rngOf(61 + i * 17);
  const paths: [number, number][][] = [];
  const walk = (x: number, y: number, ang: number, len: number, depth: number) => {
    const pts: [number, number][] = [[x, y]];
    let cx = x;
    let cy = y;
    const seg = 9;
    for (let k = 0; k < len / seg; k++) {
      ang += (rr() - 0.5) * 0.9;
      ang = Math.max(Math.PI * 0.2, Math.min(Math.PI * 0.8, ang));
      cx += Math.cos(ang) * seg;
      cy += Math.sin(ang) * seg;
      pts.push([cx, cy]);
      if (depth < 2 && rr() < 0.08) walk(cx, cy, ang + (rr() < 0.5 ? -0.6 : 0.6), len * (0.25 + rr() * 0.3), depth + 1);
    }
    paths.push(pts);
  };
  walk(w / 2 + (rr() - 0.5) * w * 0.2, 0, Math.PI / 2, h * 1.05, 0);
  const stroke = (pts: [number, number][], col: string, lw: number) => {
    c.strokeStyle = col;
    c.lineWidth = lw;
    c.beginPath();
    pts.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.stroke();
  };
  c.lineJoin = 'round';
  c.lineCap = 'round';
  paths.forEach((p, k) => {
    const main = k === paths.length - 1;
    const s = main ? 1 : 0.5;
    stroke(p, 'rgba(150,140,255,0.08)', 22 * s);
    stroke(p, 'rgba(180,180,255,0.18)', 10 * s);
    stroke(p, 'rgba(230,230,255,0.6)', 4 * s);
    stroke(p, 'rgba(255,255,255,0.95)', 1.6 * s);
  });
}

/** The lighthouse's beam: a long cone of light from its point at the left, widening and fading out to the right. */
export function beamTex(c: Ctx, w: number, h: number): void {
  const g = c.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, 'rgba(255,250,224,0.95)');
  g.addColorStop(0.25, 'rgba(255,246,214,0.45)');
  g.addColorStop(1, 'rgba(255,240,200,0)');
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(0, h / 2 - 2);
  c.lineTo(w, 0);
  c.lineTo(w, h);
  c.lineTo(0, h / 2 + 2);
  c.closePath();
  c.fill();
  // soften the cone's sides
  c.globalCompositeOperation = 'destination-in';
  const v = c.createLinearGradient(0, 0, 0, h);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(0.5, 'rgba(0,0,0,1)');
  v.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = v;
  c.fillRect(0, 0, w, h);
}

export const GULL_FW = 120;
export const GULL_FH = 104;
/** The standing gull's frames: 0–5 idle (breathing, a tilt of the head), 6–11 the long call, 12 crouched to leap. */
export const GULL_IDLE = 6;
export const GULL_CALL = 6;
export function gullStandFrame(c: Ctx, i: number): void {
  const fx = GULL_FW * 0.42;
  const fy = GULL_FH - 4;
  if (i < GULL_IDLE) {
    const u = i / GULL_IDLE;
    gullStanding(c, fx, fy, 1.2, { stretch: 0, back: 0, open: 0, tilt: Math.sin(u * P2) * 0.6, breath: 0.5 + Math.sin(u * P2) * 0.5, crouch: 0 });
  } else if (i < GULL_IDLE + GULL_CALL) {
    // the long call: the neck stretches, the head goes back, the bill gapes, then it settles
    const u = (i - GULL_IDLE) / (GULL_CALL - 1);
    const k = Math.sin(u * Math.PI);
    gullStanding(c, fx, fy, 1.2, { stretch: Math.min(1, k * 1.3), back: Math.max(0, Math.sin(Math.min(1, u * 1.4) * Math.PI)), open: Math.min(1, k * 1.5), tilt: 0, breath: 1, crouch: 0 });
  } else gullStanding(c, fx, fy, 1.2, { stretch: 0, back: 0, open: 0.2, tilt: -0.3, breath: 0.2, crouch: 1 });
}
export const FLY_FW = 124;
export const FLY_FH = 150;
export const FLY_N = 8;

// ——— live ———

registerKitScene(PIER, (k: KitLive, wave0) => {
  const clamp = Phaser.Math.Clamp;
  const top = k.slot('top');
  const spraySlot = k.slot('spray');
  const stormSlot = k.slot('storm');
  const skyGrey = k.sprite('skyGrey');
  const skyStorm = k.sprite('skyStorm');
  const clouds = k.sprite('clouds');
  const seaGreyS = k.sprite('seaGrey');
  const cloudX = clouds.x;

  // ——— hero: the sea ———
  const SW = 960;
  const SH = 40;
  const swellKey = sheet(k, 'pr_swell', SW, SH, 3, (c, _p, i) => swellStrip(c, SW, SH, i));
  const swells = Array.from({ length: 8 }, (_, i) => ({
    img: k.img(swellKey, 960, HZ, { into: spraySlot }).setFrame(i % 3).setAlpha(0),
    u: i / 8,
    dx: (crand() - 0.5) * 300,
  }));
  // glints winking along the sun's path
  const glints = new Parts(k, { frame: 'spark', add: true, into: spraySlot, max: 70 });
  const glintRate = new Rate();
  // the surf at the headland's rocks
  const SFW = 140;
  const SFH = 50;
  const surfKey = sheet(k, 'pr_surf', SFW, SFH, 8, (c, ph) => surfFrame(c, SFW, SFH, ph));
  const surf = new Loop(k, surfKey, 8, 1440 + HX, HZ + 2, { into: spraySlot, origin: [0.5, 1], fps: 4, sx: 0.7, sy: 0.5 });
  const surf2 = new Loop(k, surfKey, 8, 1610 + HX, HZ + 2, { into: spraySlot, origin: [0.5, 1], fps: 3.4, sx: 0.8, sy: 0.4, phase: 4 });

  // ——— hero: spray over the rail ———
  const PW = 160;
  const PH = 170;
  const PN = 10;
  const plumeKey = sheet(k, 'pr_plume', PW, PH, PN, (c, ph) => plumeFrame(c, PW, PH, ph + 0.5 / PN));
  type Plume = { loop: Loop; age: number; dur: number; on: boolean; x: number; drops: boolean };
  const plumes: Plume[] = Array.from({ length: 4 }, () => {
    const loop = new Loop(k, plumeKey, PN, 0, PR.deck + 30, { into: spraySlot, origin: [0.5, 1], scale: 2 });
    loop.each((im) => im.setVisible(false));
    return { loop, age: 0, dur: 1.7, on: false, x: 0, drops: false };
  });
  const drops = new Parts(k, { frame: 'drop', into: top, max: 140 });
  const mist = new Parts(k, { frame: 'puff', into: top, max: 40 });
  const splashes = new Parts(k, { frame: 'mote', into: top, max: 120 });
  const splash = (x: number, y: number) => {
    for (let i = 0; i < 3; i++) splashes.spawn({ x, y, vx: (crand() - 0.5) * 60, vy: -30 - crand() * 50, life: 0.3, r0: 3, r1: 1.5, a: 0.6, tint: 0xe8f0f4, grav: 600, fade: 0.05 });
  };
  /** Throw a plume up behind the rail at x (power 0 … 1). */
  const plume = (x: number, power: number) => {
    const p = plumes.find((q) => !q.on) ?? plumes.reduce((a, b) => (a.age > b.age ? a : b));
    p.on = true;
    p.age = 0;
    p.x = clamp(x, 60, W - 60);
    p.drops = false;
    p.dur = 1.5 + power * 0.4;
    const sc = 1.5 + power * 1.2;
    p.loop.each((im) => im.setVisible(true).setPosition(p.x, PR.deck + 30).setScale(sc * (crand() < 0.5 ? -1 : 1), sc));
  };

  // ——— hero: the gull ———
  const standKey = sheet(k, 'pr_gull', GULL_FW, GULL_FH, GULL_IDLE + GULL_CALL + 1, (c, _p, i) => gullStandFrame(c, i));
  const flyKey = sheet(k, 'pr_gullfly', FLY_FW, FLY_FH, FLY_N + 1, (c, _ph, i) => gullFlying(c, FLY_FW / 2, FLY_FH / 2, 1, i < FLY_N ? i / FLY_N : 0, i < FLY_N ? 0 : 1));
  const gShadow = k.img(k.tex('pr_gshadow', 48, 10, (c) => {
    const g = c.createRadialGradient(24, 5, 0, 24, 5, 24);
    g.addColorStop(0, 'rgba(10,20,24,0.45)');
    g.addColorStop(1, 'rgba(10,20,24,0)');
    c.save();
    c.scale(1, 0.2);
    c.fillStyle = g;
    c.fillRect(0, 0, 48, 50);
    c.restore();
  }), PR.gull.x + 8, PR.gull.y + 1, { into: top });
  const stand = new Loop(k, standKey, GULL_IDLE, PR.gull.x, PR.gull.y + 4, { into: top, origin: [0.42, 1], fps: 1.6 });
  const fly = new Loop(k, flyKey, FLY_N, 0, 0, { into: top, fps: 7, scale: 1.2 });
  fly.each((im) => im.setVisible(false));
  type GullState = 'perch' | 'crouch' | 'fly' | 'away' | 'home';
  let gs: GullState = 'perch';
  let gt = 0;
  let callT = 4 + crand() * 6;
  let callU = -1;
  let awayFor = 7;
  const gp = { x: PR.gull.x, y: PR.gull.y - 40, vx: 0, vy: 0, dir: 1 };
  const startle = () => {
    if (gs !== 'perch') return;
    gs = 'crouch';
    gt = 0;
  };
  // far gulls wheeling over the sea in the fair weather
  const far = [
    { cx: 760, cy: 250, rx: 160, ry: 40, w: 0.35, s: 0.24, ph: 0 },
    { cx: 1060, cy: 210, rx: 220, ry: 50, w: -0.28, s: 0.2, ph: 2 },
    { cx: 620, cy: 300, rx: 120, ry: 30, w: 0.42, s: 0.16, ph: 4 },
  ].map((f) => ({ ...f, loop: new Loop(k, flyKey, FLY_N, f.cx, f.cy, { into: top, fps: 5 + crand() * 2, scale: f.s * 1.2, tint: 0xd8e0e8 }) }));

  // ——— the lifebuoy on its hook, the viewer on its yoke ———
  const buoyS = new Swing(k.pivot(k.sprite('buoy'), PR.lamp.x + 12, PR.buoy.hookY), { k: 14, c: 0.9, idle: 0.015, seed: 2 });
  const headS = new Swing(k.pivot(k.sprite('viewerHead'), PR.viewer.x, PR.viewer.base - 172), { k: 50, c: 3, idle: 0 });

  // ——— the storm: lightning and the lighthouse's beam behind the far land ———
  const BW = 150;
  const BH = 270;
  const boltKey = sheet(k, 'pr_bolt', BW, BH, 3, (c, _p, i) => boltFrame(c, BW, BH, i));
  const bolt = k.img(boltKey, 800, HZ, { into: stormSlot, add: true, origin: [0.5, 1] }).setAlpha(0);
  const skyFlash = k.wash(0xc8d0ff, 0, Phaser.BlendModes.ADD, stormSlot);
  const beamKey = k.tex('pr_beam', 512, 64, (c) => beamTex(c, 512, 64));
  const lh = PR.lh;
  const beam = k.img(beamKey, lh.x, lh.lantern + 6, { into: stormSlot, add: true, origin: [0, 0.5] }).setAlpha(0);
  let boltT = 0;
  let nextBolt = 4 + crand() * 4;
  let flash = 0;

  // ——— the light over everything: afternoon warmth, the squall's grey, the storm's dusk ———
  const warm = k.wash(0xffe4c4, 0, Phaser.BlendModes.MULTIPLY, top);
  const grey = k.wash(0xa0aab6, 0, Phaser.BlendModes.MULTIPLY, top);
  const night = k.wash(0x46526c, 0, Phaser.BlendModes.MULTIPLY, top);
  // the lamps: the globes lit, their halo, the pool on the deck and its reflection in the wet table
  const globeKey = k.tex('pr_globe', 40, 40, (c) => globe(c, 20, 20, true));
  const lampImgs = LAMP_GLOBES.map(([x, y]) => ({
    globe: k.img(globeKey, x, y, { into: top }).setAlpha(0),
    halo: k.glow(x, y, 90, 0xffcf80, 0, { into: top }),
    core: k.glow(x, y, 34, 0xfff2d0, 0, { into: top }),
  }));
  const lampPool = k.glow(PR.lamp.x + 10, PR.deck + 20, 220, 0xffc070, 0, { into: top, sy: 0.18 });
  const lampWet = k.glow(PR.lamp.x + 30, 880, 120, 0xffc070, 0, { into: top, sy: 1.1 });
  const lantern = k.glow(lh.x, lh.lantern + 6, 60, 0xfff0c0, 0, { into: top });
  const lanternFlash = k.glow(lh.x, lh.lantern + 6, 160, 0xfff4d8, 0, { into: top });
  const lampDip = new Spring(0, 40, 4);
  // the rain: two depths of painted streaks
  const T = 256;
  const rainFar = k.sc.add.tileSprite(0, 0, W, 1080, k.tex('pr_rain0', T, T, (c) => rainTile(c, T, 0))).setOrigin(0, 0).setAlpha(0);
  const rainNear = k.sc.add.tileSprite(0, 0, W, 1080, k.tex('pr_rain1', T, T, (c) => rainTile(c, T, 1))).setOrigin(0, 0).setAlpha(0);
  top.add([rainFar, rainNear]);
  const flashTop = k.wash(0xe0e8ff, 0, Phaser.BlendModes.ADD, top);
  const splashRate = new Rate();
  const plumeRate = new Rate();
  const dripRate = new Rate();

  let kw = waveK(wave0);
  let shown = kw;
  let greyK = 0;
  return {
    setWave: (w) => (kw = waveK(w)),
    impact(x, _y, p) {
      // the pier jolts: a wave slaps up the legs under the rail nearest the stomp
      plume(x + (crand() - 0.5) * 120, clamp(0.4 + p * 0.6 + greyK * 0.3, 0, 1));
      if (p > 0.15) startle();
      buoyS.kick((x < PR.lamp.x ? 1 : -1) * (0.6 + crand() * 0.4) * p + (crand() - 0.5) * 0.4 * p);
      headS.kick((crand() - 0.5) * 1.6 * p);
      lampDip.v -= 10 * p;
      // water shaken off the wet handrail
      if (greyK > 0.3) for (let i = 0; i < 10 * p; i++) drops.spawn({ x: x + (crand() - 0.5) * 500, y: PR.rail + 6, vx: (crand() - 0.5) * 30, vy: crand() * 40, life: 1.2, r0: 3, a: 0.7, tint: 0xdce8f0, grav: 900, floor: PR.deck + crand() * 50, onFloor: splash, streak: 0.02 });
    },
    update(dt, t) {
      shown += (kw - shown) * Math.min(1, dt * 0.6);
      // 0 morning (wave 1) … the afternoon (2) … the squall (3) … 1 the storm at nightfall (4)
      const pmK = clamp(shown / 0.33, 0, 1) * (1 - clamp((shown - 0.33) / 0.33, 0, 1));
      greyK = Phaser.Math.Easing.Sine.InOut(clamp((shown - 0.33) / 0.33, 0, 1));
      const stormK = Phaser.Math.Easing.Sine.InOut(clamp((shown - 0.66) / 0.34, 0, 1));
      skyGrey.setAlpha(greyK);
      skyStorm.setAlpha(stormK);
      seaGreyS.setAlpha(clamp(greyK * 0.9 + stormK * 0.1, 0, 1));
      clouds.setAlpha(1 - greyK);
      clouds.setTint(Phaser.Display.Color.GetColor(255, Math.round(255 - pmK * 20), Math.round(255 - pmK * 40)));
      clouds.x = cloudX + Math.sin(t * 0.02) * 40 * calm();
      warm.setAlpha(pmK * 0.16);
      grey.setAlpha(greyK * 0.3 * (1 - stormK * 0.5));
      night.setAlpha(stormK * 0.55);
      const wind = 1 + greyK * 0.8 + stormK * 0.8;

      // ——— the sea: swells rolling in, glints on the sun's path, surf on the rocks
      for (const sw of swells) {
        sw.u += (dt / (16 / wind)) * calm();
        if (sw.u >= 1) {
          sw.u -= 1;
          sw.dx = (crand() - 0.5) * 300;
          sw.img.setFrame(Math.floor(crand() * 3));
        }
        const u = sw.u;
        const y = HZ + 6 + u ** 1.6 * (PR.deck - HZ - 14);
        sw.img.setPosition(960 + sw.dx * (1 - u), y).setScale(2.2 + u * 0.6, 0.12 + u * (1.1 + greyK * 0.7)).setAlpha(Math.sin(u * Math.PI) * (0.7 + greyK * 0.3));
        sw.img.setTint(greyK > 0.5 ? 0xb8c4cc : 0xffffff);
      }
      glintRate.tick(30 * (1 - greyK) * calm(), dt, () => {
        const u = crand() ** 0.9;
        const y = HZ + 4 + u * (PR.deck - HZ - 20);
        const x = PR.sun.x + 40 + (crand() + crand() + crand() - 1.5) * (20 + u * 230);
        glints.spawn({ x, y, life: 0.25 + crand() * 0.4, r0: 4 + u * 8, r1: 1, a: 0.9, tint: 0xfffbe8, fade: 0.3 });
      });
      glints.update(dt);
      surf.step(dt, wind * calm());
      surf2.step(dt, wind * calm());
      surf.alpha = 0.75 + greyK * 0.25;
      surf2.alpha = 0.6 + greyK * 0.4;
      surf.each((im) => im.setScale(0.7 + greyK * 0.3, 0.5 + greyK * 0.5));
      surf2.each((im) => im.setScale(0.8 + greyK * 0.3, 0.4 + greyK * 0.5));

      // ——— the spray: waves hitting the legs from the squall on
      plumeRate.tick((greyK * 0.12 + stormK * 0.3) * calm(), dt, () => plume(200 + crand() * 1520, 0.3 + greyK * 0.3 + stormK * 0.3 * crand()));
      for (const p of plumes) {
        if (!p.on) continue;
        p.age += dt;
        const u = p.age / p.dur;
        if (u >= 1) {
          p.on = false;
          p.loop.each((im) => im.setVisible(false));
          continue;
        }
        p.loop.alpha = Math.min(1, (1 - u) * 3) * 0.95;
        p.loop.show(u * (PN - 1));
        p.loop.each((im) => im.setTint(greyK > 0.5 ? 0xdde4ea : 0xffffff));
        // as the sheet tops the rail, drops are flung over it towards us, and mist blows off
        if (!p.drops && u > 0.22) {
          p.drops = true;
          const sc = Math.abs(p.loop.a.scaleX);
          const n = Math.round(10 + sc * 10);
          for (let i = 0; i < n; i++) drops.spawn({ x: p.x + (crand() - 0.5) * 120 * sc, y: PR.rail - 30 - crand() * 120 * sc, vx: (crand() - 0.5) * 160 - wind * 30, vy: -60 - crand() * 220, life: 1.6, r0: 3 + crand() * 3, a: 0.85, tint: 0xeef6fa, grav: 1100, floor: PR.deck + 10 + crand() * 220, onFloor: splash, streak: 0.025 });
          for (let i = 0; i < 3 + sc * 2; i++) mist.spawn({ x: p.x + (crand() - 0.5) * 140, y: PR.rail - 60 - crand() * 100, vx: -30 - wind * 25, vy: -10 + crand() * 20, life: 2 + crand(), r0: 20, r1: 70 + crand() * 40, a: 0.22, tint: 0xe8f0f4, drag: 0.4, fade: 0.2 });
        }
      }
      drops.update(dt);
      mist.update(dt);

      // ——— the gull
      gt += dt;
      shadowAndGull(dt);

      // ——— far gulls, in the fair weather
      const fairK = 1 - greyK;
      for (const f of far) {
        const a = t * f.w * calm() + f.ph;
        const x = f.cx + Math.cos(a) * f.rx + Math.sin(t * 0.07 + f.ph) * 60;
        const y = f.cy + Math.sin(a) * f.ry;
        const dir = -Math.sin(a) * f.w;
        f.loop.step(dt);
        f.loop.alpha = fairK * 0.85;
        f.loop.each((im) => im.setPosition(x, y).setScale((dir < 0 ? 1.2 : -1.2) * f.s, 1.2 * f.s).setVisible(fairK > 0.02));
      }

      // ——— the lamps, lit from the squall on; they flicker when the pier's struck
      const dip = lampDip.step(0, dt);
      const lampK = clamp(greyK * 0.6 + stormK * 0.4, 0, 1) * clamp(1 + dip * 0.12 + (Math.abs(dip) > 0.5 ? (crand() - 0.5) * 0.6 : 0), 0, 1.2);
      for (const l of lampImgs) {
        const n = 0.96 + flicker(t * 0.3, l.globe.x) * 0.04;
        l.globe.setAlpha(clamp(lampK * 1.2, 0, 1));
        l.halo.setAlpha(lampK * 0.35 * n);
        l.core.setAlpha(lampK * 0.5 * n);
      }
      lampPool.setAlpha(lampK * 0.25);
      lampWet.setAlpha(lampK * (greyK * 0.08 + stormK * 0.16));

      // ——— the lighthouse: lit, its beam sweeping round (bright and short when it turns to us)
      const lhK = clamp(greyK * 0.5 + stormK * 0.5, 0, 1);
      const th = t * 0.9;
      const cs = Math.cos(th);
      const sn = Math.sin(th);
      beam.setScale(cs * 1.4, 0.6 + (1 - Math.abs(cs)) * 1.6).setRotation(0.03 * Math.sign(cs)).setAlpha(lhK * (0.25 + Math.max(0, sn) * 0.35) * Math.abs(cs) ** 0.3);
      lantern.setAlpha(lhK * 0.7);
      lanternFlash.setAlpha(lhK * Math.max(0, sn) ** 8 * 0.9);

      // ——— lightning in the storm
      boltT += dt;
      if (stormK > 0.3 && boltT > nextBolt) {
        boltT = 0;
        nextBolt = 4 + crand() * 6;
        flash = 1;
        bolt.setFrame(Math.floor(crand() * 3)).setPosition(260 + crand() * 1000, HZ + 2).setScale((crand() < 0.5 ? -1 : 1) * (0.8 + crand() * 0.5), 0.9 + crand() * 0.3);
      }
      if (flash > 0) flash = Math.max(0, flash - dt * 2.6);
      // (a flash flickers: two or three pulses as it fades)
      const fl = flash * (0.6 + 0.4 * Math.sin(flash * 40)) * stormK;
      bolt.setAlpha(clamp(fl * 1.4, 0, 1));
      skyFlash.setAlpha(fl * 0.35);
      flashTop.setAlpha(fl * 0.08);

      // ——— the rain: a drizzle in the squall, a downpour in the storm; splashes on the deck and the table
      const rainK = clamp(greyK * 0.35 + stormK * 0.65, 0, 1);
      rainFar.setAlpha(rainK * 0.7);
      rainNear.setAlpha(clamp((rainK - 0.3) * 1.3, 0, 0.8));
      rainFar.tilePositionY -= 380 * dt * calm();
      rainFar.tilePositionX += 90 * wind * dt * calm();
      rainNear.tilePositionY -= 900 * dt * calm();
      rainNear.tilePositionX += 220 * wind * dt * calm();
      splashRate.tick(rainK * rainK * 50 * calm(), dt, () => splash(crand() * W, PR.deck + crand() * (PR.front - PR.deck)));
      dripRate.tick(rainK * 4 * calm(), dt, () => drops.spawn({ x: crand() * W, y: PR.rail + 7, life: 1, r0: 2.5, a: 0.6, tint: 0xdce8f0, grav: 900, floor: PR.deck + crand() * 20, onFloor: splash, streak: 0.02 }));
      splashes.update(dt);

      buoyS.update(dt, t);
      headS.update(dt, t);
      if (stormK > 0.2 && crand() < dt * 0.3) buoyS.kick((crand() - 0.5) * 0.4 * stormK);
    },
  };

  /** The gull's states: on its post (idling, now and then the long call), crouching, flying off, away, coming home. */
  function shadowAndGull(dt: number): void {
    const perched = gs === 'perch' || gs === 'crouch';
    stand.each((im) => im.setVisible(perched));
    gShadow.setVisible(perched);
    fly.each((im) => im.setVisible(gs === 'fly' || gs === 'home'));
    if (gs === 'perch') {
      callT -= dt;
      if (callU < 0 && callT <= 0) callU = 0;
      if (callU >= 0) {
        callU += dt / 1.6;
        if (callU >= 1) {
          callU = -1;
          callT = 7 + crand() * 9;
          stand.step(0);
        } else stand.each((im) => im.setFrame(GULL_IDLE + Math.min(GULL_CALL - 1, Math.floor(callU * GULL_CALL))).setAlpha(1));
        if (callU >= 0) stand.b.setAlpha(0);
      } else stand.step(dt);
    } else if (gs === 'crouch') {
      stand.each((im) => im.setFrame(GULL_IDLE + GULL_CALL));
      stand.b.setAlpha(0);
      if (gt > 0.18) {
        gs = 'fly';
        gt = 0;
        gp.x = PR.gull.x;
        gp.y = PR.gull.y - 40;
        gp.dir = crand() < 0.5 ? -1 : 1;
        gp.vx = gp.dir * (120 + crand() * 60);
        gp.vy = -260;
      }
    } else if (gs === 'fly') {
      // beating hard to climb, then levelling off and away
      gp.vy += 120 * dt;
      gp.vy = Math.min(gp.vy, -40);
      gp.vx += gp.dir * 120 * dt;
      gp.x += gp.vx * dt;
      gp.y += gp.vy * dt;
      fly.step(dt, 1.6);
      fly.each((im) => im.setPosition(gp.x, gp.y).setScale(gp.dir < 0 ? 1.2 : -1.2, 1.2).setRotation(gp.dir * -0.15));
      if (gp.x < -100 || gp.x > W + 100 || gp.y < -100) {
        gs = 'away';
        gt = 0;
        awayFor = 5 + crand() * 6;
      }
    } else if (gs === 'away') {
      if (gt > awayFor) {
        gs = 'home';
        gt = 0;
      }
    } else if (gs === 'home') {
      // gliding in from the right on a long curve, a few beats, then the flare to land
      const D = 4.2;
      const u = Math.min(1, gt / D);
      const e = 1 - (1 - u) ** 2;
      const x0 = W + 80;
      const y0 = 160;
      const cx = 1500;
      const cy = 260;
      const x1 = PR.gull.x;
      const y1 = PR.gull.y - 38;
      gp.x = (1 - e) * (1 - e) * x0 + 2 * (1 - e) * e * cx + e * e * x1;
      gp.y = (1 - e) * (1 - e) * y0 + 2 * (1 - e) * e * cy + e * e * y1;
      const flare = u > 0.85;
      const beats = u < 0.15 || (u > 0.45 && u < 0.55);
      if (flare || beats) fly.step(dt, flare ? 2.4 : 1.2);
      else {
        fly.a.setFrame(FLY_N);
        fly.b.setAlpha(0);
      }
      fly.each((im) => im.setPosition(gp.x, gp.y).setScale(1.2, 1.2).setRotation(flare ? 0.25 : -0.05));
      if (u >= 1) {
        gs = 'perch';
        gt = 0;
        callT = 1 + crand() * 2;
      }
    }
  }
});

