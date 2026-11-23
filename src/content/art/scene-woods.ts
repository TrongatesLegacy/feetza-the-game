// Moonlit Woods (Bigfoot's arena, the end of the Trattoria's stage), redrawn with the location kit (src/art/scene):
// the woods behind the trattoria, the same night. A full moon high on the left (the night's key light, where the
// feet's light comes from) over ranks of firs stepping back into the mist; through the trees on the left the back of
// the trattoria itself, its oven flue smoking against the moon, the kitchen window lit behind its café curtain and
// the back door ajar, a stack of oven wood under the window. A clearing of moss and needles, a path worn from the
// back door, and across it a line of very big footprints coming out of the trees. Two old pines frame it, their bark
// in plates; a storm lantern hangs from the right one's low limb, lighting the limb, the bark, the ground and the end
// of the table. The table is the top of an old picnic table: silver-grey boards, initials carved at one end.
//
// Live, the heroes:
// - the lantern: hung from its S-hook, it swings as a pendulum on a damped spring (a stomp sends it swinging hard),
//   the flame painted tongue by tongue at 8 phases and played cross-faded, staying upright as the lantern swings,
//   ducking at a stomp and flaring back; its light on the ground and the bark swings with it; moths (painted wing
//   beats) circle it, flung wide by a stomp;
// - the mist: painted banks of ground fog that roll (8 painted phases of every lobe swelling, lifting and thinning)
//   and drift across the clearing at two depths, lit silver on top by the moon; a stomp pushes a roll of mist out
//   along the ground from the table's back edge;
// - the canopy: the fir boughs over the top corners hang on hinges at their trunks and sway in the night air; a
//   stomp shakes them and pine cones (painted, lit) drop, bounce and roll on the table, needle sprigs flutter down.
// Also: the flue's smoke, painted, curling up past the moon; fireflies blinking at the clearing's edge.

import Phaser from 'phaser';
import { VX, xAt, yAt, zAt } from '../../art/backdrops';
import {
  type Air,
  type Box,
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
  rim,
  solid,
  vfill,
  vignetteAll,
  within,
} from '../../art/scene/kit';
import type { SceneSpec } from '../../art/scene/layers';
import { aoHalo, lightPatch } from '../../art/scene/light';
import { grain, planksPlane, tableFalloff, tableSeam, varnish } from '../../art/scene/materials';
import { drift, lay, noiseMask, softly, surface } from '../../art/scene/paint';
import { glassPane, hang } from '../../art/scene/props';
import { farLand, skyFill, stars } from '../../art/scene/sky';
import { makeCanvas, mix, rgba, shade } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { Loop, Parts, Spring, Swing, sheet } from '../../game/sceneAnim';
import { type KitLive, calm, flicker, registerKitScene, wander } from '../../game/sceneLive';
import { conifer, fireFrame, smokeFrame, treeLine } from './sceneBits';

// ——— layout ———

export const MW = {
  front: 1040,
  moon: { x: 486, y: 270, r: 64 },
  /** The far ridge's foot and the clearing's far edge (where the nearest rank of firs stands). */
  ridge: 560,
  floor: 648,
  /** The back of the trattoria through the trees. */
  tr: { x0: 150, x1: 470, eave: 552, roof: 506, base: 664 },
  flue: { x: 236, w: 34, top: 446 },
  door: { x: 196, w: 46, top: 596 },
  win: { x: 368, w: 56, top: 578, sill: 630 },
  /** The two old pines that frame the clearing (centre, width at breast height). */
  trunkL: { x: 66, w: 176 },
  trunkR: { x: 1836, w: 214 },
  /** The right pine's low limb and the lantern's S-hook on it. */
  limb: { x0: 1742, y0: 322, x1: 1532, y1: 290 },
  hook: { x: 1586, y: 304 },
  /** The fir boughs over the top corners: where each joins its trunk (its hinge). */
  boughL: { x: 104, y: 46 },
  boughR: { x: 1770, y: 118 },
};

const P2 = Math.PI * 2;
const NIGHT: Air = { color: '#34426e', far: 0.72 };
const MOON = '#dfe8ff';
const WARM = '#ffb45a';
const BARK = '#2c2830';
/** The lantern's parts, down from the hook (lantern-local px). */
const LT = { chain: 20, bail: 36, cap: 44, globe0: 52, globe1: 92, base: 104, flame: 86 };
const LANTERN_BOX: Box = { x: MW.hook.x - 44, y: MW.hook.y - 8, w: 88, h: LT.base + 24 };

// ——— the sky ———

function sky(ctx: Ctx, r: R): void {
  const box = { x: 0, y: 0, w: W, h: MW.ridge + 40 };
  skyFill(ctx, box, [[0, '#03061a'], [0.38, '#081234'], [0.72, '#162452'], [1, '#2a3a6c']]);
  lay(ctx, drift('#2e3c7a', '#02040e', 3, 211, 160, 48), box, 0.22);
  stars(ctx, r, { x: 0, y: 0, w: W, h: 470 }, 300, '#eef2ff');
  // the moon: a wide bloom in the thin haze, a tighter halo, the disc with its seas and a soft limb
  const { x, y, r: rad } = MW.moon;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (const [rr, col, a, sy] of [[rad * 13, '#3a4c90', 0.4, 0.8], [rad * 5, '#8a9ee0', 0.32, 1], [rad * 2.1, '#d8e2ff', 0.4, 1]] as const) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, sy);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rr);
    g.addColorStop(0, rgba(col, a));
    g.addColorStop(0.35, rgba(col, a * 0.45));
    g.addColorStop(0.7, rgba(col, a * 0.12));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-rr, -rr, rr * 2, rr * 2);
    ctx.restore();
  }
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, rad, 0, P2);
  ctx.clip();
  const g = ctx.createRadialGradient(x - rad * 0.25, y - rad * 0.3, rad * 0.1, x, y, rad);
  g.addColorStop(0, '#fffef8');
  g.addColorStop(0.7, '#eef0f6');
  g.addColorStop(1, '#bcc4da');
  ctx.fillStyle = g;
  ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  // the maria: soft grey seas, a few brighter ray craters
  lay(ctx, noiseMask(4, 117, { cover: 0.42, soft: 0.3, col: '#8a92ac' }), { x: x - rad, y: y - rad, w: rad * 2, h: rad * 2 }, 0.55);
  for (const [mx, my, mr] of [[-0.3, -0.15, 0.32], [0.18, 0.1, 0.26], [-0.05, 0.38, 0.18], [0.35, -0.32, 0.14]] as const) {
    const mg = ctx.createRadialGradient(x + mx * rad, y + my * rad, 0, x + mx * rad, y + my * rad, mr * rad);
    mg.addColorStop(0, 'rgba(120,128,156,0.42)');
    mg.addColorStop(1, 'rgba(120,128,156,0)');
    ctx.fillStyle = mg;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.arc(x + rad * 0.12, y + rad * 0.55, 2.2, 0, P2);
  ctx.fill();
  // the limb darkening
  const lg = ctx.createRadialGradient(x, y, rad * 0.7, x, y, rad);
  lg.addColorStop(0, 'rgba(60,70,110,0)');
  lg.addColorStop(1, 'rgba(60,70,110,0.3)');
  ctx.fillStyle = lg;
  ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  ctx.restore();
  // long soft bars of cloud low in the sky, their tops silvered where they pass under the moon
  cloudBar(ctx, r, 520, 360, 600, 34, 0.85);
  cloudBar(ctx, r, 1280, 430, 760, 30, 0.45);
}

/** A long low bar of cloud: a soft dark body, its upper edge lit by the moon (strongest nearest it), thinning to
 * wisps at its ends. */
function cloudBar(ctx: Ctx, r: R, cx: number, cy: number, w: number, h: number, a: number): void {
  const box = { x: cx - w / 2 - 40, y: cy - h * 3, w: w + 80, h: h * 6 };
  const lumps: [number, number, number][] = [];
  for (let i = 0; i < 18; i++) {
    const u = i / 17 - 0.5;
    lumps.push([cx + u * w + (r() - 0.5) * 40, cy + (r() - 0.5) * h * 0.9 - (1 - Math.abs(u) * 2) * h * 0.4, h * (0.5 + Math.max(0, 1 - Math.abs(u) * 1.8) * 0.7) * (0.7 + r() * 0.6)]);
  }
  softly(ctx, box, (g) => {
    for (const [x, y, rad] of lumps) {
      g.save();
      g.translate(x, y);
      g.scale(2.4, 1);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, rad);
      gr.addColorStop(0, rgba('#1c2856', a * 0.8));
      gr.addColorStop(1, rgba('#1c2856', 0));
      g.fillStyle = gr;
      g.fillRect(-rad, -rad, rad * 2, rad * 2);
      g.restore();
    }
    for (const [x, y, rad] of lumps) {
      const near = Math.max(0, 1 - Math.abs(x - MW.moon.x) / 700);
      g.save();
      g.translate(x - 6, y + rad * 0.4);
      g.scale(2.4, 0.5);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, rad * 0.8);
      gr.addColorStop(0, rgba('#c0ccf4', a * (0.25 + near * 0.55)));
      gr.addColorStop(1, rgba('#c0ccf4', 0));
      g.fillStyle = gr;
      g.fillRect(-rad, -rad, rad * 2, rad * 2);
      g.restore();
    }
  }, 0.5);
}

// ——— the far woods ———

function ridge(ctx: Ctx, r: R): void {
  const pts: [number, number][] = [[0, MW.ridge + 40]];
  for (let x = 0; x <= W; x += 16) {
    const y = 486 - Math.sin(x * 0.0021 + 0.6) * 34 - Math.sin(x * 0.0057 + 2.1) * 14 - Math.sin(x * 0.017) * 4 + (x > 760 && x < 1200 ? 18 : 0) * Math.sin(((x - 760) / 440) * Math.PI);
    pts.push([x, y]);
  }
  pts.push([W, MW.ridge + 40]);
  farLand(ctx, pts, MW.ridge + 40, '#18224a', 0.92, NIGHT, MOON, 0.22);
  // the ridge's own woods: a fine comb of tree tips along its top
  treeLine(ctx, r, 0, W, 520, 26, 54, '#1a2550', { depth: 0.94, air: NIGHT, mist: '#56689c', mistA: 0.45, step: 15 });
  haze(ctx, 470, 600, '#5a6ca4', 0.3, 0.7);
}

function ranks(ctx: Ctx, r: R): void {
  softly(ctx, { x: 0, y: 380, w: W, h: 240 }, (g) => treeLine(g, r, 0, W, 592, 40, 130, '#16204a', { depth: 0.84, air: NIGHT, mist: '#4e5f96', mistA: 0.55, step: 22 }), 0.5);
  haze(ctx, 560, 640, '#4a5b92', 0.3, 0.75);
  softly(ctx, { x: 0, y: 400, w: W, h: 240 }, (g) => treeLine(g, r, 0, W, 628, 70, 200, '#0f1838', { depth: 0.66, air: NIGHT, mist: '#40508a', mistA: 0.55, step: 30 }), 0.7);
  haze(ctx, 600, 664, '#40508a', 0.28, 0.8);
  // the mist under the moon glows, lit from behind
  lightPool(ctx, MW.moon.x + 80, 610, 520, 70, '#7a8cc8', 0.16, 'screen');
  treeLine(ctx, r, 0, W, MW.floor + 4, 130, 250, '#0a1228', { depth: 0.48, air: NIGHT, mist: '#33437a', mistA: 0.5, step: 48 });
}

