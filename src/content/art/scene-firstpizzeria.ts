// The First Pizzeria (Stage 20, the last stage of Act 10, the finale; waves 96–99), redrawn with the location kit
// (src/art/scene). (The old art is kept in scenes-act10.ts for the before/after page.)
//
// The very first pizzeria, at the dawn of time: a humble open-air place on a rise above a primeval river valley, in
// the last hour before the first sunrise. A long, low dry-stone wall runs across the back, capped with a coping of
// stones set on edge: this is where the player's peels hang (the wall of peels, finale.ts, inside FIN.wall), so its
// face is calm, mid-dark and even. In front of its right end stands the ur-oven (FIN.hive): a beehive dome of clay
// daubed over stones by hand, finger marks still in it, soot fanned up over its mouth, the daub fallen away near the
// foot to show the stones; fire in its mouth, a flatbread baking on the floor in front of the coals, a smoke hole at
// the crown, a stone hearth apron. The first peel of all (split wood, adze-cut, charred at the edge) leans by it,
// split logs are stacked beside it and a tree fern frames the right edge. At the left end a thatched awning on two
// forked posts shelters the larder: three coil-built clay jars, a saddle quern with its rubbing stone and spilled
// grain, a bundle of herbs drying; a wild tomato climbs the front post and wild basil grows at its foot.
//
// Beyond the wall the valley: a river winding out of the dawn through a plain of cycads and tree ferns (two
// sauropods drinking far off), the far range in the last of the night, a volcano smoking on the left, araucarias on
// the ridges; a huge sky in deep blue-violet with the first light low on the horizon where the sun is about to rise
// (FIN.sun: finale.ts's dawn glow is shaped round it), a thin old moon and the morning star over it.
//
// The table is a great slab of sandstone, worn smooth in the middle, dusted with flour here and there.
//
// Live, the heroes:
// - the oven: its fire (a painted loop) breathing in the mouth, the coals pulsing, firelight flickering on the apron,
//   the dome, the peel and the back of the table; smoke rising from the smoke hole (a painted loop) into the still
//   dawn air, sparks riding up in it;
// - the dawn: the stars fading and twinkling out, the morning star last; the horizon warming and the light reaching
//   the peaks and cloud undersides (a live-only light layer), and on the last wave the sun's first sliver;
// - the life waking: birds crossing the dawn in flocks (a painted wing beat, flap and glide), birds perched on the
//   awning that preen and take off at a stomp; mist drifting along the river and lifting; fireflies blinking and
//   going out as day comes; the volcano's plume rolling (a painted loop); fern fronds stirring.
// A stomp rattles the jars, puffs ash and sparks out of the oven's mouth and smoke hole, shakes the ferns and sends
// the birds up.
//
// Runtime layers to design round (finale.ts): the wall of peels hangs on the wall's face inside FIN.wall (with a '+N
// MORE' line on the coping), and the dawn glow (fin_dawn, SCREEN) lies over the base, both under this scene's live
// layer: so nothing that moves or is baked into an overlay may sit over FIN.wall, and the sky stays in the base.

import Phaser from 'phaser';
import { xAt, yAt, zFront } from '../../art/backdrops';
import { type Air, type Ctx, type PathFn, type R, H, TY, W, airMix, calmLanes, castShadow, crevice, glowAt, groundShadow, lightPool, polyPath, rim, vfill, vignetteAll, within } from '../../art/scene/kit';
import type { SceneSpec } from '../../art/scene/layers';
import { tableFalloff, tableSeam } from '../../art/scene/materials';
import { crack, drift, lay, noiseMask, softly, surface } from '../../art/scene/paint';
import { cirrus, cloud, farLand, horizonGlow, skyFill } from '../../art/scene/sky';
import { texture } from '../../art/style/kit';
import { mix, rgba, rng, shade } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { Loop, Parts, Rate, Spring, Swing, sheet } from '../../game/sceneAnim';
import { type KitLive, calm, flicker, lerp, registerKitScene, waveK, wander } from '../../game/sceneLive';
import { fireFrame, smokeFrame } from './sceneBits';
import { PT, pteroFrame } from './scene-valley';
import { FIN } from './scenes-act10';

type Pt = [number, number];
type Box = { x: number; y: number; w: number; h: number };
const P2 = Math.PI * 2;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

// ——— layout ———

/** Where the sun is about to come up: the far horizon (the dawn glow in finale.ts is shaped round it). */
const SUN = FIN.sun;
const HOR = SUN.y;
/** The wall: the top of its coping, the top of its face, its foot (behind the table's back edge). */
const WALL = { x1: W + 14, top: 404, face: 440, foot: 752 };
/** The oven. */
const HIVE = FIN.hive;
/** The top of the oven's stone platform: the hearth, the oven floor at the mouth. */
const PLAT = 742;
const DOME_H = 352;
const DOME_R = 212;
const CROWN = PLAT - DOME_H;
/** The dome's half-width at a height (a beehive: steep flanks, a round crown). */
const domeHalf = (y: number) => {
  const t = clamp01((PLAT - y) / DOME_H);
  return DOME_R * Math.max(0, 1 - t ** 2.8) ** 0.5;
};
/** Hand-built: the daub bulges a little here and there. */
const wob = (y: number, s: number) => Math.sin(y * 0.045 + s * 2) * 2.6 + Math.sin(y * 0.11 + s) * 1.3;
/** The mouth: a round arch on short jambs, down to the sill. */
const MOUTH = { x: HIVE.x, half: 90, spring: 666, rise: 74 };
/** The smoke hole's collar at the crown. */
const HOLE = { x: HIVE.x - 4, y: CROWN - 8, rx: 24, ry: 7 };
/** The fire inside (its base at the back of the floor). */
const FIRE = { x: HIVE.x + 14, y: PLAT - 20, w: 132, h: 108 };
/** The awning (the larder at the wall's left end): the back edge of its thatch, the front eave, its posts. */
const ROOF = { back: 300, eave: 392, x0: -40, x1: 286 };
const POSTS = [{ x: 30, w: 15 }, { x: 214, w: 16 }];
/** The jars (in the awning's shade): centre x, height, belly half-width. */
const JARS = [
  { id: 'jar0', x: 62, h: 134, w: 38, base: '#8a4a30', kind: 0 },
  { id: 'jar1', x: 126, h: 92, w: 36, base: '#9a5c3a', kind: 1 },
  { id: 'jar2', x: 176, h: 60, w: 24, base: '#7c4632', kind: 2 },
] as const;
const JAR_FOOT = 752;
/** The tree fern on the right edge: its trunk's foot and top. */
const FERN_TOP: Pt = [1890, 236];
const FERN_FOOT: Pt = [1914, 762];
/** The volcano's crater. */
const VOL = { x: 330, top: 190, cw: 34 };
/** Perches on the awning's back edge (birds). */
const PERCH: Pt[] = [[52, ROOF.back + 2], [118, ROOF.back], [196, ROOF.back + 1]];

const AIR: Air = { color: '#4c4074', far: 0.62 };
const SKYLIT = '#9ea2d8';
const FIREC = '#ff8a3a';
const STONE = '#433b42';
const CLAY = '#6a4634';

// ——— small helpers ———

function fillPath(ctx: Ctx, path: PathFn, fill: string | CanvasGradient): void {
  path(ctx);
  ctx.fillStyle = fill;
  ctx.fill();
}
function strokePath(ctx: Ctx, path: PathFn, col: string, w: number): void {
  path(ctx);
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.lineJoin = 'round';
  ctx.stroke();
}
function lin(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [t, c] of stops) g.addColorStop(t, c);
  return g;
}
/** A closed path through points, rounded (quadratic through the midpoints). */
function smoothPath(pts: Pt[]): PathFn {
  return (c) => {
    c.beginPath();
    const n = pts.length;
    const mid = (i: number): Pt => [(pts[i % n][0] + pts[(i + 1) % n][0]) / 2, (pts[i % n][1] + pts[(i + 1) % n][1]) / 2];
    const m0 = mid(n - 1);
    c.moveTo(m0[0], m0[1]);
    for (let i = 0; i < n; i++) {
      const m = mid(i);
      c.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]);
    }
    c.closePath();
  };
}
/** An open polyline, rounded. */
function smoothLine(c: Ctx, pts: Pt[]): void {
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    c.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  const l = pts[pts.length - 1];
  c.lineTo(l[0], l[1]);
}
/** A ridge line through control points, broken up with small-scale noise. */
function ridge(ctrl: Pt[], seed: number, amp: number, step = 8): Pt[] {
  const rr = rng(seed);
  const out: Pt[] = [];
  for (let i = 0; i < ctrl.length - 1; i++) {
    const [ax, ay] = ctrl[i];
    const [bx, by] = ctrl[i + 1];
    const n = Math.max(1, Math.round(Math.abs(bx - ax) / step));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const e = (1 - Math.cos(t * Math.PI)) / 2;
      out.push([ax + (bx - ax) * t, ay + (by - ay) * e + (rr() - 0.5) * amp + Math.sin((ax + (bx - ax) * t) * 0.05 + seed) * amp * 0.6]);
    }
  }
  out.push(ctrl[ctrl.length - 1]);
  return out;
}
/** A leaf from (x, y) along ang: ovate, its half that faces the sky lit. */
function leaf(ctx: Ctx, x: number, y: number, len: number, wid: number, ang: number, col: string, lit: string, litA = 0.6): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const ex = x + ca * len;
  const ey = y + sa * len;
  const nx = -sa;
  const ny = ca;
  const mx = x + ca * len * 0.42;
  const my = y + sa * len * 0.42;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(mx + nx * wid, my + ny * wid, ex, ey);
  ctx.quadraticCurveTo(mx - nx * wid, my - ny * wid, x, y);
  ctx.fillStyle = col;
  ctx.fill();
  // the half turned up to the sky
  const s = ny < 0 ? 1 : -1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(mx + nx * wid * s, my + ny * wid * s, ex, ey);
  ctx.lineTo(x, y);
  ctx.fillStyle = rgba(lit, litA);
  ctx.fill();
  ctx.strokeStyle = rgba(shade(col, -0.4), 0.5);
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(ex - ca * len * 0.15, ey - sa * len * 0.15);
  ctx.stroke();
}

// ——— the sky ———

/** The bright stars and the morning star: painted in the still, twinkling (and fading with the dawn) when live. */
const BRIGHT: { x: number; y: number; s: number; col: string }[] = (() => {
  const rr = rng(2031);
  const out: { x: number; y: number; s: number; col: string }[] = [];
  for (let n = 0; n < 600 && out.length < 46; n++) {
    const x = 20 + rr() * (W - 40);
    const y = 12 + rr() ** 1.25 * 250;
    const s = 0.5 + rr() * 0.7;
    // not behind the plume, the awning, the tree fern, nor in the glow of the sunrise
    if (x < 600 && y < 215) continue;
    if (x > 1630 && y > 100) continue;
    if (Math.hypot((x - SUN.x) / 520, (y - HOR) / 190) < 1) continue;
    out.push({ x, y, s, col: ['#ffffff', '#e8eaff', '#fff0d8', '#d8e4ff'][Math.floor(rr() * 4)] });
  }
  return out;
})();
const VENUS: Pt = [1012, 208];
const MOON = { x: 742, y: 150, r: 15 };

function sky(ctx: Ctx, r: R): void {
  const box = { x: 0, y: 0, w: W, h: 430 };
  skyFill(ctx, box, [
    [0, '#080a22'],
    [0.2, '#0e1238'],
    [0.42, '#1d1d50'],
    [0.58, '#332a62'],
    [0.67, '#4e3768'],
    [0.72, '#6e4570'],
    [0.75, '#8a5470'],
    [1, '#6a4466'],
  ], 0.07);
  // the dark half of the sky away from the sun: the earth's shadow low on the right, the pink belt over it
  ctx.save();
  const eg = ctx.createLinearGradient(SUN.x + 300, 0, W, 0);
  eg.addColorStop(0, 'rgba(26,26,64,0)');
  eg.addColorStop(1, 'rgba(26,26,64,0.55)');
  ctx.fillStyle = eg;
  ctx.fillRect(SUN.x + 300, HOR - 50, W, 70);
  const bg = ctx.createLinearGradient(SUN.x + 400, 0, W, 0);
  bg.addColorStop(0, 'rgba(176,120,160,0)');
  bg.addColorStop(1, 'rgba(176,120,160,0.16)');
  ctx.fillStyle = bg;
  ctx.fillRect(SUN.x + 400, HOR - 120, W, 62);
  ctx.restore();
  // the first light: a wide warm bloom on the horizon where the sun will come up
  lightPool(ctx, SUN.x, HOR, 1150, 250, '#ff8458', 0.2, 'screen');
  lightPool(ctx, SUN.x, HOR, 560, 120, '#ffa870', 0.26, 'screen');
  lightPool(ctx, SUN.x, HOR + 6, 220, 44, '#ffd49a', 0.32, 'screen');
  horizonGlow(ctx, HOR + 4, 90, '#d87a66', 0.18);
  // the faint stars (the bright ones are their own layer): thinning down the sky and washed out round the sunrise
  for (let i = 0; i < 1100; i++) {
    const x = r() * W;
    const t = r() ** 1.3;
    const y = t * 300;
    const wash = clamp01(1 - Math.hypot((x - SUN.x) / 980, (y - HOR) / 300));
    const a = (0.2 + r() * 0.55) * (1 - t * 0.8) * (1 - wash);
    if (a < 0.03) continue;
    ctx.fillStyle = rgba(r() < 0.8 ? '#f4f2ff' : '#ffe8d0', a);
    const s = 0.5 + r() * 0.8;
    ctx.fillRect(x, y, s, s);
  }
  // the old moon, a thin crescent turned to the sun, the rest of its disc in earthshine
  const { x: mx, y: my, r: mr } = MOON;
  const ang = Math.atan2(HOR - my, SUN.x - mx);
  glowAt(ctx, mx, my, 70, '#9fb0ff', 0.08);
  ctx.fillStyle = rgba('#3a3c66', 0.55);
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, P2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, P2);
  ctx.clip();
  ctx.fillStyle = '#fff4dc';
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, P2);
  ctx.arc(mx - Math.cos(ang) * mr * 0.32, my - Math.sin(ang) * mr * 0.32, mr * 0.98, 0, P2, true);
  ctx.fill('evenodd');
  ctx.restore();
}

function starsStill(ctx: Ctx): void {
  for (const s of BRIGHT) starburstSoft(ctx, s.x, s.y, s.s, s.col, 0.8);
  venus(ctx, 1);
}
function starburstSoft(ctx: Ctx, x: number, y: number, s: number, col: string, a: number): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, 8 * s);
  g.addColorStop(0, rgba(col, a));
  g.addColorStop(0.2, rgba(col, a * 0.35));
  g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - 8 * s, y - 8 * s, 16 * s, 16 * s);
}
function venus(ctx: Ctx, a: number): void {
  const [x, y] = VENUS;
  glowAt(ctx, x, y, 34, '#fff4e0', 0.25 * a);
  starburstSoft(ctx, x, y, 2.2, '#ffffff', a);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba('#fff6e8', 0.35 * a);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 14, y);
  ctx.lineTo(x + 14, y);
  ctx.moveTo(x, y - 12);
  ctx.lineTo(x, y + 12);
  ctx.stroke();
  ctx.restore();
}

/** Clouds: high cirrus catching the first light, stratus bars over the sunrise lit from beneath. */
const STRATUS: [number, number, number, number, number][] = [
  [520, 272, 520, 24, 0.85],
  [900, 244, 640, 28, 0.62],
  [330, 236, 360, 18, 0.5],
  [1290, 282, 440, 18, 0.5],
  [760, 296, 320, 12, 0.8],
];
function clouds(ctx: Ctx, r: R): void {
  cirrus(ctx, r, { x: 760, y: 120, w: 760, h: 100 }, '#c48aaa', 0.09, -0.05, 9);
  for (const [x, y, w, h, a] of STRATUS) {
    cloud(ctx, r, x, y, w, h, { kind: 'stratus', lit: '#ff9e7a', body: '#3a2c5c', shadow: '#1c1a3c', sunX: SUN.x, sunY: HOR + 60, rim: 0.65, wisp: 0.45, a, depth: 0.5, air: AIR });
  }
}

// ——— the far land ———

const VOL_PTS: Pt[] = (() => {
  const rr = rng(71);
  const pts: Pt[] = [];
  const base = HOR + 10;
  const L = -140;
  const Rx = 780;
  for (let i = 0; i <= 36; i++) {
    const t = i / 36;
    const x = L + (VOL.x - VOL.cw - L) * t;
    // a parasitic cone on the left shoulder
    const bump = Math.exp(-(((t - 0.52) / 0.07) ** 2)) * 16;
    pts.push([x, base - (base - VOL.top) * t ** 2.1 - bump + (rr() - 0.5) * 2]);
  }
  pts.push([VOL.x - 12, VOL.top + 7], [VOL.x + 8, VOL.top + 5]);
  for (let i = 36; i >= 0; i--) {
    const t = i / 36;
    const x = Rx - (Rx - VOL.x - VOL.cw) * t;
    pts.push([x, base - (base - VOL.top + 3) * t ** 2.0 + (rr() - 0.5) * 2]);
  }
  return pts;
})();

function volcano(ctx: Ctx, r: R): void {
  const p = polyPath(VOL_PTS);
  // the old plume's haze drifting off to the left (the live plume rolls up into it)
  softly(ctx, { x: 0, y: 0, w: 640, h: 230 }, (g) => {
    for (let i = 0; i < 22; i++) {
      const t = i / 21;
      const x = VOL.x - 10 - t * 300 + Math.sin(t * 5) * 20;
      const y = VOL.top - 30 - t * 170 + Math.sin(t * 7) * 8;
      const rad = 40 + t * 110;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, rgba('#2a2442', 0.34 * (1 - t * 0.6)));
      gr.addColorStop(1, rgba('#2a2442', 0));
      g.fillStyle = gr;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  }, 0.25);
  fillPath(ctx, p, airMix('#262046', 0.75, AIR));
  within(ctx, p, () => {
    // the right flank turned to the coming sun, the left in the night
    ctx.fillStyle = lin(ctx, VOL.x - 300, 0, VOL.x + 400, 0, [[0, 'rgba(14,12,36,0.35)'], [0.5, 'rgba(14,12,36,0)'], [0.8, rgba('#8a5a86', 0.12)], [1, rgba('#c47a88', 0.18)]]);
    ctx.fillRect(-150, VOL.top - 10, 950, HOR - VOL.top + 30);
    // gullies running down from the summit, a lighter ash cap
    ctx.lineCap = 'round';
    for (let i = 0; i < 16; i++) {
      const side = r() < 0.5 ? -1 : 1;
      const t0 = 0.05 + r() * 0.3;
      const x0 = VOL.x + side * (VOL.cw + t0 * 120);
      const y0 = VOL.top + 4 + t0 * 40;
      const len = 30 + r() * 90;
      const ang = Math.PI / 2 + side * (0.6 + r() * 0.5);
      ctx.strokeStyle = rgba(r() < 0.6 ? '#120f28' : '#5a4a7a', 0.1 + r() * 0.08);
      ctx.lineWidth = 1 + r() * 2;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(x0 + Math.cos(ang) * len * 0.5, y0 + Math.sin(ang) * len * 0.5 + 4, x0 + Math.cos(ang) * len, y0 + Math.sin(ang) * len);
      ctx.stroke();
    }
    ctx.fillStyle = lin(ctx, 0, VOL.top, 0, VOL.top + 70, [[0, rgba('#6a5a80', 0.35)], [1, 'rgba(106,90,128,0)']]);
    ctx.fillRect(VOL.x - 140, VOL.top - 4, 280, 80);
    // the foot lost in the valley haze
    ctx.fillStyle = lin(ctx, 0, HOR - 90, 0, HOR + 10, [[0, rgba(AIR.color, 0)], [1, rgba(AIR.color, 0.7)]]);
    ctx.fillRect(-150, HOR - 90, 950, 110);
  });
  // the crater's lip glowing dull red, the glow under the plume
  glowAt(ctx, VOL.x, VOL.top + 2, 60, '#ff5a2a', 0.32, 0.5);
  glowAt(ctx, VOL.x - 4, VOL.top - 16, 34, '#ff7a3a', 0.2);
  ctx.strokeStyle = rgba('#ff8a4a', 0.55);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(VOL.x - VOL.cw + 3, VOL.top + 1);
  ctx.quadraticCurveTo(VOL.x - 4, VOL.top + 6, VOL.x + VOL.cw - 3, VOL.top);
  ctx.stroke();
  // a thread of lava down a gully on the right, cooling as it goes
  ctx.strokeStyle = lin(ctx, 0, VOL.top + 4, 0, VOL.top + 70, [[0, rgba('#ff6a2a', 0.6)], [1, 'rgba(255,90,40,0)']]);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(VOL.x + 16, VOL.top + 4);
  ctx.quadraticCurveTo(VOL.x + 34, VOL.top + 30, VOL.x + 40, VOL.top + 68);
  ctx.stroke();
  strokePath(ctx, p, rgba('#14102a', 0.5), 1.2);
}

const FAR_RANGE: Pt[] = ridge([[560, 312], [640, 314], [720, 306], [800, 284], [880, 268], [950, 276], [1020, 252], [1090, 238], [1140, 254], [1200, 230], [1270, 214], [1330, 234], [1400, 222], [1470, 246], [1540, 226], [1620, 240], [1700, 224], [1780, 242], [1860, 232], [1960, 250]], 81, 5);
const NEAR_HILLS: Pt[] = ridge([[-40, 318], [80, 306], [200, 312], [320, 304], [420, 310], [520, 316], [600, 320], [700, 321], [780, 314], [860, 302], [960, 296], [1060, 304], [1160, 290], [1260, 298], [1360, 286], [1460, 296], [1560, 288], [1680, 296], [1800, 282], [1960, 292]], 83, 3, 6);

