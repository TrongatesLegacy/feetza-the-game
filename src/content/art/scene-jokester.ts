// Ha-Ha Funhouse (THE JOKESTER's arena: the boss of Batpeel's Goth-Ham nemesis stage, wave 65; src/game/nemesis.ts),
// redrawn with the location kit (src/art/scene) in the Comics act's light print, of a piece with Goth-Ham Rooftops and
// the Pit (scene-gotham.ts, scene-bunion.ts): painted forms under a light dot screen and inked edges, the storm's cold
// blues, with the funhouse's garish purple and acid green and its warm bulbs.
//
// An abandoned carnival on Goth-Ham's waterfront, at night in the storm: we're inside its big top, the hall of laughs.
// The canopy sags overhead in faded purple and green stripes, torn through in two places, the storm showing through
// and the rain coming in (cold shafts of it down to the sawdust); a rickety wooden coaster track runs across under the
// canopy on hangers. The sidewall at the back hangs slack in the dark. On the left the funhouse's front: a giant
// sad-happy clown mask of our own (a sad brow and a painted tear on one side, a happy brow and a star on the other, a
// lopsided grin that's the doorway), its greasepaint peeling off the boards, ringed with marquee bulbs (some dead),
// 'HA-HA HALL' over its brow; a popcorn cart parked by its cheek with balloons tied to it, and a carousel horse lying
// broken at its chin. Deep in the tent, between the lanes, the dead carousel. On the right the hall of distorting
// mirrors under its 'SLICE OF LIFE?' board, a test-your-strength tower scored from WET SOCK to STOMPER!, a prize booth
// of creepy toys and the laugh-track box hanging from the coaster. Playing-card bunting of our own suits (slices,
// soles, pepperonis and grins). The table is the funhouse's old stage: scuffed boards with its faded spinning disc
// painted on them, confetti in the cracks.
//
// Readability: the face frames the scene from the left, its eyes and grin well clear of the lanes and dim at rest;
// the middle of the tent (where his feet hover, the joke boxes fly and the gas clouds sit) stays dark and quiet; the
// prizes and anything box-shaped stay at the sides.
//
// Live (the heroes):
// - the bulbs: the marquee chases and flickers, dead ones stay dead; a stomp pops a few (a flash, a tinkle of glass,
//   dark for a while, then they stutter back);
// - the carousel: painted at 16 phases going round, horses rising and falling on their poles; it creaks round in fits,
//   stalls and lurches on again;
// - the strength tester: the puck leaps up its rail on a stomp (as high as the stomp was hard), rings the bell on a big
//   one; and the rain coming in through the holes (drops, splashes, ripples), lightning in the holes now and then.
// Also: the coaster car rattling across overhead now and then, balloons bobbing on their strings, confetti and popcorn
// bouncing on a stomp, a mirror cracking (it mends slowly). The fight drives it (the jokester brain in
// src/game/bosses/gotham.ts emits these): 'jokester-bomb' (a bomb blows: the face's eyes flare green, the laugh-track
// box lights HA HA HA, the bulbs flash, the puck jumps) and 'jokester-phase' (his entrance and each new phase: all of
// that, the bulbs strobe, the carousel lurches and the coaster car is sent round). On the stages page the funhouse runs
// a bomb and phase cycle on its own. (The old art is kept in scenes-gotham.ts and its old live layer in
// live/gotham.ts for the before/after page.)

import Phaser from 'phaser';
import {
  type Box,
  type Ctx,
  type PathFn,
  type R,
  TY,
  W,
  calmLanes,
  castShadow,
  crevice,
  ellPath,
  glowAt,
  groundShadow,
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
import { shaft } from '../../art/scene/light';
import { planksPlane, tableFalloff, tableSeam } from '../../art/scene/materials';
import { lay, noiseMask, softly, streaks, surface } from '../../art/scene/paint';
import { drape } from '../../art/scene/props';
import { benDay, dots, ink, linTone } from '../../art/scene/print';
import { cloud } from '../../art/scene/sky';
import { MATERIALS } from '../../art/style/materials';
import { makeCanvas, mix, rgba, rng, shade } from '../../art/util';
import { xAt, yAt } from '../../art/backdrops';
import { crand } from '../../systems/cosmeticRandom';
import { save } from '../../systems/save';
import { calm, flicker, registerKitScene, wander } from '../../game/sceneLive';
import { Loop, Parts, Rate, Spring, sheet } from '../../game/sceneAnim';
import { SPLASH, ringTex, splashFrame } from './scene-gotham';

type Pt = [number, number];

// ——— layout ———

export const JK = {
  /** Where the canopy meets the sidewall at the back (the valance hangs below it). */
  eave: 236,
  /** The back sidewall's foot on the sawdust. */
  wallFoot: 696,
  /** The funhouse face (centre, half width and height); its chin is the floor. */
  face: { x: 178, y: 470, rx: 206, ry: 268, floor: 754 },
  /** The doorway (the grin): its centre, the top of its arch and its half width at the floor. */
  mouth: { x: 192, top: 600, hw: 92 },
  eyes: [[98, 404], [268, 398]] as Pt[],
  nose: { x: 184, y: 498, r: 30 },
  /** 'HA-HA HALL' over the brow. */
  marquee: { x: 184, y: 182, hw: 172 },
  cart: { x: 70, floor: 760 },
  /** The carousel, deep in the tent: centre, canopy rim, deck. */
  carousel: { x: 744, rim: 520, deck: 680, rx: 150 },
  mirrors: [
    { x0: 1528, x1: 1620, top: 436, foot: 712 },
    { x0: 1628, x1: 1728, top: 420, foot: 716 },
  ],
  tester: { x: 1766, top: 292, base: 748 },
  booth: { x0: 1814, top: 330, floor: 760 },
  /** The laugh-track box, hung from the coaster track. */
  laugh: { x: 1640, y: 232, w: 176, h: 50 },
  /** The holes torn in the canopy (centre, half sizes). */
  holes: [
    { x: 352, y: 74, rx: 92, ry: 40 },
    { x: 1560, y: 104, rx: 104, ry: 42 },
    { x: 846, y: 30, rx: 42, ry: 18 },
  ],
  front: 1040,
};

const INK = '#0a0e1a';
const P2 = Math.PI * 2;
const SODIUM = '#ffb45a';
const MOONLIT = '#c8d6f0';
const BULB = '#ffd27a';
const PURPLE = '#4a2a66';
const GREEN = '#3e6a34';
/** The face's boards: greasepaint gone grey-cream in the storm light (darker than the white sneakers that hover over it). */
const FACE_PAINT = '#a8a294';
const RED = '#b0242c';
const GOLD = '#c89a3a';
const smooth = (e0: number, e1: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
const WOOD = { ...MATERIALS.wood, shadowTint: '#0a0810' };
const IRON = { ...MATERIALS.iron, shadowTint: '#06080e' };
const PAINT = { ...MATERIALS.enamel, shadowTint: '#10081a', texA: 0.2 };
const BLOCK = '"Impact", "Haettenschweiler", "Arial Black", sans-serif';
const SLAB = '"Rockwell", "Cooper Black", "Georgia", serif';

/** How busy a spot behind the play area may be: low over the lanes' span, lower still near the table. */
const calmAt = (x: number, y: number): number => {
  const mid = 1 - smooth(560, 760, Math.abs(x - 960));
  return 1 - mid * (0.35 + 0.5 * smooth(300, 700, y));
};

/** A ragged outline round a centre (holes, peels, tears), seeded. */
function ragged(cx: number, cy: number, rx: number, ry: number, seed: number, n = 22, jag = 0.22): Pt[] {
  const r = rng(seed);
  const out: Pt[] = [];
  const ph = r() * P2;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * P2;
    // a torn outline: a lopsided wobble, small jags, now and then a notch where the cloth split along the weave
    const notch = r() < 0.12 ? -jag * 1.6 : 0;
    const k = 1 + 0.16 * Math.sin(a * 2 + ph) + 0.08 * Math.sin(a * 5 + ph * 2) + (r() - 0.5) * jag + notch;
    out.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return out;
}

const HOLE_PTS = JK.holes.map((h, i) => ragged(h.x, h.y, h.rx, h.ry, 900 + i * 7, 40, 0.14));
const holePath = (i: number): PathFn => polyPath(HOLE_PTS[i]);

// ——— the storm through the holes ———

const SKY_BOX: Box = { x: 0, y: 0, w: W, h: 170 };
const cloudPal = (k: number) => ({ lit: mix('#aab8d4', '#4a5670', k), body: mix('#3a4660', '#1c2234', k), shadow: mix('#141a2a', '#080a14', k) });

function sky(ctx: Ctx, r: R): void {
  within(ctx, (c) => {
    c.beginPath();
    for (const pts of HOLE_PTS) {
      c.moveTo(...pts[0]);
      for (const p of pts.slice(1)) c.lineTo(...p);
      c.closePath();
    }
  }, () => {
    vfill(ctx, 0, 0, W, 170, [[0, '#08101e'], [0.6, '#142038'], [1, '#1c2a44']]);
    // the storm deck, silvered by a moon somewhere up on the left
    for (const [x, y, w, h, k] of [[300, 70, 300, 50, 0.65], [420, 104, 260, 40, 0.85], [1520, 92, 320, 54, 0.7], [1640, 134, 260, 40, 0.9], [850, 40, 160, 30, 0.8]] as const)
      cloud(ctx, r, x, y, w, h, { ...cloudPal(k - 0.25), sunX: 160, sunY: -100, rim: 0.8, kind: 'bank', wisp: 0.6, a: 0.85 });
    benDay(ctx, SKY_BOX, '#02040c', 0.28, 9, 0.2, 0.05);
    // the rain coming in, a fine slant against the cloud
    ctx.strokeStyle = 'rgba(170,186,220,0.16)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (let i = 0; i < 160; i++) {
      const x = r() * W;
      const y = r() * 170;
      ctx.moveTo(x, y);
      ctx.lineTo(x + 4, y + 14 + r() * 10);
    }
    ctx.stroke();
  });
}

/** The holes lit by lightning (live only, laid on with ADD): the cloud's underside blazing through the tears. */
function skyLit(ctx: Ctx): void {
  for (let i = 0; i < HOLE_PTS.length; i++)
    within(ctx, holePath(i), () => {
      const h = JK.holes[i];
      const g = ctx.createRadialGradient(h.x - h.rx * 0.3, h.y - h.ry * 0.4, 4, h.x, h.y, h.rx * 1.2);
      g.addColorStop(0, 'rgba(230,238,255,0.95)');
      g.addColorStop(1, 'rgba(120,140,200,0.5)');
      ctx.fillStyle = g;
      ctx.fillRect(h.x - h.rx * 1.3, h.y - h.ry * 1.3, h.rx * 2.6, h.ry * 2.6);
    });
  // and a cold wash down the canopy round them
  for (const h of JK.holes.slice(0, 2)) glowAt(ctx, h.x, h.y + 20, 260, '#8ea4e0', 0.22, 0.7);
}

// ——— the canopy ———

/** The canopy's panels run up to the king pole, high above the frame. */
const APEX: Pt = [960, -1500];
const eaveY = (x: number): number => JK.eave + 8 * Math.sin((x / W) * Math.PI) - 6 * Math.cos((x / 320) * Math.PI);
/** Where the line from an eave point to the apex is at screen y. */
const toApex = (x: number, y: number): number => x + (APEX[0] - x) * ((eaveY(x) - y) / (eaveY(x) - APEX[1]));
const PANEL = 150;
const CANOPY_BOX: Box = { x: 0, y: 0, w: W, h: JK.eave + 46 };

function canopy(ctx: Ctx, r: R): void {
  ctx.save();
  // the canvas with the holes cut out of it
  ctx.beginPath();
  ctx.rect(0, 0, W, JK.eave + 46);
  for (const pts of HOLE_PTS) {
    ctx.moveTo(...pts[0]);
    for (const p of pts.slice(1)) ctx.lineTo(...p);
    ctx.closePath();
  }
  ctx.clip('evenodd');
  ctx.beginPath();
  for (let x = 0; x <= W; x += 20) ctx.lineTo(x, eaveY(x) + 4);
  ctx.lineTo(W, 0);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.clip();
  // the stripes: each panel from the eave up to the pole, purple and green by turns
  for (let i = -3; i * PANEL < W + PANEL * 3; i++) {
    const x0 = i * PANEL - 40;
    const x1 = x0 + PANEL;
    const quad: Pt[] = [[x0, eaveY(x0) + 6], [x1, eaveY(x1) + 6], [toApex(x1, -10), -10], [toApex(x0, -10), -10]];
    const col = i % 2 ? mix(PURPLE, '#1c2232', 0.6) : mix(GREEN, '#1c2232', 0.66);
    ctx.fillStyle = col;
    polyPath(quad)(ctx);
    ctx.fill();
    // the canvas bellies down between the seams: lighter mid-panel, dark at the seams
    within(ctx, polyPath(quad), () => {
      const mx = (x0 + x1) / 2;
      const g = ctx.createLinearGradient(x0 - 30, 0, x1 + 30, 0);
      g.addColorStop(0, 'rgba(4,4,12,0.55)');
      g.addColorStop(0.45, 'rgba(200,200,230,0.06)');
      g.addColorStop(1, 'rgba(4,4,12,0.6)');
      ctx.fillStyle = g;
      ctx.fillRect(Math.min(x0, toApex(x0, -10)) - 40, -10, Math.abs(x1 - x0) + 400, JK.eave + 30);
      void mx;
    });
  }
  // the canvas surface: drift, painter's strokes along the panels, a canvas weave
  surface(ctx, r, CANOPY_BOX, '#000000', { over: true, vary: 0.35, mottle: 0.3, strokes: 0.25, strokeAng: Math.PI / 2, strokeLen: 90, grain: 0.22, grainKind: 'canvas', warm: '#6a5a7a', cool: '#0a0c1a', seed: 21 });
  // it sags between the purlin ropes: swags of shade under each rope line, the rope itself
  for (const [y0, sag] of [[64, 18], [150, 22]] as const) {
    ctx.save();
    for (let x = -100; x < W + 100; x += 300) {
      const yy = y0 + (x > 600 && x < 1300 ? -6 : 0);
      ctx.beginPath();
      ctx.moveTo(x, yy);
      ctx.quadraticCurveTo(x + 150, yy + sag * 2, x + 300, yy);
      ctx.lineTo(x + 300, yy + 34);
      ctx.quadraticCurveTo(x + 150, yy + sag * 2 + 34, x, yy + 34);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, yy, 0, yy + sag * 2 + 34);
      g.addColorStop(0, 'rgba(2,2,8,0.5)');
      g.addColorStop(1, 'rgba(2,2,8,0)');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = 'rgba(30,26,34,0.9)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(x, yy);
      ctx.quadraticCurveTo(x + 150, yy + sag * 2, x + 300, yy);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(160,150,140,0.16)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  }
  // rain stains spreading from the tears and running down the panels to the eave; mildew in the folds
  for (const h of JK.holes) {
    softly(ctx, { x: h.x - h.rx * 2, y: Math.max(0, h.y - h.ry * 2), w: h.rx * 4, h: JK.eave + 20 - Math.max(0, h.y - h.ry * 2) }, (g) => {
      g.fillStyle = 'rgba(30,22,18,0.55)';
      g.beginPath();
      g.ellipse(h.x, h.y + h.ry * 0.4, h.rx * 1.5, h.ry * 1.7, 0, 0, P2);
      g.fill();
      g.fillStyle = 'rgba(14,10,10,0.4)';
      for (let k = 0; k < 6; k++) g.fillRect(h.x - h.rx + k * h.rx * 0.36 + (r() - 0.5) * 20, h.y, 10 + r() * 14, JK.eave - h.y);
    }, 0.25);
    streaks(ctx, r, h.x - h.rx * 0.8, h.y + h.ry, h.rx * 1.6, JK.eave - h.y - h.ry, '#120c0a', 0.18, 7);
  }
  lay(ctx, noiseMask(12, 23, { cover: 0.3, soft: 0.2, col: '#16201a' }), CANOPY_BOX, 0.35);
  // the frayed lips of the tears: canvas threads catching the sky's light, the cloth's thickness
  for (let i = 0; i < HOLE_PTS.length; i++) {
    const pts = HOLE_PTS[i];
    const h = JK.holes[i];
    ctx.strokeStyle = 'rgba(150,160,190,0.4)';
    ctx.lineWidth = 2;
    holePath(i)(ctx);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(190,190,200,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const [px, py] of pts) {
      const ang = Math.atan2(py - h.y, px - h.x) + Math.PI + (r() - 0.5) * 0.8;
      const len = 4 + r() * 9;
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(ang) * len, py + Math.sin(ang) * len);
    }
    ctx.stroke();
  }
  // the printed shade: heavier up into the pole's dark and over the middle
  dots(ctx, CANOPY_BOX, (x, y) => 0.2 + 0.4 * (1 - smooth(0, JK.eave, y)) + 0.2 * (1 - smooth(200, 700, Math.abs(x - 960))), '#02030a', { step: 7, angle: 0.79, a: 0.5 });
  ctx.restore();
  // the cut edge of the canvas round each tear: its thickness along the near (lower) lip, the far lip in shadow
  for (let i = 0; i < HOLE_PTS.length; i++) {
    const pts = HOLE_PTS[i];
    const h = JK.holes[i];
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(2,2,8,0.85)';
    ctx.lineWidth = 4;
    holePath(i)(ctx);
    ctx.stroke();
    ctx.beginPath();
    for (const [px, py] of pts) if (py > h.y) ctx.lineTo(px, py + 2);
    ctx.strokeStyle = 'rgba(170,176,200,0.5)';
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.restore();
  }
  // torn strips hanging from the two big tears' near lips, still striped, curling to show their backs
  for (const [hi, u, fw, len, twist, purple] of [[0, -0.55, 30, 62, 0.5, 1], [0, 0.35, 22, 40, -0.4, 0], [1, -0.4, 26, 52, -0.45, 0], [1, 0.5, 34, 74, 0.35, 1]] as const) {
    const h = JK.holes[hi];
    const lip = (x: number) => h.y + h.ry * Math.sqrt(Math.max(0, 1 - ((x - h.x) / (h.rx * 1.05)) ** 2)) * 0.92;
    const xa = h.x + u * h.rx - fw / 2;
    const xb = xa + fw;
    const a: Pt = [xa, lip(xa) - 4];
    const b: Pt = [xb, lip(xb) - 4];
    const tip: Pt = [(xa + xb) / 2 + twist * 26, Math.max(a[1], b[1]) + len];
    const flap: PathFn = (c) => {
      c.beginPath();
      c.moveTo(...a);
      c.bezierCurveTo(a[0] - 4, a[1] + len * 0.4, tip[0] - fw * 0.3 - twist * 10, tip[1] - len * 0.3, tip[0] - 3, tip[1]);
      c.lineTo(tip[0] + 3, tip[1] - 4);
      c.bezierCurveTo(tip[0] + fw * 0.25, tip[1] - len * 0.4, b[0] + 6, b[1] + len * 0.3, b[0], b[1]);
      c.closePath();
    };
    const box = { x: Math.min(xa, tip[0]) - 20, y: a[1] - 6, w: fw + 60, h: len + 20 };
    castShadow(ctx, flap, 8, 8, 0.45, '#02020a');
    ctx.fillStyle = purple ? mix(PURPLE, '#1c2232', 0.5) : mix(GREEN, '#1c2232', 0.55);
    flap(ctx);
    ctx.fill();
    within(ctx, flap, () => {
      // the curl: its back (paler, unpainted canvas) showing on one side near the tip
      const g = ctx.createLinearGradient(xa, 0, xb, 0);
      g.addColorStop(0, twist > 0 ? 'rgba(2,2,8,0.45)' : 'rgba(150,160,200,0.2)');
      g.addColorStop(1, twist > 0 ? 'rgba(150,160,200,0.2)' : 'rgba(2,2,8,0.45)');
      ctx.fillStyle = g;
      ctx.fillRect(box.x, box.y, box.w, box.h);
      vfill(ctx, box.x, box.y, box.w, box.h, [[0, 'rgba(2,2,8,0.4)'], [0.4, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0)']]);
      ctx.strokeStyle = 'rgba(200,200,210,0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo((xa + xb) / 2, a[1] + 6);
      ctx.quadraticCurveTo((xa + xb) / 2 + twist * 6, a[1] + len * 0.6, tip[0], tip[1] - 6);
      ctx.stroke();
    });
    ink(ctx, flap, 1.3, INK, 0.3);
    ctx.fillStyle = 'rgba(190,206,240,0.6)';
    ctx.beginPath();
    ctx.ellipse(tip[0], tip[1] + 3, 1.8, 2.6, 0, 0, P2);
    ctx.fill();
  }
  valance(ctx, r);
}

/** The valance along the eave: scalloped flaps in turn, gold braid, a fringe; slack and torn in places. */
function valance(ctx: Ctx, r: R): void {
  const SW = 64;
  for (let i = 0, x = -10; x < W + SW; i++, x += SW) {
    const y = eaveY(x + SW / 2);
    const torn = i === 7 || i === 22;
    const depth = torn ? 18 : 30 + (i % 3) * 2;
    const p: PathFn = (c) => {
      c.beginPath();
      c.moveTo(x, y - 4);
      c.lineTo(x + SW, y - 4);
      if (torn) {
        c.lineTo(x + SW, y + 10);
        c.lineTo(x + SW * 0.7, y + depth);
        c.lineTo(x + SW * 0.5, y + 8);
        c.lineTo(x + SW * 0.25, y + depth + 4);
        c.lineTo(x, y + 6);
      } else c.quadraticCurveTo(x + SW / 2, y + depth * 1.7, x, y - 4);
      c.closePath();
    };
    const col = i % 2 ? mix(PURPLE, '#141a28', 0.45) : mix(GREEN, '#141a28', 0.5);
    ctx.fillStyle = col;
    p(ctx);
    ctx.fill();
    within(ctx, p, () => {
      vfill(ctx, x, y - 4, SW, depth + 30, [[0, 'rgba(2,2,8,0.5)'], [0.5, 'rgba(200,190,220,0.05)'], [1, 'rgba(2,2,8,0.4)']]);
    });
    ink(ctx, p, 1.6, INK, 0.4);
    // the fringe under the flap
    if (!torn) {
      ctx.strokeStyle = rgba(GOLD, 0.35);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let k = 0; k < 8; k++) {
        const u = (k + 0.5) / 8;
        const fx = x + u * SW;
        const fy = y - 4 + Math.sin(u * Math.PI) * depth * 0.85;
        ctx.moveTo(fx, fy);
        ctx.lineTo(fx + (r() - 0.5) * 2, fy + 5 + r() * 4);
      }
      ctx.stroke();
    }
  }
  // the braid along the eave
  ctx.strokeStyle = mix(GOLD, '#2a2010', 0.5);
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 16) ctx.lineTo(x, eaveY(x) - 3);
  ctx.stroke();
  ctx.strokeStyle = rgba('#e8c070', 0.25);
  ctx.lineWidth = 1;
  ctx.stroke();
}