// ——— the back of the trattoria ———

const TR_DEPTH = 0.42;
const trAir = (c: string) => airMix(c, TR_DEPTH, NIGHT);

function roofPath(): PathFn {
  const { x0, x1, eave, roof } = MW.tr;
  return (c) => {
    c.beginPath();
    c.moveTo(x0 - 22, eave + 4);
    c.lineTo(x0 + 26, roof);
    c.lineTo(x1 - 26, roof);
    c.lineTo(x1 + 22, eave + 4);
    c.closePath();
  };
}

function trattoria(ctx: Ctx, r: R): void {
  const { x0, x1, eave, roof, base } = MW.tr;
  const wallP: PathFn = (c) => {
    c.beginPath();
    c.rect(x0, eave, x1 - x0, base - eave);
  };
  // the light from the window and the door, laid on the ground in front first (the building stands in it)
  lightPatch(ctx, [[MW.win.x - 6, base], [MW.win.x + MW.win.w + 6, base], [MW.win.x + MW.win.w + 70, base + 34], [MW.win.x - 30, base + 34]], { col: '#ffb868', a: 0.32, barsU: [0.5], bar: 0.06, soft: 6, fade: 0.7 });
  lightPatch(ctx, [[MW.door.x + MW.door.w - 14, base], [MW.door.x + MW.door.w - 2, base], [MW.door.x + MW.door.w + 70, base + 40], [MW.door.x + MW.door.w + 10, base + 40]], { col: '#ffc070', a: 0.42, soft: 5, fade: 0.65 });
  groundShadow(ctx, (x0 + x1) / 2, base + 2, (x1 - x0) * 0.56, 8, 0.5, '#04060e');
  // the roof: coppi running down the slope in channels and caps, moonlight on the upper courses
  within(ctx, roofPath(), () => {
    vfill(ctx, x0 - 30, roof, x1 - x0 + 60, eave - roof + 6, [[0, trAir('#6a3a30')], [1, trAir('#4a2620')]]);
    for (let x = x0 - 30; x < x1 + 30; x += 11) {
      const cap = Math.round((x - x0) / 11) % 2 === 0;
      ctx.fillStyle = cap ? rgba(trAir('#8a4e3a'), 0.65) : 'rgba(10,6,12,0.5)';
      ctx.fillRect(x + (cap ? 1 : 3), roof, cap ? 8 : 4, eave - roof + 6);
    }
    // courses across the slope, each tile's lower lip
    for (let y = roof + 9; y < eave; y += 9) {
      ctx.fillStyle = 'rgba(8,6,12,0.32)';
      ctx.fillRect(x0 - 30, y, x1 - x0 + 60, 2);
    }
    const mg = ctx.createLinearGradient(0, roof, 0, eave);
    mg.addColorStop(0, rgba('#b8c6f0', 0.32));
    mg.addColorStop(0.5, rgba('#b8c6f0', 0.08));
    mg.addColorStop(1, 'rgba(0,0,0,0.2)');
    ctx.fillStyle = mg;
    ctx.fillRect(x0 - 30, roof, x1 - x0 + 60, eave - roof + 6);
    grain(ctx, { x: x0 - 30, y: roof, w: x1 - x0 + 60, h: eave - roof + 6 }, 'speckle', 0.25, 0.6);
  });
  ctx.strokeStyle = rgba(trAir('#1a0c0c'), 0.9);
  ctx.lineWidth = 1.6;
  roofPath()(ctx);
  ctx.stroke();
  // the ridge catches the moon
  ctx.strokeStyle = rgba(MOON, 0.42);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x0 + 26, roof + 1);
  ctx.lineTo(x1 - 26, roof + 1);
  ctx.stroke();
  // the wall: lime plaster turned away from the moon, in its own shade; the window's warmth spreading round it
  within(ctx, wallP, () => {
    surface(ctx, r, { x: x0, y: eave, w: x1 - x0, h: base - eave }, trAir('#a47c5a'), { vary: 0.45, cells: 3, mottle: 0.3, strokes: 0.6, strokeAng: Math.PI / 2, grain: 0.18, seed: 301, warm: trAir('#c89a6c'), cool: trAir('#40486a') });
    ctx.fillStyle = 'rgba(10,14,34,0.62)';
    ctx.fillRect(x0, eave, x1 - x0, base - eave);
    // damp creeping up from the ground, the eave's shadow
    vfill(ctx, x0, base - 40, x1 - x0, 40, [[0, 'rgba(8,10,20,0)'], [1, 'rgba(8,10,20,0.5)']]);
    crevice(ctx, x0, x1, eave, 18, 0.6, '#04060e');
    // plaster blown off near the corner, the brick under it
    ctx.fillStyle = rgba(trAir('#6a3a2c'), 0.75);
    ctx.beginPath();
    ctx.ellipse(x1 - 34, base - 54, 20, 12, -0.2, 0, P2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(10,8,14,0.45)';
    ctx.lineWidth = 1;
    for (let j = 0; j < 4; j++) {
      ctx.beginPath();
      ctx.moveTo(x1 - 52, base - 62 + j * 6);
      ctx.lineTo(x1 - 16, base - 62 + j * 6);
      ctx.stroke();
    }
    lightPool(ctx, MW.win.x + MW.win.w / 2, MW.win.sill - 14, 110, 70, '#ff9a48', 0.2);
    lightPool(ctx, MW.door.x + MW.door.w / 2, base - 30, 70, 60, '#ff9a48', 0.14);
  });
  // the corner the moon finds
  ctx.strokeStyle = rgba(MOON, 0.18);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x1 - 1, eave + 6);
  ctx.lineTo(x1 - 1, base);
  ctx.stroke();
  // the kitchen window: lit, a café curtain on a rod over its lower half, green shutters folded back
  const { x: wx, w: ww, top: wt, sill } = MW.win;
  const arch = (c: Ctx, g = 0) => {
    c.beginPath();
    c.moveTo(wx - g, sill);
    c.lineTo(wx - g, wt + ww / 2);
    c.arc(wx + ww / 2, wt + ww / 2, ww / 2 + g, Math.PI, 0);
    c.lineTo(wx + ww + g, sill);
    c.closePath();
  };
  for (const side of [-1, 1]) {
    const sx = side < 0 ? wx - 26 : wx + ww + 2;
    const sp: PathFn = (c) => {
      c.beginPath();
      c.rect(sx, wt + 6, 24, sill - wt - 6);
    };
    castShadow(ctx, sp, 4, 4, 0.5, '#04060e');
    solid(ctx, sp, { x: sx, y: wt + 6, w: 24, h: sill - wt - 6 }, 'wood', trAir('#2a5a40'), { depth: TR_DEPTH, air: NIGHT, line: 1.2, formSize: 3 });
    ctx.fillStyle = 'rgba(6,10,14,0.4)';
    for (let k = 0; k < 7; k++) ctx.fillRect(sx + 3, wt + 12 + k * 6.5, 18, 2);
    // the warm side of each shutter's edge, towards the glass
    ctx.fillStyle = rgba('#ffb060', 0.3);
    ctx.fillRect(side < 0 ? sx + 21 : sx, wt + 8, 3, sill - wt - 10);
  }
  ctx.save();
  arch(ctx);
  ctx.clip();
  const ig = ctx.createLinearGradient(0, wt, 0, sill);
  ig.addColorStop(0, '#ffd894');
  ig.addColorStop(0.6, '#f4a254');
  ig.addColorStop(1, '#c8662a');
  ctx.fillStyle = ig;
  ctx.fillRect(wx, wt, ww, sill - wt);
  // the kitchen beyond: a shelf and the dark of a hanging pan
  ctx.fillStyle = 'rgba(90,40,16,0.55)';
  ctx.fillRect(wx, wt + 20, ww, 3);
  ctx.beginPath();
  ctx.ellipse(wx + ww * 0.7, wt + 32, 7, 7, 0, 0, P2);
  ctx.fill();
  // the café curtain, gathered on its rod: soft vertical folds
  const cy = wt + (sill - wt) * 0.5;
  for (let i = 0; i < 9; i++) {
    const fx = wx + (i / 8) * ww;
    ctx.fillStyle = i % 2 ? 'rgba(255,236,200,0.85)' : 'rgba(236,196,150,0.85)';
    ctx.fillRect(fx - 3.5, cy, 7, sill - cy);
  }
  ctx.fillStyle = 'rgba(120,50,20,0.25)';
  for (let i = 0; i < 6; i++) ctx.fillRect(wx + 2, cy + 4 + i * 4, ww - 4, 1);
  ctx.restore();
  ctx.strokeStyle = trAir('#1a120c');
  ctx.lineWidth = 2.2;
  arch(ctx);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(wx + ww / 2, wt);
  ctx.lineTo(wx + ww / 2, sill);
  ctx.moveTo(wx, wt + ww / 2 + 4);
  ctx.lineTo(wx + ww, wt + ww / 2 + 4);
  ctx.stroke();
  // the sill, lit from above by the window
  ctx.fillStyle = trAir('#8a7a6a');
  ctx.fillRect(wx - 6, sill, ww + 12, 5);
  ctx.fillStyle = rgba('#ffc078', 0.45);
  ctx.fillRect(wx - 6, sill, ww + 12, 1.5);
  // the back door, ajar: the kitchen's light in the gap, the door's edge lit
  const { x: dx, w: dw, top: dt } = MW.door;
  ctx.fillStyle = '#ffcf88';
  ctx.fillRect(dx + dw - 12, dt, 10, base - dt);
  const dp: PathFn = (c) => {
    c.beginPath();
    c.moveTo(dx, dt);
    c.lineTo(dx + dw - 12, dt + 2);
    c.lineTo(dx + dw - 12, base);
    c.lineTo(dx, base);
    c.closePath();
  };
  solid(ctx, dp, { x: dx, y: dt, w: dw, h: base - dt }, 'wood', trAir('#3a281c'), { depth: TR_DEPTH, air: NIGHT, line: 1.4, formSize: 4 });
  ctx.fillStyle = 'rgba(6,6,12,0.35)';
  for (let k = 0; k < 3; k++) ctx.fillRect(dx + 4 + k * 11, dt + 6, 1.5, base - dt - 10);
  ctx.fillStyle = rgba('#ffc070', 0.6);
  ctx.fillRect(dx + dw - 14, dt + 2, 2, base - dt - 2);
  ctx.strokeStyle = trAir('#1a120c');
  ctx.lineWidth = 2;
  ctx.strokeRect(dx - 3, dt - 3, dw + 6, base - dt + 3);
  // the step, worn
  ctx.fillStyle = trAir('#6a625a');
  ctx.fillRect(dx - 8, base - 4, dw + 16, 6);
  ctx.fillStyle = rgba('#ffc070', 0.35);
  ctx.fillRect(dx + dw - 18, base - 4, 28, 2);
  // oven wood stacked under the window, the end grain catching the kitchen's light
  const logs: [number, number, number][] = [];
  for (let row = 0; row < 3; row++)
    for (let i = 0; i < 6 - row; i++) logs.push([MW.win.x - 30 + i * 15 + row * 7.5 + (r() - 0.5) * 2, base - 7 - row * 13, 7 + r() * 1.4]);
  castShadow(ctx, (c) => {
    c.beginPath();
    c.rect(MW.win.x - 38, base - 44, 96, 44);
  }, 6, 6, 0.4, '#04060e');
  for (const [lx, ly, lr] of logs) {
    ctx.fillStyle = trAir('#2a1c14');
    ctx.beginPath();
    ctx.ellipse(lx, ly, lr, lr * 0.95, 0, 0, P2);
    ctx.fill();
    const lg = ctx.createRadialGradient(lx + 1, ly - 1, 0, lx, ly, lr * 0.8);
    lg.addColorStop(0, '#c88e5a');
    lg.addColorStop(1, trAir('#6a4a30'));
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.ellipse(lx, ly, lr * 0.78, lr * 0.74, 0, 0, P2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,20,10,0.4)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(lx, ly, lr * 0.4, lr * 0.38, 0, 0, P2);
    ctx.stroke();
  }
  // the flue: the oven's chimney through the roof, sooted at its mouth, the moon on its left face
  const { x: fx, w: fw, top: ft } = MW.flue;
  const fp: PathFn = (c) => {
    c.beginPath();
    c.rect(fx - fw / 2, ft + 10, fw, roof + 24 - ft);
  };
  solid(ctx, fp, { x: fx - fw / 2, y: ft + 10, w: fw, h: roof + 24 - ft }, 'stone', trAir('#7a4a38'), { depth: TR_DEPTH, air: NIGHT, line: 1.4, formSize: 6 });
  within(ctx, fp, () => {
    ctx.strokeStyle = 'rgba(12,8,12,0.4)';
    ctx.lineWidth = 1;
    for (let y = ft + 16; y < roof + 30; y += 8) {
      ctx.beginPath();
      ctx.moveTo(fx - fw / 2, y);
      ctx.lineTo(fx + fw / 2, y);
      ctx.stroke();
    }
    vfill(ctx, fx - fw / 2, ft + 10, fw, 30, [[0, 'rgba(6,4,6,0.7)'], [1, 'rgba(6,4,6,0)']]);
    const sg = ctx.createLinearGradient(fx - fw / 2, 0, fx + fw / 2, 0);
    sg.addColorStop(0, rgba('#c0ccf0', 0.35));
    sg.addColorStop(0.4, 'rgba(0,0,0,0)');
    sg.addColorStop(1, 'rgba(4,6,14,0.5)');
    ctx.fillStyle = sg;
    ctx.fillRect(fx - fw / 2, ft + 10, fw, roof + 24 - ft);
  });
  // its cap: a slab on four little piers
  const cp: PathFn = (c) => {
    c.beginPath();
    c.rect(fx - fw / 2 - 6, ft, fw + 12, 6);
  };
  solid(ctx, cp, { x: fx - fw / 2 - 6, y: ft, w: fw + 12, h: 6 }, 'stone', trAir('#7a7270'), { depth: TR_DEPTH, air: NIGHT, line: 1.2, formSize: 2 });
  ctx.fillStyle = '#0a0608';
  ctx.fillRect(fx - fw / 2 + 3, ft + 6, fw - 6, 4);
  // the roof's shadow on the flue's foot
  crevice(ctx, fx - fw / 2, fx + fw / 2, roof + 24, -14, 0.4, '#04060e');
}

