// Shack Attack Beach Bar (Act 2, waves 11–14), bar-raised with the location kit's painted frame animation
// (src/game/sceneAnim.ts); the first kit version is kept for the before/after page (scene-beach-v1.ts).
//
// A tropical beach in the low light of late afternoon, seen from under a thatched bar. The sun hangs over the sea on
// the left (the feet's key light) and lays a glitter path down the water; the sea deepens from the hazy horizon to
// clear turquoise over the sand, the surf breaking on a beach of gentle cusps; long shadows reach towards us from the
// sandcastle, the umbrella and the torch; two coconut palms frame the view, backlit, their fronds glowing; the bar's
// bamboo posts with their lashings, the layered thatch with its eave fringe, the sign on its ropes, string lights, a
// tiki torch, a surfboard, and a bar top of sun-bleached planks.
//
// Live (the hero animations are painted frame loops):
// - the surf: a wave rolling in, cresting and breaking into foam, the foam sheeting up the sand and draining back in
//   lace, the wet sand's sheen following it and soaking away; at night the breaking foam glows blue;
// - the palms: every frond is a painted sheet of bends on its own spring, so the crowns really bend in the breeze
//   and whip when a stomp shakes the bar; the sign swings on its ropes;
// - the tiki torch's flame licking in frames, embers rising; glitter painted on the swell, sliding with it;
// - gulls on flap-and-glide cycles, a sailboat bobbing and heeling, a swimmer, a beachcomber walking the tide line.
// Across the stage's waves: the golden afternoon (wave 1), sunset with the string lights flickering on (wave 2), dusk
// with the torch lit and the first stars (wave 3), and night (wave 4): stars, a moon with its path on the sea, the
// torch across the waves, and the bar's own lights carrying the room.

import Phaser from 'phaser';
import { FOC, SLAB, ZB, xAt, yAt, zAt } from '../../art/backdrops';
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
import { board, grain, planeQuad, planksPlane, sand, shallows, tableFalloff, tableSeam, varnish, water } from '../../art/scene/materials';
import { drift, lay, noiseMask } from '../../art/scene/paint';
import { bottle } from '../../art/scene/props';
import { cirrus, cloud, farLand, horizonGlow, rays, skyFill, stars, sun } from '../../art/scene/sky';
import { ao, spec as specHi } from '../../art/style/kit';
import { makeCanvas, mix, rgba, rng, shade } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { save } from '../../systems/save';
import { Loop, Parts, Rate, Spring, Swing, flameFrame, sheet } from '../../game/sceneAnim';
import { type KitLive, calm, flicker, registerKitScene, waveK, wander } from '../../game/sceneLive';
import { swellStrip } from './scene-pier';

export const BH = {
  horizon: 452,
  shore: 604,
  thatch: 132,
  front: 1040,
  sign: { x: 960, y: 150 },
  palmL: { bx: 70, by: 770, tx: 300, ty: 236 },
  palmR: { bx: 1790, by: 770, tx: 1600, ty: 262 },
  umbrella: { x: 1260, y: 668 },
  castle: { x: 600, y: 676 },
  /** The tiki torch: a short pole (its flame stays clear of the feet hovering over the right lane). */
  torch: { x: 1530, y: 760, h: 230 },
  boat: { x: 1180, y: 446 },
  island: { x: 420, y: 452 },
  /** The sun: low over the sea on the left in the afternoon; on the horizon at sunset. */
  sun: { x: 560, y: 352, r: 40 },
  sunset: { x: 690, y: 446, r: 50 },
  /** The night's moon, high on the right, its path on the sea under it. */
  moon: { x: 780, y: 300, r: 30 },
  /** The hurricane lantern on the bar's right end (lit from dusk). */
  lantern: { x: 1846, y: 818 },
};

const P2 = Math.PI * 2;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
/** The afternoon's air: warm haze over the sea. */
const SEA_AIR: Air = { color: '#f0dcc0', far: 0.7 };

/** The beach's edge: gentle cusps every 640 px (so the surf's frames, painted for one cusp, fit every one of them;
 * symmetric about each cusp's middle, so a segment can be mirrored). */
const CUSP = 640;
const shoreTop = (x: number) => {
  const u = ((x - CUSP / 2) / CUSP) * P2;
  return BH.shore + 7 * Math.cos(u) + 2.5 * Math.cos(u * 2);
};
/** How far the swash runs up past the edge at x (further up the cusps' bays). */
const runUp = (x: number) => {
  const u = ((x - CUSP / 2) / CUSP) * P2;
  return 40 + 9 * Math.cos(u);
};

// ——— the skies ———

/** The skies the live layer crossfades start under the thatch's eave (nothing above it shows). */
const SKY_TOP = 112;

type Light = { lit: string; body: string; shadow: string; sunX: number; sunY: number; rim: number };

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
  // cumulus out over the sea: gilded on the faces turned to the sun, violet-grey underneath
  const o = { lit: '#fff2d0', body: '#d4c4cc', shadow: '#7470a0', sunX: BH.sun.x, sunY: BH.sun.y, depth: 0.4, air: SEA_AIR, rim: 0.75, wisp: 0.25 };
  cloud(ctx, r, 1100, 330, 400, 120, { ...o, kind: 'cumulus' });
  cloud(ctx, r, 1560, 290, 300, 90, { ...o, kind: 'cumulus' });
  cloud(ctx, r, 230, 360, 220, 60, { ...o, kind: 'cumulus', depth: 0.55 });
  lowBanks(ctx, r, { lit: '#fff0c8', body: '#e8c8b8', shadow: '#9a90b0', sunX: BH.sun.x, sunY: BH.sun.y, rim: 0.55 }, 0.8);
  island(ctx, r, '#2f5a48', '#ffd890', 0.45, 0.78);
  sun(ctx, BH.sun.x, BH.sun.y, BH.sun.r, { disc: '#fffaf0', glow: '#ffc870', a: 0.9, bloom: 12, squash: 0.75 });
  glowAt(ctx, BH.sun.x, BH.sun.y, 150, '#fff4d8', 0.35);
}

/** The sky at sunset (wave 2): the sun on the horizon, the sky burning orange low and violet high. */
function sunsetSky(ctx: Ctx, r: R): void {
  const h = BH.horizon;
  const box = { x: 0, y: SKY_TOP, w: W, h: h - SKY_TOP };
  skyFill(ctx, { x: 0, y: 0, w: W, h: h + 4 }, [[0, '#2e2c6a'], [0.28, '#6a4a8a'], [0.52, '#d0647a'], [0.74, '#ff9a5a'], [0.9, '#ffc070'], [1, '#ffd890']]);
  lay(ctx, drift('#ffb080', '#4a3a7a', 3, 83, 160, 48), box, 0.2);
  glowAt(ctx, BH.sunset.x, h, 1000, '#ff8a4a', 0.3, 0.35);
  // high wisps lit pink from below, and broken bars of cloud of every length, their undersides glowing and soft
  cirrus(ctx, r, { x: 0, y: SKY_TOP + 20, w: W, h: 140 }, '#ffb0a0', 0.22, -0.04, 18);
  const bars: [number, number, number, number][] = [[260, 236, 300, 16], [520, 300, 180, 12], [1180, 214, 520, 20], [1540, 268, 260, 14], [900, 352, 340, 13], [1720, 330, 220, 11], [140, 372, 200, 10], [1320, 398, 380, 12]];
  for (const [x, y, w, hh] of bars)
    cloud(ctx, r, x + (r() - 0.5) * 40, y, w, hh, { kind: 'stratus', lit: '#ffb878', body: '#9a5a80', shadow: '#6a4a78', sunX: BH.sunset.x, sunY: h + 60, rim: 0.75, wisp: 0.85, soft: w * 0.06, a: 0.8 });
  horizonGlow(ctx, h, 140, '#ffc080', 0.6);
  lowBanks(ctx, r, { lit: '#ffc890', body: '#a86a80', shadow: '#5a3a6a', sunX: BH.sunset.x, sunY: h + 40, rim: 0.8 }, 0.7);
  island(ctx, r, '#3a2a44', '#ffb070', 0.6, 0.55);
  sun(ctx, BH.sunset.x, BH.sunset.y, BH.sunset.r, { disc: '#fff0c0', glow: '#ffa050', a: 0.75, bloom: 9, squash: 0.45, clipY: h });
}

/** Dusk (wave 3): the sun gone, a violet sky over a low band of afterglow, the evening star and the first stars.
 * (Night is this sky darkened live, with the moon and the rest of the stars over it.) */
function duskSky(ctx: Ctx, r: R): void {
  const h = BH.horizon;
  const box = { x: 0, y: SKY_TOP, w: W, h: h - SKY_TOP };
  skyFill(ctx, { x: 0, y: 0, w: W, h: h + 4 }, [[0, '#0e1236'], [0.4, '#262a62'], [0.72, '#5a3c76'], [0.9, '#b05a6a'], [1, '#e08a6a']]);
  lay(ctx, drift('#5a4a8a', '#0a0c28', 3, 85, 160, 48), box, 0.22);
  // the afterglow, strongest where the sun went down
  glowAt(ctx, BH.sunset.x, h + 10, 700, '#ff8a5a', 0.22, 0.3);
  stars(ctx, r, { x: 0, y: SKY_TOP, w: W, h: h - SKY_TOP - 140 }, 50);
  // the evening star, low in the afterglow
  glowAt(ctx, 520, 352, 16, '#fff6e0', 0.7);
  glowAt(ctx, 520, 352, 3, '#ffffff', 1);
  horizonGlow(ctx, h, 120, '#ff9a7a', 0.4);
  lowBanks(ctx, r, { lit: '#d08098', body: '#4a3a6a', shadow: '#24204a', sunX: BH.sunset.x, sunY: h + 80, rim: 0.5 }, 0.7);
  island(ctx, r, '#1e1a34', '#c06a80', 0.3, 0.4);
}

/** The low banks on the horizon, in a given light. */
function lowBanks(ctx: Ctx, r: R, o: Light, depth: number): void {
  cloud(ctx, r, 1440, 424, 420, 44, { ...o, kind: 'stratus', depth: depth - 0.1, air: SEA_AIR });
  cloud(ctx, r, 1780, 430, 300, 30, { ...o, kind: 'stratus', depth, air: SEA_AIR });
  cloud(ctx, r, 960, 430, 380, 34, { ...o, kind: 'stratus', depth, air: SEA_AIR });
  cloud(ctx, r, 340, 428, 300, 30, { ...o, kind: 'stratus', depth, air: SEA_AIR });
}

/** The island on the horizon in a light: a hazy hump, its ridge catching the sun, a few palms. */
function island(ctx: Ctx, r0: R, col: string, litCol: string, litA: number, depth: number): void {
  const r = rng(907);
  void r0;
  const h = BH.horizon;
  const ix = BH.island.x;
  const pts: [number, number][] = [[ix - 230, h + 1]];
  for (let k = 0; k <= 20; k++) {
    const t = k / 20;
    const x = ix - 230 + t * 470;
    const hump = Math.sin(t * Math.PI) ** 0.8 * 44 + Math.sin(t * 9) * 2.5 + Math.sin(t * 23) * 1.2 + (r() - 0.5) * 2;
    pts.push([x, h - hump]);
  }
  pts.push([ix + 240, h + 1]);
  farLand(ctx, pts, h, col, depth, SEA_AIR, litCol, litA);
  const c = airMix(col, depth + 0.02, SEA_AIR);
  // its palms: three, hazed silhouettes: curved tapering trunks, crowns of drooping fronds of uneven length
  for (const [px, ph, lean] of [[ix - 30, 66, -0.3], [ix + 16, 80, 0.12], [ix + 70, 54, 0.38]] as const) {
    const tx = px + lean * 46;
    const ty = h - 38 - ph;
    const mx = px + lean * 14;
    const my = h - 38 - ph * 0.55;
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(px - 2.6, h - 34);
    ctx.quadraticCurveTo(mx - 2, my, tx - 1.4, ty);
    ctx.lineTo(tx + 1.4, ty);
    ctx.quadraticCurveTo(mx + 2, my, px + 2.6, h - 34);
    ctx.closePath();
    ctx.fill();
    const n = 9;
    for (let k = 0; k < n; k++) {
      const side = k < n / 2 ? -1 : 1;
      const a = -Math.PI / 2 + side * (0.35 + (k % 5) * 0.32) + (r() - 0.5) * 0.25;
      const len = 16 + r() * 16;
      const ex = tx + Math.cos(a) * len;
      const ey = ty + Math.sin(a) * len * 0.4 + len * 0.45;
      const cx = tx + Math.cos(a) * len * 0.55;
      const cy = ty + Math.sin(a) * len * 0.55 - 6;
      ctx.beginPath();
      ctx.moveTo(tx, ty - 1.5);
      ctx.quadraticCurveTo(cx, cy - 2.5, ex, ey);
      ctx.quadraticCurveTo(cx, cy + 2.5, tx, ty + 2);
      ctx.fill();
    }
  }
}

// ——— the sea ———

/** The long shadows of the late sun: thrown right and towards us per pixel of height. */
const SHADOW = { kx: 1.5, ky: 0.42, col: '#4a3a6a' };

function sea(ctx: Ctx, r: R): void {
  const h = BH.horizon;
  const s = BH.shore;
  water(ctx, r, 0, W, h, s + 14, {
    far: '#b8c4c8', deep: '#3a789e', near: '#2f9aa6', sky: '#ffe4c0', skyA: 0.55,
    ripple: '#fff4dc', ripples: 240, swells: 11, crest: '#ffe8c4',
    glitterX: BH.sun.x, glitter: '#fff0c0', glitterA: 0.45, glitterW: 200, seed: 31,
  });
  windAndGlints(ctx, r, '#fff2d8', '#24587a', BH.sun.x);
  // the shallows: the deep blue turning turquoise over the sand through a long band of teal (no hard edge), and the
  // sunlight's caustic net only in the last thin strip of clear water above the sand
  shallows(ctx, (x) => shoreTop(x) - 130, (x) => shoreTop(x) - 30, 0, W, '#3aa8b0', 0.4, '#fff4d0', 0, 9);
  shallows(ctx, (x) => shoreTop(x) - 70, (x) => shoreTop(x) + 4, 0, W, '#4cc4ba', 0.55, '#fff4d0', 0, 9);
  shallows(ctx, (x) => shoreTop(x) - 22, (x) => shoreTop(x) + 4, 0, W, '#7ad8cc', 0.3, '#fff4d0', 0.16, 11);
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

/** Wind on the water: long slicks and darker cat's-paws drawn out along the swell, and the light's specular glints
 * as short broken streaks, thick round the light's side and thinning away from it; all shrinking with distance. */
function windAndGlints(ctx: Ctx, r: R, lit: string, dark: string, lx: number): void {
  const h = BH.horizon;
  const y1 = BH.shore - 40;
  ctx.save();
  ctx.lineCap = 'round';
  // slicks (calm lanes, paler) and cat's-paws (rougher, darker): long, soft, faded at both ends
  for (let i = 0; i < 26; i++) {
    const t = r() ** 1.3;
    const y = h + 6 + t * (y1 - h - 6);
    const x = r() * W;
    const len = (160 + r() * 380) * (0.4 + t);
    const g = ctx.createLinearGradient(x - len / 2, 0, x + len / 2, 0);
    const col = i % 3 ? lit : dark;
    const a = (i % 3 ? 0.1 : 0.12) * (0.5 + t);
    g.addColorStop(0, rgba(col, 0));
    g.addColorStop(0.5, rgba(col, a));
    g.addColorStop(1, rgba(col, 0));
    ctx.strokeStyle = g;
    ctx.lineWidth = 1.5 + t * 5;
    ctx.beginPath();
    ctx.moveTo(x - len / 2, y);
    ctx.quadraticCurveTo(x, y + (r() - 0.5) * 6, x + len / 2, y + (r() - 0.5) * 3);
    ctx.stroke();
  }
  // specular streaks: the sky and the light caught on the ripples' far faces
  for (let i = 0; i < 520; i++) {
    const t = r() ** 1.4;
    const y = h + 3 + t * (y1 - h - 3);
    const x = r() * W;
    const near = Math.exp(-(((x - lx) / 520) ** 2));
    if (r() > 0.25 + near * 0.75) continue;
    const len = (3 + r() * 12) * (0.35 + t * 1.2);
    ctx.strokeStyle = rgba(lit, (0.15 + r() * 0.35) * (0.4 + near * 0.6));
    ctx.lineWidth = Math.max(0.8, 1.4 * (0.4 + t));
    ctx.beginPath();
    ctx.moveTo(x - len / 2, y);
    ctx.lineTo(x + len / 2, y);
    ctx.stroke();
  }
  ctx.restore();
}

/** The sea at sunset: the burning sky mirrored along the horizon, the water darkening to violet-blue, the sun's
 * path laid down it in orange. (Live only: it fades in over the afternoon sea; dusk and night darken it.) */
function seaEve(ctx: Ctx, r: R): void {
  const h = BH.horizon;
  const s = BH.shore;
  water(ctx, r, 0, W, h, s + 12, {
    far: '#ffb27a', deep: '#4a4a7a', near: '#2a5a78', sky: '#ffc890', skyA: 0.5,
    ripple: '#ffd0a0', ripples: 260, swells: 11, crest: '#ffb080',
    seed: 33,
  });
  haze(ctx, h - 4, h + 26, '#ffc890', 0.5, 0.15);
  windAndGlints(ctx, r, '#ffc890', '#2a2a5a', BH.sunset.x);
  shallows(ctx, (x) => shoreTop(x) - 120, (x) => shoreTop(x) + 4, 0, W, '#3a6a80', 0.45, '#ffd8a8', 0, 9);
  // (it stops short of the sand: its foot fades out)
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  vfill(ctx, 0, SEA_EVE.y + SEA_EVE.h - 30, W, 30, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,1)']]);
  ctx.restore();
}

// ——— the beach ———

const shorePath = (c: Ctx) => {
  c.beginPath();
  c.moveTo(-10, shoreTop(-10));
  for (let x = 0; x <= W + 10; x += 10) c.lineTo(x, shoreTop(x));
  c.lineTo(W + 10, TY + 2);
  c.lineTo(-10, TY + 2);
  c.closePath();
};

function shore(ctx: Ctx, r: R): void {
  const s = BH.shore;
  within(ctx, shorePath, () => {
    const box = { x: 0, y: s - 20, w: W, h: TY - s + 30 };
    sand(ctx, r, box, '#e8c890', { ripples: 190, light: '#fff0c8', shadow: '#8a7aa8', sparkle: 1.1, seed: 43 });
    // the dry sand's wind ripples nearer us, in long sweeps (lit on the sun's side, the lee in violet shade)
    ctx.lineCap = 'round';
    for (let i = 0; i < 70; i++) {
      const t = r();
      const y = s + 90 + t * (TY - s - 100);
      const x = r() * W;
      const len = 60 + r() * 160 * (0.5 + t);
      const k = 0.6 + t * 0.8;
      ctx.strokeStyle = rgba('#7a6a8a', 0.12 * k);
      ctx.lineWidth = 2 * k;
      ctx.beginPath();
      ctx.moveTo(x - len / 2, y + 2);
      ctx.bezierCurveTo(x - len / 6, y - 3 * k, x + len / 6, y + 4 * k, x + len / 2, y);
      ctx.stroke();
      ctx.strokeStyle = rgba('#fff2d0', 0.16 * k);
      ctx.lineWidth = 1.2 * k;
      ctx.beginPath();
      ctx.moveTo(x - len / 2, y);
      ctx.bezierCurveTo(x - len / 6, y - 5 * k, x + len / 6, y + 2 * k, x + len / 2, y - 2);
      ctx.stroke();
    }
    // wet sand: darker, and darker still nearest the water; the swash's highest reach a fine wavy line
    ctx.beginPath();
    ctx.moveTo(0, shoreTop(0) - 4);
    for (let x = 0; x <= W; x += 10) ctx.lineTo(x, shoreTop(x) - 4);
    for (let x = W; x >= 0; x -= 10) ctx.lineTo(x, shoreTop(x) + runUp(x) + 4 + Math.sin(x * 0.031) * 3);
    ctx.closePath();
    const wg = ctx.createLinearGradient(0, s - 10, 0, s + 52);
    wg.addColorStop(0, 'rgba(112,82,58,0.5)');
    wg.addColorStop(0.5, 'rgba(120,90,64,0.3)');
    wg.addColorStop(1, 'rgba(120,90,64,0.1)');
    ctx.fillStyle = wg;
    ctx.fill();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(100,72,52,0.32)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 6) {
      const y = shoreTop(x) + runUp(x) + 4 + Math.sin(x * 0.031) * 3 + Math.sin(x * 0.11) * 1.2;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // the still water's edge: the last lap of each ripple, a fine bright line over a darker wet seam
    ctx.lineCap = 'round';
    for (const [dy, w, col] of [[2.5, 2.5, 'rgba(110,80,60,0.25)'], [0, 1.4, 'rgba(255,250,240,0.55)']] as const) {
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.beginPath();
      let on = false;
      for (let x = 0; x <= W; x += 6) {
        const vis = Math.sin(x * 0.07) + Math.sin(x * 0.023 + 1) > -1.1;
        const y = shoreTop(x) + dy + Math.sin(x * 0.05) * 1.2;
        if (vis && !on) ctx.moveTo(x, y);
        else if (vis) ctx.lineTo(x, y);
        on = vis;
      }
      ctx.stroke();
    }
    // the sun mirrored in the wet sand under it, and the sky's sheen along the water's edge
    lightPool(ctx, BH.sun.x + 30, s + 10, 240, 12, '#fff0c8', 0.36, 'screen');
    vfill(ctx, 0, s - 8, W, 22, [[0, 'rgba(255,232,200,0.24)'], [1, 'rgba(255,232,200,0)']]);
    // the low sun across the beach: warm on the left, the sand cooling to the right and nearer us
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, 'rgba(255,214,150,0.16)');
    g.addColorStop(0.5, 'rgba(255,214,150,0)');
    g.addColorStop(1, 'rgba(90,90,150,0.12)');
    ctx.fillStyle = g;
    ctx.fillRect(0, s - 20, W, TY - s + 30);
    vfill(ctx, 0, TY - 80, W, 82, [[0, 'rgba(80,50,40,0)'], [1, 'rgba(80,50,40,0.26)']]);
    berm(ctx, r);
    wrack(ctx, r);
    footprints(ctx, r);
  });
  // dune grass in tufts at the sides, backlit
  for (const [gx, gy, n] of [[200, TY - 24, 14], [420, TY - 8, 10], [1660, TY - 14, 12], [1372, TY - 8, 9]] as const) grassTuft(ctx, r, gx, gy, n);
}

/** The high tide's line along the beach (the berm's crest, where the wrack lies). */
const tideLine = (x: number) => shoreTop(x) + 78 + Math.sin(x * 0.009 + 2) * 9 + Math.sin(x * 0.037) * 3;