// ——— the back sidewall ———

const WALL_BOX: Box = { x: 0, y: JK.eave - 20, w: W, h: JK.wallFoot + 10 - (JK.eave - 20) };

function backWall(ctx: Ctx, r: R): void {
  const top = JK.eave - 10;
  const foot = JK.wallFoot;
  const wall: PathFn = (c) => {
    c.beginPath();
    c.rect(0, top, W, foot - top + 4);
  };
  drape(ctx, wall, { x: 0, y: top, w: W, h: foot - top + 4 }, '#262234', {
    fold: 46,
    depth: 0.55,
    phase: 1.3,
    pattern: (c, fold) => {
      // the stripes, bending with the folds: wide faded green on the plum
      for (let x = 0; x < W; x += 4) {
        const f = fold(x, (top + foot) / 2);
        const sx = x + f * 6;
        if (Math.floor(sx / 120) % 2 === 0) {
          c.fillStyle = 'rgba(70,96,74,0.5)';
          c.fillRect(x, top, 4, foot - top + 4);
        }
      }
    },
  });
  within(ctx, wall, () => {
    // the hem: a darker skirt, splashed and dirty from the sawdust
    vfill(ctx, 0, foot - 70, W, 74, [[0, 'rgba(6,4,10,0)'], [1, 'rgba(6,4,10,0.55)']]);
    lay(ctx, noiseMask(14, 31, { cover: 0.4, soft: 0.25, col: '#120c0a' }), { x: 0, y: foot - 60, w: W, h: 60 }, 0.5);
    // mildew blooms and rain streaks down from the valance
    lay(ctx, noiseMask(9, 33, { cover: 0.28, soft: 0.25, col: '#18221a' }), { x: 0, y: top, w: W, h: foot - top }, 0.4);
    for (let i = 0; i < 18; i++) streaks(ctx, r, r() * W, top + 20, 30 + r() * 50, 120 + r() * 200, '#0c0810', 0.16, 4);
    // the dark of the tent's depths: the far wall lost in the gloom, deepest in the middle
    vfill(ctx, 0, top, W, foot - top, [[0, 'rgba(4,4,12,0.5)'], [0.5, 'rgba(4,4,12,0.22)'], [1, 'rgba(4,4,12,0.4)']]);
    const g = ctx.createRadialGradient(960, 480, 80, 960, 480, 820);
    g.addColorStop(0, 'rgba(4,4,12,0.45)');
    g.addColorStop(1, 'rgba(4,4,12,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, top, W, foot - top);
    dots(ctx, { x: 0, y: top, w: W, h: foot - top }, (x, y) => 0.3 + 0.35 * (1 - calmAt(x, y)), '#02030a', { step: 7, angle: 0.79, a: 0.45 });
  });
  // the valance's shadow on the wall
  crevice(ctx, 0, W, top + 22, 60, 0.5, '#02020a');
}

// ——— the sawdust floor between the sidewall and the stage ———

const FLOOR_BOX: Box = { x: 0, y: JK.wallFoot - 8, w: W, h: TY + 4 - (JK.wallFoot - 8) };
/** Where the rain through the holes puddles on the sawdust. */
export const FLOOR_PUDDLES: [number, number, number, number][] = [
  [420, 742, 70, 7],
  [1520, 730, 80, 7],
  [880, 706, 40, 4],
];
const CONFETTI = ['#b6f04a', '#8a4ad0', '#e0303a', '#f2c14e', '#e8e4f0', '#4ac0e0'];

function floor(ctx: Ctx, r: R): void {
  const y0 = JK.wallFoot;
  const box = { x: 0, y: y0 - 4, w: W, h: TY + 4 - y0 };
  surface(ctx, r, box, '#2c2228', { vary: 0.5, cells: 6, mottle: 0.4, strokes: 0.6, strokeAng: 0, strokeLen: 80, strokeW: 8, grain: 0.3, grainKind: 'speckle', warm: '#6a5040', cool: '#12101c', seed: 41 });
  // sawdust: pale flecks, thicker where the feet of the crowd went, trodden dark at the sides
  ctx.fillStyle = 'rgba(200,170,120,0.16)';
  for (let i = 0; i < 900; i++) {
    const x = r() * W;
    const y = y0 + r() * (TY - y0);
    ctx.fillRect(x, y, 1 + r() * 2.4, 1);
  }
  // confetti trodden into it, more at the sides
  for (let i = 0; i < 260; i++) {
    const x = r() * W;
    if (Math.abs(x - 960) < 520 && r() < 0.7) continue;
    const y = y0 + 4 + r() * (TY - y0 - 6);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(r() * P2);
    ctx.fillStyle = rgba(CONFETTI[Math.floor(r() * CONFETTI.length)], 0.35 + r() * 0.3);
    ctx.fillRect(-2.5, -1, 5, 2);
    ctx.restore();
  }
  // the puddles under the tears: dark, holding a sliver of the cold sky
  for (const [px, py, rx, ry] of FLOOR_PUDDLES) {
    softly(ctx, { x: px - rx - 20, y: py - ry - 12, w: rx * 2 + 40, h: ry * 2 + 24 }, (g) => {
      g.fillStyle = 'rgba(6,8,16,0.55)';
      g.beginPath();
      g.ellipse(px, py, rx, ry, 0, 0, P2);
      g.fill();
    }, 0.25);
    ctx.fillStyle = 'rgba(150,170,214,0.18)';
    ctx.beginPath();
    ctx.ellipse(px - rx * 0.15, py - ry * 0.2, rx * 0.6, ry * 0.35, 0, 0, P2);
    ctx.fill();
  }
  // the sidewall's foot: occlusion where the canvas meets the floor, and the gloom far back
  crevice(ctx, 0, W, y0, 18, 0.55, '#02020a');
  vfill(ctx, 0, y0, W, TY - y0, [[0, 'rgba(4,4,12,0.45)'], [1, 'rgba(4,4,12,0)']]);
  dots(ctx, box, (x) => 0.2 + 0.25 * (1 - calmAt(x, 720)), '#02030a', { step: 6, angle: 0.79, a: 0.4 });
}

// ——— the coaster track overhead ———

const TRACK_CTRL: Pt[] = [[-80, 132], [260, 142], [600, 110], [960, 92], [1300, 114], [1640, 150], [2000, 130]];
/** The track's rail height at screen x (a smooth run through its bents). */
export function trackY(x: number): number {
  const c = TRACK_CTRL;
  let i = 0;
  while (i < c.length - 2 && x > c[i + 1][0]) i++;
  const [x0, y0] = c[i];
  const [x1, y1] = c[i + 1];
  const u = Math.max(0, Math.min(1, (x - x0) / (x1 - x0)));
  return y0 + (y1 - y0) * (0.5 - 0.5 * Math.cos(u * Math.PI));
}
const TRACK_BOX: Box = { x: 0, y: 0, w: W, h: 210 };

function coaster(ctx: Ctx): void {
  ctx.save();
  ctx.lineCap = 'round';
  // the hangers up into the canopy's dark
  for (let x = 120; x < W; x += 260) {
    if (JK.holes.some((h) => Math.abs(h.x - x) < h.rx * 1.2)) continue;
    const y = trackY(x) + 4;
    const g = ctx.createLinearGradient(0, 0, 0, y);
    g.addColorStop(0, 'rgba(40,40,52,0)');
    g.addColorStop(1, 'rgba(40,40,52,0.9)');
    ctx.strokeStyle = g;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 6, 0);
    ctx.lineTo(x, y);
    ctx.stroke();
  }
  // the truss under the deck: a lower chord and X-braces, dark against the canvas
  const lower = (x: number) => trackY(x) + 38;
  ctx.strokeStyle = '#141018';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 12) ctx.lineTo(x, lower(x));
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x < W; x += 56) {
    ctx.moveTo(x, trackY(x) + 14);
    ctx.lineTo(x + 56, lower(x + 56));
    ctx.moveTo(x, lower(x));
    ctx.lineTo(x + 56, trackY(x + 56) + 14);
    ctx.moveTo(x, trackY(x) + 14);
    ctx.lineTo(x, lower(x));
  }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(130,140,170,0.12)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // the deck's fascia: old timber, its top edge catching the light from the tears
  const fascia: PathFn = (c) => {
    c.beginPath();
    for (let x = -10; x <= W + 10; x += 10) c.lineTo(x, trackY(x));
    for (let x = W + 10; x >= -10; x -= 10) c.lineTo(x, trackY(x) + 16);
    c.closePath();
  };
  ctx.fillStyle = '#2a2026';
  fascia(ctx);
  ctx.fill();
  within(ctx, fascia, () => {
    vfill(ctx, 0, 80, W, 100, [[0, 'rgba(160,150,170,0.1)'], [1, 'rgba(0,0,0,0.3)']]);
    // butt joints and bolts along it
    ctx.fillStyle = 'rgba(4,4,8,0.8)';
    for (let x = 30; x < W; x += 130) ctx.fillRect(x, trackY(x) - 2, 2, 20);
    for (let x = 12; x < W; x += 65) {
      ctx.fillStyle = 'rgba(160,160,170,0.35)';
      ctx.fillRect(x, trackY(x) + 7, 2, 2);
    }
    dots(ctx, TRACK_BOX, () => 0.45, '#02030a', { step: 5, angle: 0.79, a: 0.5 });
  });
  ink(ctx, fascia, 1.6, INK, 0.4);
  // the ties' ends and the running rail, its top bright where the holes' light catches it
  ctx.fillStyle = '#1c1418';
  for (let x = -8; x < W; x += 22) ctx.fillRect(x, trackY(x) - 5, 10, 6);
  ctx.strokeStyle = '#4a4e5a';
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  for (let x = -10; x <= W + 10; x += 10) ctx.lineTo(x, trackY(x) - 7);
  ctx.stroke();
  for (const h of JK.holes.slice(0, 2)) {
    const g = ctx.createLinearGradient(h.x - 240, 0, h.x + 240, 0);
    g.addColorStop(0, 'rgba(200,214,255,0)');
    g.addColorStop(0.5, 'rgba(200,214,255,0.55)');
    g.addColorStop(1, 'rgba(200,214,255,0)');
    ctx.strokeStyle = g;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let x = h.x - 240; x <= h.x + 240; x += 10) ctx.lineTo(x, trackY(x) - 8);
    ctx.stroke();
  }
  ctx.restore();
}

// ——— the carousel, deep in the tent ———

const CA = JK.carousel;
const CAROUSEL_AIR = '#161a28';
const CHAZE = 0.6;
const far = (c: string) => mix(c, CAROUSEL_AIR, CHAZE);
const CAR_N = 8;
const CAR_RING = { rx: 118, ry: 20 };
/** The ring's slot: the poles and horses (and the column they turn round). */
export const CAROUSEL_BOX: Box = { x: CA.x - CA.rx - 20, y: CA.rim - 2, w: CA.rx * 2 + 40, h: CA.deck - CA.rim + 10 };

/** A carousel horse in profile (facing right), round (x, y) at its saddle, size s (about 110·s long). */
function horseShape(c: Ctx, x: number, y: number, s: number, dir: number, sx = 1): void {
  c.save();
  c.translate(x, y);
  c.scale(s * dir * sx, s);
  c.beginPath();
  c.moveTo(-30, -8);
  c.quadraticCurveTo(-5, -20, 18, -14);
  c.quadraticCurveTo(26, -34, 36, -48);
  c.lineTo(41, -56);
  c.lineTo(44, -50);
  c.quadraticCurveTo(54, -42, 58, -30);
  c.quadraticCurveTo(61, -23, 54, -21);
  c.quadraticCurveTo(44, -25, 38, -21);
  c.quadraticCurveTo(34, -8, 30, 4);
  c.quadraticCurveTo(20, 16, 0, 16);
  c.quadraticCurveTo(-24, 16, -34, 6);
  c.quadraticCurveTo(-38, -4, -30, -8);
  c.closePath();
  c.restore();
}
/** Its legs (prancing) and tail as strokes, in the same frame. */
function horseLegs(c: Ctx, x: number, y: number, s: number, dir: number, col: string, sx = 1, w = 6): void {
  c.save();
  c.translate(x, y);
  c.scale(s * dir * sx, s);
  c.strokeStyle = col;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.lineWidth = w;
  c.beginPath();
  c.moveTo(24, 6);
  c.lineTo(38, 16);
  c.lineTo(34, 28);
  c.moveTo(16, 10);
  c.lineTo(26, 26);
  c.lineTo(40, 24);
  c.moveTo(-24, 8);
  c.lineTo(-30, 26);
  c.lineTo(-24, 38);
  c.moveTo(-16, 10);
  c.lineTo(-14, 28);
  c.lineTo(-8, 38);
  c.stroke();
  c.lineWidth = w + 1;
  c.beginPath();
  c.moveTo(-33, -4);
  c.quadraticCurveTo(-52, 6, -46, 26);
  c.stroke();
  c.restore();
}

/** The carousel's canopy and deck (still: they don't turn visibly). */
function carouselStill(ctx: Ctx): void {
  const { x, rim, deck, rx } = CA;
  groundShadow(ctx, x, deck + 6, rx + 30, 14, 0.75, '#02020a');
  // the deck: a low drum, brass studs round its skirt
  ctx.fillStyle = far('#3a2a3a');
  ctx.beginPath();
  ctx.ellipse(x, deck - 8, rx, 16, 0, 0, P2);
  ctx.fill();
  ctx.fillStyle = far('#2a1e2c');
  ctx.beginPath();
  ctx.ellipse(x, deck - 4, rx, 16, 0, 0, Math.PI);
  ctx.lineTo(x - rx, deck - 8);
  ctx.ellipse(x, deck - 8, rx, 16, 0, Math.PI, 0, true);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = far('#8a7448');
  for (let k = -3; k <= 3; k++) {
    const u = k / 3.6;
    ctx.fillRect(x + u * rx - 3, deck - 6 + 14 * Math.sqrt(1 - u * u), 6, 3);
  }
  // the roof: a peaked cone of wedges
  const peak: Pt = [x, rim - 92];
  for (let k = 0; k < 10; k++) {
    const u0 = k / 10;
    const u1 = (k + 1) / 10;
    ctx.fillStyle = far(k % 2 ? '#5a3070' : '#b8a888');
    ctx.beginPath();
    ctx.moveTo(...peak);
    ctx.lineTo(x - rx * 1.08 + u0 * rx * 2.16, rim + Math.sin(u0 * Math.PI) * 6);
    ctx.lineTo(x - rx * 1.08 + u1 * rx * 2.16, rim + Math.sin(u1 * Math.PI) * 6);
    ctx.closePath();
    ctx.fill();
  }
  const cone: PathFn = polyPath([peak, [x + rx * 1.08, rim], [x, rim + 6], [x - rx * 1.08, rim]]);
  within(ctx, cone, () => {
    const g = ctx.createLinearGradient(x - rx, 0, x + rx, 0);
    g.addColorStop(0, 'rgba(4,4,12,0.35)');
    g.addColorStop(0.3, 'rgba(150,160,200,0.14)');
    g.addColorStop(0.5, 'rgba(4,4,12,0.1)');
    g.addColorStop(1, 'rgba(4,4,12,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(x - rx * 1.2, peak[1], rx * 2.4, rim - peak[1] + 8);
  });
  ink(ctx, cone, 1.4, far(INK), 0.3);
  // the scalloped rim with its dead bulbs
  for (let k = 0; k < 9; k++) {
    const sw = (rx * 2.16) / 9;
    const sx = x - rx * 1.08 + k * sw;
    const sy = rim + Math.sin(((k + 0.5) / 9) * Math.PI) * 6;
    ctx.fillStyle = far(k % 2 ? '#b8a888' : '#5a3070');
    ctx.beginPath();
    ctx.moveTo(sx, sy - 2);
    ctx.lineTo(sx + sw, sy - 2);
    ctx.quadraticCurveTo(sx + sw / 2, sy + 22, sx, sy - 2);
    ctx.fill();
    ctx.fillStyle = far('#4a4030');
    ctx.beginPath();
    ctx.arc(sx + sw / 2, sy, 2.6, 0, P2);
    ctx.fill();
  }
  ctx.strokeStyle = far(GOLD);
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let k = 0; k <= 12; k++) ctx.lineTo(x - rx * 1.08 + (k / 12) * rx * 2.16, rim - 2 + Math.sin((k / 12) * Math.PI) * 6);
  ctx.stroke();
  // the pole and its torn pennant
  ctx.strokeStyle = far('#8a7a5a');
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(peak[0], peak[1]);
  ctx.lineTo(peak[0], peak[1] - 24);
  ctx.stroke();
  ctx.fillStyle = far('#7a2a3a');
  ctx.beginPath();
  ctx.moveTo(peak[0], peak[1] - 24);
  ctx.lineTo(peak[0] + 22, peak[1] - 20);
  ctx.lineTo(peak[0] + 12, peak[1] - 17);
  ctx.lineTo(peak[0] + 18, peak[1] - 13);
  ctx.lineTo(peak[0], peak[1] - 14);
  ctx.fill();
  // the gloom it stands in
  dots(ctx, { x: x - rx - 30, y: peak[1] - 30, w: rx * 2 + 60, h: deck - peak[1] + 50 }, () => 0.4, '#02030a', { step: 5, angle: 0.79, a: 0.45 });
}

