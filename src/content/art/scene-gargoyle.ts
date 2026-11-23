// The Bell Tower (the Gargoyle's arena, wave 40), redrawn with the location kit (src/art/scene): up in the belfry of
// the old town's campanile (the tower behind the roof terrace, scene-oldtown.ts) with the storm that rolled in over
// the rooftops right on top of it. Dressed stone, the twin arches of the tower's face open on the night (their deep
// reveals, the sills wet), the town far below in the rain with its lit windows and the duomo; the bronze bell on its
// oak headstock and wheel, hung from the frame beam in an iron bearing, its rope down the pier; a carved grotesque
// crouched on a pedestal at each end of the sill course (weathered limestone: washed pale where the rain runs, black
// crust where it doesn't, moss on everything that faces the sky); an iron lantern on a chain; worn flags underfoot.
// Live (hero animations): the bell swings with real weight on its gudgeons, its wheel turning and its rope paying
// out and hauling in with it, the clapper swinging on its own beat inside it, so a stomp sets it going and the
// clapper catches the sound bow and the bell rings (a shiver through the bronze, the ring spreading through the air,
// grit off the frame, the pigeons up); lightning forks in the arches, the clouds lit from inside, the arches thrown
// across the floor and the bell and the statues caught cold and white; rain sheets sweep through the arches in
// painted frames, drips fall from the arches' crowns and splash on the sills in painted crowns. The lantern swings
// on its chain and gutters; pigeons shelter on the sills, scatter into the rain and come back.

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
  jitter,
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
import { aoHalo, bounceBand } from '../../art/scene/light';
import { tableFalloff, tableSeam, woodGrain } from '../../art/scene/materials';
import { chips, crack, drift, lay, noiseMask, softly, streaks, surface } from '../../art/scene/paint';
import { hang } from '../../art/scene/props';
import { cloud, farLand, skyFill } from '../../art/scene/sky';
import { ashlar, floorPlane } from '../../art/scene/surfaces';
import { crease, innerEdge, spec as specHi } from '../../art/style/kit';
import { MATERIALS } from '../../art/style/materials';
import { makeCanvas, mix, rgba, shade } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { save } from '../../systems/save';
import { calm, flicker, registerKitScene } from '../../game/sceneLive';
import { Loop, Parts, Rate, Swing, flameFrame, sheet } from '../../game/sceneAnim';
import { BOLT, PIGEON, boltFrame, pigeonFrame } from './scene-oldtown';

// ——— layout ———

export const BTX = {
  /** The bell frame's top beam across the belfry. */
  beam: { y0: 10, y1: 62 },
  /** The tower's twin arches (their near face): spring line, sill top. */
  arches: [{ x0: 300, x1: 800 }, { x0: 1120, x1: 1620 }],
  spring: 390,
  sill: 606,
  /** The sill course's front face runs across the whole wall below the arches. */
  course: 640,
  /** The bell swings on its gudgeons about the axle; the wheel turns with it. */
  axle: { x: 960, y: 170 },
  wheelR: 104,
  bell: { crown: 198, lip: 424, r: 148 },
  /** The clapper hangs from the crown's staple. */
  clapper: { y: 214, len: 208 },
  /** The rope comes off the wheel's rim and hangs down the pier. */
  rope: { y1: 742 },
  /** The grotesques' pedestals (top centre) at the ends of the sill course. */
  gargoyles: [{ x: 128, dir: 1 }, { x: 1792, dir: -1 }],
  plinthTop: 566,
  /** The lantern hangs on a chain from the beam. */
  lantern: { x: 206, top: 118 },
  front: 1040,
};

const A_R = (BTX.arches[0].x1 - BTX.arches[0].x0) / 2;
const CROWN = BTX.spring - A_R;
/** How much nearer the vanishing point the arches' far (outer) face is: the wall's thickness seen in perspective. */
const DEEP = 0.9;
const VPX = 960;
const VPY = 300;
const far = (x: number, y: number): [number, number] => [VPX + (x - VPX) * DEEP, VPY + (y - VPY) * DEEP];

/** An arch's opening (inset px), near face or far face. */
const archPath = (a: { x0: number; x1: number }, deep = false, inset = 0) => (c: Ctx) => {
  let [x0, sp] = [a.x0, BTX.spring];
  let x1 = a.x1;
  let sill = BTX.sill;
  let r = A_R;
  if (deep) {
    [x0, sp] = far(a.x0, BTX.spring);
    x1 = far(a.x1, 0)[0];
    sill = far(0, BTX.sill)[1];
    r = A_R * DEEP;
  }
  const cx = (x0 + x1) / 2;
  c.moveTo(x0 + inset, sill);
  c.lineTo(x0 + inset, sp);
  c.arc(cx, sp, r - inset, Math.PI, 0);
  c.lineTo(x1 - inset, sill);
  c.closePath();
};
const openings = (deep: boolean) => (c: Ctx) => {
  c.beginPath();
  for (const a of BTX.arches) archPath(a, deep)(c);
};
/** The arches' bounding box (near face): the town, the rain, the lightning. */
const ARCH_BOX = { x: BTX.arches[0].x0, y: CROWN, w: BTX.arches[1].x1 - BTX.arches[0].x0, h: BTX.sill - CROWN };
const FAR_SILL = far(0, BTX.sill)[1];
const HORIZON = 330;

/** The night outside: violet-grey rain air, thick. */
const NIGHT: Air = { color: '#2c3054', far: 0.72 };
/** Dressed limestone gone grey: cool, a little warm where the lantern reaches. */
const STONE = ['#7a7682', '#716d7a', '#827e88', '#6b6874', '#7c7680', '#76727c'];
const MORTAR = '#36323c';
const LIME = { ...MATERIALS.stone, name: 'Weathered limestone', shadowTint: '#0c0c1c', tex: 'grain' as const, texA: 0.32, bevel: 0.14, rim: 0.14, specA: 0.04 };
const BRONZE = { ...MATERIALS.chrome, name: 'Bell bronze', shadowTint: '#1a0a02', ramp: 0.85, form: 0.75, bevel: 0.16, tex: 'cast' as const, texA: 0.28, specA: 0.22, specSize: 0.16, rim: 0.3 };
const OAK = '#3e2a1c';
const IRON = '#2c2a30';
const LAMP = '#ffb45a';

// ——— the night outside (through the far face of the arches) ———

/** The storm's banks: x, base y, w, h. */
const CLOUDS: [number, number, number, number][] = [
  [420, 206, 420, 90],
  [700, 250, 360, 70],
  [520, 290, 520, 64],
  [1220, 214, 400, 96],
  [1470, 246, 380, 80],
  [1300, 300, 560, 58],
];

function sky(ctx: Ctx, r: R): void {
  within(ctx, openings(true), () => {
    const b = ARCH_BOX;
    skyFill(ctx, { x: b.x, y: b.y, w: b.w, h: HORIZON - b.y + 20 }, [[0, '#06081a'], [0.45, '#121732'], [0.8, '#22264a'], [1, '#2e2c4c']], 0.05);
    // the moon somewhere above the left arch, behind the cloud: its light silvers the banks' tops
    glowAt(ctx, 520, 150, 260, '#b8c8ff', 0.16);
    for (const [x, y, w, h] of CLOUDS)
      cloud(ctx, r, x, y, w, h, { kind: 'bank', lit: '#7e88b4', body: '#262a46', shadow: '#0a0c1a', sunX: 520, sunY: 40, rim: 0.35, wisp: 0.45, a: 0.92, res: 0.4 });
    // rain hanging under the cloud in grey veils, slanting with the wind
    softly(ctx, { x: b.x, y: 180, w: b.w, h: HORIZON - 150 }, (g) => {
      for (let i = 0; i < 9; i++) {
        const x = b.x + 40 + r() * (b.w - 80);
        const y0 = 220 + r() * 40;
        const gg = g.createLinearGradient(0, y0, 0, HORIZON + 20);
        gg.addColorStop(0, 'rgba(120,128,170,0)');
        gg.addColorStop(0.4, 'rgba(120,128,170,0.22)');
        gg.addColorStop(1, 'rgba(120,128,170,0.1)');
        g.fillStyle = gg;
        g.beginPath();
        const w = 60 + r() * 90;
        g.moveTo(x, y0);
        g.lineTo(x + w, y0);
        g.lineTo(x + w - 46, HORIZON + 20);
        g.lineTo(x - 46, HORIZON + 20);
        g.closePath();
        g.fill();
      }
    }, 0.25);
    town(ctx, r);
  });
}

/** Stucco fronts by night, and their roofs. */
const FRONTS = ['#d89a6a', '#c4a0b2', '#d8b088', '#b88a9a', '#e0b890', '#a892b2'];
const ROOF = '#9a5038';

/** The town under the rain, seen from high up: hills on the horizon, rows of houses getting bigger towards the
 * tower's foot, their roofs wet, a few windows lit, the duomo in the right arch, a lit street in the left. */
function town(ctx: Ctx, r: R): void {
  const b = ARCH_BOX;
  // the hills on the horizon, the plain, the town's glow under the cloud
  farLand(ctx, [[b.x, HORIZON + 4], [b.x + 120, HORIZON - 14], [b.x + 300, HORIZON - 6], [b.x + 520, HORIZON - 24], [b.x + 700, HORIZON - 10], [b.x + 900, HORIZON - 20], [b.x + 1100, HORIZON - 8], [b.x + b.w, HORIZON - 16]], HORIZON + 10, '#2a2846', 0.85, NIGHT, '#6a70a0', 0.25);
  vfill(ctx, b.x, HORIZON + 4, b.w, BTX.sill - HORIZON, [[0, airMix('#24203a', 0.8, NIGHT)], [1, '#120f1e']]);
  lightPool(ctx, 960, HORIZON + 40, 700, 70, '#ff9a5a', 0.1);
  // the horizon: a paler band of rain-lit air where the land meets the cloud
  haze(ctx, HORIZON - 40, HORIZON + 26, '#5a5c8a', 0.4, 0.7, b.x, b.x + b.w);
  const rows = [
    { y: 352, s: 0.3, d: 0.86 },
    { y: 370, s: 0.38, d: 0.78 },
    { y: 394, s: 0.5, d: 0.68 },
    { y: 424, s: 0.64, d: 0.56 },
    { y: 462, s: 0.8, d: 0.45 },
    { y: 508, s: 1, d: 0.34 },
    { y: 562, s: 1.24, d: 0.22 },
    { y: 626, s: 1.5, d: 0.12 },
  ];
  rows.forEach((row, i) => {
    if (i === 5) duomo(ctx, r);
    if (i === 4) street(ctx, r);
    for (let x = b.x - 40 - r() * 60; x < b.x + b.w + 40; ) {
      const w = (50 + r() * 60) * row.s;
      house(ctx, r, x, row.y + (r() - 0.5) * 8 * row.s, w, row.s, row.d);
      x += w * (0.86 + r() * 0.1);
    }
  });
  // the streets below fall into the dark under the rain; only the windows hold
  vfill(ctx, b.x, 430, b.w, BTX.sill - 430, [[0, 'rgba(8,8,20,0)'], [1, 'rgba(8,8,20,0.5)']]);
  // the rain's air over all of it, thickest far off
  haze(ctx, HORIZON - 10, 500, '#3a3c66', 0.55, 0.15, b.x, b.x + b.w);
  haze(ctx, 420, BTX.sill, '#262846', 0.3, 0.5, b.x, b.x + b.w);
}

function house(ctx: Ctx, r: R, x: number, y: number, w: number, s: number, d: number): void {
  const fh = (34 + r() * 30) * s;
  const rh = (18 + r() * 10) * s;
  const front = shade(airMix(FRONTS[Math.floor(r() * FRONTS.length)], d, NIGHT), -0.5);
  const roof = shade(airMix(jitter(ROOF, r, 0.06), d, NIGHT), -0.6);
  const top = y - fh;
  // the front, darker towards the street
  const fg = ctx.createLinearGradient(0, top, 0, y);
  fg.addColorStop(0, front);
  fg.addColorStop(1, shade(front, -0.35));
  ctx.fillStyle = fg;
  ctx.fillRect(x, top, w, fh);
  // its windows: most shuttered, some lit
  const cols = Math.max(1, Math.round(w / (20 * s)));
  const rowsN = Math.max(1, Math.floor(fh / (20 * s)));
  for (let j = 0; j < rowsN; j++)
    for (let i = 0; i < cols; i++) {
      const wx = x + (i + 0.5) * (w / cols) - 3.5 * s;
      const wy = top + 7 * s + j * 20 * s;
      if (wy + 10 * s > y - 3 * s) continue;
      const lit = r() < 0.1;
      if (lit) glowAt(ctx, wx + 3.5 * s, wy + 5 * s, 16 * s, '#ffa850', 0.3 * (1 - d * 0.5));
      ctx.fillStyle = lit ? mix('#ffc070', NIGHT.color, d * 0.35) : shade(front, -0.45);
      ctx.fillRect(wx, wy, 7 * s, 10 * s);
      if (!lit && r() < 0.6) {
        ctx.fillStyle = rgba(airMix('#2a4a3a', d, NIGHT), 0.8);
        ctx.fillRect(wx - 2.5 * s, wy, 2.5 * s, 10 * s);
        ctx.fillRect(wx + 7 * s, wy, 2.5 * s, 10 * s);
      }
    }
  // the roof seen from above: its near slope a trapezoid, the channels of the coppi running down it, the ridge wet
  const o = 4 * s;
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(x - o, top + 1);
  ctx.lineTo(x + w * 0.12, top - rh);
  ctx.lineTo(x + w * 0.88, top - rh);
  ctx.lineTo(x + w + o, top + 1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgba(shade(roof, -0.4), 0.6);
  ctx.lineWidth = Math.max(0.6, 1.1 * s);
  ctx.beginPath();
  for (let k = x + 5 * s; k < x + w; k += 6 * s) {
    const kt = x + w * 0.12 + ((k - x) / w) * w * 0.76;
    ctx.moveTo(kt, top - rh + 1);
    ctx.lineTo(k, top);
  }
  ctx.stroke();
  // the wet: the ridge and the tiles' backs catching the sky
  ctx.strokeStyle = rgba('#a8b4e0', 0.35 * (1 - d * 0.6));
  ctx.lineWidth = Math.max(0.8, 1.4 * s);
  ctx.beginPath();
  ctx.moveTo(x + w * 0.12, top - rh);
  ctx.lineTo(x + w * 0.88, top - rh);
  ctx.stroke();
  ctx.fillStyle = rgba('#8a94c8', 0.1 * (1 - d * 0.5));
  ctx.beginPath();
  ctx.moveTo(x + w * 0.12, top - rh);
  ctx.lineTo(x + w * 0.88, top - rh);
  ctx.lineTo(x + w * 0.92, top - rh * 0.6);
  ctx.lineTo(x + w * 0.08, top - rh * 0.6);
  ctx.closePath();
  ctx.fill();
  // eaves' shadow on the front
  ctx.fillStyle = 'rgba(6,4,12,0.4)';
  ctx.fillRect(x, top, w, 3 * s);
  if (s > 0.7 && r() < 0.35) {
    // a chimney
    const cx = x + w * (0.3 + r() * 0.4);
    ctx.fillStyle = shade(front, -0.2);
    ctx.fillRect(cx, top - rh - 12 * s, 7 * s, 12 * s + rh * 0.4);
    ctx.fillStyle = roof;
    ctx.fillRect(cx - 1.5 * s, top - rh - 14 * s, 10 * s, 3 * s);
  }
}

/** The duomo in the right arch: drum, ribbed dome and lantern, wet and catching the storm light. */
function duomo(ctx: Ctx, r: R): void {
  const x = 1452;
  const base = 500;
  const rr = 74;
  const d = 0.42;
  const body = shade(airMix('#9a88a6', d * 0.7, NIGHT), -0.2);
  // the drum, windows lit
  ctx.fillStyle = shade(body, -0.1);
  ctx.fillRect(x - rr - 6, base - 46, rr * 2 + 12, 46);
  for (let i = 0; i < 7; i++) {
    const wx = x - rr + 8 + i * ((rr * 2 - 16) / 6);
    ctx.fillStyle = i % 3 === 1 ? '#c88a50' : shade(body, -0.5);
    ctx.beginPath();
    ctx.roundRect(wx - 4, base - 38, 8, 20, [4, 4, 0, 0]);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(8,6,14,0.45)';
  ctx.fillRect(x - rr - 6, base - 46, rr * 2 + 12, 5);
  // the dome
  const top = base - 46;
  const dome = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x - rr, top);
    c.bezierCurveTo(x - rr, top - rr * 0.9, x - rr * 0.35, top - rr * 1.2, x, top - rr * 1.22);
    c.bezierCurveTo(x + rr * 0.35, top - rr * 1.2, x + rr, top - rr * 0.9, x + rr, top);
    c.closePath();
  };
  const dg = ctx.createLinearGradient(x - rr, 0, x + rr, 0);
  dg.addColorStop(0, shade(body, 0.12));
  dg.addColorStop(0.45, body);
  dg.addColorStop(1, shade(body, -0.4));
  ctx.fillStyle = dg;
  dome(ctx);
  ctx.fill();
  within(ctx, dome, () => {
    // the ribs, catching the light where they turn to the moon
    for (let i = -4; i <= 4; i++) {
      const u = i / 4.4;
      ctx.strokeStyle = rgba(i < 0 ? '#c8c4e8' : '#0a0814', i < 0 ? 0.3 : 0.4);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + u * rr, top);
      ctx.quadraticCurveTo(x + u * rr * 0.92, top - rr * 0.95, x, top - rr * 1.22);
      ctx.stroke();
    }
    // the wet sheen: a cold highlight down the lit side
    const sg = ctx.createLinearGradient(x - rr, 0, x, 0);
    sg.addColorStop(0, 'rgba(170,180,230,0)');
    sg.addColorStop(0.5, 'rgba(170,180,230,0.22)');
    sg.addColorStop(1, 'rgba(170,180,230,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(x - rr, top - rr * 1.3, rr, rr * 1.3);
  });
  ctx.strokeStyle = 'rgba(8,6,14,0.6)';
  ctx.lineWidth = 2;
  dome(ctx);
  ctx.stroke();
  // the lantern and its cross
  ctx.fillStyle = shade(body, -0.05);
  ctx.fillRect(x - 10, top - rr * 1.22 - 26, 20, 26);
  ctx.beginPath();
  ctx.moveTo(x - 12, top - rr * 1.22 - 26);
  ctx.lineTo(x, top - rr * 1.22 - 44);
  ctx.lineTo(x + 12, top - rr * 1.22 - 26);
  ctx.fill();
  ctx.fillStyle = '#c88a50';
  ctx.fillRect(x - 3, top - rr * 1.22 - 20, 6, 12);
  ctx.strokeStyle = shade(body, -0.2);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, top - rr * 1.22 - 44);
  ctx.lineTo(x, top - rr * 1.22 - 58);
  ctx.moveTo(x - 5, top - rr * 1.22 - 53);
  ctx.lineTo(x + 5, top - rr * 1.22 - 53);
  ctx.stroke();
  void r;
}