/** The berm: the beach steps up at the high tide's line. Below it the sand is firm, damp and smooth; its face is
 * turned to the sea and the sun, so it's lit; above it the sand is dry and loose, churned into soft dimples by feet,
 * more of them nearer the bar. */
function berm(ctx: Ctx, r: R): void {
  // the firm sand under the line, a touch darker and smoother
  ctx.beginPath();
  ctx.moveTo(0, shoreTop(0) + runUp(0) + 6);
  for (let x = 0; x <= W; x += 10) ctx.lineTo(x, shoreTop(x) + runUp(x) + 6);
  for (let x = W; x >= 0; x -= 10) ctx.lineTo(x, tideLine(x) + 2);
  ctx.closePath();
  ctx.fillStyle = 'rgba(150,110,80,0.1)';
  ctx.fill();
  // the face, lit, fading out below; its crest a soft shadow line
  ctx.lineCap = 'round';
  for (const [dy, w, col] of [[-3, 7, 'rgba(255,236,200,0.14)'], [-1, 3, 'rgba(255,240,210,0.18)'], [2, 2.5, 'rgba(120,96,120,0.16)']] as const) {
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 8) (x ? ctx.lineTo(x, tideLine(x) + dy) : ctx.moveTo(x, tideLine(x) + dy));
    ctx.stroke();
  }
  // dimples in the dry sand: a shaded far wall, a lit near rim (the sun is ahead of us)
  for (let i = 0; i < 420; i++) {
    const x = r() * W;
    const t = r() ** 0.7;
    const y0 = tideLine(x) + 10;
    const y = y0 + t * (TY - 6 - y0);
    if (y < y0) continue;
    const s = 0.5 + t * 1.1 + r() * 0.5;
    ctx.fillStyle = rgba('#8a6a7a', 0.13 + t * 0.06);
    ctx.beginPath();
    ctx.ellipse(x, y, 5 * s, 1.8 * s, 0, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = rgba('#fff2d8', 0.16 + t * 0.08);
    ctx.lineWidth = 1.1 * s;
    ctx.beginPath();
    ctx.ellipse(x, y, 5 * s, 1.8 * s, 0, 0.1, Math.PI - 0.1);
    ctx.stroke();
  }
}

/** The wrack line: where the high tide left its seaweed, shells and a bleached stick of driftwood. */
function wrack(ctx: Ctx, r: R): void {
  const line = tideLine;
  ctx.lineCap = 'round';
  // (in clumps where the tide dropped it, a few strands between)
  // (a few long drifts and small tangles at uneven gaps, the strands in each lying every which way)
  const clumps: [number, number, number][] = [[140, 70, 22], [430, 18, 8], [520, 40, 12], [880, 90, 26], [1010, 14, 6], [1240, 30, 9], [1380, 110, 30], [1730, 46, 12]];
  for (let i = 0; i < 160; i++) {
    const ci = i % 10 < 8 ? i % clumps.length : -1;
    const [cx, cw] = ci >= 0 ? clumps[ci] : [r() * W, 0, 1];
    if (ci >= 0 && r() * 30 > clumps[ci][2]) continue;
    const x = cx + (r() - 0.5) * cw * 2;
    const y = line(x) + (r() - 0.5) * (4 + cw * 0.18) + (r() - 0.5) * 4;
    const len = 4 + r() * 10;
    const a = (r() - 0.5) * 2;
    // a strand of dried weed: a dark olive curl with its shadow
    ctx.strokeStyle = rgba('#4a3a5a', 0.1);
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(x + 1, y + 2);
    ctx.quadraticCurveTo(x + Math.cos(a) * len * 0.5 + 1, y + Math.sin(a) * len * 0.5 - 3, x + Math.cos(a) * len + 1, y + 2);
    ctx.stroke();
    ctx.strokeStyle = rgba(mix('#6a6034', '#4a3e22', r()), 0.42);
    ctx.lineWidth = 1.4 + r();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(a) * len * 0.5, y + Math.sin(a) * len * 0.5 - 4, x + Math.cos(a) * len, y);
    ctx.stroke();
  }
  // shells: little lit domes, ridged, each with its shadow
  for (let i = 0; i < 26; i++) {
    const x = r() * W;
    const near = r() < 0.6;
    const y = near ? line(x) + (r() - 0.5) * 14 : BH.shore + 60 + r() * (TY - BH.shore - 80);
    const sz = 2.6 + r() * 2.6 + (y - BH.shore) * 0.012;
    const col = ['#fff6ea', '#f8d0c0', '#e8c0a0', '#f0e0d0'][i % 4];
    groundShadow(ctx, x + sz * 0.8, y + sz * 0.4, sz * 1.1, sz * 0.4, 0.3, '#6a5a7a', 1.4);
    const sh = ellPath(x, y, sz, sz * 0.66, r() * 0.6 - 0.3);
    sh(ctx);
    const sg = ctx.createLinearGradient(x - sz, y - sz, x + sz, y + sz);
    sg.addColorStop(0, mix(col, '#ffffff', 0.4));
    sg.addColorStop(1, shade(col, -0.25));
    ctx.fillStyle = sg;
    ctx.fill();
    ctx.strokeStyle = rgba(shade(col, -0.5), 0.5);
    ctx.lineWidth = 0.7;
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath();
      ctx.moveTo(x + k * sz * 0.4, y + sz * 0.6);
      ctx.lineTo(x + k * sz * 0.15, y - sz * 0.55);
      ctx.stroke();
    }
  }
  // a starfish, its arms lit on the sun's side
  const sx = 1090;
  const sy = 700;
  groundShadow(ctx, sx + 4, sy + 3, 14, 4, 0.3, '#6a4a6a', 1.4);
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5 + 0.2;
    const rad = k % 2 ? 4 : 13;
    ctx.lineTo(sx + Math.cos(a) * rad, sy + Math.sin(a) * rad * 0.45);
  }
  ctx.closePath();
  const fg = ctx.createLinearGradient(sx - 12, sy, sx + 12, sy);
  fg.addColorStop(0, '#ff9a6a');
  fg.addColorStop(1, '#c0504a');
  ctx.fillStyle = fg;
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,30,30,0.6)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // driftwood: a bleached log half sunk in the sand, round in section, split and silvered, one short knot of a
  // branch on its top; the low sun along its top, its long shadow towards us
  const dx = 290;
  const dy = line(290) + 8;
  const log = (c: Ctx) => {
    c.beginPath();
    c.moveTo(dx - 66, dy - 3);
    c.quadraticCurveTo(dx - 64, dy - 13, dx - 54, dy - 13);
    c.quadraticCurveTo(dx, dy - 17, dx + 58, dy - 11);
    c.quadraticCurveTo(dx + 68, dy - 8, dx + 66, dy + 1);
    c.quadraticCurveTo(dx, dy + 4, dx - 66, dy - 3);
    c.closePath();
  };
  groundCast(ctx, log, dy + 2, SHADOW.kx, SHADOW.ky * 0.6, 0.38, 2, SHADOW.col);
  groundShadow(ctx, dx + 6, dy + 2, 70, 4, 0.35, '#5a4a6a', 1.2);
  solid(ctx, log, { x: dx - 68, y: dy - 18, w: 136, h: 24 }, 'wood', '#c4b8a4', { depth: 0.42, line: 1.3, formSize: 6 });
  within(ctx, log, () => {
    ctx.lineCap = 'round';
    for (let k = 0; k < 7; k++) {
      ctx.strokeStyle = k % 2 ? 'rgba(90,72,64,0.35)' : 'rgba(255,248,232,0.3)';
      ctx.lineWidth = k % 2 ? 1 : 0.8;
      ctx.beginPath();
      ctx.moveTo(dx - 60, dy - 11 + k * 1.9);
      ctx.quadraticCurveTo(dx, dy - 14 + k * 2.1, dx + 60, dy - 9 + k * 1.6);
      ctx.stroke();
    }
    // its sawn-off end, rings showing
    ctx.fillStyle = 'rgba(150,120,100,0.6)';
    ctx.beginPath();
    ctx.ellipse(dx + 62, dy - 4, 4, 7, 0, 0, P2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(80,60,50,0.5)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(dx + 62, dy - 4, 2, 4, 0, 0, P2);
    ctx.stroke();
  });
  // the knot: a short stub on its top
  ctx.fillStyle = '#b4a690';
  ctx.beginPath();
  ctx.ellipse(dx - 14, dy - 16, 4, 3, -0.3, 0, P2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(70,56,50,0.7)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = rgba('#ffe0a8', 0.55);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(dx - 54, dy - 13);
  ctx.quadraticCurveTo(dx, dy - 17, dx + 56, dy - 11);
  ctx.stroke();
}

/** Footprints from the bar down to the water: sunk prints, the far wall of each in shade, the near wall lit by the
 * sun ahead of us. */
function footprints(ctx: Ctx, r: R): void {
  const trail = (x0: number, y0: number, x1: number, y1: number, n: number) => {
    for (let k = 0; k < n; k++) {
      const t = k / (n - 1);
      const side = k % 2 ? 1 : -1;
      const fx = x0 + (x1 - x0) * t + side * (6 - t * 3) + (r() - 0.5) * 3;
      const fy = y0 + (y1 - y0) * t;
      const sc = 1 - t * 0.55;
      const ang = Math.atan2(y1 - y0, x1 - x0) + Math.PI / 2 + side * 0.12;
      ctx.save();
      ctx.translate(fx, fy);
      ctx.scale(1, 0.5);
      ctx.rotate(ang * 0.25);
      // the hollow
      ctx.fillStyle = 'rgba(120,90,90,0.28)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 6 * sc, 12 * sc, 0, 0, P2);
      ctx.fill();
      // the heel and toe pressed deeper
      ctx.fillStyle = 'rgba(100,70,80,0.22)';
      ctx.beginPath();
      ctx.ellipse(0, -6 * sc, 4.5 * sc, 4.5 * sc, 0, 0, P2);
      ctx.ellipse(0, 6 * sc, 4 * sc, 4 * sc, 0, 0, P2);
      ctx.fill();
      // the near rim lit, kicked sand thrown out behind
      ctx.strokeStyle = 'rgba(255,240,210,0.4)';
      ctx.lineWidth = 2 * sc;
      ctx.beginPath();
      ctx.ellipse(0, 1.5 * sc, 6.5 * sc, 12 * sc, 0, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      ctx.restore();
    }
  };
  trail(1470, TY - 12, 1640, shoreTop(1640) + 50, 11);
  trail(760, TY - 6, 860, shoreTop(860) + 58, 9);
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

/** The long shadows of the late sun across the sand (a sprite: they fade as the sun goes down). */
function longShadows(ctx: Ctx): void {
  within(ctx, shorePath, () => {
    groundCast(ctx, umbrellaShape(), BH.umbrella.y, SHADOW.kx, SHADOW.ky, 0.48, 5, SHADOW.col);
    // (the canopy is a disc: its shadow an ellipse thrown out along the light)
    const uh = 170;
    ao(ctx, BH.umbrella.x + 13 + uh * SHADOW.kx, BH.umbrella.y + uh * SHADOW.ky, 150, 26, 0.38, -0.08, SHADOW.col);
    groundCast(ctx, castleShape(), BH.castle.y, SHADOW.kx, SHADOW.ky, 0.5, 4, SHADOW.col);
    groundCast(ctx, rectPath(BH.castle.x + 102, BH.castle.y - 30, 26, 30), BH.castle.y, SHADOW.kx, SHADOW.ky, 0.35, 3, SHADOW.col);
    groundCast(ctx, rectPath(BH.umbrella.x + 150, BH.umbrella.y - 2, 40, 30), BH.umbrella.y + 28, SHADOW.kx, SHADOW.ky, 0.3, 3, SHADOW.col);
  });
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

/** A striped beach umbrella stuck in the sand, a towel, flip-flops and a cool box. */
function umbrella(ctx: Ctx, r: R): void {
  const { x, y } = BH.umbrella;
  // the towel, rumpled: a fold across it, stripes bending with it
  const towel = polyPath([[x - 150, y + 6], [x - 30, y + 2], [x - 20, y + 30], [x - 160, y + 34]]);
  groundShadow(ctx, x - 70, y + 36, 80, 6, 0.28, '#5a4a7a');
  solid(ctx, towel, { x: x - 160, y, w: 140, h: 34 }, 'canvas', '#3a9ad8', { depth: 0.4, line: 1.4, formSize: 4 });
  within(ctx, towel, () => {
    for (let k = 0; k < 5; k++) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.moveTo(x - 156 + k * 30, y + 2);
      ctx.lineTo(x - 146 + k * 30, y + 2);
      ctx.lineTo(x - 150 + k * 30, y + 40);
      ctx.lineTo(x - 160 + k * 30, y + 40);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(20,40,80,0.25)';
    ctx.fillRect(x - 160, y + 17, 150, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x - 160, y + 14, 150, 3);
    grain(ctx, { x: x - 160, y, w: 140, h: 34 }, 'fleece', 0.35, 0.8);
  });
  // flip-flops by the towel
  for (const [fx, fy, rot] of [[x - 6, y + 34, 0.4], [x + 10, y + 38, 0.2]] as const) {
    const ff = ellPath(fx, fy, 11, 4.5, rot);
    groundShadow(ctx, fx + 4, fy + 2, 11, 3, 0.3, '#5a4a7a', 1.4);
    solid(ctx, ff, { x: fx - 12, y: fy - 6, w: 24, h: 12 }, 'plastic', '#ff6a8a', { depth: 0.4, line: 1.1, formSize: 3 });
    ctx.strokeStyle = '#2a8ac0';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(fx - 5, fy - 2);
    ctx.lineTo(fx + 2, fy + 1);
    ctx.lineTo(fx - 4, fy + 3);
    ctx.stroke();
  }
  // a cool box: white lid, blue body, its handle
  const cb = { x: x + 150, y: y - 2, w: 40, h: 30 };
  groundShadow(ctx, cb.x + 26, cb.y + 30, 28, 5, 0.32, '#5a4a7a');
  const body = rectPath(cb.x, cb.y + 8, cb.w, cb.h - 8);
  solid(ctx, body, { x: cb.x, y: cb.y + 8, w: cb.w, h: cb.h - 8 }, 'plastic', '#3a7ad0', { depth: 0.4, line: 1.4, formSize: 6 });
  const lid = rrPath(cb.x - 2, cb.y, cb.w + 4, 10, 3);
  solid(ctx, lid, { x: cb.x - 2, y: cb.y, w: cb.w + 4, h: 10 }, 'plastic', '#f4f0e8', { depth: 0.4, line: 1.4, formSize: 4 });
  ctx.fillStyle = rgba('#fff4d8', 0.5);
  ctx.fillRect(cb.x + 2, cb.y + 1, 14, 2);
  // the pole, a tilt joint near the top, screwed into the sand with a little mound round its foot
  groundShadow(ctx, x + 4, y + 2, 12, 3, 0.4, '#4a3a5a', 1.2);
  const pole = polyPath([[x - 3, y], [x + 3, y], [x + 16, y - 150], [x + 10, y - 150]]);
  solid(ctx, pole, { x: x - 3, y: y - 150, w: 20, h: 150 }, 'wood', '#e8e0d0', { depth: 0.4, line: 1.6, formSize: 3 });
  ctx.fillStyle = '#8a8a90';
  ctx.fillRect(x + 7, y - 108, 8, 10);
  ctx.fillStyle = rgba('#ffffff', 0.5);
  ctx.fillRect(x + 8, y - 107, 2, 8);
  ctx.fillStyle = rgba('#d8b880', 0.9);
  ctx.beginPath();
  ctx.ellipse(x, y, 10, 3.5, 0, Math.PI, 0);
  ctx.fill();
  // the canopy: panels alternating red and white, each a taut cloth bellying between its ribs, the sun glowing through
  // the panels turned to it; a scalloped valance round the hem
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
      const mx = cx + Math.cos((a0 + a1) / 2) * rw * 0.6;
      const g = ctx.createRadialGradient(mx, cy - 6, 2, mx, cy - 6, rw * 0.5);
      g.addColorStop(0, rgba('#fff4e0', 0.2 * lit + 0.04));
      g.addColorStop(1, rgba('#3a1020', 0.15));
      ctx.fillStyle = g;
      ctx.fillRect(cx - rw, cy - 50, rw * 2, 70);
      // the weave, and the sun's rim on the panel's lit edge
      grain(ctx, { x: cx - rw, y: cy - 50, w: rw * 2, h: 70 }, 'grain', 0.2, 0.8);
    });
  }
  // the valance: scallops round the hem, alternating colours
  for (let i = 0; i < 16; i++) {
    const t0 = i / 16;
    const t1 = (i + 1) / 16;
    const ax = cx - rw + t0 * rw * 2;
    const bx = cx - rw + t1 * rw * 2;
    const yy = (t: number) => cy + 10 + Math.sin(Math.PI + t * Math.PI) * 10 + Math.sin(t * Math.PI) * 8;
    ctx.beginPath();
    ctx.moveTo(ax, yy(t0));
    ctx.lineTo(bx, yy(t1));
    ctx.quadraticCurveTo((ax + bx) / 2, yy((t0 + t1) / 2) + 11, ax, yy(t0));
    ctx.fillStyle = shade(i % 2 ? '#f4f0e8' : '#e8402a', -0.1 - t0 * 0.15);
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,20,20,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.fillStyle = '#e8e0d0';
  ctx.beginPath();
  ctx.arc(cx, cy - 48, 4, 0, P2);
  ctx.fill();
  // the sun through the cloth
  lightPool(ctx, cx - rw * 0.5, cy - 4, 60, 18, '#ffd890', 0.2, 'screen');
  void r;
}

/** A sandcastle of wet sand (the mini-boss's home turf): bucket-moulded towers with their ridges, dripped
 * battlements, a gate and windows, shells pressed in, a moat with water in it, the bucket and spade, a flag. */
function sandcastle(ctx: Ctx, r: R): void {
  const { x, y } = BH.castle;
  // the moat: a trench round the front, a little sea water in it mirroring the sky
  const moat = (c: Ctx) => {
    c.beginPath();
    c.ellipse(x, y + 2, 96, 16, 0, 0, Math.PI);
    c.ellipse(x, y + 2, 82, 9, 0, Math.PI, 0, true);
    c.closePath();
  };
  moat(ctx);
  ctx.fillStyle = 'rgba(110,80,70,0.55)';
  ctx.fill();
  within(ctx, moat, () => {
    ctx.fillStyle = 'rgba(200,228,232,0.45)';
    ctx.beginPath();
    ctx.ellipse(x, y + 12, 90, 5, 0, 0, Math.PI);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,250,235,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x, y + 13, 84, 4, 0, 0.2, Math.PI - 0.2);
    ctx.stroke();
  });
  for (const [dx, dy, w, h] of CASTLE) {
    const p = (c: Ctx) => {
      c.beginPath();
      c.moveTo(x + dx, y + dy + h);
      c.lineTo(x + dx + 2, y + dy);
      for (let k = 0; k < 4; k++) {
        const bx = x + dx + 2 + (k * (w - 4)) / 4;
        c.lineTo(bx, y + dy - 8);
        c.quadraticCurveTo(bx + (w - 4) / 16, y + dy - 10, bx + (w - 4) / 8, y + dy - 8);
        c.lineTo(bx + (w - 4) / 8, y + dy);
        c.lineTo(bx + (w - 4) / 4, y + dy);
      }
      c.lineTo(x + dx + w, y + dy + h);
      c.closePath();
    };
    castShadow(ctx, p, 8, 6, 0.22, '#5a4a7a');
    solid(ctx, p, { x: x + dx, y: y + dy - 8, w, h: h + 8 }, 'stone', '#d8b47a', { depth: 0.38, line: 1.6, formSize: 8 });
    within(ctx, p, () => {
      grain(ctx, { x: x + dx, y: y + dy - 8, w, h: h + 8 }, 'speckle', 0.55, 1);
      // the bucket's ridges round the towers, each lit on top
      if (w < 60)
        for (let k = 1; k < 4; k++) {
          const yy = y + dy + (k * h) / 4;
          ctx.fillStyle = 'rgba(110,80,60,0.3)';
          ctx.fillRect(x + dx, yy, w, 2);
          ctx.fillStyle = rgba('#fff0c8', 0.3);
          ctx.fillRect(x + dx, yy - 1.5, w, 1.5);
        }
      // wet drips running down from the battlements
      for (let k = 0; k < Math.round(w / 9); k++) {
        const dxx = x + dx + 3 + r() * (w - 6);
        const len = 4 + r() * 10;
        ctx.fillStyle = 'rgba(120,86,60,0.35)';
        ctx.beginPath();
        ctx.ellipse(dxx, y + dy + len / 2, 2, len / 2, 0, 0, P2);
        ctx.fill();
      }
      // the sun's side gold, the far side cool
      const g = ctx.createLinearGradient(x + dx, 0, x + dx + w, 0);
      g.addColorStop(0, rgba('#ffe0a0', 0.28));
      g.addColorStop(1, rgba('#6a5a8a', 0.28));
      ctx.fillStyle = g;
      ctx.fillRect(x + dx, y + dy - 8, w, h + 8);
      // a darker, wetter foot
      vfill(ctx, x + dx, y + dy + h - 10, w, 10, [[0, 'rgba(110,80,60,0)'], [1, 'rgba(110,80,60,0.3)']]);
    });
  }
  // the gate and arrow-slit windows
  ctx.fillStyle = '#3a2410';
  ctx.beginPath();
  ctx.ellipse(x, y - 14, 10, 14, 0, Math.PI, 0);
  ctx.lineTo(x + 10, y);
  ctx.lineTo(x - 10, y);
  ctx.fill();
  for (const [wx, wy] of [[-43, -62], [43, -62], [0, -90]] as const) {
    ctx.fillStyle = '#4a2c18';
    ctx.beginPath();
    ctx.ellipse(x + wx, wy + y, 3, 6, 0, 0, P2);
    ctx.fill();
    ctx.strokeStyle = rgba('#fff0c8', 0.4);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x + wx, wy + y + 1, 3.6, 6.6, 0, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  }
  // shells pressed into the wall
  for (const [sx, sy, c] of [[-50, -20, '#fff6ea'], [-22, -26, '#f8c8b8'], [30, -18, '#fff6ea'], [52, -26, '#f0d8c0'], [0, -60, '#f8d0c0']] as const) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.ellipse(x + sx, y + sy, 4, 3, 0, 0, P2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,60,50,0.5)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
  // the flagpole (its flag flies in the live layer; the still paints it)
  ctx.strokeStyle = '#4a3020';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - 120);
  ctx.lineTo(x, y - 162);
  ctx.stroke();
  // the bucket, tipped on its side, and the spade stuck in the sand
  const bucket = polyPath([[x + 96, y - 26], [x + 128, y - 26], [x + 124, y + 2], [x + 100, y + 2]]);
  groundShadow(ctx, x + 130, y + 4, 26, 4, 0.3, '#5a4a7a', 1.6);
  solid(ctx, bucket, { x: x + 96, y: y - 26, w: 32, h: 28 }, 'plastic', '#ffd23f', { depth: 0.38, line: 1.6, formSize: 6 });
  ctx.strokeStyle = '#c89a1a';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(x + 112, y - 26, 12, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = rgba('#fffae0', 0.55);
  ctx.fillRect(x + 100, y - 23, 4, 20);
  // the spade, its blade pushed into the sand at a lean: a T grip, the shaft, the top of the blade showing
  ctx.save();
  ctx.translate(x - 104, y + 4);
  ctx.rotate(-0.22);
  groundShadow(ctx, 8, 0, 14, 3, 0.3, '#5a4a7a', 1.6);
  const spade = (c: Ctx) => {
    c.beginPath();
    c.moveTo(-9, 0);
    c.lineTo(-8, -9);
    c.lineTo(-2, -12);
    c.lineTo(-2, -44);
    c.lineTo(-8, -44);
    c.lineTo(-8, -50);
    c.lineTo(8, -50);
    c.lineTo(8, -44);
    c.lineTo(2, -44);
    c.lineTo(2, -12);
    c.lineTo(8, -9);
    c.lineTo(9, 0);
    c.closePath();
  };
  solid(ctx, spade, { x: -10, y: -52, w: 20, h: 54 }, 'plastic', '#3ab0e0', { depth: 0.38, line: 1.4, formSize: 4 });
  ctx.fillStyle = 'rgba(216,184,128,0.95)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 13, 4, 0, Math.PI, 0);
  ctx.fill();
  ctx.restore();
}

/** One frame of the sandcastle's little flag fluttering (phase 0…1 loops), 44×26, the pole's top at (2, 2). */
function flagFrame(c: Ctx, ph: number): void {
  const L = 34;
  const top: [number, number][] = [];
  const bot: [number, number][] = [];
  for (let i = 0; i <= 10; i++) {
    const u = i / 10;
    const wv = Math.sin(u * 5 - ph * P2) * 3 * u;
    top.push([2 + u * L, 3 + wv - u * 2]);
    bot.push([2 + u * L * 0.96, 19 + wv * 1.1 - u * 7]);
  }
  const p = polyPath([...top, ...bot.reverse()]);
  p(c);
  const g = c.createLinearGradient(0, 0, L, 0);
  g.addColorStop(0, '#ff4a6a');
  g.addColorStop(1, '#d8304a');
  c.fillStyle = g;
  c.fill();
  // the folds: light and shade running down the cloth with the wave
  for (let i = 1; i < 10; i++) {
    const u = i / 10;
    const k = Math.cos(u * 5 - ph * P2);
    c.strokeStyle = k > 0 ? rgba('#ffd0c0', 0.3 * k) : rgba('#5a1020', -0.35 * k);
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(top[i][0], top[i][1] + 1);
    c.lineTo(2 + u * L * 0.96, 19 + Math.sin(u * 5 - ph * P2) * 3.3 * u - u * 7 - 1);
    c.stroke();
  }
  c.strokeStyle = 'rgba(80,10,20,0.6)';
  c.lineWidth = 1;
  p(c);
  c.stroke();
}

// ——— palms ———

interface Palm {
  bx: number;
  by: number;
  tx: number;
  ty: number;
}

function trunkGeom(p: Palm) {
  const mx = (p.bx + p.tx) / 2 + (p.tx > p.bx ? -60 : 60);
  const my = (p.by + p.ty) / 2 + 40;
  const at = (t: number): [number, number] => [(1 - t) * (1 - t) * p.bx + 2 * (1 - t) * t * mx + t * t * p.tx, (1 - t) * (1 - t) * p.by + 2 * (1 - t) * t * my + t * t * p.ty];
  const wAt = (t: number) => 30 - t * 14 + Math.max(0, 0.12 - t) * 60;
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  const norm: [number, number][] = [];
  for (let i = 0; i <= 30; i++) {
    const t = i / 30;
    const [x, y] = at(t);
    const [x2, y2] = at(Math.min(1, t + 0.01));
    const [x1, y1] = at(Math.max(0, t - 0.01));
    const nx = -(y2 - y1);
    const ny = x2 - x1;
    const l = Math.hypot(nx, ny) || 1;
    norm.push([nx / l, ny / l]);
    left.push([x + (nx / l) * wAt(t), y + (ny / l) * wAt(t)]);
    right.push([x - (nx / l) * wAt(t), y - (ny / l) * wAt(t)]);
  }
  return { at, wAt, left, right, norm, path: polyPath([...left, ...[...right].reverse()]) };
}

/** A coconut palm's trunk, backlit: grey-brown and in its own shade on our side, the sun's gold rim down the edge
 * turned to it; ringed with leaf scars (crowded under the crown), fibrous where the old frond boots were. */
function trunk(ctx: Ctx, r: R, p: Palm): void {
  const { at, wAt, left, right, norm, path } = trunkGeom(p);
  const box = { x: Math.min(p.bx, p.tx) - 50, y: p.ty, w: Math.abs(p.tx - p.bx) + 100, h: p.by - p.ty };
  // the sun's side: to the right of the left palm, to the left of the right one
  const sunRight = BH.sun.x > p.tx;
  solid(ctx, path, box, 'wood', '#7e6a58', { depth: 0.2, formSize: 18 });
  within(ctx, path, () => {
    lay(ctx, drift('#a89078', '#3a3040', 4, 61 + p.bx), box, 0.35);
    grain(ctx, box, 'wood', 0.32, 1.2);
    // fibres running up the trunk
    ctx.lineCap = 'round';
    for (let i = 0; i < 90; i++) {
      const t = r();
      const [x, y] = at(t);
      const off = (r() - 0.5) * 1.6 * wAt(t);
      const [nx, ny] = norm[Math.round(t * 30)];
      const [x2, y2] = at(Math.min(1, t + 0.04 + r() * 0.05));
      ctx.strokeStyle = rgba(r() < 0.5 ? '#3a2c26' : '#c8b8a0', 0.12 + r() * 0.1);
      ctx.lineWidth = 0.8 + r();
      ctx.beginPath();
      ctx.moveTo(x + nx * off, y + ny * off);
      ctx.lineTo(x2 + nx * off, y2 + ny * off);
      ctx.stroke();
    }
    // leaf-scar rings, crowding towards the crown: each a dark groove under a lit lip, curving round the trunk
    for (let i = 1; i < 44; i++) {
      const t = 1 - (1 - i / 44) ** 1.35;
      const [x, y] = at(t);
      const [nx, ny] = norm[Math.round(t * 30)];
      const w = wAt(t) + 3;
      const ang = Math.atan2(ny, nx);
      ctx.strokeStyle = 'rgba(46,30,24,0.5)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(x, y, w, 4.5, ang, 0, Math.PI);
      ctx.stroke();
      ctx.strokeStyle = rgba('#f0dcc0', 0.22);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(x, y - 2.5, w, 4.5, ang, 0.1 * Math.PI, 0.6 * Math.PI);
      ctx.stroke();
    }
    // the fibrous sheath under the crown
    for (let i = 0; i < 40; i++) {
      const t = 0.88 + r() * 0.12;
      const [x, y] = at(t);
      ctx.strokeStyle = rgba(r() < 0.5 ? '#5a4a30' : '#8a7448', 0.5);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + (r() - 0.5) * 30, y + (r() - 0.5) * 8);
      ctx.lineTo(x + (r() - 0.5) * 30, y + (r() - 0.5) * 8 + 10);
      ctx.stroke();
    }
    // backlit: the side to us in shade, deepest away from the sun
    const shadeSide = sunRight ? left : right;
    ctx.save();
    ctx.filter = 'blur(6px)';
    ctx.strokeStyle = 'rgba(40,30,60,0.45)';
    ctx.lineWidth = 22;
    ctx.beginPath();
    shadeSide.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.restore();
  });
  // the sun's rim down the edge turned to it
  const rimSide = sunRight ? right : left;
  ctx.save();
  ctx.lineCap = 'round';
  for (const [w, a, blur] of [[7, 0.35, 3], [2.4, 0.7, 0]] as const) {
    ctx.filter = blur ? `blur(${blur}px)` : 'none';
    ctx.strokeStyle = rgba('#ffd890', a);
    ctx.lineWidth = w;
    ctx.beginPath();
    rimSide.forEach(([x, y], i) => {
      const [nx, ny] = norm[i];
      const k = (sunRight ? 1 : -1) * (w * 0.5 + 1);
      if (i) ctx.lineTo(x + nx * k, y + ny * k);
      else ctx.moveTo(x + nx * k, y + ny * k);
    });
    ctx.stroke();
  }
  ctx.restore();
}