function range(ctx: Ctx, r: R): void {
  const base = HOR + 16;
  farLand(ctx, [...FAR_RANGE, [1960, base], [560, base]], base, '#2a2652', 0.85, AIR, '#d090b0', 0.16);
  // the far range's folds: faint ridges catching the light from the left
  ctx.save();
  polyPath([...FAR_RANGE, [1960, base], [560, base]])(ctx);
  ctx.clip();
  ctx.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const k = Math.floor(r() * (FAR_RANGE.length - 1));
    const [x, y] = FAR_RANGE[k];
    ctx.strokeStyle = rgba(r() < 0.5 ? '#7a6a9a' : '#1e1a40', 0.12);
    ctx.lineWidth = 1.5 + r() * 2;
    ctx.beginPath();
    ctx.moveTo(x, y + 3);
    ctx.quadraticCurveTo(x + 10 + r() * 20, y + 20, x + 18 + r() * 40, base - 10);
    ctx.stroke();
  }
  ctx.restore();
  farLand(ctx, [...NEAR_HILLS, [1960, base + 4], [-40, base + 4]], base + 4, '#1c1a38', 0.55, AIR, '#b07a9a', 0.1);
  // araucarias on the ridge tops: tall bare trunks, crowns of tufted branches in tiers
  const ar = rng(85);
  for (let i = 0; i < 22; i++) {
    const x = 820 + ar() * 1100;
    const k = NEAR_HILLS.findIndex((p) => p[0] > x);
    if (k < 1) continue;
    const y = NEAR_HILLS[k][1] + 3;
    const h = 26 + ar() * 30;
    araucaria(ctx, ar, x, y, h, airMix('#16142e', 0.5, AIR));
  }
}

function araucaria(ctx: Ctx, r: R, x: number, y: number, h: number, col: string): void {
  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  ctx.lineWidth = Math.max(1, h * 0.04);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + (r() - 0.5) * 2, y - h);
  ctx.stroke();
  // the crown: a flat-topped umbrella of tiers, upturned at the tips
  const tiers = 3 + Math.floor(r() * 2);
  for (let t = 0; t < tiers; t++) {
    const ty = y - h + t * h * 0.09;
    const tw = h * (0.22 + t * 0.07);
    ctx.beginPath();
    ctx.ellipse(x, ty, tw, h * 0.05, 0, 0, P2);
    ctx.fill();
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(x + s * tw, ty - h * 0.03, h * 0.04, h * 0.05, 0, 0, P2);
      ctx.fill();
    }
  }
}

// the river: from the sunrise through the plain towards us, out of sight behind the wall
const RIVER_C: Pt[] = [[650, 319], [706, 322], [668, 327], [592, 332], [552, 338], [596, 345], [706, 351], [836, 358], [916, 366], [906, 376], [826, 386], [766, 398], [794, 412], [884, 428]];
const RIVER: { L: Pt[]; R: Pt[] } = (() => {
  const L: Pt[] = [];
  const Rr: Pt[] = [];
  for (let i = 0; i < RIVER_C.length; i++) {
    const [x, y] = RIVER_C[i];
    const [ax, ay] = RIVER_C[Math.max(0, i - 1)];
    const [bx, by] = RIVER_C[Math.min(RIVER_C.length - 1, i + 1)];
    // the normal on the ground, squashed back into the view
    let dx = bx - ax;
    let dy = (by - ay) / 0.28;
    const l = Math.hypot(dx, dy) || 1;
    dx /= l;
    dy /= l;
    const nx = -dy;
    const ny = dx * 0.28;
    const w = 2 + (y - HOR) * 0.9;
    L.push([x + (nx * w) / 2, y + (ny * w) / 2]);
    Rr.push([x - (nx * w) / 2, y - (ny * w) / 2]);
  }
  return { L, R: Rr };
})();
const riverPath: PathFn = (c) => {
  c.beginPath();
  smoothLine(c, RIVER.L);
  const back = RIVER.R.slice().reverse();
  c.lineTo(back[0][0], back[0][1]);
  for (let i = 1; i < back.length - 1; i++) {
    const mx = (back[i][0] + back[i + 1][0]) / 2;
    const my = (back[i][1] + back[i + 1][1]) / 2;
    c.quadraticCurveTo(back[i][0], back[i][1], mx, my);
  }
  c.lineTo(back[back.length - 1][0], back[back.length - 1][1]);
  c.closePath();
};

function valley(ctx: Ctx, r: R): void {
  const y0 = HOR - 2;
  const y1 = 430;
  const box = { x: 0, y: y0, w: W, h: y1 - y0 };
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  vfill(ctx, 0, y0, W, y1 - y0, [[0, '#463a66'], [0.1, '#2c2848'], [0.4, '#1c1c34'], [1, '#121424']]);
  lay(ctx, drift('#34365a', '#0c0e1e', 6, 87, 200, 30), box, 0.6);
  // a far forest along the horizon, its top ragged
  ctx.fillStyle = airMix('#16162c', 0.75, AIR);
  ctx.beginPath();
  ctx.moveTo(0, HOR + 12);
  for (let x = 0; x <= W; x += 6) ctx.lineTo(x, HOR + 5 - Math.abs(Math.sin(x * 0.07) * Math.sin(x * 0.013 + 1)) * 5 - (r() < 0.2 ? r() * 4 : 0) + (Math.abs(x - SUN.x) < 150 ? 4 : 0));
  ctx.lineTo(W, HOR + 12);
  ctx.closePath();
  ctx.fill();
  // pools in the wet ground taking the sky
  for (let i = 0; i < 14; i++) {
    const py = HOR + 10 + r() * 80;
    const px = r() * W;
    if (Math.abs(px - 760) < 220) continue;
    const s = 0.4 + (py - HOR) / 60;
    ctx.fillStyle = rgba(py < 350 ? '#a07890' : '#5a4a78', 0.5);
    ctx.beginPath();
    ctx.ellipse(px, py, (6 + r() * 14) * s, 1 + 0.6 * s, 0, 0, P2);
    ctx.fill();
  }
  // meadows of horsetail and fern catching a little sky, darker groves
  lay(ctx, noiseMask(14, 89, { cover: 0.45, soft: 0.25, col: '#0c0e1c', w: 240, h: 24 }), box, 0.5);
  // the river: the sky in it, brightest where it comes out of the sunrise
  fillPath(ctx, riverPath, lin(ctx, 0, HOR, 0, 430, [[0, '#f8cc98'], [0.1, '#d89a8e'], [0.3, '#9a7090'], [0.62, '#544878'], [1, '#363260']]));
  within(ctx, riverPath, () => {
    lightPool(ctx, SUN.x + 20, HOR + 8, 260, 40, '#ffd8a8', 0.4, 'lighter');
    // ripples: short bright strokes across the current, a darker band along the banks
    ctx.lineCap = 'round';
    for (let i = 0; i < 70; i++) {
      const k = Math.floor(r() * (RIVER_C.length - 1));
      const t = r();
      const x = RIVER_C[k][0] + (RIVER_C[k + 1][0] - RIVER_C[k][0]) * t + (r() - 0.5) * (RIVER_C[k][1] - HOR) * 0.7;
      const y = RIVER_C[k][1] + (RIVER_C[k + 1][1] - RIVER_C[k][1]) * t + (r() - 0.5) * 3;
      const s = 0.4 + (y - HOR) / 60;
      ctx.strokeStyle = rgba(y < 345 ? '#fff0d0' : '#c8b0d8', 0.2 + r() * 0.25);
      ctx.lineWidth = 0.8 + s * 0.4;
      ctx.beginPath();
      ctx.moveTo(x - 3 * s, y);
      ctx.lineTo(x + 3 * s, y);
      ctx.stroke();
    }
  });
  ctx.strokeStyle = rgba('#100e22', 0.7);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  smoothLine(ctx, RIVER.L);
  ctx.stroke();
  ctx.beginPath();
  smoothLine(ctx, RIVER.R);
  ctx.stroke();
  // pale sand bars on the inside of the bends
  for (const i of [4, 8, 11]) {
    const [x, y] = RIVER_C[i];
    const w = 4 + (y - HOR) * 0.5;
    const side = i === 8 ? -1 : 1;
    ctx.fillStyle = rgba('#8a7a8a', 0.35);
    ctx.beginPath();
    ctx.ellipse(x + side * w * 0.9, y + 1, w * 0.45, 1.5 + (y - HOR) * 0.05, 0, 0, P2);
    ctx.fill();
  }
  // groves of cycads and tree ferns on the plain (larger as they come nearer), a lit rim on their sunward side
  for (let i = 0; i < 130; i++) {
    const y = HOR + 4 + r() ** 0.8 * 104;
    const x = r() * W;
    const near = (y - HOR) / 110;
    // not in the river
    const k = RIVER_C.findIndex((p) => p[1] > y);
    if (k > 0) {
      const t = (y - RIVER_C[k - 1][1]) / (RIVER_C[k][1] - RIVER_C[k - 1][1]);
      const rx = RIVER_C[k - 1][0] + (RIVER_C[k][0] - RIVER_C[k - 1][0]) * t;
      if (Math.abs(x - rx) < 6 + (y - HOR) * 0.8) continue;
    }
    grove(ctx, r, x, y, 4 + near * 16, airMix('#121228', 0.6 - near * 0.5, AIR), x < SUN.x ? 1 : -1);
  }
  // two sauropods drinking at the bend, far off
  sauropod(ctx, 958, 371, 0.9, -1);
  sauropod(ctx, 1012, 376, 1.05, -1);
  // the mist lying along the river
  softly(ctx, { x: 300, y: HOR, w: 1200, h: 110 }, (g) => {
    for (let i = 0; i < 26; i++) {
      const k = 1 + Math.floor(r() * (RIVER_C.length - 2));
      const [x, y] = RIVER_C[k];
      const rx = 30 + (y - HOR) * 3 + r() * 60;
      const ry = 3 + (y - HOR) * 0.12;
      g.save();
      g.translate(x + (r() - 0.5) * 80, y - ry * 0.6);
      g.scale(1, ry / rx);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
      gr.addColorStop(0, rgba('#b8a8d4', 0.1));
      gr.addColorStop(1, 'rgba(184,168,212,0)');
      g.fillStyle = gr;
      g.fillRect(-rx, -rx, rx * 2, rx * 2);
      g.restore();
    }
  }, 0.3);
  // the haze on the far plain
  vfill(ctx, 0, HOR - 2, W, 26, [[0, rgba(AIR.color, 0.55)], [1, rgba(AIR.color, 0)]]);
  ctx.restore();
}

/** A clump of cycads and tree ferns on the plain: dark crowns, a rim of light on the sun's side. */
function grove(ctx: Ctx, r: R, x: number, y: number, s: number, col: string, toSun: number): void {
  const n = 1 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const cx = x + (i - (n - 1) / 2) * s * 0.9 + (r() - 0.5) * s * 0.4;
    const h = s * (0.8 + r() * 1.1);
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(0.8, s * 0.08);
    ctx.beginPath();
    ctx.moveTo(cx, y);
    ctx.lineTo(cx, y - h);
    ctx.stroke();
    ctx.fillStyle = col;
    for (let f = 0; f < 7; f++) {
      const a = -Math.PI + (f / 6) * Math.PI;
      ctx.beginPath();
      ctx.ellipse(cx + Math.cos(a) * s * 0.35, y - h + Math.sin(a) * s * 0.18 + s * 0.08, s * 0.32, s * 0.08, a, 0, P2);
      ctx.fill();
    }
    if (s > 7) {
      ctx.fillStyle = rgba('#9a7a9a', 0.22);
      ctx.beginPath();
      ctx.ellipse(cx + toSun * -s * 0.25, y - h - s * 0.02, s * 0.25, s * 0.05, 0, 0, P2);
      ctx.fill();
    }
  }
}

function sauropod(ctx: Ctx, x: number, y: number, s: number, dir: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * dir, s);
  ctx.fillStyle = airMix('#141228', 0.4, AIR);
  ctx.beginPath();
  // the body, the tail sweeping back, the neck down to the water
  ctx.moveTo(-14, -6);
  ctx.quadraticCurveTo(-8, -13, 2, -12);
  ctx.quadraticCurveTo(9, -11, 12, -6);
  ctx.quadraticCurveTo(18, -4, 30, -2);
  ctx.lineTo(30, -1);
  ctx.quadraticCurveTo(18, -1, 11, -2);
  ctx.lineTo(10, 0);
  ctx.lineTo(8, 0);
  ctx.lineTo(7, -3);
  ctx.lineTo(-6, -3);
  ctx.lineTo(-7, 0);
  ctx.lineTo(-9, 0);
  ctx.lineTo(-10, -4);
  ctx.quadraticCurveTo(-20, -6, -26, 0);
  ctx.lineTo(-28, 0);
  ctx.quadraticCurveTo(-22, -9, -14, -6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgba('#a07a9a', 0.35);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-12, -9);
  ctx.quadraticCurveTo(-4, -13, 4, -12);
  ctx.stroke();
  ctx.restore();
}

function mistStill(ctx: Ctx): void {
  for (const m of MIST0) mistPuff(ctx, m.x, m.y, m.w, m.a * 0.7, '#c0b0dc');
}
function mistPuff(ctx: Ctx, x: number, y: number, w: number, a: number, col: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, 0.16);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w / 2);
  g.addColorStop(0, rgba(col, a));
  g.addColorStop(0.6, rgba(col, a * 0.45));
  g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g;
  ctx.fillRect(-w / 2, -w / 2, w, w);
  ctx.restore();
}
/** The mist's banks (where the live ones start). */
const MIST0: { x: number; y: number; w: number; a: number; v: number }[] = (() => {
  const rr = rng(91);
  return Array.from({ length: 11 }, (_, i) => {
    const y = 334 + rr() * 48;
    return { x: 320 + (i / 11) * 1100 + rr() * 60, y, w: 140 + (y - HOR) * 3.4 + rr() * 80, a: 0.14 + rr() * 0.08, v: 3 + rr() * 6 };
  });
})();

// ——— the wall ———

const wallPathTop = (() => {
  // the coping's skyline: stones set on edge, each its own width, height and lean, some thin slabs, some blocks
  const rr = rng(101);
  const out: { x0: number; x1: number; t0: number; t1: number; tm: number; lean: number; tone: number }[] = [];
  let x = -14;
  while (x < WALL.x1) {
    const thin = rr() < 0.45;
    const w = thin ? 7 + rr() * 7 : 14 + rr() * 24;
    const t = WALL.top + 2 + (thin ? -4 - rr() * 6 : (rr() - 0.3) * 12) + Math.sin(x * 0.01) * 3;
    const lean = (rr() - 0.5) * (thin ? 12 : 6) + Math.sin(x * 0.004) * 5;
    out.push({ x0: x, x1: x + w, t0: t + (rr() - 0.3) * (thin ? 4 : 10), t1: t + (rr() - 0.3) * (thin ? 4 : 10), tm: t - rr() * (thin ? 2 : 6), lean, tone: (rr() - 0.5) * 0.2 });
    x += w + rr() * 1.5;
  }
  return out;
})();

/** A dry-stone wall: flat field stones of every size laid in rough courses that wander, deep joints, small pinning
 * stones wedged in the gaps. Its face is kept calm and even in value (the peels hang on it): the stones differ in
 * hue more than in light. */
