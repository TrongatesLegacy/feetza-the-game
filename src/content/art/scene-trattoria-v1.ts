// Trattoria Nonna, as first redrawn with the location kit (before painted frame animation): kept for the
// before/after page (?dev&stages). The room the game shows is scene-trattoria.ts.
//
// Trattoria Nonna (Act 1, waves 1–4), redrawn with the location kit (src/art/scene): the first room players see.
// A lime-washed trattoria at the end of the day: the wood-fired oven roaring on the left, the FEETZA neon over the
// tables, green shutters open on an arched window to the street, the chalkboard menu, a shelf of bottles with garlic
// and chillies hanging under it, and the checked cloth. Live: the oven fire, its sparks and heat, the candles, the
// café curtains in the draught, the neon's buzz, dust in the lamplight, people and scooters passing in the street;
// across the stage's waves the street goes from a golden evening to night while the room glows warmer.

import Phaser from 'phaser';
import { CHALK, ROUND, logEnd, neonStroke, neonText, noFeetSign } from '../../art/backdrops';
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
import { type Reflect, board, bricks, broken, checkerCloth, clothDrape, grain, panel, plaster, tableFalloff, tableSeam, varnish, woodGrain } from '../../art/scene/materials';
import { chips, crack, drift, grime, lay, softly, streaks } from '../../art/scene/paint';
import { bottle, candle, drape, flameShape, glassPane, hang, herbPot, pendantLamp, wallShadow } from '../../art/scene/props';
import { ao, spec as specHi } from '../../art/style/kit';
import { MATERIALS } from '../../art/style/materials';
import { makeCanvas, mix, rgba, shade } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { save } from '../../systems/save';
import { type KitLive, calm, flicker, lerp, registerKitScene, sway, waveK, wander } from '../../game/sceneLive';

// ——— layout ———

const TN = {
  beam: 52,
  wainscot: 600,
  front: 1040,
  oven: { x: 280, mouthY: 600, archTop: 432, mouthHalf: 108, domeTop: 250 },
  flue: { x: 280, w: 54 },
  lamps: [610, 1312] as const,
  lampY: 290,
  neon: { x: 960, y: 196 },
  sign: { x: 960, y: 432 },
  shelf: { x0: 640, x1: 884, y: 470 },
  win: { x0: 1100, x1: 1340, top: 300, sill: 592, archY: 420 },
  board: { x: 1482, y: 196, w: 352, h: 352 },
  peel: { x: 586, y: 758 },
  candle: { x: 1792, y: 806 },
};

const ROOM: Air = { color: '#4a2a1c', far: 0.5 };
const STREET: Air = { color: '#a8b4d8', far: 0.6 };
const PLASTER = '#e2b27a';
const WALNUT = '#5e3520';
/** Lime plaster on a curved form: chalky, warm shadows, no veins. */
const LIME = { ...MATERIALS.stone, name: 'Lime plaster', shadowTint: '#7a3414', tex: 'grain' as const, texA: 0.3, rim: 0.3 };
const BRICK = ['#b5532f', '#a5452a', '#c0653a', '#93402a', '#b85c35', '#9e4b2e', '#c9713f'];

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

