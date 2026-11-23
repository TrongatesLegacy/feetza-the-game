// The Roller Rink (Stage 10, waves 46–49), redrawn with the location kit (src/art/scene): a seventies roller rink on
// a Saturday, seen from the snack bar's ledge along the rink wall. Under a black roof and a steel truss (high-bay
// lamps, two moving-head spots, blacklight tubes, the mirror ball on its chain), the far wall is painted cinder block
// with a sunset-stripe mural; the ROLLER RINK marquee on its bulb border over the skate-rental hatch (cubbies of
// rental skates, the lit room behind) on the left; the DJ booth on the right (its window, the DJ at the decks, the
// speakers, the NOW SKATING letterboard on its roof). A carpeted barrier with a maple cap runs round the rink; the
// floor is long maple strip, glossy enough to hold the room. Our side of the barrier is the cosmic carpet; the ledge
// is a glitter laminate with chrome nosing: arcade tokens at the left, a rental skate and a soda at the right.
//
// The light across the stage: the session goes from an afternoon All Skate under the house lights, to Speed Skate
// with the lights halved and the spots on, to a Couples Skate in the dark with the fog machine running, to the
// Last Skate under blacklight (the carpet, the mural and the glitter fluoresce).
//
// Live, the heroes:
// - the skaters: four painted skaters (a stride cycle painted at twelve phases each: push, glide, recover; arms
//   swinging against the legs) circling the rink, smaller on the far straight, each with its contact shadow and its
//   reflection in the maple; a stomp makes them wobble on their wheels; the sessions change their pace (the couple
//   skates together);
// - the mirror ball: painted turning (its facets reflecting the room), its glints, the light specks it throws
//   sweeping over the wall and the floor, swinging on its chain when the counter's hit;
// - the dance-floor air: painted fog rolling over the floor, the moving heads' beams sweeping through it and their
//   spots crossing the maple; and the blacklight coming on at the last skate.
// The marquee's bulbs chase, the letterboard changes with the session, the DJ nods to the beat, and on the ledge the
// tokens hop and the skate rolls when it's hit.

import Phaser from 'phaser';
import { ROUND } from '../../art/backdrops';
import { ZB, xAt, yAt, zAt } from '../../art/backdrops';
import {
  type Ctx,
  type R,
  H,
  HY,
  TY,
  VX,
  W,
  calmLanes,
  castShadow,
  crevice,
  creviceV,
  ellPath,
  glowAt,
  gradeAll,
  groundShadow,
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
import { aoHalo, lampOnWall } from '../../art/scene/light';
import { grain, planeQuad, tableFalloff, tableSeam, woodGrain } from '../../art/scene/materials';
import { drift, grime, lay, noiseMask, surface } from '../../art/scene/paint';
import { glassPane, hang } from '../../art/scene/props';
import { makeCanvas, mix, rgba, rng, shade } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { save } from '../../systems/save';
import { Loop, Parts, Spring, Swing, sheet } from '../../game/sceneAnim';
import { type KitLive, calm, registerKitScene, waveK, wander } from '../../game/sceneLive';

// ——— layout ———

export const RK = {
  /** The wall's top, under the roof. */
  roof: 92,
  /** The truss's bottom chord (centre line). */
  chord: 80,
  /** The far barrier's cap, and the foot of its face (where the floor starts). */
  wallFoot: 446,
  floor0: 478,
  /** Our side: the barrier's cap rail, its face. */
  rail: 690,
  face: 704,
  front: 1040,
  ball: { x: 960, y: 184, r: 50 },
  lamps: [180, 700, 1220, 1740] as const,
  /** The high-bay domes' rims. */
  lampY: 128,
  heads: [590, 1330] as const,
  tubes: [310, 830, 1090, 1610] as const,
  marquee: { x: 290, y: 170, w: 420, h: 94 },
  rental: { x0: 92, x1: 488, top: 252, sill: 404 },
  booth: { x0: 1440, x1: 1790, top: 304, win: 384 },
  board: { x: 1615, y: 258, w: 262, h: 56 },
  /** The skaters' lanes (their wheels' line): the near straight and the far one. */
  nearY: 640,
  farY: 528,
};

const P2 = Math.PI * 2;
const INK = '#150c1c';
const BLOCK = '#3a2a5e';
const MAPLE = ['#b4824e', '#a87446', '#bc8c58', '#9c6a40', '#b07c4a'];
/** The fluorescent pigments under blacklight. */
const UV = ['#ff3ad8', '#3af4ff', '#f4ff3a', '#7aff3a', '#ff8a2a'];
/** The same pigments by house light: dyed dark. */
const DYE = ['#8a2a74', '#1e6a7a', '#8a7a20', '#3a7a2a', '#8a4a1e'];

// ——— small helpers ———

type Pt = [number, number];

/** Depth along the rink floor (any unit: it only orders and spaces things). */
const fz = (y: number) => 1 / (y - HY);
const fy = (z: number) => HY + 1 / z;

function stroke(c: Ctx, pts: Pt[], w: number, col: string): void {
  c.strokeStyle = col;
  c.lineWidth = w;
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.stroke();
}

// ——— the roof and the truss ———

function roofDeck(ctx: Ctx): void {
  vfill(ctx, 0, 0, W, RK.roof + 2, [[0, '#050308'], [1, '#100c18']]);
  // the deck's ribs and the purlins carrying it, catching a little of the lamps' light
  for (let x = -10; x < W; x += 46) {
    ctx.fillStyle = 'rgba(70,60,96,0.12)';
    ctx.fillRect(x, 0, 2, RK.roof);
  }
  for (const y of [10, 38, 64]) {
    vfill(ctx, 0, y, W, 6, [[0, 'rgba(90,80,120,0.22)'], [1, 'rgba(0,0,0,0.3)']]);
  }
  for (const lx of RK.lamps) lightPool(ctx, lx, RK.roof - 8, 220, 50, '#ffe6c0', 0.06);
}

/** One steel member: ink, the painted steel, a lit top edge. */
function member(c: Ctx, x0: number, y0: number, x1: number, y1: number, w: number): void {
  c.lineCap = 'butt';
  stroke(c, [[x0, y0], [x1, y1]], w + 2.4, INK);
  stroke(c, [[x0, y0], [x1, y1]], w, '#2e2a3a');
  const nx = (y0 - y1) / (Math.hypot(x1 - x0, y1 - y0) || 1);
  const ny = (x1 - x0) / (Math.hypot(x1 - x0, y1 - y0) || 1);
  const s = ny > 0 ? -1 : 1;
  stroke(c, [[x0 + nx * s * w * 0.3, y0 + ny * s * w * 0.3], [x1 + nx * s * w * 0.3, y1 + ny * s * w * 0.3]], Math.max(1, w * 0.25), '#6e6684');
  c.lineCap = 'round';
}

/** A high-bay lamp hanging from the chord: stem, the spun-aluminium dome, its lens (lit or not). */
function highBay(c: Ctx, x: number, lit: number): void {
  const y = RK.lampY;
  if (lit === 0) {
    member(c, x, RK.chord + 4, x, y - 30, 4);
    const dome = (g: Ctx) => {
      g.beginPath();
      g.moveTo(x - 34, y);
      g.bezierCurveTo(x - 32, y - 18, x - 18, y - 28, x - 7, y - 31);
      g.lineTo(x + 7, y - 31);
      g.bezierCurveTo(x + 18, y - 28, x + 32, y - 18, x + 34, y);
      g.closePath();
    };
    solid(c, dome, { x: x - 34, y: y - 32, w: 68, h: 32 }, 'chrome', '#8a8e9c', { depth: 0.25, formSize: 10 });
    rim(c, dome, 0.35, 2);
    // the ballast housing on top
    solid(c, rrPath(x - 10, y - 42, 20, 12, 3), { x: x - 10, y: y - 42, w: 20, h: 12 }, 'iron', '#3a3844', { depth: 0.25, line: 1.4, formSize: 3 });
    // the lens: a dark ring with the prismatic glass inside
    c.fillStyle = '#1a1620';
    c.beginPath();
    c.ellipse(x, y, 34, 5, 0, 0, P2);
    c.fill();
    c.fillStyle = 'rgba(150,140,170,0.5)';
    c.beginPath();
    c.ellipse(x, y + 0.5, 30, 3.6, 0, 0, P2);
    c.fill();
    return;
  }
  // lit: the lens glowing, its halo, a faint cone of light down through the air
  c.save();
  c.globalCompositeOperation = 'lighter';
  const g = c.createLinearGradient(0, y, 0, y + 280);
  g.addColorStop(0, rgba('#fff0d8', 0.09 * lit));
  g.addColorStop(1, rgba('#fff0d8', 0));
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(x - 30, y);
  c.lineTo(x + 30, y);
  c.lineTo(x + 150, y + 280);
  c.lineTo(x - 150, y + 280);
  c.closePath();
  c.fill();
  c.restore();
  glowAt(c, x, y + 2, 90, '#ffe8c8', 0.32 * lit, 0.45);
  glowAt(c, x, y + 1, 40, '#fff6e8', 0.5 * lit, 0.3);
  const lg = c.createRadialGradient(x - 6, y, 2, x, y + 1, 32);
  lg.addColorStop(0, '#ffffff');
  lg.addColorStop(0.6, '#fff2dc');
  lg.addColorStop(1, '#f0d0a0');
  c.fillStyle = lg;
  c.globalAlpha = lit;
  c.beginPath();
  c.ellipse(x, y + 0.5, 30, 3.8, 0, 0, P2);
  c.fill();
  c.globalAlpha = 1;
}

/** A moving-head spot clamped under the chord, its lens pointing down into the rink. */
function movingHead(c: Ctx, x: number, aim: number): void {
  const y = RK.chord + 8;
  member(c, x - 14, y - 2, x + 14, y - 2, 4);
  // the yoke
  const yoke = polyPath([[x - 15, y], [x + 15, y], [x + 15, y + 22], [x + 11, y + 22], [x + 11, y + 5], [x - 11, y + 5], [x - 11, y + 22], [x - 15, y + 22]]);
  solid(c, yoke, { x: x - 15, y, w: 30, h: 22 }, 'iron', '#2a2834', { depth: 0.25, line: 1.4, formSize: 4 });
  c.save();
  c.translate(x, y + 18);
  c.rotate(aim);
  const head = rrPath(-10, -9, 20, 26, 5);
  solid(c, head, { x: -10, y: -9, w: 20, h: 26 }, 'plastic', '#24222c', { depth: 0.25, line: 1.4, formSize: 5 });
  c.fillStyle = '#0a0810';
  c.beginPath();
  c.ellipse(0, 17, 8, 3, 0, 0, P2);
  c.fill();
  c.fillStyle = 'rgba(160,170,220,0.45)';
  c.beginPath();
  c.ellipse(-1.5, 16.5, 4, 1.4, 0, 0, P2);
  c.fill();
  c.restore();
}

/** A blacklight fixture on the chord: the batten and its dark violet tube (lit, it glows). */
function uvFixture(c: Ctx, x: number, lit: number): void {
  const y = RK.chord + 9;
  const w = 108;
  if (!lit) {
    solid(c, rrPath(x - w / 2, y - 4, w, 8, 2), { x: x - w / 2, y: y - 4, w, h: 8 }, 'iron', '#2c2a34', { depth: 0.25, line: 1.3, formSize: 2 });
    c.fillStyle = '#2a1a44';
    c.fillRect(x - w / 2 + 6, y + 4, w - 12, 5);
    c.fillStyle = 'rgba(160,140,220,0.35)';
    c.fillRect(x - w / 2 + 8, y + 4.6, w - 16, 1.2);
    return;
  }
  c.save();
  c.globalCompositeOperation = 'lighter';
  glowAt(c, x, y + 8, 150, '#7a3aff', 0.35 * lit, 0.35);
  glowAt(c, x, y + 7, 70, '#b07aff', 0.5 * lit, 0.25);
  c.fillStyle = rgba('#e0c8ff', 0.95 * lit);
  c.fillRect(x - w / 2 + 6, y + 4, w - 12, 5);
  c.restore();
}

function truss(ctx: Ctx, r: R): void {
  const top = 20;
  const bot = RK.chord;
  // the web: verticals and diagonals between the chords (behind them)
  const bay = 120;
  for (let x = -bay / 2; x < W + bay; x += bay) {
    member(ctx, x, top, x, bot, 4);
    member(ctx, x, top, x + bay / 2, bot, 3.5);
    member(ctx, x + bay, top, x + bay / 2, bot, 3.5);
  }
  // the chords: two angles back to back, a gusset plate at every node
  for (const y of [top, bot]) {
    vfill(ctx, 0, y - 6, W, 12, [[0, '#6a6280'], [0.2, '#3a3648'], [0.7, '#24202e'], [1, '#100c16']]);
    ctx.fillStyle = INK;
    ctx.fillRect(0, y - 7, W, 1.5);
    ctx.fillRect(0, y + 5.5, W, 1.5);
  }
  for (let x = -bay / 2; x < W + bay; x += bay / 2) {
    for (const y of [top, bot]) {
      ctx.fillStyle = '#34303e';
      ctx.fillRect(x - 7, y - 8, 14, 16);
      ctx.fillStyle = 'rgba(140,130,170,0.25)';
      ctx.fillRect(x - 7, y - 8, 14, 1.4);
      ctx.fillStyle = '#0c0a10';
      for (const dx of [-4, 4]) {
        ctx.beginPath();
        ctx.arc(x + dx, y, 1.2, 0, P2);
        ctx.fill();
      }
    }
  }
  // a conduit run along the bottom chord, cable ties
  ctx.strokeStyle = '#1a1820';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, bot + 9);
  ctx.lineTo(W, bot + 9);
  ctx.stroke();
  for (let x = 30; x < W; x += 90 + r() * 30) {
    ctx.fillStyle = '#3a3644';
    ctx.fillRect(x, bot + 6, 2, 6);
  }
  // the fixtures hung from it
  for (const x of RK.tubes) uvFixture(ctx, x, 0);
  RK.heads.forEach((x, i) => movingHead(ctx, x, i ? 0.35 : -0.35));
  for (const x of RK.lamps) highBay(ctx, x, 0);
  // the ball's motor on its bracket
  const bx = RK.ball.x;
  solid(ctx, rrPath(bx - 14, bot + 4, 28, 14, 3), { x: bx - 14, y: bot + 4, w: 28, h: 14 }, 'iron', '#3a3644', { depth: 0.2, line: 1.5, formSize: 4 });
}

// ——— the far wall ———

const BW = 112;
const BH = 50;

/** Cinder block, painted: each block a cushioned face under the paint, the joints recessed. */
function blocks(ctx: Ctx, r: R, box: { x: number; y: number; w: number; h: number }): void {
  ctx.fillStyle = '#20183a';
  ctx.fillRect(box.x, box.y, box.w, box.h);
  for (let row = 0, y = RK.roof - 4; y < box.y + box.h; row++, y += BH) {
    const off = row % 2 ? BW / 2 : 0;
    for (let x = -BW + off; x < W + BW; x += BW) {
      const c = shade(BLOCK, (r() - 0.5) * 0.08);
      const g = ctx.createLinearGradient(x, y, x + BW * 0.4, y + BH * 1.4);
      g.addColorStop(0, shade(c, 0.1));
      g.addColorStop(0.55, c);
      g.addColorStop(1, shade(c, -0.12));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, BW - 4, BH - 4, 3);
      ctx.fill();
    }
  }
  joints(ctx, box, 1);
  // block is porous under its paint: pits and the texture of the aggregate
  grain(ctx, box, 'cast', 0.32, 1.1);
  grain(ctx, box, 'speckle', 0.2, 1);
}

/** The block joints (recessed: in shadow under each course, a lit lower lip), redrawable over paint. */
function joints(ctx: Ctx, box: { x: number; y: number; w: number; h: number }, a: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  for (let row = 0, y = RK.roof - 4; y < box.y + box.h; row++, y += BH) {
    ctx.fillStyle = rgba('#0c0818', 0.55 * a);
    ctx.fillRect(box.x, y - 1, box.w, 3);
    ctx.fillStyle = rgba('#8a78b8', 0.16 * a);
    ctx.fillRect(box.x, y + 2, box.w, 1);
    const off = row % 2 ? BW / 2 : 0;
    for (let x = -BW + off; x < W + BW; x += BW) {
      ctx.fillStyle = rgba('#0c0818', 0.45 * a);
      ctx.fillRect(x - 1, y, 3, BH);
      ctx.fillStyle = rgba('#8a78b8', 0.12 * a);
      ctx.fillRect(x + 2, y + 2, 1, BH - 3);
    }
  }
  ctx.restore();
}

/** The mural's stripes: five bands sweeping across the wall like a sunset over a hill. */
const muralY = (x: number) => 300 + Math.sin(x / 250 + 0.4) * 24 + Math.sin(x / 90) * 3 - (x - 960) * 0.035;
const BAND = 15;
const MURAL = ['#d8683a', '#e0a23a', '#d84a74', '#9a3a94', '#4e3aa0'];

function muralStripes(ctx: Ctx, uv: boolean): void {
  ctx.save();
  ctx.lineCap = 'butt';
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    for (let x = -20; x <= W + 20; x += 12) {
      const y = muralY(x) + i * BAND;
      if (x === -20) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    if (uv) {
      ctx.strokeStyle = rgba(UV[[4, 2, 0, 1, 3][i]], 0.035);
      ctx.lineWidth = BAND + 10;
      ctx.stroke();
      ctx.strokeStyle = rgba(UV[[4, 2, 0, 1, 3][i]], 0.09);
      ctx.lineWidth = BAND - 4;
      ctx.stroke();
    } else {
      ctx.strokeStyle = MURAL[i];
      ctx.lineWidth = BAND - 1.5;
      ctx.stroke();
    }
  }
  // painted stars over the sweep: four-pointed, like the rink's flyers
  for (const [x, y, s] of [[640, 236, 15], [1300, 230, 12], [1118, 214, 8], [560, 270, 7]] as [number, number, number][]) {
    ctx.fillStyle = uv ? rgba(UV[2], 0.4) : rgba('#f0d070', 0.6);
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.quadraticCurveTo(x, y, x + s * 0.8, y);
    ctx.quadraticCurveTo(x, y, x, y + s);
    ctx.quadraticCurveTo(x, y, x - s * 0.8, y);
    ctx.quadraticCurveTo(x, y, x, y - s);
    ctx.fill();
  }
  ctx.restore();
}