/** A trunk as three layers, each clipped to the box round its stretch of the trunk (painted with its own seeded
 * stream, so the pieces match where they meet). */
function trunkLayers(id: string, p: Palm, seed: number): SceneSpec['layers'] {
  const { left, right } = trunkGeom(p);
  const pts = [...left, ...right];
  const cuts = [p.ty - 14, BH.horizon, 600, TY];
  return cuts.slice(0, -1).map((y0, i) => {
    const y1 = cuts[i + 1];
    const xs = pts.filter(([, y]) => y >= y0 - 40 && y <= y1 + 40).map(([x]) => x);
    const x0 = Math.floor(Math.min(...xs) - 18);
    const x1 = Math.ceil(Math.max(...xs) + 18);
    const box = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    return {
      id: `${id}${i}`,
      box,
      draw: (c: Ctx) => {
        c.beginPath();
        c.rect(box.x, box.y, box.w, box.h);
        c.clip();
        trunk(c, rng(seed), p);
      },
    };
  });
}

// fronds: each painted on its own canvas at a run of bends (its live frames); the still paints every frond at rest

type FrondKind = 'high' | 'mid' | 'low';
interface FrondShape {
  len: number;
  a: number;
  droop: number;
  seed: number;
}
const FRONDS: Record<FrondKind, FrondShape> = {
  // up and arching over; out and drooping; out and hanging
  high: { len: 226, a: -1.2, droop: 1.6, seed: 11 },
  mid: { len: 248, a: -0.42, droop: 1.25, seed: 23 },
  low: { len: 206, a: 0.18, droop: 0.95, seed: 37 },
};
/** The live frames: bends from -1 (blown back) to 1 (blown over). */
const BENDS = 7;
const bendOf = (i: number) => (i / (BENDS - 1)) * 2 - 1;

interface Leaflet {
  pts: [number, number][];
  w: number;
  up: boolean;
  glow: number;
}

/** A frond's geometry at bend b, its base at (0, 0), pointing right: a rachis arching out and drooping, leaflets
 * swept forward along it on both sides, each hanging under its own weight and fluttering as the frond bends. */
function frondGeom(k: FrondKind, b: number): { rachis: [number, number][]; leaflets: Leaflet[] } {
  const F = FRONDS[k];
  const r = rng(F.seed);
  const N = 26;
  const rachis: [number, number][] = [[0, 0]];
  const ang: number[] = [F.a];
  let x = 0;
  let y = 0;
  for (let i = 1; i <= N; i++) {
    const s = i / N;
    const th = F.a + F.droop * s ** 1.6 + b * 0.38 * s ** 1.3;
    x += Math.cos(th) * (F.len / N);
    y += Math.sin(th) * (F.len / N);
    rachis.push([x, y]);
    ang.push(th);
  }
  const at = (s: number) => {
    const f = s * N;
    const i = Math.min(N - 1, Math.floor(f));
    const u = f - i;
    return { x: rachis[i][0] + (rachis[i + 1][0] - rachis[i][0]) * u, y: rachis[i][1] + (rachis[i + 1][1] - rachis[i][1]) * u, a: ang[i] + (ang[i + 1] - ang[i]) * u };
  };
  const leaflets: Leaflet[] = [];
  const M = 30;
  for (const sd of [-1, 1]) {
    for (let i = 0; i < M; i++) {
      const s = 0.07 + (i / (M - 1)) * 0.9 + (r() - 0.5) * 0.01;
      const p = at(s);
      const l = F.len * 0.31 * Math.sin(Math.PI * (0.07 + 0.88 * s)) ** 0.55 * (0.88 + r() * 0.24);
      const seed = r() * 10;
      const glowR = r();
      // a gap where a leaflet tore away, now and then
      const gap = r() < 0.07;
      // (which side is up, and which way it turns as it hangs, are settled at rest, so they never flip between bends)
      const rest = F.a + F.droop * s ** 1.6 + sd * (1.1 - 0.35 * s);
      const up = Math.sin(rest) < -0.15;
      let d0 = Math.PI / 2 - rest;
      while (d0 > Math.PI) d0 -= P2;
      while (d0 < -Math.PI) d0 += P2;
      const turn = Math.sign(d0) || 1;
      const flutter = Math.sin(seed + b * 2.6) * 0.16 * Math.abs(b) + b * 0.12 * sd;
      let a = p.a + sd * (1.1 - 0.35 * s) + flutter;
      const pts: [number, number][] = [[p.x, p.y]];
      let lx = p.x;
      let ly = p.y;
      for (let q = 1; q <= 6; q++) {
        // it hangs: its direction turns towards straight down along its length (the upper ones arch over)
        let d = Math.PI / 2 - a;
        while (d > Math.PI) d -= P2;
        while (d < -Math.PI) d += P2;
        if (turn > 0 && d < -1.5) d += P2;
        if (turn < 0 && d > 1.5) d -= P2;
        a += d * (0.09 + 0.06 * s) * (up ? 1.25 : 1);
        lx += Math.cos(a) * (l / 6);
        ly += Math.sin(a) * (l / 6);
        pts.push([lx, ly]);
      }
      if (!gap) leaflets.push({ pts, w: Math.max(2.2, l * 0.072), up, glow: glowR < 0.55 ? 0.45 + glowR : 0 });
    }
  }
  return { rachis, leaflets };
}

/** Where every bend of a frond fits (its frame), with the base's place in it. */
function frondFrame(k: FrondKind): { w: number; h: number; ox: number; oy: number } {
  let x0 = 0;
  let y0 = 0;
  let x1 = 0;
  let y1 = 0;
  for (let i = 0; i < BENDS; i++) {
    const g = frondGeom(k, bendOf(i));
    for (const l of g.leaflets)
      for (const [x, y] of l.pts) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
  }
  const pad = 8;
  return { w: Math.ceil(x1 - x0 + pad * 2), h: Math.ceil(y1 - y0 + pad * 2), ox: Math.ceil(-x0 + pad), oy: Math.ceil(-y0 + pad) };
}

const FROND_INK = '#0e1e0a';

/** Paint a frond at bend b, its base at (0, 0). Backlit by the low sun: the leaflets on its underside in deep green
 * shade, the upper ones lit, some glowing yellow-green where the sun shines through, gold along their top edges. */
function paintFrond(c: Ctx, k: FrondKind, b: number, dark = 0): void {
  const { rachis, leaflets } = frondGeom(k, b);
  const leaflet = (f: Leaflet) => {
    const pts = f.pts;
    const L: [number, number][] = [];
    const Rr: [number, number][] = [];
    for (let i = 0; i < pts.length; i++) {
      const [x, y] = pts[i];
      const [ax, ay] = pts[Math.max(0, i - 1)];
      const [bx, by] = pts[Math.min(pts.length - 1, i + 1)];
      const dx = bx - ax;
      const dy = by - ay;
      const l = Math.hypot(dx, dy) || 1;
      const w = f.w * Math.sin(Math.PI * Math.min(1, (i + 0.5) / pts.length)) ** 0.7;
      L.push([x - (dy / l) * w * 0.5, y + (dx / l) * w * 0.5]);
      Rr.push([x + (dy / l) * w * 0.5, y - (dx / l) * w * 0.5]);
    }
    const p = polyPath([...L, ...[...Rr].reverse()]);
    const [x0, y0] = pts[0];
    const [xe, ye] = pts[pts.length - 1];
    // (backlit: the leaflets dark against the bright sky, the thin tips glowing where the sun comes through them)
    const base = f.up ? '#1f3a1a' : '#122610';
    const tip = f.up ? (f.glow ? mix('#4a6a26', '#e4e070', Math.min(1, f.glow)) : '#36562a') : f.glow ? '#5a7426' : '#22401a';
    const g = c.createLinearGradient(x0, y0, xe, ye);
    g.addColorStop(0, shade(base, -dark));
    g.addColorStop(f.glow ? 0.55 : 0.7, shade(mix(base, tip, 0.45), -dark));
    g.addColorStop(1, shade(tip, -dark));
    p(c);
    c.fillStyle = g;
    c.fill();
    c.strokeStyle = rgba(FROND_INK, 0.45);
    c.lineWidth = 0.8;
    c.stroke();
    // the edge turned up catches the light (gold where the sun's behind it), a midrib down the middle
    const topEdge = L[2][1] < Rr[2][1] ? L : Rr;
    c.strokeStyle = f.up ? rgba(f.glow ? '#ffe090' : '#f0d890', (f.glow ? 0.85 : 0.5) * (1 - dark)) : rgba('#c0a860', 0.28 * (1 - dark));
    c.lineWidth = f.up ? 1.4 : 1;
    c.beginPath();
    topEdge.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.stroke();
    c.strokeStyle = rgba(f.up ? '#a8b860' : '#3a5a24', 0.35);
    c.lineWidth = 0.6;
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.stroke();
  };
  c.lineJoin = 'round';
  c.lineCap = 'round';
  for (const f of leaflets) if (!f.up) leaflet(f);
  // the rachis: a tapering stalk, lit along its top
  const n = rachis.length;
  const side = (sd: number) =>
    rachis.map(([x, y], i): [number, number] => {
      const [ax, ay] = rachis[Math.max(0, i - 1)];
      const [bx, by] = rachis[Math.min(n - 1, i + 1)];
      const dx = bx - ax;
      const dy = by - ay;
      const l = Math.hypot(dx, dy) || 1;
      const w = 4.6 * (1 - (i / n) * 0.8);
      return [x - (dy / l) * w * sd, y + (dx / l) * w * sd];
    });
  const rp = polyPath([...side(1), ...side(-1).reverse()]);
  rp(c);
  c.fillStyle = shade('#3a4a1c', -dark);
  c.fill();
  c.strokeStyle = rgba(FROND_INK, 0.55);
  c.lineWidth = 1;
  c.stroke();
  c.strokeStyle = rgba('#ffd890', 0.8 * (1 - dark));
  c.lineWidth = 1.6;
  c.beginPath();
  side(-1).forEach(([x, y], i) => (i ? c.lineTo(x, y + 1) : c.moveTo(x, y + 1)));
  c.stroke();
  for (const f of leaflets) if (f.up) leaflet(f);
}

/** Where each palm's fronds stand, back to front: kind, side (-1 to the left), turn, scale, darkness (the back
 * ones in the crown's own shade), and how hard the breeze reaches it. */
interface FrondAt {
  k: FrondKind;
  side: number;
  rot: number;
  s: number;
  dark: number;
  dx: number;
  dy: number;
}
const CROWN: FrondAt[] = [
  { k: 'high', side: -1, rot: 0.32, s: 0.8, dark: 0.3, dx: -4, dy: -4 },
  { k: 'high', side: 1, rot: -0.3, s: 0.78, dark: 0.3, dx: 4, dy: -6 },
  { k: 'mid', side: 1, rot: 0.38, s: 0.86, dark: 0.22, dx: 6, dy: 4 },
  { k: 'low', side: -1, rot: 0.05, s: 0.9, dark: 0.15, dx: -6, dy: 6 },
  { k: 'high', side: -1, rot: 0, s: 0.98, dark: 0, dx: -2, dy: -2 },
  { k: 'mid', side: -1, rot: 0.05, s: 1.04, dark: 0, dx: -4, dy: 2 },
  { k: 'high', side: 1, rot: 0.02, s: 1, dark: 0, dx: 2, dy: -2 },
  { k: 'mid', side: 1, rot: -0.02, s: 1.08, dark: 0, dx: 4, dy: 2 },
  { k: 'low', side: 1, rot: -0.08, s: 0.95, dark: 0.05, dx: 4, dy: 6 },
];

/** The fronds of a palm at rest (the still). */
function crownStill(ctx: Ctx, p: Palm, flip: number): void {
  for (const f of CROWN) {
    ctx.save();
    ctx.translate(p.tx + f.dx * flip, p.ty + f.dy);
    ctx.scale(f.side * flip * f.s, f.s);
    ctx.rotate(f.rot);
    paintFrond(ctx, f.k, 0, f.dark);
    ctx.restore();
  }
}

/** The crown's heart, over the fronds: the bases of the fronds springing from the trunk's top, the coconuts in
 * their shade, an old frond hanging dead and brown. */
function crownHeart(ctx: Ctx, r: R, p: Palm, flip: number): void {
  const { tx, ty } = p;
  // the dead frond, hanging down the trunk's sun side
  ctx.save();
  ctx.translate(tx + 10 * flip, ty + 14);
  ctx.lineCap = 'round';
  const dl = 110;
  for (let i = 0; i < 26; i++) {
    const s = i / 26;
    const x = Math.sin(s * 1.2) * 14 * flip;
    const y = s * dl;
    for (const sd of [-1, 1]) {
      const l = 18 + Math.sin(s * Math.PI) * 18;
      ctx.strokeStyle = rgba(mix('#8a6a3a', '#5a4020', r()), 0.85);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + sd * l * 0.4, y + l * 0.3, x + sd * l * 0.3, y + l);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = '#6a5030';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(10 * flip, dl * 0.5, 14 * flip, dl);
  ctx.stroke();
  ctx.restore();
  // frond bases: flattened stalks fanning out of the trunk's top, their sheaths fibrous
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (i - 4) * 0.36 + (r() - 0.5) * 0.1;
    const l = 34 + r() * 12;
    const ex = tx + Math.cos(a) * l;
    const ey = ty + Math.sin(a) * l * 0.7 + 6;
    const pth = polyPath([[tx - 6, ty + 10], [ex - Math.sin(a) * 3, ey + Math.cos(a) * 3], [ex + Math.sin(a) * 3, ey - Math.cos(a) * 3], [tx + 6, ty + 10]]);
    solid(ctx, pth, { x: Math.min(tx, ex) - 8, y: Math.min(ty, ey) - 8, w: Math.abs(ex - tx) + 16, h: Math.abs(ey - ty) + 22 }, 'wood', i % 2 ? '#5a6a2a' : '#4a5a26', { depth: 0.15, line: 1.4, formSize: 4 });
  }
  // coconuts, clustered under the crown: lit rims on the sun's side, deep shade between them
  const sunRight = BH.sun.x > tx;
  for (const [dx, dy, rr] of [[-14, 16, 13], [12, 18, 12], [-2, 28, 13], [24, 8, 10], [-26, 6, 10]] as const) {
    const cx = tx + dx * flip;
    const cy = ty + dy;
    const c = ellPath(cx, cy, rr, rr * 0.92);
    ao(ctx, cx + 2, cy + 4, rr * 1.2, rr * 0.8, 0.35);
    solid(ctx, c, { x: cx - rr, y: cy - rr, w: rr * 2, h: rr * 2 }, 'plastic', dy > 20 ? '#6a6a26' : '#7a7a2e', { depth: 0.15, line: 1.6, formSize: 5 });
    ctx.strokeStyle = rgba('#ffd890', 0.6);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(cx, cy, rr - 1.5, sunRight ? -0.9 : Math.PI - 0.3, sunRight ? 0.6 : Math.PI + 1.2);
    ctx.stroke();
  }
}