/** A lit street in the left arch: a line of lamps and their wet reflections, a piazza's glow. */
function street(ctx: Ctx, r: R): void {
  const pts: [number, number][] = [];
  for (let i = 0; i < 9; i++) pts.push([360 + i * 52 + r() * 14, 446 + i * 3.2]);
  for (const [x, y] of pts) {
    glowAt(ctx, x, y, 26, '#ffb060', 0.35);
    ctx.fillStyle = '#ffe0a8';
    ctx.fillRect(x - 1.2, y - 1.2, 2.4, 2.4);
    // a long broken reflection on the wet stones
    ctx.fillStyle = 'rgba(255,170,90,0.16)';
    ctx.fillRect(x - 1, y + 4, 2, 14);
  }
}

// ——— the belfry ———

/** The tower's stone: dressed blocks, the arches cut through, their deep reveals, voussoirs and quoins, the sill course,
 * the wall below; the lantern's light and the storm's on it; wear. */
function walls(ctx: Ctx, r: R): void {
  // the near face of the wall, the openings cut out (even-odd: nothing inside the arches)
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, TY);
  for (const a of BTX.arches) archPath(a)(ctx);
  ctx.clip('evenodd');
  ashlar(ctx, r, { x: 0, y: 0, w: W, h: TY }, STONE, MORTAR, { rowH: 54, minW: 96, maxW: 196, weather: 0.8, moss: '#4a6a3e', mossA: 0.3, seed: 19 });
  surface(ctx, r, { x: 0, y: 0, w: W, h: TY }, '#6a6672', { over: true, vary: 0.5, mottle: 0.4, strokes: 0.12, grain: 0, seed: 23 });
  // the room's dark: deep up under the frame, lighter round the arches where the storm's light comes in
  vfill(ctx, 0, 0, W, TY, [[0, 'rgba(6,6,18,0.84)'], [0.25, 'rgba(6,6,18,0.6)'], [0.7, 'rgba(6,6,18,0.54)'], [1, 'rgba(6,6,18,0.66)']]);
  // and falling away from the lantern into the dark on the right
  const fall = ctx.createLinearGradient(420, 0, W, 0);
  fall.addColorStop(0, 'rgba(6,6,18,0)');
  fall.addColorStop(1, 'rgba(6,6,18,0.3)');
  ctx.fillStyle = fall;
  ctx.fillRect(0, 0, W, TY);
  // the corners darkest, away from both lights
  const cg = ctx.createLinearGradient(1620, 0, W, 0);
  cg.addColorStop(0, 'rgba(4,4,12,0)');
  cg.addColorStop(1, 'rgba(4,4,12,0.38)');
  ctx.fillStyle = cg;
  ctx.fillRect(1620, 0, 300, TY);
  for (const a of BTX.arches) lightPool(ctx, (a.x0 + a.x1) / 2, BTX.spring + 60, 420, 300, '#5a6aa8', 0.1, 'screen');
  // stains: rain blown in and run down under each sill, the wall below green with it
  for (const a of BTX.arches) {
    for (let i = 0; i < 5; i++) streaks(ctx, r, a.x0 + 30 + i * ((a.x1 - a.x0 - 60) / 4), BTX.course + 2, 70, 110, '#141e16', 0.28, 4);
    vfill(ctx, a.x0 - 20, BTX.course, a.x1 - a.x0 + 40, TY - BTX.course, [[0, 'rgba(30,50,34,0.22)'], [1, 'rgba(30,50,34,0.05)']]);
  }
  // soot over the lantern
  softly(ctx, { x: BTX.lantern.x - 120, y: BTX.beam.y1, w: 240, h: 140 }, (g) => {
    const sg = g.createRadialGradient(BTX.lantern.x, BTX.lantern.top - 10, 0, BTX.lantern.x, BTX.lantern.top - 10, 100);
    sg.addColorStop(0, 'rgba(10,8,10,0.5)');
    sg.addColorStop(1, 'rgba(10,8,10,0)');
    g.fillStyle = sg;
    g.fillRect(BTX.lantern.x - 120, BTX.beam.y1, 240, 140);
  }, 0.25);
  // cracks where the stress gathers: off the arches' haunches, over the pier
  const cr = { col: '#100e18', lip: '#b8b8d0', w: 1.6, a: 0.55 };
  crack(ctx, r, BTX.arches[0].x1 + 16, CROWN + 70, -0.9, 80, cr);
  crack(ctx, r, BTX.arches[1].x0 - 16, CROWN + 80, -2.3, 70, cr);
  crack(ctx, r, 960, BTX.course + 40, -1.6, 50, cr);
  crack(ctx, r, 70, BTX.spring - 40, -1.2, 60, cr);
  grimeEdge(ctx);
  ctx.restore();
  for (const a of BTX.arches) reveal(ctx, r, a);
  for (const a of BTX.arches) archStones(ctx, r, a);
  sillCourse(ctx, r);
  // the warm lantern's light on the wall round it and the cold arches' light on the piers (added, in the base)
  lightPool(ctx, BTX.lantern.x + 60, BTX.lantern.top + 170, 620, 560, LAMP, 0.2);
  lightPool(ctx, BTX.lantern.x + 20, BTX.lantern.top + 120, 400, 380, LAMP, 0.2);
  lightPool(ctx, BTX.lantern.x, BTX.lantern.top + 60, 160, 150, '#ffd090', 0.16);
}

/** The wall's grime: damp up from the floor, dark under the frame. */
function grimeEdge(ctx: Ctx): void {
  vfill(ctx, 0, TY - 70, W, 70, [[0, 'rgba(6,8,10,0)'], [1, 'rgba(6,8,10,0.5)']]);
  vfill(ctx, 0, BTX.beam.y1, W, 60, [[0, 'rgba(4,4,10,0.5)'], [1, 'rgba(4,4,10,0)']]);
}

/** The thickness of the wall inside an arch: the jamb's face, the soffit overhead, the sill underfoot. */
function reveal(ctx: Ctx, r: R, a: { x0: number; x1: number }): void {
  ctx.save();
  ctx.beginPath();
  archPath(a)(ctx);
  archPath(a, true)(ctx);
  ctx.clip('evenodd');
  const b = { x: a.x0, y: CROWN, w: a.x1 - a.x0, h: BTX.sill - CROWN };
  surface(ctx, r, b, '#5a5866', { vary: 0.5, mottle: 0.5, strokes: 0.3, strokeAng: Math.PI / 2, grain: 0.3, grainKind: 'stone', seed: Math.round(a.x0) });
  // courses running back into the wall (joints in perspective, towards the vanishing point)
  ctx.strokeStyle = 'rgba(16,14,24,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let y = BTX.spring + 30; y < BTX.sill; y += 54) {
    const [fx, fy] = far(a.x0, y);
    ctx.moveTo(a.x0, y);
    ctx.lineTo(fx, fy);
    const [gx, gy] = far(a.x1, y);
    ctx.moveTo(a.x1, y);
    ctx.lineTo(gx, gy);
  }
  for (let k = 1; k < 12; k++) {
    const t = Math.PI + (k / 12) * Math.PI;
    const nx = (a.x0 + a.x1) / 2 + Math.cos(t) * A_R;
    const ny = BTX.spring + Math.sin(t) * A_R;
    const [fx, fy] = far(nx, ny);
    ctx.moveTo(nx, ny);
    ctx.lineTo(fx, fy);
  }
  ctx.stroke();
  // light: the soffit overhead in deep shadow, the jamb cool with the storm's light, the sill's top lit
  const cx = (a.x0 + a.x1) / 2;
  const sg = ctx.createLinearGradient(0, CROWN, 0, BTX.sill);
  sg.addColorStop(0, 'rgba(4,4,12,0.75)');
  sg.addColorStop(0.45, 'rgba(4,4,12,0.4)');
  sg.addColorStop(0.9, 'rgba(4,4,12,0.2)');
  sg.addColorStop(1, 'rgba(4,4,12,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  const jg = ctx.createLinearGradient(a.x0, 0, cx, 0);
  jg.addColorStop(0, 'rgba(120,136,200,0)');
  jg.addColorStop(1, 'rgba(120,136,200,0.16)');
  ctx.fillStyle = jg;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  // rain blown in: the reveal's foot darker and green, wet streaks down it
  streaks(ctx, r, a.x0 + 30, BTX.spring - 40, 50, 200, '#0e1a14', 0.3, 4);
  streaks(ctx, r, a.x1 - 30, BTX.spring - 40, 50, 200, '#0e1a14', 0.3, 4);
  ctx.restore();
  // the sill's top: the stone slab the pigeons stand on, wet, pooled, the sky in it
  const [fx0] = far(a.x0, 0);
  const [fx1] = far(a.x1, 0);
  const slab = polyPath([[a.x0, BTX.sill], [fx0, FAR_SILL], [fx1, FAR_SILL], [a.x1, BTX.sill]]);
  within(ctx, archPath(a), () => {
    within(ctx, slab, () => {
      surface(ctx, r, { x: a.x0, y: FAR_SILL, w: a.x1 - a.x0, h: BTX.sill - FAR_SILL }, '#6c6a76', { vary: 0.4, strokes: 0.4, grain: 0.3, grainKind: 'stone', seed: 7 + Math.round(a.x0) });
      vfill(ctx, a.x0, FAR_SILL, a.x1 - a.x0, BTX.sill - FAR_SILL, [[0, 'rgba(140,150,200,0.3)'], [0.5, 'rgba(100,110,160,0.08)'], [1, 'rgba(6,6,14,0.2)']]);
      // a film of water over it holding the sky: soft sheets of cold light, broken where the stone stands proud
      softly(ctx, { x: a.x0, y: FAR_SILL, w: a.x1 - a.x0, h: BTX.sill - FAR_SILL }, (g) => {
        for (let i = 0; i < 5; i++) {
          const px = fx0 + 30 + r() * (fx1 - fx0 - 60);
          const py = FAR_SILL + 6 + r() * 18;
          const pw = 30 + r() * 50;
          const pg = g.createRadialGradient(px, py, 0, px, py, pw);
          pg.addColorStop(0, 'rgba(150,164,224,0.3)');
          pg.addColorStop(1, 'rgba(150,164,224,0)');
          g.save();
          g.translate(px, py);
          g.scale(1, 0.14);
          g.translate(-px, -py);
          g.fillStyle = pg;
          g.fillRect(px - pw, py - pw, pw * 2, pw * 2);
          g.restore();
        }
      }, 0.5);
      // moss in the joint at the back, where the water sits
      lay(ctx, noiseMask(8, 41 + Math.round(a.x0), { cover: 0.4, soft: 0.25, col: '#3e5a34', w: 128, h: 16 }), { x: fx0, y: FAR_SILL - 2, w: fx1 - fx0, h: 10 }, 0.7);
    });
    crevice(ctx, fx0, fx1, FAR_SILL, 8, 0.55, '#04040c');
  });
}

/** The ring of voussoirs round an arch, its keystone, the quoins down its jambs and the impost blocks. */
function archStones(ctx: Ctx, r: R, a: { x0: number; x1: number }): void {
  const cx = (a.x0 + a.x1) / 2;
  const n = 15;
  const ring: { p: PathFn; key: boolean; i: number }[] = [];
  for (let i = 0; i < n; i++) {
    const t0 = Math.PI + (i / n) * Math.PI;
    const t1 = Math.PI + ((i + 1) / n) * Math.PI;
    const key = i === Math.floor(n / 2);
    const ro = A_R + (key ? 60 : 44 + (i % 2) * 6);
    const g = 1.5;
    const pts: [number, number][] = [
      [cx + Math.cos(t0) * A_R, BTX.spring + Math.sin(t0) * A_R],
      [cx + Math.cos(t0) * ro, BTX.spring + Math.sin(t0) * ro],
      [cx + Math.cos(t1) * ro, BTX.spring + Math.sin(t1) * ro],
      [cx + Math.cos(t1) * A_R, BTX.spring + Math.sin(t1) * A_R],
    ];
    // a hair of mortar between them
    pts[0][0] += Math.cos(t0 + Math.PI / 2) * g;
    pts[1][0] += Math.cos(t0 + Math.PI / 2) * g;
    pts[2][0] -= Math.cos(t1 + Math.PI / 2) * g;
    pts[3][0] -= Math.cos(t1 + Math.PI / 2) * g;
    ring.push({ p: polyPath(pts), key, i });
  }
  const ringAll = (c: Ctx) => {
    c.beginPath();
    c.arc(cx, BTX.spring, A_R + 62, Math.PI, 0);
    c.lineTo(cx + A_R, BTX.spring);
    c.arc(cx, BTX.spring, A_R, 0, Math.PI, true);
    c.closePath();
  };
  castShadow(ctx, ringAll, 8, 10, 0.4, '#04040c');
  for (const v of ring) {
    const t = Math.PI + ((v.i + 0.5) / n) * Math.PI;
    const ro = A_R + (v.key ? 60 : 50);
    const vx = cx + Math.cos(t) * (A_R + ro) / 2;
    const vy = BTX.spring + Math.sin(t) * (A_R + ro) / 2;
    solid(ctx, v.p, { x: vx - 40, y: vy - 40, w: 80, h: 80 }, LIME, jitter(shade(STONE[v.i % STONE.length], v.key ? -0.02 : -0.06), r, 0.05), { depth: 0.1, line: 2, formSize: 16 });
  }
  // the ring's weathering: its top stones washed pale, black crust under the soffit's lip, moss on the extrados
  within(ctx, ringAll, () => {
    lay(ctx, noiseMask(7, 5 + Math.round(a.x0), { cover: 0.35, soft: 0.2, col: '#0c0a12', w: 96, h: 48 }), { x: a.x0 - 70, y: CROWN - 70, w: a.x1 - a.x0 + 140, h: A_R + 70 }, 0.28);
    vfill(ctx, a.x0 - 70, CROWN - 70, a.x1 - a.x0 + 140, A_R + 70, [[0, 'rgba(4,4,12,0.4)'], [0.5, 'rgba(4,4,12,0.1)'], [1, 'rgba(4,4,12,0)']]);
  });
  // the intrados: a dark lip where the soffit turns under
  ctx.save();
  ctx.strokeStyle = 'rgba(4,4,12,0.55)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, BTX.spring, A_R + 1.5, Math.PI, 0);
  ctx.stroke();
  ctx.restore();
  // a carved keystone boss: a little rosette
  const kx = cx;
  const ky = CROWN - 30;
  ctx.save();
  for (let k = 0; k < 8; k++) {
    const t = (k / 8) * Math.PI * 2;
    crease(ctx, (c) => {
      c.moveTo(kx, ky);
      c.lineTo(kx + Math.cos(t) * 11, ky + Math.sin(t) * 11);
    }, 2, '#100e18', 0.5, 0.25);
  }
  ctx.restore();
  // quoins down each jamb from the spring to the sill: long and short, a hair proud of the wall
  for (const side of [-1, 1]) {
    const x = side < 0 ? a.x0 : a.x1;
    for (let y = BTX.spring, k = 0; y < BTX.sill - 4; k++) {
      const h = 52;
      const w = k % 2 ? 34 : 50;
      const bx = side < 0 ? x - w : x;
      const q = rectPath(bx + 1, y + 1.5, w - 2, Math.min(h, BTX.sill - y) - 3);
      castShadow(ctx, q, 4, 5, 0.35, '#04040c');
      solid(ctx, q, { x: bx, y, w, h }, LIME, jitter(shade(STONE[(k + (side > 0 ? 2 : 0)) % STONE.length], -0.08), r, 0.05), { depth: 0.1, line: 1.8, formSize: 12 });
      y += h;
    }
    // the impost: a moulded block at the spring line
    const ix = side < 0 ? x - 62 : x - 4;
    const imp = (c: Ctx) => {
      c.beginPath();
      c.moveTo(ix, BTX.spring - 14);
      c.lineTo(ix + 66, BTX.spring - 14);
      c.lineTo(ix + 66, BTX.spring - 4);
      c.quadraticCurveTo(ix + 66 - side * 4, BTX.spring + 4, ix + 66 - (side > 0 ? 8 : 0), BTX.spring + 6);
      c.lineTo(ix + (side < 0 ? 8 : 0), BTX.spring + 6);
      c.quadraticCurveTo(ix, BTX.spring + 4, ix, BTX.spring - 4);
      c.closePath();
    };
    castShadow(ctx, imp, 8, 8, 0.45, '#04040c');
    solid(ctx, imp, { x: ix, y: BTX.spring - 14, w: 66, h: 20 }, LIME, '#706c78', { depth: 0.1, line: 2, formSize: 8 });
  }
}

