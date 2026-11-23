// Nonna's Kitchen (Stage 7, waves 31–34), redrawn with the location kit (src/art/scene): a farmhouse kitchen in the
// hills. Ochre lime plaster over a band of blue-and-gold majolica and cream glazed tiles; the cream range on the
// left under its hammered copper hood, the Sunday sauce on the big burner and a pot of water under a lid; a sash
// window onto the cypress hills, a garlic braid beside it, the plate shelf, the copper pans on their rail, the walnut
// dresser with a bowl of tomatoes, and Nonna's scrubbed beech worktable, floured at the ends, with the rolling pin
// and a crock of eggs out of the lanes.
// Live (hero animations): the sauce rolls and bubbles through 24 painted frames (domes swell glossy, stretch thin,
// pop into craters and rings, throw crowns of drops) and now and then spits drops that arc and fall back; its steam
// billows up into the hood; a stomp on the table throws up a painted flour burst that rolls out and settles, leaving
// a dusting on the boards. Also: blue gas in painted frames, the lid rattling and hopping, pans, towel, garlic and
// spoon on springs, dust in the sunbeam. Across the stage the day goes by: morning, a hot afternoon, a low gold
// sunset (the beam swings lower), then dusk with the lamp under the hood on and the room's edges going dark.

import Phaser from 'phaser';
import {
  type Air,
  type Ctx,
  type R,
  TY,
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
import { aoHalo, bounceBand, lightPatch, shaft } from '../../art/scene/light';
import { board, panel, planksPlane, plaster, tableFalloff, tableSeam, varnish } from '../../art/scene/materials';
import { crack, drift, lay, softly, streaks } from '../../art/scene/paint';
import { bottle, glassPane, hang, herbPot } from '../../art/scene/props';
import { skyFill, stars, sun } from '../../art/scene/sky';
import { tiles } from '../../art/scene/surfaces';
import { spec as specHi } from '../../art/style/kit';
import { MATERIALS } from '../../art/style/materials';
import { makeCanvas, mix, rgba, shade } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { type KitLive, calm, flicker, lerp, registerKitScene, waveK } from '../../game/sceneLive';
import { Loop, Parts, Rate, Spring, Swing, flameFrame, sheet, steamFrame } from '../../game/sceneAnim';

// ——— layout ———

export const KN = {
  beam: 46,
  border: { y0: 432, y1: 472 },
  hood: { x0: 60, x1: 520, top: 196, bot: 330, fx0: 196, fx1: 384 },
  stove: { x0: 40, x1: 530, top: 494 },
  pot: { x: 222, y: 476, w: 196, h: 118 },
  small: { x: 440, y: 476, w: 112, h: 66 },
  win: { x0: 600, x1: 820, y0: 96, y1: 330 },
  garlic: { x: 912, y: 52 },
  shelf: { x0: 960, x1: 1450, y: 330 },
  rail: { x0: 1572, x1: 1900, y: 176 },
  pans: [
    { x: 1630, r: 60, len: 70 },
    { x: 1752, r: 44, len: 58 },
    { x: 1856, r: 52, len: 64 },
  ],
  herbs: [1498, 1530],
  cab: { x0: 1538, x1: W + 10, top: 552 },
  bowl: { x: 1734, y: 552 },
  front: 1040,
};

const HILLS: Air = { color: '#c8d4e8', far: 0.7 };
const OCHRE = '#c99458';
const COPPER = '#c0703a';
const ENAMEL = '#eee4cc';
/** Copper: warm and deep, its shadows going to oxblood, a hot sheen. */
const CU = { ...MATERIALS.chrome, name: 'Copper', shadowTint: '#3a0c04', ramp: 0.85, tex: 'brushed' as const, texA: 0.12, specA: 0.55, rim: 0.45 };

/** Gas flames: a deep blue edge, a blue body, a pale (not white) core. */
const GAS: [string, string, string] = ['#1030b0', '#3a6ee0', '#9ec0f8'];

const WIN = KN.win;
const WIN_BOX = { x: WIN.x0, y: WIN.y0, w: WIN.x1 - WIN.x0, h: WIN.y1 - WIN.y0 };
const winPath = rectPath(WIN.x0, WIN.y0, WIN_BOX.w, WIN_BOX.h);

// ——— the hills through the window ———

function view(ctx: Ctx, r: R, eve: boolean): void {
  within(ctx, winPath, () => {
    skyFill(ctx, WIN_BOX, eve ? [[0, '#3a4a8a'], [0.45, '#c87a7a'], [0.75, '#f0a060'], [1, '#ffcf80']] : [[0, '#6aa0e0'], [0.6, '#a8cce8'], [1, '#e8eef0']], 0.04);
    if (eve) {
      glowAt(ctx, WIN.x0 + 40, WIN.y1 - 60, 200, '#ffb060', 0.55, 0.6);
      sun(ctx, WIN.x0 + 52, WIN.y0 + 150, 13, { disc: '#fff0c8', glow: '#ffa050', a: 0.7, bloom: 6, squash: 0.6 });
    }
    // a soft streak of cloud
    softly(ctx, WIN_BOX, (g) => {
      g.fillStyle = eve ? 'rgba(255,190,150,0.5)' : 'rgba(255,255,255,0.55)';
      g.beginPath();
      g.ellipse(WIN.x0 + 150, WIN.y0 + 56, 90, 7, -0.04, 0, Math.PI * 2);
      g.ellipse(WIN.x0 + 70, WIN.y0 + 80, 60, 5, 0, 0, Math.PI * 2);
      g.fill();
    }, 0.25);
    // the hills, each nearer one greener, darker and sharper
    const ridges: [number, string, number][] = [[230, eve ? '#8a6a8a' : '#9ab0c8', 0.9], [256, eve ? '#6a5060' : '#7a9a6a', 0.6], [284, eve ? '#4a3a3a' : '#5a7a3a', 0.3]];
    ridges.forEach(([y, col, depth], i) => {
      ctx.fillStyle = eve ? col : mix(col, HILLS.color, depth * 0.4);
      ctx.beginPath();
      ctx.moveTo(WIN.x0, WIN.y1);
      for (let x = WIN.x0; x <= WIN.x1 + 10; x += 10) ctx.lineTo(x, y + Math.sin(x * 0.018 + i * 2) * 14 + Math.sin(x * 0.051 + i) * 5);
      ctx.lineTo(WIN.x1, WIN.y1);
      ctx.closePath();
      ctx.fill();
      // the lit ridge
      ctx.strokeStyle = rgba(eve ? '#ffb080' : '#fff4d0', 0.35 - depth * 0.2);
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
    // a farmhouse and a row of cypresses on the middle hill
    ctx.fillStyle = eve ? '#c89070' : '#e8d4b0';
    ctx.fillRect(WIN.x0 + 130, 250, 24, 14);
    ctx.fillStyle = eve ? '#8a4a30' : '#b8603a';
    ctx.beginPath();
    ctx.moveTo(WIN.x0 + 126, 251);
    ctx.lineTo(WIN.x0 + 142, 243);
    ctx.lineTo(WIN.x0 + 158, 251);
    ctx.fill();
    for (let i = 0; i < 6; i++) {
      const x = WIN.x0 + 40 + i * 30 + r() * 10;
      const base = 290 + Math.sin(x * 0.03) * 4;
      const h = 34 + r() * 18;
      ctx.fillStyle = eve ? '#2a2a24' : '#2e4a24';
      ctx.beginPath();
      ctx.moveTo(x, base - h);
      ctx.quadraticCurveTo(x + 7, base - h * 0.5, x + 5, base);
      ctx.lineTo(x - 5, base);
      ctx.quadraticCurveTo(x - 7, base - h * 0.5, x, base - h);
      ctx.fill();
      ctx.fillStyle = rgba(eve ? '#ff9a50' : '#c8e0a0', 0.35);
      ctx.beginPath();
      ctx.moveTo(x, base - h);
      ctx.quadraticCurveTo(x - 6, base - h * 0.5, x - 4, base);
      ctx.lineTo(x - 1, base);
      ctx.closePath();
      ctx.fill();
    }
  });
}

/** Dusk in the window: the last of the light along the hills, the first stars, the farmhouse's lamp lit. */
function viewNight(ctx: Ctx, r: R): void {
  within(ctx, winPath, () => {
    skyFill(ctx, WIN_BOX, [[0, '#1e2456'], [0.45, '#4a4280'], [0.75, '#a86a80'], [1, '#e08a5a']], 0.04);
    glowAt(ctx, WIN.x0 + 30, WIN.y1 - 70, 160, '#ff9a50', 0.35, 0.5);
    stars(ctx, r, { x: WIN.x0, y: WIN.y0, w: WIN_BOX.w, h: 70 }, 7, '#f0eaff');
    const ridges: [number, string][] = [[230, '#3a3450'], [256, '#2a2436'], [284, '#18141e']];
    ridges.forEach(([y, col], i) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(WIN.x0, WIN.y1);
      for (let x = WIN.x0; x <= WIN.x1 + 10; x += 10) ctx.lineTo(x, y + Math.sin(x * 0.018 + i * 2) * 14 + Math.sin(x * 0.051 + i) * 5);
      ctx.lineTo(WIN.x1, WIN.y1);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = rgba('#d88a70', 0.25 - i * 0.07);
      ctx.lineWidth = 1.2;
      ctx.stroke();
    });
    // the farmhouse, its window lit warm, a glow round it in the dark
    glowAt(ctx, WIN.x0 + 142, 257, 26, '#ffb050', 0.5);
    ctx.fillStyle = '#2a2026';
    ctx.fillRect(WIN.x0 + 130, 250, 24, 14);
    ctx.beginPath();
    ctx.moveTo(WIN.x0 + 126, 251);
    ctx.lineTo(WIN.x0 + 142, 243);
    ctx.lineTo(WIN.x0 + 158, 251);
    ctx.fill();
    ctx.fillStyle = '#ffd27a';
    ctx.fillRect(WIN.x0 + 136, 254, 5, 5);
    ctx.fillRect(WIN.x0 + 145, 254, 5, 5);
    for (let i = 0; i < 6; i++) {
      const x = WIN.x0 + 40 + i * 30 + r() * 10;
      const base = 290 + Math.sin(x * 0.03) * 4;
      const h = 34 + r() * 18;
      ctx.fillStyle = '#0e0c12';
      ctx.beginPath();
      ctx.moveTo(x, base - h);
      ctx.quadraticCurveTo(x + 7, base - h * 0.5, x + 5, base);
      ctx.lineTo(x - 5, base);
      ctx.quadraticCurveTo(x - 7, base - h * 0.5, x, base - h);
      ctx.fill();
    }
  });
}

// ——— the room ———

function wall(ctx: Ctx, r: R): void {
  const up = { x: 0, y: 0, w: W, h: KN.border.y0 };
  plaster(ctx, r, up, OCHRE, { wash: 0.8, patina: 0.6, seed: 17, grime: { top: 70, left: 40, right: 60, a: 0.35 } });
  // soot climbed over the hood for years; grease browned the plaster round the stove; damp from the sill
  softly(ctx, up, (g) => {
    const sg = g.createRadialGradient(290, 80, 20, 290, 120, 300);
    sg.addColorStop(0, 'rgba(40,18,6,0.5)');
    sg.addColorStop(1, 'rgba(40,18,6,0)');
    g.fillStyle = sg;
    g.fillRect(0, 0, 700, 432);
    g.fillStyle = 'rgba(80,40,10,0.18)';
    g.beginPath();
    g.ellipse(290, 410, 330, 60, 0, 0, Math.PI * 2);
    g.fill();
  }, 0.125);
  streaks(ctx, r, WIN.x0 - 10, WIN.y1 + 16, 18, 80, '#6a3a14', 0.16, 3);
  streaks(ctx, r, WIN.x1 + 12, WIN.y1 + 16, 16, 70, '#6a3a14', 0.16, 3);
  const cr = { col: '#5a2a0a', lip: '#ffe8c0', w: 1.5, a: 0.5 };
  crack(ctx, r, WIN.x1 + 6, WIN.y0 - 4, -0.7, 80, cr);
  crack(ctx, r, WIN.x0 - 8, WIN.y1 + 10, 2.3, 60, cr);
  crack(ctx, r, 1200, KN.beam + 2, 1.6, 90, cr);
  // the light: shade under the beams, the window's day on the wall beside it, the stove's warmth
  vfill(ctx, 0, 0, W, KN.border.y0, [[0, 'rgba(40,16,4,0.55)'], [0.3, 'rgba(40,16,4,0.18)'], [1, 'rgba(40,16,4,0.12)']]);
  lightPool(ctx, WIN.x0 + 120, 260, 520, 300, '#fff0d0', 0.14, 'screen');
  lightPool(ctx, 290, 460, 380, 200, '#ff9a4a', 0.12);
  // the majolica band: blue tiles, a gold quatrefoil on each, a lit glaze
  majolica(ctx, r);
  // the white glazed tiles down to the counter
  const low = { x: 0, y: KN.border.y1, w: W, h: TY - KN.border.y1 };
  tiles(ctx, r, low, '#e6dccb', '#b8a68c', 58, { pal: ['#e8dfcf', '#e2d8c6', '#e6ddcc', '#dcd0bc'], glaze: 0.8, crackle: 0.5, lights: [{ x: WIN.x0 + 160, a: 0.3, w: 80 }, { x: 290, a: 0.2, w: 120, col: '#ffc890' }], seed: 7 });
  // grease and soot behind the range, scrubbed paler in the middle
  softly(ctx, low, (g) => {
    g.fillStyle = 'rgba(70,40,14,0.22)';
    g.beginPath();
    g.ellipse(290, 520, 300, 80, 0, 0, Math.PI * 2);
    g.fill();
  }, 0.125);
  vfill(ctx, 0, KN.border.y1, W, TY - KN.border.y1, [[0, 'rgba(30,14,6,0.16)'], [1, 'rgba(30,14,6,0.38)']]);
  // the beam
  crevice(ctx, 0, W, KN.beam, 70, 0.5);
  board(ctx, r, 0, 0, W, KN.beam, '#4a2a16');
  within(ctx, rectPath(0, 0, W, KN.beam), () => lay(ctx, drift('#6a4028', '#140804', 8, 43, 256, 16), { x: 0, y: 0, w: W, h: KN.beam }, 0.5));
  ctx.fillStyle = rgba('#ffd8a0', 0.22);
  ctx.fillRect(0, KN.beam - 5, W, 2);
  ctx.fillStyle = 'rgba(20,8,2,0.75)';
  ctx.fillRect(0, KN.beam - 3, W, 3);
}

function majolica(ctx: Ctx, r: R): void {
  const { y0, y1 } = KN.border;
  const h = y1 - y0;
  within(ctx, rectPath(0, y0, W, h), () => {
    ctx.fillStyle = '#8a8070';
    ctx.fillRect(0, y0, W, h);
    for (let x = 0; x < W; x += h) {
      const c = shade('#2c5288', (r() - 0.5) * 0.1);
      const g = ctx.createLinearGradient(x, y0, x + h * 0.6, y1);
      g.addColorStop(0, shade(c, 0.12));
      g.addColorStop(1, shade(c, -0.12));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(x + 1.5, y0 + 1.5, h - 3, h - 3, 3);
      ctx.fill();
      // the gold quatrefoil and its white heart, hand-painted (never quite the same twice)
      const cx = x + h / 2 + (r() - 0.5) * 1.5;
      const cy = y0 + h / 2 + (r() - 0.5) * 1.5;
      ctx.fillStyle = shade('#c8963a', (r() - 0.5) * 0.15);
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
        ctx.beginPath();
        ctx.ellipse(cx + Math.cos(a) * 6.5, cy + Math.sin(a) * 6.5, 5, 3.4, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#e6dcc0';
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.fillRect(x + 3, y0 + 2.5, h - 6, 1.5);
    }
    lay(ctx, drift('#ffffff', '#0a1430', 9, 71, 256, 12), { x: 0, y: y0, w: W, h }, 0.22);
    // the band sits in the wall's shade, worn matt along its top edge
    vfill(ctx, 0, y0, W, h, [[0, 'rgba(30,14,4,0.3)'], [1, 'rgba(30,14,4,0.1)']]);
  });
  ctx.fillStyle = 'rgba(30,14,4,0.45)';
  ctx.fillRect(0, y0 - 2, W, 2);
  crevice(ctx, 0, W, y1, 12, 0.3);
}

/** The sunbeam through the window: a patch on the tiles below it, a dusty shaft through the air. */
function windowLight(ctx: Ctx, r: R): void {
  lightPatch(ctx, [[WIN.x0 + 30, WIN.y1 + 30], [WIN.x1 + 20, WIN.y1 + 30], [WIN.x1 + 230, 700], [WIN.x0 + 220, 700]], { col: '#fff0c8', a: 0.26, barsU: [0.5], barsV: [0.45], bar: 0.035, soft: 8, fade: 0.5 });
  shaft(ctx, r, [WIN.x0 + 10, WIN.y0 + 20, WIN.x1, WIN.y0 + 40], [WIN.x0 + 260, TY, WIN.x1 + 300, TY], '#fff2d0', 0.08, { streaks: 5, motes: 0 });
}

function windowFrame(ctx: Ctx, r: R): void {
  const f = 16;
  // the frame: painted wood, the paint worn at the sash's corners
  const frame = (c: Ctx) => {
    c.beginPath();
    c.rect(WIN.x0 - f, WIN.y0 - f, WIN_BOX.w + f * 2, WIN_BOX.h + f * 2);
    c.rect(WIN.x0 + WIN_BOX.w, WIN.y0, -WIN_BOX.w, WIN_BOX.h);
  };
  castShadow(ctx, frame, 10, 12, 0.45);
  solid(ctx, frame, { x: WIN.x0 - f, y: WIN.y0 - f, w: WIN_BOX.w + f * 2, h: WIN_BOX.h + f * 2 }, 'wood', '#e8dcc4', { depth: 0.14, formSize: 10, line: 3 });
  // the deep reveal: lit on the bottom and right inside, in shadow top and left
  within(ctx, winPath, () => {
    ctx.fillStyle = 'rgba(30,14,4,0.35)';
    ctx.fillRect(WIN.x0, WIN.y0, WIN_BOX.w, 10);
    ctx.fillRect(WIN.x0, WIN.y0, 10, WIN_BOX.h);
  });
  // the glazing bars
  // (one cross-shaped outline: two overlapping rects would leave a hole where they cross under an even-odd fill)
  const mx = (WIN.x0 + WIN.x1) / 2;
  const my = WIN.y0 + WIN_BOX.h * 0.45;
  const bars = polyPath([
    [mx - 5, WIN.y0], [mx + 5, WIN.y0], [mx + 5, my - 6], [WIN.x1, my - 6], [WIN.x1, my + 6], [mx + 5, my + 6], [mx + 5, WIN.y1],
    [mx - 5, WIN.y1], [mx - 5, my + 6], [WIN.x0, my + 6], [WIN.x0, my - 6], [mx - 5, my - 6],
  ]);
  castShadow(ctx, bars, 5, 4, 0.3);
  solid(ctx, bars, { x: WIN.x0, y: WIN.y0, w: WIN_BOX.w, h: WIN_BOX.h }, 'wood', '#ece2cc', { depth: 0.14, line: 2 });
  glassPane(ctx, winPath, WIN_BOX, { sheen: 0.1, dirt: 0.12 });
  // the sill, with herbs in pots on it
  const sill = rrPath(WIN.x0 - 34, WIN.y1 + f - 4, WIN_BOX.w + 68, 16, 3);
  castShadow(ctx, sill, 12, 12, 0.5);
  solid(ctx, sill, { x: WIN.x0 - 34, y: WIN.y1 + f - 4, w: WIN_BOX.w + 68, h: 16 }, 'stone', '#e4dccc', { depth: 0.14, line: 2.5, formSize: 6 });
  herbPot(ctx, r, WIN.x0 + 30, WIN.y1 + f - 4, 0.7, '#4a8a2a');
  herbPot(ctx, r, WIN.x1 - 34, WIN.y1 + f - 4, 0.62, '#3a7a3a');
}

function garlic(ctx: Ctx, r: R): void {
  const { x, y } = KN.garlic;
  hang(ctx, x, y, x, y + 20, 0, '#c8a070', 3);
  // the plaited stems: three strands crossing down the braid, dry straw-gold, shaded on their right
  for (let k = 0; k < 3; k++) {
    ctx.strokeStyle = shade('#b8955a', -0.1 * k);
    ctx.lineWidth = 7;
    ctx.beginPath();
    for (let t = 0; t <= 1.001; t += 0.02) {
      const yy = y + 18 + t * 250;
      const xx = x + Math.sin(t * 18 + (k * Math.PI * 2) / 3) * 8;
      if (t === 0) ctx.moveTo(xx, yy);
      else ctx.lineTo(xx, yy);
    }
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(60,40,10,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 6, y + 20);
  ctx.lineTo(x + 6, y + 268);
  ctx.stroke();
  // the bulbs, plump and papery, set alternately off the braid, the lower ones in front of the upper
  for (let i = 0; i < 11; i++) {
    const t = i / 10;
    const side = i % 2 ? 1 : -1;
    const bx = x + side * (10 + r() * 6);
    const by = y + 46 + t * 222;
    const s = 1 - t * 0.25;
    const bulb = (c: Ctx) => {
      c.beginPath();
      c.moveTo(bx - side * 4, by - 24 * s);
      c.bezierCurveTo(bx + 22 * s, by - 16 * s, bx + 24 * s, by + 14 * s, bx, by + 17 * s);
      c.bezierCurveTo(bx - 24 * s, by + 14 * s, bx - 22 * s, by - 16 * s, bx - side * 4, by - 24 * s);
      c.closePath();
    };
    castShadow(ctx, bulb, 10, 10, 0.4);
    solid(ctx, bulb, { x: bx - 24 * s, y: by - 24 * s, w: 48 * s, h: 42 * s }, 'skin', '#f0e6d2', { depth: 0.12, line: 2, formSize: 10 * s });
    within(ctx, bulb, () => {
      // the cloves' ridges and a faint violet streak in the skin
      ctx.strokeStyle = 'rgba(150,110,120,0.4)';
      ctx.lineWidth = 1.2;
      for (const dx of [-10, -3, 4, 11]) {
        ctx.beginPath();
        ctx.moveTo(bx + dx * 0.25 * s, by - 20 * s);
        ctx.quadraticCurveTo(bx + dx * s, by, bx + dx * 0.6 * s, by + 15 * s);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(170,110,150,0.16)';
      ctx.fillRect(bx + 4 * s, by - 18 * s, 6 * s, 32 * s);
    });
    // the root tuft
    ctx.strokeStyle = '#8a7050';
    ctx.lineWidth = 1;
    for (let k = -2; k <= 2; k++) {
      ctx.beginPath();
      ctx.moveTo(bx, by + 16 * s);
      ctx.lineTo(bx + k * 3, by + 21 * s);
      ctx.stroke();
    }
  }
}

function shelf(ctx: Ctx, r: R): void {
  const { x0, x1, y } = KN.shelf;
  // plates standing in the groove, jars between
  const items: [string, number][] = [['plate', x0 + 50], ['plate', x0 + 140], ['jar', x0 + 222], ['plate', x0 + 300], ['plate', x0 + 390], ['jar', x0 + 460]];
  const rims = ['#2a5aa8', '#b8402a', '#2a5aa8', '#3a8a5a'];
  let pi = 0;
  for (const [kind, x] of items) {
    if (kind === 'plate') {
      const R0 = 40;
      const cy = y - R0 - 4;
      const p = ellPath(x, cy, R0, R0);
      castShadow(ctx, p, 12, 12, 0.45);
      solid(ctx, p, { x: x - R0, y: cy - R0, w: R0 * 2, h: R0 * 2 }, 'enamel', '#f2ecdc', { depth: 0.14, formSize: 14, line: 2.5 });
      const rc = rims[pi++ % rims.length];
      ctx.strokeStyle = rc;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(x, cy, R0 - 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, cy, R0 - 16, 0, Math.PI * 2);
      ctx.stroke();
      // a hand-painted lemon branch in the well
      ctx.fillStyle = '#e8c030';
      ctx.beginPath();
      ctx.ellipse(x - 4, cy + 2, 7, 5, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4a8a3a';
      ctx.beginPath();
      ctx.ellipse(x + 7, cy - 5, 6, 3, -0.6, 0, Math.PI * 2);
      ctx.fill();
      // the well is a shallow bowl: its top-left in shade, its lower right catching the light
      const wg = ctx.createLinearGradient(x - R0, cy - R0, x + R0, cy + R0);
      wg.addColorStop(0.2, 'rgba(60,30,10,0.14)');
      wg.addColorStop(0.5, 'rgba(60,30,10,0)');
      wg.addColorStop(0.8, 'rgba(255,250,235,0.18)');
      ctx.fillStyle = wg;
      ctx.beginPath();
      ctx.arc(x, cy, R0 - 18, 0, Math.PI * 2);
      ctx.fill();
      specHi(ctx, x - 18, cy - 22, 10, 4, 0.55, -0.7);
    } else bottle(ctx, x, y, 66, pi % 2 ? '#c84a2a' : '#d8a830', { kind: 'jar', label: '#f0e6cc', cork: '#e8e0d0', depth: 0.14 });
  }
  // the shelf board on its iron brackets
  for (const bx of [x0 + 30, x1 - 30]) {
    const br = polyPath([[bx - 4, y + 10], [bx + 4, y + 10], [bx + 4, y + 50], [bx - 30 * Math.sign(bx - (x0 + x1) / 2) * -1, y + 12]]);
    castShadow(ctx, br, 10, 8, 0.4);
    solid(ctx, br, { x: bx - 30, y: y + 10, w: 60, h: 42 }, 'iron', '#2a2a2e', { depth: 0.14, line: 2 });
  }
  const b = rectPath(x0, y, x1 - x0, 16);
  castShadow(ctx, b, 14, 14, 0.5);
  solid(ctx, b, { x: x0, y, w: x1 - x0, h: 16 }, 'wood', '#6a3a1e', { depth: 0.14, line: 2.5, formSize: 6 });
  within(ctx, b, () => {
    ctx.fillStyle = rgba('#ffd8a0', 0.3);
    ctx.fillRect(x0, y, x1 - x0, 2);
  });
  void r;
}

function hood(ctx: Ctx, r: R): void {
  const h = KN.hood;
  const flue = rectPath(h.fx0, KN.beam - 4, h.fx1 - h.fx0, h.top - KN.beam + 8);
  const body = polyPath([[h.x0 + 80, h.top], [h.x1 - 80, h.top], [h.x1, h.bot], [h.x0, h.bot]]);
  aoHalo(ctx, body, 30, 0.4, '#1a0a04', 10);
  castShadow(ctx, body, 22, 26, 0.5);
  castShadow(ctx, flue, 16, 18, 0.45);
  solid(ctx, flue, { x: h.fx0, y: KN.beam, w: h.fx1 - h.fx0, h: h.top - KN.beam }, CU, shade(COPPER, -0.12), { depth: 0.1, formSize: 40, line: 3 });
  within(ctx, flue, () => {
    cylinderBands(ctx, h.fx0, KN.beam, h.fx1 - h.fx0, h.top - KN.beam, '#ffc890', '#1a0602', 0.7);
    // soot climbing the flue, and the riveted seam bands
    vfill(ctx, h.fx0, KN.beam, h.fx1 - h.fx0, h.top - KN.beam, [[0, 'rgba(20,8,2,0.45)'], [1, 'rgba(20,8,2,0)']]);
    for (const yy of [KN.beam + 50, KN.beam + 110]) {
      ctx.fillStyle = 'rgba(40,12,4,0.5)';
      ctx.fillRect(h.fx0, yy, h.fx1 - h.fx0, 3);
      ctx.fillStyle = 'rgba(255,200,150,0.3)';
      ctx.fillRect(h.fx0, yy + 3, h.fx1 - h.fx0, 1.5);
      for (let x = h.fx0 + 12; x < h.fx1; x += 22) {
        ctx.fillStyle = 'rgba(40,12,4,0.6)';
        ctx.beginPath();
        ctx.arc(x, yy + 8, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,220,170,0.5)';
        ctx.fillRect(x - 1.5, yy + 6, 1.5, 1.5);
      }
    }
  });
  solid(ctx, body, { x: h.x0, y: h.top, w: h.x1 - h.x0, h: h.bot - h.top }, CU, COPPER, { depth: 0.1, formSize: 60, line: 3.5 });
  within(ctx, body, () => {
    // hammered: a field of small dents, each lit on its lower right (a dent is a hollow) and dark top-left
    for (let i = 0; i < 140; i++) {
      const x = h.x0 + r() * (h.x1 - h.x0);
      const y = h.top + r() * (h.bot - h.top);
      const s = 6 + r() * 7;
      ctx.fillStyle = 'rgba(60,20,6,0.08)';
      ctx.beginPath();
      ctx.ellipse(x - s * 0.2, y - s * 0.2, s, s * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,220,170,0.07)';
      ctx.beginPath();
      ctx.ellipse(x + s * 0.3, y + s * 0.3, s * 0.6, s * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // verdigris and soot gathered along the bottom, the fire's glow on its underside
    lay(ctx, drift('#5aa08a', '#2a1006', 7, 33, 128, 48), { x: h.x0, y: h.top, w: h.x1 - h.x0, h: h.bot - h.top }, 0.12);
    // the sloped face catches the light high on the left and falls into shade to the right
    const hg = ctx.createLinearGradient(h.x0, h.top, h.x1, h.bot);
    hg.addColorStop(0, 'rgba(255,210,160,0.3)');
    hg.addColorStop(0.35, 'rgba(255,210,160,0.06)');
    hg.addColorStop(0.7, 'rgba(40,10,4,0.18)');
    hg.addColorStop(1, 'rgba(40,10,4,0.4)');
    ctx.fillStyle = hg;
    ctx.fillRect(h.x0, h.top, h.x1 - h.x0, h.bot - h.top);
    vfill(ctx, h.x0, h.bot - 40, h.x1 - h.x0, 40, [[0, 'rgba(255,120,40,0)'], [1, 'rgba(255,120,40,0.25)']]);
  });
  rim(ctx, body, 0.35, 4);
  // the rolled lip along its bottom
  const lip = rrPath(h.x0 - 14, h.bot - 6, h.x1 - h.x0 + 28, 18, 8);
  castShadow(ctx, lip, 10, 10, 0.4);
  solid(ctx, lip, { x: h.x0 - 14, y: h.bot - 6, w: h.x1 - h.x0 + 28, h: 18 }, CU, shade(COPPER, 0.08), { depth: 0.1, line: 2.5, formSize: 8 });
  specHi(ctx, h.x0 + 120, h.top + 30, 40, 8, 0.4, -0.3);
  for (const x of [h.x0 + 20, h.x1 - 20]) {
    ctx.fillStyle = 'rgba(30,10,2,0.6)';
    ctx.beginPath();
    ctx.arc(x, h.bot + 3, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The range: cream enamel, black knobs, the oven glowing through its door, the cooktop's grates. */
function stove(ctx: Ctx, r: R): void {
  const s = KN.stove;
  const body = rrPath(s.x0, s.top + 8, s.x1 - s.x0, TY - s.top - 4, 8);
  aoHalo(ctx, body, 30, 0.45, '#1a0a04', 10);
  castShadow(ctx, body, 18, 20, 0.5);
  solid(ctx, body, { x: s.x0, y: s.top, w: s.x1 - s.x0, h: TY - s.top }, 'enamel', ENAMEL, { depth: 0.08, formSize: 40, line: 3.5 });
  within(ctx, body, () => {
    lay(ctx, drift('#fff6e0', '#8a6a40', 6, 13, 64, 64), { x: s.x0, y: s.top, w: s.x1 - s.x0, h: TY - s.top }, 0.2);
    // years of use: brown drips down from the knobs, scuffs along the kick
    vfill(ctx, s.x0, TY - 40, s.x1 - s.x0, 40, [[0, 'rgba(40,20,6,0)'], [1, 'rgba(40,20,6,0.4)']]);
  });
  streaks(ctx, r, 200, s.top + 46, 120, 30, '#7a4a20', 0.14, 4);
  // the back splash rail and cooktop
  const top = rrPath(s.x0 - 8, s.top, s.x1 - s.x0 + 16, 16, 4);
  solid(ctx, top, { x: s.x0 - 8, y: s.top, w: s.x1 - s.x0 + 16, h: 16 }, 'iron', '#2a2626', { depth: 0.08, line: 2.5 });
  // knobs
  for (let i = 0; i < 5; i++) {
    const x = s.x0 + 64 + i * 92;
    const k = ellPath(x, s.top + 44, 13, 13);
    castShadow(ctx, k, 6, 5, 0.45);
    solid(ctx, k, { x: x - 13, y: s.top + 31, w: 26, h: 26 }, 'plastic', '#1e1a1a', { depth: 0.06, line: 2, formSize: 5 });
    ctx.fillStyle = '#e8dcc4';
    ctx.fillRect(x - 1.5, s.top + 33, 3, 9);
  }
  // the oven door: a chrome handle, the window with the oven's glow behind
  const door = rrPath(s.x0 + 50, s.top + 76, s.x1 - s.x0 - 100, 170, 10);
  solid(ctx, door, { x: s.x0 + 50, y: s.top + 76, w: s.x1 - s.x0 - 100, h: 170 }, 'enamel', shade(ENAMEL, -0.04), { depth: 0.06, formSize: 24, line: 2.5 });
  const pane = rrPath(s.x0 + 96, s.top + 110, s.x1 - s.x0 - 192, 104, 8);
  within(ctx, pane, () => {
    vfill(ctx, s.x0 + 96, s.top + 110, s.x1 - s.x0 - 192, 104, [[0, '#4a1a08'], [0.6, '#c8501a'], [1, '#ffb050']]);
    glowAt(ctx, 290, s.top + 196, 150, '#ffd080', 0.5, 0.5);
    // the rack and a tray inside
    ctx.fillStyle = 'rgba(30,10,4,0.6)';
    ctx.fillRect(s.x0 + 96, s.top + 170, s.x1 - s.x0 - 192, 4);
    ctx.fillStyle = 'rgba(60,20,6,0.8)';
    ctx.fillRect(s.x0 + 140, s.top + 160, s.x1 - s.x0 - 280, 10);
  });
  glassPane(ctx, pane, { x: s.x0 + 96, y: s.top + 110, w: s.x1 - s.x0 - 192, h: 104 }, { sheen: 0.18 });
  const hd = rrPath(s.x0 + 80, s.top + 88, s.x1 - s.x0 - 160, 12, 6);
  castShadow(ctx, hd, 10, 8, 0.45);
  solid(ctx, hd, { x: s.x0 + 80, y: s.top + 88, w: s.x1 - s.x0 - 160, h: 12 }, 'chrome', '#c8ccd4', { depth: 0.06, line: 2 });
  // the oven's heat glowing on the floor of the counter in front
  bounceBand(ctx, s.x0, s.x1, TY, -40, '#ff8a3a', 0.12);
  creviceV(ctx, s.x1, s.top + 10, TY, 46, 0.45);
}

/** The pots on the burners: the big copper sauce pot, the small steel pot (its lid is a live layer). */
function pots(ctx: Ctx, r: R): void {
  const p = KN.pot;
  // the grates under them
  // (cast iron on the cooktop: the burner's crown, four fingers holding the pot up off it, a ring round them)
  const top = KN.stove.top;
  for (const [x, w] of [[p.x, p.w + 40], [KN.small.x, KN.small.w + 30]] as const) {
    ctx.fillStyle = '#0e0c0c';
    ctx.beginPath();
    ctx.ellipse(x, top - 1, w * 0.3, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let k = -2; k <= 2; k++) {
      const fx = x + k * (w / 5);
      ctx.fillStyle = '#1a1716';
      ctx.fillRect(fx - 3, p.y, 6, top - p.y);
      ctx.fillStyle = 'rgba(255,200,150,0.18)';
      ctx.fillRect(fx - 3, p.y, 1.5, top - p.y);
    }
    ctx.fillStyle = '#1a1716';
    ctx.fillRect(x - w / 2, p.y - 1, w, 5);
    ctx.fillStyle = 'rgba(255,210,160,0.22)';
    ctx.fillRect(x - w / 2, p.y - 1, w, 1.5);
  }
  // the sauce pot
  const body = (c: Ctx) => {
    c.beginPath();
    c.moveTo(p.x - p.w / 2, p.y - p.h);
    c.lineTo(p.x - p.w / 2 + 4, p.y - 12);
    c.quadraticCurveTo(p.x, p.y + 2, p.x + p.w / 2 - 4, p.y - 12);
    c.lineTo(p.x + p.w / 2, p.y - p.h);
    c.closePath();
  };
  castShadow(ctx, body, 16, 16, 0.45);
  solid(ctx, body, { x: p.x - p.w / 2, y: p.y - p.h, w: p.w, h: p.h }, CU, shade(COPPER, -0.05), { depth: 0.06, formSize: 40, line: 3.5 });
  within(ctx, body, () => {
    lay(ctx, drift('#ffb070', '#3a1206', 5, 29, 64, 32), { x: p.x - p.w / 2, y: p.y - p.h, w: p.w, h: p.h }, 0.14);
    cylinderBands(ctx, p.x - p.w / 2, p.y - p.h, p.w, p.h, '#ffd2a0', '#2a0804');
    // sauce run down the side, the gas's blue on the bottom
    ctx.fillStyle = 'rgba(150,30,14,0.75)';
    ctx.beginPath();
    ctx.moveTo(p.x + 30, p.y - p.h);
    ctx.quadraticCurveTo(p.x + 34, p.y - p.h + 30, p.x + 30, p.y - p.h + 44);
    ctx.quadraticCurveTo(p.x + 24, p.y - p.h + 30, p.x + 20, p.y - p.h);
    ctx.fill();
    vfill(ctx, p.x - p.w / 2, p.y - 30, p.w, 30, [[0, 'rgba(80,140,255,0)'], [1, 'rgba(80,140,255,0.35)']]);
  });
  rim(ctx, body, 0.4, 4);
  // handles
  for (const s of [-1, 1]) {
    const hx = p.x + s * (p.w / 2 + 14);
    const hd = rrPath(hx - 14, p.y - p.h + 14, 28, 12, 6);
    solid(ctx, hd, { x: hx - 14, y: p.y - p.h + 14, w: 28, h: 12 }, 'iron', '#3a2a22', { depth: 0.06, line: 2 });
  }
  sauceSurface(ctx, 0);
  // the small steel pot
  const s = KN.small;
  const sb = rrPath(s.x - s.w / 2, s.y - s.h, s.w, s.h, 6);
  castShadow(ctx, sb, 12, 12, 0.45);
  solid(ctx, sb, { x: s.x - s.w / 2, y: s.y - s.h, w: s.w, h: s.h }, 'chrome', '#b4bac4', { depth: 0.06, formSize: 24, line: 3 });
  within(ctx, sb, () => cylinderBands(ctx, s.x - s.w / 2, s.y - s.h, s.w, s.h, '#ffffff', '#1a1e2a', 0.8));
  rim(ctx, sb, 0.4, 3);
  spoon(ctx);
  void r;
}

/** The wooden spoon leaning in the sauce: worn pale where it's held, stained red where it's been stirring. */
function spoon(ctx: Ctx): void {
  const p = KN.pot;
  const y = p.y - p.h;
  const a = [p.x - 14, y + 2];
  const b = [p.x + 132, y - 72];
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  ctx.save();
  ctx.translate(a[0], a[1]);
  ctx.rotate(ang);
  const handle = (c: Ctx) => {
    c.beginPath();
    c.moveTo(0, -4.5);
    c.lineTo(len - 10, -6);
    c.quadraticCurveTo(len + 2, 0, len - 10, 6);
    c.lineTo(0, 4.5);
    c.closePath();
  };
  ctx.save();
  ctx.translate(4, 7);
  ctx.fillStyle = 'rgba(40,10,4,0.3)';
  handle(ctx);
  ctx.fill();
  ctx.restore();
  solid(ctx, handle, { x: 0, y: -6, w: len + 2, h: 12 }, 'wood', '#c89a62', { depth: 0.05, line: 2, formSize: 4 });
  within(ctx, handle, () => {
    // the stain: sauce soaked into the wood, deepest at the end in the pot
    const g = ctx.createLinearGradient(0, 0, len * 0.4, 0);
    g.addColorStop(0, 'rgba(150,30,12,0.85)');
    g.addColorStop(1, 'rgba(150,30,12,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, -8, len * 0.4, 16);
    ctx.fillStyle = 'rgba(255,240,210,0.35)';
    ctx.fillRect(len * 0.35, -4, len * 0.6, 1.5);
  });
  ctx.restore();
}
const SPOON_BOX = { x: KN.pot.x - 30, y: KN.pot.y - KN.pot.h - 90, w: 180, h: 104 };

/** Polished metal round a cylinder: dark at the turning edges, a hot band of the room's light on the lit side, a
 * dark band of the room's shadow beside it, the warm bounce of the stove low on the far side. */
function cylinderBands(ctx: Ctx, x: number, y: number, w: number, h: number, lit: string, dark: string, a = 1): void {
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, rgba(dark, 0.55 * a));
  g.addColorStop(0.1, rgba(dark, 0.1 * a));
  g.addColorStop(0.2, rgba(lit, 0.42 * a));
  g.addColorStop(0.27, rgba(lit, 0.1 * a));
  g.addColorStop(0.42, rgba(dark, 0));
  g.addColorStop(0.55, rgba(dark, 0.28 * a));
  g.addColorStop(0.7, rgba(dark, 0.05 * a));
  g.addColorStop(0.84, rgba(lit, 0.14 * a));
  g.addColorStop(1, rgba(dark, 0.6 * a));
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  // a crisp highlight line inside the hot band
  ctx.fillStyle = rgba(lit, 0.5 * a);
  ctx.fillRect(x + w * 0.205, y + 6, Math.max(2, w * 0.012), h - 14);
}

/** The sauce's surface at a bubbling phase (0…1, loops): a deep red pool turning slowly, oil gathering in amber
 * beads that ride the current; bubbles that dome up glossy, stretch thin and pop, throwing a crown of drops and
 * leaving a crater that heals in a ring. */
function sauceSurface(ctx: Ctx, phase: number): void {
  const p = KN.pot;
  const cx = p.x;
  const cy = p.y - p.h;
  const rx = p.w / 2 - 6;
  const ry = 15;
  const P = Math.PI * 2;
  ctx.save();
  // the pot's rim seen from above: the inside wall in shade at the back
  ctx.beginPath();
  ctx.ellipse(cx, cy, p.w / 2 + 2, ry + 3, 0, 0, P);
  ctx.fillStyle = '#4a1a0a';
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx, cy + 2, rx, ry, 0, 0, P);
  ctx.save();
  ctx.clip();
  const g = ctx.createRadialGradient(cx - 22, cy - 2, 4, cx, cy + 2, rx);
  g.addColorStop(0, '#d8401e');
  g.addColorStop(0.65, '#a8220e');
  g.addColorStop(1, '#4a0a04');
  ctx.fillStyle = g;
  ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2 + 4);
  // the slow roll: the sauce turns over, rising in the middle and sinking at the walls; oil beads ride it round
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * P + phase * P;
    const rr = 0.25 + ((i * 37) % 10) / 14;
    const x = cx + Math.cos(a) * rx * rr;
    const y = cy + 2 + Math.sin(a) * ry * rr * 0.9;
    const oil = i % 3 !== 0;
    ctx.fillStyle = oil ? 'rgba(255,170,60,0.4)' : 'rgba(40,80,20,0.75)';
    ctx.beginPath();
    ctx.ellipse(x, y, oil ? 3.2 : 3.6, oil ? 1.4 : 1.6, a * 0.3, 0, P);
    ctx.fill();
    if (oil) {
      ctx.fillStyle = 'rgba(255,240,200,0.6)';
      ctx.fillRect(x - 1, y - 1, 1.5, 1);
    }
  }
  // bubbles: each on its own beat (1, 2 or 3 per loop), at its own place
  const B: [number, number, number, number, number][] = [
    // x, y (in rx/ry units), size, beats per loop, offset
    [-0.45, 0.1, 1, 1, 0], [0.1, 0.05, 1.2, 1, 0.45], [0.5, 0.25, 0.85, 2, 0.2], [-0.1, 0.4, 0.7, 2, 0.7], [0.62, -0.1, 0.7, 3, 0.1], [-0.65, -0.05, 0.75, 2, 0.35], [0.25, 0.45, 0.6, 3, 0.55],
  ];
  for (const [ux, uy, sz, beats, off] of B) {
    const u = (phase * beats + off) % 1;
    const bx = cx + ux * rx;
    const by = cy + 2 + uy * ry;
    if (u < 0.7) {
      // swelling: a glossy dome, its shadow under it, the room's light caught on its top left
      const k = u / 0.7;
      const s = (2.5 + k * 8) * sz;
      ctx.fillStyle = 'rgba(60,6,2,0.45)';
      ctx.beginPath();
      ctx.ellipse(bx + s * 0.15, by + s * 0.18, s * 1.05, s * 0.5, 0, 0, P);
      ctx.fill();
      const dg = ctx.createRadialGradient(bx - s * 0.35, by - s * 0.55, 0, bx, by - s * 0.25, s);
      dg.addColorStop(0, '#f05a30');
      dg.addColorStop(0.6, '#b82610');
      dg.addColorStop(1, '#7a1406');
      ctx.fillStyle = dg;
      ctx.beginPath();
      ctx.ellipse(bx, by - s * 0.25, s, s * 0.62, 0, 0, P);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,230,200,0.85)';
      ctx.beginPath();
      ctx.ellipse(bx - s * 0.38, by - s * 0.55, s * 0.26, s * 0.12, -0.4, 0, P);
      ctx.fill();
    } else if (u < 0.78) {
      // stretched thin, paler, about to go
      const k = (u - 0.7) / 0.08;
      const s = 10.5 * sz * (1 + k * 0.12);
      ctx.fillStyle = 'rgba(60,6,2,0.4)';
      ctx.beginPath();
      ctx.ellipse(bx + s * 0.15, by + s * 0.18, s * 1.05, s * 0.5, 0, 0, P);
      ctx.fill();
      // the skin gone thin: lighter and more see-through towards its crown, its highlight spread wide
      const fg = ctx.createRadialGradient(bx - s * 0.2, by - s * 0.6, 0, bx, by - s * 0.3, s);
      fg.addColorStop(0, rgba('#ff9a70', 0.9));
      fg.addColorStop(0.7, rgba('#d8401c', 0.9));
      fg.addColorStop(1, rgba('#8a1808', 0.95));
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.ellipse(bx, by - s * 0.3, s, s * 0.7, 0, 0, P);
      ctx.fill();
      ctx.strokeStyle = rgba('#ffe0c8', 0.55);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(bx - s * 0.1, by - s * 0.45, s * 0.65, s * 0.42, 0, Math.PI * 1.05, Math.PI * 1.6);
      ctx.stroke();
    } else {
      // popped: a crater (dark), a ring spreading and settling, a crown of drops thrown up and falling back
      const k = (u - 0.78) / 0.22;
      const s = 10 * sz;
      ctx.fillStyle = rgba('#3a0602', 0.7 * (1 - k));
      ctx.beginPath();
      ctx.ellipse(bx, by, s * (0.7 - k * 0.5), s * (0.34 - k * 0.24), 0, 0, P);
      ctx.fill();
      ctx.strokeStyle = rgba('#ff6a3a', 0.75 * (1 - k));
      ctx.lineWidth = 1.6 * (1 - k * 0.5);
      ctx.beginPath();
      ctx.ellipse(bx, by, s * (0.8 + k * 1.3), s * (0.4 + k * 0.5), 0, 0, P);
      ctx.stroke();
    }
  }
  // the hood's light: a sheen across the far side
  ctx.fillStyle = 'rgba(255,220,180,0.16)';
  ctx.beginPath();
  ctx.ellipse(cx - 20, cy - 6, rx * 0.6, 3, 0, 0, P);
  ctx.fill();
  ctx.restore();
  // drops from the bursting bubbles (above the surface: not clipped to it)
  for (const [ux, uy, sz, beats, off] of B) {
    const u = (phase * beats + off) % 1;
    if (u < 0.78) continue;
    const k = (u - 0.78) / 0.22;
    const bx = cx + ux * rx;
    const by = cy + 2 + uy * ry;
    for (let d = 0; d < 5; d++) {
      const a = -Math.PI / 2 + (d - 2) * 0.55;
      const v = (16 + d * 3) * sz;
      const x = bx + Math.cos(a) * v * k * 1.3;
      const y = by + Math.sin(a) * v * k * 1.6 + 70 * k * k;
      if (y > by + 2) continue;
      ctx.fillStyle = '#b8240e';
      ctx.beginPath();
      ctx.ellipse(x, y, 1.9 * sz, 2.4 * sz, a + Math.PI / 2, 0, P);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,210,180,0.8)';
      ctx.fillRect(x - 0.8, y - 1.2, 1, 1);
    }
  }
  ctx.restore();
}
const SAUCE_BOX = { x: KN.pot.x - KN.pot.w / 2 - 6, y: KN.pot.y - KN.pot.h - 40, w: KN.pot.w + 12, h: 62 };

/** The small pot's lid (live: it rattles). */
function lid(ctx: Ctx): void {
  const s = KN.small;
  const y = s.y - s.h;
  const l = (c: Ctx) => {
    c.beginPath();
    c.moveTo(s.x - s.w / 2 - 4, y + 2);
    c.quadraticCurveTo(s.x, y - 26, s.x + s.w / 2 + 4, y + 2);
    c.closePath();
  };
  castShadow(ctx, l, 6, 6, 0.35);
  solid(ctx, l, { x: s.x - s.w / 2 - 4, y: y - 20, w: s.w + 8, h: 22 }, 'chrome', '#c4cad4', { depth: 0.05, line: 2.5, formSize: 10 });
  const k = ellPath(s.x, y - 16, 9, 6);
  solid(ctx, k, { x: s.x - 9, y: y - 22, w: 18, h: 12 }, 'plastic', '#1e1a1a', { depth: 0.05, line: 2 });
}
const LID_BOX = { x: KN.small.x - 70, y: KN.small.y - KN.small.h - 40, w: 140, h: 52 };

/** The tea towel over the oven door's handle (live: it sways). */
function towel(ctx: Ctx): void {
  const s = KN.stove;
  const x = s.x0 + 340;
  const y = s.top + 92;
  const path = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x - 30, y - 4);
    c.lineTo(x + 30, y - 4);
    c.quadraticCurveTo(x + 36, y + 80, x + 32, y + 130);
    c.lineTo(x - 28, y + 132);
    c.quadraticCurveTo(x - 36, y + 70, x - 30, y - 4);
    c.closePath();
  };
  castShadow(ctx, path, 10, 10, 0.4);
  solid(ctx, path, { x: x - 36, y: y - 4, w: 72, h: 136 }, 'canvas', '#f2ece0', { depth: 0.05, line: 2.5, formSize: 14 });
  within(ctx, path, () => {
    for (const yy of [y + 18, y + 30, y + 104, y + 116]) {
      ctx.fillStyle = '#c03028';
      ctx.fillRect(x - 40, yy, 80, yy % 2 ? 4 : 7);
    }
    // folds
    for (const dx of [-12, 8]) {
      const g = ctx.createLinearGradient(x + dx - 6, 0, x + dx + 6, 0);
      g.addColorStop(0, 'rgba(255,255,255,0.15)');
      g.addColorStop(0.5, 'rgba(60,30,20,0.18)');
      g.addColorStop(1, 'rgba(60,30,20,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x + dx - 6, y, 12, 134);
    }
  });
}
const TOWEL_BOX = { x: KN.stove.x0 + 290, y: KN.stove.top + 80, w: 110, h: 160 };

/** The walnut dresser on the right, with a marble top and a bowl of tomatoes. */
function dresser(ctx: Ctx, r: R): void {
  const c = KN.cab;
  const body = rectPath(c.x0, c.top + 18, c.x1 - c.x0, TY - c.top - 14);
  aoHalo(ctx, body, 30, 0.45, '#1a0a04', 10);
  creviceV(ctx, c.x0, c.top, TY, -40, 0.4);
  solid(ctx, body, { x: c.x0, y: c.top, w: c.x1 - c.x0, h: TY - c.top }, 'wood', '#5a321c', { depth: 0.08, line: 3, formSize: 20 });
  for (const [x, w] of [[c.x0 + 24, 160], [c.x0 + 202, 160]] as const) panel(ctx, r, x, c.top + 44, w, 150, '#5e341e', { lights: [{ x: x + 40, a: 0.2 }] });
  for (const x of [c.x0 + 172, c.x0 + 214]) {
    const k = ellPath(x, c.top + 120, 6, 6);
    solid(ctx, k, { x: x - 6, y: c.top + 114, w: 12, h: 12 }, 'chrome', '#c8a050', { depth: 0.05, line: 1.5 });
  }
  // the marble top
  const top = rectPath(c.x0 - 10, c.top, c.x1 - c.x0 + 10, 20);
  castShadow(ctx, top, 10, 10, 0.4);
  solid(ctx, top, { x: c.x0 - 10, y: c.top, w: c.x1 - c.x0 + 10, h: 20 }, 'stone', '#e8e2d8', { depth: 0.08, line: 2.5, formSize: 6 });
  varnish(ctx, { x: c.x0 - 10, y: c.top, w: c.x1 - c.x0 + 10, h: 6 }, [{ x: c.x0 + 100, a: 0.4 }]);
  // the bowl of tomatoes
  const { x, y } = KN.bowl;
  groundShadow(ctx, x + 10, y, 100, 9, 0.5);
  const toms: [number, number, number][] = [[-50, -18, 24], [-14, -34, 26], [24, -22, 25], [54, -16, 20], [8, -50, 22]];
  for (const [dx, dy, rr] of toms) {
    const t = ellPath(x + dx, y + dy - 18, rr, rr * 0.92);
    solid(ctx, t, { x: x + dx - rr, y: y + dy - 18 - rr, w: rr * 2, h: rr * 2 }, 'plastic', '#d8301e', { depth: 0.06, line: 2.2, formSize: rr * 0.5 });
    ctx.fillStyle = '#3a7a2a';
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(x + dx + Math.cos(a) * 6, y + dy - 18 - rr * 0.85 + Math.sin(a) * 3, 6, 2.2, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const bowl = (g: Ctx) => {
    g.beginPath();
    g.moveTo(x - 96, y - 40);
    g.quadraticCurveTo(x - 90, y, x - 40, y);
    g.lineTo(x + 40, y);
    g.quadraticCurveTo(x + 90, y, x + 96, y - 40);
    g.closePath();
  };
  solid(ctx, bowl, { x: x - 96, y: y - 40, w: 192, h: 40 }, 'enamel', '#f2ecdc', { depth: 0.06, line: 2.8, formSize: 16 });
  ctx.strokeStyle = '#2a5aa8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 88, y - 26);
  ctx.quadraticCurveTo(x, y - 12, x + 88, y - 26);
  ctx.stroke();
}

function herbs(ctx: Ctx, r: R): void {
  for (const x of KN.herbs) {
    hang(ctx, x, KN.beam, x, KN.beam + 40, 0, '#a88a5a', 2);
    for (let i = 0; i < 28; i++) {
      const a = Math.PI / 2 + (r() - 0.5) * 0.9;
      const len = 60 + r() * 80;
      const sx = x + (r() - 0.5) * 8;
      const sy = KN.beam + 40;
      ctx.strokeStyle = shade('#5a7a3a', (r() - 0.5) * 0.3);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      const ex = sx + Math.cos(a) * len;
      const ey = sy + Math.sin(a) * len;
      ctx.quadraticCurveTo(sx + Math.cos(a) * len * 0.5 + 4, sy + Math.sin(a) * len * 0.5, ex, ey);
      ctx.stroke();
      for (let k = 0; k < 4; k++) {
        const t = 0.4 + k * 0.15;
        ctx.fillStyle = shade('#6a8a4a', (r() - 0.5) * 0.4);
        ctx.beginPath();
        ctx.ellipse(sx + (ex - sx) * t + (k % 2 ? 4 : -4), sy + (ey - sy) * t, 4, 2, a + (k % 2 ? 0.7 : -0.7), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = '#b8302a';
    ctx.fillRect(x - 7, KN.beam + 36, 14, 8);
  }
}

function rail(ctx: Ctx): void {
  const { x0, x1, y } = KN.rail;
  const bar = rrPath(x0, y - 5, x1 - x0, 10, 5);
  castShadow(ctx, bar, 10, 8, 0.45);
  solid(ctx, bar, { x: x0, y: y - 5, w: x1 - x0, h: 10 }, CU, '#b0703a', { depth: 0.1, line: 2 });
  for (const x of [x0, x1]) {
    const k = ellPath(x, y, 10, 10);
    solid(ctx, k, { x: x - 10, y: y - 10, w: 20, h: 20 }, CU, '#a86a36', { depth: 0.1, line: 2 });
  }
}

/** A copper pan hung by its handle from an S-hook (its own sprite: it swings). */
function pan(ctx: Ctx, i: number): void {
  const p = KN.pans[i];
  const y0 = KN.rail.y;
  const hy = y0 + 18;
  // the S-hook
  ctx.strokeStyle = '#2a2420';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(p.x, y0 + 4, 7, Math.PI, Math.PI * 2.4);
  ctx.moveTo(p.x, y0 + 10);
  ctx.arc(p.x, hy, 7, -Math.PI * 0.5, Math.PI * 0.9);
  ctx.stroke();
  // the handle, then the pan's back (we see its copper bottom, lit like a dish)
  const cy = hy + p.len + p.r;
  const hd = rrPath(p.x - 7, hy, 14, p.len + 8, 6);
  const disc = ellPath(p.x, cy, p.r, p.r);
  castShadow(ctx, disc, 16, 16, 0.5);
  castShadow(ctx, hd, 12, 10, 0.4);
  solid(ctx, hd, { x: p.x - 7, y: hy, w: 14, h: p.len + 8 }, 'iron', '#3a2e28', { depth: 0.08, line: 2 });
  ctx.fillStyle = '#1a1210';
  ctx.beginPath();
  ctx.arc(p.x, hy + 8, 3.5, 0, Math.PI * 2);
  ctx.fill();
  solid(ctx, disc, { x: p.x - p.r, y: cy - p.r, w: p.r * 2, h: p.r * 2 }, CU, COPPER, { depth: 0.08, formSize: p.r * 0.7, line: 3 });
  within(ctx, disc, () => {
    // spun rings and a tarnished bloom; the window's light in it
    ctx.strokeStyle = 'rgba(255,220,170,0.12)';
    ctx.lineWidth = 1;
    for (let k = 6; k < p.r; k += 5) {
      ctx.beginPath();
      ctx.arc(p.x, cy, k, 0, Math.PI * 2);
      ctx.stroke();
    }
    lay(ctx, drift('#ffd8a8', '#4a2a2a', 3, 7 + i, 32, 32), { x: p.x - p.r, y: cy - p.r, w: p.r * 2, h: p.r * 2 }, 0.3);
  });
  rim(ctx, disc, 0.4, 4);
  within(ctx, disc, () => {
    // a polished dish: the window's light as a hot crescent top-left, the room dark across the middle, the lower rim
    // falling into oxblood, a warm bounce off the wall along the bottom-right edge
    const g = ctx.createLinearGradient(p.x - p.r, cy - p.r, p.x + p.r, cy + p.r);
    g.addColorStop(0, 'rgba(255,226,180,0.55)');
    g.addColorStop(0.28, 'rgba(255,200,150,0.08)');
    g.addColorStop(0.55, 'rgba(50,10,4,0.25)');
    g.addColorStop(0.85, 'rgba(50,10,4,0.5)');
    g.addColorStop(1, 'rgba(255,150,90,0.35)');
    ctx.fillStyle = g;
    ctx.fillRect(p.x - p.r, cy - p.r, p.r * 2, p.r * 2);
    ctx.strokeStyle = 'rgba(255,236,200,0.75)';
    ctx.lineWidth = Math.max(2, p.r * 0.07);
    ctx.beginPath();
    ctx.arc(p.x, cy, p.r * 0.78, Math.PI * 1.08, Math.PI * 1.42);
    ctx.stroke();
  });
  specHi(ctx, p.x - p.r * 0.4, cy - p.r * 0.45, p.r * 0.3, p.r * 0.1, 0.8, -0.7);
}
const PAN_BOX = (i: number) => {
  const p = KN.pans[i];
  return { x: p.x - p.r - 10, y: KN.rail.y - 6, w: p.r * 2 + 50, h: 18 + p.len + p.r * 2 + 40 };
};

/** Nonna's worktable: scrubbed beech planks running away from us, pale where they're scrubbed, flour dusted into the
 * grain at the ends, the sun's long patch across it; a thick apron with a drawer along the front. */
function table(ctx: Ctx, r: R): void {
  const F = KN.front;
  planksPlane(ctx, r, F, '#c8925a', 0.2, 0.004, false);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, F - TY + 4);
  ctx.clip();
  // scrubbed pale in the middle where the dough's worked, the ends darker and oilier
  lay(ctx, drift('#f4e2c4', '#5a3a22', 5, 61, 256, 48), { x: 0, y: TY, w: W, h: F - TY }, 0.16);
  vfill(ctx, 0, TY, W, F - TY, [[0, 'rgba(40,20,8,0.22)'], [0.35, 'rgba(40,20,8,0.04)'], [1, 'rgba(40,20,8,0)']]);
  // flour: a soft dusting worked into the grain at both ends, a thin drift down the middle, never under the pizzas
  for (const [x, y, rx, ry, a] of [[120, 960, 260, 90, 0.5], [1810, 950, 240, 80, 0.45], [960, 1010, 700, 40, 0.18], [700, 800, 160, 22, 0.16], [1260, 806, 180, 24, 0.14]] as const) {
    softly(ctx, { x: x - rx * 1.3, y: y - ry * 1.3, w: rx * 2.6, h: ry * 2.6 }, (g) => {
      const fg = g.createRadialGradient(x, y, 0, x, y, rx);
      fg.addColorStop(0, rgba('#fbf4e6', a));
      fg.addColorStop(0.55, rgba('#fbf4e6', a * 0.45));
      fg.addColorStop(1, rgba('#fbf4e6', 0));
      g.save();
      g.translate(x, y);
      g.scale(1, ry / rx);
      g.translate(-x, -y);
      g.fillStyle = fg;
      g.beginPath();
      g.arc(x, y, rx, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }, 0.25);
  }
  // the stove's warmth on the near-left boards, the sun through the window lying across the table in a long patch
  lightPool(ctx, 290, 800, 420, 70, '#ff9a4a', 0.14);
  lightPatch(ctx, [[WIN.x0 + 220, TY + 4], [WIN.x1 + 240, TY + 4], [WIN.x1 + 420, 940], [WIN.x0 + 380, 940]], { col: '#fff0c8', a: 0.12, barsU: [0.5], bar: 0.03, soft: 12, fade: 0.7 });
  varnish(ctx, { x: 0, y: TY, w: W, h: F - TY }, [{ x: WIN.x0 + 300, a: 0.1, w: 200, col: '#fff0d0' }], { sheen: 0.04 });
  ctx.restore();
  tableFalloff(ctx, F, 0.36, '#2a1206');
  tableSeam(ctx, 0.5, '#2a1810', false);
  tableProps(ctx, r);
  // the apron: a thick beech rail with a drawer, its pull, the edge rounded and worn pale where hands rest
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, F, W, 1080 - F);
  ctx.clip();
  board(ctx, r, 0, F, W, 1080 - F, '#8a5a32');
  vfill(ctx, 0, F, W, 1080 - F, [[0, 'rgba(30,12,4,0.55)'], [1, 'rgba(30,12,4,0.25)']]);
  const dr = rrPath(780, F + 8, 360, 60, 4);
  castShadow(ctx, dr, 3, 3, 0.4);
  solid(ctx, dr, { x: 780, y: F + 8, w: 360, h: 60 }, 'wood', '#7a4a28', { depth: 0.03, line: 2, formSize: 6 });
  const pull = ellPath(960, F + 24, 12, 7);
  solid(ctx, pull, { x: 948, y: F + 17, w: 24, h: 14 }, 'iron', '#3a2a22', { depth: 0.03, line: 1.5 });
  ctx.restore();
  ctx.fillStyle = rgba('#fff0d0', 0.45);
  ctx.fillRect(0, F - 3, W, 3);
  ctx.fillStyle = 'rgba(40,20,6,0.75)';
  ctx.fillRect(0, F, W, 2);
}

/** At the table's ends, out of the lanes: the rolling pin in its flour, a crock of eggs. */
function tableProps(ctx: Ctx, r: R): void {
  // the rolling pin, lying at an angle, its handles worn dark
  const px = 118;
  const py = 975;
  groundShadow(ctx, px + 12, py + 20, 116, 12, 0.42, '#3a1a08', 1.3);
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(-0.22);
  const body = rrPath(-74, -16, 148, 32, 16);
  solid(ctx, body, { x: -74, y: -16, w: 148, h: 32 }, 'wood', '#e0b87e', { depth: 0.02, line: 2.6, formSize: 10 });
  within(ctx, body, () => {
    ctx.fillStyle = 'rgba(255,250,240,0.35)';
    ctx.fillRect(-68, 5, 136, 8);
  });
  for (const sx of [-1, 1]) {
    const hd = rrPath(sx < 0 ? -116 : 76, -7, 40, 14, 7);
    solid(ctx, hd, { x: sx < 0 ? -116 : 76, y: -7, w: 40, h: 14 }, 'wood', '#9a6a3a', { depth: 0.02, line: 2.2, formSize: 5 });
  }
  ctx.restore();
  // a stoneware crock of eggs at the right end
  const cx = 1800;
  const cy = 900;
  groundShadow(ctx, cx + 16, cy + 2, 92, 12, 0.45, '#3a1a08', 1.3);
  const eggs: [number, number, number][] = [[-40, -70, 26], [-4, -82, 27], [34, -72, 25], [12, -62, 24]];
  for (const [dx, dy, rr] of eggs) {
    const e = ellPath(cx + dx, cy + dy, rr * 0.8, rr);
    solid(ctx, e, { x: cx + dx - rr, y: cy + dy - rr, w: rr * 2, h: rr * 2 }, 'enamel', r() < 0.5 ? '#f0dcc0' : '#e8c8a0', { depth: 0.03, line: 2, formSize: rr * 0.5 });
  }
  const crock = (c: Ctx) => {
    c.beginPath();
    c.moveTo(cx - 78, cy - 64);
    c.quadraticCurveTo(cx - 84, cy - 10, cx - 56, cy);
    c.lineTo(cx + 56, cy);
    c.quadraticCurveTo(cx + 84, cy - 10, cx + 78, cy - 64);
    c.closePath();
  };
  solid(ctx, crock, { x: cx - 84, y: cy - 64, w: 168, h: 64 }, 'enamel', '#b4643a', { depth: 0.03, line: 2.8, formSize: 18 });
  within(ctx, crock, () => {
    // the glaze stops short of the foot: bare clay below a wavering line, a pale slip band at the lip
    ctx.fillStyle = 'rgba(232,200,150,0.55)';
    ctx.fillRect(cx - 90, cy - 64, 180, 9);
    ctx.fillStyle = 'rgba(120,60,30,0.45)';
    ctx.beginPath();
    ctx.moveTo(cx - 90, cy - 16);
    for (let x = -90; x <= 90; x += 10) ctx.lineTo(cx + x, cy - 16 + Math.sin(x * 0.2) * 3);
    ctx.lineTo(cx + 90, cy + 4);
    ctx.lineTo(cx - 90, cy + 4);
    ctx.fill();
  });
  specHi(ctx, cx - 44, cy - 50, 14, 5, 0.4, -0.3);
}

/** Painted for the still: the sauce's steam, the gas flames, a puff at the lid (live: their animated versions). */
function stillFx(ctx: Ctx): void {
  const p = KN.pot;
  const [sw, sh] = [240, 300];
  ctx.save();
  ctx.translate(p.x - sw / 2, p.y - p.h - sh + 10);
  steamFrame(ctx, sw, sh, 0.3, { a: 0.4, lit: '#fff6ea', body: '#eee6e0', shade: '#a89aa0', seed: 2 });
  ctx.restore();
  burner(ctx, p.x, p.w + 10, 0.3);
  burner(ctx, KN.small.x, KN.small.w, 0.6);
}

function burner(ctx: Ctx, x: number, w: number, phase: number): void {
  const n = Math.round(w / 22);
  for (let i = 0; i < n; i++) {
    ctx.save();
    ctx.translate(x - w / 2 + (i + 0.5) * (w / n) - 9, KN.stove.top - 22);
    flameFrame(ctx, 18, 22, (phase + i * 0.37) % 1, GAS, 1, i);
    ctx.restore();
  }
}

function grade(ctx: Ctx): void {
  gradeAll(ctx, 0.05, '#ffb070', 0.07, { warm: '#ffc070', cool: '#5068b8', a: 0.24 });
}

function shadeOver(ctx: Ctx): void {
  calmLanes(ctx, 0.14, '#2a140a', 60, 520);
  vignetteAll(ctx, 0.72, '#1a0804');
  vfill(ctx, 0, 0, W, 170, [[0, 'rgba(14,6,2,0.34)'], [1, 'rgba(14,6,2,0)']]);
}

const FX_STILL_BOX = { x: 0, y: KN.pot.y - KN.pot.h - 300, w: 620, h: 330 };

export const KITCHEN: SceneSpec = {
  id: 'kitchen',
  info: {
    name: "Nonna's Kitchen",
    subtitle: 'Waves 31–34',
    ambient: ['dust'],
    glows: [
      { x: 290, y: KN.stove.top + 160, r: 200, color: '#ff8a2a', flicker: 0.3 },
      { x: KN.pot.x, y: KN.stove.top - 8, r: 140, color: '#4a8aff', flicker: 0.4 },
      { x: WIN.x0 + 110, y: WIN.y0 + 120, r: 240, color: '#fff0c8', flicker: 0 },
    ],
    light: '#ffd8a0',
    tableTint: '#fff2e0',
  },
  layers: [
    { id: 'wall', box: { x: 0, y: 0, w: W, h: TY }, draw: wall },
    { id: 'windowLight', box: { x: WIN.x0 - 20, y: WIN.y0, w: 600, h: TY - WIN.y0 }, draw: windowLight },
    { id: 'view', box: WIN_BOX, draw: (c, r) => view(c, r, false) },
    { id: 'viewEve', box: WIN_BOX, liveOnly: true, res: 0.75, draw: (c, r) => view(c, r, true) },
    { id: 'viewNight', box: WIN_BOX, liveOnly: true, res: 0.75, draw: viewNight },
    { id: 'window', box: { x: WIN.x0 - 38, y: WIN.y0 - 60, w: WIN_BOX.w + 108, h: WIN_BOX.h + 110 }, draw: windowFrame },
    { id: 'garlic', box: { x: KN.garlic.x - 44, y: KN.garlic.y - 4, w: 88, h: 300 }, motion: 'sprite', draw: garlic },
    { id: 'shelf', box: { x: KN.shelf.x0 - 40, y: KN.shelf.y - 110, w: KN.shelf.x1 - KN.shelf.x0 + 80, h: 190 }, draw: shelf },
    { id: 'hood', box: { x: KN.hood.x0 - 40, y: KN.beam - 8, w: 540, h: KN.hood.bot - KN.beam + 60 }, draw: hood },
    { id: 'stove', box: { x: 0, y: KN.stove.top - 20, w: 600, h: TY - KN.stove.top + 24 }, draw: stove },
    { id: 'towel', box: TOWEL_BOX, motion: 'sprite', draw: towel },
    { id: 'pots', box: { x: 60, y: KN.pot.y - KN.pot.h - 100, w: 560, h: KN.pot.h + 150 }, draw: pots },
    { id: 'lid', box: LID_BOX, motion: 'sprite', draw: lid },
    { id: 'dresser', box: { x: KN.cab.x0 - 60, y: KN.cab.top - 110, w: W - KN.cab.x0 + 60, h: TY - KN.cab.top + 114 }, draw: dresser },
    { id: 'herbs', box: { x: KN.herbs[0] - 70, y: KN.beam - 4, w: 150, h: 230 }, draw: herbs },
    { id: 'rail', box: { x: KN.rail.x0 - 20, y: KN.rail.y - 20, w: KN.rail.x1 - KN.rail.x0 + 50, h: 40 }, draw: rail },
    ...KN.pans.map((_, i) => ({ id: `pan${i}`, box: PAN_BOX(i), motion: 'sprite' as const, draw: (c: Ctx) => pan(c, i) })),
    { id: 'table', box: { x: 0, y: TY, w: W, h: 1080 - TY }, draw: table },
    { id: 'fxStill', box: FX_STILL_BOX, stillOnly: true, draw: stillFx },
    { id: 'fx', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

/** One frame of a flour burst (phase 0…1, played once): a ring of billows thrown out along the table from where a
 * foot came down, rolling outward and up, lit on their tops and shaded underneath, thinning as they go; a fine dust
 * hanging over them. Paints into a w×h frame, the stomp at (w/2, h - 70). */
function flourFrame(c: Ctx, w: number, h: number, u: number): void {
  const k = 0.5;
  const [cv, g] = makeCanvas(Math.ceil(w * k), Math.ceil(h * k));
  g.scale(k, k);
  const cx = w / 2;
  const cy = h - 70;
  const P = Math.PI * 2;
  const out = 1 - (1 - u) ** 2.4;
  const fade = Math.sin(Math.min(1, u * 10) * Math.PI * 0.5) * (1 - u) ** 0.9;
  const N = 16;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * P + Math.sin(i * 7.1) * 0.18;
    const sp = 0.75 + ((i * 53) % 10) / 22;
    const R = (110 + out * (w * 0.36 - 110)) * sp;
    const x = cx + Math.cos(a) * R;
    // the far side's billows sit higher (the ring lies on the table plane), every billow climbs as it rolls
    const y = cy + Math.sin(a) * R * 0.26 - (16 + ((i * 31) % 7) * 4) * Math.sin(Math.PI * Math.min(1, out * 1.05)) * (1 - u * 0.4);
    const rad = (16 + out * 34) * (0.8 + ((i * 17) % 5) / 10);
    const al = Math.min(1, 0.95 * fade * (Math.sin(a) > 0 ? 0.8 : 1));
    const body = g.createRadialGradient(x, y, 0, x, y, rad);
    body.addColorStop(0, `rgba(255,253,248,${al})`);
    body.addColorStop(0.5, `rgba(252,248,240,${al * 0.75})`);
    body.addColorStop(1, 'rgba(250,246,236,0)');
    g.fillStyle = body;
    g.beginPath();
    g.ellipse(x, y, rad * 1.2, rad, 0, 0, P);
    g.fill();
    const cap = g.createRadialGradient(x - rad * 0.3, y - rad * 0.45, 0, x - rad * 0.3, y - rad * 0.45, rad * 0.7);
    cap.addColorStop(0, `rgba(255,255,250,${al * 0.75})`);
    cap.addColorStop(1, 'rgba(255,255,250,0)');
    g.fillStyle = cap;
    g.fillRect(x - rad * 1.3, y - rad * 1.3, rad * 2.6, rad * 2.6);
    const sh = g.createRadialGradient(x + rad * 0.3, y + rad * 0.5, 0, x + rad * 0.3, y + rad * 0.5, rad * 0.8);
    sh.addColorStop(0, `rgba(130,104,78,${al * 0.6})`);
    sh.addColorStop(1, 'rgba(150,128,104,0)');
    g.fillStyle = sh;
    g.fillRect(x - rad * 1.3, y - rad * 1.3, rad * 2.6, rad * 2.6);
  }
  c.imageSmoothingEnabled = true;
  c.drawImage(cv, 0, 0, w, h);
  // the fine dust: grains flung up and falling back, crisp (painted at full size)
  for (let i = 0; i < 70; i++) {
    const a = Math.PI * (1.05 + (((i * 37) % 40) / 40) * 0.9);
    const v = 60 + ((i * 29) % 13) * 14;
    const x = cx + Math.cos(a) * v * out * 1.8;
    const y = cy - 10 + Math.sin(a) * v * out * 0.9 + u * u * 110;
    c.fillStyle = `rgba(255,253,248,${(0.95 * fade).toFixed(3)})`;
    c.beginPath();
    c.arc(x, y, 1.2 + (i % 3) * 0.6, 0, P);
    c.fill();
  }
}

// ——— live ———

registerKitScene(KITCHEN, (k, wave0) => {
  const fx = k.slot('fx');
  // the day's colour over the room (first in the top layer, so the fire, the lamps and the steam stay lit over it)
  const warm = k.wash(0xff8a4a, 0, Phaser.BlendModes.MULTIPLY, fx);
  const dusk = k.wash(0x4a3a6a, 0, Phaser.BlendModes.MULTIPLY, fx);
  // at dusk the corners and the ceiling fall into the dark first (a small soft texture drawn up over the room)
  const gloomKey = k.tex('kn_gloom', 96, 54, (c) => {
    const g = c.createRadialGradient(30, 40, 4, 40, 34, 70);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.45, 'rgba(230,220,235,1)');
    g.addColorStop(1, 'rgba(60,50,80,1)');
    c.fillStyle = g;
    c.fillRect(0, 0, 96, 54);
  });
  const gloom = k.img(gloomKey, 0, 0, { into: fx, origin: [0, 0], scale: 20, alpha: 0 });
  gloom.setBlendMode(Phaser.BlendModes.MULTIPLY);
  const p = KN.pot;
  const top = KN.stove.top;
  // the gas: tongues of blue flame painted in frames, a ring of them under each pot
  const gasSheet = (key: string, bw: number) =>
    sheet(k, key, bw, 30, 10, (c, ph) => {
      const n = Math.round(bw / 22);
      for (let i = 0; i < n; i++) {
        c.save();
        c.translate((i + 0.5) * (bw / n) - 9, 6);
        flameFrame(c, 18, 24, (ph + i * 0.37) % 1, GAS, 1, i);
        c.restore();
      }
    });
  const gas = [
    new Loop(k, gasSheet('kn_gas', p.w + 10), 10, p.x, top, { into: fx, origin: [0.5, 1], add: true, fps: 14 }),
    new Loop(k, gasSheet('kn_gas_s', KN.small.w), 10, KN.small.x, top, { into: fx, origin: [0.5, 1], add: true, fps: 13 }),
  ];
  for (const g of gas) g.alpha = 0.8;
  const gasGlow = [k.glow(p.x, top - 8, 140, 0x4a8aff, 0.25, { into: fx, sy: 0.3 }), k.glow(KN.small.x, top - 8, 90, 0x4a8aff, 0.2, { into: fx, sy: 0.3 })];
  // hero: the sauce, its surface rolling and bubbling through 24 painted frames (it replaces the painted one), the
  // spoon laid back over it
  const sb = SAUCE_BOX;
  const sauceKey = sheet(k, 'kn_sauce', sb.w, sb.h, 24, (c, ph) => {
    c.translate(-sb.x, -sb.y);
    sauceSurface(c, ph);
  });
  const sauce = new Loop(k, sauceKey, 24, sb.x, sb.y, { into: fx, origin: [0, 0], fps: 8 });
  const spoonKey = k.tex('kn_spoon', SPOON_BOX.w, SPOON_BOX.h, (c) => {
    c.translate(-SPOON_BOX.x, -SPOON_BOX.y);
    spoon(c);
  });
  const spoonImg = k.img(spoonKey, p.x - 14, p.y - p.h + 2, { into: fx, origin: [(p.x - 14 - SPOON_BOX.x) / SPOON_BOX.w, (p.y - p.h + 2 - SPOON_BOX.y) / SPOON_BOX.h] });
  const spoonSw = new Spring(0, 30, 3);
  // its spatter: now and then a fat bubble throws drops clear of the pot; they arc and fall back or spot the cooktop
  const spat = new Parts(k, { frame: 'drop', into: fx, max: 40 });
  const spatRate = new Rate();
  const spit = (n: number, power: number) => {
    const bx = p.x + (crand() - 0.5) * (p.w - 40);
    for (let i = 0; i < n; i++)
      spat.spawn({ x: bx + (crand() - 0.5) * 8, y: p.y - p.h + 2, vx: (crand() - 0.5) * 160 * power, vy: -(140 + crand() * 160) * power, life: 1.4, r0: 2.6 + crand() * 2, a: 0.95, tint: 0xb8240e, grav: 900, floor: crand() < 0.5 ? p.y - p.h + 4 : top - 2, streak: 0.012 });
  };
  // its steam billowing up into the hood: two columns of painted volumes, lit by the window, then the sunset
  const SW = 260;
  const SH = 320;
  // (soft: painted at half size and drawn up)
  const steamKey = sheet(k, 'kn_steam', SW / 2, SH / 2, 16, (c, ph) => {
    c.scale(0.5, 0.5);
    steamFrame(c, SW, SH, ph, { a: 0.42, lit: '#fff8ee', body: '#efe8e2', shade: '#a89aa0', seed: 2, n: 8 });
  });
  const steam = new Loop(k, steamKey, 16, p.x, p.y - p.h + 14, { into: fx, origin: [0.5, 1], fps: 8, scale: 2 });
  const steam2 = new Loop(k, steamKey, 16, p.x + 30, p.y - p.h + 14, { into: fx, origin: [0.5, 1], fps: 6, phase: 7, scale: 1.6 });
  steam2.each((im) => im.setFlipX(true));
  // hero: the small pot's lid rattling as the water boils, puffs escaping from under it; a stomp makes it jump
  const lid = k.sprite('lid');
  k.pivot(lid, KN.small.x, KN.small.y - KN.small.h);
  const lidY = lid.y;
  const puffs = new Parts(k, { frame: 'puff', into: fx, max: 60 });
  const puffRate = new Rate();
  let rattle = 0;
  let hop = 0;
  let hopV = 0;
  // pans, towel and garlic on springs
  const pans = KN.pans.map((pp, i) => new Swing(k.pivot(k.sprite(`pan${i}`), pp.x, KN.rail.y + 4), { k: 6 + i, c: 0.5, idle: 0.004, seed: i * 2 }));
  const towelSw = new Swing(k.pivot(k.sprite('towel'), KN.stove.x0 + 340, KN.stove.top + 90), { k: 10, c: 1.4, idle: 0.01, seed: 4 });
  const garlicSw = new Swing(k.pivot(k.sprite('garlic'), KN.garlic.x, KN.garlic.y), { k: 5, c: 0.7, idle: 0.006, seed: 7 });
  const clinks = new Parts(k, { frame: 'spark', add: true, into: fx, max: 30 });
  // hero: flour. A stomp on the table throws up a cloud of it: soft lit puffs rolling outward and settling, and a
  // fine dust that drifts down after
  const FN = 14;
  const flourKey = sheet(k, 'kn_flour', 280, 150, FN, (c, ph) => {
    c.scale(0.5, 0.5);
    flourFrame(c, 560, 300, ph);
  });
  const bursts = [0, 1, 2].map(() => {
    const l = new Loop(k, flourKey, FN, 0, 0, { into: fx, origin: [0.5, 230 / 300], scale: 2 });
    l.each((im) => im.setVisible(false));
    return { l, t: -1, dur: 1.6, s: 1 };
  });
  let nextBurst = 0;
  // the dusting a burst leaves on the boards, fading as it's knocked about
  const markKey = k.tex('kn_flourmark', 128, 48, (c) => {
    // (an ellipse: a circle's gradient squashed onto the table's plane)
    c.save();
    c.translate(64, 24);
    c.scale(1, 22 / 62);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 62);
    g.addColorStop(0, 'rgba(255,252,244,0.9)');
    g.addColorStop(0.5, 'rgba(255,252,244,0.45)');
    g.addColorStop(1, 'rgba(255,252,244,0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(0, 0, 62, 0, Math.PI * 2);
    c.fill();
    c.restore();
    for (let i = 0; i < 60; i++) {
      const a = (i * 2.39) % (Math.PI * 2);
      const rr = 8 + ((i * 37) % 50);
      c.fillStyle = 'rgba(255,252,244,0.7)';
      c.fillRect(64 + Math.cos(a) * rr, 24 + Math.sin(a) * rr * 0.35, 1.5, 1.5);
    }
  });
  const marks = [0, 1, 2].map(() => ({ img: k.img(markKey, 0, 0, { into: fx, alpha: 0 }), t: 99 }));
  const dust = new Parts(k, { frame: 'mote', into: fx, max: 90 });
  // the oven: its fire breathing behind the glass
  const oven = k.glow(290, KN.stove.top + 170, 120, 0xff8a2a, 0.3, { into: fx, sy: 0.6 });
  // dust in the sunbeam: lit motes drifting, only inside the beam
  const motes = new Parts(k, { frame: 'mote', add: true, into: fx, max: 70 });
  const moteRate = new Rate();
  // the day going by: the evening view, the sun's colour on the room, the beam turning gold, then going
  const eve = k.sprite('viewEve');
  const night = k.sprite('viewNight');
  // the lamp under the hood, switched on as the light goes: a warm pool on the cooktop and the tiles behind it
  const hoodPool = k.glow(290, KN.stove.top - 40, 300, 0xffc070, 0, { into: fx, sy: 0.45 });
  const hoodBulb = k.glow(290, KN.hood.bot + 8, 120, 0xfff0c8, 0, { into: fx, sy: 0.2 });
  const beam = k.img(beamTex(k), WIN.x0 + 10, WIN.y0 + 30, { into: fx, add: true, origin: [0, 0], alpha: 0, scale: 4 });
  const stoveLight = k.glow(300, 420, 520, 0xff7a2a, 0, { into: fx, sy: 0.7 });
  let kw = waveK(wave0);
  let shown = kw;
  const C = Phaser.Display.Color;
  const tint = (a: number, b: number, t: number) => {
    const c = C.Interpolate.ColorWithColor(C.ValueToColor(a), C.ValueToColor(b), 100, Math.round(Phaser.Math.Clamp(t, 0, 1) * 100));
    return C.GetColor(c.r, c.g, c.b);
  };
  return {
    setWave: (w) => (kw = waveK(w)),
    impact(x, y, kk) {
      pans.forEach((s, i) => s.kick((x < KN.pans[i].x ? 1 : -1) * (0.9 + crand() * 0.5) * kk));
      towelSw.kick((crand() - 0.5) * 2 * kk);
      garlicSw.kick((x < KN.garlic.x ? 1 : -1) * 0.7 * kk);
      spoonSw.v += (crand() < 0.5 ? -1 : 1) * 0.6 * kk;
      rattle = Math.max(rattle, kk);
      hopV = Math.min(hopV, -260 * kk);
      if (kk > 0.3) spit(3 + Math.round(kk * 4), 0.8 + kk * 0.5);
      if (kk > 0.5) for (let i = 0; i < 3; i++) clinks.spawn({ x: KN.pans[i].x + (crand() - 0.5) * 30, y: KN.rail.y + 4, vx: (crand() - 0.5) * 60, vy: -40, life: 0.25, r0: 10, a: 0.8, tint: 0xfff0d0, streak: 0.004 });
      // the flour cloud, where the foot came down on the table
      if (y > TY) {
        const fy = Math.min(KN.front - 20, y + 20);
        const lit = tint(0xfff8ee, 0xffc898, shown);
        const b = bursts[nextBurst++ % bursts.length];
        const m = marks[(nextBurst - 1) % marks.length];
        m.t = 0;
        m.img.setPosition(x, fy - 6).setScale(3.2 * (0.7 + kk * 0.45), 2.4 * (0.7 + kk * 0.45)).setTint(lit);
        b.t = 0;
        b.s = 0.7 + kk * 0.45;
        b.dur = 1.3 + kk * 0.6;
        b.l.each((im) => im.setPosition(x, fy).setScale(3 * b.s, 3 * b.s * (0.9 + crand() * 0.2)).setFlipX(crand() < 0.5).setTint(lit).setVisible(true));
        for (let i = 0; i < 6 + kk * 10; i++) dust.spawn({ x: x + (crand() - 0.5) * 320, y: fy - 20 - crand() * 90, vx: (crand() - 0.5) * 50, vy: -20 - crand() * 40, life: 2 + crand() * 1.5, r0: 1.6 + crand() * 1.6, a: 0.7, tint: lit, grav: 30, drag: 1.6, fade: 0.1 });
      }
    },
    update(dt, t) {
      shown += (kw - shown) * Math.min(1, dt * 0.6);
      const sunset = Phaser.Math.Clamp((shown - 0.3) / 0.5, 0, 1);
      // ——— gas and sauce
      for (const g of gas) g.step(dt);
      gasGlow.forEach((g, i) => g.setAlpha(0.18 + flicker(t, i * 3) * 0.08));
      sauce.step(dt, 0.8 + shown * 0.5);
      spoonImg.rotation = spoonSw.step(Math.sin(t * 1.3) * 0.004 * calm(), dt);
      spatRate.tick((0.25 + shown * 0.5) * calm(), dt, () => spit(2 + Math.floor(crand() * 3), 0.7 + crand() * 0.3));
      spat.update(dt);
      const st = tint(0xffffff, 0xffc8a0, sunset);
      steam.alpha = 0.75 + shown * 0.25;
      steam.step(dt, 0.8 + shown * 0.4);
      steam2.alpha = 0.4 + shown * 0.4;
      steam2.step(dt);
      steam.each((im) => im.setTint(st));
      steam2.each((im) => im.setTint(st));
      // ——— the lid: bursts of rattling, more often as it boils harder; a hop when stomped (it falls back with a clack)
      const boil = 0.25 + shown * 0.75;
      if (crand() < dt * boil * 0.5) rattle = Math.max(rattle, 0.5 + crand() * 0.5);
      rattle = Math.max(0, rattle - dt * 0.9);
      hopV += 2200 * dt;
      hop += hopV * dt;
      if (hop > 0) {
        if (hopV > 120) for (let i = 0; i < 4; i++) puffs.spawn({ x: KN.small.x + (crand() - 0.5) * KN.small.w, y: KN.small.y - KN.small.h, vx: (crand() - 0.5) * 80, vy: -40 - crand() * 30, life: 1, r0: 8, r1: 34, a: 0.4, tint: 0xf4eee8, grav: -10, drag: 0.8, fade: 0.1 });
        hop = 0;
        hopV = hopV > 120 ? -hopV * 0.3 : 0;
      }
      const jig = rattle > 0 ? Math.sin(t * 46) * Math.sin(t * 13) : 0;
      lid.rotation = jig * 0.05 * rattle * calm() + (hop < 0 ? Math.sin(t * 20) * 0.08 * Math.min(1, -hop / 20) : 0);
      lid.y = lidY - Math.abs(jig) * 3 * rattle * calm() + hop * calm();
      puffRate.tick((rattle * 18 + boil * 1.5) * calm(), dt, () => {
        const side = crand() < 0.5 ? -1 : 1;
        puffs.spawn({ x: KN.small.x + side * (KN.small.w / 2 - 4), y: KN.small.y - KN.small.h, vx: side * (20 + crand() * 30), vy: -30 - crand() * 40, life: 1.4 + crand(), r0: 6, r1: 30, a: 0.35, tint: st, grav: -10, drag: 0.8, fade: 0.2 });
      });
      puffs.update(dt);
      // ——— pans, towel, garlic, flour
      for (const s of pans) s.update(dt, t);
      towelSw.update(dt, t);
      garlicSw.update(dt, t);
      clinks.update(dt);
      for (const m of marks) {
        m.t += dt;
        m.img.setAlpha(m.t < 0.3 ? (m.t / 0.3) * 0.6 : 0.6 * Math.max(0, 1 - (m.t - 0.3) / 6));
      }
      for (const b of bursts) {
        if (b.t < 0) continue;
        b.t += dt;
        const u = b.t / b.dur;
        if (u >= 1) {
          b.t = -1;
          b.l.each((im) => im.setVisible(false));
        } else b.l.show(Math.min(FN - 1.001, (1 - (1 - u) ** 1.5) * (FN - 1)));
      }
      dust.update(dt);
      oven.setAlpha((0.22 + flicker(t * 0.6, 2) * 0.08) * (1 + shown * 0.9));
      // ——— the sunbeam's dust (fading with the day), kept inside the beam's slant
      const day = 1 - Phaser.Math.Clamp((shown - 0.6) / 0.4, 0, 1);
      moteRate.tick(10 * day, dt, () => {
        const v = crand();
        const y = WIN.y1 + v * (TY - WIN.y1 - 40);
        const x0 = WIN.x0 + 40 + v * 220;
        motes.spawn({ x: x0 + crand() * (WIN.x1 - WIN.x0 - 20), y, vx: (crand() - 0.5) * 8, vy: (crand() - 0.6) * 6, life: 5 + crand() * 4, r0: 1.5 + crand() * 2, a: 0.45 * day, tint: tint(0xfff2d8, 0xffc890, sunset), fade: 0.3 });
      });
      motes.update(dt);
      // ——— the day: noon → afternoon → sunset → dusk
      eve.setAlpha(Phaser.Math.Clamp(lerp(-0.2, 1.3, shown), 0, 1));
      const dk = Phaser.Math.Clamp((shown - 0.62) / 0.38, 0, 1);
      night.setAlpha(Phaser.Math.Easing.Sine.InOut(dk));
      warm.setAlpha(Math.max(0, Math.sin(Math.min(1, shown * 1.25) * Math.PI * 0.8)) * 0.34);
      dusk.setAlpha(dk * 0.5);
      const lamp = Phaser.Math.Clamp((shown - 0.55) / 0.3, 0, 1);
      hoodPool.setAlpha(lamp * (0.42 + flicker(t * 0.3, 5) * 0.03));
      hoodBulb.setAlpha(lamp * 0.45);
      beam.setAlpha((0.1 + 0.2 * Math.sin(Math.min(1, shown) * Math.PI)) * day).setTint(tint(0xfff0d0, 0xffa060, sunset));
      // (the sun going down: the beam swings lower and reaches further across the room)
      beam.setRotation(-0.28 * sunset).setScale(4 * (1 + sunset * 0.25), 4);
      gloom.setAlpha(dk * 0.75);
      stoveLight.setAlpha(Phaser.Math.Clamp((shown - 0.5) / 0.5, 0, 1) * (0.22 + flicker(t * 0.5, 9) * 0.05));
    },
  };
});

/** The sunbeam (a soft long quad) laid over the room as the light turns gold. */
function beamTex(k: KitLive): string {
  // (painted at a quarter size: it's all soft, and drawn up ×4)
  return k.tex('kn_beam', 140, 170, (c) => {
    c.scale(0.25, 0.25);
    softly(c, { x: 0, y: 0, w: 560, h: 680 }, (g) => {
      const gr = g.createLinearGradient(0, 0, 400, 680);
      gr.addColorStop(0, 'rgba(255,240,210,0.5)');
      gr.addColorStop(1, 'rgba(255,240,210,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(20, 10);
      g.lineTo(210, 30);
      g.lineTo(540, 660);
      g.lineTo(250, 660);
      g.closePath();
      g.fill();
    }, 0.125);
  });
}