// ——— the bar ———

/** The roof's one spacing: rafters every RAFTER px; the fringe's bundles and the string lights' bulbs divide it. */
const RAFTER = 240;
const RAFTER0 = 120;
const BUNDLE = RAFTER / 8;
const EAVE = { y: BH.thatch - 40, h: 24 };

/** A bamboo pole lying across (x0…x1) at y, h thick: nodes on its spacing, lit along its top. */
function bambooH(ctx: Ctx, r: R, x0: number, x1: number, y: number, h: number, base: string, nodes: number): void {
  const p = rrPath(x0, y, x1 - x0, h, h / 2);
  solid(ctx, p, { x: x0, y, w: x1 - x0, h }, 'wood', base, { depth: 0.1, formSize: h * 0.4, line: 1.6 });
  within(ctx, p, () => {
    lay(ctx, drift(shade(base, 0.2), shade(base, -0.25), 6, Math.round(x0 + y), 128, 16), { x: x0, y, w: x1 - x0, h }, 0.35);
    for (let x = x0 + nodes * (0.3 + r() * 0.4); x < x1; x += nodes * (0.85 + r() * 0.3)) {
      ctx.fillStyle = rgba(shade(base, -0.5), 0.6);
      ctx.fillRect(x - 1.5, y, 3, h);
      ctx.fillStyle = rgba('#fff0c0', 0.35);
      ctx.fillRect(x + 1.5, y, 1.5, h);
    }
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, rgba('#fff0c8', 0.3));
    g.addColorStop(0.35, rgba('#fff0c8', 0));
    g.addColorStop(1, rgba('#2a1408', 0.35));
    ctx.fillStyle = g;
    ctx.fillRect(x0, y, x1 - x0, h);
  });
}

/** Coir rope wound round a pole: diagonal turns, each lit on top. */
function lashing(ctx: Ctx, x: number, y: number, w: number, h: number, turns: number, ang = 0.35): void {
  const p = rectPath(x, y, w, h);
  within(ctx, p, () => {
    ctx.fillStyle = 'rgba(40,24,10,0.45)';
    ctx.fillRect(x, y, w, h);
    const step = h / turns;
    for (let i = -2; i < turns + 2; i++) {
      const yy = y + i * step;
      ctx.strokeStyle = '#8a6a3a';
      ctx.lineWidth = step * 0.8;
      ctx.beginPath();
      ctx.moveTo(x - 4, yy);
      ctx.lineTo(x + w + 4, yy + w * ang);
      ctx.stroke();
      ctx.strokeStyle = rgba('#f0d8a0', 0.5);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x - 4, yy - step * 0.25);
      ctx.lineTo(x + w + 4, yy + w * ang - step * 0.25);
      ctx.stroke();
    }
  });
}

function thatch(ctx: Ctx, r: R): void {
  const h = BH.thatch;
  // the underside of the roof: courses of thatch seen from below, each a band of straw ends under the one before,
  // deeper and darker up into the roof; bamboo battens across them, rafters running up into the dark
  vfill(ctx, 0, 0, W, EAVE.y + 4, [[0, '#1e1008'], [1, '#3e2814']]);
  for (let row = 0; row < 5; row++) {
    const y0 = row * 20 - 6;
    const dk = (4 - row) * 0.08;
    for (let x = -10; x < W + 10; x += 3) {
      const len = 16 + r() * 10;
      ctx.strokeStyle = rgba(shade(['#9a7440', '#86643a', '#a88048'][Math.floor(r() * 3)], -0.35 - dk), 0.85);
      ctx.lineWidth = 1.6 + r() * 1.4;
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x + (r() - 0.6) * 5, y0 + len);
      ctx.stroke();
    }
    vfill(ctx, 0, y0 + 14, W, 10, [[0, 'rgba(20,10,4,0)'], [1, 'rgba(20,10,4,0.4)']]);
  }
  lay(ctx, drift('#6a4a2a', '#140a04', 10, 71, 256, 24), { x: 0, y: 0, w: W, h: EAVE.y }, 0.3);
  // the sunlit beach's warm light bounced up under the roof, strongest near the eave and on the sun's side
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const bg = ctx.createLinearGradient(0, EAVE.y, 0, 0);
  bg.addColorStop(0, 'rgba(255,190,120,0.2)');
  bg.addColorStop(0.6, 'rgba(255,190,120,0.05)');
  bg.addColorStop(1, 'rgba(255,190,120,0)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, EAVE.y);
  ctx.restore();
  glowAt(ctx, BH.sun.x, EAVE.y, 600, '#ffc890', 0.1, 0.18);
  // battens across, lashed to the rafters
  for (const by of [18, 52]) bambooH(ctx, r, -10, W + 10, by, 9, '#7a5a30', 120);
  for (let x = RAFTER0; x < W; x += RAFTER) {
    const p = polyPath([[x - 9, -4], [x + 9, -4], [x + 20, EAVE.y + 4], [x + 2, EAVE.y + 4]]);
    castShadow(ctx, p, 8, 8, 0.35, '#140a04');
    solid(ctx, p, { x: x - 9, y: 0, w: 30, h: EAVE.y + 4 }, 'wood', '#8a6436', { depth: 0.2, line: 1.4, formSize: 5 });
    within(ctx, p, () => {
      for (const ny of [30, 74]) {
        ctx.fillStyle = 'rgba(40,20,6,0.5)';
        ctx.fillRect(x - 10, ny, 32, 2.5);
        ctx.fillStyle = rgba('#ffe0a8', 0.3);
        ctx.fillRect(x - 10, ny + 2.5, 32, 1.2);
      }
    });
    for (const by of [18, 52]) lashing(ctx, x - 6 + by * 0.12, by - 3, 20, 15, 4);
  }
  // the eave beam: a big bamboo pole the fringe hangs from
  bambooH(ctx, r, -10, W + 10, EAVE.y, EAVE.h, '#b08a52', RAFTER / 2);
  crevice(ctx, 0, W, EAVE.y + EAVE.h, 12, 0.45);
  // the fringe: three courses of straw hanging from the beam, tied into bundles on the roof's spacing; the bright
  // sky glows through their tips, strongest on the sun's side
  for (let layer = 0; layer < 3; layer++) {
    const y0 = EAVE.y + 4 + layer * 16;
    for (let bx = -BUNDLE + (layer % 2) * BUNDLE * 0.5; bx < W + BUNDLE; bx += BUNDLE) {
      const blen = 50 + r() * 22 + layer * 8;
      for (let k = 0; k < 9; k++) {
        const x = bx + (k / 8) * BUNDLE + (r() - 0.5) * 3;
        const len = blen * (0.75 + r() * 0.35);
        const col = shade(['#c8a05a', '#b88a48', '#d8b46a', '#a87a40'][Math.floor(r() * 4)], -0.34 + layer * 0.12);
        const ex = x + (r() - 0.45) * 10;
        const ey = y0 + len;
        const near = Math.max(0, 1 - Math.abs(x - BH.sun.x) / 1000);
        const g = ctx.createLinearGradient(0, y0, 0, ey);
        g.addColorStop(0, shade(col, -0.4));
        g.addColorStop(0.65, col);
        g.addColorStop(1, mix(col, '#ffe8b0', 0.3 + near * 0.3));
        ctx.strokeStyle = g;
        ctx.lineWidth = 2 + r() * 1.8;
        ctx.beginPath();
        ctx.moveTo(x, y0);
        ctx.quadraticCurveTo(x + (r() - 0.5) * 6, y0 + len * 0.5, ex, ey);
        ctx.stroke();
      }
      // the tie round the bundle's neck
      ctx.strokeStyle = 'rgba(50,30,12,0.75)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(bx + 2, y0 + 10);
      ctx.quadraticCurveTo(bx + BUNDLE / 2, y0 + 13, bx + BUNDLE - 2, y0 + 10);
      ctx.stroke();
      ctx.strokeStyle = rgba('#e8c890', 0.35);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bx + 2, y0 + 9);
      ctx.quadraticCurveTo(bx + BUNDLE / 2, y0 + 12, bx + BUNDLE - 2, y0 + 9);
      ctx.stroke();
    }
    // each course shades the one behind it
    vfill(ctx, 0, y0 + 2, W, 14, [[0, 'rgba(20,10,4,0.35)'], [1, 'rgba(20,10,4,0)']]);
  }
  // single straws glowing at the fringe's ragged edge against the sky
  for (let x = 0; x < W; x += 3) {
    if (r() < 0.3) {
      const near = Math.max(0, 1 - Math.abs(x - BH.sun.x) / 900);
      ctx.fillStyle = rgba('#fff0b0', 0.25 + near * 0.45);
      ctx.fillRect(x, h + 6 + r() * 34, 1.5, 7);
    }
  }
  grain(ctx, { x: 0, y: 0, w: W, h: h + 70 }, 'grain', 0.22, 1.2);
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

/** A bamboo post: a thick cane with swollen nodes (a lit ridge over a dark groove), streaked internodes, a split
 * running between two nodes, sun-bleached on its lit side and polished where hands hold it; lashed at the eave. */
function bamboo(ctx: Ctx, r: R, x: number, y0: number, y1: number, w: number): void {
  const p = rectPath(x, y0, w, y1 - y0);
  castShadow(ctx, p, 20, 18, 0.25, '#4a2a10');
  solid(ctx, p, { x, y: y0, w, h: y1 - y0 }, 'wood', '#c8a060', { depth: 0.08, formSize: w * 0.35 });
  within(ctx, p, () => {
    lay(ctx, drift('#e8c890', '#5a3a20', 3, Math.round(x) + 5, 32, 160), { x, y: y0, w, h: y1 - y0 }, 0.3);
    for (let fx = x + 3; fx < x + w; fx += 3 + r() * 4) {
      ctx.fillStyle = rgba(r() < 0.5 ? '#6a4a1a' : '#fff0c8', 0.1 + r() * 0.06);
      ctx.fillRect(fx, y0, 1.1, y1 - y0);
    }
    const nodes: number[] = [];
    for (let y = y0 + 150 + r() * 30; y < y1 - 20; y += 150 + r() * 40) nodes.push(y);
    for (const y of nodes) {
      // the node: a slight swelling, a dark groove, the ridge lit; darker cane just above (the sheath scar)
      ctx.fillStyle = 'rgba(70,40,10,0.2)';
      ctx.fillRect(x, y - 14, w, 14);
      ctx.fillStyle = 'rgba(60,34,8,0.6)';
      ctx.fillRect(x, y, w, 4);
      ctx.fillStyle = rgba('#fff0c0', 0.5);
      ctx.fillRect(x, y + 4, w, 2.5);
      ctx.fillStyle = 'rgba(70,40,10,0.15)';
      ctx.fillRect(x, y + 6.5, w, 8);
      // a bud scar on alternate sides
      const sx = x + (nodes.indexOf(y) % 2 ? w * 0.7 : w * 0.25);
      ctx.fillStyle = 'rgba(60,34,8,0.5)';
      ctx.beginPath();
      ctx.ellipse(sx, y + 12, 5, 3, 0, 0, P2);
      ctx.fill();
    }
    // a split between two nodes: a dark crack with its lit lip
    if (nodes.length > 2) {
      const a = nodes[1] + 10;
      const b = nodes[2] - 6;
      const cx = x + w * 0.6;
      ctx.strokeStyle = 'rgba(40,20,6,0.7)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(cx, a);
      for (let y = a; y < b; y += 12) ctx.lineTo(cx + Math.sin(y * 0.07) * 1.5, y);
      ctx.stroke();
      ctx.strokeStyle = rgba('#fff0c8', 0.35);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 2, a + 4);
      for (let y = a + 4; y < b - 4; y += 12) ctx.lineTo(cx - 2 + Math.sin(y * 0.07) * 1.5, y);
      ctx.stroke();
    }
    // the polished cane: a long sheen down its lit side
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0.15, 'rgba(255,240,200,0)');
    g.addColorStop(0.28, 'rgba(255,240,200,0.32)');
    g.addColorStop(0.4, 'rgba(255,240,200,0)');
    g.addColorStop(0.8, 'rgba(30,16,30,0)');
    g.addColorStop(1, 'rgba(30,16,30,0.3)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y0, w, y1 - y0);
  });
  // lashed to the eave beam
  lashing(ctx, x - 2, EAVE.y - 6, w + 4, EAVE.h + 18, 7);
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
    // the stringer, and wax rubbed on the deck in rough bumps
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(-2, -500, 4, 500);
    for (let i = 0; i < 160; i++) {
      const yy = -40 - r() * 300;
      const xx = (r() - 0.5) * 70;
      ctx.fillStyle = rgba(r() < 0.5 ? '#ffffff' : '#c8e8e0', 0.25);
      ctx.beginPath();
      ctx.ellipse(xx, yy, 1.6 + r() * 2.4, 1 + r() * 1.4, 0, 0, P2);
      ctx.fill();
    }
    // the glassed finish: the sky in a long soft band down its left; the rail in shade on its right
    const g = ctx.createLinearGradient(-60, 0, 60, 0);
    g.addColorStop(0.1, 'rgba(255,240,210,0)');
    g.addColorStop(0.25, 'rgba(255,240,210,0.35)');
    g.addColorStop(0.36, 'rgba(255,240,210,0)');
    g.addColorStop(0.8, 'rgba(20,40,60,0)');
    g.addColorStop(1, 'rgba(20,40,60,0.3)');
    ctx.fillStyle = g;
    ctx.fillRect(-60, -500, 120, 500);
    ctx.restore();
  });
  specHi(ctx, 1742, 420, 70, 10, 0.7, -1.45);
  specHi(ctx, 1760, 300, 26, 5, 0.6, -1.45);
}

/** The tiki torch: a bamboo pole planted at the bar's corner, lashed under a cup of coconut husk with its wick; the
 * cup sooted. (Its flame is live, from dusk.) */
function torch(ctx: Ctx, r: R): void {
  const { x, y } = BH.torch;
  const ph = BH.torch.h;
  const top = y - ph;
  const pole = rectPath(x - 9, top, 18, ph);
  castShadow(ctx, pole, 20, 14, 0.25, '#4a2a10');
  solid(ctx, pole, { x: x - 9, y: top, w: 18, h: ph }, 'wood', '#a88050', { depth: 0.12, formSize: 6 });
  within(ctx, pole, () => {
    for (let ny = top + 60; ny < y; ny += 74) {
      ctx.fillStyle = 'rgba(60,34,8,0.6)';
      ctx.fillRect(x - 9, ny, 18, 2.5);
      ctx.fillStyle = rgba('#fff0c0', 0.45);
      ctx.fillRect(x - 9, ny + 2.5, 18, 1.5);
    }
    const g = ctx.createLinearGradient(x - 9, 0, x + 9, 0);
    g.addColorStop(0, rgba('#ffe0a0', 0.3));
    g.addColorStop(1, rgba('#2a1830', 0.3));
    ctx.fillStyle = g;
    ctx.fillRect(x - 9, top, 18, ph);
  });
  lashing(ctx, x - 10, top + 2, 20, 22, 4);
  // the husk cup: fibrous, flared, a dark rim with the wick standing in it
  const cup = polyPath([[x - 26, top - 32], [x + 26, top - 32], [x + 15, top + 4], [x - 15, top + 4]]);
  solid(ctx, cup, { x: x - 26, y: top - 32, w: 52, h: 36 }, 'wood', '#7a5430', { depth: 0.12, formSize: 6 });
  within(ctx, cup, () => {
    for (let k = 0; k < 40; k++) {
      const xx = x - 26 + r() * 52;
      ctx.strokeStyle = rgba(r() < 0.5 ? '#3a2410' : '#b89060', 0.4);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(xx, top - 32);
      ctx.lineTo(xx + (x - xx) * 0.35, top + 4);
      ctx.stroke();
    }
    vfill(ctx, x - 26, top - 32, 52, 14, [[0, 'rgba(20,10,6,0.7)'], [1, 'rgba(20,10,6,0)']]);
  });
  ctx.fillStyle = '#2a1a10';
  ctx.beginPath();
  ctx.ellipse(x, top - 32, 26, 5, 0, 0, P2);
  ctx.fill();
  ctx.fillStyle = '#e8dcc0';
  ctx.fillRect(x - 3, top - 44, 6, 12);
  ctx.fillStyle = '#2a1a10';
  ctx.fillRect(x - 3, top - 46, 6, 4);
}

/** String lights hung from the eave beam: hooked at every rafter, swagging between, four bulbs to a bay. */
const BULBS: [number, number, string][] = (() => {
  const out: [number, number, string][] = [];
  const cols = ['#ff6a8a', '#ffd84a', '#5ae0ff', '#8aff7a', '#ff9a3a'];
  const n = Math.round((W - 2 * RAFTER0) / (RAFTER / 4));
  for (let i = 0; i <= n; i++) {
    const x = RAFTER0 + (i * RAFTER) / 4;
    const u = (((x - RAFTER0) / RAFTER) % 1 + 1) % 1;
    out.push([x, wireY(x) + 10, cols[i % cols.length]]);
    void u;
  }
  return out;
})();
function wireY(x: number): number {
  const u = (((x - RAFTER0) / RAFTER) % 1 + 1) % 1;
  return EAVE.y + EAVE.h + 2 + Math.sin(u * Math.PI) * 26;
}

function lights(ctx: Ctx): void {
  ctx.strokeStyle = '#2a1a0c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = RAFTER0 - RAFTER / 2; x <= W - RAFTER0 + RAFTER / 2; x += 6) (x === RAFTER0 - RAFTER / 2 ? ctx.moveTo(x, wireY(x)) : ctx.lineTo(x, wireY(x)));
  ctx.stroke();
  // the hooks at the rafters
  for (let x = RAFTER0; x < W; x += RAFTER) {
    ctx.strokeStyle = '#3a3a40';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, wireY(x) - 3, 3.5, 0, Math.PI);
    ctx.stroke();
  }
  for (const [x, y, c] of BULBS) bulb(ctx, x, y, c, false);
}

/** One bulb on its socket (unlit: tinted glass with a window glint; lit: its glass glowing). */
function bulb(ctx: Ctx, x: number, y: number, c: string, lit: boolean): void {
  ctx.fillStyle = '#3a2a1a';
  ctx.fillRect(x - 3, y - 11, 6, 6);
  ctx.strokeStyle = '#2a1a0c';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x, y - 11);
  ctx.lineTo(x, wireY(x));
  ctx.stroke();
  const b = ellPath(x, y, 5, 7);
  b(ctx);
  if (lit) {
    const g = ctx.createRadialGradient(x, y + 1, 0, x, y, 8);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.45, mix(c, '#ffffff', 0.5));
    g.addColorStop(1, c);
    ctx.fillStyle = g;
  } else ctx.fillStyle = mix(c, '#e8e0d0', 0.5);
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,20,10,0.6)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillRect(x - 2.5, y - 4, 1.6, 3);
}

const SIGN = { w: 560, h: 96, ropeTop: 34 };

/** The bar's sign: three driftwood boards on two battens, salt-silvered at the edges, nail heads, letters carved and
 * painted; it hangs on two ropes from the rafters (the live layer swings it). */
function sign(ctx: Ctx, r: R): void {
  const { x, y } = BH.sign;
  const { w, h } = SIGN;
  for (const dx of [-200, 200]) {
    ctx.strokeStyle = '#5a4020';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + dx * 0.96, SIGN.ropeTop);
    ctx.lineTo(x + dx, y - h / 2 + 6);
    ctx.stroke();
    ctx.strokeStyle = rgba('#e8c890', 0.5);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let yy = SIGN.ropeTop + 4; yy < y - h / 2; yy += 6) {
      ctx.moveTo(x + dx * 0.96 + 2 - 1.5, yy);
      ctx.lineTo(x + dx * 0.96 + 2 + 1.5, yy + 3);
    }
    ctx.stroke();
    // the eye screw
    ctx.strokeStyle = '#4a4a50';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + dx, y - h / 2 + 2, 4, 0, P2);
    ctx.stroke();
  }
  const p = rrPath(x - w / 2, y - h / 2, w, h, 12);
  castShadow(ctx, p, 18, 16, 0.3, '#3a2010');
  solid(ctx, p, { x: x - w / 2, y: y - h / 2, w, h }, 'wood', '#9a6a3a', { depth: 0.1, formSize: 16 });
  within(ctx, p, () => {
    for (let k = 0; k < 3; k++) {
      const by = y - h / 2 + (k * h) / 3;
      board(ctx, r, x - w / 2, by, w, h / 3, shade('#9a6a3a', (r() - 0.5) * 0.12));
      ctx.fillStyle = 'rgba(40,20,6,0.55)';
      ctx.fillRect(x - w / 2, by, w, 2.2);
      ctx.fillStyle = rgba('#ffe0b0', 0.22);
      ctx.fillRect(x - w / 2, by + 2.2, w, 1);
    }
    // salt-silvered and sun-bleached, greyest at the edges
    lay(ctx, drift('#d8b080', '#3a2010', 6, 91, 160, 32), { x: x - w / 2, y: y - h / 2, w, h }, 0.3);
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    const eg = ctx.createRadialGradient(x, y, w * 0.25, x, y, w * 0.55);
    eg.addColorStop(0, 'rgba(200,196,188,0)');
    eg.addColorStop(1, 'rgba(200,196,188,0.35)');
    ctx.fillStyle = eg;
    ctx.fillRect(x - w / 2, y - h / 2, w, h);
    ctx.restore();
    varnish(ctx, { x: x - w / 2, y: y - h / 2, w, h }, [{ x: BH.sun.x + 60, a: 0.25, w: 120 }], { sheen: 0.08, vertical: false });
    // nail heads into the battens behind
    for (const bx of [-236, 236])
      for (let k = 0; k < 3; k++) {
        const ny = y - h / 2 + (k + 0.5) * (h / 3);
        ctx.fillStyle = '#3a3030';
        ctx.beginPath();
        ctx.arc(x + bx, ny, 2.6, 0, P2);
        ctx.fill();
        ctx.fillStyle = 'rgba(140,60,30,0.35)';
        ctx.fillRect(x + bx - 1, ny + 2, 2, 7);
      }
  });
  ctx.lineWidth = lineAt(0.1);
  ctx.strokeStyle = '#3a1e0c';
  p(ctx);
  ctx.stroke();
  // the top edge catches the sun
  ctx.strokeStyle = rgba('#ffe0a8', 0.55);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x - w / 2 + 12, y - h / 2 + 1.5);
  ctx.lineTo(x + w / 2 - 12, y - h / 2 + 1.5);
  ctx.stroke();
  // carved, painted letters: the carving's shadow, the paint (worn through in places), a lit edge
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
  ctx.globalAlpha = 0.22;
  lay(ctx, noiseMask(22, 93, { cover: 0.16, soft: 0.1, col: '#b08050', w: 160, h: 30 }), { x: x - w / 2, y: y - 34, w, h: 68 }, 1);
  ctx.restore();
}