/** The sill course: a projecting band of stone across the wall, the arches' sills its top, with a drip under it. */
function sillCourse(ctx: Ctx, r: R): void {
  const y0 = BTX.sill;
  const y1 = BTX.course;
  const band = rectPath(-4, y0, W + 8, y1 - y0);
  castShadow(ctx, band, 14, 14, 0.55, '#04040c');
  solid(ctx, band, { x: 0, y: y0, w: W, h: y1 - y0 }, LIME, '#6a6672', { depth: 0.08, line: 2.4, formSize: 10 });
  within(ctx, band, () => {
    lay(ctx, drift('#a8a6b4', '#2a2832', 10, 23, 256, 8), { x: 0, y: y0, w: W, h: y1 - y0 }, 0.3);
    // the joints between its stones
    ctx.strokeStyle = 'rgba(14,12,20,0.6)';
    ctx.lineWidth = 2;
    for (let x = 60 + r() * 60; x < W; x += 150 + r() * 90) {
      ctx.beginPath();
      ctx.moveTo(x, y0 + 2);
      ctx.lineTo(x, y1);
      ctx.stroke();
    }
    // its top lip wet and catching the arches' light where the rain reaches it
    for (const a of BTX.arches) {
      const g = ctx.createLinearGradient(0, y0, 0, y0 + 10);
      g.addColorStop(0, 'rgba(170,186,240,0.4)');
      g.addColorStop(1, 'rgba(170,186,240,0)');
      ctx.fillStyle = g;
      ctx.fillRect(a.x0, y0, a.x1 - a.x0, 10);
    }
    ctx.fillStyle = 'rgba(255,240,220,0.12)';
    ctx.fillRect(0, y0, W, 2);
  });
  chips(ctx, r, 0, W, y1 - 2, 22, '#7e7a86', 4);
  crevice(ctx, 0, W, y1 + 1, 30, 0.5, '#04040c');
  // the wall meets the floor
  crevice(ctx, 0, W, TY, -36, 0.5, '#04040c');
}

/** The bell frame's top beam across the belfry, the boards of the spire's floor above it. */
function beam(ctx: Ctx, r: R): void {
  const { y0, y1 } = BTX.beam;
  // the boards overhead, black
  ctx.fillStyle = '#0c0a0e';
  ctx.fillRect(0, 0, W, y0 + 2);
  const b = rectPath(-10, y0, W + 20, y1 - y0);
  castShadow(ctx, b, 22, 26, 0.65, '#04040c');
  solid(ctx, b, { x: 0, y: y0, w: W, h: y1 - y0 }, 'wood', OAK, { depth: 0.1, line: 3, formSize: 14 });
  within(ctx, b, () => {
    woodGrain(ctx, r, { x: 0, y: y0, w: W, h: y1 - y0 }, OAK, false, 1);
    // its underside in shadow, its face lit by the lantern at the left
    vfill(ctx, 0, y0, W, y1 - y0, [[0, 'rgba(255,220,170,0.08)'], [0.6, 'rgba(0,0,0,0)'], [1, 'rgba(4,2,4,0.5)']]);
    lightPool(ctx, BTX.lantern.x, y1, 360, 60, LAMP, 0.25);
    // the lower arris worn round and catching the lantern, fading away to the right
    const eg = ctx.createLinearGradient(0, 0, W, 0);
    eg.addColorStop(0, 'rgba(255,200,140,0.3)');
    eg.addColorStop(0.35, 'rgba(255,200,140,0.1)');
    eg.addColorStop(1, 'rgba(160,170,220,0.06)');
    ctx.fillStyle = eg;
    ctx.fillRect(0, y1 - 6, W, 2.5);
    // checks (splits) along the grain
    ctx.strokeStyle = 'rgba(8,4,2,0.6)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 9; i++) {
      const x = r() * W;
      const y = y0 + 12 + r() * 28;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 60, y + (r() - 0.5) * 4, x + 120 + r() * 120, y + (r() - 0.5) * 6);
      ctx.stroke();
    }
  });
  // iron straps bolted round it where it bears on the walls and either side of the bell
  for (const x of [80, 640, 1280, 1840]) {
    const s = rectPath(x - 13, y0 - 3, 26, y1 - y0 + 6);
    castShadow(ctx, s, 4, 4, 0.5, '#04040c');
    solid(ctx, s, { x: x - 13, y: y0 - 3, w: 26, h: y1 - y0 + 6 }, 'iron', IRON, { depth: 0.1, line: 2 });
    for (const y of [y0 + 10, y1 - 10]) bolt(ctx, x, y, 4);
  }
  // cobwebs in the corners under it
  ctx.strokeStyle = 'rgba(190,190,210,0.14)';
  ctx.lineWidth = 1;
  for (const [x, d] of [[0, 1], [W, -1]] as const)
    for (let k = 0; k < 6; k++) {
      ctx.beginPath();
      ctx.moveTo(x, y1 + k * 14);
      ctx.quadraticCurveTo(x + d * (30 + k * 10), y1 + 20 + k * 8, x + d * (40 + k * 18), y1);
      ctx.stroke();
    }
}

/** A round iron bolt head: lit top-left. */
function bolt(ctx: Ctx, x: number, y: number, s: number): void {
  ctx.fillStyle = '#121014';
  ctx.beginPath();
  ctx.arc(x + 0.8, y + 0.8, s + 0.8, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(x - s * 0.4, y - s * 0.4, 0, x, y, s);
  g.addColorStop(0, '#6a6670');
  g.addColorStop(1, '#2a282e');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, s, 0, Math.PI * 2);
  ctx.fill();
}

// ——— the grotesques ———

/** A path in a statue's own frame (x forward, y up from the pedestal's top), mirrored for the right-hand one by
 * coordinates only (so the light still comes from the top left). Commands: M x y, L x y, Q cx cy x y, C … , Z. */
type Seg = (number | string)[];
const shapeOf = (x0: number, y0: number, dir: number, segs: Seg[]): PathFn => (c) => {
  const X = (v: number) => x0 + v * dir;
  const Y = (v: number) => y0 + v;
  c.beginPath();
  for (const s of segs) {
    const n = s.slice(1) as number[];
    if (s[0] === 'M') c.moveTo(X(n[0]), Y(n[1]));
    else if (s[0] === 'L') c.lineTo(X(n[0]), Y(n[1]));
    else if (s[0] === 'Q') c.quadraticCurveTo(X(n[0]), Y(n[1]), X(n[2]), Y(n[3]));
    else if (s[0] === 'C') c.bezierCurveTo(X(n[0]), Y(n[1]), X(n[2]), Y(n[3]), X(n[4]), Y(n[5]));
    else c.closePath();
  }
};

const off = (segs: Seg[], dx: number, dy: number): Seg[] =>
  segs.map((s) => [s[0], ...(s.slice(1) as number[]).map((v, i) => v + (i % 2 ? dy : dx))]);

/** The grotesque's parts (in its own frame): a horned chimera crouched on its haunches on the pedestal, forelegs
 * braced with their claws hooked over the edge, bat wings folded up behind its hunched shoulders to a clawed peak,
 * its head thrust out over the belfry with its jaws open, its tail curled round its feet. */
const WING: Seg[] = [
  ['M', -2, -190],
  ['C', -6, -230, -16, -270, -28, -300],
  ['L', -20, -314],
  ['L', -38, -300],
  ['Q', -42, -280, -58, -272],
  ['Q', -60, -250, -78, -238],
  ['Q', -78, -214, -94, -198],
  ['Q', -90, -176, -102, -158],
  ['Q', -92, -140, -98, -120],
  ['L', -72, -128],
  ['Z'],
];
const LEG: Seg[] = [
  ['M', 14, -168],
  ['C', 40, -176, 56, -150, 56, -118],
  ['C', 56, -92, 58, -64, 60, -34],
  ['C', 72, -26, 88, -16, 90, 0],
  ['L', 46, 0],
  ['C', 44, -18, 40, -46, 36, -76],
  ['C', 32, -92, 18, -104, 16, -116],
  ['C', 12, -130, 4, -142, -2, -150],
  ['Z'],
];
const G = {
  farWing: off(WING, 24, -10),
  wing: WING,
  farLeg: off(LEG, -18, -3),
  body: [
    ['M', 14, 0],
    ['L', -50, 0],
    ['Q', -62, -4, -58, -34],
    ['C', -86, -56, -92, -104, -70, -136],
    ['C', -58, -160, -46, -182, -24, -198],
    ['C', -12, -208, 2, -222, 14, -236],
    ['C', 20, -248, 34, -254, 46, -252],
    ['C', 56, -252, 62, -248, 66, -242],
    ['C', 70, -236, 74, -236, 80, -234],
    ['L', 104, -228],
    ['Q', 116, -224, 112, -214],
    ['L', 104, -211],
    ['L', 80, -207],
    ['L', 104, -196],
    ['Q', 106, -188, 96, -186],
    ['C', 84, -186, 72, -190, 60, -192],
    ['C', 52, -184, 50, -170, 56, -152],
    ['C', 60, -136, 54, -118, 42, -102],
    ['C', 30, -90, 22, -84, 14, -72],
    ['C', 8, -56, 18, -24, 14, 0],
    ['Z'],
  ] as Seg[],
  leg: LEG,
  tail: [['M', -56, -14], ['C', -40, 6, 4, 8, 34, 2], ['C', 46, 0, 56, -8, 48, -16], ['C', 44, -7, 32, -4, 22, -4], ['C', -6, -2, -34, -4, -50, -24], ['Z']] as Seg[],
  horn: [['M', 44, -250], ['C', 34, -270, 14, -282, -8, -286], ['C', 10, -278, 22, -266, 28, -246], ['Z']] as Seg[],
  farHorn: [['M', 54, -250], ['C', 48, -272, 30, -286, 10, -292], ['C', 26, -282, 36, -268, 40, -248], ['Z']] as Seg[],
  ear: [['M', 34, -236], ['L', 4, -250], ['L', 26, -226], ['Z']] as Seg[],
  mouth: [['M', 110, -213], ['L', 80, -207], ['L', 104, -196], ['Q', 104, -206, 110, -213], ['Z']] as Seg[],
};

function gargoyleShapes(x: number, dir: number) {
  const y = BTX.plinthTop;
  const S = (segs: Seg[]) => shapeOf(x, y, dir, segs);
  return { farWing: S(G.farWing), wing: S(G.wing), farLeg: S(G.farLeg), body: S(G.body), leg: S(G.leg), tail: S(G.tail), horn: S(G.horn), farHorn: S(G.farHorn), ear: S(G.ear), mouth: S(G.mouth) };
}

const GBOX = (x: number, dir: number) => ({ x: dir > 0 ? x - 116 : x - 130, y: BTX.plinthTop - 330, w: 246, h: 342 });
const PLINTH = { w: 176, h: BTX.sill - BTX.plinthTop, cap: 14 };

/** The pedestal at the end of the sill course: a block with a moulded cap, weathered. */
function pedestal(ctx: Ctx, r: R, x: number): void {
  const { w, h, cap } = PLINTH;
  const y = BTX.plinthTop;
  const block = rectPath(x - w / 2 + 8, y + cap, w - 16, h - cap);
  const capP = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x - w / 2, y);
    c.lineTo(x + w / 2, y);
    c.lineTo(x + w / 2, y + cap * 0.5);
    c.quadraticCurveTo(x + w / 2 - 2, y + cap, x + w / 2 - 8, y + cap);
    c.lineTo(x - w / 2 + 8, y + cap);
    c.quadraticCurveTo(x - w / 2 + 2, y + cap, x - w / 2, y + cap * 0.5);
    c.closePath();
  };
  castShadow(ctx, block, 12, 12, 0.55, '#04040c');
  castShadow(ctx, capP, 12, 12, 0.5, '#04040c');
  solid(ctx, block, { x: x - w / 2, y: y + cap, w, h: h - cap }, LIME, '#6e6a76', { depth: 0.08, line: 2.4, formSize: 14 });
  within(ctx, block, () => {
    // a sunk panel on its face, black crust in its sheltered top, rain stains down from the claws
    ctx.strokeStyle = 'rgba(10,8,16,0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - w / 2 + 22, y + cap + 6, w - 44, h - cap - 12);
    ctx.strokeStyle = 'rgba(220,220,240,0.12)';
    ctx.strokeRect(x - w / 2 + 23.5, y + cap + 7.5, w - 44, h - cap - 12);
    vfill(ctx, x - w / 2, y + cap, w, 10, [[0, 'rgba(4,4,10,0.55)'], [1, 'rgba(4,4,10,0)']]);
    streaks(ctx, r, x, y + cap, w - 40, h, '#101418', 0.35, 6);
  });
  solid(ctx, capP, { x: x - w / 2, y, w, h: cap }, LIME, '#8a8692', { depth: 0.08, line: 2.2, formSize: 8 });
  within(ctx, capP, () => {
    ctx.fillStyle = 'rgba(235,235,250,0.14)';
    ctx.fillRect(x - w / 2, y, w, 2);
  });
  // the pedestal sits on the course
  crevice(ctx, x - w / 2 + 8, x + w / 2 - 8, BTX.sill, 8, 0.6, '#04040c');
}

/** A carved grotesque on its pedestal: one carved silhouette in weathered limestone, washed pale where the rain
 * runs over it and black where it can't reach, moss on every surface that faces the sky, lichen, a broken ear. */
