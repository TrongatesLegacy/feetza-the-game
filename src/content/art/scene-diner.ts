// Neon Diner '86 (Act 2, waves 16–19), redrawn with the location kit (src/art/scene): a chrome-and-vinyl diner after
// dark. A teal wall printed with a faint atomic pattern, a long window on the left onto a street across the way (a
// brick block with lit windows, a hotel's blade sign, a laundromat, a parked car, a lamp), the OPEN sign hanging in
// it, the PIZZA neon between two milk-glass pendants, the no-feet roundel, red channel-tufted booths against pink
// tile, a Wurlitzer-style jukebox on the right, a checker floor, and a boomerang formica counter with a ribbed edge.
//
// Live, the heroes:
// - the neon: the PIZZA sign's tired Z is painted in its states (full, dim, the violet glow of a dying tube, dark, a
//   surge) and stutters through them; a stomp makes the whole sign buzz and a hard one throws sparks from the Z's
//   electrode that bounce on the chair rail;
// - the rain: from a dry blue hour, through drizzle and rain, to a storm. Painted streak frames over the street,
//   crowned splashes on the asphalt, beads and drips running down the glass in fits and starts (a stomp shakes some
//   loose), the glass misting, and in the storm painted lightning forks over the roofs with the room's power dipping;
// - the jukebox: the arch's three bubble tubes painted through a cycle of rising bubbles, the pilaster tubes too,
//   the record turning in the dome (painted frames), its colour wheel cycling; a stomp makes the needle skip.
// The pendants swing on their cords when the counter's hit, their light going with them.

import Phaser from 'phaser';
import { ROUND, SCRIPT, footPath, neonStroke, neonText } from '../../art/backdrops';
import { ZB, xAt, yAt, zAt } from '../../art/backdrops';
import {
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
  lightPool,
  lineAt,
  rectPath,
  rim,
  rrPath,
  solid,
  vfill,
  vignetteAll,
  within,
} from '../../art/scene/kit';
import type { SceneSpec } from '../../art/scene/layers';
import { aoHalo, lampOnWall, lightPatch } from '../../art/scene/light';
import { type Reflect, bricks, grain, planeQuad, tableFalloff, tableSeam, varnish } from '../../art/scene/materials';
import { drift, grime, lay, noiseMask, softly, surface } from '../../art/scene/paint';
import { glassPane, hang } from '../../art/scene/props';
import { makeCanvas, rgba, shade } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { save } from '../../systems/save';
import { Loop, Parts, Rate, Spring, Swing, sheet } from '../../game/sceneAnim';
import { type KitLive, calm, flicker, registerKitScene, waveK } from '../../game/sceneLive';
import { tileFloor } from './sceneBits';
import { boltFrame } from './scene-oldtown';

// ——— layout ———

export const DN = {
  ceil: 34,
  rail: 432,
  floorTop: 690,
  front: 1040,
  win: { x0: 90, x1: 610, y0: 108, y1: 392 },
  pizza: { x: 1010, y: 160 },
  nofeet: { x: 1490, y: 232, r: 66 },
  lamps: [688, 1332] as const,
  lampY: 120,
  booths: [[262, 858], [1004, 1600]] as const,
  boothTop: 478,
  juke: { x: 1790, top: 300, w: 232 },
  open: { x: 236, y: 300 },
};

const TEAL = '#1f5a60';
const PINK = '#e3a2b2';
const RED = '#b31c2c';
const WIN = DN.win;
const WIN_BOX = { x: WIN.x0, y: WIN.y0, w: WIN.x1 - WIN.x0, h: WIN.y1 - WIN.y0 };
/** The street's rooftops (screen y): the sky above, where the lightning shows. */
const ROOF = WIN.y0 + 138;
const STREET = WIN.y1 - 30;
/** The blind's foot. */
const BLIND = WIN.y0 + 30;

const P2 = Math.PI * 2;

// ——— the wall ———

function wall(ctx: Ctx, r: R): void {
  const box = { x: 0, y: 0, w: W, h: DN.rail };
  surface(ctx, r, box, TEAL, { vary: 0.45, cells: 5, mottle: 0.3, strokes: 0.2, strokeAng: Math.PI / 2, grain: 0.14, warm: '#3e8a84', cool: '#0c2632', seed: 21 });
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  // the paper: a printed atomic pattern on a half-drop repeat (starbursts and boomerangs), a hair off register, faint
  // enough to stay behind the feet
  const sx = 96;
  const sy = 84;
  for (let row = 0; row * sy < DN.rail + sy; row++)
    for (let col = -1; col * sx < W + sx; col++) {
      const x = col * sx + (row % 2 ? sx / 2 : 0);
      const y = row * sy + 20;
      // a starburst: eight rays, long and short
      ctx.strokeStyle = rgba('#f2e2a8', 0.075);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * P2 + 0.2;
        const l = k % 2 ? 6 : 13;
        ctx.moveTo(x + Math.cos(a) * 2, y + Math.sin(a) * 2);
        ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      }
      ctx.stroke();
      // a boomerang between, printed in the second ink a little off register
      const bx = x + sx / 2 + 1.5;
      const by = y + sy / 2 + 1;
      ctx.strokeStyle = rgba('#ff9ab4', 0.06);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(bx - 14, by + 5);
      ctx.quadraticCurveTo(bx, by - 9, bx + 14, by + 5);
      ctx.stroke();
      ctx.fillStyle = rgba('#0a2028', 0.12);
      ctx.beginPath();
      ctx.arc(bx + 22, by - 10, 2.4, 0, P2);
      ctx.fill();
    }
  // seams between the paper's drops, one catching the light on its lifted edge
  for (let x = 140; x < W; x += 260) {
    ctx.fillStyle = rgba('#04141a', 0.22);
    ctx.fillRect(x, DN.ceil, 1.2, DN.rail - DN.ceil);
    ctx.fillStyle = rgba('#8adcd0', 0.06);
    ctx.fillRect(x + 1.2, DN.ceil, 1, DN.rail - DN.ceil);
  }
  // the room's light: dim up under the ceiling, the pendants' scalloped pools, the neon's colour on the paper
  vfill(ctx, 0, 0, W, DN.rail, [[0, 'rgba(4,10,16,0.66)'], [0.35, 'rgba(4,10,16,0.22)'], [0.8, 'rgba(4,10,16,0.18)'], [1, 'rgba(4,10,16,0.38)']]);
  for (const lx of DN.lamps) lampOnWall(ctx, lx, DN.lampY + 52, 38, { col: '#ffe2b0', a: 0.42, reach: 300, spread: 230, gap: 44, above: 0.18 });
  lightPool(ctx, DN.pizza.x, DN.pizza.y + 20, 420, 170, '#3ae8ff', 0.1);
  lightPool(ctx, DN.pizza.x, DN.pizza.y + 92, 300, 60, '#ff4fd8', 0.06);
  lightPool(ctx, DN.nofeet.x, DN.nofeet.y, 170, 150, '#ff4a6a', 0.1);
  lightPool(ctx, DN.juke.x, DN.juke.top + 40, 260, 220, '#ff7ad9', 0.1);
  // the key: warm from the top left (the diner's front, its strip lights out of shot), falling off to the right
  const key = ctx.createLinearGradient(0, 0, W, DN.rail);
  key.addColorStop(0, 'rgba(255,214,160,0.1)');
  key.addColorStop(0.45, 'rgba(255,214,160,0.02)');
  key.addColorStop(1, 'rgba(6,10,20,0.18)');
  ctx.fillStyle = key;
  ctx.fillRect(0, 0, W, DN.rail);
  // the window's cool light on the paper round it, its sill's shadow under
  lightPool(ctx, (WIN.x0 + WIN.x1) / 2, WIN.y1 + 10, 380, 70, '#6a8ac8', 0.07);
  // grease and smoke from the grill have browned the paper near the ceiling, worst over the window (the kitchen
  // hatch is round that side)
  lay(ctx, noiseMask(5, 23, { cover: 0.4, soft: 0.25, col: '#2a1a0e' }), { x: 0, y: 0, w: W, h: 210 }, 0.32);
  grime(ctx, box, { bottom: 34, left: 40, right: 40, a: 0.35, patchy: 0.6, seed: 24, col: '#06141a' });
  ctx.restore();
  // the ceiling: dark, a chrome crown band at its edge
  vfill(ctx, 0, 0, W, DN.ceil, [[0, '#06090c'], [1, '#141a20']]);
  vfill(ctx, 0, DN.ceil - 10, W, 10, [[0, '#6a7680'], [0.35, '#eef4f6'], [0.6, '#8a96a0'], [1, '#3a4248']]);
  for (const lx of DN.lamps) {
    const g = ctx.createLinearGradient(lx - 120, 0, lx + 120, 0);
    g.addColorStop(0, 'rgba(255,230,190,0)');
    g.addColorStop(0.5, 'rgba(255,230,190,0.5)');
    g.addColorStop(1, 'rgba(255,230,190,0)');
    ctx.fillStyle = g;
    ctx.fillRect(lx - 120, DN.ceil - 8, 240, 4);
  }
  crevice(ctx, 0, W, DN.ceil, 36, 0.5);
}

function rail(ctx: Ctx): void {
  // the chrome chair rail: a bright band that reflects the room (the lamps warm, the neon cyan and pink)
  const y = DN.rail;
  castShadow(ctx, rectPath(0, y - 4, W, 18), 3, 6, 0.4);
  vfill(ctx, 0, y - 4, W, 18, [[0, '#4a565e'], [0.18, '#f2f8fa'], [0.42, '#8a96a2'], [0.62, '#262e34'], [0.8, '#56626c'], [1, '#9aa6b0']]);
  for (const [x, col, a] of [[DN.lamps[0], '#ffe4b0', 0.5], [DN.lamps[1], '#ffe4b0', 0.5], [DN.pizza.x, '#5af0ff', 0.4], [DN.juke.x - 60, '#ff7ad9', 0.45], [(WIN.x0 + WIN.x1) / 2, '#8ab0ff', 0.25]] as const) {
    const g = ctx.createLinearGradient(x - 170, 0, x + 170, 0);
    g.addColorStop(0, rgba(col, 0));
    g.addColorStop(0.5, rgba(col, a));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - 170, y - 1, 340, 5);
    ctx.fillRect(x - 60, y + 9, 120, 2);
  }
  // its joints, a screw head each
  for (let x = 300; x < W; x += 480) {
    ctx.fillStyle = 'rgba(10,14,18,0.6)';
    ctx.fillRect(x, y - 4, 1.5, 18);
  }
  ctx.strokeStyle = '#0c1216';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, y - 4.5);
  ctx.lineTo(W, y - 4.5);
  ctx.moveTo(0, y + 14);
  ctx.lineTo(W, y + 14);
  ctx.stroke();
  crevice(ctx, 0, W, y + 14, 14, 0.45);
}

function tiles(ctx: Ctx, r: R): void {
  const y0 = DN.rail + 14;
  const y1 = DN.floorTop;
  const box = { x: 0, y: y0, w: W, h: y1 - y0 };
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  // the grout, recessed
  ctx.fillStyle = '#4a2e38';
  ctx.fillRect(box.x, box.y, box.w, box.h);
  grain(ctx, box, 'speckle', 0.3, 1);
  // a course of black tiles under the rail, then glazed pink: each tile its own shade (one glaze batch ran pale), a
  // pillowed face lit from the top left, the glaze's highlight on its shoulder
  const s = 32;
  let row = 0;
  for (let y = y0 + 1; y < y1; y += s, row++) {
    const band = row === 0 || row === 5;
    for (let x = row % 2 ? -s / 2 : 0; x < W; x += s) {
      const base = band ? shade('#1c1a22', (r() - 0.5) * 0.15) : shade(r() < 0.06 ? '#eab8c4' : PINK, (r() - 0.5) * 0.09);
      const g = ctx.createLinearGradient(x, y, x + s, y + s);
      g.addColorStop(0, shade(base, band ? 0.3 : 0.12));
      g.addColorStop(0.5, base);
      g.addColorStop(1, shade(base, -0.16));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(x + 1.6, y + 1.6, s - 3.2, s - 3.2, 2.5);
      ctx.fill();
      ctx.fillStyle = rgba('#ffffff', band ? 0.22 : 0.3);
      ctx.fillRect(x + 4, y + 3.5, s * 0.42, 1.4);
      ctx.fillRect(x + 3.5, y + 4, 1.4, s * 0.3);
      // the grout's shadow line under the tile above
      ctx.fillStyle = 'rgba(30,8,16,0.35)';
      ctx.fillRect(x + 1.6, y + s - 2.2, s - 3.2, 1);
    }
  }
  // the glaze reflects the room's lights in soft vertical streaks
  const refl: Reflect[] = [
    { x: DN.lamps[0], a: 0.22, w: 60, col: '#fff0d0' },
    { x: DN.lamps[1], a: 0.22, w: 60, col: '#fff0d0' },
    { x: DN.juke.x - 140, a: 0.3, w: 70, col: '#ff7ad9' },
    { x: WIN.x1 - 90, a: 0.16, w: 90, col: '#8ab0ff' },
    { x: DN.pizza.x, a: 0.12, w: 120, col: '#5af0ff' },
  ];
  varnish(ctx, box, refl, { sheen: 0.04 });
  // chips where chairs and mop buckets knock the bottom course; a cracked tile behind the right booth's end
  for (let i = 0; i < 16; i++) {
    const x = r() * W;
    const y = y1 - 6 - r() * 40;
    ctx.fillStyle = 'rgba(250,240,240,0.55)';
    ctx.beginPath();
    ctx.arc(x, y, 1.5 + r() * 2, 0, P2);
    ctx.fill();
    ctx.fillStyle = 'rgba(40,10,20,0.4)';
    ctx.beginPath();
    ctx.arc(x + 1, y + 1, 1 + r(), 0, P2);
    ctx.fill();
  }
  // grime low down (kicks, mop water) and the light falling off towards the floor
  grime(ctx, box, { bottom: 70, left: 60, right: 60, a: 0.45, patchy: 0.5, seed: 27, col: '#1a0a10' });
  vfill(ctx, 0, y0, W, y1 - y0, [[0, 'rgba(20,10,20,0.05)'], [1, 'rgba(20,10,20,0.32)']]);
  ctx.restore();
}

// ——— the street through the window ———

type StreetMood = 'dusk' | 'night' | 'storm';

/** The street across the way: sky, a far skyline, a brick block with its windows, a hotel's blade sign, a
 * laundromat under an awning, the kerb, a parked car and the asphalt (wet from the night on). */
