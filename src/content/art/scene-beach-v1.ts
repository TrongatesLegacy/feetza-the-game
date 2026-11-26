// Shack Attack Beach Bar, as first redrawn with the location kit (before painted frame animation): kept for the
// before/after page (?dev&stages). The beach the game shows is scene-beach.ts.
//
// Shack Attack Beach Bar (Act 2, waves 11–14), redrawn with the location kit (src/art/scene): a tropical beach in
// the warm, low light of late afternoon, seen from under a thatched bar. The sun hangs low over the sea on the left
// (the feet's key light), gilding the clouds' edges and laying a glitter path down the water; the sea deepens from
// the hazy horizon to clear turquoise shallows, lace foam on the wet sand; long shadows stretch across the sand from
// the umbrella and the sandcastle; palms frame the view, backlit, their fronds glowing; the bar's bamboo posts,
// thatch, sign, string lights, a tiki torch and a surfboard; the bar top is sun-bleached planks.
// Live: the surf washes up the sand and back, glints dance on the water, clouds drift, palm crowns and the sign sway
// in the breeze, gulls wheel past, a boat sails; across the stage's waves the afternoon turns to sunset (the lights
// come on) and then to a violet dusk with the first stars, the torch lit.

import Phaser from 'phaser';
import { SLAB } from '../../art/backdrops';
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
  rrPath,
  solid,
  vfill,
  vignetteAll,
  within,
} from '../../art/scene/kit';
import type { SceneSpec } from '../../art/scene/layers';
import { groundCast } from '../../art/scene/light';
import { board, foamLace, grain, planksPlane, sand, shallows, tableFalloff, tableSeam, varnish, water } from '../../art/scene/materials';
import { drift, lay } from '../../art/scene/paint';
import { bottle, flameShape } from '../../art/scene/props';
import { cirrus, cloud, farLand, horizonGlow, rays, skyFill, stars, sun } from '../../art/scene/sky';
import { ao, spec as specHi } from '../../art/style/kit';
import { mix, rgba, shade } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { calm, flicker, registerKitScene, sway, waveK } from '../../game/sceneLive';

const BH = {
  horizon: 452,
  shore: 604,
  thatch: 132,
  front: 1040,
  sign: { x: 960, y: 150 },
  palmL: { bx: 70, by: 770, tx: 300, ty: 236 },
  palmR: { bx: 1790, by: 770, tx: 1600, ty: 262 },
  umbrella: { x: 1260, y: 668 },
  castle: { x: 600, y: 676 },
  torch: { x: 1530, y: 760 },
  boat: { x: 1180, y: 446 },
  island: { x: 420, y: 452 },
  /** The sun: low over the sea on the left in the afternoon; on the horizon at sunset. */
  sun: { x: 560, y: 292, r: 40 },
  sunset: { x: 690, y: 446, r: 50 },
};

/** The afternoon's air: warm haze over the sea. */
const SEA_AIR: Air = { color: '#f0dcc0', far: 0.7 };

// ——— the sky ———

function sky(ctx: Ctx, r: R): void {
  const h = BH.horizon;
  const box = { x: 0, y: 0, w: W, h: h + 4 };
  // late afternoon: a deep blue overhead, warming through a soft green-gold to the bright gold haze of the horizon
  skyFill(ctx, box, [[0, '#2f5c9e'], [0.28, '#5a88bc'], [0.52, '#a8b8b8'], [0.72, '#f0c890'], [0.9, '#ffcc80'], [1, '#ffe0a8']]);
  lay(ctx, drift('#ffe0b0', '#4a68a8', 3, 81, 160, 48), box, 0.16);
  // the sun's warmth spreading through the haze round it
  glowAt(ctx, BH.sun.x, BH.sun.y + 30, 1000, '#ffb860', 0.32, 0.6);
  cirrus(ctx, r, { x: 0, y: 140, w: W, h: 150 }, '#ffe8c8', 0.2, -0.05, 22);
  horizonGlow(ctx, h, 120, '#ffd8a0', 0.5);
  // the low sun's rays fanning down through the haze
  rays(ctx, r, BH.sun.x, BH.sun.y, 16, 520, '#fff0c8', 0.12, Math.PI * 1.5, Math.PI / 2);
  sun(ctx, BH.sun.x, BH.sun.y, BH.sun.r, { disc: '#fffaf0', glow: '#ffc870', a: 0.9, bloom: 12, squash: 0.75 });
  glowAt(ctx, BH.sun.x, BH.sun.y, 150, '#fff4d8', 0.35);
}

/** The sky at sunset: the sun on the horizon, the sky burning orange low and violet high. */
function sunsetSky(ctx: Ctx, r: R): void {
  const h = BH.horizon;
  const box = { x: 0, y: 0, w: W, h: h + 4 };
  skyFill(ctx, box, [[0, '#2e2c6a'], [0.28, '#6a4a8a'], [0.52, '#d0647a'], [0.74, '#ff9a5a'], [0.9, '#ffc070'], [1, '#ffd890']]);
  lay(ctx, drift('#ffb080', '#4a3a7a', 3, 83, 160, 48), box, 0.2);
  glowAt(ctx, BH.sunset.x, h, 1000, '#ff8a4a', 0.3, 0.35);
  // long bars of cloud lit from below, glowing at their lower edges
  for (let i = 0; i < 7; i++) {
    const x = 100 + r() * 1720;
    const y = 200 + r() * 200;
    cloud(ctx, r, x, y, 260 + r() * 360, 26 + r() * 20, { kind: 'stratus', lit: '#ffb878', body: '#9a5a80', shadow: '#5a3a6a', sunX: BH.sunset.x, sunY: h + 60, rim: 0.7, wisp: 0.5, a: 0.85 });
  }
  horizonGlow(ctx, h, 140, '#ffc080', 0.6);
  // (the afternoon's horizon banks are under this sky: it paints its own, backlit by the setting sun)
  lowBanks(ctx, r, { lit: '#ffc890', body: '#a86a80', shadow: '#5a3a6a', sunX: BH.sunset.x, sunY: h + 40, rim: 0.8 });
  sun(ctx, BH.sunset.x, BH.sunset.y, BH.sunset.r, { disc: '#fff0c0', glow: '#ffa050', a: 0.75, bloom: 9, squash: 0.45, clipY: h });
}

