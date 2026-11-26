// Trattoria Nonna (Act 1, waves 1–4): the first room every player sees, and the home of Waiter Walt and the Head
// Waiter (his fight comes in on the third wave). Painted with the location kit (src/art/scene) and its frame
// animation (src/game/sceneAnim.ts); the first kit version is kept for the before/after page (scene-trattoria-v1.ts).
//
// A lime-washed trattoria at the end of the day: the wood-fired oven on the left (its fire rolling across the vault
// from the logs, the coals breathing, heat shimmering over the mouth and smoke curling up the sooted dome, a pizza
// baking on the floor), the FEETZA neon over the tables (it buzzes, and its Z stutters now and then; its pink falls on
// the wall), green louvred shutters folded back from the arched window to the street, the red gingham café curtains
// stirring in the draught, the chalkboard menu, the shelf of bottles with garlic and chillies hanging under it, the
// checked cloth and a candle in a chianti fiasco.
//
// Across the stage's waves the street goes from a golden evening to night (the sun's light on the cloth fades out,
// the windows across the street and the string lights come on) while the room glows warmer: the oven, the candles and
// the neon light it more as the street darkens. People and scooters go by in the street on real walk and ride cycles.
//
// A stomp swings the lamps, the hanging garlic and chillies and the NO FEET sign, sends the curtains billowing, sifts
// dust from the beam and, near the oven, kicks embers out onto its ledge; a big one makes the neon stutter. A tray
// clanging down (Walt's or the Head Waiter's: 'tray-clang' from src/game/trayToss.ts) makes the oven flare.

import Phaser from 'phaser';
import { CHALK, ROUND, neonStroke, neonText, noFeetSign } from '../../art/backdrops';
import {
  type Air,
  type Ctx,
  type R,
  TY,
  W,
  bounce,
  calmLanes,
  castShadow,
  crevice,
  ellPath,
  glowAt,
  gradeAll,
  groundShadow,
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
import { aoHalo, bounceBand, lampOnWall, lightPatch, shaft } from '../../art/scene/light';
import { type Reflect, board, brickPatch, bricks, broken, checkerCloth, clothDrape, grain, panel, plaster, tableFalloff, tableSeam, varnish, woodGrain } from '../../art/scene/materials';
import { chips, crack, drift, grime, lay, noiseMask, softly, streaks, surface } from '../../art/scene/paint';
import { bottle, drape, glassPane, hang, herbPot, pendantLamp, wallShadow } from '../../art/scene/props';
import { ao, spec as specHi } from '../../art/style/kit';
import { MATERIALS } from '../../art/style/materials';
import { hashStr, makeCanvas, mix, rgba, rng, shade } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { save } from '../../systems/save';
import { Loop, Parts, Rate, Swing, sheet, steamFrame } from '../../game/sceneAnim';
import { calm, flicker, registerKitScene, waveK, wander } from '../../game/sceneLive';

// ——— layout ———

export const TN = {
  beam: 52,
  wainscot: 600,
  front: 1040,
  oven: { x: 280, mouthY: 600, archTop: 432, mouthHalf: 108, domeTop: 250 },
  flue: { x: 280, w: 54 },
  lamps: [610, 1312] as const,
  lampY: 290,
  neon: { x: 960, y: 196 },
  sign: { x: 946, y: 432, w: 136 },
  shelf: { x0: 640, x1: 884, y: 470 },
  win: { x0: 1100, x1: 1340, top: 300, sill: 592, archY: 420 },
  board: { x: 1482, y: 196, w: 352, h: 352 },
  peel: { x: 586, y: 758 },
  candle: { x: 1792, y: 806 },
  /** The joints in the beam, the corbels under it: one shared spacing. */
  joist: { x0: 120, step: 340 },
  /** The street through the window: the far pavement (walkers' feet) and the road (scooters' wheels). */
  street: { facade: 462, pave: 556, kerb: 566, walk: 563, ride: 586 },
  votive: { x: 1354, y: 590 },
};

const P2 = Math.PI * 2;
const ROOM: Air = { color: '#4a2a1c', far: 0.5 };
const PLASTER = '#e2b27a';
const WALNUT = '#5e3520';
/** Lime plaster on a curved form: chalky, warm shadows, no veins. */
const LIME = { ...MATERIALS.stone, name: 'Lime plaster', shadowTint: '#7a3414', tex: 'grain' as const, texA: 0.3, rim: 0.3 };
const BRICK = ['#b5532f', '#a5452a', '#c0653a', '#93402a', '#b85c35', '#9e4b2e', '#c9713f'];
const SHUTTER = '#3f7a5a';

const winCX = (TN.win.x0 + TN.win.x1) / 2;
const winR = (TN.win.x1 - TN.win.x0) / 2;
/** The window's opening: an arch over a rectangle (sub: add to the current path instead of starting one). */
const winPath = (inset = 0, sub = false) => (c: Ctx) => {
  if (!sub) c.beginPath();
  c.moveTo(TN.win.x0 + inset, TN.win.sill);
  c.lineTo(TN.win.x0 + inset, TN.win.archY);
  c.arc(winCX, TN.win.archY, winR - inset, Math.PI, 0);
  c.lineTo(TN.win.x1 - inset, TN.win.sill);
  c.closePath();
};
const WIN_BOX = { x: TN.win.x0 - 4, y: TN.win.archY - winR - 4, w: winR * 2 + 8, h: TN.win.sill - (TN.win.archY - winR) + 8 };

// ——— the street through the window ———

/** Cobbles in rows that grow towards us, each a rounded stone lit on its top. */
function cobbles(ctx: Ctx, r: R, x0: number, x1: number, y0: number, y1: number, col: string, lit: string, dark: string): void {
  let y = y0;
  let row = 0;
  while (y < y1) {
    const h = 3.2 + ((y - y0) / (y1 - y0)) * 5;
    const w = h * 1.9;
    for (let x = x0 - (row % 2) * w * 0.5; x < x1 + w; x += w) {
      const cx = x + (r() - 0.5) * 1.2;
      ctx.fillStyle = jitterHex(col, r, 0.08);
      ctx.beginPath();
      ctx.ellipse(cx, y + h * 0.5, w * 0.44, h * 0.42, 0, 0, P2);
      ctx.fill();
      ctx.fillStyle = lit;
      ctx.beginPath();
      ctx.ellipse(cx - w * 0.06, y + h * 0.32, w * 0.3, h * 0.18, 0, 0, P2);
      ctx.fill();
    }
    ctx.fillStyle = dark;
    ctx.fillRect(x0, y + h - 0.8, x1 - x0, 0.8);
    y += h;
    row++;
  }
}

function jitterHex(base: string, r: R, amt: number): string {
  return shade(base, (r() - 0.5) * amt * 2);
}

/** The street at the hour: 0 the golden evening (wave 1), 1 the blue hour (waves 2–3: the afterglow, the first
 * windows lit), 2 night (wave 4: every window and lamp lit, the string lights on, a young moon). */
type Hour = 0 | 1 | 2;

function street(ctx: Ctx, r: R, hour: Hour): void {
  const { x0, x1, sill } = TN.win;
  const top = TN.win.archY - winR;
  const S = TN.street;
  const w = x1 - x0;
  const pick = <T,>(day: T, dusk: T, night: T): T => (hour === 0 ? day : hour === 1 ? dusk : night);
  const night = hour === 2;
  const lamps = hour > 0;
  ctx.save();
  winPath(0)(ctx);
  ctx.clip();
  // the sky: the sun going down in gold, the blue hour with its afterglow low in the west, or the night (a town's
  // night: never black, the haze over the roofs lit warm from below)
  vfill(ctx, x0, top, w, sill - top, pick<[number, string][]>(
    [[0, '#8a90b4'], [0.22, '#d8a88a'], [0.42, '#f6b874'], [0.6, '#ffcc7c'], [0.78, '#ffe0a0'], [1, '#fff0c4']],
    [[0, '#1c2654'], [0.35, '#34407a'], [0.55, '#7a5c8e'], [0.72, '#d88a70'], [0.86, '#f4ac74'], [1, '#f8c48a']],
    [[0, '#121a40'], [0.45, '#26326c'], [0.72, '#3e3c76'], [0.86, '#5a4878'], [1, '#6a5070']],
  ));
  if (hour > 0) {
    for (let i = 0; i < (night ? 34 : 12); i++) {
      const s = r() < 0.15 ? 2 : 1.1;
      ctx.fillStyle = rgba('#fff6dc', (0.3 + r() * 0.6) * (night ? 1 : 0.6));
      ctx.fillRect(x0 + r() * w, top + r() * (night ? 130 : 70), s, s);
    }
  }
  if (night) {
    // a young moon low over the roofs, its dark side faintly lit by the earth
    const mx = x0 + 56;
    const my = top + 74;
    glowAt(ctx, mx, my, 50, '#c8d4ff', 0.35);
    ctx.fillStyle = 'rgba(70,80,130,0.6)';
    ctx.beginPath();
    ctx.arc(mx, my, 11, 0, P2);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.arc(mx, my, 11, 0, P2);
    ctx.clip();
    ctx.fillStyle = '#f4ecd0';
    ctx.beginPath();
    ctx.arc(mx, my, 11, 0, P2);
    ctx.arc(mx + 6, my - 3, 11, 0, P2, true);
    ctx.fill('evenodd');
    ctx.restore();
  } else if (hour === 0) {
    // the sun sinking behind the roofs across the street: a gold bloom, a soft disc, cloud bars lit from below
    glowAt(ctx, x0 + 52, S.facade - 22, 190, '#ffcf7a', 0.65, 0.7);
    glowAt(ctx, x0 + 52, S.facade - 14, 50, '#fff0c0', 0.8);
    ctx.fillStyle = '#fff6d8';
    ctx.beginPath();
    ctx.arc(x0 + 52, S.facade - 10, 15, 0, P2);
    ctx.fill();
  } else {
    // the afterglow where the sun went down
    glowAt(ctx, x0 + 60, S.facade - 10, 170, '#ff9a5a', 0.45, 0.6);
  }
  if (hour < 2) {
    softly(ctx, { x: x0, y: top, w, h: 180 }, (g) => {
      for (let i = 0; i < 5; i++) {
        const cx = x0 + 30 + r() * (w - 40);
        const cy = top + 60 + i * 22 + r() * 10;
        const rx = 50 + r() * 60;
        g.fillStyle = rgba(pick('#d8a08a', '#4a4070', '#000000'), 0.5);
        g.beginPath();
        g.ellipse(cx, cy, rx, 6 + r() * 3, 0, 0, P2);
        g.fill();
        g.fillStyle = rgba(pick('#ffd890', '#ff9a70', '#000000'), 0.65);
        g.beginPath();
        g.ellipse(cx - 6, cy + 3, rx * 0.8, 3, 0, 0, P2);
        g.fill();
      }
    }, 0.5);
  }
  // the town beyond: tiled roofs stepping down, a campanile and a dome, all in the haze
  const far = pick('#c08a7e', '#3c3260', '#2a2c58');
  const farD = pick('#a87670', '#30284e', '#22244a');
  ctx.fillStyle = far;
  ctx.beginPath();
  ctx.moveTo(x0, S.facade + 10);
  let fx = x0;
  ctx.lineTo(x0, 440);
  while (fx < x1) {
    const ww = 26 + r() * 30;
    const hh = 428 + r() * 22;
    ctx.lineTo(fx + 4, hh);
    ctx.lineTo(fx + ww * 0.5, hh - 8);
    ctx.lineTo(fx + ww - 4, hh);
    if (r() < 0.4) {
      ctx.lineTo(fx + ww - 8, hh);
      ctx.lineTo(fx + ww - 8, hh - 12);
      ctx.lineTo(fx + ww - 3, hh - 12);
      ctx.lineTo(fx + ww - 3, hh);
    }
    fx += ww;
  }
  ctx.lineTo(x1, S.facade + 10);
  ctx.closePath();
  ctx.fill();
  // far windows lit as the evening goes on
  if (lamps) {
    for (let i = 0; i < (night ? 16 : 7); i++) {
      ctx.fillStyle = rgba('#ffc870', 0.5 + r() * 0.4);
      ctx.fillRect(x0 + 6 + r() * (w - 12), 440 + r() * 18, 2, 2.5);
    }
  }
  const cx = x0 + 150;
  ctx.fillStyle = farD;
  ctx.fillRect(cx - 9, 382, 18, 70);
  ctx.beginPath();
  ctx.moveTo(cx - 11, 384);
  ctx.lineTo(cx, 362);
  ctx.lineTo(cx + 11, 384);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = pick('#f8c8a0', '#5a4a78', '#ffcf7a');
  ctx.beginPath();
  ctx.roundRect(cx - 4, 390, 8, 12, [4, 4, 0, 0]);
  ctx.fill();
  if (night) glowAt(ctx, cx, 396, 14, '#ffc870', 0.5);
  ctx.fillStyle = farD;
  ctx.beginPath();
  ctx.arc(x1 - 58, 434, 26, Math.PI, 0);
  ctx.rect(x1 - 86, 434, 56, 20);
  ctx.fill();
  ctx.fillRect(x1 - 60, 398, 4, 12);
  ctx.fillStyle = pick(rgba('#ffe0b0', 0.5), 'rgba(140,120,200,0.25)', 'rgba(150,160,230,0.25)');
  ctx.beginPath();
  ctx.arc(x1 - 58, 434, 26, Math.PI * 1.05, Math.PI * 1.4);
  ctx.lineTo(x1 - 58, 434);
  ctx.fill();
  // the haze over the town (warm from the lamps below it at night)
  vfill(ctx, x0, 400, w, S.facade - 400 + 10, pick<[number, string][]>(
    [[0, 'rgba(255,210,150,0)'], [1, 'rgba(255,210,150,0.5)']],
    [[0, 'rgba(200,110,110,0)'], [1, 'rgba(200,110,110,0.35)']],
    [[0, 'rgba(160,110,120,0)'], [1, 'rgba(200,140,120,0.35)']],
  ));
  // the house across the street: ochre plaster in its own shade (the sun is behind it), tiled eaves against the sky
  const fac = pick('#c88a58', '#5e4660', '#4a3c66');
  const box = { x: x0, y: S.facade, w, h: S.pave - S.facade };
  surface(ctx, r, box, fac, { vary: 0.5, cells: 3, mottle: 0.5, strokes: 0.8, strokeLen: 40, strokeW: 8, grain: 0.18, seed: 40 + hour });
  vfill(ctx, x0, S.facade, w, box.h, pick<[number, string][]>(
    [[0, 'rgba(90,30,20,0.2)'], [1, 'rgba(255,200,130,0.15)']],
    [[0, 'rgba(20,14,40,0.3)'], [1, 'rgba(20,14,40,0)']],
    [[0, 'rgba(10,10,30,0.25)'], [1, 'rgba(255,170,90,0.1)']],
  ));
  ctx.fillStyle = pick('#a8523a', '#4a2838', '#40263a');
  ctx.fillRect(x0, S.facade - 9, w, 9);
  for (let x = x0 + 2; x < x1; x += 9) {
    ctx.fillStyle = pick('#c8663e', '#5a3040', '#4e2e42');
    ctx.beginPath();
    ctx.arc(x + 4, S.facade - 4, 4, Math.PI, 0);
    ctx.fill();
  }
  ctx.fillStyle = pick('#e8b47c', '#7a5c72', '#5e5280');
  ctx.fillRect(x0, S.facade, w, 4);
  ctx.fillStyle = 'rgba(40,16,10,0.4)';
  ctx.fillRect(x0, S.facade + 4, w, 3);
  // upper windows with green shutters (one closed, its light showing through the louvres at night)
  const upper = [x0 + 34, x0 + 112, x0 + 190] as const;
  upper.forEach((wx, i) => {
    const wy = S.facade + 16;
    const lit = (hour === 1 && i === 0) || night;
    const closed = i === 1;
    ctx.fillStyle = 'rgba(30,14,10,0.35)';
    ctx.fillRect(wx - 15, wy - 3, 32, 40);
    if (!closed) {
      ctx.fillStyle = lit ? '#ffc864' : pick('#5a3a44', '#1c1a38', '#141430');
      ctx.fillRect(wx - 12, wy, 26, 34);
      if (lit) {
        glowAt(ctx, wx + 1, wy + 18, 40, '#ffa848', 0.55);
        ctx.fillStyle = 'rgba(90,40,20,0.55)';
        ctx.beginPath();
        ctx.arc(wx + 4, wy + 16, 4, 0, P2);
        ctx.fill();
        ctx.fillRect(wx, wy + 20, 9, 14);
      } else if (hour === 0) {
        vfill(ctx, wx - 12, wy, 26, 34, [[0, 'rgba(255,220,170,0.5)'], [1, 'rgba(255,220,170,0)']]);
      }
      ctx.fillStyle = 'rgba(40,20,14,0.6)';
      ctx.fillRect(wx, wy, 2, 34);
      ctx.fillRect(wx - 12, wy + 15, 26, 2);
    }
    const sh = lit ? '#2e5a46' : pick('#3a6a50', '#1e3430', '#1a2e2a');
    const leaves = closed ? [[wx - 13, 13], [wx + 1, 13]] : [[wx - 23, 10], [wx + 15, 10]];
    for (const [sx, sw] of leaves) {
      ctx.fillStyle = sh;
      ctx.fillRect(sx, wy - 2, sw, 38);
      for (let y = wy + 2; y < wy + 34; y += 4) {
        ctx.fillStyle = closed && night ? 'rgba(255,190,90,0.7)' : 'rgba(0,0,0,0.3)';
        ctx.fillRect(sx + 1, y, sw - 2, 1.2);
      }
      ctx.fillStyle = hour === 0 ? 'rgba(255,220,180,0.25)' : 'rgba(160,170,230,0.12)';
      ctx.fillRect(sx, wy - 2, 1.5, 38);
    }
    ctx.fillStyle = pick('#f0c898', '#6a5470', '#5a5280');
    ctx.fillRect(wx - 16, wy + 36, 34, 3);
    if (i === 2) {
      ctx.fillStyle = pick('#d8a478', '#5a4460', '#4a4068');
      ctx.fillRect(wx - 24, wy + 39, 50, 4);
      ctx.strokeStyle = hour === 0 ? '#2a1a1a' : '#0c0c18';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(wx - 22, wy + 28, 46, 11);
      for (let x = wx - 18; x < wx + 24; x += 5) {
        ctx.beginPath();
        ctx.moveTo(x, wy + 28);
        ctx.lineTo(x, wy + 39);
        ctx.stroke();
      }
    }
    for (let k = 0; k < 7; k++) {
      ctx.fillStyle = hour === 0 ? ['#e0403a', '#ff6a5a', '#c8282a'][k % 3] : lit ? '#a03040' : '#5a2438';
      ctx.beginPath();
      ctx.arc(wx - 13 + k * 4.4, wy + 34 + (k % 2) * 2, 2.6, 0, P2);
      ctx.fill();
      ctx.fillStyle = hour === 0 ? '#3a6a2a' : '#1a2a22';
      ctx.fillRect(wx - 13 + k * 4.4, wy + 36, 2, 3);
    }
  });
  // the ground floor: a bakery with a striped awning and an arched door with a lantern over it
  const gy = S.facade + 62;
  ctx.fillStyle = lamps ? '#ffd890' : '#4a2c30';
  ctx.fillRect(x0 + 24, gy + 8, 80, S.pave - gy - 10);
  if (lamps) {
    glowAt(ctx, x0 + 64, gy + 22, 64, '#ffb050', night ? 0.6 : 0.45, 0.7);
    for (let k = 0; k < 6; k++) {
      ctx.fillStyle = '#b8742e';
      ctx.beginPath();
      ctx.ellipse(x0 + 34 + k * 12, gy + 22 + (k % 2) * 10, 5, 2.5, 0, 0, P2);
      ctx.fill();
    }
  } else {
    vfill(ctx, x0 + 24, gy + 8, 80, S.pave - gy - 10, [[0, 'rgba(255,220,180,0.4)'], [0.4, 'rgba(255,220,180,0)']]);
  }
  for (let k = 0; k < 10; k++) {
    ctx.fillStyle = k % 2 ? pick('#f4e6c8', '#7a6a78', '#6a5a6a') : pick('#c8342a', '#6a2434', '#6a2232');
    ctx.beginPath();
    ctx.moveTo(x0 + 18 + k * 9.2, gy - 6);
    ctx.lineTo(x0 + 18 + (k + 1) * 9.2, gy - 6);
    ctx.lineTo(x0 + 14 + (k + 1) * 9.8, gy + 6);
    ctx.lineTo(x0 + 14 + k * 9.8, gy + 6);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x0 + 14 + (k + 0.5) * 9.8, gy + 6, 4.9, 0, Math.PI);
    ctx.fill();
  }
  if (lamps) {
    // the shop's light under the awning
    ctx.fillStyle = 'rgba(255,190,100,0.25)';
    ctx.fillRect(x0 + 14, gy + 6, 100, 6);
  }
  ctx.fillStyle = 'rgba(20,10,20,0.3)';
  ctx.fillRect(x0 + 14, gy + 11, 100, 4);
  const dx = x0 + 150;
  ctx.fillStyle = pick('#4a2818', '#1a1428', '#100c1c');
  ctx.beginPath();
  ctx.moveTo(dx - 14, S.pave);
  ctx.lineTo(dx - 14, gy + 12);
  ctx.arc(dx, gy + 12, 14, Math.PI, 0);
  ctx.lineTo(dx + 14, S.pave);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = pick('#e8b888', '#6a5470', '#5a5280');
  ctx.lineWidth = 2;
  ctx.stroke();
  // the lantern over the door: lit at night
  ctx.fillStyle = '#1e1612';
  ctx.fillRect(dx - 1, gy - 12, 2, 6);
  ctx.fillStyle = night ? '#ffe4a0' : '#6a5a4a';
  ctx.fillRect(dx - 4, gy - 8, 8, 10);
  if (night) {
    glowAt(ctx, dx, gy - 2, 46, '#ffc870', 0.6);
    lightPool(ctx, dx, S.pave - 6, 40, 16, '#ffc070', 0.3);
  }
  ctx.fillStyle = pick('#7a503a', '#2a2238', '#221e36');
  ctx.fillRect(x1 - 46, S.facade - 4, 4, S.pave - S.facade + 4);
  // the street lamp on its bracket: on from the blue hour
  const lx = x1 - 22;
  ctx.strokeStyle = '#1e1612';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x1 - 44, 496);
  ctx.quadraticCurveTo(lx, 490, lx, 504);
  ctx.stroke();
  ctx.fillStyle = lamps ? '#fff0b0' : '#e8d0a0';
  ctx.beginPath();
  ctx.moveTo(lx - 7, 504);
  ctx.lineTo(lx + 7, 504);
  ctx.lineTo(lx + 4, 518);
  ctx.lineTo(lx - 4, 518);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1e1612';
  ctx.fillRect(lx - 8, 502, 16, 3);
  if (lamps) {
    glowAt(ctx, lx, 514, night ? 90 : 60, '#ffd27a', night ? 0.7 : 0.45);
    lightPool(ctx, lx - 10, 540, 80, 44, '#ffc870', night ? 0.32 : 0.18);
  }
  // string lights strung across the street: lit at night
  ctx.strokeStyle = hour === 0 ? 'rgba(80,50,40,0.6)' : 'rgba(20,16,30,0.8)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const y = 484 + Math.sin(t * Math.PI) * 14;
    if (i) ctx.lineTo(x0 + t * w, y);
    else ctx.moveTo(x0, y);
  }
  ctx.stroke();
  for (let i = 0; i <= 10; i++) {
    const t = (i + 0.5) / 11;
    const x = x0 + t * w;
    const y = 486 + Math.sin(t * Math.PI) * 14;
    ctx.fillStyle = night ? ['#ffe6a0', '#ffb070', '#ffd8a0'][i % 3] : pick('#9a8070', '#4a4050', '#000000');
    ctx.beginPath();
    ctx.ellipse(x, y, 1.8, 2.6, 0, 0, P2);
    ctx.fill();
    if (night) glowAt(ctx, x, y, 13, '#ffc870', 0.6);
  }
  // the pavement and its kerb, the road in cobbles
  vfill(ctx, x0, S.pave, w, S.kerb - S.pave, pick<[number, string][]>([[0, '#9a7660'], [1, '#aa8668']], [[0, '#3a3048'], [1, '#342a42']], [[0, '#3a3250'], [1, '#322a46']]));
  for (let x = x0 + 8; x < x1; x += 22) {
    ctx.fillStyle = 'rgba(30,16,16,0.3)';
    ctx.fillRect(x, S.pave, 1, S.kerb - S.pave);
  }
  ctx.fillStyle = pick('#e0bc90', '#6a5870', '#5e5280');
  ctx.fillRect(x0, S.kerb - 1, w, 2);
  ctx.fillStyle = 'rgba(20,10,10,0.45)';
  ctx.fillRect(x0, S.kerb + 1, w, 2);
  vfill(ctx, x0, S.kerb + 2, w, sill - S.kerb - 2, pick<[number, string][]>([[0, '#8a6450'], [1, '#7a5444']], [[0, '#2c2440'], [1, '#241e36']], [[0, '#2a2440'], [1, '#221c36']]));
  cobbles(ctx, r, x0, x1, S.kerb + 3, sill, pick('#9a7460', '#3a3050', '#383050'), pick('rgba(255,220,160,0.35)', 'rgba(220,150,140,0.16)', 'rgba(255,200,130,0.16)'), 'rgba(10,6,10,0.5)');
  if (lamps) lightPool(ctx, x1 - 30, 576, 70, 12, '#ffc870', night ? 0.34 : 0.2);
  if (night) lightPool(ctx, x0 + 64, 574, 60, 10, '#ffb050', 0.25);
  if (hour === 0) lightPool(ctx, x0 + 60, 580, 90, 10, '#ffd090', 0.3);
  // seen through old glass and the room's air
  ctx.fillStyle = rgba(pick('#ffd8a0', '#4a4a80', '#303868'), pick(0.08, 0.1, 0.08));
  ctx.fillRect(x0, top, w, sill - top);
  ctx.restore();
}