/** The bar top: sun-bleached planks, silvered at their edges, nail holes weeping rust, salt rings and spilt sand. */
function table(ctx: Ctx, r: R): void {
  planksPlane(ctx, r, BH.front, '#c89a62', 0.3, 0.01);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, BH.front - TY);
  ctx.clip();
  lay(ctx, drift('#f0d8b0', '#6a4a3a', 5, 51, 256, 48), { x: 0, y: TY, w: W, h: BH.front - TY }, 0.14);
  // silvering: grey weathering patches
  lay(ctx, noiseMask(7, 57, { cover: 0.35, soft: 0.25, col: '#b8b0a8', w: 256, h: 64 }), { x: 0, y: TY, w: W, h: BH.front - TY }, 0.22);
  varnish(ctx, { x: 0, y: TY, w: W, h: BH.front - TY }, [{ x: BH.sun.x, a: 0.14, w: 160, col: '#ffe0a8' }], { sheen: 0.05 });
  plankWear(ctx, r);
  // bleached by sun and salt towards the open, sea side of the bar; the low light raking across from the left
  vfill(ctx, 0, TY, W, 120, [[0, 'rgba(232,226,214,0.22)'], [1, 'rgba(232,226,214,0)']]);
  const rk = ctx.createLinearGradient(0, 0, W, 0);
  rk.addColorStop(0, 'rgba(255,214,160,0.12)');
  rk.addColorStop(0.45, 'rgba(255,214,160,0)');
  rk.addColorStop(0.75, 'rgba(60,40,70,0)');
  rk.addColorStop(1, 'rgba(60,40,70,0.12)');
  ctx.fillStyle = rk;
  ctx.fillRect(0, TY, W, BH.front - TY);
  // salt rings where glasses stood, sand blown in along the back edge and in the corners
  for (const [rx, ry, rr] of [[700, 790, 22], [1240, 800, 18], [180, 900, 26], [1760, 930, 24]] as const) {
    ctx.strokeStyle = 'rgba(250,244,230,0.18)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(rx, ry, rr, rr * 0.35, 0, 0, P2);
    ctx.stroke();
  }
  for (let i = 0; i < 900; i++) {
    const t = r() ** 2;
    const x = r() * W;
    const edge = Math.min(1, Math.min(x, W - x) / 500);
    const y = TY + 2 + t * (BH.front - TY) * (1 - edge * 0.85);
    ctx.fillStyle = rgba(r() < 0.5 ? '#f0d8a0' : '#b89060', 0.4);
    ctx.fillRect(x, y, 1.4, 1.1);
  }
  ctx.restore();
  tableFalloff(ctx, BH.front, 0.3, '#3a2008');
  tableSeam(ctx, 0.4, '#3a2010', false);
  // the bar's front: bamboo canes side by side, nodes staggered, a rope along the top
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, BH.front, W, 1080 - BH.front);
  ctx.clip();
  for (let x = -6, i = 0; x < W; x += 34, i++) {
    const g = ctx.createLinearGradient(x, 0, x + 32, 0);
    g.addColorStop(0, '#d8b070');
    g.addColorStop(0.35, '#b88a4a');
    g.addColorStop(1, '#6a4a22');
    ctx.fillStyle = g;
    ctx.fillRect(x, BH.front, 32, 60);
    const ny = BH.front + 18 + (i % 3) * 9;
    ctx.fillStyle = 'rgba(60,34,8,0.55)';
    ctx.fillRect(x, ny, 32, 2.5);
    ctx.fillStyle = rgba('#fff0c0', 0.4);
    ctx.fillRect(x, ny + 2.5, 32, 1.4);
  }
  vfill(ctx, 0, BH.front, W, 40, [[0, 'rgba(30,14,4,0.5)'], [1, 'rgba(30,14,4,0.2)']]);
  ctx.restore();
  ctx.fillStyle = rgba('#fff0c8', 0.4);
  ctx.fillRect(0, BH.front - 3, W, 3);
  ctx.fillStyle = 'rgba(40,20,6,0.7)';
  ctx.fillRect(0, BH.front, W, 2);
}

/** The bar top's planks weathered one by one (on planksPlane's spacing): some silvered grey, some still warm, each
 * edge worn pale; nail heads in pairs over the joists, each weeping a little rust. */
const PLANK = { period: 0.3, gap: 0.01 };
function plankWear(ctx: Ctx, r: R): void {
  const zf = zAt(BH.front + 4);
  const joists = [0.1, 0.42, 0.78].map((u) => zf + (ZB - zf) * u);
  const n = Math.ceil(3 / PLANK.period);
  for (let i = -n; i < n; i++) {
    const X0 = i * PLANK.period + PLANK.gap;
    const X1 = (i + 1) * PLANK.period - PLANK.gap;
    if (xAt(X1, zf) < 0 || xAt(X0, zf) > W) continue;
    // every plank its own tone: silvered grey, honey, a darker replacement board
    const tone = r();
    ctx.beginPath();
    planeQuad(ctx, X0, X1, ZB, zf);
    ctx.fillStyle = tone < 0.3 ? 'rgba(200,196,188,0.24)' : tone < 0.55 ? 'rgba(230,170,100,0.12)' : tone < 0.7 ? 'rgba(90,56,30,0.16)' : 'rgba(255,236,200,0.08)';
    ctx.fill();
    // the worn, rounded edge pale; the seam beside it dark, packed with grime and sand
    ctx.beginPath();
    planeQuad(ctx, X0, X0 + 0.016, ZB, zf);
    ctx.fillStyle = 'rgba(255,240,214,0.18)';
    ctx.fill();
    ctx.beginPath();
    planeQuad(ctx, X1 - 0.006, X1 + PLANK.gap * 2, ZB, zf);
    ctx.fillStyle = 'rgba(40,22,10,0.32)';
    ctx.fill();
    // scuffs along the grain where glasses and elbows slide (towards the front edge)
    ctx.lineCap = 'round';
    for (let k = 0; k < 5; k++) {
      const X = X0 + (X1 - X0) * (0.15 + r() * 0.7);
      const z0 = zf + (ZB - zf) * (r() * 0.55);
      const z1 = z0 + (ZB - zf) * (0.04 + r() * 0.08);
      ctx.strokeStyle = r() < 0.5 ? 'rgba(255,244,224,0.12)' : 'rgba(70,40,20,0.12)';
      ctx.lineWidth = 0.8 + r() * 0.8;
      ctx.beginPath();
      ctx.moveTo(xAt(X, z0), yAt(z0));
      ctx.lineTo(xAt(X + (r() - 0.5) * 0.01, z1), yAt(z1));
      ctx.stroke();
    }
    for (const z of joists) {
      const k = FOC / z;
      for (const u of [0.2, 0.8]) {
        const nx = xAt(X0 + (X1 - X0) * u, z);
        const ny = yAt(z);
        const rad = Math.max(1, k * 0.0045);
        ctx.fillStyle = 'rgba(140,70,30,0.16)';
        ctx.fillRect(nx - rad * 0.6, ny, rad * 1.2, rad * (3 + r() * 4));
        ctx.fillStyle = 'rgba(40,30,30,0.6)';
        ctx.beginPath();
        ctx.ellipse(nx, ny, rad, rad * 0.55, 0, 0, P2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,240,220,0.3)';
        ctx.beginPath();
        ctx.ellipse(nx - rad * 0.3, ny - rad * 0.2, rad * 0.4, rad * 0.2, 0, 0, P2);
        ctx.fill();
      }
    }
  }
}

/** The low sun reaching in under the thatch (wave 1): warm light across the bar top from the back left, cut by the
 * long shadows of the posts, the palms and the torch's pole thrown towards us. Light only (laid on with 'lighter';
 * live, an additive sprite that fades as the sun goes down). */
function sunOnBar(ctx: Ctx): void {
  const [c, g] = makeCanvas(W / 2, (BH.front - TY) / 2);
  g.scale(0.5, 0.5);
  g.translate(0, -TY);
  const lg = g.createLinearGradient(0, TY, W * 0.8, BH.front);
  lg.addColorStop(0, 'rgba(255,200,120,0.3)');
  lg.addColorStop(0.5, 'rgba(255,190,110,0.16)');
  lg.addColorStop(1, 'rgba(255,190,110,0)');
  g.fillStyle = lg;
  g.fillRect(0, TY, W, BH.front - TY);
  // the shadows: soft stripes from each upright at the back edge, raking down to the right
  g.globalCompositeOperation = 'destination-out';
  g.filter = 'blur(10px)';
  for (const [x0, w0] of [[28, 70], [150, 40], [BH.torch.x, 18], [1800, 50], [W - 28, 74]] as const) {
    g.fillStyle = 'rgba(0,0,0,0.8)';
    g.beginPath();
    g.moveTo(x0 - w0 / 2, TY);
    g.lineTo(x0 + w0 / 2, TY);
    g.lineTo(x0 + w0 * 0.9 + 260, BH.front + 10);
    g.lineTo(x0 - w0 * 0.2 + 220, BH.front + 10);
    g.closePath();
    g.fill();
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(c, 0, TY, W, BH.front - TY);
  ctx.restore();
}

/** A coconut with a straw and a paper umbrella (left end of the bar). */
function drink(ctx: Ctx, r: R): void {
  const cx = 150;
  const cy = 806;
  groundShadow(ctx, cx + 16, cy + 2, 50, 8, 0.4, '#3a2010', 1.4);
  const nut = ellPath(cx, cy - 26, 36, 30);
  solid(ctx, nut, { x: cx - 36, y: cy - 56, w: 72, h: 60 }, 'wood', '#6a4422', { depth: 0.05, formSize: 12 });
  within(ctx, nut, () => {
    grain(ctx, { x: cx - 40, y: cy - 60, w: 80, h: 70 }, 'fleece', 0.5, 1);
    // husk fibres curving round it
    for (let i = 0; i < 30; i++) {
      const a = r() * Math.PI;
      ctx.strokeStyle = rgba(r() < 0.5 ? '#3a2010' : '#a87a48', 0.35);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(cx, cy - 26, Math.max(1, 36 * Math.abs(Math.cos(a))), 30, 0, -1.2, 1.2);
      ctx.stroke();
    }
  });
  ctx.beginPath();
  ctx.ellipse(cx, cy - 50, 26, 7, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#fff6e8';
  ctx.fill();
  ctx.strokeStyle = '#3a2410';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,190,120,0.55)';
  ctx.beginPath();
  ctx.ellipse(cx, cy - 50, 20, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ff5a8a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx + 6, cy - 50);
  ctx.lineTo(cx + 30, cy - 104);
  ctx.stroke();
  ctx.strokeStyle = rgba('#ffffff', 0.6);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx + 5, cy - 52);
  ctx.lineTo(cx + 28, cy - 103);
  ctx.stroke();
  // the paper umbrella: pleated panels, lit on the sun's side
  const ux = cx + 31;
  const uy = cy - 112;
  for (let i = 0; i < 6; i++) {
    const a0 = Math.PI + (i / 6) * Math.PI;
    const a1 = Math.PI + ((i + 1) / 6) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(ux, uy - 16);
    ctx.lineTo(ux + Math.cos(a0) * 27, uy + Math.sin(a0) * 4 + 6);
    ctx.lineTo(ux + Math.cos(a1) * 27, uy + Math.sin(a1) * 4 + 6);
    ctx.closePath();
    ctx.fillStyle = shade('#5ad0ff', i % 2 ? -0.15 : 0.08 - i * 0.03);
    ctx.fill();
    ctx.strokeStyle = 'rgba(20,50,80,0.6)';
    ctx.lineWidth = 0.9;
    ctx.stroke();
  }
  ctx.strokeStyle = '#2a4a6a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(ux, uy - 16);
  ctx.lineTo(ux - 1, uy + 14);
  ctx.stroke();
}

/** The right end of the bar: a green bottle, limes, and a hurricane lantern (its candle lit from dusk). */
function barRight(ctx: Ctx, r: R): void {
  bottle(ctx, 1758, 810, 84, '#5a8a3a', { kind: 'wine', label: '#ffe0a0', cork: '#e8e0c0', depth: 0.05 });
  for (const [lx, ly] of [[1700, 808], [1724, 814], [1792, 816]] as const) {
    const lime = ellPath(lx, ly - 10, 14, 11);
    groundShadow(ctx, lx + 6, ly, 16, 4, 0.35, '#3a2010', 1.3);
    solid(ctx, lime, { x: lx - 14, y: ly - 21, w: 28, h: 22 }, 'plastic', '#8acc3a', { depth: 0.05, line: 1.6, formSize: 4 });
    ctx.fillStyle = rgba('#f0ffd0', 0.55);
    ctx.beginPath();
    ctx.ellipse(lx - 5, ly - 15, 4, 2, -0.4, 0, P2);
    ctx.fill();
  }
  // a halved lime, its cut face
  const hx = 1690;
  const hy = 828;
  ctx.fillStyle = '#5a9a2a';
  ctx.beginPath();
  ctx.ellipse(hx, hy, 13, 6, 0, 0, P2);
  ctx.fill();
  ctx.fillStyle = '#d8f088';
  ctx.beginPath();
  ctx.ellipse(hx, hy - 1, 11, 4.6, 0, 0, P2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,160,60,0.7)';
  ctx.lineWidth = 0.8;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * P2;
    ctx.beginPath();
    ctx.moveTo(hx, hy - 1);
    ctx.lineTo(hx + Math.cos(a) * 10, hy - 1 + Math.sin(a) * 4);
    ctx.stroke();
  }
  ao(ctx, 1750, 816, 120, 9, 0.35);
  lantern(ctx, r);
}

/** The hurricane lantern: a tin base and cap, a glass chimney with the candle in it, a wire bail. */
function lantern(ctx: Ctx, r: R): void {
  const { x, y } = BH.lantern;
  groundShadow(ctx, x + 8, y + 2, 30, 6, 0.42, '#3a2010', 1.3);
  const base = rrPath(x - 22, y - 16, 44, 16, 4);
  solid(ctx, base, { x: x - 22, y: y - 16, w: 44, h: 16 }, 'enamel', '#3a5a4a', { depth: 0.05, line: 1.6, formSize: 5 });
  // the candle inside, then the glass over it
  ctx.fillStyle = '#f4ead2';
  ctx.fillRect(x - 6, y - 40, 12, 24);
  ctx.fillStyle = rgba('#ffffff', 0.5);
  ctx.fillRect(x - 5, y - 40, 3, 24);
  ctx.fillStyle = '#2a1a10';
  ctx.fillRect(x - 0.8, y - 46, 1.6, 6);
  const glass = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x - 14, y - 16);
    c.bezierCurveTo(x - 30, y - 34, x - 24, y - 66, x - 12, y - 74);
    c.lineTo(x + 12, y - 74);
    c.bezierCurveTo(x + 24, y - 66, x + 30, y - 34, x + 14, y - 16);
    c.closePath();
  };
  glass(ctx);
  const gg = ctx.createLinearGradient(x - 26, 0, x + 26, 0);
  gg.addColorStop(0, 'rgba(236,246,248,0.42)');
  gg.addColorStop(0.4, 'rgba(200,220,226,0.22)');
  gg.addColorStop(1, 'rgba(90,110,130,0.45)');
  ctx.fillStyle = gg;
  ctx.fill();
  ctx.strokeStyle = 'rgba(30,40,50,0.85)';
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // the wire guards round the glass, and a smudge of soot inside the top
  ctx.strokeStyle = '#2a3a34';
  ctx.lineWidth = 1.6;
  for (const dx of [-17, 17]) {
    ctx.beginPath();
    ctx.moveTo(x + dx * 0.8, y - 16);
    ctx.quadraticCurveTo(x + dx * 1.5, y - 44, x + dx * 0.7, y - 74);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(40,30,30,0.3)';
  ctx.beginPath();
  ctx.ellipse(x, y - 68, 10, 5, 0, 0, P2);
  ctx.fill();
  specHi(ctx, x - 14, y - 46, 16, 3, 0.7, -1.3);
  ctx.fillStyle = rgba('#ffffff', 0.3);
  ctx.fillRect(x + 12, y - 54, 2, 20);
  const cap = rrPath(x - 14, y - 82, 28, 9, 3);
  solid(ctx, cap, { x: x - 14, y: y - 82, w: 28, h: 9 }, 'enamel', '#3a5a4a', { depth: 0.05, line: 1.4, formSize: 3 });
  ctx.strokeStyle = '#2a2a30';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x - 14, y - 78);
  ctx.quadraticCurveTo(x, y - 112, x + 14, y - 78);
  ctx.stroke();
  void r;
}

/** The bar's own light (live only, added: the live code brings it up from sunset): every bulb's pool on the bar top
 * and the fringe, the lantern's pool, the torch's warmth on the bar's right end. */
function lightsGlow(ctx: Ctx): void {
  for (const [x, y, c] of BULBS) {
    if (Math.abs(x - BH.sign.x) > 300) glowAt(ctx, x, y + 16, 54, c, 0.2, 1.1);
    lightPool(ctx, x, TY + 50 + Math.abs(x - 960) * 0.02, 190, 60, mix(c, '#ffd8a0', 0.3), 0.34);
  }
  // the warm band along the back of the bar under the string, the lantern's pool, the torch's warmth
  lightPool(ctx, 960, TY + 40, 1100, 70, '#ffc890', 0.16);
  lightPool(ctx, BH.lantern.x - 40, BH.lantern.y + 8, 300, 80, '#ffb860', 0.5);
  lightPool(ctx, BH.torch.x + 20, TY + 50, 340, 80, '#ff9a4a', 0.3);
}

function grade(ctx: Ctx): void {
  gradeAll(ctx, 0.02, '#ffd09a', 0.06, { warm: '#ffc880', cool: '#5a6ac0', a: 0.2 });
}

function shadeOver(ctx: Ctx): void {
  hudCalm(ctx);
  calmLanes(ctx, 0.06, '#4a3020', 220, 620);
  vignetteAll(ctx, 0.4, '#2a1a20');
}

// ——— frame painters (the live layer's loops; the still paints one frame of each) ———

/** The surf's frames cover one cusp of the beach (with overlaps that feather into the next): SURF.w wide from the
 * still water out past the swash's highest reach. */
const SURF = { w: 920, n: 14, res: 0.5, y0: BH.shore - 72, h: 140 };
const SURF_X0 = 960 - SURF.w / 2;
/** The phase of the wave at x: it breaks first off the cusps' horns and peels into the bays. */
const surfPhase = (x: number, ph: number) => (((ph - 0.045 * Math.cos(((x - CUSP / 2) / CUSP) * P2)) % 1) + 1) % 1;
const easeOut = (k: number) => 1 - (1 - clamp01(k)) ** 2.2;
/** The swash's leading edge at x (local phase p): rushing up the sand, then left stranded at its highest reach. */
function swashFront(x: number, p: number): number {
  const e = shoreTop(x);
  const ru = runUp(x);
  const lobe = Math.sin(x * 0.045 + 1.3) * 3 + Math.sin(x * 0.11) * 1.5;
  if (p < 0.34) return e - 22;
  if (p < 0.62) return e - 22 + (ru + 22) * easeOut((p - 0.34) / 0.28) + lobe * easeOut((p - 0.34) / 0.28);
  return e + ru + lobe;
}
/** The water's edge at x: following the front up, then draining back to the still water. */
function sheetEdge(x: number, p: number): number {
  // (before the next wave arrives the sand is drained)
  if (p < 0.34) return shoreTop(x);
  if (p < 0.62) return swashFront(x, p);
  const k = (p - 0.62) / 0.38;
  const e = shoreTop(x);
  return e + (swashFront(x, 0.62) - e) * (1 - k ** 1.3);
}

/** One frame of the surf on a cusp (phase 0…1 loops), in screen coordinates for the middle cusp: the wet sand's
 * sheen, the swash's thin sheet with its lace, the foam rushing up and left stranded at its reach, the next wave
 * rising, cresting white and breaking with a puff of spray, its foam drifting in the shallows. */