/** One phase of the carousel turning (phase 0…1 moves the ring one horse on): horses and poles going round, rising and
 * falling, the mirrored column in the middle. Painted with CAROUSEL_BOX's corner at (0, 0). One pole has lost its
 * horse (it lies broken by the funhouse's door). */
export function carouselFrame(c: Ctx, ph: number, broken = 3): void {
  c.save();
  c.translate(-CAROUSEL_BOX.x, -CAROUSEL_BOX.y);
  const { x, rim, deck } = CA;
  const ringY = deck - 18;
  const items = Array.from({ length: CAR_N }, (_, i) => {
    const th = ((i + ph) / CAR_N) * P2;
    return { i, th, z: Math.cos(th) };
  }).sort((a, b) => a.z - b.z);
  const column = () => {
    const cw = 22;
    const col: PathFn = rectPath(x - cw, rim + 6, cw * 2, ringY - rim);
    c.fillStyle = far('#3a2e3a');
    col(c);
    c.fill();
    // mirror panels on it, turning: their light slides round with the phase
    within(c, col, () => {
      for (let k = 0; k < 6; k++) {
        const a = ((k + ph * 0.75) / 6) * P2;
        if (Math.cos(a) < 0.05) continue;
        const px = x + Math.sin(a) * cw;
        c.fillStyle = far(mix('#9aa0b8', '#2a2a3a', 1 - Math.cos(a)));
        c.fillRect(px - 4 * Math.cos(a), rim + 18, 8 * Math.cos(a), ringY - rim - 24);
      }
    });
    c.strokeStyle = far(INK);
    c.lineWidth = 1.2;
    col(c);
    c.stroke();
  };
  let drewCol = false;
  for (const it of items) {
    if (!drewCol && it.z >= 0) {
      column();
      drewCol = true;
    }
    const px = x + Math.sin(it.th) * CAR_RING.rx;
    const py = ringY + it.z * CAR_RING.ry;
    const sc = 0.5 + 0.07 * it.z;
    const bob = Math.sin(it.th * 4) * 9;
    const lum = 0.42 + 0.42 * it.z;
    const dir = it.z >= 0 ? 1 : -1;
    const isBroken = it.i === broken;
    // the brass pole from the rim to the deck (snapped short above the lost horse)
    c.strokeStyle = far(mix('#c8a44a', '#1a1410', 1 - lum));
    c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(px, rim + 12);
    c.lineTo(px, isBroken ? rim + 44 : py);
    c.stroke();
    if (isBroken) continue;
    const hy = py - 30 + bob;
    const body = far(mix(it.i % 2 ? '#d8ccb0' : '#a88ab8', '#141018', 1 - lum));
    const squash = 0.3 + 0.7 * Math.abs(it.z);
    horseLegs(c, px, hy, sc, dir, body, squash);
    horseShape(c, px, hy, sc, dir, squash);
    c.fillStyle = body;
    c.fill();
    c.strokeStyle = far(INK);
    c.lineWidth = 1.1;
    c.stroke();
    c.fillStyle = far(mix(it.i % 2 ? '#8a2a3a' : '#2a7a4a', '#0a0810', 1 - lum));
    c.beginPath();
    c.ellipse(px - 2 * dir * squash, hy - 8 * sc, 10 * sc * squash + 1, 5 * sc, 0, 0, P2);
    c.fill();
    // the mane down the neck and the gilt collar where the pole goes in
    c.strokeStyle = far(mix('#4a2a6a', '#0a0810', 1 - lum));
    c.lineWidth = 3 * sc;
    c.beginPath();
    c.moveTo(px + 20 * sc * dir * squash, hy - 16 * sc);
    c.quadraticCurveTo(px + 26 * sc * dir * squash, hy - 36 * sc, px + 36 * sc * dir * squash, hy - 48 * sc);
    c.stroke();
    c.fillStyle = far(mix('#e0b84a', '#1a1410', 1 - lum));
    c.fillRect(px - 2.4, hy - 24 * sc, 4.8, 4);
  }
  if (!drewCol) column();
  c.restore();
}

// ——— the funhouse face ———

const F = JK.face;
const M = JK.mouth;
/** The facade's outline: a great round head, its jaw running straight down to the floor. */
const headPath: PathFn = (c) => {
  c.beginPath();
  c.moveTo(F.x - F.rx * 0.93, F.floor);
  c.bezierCurveTo(F.x - F.rx * 1.02, F.y + 60, F.x - F.rx * 1.06, F.y - 40, F.x - F.rx, F.y - 60);
  c.bezierCurveTo(F.x - F.rx * 0.9, F.y - F.ry * 1.02, F.x + F.rx * 0.9, F.y - F.ry * 1.02, F.x + F.rx, F.y - 60);
  c.bezierCurveTo(F.x + F.rx * 1.06, F.y - 40, F.x + F.rx * 1.02, F.y + 60, F.x + F.rx * 0.93, F.floor);
  c.closePath();
};
const bz = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt => {
  const u = 1 - t;
  return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]];
};
/** The marquee bulbs round the head, a little in from its edge. */
const FACE_BULBS: Pt[] = (() => {
  const out: Pt[] = [];
  const i = 16;
  const segs: [Pt, Pt, Pt, Pt][] = [
    [[F.x - F.rx * 0.93 + i, F.floor - 170], [F.x - F.rx * 1.02 + i, F.y + 60], [F.x - F.rx * 1.06 + i, F.y - 40], [F.x - F.rx + i, F.y - 60]],
    [[F.x - F.rx + i, F.y - 60], [F.x - F.rx * 0.9 + i, F.y - F.ry * 1.02 + i], [F.x + F.rx * 0.9 - i, F.y - F.ry * 1.02 + i], [F.x + F.rx - i, F.y - 60]],
    [[F.x + F.rx - i, F.y - 60], [F.x + F.rx * 1.06 - i, F.y - 40], [F.x + F.rx * 1.02 - i, F.y + 60], [F.x + F.rx * 0.93 - i, F.floor - 170]],
  ];
  const counts = [4, 12, 4];
  segs.forEach((s, si) => {
    for (let k = si ? 1 : 0; k <= counts[si]; k++) out.push(bz(...s, k / counts[si]));
  });
  return out;
})();
/** The marquee's bulbs along its arched top. */
const MARQUEE_BULBS: Pt[] = Array.from({ length: 11 }, (_, k) => {
  const u = k / 10;
  const mq = JK.marquee;
  return [mq.x - mq.hw + 14 + u * (mq.hw * 2 - 28), mq.y - 22 - Math.sin(u * Math.PI) * 18] as Pt;
});
/** Every marquee bulb the live layer runs: the face's, the sign's, the tester's top and the prize booth's lamp. */
export const BULBS: { x: number; y: number; r: number; dead: boolean; group: number }[] = [
  ...FACE_BULBS.map(([x, y], i) => ({ x, y, r: 6.5, dead: [1, 3, 9, 15].includes(i), group: 0 })),
  ...MARQUEE_BULBS.map(([x, y], i) => ({ x, y, r: 5.5, dead: i === 7, group: 1 })),
  { x: JK.tester.x, y: JK.tester.top - 26, r: 7, dead: false, group: 2 },
];

function bulbSocket(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.fillStyle = '#16121a';
  ctx.beginPath();
  ctx.arc(x + 1, y + 1.5, r + 2.4, 0, P2);
  ctx.fill();
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, 0.5, x, y, r);
  g.addColorStop(0, 'rgba(220,210,190,0.7)');
  g.addColorStop(0.5, 'rgba(110,100,90,0.6)');
  g.addColorStop(1, 'rgba(40,34,40,0.9)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, P2);
  ctx.fill();
}

/** A lit bulb (the still paints these; the live layer lays its own on). */
export function bulbLit(ctx: Ctx, x: number, y: number, r: number, k = 1): void {
  glowAt(ctx, x, y, r * 7, BULB, 0.22 * k);
  glowAt(ctx, x, y, r * 2.6, '#ffe8b0', 0.5 * k);
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0.5, x, y, r);
  g.addColorStop(0, rgba('#fffbe8', k));
  g.addColorStop(0.6, rgba('#ffd890', k));
  g.addColorStop(1, rgba('#d08030', k * 0.9));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, P2);
  ctx.fill();
}

/** The lit ones in the still: the chase caught half on, the dead ones dark. */
function bulbsStill(ctx: Ctx): void {
  BULBS.forEach((b, i) => {
    if (b.dead || i % 3 === 1) return;
    bulbLit(ctx, b.x, b.y, b.r, i % 3 === 0 ? 1 : 0.6);
  });
}

/** The bulbs' warmth on what's round them (still and live: the chase is too quick for its light to follow). */
function bulbLight(ctx: Ctx): void {
  lightPool(ctx, F.x, F.y - 40, 300, 320, BULB, 0.07);
  lightPool(ctx, JK.marquee.x, JK.marquee.y, 240, 70, BULB, 0.08);
  lightPool(ctx, F.x + 120, F.floor + 2, 260, 26, BULB, 0.1);
}

/** The tear-drop and the star painted round the eyes, and the brows: the sad side and the happy side. */
function faceFeatures(ctx: Ctx): void {
  const [[lx, ly], [rx, ry]] = JK.eyes;
  // cheeks: rosy greasepaint, rubbed and flaking
  for (const [cx, cy] of [[F.x - 124, 516], [F.x + 128, 506]] as const) {
    softly(ctx, { x: cx - 70, y: cy - 60, w: 140, h: 120 }, (g) => {
      g.fillStyle = 'rgba(200,80,100,0.35)';
      g.beginPath();
      g.ellipse(cx, cy, 46, 34, 0, 0, P2);
      g.fill();
    }, 0.3);
    dots(ctx, { x: cx - 50, y: cy - 40, w: 100, h: 80 }, (x, y) => Math.max(0, 0.75 - Math.hypot((x - cx) / 46, (y - cy) / 34) * 0.75), '#b8405a', { step: 4.5, angle: 1.31, a: 0.7, floor: 0.05 });
  }
  // the sad side: a brow sloping down to the outside, a painted blue tear
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#1a1424';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(lx + 38, ly - 70);
  ctx.quadraticCurveTo(lx - 4, ly - 64, lx - 46, ly - 36);
  ctx.stroke();
  const tear: PathFn = (c) => {
    c.beginPath();
    c.moveTo(lx - 8, ly + 44);
    c.quadraticCurveTo(lx - 24, ly + 78, lx - 8, ly + 88);
    c.quadraticCurveTo(lx + 8, ly + 78, lx - 8, ly + 44);
    c.closePath();
  };
  solid(ctx, tear, { x: lx - 26, y: ly + 40, w: 36, h: 50 }, PAINT, '#3a7ac8', { line: 2, formSize: 8 });
  // the happy side: a brow flung up in an arch, a purple star round the eye
  ctx.strokeStyle = '#1a1424';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(rx - 46, ry - 54);
  ctx.quadraticCurveTo(rx - 4, ry - 112, rx + 46, ry - 70);
  ctx.stroke();
  const star: PathFn = (c) => {
    c.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k / 10) * P2 + 0.12;
      const rr = k % 2 ? 36 : 66;
      const px = rx + Math.cos(a) * rr;
      const py = ry + 4 + Math.sin(a) * rr * 0.92;
      if (k) c.lineTo(px, py);
      else c.moveTo(px, py);
    }
    c.closePath();
  };
  within(ctx, star, () => {
    ctx.fillStyle = '#5a2a86';
    ctx.fillRect(rx - 80, ry - 80, 160, 170);
    lay(ctx, noiseMask(6, 51, { cover: 0.3, soft: 0.12, col: '#c8bca4' }), { x: rx - 80, y: ry - 80, w: 160, h: 170 }, 0.6);
  });
  ink(ctx, star, 2, '#1a1028', 0.3);
  // the eyes: round windows of dark glass with the green behind them, dim at rest
  for (const [ex, ey] of JK.eyes) {
    const eye = ellPath(ex, ey, 30, 32);
    ctx.strokeStyle = 'rgba(40,30,40,0.55)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.ellipse(ex, ey, 38, 40, 0, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
    ctx.fillStyle = '#0a0a10';
    eye(ctx);
    ctx.fill();
    const g = ctx.createRadialGradient(ex, ey + 4, 2, ex, ey, 32);
    g.addColorStop(0, 'rgba(150,210,80,0.45)');
    g.addColorStop(0.6, 'rgba(60,100,40,0.3)');
    g.addColorStop(1, 'rgba(10,14,10,0)');
    ctx.fillStyle = g;
    eye(ctx);
    ctx.fill();
    ctx.fillStyle = '#060608';
    ctx.beginPath();
    ctx.ellipse(ex + 4, ey + 4, 10, 12, 0, 0, P2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(230,236,255,0.4)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(ex, ey, 24, Math.PI * 1.1, Math.PI * 1.4);
    ctx.stroke();
    ink(ctx, eye, 3, INK, 0.4);
  }
  // the nose: a big red ball, scuffed through to the wood
  const n = JK.nose;
  const ball = ellPath(n.x, n.y, n.r, n.r);
  castShadow(ctx, ball, 10, 10, 0.45, '#1a0810');
  solid(ctx, ball, { x: n.x - n.r, y: n.y - n.r, w: n.r * 2, h: n.r * 2 }, PAINT, RED, { line: 2.6, formSize: 22 });
  within(ctx, ball, () => {
    lay(ctx, noiseMask(5, 52, { cover: 0.2, soft: 0.1, col: '#8a7a6a' }), { x: n.x - n.r, y: n.y - n.r, w: n.r * 2, h: n.r * 2 }, 0.7);
    dots(ctx, { x: n.x - n.r, y: n.y - n.r, w: n.r * 2, h: n.r * 2 }, linTone(n.x - n.r * 0.5, n.y - n.r * 0.5, n.x + n.r, n.y + n.r, 0, 0.8), '#200408', { step: 4, a: 0.6, angle: 0.79 });
  });
  ctx.fillStyle = 'rgba(255,240,230,0.7)';
  ctx.beginPath();
  ctx.ellipse(n.x - 10, n.y - 12, 7, 4, -0.6, 0, P2);
  ctx.fill();
}

/** The grin, the funhouse's doorway: a wide open mouth drooping at one corner and turned up at the other, its middle
 * running down to the floor as the door. */
const MOUTH = { l: [F.x - 160, 642] as Pt, r: [F.x + 170, 546] as Pt };
const mouthPath: PathFn = (c) => {
  const { l, r: rr } = MOUTH;
  c.beginPath();
  c.moveTo(...l);
  c.quadraticCurveTo(F.x - 112, 606, M.x - 60, 604);
  c.quadraticCurveTo(M.x + 60, 600, F.x + 122, 584);
  c.quadraticCurveTo(F.x + 152, 574, rr[0], rr[1]);
  c.quadraticCurveTo(F.x + 150, 616, M.x + M.hw, 652);
  c.lineTo(M.x + M.hw, F.floor);
  c.lineTo(M.x - M.hw, F.floor);
  c.lineTo(M.x - M.hw, 662);
  c.quadraticCurveTo(F.x - 124, 662, l[0], l[1]);
  c.closePath();
};

const FACE_BOX: Box = { x: 0, y: JK.marquee.y - 70, w: F.x + F.rx + 60, h: F.floor + 16 - (JK.marquee.y - 70) };