// ——— people and scooters in the street (painted frames: walk and ride cycles) ———

type Kind = 'man' | 'woman' | 'nonna' | 'delivery';
/** A walker's frame: 2× the size it's shown, the feet on `ground`. */
const WK = { w: 78, h: 124, n: 12, ground: 120, scale: 0.44 };
interface Look {
  s: number;
  stride: number;
  lean: number;
  skin: string;
  legs: string;
  top: string;
  shoe: string;
  hair: string;
  /** Display px the figure travels per walk cycle (two steps), so its feet don't slide. */
  cycle: number;
  speed: number;
}
const LOOKS: Record<Kind, Look> = {
  man: { s: 1, stride: 0.42, lean: 0.03, skin: '#c48a68', legs: '#2e3444', top: '#6a4a3a', shoe: '#1a1214', hair: '#2a1a14', cycle: 34, speed: 19 },
  woman: { s: 0.95, stride: 0.34, lean: 0.02, skin: '#d09a78', legs: '#b0786a', top: '#efe0c8', shoe: '#5a1a1a', hair: '#3a2018', cycle: 27, speed: 17 },
  nonna: { s: 0.86, stride: 0.26, lean: 0.16, skin: '#c89478', legs: '#3a3036', top: '#262026', shoe: '#1a1214', hair: '#e8e4dc', cycle: 18, speed: 10 },
  delivery: { s: 0.98, stride: 0.46, lean: 0.06, skin: '#b07a58', legs: '#2a3a5a', top: '#f2ece0', shoe: '#e8e4dc', hair: '#1a1210', cycle: 38, speed: 24 },
};

/** A limb: a rounded stroke from a to b, its top-left edge catching the sky. */
function limb(c: Ctx, ax: number, ay: number, bx: number, by: number, w: number, col: string): void {
  c.lineCap = 'round';
  c.strokeStyle = col;
  c.lineWidth = w;
  c.beginPath();
  c.moveTo(ax, ay);
  c.lineTo(bx, by);
  c.stroke();
  c.strokeStyle = rgba(shade(col, 0.35), 0.55);
  c.lineWidth = w * 0.3;
  c.beginPath();
  c.moveTo(ax - w * 0.25, ay - w * 0.1);
  c.lineTo(bx - w * 0.25, by - w * 0.1);
  c.stroke();
}

function walkerFrame(c: Ctx, kind: Kind, ph: number): void {
  const L = LOOKS[kind];
  const s = L.s;
  const g = WK.ground;
  const thigh = 25 * s;
  const shin = 23 * s;
  const torso = 34 * s;
  const head = 7.5 * s;
  const bob = -1.5 * s * Math.cos(P2 * ph * 2);
  const hipX = WK.w / 2 - 8;
  const hipY = g - (thigh + shin) * 0.97 + bob;
  const shX = hipX + Math.sin(L.lean) * torso;
  const shY = hipY - Math.cos(L.lean) * torso;
  const far = (col: string) => mix(col, '#1a1024', 0.35);
  const legAt = (q: number) => {
    const a = L.stride * Math.sin(P2 * q);
    const k = 0.08 + 0.75 * Math.max(0, Math.cos(P2 * q)) ** 1.5;
    const kx = hipX + Math.sin(a) * thigh;
    const ky = hipY + Math.cos(a) * thigh;
    const ax = kx + Math.sin(a - k) * shin;
    const ay = Math.min(g - 2, ky + Math.cos(a - k) * shin);
    return { kx, ky, ax, ay, a, k };
  };
  const leg = (q: number, back: boolean) => {
    const p = legAt(q);
    const col = back ? far(L.legs) : L.legs;
    limb(c, hipX, hipY, p.kx, p.ky, 8.5 * s, col);
    limb(c, p.kx, p.ky, p.ax, p.ay, 7 * s, col);
    // the shoe, toe forward, flattening as it plants
    c.fillStyle = back ? far(L.shoe) : L.shoe;
    c.beginPath();
    c.ellipse(p.ax + 3.5 * s, p.ay + 1, 6 * s, 2.8 * s, (p.a - p.k) * 0.35, 0, P2);
    c.fill();
  };
  const arm = (q: number, back: boolean, fixed?: [number, number]) => {
    const a = fixed ? fixed[0] : -L.stride * 0.95 * Math.sin(P2 * q);
    const bend = fixed ? fixed[1] : 0.25 + 0.25 * Math.max(0, -Math.sin(P2 * q));
    const ex = shX + Math.sin(a) * 17 * s;
    const ey = shY + 3 + Math.cos(a) * 17 * s;
    const hx = ex + Math.sin(a + bend) * 15 * s;
    const hy = ey + Math.cos(a + bend) * 15 * s;
    const sleeve = kind === 'nonna' ? L.top : kind === 'woman' ? L.top : kind === 'delivery' ? L.top : L.top;
    const col = back ? far(sleeve) : sleeve;
    limb(c, shX, shY + 3, ex, ey, 7 * s, col);
    limb(c, ex, ey, hx, hy, 6 * s, kind === 'delivery' ? (back ? far(L.skin) : L.skin) : col);
    c.fillStyle = back ? far(L.skin) : L.skin;
    c.beginPath();
    c.arc(hx, hy, 2.8 * s, 0, P2);
    c.fill();
    return [hx, hy] as const;
  };
  // the far side first, darker
  if (kind === 'delivery') arm(ph + 0.5, true, [0.42, 1.05]);
  else if (kind !== 'nonna') arm(ph + 0.5, true);
  else arm(ph + 0.5, true, [0.1 - 0.16 * Math.sin(P2 * ph), 0.25]);
  leg(ph + 0.5, true);
  leg(ph, false);
  // the body
  const bodyCol = kind === 'nonna' ? L.top : kind === 'woman' ? '#a8323e' : kind === 'delivery' ? L.top : L.top;
  if (kind === 'woman' || kind === 'nonna') {
    // a dress: A-line from the waist, its hem swinging with the stride
    const hem = kind === 'woman' ? hipY + thigh * 0.95 : hipY + thigh + shin * 0.6;
    const sw = 2.2 * s * Math.sin(P2 * ph * 2);
    const dcol = kind === 'woman' ? '#a8323e' : '#2a2228';
    c.fillStyle = dcol;
    c.beginPath();
    c.moveTo(hipX - 7 * s, hipY - 6 * s);
    c.lineTo(hipX + 7 * s + Math.sin(L.lean) * 4, hipY - 6 * s);
    c.quadraticCurveTo(hipX + 12 * s, hipY + 10 * s, hipX + 13 * s + sw, hem);
    c.quadraticCurveTo(hipX, hem + 2.5 * s, hipX - 12 * s + sw, hem - 1);
    c.quadraticCurveTo(hipX - 10 * s, hipY + 8 * s, hipX - 7 * s, hipY - 6 * s);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.beginPath();
    c.moveTo(hipX + 2 * s, hipY);
    c.quadraticCurveTo(hipX + 4 * s + sw, hipY + 14 * s, hipX + 2 * s + sw, hem);
    c.lineTo(hipX + 6 * s + sw, hem);
    c.quadraticCurveTo(hipX + 6 * s, hipY + 10 * s, hipX + 2 * s, hipY);
    c.fill();
  }
  // the torso
  const tc = kind === 'woman' ? L.top : bodyCol;
  // (tapered: broad shoulders, a waist, the chest's curve in front)
  c.beginPath();
  c.moveTo(shX - 8.5 * s, shY + 1);
  c.quadraticCurveTo(shX, shY - 3 * s, shX + 8.5 * s, shY + 1);
  c.quadraticCurveTo(shX + 9.5 * s, shY + torso * 0.35, hipX + 6 * s, hipY - torso * 0.25);
  c.lineTo(hipX + 7 * s, hipY + 2 * s);
  c.lineTo(hipX - 7 * s, hipY + 2 * s);
  c.lineTo(hipX - 6 * s, hipY - torso * 0.25);
  c.quadraticCurveTo(shX - 9 * s, shY + torso * 0.35, shX - 8.5 * s, shY + 1);
  c.closePath();
  c.fillStyle = tc;
  c.fill();
  // its form: lit from the top left, turning into shade on the far side and towards the waist
  const tg = c.createLinearGradient(shX - 9 * s, shY - 2, shX + 9 * s, hipY);
  tg.addColorStop(0, 'rgba(255,240,220,0.4)');
  tg.addColorStop(0.4, 'rgba(255,240,220,0.04)');
  tg.addColorStop(1, 'rgba(20,10,30,0.42)');
  c.fillStyle = tg;
  c.fill();
  c.strokeStyle = 'rgba(255,236,210,0.45)';
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(shX - 8 * s, shY + 2);
  c.quadraticCurveTo(shX - 8.5 * s, shY + torso * 0.35, hipX - 6 * s, hipY - torso * 0.25);
  c.stroke();
  if (kind === 'man') {
    // the jacket open over a pale shirt, a belt
    c.fillStyle = '#e8dcc8';
    c.beginPath();
    c.moveTo(shX + 2 * s, shY);
    c.lineTo(shX + 5 * s, shY);
    c.lineTo(hipX + 4 * s, hipY - 8 * s);
    c.closePath();
    c.fill();
    c.fillStyle = '#1a1214';
    c.fillRect(hipX - 7 * s, hipY - 2 * s, 14 * s, 2 * s);
  } else if (kind === 'delivery') {
    // a red apron and cap: Feetza's own delivery lad
    c.fillStyle = '#c0302a';
    c.beginPath();
    c.moveTo(shX - 5 * s, shY + 9 * s);
    c.lineTo(shX + 6 * s, shY + 9 * s);
    c.lineTo(hipX + 8 * s, hipY + 12 * s);
    c.lineTo(hipX - 7 * s, hipY + 12 * s);
    c.closePath();
    c.fill();
  } else if (kind === 'nonna') {
    // the shawl over her shoulders and back
    c.fillStyle = '#6a6470';
    c.beginPath();
    c.moveTo(shX - 10 * s, shY - 1);
    c.quadraticCurveTo(shX, shY - 4 * s, shX + 9 * s, shY);
    c.lineTo(shX + 4 * s, shY + 14 * s);
    c.lineTo(shX - 9 * s, shY + 16 * s);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.2)';
    c.lineWidth = 1;
    c.stroke();
  }
  // the neck and head
  const hx = shX + Math.sin(L.lean) * 6 + 1;
  const hy = shY - 5 * s - head;
  c.fillStyle = L.skin;
  c.fillRect(shX - 2 * s, shY - 6 * s, 4 * s, 7 * s);
  c.beginPath();
  c.ellipse(hx, hy, head * 0.9, head, 0, 0, P2);
  c.fill();
  // nose and the face turned the way they walk
  c.beginPath();
  c.moveTo(hx + head * 0.8, hy - 1);
  c.lineTo(hx + head * 1.15, hy + 2);
  c.lineTo(hx + head * 0.8, hy + 3);
  c.fill();
  const hg = c.createLinearGradient(hx - head, 0, hx + head, 0);
  hg.addColorStop(0, 'rgba(255,236,210,0.3)');
  hg.addColorStop(1, 'rgba(40,16,20,0.25)');
  c.fillStyle = hg;
  c.beginPath();
  c.ellipse(hx, hy, head * 0.9, head, 0, 0, P2);
  c.fill();
  // hair and hats
  c.fillStyle = L.hair;
  if (kind === 'man') {
    c.fillStyle = '#3a2a22';
    c.beginPath();
    c.ellipse(hx, hy - head * 0.55, head * 1.55, head * 0.28, -0.05, 0, P2);
    c.fill();
    c.beginPath();
    c.roundRect(hx - head * 0.8, hy - head * 1.45, head * 1.6, head * 0.95, [head * 0.5, head * 0.5, 1, 1]);
    c.fill();
    c.fillStyle = '#8a2a22';
    c.fillRect(hx - head * 0.8, hy - head * 0.78, head * 1.6, head * 0.18);
  } else if (kind === 'delivery') {
    c.fillStyle = '#c0302a';
    c.beginPath();
    c.arc(hx, hy - head * 0.3, head * 0.95, Math.PI, 0);
    c.fill();
    c.fillRect(hx, hy - head * 0.45, head * 1.4, head * 0.25);
  } else {
    c.beginPath();
    c.arc(hx - 1, hy - head * 0.2, head * 0.98, Math.PI * 0.85, Math.PI * 2.05);
    c.fill();
    c.beginPath();
    c.arc(hx - head * 0.85, hy - head * 0.6, head * 0.5, 0, P2);
    c.fill();
  }
  // the near arm, and what they carry
  if (kind === 'delivery') {
    const [ax, ay] = arm(ph, false, [0.5, 1.05]);
    // a stack of pizza boxes held out in front, bobbing with the step
    const bx = ax - 2;
    const by = ay - 4;
    for (let k = 0; k < 3; k++) {
      c.fillStyle = k % 2 ? '#c8a070' : '#d8b484';
      c.fillRect(bx - 10 * s, by - k * 3.6 * s, 24 * s, 3.4 * s);
      c.fillStyle = 'rgba(80,40,20,0.4)';
      c.fillRect(bx - 10 * s, by - k * 3.6 * s + 2.8 * s, 24 * s, 0.6 * s);
    }
    c.fillStyle = '#c0302a';
    c.fillRect(bx, by - 2 * 3.6 * s + 0.6, 5 * s, 2 * s);
  } else if (kind === 'nonna') {
    // her basket carried at her side, swinging a little with her step, a loaf sticking out of it
    const sw = 0.1 * Math.sin(P2 * ph);
    const [ax, ay] = arm(ph, false, [0.18 + sw, 0.12]);
    const by = ay + 7 * s;
    c.strokeStyle = '#6a4220';
    c.lineWidth = 1.4;
    c.beginPath();
    c.arc(ax, by, 7 * s, Math.PI, 0);
    c.stroke();
    c.save();
    c.translate(ax + 3, by - 2);
    c.rotate(0.55);
    c.fillStyle = '#d8a864';
    c.beginPath();
    c.roundRect(-2.2, -13, 4.4, 16, 2);
    c.fill();
    c.restore();
    c.fillStyle = '#9a6a3a';
    c.beginPath();
    c.moveTo(ax - 9 * s, by);
    c.lineTo(ax + 9 * s, by);
    c.lineTo(ax + 7 * s, by + 10 * s);
    c.lineTo(ax - 7 * s, by + 10 * s);
    c.closePath();
    c.fill();
    c.strokeStyle = '#6a4220';
    c.lineWidth = 1;
    for (let k = 1; k < 3; k++) {
      c.beginPath();
      c.moveTo(ax - 8 * s, by + k * 3.2 * s);
      c.lineTo(ax + 8 * s, by + k * 3.2 * s);
      c.stroke();
    }
  } else {
    const [ax, ay] = arm(ph, false);
    if (kind === 'woman') {
      // a handbag swinging from her hand
      c.fillStyle = '#5a1a1a';
      c.beginPath();
      c.roundRect(ax - 5 * s, ay + 1, 10 * s, 8 * s, 2);
      c.fill();
      c.strokeStyle = '#3a1010';
      c.lineWidth = 1;
      c.beginPath();
      c.arc(ax, ay + 2, 3.5 * s, Math.PI, 0);
      c.stroke();
    }
  }
}

/** A scooter's frame (a Vespa with a delivery box on its rack): 2× size, the wheels on `ground`. */
const SC = { w: 150, h: 114, n: 8, ground: 108, scale: 0.42, cycle: 34, speed: 80 };