function gargoyle(ctx: Ctx, r: R, x: number, dir: number): void {
  pedestal(ctx, r, x);
  const s = gargoyleShapes(x, dir);
  const y = BTX.plinthTop;
  const X = (v: number) => x + v * dir;
  const box = GBOX(x, dir);
  const stone = '#636258';
  const ink = '#0c0a14';
  const cr = (w: number, a: number, la: number, f: (c: Ctx) => void) => crease(ctx, f, w, ink, a, la);
  // its shadow on the wall behind, and where it sits on the pedestal
  for (const p of [s.farWing, s.wing, s.body]) castShadow(ctx, p, 18, 20, 0.5, '#04040c');
  groundShadow(ctx, X(-8), y - 1, 92, 6, 0.6, '#04040c');
  // far side first: the far wing and the far foreleg, turned away from the light
  solid(ctx, s.farWing, box, LIME, shade(stone, -0.32), { depth: 0.08, line: 2.4, formSize: 22 });
  solid(ctx, s.farLeg, box, LIME, shade(stone, -0.3), { depth: 0.08, line: 2.4, formSize: 16 });
  // the near wing: the arm's bone up its leading edge to the clawed wrist, the fingers fanned down from it, the
  // membrane between them sunk and in shadow, scalloped between the tips
  solid(ctx, s.wing, box, LIME, shade(stone, -0.06), { depth: 0.08, line: 2.8, formSize: 26 });
  within(ctx, s.wing, () => {
    const tips: [number, number][] = [[-58, -272], [-78, -238], [-94, -198], [-102, -158], [-98, -120]];
    for (const [tx, ty] of tips) {
      // the membrane sags in a shallow trough beside each bone
      const mg = ctx.createLinearGradient(X(-28), y - 300, X(tx), y + ty);
      mg.addColorStop(0, 'rgba(6,6,12,0)');
      mg.addColorStop(1, 'rgba(6,6,12,0.18)');
      ctx.strokeStyle = mg;
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(X(-24), y - 296);
      ctx.quadraticCurveTo(X((tx - 28) / 2 + 8), y + (ty - 300) / 2 + 8, X(tx + 4), y + ty + 4);
      ctx.stroke();
      cr(3.4, 0.55, 0.38, (c) => {
        c.moveTo(X(-28), y - 298);
        c.quadraticCurveTo(X((tx - 28) / 2 + 4), y + (ty - 300) / 2 + 4, X(tx), y + ty);
      });
    }
    cr(4, 0.5, 0.42, (c) => {
      c.moveTo(X(0), y - 192);
      c.bezierCurveTo(X(-4), y - 230, X(-14), y - 268, X(-26), y - 297);
    });
    vfill(ctx, box.x, y - 220, box.w, 110, [[0, 'rgba(6,6,12,0)'], [1, 'rgba(6,6,12,0.4)']]);
  });
  // (lit now, before the body covers the wing's root: the arches' cold on its edge, the lantern on the left one's)
  innerEdge(ctx, s.wing, 'rgba(160,182,236,0.22)', 4, -dir * 4, 1);
  if (dir > 0) innerEdge(ctx, s.wing, rgba(LAMP, 0.28), 9, 5, 6, 'lighter');
  solid(ctx, s.tail, box, LIME, shade(stone, -0.04), { depth: 0.08, line: 2.2, formSize: 10 });
  within(ctx, s.tail, () => {
    for (let k = 0; k < 6; k++) cr(1.6, 0.4, 0.2, (c) => {
      c.moveTo(X(-50 + k * 14), y - 12 + Math.abs(k - 2) * 1.5);
      c.lineTo(X(-46 + k * 14), y - 2);
    });
  });
  solid(ctx, s.farHorn, box, LIME, shade(stone, -0.34), { depth: 0.08, line: 2, formSize: 8 });
  solid(ctx, s.ear, box, LIME, shade(stone, -0.2), { depth: 0.08, line: 2, formSize: 6 });
  solid(ctx, s.body, box, LIME, stone, { depth: 0.08, line: 3.2, formSize: 46 });
  within(ctx, s.body, () => {
    // the carved masses, each turned to the light: the haunch, the ribcage, the shoulder and chest, the skull, the
    // muzzle; lit on their upper left, rolling into shadow on their lower right
    masses(ctx, X, y, [[-50, -74, 56], [-18, -130, 50], [30, -170, 40], [52, -236, 22], [92, -220, 16]]);
    // carving: the haunch's great muscle and the knee, the ribs, the spine's knuckles, the shoulder
    cr(4, 0.5, 0.32, (c) => {
      c.moveTo(X(-8), y - 8);
      c.bezierCurveTo(X(-50), y - 20, X(-72), y - 92, X(-52), y - 132);
    });
    cr(2.6, 0.38, 0.22, (c) => {
      c.moveTo(X(-62), y - 72);
      c.quadraticCurveTo(X(-30), y - 94, X(4), y - 76);
    });
    for (let k = 0; k < 4; k++)
      cr(2.2, 0.42, 0.24, (c) => {
        c.moveTo(X(30 - k * 6), y - 112 - k * 13);
        c.quadraticCurveTo(X(16 - k * 6), y - 104 - k * 13, X(2 - k * 6), y - 108 - k * 14);
      });
    for (const [kx, ky] of [[-74, -130], [-62, -154], [-48, -176], [-32, -192], [-16, -204], [0, -220]] as const)
      cr(2.6, 0.5, 0.34, (c) => {
        c.moveTo(X(kx - 5), y + ky + 4);
        c.quadraticCurveTo(X(kx + 1), y + ky - 4, X(kx + 7), y + ky + 4);
      });
    // the head: the heavy brow, the deep eye under it, the cheek, the nostril, the line of the jaw
    // the mane: carved locks down the back of the neck
    for (const [mx, my] of [[4, -222], [12, -232], [22, -242], [32, -249]] as const)
      cr(2.6, 0.55, 0.3, (c) => {
        c.moveTo(X(mx + 4), y + my - 2);
        c.quadraticCurveTo(X(mx - 4), y + my + 2, X(mx - 12), y + my + 10);
      });
    cr(4.6, 0.7, 0.45, (c) => {
      c.moveTo(X(48), y - 248);
      c.quadraticCurveTo(X(62), y - 250, X(74), y - 236);
    });
    ctx.fillStyle = '#08060c';
    ctx.beginPath();
    ctx.ellipse(X(64), y - 238, 6, 4.4, dir * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(210,214,235,0.3)';
    ctx.beginPath();
    ctx.arc(X(62), y - 239.5, 1.5, 0, Math.PI * 2);
    ctx.fill();
    cr(2.6, 0.5, 0.28, (c) => {
      c.moveTo(X(46), y - 230);
      c.quadraticCurveTo(X(56), y - 214, X(76), y - 213);
    });
    ctx.fillStyle = '#08060c';
    ctx.beginPath();
    ctx.ellipse(X(107), y - 223, 3, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    cr(2.8, 0.55, 0.28, (c) => {
      c.moveTo(X(58), y - 192);
      c.quadraticCurveTo(X(70), y - 196, X(80), y - 206);
    });
    for (const [wx, wy] of [[84, -233], [91, -231]] as const)
      cr(1.5, 0.45, 0.2, (c) => {
        c.moveTo(X(wx), y + wy);
        c.lineTo(X(wx + 2), y + wy + 6);
      });
    // the chest's great muscle, the fold of the throat
    cr(3, 0.45, 0.3, (c) => {
      c.moveTo(X(54), y - 172);
      c.quadraticCurveTo(X(40), y - 150, X(44), y - 118);
    });
    cr(2.2, 0.4, 0.2, (c) => {
      c.moveTo(X(58), y - 186);
      c.quadraticCurveTo(X(50), y - 180, X(54), y - 170);
    });
    // the washed and the crusted: pale where the rain sheets over its tops, black in the lee (under the jaw, the
    // belly, the haunch), grey streaks run down from every edge the water drips off
    const wash = ctx.createLinearGradient(0, y - 260, 0, y);
    wash.addColorStop(0, 'rgba(232,232,244,0.1)');
    wash.addColorStop(0.4, 'rgba(232,232,244,0.05)');
    wash.addColorStop(1, 'rgba(232,232,244,0)');
    ctx.fillStyle = wash;
    ctx.fillRect(box.x, box.y, box.w, box.h);
    lay(ctx, noiseMask(5, 33 + x, { cover: 0.42, soft: 0.25, col: '#08060c', w: 64, h: 64 }), { x: box.x, y: y - 120, w: box.w, h: 120 }, 0.32);
    streaks(ctx, r, X(92), y - 186, 26, 60, '#0c0e12', 0.45, 3);
    for (const [sx, sy] of [[-56, -150], [-34, -186], [-8, -200], [22, -168]] as const) streaks(ctx, r, X(sx), y + sy, 8, 90 + (sx + 60), '#0c0e10', 0.26, 2);
    // lichen: little crusts of pale green and orange on the lit stone
    for (let i = 0; i < 30; i++) {
      const lx = X(-70 + r() * 130);
      const ly = y - 30 - r() * 190;
      ctx.fillStyle = rgba(r() < 0.72 ? '#a4b082' : '#c49058', 0.2 + r() * 0.22);
      ctx.beginPath();
      ctx.ellipse(lx, ly, 1.6 + r() * 3.6, 1.2 + r() * 2.6, r() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    crack(ctx, r, X(-66), y - 60, dir > 0 ? -0.5 : -2.64, 44, { col: '#08060c', lip: '#c8c8d8', w: 1.4, a: 0.6 });
  });
  innerEdge(ctx, s.body, 'rgba(4,4,10,0.55)', 8, 0, -7);
  // the open jaws: the dark of the mouth, the fangs
  ctx.fillStyle = '#0a080e';
  s.mouth(ctx);
  ctx.fill();
  for (const [fx, fy, fl, up] of [[105, -212, 10, 0], [94, -210, 8, 0], [86, -208, 6, 0], [97, -199, 8, 1], [89, -202, 6, 1]] as const) {
    ctx.fillStyle = '#a4a2ac';
    ctx.beginPath();
    ctx.moveTo(X(fx - 2.6), y + fy);
    ctx.lineTo(X(fx + 2.6), y + fy);
    ctx.lineTo(X(fx), y + fy + (up ? -fl : fl));
    ctx.closePath();
    ctx.fill();
  }
  // the horn, ringed with growth ridges, curling back over the ear
  solid(ctx, s.horn, box, LIME, shade(stone, -0.14), { depth: 0.08, line: 2.2, formSize: 10 });
  within(ctx, s.horn, () => {
    for (let k = 0; k < 6; k++) {
      const t = 0.12 + k * 0.13;
      const hx = 36 + (-6 - 36) * t;
      const hy = -250 + (-284 + 250) * t - Math.sin(t * Math.PI) * 6;
      cr(1.5, 0.5, 0.25, (c) => {
        c.moveTo(X(hx - 3), y + hy - 5);
        c.lineTo(X(hx + 3), y + hy + 5);
      });
    }
  });
  // the near foreleg over everything (its shadow on the body behind it), its claws hooked over the pedestal's edge
  within(ctx, s.body, () => castShadow(ctx, s.leg, 10, 10, 0.5, '#04040c'));
  solid(ctx, s.leg, box, LIME, shade(stone, 0.05), { depth: 0.08, line: 3, formSize: 24 });
  within(ctx, s.leg, () => {
    masses(ctx, X, y, [[36, -140, 30], [48, -70, 22], [70, -12, 16]]);
    cr(2.8, 0.42, 0.32, (c) => {
      c.moveTo(X(30), y - 160);
      c.quadraticCurveTo(X(50), y - 130, X(50), y - 70);
    });
    cr(2.2, 0.4, 0.2, (c) => {
      c.moveTo(X(18), y - 118);
      c.quadraticCurveTo(X(24), y - 108, X(34), y - 110);
    });
    for (let k = 0; k < 3; k++)
      cr(1.8, 0.45, 0.25, (c) => {
        c.moveTo(X(60 + k * 9), y - 14 + k * 2);
        c.lineTo(X(62 + k * 9), y - 2);
      });
    streaks(ctx, r, X(48), y - 150, 20, 120, '#0e1014', 0.28, 3);
  });
  innerEdge(ctx, s.leg, 'rgba(4,4,10,0.45)', 6, 0, -6);
  for (let k = 0; k < 4; k++) {
    const cx = X(56 + k * 10);
    const claw = (c: Ctx) => {
      c.beginPath();
      c.moveTo(cx - 4 * dir, y - 1);
      c.quadraticCurveTo(cx + 5 * dir, y - 2, cx + 4 * dir, y + 9);
      c.quadraticCurveTo(cx + 2 * dir, y + 12, cx, y + 7);
      c.quadraticCurveTo(cx - 1 * dir, y + 2, cx - 4 * dir, y - 1);
      c.closePath();
    };
    solid(ctx, claw, { x: cx - 6, y: y - 4, w: 12, h: 17 }, LIME, shade(stone, -0.12), { depth: 0.08, line: 1.6, formSize: 4 });
  }
  // moss on everything that faces the sky: the skull, the hump of the back, the wing's top edge, the haunch, the
  // pedestal's top round its feet; little cushions, dark under, lit on top
  const tops: [number, number, number][] = [[-72, -134, 9], [-60, -158, 9], [-46, -180, 9], [-30, -196, 8], [42, -254, 6], [-48, -278, 5], [-68, -246, 6], [-86, -208, 7], [-98, -168, 7], [-76, -4, 11], [-30, -6, 8], [82, -3, 7], [-60, -2, 9]];
  for (const [mx, my, ms] of tops) moss(ctx, r, X(mx), y + my, ms);
  // the storm's cold light on its face and front (it's looking at the arches), the lantern warm on the left one's back
  innerEdge(ctx, s.body, 'rgba(160,182,236,0.3)', 5, -dir * 5, 1.5);
  innerEdge(ctx, s.leg, 'rgba(160,182,236,0.24)', 4, -dir * 4, 1);
  innerEdge(ctx, s.horn, 'rgba(160,182,236,0.3)', 3, -dir * 3, 1);
  if (dir > 0) {
    innerEdge(ctx, s.horn, rgba(LAMP, 0.4), 4, 2, 4, 'lighter');
  }
}

/** Carved masses on a statue (x, y, radius in its frame): each a rounded volume lit from the top left. */
function masses(ctx: Ctx, X: (v: number) => number, y: number, ms: [number, number, number][]): void {
  const [lx, ly] = [-0.6, -0.8];
  for (const [mx, my, mr] of ms) {
    const cx = X(mx);
    const cy = y + my;
    const hx = cx + lx * mr * 0.45;
    const hy = cy + ly * mr * 0.45;
    const g = ctx.createRadialGradient(hx, hy, 0, cx, cy, mr * 1.25);
    g.addColorStop(0, 'rgba(236,236,248,0.13)');
    g.addColorStop(0.45, 'rgba(236,236,248,0.04)');
    g.addColorStop(1, 'rgba(8,8,16,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - mr * 1.3, cy - mr * 1.3, mr * 2.6, mr * 2.6);
  }
}

/** A cushion of moss: a few dark, soft lobes, their tops lit, a fleck of brighter green. */
function moss(ctx: Ctx, r: R, x: number, y: number, s: number): void {
  for (let i = 0; i < 4; i++) {
    const mx = x + (r() - 0.5) * s * 1.6;
    const my = y + (r() - 0.2) * s * 0.5;
    const rad = s * (0.35 + r() * 0.35);
    const g = ctx.createRadialGradient(mx - rad * 0.3, my - rad * 0.4, 0, mx, my, rad);
    g.addColorStop(0, 'rgba(110,140,80,0.85)');
    g.addColorStop(0.55, 'rgba(58,84,44,0.8)');
    g.addColorStop(1, 'rgba(30,46,26,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(mx, my, rad, rad * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(160,190,110,0.5)';
  for (let i = 0; i < 3; i++) ctx.fillRect(x + (r() - 0.5) * s, y - s * 0.3 + (r() - 0.5) * 3, 1.6, 1.6);
}

function statues(ctx: Ctx, r: R): void {
  for (const g of BTX.gargoyles) gargoyle(ctx, r, g.x, g.dir);
}

/** The flash's cold light on the statues (live, added): their edges facing the arches, their tops. */
function statuesLit(ctx: Ctx): void {
  for (const { x, dir } of BTX.gargoyles) {
    const s = gargoyleShapes(x, dir);
    // the wings behind first, then the body cut out of them (it stands in front of their roots), then the rest
    for (const [p, w] of [[s.farWing, 5], [s.wing, 7]] as const) innerEdge(ctx, p, 'rgba(210,224,255,0.95)', w, -dir * w, w * 0.5);
    innerEdge(ctx, s.wing, 'rgba(200,214,255,0.5)', 6, 0, 6);
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    s.body(ctx);
    ctx.fill();
    ctx.restore();
    for (const [p, w] of [[s.body, 9], [s.leg, 7], [s.horn, 4]] as const) innerEdge(ctx, p, 'rgba(210,224,255,0.95)', w, -dir * w, w * 0.5);
    innerEdge(ctx, s.body, 'rgba(200,214,255,0.5)', 6, 0, 6);
  }
}

// ——— the bell ———

const B = BTX.bell;
const BX = BTX.axle.x;
/** The bell's profile: flat crown, rounded shoulder, a long waist flaring to the sound bow, the lip seen from a
 * little above (the mouth's near edge curving down). */
const bellPath = (c: Ctx) => {
  const x = BX;
  const t = B.crown;
  const l = B.lip;
  c.beginPath();
  c.moveTo(x - 62, t);
  c.quadraticCurveTo(x - 80, t, x - 80, t + 18);
  c.bezierCurveTo(x - 82, t + 76, x - 92, t + 140, x - 114, l - 50);
  c.bezierCurveTo(x - 130, l - 26, x - B.r + 2, l - 16, x - B.r, l - 4);
  c.quadraticCurveTo(x - B.r + 2, l + 4, x - B.r + 10, l + 5);
  c.quadraticCurveTo(x, l + 30, x + B.r - 10, l + 5);
  c.quadraticCurveTo(x + B.r - 2, l + 4, x + B.r, l - 4);
  c.bezierCurveTo(x + B.r - 2, l - 16, x + 130, l - 26, x + 114, l - 50);
  c.bezierCurveTo(x + 92, t + 140, x + 82, t + 76, x + 80, t + 18);
  c.quadraticCurveTo(x + 80, t, x + 62, t);
  c.closePath();
};
/** Half-width of the bell's body at y (for the bands round it). */
const bellHW = (y: number): number => {
  const u = (y - B.crown) / (B.lip - B.crown);
  return 80 + 6 * u + Math.pow(Math.max(0, u - 0.45) / 0.55, 2.2) * (B.r - 86);
};
/** A band cast round the bell at y: the curve of the round body seen from a little above. */
const bandAt = (c: Ctx, y: number, dy = 0) => {
  const hw = bellHW(y);
  const sag = 3 + ((y - B.crown) / (B.lip - B.crown)) * 12;
  c.moveTo(BX - hw, y + dy);
  c.quadraticCurveTo(BX, y + sag * 2 + dy, BX + hw, y + dy);
};
const BELL_BOX = { x: BX - B.r - 30, y: BTX.axle.y - BTX.wheelR - 8, w: B.r * 2 + 90, h: B.lip + 70 - (BTX.axle.y - BTX.wheelR - 8) };

/** The wheel behind the bell (it turns with it), the headstock, the canons, the bell. */
function bell(ctx: Ctx, r: R): void {
  const { x: ax, y: ay } = BTX.axle;
  const R0 = BTX.wheelR;
  // the wheel: an oak rim with the rope's groove, six spokes, iron at the hub; in the bell's shadow
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const t = (i / 6) * Math.PI * 2 + 0.26;
    ctx.strokeStyle = '#140c08';
    ctx.lineWidth = 13;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax + Math.cos(t) * (R0 - 8), ay + Math.sin(t) * (R0 - 8));
    ctx.stroke();
    ctx.strokeStyle = shade(OAK, -0.1);
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,200,140,0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ax + Math.cos(t + 0.06) * 30, ay + Math.sin(t + 0.06) * 30 - 2);
    ctx.lineTo(ax + Math.cos(t + 0.02) * (R0 - 12), ay + Math.sin(t + 0.02) * (R0 - 12) - 2);
    ctx.stroke();
  }
  ctx.restore();
  const rimP = (c: Ctx) => {
    c.beginPath();
    c.arc(ax, ay, R0, 0, Math.PI * 2);
    c.arc(ax, ay, R0 - 14, 0, Math.PI * 2, true);
    c.closePath();
  };
  solid(ctx, rimP, { x: ax - R0, y: ay - R0, w: R0 * 2, h: R0 * 2 }, 'wood', shade(OAK, 0.05), { depth: 0.1, line: 2.4, formSize: 20 });
  within(ctx, rimP, () => {
    // the groove, and the iron shoes joining its felloes
    ctx.strokeStyle = 'rgba(8,4,2,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ax, ay, R0 - 5, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const t = (i / 6) * Math.PI * 2;
      ctx.strokeStyle = '#2a282e';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(ax, ay, R0 - 7, t - 0.06, t + 0.06);
      ctx.stroke();
    }
    // its lower half darker, in the bell's shadow
    vfill(ctx, ax - R0, ay, R0 * 2, R0, [[0, 'rgba(4,2,2,0.2)'], [1, 'rgba(4,2,2,0.5)']]);
  });
  // the bell's shadow on the pier behind (it swings with it)
  castShadow(ctx, bellPath, 30, 30, 0.6, '#04040c');
  // the headstock: an oak block across the crown, iron straps down round the canons, the gudgeon's boss
  const hs = rrPath(ax - 70, ay - 24, 140, 48, 6);
  solid(ctx, hs, { x: ax - 70, y: ay - 24, w: 140, h: 48 }, 'wood', OAK, { depth: 0.08, line: 2.6, formSize: 12 });
  within(ctx, hs, () => {
    woodGrain(ctx, r, { x: ax - 70, y: ay - 24, w: 140, h: 48 }, OAK, false, 0.6);
    vfill(ctx, ax - 70, ay - 24, 140, 48, [[0, 'rgba(255,210,150,0.1)'], [1, 'rgba(4,2,2,0.45)']]);
  });
  // the canons: the loops cast on the crown, bolted up into the headstock
  for (const dx of [-38, -14, 14, 38]) {
    const cn = rrPath(ax + dx - 8, ay + 18, 16, B.crown - ay - 14, 6);
    solid(ctx, cn, { x: ax + dx - 8, y: ay + 18, w: 16, h: B.crown - ay - 14 }, BRONZE, '#5a3e1c', { depth: 0.08, line: 1.8, formSize: 6 });
  }
  for (const dx of [-52, 52]) {
    const st = rectPath(ax + dx - 7, ay - 26, 14, B.crown - ay + 32);
    solid(ctx, st, { x: ax + dx - 7, y: ay - 26, w: 14, h: B.crown - ay + 32 }, 'iron', IRON, { depth: 0.08, line: 1.8 });
    bolt(ctx, ax + dx, ay - 14, 3.2);
    bolt(ctx, ax + dx, B.crown + 2, 3.2);
  }
  // the bell
  const bb = { x: BX - B.r, y: B.crown, w: B.r * 2, h: B.lip - B.crown + 30 };
  solid(ctx, bellPath, bb, BRONZE, '#4a2a12', { depth: 0.08, formSize: 80, line: 3.6 });
  within(ctx, bellPath, () => {
    // old bronze, dark with age: the metal's warm brown under everything
    ctx.fillStyle = 'rgba(34,14,6,0.44)';
    ctx.fillRect(bb.x, bb.y, bb.w, bb.h);
    // a dark cast bronze: the round body's shading across, a vertical highlight a third in from the lit side, and
    // the arch's cold light reflected down its far side
    const xg = ctx.createLinearGradient(BX - B.r, 0, BX + B.r, 0);
    xg.addColorStop(0, 'rgba(20,8,2,0.5)');
    xg.addColorStop(0.18, 'rgba(255,190,110,0.12)');
    xg.addColorStop(0.32, 'rgba(255,214,150,0.2)');
    xg.addColorStop(0.42, 'rgba(40,18,6,0.05)');
    xg.addColorStop(0.7, 'rgba(14,6,2,0.4)');
    xg.addColorStop(0.86, 'rgba(120,140,210,0.18)');
    xg.addColorStop(1, 'rgba(14,6,2,0.55)');
    ctx.fillStyle = xg;
    ctx.fillRect(bb.x, bb.y, bb.w, bb.h);
    // the waist darker than the flare (it faces down and away), the sound bow catching the light
    vfill(ctx, bb.x, bb.y, bb.w, bb.h, [[0, 'rgba(255,220,170,0.1)'], [0.3, 'rgba(10,4,2,0.12)'], [0.75, 'rgba(10,4,2,0.0)'], [0.88, 'rgba(255,210,150,0.1)'], [1, 'rgba(6,2,0,0.4)']]);
    // verdigris: run down from the canons and the bands in streaks, gathered in the bands' grooves
    streaks(ctx, r, BX - 10, B.crown + 4, 120, 210, '#3e8a6c', 0.24, 7);
    streaks(ctx, r, BX - 20, B.lip - 110, 220, 80, '#3e8a6c', 0.2, 6);
    lay(ctx, noiseMask(7, 81, { cover: 0.3, soft: 0.35, col: '#3a7a62', w: 64, h: 64 }), bb, 0.16);
    // the bands cast round its shoulder, waist and sound bow: a dark groove, a lit lip under it
    ctx.lineCap = 'round';
    for (const [y, w] of [[B.crown + 22, 2.4], [B.crown + 30, 1.6], [B.lip - 74, 2.6], [B.lip - 64, 1.8], [B.lip - 30, 2]] as const) {
      ctx.strokeStyle = 'rgba(20,8,2,0.6)';
      ctx.lineWidth = w;
      ctx.beginPath();
      bandAt(ctx, y);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,214,160,0.28)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      bandAt(ctx, y, w);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(70,150,120,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      bandAt(ctx, y, -w * 0.8);
      ctx.stroke();
    }
    // the founder's inscription round the shoulder: raised letters, each a little lit block
    for (let i = 0; i < 30; i++) {
      const u = i / 29;
      const hw = bellHW(B.crown + 46);
      const lx = BX - hw * 0.86 + u * hw * 1.72;
      const ly = B.crown + 40 + Math.sin(u * Math.PI) * 5;
      if (r() < 0.14) continue;
      ctx.fillStyle = 'rgba(20,8,2,0.55)';
      ctx.fillRect(lx + 1, ly + 1, 3, 7);
      ctx.fillStyle = 'rgba(255,214,160,0.3)';
      ctx.fillRect(lx, ly, 2.6, 6.4);
    }
    // a cast relief on the waist: a bare footprint in a roundel (the town's bell, after all), raised: lit on its
    // upper left, its shadow on the lower right
    const fx = BX - 6;
    const fy = B.crown + 118;
    crease(ctx, (c) => c.arc(fx, fy, 28, 0, Math.PI * 2), 2.4, '#1a0a02', 0.55, 0.32);
    const foot = (c: Ctx, dx: number, dy: number) => {
      c.beginPath();
      // the sole: a bean, narrow at the heel, wide across the ball, the arch cut in on the inside
      c.moveTo(fx - 1 + dx, fy + 17 + dy);
      c.bezierCurveTo(fx - 8 + dx, fy + 15 + dy, fx - 6 + dx, fy + 4 + dy, fx - 9 + dx, fy - 4 + dy);
      c.bezierCurveTo(fx - 11 + dx, fy - 11 + dy, fx + 7 + dx, fy - 12 + dy, fx + 8 + dx, fy - 4 + dy);
      c.bezierCurveTo(fx + 9 + dx, fy + 4 + dy, fx + 4 + dx, fy + 8 + dy, fx + 5 + dx, fy + 13 + dy);
      c.quadraticCurveTo(fx + 4 + dx, fy + 18 + dy, fx - 1 + dx, fy + 17 + dy);
      c.closePath();
      for (const [tx, ty, tr] of [[-7.5, -15, 3.2], [-2.5, -17.5, 2.5], [1.8, -17.5, 2.2], [5.6, -15.8, 2], [8.6, -12.6, 1.8]] as const) {
        c.moveTo(fx + tx + tr + dx, fy + ty + dy);
        c.arc(fx + tx + dx, fy + ty + dy, tr, 0, Math.PI * 2);
      }
    };
    ctx.fillStyle = 'rgba(16,6,0,0.55)';
    foot(ctx, 1.6, 1.8);
    ctx.fill();
    ctx.fillStyle = 'rgba(122,82,40,0.9)';
    foot(ctx, 0, 0);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,214,160,0.3)';
    foot(ctx, -0.8, -0.8);
    ctx.fill();
    ctx.fillStyle = 'rgba(110,72,34,0.95)';
    foot(ctx, 0.4, 0.4);
    ctx.fill();
  });
  // the lantern's warm light on its left flank, the storm's cold rim on its right
  innerEdge(ctx, bellPath, rgba(LAMP, 0.35), 10, 9, 2, 'lighter');
  innerEdge(ctx, bellPath, 'rgba(150,170,230,0.4)', 5, -5, 1);
  specHi(ctx, BX - 62, B.crown + 150, 10, 70, 0.4, 0.12);
  specHi(ctx, BX - 108, B.lip - 34, 14, 7, 0.45, -0.2);
  // the lip: its thick rolled edge, and the black of the mouth beyond its near curve
  ctx.strokeStyle = 'rgba(255,214,160,0.35)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(BX - B.r + 6, B.lip + 1);
  ctx.quadraticCurveTo(BX, B.lip + 24, BX + B.r - 6, B.lip + 1);
  ctx.stroke();
}

/** The flash's light on the bell (live, added): its far rim, the sound bow and the shoulder, cold and white. */
function bellLit(ctx: Ctx): void {
  innerEdge(ctx, bellPath, 'rgba(230,236,255,1)', 12, -12, 0);
  innerEdge(ctx, bellPath, 'rgba(230,236,255,1)', 8, -8, 0);
  innerEdge(ctx, bellPath, 'rgba(200,214,255,0.7)', 16, 14, 0);
  within(ctx, bellPath, () => {
    const g = ctx.createLinearGradient(BX + 40, 0, BX + B.r, 0);
    g.addColorStop(0, 'rgba(180,200,255,0)');
    g.addColorStop(0.7, 'rgba(180,200,255,0.35)');
    g.addColorStop(1, 'rgba(180,200,255,0.1)');
    ctx.fillStyle = g;
    ctx.fillRect(BX, B.crown, B.r, B.lip - B.crown + 30);
    ctx.strokeStyle = 'rgba(230,236,255,0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    bandAt(ctx, B.lip - 30);
    ctx.stroke();
  });
}

/** The clapper: an iron shaft hung from the crown's staple, its ball near the sound bow, the flight below the lip. */
const CLAP = { x: BX, y: BTX.clapper.y };
function clapper(ctx: Ctx): void {
  const { x, y } = CLAP;
  const L = BTX.clapper.len;
  const shaft = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x - 5, y);
    c.lineTo(x + 5, y);
    c.lineTo(x + 7, y + L - 30);
    c.lineTo(x - 7, y + L - 30);
    c.closePath();
  };
  solid(ctx, shaft, { x: x - 8, y, w: 16, h: L }, 'iron', '#3a363c', { depth: 0.08, line: 2 });
  const ball = ellPath(x, y + L - 16, 22, 26);
  solid(ctx, ball, { x: x - 22, y: y + L - 42, w: 44, h: 52 }, 'iron', '#423c40', { depth: 0.08, line: 2.4, formSize: 22 });
  const flight = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x - 8, y + L + 4);
    c.lineTo(x + 8, y + L + 4);
    c.lineTo(x + 6, y + L + 34);
    c.quadraticCurveTo(x, y + L + 42, x - 6, y + L + 34);
    c.closePath();
  };
  solid(ctx, flight, { x: x - 8, y: y + L, w: 16, h: 42 }, 'iron', '#3a363c', { depth: 0.08, line: 2 });
  // the side towards the lantern warm, the rest in the bell's dark
  innerEdge(ctx, ball, rgba(LAMP, 0.3), 6, 5, 3, 'lighter');
}
const CLAP_BOX = { x: CLAP.x - 30, y: CLAP.y - 6, w: 60, h: BTX.clapper.len + 56 };