// ——— the clearing's floor ———

/** A big bare footprint pressed into the earth (lit from the moon behind: the far wall of the dent lit, the near
 * wall in shade, the pushed-up rim lit on its far side). (x, y) the heel, s the scale, ang its heading. */
function footprint(ctx: Ctx, x: number, y: number, s: number, ang: number, left: boolean): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, 0.34);
  ctx.rotate(ang);
  const L = 92 * s;
  const sole: PathFn = (c) => {
    c.beginPath();
    c.ellipse(0, -L * 0.18, L * 0.2, L * 0.24, 0, 0, P2);
    c.ellipse((left ? 1 : -1) * L * 0.04, -L * 0.56, L * 0.25, L * 0.24, 0, 0, P2);
  };
  const toes: [number, number, number][] = [0, 1, 2, 3, 4].map((i) => {
    const u = (i - 2) / 2;
    return [(left ? -1 : 1) * u * L * 0.24 + (left ? 1 : -1) * L * 0.03, -L * 0.84 + Math.abs(u) ** 1.6 * L * 0.12 + (i === (left ? 4 : 0) ? -L * 0.03 : 0), L * (i === (left ? 4 : 0) ? 0.075 : 0.055 - Math.abs(u) * 0.006)];
  });
  const all: PathFn = (c) => {
    sole(c);
    for (const [tx, ty, tr] of toes) c.ellipse(tx, ty, tr, tr * 1.1, 0, 0, P2);
  };
  // the mud pushed up round it, lit on the far side
  ctx.save();
  ctx.translate(0, -3 * s);
  all(ctx);
  ctx.fillStyle = 'rgba(150,164,206,0.22)';
  ctx.fill();
  ctx.restore();
  // the dent
  all(ctx);
  ctx.fillStyle = 'rgba(1,2,6,0.9)';
  ctx.fill();
  ctx.save();
  all(ctx);
  ctx.clip();
  ctx.translate(0, 5 * s);
  all(ctx);
  ctx.fillStyle = 'rgba(70,80,110,0.5)';
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

/** Where Bigfoot's tracks come out of the trees on the right, cross the path and head for the table. */
const PRINTS: [number, number, number, number, boolean][] = [
  [1560, 680, 0.95, -1.2, true],
  [1424, 696, 1.05, -1.08, false],
  [1284, 714, 1.15, -1.26, true],
  [1140, 732, 1.25, -1.1, false],
];

function ground(ctx: Ctx, r: R): void {
  const y0 = MW.floor - 24;
  const box = { x: 0, y: y0, w: W, h: TY - y0 + 4 };
  // moss and needle duff, darker nearer (out of the moon's reach), lighter where it rolls away into the mist
  vfill(ctx, 0, y0, W, box.h, [[0, '#2a345a'], [0.25, '#1c2440'], [1, '#0c1020']]);
  surface(ctx, r, box, '#1a2236', { over: true, vary: 0.5, cells: 7, mottle: 0.35, strokes: 1.4, strokeAng: 0, strokeLen: 70, strokeW: 3, grain: 0.22, seed: 303, warm: '#3a4a56', cool: '#0a0e1e' });
  lay(ctx, noiseMask(14, 305, { cover: 0.35, soft: 0.2, col: '#1e3230', w: 320, h: 48 }), box, 0.5);
  // the path worn from the back door: packed earth, pale in the moonlight, curving down to the table
  const path: PathFn = (c) => {
    c.beginPath();
    c.moveTo(MW.door.x + 6, MW.tr.base + 2);
    c.bezierCurveTo(360, 700, 640, 680, 820, TY + 6);
    c.lineTo(1120, TY + 6);
    c.bezierCurveTo(880, 690, 470, 694, MW.door.x + MW.door.w + 8, MW.tr.base + 2);
    c.closePath();
  };
  within(ctx, path, () => {
    softly(ctx, box, (g) => {
      g.fillStyle = 'rgba(70,76,100,0.55)';
      g.fillRect(box.x, box.y, box.w, box.h);
    }, 0.5);
    lay(ctx, drift('#5a6070', '#20243a', 6, 307, 160, 30), box, 0.35);
    grain(ctx, box, 'speckle', 0.35, 0.8);
  });
  // its edges soften into the moss
  ctx.save();
  ctx.filter = 'blur(6px)';
  ctx.strokeStyle = 'rgba(14,20,30,0.55)';
  ctx.lineWidth = 10;
  path(ctx);
  ctx.stroke();
  ctx.restore();
  // needles and twigs strewn over it all
  for (let i = 0; i < 520; i++) {
    const x = r() * W;
    const t = r();
    const y = y0 + 20 + t * (TY - y0 - 16);
    const s = 2 + t * 7;
    const a = r() * P2;
    ctx.strokeStyle = r() < 0.3 ? rgba('#8a94b8', 0.22) : rgba('#06080e', 0.4);
    ctx.lineWidth = 0.6 + t * 0.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s * 0.35);
    ctx.stroke();
  }
  // the tracks
  for (const [x, y, s, a, left] of PRINTS) footprint(ctx, x, y, s, a, left);
  // the far edge melts into the mist; the trattoria's corner of the clearing a little warmer
  haze(ctx, y0 - 10, y0 + 60, '#40508a', 0.5, 0.3);
  // calm under the boss's lanes: the middle eased down
  const cg = ctx.createRadialGradient(VX, TY, 60, VX, TY, 620);
  cg.addColorStop(0, 'rgba(6,8,18,0.32)');
  cg.addColorStop(1, 'rgba(6,8,18,0)');
  ctx.save();
  ctx.translate(0, TY);
  ctx.scale(1, 0.3);
  ctx.translate(0, -TY);
  ctx.fillStyle = cg;
  ctx.fillRect(0, TY - 700, W, 1400);
  ctx.restore();
}

// ——— the firs at the clearing's edge ———

const FIR = { dark: '#04080f', mid: '#0f1c2e', lit: '#3e5884', rim: '#a8c0f0', rimA: 0.35 };
const FIRS: [number, number, number, number, number][] = [
  // x, base, height, width, depth
  [548, 670, 370, 196, 0.34],
  [1470, 672, 430, 224, 0.32],
  [1640, 690, 540, 270, 0.22],
  [690, 662, 250, 136, 0.42],
  [1330, 664, 280, 146, 0.42],
];

function midFirs(ctx: Ctx, r: R): void {
  // the far pair first
  const order = [...FIRS].sort((a, b) => b[4] - a[4]);
  for (const [x, base, h, w, d] of order) {
    groundShadow(ctx, x + 10, base + 2, w * 0.42, 7, 0.55, '#02040a');
    const toLight: [number, number] = [MW.moon.x - x, MW.moon.y - (base - h / 2)];
    conifer(ctx, r, x, base, h, w, { ...FIR, depth: d, air: NIGHT, toLight });
    // the ground mist round its foot
    haze(ctx, base - 40, base + 8, '#33427a', 0.4, 0.8, x - w * 0.6, x + w * 0.6);
  }
  // the lantern's warmth on the near side of the big right-hand fir
  lightPool(ctx, MW.hook.x + 30, 470, 140, 200, WARM, 0.12);
}

/** A noise mask laid over a box with its edges feathered to nothing (no rectangle shows where it ends). */
function feathered(ctx: Ctx, mask: HTMLCanvasElement, box: Box, a: number): void {
  const [c, g] = makeCanvas(mask.width, mask.height);
  g.drawImage(mask, 0, 0);
  g.globalCompositeOperation = 'destination-in';
  const cw = mask.width;
  const ch = mask.height;
  g.save();
  g.translate(cw / 2, ch / 2);
  g.scale(cw / 2, ch / 2);
  const rg = g.createRadialGradient(0, 0, 0.3, 0, 0, 1);
  rg.addColorStop(0, 'rgba(0,0,0,1)');
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg;
  g.fillRect(-1, -1, 2, 2);
  g.restore();
  lay(ctx, c, box, a);
}