function scooterFrame(c: Ctx, ph: number): void {
  const g = SC.ground;
  const bob = Math.sin(P2 * ph * 2) * 1.6;
  const body = '#7ec4ae';
  const wheels: [number, number][] = [[36, g - 13], [114, g - 13]];
  for (const [wx, wy] of wheels) {
    c.fillStyle = '#16121a';
    c.beginPath();
    c.arc(wx, wy, 13, 0, P2);
    c.fill();
    c.fillStyle = '#b8b8c0';
    c.beginPath();
    c.arc(wx, wy, 6, 0, P2);
    c.fill();
    // the tread turning
    c.strokeStyle = 'rgba(120,110,120,0.8)';
    c.lineWidth = 1.6;
    for (let k = 0; k < 5; k++) {
      const a = P2 * (ph + k / 5);
      c.beginPath();
      c.moveTo(wx + Math.cos(a) * 9, wy + Math.sin(a) * 9);
      c.lineTo(wx + Math.cos(a) * 12, wy + Math.sin(a) * 12);
      c.stroke();
    }
    // the hub's spokes turning with the wheel
    c.strokeStyle = '#4a4a56';
    c.lineWidth = 1.4;
    for (let k = 0; k < 5; k++) {
      const a = P2 * (ph + k / 5);
      c.beginPath();
      c.moveTo(wx, wy);
      c.lineTo(wx + Math.cos(a) * 6, wy + Math.sin(a) * 6);
      c.stroke();
    }
    c.fillStyle = '#e8e8f0';
    c.beginPath();
    c.arc(wx, wy, 1.8, 0, P2);
    c.fill();
  }
  // (the body rides its springs: up and down a touch with the road)
  c.save();
  c.translate(0, Math.sin(P2 * ph * 2 + 1) * 0.8);
  // the rear cowl over the engine, the floorboard, the leg shield up to the handlebars, the front mudguard
  const shape = (cc: Ctx) => {
    cc.beginPath();
    cc.moveTo(14, g - 18);
    cc.bezierCurveTo(10, g - 40, 30, g - 50, 56, g - 46);
    cc.lineTo(70, g - 40);
    cc.lineTo(72, g - 22);
    cc.lineTo(98, g - 22);
    cc.lineTo(102, g - 60);
    cc.lineTo(110, g - 62);
    cc.bezierCurveTo(112, g - 40, 110, g - 26, 104, g - 16);
    cc.lineTo(62, g - 14);
    cc.bezierCurveTo(50, g - 12, 24, g - 10, 14, g - 18);
    cc.closePath();
  };
  shape(c);
  c.fillStyle = body;
  c.fill();
  const bg = c.createLinearGradient(0, g - 62, 0, g - 10);
  bg.addColorStop(0, 'rgba(255,250,230,0.35)');
  bg.addColorStop(0.5, 'rgba(255,250,230,0)');
  bg.addColorStop(1, 'rgba(20,30,40,0.4)');
  c.fillStyle = bg;
  c.fill();
  c.strokeStyle = '#1e2a2a';
  c.lineWidth = 1.6;
  c.stroke();
  c.fillStyle = body;
  c.beginPath();
  c.arc(114, g - 13, 16, Math.PI * 1.05, Math.PI * 1.85);
  c.lineTo(114, g - 13);
  c.fill();
  c.strokeStyle = '#d8dce0';
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(72, g - 22);
  c.lineTo(98, g - 22);
  c.stroke();
  // the seat and the delivery box on the rack
  c.fillStyle = '#2a1e1c';
  c.beginPath();
  c.roundRect(32, g - 52, 34, 7, 3);
  c.fill();
  c.fillStyle = '#c0302a';
  c.beginPath();
  c.roundRect(8, g - 70, 26, 22, 2);
  c.fill();
  c.fillStyle = '#f2e6cc';
  c.font = 'bold 9px sans-serif';
  c.textAlign = 'center';
  c.fillText('F', 21, g - 56);
  // the headlamp and the handlebars
  c.strokeStyle = '#2a2a30';
  c.lineWidth = 2.5;
  c.beginPath();
  c.moveTo(106, g - 64);
  c.lineTo(86, g - 70);
  c.stroke();
  c.fillStyle = '#e8e8d8';
  c.beginPath();
  c.arc(110, g - 64, 4.5, 0, P2);
  c.fill();
  // the rider: helmet, a scarf streaming behind, hands on the bars
  const y = bob;
  const hip: [number, number] = [52, g - 52 + y];
  const knee: [number, number] = [78, g - 48 + y];
  const foot: [number, number] = [84, g - 24];
  limb(c, hip[0], hip[1], knee[0], knee[1], 8, '#2a3448');
  limb(c, knee[0], knee[1], foot[0], foot[1], 7, '#2a3448');
  c.fillStyle = '#1a1214';
  c.beginPath();
  c.ellipse(foot[0] + 3, foot[1], 5, 2.6, 0, 0, P2);
  c.fill();
  const sh: [number, number] = [64, g - 82 + y];
  c.fillStyle = '#8a4a2a';
  c.beginPath();
  c.moveTo(hip[0] - 7, hip[1] + 2);
  c.lineTo(hip[0] + 7, hip[1] + 2);
  c.lineTo(sh[0] + 8, sh[1]);
  c.lineTo(sh[0] - 8, sh[1] - 1);
  c.closePath();
  c.fill();
  limb(c, sh[0], sh[1] + 3, 78, g - 62 + y, 6.5, '#8a4a2a');
  limb(c, 78, g - 62 + y, 87, g - 70, 5.5, '#8a4a2a');
  // the hand closed round the grip
  c.fillStyle = '#1a1214';
  c.beginPath();
  c.ellipse(87, g - 70, 4, 2.6, -0.3, 0, P2);
  c.fill();
  c.fillStyle = '#c48a68';
  c.beginPath();
  c.arc(88, g - 71, 3, 0, P2);
  c.fill();
  // the scarf
  c.fillStyle = '#e8c848';
  c.beginPath();
  c.moveTo(sh[0] - 4, sh[1] - 2);
  for (let k = 0; k <= 6; k++) {
    const t = k / 6;
    c.lineTo(sh[0] - 6 - t * 26, sh[1] - 1 + Math.sin(P2 * ph * 2 + t * 4) * 3 * t + t * 2);
  }
  for (let k = 6; k >= 0; k--) {
    const t = k / 6;
    c.lineTo(sh[0] - 6 - t * 26, sh[1] + 4 + Math.sin(P2 * ph * 2 + t * 4) * 3 * t + t * 2);
  }
  c.closePath();
  c.fill();
  c.fillStyle = '#c48a68';
  c.fillRect(sh[0] - 1, sh[1] - 7, 5, 6);
  c.beginPath();
  c.arc(sh[0] + 3, sh[1] - 12, 7, 0, P2);
  c.fill();
  c.fillStyle = '#e8e0d0';
  c.beginPath();
  c.arc(sh[0] + 2, sh[1] - 14, 8, Math.PI * 0.95, Math.PI * 2.1);
  c.fill();
  c.fillStyle = '#3a3a48';
  c.fillRect(sh[0] + 4, sh[1] - 15, 6, 3);
  c.restore();
}

// ——— the room ———

function wall(ctx: Ctx, r: R): void {
  const box = { x: 0, y: 0, w: W, h: TN.wainscot };
  plaster(ctx, r, box, PLASTER, { wash: 0.85, patina: 0.62, seed: 9, grime: { top: 110, left: 70, right: 100, a: 0.45 } });
  // the lime wash laid on by hand: broad arcs of a slightly paler coat, its edges a touch darker where it dried
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, TN.wainscot);
  ctx.clip();
  ctx.lineCap = 'round';
  for (let i = 0; i < 70; i++) {
    const x = r() * W;
    const y = TN.beam + r() * (TN.wainscot - TN.beam);
    const rad = 40 + r() * 70;
    const a0 = r() * P2;
    ctx.strokeStyle = rgba(r() < 0.6 ? '#f4cc98' : '#b8784a', 0.05 + r() * 0.05);
    ctx.lineWidth = 10 + r() * 16;
    ctx.beginPath();
    ctx.arc(x, y, rad, a0, a0 + 1 + r() * 1.4);
    ctx.stroke();
  }
  // rising damp: a soft tide-mark over the chair rail, its upper edge wandering
  ctx.fillStyle = 'rgba(90,50,24,0.1)';
  ctx.beginPath();
  ctx.moveTo(0, TN.wainscot);
  for (let x = 0; x <= W; x += 40) ctx.lineTo(x, TN.wainscot - 46 - Math.sin(x * 0.011) * 10 - Math.sin(x * 0.037 + 2) * 6);
  ctx.lineTo(W, TN.wainscot);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,50,24,0.12)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
  // where the wall has worn through to its brick: round the flue, where the heat has cracked the plaster off, and low
  // by the window where chair backs knock it
  brickPatch(ctx, r, TN.flue.x + 74, 150, 46, 30, BRICK, '#b8946a', PLASTER, 44, 18);
  brickPatch(ctx, r, TN.board.x + 190, 574, 40, 16, BRICK, '#b8946a', PLASTER, 44, 18);
  // years of the room: the oven's smoke climbing the wall over the dome, darkest under the ceiling; the lamps' heat
  // browning the plaster over each shade; damp run down from the beam and from the ends of the window sill
  softly(ctx, { x: 0, y: 0, w: 1500, h: 440 }, (g) => {
    g.fillStyle = 'rgba(40,20,10,0.32)';
    g.beginPath();
    g.ellipse(TN.flue.x + 20, TN.beam + 30, 280, 74, 0, 0, P2);
    g.fill();
    const sg = g.createLinearGradient(0, 0, 0, TN.oven.domeTop + 60);
    sg.addColorStop(0, 'rgba(30,14,6,0.5)');
    sg.addColorStop(1, 'rgba(30,14,6,0)');
    g.fillStyle = sg;
    g.beginPath();
    g.ellipse(TN.oven.x + 10, 60, 260, 250, 0, 0, P2);
    g.fill();
    for (const lx of TN.lamps) {
      g.fillStyle = 'rgba(110,60,20,0.18)';
      g.beginPath();
      g.ellipse(lx, TN.lampY - 110, 56, 92, 0, 0, P2);
      g.fill();
    }
  }, 0.125);
  for (const [sx, sl] of [[1600, 140], [1890, 240], [430, 100], [800, 70]] as const) streaks(ctx, r, sx, TN.beam, 40, sl, '#6a3a1a', 0.15, 4);
  streaks(ctx, r, TN.win.x0 - 30, TN.win.sill + 14, 16, 70, '#6a4020', 0.2, 3);
  streaks(ctx, r, TN.win.x1 + 30, TN.win.sill + 14, 16, 60, '#6a4020', 0.2, 3);
  // cracks where the wall's stress gathers: off the corners of the arch and the sill, down from the beam
  const cr = { col: '#5a2a10', lip: '#fff0d0', w: 1.6, a: 0.5 };
  crack(ctx, r, TN.win.x1 + 58, TN.win.archY - winR * 0.62, -0.9, 90, cr);
  crack(ctx, r, TN.win.x0 - 46, TN.win.sill + 18, 2.2, 70, cr);
  crack(ctx, r, 1700, TN.beam + 4, 1.75, 110, cr);
  crack(ctx, r, 470, TN.beam + 4, 1.4, 60, cr);
  crack(ctx, r, 1420, TN.beam + 4, 1.6, 50, cr);
  // the light: darker up under the ceiling, the oven's warmth on the left, the neon's pink spill
  vfill(ctx, 0, 0, W, TN.wainscot, [[0, 'rgba(40,14,4,0.62)'], [0.35, 'rgba(40,14,4,0.26)'], [1, 'rgba(40,14,4,0.34)']]);
  lightPool(ctx, TN.oven.x + 40, 420, 540, 380, '#ff9a4a', 0.17);
  lightPool(ctx, TN.neon.x, TN.neon.y + 30, 560, 280, '#ff5aa8', 0.12);
  lightPool(ctx, TN.neon.x, TN.neon.y + 10, 380, 150, '#ff7ab8', 0.08, 'lighter');
  for (const lx of TN.lamps) lampOnWall(ctx, lx, TN.lampY + 2, 72, { col: '#e8a868', a: 0.8, reach: 330, spread: 290, gap: 50, above: 0.35, op: 'lighter' });
  // the evening coming in at the window warms its reveal and the wall round it
  lightPool(ctx, winCX, TN.win.sill - 60, 280, 210, '#ffb878', 0.09);
  // the ceiling beam: oak, sooted, its underside in shadow, its lower arris catching the lamplight
  crevice(ctx, 0, W, TN.wainscot - 10, -46, 0.32);
  crevice(ctx, 0, W, TN.beam, 86, 0.55);
  board(ctx, r, 0, 0, W, TN.beam, '#4a2a18');
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, TN.beam);
  ctx.clip();
  lay(ctx, drift('#6a4028', '#1a0a06', 8, 41, 256, 16), { x: 0, y: 0, w: W, h: TN.beam }, 0.5);
  // adze marks along it, soot thickest over the oven
  for (let x = 0; x < W; x += 14 + r() * 18) {
    ctx.fillStyle = rgba(r() < 0.5 ? '#2a1208' : '#8a5a38', 0.12 + r() * 0.1);
    ctx.beginPath();
    ctx.ellipse(x, 10 + r() * 30, 9 + r() * 8, 3, (r() - 0.5) * 0.3, 0, P2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(14,6,2,0.3)';
  ctx.fillRect(0, 0, 640, TN.beam);
  for (const x of [TN.flue.x, ...TN.lamps]) lightPool(ctx, x, TN.beam, 200, 20, '#ffcf8a', 0.18, 'screen');
  ctx.restore();
  ctx.fillStyle = rgba('#ffd8a0', 0.22);
  ctx.fillRect(0, TN.beam - 5, W, 2);
  ctx.fillStyle = 'rgba(20,8,2,0.75)';
  ctx.fillRect(0, TN.beam - 3, W, 3);
  // joints in the beam, pegged, and an oak corbel under each (one spacing for both)
  for (let x = TN.joist.x0; x < W; x += TN.joist.step) {
    ctx.fillStyle = 'rgba(20,8,2,0.45)';
    ctx.fillRect(x - 2, 0, 3, TN.beam - 3);
    for (const sy of [16, TN.beam - 16]) {
      ctx.fillStyle = '#2a1408';
      ctx.beginPath();
      ctx.arc(x + 9, sy, 3, 0, P2);
      ctx.fill();
      ctx.fillStyle = rgba('#ffd8a0', 0.2);
      ctx.beginPath();
      ctx.arc(x + 8.4, sy - 0.6, 1.4, 0, P2);
      ctx.fill();
    }
    const corbel = (c: Ctx) => {
      c.beginPath();
      c.moveTo(x - 20, TN.beam);
      c.lineTo(x + 20, TN.beam);
      c.lineTo(x + 20, TN.beam + 8);
      c.bezierCurveTo(x + 18, TN.beam + 24, x + 8, TN.beam + 30, x + 4, TN.beam + 34);
      c.lineTo(x - 4, TN.beam + 34);
      c.bezierCurveTo(x - 8, TN.beam + 30, x - 18, TN.beam + 24, x - 20, TN.beam + 8);
      c.closePath();
    };
    // its shadow on the wall, down and to the right (cheap: a soft dark lozenge)
    const cs = ctx.createRadialGradient(x + 8, TN.beam + 22, 2, x + 8, TN.beam + 22, 26);
    cs.addColorStop(0, 'rgba(26,10,4,0.4)');
    cs.addColorStop(1, 'rgba(26,10,4,0)');
    ctx.fillStyle = cs;
    ctx.fillRect(x - 20, TN.beam, 56, 50);
    solid(ctx, corbel, { x: x - 20, y: TN.beam, w: 40, h: 34 }, 'wood', '#4a2a18', { depth: 0.2, line: 1.6, formSize: 8 });
  }
}

function windowFrame(ctx: Ctx, r: R): void {
  const { x0, x1, sill } = TN.win;
  // the reveal: the wall is thick; its inner face on the right catches the evening light coming in, the left one and
  // the soffit of the arch are in shade
  ctx.save();
  ctx.beginPath();
  winPath(-16, true)(ctx);
  winPath(0, true)(ctx);
  ctx.clip('evenodd');
  const rg = ctx.createLinearGradient(x0 - 16, 0, x1 + 16, 0);
  rg.addColorStop(0, shade(PLASTER, -0.45));
  rg.addColorStop(0.5, shade(PLASTER, -0.3));
  rg.addColorStop(1, shade(PLASTER, 0.05));
  ctx.fillStyle = rg;
  ctx.fillRect(x0 - 20, TN.win.top - 20, x1 - x0 + 40, sill - TN.win.top + 30);
  grain(ctx, { x: x0 - 20, y: TN.win.top - 20, w: x1 - x0 + 40, h: sill - TN.win.top + 30 }, 'grain', 0.2, 1.3);
  ctx.restore();
  // a painted cream frame, a cross of glazing bars
  const frameCol = '#efe2c4';
  const outer = winPath(-14);
  const inner = winPath(2);
  const framePath = (c: Ctx) => {
    c.beginPath();
    winPath(-14, true)(c);
    winPath(2, true)(c);
  };
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, 1080);
  winPath(2, true)(ctx);
  ctx.clip('evenodd');
  castShadow(ctx, outer, 10, 16, 0.4);
  ctx.restore();
  ctx.save();
  framePath(ctx);
  ctx.clip('evenodd');
  solid(ctx, outer, { x: x0 - 14, y: TN.win.top - 14, w: x1 - x0 + 28, h: sill - TN.win.top + 28 }, 'wood', frameCol, { depth: 0.15, line: false, formSize: 10 });
  // old paint: crazed, worn to the grey undercoat in patches
  lay(ctx, noiseMask(18, 61, { cover: 0.12, soft: 0.02, col: '#a89a80' }), { x: x0 - 14, y: TN.win.top - 14, w: x1 - x0 + 28, h: sill - TN.win.top + 28 }, 0.6);
  ctx.restore();
  ctx.save();
  ctx.lineWidth = lineAt(0.15);
  ctx.strokeStyle = mix(shade(frameCol, -0.6), '#22130b', 0.5);
  outer(ctx);
  ctx.stroke();
  inner(ctx);
  ctx.stroke();
  ctx.restore();
  glassPane(ctx, inner, { x: x0, y: TN.win.top, w: x1 - x0, h: sill - TN.win.top }, { sheen: 0.12, reflect: [TN.lamps[1] - 20, TN.lampY + 60, 90, '#ffd8a0'], dirt: 0.24 });
  // glazing bars: each a little moulded bar, lit on its top and left, shaded on its right and bottom
  ctx.save();
  inner(ctx);
  ctx.clip();
  const vbar = rectPath(winCX - 4, TN.win.top, 8, sill - TN.win.top);
  castShadow(ctx, vbar, 4, 4, 0.3);
  for (const by of [TN.win.archY, 506]) castShadow(ctx, rectPath(x0, by - 4, x1 - x0, 8), 4, 4, 0.3);
  for (const by of [TN.win.archY, 506]) {
    ctx.fillStyle = frameCol;
    ctx.fillRect(x0, by - 4, x1 - x0, 8);
    ctx.fillStyle = rgba('#ffffff', 0.4);
    ctx.fillRect(x0, by - 4, x1 - x0, 1.5);
    ctx.fillStyle = 'rgba(60,30,10,0.45)';
    ctx.fillRect(x0, by + 2.5, x1 - x0, 1.5);
  }
  ctx.fillStyle = frameCol;
  ctx.fillRect(winCX - 4, TN.win.top, 8, sill - TN.win.top);
  ctx.fillStyle = rgba('#ffffff', 0.4);
  ctx.fillRect(winCX - 4, TN.win.top, 1.5, sill - TN.win.top);
  ctx.fillStyle = 'rgba(60,30,10,0.45)';
  ctx.fillRect(winCX + 2.5, TN.win.top, 1.5, sill - TN.win.top);
  // the brass catch where the casements meet
  const cat = rrPath(winCX - 5, 498, 10, 16, 2);
  solid(ctx, cat, { x: winCX - 5, y: 498, w: 10, h: 16 }, 'chrome', '#c89a4a', { depth: 0.15, line: 1 });
  ctx.restore();
  // the sill: a stone ledge (its top lit, its front face in shade) with a basil pot and a votive in ruby glass
  const sillPath = rrPath(x0 - 30, sill - 4, x1 - x0 + 60, 20, 3);
  castShadow(ctx, sillPath, 14, 14, 0.5);
  solid(ctx, sillPath, { x: x0 - 30, y: sill - 4, w: x1 - x0 + 60, h: 20 }, 'stone', '#d8c8a8', { depth: 0.15, formSize: 6 });
  vfill(ctx, x0 - 28, sill + 5, x1 - x0 + 56, 10, [[0, 'rgba(60,40,20,0.1)'], [1, 'rgba(60,40,20,0.35)']]);
  ctx.fillStyle = rgba('#fff4dc', 0.5);
  ctx.fillRect(x0 - 28, sill - 3, x1 - x0 + 56, 1.5);
  chips(ctx, r, x0 - 20, x1 + 20, sill + 5, 6, '#d8c8a8', 2.5);
}

/** On the sill in front of the curtains: the basil pot and the votive. */
function sillThings(ctx: Ctx, r: R): void {
  herbPot(ctx, r, TN.win.x0 + 40, TN.win.sill - 2, 1);
  votive(ctx, TN.votive.x, TN.votive.y);
}

/** A tea light in a ruby glass on the window sill (its flame is live, or painted in the still). */
function votive(ctx: Ctx, x: number, y: number): void {
  groundShadow(ctx, x + 4, y, 11, 3, 0.45);
  const glass = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x - 8, y - 20);
    c.lineTo(x + 8, y - 20);
    c.quadraticCurveTo(x + 9, y - 2, x + 6, y);
    c.lineTo(x - 6, y);
    c.quadraticCurveTo(x - 9, y - 2, x - 8, y - 20);
    c.closePath();
  };
  glass(ctx);
  ctx.fillStyle = 'rgba(150,20,30,0.8)';
  ctx.fill();
  within(ctx, glass, () => {
    glowAt(ctx, x, y - 8, 12, '#ff7050', 0.7);
    ctx.fillStyle = 'rgba(255,220,200,0.5)';
    ctx.fillRect(x - 6, y - 19, 2, 16);
    for (let k = 0; k < 4; k++) {
      ctx.fillStyle = 'rgba(80,0,10,0.3)';
      ctx.fillRect(x - 8, y - 18 + k * 5, 16, 1);
    }
  });
  ctx.strokeStyle = 'rgba(60,6,10,0.8)';
  ctx.lineWidth = 1.2;
  glass(ctx);
  ctx.stroke();
  lightPool(ctx, x, y - 2, 34, 8, '#ff7a50', 0.35);
}

/** Green louvred shutters folded back against the wall either side of the window: their paint worn back to grey
 * wood along the edges hands push, iron hinges into the wall, a hook holding each back. */
function shutters(ctx: Ctx, r: R): void {
  const { x0, x1, sill } = TN.win;
  for (const side of [-1, 1]) {
    const sx = side < 0 ? x0 - 84 : x1 + 18;
    const sw = 66;
    const st = TN.win.top + 10;
    const sh = sill - st - 6;
    const p = rrPath(sx, st, sw, sh, 4);
    castShadow(ctx, p, 9, 10, 0.45);
    aoHalo(ctx, p, 10, 0.25, '#3a1a0a');
    solid(ctx, p, { x: sx, y: st, w: sw, h: sh }, 'wood', SHUTTER, { depth: 0.15, formSize: 10 });
    within(ctx, p, () => {
      // louvres: tilted slats, each lit along its top edge, falling into shade towards the gap under it
      for (let y = st + 14; y < st + sh - 14; y += 13) {
        const g = ctx.createLinearGradient(0, y, 0, y + 11);
        g.addColorStop(0, shade(SHUTTER, 0.3));
        g.addColorStop(0.5, SHUTTER);
        g.addColorStop(1, shade(SHUTTER, -0.38));
        ctx.fillStyle = g;
        ctx.fillRect(sx + 8, y, sw - 16, 11);
        ctx.fillStyle = 'rgba(8,24,14,0.78)';
        ctx.fillRect(sx + 8, y + 11, sw - 16, 2);
        // the paint worn off the slat's lip here and there
        if (r() < 0.5) {
          ctx.fillStyle = rgba('#a89a80', 0.55);
          ctx.fillRect(sx + 8 + r() * (sw - 30), y + 0.5, 6 + r() * 10, 1.5);
        }
      }
      ctx.strokeStyle = 'rgba(14,40,24,0.6)';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx + 7, st + 8, sw - 14, sh - 16);
      broken(ctx, { x: sx, y: st, w: sw, h: sh }, 0.5, 6, 31);
      // worn back to the grey wood along the outer stile, where hands open and close it
      const ex = side < 0 ? sx : sx + sw - 7;
      lay(ctx, noiseMask(10, 71 + side, { cover: 0.4, soft: 0.05, col: '#8a8270' }), { x: ex, y: st + 20, w: 7, h: sh - 40 }, 0.7);
    });
    // the hinges on the window side, the hold-back hook on the other
    const hx = side < 0 ? sx + sw - 4 : sx - 6;
    for (const hy of [st + 30, st + sh - 40]) {
      const hp = rrPath(hx, hy, 10, 16, 2);
      solid(ctx, hp, { x: hx, y: hy, w: 10, h: 16 }, 'iron', '#2a2422', { depth: 0.15, line: 1.2, formSize: 3 });
    }
    const kx = side < 0 ? sx - 10 : sx + sw + 10;
    const ky = st + sh * 0.55;
    ctx.strokeStyle = '#1e1a18';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(kx, ky);
    ctx.lineTo(side < 0 ? sx + 6 : sx + sw - 6, ky - 2);
    ctx.stroke();
    ctx.fillStyle = '#2a2422';
    ctx.beginPath();
    ctx.arc(kx, ky, 3.5, 0, P2);
    ctx.fill();
  }
}