/** The front bearing the gudgeon turns in: an iron plummer block hung from the beam on two straps. */
function hanger(ctx: Ctx): void {
  const { x, y } = BTX.axle;
  for (const dx of [-20, 20]) {
    const s = rectPath(x + dx - 6, BTX.beam.y1 - 6, 12, y - BTX.beam.y1 + 6);
    castShadow(ctx, s, 6, 6, 0.5, '#04040c');
    solid(ctx, s, { x: x + dx - 6, y: BTX.beam.y1 - 6, w: 12, h: y - BTX.beam.y1 }, 'iron', IRON, { depth: 0.08, line: 1.8 });
    bolt(ctx, x + dx, BTX.beam.y1 + 6, 3);
  }
  const blk = rrPath(x - 32, y - 16, 64, 32, 6);
  castShadow(ctx, blk, 8, 8, 0.5, '#04040c');
  solid(ctx, blk, { x: x - 32, y: y - 16, w: 64, h: 32 }, 'iron', '#34323a', { depth: 0.08, line: 2.2, formSize: 10 });
  // the gudgeon's end in it, greased and worn bright
  const g = ctx.createRadialGradient(x - 3, y - 3, 0, x, y, 11);
  g.addColorStop(0, '#9a96a0');
  g.addColorStop(0.6, '#4a4650');
  g.addColorStop(1, '#1a181e');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0c0a0e';
  ctx.lineWidth = 2;
  ctx.stroke();
  bolt(ctx, x - 24, y, 3.2);
  bolt(ctx, x + 24, y, 3.2);
}
const HANGER_BOX = { x: BTX.axle.x - 44, y: BTX.beam.y1 - 10, w: 100, h: BTX.axle.y - BTX.beam.y1 + 40 };