/** Dusk: the sun gone, a violet sky with an afterglow band, the first stars. */
function duskSky(ctx: Ctx, r: R): void {
  const h = BH.horizon;
  const box = { x: 0, y: 0, w: W, h: h + 4 };
  skyFill(ctx, box, [[0, '#0e1236'], [0.4, '#262a62'], [0.72, '#5a3c76'], [0.9, '#b05a6a'], [1, '#e08a6a']]);
  lay(ctx, drift('#5a4a8a', '#0a0c28', 3, 85, 160, 48), box, 0.22);
  stars(ctx, r, { x: 0, y: 0, w: W, h: h - 120 }, 160);
  // a thin crescent moon, high on the right
  ctx.save();
  ctx.fillStyle = '#fff2d8';
  ctx.beginPath();
  ctx.arc(1480, 210, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(1488, 205, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  glowAt(ctx, 1476, 212, 60, '#d8d8ff', 0.25);
  horizonGlow(ctx, h, 120, '#ff9a7a', 0.4);
  lowBanks(ctx, r, { lit: '#d08098', body: '#4a3a6a', shadow: '#24204a', sunX: BH.sunset.x, sunY: h + 80, rim: 0.5 });
}

/** The low banks on the horizon, in a given light (the sunset and dusk skies paint them over their own). */
function lowBanks(ctx: Ctx, r: R, o: { lit: string; body: string; shadow: string; sunX: number; sunY: number; rim: number }): void {
  cloud(ctx, r, 1440, 424, 420, 44, { ...o, kind: 'stratus', depth: 0.6, air: SEA_AIR });
  cloud(ctx, r, 1780, 430, 300, 30, { ...o, kind: 'stratus', depth: 0.7, air: SEA_AIR });
  cloud(ctx, r, 960, 430, 380, 34, { ...o, kind: 'stratus', depth: 0.7, air: SEA_AIR });
  cloud(ctx, r, 340, 428, 300, 30, { ...o, kind: 'stratus', depth: 0.7, air: SEA_AIR });
}

function cloudsFar(ctx: Ctx, r: R): void {
  // low banks over the horizon, gilded on their sun side, lost in haze
  const o = { lit: '#fff0c8', body: '#e8c8b8', shadow: '#9a90b0', sunX: BH.sun.x, sunY: BH.sun.y, depth: 0.75, air: SEA_AIR, rim: 0.55 };
  cloud(ctx, r, 1440, 424, 420, 44, { ...o, kind: 'stratus' });
  cloud(ctx, r, 1780, 430, 300, 30, { ...o, kind: 'stratus', depth: 0.85 });
  cloud(ctx, r, 960, 430, 380, 34, { ...o, kind: 'stratus', depth: 0.85 });
  cloud(ctx, r, 340, 428, 300, 30, { ...o, kind: 'stratus', depth: 0.85 });
}

function cloudsNear(ctx: Ctx, r: R): void {
  const o = { lit: '#fff2d0', body: '#d4c4cc', shadow: '#7470a0', sunX: BH.sun.x, sunY: BH.sun.y, depth: 0.4, air: SEA_AIR, rim: 0.75, wisp: 0.25 };
  cloud(ctx, r, 1100, 330, 400, 120, { ...o, kind: 'cumulus' });
  cloud(ctx, r, 1560, 290, 300, 90, { ...o, kind: 'cumulus' });
}

// ——— the sea ———

/** The long shadows of the late sun: thrown right and towards us per pixel of height. */
const SHADOW = { kx: 0.8, ky: 0.3, col: '#4a3a6a' };

const shoreTop = (x: number) => BH.shore + Math.sin(x * 0.006 + 1) * 8 + Math.sin(x * 0.017) * 4;

function sea(ctx: Ctx, r: R): void {
  const h = BH.horizon;
  const s = BH.shore;
  water(ctx, r, 0, W, h, s + 12, {
    far: '#b8c4c8', deep: '#2a6a9a', near: '#2a9aa8', sky: '#ffe4c0', skyA: 0.55,
    ripple: '#fff4dc', ripples: 260, swells: 9, crest: '#ffe8c4',
    glitterX: BH.sun.x, glitter: '#fff0c0', glitterA: 0.75, glitterW: 200, seed: 31,
  });
  // the shallows: turquoise over the sand, the sunlight's caustic net on the bottom
  shallows(ctx, (x) => shoreTop(x) - 70, (x) => shoreTop(x) + 4, 0, W, '#48c0b8', 0.6, '#fff4d0', 0.22, 9);
  // the far water lost in the haze; the island's reflection
  haze(ctx, h - 4, h + 26, '#ffe8c8', 0.5, 0.15);
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = airMix('#3a5a50', 0.8, SEA_AIR);
  ctx.beginPath();
  ctx.ellipse(BH.island.x + 10, h + 6, 200, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The sea at sunset: the burning sky mirrored along the horizon, the water darkening to violet-blue, the sun's
 * path laid down it in orange. (Live only: it fades in over the afternoon sea.) */
function seaEve(ctx: Ctx, r: R): void {
  const h = BH.horizon;
  const s = BH.shore;
  water(ctx, r, 0, W, h, s + 12, {
    far: '#ffb27a', deep: '#4a4a7a', near: '#2a5a78', sky: '#ffc890', skyA: 0.5,
    ripple: '#ffd0a0', ripples: 240, swells: 9, crest: '#ffb080',
    glitterX: BH.sunset.x, glitter: '#ffc070', glitterA: 0.85, glitterW: 230, seed: 33,
  });
  haze(ctx, h - 4, h + 26, '#ffc890', 0.5, 0.15);
  // (it stops short of the shallows: fade its foot out)
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  vfill(ctx, 0, SEA_EVE.y + SEA_EVE.h - 40, W, 40, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,1)']]);
  ctx.restore();
  void s;
}

function island(ctx: Ctx, r: R): void {
  const h = BH.horizon;
  const ix = BH.island.x;
  // a hazy hump with palms, its ridge catching the sun
  const pts: [number, number][] = [[ix - 230, h + 1]];
  for (let k = 0; k <= 16; k++) {
    const t = k / 16;
    const x = ix - 230 + t * 470;
    const hump = Math.sin(t * Math.PI) ** 0.8 * 44 + Math.sin(t * 9) * 2 + (r() - 0.5) * 2;
    pts.push([x, h - hump]);
  }
  pts.push([ix + 240, h + 1]);
  const col = '#2f5a48';
  farLand(ctx, pts, h, col, 0.78, SEA_AIR, '#ffd890', 0.45);
  const c = airMix(col, 0.8, SEA_AIR);
  for (const [px, ph, lean] of [[ix - 40, 64, -0.25], [ix + 10, 80, 0.1], [ix + 62, 56, 0.3]] as const) {
    ctx.strokeStyle = c;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(px, h - 40);
    ctx.quadraticCurveTo(px + lean * 30, h - 40 - ph * 0.6, px + lean * 50, h - 40 - ph);
    ctx.stroke();
    for (let k = 0; k < 7; k++) {
      const a = -Math.PI / 2 + (k - 3) * 0.5;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(px + lean * 50, h - 40 - ph);
      ctx.quadraticCurveTo(px + lean * 50 + Math.cos(a) * 18, h - 40 - ph + Math.sin(a) * 10 - 6, px + lean * 50 + Math.cos(a) * 30, h - 40 - ph + Math.sin(a) * 14 + 8);
      ctx.stroke();
    }
  }
}

function shore(ctx: Ctx, r: R): void {
  const s = BH.shore;
  const path = (c: Ctx) => {
    c.beginPath();
    c.moveTo(-10, shoreTop(-10));
    for (let x = 0; x <= W + 10; x += 20) c.lineTo(x, shoreTop(x));
    c.lineTo(W + 10, TY + 2);
    c.lineTo(-10, TY + 2);
    c.closePath();
  };
  within(ctx, path, () => {
    const box = { x: 0, y: s - 20, w: W, h: TY - s + 30 };
    sand(ctx, r, box, '#e8c890', { ripples: 140, light: '#fff0c8', shadow: '#8a7aa8', sparkle: 0.8, seed: 43 });
    // wet sand: darker, glossy, the sky and the sun mirrored in it
    vfill(ctx, 0, s - 20, W, 56, [[0, 'rgba(120,90,60,0.55)'], [0.55, 'rgba(120,90,60,0.25)'], [1, 'rgba(120,90,60,0)']]);
    vfill(ctx, 0, s - 10, W, 22, [[0, 'rgba(255,232,200,0.3)'], [1, 'rgba(255,232,200,0)']]);
    lightPool(ctx, BH.sun.x + 30, s + 6, 220, 10, '#fff0c8', 0.4, 'screen');
    // the low sun across the beach: warm and bright on the left, the sand cooling to the right and in the bar's
    // shade nearer us
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, 'rgba(255,214,150,0.16)');
    g.addColorStop(0.5, 'rgba(255,214,150,0)');
    g.addColorStop(1, 'rgba(90,90,150,0.12)');
    ctx.fillStyle = g;
    ctx.fillRect(0, s - 20, W, TY - s + 30);
    vfill(ctx, 0, TY - 90, W, 90, [[0, 'rgba(80,50,40,0)'], [1, 'rgba(80,50,40,0.36)']]);
    // shells, a starfish, footprints wandering to the water
    for (let i = 0; i < 16; i++) {
      const x = r() * W;
      const y = s + 30 + r() * (TY - s - 60);
      ctx.fillStyle = rgba(['#fff6ea', '#f8d0c0', '#e8c0a0'][i % 3], 0.9);
      ctx.beginPath();
      ctx.ellipse(x, y, 3 + r() * 3, 2 + r() * 2, r() * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(90,70,90,0.3)';
      ctx.beginPath();
      ctx.ellipse(x + 3, y + 2, 3, 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let k = 0; k < 9; k++) {
      const t = k / 8;
      const fx = 1420 + t * 180 + (k % 2) * 14;
      const fy = TY - 20 - t * 120;
      const sc = 1 - t * 0.55;
      ctx.fillStyle = 'rgba(110,80,80,0.3)';
      ctx.beginPath();
      ctx.ellipse(fx, fy, 7 * sc, 3.5 * sc, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,240,210,0.35)';
      ctx.beginPath();
      ctx.ellipse(fx + 2 * sc, fy + 2.5 * sc, 6 * sc, 1.6 * sc, 0.3, 0, Math.PI);
      ctx.fill();
    }
  });
  // the low sun throws everything's shadow long across the sand, towards us and to the right
  within(ctx, path, () => {
    for (const p of [BH.palmL, BH.palmR]) groundCast(ctx, trunkPath(p), TY, SHADOW.kx, SHADOW.ky, 0.3, 8, SHADOW.col);
    groundCast(ctx, umbrellaShape(), BH.umbrella.y, SHADOW.kx, SHADOW.ky, 0.42, 5, SHADOW.col);
    // (the canopy is a disc: its shadow an ellipse thrown out along the light)
    const uh = 170;
    ao(ctx, BH.umbrella.x + 13 + uh * SHADOW.kx, BH.umbrella.y + uh * SHADOW.ky, 120, 26, 0.36, -0.08, SHADOW.col);
    groundCast(ctx, castleShape(), BH.castle.y, SHADOW.kx, SHADOW.ky, 0.42, 4, SHADOW.col);
    groundCast(ctx, rectPath(BH.torch.x - 9, BH.torch.y - 360, 18, 360), BH.torch.y, SHADOW.kx, SHADOW.ky, 0.3, 5, SHADOW.col);
  });
  // the foam where the last wave reached (live: the surf washes in and out over it)
  foamLace(ctx, r, (x) => shoreTop(x) + 2, -10, W + 10, 22, { a: 0.85, seed: 3 });
  // dune grass in tufts at the sides, backlit
  for (const [gx, gy, n] of [[200, TY - 24, 14], [420, TY - 8, 10], [1500, TY - 14, 12], [1700, TY - 30, 9]] as const) grassTuft(ctx, r, gx, gy, n);
}

function grassTuft(ctx: Ctx, r: R, x: number, y: number, n: number): void {
  groundShadow(ctx, x + 26, y + 2, 34, 4, 0.28, '#6a4a60', 1.6);
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const lean = (r() - 0.35) * 1.1;
    const h = 28 + r() * 42;
    const bx = x + (r() - 0.5) * 30;
    const tx = bx + lean * h * 0.8;
    const ty = y - h;
    ctx.strokeStyle = mix('#6a7a3a', '#3a4a24', r());
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(bx, y);
    ctx.quadraticCurveTo(bx + lean * h * 0.2, y - h * 0.6, tx, ty);
    ctx.stroke();
    // the low sun through the blade
    ctx.strokeStyle = rgba('#ffe090', 0.55);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx + lean * h * 0.15, y - h * 0.5);
    ctx.quadraticCurveTo(bx + lean * h * 0.3, y - h * 0.75, tx, ty);
    ctx.stroke();
  }
}

/** The umbrella's silhouette (pole and canopy), for its shadow. */
function umbrellaShape(): PathFn {
  const { x, y } = BH.umbrella;
  return (c) => {
    c.beginPath();
    c.moveTo(x - 3, y);
    c.lineTo(x + 3, y);
    c.lineTo(x + 16, y - 150);
    c.lineTo(x + 10, y - 150);
    c.closePath();
    c.moveTo(x + 13, y - 196);
    c.lineTo(x + 143, y - 140);
    c.quadraticCurveTo(x + 13, y - 120, x - 117, y - 140);
    c.closePath();
  };
}

/** The sandcastle's silhouette, for its shadow. */
function castleShape(): PathFn {
  const { x, y } = BH.castle;
  return (c) => {
    c.beginPath();
    for (const [dx, dy, w, h] of CASTLE) c.rect(x + dx, y + dy - 8, w, h + 8);
    c.moveTo(x, y - 160);
    c.lineTo(x + 26, y - 152);
    c.lineTo(x, y - 144);
    c.closePath();
  };
}

const CASTLE: [number, number, number, number][] = [[-70, -40, 140, 40], [-60, -82, 34, 44], [26, -82, 34, 44], [-18, -112, 36, 74]];

/** A striped beach umbrella stuck in the sand, its long shadow, and a towel. */
function umbrella(ctx: Ctx, r: R): void {
  const { x, y } = BH.umbrella;
  const towel = polyPath([[x - 150, y + 6], [x - 30, y + 2], [x - 20, y + 30], [x - 160, y + 34]]);
  groundShadow(ctx, x - 70, y + 36, 80, 6, 0.28, '#5a4a7a');
  solid(ctx, towel, { x: x - 160, y, w: 140, h: 34 }, 'canvas', '#3a9ad8', { depth: 0.4, line: 1.4, formSize: 4 });
  within(ctx, towel, () => {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let k = 0; k < 5; k++) ctx.fillRect(x - 160 + k * 30, y, 10, 40);
    // a fold across it
    ctx.fillStyle = 'rgba(20,40,80,0.25)';
    ctx.fillRect(x - 160, y + 17, 150, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x - 160, y + 14, 150, 3);
  });
  const pole = polyPath([[x - 3, y], [x + 3, y], [x + 16, y - 150], [x + 10, y - 150]]);
  solid(ctx, pole, { x: x - 3, y: y - 150, w: 20, h: 150 }, 'wood', '#e8e0d0', { depth: 0.4, line: 1.6, formSize: 3 });
  // the canopy: panels alternating red and white, each a taut cloth bellying between its ribs, lit on the sun side
  // with the sun glowing through the panels turned to it
  const cx = x + 13;
  const cy = y - 150;
  const rw = 130;
  const panels = 8;
  for (let i = 0; i < panels; i++) {
    const a0 = Math.PI + (i / panels) * Math.PI;
    const a1 = Math.PI + ((i + 1) / panels) * Math.PI;
    const p = (c: Ctx) => {
      c.beginPath();
      c.moveTo(cx, cy - 46);
      c.lineTo(cx + Math.cos(a0) * rw, cy + Math.sin(a0) * 10 + 10);
      c.quadraticCurveTo(cx + Math.cos((a0 + a1) / 2) * rw * 0.96, cy + 18, cx + Math.cos(a1) * rw, cy + Math.sin(a1) * 10 + 10);
      c.closePath();
    };
    const lit = 1 - i / panels;
    const base = i % 2 ? '#f4f0e8' : '#e8402a';
    solid(ctx, p, { x: cx - rw, y: cy - 46, w: rw * 2, h: 64 }, 'canvas', shade(base, (lit - 0.5) * 0.25), { depth: 0.4, line: 1.6, formSize: 8 });
    within(ctx, p, () => {
      // each panel bellies: lighter in its middle, darker along its ribs
      const mx = cx + Math.cos((a0 + a1) / 2) * rw * 0.6;
      const g = ctx.createRadialGradient(mx, cy - 6, 2, mx, cy - 6, rw * 0.5);
      g.addColorStop(0, rgba('#fff4e0', 0.18 * lit + 0.04));
      g.addColorStop(1, rgba('#3a1020', 0.15));
      ctx.fillStyle = g;
      ctx.fillRect(cx - rw, cy - 50, rw * 2, 70);
    });
  }
  // the scalloped hem's shadow inside, and the sun through the cloth
  lightPool(ctx, cx - rw * 0.5, cy - 4, 60, 18, '#ffd890', 0.2, 'screen');
  void r;
}

/** A sandcastle with a little flag (the mini-boss's home turf). */
function sandcastle(ctx: Ctx, r: R): void {
  const { x, y } = BH.castle;
  for (const [dx, dy, w, h] of CASTLE) {
    const p = (c: Ctx) => {
      c.beginPath();
      c.moveTo(x + dx, y + dy + h);
      c.lineTo(x + dx + 2, y + dy);
      for (let k = 0; k < 4; k++) {
        const bx = x + dx + 2 + (k * (w - 4)) / 4;
        c.lineTo(bx, y + dy - 8);
        c.lineTo(bx + (w - 4) / 8, y + dy - 8);
        c.lineTo(bx + (w - 4) / 8, y + dy);
        c.lineTo(bx + (w - 4) / 4, y + dy);
      }
      c.lineTo(x + dx + w, y + dy + h);
      c.closePath();
    };
    castShadow(ctx, p, 8, 6, 0.25, '#5a4a7a');
    solid(ctx, p, { x: x + dx, y: y + dy - 8, w, h: h + 8 }, 'stone', '#e8c88a', { depth: 0.38, line: 1.6, formSize: 8 });
    within(ctx, p, () => {
      grain(ctx, { x: x + dx, y: y + dy - 8, w, h: h + 8 }, 'speckle', 0.5, 1);
      // the sun's side gold, the far side cool
      const g = ctx.createLinearGradient(x + dx, 0, x + dx + w, 0);
      g.addColorStop(0, rgba('#ffe0a0', 0.25));
      g.addColorStop(1, rgba('#6a5a8a', 0.25));
      ctx.fillStyle = g;
      ctx.fillRect(x + dx, y + dy - 8, w, h + 8);
    });
  }
  ctx.fillStyle = '#3a2410';
  ctx.beginPath();
  ctx.ellipse(x, y - 14, 10, 14, 0, Math.PI, 0);
  ctx.fill();
  ctx.strokeStyle = '#4a3020';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - 120);
  ctx.lineTo(x, y - 160);
  ctx.stroke();
  ctx.fillStyle = '#ff4a6a';
  ctx.beginPath();
  ctx.moveTo(x, y - 160);
  ctx.lineTo(x + 26, y - 152);
  ctx.lineTo(x, y - 144);
  ctx.fill();
  const bucket = polyPath([[x + 96, y - 26], [x + 128, y - 26], [x + 124, y + 2], [x + 100, y + 2]]);
  groundShadow(ctx, x + 130, y + 4, 26, 4, 0.3, '#5a4a7a', 1.6);
  solid(ctx, bucket, { x: x + 96, y: y - 26, w: 32, h: 28 }, 'plastic', '#ffd23f', { depth: 0.38, line: 1.6, formSize: 6 });
  void r;
}

// ——— palms ———

interface Palm {
  bx: number;
  by: number;
  tx: number;
  ty: number;
}

function trunkPath(p: Palm): PathFn {
  return trunkGeom(p).path;
}

function trunkGeom(p: Palm) {
  const mx = (p.bx + p.tx) / 2 + (p.tx > p.bx ? -60 : 60);
  const my = (p.by + p.ty) / 2 + 40;
  const at = (t: number): [number, number] => [(1 - t) * (1 - t) * p.bx + 2 * (1 - t) * t * mx + t * t * p.tx, (1 - t) * (1 - t) * p.by + 2 * (1 - t) * t * my + t * t * p.ty];
  const wAt = (t: number) => 30 - t * 14;
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const [x, y] = at(t);
    const [x2, y2] = at(Math.min(1, t + 0.01));
    const nx = -(y2 - y);
    const ny = x2 - x;
    const l = Math.hypot(nx, ny) || 1;
    left.push([x + (nx / l) * wAt(t), y + (ny / l) * wAt(t)]);
    right.push([x - (nx / l) * wAt(t), y - (ny / l) * wAt(t)]);
  }
  return { at, wAt, path: polyPath([...left, ...right.reverse()]) };
}