function street(ctx: Ctx, r: R, night: boolean): void {
  const { x0, x1, sill } = TN.win;
  const top = TN.win.archY - winR;
  ctx.save();
  winPath(0)(ctx);
  ctx.clip();
  // sky
  vfill(ctx, x0, top, x1 - x0, sill - top, night
    ? [[0, '#0e1230'], [0.6, '#232a5a'], [1, '#3a3462']]
    : [[0, '#6c7cc0'], [0.45, '#c99aa0'], [0.75, '#f2b27e'], [1, '#f8d494']]);
  if (night) {
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = rgba('#fff6dc', 0.4 + r() * 0.6);
      const s = r() < 0.15 ? 2.2 : 1.2;
      ctx.fillRect(x0 + r() * (x1 - x0), top + r() * 120, s, s);
    }
  } else {
    // a low warm sun glow behind the roofs (the street faces west), soft cloud bars
    glowAt(ctx, x0 + 60, sill - 120, 160, '#ffd49a', 0.5, 0.7);
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = rgba('#ffe0c0', 0.35);
      ctx.beginPath();
      ctx.ellipse(x0 + 40 + r() * 180, top + 70 + i * 34, 60 + r() * 50, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // far roofs and a dome (hazy, depth 0.9)
  const far = night ? '#2a2c50' : '#b8889a';
  ctx.fillStyle = far;
  ctx.beginPath();
  ctx.moveTo(x0, sill);
  ctx.lineTo(x0, 452);
  for (let x = x0; x <= x1; x += 26) ctx.lineTo(x, 446 + Math.sin(x * 0.09) * 6 + (r() - 0.5) * 8);
  ctx.lineTo(x1, sill);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x1 - 58, 432, 26, Math.PI, 0);
  ctx.rect(x1 - 84, 432, 52, 20);
  ctx.fill();
  ctx.fillRect(x1 - 60, 398, 4, 10);
  // the house across the street (mid, depth 0.7): ochre plaster, green shutters, a balcony with geraniums
  const facade = night ? '#3c3452' : '#d69a62';
  const fx0 = x0 + 18;
  const fx1 = x1 - 40;
  const ft = 470;
  ctx.fillStyle = facade;
  ctx.fillRect(fx0, ft, fx1 - fx0, sill - ft);
  broken(ctx, { x: fx0, y: ft, w: fx1 - fx0, h: sill - ft }, 0.4, 8, 5);
  ctx.fillStyle = night ? '#241e36' : '#a8683e';
  ctx.fillRect(fx0 - 6, ft - 8, fx1 - fx0 + 12, 9);
  for (const wx of [fx0 + 34, fx0 + 120]) {
    // a lit window with half-open shutters
    ctx.fillStyle = night ? '#ffcf6a' : '#f6c27a';
    ctx.fillRect(wx, ft + 30, 34, 50);
    if (night) glowAt(ctx, wx + 17, ft + 56, 40, '#ffb04a', 0.45);
    ctx.fillStyle = 'rgba(60,30,14,0.45)';
    ctx.fillRect(wx + 15, ft + 30, 3, 50);
    ctx.fillRect(wx, ft + 52, 34, 3);
    ctx.fillStyle = night ? '#1e3a34' : '#3f7a5a';
    ctx.fillRect(wx - 12, ft + 28, 11, 54);
    ctx.fillRect(wx + 35, ft + 28, 11, 54);
    // geraniums on the sill
    for (let k = 0; k < 6; k++) {
      ctx.fillStyle = night ? '#7a2a3a' : ['#e0403a', '#ff6a5a', '#c8282a'][k % 3];
      ctx.beginPath();
      ctx.arc(wx + 2 + k * 6, ft + 84 + (k % 2) * 2, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = night ? '#3a2a2a' : '#7a4426';
    ctx.fillRect(wx - 4, ft + 86, 42, 6);
  }
  // a street lamp on a bracket
  const lx = x1 - 26;
  ctx.strokeStyle = '#1e1612';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(fx1 + 6, 500);
  ctx.lineTo(lx, 500);
  ctx.lineTo(lx, 510);
  ctx.stroke();
  ctx.fillStyle = night ? '#fff0b0' : '#f6dca0';
  ctx.beginPath();
  ctx.moveTo(lx - 8, 510);
  ctx.lineTo(lx + 8, 510);
  ctx.lineTo(lx + 5, 526);
  ctx.lineTo(lx - 5, 526);
  ctx.closePath();
  ctx.fill();
  glowAt(ctx, lx, 520, night ? 70 : 26, '#ffd27a', night ? 0.7 : 0.3);
  // string lights across the street (night: lit)
  for (let i = 0; i <= 9; i++) {
    const t = i / 9;
    const x = x0 + t * (x1 - x0);
    const y = 486 + Math.sin(t * Math.PI) * 16;
    ctx.fillStyle = night ? '#ffe6a0' : '#8a7a6a';
    ctx.beginPath();
    ctx.arc(x, y, 2.2, 0, Math.PI * 2);
    ctx.fill();
    if (night) glowAt(ctx, x, y, 12, '#ffc870', 0.6);
  }
  // the street: cobbles in the last light
  vfill(ctx, x0, 566, x1 - x0, sill - 566, night ? [[0, '#2a2438'], [1, '#1a1626']] : [[0, '#a88468'], [1, '#7a5a48']]);
  ctx.strokeStyle = rgba(night ? '#000000' : '#4a3020', 0.35);
  ctx.lineWidth = 1;
  for (let y = 570; y < sill; y += 6) {
    for (let x = x0 + ((y / 6) % 2) * 5; x < x1; x += 10) {
      ctx.beginPath();
      ctx.ellipse(x, y, 4, 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  // seen through old glass and the room's air
  ctx.fillStyle = rgba(night ? '#202850' : STREET.color, night ? 0.12 : 0.16);
  ctx.fillRect(x0, top, x1 - x0, sill - top);
  ctx.restore();
}

// ——— the room ———

function wall(ctx: Ctx, r: R): void {
  const box = { x: 0, y: 0, w: W, h: TN.wainscot };
  plaster(ctx, r, box, PLASTER, { wash: 0.7, patina: 0.55, seed: 9, grime: { top: 90, left: 60, right: 90, a: 0.4 } });
  // years of the room: soot rising round the flue and spreading under the beam, the lamps' heat browning the
  // plaster over each shade, damp run down from the beam and from the ends of the window sill
  softly(ctx, { x: 0, y: 0, w: 1500, h: 420 }, (ctx) => {
  ctx.fillStyle = 'rgba(40,20,10,0.3)';
  ctx.beginPath();
  ctx.ellipse(TN.flue.x + 20, TN.beam + 30, 260, 70, 0, 0, Math.PI * 2);
  ctx.fill();
  // (the oven's smoke has climbed the wall over the dome for years: a tall sooty plume, darkest near the ceiling)
  const sg = ctx.createLinearGradient(0, 0, 0, TN.oven.domeTop + 40);
  sg.addColorStop(0, 'rgba(30,14,6,0.42)');
  sg.addColorStop(1, 'rgba(30,14,6,0)');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.ellipse(TN.oven.x + 10, 60, 250, 230, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const lx of TN.lamps) {
    ctx.fillStyle = 'rgba(110,60,20,0.16)';
    ctx.beginPath();
    ctx.ellipse(lx, TN.lampY - 100, 60, 90, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  }, 0.125);
  for (const [sx, sl] of [[1600, 130], [1890, 230], [430, 90]] as const) streaks(ctx, r, sx, TN.beam, 40, sl, '#6a3a1a', 0.14, 4);
  streaks(ctx, r, TN.win.x0 - 30, TN.win.sill + 14, 16, 70, '#6a4020', 0.18, 3);
  streaks(ctx, r, TN.win.x1 + 30, TN.win.sill + 14, 16, 60, '#6a4020', 0.18, 3);
  // cracks where a wall's stress gathers: off the corners of the window's arch and its sill, down from the beam
  const cr = { col: '#5a2a10', lip: '#fff0d0', w: 1.6, a: 0.5 };
  crack(ctx, r, TN.win.x1 + 58, TN.win.archY - winR * 0.62, -0.9, 90, cr);
  crack(ctx, r, TN.win.x0 - 46, TN.win.sill + 18, 2.2, 70, cr);
  crack(ctx, r, 1700, TN.beam + 4, 1.75, 110, cr);
  crack(ctx, r, 470, TN.beam + 4, 1.4, 60, cr);
  // the light: darker up under the ceiling, the oven's warmth on the left, the neon's pink spill
  vfill(ctx, 0, 0, W, TN.wainscot, [[0, 'rgba(40,14,4,0.62)'], [0.35, 'rgba(40,14,4,0.26)'], [1, 'rgba(40,14,4,0.34)']]);
  lightPool(ctx, TN.oven.x + 40, 420, 520, 360, '#ff9a4a', 0.16);
  lightPool(ctx, TN.neon.x, TN.neon.y, 520, 260, '#ff5aa8', 0.1);
  // the lamps throw their pools down the wall (the wall above each shade stays in its shade)
  for (const lx of TN.lamps) lampOnWall(ctx, lx, TN.lampY + 2, 72, { col: '#e8a868', a: 0.8, reach: 330, spread: 290, gap: 50, above: 0.35, op: 'lighter' });
  // the evening light from the window warms the wall round it a little (its reveal glows)
  lightPool(ctx, winCX, TN.win.sill - 60, 260, 200, '#ffb878', 0.08);
  // the ceiling beam: an oak beam, sooted, its underside in shadow, its lower arris catching the lamplight
  // the wall darkens down into the chair rail (the rail's shadow, and the dirt of hands)
  crevice(ctx, 0, W, TN.wainscot - 10, -46, 0.32);
  crevice(ctx, 0, W, TN.beam, 80, 0.55);
  board(ctx, r, 0, 0, W, TN.beam, '#4a2a18');
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, TN.beam);
  ctx.clip();
  lay(ctx, drift('#6a4028', '#1a0a06', 8, 41, 256, 16), { x: 0, y: 0, w: W, h: TN.beam }, 0.5);
  for (const x of [TN.flue.x, ...TN.lamps]) lightPool(ctx, x, TN.beam, 200, 20, '#ffcf8a', 0.18, 'screen');
  ctx.restore();
  ctx.fillStyle = rgba('#ffd8a0', 0.22);
  ctx.fillRect(0, TN.beam - 5, W, 2);
  ctx.fillStyle = 'rgba(20,8,2,0.75)';
  ctx.fillRect(0, TN.beam - 3, W, 3);
  // joints in the beam, and an iron strap here and there
  for (let x = 120; x < W; x += 340) {
    ctx.fillStyle = 'rgba(20,8,2,0.45)';
    ctx.fillRect(x - 2, 0, 3, TN.beam - 3);
    ctx.fillStyle = rgba('#ffd8a0', 0.1);
    ctx.fillRect(x + 1, 0, 1.5, TN.beam - 3);
  }
}

function windowFrame(ctx: Ctx, r: R): void {
  const { x0, x1, sill } = TN.win;
  // the reveal: the wall is thick; its inner face on the right catches the evening light coming in, the left one
  // and the soffit of the arch are in shade
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
  // painted cream frame, a cross of glazing bars
  const frameCol = '#efe2c4';
  const outer = winPath(-14);
  const inner = winPath(2);
  const framePath = (c: Ctx) => {
    c.beginPath();
    winPath(-14, true)(c);
    winPath(2, true)(c);
  };
  // the frame casts its shadow on the wall round it (not into the opening, which is open air)
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
  ctx.restore();
  ctx.save();
  ctx.lineWidth = lineAt(0.15);
  ctx.strokeStyle = mix(shade(frameCol, -0.6), '#22130b', 0.5);
  outer(ctx);
  ctx.stroke();
  inner(ctx);
  ctx.stroke();
  ctx.restore();
  // the old glass over the street: the room reflected in it (soft sheen bands, the right lamp's glow), a little
  // grime in the corners of the panes
  glassPane(ctx, inner, { x: x0, y: TN.win.top, w: x1 - x0, h: sill - TN.win.top }, { sheen: 0.12, reflect: [TN.lamps[1] - 20, TN.lampY + 60, 90, '#ffd8a0'], dirt: 0.22 });
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
  ctx.restore();
  // the sill: a stone ledge (its top lit, its front face in shade) with a basil pot, damp dark under its ends
  const sillPath = rrPath(x0 - 30, sill - 4, x1 - x0 + 60, 20, 3);
  castShadow(ctx, sillPath, 14, 14, 0.5);
  solid(ctx, sillPath, { x: x0 - 30, y: sill - 4, w: x1 - x0 + 60, h: 20 }, 'stone', '#d8c8a8', { depth: 0.15, formSize: 6 });
  vfill(ctx, x0 - 28, sill + 5, x1 - x0 + 56, 10, [[0, 'rgba(60,40,20,0.1)'], [1, 'rgba(60,40,20,0.35)']]);
  ctx.fillStyle = rgba('#fff4dc', 0.5);
  ctx.fillRect(x0 - 28, sill - 3, x1 - x0 + 56, 1.5);
  chips(ctx, r, x0 - 20, x1 + 20, sill + 5, 6, '#d8c8a8', 2.5);
  herbPot(ctx, r, x0 + 40, sill - 2, 1);
}

/** Green louvred shutters folded back against the wall either side of the window. */
function shutters(ctx: Ctx): void {
  const { x0, x1, sill } = TN.win;
  for (const side of [-1, 1]) {
    const sx = side < 0 ? x0 - 84 : x1 + 18;
    const sw = 66;
    const st = TN.win.top + 10;
    const sh = sill - st - 6;
    const p = rrPath(sx, st, sw, sh, 4);
    castShadow(ctx, p, 9, 10, 0.45);
    solid(ctx, p, { x: sx, y: st, w: sw, h: sh }, 'wood', '#3f7a5a', { depth: 0.15, formSize: 10 });
    within(ctx, p, () => {
      // louvres: tilted slats, each lit along its top edge, falling into shade towards the gap under it
      for (let y = st + 14; y < st + sh - 14; y += 13) {
        const g = ctx.createLinearGradient(0, y, 0, y + 11);
        g.addColorStop(0, shade('#3f7a5a', 0.28));
        g.addColorStop(0.5, '#3f7a5a');
        g.addColorStop(1, shade('#3f7a5a', -0.35));
        ctx.fillStyle = g;
        ctx.fillRect(sx + 8, y, sw - 16, 11);
        ctx.fillStyle = 'rgba(8,24,14,0.75)';
        ctx.fillRect(sx + 8, y + 11, sw - 16, 2);
      }
      ctx.strokeStyle = 'rgba(14,40,24,0.6)';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx + 7, st + 8, sw - 14, sh - 16);
      broken(ctx, { x: sx, y: st, w: sw, h: sh }, 0.5, 6, 31);
    });
  }
}

/** Red and white gingham curtains on a brass rod at the arch's spring, tied back to the sides of the window. */
function curtains(ctx: Ctx, r: R): void {
  const { x0, x1, sill } = TN.win;
  const top = TN.win.archY - 6;
  const tieY = 516;
  const rod = rrPath(x0 - 14, top - 7, x1 - x0 + 28, 7, 3);
  solid(ctx, rod, { x: x0 - 14, y: top - 7, w: x1 - x0 + 28, h: 7 }, 'chrome', '#c8984a', { depth: 0.12, line: 2 });
  for (const side of [-1, 1]) {
    const e = side < 0 ? x0 - 4 : x1 + 4;
    const d = -side;
    const path = (c: Ctx) => {
      c.beginPath();
      c.moveTo(e, top);
      c.lineTo(e + d * 74, top);
      c.bezierCurveTo(e + d * 70, top + 50, e + d * 36, tieY - 20, e + d * 30, tieY);
      c.bezierCurveTo(e + d * 40, tieY + 30, e + d * 66, sill - 30, e + d * 70, sill - 4);
      for (let k = 0; k <= 6; k++) c.lineTo(e + d * (70 - k * 11.7), sill - 4 + Math.sin(k * 1.7) * 3);
      c.closePath();
    };
    const bx = side < 0 ? e : e - 80;
    const cbox = { x: bx, y: top, w: 80, h: sill - top };
    castShadow(ctx, path, 6, 8, 0.3);
    drape(ctx, path, cbox, '#f4ecd8', {
      fold: 20,
      depth: 0.8,
      phase: side < 0 ? 0 : 1.4,
      gather: [e + d * 30, tieY, 0.7],
      // the gingham, bending with the folds
      pattern: (c, fold) => {
        c.fillStyle = rgba('#c0302a', 0.5);
        for (let x = bx; x < bx + 80; x += 2) {
          for (let y = top; y < sill; y += 7) {
            const off = fold(x, y) * 3;
            const vOn = ((((x + off - bx) % 14) + 14) % 14) < 7;
            const hOn = (((y - top) / 7) | 0) % 2 === 0;
            if (vOn || hOn) c.fillRect(x, y, 2, 7);
            if (vOn && hOn) c.fillRect(x, y, 2, 7);
          }
        }
      },
      through: ['#ffd8a0', 0.22 * (side < 0 ? 1 : 0.6)],
    });
    within(ctx, path, () => crevice(ctx, bx, bx + 80, tieY - 4, 20, 0.35));
    rim(ctx, path, 0.35, 2);
    ctx.lineWidth = lineAt(0.12) * 0.7;
    ctx.strokeStyle = 'rgba(60,16,10,0.75)';
    path(ctx);
    ctx.stroke();
    // the tie-back
    const tie = rrPath(e + d * 30 - 18, tieY - 6, 36, 12, 5);
    solid(ctx, tie, { x: e + d * 30 - 18, y: tieY - 6, w: 36, h: 12 }, 'canvas', '#b2302a', { depth: 0.12, line: 1.6, formSize: 3 });
    // rings on the rod
    for (let k = 0; k < 4; k++) {
      ctx.strokeStyle = '#8a6430';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(e + d * (8 + k * 20), top - 4, 4, 6, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  void r;
}

function wainscot(ctx: Ctx, r: R): void {
  const y0 = TN.wainscot;
  const y1 = TY;
  // the frame (rails and stiles), the grain running along each piece
  board(ctx, r, 0, y0, W, y1 - y0, WALNUT);
  const reflections: Reflect[] = [
    ...TN.lamps.map((x) => ({ x, a: 0.2, w: 34, col: '#ffe0a8' })),
    { x: TN.oven.x + 60, a: 0.16, w: 60, col: '#ff9a50' },
    { x: winCX, a: 0.1, w: 30, col: '#ffc890' },
  ];
  const pw = 230;
  const gap = 30;
  for (let x = -60 + gap; x < W; x += pw + gap) {
    // the stile between panels: vertical grain, its own varnish
    board(ctx, r, x - gap, y0 + 14, gap, y1 - y0 - 14, shade(WALNUT, 0.04), true);
    panel(ctx, r, x, y0 + 36, pw, y1 - y0 - 58, WALNUT, { bevel: 16, lights: reflections, vertical: false });
  }
  varnish(ctx, { x: 0, y: y0, w: W, h: y1 - y0 }, reflections.map((l) => ({ ...l, a: (l.a ?? 0.3) * 0.5 })), { sheen: 0.05 });
  // the chair rail: a moulding with a lit roundover on top, a cove in shadow, a fillet catching the light
  const rail = rectPath(0, y0 - 10, W, 26);
  solid(ctx, rail, { x: 0, y: y0 - 10, w: W, h: 26 }, 'wood', shade(WALNUT, 0.1), { depth: 0.2, line: false, formSize: 8 });
  vfill(ctx, 0, y0 - 10, W, 26, [[0, rgba('#ffe0b0', 0.4)], [0.18, rgba('#ffe0b0', 0.08)], [0.45, 'rgba(20,8,2,0.4)'], [0.62, 'rgba(20,8,2,0.1)'], [0.7, rgba('#ffe0b0', 0.2)], [0.8, 'rgba(20,8,2,0.25)'], [1, 'rgba(20,8,2,0.6)']]);
  varnish(ctx, { x: 0, y: y0 - 10, w: W, h: 10 }, reflections.map((l) => ({ ...l, w: (l.w ?? 50) * 2.4, a: (l.a ?? 0.3) * 1.2 })), { sheen: 0, vertical: false });
  crevice(ctx, 0, W, y0 + 16, 28, 0.5);
  crevice(ctx, 0, W, y0 - 10, -12, 0.25);
  // wear: chairs scuffing the panels, darker towards the floor; the corners grimier
  grime(ctx, { x: 0, y: y0, w: W, h: y1 - y0 }, { bottom: 90, left: 120, right: 160, a: 0.45, patchy: 0.5, seed: 13, col: '#140804' });
  chips(ctx, r, 0, W, y0 - 9, 22, WALNUT, 2.5);
  // the table's back edge throws the panelling behind it into shade, and the cloth bounces its warm red up
  crevice(ctx, 0, W, y1, -70, 0.38);
  bounceBand(ctx, 0, W, y1, -50, '#ff8a6a', 0.1);
  // the lamps reach down here too
  for (const lx of TN.lamps) lightPool(ctx, lx, y1 - 70, 280, 100, '#ffcf8a', 0.12);
}

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
    ctx.arc(bx + 2, y + 54, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#2a2422';
    ctx.fill();
  }
  // the bottles sit in a little occlusion against the wall
  aoHalo(ctx, rectPath(x0 + 10, y - 90, x1 - x0 - 60, 86), 18, 0.28, '#3a1a0a', 6);
  // bottles and jars, standing on the board
  const items: [number, number, string, NonNullable<Parameters<typeof bottle>[5]>][] = [
    [x0 + 28, 92, '#2a4a1a', { kind: 'wine', cork: '#c89a6a', label: '#e8dcc0' }],
    [x0 + 64, 70, '#c8a02a', { kind: 'oil', cork: '#2a1a10' }],
    [x0 + 106, 54, '#d8c8a8', { kind: 'jar', cork: '#8a6040' }],
    [x0 + 150, 88, '#5a1a20', { kind: 'wine', cork: '#c89a6a', label: '#f0e0b8' }],
    [x0 + 196, 60, '#9ab8a0', { kind: 'jar', cork: '#8a6040' }],
  ];
  const sh = rectPath(x0, y - 4, x1 - x0, 14);
  castShadow(ctx, sh, 14, 14, 0.5);
  // each bottle's soft shadow on the wall behind it, thrown down and right
  for (const [bx, h, , o] of items) {
    const w = o.kind === 'jar' ? h * 0.62 : o.kind === 'oil' ? h * 0.3 : h * 0.26;
    castShadow(ctx, rrPath(bx - w / 2, y - 3 - h, w, h, w * 0.3), 10, 8, 0.35);
  }
  for (const [bx, h, col, o] of items) {
    bottle(ctx, bx, y - 3, h, col, { ...o, depth: 0.22, air: ROOM });
    if (o?.kind === 'jar') {
      // what's in the jars: pasta and peppers
      within(ctx, rrPath(bx - h * 0.28, y - h * 0.8, h * 0.56, h * 0.74, 4), () => {
        for (let i = 0; i < 14; i++) {
          ctx.fillStyle = col === '#d8c8a8' ? rgba('#f0c870', 0.8) : rgba('#d83a2a', 0.75);
          ctx.beginPath();
          ctx.ellipse(bx + (r() - 0.5) * h * 0.4, y - 6 - r() * h * 0.6, 5, 2.5, r() * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }
  }
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
  // the lamp's light on what stands on the shelf
  lightPool(ctx, TN.lamps[0] + 40, y - 40, 140, 70, '#ffd89a', 0.14, 'screen');
  // garlic and chillies hanging from the brackets
  castShadow(ctx, rrPath(x0 + 10, y + 16, 32, 100, 12), 10, 10, 0.35);
  castShadow(ctx, rrPath(x1 - 40, y + 16, 32, 120, 12), 10, 10, 0.3);
  garlicBraid(ctx, r, x0 + 26, y + 16);
  ristra(ctx, r, x1 - 24, y + 16);
}

function garlicBraid(ctx: Ctx, r: R, x: number, y: number): void {
  hang(ctx, x, y - 6, x, y + 16, 0, '#c8a060', 2.5);
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
    }
  }
}

function ristra(ctx: Ctx, r: R, x: number, y: number): void {
  hang(ctx, x, y - 6, x, y + 110, 0, '#c8a060', 2);
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
    solid(ctx, pepper, { x: cx - len, y: cy - len, w: len * 2, h: len * 2 }, 'enamel', shade('#c8241a', (r() - 0.5) * 0.25), { depth: 0.18, line: 1.4, formSize: 4 });
    ctx.fillStyle = '#3a6a1e';
    ctx.fillRect(cx - 2, cy - 2, 4, 4);
  }
}

function sign(ctx: Ctx): void {
  const { x, y } = TN.sign;
  hang(ctx, x - 50, y - 86, x, y - 120, 0, '#3a2a1a', 2);
  hang(ctx, x + 50, y - 86, x, y - 120, 0, '#3a2a1a', 2);
  ctx.fillStyle = '#2a1a10';
  ctx.beginPath();
  ctx.arc(x, y - 120, 4, 0, Math.PI * 2);
  ctx.fill();
  wallShadow(ctx, rrPath(x - 75, y - 85, 150, 170, 8), 14, 16, 0.5);
  ctx.save();
  noFeetSign(ctx, x, y, 150, 170, 0, false);
  ctx.restore();
  specHi(ctx, x - 40, y - 60, 50, 20, 0.25, -0.6);
}

function chalkboard(ctx: Ctx, r: R): void {
  const { x, y, w, h } = TN.board;
  const frame = rrPath(x, y, w, h, 10);
  castShadow(ctx, frame, 16, 20, 0.5);
  solid(ctx, frame, { x, y, w, h }, 'wood', '#6a4024', { depth: 0.18, formSize: 22 });
  within(ctx, frame, () => woodGrain(ctx, r, { x, y, w, h }, '#6a4024', false, 0.6));
  const sl = rrPath(x + 22, y + 22, w - 44, h - 44, 4);
  ctx.save();
  sl(ctx);
  ctx.clip();
  vfill(ctx, x, y, w, h, [[0, '#2c3e34'], [1, '#1e2c26']]);
  broken(ctx, { x, y, w, h }, 0.5, 6, 77);
  // old chalk wiped round and round
  for (let i = 0; i < 9; i++) {
    ctx.strokeStyle = rgba('#e8f0e0', 0.03 + r() * 0.03);
    ctx.lineWidth = 30 + r() * 30;
    ctx.beginPath();
    ctx.ellipse(x + w / 2 + (r() - 0.5) * 120, y + h / 2 + (r() - 0.5) * 120, 80 + r() * 60, 40 + r() * 40, r() * 3, 0, Math.PI * 1.4);
    ctx.stroke();
  }
  ctx.restore();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(10,6,4,0.7)';
  sl(ctx);
  ctx.stroke();
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
  cx.lineTo(126, 262);
  cx.lineTo(101, 304);
  cx.closePath();
  cx.stroke();
  cx.strokeStyle = '#ff8a8a';
  cx.beginPath();
  cx.arc(w - 98, 282, 26, 0, Math.PI * 2);
  cx.moveTo(w - 116, 264);
  cx.lineTo(w - 80, 300);
  cx.stroke();
  cx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 1400; i++) {
    cx.fillStyle = `rgba(0,0,0,${0.3 + r() * 0.6})`;
    cx.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r());
  }
  ctx.globalAlpha = 0.9;
  ctx.drawImage(c, x, y);
  ctx.globalAlpha = 1;
  // the ledge with a stub of chalk
  const ledge = rrPath(x - 6, y + h - 4, w + 12, 14, 3);
  solid(ctx, ledge, { x: x - 6, y: y + h - 4, w: w + 12, h: 14 }, 'wood', '#7a4a2a', { depth: 0.18, formSize: 5 });
  ctx.fillStyle = '#f4f2e8';
  ctx.fillRect(x + w - 70, y + h - 9, 22, 6);
  specHi(ctx, x + 70, y + 50, 90, 30, 0.08, -0.4);
}

function neon(ctx: Ctx, r: R): void {
  const { x, y } = TN.neon;
  // chains from the beam
  for (const dx of [-250, 250]) hang(ctx, x + dx, TN.beam - 4, x + dx, y - 108, 0, '#9a8a7a', 4, true);
  const boardPath = rrPath(x - 318, y - 112, 636, 216, 30);
  castShadow(ctx, boardPath, 22, 26, 0.5);
  solid(ctx, boardPath, { x: x - 318, y: y - 112, w: 636, h: 216 }, 'iron', '#2a1e22', { depth: 0.15, formSize: 30 });
  for (const [bx, by] of [[-296, -90], [296, -90], [-296, 82], [296, 82]]) {
    const p = ellPath(x + bx, y + by, 6, 6);
    solid(ctx, p, { x: x + bx - 6, y: y + by - 6, w: 12, h: 12 }, 'chrome', '#a89888', { depth: 0.15, line: 1.5 });
  }
  neonText(ctx, 'FEETZA', x, y, 150, ROUND, '#ff4fa3');
  neonStroke(ctx, '#ff9a2a', 7, () => {
    ctx.beginPath();
    ctx.roundRect(x - 290, y - 92, 580, 176, 40);
    ctx.stroke();
  });
  void r;
}

function oven(ctx: Ctx, r: R): void {
  const o = TN.oven;
  const x0 = 34;
  const x1 = 526;
  // the flue: a copper pipe up into the beam
  const flue = rectPath(TN.flue.x - TN.flue.w / 2, 0, TN.flue.w, o.domeTop + 20);
  solid(ctx, flue, { x: TN.flue.x - TN.flue.w / 2, y: 0, w: TN.flue.w, h: o.domeTop }, 'chrome', '#b06a3a', { depth: 0.18, formSize: 14 });
  for (const by of [70, 170]) {
    const band = rectPath(TN.flue.x - TN.flue.w / 2 - 5, by, TN.flue.w + 10, 14);
    solid(ctx, band, { x: TN.flue.x - 32, y: by, w: 64, h: 14 }, 'chrome', '#8a4a2a', { depth: 0.18, line: 2 });
  }
  // the brick base with a niche of stacked logs
  const basePath = rectPath(x0, o.mouthY, x1 - x0, TY - o.mouthY + 2);
  castShadow(ctx, basePath, 18, 20, 0.45);
  ctx.save();
  basePath(ctx);
  ctx.clip();
  bricks(ctx, r, { x: x0, y: o.mouthY, w: x1 - x0, h: TY - o.mouthY }, BRICK, '#b8946a', 64, 26);
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
    for (let row = 0; row < 3; row++)
      for (let k = 0; k < 9; k++) {
        const lx = 118 + k * 42 + (row % 2) * 20 + (r() - 0.5) * 4;
        const ly = 734 - row * 30;
        if (lx > 450) continue;
        logEnd(ctx, lx, ly, 15 + r() * 3);
      }
    crevice(ctx, 96, 464, 656, 40, 0.7);
  });
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#2a1208';
  niche(ctx);
  ctx.stroke();
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
    broken(ctx, { x: x0, y: o.domeTop, w: x1 - x0, h: o.mouthY - o.domeTop }, 0.5, 5, 13);
    // soot rising from the mouth
    const sg = ctx.createRadialGradient(o.x, o.archTop, 10, o.x, o.archTop - 40, 200);
    sg.addColorStop(0, 'rgba(30,16,8,0.55)');
    sg.addColorStop(1, 'rgba(30,16,8,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(x0, o.domeTop, x1 - x0, 300);
    // the form: lit from the top left, the right side turning away into warm shade
    const fg = ctx.createLinearGradient(x0 + 40, o.domeTop, x1, o.mouthY);
    fg.addColorStop(0, rgba('#fff4dc', 0.3));
    fg.addColorStop(0.45, rgba('#fff4dc', 0));
    fg.addColorStop(0.7, rgba('#5a2410', 0.12));
    fg.addColorStop(1, rgba('#3a1408', 0.42));
    ctx.fillStyle = fg;
    ctx.fillRect(x0, o.domeTop, x1 - x0, o.mouthY - o.domeTop);
    // the fire's light on the dome round the mouth
    lightPool(ctx, o.x, o.mouthY - 60, 260, 200, '#ff9a4a', 0.22);
    // the tile band
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
      } else ctx.arc(tx + 16, ty + 16, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  // the mouth: deep dark inside, the embers' bed (the flames are live, or painted in the still)
  const mouth = (c: Ctx) => {
    c.beginPath();
    c.moveTo(o.x - o.mouthHalf, o.mouthY);
    c.lineTo(o.x - o.mouthHalf, o.archTop + o.mouthHalf);
    c.arc(o.x, o.archTop + o.mouthHalf, o.mouthHalf, Math.PI, 0);
    c.lineTo(o.x + o.mouthHalf, o.mouthY);
    c.closePath();
  };
  within(ctx, mouth, () => {
    vfill(ctx, o.x - o.mouthHalf, o.archTop, o.mouthHalf * 2, o.mouthY - o.archTop, [[0, '#120604'], [0.6, '#3a1206'], [1, '#8a2a08']]);
    glowAt(ctx, o.x, o.mouthY - 10, 120, '#ff6a1a', 0.6, 0.6);
    // embers and a log glowing
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = rgba(['#ff8a2a', '#ffd04a', '#ff4a10'][i % 3], 0.6 + r() * 0.4);
      ctx.beginPath();
      ctx.arc(o.x + (r() - 0.5) * o.mouthHalf * 1.7, o.mouthY - 6 - r() * 12, 2 + r() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/** The oven's fire, painted (the live layer replaces it with flickering flames). */
function ovenFireStill(ctx: Ctx, r: R): void {
  const o = TN.oven;
  // (sized like the live flames: the still and the animated oven look the same)
  glowAt(ctx, o.x, o.mouthY - 40, 130, '#ff6a1a', 0.45, 0.8);
  for (let i = 0; i < 7; i++) flameShape(ctx, o.x - 84 + i * 28 + (r() - 0.5) * 6, o.mouthY - 6, 30 + r() * 10, 70 + r() * 34, ['#ff4a10', '#ff9a20', '#ffd880'], (r() - 0.5) * 0.15);
}

function ovenFront(ctx: Ctx, r: R): void {
  const o = TN.oven;
  // the brick arch round the mouth: voussoirs fanning out, the fire lighting their undersides
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
    bounce(ctx, p, cx, cy, [cx, cy - ri], '#ff8a3a', 0.45, 6);
  }
  // jambs
  for (const side of [-1, 1]) {
    const jx = side < 0 ? o.x - o.mouthHalf - 34 : o.x + o.mouthHalf;
    const p = rectPath(jx, o.archTop + o.mouthHalf, 34, o.mouthY - o.archTop - o.mouthHalf);
    solid(ctx, p, { x: jx, y: o.archTop + o.mouthHalf, w: 34, h: 70 }, 'stone', BRICK[side < 0 ? 2 : 5], { depth: 0.13, line: 1.8, formSize: 8 });
    bounce(ctx, p, jx + 17, o.mouthY - 30, [o.x, o.mouthY - 40], '#ff8a3a', 0.5, 6);
  }
  // the keystone
  const ks = polyPath([[o.x - 18, o.archTop - 40], [o.x + 18, o.archTop - 40], [o.x + 12, o.archTop + 4], [o.x - 12, o.archTop + 4]]);
  solid(ctx, ks, { x: o.x - 18, y: o.archTop - 40, w: 36, h: 44 }, 'stone', '#e8dcc0', { depth: 0.13, line: 2 });
  // the stone ledge in front of the mouth, warm with the fire
  const ledge = rrPath(o.x - 160, o.mouthY - 2, 320, 22, 4);
  castShadow(ctx, ledge, 14, 14, 0.5);
  solid(ctx, ledge, { x: o.x - 160, y: o.mouthY - 2, w: 320, h: 22 }, 'stone', '#d8ccb4', { depth: 0.12, formSize: 7 });
  lightPool(ctx, o.x, o.mouthY + 2, 150, 14, '#ff9a40', 0.5);
  void r;
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
  solid(ctx, handle, { x: x - 30, y: y - 270, w: 30, h: 270 }, 'wood', '#c8a06a', { depth: 0.12, formSize: 6 });
  solid(ctx, blade, { x: x - 66, y: y - 440, w: 132, h: 180 }, 'wood', '#c8975a', { depth: 0.12, formSize: 22 });
  within(ctx, blade, () => {
    // straight grain along the blade, as the board was sawn
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
    ctx.restore();
    // scorched edge from the oven
    const g = ctx.createLinearGradient(x - 70, 0, x + 70, 0);
    g.addColorStop(0, 'rgba(60,24,6,0.3)');
    g.addColorStop(0.3, 'rgba(60,24,6,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 80, y - 450, 160, 200);
  });
  bounce(ctx, blade, x - 60, y - 340, [TN.oven.x, y - 300], '#ff8a3a', 0.35, 8);
}


/** The lamps' light in the air: their cones and the glow under each shade (painted into the base, so the lamps
 * themselves can sway on their cords while the light stays put). */
function lampLight(ctx: Ctx, r: R): void {
  for (const lx of TN.lamps) {
    // the cone in the air under each shade, dust turning in it
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
  // the lamps' pools, the oven's warmth on the left end, the far corners in shadow
  for (const lx of TN.lamps) lightPool(ctx, lx, 870, 460, 130, '#ffd890', 0.3);
  lightPool(ctx, TN.candle.x, TN.candle.y + 10, 200, 50, '#ffb04a', 0.18);
  lightPool(ctx, 160, 800, 420, 120, '#ff8a3a', 0.22);
  // the window's light lies across the cloth, cut by its glazing bars (soft: it's the last of the day)
  lightPatch(ctx, [[TN.win.x0 + 20, TY + 4], [TN.win.x1 - 10, TY + 4], [TN.win.x1 + 120, 900], [TN.win.x0 + 60, 900]], { col: '#ffc890', a: 0.16, barsU: [0.5], barsV: [0.5], bar: 0.04, soft: 10, fade: 0.6 });
  ctx.restore();
  tableFalloff(ctx, TN.front, 0.42, '#1a0804');
  tableSeam(ctx, 0.55, '#2a1810', false);
  clothDrape(ctx, TN.front, '#efe0c0', '#b2302a', 0.2, 0.1);
}

function tableProps(ctx: Ctx, r: R): void {
  // a chianti fiasco with a candle in its neck, wax run down the glass, at the back right
  const { x, y } = TN.candle;
  bottle(ctx, x, y, 104, '#3a5a2a', { kind: 'flask', straw: true, depth: 0.05 });
  within(ctx, rrPath(x - 13, y - 108, 26, 40, 4), () => {
    ctx.fillStyle = 'rgba(240,226,200,0.92)';
    for (let i = 0; i < 4; i++) ctx.fillRect(x - 11 + i * 6, y - 108, 4, 14 + r() * 20);
  });
  candle(ctx, x, y - 104, 44, '#f2e6cc', false);
  // an oil cruet and a pepper mill beside it
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
  ao(ctx, 1800, y + 2, 110, 9, 0.4);
}

/** The candle flames on the table and shelf, painted (live: flickering sprites). */
function candleFlames(ctx: Ctx): void {
  const { x, y } = TN.candle;
  lightPool(ctx, x, y - 162, 130, 120, '#ffb04a', 0.3);
  flameShape(ctx, x, y - 150, 12, 30);
}

function grade(ctx: Ctx): void {
  gradeAll(ctx, 0.06, '#ffb070', 0.08, { warm: '#ffbe72', cool: '#4e66b8', a: 0.24 });
}

function shadeOver(ctx: Ctx): void {
  calmLanes(ctx, 0.14, '#2a140a');
  vignetteAll(ctx, 0.7, '#1a0804');
  vfill(ctx, 0, 0, W, 150, [[0, 'rgba(14,6,2,0.32)'], [1, 'rgba(14,6,2,0)']]);
}

const OVEN_SLOT = { x: TN.oven.x - 140, y: TN.oven.archTop - 200, w: 280, h: TN.oven.mouthY - TN.oven.archTop + 210 };
const CANDLE_SLOT = { x: TN.candle.x - 90, y: TN.candle.y - 250, w: 180, h: 200 };
const CURTAIN_BOX = { x: TN.win.x0 - 30, y: TN.win.archY - 20, w: TN.win.x1 - TN.win.x0 + 60, h: TN.win.sill - TN.win.archY + 40 };
const LAMP_BOX = (lx: number) => ({ x: lx - 120, y: TN.beam - 6, w: 240, h: TN.lampY - TN.beam + 70 });

const TRATTORIA_V1: SceneSpec = {
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
    { id: 'light', draw: lampLight },
    { id: 'shelf', box: { x: TN.shelf.x0 - 30, y: TN.shelf.y - 110, w: TN.shelf.x1 - TN.shelf.x0 + 70, h: 260 }, draw: shelf },
    { id: 'sign', box: { x: TN.sign.x - 110, y: TN.sign.y - 130, w: 210, h: 250 }, draw: (c) => sign(c) },
    { id: 'board', box: { x: TN.board.x - 20, y: TN.board.y - 20, w: TN.board.w + 70, h: TN.board.h + 70 }, draw: chalkboard },
    { id: 'neon', box: { x: TN.neon.x - 360, y: TN.beam - 10, w: 740, h: 320 }, draw: neon },
    { id: 'shutters', box: { x: TN.win.x0 - 100, y: TN.win.top, w: TN.win.x1 - TN.win.x0 + 200, h: TN.win.sill - TN.win.top + 20 }, draw: shutters },
    { id: 'street', box: WIN_BOX, draw: (c, r) => street(c, r, false) },
    { id: 'streetNight', box: WIN_BOX, liveOnly: true, draw: (c, r) => street(c, r, true) },
    { id: 'streetLife', box: WIN_BOX, motion: 'slot', draw: () => {} },
    { id: 'window', box: { x: TN.win.x0 - 40, y: TN.win.top - 30, w: TN.win.x1 - TN.win.x0 + 104, h: TN.win.sill - TN.win.top + 66 }, draw: windowFrame },
    { id: 'curtains', box: CURTAIN_BOX, motion: 'sprite', draw: curtains },
    { id: 'oven', box: { x: 0, y: 0, w: 580, h: TY + 4 }, draw: oven },
    { id: 'ovenFire', box: OVEN_SLOT, stillOnly: true, draw: ovenFireStill },
    // the oven's live fire, inside its mouth (the brick arch is in front)
    { id: 'ovenFireLive', box: OVEN_SLOT, motion: 'slot', draw: () => {} },
    { id: 'ovenFront', box: { x: TN.oven.x - 170, y: TN.oven.archTop - 50, w: 340, h: TN.oven.mouthY - TN.oven.archTop + 90 }, draw: ovenFront },
    { id: 'peel', box: { x: TN.peel.x - 150, y: TN.peel.y - 480, w: 260, h: TY - TN.peel.y + 480 }, draw: peel },
    { id: 'lampL', box: LAMP_BOX(TN.lamps[0]), motion: 'sprite', draw: (c) => pendantLamp(c, TN.lamps[0], TN.beam - 2, TN.lampY, '#2f6a46', { lit: 1, glow: false }) },
    { id: 'lampR', box: LAMP_BOX(TN.lamps[1]), motion: 'sprite', draw: (c) => pendantLamp(c, TN.lamps[1], TN.beam - 2, TN.lampY, '#2f6a46', { lit: 1, glow: false }) },
    { id: 'table', box: { x: 0, y: TY, w: W, h: 1080 - TY }, draw: table },
    { id: 'tableProps', box: { x: 1640, y: TY - 120, w: 280, h: 170 }, draw: tableProps },
    { id: 'candles', box: CANDLE_SLOT, stillOnly: true, draw: (c) => candleFlames(c) },
    // the candle flame: over everything (nothing stands in front of it)
    { id: 'candlesLive', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

// ——— live ———

function flameTex(k: KitLive, key: string, cols: [string, string, string]): string {
  return k.tex(key, 64, 128, (c) => flameShape(c, 32, 122, 46, 116, cols));
}

registerKitScene(TRATTORIA_V1, (k, wave0) => {
  const o = TN.oven;
  const fireSlot = k.slot('ovenFireLive');
  const ft = flameTex(k, 'tn_flame', ['#ff4a10', '#ff9a20', '#ffd880']);
  // the oven: a bed of flames licking up into the dome, a breathing glow, sparks up the flue's draught
  const bedGlow = k.glow(o.x, o.mouthY - 40, 150, 0xff6a1a, 0.6, { into: fireSlot, sy: 0.8 });
  const flames = Array.from({ length: 7 }, (_, i) => {
    const x = o.x - 84 + i * 28;
    const img = k.img(ft, x, o.mouthY - 4, { into: fireSlot, add: true, origin: [0.5, 0.96] });
    return { img, x, s: 0.62 + crand() * 0.3, seed: i * 1.9 + crand() * 4 };
  });
  k.emitter('soft', {
    x: { min: o.x - 70, max: o.x + 70 }, y: o.mouthY - 30, lifespan: 1300, frequency: 140,
    speedY: { min: -110, max: -50 }, speedX: { min: -20, max: 20 }, scale: { start: 0.07, end: 0 },
    tint: [0xffd04a, 0xff8a2a], blendMode: 'ADD',
  }, 1500, fireSlot);
  // heat and smoke curling out of the top of the mouth
  k.emitter('soft', {
    x: { min: o.x - 40, max: o.x + 40 }, y: o.archTop - 6, lifespan: 4200, frequency: 260,
    speedY: { min: -40, max: -22 }, speedX: { min: -8, max: 14 }, scale: { start: 0.5, end: 1.6 },
    alpha: { values: [0, 0.12, 0] }, tint: 0xd8c8b8,
  }, 4000);
  // the warm flicker of the fire on the room around it
  const roomFire = k.glow(o.x + 60, 520, 420, 0xff7a2a, 0.1, { sy: 0.8 });
  // candles
  const candleSlot = k.slot('candlesLive');
  const ct = flameTex(k, 'tn_candle', ['#ff8a2a', '#ffcf5a', '#fffbe8']);
  const cHalo = k.glow(TN.candle.x, TN.candle.y - 162, 110, 0xffb04a, 0.35, { into: candleSlot });
  const cFlame = k.img(ct, TN.candle.x, TN.candle.y - 148, { into: candleSlot, add: true, origin: [0.5, 0.96], sx: 0.26, sy: 0.27 });
  // the café curtains: a draught through the window
  const cur = k.sprite('curtains');
  k.pivot(cur, (TN.win.x0 + TN.win.x1) / 2, TN.win.archY - 8);
  // the pendant lamps turn a hair on their cords
  const lampL = k.pivot(k.sprite('lampL'), TN.lamps[0], TN.beam);
  const lampR = k.pivot(k.sprite('lampR'), TN.lamps[1], TN.beam);
  // the neon buzzes now and then
  const neonGlow = k.glow(TN.neon.x, TN.neon.y, 330, 0xff4fa3, 0.18, { sy: 0.55 });
  let buzz = 0;
  let nextBuzz = 4 + crand() * 6;
  // dust in the lamps' light
  for (const lx of TN.lamps)
    k.emitter('soft', {
      x: { min: lx - 160, max: lx + 160 }, y: { min: TN.lampY + 30, max: TY - 40 }, lifespan: 7000, frequency: 900,
      speedX: { min: -6, max: 6 }, speedY: { min: -6, max: 4 }, scale: { min: 0.03, max: 0.06 },
      alpha: { values: [0, 0.55, 0] }, tint: 0xfff0c8, blendMode: 'ADD',
    }, 6000);
  // the street: night falls over the stage; people and scooters go by
  const night = k.sprite('streetNight');
  const life = k.slot('streetLife');
  const walker = k.tex('tn_walker', 40, 80, (c) => {
    c.fillStyle = '#2a2234';
    c.beginPath();
    c.arc(20, 12, 8, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.roundRect(10, 20, 20, 34, 8);
    c.fill();
    c.fillRect(12, 50, 6, 28);
    c.fillRect(22, 50, 6, 28);
  });
  const vespa = k.tex('tn_vespa', 90, 54, (c) => {
    c.fillStyle = '#2a2234';
    c.beginPath();
    c.arc(18, 42, 10, 0, Math.PI * 2);
    c.arc(70, 42, 10, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.moveTo(10, 36);
    c.quadraticCurveTo(30, 18, 56, 30);
    c.lineTo(76, 12);
    c.lineTo(80, 36);
    c.closePath();
    c.fill();
    c.beginPath();
    c.arc(44, 10, 7, 0, Math.PI * 2);
    c.roundRect(36, 14, 16, 18, 5);
    c.fill();
  });
  type Passer = { img: Phaser.GameObjects.Image; v: number; light?: Phaser.GameObjects.Image };
  let passer: Passer | null = null;
  let nextPass = 3 + crand() * 5;
  const pass = () => {
    const scooter = crand() < 0.35;
    const dir = crand() < 0.5 ? 1 : -1;
    const x = dir > 0 ? TN.win.x0 - 40 : TN.win.x1 + 40;
    const img = k.img(scooter ? vespa : walker, x, scooter ? 566 : 562, { into: life, origin: [0.5, 1], scale: scooter ? 0.62 : 0.56 });
    img.setFlipX(dir < 0);
    const light = scooter ? k.glow(x, 548, 40, 0xfff0b0, 0, { into: life }) : undefined;
    passer = { img, v: dir * (scooter ? 70 : 16), light };
  };
  let kw = waveK(wave0);
  let shown = kw;
  return {
    setWave: (w) => (kw = waveK(w)),
    update(dt, t) {
      shown += (kw - shown) * Math.min(1, dt * 0.6);
      // the fire
      for (const f of flames) {
        const n = flicker(t, f.seed);
        f.img.setScale(f.s * (0.85 + n * 0.2), f.s * (0.7 + n * 0.45));
        f.img.x = f.x + Math.sin(t * 3.1 + f.seed) * 3;
        f.img.rotation = Math.sin(t * 2.2 + f.seed) * 0.09;
        f.img.setAlpha(0.75 + n * 0.2);
      }
      const fn = flicker(t, 1.3);
      bedGlow.setAlpha(0.5 + fn * 0.2);
      roomFire.setAlpha((0.07 + fn * 0.05) * (1 + shown * 0.6));
      // the candle, brighter as night falls
      const cn = flicker(t * 0.8, 7.7);
      cFlame.setScale(0.24 + cn * 0.03, 0.22 + cn * 0.08).setRotation(wander(t, 3, 0.7) * 0.12 * calm());
      cHalo.setAlpha((0.25 + cn * 0.1) * (0.8 + shown * 0.5));
      // curtains and lamps
      sway(cur, t, 0.7, 0.012, 0.8);
      cur.scaleX = 1 + wander(t, 5, 0.6) * 0.006 * calm();
      sway(lampL, t, 1.1, 0.006, 0.6);
      sway(lampR, t, 2.9, 0.006, 0.6);
      // the neon: steady, then a stutter
      nextBuzz -= dt;
      if (nextBuzz < 0) {
        buzz = 0.35;
        nextBuzz = 5 + crand() * 9;
      }
      buzz = Math.max(0, buzz - dt);
      // (a stutter is a strobe: only with flashes on and motion not reduced)
      const stutter = buzz > 0 && Math.sin(t * 70) > 0 && save.settings.flashes && !save.settings.reducedMotion ? 0.35 : 1;
      neonGlow.setAlpha((0.16 + Math.sin(t * 1.3) * 0.02) * stutter);
      // the street
      night.setAlpha(Phaser.Math.Clamp(lerp(-0.1, 1.25, shown), 0, 1));
      nextPass -= dt;
      if (!passer && nextPass < 0) pass();
      if (passer) {
        const p: Passer = passer;
        p.img.x += p.v * dt;
        p.img.y += Math.sin(t * 9) * (Math.abs(p.v) < 30 ? 0.15 : 0);
        p.img.setAlpha(0.85);
        if (p.light) p.light.setPosition(p.img.x + Math.sign(p.v) * 26, 548).setAlpha(0.2 + shown * 0.7);
        if (p.img.x < TN.win.x0 - 60 || p.img.x > TN.win.x1 + 60) {
          p.img.destroy();
          p.light?.destroy();
          passer = null;
          nextPass = 4 + crand() * 8;
        }
      }
    },
  };
}, { legacy: true });