function wall(ctx: Ctx, r: R): void {
  const box = { x: 0, y: RK.roof - 2, w: W, h: RK.wallFoot - RK.roof + 6 };
  blocks(ctx, r, box);
  // the paint over it: a roller's drift, warm where the lamps have faded it, cool down low
  surface(ctx, r, box, BLOCK, { over: true, vary: 0.45, cells: 5, mottle: 0.3, strokes: 0.12, strokeAng: Math.PI / 2, grain: 0.08, warm: '#5e4486', cool: '#161232', seed: 41 });
  // the mural painted over the block, the joints showing through it, its paint thin in places
  ctx.save();
  ctx.globalAlpha = 0.62;
  muralStripes(ctx, false);
  ctx.restore();
  lay(ctx, noiseMask(14, 47, { cover: 0.25, soft: 0.2, col: '#2a1e44' }), { x: 0, y: 240, w: W, h: 160 }, 0.35);
  joints(ctx, box, 0.8);
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  // the light: the key falling from the top left, the roof's shadow along the top, dark down at the barrier
  const key = ctx.createLinearGradient(0, 0, W, RK.wallFoot);
  key.addColorStop(0, 'rgba(255,214,170,0.08)');
  key.addColorStop(0.5, 'rgba(255,214,170,0.0)');
  key.addColorStop(1, 'rgba(8,6,20,0.2)');
  ctx.fillStyle = key;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  vfill(ctx, 0, RK.roof - 2, W, RK.wallFoot - RK.roof + 6, [[0, 'rgba(6,4,14,0.6)'], [0.22, 'rgba(6,4,14,0.12)'], [0.75, 'rgba(6,4,14,0.1)'], [1, 'rgba(6,4,14,0.42)']]);
  // skate scuffs and grime gathered along the wall's foot, over the barrier where hands have pushed off
  grime(ctx, box, { bottom: 60, top: 20, left: 40, right: 40, a: 0.4, patchy: 0.6, seed: 43, col: '#0c0818' });
  ctx.restore();
  crevice(ctx, 0, W, RK.roof - 2, 26, 0.55, '#05030a');
}

// ——— the marquee ———

const MQ = RK.marquee;

/** The marquee's bulb positions round its border. */
function marqueeBulbs(): Pt[] {
  const pts: Pt[] = [];
  const x0 = MQ.x - MQ.w / 2 + 9;
  const x1 = MQ.x + MQ.w / 2 - 9;
  const y0 = MQ.y - MQ.h / 2 + 9;
  const y1 = MQ.y + MQ.h / 2 - 9;
  const step = 23;
  const nx = Math.round((x1 - x0) / step);
  const ny = Math.round((y1 - y0) / step);
  for (let i = 0; i < nx; i++) pts.push([x0 + ((x1 - x0) * i) / nx, y0]);
  for (let i = 0; i < ny; i++) pts.push([x1, y0 + ((y1 - y0) * i) / ny]);
  for (let i = 0; i < nx; i++) pts.push([x1 - ((x1 - x0) * i) / nx, y1]);
  for (let i = 0; i < ny; i++) pts.push([x0, y1 - ((y1 - y0) * i) / ny]);
  return pts;
}
const BULBS = marqueeBulbs();

/** One marquee bulb: a frosted globe in its socket, lit or not. */
function bulbAt(c: Ctx, x: number, y: number, lit: number): void {
  c.fillStyle = '#2a2026';
  c.beginPath();
  c.arc(x, y, 6.4, 0, P2);
  c.fill();
  const g = c.createRadialGradient(x - 1.6, y - 1.8, 0.5, x, y, 5);
  if (lit > 0) {
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.5, '#fff0c0');
    g.addColorStop(1, '#f0b050');
  } else {
    g.addColorStop(0, '#d8d0c8');
    g.addColorStop(0.5, '#8a7a70');
    g.addColorStop(1, '#4a3a34');
  }
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y, 4.8, 0, P2);
  c.fill();
}

function marquee(ctx: Ctx): void {
  const x0 = MQ.x - MQ.w / 2;
  const y0 = MQ.y - MQ.h / 2;
  const board = rrPath(x0, y0, MQ.w, MQ.h, 10);
  // the brackets bolting it to the block, its shadow on the wall
  for (const bx of [x0 + 60, x0 + MQ.w - 60]) {
    solid(ctx, rectPath(bx - 5, y0 - 26, 10, 30), { x: bx - 5, y: y0 - 26, w: 10, h: 30 }, 'iron', '#3a3644', { depth: 0.15, line: 1.5, formSize: 3 });
  }
  castShadow(ctx, board, 14, 16, 0.55, '#06040e');
  solid(ctx, board, { x: x0, y: y0, w: MQ.w, h: MQ.h }, 'enamel', '#9a1e30', { depth: 0.15, formSize: 22 });
  // the cream border the bulbs sit in, and the face inside it
  const inner = rrPath(x0 + 18, y0 + 18, MQ.w - 36, MQ.h - 36, 5);
  solid(ctx, inner, { x: x0 + 18, y: y0 + 18, w: MQ.w - 36, h: MQ.h - 36 }, 'enamel', '#7a1424', { depth: 0.15, line: 1.6, formSize: 8 });
  within(ctx, inner, () => {
    vfill(ctx, x0, y0 + 18, MQ.w, MQ.h - 36, [[0, 'rgba(255,200,160,0.12)'], [1, 'rgba(20,0,10,0.2)']]);
  });
  // the letters: chunky cut-outs, cream enamel, their own shadows on the face
  ctx.save();
  ctx.font = `bold 44px ${ROUND}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const tx = MQ.x;
  const ty = MQ.y + 2;
  ctx.fillStyle = 'rgba(20,0,8,0.55)';
  ctx.fillText('ROLLER RINK', tx + 3, ty + 4);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#3a0a14';
  ctx.lineWidth = 5;
  ctx.strokeText('ROLLER RINK', tx, ty);
  const lg = ctx.createLinearGradient(0, ty - 22, 0, ty + 22);
  lg.addColorStop(0, '#fff8e6');
  lg.addColorStop(0.55, '#f6deb0');
  lg.addColorStop(1, '#c89a6a');
  ctx.fillStyle = lg;
  ctx.fillText('ROLLER RINK', tx, ty);
  ctx.restore();
  for (const [x, y] of BULBS) bulbAt(ctx, x, y, 0);
  rim(ctx, board, 0.3, 3);
}

/** The marquee lit (the still): every bulb on, their halos and their light on the board and the wall. */
function marqueeLit(ctx: Ctx): void {
  for (const [x, y] of BULBS) bulbAt(ctx, x, y, 1);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [x, y] of BULBS) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, 16);
    g.addColorStop(0, 'rgba(255,220,150,0.45)');
    g.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 16, y - 16, 32, 32);
  }
  ctx.restore();
  lightPool(ctx, MQ.x, MQ.y + MQ.h / 2 + 30, 260, 50, '#ffc880', 0.1);
}

// ——— the skate rental ———

const RT = RK.rental;

/** A rental skate seen from the side in its cubby (brown boot, orange wheels), scale s. */
function cubbySkate(c: Ctx, x: number, y: number, s: number, boot: string, wheel: string, flip: boolean): void {
  c.save();
  c.translate(x, y);
  c.scale(flip ? -s : s, s);
  const bootP = polyPath([[-10, -8], [-11, -24], [-5, -28], [5, -28], [6, -18], [14, -15], [17, -8]]);
  solid(c, bootP, { x: -11, y: -28, w: 28, h: 20 }, 'leather', boot, { depth: 0.35, line: 1.2, formSize: 4 });
  c.fillStyle = '#1e1a20';
  c.fillRect(-10, -8, 26, 2.4);
  for (const wx of [-5, 11]) {
    c.fillStyle = wheel;
    c.beginPath();
    c.arc(wx, -3.6, 3.4, 0, P2);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.beginPath();
    c.arc(wx - 0.8, -4.4, 1, 0, P2);
    c.fill();
  }
  c.strokeStyle = 'rgba(250,245,230,0.8)';
  c.lineWidth = 0.9;
  for (let i = 0; i < 3; i++) {
    c.beginPath();
    c.moveTo(-1 + i * 2, -26 + i * 3.4);
    c.lineTo(4 + i * 2, -24 + i * 3.4);
    c.stroke();
  }
  c.restore();
}

function rental(ctx: Ctx, r: R): void {
  const { x0, x1, top, sill } = RT;
  const hatch = rectPath(x0, top, x1 - x0, sill - top);
  // the room behind: warm fluorescent light, a back wall of cubbies full of skates
  within(ctx, hatch, () => {
    vfill(ctx, x0, top, x1 - x0, sill - top, [[0, '#d8b888'], [1, '#8a6a48']]);
    const cw = 44;
    const ch = 34;
    for (let row = 0, y = top + 18; y < sill - 10; row++, y += ch) {
      for (let col = 0, x = x0 + 8; x < x1 - 8; col++, x += cw) {
        // each cubby a dark box with a pair of skates, sizes chalked on the shelf lip
        ctx.fillStyle = '#4a3020';
        ctx.fillRect(x, y, cw - 4, ch - 4);
        vfill(ctx, x, y, cw - 4, ch - 4, [[0, 'rgba(10,4,0,0.55)'], [1, 'rgba(10,4,0,0.1)']]);
        if (r() < 0.82) {
          const bootCol = ['#8a5a32', '#7a4a2a', '#9a6a3a', '#f0ece4'][Math.floor(r() * 4)];
          cubbySkate(ctx, x + 15, y + ch - 5, 0.72, bootCol, '#e8742a', false);
          cubbySkate(ctx, x + 26, y + ch - 6, 0.72, shade(bootCol, -0.12), '#d8642a', false);
        }
        ctx.fillStyle = '#c8a070';
        ctx.fillRect(x - 2, y + ch - 4, cw, 4);
        ctx.fillStyle = 'rgba(255,250,235,0.7)';
        ctx.font = '7px sans-serif';
        ctx.fillText(String(4 + ((row * 9 + col) % 9)), x + 2, y + ch - 0.8);
      }
    }
    // the tube's light on the room, falling off down to the counter
    lightPool(ctx, (x0 + x1) / 2, top + 10, 260, 60, '#fff4d8', 0.25);
    vfill(ctx, x0, top, x1 - x0, 24, [[0, 'rgba(255,250,230,0.35)'], [1, 'rgba(255,250,230,0)']]);
    ctx.fillStyle = 'rgba(30,14,4,0.18)';
    ctx.fillRect(x0, top, x1 - x0, sill - top);
  });
  // the hatch's reveal: block returns in shadow, a steel roller-shutter box over it
  creviceV(ctx, x0, top, sill, 14, 0.5, '#0c0610');
  creviceV(ctx, x1, top, sill, -10, 0.35, '#0c0610');
  crevice(ctx, x0, x1, top, 16, 0.55, '#0c0610');
  const box = rrPath(x0 - 12, top - 26, x1 - x0 + 24, 26, 4);
  castShadow(ctx, box, 8, 10, 0.5, '#06040e');
  solid(ctx, box, { x: x0 - 12, y: top - 26, w: x1 - x0 + 24, h: 26 }, 'iron', '#5a5664', { depth: 0.15, formSize: 8 });
  for (let x = x0; x < x1; x += 6) {
    ctx.fillStyle = 'rgba(20,16,24,0.25)';
    ctx.fillRect(x, top - 22, 1, 18);
  }
  // the counter ledge: worn laminate, a till, a bell, a stack of size tickets
  const ledge = polyPath([[x0 - 16, sill], [x1 + 16, sill], [x1 + 22, sill + 12], [x0 - 22, sill + 12]]);
  castShadow(ctx, ledge, 10, 10, 0.5, '#06040e');
  solid(ctx, ledge, { x: x0 - 22, y: sill, w: x1 - x0 + 44, h: 12 }, 'plastic', '#c86a3a', { depth: 0.15, formSize: 4 });
  solid(ctx, rrPath(x1 - 92, sill - 26, 52, 26, 4), { x: x1 - 92, y: sill - 26, w: 52, h: 26 }, 'iron', '#6a6670', { depth: 0.15, line: 1.4, formSize: 6 });
  ctx.fillStyle = '#1a3a2a';
  ctx.fillRect(x1 - 84, sill - 22, 22, 8);
  ctx.fillStyle = 'rgba(120,255,160,0.6)';
  ctx.fillRect(x1 - 82, sill - 20, 12, 3);
  solid(ctx, ellPath(x0 + 60, sill - 6, 10, 6), { x: x0 + 50, y: sill - 12, w: 20, h: 12 }, 'chrome', '#c0c4cc', { depth: 0.15, line: 1.3, formSize: 3 });
  ctx.fillStyle = '#f0e8d8';
  ctx.fillRect(x0 + 110, sill - 4, 34, 4);
  // its fascia: SKATE RENTAL painted on the shutter box
  ctx.save();
  ctx.font = `bold 16px ${ROUND}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(10,6,12,0.6)';
  ctx.fillText('SKATE  RENTAL', (x0 + x1) / 2 + 1.5, top - 12 + 1.5);
  ctx.fillStyle = '#f4e4b8';
  ctx.fillText('SKATE  RENTAL', (x0 + x1) / 2, top - 12);
  ctx.restore();
  // the room's light spilling out on the block round the hatch and down the ledge
  lightPool(ctx, (x0 + x1) / 2, sill + 10, 280, 40, '#ffd8a0', 0.08);
}

// ——— the DJ booth ———

const BT = RK.booth;
const BD = RK.board;

function speaker(c: Ctx, x: number, y0: number, y1: number): void {
  const w = 62;
  const box = rrPath(x - w / 2, y0, w, y1 - y0, 4);
  castShadow(c, box, 10, 12, 0.5, '#06040e');
  solid(c, box, { x: x - w / 2, y: y0, w, h: y1 - y0 }, 'soot', '#24202a', { depth: 0.15, formSize: 10 });
  const cone = (cy: number, rr: number) => {
    solid(c, ellPath(x, cy, rr, rr), { x: x - rr, y: cy - rr, w: rr * 2, h: rr * 2 }, 'rubber', '#2e2a34', { depth: 0.15, line: 1.4, formSize: rr * 0.6 });
    const g = c.createRadialGradient(x - rr * 0.3, cy - rr * 0.3, 1, x, cy, rr * 0.8);
    g.addColorStop(0, '#5a5664');
    g.addColorStop(1, '#14121a');
    c.fillStyle = g;
    c.beginPath();
    c.arc(x, cy, rr * 0.72, 0, P2);
    c.fill();
    c.fillStyle = '#4a4656';
    c.beginPath();
    c.arc(x, cy, rr * 0.2, 0, P2);
    c.fill();
  };
  cone(y0 + 26, 16);
  cone(y0 + 78, 25);
  // the grille's corner protectors
  c.fillStyle = '#6a6670';
  for (const [cx, cy] of [[x - w / 2 + 3, y0 + 3], [x + w / 2 - 7, y0 + 3]]) c.fillRect(cx, cy, 4, 4);
}