function trunk(ctx: Ctx, r: R, p: Palm): void {
  const { at, wAt, path } = trunkGeom(p);
  const box = { x: Math.min(p.bx, p.tx) - 40, y: p.ty, w: Math.abs(p.tx - p.bx) + 80, h: p.by - p.ty };
  solid(ctx, path, box, 'wood', '#a07850', { depth: 0.2, formSize: 18 });
  within(ctx, path, () => {
    for (let i = 1; i < 30; i++) {
      const t = i / 30;
      const [x, y] = at(t);
      const w = wAt(t) + 4;
      ctx.strokeStyle = 'rgba(60,34,14,0.45)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(x, y, w, 5, 0.1, 0, Math.PI);
      ctx.stroke();
      ctx.strokeStyle = rgba('#fff0d0', 0.25);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(x, y - 3, w, 5, 0.1, Math.PI * 0.9, Math.PI * 1.4);
      ctx.stroke();
    }
    grain(ctx, box, 'wood', 0.3, 1.3);
    lay(ctx, drift('#d8b080', '#4a3a40', 4, 61), box, 0.3);
    // the low sun on the trunk's left side, warm; its right side cool
    const g = ctx.createLinearGradient(box.x, 0, box.x + box.w, 0);
    g.addColorStop(0, rgba('#ffd890', 0.2));
    g.addColorStop(1, rgba('#4a4a8a', 0.2));
    ctx.fillStyle = g;
    ctx.fillRect(box.x, box.y, box.w, box.h);
  });
  void r;
}