// ——— the two old pines ———

/** A pine trunk's half width at height y (a slow taper, the root flare at the foot). */
function trunkHW(w: number, y: number): number {
  const base = w * (0.44 + (y / TY) * 0.08);
  const f = Math.max(0, (y - (TY - 110)) / 118);
  return base + w * 0.34 * f * f;
}

function trunkPath(x: number, w: number, lean: number): PathFn {
  const pts: [number, number][] = [];
  for (let y = -14; y <= TY + 10; y += 10) pts.push([x + lean * (1 - y / TY) - trunkHW(w, y), y]);
  for (let y = TY + 10; y >= -14; y -= 10) pts.push([x + lean * (1 - y / TY) + trunkHW(w, y) + (y > TY - 60 ? Math.sin(y * 0.3) * 3 : 0), y]);
  return (c) => {
    c.beginPath();
    pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
    c.closePath();
  };
}

/** An old pine's trunk: thick bark split by long wandering furrows into narrow plates, each plate's face catching
 * the moon on the side towards it; round (the moon's side pale, the far side black), moss up from the roots on the
 * shaded side, lichen higher up, a broken stub or two. */
function trunk(ctx: Ctx, r: R, x: number, w: number, lean: number, seed: number): void {
  const p = trunkPath(x, w, lean);
  const box = { x: x - w * 1.2, y: -14, w: w * 2.4, h: TY + 26 };
  const litSide = x < MW.moon.x ? 1 : -1; // +1: the moon is to its right
  const cx = (y: number) => x + lean * (1 - y / TY);
  groundShadow(ctx, x + 40, TY + 6, w * 1.1, 18, 0.65, '#02030a');
  within(ctx, p, () => {
    surface(ctx, r, box, BARK, { vary: 0.45, cells: 3, mottle: 0.35, strokes: 3, strokeAng: Math.PI / 2, strokeLen: 220, strokeW: 4, grain: 0.3, grainKind: 'wood', seed });
    // the bark: strips between long wandering furrows (u: -1…1 across the round, projected so they crowd at the
    // edges), each strip broken by cross cracks into long plates of their own tone; each plate's upper edge and its
    // side towards the moon catch the light, the furrows are deep and dark
    const nF = Math.round(w / 13);
    const ys: number[] = [];
    for (let y = TY + 24; y > -30; y -= 12) ys.push(y);
    const us: number[][] = [];
    for (let i = 0; i <= nF; i++) {
      let u = -1.05 + (2.1 * i) / nF;
      us.push(ys.map(() => (u += (r() - 0.5) * 0.07)));
    }
    const at = (i: number, j: number): [number, number] => {
      const y = ys[j];
      const u = Math.max(-1, Math.min(1, us[i][j]));
      return [cx(y) + Math.sin((u * Math.PI) / 2) * trunkHW(w, y), y];
    };
    for (let i = 0; i < nF; i++) {
      let j = 0;
      while (j < ys.length - 1) {
        const n = (j === 0 ? 1 + Math.floor(r() * 6) : 3) + Math.floor(r() * 6);
        const j1 = Math.min(ys.length - 1, j + n);
        const mid = (us[i][j] + us[i + 1][j]) / 2;
        // the plate's tone: its face turned to the moon a little lighter
        const face = litSide * mid;
        const c0 = shade(BARK, (r() - 0.5) * 0.16 + face * 0.1);
        ctx.fillStyle = c0;
        ctx.beginPath();
        for (let q = j; q <= j1; q++) {
          const [px, py] = at(i, q);
          if (q === j) ctx.moveTo(px + 1.5, py - 1);
          else ctx.lineTo(px + 1.5, py);
        }
        for (let q = j1; q >= j; q--) {
          const [px, py] = at(i + 1, q);
          ctx.lineTo(px - 1.5, py + (q === j1 ? 1 : 0));
        }
        ctx.closePath();
        ctx.fill();
        // the crack that ends it: jagged and slanting, not a straight cut (a lit lip under it on the plate below)
        const [ax, ay] = at(i, j1);
        const [bx2, by2] = at(i + 1, j1);
        const sl = (r() - 0.5) * 14;
        const mx2 = (ax + bx2) / 2 + (r() - 0.5) * 4;
        const my2 = (ay + by2) / 2 + (r() - 0.5) * 8;
        ctx.strokeStyle = 'rgba(3,2,6,0.6)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(ax, ay - sl / 2);
        ctx.lineTo(mx2, my2);
        ctx.lineTo(bx2, by2 + sl / 2);
        ctx.stroke();
        ctx.strokeStyle = rgba('#9aa6d0', 0.1 + Math.max(0, face) * 0.12);
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(ax + 2, ay - sl / 2 + 2);
        ctx.lineTo(mx2, my2 + 2);
        ctx.lineTo(bx2 - 2, by2 + sl / 2 + 2);
        ctx.stroke();
        j = j1;
      }
      // the furrow on its left
      ctx.strokeStyle = 'rgba(2,1,5,0.85)';
      ctx.lineWidth = 3.2 * (1 - Math.abs(us[i][0]) * 0.55);
      ctx.beginPath();
      for (let q = 0; q < ys.length; q++) {
        const [px, py] = at(i, q);
        if (q) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.stroke();
    }
    lay(ctx, drift(shade(BARK, 0.2), shade(BARK, -0.3), 4, seed + 11, 24, 120), box, 0.25);
    grain(ctx, box, 'wood', 0.3, 0.8);
    // the round of the trunk: the moon's side pale, the far side falling into black
    const g = ctx.createLinearGradient(x - w * 0.62, 0, x + w * 0.62, 0);
    const lit = rgba('#a4b2e0', 0.3);
    const dark = 'rgba(1,2,6,0.82)';
    g.addColorStop(0, litSide < 0 ? lit : dark);
    g.addColorStop(0.2, litSide < 0 ? rgba('#a4b2e0', 0.06) : 'rgba(1,2,6,0.6)');
    g.addColorStop(0.5, 'rgba(1,2,6,0.44)');
    g.addColorStop(0.8, litSide > 0 ? rgba('#a4b2e0', 0.04) : 'rgba(1,2,6,0.62)');
    g.addColorStop(1, litSide > 0 ? lit : dark);
    ctx.fillStyle = g;
    ctx.fillRect(box.x, box.y, box.w, box.h);
    // high up, the trunk loses itself in the canopy's shade
    vfill(ctx, box.x, -14, box.w, 300, [[0, 'rgba(1,2,6,0.8)'], [1, 'rgba(1,2,6,0)']]);
    // moss on the shaded side, thickest at the roots; grey-green lichen higher up
    const mx = litSide > 0 ? x - w * 0.62 : x;
    feathered(ctx, noiseMask(6, seed + 5, { cover: 0.42, soft: 0.25, col: '#1e3628' }), { x: mx, y: TY - 340, w: w * 0.7, h: 360 }, 0.8);
    feathered(ctx, noiseMask(5, seed + 7, { cover: 0.3, soft: 0.15, col: '#2e4834' }), { x: x - w * 0.9, y: TY - 130, w: w * 1.8, h: 150 }, 0.6);
    feathered(ctx, noiseMask(12, seed + 9, { cover: 0.16, soft: 0.06, col: '#5e6c74' }), { x: x - w * 0.5, y: 220, w: w, h: 340 }, 0.3);
    // the foot in the duff and the mist
    vfill(ctx, box.x, TY - 70, box.w, 80, [[0, 'rgba(2,3,8,0)'], [1, 'rgba(2,3,8,0.8)']]);
  });
  rim(ctx, p, 0.32, 3, MOON);
}

/** The right pine's low limb, reaching out over the clearing, the lantern's S-hook on it: a round, tapering branch
 * with a kink, bark lit by the moon along its top and by the lantern underneath. */
function limb(ctx: Ctx, r: R): void {
  const { x0, y0, x1, y1 } = MW.limb;
  const N = 24;
  const cl: [number, number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t - Math.sin(t * Math.PI) * 14 + (t > 0.55 ? (t - 0.55) * 18 : 0);
    cl.push([x, y, 15 * (1 - t) + 4.5 + (t < 0.08 ? (0.08 - t) * 110 : 0)]);
  }
  const lp: PathFn = (c) => {
    c.beginPath();
    cl.forEach(([x, y, hw], i) => (i ? c.lineTo(x, y - hw) : c.moveTo(x, y - hw)));
    for (let i = N; i >= 0; i--) c.lineTo(cl[i][0], cl[i][1] + cl[i][2]);
    c.closePath();
  };
  castShadow(ctx, lp, 18, 16, 0.4, '#010206');
  within(ctx, lp, () => {
    ctx.fillStyle = BARK;
    ctx.fillRect(x1 - 20, y1 - 40, x0 - x1 + 50, y0 - y1 + 90);
    grain(ctx, { x: x1 - 20, y: y1 - 40, w: x0 - x1 + 50, h: y0 - y1 + 90 }, 'wood', 0.5, 0.8);
    // round: lit along its top by the moon, dark below
    for (const [off, col, a, wk] of [[-0.55, '#b0bee8', 0.35, 0.35], [0.1, '#020308', 0.5, 0.6], [0.7, '#020308', 0.6, 0.4]] as const) {
      ctx.strokeStyle = rgba(col, a);
      for (let i = 0; i < N; i++) {
        const [x, y, hw] = cl[i];
        const [x2, y2] = cl[i + 1];
        ctx.lineWidth = hw * 2 * wk;
        ctx.beginPath();
        ctx.moveTo(x, y + off * hw);
        ctx.lineTo(x2, y2 + off * hw);
        ctx.stroke();
      }
    }
    // bark scales along it
    for (let i = 0; i < 40; i++) {
      const [x, y, hw] = cl[Math.floor(r() * N)];
      const oy = (r() - 0.5) * hw * 1.6;
      ctx.strokeStyle = 'rgba(4,3,8,0.55)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, y + oy);
      ctx.lineTo(x - 6 - r() * 10, y + oy + (r() - 0.5) * 2);
      ctx.stroke();
    }
    // the lantern's warmth on the underside by the hook
    lightPool(ctx, MW.hook.x, MW.hook.y + 12, 70, 18, WARM, 0.55);
  });
  ctx.strokeStyle = '#060408';
  ctx.lineWidth = 2;
  lp(ctx);
  ctx.stroke();
  // a twig off it and a spray of needles at the tip
  const [tx, ty] = cl[N];
  spray(ctx, r, [[tx + 30, ty - 4], [tx, ty], [tx - 30, ty + 10], [tx - 52, ty + 26]], { len: 9, toMoon: [-0.6, -0.8], a: 1 });
  spray(ctx, r, [[cl[16][0], cl[16][1] - 6], [cl[16][0] - 14, cl[16][1] - 30], [cl[16][0] - 34, cl[16][1] - 44]], { len: 8, toMoon: [-0.6, -0.8], a: 1 });
  // the S-hook over it
  const { x: hx, y: hy } = MW.hook;
  ctx.strokeStyle = '#14141a';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.arc(hx, hy - 12, 6, Math.PI * 0.9, Math.PI * 2.1);
  ctx.moveTo(hx + 6, hy - 11);
  ctx.quadraticCurveTo(hx + 4, hy - 2, hx, hy);
  ctx.stroke();
  ctx.strokeStyle = rgba('#ffc890', 0.5);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(hx, hy - 12, 6, Math.PI * 1.1, Math.PI * 1.5);
  ctx.stroke();
}

/**
 * A spray of fir needles along a twig (a polyline from its base to its tip): needles set in two flat ranks along it,
 * swept forward and drooping, shorter towards the tip; the ones turned up to the moon lit, the ones turned down in
 * shade. a: overall alpha.
 */
function spray(ctx: Ctx, r: R, pts: [number, number][], o: { len: number; toMoon: [number, number]; a: number; width?: number; dark?: string; mid?: string; lit?: string }): void {
  const dark = o.dark ?? '#03050b';
  const mid = o.mid ?? '#0c1524';
  const lit = o.lit ?? '#4a6494';
  const ll = Math.hypot(o.toMoon[0], o.toMoon[1]) || 1;
  const mx = o.toMoon[0] / ll;
  const my = o.toMoon[1] / ll;
  ctx.strokeStyle = rgba('#05040a', o.a);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  let run = 0;
  ctx.lineCap = 'round';
  ctx.lineWidth = o.width ?? 1.3;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const seg = Math.hypot(bx - ax, by - ay);
    const dir = Math.atan2(by - ay, bx - ax);
    for (let d = 0; d < seg; d += 2.6) {
      const t = (run + d) / total;
      const x = ax + Math.cos(dir) * d;
      const y = ay + Math.sin(dir) * d;
      const L = o.len * (1 - t * 0.55) * (0.8 + r() * 0.4);
      for (const side of [-1, 1]) {
        const ang = dir + side * (0.95 + (r() - 0.5) * 0.35);
        const ex = x + Math.cos(ang) * L;
        const ey = y + Math.sin(ang) * L + L * 0.35;
        const face = Math.cos(ang) * mx + Math.sin(ang) * my;
        const k = Math.max(0, Math.min(1, 0.35 + face * 0.6 + (r() - 0.5) * 0.3));
        ctx.strokeStyle = rgba(k < 0.5 ? mix(dark, mid, k * 2) : mix(mid, lit, (k - 0.5) * 2), o.a);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo((x + ex) / 2, (y + ey) / 2 - L * 0.12, ex, ey);
        ctx.stroke();
      }
    }
    run += seg;
  }
}