function surfFrame(c: Ctx, ph: number): void {
  const X0 = SURF_X0;
  const X1 = X0 + SURF.w;
  const step = 5;
  const xs: number[] = [];
  for (let x = X0; x <= X1; x += step) xs.push(x);
  const line = (f: (x: number) => number) => xs.map((x): [number, number] => [x, f(x)]);
  const band = (top: (x: number) => number, bot: (x: number) => number) => polyPath([...line(top), ...line(bot).reverse()]);
  const rr = rng(71);
  // ——— 1. the wet sand's sheen: a mirror of the sky where the water has just drained, soaking away
  const age = (((ph - 0.62) % 1) + 1) % 1;
  if (age < 0.72) {
    const fade = 1 - age / 0.72;
    const sh = band((x) => sheetEdge(x, surfPhase(x, ph)) - 1, (x) => swashFront(x, 0.62) + 2);
    sh(c);
    const g = c.createLinearGradient(0, BH.shore, 0, BH.shore + 50);
    g.addColorStop(0, rgba('#fff2dc', 0.5 * fade));
    g.addColorStop(1, rgba('#ffe8c8', 0.22 * fade * fade));
    c.fillStyle = g;
    c.fill();
    // the sand darker where it's wet
    c.fillStyle = rgba('#6a4a30', 0.14 * fade);
    c.fill();
  }
  // ——— 2. the swash's sheet: thin water over the sand, clear at its edge, teal over the still water
  const p0 = ph;
  const swash = p0 >= 0.34;
  if (swash) {
    const sp = (x: number) => surfPhase(x, ph);
    const thin = ph < 0.62 ? 1 : (1 - (ph - 0.62) / 0.38) ** 0.8;
    const sheet = band(
      (x) => shoreTop(x) - 14,
      (x) => {
        // (where the bore hasn't reached the sand yet there's no sheet)
        const q = sp(x);
        return q < 0.34 ? shoreTop(x) - 14 : Math.max(shoreTop(x) - 14, sheetEdge(x, q));
      },
    );
    sheet(c);
    c.fillStyle = rgba('#5a4030', 0.16 * thin);
    c.fill();
    const g = c.createLinearGradient(0, BH.shore - 14, 0, BH.shore + 50);
    g.addColorStop(0, rgba('#5ab8b0', 0.5 * thin));
    g.addColorStop(0.5, rgba('#a8e0d8', 0.3 * thin));
    g.addColorStop(1, rgba('#e8fff8', 0.22 * thin));
    c.fillStyle = g;
    c.fill();
    // the lace across it: a web of foam riding the water (it rides up with the swash and is drawn back down)
    const [fc, fg] = makeCanvas(SURF.w, SURF.h);
    fg.translate(-X0, -SURF.y0);
    // (the lace thickest just behind the front, thinning back towards the sea)
    sheet(fg);
    const lg = fg.createLinearGradient(0, BH.shore - 14, 0, BH.shore + 46);
    lg.addColorStop(0, rgba('#ffffff', 0.15 * thin));
    lg.addColorStop(1, rgba('#ffffff', 0.6 * thin));
    fg.fillStyle = lg;
    fg.fill();
    fg.setTransform(1, 0, 0, 1, 0, 0);
    fg.globalCompositeOperation = 'destination-in';
    const ride = ph < 0.62 ? easeOut((ph - 0.34) / 0.28) * 34 : 34 - ((ph - 0.62) / 0.38) * 30;
    // (the lace's cells squashed by the perspective: wider than they are deep)
    const web = noiseMask(40, 77, { kind: 'web', cover: 0.55, soft: 0.14, col: '#ffffff', w: 512, h: 128 });
    fg.drawImage(web, 0, SURF.h * 0.3 - 28 + ride, SURF.w, 72);
    c.drawImage(fc, X0, SURF.y0);
  }
  // ——— 3. the foam left stranded at the swash's reach: a line breaking up into bubbles, fading
  if (age < 0.8) {
    const fade = (1 - age / 0.8) ** 1.2;
    c.lineCap = 'round';
    for (const [dy, w, a] of [[3, 3, 0.25], [0, 2.2, 0.85]] as const) {
      c.strokeStyle = dy ? rgba('#4a3a40', a * fade) : rgba('#ffffff', a * fade);
      c.lineWidth = w;
      c.beginPath();
      let on = false;
      for (const x of xs) {
        const vis = Math.sin(x * 0.09 + 2) + Math.sin(x * 0.031) > -0.9 + age * 1.6;
        const y = swashFront(x, 0.62) + dy;
        if (vis && !on) c.moveTo(x, y);
        else if (vis) c.lineTo(x, y);
        on = vis;
      }
      c.stroke();
    }
    for (let i = 0; i < 60; i++) {
      const x = X0 + rr() * SURF.w;
      const y = swashFront(x, 0.62) - rr() * 8;
      c.fillStyle = rgba('#ffffff', 0.6 * fade * rr());
      c.beginPath();
      c.arc(x, y, 0.8 + rr() * 1.6, 0, P2);
      c.fill();
    }
  }
  // ——— 4. the foam rushing up: a thick bright front, lumpy with bubbles, its shadow on the sand ahead of it
  if (ph >= 0.3 && ph < 0.66) {
    const a = ph < 0.6 ? 1 : 1 - (ph - 0.6) / 0.06;
    const sp = (x: number) => surfPhase(x, ph);
    c.lineCap = 'round';
    c.strokeStyle = rgba('#3a3040', 0.22 * a);
    c.lineWidth = 3;
    c.beginPath();
    xs.forEach((x, i) => (i ? c.lineTo(x, swashFront(x, sp(x)) + 4) : c.moveTo(x, swashFront(x, sp(x)) + 4)));
    c.stroke();
    const fb = band((x) => swashFront(x, sp(x)) - 9 - Math.max(0, Math.sin(x * 0.13 + ph * 20)) * 3, (x) => swashFront(x, sp(x)) + 1.5);
    fb(c);
    const g = c.createLinearGradient(0, BH.shore - 20, 0, BH.shore + 50);
    g.addColorStop(0, rgba('#e8f4f0', 0.85 * a));
    g.addColorStop(1, rgba('#ffffff', 0.95 * a));
    c.fillStyle = g;
    c.fill();
    for (let i = 0; i < 70; i++) {
      const x = X0 + rr() * SURF.w;
      const y = swashFront(x, sp(x)) - 4 - rr() * 14;
      c.fillStyle = rgba('#ffffff', (0.4 + rr() * 0.5) * a);
      c.beginPath();
      c.arc(x, y, 1 + rr() * 2.4, 0, P2);
      c.fill();
    }
  }
  // ——— 5. the next wave: rising out of the shallows, its face darkening, the crest whitening, breaking
  {
    const u = ph < 0.36 ? ph / 0.36 : ph > 0.9 ? (ph - 0.9) / 0.36 - 0.28 : -1;
    if (u >= 0) {
      const sp = (x: number) => {
        const q = surfPhase(x, ph);
        return q < 0.36 ? q / 0.36 : q > 0.9 ? (q - 0.9) / 0.36 - 0.28 : 1;
      };
      // (it runs in parallel to the beach's cusps, wavering along its length)
      const wy = (x: number) => shoreTop(x) - 22 - (1 - clamp01(sp(x))) * (shoreTop(x) - 40 - SURF.y0) + Math.sin(x * 0.011 + 1.3) * 3 + Math.sin(x * 0.037) * 1.5;
      const rise = clamp01(u * 1.4);
      const tall = 3 + rise * 7;
      // the face: a dark band under the crest, its back lit
      const face = band((x) => wy(x) - tall * 0.3, (x) => wy(x) + tall);
      face(c);
      const fg = c.createLinearGradient(0, SURF.y0, 0, BH.shore);
      fg.addColorStop(0, rgba('#1a5a6a', 0.45 * rise));
      fg.addColorStop(1, rgba('#2a7a80', 0.4 * rise));
      c.fillStyle = fg;
      c.fill();
      const back = band((x) => wy(x) - tall * 0.3 - 6, (x) => wy(x) - tall * 0.3);
      back(c);
      c.fillStyle = rgba('#c8f0e8', 0.22 * rise);
      c.fill();
      // the crest: a lit line whitening as it steepens (from the horns in), then a rolling white band
      const white = clamp01((u - 0.55) / 0.3);
      c.lineCap = 'round';
      // (broken into clumps of white along its length, never one ruled line)
      for (const x of xs) {
        const n = Math.sin(x * 0.04 + 1) + Math.sin(x * 0.013 + u * 3) + Math.sin(x * 0.09 + 2) * 0.5;
        const k = clamp01((n - 0.9 + white * 2.6) / 0.8);
        if (k <= 0) continue;
        const y = wy(x) - tall * 0.3;
        c.strokeStyle = rgba('#f4fffc', (0.22 * rise + 0.6 * white) * k);
        c.lineWidth = (1.4 + white * 4) * (0.6 + k * 0.4);
        c.beginPath();
        c.moveTo(x - 1, y + Math.sin(x * 0.3) * 0.8);
        c.lineTo(x + step + 1, wy(x + step) - tall * 0.3);
        c.stroke();
      }
      // breaking: the lip thrown forward, a puff of spray over it
      const brk = clamp01((u - 0.8) / 0.2);
      if (brk > 0) {
        for (let i = 0; i < 22; i++) {
          const x = X0 + rr() * SURF.w;
          const y = wy(x) - tall * 0.3 - rr() * 14 * brk;
          const rad = 3 + rr() * 7 * brk;
          const rg = c.createRadialGradient(x, y, 0, x, y, rad);
          rg.addColorStop(0, rgba('#ffffff', 0.55 * brk));
          rg.addColorStop(1, rgba('#ffffff', 0));
          c.fillStyle = rg;
          c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
        }
      }
    }
  }
  // ——— 6. the broken wave's foam left on the shallows, drifting in and thinning
  if (ph >= 0.34 && ph < 0.95) {
    const k = (ph - 0.34) / 0.61;
    const fy = (x: number) => shoreTop(x) - 22 + k * 14 - 4;
    const fb = band((x) => fy(x) - 6 - Math.sin(x * 0.05) * 2, (x) => fy(x) + 3);
    const [fc, fg] = makeCanvas(SURF.w, SURF.h);
    fg.translate(-X0, -SURF.y0);
    fb(fg);
    fg.fillStyle = rgba('#ffffff', 0.45 * (1 - k));
    fg.fill();
    fg.setTransform(1, 0, 0, 1, 0, 0);
    fg.globalCompositeOperation = 'destination-in';
    // (soft patches of foam, not a net: it's spreading and thinning)
    const blot = noiseMask(18, 79, { kind: 'blot', cover: 0.55, soft: 0.22, col: '#ffffff', w: 512, h: 48 });
    fg.drawImage(blot, -k * 20, k * 10, SURF.w + 40, SURF.h * 0.6);
    c.drawImage(fc, X0, SURF.y0);
  }
  // ——— its ends feather into the next cusp's frames
  c.save();
  c.globalCompositeOperation = 'destination-in';
  const eg = c.createLinearGradient(X0, 0, X1, 0);
  eg.addColorStop(0, 'rgba(0,0,0,0)');
  eg.addColorStop(0.08, 'rgba(0,0,0,0.35)');
  eg.addColorStop(0.2, 'rgba(0,0,0,1)');
  eg.addColorStop(0.8, 'rgba(0,0,0,1)');
  eg.addColorStop(0.92, 'rgba(0,0,0,0.35)');
  eg.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = eg;
  c.fillRect(X0, SURF.y0, SURF.w, SURF.h);
  c.restore();
}

/** The three cusps' frames: where each sits, mirrored or not, and how far its wave is behind the first. */
const CUSPS = [
  { dx: -CUSP, flip: false, lag: 0, still: 0.5 },
  { dx: 0, flip: true, lag: 0.07, still: 0.46 },
  { dx: CUSP, flip: false, lag: 0.14, still: 0.54 },
];

/** The still's surf: each cusp's frame at a phase with the swash up the sand, full size. */
function surfStill(ctx: Ctx): void {
  for (const s of CUSPS) {
    const [cv, g] = makeCanvas(SURF.w, SURF.h);
    g.lineJoin = 'round';
    g.translate(-SURF_X0, -SURF.y0);
    surfFrame(g, s.still);
    ctx.save();
    ctx.translate(960 + s.dx, 0);
    if (s.flip) ctx.scale(-1, 1);
    ctx.drawImage(cv, -SURF.w / 2, SURF.y0);
    ctx.restore();
  }
}

/** The glitter's frames: the light's path on the swell, GLIT.w wide at its near end, from the horizon down. */
const GLIT = { w: 640, h: BH.shore - 20 - BH.horizon, n: 10, res: 0.45 };

/** One frame of the glitter on the water (phase 0…1 loops), the path's centre at x = GLIT.w / 2: glints winking on
 * the faces of the swells as the swells run in, sliding with the water; wider and longer nearer us. */
function glitterFrame(c: Ctx, ph: number): void {
  const r = rng(301);
  const cx = GLIT.w / 2;
  const h = GLIT.h;
  for (let i = 0; i < 520; i++) {
    const t = r() ** 0.8;
    const y = 2 + t * (h - 6);
    const spread = 18 + t * GLIT.w * 0.36;
    const off = (r() + r() + r() - 1.5) * spread;
    const phi = r();
    const m = r() < 0.5 ? 1 : 2;
    // the swell's faces: bands running towards us; a glint shows on a face turned to the light
    const swell = 0.5 + 0.5 * Math.sin((t * 7 - ph * 2) * P2 + phi * 0.8);
    const wink = Math.max(0, Math.sin((ph * m + phi) * P2)) ** 3;
    const b = wink * (0.35 + 0.65 * swell) * (1 - Math.abs(off) / (spread * 1.8));
    if (b < 0.04) continue;
    const x = cx + off + Math.sin((ph + phi) * P2) * (2 + t * 6);
    const len = (5 + r() * 18) * (0.35 + t);
    const th = Math.max(1.4, 2.6 * (0.4 + t));
    c.fillStyle = rgba('#ffffff', Math.min(1, b));
    c.beginPath();
    c.ellipse(x, y, len / 2, th / 2, 0, 0, P2);
    c.fill();
  }
}

/** The glitter in the still (one frame, gold, where the afternoon sun lays it). */
function glitterStill(ctx: Ctx): void {
  const [cv, g] = makeCanvas(GLIT.w, GLIT.h);
  glitterFrame(g, 0.3);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = '#fff0c0';
  g.fillRect(0, 0, GLIT.w, GLIT.h);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.8;
  ctx.drawImage(cv, BH.sun.x - GLIT.w * 0.4, BH.horizon + 1, GLIT.w * 0.8, GLIT.h);
  ctx.restore();
}

// people on the beach (painted big and drawn small, so they stay crisp)

const WALK = { w: 84, h: 236, n: 12, ground: 150, scale: 0.6, cycle: 70, speed: 34 };

/** A limb as one smooth tapering form from a (root) through the joint m to b (its end): a curve that passes through
 * the joint, swelling a little at the calf or forearm, outlined once (no seams at the joints). */
function limb(c: Ctx, ax: number, ay: number, mx: number, my: number, bx: number, by: number, w0: number, w1: number, col: string): void {
  const cx = 2 * mx - (ax + bx) / 2;
  const cy = 2 * my - (ay + by) / 2;
  const L: [number, number][] = [];
  const R: [number, number][] = [];
  const N = 12;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = (1 - t) * (1 - t) * ax + 2 * (1 - t) * t * cx + t * t * bx;
    const y = (1 - t) * (1 - t) * ay + 2 * (1 - t) * t * cy + t * t * by;
    const dx = 2 * (1 - t) * (cx - ax) + 2 * t * (bx - cx);
    const dy = 2 * (1 - t) * (cy - ay) + 2 * t * (by - cy);
    const l = Math.hypot(dx, dy) || 1;
    const w = w0 + (w1 - w0) * t + Math.sin(t * Math.PI * 2) * 0.6 * (t > 0.5 ? 1 : 0);
    L.push([x - (dy / l) * w, y + (dx / l) * w]);
    R.push([x + (dy / l) * w, y - (dx / l) * w]);
  }
  const p = polyPath([...L, ...R.reverse()]);
  p(c);
  c.fillStyle = col;
  c.fill();
  c.strokeStyle = 'rgba(30,16,20,0.5)';
  c.lineWidth = 1.1;
  c.stroke();
}

/** One frame of the beachcomber walking (phase 0…1 is one stride of each leg), facing right, the ground at
 * WALK.ground: a woman in a straw hat, a coral top and a sarong, her sandals in her hand; backlit by the sun ahead,
 * a warm rim down her front and the rest of her in soft shade; her reflection in the wet sand under her. */
function walkerFrame(c: Ctx, ph: number): void {
  const fig = (g: Ctx) => {
    const G = WALK.ground;
    const a = ph * P2;
    const bob = -Math.cos(a * 2) * 2.2;
    const hipY = G - 62 + bob;
    const hipX = WALK.w / 2;
    const skin = '#b87858';
    const skinD = '#8a5440';
    const leg = (s: number, col: string) => {
      const sw = Math.sin(a + s) * 0.5;
      const lift = Math.max(0, Math.sin(a + s + 1.2)) * 0.75;
      const kx = hipX + Math.sin(sw) * 31;
      const ky = hipY + Math.cos(sw) * 31;
      const fx = kx + Math.sin(sw - lift) * 30;
      const fy = Math.min(G - 2, ky + Math.cos(sw - lift) * 30);
      // the foot first, the leg over it so they join without a seam
      g.fillStyle = col;
      g.beginPath();
      g.ellipse(fx + 5, fy + 1, 7.5, 3, 0.1 - lift * 0.4, 0, P2);
      g.fill();
      g.strokeStyle = 'rgba(30,16,20,0.5)';
      g.lineWidth = 1.1;
      g.stroke();
      limb(g, hipX, hipY, kx, ky, fx, fy, 6.5, 3, col);
    };
    const arm = (s: number, col: string, sandals: boolean) => {
      const sw = Math.sin(a + s) * 0.45;
      const sx = hipX + 2;
      const sy = hipY - 44;
      const ex = sx - Math.sin(sw) * 22;
      const ey = sy + Math.cos(sw) * 22;
      const hx = ex - Math.sin(sw * 1.3 - 0.2) * 20;
      const hy = ey + Math.cos(sw * 1.3 - 0.2) * 20;
      limb(g, sx, sy, ex, ey, hx, hy, 4.2, 2.8, col);
      if (sandals) {
        g.fillStyle = '#6a3a22';
        g.beginPath();
        g.ellipse(hx + 2, hy + 6, 3, 8, 0.2, 0, P2);
        g.ellipse(hx + 6, hy + 7, 3, 8, -0.1, 0, P2);
        g.fill();
      }
    };
    // far limbs in shade, then the body, then the near ones
    leg(Math.PI, skinD);
    arm(0, skinD, false);
    // the sarong: a wrap from hip to knee, its hem swinging with the stride
    const swing = Math.sin(a) * 6;
    g.beginPath();
    g.moveTo(hipX - 12, hipY - 8);
    g.lineTo(hipX + 12, hipY - 8);
    g.quadraticCurveTo(hipX + 16, hipY + 14, hipX + 14 + swing, hipY + 30);
    g.lineTo(hipX - 14 + swing * 0.6, hipY + 30);
    g.quadraticCurveTo(hipX - 16, hipY + 10, hipX - 12, hipY - 8);
    g.closePath();
    g.fillStyle = '#1f8a8a';
    g.fill();
    g.strokeStyle = 'rgba(20,30,40,0.6)';
    g.lineWidth = 1.2;
    g.stroke();
    g.fillStyle = 'rgba(255,240,200,0.5)';
    for (let k = 0; k < 4; k++) {
      g.beginPath();
      g.arc(hipX - 8 + k * 6 + swing * (k / 6), hipY + 6 + (k % 2) * 10, 2, 0, P2);
      g.fill();
    }
    // torso and the coral top
    g.beginPath();
    g.moveTo(hipX - 10, hipY - 6);
    g.quadraticCurveTo(hipX - 13, hipY - 30, hipX - 6, hipY - 48);
    g.lineTo(hipX + 8, hipY - 48);
    g.quadraticCurveTo(hipX + 13, hipY - 26, hipX + 10, hipY - 6);
    g.closePath();
    g.fillStyle = skin;
    g.fill();
    g.strokeStyle = 'rgba(30,16,20,0.55)';
    g.stroke();
    g.fillStyle = '#ff6a5a';
    g.beginPath();
    g.ellipse(hipX + 2, hipY - 34, 11, 7, 0, 0, P2);
    g.fill();
    // head, ponytail, the wide straw hat
    const hx = hipX + 3;
    const hy = hipY - 58;
    g.fillStyle = skin;
    g.beginPath();
    g.ellipse(hx, hy, 8, 9.5, 0, 0, P2);
    g.fill();
    g.stroke();
    g.fillStyle = '#3a2418';
    g.beginPath();
    g.ellipse(hx - 9, hy + 2 + Math.sin(a * 2) * 1.5, 4, 8, 0.4, 0, P2);
    g.fill();
    g.fillStyle = '#e8c070';
    g.beginPath();
    g.ellipse(hx, hy - 6, 20, 5, -0.08, 0, P2);
    g.fill();
    g.beginPath();
    g.ellipse(hx - 1, hy - 10, 9, 6, 0, Math.PI, 0);
    g.fill();
    g.strokeStyle = 'rgba(80,50,20,0.7)';
    g.lineWidth = 1;
    g.beginPath();
    g.ellipse(hx, hy - 6, 20, 5, -0.08, 0, P2);
    g.stroke();
    g.fillStyle = '#d0402a';
    g.fillRect(hx - 9, hy - 11, 18, 2.4);
    leg(0, skin);
    arm(Math.PI, skin, true);
    // backlit: a warm rim down her front (the sun ahead of her, to the left of us)
    g.save();
    g.globalCompositeOperation = 'source-atop';
    const rg = g.createLinearGradient(hipX - 30, 0, hipX + 30, 0);
    rg.addColorStop(0, 'rgba(255,210,140,0.45)');
    rg.addColorStop(0.35, 'rgba(255,210,140,0)');
    rg.addColorStop(0.7, 'rgba(60,40,90,0)');
    rg.addColorStop(1, 'rgba(60,40,90,0.3)');
    g.fillStyle = rg;
    g.fillRect(0, 0, WALK.w, WALK.ground);
    g.restore();
  };
  fig(c);
  // her reflection in the wet sand: mirrored under her feet, faint and broken
  const [rc, rg] = makeCanvas(WALK.w, WALK.ground);
  fig(rg);
  c.save();
  c.globalAlpha = 0.2;
  c.translate(0, WALK.ground * 1.55 + 1);
  c.scale(1, -0.55);
  c.drawImage(rc, 0, 0);
  c.restore();
}

const SWIM = { w: 80, h: 40, n: 10, scale: 0.42 };

/** One frame of a swimmer's crawl (phase 0…1 is a stroke of each arm), heading right: a red cap, an arm arcing over
 * and reaching in, the splash where the hand goes in and the kick's white water behind. Water line at h × 0.6. */
function swimFrame(c: Ctx, ph: number): void {
  const wl = SWIM.h * 0.6;
  const a = ph * P2;
  // the wake and the kick
  for (let i = 0; i < 6; i++) {
    const x = 10 + i * 4;
    c.fillStyle = rgba('#ffffff', 0.35 + 0.3 * Math.max(0, Math.sin(a * 4 + i)));
    c.beginPath();
    c.ellipse(x, wl + 1, 3 + (i % 2), 1.6, 0, 0, P2);
    c.fill();
  }
  // shoulders just under the water, head turning to breathe every other stroke
  c.fillStyle = 'rgba(60,40,30,0.5)';
  c.beginPath();
  c.ellipse(40, wl + 2, 14, 3, 0, 0, P2);
  c.fill();
  const turn = Math.max(0, Math.sin(a)) * 0.5;
  c.fillStyle = '#d83a2a';
  c.beginPath();
  c.ellipse(54, wl - 2 - turn * 2, 6, 5, -turn, 0, P2);
  c.fill();
  c.fillStyle = rgba('#ffd0c0', 0.6);
  c.beginPath();
  c.ellipse(52, wl - 4 - turn * 2, 2.5, 1.5, 0, 0, P2);
  c.fill();
  // the arm in the air: one recovering over the top while the other pulls under
  for (const s of [0, Math.PI]) {
    const q = (a + s) % P2;
    if (q > Math.PI) continue;
    const u = q / Math.PI;
    const sx = 44;
    const sy = wl - 1;
    const ex = sx + 4 + u * 10;
    const ey = sy - Math.sin(u * Math.PI) * 12;
    const hx = sx - 4 + u * 26;
    const hy = sy - Math.sin(u * Math.PI) * 10 + u * 2;
    c.strokeStyle = '#a86a50';
    c.lineWidth = 3;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(sx, sy);
    c.lineTo(ex, ey);
    c.lineTo(hx, hy);
    c.stroke();
    if (u > 0.85) {
      c.fillStyle = rgba('#ffffff', 0.8);
      for (let k = 0; k < 4; k++) {
        c.beginPath();
        c.arc(hx + (k - 1.5) * 3, wl - 2 - k * 1.5, 1.6, 0, P2);
        c.fill();
      }
    }
  }
  // the ring of ripples round them
  c.strokeStyle = rgba('#ffffff', 0.3);
  c.lineWidth = 1;
  c.beginPath();
  c.ellipse(42, wl + 1, 24, 3, 0, 0, P2);
  c.stroke();
}

/** The sailboat (painted at 2×): a white sloop on its waterline (at BOAT.h × 0.8), its mainsail and jib glowing with
 * the low sun behind them, a blue stripe on the hull, its reflection under it. */