function face(ctx: Ctx, r: R): void {
  castShadow(ctx, headPath, 26, 30, 0.55, '#02020a');
  // hair: tufts of purple plywood curls behind the head on both sides
  for (const s of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const hx = F.x + s * (F.rx * 0.9 - k * 6);
      const hy = F.y - 160 + k * 56;
      const tuft = ellPath(hx + s * 24, hy, 46 - k * 3, 34, s * 0.5);
      solid(ctx, tuft, { x: hx + s * 24 - 50, y: hy - 40, w: 100, h: 80 }, PAINT, mix('#5a2a86', '#2a1840', k * 0.12), { line: 2.6, formSize: 24 });
      ctx.strokeStyle = 'rgba(10,6,20,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hx + s * 24, hy, 20 - k * 2, s > 0 ? -0.8 : 2.2, s > 0 ? 1.2 : 4.2);
      ctx.stroke();
    }
  }
  // the head: cream greasepaint on boards, peeling
  const hb = { x: F.x - F.rx - 10, y: F.y - F.ry, w: F.rx * 2 + 20, h: F.floor - (F.y - F.ry) };
  // the cut-out's thickness, seen down its right edge (it's a board, not a wall)
  ctx.save();
  ctx.translate(9, 3);
  ctx.fillStyle = '#15101a';
  headPath(ctx);
  ctx.fill();
  ctx.restore();
  solid(ctx, headPath, hb, PAINT, FACE_PAINT, { line: false, formSize: 140 });
  within(ctx, headPath, () => {
    surface(ctx, r, hb, FACE_PAINT, { over: true, vary: 0.4, mottle: 0.4, strokes: 0.5, strokeAng: 0.1, grain: 0.2, seed: 53, warm: '#d8ccb0', cool: '#4a5470' });
    // the boards it's painted on
    ctx.strokeStyle = 'rgba(40,30,30,0.3)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let y = hb.y + 40; y < F.floor; y += 58) {
      ctx.moveTo(hb.x, y);
      ctx.lineTo(hb.x + hb.w, y + 2);
    }
    ctx.stroke();
    // the paint peeling off in flakes, the grey wood under it
    lay(ctx, noiseMask(9, 54, { cover: 0.18, soft: 0.04, col: '#7a7064' }), hb, 0.7);
    lay(ctx, noiseMask(18, 55, { cover: 0.12, soft: 0.04, col: '#5a5248' }), hb, 0.6);
    for (let i = 0; i < 7; i++) streaks(ctx, r, hb.x + 30 + r() * (hb.w - 60), hb.y + 40 + r() * 60, 30, 160 + r() * 140, '#3a3036', 0.22, 4);
    faceFeatures(ctx);
    // the light: the bulbs' warmth all round its rim, its jaw falling into shade
    const g = ctx.createRadialGradient(F.x - 90, F.y - 170, 30, F.x, F.y, F.ry * 1.25);
    g.addColorStop(0, 'rgba(255,226,180,0.12)');
    g.addColorStop(0.35, 'rgba(40,50,80,0.12)');
    g.addColorStop(0.8, 'rgba(14,16,34,0.35)');
    g.addColorStop(1, 'rgba(8,8,20,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(hb.x, hb.y, hb.w, hb.h);
    vfill(ctx, hb.x, F.y + 80, hb.w, F.floor - F.y - 80, [[0, 'rgba(6,4,12,0)'], [1, 'rgba(6,4,12,0.45)']]);
    dots(ctx, hb, (x, y) => 0.32 * smooth(F.x - 80, F.x + F.rx, x) + 0.4 * smooth(F.y + 40, F.floor, y), '#140a18', { step: 5, angle: 0.79, a: 0.4, floor: 0.06 });
  });
  // the mouth: the dark of the funhouse, a spinning barrel's rings far in, one bulb at the end of it
  ctx.fillStyle = '#050408';
  mouthPath(ctx);
  ctx.fill();
  within(ctx, mouthPath, () => {
    const cx = M.x + 6;
    const cy = 692;
    for (let k = 7; k >= 1; k--) {
      ctx.strokeStyle = k % 2 ? 'rgba(90,46,120,0.4)' : 'rgba(70,110,56,0.34)';
      ctx.lineWidth = 7 - k * 0.6;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 13 * k, 17 * k, 0, 0, P2);
      ctx.stroke();
    }
    glowAt(ctx, cx, cy - 6, 30, BULB, 0.35);
    ctx.fillStyle = 'rgba(255,220,150,0.8)';
    ctx.beginPath();
    ctx.arc(cx, cy - 6, 2.6, 0, P2);
    ctx.fill();
    vfill(ctx, 0, 560, W, 90, [[0, 'rgba(0,0,0,0.9)'], [1, 'rgba(0,0,0,0)']]);
  });
  // the teeth: big buck teeth hanging from the lip, one knocked out
  for (const [k, dx, w, h] of [[0, -64, 34, 54], [1, -26, 36, 60], [2, 14, 36, 58], [3, 54, 30, 46]] as const) {
    const tx = M.x + dx;
    const ty = 590 - dx * 0.04;
    if (k === 2) {
      ctx.fillStyle = 'rgba(40,14,20,0.95)';
      ctx.fillRect(tx + 4, ty, w - 8, 10);
      continue;
    }
    const tooth = rrPath(tx, ty, w, h, 6);
    solid(ctx, tooth, { x: tx, y: ty, w, h }, PAINT, '#e8dcc0', { line: 2, formSize: 10 });
    lay(ctx, noiseMask(4, 57 + k, { cover: 0.2, soft: 0.1, col: '#8a7a68' }), { x: tx, y: ty, w, h }, 0.5);
  }
  // the lips: thick red greasepaint round the mouth, chipped; the corners creased, one down and one up
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, F.floor - 16);
  ctx.clip();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 34;
  mouthPath(ctx);
  ctx.stroke();
  ctx.strokeStyle = '#9a1c2a';
  ctx.lineWidth = 28;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,150,150,0.25)';
  ctx.lineWidth = 6;
  ctx.save();
  ctx.translate(-3, -6);
  mouthPath(ctx);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(MOUTH.l[0] - 10, MOUTH.l[1] - 10);
  ctx.quadraticCurveTo(MOUTH.l[0] - 22, MOUTH.l[1] + 10, MOUTH.l[0] - 14, MOUTH.l[1] + 30);
  ctx.moveTo(MOUTH.r[0] + 8, MOUTH.r[1] + 12);
  ctx.quadraticCurveTo(MOUTH.r[0] + 26, MOUTH.r[1] - 4, MOUTH.r[0] + 18, MOUTH.r[1] - 28);
  ctx.stroke();
  // the tongue: a red rubber ramp out of the door onto the sawdust
  const tongue: PathFn = polyPath([[M.x - M.hw + 14, F.floor - 12], [M.x + M.hw - 14, F.floor - 12], [M.x + M.hw + 8, F.floor + 6], [M.x - M.hw - 8, F.floor + 6]]);
  solid(ctx, tongue, { x: M.x - M.hw - 8, y: F.floor - 12, w: M.hw * 2 + 16, h: 18 }, 'rubber', '#8a2a3a', { line: 1.6, formSize: 6 });
  ctx.strokeStyle = 'rgba(30,6,12,0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(M.x, F.floor - 10);
  ctx.lineTo(M.x, F.floor + 4);
  ctx.stroke();
  crevice(ctx, F.x - F.rx, F.x + F.rx, F.floor + 2, 10, 0.6, '#02020a');
  ink(ctx, headPath, 3.4, INK, 0.6);
  FACE_BULBS.forEach(([bx, by], i) => {
    bulbSocket(ctx, bx, by, 6.5);
    if (!BULBS[i].dead) return;
    // smashed: the glass gone, a jagged rim and the filament stub
    ctx.fillStyle = '#08060a';
    ctx.beginPath();
    for (let k = 0; k < 8; k++) ctx.lineTo(bx + Math.cos(k * 0.785) * (k % 2 ? 3 : 6), by + Math.sin(k * 0.785) * (k % 2 ? 3 : 6));
    ctx.fill();
    ctx.strokeStyle = 'rgba(200,200,190,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx - 1, by + 2);
    ctx.lineTo(bx + 1, by - 2);
    ctx.stroke();
  });
  marquee(ctx);
}

function marquee(ctx: Ctx): void {
  const mq = JK.marquee;
  // the posts it stands on, bolted to the crown
  for (const s of [-1, 1]) {
    const px = mq.x + s * (mq.hw - 50);
    solid(ctx, rectPath(px - 5, mq.y + 20, 10, 64), { x: px - 5, y: mq.y + 20, w: 10, h: 64 }, IRON, '#3a3640', { line: 1.4, formSize: 4 });
  }
  const board: PathFn = (c) => {
    c.beginPath();
    c.moveTo(mq.x - mq.hw, mq.y + 26);
    c.lineTo(mq.x - mq.hw, mq.y - 16);
    c.quadraticCurveTo(mq.x, mq.y - 56, mq.x + mq.hw, mq.y - 16);
    c.lineTo(mq.x + mq.hw, mq.y + 26);
    c.closePath();
  };
  const bb = { x: mq.x - mq.hw, y: mq.y - 50, w: mq.hw * 2, h: 76 };
  castShadow(ctx, board, 14, 16, 0.5, '#02020a');
  solid(ctx, board, bb, WOOD, '#2a1a3a', { line: false, formSize: 24 });
  within(ctx, board, () => {
    ctx.strokeStyle = mix(GOLD, '#3a2a10', 0.35);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(mq.x - mq.hw + 10, mq.y + 18);
    ctx.lineTo(mq.x - mq.hw + 10, mq.y - 12);
    ctx.quadraticCurveTo(mq.x, mq.y - 48, mq.x + mq.hw - 10, mq.y - 12);
    ctx.lineTo(mq.x + mq.hw - 10, mq.y + 18);
    ctx.closePath();
    ctx.stroke();
    // the lettering: carnival slab, cream with a purple drop shade, scuffed
    ctx.font = `bold 40px ${SLAB}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#12081c';
    ctx.fillText('HA-HA HALL', mq.x + 3, mq.y + 6);
    ctx.fillStyle = '#e8dcc0';
    ctx.fillText('HA-HA HALL', mq.x, mq.y + 2);
    lay(ctx, noiseMask(10, 58, { cover: 0.22, soft: 0.1, col: '#2a1a3a' }), { x: mq.x - mq.hw, y: mq.y - 30, w: mq.hw * 2, h: 50 }, 0.6);
    dots(ctx, bb, linTone(mq.x - mq.hw, 0, mq.x + mq.hw, 0, 0.02, 0.5), '#06020a', { step: 5, angle: 0.79, a: 0.4, floor: 0.06 });
  });
  ink(ctx, board, 2.6, INK, 0.5);
  for (const [bx, by] of MARQUEE_BULBS) bulbSocket(ctx, bx, by, 5.5);
}

// ——— the popcorn cart by its cheek, the balloons, the broken horse at its chin ———

const CART = { x0: 4, x1: 118, floor: 762, wheel: { x: 88, r: 30 } };
const CART_BOX: Box = { x: 0, y: 490, w: 150, h: CART.floor + 6 - 490 };

function cart(ctx: Ctx, r: R): void {
  const { x0, x1, floor: fl } = CART;
  const cab = { y0: 644, y1: 710 };
  const glass = { y0: 568, y1: 644 };
  const roof = 532;
  groundShadow(ctx, (x0 + x1) / 2 + 20, fl - 2, 80, 8, 0.55, '#02020a');
  castShadow(ctx, rectPath(x0, roof, x1 - x0, fl - roof - 30), 18, 20, 0.45, '#02020a');
  // the stand's leg and the handle
  solid(ctx, rectPath(x0 + 10, cab.y1, 8, fl - cab.y1 - 4), { x: x0 + 10, y: cab.y1, w: 8, h: fl - cab.y1 }, IRON, '#3a3a44', { line: 1.4, formSize: 3 });
  // the cabinet: red, gold scrolls, its name
  const cabP = rectPath(x0, cab.y0, x1 - x0, cab.y1 - cab.y0);
  solid(ctx, cabP, { x: x0, y: cab.y0, w: x1 - x0, h: cab.y1 - cab.y0 }, PAINT, '#8a1e28', { line: false, formSize: 20 });
  within(ctx, cabP, () => {
    ctx.strokeStyle = rgba(GOLD, 0.7);
    ctx.lineWidth = 2;
    ctx.strokeRect(x0 + 6, cab.y0 + 6, x1 - x0 - 12, cab.y1 - cab.y0 - 12);
    ctx.font = `21px ${BLOCK}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#2a0608';
    ctx.fillText('POPCORN', (x0 + x1) / 2 + 1.5, (cab.y0 + cab.y1) / 2 + 2.5);
    ctx.fillStyle = '#f4e4b8';
    ctx.fillText('POPCORN', (x0 + x1) / 2, (cab.y0 + cab.y1) / 2 + 1);
    lay(ctx, noiseMask(5, 61, { cover: 0.25, soft: 0.08, col: '#4a3a34' }), { x: x0, y: cab.y0, w: x1 - x0, h: cab.y1 - cab.y0 }, 0.6);
    dots(ctx, { x: x0, y: cab.y0, w: x1 - x0, h: cab.y1 - cab.y0 }, linTone(x0, 0, x1, 0, 0.15, 0.6), '#100206', { step: 4.5, angle: 0.79, a: 0.5 });
  });
  ink(ctx, cabP, 2.2, INK, 0.5);
  // the glass case: popcorn heaped up inside, a kettle hanging, the warm lamp in its roof
  const gl = rectPath(x0 + 6, glass.y0, x1 - x0 - 12, glass.y1 - glass.y0);
  within(ctx, gl, () => {
    vfill(ctx, x0, glass.y0, x1 - x0, glass.y1 - glass.y0, [[0, '#4a3a2a'], [1, '#2a1e16']]);
    glowAt(ctx, (x0 + x1) / 2, glass.y0 + 10, 70, SODIUM, 0.35);
    // the heap: lumpy, lit on top
    for (let i = 0; i < 70; i++) {
      const px = x0 + 8 + r() * (x1 - x0 - 16);
      const top = glass.y1 - 28 + Math.abs(px - (x0 + x1) / 2) * 0.18;
      const py = top + r() * (glass.y1 - top);
      const rr = 3 + r() * 3;
      ctx.fillStyle = mix('#f0dca0', '#8a6a40', Math.min(1, (py - top) / 30 + r() * 0.2));
      ctx.beginPath();
      ctx.arc(px, py, rr, 0, P2);
      ctx.fill();
    }
    // the kettle
    const kx = (x0 + x1) / 2 + 6;
    solid(ctx, ellPath(kx, glass.y0 + 26, 20, 13), { x: kx - 20, y: glass.y0 + 13, w: 40, h: 26 }, 'chrome', '#8a8a92', { line: 1.4, formSize: 8 });
    ctx.strokeStyle = '#3a3a42';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(kx, glass.y0);
    ctx.lineTo(kx, glass.y0 + 13);
    ctx.stroke();
  });
  // the glass's sheen and its frame posts
  ctx.fillStyle = 'rgba(220,230,255,0.1)';
  ctx.beginPath();
  ctx.moveTo(x0 + 14, glass.y0 + 4);
  ctx.lineTo(x0 + 34, glass.y0 + 4);
  ctx.lineTo(x0 + 14, glass.y1 - 10);
  ctx.closePath();
  ctx.fill();
  for (const px of [x0 + 4, x1 - 8]) solid(ctx, rectPath(px, glass.y0 - 4, 5, glass.y1 - glass.y0 + 6), { x: px, y: glass.y0 - 4, w: 5, h: 80 }, 'chrome', '#b0904a', { line: 1.2, formSize: 3 });
  ink(ctx, gl, 1.6, INK, 0);
  // the roof: a striped peak with a scalloped hem and a ball finial
  const roofP: PathFn = polyPath([[x0 - 8, glass.y0], [x1 + 8, glass.y0], [(x0 + x1) / 2, roof]]);
  within(ctx, roofP, () => {
    for (let k = 0; k < 6; k++) {
      ctx.fillStyle = k % 2 ? '#e0d4b8' : '#8a1e28';
      ctx.beginPath();
      ctx.moveTo((x0 + x1) / 2, roof);
      ctx.lineTo(x0 - 8 + (k / 6) * (x1 - x0 + 16), glass.y0);
      ctx.lineTo(x0 - 8 + ((k + 1) / 6) * (x1 - x0 + 16), glass.y0);
      ctx.fill();
    }
    dots(ctx, { x: x0 - 10, y: roof, w: x1 - x0 + 20, h: glass.y0 - roof }, linTone(x0, 0, x1, 0, 0.1, 0.6), '#0a0408', { step: 4, angle: 0.79, a: 0.5 });
  });
  ink(ctx, roofP, 2, INK, 0.5);
  for (let k = 0; k < 6; k++) {
    const sx = x0 - 8 + (k / 6) * (x1 - x0 + 16);
    const sw = (x1 - x0 + 16) / 6;
    const sc: PathFn = (c) => {
      c.beginPath();
      c.moveTo(sx, glass.y0 - 1);
      c.lineTo(sx + sw, glass.y0 - 1);
      c.quadraticCurveTo(sx + sw / 2, glass.y0 + 16, sx, glass.y0 - 1);
    };
    ctx.fillStyle = k % 2 ? '#e0d4b8' : '#8a1e28';
    sc(ctx);
    ctx.fill();
    ink(ctx, sc, 1.2, INK, 0);
  }
  solid(ctx, ellPath((x0 + x1) / 2, roof - 6, 7, 7), { x: (x0 + x1) / 2 - 7, y: roof - 13, w: 14, h: 14 }, 'chrome', GOLD, { line: 1.4, formSize: 6 });
  // the big spoked wheel
  const { x: wx, r: wr } = CART.wheel;
  const wy = fl - wr - 2;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(wx, wy, wr, 0, P2);
  ctx.stroke();
  ctx.strokeStyle = '#c8a050';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(30,20,10,0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(wx, wy, wr, 0.2, 1.8);
  ctx.stroke();
  ctx.strokeStyle = '#a08040';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * P2 + 0.2;
    ctx.moveTo(wx, wy);
    ctx.lineTo(wx + Math.cos(a) * wr, wy + Math.sin(a) * wr);
  }
  ctx.stroke();
  solid(ctx, ellPath(wx, wy, 6, 6), { x: wx - 6, y: wy - 6, w: 12, h: 12 }, 'chrome', GOLD, { line: 1.2, formSize: 4 });
  // popcorn spilled on the sawdust round it
  for (let i = 0; i < 26; i++) {
    const px = x0 + r() * 220;
    const py = fl - 2 - r() * 18;
    ctx.fillStyle = mix('#e8d4a0', '#6a5a40', r() * 0.6);
    ctx.beginPath();
    ctx.arc(px, py, 2 + r() * 1.6, 0, P2);
    ctx.fill();
  }
}

/** The balloons, tied to the cart and the booth (tie point, string length, radius, colour, lean). */
export const BALLOONS: { x: number; y: number; len: number; r: number; col: string; lean: number }[] = [
  { x: 12, y: 572, len: 112, r: 22, col: '#7a3ab0', lean: -0.3 },
  { x: 1726, y: 704, len: 150, r: 22, col: '#c8303a', lean: -0.12 },
  { x: 1808, y: 376, len: 110, r: 23, col: '#8ad040', lean: -0.22 },
  { x: 1808, y: 376, len: 86, r: 22, col: '#7a3ab0', lean: 0.1 },
];
export const BALLOON_TEX = (b: (typeof BALLOONS)[number]) => ({ w: Math.ceil(b.r * 2 + 16), h: Math.ceil(b.len + b.r * 2 + 18) });

/** A balloon drawn upright in its own frame: the tie at (w/2, h - 4), the string up to the knot, the balloon. */
export function balloonPaint(c: Ctx, b: (typeof BALLOONS)[number], deflate = 0): void {
  const { w, h } = BALLOON_TEX(b);
  const tx = w / 2;
  const ty = h - 4;
  const ky = ty - b.len;
  c.strokeStyle = 'rgba(200,200,210,0.55)';
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(tx, ty);
  c.bezierCurveTo(tx + 5, ty - b.len * 0.3, tx - 5, ty - b.len * 0.7, tx, ky);
  c.stroke();
  const by = ky - b.r * (1 - deflate * 0.2);
  const shape = ellPath(tx, by, b.r * (1 - deflate * 0.15), b.r * 1.15 * (1 - deflate * 0.25));
  const g = c.createRadialGradient(tx - b.r * 0.4, by - b.r * 0.5, 1, tx, by, b.r * 1.2);
  g.addColorStop(0, mix(b.col, '#ffffff', 0.35));
  g.addColorStop(0.5, b.col);
  g.addColorStop(1, shade(b.col, -0.55));
  c.fillStyle = g;
  shape(c);
  c.fill();
  c.strokeStyle = INK;
  c.lineWidth = 1.6;
  shape(c);
  c.stroke();
  c.fillStyle = shade(b.col, -0.3);
  c.beginPath();
  c.moveTo(tx - 3, ky + 2);
  c.lineTo(tx + 3, ky + 2);
  c.lineTo(tx, ky - 4);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.55)';
  c.beginPath();
  c.ellipse(tx - b.r * 0.38, by - b.r * 0.5, b.r * 0.16, b.r * 0.26, -0.5, 0, P2);
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.3)';
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(tx + b.r * 0.2, by + b.r * 0.55);
  c.quadraticCurveTo(tx + b.r * 0.5, by + b.r * 0.4, tx + b.r * 0.55, by + b.r * 0.1);
  c.stroke();
}
function balloonsStill(ctx: Ctx): void {
  for (const b of BALLOONS) {
    const { w, h } = BALLOON_TEX(b);
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.lean);
    ctx.translate(-w / 2, -(h - 4));
    balloonPaint(ctx, b);
    ctx.restore();
  }
}

/** The carousel's lost horse, tipped on its nose against the funhouse's chin, its pole snapped. */
const HORSE = { x: 334, y: 706, s: 1.2, rot: 0.46 };
const HORSE_BOX: Box = { x: 244, y: 590, w: 210, h: 176 };