// ——— the café curtains (painted frames: the cloth stirring in the draught) ———

const CUR = { top: TN.win.archY - 6, tieY: 516, frames: 12 };
/** Each curtain's frame box (screen px): room for its billow and its shadow. */
const curBox = (side: number) => ({ x: side < 0 ? TN.win.x0 - 14 : TN.win.x1 - 96, y: CUR.top - 2, w: 110, h: TN.win.sill - CUR.top + 18 });

/** One curtain at phase ph of its stir (0…1 loops; 0 is the still), in screen coordinates. Below the tie-back the
 * cloth billows into the room and its hem swings; above it the folds ripple a little. */
function curtain(ctx: Ctx, side: number, ph: number): void {
  const { x0, x1, sill } = TN.win;
  const top = CUR.top;
  const tieY = CUR.tieY;
  const e = side < 0 ? x0 - 4 : x1 + 4;
  const d = -side;
  const so = side < 0 ? 0 : 1.9;
  const sw = (v: number) => d * 13 * v ** 1.3 * Math.sin(P2 * ph + so - v * 1.2) + d * 4 * v * Math.sin(P2 * ph * 2 + so);
  const rip = (v: number) => d * 2.6 * Math.sin(P2 * ph * 2 + v * 4 + so);
  const path = (c: Ctx) => {
    c.beginPath();
    c.moveTo(e, top);
    c.lineTo(e + d * 74 + rip(0), top);
    c.bezierCurveTo(e + d * 70 + rip(0.3), top + 50, e + d * 36 + rip(0.7), tieY - 20, e + d * 30, tieY);
    c.bezierCurveTo(e + d * 40 + sw(0.3), tieY + 30, e + d * 66 + sw(0.75), sill - 30, e + d * 70 + sw(1), sill - 4);
    for (let k = 0; k <= 6; k++) c.lineTo(e + d * (70 - k * 11.7) + sw(1) * (1 - k / 7), sill - 4 + Math.sin(k * 1.7 + P2 * ph + so) * 2.5);
    c.closePath();
  };
  const bx = side < 0 ? e : e - 84;
  const cbox = { x: bx, y: top, w: 84, h: sill - top };
  castShadow(ctx, path, 6, 8, 0.3);
  drape(ctx, path, cbox, '#f4ecd8', {
    fold: 20,
    depth: 0.85,
    phase: so * 0.7 + 0.7 * Math.sin(P2 * ph),
    gather: [e + d * 30, tieY, 0.7],
    // the gingham, bending with the folds and following the billow
    pattern: (c, fold) => {
      c.fillStyle = rgba('#c0302a', 0.5);
      for (let x = bx; x < bx + 84; x += 2) {
        for (let y = top; y < sill; y += 7) {
          const v = Math.max(0, (y - tieY) / (sill - tieY));
          const off = fold(x, y) * 3 - sw(v) * 0.6;
          const vOn = ((((x + off - bx) % 14) + 14) % 14) < 7;
          const hOn = (((y - top) / 7) | 0) % 2 === 0;
          if (vOn || hOn) c.fillRect(x, y, 2, 7);
          if (vOn && hOn) c.fillRect(x, y, 2, 7);
        }
      }
    },
    through: ['#ffd8a0', 0.2 * (side < 0 ? 1 : 0.6)],
  });
  within(ctx, path, () => {
    crevice(ctx, bx, bx + 84, tieY - 4, 20, 0.35);
    // the billow below the tie: its swell lit, the hollow under it shaded
    const bl = 0.5 + 0.5 * Math.sin(P2 * ph + so - 0.6);
    lightPool(ctx, e + d * 48, tieY + 46, 24, 30, '#fff2dc', 0.06 + bl * 0.1);
    lightPool(ctx, e + d * 30, sill - 20, 30, 16, '#3a0a10', 0.1 + (1 - bl) * 0.12);
  });
  rim(ctx, path, 0.35, 2);
  ctx.lineWidth = lineAt(0.12) * 0.7;
  ctx.strokeStyle = 'rgba(60,16,10,0.75)';
  path(ctx);
  ctx.stroke();
  // the tie-back: a band of red cloth wrapped round the gathered curtain, pulled to a hook on the frame, its folds
  // pinched where it grips
  const tx0 = side < 0 ? e - 2 : e + d * 30 - 3;
  const tx1 = side < 0 ? e + d * 30 + 3 : e + 2;
  const band = (c: Ctx) => {
    c.beginPath();
    c.moveTo(tx0, tieY - 6);
    c.quadraticCurveTo((tx0 + tx1) / 2, tieY - 2, tx1, tieY - 6);
    c.lineTo(tx1, tieY + 5);
    c.quadraticCurveTo((tx0 + tx1) / 2, tieY + 9, tx0, tieY + 5);
    c.closePath();
  };
  castShadow(ctx, band, 3, 4, 0.4);
  solid(ctx, band, { x: Math.min(tx0, tx1), y: tieY - 6, w: Math.abs(tx1 - tx0), h: 15 }, 'canvas', '#b2302a', { depth: 0.12, line: 1.4, formSize: 3 });
  within(ctx, band, () => {
    ctx.strokeStyle = 'rgba(60,8,6,0.45)';
    ctx.lineWidth = 1;
    for (let k = 1; k < 4; k++) {
      const fx = tx0 + ((tx1 - tx0) * k) / 4;
      ctx.beginPath();
      ctx.moveTo(fx - 2, tieY - 4);
      ctx.quadraticCurveTo(fx, tieY, fx + 2, tieY + 6);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,220,200,0.3)';
    ctx.fillRect(Math.min(tx0, tx1), tieY - 5, Math.abs(tx1 - tx0), 1.5);
  });
  // the brass hook on the frame
  const hx = side < 0 ? e - 3 : e + 3;
  const hook = ellPath(hx, tieY, 3.5, 3.5);
  solid(ctx, hook, { x: hx - 4, y: tieY - 4, w: 8, h: 8 }, 'chrome', '#c8984a', { depth: 0.12, line: 1 });
}

/** The brass rod and the curtains' rings (still: the cloth moves under them). */
function curtainRod(ctx: Ctx): void {
  const { x0, x1 } = TN.win;
  const top = CUR.top;
  const rod = rrPath(x0 - 14, top - 7, x1 - x0 + 28, 7, 3);
  castShadow(ctx, rod, 5, 5, 0.35);
  solid(ctx, rod, { x: x0 - 14, y: top - 7, w: x1 - x0 + 28, h: 7 }, 'chrome', '#c8984a', { depth: 0.12, line: 2 });
  for (const side of [-1, 1]) {
    const e = side < 0 ? x0 - 4 : x1 + 4;
    const d = -side;
    for (let k = 0; k < 4; k++) {
      ctx.strokeStyle = '#6a4a20';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.ellipse(e + d * (8 + k * 20), top - 4, 4, 6, 0, 0, P2);
      ctx.stroke();
      ctx.strokeStyle = '#e8c070';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(e + d * (8 + k * 20), top - 4, 4, 6, 0, Math.PI * 1.1, Math.PI * 1.6);
      ctx.stroke();
    }
    const fx = side < 0 ? x0 - 18 : x1 + 18;
    const fin = ellPath(fx, top - 4, 6, 6);
    solid(ctx, fin, { x: fx - 6, y: top - 10, w: 12, h: 12 }, 'chrome', '#c8984a', { depth: 0.12, line: 1.4 });
  }
}

function curtainsStill(ctx: Ctx): void {
  curtain(ctx, -1, 0);
  curtain(ctx, 1, 0);
}

function wainscot(ctx: Ctx, r: R): void {
  const y0 = TN.wainscot;
  const y1 = TY;
  board(ctx, r, 0, y0, W, y1 - y0, WALNUT);
  const reflections: Reflect[] = [
    ...TN.lamps.map((x) => ({ x, a: 0.2, w: 34, col: '#ffe0a8' })),
    { x: TN.oven.x + 60, a: 0.16, w: 60, col: '#ff9a50' },
    { x: winCX, a: 0.1, w: 30, col: '#ffc890' },
  ];
  const pw = 230;
  const gap = 30;
  for (let x = -60 + gap; x < W; x += pw + gap) {
    board(ctx, r, x - gap, y0 + 14, gap, y1 - y0 - 14, shade(WALNUT, 0.04), true);
    wainPanel(ctx, r, x, y0 + 36, pw, y1 - y0 - 58, reflections);
  }
  varnish(ctx, { x: 0, y: y0, w: W, h: y1 - y0 }, reflections.map((l) => ({ ...l, a: (l.a ?? 0.3) * 0.5 })), { sheen: 0.05 });
  // the chair rail: a moulding with a lit roundover on top, a cove in shadow, a fillet catching the light
  const rail = rectPath(0, y0 - 10, W, 26);
  solid(ctx, rail, { x: 0, y: y0 - 10, w: W, h: 26 }, 'wood', shade(WALNUT, 0.1), { depth: 0.2, line: false, formSize: 8 });
  vfill(ctx, 0, y0 - 10, W, 26, [[0, rgba('#ffe0b0', 0.4)], [0.18, rgba('#ffe0b0', 0.08)], [0.45, 'rgba(20,8,2,0.4)'], [0.62, 'rgba(20,8,2,0.1)'], [0.7, rgba('#ffe0b0', 0.2)], [0.8, 'rgba(20,8,2,0.25)'], [1, 'rgba(20,8,2,0.6)']]);
  varnish(ctx, { x: 0, y: y0 - 10, w: W, h: 10 }, reflections.map((l) => ({ ...l, w: (l.w ?? 50) * 2.4, a: (l.a ?? 0.3) * 1.2 })), { sheen: 0, vertical: false });
  crevice(ctx, 0, W, y0 + 16, 28, 0.5);
  crevice(ctx, 0, W, y0 - 10, -12, 0.25);
  // wear: chair backs scuffing the panels in pale arcs; the corners grimier; the varnish worn off the rail's lip
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 46; i++) {
    const x = r() * W;
    const y = y0 + 40 + r() * 70;
    ctx.strokeStyle = rgba(r() < 0.6 ? '#b88a60' : '#1a0a04', 0.06 + r() * 0.08);
    ctx.lineWidth = 0.8 + r() * 1.4;
    ctx.beginPath();
    ctx.arc(x, y + 30, 20 + r() * 30, -Math.PI * 0.75, -Math.PI * (0.3 + r() * 0.2));
    ctx.stroke();
  }
  ctx.restore();
  grime(ctx, { x: 0, y: y0, w: W, h: y1 - y0 }, { bottom: 90, left: 120, right: 160, a: 0.45, patchy: 0.5, seed: 13, col: '#140804' });
  chips(ctx, r, 0, W, y0 - 9, 26, WALNUT, 2.5);
  for (const wx of [380, 960, 1560]) lightPool(ctx, wx, y0 - 4, 90, 4, '#e8b880', 0.18);
  crevice(ctx, 0, W, y1, -70, 0.38);
  bounceBand(ctx, 0, W, y1, -50, '#ff8a6a', 0.1);
  for (const lx of TN.lamps) lightPool(ctx, lx, y1 - 70, 280, 100, '#ffcf8a', 0.12);
  // the oven's fire reaches the panels beside it
  lightPool(ctx, 560, y1 - 80, 160, 120, '#ff8a3a', 0.12);
}

// ——— the shelf, the sign, the chalkboard, the neon ———

/** The garlic braid and the ristra hang from the shelf's brackets: each its own sprite, swung by stomps. */
const GARLIC = { x: TN.shelf.x0 + 26, y: TN.shelf.y + 12 };
const RISTRA = { x: TN.shelf.x1 - 24, y: TN.shelf.y + 12 };
const GARLIC_BOX = { x: GARLIC.x - 34, y: GARLIC.y - 8, w: 76, h: 148 };
const RISTRA_BOX = { x: RISTRA.x - 40, y: RISTRA.y - 8, w: 86, h: 168 };

function shelf(ctx: Ctx, r: R): void {
  const { x0, x1, y } = TN.shelf;
  // wrought-iron brackets: a scroll under the board, fixed to the wall with a plate
  for (const bx of [x0 + 22, x1 - 34]) {
    const scroll = (c: Ctx) => {
      c.beginPath();
      c.moveTo(bx, y + 8);
      c.lineTo(bx + 4, y + 52);
      c.bezierCurveTo(bx + 6, y + 30, bx + 22, y + 16, bx + 34, y + 10);
      c.bezierCurveTo(bx + 30, y + 22, bx + 14, y + 30, bx + 12, y + 46);
      c.lineTo(bx + 10, y + 56);
      c.closePath();
    };
    castShadow(ctx, scroll, 9, 7, 0.45);
    solid(ctx, scroll, { x: bx, y, w: 36, h: 56 }, 'iron', '#3a3432', { depth: 0.2, line: 1.4, formSize: 4 });
    ctx.beginPath();
    ctx.arc(bx + 2, y + 54, 4, 0, P2);
    ctx.fillStyle = '#2a2422';
    ctx.fill();
    // rust bled down the plaster under each fixing
    streaks(ctx, r, bx + 2, y + 56, 6, 30, '#7a3a1a', 0.18, 2);
  }
  // the hooks the garlic and chillies hang from
  for (const [hx, hy] of [[GARLIC.x, GARLIC.y], [RISTRA.x, RISTRA.y]]) {
    ctx.strokeStyle = '#1e1a18';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(hx, y + 6);
    ctx.lineTo(hx, hy - 2);
    ctx.arc(hx + 3, hy - 2, 3, Math.PI, Math.PI * 0.2, true);
    ctx.stroke();
  }
  aoHalo(ctx, rectPath(x0 + 10, y - 90, x1 - x0 - 30, 86), 18, 0.28, '#3a1a0a', 6);
  // bottles and jars on the board: wine with labels, oil, pasta and peppers in jars, a tin of tomatoes
  const items: [number, number, string, NonNullable<Parameters<typeof bottle>[5]>][] = [
    [x0 + 28, 92, '#2a4a1a', { kind: 'wine', cork: '#c89a6a', label: '#e8dcc0' }],
    [x0 + 64, 70, '#c8a02a', { kind: 'oil', cork: '#2a1a10' }],
    [x0 + 106, 54, '#d8c8a8', { kind: 'jar', cork: '#8a6040' }],
    [x0 + 150, 88, '#5a1a20', { kind: 'wine', cork: '#c89a6a', label: '#f0e0b8' }],
    [x0 + 190, 60, '#9ab8a0', { kind: 'jar', cork: '#8a6040' }],
  ];
  const sh = rectPath(x0, y - 4, x1 - x0, 14);
  castShadow(ctx, sh, 14, 14, 0.5);
  for (const [bx, h, , o] of items) {
    const w = o.kind === 'jar' ? h * 0.62 : o.kind === 'oil' ? h * 0.3 : h * 0.26;
    castShadow(ctx, rrPath(bx - w / 2, y - 3 - h, w, h, w * 0.3), 10, 8, 0.35);
  }
  for (const [bx, h, col, o] of items) {
    bottle(ctx, bx, y - 3, h, col, { ...o, depth: 0.22, air: ROOM });
    if (o?.kind === 'jar') {
      within(ctx, rrPath(bx - h * 0.28, y - h * 0.8, h * 0.56, h * 0.74, 4), () => {
        for (let i = 0; i < 14; i++) {
          ctx.fillStyle = col === '#d8c8a8' ? rgba('#f0c870', 0.8) : rgba('#d83a2a', 0.75);
          ctx.beginPath();
          ctx.ellipse(bx + (r() - 0.5) * h * 0.4, y - 6 - r() * h * 0.6, 5, 2.5, r() * 3, 0, P2);
          ctx.fill();
        }
      });
    }
    // dust on the shoulders of the bottles nobody has opened in a while
    if (o.kind === 'wine') {
      ctx.fillStyle = 'rgba(230,214,190,0.22)';
      ctx.beginPath();
      ctx.ellipse(bx - 2, y - 3 - h * 0.62, h * 0.11, 3, 0, Math.PI, 0);
      ctx.fill();
    }
  }
  // a tin of tomatoes: a lit cylinder, its printed label (red, a green band, a tomato)
  const tx = x0 + 222;
  const tin = rrPath(tx - 12, y - 33, 24, 30, 2);
  castShadow(ctx, tin, 8, 6, 0.35);
  solid(ctx, tin, { x: tx - 12, y: y - 33, w: 24, h: 30 }, 'chrome', '#c8c0b8', { depth: 0.22, line: 1.4, formSize: 6 });
  within(ctx, tin, () => {
    ctx.fillStyle = '#c0302a';
    ctx.fillRect(tx - 12, y - 28, 24, 20);
    ctx.fillStyle = '#3a7a3a';
    ctx.fillRect(tx - 12, y - 14, 24, 3);
    ctx.fillStyle = '#e84a2a';
    ctx.beginPath();
    ctx.arc(tx - 2, y - 21, 4.5, 0, P2);
    ctx.fill();
    const cg = ctx.createLinearGradient(tx - 12, 0, tx + 12, 0);
    cg.addColorStop(0, 'rgba(255,240,220,0.3)');
    cg.addColorStop(0.35, 'rgba(255,240,220,0)');
    cg.addColorStop(1, 'rgba(20,8,4,0.45)');
    ctx.fillStyle = cg;
    ctx.fillRect(tx - 12, y - 33, 24, 30);
  });
  // the board: a thick plank, its top in the lamp's light, its front edge in its own shade, a varnish glint
  solid(ctx, sh, { x: x0, y: y - 4, w: x1 - x0, h: 14 }, 'wood', '#7a4a2a', { depth: 0.2, formSize: 5 });
  within(ctx, sh, () => {
    woodGrain(ctx, r, { x: x0, y: y - 4, w: x1 - x0, h: 14 }, '#7a4a2a', false, 0.8);
    ctx.fillStyle = rgba('#ffe6b8', 0.35);
    ctx.fillRect(x0, y - 4, x1 - x0, 3);
    ctx.fillStyle = 'rgba(30,12,4,0.35)';
    ctx.fillRect(x0, y + 4, x1 - x0, 6);
    varnish(ctx, { x: x0, y: y - 4, w: x1 - x0, h: 14 }, [{ x: TN.lamps[0] + 40, a: 0.5, w: 30 }], { sheen: 0, vertical: false });
  });
  chips(ctx, r, x0 + 4, x1 - 4, y + 9, 5, '#7a4a2a', 1.6);
  lightPool(ctx, TN.lamps[0] + 40, y - 40, 140, 70, '#ffd89a', 0.14, 'screen');
}

function garlic(ctx: Ctx, r: R): void {
  const { x, y } = GARLIC;
  castShadow(ctx, rrPath(x - 16, y + 10, 32, 104, 12), 10, 10, 0.35);
  hang(ctx, x, y - 2, x, y + 16, 0, '#c8a060', 2.5);
  for (let i = 0; i < 6; i++) {
    const by = y + 22 + i * 15;
    for (const side of [-1, 1]) {
      const bx = x + side * (9 - i * 0.6) + (r() - 0.5) * 3;
      const bulb = (c: Ctx) => {
        c.beginPath();
        c.moveTo(bx, by - 11);
        c.bezierCurveTo(bx + 11, by - 6, bx + 11, by + 8, bx, by + 9);
        c.bezierCurveTo(bx - 11, by + 8, bx - 11, by - 6, bx, by - 11);
        c.closePath();
      };
      solid(ctx, bulb, { x: bx - 11, y: by - 11, w: 22, h: 20 }, 'plastic', '#f2e6d0', { depth: 0.18, line: 1.6, formSize: 6, spec: false });
      ctx.strokeStyle = rgba('#a88a70', 0.6);
      ctx.lineWidth = 1;
      for (const dx of [-4, 0, 4]) {
        ctx.beginPath();
        ctx.moveTo(bx, by - 10);
        ctx.quadraticCurveTo(bx + dx * 1.6, by, bx + dx * 0.4, by + 8);
        ctx.stroke();
      }
      // a purple blush on the skins, and the roots' little tuft
      ctx.fillStyle = 'rgba(150,80,140,0.18)';
      ctx.beginPath();
      ctx.ellipse(bx + side * 3, by + 2, 4, 5, 0, 0, P2);
      ctx.fill();
      ctx.fillStyle = 'rgba(120,90,60,0.6)';
      ctx.fillRect(bx - 1.5, by + 8, 3, 2);
    }
  }
  // the tail of the braid
  hang(ctx, x, y + 108, x + 3, y + 128, 2, '#c8a060', 3);
}

function ristra(ctx: Ctx, r: R): void {
  const { x, y } = RISTRA;
  castShadow(ctx, rrPath(x - 16, y + 10, 32, 124, 12), 10, 10, 0.3);
  hang(ctx, x, y - 2, x, y + 110, 0, '#c8a060', 2);
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    const cy = y + 10 + t * 100;
    const side = i % 2 ? 1 : -1;
    const ang = side * (0.5 + r() * 0.5) + Math.PI / 2;
    const len = 26 + r() * 8;
    const cx = x + Math.cos(ang - Math.PI / 2) * 4 * side;
    const pepper = (c: Ctx) => {
      c.beginPath();
      c.moveTo(cx, cy);
      c.quadraticCurveTo(cx + Math.cos(ang) * len * 0.5 + 5, cy + Math.sin(ang) * len * 0.5, cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
      c.quadraticCurveTo(cx + Math.cos(ang) * len * 0.5 - 5, cy + Math.sin(ang) * len * 0.5 + 4, cx, cy);
      c.closePath();
    };
    solid(ctx, pepper, { x: cx - len, y: cy - len, w: len * 2, h: len * 2 }, 'enamel', shade(i % 4 === 3 ? '#9a1a12' : '#c8241a', (r() - 0.5) * 0.25), { depth: 0.18, line: 1.4, formSize: 4 });
    ctx.fillStyle = '#3a6a1e';
    ctx.fillRect(cx - 2, cy - 2, 4, 4);
  }
}

const SIGN_BOX = { x: TN.sign.x - 110, y: TN.sign.y - 132, w: 220, h: 254 };