function wall(ctx: Ctx, r: R): void {
  const x0 = -14;
  const x1 = WALL.x1;
  const top = WALL.face;
  const foot = WALL.foot + 6;
  const face = { x: x0, y: top - 6, w: x1 - x0, h: foot - top + 6 };
  ctx.fillStyle = '#17131a';
  ctx.fillRect(face.x, face.y, face.w, face.h);
  const tone = (yy: number) => {
    const roll = r();
    let c = shade(STONE, (r() - 0.5) * 0.14 - ((yy - top) / (foot - top)) * 0.1);
    if (roll < 0.22) c = mix(c, '#56463a', 0.35 + r() * 0.3);
    else if (roll < 0.4) c = mix(c, '#3a3c4c', 0.3 + r() * 0.3);
    else if (roll < 0.47) c = mix(c, '#5a5452', 0.3);
    return c;
  };
  // the courses: their beds wander (noise along x), thin slabs between thick blocks
  let y = top + 1;
  let row = 0;
  while (y < foot - 3) {
    const ch = Math.min(foot - y, r() < 0.3 ? 12 + r() * 8 : 22 + r() * 22);
    const rw = row;
    const bed = (x: number) => Math.sin(x * 0.006 + rw * 1.7) * 3 + Math.sin(x * 0.019 + rw) * 1.5;
    let x = x0 - r() * 80;
    while (x < x1) {
      const sw = ch < 20 ? 60 + r() * 120 : 30 + r() * 100;
      const yt = y + bed(x);
      const yb = y + ch + bed(x + sw);
      const hh = yb - yt;
      if (hh > 30 && sw < 70 && r() < 0.45) {
        // two thinner stones stacked in the course instead of one block
        const k = 0.35 + r() * 0.3;
        stone(ctx, r, x + 1.5, yt + 1.5, sw - 3 - r() * 4, hh * k - 3, tone(y));
        stone(ctx, r, x + 1.5 + (r() - 0.5) * 6, yt + hh * k + 0.5, sw - 3 - r() * 4, hh * (1 - k) - 3, tone(y));
      } else stone(ctx, r, x + 1.5, yt + 1.5 + r() * 2, sw - 3 - r() * 3, hh - 3 - r() * 4, tone(y));
      if (r() < 0.22) stone(ctx, r, x + sw - 6, yt + hh * (0.2 + r() * 0.45), 7 + r() * 6, 6 + r() * 5, shade(STONE, -0.1 + r() * 0.08));
      x += sw;
    }
    y += ch;
    row++;
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(face.x, face.y, face.w, face.h);
  ctx.clip();
  // broken colour over the face, a fine grain
  lay(ctx, drift('#5a4c4a', '#24202e', 7, 103, 220, 44), face, 0.4);
  texture(ctx, 'speckle', face, 0.25, 1, 'overlay');
  // the light: the sky from above (paler at the top), the ground's occlusion low down, and the fire's warmth near
  // the oven (kept low inside FIN.wall, where the peels hang)
  vfill(ctx, face.x, top - 4, face.w, 110, [[0, rgba(SKYLIT, 0.08)], [1, rgba(SKYLIT, 0)]]);
  vfill(ctx, face.x, foot - 100, face.w, 100, [[0, 'rgba(10,8,16,0)'], [1, 'rgba(10,8,16,0.45)']]);
  lightPool(ctx, 1660, 650, 640, 320, FIREC, 0.11, 'lighter');
  lightPool(ctx, 1580, 700, 240, 140, FIREC, 0.12, 'lighter');
  // lichen on the upper courses, moss in the damp at the foot
  for (let i = 0; i < 40; i++) {
    const lx = x0 + r() * (x1 - x0);
    const ly = top + r() ** 2 * 110;
    const n = 3 + Math.floor(r() * 5);
    for (let j = 0; j < n; j++) {
      ctx.fillStyle = rgba(r() < 0.6 ? '#7a8a78' : '#9a9068', 0.08 + r() * 0.07);
      ctx.beginPath();
      ctx.arc(lx + (r() - 0.5) * 10, ly + (r() - 0.5) * 5, 1 + r() * 2.4, 0, P2);
      ctx.fill();
    }
  }
  for (let i = 0; i < 200; i++) {
    const mx = x0 + r() * (x1 - x0);
    const my = foot - 4 - r() ** 2 * 28;
    ctx.fillStyle = rgba(r() < 0.5 ? '#223018' : '#34402a', 0.25 + r() * 0.2);
    ctx.beginPath();
    ctx.ellipse(mx, my, 2 + r() * 5, 1 + r() * 2, 0, 0, P2);
    ctx.fill();
  }
  // soot drifted onto the stones round the oven's crown
  softly(ctx, { x: 1380, y: top - 10, w: 560, h: 200 }, (g) => {
    const gr = g.createRadialGradient(HIVE.x, top + 10, 0, HIVE.x, top + 10, 260);
    gr.addColorStop(0, 'rgba(14,10,12,0.5)');
    gr.addColorStop(1, 'rgba(14,10,12,0)');
    g.fillStyle = gr;
    g.fillRect(1380, top - 10, 560, 200);
  }, 0.25);
  ctx.restore();
  // the wall's top, then the coping set on edge along it
  ctx.fillStyle = '#1e1a22';
  ctx.fillRect(x0, top - 12, x1 - x0, 14);
  for (const c of wallPathTop) coping(ctx, r, c);
  crevice(ctx, x0, x1, top + 1, 20, 0.55, '#0a0810');
  // the ground at the wall's foot: trodden earth, fallen chips, tufts of grass and fern in the angle
  ctx.fillStyle = lin(ctx, 0, WALL.foot - 4, 0, TY + 2, [[0, '#1a1418'], [1, '#2a2226']]);
  ctx.fillRect(x0, WALL.foot - 2, x1 - x0, TY - WALL.foot + 4);
  crevice(ctx, x0, x1, WALL.foot, -22, 0.55, '#08060c');
  for (let i = 0; i < 70; i++) {
    const cx = x0 + r() * (x1 - x0);
    ctx.fillStyle = rgba(shade(STONE, -0.1 + r() * 0.15), 0.9);
    ctx.beginPath();
    ctx.ellipse(cx, WALL.foot + 2 + r() * 4, 2 + r() * 5, 1.5 + r() * 2, 0, 0, P2);
    ctx.fill();
  }
  ctx.lineCap = 'round';
  for (let i = 0; i < 46; i++) {
    const cx = x0 + r() * (x1 - x0);
    const n = 4 + Math.floor(r() * 6);
    for (let j = 0; j < n; j++) {
      const h = 6 + r() * 12;
      const a = -Math.PI / 2 + (r() - 0.5) * 1.2;
      ctx.strokeStyle = rgba(r() < 0.5 ? '#2a3a22' : '#46543a', 0.7);
      ctx.lineWidth = 1 + r() * 0.8;
      ctx.beginPath();
      ctx.moveTo(cx + (r() - 0.5) * 8, WALL.foot + 6);
      ctx.quadraticCurveTo(cx + Math.cos(a) * h * 0.5, WALL.foot + 6 + Math.sin(a) * h * 0.6, cx + Math.cos(a) * h, WALL.foot + 6 + Math.sin(a) * h);
      ctx.stroke();
    }
  }
}

/** One field stone in the wall: an irregular, faceted block (a split face, knocked corners), lit from the sky. */
function stone(ctx: Ctx, r: R, x: number, y: number, w: number, h: number, col: string): void {
  if (w < 3 || h < 3) return;
  const j = (k = 1) => (r() - 0.5) * 4 * k;
  const ck = Math.min(w, h) * 0.36;
  // corners knocked off at random, the long edges a little bowed
  const pts: Pt[] = [
    [x + ck * r() + j(0.5), y + j(0.4)],
    [x + w * (0.3 + r() * 0.4), y - 0.8 + j(0.6)],
    [x + w - ck * r() + j(0.5), y + j(0.4)],
    [x + w + j(0.4), y + ck * r() + j(0.5)],
    [x + w + j(0.6), y + h - ck * r()],
    [x + w - ck * r(), y + h + j(0.3)],
    [x + w * (0.3 + r() * 0.4), y + h + 0.6 + j(0.4)],
    [x + ck * r(), y + h + j(0.3)],
    [x + j(0.4), y + h - ck * r()],
    [x + j(0.6), y + ck * r()],
  ];
  const p = polyPath(pts);
  fillPath(ctx, p, lin(ctx, 0, y, 0, y + h, [[0, shade(col, 0.06)], [0.5, col], [1, shade(col, -0.16)]]));
  // a facet: the face split at an angle, one plane turned a little more to the sky
  if (w > 26 && h > 14 && r() < 0.55) {
    const fx = x + w * (0.25 + r() * 0.5);
    within(ctx, p, () => {
      ctx.fillStyle = rgba(r() < 0.5 ? '#000000' : '#c8c0d8', 0.05 + r() * 0.04);
      ctx.beginPath();
      ctx.moveTo(fx, y - 2);
      ctx.lineTo(fx + (r() - 0.5) * w * 0.4, y + h + 2);
      ctx.lineTo(x + w + 4, y + h + 2);
      ctx.lineTo(x + w + 4, y - 2);
      ctx.closePath();
      ctx.fill();
    });
  }
  // its top arris catching the sky, its underside in shadow (soft)
  ctx.strokeStyle = rgba(SKYLIT, 0.08 + r() * 0.06);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(pts[0][0] + 1, pts[0][1] + 1);
  ctx.lineTo(pts[1][0], pts[1][1] + 1);
  ctx.lineTo(pts[2][0] - 1, pts[2][1] + 1);
  ctx.stroke();
  ctx.strokeStyle = rgba('#08060c', 0.3);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(pts[7][0], pts[7][1] - 0.8);
  ctx.lineTo(pts[6][0], pts[6][1] - 0.8);
  ctx.lineTo(pts[5][0], pts[5][1] - 0.8);
  ctx.stroke();
}

/** A coping stone on edge: its left face lit, its top catching the sky. */
function coping(ctx: Ctx, r: R, c: (typeof wallPathTop)[number]): void {
  const b = WALL.face + 2;
  const L = c.lean;
  const pts: Pt[] = [
    [c.x0 + L * 0.2, b],
    [c.x0 + L * 0.8, c.t0 + 5],
    [c.x0 + L + (c.x1 - c.x0) * 0.2, c.t0],
    [(c.x0 + c.x1) / 2 + L, c.tm],
    [c.x1 + L - (c.x1 - c.x0) * 0.2, c.t1],
    [c.x1 + L * 0.8, c.t1 + 5],
    [c.x1 + L * 0.2, b],
  ];
  const p = smoothPath(pts);
  castShadow(ctx, p, 4, 4, 0.35, '#06040a');
  const col = shade(STONE, c.tone - 0.1);
  fillPath(ctx, p, lin(ctx, c.x0, 0, c.x1, 0, [[0, shade(col, 0.08)], [0.5, col], [1, shade(col, -0.22)]]));
  within(ctx, p, () => {
    const t = Math.min(c.t0, c.t1, c.tm);
    ctx.fillStyle = lin(ctx, 0, t, 0, t + 8, [[0, rgba(SKYLIT, 0.14)], [1, rgba(SKYLIT, 0)]]);
    ctx.fillRect(c.x0 - 6, t - 4, c.x1 - c.x0 + 12, 16);
    ctx.fillStyle = lin(ctx, 0, b - 16, 0, b, [[0, 'rgba(8,6,12,0)'], [1, 'rgba(8,6,12,0.45)']]);
    ctx.fillRect(c.x0 - 6, b - 16, c.x1 - c.x0 + 12, 18);
    if (r() < 0.3) {
      ctx.fillStyle = rgba('#8a9a7a', 0.12);
      ctx.beginPath();
      ctx.ellipse((c.x0 + c.x1) / 2 + L * 0.5, t + 8, 4 + r() * 4, 2 + r() * 2, 0, 0, P2);
      ctx.fill();
    }
  });
  strokePath(ctx, p, rgba('#0a080e', 0.6), 1.2);
}

/** The awning's shade on the wall and the ground under it. */
function roofShadow(ctx: Ctx): void {
  softly(ctx, { x: 0, y: ROOF.eave - 10, w: 320, h: WALL.foot - ROOF.eave + 20 }, (g) => {
    const gr = g.createLinearGradient(0, 0, 300, 0);
    gr.addColorStop(0, 'rgba(8,6,16,0.55)');
    gr.addColorStop(0.72, 'rgba(8,6,16,0.45)');
    gr.addColorStop(1, 'rgba(8,6,16,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(-10, ROOF.eave);
    g.lineTo(ROOF.x1 - 6, ROOF.eave);
    g.lineTo(ROOF.x1 - 30, WALL.foot + 8);
    g.lineTo(-10, WALL.foot + 8);
    g.closePath();
    g.fill();
    const vg = g.createLinearGradient(0, ROOF.eave, 0, ROOF.eave + 120);
    vg.addColorStop(0, 'rgba(8,6,16,0.35)');
    vg.addColorStop(1, 'rgba(8,6,16,0)');
    g.fillStyle = vg;
    g.fillRect(-10, ROOF.eave, ROOF.x1 - 10, 120);
  }, 0.25);
}

// ——— the awning (the larder) ———

function post(ctx: Ctx, r: R, x: number, w: number, top: number): void {
  const lean = (r() - 0.5) * 4;
  const p: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - w / 2 + lean, top);
    c.lineTo(x - w / 2 - 1, WALL.foot + 6);
    c.lineTo(x + w / 2 + 1, WALL.foot + 6);
    c.lineTo(x + w / 2 + lean, top);
    // the fork the eave beam sits in
    c.lineTo(x + w / 2 + lean + 6, top - 12);
    c.lineTo(x + w / 2 + lean + 2, top - 13);
    c.lineTo(x + lean + 1, top - 2);
    c.lineTo(x - w / 2 + lean - 2, top - 14);
    c.lineTo(x - w / 2 + lean - 6, top - 12);
    c.closePath();
  };
  castShadow(ctx, p, 10, 10, 0.45, '#06040a');
  fillPath(ctx, p, lin(ctx, x - w / 2, 0, x + w / 2, 0, [[0, '#6a5440'], [0.35, '#4a3a2c'], [1, '#1e1610']]));
  within(ctx, p, () => {
    // bark: long fissures, a few knots
    ctx.lineCap = 'round';
    for (let i = 0; i < 22; i++) {
      const bx = x - w / 2 + r() * w;
      const by = top + r() * (WALL.foot - top);
      ctx.strokeStyle = rgba(r() < 0.6 ? '#120c08' : '#8a7458', 0.35);
      ctx.lineWidth = 0.8 + r();
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + (r() - 0.5) * 2, by + 14 + r() * 30);
      ctx.stroke();
    }
    for (let i = 0; i < 3; i++) {
      const ky = top + 40 + r() * (WALL.foot - top - 80);
      ctx.fillStyle = rgba('#120c08', 0.6);
      ctx.beginPath();
      ctx.ellipse(x + (r() - 0.5) * w * 0.4, ky, 2.4, 3.6, 0, 0, P2);
      ctx.fill();
    }
    texture(ctx, 'wood', { x: x - w, y: top - 14, w: w * 2, h: WALL.foot - top + 20 }, 0.3, 1, 'overlay');
  });
  strokePath(ctx, p, '#0c0806', 1.6);
}

/** The thatch's front eave and back edge (it sags a little between the posts), its whole outline. */
const eaveY = (x: number) => ROOF.eave - 4 + (x > POSTS[0].x && x < POSTS[1].x ? Math.sin(((x - POSTS[0].x) / (POSTS[1].x - POSTS[0].x)) * Math.PI) * 5 : 0) + Math.sin(x * 0.08) * 1.2;
const backY = (x: number) => ROOF.back + Math.sin(x * 0.045) * 2.5 + Math.sin(x * 0.13 + 1) * 1.5 + ((x - ROOF.x0) / (ROOF.x1 - ROOF.x0)) * 6;
const NOSE = 16;
const roofWhole: PathFn = (c) => {
  const L = ROOF.x0;
  const Rr = ROOF.x1;
  c.beginPath();
  c.moveTo(L, backY(L));
  for (let x = L; x <= Rr - 26; x += 6) c.lineTo(x, backY(x));
  c.quadraticCurveTo(Rr - 4, backY(Rr - 26) + 10, Rr + 4, eaveY(Rr) - NOSE * 0.4);
  for (let x = Rr - 2; x >= L; x -= 6) c.lineTo(x, eaveY(x) + 2);
  c.closePath();
};

function leanto(ctx: Ctx, r: R): void {
  // the posts and the eave beam they carry
  for (const p of POSTS) post(ctx, r, p.x, p.w, ROOF.eave + 6);
  const beam: PathFn = (c) => {
    c.beginPath();
    c.moveTo(ROOF.x0, ROOF.eave - 4);
    c.lineTo(ROOF.x1 - 10, ROOF.eave - 8);
    c.quadraticCurveTo(ROOF.x1 - 2, ROOF.eave - 2, ROOF.x1 - 10, ROOF.eave + 6);
    c.lineTo(ROOF.x0, ROOF.eave + 9);
    c.closePath();
  };
  fillPath(ctx, beam, lin(ctx, 0, ROOF.eave - 8, 0, ROOF.eave + 9, [[0, '#6a5440'], [0.4, '#3a2c20'], [1, '#160f0a']]));
  strokePath(ctx, beam, '#0c0806', 1.4);
  // the thatch: its top seen from just above, laid in courses back to the wall, its eave a thick rounded edge of
  // reed butts, sagging a little between the posts
  const L = ROOF.x0;
  const Rr = ROOF.x1;
  const top: PathFn = (c) => {
    c.beginPath();
    c.moveTo(L, backY(L));
    for (let x = L; x <= Rr - 26; x += 6) c.lineTo(x, backY(x));
    c.quadraticCurveTo(Rr - 4, backY(Rr - 26) + 10, Rr + 2, eaveY(Rr) - NOSE + 2);
    for (let x = Rr; x >= L; x -= 6) c.lineTo(x, eaveY(x) - NOSE);
    c.closePath();
  };
  const nose: PathFn = (c) => {
    c.beginPath();
    c.moveTo(L, eaveY(L) - NOSE);
    for (let x = L; x <= Rr; x += 6) c.lineTo(x, eaveY(x) - NOSE);
    c.quadraticCurveTo(Rr + 6, eaveY(Rr) - NOSE * 0.4, Rr - 2, eaveY(Rr) + 2);
    for (let x = Rr - 2; x >= L; x -= 6) c.lineTo(x, eaveY(x) + 2);
    c.closePath();
  };
  const whole = roofWhole;
  castShadow(ctx, whole, 14, 16, 0.45, '#06040a');
  fillPath(ctx, top, lin(ctx, 0, ROOF.back, 0, ROOF.eave, [[0, '#4a3e2e'], [0.5, '#62523a'], [1, '#56462e']]));
  within(ctx, top, () => {
    ctx.lineCap = 'round';
    // the straws, combed down towards the eave, each course overlapping the one behind it
    const courses = 5;
    for (let k = 0; k < courses; k++) {
      const yA = (x: number) => backY(x) + (eaveY(x) - NOSE - backY(x)) * (k / courses) ** 1.2;
      const yB = (x: number) => backY(x) + (eaveY(x) - NOSE - backY(x)) * ((k + 1) / courses) ** 1.2;
      for (let i = 0; i < 170; i++) {
        const x = L + r() * (Rr - L + 10);
        const a = yA(x);
        const b = yB(x);
        const y = a + r() * (b - a);
        const len = (b - a) * (0.5 + r() * 0.9);
        ctx.strokeStyle = rgba(r() < 0.5 ? '#ae9662' : r() < 0.5 ? '#241a10' : '#76603e', 0.22 + r() * 0.3);
        ctx.lineWidth = 0.6 + r() * 0.9;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (x - 120) * 0.02 + (r() - 0.5) * 2, y + len);
        ctx.stroke();
      }
      // the course's lower edge: the butts of the next course over it, a line of shade
      ctx.strokeStyle = rgba('#140e08', 0.4);
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = L; x <= Rr; x += 6) {
        const y = yB(x) + Math.sin(x * 0.3 + k) * 0.8;
        if (x === L) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // the light: the dawn's side (left) warmer, the far end into shade; the cool sky on the back of it
    ctx.fillStyle = lin(ctx, L, 0, Rr, 0, [[0, rgba('#c89a7a', 0.12)], [0.6, 'rgba(0,0,0,0)'], [1, 'rgba(6,4,10,0.38)']]);
    ctx.fillRect(L, ROOF.back - 6, Rr - L + 8, ROOF.eave - ROOF.back + 8);
    ctx.fillStyle = lin(ctx, 0, ROOF.back, 0, ROOF.back + 26, [[0, rgba(SKYLIT, 0.2)], [1, rgba(SKYLIT, 0)]]);
    ctx.fillRect(L, ROOF.back - 6, Rr - L + 8, 30);
  });
  // the eave's thick edge: reed butts end-on, lit on top, falling into shade beneath
  fillPath(ctx, nose, lin(ctx, 0, ROOF.eave - NOSE - 4, 0, ROOF.eave + 4, [[0, '#7a6440'], [0.45, '#4a3a24'], [1, '#1a120a']]));
  within(ctx, nose, () => {
    for (let i = 0; i < 520; i++) {
      const x = L + r() * (Rr - L + 4);
      const y = eaveY(x) - NOSE + r() * (NOSE + 2);
      const u = (y - (eaveY(x) - NOSE)) / NOSE;
      ctx.fillStyle = rgba(u < 0.45 ? (r() < 0.6 ? '#c8ae78' : '#2a1e10') : r() < 0.3 ? '#6a5434' : '#0e0a06', 0.45 + r() * 0.4);
      ctx.fillRect(x, y, 1 + r() * 0.8, 1.6 + r() * 2.4);
    }
    ctx.fillStyle = lin(ctx, L, 0, Rr, 0, [[0, 'rgba(0,0,0,0)'], [0.65, 'rgba(0,0,0,0)'], [1, 'rgba(6,4,10,0.45)']]);
    ctx.fillRect(L, ROOF.eave - NOSE - 6, Rr - L + 10, NOSE + 14);
  });
  strokePath(ctx, whole, '#120c06', 1.8);
  // the ragged fringe of straw ends hanging under the eave
  ctx.lineCap = 'round';
  for (let i = 0; i < 280; i++) {
    const x = L + r() * (Rr - L - 4);
    const y = eaveY(x) + r() * 2;
    const len = 4 + r() * 12;
    ctx.strokeStyle = rgba(r() < 0.35 ? '#7a6440' : r() < 0.5 ? '#40321e' : '#160f08', 0.55 + r() * 0.35);
    ctx.lineWidth = 0.7 + r() * 1.1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + (r() - 0.5) * 3, y + len * 0.6, x + (r() - 0.5) * 5, y + len);
    ctx.stroke();
  }
  // herbs drying under the eave, and a gourd on its cord
  herbBundle(ctx, r, 128, ROOF.eave + 4);
  gourd(ctx, 82, ROOF.eave + 6);
}

function herbBundle(ctx: Ctx, r: R, x: number, y: number): void {
  ctx.strokeStyle = '#8a7a5a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 1, y + 16);
  ctx.stroke();
  // stems tied at the top, the sprigs hanging down and spreading
  for (let i = 0; i < 22; i++) {
    const a = Math.PI / 2 + (r() - 0.5) * 0.7;
    const len = 30 + r() * 24;
    const sx = x + 1;
    const sy = y + 18;
    ctx.strokeStyle = rgba('#3a3420', 0.9);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(a) * len, sy + Math.sin(a) * len);
    ctx.stroke();
    for (let k = 0; k < 4; k++) {
      const t = 0.3 + k * 0.18;
      leaf(ctx, sx + Math.cos(a) * len * t, sy + Math.sin(a) * len * t, 6 + r() * 3, 2.2, a + (k % 2 ? 0.9 : -0.9), r() < 0.5 ? '#3a4a26' : '#4a4a2a', '#9aa070', 0.3);
    }
  }
  ctx.fillStyle = '#a08a5a';
  ctx.fillRect(x - 4, y + 14, 10, 4);
}

function gourd(ctx: Ctx, x: number, y: number): void {
  ctx.strokeStyle = '#6a5a3a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + 14);
  ctx.stroke();
  const p: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - 3, y + 14);
    c.bezierCurveTo(x - 6, y + 22, x - 4, y + 24, x - 9, y + 30);
    c.bezierCurveTo(x - 16, y + 38, x - 12, y + 52, x, y + 52);
    c.bezierCurveTo(x + 12, y + 52, x + 16, y + 38, x + 9, y + 30);
    c.bezierCurveTo(x + 4, y + 24, x + 6, y + 22, x + 3, y + 14);
    c.closePath();
  };
  fillPath(ctx, p, lin(ctx, x - 14, y + 20, x + 14, y + 50, [[0, '#a8884a'], [0.5, '#7a5a2a'], [1, '#2a1c0c']]));
  within(ctx, p, () => {
    ctx.fillStyle = rgba(SKYLIT, 0.18);
    ctx.beginPath();
    ctx.ellipse(x - 5, y + 36, 3, 7, 0.3, 0, P2);
    ctx.fill();
  });
  strokePath(ctx, p, '#140c04', 1.3);
}

// ——— the jars, the quern, the plants ———

function jarPath(j: (typeof JARS)[number]): PathFn {
  const { x, h, w } = j;
  const b = JAR_FOOT;
  return (c) => {
    c.beginPath();
    if (j.kind === 0) {
      // tall and ovoid, a short neck and a flared rim
      c.moveTo(x - w * 0.42, b);
      c.bezierCurveTo(x - w * 1.08, b - h * 0.18, x - w * 1.12, b - h * 0.62, x - w * 0.48, b - h * 0.84);
      c.lineTo(x - w * 0.42, b - h * 0.95);
      c.lineTo(x - w * 0.6, b - h);
      c.lineTo(x + w * 0.6, b - h);
      c.lineTo(x + w * 0.42, b - h * 0.95);
      c.lineTo(x + w * 0.48, b - h * 0.84);
      c.bezierCurveTo(x + w * 1.12, b - h * 0.62, x + w * 1.08, b - h * 0.18, x + w * 0.42, b);
    } else if (j.kind === 1) {
      // squat and round, a wide mouth
      c.moveTo(x - w * 0.5, b);
      c.bezierCurveTo(x - w * 1.15, b - h * 0.1, x - w * 1.2, b - h * 0.72, x - w * 0.62, b - h * 0.92);
      c.lineTo(x - w * 0.7, b - h);
      c.lineTo(x + w * 0.7, b - h);
      c.lineTo(x + w * 0.62, b - h * 0.92);
      c.bezierCurveTo(x + w * 1.2, b - h * 0.72, x + w * 1.15, b - h * 0.1, x + w * 0.5, b);
    } else {
      // small, round-shouldered, a flat stone for a lid
      c.moveTo(x - w * 0.5, b);
      c.bezierCurveTo(x - w * 1.1, b - h * 0.2, x - w * 1.05, b - h * 0.78, x - w * 0.6, b - h * 0.9);
      c.lineTo(x + w * 0.6, b - h * 0.9);
      c.bezierCurveTo(x + w * 1.05, b - h * 0.78, x + w * 1.1, b - h * 0.2, x + w * 0.5, b);
    }
    c.quadraticCurveTo(x, b + 3, x - w * (j.kind === 0 ? 0.42 : 0.5), b);
    c.closePath();
  };
}

function jarBox(j: (typeof JARS)[number]): Box {
  return { x: Math.floor(j.x - j.w * 1.3 - 4), y: Math.floor(JAR_FOOT - j.h - 12), w: Math.ceil(j.w * 2.6 + 8), h: Math.ceil(j.h + 12 + (TY - JAR_FOOT)) };
}

function jarShadows(ctx: Ctx): void {
  for (const j of JARS) {
    const p = jarPath(j);
    castShadow(ctx, p, 8, 10, 0.4, '#06040a');
    groundShadow(ctx, j.x + 4, JAR_FOOT + 1, j.w * 1.05, 4, 0.55, '#06040a');
  }
}