function brokenHorse(ctx: Ctx, r: R): void {
  const { x, y, s, rot } = HORSE;
  groundShadow(ctx, x + 14, 754, 96, 10, 0.75, '#02020a');
  crevice(ctx, x - 60, x + 90, 752, -6, 0.6, '#02020a');
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const body = '#c8bca2';
  // carved legs: inked, painted, lit along their tops; gilded hooves
  horseLegs(ctx, 0, 0, s, 1, INK, 1, 11);
  horseLegs(ctx, 0, 0, s, 1, mix(body, '#5a5048', 0.3), 1, 7.4);
  horseLegs(ctx, -0.6, -1, s, 1, 'rgba(255,240,220,0.25)', 1, 2.4);
  ctx.scale(s, s);
  for (const [hx, hy] of [[34, 28], [40, 24], [-24, 38], [-8, 38]] as const) {
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.ellipse(hx, hy + 1, 4.6, 3.6, 0, 0, P2);
    ctx.fill();
    ctx.fillStyle = '#b08a3a';
    ctx.beginPath();
    ctx.ellipse(hx, hy + 1, 3.2, 2.4, 0, 0, P2);
    ctx.fill();
  }
  ctx.restore();
  const p: PathFn = (c) => {
    c.save();
    c.translate(x, y);
    c.rotate(rot);
    horseShape(c, 0, 0, s, 1);
    c.restore();
  };
  solid(ctx, p, HORSE_BOX, PAINT, body, { line: false, formSize: 40 });
  within(ctx, p, () => {
    // its painted trappings: a saddle blanket, the saddle, the bridle; peeling, a crack through the neck
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(s, s);
    ctx.fillStyle = '#2a6a4a';
    ctx.beginPath();
    ctx.ellipse(-2, -10, 18, 13, 0, 0, P2);
    ctx.fill();
    ctx.fillStyle = '#8a1e28';
    ctx.beginPath();
    ctx.ellipse(-2, -15, 13, 7, 0, 0, P2);
    ctx.fill();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.strokeStyle = '#5a2a86';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(40, -47);
    ctx.quadraticCurveTo(46, -34, 56, -26);
    ctx.stroke();
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.arc(46, -34, 1.8, 0, P2);
    ctx.fill();
    // the mane, carved and painted purple down the crest
    ctx.strokeStyle = '#4a2a6a';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let k = 0; k < 5; k++) {
      const u = k / 4;
      const mx = 22 + u * 14;
      const my = -18 - u * 30;
      ctx.moveTo(mx, my);
      ctx.quadraticCurveTo(mx - 8, my + 2, mx - 10, my + 10);
    }
    ctx.stroke();
    // a painted eye with its lid and a lash
    ctx.fillStyle = '#f0e8d8';
    ctx.beginPath();
    ctx.ellipse(49, -39, 3.6, 2.6, -0.3, 0, P2);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(49.6, -38.8, 1.6, 0, P2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(49, -39, 4, 3, -0.3, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    ctx.restore();
    // the paint flaking off to the carved wood: grain showing in the bare patches
    lay(ctx, noiseMask(6, 63, { cover: 0.2, soft: 0.06, col: '#7a5a3a' }), HORSE_BOX, 0.75);
    lay(ctx, noiseMask(14, 64, { cover: 0.12, soft: 0.04, col: '#5a4028' }), HORSE_BOX, 0.6);
    dots(ctx, HORSE_BOX, linTone(x - 40, y - 50, x + 60, y + 40, 0.05, 0.7), '#0a0610', { step: 4.5, angle: 0.79, a: 0.5 });
  });
  ink(ctx, p, 2.4, INK, 0.5);
  // the snapped brass pole through its back, splintered at both ends
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.lineCap = 'butt';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(2 * s, -62 * s);
  ctx.lineTo(2 * s, 26 * s);
  ctx.stroke();
  const g = ctx.createLinearGradient(-3, 0, 6, 0);
  g.addColorStop(0, '#f0d080');
  g.addColorStop(1, '#7a5a20');
  ctx.strokeStyle = g;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.fillStyle = '#2a1a0a';
  ctx.beginPath();
  ctx.moveTo(-2 * s, -62 * s);
  ctx.lineTo(2 * s, -68 * s);
  ctx.lineTo(4 * s, -61 * s);
  ctx.lineTo(7 * s, -64 * s);
  ctx.lineTo(6 * s, -60 * s);
  ctx.fill();
  ctx.restore();
  void r;
}

// ——— the hall of distorting mirrors ———

type Mirror = (typeof JK.mirrors)[number];
const archPath = (x0: number, x1: number, top: number, bottom: number): PathFn => (c) => {
  const w = x1 - x0;
  c.beginPath();
  c.moveTo(x0, bottom);
  c.lineTo(x0, top + w / 2);
  c.arc((x0 + x1) / 2, top + w / 2, w / 2, Math.PI, 0);
  c.lineTo(x1, bottom);
  c.closePath();
};
/** The glass of a mirror (inside its frame). */
export const glassOf = (m: Mirror): PathFn => archPath(m.x0 + 10, m.x1 - 10, m.top + 10, m.foot - 22);
const MIRROR_BOX: Box = { x: 1500, y: 340, w: 260, h: 386 };

function mirror(ctx: Ctx, r: R, m: Mirror, i: number): void {
  const { x0, x1, top, foot } = m;
  const w = x1 - x0;
  const outer = archPath(x0, x1, top, foot - 14);
  castShadow(ctx, outer, 16, 18, 0.55, '#02020a');
  // claw feet
  for (const fx of [x0 + 12, x1 - 12]) {
    solid(ctx, ellPath(fx, foot - 8, 10, 7), { x: fx - 10, y: foot - 15, w: 20, h: 14 }, 'chrome', '#7a5a24', { line: 1.4, formSize: 5 });
  }
  groundShadow(ctx, (x0 + x1) / 2 + 8, foot, w * 0.6, 6, 0.5, '#02020a');
  // the gilt frame, peeling to the gesso
  solid(ctx, outer, { x: x0, y: top, w, h: foot - top }, 'chrome', '#7a5c26', { line: false, formSize: 20 });
  within(ctx, outer, () => {
    lay(ctx, noiseMask(5, 70 + i, { cover: 0.25, soft: 0.08, col: '#3a2a1a' }), { x: x0, y: top, w, h: foot - top }, 0.7);
    dots(ctx, { x: x0, y: top, w, h: foot - top }, linTone(x0, 0, x1, 0, 0.1, 0.6), '#0a0604', { step: 4, angle: 0.79, a: 0.5 });
  });
  ink(ctx, outer, 2.2, INK, 0.5);
  ctx.strokeStyle = rgba(MOONLIT, 0.35);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x0 + 2, foot - 16);
  ctx.lineTo(x0 + 2, top + w / 2);
  ctx.arc((x0 + x1) / 2, top + w / 2, w / 2 - 2, Math.PI, Math.PI * 1.35);
  ctx.stroke();
  // the glass: the tent's stripes bent into waves, a bulb's row of lights warped, a fat squat shape (whoever stands
  // in front of it)
  const gl = glassOf(m);
  const gb = { x: x0 + 10, y: top + 10, w: w - 20, h: foot - 32 - top };
  within(ctx, gl, () => {
    vfill(ctx, gb.x, gb.y, gb.w, gb.h, [[0, '#1c1a2c'], [0.6, '#141220'], [1, '#0c0a14']]);
    const bend = (y: number) => Math.sin(((y - gb.y) / gb.h) * Math.PI * (i ? 2.6 : 1.8) + i * 1.3) * gb.w * (i ? 0.22 : 0.3);
    for (let y = gb.y; y < gb.y + gb.h; y += 3) {
      const off = bend(y);
      for (let k = -2; k < 5; k++) {
        const sx = gb.x + k * 34 + off;
        ctx.fillStyle = k % 2 ? 'rgba(90,50,130,0.28)' : 'rgba(70,110,60,0.22)';
        ctx.fillRect(sx, y, 17 + Math.abs(off) * 0.12, 3);
      }
    }
    // the reflected marquee: a warped row of warm points
    ctx.fillStyle = 'rgba(255,210,140,0.45)';
    for (let k = 0; k < 9; k++) {
      const u = k / 8;
      const y = gb.y + 40 + Math.sin(u * Math.PI * 2 + i) * 14 + u * 20;
      ctx.beginPath();
      ctx.arc(gb.x + u * gb.w, y, 1.6 + Math.abs(Math.sin(u * 3)) * 1.4, 0, P2);
      ctx.fill();
    }
    // the squat reflection: wide in the middle, pinched head and feet
    ctx.fillStyle = 'rgba(8,6,14,0.6)';
    ctx.beginPath();
    const cx = gb.x + gb.w * (i ? 0.55 : 0.45);
    for (let y = gb.y + gb.h * 0.35; y <= gb.y + gb.h; y += 6) {
      const u = (y - (gb.y + gb.h * 0.35)) / (gb.h * 0.65);
      const hw = gb.w * (0.08 + 0.32 * Math.sin(u * Math.PI) ** (i ? 0.6 : 1.4));
      ctx.lineTo(cx - hw, y);
    }
    for (let y = gb.y + gb.h; y >= gb.y + gb.h * 0.35; y -= 6) {
      const u = (y - (gb.y + gb.h * 0.35)) / (gb.h * 0.65);
      const hw = gb.w * (0.08 + 0.32 * Math.sin(u * Math.PI) ** (i ? 0.6 : 1.4));
      ctx.lineTo(cx + hw, y);
    }
    ctx.fill();
    // silvering gone at the edges, the glass's sheen
    lay(ctx, noiseMask(6, 74 + i, { cover: 0.25, soft: 0.2, col: '#3a3440' }), gb, 0.5);
    ctx.fillStyle = 'rgba(220,230,255,0.08)';
    ctx.beginPath();
    ctx.moveTo(gb.x, gb.y + gb.h * 0.2);
    ctx.lineTo(gb.x + gb.w * 0.5, gb.y);
    ctx.lineTo(gb.x + gb.w, gb.y);
    ctx.lineTo(gb.x, gb.y + gb.h * 0.6);
    ctx.fill();
    dots(ctx, gb, () => 0.22, '#02030a', { step: 4, angle: 0.79, a: 0.35 });
  });
  ink(ctx, gl, 1.6, INK, 0);
  // the crest: a little grinning mask in the gilt
  const cx = (x0 + x1) / 2;
  const crest = ellPath(cx, top + 4, 15, 12);
  solid(ctx, crest, { x: cx - 15, y: top - 8, w: 30, h: 24 }, 'chrome', '#9a7a34', { line: 1.6, formSize: 8 });
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, top + 4, 7, 0.3, Math.PI - 0.3);
  ctx.stroke();
  ctx.fillStyle = INK;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(cx + s * 5, top + 1, 1.8, 0, P2);
    ctx.fill();
  }
  void r;
}

/** The crack a stomp puts in a mirror (live: laid over its glass, mending slowly), in the glass's own frame. */
export function mirrorCrack(c: Ctx, m: Mirror, seed: number): void {
  const r = rng(seed);
  const gx = m.x0 + 10;
  const gy = m.top + 10;
  const w = m.x1 - m.x0 - 20;
  const h = m.foot - 32 - m.top;
  const ox = w * (0.3 + r() * 0.2);
  const oy = h * (0.38 + r() * 0.15);
  c.save();
  c.translate(-gx, -gy);
  glassOf(m)(c);
  c.clip();
  c.translate(gx, gy);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  const line = (pts: Pt[], bright: number) => {
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.strokeStyle = 'rgba(4,4,10,0.8)';
    c.lineWidth = 2.4;
    c.stroke();
    c.strokeStyle = `rgba(232,238,255,${bright})`;
    c.lineWidth = 0.9;
    c.stroke();
  };
  // the radial breaks, kinking as they run
  const ends: Pt[] = [];
  const arms = 8;
  for (let k = 0; k < arms; k++) {
    let a = (k / arms) * P2 + (r() - 0.5) * 0.5;
    let x = ox;
    let y = oy;
    const pts: Pt[] = [[x, y]];
    const len = 40 + r() * 150;
    for (let d = 0; d < len; d += 8 + r() * 10) {
      a += (r() - 0.5) * 0.5;
      x += Math.cos(a) * 12;
      y += Math.sin(a) * 12;
      pts.push([x, y]);
    }
    ends.push(pts[Math.min(pts.length - 1, 2 + Math.floor(r() * 2))]);
    line(pts, k === 2 ? 0.95 : 0.55);
  }
  // two jagged breaks crossing between the arms
  for (let k = 0; k < 2; k++) {
    const p0 = ends[k * 3];
    const p1 = ends[k * 3 + 2];
    line([p0, [(p0[0] + p1[0]) / 2 + (r() - 0.5) * 10, (p0[1] + p1[1]) / 2 + (r() - 0.5) * 10], p1], 0.45);
  }
  // a shard knocked askew: a dark gap on one side, a bright edge on the other
  const sh: Pt[] = [ends[4], ends[5], [(ends[4][0] + ends[5][0]) / 2 + 6, (ends[4][1] + ends[5][1]) / 2 + 14]];
  c.fillStyle = 'rgba(200,214,250,0.12)';
  c.beginPath();
  sh.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fill();
  c.strokeStyle = 'rgba(2,2,8,0.85)';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(...sh[1]);
  c.lineTo(...sh[2]);
  c.stroke();
  c.strokeStyle = 'rgba(255,240,210,0.85)';
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(...sh[0]);
  c.lineTo(...sh[2]);
  c.stroke();
  // the crushed star at the strike
  c.fillStyle = 'rgba(236,240,255,0.55)';
  c.beginPath();
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * P2;
    const q = k % 2 ? 2 : 6 + r() * 3;
    c.lineTo(ox + Math.cos(a) * q, oy + Math.sin(a) * q);
  }
  c.closePath();
  c.fill();
  c.restore();
}

function mirrors(ctx: Ctx, r: R): void {
  JK.mirrors.forEach((m, i) => mirror(ctx, r, m, i));
  // the board over them, hung from the coaster: SLICE OF LIFE?
  const bx0 = 1518;
  const bx1 = 1738;
  const by = 368;
  ctx.strokeStyle = '#2a2a32';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const x of [bx0 + 30, bx1 - 30]) {
    ctx.moveTo(x, trackY(x) + 30);
    ctx.lineTo(x, by);
  }
  ctx.stroke();
  const board = rrPath(bx0, by, bx1 - bx0, 36, 4);
  castShadow(ctx, board, 12, 12, 0.5, '#02020a');
  solid(ctx, board, { x: bx0, y: by, w: bx1 - bx0, h: 36 }, WOOD, '#c8bc9c', { line: false, formSize: 12 });
  within(ctx, board, () => {
    ctx.strokeStyle = rgba('#3a6a34', 0.9);
    ctx.lineWidth = 3;
    ctx.strokeRect(bx0 + 4, by + 4, bx1 - bx0 - 8, 28);
    ctx.font = `25px ${BLOCK}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1a1020';
    ctx.fillText('SLICE OF LIFE?', (bx0 + bx1) / 2, by + 20);
    lay(ctx, noiseMask(8, 76, { cover: 0.25, soft: 0.1, col: '#5a4a3a' }), { x: bx0, y: by, w: bx1 - bx0, h: 36 }, 0.6);
    dots(ctx, { x: bx0, y: by, w: bx1 - bx0, h: 36 }, linTone(bx0, 0, bx1, 0, 0.15, 0.5), '#040804', { step: 4, angle: 0.79, a: 0.5 });
  });
  ink(ctx, board, 2, INK, 0.5);
}

// ——— the test-your-strength tower ———

const TS = JK.tester;
const TOWER = { x0: TS.x - 26, x1: TS.x + 26, top: TS.top + 26, base: 700 };
/** The puck's rail: from its rest on the striker to the bell. */
export const PUCK = { x: TS.x, rest: TOWER.base - 14, top: TOWER.top + 12 };
const TESTER_BOX: Box = { x: TS.x - 60, y: TS.top - 46, w: 140, h: TS.base + 12 - (TS.top - 46) };
const SCORE = ['STOMPER!', 'DEEP DISH', 'NOODLE', 'WET SOCK'];

function tester(ctx: Ctx, r: R): void {
  const { x0, x1, top, base } = TOWER;
  groundShadow(ctx, TS.x + 10, TS.base, 60, 7, 0.55, '#02020a');
  castShadow(ctx, rectPath(x0, top, x1 - x0, base - top), 18, 16, 0.5, '#02020a');
  // guy wires to the floor
  ctx.strokeStyle = 'rgba(40,40,50,0.8)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x0, top + 30);
  ctx.lineTo(x0 - 50, TS.base - 4);
  ctx.moveTo(x1, top + 30);
  ctx.lineTo(x1 + 44, TS.base - 6);
  ctx.stroke();
  // the board: bands from green at the foot to red at the bell, scored
  const board = rectPath(x0, top, x1 - x0, base - top);
  solid(ctx, board, { x: x0, y: top, w: x1 - x0, h: base - top }, WOOD, '#3a2e26', { line: false, formSize: 10 });
  within(ctx, board, () => {
    const n = SCORE.length;
    const bh = (base - top) / n;
    SCORE.forEach((s, k) => {
      ctx.fillStyle = mix(['#a8242a', '#c8842a', '#6a9a3a', '#3a7a6a'][k], '#2a2026', 0.25);
      ctx.fillRect(x0, top + k * bh + 2, x1 - x0, bh - 4);
      ctx.save();
      ctx.translate(TS.x + 12, top + k * bh + bh / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.font = `bold 18px ${BLOCK}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(14,8,12,0.6)';
      ctx.fillText(s, 1, 1.5);
      ctx.fillStyle = 'rgba(244,236,214,0.95)';
      ctx.fillText(s, 0, 0);
      ctx.restore();
    });
    // the ticks up the rail
    ctx.fillStyle = 'rgba(240,232,210,0.5)';
    for (let y = top + 8; y < base; y += 18) ctx.fillRect(x0 + 4, y, 8, 1.5);
    lay(ctx, noiseMask(5, 81, { cover: 0.25, soft: 0.08, col: '#3a3230' }), { x: x0, y: top, w: x1 - x0, h: base - top }, 0.6);
    dots(ctx, { x: x0, y: top, w: x1 - x0, h: base - top }, linTone(x0, 0, x1, 0, 0.1, 0.65), '#060408', { step: 4, angle: 0.79, a: 0.5 });
  });
  ink(ctx, board, 2.2, INK, 0.5);
  // the rail the puck rides
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(PUCK.x - 6, PUCK.top - 8);
  ctx.lineTo(PUCK.x - 6, base);
  ctx.stroke();
  ctx.strokeStyle = '#9aa0ac';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // the bell on its bracket, the bulb over it
  const bell: PathFn = (c) => {
    c.beginPath();
    c.moveTo(TS.x - 20, top - 2);
    c.quadraticCurveTo(TS.x - 18, top - 30, TS.x, top - 32);
    c.quadraticCurveTo(TS.x + 18, top - 30, TS.x + 20, top - 2);
    c.closePath();
  };
  solid(ctx, bell, { x: TS.x - 20, y: top - 34, w: 40, h: 34 }, 'chrome', '#c89a3a', { line: 2, formSize: 12 });
  ctx.fillStyle = 'rgba(255,240,200,0.6)';
  ctx.fillRect(TS.x - 12, top - 24, 3, 16);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(TS.x, top - 32);
  ctx.lineTo(TS.x, TS.top - 20);
  ctx.stroke();
  bulbSocket(ctx, TS.x, TS.top - 26, 7);
  // the striker base: a box with the pad on top
  const bx = rectPath(TS.x - 42, base, 84, TS.base - base);
  solid(ctx, bx, { x: TS.x - 42, y: base, w: 84, h: TS.base - base }, IRON, '#34363e', { line: 2.2, formSize: 12 });
  within(ctx, bx, () => {
    ctx.fillStyle = rgba(GOLD, 0.5);
    ctx.fillRect(TS.x - 36, base + 8, 72, 2);
    dots(ctx, { x: TS.x - 42, y: base, w: 84, h: TS.base - base }, linTone(TS.x - 42, 0, TS.x + 42, 0, 0.15, 0.6), '#060204', { step: 4, angle: 0.79, a: 0.5 });
  });
  const pad = rrPath(TS.x - 24, base - 8, 48, 10, 3);
  solid(ctx, pad, { x: TS.x - 24, y: base - 8, w: 48, h: 10 }, 'rubber', '#2a2a30', { line: 1.4, formSize: 4 });
  // the mallet leaning on it
  ctx.save();
  ctx.translate(TS.x + 62, TS.base - 2);
  ctx.rotate(0.22);
  solid(ctx, rectPath(-4, -120, 8, 120), { x: -4, y: -120, w: 8, h: 120 }, WOOD, '#8a6a40', { line: 1.6, formSize: 4 });
  const head = rrPath(-26, -146, 52, 28, 8);
  solid(ctx, head, { x: -26, y: -146, w: 52, h: 28 }, WOOD, '#6a4a2e', { line: 2, formSize: 12 });
  ctx.fillStyle = rgba(RED, 0.8);
  ctx.fillRect(-26, -136, 52, 6);
  ctx.restore();
  void r;
}