/** A palm crown: fronds arching out of the top of the trunk and drooping, each a rib hung with narrow leaflets. The
 * low sun is behind them: the leaflets glow yellow-green where it shines through, the ones in the crown's own
 * shade stay deep green. */
function crown(ctx: Ctx, r: R, p: Palm, flip: number): void {
  const { tx, ty } = p;
  const fronds = [-2.95, -2.5, -2.05, -1.6, -1.2, -0.75, -0.3, 0.15, 2.75, 3.25].map((a) => a + (r() - 0.5) * 0.15);
  fronds.sort((a, b) => Math.sin(a) - Math.sin(b));
  // towards the sun (screen direction) the leaves are backlit
  const sdx = BH.sun.x - tx;
  const sdy = BH.sun.y - ty;
  const sl = Math.hypot(sdx, sdy) || 1;
  for (const a0 of fronds) {
    const a = flip > 0 ? a0 : Math.PI - a0;
    const len = 200 + r() * 60;
    const up = -Math.sin(a);
    const ex = tx + Math.cos(a) * len;
    const ey = ty - up * len * 0.35 + len * 0.42;
    const cx = tx + Math.cos(a) * len * 0.55;
    const cy = ty - up * len * 0.55 - 30;
    const back = up > 0.6;
    const q = (t: number): [number, number] => [(1 - t) * (1 - t) * tx + 2 * (1 - t) * t * cx + t * t * ex, (1 - t) * (1 - t) * ty + 2 * (1 - t) * t * cy + t * t * ey];
    const n = 22;
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 1; i <= n; i++) {
        const t = i / (n + 1);
        const [x, y] = q(t);
        const [x2, y2] = q(Math.min(1, t + 0.03));
        const dx = x2 - x;
        const dy = y2 - y;
        const l = Math.hypot(dx, dy) || 1;
        const nx = (-dy / l) * side;
        const ny = (dx / l) * side;
        const bl = (18 + Math.sin(Math.min(1, t * 1.6) * Math.PI) * 46) * (1 - t * 0.35);
        const hx = x + nx * bl * 0.6 + (dx / l) * bl * 0.45;
        const hy = y + Math.abs(ny) * bl * 0.3 + bl * 0.75;
        const lower = ny > 0;
        // backlight: how much this leaflet faces the sun from in front of it
        const facing = Math.max(0, ((x - tx) * sdx + (y - ty) * sdy) / (sl * len));
        const glow = Math.min(1, facing * 1.4) * (lower ? 0.5 : 1) * (back ? 0.6 : 1);
        const baseCol = back ? '#24481f' : '#335e28';
        const col = mix(shade(baseCol, (lower ? -0.2 : 0) + (r() - 0.5) * 0.1), '#b8c860', glow * 0.4);
        const blade = (c: Ctx) => {
          c.beginPath();
          c.moveTo(x - (dx / l) * 3, y - (dy / l) * 3);
          c.quadraticCurveTo(x + nx * bl * 0.5, y + ny * bl * 0.2, hx, hy);
          c.quadraticCurveTo(x + nx * bl * 0.4 + (dx / l) * 8, y + ny * bl * 0.25 + 6, x + (dx / l) * 4, y + (dy / l) * 4);
          c.closePath();
        };
        blade(ctx);
        const lg = ctx.createLinearGradient(x, y, hx, hy);
        lg.addColorStop(0, shade(col, -0.18));
        lg.addColorStop(0.6, col);
        lg.addColorStop(1, mix(col, '#d8e090', glow * 0.2));
        ctx.fillStyle = lg;
        ctx.fill();
        ctx.strokeStyle = rgba('#14300c', 0.22);
        ctx.lineWidth = 0.9;
        ctx.stroke();
        if (!lower && r() < 0.6) {
          ctx.strokeStyle = rgba('#f0ffc0', 0.25 + glow * 0.3);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.quadraticCurveTo(x + nx * bl * 0.45, y + ny * bl * 0.2, hx, hy);
          ctx.stroke();
        }
      }
    }
    ctx.strokeStyle = '#2a4a14';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(cx, cy, ex, ey);
    ctx.stroke();
    ctx.strokeStyle = '#b8d07a';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // coconuts in the crown's shade
  for (const [dx, dy] of [[-12, 14], [10, 16], [0, 26]] as const) {
    const c = ellPath(tx + dx, ty + dy, 13, 12);
    solid(ctx, c, { x: tx + dx - 13, y: ty + dy - 12, w: 26, h: 24 }, 'wood', '#6a4a24', { depth: 0.18, line: 2, formSize: 5 });
  }
}