function jar(ctx: Ctx, r: R, j: (typeof JARS)[number]): void {
  const p = jarPath(j);
  const { x, h, w } = j;
  const b = JAR_FOOT;
  fillPath(ctx, p, j.base);
  within(ctx, p, () => {
    // fired clay: blotched where the fire touched it, a speckled body
    lay(ctx, drift(shade(j.base, 0.15), '#2a1810', 3, 120 + j.kind, 60, 80), { x: x - w * 1.3, y: b - h, w: w * 2.6, h }, 0.55);
    texture(ctx, 'speckle', { x: x - w * 1.3, y: b - h, w: w * 2.6, h }, 0.35, 1, 'overlay');
    // the form: lit from the open side (the dawn sky beyond the awning, top left), the belly turning into shade
    const g = ctx.createRadialGradient(x - w * 0.45, b - h * 0.62, 0, x - w * 0.2, b - h * 0.5, w * 1.5);
    g.addColorStop(0, rgba('#e0b08a', 0.42));
    g.addColorStop(0.45, rgba('#e0b08a', 0.06));
    g.addColorStop(1, 'rgba(10,4,6,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(x - w * 1.3, b - h, w * 2.6, h + 4);
    // the coils it was built from, smoothed but still there
    ctx.strokeStyle = rgba('#1a0c08', 0.14);
    ctx.lineWidth = 1;
    for (let yy = b - 6; yy > b - h * 0.86; yy -= 7 + r() * 3) {
      ctx.beginPath();
      ctx.ellipse(x, yy, w * 1.2, 2.4, 0, 0.1, Math.PI - 0.1);
      ctx.stroke();
    }
    // decoration: a band of cord impressions on the shoulder (a zigzag on the tall one)
    const sy = b - h * (j.kind === 0 ? 0.74 : j.kind === 1 ? 0.78 : 0.72);
    ctx.strokeStyle = rgba('#1a0c08', 0.5);
    ctx.lineWidth = 1.2;
    if (j.kind === 0) {
      ctx.beginPath();
      for (let i = 0; i <= 12; i++) {
        const xx = x - w * 0.95 + (i / 12) * w * 1.9;
        const yy = sy + (i % 2 ? 6 : 0) + Math.abs(xx - x) * 0.05;
        if (i) ctx.lineTo(xx, yy);
        else ctx.moveTo(xx, yy);
      }
      ctx.stroke();
    }
    for (let i = 0; i < 16; i++) {
      const xx = x - w * 0.9 + (i / 15) * w * 1.8;
      const yy = sy + (j.kind === 0 ? 12 : 0) + Math.abs(xx - x) * 0.06;
      ctx.beginPath();
      ctx.moveTo(xx - 1.5, yy - 2);
      ctx.lineTo(xx + 1.5, yy + 2);
      ctx.stroke();
    }
    // a drip down from the mouth: oil
    if (j.kind === 1) {
      ctx.fillStyle = rgba('#1a0c08', 0.3);
      ctx.beginPath();
      ctx.ellipse(x + w * 0.4, b - h * 0.7, 2, 12, 0.05, 0, P2);
      ctx.fill();
    }
  });
  rim(ctx, p, 0.3, 3, '#7a8ac8');
  strokePath(ctx, p, '#140806', 2);
  // the mouth: the dark inside, the rim's lit lip
  if (j.kind !== 2) {
    const mw = w * (j.kind === 0 ? 0.6 : 0.7);
    ctx.fillStyle = '#120806';
    ctx.beginPath();
    ctx.ellipse(x, b - h + 1, mw - 2, 3.4, 0, 0, P2);
    ctx.fill();
    ctx.strokeStyle = rgba('#d8a882', 0.55);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(x, b - h + 1, mw - 1, 3.6, 0, Math.PI, P2);
    ctx.stroke();
  }
  if (j.kind === 1) {
    // lug handles
    for (const s of [-1, 1]) {
      const lp = (c: Ctx) => {
        c.beginPath();
        c.ellipse(x + s * w * 1.08, b - h * 0.62, 5, 3.4, 0, 0, P2);
      };
      fillPath(ctx, lp, shade(j.base, s < 0 ? 0.1 : -0.3));
      strokePath(ctx, lp, '#140806', 1.2);
    }
  }
  if (j.kind === 2) {
    // the stone lid
    const lp: PathFn = (c) => {
      c.beginPath();
      c.ellipse(x - 1, b - h * 0.9 - 3, w * 0.82, 5, -0.04, 0, P2);
    };
    fillPath(ctx, lp, lin(ctx, 0, b - h - 2, 0, b - h + 6, [[0, '#8a8290'], [1, '#3a3640']]));
    strokePath(ctx, lp, '#0c0a10', 1.3);
  }
}

function quern(ctx: Ctx, r: R): void {
  // the saddle quern: a long boulder, its top worn into a hollow; the rubbing stone resting in it; grain spilled
  const x0 = 76;
  const x1 = 206;
  const by = 758;
  const p: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x0, by);
    c.bezierCurveTo(x0 - 8, by - 14, x0 + 4, by - 28, x0 + 22, by - 30);
    c.quadraticCurveTo((x0 + x1) / 2, by - 22, x1 - 18, by - 31);
    c.bezierCurveTo(x1 - 2, by - 30, x1 + 8, by - 14, x1, by);
    c.closePath();
  };
  groundShadow(ctx, (x0 + x1) / 2 + 6, by, (x1 - x0) * 0.55, 4, 0.6, '#06040a');
  fillPath(ctx, p, lin(ctx, x0, by - 30, x1, by, [[0, '#8a8088'], [0.45, '#5e565e'], [1, '#2a2430']]));
  within(ctx, p, () => {
    texture(ctx, 'speckle', { x: x0 - 10, y: by - 40, w: x1 - x0 + 20, h: 44 }, 0.45, 1, 'overlay');
    // the hollow, smooth and paler from the grinding, floury
    ctx.fillStyle = lin(ctx, 0, by - 30, 0, by - 18, [[0, '#2a2430'], [0.4, '#7a727a'], [1, '#a49ca0']]);
    ctx.beginPath();
    ctx.ellipse((x0 + x1) / 2, by - 25, (x1 - x0) * 0.4, 6, 0, 0, P2);
    ctx.fill();
    ctx.fillStyle = rgba('#e8e0d0', 0.25);
    ctx.beginPath();
    ctx.ellipse((x0 + x1) / 2 + 10, by - 23, (x1 - x0) * 0.25, 3, 0, 0, P2);
    ctx.fill();
    vfill(ctx, x0 - 10, by - 12, x1 - x0 + 20, 14, [[0, 'rgba(6,4,10,0)'], [1, 'rgba(6,4,10,0.5)']]);
  });
  strokePath(ctx, p, '#0c0a10', 1.8);
  // the rubbing stone: a loaf of hard stone, polished on its underside
  const rx = 138;
  const ry = by - 31;
  const rs: PathFn = (c) => {
    c.beginPath();
    c.moveTo(rx - 30, ry + 4);
    c.bezierCurveTo(rx - 32, ry - 6, rx - 18, ry - 12, rx, ry - 12);
    c.bezierCurveTo(rx + 20, ry - 12, rx + 32, ry - 6, rx + 30, ry + 4);
    c.quadraticCurveTo(rx, ry + 8, rx - 30, ry + 4);
    c.closePath();
  };
  castShadow(ctx, rs, 3, 4, 0.5, '#06040a');
  fillPath(ctx, rs, lin(ctx, rx - 30, ry - 12, rx + 20, ry + 8, [[0, '#a09098'], [0.5, '#6a6068'], [1, '#2a2430']]));
  within(ctx, rs, () => texture(ctx, 'speckle', { x: rx - 34, y: ry - 14, w: 68, h: 24 }, 0.4, 0.8, 'overlay'));
  strokePath(ctx, rs, '#0c0a10', 1.5);
  // the grain and the flour spilled at its foot
  for (let i = 0; i < 70; i++) {
    const gx = x0 - 10 + r() * (x1 - x0 + 40);
    const gy = by - 1 + r() * 4;
    ctx.fillStyle = rgba(r() < 0.6 ? '#c8a868' : '#e8dcc0', 0.6);
    ctx.beginPath();
    ctx.ellipse(gx, gy, 1.4, 0.8, r(), 0, P2);
    ctx.fill();
  }
  ctx.fillStyle = rgba('#d8d0c4', 0.2);
  ctx.beginPath();
  ctx.ellipse(x1 + 6, by + 1, 22, 2.5, 0, 0, P2);
  ctx.fill();
}