const BOAT = { w: 130, h: 160 };
function boatTex(c: Ctx): void {
  const wl = BOAT.h * 0.8;
  const mx = 66;
  // the reflection
  c.fillStyle = 'rgba(255,240,220,0.18)';
  for (let k = 0; k < 6; k++) c.fillRect(30 + (k % 2) * 6, wl + 4 + k * 4, 70 - k * 8, 2);
  // the mainsail and jib: backlit cloth, brightest near the boom
  const main = polyPath([[mx + 2, 12], [mx + 2, wl - 22], [mx + 46, wl - 24]]);
  const jib = polyPath([[mx - 2, 18], [mx - 2, wl - 22], [mx - 40, wl - 20]]);
  for (const [p, col] of [[jib, '#fff4e4'], [main, '#fffaf0']] as const) {
    p(c);
    const g = c.createLinearGradient(0, 12, 0, wl);
    g.addColorStop(0, col);
    g.addColorStop(1, '#ffd8a8');
    c.fillStyle = g;
    c.fill();
    c.strokeStyle = 'rgba(60,50,70,0.7)';
    c.lineWidth = 1.6;
    c.stroke();
  }
  c.strokeStyle = 'rgba(140,110,120,0.35)';
  c.lineWidth = 1;
  for (let k = 1; k < 4; k++) {
    c.beginPath();
    c.moveTo(mx + 2, 12 + k * 24);
    c.lineTo(mx + 2 + k * 9, 14 + k * 26);
    c.stroke();
  }
  // mast and boom
  c.strokeStyle = '#3a3a48';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(mx, 6);
  c.lineTo(mx, wl - 14);
  c.moveTo(mx, wl - 22);
  c.lineTo(mx + 50, wl - 24);
  c.stroke();
  // the hull: white topsides, a blue stripe, the dark bottom just at the waterline
  const hull = (q: Ctx) => {
    q.beginPath();
    q.moveTo(14, wl - 14);
    q.lineTo(118, wl - 16);
    q.quadraticCurveTo(110, wl - 2, 96, wl + 2);
    q.lineTo(34, wl + 2);
    q.quadraticCurveTo(22, wl - 4, 14, wl - 14);
    q.closePath();
  };
  hull(c);
  c.fillStyle = '#f4f0ea';
  c.fill();
  c.save();
  hull(c);
  c.clip();
  c.fillStyle = '#2a5a9a';
  c.fillRect(0, wl - 8, BOAT.w, 4);
  c.fillStyle = '#7a3a3a';
  c.fillRect(0, wl - 1, BOAT.w, 6);
  c.fillStyle = 'rgba(60,50,80,0.25)';
  c.fillRect(70, wl - 16, 60, 20);
  c.restore();
  hull(c);
  c.strokeStyle = 'rgba(40,40,60,0.8)';
  c.lineWidth = 1.8;
  c.stroke();
  // the waterline's foam
  c.fillStyle = 'rgba(255,255,255,0.7)';
  c.fillRect(30, wl + 1, 70, 2);
}

function boatStill(ctx: Ctx): void {
  const [cv, g] = makeCanvas(BOAT.w, BOAT.h);
  boatTex(g);
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.drawImage(cv, BH.boat.x - BOAT.w * 0.25, BH.horizon + 2 - BOAT.h * 0.4, BOAT.w * 0.5, BOAT.h * 0.5);
  ctx.restore();
}

/** A gull in flight seen across the sky (centred at x, y, size s; phase 0…1 is one wingbeat, glide 0…1): each wing
 * an arm out to the wrist and a hand out to the black tip, the hand lagging the arm (trailing up on the downstroke,
 * folding down on the upstroke); gliding, the wings hold the gull's M: arms raised, hands angled down. Its head turned
 * towards where it's flying (left). */
function gullFrame(c: Ctx, x: number, y: number, s: number, ph: number, glide = 0): void {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  const e = Math.cos(ph * P2);
  const fl = 1 - glide;
  const arm = (-0.2 - 0.85 * e) * fl + -0.38 * glide;
  const bend = (0.25 + 0.55 * Math.sin(ph * P2)) * fl + 0.8 * glide;
  for (const sd of [-1, 1]) {
    const sx = sd * 5;
    const wx = sx + sd * Math.cos(arm) * 28;
    const wy = Math.sin(arm) * 28;
    const ha = arm + bend;
    const tx = wx + sd * Math.cos(ha) * 34;
    const ty = wy + Math.sin(ha) * 34;
    // the trailing edge sweeps back behind the leading edge
    const pts: [number, number][] = [[sx, -3], [wx, wy - 2], [tx, ty], [wx + sd * 4, wy + 8], [sx + sd * 6, 7]];
    const p = polyPath(pts);
    p(c);
    const g = c.createLinearGradient(sx, 0, tx, 0);
    g.addColorStop(0, '#e4e8ee');
    g.addColorStop(0.62, '#c8d0da');
    g.addColorStop(0.8, '#2a2c34');
    g.addColorStop(1, '#16181c');
    c.fillStyle = g;
    c.fill();
    c.strokeStyle = 'rgba(40,44,60,0.7)';
    c.lineWidth = 1.4;
    c.stroke();
    // the white trailing edge
    c.strokeStyle = 'rgba(255,255,255,0.8)';
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(sx + sd * 6, 6);
    c.lineTo(wx + sd * 4, wy + 7);
    c.stroke();
  }
  // the body, the head turned to the left, the yellow bill
  c.fillStyle = '#f4f6f8';
  c.beginPath();
  c.ellipse(0, 2, 7, 6, 0, 0, P2);
  c.fill();
  c.strokeStyle = 'rgba(40,44,60,0.7)';
  c.lineWidth = 1.3;
  c.stroke();
  c.fillStyle = '#f8f8fa';
  c.beginPath();
  c.ellipse(-6, -2, 4.5, 4, 0, 0, P2);
  c.fill();
  c.stroke();
  c.fillStyle = '#f4c838';
  c.beginPath();
  c.moveTo(-10, -2.5);
  c.lineTo(-15, -1);
  c.lineTo(-10, 0);
  c.closePath();
  c.fill();
  c.fillStyle = '#101010';
  c.fillRect(-8, -3.5, 1.4, 1.4);
  c.restore();
}

/** Gulls in the still: two gliding over the sea. */
function gullsStill(ctx: Ctx): void {
  for (const [x, y, s] of [[860, 262, 0.42], [930, 286, 0.32]] as const) gullFrame(ctx, x, y, s, 0, 1);
}

/** Paint a frame in screen coordinates (its box), graded as the still is, into a sheet's frame at scale k. */
function graded(c: Ctx, b: { x: number; y: number; w: number; h: number }, k: number, paint: (g: Ctx) => void): void {
  const [cv, g] = makeCanvas(b.w * k, b.h * k);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.scale(k, k);
  g.translate(-b.x, -b.y);
  paint(g);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.scale(k, k);
  g.translate(-b.x, -b.y);
  grade(g);
  c.drawImage(cv, 0, 0);
}

// ——— the scene ———

/** The live skies start under the eave and stop at the horizon; the evening sea stops short of the sand (anything
 * still that overlaps a moving or live-only layer has to be baked into an overlay over it). */
const SKY_BOX = { x: 0, y: SKY_TOP, w: W, h: BH.horizon - SKY_TOP };
const SAND_Y = 594;
const SEA_EVE = { x: 0, y: BH.horizon, w: W, h: SAND_Y - BH.horizon };
const SEA_LIFE = { x: 0, y: 380, w: W, h: SAND_Y - 380 };
const SURF_BOX = { x: 0, y: SURF.y0, w: W, h: SURF.h };
const CROWN_BOX = { x: 0, y: 0, w: W, h: 500 };
const SIGN_BOX = { x: BH.sign.x - 300, y: SIGN.ropeTop - 6, w: 600, h: BH.sign.y + SIGN.h / 2 + 24 - SIGN.ropeTop + 6 };
const FLAG = { w: 44, h: 26, n: 8, x: BH.castle.x, y: BH.castle.y - 162 };
const FLAG_BOX = { x: FLAG.x - 2, y: FLAG.y - 4, w: FLAG.w + 4, h: FLAG.h + 6 };
const BAR_BOX = { x: 0, y: TY, w: W, h: BH.front - TY };