/** The puck (painted at rest in the still; the live layer flings it). */
export function puckPaint(c: Ctx, x: number, y: number): void {
  const p = rrPath(x - 15, y - 7, 24, 14, 5);
  solid(c, p, { x: x - 15, y: y - 7, w: 24, h: 14 }, PAINT, '#c8303a', { line: 1.6, formSize: 6 });
  c.fillStyle = 'rgba(255,240,230,0.6)';
  c.fillRect(x - 11, y - 4, 10, 2);
}

// ——— the prize booth ———

const BO = JK.booth;
const BOOTH_BOX: Box = { x: BO.x0 - 30, y: BO.top - 30, w: W - BO.x0 + 30, h: BO.floor + 6 - (BO.top - 30) };
const SHELVES = [470, 560, 648];

function bear(ctx: Ctx, x: number, y: number, s: number, col: string, xEye: boolean): void {
  const parts: PathFn = (c) => {
    c.beginPath();
    c.ellipse(x, y - 18 * s, 16 * s, 18 * s, 0, 0, P2);
    c.moveTo(x + 14 * s, y - 44 * s);
    c.ellipse(x, y - 44 * s, 14 * s, 13 * s, 0, 0, P2);
    c.moveTo(x - 6 * s, y - 56 * s);
    c.arc(x - 11 * s, y - 56 * s, 5 * s, 0, P2);
    c.moveTo(x + 16 * s, y - 56 * s);
    c.arc(x + 11 * s, y - 56 * s, 5 * s, 0, P2);
  };
  castShadow(ctx, parts, 7, 8, 0.55, '#02020a');
  solid(ctx, parts, { x: x - 18 * s, y: y - 62 * s, w: 36 * s, h: 62 * s }, 'plush', col, { line: 1.6, formSize: 12 * s });
  ctx.fillStyle = mix(col, '#ffffff', 0.4);
  ctx.beginPath();
  ctx.ellipse(x, y - 40 * s, 6 * s, 4.5 * s, 0, 0, P2);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(x - 5 * s, y - 48 * s, 2.2 * s, 0, P2);
  ctx.fill();
  if (xEye) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x + 3 * s, y - 51 * s);
    ctx.lineTo(x + 8 * s, y - 46 * s);
    ctx.moveTo(x + 8 * s, y - 51 * s);
    ctx.lineTo(x + 3 * s, y - 46 * s);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#d8d0c0';
    ctx.beginPath();
    ctx.arc(x + 6 * s, y - 48 * s, 3.4 * s, 0, P2);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(x + 6 * s, y - 48 * s, 1.4 * s, 0, P2);
    ctx.fill();
  }
  // a stitched seam, split, the stuffing out
  ctx.strokeStyle = 'rgba(20,10,10,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y - 34 * s);
  ctx.lineTo(x, y - 6 * s);
  ctx.stroke();
}

function booth(ctx: Ctx, r: R): void {
  const x0 = BO.x0;
  const x1 = W + 10;
  const { top, floor: fl } = BO;
  castShadow(ctx, rectPath(x0, top, x1 - x0, fl - top), 20, 20, 0.5, '#02020a');
  // the back: dark boards
  const back = rectPath(x0, top + 40, x1 - x0, fl - top - 40);
  ctx.fillStyle = '#1e1622';
  back(ctx);
  ctx.fill();
  within(ctx, back, () => {
    surface(ctx, r, { x: x0, y: top + 40, w: x1 - x0, h: fl - top - 40 }, '#241a28', { vary: 0.4, strokes: 0.8, strokeAng: Math.PI / 2, strokeW: 6, grain: 0.25, seed: 83 });
    ctx.fillStyle = 'rgba(4,2,8,0.5)';
    for (let x = x0 + 26; x < x1; x += 30) ctx.fillRect(x, top + 40, 2, fl - top);
    // the bulb's light falling down the shelves
    lightPool(ctx, x0 + 70, top + 110, 150, 200, BULB, 0.12);
  });
  // the shelves and their toys
  const toys: (() => void)[] = [
    () => {
      bear(ctx, x0 + 36, SHELVES[0], 0.9, '#8a6a4a', true);
      bear(ctx, x0 + 82, SHELVES[0], 0.8, '#6a7a9a', false);
    },
    () => {
      // a rabbit with one ear flopped, a doll's head on a stand with one eye shut
      const rb: PathFn = (c) => {
        c.beginPath();
        c.ellipse(x0 + 34, SHELVES[1] - 16, 14, 16, 0, 0, P2);
        c.moveTo(x0 + 46, SHELVES[1] - 40);
        c.ellipse(x0 + 34, SHELVES[1] - 40, 12, 11, 0, 0, P2);
        c.moveTo(x0 + 34, SHELVES[1] - 50);
        c.ellipse(x0 + 30, SHELVES[1] - 66, 4, 14, -0.1, 0, P2);
        c.moveTo(x0 + 44, SHELVES[1] - 46);
        c.ellipse(x0 + 52, SHELVES[1] - 40, 12, 4, 0.5, 0, P2);
      };
      castShadow(ctx, rb, 7, 8, 0.55, '#02020a');
      solid(ctx, rb, { x: x0 + 18, y: SHELVES[1] - 82, w: 50, h: 82 }, 'plush', '#c8c0d8', { line: 1.6, formSize: 10 });
      ctx.fillStyle = '#c8303a';
      ctx.beginPath();
      ctx.arc(x0 + 30, SHELVES[1] - 42, 2.4, 0, P2);
      ctx.arc(x0 + 39, SHELVES[1] - 42, 2.4, 0, P2);
      ctx.fill();
      solid(ctx, rectPath(x0 + 86, SHELVES[1] - 20, 6, 20), { x: x0 + 86, y: SHELVES[1] - 20, w: 6, h: 20 }, WOOD, '#5a3a2a', { line: 1.2 });
      const head = ellPath(x0 + 89, SHELVES[1] - 36, 15, 17);
      solid(ctx, head, { x: x0 + 74, y: SHELVES[1] - 53, w: 30, h: 34 }, 'enamel', '#e8dcd0', { line: 1.6, formSize: 10 });
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(x0 + 83, SHELVES[1] - 38, 2.6, 0, P2);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x0 + 91, SHELVES[1] - 38);
      ctx.lineTo(x0 + 98, SHELVES[1] - 37);
      ctx.moveTo(x0 + 92, SHELVES[1] - 46);
      ctx.lineTo(x0 + 84, SHELVES[1] - 28);
      ctx.stroke();
      ctx.fillStyle = '#c84a5a';
      ctx.beginPath();
      ctx.arc(x0 + 89, SHELVES[1] - 28, 2.4, 0, P2);
      ctx.fill();
    },
    () => {
      // a coiled plush snake, an empty goldfish bowl
      const sn: PathFn = (c) => {
        c.beginPath();
        c.ellipse(x0 + 38, SHELVES[2] - 10, 24, 10, 0, 0, P2);
        c.moveTo(x0 + 54, SHELVES[2] - 24);
        c.ellipse(x0 + 38, SHELVES[2] - 24, 16, 8, 0, 0, P2);
        c.moveTo(x0 + 48, SHELVES[2] - 36);
        c.ellipse(x0 + 44, SHELVES[2] - 36, 8, 7, 0, 0, P2);
      };
      castShadow(ctx, sn, 7, 8, 0.55, '#02020a');
      solid(ctx, sn, { x: x0 + 14, y: SHELVES[2] - 44, w: 50, h: 44 }, 'plush', '#5a8a3a', { line: 1.6, formSize: 10 });
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(x0 + 47, SHELVES[2] - 38, 1.8, 0, P2);
      ctx.fill();
      const bowl = ellPath(x0 + 96, SHELVES[2] - 18, 18, 18);
      ctx.fillStyle = 'rgba(150,170,200,0.12)';
      bowl(ctx);
      ctx.fill();
      ctx.strokeStyle = 'rgba(200,214,240,0.5)';
      ctx.lineWidth = 1.4;
      bowl(ctx);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x0 + 90, SHELVES[2] - 24, 9, Math.PI * 1.1, Math.PI * 1.5);
      ctx.stroke();
    },
  ];
  SHELVES.forEach((sy, k) => {
    toys[k]();
    const shelf = rectPath(x0 + 4, sy, x1 - x0, 9);
    solid(ctx, shelf, { x: x0 + 4, y: sy, w: x1 - x0, h: 9 }, WOOD, '#6a4a34', { line: 1.4, formSize: 4 });
    crevice(ctx, x0 + 4, x1, sy + 9, 16, 0.5, '#02020a');
    // dust along its front edge
    ctx.fillStyle = 'rgba(170,160,150,0.25)';
    ctx.fillRect(x0 + 6, sy, x1 - x0, 1.5);
  });
  // a cobweb in the booth's top corner
  ctx.strokeStyle = 'rgba(200,200,210,0.28)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (let k = 0; k < 5; k++) {
    const a = (k / 4) * Math.PI * 0.5;
    ctx.moveTo(x0 + 6, top + 44);
    ctx.lineTo(x0 + 6 + Math.cos(a) * 44, top + 44 + Math.sin(a) * 44);
  }
  for (const rr of [14, 26, 38]) {
    for (let k = 0; k <= 4; k++) {
      const a = (k / 4) * Math.PI * 0.5;
      const px = x0 + 6 + Math.cos(a) * rr;
      const py = top + 44 + Math.sin(a) * rr;
      if (k) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
  }
  ctx.stroke();
  // the counter, striped, scuffed by elbows
  const counter = rectPath(x0 - 6, 694, x1 - x0 + 6, fl - 694);
  ctx.save();
  counter(ctx);
  ctx.clip();
  for (let x = x0 - 6, k = 0; x < x1; x += 28, k++) {
    ctx.fillStyle = k % 2 ? '#d0c4a8' : '#5a2a86';
    ctx.fillRect(x, 694, 28, fl - 694);
  }
  lay(ctx, noiseMask(6, 84, { cover: 0.3, soft: 0.1, col: '#2a2024' }), { x: x0, y: 694, w: x1 - x0, h: fl - 694 }, 0.7);
  dots(ctx, { x: x0 - 6, y: 694, w: x1 - x0 + 6, h: fl - 694 }, linTone(0, 694, 0, fl, 0.3, 0.7), '#06020a', { step: 4.5, angle: 0.79, a: 0.55 });
  ctx.restore();
  ink(ctx, counter, 2.2, INK, 0.5);
  solid(ctx, rectPath(x0 - 12, 686, x1 - x0 + 12, 10), { x: x0 - 12, y: 686, w: x1 - x0 + 12, h: 10 }, WOOD, '#7a5a3a', { line: 1.6, formSize: 4 });
  // the post at its open side
  const post = rectPath(x0 - 8, top + 20, 14, fl - top - 20);
  solid(ctx, post, { x: x0 - 8, y: top + 20, w: 14, h: fl - top - 20 }, WOOD, '#5a4030', { line: 1.8, formSize: 6 });
  // the awning: scalloped stripes, PRIZES! across it
  const aw = rectPath(x0 - 20, top, x1 - x0 + 20, 40);
  ctx.save();
  aw(ctx);
  ctx.clip();
  for (let x = x0 - 20, k = 0; x < x1; x += 26, k++) {
    ctx.fillStyle = k % 2 ? '#d8ccb0' : '#6a2a8a';
    ctx.fillRect(x, top, 26, 40);
  }
  ctx.font = `bold 24px ${BLOCK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#1a0a1a';
  ctx.fillText('PRIZES!', x0 + 50, top + 22);
  ctx.fillStyle = '#ffd23f';
  ctx.fillText('PRIZES!', x0 + 48, top + 20);
  dots(ctx, { x: x0 - 20, y: top, w: x1 - x0 + 20, h: 40 }, () => 0.3, '#06020a', { step: 4, angle: 0.79, a: 0.45 });
  ctx.restore();
  ink(ctx, aw, 2, INK, 0.4);
  for (let x = x0 - 20, k = 0; x < x1; x += 26, k++) {
    const sc: PathFn = (c) => {
      c.beginPath();
      c.moveTo(x, top + 39);
      c.lineTo(x + 26, top + 39);
      c.quadraticCurveTo(x + 13, top + 58, x, top + 39);
    };
    ctx.fillStyle = k % 2 ? '#b8ac90' : '#4a1a6a';
    sc(ctx);
    ctx.fill();
    ink(ctx, sc, 1.2, INK, 0);
  }
  // a rubber chicken hung by its feet from the awning
  const chx = x0 + 104;
  ctx.strokeStyle = '#2a2a2a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(chx, top + 54);
  ctx.lineTo(chx, top + 70);
  ctx.stroke();
  const ch: PathFn = (c) => {
    c.beginPath();
    c.moveTo(chx - 3, top + 70);
    c.quadraticCurveTo(chx - 12, top + 96, chx - 6, top + 112);
    c.quadraticCurveTo(chx - 2, top + 124, chx + 2, top + 132);
    c.lineTo(chx + 8, top + 126);
    c.quadraticCurveTo(chx + 12, top + 96, chx + 3, top + 70);
    c.closePath();
  };
  solid(ctx, ch, { x: chx - 14, y: top + 68, w: 28, h: 66 }, 'rubber', '#e0c040', { line: 1.6, formSize: 8 });
  ctx.fillStyle = '#c8303a';
  ctx.fillRect(chx - 2, top + 120, 6, 6);
  // the bare bulb on its flex
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x0 + 58, top + 50);
  ctx.lineTo(x0 + 58, top + 80);
  ctx.stroke();
  bulbSocket(ctx, x0 + 58, top + 86, 6);
}
export const BOOTH_BULB: Pt = [JK.booth.x0 + 58, JK.booth.top + 86];

// ——— the laugh-track box and the bunting ———

const LB = JK.laugh;
const LAUGH_BOX: Box = { x: LB.x - LB.w / 2 - 14, y: LB.y - LB.h / 2 - 14, w: LB.w + 28, h: LB.h + 28 };
const laughFace = rrPath(LB.x - LB.w / 2, LB.y - LB.h / 2, LB.w, LB.h, 6);

function laughLetters(ctx: Ctx, col: string, a: number, tube = false): void {
  ctx.font = `bold 30px ${BLOCK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (tube) {
    // unlit: the bent glass tubes show, pinkish, against the black
    ctx.strokeStyle = rgba(col, a);
    ctx.lineWidth = 2.2;
    ctx.strokeText('HA HA HA', LB.x, LB.y + 2);
    return;
  }
  ctx.fillStyle = rgba(col, a);
  ctx.fillText('HA HA HA', LB.x, LB.y + 2);
}

function laughBox(ctx: Ctx): void {
  ctx.strokeStyle = '#2a2a32';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const s of [-1, 1]) {
    const x = LB.x + s * (LB.w / 2 - 20);
    ctx.moveTo(x, trackY(x) + 30);
    ctx.lineTo(x, LB.y - LB.h / 2);
  }
  ctx.stroke();
  castShadow(ctx, laughFace, 10, 12, 0.5, '#02020a');
  solid(ctx, laughFace, { x: LB.x - LB.w / 2, y: LB.y - LB.h / 2, w: LB.w, h: LB.h }, IRON, '#2a2630', { line: 2.4, formSize: 10 });
  const glass = rrPath(LB.x - LB.w / 2 + 8, LB.y - LB.h / 2 + 7, LB.w - 16, LB.h - 14, 3);
  ctx.fillStyle = '#120a10';
  glass(ctx);
  ctx.fill();
  laughLetters(ctx, '#c87a8a', 0.55, true);
  ctx.fillStyle = 'rgba(220,230,255,0.1)';
  ctx.fillRect(LB.x - LB.w / 2 + 12, LB.y - LB.h / 2 + 10, LB.w * 0.4, 4);
  ink(ctx, glass, 1.4, INK, 0);
}

/** The box lit (live only, laid on with ADD). */
function laughLit(ctx: Ctx): void {
  glowAt(ctx, LB.x, LB.y, LB.w * 0.6, '#ff5a3a', 0.35, 0.4);
  laughLetters(ctx, '#ff4a6a', 1);
  laughLetters(ctx, '#ffe0e8', 0.55, true);
}