/** The wild tomato climbing the front post, tied on with grass cord. */
function tomato(ctx: Ctx, r: R): void {
  const px = POSTS[1].x;
  // the vine: two stems winding up round the post
  const stems: Pt[][] = [];
  for (let s = 0; s < 2; s++) {
    const pts: Pt[] = [];
    for (let y = WALL.foot + 2; y > 548 + s * 26; y -= 10) {
      const t = (WALL.foot - y) / 200;
      pts.push([px + Math.sin(t * 6 + s * 2.4) * 11 + (s ? 3 : -3), y]);
    }
    stems.push(pts);
  }
  ctx.lineCap = 'round';
  for (const pts of stems) {
    ctx.strokeStyle = '#2a3a1c';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    smoothLine(ctx, pts);
    ctx.stroke();
    ctx.strokeStyle = rgba('#7a9a5a', 0.4);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    smoothLine(ctx, pts.map(([x, y]) => [x - 0.8, y] as Pt));
    ctx.stroke();
  }
  // the ties
  for (const ty of [700, 640, 590]) {
    ctx.strokeStyle = rgba('#b8a878', 0.75);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(px, ty, POSTS[1].w * 0.6, 2.2, 0, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  // leaves: compound, the leaflets toothed; lit by the sky from the open side
  for (let i = 0; i < 34; i++) {
    const st = stems[i % 2];
    const [sx, sy] = st[Math.floor(r() * st.length)];
    const side = r() < 0.5 ? -1 : 1;
    const a0 = (side < 0 ? Math.PI : 0) + (r() - 0.5) * 0.9 + 0.3 * side;
    const len = 10 + r() * 10;
    for (let k = 0; k < 3; k++) {
      const a = a0 + (k - 1) * 0.6;
      const lx = Math.min(236, sx + Math.cos(a0) * k * 5);
      leaf(ctx, lx, sy + Math.sin(a0) * k * 4, len * (k === 1 ? 1 : 0.75), len * 0.32, a, mix('#2e4a22', '#3e5e2a', r()), '#a0b8a0', 0.35);
    }
  }
  // yellow flowers, and the fruit: cherry-sized, red and some still green
  for (const [fx, fy, n] of [[px - 12, 610, 3], [px + 10, 652, 4], [px - 8, 694, 2], [px + 6, 576, 3]] as const) {
    for (let k = 0; k < n; k++) {
      const tx = fx + (k - n / 2) * 6 + (r() - 0.5) * 3;
      const ty = fy + k * 4 + r() * 3;
      const ripe = r() < 0.75;
      ctx.strokeStyle = '#2a3a1c';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(fx, fy - 6);
      ctx.lineTo(tx, ty - 4);
      ctx.stroke();
      ctx.fillStyle = ripe ? '#b8301c' : '#6a8a2a';
      ctx.beginPath();
      ctx.arc(tx, ty, 4.2, 0, P2);
      ctx.fill();
      ctx.fillStyle = rgba(ripe ? '#ff8a6a' : '#c8e08a', 0.6);
      ctx.beginPath();
      ctx.arc(tx - 1.4, ty - 1.4, 1.5, 0, P2);
      ctx.fill();
      ctx.strokeStyle = rgba('#200604', 0.6);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(tx, ty, 4.2, 0, P2);
      ctx.stroke();
    }
  }
  for (const [fx, fy] of [[px + 12, 596], [px - 14, 668], [px + 4, 560]] as const) {
    ctx.fillStyle = '#e8c83a';
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * P2;
      ctx.beginPath();
      ctx.ellipse(fx + Math.cos(a) * 2.4, fy + Math.sin(a) * 2.4, 2.2, 0.9, a, 0, P2);
      ctx.fill();
    }
  }
}

/** Wild basil at the post's foot: a bushy clump of glossy leaves, white flower spikes. */
function basil(ctx: Ctx, r: R): void {
  const cx = 236;
  const by = WALL.foot + 3;
  groundShadow(ctx, cx + 4, by, 22, 3, 0.5, '#06040a');
  const leaves: [number, number, number, number][] = [];
  for (let i = 0; i < 60; i++) {
    const t = r();
    const y = by - 4 - t * 34;
    const x = cx + (r() - 0.5) * (30 - t * 14);
    leaves.push([x, y, (r() - 0.5) * 2.4 - Math.PI / 2 + (x - cx) * 0.03, 5 + r() * 5]);
  }
  leaves.sort((a, b) => a[1] - b[1]);
  for (const [x, y, a, len] of leaves) leaf(ctx, x, y, len, len * 0.45, a + (r() < 0.5 ? 1.2 : -1.2), mix('#2a4a20', '#3e6a28', r()), '#b8d8a0', 0.45);
  for (let i = 0; i < 4; i++) {
    const x = cx - 12 + i * 8;
    const y0 = by - 30 - r() * 8;
    for (let k = 0; k < 5; k++) {
      ctx.fillStyle = rgba('#e8e4f0', 0.75);
      ctx.beginPath();
      ctx.arc(x + (r() - 0.5) * 2, y0 - k * 3.2, 1.3, 0, P2);
      ctx.fill();
    }
  }
}

// ——— the oven ———

const DOME_PTS: Pt[] = (() => {
  const pts: Pt[] = [];
  const n = 54;
  for (let i = 0; i <= n; i++) {
    const y = PLAT - (i / n) * DOME_H;
    pts.push([HIVE.x - domeHalf(y) + wob(y, 1), y]);
  }
  for (let i = n; i >= 0; i--) {
    const y = PLAT - (i / n) * DOME_H;
    pts.push([HIVE.x + domeHalf(y) + wob(y, 2), y]);
  }
  return pts;
})();
const domePath = polyPath(DOME_PTS);

const mouthPath = (pad = 0): PathFn => (c) => {
  c.beginPath();
  c.moveTo(MOUTH.x - MOUTH.half - pad, PLAT + 1);
  c.lineTo(MOUTH.x - MOUTH.half - pad, MOUTH.spring);
  c.ellipse(MOUTH.x, MOUTH.spring, MOUTH.half + pad, MOUTH.rise + pad, 0, Math.PI, P2);
  c.lineTo(MOUTH.x + MOUTH.half + pad, PLAT + 1);
  c.closePath();
};

function woodpile(ctx: Ctx, r: R): void {
  // logs stacked beside the oven, their ends to us: rounds of branch wood and split halves, lit by the fire from the left
  const rows: [number, number, number][] = [[4, 1838, 0], [3, 1850, 1], [3, 1846, 2], [2, 1860, 3], [1, 1872, 4]];
  const lw = 24;
  groundShadow(ctx, 1882, WALL.foot, 76, 6, 0.6, '#06040a');
  for (const [n, x0, k] of rows) {
    const y = WALL.foot - 11 - k * lw * 0.82;
    for (let i = 0; i < n; i++) {
      const x = x0 + i * (lw - 1) + (r() - 0.5) * 3;
      logEnd(ctx, r, x, y + (r() - 0.5) * 2, lw * 0.5 * (0.82 + r() * 0.3), r() < 0.35);
    }
  }
}

function logEnd(ctx: Ctx, r: R, x: number, y: number, rad: number, split: boolean): void {
  // a round (or a split half, its flat face down) seen end-on: bark round it, pale wood with rings and a check
  const rot = split ? (r() - 0.5) * 0.4 : 0;
  const p: PathFn = (c) => {
    c.beginPath();
    if (split) {
      c.ellipse(x, y + rad * 0.3, rad, rad * 0.95, rot, Math.PI, P2);
      c.closePath();
    } else c.ellipse(x, y, rad, rad * 0.95, 0, 0, P2);
  };
  castShadow(ctx, p, 4, 5, 0.55, '#06040a');
  fillPath(ctx, p, '#2a1a10');
  const fy = split ? y + rad * 0.3 : y;
  const fr = rad - 2.6;
  const face: PathFn = (c) => {
    c.beginPath();
    if (split) {
      c.ellipse(x, fy, fr, fr * 0.95, rot, Math.PI, P2);
      c.closePath();
    } else c.ellipse(x, fy, fr, fr * 0.95, 0, 0, P2);
  };
  fillPath(ctx, face, lin(ctx, x - fr, fy - fr, x + fr, fy + fr, [[0, '#d8b080'], [0.55, '#a07a50'], [1, '#4a3018']]));
  within(ctx, face, () => {
    ctx.strokeStyle = rgba('#5a3a1c', 0.4);
    ctx.lineWidth = 0.7;
    for (let k = 1; k < 5; k++) {
      ctx.beginPath();
      ctx.ellipse(x + 0.6, fy + 0.4, (fr * k) / 5, (fr * k * 0.95) / 5, 0, 0, P2);
      ctx.stroke();
    }
    ctx.strokeStyle = rgba('#1a0c04', 0.55);
    ctx.lineWidth = 1.1;
    const ca = r() * P2;
    ctx.beginPath();
    ctx.moveTo(x, fy);
    ctx.lineTo(x + Math.cos(ca) * fr, fy + Math.sin(ca) * fr);
    ctx.stroke();
    // the fire's light on the faces (from the left), the right edge in shade
    ctx.fillStyle = lin(ctx, x - fr, 0, x + fr, 0, [[0, rgba(FIREC, 0.25)], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(10,4,2,0.3)']]);
    ctx.fillRect(x - fr, fy - fr, fr * 2, fr * 2);
  });
  strokePath(ctx, p, '#0e0804', 1.2);
}

function oven(ctx: Ctx, r: R): void {
  const x = HIVE.x;
  // the platform: a low plinth of flat stones the oven stands on, the apron before the mouth
  const plat: PathFn = (c) => {
    c.beginPath();
    c.moveTo(1436, PLAT + 2);
    c.lineTo(1440, PLAT - 6);
    c.lineTo(1898, PLAT - 6);
    c.lineTo(1904, PLAT + 2);
    c.lineTo(1904, TY + 4);
    c.lineTo(1436, TY + 4);
    c.closePath();
  };
  groundShadow(ctx, x + 30, TY - 2, 260, 8, 0.55, '#06040a');
  fillPath(ctx, plat, '#2a2228');
  within(ctx, plat, () => {
    let sx = 1430;
    while (sx < 1904) {
      const w = 26 + r() * 40;
      stone(ctx, r, sx, PLAT + 1, w, 9 + r() * 4, shade('#5a4e50', (r() - 0.5) * 0.15));
      sx += w + 2;
    }
    // the top of the plinth, lit from the mouth
    ctx.fillStyle = lin(ctx, 0, PLAT - 6, 0, PLAT + 2, [[0, '#6a5a58'], [1, '#3a3034']]);
    ctx.fillRect(1436, PLAT - 6, 470, 8);
    lightPool(ctx, x, PLAT, 260, 40, FIREC, 0.35, 'lighter');
  });
  // the dome: clay daubed over stones by hand
  castShadow(ctx, domePath, 16, 22, 0.4, '#06040a');
  const box = { x: x - DOME_R - 10, y: CROWN - 20, w: DOME_R * 2 + 20, h: DOME_H + 30 };
  fillPath(ctx, domePath, CLAY);
  within(ctx, domePath, () => {
    surface(ctx, r, box, CLAY, { over: true, vary: 0.6, cells: 4, mottle: 0.5, strokes: 0.3, strokeAng: 0, strokeLen: 60, strokeW: 10, grain: 0.22, grainKind: 'speckle', seed: 141, warm: '#9a6a4a', cool: '#3a2a38' });
    lay(ctx, drift('#8a5e44', '#2a1a16', 6, 143, 90, 80), box, 0.45);
    // the daub pressed on in handfuls: lumps, each lit on its upper left and shadowed below right
    for (let i = 0; i < 150; i++) {
      const ly = CROWN + 20 + r() * (DOME_H - 40);
      const hw = domeHalf(ly);
      const lx = HIVE.x + (r() * 2 - 1) * hw * 0.92;
      const s = 7 + r() * 13;
      const g1 = ctx.createRadialGradient(lx - s * 0.35, ly - s * 0.35, 0, lx - s * 0.35, ly - s * 0.35, s);
      g1.addColorStop(0, rgba('#c8987a', 0.12 + r() * 0.06));
      g1.addColorStop(1, 'rgba(200,152,122,0)');
      ctx.fillStyle = g1;
      ctx.fillRect(lx - s * 1.4, ly - s * 1.4, s * 2.8, s * 2.8);
      const g2 = ctx.createRadialGradient(lx + s * 0.4, ly + s * 0.45, 0, lx + s * 0.4, ly + s * 0.45, s);
      g2.addColorStop(0, rgba('#1a0c08', 0.16 + r() * 0.06));
      g2.addColorStop(1, 'rgba(26,12,8,0)');
      ctx.fillStyle = g2;
      ctx.fillRect(lx - s, ly - s, s * 2.6, s * 2.6);
    }
    // the crazing of clay that has dried and been fired over and over
    lay(ctx, noiseMask(22, 147, { kind: 'web', cover: 0.35, soft: 0.06, col: '#1a0c08', w: 200, h: 180 }), box, 0.22);
    // finger marks: the daub smoothed round the dome in sweeps
    ctx.lineCap = 'round';
    for (let i = 0; i < 70; i++) {
      const yy = CROWN + 16 + r() * (DOME_H - 30);
      const hw = domeHalf(yy);
      const u0 = -0.9 + r() * 1.4;
      const u1 = Math.min(0.95, u0 + 0.15 + r() * 0.35);
      ctx.strokeStyle = rgba(r() < 0.5 ? '#c09070' : '#2a160c', 0.08 + r() * 0.1);
      ctx.lineWidth = 2 + r() * 5;
      ctx.beginPath();
      for (let k = 0; k <= 8; k++) {
        const u = u0 + ((u1 - u0) * k) / 8;
        const px = x + u * hw;
        const py = yy + Math.sqrt(Math.max(0, 1 - u * u)) * hw * 0.1;
        if (k) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.stroke();
    }
    // the stones under the daub where it has fallen away near the foot
    for (const [cx, cy, rx, ry] of [[x - 158, 716, 40, 22], [x + 146, 704, 46, 30]] as const) daubGone(ctx, r, cx, cy, rx, ry);
    // the volume: the sky's cool light on the crown and the left shoulder, the right side into shade
    const fg = ctx.createRadialGradient(x - 90, CROWN + 100, 10, x - 40, CROWN + 160, 380);
    fg.addColorStop(0, rgba('#a8a0c8', 0.3));
    fg.addColorStop(0.35, rgba('#a8a0c8', 0.06));
    fg.addColorStop(0.7, 'rgba(14,8,14,0.35)');
    fg.addColorStop(1, 'rgba(14,8,14,0.72)');
    ctx.fillStyle = fg;
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.fillStyle = lin(ctx, x - DOME_R, 0, x + DOME_R, 0, [[0, 'rgba(10,6,14,0.1)'], [0.4, 'rgba(0,0,0,0)'], [0.62, 'rgba(10,6,14,0.08)'], [1, 'rgba(10,6,14,0.55)']]);
    ctx.fillRect(box.x, box.y, box.w, box.h);
    // the sky's sheen across the upper left shoulder (a broad soft highlight on a rough round surface)
    ctx.save();
    ctx.translate(x - 74, CROWN + 96);
    ctx.rotate(-0.5);
    ctx.scale(1, 0.55);
    const sh = ctx.createRadialGradient(0, 0, 0, 0, 0, 120);
    sh.addColorStop(0, rgba('#c8c4e8', 0.2));
    sh.addColorStop(0.6, rgba('#c8c4e8', 0.07));
    sh.addColorStop(1, 'rgba(200,196,232,0)');
    ctx.fillStyle = sh;
    ctx.fillRect(-130, -130, 260, 260);
    ctx.restore();
    // soot fanned up the front over the mouth, and round the smoke hole
    softly(ctx, box, (g) => {
      g.save();
      g.translate(x, MOUTH.spring - MOUTH.rise + 10);
      g.scale(1, 1.5);
      const sg = g.createRadialGradient(0, 0, 10, 0, -40, 150);
      sg.addColorStop(0, 'rgba(12,6,6,0.85)');
      sg.addColorStop(0.5, 'rgba(12,6,6,0.4)');
      sg.addColorStop(1, 'rgba(12,6,6,0)');
      g.fillStyle = sg;
      g.beginPath();
      g.moveTo(-MOUTH.half * 0.9, 30);
      g.quadraticCurveTo(-150, -110, -40, -190);
      g.lineTo(40, -190);
      g.quadraticCurveTo(150, -110, MOUTH.half * 0.9, 30);
      g.closePath();
      g.fill();
      g.restore();
      const hg = g.createRadialGradient(HOLE.x, CROWN + 6, 0, HOLE.x, CROWN + 6, 70);
      hg.addColorStop(0, 'rgba(12,6,6,0.75)');
      hg.addColorStop(1, 'rgba(12,6,6,0)');
      g.fillStyle = hg;
      g.fillRect(HOLE.x - 80, CROWN - 20, 160, 100);
    }, 0.25);
    // the fire's light on the dome's front round the mouth, warm from below
    lightPool(ctx, x, PLAT - 20, 230, 150, FIREC, 0.26, 'lighter');
    lightPool(ctx, x, PLAT - 4, 150, 60, '#ffb060', 0.25, 'lighter');
    // cracks where the heat works on it: from the arch's shoulders, and one long one mended with fresh clay
    for (const [cx, cy, a, l] of [[x - MOUTH.half - 18, MOUTH.spring - 30, -2.2, 60], [x + MOUTH.half + 16, MOUTH.spring - 40, -0.9, 70], [x + 110, 470, -1.2, 60]] as const) {
      crack(ctx, r, cx, cy, a, l, { col: '#1a0a06', lip: '#c89a78', w: 1.6, a: 0.6, branch: 0.18 });
    }
    ctx.strokeStyle = rgba('#7a5440', 0.35);
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x - 130, 560);
    ctx.quadraticCurveTo(x - 110, 520, x - 120, 470);
    ctx.stroke();
  });
  rim(ctx, domePath, 0.35, 5, '#8a9ae0');
  strokePath(ctx, domePath, '#140a08', 2.6);
  // the smoke hole's collar at the crown: a thick lip of clay, black with soot, the hole glowing faintly
  const col: PathFn = (c) => {
    c.beginPath();
    c.moveTo(HOLE.x - HOLE.rx - 10, CROWN + 14);
    c.quadraticCurveTo(HOLE.x - HOLE.rx - 2, CROWN + 6, HOLE.x - HOLE.rx, HOLE.y + 1);
    c.ellipse(HOLE.x, HOLE.y, HOLE.rx, HOLE.ry, 0, Math.PI, 0, false);
    c.quadraticCurveTo(HOLE.x + HOLE.rx + 2, CROWN + 6, HOLE.x + HOLE.rx + 10, CROWN + 14);
    c.quadraticCurveTo(HOLE.x, CROWN + 22, HOLE.x - HOLE.rx - 10, CROWN + 14);
    c.closePath();
  };
  fillPath(ctx, col, lin(ctx, HOLE.x - HOLE.rx, 0, HOLE.x + HOLE.rx, 0, [[0, '#4a3428'], [0.4, '#2a1a16'], [1, '#100808']]));
  within(ctx, col, () => {
    lay(ctx, drift('#5a4030', '#080404', 3, 157, 30, 20), { x: HOLE.x - 40, y: HOLE.y - 10, w: 80, h: 40 }, 0.5);
    ctx.fillStyle = lin(ctx, 0, HOLE.y, 0, CROWN + 20, [[0, rgba(SKYLIT, 0.16)], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.3)']]);
    ctx.fillRect(HOLE.x - 40, HOLE.y - 8, 80, 40);
  });
  strokePath(ctx, col, '#0a0404', 1.6);
  // the hole: dark, the fire's glow far down in it
  const hole: PathFn = (c) => {
    c.beginPath();
    c.ellipse(HOLE.x, HOLE.y, HOLE.rx - 6, HOLE.ry - 2.4, 0, 0, P2);
  };
  fillPath(ctx, hole, lin(ctx, 0, HOLE.y - HOLE.ry, 0, HOLE.y + HOLE.ry, [[0, '#060202'], [0.6, '#2a0c06'], [1, '#8a3410']]));
  // the lip's top, lit by the sky at the front
  ctx.strokeStyle = rgba('#8a7470', 0.6);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(HOLE.x, HOLE.y, HOLE.rx - 3, HOLE.ry - 1.2, 0, Math.PI * 0.08, Math.PI * 0.92);
  ctx.stroke();
  ctx.strokeStyle = rgba('#0a0404', 0.7);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(HOLE.x, HOLE.y, HOLE.rx, HOLE.ry, 0, Math.PI, P2);
  ctx.stroke();
  // the mouth
  mouth(ctx, r);
  // the apron: a great flat slab before the mouth, ash on it, the fire's light across it
  const apron: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - MOUTH.half - 26, PLAT - 2);
    c.lineTo(x + MOUTH.half + 30, PLAT - 3);
    c.lineTo(x + MOUTH.half + 44, TY + 4);
    c.lineTo(x - MOUTH.half - 40, TY + 4);
    c.closePath();
  };
  fillPath(ctx, apron, lin(ctx, 0, PLAT - 3, 0, TY, [[0, '#8a7068'], [0.3, '#5e4e4c'], [1, '#2a2226']]));
  within(ctx, apron, () => {
    texture(ctx, 'speckle', { x: x - 150, y: PLAT - 6, w: 300, h: 30 }, 0.5, 1, 'overlay');
    lightPool(ctx, x, PLAT + 2, 150, 18, '#ffb060', 0.55, 'lighter');
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = rgba(r() < 0.7 ? '#a8a0a0' : '#ff8a3a', r() < 0.7 ? 0.25 : 0.6);
      ctx.beginPath();
      ctx.ellipse(x - 80 + r() * 160, PLAT + r() * 12, 1 + r() * 2.5, 0.6 + r(), 0, 0, P2);
      ctx.fill();
    }
  });
  strokePath(ctx, apron, '#120a08', 1.4);
}

/** Where the daub has fallen away: the stones under it, the broken edge of the clay round them. */
function daubGone(ctx: Ctx, r: R, cx: number, cy: number, rx: number, ry: number): void {
  const pts: Pt[] = [];
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * P2;
    const k = 0.75 + r() * 0.35;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  const p = smoothPath(pts);
  fillPath(ctx, p, '#1a1012');
  within(ctx, p, () => {
    // the stones packed under the daub, in rough courses, bedded in clay
    for (let yy = cy - ry - 4; yy < cy + ry + 6; yy += 9 + r() * 3) {
      for (let xx = cx - rx - 6 - r() * 8; xx < cx + rx + 8; xx += 11 + r() * 6) {
        const s = 5 + r() * 3.5;
        const sx = xx + s;
        const sy = yy + (r() - 0.5) * 2;
        const sp: PathFn = (c) => {
          c.beginPath();
          c.ellipse(sx, sy, s, s * 0.62, (r() - 0.5) * 0.5, 0, P2);
        };
        const base = mix('#6a5c5a', r() < 0.5 ? '#5a4436' : '#4a4652', r() * 0.6);
        fillPath(ctx, sp, lin(ctx, sx - s, sy - s, sx + s * 0.6, sy + s, [[0, shade(base, 0.18)], [0.55, base], [1, '#140c0e']]));
      }
    }
    ctx.fillStyle = rgba('#3a2418', 0.25);
    ctx.fillRect(cx - rx - 10, cy - ry - 10, rx * 2 + 20, ry * 2 + 20);
  });
  // the clay's broken lip: lit along its lower edge (it stands proud), a shadow inside its upper edge
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = rgba('#c89a78', 0.45);
  ctx.beginPath();
  ctx.ellipse(cx + 1, cy + 1.5, rx * 0.86, ry * 0.86, 0, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.strokeStyle = rgba('#0a0404', 0.5);
  ctx.beginPath();
  ctx.ellipse(cx, cy - 1, rx * 0.84, ry * 0.84, 0, Math.PI + 0.2, P2 - 0.2);
  ctx.stroke();
  ctx.restore();
}

function mouth(ctx: Ctx, r: R): void {
  const x = MOUTH.x;
  const inner = mouthPath(0);
  // the chamber: dark, its back wall and roof lit by the fire, the floor rising away from the sill
  fillPath(ctx, inner, '#120604');
  within(ctx, inner, () => {
    const bg = ctx.createRadialGradient(FIRE.x, FIRE.y - 20, 4, FIRE.x, FIRE.y - 30, 170);
    bg.addColorStop(0, '#ffb04a');
    bg.addColorStop(0.25, '#e0602a');
    bg.addColorStop(0.6, '#6a1c0c');
    bg.addColorStop(1, '#1a0604');
    ctx.fillStyle = bg;
    ctx.fillRect(x - MOUTH.half, MOUTH.spring - MOUTH.rise, MOUTH.half * 2, PLAT - MOUTH.spring + MOUTH.rise + 2);
    // the inside of the dome: fired clay, blackened high up, glowing near the fire
    lay(ctx, drift('#ff9a4a', '#2a0804', 4, 151, 60, 50), { x: x - MOUTH.half, y: MOUTH.spring - MOUTH.rise, w: MOUTH.half * 2, h: PLAT - MOUTH.spring + MOUTH.rise }, 0.35);
    ctx.fillStyle = lin(ctx, 0, MOUTH.spring - MOUTH.rise, 0, MOUTH.spring + 10, [[0, 'rgba(12,4,2,0.7)'], [1, 'rgba(12,4,2,0)']]);
    ctx.fillRect(x - MOUTH.half, MOUTH.spring - MOUTH.rise, MOUTH.half * 2, MOUTH.rise + 10);
    // the floor: from the sill back to the fire
    ctx.fillStyle = lin(ctx, 0, PLAT - 26, 0, PLAT, [[0, '#ff9a4a'], [0.4, '#a0401a'], [1, '#3a140a']]);
    ctx.beginPath();
    ctx.moveTo(x - MOUTH.half, PLAT + 1);
    ctx.lineTo(x - MOUTH.half + 14, PLAT - 26);
    ctx.lineTo(x + MOUTH.half - 14, PLAT - 26);
    ctx.lineTo(x + MOUTH.half, PLAT + 1);
    ctx.closePath();
    ctx.fill();
    // the coals: a bed of embers at the back, crusted dark, glowing in the cracks
    for (let i = 0; i < 46; i++) {
      const cx = FIRE.x - 56 + r() * 112;
      const cy = PLAT - 22 + r() * 8;
      const s = 3 + r() * 6;
      ctx.fillStyle = r() < 0.4 ? '#2a0e08' : mix('#ff7a2a', '#ffd070', r());
      ctx.beginPath();
      ctx.ellipse(cx, cy, s, s * 0.55, 0, 0, P2);
      ctx.fill();
    }
    // the flatbread baking on the floor in front of the coals: the first pizza
    const fx = x - 46;
    const fy = PLAT - 9;
    groundShadow(ctx, fx + 2, fy + 3, 32, 4, 0.5, '#200804');
    const fb: PathFn = (c) => {
      c.beginPath();
      c.ellipse(fx, fy, 30, 7, -0.03, 0, P2);
    };
    fillPath(ctx, fb, lin(ctx, 0, fy - 7, 0, fy + 7, [[0, '#ffd890'], [0.5, '#d8a050'], [1, '#7a4a20']]));
    within(ctx, fb, () => {
      // the char of the stones, a smear of crushed tomato and torn basil on it
      for (let i = 0; i < 9; i++) {
        ctx.fillStyle = rgba('#2a1004', 0.55);
        ctx.beginPath();
        ctx.ellipse(fx - 24 + r() * 48, fy - 4 + r() * 8, 1.5 + r() * 2.5, 1, 0, 0, P2);
        ctx.fill();
      }
      ctx.fillStyle = rgba('#c8301a', 0.75);
      ctx.beginPath();
      ctx.ellipse(fx + 2, fy - 1, 18, 3.6, 0, 0, P2);
      ctx.fill();
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = '#3a6a28';
        ctx.beginPath();
        ctx.ellipse(fx - 10 + i * 7, fy - 2 + (i % 2), 2.6, 1.2, i, 0, P2);
        ctx.fill();
      }
    });
    strokePath(ctx, fb, '#2a1006', 1);
    // a rim of the fire's light round the chamber's mouth (the walls' thickness, lit from inside)
    ctx.strokeStyle = rgba('#ff9a4a', 0.4);
    ctx.lineWidth = 6;
    mouthPath(-2)(ctx);
    ctx.stroke();
  });
  // the arch: rough field stones of every size set round the mouth in the clay, their inner faces lit by the fire,
  // their tops blackened by the smoke that rolls out over them
  let a = Math.PI;
  while (a < P2 - 0.05) {
    const span = Math.min(P2 - a, 0.2 + r() * 0.2);
    const a0 = a + 0.015;
    const a1 = a + span - 0.015;
    const depth = 18 + r() * 14;
    const ex = (q: number, d: number): Pt => [x + Math.cos(q) * (MOUTH.half + 2 + d), MOUTH.spring + Math.sin(q) * (MOUTH.rise + 2 + d * 1.1)];
    voussoir(ctx, r, [ex(a0, 0), ex(a1, 0), ex(a1, depth), ex(a0, depth)], (a0 + a1) / 2);
    a += span;
  }
  // the jambs: blocks of differing heights
  for (const s of [-1, 1]) {
    let y0 = MOUTH.spring + 1;
    while (y0 < PLAT - 6) {
      const hh = Math.min(PLAT - 2 - y0, 16 + r() * 14);
      const xi = x + s * (MOUTH.half + 2);
      const xo = x + s * (MOUTH.half + 20 + r() * 14);
      voussoir(ctx, r, [[xi, y0], [xi, y0 + hh], [xo, y0 + hh], [xo, y0]], s < 0 ? Math.PI : 0);
      y0 += hh + 1;
    }
  }
  // the sill: one long threshold stone, polished by the peel
  const sill: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - MOUTH.half - 6, PLAT - 5);
    c.lineTo(x + MOUTH.half + 6, PLAT - 6);
    c.lineTo(x + MOUTH.half + 8, PLAT + 3);
    c.lineTo(x - MOUTH.half - 8, PLAT + 4);
    c.closePath();
  };
  fillPath(ctx, sill, lin(ctx, 0, PLAT - 6, 0, PLAT + 4, [[0, '#d8a070'], [0.3, '#7a5a4a'], [1, '#2a1e1e']]));
  strokePath(ctx, sill, '#120806', 1.3);
}

function voussoir(ctx: Ctx, r: R, pts: Pt[], ang = 0): void {
  const j = pts.map(([px, py]) => [px + (r() - 0.5) * 3, py + (r() - 0.5) * 3] as Pt);
  const bulge = (a: Pt, b: Pt, k: number): Pt => [(a[0] + b[0]) / 2 + (r() - 0.5) * k, (a[1] + b[1]) / 2 + (r() - 0.5) * k];
  const p = smoothPath([j[0], bulge(j[0], j[1], 3), j[1], bulge(j[1], j[2], 5), j[2], bulge(j[2], j[3], 6), j[3], bulge(j[3], j[0], 5)]);
  const cx = (j[0][0] + j[1][0] + j[2][0] + j[3][0]) / 4;
  const cy = (j[0][1] + j[1][1] + j[2][1] + j[3][1]) / 4;
  const base = mix('#6a5c5a', r() < 0.4 ? '#7a5a42' : r() < 0.5 ? '#4e4c5c' : '#5e5250', 0.3 + r() * 0.5);
  void ang;
  fillPath(ctx, p, lin(ctx, cx - 16, cy - 16, cx + 16, cy + 16, [[0, shade(base, 0.14)], [0.5, base], [1, shade(base, -0.55)]]));
  within(ctx, p, () => texture(ctx, 'speckle', { x: cx - 24, y: cy - 24, w: 48, h: 48 }, 0.4, 0.8, 'overlay'));
  within(ctx, p, () => {
    // the fire's light on the faces turned to the mouth
    const ix = (j[0][0] + j[1][0]) / 2;
    const iy = (j[0][1] + j[1][1]) / 2;
    const g = ctx.createRadialGradient(ix, iy, 0, ix, iy, 16);
    g.addColorStop(0, rgba('#ff9a4a', 0.55));
    g.addColorStop(1, 'rgba(255,154,74,0)');
    ctx.fillStyle = g;
    ctx.fillRect(ix - 16, iy - 16, 32, 32);
    // soot, heaviest at the crown of the arch
    const sootA = clamp01((MOUTH.spring - cy) / MOUTH.rise) * 0.6;
    ctx.fillStyle = rgba('#0a0404', 0.15 + sootA * 0.5);
    ctx.fillRect(cx - 24, cy - 26, 48, 22);
  });
  strokePath(ctx, p, '#0e0806', 1.3);
}

function fireStill(ctx: Ctx): void {
  ctx.save();
  mouthPath(-3)(ctx);
  ctx.clip();
  fireFrame(ctx, FIRE.x, FIRE.y, FIRE.w, FIRE.h, 0.3, { tongues: 5, seed: 1.3 });
  ctx.restore();
  glowAt(ctx, MOUTH.x, PLAT - 40, 150, FIREC, 0.18);
}

/** The first peel of all: split from one board, the adze's facets on it, charred at its working edge. */
const PEEL = { foot: [1458, 754] as Pt, top: [1520, 470] as Pt };
function peel(ctx: Ctx, r: R): void {
  const [fx, fy] = PEEL.foot;
  const [tx, ty] = PEEL.top;
  const ang = Math.atan2(tx - fx, -(ty - fy));
  const L = Math.hypot(tx - fx, ty - fy);
  ctx.save();
  ctx.translate(fx, fy);
  ctx.rotate(ang);
  // local: y up the handle (negative), x across
  const bw = 38;
  const bh = 104;
  const hw = 7;
  const p: PathFn = (c) => {
    c.beginPath();
    c.moveTo(-bw + 4, 0);
    c.quadraticCurveTo(-bw - 2, -bh * 0.5, -bw + 2, -bh * 0.86);
    c.quadraticCurveTo(-bw * 0.4, -bh - 6, -hw - 1, -bh - 14);
    c.lineTo(-hw + 1, -L + 8);
    c.quadraticCurveTo(-hw - 2, -L - 4, 0, -L - 6);
    c.quadraticCurveTo(hw + 2, -L - 4, hw - 1, -L + 8);
    c.lineTo(hw + 1, -bh - 14);
    c.quadraticCurveTo(bw * 0.4, -bh - 6, bw - 2, -bh * 0.86);
    c.quadraticCurveTo(bw + 2, -bh * 0.5, bw - 4, 0);
    c.quadraticCurveTo(0, 3, -bw + 4, 0);
    c.closePath();
  };
  ctx.restore();
  const world: PathFn = (c) => {
    c.save();
    c.translate(fx, fy);
    c.rotate(ang);
    p(c);
    c.restore();
  };
  castShadow(ctx, world, 12, 12, 0.5, '#06040a');
  groundShadow(ctx, fx + 8, fy + 1, 40, 4, 0.55, '#06040a');
  ctx.save();
  ctx.translate(fx, fy);
  ctx.rotate(ang);
  fillPath(ctx, p, lin(ctx, -bw, 0, bw, 0, [[0, '#8e6844'], [0.45, '#664428'], [1, '#2a1a0c']]));
  within(ctx, p, () => {
    // the grain running up the board
    ctx.lineCap = 'round';
    for (let i = 0; i < 40; i++) {
      const gx = -bw + r() * bw * 2;
      const gy0 = -r() * L;
      ctx.strokeStyle = rgba(r() < 0.6 ? '#2a1808' : '#c8a070', 0.18 + r() * 0.12);
      ctx.lineWidth = 0.7 + r() * 0.8;
      ctx.beginPath();
      ctx.moveTo(gx, gy0);
      ctx.quadraticCurveTo(gx + (r() - 0.5) * 4, gy0 - 30, gx + (r() - 0.5) * 3, gy0 - 60 - r() * 60);
      ctx.stroke();
    }
    // the adze's facets across the blade
    for (let k = 0; k < 6; k++) {
      const yy = -10 - k * 16 - r() * 6;
      ctx.fillStyle = rgba(k % 2 ? '#d8b080' : '#1a0c04', 0.08);
      ctx.beginPath();
      ctx.ellipse(-4 + (r() - 0.5) * 10, yy, bw * 0.9, 8, (r() - 0.5) * 0.2, 0, P2);
      ctx.fill();
    }
    // charred at the working edge, flour on the blade
    ctx.fillStyle = lin(ctx, 0, 0, 0, -26, [[0, 'rgba(14,6,2,0.85)'], [1, 'rgba(14,6,2,0)']]);
    ctx.fillRect(-bw - 4, -28, bw * 2 + 8, 30);
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = rgba('#e0d6c8', 0.06 + r() * 0.06);
      ctx.beginPath();
      ctx.ellipse(-bw * 0.6 + r() * bw * 1.2, -30 - r() * 60, 2 + r() * 5, 1 + r() * 2, r(), 0, P2);
      ctx.fill();
    }
    // the handle polished by hands
    ctx.fillStyle = rgba('#e8c8a0', 0.22);
    ctx.fillRect(-hw + 1, -L + 20, 3, L * 0.35);
  });
  strokePath(ctx, p, '#160a04', 1.8);
  ctx.restore();
  // the fire's light on the edge turned to the mouth
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(fx + 40, fy - 30, 0, fx + 40, fy - 30, 70);
  g.addColorStop(0, rgba(FIREC, 0.25));
  g.addColorStop(1, 'rgba(255,138,58,0)');
  ctx.fillStyle = g;
  within(ctx, world, () => ctx.fillRect(fx - 40, fy - 110, 120, 120));
  ctx.restore();
}