function sign(ctx: Ctx): void {
  const { x, y } = TN.sign;
  const sw = TN.sign.w;
  hang(ctx, x - sw / 3, y - 86, x, y - 120, 0, '#3a2a1a', 2);
  hang(ctx, x + sw / 3, y - 86, x, y - 120, 0, '#3a2a1a', 2);
  ctx.fillStyle = '#2a1a10';
  ctx.beginPath();
  ctx.arc(x, y - 120, 4, 0, P2);
  ctx.fill();
  wallShadow(ctx, rrPath(x - sw / 2, y - 85, sw, 170, 8), 14, 16, 0.5);
  ctx.save();
  noFeetSign(ctx, x, y, sw, 170, 0, false);
  ctx.restore();
  specHi(ctx, x - 40, y - 60, 50, 20, 0.25, -0.6);
}

/** The nail the sign hangs from stays in the wall (the sign swings on it). */
function signNail(ctx: Ctx): void {
  const { x, y } = TN.sign;
  ctx.fillStyle = '#1a120c';
  ctx.beginPath();
  ctx.arc(x, y - 121, 3.2, 0, P2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,230,200,0.5)';
  ctx.beginPath();
  ctx.arc(x - 1, y - 122, 1.1, 0, P2);
  ctx.fill();
}

function chalkboard(ctx: Ctx, r: R): void {
  const { x, y, w, h } = TN.board;
  const frame = rrPath(x, y, w, h, 10);
  castShadow(ctx, frame, 16, 20, 0.5);
  aoHalo(ctx, frame, 14, 0.25, '#3a1a0a');
  solid(ctx, frame, { x, y, w, h }, 'wood', '#6a4024', { depth: 0.18, formSize: 22 });
  within(ctx, frame, () => {
    woodGrain(ctx, r, { x, y, w, h }, '#6a4024', false, 0.6);
    // the frame's corners joined with a pin, their edges worn pale by hands
    for (const [cx, cy] of [[x + 11, y + 11], [x + w - 11, y + 11], [x + 11, y + h - 11], [x + w - 11, y + h - 11]]) {
      ctx.fillStyle = '#2a1408';
      ctx.beginPath();
      ctx.arc(cx, cy, 2.2, 0, P2);
      ctx.fill();
    }
  });
  const sl = rrPath(x + 22, y + 22, w - 44, h - 44, 4);
  ctx.save();
  sl(ctx);
  ctx.clip();
  vfill(ctx, x, y, w, h, [[0, '#2c3e34'], [1, '#1e2c26']]);
  broken(ctx, { x, y, w, h }, 0.5, 6, 77);
  // old chalk wiped round and round, and the ghost of yesterday's menu
  for (let i = 0; i < 11; i++) {
    ctx.strokeStyle = rgba('#e8f0e0', 0.03 + r() * 0.03);
    ctx.lineWidth = 30 + r() * 30;
    ctx.beginPath();
    ctx.ellipse(x + w / 2 + (r() - 0.5) * 120, y + h / 2 + (r() - 0.5) * 120, 80 + r() * 60, 40 + r() * 40, r() * 3, 0, Math.PI * 1.4);
    ctx.stroke();
  }
  ctx.font = `34px ${CHALK}`;
  ctx.fillStyle = 'rgba(232,240,224,0.06)';
  ctx.textAlign = 'center';
  ctx.fillText('LASAGNE', x + w / 2 + 10, y + h * 0.42);
  // chalk dust settled along the bottom of the slate
  vfill(ctx, x + 22, y + h - 60, w - 44, 38, [[0, 'rgba(232,240,224,0)'], [1, 'rgba(232,240,224,0.12)']]);
  ctx.restore();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(10,6,4,0.7)';
  sl(ctx);
  ctx.stroke();
  crevice(ctx, x + 22, x + w - 22, y + 22, 10, 0.4);
  // the chalk: written slightly unevenly, broken up by the board's grain
  const [c, cx] = makeCanvas(w, h);
  const write = (t: string, tx: number, ty: number, size: number, col: string, rot = 0, font = CHALK) => {
    cx.save();
    cx.translate(tx, ty);
    cx.rotate(rot);
    cx.font = `${size}px ${font}`;
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillStyle = col;
    cx.fillText(t, 0, 0);
    cx.restore();
  };
  write('TODAY:', w * 0.3, 64, 30, '#f4f2e8', -0.04);
  write('PIZZA', w / 2 + 8, 124, 64, '#ffe08a', -0.03, ROUND);
  cx.strokeStyle = '#f4f2e8';
  cx.lineWidth = 3;
  cx.beginPath();
  cx.moveTo(60, 166);
  cx.quadraticCurveTo(w / 2, 158, w - 60, 168);
  cx.stroke();
  write('NO FEET!', w / 2, 214, 50, '#ff8a8a', -0.02, ROUND);
  // a slice and a crossed-out foot, doodled
  cx.strokeStyle = '#ffe08a';
  cx.lineWidth = 3;
  cx.beginPath();
  cx.moveTo(76, 262);
  cx.quadraticCurveTo(101, 252, 126, 262);
  cx.lineTo(101, 304);
  cx.closePath();
  cx.stroke();
  cx.fillStyle = '#ff8a8a';
  for (const [px, py] of [[94, 270], [108, 274], [100, 286]]) {
    cx.beginPath();
    cx.arc(px, py, 3, 0, P2);
    cx.fill();
  }
  cx.strokeStyle = '#ff8a8a';
  cx.fillStyle = '#ff8a8a';
  // a little foot (a sole and five toes), crossed out
  cx.beginPath();
  cx.ellipse(w - 98, 288, 8, 12, 0.15, 0, P2);
  cx.fill();
  for (const [tx, ty, tr] of [[-8, -15, 3.2], [-2, -18, 2.6], [3, -18, 2.3], [7, -16, 2], [10, -12, 1.8]]) {
    cx.beginPath();
    cx.arc(w - 98 + tx, 288 + ty, tr, 0, P2);
    cx.fill();
  }
  cx.beginPath();
  cx.arc(w - 98, 282, 26, 0, P2);
  cx.moveTo(w - 116, 264);
  cx.lineTo(w - 80, 300);
  cx.stroke();
  cx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 1600; i++) {
    cx.fillStyle = `rgba(0,0,0,${0.3 + r() * 0.6})`;
    cx.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r());
  }
  ctx.globalAlpha = 0.9;
  ctx.drawImage(c, x, y);
  ctx.globalAlpha = 1;
  // a soft halo of chalk dust round the writing
  ctx.save();
  sl(ctx);
  ctx.clip();
  ctx.globalAlpha = 0.05;
  for (const [dx, dy] of [[-2, -1], [2, 1], [1, -2], [-1, 2]]) ctx.drawImage(c, x + dx, y + dy);
  ctx.restore();
  // the ledge with stubs of chalk, a pink one, and the felt eraser
  const ledge = rrPath(x - 6, y + h - 4, w + 12, 14, 3);
  castShadow(ctx, ledge, 8, 8, 0.4);
  solid(ctx, ledge, { x: x - 6, y: y + h - 4, w: w + 12, h: 14 }, 'wood', '#7a4a2a', { depth: 0.18, formSize: 5 });
  ctx.fillStyle = 'rgba(240,240,230,0.3)';
  ctx.fillRect(x, y + h - 4, w, 2);
  const er = rrPath(x + 40, y + h - 16, 48, 13, 3);
  solid(ctx, er, { x: x + 40, y: y + h - 16, w: 48, h: 13 }, 'wood', '#a87a4a', { depth: 0.18, line: 1.4, formSize: 3 });
  ctx.fillStyle = '#4a4040';
  ctx.fillRect(x + 41, y + h - 7, 46, 4);
  ctx.fillStyle = '#f4f2e8';
  ctx.fillRect(x + w - 70, y + h - 9, 22, 6);
  ctx.fillStyle = '#ff9aa8';
  ctx.fillRect(x + w - 108, y + h - 8, 14, 5);
  specHi(ctx, x + 70, y + 50, 90, 30, 0.08, -0.4);
}

const NEON_BOARD = { x: TN.neon.x - 318, y: TN.neon.y - 112, w: 636, h: 216, r: 30 };

/** The neon's board (a dark sheet on two chains, a transformer box on top), its tubes lit as given. */
function neonSign(ctx: Ctx, on: number[], shadows = true): void {
  const { x, y } = TN.neon;
  const B = NEON_BOARD;
  const boardPath = rrPath(B.x, B.y, B.w, B.h, B.r);
  if (shadows) {
    for (const dx of [-250, 250]) hang(ctx, x + dx, TN.beam - 4, x + dx, y - 108, 0, '#9a8a7a', 4, true);
    // the cable from the transformer up to the beam, in a lazy loop
    ctx.strokeStyle = '#1a1214';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 150, y - 118);
    ctx.bezierCurveTo(x + 180, y - 150, x + 120, TN.beam + 50, x + 170, TN.beam);
    ctx.stroke();
    castShadow(ctx, boardPath, 22, 26, 0.5);
    const tb = rrPath(x + 120, y - 130, 60, 20, 3);
    castShadow(ctx, tb, 8, 8, 0.4);
    solid(ctx, tb, { x: x + 120, y: y - 130, w: 60, h: 20 }, 'iron', '#4a4448', { depth: 0.15, line: 1.6, formSize: 5 });
  }
  solid(ctx, boardPath, { x: B.x, y: B.y, w: B.w, h: B.h }, 'iron', '#2a1e22', { depth: 0.15, formSize: 30 });
  for (const [bx, by] of [[-296, -90], [296, -90], [-296, 82], [296, 82]]) {
    const p = ellPath(x + bx, y + by, 6, 6);
    solid(ctx, p, { x: x + bx - 6, y: y + by - 6, w: 12, h: 12 }, 'chrome', '#a89888', { depth: 0.15, line: 1.5 });
  }
  neonText(ctx, 'FEETZA', x, y, 150, ROUND, '#ff4fa3', on);
  neonStroke(ctx, '#ff9a2a', 7, () => {
    ctx.beginPath();
    ctx.roundRect(x - 290, y - 92, 580, 176, 40);
    ctx.stroke();
  });
}

function neon(ctx: Ctx): void {
  neonSign(ctx, [1, 1, 1, 1, 1, 1]);
}

/** Where the Z sits on the board (it stutters): its column, with room for its neighbours' glow. */
function neonZBox(): { x: number; y: number; w: number; h: number } {
  const [, c] = makeCanvas(4, 4);
  c.font = `150px ${ROUND}`;
  const widths = [...'FEETZA'].map((ch) => c.measureText(ch).width);
  const total = widths.reduce((s, v) => s + v, 0);
  const zl = TN.neon.x - total / 2 + widths[0] + widths[1] + widths[2] + widths[3];
  return { x: Math.round(zl - 26), y: TN.neon.y - 100, w: Math.round(widths[4] + 52), h: 196 };
}

/** The board round the Z with the Z unlit (shown over the lit board while it stutters). */
function neonZOff(ctx: Ctx): void {
  const b = neonZBox();
  ctx.save();
  ctx.beginPath();
  ctx.rect(b.x, b.y, b.w, b.h);
  ctx.clip();
  neonSign(ctx, [1, 1, 1, 1, 0, 1], false);
  ctx.restore();
}

// ——— the oven ———

/** The mouth's opening (screen px). */
function mouthPath(c: Ctx): void {
  const o = TN.oven;
  c.beginPath();
  c.moveTo(o.x - o.mouthHalf, o.mouthY);
  c.lineTo(o.x - o.mouthHalf, o.archTop + o.mouthHalf);
  c.arc(o.x, o.archTop + o.mouthHalf, o.mouthHalf, Math.PI, 0);
  c.lineTo(o.x + o.mouthHalf, o.mouthY);
  c.closePath();
}

function oven(ctx: Ctx, r: R): void {
  const o = TN.oven;
  const x0 = 34;
  const x1 = 526;
  // the flue: a copper pipe up into the beam, sooted, gone green where the steam of years has run down it
  const flue = rectPath(TN.flue.x - TN.flue.w / 2, 0, TN.flue.w, o.domeTop + 20);
  castShadow(ctx, flue, 14, 14, 0.4);
  solid(ctx, flue, { x: TN.flue.x - TN.flue.w / 2, y: 0, w: TN.flue.w, h: o.domeTop }, 'chrome', '#b06a3a', { depth: 0.18, formSize: 14 });
  within(ctx, flue, () => {
    lay(ctx, noiseMask(6, 93, { cover: 0.3, soft: 0.12, col: '#4a8a6a' }), { x: TN.flue.x - TN.flue.w / 2, y: 20, w: TN.flue.w, h: o.domeTop - 20 }, 0.35);
    vfill(ctx, TN.flue.x - TN.flue.w / 2, 0, TN.flue.w, o.domeTop + 20, [[0, 'rgba(20,10,4,0.55)'], [0.5, 'rgba(20,10,4,0.1)'], [1, 'rgba(20,10,4,0.4)']]);
  });
  for (const by of [70, 170]) {
    const band = rectPath(TN.flue.x - TN.flue.w / 2 - 5, by, TN.flue.w + 10, 14);
    solid(ctx, band, { x: TN.flue.x - 32, y: by, w: 64, h: 14 }, 'chrome', '#8a4a2a', { depth: 0.18, line: 2 });
    for (const dx of [-18, 0, 18]) {
      ctx.fillStyle = '#e8b070';
      ctx.beginPath();
      ctx.arc(TN.flue.x + dx, by + 7, 1.8, 0, P2);
      ctx.fill();
    }
  }
  // the brick base with a niche of stacked logs
  const basePath = rectPath(x0, o.mouthY, x1 - x0, TY - o.mouthY + 2);
  castShadow(ctx, basePath, 18, 20, 0.45);
  ctx.save();
  basePath(ctx);
  ctx.clip();
  bricks(ctx, r, { x: x0, y: o.mouthY, w: x1 - x0, h: TY - o.mouthY }, BRICK, '#b8946a', 64, 26);
  // soot over the bricks under the ledge, ash dust on them, the fire's warmth on the left of the base
  vfill(ctx, x0, o.mouthY, x1 - x0, 60, [[0, 'rgba(26,10,4,0.5)'], [1, 'rgba(26,10,4,0)']]);
  lay(ctx, noiseMask(9, 103, { cover: 0.2, soft: 0.1, col: '#d8ccc0' }), { x: x0, y: o.mouthY + 30, w: x1 - x0, h: TY - o.mouthY - 30 }, 0.25);
  ctx.restore();
  rim(ctx, basePath, 0.3, 3);
  ctx.lineWidth = lineAt(0.15);
  ctx.strokeStyle = '#2a1208';
  basePath(ctx);
  ctx.stroke();
  const niche = rrPath(96, 656, 368, 96, 8);
  ctx.fillStyle = '#1a0c06';
  niche(ctx);
  ctx.fill();
  within(ctx, niche, () => {
    logStore(ctx, r, { x: 96, y: 656, w: 368, h: 96 });
    // the niche's own shade: deep under its lintel and in its corners
    vfill(ctx, 96, 656, 368, 96, [[0, 'rgba(10,4,2,0.75)'], [0.3, 'rgba(10,4,2,0.2)'], [0.7, 'rgba(10,4,2,0)'], [1, 'rgba(10,4,2,0.35)']]);
    const sg = ctx.createLinearGradient(96, 0, 464, 0);
    sg.addColorStop(0, 'rgba(10,4,2,0.45)');
    sg.addColorStop(0.12, 'rgba(10,4,2,0)');
    sg.addColorStop(0.88, 'rgba(10,4,2,0)');
    sg.addColorStop(1, 'rgba(10,4,2,0.5)');
    ctx.fillStyle = sg;
    ctx.fillRect(96, 656, 368, 96);
  });
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#2a1208';
  niche(ctx);
  ctx.stroke();
  ctx.fillStyle = rgba('#ffd8a8', 0.25);
  ctx.fillRect(100, 652, 360, 2);
  // the dome: lime-plastered, warm, a band of hand-painted tiles
  const dome = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x0 + 14, o.mouthY);
    c.lineTo(x0 + 14, 380);
    c.bezierCurveTo(x0 + 14, 300, 150, o.domeTop, o.x, o.domeTop);
    c.bezierCurveTo(410, o.domeTop, x1 - 14, 300, x1 - 14, 380);
    c.lineTo(x1 - 14, o.mouthY);
    c.closePath();
  };
  castShadow(ctx, dome, 24, 30, 0.45);
  solid(ctx, dome, { x: x0, y: o.domeTop, w: x1 - x0, h: o.mouthY - o.domeTop }, LIME, '#e4b07a', { depth: 0.14, formSize: 70 });
  within(ctx, dome, () => {
    const db = { x: x0, y: o.domeTop, w: x1 - x0, h: o.mouthY - o.domeTop };
    broken(ctx, db, 0.5, 5, 13);
    plasterSkin(ctx, r, db);
    // soot rising from the mouth: a dark plume up the face, densest just over the arch
    softly(ctx, db, (g) => {
      const sg = g.createRadialGradient(o.x, o.archTop - 10, 10, o.x, o.archTop - 70, 210);
      sg.addColorStop(0, 'rgba(26,12,6,0.85)');
      sg.addColorStop(0.5, 'rgba(26,12,6,0.42)');
      sg.addColorStop(1, 'rgba(26,12,6,0)');
      g.fillStyle = sg;
      g.beginPath();
      g.ellipse(o.x + 10, o.archTop - 80, 150, 200, 0.1, 0, P2);
      g.fill();
    }, 0.25);
    // the form: lit from the top left, the right side turning away into warm shade
    const fg = ctx.createLinearGradient(x0 + 40, o.domeTop, x1, o.mouthY);
    fg.addColorStop(0, rgba('#fff4dc', 0.3));
    fg.addColorStop(0.45, rgba('#fff4dc', 0));
    fg.addColorStop(0.7, rgba('#5a2410', 0.12));
    fg.addColorStop(1, rgba('#3a1408', 0.42));
    ctx.fillStyle = fg;
    ctx.fillRect(x0, o.domeTop, x1 - x0, o.mouthY - o.domeTop);
    lightPool(ctx, o.x, o.mouthY - 60, 260, 200, '#ff9a4a', 0.22);
    // heat crazing round the arch: fine cracks radiating from the voussoirs
    const cr = { col: '#5a2a10', lip: '#fff0d0', w: 1.2, a: 0.45 };
    crack(ctx, r, o.x - 150, o.archTop + 40, -2.2, 60, cr);
    crack(ctx, r, o.x + 150, o.archTop + 30, -0.8, 54, cr);
    crack(ctx, r, o.x + 40, o.archTop - 44, -1.3, 40, cr);
    // the tile band: glazed, hand-painted, a few chipped
    const ty = 346;
    for (let k = 0; k < 13; k++) {
      const tx = x0 + 24 + k * 36;
      const tp = rrPath(tx, ty, 32, 32, 3);
      solid(ctx, tp, { x: tx, y: ty, w: 32, h: 32 }, 'enamel', k % 2 ? '#2a5a9a' : '#f2e8d4', { depth: 0.14, line: 1.4, formSize: 6 });
      ctx.fillStyle = k % 2 ? '#f2e8d4' : '#c8402a';
      ctx.beginPath();
      if (k % 2) {
        ctx.moveTo(tx + 16, ty + 6);
        ctx.lineTo(tx + 26, ty + 16);
        ctx.lineTo(tx + 16, ty + 26);
        ctx.lineTo(tx + 6, ty + 16);
      } else ctx.arc(tx + 16, ty + 16, 6, 0, P2);
      ctx.fill();
      // the glaze: a crisp window glint on each, softer towards the shaded right
      ctx.fillStyle = rgba('#ffffff', 0.5 - k * 0.025);
      ctx.fillRect(tx + 5, ty + 4, 7, 2);
      if (k === 4 || k === 10) {
        ctx.fillStyle = '#c8a888';
        ctx.beginPath();
        ctx.moveTo(tx + 32, ty + 32);
        ctx.lineTo(tx + 22, ty + 32);
        ctx.lineTo(tx + 32, ty + 22);
        ctx.fill();
      }
    }
    ctx.fillStyle = 'rgba(40,16,6,0.3)';
    ctx.fillRect(x0, ty + 32, x1 - x0, 3);
    // a brass thermometer set into the dome beside the mouth
    const tm = ellPath(o.x + 168, o.archTop + 30, 15, 15);
    castShadow(ctx, tm, 5, 6, 0.4);
    solid(ctx, tm, { x: o.x + 153, y: o.archTop + 15, w: 30, h: 30 }, 'chrome', '#c89a4a', { depth: 0.14, line: 1.6 });
    ctx.fillStyle = '#f2e8d0';
    ctx.beginPath();
    ctx.arc(o.x + 168, o.archTop + 30, 10, 0, P2);
    ctx.fill();
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 0.8;
    for (let k = 0; k < 9; k++) {
      const a = Math.PI * (0.75 + k * 0.1875);
      ctx.beginPath();
      ctx.moveTo(o.x + 168 + Math.cos(a) * 7, o.archTop + 30 + Math.sin(a) * 7);
      ctx.lineTo(o.x + 168 + Math.cos(a) * 9.5, o.archTop + 30 + Math.sin(a) * 9.5);
      ctx.stroke();
    }
    ctx.strokeStyle = '#b01a10';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(o.x + 168, o.archTop + 30);
    ctx.lineTo(o.x + 175, o.archTop + 23);
    ctx.stroke();
  });
}

/** The log store: split oak and beech stacked end-on, each log its own size and shape, bark round its end grain,
 * growth rings round an off-centre pith, checks split from the heart, lit from the top left; lower rows bear (and
 * overlap) the ones above, each throwing its shadow on the next. */