// ——— the bar ———

function thatch(ctx: Ctx, r: R): void {
  const h = BH.thatch;
  // the underside of the roof: dark, warm, the rafters' poles running up into it
  vfill(ctx, 0, 0, W, h, [[0, '#2a180c'], [1, '#4a301a']]);
  lay(ctx, drift('#6a4a2a', '#140a04', 10, 71, 256, 24), { x: 0, y: 0, w: W, h }, 0.5);
  for (let x = 140; x < W; x += 260) {
    const p = polyPath([[x - 8, -4], [x + 8, -4], [x + 30, h - 30], [x + 14, h - 30]]);
    solid(ctx, p, { x: x - 8, y: 0, w: 40, h: h - 30 }, 'wood', '#6a4a26', { depth: 0.2, line: 1.4, formSize: 5 });
  }
  board(ctx, r, 0, h - 40, W, 22, '#6a4422');
  crevice(ctx, 0, W, h - 18, 14, 0.5);
  // the fringe: bundles of dry grass hanging in layers, the bright sky behind glowing through their tips
  for (let layer = 0; layer < 3; layer++) {
    const y0 = h - 70 + layer * 22;
    for (let x = -20; x < W + 20; x += 6) {
      const len = 40 + r() * 50 + layer * 6;
      const col = shade(['#c8a05a', '#b88a48', '#d8b46a'][Math.floor(r() * 3)], -0.3 + layer * 0.1);
      const ex = x + (r() - 0.4) * 12;
      const ey = y0 + len;
      const g = ctx.createLinearGradient(0, y0, 0, ey);
      g.addColorStop(0, shade(col, -0.35));
      g.addColorStop(0.7, col);
      g.addColorStop(1, mix(col, '#ffe8b0', 0.45));
      ctx.strokeStyle = g;
      ctx.lineWidth = 2 + r() * 2;
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.quadraticCurveTo(x + (r() - 0.5) * 8, y0 + len * 0.5, ex, ey);
      ctx.stroke();
    }
  }
  // the fringe's edge glowing against the sky (strongest on the sun's side)
  for (let x = 0; x < W; x += 3) {
    if (r() < 0.25) {
      const near = Math.max(0, 1 - Math.abs(x - BH.sun.x) / 900);
      ctx.fillStyle = rgba('#fff0b0', 0.3 + near * 0.4);
      ctx.fillRect(x, h + 4 + r() * 30, 1.6, 6);
    }
  }
  grain(ctx, { x: 0, y: 0, w: W, h: h + 60 }, 'grain', 0.25, 1.2);
}

/** Calm behind the HUD: the score and wave label sit over the top-left of the thatch. */
function hudCalm(ctx: Ctx): void {
  const g = ctx.createRadialGradient(180, 70, 40, 180, 70, 520);
  g.addColorStop(0, 'rgba(30,16,6,0.55)');
  g.addColorStop(0.5, 'rgba(30,16,6,0.3)');
  g.addColorStop(1, 'rgba(30,16,6,0)');
  ctx.save();
  ctx.scale(1, 0.4);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 760, 520);
  ctx.restore();
}

function bamboo(ctx: Ctx, r: R, x: number, y0: number, y1: number, w: number): void {
  const p = rectPath(x, y0, w, y1 - y0);
  castShadow(ctx, p, 20, 18, 0.25, '#4a2a10');
  solid(ctx, p, { x, y: y0, w, h: y1 - y0 }, 'wood', '#c8a060', { depth: 0.08, formSize: w * 0.35 });
  within(ctx, p, () => {
    for (let y = y0 + 60 + r() * 40; y < y1; y += 110 + r() * 40) {
      // a node: a ridge lit on top, a groove under it
      ctx.fillStyle = 'rgba(70,40,10,0.55)';
      ctx.fillRect(x, y, w, 5);
      ctx.fillStyle = rgba('#fff0c0', 0.4);
      ctx.fillRect(x, y + 5, w, 2);
      ctx.fillStyle = 'rgba(70,40,10,0.2)';
      ctx.fillRect(x, y - 10, w, 10);
    }
    for (let fx = x + 4; fx < x + w; fx += 5 + r() * 4) {
      ctx.fillStyle = rgba(r() < 0.5 ? '#6a4a1a' : '#fff0c8', 0.12);
      ctx.fillRect(fx, y0, 1.2, y1 - y0);
    }
    lay(ctx, drift('#e8c890', '#5a3a20', 3, Math.round(x) + 5, 32, 160), { x, y: y0, w, h: y1 - y0 }, 0.3);
    // the polished cane: a long vertical sheen down its lit side
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0.15, 'rgba(255,240,200,0)');
    g.addColorStop(0.28, 'rgba(255,240,200,0.3)');
    g.addColorStop(0.4, 'rgba(255,240,200,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y0, w, y1 - y0);
  });
}

function postR(ctx: Ctx, r: R): void {
  bamboo(ctx, r, W - 64, 0, TY, 74);
  // a surfboard leaning on the right post
  const sb = (c: Ctx) => {
    c.save();
    c.translate(1770, 744);
    c.rotate(-0.12);
    c.beginPath();
    c.moveTo(0, 0);
    c.bezierCurveTo(-58, -40, -60, -400, 0, -500);
    c.bezierCurveTo(60, -400, 58, -40, 0, 0);
    c.closePath();
    c.restore();
  };
  castShadow(ctx, sb, 26, 20, 0.25, '#4a2a10');
  solid(ctx, sb, { x: 1700, y: 240, w: 140, h: 510 }, 'plastic', '#2ab8a8', { depth: 0.1, formSize: 30 });
  within(ctx, sb, () => {
    ctx.save();
    ctx.translate(1770, 744);
    ctx.rotate(-0.12);
    ctx.fillStyle = '#ff7a3a';
    ctx.fillRect(-80, -330, 160, 34);
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(-80, -292, 160, 14);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(-2, -500, 4, 500);
    // the glassed finish: the sky in a long soft band down its left
    const g = ctx.createLinearGradient(-60, 0, 60, 0);
    g.addColorStop(0.1, 'rgba(255,240,210,0)');
    g.addColorStop(0.25, 'rgba(255,240,210,0.35)');
    g.addColorStop(0.36, 'rgba(255,240,210,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-60, -500, 120, 500);
    ctx.restore();
  });
  specHi(ctx, 1742, 420, 70, 10, 0.7, -1.45);
  specHi(ctx, 1760, 300, 26, 5, 0.6, -1.45);
}

function torch(ctx: Ctx, r: R): void {
  const { x, y } = BH.torch;
  const pole = rectPath(x - 9, y - 330, 18, 330);
  groundShadow(ctx, x + 4, y, 16, 4, 0.4, '#3a2a40');
  castShadow(ctx, pole, 20, 14, 0.25, '#4a2a10');
  solid(ctx, pole, { x: x - 9, y: y - 330, w: 18, h: 330 }, 'wood', '#8a6034', { depth: 0.12, formSize: 6 });
  const cup = polyPath([[x - 24, y - 360], [x + 24, y - 360], [x + 14, y - 322], [x - 14, y - 322]]);
  solid(ctx, cup, { x: x - 24, y: y - 360, w: 48, h: 38 }, 'wood', '#6a4422', { depth: 0.12, formSize: 6 });
  within(ctx, cup, () => {
    ctx.strokeStyle = 'rgba(40,20,6,0.6)';
    ctx.lineWidth = 2;
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.moveTo(x - 24, y - 352 + k * 9);
      ctx.lineTo(x + 24, y - 356 + k * 9);
      ctx.stroke();
    }
  });
  void r;
}