// ——— the tree fern ———

function fernTrunk(ctx: Ctx, r: R): void {
  const [tx, ty] = FERN_TOP;
  const [fx, fy] = FERN_FOOT;
  const w0 = 30;
  const w1 = 20;
  const cx = (tx + fx) / 2 + 10;
  const cy = (ty + fy) / 2;
  const q = (t: number): Pt => [(1 - t) ** 2 * tx + 2 * (1 - t) * t * cx + t * t * fx, (1 - t) ** 2 * ty + 2 * (1 - t) * t * cy + t * t * fy];
  const L: Pt[] = [];
  const Rr: Pt[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const [x, y] = q(t);
    const w = w1 + (w0 - w1) * t;
    L.push([x - w / 2, y]);
    Rr.push([x + w / 2, y]);
  }
  const p = polyPath([...L, ...Rr.reverse()]);
  castShadow(ctx, p, 8, 12, 0.4, '#06040a');
  fillPath(ctx, p, '#1e140e');
  within(ctx, p, () => {
    // the old frond bases in a spiral, each lit on its upper edge
    for (let i = 0; i < 210; i++) {
      const t = r();
      const [x, y] = q(t);
      const w = w1 + (w0 - w1) * t;
      const sx = x + (r() - 0.5) * w * 1.1;
      const s = 3 + r() * 5;
      ctx.fillStyle = rgba('#0a0604', 0.7);
      ctx.beginPath();
      ctx.ellipse(sx + 1, y + 2, s, s * 0.6, 0, 0, P2);
      ctx.fill();
      ctx.fillStyle = rgba(mix('#4a3420', '#6a4c2c', r()), 0.7);
      ctx.beginPath();
      ctx.ellipse(sx, y, s, s * 0.5, 0, Math.PI, P2);
      ctx.fill();
    }
    ctx.fillStyle = lin(ctx, fx - w0, 0, fx + w0, 0, [[0, rgba(FIREC, 0.22)], [0.45, 'rgba(0,0,0,0.05)'], [1, 'rgba(4,2,6,0.6)']]);
    ctx.fillRect(fx - 60, ty, 120, fy - ty);
    vfill(ctx, fx - 60, ty, 120, 50, [[0, 'rgba(4,2,4,0.7)'], [1, 'rgba(4,2,4,0)']]);
  });
  strokePath(ctx, p, rgba('#050304', 0.85), 1.5);
}

/** The crown: fronds springing from the trunk's top, arching out and drooping, pinnae either side, back to front. */
function crown(ctx: Ctx, r: R): void {
  const [tx, ty] = FERN_TOP;
  const fronds: { a: number; L: number; near: number; droop: number }[] = [];
  const n = 13;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI * 1.02 + ((i + 0.5) / n) * Math.PI * 1.25 + (r() - 0.5) * 0.2;
    fronds.push({ a, L: 170 * (0.8 + r() * 0.35), near: r(), droop: 0.5 + r() * 0.6 });
  }
  for (let i = 0; i < 3; i++) fronds.push({ a: Math.PI * 0.55 + (r() - 0.5) * 0.8, L: 70 + r() * 30, near: -1, droop: 1.6 });
  fronds.sort((p, q2) => p.near - q2.near);
  for (const fr of fronds) {
    const dead = fr.near < 0;
    const ca = Math.cos(fr.a);
    const sa = Math.sin(fr.a);
    const L = fr.L;
    const ex = tx + ca * L * 0.95;
    const ey = ty + (sa + 0.35) * L * 0.4 + L * 0.08 * fr.droop;
    const cx = tx + ca * L * 0.5;
    const cy = ty + sa * L * 0.6 - L * 0.22;
    const q = (t: number): Pt => [(1 - t) ** 2 * tx + 2 * (1 - t) * t * cx + t * t * ex, (1 - t) ** 2 * ty + 2 * (1 - t) * t * cy + t * t * ey];
    const depth = dead ? 0 : fr.near;
    const dark = dead ? '#160e08' : mix('#0a120e', '#121e14', depth);
    const mid = dead ? '#2a1c0e' : mix('#1a2a1c', '#26402a', depth);
    const lit = dead ? '#5a3a1c' : mix('#4a6a5a', '#7a9a80', depth);
    const n2 = Math.round(L / 7);
    for (let k = 2; k < n2; k++) {
      const t = k / n2;
      const [px, py] = q(t);
      const [qx, qy] = q(Math.min(1, t + 0.01));
      const dx = qx - px;
      const dy = qy - py;
      const l = Math.hypot(dx, dy) || 1;
      const ux = dx / l;
      const uy = dy / l;
      const ll = L * 0.15 * Math.sin(Math.min(1, t * 1.5) * Math.PI * 0.5 + 0.25) * (1 - t * 0.75) * (dead ? 0.6 : 1);
      for (const s of [-1, 1]) {
        const nx = -uy * s;
        const ny = ux * s;
        const lx = px + nx * ll + ux * ll * 0.45;
        const ly = py + ny * ll * 0.7 + ll * 0.3;
        // the side facing the sky (up) and the dawn (left) lit
        const facing = -ny * 0.6 - nx * 0.4;
        const tone = clamp01(0.35 + facing * 0.5 + (r() - 0.5) * 0.3);
        const col = tone < 0.55 ? mix(dark, mid, tone / 0.55) : mix(mid, lit, ((tone - 0.55) / 0.45) * (0.4 + depth * 0.6));
        const pw = Math.max(1.4, ll * 0.16);
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.quadraticCurveTo((px + lx) / 2 - ny * pw * 0.4, (py + ly) / 2 + nx * pw * 0.4 - ll * 0.08, lx, ly);
        ctx.quadraticCurveTo((px + lx) / 2 + ny * pw * 0.4, (py + ly) / 2 - nx * pw * 0.4 - ll * 0.04, px, py);
        ctx.fill();
        ctx.strokeStyle = col;
        ctx.lineWidth = Math.max(1, pw * 0.7);
        ctx.lineCap = 'round';
        const m2 = Math.max(2, Math.round(ll / 9));
        for (let jj = 1; jj <= m2; jj++) {
          const v = jj / (m2 + 1);
          const bx = px + (lx - px) * v;
          const by = py + (ly - py) * v - Math.sin(v * Math.PI) * ll * 0.06;
          const pl = pw * 1.6 * (1 - v * 0.5);
          for (const z of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.lineTo(bx - ny * z * pl + ((lx - px) / ll) * pl * 0.5, by + nx * z * pl + ((ly - py) / ll) * pl * 0.5);
            ctx.stroke();
          }
        }
      }
    }
    ctx.strokeStyle = dead ? '#2a1a0c' : mix('#16241a', '#2e4430', depth);
    ctx.lineWidth = Math.max(1.5, L * 0.012);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(cx, cy, ex, ey);
    ctx.stroke();
  }
  const hg = ctx.createRadialGradient(tx, ty + 6, 0, tx, ty + 6, 40);
  hg.addColorStop(0, 'rgba(4,6,4,0.8)');
  hg.addColorStop(1, 'rgba(4,6,4,0)');
  ctx.fillStyle = hg;
  ctx.fillRect(tx - 50, ty - 50, 100, 100);
  // croziers uncurling at the top
  for (const [dx, s] of [[-8, 1], [6, 0.8]] as const) {
    ctx.strokeStyle = '#3a4a30';
    ctx.lineWidth = 2.4 * s;
    ctx.beginPath();
    ctx.moveTo(tx + dx, ty);
    ctx.quadraticCurveTo(tx + dx - 2, ty - 18 * s, tx + dx + 6 * s, ty - 24 * s);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(tx + dx + 7 * s, ty - 20 * s, 4 * s, Math.PI * 1.3, Math.PI * 3.1);
    ctx.stroke();
  }
}
const CROWN_BOX: Box = { x: 1600, y: 70, w: 320, h: 330 };

/** A clump of ferns at the oven's right foot, lit by the fire on their left. */
const FERNS_R = { x: 1806, y: WALL.foot + 4 };
function fernClump(ctx: Ctx, r: R): void {
  const { x, y } = FERNS_R;
  groundShadow(ctx, x + 6, y - 2, 46, 4, 0.5, '#06040a');
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (i / 8 - 0.5) * 2.4 + (r() - 0.5) * 0.2;
    const L = 46 + r() * 34;
    const ex = x + Math.cos(a) * L;
    const ey = y + Math.sin(a) * L * 0.75 + L * 0.25;
    const cx = x + Math.cos(a) * L * 0.4;
    const cy = y + Math.sin(a) * L * 0.9;
    const q = (t: number): Pt => [(1 - t) ** 2 * x + 2 * (1 - t) * t * cx + t * t * ex, (1 - t) ** 2 * y + 2 * (1 - t) * t * cy + t * t * ey];
    const near = r();
    for (let k = 2; k < 14; k++) {
      const t = k / 14;
      const [px, py] = q(t);
      const [qx, qy] = q(t + 0.02);
      const l = Math.hypot(qx - px, qy - py) || 1;
      const ux = (qx - px) / l;
      const uy = (qy - py) / l;
      const ll = L * 0.14 * (1 - t * 0.7);
      for (const s of [-1, 1]) {
        const nx = -uy * s;
        const ny = ux * s;
        const warm = px < x ? 0.6 : 0.15;
        const col = mix(mix('#1a2a18', '#2e4a26', near), '#8a6a3a', warm * 0.35 * (nx < 0 ? 1 : 0.4));
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.quadraticCurveTo(px + nx * ll * 0.6 + ux * ll * 0.4, py + ny * ll * 0.6 - ll * 0.2, px + nx * ll + ux * ll * 0.5, py + ny * ll + ll * 0.2);
        ctx.quadraticCurveTo(px + nx * ll * 0.4 + ux * ll * 0.1, py + ny * ll * 0.4 + ll * 0.1, px, py);
        ctx.fill();
      }
    }
    ctx.strokeStyle = '#1e2e18';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(cx, cy, ex, ey);
    ctx.stroke();
  }
}
const FERNS_BOX: Box = { x: FERNS_R.x - 96, y: FERNS_R.y - 92, w: 190, h: TY - FERNS_R.y + 92 };

// ——— the sky's live light ———

/** The light coming up (live only, added): the horizon warming round the sunrise, the light reaching the far
 * peaks, the cloud bars' undersides and the river; cut out where nearer things stand in front. */
function sunrise(ctx: Ctx): void {
  ctx.save();
  lightPool(ctx, SUN.x, HOR, 1000, 200, '#ff9058', 0.24, 'source-over');
  lightPool(ctx, SUN.x, HOR, 460, 90, '#ffb468', 0.42, 'lighter');
  lightPool(ctx, SUN.x, HOR + 2, 180, 30, '#ffe0a0', 0.35, 'lighter');
  // the stratus bars lit from beneath
  for (const [x, y, w, h] of STRATUS) {
    const d = Math.abs(x - SUN.x) / 900;
    lightPool(ctx, x, y - h * 0.3, w * 0.5, h * 0.7, '#ffb080', 0.4 * (1 - d * 0.6), 'lighter');
  }
  // the far peaks catching the first light (alpenglow), and the volcano's right shoulder
  ctx.save();
  polyPath([...FAR_RANGE, [1960, HOR + 20], [560, HOR + 20]])(ctx);
  ctx.clip();
  ctx.fillStyle = lin(ctx, 0, 210, 0, 300, [[0, rgba('#ff9a8a', 0.4)], [1, 'rgba(255,154,138,0)']]);
  ctx.fillRect(560, 200, 1400, 110);
  ctx.restore();
  ctx.save();
  polyPath(VOL_PTS)(ctx);
  ctx.clip();
  ctx.fillStyle = lin(ctx, VOL.x, 0, VOL.x + 300, 0, [[0, 'rgba(255,150,120,0)'], [1, rgba('#ff9a7a', 0.3)]]);
  ctx.fillRect(VOL.x, VOL.top - 10, 460, HOR - VOL.top + 20);
  ctx.restore();
  // the river taking the sky
  ctx.save();
  riverPath(ctx);
  ctx.clip();
  ctx.fillStyle = lin(ctx, 0, HOR, 0, 430, [[0, rgba('#ffd8a0', 0.35)], [0.4, rgba('#ff9a80', 0.14)], [1, 'rgba(255,154,128,0.02)']]);
  ctx.fillRect(500, HOR, 500, 120);
  ctx.restore();
  // cut out what stands in front: the wall's coping, the awning, the oven's crown, the fern's trunk
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.moveTo(-20, 460);
  for (const c of wallPathTop) {
    ctx.lineTo(c.x0, Math.min(c.t0, c.t1, c.tm) + 2);
    ctx.lineTo(c.x1, Math.min(c.t0, c.t1, c.tm) + 2);
  }
  ctx.lineTo(W + 20, WALL.top + 6);
  ctx.lineTo(W + 20, 460);
  ctx.closePath();
  ctx.fill();
  roofWhole(ctx);
  ctx.fill();
  ctx.fillRect(ROOF.x0, ROOF.eave - 4, ROOF.x1 - ROOF.x0, 200);
  for (const p of POSTS) ctx.fillRect(p.x - p.w, ROOF.eave - 10, p.w * 2, 200);
  domePath(ctx);
  ctx.fill();
  ctx.fillRect(HOLE.x - HOLE.rx - 6, HOLE.y - HOLE.ry - 2, HOLE.rx * 2 + 12, 40);
  ctx.fillRect(FERN_TOP[0] - 20, FERN_TOP[1] - 10, 60, 300);
  ctx.restore();
}

/** The sun's first sliver over the horizon (the last wave), cut by the land in front of it. */
const LIMB_BOX: Box = { x: SUN.x - 120, y: HOR - 70, w: 240, h: 82 };
function sunLimb(ctx: Ctx): void {
  ctx.save();
  lightPool(ctx, SUN.x, HOR, 110, 50, '#ffd890', 0.4, 'lighter');
  ctx.fillStyle = '#fff6dc';
  ctx.beginPath();
  ctx.arc(SUN.x, HOR + 12, 20, 0, P2);
  ctx.fill();
  ctx.fillStyle = rgba('#ffffff', 0.9);
  ctx.beginPath();
  ctx.arc(SUN.x, HOR + 12, 14, 0, P2);
  ctx.fill();
  // the land in front of it
  ctx.globalCompositeOperation = 'destination-out';
  polyPath([...NEAR_HILLS.filter((p) => p[0] > LIMB_BOX.x - 20 && p[0] < LIMB_BOX.x + LIMB_BOX.w + 20), [LIMB_BOX.x + LIMB_BOX.w + 20, HOR + 60], [LIMB_BOX.x - 20, HOR + 60]])(ctx);
  ctx.fill();
  polyPath([...FAR_RANGE.filter((p) => p[0] < LIMB_BOX.x + LIMB_BOX.w + 20), [LIMB_BOX.x + LIMB_BOX.w + 20, HOR + 60], [560, HOR + 60]])(ctx);
  ctx.fill();
  ctx.fillRect(LIMB_BOX.x - 20, HOR - 1, LIMB_BOX.w + 40, 80);
  ctx.restore();
}

// ——— still-only stand-ins for the live bits ———

function smokeStill(ctx: Ctx): void {
  ctx.save();
  ctx.translate(HOLE.x - SMOKE.w / 2, HOLE.y + 6 - SMOKE.h);
  smokeFrame(ctx, SMOKE.w, SMOKE.h, 0.35, SMOKE.o);
  ctx.restore();
}
function plumeStill(ctx: Ctx): void {
  ctx.save();
  ctx.translate(VOL.x - PLUME.w / 2, VOL.top + 4 - PLUME.h);
  smokeFrame(ctx, PLUME.w, PLUME.h, 0.55, PLUME.o);
  ctx.restore();
}
const SMOKE = { w: 300, h: 330, o: { lit: '#a89cb8', body: '#5a5068', shade: '#1e1a2c', wind: -0.55, lobes: 9, a: 0.5, toLight: [-0.8, -0.4] as [number, number], seed: 2 } };
const PLUME = { w: 420, h: 230, o: { lit: '#8a7a9a', body: '#2e2840', shade: '#100c1c', wind: -0.7, lobes: 10, a: 0.6, toLight: [0.7, -0.3] as [number, number], seed: 5 } };

/** Fireflies of the last of the night (live ones blink and wander). */
const FLIES: { x: number; y: number; z: number }[] = (() => {
  const rr = rng(171);
  const out: { x: number; y: number; z: number }[] = [];
  const zones: [number, number, number, number, number][] = [
    [10, 440, 260, 300, 9],
    [1700, 560, 220, 190, 6],
    [300, 330, 1100, 70, 6],
    [1380, 420, 120, 300, 3],
  ];
  for (const [x, y, w, h, n] of zones) for (let i = 0; i < n; i++) out.push({ x: x + rr() * w, y: y + rr() * h, z: rr() });
  return out;
})();
function firefliesStill(ctx: Ctx): void {
  for (const f of FLIES) {
    if (f.z < 0.4) continue;
    glowAt(ctx, f.x, f.y, 9, '#d8ff7a', 0.35);
    ctx.fillStyle = rgba('#f4ffd0', 0.85);
    ctx.beginPath();
    ctx.arc(f.x, f.y, 1.3, 0, P2);
    ctx.fill();
  }
}

/** A small bird of the first morning (a long-tailed, early bird), flying: wings at phase ph of the beat. */
const BIRD = { w: 60, h: 40, n: 8 };
function birdFrame(c: Ctx, ph: number, perch = -1): void {
  const cx = BIRD.w / 2;
  const cy = BIRD.h / 2;
  const body = '#18142a';
  const under = '#8a5a6a';
  if (perch >= 0) {
    // perched: feet on the edge (the bottom of the frame), the head turned or down
    const by = BIRD.h - 4;
    c.fillStyle = body;
    c.beginPath();
    c.ellipse(cx, by - 9, 7, 5.6, -0.25, 0, P2);
    c.fill();
    // tail
    c.beginPath();
    c.moveTo(cx + 5, by - 8);
    c.lineTo(cx + 18, by - 2 - (perch === 2 ? 6 : 0));
    c.lineTo(cx + 16, by + 1 - (perch === 2 ? 6 : 0));
    c.lineTo(cx + 3, by - 5);
    c.closePath();
    c.fill();
    // head
    const hx = cx - 6 + (perch === 1 ? -2 : 0);
    const hy = by - 15 + (perch === 1 ? 7 : 0);
    c.beginPath();
    c.arc(hx, hy, 3.8, 0, P2);
    c.fill();
    c.beginPath();
    c.moveTo(hx - 3, hy - 0.5);
    c.lineTo(hx - 8 + (perch === 3 ? 10 : 0), hy + 1);
    c.lineTo(hx - 3, hy + 1.6);
    c.fill();
    // the chest catching the dawn
    c.fillStyle = rgba(under, 0.7);
    c.beginPath();
    c.ellipse(cx - 3, by - 7, 3.6, 3, -0.3, 0, P2);
    c.fill();
    c.strokeStyle = body;
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(cx - 1, by - 4);
    c.lineTo(cx - 2, by);
    c.moveTo(cx + 2, by - 4);
    c.lineTo(cx + 2, by);
    c.stroke();
    return;
  }
  const T = P2 * ph;
  const e = Math.cos(T);
  const e2 = Math.cos(T - 0.8);
  for (const s of [-1, 1]) {
    const k = s < 0 ? 0.85 : 1;
    const sx = cx + s * 2;
    const wx = sx + s * 10 * k;
    const wy = cy - e * 9 * k;
    const tx = wx + s * 13 * k;
    const ty = wy - e2 * 9 * k;
    c.fillStyle = s < 0 ? '#120e20' : body;
    c.beginPath();
    c.moveTo(sx, cy - 1);
    c.quadraticCurveTo((sx + wx) / 2, wy - 2, wx, wy);
    c.lineTo(tx, ty);
    c.quadraticCurveTo(wx, wy + 5, sx, cy + 3);
    c.closePath();
    c.fill();
    c.strokeStyle = rgba(under, 0.5);
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(sx, cy + 2);
    c.quadraticCurveTo(wx, wy + 4, tx, ty + 0.5);
    c.stroke();
  }
  c.fillStyle = body;
  c.beginPath();
  c.ellipse(cx, cy + 1, 7, 3, 0, 0, P2);
  c.fill();
  // the long tail streaming behind, the head ahead (flying right)
  c.beginPath();
  c.moveTo(cx - 5, cy);
  c.lineTo(cx - 20, cy - 1 + Math.sin(T) * 1.5);
  c.lineTo(cx - 19, cy + 3 + Math.sin(T) * 1.5);
  c.lineTo(cx - 5, cy + 2.5);
  c.closePath();
  c.fill();
  c.beginPath();
  c.arc(cx + 7, cy - 0.5, 3, 0, P2);
  c.fill();
  c.beginPath();
  c.moveTo(cx + 9, cy - 1.5);
  c.lineTo(cx + 14, cy);
  c.lineTo(cx + 9, cy + 1);
  c.fill();
  c.fillStyle = rgba(under, 0.55);
  c.beginPath();
  c.ellipse(cx + 1, cy + 2.4, 5, 1.4, 0, 0, P2);
  c.fill();
}
function birdsStill(ctx: Ctx): void {
  for (const [i, [x, y]] of PERCH.entries()) {
    ctx.save();
    ctx.translate(x - BIRD.w / 2, y - BIRD.h);
    birdFrame(ctx, 0, i === 1 ? 1 : 0);
    ctx.restore();
  }
}