/** The letterboard on the booth's roof: a backlit face with the session spelt in plastic letters. */
function letterboard(c: Ctx, text: string, col: string): void {
  const x0 = BD.x - BD.w / 2;
  const y0 = BD.y - BD.h / 2;
  // the legs on the booth's roof
  for (const lx of [x0 + 34, x0 + BD.w - 34]) {
    solid(c, rectPath(lx - 3, y0 + BD.h, 6, BT.top - y0 - BD.h), { x: lx - 3, y: y0 + BD.h, w: 6, h: BT.top - y0 - BD.h }, 'iron', '#3a3644', { depth: 0.15, line: 1.2, formSize: 2 });
  }
  const box = rrPath(x0, y0, BD.w, BD.h, 5);
  castShadow(c, box, 12, 14, 0.5, '#06040e');
  solid(c, box, { x: x0, y: y0, w: BD.w, h: BD.h }, 'iron', '#2a2832', { depth: 0.15, formSize: 8 });
  const face = rrPath(x0 + 7, y0 + 7, BD.w - 14, BD.h - 14, 3);
  within(c, face, () => {
    vfill(c, x0, y0, BD.w, BD.h, [[0, '#fffaf0'], [1, '#f0e2c4']]);
    // the letter tracks
    for (let y = y0 + 10; y < y0 + BD.h - 6; y += 6) {
      c.fillStyle = 'rgba(120,100,80,0.18)';
      c.fillRect(x0 + 7, y, BD.w - 14, 1);
    }
    c.font = `bold 11px ${ROUND}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = 'rgba(60,40,40,0.7)';
    c.fillText('NOW  SKATING', BD.x, y0 + 15);
    c.font = `bold 21px ${ROUND}`;
    c.fillStyle = col;
    c.fillText(text, BD.x, y0 + BD.h - 19);
  });
  c.strokeStyle = INK;
  c.lineWidth = 1.5;
  face(c);
  c.stroke();
}

/** The DJ at the decks (phase 0…1 of two beats): seen from the front over the console, aviator shades and a
 * moustache, the headphones' cup held to one ear, the other hand scratching the record on the deck, nodding on the
 * beat. `startled` (1, 2): the record skips when the ledge is hit: head up, mouth open, both hands lifted. Painted
 * in the booth's window; the console's front edge (the base's) covers the body's foot. */
const DJ = { x: 1612, y: BT.win - 6, box: { x: 1536, y: 312, w: 156, h: 72 } };
function djFrame(c: Ctx, ph: number, startled = 0): void {
  const x = DJ.x;
  const y = DJ.y;
  const beat = Math.sin(ph * P2 * 2);
  const nod = startled ? -1 : Math.max(0, beat) ** 1.5;
  const scratch = startled ? 0 : Math.sin(ph * P2 * 4) * 7;
  const sy = nod * 1.6;
  // the record on its deck, on the console in front of him
  const rx = x + 34;
  const ry = y - 3;
  c.fillStyle = '#2a2630';
  c.fillRect(rx - 26, ry - 2, 52, 8);
  c.fillStyle = INK;
  c.beginPath();
  c.ellipse(rx, ry - 2, 22, 5, 0, 0, P2);
  c.fill();
  c.fillStyle = '#141018';
  c.beginPath();
  c.ellipse(rx, ry - 2.5, 20, 4.2, 0, 0, P2);
  c.fill();
  c.fillStyle = '#e03a5a';
  c.beginPath();
  c.ellipse(rx + scratch * 0.15, ry - 2.5, 6, 1.4, 0, 0, P2);
  c.fill();
  c.strokeStyle = 'rgba(200,190,230,0.35)';
  c.lineWidth = 0.8;
  c.beginPath();
  c.ellipse(rx, ry - 2.5, 14, 2.9, 0, Math.PI * 1.1, Math.PI * 1.7);
  c.stroke();
  // the shoulders, a satin shirt with a big collar, lit warm from the gooseneck lamp on the left
  c.save();
  c.translate(0, sy);
  const shirt = c.createLinearGradient(x - 34, 0, x + 34, 0);
  shirt.addColorStop(0, '#e0784a');
  shirt.addColorStop(0.45, '#b0402e');
  shirt.addColorStop(1, '#4a1a24');
  poly(c, [[x - 36, y + 4], [x - 34, y - 24], [x - 16, y - 34], [x + 16, y - 34], [x + 34, y - 24], [x + 36, y + 4]], shirt, 2);
  poly(c, [[x - 12, y - 34], [x, y - 22], [x - 4, y - 34]], '#f0c8a0', 1.2);
  poly(c, [[x - 14, y - 34], [x - 3, y - 20], [x - 18, y - 26]], '#e8905a', 1.4);
  poly(c, [[x + 14, y - 34], [x + 3, y - 20], [x + 18, y - 26]], '#8a2a2a', 1.4);
  // the arms: left hand up at the headphone cup, right hand down on the record
  const lsh: Pt = [x - 28, y - 26];
  const rsh: Pt = [x + 28, y - 26];
  const lel: Pt = startled ? [x - 40, y - 20] : [x - 38, y - 10];
  const lhand: Pt = startled ? [x - 30, y - 40] : [x - 20, y - 42];
  const rel: Pt = startled ? [x + 44, y - 18] : [x + 42, y - 8];
  const rhand: Pt = startled ? [x + 46, y - 36] : [x + 32 + scratch, y - 6];
  seg(c, lsh, lel, 10, 8, '#c45434');
  seg(c, lel, lhand, 8, 6, '#a8644a');
  seg(c, rsh, rel, 10, 8, '#7a2a2a');
  seg(c, rel, rhand, 8, 6, '#8a5038');
  for (const h of [lhand, rhand]) {
    c.fillStyle = INK;
    c.beginPath();
    c.arc(h[0], h[1], 4.6, 0, P2);
    c.fill();
    c.fillStyle = '#b0704e';
    c.beginPath();
    c.arc(h[0], h[1], 3.4, 0, P2);
    c.fill();
  }
  c.restore();
  // the head, tipping into the nod (or snapping up)
  c.save();
  c.translate(x, y - 46 + sy * 1.6);
  c.rotate(startled ? -0.08 : 0.06 * nod);
  // big hair behind
  c.fillStyle = INK;
  c.beginPath();
  c.ellipse(0, -6, 17, 15, 0, 0, P2);
  c.fill();
  const hg = c.createRadialGradient(-6, -14, 1, 0, -6, 17);
  hg.addColorStop(0, '#5a3a2a');
  hg.addColorStop(1, '#1e120e');
  c.fillStyle = hg;
  c.beginPath();
  c.ellipse(0, -6, 15.6, 13.6, 0, 0, P2);
  c.fill();
  // the face
  c.fillStyle = INK;
  c.beginPath();
  c.ellipse(0, 2, 10.6, 12.4, 0, 0, P2);
  c.fill();
  const fg = c.createRadialGradient(-4, -2, 1, 0, 2, 12);
  fg.addColorStop(0, '#e0a07a');
  fg.addColorStop(1, '#8a5038');
  c.fillStyle = fg;
  c.beginPath();
  c.ellipse(0, 2, 9.4, 11.2, 0, 0, P2);
  c.fill();
  // aviators (the room's lights in them), brows, the moustache, the mouth
  for (const sx of [-1, 1]) {
    c.fillStyle = '#2a1a24';
    c.beginPath();
    c.ellipse(sx * 4.4, 0, 4, 3.4, 0, 0, P2);
    c.fill();
    c.fillStyle = 'rgba(255,170,220,0.7)';
    c.fillRect(sx * 4.4 - 2, -1.6, 2, 1);
  }
  c.fillStyle = '#c89a3a';
  c.fillRect(-1, -0.6, 2, 1);
  c.strokeStyle = '#2a160e';
  c.lineWidth = 1.4;
  for (const sx of [-1, 1]) {
    c.beginPath();
    c.moveTo(sx * 2, startled ? -7 : -4.5);
    c.lineTo(sx * 8, startled ? -8 : -4.8);
    c.stroke();
  }
  c.fillStyle = '#2a160e';
  c.beginPath();
  c.moveTo(-6, 6.5);
  c.quadraticCurveTo(0, 3.5, 6, 6.5);
  c.quadraticCurveTo(0, 6, -6, 6.5);
  c.fill();
  if (startled) {
    c.fillStyle = '#4a1418';
    c.beginPath();
    c.ellipse(0, 9, 2.4, 2.8, 0, 0, P2);
    c.fill();
  } else {
    c.strokeStyle = '#4a1418';
    c.lineWidth = 1.2;
    c.beginPath();
    c.arc(0, 6.5, 3.4, 0.4, Math.PI - 0.4);
    c.stroke();
  }
  // the headphones: the band over the hair, a cup on each ear (the left one held)
  c.strokeStyle = INK;
  c.lineWidth = 4.4;
  c.beginPath();
  c.arc(0, -2, 15, Math.PI * 1.08, Math.PI * 1.92);
  c.stroke();
  c.strokeStyle = '#4a4656';
  c.lineWidth = 2.4;
  c.stroke();
  for (const sx of [-1, 1]) {
    c.fillStyle = INK;
    c.beginPath();
    c.ellipse(sx * 12.5, 1, 5, 6.6, 0, 0, P2);
    c.fill();
    c.fillStyle = sx < 0 ? '#5a5664' : '#2e2a36';
    c.beginPath();
    c.ellipse(sx * 12.5, 1, 3.8, 5.4, 0, 0, P2);
    c.fill();
    c.fillStyle = 'rgba(255,110,190,0.8)';
    c.fillRect(sx * 12.5 - 1, -1, 2, 2);
  }
  c.restore();
}

function booth(ctx: Ctx, r: R): void {
  const { x0, x1, top, win } = BT;
  // the speakers on their stands either side, the booth between
  speaker(ctx, x0 - 42, 300, RK.wallFoot);
  speaker(ctx, x1 + 46, 300, RK.wallFoot);
  const body = rectPath(x0, top, x1 - x0, RK.wallFoot - top);
  aoHalo(ctx, body, 18, 0.5, '#06040e');
  castShadow(ctx, body, 12, 16, 0.5, '#06040e');
  // the window: the booth's dim interior, a shelf of records behind the DJ
  const winP = rectPath(x0 + 16, top + 12, x1 - x0 - 32, win - top - 12);
  solid(ctx, body, { x: x0, y: top, w: x1 - x0, h: RK.wallFoot - top }, 'wood', '#4a2e2a', { depth: 0.15, formSize: 12 });
  within(ctx, winP, () => {
    vfill(ctx, x0, top, x1 - x0, win - top, [[0, '#140c18'], [1, '#2a1830']]);
    for (let x = x0 + 22; x < x1 - 22; x += 4 + r() * 3) {
      ctx.fillStyle = shade(['#3a2a4a', '#5a3a2a', '#2a3a5a', '#6a2a3a', '#4a4a3a'][Math.floor(r() * 5)], -0.2);
      ctx.fillRect(x, top + 20, 3.2, 24 + r() * 4);
    }
    ctx.fillStyle = '#1a1018';
    ctx.fillRect(x0 + 16, top + 46, x1 - x0 - 32, 3);
    // the gooseneck lamp's warm pool and the console's cool glow from below
    lightPool(ctx, x0 + 60, win - 10, 120, 50, '#ffb870', 0.35);
    lightPool(ctx, DJ.x, win + 4, 140, 30, '#3ae8ff', 0.25);
  });
  // the console's front edge: a steel lip, a row of LED meters
  ctx.fillStyle = '#16121c';
  ctx.fillRect(x0 + 16, win - 6, x1 - x0 - 32, 8);
  // the booth's front below the window: walnut panelling and a carpet kick plate
  within(ctx, body, () => {
    woodGrain(ctx, r, { x: x0, y: win, w: x1 - x0, h: RK.wallFoot - win }, '#5a362a', true, 0.8);
    for (let x = x0 + 44; x < x1; x += 44) {
      ctx.fillStyle = 'rgba(16,6,8,0.5)';
      ctx.fillRect(x, win, 2, RK.wallFoot - win);
    }
    vfill(ctx, x0, win, x1 - x0, 20, [[0, 'rgba(6,2,8,0.55)'], [1, 'rgba(6,2,8,0)']]);
  });
  // the DJ BOOTH sign on its front, the cut-out letters' shadows
  ctx.save();
  ctx.font = `bold 20px ${ROUND}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(8,2,6,0.6)';
  ctx.fillText('D  J', (x0 + x1) / 2 + 2, win + 30 + 2);
  ctx.fillStyle = '#f0c870';
  ctx.fillText('D  J', (x0 + x1) / 2, win + 30);
  ctx.restore();
  // the window frame and its glass (the room's lamps reflected in it)
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  winP(ctx);
  ctx.stroke();
  glassPane(ctx, winP, { x: x0 + 16, y: top + 12, w: x1 - x0 - 32, h: win - top - 12 }, { sheen: 0.18, tint: 'rgba(120,140,200,0.06)' });
  // the roof's lip
  const lip = rectPath(x0 - 8, top - 8, x1 - x0 + 16, 10);
  solid(ctx, lip, { x: x0 - 8, y: top - 8, w: x1 - x0 + 16, h: 10 }, 'wood', '#3a2420', { depth: 0.15, line: 1.6, formSize: 3 });
  letterboard(ctx, 'ALL SKATE', '#d8203a');
}

/** The console's LEDs and the DJ (the still: the live code animates them). */
function djStill(ctx: Ctx): void {
  djFrame(ctx, 0.1);
  meters(ctx, 0.6);
}

/** The console's LED meter (one row of six, lit to level v). */
function meters(c: Ctx, v: number): void {
  for (let k = 0; k < 6; k++) {
    c.fillStyle = k / 6 < v ? (k > 4 ? '#ff4a5a' : k > 3 ? '#ffd040' : '#5aff7a') : 'rgba(40,50,40,0.8)';
    c.fillRect(BT.x1 - 80 + k * 5, BT.win - 6, 4, 3);
  }
}

// ——— the barriers ———

/** The rink's carpet motifs (placed on a jittered grid: planets, stars, squiggles, triangles, dot trios). */
interface Motif {
  k: number;
  x: number;
  y: number;
  s: number;
  rot: number;
  c: number;
}
function motifs(box: { x: number; y: number; w: number; h: number }, cell: number, seed: number, sy = 1): Motif[] {
  const rr = rng(seed);
  const out: Motif[] = [];
  for (let y = box.y + cell * 0.3 * sy; y < box.y + box.h; y += cell * sy)
    for (let x = box.x - cell; x < box.x + box.w + cell; x += cell) out.push({ k: Math.floor(rr() * 5), x: x + (rr() - 0.5) * cell * 0.7, y: y + (rr() - 0.5) * cell * 0.5 * sy, s: cell * (0.22 + rr() * 0.12), rot: rr() * P2, c: Math.floor(rr() * 5) });
  return out;
}
function drawMotif(c: Ctx, m: Motif, col: string, lw: number, sy = 1): void {
  c.save();
  c.translate(m.x, m.y);
  c.scale(1, sy);
  c.rotate(m.rot);
  c.strokeStyle = col;
  c.fillStyle = col;
  c.lineWidth = lw;
  const s = m.s;
  if (m.k === 0) {
    c.beginPath();
    c.arc(0, 0, s * 0.45, 0, P2);
    c.fill();
    c.beginPath();
    c.ellipse(0, 0, s * 0.95, s * 0.28, 0, 0, P2);
    c.stroke();
  } else if (m.k === 1) {
    c.beginPath();
    c.moveTo(0, -s);
    c.quadraticCurveTo(0, 0, s * 0.7, 0);
    c.quadraticCurveTo(0, 0, 0, s);
    c.quadraticCurveTo(0, 0, -s * 0.7, 0);
    c.quadraticCurveTo(0, 0, 0, -s);
    c.fill();
  } else if (m.k === 2) {
    c.beginPath();
    for (let i = 0; i <= 4; i++) c.lineTo(-s + (i * s) / 2, i % 2 ? -s * 0.35 : s * 0.35);
    c.stroke();
  } else if (m.k === 3) {
    c.beginPath();
    c.moveTo(0, -s * 0.7);
    c.lineTo(s * 0.65, s * 0.5);
    c.lineTo(-s * 0.65, s * 0.5);
    c.closePath();
    c.stroke();
  } else {
    for (const [dx, dy] of [[-0.5, 0.2], [0, -0.35], [0.5, 0.2]]) {
      c.beginPath();
      c.arc(dx * s, dy * s, s * 0.17, 0, P2);
      c.fill();
    }
  }
  c.restore();
}

/** Cosmic carpet over a box: black pile, the motifs in dark dyes (uv: only the motifs, fluorescing). */
function carpet(ctx: Ctx, box: { x: number; y: number; w: number; h: number }, cell: number, seed: number, uv: number, sy = 1): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  const ms = motifs(box, cell, seed, sy);
  if (uv) {
    for (const m of ms) drawMotif(ctx, m, rgba(UV[m.c], 0.12 * uv), cell * 0.12, sy);
    for (const m of ms) drawMotif(ctx, m, rgba(UV[m.c], 0.6 * uv), cell * 0.05, sy);
    ctx.restore();
    return;
  }
  ctx.fillStyle = '#140e1c';
  ctx.fillRect(box.x, box.y, box.w, box.h);
  lay(ctx, drift('#2a2036', '#08060e', 6, seed + 1, 200, 40), box, 0.6);
  for (const m of ms) drawMotif(ctx, m, rgba(DYE[m.c], 0.5), cell * 0.055, sy);
  // the pile: fibre texture, flattened and darker along the top where shoulders and hands lean
  grain(ctx, box, 'knit', 0.4, 0.8);
  grain(ctx, box, 'speckle', 0.3, 1);
  ctx.restore();
}

function farBarrier(ctx: Ctx, r: R): void {
  const y0 = RK.wallFoot;
  const y1 = RK.floor0;
  carpet(ctx, { x: 0, y: y0 + 6, w: W, h: y1 - y0 - 6 }, 30, 71, 0, 0.7);
  vfill(ctx, 0, y0 + 6, W, y1 - y0 - 6, [[0, 'rgba(6,4,12,0.55)'], [1, 'rgba(6,4,12,0.2)']]);
  // its cap rail: maple, rounded, catching the lamps along its nose
  vfill(ctx, 0, y0 - 2, W, 10, [[0, '#e0a868'], [0.35, '#b07440'], [1, '#4a2a18']]);
  ctx.fillStyle = INK;
  ctx.fillRect(0, y0 - 3, W, 1.3);
  ctx.fillRect(0, y0 + 7, W, 1.2);
  for (const lx of RK.lamps) {
    const g = ctx.createLinearGradient(lx - 160, 0, lx + 160, 0);
    g.addColorStop(0, 'rgba(255,240,210,0)');
    g.addColorStop(0.5, 'rgba(255,240,210,0.45)');
    g.addColorStop(1, 'rgba(255,240,210,0)');
    ctx.fillStyle = g;
    ctx.fillRect(lx - 160, y0 - 1, 320, 2);
  }
  // the posts holding the cap
  for (let x = 220; x < W; x += 400) {
    solid(ctx, rrPath(x - 4, y0 - 4, 8, y1 - y0 + 2, 2), { x: x - 4, y: y0 - 4, w: 8, h: y1 - y0 + 2 }, 'chrome', '#8a8e9a', { depth: 0.25, line: 1.1, formSize: 2 });
  }
  crevice(ctx, 0, W, y1, 8, 0.6, '#06040c');
  void r;
}

function nearBarrier(ctx: Ctx, r: R): void {
  const y0 = RK.rail;
  const fy0 = RK.face;
  // the floor's last strip in the barrier's shadow
  crevice(ctx, 0, W, y0 + 6, -26, 0.6, '#0a0410');
  // the face: cosmic carpet, its pile lit from above, darker down where it meets the ledge
  carpet(ctx, { x: 0, y: fy0, w: W, h: TY - fy0 }, 54, 77, 0);
  vfill(ctx, 0, fy0, W, TY - fy0, [[0, 'rgba(255,230,200,0.06)'], [0.5, 'rgba(10,4,16,0.12)'], [1, 'rgba(10,4,16,0.5)']]);
  grime(ctx, { x: 0, y: fy0, w: W, h: TY - fy0 }, { bottom: 24, a: 0.4, patchy: 0.6, seed: 79, col: '#06020a' });
  // the cap rail: a rounded maple handrail, varnished, worn pale where hands grip it
  const capH = fy0 - y0;
  vfill(ctx, 0, y0, W, capH + 3, [[0, '#3a2010'], [0.12, '#f0bc7a'], [0.35, '#c88850'], [0.75, '#8a5228'], [1, '#2a1408']]);
  woodGrain(ctx, r, { x: 0, y: y0 + 2, w: W, h: capH - 2 }, '#b47a44', false, 0.25);
  ctx.fillStyle = INK;
  ctx.fillRect(0, y0 - 1, W, 1.6);
  ctx.fillRect(0, fy0 + 2, W, 1.6);
  for (const [x, col, a] of [...RK.lamps.map((x) => [x, '#fff0d8', 0.5] as const), [MQ.x, '#ffd08a', 0.35] as const, [BD.x, '#ff8aa8', 0.25] as const]) {
    const g = ctx.createLinearGradient(x - 200, 0, x + 200, 0);
    g.addColorStop(0, rgba(col, 0));
    g.addColorStop(0.5, rgba(col, a));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - 200, y0 + 2, 400, 3);
  }
  // the posts holding the rail, every so often: steel, bolted through
  for (let x = 120; x < W; x += 400) {
    solid(ctx, rrPath(x - 6, y0 - 4, 12, capH + 8, 3), { x: x - 6, y: y0 - 4, w: 12, h: capH + 8 }, 'chrome', '#9aa0ac', { depth: 0.05, line: 1.4, formSize: 3 });
  }
  crevice(ctx, 0, W, fy0 + 3, 12, 0.45, '#06020a');
  crevice(ctx, 0, W, TY, -14, 0.5, '#06020a');
}