/** Playing-card bunting of our own suits: slices, soles, pepperonis and grins. */
function card(ctx: Ctx, x: number, y: number, ang: number, suit: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  const c = rrPath(-11, 0, 22, 30, 2.5);
  ctx.fillStyle = '#d8d0bc';
  c(ctx);
  ctx.fill();
  ctx.fillStyle = 'rgba(20,10,20,0.25)';
  ctx.fillRect(3, 2, 8, 28);
  const col = ['#b0242c', '#5a2a86', '#b0242c', '#3a7a34'][suit];
  ctx.fillStyle = col;
  ctx.strokeStyle = col;
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (suit === 0) {
    ctx.moveTo(-6, 9);
    ctx.lineTo(6, 9);
    ctx.lineTo(0, 22);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c89a3a';
    ctx.fillRect(-6, 8, 12, 2.4);
  } else if (suit === 1) {
    ctx.ellipse(0, 17, 4, 6, 0, 0, P2);
    ctx.fill();
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.arc(-4 + k * 2.8, 9 - Math.abs(k - 1.5) * 0.6, 1.3, 0, P2);
      ctx.fill();
    }
  } else if (suit === 2) {
    ctx.arc(0, 15, 6, 0, P2);
    ctx.fill();
    ctx.fillStyle = '#5a0a10';
    for (const [dx, dy] of [[-2, -2], [2, 1], [-1, 3]]) {
      ctx.beginPath();
      ctx.arc(dx, 15 + dy, 1.1, 0, P2);
      ctx.fill();
    }
  } else {
    ctx.arc(0, 13, 6, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  c(ctx);
  ctx.stroke();
  ctx.restore();
}

const SWAGS: [Pt, Pt, number][] = [
  [[1734, 240], [1930, 300], 22],
  [[1440, trackY(1440) + 18], [1548, 214], 14],
];
const BUNTING_BOX: Box = { x: 1420, y: 100, w: W - 1420, h: 230 };

function bunting(ctx: Ctx): void {
  for (const [[x0, y0], [x1, y1], sag] of SWAGS) {
    const at = (t: number): Pt => {
      const mx = (x0 + x1) / 2;
      const my = (y0 + y1) / 2 + sag * 2;
      return [(1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * mx + t * t * x1, (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * my + t * t * y1];
    };
    ctx.strokeStyle = '#3a3438';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let t = 0; t <= 1; t += 0.02) ctx.lineTo(...at(t));
    ctx.stroke();
    const n = Math.round(Math.hypot(x1 - x0, y1 - y0) / 34);
    for (let k = 1; k < n; k++) {
      const [px, py] = at(k / n);
      const [qx, qy] = at(k / n + 0.01);
      card(ctx, px, py, Math.atan2(qy - py, qx - px) * 0.5, k % 4);
    }
  }
  // dimmed in the tent's dark
  dots(ctx, BUNTING_BOX, () => 0.35, '#02030a', { step: 4.5, angle: 0.79, a: 0.35 });
}

// ——— light: the tears' cold shafts, the bulbs' warmth ———

const SHAFT_L: Box = { x: 0, y: 40, w: 560, h: TY + 4 - 40 };
const SHAFT_R: Box = { x: 1400, y: 60, w: W - 1400, h: TY + 4 - 60 };

function shaftLeft(ctx: Ctx, r: R): void {
  shaft(ctx, r, [300, 98, 404, 104], [230, 758, 540, 758], MOONLIT, 0.1, { streaks: 6, motes: 0 });
  lightPool(ctx, 410, 744, 150, 14, MOONLIT, 0.14);
  bulbLight(ctx);
}
function shaftRight(ctx: Ctx, r: R): void {
  shaft(ctx, r, [1506, 128, 1620, 132], [1430, 740, 1740, 740], MOONLIT, 0.09, { streaks: 6, motes: 0 });
  lightPool(ctx, 1540, 732, 160, 14, MOONLIT, 0.14);
  lightPool(ctx, BOOTH_BULB[0], BOOTH_BULB[1] + 30, 120, 90, BULB, 0.1);
  lightPool(ctx, JK.tester.x, JK.tester.top - 20, 90, 70, BULB, 0.1);
}

/** The rain coming in (still): streaks below the tears. */
function rainStill(ctx: Ctx, r: R): void {
  ctx.lineCap = 'round';
  for (const h of JK.holes.slice(0, 2)) {
    for (let i = 0; i < 40; i++) {
      const x = h.x - h.rx * 0.8 + r() * h.rx * 1.6;
      const y = h.y + 20 + r() * 600;
      ctx.strokeStyle = rgba('#b8c8e8', 0.18 + r() * 0.2);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(x + (y - h.y) * 0.04, y);
      ctx.lineTo(x + (y - h.y) * 0.04 + 1, y + 16);
      ctx.stroke();
    }
  }
}

// ——— the table: the funhouse's old stage ———

/** Damp patches and confetti caught on the boards. */
export const PUDDLES: [number, number, number, number][] = [
  [150, 820, 90, 9],
  [1780, 834, 100, 10],
];

/** The faded spinning disc painted on the stage boards: a spiral of purple and green wedges in perspective. */
function disc(ctx: Ctx, r: R, zf: number): void {
  const [c, g] = makeCanvas(W, zf - TY + 4);
  g.translate(0, -TY);
  const zc = 2.12;
  const R0 = 0.86;
  const pt = (rho: number, a: number): Pt => [xAt(rho * Math.sin(a), zc + rho * Math.cos(a)), yAt(zc + rho * Math.cos(a))];
  const n = 16;
  for (let j = 0; j < n; j++) {
    g.fillStyle = j % 2 ? 'rgba(110,60,150,0.5)' : 'rgba(80,130,60,0.42)';
    g.beginPath();
    const a0 = (j / n) * P2;
    for (let rho = 0.04; rho <= R0; rho += 0.04) g.lineTo(...pt(rho, a0 + rho * 2.4));
    for (let rho = R0; rho >= 0.04; rho -= 0.04) g.lineTo(...pt(rho, a0 + P2 / n + rho * 2.4));
    g.closePath();
    g.fill();
  }
  // its rim and hub, cream paint
  g.strokeStyle = 'rgba(220,210,180,0.5)';
  g.lineWidth = 6;
  g.beginPath();
  for (let k = 0; k <= 80; k++) g.lineTo(...pt(R0, (k / 80) * P2));
  g.stroke();
  // broken along the boards' seams (paint never bridges a gap between planks)
  g.globalCompositeOperation = 'destination-out';
  g.strokeStyle = '#000';
  for (let X = -3; X <= 3; X += 0.3) {
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(xAt(X, 2.7), yAt(2.7));
    g.lineTo(xAt(X, 1.5), yAt(1.5));
    g.stroke();
  }
  g.globalCompositeOperation = 'source-over';
  // worn away by years of feet: scuffed down the middle and in patches
  g.globalCompositeOperation = 'destination-out';
  lay(g, noiseMask(10, 91, { cover: 0.4, soft: 0.3, col: '#000000' }), { x: 0, y: TY, w: W, h: zf - TY }, 0.55);
  lay(g, noiseMask(40, 92, { cover: 0.3, soft: 0.05, col: '#000000' }), { x: 0, y: TY, w: W, h: zf - TY }, 0.35);
  void r;
  ctx.save();
  ctx.globalAlpha = 0.42;
  ctx.drawImage(c, 0, TY);
  ctx.restore();
}

function table(ctx: Ctx, r: R): void {
  const zf = JK.front;
  planksPlane(ctx, r, zf, '#3a2c34', 0.3, 0.012, true);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, zf - TY + 4);
  ctx.clip();
  // the old stage's dark stain, scuffed pale where the acts stood
  ctx.fillStyle = 'rgba(16,10,22,0.35)';
  ctx.fillRect(0, TY, W, zf - TY);
  disc(ctx, r, zf);
  lay(ctx, noiseMask(12, 93, { cover: 0.3, soft: 0.25, col: '#0a0810' }), { x: 0, y: TY, w: W, h: zf - TY }, 0.4);
  // confetti in the cracks, more at the sides
  for (let i = 0; i < 340; i++) {
    const x = r() * W;
    if (Math.abs(x - 960) < 600 && r() < 0.75) continue;
    const y = TY + 4 + r() * (zf - TY - 8);
    const s = 0.6 + ((y - TY) / (zf - TY)) * 0.9;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(r() * P2);
    ctx.fillStyle = rgba(CONFETTI[Math.floor(r() * CONFETTI.length)], 0.3 + r() * 0.3);
    ctx.fillRect(-3 * s, -1.2 * s, 6 * s, 2.4 * s);
    ctx.restore();
  }
  // a card or two dropped from the bunting
  card(ctx, 1700, 900, 1.1, 1);
  card(ctx, 230, 960, -0.5, 0);
  // the damp under the drips at the sides
  for (const [px, py, rx, ry] of PUDDLES) {
    softly(ctx, { x: px - rx - 24, y: py - ry - 14, w: rx * 2 + 48, h: ry * 2 + 28 }, (g) => {
      g.fillStyle = 'rgba(6,8,16,0.45)';
      g.beginPath();
      g.ellipse(px, py, rx, ry, 0, 0, P2);
      g.fill();
    }, 0.25);
    ctx.strokeStyle = 'rgba(160,180,220,0.14)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(px, py, rx * 0.9, ry * 0.9, 0, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
  }
  // the bulbs' warmth on the left of the boards, the tears' cold on the right
  lightPool(ctx, 260, TY + 30, 380, 44, BULB, 0.06);
  lightPool(ctx, 1600, TY + 26, 300, 34, MOONLIT, 0.05);
  // the printed shade
  dots(ctx, { x: 0, y: TY, w: W, h: zf - TY }, (x, y) => 0.25 * smooth(zf - 200, zf, y) + 0.12 * (1 - smooth(TY, TY + 50, y)) + (0.12 * Math.abs(x - 960)) / 960, '#02040c', { step: 8, angle: 0.79, a: 0.3, floor: 0.06 });
  ctx.restore();
  tableFalloff(ctx, zf, 0.4, '#02040a');
  tableSeam(ctx, 0.6, INK, false);
  // the stage's back edge: a worn lip, the drop to the sawdust behind
  vfill(ctx, 0, TY - 12, W, 12, [[0, 'rgba(2,4,10,0)'], [1, 'rgba(2,4,10,0.55)']]);
  ctx.fillStyle = 'rgba(170,160,190,0.22)';
  ctx.fillRect(0, TY - 1, W, 2);
  crevice(ctx, 0, W, TY + 1, 12, 0.4, '#02040a');
  // the apron: dark boards with the old footlights in their tin hoods, dead
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, zf, W, 1080 - zf);
  ctx.clip();
  vfill(ctx, 0, zf, W, 1080 - zf, [[0, '#2a1e26'], [0.3, '#1a1218'], [1, '#0a080c']]);
  ctx.fillStyle = 'rgba(190,180,200,0.25)';
  ctx.fillRect(0, zf, W, 2);
  for (let x = 120; x < W; x += 240) {
    const hood: PathFn = (c) => {
      c.beginPath();
      c.ellipse(x, zf + 2, 34, 18, 0, 0, Math.PI);
      c.closePath();
    };
    ctx.fillStyle = '#3a3640';
    hood(ctx);
    ctx.fill();
    ctx.fillStyle = 'rgba(200,200,220,0.25)';
    ctx.fillRect(x - 30, zf + 3, 60, 2);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    hood(ctx);
    ctx.stroke();
  }
  dots(ctx, { x: 0, y: zf, w: W, h: 1080 - zf }, (_x, y) => 0.25 + 0.5 * smooth(zf, 1080, y), '#000000', { step: 7, angle: 0.79, a: 0.5 });
  ctx.restore();
}

// ——— finishing ———

function shadeOver(ctx: Ctx): void {
  // the HUD's corner calm, the lanes calm, the tent's vignette
  const g = ctx.createRadialGradient(180, 70, 40, 180, 70, 520);
  g.addColorStop(0, 'rgba(2,4,10,0.4)');
  g.addColorStop(1, 'rgba(2,4,10,0)');
  ctx.save();
  ctx.scale(1, 0.4);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 760, 520);
  ctx.restore();
  calmLanes(ctx, 0.2, '#02040c', 120, 720);
  vfill(ctx, 0, 0, W, 110, [[0, 'rgba(2,3,8,0.45)'], [1, 'rgba(2,3,8,0)']]);
  vignetteAll(ctx, 0.6, '#010208', 0.5);
}

// ——— the stack ———

export const JOKESTER: SceneSpec = {
  id: 'jokester',
  info: {
    name: 'Ha-Ha Funhouse',
    subtitle: 'Boss: THE JOKESTER',
    ambient: [],
    glows: [],
    light: '#d8c8f0',
    tableTint: '#f0e8ff',
  },
  layers: [
    { id: 'sky', box: SKY_BOX, draw: sky },
    { id: 'wall', box: WALL_BOX, draw: backWall },
    { id: 'floor', box: FLOOR_BOX, draw: floor },
    { id: 'canopy', box: CANOPY_BOX, draw: canopy },
    { id: 'carouselTop', box: { x: CA.x - CA.rx - 40, y: CA.rim - 130, w: CA.rx * 2 + 80, h: CA.deck + 26 - (CA.rim - 130) }, draw: carouselStill },
    { id: 'carousel', box: CAROUSEL_BOX, motion: 'slot', draw: () => {} },
    { id: 'carouselStill', box: CAROUSEL_BOX, stillOnly: true, draw: (c) => {
      c.save();
      c.translate(CAROUSEL_BOX.x, CAROUSEL_BOX.y);
      carouselFrame(c, 0.3);
      c.restore();
    } },
    { id: 'coaster', box: TRACK_BOX, draw: coaster },
    { id: 'bunting', box: BUNTING_BOX, draw: bunting },
    { id: 'laughBox', box: LAUGH_BOX, draw: laughBox },
    { id: 'mirrors', box: MIRROR_BOX, draw: mirrors },
    { id: 'tester', box: TESTER_BOX, draw: tester },
    { id: 'booth', box: BOOTH_BOX, draw: booth },
    { id: 'face', box: FACE_BOX, draw: face },
    { id: 'cart', box: CART_BOX, draw: cart },
    { id: 'horse', box: HORSE_BOX, draw: brokenHorse },
    { id: 'shaftL', box: SHAFT_L, draw: shaftLeft },
    { id: 'shaftR', box: SHAFT_R, draw: shaftRight },
    { id: 'table', box: { x: 0, y: TY - 4, w: W, h: 1080 - TY + 4 }, draw: table },
    // (live only, laid on with ADD: the tears lit by lightning, the laugh-track box lit)
    { id: 'skyLit', box: SKY_BOX, liveOnly: true, res: 0.5, draw: skyLit },
    { id: 'laughLit', box: LAUGH_BOX, liveOnly: true, draw: laughLit },
    { id: 'bulbsStill', stillOnly: true, draw: bulbsStill },
    { id: 'balloonsStill', stillOnly: true, draw: balloonsStill },
    { id: 'puckStill', stillOnly: true, draw: (c) => puckPaint(c, PUCK.x, PUCK.rest) },
    { id: 'rainStill', stillOnly: true, draw: rainStill },
    { id: 'fx', motion: 'top', draw: () => {} },
  ],
  shade: shadeOver,
};

// ——— live: textures and frame painters ———

export const CAR = { w: 120, h: 56 };
/** The coaster car, side on, nose to the right: a tub with a grin painted on its nose, its lap bar, its wheels. */
export function carPaint(c: Ctx): void {
  const by = CAR.h - 14;
  const tub: PathFn = (q) => {
    q.beginPath();
    q.moveTo(8, by);
    q.lineTo(6, 22);
    q.quadraticCurveTo(8, 14, 20, 14);
    q.lineTo(70, 18);
    q.quadraticCurveTo(100, 12, 112, 26);
    q.quadraticCurveTo(116, by - 4, 106, by);
    q.closePath();
  };
  solid(c, tub, { x: 4, y: 10, w: 114, h: by - 6 }, PAINT, '#5a2a86', { line: 2.2, formSize: 14 });
  within(c, tub, () => {
    c.fillStyle = rgba(GOLD, 0.8);
    c.fillRect(4, by - 10, 114, 3);
    // the grin on its nose (our own): two dots and a crescent
    c.fillStyle = '#e8dcc0';
    c.beginPath();
    c.arc(98, 26, 3, 0, P2);
    c.arc(88, 24, 3, 0, P2);
    c.fill();
    c.strokeStyle = '#e8dcc0';
    c.lineWidth = 2.6;
    c.beginPath();
    c.arc(92, 26, 10, 0.3, Math.PI - 0.6);
    c.stroke();
    dots(c, { x: 0, y: 0, w: CAR.w, h: CAR.h }, linTone(0, 10, 0, by, 0.1, 0.6), '#0a0410', { step: 4, angle: 0.79, a: 0.5 });
  });
  // the lap bar and the seat back
  c.strokeStyle = INK;
  c.lineWidth = 5;
  c.beginPath();
  c.moveTo(30, 16);
  c.quadraticCurveTo(38, 2, 56, 4);
  c.lineTo(62, 18);
  c.stroke();
  c.strokeStyle = '#a0a4ae';
  c.lineWidth = 2.4;
  c.stroke();
  // the wheels
  for (const wx of [24, 92]) {
    c.fillStyle = INK;
    c.beginPath();
    c.arc(wx, by + 4, 8, 0, P2);
    c.fill();
    c.fillStyle = '#6a6e7a';
    c.beginPath();
    c.arc(wx, by + 4, 4.6, 0, P2);
    c.fill();
  }
  // its headlamp
  c.fillStyle = '#3a3630';
  c.beginPath();
  c.arc(112, 32, 5, 0, P2);
  c.fill();
  c.fillStyle = '#ffe8a8';
  c.beginPath();
  c.arc(113, 32, 3, 0, P2);
  c.fill();
}

/** The bits a stomp throws up: confetti (painted white, tinted when thrown) and popcorn. */
const BIT = 16;
function confettiFrame(c: Ctx, i: number): void {
  c.translate(BIT, BIT);
  c.fillStyle = '#ffffff';
  c.strokeStyle = 'rgba(0,0,0,0.5)';
  c.lineWidth = 1;
  c.beginPath();
  if (i === 0) c.rect(-7, -3, 14, 6);
  else if (i === 1) c.rect(-4, -4, 8, 8);
  else if (i === 2) {
    c.moveTo(-6, 4);
    c.lineTo(0, -6);
    c.lineTo(6, 4);
    c.closePath();
  } else c.arc(0, 0, 4.5, 0, P2);
  c.fill();
  c.stroke();
  c.fillStyle = 'rgba(0,0,0,0.25)';
  c.fillRect(0, -4, 7, 8);
}
function popcornFrame(c: Ctx, i: number): void {
  c.translate(BIT, BIT);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * P2 + i;
    const g = c.createRadialGradient(Math.cos(a) * 3 - 1, Math.sin(a) * 3 - 1, 0.5, Math.cos(a) * 3, Math.sin(a) * 3, 5);
    g.addColorStop(0, '#fffbe8');
    g.addColorStop(1, '#c8a060');
    c.fillStyle = g;
    c.beginPath();
    c.arc(Math.cos(a) * 3, Math.sin(a) * 3, 4.4 - (k % 2), 0, P2);
    c.fill();
  }
  c.fillStyle = '#a06a2a';
  c.beginPath();
  c.arc(1, 1, 1.6, 0, P2);
  c.fill();
}

/** Where the rain through each tear lands (the floor, or a prop's top in front of it). */
const landAt = (x: number): number => (x < F.x + F.rx - 10 ? F.floor + 2 : x > 1540 && x < 1790 ? 724 : 736) + crand() * 18;