/** A fir bough hanging into a top corner from its trunk at (bx, by): a limb sweeping out and drooping, its side
 * branches set with sprays (the far ones dark behind, the near ones on top), branchlets hanging in curtains. Near
 * and against the sky: nearly black, the moon on the needles turned to it. */
function bough(ctx: Ctx, r: R, bx: number, by: number, dir: 1 | -1, len: number): void {
  const toMoon: [number, number] = [MW.moon.x - (bx + dir * len * 0.5), MW.moon.y - by];
  const at = (t: number): [number, number] => [bx + dir * t * len, by - 34 * Math.sin(t * Math.PI * 0.8) + t * t * 80];
  ctx.strokeStyle = '#141018';
  ctx.lineCap = 'round';
  for (let i = 0; i < 24; i++) {
    const [ax, ay] = at(i / 24);
    const [cx, cy] = at((i + 1) / 24);
    ctx.lineWidth = 16 * (1 - i / 24) + 3 + (i < 3 ? (3 - i) * 5 : 0);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(cx, cy);
    ctx.stroke();
  }
  // a frond: a flat fishbone of twigs off a drooping rachis, every twig set with its own two ranks of needles
  const frond = (t: number, side: number, back: boolean) => {
    const [x0, y0] = at(t);
    const L = (80 + Math.sin(t * Math.PI) * 100) * (back ? 0.85 : 1) * (0.85 + r() * 0.3);
    const fwd = dir > 0 ? 0 : Math.PI;
    const ang = fwd + dir * (side * (0.35 + r() * 0.3) + 0.2 + t * 0.35);
    const pts: [number, number][] = [];
    for (let j = 0; j <= 6; j++) {
      const u = j / 6;
      pts.push([x0 + Math.cos(ang) * L * u, y0 + Math.sin(ang) * L * u + u * u * L * (0.18 + t * 0.3)]);
    }
    const a = 1;
    const cols = back ? { dark: '#020308', mid: '#050a14', lit: '#141e32' } : { dark: '#020409', mid: '#08101c', lit: '#344c78' };
    // the twigs off it, forward and a little down on each side, shorter towards the tip
    for (let j = 0; j < 6; j++) {
      const [ax, ay] = pts[j];
      const [bx2, by2] = pts[j + 1];
      const d = Math.atan2(by2 - ay, bx2 - ax);
      for (let q = 0; q < 2; q++) {
        const px = ax + (bx2 - ax) * (q * 0.5 + 0.25);
        const py = ay + (by2 - ay) * (q * 0.5 + 0.25);
        const u = (j + q * 0.5) / 6;
        for (const s of [-1, 1]) {
          const tl = (30 - u * 18) * (0.8 + r() * 0.4);
          const ta = d + s * (0.7 + r() * 0.3);
          spray(ctx, r, [[px, py], [px + Math.cos(ta) * tl * 0.55, py + Math.sin(ta) * tl * 0.55 + tl * 0.06], [px + Math.cos(ta) * tl, py + Math.sin(ta) * tl + tl * 0.25]], { len: 7.5, width: 1.5, toMoon, a, ...cols });
        }
      }
    }
    spray(ctx, r, pts, { len: 10, width: 1.7, toMoon, a, ...cols });
  };
  for (let i = 0; i < 9; i++) frond(0.1 + (i / 9) * 0.88, i % 2 ? -1 : 1, true);
  for (let i = 0; i < 11; i++) frond(0.06 + (i / 11) * 0.9 + (r() - 0.5) * 0.03, i % 2 ? 1 : -1, false);
}

// ——— the lantern ———

/** The storm lantern hanging from the hook, painted round its hook at (hx, hy): chain, wire bail, tin cap and
 * chimney, the glass globe lit from inside, the fount. The flame isn't painted here (the live layer's, or the
 * still's flame layer). */
function lantern(ctx: Ctx, hx: number, hy: number): void {
  const y = (v: number) => hy + v;
  hang(ctx, hx, hy, hx, y(LT.chain), 0, '#3a3634', 2.2, true);
  // the bail: a wire loop from the chain down to the fount's sides
  ctx.strokeStyle = '#1a181a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(hx - 21, y(LT.base - 8));
  ctx.quadraticCurveTo(hx - 24, y(LT.bail - 10), hx, y(LT.chain));
  ctx.quadraticCurveTo(hx + 24, y(LT.bail - 10), hx + 21, y(LT.base - 8));
  ctx.stroke();
  // the globe: warm light through glass, a hot core, the glass's own sheen and thickness at its edges
  const globe: PathFn = (c) => {
    c.beginPath();
    c.moveTo(hx - 11, y(LT.globe0));
    c.bezierCurveTo(hx - 24, y(LT.globe0 + 10), hx - 24, y(LT.globe1 - 8), hx - 13, y(LT.globe1));
    c.lineTo(hx + 13, y(LT.globe1));
    c.bezierCurveTo(hx + 24, y(LT.globe1 - 8), hx + 24, y(LT.globe0 + 10), hx + 11, y(LT.globe0));
    c.closePath();
  };
  within(ctx, globe, () => {
    const g = ctx.createRadialGradient(hx, y(LT.flame - 8), 2, hx, y(LT.flame - 8), 26);
    g.addColorStop(0, '#fff4d0');
    g.addColorStop(0.35, '#ffc66a');
    g.addColorStop(1, '#c86a24');
    ctx.fillStyle = g;
    ctx.fillRect(hx - 26, y(LT.globe0), 52, LT.globe1 - LT.globe0);
    // the wick's brass burner at the bottom, in silhouette
    ctx.fillStyle = 'rgba(80,40,10,0.8)';
    ctx.fillRect(hx - 6, y(LT.globe1 - 6), 12, 6);
    // soot on the top of the glass
    vfill(ctx, hx - 26, y(LT.globe0), 52, 12, [[0, 'rgba(40,20,10,0.55)'], [1, 'rgba(40,20,10,0)']]);
  });
  glassPane(ctx, globe, { x: hx - 24, y: y(LT.globe0), w: 48, h: LT.globe1 - LT.globe0 }, { sheen: 0.22 });
  ctx.strokeStyle = rgba('#7a4a20', 0.9);
  ctx.lineWidth = 1.4;
  globe(ctx);
  ctx.stroke();
  // the guard wires over the globe
  ctx.strokeStyle = '#1a181a';
  ctx.lineWidth = 1.6;
  for (const u of [-0.75, 0, 0.75]) {
    ctx.beginPath();
    ctx.moveTo(hx + u * 12, y(LT.globe0 - 2));
    ctx.quadraticCurveTo(hx + u * 28, y((LT.globe0 + LT.globe1) / 2), hx + u * 14, y(LT.globe1 + 2));
    ctx.stroke();
  }
  // the cap and its chimney: tin, lit warm from under, the moon on its top
  const cap: PathFn = (c) => {
    c.beginPath();
    c.moveTo(hx - 7, y(LT.bail));
    c.lineTo(hx + 7, y(LT.bail));
    c.lineTo(hx + 8, y(LT.cap));
    c.lineTo(hx + 17, y(LT.globe0));
    c.lineTo(hx - 17, y(LT.globe0));
    c.lineTo(hx - 8, y(LT.cap));
    c.closePath();
  };
  solid(ctx, cap, { x: hx - 17, y: y(LT.bail), w: 34, h: LT.globe0 - LT.bail }, 'iron', '#5a3a2a', { depth: 0.05, line: 1.6, formSize: 3 });
  ctx.fillStyle = rgba('#ffb060', 0.5);
  ctx.fillRect(hx - 16, y(LT.globe0 - 2), 32, 2);
  // the fount: a squat tin tank, its top lit by the globe, its sides dark
  const fount: PathFn = (c) => {
    c.beginPath();
    c.moveTo(hx - 16, y(LT.globe1));
    c.lineTo(hx + 16, y(LT.globe1));
    c.quadraticCurveTo(hx + 24, y(LT.globe1 + 3), hx + 22, y(LT.base));
    c.lineTo(hx - 22, y(LT.base));
    c.quadraticCurveTo(hx - 24, y(LT.globe1 + 3), hx - 16, y(LT.globe1));
    c.closePath();
  };
  solid(ctx, fount, { x: hx - 24, y: y(LT.globe1), w: 48, h: LT.base - LT.globe1 }, 'iron', '#6a3a24', { depth: 0.05, line: 1.6, formSize: 4 });
  ctx.fillStyle = rgba('#ffc070', 0.6);
  ctx.fillRect(hx - 15, y(LT.globe1), 30, 2);
  ctx.fillStyle = rgba(MOON, 0.25);
  ctx.fillRect(hx - 20, y(LT.globe1 + 4), 4, 6);
}

/** The lantern's light where it reaches (added, in the base): the limb above, the bark and the fir beside it, the
 * ground below. The air round it glows live. */