// ——— the table: a great slab of sandstone ———

const FRONT = FIN.front;
function table(ctx: Ctx, r: R): void {
  const f = FRONT;
  const box = { x: 0, y: TY, w: W, h: f - TY };
  const zf = zFront(f);
  const zb = 1210 / (TY - 300);
  // a point on the slab: X across (table units), z depth; its screen scale
  const at = (X: number, z: number): [number, number, number] => [xAt(X, z), yAt(z), 1210 / z / 460];
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, f - TY + 2);
  ctx.clip();
  // sandstone: warm and sandy, darker towards the back where the wall's shadow falls
  vfill(ctx, 0, TY, W, f - TY, [[0, '#56463e'], [0.35, '#74604e'], [1, '#806a54']]);
  surface(ctx, r, box, '#78624e', { over: true, vary: 0.55, cells: 3, mottle: 0.45, strokes: 0, grain: 0.2, grainKind: 'speckle', seed: 181, warm: '#a08470', cool: '#4a4658' });
  lay(ctx, drift('#8e7866', '#3e3842', 4, 183, 120, 40), box, 0.4);
  // its grain: fine sand, a scatter of darker grit and pale quartz
  texture(ctx, 'speckle', box, 0.3, 1.2, 'overlay');
  for (let i = 0; i < 900; i++) {
    const [x, y, s] = at((r() - 0.5) * 7.6, zb - r() ** 0.8 * (zb - zf));
    ctx.fillStyle = rgba(r() < 0.6 ? '#2a2226' : '#d8ccbc', 0.12 + r() * 0.12);
    ctx.fillRect(x, y, Math.max(1, 1.6 * s), Math.max(0.8, 1.1 * s));
  }
  // weathering: lichen and old stains towards its ends, the work worn into a pale smooth hollow in the middle
  for (let i = 0; i < 26; i++) {
    const side = r() < 0.5 ? -1 : 1;
    const [x, y, s] = at(side * (2.4 + r() * 1.6), zb - r() * (zb - zf));
    const rx = (30 + r() * 70) * s;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.32);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    const col = r() < 0.5 ? '#2e2a30' : r() < 0.5 ? '#5a6248' : '#8a7058';
    g.addColorStop(0, rgba(col, 0.16));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
    ctx.restore();
  }
  lightPool(ctx, 960, TY + 170, 820, 120, '#c8b8a4', 0.1);
  lightPool(ctx, 960, TY + 150, 460, 70, '#e0d4c4', 0.06);
  // pits and old tool marks, fewer where the work wore them away
  for (let i = 0; i < 120; i++) {
    const [x, y, s] = at((r() - 0.5) * 7.4, zb - r() * (zb - zf));
    if (Math.abs(x - 960) < 460 && r() < 0.75) continue;
    ctx.fillStyle = rgba('#241c20', 0.28);
    ctx.beginPath();
    ctx.ellipse(x, y, (1.5 + r() * 3) * s, (0.8 + r() * 1.2) * s, 0, 0, P2);
    ctx.fill();
    ctx.fillStyle = rgba('#c8bcb0', 0.2);
    ctx.beginPath();
    ctx.ellipse(x + s, y + s, (1 + r() * 2) * s, 0.6 * s, 0, 0, P2);
    ctx.fill();
  }
  for (let i = 0; i < 4; i++) crack(ctx, r, r() < 0.5 ? r() * 420 : 1500 + r() * 420, TY + 30 + r() * (f - TY - 60), (r() - 0.5) * 0.8, 50 + r() * 90, { col: '#221a20', lip: '#c8bcb0', w: 1.2, a: 0.35, branch: 0.25 });
  // flour here and there: soft dusty patches, a hand's sweep through one
  for (const [X, z, s] of [[-2.7, 2.35, 1], [2.9, 2.5, 0.8], [-0.4, 2.66, 0.6], [1.5, 1.75, 0.75], [-3.3, 1.62, 0.6]] as const) {
    const [x, y, sc] = at(X, z);
    const k = sc * s;
    softly(ctx, { x: x - 150 * k, y: y - 34 * k, w: 300 * k, h: 68 * k }, (g) => {
      for (let q = 0; q < 8; q++) {
        const gx = x + (r() - 0.5) * 170 * k;
        const gy = y + (r() - 0.5) * 26 * k;
        const rx = (22 + r() * 40) * k;
        g.save();
        g.translate(gx, gy);
        g.scale(1, 0.3);
        const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
        gr.addColorStop(0, 'rgba(240,234,224,0.34)');
        gr.addColorStop(1, 'rgba(240,234,224,0)');
        g.fillStyle = gr;
        g.fillRect(-rx, -rx, rx * 2, rx * 2);
        g.restore();
      }
      // the sweep: a hand dragged through it, an arc cleared
      g.strokeStyle = 'rgba(110,94,84,0.5)';
      g.lineWidth = 10 * k;
      g.lineCap = 'round';
      g.beginPath();
      g.ellipse(x, y, 60 * k, 12 * k, 0, Math.PI * 1.1, Math.PI * 1.7);
      g.stroke();
    }, 0.4);
  }
  // the light: the sky's cool from above, the oven's fire warm across the back right
  lightPool(ctx, HIVE.x - 40, TY + 30, 560, 100, FIREC, 0.2, 'lighter');
  lightPool(ctx, HIVE.x - 20, TY + 8, 240, 30, '#ffb070', 0.16, 'lighter');
  lightPool(ctx, HIVE.x, TY + 26, 300, 50, '#ffa050', 0.22, 'lighter');
  const lg = ctx.createLinearGradient(0, TY, W * 0.7, f + 200);
  lg.addColorStop(0, rgba('#c8c0e0', 0.06));
  lg.addColorStop(0.5, 'rgba(200,192,224,0)');
  lg.addColorStop(1, 'rgba(14,12,34,0.22)');
  ctx.fillStyle = lg;
  ctx.fillRect(0, TY, W, f - TY);
  ctx.restore();
  tableFalloff(ctx, f, 0.32, '#0e0c1a');
  tableSeam(ctx, 0.5, '#1a1418', false);
  crevice(ctx, 0, W, TY, 14, 0.45, '#0e0c1a');
  // the slab's front: its thickness, a split face dressed with a stone hammer, darker below
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, f, W, H - f);
  ctx.clip();
  vfill(ctx, 0, f, W, H - f, [[0, '#66564e'], [0.35, '#4a3e40'], [1, '#221c26']]);
  lay(ctx, drift('#7a6a5e', '#1e1820', 6, 187, 160, 12), { x: 0, y: f, w: W, h: H - f }, 0.6);
  for (let i = 0; i < 220; i++) {
    const x = r() * W;
    const y = f + 6 + r() * (H - f - 8);
    const w = 4 + r() * 10;
    // hammer dressing: short dents, each shadowed above and lit below
    ctx.fillStyle = rgba('#140e14', 0.22);
    ctx.beginPath();
    ctx.ellipse(x, y, w, 1.6 + r() * 1.6, (r() - 0.5) * 0.4, 0, P2);
    ctx.fill();
    ctx.fillStyle = rgba('#8a7a6e', 0.18);
    ctx.beginPath();
    ctx.ellipse(x + 1, y + 2, w * 0.8, 1, 0, 0, P2);
    ctx.fill();
  }
  texture(ctx, 'speckle', { x: 0, y: f, w: W, h: H - f }, 0.35, 1.2, 'overlay');
  ctx.restore();
  // its arris, worn round and catching the light, chipped here and there
  ctx.fillStyle = lin(ctx, 0, f - 5, 0, f + 2, [[0, '#94867c'], [1, '#54484a']]);
  ctx.fillRect(0, f - 5, W, 7);
  ctx.fillStyle = rgba('#e0d8d0', 0.35);
  ctx.fillRect(0, f - 5, W, 1.2);
  for (let i = 0; i < 12; i++) {
    const x = r() * W;
    const w = 6 + r() * 16;
    ctx.fillStyle = rgba('#2a2228', 0.4);
    ctx.beginPath();
    ctx.ellipse(x, f - 1, w, 3, 0, 0, P2);
    ctx.fill();
  }
  ctx.fillStyle = rgba('#0e0a12', 0.7);
  ctx.fillRect(0, f + 2, W, 1.6);
}

// ——— the dawn reaching the foreground (live only, added; never over FIN.wall, where the peels hang) ———

const DAWN = '#ffb488';
/** The first light catching the coping's tops and the left faces of its stones (above the peels' box). */
const COPE_BOX: Box = { x: 0, y: WALL.top - 16, w: W, h: FIN.wall.y0 - 2 - (WALL.top - 16) };
function copeDawn(ctx: Ctx): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(COPE_BOX.x, COPE_BOX.y, COPE_BOX.w, COPE_BOX.h);
  ctx.clip();
  for (const c of wallPathTop) {
    const t = Math.min(c.t0, c.t1, c.tm);
    const k = 0.55 + 0.45 * clamp01(1 - Math.abs(c.x0 - SUN.x) / 1400);
    ctx.fillStyle = lin(ctx, 0, t - 2, 0, t + 16, [[0, rgba(DAWN, 0.5 * k)], [1, rgba(DAWN, 0)]]);
    ctx.beginPath();
    ctx.ellipse((c.x0 + c.x1) / 2 + c.lean * 0.7, t + 5, (c.x1 - c.x0) * 0.45, 7, 0, 0, P2);
    ctx.fill();
  }
  ctx.restore();
}
/** The light on the oven's left flank and crown, and on the awning's thatch. */
const OVEN_DAWN_BOX: Box = { x: 1440, y: HOLE.y - 12, w: 460, h: PLAT - HOLE.y + 12 };
function ovenDawn(ctx: Ctx): void {
  within(ctx, domePath, () => {
    const g = ctx.createRadialGradient(HIVE.x - 150, CROWN + 120, 10, HIVE.x - 120, CROWN + 160, 260);
    g.addColorStop(0, rgba(DAWN, 0.42));
    g.addColorStop(0.5, rgba(DAWN, 0.14));
    g.addColorStop(1, rgba(DAWN, 0));
    ctx.fillStyle = g;
    ctx.fillRect(OVEN_DAWN_BOX.x, OVEN_DAWN_BOX.y, OVEN_DAWN_BOX.w, OVEN_DAWN_BOX.h);
  });
  rim(ctx, domePath, 0.5, 6, DAWN);
}
const ROOF_DAWN_BOX: Box = { x: 0, y: ROOF.back - 10, w: ROOF.x1 + 12, h: ROOF.eave - ROOF.back + 24 };
function roofDawn(ctx: Ctx): void {
  within(ctx, roofWhole, () => {
    ctx.fillStyle = lin(ctx, 0, ROOF.back, ROOF.x1, ROOF.eave, [[0, rgba(DAWN, 0.4)], [1, rgba(DAWN, 0.05)]]);
    ctx.fillRect(ROOF_DAWN_BOX.x, ROOF_DAWN_BOX.y, ROOF_DAWN_BOX.w, ROOF_DAWN_BOX.h);
  });
}
/** The table taking the sky's warmth, from the back left. */
function tableDawn(ctx: Ctx): void {
  const g = ctx.createLinearGradient(0, TY, W * 0.8, FRONT + 120);
  g.addColorStop(0, rgba(DAWN, 0.2));
  g.addColorStop(0.55, rgba(DAWN, 0.06));
  g.addColorStop(1, rgba(DAWN, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, TY, W, H - TY);
}

// ——— finishing ———

/** A gentle warm/cool split (no full-screen pixel grade: cheap, and pixel-local). */
function grade(ctx: Ctx): void {
  ctx.globalCompositeOperation = 'source-atop';
  const g = ctx.createLinearGradient(0, 0, W * 0.85, 1080);
  g.addColorStop(0, rgba('#ffb080', 0.04));
  g.addColorStop(0.45, 'rgba(255,176,128,0)');
  g.addColorStop(0.62, 'rgba(70,70,190,0)');
  g.addColorStop(1, rgba('#4646be', 0.06));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, 1080);
}

function shadeOver(ctx: Ctx): void {
  // calm behind the feet's lanes in the sky (not over the wall: the peels hang there)
  calmLanes(ctx, 0.12, '#05040e', 80, 390);
  vignetteAll(ctx, 0.6, '#03020a', 0.6);
  vfill(ctx, 0, 0, W, 170, [[0, 'rgba(3,2,10,0.45)'], [1, 'rgba(3,2,10,0)']]);
  // the HUD's top corners kept dark
  for (const [x, y, rad, a] of [[160, 60, 460, 0.4], [1790, 50, 340, 0.4]] as const) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.6);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rad);
    g.addColorStop(0, rgba('#020008', a));
    g.addColorStop(1, rgba('#020008', 0));
    ctx.fillStyle = g;
    ctx.fillRect(-rad, -rad, rad * 2, rad * 2);
    ctx.restore();
  }
}

// ——— the stack ———

const pad = (b: Box, p: number): Box => ({ x: Math.floor(b.x - p), y: Math.floor(b.y - p), w: Math.ceil(b.w + p * 2), h: Math.ceil(b.h + p * 2) });
const OVEN_BOX: Box = { x: 1420, y: HOLE.y - HOLE.ry - 6, w: 500, h: TY + 6 - (HOLE.y - HOLE.ry - 6) };
const MOUTH_BOX: Box = { x: MOUTH.x - MOUTH.half, y: MOUTH.spring - MOUTH.rise, w: MOUTH.half * 2, h: PLAT - MOUTH.spring + MOUTH.rise };
const SMOKE_BOX: Box = { x: HOLE.x - 320, y: 0, w: 480, h: HOLE.y + 4 };
const PLUME_BOX: Box = { x: 0, y: 0, w: 700, h: VOL.top + 8 };
const QUERN_BOX: Box = { x: 60, y: 716, w: 190, h: TY - 716 };