registerKitScene(JOKESTER, (k) => {
  const fx = k.slot('fx');
  const B = Phaser.BlendModes;
  const flashes = () => save.settings.flashes && !save.settings.reducedMotion;

  // ——— the carousel, creaking round in fits
  const CR = 0.75;
  const carKey = sheet(k, 'jk_carousel', CAROUSEL_BOX.w * CR, CAROUSEL_BOX.h * CR, 16, (c, ph) => {
    c.scale(CR, CR);
    carouselFrame(c, ph);
  });
  const carousel = new Loop(k, carKey, 16, CAROUSEL_BOX.x, CAROUSEL_BOX.y, { into: k.slot('carousel'), origin: [0, 0], scale: 1 / CR, fps: 1, phase: 4.8 });
  let carSpeed = 2.2;
  let carTarget = 2.2;
  let carStateT = 6 + crand() * 6;
  let lurch = 0;

  // ——— the bulbs: chasing, flickering, popping
  const bulbKey = k.tex('jk_bulb', 24, 24, (c) => {
    const g = c.createRadialGradient(9, 9, 0.5, 12, 12, 9);
    g.addColorStop(0, '#fffbe8');
    g.addColorStop(0.6, '#ffd890');
    g.addColorStop(1, '#d08030');
    c.fillStyle = g;
    c.beginPath();
    c.arc(12, 12, 9, 0, P2);
    c.fill();
  });
  const all = [...BULBS, { x: BOOTH_BULB[0], y: BOOTH_BULB[1], r: 6, dead: false, group: 3 }];
  const bulbs = all.map((b, i) => ({
    ...b,
    i,
    core: k.img(bulbKey, b.x, b.y, { into: fx, scale: b.r / 9, alpha: 0 }),
    halo: k.glow(b.x, b.y, b.r * 6, 0xffc070, 0, { into: fx }),
    lv: 0,
    popped: 0,
    flaky: i % 7 === 4,
  }));
  const shards = new Parts(k, { frame: 'spark', into: fx, max: 60 });
  const popFlash = k.glow(0, 0, 60, 0xfff0c8, 0, { into: fx });
  let popFlashA = 0;
  let flashAll = 0;
  let strobeT = 0;
  const pop = (b: (typeof bulbs)[number]) => {
    b.popped = 8 + crand() * 12;
    b.lv = 0;
    popFlash.setPosition(b.x, b.y);
    popFlashA = 0.9;
    for (let j = 0; j < 7; j++) shards.spawn({ x: b.x, y: b.y, vx: (crand() - 0.5) * 220, vy: -60 - crand() * 160, life: 0.9, r0: 1.6, a: 0.9, tint: 0xe8f0ff, grav: 1100, floor: Math.min(TY - 2, b.y + 220), bounce: 0.3, streak: 0.004 });
  };

  // ——— the face's eyes
  const eyes = JK.eyes.map(([x, y]) => ({ halo: k.glow(x, y, 70, 0xffb850, 0, { into: fx }), core: k.glow(x, y, 26, 0xffe6a8, 0, { into: fx }) }));
  let eyeFlare = 0;

  // ——— the laugh-track box
  const laugh = k.sprite('laughLit').setBlendMode(B.ADD);
  let laughT = 0;

  // ——— the strength tester: the puck on its rail, the bell
  const puckKey = k.tex('jk_puck', 40, 24, (c) => puckPaint(c, 22, 12));
  const puck = k.img(puckKey, PUCK.x - 2, PUCK.rest, { into: fx });
  const ps = { y: PUCK.rest as number, v: 0 };
  const G = 1800;
  const ringKey = k.tex('jk_ring', 64, 32, ringTex);
  const bellRing = k.img(ringKey, PUCK.x, PUCK.top - 22, { into: fx, add: true, alpha: 0 });
  const bellGlow = k.glow(PUCK.x, PUCK.top - 30, 90, 0xffd890, 0, { into: fx });
  let dingT = -1;
  const testerBulb = bulbs.find((b) => b.group === 2)!;
  const kickPuck = (v: number) => {
    if (ps.y > PUCK.rest - 30) ps.v = -Math.min(1300, v);
  };

  // ——— balloons bobbing on their strings
  const balloons = BALLOONS.map((b, i) => {
    const { w, h } = BALLOON_TEX(b);
    const key = k.tex(`jk_balloon${i}`, w, h, (c) => balloonPaint(c, b));
    const img = k.img(key, b.x, b.y, { into: fx, origin: [0.5, (h - 4) / h] });
    return { b, img, sp: new Spring(0, 3 + i * 0.4, 0.7), seed: i * 1.7 };
  });

  // ——— the coaster car, rattling across now and then
  const carTex = k.tex('jk_car', CAR.w, CAR.h, carPaint);
  const car = k.img(carTex, -200, 0, { into: fx, origin: [0.5, (CAR.h - 6) / CAR.h], scale: 1.1 }).setVisible(false);
  const carLamp = k.glow(-200, 0, 50, 0xffe0a0, 0, { into: fx });
  const sparks = new Parts(k, { frame: 'spark', into: fx, add: true, max: 40 });
  let carX = -9999;
  let nextCar = 12 + crand() * 14;
  const sendCar = () => {
    if (carX < -1000) carX = -120;
  };

  // ——— rain through the tears: drops, splashes, ripples; lightning in the tears
  const drops = new Parts(k, { frame: 'drop', into: fx, max: 140 });
  const splashKey = sheet(k, 'jk_splash', SPLASH.w, SPLASH.h, SPLASH.n, (c, _p, i) => splashFrame(c, i));
  type Spl = { img: Phaser.GameObjects.Image; t: number; dur: number };
  const spl: Spl[] = Array.from({ length: 30 }, () => ({ img: k.img(splashKey, 0, 0, { into: fx, origin: [0.5, (SPLASH.h - 5) / SPLASH.h] }).setVisible(false), t: -1, dur: 0.3 }));
  const persp = (y: number) => Phaser.Math.Clamp((y - 400) / (JK.front - 400), 0.35, 1);
  const splash = (x: number, y: number, sc = 1) => {
    const s = spl.find((q) => q.t < 0);
    if (!s) return;
    s.t = 0;
    s.dur = 0.24 + crand() * 0.1;
    s.img.setPosition(x, y).setScale(sc * persp(y) * (0.8 + crand() * 0.5)).setVisible(true).setFlipX(crand() < 0.5);
  };
  type Ring = { img: Phaser.GameObjects.Image; t: number; s: number };
  const rings: Ring[] = Array.from({ length: 12 }, () => ({ img: k.img(ringKey, 0, 0, { into: fx, add: true, alpha: 0 }), t: -1, s: 1 }));
  const ripple = (x: number, y: number, s: number) => {
    const q = rings.find((g) => g.t < 0);
    if (!q) return;
    q.t = 0;
    q.s = s * persp(y);
    q.img.setPosition(x, y);
  };
  const rainRates = JK.holes.map(() => new Rate());
  const ringRate = new Rate();
  const skyLitImg = k.sprite('skyLit').setBlendMode(B.ADD);
  const shaftFlash = JK.holes.slice(0, 2).map((h) => k.glow(h.x, h.y + 300, 360, 0xb8c8ff, 0, { into: fx, sy: 1.4 }));
  let nextBolt = 8 + crand() * 8;
  let boltT = -1;
  let boltP: number[] = [];

  // ——— confetti and popcorn thrown up by a stomp; confetti drifting down from the tears now and then
  const confKey = sheet(k, 'jk_conf', BIT * 2, BIT * 2, 4, (c, _p, i) => confettiFrame(c, i));
  const popKey = sheet(k, 'jk_pop', BIT * 2, BIT * 2, 3, (c, _p, i) => popcornFrame(c, i));
  const confetti = new Parts(k, { frame: 'flake', sheet: { key: confKey, n: 4, half: BIT }, into: fx, max: 120 });
  const popcorn = new Parts(k, { frame: 'flake', sheet: { key: popKey, n: 3, half: BIT }, into: fx, max: 40 });
  const CONF = [0xb6f04a, 0x9a5ae0, 0xe0303a, 0xf2c14e, 0xe8e4f0, 0x4ac0e0];
  const tossConfetti = (x: number, y0: number, y1: number, n: number, p: number) => {
    for (let i = 0; i < n; i++) {
      const y = y0 + crand() * (y1 - y0);
      confetti.spawn({ x: x + (crand() - 0.5) * 420, y, vx: (crand() - 0.5) * 220, vy: -(160 + crand() * 340) * (0.5 + p), life: 2.4 + crand(), r0: 9 * persp(y), a: 1, tint: CONF[Math.floor(crand() * CONF.length)], grav: 900, floor: y + crand() * 8, bounce: 0.35, spin: (crand() - 0.5) * 14, drag: 0.6, fade: 0.02 });
    }
  };
  const flutterRate = new Rate();

  // ——— mirrors: a crack that mends
  const cracks = JK.mirrors.map((m, i) => {
    const gw = m.x1 - m.x0 - 20;
    const gh = m.foot - 32 - m.top;
    const key = k.tex(`jk_crack${i}`, gw, gh, (c) => mirrorCrack(c, m, 300 + i * 11));
    return { img: k.img(key, m.x0 + 10, m.top + 10, { into: fx, origin: [0, 0], alpha: 0 }), hold: 0, m };
  });

  // ——— the fight, heard (src/game/bosses/gotham.ts, the jokester brain)
  const onBomb = () => {
    eyeFlare = Math.max(eyeFlare, 1);
    laughT = Math.max(laughT, 2.2);
    flashAll = 1;
    kickPuck(950);
    lurch = Math.max(lurch, 0.6);
  };
  const onPhase = () => {
    eyeFlare = 1.6;
    laughT = 3.4;
    strobeT = 2.6;
    flashAll = 1;
    kickPuck(1300);
    lurch = 1.2;
    sendCar();
    for (const h of JK.holes.slice(0, 2)) tossConfetti(h.x, h.y + 10, h.y + 30, 18, 0);
  };
  const ev = k.sc.events;
  ev.on('jokester-bomb', onBomb);
  ev.on('jokester-phase', onPhase);
  const unlisten = () => {
    ev.off('jokester-bomb', onBomb);
    ev.off('jokester-phase', onPhase);
    ev.off(Phaser.Scenes.Events.SHUTDOWN, unlisten);
  };
  ev.once(Phaser.Scenes.Events.SHUTDOWN, unlisten);
  /** In a fight (the game scene has its boss slots), or on the stages page, where the funhouse plays its cues itself. */
  const inFight = 'miniFoot' in (k.sc as object);
  const DEMO: (() => void)[] = [onBomb, onBomb, onPhase, onBomb];
  let demoI = 0;
  let demoT = 5;

  return {
    impact(x, y, p) {
      // a few bulbs pop, more the harder the stomp
      const lit = bulbs.filter((b) => !b.dead && !b.popped && b.lv > 0.5);
      for (let n = Math.round(p * 2.5 + (crand() < 0.5 ? 1 : 0)); n > 0 && lit.length; n--) pop(lit.splice(Math.floor(crand() * lit.length), 1)[0]);
      kickPuck(450 + p * 900);
      // confetti off the boards round the stomp, popcorn out of the cart
      tossConfetti(x, TY + 20, Math.min(JK.front - 10, (y || 900) + 40), Math.round(8 + p * 22), p);
      for (let i = 0; i < 3 + p * 8; i++)
        popcorn.spawn({ x: 40 + crand() * 70, y: 640, vx: 30 + crand() * 140, vy: -(120 + crand() * 220) * (0.5 + p), life: 2.4, r0: 5, a: 1, tint: 0xffffff, grav: 1000, floor: CART.floor - 4 - crand() * 6, bounce: 0.4, spin: (crand() - 0.5) * 10, fade: 0.02 });
      // a mirror cracks
      if (p > 0.45) {
        const c = cracks[crand() < 0.5 ? 0 : 1];
        if (c.img.alpha < 0.4) {
          c.img.setAlpha(1);
          c.hold = 6;
          const m = c.m;
          for (let j = 0; j < 6; j++) shards.spawn({ x: (m.x0 + m.x1) / 2 + (crand() - 0.5) * 30, y: (m.top + m.foot) / 2, vx: (crand() - 0.5) * 160, vy: -40 - crand() * 100, life: 1, r0: 1.4, a: 0.8, tint: 0xd8e4ff, grav: 1000, floor: m.foot, bounce: 0.25 });
        }
      }
      // the balloons jerk on their strings, the carousel lurches
      for (const bl of balloons) bl.sp.v += (crand() - 0.5) * 2.4 * p + (bl.b.x < x ? -0.6 : 0.6) * p;
      lurch = Math.max(lurch, 0.3 * p);
      if (!inFight && p >= 0.95) onBomb();
    },
    update(dt, t) {
      const cm = calm();
      if (!inFight) {
        demoT -= dt;
        if (demoT < 0) {
          demoT = 6;
          DEMO[demoI++ % DEMO.length]();
        }
      }
      // ——— carousel: turning, stalling, lurching on
      carStateT -= dt;
      if (carStateT < 0) {
        const stall = crand() < 0.35;
        carTarget = stall ? 0 : 1.6 + crand() * 1.4;
        carStateT = stall ? 2 + crand() * 3 : 5 + crand() * 8;
        if (!stall) lurch = Math.max(lurch, 0.4);
      }
      lurch = Math.max(0, lurch - dt * 0.8);
      carSpeed += (carTarget + lurch * 5 - carSpeed) * Math.min(1, dt * (lurch > 0 ? 3 : 0.8));
      carousel.step(dt, carSpeed * cm);
      const judder = lurch > 0 ? Math.sin(t * 50) * lurch * 1.2 : 0;
      carousel.each((im) => im.setY(CAROUSEL_BOX.y + judder));
      // ——— bulbs
      flashAll = Math.max(0, flashAll - dt * 1.2);
      strobeT = Math.max(0, strobeT - dt);
      popFlashA = Math.max(0, popFlashA - dt * 6);
      popFlash.setAlpha(popFlashA);
      const step = Math.floor(t * (strobeT > 0 ? 14 : 5));
      for (const b of bulbs) {
        if (b.popped > 0) {
          b.popped -= dt;
          // coming back: it stutters on
          b.lv = b.popped < 0.8 ? (Math.floor(b.popped * 18) % 3 === 0 ? 1 : 0) : 0;
        } else if (b.dead) b.lv = 0;
        else {
          let on = b.group === 3 ? 1 : (b.i + step) % 3 !== 0 ? 1 : 0.15;
          if (strobeT > 0) on = step % 2 ? 1 : 0;
          if (b.flaky && Math.sin(t * 13 + b.i) * Math.sin(t * 5.3 + b.i * 2) > 0.55) on *= 0.1;
          on = Math.max(on, flashAll);
          b.lv += (on - b.lv) * Math.min(1, dt * 22);
        }
        const f = b.group === 3 ? flicker(t * 0.6, b.i) : 1;
        b.core.setAlpha(b.lv * f);
        b.halo.setAlpha(b.lv * f * (0.3 + 0.35 * flashAll));
      }
      // ——— the eyes: a slow sickly breath at rest, a flare when he laughs
      eyeFlare = Math.max(0, eyeFlare - dt * 0.7);
      const breath = 0.1 + 0.05 * Math.sin(t * 1.1) + 0.02 * wander(t, 3);
      const ef = Math.min(1, eyeFlare);
      eyes.forEach((e, i) => {
        const tw = eyeFlare > 0 ? 0.85 + 0.15 * Math.sin(t * 30 + i) : 1;
        e.halo.setAlpha((breath * 0.6 + 0.45 * ef) * tw).setScale(((70 * 2) / 256) * (1 + 0.3 * ef));
        e.core.setAlpha((0.1 + 0.6 * ef) * tw);
      });
      // ——— the laugh-track box: HA HA HA blinking while he laughs, a faint stray buzz otherwise
      laughT = Math.max(0, laughT - dt);
      const buzz = Math.sin(t * 0.7) > 0.97 ? 0.15 * (Math.sin(t * 40) > 0 ? 1 : 0) : 0;
      laugh.setAlpha(laughT > 0 ? (Math.floor(laughT * 5) % 2 ? 1 : 0.35) * Math.min(1, laughT * 2) : buzz);
      // ——— the puck: flung up the rail, ringing the bell if it gets there
      if (ps.v !== 0 || ps.y < PUCK.rest) {
        ps.v += G * dt;
        ps.y += ps.v * dt;
        if (ps.y <= PUCK.top) {
          ps.y = PUCK.top;
          ps.v = Math.abs(ps.v) * 0.2;
          dingT = 0;
          testerBulb.popped = 0;
          testerBulb.lv = 1;
        }
        if (ps.y >= PUCK.rest) {
          ps.y = PUCK.rest;
          ps.v = ps.v > 200 ? -ps.v * 0.25 : 0;
        }
      }
      puck.setY(ps.y);
      if (dingT >= 0) {
        dingT += dt;
        const u = dingT / 0.9;
        bellRing.setScale(0.4 + u * 1.6).setAlpha(0.6 * (1 - u));
        bellGlow.setAlpha(0.7 * (1 - u) * (flashes() ? 1 : 0.4));
        if (u >= 1) {
          dingT = -1;
          bellRing.setAlpha(0);
          bellGlow.setAlpha(0);
        }
      }
      // ——— balloons
      for (const bl of balloons) {
        const idle = wander(t * 0.4, bl.seed) * 0.08 * cm;
        bl.img.setRotation(bl.b.lean + bl.sp.step(idle, dt));
        bl.img.setY(bl.b.y + Math.sin(t * 0.9 + bl.seed) * 2 * cm);
      }
      // ——— the coaster car: across now and then, rattling, sparks off its wheels
      nextCar -= dt;
      if (nextCar < 0) {
        sendCar();
        nextCar = 26 + crand() * 22;
      }
      if (carX > -1000) {
        carX += dt * 520;
        const y = trackY(carX) - 7;
        const ang = Math.atan2(trackY(carX + 20) - trackY(carX - 20), 40);
        const rattle = (Math.sin(t * 61) + Math.sin(t * 37)) * 0.8 * cm;
        car.setVisible(true).setPosition(carX, y + rattle).setRotation(ang + rattle * 0.01);
        carLamp.setPosition(carX + 62, y - 24).setAlpha(0.35 + 0.1 * Math.sin(t * 20));
        if (crand() < dt * 8) sparks.spawn({ x: carX + (crand() < 0.5 ? -28 : 30), y: y + 2, vx: -80 - crand() * 120, vy: -40 - crand() * 80, life: 0.5, r0: 2, a: 0.9, tint: 0xffc070, grav: 900, streak: 0.006 });
        if (carX > W + 140) {
          carX = -9999;
          car.setVisible(false);
          carLamp.setAlpha(0);
        }
      }
      sparks.update(dt);
      // ——— rain in through the tears
      JK.holes.forEach((h, i) => {
        rainRates[i].tick((i === 2 ? 0.8 : 14) * cm, dt, () => {
          const x = h.x + (crand() - 0.5) * h.rx * 1.4;
          const y = h.y + (crand() - 0.3) * h.ry;
          const fl = i === 2 ? FLOOR_PUDDLES[2][1] : landAt(x + 20);
          drops.spawn({ x, y, vx: 20 + crand() * 20, vy: 80 + crand() * 160, life: 2.4, r0: 1.4, r1: 2, a: 0.55, tint: 0xc0d0f0, grav: 900, streak: 0.02, floor: fl, onFloor: (sx, sy) => crand() < 0.7 && splash(sx, sy, 0.7) });
        });
      });
      ringRate.tick(2.2 * cm, dt, () => {
        const [px, py, rx] = FLOOR_PUDDLES[Math.floor(crand() * 2)];
        ripple(px + (crand() - 0.5) * rx, py, 0.5 + crand() * 0.4);
      });
      drops.update(dt);
      for (const s of spl) {
        if (s.t < 0) continue;
        s.t += dt;
        const u = s.t / s.dur;
        if (u >= 1) {
          s.t = -1;
          s.img.setVisible(false);
        } else s.img.setFrame(Math.min(SPLASH.n - 1, Math.floor(u * SPLASH.n)));
      }
      for (const q of rings) {
        if (q.t < 0) continue;
        q.t += dt;
        const u = q.t / 0.9;
        if (u >= 1) {
          q.t = -1;
          q.img.setAlpha(0);
          continue;
        }
        q.img.setScale(q.s * (0.2 + u * 0.9)).setAlpha(0.3 * (1 - u));
      }
      // ——— lightning through the tears now and then
      nextBolt -= dt;
      if (nextBolt < 0) {
        nextBolt = 10 + crand() * 12;
        boltT = 0;
        boltP = [0, 0.13 + crand() * 0.06];
        if (crand() < 0.5) boltP.push(0.32 + crand() * 0.1);
      }
      let fl = 0;
      if (boltT >= 0) {
        boltT += dt;
        for (const s0 of boltP) {
          const u = boltT - s0;
          if (u >= 0) fl = Math.max(fl, u < 0.06 ? 1 : Math.exp(-(u - 0.06) * 8));
        }
        if (boltT > 1.4) boltT = -1;
      }
      const fk = flashes() ? 1 : 0.3;
      skyLitImg.setAlpha(fl * 0.9 * fk);
      shaftFlash.forEach((g) => g.setAlpha(fl * 0.12 * fk));
      // ——— confetti: a piece drifting down from the tears now and then, everything thrown up settling
      flutterRate.tick(0.6 * cm, dt, () => {
        const h = JK.holes[crand() < 0.5 ? 0 : 1];
        confetti.spawn({ x: h.x + (crand() - 0.5) * h.rx, y: h.y + 20, vx: 10 + crand() * 20, vy: 30, life: 6, r0: 5, a: 0.85, tint: CONF[Math.floor(crand() * CONF.length)], grav: 40, drag: 0.8, spin: (crand() - 0.5) * 6, floor: landAt(h.x), bounce: 0.1, fade: 0.05 });
      });
      confetti.update(dt);
      popcorn.update(dt);
      shards.update(dt);
      // ——— mirror cracks mend slowly
      for (const c of cracks) {
        if (c.hold > 0) c.hold -= dt;
        else if (c.img.alpha > 0) c.img.setAlpha(Math.max(0, c.img.alpha - dt / 20));
      }
    },
    destroy() {
      unlisten();
    },
  };
});