export const BEACH: SceneSpec = {
  id: 'beach',
  info: {
    name: 'Shack Attack Beach Bar',
    subtitle: 'Waves 11–14',
    ambient: [],
    glows: [{ x: BH.sun.x, y: BH.sun.y, r: 380, color: '#ffd890', flicker: 0.03 }],
    light: '#ffe0b0',
    tableTint: '#fff2e0',
  },
  layers: [
    { id: 'sky', box: { x: 0, y: 0, w: W, h: BH.horizon + 4 }, draw: sky },
    { id: 'sunset', box: SKY_BOX, liveOnly: true, res: 0.5, draw: sunsetSky },
    { id: 'dusk', box: SKY_BOX, liveOnly: true, res: 0.5, draw: duskSky },
    // the night's dark, stars and moon, and the gulls
    { id: 'skyLife', box: SKY_BOX, motion: 'slot', draw: () => {} },
    { id: 'gullsStill', stillOnly: true, draw: gullsStill },
    { id: 'sea', box: { x: 0, y: BH.horizon, w: W, h: BH.shore + 14 - BH.horizon }, draw: sea },
    { id: 'seaEve', box: SEA_EVE, liveOnly: true, res: 0.6, draw: seaEve },
    // the swells running in, the glitter on them, the boat and the swimmer
    { id: 'seaLife', box: SEA_LIFE, motion: 'slot', draw: () => {} },
    { id: 'glitterStill', stillOnly: true, draw: glitterStill },
    { id: 'boatStill', stillOnly: true, draw: boatStill },
    { id: 'shore', box: { x: 0, y: SAND_Y, w: W, h: TY + 4 - SAND_Y }, draw: shore },
    { id: 'longShadows', box: { x: 0, y: SAND_Y, w: W, h: TY - SAND_Y }, motion: 'sprite', res: 0.5, draw: longShadows },
    { id: 'surf', box: SURF_BOX, motion: 'slot', draw: () => {} },
    { id: 'surfStill', stillOnly: true, draw: surfStill },
    // the beachcomber on the tide line
    { id: 'walk', box: { x: 0, y: 520, w: W, h: 150 }, motion: 'slot', draw: () => {} },
    { id: 'castle', box: { x: BH.castle.x - 130, y: BH.castle.y - 170, w: 290, h: 196 }, draw: sandcastle },
    { id: 'flag', box: FLAG_BOX, motion: 'slot', draw: () => {} },
    { id: 'flagStill', stillOnly: true, draw: (c) => (c.translate(FLAG.x - 2, FLAG.y - 2), flagFrame(c, 0.3)) },
    { id: 'umbrella', box: { x: BH.umbrella.x - 180, y: BH.umbrella.y - 206, w: 380, h: 250 }, draw: umbrella },
    // (each trunk in three tight pieces: a diagonal in one box would bake mostly empty canvas)
    ...trunkLayers('trunkL', BH.palmL, 501),
    ...trunkLayers('trunkR', BH.palmR, 503),
    { id: 'torch', box: { x: BH.torch.x - 40, y: BH.torch.y - 380, w: 170, h: 380 }, draw: torch },
    // the fronds: every one a painted sheet of bends (the still paints them at rest)
    { id: 'crowns', box: CROWN_BOX, motion: 'slot', draw: () => {} },
    { id: 'crownsStill', stillOnly: true, draw: (c) => (crownStill(c, BH.palmL, 1), crownStill(c, BH.palmR, -1)) },
    { id: 'heartL', box: { x: BH.palmL.tx - 70, y: BH.palmL.ty - 50, w: 140, h: 190 }, draw: (c, r) => crownHeart(c, r, BH.palmL, 1) },
    { id: 'heartR', box: { x: BH.palmR.tx - 70, y: BH.palmR.ty - 50, w: 140, h: 190 }, draw: (c, r) => crownHeart(c, r, BH.palmR, -1) },
    { id: 'postL', box: { x: 0, y: 0, w: 130, h: TY }, draw: (c, r) => bamboo(c, r, -10, 0, TY, 74) },
    { id: 'postR', box: { x: 1660, y: 0, w: W - 1660, h: TY }, draw: postR },
    { id: 'thatch', box: { x: 0, y: 0, w: W, h: BH.thatch + 76 }, draw: thatch },
    { id: 'lights', box: { x: 0, y: EAVE.y + EAVE.h - 4, w: W, h: 56 }, draw: lights },
    { id: 'sign', box: SIGN_BOX, motion: 'sprite', draw: sign },
    { id: 'table', box: { x: 0, y: TY, w: W, h: 1080 - TY }, draw: table },
    { id: 'drink', box: { x: 70, y: TY - 120, w: 160, h: 180 }, draw: drink },
    { id: 'barRight', box: { x: 1640, y: TY - 120, w: W - 1640, h: 200 }, draw: barRight },
    // the low sun on the bar top (wave 1; live, an additive sprite that fades with the sun)
    { id: 'sunOnBarStill', stillOnly: true, draw: sunOnBar },
    { id: 'sunOnBar', box: BAR_BOX, liveOnly: true, res: 0.35, draw: (c) => (c.globalCompositeOperation = 'source-over', sunOnBarLight(c)) },
    // the bar's lights on the bar top (live only, added: they come up from sunset)
    { id: 'lightsGlow', box: { x: 0, y: TY - 20, w: W, h: BH.front - TY + 20 }, liveOnly: true, res: 0.33, draw: lightsGlow },
    // washes, flames, glows, sparks: over everything
    { id: 'fx', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

/** The sun on the bar as a light layer of its own (for the live sprite: laid on a clear canvas). */
function sunOnBarLight(ctx: Ctx): void {
  ctx.save();
  sunOnBar(ctx);
  ctx.restore();
}

// ——— live ———

const ramp = (v: number, a: number, b: number) => clamp01((v - a) / (b - a));
const tintOf = (a: number, b: number, t: number): number => {
  const ch = (s: number) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * clamp01(t));
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};

/** A frond's two images, cross-fading between neighbouring bends. */
class Frond {
  readonly a: Phaser.GameObjects.Image;
  readonly b: Phaser.GameObjects.Image;
  readonly s: Spring;
  constructor(k: KitLive, key: string, x: number, y: number, origin: [number, number], sx: number, sy: number, readonly rot: number, readonly sigma: number, readonly i: number, into: Phaser.GameObjects.Container, tint: number) {
    const mk = () => {
      const im = k.sc.add.image(x, y, key, 0).setOrigin(...origin).setScale(sx, sy).setRotation(rot).setTint(tint);
      into.add(im);
      return im;
    };
    this.a = mk();
    this.b = mk();
    this.s = new Spring(0, 9 + (i % 3) * 2.5, 1.5);
  }
  /** Show the frond at bend b (-1…1), turned by dr (radians, screen). */
  show(b: number, dr: number): void {
    const f = ((Phaser.Math.Clamp(b, -1, 1) + 1) / 2) * (BENDS - 1);
    const i = Math.min(BENDS - 2, Math.floor(f));
    const u = f - i;
    this.a.setFrame(i).setRotation(this.rot + dr);
    this.b.setFrame(i + 1).setAlpha(u).setRotation(this.rot + dr);
  }
}

registerKitScene(BEACH, (k, wave0) => {
  const fx = k.slot('fx');
  let kw = waveK(wave0);
  let shown = kw;
  const flashes = () => save.settings.flashes && !save.settings.reducedMotion;
  // the light over everything: warm at sunset, violet at dusk, the night's deep blue (the lights go on over them)
  const warm = k.wash(0xffa070, 0, Phaser.BlendModes.MULTIPLY, fx);
  const violet = k.wash(0x9a80c0, 0, Phaser.BlendModes.MULTIPLY, fx);
  const night = k.wash(0x2c3470, 0, Phaser.BlendModes.MULTIPLY, fx);

  // ——— the sky: the sunset and dusk skies cross-fade over the afternoon's; night darkens the dusk sky, the stars
  // come out and twinkle, the moon rises over the sea
  const sunsetS = k.sprite('sunset');
  const seaEveS = k.sprite('seaEve');
  const duskS = k.sprite('dusk');
  const skyLife = k.slot('skyLife');
  const nightKey = k.tex('bh_nightsky', 4, 128, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, '#30305a');
    g.addColorStop(0.7, '#6a6a98');
    g.addColorStop(1, '#8a86b0');
    c.fillStyle = g;
    c.fillRect(0, 0, 4, 128);
  });
  const nightSky = k.img(nightKey, 0, SKY_TOP, { into: skyLife, origin: [0, 0], alpha: 0 }).setDisplaySize(W, BH.horizon - SKY_TOP).setBlendMode(Phaser.BlendModes.MULTIPLY);
  const starKey = k.tex('bh_star', 16, 16, (c) => {
    const g = c.createRadialGradient(8, 8, 0, 8, 8, 8);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,250,235,0.7)');
    g.addColorStop(1, 'rgba(255,250,235,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 16, 16);
  });
  const starR = rng(515);
  const starList = Array.from({ length: 130 }, (_, i) => {
    const t = starR() ** 1.3;
    const big = starR() < 0.1;
    return {
      img: k.img(starKey, starR() * W, SKY_TOP + 6 + t * (BH.horizon - SKY_TOP - 70), { into: skyLife, add: true, alpha: 0, scale: big ? 0.8 : 0.3 + starR() * 0.3 }),
      a: (big ? 1 : 0.4 + starR() * 0.5) * (1 - t * 0.6),
      seed: starR() * 20,
      sp: 0.6 + starR() * 2.4,
      early: i < 30,
    };
  });
  // the moon (over the washes: nothing stands in front of it), a near-full moon with its maria, lit a little more on
  // its left, a cool halo in the haze round it
  const moonKey = k.tex('bh_moon', 80, 80, (c) => {
    const { r } = BH.moon;
    const g = c.createRadialGradient(34, 36, 2, 40, 40, r);
    g.addColorStop(0, '#fffcf4');
    g.addColorStop(0.75, '#f6eedc');
    g.addColorStop(1, '#d8ccbc');
    c.fillStyle = g;
    c.beginPath();
    c.arc(40, 40, r, 0, P2);
    c.fill();
    c.fillStyle = 'rgba(140,140,165,0.3)';
    for (const [mx, my, mr] of [[32, 32, 8], [48, 36, 7], [40, 52, 6], [28, 46, 4], [50, 50, 3]] as const) {
      c.beginPath();
      c.arc(mx, my, mr, 0, P2);
      c.fill();
    }
    // the terminator's soft shade on its right limb
    const t = c.createLinearGradient(40 + r * 0.2, 0, 40 + r, 0);
    t.addColorStop(0, 'rgba(60,60,100,0)');
    t.addColorStop(1, 'rgba(60,60,100,0.35)');
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = t;
    c.fillRect(0, 0, 80, 80);
  });
  const moonHaze = k.glow(BH.moon.x, BH.moon.y, 260, 0x8a9ad8, 0, { into: fx });
  const moonHalo = k.glow(BH.moon.x, BH.moon.y, 80, 0xe8eeff, 0, { into: fx });
  const moon = k.img(moonKey, BH.moon.x, BH.moon.y, { into: fx, alpha: 0 });

  // ——— gulls: a few crossing on flap-and-glide cycles (painted wingbeats)
  const GULL_S = 0.62;
  const gfw = Math.ceil(144 * GULL_S);
  const gfh = Math.ceil(150 * GULL_S);
  const gullKey = sheet(k, 'bh_gull', gfw, gfh, 9, (c, _ph, i) => gullFrame(c, gfw / 2, gfh / 2, GULL_S, i < 8 ? i / 8 : 0, i < 8 ? 0 : 1));
  type Gull = { loop: Loop; x: number; y: number; vx: number; s: number; glide: number; flap: number; seed: number; scare: number };
  const gulls: Gull[] = Array.from({ length: 3 }, (_, i) => {
    const loop = new Loop(k, gullKey, 8, -200, 0, { into: skyLife, fps: 9, phase: i * 2.6 });
    return { loop, x: -200, y: 0, vx: 0, s: 1, glide: 0, flap: 1 + i * 0.4, seed: i * 1.9, scare: 0 };
  });
  let flockT = 2 + crand() * 4;
  let flockOn = false;
  const launchFlock = () => {
    const dir = crand() < 0.5 ? 1 : -1;
    flockOn = true;
    gulls.forEach((g, i) => {
      g.s = 0.55 + crand() * 0.35 - i * 0.08;
      g.x = dir > 0 ? -80 - i * (60 + crand() * 80) : W + 80 + i * (60 + crand() * 80);
      g.y = 230 + crand() * 90 + i * 14;
      g.vx = dir * (70 + crand() * 30) * (0.7 + g.s * 0.5);
    });
  };

  // ——— the sea: swells running in (painted crests), the glitter painted on them for the sun and for the moon, the
  // sailboat, a swimmer
  const seaLife = k.slot('seaLife');
  // after sunset the shallows lose their turquoise (nothing lights them from below): a multiply darkening the sea
  // towards the beach, deep blue-teal by night
  const seaShadeKey = k.tex('bh_seashade', 4, 64, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 64);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.4, '#d0d0e4');
    g.addColorStop(1, '#4a5a86');
    c.fillStyle = g;
    c.fillRect(0, 0, 4, 64);
  });
  const seaShade = k.img(seaShadeKey, 0, BH.horizon, { into: seaLife, origin: [0, 0], alpha: 0 }).setDisplaySize(W, 604 - BH.horizon).setBlendMode(Phaser.BlendModes.MULTIPLY);
  const SW = 640;
  const SH = 40;
  const swellKey = sheet(k, 'bh_swell', SW, SH, 3, (c, _p, i) => swellStrip(c, SW, SH, i));
  const swells = Array.from({ length: 7 }, (_, i) => ({
    img: k.img(swellKey, 960, BH.horizon, { into: seaLife }).setFrame(i % 3).setAlpha(0),
    u: i / 7,
    dx: (crand() - 0.5) * 400,
  }));
  const glitKey = sheet(k, 'bh_glitter', GLIT.w * GLIT.res, GLIT.h * GLIT.res, GLIT.n, (c, ph) => {
    c.scale(GLIT.res, GLIT.res);
    glitterFrame(c, ph);
  });
  const sunGlit = new Loop(k, glitKey, GLIT.n, BH.sun.x, BH.horizon + 1, { into: seaLife, add: true, origin: [0.5, 0], fps: 5, scale: 1 / GLIT.res, tint: 0xfff0c0 });
  // (the moon's path over the washes too: a long broken path of glints from the horizon to the surf)
  const moonGlits = [5, 9].map((phase) => new Loop(k, glitKey, GLIT.n, BH.moon.x, BH.horizon + 1, { into: fx, add: true, origin: [0.5, 0], fps: 4, scale: 1 / GLIT.res, tint: 0xd8e4ff, phase }));
  const boatKey = k.tex('bh_boat', BOAT.w, BOAT.h, boatTex);
  const boat = k.img(boatKey, BH.boat.x, BH.horizon + 2, { into: seaLife, origin: [0.5, 0.8], scale: 0.5, alpha: 0.9 });
  const mastLight = k.glow(BH.boat.x, BH.horizon - 60, 10, 0xffe8b0, 0, { into: seaLife });
  const swimKey = sheet(k, 'bh_swim', SWIM.w, SWIM.h, SWIM.n, (c, ph) => swimFrame(c, ph));
  const swim = new Loop(k, swimKey, SWIM.n, 700, BH.shore - 52, { into: seaLife, origin: [0.5, 0.6], fps: 7, scale: SWIM.scale });
  let swimX = 640 + crand() * 300;

  // ——— the surf: the hero, a painted loop on each cusp of the beach; at night the foam glows blue
  const surfSlot = k.slot('surf');
  const surfKey = sheet(k, 'bh_surf', SURF.w * SURF.res, SURF.h * SURF.res, SURF.n, (c, ph) => graded(c, { x: SURF_X0, y: SURF.y0, w: SURF.w, h: SURF.h }, SURF.res, (g) => surfFrame(g, ph)));
  const surfs = CUSPS.map((s) => {
    const sx = (s.flip ? -1 : 1) / SURF.res;
    const loop = new Loop(k, surfKey, SURF.n, 960 + s.dx, SURF.y0, { into: surfSlot, origin: [0.5, 0], sx, sy: 1 / SURF.res, fps: 1.6, phase: ((0.5 + s.lag) % 1) * SURF.n });
    const glow = new Loop(k, surfKey, SURF.n, 960 + s.dx, SURF.y0, { into: surfSlot, add: true, origin: [0.5, 0], sx, sy: 1 / SURF.res, fps: 1.6, tint: 0x40e8ff, phase: ((0.5 + s.lag) % 1) * SURF.n });
    return { loop, glow };
  });
  let surge = 0;

  // ——— the long shadows, and the sun on the bar
  const shadows = k.sprite('longShadows');
  const sunBar = k.sprite('sunOnBar').setBlendMode(Phaser.BlendModes.ADD);

  // ——— the beachcomber walking the tide line (her frames stepped by distance, so her feet don't slide)
  const walkSlot = k.slot('walk');
  const WR = 0.7;
  const walkKey = sheet(k, 'bh_walk', WALK.w * WR, WALK.h * WR, WALK.n, (c, ph) => {
    c.scale(WR, WR);
    walkerFrame(c, ph);
  });
  const walker = k.img(walkKey, -100, 0, { into: walkSlot, origin: [0.5, WALK.ground / WALK.h], scale: WALK.scale / WR });
  walker.setVisible(false);
  let walkDir = 1;
  let walkDist = 0;
  let walkNext = 3 + crand() * 6;
  let walking = false;

  // ——— the castle's flag
  const flagKey = sheet(k, 'bh_flag', FLAG.w, FLAG.h, FLAG.n, (c, ph) => flagFrame(c, ph));
  const flag = new Loop(k, flagKey, FLAG.n, FLAG.x - 2, FLAG.y - 2, { into: k.slot('flag'), origin: [0, 0], fps: 8 });

  // ——— the palms: every frond on its own spring, the breeze rippling through each crown; stomps whip them
  const crowns = k.slot('crowns');
  const FR = 0.7;
  const frondKeys = {} as Record<FrondKind, { key: string; fw: number; fh: number; ox: number; oy: number }>;
  for (const kind of ['high', 'mid', 'low'] as FrondKind[]) {
    const fr = frondFrame(kind);
    const key = sheet(k, `bh_frond_${kind}`, fr.w * FR, fr.h * FR, BENDS, (c, _ph, i) => {
      const [cv, g] = makeCanvas(fr.w, fr.h);
      g.translate(fr.ox, fr.oy);
      paintFrond(g, kind, bendOf(i));
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.translate(BH.palmL.tx - fr.ox, BH.palmL.ty - fr.oy);
      grade(g);
      c.scale(FR, FR);
      c.drawImage(cv, 0, 0);
    });
    frondKeys[kind] = { key, fw: fr.w, fh: fr.h, ox: fr.ox, oy: fr.oy };
  }
  const fronds: Frond[] = [];
  for (const [p, flip] of [[BH.palmL, 1], [BH.palmR, -1]] as const)
    CROWN.forEach((f, i) => {
      const fk = frondKeys[f.k];
      const sigma = f.side * flip;
      const tint = tintOf(0xffffff, 0x8a8a9a, f.dark * 2);
      fronds.push(new Frond(k, fk.key, p.tx + f.dx * flip, p.ty + f.dy, [fk.ox / fk.fw, fk.oy / fk.fh], (sigma * f.s) / FR, f.s / FR, f.rot * sigma, sigma, i + (flip < 0 ? 9 : 0), crowns, tint));
    });
  let gust = 0;
  let gustT = 4 + crand() * 5;
  const coconutKey = k.tex('bh_coconut', 28, 28, (c) => {
    const g = c.createRadialGradient(10, 10, 2, 14, 14, 13);
    g.addColorStop(0, '#9a9a40');
    g.addColorStop(1, '#4a4a1a');
    c.fillStyle = g;
    c.beginPath();
    c.arc(14, 14, 12, 0, P2);
    c.fill();
    c.strokeStyle = 'rgba(20,20,6,0.7)';
    c.lineWidth = 1.5;
    c.stroke();
    c.strokeStyle = 'rgba(255,224,150,0.6)';
    c.beginPath();
    c.arc(14, 14, 10, -2.4, -1.2);
    c.stroke();
  });
  type Nut = { img: Phaser.GameObjects.Image; vx: number; vy: number; floor: number; life: number; spin: number };
  const nuts: Nut[] = [];
  const puffs = new Parts(k, { frame: 'puff', into: fx, max: 40 });
  /** What the light does to things drawn over the washes (sand puffs, straw): dimmer and bluer after sunset. */
  let dimTo = 0;
  const dimmed = (col: number) => tintOf(col, 0x2a3060, dimTo);
  const straws = new Parts(k, { frame: 'flake', into: fx, max: 50 });

  // ——— the sign on its ropes
  const signImg = k.pivot(k.sprite('sign'), BH.sign.x, SIGN.ropeTop);
  const signS = new Swing(signImg, { k: 7, c: 0.9, idle: 0.006, seed: 3, speed: 0.7 });
  // the bulbs' warm light on the sign after dark (an additive copy over the washes, swinging with it)
  const signLit = k.sc.add.image(signImg.x, signImg.y, signImg.texture.key).setOrigin(signImg.originX, signImg.originY).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffa860).setAlpha(0);
  fx.add(signLit);

  // ——— the string lights: they flicker on one by one at sunset; the bulbs' halos, their pools on the bar
  const bulbKey = k.tex('bh_bulb', 16, 20, (c) => {
    const g = c.createRadialGradient(8, 11, 0, 8, 10, 8);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.5, '#f8f4ec');
    g.addColorStop(1, '#d8d0c8');
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(8, 10, 5.4, 7.4, 0, 0, P2);
    c.fill();
  });
  const bulbs = BULBS.filter(([x]) => Math.abs(x - BH.sign.x) > 290).map(([x, y, col], i) => {
    const n = parseInt(col.slice(1), 16);
    return {
      img: k.img(bulbKey, x, y, { into: fx, alpha: 0, tint: tintOf(n, 0xffffff, 0.45) }),
      halo: k.glow(x, y + 2, 34, n, 0, { into: fx }),
      wash: k.glow(x, y + 10, 90, tintOf(n, 0xffd8a0, 0.5), 0, { into: fx, sy: 0.7 }),
      th: 0.24 + (((i * 7919) % 23) / 23) * 0.2,
      lit: false,
      catchT: 0,
      seed: i * 1.7,
    };
  });
  const barGlow = k.sprite('lightsGlow').setBlendMode(Phaser.BlendModes.ADD);
  let dip = 0;

  // ——— the tiki torch: lit at dusk, its flame licking in painted frames, embers rising; its light on the sand
  const TF = { w: 60, h: 118, n: 12 };
  const torchKey = sheet(k, 'bh_torch', TF.w, TF.h, TF.n, (c, ph) => flameFrame(c, TF.w, TF.h, ph, ['#e0400c', '#ffa024', '#fff2c0'], 4, 2));
  const tTop = BH.torch.y - BH.torch.h - 40;
  const torchFlame = new Loop(k, torchKey, TF.n, BH.torch.x, tTop + 6, { into: fx, add: true, origin: [0.5, 1], fps: 13 });
  const torchHalo = k.glow(BH.torch.x, tTop - 30, 170, 0xff9a3a, 0, { into: fx });
  const torchSand = k.glow(BH.torch.x + 10, TY - 30, 260, 0xff8a3a, 0, { into: fx, sy: 0.3 });
  // its reflection on the water: a narrow column of glitter under it
  const torchGlit = new Loop(k, glitKey, GLIT.n, BH.torch.x, BH.shore - 8, { into: seaLife, add: true, origin: [0.5, 1], fps: 6, sx: 0.16 / GLIT.res, sy: 0.6 / GLIT.res, tint: 0xff9a40, phase: 3 });
  const embers = new Parts(k, { frame: 'ember', add: true, into: fx, max: 60 });
  const emberRate = new Rate();
  let flare = 0;
  // the lantern's candle
  const LF = { w: 16, h: 30, n: 12 };
  const lanternKey = sheet(k, 'bh_lantern', LF.w, LF.h, LF.n, (c, ph) => flameFrame(c, LF.w, LF.h, ph, ['#e06010', '#ffb030', '#fff8d8'], 2, 5));
  const lanternFlame = new Loop(k, lanternKey, LF.n, BH.lantern.x, BH.lantern.y - 44, { into: fx, add: true, origin: [0.5, 1], fps: 12 });
  const lanternHalo = k.glow(BH.lantern.x, BH.lantern.y - 48, 90, 0xffb050, 0, { into: fx });

  return {
    setWave: (w) => (kw = waveK(w)),
    impact(x, _y, power) {
      const near = (hx: number, reach = 1200) => Math.max(0.2, 1 - Math.abs(x - hx) / reach);
      for (const f of fronds) {
        const px = f.i < 9 ? BH.palmL.tx : BH.palmR.tx;
        f.s.v += (crand() < 0.5 ? -1 : 1) * (6 + crand() * 4) * power * near(px) * calm();
      }
      signS.kick((x < BH.sign.x ? 1 : -1) * 0.5 * power * near(BH.sign.x));
      for (const g of gulls) g.scare = 1;
      flare = Math.min(1.4, flare + power * 0.8);
      dip = Math.max(dip, power * 0.35);
      surge = Math.min(1, surge + power * 0.25);
      // straw shaken out of the fringe over the stomp
      for (let i = 0; i < 3 + power * 10; i++)
        straws.spawn({ x: x + (crand() - 0.5) * 400, y: BH.thatch + 30 + crand() * 30, vx: (crand() - 0.5) * 30, vy: 20 + crand() * 40, life: 2 + crand() * 1.5, r0: 3, r1: 2.4, a: 0.8, tint: dimmed(0xd8b070), grav: 60, drag: 1.4, spin: (crand() - 0.5) * 6, fade: 0.05 });
      // a hard one knocks a coconut out of the nearer palm
      if (power > 0.75 && nuts.length < 2 && crand() < 0.4) {
        const p = x < 960 ? BH.palmL : BH.palmR;
        const img = k.img(coconutKey, p.tx + (crand() - 0.5) * 30, p.ty + 24, { into: k.slot('crowns') });
        nuts.push({ img, vx: (p === BH.palmL ? 1 : -1) * (40 + crand() * 60), vy: -60, floor: TY - 12 - crand() * 10, life: 7, spin: (crand() - 0.5) * 8 });
      }
    },
    update(dt, t) {
      shown += (kw - shown) * Math.min(1, dt * 0.6);
      const s = shown;
      const eve = Phaser.Math.Easing.Sine.InOut(ramp(s, 0.03, 0.33));
      const dk = Phaser.Math.Easing.Sine.InOut(ramp(s, 0.38, 0.67));
      const nt = Phaser.Math.Easing.Sine.InOut(ramp(s, 0.72, 1));
      dimTo = dk * 0.35 + nt * 0.4;
      // ——— the light
      sunsetS.setAlpha(eve);
      seaEveS.setAlpha(eve);
      seaShade.setAlpha(Math.min(1, dk * 0.8 + nt * 0.4));
      duskS.setAlpha(dk);
      warm.setAlpha(0.22 * eve * (1 - dk));
      violet.setAlpha(0.5 * dk * (1 - nt * 0.3));
      night.setAlpha(0.62 * nt);
      nightSky.setAlpha(nt);
      shadows.setAlpha(1 - ramp(s, 0.12, 0.45));
      sunBar.setAlpha(1 - ramp(s, 0.36, 0.52));
      sunBar.setTint(tintOf(0xffffff, 0xffc080, eve));
      // stars: a few at dusk, the sky full of them at night, each twinkling
      for (const st of starList) {
        const show = st.early ? dk * 0.55 + nt * 0.45 : nt;
        const tw = 0.65 + 0.35 * Math.sin(t * st.sp + st.seed) * Math.sin(t * st.sp * 0.37 + st.seed * 2);
        st.img.setAlpha(show * st.a * tw);
      }
      moon.setAlpha(nt);
      moonHalo.setAlpha(nt * 0.35);
      moonHaze.setAlpha(nt * 0.16);
      // ——— gulls (by day and at sunset; fewer at dusk; none at night)
      flockT -= dt;
      if (!flockOn && flockT < 0 && nt < 0.5) {
        if (crand() < 1 - dk * 0.6) launchFlock();
        else flockT = 8;
      }
      if (flockOn) {
        let away = 0;
        for (const g of gulls) {
          g.scare = Math.max(0, g.scare - dt * 0.6);
          g.glide -= dt;
          if (g.glide < -g.flap) g.glide = 1.2 + crand() * 2.2;
          const gliding = g.glide > 0 && g.scare < 0.3;
          g.x += g.vx * (1 + g.scare * 0.6) * dt;
          g.y += (Math.sin(t * 0.7 + g.seed) * 8 - (gliding ? -6 : 10 + g.scare * 30)) * dt;
          const sc = g.s * (g.vx > 0 ? -1 : 1);
          if (gliding) {
            g.loop.a.setFrame(8).setAlpha(1);
            g.loop.b.setAlpha(0);
          } else g.loop.step(dt, 1 + g.scare);
          g.loop.each((im) => im.setPosition(g.x, g.y).setScale(sc, g.s).setRotation((g.vx > 0 ? 1 : -1) * (gliding ? 0.04 : -0.06)));
          if (g.x < -260 || g.x > W + 260) away++;
        }
        if (away === gulls.length) {
          flockOn = false;
          flockT = 10 + crand() * 12;
        }
      }
      // ——— the sea
      for (const sw of swells) {
        sw.u += (dt / 17) * calm();
        if (sw.u >= 1) {
          sw.u -= 1;
          sw.dx = (crand() - 0.5) * 400;
          sw.img.setFrame(Math.floor(crand() * 3) % 3);
        }
        const u = sw.u;
        const y = BH.horizon + 4 + u ** 1.7 * (BH.shore - 70 - BH.horizon);
        sw.img.setPosition(960 + sw.dx * (1 - u), y).setScale(2.2 + u * 0.4, 0.1 + u * 0.75).setAlpha(Math.sin(u * Math.PI) * (0.5 - nt * 0.25));
      }
      const sunX = Phaser.Math.Linear(BH.sun.x, BH.sunset.x, eve);
      sunGlit.step(dt);
      sunGlit.alpha = (1 - dk) * (0.85 + eve * 0.1);
      sunGlit.each((im) => im.setX(sunX).setScale((0.72 + eve * 0.3) / GLIT.res, 1 / GLIT.res).setTint(tintOf(0xfff0c0, 0xffa050, eve)));
      for (const [i, mg] of moonGlits.entries()) {
        mg.step(dt);
        mg.alpha = nt * (0.55 - i * 0.15);
        mg.each((im) => im.setScale((0.22 + i * 0.08) / GLIT.res, 1 / GLIT.res));
      }
      boat.x = BH.boat.x + Math.sin(t * 0.012 + 1) * 260;
      boat.y = BH.horizon + 2 + Math.sin(t * 1.1) * 1.2;
      boat.setRotation(Math.sin(t * 0.8) * 0.05 + Math.sin(t * 1.9 + 1) * 0.02 - 0.04);
      mastLight.setPosition(boat.x + Math.sin(boat.rotation) * 70, boat.y - 72).setAlpha(dk * 0.9);
      // the swimmer, by day
      swimX += dt * 9;
      if (swimX > 1500) swimX = 560;
      const swimA = 1 - ramp(s, 0.3, 0.5);
      swim.step(dt);
      swim.alpha = swimA * Math.min(1, (swimX - 560) / 60, (1500 - swimX) / 60);
      swim.each((im) => im.setPosition(swimX, BH.shore - 50 + Math.sin(t * 1.3) * 1.5));
      // ——— the surf
      surge = Math.max(0, surge - dt * 0.3);
      for (const sf of surfs) {
        sf.loop.step(dt * calm(), 1 + surge);
        sf.glow.step(dt * calm(), 1 + surge);
        sf.glow.alpha = nt * 0.45;
        sf.loop.each((im) => im.setTint(tintOf(0xffffff, 0x7080b0, dk * 0.5 + nt * 0.3)));
      }
      // ——— the walker
      walkNext -= dt;
      if (!walking && walkNext < 0 && s < 0.8) {
        walking = true;
        walkDir = -walkDir;
        walker.setVisible(true).setFlipX(walkDir < 0);
        walker.x = walkDir > 0 ? -60 : W + 60;
      }
      if (walking) {
        walker.x += walkDir * WALK.speed * dt;
        walkDist += WALK.speed * dt;
        walker.y = shoreTop(walker.x) + 24;
        walker.setFrame(Math.floor((walkDist / WALK.cycle) * WALK.n) % WALK.n);
        if (walker.x < -80 || walker.x > W + 80) {
          walking = false;
          walker.setVisible(false);
          walkNext = 14 + crand() * 16;
        }
      }
      flag.step(dt, 0.8 + gust * 0.8);
      // ——— the palms: a breeze off the sea, gusting now and then; it ripples through each crown
      gustT -= dt;
      if (gustT < 0) {
        gust = 0.6 + crand() * 0.6;
        gustT = 6 + crand() * 8;
      }
      gust = Math.max(0, gust - dt * 0.35);
      for (const f of fronds) {
        const lag = f.i * 0.11;
        const wind = (0.35 + 0.25 * wander(t - lag, 1.3, 0.5) + gust * Math.max(0, Math.sin((t - lag) * 2.2))) * calm();
        const flut = Math.sin(t * 3.1 + f.i * 1.7) * 0.12 * wind;
        const x = f.s.step(f.sigma * wind * 0.75 + flut, dt);
        f.show(x, wind * 0.05 + x * 0.11 * f.sigma);
      }
      for (let i = nuts.length - 1; i >= 0; i--) {
        const n = nuts[i];
        n.vy += 900 * dt;
        n.img.x += n.vx * dt;
        n.img.y += n.vy * dt;
        n.img.rotation += n.spin * dt;
        if (n.img.y > n.floor && n.vy > 0) {
          if (n.vy > 150) for (let j = 0; j < 6; j++) puffs.spawn({ x: n.img.x + (crand() - 0.5) * 16, y: n.floor + 8, vx: (crand() - 0.5) * 60, vy: -20 - crand() * 30, life: 0.8, r0: 6, r1: 14, a: 0.4, tint: dimmed(0xe8d0a0), drag: 2, fade: 0.1 });
          n.img.y = n.floor;
          n.vy = -n.vy * 0.3;
          n.vx *= 0.6;
          n.spin *= 0.6;
        }
        n.life -= dt;
        n.img.setAlpha(Math.min(1, n.life));
        if (n.life <= 0) {
          n.img.destroy();
          nuts.splice(i, 1);
        }
      }
      puffs.update(dt);
      straws.update(dt);
      signS.update(dt, t);
      signLit.setRotation(signImg.rotation).setAlpha((dk * 0.2 + nt * 0.22) * (1 - dip * 0.5));
      // ——— the bar's lights: flickering on one by one as the sun sets, carrying the bar by night
      dip = Math.max(0, dip - dt * 1.5);
      for (const b of bulbs) {
        const want = s > b.th;
        if (want !== b.lit) {
          b.lit = want;
          b.catchT = want ? 0.7 : 0;
        }
        b.catchT = Math.max(0, b.catchT - dt);
        // (catching: it sputters a moment before it holds; a flicker, not a strobe, without flashes)
        const sputter = b.catchT > 0 ? (flashes() ? (Math.sin(t * 37 + b.seed) > 0 ? 1 : 0.25) : 1 - b.catchT) : 1;
        const lvl = (b.lit ? 1 : 0) * sputter * (1 - dip * (0.6 + 0.4 * Math.sin(b.seed)));
        b.img.setAlpha(lvl);
        b.halo.setAlpha(lvl * (0.32 + dk * 0.25 + nt * 0.2));
        b.wash.setAlpha(lvl * (0.04 + dk * 0.06 + nt * 0.06));
      }
      barGlow.setAlpha(ramp(s, 0.26, 0.45) * (0.4 + dk * 0.3 + nt * 0.3) * (1 - dip * 0.5));
      // ——— the torch: lit at dusk (it catches, sputters up), roaring by night
      flare = Math.max(0, flare - dt * 0.9);
      const lit = ramp(s, 0.5, 0.62);
      const fn = flicker(t, 2);
      torchFlame.step(dt, 1 + flare * 0.6);
      torchFlame.alpha = lit;
      torchFlame.each((im) => im.setScale(0.85 + lit * 0.15 + flare * 0.15).setRotation(wander(t, 4, 0.6) * 0.06 * calm()));
      torchHalo.setAlpha(lit * (0.32 + fn * 0.12 + nt * 0.12 + flare * 0.15));
      torchSand.setAlpha(lit * (0.2 + nt * 0.2) * fn);
      torchGlit.step(dt);
      torchGlit.alpha = lit * (0.4 + nt * 0.5) * fn;
      emberRate.tick(lit * (1.5 + flare * 10) * calm(), dt, () =>
        embers.spawn({ x: BH.torch.x + (crand() - 0.5) * 14, y: tTop - 30 - crand() * 20, vx: 12 + crand() * 22, vy: -50 - crand() * 50 - flare * 60, life: 1.4 + crand(), r0: 2.2, r1: 0.6, a: 0.9, tint: crand() < 0.6 ? 0xffb040 : 0xff7020, grav: -20, drag: 0.5, streak: 0.02, fade: 0.1 }),
      );
      embers.update(dt);
      const ll = ramp(s, 0.45, 0.6);
      lanternFlame.step(dt);
      lanternFlame.alpha = ll;
      lanternHalo.setAlpha(ll * (0.3 + flicker(t * 0.8, 6) * 0.1 + nt * 0.25));
    },
  };
});