// ——— the rink floor ———

function floor(ctx: Ctx, r: R): void {
  const y0 = RK.floor0;
  const y1 = RK.face;
  const box = { x: 0, y: y0, w: W, h: y1 - y0 };
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  // maple strip in rows across the rink, narrower with distance; each board its own colour, joints staggered
  const z0 = fz(y0);
  const z1 = fz(y1 + 4);
  const rows = 64;
  for (let i = 0; i < rows; i++) {
    const za = z0 + ((z1 - z0) * i) / rows;
    const zb = z0 + ((z1 - z0) * (i + 1)) / rows;
    const ya = fy(za);
    const yb = fy(zb);
    const k = ya - HY;
    let X = -1100 / k - r() * 0.5;
    while (X < 1100 / k) {
      const len = 0.25 + r() * 0.55;
      const xa = VX + X * k;
      const xb = VX + (X + len) * k;
      ctx.fillStyle = shade(MAPLE[Math.floor(r() * MAPLE.length)], (r() - 0.5) * 0.08);
      ctx.fillRect(xa, ya, xb - xa + 0.6, yb - ya + 0.6);
      // the butt joint
      ctx.fillStyle = 'rgba(40,16,4,0.3)';
      ctx.fillRect(xb - 0.5, ya, 1, yb - ya);
      X += len;
    }
    ctx.fillStyle = 'rgba(46,18,6,0.28)';
    ctx.fillRect(0, yb - 0.4, W, Math.max(0.6, (yb - ya) * 0.12));
  }
  grain(ctx, box, 'wood', 0.25, 1.3);
  lay(ctx, drift('#e8b070', '#5a2a18', 7, 81, 256, 40), box, 0.25);
  // the finish: years of skating have dulled a wide lane round the rink, the middle and the edges kept glossy
  lay(ctx, noiseMask(12, 83, { cover: 0.3, soft: 0.2, col: '#3a1e10', w: 320, h: 40 }), box, 0.2);
  // the painted centre circle and the line across it, worn by wheels
  ctx.strokeStyle = 'rgba(240,80,120,0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(VX, 594, 260, 46, 0, 0, P2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(80,200,240,0.25)';
  ctx.beginPath();
  ctx.ellipse(VX, 594, 286, 52, 0, 0, P2);
  ctx.stroke();
  // the gloss: the far wall mirrored in the varnish, softened (painted small and drawn up)
  const m = ctx.getTransform();
  if (m.a === 1 && m.d === 1 && m.b === 0 && m.c === 0 && m.e === 0 && m.f === 0) {
    const src = ctx.canvas;
    const hh = 220;
    const [cv, g] = makeCanvas(W / 8, hh / 6);
    g.imageSmoothingEnabled = true;
    g.translate(0, hh / 6);
    g.scale(1, -1);
    g.drawImage(src, 0, y0 - hh, W, hh, 0, 0, W / 8, hh / 6);
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(cv, 0, y0, W, hh * 0.72);
    ctx.restore();
  }
  // the lights mirrored in it: soft streaks hanging under each
  const refl: [number, string, number, number][] = [
    ...RK.lamps.map((x) => [x, '#fff0d8', 0.22, 60] as [number, string, number, number]),
    [MQ.x, '#ffc070', 0.18, 140],
    [(RT.x0 + RT.x1) / 2, '#ffd8a0', 0.14, 120],
    [BD.x, '#fff0e0', 0.12, 80],
    [RK.ball.x, '#d8c8ff', 0.12, 40],
  ];
  ctx.globalCompositeOperation = 'screen';
  for (const [x, col, a, w] of refl) {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, rgba(col, a));
    g.addColorStop(0.5, rgba(col, a * 0.35));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - w * 0.4, y0);
    ctx.lineTo(x + w * 0.4, y0);
    ctx.lineTo(x + w * 0.7, y1);
    ctx.lineTo(x - w * 0.7, y1);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  // the light: the far edge grazing (bright, mirror-like), the near rows darker in the barrier's shadow
  vfill(ctx, 0, y0, W, y1 - y0, [[0, 'rgba(255,230,200,0.06)'], [0.2, 'rgba(30,12,30,0.18)'], [1, 'rgba(20,8,24,0.45)']]);
  ctx.restore();
}

// ——— the house lights' pools (lit by the high-bays, faded out as the lights go down) ———

function pools(ctx: Ctx): void {
  for (const x of RK.lamps) {
    lampOnWall(ctx, x, RK.lampY + 6, 30, { col: '#ffe6c4', a: 0.3, reach: 300, spread: 240, gap: 140, above: 0, op: 'lighter' });
    lightPool(ctx, x, 580, 300, 60, '#ffe8c8', 0.12);
  }
  lightPool(ctx, VX, 560, 700, 90, '#ffe0c0', 0.05);
}

// ——— the ledge (the table) ———

/** The glitter flecks in the laminate (shared by its look by house light and under blacklight). */
function flecks(): { X: number; z: number; c: number; s: number }[] {
  const rr = rng(97);
  const zf = zAt(RK.front + 4);
  const out: { X: number; z: number; c: number; s: number }[] = [];
  for (let i = 0; i < 1500; i++) out.push({ X: (rr() - 0.5) * 5.6, z: zf + rr() * (ZB - zf), c: Math.floor(rr() * 5), s: 0.6 + rr() * 1.2 });
  return out;
}
const FLECKS = flecks();
const FLECK = ['#e8e8f8', '#ffd870', '#ff8ad0', '#8af0ff', '#c8a8ff'];