function lanternLight(ctx: Ctx): void {
  const { x, y } = MW.hook;
  const fy = y + LT.flame;
  // the air and the needles round it
  glowAt(ctx, x, fy - 10, 240, '#ff9a40', 0.2);
  glowAt(ctx, x, fy - 10, 110, '#ffb060', 0.16);
  // the right pine's near face, brightest level with the flame
  lightPool(ctx, MW.trunkR.x - MW.trunkR.w * 0.42, fy - 20, 90, 240, WARM, 0.42);
  // the limb's underside over it
  lightPool(ctx, x + 30, y + 14, 150, 30, WARM, 0.35);
  // the ground straight under it, and wider
  lightPool(ctx, x + 10, MW.floor + 62, 230, 40, WARM, 0.34);
  lightPool(ctx, x + 6, MW.floor + 60, 110, 18, '#ffc478', 0.3);
}

function lanternFlameStill(ctx: Ctx): void {
  const { x, y } = MW.hook;
  fireFrame(ctx, x, y + LT.flame, 9, 22, 0.15, { tongues: 1, cols: ['#ff7a22', '#ffc450', '#fff8e0'] });
  glowAt(ctx, x, y + LT.flame - 10, 34, '#ffe0a0', 0.4);
}

// ——— the canopy ———

const BOUGH_L: Box = { x: 0, y: 0, w: 720, h: 360 };
const BOUGH_R: Box = { x: 1160, y: 0, w: 760, h: 440 };

// ——— the mist (painted: the still's banks; the live layer rolls its own) ———

const FOG_W = 480;
const FOG_H = 80;
/** A bank's frame scale (the frames are painted at half size: mist is soft). */
const FOG_K = 2;

/** One frame of a bank of ground mist (phase 0…1 loops), FOG_W×FOG_H and seamless left to right: lobes that swell,
 * lift and thin on their own beats over a flat lying layer, lit silver on top by the moon, shaded underneath. */
function fogFrame(c: Ctx, ph: number, seed: number, a: number): void {
  let s = seed;
  const rr = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const w = FOG_W;
  const h = FOG_H;
  // the lying layer
  const lg = c.createLinearGradient(0, h * 0.3, 0, h);
  lg.addColorStop(0, 'rgba(150,166,214,0)');
  lg.addColorStop(0.55, rgba('#8a9cd0', a * 0.32));
  lg.addColorStop(0.8, rgba('#8a9cd0', a * 0.2));
  lg.addColorStop(1, 'rgba(150,166,214,0)');
  c.fillStyle = lg;
  c.fillRect(0, 0, w, h);
  for (let i = 0; i < 16; i++) {
    const x0 = rr() * w;
    const k = 1 + Math.floor(rr() * 2);
    const sp = rr() * P2;
    const life = Math.sin(ph * P2 * k + sp);
    const rad = (14 + rr() * 16) * (0.85 + life * 0.18);
    const y = h * 0.62 - rad * 0.35 - (life + 1) * 3;
    const al = a * (0.5 + rr() * 0.3) * (0.75 + life * 0.25);
    for (const dx of [-w, 0, w]) {
      const x = x0 + dx + Math.sin(ph * P2 + sp) * 6;
      if (x < -rad * 2 || x > w + rad * 2) continue;
      c.save();
      c.translate(x, y);
      c.scale(1.9, 1);
      const g = c.createRadialGradient(0, 0, 0, 0, 0, rad);
      g.addColorStop(0, rgba('#9aaad8', al));
      g.addColorStop(0.6, rgba('#8090c8', al * 0.55));
      g.addColorStop(1, rgba('#8090c8', 0));
      c.fillStyle = g;
      c.fillRect(-rad, -rad, rad * 2, rad * 2);
      // the moon on its top, the shade under it
      const tg = c.createRadialGradient(-rad * 0.2, -rad * 0.45, 0, -rad * 0.2, -rad * 0.45, rad * 0.7);
      tg.addColorStop(0, rgba('#e4ecff', al * 0.55));
      tg.addColorStop(1, rgba('#e4ecff', 0));
      c.fillStyle = tg;
      c.fillRect(-rad, -rad, rad * 2, rad * 2);
      const sg = c.createRadialGradient(rad * 0.1, rad * 0.5, 0, rad * 0.1, rad * 0.5, rad * 0.7);
      sg.addColorStop(0, rgba('#1a2244', al * 0.35));
      sg.addColorStop(1, rgba('#1a2244', 0));
      c.fillStyle = sg;
      c.fillRect(-rad, -rad, rad * 2, rad * 2);
      c.restore();
    }
  }
}

/** The mist's two banks: (y of the bank's top, seed, alpha). */
const BANKS = [
  { y: MW.floor - 100, seed: 41, a: 0.42 },
  { y: TY - 132, seed: 77, a: 0.26 },
];

function fogStill(ctx: Ctx): void {
  const [fc, fg] = makeCanvas(FOG_W, FOG_H);
  for (const [bi, b] of BANKS.entries()) {
    fg.clearRect(0, 0, FOG_W, FOG_H);
    fogFrame(fg, 0.2 + bi * 0.4, b.seed, b.a);
    for (let x = -bi * 300; x < W; x += FOG_W * FOG_K) ctx.drawImage(fc, x, b.y, FOG_W * FOG_K, FOG_H * FOG_K);
  }
}

// ——— the flue's smoke ———

const SMOKE_W = 180;
const SMOKE_H = 300;
const smokeOpts = { lit: '#a8b4e0', body: '#3a3e56', shade: '#0c0e1a', wind: 0.5, lobes: 26, a: 0.3, toLight: [0.55, -0.8] as [number, number], seed: 3 };

function smokeStill(ctx: Ctx): void {
  const [c, g] = makeCanvas(SMOKE_W, SMOKE_H);
  smokeFrame(g, SMOKE_W, SMOKE_H, 0.3, smokeOpts);
  ctx.drawImage(c, MW.flue.x - SMOKE_W / 2, MW.flue.top + 16 - SMOKE_H);
}

// ——— fireflies (the still's; the live layer flies its own) ———

const FLY_C = '#d8ff8a';

function firefly(c: Ctx, x: number, y: number, a: number): void {
  const g = c.createRadialGradient(x, y, 0, x, y, 14);
  g.addColorStop(0, rgba('#f4ffc8', a));
  g.addColorStop(0.15, rgba(FLY_C, a * 0.8));
  g.addColorStop(0.5, rgba('#9adf5a', a * 0.18));
  g.addColorStop(1, rgba('#9adf5a', 0));
  c.fillStyle = g;
  c.fillRect(x - 14, y - 14, 28, 28);
}

function fliesStill(ctx: Ctx): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [x, y, a] of [[640, 640, 0.8], [1250, 610, 0.6], [1420, 700, 0.9], [520, 560, 0.5], [1700, 620, 0.7], [330, 700, 0.6]] as const) firefly(ctx, x, y, a);
  ctx.restore();
}

// ——— the table ———

/** A heart and two initials cut into the boards (foreshortened), the cuts dark, their lower lips lit. */
function carved(ctx: Ctx, x: number, y: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, 0.42);
  const heart: PathFn = (c) => {
    c.beginPath();
    c.moveTo(0, 22);
    c.bezierCurveTo(-30, 0, -26, -26, 0, -12);
    c.bezierCurveTo(26, -26, 30, 0, 0, 22);
  };
  for (const [dy, col, w] of [[2.5, 'rgba(170,180,210,0.18)', 2], [0, 'rgba(6,6,12,0.6)', 2.6]] as const) {
    ctx.save();
    ctx.translate(0, dy);
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    heart(ctx);
    ctx.stroke();
    ctx.font = 'bold 15px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = w * 0.6;
    ctx.strokeText('N + B', 0, 6);
    ctx.restore();
  }
  ctx.restore();
}


function table(ctx: Ctx, r: R): void {
  const front = MW.front;
  const zf = zAt(front + 4);
  // a weathered picnic table: silver-grey boards, lichen in the grain
  planksPlane(ctx, r, front, '#7a766c', 0.24, 0.009, false);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, front - TY + 4);
  ctx.clip();
  lay(ctx, noiseMask(18, 311, { cover: 0.14, soft: 0.06, col: '#8aa070', w: 320, h: 80 }), { x: 0, y: TY, w: W, h: front - TY }, 0.32);
  // the night over it all: moonlight is blue and dim; the lantern warms the right end
  ctx.globalCompositeOperation = 'multiply';
  vfill(ctx, 0, TY, W, front - TY + 4, [[0, '#66729e'], [1, '#9aa4c8']]);
  ctx.globalCompositeOperation = 'source-over';
  // the weathered grain raised by the weather: pale ridges and dark checks running the boards' length, a knot here
  // and there; the moon catches them in long streaks, the lantern on the right
  for (let i = -9; i < 9; i++) {
    const X0 = i * 0.24;
    for (let q = 0; q < 16; q++) {
      const X = X0 + 0.012 + r() * 0.216;
      const zA = 1.7 + r() * 0.9;
      const zB = Math.max(zf, zA - 0.2 - r() * 0.6);
      const ridge = r() < 0.6;
      ctx.strokeStyle = ridge ? rgba('#c4ccec', 0.05 + r() * 0.07) : rgba('#06060c', 0.2 + r() * 0.2);
      ctx.lineWidth = ridge ? 1 + r() * 1.4 : 0.8 + r();
      ctx.beginPath();
      ctx.moveTo(xAt(X, zA), yAt(zA));
      ctx.lineTo(xAt(X + (r() - 0.5) * 0.004, zB), yAt(zB));
      ctx.stroke();
    }
  }
  varnish(ctx, { x: 0, y: TY, w: W, h: front - TY }, [{ x: MW.moon.x + 120, a: 0.07, w: 260, col: '#b8c8f8' }, { x: MW.hook.x, a: 0.16, w: 140, col: WARM }], { sheen: 0.02, seed: 313 });
  // initials carved into a board out at the right end, long ago
  carved(ctx, 1712, 806);
  // the moon behind: a sheen along the back of the boards
  lightPool(ctx, MW.moon.x + 200, TY + 30, 900, 70, '#a8b8f0', 0.14, 'screen');
  lightPool(ctx, MW.hook.x - 40, 820, 520, 120, WARM, 0.2, 'screen');
  lightPool(ctx, MW.hook.x + 40, TY + 30, 260, 40, '#ffc478', 0.16, 'screen');
  // calm under the pizzas
  const g = ctx.createRadialGradient(VX, 900, 100, VX, 900, 860);
  g.addColorStop(0, 'rgba(6,8,18,0.2)');
  g.addColorStop(1, 'rgba(6,8,18,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, TY, W, front - TY);
  // the back edge falls into the shade of the trees
  vfill(ctx, 0, TY, W, 80, [[0, 'rgba(4,6,14,0.55)'], [0.4, 'rgba(4,6,14,0.18)'], [1, 'rgba(4,6,14,0)']]);
  ctx.restore();
  tableFalloff(ctx, front, 0.68, '#02040c');
  tableSeam(ctx, 0.65, '#04060c', false);
  // the front: the boards' ends, end grain, a gap between each
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, front, W, 1080 - front);
  ctx.clip();
  vfill(ctx, 0, front, W, 1080 - front, [[0, '#4a4844'], [0.2, '#2e2c2a'], [1, '#121110']]);
  grain(ctx, { x: 0, y: front, w: W, h: 1080 - front }, 'wood', 0.5, 1);
  for (let i = -9; i <= 9; i++) {
    const x = xAt(i * 0.24, zf);
    ctx.fillStyle = 'rgba(4,4,8,0.85)';
    ctx.fillRect(x - 2, front, 4, 1080 - front);
    ctx.fillStyle = rgba('#c8d0e8', 0.12);
    ctx.fillRect(x + 2, front, 1.5, 1080 - front);
  }
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = '#5a6488';
  ctx.fillRect(0, front, W, 1080 - front);
  ctx.globalCompositeOperation = 'source-over';
  lightPool(ctx, MW.hook.x - 60, front + 14, 360, 26, WARM, 0.14, 'screen');
  ctx.restore();
  // the boards' lit front arris
  ctx.fillStyle = rgba('#c8d0e8', 0.24);
  ctx.fillRect(0, front - 1, W, 2);
}