/** String lights along the thatch's edge (unlit by day; the live layer lights them towards sunset). */
const BULBS: [number, number, string][] = (() => {
  const out: [number, number, string][] = [];
  const cols = ['#ff6a8a', '#ffd84a', '#5ae0ff', '#8aff7a', '#ff9a3a'];
  for (let i = 0; i < 30; i++) {
    const t = i / 29;
    const x = 90 + t * (W - 180);
    const seg = (t * 4) % 1;
    out.push([x, BH.thatch + 22 + Math.sin(seg * Math.PI) * 26, cols[i % cols.length]]);
  }
  return out;
})();

function lights(ctx: Ctx, lit: boolean): void {
  ctx.strokeStyle = '#2a1a0c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  BULBS.forEach(([x, y], i) => (i ? ctx.lineTo(x, y - 8) : ctx.moveTo(x, y - 8)));
  ctx.stroke();
  for (const [x, y, c] of BULBS) {
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(x - 3, y - 10, 6, 5);
    const b = ellPath(x, y, 5, 7);
    b(ctx);
    ctx.fillStyle = lit ? c : mix(c, '#e8e0d0', 0.55);
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,20,10,0.6)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillRect(x - 2.5, y - 4, 1.6, 3);
    // (lit, the bulb is just brighter here; its halo is in lightsGlow, an additive layer)
    if (lit) {
      ctx.fillStyle = rgba('#ffffff', 0.45);
      b(ctx);
      ctx.fill();
    }
  }
}

/** The lit bulbs' light on the bar top and the thatch's fringe (live only: added over the base at dusk). */
function lightsGlow(ctx: Ctx): void {
  for (const [x, y, c] of BULBS) {
    // the bulb's own halo (kept off the sign: it would wash it out), and its spill below
    glowAt(ctx, x, y, 30, c, 0.75);
    glowAt(ctx, x, y, 10, '#ffffff', 0.6);
    if (Math.abs(x - BH.sign.x) > 320) glowAt(ctx, x, y + 20, 60, c, 0.24, 1.2);
    lightPool(ctx, x, BH.front - 160, 140, 60, mix(c, '#ffd8a0', 0.5), 0.14);
  }
}