function counter(ctx: Ctx, r: R): void {
  const front = RK.front;
  const box = { x: 0, y: TY, w: W, h: front - TY + 4 };
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  vfill(ctx, 0, TY, W, front - TY, [[0, '#1c1430'], [1, '#2e2448']]);
  lay(ctx, drift('#4a3a6e', '#0e0a1a', 6, 91, 256, 48), box, 0.3);
  // the glitter: tiny flakes in the clear coat, each catching the light at its own angle
  for (const f of FLECKS) {
    const sx = xAt(f.X, f.z);
    const sy = yAt(f.z);
    const s = (1210 / f.z / 460) * f.s;
    const bright = r() < 0.12;
    ctx.fillStyle = rgba(FLECK[f.c], bright ? 0.9 : 0.35);
    ctx.fillRect(sx, sy, 1.6 * s, 1.1 * s);
    if (bright) {
      ctx.fillStyle = rgba('#ffffff', 0.25);
      ctx.fillRect(sx - 2 * s, sy + 0.4 * s, 5.6 * s, 0.4);
    }
  }
  grain(ctx, box, 'speckle', 0.12, 1);
  // the gloss: the lamps, the marquee and the letterboard mirrored in the clear coat, running towards us
  const zf = zAt(front + 4);
  for (const [x, col, a] of [...RK.lamps.map((x) => [x, '#fff4e0', 0.12] as const), [MQ.x, '#ffc070', 0.1] as const, [BD.x, '#ffffff', 0.07] as const]) {
    ctx.save();
    ctx.beginPath();
    planeQuad(ctx, (x - 960) / 460 - 0.2, (x - 960) / 460 + 0.2, ZB, zf);
    const g = ctx.createLinearGradient(0, TY, 0, front);
    g.addColorStop(0, rgba(col, a));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  }
  // wipe marks in the coat, rings where cups have stood
  for (let i = 0; i < 6; i++) {
    ctx.strokeStyle = rgba('#ffffff', 0.03);
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.ellipse(220 + r() * 1480, 850 + r() * 120, 170, 36, 0, 0.3, 2.7);
    ctx.stroke();
  }
  for (const [x, y] of [[1460, 820], [430, 870], [1720, 940]] as Pt[]) {
    ctx.strokeStyle = 'rgba(200,190,230,0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, 26, 7, 0, 0, P2);
    ctx.stroke();
  }
  ctx.restore();
  tableFalloff(ctx, front, 0.45, '#08040e');
  tableSeam(ctx, 0.55, '#0a0610', false);
  // the chrome nosing, then the carpet down the ledge's front
  vfill(ctx, 0, front - 2, W, 14, [[0, '#ffffff'], [0.2, '#c8ccd8'], [0.5, '#5a5e6a'], [0.75, '#2a2c34'], [1, '#8a8e9a']]);
  for (const x of RK.lamps) {
    const g = ctx.createLinearGradient(x - 150, 0, x + 150, 0);
    g.addColorStop(0, 'rgba(255,245,230,0)');
    g.addColorStop(0.5, 'rgba(255,245,230,0.5)');
    g.addColorStop(1, 'rgba(255,245,230,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 150, front, 300, 3);
  }
  ctx.fillStyle = INK;
  ctx.fillRect(0, front + 12, W, 1.5);
  carpet(ctx, { x: 0, y: front + 13, w: W, h: H - front - 13 }, 60, 99, 0);
  vfill(ctx, 0, front + 13, W, H - front - 13, [[0, 'rgba(6,2,10,0.55)'], [1, 'rgba(6,2,10,0.2)']]);
}

// ——— the props on the ledge ———

/** Tokens: a short stack and a few loose, brass, the rink's star stamped in them. */
const TOK = { x: 196, y: 836 };
function token(c: Ctx, x: number, y: number, s: number, tilt = 0.32): void {
  c.save();
  c.translate(x, y);
  // the edge (milled), then the face
  c.fillStyle = '#6a4a14';
  c.beginPath();
  c.ellipse(0, 2.2 * s, 9 * s, 9 * s * tilt, 0, 0, P2);
  c.fill();
  const g = c.createLinearGradient(-9 * s, -3 * s, 9 * s, 3 * s);
  g.addColorStop(0, '#fff0a8');
  g.addColorStop(0.4, '#d8a840');
  g.addColorStop(1, '#8a6018');
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(0, 0, 9 * s, 9 * s * tilt, 0, 0, P2);
  c.fill();
  c.strokeStyle = 'rgba(90,60,10,0.7)';
  c.lineWidth = 0.8;
  c.beginPath();
  c.ellipse(0, 0, 6.4 * s, 6.4 * s * tilt, 0, 0, P2);
  c.stroke();
  c.strokeStyle = INK;
  c.lineWidth = 1;
  c.beginPath();
  c.ellipse(0, 1.1 * s, 9 * s, 9 * s * tilt + 1.1 * s, 0, 0, P2);
  c.stroke();
  c.restore();
}

function tokens(ctx: Ctx): void {
  const { x, y } = TOK;
  groundShadow(ctx, x + 6, y + 4, 34, 7, 0.55, '#05020a');
  // the stack
  for (let i = 0; i < 6; i++) token(ctx, x + (i % 2) * 0.8, y - i * 3.2, 1.05);
  // loose ones round it, one leaning on the stack
  for (const [dx, dy, t] of [[-30, 8, 0.3], [24, 10, 0.32], [40, 2, 0.3]] as [number, number, number][]) {
    groundShadow(ctx, x + dx + 2, y + dy + 2, 10, 3, 0.4, '#05020a');
    token(ctx, x + dx, y + dy, 0.95, t);
  }
  // their gleam
  glowAt(ctx, x - 4, y - 18, 22, '#fff0b0', 0.25);
}

/** A soda: a waxed paper cup in the rink's stripes, its lid, the straw. */
const CUP = { x: 92, y: 830 };
function cup(ctx: Ctx): void {
  const { x, y } = CUP;
  const h = 74;
  groundShadow(ctx, x + 10, y + 2, 34, 8, 0.55, '#05020a');
  const body = (g: Ctx) => {
    g.beginPath();
    g.moveTo(x - 18, y);
    g.lineTo(x - 24, y - h);
    g.lineTo(x + 24, y - h);
    g.lineTo(x + 18, y);
    g.quadraticCurveTo(x, y + 5, x - 18, y);
    g.closePath();
  };
  solid(ctx, body, { x: x - 24, y: y - h, w: 48, h: h + 5 }, 'canvas', '#f2ece4', { depth: 0.05, formSize: 12, texA: 0.12 });
  within(ctx, body, () => {
    for (const [yy, col] of [[y - 52, '#d8203a'], [y - 38, '#f0a020'], [y - 24, '#1aa8c8']] as [number, string][]) {
      ctx.fillStyle = col;
      ctx.fillRect(x - 30, yy, 60, 8);
    }
    const g = ctx.createLinearGradient(x - 24, 0, x + 24, 0);
    g.addColorStop(0, 'rgba(255,250,240,0.25)');
    g.addColorStop(0.35, 'rgba(255,250,240,0)');
    g.addColorStop(1, 'rgba(20,10,30,0.35)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 30, y - h, 60, h + 6);
  });
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8;
  body(ctx);
  ctx.stroke();
  // the lid and the straw
  solid(ctx, ellPath(x, y - h, 26, 6), { x: x - 26, y: y - h - 6, w: 52, h: 12 }, 'plastic', '#e8e4ee', { depth: 0.05, line: 1.5, formSize: 4 });
  const straw = polyPath([[x + 2, y - h - 2], [x + 8, y - h - 2], [x + 22, y - h - 52], [x + 16, y - h - 54]]);
  solid(ctx, straw, { x: x + 2, y: y - h - 54, w: 20, h: 52 }, 'plastic', '#ff5a9a', { depth: 0.05, line: 1.3, formSize: 3 });
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 6, y - h - 10);
  ctx.lineTo(x + 17, y - h - 48);
  ctx.stroke();
  // condensation beads on the cup
  for (let i = 0; i < 14; i++) {
    const bx = x - 16 + ((i * 37) % 32);
    const by = y - 10 - ((i * 23) % 56);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.arc(bx, by, 1, 0, P2);
    ctx.fill();
  }
}

/** The rental skate on the ledge, standing on its wheels (its own sprite: it rolls when the ledge is hit). */
const SKT = { x: 1760, y: 846 };
const SKATE_BOX = { x: SKT.x - 82, y: SKT.y - 104, w: 176, h: 122 };
function skateProp(ctx: Ctx): void {
  const { x, y } = SKT;
  groundShadow(ctx, x + 12, y + 2, 66, 9, 0.6, '#05020a');
  ctx.save();
  ctx.translate(x, y);
  // the boot: white leather, a high collar, toe cap, laced up the front (toe to the left)
  const boot = (g: Ctx) => {
    g.beginPath();
    g.moveTo(-58, -24);
    g.quadraticCurveTo(-64, -40, -48, -50);
    g.lineTo(-18, -60);
    g.lineTo(-10, -90);
    g.quadraticCurveTo(10, -96, 28, -90);
    g.lineTo(34, -60);
    g.quadraticCurveTo(40, -40, 34, -24);
    g.closePath();
  };
  solid(ctx, boot, { x: -64, y: -96, w: 104, h: 72 }, 'leather', '#f2eee6', { depth: 0.05, formSize: 22, texA: 0.25 });
  within(ctx, boot, () => {
    // the toe cap's seam, the heel counter, the collar's padding
    ctx.strokeStyle = 'rgba(120,100,90,0.6)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-40, -24);
    ctx.quadraticCurveTo(-44, -44, -30, -52);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(18, -24);
    ctx.quadraticCurveTo(22, -50, 30, -62);
    ctx.stroke();
    vfill(ctx, -20, -96, 60, 12, [[0, 'rgba(40,30,40,0.0)'], [1, 'rgba(40,30,40,0.2)']]);
  });
  // the laces: pink, criss-crossing up the throat, a bow at the top
  ctx.strokeStyle = '#ff5aa0';
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const t = i / 6;
    const ax = -30 + t * 18;
    const ay = -50 - t * 36;
    ctx.beginPath();
    ctx.moveTo(ax - 5, ay + 2);
    ctx.lineTo(ax + 7, ay - 4);
    ctx.moveTo(ax - 5, ay - 4);
    ctx.lineTo(ax + 7, ay + 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(-12, -92, 7, 4, -0.4, 0, P2);
  ctx.moveTo(-6, -92);
  ctx.ellipse(1, -94, 7, 4, 0.4, 0, P2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-6, -92);
  ctx.quadraticCurveTo(-14, -80, -10, -72);
  ctx.stroke();
  // the plate and trucks, the toe stop, four wheels (two seen)
  solid(ctx, rrPath(-60, -26, 98, 8, 3), { x: -60, y: -26, w: 98, h: 8 }, 'chrome', '#9aa0ac', { depth: 0.05, line: 1.4, formSize: 3 });
  for (const tx of [-38, 18]) solid(ctx, polyPath([[tx - 8, -18], [tx + 8, -18], [tx + 4, -12], [tx - 4, -12]]), { x: tx - 8, y: -18, w: 16, h: 6 }, 'chrome', '#7a808c', { depth: 0.05, line: 1.2, formSize: 2 });
  solid(ctx, rrPath(-72, -22, 16, 14, 5), { x: -72, y: -22, w: 16, h: 14 }, 'rubber', '#3a3036', { depth: 0.05, line: 1.4, formSize: 4 });
  for (const wx of [-38, 18]) {
    solid(ctx, ellPath(wx, -9, 10, 10), { x: wx - 10, y: -19, w: 20, h: 20 }, 'plastic', '#ff4a8a', { depth: 0.05, line: 1.6, formSize: 6 });
    ctx.fillStyle = '#d8dce4';
    ctx.beginPath();
    ctx.arc(wx, -9, 3.6, 0, P2);
    ctx.fill();
    ctx.fillStyle = '#5a5e68';
    ctx.beginPath();
    ctx.arc(wx, -9, 1.4, 0, P2);
    ctx.fill();
  }
  ctx.restore();
  rim(ctx, (g) => {
    g.save();
    g.translate(x, y);
    boot(g);
    g.restore();
  }, 0.25, 3);
}

// ——— the mirror ball ———

const BALL = RK.ball;
/** Columns of facets round the ball: one turn of the loop moves it by one column, so the loop is seamless. */
const BCOLS = 22;
const BROWS = 16;
const BALL_F = Math.ceil(BALL.r * 2 + 8);

/** What a facet whose reflection leaves in direction (rx, ry) sees (screen axes, y down): the black roof and the
 * high-bay lamps above, the purple walls with the marquee, the booth's pink and the signs round the middle, the
 * maple below. A fixed room, so the facets pick it up as they turn past (and the loop stays seamless). */
function mirrored(rx: number, ry: number): string {
  const n = Math.sin(rx * 41 + ry * 27) * Math.sin(rx * 23 - ry * 47 + 1.3);
  let col = ry < -0.3 ? '#22203a' : ry > 0.25 ? '#5e4a40' : '#3e3664';
  col = shade(col, n * 0.45);
  if (n > 0.78) col = '#cac4ea';
  const lights: [number, number, string, number][] = [
    [-0.75, -0.62, '#fff2dc', 0.09],
    [-0.25, -0.7, '#fff2dc', 0.09],
    [0.25, -0.7, '#fff2dc', 0.09],
    [0.75, -0.62, '#fff2dc', 0.09],
    [-0.85, -0.15, '#ffc870', 0.1],
    [0.8, 0.0, '#ff6ab8', 0.1],
    [0.45, -0.05, '#5ae8ff', 0.06],
    [-0.4, 0.05, '#e86a3a', 0.07],
  ];
  for (const [lx, ly, lc, r] of lights) {
    const d = Math.hypot(rx - lx, ry - ly);
    if (d < r) col = mix(col, lc, Math.min(1, (1 - d / r) * 1.6));
  }
  return col;
}

/** One frame of the mirror ball turning (phase 0…1 = one column of facets), centred in a BALL_F square. Each
 * facet a little mirror: the dark roof above, the walls' colours round the middle, the warm floor below, the key
 * light's hot spot where a facet faces between it and us. */
function ballFrame(c: Ctx, ph: number): void {
  const cx = BALL_F / 2;
  const cy = BALL_F / 2;
  const R0 = BALL.r;
  // the ball's body: dark glass between the facets
  const bg = c.createRadialGradient(cx - R0 * 0.3, cy - R0 * 0.35, 2, cx, cy, R0);
  bg.addColorStop(0, '#5a5470');
  bg.addColorStop(1, '#141020');
  c.fillStyle = bg;
  c.beginPath();
  c.arc(cx, cy, R0, 0, P2);
  c.fill();
  const L = [-0.5, -0.62, 0.6];
  const ll = Math.hypot(...L);
  const hx = L[0] / ll;
  const hy = L[1] / ll;
  const hz = L[2] / ll + 1;
  const hl = Math.hypot(hx, hy, hz);
  const dl = Math.PI / BCOLS;
  for (let j = 0; j < BROWS; j++) {
    const p0 = -Math.PI / 2 + (j / BROWS) * Math.PI;
    const p1 = -Math.PI / 2 + ((j + 1) / BROWS) * Math.PI;
    const pm = (p0 + p1) / 2;
    for (let i = -1; i < BCOLS * 2 + 1; i++) {
      const l0 = -Math.PI + (i + ph) * dl * 1;
      const l1 = l0 + dl;
      const lm = (l0 + l1) / 2;
      if (Math.cos(lm) < -0.05) continue;
      const pt = (la: number, pa: number): Pt => [cx + R0 * Math.cos(pa) * Math.sin(Math.max(-Math.PI / 2, Math.min(Math.PI / 2, la))), cy + R0 * Math.sin(pa)];
      const q = [pt(l0, p0), pt(l1, p0), pt(l1, p1), pt(l0, p1)];
      // the facet's normal and what it mirrors
      const nx = Math.cos(pm) * Math.sin(lm);
      const ny = Math.sin(pm);
      const nz = Math.cos(pm) * Math.cos(lm);
      const col0 = mirrored(2 * nz * nx, 2 * nz * ny);
      const spec = Math.max(0, (nx * hx + ny * hy + nz * hz) / hl) ** 60;
      let col = col0;
      const edge = Math.max(0.25, nz);
      col = mix(col, '#ffffff', Math.min(1, spec * 1.4));
      col = mix(col, '#0a0814', (1 - edge) * 0.55);
      c.fillStyle = col;
      c.beginPath();
      const sh = 0.6;
      const mx = (q[0][0] + q[2][0]) / 2;
      const my = (q[0][1] + q[2][1]) / 2;
      for (let k = 0; k < 4; k++) {
        const px = mx + (q[k][0] - mx) * (1 - sh / Math.max(2, Math.abs(q[1][0] - q[0][0]) + 2));
        const py = my + (q[k][1] - my) * 0.86;
        if (k === 0) c.moveTo(px, py);
        else c.lineTo(px, py);
      }
      c.closePath();
      c.fill();
    }
  }
  // the limb darkening and a rim of the room's cool light, the outline
  const lg = c.createRadialGradient(cx - R0 * 0.2, cy - R0 * 0.25, R0 * 0.5, cx, cy, R0 * 1.02);
  lg.addColorStop(0, 'rgba(0,0,0,0)');
  lg.addColorStop(0.8, 'rgba(10,6,20,0.15)');
  lg.addColorStop(1, 'rgba(10,6,20,0.6)');
  c.fillStyle = lg;
  c.beginPath();
  c.arc(cx, cy, R0, 0, P2);
  c.fill();
  c.strokeStyle = INK;
  c.lineWidth = 2;
  c.beginPath();
  c.arc(cx, cy, R0, 0, P2);
  c.stroke();
  c.strokeStyle = 'rgba(150,170,255,0.35)';
  c.lineWidth = 2;
  c.beginPath();
  c.arc(cx, cy, R0 - 2, -0.2, 1.4);
  c.stroke();
}

/** The ball's chain from the motor's spindle down to its cap. */
function ballChain(c: Ctx, x: number, y0: number, y1: number): void {
  hang(c, x, y0, x, y1, 0, '#9a98a8', 2.2, true);
  solid(c, rrPath(x - 7, y1 - 2, 14, 8, 3), { x: x - 7, y: y1 - 2, w: 14, h: 8 }, 'chrome', '#a8acb8', { depth: 0.2, line: 1.3, formSize: 3 });
}

function ballStill(ctx: Ctx): void {
  ballChain(ctx, BALL.x, RK.chord + 18, BALL.y - BALL.r - 4);
  const [cv, g] = makeCanvas(BALL_F, BALL_F);
  ballFrame(g, 0);
  ctx.drawImage(cv, BALL.x - BALL_F / 2, BALL.y - BALL_F / 2);
  // its glints
  for (const [dx, dy, s] of [[-18, -20, 16], [14, 12, 10], [-6, 26, 8]] as [number, number, number][]) {
    glowAt(ctx, BALL.x + dx, BALL.y + dy, s * 1.6, '#ffffff', 0.4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(BALL.x + dx - 0.8, BALL.y + dy - s * 0.5, 1.6, s);
    ctx.fillRect(BALL.x + dx - s * 0.5, BALL.y + dy - 0.8, s, 1.6);
  }
  glowAt(ctx, BALL.x, BALL.y, 140, '#c8b8ff', 0.12);
}

// ——— blacklight (live only) ———

function uvLayer(ctx: Ctx): void {
  // the tubes themselves and their violet on the truss
  for (const x of RK.tubes) uvFixture(ctx, x, 1);
  // the mural, the carpets and the glitter fluorescing
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, RK.roof, W, RK.wallFoot - RK.roof);
  ctx.clip();
  muralStripes(ctx, true);
  ctx.restore();
  carpet(ctx, { x: 0, y: RK.wallFoot + 6, w: W, h: RK.floor0 - RK.wallFoot - 6 }, 30, 71, 0.6, 0.7);
  carpet(ctx, { x: 0, y: RK.face, w: W, h: TY - RK.face + 2 }, 54, 77, 0.38);
  carpet(ctx, { x: 0, y: RK.front + 13, w: W, h: H - RK.front - 13 }, 60, 99, 0.45);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, RK.front - TY);
  ctx.clip();
  for (const f of FLECKS) {
    if (f.c === 0) continue;
    const s = (1210 / f.z / 460) * f.s;
    ctx.fillStyle = rgba(UV[f.c - 1], 0.28);
    ctx.fillRect(xAt(f.X, f.z), yAt(f.z), 2 * s, 1.4 * s);
  }
  ctx.restore();
  // the white things glow blue-white: the skate's laces and boot, the letterboard's face, the cup
  glowAt(ctx, SKT.x - 10, SKT.y - 56, 70, '#9a8aff', 0.25);
  glowAt(ctx, CUP.x, CUP.y - 40, 50, '#9a8aff', 0.2);
  glowAt(ctx, BD.x, BD.y, 140, '#9a8aff', 0.25, 0.4);
}

// ——— the letterboard's sessions (live only) ———

const SESSIONS: [string, string][] = [
  ['ALL SKATE', '#d8203a'],
  ['SPEED SKATE', '#1a5ad8'],
  ['COUPLES SKATE', '#d8207a'],
  ['LAST SKATE', '#7a2ad8'],
];
const BOARD_BOX = { x: BD.x - BD.w / 2 - 20, y: BD.y - BD.h / 2 - 6, w: BD.w + 44, h: BD.h + 26 };

// ——— finishing ———

function grade(ctx: Ctx): void {
  gradeAll(ctx, 0.03, '#c8a8ff', 0.05, { warm: '#ffc27a', cool: '#5a5ad0', a: 0.22 });
}

function shadeOver(ctx: Ctx): void {
  calmLanes(ctx, 0.14, '#0c0818', 90, 650);
  vignetteAll(ctx, 0.55, '#05030a');
}

// ——— the stack ———

const MQ_BOX = { x: MQ.x - MQ.w / 2 - 24, y: MQ.y - MQ.h / 2 - 34, w: MQ.w + 60, h: MQ.h + 76 };
const RENTAL_BOX = { x: RT.x0 - 40, y: RT.top - 40, w: RT.x1 - RT.x0 + 90, h: RK.wallFoot - RT.top + 48 };
const BOOTH_BOX = { x: BT.x0 - 90, y: BD.y - BD.h / 2 - 8, w: BT.x1 - BT.x0 + 200, h: RK.wallFoot - BD.y + BD.h / 2 + 16 };
const BALL_BOX = { x: BALL.x - 80, y: RK.chord + 8, w: 160, h: BALL.y + BALL.r + 70 - RK.chord - 8 };
const RINK_SLOT = { x: 0, y: 380, w: W, h: RK.rail + 2 - 380 };

export const RINK: SceneSpec = {
  id: 'rink',
  info: {
    name: 'Roller Rink',
    subtitle: 'Waves 46–49',
    ambient: [],
    glows: [
      { x: BALL.x, y: BALL.y, r: 200, color: '#c8a8ff', flicker: 0.2 },
      { x: MQ.x, y: MQ.y, r: 260, color: '#ffc070', flicker: 0.2 },
      { x: BD.x, y: BD.y, r: 160, color: '#ff4a8a', flicker: 0.2 },
    ],
    light: '#e0c0ff',
    tableTint: '#f2ecff',
  },
  layers: [
    { id: 'roof', box: { x: 0, y: 0, w: W, h: RK.roof + 4 }, draw: (c) => roofDeck(c) },
    { id: 'wall', box: { x: 0, y: RK.roof - 4, w: W, h: RK.wallFoot - RK.roof + 12 }, draw: wall },
    { id: 'truss', box: { x: 0, y: 0, w: W, h: RK.lampY + 12 }, draw: truss },
    { id: 'marquee', box: MQ_BOX, draw: (c) => marquee(c) },
    { id: 'marqueeLit', box: MQ_BOX, stillOnly: true, draw: (c) => marqueeLit(c) },
    { id: 'rental', box: RENTAL_BOX, draw: rental },
    { id: 'booth', box: BOOTH_BOX, draw: booth },
    ...SESSIONS.slice(1).map(([t, col], i) => ({ id: `board${i + 2}`, box: BOARD_BOX, liveOnly: true, draw: (c: Ctx) => letterboard(c, t, col) })),
    { id: 'dj', box: DJ.box, stillOnly: true, draw: (c) => djStill(c) },
    { id: 'farBarrier', box: { x: 0, y: RK.wallFoot - 6, w: W, h: RK.floor0 - RK.wallFoot + 16 }, draw: farBarrier },
    { id: 'floor', box: { x: 0, y: RK.floor0, w: W, h: RK.face - RK.floor0 + 2 }, draw: floor },
    { id: 'pools', box: { x: 0, y: RK.roof, w: W, h: RK.face - RK.roof }, liveOnly: true, res: 0.33, draw: (c) => pools(c) },
    { id: 'poolsStill', box: { x: 0, y: RK.roof, w: W, h: RK.face - RK.roof }, stillOnly: true, draw: (c) => pools(c) },
    { id: 'lampsLit', box: { x: 0, y: RK.chord, w: W, h: 340 }, stillOnly: true, draw: (c) => RK.lamps.forEach((x) => highBay(c, x, 1)) },
    // the skaters, their shadows and reflections, the fog rolling over the floor, the spots on the maple
    { id: 'rink', box: RINK_SLOT, motion: 'slot', draw: () => {} },
    { id: 'nearBarrier', box: { x: 0, y: RK.rail - 24, w: W, h: TY - RK.rail + 24 }, draw: nearBarrier },
    { id: 'counter', box: { x: 0, y: TY, w: W, h: H - TY }, draw: counter },
    { id: 'tokens', box: { x: TOK.x - 60, y: TOK.y - 40, w: 130, h: 64 }, draw: (c) => tokens(c) },
    { id: 'cup', box: { x: CUP.x - 40, y: CUP.y - 134, w: 100, h: 150 }, draw: (c) => cup(c) },
    { id: 'skate', box: SKATE_BOX, motion: 'sprite', draw: (c) => skateProp(c) },
    { id: 'ball', box: BALL_BOX, stillOnly: true, draw: (c) => ballStill(c) },
    { id: 'uv', liveOnly: true, res: 0.5, draw: (c) => uvLayer(c) },
    { id: 'fx', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

// ——— live: the skaters ———
//
// Four skaters, each their own build and way of skating (not colour swaps): a tall speed skater crouched low with
// a hand behind her back, a kid with arms out for balance, a girl in a skater dress, and a showboat skating
// backwards with a disco point. In the couples skate the girl and the showboat take hands (their own frames), he
// skating backwards in front of her. One rig: tapered limbs bending at knees and elbows through a push, a glide
// and a recovery, the weight bobbing and shifting; clothes and hair following through. Painted at the near lane's
// size, baked at SK.k and drawn back up.

type ArmMode = 'swing' | 'speed' | 'out' | 'flair' | 'reach';
interface Build {
  /** Overall size, head size (kid: big head), hip height, thigh and shin, torso length. */
  s: number;
  head: number;
  hip: number;
  thigh: number;
  shin: number;
  torso: number;
  /** Limb thickness, chest and hip half-widths. */
  w: number;
  chest: number;
  hips: number;
  /** Torso lean (rad, forward), stride length, bounce. */
  lean: number;
  stride: number;
  bounce: number;
  arms: ArmMode;
  /** Skates backwards (pushes forward, travels the other way). */
  back?: boolean;
}
interface Look {
  skin: string;
  hair: string;
  style: 'pony' | 'afro' | 'bob' | 'helmet' | 'long';
  top: string;
  trim: string;
  /** What's below the top: a skater dress, flared trousers, shorts and socks, a skinsuit. */
  lower: 'skirt' | 'flares' | 'shorts' | 'suit';
  pants: string;
  sock: string;
  boot: string;
  wheel: string;
  /** A jacket whose hem swings. */
  jacket?: boolean;
  shades?: boolean;
}

const BUILDS: Record<string, Build> = {
  girl: { s: 1, head: 9, hip: 62, thigh: 31, shin: 30, torso: 34, w: 1, chest: 9.5, hips: 8.5, lean: 0.42, stride: 1, bounce: 1, arms: 'swing' },
  show: { s: 1.05, head: 9.2, hip: 66, thigh: 33, shin: 32, torso: 37, w: 1.08, chest: 11, hips: 8, lean: -0.08, stride: 0.75, bounce: 1.3, arms: 'flair', back: true },
  speed: { s: 1.1, head: 8.6, hip: 50, thigh: 34, shin: 33, torso: 38, w: 0.95, chest: 9, hips: 8, lean: 1.02, stride: 1.45, bounce: 0.6, arms: 'speed' },
  kid: { s: 0.72, head: 12.5, hip: 54, thigh: 27, shin: 26, torso: 30, w: 1.15, chest: 10, hips: 9, lean: 0.12, stride: 0.6, bounce: 1.6, arms: 'out' },
};
const LOOKS: Record<string, Look> = {
  girl: { skin: '#f0c4a0', hair: '#e8b850', style: 'long', top: '#e04a86', trim: '#fff2f6', lower: 'skirt', pants: '#e04a86', sock: '#fff6f8', boot: '#f6f2ec', wheel: '#ff6ab0' },
  show: { skin: '#8a5a3a', hair: '#2e1e16', style: 'afro', top: '#f2e8d0', trim: '#d8a030', lower: 'flares', pants: '#7a3a9a', sock: '#7a3a9a', boot: '#f6f2ec', wheel: '#ffd040', jacket: true, shades: true },
  speed: { skin: '#d8a07a', hair: '#1e1410', style: 'bob', top: '#1a7ad8', trim: '#ffd040', lower: 'suit', pants: '#1a3a8a', sock: '#1a3a8a', boot: '#2a2630', wheel: '#9aff3a' },
  kid: { skin: '#f2c8a8', hair: '#b8482a', style: 'helmet', top: '#f0be30', trim: '#e83a3a', lower: 'shorts', pants: '#2a6ad0', sock: '#f2f0f0', boot: '#e83a3a', wheel: '#f6f2ec' },
};

/** A skater's frame (paint size): fw × fh, the wheels' line at (ox, base), facing right; baked at k. */
const SK = { fw: 124, fh: 150, ox: 62, base: 146, n: 10, k: 0.75 };

function ik(a: Pt, b: Pt, l1: number, l2: number): Pt {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.01);
  const ang = Math.atan2(dy, dx);
  const k = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const k1: Pt = [a[0] + Math.cos(ang - k) * l1, a[1] + Math.sin(ang - k) * l1];
  const k2: Pt = [a[0] + Math.cos(ang + k) * l1, a[1] + Math.sin(ang + k) * l1];
  return k1[0] > k2[0] ? k1 : k2;
}

/** A direction from straight down (0), forward (π/2), up (π), back (−π/2). */
const dirOf = (a: number): Pt => [Math.sin(a), Math.cos(a)];
const along = (p: Pt, a: number, l: number): Pt => [p[0] + Math.sin(a) * l, p[1] + Math.cos(a) * l];

/** The stride at phase p (0…1: a push with each leg). Joints relative to the wheels' line under the body. */
function pose(p: number, b: Build, arms: ArmMode) {
  const w2 = p * P2 * 2;
  // the body drops into each push and rises through the glide; the hips ride forward over the gliding skate
  const bob = -Math.cos(w2) * 2.6 * b.bounce;
  const shift = Math.sin(w2) * 2.5;
  const hip: Pt = [shift, -b.hip + bob];
  const lean = b.lean + Math.sin(w2 + 0.6) * 0.06;
  const sh = along(hip, Math.PI - lean, b.torso);
  const headC = along(sh, Math.PI - lean * 0.6, b.head + 5);
  const fwd = b.back ? -1 : 1;
  const leg = (q0: number) => {
    const q = ((q0 % 1) + 1) % 1;
    let fx: number;
    let lift = 0;
    let tilt = 0;
    if (q < 0.5) {
      // the push: the skate driven out and back (forwards for a backward skater), the leg straightening
      const u = q / 0.5;
      const e = u * u * (3 - 2 * u);
      fx = (14 - e * 50) * b.stride * fwd;
      tilt = fwd * -0.12 * e;
    } else if (q < 0.62) {
      // the toe flicks off the floor
      const u = (q - 0.5) / 0.12;
      fx = -36 * b.stride * fwd;
      lift = 6 * u;
      tilt = fwd * (-0.12 - 0.35 * u);
    } else {
      // the recovery: knee lifted, the skate swung through under the hips
      const u = (q - 0.62) / 0.38;
      const e = u * u * (3 - 2 * u);
      fx = (-36 + e * 50) * b.stride * fwd;
      lift = 6 + 8 * Math.sin(Math.PI * u) - 6 * u;
      tilt = fwd * (-0.47 + 0.47 * e);
    }
    const ankle: Pt = [fx + shift * 0.3, -16.5 - lift];
    return { ankle, knee: ik(hip, ankle, b.thigh, b.shin), tilt };
  };
  // arms: upper arm angle and elbow bend
  const s = Math.sin(p * P2 + 0.35);
  const arm = (a: number, bend: number) => {
    const el = along(sh, a, 20 * b.s);
    const hand = along(el, a + bend, 18 * b.s);
    return { el, hand };
  };
  let nearArm;
  let farArm;
  if (arms === 'speed') {
    // one hand tucked on the small of her back, the other swinging long and loose
    nearArm = arm(0.3 + 1.15 * s, 0.25 + Math.max(0, s) * 0.3);
    farArm = arm(-lean - 0.45, 1.25);
  } else if (arms === 'out') {
    // the kid's arms out for balance, flapping with every wobble
    const f = Math.sin(w2 + 1) * 0.25;
    nearArm = arm(1.35 + f, 0.45 - f);
    farArm = arm(1.1 - f, 0.6 + f);
  } else if (arms === 'flair') {
    // the showboat's disco point, the other hand out behind, both grooving
    const g = Math.sin(w2) * 0.12;
    // (the pointing arm is the far one, up behind his head: the silhouette reads, the face stays clear)
    farArm = arm(2.75 + g, 0.3);
    nearArm = arm(-1.0 - g, 0.4);
  } else if (arms === 'reach') {
    // a hand held out to a partner at waist height, the other arm easy
    nearArm = arm(1.15 + Math.sin(w2) * 0.04, 0.35);
    farArm = arm(0.2 - 0.3 * s, 0.4);
  } else {
    nearArm = arm(0.2 + 0.95 * s, 0.4 + Math.max(0, s) * 0.5);
    farArm = arm(0.2 - 0.95 * s, 0.4 + Math.max(0, -s) * 0.5);
  }
  return { hip, sh, headC, lean, near: leg(p), far: leg(p + 0.5), nearArm, farArm, w2 };
}

/** The scene's light on a colour across a form: lit towards the top left, shaded away. */
function lit(c: Ctx, a: Pt, b: Pt, w: number, col: string): CanvasGradient {
  let nx = -(b[1] - a[1]);
  let ny = b[0] - a[0];
  const l = Math.hypot(nx, ny) || 1;
  nx /= l;
  ny /= l;
  if (nx * -0.6 + ny * -0.8 < 0) {
    nx = -nx;
    ny = -ny;
  }
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const g = c.createLinearGradient(mx + nx * w, my + ny * w, mx - nx * w, my - ny * w);
  g.addColorStop(0, shade(col, 0.22));
  g.addColorStop(0.4, col);
  g.addColorStop(1, mix(shade(col, -0.3), '#2a1840', 0.2));
  return g;
}

/** A tapered limb segment (a round joint at each end), ink outline, lit across its form. */
function seg(c: Ctx, a: Pt, b: Pt, wa: number, wb: number, col: string): void {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = Math.hypot(dx, dy) || 1;
  const nx = -dy / l;
  const ny = dx / l;
  const path = (g: Ctx, e: number) => {
    g.beginPath();
    g.moveTo(a[0] + nx * (wa / 2 + e), a[1] + ny * (wa / 2 + e));
    g.lineTo(b[0] + nx * (wb / 2 + e), b[1] + ny * (wb / 2 + e));
    g.arc(b[0], b[1], wb / 2 + e, Math.atan2(ny, nx), Math.atan2(ny, nx) + Math.PI, false);
    g.lineTo(a[0] - nx * (wa / 2 + e), a[1] - ny * (wa / 2 + e));
    g.arc(a[0], a[1], wa / 2 + e, Math.atan2(-ny, -nx), Math.atan2(-ny, -nx) + Math.PI, false);
    g.closePath();
  };
  c.fillStyle = INK;
  path(c, 1.3);
  c.fill();
  c.fillStyle = lit(c, a, b, Math.max(wa, wb) / 2, col);
  path(c, 0);
  c.fill();
}

function poly(c: Ctx, pts: Pt[], fill: string | CanvasGradient, ink = 2.2): void {
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.closePath();
  c.lineJoin = 'round';
  c.strokeStyle = INK;
  c.lineWidth = ink;
  c.stroke();
  c.fillStyle = fill;
  c.fill();
}

function skate(c: Ctx, ax: number, ay: number, tilt: number, o: Look, dim: number, flip: boolean): void {
  c.save();
  c.translate(ax, ay);
  c.rotate(tilt);
  c.scale(flip ? -0.72 : 0.72, 0.72);
  const boot = shade(o.boot, dim);
  const bootP = (g: Ctx) => {
    g.beginPath();
    g.moveTo(-10, 13);
    g.lineTo(-11, -2);
    g.quadraticCurveTo(-9, -6, -4, -6);
    g.lineTo(5, -6);
    g.lineTo(6, 4);
    g.quadraticCurveTo(15, 6, 17, 12);
    g.lineTo(17, 13);
    g.closePath();
  };
  c.lineWidth = 3;
  c.strokeStyle = INK;
  bootP(c);
  c.stroke();
  const g = c.createLinearGradient(-10, -6, 8, 14);
  g.addColorStop(0, shade(boot, 0.16));
  g.addColorStop(0.6, boot);
  g.addColorStop(1, shade(boot, -0.28));
  c.fillStyle = g;
  bootP(c);
  c.fill();
  c.fillStyle = '#26222a';
  c.fillRect(-10, 13, 27, 2.4);
  c.fillStyle = INK;
  c.beginPath();
  c.arc(18.5, 14.5, 2.6, 0, P2);
  c.fill();
  for (const wx of [-5, 12]) {
    c.fillStyle = INK;
    c.beginPath();
    c.arc(wx, 18, 4.8, 0, P2);
    c.fill();
    c.fillStyle = shade(o.wheel, dim);
    c.beginPath();
    c.arc(wx, 18, 3.6, 0, P2);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.beginPath();
    c.arc(wx - 1, 17, 1.1, 0, P2);
    c.fill();
  }
  c.restore();
}

function head(c: Ctx, P: ReturnType<typeof pose>, b: Build, o: Look, ph: number, couple: boolean): void {
  const [hx, hy] = P.headC;
  const r = b.head;
  // hair that follows through: it lags the bob and streams back with the speed
  const lag = Math.sin(P.w2 - 1.1);
  const stream = b.arms === 'speed' ? 1.4 : 1;
  if (o.style === 'afro') {
    const sq = 1 + lag * 0.05;
    const tufts: Pt[] = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * P2;
      tufts.push([hx - 3 + Math.cos(a) * r * 1.35, hy - 5 + Math.sin(a) * r * 1.3 * sq]);
    }
    c.fillStyle = INK;
    for (const [tx, ty] of tufts) {
      c.beginPath();
      c.arc(tx, ty, r * 0.52, 0, P2);
      c.fill();
    }
    const ag = c.createRadialGradient(hx - 10, hy - 14, 1, hx - 3, hy - 5, r * 1.9);
    ag.addColorStop(0, shade(o.hair, 0.55));
    ag.addColorStop(0.5, shade(o.hair, 0.15));
    ag.addColorStop(1, o.hair);
    c.fillStyle = ag;
    for (const [tx, ty] of tufts) {
      c.beginPath();
      c.arc(tx, ty, r * 0.4, 0, P2);
      c.fill();
    }
    c.beginPath();
    c.arc(hx - 3, hy - 5, r * 1.3, 0, P2);
    c.fill();
  }
  if (o.style === 'long') {
    // long hair lifting off her back, its ends lagging the stride
    const tip: Pt = [hx - 20 * stream, hy + 10 + lag * 4];
    poly(c, [[hx - 2, hy - r], [hx - r - 3, hy - 3], [hx - 14, hy + 6 + lag * 2], tip, [hx - 9, hy + 12], [hx - 3, hy + 4]], lit(c, [hx, hy - r], tip, 10, o.hair), 2);
  }
  if (o.style === 'pony') {
    const tip: Pt = [hx - 18, hy + 6 + lag * 4];
    seg(c, [hx - r * 0.7, hy - 3], tip, 6, 3, o.hair);
  }
  // the face (in profile), lit from the top left, a cheek of colour, the ear
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
  // nose and chin pushing out of the circle
  c.fillStyle = shade(o.skin, -0.02);
  c.strokeStyle = INK;
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(hx + r * 0.82, hy - r * 0.2);
  c.lineTo(hx + r * 1.18, hy + r * 0.22);
  c.lineTo(hx + r * 0.86, hy + r * 0.34);
  c.fill();
  c.stroke();
  c.fillStyle = 'rgba(230,90,110,0.35)';
  c.beginPath();
  c.arc(hx + r * 0.35, hy + r * 0.38, r * 0.25, 0, P2);
  c.fill();
  c.fillStyle = shade(o.skin, -0.28);
  c.beginPath();
  c.arc(hx - r * 0.18, hy + r * 0.1, r * 0.22, 0, P2);
  c.fill();
  // the expression: a grin (a laugh for the kid, a grin at her partner in the couples skate), eyes, a brow
  c.strokeStyle = INK;
  c.lineWidth = 1.3;
  c.beginPath();
  if (b.arms === 'out') c.arc(hx + r * 0.62, hy + r * 0.5, r * 0.2, 0, P2);
  else c.arc(hx + r * 0.5, hy + r * 0.3, r * 0.3, 0.3, 1.5);
  c.stroke();
  if (b.arms === 'out') {
    c.fillStyle = '#6a1a20';
    c.beginPath();
    c.arc(hx + r * 0.62, hy + r * 0.5, r * 0.15, 0, P2);
    c.fill();
  }
  if (o.shades) {
    c.fillStyle = '#1a1418';
    c.beginPath();
    c.ellipse(hx + r * 0.62, hy - r * 0.12, r * 0.38, r * 0.26, 0.1, 0, P2);
    c.fill();
    c.fillStyle = 'rgba(255,180,230,0.6)';
    c.fillRect(hx + r * 0.5, hy - r * 0.25, r * 0.22, 1.2);
    c.strokeStyle = '#1a1418';
    c.beginPath();
    c.moveTo(hx + r * 0.3, hy - r * 0.15);
    c.lineTo(hx - r * 0.2, hy - r * 0.05);
    c.stroke();
  } else {
    const blink = couple && Math.sin(ph * P2) > 0.9;
    c.fillStyle = INK;
    if (blink) c.fillRect(hx + r * 0.48, hy - r * 0.12, r * 0.34, 1.2);
    else {
      c.beginPath();
      c.ellipse(hx + r * 0.62, hy - r * 0.12, r * 0.14, r * 0.2, 0, 0, P2);
      c.fill();
    }
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(hx + r * 0.42, hy - r * 0.42);
    c.lineTo(hx + r * 0.82, hy - r * (b.arms === 'out' ? 0.52 : 0.4));
    c.stroke();
  }
  // the hair on top, a helmet for the kid
  if (o.style === 'helmet') {
    const hp: Pt[] = [];
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI * (1.02 + (i / 10) * 1.0);
      hp.push([hx + Math.cos(a) * (r + 2.5), hy - 1 + Math.sin(a) * (r + 3)]);
    }
    poly(c, [...hp, [hx + r + 3, hy - 1], [hx - r - 3, hy - 1]], lit(c, [hx - r, hy - r], [hx + r, hy - r], r, o.trim), 2);
    c.fillStyle = 'rgba(255,255,255,0.6)';
    c.beginPath();
    c.ellipse(hx - r * 0.3, hy - r * 0.8, r * 0.4, r * 0.15, -0.3, 0, P2);
    c.fill();
    c.strokeStyle = INK;
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(hx - r * 0.3, hy);
    c.lineTo(hx + r * 0.2, hy + r * 0.85);
    c.stroke();
    // a curl escaping at the back
    c.fillStyle = o.hair;
    c.beginPath();
    c.arc(hx - r * 0.9, hy + r * 0.2, r * 0.3, 0, P2);
    c.fill();
  } else if (o.style !== 'afro') {
    c.fillStyle = o.hair;
    c.beginPath();
    c.moveTo(hx - r - 0.5, hy + r * 0.45);
    c.quadraticCurveTo(hx - r * 1.15, hy - r * 1.15, hx, hy - r * 1.1);
    c.quadraticCurveTo(hx + r * 0.95, hy - r, hx + r * 0.95, hy - r * 0.3);
    c.quadraticCurveTo(hx + r * 0.3, hy - r * 0.6, hx - r * 0.25, hy - r * 0.3);
    c.quadraticCurveTo(hx - r * 0.5, hy + r * 0.2, hx - r - 0.5, hy + r * 0.45);
    c.fill();
    if (o.style === 'bob') {
      // a short bob flicking back with the speed
      c.beginPath();
      c.moveTo(hx - r * 0.4, hy - r * 0.6);
      c.quadraticCurveTo(hx - r * 1.5 - lag * 1.5, hy, hx - r * 1.1 - lag * 2, hy + r * 0.8);
      c.quadraticCurveTo(hx - r * 0.7, hy + r * 0.4, hx - r * 0.4, hy - r * 0.6);
      c.fill();
    }
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.beginPath();
    c.ellipse(hx - r * 0.3, hy - r * 0.85, r * 0.35, r * 0.12, -0.3, 0, P2);
    c.fill();
  } else {
    c.fillStyle = o.hair;
    c.beginPath();
    c.arc(hx - 4, hy - 4, r * 0.95, Math.PI * 0.75, Math.PI * 1.95);
    c.fill();
  }
}

/** One frame of a skater (phase ph of the stride), facing right. */
function skaterFrame(c: Ctx, ph: number, b: Build, o: Look, arms: ArmMode): void {
  const P = pose(ph, b, arms);
  c.save();
  c.translate(SK.ox, SK.base);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  const W0 = 1.0 * b.w;
  const drawLeg = (L: ReturnType<typeof pose>['near'], dim: number) => {
    const thighCol = shade(o.lower === 'shorts' || o.lower === 'skirt' ? o.skin : o.pants, dim);
    const shinCol = shade(o.lower === 'flares' || o.lower === 'suit' ? o.pants : o.sock, dim);
    seg(c, P.hip, L.knee, 11.5 * W0, 8.5 * W0, thighCol);
    if (o.lower === 'shorts') seg(c, P.hip, [P.hip[0] + (L.knee[0] - P.hip[0]) * 0.4, P.hip[1] + (L.knee[1] - P.hip[1]) * 0.4], 13.5 * W0, 12 * W0, shade(o.pants, dim));
    seg(c, L.knee, L.ankle, 8.5 * W0, 6 * W0, shinCol);
    if (o.lower === 'skirt' || o.lower === 'shorts') {
      // socks: a stripe at the top, the kid's knee pads
      const at = (t: number): Pt => [L.knee[0] + (L.ankle[0] - L.knee[0]) * t, L.knee[1] + (L.ankle[1] - L.knee[1]) * t];
      c.strokeStyle = shade(o.trim, dim);
      c.lineWidth = 7 * W0;
      c.lineCap = 'butt';
      c.beginPath();
      c.moveTo(...at(0.2));
      c.lineTo(...at(0.28));
      c.stroke();
      c.lineCap = 'round';
      if (o.lower === 'shorts') seg(c, at(-0.05), at(0.12), 10, 10, shade('#3a3a44', dim));
    }
    if (o.lower === 'flares') {
      // bell-bottoms flaring over the boot, swinging
      const k0 = L.knee;
      const a = L.ankle;
      const fl = 9 + Math.sin(P.w2) * 1.5;
      poly(c, [[k0[0] - 4, k0[1] + 4], [k0[0] + 4, k0[1] + 4], [a[0] + fl, a[1] + 4], [a[0] - fl, a[1] + 4]], lit(c, k0, a, 8, shade(o.pants, dim)), 2);
    }
    skate(c, L.ankle[0], L.ankle[1], L.tilt, o, dim, false);
  };
  const drawArm = (A: ReturnType<typeof pose>['nearArm'], dim: number, jacket: boolean) => {
    const sleeve = shade(o.top, dim);
    seg(c, P.sh, A.el, 8 * W0, 6.5 * W0, sleeve);
    seg(c, A.el, A.hand, 6.5 * W0, 5 * W0, jacket || o.lower === 'suit' ? sleeve : shade(o.skin, dim));
    // the hand: a mitten with a thumb
    const d = dirOf(Math.atan2(A.hand[0] - A.el[0], A.hand[1] - A.el[1]));
    const hc: Pt = [A.hand[0] + d[0] * 2, A.hand[1] + d[1] * 2];
    c.fillStyle = INK;
    c.beginPath();
    c.ellipse(hc[0], hc[1], 4.6, 3.8, Math.atan2(d[1], d[0]), 0, P2);
    c.fill();
    c.fillStyle = shade(o.skin, dim);
    c.beginPath();
    c.ellipse(hc[0], hc[1], 3.4, 2.7, Math.atan2(d[1], d[0]), 0, P2);
    c.fill();
  };
  // far side first, then the body, then the near side
  drawArm(P.farArm, -0.3, !!o.jacket);
  drawLeg(P.far, -0.3);
  // the torso: shaped (chest, waist, hips), lit across
  const ang = Math.PI - P.lean;
  const ax = Math.sin(ang);
  const ay = Math.cos(ang);
  const px = -ay;
  const py = ax;
  const at = (t: number, wd: number): Pt => [P.hip[0] + ax * b.torso * t + px * wd, P.hip[1] + ay * b.torso * t + py * wd];
  const tg = c.createLinearGradient(P.sh[0] - 12, P.sh[1] - 8, P.hip[0] + 12, P.hip[1] + 8);
  tg.addColorStop(0, shade(o.top, 0.22));
  tg.addColorStop(0.5, o.top);
  tg.addColorStop(1, mix(shade(o.top, -0.32), '#2a1840', 0.2));
  const body: Pt[] = [at(-0.08, -b.hips), at(0.42, -b.chest * 0.85), at(0.8, -b.chest), at(1.04, -b.chest * 0.55), at(1.06, b.chest * 0.4), at(0.8, b.chest * 0.95), at(0.45, b.hips * 0.85), at(-0.08, b.hips)];
  if (o.lower === 'skirt') {
    // the skater dress's skirt flaring, its hem fluttering and swinging behind the stride
    const sw = Math.sin(P.w2 - 0.9) * 3;
    const hb = at(-0.02, 0);
    poly(c, [at(0.05, -b.hips), at(0.05, b.hips), [hb[0] + 14 + sw * 0.4, hb[1] + 14], [hb[0] + 4, hb[1] + 17 + sw * 0.3], [hb[0] - 8, hb[1] + 16], [hb[0] - 18 - sw, hb[1] + 11 - sw * 0.5]], lit(c, hb, [hb[0], hb[1] + 16], 14, o.pants), 2);
  }
  poly(c, body, tg, 2.4);
  // the clothes' detail: a jacket's open front and swinging hem, a skinsuit's stripe, the dress's trim, a collar
  if (o.jacket) {
    const sw = Math.sin(P.w2 - 1) * 2.5;
    poly(c, [at(0.05, -b.hips - 1), at(0.05, b.hips + 1), [at(-0.1, b.hips + 2)[0] + sw, at(-0.1, b.hips + 2)[1] + 4], [at(-0.1, -b.hips - 4)[0] - 4 - sw, at(-0.1, -b.hips - 4)[1] + 5]], shade(o.top, -0.12), 1.8);
    // the wide disco collar and an open neck, a gold medallion
    poly(c, [at(1.02, -2), at(0.86, 8), at(1.04, 6)], shade(o.top, 0.1), 1.4);
    c.fillStyle = o.trim;
    const m = at(0.78, 5);
    c.beginPath();
    c.arc(m[0], m[1], 2, 0, P2);
    c.fill();
  }
  within(c, (g) => {
    g.beginPath();
    g.moveTo(body[0][0], body[0][1]);
    for (const q of body) g.lineTo(q[0], q[1]);
    g.closePath();
  }, () => {
    if (o.lower === 'suit') stroke(c, [at(-0.1, -2), at(1.1, -2)], 3.4, o.trim);
    else if (!o.jacket) {
      stroke(c, [at(0.02, -14), at(0.02, 14)], 3, o.trim);
      stroke(c, [at(1.0, -14), at(1.0, 14)], 2.4, o.trim);
    }
    // a sheen
    stroke(c, [at(0.2, -b.chest * 0.5), at(0.85, -b.chest * 0.6)], 2, rgba('#ffffff', 0.3));
  });
  drawLeg(P.near, 0);
  // the neck, the head
  seg(c, P.sh, [P.headC[0] - 2, P.headC[1] + b.head * 0.6], 5.5 * W0, 5 * W0, o.skin);
  head(c, P, b, o, ph, arms === 'reach');
  drawArm(P.nearArm, 0.04, !!o.jacket);
  c.restore();
}

// ——— live: fog, specks, beams ———

/** One frame of fog lying on the floor (phase 0…1 loops): soft billows that swell, settle and roll over (the
 * layer itself drifts across the floor), each lit on its top; it thins out towards the floor's near edge. Painted
 * into a w×h frame (drawn up 4×), seamless left to right. */
function fogFrame(c: Ctx, w: number, h: number, ph: number, seed: number): void {
  const rr = rng(seed);
  for (let i = 0; i < 30; i++) {
    const x = rr() * w;
    const y0 = h * (0.45 + rr() * 0.35);
    const rad = h * (0.2 + rr() * 0.28);
    const br = rr();
    const m = rr() < 0.5 ? 1 : 2;
    // each billow breathes on its own beat: swelling and lifting, then sinking back
    const b = Math.sin((ph * m + br) * P2);
    const k = 1 + 0.16 * b;
    const y = y0 - b * h * 0.06;
    const dx = Math.cos((ph * m + br) * P2) * w * 0.012;
    for (const xx of [x - w + dx, x + dx, x + w + dx]) {
      if (xx < -rad * 2 || xx > w + rad * 2) continue;
      const g = c.createRadialGradient(xx, y, 0, xx, y, rad * k * 1.4);
      g.addColorStop(0, 'rgba(236,230,255,0.42)');
      g.addColorStop(0.5, 'rgba(220,214,250,0.2)');
      g.addColorStop(1, 'rgba(200,196,240,0)');
      c.fillStyle = g;
      c.beginPath();
      c.ellipse(xx, y, rad * k * 1.4, rad * k * 0.8, 0, 0, P2);
      c.fill();
      const lg = c.createRadialGradient(xx - rad * 0.3, y - rad * 0.45, 0, xx - rad * 0.3, y - rad * 0.45, rad * 0.7);
      lg.addColorStop(0, 'rgba(255,255,255,0.16)');
      lg.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = lg;
      c.fillRect(xx - rad * 1.2, y - rad * 1.3, rad * 2.4, rad * 2);
    }
  }
  // thinning out at the bottom (no hard edge where it ends)
  c.save();
  c.globalCompositeOperation = 'destination-in';
  const f = c.createLinearGradient(0, 0, 0, h);
  f.addColorStop(0, 'rgba(0,0,0,1)');
  f.addColorStop(0.7, 'rgba(0,0,0,0.9)');
  f.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = f;
  c.fillRect(0, 0, w, h);
  c.restore();
}

/** The light specks the ball throws: little soft ovals of white and a few of the rink's colours. */
function specksTile(c: Ctx, w: number, h: number, seed: number, sy: number): void {
  const rr = rng(seed);
  for (let i = 0; i < 70; i++) {
    const x = rr() * w;
    const y = rr() * h;
    const s = 1.3 + rr() * rr() * 2.8;
    const col = rr() < 0.75 ? '#ffffff' : ['#ffb0e8', '#b0f4ff', '#fff0b0'][Math.floor(rr() * 3)];
    for (const [dx, dy] of [[0, 0], [-w, 0], [w, 0], [0, -h], [0, h]]) {
      const g = c.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, s * 2);
      g.addColorStop(0, rgba(col, 0.95));
      g.addColorStop(0.35, rgba(col, 0.5));
      g.addColorStop(1, rgba(col, 0));
      c.fillStyle = g;
      c.beginPath();
      c.ellipse(x + dx, y + dy, s * 2, s * 2 * sy, 0, 0, P2);
      c.fill();
    }
  }
}