// ——— grade and shade ———

function grade(ctx: Ctx): void {
  gradeAll(ctx, 0.06, '#8a9ee0', 0.06, { warm: '#c8d4ff', cool: '#3a48a8', a: 0.18 });
}

function shadeOver(ctx: Ctx): void {
  // calm under the HUD and the boss bar: the top of the sky into the dark
  vfill(ctx, 0, 0, W, 240, [[0, 'rgba(2,3,10,0.55)'], [1, 'rgba(2,3,10,0)']]);
  calmLanes(ctx, 0.12, '#04060e', 120, 700);
  vignetteAll(ctx, 0.82, '#01020a');
}

// ——— the stack ———

const TR_BOX: Box = { x: MW.tr.x0 - 40, y: MW.flue.top - 6, w: MW.tr.x1 - MW.tr.x0 + 120, h: MW.tr.base - MW.flue.top + 52 };
const TRUNK_BOX = (t: { x: number; w: number }): Box => ({ x: t.x - t.w - 40, y: -12, w: t.w * 2 + 80, h: TY + 40 });
const LIMB_BOX: Box = { x: MW.limb.x1 - 40, y: MW.limb.y1 - 50, w: MW.limb.x0 - MW.limb.x1 + 80, h: MW.limb.y0 - MW.limb.y1 + 100 };
const FOG_BOX: Box = { x: 0, y: BANKS[0].y - 10, w: W, h: TY - BANKS[0].y + 10 };
const SMOKE_BOX: Box = { x: MW.flue.x - SMOKE_W / 2 - 10, y: MW.flue.top - SMOKE_H, w: SMOKE_W + 20, h: SMOKE_H + 22 };