function logStore(ctx: Ctx, r: R, b: { x: number; y: number; w: number; h: number }): void {
  const logs: [number, number, number][] = [];
  let y = b.y + 14;
  for (let row = 0; y < b.y + b.h + 16; row++) {
    let x = b.x - 6 + (row % 2) * 12 + r() * 8;
    while (x < b.x + b.w + 12) {
      const rad = 11 + r() * 10;
      logs.push([x + rad, y + (r() - 0.5) * 6, rad]);
      x += rad * 2 - 4 + r() * 3;
    }
    y += 25 + r() * 5;
  }
  for (const [cx, cy, rad] of logs) {
    const split = r() < 0.28;
    const sa = r() * P2;
    const pts: [number, number][] = [];
    const n = 16;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * P2;
      const k = 0.9 + r() * 0.12;
      pts.push([cx + Math.cos(a) * rad * k, cy + Math.sin(a) * rad * k * 0.96]);
    }
    const outline: [number, number][] = split ? [[cx + Math.cos(sa) * rad * 0.15, cy + Math.sin(sa) * rad * 0.15], ...pts.filter((_, i) => Math.cos((i / n) * P2 - sa) < 0.35)] : pts;
    const path = polyPath(outline);
    // its shadow on the logs behind and below it
    ctx.save();
    ctx.translate(3, 4);
    path(ctx);
    ctx.fillStyle = 'rgba(8,3,1,0.55)';
    ctx.fill();
    ctx.restore();
    path(ctx);
    ctx.fillStyle = jitterHex('#3e2616', r, 0.1);
    ctx.fill();
    // the end grain inside the bark
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(0.84, 0.84);
    ctx.translate(-cx, -cy);
    path(ctx);
    ctx.restore();
    const px = cx + (r() - 0.5) * rad * 0.35;
    const py = cy + (r() - 0.5) * rad * 0.35;
    const wood = jitterHex(r() < 0.5 ? '#c8945a' : '#b88450', r, 0.08);
    const g = ctx.createRadialGradient(px - rad * 0.2, py - rad * 0.25, 0, px, py, rad);
    g.addColorStop(0, shade(wood, 0.18));
    g.addColorStop(0.7, wood);
    g.addColorStop(1, shade(wood, -0.3));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = rgba('#6a4020', 0.3);
    ctx.lineWidth = 0.8;
    for (let k = 1; k <= 4; k++) {
      ctx.beginPath();
      ctx.ellipse(px, py, rad * 0.2 * k * (0.9 + r() * 0.2), rad * 0.19 * k, r(), 0, P2);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(30,14,6,0.6)';
    ctx.lineWidth = 1;
    for (let k = 0; k < 2 + Math.floor(r() * 2); k++) {
      const a = r() * P2;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(a) * rad * 0.8, py + Math.sin(a) * rad * 0.8);
      ctx.stroke();
    }
    ctx.restore();
    // lit on its top left, turning away bottom right
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = rgba('#ffd8a8', 0.32);
    ctx.beginPath();
    ctx.arc(cx, cy, rad * 0.9, Math.PI * 1.05, Math.PI * 1.6);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(10,4,2,0.5)';
    ctx.beginPath();
    ctx.arc(cx, cy, rad * 0.92, Math.PI * 0.05, Math.PI * 0.6);
    ctx.stroke();
  }
}

/** A raised and fielded panel of the wainscot, its bevels crisp in the room's light and the field showing its
 * figure (cathedral arches of grain). */
function wainPanel(ctx: Ctx, r: R, x: number, y: number, w: number, h: number, lights: Reflect[]): void {
  panel(ctx, r, x, y, w, h, WALNUT, { bevel: 16, lights, vertical: false });
  const b = 16;
  const quad = (pts: [number, number][], fill: string) => {
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };
  const x1 = x + w;
  const y1 = y + h;
  quad([[x, y], [x1, y], [x1 - b, y + b], [x + b, y + b]], 'rgba(255,214,160,0.2)');
  quad([[x, y], [x + b, y + b], [x + b, y1 - b], [x, y1]], 'rgba(255,214,160,0.1)');
  quad([[x, y1], [x + b, y1 - b], [x1 - b, y1 - b], [x1, y1]], 'rgba(16,6,2,0.32)');
  quad([[x1, y], [x1, y1], [x1 - b, y1 - b], [x1 - b, y + b]], 'rgba(16,6,2,0.22)');
  // crisp arrises where the bevels meet the field and the frame
  ctx.fillStyle = 'rgba(255,226,180,0.45)';
  ctx.fillRect(x, y - 1, w, 1.2);
  ctx.fillRect(x - 1, y, 1.2, h);
  ctx.fillStyle = 'rgba(16,6,2,0.55)';
  ctx.fillRect(x + b, y1 - b, w - b * 2, 1.2);
  ctx.fillRect(x1 - b, y + b, 1.2, h - b * 2);
  // the field's figure: nested arches of grain rising from below its middle
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + b, y + b, w - b * 2, h - b * 2);
  ctx.clip();
  const mx = x + w * (0.4 + r() * 0.2);
  for (let k = 0; k < 7; k++) {
    const sp = 18 + k * 16;
    ctx.strokeStyle = k % 2 ? rgba('#c8885a', 0.1) : 'rgba(24,8,2,0.2)';
    ctx.lineWidth = 1 + r();
    ctx.beginPath();
    ctx.moveTo(mx - sp, y1);
    ctx.bezierCurveTo(mx - sp, y + b + 6 + k * 4, mx + sp, y + b + 6 + k * 4, mx + sp, y1);
    ctx.stroke();
  }
  ctx.restore();
}

/** Lime plaster's skin on the dome: trowel arcs, pits, the wash thinner on the curve's crown. */
function plasterSkin(ctx: Ctx, r: R, b: { x: number; y: number; w: number; h: number }): void {
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 40; i++) {
    const x = b.x + r() * b.w;
    const y = b.y + r() * b.h;
    ctx.strokeStyle = rgba(r() < 0.6 ? '#fff0d0' : '#8a4a24', 0.05 + r() * 0.05);
    ctx.lineWidth = 6 + r() * 10;
    ctx.beginPath();
    ctx.arc(x, y, 30 + r() * 40, r() * P2, r() * P2 + 1.2);
    ctx.stroke();
  }
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = rgba('#5a2a10', 0.2 + r() * 0.2);
    ctx.beginPath();
    ctx.arc(b.x + r() * b.w, b.y + r() * b.h, 0.8 + r() * 1.2, 0, P2);
    ctx.fill();
  }
  ctx.restore();
}

/** Inside the mouth: the firebrick vault glowing, the oven's floor, the logs burning at the back on the left, the
 * coals spread in front of them, and a pizza baking on the right (the fire itself is live, or painted in the still). */
function ovenInner(ctx: Ctx, r: R): void {
  const o = TN.oven;
  const cx = o.x;
  const cy = o.archTop + o.mouthHalf;
  within(ctx, mouthPath, () => {
    vfill(ctx, o.x - o.mouthHalf, o.archTop, o.mouthHalf * 2, o.mouthY - o.archTop, [[0, '#140604'], [0.55, '#2a0c06'], [1, '#4a1a08']]);
    // the vault's firebrick: courses curving round with the dome, catching the fire from below
    for (let k = 1; k < 6; k++) {
      ctx.strokeStyle = rgba('#000000', 0.35);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 10 + k * 6, o.mouthHalf - k * 4, o.mouthHalf * 0.85 - k * 10, 0, Math.PI, 0);
      ctx.stroke();
    }
    for (let k = 0; k < 16; k++) {
      const a = Math.PI + (k / 16) * Math.PI;
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 60, cy + 30 + Math.sin(a) * 50);
      ctx.lineTo(cx + Math.cos(a) * 104, cy + 20 + Math.sin(a) * 96);
      ctx.stroke();
    }
    // the fire's light on the vault, strongest over the logs
    lightPool(ctx, cx - 50, o.mouthY - 40, 170, 140, '#ff6a1a', 0.55);
    lightPool(ctx, cx - 40, o.archTop + 40, 120, 50, '#ffa040', 0.25);
    // the oven floor: its far edge under the back wall, worn smooth, ashy
    const fl = polyPath([[cx - 106, o.mouthY], [cx - 96, o.mouthY - 34], [cx + 96, o.mouthY - 34], [cx + 106, o.mouthY]]);
    within(ctx, fl, () => {
      vfill(ctx, cx - 110, o.mouthY - 34, 220, 34, [[0, '#3a1a10'], [1, '#7a4a32']]);
      lay(ctx, noiseMask(10, 113, { cover: 0.35, soft: 0.1, col: '#c8b4a0' }), { x: cx - 110, y: o.mouthY - 34, w: 220, h: 34 }, 0.3);
      lightPool(ctx, cx - 60, o.mouthY - 20, 110, 24, '#ff8a3a', 0.4);
    });
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(cx - 96, o.mouthY - 35, 192, 2);
    // the logs at the back on the left: charred, split, glowing in their cracks
    const logs: [number, number, number, number, number][] = [[cx - 70, o.mouthY - 40, 64, 12, -0.25], [cx - 52, o.mouthY - 50, 58, 11, 0.2], [cx - 80, o.mouthY - 56, 46, 10, 0.05]];
    for (const [lx, ly, len, th, a] of logs) {
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(a);
      const lp = rrPath(-len / 2, -th / 2, len, th, th / 2);
      lp(ctx);
      ctx.fillStyle = '#1a0a06';
      ctx.fill();
      // the char: a crazed skin of cracks, glowing orange where they open
      ctx.strokeStyle = 'rgba(255,120,30,0.75)';
      ctx.lineWidth = 1;
      for (let k = 0; k < 9; k++) {
        const x = -len / 2 + 4 + r() * (len - 8);
        ctx.beginPath();
        ctx.moveTo(x, -th / 2 + 1);
        ctx.lineTo(x + (r() - 0.5) * 4, th / 2 - 1);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,150,60,0.35)';
      ctx.fillRect(-len / 2, th / 2 - 3, len, 2);
      ctx.fillStyle = '#c8a070';
      ctx.beginPath();
      ctx.ellipse(len / 2, 0, 3, th / 2, 0, 0, P2);
      ctx.fill();
      ctx.restore();
    }
    // the coals: dark lumps spread in a bed in front of the logs
    for (let i = 0; i < 60; i++) {
      const x = cx - 102 + r() * 124;
      const y = o.mouthY - 4 - r() * 20;
      ctx.fillStyle = rgba(r() < 0.5 ? '#2a0e06' : '#4a1a0a', 0.55);
      ctx.beginPath();
      ctx.ellipse(x, y, 1.5 + r() * 2.5, 1 + r() * 1.4, 0, 0, P2);
      ctx.fill();
    }
    // a pizza baking on the right: its crust blistering, the cheese bubbling, lit from the fire on the left
    const px = cx + 52;
    const py = o.mouthY - 14;
    const pz = ellPath(px, py, 36, 9);
    groundShadow(ctx, px + 4, py + 4, 38, 4, 0.5, '#0a0402');
    solid(ctx, pz, { x: px - 36, y: py - 9, w: 72, h: 18 }, 'plastic', '#d89a4a', { depth: 0.13, line: 1.4, formSize: 4, spec: false });
    ctx.fillStyle = '#c0301a';
    ctx.beginPath();
    ctx.ellipse(px, py - 1, 29, 6.5, 0, 0, P2);
    ctx.fill();
    for (let k = 0; k < 8; k++) {
      ctx.fillStyle = '#f4e4b8';
      ctx.beginPath();
      ctx.ellipse(px - 22 + k * 6.4 + (r() - 0.5) * 3, py - 2 + (r() - 0.5) * 5, 4, 2, 0, 0, P2);
      ctx.fill();
    }
    for (let k = 0; k < 7; k++) {
      ctx.fillStyle = '#2a1006';
      ctx.beginPath();
      ctx.arc(px - 30 + r() * 60, py + (r() < 0.5 ? -7 : 6), 1.4, 0, P2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,170,80,0.4)';
    ctx.beginPath();
    ctx.ellipse(px - 18, py - 3, 16, 4, 0, 0, P2);
    ctx.fill();
    // the mouth's own depth: darker up under the arch's soffit
    vfill(ctx, o.x - o.mouthHalf, o.archTop, o.mouthHalf * 2, 40, [[0, 'rgba(8,2,0,0.6)'], [1, 'rgba(8,2,0,0)']]);
  });
}

// ——— the fire (painted frames) ———

export const FIRE = { x: TN.oven.x - TN.oven.mouthHalf, y: TN.oven.archTop, w: TN.oven.mouthHalf * 2, h: TN.oven.mouthY - TN.oven.archTop, n: 16 };

/** One frame of the oven's fire at phase ph (0…1 loops), in the mouth's own coordinates (its top-left at FIRE): a
 * bed of tongues licking up off the logs on the left, the flame rolling across the vault towards the right, tips
 * pinching off and rising, the coals breathing. Painted with added light (it goes over the dark mouth). */
export function fireFrame(c: Ctx, ph: number): void {
  const R0 = TN.oven.mouthHalf;
  const cx = R0;
  const cy = R0;
  const H = FIRE.h;
  const S = (f: number, s: number) => Math.sin(P2 * ph * f + s);
  c.save();
  c.beginPath();
  c.moveTo(0, H);
  c.lineTo(0, cy);
  c.arc(cx, cy, R0, Math.PI, 0);
  c.lineTo(FIRE.w, H);
  c.closePath();
  c.clip();
  c.globalCompositeOperation = 'lighter';
  const breathe = 0.82 + 0.1 * S(1, 0) + 0.08 * S(3, 1.3);
  const vg = c.createRadialGradient(60, H - 30, 0, 60, H - 30, 190);
  vg.addColorStop(0, `rgba(255,120,40,${(0.4 * breathe).toFixed(3)})`);
  vg.addColorStop(0.5, `rgba(216,74,16,${(0.16 * breathe).toFixed(3)})`);
  vg.addColorStop(1, 'rgba(216,74,16,0)');
  c.fillStyle = vg;
  c.fillRect(0, 0, FIRE.w, H);
  // the flame rolling across the vault: a band hugging the curve, thick over the logs, thinning to the right
  const roll: [number, string, number, number][] = [[1, '#c8300a', 0.42, 3], [0.62, '#ff8a1e', 0.5, 1.6], [0.3, '#ffd27a', 0.6, 0.6]];
  for (const [k, col, a, blur] of roll) {
    const n = 34;
    const a0 = Math.PI * 1.02;
    const a1 = Math.PI * 1.9;
    c.filter = `blur(${blur}px)`;
    c.beginPath();
    for (let i = 0; i <= n; i++) {
      const th = a0 + ((a1 - a0) * i) / n;
      const x = cx + Math.cos(th) * (R0 + 6);
      const y = cy + Math.sin(th) * (R0 + 6);
      if (i) c.lineTo(x, y);
      else c.moveTo(x, y);
    }
    for (let i = n; i >= 0; i--) {
      const t = i / n;
      const th = a0 + (a1 - a0) * t;
      const thick = (16 + 22 * Math.max(0, Math.sin(th * 6 - P2 * ph * 2 + 0.5)) + 7 * Math.sin(th * 11 + P2 * ph * 3)) * (1 - t) ** 0.8 * k;
      const rr = R0 - 2 - Math.max(2, thick);
      c.lineTo(cx + Math.cos(th) * rr, cy + Math.sin(th) * rr);
    }
    c.closePath();
    c.fillStyle = rgba(col, a * breathe);
    c.fill();
  }
  // the tongues off the logs, leaning right towards the draught under the arch and curling up into the roll
  const base = H - 38;
  for (let i = 0; i < 8; i++) {
    const bx = 8 + i * 14 + 5 * Math.sin(i * 2.7);
    const f1 = 1 + (i % 3);
    const f2 = 2 + ((i * 2) % 3);
    const h = (104 - i * 8) * (0.7 + 0.2 * S(f1, i * 1.7) + 0.1 * S(f2, i * 0.9));
    const wdt = 24 - i * 1.2;
    const lean = 0.4 + 0.14 * S(f2, i);
    const tipX = bx + h * lean + 6 * S(2, i * 2.1);
    const wob = 7 * S(f1 + 1, i * 0.7);
    const layers: [number, string, number, number][] = [[1, '#d0380c', 0.5, 2.4], [0.74, '#ff9424', 0.55, 1.4]];
    // (a hot core only in every other tongue, so the bed doesn't read as a row of teeth)
    if (i % 2 === 0) layers.push([0.5 + 0.08 * S(f1, i), '#ffe08a', 0.65, 1]);
    for (const [k, col, a, blur] of layers) {
      const ww = wdt * k;
      const tx = bx + (tipX - bx) * k;
      const ty = base - h * k;
      c.filter = `blur(${blur}px)`;
      c.beginPath();
      c.moveTo(bx - ww / 2, base + 6);
      c.bezierCurveTo(bx - ww * 0.8 + wob * 0.3, base - h * 0.3 * k, tx - ww * 0.5 - wob, ty + h * 0.45 * k, tx, ty);
      c.bezierCurveTo(tx + ww * 0.15 + wob, ty + h * 0.3 * k, bx + ww * 0.9 - wob * 0.3, base - h * 0.35 * k, bx + ww / 2, base + 6);
      c.closePath();
      const g = c.createLinearGradient(0, ty, 0, base + 6);
      g.addColorStop(0, rgba(col, 0));
      g.addColorStop(0.35, rgba(col, a * 0.8));
      g.addColorStop(1, rgba(col, a));
      c.fillStyle = g;
      c.fill();
    }
  }
  // wisps pinching off the tongues and rising along the vault, stretched by the draught
  c.filter = 'blur(1.5px)';
  for (let j = 0; j < 6; j++) {
    const u = (ph * (1 + (j % 2)) + j / 6) % 1;
    const x = 40 + (j % 3) * 16 + u * 80 + 5 * Math.sin(P2 * u + j);
    const y = base - 70 - u * 40;
    c.fillStyle = rgba(u < 0.4 ? '#ffb040' : '#ff6a1a', 0.32 * Math.sin(Math.PI * u));
    c.beginPath();
    c.ellipse(x, y, 7 * (1 - u * 0.5), 3, -0.5, 0, P2);
    c.fill();
  }
  c.filter = 'none';
  // the coal bed breathing: a glowing band, and its coals each on their own beat
  c.save();
  c.translate(66, H - 6);
  c.scale(1, 0.2);
  const bed = c.createRadialGradient(0, 0, 0, 0, 0, 96);
  bed.addColorStop(0, `rgba(255,90,20,${(0.34 * breathe).toFixed(3)})`);
  bed.addColorStop(0.6, `rgba(255,90,20,${(0.16 * breathe).toFixed(3)})`);
  bed.addColorStop(1, 'rgba(255,90,20,0)');
  c.fillStyle = bed;
  c.fillRect(-100, -100, 200, 200);
  c.restore();
  const cr = rng(hashStr('tr-coals'));
  for (let i = 0; i < 26; i++) {
    const x = 6 + cr() * 130;
    const y = H - 6 - cr() * 16;
    const f = 1 + Math.floor(cr() * 2);
    const b = 0.5 + 0.35 * S(f, cr() * 6) + 0.15 * S(f * 3, cr() * 6);
    const rad = 2 + cr() * 3;
    const g = c.createRadialGradient(x, y, 0, x, y, rad * 1.8);
    g.addColorStop(0, rgba(b > 0.7 ? '#ffd060' : '#ff8a2a', 0.7 * b));
    g.addColorStop(0.5, rgba('#ff4a10', 0.35 * b));
    g.addColorStop(1, rgba('#ff4a10', 0));
    c.fillStyle = g;
    c.fillRect(x - rad * 2, y - rad * 2, rad * 4, rad * 4);
  }
  // the floor's glow in front of the fire
  c.save();
  c.translate(70, H);
  c.scale(1, 0.3);
  const fg = c.createRadialGradient(0, 0, 0, 0, 0, 110);
  fg.addColorStop(0, `rgba(255,110,30,${(0.26 * breathe).toFixed(3)})`);
  fg.addColorStop(1, 'rgba(255,110,30,0)');
  c.fillStyle = fg;
  c.fillRect(-110, -110, 220, 110);
  c.restore();
  c.restore();
}

/** The fire, painted (the still: the live layer plays its frames). */
function ovenFireStill(ctx: Ctx): void {
  ctx.save();
  ctx.translate(FIRE.x, FIRE.y);
  fireFrame(ctx, 0);
  ctx.restore();
}

function ovenFront(ctx: Ctx, r: R): void {
  const o = TN.oven;
  // the brick arch round the mouth: voussoirs fanning out, the fire lighting their undersides, soot over the crown
  const n = 13;
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI + (i / n) * Math.PI;
    const a1 = Math.PI + ((i + 1) / n) * Math.PI;
    const cx = o.x;
    const cy = o.archTop + o.mouthHalf;
    const ri = o.mouthHalf;
    const ro = o.mouthHalf + 34;
    const p = (c: Ctx) => {
      c.beginPath();
      c.arc(cx, cy, ro, a0 + 0.012, a1 - 0.012);
      c.arc(cx, cy, ri, a1 - 0.012, a0 + 0.012, true);
      c.closePath();
    };
    solid(ctx, p, { x: cx - ro, y: cy - ro, w: ro * 2, h: ro }, 'stone', BRICK[i % BRICK.length], { depth: 0.13, line: 1.8, formSize: 8 });
    within(ctx, p, () => {
      // soot: darkest on the bricks over the crown, where the smoke curls out
      const crown = 1 - Math.abs(i - (n - 1) / 2) / ((n - 1) / 2);
      ctx.fillStyle = `rgba(20,8,4,${(0.15 + crown * 0.45).toFixed(3)})`;
      ctx.fillRect(cx - ro, cy - ro, ro * 2, ro);
    });
    bounce(ctx, p, cx, cy, [cx, cy - ri], '#ff8a3a', 0.5, 6);
  }
  for (const side of [-1, 1]) {
    const jx = side < 0 ? o.x - o.mouthHalf - 34 : o.x + o.mouthHalf;
    const p = rectPath(jx, o.archTop + o.mouthHalf, 34, o.mouthY - o.archTop - o.mouthHalf);
    solid(ctx, p, { x: jx, y: o.archTop + o.mouthHalf, w: 34, h: 70 }, 'stone', BRICK[side < 0 ? 2 : 5], { depth: 0.13, line: 1.8, formSize: 8 });
    within(ctx, p, () => {
      ctx.fillStyle = 'rgba(20,8,4,0.6)';
      ctx.fillRect(jx, o.archTop + o.mouthHalf + 28, 34, 2);
    });
    bounce(ctx, p, jx + 17, o.mouthY - 30, [o.x, o.mouthY - 40], '#ff8a3a', 0.55, 6);
  }
  const ks = polyPath([[o.x - 18, o.archTop - 40], [o.x + 18, o.archTop - 40], [o.x + 12, o.archTop + 4], [o.x - 12, o.archTop + 4]]);
  solid(ctx, ks, { x: o.x - 18, y: o.archTop - 40, w: 36, h: 44 }, 'stone', '#e8dcc0', { depth: 0.13, line: 2 });
  within(ctx, ks, () => vfill(ctx, o.x - 18, o.archTop - 40, 36, 44, [[0, 'rgba(30,14,6,0.15)'], [1, 'rgba(30,14,6,0.55)']]));
  // the stone ledge in front of the mouth, warm with the fire, ash and a brush on it
  const ledge = rrPath(o.x - 160, o.mouthY - 2, 320, 22, 4);
  castShadow(ctx, ledge, 14, 14, 0.5);
  solid(ctx, ledge, { x: o.x - 160, y: o.mouthY - 2, w: 320, h: 22 }, 'stone', '#d8ccb4', { depth: 0.12, formSize: 7 });
  within(ctx, ledge, () => {
    lay(ctx, noiseMask(12, 127, { cover: 0.3, soft: 0.08, col: '#9a9088' }), { x: o.x - 160, y: o.mouthY - 2, w: 320, h: 8 }, 0.5);
    chips(ctx, r, o.x - 150, o.x + 150, o.mouthY + 18, 8, '#d8ccb4', 3);
  });
  lightPool(ctx, o.x, o.mouthY + 2, 150, 14, '#ff9a40', 0.5);
}