export const FIRSTPIZZERIA: SceneSpec = {
  id: 'firstpizzeria',
  info: {
    name: 'The First Pizzeria',
    subtitle: 'Waves 96–99',
    ambient: [],
    // (the fire, the smoke, the stars, the birds, the mist and the fireflies are the live layer's)
    glows: [],
    light: '#ffd8c0',
    tableTint: '#f8f0ec',
  },
  layers: [
    { id: 'sky', box: { x: 0, y: 0, w: W, h: 430 }, draw: sky },
    { id: 'starsStill', box: { x: 0, y: 0, w: W, h: 300 }, stillOnly: true, draw: (c) => starsStill(c) },
    { id: 'clouds', box: { x: 0, y: 0, w: W, h: 330 }, draw: clouds },
    { id: 'volcano', box: { x: 0, y: 0, w: 800, h: HOR + 14 }, draw: volcano },
    { id: 'range', box: { x: 0, y: 200, w: W, h: HOR + 24 - 200 }, draw: range },
    { id: 'valley', box: { x: 0, y: HOR - 4, w: W, h: 434 - HOR }, draw: valley },
    { id: 'mistStill', box: { x: 0, y: HOR, w: W, h: 110 }, stillOnly: true, draw: (c) => mistStill(c) },
    { id: 'wall', box: { x: 0, y: WALL.top - 16, w: W, h: TY - WALL.top + 16 }, draw: wall },
    { id: 'roofShadow', box: { x: 0, y: ROOF.eave - 10, w: 320, h: TY - ROOF.eave + 10 }, draw: (c) => roofShadow(c) },
    { id: 'jarShadows', box: { x: 0, y: 600, w: 230, h: TY - 600 }, draw: (c) => jarShadows(c) },
    { id: 'leanto', box: { x: 0, y: ROOF.back - 20, w: 320, h: TY - ROOF.back + 20 }, draw: leanto },
    { id: 'tomato', box: { x: 170, y: 540, w: 80, h: TY - 540 }, draw: tomato },
    { id: 'basil', box: { x: 200, y: 700, w: 70, h: TY - 700 }, draw: basil },
    { id: 'oven', box: OVEN_BOX, draw: oven },
    { id: 'woodpile', box: { x: 1810, y: 620, w: 110, h: TY - 620 }, draw: woodpile },
    { id: 'fireStill', box: pad(MOUTH_BOX, 60), stillOnly: true, draw: (c) => fireStill(c) },
    { id: 'peel', box: { x: 1400, y: 440, w: 200, h: TY - 440 }, draw: peel },
    { id: 'fernTrunk', box: { x: 1820, y: FERN_TOP[1] - 10, w: 100, h: TY - FERN_TOP[1] + 10 }, draw: fernTrunk },
    { id: 'smokeStill', box: SMOKE_BOX, stillOnly: true, draw: (c) => smokeStill(c) },
    { id: 'plumeStill', box: PLUME_BOX, stillOnly: true, draw: (c) => plumeStill(c) },
    { id: 'firefliesStill', stillOnly: true, draw: (c) => firefliesStill(c) },
    { id: 'birdsStill', box: { x: 0, y: ROOF.back - 50, w: 260, h: 60 }, stillOnly: true, draw: (c) => birdsStill(c) },
    // ——— what moves (placed late, so nothing still after them is pulled into an overlay but the quern)
    { id: 'plume', box: PLUME_BOX, motion: 'slot', draw: () => {} },
    { id: 'sunrise', box: { x: 0, y: 0, w: W, h: 432 }, liveOnly: true, res: 0.5, draw: (c) => sunrise(c) },
    { id: 'sunLimb', box: LIMB_BOX, liveOnly: true, draw: (c) => sunLimb(c) },
    { id: 'fire', box: MOUTH_BOX, motion: 'slot', draw: () => {} },
    { id: 'smoke', box: SMOKE_BOX, motion: 'slot', draw: () => {} },
    ...JARS.map((j) => ({ id: j.id, box: jarBox(j), motion: 'sprite' as const, draw: (c: Ctx, r: R) => jar(c, r, j) })),
    { id: 'quern', box: QUERN_BOX, draw: quern },
    { id: 'fernsR', box: FERNS_BOX, motion: 'sprite', draw: fernClump },
    { id: 'crown', box: CROWN_BOX, motion: 'sprite', draw: crown },
    { id: 'table', box: { x: 0, y: TY, w: W, h: H - TY }, draw: table },
    { id: 'copeDawn', box: COPE_BOX, liveOnly: true, res: 0.5, draw: (c) => copeDawn(c) },
    { id: 'ovenDawn', box: OVEN_DAWN_BOX, liveOnly: true, res: 0.5, draw: (c) => ovenDawn(c) },
    { id: 'roofDawn', box: ROOF_DAWN_BOX, liveOnly: true, res: 0.5, draw: (c) => roofDawn(c) },
    { id: 'tableDawn', box: { x: 0, y: TY, w: W, h: H - TY }, liveOnly: true, res: 0.25, draw: (c) => tableDawn(c) },
    { id: 'fx', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

// ——— live ———

type Img = Phaser.GameObjects.Image;
const hexOf = (c: string) => parseInt(c.slice(1), 16);
const lerpCol = (a: number, b: number, t: number) => {
  const ch = (s: number) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};

interface Flyer {
  img: Img;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ph: number;
  /** Seconds left flapping (then gliding), and the bout's length. */
  flap: number;
  s: number;
  bob: number;
  live: boolean;
}
interface Percher {
  img: Img;
  px: number;
  py: number;
  /** 0 perched, 1 flying off, 2 away, 3 coming back */
  st: number;
  t: number;
  pose: number;
  poseT: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ph: number;
  hop: Spring;
}
interface Firefly {
  glow: Img;
  core: Img;
  x0: number;
  y0: number;
  ph: number;
  sp: number;
  seed: number;
  ox: Spring;
  oy: Spring;
  order: number;
}

registerKitScene(FIRSTPIZZERIA, (k: KitLive, wave0: number) => {
  const ADD = Phaser.BlendModes.ADD;
  const sc = k.sc;
  const top = k.slot('fx');
  const layer = () => {
    const c = sc.add.container(0, 0);
    top.add(c);
    return c;
  };
  const starC = layer();
  const mistC = layer();
  const birdC = layer();
  const glowC = layer();
  const partC = layer();
  const flyC = layer();
  let kw = waveK(wave0);
  let shown = kw;

  // ——— the dawn: the light coming up (added), the sun's first sliver on the last wave
  const sunrise = k.sprite('sunrise').setBlendMode(ADD);
  const limb = k.sprite('sunLimb').setBlendMode(ADD);
  const fgDawn = ['copeDawn', 'ovenDawn', 'roofDawn', 'tableDawn'].map((id) => k.sprite(id).setBlendMode(ADD));

  // ——— the stars twinkling and going out, the morning star last
  const twKey = k.tex('fp_twinkle', 32, 32, (c) => {
    const g = c.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.15, 'rgba(255,255,255,0.5)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 32, 32);
    c.fillStyle = 'rgba(255,255,255,0.3)';
    c.fillRect(6, 15.5, 20, 1);
    c.fillRect(15.5, 6, 1, 20);
  });
  const tr = rng(5170);
  const stars = BRIGHT.map((s) => ({ img: k.img(twKey, s.x, s.y, { into: starC, add: true, scale: s.s * 0.34, tint: hexOf(s.col), alpha: 0 }), ph: tr() * 10, sp: 0.4 + tr() * 1.6, base: 0.4 + tr() * 0.4, fade: tr() }));
  const venusGlow = k.glow(VENUS[0], VENUS[1], 34, 0xfff4e0, 0.2, { into: starC });
  const venus = k.img(twKey, VENUS[0], VENUS[1], { into: starC, add: true, scale: 0.9, tint: 0xffffff });

  // ——— the volcano's plume rolling up out of the crater (a painted loop), the crater's glow
  const plumeC = k.slot('plume');
  const crater = k.glow(VOL.x, VOL.top + 2, 60, 0xff5a2a, 0.3, { into: plumeC, sy: 0.6 });
  const PS = 0.5;
  const plumeKey = sheet(k, 'fp_plume', PLUME.w * PS, PLUME.h * PS, 10, (c, ph) => {
    c.scale(PS, PS);
    smokeFrame(c, PLUME.w, PLUME.h, ph, PLUME.o);
  });
  const plume = new Loop(k, plumeKey, 10, VOL.x, VOL.top + 4, { into: plumeC, origin: [0.5, 1], scale: 1 / PS, fps: 1.6 });

  // ——— the oven's fire: a painted loop in the mouth (clipped to it), the coals pulsing
  const fireC = k.slot('fire');
  const FW = FIRE.w + 24;
  const FH = FIRE.h + 12;
  const fx0 = FIRE.x - FW / 2;
  const fy0 = FIRE.y + 2 - FH;
  const fireKey = sheet(k, 'fp_fire', FW, FH, 12, (c, ph) => {
    c.save();
    c.translate(-fx0, -fy0);
    mouthPath(-3)(c);
    c.clip();
    c.translate(fx0, fy0);
    fireFrame(c, FW / 2, FH - 2, FIRE.w, FIRE.h, ph, { tongues: 5, seed: 1.3 });
    c.restore();
  });
  const coals = k.glow(FIRE.x, PLAT - 18, 80, 0xff7a2a, 0.4, { into: fireC, sy: 0.35 });
  const fire = new Loop(k, fireKey, 12, FIRE.x, FIRE.y + 2, { into: fireC, add: true, origin: [0.5, 1], fps: 10 });
  const boost = new Spring(0, 14, 3);

  // ——— the smoke rising from the smoke hole into the still dawn air (a painted loop)
  const smokeC = k.slot('smoke');
  const SS = 0.5;
  const smokeKey = sheet(k, 'fp_smoke', SMOKE.w * SS, SMOKE.h * SS, 12, (c, ph) => {
    c.scale(SS, SS);
    smokeFrame(c, SMOKE.w, SMOKE.h, ph, SMOKE.o);
  });
  const holeGlow = k.glow(HOLE.x, HOLE.y - 2, 30, 0xff7030, 0.2, { into: smokeC, sy: 0.45 });
  const smoke = new Loop(k, smokeKey, 12, HOLE.x, HOLE.y + 6, { into: smokeC, origin: [0.5, 1], scale: 1 / SS, fps: 3.2 });

  // ——— the firelight flickering on the apron, the dome round the mouth, the peel and the back of the table
  const lights = [
    { img: k.glow(MOUTH.x, PLAT - 46, 170, 0xff8a3a, 0, { into: glowC }), a: 0.12, seed: 1 },
    { img: k.glow(MOUTH.x, PLAT + 4, 200, 0xffa050, 0, { into: glowC, sy: 0.22 }), a: 0.22, seed: 2 },
    { img: k.glow(MOUTH.x - 30, TY + 34, 380, 0xff8a3a, 0, { into: glowC, sy: 0.2 }), a: 0.1, seed: 3 },
    { img: k.glow(1500, 690, 80, 0xff8a3a, 0, { into: glowC }), a: 0.07, seed: 4 },
  ];

  // ——— particles: sparks riding up the smoke, sparks and ash out of the mouth at a stomp
  const sparks = new Parts(k, { frame: 'ember', add: true, into: partC, max: 70 });
  const ash = new Parts(k, { frame: 'puff', into: partC, max: 50 });
  const sparkRate = new Rate();
  const mouthRate = new Rate();
  const holeSpark = (kick = 0) =>
    sparks.spawn({ x: HOLE.x + (crand() - 0.5) * 14, y: HOLE.y - 2, vx: (crand() - 0.5) * 24 - 10 - kick * 20, vy: -70 - crand() * 60 - kick * 120, life: 1.6 + crand(), r0: 2.4, r1: 0.8, a: 0.9, tint: crand() < 0.5 ? 0xffa040 : 0xffd070, grav: 18, drag: 0.4, streak: 0.02, fade: 0.05 });
  const mouthSpark = (kick = 0) =>
    sparks.spawn({ x: MOUTH.x + (crand() - 0.5) * 120, y: PLAT - 24 - crand() * 30, vx: (crand() - 0.5) * (60 + kick * 260), vy: -40 - crand() * 80 - kick * 220, life: 0.9 + crand() * 0.8, r0: 2.2, r1: 1, a: 0.95, tint: 0xffb050, grav: kick ? 520 : -30, drag: 0.6, floor: PLAT + 14, bounce: 0.3, streak: 0.016, fade: 0.04 });

  // ——— mist drifting along the river, lifting and thinning as the day comes
  const mistKey = k.tex('fp_mist', 256, 64, (c) => {
    const mr = rng(193);
    for (let i = 0; i < 9; i++) {
      const x = 40 + mr() * 176;
      const y = 26 + mr() * 14;
      const rx = 40 + mr() * 50;
      c.save();
      c.translate(x, y);
      c.scale(1, 0.32);
      const g = c.createRadialGradient(0, 0, 0, 0, 0, rx);
      g.addColorStop(0, 'rgba(255,255,255,0.4)');
      g.addColorStop(0.6, 'rgba(255,255,255,0.16)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.fillRect(-rx, -rx, rx * 2, rx * 2);
      c.restore();
    }
  });
  const mists = MIST0.map((m, i) => ({ ...m, img: k.img(mistKey, m.x, m.y, { into: mistC, sx: (m.w * 1.25) / 256, sy: Math.min(0.75, (m.w * 0.12) / 64), alpha: 0 }), seed: i * 1.7 }));

  // ——— fireflies blinking at the edges of the night, going out one by one as the day comes
  const dotKey = k.tex('fp_dot', 8, 8, (c) => {
    const g = c.createRadialGradient(4, 4, 0, 4, 4, 4);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 8, 8);
  });
  const fr = rng(211);
  const flies: Firefly[] = FLIES.map((f, i) => ({
    glow: k.glow(f.x, f.y, 11, 0xd8ff7a, 0, { into: flyC }),
    core: k.img(dotKey, f.x, f.y, { into: flyC, add: true, scale: 0.7, tint: 0xf4ffd0, alpha: 0 }),
    x0: f.x,
    y0: f.y,
    ph: fr() * 10,
    sp: 0.7 + fr() * 1.2,
    seed: i * 3.1,
    ox: new Spring(0, 2, 1.4),
    oy: new Spring(0, 2, 1.4),
    order: fr(),
  }));

  // ——— birds: flocks crossing the dawn (flap and glide), more as it gets light; a pterosaur now and then; three
  // perched on the awning that preen, and fly up at a stomp and come back
  const birdKey = sheet(k, 'fp_bird', BIRD.w, BIRD.h, BIRD.n, (c, ph) => birdFrame(c, ph));
  const perchKey = sheet(k, 'fp_perch', BIRD.w, BIRD.h, 4, (c, _ph, i) => birdFrame(c, 0, i));
  const PTS = 0.6;
  const pteroKey = sheet(k, 'fp_ptero', PT.w * PTS, PT.h * PTS, PT.n, (c, ph) => {
    c.scale(PTS, PTS);
    pteroFrame(c, ph);
  });
  const flyers: Flyer[] = [];
  const mkFlyer = (key: string): Flyer => {
    let f = flyers.find((q) => !q.live && q.img.texture.key === key);
    if (!f) {
      f = { img: k.img(key, 0, 0, { into: birdC, alpha: 0 }), x: 0, y: 0, vx: 0, vy: 0, ph: 0, flap: 0, s: 1, bob: 0, live: false };
      flyers.push(f);
    }
    f.live = true;
    return f;
  };
  const flock = () => {
    const dir = crand() < 0.6 ? 1 : -1;
    const n = Math.round(lerp(2, 7, shown) + crand() * 2);
    const y0 = 80 + crand() * 190;
    const v = 80 + crand() * 50;
    const s = 0.45 + crand() * 0.35;
    for (let i = 0; i < n; i++) {
      const f = mkFlyer(birdKey);
      // a loose wedge
      f.x = dir > 0 ? -40 - i * 26 * s - crand() * 20 : W + 40 + i * 26 * s + crand() * 20;
      f.y = y0 + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 12 * s + (crand() - 0.5) * 8;
      f.vx = dir * v * (0.95 + crand() * 0.1);
      f.vy = (crand() - 0.5) * 6;
      f.ph = crand();
      f.flap = 0.6 + crand() * 1.4;
      f.s = s * (0.9 + crand() * 0.2);
      f.bob = crand() * 10;
      f.img.setScale(f.s).setFlipX(dir < 0);
    }
  };
  const ptero = () => {
    const dir = crand() < 0.5 ? 1 : -1;
    const f = mkFlyer(pteroKey);
    f.x = dir > 0 ? -120 : W + 120;
    f.y = 60 + crand() * 120;
    f.vx = dir * (60 + crand() * 20);
    f.vy = (crand() - 0.5) * 4;
    f.ph = crand();
    f.flap = 1.2;
    f.s = 0.5 + crand() * 0.3;
    f.bob = crand() * 10;
    f.img.setScale(f.s).setFlipX(dir < 0);
  };
  let flockT = lerp(8, 3, shown) + crand() * 4;
  let pteroT = 10 + crand() * 14;
  const birdOrigin: [number, number] = [0.5, (BIRD.h - 4) / BIRD.h];
  const perchers: Percher[] = PERCH.map(([px, py], i) => ({
    img: k.img(perchKey, px, py, { into: birdC, origin: birdOrigin, scale: 1.35 }).setFrame(i === 1 ? 1 : 0),
    px,
    py,
    st: 0,
    t: 0,
    pose: i === 1 ? 1 : 0,
    poseT: 1 + crand() * 3,
    x: px,
    y: py,
    vx: 0,
    vy: 0,
    ph: crand(),
    hop: new Spring(0, 60, 7),
  }));
  const scare = (p: number) => {
    for (const b of perchers) {
      if (b.st !== 0) continue;
      b.st = 1;
      b.t = 0;
      b.x = b.px;
      b.y = b.py;
      b.vx = (crand() - 0.3) * 160;
      b.vy = -170 - crand() * 90 - p * 80;
      b.img.setTexture(birdKey, 0).setOrigin(0.5, 0.5).setFlipX(b.vx < 0).setScale(1);
    }
  };

  // ——— the jars rattling, the ferns stirring
  const jars = JARS.map((j, i) => ({ img: k.pivot(k.sprite(j.id), j.x, JAR_FOOT), rot: new Spring(0, 90, 7), hop: new Spring(0, 140, 10), seed: i * 2.1 }));
  const fernsR = new Swing(k.pivot(k.sprite('fernsR'), FERNS_R.x, FERNS_R.y), { k: 10, c: 1.6, idle: 0.025, seed: 3, speed: 0.8 });
  const crownS = new Swing(k.pivot(k.sprite('crown'), FERN_TOP[0], FERN_TOP[1]), { k: 5, c: 0.9, idle: 0.012, seed: 7, speed: 0.6 });

  return {
    setWave(w) {
      kw = waveK(w);
    },
    impact(x, y, p) {
      if (p <= 0.02) return;
      // the oven: a flare of the fire, sparks and ash out of the mouth, a puff and sparks up the smoke hole
      boost.v += 2 + p * 4;
      for (let i = 0; i < 8 + p * 14; i++) mouthSpark(p);
      for (let i = 0; i < 3 + p * 6; i++) {
        ash.spawn({ x: MOUTH.x + (crand() - 0.5) * 120, y: PLAT - 20 - crand() * 40, vx: (crand() - 0.5) * 140, vy: -30 - crand() * 70, life: 1.4 + crand(), r0: 10, r1: 34 + crand() * 18, a: 0.5, tint: 0xb4aab0, grav: -24, drag: 1.4, spin: (crand() - 0.5) * 1.5, fade: 0.06 });
      }
      for (let i = 0; i < 2 + p * 4; i++) {
        ash.spawn({ x: HOLE.x + (crand() - 0.5) * 16, y: HOLE.y - 4, vx: (crand() - 0.5) * 40, vy: -60 - crand() * 60, life: 1.8 + crand(), r0: 12, r1: 40, a: 0.45, tint: 0x5a5060, grav: -10, drag: 0.8, spin: (crand() - 0.5), fade: 0.05 });
      }
      for (let i = 0; i < 2 + p * 5; i++) holeSpark(p);
      // the jars rattle on the ground (the nearer the stomp, the more)
      for (const j of jars) {
        const near = 1 / (1 + Math.abs(j.img.x - x) / 900);
        j.rot.v += (crand() - 0.5) * 2 * p * 2.4 * near * calm();
        j.hop.v -= p * (20 + crand() * 30) * near * calm();
      }
      fernsR.kick((crand() - 0.3) * p * 0.6);
      crownS.kick((crand() - 0.5) * p * 0.2);
      // the birds go up; the fireflies scatter
      if (p > 0.12) scare(p);
      for (const f of flies) {
        const dx = f.x0 - x;
        const dy = f.y0 - y;
        const d = Math.hypot(dx, dy) || 1;
        f.ox.v += (dx / d) * p * 90;
        f.oy.v += (dy / d) * p * 60 - p * 30;
      }
    },
    update(dt, t) {
      const cm = calm();
      shown += (kw - shown) * Math.min(1, dt * 0.6);
      const day = shown;
      // ——— the dawn
      sunrise.setAlpha(clamp01(day ** 1.1 * 0.62));
      limb.setAlpha(clamp01((day - 0.72) / 0.28) * (0.9 + 0.1 * Math.sin(t * 0.7)));
      for (const d of fgDawn) d.setAlpha(clamp01(day ** 1.2));
      // ——— the stars
      for (const s of stars) {
        const g = Math.sin(t * 0.31 * s.sp + s.ph * 3);
        const glint = g > 0.97 ? (g - 0.97) / 0.03 : 0;
        // the faint ones go first
        const out = clamp01(day * 1.6 - s.fade * 0.5);
        s.img.setAlpha((s.base * (0.5 + 0.5 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph))) + glint * 0.6) * (1 - out) * 0.9);
      }
      const va = 1 - day * 0.75;
      venus.setAlpha(va * (0.9 + 0.1 * Math.sin(t * 2.3))).setScale(0.9 + 0.06 * Math.sin(t * 1.7));
      venusGlow.setAlpha(0.2 * va);
      // ——— the volcano
      plume.step(dt * cm);
      plume.each((im) => im.setTint(lerpCol(0xffffff, 0xffd8d0, day)));
      crater.setAlpha((0.26 + 0.08 * Math.sin(t * 0.9) + 0.04 * Math.sin(t * 2.7)) * (1 - day * 0.3));
      // ——— the fire
      const b = boost.step(0, dt);
      const fk = lerp(1, 0.82, day) * (1 + Math.max(0, b) * 0.4);
      fire.alpha = Math.min(1, 0.92 * fk);
      fire.step(dt, 1 + Math.max(0, b) * 0.6);
      coals.setAlpha((0.34 + 0.08 * Math.sin(t * 1.3) + 0.05 * Math.sin(t * 3.7)) * fk);
      for (const l of lights) l.img.setAlpha(l.a * flicker(t, l.seed) * fk);
      holeGlow.setAlpha((0.18 + 0.06 * flicker(t * 0.7, 9)) * fk);
      // ——— the smoke and its sparks
      smoke.step(dt * cm);
      smoke.each((im) => im.setTint(lerpCol(0xffffff, 0xffe0d8, day)));
      sparkRate.tick(1.1 * cm, dt, () => holeSpark());
      mouthRate.tick(0.6 * cm, dt, () => mouthSpark());
      sparks.update(dt);
      ash.update(dt);
      // ——— the mist
      const mt = lerpCol(0xc0b0dc, 0xffc8b8, day);
      for (const m of mists) {
        m.x += m.v * dt * cm;
        if (m.x - m.w * 0.6 > 1460) m.x = 280 - m.w * 0.6;
        const edge = clamp01((m.x - 260) / 160) * clamp01((1450 - m.x) / 160);
        m.img.setPosition(m.x, m.y - day * 18 + wander(t * 0.15, m.seed) * 2).setTint(mt);
        m.img.setAlpha(m.a * 1.3 * edge * (1 - day * 0.8));
      }
      // ——— the fireflies
      for (const f of flies) {
        const ox = f.ox.step(0, dt);
        const oy = f.oy.step(0, dt);
        const x = f.x0 + wander(t * 0.25, f.seed) * 26 * cm + ox;
        const y = f.y0 + wander(t * 0.2, f.seed + 5) * 18 * cm + oy;
        const lit = Math.max(0, Math.sin(t * f.sp + f.ph)) ** 3;
        const on = clamp01((1 - day * 1.15 - f.order * 0.4) * 2.5);
        f.glow.setPosition(x, y).setAlpha(0.32 * lit * on);
        f.core.setPosition(x, y).setAlpha(0.9 * lit * on);
      }
      // ——— the birds crossing
      flockT -= dt;
      if (flockT < 0) {
        flock();
        flockT = lerp(14, 4, day) + crand() * 5;
      }
      pteroT -= dt;
      if (pteroT < 0) {
        ptero();
        pteroT = 24 + crand() * 20;
      }
      for (const f of flyers) {
        if (!f.live) continue;
        const isPtero = f.img.texture.key === pteroKey;
        const n = isPtero ? PT.n : BIRD.n;
        f.flap -= dt;
        // flap in bouts, glide between (wings held out)
        const flapping = f.flap > 0;
        if (f.flap < -(isPtero ? 2.4 : 0.8)) f.flap = isPtero ? 1.4 + crand() : 0.6 + crand() * 1.4;
        f.ph = flapping ? (f.ph + dt * (isPtero ? 1.6 : 7) * cm) % 1 : f.ph + (0.25 - f.ph) * Math.min(1, dt * 6);
        f.x += f.vx * dt;
        f.y += (f.vy + (flapping ? -4 : 5)) * dt;
        f.img.setFrame(Math.floor(((f.ph % 1) + 1) % 1 * n) % n).setPosition(f.x, f.y + Math.sin(t * 2 + f.bob) * 2);
        f.img.setAlpha(clamp01(Math.min(f.x + 100, W + 100 - f.x) / 80) * 0.95);
        if (f.x < -160 || f.x > W + 160) {
          f.live = false;
          f.img.setAlpha(0);
        }
      }
      // ——— the birds on the awning
      for (const bd of perchers) {
        bd.t += dt;
        if (bd.st === 0) {
          bd.poseT -= dt * (1 + day);
          if (bd.poseT < 0) {
            bd.pose = crand() < 0.4 ? 0 : 1 + Math.floor(crand() * 3);
            bd.poseT = 0.6 + crand() * 2.6;
            if (crand() < 0.25 * (0.4 + day)) bd.hop.v -= 70;
            bd.img.setFrame(bd.pose);
          }
          bd.img.setPosition(bd.px, bd.py + Math.min(0, bd.hop.step(0, dt)));
        } else if (bd.st === 1) {
          bd.ph = (bd.ph + dt * 10) % 1;
          bd.vy += 60 * dt;
          bd.x += bd.vx * dt;
          bd.y += bd.vy * dt;
          bd.img.setFrame(Math.floor(bd.ph * BIRD.n) % BIRD.n).setPosition(bd.x, bd.y);
          if (bd.y < -40 || bd.t > 4) {
            bd.st = 2;
            bd.t = 0;
            bd.img.setAlpha(0);
          }
        } else if (bd.st === 2) {
          if (bd.t > 7 + bd.px * 0.02) {
            bd.st = 3;
            bd.t = 0;
            bd.x = bd.px - 260 - crand() * 120;
            bd.y = bd.py - 220 - crand() * 60;
            bd.img.setAlpha(1).setFlipX(false);
          }
        } else {
          // gliding back down to the perch, flaring to land
          const dx = bd.px - bd.x;
          const dy = bd.py - 6 - bd.y;
          const d = Math.hypot(dx, dy);
          const sp = Math.min(200, 40 + d * 1.4);
          bd.x += (dx / (d || 1)) * sp * dt;
          bd.y += (dy / (d || 1)) * sp * dt;
          bd.ph = d < 60 ? (bd.ph + dt * 12) % 1 : bd.ph + (0.25 - bd.ph) * Math.min(1, dt * 4);
          bd.img.setFrame(Math.floor(((bd.ph % 1) + 1) % 1 * BIRD.n) % BIRD.n).setPosition(bd.x, bd.y);
          if (d < 5) {
            bd.st = 0;
            bd.t = 0;
            bd.img.setTexture(perchKey, 0).setOrigin(birdOrigin[0], birdOrigin[1]).setPosition(bd.px, bd.py).setScale(1.35);
            bd.hop.v -= 40;
          }
        }
      }
      // ——— the jars and the ferns
      for (const j of jars) {
        j.img.setRotation(j.rot.step(0, dt) * 0.12);
        j.img.y = JAR_FOOT + Math.min(0, j.hop.step(0, dt));
      }
      fernsR.update(dt, t);
      crownS.update(dt, t);
    },
  };
});