/** The rope: off the wheel's rim, down the pier past the sill to a sally (the woollen grip) and a tail. */
const ROPE_X = BTX.axle.x + BTX.wheelR - 4;
function rope(ctx: Ctx, r: R): void {
  const x = ROPE_X;
  const y0 = BTX.axle.y;
  const y1 = BTX.rope.y1;
  const sallyY = 540;
  const line = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x - 3, y0);
    c.lineTo(x + 3, y0);
    c.lineTo(x + 3.5, y1);
    c.lineTo(x - 3.5, y1);
    c.closePath();
  };
  castShadow(ctx, line, 12, 8, 0.45, '#04040c');
  ctx.fillStyle = '#a88a5a';
  line(ctx);
  ctx.fill();
  within(ctx, line, () => {
    // the twist of its strands, lit on the left
    const g = ctx.createLinearGradient(x - 4, 0, x + 4, 0);
    g.addColorStop(0, 'rgba(255,230,180,0.35)');
    g.addColorStop(0.5, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(20,10,4,0.5)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 4, y0, 8, y1 - y0);
    ctx.strokeStyle = 'rgba(50,30,14,0.55)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (let y = y0 + 4; y < y1; y += 7) {
      ctx.moveTo(x - 4, y);
      ctx.lineTo(x + 4, y + 4);
    }
    ctx.stroke();
    // darker up top where the dust and the damp get at it
    vfill(ctx, x - 4, y0, 8, 200, [[0, 'rgba(10,6,4,0.5)'], [1, 'rgba(10,6,4,0)']]);
  });
  // the sally: a fat woollen grip in faded stripes, its wool fuzzy
  const sl = rrPath(x - 9, sallyY, 18, 96, 8);
  castShadow(ctx, sl, 12, 10, 0.5, '#04040c');
  solid(ctx, sl, { x: x - 9, y: sallyY, w: 18, h: 96 }, 'knit', '#6a3430', { depth: 0.08, line: 2 });
  within(ctx, sl, () => {
    for (let y = sallyY + 6, k = 0; y < sallyY + 92; y += 11, k++) {
      ctx.fillStyle = ['#a89a7c', '#6a3430', '#34405a'][k % 3];
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(x - 10, y);
      ctx.lineTo(x + 10, y + 4);
      ctx.lineTo(x + 10, y + 9);
      ctx.lineTo(x - 10, y + 5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const g = ctx.createLinearGradient(x - 9, 0, x + 9, 0);
    g.addColorStop(0, 'rgba(255,220,170,0.2)');
    g.addColorStop(0.45, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(10,6,10,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 10, sallyY, 20, 96);
  });
  // the tail's end: whipped, then frayed
  ctx.fillStyle = '#2a2418';
  ctx.fillRect(x - 4, y1 - 14, 8, 6);
  ctx.strokeStyle = '#a88a5a';
  ctx.lineWidth = 1.2;
  for (let k = 0; k < 7; k++) {
    ctx.beginPath();
    ctx.moveTo(x - 3 + k, y1 - 6);
    ctx.quadraticCurveTo(x - 4 + k * 1.3 + (r() - 0.5) * 3, y1 + 4, x - 6 + k * 2 + (r() - 0.5) * 4, y1 + 10 + r() * 4);
    ctx.stroke();
  }
}
const ROPE_BOX = { x: ROPE_X - 20, y: BTX.axle.y - 4, w: 56, h: BTX.rope.y1 - BTX.axle.y + 40 };

// ——— the lantern ———

const LT = BTX.lantern;
/** The iron lantern on its chain from the beam: hood with a finial, four sooted panes, the flame's glow inside. */
function lantern(ctx: Ctx): void {
  const x = LT.x;
  const y = LT.top;
  hang(ctx, x, BTX.beam.y1 - 4, x, y - 6, 0, '#4a464e', 3.2, true);
  const hood = polyPath([[x - 34, y + 20], [x - 20, y + 2], [x + 20, y + 2], [x + 34, y + 20]]);
  const cage = polyPath([[x - 24, y + 20], [x + 24, y + 20], [x + 20, y + 84], [x - 20, y + 84]]);
  const base = rrPath(x - 26, y + 82, 52, 12, 3);
  for (const p of [cage, hood, base]) castShadow(ctx, p, 18, 16, 0.5, '#04040c');
  // the panes: lit from inside, sooted at the top
  const pg = ctx.createLinearGradient(0, y + 20, 0, y + 84);
  pg.addColorStop(0, 'rgba(120,70,30,0.95)');
  pg.addColorStop(0.35, 'rgba(255,190,100,0.95)');
  pg.addColorStop(1, 'rgba(255,214,140,0.95)');
  ctx.fillStyle = pg;
  cage(ctx);
  ctx.fill();
  within(ctx, cage, () => {
    ctx.fillStyle = 'rgba(255,250,220,0.5)';
    ctx.beginPath();
    ctx.ellipse(x, y + 62, 10, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(x - 18, y + 26, 5, 50);
  });
  ctx.strokeStyle = '#141216';
  ctx.lineWidth = 4;
  cage(ctx);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y + 20);
  ctx.lineTo(x, y + 84);
  ctx.moveTo(x - 22, y + 50);
  ctx.lineTo(x + 22, y + 50);
  ctx.stroke();
  solid(ctx, hood, { x: x - 34, y: y + 2, w: 68, h: 18 }, 'iron', IRON, { depth: 0.06, line: 2.2 });
  const fin = polyPath([[x - 6, y + 3], [x, y - 10], [x + 6, y + 3]]);
  solid(ctx, fin, { x: x - 6, y: y - 10, w: 12, h: 14 }, 'iron', IRON, { depth: 0.06, line: 1.6 });
  ctx.strokeStyle = '#1a181c';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y - 10, 5, 0, Math.PI * 2);
  ctx.stroke();
  solid(ctx, base, { x: x - 26, y: y + 82, w: 52, h: 12 }, 'iron', IRON, { depth: 0.06, line: 2 });
  innerEdge(ctx, hood, 'rgba(255,180,90,0.4)', 4, 0, -4, 'lighter');
}
const LANTERN_BOX = { x: LT.x - 70, y: BTX.beam.y1 - 10, w: 150, h: LT.top + 130 - BTX.beam.y1 };

/** The flame's glow for the still (live: the flame's painted frames and a halo). */
function lanternStill(ctx: Ctx): void {
  glowAt(ctx, LT.x, LT.top + 56, 130, LAMP, 0.4);
  ctx.save();
  ctx.translate(LT.x - 12, LT.top + 38);
  flameFrame(ctx, 24, 42, 0.3, ['#d84a10', '#ffa030', '#fff4c8'], 2, 7);
  ctx.restore();
}

// ——— the floor ———

function table(ctx: Ctx, r: R): void {
  floorPlane(ctx, r, BTX.front, { size: 0.44, depthK: 0.72, a: ['#5a5864', '#62606a', '#55535e', '#686670', '#5c5a62'], grout: '#34323a', gap: 0.018, gloss: 0.45, wear: 0.5, tex: 'grain', seed: 29 });
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, BTX.front - TY + 4);
  ctx.clip();
  surface(ctx, r, { x: 0, y: TY, w: W, h: BTX.front - TY }, '#64626e', { over: true, vary: 0.4, mottle: 0.3, strokes: 0.1, grain: 0, seed: 31 });
  // moss in the joints near the walls, where the rain blows in
  lay(ctx, noiseMask(16, 31, { cover: 0.24, soft: 0.1, col: '#3e5a32' }), { x: 0, y: TY, w: W, h: 110 }, 0.4);
  // the floor wet under the arches: darker, the rain pooled in the hollows, the sky in it
  for (const a of BTX.arches) {
    softly(ctx, { x: a.x0 - 100, y: TY, w: a.x1 - a.x0 + 200, h: 120 }, (g) => {
      const wg = g.createRadialGradient(0, 0, 0, 0, 0, 1);
      wg.addColorStop(0, 'rgba(14,16,30,0.45)');
      wg.addColorStop(1, 'rgba(14,16,30,0)');
      g.save();
      g.translate((a.x0 + a.x1) / 2, TY + 20);
      g.scale(330, 80);
      g.fillStyle = wg;
      g.fillRect(-1, -1, 2, 2);
      g.restore();
    }, 0.25);
    // a puddle in a hollow of the flags: soft-edged, dark, the arch's cold light lying in it as a broken streak
    const px = (a.x0 + a.x1) / 2 + (r() - 0.5) * 160;
    const py = TY + 30 + r() * 16;
    const pw = 90 + r() * 50;
    softly(ctx, { x: px - pw - 40, y: py - 30, w: pw * 2 + 80, h: 60 }, (g) => {
      g.fillStyle = 'rgba(96,108,160,0.14)';
      for (let k = 0; k < 4; k++) {
        g.beginPath();
        g.ellipse(px + (k - 1.5) * pw * 0.4 + (r() - 0.5) * 20, py + (r() - 0.5) * 6, pw * (0.35 + r() * 0.2), 6 + r() * 4, 0, 0, Math.PI * 2);
        g.fill();
      }
    }, 0.5);
    softly(ctx, { x: px - 70, y: py - 20, w: 140, h: 40 }, (g) => {
      const sg = g.createLinearGradient(px - 60, 0, px + 60, 0);
      sg.addColorStop(0, 'rgba(140,156,220,0)');
      sg.addColorStop(0.5, 'rgba(140,156,220,0.34)');
      sg.addColorStop(1, 'rgba(140,156,220,0)');
      g.fillStyle = sg;
      for (let k = 0; k < 5; k++) g.fillRect(px - 60, py - 8 + k * 3.4, 120, 1.6);
    }, 0.5);
  }
  // the lantern's warmth on the flags at the left, the arches' cold
  lightPool(ctx, LT.x + 80, 830, 620, 140, LAMP, 0.16);
  lightPool(ctx, LT.x + 40, 800, 300, 60, '#ffd090', 0.08);
  // the foot of the wall: its shadow on the flags
  crevice(ctx, 0, W, TY, 34, 0.5, '#04040c');
  for (const a of BTX.arches) {
    // the arches' own cold light laid on the flags in front of the wall (the flash throws it brighter)
    softly(ctx, { x: a.x0 - 120, y: TY, w: a.x1 - a.x0 + 240, h: 260 }, (g) => {
      g.translate((a.x0 + a.x1) / 2, TY + 18);
      g.scale(2.1, 0.95);
      g.translate(-128, 0);
      g.globalAlpha = 0.09;
      patchTex(g);
    }, 0.25, 'lighter');
  }
  // old flags crack where the bell's weight has shaken them for centuries: hairlines out at the sides and along the
  // back, away from the middle where the plates go
  const fc = { col: '#141218', lip: '#9a98a8', w: 1.3, a: 0.5 };
  for (const [cx, cy, ang, len] of [[150, 860, -0.3, 90], [330, 790, 0.2, 70], [1600, 800, -2.9, 80], [1790, 900, -2.6, 100], [700, 780, 0.1, 50], [1240, 784, 3.0, 60]] as const) crack(ctx, r, cx, cy, ang, len, fc);
  // a few pigeon feathers and grit blown in
  for (let i = 0; i < 6; i++) {
    const fx = 80 + r() * (W - 160);
    const fy = TY + 10 + r() * 50;
    if (Math.abs(fx - 960) < 700 && fy > TY + 30) continue;
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(r() * Math.PI);
    ctx.fillStyle = 'rgba(190,192,206,0.55)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,60,70,0.5)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(9, 0);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  tableFalloff(ctx, BTX.front, 0.5, '#04040a');
  tableSeam(ctx, 0.6, '#0a0a10', false);
  bounceBand(ctx, 0, W, TY, -40, '#8a8ab0', 0.05);
  // the floor's front edge: a worn stone step
  const lip = rectPath(0, BTX.front, W, 1080 - BTX.front);
  solid(ctx, lip, { x: 0, y: BTX.front, w: W, h: 40 }, LIME, '#55525e', { depth: 0, line: false, formSize: 8 });
  ctx.fillStyle = 'rgba(210,210,240,0.22)';
  ctx.fillRect(0, BTX.front, W, 2);
  // the pedestals' and the wall's contact with the floor
  for (const g of BTX.gargoyles) aoHalo(ctx, rectPath(g.x - 90, BTX.sill, 180, TY - BTX.sill), 14, 0.2, '#04040c');
}

/** The rain in the arches for the still (live: its painted frames sweep through). */
function rainStill(ctx: Ctx): void {
  // (painted on its own canvas first: the frame cuts its own edges away)
  const [cv, g] = makeCanvas(RAIN.w, RAIN.h);
  rainFrame(g, 0.37);
  for (const a of BTX.arches) ctx.drawImage(cv, far(a.x0, 0)[0], ARCH_FAR.top, RAIN.w * 2, RAIN.h * 2);
}

// ——— grade and shade ———

function grade(ctx: Ctx): void {
  gradeAll(ctx, 0.1, '#8a9ad8', 0.06, { warm: '#ffa860', cool: '#3a4ac8', a: 0.26 });
}

function shadeOver(ctx: Ctx): void {
  calmLanes(ctx, 0.12, '#04040c', 60, 520);
  vignetteAll(ctx, 0.85, '#020208', 0.5);
  vfill(ctx, 0, 0, W, 150, [[0, 'rgba(2,2,8,0.45)'], [1, 'rgba(2,2,8,0)']]);
  // the far side of the room, away from the lantern, and the floor's near corners
  const g = ctx.createLinearGradient(1200, 0, W, 0);
  g.addColorStop(0, 'rgba(2,2,8,0)');
  g.addColorStop(1, 'rgba(2,2,8,0.3)');
  ctx.fillStyle = g;
  ctx.fillRect(1200, 0, W - 1200, 1080);
  for (const [x0, x1] of [[0, 260], [W, W - 260]]) {
    const c = ctx.createLinearGradient(x0, 0, x1, 0);
    c.addColorStop(0, 'rgba(2,2,8,0.3)');
    c.addColorStop(1, 'rgba(2,2,8,0)');
    ctx.fillStyle = c;
    ctx.fillRect(Math.min(x0, x1), 900, 260, 180);
  }
}

export const GARGOYLE: SceneSpec = {
  id: 'gargoyle',
  info: {
    name: 'Bell Tower',
    subtitle: 'Boss: THE GARGOYLE',
    ambient: [],
    glows: [],
    light: '#b0c0e8',
    tableTint: '#e4e8f4',
  },
  layers: [
    { id: 'sky', box: ARCH_BOX, draw: sky },
    { id: 'walls', box: { x: 0, y: 0, w: W, h: TY }, draw: walls },
    { id: 'beam', box: { x: 0, y: 0, w: W, h: BTX.beam.y1 + 60 }, draw: beam },
    { id: 'statues', box: { x: 0, y: BTX.plinthTop - 290, w: W, h: TY - BTX.plinthTop + 290 }, draw: statues },
    { id: 'table', box: { x: 0, y: TY - 40, w: W, h: 1080 - TY + 40 }, draw: table },
    { id: 'clapper', box: CLAP_BOX, motion: 'sprite', draw: clapper },
    { id: 'bell', box: BELL_BOX, motion: 'sprite', draw: bell },
    { id: 'bellLit', box: BELL_BOX, liveOnly: true, draw: bellLit },
    { id: 'hanger', box: HANGER_BOX, draw: hanger },
    { id: 'rope', box: ROPE_BOX, motion: 'sprite', draw: rope },
    { id: 'lantern', box: LANTERN_BOX, motion: 'sprite', draw: lantern },
    { id: 'lanternStill', box: { x: LT.x - 140, y: LT.top - 80, w: 280, h: 280 }, stillOnly: true, draw: lanternStill },
    { id: 'rainStill', box: ARCH_BOX, stillOnly: true, draw: rainStill },
    { id: 'fx', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

// ——— live: frame painters ———

const NEAR = BTX.arches[0];
/** The arches' far face (where the outside begins): the rain and the lightning are cut to it. */
const ARCH_FAR = (() => {
  const [x0, sp] = far(NEAR.x0, BTX.spring);
  const x1 = far(NEAR.x1, 0)[0];
  return { x0, x1, top: sp - A_R * DEEP, sill: FAR_SILL };
})();
const RAIN = { w: (ARCH_FAR.x1 - ARCH_FAR.x0) / 2, h: (ARCH_FAR.sill - ARCH_FAR.top) / 2, n: 12 };

/**
 * One frame of rain through an arch (phase 0…1 loops): far rain as fine dense streaks falling slowly, near rain as
 * fewer, longer, brighter streaks falling twice as fast, both slanting with the wind, and a gust's veil sweeping
 * across; cut to the arch's far face (the rain is outside). Painted at half size in that face's own frame.
 */
function rainFrame(c: Ctx, phase: number): void {
  c.save();
  c.scale(0.5, 0.5);
  c.translate(-ARCH_FAR.x0, -ARCH_FAR.top);
  c.beginPath();
  archPath(NEAR, true)(c);
  c.clip();
  let s = 77;
  const rr = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const H = ARCH_FAR.sill - ARCH_FAR.top;
  const Wd = ARCH_FAR.x1 - ARCH_FAR.x0;
  const slant = 0.26;
  const layer = (n: number, speed: number, len0: number, lenV: number, col: string, w: number) => {
    c.strokeStyle = col;
    c.lineWidth = w;
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const x0 = rr() * (Wd + H * slant + 80);
      const y0 = rr();
      const len = len0 + rr() * lenV;
      const travel = ((y0 + phase * speed) % 1) * (H + len);
      const y = ARCH_FAR.top + travel - len;
      const x = ARCH_FAR.x0 + x0 - travel * slant;
      c.moveTo(x, y);
      c.lineTo(x - len * slant, y + len);
    }
    c.stroke();
  };
  layer(240, 1, 14, 16, 'rgba(150,164,214,0.2)', 1.4);
  layer(90, 2, 34, 40, 'rgba(176,190,236,0.3)', 2);
  layer(36, 3, 60, 50, 'rgba(206,218,255,0.42)', 2.6);
  // a gust's veil: a soft band of denser rain sweeping down and across
  for (let k = 0; k < 2; k++) {
    const u = (phase + k * 0.5) % 1;
    const by = ARCH_FAR.top - 120 + u * (H + 240);
    const g = c.createLinearGradient(0, by - 90, 0, by + 90);
    g.addColorStop(0, 'rgba(160,172,220,0)');
    g.addColorStop(0.5, 'rgba(160,172,220,0.1)');
    g.addColorStop(1, 'rgba(160,172,220,0)');
    c.fillStyle = g;
    c.save();
    c.translate(ARCH_FAR.x0 + Wd / 2, by);
    c.transform(1, 0, -slant, 1, 0, 0);
    c.fillRect(-Wd, -90, Wd * 2, 180);
    c.restore();
  }
  // faded out at both sides: the far face pokes out past the near one on the side away from the eye (behind the
  // pier's stone, a sliver 16 px wide), and one sheet serves both arches, mirror images of each other
  c.globalCompositeOperation = 'destination-out';
  for (const [x0, x1] of [[ARCH_FAR.x0, ARCH_FAR.x0 + 30], [ARCH_FAR.x1, ARCH_FAR.x1 - 30]]) {
    const g = c.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.6, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(Math.min(x0, x1), ARCH_FAR.top - 10, 30, H + 20);
  }
  c.restore();
}

const SPLASH = { w: 40, h: 26, n: 8 };
/** A raindrop's splash on stone (frame i of n, played once): a crown of droplets thrown up and out, a ring spreading
 * on the wet surface, everything lit cold from the arch. Surface at (w/2, h - 5). */
function splashFrame(c: Ctx, i: number): void {
  const u = (i + 0.5) / SPLASH.n;
  const cx = SPLASH.w / 2;
  const sy = SPLASH.h - 5;
  // the ring on the surface
  c.strokeStyle = `rgba(190,204,250,${(0.55 * (1 - u)).toFixed(3)})`;
  c.lineWidth = 1.2;
  c.beginPath();
  c.ellipse(cx, sy, 3 + u * 15, 1 + u * 3.2, 0, 0, Math.PI * 2);
  c.stroke();
  // the crown: a little cup rising and breaking into droplets
  if (u < 0.45) {
    const h = Math.sin((u / 0.45) * Math.PI) * 8;
    c.fillStyle = 'rgba(200,214,255,0.55)';
    c.beginPath();
    c.moveTo(cx - 5 - u * 6, sy);
    c.lineTo(cx - 3 - u * 8, sy - h);
    c.lineTo(cx + 3 + u * 8, sy - h);
    c.lineTo(cx + 5 + u * 6, sy);
    c.closePath();
    c.fill();
  }
  for (let k = 0; k < 6; k++) {
    const a = Math.PI * (0.12 + (k / 5) * 0.76);
    const v = 10 + (k % 3) * 3;
    const t = u * 1.2;
    const x = cx - Math.cos(a) * v * t * 1.3;
    const y = sy - Math.sin(a) * v * t * 1.6 + t * t * 14;
    if (y > sy) continue;
    c.fillStyle = `rgba(214,226,255,${(0.8 * (1 - u)).toFixed(3)})`;
    c.beginPath();
    c.arc(x, y, 1.2 - u * 0.5, 0, Math.PI * 2);
    c.fill();
  }
}

/** A fleck of grit or dust (particles): a soft lit speck. */
function speckFrame(c: Ctx, sz: number, i: number): void {
  const r0 = sz / 2;
  const g = c.createRadialGradient(r0 - 1, r0 - 1, 0, r0, r0, r0);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.5, i % 2 ? 'rgba(220,214,206,0.8)' : 'rgba(240,236,228,0.7)');
  g.addColorStop(1, 'rgba(220,214,206,0)');
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(r0, r0, r0 * (0.7 + (i % 3) * 0.12), r0 * (0.55 + (i % 2) * 0.2), i, 0, Math.PI * 2);
  c.fill();
}

/** The bolt painted into the far face of an arch (one of n placements): a fork from the cloud to the hills, its
 * foot lost in the rain; cut to the arch. Half size, arch frame. */
const BOLTF = { w: (ARCH_FAR.x1 - ARCH_FAR.x0) * 0.6, h: (HORIZON + 70 - ARCH_FAR.top) * 0.6, n: 4 };
function boltInArch(c: Ctx, i: number, src: HTMLCanvasElement): void {
  const k = 0.6;
  c.save();
  c.scale(k, k);
  c.translate(-ARCH_FAR.x0, -ARCH_FAR.top);
  c.beginPath();
  archPath(NEAR, true)(c);
  c.clip();
  c.beginPath();
  archPath(NEAR)(c);
  c.clip();
  const pos = [0.28, 0.62, 0.45, 0.76][i];
  const sc = [0.7, 0.62, 0.76, 0.58][i];
  const bx = ARCH_FAR.x0 + (ARCH_FAR.x1 - ARCH_FAR.x0) * pos;
  const by = ARCH_FAR.top + 20 + i * 6;
  c.translate(bx - (BOLT.w * sc) / 2, by);
  c.drawImage(src, i * BOLT.w, 0, BOLT.w, BOLT.h, 0, 0, BOLT.w * sc, BOLT.h * sc);
  c.restore();
}

/** The storm lit from inside (live, added): the banks' bellies and the rain under them, cut to the arches' far face.
 * Painted in the arches' frame at quarter size. */
function skyLit(c: Ctx): void {
  const k = 0.25;
  c.save();
  c.scale(k, k);
  c.translate(-ARCH_BOX.x, -ARCH_BOX.y);
  openings(true)(c);
  c.clip();
  openings(false)(c);
  c.clip();
  for (const [x, y, w, h] of CLOUDS) {
    for (let j = 0; j < 3; j++) {
      const cx = x - w * 0.3 + j * w * 0.3;
      const g = c.createRadialGradient(cx, y - h * 0.2, 0, cx, y - h * 0.2, h * 1.4);
      g.addColorStop(0, 'rgba(214,214,255,0.6)');
      g.addColorStop(0.5, 'rgba(150,146,230,0.26)');
      g.addColorStop(1, 'rgba(120,110,200,0)');
      c.fillStyle = g;
      c.beginPath();
      c.ellipse(cx, y - h * 0.2, h * 2, h * 1.4, 0, 0, Math.PI * 2);
      c.fill();
    }
  }
  // the town and the hills thrown up white for an instant, the rain lit
  const tg = c.createLinearGradient(0, HORIZON - 40, 0, BTX.sill);
  tg.addColorStop(0, 'rgba(170,180,240,0.35)');
  tg.addColorStop(0.4, 'rgba(140,150,220,0.14)');
  tg.addColorStop(1, 'rgba(120,130,200,0.04)');
  c.fillStyle = tg;
  c.fillRect(ARCH_BOX.x, HORIZON - 40, ARCH_BOX.w, BTX.sill - HORIZON + 40);
  c.restore();
}

/** An arch's light thrown on the floor by a flash (added): the arch's shape, round end towards us, soft. */
function patchTex(c: Ctx): void {
  c.filter = 'blur(9px)';
  c.fillStyle = 'rgba(210,220,255,0.9)';
  c.beginPath();
  c.moveTo(48, 12);
  c.lineTo(208, 12);
  c.lineTo(208, 130);
  c.arc(128, 130, 80, 0, Math.PI);
  c.closePath();
  c.fill();
  c.filter = 'none';
  // the sill's bar of shadow across its back end
  c.globalCompositeOperation = 'destination-out';
  c.fillStyle = 'rgba(0,0,0,0.6)';
  c.fillRect(0, 0, 256, 26);
}

/** The bell's ring spreading through the air (added): a soft ring. */
function ringTex(c: Ctx): void {
  const g = c.createRadialGradient(128, 128, 90, 128, 128, 126);
  g.addColorStop(0, 'rgba(255,236,200,0)');
  g.addColorStop(0.55, 'rgba(255,236,200,0.6)');
  g.addColorStop(0.75, 'rgba(255,236,200,0.25)');
  g.addColorStop(1, 'rgba(255,236,200,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 256, 256);
}

// ——— live ———

registerKitScene(GARGOYLE, (k) => {
  const fx = k.slot('fx');
  const flashes = () => save.settings.flashes && !save.settings.reducedMotion;
  const { x: AX, y: AY } = BTX.axle;

  // ——— the storm: lit cloud, bolts, rain sheets (all in the arches; nothing static stands in front of their far face)
  const litKey = k.tex('bt_skylit', Math.ceil(ARCH_BOX.w / 4), Math.ceil(ARCH_BOX.h / 4), skyLit);
  const lit = k.img(litKey, ARCH_BOX.x, ARCH_BOX.y, { into: fx, add: true, origin: [0, 0], scale: 4, alpha: 0 });
  // the arches' reveals caught by the flash: cold light on the jambs, the soffits and the sills
  const revKey = k.tex('bt_reveallit', Math.ceil(ARCH_BOX.w / 4), Math.ceil(ARCH_BOX.h / 4), (c) => {
    c.scale(0.25, 0.25);
    c.translate(-ARCH_BOX.x, -ARCH_BOX.y);
    c.beginPath();
    for (const a of BTX.arches) {
      archPath(a)(c);
      archPath(a, true)(c);
    }
    c.clip('evenodd');
    c.filter = 'blur(6px)';
    c.fillStyle = 'rgba(190,206,255,0.7)';
    c.fillRect(ARCH_BOX.x, ARCH_BOX.y, ARCH_BOX.w, ARCH_BOX.h);
  });
  const revLit = k.img(revKey, ARCH_BOX.x, ARCH_BOX.y, { into: fx, add: true, origin: [0, 0], scale: 4, alpha: 0 });
  const boltSrc = (() => {
    const [cv, g] = makeCanvas(BOLT.w * BOLT.n, BOLT.h);
    for (let i = 0; i < BOLT.n; i++) {
      g.save();
      g.translate(i * BOLT.w, 0);
      boltFrame(g, BOLT.w, BOLT.h, i);
      g.restore();
    }
    return cv;
  })();
  const boltKey = sheet(k, 'bt_bolt', BOLTF.w, BOLTF.h, BOLTF.n, (c, _p, i) => boltInArch(c, i, boltSrc));
  const farX = (i: number) => far(BTX.arches[i].x0, 0)[0];
  const bolts = BTX.arches.map((_, i) => k.img(boltKey, farX(i), ARCH_FAR.top, { into: fx, add: true, origin: [0, 0], scale: 1 / 0.6, alpha: 0 }));
  const skyFlash = BTX.arches.map((a) => k.glow((a.x0 + a.x1) / 2, 260, 260, 0xc8d4ff, 0, { into: fx, sy: 0.8 }));
  const rainKey = sheet(k, 'bt_rain', RAIN.w, RAIN.h, RAIN.n, (c, ph) => rainFrame(c, ph));
  const rains = BTX.arches.map((a, i) => new Loop(k, rainKey, RAIN.n, far(a.x0, 0)[0], ARCH_FAR.top, { into: fx, origin: [0, 0], scale: 2, fps: 14, phase: i * 5.5 }));
  // the flash's light in the room: the arches on the floor, the bell's rim, the statues, the whole room lifted
  const patchKey = k.tex('bt_patch', 256, 220, patchTex);
  const patches = BTX.arches.map((a) => k.img(patchKey, (a.x0 + a.x1) / 2, TY + 18, { into: fx, add: true, origin: [0.5, 0], sx: 2.1, sy: 0.95, alpha: 0 }));
  const SB = { x: 0, y: BTX.plinthTop - 290, w: W, h: 330 };
  const stKey = k.tex('bt_statueslit', Math.ceil(SB.w / 2), Math.ceil(SB.h / 2), (c) => {
    c.scale(0.5, 0.5);
    c.translate(-SB.x, -SB.y);
    statuesLit(c);
  });
  const stLit = k.img(stKey, SB.x, SB.y, { into: fx, add: true, origin: [0, 0], scale: 2, alpha: 0 });
  const roomFlash = k.wash(0xa8b8ff, 0, Phaser.BlendModes.ADD, fx);
  let strikeT = -1;
  let strikeP: number[] = [];
  let which = 0;
  let nextStrike = 2.5 + crand() * 3;
  let thunder = -1;

  // ——— rain on the sills: drips off the arches' crowns, painted splashes
  const splashKey = sheet(k, 'bt_splash', SPLASH.w, SPLASH.h, SPLASH.n, (c, _p, i) => splashFrame(c, i));
  type Spl = { img: Phaser.GameObjects.Image; t: number; dur: number };
  const spl: Spl[] = Array.from({ length: 40 }, () => ({ img: k.img(splashKey, 0, 0, { into: fx, origin: [0.5, (SPLASH.h - 5) / SPLASH.h] }).setVisible(false), t: -1, dur: 0.3 }));
  const splash = (x: number, y: number, sc = 1) => {
    const s = spl.find((q) => q.t < 0);
    if (!s) return;
    s.t = 0;
    s.dur = 0.26 + crand() * 0.1;
    s.img.setPosition(x, y).setScale(sc * (0.8 + crand() * 0.5)).setVisible(true).setFlipX(crand() < 0.5);
  };
  const splashRate = new Rate();
  const drips = new Parts(k, { frame: 'drop', into: fx, max: 30 });
  const dripRate = new Rate();
  const sillY = (near: number) => FAR_SILL + (BTX.sill - FAR_SILL) * near;
  const sillX = (i: number, near: number) => {
    const a = BTX.arches[i];
    const fx0 = far(a.x0, 0)[0];
    const fx1 = far(a.x1, 0)[0];
    const x0 = fx0 + (a.x0 - fx0) * near;
    const x1 = Math.min(a.x1, fx1 + (a.x1 - fx1) * near);
    return x0 + 14 + crand() * (x1 - x0 - 28);
  };

  // ——— hero: the bell. It swings on its gudgeons as a heavy pendulum; the clapper, a shorter one hung inside it,
  // swings on its own beat, so the bell catches it up and it strikes the sound bow: the bell rings.
  const bellImg = k.pivot(k.sprite('bell'), AX, AY);
  const bellLitImg = k.pivot(k.sprite('bellLit'), AX, AY).setBlendMode(Phaser.BlendModes.ADD);
  const clapImg = k.pivot(k.sprite('clapper'), CLAP.x, CLAP.y);
  const ropeImg = k.pivot(k.sprite('rope'), ROPE_X, AY);
  const CLAP_R = CLAP.y - AY;
  const bellW = 2 * Math.PI * 0.42;
  const clapW = 2 * Math.PI * 0.62;
  const LIM = 0.13;
  let bA = 0;
  let bV = 0;
  let cA = 0;
  let cV = 0;
  let hum = 0;
  let humT = 0;
  const rings: { img: Phaser.GameObjects.Image; t: number; a: number }[] = [];
  const ringKey = k.tex('bt_ring', 256, 256, ringTex);
  for (let i = 0; i < 4; i++) rings.push({ img: k.img(ringKey, AX, 330, { into: fx, add: true, alpha: 0 }), t: -1, a: 0 });
  const lipGlint = k.glow(AX, B.lip - 20, 90, 0xffd8a0, 0, { into: fx, sy: 0.3 });
  const specks = sheet(k, 'bt_speck', 12, 12, 4, (c, _p, i) => speckFrame(c, 12, i));
  const grit = new Parts(k, { frame: 'mote', sheet: { key: specks, n: 4, half: 6 }, into: fx, max: 160 });
  const dust = new Parts(k, { frame: 'puff', into: fx, max: 30 });
  const ring = (s: number) => {
    const a = Phaser.Math.Clamp(s / 0.7, 0.15, 1);
    hum = Math.max(hum, a);
    humT = 0;
    const r0 = rings.find((q) => q.t < 0);
    if (r0) {
      r0.t = 0;
      r0.a = a;
    }
    // the struck side of the sound bow flashes (where it is now, swung)
    const lx0 = Math.sign(cA - bA) * 112;
    const ly0 = B.lip - 18 - AY;
    lipGlint.setPosition(AX + lx0 * Math.cos(bA) - ly0 * Math.sin(bA), AY + lx0 * Math.sin(bA) + ly0 * Math.cos(bA)).setAlpha(0.55 * a);
    // grit shaken off the frame and the headstock
    for (let i = 0; i < 4 + a * 14; i++) grit.spawn({ x: AX - 300 + crand() * 600, y: BTX.beam.y1 + 2, vx: (crand() - 0.5) * 12, vy: 10 + crand() * 30, life: 2.6, r0: 1 + crand() * 1.6, a: 0.75, tint: 0xb0aaa4, grav: 300, drag: 0.5, floor: TY + crand() * 30 });
    if (a > 0.5) for (let i = 0; i < 3; i++) dust.spawn({ x: AX - 200 + crand() * 400, y: BTX.beam.y1 + 4, vx: (crand() - 0.5) * 20, vy: 6 + crand() * 10, life: 2.2, r0: 10, r1: 34, a: 0.18, tint: 0x8a8690, drag: 0.6, fade: 0.3 });
    if (a > 0.45) scareAll(AX, a);
  };

  // ——— the lantern on its chain
  const lampImg = k.pivot(k.sprite('lantern'), LT.x, BTX.beam.y1 - 4);
  const lampSw = new Swing(lampImg, { k: 4.2, c: 0.5, idle: 0.012, seed: 2, speed: 0.7 });
  const flameKey = sheet(k, 'bt_flame', 36, 60, 12, (c, ph) => flameFrame(c, 36, 60, ph, ['#d84a10', '#ffa030', '#fff4c8'], 2, 7));
  const flame = new Loop(k, flameKey, 12, LT.x, LT.top + 78, { into: fx, origin: [0.5, 1], add: true, fps: 14, sx: 0.6, sy: 0.72 });
  const halo = k.glow(LT.x, LT.top + 56, 140, 0xffa040, 0.35, { into: fx });
  const wallGlow = k.glow(LT.x, LT.top + 80, 280, 0xff9a40, 0.08, { into: fx, sy: 0.9 });
  const LL = LT.top + 60 - (BTX.beam.y1 - 4);

  // ——— pigeons sheltering on the sills: they strut and peck; a stomp or the bell sends them out into the rain,
  // and they come back to the same spot in a glide
  const pigeonKey = sheet(k, 'bt_pigeon', PIGEON.w, PIGEON.h, PIGEON.n, (c, _ph, i) => pigeonFrame(c, i));
  type Pg = { img: Phaser.GameObjects.Image; sc: number; x: number; y: number; hx: number; hy: number; state: 'sit' | 'fly' | 'away' | 'land'; vx: number; vy: number; t: number; flap: number; peck: number; dir: number; arch: number; wait: number };
  const homes: [number, number, number][] = [[0, 0.62, 0.92], [0, 0.78, 0.78], [1, 0.3, 0.9]];
  const pigeons: Pg[] = homes.map(([i, u, near]) => {
    const a = BTX.arches[i];
    const x = a.x0 + (a.x1 - a.x0) * u;
    const y = sillY(near);
    const dir = crand() < 0.5 ? 1 : -1;
    const sc = 0.62 + near * 0.16;
    const img = k.img(pigeonKey, x, y, { into: fx, origin: [PIGEON.fx / PIGEON.w, PIGEON.fy / PIGEON.h], scale: sc }).setFlipX(dir < 0);
    return { img, sc, x, y, hx: x, hy: y, state: 'sit', vx: 0, vy: 0, t: crand() * 5, flap: 0, peck: 1 + crand() * 3, dir, arch: i, wait: 0 };
  });
  const feathers = new Parts(k, { frame: 'flake', into: fx, max: 24 });
  function scare(p: Pg, power: number): void {
    if (p.state !== 'sit') return;
    p.state = 'fly';
    const a = BTX.arches[p.arch];
    // out through the arch: up and away towards its middle, getting smaller
    p.dir = p.x < (a.x0 + a.x1) / 2 ? 1 : -1;
    p.vx = p.dir * (80 + crand() * 60 + power * 40);
    p.vy = -150 - crand() * 60;
    p.img.setFlipX(p.dir < 0);
    p.t = 0;
    p.flap = crand() * 8;
    for (let n = 0; n < 2; n++) feathers.spawn({ x: p.x + (crand() - 0.5) * 14, y: p.y - 14, vx: (crand() - 0.5) * 60, vy: -30 - crand() * 30, life: 2.2, r0: 3, a: 0.7, tint: 0xb8bacc, grav: 30, drag: 1.6, spin: (crand() - 0.5) * 8 });
  }
  function scareAll(x: number, power: number): void {
    for (const p of pigeons) if (Math.abs(p.x - x) < 500 + power * 900) scare(p, power);
  }

  const RW = (BTX.arches[0].x1 - BTX.arches[0].x0) / 2;
  let gust = 0;
  let gustT = 4;

  return {
    impact(x, _y, kk) {
      // the bell is heavy: a stomp sets it going away from the foot, harder ones swing it far enough to ring
      bV = Phaser.Math.Clamp(bV + (x < AX ? 1 : -1) * (0.22 + kk * 0.5) * calm(), -0.95, 0.95);
      lampSw.kick((x < LT.x ? 1 : -1) * (0.4 + kk * 0.8));
      // grit off the frame, wherever the stomp is
      for (let i = 0; i < 3 + kk * 14; i++) grit.spawn({ x: Math.max(40, Math.min(W - 40, x + (crand() - 0.5) * 700)), y: BTX.beam.y1 + 2, vx: (crand() - 0.5) * 10, vy: 10 + crand() * 30, life: 2.6, r0: 1 + crand() * 1.5, a: 0.7, tint: 0xa8a49e, grav: 300, drag: 0.5, floor: TY + crand() * 30 });
      if (kk > 0.25) scareAll(x, kk);
    },
    update(dt, t) {
      // ——— the bell and its clapper (a few small steps a frame: the strikes want it)
      const n = 4;
      const h = Math.min(dt, 0.05) / n;
      for (let s = 0; s < n; s++) {
        bV += (-bellW * bellW * Math.sin(bA) - 0.4 * bV) * h;
        bA += bV * h;
        // the clapper hangs off a pivot that moves with the bell: it's dragged along by the bell's swing
        cV += (-clapW * clapW * Math.sin(cA) - 0.5 * (cV - bV) - 0.08 * cV) * h;
        cA += cV * h;
        const rel = cA - bA;
        if (Math.abs(rel) > LIM) {
          const vr = cV - bV;
          cA = bA + Math.sign(rel) * LIM;
          if (vr * Math.sign(rel) > 0) {
            cV = bV - vr * 0.3;
            if (Math.abs(vr) > 0.08) ring(Math.abs(vr));
          }
        }
      }
      // a ringing bell shivers: a fine tremble dying away with the hum
      humT += dt;
      hum *= Math.exp(-dt * 1.4);
      const tremble = hum * Math.sin(humT * 70) * 0.004 * calm();
      bellImg.setRotation(bA + tremble);
      bellLitImg.setRotation(bA + tremble);
      clapImg.setPosition(AX - Math.sin(bA) * CLAP_R, AY + Math.cos(bA) * CLAP_R).setRotation(cA);
      // the wheel turns with the bell: the rope pays out on one swing and hauls in on the other, and swings a little
      const pay = BTX.wheelR * bA;
      ropeImg.setScale(1, 1 + pay / (BTX.rope.y1 - AY)).setRotation(-bV * 0.012 + Math.sin(t * 0.9) * 0.002);
      for (const rg of rings) {
        if (rg.t < 0) continue;
        rg.t += dt;
        const u = rg.t / 1.5;
        if (u >= 1) {
          rg.t = -1;
          rg.img.setAlpha(0);
          continue;
        }
        rg.img.setPosition(AX - Math.sin(bA) * 180, AY + Math.cos(bA) * 180).setScale(0.7 + u * 3.6, (0.7 + u * 3.6) * 0.72).setAlpha(rg.a * 0.3 * (1 - u) ** 1.5 * calm());
      }
      lipGlint.setAlpha(lipGlint.alpha * Math.exp(-dt * 5));
      grit.update(dt);
      dust.update(dt);

      // ——— the lantern
      lampSw.update(dt, t);
      const la = lampSw.angle;
      const lx = LT.x - Math.sin(la) * LL;
      const ly = BTX.beam.y1 - 4 + Math.cos(la) * LL;
      flame.step(dt);
      const fl = flicker(t, 1);
      flame.each((im) => im.setPosition(lx - Math.sin(la) * 18, ly + 18).setRotation(-la * 0.6 - lampSw.vel * 0.15 - gust * 0.12));
      halo.setPosition(lx, ly - 4).setAlpha(0.3 * fl);
      wallGlow.setPosition(lx + 10, ly + 24).setAlpha(0.06 * fl);

      // ——— wind: gusts drive the rain harder
      gustT -= dt;
      if (gustT < 0) {
        gustT = 5 + crand() * 7;
        gust = 1;
      }
      gust = Math.max(0, gust - dt * 0.3);
      const g2 = Math.sin(Math.min(1, gust) * Math.PI);
      for (const rl of rains) {
        rl.alpha = 0.85 + g2 * 0.15;
        rl.step(dt, (1 + g2 * 0.5) * calm());
      }
      splashRate.tick((26 + g2 * 30) * calm(), dt, () => {
        const i = crand() < 0.5 ? 0 : 1;
        const near = Math.pow(crand(), 1.6);
        splash(sillX(i, near), sillY(near), 0.7 + near * 0.4);
      });
      for (const s of spl) {
        if (s.t < 0) continue;
        s.t += dt;
        const u = s.t / s.dur;
        if (u >= 1) {
          s.t = -1;
          s.img.setVisible(false);
        } else s.img.setFrame(Math.min(SPLASH.n - 1, Math.floor(u * SPLASH.n)));
      }
      // drips off the crown of each arch, gathering and falling to the sill
      dripRate.tick(1.6 * calm(), dt, () => {
        const i = crand() < 0.5 ? 0 : 1;
        const a = BTX.arches[i];
        const dx = (crand() - 0.5) * RW * 0.9;
        const x = (a.x0 + a.x1) / 2 + dx;
        const y = BTX.spring - Math.sqrt(A_R * A_R - dx * dx) + 6;
        drips.spawn({ x, y, vy: 30, life: 2, r0: 2.4, a: 0.7, tint: 0xc8d4ff, grav: 1100, streak: 0.01, floor: BTX.sill - 2, onFloor: (sx, sy) => splash(sx, sy, 1.1) });
      });
      drips.update(dt);
      feathers.update(dt);

      // ——— lightning: a fork in one arch, the cloud lit from inside, the flash in the room; the thunder after it
      // rumbles the bell on its gudgeons
      nextStrike -= dt;
      if (nextStrike < 0) {
        strikeT = 0;
        nextStrike = 5 + crand() * 7;
        which = crand() < 0.5 ? 0 : 1;
        strikeP = [0, 0.15 + crand() * 0.06];
        if (crand() < 0.5) strikeP.push(0.33 + crand() * 0.1);
        bolts[which].setFrame(Math.floor(crand() * BOLTF.n)).setFlipX(crand() < 0.5);
        thunder = 0.6 + crand() * 0.8;
      }
      let st = 0;
      if (strikeT >= 0) {
        strikeT += dt;
        for (const s0 of strikeP) {
          const u = strikeT - s0;
          if (u >= 0) st = Math.max(st, u < 0.07 ? 1 : Math.exp(-(u - 0.07) * 7));
        }
        if (strikeT > 1.8) strikeT = -1;
      }
      if (thunder > 0) {
        thunder -= dt;
        if (thunder <= 0) bV += (crand() < 0.5 ? 1 : -1) * 0.05 * calm();
      }
      const fk = flashes() ? 1 : 0.25;
      bolts.forEach((b, i) => b.setAlpha(i === which ? st * fk : 0));
      skyFlash.forEach((g, i) => g.setAlpha((i === which ? 0.5 : 0.18) * st * fk));
      lit.setAlpha(Math.min(1, st * 0.9) * fk);
      revLit.setAlpha(st * 0.45 * fk);
      // the arches' light thrown across the floor, slanting away from the strike's side
      patches.forEach((p, i) => p.setAlpha((i === which ? 0.4 : 0.22) * st * fk).setX((BTX.arches[i].x0 + BTX.arches[i].x1) / 2 + (which === 0 ? 40 : -40)));
      bellLitImg.setAlpha(st * fk);
      stLit.setAlpha(st * 0.85 * fk);
      roomFlash.setAlpha(st * 0.1 * fk);

      // ——— pigeons
      for (const p of pigeons) {
        p.t += dt;
        if (p.state === 'sit') {
          // strut and bob, now and then a peck at the wet stone
          p.peck -= dt;
          let f = Math.floor(p.t * 3) % 4;
          if (p.peck < 0) {
            f = 4 + Math.min(2, Math.floor(-p.peck * 8));
            if (p.peck < -0.4) p.peck = 1.5 + crand() * 3;
          }
          p.img.setFrame(f).setPosition(p.x, p.y).setAlpha(1);
          // the storm's flash scares the nearest one now and then
          if (st > 0.9 && crand() < dt * 2) scare(p, 0.3);
        } else if (p.state === 'fly') {
          p.flap += dt * 16;
          p.img.setFrame(PIGEON.flap0 + (Math.floor(p.flap) % 8));
          p.vy += 60 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          const u = Math.min(1, p.t / 1.6);
          p.img.setPosition(p.x, p.y).setScale(p.sc * (1 - u * 0.6)).setAlpha(1 - u * u);
          if (u >= 1) {
            p.state = 'away';
            p.t = 0;
            p.wait = 8 + crand() * 10;
            p.img.setAlpha(0);
          }
        } else if (p.state === 'away') {
          if (p.t > p.wait) {
            p.state = 'land';
            p.t = 0;
          }
        } else {
          // gliding back in out of the rain, growing as it comes, wings out, then a few beats to settle
          const u = Math.min(1, p.t / 1.4);
          const e = 1 - (1 - u) * (1 - u);
          const sx = p.hx - p.dir * 160 * (1 - e);
          const sy = p.hy - 120 * (1 - e);
          p.img.setPosition(sx, sy).setScale(p.sc * (0.4 + 0.6 * e)).setAlpha(Math.min(1, u * 3)).setFrame(u < 0.7 ? PIGEON.glide : PIGEON.flap0 + (Math.floor(p.t * 18) % 8)).setFlipX(p.dir > 0 ? false : true);
          if (u >= 1) {
            p.state = 'sit';
            p.x = p.hx;
            p.y = p.hy;
            p.img.setScale(p.sc);
          }
        }
      }
    },
  };
});