function peel(ctx: Ctx, r: R): void {
  const { x, y } = TN.peel;
  const ang = -0.12;
  const handle = (c: Ctx) => {
    c.save();
    c.translate(x, y);
    c.rotate(ang);
    c.beginPath();
    c.roundRect(-7, -270, 14, 270, 6);
    c.restore();
  };
  const blade = (c: Ctx) => {
    c.save();
    c.translate(x, y);
    c.rotate(ang);
    c.beginPath();
    c.moveTo(-14, -262);
    c.bezierCurveTo(-60, -280, -66, -370, -40, -410);
    c.quadraticCurveTo(0, -440, 40, -410);
    c.bezierCurveTo(66, -370, 60, -280, 14, -262);
    c.closePath();
    c.restore();
  };
  castShadow(ctx, blade, 14, 14, 0.45);
  castShadow(ctx, handle, 12, 10, 0.4);
  groundShadow(ctx, x + 8, y, 16, 4, 0.5);
  solid(ctx, handle, { x: x - 30, y: y - 270, w: 30, h: 270 }, 'wood', '#c8a06a', { depth: 0.12, formSize: 6 });
  within(ctx, handle, () => {
    // the handle polished dark where hands hold it
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.fillStyle = 'rgba(90,50,20,0.35)';
    ctx.fillRect(-8, -200, 16, 60);
    ctx.fillStyle = 'rgba(255,240,210,0.25)';
    ctx.fillRect(-5, -200, 2, 60);
    ctx.restore();
  });
  solid(ctx, blade, { x: x - 66, y: y - 440, w: 132, h: 180 }, 'wood', '#c8975a', { depth: 0.12, formSize: 22 });
  within(ctx, blade, () => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    for (let dx = -64; dx <= 64; dx += 3 + r() * 4) {
      ctx.strokeStyle = rgba(r() < 0.5 ? '#6a4420' : '#f0d0a0', 0.12 + r() * 0.1);
      ctx.lineWidth = 0.8 + r() * 1.2;
      ctx.beginPath();
      ctx.moveTo(dx, -262);
      ctx.quadraticCurveTo(dx + (r() - 0.5) * 4, -350, dx * 0.96, -440);
      ctx.stroke();
    }
    // flour dusted over the blade, thicker towards its tip
    for (let i = 0; i < 160; i++) {
      const fy = -270 - r() ** 0.6 * 160;
      ctx.fillStyle = rgba('#fff8ec', 0.15 + r() * 0.25);
      ctx.fillRect((r() - 0.5) * 90, fy, 1 + r() * 1.5, 1 + r());
    }
    ctx.restore();
    // scorched along its edges from the oven
    const g = ctx.createLinearGradient(x - 70, 0, x + 70, 0);
    g.addColorStop(0, 'rgba(60,24,6,0.38)');
    g.addColorStop(0.3, 'rgba(60,24,6,0)');
    g.addColorStop(0.75, 'rgba(60,24,6,0)');
    g.addColorStop(1, 'rgba(60,24,6,0.2)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 80, y - 450, 160, 200);
    const tg = ctx.createLinearGradient(0, y - 445, 0, y - 400);
    tg.addColorStop(0, 'rgba(40,14,4,0.5)');
    tg.addColorStop(1, 'rgba(40,14,4,0)');
    ctx.fillStyle = tg;
    ctx.fillRect(x - 80, y - 450, 160, 50);
  });
  bounce(ctx, blade, x - 60, y - 340, [TN.oven.x, y - 300], '#ff8a3a', 0.35, 8);
}

/** The lamps' light in the air: their cones and the glow under each shade (painted into the base, so the lamps
 * themselves can swing on their cords while the light stays put). */
function lampLight(ctx: Ctx, r: R): void {
  for (const lx of TN.lamps) {
    shaft(ctx, r, [lx - 70, TN.lampY + 4, lx + 70, TN.lampY + 4], [lx - 250, TN.wainscot, lx + 250, TN.wainscot], '#ffe2a8', 0.08, { streaks: 4, motes: 22 });
    lightPool(ctx, lx, TN.lampY + 6, 110, 40, '#ffd890', 0.55);
    lightPool(ctx, lx, TN.lampY + 4, 40, 18, '#ffffff', 0.6);
  }
}

function table(ctx: Ctx, r: R): void {
  checkerCloth(ctx, r, TN.front, '#efe0c0', '#b2302a', { cell: 0.2, off: 0.1 });
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, TN.front - TY + 4);
  ctx.clip();
  for (const lx of TN.lamps) lightPool(ctx, lx, 870, 460, 130, '#ffd890', 0.3);
  lightPool(ctx, TN.candle.x, TN.candle.y + 10, 200, 50, '#ffb04a', 0.18);
  lightPool(ctx, 160, 800, 420, 120, '#ff8a3a', 0.24);
  // the cloth's weave catching the light along the back edge
  vfill(ctx, 0, TY, W, 24, [[0, 'rgba(30,10,4,0.22)'], [1, 'rgba(30,10,4,0)']]);
  // its weave, close up
  grain(ctx, { x: 0, y: TY, w: W, h: TN.front - TY }, 'canvas', 0.22, 1.2);
  // it doesn't lie quite flat: broad soft swells catch the light, the hollows between them a shade darker
  lay(ctx, drift('#fff2dc', '#3a0c06', 5, 77, 192, 40), { x: 0, y: TY, w: W, h: TN.front - TY }, 0.14, 'soft-light');
  lay(ctx, drift('#fff2dc', '#3a0c06', 14, 79, 256, 48), { x: 0, y: TY, w: W, h: TN.front - TY }, 0.1, 'soft-light');
  // creases where it was folded and pressed: a soft ridge, lit on its far side, shaded on its near side
  for (const cy of [842, 950]) {
    vfill(ctx, 0, cy - 5, W, 10, [[0, 'rgba(255,240,220,0)'], [0.45, 'rgba(255,240,220,0.07)'], [0.55, 'rgba(40,10,4,0.07)'], [1, 'rgba(40,10,4,0)']]);
  }
  // wear where no pizza sits: flour dusted at the oven's end, a wine ring by the fiasco
  softly(ctx, { x: 0, y: TY, w: 420, h: 120 }, (g) => {
    g.fillStyle = 'rgba(255,248,236,0.22)';
    g.beginPath();
    g.ellipse(150, TY + 46, 150, 26, -0.05, 0, P2);
    g.fill();
  }, 0.25);
  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = rgba('#fffaf0', 0.2 + r() * 0.3);
    ctx.fillRect(20 + r() * 300, TY + 20 + r() * 56, 1 + r() * 1.5, 1);
  }
  ctx.strokeStyle = 'rgba(110,20,30,0.22)';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.ellipse(1690, TY + 52, 26, 8, 0, 0.3, P2 - 0.2);
  ctx.stroke();
  ctx.restore();

  tableFalloff(ctx, TN.front, 0.42, '#1a0804');
  tableSeam(ctx, 0.55, '#2a1810', false);
  clothDrape(ctx, TN.front, '#efe0c0', '#b2302a', 0.2, 0.1);
}

/** The last of the evening sun through the window: a shaft in the air and its patch on the cloth, cut by the
 * glazing bars (live, it fades as the street darkens). Plain alpha: it's baked to a sprite. */
const EVE_BOX = { x: TN.win.x0 - 40, y: TN.win.archY - 20, w: 520, h: 500 };

function eveLight(ctx: Ctx): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(EVE_BOX.x, EVE_BOX.y, EVE_BOX.w, EVE_BOX.h);
  ctx.clip();
  // the shaft, from the glass down and out into the room, widening; faded out at its edges and ends
  softly(ctx, EVE_BOX, (g) => {
    g.fillStyle = 'rgba(255,200,140,0.07)';
    g.beginPath();
    g.moveTo(TN.win.x0 + 30, TN.win.archY + 10);
    g.lineTo(TN.win.x1 - 10, TN.win.archY + 10);
    g.lineTo(TN.win.x1 + 140, TY + 120);
    g.lineTo(TN.win.x0 + 60, TY + 120);
    g.closePath();
    g.fill();
  }, 0.125);
  lightPatch(ctx, [[TN.win.x0 + 20, TY + 4], [TN.win.x1 - 10, TY + 4], [TN.win.x1 + 120, 900], [TN.win.x0 + 60, 900]], { col: '#ffc890', a: 0.18, barsU: [0.5], barsV: [0.5], bar: 0.04, soft: 10, fade: 0.6, op: 'source-over' });
  ctx.restore();
}

function tableProps(ctx: Ctx, r: R): void {
  const { x, y } = TN.candle;
  bottle(ctx, x, y, 104, '#3a5a2a', { kind: 'flask', straw: true, depth: 0.05 });
  // years of candles: wax run down the neck and over the straw in coloured layers
  within(ctx, rrPath(x - 15, y - 110, 30, 50, 4), () => {
    const waxes = ['rgba(240,226,200,0.92)', 'rgba(200,60,50,0.8)', 'rgba(240,226,200,0.92)', 'rgba(230,200,120,0.85)'];
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = waxes[i % waxes.length];
      const wx = x - 13 + i * 5;
      const len = 14 + r() * 28;
      ctx.beginPath();
      ctx.roundRect(wx, y - 110, 4, len, 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(wx + 2, y - 110 + len, 2.6, 0, P2);
      ctx.fill();
    }
  });
  // the candle in its neck
  const ch = 44;
  const cw = ch * 0.34;
  const cp = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x - cw / 2, y - 104);
    c.lineTo(x - cw / 2, y - 104 - ch + 3);
    c.quadraticCurveTo(x, y - 104 - ch - 3, x + cw / 2, y - 104 - ch + 3);
    c.lineTo(x + cw / 2, y - 104);
    c.closePath();
  };
  solid(ctx, cp, { x: x - cw / 2, y: y - 104 - ch, w: cw, h: ch }, 'plastic', '#f2e6cc', { line: 2, form: 0.4, formSize: cw * 0.3, spec: false });
  within(ctx, cp, () => {
    // the wax lit through from the flame at its top
    vfill(ctx, x - cw / 2, y - 104 - ch, cw, 16, [[0, 'rgba(255,200,120,0.55)'], [1, 'rgba(255,200,120,0)']]);
  });
  ctx.strokeStyle = '#2a1408';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y - 104 - ch);
  ctx.lineTo(x + 1, y - 104 - ch - 6);
  ctx.stroke();
  bottle(ctx, 1862, y - 2, 70, '#c8a02a', { kind: 'oil', cork: '#2a1a10', depth: 0.05 });
  const mx = 1728;
  const mill = (c: Ctx) => {
    c.beginPath();
    c.moveTo(mx - 10, y);
    c.lineTo(mx - 12, y - 36);
    c.quadraticCurveTo(mx - 18, y - 52, mx - 4, y - 66);
    c.lineTo(mx + 4, y - 66);
    c.quadraticCurveTo(mx + 18, y - 52, mx + 12, y - 36);
    c.lineTo(mx + 10, y);
    c.closePath();
  };
  castShadow(ctx, mill, 8, 6, 0.35);
  solid(ctx, mill, { x: mx - 18, y: y - 70, w: 36, h: 70 }, 'wood', '#5a3018', { depth: 0.05, formSize: 8 });
  within(ctx, mill, () => {
    woodGrain(ctx, r, { x: mx - 18, y: y - 70, w: 36, h: 70 }, '#5a3018', true, 0.6);
    ctx.fillStyle = 'rgba(255,220,170,0.25)';
    ctx.fillRect(mx - 18, y - 38, 36, 2);
  });
  ctx.fillStyle = '#c8a050';
  ctx.beginPath();
  ctx.arc(mx, y - 69, 3, 0, P2);
  ctx.fill();
  ao(ctx, 1800, y + 2, 110, 9, 0.4);
  // the candle's warmth on the cloth and the glass beside it
  lightPool(ctx, x, y - 70, 60, 60, '#ffb04a', 0.12);
}

/** One frame of a candle flame (phase 0…1 loops) in a w×h frame, its wick at (w/2, h - 2): a single teardrop that
 * stretches and shrinks and leans on the air, a blue root at the wick, a white-hot core, a soft halo. */
function candleFrame(c: Ctx, w: number, h: number, ph: number): void {
  const bx = w / 2;
  const by = h - 2;
  const S = (f: number, s: number) => Math.sin(P2 * ph * f + s);
  const tall = h * (0.78 + 0.1 * S(1, 0) + 0.06 * S(3, 1.1) + 0.03 * S(5, 2));
  const lean = w * (0.06 * S(1, 2.2) + 0.04 * S(2, 0.4));
  const wide = w * (0.2 + 0.02 * S(2, 1.7));
  const drop = (k: number) => {
    const hh = tall * k;
    const ww = wide * (0.55 + k * 0.45);
    const tx = bx + lean * k;
    c.beginPath();
    c.moveTo(tx, by - hh);
    c.bezierCurveTo(tx + ww * 0.25, by - hh * 0.62, bx + ww, by - hh * 0.3, bx + ww * 0.82, by - hh * 0.1);
    c.quadraticCurveTo(bx, by + ww * 0.55, bx - ww * 0.82, by - hh * 0.1);
    c.bezierCurveTo(bx - ww, by - hh * 0.3, tx - ww * 0.25, by - hh * 0.62, tx, by - hh);
    c.closePath();
  };
  c.save();
  c.globalCompositeOperation = 'lighter';
  const halo = c.createRadialGradient(bx, by - tall * 0.45, 0, bx, by - tall * 0.45, h * 0.55);
  halo.addColorStop(0, 'rgba(255,170,80,0.28)');
  halo.addColorStop(1, 'rgba(255,170,80,0)');
  c.fillStyle = halo;
  c.fillRect(0, 0, w, h);
  for (const [k, col, a] of [[1, '#ff7a1a', 0.8], [0.8, '#ffc23a', 0.85], [0.5, '#fff6d8', 0.95]] as [number, string, number][]) {
    drop(k);
    const g = c.createLinearGradient(0, by - tall * k, 0, by);
    g.addColorStop(0, rgba(col, a * 0.5));
    g.addColorStop(0.4, rgba(col, a));
    g.addColorStop(1, rgba(col, a * 0.8));
    c.fillStyle = g;
    c.fill();
  }
  // the blue root where the flame meets the wick
  c.fillStyle = 'rgba(90,120,255,0.5)';
  c.beginPath();
  c.ellipse(bx, by - 2, wide * 0.5, wide * 0.35, 0, 0, P2);
  c.fill();
  c.restore();
}

/** The candle flames, painted (live: their frames play). */
const CANDLE_TIP = { x: TN.candle.x, y: TN.candle.y - 104 - 44 - 2 };
const VOTIVE_TIP = { x: TN.votive.x, y: TN.votive.y - 12 };

function candleFlames(ctx: Ctx): void {
  lightPool(ctx, CANDLE_TIP.x, CANDLE_TIP.y - 12, 130, 120, '#ffb04a', 0.3);
  ctx.save();
  ctx.translate(CANDLE_TIP.x - 12, CANDLE_TIP.y - 42);
  candleFrame(ctx, 24, 46, 0);
  ctx.restore();
  ctx.save();
  ctx.translate(VOTIVE_TIP.x - 7, VOTIVE_TIP.y - 22);
  candleFrame(ctx, 14, 24, 0.5);
  ctx.restore();
}

function grade(ctx: Ctx): void {
  gradeAll(ctx, 0.06, '#ffb070', 0.08, { warm: '#ffbe72', cool: '#4e66b8', a: 0.24 });
}

function shadeOver(ctx: Ctx): void {
  calmLanes(ctx, 0.14, '#2a140a');
  vignetteAll(ctx, 0.7, '#1a0804');
  vfill(ctx, 0, 0, W, 150, [[0, 'rgba(14,6,2,0.32)'], [1, 'rgba(14,6,2,0)']]);
}

// ——— the scene ———

const CURTAIN_BOX = { x: TN.win.x0 - 16, y: CUR.top - 4, w: TN.win.x1 - TN.win.x0 + 32, h: TN.win.sill - CUR.top + 24 };
const LAMP_BOX = (lx: number) => ({ x: lx - 120, y: TN.beam - 6, w: 240, h: TN.lampY - TN.beam + 70 });
const NEON_Z = neonZBox();