function sign(ctx: Ctx, r: R): void {
  const { x, y } = BH.sign;
  const w = 560;
  const h = 96;
  for (const dx of [-200, 200]) {
    ctx.strokeStyle = '#6a4a24';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + dx, y - 70);
    ctx.lineTo(x + dx, y - h / 2 + 4);
    ctx.stroke();
  }
  const p = rrPath(x - w / 2, y - h / 2, w, h, 12);
  castShadow(ctx, p, 18, 16, 0.3, '#3a2010');
  solid(ctx, p, { x: x - w / 2, y: y - h / 2, w, h }, 'wood', '#9a6a3a', { depth: 0.1, formSize: 16 });
  within(ctx, p, () => {
    board(ctx, r, x - w / 2, y - h / 2, w, h, '#9a6a3a');
    for (let k = 1; k < 3; k++) {
      ctx.fillStyle = 'rgba(40,20,6,0.45)';
      ctx.fillRect(x - w / 2, y - h / 2 + (k * h) / 3, w, 2);
      ctx.fillStyle = rgba('#ffe0b0', 0.2);
      ctx.fillRect(x - w / 2, y - h / 2 + (k * h) / 3 + 2, w, 1);
    }
    // sun-bleached, salt-weathered
    lay(ctx, drift('#d8b080', '#3a2010', 6, 91, 160, 32), { x: x - w / 2, y: y - h / 2, w, h }, 0.3);
    varnish(ctx, { x: x - w / 2, y: y - h / 2, w, h }, [{ x: BH.sun.x + 60, a: 0.25, w: 120 }], { sheen: 0.08, vertical: false });
  });
  ctx.lineWidth = lineAt(0.1);
  ctx.strokeStyle = '#3a1e0c';
  p(ctx);
  ctx.stroke();
  // carved, painted letters: the carving's shadow, the paint, a lit edge
  ctx.font = `64px ${SLAB}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#2a1408';
  ctx.fillText('SHACK ATTACK', x + 3, y + 5);
  ctx.fillStyle = '#ffe9b0';
  ctx.fillText('SHACK ATTACK', x, y + 2);
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const g = ctx.createLinearGradient(0, y - 30, 0, y + 34);
  g.addColorStop(0, 'rgba(255,255,255,0.0)');
  g.addColorStop(1, 'rgba(120,60,20,0.25)');
  ctx.fillStyle = g;
  ctx.fillRect(x - w / 2, y - 34, w, 68);
  ctx.restore();
}

function table(ctx: Ctx, r: R): void {
  planksPlane(ctx, r, BH.front, '#c89a62', 0.3, 0.01);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, BH.front - TY + 4);
  ctx.clip();
  // salt-bleached: paler towards the open side, a waxed sheen catching the low sun
  lay(ctx, drift('#f0d8b0', '#6a4a3a', 5, 51, 256, 48), { x: 0, y: TY, w: W, h: BH.front - TY }, 0.14);
  varnish(ctx, { x: 0, y: TY, w: W, h: BH.front - TY }, [{ x: BH.sun.x, a: 0.16, w: 160, col: '#ffe0a8' }], { sheen: 0.06 });
  // sun through the thatch: dappled light on the bar top
  // the low sun reaching in under the thatch: warm on the back of the bar, under the sun's side
  lightPool(ctx, BH.sun.x + 100, TY + 30, 700, 90, '#ffd890', 0.16, 'screen');
  ctx.restore();
  tableFalloff(ctx, BH.front, 0.3, '#3a2008');
  tableSeam(ctx, 0.4, '#3a2010', false);
  // the bar's front: bamboo slats
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, BH.front, W, 1080 - BH.front);
  ctx.clip();
  for (let x = -6; x < W; x += 34) {
    const g = ctx.createLinearGradient(x, 0, x + 32, 0);
    g.addColorStop(0, '#d8b070');
    g.addColorStop(0.4, '#b88a4a');
    g.addColorStop(1, '#6a4a22');
    ctx.fillStyle = g;
    ctx.fillRect(x, BH.front, 32, 60);
  }
  vfill(ctx, 0, BH.front, W, 40, [[0, 'rgba(30,14,4,0.5)'], [1, 'rgba(30,14,4,0.2)']]);
  ctx.restore();
  ctx.fillStyle = rgba('#fff0c8', 0.4);
  ctx.fillRect(0, BH.front - 3, W, 3);
  ctx.fillStyle = 'rgba(40,20,6,0.7)';
  ctx.fillRect(0, BH.front, W, 2);
}

function drink(ctx: Ctx): void {
  const cx = 150;
  const cy = 806;
  groundShadow(ctx, cx + 16, cy + 2, 50, 8, 0.4, '#3a2010', 1.4);
  const nut = ellPath(cx, cy - 26, 36, 30);
  solid(ctx, nut, { x: cx - 36, y: cy - 56, w: 72, h: 60 }, 'wood', '#6a4422', { depth: 0.05, formSize: 12 });
  within(ctx, nut, () => grain(ctx, { x: cx - 40, y: cy - 60, w: 80, h: 70 }, 'fleece', 0.5, 1));
  ctx.beginPath();
  ctx.ellipse(cx, cy - 50, 26, 7, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#fff6e8';
  ctx.fill();
  ctx.strokeStyle = '#3a2410';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = '#ff5a8a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx + 6, cy - 50);
  ctx.lineTo(cx + 30, cy - 104);
  ctx.stroke();
  const um = (c: Ctx) => {
    c.beginPath();
    c.moveTo(cx + 8, cy - 98);
    c.quadraticCurveTo(cx + 30, cy - 132, cx + 56, cy - 112);
    c.closePath();
  };
  solid(ctx, um, { x: cx + 8, y: cy - 132, w: 50, h: 34 }, 'canvas', '#5ad0ff', { depth: 0.05, line: 1.6, formSize: 4 });
}

function limes(ctx: Ctx): void {
  bottle(ctx, 1800, 808, 84, '#5a8a3a', { kind: 'wine', label: '#ffe0a0', cork: '#e8e0c0', depth: 0.05 });
  for (const [lx, ly] of [[1740, 806], [1764, 812], [1858, 810]] as const) {
    const lime = ellPath(lx, ly - 10, 14, 11);
    groundShadow(ctx, lx + 6, ly, 16, 4, 0.35, '#3a2010', 1.3);
    solid(ctx, lime, { x: lx - 14, y: ly - 21, w: 28, h: 22 }, 'plastic', '#8acc3a', { depth: 0.05, line: 1.6, formSize: 4 });
  }
  ao(ctx, 1790, 812, 110, 9, 0.35);
}

function grade(ctx: Ctx): void {
  gradeAll(ctx, 0.02, '#ffd09a', 0.06, { warm: '#ffc880', cool: '#5a6ac0', a: 0.2 });
}

function shadeOver(ctx: Ctx): void {
  hudCalm(ctx);
  calmLanes(ctx, 0.06, '#4a3020', 220, 620);
  vignetteAll(ctx, 0.4, '#2a1a20');
}

/** The live skies stop at the horizon and the evening sea short of the sand (anything still that overlaps a
 * moving or live-only layer has to be baked into an overlay over it). */
const SKY_BOX = { x: 0, y: 0, w: W, h: BH.horizon };
const SEA_BOX = { x: 0, y: BH.horizon, w: W, h: BH.shore - BH.horizon + 14 };
const SEA_EVE = { x: 0, y: BH.horizon, w: W, h: 108 };
const CLOUD_FAR = { x: 0, y: 330, w: W, h: 126 };
const CLOUD_NEAR = { x: 780, y: 170, w: 1060, h: 200 };
const PALM_L = { x: 0, y: 30, w: 600, h: 520 };
const PALM_R = { x: 1300, y: 60, w: 620, h: 520 };
const SIGN_BOX = { x: BH.sign.x - 300, y: BH.sign.y - 80, w: 620, h: 160 };
const SHORE_BOX = { x: 0, y: BH.shore - 30, w: W, h: 60 };
const GLITTER_BOX = { x: 360, y: BH.horizon + 4, w: 520, h: SEA_EVE.h - 4 };

export const BEACH_V1: SceneSpec = {
  id: 'beach',
  info: {
    name: 'Shack Attack Beach Bar',
    subtitle: 'Waves 11–14',
    ambient: ['sparkle'],
    glows: [{ x: BH.sun.x, y: BH.sun.y, r: 380, color: '#ffd890', flicker: 0.03 }],
    light: '#ffe0b0',
    tableTint: '#fff2e0',
  },
  layers: [
    { id: 'sky', box: { ...SKY_BOX, h: BH.horizon + 4 }, draw: sky },
    // the low banks on the horizon barely move: still, in the base (the sunset and dusk skies paint their own)
    { id: 'cloudsFar', box: CLOUD_FAR, draw: cloudsFar },
    { id: 'sunset', box: SKY_BOX, liveOnly: true, res: 0.5, draw: sunsetSky },
    { id: 'dusk', box: SKY_BOX, liveOnly: true, res: 0.5, draw: duskSky },
    { id: 'cloudsNear', box: CLOUD_NEAR, motion: 'sprite', res: 0.75, draw: cloudsNear },
    { id: 'island', box: { x: BH.island.x - 240, y: BH.horizon - 150, w: 500, h: 150 }, draw: island },
    { id: 'sea', box: SEA_BOX, draw: sea },
    { id: 'seaEve', box: SEA_EVE, liveOnly: true, res: 0.75, draw: seaEve },
    // gulls and the sailboat (behind the palms and the bar's posts), and the sun's glitter on the water
    { id: 'skyLife', box: { x: 0, y: 230, w: W, h: BH.horizon - 230 + 4 }, motion: 'slot', draw: () => {} },
    { id: 'glitter', box: GLITTER_BOX, motion: 'slot', draw: () => {} },
    { id: 'shore', box: { x: 0, y: SEA_EVE.y + SEA_EVE.h, w: W, h: TY + 4 - SEA_EVE.y - SEA_EVE.h }, draw: shore },
    { id: 'surf', box: SHORE_BOX, motion: 'slot', draw: () => {} },
    { id: 'castle', box: { x: BH.castle.x - 110, y: BH.castle.y - 170, w: 380, h: 200 }, draw: sandcastle },
    { id: 'umbrella', box: { x: BH.umbrella.x - 180, y: BH.umbrella.y - 210, w: 520, h: 260 }, draw: umbrella },
    { id: 'trunkL', box: { x: 0, y: 190, w: 400, h: TY - 190 }, draw: (c, r) => trunk(c, r, BH.palmL) },
    { id: 'trunkR', box: { x: 1480, y: 210, w: 440, h: TY - 210 }, draw: (c, r) => trunk(c, r, BH.palmR) },
    { id: 'torch', box: { x: BH.torch.x - 40, y: BH.torch.y - 380, w: 170, h: 380 }, draw: torch },
    { id: 'palmL', box: PALM_L, motion: 'sprite', draw: (c, r) => crown(c, r, BH.palmL, 1) },
    { id: 'palmR', box: PALM_R, motion: 'sprite', draw: (c, r) => crown(c, r, BH.palmR, -1) },
    { id: 'postL', box: { x: 0, y: 0, w: 130, h: TY }, draw: (c, r) => bamboo(c, r, -10, 0, TY, 74) },
    { id: 'postR', box: { x: 1660, y: 0, w: W - 1660, h: TY }, draw: postR },
    { id: 'thatch', box: { x: 0, y: 0, w: W, h: BH.thatch + 64 }, draw: thatch },
    { id: 'lights', box: { x: 50, y: BH.thatch - 6, w: W - 100, h: 100 }, draw: (c) => lights(c, false) },
    { id: 'lightsOn', box: { x: 50, y: BH.thatch - 6, w: W - 100, h: 100 }, liveOnly: true, draw: (c) => lights(c, true) },
    { id: 'sign', box: SIGN_BOX, motion: 'sprite', draw: sign },
    { id: 'table', box: { x: 0, y: TY, w: W, h: 1080 - TY }, draw: table },
    { id: 'drink', box: { x: 60, y: TY - 120, w: 220, h: 180 }, draw: drink },
    { id: 'limes', box: { x: 1680, y: TY - 120, w: 240, h: 180 }, draw: limes },
    // the bulbs' light on the bar and the fringe at dusk (added: the live code sets it to ADD)
    { id: 'lightsGlow', box: { x: 0, y: BH.thatch - 20, w: W, h: BH.front - BH.thatch + 20 }, liveOnly: true, res: 0.33, draw: lightsGlow },
    // the torch's flame: over everything
    { id: 'torchFire', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

// ——— live ———

registerKitScene(BEACH_V1, (k, wave0) => {
  const sunset = k.sprite('sunset');
  const dusk = k.sprite('dusk');
  const seaEveS = k.sprite('seaEve');
  const lightsOn = k.sprite('lightsOn');
  const bulbGlow = k.sprite('lightsGlow').setBlendMode(Phaser.BlendModes.ADD);
  const near = k.sprite('cloudsNear');
  const palmL = k.pivot(k.sprite('palmL'), BH.palmL.tx, BH.palmL.ty);
  const palmR = k.pivot(k.sprite('palmR'), BH.palmR.tx, BH.palmR.ty);
  const sign = k.pivot(k.sprite('sign'), BH.sign.x, BH.sign.y - 70);
  const sea = k.slot('glitter');
  const sky = k.slot('skyLife');
  const surf = k.slot('surf');
  // glints on the water under the sun (they slide and wink); the path moves with the sun as it sets
  let sunX = BH.sun.x;
  const glintX = (t: number) => Phaser.Math.Clamp(sunX + (crand() - 0.5) * (60 + t * 360), GLITTER_BOX.x + 10, GLITTER_BOX.x + GLITTER_BOX.w - 10);
  const glints = Array.from({ length: 26 }, () => {
    const t = crand() * 0.85;
    return { img: k.img('star', 0, 0, { into: sea, add: true, alpha: 0, scale: 0.1, tint: 0xfff4d0 }), t, x: glintX(t), seed: crand() * 20 };
  });
  // the sailboat on the horizon
  const boat = k.img(k.tex('bh1_boat', 60, 64, (c) => {
    c.fillStyle = '#f8f0e0';
    c.beginPath();
    c.moveTo(30, 4);
    c.lineTo(30, 46);
    c.lineTo(6, 46);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(120,90,110,0.35)';
    c.beginPath();
    c.moveTo(30, 4);
    c.lineTo(30, 46);
    c.lineTo(22, 46);
    c.closePath();
    c.fill();
    c.fillStyle = '#ff7a5a';
    c.beginPath();
    c.moveTo(33, 12);
    c.lineTo(33, 46);
    c.lineTo(52, 46);
    c.closePath();
    c.fill();
    c.fillStyle = '#2a3a5a';
    c.beginPath();
    c.moveTo(4, 50);
    c.lineTo(56, 50);
    c.lineTo(48, 60);
    c.lineTo(12, 60);
    c.closePath();
    c.fill();
  }), BH.boat.x, BH.horizon + 2, { into: sky, origin: [0.5, 0.95], scale: 0.55, alpha: 0.8 });
  const gullTex = k.tex('bh1_gull', 48, 20, (c) => {
    c.strokeStyle = '#3a3a48';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(2, 12);
    c.quadraticCurveTo(12, 0, 24, 10);
    c.quadraticCurveTo(36, 0, 46, 12);
    c.stroke();
  });
  const gulls = Array.from({ length: 3 }, (_, i) => ({ img: k.img(gullTex, -100, 0, { into: sky, alpha: 0.9, scale: 0.7 - i * 0.12 }), seed: i * 1.7 }));
  let gullT = -2;
  let gullDir = 1;
  // the surf: a sheet of lacy foam washing up the sand and sliding back
  const foam = k.tex('bh1_foam', 512, 40, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 40);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.5)');
    g.addColorStop(0.8, 'rgba(255,255,255,0.95)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 512, 40);
    c.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 220; i++) {
      c.fillStyle = `rgba(0,0,0,${0.3 + crand() * 0.5})`;
      c.beginPath();
      c.ellipse(crand() * 512, 8 + crand() * 26, 3 + crand() * 7, 1.5 + crand() * 3, 0, 0, Math.PI * 2);
      c.fill();
    }
  });
  const sheets = [0, 1].map((i) => ({ img: k.img(foam, W / 2, BH.shore, { into: surf, sx: W / 512 + 0.1, sy: 0.8, alpha: 0 }), phase: i * 0.5 }));
  // the torch: out by day, lit at dusk
  const fire = k.slot('torchFire');
  const ft = k.tex('bh1_flame', 64, 128, (c) => flameShape(c, 32, 122, 46, 116, ['#ff5a10', '#ffb030', '#fff4b0']));
  const flame = k.img(ft, BH.torch.x, BH.torch.y - 358, { into: fire, add: true, origin: [0.5, 0.96], scale: 0.7, alpha: 0 });
  const halo = k.glow(BH.torch.x, BH.torch.y - 390, 140, 0xff9a3a, 0, { into: fire });
  const torchPool = k.glow(BH.torch.x + 20, BH.torch.y - 20, 220, 0xff8a3a, 0, { into: fire, sy: 0.3 });
  // the light over everything: warm at sunset, a deep blue at dusk
  const warm = k.wash(0xffa070, 0, Phaser.BlendModes.MULTIPLY);
  const night = k.wash(0x3a3a80, 0, Phaser.BlendModes.MULTIPLY);
  let kw = waveK(wave0);
  let shown = kw;
  const C = Phaser.Display.Color;
  const tint = (a: number, b: number, t: number) => {
    const c = C.Interpolate.ColorWithColor(C.ValueToColor(a), C.ValueToColor(b), 100, Math.round(Phaser.Math.Clamp(t, 0, 1) * 100));
    return C.GetColor(c.r, c.g, c.b);
  };
  return {
    setWave: (w) => (kw = waveK(w)),
    update(dt, t) {
      shown += (kw - shown) * Math.min(1, dt * 0.6);
      // 0 afternoon (wave 1) … 0.67 sunset (wave 3) … 1 dusk (wave 4)
      const eve = Phaser.Math.Clamp(shown / 0.67, 0, 1);
      const dk = Phaser.Math.Clamp((shown - 0.67) / 0.33, 0, 1);
      sunset.setAlpha(Phaser.Math.Easing.Sine.InOut(eve));
      seaEveS.setAlpha(Phaser.Math.Easing.Sine.InOut(eve));
      dusk.setAlpha(dk);
      warm.setAlpha(eve * 0.3 * (1 - dk * 0.5));
      night.setAlpha(dk * 0.42);
      sunX = Phaser.Math.Linear(BH.sun.x, BH.sunset.x, eve);
      // clouds: gold in the afternoon, pink at sunset, slate at dusk
      const ct = dk > 0 ? tint(0xffb0a0, 0x5a5a8a, dk) : tint(0xffffff, 0xffb0a0, eve);
      near.setTint(ct);
      const on = Phaser.Math.Clamp((shown - 0.45) / 0.3, 0, 1);
      lightsOn.setAlpha(on * (0.85 + Math.sin(t * 3) * 0.05));
      bulbGlow.setAlpha(on * (0.5 + dk * 0.5));
      const tl = Phaser.Math.Clamp((shown - 0.7) / 0.2, 0, 1);
      const n = flicker(t, 2);
      flame.setAlpha(tl).setScale(0.6 + n * 0.08, 0.55 + n * 0.18);
      halo.setAlpha(tl * (0.4 + n * 0.15));
      torchPool.setAlpha(tl * (0.18 + n * 0.05));
      near.x = CLOUD_NEAR.x + Math.sin(t * 0.03 + 1) * 110 * calm();
      sway(palmL, t, 0.3, 0.025, 0.7);
      sway(palmR, t, 2.1, 0.025, 0.7);
      sway(sign, t, 4.2, 0.012, 0.9);
      for (const s of sheets) {
        const u = ((t * 0.12 + s.phase) % 1 + 1) % 1;
        const run = u < 0.45 ? Phaser.Math.Easing.Sine.Out(u / 0.45) : 1 - Phaser.Math.Easing.Sine.InOut((u - 0.45) / 0.55);
        s.img.y = BH.shore - 26 + run * 30;
        s.img.setAlpha((u < 0.45 ? 0.2 + run * 0.7 : (1 - (u - 0.45) / 0.55) * 0.8) * (1 - dk * 0.4));
      }
      for (const g of glints) {
        const a = Math.max(0, Math.sin(t * 2.2 + g.seed)) ** 3;
        if (a < 0.01) g.x = glintX(g.t);
        g.img.setPosition(g.x, BH.horizon + 6 + g.t * (BH.shore - BH.horizon - 34)).setAlpha(a * (1 - dk)).setScale(0.05 + g.t * 0.12);
      }
      boat.x = BH.boat.x + Math.sin(t * 0.015) * 300;
      boat.y = BH.horizon + 2 + Math.sin(t * 0.9) * 0.8;
      boat.setTint(tint(0xffffff, 0x8a7aa0, Math.max(eve * 0.4, dk)));
      gullT += dt;
      if (gullT > 16) {
        gullT = -crand() * 8;
        gullDir = crand() < 0.5 ? 1 : -1;
      }
      for (const g of gulls) {
        const u = gullT / 14;
        const x = gullDir > 0 ? -120 + u * (W + 240) : W + 120 - u * (W + 240);
        g.img.setPosition(x - gullDir * g.seed * 60, 260 + g.seed * 26 + Math.sin(t * 0.8 + g.seed) * 20);
        g.img.scaleY = (0.7 - g.seed * 0.07) * (0.6 + Math.abs(Math.sin(t * 6 + g.seed)) * 0.6);
        g.img.setVisible(gullT > 0 && gullT < 14 && dk < 0.8);
      }
    },
  };
}, { legacy: true });