// ——— live ———

registerKitScene(RINK, (k: KitLive, wave0) => {
  const fx = k.slot('fx');
  const rinkC = k.slot('rink');
  const sc = k.sc;
  const clamp = Phaser.Math.Clamp;
  const C = Phaser.Display.Color;
  const strobeOk = () => save.settings.flashes && !save.settings.reducedMotion;

  // ——— the room's light: the gloom of the lights going down (the counter keeps more of it), blacklight's violet
  const gloomKey = k.tex('rk_gloom', 96, 54, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 54);
    g.addColorStop(0, '#201a34');
    g.addColorStop(0.3, '#2e2648');
    g.addColorStop(0.44, '#5a4c80');
    g.addColorStop(0.62, '#7a6ca0');
    g.addColorStop(0.72, '#a89cc4');
    g.addColorStop(1, '#bcb2d4');
    c.fillStyle = g;
    c.fillRect(0, 0, 96, 54);
    // the ball's pin spot keeps the middle of the room lit
    c.save();
    c.translate(48, 18);
    c.scale(1.6, 1);
    const rg = c.createRadialGradient(0, 0, 1, 0, 0, 20);
    rg.addColorStop(0, 'rgba(200,190,230,0.5)');
    rg.addColorStop(1, 'rgba(200,190,230,0)');
    c.fillStyle = rg;
    c.fillRect(-30, -30, 60, 60);
    c.restore();
  });
  const gloom = k.img(gloomKey, 0, 0, { into: fx, origin: [0, 0], scale: 20, alpha: 0 });
  gloom.setBlendMode(Phaser.BlendModes.MULTIPLY);
  const violet = k.wash(0x6a4ab0, 0, Phaser.BlendModes.MULTIPLY, fx);
  // the blacklight's glow (its own layer moved over the gloom so the gloom doesn't darken it)
  const uv = k.sprite('uv').setBlendMode(Phaser.BlendModes.ADD);
  k.root.remove(uv);
  fx.add(uv);
  const uvWash = k.wash(0x3a1470, 0, Phaser.BlendModes.ADD, fx);
  const pools = k.sprite('pools').setBlendMode(Phaser.BlendModes.ADD);

  // ——— the house lights: lit lenses and halos over the unlit domes
  const lensKey = k.tex('rk_lens', 80, 20, (c) => {
    const g = c.createRadialGradient(34, 9, 2, 40, 10, 32);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.6, '#fff2dc');
    g.addColorStop(1, 'rgba(240,208,160,0)');
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(40, 10, 32, 5, 0, 0, P2);
    c.fill();
  });
  const house = RK.lamps.map((x) => ({
    lens: k.img(lensKey, x, RK.lampY + 1, { into: fx, add: true }),
    halo: k.glow(x, RK.lampY + 2, 90, 0xffe8c8, 0.32, { into: fx, sy: 0.45 }),
    cone: k.glow(x, RK.lampY + 120, 170, 0xfff0d8, 0.05, { into: fx, sy: 1.4 }),
  }));

  // ——— the marquee's bulbs, chasing
  const bulbKey = k.tex('rk_bulb', 14, 14, (c) => bulbAt(c, 7, 7, 1));
  const bulbs = BULBS.map(([x, y]) => ({
    b: k.img(bulbKey, x, y, { into: fx }),
    g: k.glow(x, y, 15, 0xffd890, 0.45, { into: fx }),
  }));
  const mqGlow = k.glow(MQ.x, MQ.y + 40, 280, 0xffc070, 0.08, { into: fx, sy: 0.6 });
  let chaseT = 0;
  let chase = 0;
  let flashAll = 0;

  // ——— the letterboard's sessions
  // (the letterboard is backlit: its session boards ride over the gloom so the cue stays readable in the dark)
  const boards = [null, k.sprite('board2'), k.sprite('board3'), k.sprite('board4')];
  for (const b of boards) if (b) {
    k.root.remove(b);
    fx.addAt(b, fx.getIndex(gloom) + 1);
  }
  const boardGlow = k.glow(BD.x, BD.y, 150, 0xfff0e0, 0.1, { into: fx, sy: 0.4 });

  // ——— the DJ, nodding; the console's meters
  // (eight frames of the groove, then two of the record skipping)
  const DJF = 8;
  const djKey = sheet(k, 'rk_dj', DJ.box.w, DJ.box.h, DJF + 2, (c, _ph, i) => {
    c.translate(-DJ.box.x, -DJ.box.y);
    djFrame(c, i / DJF, i >= DJF ? i - DJF + 1 : 0);
  });
  const dj = new Loop(k, djKey, DJF, DJ.box.x, DJ.box.y, { into: fx, origin: [0, 0], fps: 8.5 });
  let skip = 0;
  const deckLamp = k.glow(BT.x0 + 60, BT.win - 16, 60, 0xffb870, 0.25, { into: fx });
  const meterKey = k.tex('rk_meter', 4, 3, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 4, 3);
  });
  const meterLeds = Array.from({ length: 6 }, (_, i) => k.img(meterKey, BT.x1 - 80 + i * 5, BT.win - 6, { into: fx, origin: [0, 0], add: true, tint: i > 4 ? 0xff4a5a : i > 3 ? 0xffd040 : 0x5aff7a }));

  // ——— the mirror ball: turning, glints, swinging on its chain
  const BF = 6;
  const ballKey = sheet(k, 'rk_ball', BALL_F, BALL_F, BF, (c, ph) => ballFrame(c, ph));
  const hingeY = RK.chord + 18;
  const ballC = sc.add.container(BALL.x, hingeY);
  fx.add(ballC);
  const chainLen = BALL.y - BALL.r - 4 - hingeY;
  const chainKey = k.tex('rk_chain', 16, Math.ceil(chainLen + 8), (c) => ballChain(c, 8, 0, chainLen));
  ballC.add(sc.add.image(0, 0, chainKey).setOrigin(0.5, 0));
  const pin = sc.add.image(0, BALL.y - hingeY, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xd8c8ff).setScale(300 / 256).setAlpha(0.12);
  ballC.add(pin);
  const ball = new Loop(k, ballKey, BF, 0, BALL.y - hingeY, { into: ballC, fps: 2.2 });
  const glints = Array.from({ length: 4 }, () => ({ img: sc.add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD).setScale(0.1).setAlpha(0), t: -1 }));
  for (const g of glints) ballC.add(g.img);
  const starKey = k.tex('rk_star', 32, 32, (c) => {
    const g = c.createLinearGradient(0, 16, 32, 16);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 15, 32, 2);
    const g2 = c.createLinearGradient(16, 0, 16, 32);
    g2.addColorStop(0, 'rgba(255,255,255,0)');
    g2.addColorStop(0.5, 'rgba(255,255,255,1)');
    g2.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g2;
    c.fillRect(15, 0, 2, 32);
  });
  const stars = glints.map(() => sc.add.image(0, 0, starKey).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0));
  for (const s of stars) ballC.add(s);
  const swing = new Swing(ballC as unknown as Phaser.GameObjects.Image, { k: 4, c: 0.35, idle: 0.004, seed: 2 });

  // the specks it throws: on the wall (over everything there) and on the floor (under the skaters)
  const specksWall = sc.add.tileSprite(0, RK.roof, W, RK.wallFoot - RK.roof, k.tex('rk_specks', 640, 220, (c) => specksTile(c, 640, 220, 101, 0.8))).setOrigin(0, 0).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
  const specksFloor = sc.add.tileSprite(0, RK.floor0, W, RK.rail - RK.floor0, k.tex('rk_specksF', 640, 160, (c) => specksTile(c, 640, 160, 103, 0.35))).setOrigin(0, 0).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
  fx.add(specksWall);
  fx.add(specksFloor);

  // ——— the moving heads' beams and the spots they throw on the floor
  const beamKey = k.tex('rk_beam', 64, 256, (c) => {
    // a narrow cone of light: a hot core along its axis, soft edges, fading with distance from the lens
    const g = c.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, 'rgba(255,255,255,0.35)');
    g.addColorStop(0.12, 'rgba(255,255,255,0.85)');
    g.addColorStop(0.3, 'rgba(255,255,255,0.7)');
    g.addColorStop(0.85, 'rgba(255,255,255,0.3)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(29, 0);
    c.lineTo(35, 0);
    c.lineTo(64, 256);
    c.lineTo(0, 256);
    c.closePath();
    c.fill();
    c.globalCompositeOperation = 'destination-in';
    const m = c.createLinearGradient(0, 0, 64, 0);
    m.addColorStop(0, 'rgba(0,0,0,0)');
    m.addColorStop(0.3, 'rgba(0,0,0,0.55)');
    m.addColorStop(0.5, 'rgba(0,0,0,1)');
    m.addColorStop(0.7, 'rgba(0,0,0,0.55)');
    m.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = m;
    c.fillRect(0, 0, 64, 256);
  });
  const BEAM_COLS = [0xff4ad8, 0x3ae8ff, 0xffd040, 0x8a5aff];
  const beams = RK.heads.map((x, i) => ({
    x,
    y: RK.chord + 36,
    img: k.img(beamKey, x, RK.chord + 36, { into: fx, add: true, origin: [0.5, 0], alpha: 0 }),
    spot: k.glow(x, 600, 110, BEAM_COLS[i], 0, { into: rinkC, sy: 0.22 }),
    seed: i * 7.3,
    col: i,
    lens: k.glow(x, RK.chord + 36, 26, 0xffffff, 0, { into: fx }),
  }));

  // ——— the skaters
  const SKN = SK.n;
  // (baked at SK.k of their painted size and drawn back up: small on screen, so the saving costs nothing)
  const skSheet = (id: string, arms?: ArmMode) =>
    sheet(k, `rk_sk_${id}${arms ? 'R' : ''}`, SK.fw * SK.k, SK.fh * SK.k, SKN, (c, ph) => {
      c.scale(SK.k, SK.k);
      skaterFrame(c, ph, BUILDS[id], LOOKS[id], arms ?? BUILDS[id].arms);
    });
  const shadowKey = k.tex('rk_shadow', 64, 16, (c) => {
    c.save();
    c.translate(32, 8);
    c.scale(1, 0.25);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 32);
    g.addColorStop(0, 'rgba(10,4,12,0.75)');
    g.addColorStop(1, 'rgba(10,4,12,0)');
    c.fillStyle = g;
    c.fillRect(-32, -32, 64, 64);
    c.restore();
  });
  const farC = sc.add.container(0, 0);
  const nearC = sc.add.container(0, 0);
  const FOGN = 8;
  const FW = 480;
  const FH = 48;
  const fogKey = sheet(k, 'rk_fog', FW, FH, FOGN, (c, ph) => fogFrame(c, FW, FH, ph, 107));
  rinkC.add(farC);
  rinkC.add(nearC);
  // (two banks: a far one rolling one way, a near one the other; each is two copies side by side, drifting)
  const fogBank = (y: number, sy: number, fps: number, phase: number, flip: boolean, speed: number) => {
    const loops = [0, 1].map(() => new Loop(k, fogKey, FOGN, 0, y, { into: fx, origin: [0, 1], sx: 4, sy, fps, phase }));
    if (flip) for (const l of loops) l.each((im) => im.setFlipX(true));
    return { loops, off: 0, speed };
  };
  const fogs = [fogBank(RK.farY + 36, 2.2, 1, 0, false, 14), fogBank(RK.rail - 2, 2.4, 0.8, 4, true, -22)];
  const FAR_S = (RK.farY - HY) / (RK.nearY - HY);
  interface Skater {
    b: Build;
    key: string;
    reach?: string;
    cur: string;
    loop: Loop;
    refl: Loop;
    rim: Loop;
    shadow: Phaser.GameObjects.Image;
    x: number;
    side: 0 | 1;
    speed: number;
    wait: number;
    lean: Spring;
    hop: Spring;
  }
  // the girl and the showboat (who skate together in the couples skate), the speed skater, the kid
  const ROSTER: [string, boolean, number, 0 | 1, number][] = [
    ['girl', true, 300, 0, 245],
    ['show', true, 1500, 1, 230],
    ['speed', false, 900, 1, 330],
    ['kid', false, -500, 0, 165],
  ];
  const ORIGIN: [number, number] = [SK.ox / SK.fw, SK.base / SK.fh];
  const RIM_COLS = [0xff6ad8, 0x5ae8ff, 0xffd060, 0xb08aff];
  const skaters: Skater[] = ROSTER.map(([id, pair, x, side, speed], i) => {
    const key = skSheet(id);
    const shadow = k.img(shadowKey, 0, 0, { into: farC });
    // (the reflection and the rim light play the same frames in step: same start, same steps)
    const ph = i * 3.7;
    const refl = new Loop(k, key, SKN, 0, 0, { into: farC, origin: ORIGIN, fps: 11, phase: ph });
    const loop = new Loop(k, key, SKN, 0, 0, { into: farC, origin: ORIGIN, fps: 11, phase: ph });
    const rim = new Loop(k, key, SKN, 0, 0, { into: farC, origin: ORIGIN, fps: 11, phase: ph, add: true, tint: RIM_COLS[i] });
    return { b: BUILDS[id], key, reach: pair ? skSheet(id, 'reach') : undefined, cur: key, loop, refl, rim, shadow, x, side, speed, wait: 0, lean: new Spring(0, 40, 5), hop: new Spring(0, 90, 9) };
  });
  const place = (s: Skater, into: Phaser.GameObjects.Container) => {
    for (const o of [s.shadow, s.refl.a, s.refl.b, s.loop.a, s.loop.b, s.rim.a, s.rim.b]) {
      if (o.parentContainer !== into) {
        o.parentContainer?.remove(o);
        into.add(o);
      }
    }
  };

  // ——— on the ledge: the skate that rolls, the tokens that hop
  const skateImg = k.pivot(k.sprite('skate'), SKT.x, SKT.y);
  const skX = skateImg.x;
  const skS = new Spring(0, 30, 3.2);
  const skR = new Spring(0, 60, 5);
  const tokKey = sheet(k, 'rk_token', 24, 24, 4, (c, _ph, i) => token(c, 12, 12, 1, [0.3, 0.7, 1, 0.15][i]));
  const tokens = new Parts(k, { frame: 'soft', sheet: { key: tokKey, n: 4, half: 12 }, into: fx, max: 14 });

  // ——— the stage
  let kw = waveK(wave0);
  let shown = kw;
  // a stomp: the lighting desk answers with a strobe hit (in the dark sessions) and the fog puffs up
  const strobe = k.wash(0xe8e0ff, 0, Phaser.BlendModes.ADD, fx);
  let flash = 0;
  let puff = 0;

  return {
    setWave: (w) => (kw = waveK(w)),
    impact(x, y, p) {
      swing.kick((x < BALL.x ? 1 : -1) * (0.8 + crand() * 0.4) * p);
      for (const s of skaters) {
        s.lean.v += (crand() - 0.5) * 2.4 * p;
        s.hop.v -= 40 * p * (0.5 + crand() * 0.5);
      }
      skS.v += (x < SKT.x ? 1 : -1) * 160 * p;
      skR.v += (x < SKT.x ? 1 : -1) * 1.2 * p;
      if (p > 0.35) {
        const n = 2 + Math.round(p * 4);
        for (let i = 0; i < n; i++)
          tokens.spawn({ x: TOK.x + (crand() - 0.5) * 30, y: TOK.y - 6 - crand() * 10, vx: (crand() - 0.5) * 120, vy: -160 - crand() * 220 * p, life: 1.6, r0: 9, a: 1, tint: 0xffffff, grav: 1300, floor: TOK.y + 4 + crand() * 10, bounce: 0.38, spin: (crand() - 0.5) * 14, fade: 0.01 });
      }
      if (p > 0.6) flashAll = 0.25;
      flash = Math.max(flash, 0.25 * p);
      if (p > 0.3) skip = 0.6;
      puff = Math.max(puff, p);
      void y;
    },
    update(dt, t) {
      shown += (kw - shown) * Math.min(1, dt * 0.6);
      flash = Math.max(0, flash - dt);
      puff = Math.max(0, puff - dt * 0.7);
      // the session: 0 all skate, 1 speed skate, 2 couples (fog), 3 last skate (blacklight)
      const sess = shown * 3;
      const houseK = clamp(1 - sess * 0.55, 0, 1) * clamp(1.6 - sess * 0.6, 0, 1);
      const nightK = clamp((sess - 0.15) / 1.6, 0, 1);
      const discoK = clamp((sess - 0.3) / 0.7, 0, 1);
      const fogK = clamp((sess - 1.3) / 0.7, 0, 1);
      const uvK = clamp(sess - 2.3, 0, 0.7) / 0.7;
      gloom.setAlpha(nightK * 0.85 + uvK * 0.15);
      strobe.setAlpha(strobeOk() ? flash * 0.12 * nightK : 0);
      violet.setAlpha(uvK * 0.35);
      uv.setAlpha(uvK * 0.85);
      uvWash.setAlpha(uvK * 0.05);
      pools.setAlpha(houseK);
      for (const h of house) {
        h.lens.setAlpha(houseK);
        h.halo.setAlpha(0.32 * houseK);
        h.cone.setAlpha(0.05 * houseK);
      }

      // ——— the letterboard
      // (each session's board fades in over the one before: the letters change, the board never goes blank)
      for (let i = 1; i < 4; i++) boards[i]!.setAlpha(clamp((sess - i + 0.75) * 2, 0, 1));
      const bc = sess < 0.5 ? 0xff9aa8 : sess < 1.5 ? 0x9ab8ff : sess < 2.5 ? 0xff9ad0 : 0xb89aff;
      boardGlow.setTint(bc).setAlpha(0.08 + nightK * 0.14);

      // ——— the marquee: a slow twinkle in the afternoon, chasing from the speed skate, bright in the dark
      chaseT += dt * (sess < 0.6 ? 2 : sess < 2.5 ? 7 : 4) * calm();
      if (chaseT > 1) {
        chaseT -= 1;
        chase++;
      }
      flashAll = Math.max(0, flashAll - dt);
      bulbs.forEach((bl, i) => {
        let on: number;
        if (flashAll > 0 && strobeOk()) on = Math.sin(t * 50) > 0 ? 1 : 0.2;
        else if (sess < 0.6) on = 0.75 + 0.25 * Math.sin(t * 2 + i * 1.3);
        else on = (i + chase) % 3 === 0 ? 1 : 0.18;
        bl.b.setAlpha(on);
        bl.g.setAlpha(on * (0.35 + nightK * 0.3));
      });
      mqGlow.setAlpha(0.06 + nightK * 0.08);

      // ——— the DJ and the meters
      skip = Math.max(0, skip - dt);
      if (skip > 0) {
        dj.a.setFrame(DJF + (skip > 0.35 ? 0 : 1)).setAlpha(1);
        dj.b.setAlpha(0);
      } else dj.step(dt, 1);
      const beat = Math.max(0, Math.sin(t * P2 * 2.1));
      meterLeds.forEach((m, i) => m.setAlpha(i / 6 < 0.35 + beat * 0.55 + wander(t, i, 3) * 0.1 ? 0.95 : 0.1));
      deckLamp.setAlpha(0.22 + nightK * 0.1);
      // (he's lit by his deck lamp and the console: dimmer, and cooler, as the room goes down)
      const djT = C.GetColor(Math.round(255 - nightK * 90), Math.round(255 - nightK * 110), Math.round(255 - nightK * 50));
      dj.each((im) => im.setTint(djT));

      // ——— the ball
      swing.update(dt, t);
      ball.step(dt, 1 + discoK * 0.6);
      pin.setAlpha(0.12 + discoK * 0.3);
      for (let i = 0; i < glints.length; i++) {
        const g = glints[i];
        const s = stars[i];
        if (g.t < 0) {
          if (crand() < dt * (1 + discoK * 4)) {
            g.t = 0;
            const a = crand() * P2;
            const rr = BALL.r * Math.sqrt(crand()) * 0.85;
            g.img.setPosition(Math.cos(a) * rr - 8, BALL.y - hingeY + Math.sin(a) * rr - 8);
            s.setPosition(g.img.x, g.img.y).setRotation(crand() * 0.6);
          }
          continue;
        }
        g.t += dt;
        const u = g.t / 0.35;
        if (u >= 1) {
          g.t = -1;
          g.img.setAlpha(0);
          s.setAlpha(0);
          continue;
        }
        const a = Math.sin(u * Math.PI);
        g.img.setAlpha(a * 0.7).setScale(0.12 + a * 0.08);
        s.setAlpha(a).setScale(0.4 + a * 0.6);
      }
      const sway = swing.angle;
      const scroll = dt * 34 * (1 + discoK * 0.6) * calm();
      specksWall.tilePositionX -= scroll;
      specksWall.tilePositionY = sway * 400;
      specksFloor.tilePositionX += scroll * 0.7;
      specksFloor.tilePositionY = -sway * 200;
      specksWall.setAlpha(0.08 + discoK * 0.55 + uvK * 0.1);
      specksFloor.setAlpha(0.1 + discoK * 0.5);

      // ——— the beams sweeping through the fog, their spots crossing the floor
      for (const b of beams) {
        const aim = wander(t * 0.35, b.seed, 1) * 0.55 + (b.x < VX ? 0.25 : -0.25);
        b.img.setRotation(aim);
        const len = (600 - b.y) / Math.cos(aim);
        b.img.setScale(1.6, len / 256);
        const col = BEAM_COLS[(b.col + Math.floor(t / 6)) % BEAM_COLS.length];
        b.img.setTint(col);
        b.img.setAlpha(discoK * (0.3 + fogK * 0.5) + flash * 0.3);
        b.lens.setPosition(b.x - Math.sin(aim) * 6, b.y + Math.cos(aim) * 6).setTint(col).setAlpha(discoK * 0.9);
        const ex = b.x - Math.sin(aim) * len;
        b.spot.setPosition(ex, 600).setTint(col).setAlpha(discoK * 0.7);
      }

      // ——— the fog
      const fogTint = C.GetColor(Math.round(200 + 55 * (1 - uvK)), Math.round(180 + 50 * (1 - uvK)), 255);
      fogs.forEach((f, fi) => {
        f.off = (((f.off + f.speed * dt * calm()) % W) + W) % W;
        f.loops.forEach((l, j) => {
          l.alpha = Math.min(1, fogK * (fi ? 0.55 : 0.4) + puff * fogK * 0.3);
          l.step(dt);
          l.each((im) => im.setTint(fogTint).setX(f.off - j * W).setVisible(fogK > 0.01));
        });
      });

      // ——— the skaters
      const pace = sess < 0.5 ? 1 : sess < 1.5 ? 1.45 : sess < 2.5 ? 0.8 : 0.95;
      const lit = C.GetColor(Math.round(255 - nightK * 60 - uvK * 30), Math.round(250 - nightK * 80 - uvK * 40), Math.round(248 - nightK * 20));
      const couple = sess > 1.6 && sess < 2.6;
      skaters.forEach((s, i) => {
        const loops = [s.loop, s.refl, s.rim];
        if (s.wait > 0) {
          s.wait -= dt;
          for (const l of loops) {
            l.alpha = 0;
            l.step(0);
          }
          s.shadow.setVisible(false);
          return;
        }
        // the couples skate: the pair take hands (their own frames), the showboat skating backwards just ahead of
        // her, facing her
        const want = couple && s.reach && skaters[0].wait <= 0 && skaters[1].wait <= 0 ? s.reach : s.key;
        if (want !== s.cur) {
          s.cur = want;
          for (const l of loops) l.each((im) => im.setTexture(want, im.frame.name));
        }
        if (i === 1 && couple && skaters[0].wait <= 0) {
          s.side = skaters[0].side;
          s.x = skaters[0].x + (s.side ? -1 : 1) * 80 * (s.side ? FAR_S : 1);
        }
        const near = s.side === 0;
        const sc0 = near ? 1 : FAR_S;
        const dir = near ? 1 : -1;
        const v = s.speed * pace * sc0;
        // the turn: approaching the end of the straight they bank into the curve and slow a touch
        const toEnd = near ? W - s.x : s.x;
        const bank = clamp(1 - (toEnd + 60) / 320, 0, 1);
        const fromEnd = near ? s.x : W - s.x;
        const exitBank = clamp(1 - (fromEnd + 60) / 260, 0, 1);
        const turn = Math.max(bank, exitBank);
        s.x += dir * v * dt * (1 - turn * 0.15);
        if (near && s.x > W + 90) {
          s.side = 1;
          s.x = W + 60;
          s.wait = 0.8 + crand() * 0.6;
        } else if (!near && s.x < -70) {
          s.side = 0;
          s.x = -80;
          s.wait = 1.1 + crand() * 0.8;
        }
        place(s, near ? nearC : farC);
        const base = near ? RK.nearY : RK.farY;
        const hop = Math.min(0, s.hop.step(0, dt));
        const lean = s.lean.step(0, dt) * 0.25 + dir * turn * 0.12;
        const face = s.b.back ? -dir : dir;
        const k0 = sc0 / SK.k;
        const shrink = 1 - turn * 0.06;
        s.loop.alpha = 1;
        s.refl.alpha = near ? 0.2 : 0.16;
        s.rim.alpha = nightK * 0.22 + discoK * 0.08;
        // (a longer stride turns over slower; the kid's short steps patter)
        const cadence = (v / (240 * sc0)) * 0.95 / Math.sqrt(s.b.stride);
        for (const l of loops) l.step(dt, cadence);
        s.loop.each((im) => im.setPosition(s.x, base + hop).setScale(k0 * face * shrink, k0 * shrink).setRotation(lean).setTint(lit));
        s.rim.each((im) => im.setPosition(s.x - 1.6 * dir, base + hop - 1.2).setScale(k0 * face * shrink, k0 * shrink).setRotation(lean));
        s.refl.each((im) => im.setPosition(s.x, base + 2).setScale(k0 * face * shrink, -k0 * 0.9 * shrink).setRotation(-lean).setTint(0x8a6a5a));
        s.shadow.setVisible(true).setPosition(s.x + 4 * sc0, base + 1).setScale(sc0 * 1.2 * s.b.s, sc0).setAlpha(0.7 + hop / 40);
      });

      // ——— on the ledge
      skateImg.x = skX + skS.step(0, dt);
      skateImg.rotation = skR.step(0, dt) * 0.03;
      tokens.update(dt);
    },
  };
});