export const TRATTORIA: SceneSpec = {
  id: 'trattoria',
  info: {
    name: 'Trattoria Nonna',
    subtitle: 'Waves 1–4',
    ambient: ['dust'],
    glows: [
      { x: TN.oven.x, y: TN.oven.mouthY - 40, r: 230, color: '#ff7a1a', flicker: 0.75 },
      { x: TN.lamps[0], y: TN.lampY + 4, r: 170, color: '#ffcf80', flicker: 0.12 },
      { x: TN.lamps[1], y: TN.lampY + 4, r: 170, color: '#ffcf80', flicker: 0.12 },
      { x: TN.neon.x, y: TN.neon.y, r: 360, color: '#ff4fa3', flicker: 0.2 },
    ],
    light: '#ffd9a0',
    tableTint: '#fff2e0',
  },
  layers: [
    { id: 'wall', box: { x: 0, y: 0, w: W, h: TN.wainscot + 20 }, draw: wall },
    { id: 'wainscot', box: { x: 0, y: TN.wainscot - 40, w: W, h: TY - TN.wainscot + 44 }, draw: wainscot },
    { id: 'light', box: { x: 330, y: TN.lampY - 20, w: 1270, h: TN.wainscot - TN.lampY + 40 }, draw: lampLight },
    { id: 'neon', box: { x: TN.neon.x - 360, y: TN.beam - 10, w: 740, h: 330 }, draw: neon },
    // the Z unlit, shown while it stutters
    { id: 'neonZ', box: NEON_Z, liveOnly: true, draw: neonZOff },
    { id: 'oven', box: { x: 0, y: 0, w: 580, h: TY + 4 }, draw: oven },
    { id: 'ovenInner', box: { x: FIRE.x, y: FIRE.y, w: FIRE.w, h: FIRE.h }, draw: ovenInner },
    { id: 'ovenFire', box: { x: FIRE.x, y: FIRE.y, w: FIRE.w, h: FIRE.h }, stillOnly: true, draw: ovenFireStill },
    // the fire's frames, inside the mouth (the brick arch is in front)
    { id: 'ovenFireLive', box: { x: FIRE.x, y: FIRE.y, w: FIRE.w, h: FIRE.h }, motion: 'slot', draw: () => {} },
    { id: 'ovenFront', box: { x: TN.oven.x - 170, y: TN.oven.archTop - 50, w: 340, h: TN.oven.mouthY - TN.oven.archTop + 90 }, draw: ovenFront },
    { id: 'peel', box: { x: TN.peel.x - 120, y: TN.peel.y - 480, w: 230, h: TY - TN.peel.y + 480 }, draw: peel },
    { id: 'shelf', box: { x: TN.shelf.x0 - 30, y: TN.shelf.y - 110, w: TN.shelf.x1 - TN.shelf.x0 + 70, h: 200 }, draw: shelf },
    { id: 'garlic', box: GARLIC_BOX, motion: 'sprite', draw: garlic },
    { id: 'ristra', box: RISTRA_BOX, motion: 'sprite', draw: ristra },
    { id: 'board', box: { x: TN.board.x - 20, y: TN.board.y - 20, w: TN.board.w + 70, h: TN.board.h + 70 }, draw: chalkboard },
    { id: 'shutters', box: { x: TN.win.x0 - 100, y: TN.win.top, w: TN.win.x1 - TN.win.x0 + 200, h: TN.win.sill - TN.win.top + 20 }, draw: shutters },
    // (the sign hangs a little over the left shutter's edge)
    { id: 'signNail', box: { x: TN.sign.x - 6, y: TN.sign.y - 127, w: 12, h: 12 }, draw: signNail },
    { id: 'sign', box: SIGN_BOX, motion: 'sprite', draw: (c) => sign(c) },
    { id: 'street', box: WIN_BOX, draw: (c, r) => street(c, r, 0) },
    { id: 'streetDusk', box: WIN_BOX, liveOnly: true, draw: (c, r) => street(c, r, 1) },
    { id: 'streetNight', box: WIN_BOX, liveOnly: true, draw: (c, r) => street(c, r, 2) },
    { id: 'streetLife', box: WIN_BOX, motion: 'slot', draw: () => {} },
    { id: 'window', box: { x: TN.win.x0 - 40, y: TN.win.top - 30, w: TN.win.x1 - TN.win.x0 + 104, h: TN.win.sill - TN.win.top + 66 }, draw: windowFrame },
    { id: 'curtains', box: CURTAIN_BOX, stillOnly: true, draw: curtainsStill },
    { id: 'curtainsLive', box: CURTAIN_BOX, motion: 'slot', draw: () => {} },
    { id: 'sillThings', box: { x: TN.win.x0, y: TN.win.sill - 80, w: TN.votive.x - TN.win.x0 + 30, h: 96 }, draw: sillThings },
    { id: 'curtainRod', box: { x: TN.win.x0 - 30, y: CUR.top - 14, w: TN.win.x1 - TN.win.x0 + 60, h: 22 }, draw: curtainRod },
    { id: 'lampL', box: LAMP_BOX(TN.lamps[0]), motion: 'sprite', draw: (c) => pendantLamp(c, TN.lamps[0], TN.beam - 2, TN.lampY, '#2f6a46', { lit: 1, glow: false }) },
    { id: 'lampR', box: LAMP_BOX(TN.lamps[1]), motion: 'sprite', draw: (c) => pendantLamp(c, TN.lamps[1], TN.beam - 2, TN.lampY, '#2f6a46', { lit: 1, glow: false }) },
    { id: 'table', box: { x: 0, y: TY, w: W, h: 1080 - TY }, draw: table },
    { id: 'eveLight', box: EVE_BOX, motion: 'sprite', res: 0.5, draw: eveLight },
    { id: 'tableProps', box: { x: 1640, y: TY - 120, w: 280, h: 170 }, draw: tableProps },
    { id: 'candles', stillOnly: true, draw: candleFlames },
    // flames, smoke, sparks and glows: over everything
    { id: 'fx', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

// ——— live ———

/** Paint a frame in screen coordinates (its box), graded as the still is, into a sheet's frame. */
function graded(c: Ctx, b: { x: number; y: number; w: number; h: number }, paint: (g: Ctx) => void): void {
  const [cv, g] = makeCanvas(b.w, b.h);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.translate(-b.x, -b.y);
  paint(g);
  grade(g);
  c.drawImage(cv, 0, 0);
}

const HEAT = { w: 200, h: 170, n: 12 };

/** One frame of the heat over the oven's mouth (phase 0…1 loops): faint ribbons of brighter air wavering up. */
function heatFrame(c: Ctx, ph: number): void {
  for (let j = 0; j < 7; j++) {
    const x0 = 16 + j * 28;
    const pts: [number, number][] = [];
    for (let y = HEAT.h; y >= 0; y -= 4) pts.push([x0 + 5 * Math.sin(y * 0.07 - P2 * ph * 2 + j * 1.3) + 3 * Math.sin(y * 0.13 + P2 * ph + j) + (HEAT.h - y) * 0.06, y]);
    const g = c.createLinearGradient(0, HEAT.h, 0, 0);
    g.addColorStop(0, 'rgba(255,216,160,0)');
    g.addColorStop(0.35, 'rgba(255,216,160,0.1)');
    g.addColorStop(0.7, 'rgba(255,216,160,0.04)');
    g.addColorStop(1, 'rgba(255,216,160,0)');
    c.strokeStyle = g;
    for (const [lw, k] of [[8, 1], [1.6, 2]] as const) {
      c.lineWidth = lw;
      c.globalAlpha = k === 1 ? 1 : 1.6;
      c.beginPath();
      pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.stroke();
    }
    c.globalAlpha = 1;
  }
}

const tintOf = (a: number, b: number, t: number): number => {
  const ch = (s: number) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};

registerKitScene(TRATTORIA, (k, wave0) => {
  const o = TN.oven;
  const fx = k.slot('fx');
  let kw = waveK(wave0);
  let shown = kw;
  const flashes = () => save.settings.flashes && !save.settings.reducedMotion;
  // the room warming as the street darkens (multiplied over the wall, under the lights)
  const warm = k.sc.add.rectangle(W / 2, TY / 2, W, TY, 0xffb47a).setBlendMode(Phaser.BlendModes.MULTIPLY).setAlpha(0);
  fx.add(warm);

  // ——— the oven: the fire's frames, the coals' glow, heat and smoke over the mouth, sparks up the draught
  const fireSlot = k.slot('ovenFireLive');
  const FR = 0.75;
  const fireKey = sheet(k, 'tr_fire', FIRE.w * FR, FIRE.h * FR, FIRE.n, (c, ph) => {
    c.scale(FR, FR);
    fireFrame(c, ph);
  });
  const fire = new Loop(k, fireKey, FIRE.n, FIRE.x, FIRE.y, { into: fireSlot, add: true, origin: [0, 0], fps: 11, scale: 1 / FR });
  const bedGlow = k.glow(o.x - 40, o.mouthY - 34, 130, 0xff6a1a, 0.35, { into: fireSlot, sy: 0.7 });
  const flareGlow = k.glow(o.x - 20, o.mouthY - 60, 150, 0xffa040, 0, { into: fireSlot });
  let flare = 0;
  const heatKey = sheet(k, 'tr_heat', HEAT.w / 2, HEAT.h / 2, HEAT.n, (c, ph) => {
    c.scale(0.5, 0.5);
    heatFrame(c, ph);
  });
  const heat = new Loop(k, heatKey, HEAT.n, o.x - 6, o.archTop + 34, { into: fx, add: true, origin: [0.5, 1], fps: 7, scale: 2 });
  const SMW = 200;
  const SMH = 320;
  const smokeKey = sheet(k, 'tr_smoke', SMW / 2, SMH / 2, 14, (c, ph) => {
    c.scale(0.5, 0.5);
    steamFrame(c, SMW, SMH, ph, { a: 0.3, lit: '#d8b8a0', body: '#6a5448', shade: '#2a1a14', lean: 0.25, seed: 3, n: 7 });
  });
  const smoke = new Loop(k, smokeKey, 14, o.x + 6, o.archTop + 22, { into: fx, origin: [0.5, 1], scale: 2, fps: 5 });
  const roomFire = k.glow(o.x + 60, 520, 440, 0xff7a2a, 0.08, { into: fx, sy: 0.8 });
  const sparks = new Parts(k, { frame: 'ember', add: true, into: fx, max: 80 });
  const sparkRate = new Rate();
  const ember = (burst: number) => {
    // kicked out of the mouth: they arc onto the ledge and bounce, cooling
    sparks.spawn({
      x: o.x - 80 + crand() * 130, y: o.mouthY - 14 - crand() * 20, vx: (crand() - 0.35) * 200 * burst, vy: -120 - crand() * 200 * burst,
      life: 1.2 + crand() * 1, r0: 3.6, r1: 1.4, a: 1, tint: crand() < 0.5 ? 0xffb040 : 0xff7020, grav: 760, drag: 0.4,
      floor: o.mouthY + 2 + crand() * 14, bounce: 0.35, streak: 0.012, fade: 0.05,
    });
  };

  // ——— candles: the fiasco on the table and the votive on the sill, painted flames in frames
  const cKey = sheet(k, 'tr_candle', 24, 46, 12, (c, ph) => candleFrame(c, 24, 46, ph));
  const cFlame = new Loop(k, cKey, 12, CANDLE_TIP.x, CANDLE_TIP.y + 4, { into: fx, add: true, origin: [0.5, 1], fps: 12 });
  const cHalo = k.glow(CANDLE_TIP.x, CANDLE_TIP.y - 12, 110, 0xffb04a, 0.3, { into: fx });
  const vKey = sheet(k, 'tr_votive', 14, 24, 12, (c, ph) => candleFrame(c, 14, 24, ph));
  const vFlame = new Loop(k, vKey, 12, VOTIVE_TIP.x, VOTIVE_TIP.y + 2, { into: fx, add: true, origin: [0.5, 1], fps: 13, phase: 6 });
  const vHalo = k.glow(VOTIVE_TIP.x, VOTIVE_TIP.y - 4, 50, 0xff6a50, 0.2, { into: fx });

  // ——— the café curtains: painted frames of the cloth stirring; gusts (and stomps) hurry them
  const curSlot = k.slot('curtainsLive');
  const curtains = [-1, 1].map((side) => {
    const b = curBox(side);
    const CR = 0.85;
    const key = sheet(k, `tr_curtain${side < 0 ? 'L' : 'R'}`, b.w * CR, b.h * CR, CUR.frames, (c, ph) => {
      c.scale(CR, CR);
      graded(c, b, (g) => curtain(g, side, ph));
    });
    return new Loop(k, key, CUR.frames, b.x, b.y, { into: curSlot, origin: [0, 0], fps: 4, phase: side < 0 ? 0 : 5, scale: 1 / CR });
  });
  let gust = 0;

  // ——— things that hang: the lamps on their cords, the garlic and chillies, the NO FEET sign on its nail
  const lamps = TN.lamps.map((lx, i) => new Swing(k.pivot(k.sprite(i ? 'lampR' : 'lampL'), lx, TN.beam), { k: 5, c: 0.5, idle: 0.006, seed: i * 2.3, speed: 0.6 }));
  const garlicS = new Swing(k.pivot(k.sprite('garlic'), GARLIC.x, GARLIC.y), { k: 9, c: 0.9, idle: 0.004, seed: 4 });
  const ristraS = new Swing(k.pivot(k.sprite('ristra'), RISTRA.x, RISTRA.y), { k: 7, c: 0.8, idle: 0.005, seed: 5 });
  const signS = new Swing(k.pivot(k.sprite('sign'), TN.sign.x, TN.sign.y - 121), { k: 14, c: 2.4, idle: 0, seed: 6 });
  const lampHalo = TN.lamps.map((lx) => k.glow(lx, TN.lampY + 30, 230, 0xffcf80, 0.04, { into: fx, sy: 0.8 }));
  // as night falls: the room's corners go dark (multiplied), so the lamps' cones, the candle's pool on the cloth and
  // the neon carry the room; the window's glass catches the room's light
  const shadeKey = k.tex('tr_nightshade', 128, 72, (c) => {
    const g = c.createRadialGradient(64, 30, 10, 64, 34, 84);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.55, '#f0dcc8');
    g.addColorStop(1, '#8a6a5a');
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 72);
  });
  const nightShade = k.img(shadeKey, 0, 0, { into: fx, origin: [0, 0], alpha: 0 }).setDisplaySize(W, 1080).setBlendMode(Phaser.BlendModes.MULTIPLY);
  fx.moveAbove<Phaser.GameObjects.GameObject>(nightShade, warm);
  const coneKey = k.tex('tr_cone', 64, 128, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(22, 0);
    c.lineTo(42, 0);
    c.lineTo(64, 128);
    c.lineTo(0, 128);
    c.closePath();
    c.fill();
  });
  const cones = TN.lamps.map((lx) => {
    const im = k.img(coneKey, lx, TN.lampY + 4, { into: fx, add: true, origin: [0.5, 0], tint: 0xffd08a, alpha: 0 });
    im.setDisplaySize(520, TY - TN.lampY + 60);
    return im;
  });
  const candlePool = k.glow(TN.candle.x - 10, TN.candle.y + 6, 200, 0xffa040, 0.05, { into: fx, sy: 0.3 });
  const winGlow = k.glow(winCX, (TN.win.top + TN.win.sill) / 2 + 20, 150, 0xffc890, 0, { into: fx, sy: 1.3 });
  // the golden evening coming in at the window (it fades with the light)
  const sunGlow = k.glow(winCX + 40, 600, 420, 0xffb060, 0.16, { into: fx, sy: 0.7 });

  // ——— the neon: a faint buzz in its light on the wall; the Z stutters now and then
  const washKey = k.tex('tr_neonwash', 256, 128, (c) => {
    const g = c.createRadialGradient(128, 64, 0, 128, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.4)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.setTransform(2, 0, 0, 1, 0, 0);
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 128);
  });
  const neonWash = k.img(washKey, TN.neon.x, TN.neon.y + 40, { into: fx, add: true, tint: 0xff4fa3, alpha: 0.05 }).setDisplaySize(1400, 640);
  const neonBloom = k.glow(TN.neon.x, TN.neon.y, 420, 0xff4fa3, 0.04, { into: fx, sy: 0.42 });
  const zOff = k.sprite('neonZ');
  const neonDim = k.sc.add.rectangle(TN.neon.x, TN.neon.y - 4, 660, 236, 0x584050).setBlendMode(Phaser.BlendModes.MULTIPLY).setAlpha(0);
  fx.add(neonDim);
  let bossDim = 0;
  let stutter = 0;
  let nextBuzz = 6 + crand() * 8;

  // ——— dust: turning in the lamps' light; sifting down from the beam when the room shakes
  for (const lx of TN.lamps)
    k.emitter('soft', {
      x: { min: lx - 150, max: lx + 150 }, y: { min: TN.lampY + 30, max: TN.wainscot - 30 }, lifespan: 7000, frequency: 1100,
      speedX: { min: -6, max: 6 }, speedY: { min: -6, max: 4 }, scale: { min: 0.03, max: 0.05 },
      alpha: { values: [0, 0.45, 0] }, tint: 0xfff0c8, blendMode: 'ADD',
    }, 6000, fx);
  const dust = new Parts(k, { frame: 'mote', into: fx, max: 70 });

  // ——— the street: night falls over the stage; people and scooters go by on their walk and ride cycles
  const dusk = k.sprite('streetDusk');
  const night = k.sprite('streetNight');
  const eve = k.sprite('eveLight');
  const life = k.slot('streetLife');
  const kinds: Kind[] = ['man', 'woman', 'nonna', 'delivery'];
  const walkKeys = kinds.map((kd) => sheet(k, `tr_walk_${kd}`, WK.w, WK.h, WK.n, (c, ph) => walkerFrame(c, kd, ph)));
  const scootKey = sheet(k, 'tr_scooter', SC.w, SC.h, SC.n, (c, ph) => scooterFrame(c, ph));
  type Passer = { img: Phaser.GameObjects.Image; v: number; dist: number; cycle: number; n: number; lamp?: Phaser.GameObjects.Image };
  const passers: Passer[] = [];
  let nextPass = 1.5 + crand() * 3;
  let lastKind = -1;
  const pass = () => {
    const scooter = crand() < 0.3;
    const dir = passers.length ? -Math.sign(passers[0].v) : crand() < 0.5 ? 1 : -1;
    const x = dir > 0 ? TN.win.x0 - 40 : TN.win.x1 + 40;
    if (scooter) {
      const img = k.img(scootKey, x, TN.street.ride, { into: life, origin: [0.5, SC.ground / SC.h], scale: SC.scale }).setFlipX(dir < 0);
      const lamp = k.glow(x, TN.street.ride - 26, 34, 0xfff0b0, 0, { into: life });
      passers.push({ img, v: dir * SC.speed, dist: 0, cycle: SC.cycle, n: SC.n, lamp });
    } else {
      let i = Math.floor(crand() * kinds.length) % kinds.length;
      if (i === lastKind) i = (i + 1) % kinds.length;
      lastKind = i;
      const L = LOOKS[kinds[i]];
      const img = k.img(walkKeys[i], x, TN.street.walk, { into: life, origin: [0.5, WK.ground / WK.h], scale: WK.scale }).setFlipX(dir < 0);
      passers.push({ img, v: dir * L.speed * (0.9 + crand() * 0.2), dist: crand() * L.cycle, cycle: L.cycle, n: WK.n });
    }
  };

  // ——— a tray clanging down in a fight here: the oven flares, the lamps jump, the neon flickers
  const onClang = (x: number, _y: number, p = 1) => {
    flare = Math.min(1.4, flare + 0.8 * p);
    for (let i = 0; i < 6 + 8 * p; i++) ember(0.8 + p * 0.4);
    for (const l of lamps) l.kick((crand() - 0.5) * 0.25 * p);
    signS.kick((x < TN.sign.x ? 1 : -1) * 0.4 * p);
    if (p >= 1 && flashes() && crand() < 0.5) stutter = 0.5;
  };
  const ev = k.sc.events;
  const unlisten = () => ev.off('tray-clang', onClang);
  ev.on('tray-clang', onClang);
  ev.once(Phaser.Scenes.Events.SHUTDOWN, unlisten);

  return {
    setWave: (w) => (kw = waveK(w)),
    impact(x, _y, power) {
      const near = (hx: number, reach = 600) => Math.max(0.25, 1 - Math.abs(x - hx) / reach);
      for (const [i, l] of lamps.entries()) l.kick((x < TN.lamps[i] ? 1 : -1) * 0.18 * power * near(TN.lamps[i]));
      garlicS.kick((x < GARLIC.x ? 1 : -1) * 2.2 * power * near(GARLIC.x, 900));
      ristraS.kick((x < RISTRA.x ? 1 : -1) * 2.4 * power * near(RISTRA.x, 900));
      signS.kick((x < TN.sign.x ? 1 : -1) * 0.5 * power * near(TN.sign.x));
      gust = Math.min(1.5, gust + power * 0.9);
      for (let i = 0; i < 4 + power * 14; i++)
        dust.spawn({ x: x + (crand() - 0.5) * 500, y: TN.beam + 30 + crand() * 10, vx: (crand() - 0.5) * 10, vy: 10 + crand() * 30, life: 2.5 + crand() * 2, r0: 1.6 + crand() * 1.4, a: 0.5, tint: 0xe8d4b8, grav: 18, drag: 1.2, fade: 0.1 });
      const ov = near(o.x, 700);
      if (ov > 0.3) {
        flare = Math.min(1.5, flare + power * 0.9 * ov);
        for (let i = 0; i < (5 + power * 16) * ov; i++) ember(0.7 + power * 0.7);
      }
      if (power > 0.75 && flashes()) stutter = Math.max(stutter, 0.35);
    },
    update(dt, t) {
      shown += (kw - shown) * Math.min(1, dt * 0.6);
      flare = Math.max(0, flare - dt * 0.9);
      // ——— the fire
      const fn = flicker(t, 1.3);
      fire.step(dt, 1 + flare * 0.9);
      fire.alpha = Math.min(1, 0.88 + fn * 0.1);
      bedGlow.setAlpha(0.3 + fn * 0.12 + flare * 0.2);
      flareGlow.setAlpha(flare * 0.55);
      roomFire.setAlpha((0.05 + fn * 0.035) * (1 + shown * 0.8) + flare * 0.16);
      heat.step(dt, 1 + flare);
      heat.alpha = 0.55 + flare * 0.3;
      smoke.step(dt);
      smoke.alpha = 0.6;
      smoke.each((im) => im.setRotation(Math.sin(t * 0.3) * 0.05 + 0.04));
      sparkRate.tick((1.6 + flare * 14) * calm(), dt, () =>
        sparks.spawn({ x: o.x - 70 + crand() * 100, y: o.archTop + 50 + crand() * 30, vx: 10 + crand() * 40, vy: -50 - crand() * 60 - flare * 60, life: 1.4 + crand() * 1.2, r0: 2, r1: 0.6, a: 0.9, tint: crand() < 0.6 ? 0xffb040 : 0xff8020, grav: -30, drag: 0.6, streak: 0.02, fade: 0.1 }),
      );
      sparks.update(dt);
      // ——— candles, brighter as night falls
      const cn = flicker(t * 0.8, 7.7);
      cFlame.step(dt);
      cFlame.each((im) => im.setRotation(wander(t, 3, 0.7) * 0.08 * calm()));
      cHalo.setAlpha((0.24 + cn * 0.08) * (0.8 + shown * 0.6));
      vFlame.step(dt);
      vHalo.setAlpha((0.14 + flicker(t, 2.2) * 0.06) * (0.7 + shown * 0.9));
      // ——— curtains: the draught comes and goes
      gust = Math.max(0, gust - dt * 0.5);
      const draught = 0.55 + 0.35 * (0.5 + 0.5 * wander(t, 2, 0.25)) + gust * 1.6;
      for (const c of curtains) c.step(dt * calm(), draught);
      // ——— hanging things
      for (const l of lamps) l.update(dt, t);
      garlicS.update(dt, t);
      ristraS.update(dt, t);
      signS.update(dt, t);
      for (const h of lampHalo) h.setAlpha(0.03 + shown * 0.09);
      // ——— the neon
      nextBuzz -= dt;
      if (nextBuzz < 0) {
        if (flashes()) stutter = 0.6 + crand() * 0.5;
        nextBuzz = 8 + crand() * 12;
      }
      stutter = Math.max(0, stutter - dt);
      const zDark = stutter > 0 && Math.sin(t * 31 + Math.sin(t * 7) * 2) > -0.2;
      zOff.setAlpha(zDark ? 1 : 0);
      // (while a boss's bar is up, the neon behind its title dims, so the title reads)
      const sc = k.sc as unknown as { miniFoot?: { alive: boolean } | null; bossFoot?: { alive: boolean } | null };
      const bossUp = !!(sc.miniFoot?.alive || sc.bossFoot?.alive);
      bossDim += ((bossUp ? 1 : 0) - bossDim) * Math.min(1, dt * 2);
      neonDim.setAlpha(bossDim * 0.55);
      neonWash.setAlpha((0.05 + shown * 0.13) * (zDark ? 0.82 : 1) * (1 + Math.sin(t * 2.1) * 0.03) * (1 - bossDim * 0.6));
      neonBloom.setAlpha((0.04 + shown * 0.1) * (zDark ? 0.75 : 1) * (1 - bossDim * 0.7));
      // ——— dust
      dust.update(dt);
      // ——— the light across the stage
      warm.setAlpha(shown * 0.24);
      // the street: the blue hour by the second wave, full night by the fourth
      dusk.setAlpha(Phaser.Math.Clamp((shown - 0.12) / 0.4, 0, 1));
      night.setAlpha(Phaser.Math.Clamp((shown - 0.7) / 0.28, 0, 1));
      const late = Phaser.Math.Clamp((shown - 0.55) / 0.45, 0, 1);
      eve.setAlpha(Phaser.Math.Clamp(1 - shown * 1.6, 0, 1));
      sunGlow.setAlpha(Math.max(0, 1 - shown * 2) * 0.16);
      nightShade.setAlpha(late * 0.85);
      for (const c of cones) c.setAlpha(0.02 + late * 0.14);
      candlePool.setAlpha((0.05 + shown * 0.2) * (0.9 + cn * 0.1));
      winGlow.setAlpha(late * (0.14 + bossDim * 0.1));
      // ——— the street
      nextPass -= dt;
      if (nextPass < 0 && passers.length < 2) {
        pass();
        nextPass = passers.length > 1 ? 9 + crand() * 8 : 2 + crand() * 7;
      }
      const tint = tintOf(0xe0ccc4, 0x6a70a0, Phaser.Math.Clamp(shown * 1.2, 0, 1));
      for (let i = passers.length - 1; i >= 0; i--) {
        const p = passers[i];
        p.img.x += p.v * dt;
        p.dist += Math.abs(p.v) * dt;
        p.img.setFrame(Math.floor((p.dist / p.cycle) * p.n) % p.n).setTint(tint);
        if (p.lamp) p.lamp.setPosition(p.img.x + Math.sign(p.v) * 24, TN.street.ride - 28).setAlpha(0.15 + shown * 0.7);
        if (p.img.x < TN.win.x0 - 60 || p.img.x > TN.win.x1 + 60) {
          p.img.destroy();
          p.lamp?.destroy();
          passers.splice(i, 1);
        }
      }
    },
    destroy: unlisten,
  };
});