export const WOODS: SceneSpec = {
  id: 'bigfoot',
  info: {
    name: 'Moonlit Woods',
    subtitle: 'Boss: BIGFOOT',
    ambient: [],
    glows: [
      { x: MW.hook.x, y: MW.hook.y + LT.flame - 10, r: 200, color: '#ffb050', flicker: 0.35 },
      { x: MW.win.x + MW.win.w / 2, y: MW.win.top + 30, r: 90, color: '#ffb060', flicker: 0.05 },
    ],
    light: '#a8c0ff',
    tableTint: '#dde6ff',
  },
  layers: [
    { id: 'sky', box: { x: 0, y: 0, w: W, h: MW.ridge + 40 }, draw: sky },
    { id: 'ridge', box: { x: 0, y: 380, w: W, h: 240 }, draw: ridge },
    { id: 'ranks', box: { x: 0, y: 340, w: W, h: MW.floor - 340 + 20 }, draw: ranks },
    { id: 'trattoria', box: TR_BOX, draw: trattoria },
    { id: 'ground', box: { x: 0, y: MW.floor - 40, w: W, h: TY - MW.floor + 50 }, draw: ground },
    { id: 'firs', box: { x: 380, y: 100, w: 1440, h: TY - 100 }, draw: midFirs },
    { id: 'trunkL', box: TRUNK_BOX(MW.trunkL), draw: (c, r) => trunk(c, r, MW.trunkL.x, MW.trunkL.w, -10, 41) },
    { id: 'trunkR', box: TRUNK_BOX(MW.trunkR), draw: (c, r) => trunk(c, r, MW.trunkR.x, MW.trunkR.w, 14, 73) },
    { id: 'limb', box: LIMB_BOX, draw: limb },
    { id: 'lanternLight', box: { x: MW.hook.x - 260, y: MW.hook.y - 140, w: 560, h: TY - MW.hook.y + 160 }, draw: (c) => lanternLight(c) },
    // the mist and the flue's smoke (painted in the still; rolled and curled live)
    { id: 'fogStill', box: FOG_BOX, stillOnly: true, draw: (c) => fogStill(c) },
    { id: 'fog', box: FOG_BOX, motion: 'slot', draw: () => {} },
    { id: 'smokeStill', box: SMOKE_BOX, stillOnly: true, draw: (c) => smokeStill(c) },
    { id: 'smoke', box: SMOKE_BOX, motion: 'slot', draw: () => {} },
    { id: 'lantern', box: LANTERN_BOX, motion: 'sprite', draw: (c) => lantern(c, MW.hook.x, MW.hook.y) },
    { id: 'lanternFlame', box: LANTERN_BOX, stillOnly: true, draw: (c) => lanternFlameStill(c) },
    { id: 'boughL', box: BOUGH_L, motion: 'sprite', draw: (c, r) => bough(c, r, MW.boughL.x, MW.boughL.y, 1, 270) },
    { id: 'boughR', box: BOUGH_R, motion: 'sprite', draw: (c, r) => bough(c, r, MW.boughR.x, MW.boughR.y, -1, 400) },
    { id: 'table', box: { x: 0, y: TY, w: W, h: 1080 - TY }, draw: table },
    // the kitchen window's light in the mist in front of it (live: a glow over the rolling banks)
    { id: 'winMist', box: { x: MW.win.x - 160, y: MW.win.top - 60, w: MW.win.w + 320, h: 200 }, stillOnly: true, draw: (c) => lightPool(c, MW.win.x + MW.win.w / 2, MW.tr.base, 150, 50, '#ffa050', 0.16) },
    { id: 'flies', box: { x: 0, y: 500, w: W, h: 260 }, stillOnly: true, draw: (c) => fliesStill(c) },
    { id: 'night', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

// ——— live ———

registerKitScene(WOODS, (k: KitLive) => {
  const clamp = Phaser.Math.Clamp;
  const top = k.slot('night');
  const fogSlot = k.slot('fog');
  const smokeSlot = k.slot('smoke');
  const { x: hx, y: hy } = MW.hook;

  // ——— hero: the mist, rolling banks at two depths ———
  const FN = 8;
  const banks = BANKS.map((b, bi) => {
    const key = sheet(k, `mw_fog${bi}`, FOG_W, FOG_H, FN, (c, ph) => fogFrame(c, ph, b.seed, b.a));
    const tiles = [0, 1, 2].map(() => new Loop(k, key, FN, 0, b.y, { into: fogSlot, origin: [0, 0], scale: FOG_K, fps: 0.9 + bi * 0.3, phase: bi * 3 }));
    return { ...b, tiles, off: -bi * 300, v: (7 + bi * 6) * (bi ? 1 : -1) };
  });
  const TILE = FOG_W * FOG_K;
  const puffs = new Parts(k, { frame: 'puff', into: fogSlot, max: 40 });

  // ——— the flue's smoke ———
  const SN = 8;
  const smokeKey = sheet(k, 'mw_smoke', SMOKE_W, SMOKE_H, SN, (c, ph) => smokeFrame(c, SMOKE_W, SMOKE_H, ph, smokeOpts));
  const smoke = new Loop(k, smokeKey, SN, MW.flue.x, MW.flue.top + 16, { into: smokeSlot, origin: [0.5, 1], fps: 4 });

  // ——— hero: the lantern ———
  const lant = k.pivot(k.sprite('lantern'), hx, hy);
  const swing = new Swing(lant, { k: 5.2, c: 0.35, idle: 0.03, seed: 1.3, speed: 0.6 });
  const FW = 28;
  const FH = 44;
  const flameKey = sheet(k, 'mw_flame', FW, FH, 8, (c, ph) => fireFrame(c, FW / 2, FH - 3, 10, 26, ph, { tongues: 2, cols: ['#ff7a22', '#ffc450', '#fff8e0'], seed: 2 }));
  const flame = new Loop(k, flameKey, 8, hx, hy + LT.flame + 3, { into: top, origin: [0.5, (FH - 3) / FH], add: true, fps: 10 });
  const core = k.glow(hx, hy + LT.flame - 8, 40, 0xffd890, 0.5, { into: top });
  const halo = k.glow(hx, hy + LT.flame - 8, 170, 0xff9a40, 0.16, { into: top });
  const groundPool = k.glow(hx + 20, MW.floor + 62, 240, 0xffa850, 0.12, { into: top, sy: 0.14 });
  const barkPool = k.glow(MW.trunkR.x - MW.trunkR.w * 0.42, hy + LT.flame, 120, 0xff9a40, 0.08, { into: top, sy: 1.8 });
  // the kitchen window's light in the mist in front of it
  k.glow(MW.win.x + MW.win.w / 2, MW.tr.base, 150, 0xffa050, 0.16, { into: top, sy: 0.34 });
  const flameS = new Spring(0, 34, 5);
  let gut = 0;
  let flare = 0;

  // moths round the lantern: painted wing beats (wings up, level, down, swept)
  const MN = 6;
  const mothKey = sheet(k, 'mw_moth', 24, 20, MN, (c, ph) => {
    const beat = Math.cos(ph * P2);
    for (const side of [-1, 1]) {
      c.save();
      c.translate(12, 10);
      c.scale(side, 1);
      c.rotate(-beat * 0.7);
      const g = c.createLinearGradient(0, 0, 10, 0);
      g.addColorStop(0, '#d8c8a8');
      g.addColorStop(1, '#f4ead4');
      c.fillStyle = g;
      c.beginPath();
      c.ellipse(5.5, -1, 6, 4 * (0.45 + Math.abs(beat) * 0.55), -0.25, 0, P2);
      c.fill();
      c.fillStyle = 'rgba(120,96,70,0.6)';
      c.beginPath();
      c.ellipse(4, 2.5, 3.5, 2.2, 0.3, 0, P2);
      c.fill();
      c.restore();
    }
    c.fillStyle = '#5a4634';
    c.beginPath();
    c.ellipse(12, 11, 1.6, 4, 0, 0, P2);
    c.fill();
  });
  const moths = Array.from({ length: 4 }, (_, i) => ({
    loop: new Loop(k, mothKey, MN, hx, hy, { into: top, fps: 22 + i * 3, scale: 0.75 }),
    seed: i * 1.9 + crand() * 3,
    rad: 26 + crand() * 22,
    sp: 1.6 + crand() * 1.2,
    fling: 0,
  }));

  // ——— hero: the canopy (the boughs on their hinges), cones and needles shaken down ———
  const bL = new Swing(k.pivot(k.sprite('boughL'), MW.boughL.x, MW.boughL.y), { k: 7, c: 1.4, idle: 0.012, seed: 0.4, speed: 0.5 });
  const bR = new Swing(k.pivot(k.sprite('boughR'), MW.boughR.x, MW.boughR.y), { k: 6, c: 1.3, idle: 0.014, seed: 2.2, speed: 0.45 });
  const coneKey = sheet(k, 'mw_cone', 24, 24, 4, (c, _ph, i) => {
    let s = 17 + i * 13;
    const rr = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const L = 8 + rr() * 2;
    c.save();
    c.translate(12, 12);
    c.rotate(rr() * P2);
    const g = c.createRadialGradient(-2, -3, 0, 0, 0, L);
    g.addColorStop(0, '#8a6a50');
    g.addColorStop(0.6, '#4a3424');
    g.addColorStop(1, '#1e140e');
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(0, 0, L * 0.55, L, 0, 0, P2);
    c.fill();
    // its scales: rows of lit lips
    c.strokeStyle = 'rgba(200,170,130,0.55)';
    c.lineWidth = 1;
    for (let j = -3; j <= 3; j++) {
      c.beginPath();
      c.arc(0, j * L * 0.26, L * 0.5 * (1 - Math.abs(j) * 0.12), Math.PI * 1.1, Math.PI * 1.9);
      c.stroke();
    }
    c.strokeStyle = 'rgba(10,6,4,0.6)';
    c.beginPath();
    c.ellipse(0, 0, L * 0.55, L, 0, 0, P2);
    c.stroke();
    c.restore();
  });
  const sprigKey = sheet(k, 'mw_sprig', 24, 24, 4, (c, _ph, i) => {
    c.save();
    c.translate(12, 12);
    c.rotate(i * 0.8);
    c.strokeStyle = '#2a3a30';
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(-9, 0);
    c.lineTo(9, 0);
    c.stroke();
    for (let j = -4; j <= 4; j++) {
      c.strokeStyle = j % 2 ? '#3e5a4e' : '#5a7a6a';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(j * 2, 0);
      c.lineTo(j * 2 + 3, -5);
      c.moveTo(j * 2, 0);
      c.lineTo(j * 2 + 3, 5);
      c.stroke();
    }
    c.restore();
  });
  const cones = new Parts(k, { frame: 'mote', sheet: { key: coneKey, n: 4, half: 12 }, into: top, max: 24 });
  const sprigs = new Parts(k, { frame: 'mote', sheet: { key: sprigKey, n: 4, half: 12 }, into: top, max: 60 });
  const dust = new Parts(k, { frame: 'mote', into: top, max: 60 });

  // ——— fireflies ———
  type Fly = { x: number; y: number; vx: number; vy: number; ph: number; rate: number; core: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Image };
  const flyKey = k.tex('mw_fly', 32, 32, (c) => firefly(c, 16, 16, 1));
  const flies: Fly[] = Array.from({ length: 14 }, () => {
    const x = crand() < 0.5 ? 220 + crand() * 520 : 1180 + crand() * 600;
    return {
      x,
      y: 540 + crand() * 200,
      vx: (crand() - 0.5) * 24,
      vy: (crand() - 0.5) * 12,
      ph: crand() * 10,
      rate: 0.5 + crand() * 0.5,
      core: k.img(flyKey, x, 0, { into: top, add: true, scale: 0.7, alpha: 0 }),
      glow: k.glow(x, 0, 26, 0x9adf5a, 0, { into: top }),
    };
  });

  /** The flame's place as the lantern swings (the globe hangs below the hook). */
  const flameAt = (a: number) => ({ x: hx - Math.sin(a) * LT.flame, y: hy + Math.cos(a) * LT.flame });

  return {
    impact(x, _y, p) {
      // the lantern swings away from the stomp, the flame ducks
      swing.kick((x < hx ? 1 : -1) * -(0.9 + crand() * 0.3) * p);
      flameS.v -= 6 * p;
      gut = Math.max(gut, 0.3 + p * 0.5);
      for (const m of moths) m.fling = Math.max(m.fling, 0.6 + crand() * 0.6 * p);
      // the boughs shake
      bL.kick((0.18 + crand() * 0.06) * p);
      bR.kick(-(0.16 + crand() * 0.06) * p);
      // cones and needles shaken down out of the boughs (and off the limb), landing on the table at their depth
      const drop = (x0: number, x1: number, y0: number, y1: number, n: number) => {
        for (let i = 0; i < n; i++) {
          const sx = x0 + crand() * (x1 - x0);
          const sy = y0 + crand() * (y1 - y0);
          const floor = TY + 14 + crand() * 240;
          if (crand() < 0.35)
            cones.spawn({ x: sx, y: sy, vx: (crand() - 0.5) * 80, vy: 40 + crand() * 60, life: 3.2, r0: 9 + crand() * 3 * (floor - TY) / 240, a: 1, tint: 0xb8b8d0, grav: 1300, floor, bounce: 0.38, spin: (crand() - 0.5) * 10, fade: 0.02 });
          else sprigs.spawn({ x: sx, y: sy, vx: (crand() - 0.5) * 50, vy: 10 + crand() * 30, life: 3 + crand() * 1.5, r0: 8 + crand() * 4, a: 0.9, tint: 0x9aa8c8, grav: 120, drag: 1.4, spin: (crand() - 0.5) * 4, fade: 0.05 });
        }
      };
      drop(60, 560, 60, 230, Math.round(3 + p * 7));
      drop(1420, 1880, 70, 250, Math.round(3 + p * 7));
      drop(MW.limb.x1, MW.limb.x0, MW.limb.y1 - 10, MW.limb.y0, Math.round(1 + p * 3));
      // bark dust off the limb, lit by the lantern
      for (let i = 0; i < 4 + p * 10; i++) dust.spawn({ x: MW.limb.x1 + crand() * (MW.limb.x0 - MW.limb.x1), y: MW.limb.y1 + 8 + crand() * 20, vx: (crand() - 0.5) * 20, vy: 10 + crand() * 20, life: 2 + crand() * 1.2, r0: 1.5 + crand() * 1.5, a: 0.7, tint: 0xffc890, grav: 50, drag: 1, fade: 0.05 });
      // a roll of mist pushed out along the ground from the table's back edge
      for (let i = 0; i < 6 + p * 8; i++) {
        const dir = crand() < 0.5 ? -1 : 1;
        const px = x + dir * crand() * 260;
        puffs.spawn({ x: px, y: TY - 14 - crand() * 26, vx: dir * (90 + crand() * 160) * p, vy: -6 - crand() * 10, life: 2.4 + crand() * 1.2, r0: 30, r1: 110 + crand() * 60, a: 0.13 + p * 0.06, tint: 0xb4c4ee, drag: 1.3, fade: 0.12 });
      }
      // the fireflies scatter
      for (const f of flies) {
        const d = Math.sign(f.x - x) || 1;
        f.vx += d * (40 + crand() * 80) * p;
        f.vy -= (20 + crand() * 40) * p;
      }
    },
    update(dt, t) {
      const cm = calm();
      // ——— the mist
      for (const b of banks) {
        b.off = (((b.off + b.v * dt * cm) % TILE) + TILE) % TILE;
        b.tiles.forEach((lp, i) => {
          const x = b.off + (i - 1) * TILE;
          lp.each((im) => im.setX(x));
          lp.alpha = 0.85 + wander(t * 0.12, b.seed) * 0.15;
          lp.step(dt, cm);
        });
      }
      puffs.update(dt);
      // ——— the smoke
      smoke.step(dt, cm);
      // ——— the lantern
      swing.update(dt, t);
      const a = swing.angle;
      const fp = flameAt(a);
      gut = Math.max(0, gut - dt * 1.1);
      flare = gut > 0.08 ? Math.max(flare, 1 - gut) : Math.max(0, flare - dt * 0.9);
      const g = Phaser.Math.Easing.Quadratic.Out(clamp(gut / 0.6, 0, 1));
      const sq = flameS.step(0, dt);
      const n = flicker(t, 3.1);
      flame.step(dt, (1 + flare * 0.5) * cm);
      // a flame stays upright as its lantern swings, leaning back against the motion
      flame.each((im) => im.setPosition(fp.x, fp.y + 3).setRotation(clamp(-swing.vel * 0.08, -0.5, 0.5)).setScale(1 + sq * 0.1, Math.max(0.4, 1 + sq * 0.3 - g * 0.45 + flare * 0.15 + (n - 0.9) * 0.4)));
      flame.alpha = 1 - g * 0.35;
      const light = (1 - g * 0.45) * (0.88 + n * 0.12) * (1 + flare * 0.15);
      core.setPosition(fp.x, fp.y - 8).setAlpha(0.42 * light);
      halo.setPosition(fp.x, fp.y - 8).setAlpha(0.15 * light);
      // the pool on the ground swings wider than the lantern (the light is cast down and out)
      groundPool.setPosition(hx + 20 + (fp.x - hx) * 3.2, MW.floor + 62).setAlpha(0.12 * light);
      barkPool.setAlpha(0.08 * light * (1 + clamp((fp.x - hx) / 30, -0.6, 0.6)));
      // the moths circle it, flung wide by a knock and drawn back
      for (const m of moths) {
        m.fling = Math.max(0, m.fling - dt * 0.35);
        const th = t * m.sp + m.seed;
        const rad = m.rad * (1 + m.fling * 2.2);
        const z = Math.sin(th);
        const mx = fp.x + Math.cos(th) * rad;
        const my = fp.y - 14 + Math.sin(th * 1.7 + m.seed) * rad * 0.45 - m.fling * 30;
        m.loop.step(dt, cm);
        // behind the globe it dims (lit from the far side), in front it's lit
        m.loop.alpha = z < 0 && Math.abs(mx - fp.x) < 18 ? 0.25 : 0.85;
        m.loop.each((im) => im.setPosition(mx, my).setScale(0.55 + (z + 1) * 0.15).setRotation(Math.cos(th) * 0.4).setTint(z > 0 ? 0xffe0b0 : 0xb0a898));
      }
      // ——— the canopy
      bL.update(dt, t);
      bR.update(dt, t);
      cones.update(dt);
      sprigs.update(dt);
      dust.update(dt);
      // ——— fireflies: wandering, blinking (a slow rise, a quick fall), kept low and off the lanes
      for (const f of flies) {
        f.vx += (crand() - 0.5) * 50 * dt;
        f.vy += (crand() - 0.5) * 36 * dt;
        f.vx *= 1 - dt * 0.6;
        f.vy *= 1 - dt * 0.6;
        if (f.y < 520) f.vy += 30 * dt;
        if (f.y > TY - 12) f.vy -= 40 * dt;
        if (f.x > 800 && f.x < 1120) f.vx += (f.x < 960 ? -1 : 1) * 30 * dt;
        f.x += f.vx * dt * cm;
        f.y += f.vy * dt * cm;
        if (f.x < -20) f.x = W + 20;
        if (f.x > W + 20) f.x = -20;
        const ph = (t * f.rate + f.ph) % 3;
        const blink = ph < 0.6 ? Math.sin((ph / 0.6) * Math.PI * 0.5) : ph < 0.9 ? Math.cos(((ph - 0.6) / 0.3) * Math.PI * 0.5) : 0;
        f.core.setPosition(f.x, f.y).setAlpha(blink * 0.95);
        f.glow.setPosition(f.x, f.y).setAlpha(blink * 0.22);
      }
    },
  };
});

void mix;
void shade;
void aoHalo;