function street(ctx: Ctx, r: R, mood: StreetMood): void {
  const { x0, x1, y0, y1 } = WIN;
  const w = x1 - x0;
  const night = mood !== 'dusk';
  const storm = mood === 'storm';
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, w, y1 - y0);
  ctx.clip();
  // the sky: a blue hour with the afterglow low down, a clear night, or the storm's low murk lit from the town
  const sky: [number, string][] = mood === 'dusk' ? [[0, '#2a3a78'], [0.5, '#5a5a9a'], [0.85, '#b87a90'], [1, '#e8a088']] : storm ? [[0, '#0e1218'], [0.6, '#1e2430'], [1, '#3a3440']] : [[0, '#070a1c'], [0.6, '#121a38'], [1, '#2a2448']];
  vfill(ctx, x0, y0, w, ROOF - y0 + 10, sky);
  if (storm) {
    // cloud masses, their bellies lit sodium from the town
    softly(ctx, { x: x0, y: y0, w, h: ROOF - y0 + 10 }, (g) => {
      for (let i = 0; i < 10; i++) {
        const cx = x0 + r() * w;
        const cy = y0 + 40 + r() * 70;
        const rr = 40 + r() * 60;
        const gr = g.createRadialGradient(cx, cy, 0, cx, cy, rr);
        gr.addColorStop(0, 'rgba(60,58,70,0.7)');
        gr.addColorStop(1, 'rgba(60,58,70,0)');
        g.fillStyle = gr;
        g.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
      }
      const gl = g.createLinearGradient(0, ROOF - 40, 0, ROOF + 10);
      gl.addColorStop(0, 'rgba(120,80,60,0)');
      gl.addColorStop(1, 'rgba(120,80,60,0.35)');
      g.fillStyle = gl;
      g.fillRect(x0, ROOF - 40, w, 50);
    }, 0.25);
  } else if (night) {
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = rgba('#e8eeff', 0.3 + r() * 0.5);
      ctx.fillRect(x0 + r() * w, y0 + 50 + r() * 50, 1.3, 1.3);
    }
  }
  // the far skyline: blocks and a water tower, a few windows lit
  const far = storm ? '#141820' : night ? '#0e1226' : '#3a3462';
  ctx.fillStyle = far;
  let fx = x0;
  while (fx < x1) {
    const bw = 30 + r() * 50;
    const bh = 20 + r() * 46;
    ctx.fillRect(fx, ROOF - bh, bw, bh + 10);
    for (let k = 0; k < 4; k++) if (r() < (night ? 0.7 : 0.4)) {
      ctx.fillStyle = rgba('#ffd890', 0.35 + r() * 0.35);
      ctx.fillRect(fx + 4 + r() * (bw - 8), ROOF - bh + 6 + r() * (bh - 10), 2, 2.5);
      ctx.fillStyle = far;
    }
    fx += bw + 2;
  }
  // a water tower on its stilts
  const tx = x0 + 340;
  ctx.fillStyle = far;
  ctx.fillRect(tx - 14, ROOF - 70, 28, 26);
  ctx.beginPath();
  ctx.moveTo(tx - 16, ROOF - 70);
  ctx.lineTo(tx, ROOF - 82);
  ctx.lineTo(tx + 16, ROOF - 70);
  ctx.fill();
  ctx.strokeStyle = far;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(tx - 10, ROOF - 44);
  ctx.lineTo(tx - 13, ROOF - 30);
  ctx.moveTo(tx + 10, ROOF - 44);
  ctx.lineTo(tx + 13, ROOF - 30);
  ctx.stroke();
  // the haze over the far roofs
  vfill(ctx, x0, ROOF - 40, w, 44, [[0, rgba(sky[2][1], 0)], [1, rgba(sky[2][1], 0.5)]]);
  // the block across the street: brick in the evening shade, a cornice, two floors of windows
  const fb = ROOF - 8;
  const fy1 = STREET - 6;
  const brickBox = { x: x0, y: fb, w, h: fy1 - fb };
  bricks(ctx, r, brickBox, storm ? ['#2a1c1e', '#24181c', '#30201e'] : night ? ['#3a2224', '#321c20', '#40262a'] : ['#6a3a36', '#5e3230', '#744440'], storm ? '#1a1416' : night ? '#22181c' : '#3a2a2c', 16, 6);
  vfill(ctx, x0, fb, w, fy1 - fb, [[0, 'rgba(10,8,20,0.1)'], [1, 'rgba(10,8,20,0.45)']]);
  // the cornice
  vfill(ctx, x0, fb - 6, w, 10, storm ? [[0, '#3a3a40'], [1, '#141418']] : [[0, night ? '#4a4450' : '#a8909a'], [1, '#1a1418']]);
  crevice(ctx, x0, x1, fb + 4, 8, 0.5);
  // the windows: frames and sills, lit rooms with blinds, curtains, a figure, a television's blue; dark panes with
  // the sky in them
  const lit = (i: number) => (mood === 'dusk' ? [1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 1][i] : [1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1][i]);
  let wi = 0;
  for (const wy of [fb + 14, fb + 62])
    for (let wx = x0 + 14; wx < x1 - 30; wx += 84, wi++) {
      const on = lit(wi % 12);
      const ww = 34;
      const wh = 36;
      castShadow(ctx, rectPath(wx - 2, wy - 2, ww + 4, wh + 4), 2, 2, 0.4);
      if (on) {
        const tv = wi % 5 === 3;
        const g = ctx.createLinearGradient(0, wy, 0, wy + wh);
        g.addColorStop(0, tv ? '#5a8ad8' : storm ? '#b88848' : '#ffd488');
        g.addColorStop(1, tv ? '#2a4a90' : storm ? '#8a5a2a' : '#e8964a');
        ctx.fillStyle = g;
        ctx.fillRect(wx, wy, ww, wh);
        // the room inside: a lampshade or a figure, a blind part-way down
        ctx.fillStyle = 'rgba(60,24,10,0.5)';
        if (wi % 3 === 0) {
          ctx.beginPath();
          ctx.ellipse(wx + 22, wy + wh - 6, 4.5, 6, 0, 0, P2);
          ctx.fill();
          ctx.fillRect(wx + 20, wy + wh - 22, 5, 10);
          ctx.beginPath();
          ctx.arc(wx + 22.5, wy + wh - 25, 3.4, 0, P2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(wx + 6, wy + wh - 10);
          ctx.lineTo(wx + 16, wy + wh - 10);
          ctx.lineTo(wx + 13, wy + wh - 18);
          ctx.lineTo(wx + 9, wy + wh - 18);
          ctx.fill();
        }
        const blind = 6 + (wi * 7) % 14;
        ctx.fillStyle = tv ? 'rgba(40,60,110,0.8)' : 'rgba(150,90,40,0.75)';
        ctx.fillRect(wx, wy, ww, blind);
        for (let by = wy + 2; by < wy + blind; by += 3) {
          ctx.fillStyle = 'rgba(30,14,6,0.3)';
          ctx.fillRect(wx, by, ww, 1);
        }
        glowAt(ctx, wx + ww / 2, wy + wh / 2, 30, tv ? '#6a9aff' : '#ffb860', storm ? 0.12 : night ? 0.22 : 0.14);
      } else {
        const g = ctx.createLinearGradient(wx, wy, wx + ww, wy + wh);
        g.addColorStop(0, storm ? '#2a3040' : night ? '#1a2040' : '#6a6a9a');
        g.addColorStop(1, '#0c0c18');
        ctx.fillStyle = g;
        ctx.fillRect(wx, wy, ww, wh);
      }
      // the sash bars and the stone sill
      ctx.fillStyle = 'rgba(14,8,10,0.75)';
      ctx.fillRect(wx + ww / 2 - 1, wy, 2, wh);
      ctx.fillRect(wx, wy + wh / 2 - 1, ww, 2);
      ctx.strokeStyle = '#120a0c';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(wx, wy, ww, wh);
      ctx.fillStyle = storm ? '#4a4650' : night ? '#5a5260' : '#b8a8a0';
      ctx.fillRect(wx - 3, wy + wh, ww + 6, 3);
    }
  // the fire escape: landings, ladders, railings in iron silhouette, a shadow on the brick
  const fe0 = x0 + 360;
  const fe1 = x0 + 470;
  for (const pass of [0, 1]) {
    ctx.save();
    if (pass === 0) ctx.translate(4, 5);
    ctx.strokeStyle = pass === 0 ? 'rgba(10,4,8,0.35)' : '#0a0608';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const ly of [fb + 54, fb + 102]) {
      ctx.moveTo(fe0, ly);
      ctx.lineTo(fe1, ly);
      ctx.moveTo(fe0, ly - 12);
      ctx.lineTo(fe1, ly - 12);
      for (let x = fe0; x <= fe1; x += 11) {
        ctx.moveTo(x, ly);
        ctx.lineTo(x, ly - 12);
      }
    }
    ctx.moveTo(fe0 + 14, fb + 54);
    ctx.lineTo(fe1 - 20, fb + 102);
    ctx.moveTo(fe0 + 22, fb + 54);
    ctx.lineTo(fe1 - 12, fb + 102);
    ctx.stroke();
    ctx.restore();
  }
  // the hotel's blade sign: a box on brackets, its letters neon red (lit from dusk)
  const hx = x0 + 300;
  const hy = fb - 26;
  castShadow(ctx, rectPath(hx - 13, hy, 26, 96), 4, 4, 0.5);
  vfill(ctx, hx - 13, hy, 26, 96, [[0, '#2a1a20'], [1, '#140a10']]);
  ctx.strokeStyle = '#a89aa0';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(hx - 13, hy, 26, 96);
  ctx.save();
  ctx.font = `bold 15px ${ROUND}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  'HOTEL'.split('').forEach((ch, i) => {
    const on = !(storm && i === 2);
    if (on) {
      ctx.shadowColor = '#ff3a3a';
      ctx.shadowBlur = 8;
    }
    ctx.fillStyle = on ? '#ff6a5a' : '#4a2a2a';
    ctx.fillText(ch, hx, hy + 12 + i * 18);
    ctx.shadowBlur = 0;
  });
  ctx.restore();
  glowAt(ctx, hx, hy + 48, 60, '#ff3a3a', night ? 0.32 : 0.2, 1.4);
  // the laundromat: a lit shop window (cool fluorescent), its awning striped, a dryer's round door
  const sh0 = x0 + 120;
  const sh1 = x0 + 280;
  const sy0 = STREET - 54;
  vfill(ctx, sh0, sy0, sh1 - sh0, 48, [[0, '#e8f4f0'], [1, '#9ac8c0']]);
  for (let i = 0; i < 4; i++) {
    const dx = sh0 + 22 + i * 38;
    ctx.fillStyle = '#c8d4d4';
    ctx.fillRect(dx - 15, sy0 + 14, 30, 34);
    ctx.fillStyle = '#5a7a80';
    ctx.beginPath();
    ctx.arc(dx, sy0 + 30, 9, 0, P2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.arc(dx - 3, sy0 + 27, 3, 0, P2);
    ctx.fill();
  }
  glowAt(ctx, (sh0 + sh1) / 2, sy0 + 26, 110, '#bff0e8', storm ? 0.2 : night ? 0.3 : 0.16, 0.6);
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = i % 2 ? (storm ? '#1e3a38' : '#2a7a6c') : storm ? '#7a7a74' : '#ece4d0';
    ctx.beginPath();
    ctx.moveTo(sh0 - 10 + i * 20, sy0 - 4);
    ctx.lineTo(sh0 - 10 + (i + 1) * 20, sy0 - 4);
    ctx.lineTo(sh0 - 8 + (i + 1) * 20, sy0 + 10);
    ctx.lineTo(sh0 - 8 + i * 20, sy0 + 10);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(10,6,8,0.4)';
  ctx.fillRect(sh0 - 10, sy0 + 10, 182, 3);
  // the pavement and the kerb
  vfill(ctx, x0, STREET - 6, w, 8, storm ? [[0, '#24262c'], [1, '#14161a']] : [[0, night ? '#2c2a34' : '#6a6070'], [1, '#18161c']]);
  ctx.fillStyle = storm ? '#3a3c44' : night ? '#4a4652' : '#9a8e98';
  ctx.fillRect(x0, STREET + 1, w, 2);
  // the street lamp on the pavement, its halo in the damp air, its pool on the pavement
  const lx = x0 + 52;
  ctx.fillStyle = '#0a0608';
  ctx.fillRect(lx - 2, ROOF - 34, 4, STREET - ROOF + 34);
  ctx.beginPath();
  ctx.moveTo(lx, ROOF - 34);
  ctx.quadraticCurveTo(lx + 4, ROOF - 50, lx + 26, ROOF - 48);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#0a0608';
  ctx.stroke();
  ctx.fillRect(lx + 16, ROOF - 50, 22, 6);
  ctx.fillStyle = '#fff0c0';
  ctx.fillRect(lx + 19, ROOF - 44, 16, 3);
  glowAt(ctx, lx + 27, ROOF - 40, storm ? 70 : 50, '#ffe0a0', storm ? 0.45 : night ? 0.45 : 0.3);
  lightPool(ctx, lx + 27, STREET - 2, 70, 8, '#ffd890', night ? 0.35 : 0.2);
  // the asphalt: from the night on it's wet, holding the lights in long broken streaks
  vfill(ctx, x0, STREET + 3, w, y1 - STREET - 3, storm ? [[0, '#0c0e12'], [1, '#181c22']] : night ? [[0, '#0e0e18'], [1, '#1c1c2a']] : [[0, '#2a2834'], [1, '#3a3644']]);
  const refl: [number, string, number][] = [[(sh0 + sh1) / 2, '#bff0e8', 60], [hx, '#ff4a3a', 10], [lx + 27, '#ffd890', 12], [x0 + 470, '#ffd488', 16]];
  for (const [rx, col, rw] of refl)
    for (let yy = STREET + 4; yy < y1; yy += 3) {
      const a = (night ? 0.55 : 0.2) * (1 - (yy - STREET) / (y1 - STREET)) * (0.5 + r() * 0.5);
      const jig = (r() - 0.5) * rw * 0.3;
      ctx.fillStyle = rgba(col, a);
      ctx.fillRect(rx - rw / 2 + jig, yy, rw * (0.6 + r() * 0.5), 1.6);
    }
  // the parked car: a boxy coupe in silhouette, chrome catching the lamp, a tail light, its shadow under
  const cx0 = x0 + 330;
  const cy = STREET + 14;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.ellipse(cx0 + 74, cy + 3, 82, 4, 0, 0, P2);
  ctx.fill();
  const car = (c: Ctx) => {
    c.beginPath();
    c.moveTo(cx0, cy - 4);
    c.lineTo(cx0 + 2, cy - 18);
    c.lineTo(cx0 + 36, cy - 21);
    c.lineTo(cx0 + 56, cy - 36);
    c.lineTo(cx0 + 104, cy - 36);
    c.lineTo(cx0 + 124, cy - 22);
    c.lineTo(cx0 + 148, cy - 20);
    c.lineTo(cx0 + 150, cy - 4);
    c.closePath();
  };
  ctx.fillStyle = storm ? '#141a22' : night ? '#1a1e2e' : '#3a3050';
  car(ctx);
  ctx.fill();
  ctx.fillStyle = storm ? '#2a3240' : night ? '#24304a' : '#8a8ab0';
  ctx.beginPath();
  ctx.moveTo(cx0 + 60, cy - 33);
  ctx.lineTo(cx0 + 100, cy - 33);
  ctx.lineTo(cx0 + 116, cy - 22);
  ctx.lineTo(cx0 + 44, cy - 22);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgba('#d8e0f0', night ? 0.4 : 0.6);
  ctx.fillRect(cx0 + 4, cy - 14, 144, 1.4);
  ctx.fillStyle = '#ff2a2a';
  ctx.fillRect(cx0 + 146, cy - 17, 3, 5);
  glowAt(ctx, cx0 + 148, cy - 14, 10, '#ff2a2a', 0.5);
  for (const wx of [cx0 + 28, cx0 + 122]) {
    ctx.fillStyle = '#060608';
    ctx.beginPath();
    ctx.arc(wx, cy - 3, 8, 0, P2);
    ctx.fill();
    ctx.fillStyle = 'rgba(180,190,210,0.5)';
    ctx.beginPath();
    ctx.arc(wx, cy - 3, 3, 0, P2);
    ctx.fill();
  }
  // the town's air in front of it all
  vfill(ctx, x0, y0, w, y1 - y0, storm ? [[0, 'rgba(40,44,56,0.04)'], [1, 'rgba(40,44,56,0.16)']] : [[0, 'rgba(30,30,60,0)'], [1, 'rgba(30,30,60,0.12)']]);
  ctx.restore();
}

/** Mist on the glass (the room warm and the night wet): heavy at the bottom, cleared in runnels where drops ran. */
function condensation(ctx: Ctx, r: R): void {
  const { x0, x1, y0, y1 } = WIN;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, x1 - x0, y1 - y0);
  ctx.clip();
  vfill(ctx, x0, y0, x1 - x0, y1 - y0, [[0, 'rgba(200,214,230,0.04)'], [0.5, 'rgba(200,214,230,0.16)'], [1, 'rgba(210,220,236,0.42)']]);
  lay(ctx, noiseMask(8, 61, { cover: 0.5, soft: 0.4, col: '#dce6f0' }), WIN_BOX, 0.18);
  // runnels where drops ran down and cleared the mist
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 9; i++) {
    const x = x0 + 10 + r() * (x1 - x0 - 20);
    const top = y0 + 120 + r() * 100;
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 2 + r() * 2;
    ctx.beginPath();
    ctx.moveTo(x, top);
    let yy = top;
    let xx = x;
    while (yy < y1) {
      yy += 10 + r() * 14;
      xx += (r() - 0.5) * 4;
      ctx.lineTo(xx, yy);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function windowFrame(ctx: Ctx, r: R): void {
  const { x0, x1, y0, y1 } = WIN;
  const inner = rectPath(x0, y0, x1 - x0, y1 - y0);
  // the glass: the room in it, faint (a lamp, the neon's cyan)
  glassPane(ctx, inner, WIN_BOX, { sheen: 0.07, reflect: [WIN.x1 - 40, DN.lampY + 60, 90, '#ffe4b0'], dirt: 0.12 });
  // a venetian blind half up: slats curling a little, lit on their tops, a cord and its tassel
  ctx.save();
  inner(ctx);
  ctx.clip();
  castShadow(ctx, rectPath(x0, y0, x1 - x0, BLIND - y0 + 4), 6, 8, 0.5);
  for (let y = y0; y < BLIND; y += 8) {
    const g = ctx.createLinearGradient(0, y, 0, y + 7);
    g.addColorStop(0, '#f2ece0');
    g.addColorStop(0.45, '#c8c2b4');
    g.addColorStop(1, '#6a665c');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.quadraticCurveTo((x0 + x1) / 2, y + 1.5, x1, y);
    ctx.lineTo(x1, y + 6.5);
    ctx.quadraticCurveTo((x0 + x1) / 2, y + 8, x0, y + 6.5);
    ctx.fill();
  }
  vfill(ctx, x0, BLIND - 4, x1 - x0, 6, [[0, '#d8d2c4'], [1, '#4a463e']]);
  ctx.restore();
  for (const cx of [x0 + 40, x1 - 40]) {
    ctx.strokeStyle = 'rgba(220,214,200,0.8)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx, y0);
    ctx.lineTo(cx, BLIND + 2);
    ctx.stroke();
  }
  hang(ctx, x1 - 26, y0 + 4, x1 - 24, BLIND + 70, 0, '#d8d0c0', 1.2);
  const tassel = rrPath(x1 - 28, BLIND + 68, 8, 16, 3);
  solid(ctx, tassel, { x: x1 - 28, y: BLIND + 68, w: 8, h: 16 }, 'plastic', '#e8e0cc', { depth: 0.1, line: 1, formSize: 3 });
  // the chrome frame: a deep bevelled surround, lit along its top-left, its own shadow on the wall
  const F = 18;
  const frame = (c: Ctx) => {
    c.beginPath();
    c.rect(x0 - F, y0 - F, x1 - x0 + F * 2, y1 - y0 + F * 2);
    c.rect(x0, y0, x1 - x0, y1 - y0);
  };
  castShadow(ctx, rectPath(x0 - F, y0 - F, x1 - x0 + F * 2, y1 - y0 + F * 2), 10, 14, 0.5);
  ctx.save();
  frame(ctx);
  ctx.clip('evenodd');
  const g = ctx.createLinearGradient(x0 - F, y0 - F, x1 + F, y1 + F);
  g.addColorStop(0, '#f2f6f8');
  g.addColorStop(0.25, '#8e9aa4');
  g.addColorStop(0.5, '#dce4ea');
  g.addColorStop(0.75, '#5a646c');
  g.addColorStop(1, '#3a4248');
  ctx.fillStyle = g;
  ctx.fillRect(x0 - F, y0 - F, x1 - x0 + F * 2, y1 - y0 + F * 2);
  // the bevel: the inner lip's four faces, top and left in light, bottom and right in shade
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.moveTo(x0 - F, y0 - F);
  ctx.lineTo(x1 + F, y0 - F);
  ctx.lineTo(x1, y0);
  ctx.lineTo(x0, y0);
  ctx.lineTo(x0, y1);
  ctx.lineTo(x0 - F, y1 + F);
  ctx.fill();
  ctx.fillStyle = 'rgba(6,10,16,0.4)';
  ctx.beginPath();
  ctx.moveTo(x1 + F, y1 + F);
  ctx.lineTo(x0 - F, y1 + F);
  ctx.lineTo(x0, y1);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x1, y0);
  ctx.lineTo(x1 + F, y0 - F);
  ctx.fill();
  // the lamps and the neon in the chrome
  for (const [x, col] of [[x1 - 40, '#ffe4b0'], [x0 + 200, '#ff7aa0']] as const) {
    const gg = ctx.createLinearGradient(x - 60, 0, x + 60, 0);
    gg.addColorStop(0, rgba(col, 0));
    gg.addColorStop(0.5, rgba(col, 0.55));
    gg.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = gg;
    ctx.fillRect(x - 60, y0 - F, 120, F);
  }
  ctx.restore();
  ctx.strokeStyle = '#0e161c';
  ctx.lineWidth = lineAt(0.12);
  ctx.strokeRect(x0 - F, y0 - F, x1 - x0 + F * 2, y1 - y0 + F * 2);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  // screw heads round the frame
  for (const [sx, sy] of [[x0 - F / 2, y0 - F / 2], [x1 + F / 2, y0 - F / 2], [x0 - F / 2, y1 + F / 2], [x1 + F / 2, y1 + F / 2], [(x0 + x1) / 2, y0 - F / 2], [(x0 + x1) / 2, y1 + F / 2]]) {
    ctx.fillStyle = '#2a3036';
    ctx.beginPath();
    ctx.arc(sx, sy, 2.6, 0, P2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillRect(sx - 1.5, sy - 1.5, 1.5, 1.2);
  }
  // the mullion
  const mx = (x0 + x1) / 2;
  const mull = rectPath(mx - 5, y0, 10, y1 - y0);
  castShadow(ctx, mull, 5, 5, 0.35);
  solid(ctx, mull, { x: mx - 5, y: y0, w: 10, h: y1 - y0 }, 'chrome', '#b8c4cc', { depth: 0.12, line: 1.4, formSize: 4 });
  // the sill: a chrome ledge with a little cactus in a pot standing on it
  const sl = rrPath(x0 - F - 6, y1 + F - 2, x1 - x0 + F * 2 + 12, 12, 3);
  castShadow(ctx, sl, 6, 8, 0.5);
  solid(ctx, sl, { x: x0 - F - 6, y: y1 + F - 2, w: x1 - x0 + F * 2 + 12, h: 12 }, 'chrome', '#c8d0d6', { depth: 0.1, line: 1.4, formSize: 4 });
  const px = x0 + 470;
  const py = y1 + F - 2;
  castShadow(ctx, rrPath(px - 13, py - 22, 26, 22, 3), 5, 4, 0.5);
  const pot = (c: Ctx) => {
    c.beginPath();
    c.moveTo(px - 13, py - 22);
    c.lineTo(px + 13, py - 22);
    c.lineTo(px + 10, py);
    c.lineTo(px - 10, py);
    c.closePath();
  };
  solid(ctx, pot, { x: px - 13, y: py - 22, w: 26, h: 22 }, 'enamel', '#e86a4a', { depth: 0.1, line: 1.4, formSize: 6 });
  const cac = rrPath(px - 7, py - 52, 14, 32, 7);
  solid(ctx, cac, { x: px - 7, y: py - 52, w: 14, h: 32 }, 'plush', '#4a8a5a', { depth: 0.1, line: 1.3, formSize: 5 });
  const arm = rrPath(px + 5, py - 44, 9, 16, 4.5);
  solid(ctx, arm, { x: px + 5, y: py - 44, w: 9, h: 16 }, 'plush', '#4a8a5a', { depth: 0.1, line: 1.2, formSize: 3 });
  ctx.fillStyle = 'rgba(255,255,230,0.6)';
  for (let i = 0; i < 10; i++) ctx.fillRect(px - 6 + r() * 12, py - 50 + r() * 28, 1, 1);
}

/** The OPEN sign hanging in the window on two chains (unlit tubes, or lit). */
function openSign(ctx: Ctx, lit: boolean): void {
  const { x, y } = DN.open;
  if (!lit) {
    hang(ctx, x - 70, BLIND + 2, x - 74, y - 40, 0, '#8a8a90', 1.6, true);
    hang(ctx, x + 70, BLIND + 2, x + 74, y - 40, 0, '#8a8a90', 1.6, true);
    // its backing: a clear acrylic panel with the tubes' clips
    const back = rrPath(x - 104, y - 44, 208, 88, 16);
    ctx.fillStyle = 'rgba(14,14,20,0.6)';
    back(ctx);
    ctx.fill();
    ctx.strokeStyle = 'rgba(200,210,220,0.35)';
    ctx.lineWidth = 2;
    back(ctx);
    ctx.stroke();
  }
  neonStroke(ctx, '#3ae8ff', 5, () => {
    ctx.beginPath();
    ctx.roundRect(x - 94, y - 36, 188, 72, 15);
    ctx.stroke();
  }, lit ? 1 : 0);
  neonText(ctx, 'Open', x, y + 2, 58, SCRIPT, '#ff3a6a', lit ? undefined : [0, 0, 0, 0], 5);
}

// ——— the neon on the wall ———

/** The tired letter in PIZZA. */
const TIRED = 3;
const SIGN_SIZE = 124;

/** The PIZZA sign's letters, each lit at its own level (-1: not painted), with its underline. */
function pizzaLetters(ctx: Ctx, on: number[], bar: number, col = '#3ae8ff'): void {
  const { x, y } = DN.pizza;
  ctx.save();
  ctx.font = `${SIGN_SIZE}px ${ROUND}`;
  ctx.textBaseline = 'middle';
  const text = 'PIZZA';
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((s, v) => s + v, 0);
  let cx = x - total / 2;
  [...text].forEach((ch, i) => {
    const o = on[i];
    const c0 = cx;
    if (o >= 0) neonStroke(ctx, i === TIRED && o > 0 && o < 0.3 && col === '#3ae8ff' ? '#a86aff' : col, 8, () => ctx.strokeText(ch, c0, y), Math.min(1, o));
    if (o > 1) neonStroke(ctx, '#e8ffff', 4, () => ctx.strokeText(ch, c0, y), o - 1);
    cx += widths[i];
  });
  ctx.restore();
  if (bar >= 0)
    neonStroke(ctx, '#ff4fd8', 6, () => {
      ctx.beginPath();
      ctx.moveTo(x - 224, y + 82);
      ctx.lineTo(x + 224, y + 82);
      ctx.stroke();
    }, bar);
}

/** The tired letter's box (screen px) and its electrode (where the sparks come from). */
function tiredBox(): { x: number; y: number; w: number; h: number; ex: number; ey: number } {
  const [, c] = makeCanvas(4, 4);
  c.font = `${SIGN_SIZE}px ${ROUND}`;
  const widths = [...'PIZZA'].map((ch) => c.measureText(ch).width);
  const total = widths.reduce((s, v) => s + v, 0);
  const lx = DN.pizza.x - total / 2 + widths.slice(0, TIRED).reduce((s, v) => s + v, 0);
  const w = widths[TIRED];
  return { x: Math.floor(lx - 46), y: DN.pizza.y - 110, w: Math.ceil(w + 92), h: 210, ex: lx + w - 8, ey: DN.pizza.y + 48 };
}

/** The sign's raceway (the box the tubes are wired through) and its standoffs: dark tubes in the base. */
function pizzaBoard(ctx: Ctx): void {
  const { x, y } = DN.pizza;
  // the raceway, painted to match the wall, a cable up into the ceiling
  const rw = rrPath(x - 236, y + 56, 472, 10, 3);
  castShadow(ctx, rw, 5, 7, 0.4);
  solid(ctx, rw, { x: x - 236, y: y + 56, w: 472, h: 10 }, 'enamel', '#24545a', { depth: 0.2, line: 1.2, formSize: 3, ink: '#0e2428' });
  // the transformer box at the end, a little paint chipped off
  const tb = rrPath(x + 236, y + 48, 34, 26, 3);
  castShadow(ctx, tb, 6, 6, 0.5);
  solid(ctx, tb, { x: x + 236, y: y + 48, w: 34, h: 26 }, 'iron', '#3a4248', { depth: 0.15, line: 1.4, formSize: 5 });
  pizzaLetters(ctx, [0, 0, 0, 0, 0], 0);
}

function noFeet(ctx: Ctx, lit: number): void {
  const { x, y, r: rad } = DN.nofeet;
  ctx.save();
  ctx.translate(x, y);
  if (lit === 0) {
    ctx.save();
    ctx.translate(-x, -y);
    castShadow(ctx, ellPath(x, y, rad + 12, rad + 12), 10, 14, 0.45);
    ctx.restore();
    const plate = ellPath(0, 0, rad + 12, rad + 12);
    ctx.fillStyle = 'rgba(8,14,18,0.7)';
    plate(ctx);
    ctx.fill();
    ctx.strokeStyle = 'rgba(160,190,200,0.35)';
    ctx.lineWidth = 2;
    plate(ctx);
    ctx.stroke();
  }
  neonStroke(ctx, '#ffd86a', 5, () => {
    ctx.beginPath();
    footPath(ctx, 0, 0, rad * 1.05, true);
    ctx.stroke();
  }, lit);
  neonStroke(ctx, '#ff4a6a', 7, () => {
    ctx.beginPath();
    ctx.arc(0, 0, rad, 0, P2);
    ctx.moveTo(-rad * 0.7, -rad * 0.7);
    ctx.lineTo(rad * 0.7, rad * 0.7);
    ctx.stroke();
  }, lit);
  ctx.restore();
}

// ——— the pendants ———

function lamp(ctx: Ctx, x: number): void {
  // the cord down from a chrome ceiling rose
  const rose = rrPath(x - 14, DN.ceil - 2, 28, 8, 3);
  solid(ctx, rose, { x: x - 14, y: DN.ceil - 2, w: 28, h: 8 }, 'chrome', '#c8d0d6', { depth: 0.15, line: 1.2, formSize: 3 });
  hang(ctx, x, DN.ceil + 6, x, DN.lampY, 0, '#1a1c20', 2.5);
  // the fitter: a chrome cup over the globe's neck
  const cap = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x - 6, DN.lampY);
    c.lineTo(x + 6, DN.lampY);
    c.lineTo(x + 15, DN.lampY + 14);
    c.lineTo(x - 15, DN.lampY + 14);
    c.closePath();
  };
  solid(ctx, cap, { x: x - 15, y: DN.lampY, w: 30, h: 14 }, 'chrome', '#c8d0d6', { depth: 0.12, line: 1.4, formSize: 4 });
  // a milk-glass globe lit from inside: hot round the bulb, the glass thicker and warmer at its edge, the fitter's
  // shadow on its shoulder
  const gy = DN.lampY + 48;
  const R0 = 34;
  const g = ctx.createRadialGradient(x - 4, gy + 2, 3, x, gy, R0);
  g.addColorStop(0, '#fffff6');
  g.addColorStop(0.35, '#fff6dc');
  g.addColorStop(0.8, '#f4dca8');
  g.addColorStop(1, '#c8a46a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, gy, R0, 0, P2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, gy, R0, 0, P2);
  ctx.clip();
  const sh = ctx.createRadialGradient(x, DN.lampY + 10, 4, x, DN.lampY + 10, 26);
  sh.addColorStop(0, 'rgba(120,90,50,0.45)');
  sh.addColorStop(1, 'rgba(120,90,50,0)');
  ctx.fillStyle = sh;
  ctx.fillRect(x - R0, gy - R0, R0 * 2, R0);
  ctx.restore();
  ctx.strokeStyle = rgba('#7a6040', 0.7);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(x, gy, R0, 0, P2);
  ctx.stroke();
}

function lampGlowStill(ctx: Ctx): void {
  for (const x of DN.lamps) {
    glowAt(ctx, x, DN.lampY + 48, 140, '#ffd890', 0.32);
    glowAt(ctx, x, DN.lampY + 48, 56, '#fff4dc', 0.35);
  }
}

// ——— booths ———

function booth(ctx: Ctx, r: R, x0: number, x1: number): void {
  const y0 = DN.boothTop;
  const seatTop = 604;
  const seatFront = 628;
  const kick = 672;
  const y1 = DN.floorTop + 6;
  const back = rrPath(x0, y0, x1 - x0, seatTop - y0 + 8, 16);
  // contact: the booth stands on the floor, its shadow behind it on the tile and a dark crevice where it meets
  const whole = rrPath(x0, y0, x1 - x0, y1 - y0, 16);
  aoHalo(ctx, whole, 26, 0.5, '#1a0610', 4);
  castShadow(ctx, whole, 12, 18, 0.5);
  // the backrest: channel tufting, rolled vinyl pleats each lit on its left, a deep seam between, a wet streak
  solid(ctx, back, { x: x0, y: y0, w: x1 - x0, h: seatTop - y0 + 8 }, 'leather', RED, { depth: 0.12, line: false, formSize: 20 });
  within(ctx, back, () => {
    const n = Math.round((x1 - x0) / 44);
    const cw = (x1 - x0) / n;
    for (let i = 0; i < n; i++) {
      const cx = x0 + i * cw;
      const g = ctx.createLinearGradient(cx, 0, cx + cw, 0);
      g.addColorStop(0, shade(RED, 0.16));
      g.addColorStop(0.3, shade(RED, 0.04));
      g.addColorStop(0.78, shade(RED, -0.26));
      g.addColorStop(1, shade(RED, -0.5));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(cx + 1, y0 + 24, cw - 2, seatTop - y0 - 20, [10, 10, 4, 4]);
      ctx.fill();
      // the pleat's specular streak, and the warm lamp in it
      ctx.fillStyle = rgba('#ffffff', 0.26);
      ctx.fillRect(cx + cw * 0.22, y0 + 34, 2.5, seatTop - y0 - 50);
      ctx.fillStyle = rgba('#ffd8c0', 0.1);
      ctx.fillRect(cx + cw * 0.16, y0 + 30, 9, seatTop - y0 - 40);
      ctx.fillStyle = 'rgba(30,0,6,0.65)';
      ctx.fillRect(cx + cw - 1.5, y0 + 22, 3, seatTop - y0 - 14);
    }
    // the welt along the top, rolled
    vfill(ctx, x0, y0, x1 - x0, 26, [[0, shade(RED, 0.3)], [0.4, RED], [1, shade(RED, -0.45)]]);
    grain(ctx, { x: x0, y: y0, w: x1 - x0, h: seatTop - y0 }, 'leather', 0.22, 1);
    // worn paler along the top where shoulders rub
    vfill(ctx, x0, y0 + 26, x1 - x0, 50, [[0, rgba('#ff9aa4', 0.12)], [1, rgba('#ff9aa4', 0)]]);
    // the backrest in the shade of the seat's edge low down
    vfill(ctx, x0, seatTop - 20, x1 - x0, 28, [[0, 'rgba(30,0,8,0)'], [1, 'rgba(30,0,8,0.55)']]);
  });
  ctx.strokeStyle = 'rgba(20,4,8,0.85)';
  ctx.lineWidth = lineAt(0.12);
  back(ctx);
  ctx.stroke();
  crevice(ctx, x0, x1, seatTop - 6, 12, 0.6, '#1a0206');
  // the seat: a thick cushion standing proud of the backrest: its top seen from above (lit), its rolled front edge
  // with piping, then the front face falling to a chrome kick plate
  const seat = rrPath(x0 - 6, seatTop, x1 - x0 + 12, kick - seatTop, 10);
  castShadow(ctx, seat, 4, 8, 0.35);
  solid(ctx, seat, { x: x0 - 6, y: seatTop, w: x1 - x0 + 12, h: kick - seatTop }, 'leather', shade(RED, -0.04), { depth: 0.1, line: false, formSize: 14 });
  within(ctx, seat, () => {
    vfill(ctx, x0 - 6, seatTop, x1 - x0 + 12, seatFront - seatTop, [[0, shade(RED, 0.1)], [0.6, shade(RED, 0.28)], [1, shade(RED, 0.05)]]);
    // the warm lamps on the seat top
    for (const lx of DN.lamps)
      if (lx > x0 - 200 && lx < x1 + 200) {
        const g = ctx.createRadialGradient(lx, seatTop + 10, 0, lx, seatTop + 10, 220);
        g.addColorStop(0, 'rgba(255,220,180,0.3)');
        g.addColorStop(1, 'rgba(255,220,180,0)');
        ctx.fillStyle = g;
        ctx.fillRect(lx - 220, seatTop, 440, seatFront - seatTop);
      }
    // the piping along the front edge
    vfill(ctx, x0 - 6, seatFront - 3, x1 - x0 + 12, 6, [[0, shade(RED, 0.45)], [0.5, shade(RED, 0.1)], [1, shade(RED, -0.5)]]);
    vfill(ctx, x0 - 6, seatFront + 3, x1 - x0 + 12, kick - seatFront, [[0, shade(RED, -0.15)], [1, shade(RED, -0.45)]]);
    // the cushion's seams, dimpled where they're buttoned
    const n = Math.round((x1 - x0) / 150);
    for (let i = 1; i < n; i++) {
      const sx = x0 + ((x1 - x0) / n) * i;
      ctx.fillStyle = 'rgba(30,0,8,0.5)';
      ctx.fillRect(sx - 1, seatTop + 2, 2, kick - seatTop - 4);
      ctx.fillStyle = rgba('#ffffff', 0.12);
      ctx.fillRect(sx + 1, seatTop + 2, 1, seatFront - seatTop);
    }
    grain(ctx, { x: x0, y: seatTop, w: x1 - x0, h: kick - seatTop }, 'leather', 0.2, 1);
  });
  ctx.strokeStyle = 'rgba(20,4,8,0.85)';
  ctx.lineWidth = lineAt(0.12);
  seat(ctx);
  ctx.stroke();
  // the kick plate: ribbed chrome reflecting the checker floor and the jukebox
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0 - 6, kick, x1 - x0 + 12, y1 - kick);
  ctx.clip();
  for (let y = kick; y < y1; y += 4) vfill(ctx, x0 - 6, y, x1 - x0 + 12, 4, [[0, '#d8e0e6'], [0.5, '#7a8690'], [1, '#2a3238']]);
  // the floor's checker and the lamps mirrored in it, soft
  for (const lx of DN.lamps)
    if (lx > x0 - 150 && lx < x1 + 150) {
      const g = ctx.createRadialGradient(lx, y1, 0, lx, y1, 160);
      g.addColorStop(0, 'rgba(255,240,215,0.35)');
      g.addColorStop(1, 'rgba(255,240,215,0)');
      ctx.fillStyle = g;
      ctx.fillRect(lx - 160, kick, 320, y1 - kick);
    }
  vfill(ctx, x0 - 6, kick, x1 - x0 + 12, y1 - kick, [[0, 'rgba(10,10,14,0)'], [1, 'rgba(10,10,14,0.35)']]);
  ctx.restore();
  ctx.strokeStyle = '#141a1e';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(x0 - 6, kick, x1 - x0 + 12, y1 - kick);
  // the chrome cap along the backrest's top, catching the lamps
  const cap = rrPath(x0 - 4, y0 - 6, x1 - x0 + 8, 12, 6);
  castShadow(ctx, cap, 3, 4, 0.4);
  solid(ctx, cap, { x: x0 - 4, y: y0 - 6, w: x1 - x0 + 8, h: 12 }, 'chrome', '#d0d8de', { depth: 0.12, line: 1.6, formSize: 5 });
  for (const lx of DN.lamps)
    if (lx > x0 && lx < x1) {
      const g = ctx.createLinearGradient(lx - 70, 0, lx + 70, 0);
      g.addColorStop(0, 'rgba(255,240,210,0)');
      g.addColorStop(0.5, 'rgba(255,240,210,0.8)');
      g.addColorStop(1, 'rgba(255,240,210,0)');
      ctx.fillStyle = g;
      ctx.fillRect(lx - 70, y0 - 4, 140, 3);
    }
  rim(ctx, back, 0.2, 3);
  // the key light from the top left: each booth's right end turns away from it
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, 'rgba(255,220,180,0.06)');
  g.addColorStop(0.6, 'rgba(20,0,10,0)');
  g.addColorStop(1, 'rgba(20,0,10,0.22)');
  ctx.save();
  whole(ctx);
  ctx.clip();
  ctx.fillStyle = g;
  ctx.fillRect(x0 - 6, y0 - 6, x1 - x0 + 12, y1 - y0 + 6);
  ctx.restore();
  void r;
}

// ——— the jukebox ———

const JK = (() => {
  const { x, top, w } = DN.juke;
  const R0 = w / 2;
  const cy = top + R0;
  return { x, top, w, R0, cy, x0: x - R0, x1: x + R0, y1: DN.floorTop + 12, dome: { r: 60, cy: cy + 4 }, grille: { y: cy + 100, h: 150 } };
})();

/** The arch's three tubes: radii (centre line) and the fluid each holds. */
const ARCH: { rr: number; col: string; lit: string }[] = [
  { rr: JK.R0 - 14, col: '#ff3a7a', lit: '#ffc0d8' },
  { rr: JK.R0 - 32, col: '#ffb02a', lit: '#fff0b0' },
  { rr: JK.R0 - 50, col: '#2ac8ff', lit: '#c0f4ff' },
];
const TUBE_W = 14;
/** The arch tubes run down the sides to here. */
const ARCH_FOOT = JK.cy + 70;

/** The arch tubes lit, bubbles rising up both legs and round over the top (phase 0…1 loops). In screen coords. */
function archFrame(c: Ctx, ph: number): void {
  for (const [ti, t] of ARCH.entries()) {
    const path = (cc: Ctx) => {
      cc.beginPath();
      cc.moveTo(JK.x - t.rr, ARCH_FOOT);
      cc.lineTo(JK.x - t.rr, JK.cy);
      cc.arc(JK.x, JK.cy, t.rr, Math.PI, 0);
      cc.lineTo(JK.x + t.rr, ARCH_FOOT);
    };
    c.save();
    c.lineCap = 'butt';
    // the glow round the tube, then the fluid (lit from within, brighter along its middle), then the glass
    path(c);
    c.strokeStyle = rgba(t.col, 0.3);
    c.lineWidth = TUBE_W + 10;
    c.stroke();
    path(c);
    c.strokeStyle = t.col;
    c.lineWidth = TUBE_W;
    c.stroke();
    path(c);
    c.strokeStyle = rgba(t.lit, 0.75);
    c.lineWidth = TUBE_W * 0.45;
    c.stroke();
    path(c);
    c.strokeStyle = 'rgba(255,255,255,0.55)';
    c.lineWidth = 1.5;
    c.setLineDash([]);
    c.stroke();
    // the bubbles: along the tube's length from each foot to the crown, rising and speeding up, swelling a little
    const legL = ARCH_FOOT - JK.cy;
    const arcL = (t.rr * Math.PI) / 2;
    const L = legL + arcL;
    const N = 9;
    for (let side = 0; side < 2; side++)
      for (let j = 0; j < N; j++) {
        // (each loop moves every bubble on to the next one's place: small steps between frames, a seamless loop)
        const u = (j + ph + side * 0.5 + ti * 0.37) / N % 1;
        const s = u ** 1.25 * L;
        const sg = side ? 1 : -1;
        const wob = Math.sin(u * 30 + side * 2 + ti) * 1.5;
        let px: number;
        let py: number;
        if (s < legL) {
          px = JK.x + sg * t.rr + wob;
          py = ARCH_FOOT - s;
        } else {
          // round the arch from the side towards the crown (a = 0 at the side, π/2 at the top)
          const a = (s - legL) / t.rr;
          px = JK.x + sg * Math.cos(a) * (t.rr + wob);
          py = JK.cy - Math.sin(a) * (t.rr + wob);
        }
        const br = 1.8 + (0.5 + 0.5 * Math.sin(u * 41 + ti)) * 1.3 + u * 1.2;
        const fade = Math.min(1, u * 8) * Math.min(1, (1 - u) * 6);
        c.strokeStyle = rgba('#ffffff', 0.85 * fade);
        c.lineWidth = 1.1;
        c.beginPath();
        c.arc(px, py, br, 0, P2);
        c.stroke();
        c.fillStyle = rgba('#ffffff', 0.9 * fade);
        c.fillRect(px - br * 0.45, py - br * 0.5, 1.2, 1.2);
      }
    c.restore();
  }
}

/** The pilaster tubes either side of the grille (frame painted in screen coords). */
const PIL = { y0: JK.grille.y - 6, y1: JK.y1 - 40, xs: [JK.x0 + 20, JK.x1 - 32], w: 12 };
function pilasterFrame(c: Ctx, ph: number, only?: number): void {
  const h = PIL.y1 - PIL.y0;
  for (const [pi, px] of PIL.xs.entries()) {
    if (only !== undefined && only !== pi) continue;
    const g = c.createLinearGradient(px, 0, px + PIL.w, 0);
    g.addColorStop(0, '#ffc0e0');
    g.addColorStop(0.45, '#ff5aa8');
    g.addColorStop(1, '#7a1048');
    c.fillStyle = g;
    c.beginPath();
    c.roundRect(px, PIL.y0, PIL.w, h, 6);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.5)';
    c.fillRect(px + 2.5, PIL.y0 + 4, 1.5, h - 8);
    for (let j = 0; j < 12; j++) {
      const u = (j + ph + pi * 0.4) / 12 % 1;
      const y = PIL.y1 - 4 - u ** 1.2 * (h - 8);
      const x = px + PIL.w / 2 + Math.sin(u * 14 + pi * 2) * 1.6;
      const br = 1.4 + (0.5 + 0.5 * Math.sin(u * 33)) * 1.2;
      const fade = Math.min(1, u * 8) * Math.min(1, (1 - u) * 6);
      c.strokeStyle = rgba('#ffffff', 0.9 * fade);
      c.lineWidth = 1;
      c.beginPath();
      c.arc(x, y, br, 0, P2);
      c.stroke();
    }
  }
}

/** The record on its turntable in the dome, seen from above the front: the label's print turning (phase 0…1 per
 * turn). Painted in screen coords. */
const REC = { x: JK.x, y: JK.dome.cy + 26, rx: 44, ry: 13 };
function recordFrame(c: Ctx, ph: number): void {
  const { x, y, rx, ry } = REC;
  // the platter's rim under it, then the vinyl, its grooves catching the dome light in two fixed arcs
  c.fillStyle = '#3a3a40';
  c.beginPath();
  c.ellipse(x, y + 3, rx + 3, ry + 1.5, 0, 0, P2);
  c.fill();
  c.fillStyle = '#0a0809';
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, P2);
  c.fill();
  for (let k = 0.45; k < 1; k += 0.09) {
    c.strokeStyle = 'rgba(255,255,255,0.05)';
    c.lineWidth = 0.8;
    c.beginPath();
    c.ellipse(x, y, rx * k, ry * k, 0, 0, P2);
    c.stroke();
  }
  c.strokeStyle = 'rgba(255,230,240,0.35)';
  c.lineWidth = 2;
  c.beginPath();
  c.ellipse(x, y, rx * 0.8, ry * 0.8, 0, -2.4, -1.9);
  c.stroke();
  c.beginPath();
  c.ellipse(x, y, rx * 0.8, ry * 0.8, 0, 0.7, 1.2);
  c.stroke();
  // the label: red, a printed band and a logo mark that turn with it
  c.fillStyle = '#c8282e';
  c.beginPath();
  c.ellipse(x, y, rx * 0.34, ry * 0.34, 0, 0, P2);
  c.fill();
  const a = ph * P2;
  c.fillStyle = '#f2e2b0';
  c.beginPath();
  c.ellipse(x + Math.cos(a) * rx * 0.2, y + Math.sin(a) * ry * 0.2, rx * 0.08, ry * 0.12, 0, 0, P2);
  c.fill();
  c.strokeStyle = '#f2e2b0';
  c.lineWidth = 1.4;
  c.beginPath();
  c.ellipse(x, y, rx * 0.26, ry * 0.26, 0, a + 2.2, a + 3.6);
  c.stroke();
  c.fillStyle = '#d8d8d8';
  c.beginPath();
  c.ellipse(x, y, 2, 1, 0, 0, P2);
  c.fill();
}

/** The tonearm, its pivot at the right of the dome, the head resting on the record's edge. */
const ARM = { px: JK.x + 52, py: JK.dome.cy + 14 };
function tonearm(c: Ctx): void {
  const { px, py } = ARM;
  c.strokeStyle = '#1a1c20';
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(px, py);
  c.quadraticCurveTo(px - 14, py + 6, px - 30, py + 18);
  c.stroke();
  c.strokeStyle = '#d8e0e6';
  c.lineWidth = 2;
  c.stroke();
  c.fillStyle = '#c8d0d6';
  c.fillRect(px - 36, py + 15, 9, 6);
  c.fillStyle = '#4a4e54';
  c.beginPath();
  c.arc(px, py, 5, 0, P2);
  c.fill();
  c.fillStyle = '#e8eef2';
  c.beginPath();
  c.arc(px - 1.5, py - 1.5, 1.8, 0, P2);
  c.fill();
}

function jukeBody(c: Ctx): void {
  const { x0, x1, y1, top, cy, R0, x } = JK;
  c.beginPath();
  c.moveTo(x0, y1);
  c.lineTo(x0, cy);
  c.arc(x, cy, R0, Math.PI, 0);
  c.lineTo(x1, y1);
  c.closePath();
  void top;
}

function jukebox(ctx: Ctx, r: R): void {
  const { x, top, w, x0, x1, y1, cy, dome, grille } = JK;
  castShadow(ctx, jukeBody, 16, 22, 0.55);
  aoHalo(ctx, jukeBody, 30, 0.45, '#140610', 6);
  // the cabinet: walnut, varnished, the lamps and the arch's light in it
  solid(ctx, jukeBody, { x: x0, y: top, w, h: y1 - top }, 'wood', '#6a3420', { depth: 0.1, formSize: 30 });
  within(ctx, jukeBody, () => {
    varnish(ctx, { x: x0, y: top, w, h: y1 - top }, [{ x: x0 + 26, a: 0.3, w: 24, col: '#ffe0c0' }, { x: x1 - 20, a: 0.18, w: 18, col: '#ff9ad0' }], { sheen: 0.05, vertical: true });
    // the arch's channel: dark glass the tubes lie in (the tubes are painted lit over it)
    for (const t of ARCH) {
      ctx.save();
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.moveTo(x - t.rr, ARCH_FOOT);
      ctx.lineTo(x - t.rr, cy);
      ctx.arc(x, cy, t.rr, Math.PI, 0);
      ctx.lineTo(x + t.rr, ARCH_FOOT);
      ctx.strokeStyle = '#1a0a10';
      ctx.lineWidth = TUBE_W + 4;
      ctx.stroke();
      ctx.restore();
    }
    // the dome: the mechanism behind curved glass, a pink-lit back
    const domeP = (c: Ctx) => {
      c.beginPath();
      c.moveTo(x - dome.r, dome.cy + 52);
      c.lineTo(x - dome.r, dome.cy);
      c.arc(x, dome.cy, dome.r, Math.PI, 0);
      c.lineTo(x + dome.r, dome.cy + 52);
      c.closePath();
    };
    const dg = ctx.createRadialGradient(x, dome.cy - 10, 4, x, dome.cy, dome.r + 30);
    dg.addColorStop(0, '#5a2a4a');
    dg.addColorStop(1, '#14060e');
    ctx.fillStyle = dg;
    domeP(ctx);
    ctx.fill();
    within(ctx, domeP, () => {
      // the record stack in its carousel, ranks of discs on edge behind the turntable
      for (let i = 0; i < 13; i++) {
        const dx = x - 48 + i * 8;
        ctx.fillStyle = i % 2 ? '#1a1418' : '#0c0a0c';
        ctx.beginPath();
        ctx.ellipse(dx, dome.cy - 4, 3, 22, 0, 0, P2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,200,230,0.2)';
        ctx.fillRect(dx - 1, dome.cy - 24, 1, 40);
      }
      // the turntable deck
      vfill(ctx, x - dome.r, REC.y - 4, dome.r * 2, 60, [[0, '#2a2a30'], [1, '#0e0e12']]);
    });
    ctx.strokeStyle = '#2a1418';
    ctx.lineWidth = 2;
    domeP(ctx);
    ctx.stroke();
    // the chrome band round the dome
    ctx.save();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#c8d0d8';
    domeP(ctx);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#f2f8fa';
    ctx.stroke();
    ctx.restore();
    // the grille: chrome bars over speaker cloth, the program card strip above it
    const gy = grille.y;
    vfill(ctx, x - 74, gy - 30, 148, 22, [[0, '#f2ead8'], [1, '#c8bca0']]);
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = 'rgba(60,40,30,0.5)';
      ctx.fillRect(x - 70 + i * 14.4, gy - 26, 10, 1.2);
      ctx.fillRect(x - 70 + i * 14.4, gy - 20, 8, 1.2);
      ctx.fillRect(x - 70 + i * 14.4, gy - 14, 11, 1.2);
    }
    const cloth = { x: x - 76, y: gy, w: 152, h: grille.h };
    vfill(ctx, cloth.x, cloth.y, cloth.w, cloth.h, [[0, '#3a1a20'], [1, '#14080c']]);
    grain(ctx, cloth, 'canvas', 0.4, 0.6);
    for (let i = 0; i < 8; i++) {
      const bx = x - 70 + i * 19.4;
      const bar = rrPath(bx, gy + 6, 8, grille.h - 12, 4);
      castShadow(ctx, bar, 3, 3, 0.4);
      solid(ctx, bar, { x: bx, y: gy + 6, w: 8, h: grille.h - 12 }, 'chrome', '#c8d0d8', { depth: 0.1, line: 1, formSize: 3 });
    }
    // the selector buttons, a coin slot, the chrome plinth
    for (let i = 0; i < 8; i++) {
      const b = rrPath(x - 70 + i * 18, gy + grille.h + 8, 14, 9, 2);
      solid(ctx, b, { x: x - 70 + i * 18, y: gy + grille.h + 8, w: 14, h: 9 }, 'plastic', i % 2 ? '#f0e8d8' : '#e83a4a', { depth: 0.1, line: 1, formSize: 3 });
    }
    const plinth = { x: x0, y: y1 - 20, w, h: 20 };
    vfill(ctx, plinth.x, plinth.y, plinth.w, plinth.h, [[0, '#f2f8fa'], [0.4, '#8a96a0'], [1, '#2a3238']]);
  });
  ctx.strokeStyle = '#140608';
  ctx.lineWidth = lineAt(0.1);
  jukeBody(ctx);
  ctx.stroke();
  rim(ctx, jukeBody, 0.3, 3);
  // its lights on the tile and the floor round it
  lightPool(ctx, x - 140, DN.floorTop - 70, 60, 120, '#ff7ad9', 0.12);
  void r;
}

/** The jukebox lit, as the still shows it (the live layer plays these). */
function jukeLitStill(ctx: Ctx): void {
  archFrame(ctx, 0.3);
  pilasterFrame(ctx, 0.3);
  recordFrame(ctx, 0.1);
  tonearm(ctx);
  glowAt(ctx, JK.x, JK.cy, 170, '#ff7ad9', 0.2);
  domeGlass(ctx);
}

/** The dome's curved glass over the record: a highlight down its left, the room in it. */
function domeGlass(ctx: Ctx): void {
  const { x, dome } = JK;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x - dome.r + 4, dome.cy + 48);
  ctx.lineTo(x - dome.r + 4, dome.cy);
  ctx.arc(x, dome.cy, dome.r - 4, Math.PI, 0);
  ctx.lineTo(x + dome.r - 4, dome.cy + 48);
  ctx.closePath();
  ctx.clip();
  const g = ctx.createLinearGradient(x - dome.r, 0, x + dome.r, 0);
  g.addColorStop(0, 'rgba(255,255,255,0.0)');
  g.addColorStop(0.15, 'rgba(255,255,255,0.28)');
  g.addColorStop(0.24, 'rgba(255,255,255,0.03)');
  g.addColorStop(0.8, 'rgba(255,255,255,0.0)');
  g.addColorStop(0.9, 'rgba(255,220,240,0.14)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - dome.r, dome.cy - dome.r, dome.r * 2, dome.r + 52);
  ctx.restore();
}

// ——— floor and counter ———

function floor(ctx: Ctx, r: R): void {
  tileFloor(ctx, r, DN.floorTop, TY, ['#b4aea6', '#2c2c34'], { size: 64, grout: '#2a2a30' });
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, DN.floorTop, W, TY - DN.floorTop);
  ctx.clip();
  // polished: the booths reflected (dark red, broken by the tiles' joints), the jukebox's colour, the lamps' pools
  for (const [a, b] of DN.booths) {
    const g = ctx.createLinearGradient(0, DN.floorTop, 0, DN.floorTop + 30);
    g.addColorStop(0, 'rgba(150,20,36,0.35)');
    g.addColorStop(1, 'rgba(150,20,36,0)');
    ctx.fillStyle = g;
    ctx.fillRect(a, DN.floorTop, b - a, 30);
  }
  lightPool(ctx, JK.x, DN.floorTop + 30, 190, 36, '#ff7ad9', 0.22);
  for (const lx of DN.lamps) lightPool(ctx, lx, DN.floorTop + 34, 240, 34, '#fff0d0', 0.12);
  vfill(ctx, 0, DN.floorTop, W, 22, [[0, 'rgba(10,4,8,0.6)'], [1, 'rgba(10,4,8,0)']]);
  // (the floor lies in the counter's and the booths' shade: kept dim so it never competes with the pizzas)
  vfill(ctx, 0, DN.floorTop, W, TY - DN.floorTop, [[0, 'rgba(14,10,20,0.3)'], [1, 'rgba(14,10,20,0.15)']]);
  lay(ctx, noiseMask(10, 33, { cover: 0.3, soft: 0.2, col: '#2a2018', w: 320, h: 30 }), { x: 0, y: DN.floorTop, w: W, h: TY - DN.floorTop }, 0.3);
  ctx.restore();
}

/** The counter: boomerang formica (gold flecks and boomerangs printed on the table plane), its gloss, the ribbed
 * aluminium edge band. */
function counter(ctx: Ctx, r: R): void {
  const front = DN.front;
  const box = { x: 0, y: TY, w: W, h: front - TY + 4 };
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  vfill(ctx, 0, TY, W, front - TY, [[0, '#2a8480'], [1, '#44aaa2']]);
  lay(ctx, drift('#64d0c4', '#1a5a5a', 6, 35, 256, 48), box, 0.22);
  const zf = zAt(front + 4);
  for (let i = 0; i < 560; i++) {
    const X = (r() - 0.5) * 5.2;
    const z = zf + r() * (ZB - zf);
    const sx = xAt(X, z);
    const sy = yAt(z);
    const s = 1210 / z / 460;
    if (r() < 0.5) {
      const col = ['#f2e8c8', '#ff8a9a', '#ffd86a', '#103438'][Math.floor(r() * 4)];
      ctx.save();
      ctx.translate(sx, sy);
      ctx.scale(1, 0.42);
      ctx.rotate(r() * P2);
      ctx.strokeStyle = rgba(col, 0.26);
      ctx.lineWidth = 3.2 * s;
      ctx.beginPath();
      ctx.moveTo(-14 * s, 6 * s);
      ctx.quadraticCurveTo(0, -12 * s, 14 * s, 6 * s);
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.fillStyle = rgba(r() < 0.5 ? '#ffe08a' : '#ffffff', 0.42);
      ctx.fillRect(sx, sy, 1.6 * s, 1.2 * s);
    }
  }
  grain(ctx, box, 'speckle', 0.1, 1);
  // the gloss: the lamps and the neon in it, soft streaks running towards us
  for (const [x, col, a] of [[DN.lamps[0], '#fff4d8', 0.11], [DN.lamps[1], '#fff4d8', 0.11], [DN.pizza.x, '#7af4ff', 0.07], [JK.x, '#ff7ad9', 0.12]] as const) {
    ctx.save();
    ctx.beginPath();
    planeQuad(ctx, (x - 960) / 460 - 0.22, (x - 960) / 460 + 0.22, ZB, zf);
    const g = ctx.createLinearGradient(0, TY, 0, front);
    g.addColorStop(0, rgba(col, a));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  }
  // wipe marks in the gloss, and the back edge darker where the counter meets the floor's shadow
  for (let i = 0; i < 6; i++) {
    ctx.strokeStyle = rgba('#ffffff', 0.035);
    ctx.lineWidth = 30;
    ctx.beginPath();
    ctx.ellipse(200 + r() * 1500, 840 + r() * 120, 180, 40, 0, 0.2, 2.6);
    ctx.stroke();
  }
  ctx.restore();
  tableFalloff(ctx, front, 0.4, '#061418');
  tableSeam(ctx, 0.55, '#0e1a1e', false);
  // the ribbed aluminium edge band
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, front, W, 1080 - front);
  ctx.clip();
  for (let y = front; y < 1080; y += 6) vfill(ctx, 0, y, W, 6, [[0, '#eef4f8'], [0.5, '#8a96a0'], [1, '#2a3238']]);
  for (const x of [...DN.lamps, JK.x]) {
    const g = ctx.createLinearGradient(x - 120, 0, x + 120, 0);
    g.addColorStop(0, 'rgba(255,240,220,0)');
    g.addColorStop(0.5, 'rgba(255,240,220,0.35)');
    g.addColorStop(1, 'rgba(255,240,220,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 120, front, 240, 40);
  }
  ctx.restore();
  ctx.fillStyle = rgba('#ffffff', 0.6);
  ctx.fillRect(0, front - 2, W, 2);
}

/** Back right on the counter, out of the lanes: a napkin dispenser, salt and pepper, a ketchup bottle, a sugar
 * pourer: each standing in its own shadow. */
const PROPS_BOX = { x: 1580, y: TY - 30, w: 340, h: 110 };
function counterProps(ctx: Ctx, r: R): void {
  const x = 1724;
  const y = 806;
  const stand = (cx: number, w: number) => {
    // contact: a tight dark core and a soft shadow falling down-right on the formica
    ctx.save();
    ctx.translate(cx + 8, y + 1);
    ctx.scale(1, 0.25);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w);
    g.addColorStop(0, 'rgba(4,20,22,0.8)');
    g.addColorStop(1, 'rgba(4,20,22,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-w, -w, w * 2, w * 2);
    ctx.restore();
    ctx.fillStyle = 'rgba(2,10,12,0.8)';
    ctx.fillRect(cx - w / 2 + 2, y - 1.5, w - 4, 3);
  };
  // each thing mirrored faintly in the formica's gloss under it
  const mirror = (cx: number, w: number, h: number, col: string) => {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, rgba(col, 0.3));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(cx - w / 2, y + 1, w, h);
  };
  mirror(x + 94, 26, 26, '#d01c1c');
  mirror(x, 88, 22, '#c4ccd2');
  mirror(x - 156, 22, 16, '#f0f0f0');
  mirror(x - 108, 18, 14, '#f0f0f0');
  mirror(x - 80, 18, 14, '#3a2a20');
  // the sugar pourer: glass, a chrome flip top
  const sx = x - 156;
  stand(sx, 30);
  const jar = rrPath(sx - 12, y - 44, 24, 44, 6);
  glassPane(ctx, jar, { x: sx - 12, y: y - 44, w: 24, h: 44 }, { sheen: 0.35, tint: 'rgba(220,230,230,0.25)' });
  ctx.fillStyle = 'rgba(250,248,240,0.85)';
  ctx.fillRect(sx - 10, y - 22, 20, 20);
  ctx.strokeStyle = 'rgba(30,40,44,0.7)';
  ctx.lineWidth = 1.2;
  jar(ctx);
  ctx.stroke();
  const top = (c: Ctx) => {
    c.beginPath();
    c.moveTo(sx - 12, y - 44);
    c.lineTo(sx - 9, y - 56);
    c.lineTo(sx + 9, y - 56);
    c.lineTo(sx + 12, y - 44);
    c.closePath();
  };
  solid(ctx, top, { x: sx - 12, y: y - 56, w: 24, h: 12 }, 'chrome', '#c8d0d6', { depth: 0.05, line: 1.2, formSize: 3 });
  // salt and pepper
  for (const [px, fill] of [[x - 108, 'rgba(250,250,250,0.85)'], [x - 80, 'rgba(50,36,26,0.85)']] as const) {
    stand(px, 22);
    const sh = rrPath(px - 10, y - 40, 20, 40, 5);
    glassPane(ctx, sh, { x: px - 10, y: y - 40, w: 20, h: 40 }, { sheen: 0.3, tint: 'rgba(230,240,240,0.25)' });
    ctx.fillStyle = fill;
    ctx.fillRect(px - 8, y - 24, 16, 22);
    ctx.strokeStyle = 'rgba(30,40,44,0.7)';
    ctx.lineWidth = 1.2;
    sh(ctx);
    ctx.stroke();
    const cap = rrPath(px - 9, y - 50, 18, 11, 4);
    solid(ctx, cap, { x: px - 9, y: y - 50, w: 18, h: 11 }, 'chrome', '#c8d0d6', { depth: 0.05, line: 1.2, formSize: 3 });
  }
  // the napkin dispenser: chrome, napkins showing at its mouth
  stand(x, 96);
  const disp = rrPath(x - 46, y - 70, 92, 70, 8);
  solid(ctx, disp, { x: x - 46, y: y - 70, w: 92, h: 70 }, 'chrome', '#c4ccd2', { depth: 0.05, formSize: 10 });
  ctx.fillStyle = '#fafaf4';
  ctx.fillRect(x - 32, y - 64, 64, 9);
  ctx.fillStyle = 'rgba(120,110,100,0.4)';
  ctx.fillRect(x - 32, y - 56, 64, 1.5);
  // the lamps and the jukebox in its face
  ctx.fillStyle = 'rgba(255,140,210,0.25)';
  ctx.fillRect(x + 20, y - 54, 14, 40);
  // the ketchup: a red squeeze bottle, a white cap
  stand(x + 94, 34);
  const ket = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x + 80, y);
    c.lineTo(x + 80, y - 66);
    c.quadraticCurveTo(x + 80, y - 82, x + 94, y - 84);
    c.quadraticCurveTo(x + 108, y - 82, x + 108, y - 66);
    c.lineTo(x + 108, y);
    c.closePath();
  };
  solid(ctx, ket, { x: x + 80, y: y - 84, w: 28, h: 84 }, 'plastic', '#d01c1c', { depth: 0.05, formSize: 8 });
  const kc = rrPath(x + 89, y - 98, 10, 15, 3);
  solid(ctx, kc, { x: x + 89, y: y - 98, w: 10, h: 15 }, 'plastic', '#f2f0ea', { depth: 0.05, line: 1.2, formSize: 3 });
  void r;
}

/** The blue hour through the window: a cool patch on the booth and the floor (in the still; it fades at nightfall). */
function duskLight(ctx: Ctx): void {
  lightPatch(ctx, [[WIN.x0 + 30, DN.rail + 20], [WIN.x1 + 10, DN.rail + 20], [WIN.x1 + 240, TY], [WIN.x0 + 160, TY]], { col: '#8aa0e8', a: 0.2, barsU: [0.5], bar: 0.03, soft: 16, fade: 0.7 });
}

/** The lightning's light thrown through the window across the booth and the floor (live only, added in a flash). */
function stormLight(ctx: Ctx): void {
  lightPatch(ctx, [[WIN.x0 + 30, DN.rail + 20], [WIN.x1 + 10, DN.rail + 20], [WIN.x1 + 300, TY], [WIN.x0 + 200, TY]], { col: '#b8c8ff', a: 0.55, barsU: [0.5], bar: 0.025, soft: 10, fade: 0.5 });
  glowAt(ctx, (WIN.x0 + WIN.x1) / 2, (WIN.y0 + WIN.y1) / 2, 380, '#a8b8ff', 0.25, 0.8);
}

function grade(ctx: Ctx): void {
  gradeAll(ctx, 0.02, '#c8a0ff', 0.05, { warm: '#ffc27a', cool: '#4a6ad0', a: 0.22 });
}

function shadeOver(ctx: Ctx): void {
  calmLanes(ctx, 0.12, '#0a1418', 80, 640);
  vignetteAll(ctx, 0.55, '#04080c');
}

// ——— the stack ———

const PIZZA_BOX = { x: DN.pizza.x - 330, y: DN.pizza.y - 116, w: 660, h: 250 };
const NOFEET_BOX = { x: DN.nofeet.x - 120, y: DN.nofeet.y - 120, w: 240, h: 240 };
const OPEN_BOX = { x: DN.open.x - 150, y: DN.open.y - 90, w: 300, h: 180 };
const LAMP_BOX = (x: number) => ({ x: x - 50, y: DN.ceil - 6, w: 100, h: DN.lampY + 90 - DN.ceil + 6 });
const JUKE_BOX = { x: JK.x0 - 170, y: JK.top - 20, w: JK.w + 200, h: JK.y1 - JK.top + 56 };
const JUKE_LIT = { x: JK.x0 - 40, y: JK.top - 40, w: JK.w + 80, h: JK.y1 - JK.top + 40 };
const WINDOW_BOX = { x: WIN.x0 - 34, y: WIN.y0 - 30, w: WIN.x1 - WIN.x0 + 78, h: WIN.y1 - WIN.y0 + 74 };
const LAMP_GLOW_BOX = { x: DN.lamps[0] - 150, y: DN.lampY - 100, w: DN.lamps[1] - DN.lamps[0] + 300, h: 300 };

export const DINER: SceneSpec = {
  id: 'diner',
  info: {
    name: "Neon Diner '86",
    subtitle: 'Waves 16–19',
    ambient: [],
    glows: [
      { x: DN.pizza.x, y: DN.pizza.y, r: 360, color: '#3ae8ff', flicker: 0.2 },
      { x: DN.nofeet.x, y: DN.nofeet.y, r: 200, color: '#ff4a6a', flicker: 0.3 },
      { x: JK.x, y: JK.cy, r: 240, color: '#ff7ad9', flicker: 0.25 },
    ],
    light: '#e6b8ff',
    tableTint: '#f0f0ff',
  },
  layers: [
    { id: 'wall', box: { x: 0, y: 0, w: W, h: DN.rail + 4 }, draw: wall },
    { id: 'tiles', box: { x: 0, y: DN.rail, w: W, h: DN.floorTop - DN.rail }, draw: tiles },
    { id: 'rail', box: { x: 0, y: DN.rail - 10, w: W, h: 44 }, draw: (c) => rail(c) },
    { id: 'lampGlow', box: LAMP_GLOW_BOX, stillOnly: true, draw: (c) => lampGlowStill(c) },
    { id: 'street', box: WIN_BOX, draw: (c, r) => street(c, r, 'dusk') },
    { id: 'streetNight', box: WIN_BOX, liveOnly: true, res: 0.75, draw: (c, r) => street(c, r, 'night') },
    { id: 'streetStorm', box: WIN_BOX, liveOnly: true, res: 0.75, draw: (c, r) => street(c, r, 'storm') },
    // rain beyond the glass, splashes, lightning; drops on the glass
    { id: 'weather', box: WIN_BOX, motion: 'slot', draw: () => {} },
    { id: 'mist', box: WIN_BOX, liveOnly: true, res: 0.5, draw: condensation },
    { id: 'window', box: WINDOW_BOX, draw: windowFrame },
    { id: 'openTubes', box: OPEN_BOX, draw: (c) => openSign(c, false) },
    { id: 'openLit', box: OPEN_BOX, stillOnly: true, draw: (c) => openSign(c, true) },
    { id: 'pizzaTubes', box: { x: PIZZA_BOX.x, y: DN.ceil, w: PIZZA_BOX.w, h: PIZZA_BOX.y + PIZZA_BOX.h - DN.ceil }, draw: (c) => pizzaBoard(c) },
    { id: 'pizzaLit', box: PIZZA_BOX, stillOnly: true, draw: (c) => pizzaLetters(c, [1, 1, 1, 1, 1], 1) },
    { id: 'nofeetTubes', box: NOFEET_BOX, draw: (c) => noFeet(c, 0) },
    { id: 'nofeetLit', box: NOFEET_BOX, stillOnly: true, draw: (c) => noFeet(c, 1) },
    { id: 'booths', box: { x: 200, y: DN.boothTop - 30, w: 1480, h: DN.floorTop - DN.boothTop + 64 }, draw: (c, r) => DN.booths.forEach(([a, b]) => booth(c, r, a, b)) },
    { id: 'floor', box: { x: 0, y: DN.floorTop, w: W, h: TY - DN.floorTop + 2 }, draw: floor },
    { id: 'juke', box: JUKE_BOX, draw: jukebox },
    { id: 'jukeLit', box: JUKE_LIT, stillOnly: true, draw: (c) => jukeLitStill(c) },
    { id: 'lampL', box: LAMP_BOX(DN.lamps[0]), motion: 'sprite', draw: (c) => lamp(c, DN.lamps[0]) },
    { id: 'lampR', box: LAMP_BOX(DN.lamps[1]), motion: 'sprite', draw: (c) => lamp(c, DN.lamps[1]) },
    { id: 'counter', box: { x: 0, y: TY, w: W, h: 1080 - TY }, draw: counter },
    { id: 'dusk', box: { x: 60, y: DN.rail, w: 860, h: TY - DN.rail + 20 }, motion: 'sprite', res: 0.33, draw: (c) => duskLight(c) },
    { id: 'stormLight', box: { x: 0, y: 0, w: 1000, h: TY + 20 }, liveOnly: true, res: 0.33, draw: (c) => stormLight(c) },
    { id: 'counterProps', box: PROPS_BOX, draw: counterProps },
    { id: 'fx', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

// ——— live ———

/** A crowned splash on wet asphalt (frame i of n, played once): the crown rising and falling back, a ring spreading.
 * Paints into a w×h frame, the drop's impact at (w/2, h - 4). */
function splashFrame(c: Ctx, w: number, h: number, u: number): void {
  const cx = w / 2;
  const cy = h - 4;
  const ring = 2 + u * w * 0.42;
  c.strokeStyle = `rgba(220,230,255,${(0.7 * (1 - u)).toFixed(3)})`;
  c.lineWidth = 1;
  c.beginPath();
  c.ellipse(cx, cy, ring, ring * 0.22, 0, 0, P2);
  c.stroke();
  if (u < 0.7) {
    const k = u / 0.7;
    const hgt = Math.sin(k * Math.PI) * h * 0.75;
    const spread = 2 + k * w * 0.25;
    c.strokeStyle = `rgba(230,238,255,${(0.85 * (1 - k * 0.6)).toFixed(3)})`;
    c.lineWidth = 1.2;
    for (const s of [-1, -0.45, 0.45, 1]) {
      c.beginPath();
      c.moveTo(cx + s * 1.5, cy);
      c.quadraticCurveTo(cx + s * spread * 0.6, cy - hgt * 0.9, cx + s * spread, cy - hgt * (1 - Math.abs(s) * 0.2) + k * 6);
      c.stroke();
      c.fillStyle = `rgba(240,244,255,${(0.9 * (1 - k)).toFixed(3)})`;
      c.beginPath();
      c.arc(cx + s * spread, cy - hgt * (1 - Math.abs(s) * 0.2) + k * 6 - 1, 1.1, 0, P2);
      c.fill();
    }
  }
}

/** One frame of rain beyond the glass (phase 0…1 loops vertically): fine slanting streaks at two depths. w×h. */
function rainFrame(c: Ctx, w: number, h: number, ph: number, seed: number): void {
  let s = seed;
  const rr = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 90; i++) {
    const near = i % 3 === 0;
    const x = rr() * (w + 40);
    const y0 = rr() * h;
    const len = near ? 22 + rr() * 14 : 10 + rr() * 8;
    const a = near ? 0.6 + rr() * 0.35 : 0.32 + rr() * 0.22;
    const y = (y0 + ph * h * (near ? 2 : 1)) % h;
    for (const dy of [0, -h]) {
      const yy = y + dy;
      const g = c.createLinearGradient(0, yy - len, 0, yy);
      g.addColorStop(0, 'rgba(200,215,255,0)');
      g.addColorStop(1, `rgba(225,235,255,${a.toFixed(3)})`);
      c.strokeStyle = g;
      c.lineWidth = near ? 1.6 : 1;
      c.beginPath();
      c.moveTo(x - len * 0.22, yy - len);
      c.lineTo(x, yy);
      c.stroke();
    }
  }
}

registerKitScene(DINER, (k: KitLive, wave0) => {
  const fx = k.slot('fx');
  const weather = k.slot('weather');
  const night = k.sprite('streetNight');
  const storm = k.sprite('streetStorm');
  const mist = k.sprite('mist');
  const C = Phaser.Display.Color;
  const clamp = Phaser.Math.Clamp;
  // the room's colour: cooler and dimmer in the storm (first in the top layer, so the lights stay lit over it)
  const cool = k.wash(0x7a8ac8, 0, Phaser.BlendModes.MULTIPLY, fx);
  // as the night comes on the room's ends and the ceiling fall into the dark first, the middle (under the pendants
  // and the sign) holding its light: a small soft texture drawn up over the room
  const gloomKey = k.tex('dn_gloom', 96, 54, (c) => {
    c.fillStyle = '#3a3458';
    c.fillRect(0, 0, 96, 54);
    c.save();
    c.translate(50, 22);
    c.scale(1.7, 1);
    const g = c.createRadialGradient(0, 0, 2, 0, 0, 30);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(236,230,244,1)');
    g.addColorStop(1, 'rgba(58,52,88,1)');
    c.fillStyle = g;
    c.fillRect(-60, -40, 120, 80);
    c.restore();
  });
  const gloom = k.img(gloomKey, 0, 0, { into: fx, origin: [0, 0], scale: 20, alpha: 0 });
  gloom.setBlendMode(Phaser.BlendModes.MULTIPLY);
  const stormLit = k.sprite('stormLight').setBlendMode(Phaser.BlendModes.ADD);
  const dusk = k.sprite('dusk').setBlendMode(Phaser.BlendModes.ADD);

  // ——— hero: the neon ———
  // the sign lit but for its tired Z, and the Z painted in its states: full, dim, the violet of a dying tube, a
  // surge (dark is simply not shown)
  const pb = PIZZA_BOX;
  const signKey = k.tex('dn_sign', pb.w, pb.h, (c) => {
    c.translate(-pb.x, -pb.y);
    pizzaLetters(c, [1, 1, 1, -1, 1], 1);
  });
  const sign = k.img(signKey, pb.x, pb.y, { into: fx, add: true, origin: [0, 0] });
  const tb = tiredBox();
  // (the last state: a failing tube lit only near its electrodes, the gas glowing violet at the ends)
  const Z_STATES = [1, 0.5, 0.16, 1.6, -2];
  const zKey = sheet(k, 'dn_z', tb.w, tb.h, Z_STATES.length, (c, _ph, i) => {
    c.translate(-tb.x, -tb.y);
    if (Z_STATES[i] !== -2) return pizzaLetters(c, [-1, -1, -1, Z_STATES[i], -1], -1);
    // the violet glow fading out towards the middle of the tube (a soft mask, not a cut; the dark tube is the base's)
    const [lc, lg] = makeCanvas(tb.w, tb.h);
    lg.translate(-tb.x, -tb.y);
    pizzaLetters(lg, [-1, -1, -1, 0.8, -1], -1, '#c27aff');
    lg.setTransform(1, 0, 0, 1, 0, 0);
    lg.globalCompositeOperation = 'destination-in';
    const m = lg.createLinearGradient(0, 0, 0, tb.h);
    const mid = (DN.pizza.y - tb.y) / tb.h;
    m.addColorStop(0, 'rgba(0,0,0,1)');
    m.addColorStop(mid - 0.12, 'rgba(0,0,0,0.9)');
    m.addColorStop(mid + 0.02, 'rgba(0,0,0,0.05)');
    m.addColorStop(mid + 0.16, 'rgba(0,0,0,0.6)');
    m.addColorStop(1, 'rgba(0,0,0,0.8)');
    lg.fillStyle = m;
    lg.fillRect(0, 0, tb.w, tb.h);
    c.drawImage(lc, tb.x, tb.y);
  });
  const zImg = k.img(zKey, tb.x, tb.y, { into: fx, add: true, origin: [0, 0] }).setFrame(0);
  const signGlow = k.glow(DN.pizza.x, DN.pizza.y + 10, 380, 0x3ae8ff, 0.1, { into: fx, sy: 0.5 });
  const nf = NOFEET_BOX;
  const nofeetKey = k.tex('dn_nofeet', nf.w, nf.h, (c) => {
    c.translate(-nf.x, -nf.y);
    noFeet(c, 1);
  });
  const nofeet = k.img(nofeetKey, nf.x, nf.y, { into: fx, add: true, origin: [0, 0] });
  const ob = OPEN_BOX;
  const openKey = k.tex('dn_open', ob.w, ob.h, (c) => {
    c.translate(-ob.x, -ob.y);
    openSign(c, true);
  });
  const openA = k.img(openKey, ob.x, ob.y, { into: fx, add: true, origin: [0, 0] });
  // the Z's mood: a script of stutters (each a list of [state, seconds]; state -1 is dark)
  type Beat = [number, number];
  const STUTTERS: Beat[][] = [
    [[1, 0.06], [-1, 0.08], [2, 0.1], [-1, 0.05], [1, 0.4], [2, 0.08], [1, 0.1]],
    [[4, 0.35], [-1, 0.1], [4, 0.25], [2, 0.12], [4, 0.4], [3, 0.05], [0, 0.1]],
    [[2, 0.25], [-1, 0.18], [2, 0.12], [-1, 0.6], [3, 0.05], [0, 0.1]],
    [[1, 0.5], [2, 0.08], [1, 0.12], [2, 0.08], [0, 0.1]],
  ];
  let beats: Beat[] = [];
  let beatT = 0;
  let nextStutter = 2 + crand() * 3;
  let buzz = 0;
  /** The power: 1 normal, dipping in the storm when lightning strikes close. */
  let power = 1;
  let dip = 0;
  // sparks from the Z's electrode: bright, streaked, bouncing on the chair rail
  const sparks = new Parts(k, { frame: 'spark', add: true, into: fx, max: 50 });
  // the arc itself: a hot flash at the electrode
  const arcGlow = k.glow(tb.ex, tb.ey, 70, 0xfff4d0, 0, { into: fx });
  let arc = 0;
  const sparkBurst = (n: number) => {
    for (let i = 0; i < n; i++)
      sparks.spawn({ x: tb.ex + (crand() - 0.5) * 6, y: tb.ey, vx: (crand() - 0.3) * 260, vy: -60 - crand() * 200, life: 0.8 + crand() * 0.6, r0: 14 + crand() * 8, r1: 4, a: 1, tint: crand() < 0.5 ? 0xfff0c0 : 0xffd070, grav: 1100, drag: 0.4, floor: DN.rail - 4, bounce: 0.35, streak: 0.02, fade: 0.02 });
  };

  // ——— hero: the rain ———
  const wb = WIN_BOX;
  // beyond the glass: two depths of painted streaks looping (half size, drawn up)
  const RN = 10;
  const rainKey = sheet(k, 'dn_rain', wb.w / 2, wb.h / 2, RN, (c, ph) => {
    c.scale(0.5, 0.5);
    rainFrame(c, wb.w, wb.h, ph, 91);
  });
  const rain = new Loop(k, rainKey, RN, wb.x, wb.y, { into: weather, origin: [0, 0], scale: 2, fps: 12 });
  const rain2 = new Loop(k, rainKey, RN, wb.x + wb.w, wb.y, { into: weather, origin: [0, 0], scale: 2, fps: 9, phase: 5 });
  rain2.each((im) => im.setFlipX(true).setOrigin(0, 0).setPosition(wb.x, wb.y));
  // the nearest rain: heavier drops falling past close to the glass (shaped streaks, kept inside the window)
  const drops = new Parts(k, { frame: 'drop', into: weather, max: 70 });
  const dropRate = new Rate();
  // crowned splashes on the asphalt
  const SN = 8;
  const splashKey = sheet(k, 'dn_splash', 28, 18, SN, (c, ph) => splashFrame(c, 28, 18, ph));
  const splashes = Array.from({ length: 10 }, () => ({ img: k.img(splashKey, 0, 0, { into: weather, origin: [0.5, 1] }).setVisible(false), t: -1 }));
  const splashRate = new Rate();
  // the lightning: painted forks over the roofs (variants), the glass flashing, the room lit blue for an instant
  const BW = 150;
  const BH = ROOF - WIN.y0 + 20;
  const boltKey = sheet(k, 'dn_bolt', BW, BH, 3, (c, _ph, i) => {
    // (painted at twice the size and drawn down: a finer channel)
    c.scale(0.5, 0.5);
    boltFrame(c, BW * 2, BH * 2, i + 3);
  });
  const boltImg = k.img(boltKey, 0, WIN.y0, { into: weather, add: true, origin: [0.5, 0] }).setAlpha(0);
  const flash = k.sc.add.rectangle(wb.x + wb.w / 2, wb.y + wb.h / 2, wb.w, wb.h, 0xdce6ff, 1).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
  weather.add(flash);
  // on the glass (in front of the street, under the mist and the frame): beads, and drips that run, catch and run
  const beads = k.img(k.tex('dn_beads', wb.w / 2, wb.h / 2, (c) => {
    let s = 93;
    const rr = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 220; i++) {
      const x = rr() * wb.w / 2;
      const y = rr() * wb.h / 2;
      const sz = 0.6 + rr() * rr() * 2.6;
      // a lens: dark rim on its lower side, the room's light caught on top
      c.fillStyle = 'rgba(10,14,24,0.35)';
      c.beginPath();
      c.arc(x, y + sz * 0.2, sz, 0, P2);
      c.fill();
      const g = c.createRadialGradient(x, y, 0, x, y, sz);
      g.addColorStop(0, 'rgba(200,215,240,0.25)');
      g.addColorStop(1, 'rgba(200,215,240,0.05)');
      c.fillStyle = g;
      c.beginPath();
      c.arc(x, y, sz, 0, P2);
      c.fill();
      c.fillStyle = 'rgba(255,255,255,0.9)';
      c.fillRect(x - sz * 0.4, y - sz * 0.55, Math.max(0.6, sz * 0.45), Math.max(0.6, sz * 0.35));
    }
  }), wb.x, wb.y, { into: weather, origin: [0, 0], scale: 2, alpha: 0 });
  const headKey = k.tex('dn_head', 12, 14, (c) => {
    c.fillStyle = 'rgba(8,12,24,0.45)';
    c.beginPath();
    c.ellipse(6, 8, 4.5, 5.2, 0, 0, P2);
    c.fill();
    const g = c.createRadialGradient(5, 6, 0, 6, 7, 5);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.4, 'rgba(190,210,240,0.5)');
    g.addColorStop(1, 'rgba(150,170,210,0.2)');
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(6, 7, 4, 4.8, 0, 0, P2);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,1)';
    c.fillRect(4, 4, 2, 1.5);
  });
  const trailKey = k.tex('dn_trail', 6, 64, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 64);
    g.addColorStop(0, 'rgba(200,220,255,0)');
    g.addColorStop(1, 'rgba(220,235,255,0.4)');
    c.fillStyle = g;
    c.fillRect(2, 0, 2, 64);
  });
  type Drip = { x: number; y: number; y0: number; v: number; hold: number; trail: Phaser.GameObjects.Image; head: Phaser.GameObjects.Image };
  const drips: Drip[] = Array.from({ length: 14 }, () => ({ x: 0, y: -1, y0: 0, v: 0, hold: 0, trail: k.img(trailKey, 0, 0, { into: weather, origin: [0.5, 1], alpha: 0 }), head: k.img(headKey, 0, 0, { into: weather, alpha: 0 }) }));
  const startDrip = (d: Drip, x?: number, y?: number) => {
    d.x = x ?? wb.x + 12 + crand() * (wb.w - 24);
    d.y = d.y0 = y ?? BLIND + 10 + crand() * 90;
    d.v = 0;
    d.hold = 0.2 + crand() * 0.8;
  };

  // ——— hero: the jukebox ———
  const AB = { x: JK.x0 - 12, y: JK.top - 12, w: JK.w + 24, h: ARCH_FOOT - JK.top + 22 };
  const AN = 12;
  const archKey = sheet(k, 'dn_arch', AB.w, AB.h, AN, (c, ph) => {
    c.translate(-AB.x, -AB.y);
    archFrame(c, ph);
  });
  const arch = new Loop(k, archKey, AN, AB.x, AB.y, { into: fx, origin: [0, 0], fps: 6 });
  // (one tube's frames, played on both pilasters out of step)
  const PB = { x: PIL.xs[0] - 2, y: PIL.y0 - 2, w: PIL.w + 4, h: PIL.y1 - PIL.y0 + 4 };
  const pilKey = sheet(k, 'dn_pil', PB.w, PB.h, 12, (c, ph) => {
    c.translate(-PB.x, -PB.y);
    pilasterFrame(c, ph, 0);
  });
  const pils = PIL.xs.map((px, i) => new Loop(k, pilKey, 12, px - 2, PB.y, { into: fx, origin: [0, 0], fps: 8 - i, phase: i * 5 }));
  const RB = { x: REC.x - REC.rx - 6, y: REC.y - REC.ry - 4, w: REC.rx * 2 + 12, h: REC.ry * 2 + 12 };
  const RN2 = 12;
  const recKey = sheet(k, 'dn_rec', RB.w, RB.h, RN2, (c, ph) => {
    c.translate(-RB.x, -RB.y);
    recordFrame(c, ph);
  });
  const record = new Loop(k, recKey, RN2, RB.x, RB.y, { into: fx, origin: [0, 0], fps: 14 });
  const armKey = k.tex('dn_arm', 60, 40, (c) => {
    c.translate(-(ARM.px - 46), -(ARM.py - 10));
    tonearm(c);
  });
  const arm = k.img(armKey, ARM.px, ARM.py, { into: fx, origin: [46 / 60, 10 / 40] });
  const armS = new Spring(0, 60, 6);
  const glassKey = k.tex('dn_dome', JK.dome.r * 2, JK.dome.r + 54, (c) => {
    c.translate(-(JK.x - JK.dome.r), -(JK.dome.cy - JK.dome.r));
    domeGlass(c);
  });
  k.img(glassKey, JK.x - JK.dome.r, JK.dome.cy - JK.dome.r, { into: fx, origin: [0, 0] });
  // its colour wheel: a soft light behind the arch turning through the colours, and its glow on the room
  const wheel = k.glow(JK.x, JK.cy - 20, 150, 0xff7ad9, 0.18, { into: fx });
  const jukeHalo = k.glow(JK.x, JK.cy + 40, 260, 0xff7ad9, 0.12, { into: fx, sy: 0.9 });
  let skip = 0;

  // ——— the pendants ———
  const lamps = DN.lamps.map((x, i) => ({
    x,
    sw: new Swing(k.pivot(k.sprite(i ? 'lampR' : 'lampL'), x, DN.ceil + 4), { k: 7 + i, c: 0.6, idle: 0.006, seed: i * 3 }),
    glow: k.glow(x, DN.lampY + 48, 150, 0xffd890, 0.3, { into: fx }),
    hot: k.glow(x, DN.lampY + 48, 56, 0xfff4dc, 0.35, { into: fx }),
    pool: k.glow(x, DN.lampY + 190, 240, 0xffe4b0, 0.06, { into: fx, sy: 0.9 }),
  }));
  const L = DN.lampY + 48 - (DN.ceil + 4);

  // ——— the light across the stage ———
  let kw = waveK(wave0);
  let shown = kw;
  let bolt = 0;
  let nextBolt = 3;
  const roomFlash = k.wash(0x8aa0ff, 0, Phaser.BlendModes.ADD, fx);
  const strobeOk = () => save.settings.flashes && !save.settings.reducedMotion;

  return {
    setWave: (w) => (kw = waveK(w)),
    impact(x, y, p) {
      for (const l of lamps) l.sw.kick((x < l.x ? 1 : -1) * (1.3 + crand() * 0.5) * p);
      buzz = Math.max(buzz, 0.2 + p * 0.5);
      if (p > 0.6) {
        sparkBurst(12 + Math.round(p * 14));
        arc = 0.12;
      }
      // the needle skips: the arm jumps, the record stutters back a turn
      armS.v -= 3 * p;
      skip = Math.max(skip, 0.25 * p);
      // drops on the glass shaken loose
      let n = Math.round(p * 4);
      for (const d of drips) if (n > 0 && d.y < 0 && shown > 0.25) {
        startDrip(d);
        d.hold = 0;
        n--;
      }
      void y;
    },
    update(dt, t) {
      shown += (kw - shown) * Math.min(1, dt * 0.6);
      const nightK = clamp((shown - 0.12) / 0.3, 0, 1);
      const wet = clamp(shown * 1.5 - 0.3, 0, 1);
      const stormK = clamp((shown - 0.72) / 0.28, 0, 1);
      night.setAlpha(Phaser.Math.Easing.Sine.InOut(nightK));
      storm.setAlpha(stormK);
      mist.setAlpha(clamp((shown - 0.45) / 0.4, 0, 1) * 0.9);
      cool.setAlpha(clamp((shown - 0.45) / 0.55, 0, 1) * 0.16 + stormK * 0.18);
      gloom.setAlpha(Math.min(1, nightK * 0.7 + stormK * 0.3));
      dusk.setAlpha(1 - nightK);

      // ——— lightning and the power dipping with it
      nextBolt -= dt;
      if (stormK > 0.6 && nextBolt < 0) {
        bolt = 0.55;
        nextBolt = 5 + crand() * 7;
        boltImg.setFrame(Math.floor(crand() * 3)).setPosition(wb.x + 70 + crand() * (wb.w - 140), WIN.y0).setFlipX(crand() < 0.5);
        if (crand() < 0.6) dip = 0.5 + crand() * 0.4;
        for (const l of lamps) l.sw.kick(0.05);
      }
      bolt = Math.max(0, bolt - dt);
      const fl = bolt > 0 ? (bolt > 0.45 || (bolt > 0.25 && bolt < 0.32) ? 1 : 0.25) : 0;
      boltImg.setAlpha(fl * (save.settings.flashes ? 1 : 0.5));
      flash.setAlpha(fl * (save.settings.flashes ? 0.5 : 0.15));
      roomFlash.setAlpha(fl * (save.settings.flashes ? 0.04 : 0));
      stormLit.setAlpha(fl * (save.settings.flashes ? 0.9 : 0.25));
      dip = Math.max(0, dip - dt);
      // (the power sags while the dip lasts, with a brownout shimmer)
      power = dip > 0 ? 0.45 + 0.25 * Math.abs(Math.sin(t * 40)) * (strobeOk() ? 1 : 0.3) : Math.min(1, power + dt * 2);

      // ——— the neon
      nextStutter -= dt;
      if (nextStutter < 0 && beats.length === 0) {
        beats = STUTTERS[Math.floor(crand() * STUTTERS.length)].map((b) => [b[0], b[1]] as Beat);
        beatT = beats[0][1];
        nextStutter = 4 + crand() * 7;
      }
      let z = 0;
      if (beats.length) {
        beatT -= dt;
        if (beatT <= 0) {
          beats.shift();
          if (beats.length) beatT = beats[0][1];
        }
        z = beats.length ? beats[0][0] : 0;
        if (!strobeOk() && z !== -1) z = Math.min(z, 1);
      }
      buzz = Math.max(0, buzz - dt);
      if (buzz > 0 && strobeOk() && Math.sin(t * 60) > 0.3) z = 2;
      if (dip > 0) z = dip > 0.3 ? -1 : 2;
      zImg.setVisible(z !== -1);
      if (z !== -1) zImg.setFrame(z);
      const hum = (0.96 + Math.sin(t * 2.3) * 0.03) * power;
      const sb = buzz > 0 && strobeOk() ? 0.75 + 0.25 * Math.sin(t * 90) : 1;
      sign.setAlpha(hum * sb);
      zImg.setAlpha(hum);
      nofeet.setAlpha(hum * (buzz > 0 && strobeOk() && Math.sin(t * 50 + 1) > 0.6 ? 0.4 : 1));
      openA.setAlpha((0.92 + Math.sin(t * 1.7) * 0.05) * power);
      signGlow.setAlpha((0.1 + Math.sin(t * 1.3) * 0.012) * (z === -1 ? 0.8 : 1) * power * sb);
      sparks.update(dt);
      arc = Math.max(0, arc - dt);
      arcGlow.setAlpha(arc > 0 ? (strobeOk() ? 0.9 : 0.4) * (0.6 + 0.4 * Math.sin(t * 80)) : 0);

      // ——— the rain
      rain.alpha = wet * 0.85;
      rain.step(dt, 0.8 + wet * 0.6);
      rain2.alpha = wet * wet * 0.6;
      rain2.step(dt, 0.9 + wet * 0.5);
      for (const im of [rain.a, rain.b, rain2.a, rain2.b]) im.setVisible(wet > 0.01);
      dropRate.tick(wet * wet * 110 * calm(), dt, () => {
        const vy = 900 + crand() * 300;
        drops.spawn({ x: wb.x + 20 + crand() * (wb.w - 40), y: wb.y, vx: -110 - stormK * 80, vy, life: 0.5, r0: 3.2, a: 0.4 + crand() * 0.25, tint: 0xd8e2ff, streak: 0.035, floor: WIN.y1 - 6 - crand() * 30, fade: 0.01 });
      });
      drops.update(dt);
      splashRate.tick(wet * 14 * calm(), dt, () => {
        const s = splashes.find((q) => q.t < 0);
        if (!s) return;
        s.t = 0;
        const yy = STREET + 6 + crand() * (WIN.y1 - STREET - 8);
        s.img.setPosition(wb.x + 10 + crand() * (wb.w - 20), yy).setScale(1 + (yy - STREET) / 30).setVisible(true);
      });
      for (const s of splashes) {
        if (s.t < 0) continue;
        s.t += dt;
        const u = s.t / 0.35;
        if (u >= 1) {
          s.t = -1;
          s.img.setVisible(false);
        } else s.img.setFrame(Math.min(SN - 1, Math.floor(u * SN))).setAlpha(0.9 * wet);
      }
      beads.setAlpha(clamp(wet * 1.5 - 0.15, 0, 0.95));
      for (const d of drips) {
        if (d.y < 0) {
          if (crand() < dt * wet * 0.5) startDrip(d);
          d.trail.setAlpha(0);
          d.head.setAlpha(0);
          continue;
        }
        // run, catch on the glass, gather, break loose again
        d.hold -= dt;
        d.v = d.hold > 0 ? Math.max(0, d.v - dt * 400) : Math.min(160, d.v + dt * 280);
        if (d.hold < -0.3 - crand() * 0.8) d.hold = 0.15 + crand() * 0.5;
        d.y += d.v * dt * calm();
        d.x += Math.sin(d.y * 0.07 + d.y0) * 0.12;
        const run = d.y - d.y0;
        d.head.setPosition(d.x, d.y).setAlpha(0.85).setScale(1, 1 + Math.min(0.4, d.v / 300));
        d.trail.setPosition(d.x, d.y - 3).setScale(1, Math.min(3, run / 64)).setAlpha(0.55);
        if (d.y > WIN.y1 - 4) d.y = -1;
      }

      // ——— the jukebox
      const jp = power * (skip > 0 && strobeOk() ? 0.6 + 0.4 * Math.abs(Math.sin(t * 30)) : 1);
      arch.alpha = jp;
      arch.step(dt);
      for (const p of pils) {
        p.alpha = jp;
        p.step(dt);
      }
      skip = Math.max(0, skip - dt);
      record.step(dt, skip > 0 ? -1.5 : power < 0.8 ? 0.6 : 1);
      arm.rotation = armS.step(0, dt) * 0.12;
      const hue = (t * 0.05) % 1;
      const hc = C.HSVToRGB(hue, 0.55, 1) as Phaser.Types.Display.ColorObject;
      wheel.setTint(C.GetColor(hc.r, hc.g, hc.b)).setAlpha((0.16 + Math.sin(t * 1.1) * 0.03) * jp);
      jukeHalo.setAlpha((0.1 + Math.sin(t * 1.7) * 0.02) * jp);

      // ——— the pendants: swinging on their cords, their light going with them
      for (const l of lamps) {
        l.sw.update(dt, t);
        const a = l.sw.angle;
        const gx = l.x - Math.sin(a) * L;
        const gy = DN.ceil + 4 + Math.cos(a) * L;
        const f = power * (0.97 + flicker(t * 0.2, l.x) * 0.03);
        l.glow.setPosition(gx, gy).setAlpha(0.3 * f + nightK * 0.12);
        l.hot.setPosition(gx, gy).setAlpha(0.35 * f);
        l.pool.setPosition(l.x - Math.sin(a) * 300, DN.lampY + 190).setAlpha((0.06 + nightK * 0.06) * f);
      }
    },
  };
});

void [creviceV, ellPath];
