// The Foundry (the Iron Heel's arena, the end of Act 1's rooftop stage), redrawn with the location kit
// (src/art/scene): the casting shop under the rooftop, at night, in the middle of a pour. Sooty brick bays between
// riveted steel stanchions; a crane girder and the roof truss lost in the smoke overhead; a tall iron-framed window
// in the middle bay looking out on the rooftop's city by night (the same skyline, its windows lit), half its panes
// filmed with soot, a few missing. On the left a geared bottom-pour ladle hangs from the crane's trolley, tipped,
// a white-hot stream falling from its spout into a firebrick pouring basin; the metal runs off along a runner at the
// wall's foot, crusting over as it cools, into a moulding flask by the right-hand stanchion. On the right a steam
// hammer: two cast-iron standards, the lagged cylinder and its valve chest on the cross-head, the tup raised over a
// glowing billet on the anvil. The table is the casting floor's steel plate, scorched and spattered, its front
// edge striped.
// Hero animations: the pour (a painted falling stream, ropes of brighter metal sliding down it, the splash crown in
// the basin, fume rising lit from below, sparks that bounce on the floor, the light on the wall breathing with the
// flow); the steam hammer's cycle (the tup lifts on steam, hangs, slams onto the billet: a flash, a burst of
// sparks and burning scale that bounce away, steam spat from the drain cocks, exhaust from the stack at the top
// of the stroke, grit off the cross-head, the hanging chain jolted); the runner flowing under a cooling crust,
// and heat shimmer over the basin and the billet (the wall seen through the hot air, wavering). A stomp swings
// the ladle and the chain, surges the pour (a spurt of sparks) and shakes grit off the girder.

import Phaser from 'phaser';
import { ZB, xAt, yAt, zAt } from '../../art/backdrops';
import {
  type Ctx,
  type PathFn,
  type R,
  LIGHT,
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
  haze,
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
import { aoHalo, shaft } from '../../art/scene/light';
import { bricks, grain, tableFalloff, tableSeam, woodGrain } from '../../art/scene/materials';
import { chips, drift, grime, lay, noiseMask, softly, streaks } from '../../art/scene/paint';
import { hang } from '../../art/scene/props';
import { horizonGlow, skyFill, stars } from '../../art/scene/sky';
import { metalPlane, rivet } from '../../art/scene/surfaces';
import { makeCanvas, mix, rgba, shade } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { save } from '../../systems/save';
import { type KitLive, calm, flicker, registerKitScene, wander } from '../../game/sceneLive';
import { Loop, Parts, Rate, Swing, sheet, steamFrame } from '../../game/sceneAnim';
import { Flow } from './liveBits';
import { FAR, blockPath, windowsOf } from './scene-rooftop';
import { smokeFrame } from './sceneBits';

// ——— layout ———

export const FD = {
  /** The table's front edge, and the casting floor at the wall's foot (behind the table). */
  front: 1036,
  floor: 746,
  /** The roof truss's bottom chord and the crane girder under it. */
  roof: 96,
  girder: { y0: 104, y1: 152 },
  /** The steel stanchions (centre x). */
  cols: [40, 640, 1280, 1880] as const,
  colW: 54,
  /** The middle bay's window: a segmental arch springing at `spring`, its crown at `crown`. */
  win: { x0: 770, x1: 1150, crown: 206, spring: 270, sill: 556 },
  /** The crane hook (the ladle's hinge) and the ladle's trunnions. */
  hook: { x: 300, y: 214 },
  ladle: { x: 300, y: 372 },
  /** The pouring basin's pool. */
  basin: { x: 458, y: 700 },
  /** The runner: the metal's surface band. */
  runner: { x0: 514, x1: 1326, y: 703, h: 13 },
  flask: { x0: 1332, x1: 1446, y0: 656 },
  /** The steam hammer: its centre, the cylinder, the cross-head, the tup's top (raised) and its drop onto the billet. */
  hammer: { x: 1610, cyl: { x0: 1548, x1: 1672, y0: 84, y1: 292 }, head: 316, tupTop: 316, tupH: 100, drop: 158, die: 592, billet: 574 },
  chain: { x: 1200, y1: 450 },
};

const TILT = 0.4;
const SPOUT: [number, number] = [116, -90];
const rot = (x: number, y: number, a: number): [number, number] => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
/** The spout's lip with the ladle hanging still. */
const LIP0: [number, number] = (() => {
  const [dx, dy] = rot(SPOUT[0], SPOUT[1], TILT);
  return [FD.ladle.x + dx, FD.ladle.y + dy];
})();
/** The lip with the ladle swung by `a` on its hook. */
const lipAt = (a: number): [number, number] => {
  const [dx, dy] = rot(LIP0[0] - FD.hook.x, LIP0[1] - FD.hook.y, a);
  return [FD.hook.x + dx, FD.hook.y + dy];
};

const STEEL = '#464b55';
const IRON = '#3c3e45';
const MOLTEN = { core: '#fffbe8', hot: '#ffe490', body: '#ffa236', edge: '#d8520e', deep: '#7a2206' };

// ——— the night outside (the rooftop's city) ———

const WIN = FD.win;
const ARCH_R = ((WIN.x1 - WIN.x0) / 2) ** 2 / (2 * (WIN.spring - WIN.crown)) + (WIN.spring - WIN.crown) / 2;
const ARCH_CY = WIN.crown + ARCH_R;
const WIN_CX = (WIN.x0 + WIN.x1) / 2;
/** The window's opening (inset grows it: the brick arch round it). */
function winPath(inset = 0, begin = true): PathFn {
  return (c) => {
    const a0 = Math.atan2(WIN.spring - ARCH_CY, WIN.x0 - inset - WIN_CX);
    const a1 = Math.atan2(WIN.spring - ARCH_CY, WIN.x1 + inset - WIN_CX);
    if (begin) c.beginPath();
    c.moveTo(WIN.x0 - inset, WIN.sill);
    c.lineTo(WIN.x0 - inset, WIN.spring);
    c.arc(WIN_CX, ARCH_CY, ARCH_R + inset, a0, a1);
    c.lineTo(WIN.x1 + inset, WIN.sill);
    c.closePath();
  };
}
const WIN_BOX = { x: WIN.x0 - 4, y: WIN.crown - 4, w: WIN.x1 - WIN.x0 + 8, h: WIN.sill - WIN.crown + 8 };

function outside(ctx: Ctx, r: R): void {
  ctx.save();
  winPath(2)(ctx);
  ctx.clip();
  // the rooftop's night: deep blue overhead, the city's glow on the haze low down
  skyFill(ctx, WIN_BOX, [[0, '#0a0e26'], [0.45, '#161c46'], [0.75, '#30295a'], [1, '#5a3a5c']]);
  stars(ctx, r, { x: WIN_BOX.x, y: WIN_BOX.y, w: WIN_BOX.w, h: 170 }, 22);
  horizonGlow(ctx, WIN.sill - 30, 170, '#c46a5a', 0.4);
  // a works chimney across the yard, its smoke leaning off in the night air, lit underneath by the city
  const cx = 1088;
  const stack = polyPath([[cx - 13, WIN.sill], [cx - 9, 318], [cx + 9, 318], [cx + 13, WIN.sill]]);
  ctx.fillStyle = '#1c1830';
  stack(ctx);
  ctx.fill();
  ctx.fillStyle = 'rgba(200,120,110,0.25)';
  ctx.fillRect(cx + 4, 330, 5, WIN.sill - 330);
  softly(ctx, { x: WIN_BOX.x, y: WIN_BOX.y, w: WIN_BOX.w, h: 150 }, (g) => {
    for (let i = 0; i < 9; i++) {
      const u = i / 8;
      g.fillStyle = `rgba(${70 + u * 40},${62 + u * 30},${96 + u * 20},${0.5 - u * 0.35})`;
      g.beginPath();
      g.ellipse(cx - 6 - u * 150, 296 - u * 64, 16 + u * 40, 12 + u * 16, -0.3, 0, Math.PI * 2);
      g.fill();
    }
  });
  // the city: the rooftop's own towers, seen lower from down here, their windows lit
  ctx.save();
  ctx.translate(0, -44);
  const warm = ['#ffd27a', '#ffc060', '#fff0b8', '#a8d0ff'];
  for (const b of FAR) {
    if (b.x + b.w < WIN.x0 - 10 || b.x > WIN.x1 + 10) continue;
    const p = blockPath(b);
    p(ctx);
    ctx.fillStyle = mix(shade(b.col, -0.56), '#3a3260', 0.4);
    ctx.fill();
    within(ctx, p, () => {
      for (const [x, y, w, h, v] of windowsOf(b, Math.round(b.x * 7))) {
        if (v > (x > 830 && x < 1090 ? 0.1 : 0.34)) continue;
        ctx.fillStyle = rgba(warm[Math.floor(v * 10) % 4], 0.5 + v);
        ctx.fillRect(x, y, w, h);
      }
      ctx.fillStyle = rgba('#8a7ab0', 0.3);
      ctx.fillRect(b.x, b.top, b.w, 1.5);
    });
  }
  ctx.restore();
  haze(ctx, 440, WIN.sill - 20, '#6a4a6a', 0.38, 0.8, WIN_BOX.x, WIN_BOX.x + WIN_BOX.w);
  // nearer: the neighbours' roofs across the yard, in silhouette against the haze, a water tank and chimneys as on
  // the rooftop, their edges caught by the moon
  const near = '#141022';
  const roofs: [number, number, number][] = [[WIN.x0 - 10, 500, 120], [WIN.x0 + 110, 520, 140], [WIN.x0 + 250, 492, 150]];
  for (const [rx, ry, rw] of roofs) {
    ctx.fillStyle = near;
    ctx.fillRect(rx, ry, rw, WIN.sill - ry + 10);
    ctx.fillStyle = rgba('#8a9ad8', 0.35);
    ctx.fillRect(rx, ry, rw, 1.5);
    // a lit window or two, low and warm
    if (rx > WIN.x0 + 200) {
      ctx.fillStyle = rgba('#ffc870', 0.55);
      ctx.fillRect(rx + rw - 34, ry + 22, 9, 12);
    }
  }
  // the water tank on its legs, and two chimney pots
  const tx = WIN.x0 + 52;
  ctx.fillStyle = near;
  ctx.fillRect(tx - 2, 470, 3, 32);
  ctx.fillRect(tx + 34, 470, 3, 32);
  ctx.fillRect(tx - 6, 432, 48, 40);
  ctx.beginPath();
  ctx.moveTo(tx - 9, 434);
  ctx.lineTo(tx + 18, 414);
  ctx.lineTo(tx + 45, 434);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgba('#8a9ad8', 0.3);
  ctx.fillRect(tx - 6, 432, 2, 40);
  for (const cx2 of [WIN.x0 + 300, WIN.x0 + 318]) {
    ctx.fillStyle = near;
    ctx.fillRect(cx2, 474, 10, 20);
    ctx.fillStyle = rgba('#8a9ad8', 0.3);
    ctx.fillRect(cx2, 474, 2, 20);
  }
  // the moon, out of sight up to the left, lighting the haze
  glowAt(ctx, WIN.x0 - 20, WIN.crown + 10, 260, '#9ab0ff', 0.16);
  ctx.restore();
}

// ——— the shop ———

const BRICK = ['#4c2c24', '#40261e', '#57342a', '#38211b', '#4a2a20', '#5c3628', '#45281f'];

function wall(ctx: Ctx, r: R): void {
  const box = { x: 0, y: 0, w: W, h: TY };
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, TY);
  winPath(0, false)(ctx);
  ctx.clip('evenodd');
  bricks(ctx, r, box, BRICK, '#2a201c', 64, 24);
  // a century of soot: thickest up under the roof and over the pour, run down in streaks from the girder
  vfill(ctx, 0, 0, W, TY, [[0, 'rgba(10,6,6,0.94)'], [0.25, 'rgba(10,6,6,0.78)'], [0.6, 'rgba(10,6,6,0.62)'], [1, 'rgba(10,6,6,0.5)']]);
  // darker still away from the pour, in the right-hand bays
  const dk = ctx.createLinearGradient(0, 0, W, 0);
  dk.addColorStop(0, 'rgba(8,4,6,0.1)');
  dk.addColorStop(0.3, 'rgba(8,4,6,0)');
  dk.addColorStop(0.55, 'rgba(8,4,6,0.12)');
  dk.addColorStop(1, 'rgba(8,4,6,0.38)');
  ctx.fillStyle = dk;
  ctx.fillRect(0, 0, W, TY);
  lay(ctx, noiseMask(6, 61, { cover: 0.45, soft: 0.25, col: '#0a0606' }), box, 0.45);
  lay(ctx, drift('#7a4a36', '#140c10', 5, 62, 200, 80), box, 0.22);
  streaks(ctx, r, W / 2, FD.girder.y1, W - 120, 240, '#0a0404', 0.2, 34);
  // heat: the brick round the basin baked pale and glazed, a black plume up from it
  const hb = ctx.createRadialGradient(FD.basin.x, FD.floor, 20, FD.basin.x, FD.floor, 260);
  hb.addColorStop(0, rgba('#c88a5a', 0.3));
  hb.addColorStop(1, rgba('#c88a5a', 0));
  ctx.fillStyle = hb;
  ctx.fillRect(FD.basin.x - 260, FD.floor - 260, 520, 260);
  softly(ctx, { x: 120, y: 100, w: 700, h: 640 }, (g) => {
    // the fume has climbed this wall for years: soft blots widening up towards the roof
    for (let i = 0; i < 12; i++) {
      const u = i / 11;
      const cx = FD.basin.x - 20 - u * 60 + Math.sin(i * 1.7) * 30;
      const cy = 600 - u * 460;
      const rr = 60 + u * 150;
      const pg = g.createRadialGradient(cx, cy, 0, cx, cy, rr);
      pg.addColorStop(0, `rgba(8,4,4,${0.12 + u * 0.16})`);
      pg.addColorStop(1, 'rgba(8,4,4,0)');
      g.fillStyle = pg;
      g.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
    }
  });
  // brick values pulled together (a century of soot evens them out), more in the calm middle of the wall
  lay(ctx, noiseMask(9, 66, { cover: 0.55, soft: 0.4, col: '#120a08' }), { x: 0, y: 0, w: W, h: 540 }, 0.35);
  // the light: the pour (the shop's key), warm and big on the left; the runner's glow up the foot of the wall; the
  // billet's glow on the right; all broken by the brick
  lightPool(ctx, FD.basin.x, 580, 600, 460, '#ff7a20', 0.4);
  lightPool(ctx, FD.basin.x + 10, 560, 280, 300, '#ffb060', 0.26);
  const rg = ctx.createLinearGradient(0, FD.floor, 0, 580);
  rg.addColorStop(0, rgba('#ff7a20', 0.26));
  rg.addColorStop(0.45, rgba('#ff7a20', 0.07));
  rg.addColorStop(1, rgba('#ff7a20', 0));
  const rx = ctx.createLinearGradient(FD.runner.x0, 0, FD.runner.x1, 0);
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rg;
  ctx.fillRect(FD.runner.x0 - 40, 580, FD.runner.x1 - FD.runner.x0 + 80, FD.floor - 580);
  // (the runner cools as it goes: less glow downstream)
  ctx.globalCompositeOperation = 'source-over';
  rx.addColorStop(0, 'rgba(10,6,6,0)');
  rx.addColorStop(1, 'rgba(10,6,6,0.25)');
  ctx.fillStyle = rx;
  ctx.fillRect(FD.runner.x0, 580, FD.runner.x1 - FD.runner.x0, FD.floor - 580);
  lightPool(ctx, FD.hammer.x, FD.hammer.billet + 20, 280, 180, '#ff7a2a', 0.24);
  // the air: warm and thick round the pour, a cool night haze gathering in the far bay; brick tone wandering at the
  // edges of the wall (the calm middle left even)
  const air = (cx: number, cy: number, rr: number, col: string, a: number) => {
    const ag = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr);
    ag.addColorStop(0, rgba(col, a));
    ag.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = ag;
    ctx.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
  };
  air(FD.basin.x, 520, 440, '#ff9a50', 0.1);
  air(1800, 360, 380, '#34427a', 0.16);
  air(120, 330, 300, '#8a5038', 0.12);
  air(220, 640, 220, '#1a0c0a', 0.25);
  air(1790, 620, 240, '#7a4430', 0.08);
  air(1500, 230, 260, '#120a0a', 0.2);
  // where the floor meets the wall
  crevice(ctx, 0, W, FD.floor, -50, 0.5, '#0a0404');
  ctx.restore();
  // the casting floor at the foot of the wall: trodden sand and cinders
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, FD.floor, W, TY - FD.floor + 2);
  ctx.clip();
  vfill(ctx, 0, FD.floor, W, TY - FD.floor + 2, [[0, '#1c1210'], [1, '#2c1c16']]);
  lay(ctx, noiseMask(40, 64, { cover: 0.4, soft: 0.1, col: '#0c0806', w: 480, h: 12 }), { x: 0, y: FD.floor, w: W, h: TY - FD.floor + 2 }, 0.6);
  const fg = ctx.createRadialGradient(FD.basin.x, FD.floor, 0, FD.basin.x, FD.floor, 500);
  fg.addColorStop(0, rgba('#ff9a40', 0.35));
  fg.addColorStop(1, rgba('#ff9a40', 0));
  ctx.fillStyle = fg;
  ctx.fillRect(0, FD.floor, 1000, 20);
  ctx.restore();
}

function windowFrame(ctx: Ctx, r: R): void {
  // the brick arch over the opening: a ring of headers on end, sooted, the crown's keystone course
  const ring = (c: Ctx) => {
    winPath(30)(c);
    winPath(0, false)(c);
  };
  ctx.save();
  ring(ctx);
  ctx.clip('evenodd');
  const a0 = Math.atan2(WIN.spring - ARCH_CY, WIN.x0 - WIN_CX);
  const a1 = Math.atan2(WIN.spring - ARCH_CY, WIN.x1 - WIN_CX);
  const n = 17;
  for (let i = 0; i < n; i++) {
    const t0 = a0 + ((a1 - a0) * i) / n;
    const t1 = a0 + ((a1 - a0) * (i + 1)) / n;
    const p = (rr: number, t: number): [number, number] => [WIN_CX + Math.cos(t) * rr, ARCH_CY + Math.sin(t) * rr];
    const q = polyPath([p(ARCH_R - 2, t0 + 0.004), p(ARCH_R + 32, t0 + 0.004), p(ARCH_R + 32, t1 - 0.004), p(ARCH_R - 2, t1 - 0.004)]);
    ctx.fillStyle = shade(BRICK[i % BRICK.length], 0.1 + r() * 0.06);
    q(ctx);
    ctx.fill();
  }
  // the jambs: brick quoins up the sides
  for (const [x, dir] of [[WIN.x0 - 30, 1], [WIN.x1, -1]] as const)
    for (let y = WIN.spring, i = 0; y < WIN.sill; y += 24, i++) {
      ctx.fillStyle = shade(BRICK[(i + (dir > 0 ? 0 : 3)) % BRICK.length], 0.08);
      ctx.fillRect(x + (i % 2 ? 0 : dir > 0 ? 0 : 0), y + 1, 30, 22);
    }
  vfill(ctx, WIN.x0 - 40, WIN.crown - 40, WIN.x1 - WIN.x0 + 80, WIN.sill - WIN.crown + 40, [[0, 'rgba(10,6,6,0.62)'], [1, 'rgba(10,6,6,0.32)']]);
  lightPool(ctx, WIN.x0 - 20, WIN.sill, 260, 300, '#ff8a2a', 0.12);
  grain(ctx, { x: WIN.x0 - 40, y: WIN.crown - 40, w: WIN.x1 - WIN.x0 + 80, h: WIN.sill - WIN.crown + 40 }, 'stone', 0.3, 1);
  ctx.restore();
  ctx.strokeStyle = 'rgba(10,6,6,0.6)';
  ctx.lineWidth = 2;
  winPath(30)(ctx);
  ctx.stroke();
  // the glazing: an iron frame of small lights, some clear, some filmed over with soot, a few broken or gone;
  // the shop's glow reflected in the glass on the left
  const cols = 6;
  const rows = 7;
  const gx = (WIN.x1 - WIN.x0) / cols;
  const gy = (WIN.sill - WIN.spring) / (rows - 1);
  ctx.save();
  winPath(0)(ctx);
  ctx.clip();
  for (let j = -1; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const x = WIN.x0 + i * gx;
      const y = WIN.spring + j * gy;
      const k = r();
      if (k < 0.12 && (i === 0 || i === cols - 1)) {
        // gone: a jag of glass left in the corner
        ctx.fillStyle = rgba('#c8c8e0', 0.22);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + gx * (0.3 + r() * 0.3), y);
        ctx.lineTo(x, y + gy * (0.3 + r() * 0.4));
        ctx.fill();
        continue;
      }
      const mid = i > 0 && i < cols - 1;
      const soot = k > 0.62 || mid ? 0.5 + r() * 0.25 : 0.14 + r() * 0.15;
      ctx.fillStyle = rgba('#1e1410', soot);
      ctx.fillRect(x, y, gx, gy);
      // soot settles thick at the bottom of each light
      vfill(ctx, x, y + gy * 0.55, gx, gy * 0.45, [[0, 'rgba(20,12,10,0)'], [1, rgba('#140c0a', 0.35)]]);
      // the shop's glow in the glass, strongest on the left (the pour's side)
      const warmA = 0.06 + (1 - i / cols) * 0.12 + (k > 0.62 ? 0.06 : 0);
      const wg = ctx.createLinearGradient(x, y, x + gx, y + gy);
      wg.addColorStop(0, rgba('#ff9a50', warmA));
      wg.addColorStop(1, rgba('#ff9a50', warmA * 0.2));
      ctx.fillStyle = wg;
      ctx.fillRect(x, y, gx, gy);
      if (k > 0.9) {
        // a crack across it
        ctx.strokeStyle = rgba('#d8d0e8', 0.35);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + r() * gx, y);
        ctx.lineTo(x + gx * 0.5, y + gy * 0.5);
        ctx.lineTo(x + r() * gx, y + gy);
        ctx.stroke();
      }
    }
  // the bars: dark iron, lit on their left and top edges by the shop
  ctx.fillStyle = '#261c1a';
  for (let i = 1; i < cols; i++) ctx.fillRect(WIN.x0 + i * gx - 3, WIN.crown, 6, WIN.sill - WIN.crown);
  for (let j = 0; j < rows - 1; j++) ctx.fillRect(WIN.x0, WIN.spring + j * gy - 2.5, WIN.x1 - WIN.x0, 5);
  ctx.fillStyle = rgba('#ffa860', 0.16);
  for (let i = 1; i < cols; i++) ctx.fillRect(WIN.x0 + i * gx - 3, WIN.crown, 1.5, WIN.sill - WIN.crown);
  for (let j = 0; j < rows - 1; j++) ctx.fillRect(WIN.x0, WIN.spring + j * gy - 2.5, WIN.x1 - WIN.x0, 1.2);
  // the reveal: the brick returning into the wall, the right side catching the shop's light, the head in shade
  vfill(ctx, WIN.x0, WIN.crown, 16, WIN.sill - WIN.crown, [[0, 'rgba(12,8,8,0.8)'], [1, 'rgba(12,8,8,0.7)']]);
  ctx.fillStyle = rgba('#7a4630', 0.85);
  ctx.fillRect(WIN.x1 - 16, WIN.spring - 30, 16, WIN.sill - WIN.spring + 30);
  ctx.fillStyle = rgba('#ff9a50', 0.18);
  ctx.fillRect(WIN.x1 - 16, WIN.spring - 30, 4, WIN.sill - WIN.spring + 30);
  ctx.restore();
  ctx.strokeStyle = '#120e14';
  ctx.lineWidth = 5;
  winPath(0)(ctx);
  ctx.stroke();
  // the stone sill, its top lit, a drip of soot under it
  const sill = rectPath(WIN.x0 - 40, WIN.sill, WIN.x1 - WIN.x0 + 80, 16);
  castShadow(ctx, sill, 10, 10, 0.55, '#080404');
  solid(ctx, sill, { x: WIN.x0 - 40, y: WIN.sill, w: WIN.x1 - WIN.x0 + 80, h: 16 }, 'stone', '#6a5a50', { depth: 0.2, formSize: 5 });
  ctx.fillStyle = rgba('#ffb070', 0.3);
  ctx.fillRect(WIN.x0 - 40, WIN.sill, WIN.x1 - WIN.x0 + 80, 2);
  // the moonlight through the glass: cool on the sill's top and faintly on the wall under it
  ctx.fillStyle = rgba('#9ab0f0', 0.22);
  ctx.fillRect(WIN.x0 + 20, WIN.sill + 1, WIN.x1 - WIN.x0 - 10, 3);
  lightPool(ctx, WIN_CX + 40, WIN.sill + 50, 200, 50, '#7a90d8', 0.06);
  streaks(ctx, r, WIN_CX, WIN.sill + 16, WIN.x1 - WIN.x0 + 60, 90, '#0a0606', 0.22, 9);
  // the night's cool light falling in through the smoke, faint
  shaft(ctx, r, [WIN.x0 + 20, WIN.crown + 40, WIN.x1 - 20, WIN.crown + 40], [WIN.x0 + 120, TY, WIN.x1 + 160, TY], '#8aa0e0', 0.05, { streaks: 6, motes: 0 });
}

function columns(ctx: Ctx, r: R): void {
  const w = FD.colW;
  for (const cx of FD.cols) {
    const x0 = cx - w / 2;
    const p = rectPath(x0, FD.roof - 10, w, FD.floor - FD.roof + 10);
    castShadow(ctx, p, 16, 18, 0.6, '#080404');
    aoHalo(ctx, p, 26, 0.4, '#080404');
    solid(ctx, p, { x: x0, y: FD.roof, w, h: FD.floor - FD.roof }, 'iron', STEEL, { depth: 0.15, formSize: 14 });
    // the light on it from the pour: the side towards it warm, the far side cool
    const toPour = FD.basin.x > cx ? 1 : -1;
    const d = Math.abs(cx - FD.basin.x);
    within(ctx, p, () => {
      // flanges and the recessed web
      ctx.fillStyle = 'rgba(8,8,12,0.45)';
      ctx.fillRect(x0 + 12, FD.roof, w - 24, FD.floor);
      ctx.fillStyle = rgba('#ffffff', 0.05);
      ctx.fillRect(x0, FD.roof, 3, FD.floor);
      for (let y = FD.girder.y1 + 40; y < FD.floor - 20; y += 56)
        for (const dx of [-21, 21]) rivet(ctx, cx + dx, y, 3, '#5a5e68');
      streaks(ctx, r, cx, FD.girder.y1 + 40, w, 260, '#5a240e', 0.22, 6);
      const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
      const k = Math.max(0.05, 0.5 - d / 1400);
      g.addColorStop(0, rgba('#ff8a30', toPour < 0 ? k : 0.02));
      g.addColorStop(1, rgba('#ff8a30', toPour > 0 ? k : 0.02));
      ctx.fillStyle = g;
      ctx.fillRect(x0, FD.roof, w, FD.floor - FD.roof);
      // heat-blued and scaled low down near the runner
      vfill(ctx, x0, FD.floor - 140, w, 140, [[0, 'rgba(40,30,60,0)'], [1, 'rgba(40,30,60,0.35)']]);
    });
    rim(ctx, p, 0.18, 3, LIGHT.rim);
    // the base plate bolted to the floor, the knee braces up to the girder
    const bp = rectPath(cx - w / 2 - 12, FD.floor - 12, w + 24, 12);
    solid(ctx, bp, { x: cx - w / 2 - 12, y: FD.floor - 12, w: w + 24, h: 12 }, 'iron', shade(STEEL, -0.1), { depth: 0.15, formSize: 4, line: 1.6 });
    for (const dx of [-w / 2 - 6, w / 2 + 6]) rivet(ctx, cx + dx, FD.floor - 6, 3, '#6a6e78');
    groundShadow(ctx, cx + 10, FD.floor, w * 0.9, 6, 0.5, '#080404');
    for (const s of [-1, 1]) {
      if ((cx < 100 && s < 0) || (cx > W - 100 && s > 0)) continue;
      const brace = polyPath([[cx + s * (w / 2), FD.girder.y1 + 64], [cx + s * (w / 2), FD.girder.y1 + 82], [cx + s * (w / 2 + 70), FD.girder.y1], [cx + s * (w / 2 + 52), FD.girder.y1]]);
      castShadow(ctx, brace, 10, 10, 0.5, '#080404');
      solid(ctx, brace, { x: cx - w / 2 - 70, y: FD.girder.y1, w: w + 140, h: 82 }, 'iron', shade(STEEL, -0.06), { depth: 0.15, formSize: 4, line: 1.6 });
    }
  }
}

function roof(ctx: Ctx, r: R): void {
  const { y0, y1 } = FD.girder;
  // the roof up in the smoke: boarding between the purlins, a lattice truss, all but lost; lit from below
  vfill(ctx, 0, 0, W, FD.roof + 10, [[0, '#0a0608'], [1, '#1a100c']]);
  ctx.strokeStyle = '#22181a';
  ctx.lineWidth = 7;
  ctx.beginPath();
  for (let x = -40, i = 0; x < W + 80; x += 120, i++) {
    ctx.moveTo(x, i % 2 ? 14 : FD.roof);
    ctx.lineTo(x + 120, i % 2 ? FD.roof : 14);
  }
  ctx.stroke();
  ctx.fillStyle = '#24191a';
  ctx.fillRect(0, 8, W, 10);
  ctx.fillRect(0, FD.roof - 8, W, 12);
  ctx.fillStyle = rgba('#ff8a40', 0.16);
  ctx.fillRect(0, FD.roof + 2, W, 2);
  haze(ctx, 0, FD.roof + 50, '#2a1a18', 0.6, 0.6);
  lightPool(ctx, FD.basin.x, FD.roof, 520, 90, '#ff7a20', 0.16);
  // the crane girder: a riveted plate girder, its web stiffened every few feet, the rail on top, its bottom
  // flange lit by the glow from below
  const gp = rectPath(-10, y0, W + 20, y1 - y0);
  castShadow(ctx, gp, 18, 20, 0.65, '#080404');
  solid(ctx, gp, { x: 0, y: y0, w: W, h: y1 - y0 }, 'iron', shade(STEEL, -0.04), { depth: 0.2, formSize: 10 });
  within(ctx, gp, () => {
    for (let x = 30; x < W; x += 92) {
      ctx.fillStyle = 'rgba(8,8,12,0.4)';
      ctx.fillRect(x + 4, y0 + 8, 10, y1 - y0 - 16);
      ctx.fillStyle = rgba('#ffffff', 0.06);
      ctx.fillRect(x, y0 + 8, 4, y1 - y0 - 16);
    }
    ctx.fillStyle = 'rgba(8,8,12,0.5)';
    ctx.fillRect(0, y0 + 8, W, 2);
    ctx.fillRect(0, y1 - 10, W, 2);
    streaks(ctx, r, W / 2, y0 + 10, W, 40, '#3a1a0c', 0.2, 30);
    const lg = ctx.createRadialGradient(FD.basin.x, y1, 10, FD.basin.x, y1, 600);
    lg.addColorStop(0, rgba('#ff8a30', 0.3));
    lg.addColorStop(1, rgba('#ff8a30', 0));
    ctx.fillStyle = lg;
    ctx.fillRect(0, y0, W, y1 - y0);
  });
  for (let x = 12; x < W; x += 23) {
    rivet(ctx, x, y0 + 4, 2.2, '#5a5e68');
    rivet(ctx, x, y1 - 5, 2.2, '#5a5e68');
  }
  ctx.fillStyle = rgba('#ffb070', 0.35);
  ctx.fillRect(0, y1 - 2, W, 2);
  // the trolley, under-hung on the girder's bottom flange: wheels, the rope drum, the sheaves the hook hangs from
  const { x } = FD.hook;
  const tr = rrPath(x - 62, y1 - 6, 124, 36, 5);
  castShadow(ctx, tr, 12, 12, 0.55, '#080404');
  solid(ctx, tr, { x: x - 62, y: y1 - 6, w: 124, h: 36 }, 'enamel', '#6e6248', { depth: 0.15, formSize: 8 });
  within(ctx, tr, () => {
    for (let i = -4; i < 8; i++) {
      ctx.fillStyle = 'rgba(16,12,8,0.42)';
      ctx.beginPath();
      ctx.moveTo(x - 62 + i * 20, y1 + 30);
      ctx.lineTo(x - 50 + i * 20, y1 - 6);
      ctx.lineTo(x - 40 + i * 20, y1 - 6);
      ctx.lineTo(x - 52 + i * 20, y1 + 30);
      ctx.fill();
    }
    grime(ctx, { x: x - 62, y: y1 - 6, w: 124, h: 36 }, { top: 10, bottom: 10, a: 0.6, seed: 66, col: '#100a06' });
  });
  for (const dx of [-44, 44]) {
    const wh = ellPath(x + dx, y1 - 6, 11, 11);
    solid(ctx, wh, { x: x + dx - 11, y: y1 - 17, w: 22, h: 22 }, 'iron', '#2e3036', { depth: 0.15, formSize: 4, line: 1.6 });
  }
  // the ropes down to the hook block (which swings with the ladle)
  ctx.strokeStyle = '#2a2a2e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (const dx of [-9, -3, 3, 9]) {
    ctx.moveTo(x + dx, y1 + 28);
    ctx.lineTo(x + dx * 0.9, FD.hook.y + 4);
  }
  ctx.stroke();
  ctx.strokeStyle = rgba('#ffb070', 0.35);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const dx of [-9, -3, 3, 9]) {
    ctx.moveTo(x + dx - 1, y1 + 28);
    ctx.lineTo(x + dx * 0.9 - 1, FD.hook.y + 4);
  }
  ctx.stroke();
}

function pipes(ctx: Ctx, r: R): void {
  // the steam main: lagged, flanged at its joints, hung from the girder, feeding the hammer's valve chest
  const y = 168;
  const x0 = 1716;
  const p = rectPath(x0, y - 13, W - x0 + 10, 26);
  castShadow(ctx, p, 12, 12, 0.55, '#080404');
  solid(ctx, p, { x: x0, y: y - 13, w: W - x0, h: 26 }, 'canvas', '#8a8070', { depth: 0.18, formSize: 10 });
  within(ctx, p, () => {
    for (let xx = x0; xx < W; xx += 14) {
      ctx.fillStyle = 'rgba(30,22,16,0.35)';
      ctx.fillRect(xx, y - 13, 2, 26);
    }
    grime(ctx, { x: x0, y: y - 13, w: W - x0, h: 26 }, { top: 8, bottom: 10, a: 0.7, seed: 69, col: '#1a120c' });
  });
  for (const fx of [1760, 1836]) {
    const f = rrPath(fx - 6, y - 18, 12, 36, 2);
    solid(ctx, f, { x: fx - 6, y: y - 18, w: 12, h: 36 }, 'iron', STEEL, { depth: 0.18, formSize: 4, line: 1.5 });
    hang(ctx, fx, FD.girder.y1, fx, y - 16, 0, '#2a2a30', 3);
  }
  void r;
}

// ——— the runner, basin and flask ———

function runner(ctx: Ctx, r: R): void {
  const { x0, x1, y, h } = FD.runner;
  // a firebrick trough along the wall's foot: its back lip, the channel, its front face
  const back = rectPath(x0 - 6, y - 9, x1 - x0 + 12, 10);
  solid(ctx, back, { x: x0, y: y - 9, w: x1 - x0, h: 10 }, 'stone', '#8a5a44', { depth: 0.15, line: false, formSize: 3 });
  // the metal itself (live: flowing under its crust): hot by the basin, skinned over and darkening downstream
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, MOLTEN.hot);
  g.addColorStop(0.25, MOLTEN.body);
  g.addColorStop(0.7, '#d0500e');
  g.addColorStop(1, '#8a2a0a');
  ctx.fillStyle = g;
  ctx.fillRect(x0, y, x1 - x0, h);
  vfill(ctx, x0, y, x1 - x0, h, [[0, rgba('#fff0b0', 0.35)], [0.5, 'rgba(255,240,176,0)'], [1, 'rgba(60,10,0,0.3)']]);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y, x1 - x0, h);
  ctx.clip();
  // the crust: plates of dark skin with the glow between, thickening downstream
  for (let x = x0; x < x1; x += 10 + r() * 22) {
    const u = (x - x0) / (x1 - x0);
    if (r() > 0.25 + u * 0.75) continue;
    ctx.fillStyle = rgba(mix('#5a2a14', '#2a140c', u), 0.85);
    ctx.beginPath();
    ctx.ellipse(x, y + 3 + r() * (h - 6), 6 + r() * 14, 2.5 + r() * 3, (r() - 0.5) * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  const front = rectPath(x0 - 6, y + h, x1 - x0 + 12, FD.floor - y - h);
  solid(ctx, front, { x: x0, y: y + h, w: x1 - x0, h: FD.floor - y - h }, 'stone', '#6e4030', { depth: 0.15, line: 1.6, formSize: 4 });
  within(ctx, front, () => {
    for (let x = x0 - 6, i = 0; x < x1; x += 46, i++) {
      ctx.fillStyle = 'rgba(20,10,8,0.5)';
      ctx.fillRect(x, y + h, 2, FD.floor - y - h);
      ctx.fillStyle = rgba(BRICK[i % BRICK.length], 0.18);
      ctx.fillRect(x + 2, y + h, 44, FD.floor - y - h);
    }
    vfill(ctx, x0, y + h, x1 - x0, 10, [[0, rgba('#ffa050', 0.4)], [1, 'rgba(255,160,80,0)']]);
    grime(ctx, { x: x0, y: y + h, w: x1 - x0, h: FD.floor - y - h }, { bottom: 14, a: 0.6, seed: 71, col: '#0c0604' });
    // splashes that froze down the face
    for (let i = 0; i < 14; i++) {
      const x = x0 + r() * (x1 - x0);
      ctx.fillStyle = rgba('#3a3236', 0.8);
      ctx.beginPath();
      ctx.ellipse(x, y + h + 3 + r() * 6, 3 + r() * 5, 2 + r() * 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba('#a8a0a0', 0.4);
      ctx.fillRect(x - 2, y + h + 2, 2, 1);
    }
  });
  ctx.fillStyle = rgba('#ffc080', 0.55);
  ctx.fillRect(x0 - 6, y - 9, x1 - x0 + 12, 1.5);
  groundShadow(ctx, (x0 + x1) / 2, FD.floor, (x1 - x0) / 2, 5, 0.5, '#060302');
}

function runnerHeat(ctx: Ctx): void {
  // the heat off the metal: a glow over everything just above it (added: it stays in the base), strongest upstream
  const { x0, x1, y } = FD.runner;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [cx, rx, a] of [[x0 + 120, 320, 0.3], [(x0 + x1) / 2, 520, 0.14], [x1 - 100, 260, 0.08]] as const) {
    ctx.save();
    ctx.translate(cx, y + 4);
    ctx.scale(1, 0.09);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, rgba('#ff8a2a', a));
    g.addColorStop(1, 'rgba(255,138,42,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
    ctx.restore();
  }
  ctx.restore();
}

function basin(ctx: Ctx, r: R): void {
  const { x, y } = FD.basin;
  // a squat firebrick pouring basin, thick-walled, bedded in sand: its dark outer faces, the lit top of its walls,
  // the white-hot pool in the cup, metal splashed and frozen over the lip
  const top = y - 14;
  const x0 = x - 58;
  const x1 = x + 58;
  groundShadow(ctx, x + 22, FD.floor, 82, 9, 0.75, '#050202', 1.6);
  const body = polyPath([[x0, FD.floor], [x0 + 3, top], [x1 - 3, top], [x1, FD.floor]]);
  castShadow(ctx, body, 12, 12, 0.6, '#060302');
  solid(ctx, body, { x: x0, y: top, w: x1 - x0, h: FD.floor - top }, 'stone', '#2e1812', { depth: 0.12, formSize: 14, line: 2.2 });
  within(ctx, body, () => {
    // firebrick courses, the joints dark
    for (let yy = top + 12, i = 0; yy < FD.floor; yy += 13, i++) {
      ctx.fillStyle = 'rgba(12,4,2,0.55)';
      ctx.fillRect(x0, yy, x1 - x0, 1.6);
      for (let xx = x0 + (i % 2 ? 14 : 0); xx < x1; xx += 28) ctx.fillRect(xx, yy, 1.6, 13);
    }
    // the heat in it blooming through the upper half of the walls, hottest at the lip
    const hg = ctx.createRadialGradient(x, top, 4, x, top, 70);
    hg.addColorStop(0, rgba('#ff8a2a', 0.6));
    hg.addColorStop(0.45, rgba('#d8501a', 0.4));
    hg.addColorStop(1, 'rgba(160,40,10,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(x0, top, x1 - x0, 34);
    // round to the right, away from the light; soot low down
    const sg = ctx.createLinearGradient(x0, 0, x1, 0);
    sg.addColorStop(0, rgba('#ffb070', 0.08));
    sg.addColorStop(0.5, 'rgba(0,0,0,0)');
    sg.addColorStop(1, 'rgba(6,2,2,0.45)');
    ctx.fillStyle = sg;
    ctx.fillRect(x0, top, x1 - x0, FD.floor - top);
    grime(ctx, { x: x0, y: top, w: x1 - x0, h: FD.floor - top }, { bottom: 22, a: 0.7, seed: 73, col: '#080302' });
  });
  // the top of its walls: a thick lit rim round the cup
  const rimP = ellPath(x, y, 58, 13);
  solid(ctx, rimP, { x: x0, y: y - 13, w: 116, h: 26 }, 'stone', '#b0704a', { depth: 0.12, formSize: 6, line: 2 });
  within(ctx, rimP, () => {
    const rg = ctx.createRadialGradient(x, y, 30, x, y, 60);
    rg.addColorStop(0, rgba('#ffd090', 0.8));
    rg.addColorStop(1, rgba('#ff9a50', 0.1));
    ctx.fillStyle = rg;
    ctx.fillRect(x0, y - 14, 116, 28);
  });
  // the pool: a crust collar, then the white-hot meniscus
  const pool = ellPath(x, y, 42, 8.5);
  ctx.fillStyle = '#4a1808';
  pool(ctx);
  ctx.fill();
  within(ctx, pool, () => {
    const g = ctx.createRadialGradient(x - 2, y, 2, x, y, 44);
    g.addColorStop(0, MOLTEN.core);
    g.addColorStop(0.45, MOLTEN.hot);
    g.addColorStop(0.8, MOLTEN.body);
    g.addColorStop(1, MOLTEN.edge);
    ctx.fillStyle = g;
    ctx.fillRect(x - 44, y - 10, 88, 20);
  });
  ctx.strokeStyle = rgba('#2a0c04', 0.85);
  ctx.lineWidth = 2.4;
  pool(ctx);
  ctx.stroke();
  // splash frozen on the lip: dark beads and runs with a dull lit top, one still glowing
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (0.05 + r() * 0.9);
    const sx = x + Math.cos(a) * 52 * (r() < 0.5 ? 1 : -1);
    const sy = y + Math.sin(a) * 9;
    ctx.fillStyle = rgba(i === 3 ? '#ff6a1a' : '#2e2424', 0.95);
    ctx.beginPath();
    ctx.ellipse(sx, sy, 3 + r() * 4, 2 + r() * 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(sx - 1.5, sy, 3, 4 + r() * 8);
    ctx.fillStyle = rgba('#c8a898', 0.35);
    ctx.fillRect(sx - 2, sy - 2, 3, 1);
  }
  glowAt(ctx, x, y - 4, 100, '#ffb050', 0.34, 0.5);
}

function flask(ctx: Ctx, r: R): void {
  const { x0, x1, y0 } = FD.flask;
  const w = x1 - x0;
  // a moulding flask: cope over drag, steel boxes pinned together and clamped, rammed sand on top
  groundShadow(ctx, (x0 + x1) / 2 + 18, FD.floor, w * 0.66, 8, 0.75, '#050202', 1.5);
  for (const [ya, yb] of [[y0, 700], [700, FD.floor]] as const) {
    const b = rectPath(x0, ya, w, yb - ya);
    castShadow(ctx, b, 10, 10, 0.5, '#080404');
    solid(ctx, b, { x: x0, y: ya, w, h: yb - ya }, 'iron', '#4a4640', { depth: 0.12, formSize: 8 });
    within(ctx, b, () => {
      ctx.fillStyle = 'rgba(8,8,10,0.45)';
      ctx.fillRect(x0, ya + 6, w, 3);
      grime(ctx, { x: x0, y: ya, w, h: yb - ya }, { bottom: 12, a: 0.5, seed: 75 + ya, col: '#0c0806' });
      const g = ctx.createLinearGradient(x0, 0, x1, 0);
      g.addColorStop(0, rgba('#ff8a30', 0.3));
      g.addColorStop(0.4, rgba('#ff8a30', 0));
      ctx.fillStyle = g;
      ctx.fillRect(x0, ya, w, yb - ya);
    });
    for (const xx of [x0 + 10, x1 - 10]) rivet(ctx, xx, ya + 14, 3, '#6a6660');
  }
  // the lugs and pins at the parting line, a clamp over it
  for (const s of [-1, 1]) {
    const lx = s < 0 ? x0 - 10 : x1;
    const lug = rectPath(lx, 690, 10, 20);
    solid(ctx, lug, { x: lx, y: 690, w: 10, h: 20 }, 'iron', '#3e3a36', { depth: 0.12, formSize: 3, line: 1.4 });
  }
  const cl = polyPath([[x0 + 40, y0 - 4], [x0 + 52, y0 - 4], [x0 + 52, FD.floor - 6], [x0 + 40, FD.floor - 6]]);
  solid(ctx, cl, { x: x0 + 40, y: y0 - 4, w: 12, h: FD.floor - y0 }, 'iron', '#2e2c2a', { depth: 0.12, formSize: 3, line: 1.4 });
  // the sand on top, a riser glowing where the metal has come up through the mould
  ctx.fillStyle = '#4a3a2c';
  ctx.fillRect(x0 + 2, y0 - 3, w - 4, 6);
  lay(ctx, noiseMask(18, 77, { cover: 0.5, soft: 0.1, col: '#1e1812', w: 120, h: 12 }), { x: x0, y: y0 - 3, w, h: 6 }, 0.6);
  // the ingate: the runner's end runs into the mould through a firebrick gate in the flask's side at the parting
  // line, the metal glowing in its throat
  const { y: ry, h: rh } = FD.runner;
  const gate = rrPath(FD.runner.x1 - 4, ry - 10, x0 - FD.runner.x1 + 22, rh + 22, 3);
  castShadow(ctx, gate, 8, 8, 0.5, '#080404');
  solid(ctx, gate, { x: FD.runner.x1 - 4, y: ry - 10, w: x0 - FD.runner.x1 + 22, h: rh + 22 }, 'stone', '#6e4030', { depth: 0.12, formSize: 4, line: 1.6 });
  const throat = rrPath(FD.runner.x1 - 4, ry + 1, x0 - FD.runner.x1 + 16, rh - 2, 3);
  const tg = ctx.createLinearGradient(FD.runner.x1, 0, x0 + 12, 0);
  tg.addColorStop(0, '#d8601a');
  tg.addColorStop(1, '#5a1a08');
  ctx.fillStyle = tg;
  throat(ctx);
  ctx.fill();
  ctx.fillStyle = rgba('#ffc070', 0.5);
  ctx.fillRect(FD.runner.x1 - 4, ry - 10, x0 - FD.runner.x1 + 22, 1.5);
  const riser = ellPath(x1 - 26, y0 - 1, 9, 3);
  ctx.fillStyle = '#ff7a20';
  riser(ctx);
  ctx.fill();
  ctx.fillStyle = rgba('#fff0b0', 0.8);
  ctx.fillRect(x1 - 29, y0 - 2, 5, 1.5);
  glowAt(ctx, x1 - 26, y0 - 4, 40, '#ff8a30', 0.35, 0.6);
  void r;
}

// ——— the steam hammer ———

const HM = FD.hammer;

function hammerFrame(ctx: Ctx, r: R): void {
  const x = HM.x;
  // the foundation: oak baulks on a stone bed
  const fnd = rectPath(x - 170, FD.floor - 26, 340, 26);
  groundShadow(ctx, x + 20, FD.floor, 200, 8, 0.7, '#060302');
  solid(ctx, fnd, { x: x - 170, y: FD.floor - 26, w: 340, h: 26 }, 'wood', '#4a3424', { depth: 0.12, formSize: 6 });
  within(ctx, fnd, () => {
    woodGrain(ctx, r, { x: x - 170, y: FD.floor - 26, w: 340, h: 26 }, '#4a3424', false, 0.5);
    ctx.fillStyle = 'rgba(10,6,4,0.6)';
    ctx.fillRect(x - 170, FD.floor - 13, 340, 1.5);
    grime(ctx, { x: x - 170, y: FD.floor - 26, w: 340, h: 26 }, { top: 6, bottom: 8, a: 0.6, seed: 79, col: '#0c0604' });
  });
  // the two standards: cast-iron A-legs, the upper part straight (the guides), splaying to their feet
  const legs: PathFn[] = [-1, 1].map((s) => {
    const o = (v: number) => x + s * v;
    return polyPath([[o(80), HM.head - 6], [o(48), HM.head - 6], [o(48), 560], [o(110), FD.floor - 26], [o(166), FD.floor - 26], [o(80), 520]]);
  });
  for (const [i, p] of legs.entries()) {
    castShadow(ctx, p, 20, 20, 0.62, '#080404');
    solid(ctx, p, { x: x - 170, y: HM.head, w: 340, h: FD.floor - HM.head }, 'iron', IRON, { depth: 0.12, formSize: 22 });
    const s = i ? 1 : -1;
    within(ctx, p, () => {
      // a cast rib down the middle of each leg
      ctx.strokeStyle = 'rgba(8,8,12,0.5)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x + s * 64, HM.head);
      ctx.lineTo(x + s * 64, 540);
      ctx.lineTo(x + s * 138, FD.floor - 26);
      ctx.stroke();
      ctx.strokeStyle = rgba('#ffffff', 0.08);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + s * 64 - 3, HM.head);
      ctx.lineTo(x + s * 64 - 3, 540);
      ctx.lineTo(x + s * 138 - 3, FD.floor - 26);
      ctx.stroke();
      grime(ctx, { x: x - 170, y: HM.head, w: 340, h: FD.floor - HM.head }, { bottom: 80, a: 0.5, seed: 81 + i, col: '#0c0606' });
      // the billet's glow on the inside faces, the pour's from far off on the left ones
      const g = ctx.createRadialGradient(x, HM.billet, 10, x, HM.billet, 220);
      g.addColorStop(0, rgba('#ff8a30', 0.5));
      g.addColorStop(1, rgba('#ff8a30', 0));
      ctx.fillStyle = g;
      ctx.fillRect(x - 200, HM.billet - 220, 400, 400);
    });
    rim(ctx, p, 0.22, 3, LIGHT.rim);
    for (let yy = HM.head + 30; yy < 520; yy += 50) rivet(ctx, x + s * 74, yy, 3.4, '#5a5c64');
  }
  // the guides the tup slides in: machined faces, oily
  for (const s of [-1, 1]) {
    const gx = s < 0 ? x - 54 : x + 44;
    const gp = rectPath(gx, HM.head, 10, 560 - HM.head);
    solid(ctx, gp, { x: gx, y: HM.head, w: 10, h: 560 - HM.head }, 'chrome', '#8a8c94', { depth: 0.12, formSize: 3, line: 1.4 });
    ctx.fillStyle = rgba('#ffc080', 0.3);
    ctx.fillRect(gx + 2, HM.head, 1.5, 560 - HM.head);
  }
  // the anvil: a stepped iron block on the foundation, the die on top, the glowing billet on the die
  const anv = polyPath([[x - 60, FD.floor - 26], [x - 46, 640], [x - 40, 604], [x + 40, 604], [x + 46, 640], [x + 60, FD.floor - 26]]);
  castShadow(ctx, anv, 12, 12, 0.6, '#080404');
  solid(ctx, anv, { x: x - 60, y: 604, w: 120, h: FD.floor - 26 - 604 }, 'iron', '#34363c', { depth: 0.12, formSize: 16 });
  within(ctx, anv, () => {
    grain(ctx, { x: x - 60, y: 604, w: 120, h: FD.floor - 26 - 604 }, 'cast', 0.45, 1.2);
    // its step, lit on the shoulder; round faces turning from the light on the left into shade on the right
    ctx.fillStyle = 'rgba(8,8,12,0.55)';
    ctx.fillRect(x - 60, 640, 120, 4);
    ctx.fillStyle = rgba('#ffc890', 0.3);
    ctx.fillRect(x - 60, 637, 120, 2);
    const sg = ctx.createLinearGradient(x - 60, 0, x + 60, 0);
    sg.addColorStop(0, rgba('#ffd0a0', 0.1));
    sg.addColorStop(0.3, 'rgba(255,208,160,0)');
    sg.addColorStop(1, 'rgba(8,8,16,0.5)');
    ctx.fillStyle = sg;
    ctx.fillRect(x - 60, 604, 120, FD.floor - 604);
    // the billet's heat on its top, years of scale hammered into it
    const g = ctx.createLinearGradient(0, 604, 0, 664);
    g.addColorStop(0, rgba('#ff9a40', 0.55));
    g.addColorStop(1, rgba('#ff9a40', 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - 60, 604, 120, 60);
    grime(ctx, { x: x - 60, y: 604, w: 120, h: FD.floor - 26 - 604 }, { bottom: 30, a: 0.5, seed: 83, col: '#0a0606' });
  });
  rim(ctx, anv, 0.2, 3, LIGHT.rim);
  // where it bears on the foundation: a dark contact band and its shadow thrown down-right
  crevice(ctx, x - 70, x + 80, FD.floor - 26, 8, 0.75, '#050202');
  groundShadow(ctx, x + 18, FD.floor - 25, 74, 4, 0.6, '#050202', 1.3);
  const die = rectPath(x - 36, HM.die, 72, 12);
  solid(ctx, die, { x: x - 36, y: HM.die, w: 72, h: 12 }, 'iron', '#5a5c64', { depth: 0.12, formSize: 4, line: 1.6 });
  // the die's hardened face: a bright ground edge, blued just below it
  ctx.fillStyle = rgba('#fff0d0', 0.75);
  ctx.fillRect(x - 36, HM.die, 72, 1.5);
  ctx.fillStyle = rgba('#5a6ab0', 0.35);
  ctx.fillRect(x - 36, HM.die + 2, 72, 3);
  crevice(ctx, x - 40, x + 40, HM.die + 12, 6, 0.6, '#050202');
  billet(ctx, r);
  // scale knocked off the billet, littering the foundation round the anvil, a few flakes still glowing
  for (let i = 0; i < 26; i++) {
    const sx = x + (r() < 0.5 ? -1 : 1) * (64 + r() * 90);
    const sy = FD.floor - 26 + r() * 3;
    ctx.fillStyle = rgba(r() < 0.15 ? '#ff6a1a' : '#2a201c', 0.85);
    ctx.beginPath();
    ctx.ellipse(sx, sy, 2 + r() * 4, 1 + r() * 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // the smith's tongs, leaning on the left standard
  ctx.lineCap = 'round';
  for (const [ax, bx, w] of [[x - 120, x - 152, 5], [x - 112, x - 150, 4]] as const) {
    ctx.strokeStyle = '#1e1e22';
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(ax, 548);
    ctx.lineTo(bx, FD.floor - 28);
    ctx.stroke();
    ctx.strokeStyle = rgba('#ffb070', 0.3);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(ax - 1.5, 548);
    ctx.lineTo(bx - 1.5, FD.floor - 28);
    ctx.stroke();
  }
  groundShadow(ctx, x - 146, FD.floor - 27, 14, 3, 0.6, '#060302');
  // the operator's gear: a rod from the valve chest down to a bracket bolted on the right standard, the hand
  // lever pivoted on it
  const PX = x + 92;
  const PY = 470;
  const br = rrPath(x + 74, PY - 22, 30, 44, 4);
  castShadow(ctx, br, 8, 8, 0.55, '#080404');
  solid(ctx, br, { x: x + 74, y: PY - 22, w: 30, h: 44 }, 'iron', '#3a3c42', { depth: 0.12, formSize: 5, line: 1.6 });
  for (const by of [PY - 14, PY + 14]) rivet(ctx, x + 80, by, 2.6, '#6a6c74');
  ctx.lineCap = 'round';
  ctx.save();
  ctx.shadowColor = 'rgba(8,4,4,0.5)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 7;
  ctx.shadowOffsetY = 9;
  ctx.strokeStyle = '#26262c';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x + 102, 236);
  ctx.lineTo(PX, PY);
  ctx.lineTo(x + 132, PY + 34);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = rgba('#ffc080', 0.3);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + 100, 236);
  ctx.lineTo(PX - 2, PY);
  ctx.stroke();
  rivet(ctx, PX, PY, 4.5, '#6a6c74');
  ctx.save();
  ctx.translate(x + 134, PY + 36);
  ctx.rotate(0.85);
  const hnd = rrPath(-6, -4, 26, 11, 5);
  solid(ctx, hnd, { x: -6, y: -4, w: 26, h: 11 }, 'wood', '#6a4020', { depth: 0.12, formSize: 4, line: 1.4 });
  ctx.restore();
}

function billet(ctx: Ctx, r: R): void {
  const x = HM.x;
  const b = rrPath(x - 34, HM.billet, 68, HM.die - HM.billet, 5);
  const g = ctx.createLinearGradient(x - 34, 0, x + 34, 0);
  g.addColorStop(0, '#c8400c');
  g.addColorStop(0.25, '#ff8a24');
  g.addColorStop(0.5, '#ffd070');
  g.addColorStop(0.75, '#ff8a24');
  g.addColorStop(1, '#c8400c');
  ctx.fillStyle = g;
  b(ctx);
  ctx.fill();
  within(ctx, b, () => {
    vfill(ctx, x - 34, HM.billet, 68, HM.die - HM.billet, [[0, rgba('#fff4c8', 0.6)], [0.4, 'rgba(255,244,200,0)'], [1, 'rgba(90,20,0,0.4)']]);
    // flakes of scale on it, dark
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = rgba('#4a1a0a', 0.7);
      ctx.beginPath();
      ctx.ellipse(x - 30 + r() * 60, HM.billet + 3 + r() * 10, 2 + r() * 4, 1 + r() * 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  ctx.strokeStyle = rgba('#5a1a06', 0.8);
  ctx.lineWidth = 1.6;
  b(ctx);
  ctx.stroke();
  glowAt(ctx, x, HM.billet + 8, 120, '#ff8a30', 0.32, 0.6);
}

function tup(ctx: Ctx, r: R): void {
  const x = HM.x;
  const top = HM.tupTop;
  const L = 210;
  // the piston rod: polished steel, the shop's light running down it
  const rod = rectPath(x - 9, top - L, 18, L + 4);
  solid(ctx, rod, { x: x - 9, y: top - L, w: 18, h: L }, 'chrome', '#b8bcc4', { depth: 0.12, formSize: 6, line: 1.6 });
  within(ctx, rod, () => {
    ctx.fillStyle = rgba('#ffd8a8', 0.6);
    ctx.fillRect(x - 5, top - L, 2.5, L);
    ctx.fillStyle = 'rgba(20,20,30,0.4)';
    ctx.fillRect(x + 4, top - L, 4, L);
  });
  // the tup: the falling weight, keyed die at its foot, gibs riding the guides
  const body = polyPath([[x - 46, top], [x + 46, top], [x + 46, top + HM.tupH - 14], [x + 38, top + HM.tupH - 14], [x + 38, top + HM.tupH], [x - 38, top + HM.tupH], [x - 38, top + HM.tupH - 14], [x - 46, top + HM.tupH - 14]]);
  castShadow(ctx, body, 18, 16, 0.55, '#080404');
  solid(ctx, body, { x: x - 46, y: top, w: 92, h: HM.tupH }, 'iron', '#4a4c54', { depth: 0.12, formSize: 20 });
  within(ctx, body, () => {
    grain(ctx, { x: x - 46, y: top, w: 92, h: HM.tupH }, 'cast', 0.4, 1.2);
    ctx.fillStyle = 'rgba(8,8,12,0.55)';
    ctx.fillRect(x - 46, top + HM.tupH - 16, 92, 3);
    ctx.fillRect(x - 46, top + 22, 92, 2);
    // the wedge key through it
    ctx.fillStyle = '#2a2a30';
    ctx.fillRect(x - 46, top + HM.tupH - 30, 92, 9);
    ctx.fillStyle = rgba('#ffffff', 0.12);
    ctx.fillRect(x - 46, top + HM.tupH - 30, 92, 2);
    // the billet's glow on its foot
    vfill(ctx, x - 46, top + HM.tupH - 30, 92, 30, [[0, 'rgba(255,138,48,0)'], [1, rgba('#ff8a30', 0.4)]]);
    // the rod's crosshead nut on top
    ctx.fillStyle = '#2e3036';
    ctx.fillRect(x - 16, top, 32, 12);
  });
  for (const dx of [-30, 30]) rivet(ctx, x + dx, top + 10, 3.4, '#6a6c74');
  rim(ctx, body, 0.22, 3, LIGHT.rim);
  for (const s of [-1, 1]) {
    const gb = rectPath(s < 0 ? x - 52 : x + 44, top + 6, 8, HM.tupH - 30);
    solid(ctx, gb, { x: s < 0 ? x - 52 : x + 44, y: top + 6, w: 8, h: HM.tupH - 30 }, 'iron', '#2e3036', { depth: 0.12, formSize: 3, line: 1.2 });
  }
  void r;
}

/** The exhaust's open end (steam puffs from it at the top of each heavy stroke). */
const EXH = { x: HM.cyl.x1 + 62, y: 58 };

function cylinder(ctx: Ctx, r: R): void {
  const x = HM.x;
  const { x0, x1, y0, y1 } = HM.cyl;
  // the cross-head (entablature) tying the standards, the cylinder bolted on it
  const ch = rrPath(x - 104, y1 - 6, 208, HM.head - y1 + 10, 4);
  castShadow(ctx, ch, 16, 16, 0.6, '#080404');
  solid(ctx, ch, { x: x - 104, y: y1 - 6, w: 208, h: HM.head - y1 + 10 }, 'iron', IRON, { depth: 0.12, formSize: 10 });
  for (let bx = x - 90; bx <= x + 90; bx += 30) rivet(ctx, bx, y1 + 6, 3.4, '#6a6c74');
  // the gland the rod comes out of
  const gl = rrPath(x - 18, HM.head - 4, 36, 10, 2);
  solid(ctx, gl, { x: x - 18, y: HM.head - 4, w: 36, h: 10 }, 'chrome', '#9a8a5a', { depth: 0.12, formSize: 3, line: 1.4 });
  // the cylinder: cast iron, round, its steam jacket ribbed, lit on the left and falling into shade on the right
  const cyl = rectPath(x0, y0 + 10, x1 - x0, y1 - y0 - 20);
  castShadow(ctx, cyl, 18, 18, 0.6, '#080404');
  solid(ctx, cyl, { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, 'iron', '#44464e', { depth: 0.12, formSize: 30 });
  within(ctx, cyl, () => {
    grain(ctx, { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, 'cast', 0.45, 1.2);
    const cg = ctx.createLinearGradient(x0, 0, x1, 0);
    cg.addColorStop(0, rgba('#ffd0a0', 0.1));
    cg.addColorStop(0.22, rgba('#ffffff', 0.12));
    cg.addColorStop(0.32, 'rgba(255,255,255,0)');
    cg.addColorStop(0.7, 'rgba(10,10,20,0.22)');
    cg.addColorStop(1, 'rgba(10,10,20,0.6)');
    ctx.fillStyle = cg;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    // the jacket's cast ribs, each lit on top and shadowed beneath
    for (let by = y0 + 34; by < y1 - 24; by += 26) {
      ctx.fillStyle = 'rgba(8,8,12,0.45)';
      ctx.fillRect(x0, by + 4, x1 - x0, 3);
      ctx.fillStyle = rgba('#ffe0c0', 0.16);
      ctx.fillRect(x0, by, x1 - x0, 1.5);
    }
    // a polished brass band and the maker's plate
    ctx.fillStyle = '#8a6a2a';
    ctx.fillRect(x0, y0 + 96, x1 - x0, 9);
    ctx.fillStyle = rgba('#ffe0a0', 0.55);
    ctx.fillRect(x0 + (x1 - x0) * 0.12, y0 + 96, (x1 - x0) * 0.25, 2);
    ctx.fillStyle = 'rgba(10,6,2,0.5)';
    ctx.fillRect(x0, y0 + 104, x1 - x0, 1.5);
    const pl = rrPath(x - 26, y0 + 124, 44, 22, 3);
    ctx.fillStyle = '#7a6230';
    pl(ctx);
    ctx.fill();
    ctx.fillStyle = 'rgba(30,20,8,0.6)';
    for (const ly of [y0 + 130, y0 + 136, y0 + 141]) ctx.fillRect(x - 20, ly, 32, 1.4);
    ctx.fillStyle = rgba('#ffe0a0', 0.45);
    ctx.fillRect(x - 26, y0 + 124, 44, 1.5);
    grime(ctx, { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, { top: 40, bottom: 30, a: 0.6, seed: 85, col: '#100804' });
    streaks(ctx, r, x, y0 + 20, x1 - x0, 120, '#1a1008', 0.25, 6);
  });
  for (const [fy, fh] of [[y0, 16], [y1 - 18, 16]] as const) {
    const f = rrPath(x0 - 8, fy, x1 - x0 + 16, fh, 3);
    solid(ctx, f, { x: x0 - 8, y: fy, w: x1 - x0 + 16, h: fh }, 'iron', STEEL, { depth: 0.12, formSize: 5, line: 1.6 });
    for (let bx = x0; bx <= x1; bx += 20) rivet(ctx, bx, fy + fh / 2, 2.6, '#7a7c84');
  }
  // the drain cocks at its foot (they spit steam on the blow)
  for (const s of [-1, 1]) {
    const dx = s < 0 ? x0 - 18 : x1 + 4;
    const dc = rrPath(dx, y1 - 30, 14, 7, 2);
    solid(ctx, dc, { x: dx, y: y1 - 30, w: 14, h: 7 }, 'chrome', '#a08a4a', { depth: 0.12, formSize: 2, line: 1.2 });
  }
  // the valve chest on its right, the steam main into it, the exhaust stack up into the roof, a gauge
  const vc = rrPath(x1 + 2, y0 + 44, 42, 120, 4);
  castShadow(ctx, vc, 14, 14, 0.55, '#080404');
  solid(ctx, vc, { x: x1 + 2, y: y0 + 44, w: 42, h: 120 }, 'iron', STEEL, { depth: 0.12, formSize: 10 });
  for (const vy of [y0 + 54, y0 + 154]) for (const vx of [x1 + 10, x1 + 36]) rivet(ctx, vx, vy, 2.6, '#7a7c84');
  // (the exhaust: up from the chest, an elbow, an open end turned up under the girder)
  const ex = polyPath([[x1 + 14, y0 + 44], [x1 + 14, EXH.y + 16], [x1 + 16, EXH.y], [EXH.x + 8, EXH.y], [EXH.x + 8, EXH.y - 18], [EXH.x - 10, EXH.y - 18], [EXH.x - 10, EXH.y + 16 - 2], [x1 + 34, EXH.y + 18], [x1 + 34, y0 + 44]]);
  castShadow(ctx, ex, 12, 12, 0.5, '#080404');
  solid(ctx, ex, { x: x1 + 14, y: EXH.y - 18, w: EXH.x + 8 - x1 - 14, h: y0 + 62 - EXH.y }, 'iron', '#3a3c42', { depth: 0.12, formSize: 6, line: 1.6 });
  ctx.fillStyle = '#120e10';
  ctx.beginPath();
  ctx.ellipse(EXH.x - 1, EXH.y - 18, 9, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  const gx = x1 + 23;
  const gy = y0 + 22;
  const gauge = ellPath(gx, gy + 44, 15, 15);
  solid(ctx, gauge, { x: gx - 15, y: gy + 29, w: 30, h: 30 }, 'chrome', '#b89a4a', { depth: 0.12, formSize: 4, line: 1.4 });
  ctx.fillStyle = '#e8e0c8';
  ctx.beginPath();
  ctx.arc(gx, gy + 44, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1a1414';
  ctx.lineWidth = 1;
  for (let k = 0; k < 9; k++) {
    const a = Math.PI * 0.75 + (k / 8) * Math.PI * 1.5;
    ctx.beginPath();
    ctx.moveTo(gx + Math.cos(a) * 8, gy + 44 + Math.sin(a) * 8);
    ctx.lineTo(gx + Math.cos(a) * 10.5, gy + 44 + Math.sin(a) * 10.5);
    ctx.stroke();
  }
  ctx.strokeStyle = '#b01a10';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(gx, gy + 44);
  ctx.lineTo(gx + 7, gy + 38);
  ctx.stroke();
  ctx.fillStyle = rgba('#ffffff', 0.5);
  ctx.fillRect(gx - 7, gy + 36, 4, 2);
  // the steam main's stub into the chest
  const st = rectPath(x1 + 44, 156, 30, 24);
  solid(ctx, st, { x: x1 + 44, y: 156, w: 30, h: 24 }, 'iron', STEEL, { depth: 0.12, formSize: 4, line: 1.4 });
}

// ——— the ladle and the pour ———

/** The ladle's shell (in its own frame: trunnions at the origin, mouth up at y −86, before the tilt). */
function ladleBody(c: Ctx): void {
  c.beginPath();
  c.moveTo(-96, -84);
  c.lineTo(96, -84);
  c.lineTo(80, 70);
  c.quadraticCurveTo(76, 92, 40, 98);
  c.quadraticCurveTo(0, 102, -40, 98);
  c.quadraticCurveTo(-76, 92, -80, 70);
  c.closePath();
}

/** Its rim: a thick rolled flange round the mouth, the pouring lip drawn out of it on the right. */
function ladleRim(c: Ctx): void {
  c.beginPath();
  c.moveTo(-104, -98);
  c.lineTo(94, -98);
  c.quadraticCurveTo(108, -100, SPOUT[0] + 8, SPOUT[1] - 4);
  c.quadraticCurveTo(SPOUT[0] + 10, SPOUT[1] + 6, SPOUT[0] - 2, SPOUT[1] + 12);
  c.quadraticCurveTo(104, -80, 96, -80);
  c.lineTo(-104, -80);
  c.closePath();
}

function ladle(ctx: Ctx, r: R): void {
  const { x: hx, y: hy } = FD.hook;
  const { x, y } = FD.ladle;
  // the hook block on its ropes, the hook through the bail's eye
  const blk = rrPath(hx - 20, hy, 40, 34, 6);
  castShadow(ctx, blk, 12, 12, 0.5, '#080404');
  solid(ctx, blk, { x: hx - 20, y: hy, w: 40, h: 34 }, 'enamel', '#6e6248', { depth: 0.12, formSize: 6, line: 1.6 });
  for (const sx of [-10, 10]) rivet(ctx, hx + sx, hy + 12, 3.4, '#6a6060');
  ctx.strokeStyle = '#26262c';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(hx, hy + 34);
  ctx.lineTo(hx, hy + 44);
  ctx.arc(hx + 10, hy + 52, 10, Math.PI, Math.PI * 2.4, true);
  ctx.stroke();
  ctx.strokeStyle = rgba('#ffb070', 0.35);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(hx + 10, hy + 52, 12, Math.PI * 1.05, Math.PI * 1.5);
  ctx.stroke();
  // the ladle, tipped on its trunnions: a riveted steel shell lined with firebrick, scaled and heat-tempered
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(TILT);
  castShadow(ctx, ladleBody, 24, 24, 0.6, '#080404');
  solid(ctx, ladleBody, { x: -96, y: -86, w: 192, h: 188 }, 'iron', '#383232', { depth: 0.12, formSize: 46 });
  within(ctx, ladleBody, () => {
    grain(ctx, { x: -110, y: -100, w: 230, h: 210 }, 'cast', 0.5, 1.2);
    // round: lit on its left, falling into shade round to the right
    const rg = ctx.createLinearGradient(-96, 0, 96, 0);
    rg.addColorStop(0, rgba('#ffd0a0', 0.12));
    rg.addColorStop(0.25, 'rgba(255,208,160,0)');
    rg.addColorStop(0.7, 'rgba(10,8,16,0.12)');
    rg.addColorStop(1, 'rgba(10,8,16,0.5)');
    ctx.fillStyle = rg;
    ctx.fillRect(-100, -90, 200, 200);
    // heat tempering: straw under the rim, blue and purple lower down
    vfill(ctx, -100, -84, 200, 190, [[0, rgba('#ff6a1a', 0.5)], [0.18, rgba('#c88a3a', 0.12)], [0.42, rgba('#6a5ab0', 0.16)], [0.7, 'rgba(60,40,90,0)']]);
    // plate seams and two hoops with their rivets
    for (const sx of [-44, 30]) {
      ctx.fillStyle = 'rgba(10,8,10,0.4)';
      ctx.fillRect(sx, -84, 2.5, 186);
    }
    for (const by of [-50, 28]) {
      ctx.fillStyle = 'rgba(14,12,14,0.72)';
      ctx.fillRect(-110, by, 220, 13);
      ctx.fillStyle = rgba('#ffc890', 0.22);
      ctx.fillRect(-110, by, 220, 2);
      for (let rx = -84; rx <= 84; rx += 21) rivet(ctx, rx, by + 6.5, 2.6, '#5a5658');
    }
    // metal that ran down from the lip and froze: grey dribbles, still red near the top
    for (let i = 0; i < 6; i++) {
      const dx = 58 + r() * 32;
      const len = 26 + r() * 70;
      const dg = ctx.createLinearGradient(0, -84, 0, -84 + len);
      dg.addColorStop(0, rgba('#ff7a2a', 0.9));
      dg.addColorStop(0.3, rgba('#3a3030', 0.95));
      dg.addColorStop(1, rgba('#2e2828', 0.7));
      ctx.fillStyle = dg;
      ctx.beginPath();
      ctx.moveTo(dx - 3.5, -84);
      ctx.quadraticCurveTo(dx - 4, -84 + len * 0.6, dx, -84 + len);
      ctx.quadraticCurveTo(dx + 4, -84 + len * 0.6, dx + 3.5, -84);
      ctx.fill();
    }
    grime(ctx, { x: -96, y: -86, w: 192, h: 188 }, { bottom: 44, a: 0.5, seed: 87, col: '#0c0606' });
    // lit from below by the basin and the stream
    const ug = ctx.createRadialGradient(90, 110, 10, 90, 110, 170);
    ug.addColorStop(0, rgba('#ff9a40', 0.5));
    ug.addColorStop(1, rgba('#ff9a40', 0));
    ctx.fillStyle = ug;
    ctx.fillRect(-100, -20, 200, 130);
  });
  rim(ctx, ladleBody, 0.22, 3, LIGHT.rim);
  bounce(ctx, ladleBody, 0, 0, [70, 90], '#ff9a40', 0.65, 9);
  // the rim: rolled steel over the firebrick lining (its pale edge showing), glowing where the metal pours over
  solid(ctx, ladleRim, { x: -104, y: -100, w: 236, h: 30 }, 'iron', '#55504c', { depth: 0.12, formSize: 8, line: 2 });
  within(ctx, ladleRim, () => {
    ctx.fillStyle = '#c8a07a';
    ctx.fillRect(-104, -100, 220, 5);
    const sg = ctx.createLinearGradient(20, 0, SPOUT[0] + 10, 0);
    sg.addColorStop(0, 'rgba(255,120,30,0)');
    sg.addColorStop(0.6, rgba('#ff8a2a', 0.7));
    sg.addColorStop(1, rgba('#ffd070', 0.95));
    ctx.fillStyle = sg;
    ctx.fillRect(20, -102, SPOUT[0] - 10, 30);
  });
  // the metal welling over the lip into the stream
  ctx.fillStyle = MOLTEN.hot;
  ctx.beginPath();
  ctx.moveTo(72, -100);
  ctx.quadraticCurveTo(100, -106, SPOUT[0] + 6, SPOUT[1] - 6);
  ctx.quadraticCurveTo(SPOUT[0] + 10, SPOUT[1] - 1, SPOUT[0] + 4, SPOUT[1] + 2);
  ctx.quadraticCurveTo(100, -96, 72, -98);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgba(MOLTEN.core, 0.9);
  ctx.fillRect(92, -103, 18, 2);
  // the spout's channel: its walls curving up either side of the metal, a skin of crust along its edge, and the
  // lip itself incandescent where the stream leaves it
  ctx.strokeStyle = rgba('#2a1610', 0.9);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(84, -95);
  ctx.quadraticCurveTo(106, -101, SPOUT[0] + 7, SPOUT[1] - 7);
  ctx.stroke();
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(90, -84);
  ctx.quadraticCurveTo(108, -86, SPOUT[0] + 3, SPOUT[1] + 4);
  ctx.stroke();
  ctx.strokeStyle = rgba(MOLTEN.core, 0.95);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(SPOUT[0] + 4, SPOUT[1] - 5);
  ctx.quadraticCurveTo(SPOUT[0] + 10, SPOUT[1] - 1, SPOUT[0] + 5, SPOUT[1] + 3);
  ctx.stroke();
  // the tilting gear: a toothed sector bolted to the shell round the near trunnion (it turns with the ladle)
  const sector = (c: Ctx) => {
    c.beginPath();
    c.moveTo(0, 0);
    c.arc(0, 0, 56, -Math.PI * 0.62, Math.PI * 0.12);
    c.closePath();
  };
  solid(ctx, sector, { x: -10, y: -56, w: 66, h: 66 }, 'iron', '#33343a', { depth: 0.12, formSize: 10, line: 1.6 });
  ctx.strokeStyle = '#1a1a1e';
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let k = 0; k <= 14; k++) {
    const a = -Math.PI * 0.62 + (k / 14) * Math.PI * 0.74;
    ctx.moveTo(Math.cos(a) * 54, Math.sin(a) * 54);
    ctx.lineTo(Math.cos(a) * 61, Math.sin(a) * 61);
  }
  ctx.stroke();
  ctx.restore();
  // the light of the metal in it, rising out of the mouth
  const [mx, my] = rot(10, -110, TILT);
  glowAt(ctx, x + mx, y + my, 90, '#ff9a40', 0.16, 0.6);
  // the bail, seen from the side: its near arm, a forged bar from the hook's eye down to the trunnion (the far arm
  // hidden behind the ladle)
  const arm = polyPath([[x - 8, hy + 46], [x + 8, hy + 46], [x + 15, y - 14], [x - 15, y - 14]]);
  castShadow(ctx, arm, 14, 12, 0.55, '#080404');
  solid(ctx, arm, { x: x - 15, y: hy + 46, w: 30, h: y - hy - 60 }, 'iron', '#2e2f35', { depth: 0.12, formSize: 6, line: 1.8 });
  ctx.fillStyle = rgba('#ffc890', 0.3);
  ctx.fillRect(x - 7, hy + 50, 2, y - hy - 66);
  const eye = ellPath(x, hy + 52, 13, 13);
  solid(ctx, eye, { x: x - 13, y: hy + 39, w: 26, h: 26 }, 'iron', '#2e2f35', { depth: 0.12, formSize: 5, line: 1.8 });
  ctx.fillStyle = '#141216';
  ctx.beginPath();
  ctx.arc(x, hy + 52, 6, 0, Math.PI * 2);
  ctx.fill();
  // the near trunnion: a forged boss in the arm's bearing, its cap bolted
  const boss = ellPath(x, y, 22, 22);
  castShadow(ctx, boss, 10, 10, 0.5, '#080404');
  solid(ctx, boss, { x: x - 22, y: y - 22, w: 44, h: 44 }, 'iron', '#3a3b42', { depth: 0.12, formSize: 10, line: 1.8 });
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + 0.4;
    rivet(ctx, x + Math.cos(a) * 14, y + Math.sin(a) * 14, 2.6, '#6a6c74');
  }
  rivet(ctx, x, y, 6, '#5a5c64');
  // the worm box on the arm over the sector, and its hand wheel (turned to tip the ladle)
  const wb = rrPath(x - 18, y - 96, 36, 30, 4);
  castShadow(ctx, wb, 10, 10, 0.5, '#080404');
  solid(ctx, wb, { x: x - 18, y: y - 96, w: 36, h: 30 }, 'iron', '#3a3b42', { depth: 0.12, formSize: 6, line: 1.6 });
  ctx.strokeStyle = '#26262c';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x - 18, y - 81);
  ctx.lineTo(x - 52, y - 81);
  ctx.stroke();
  const WX = x - 58;
  const WY = y - 81;
  ctx.save();
  ctx.shadowColor = 'rgba(8,4,4,0.45)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 6;
  ctx.shadowOffsetY = 8;
  ctx.strokeStyle = '#8a2416';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(WX, WY, 8, 24, 0, 0, Math.PI * 2);
  ctx.moveTo(WX, WY - 24);
  ctx.lineTo(WX, WY + 24);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = rgba('#ff9a8a', 0.45);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(WX, WY, 9, 25, 0, Math.PI * 1.1, Math.PI * 1.6);
  ctx.stroke();
}

/** The pour's frame: the stream falling from the lip (its top at (STR.lx, STR.ly) in the frame) for STR.len px. */
export const STR = { w: 100, h: 400, lx: 30, ly: 8, len: 370, drift: 16, n: 10 };

export function streamFrame(c: Ctx, ph: number): void {
  const T = Math.PI * 2;
  const { lx, ly, len, drift } = STR;
  const N = 56;
  const cx = (u: number) => lx + drift * Math.sqrt(u) + Math.sin(T * (u * 2 - ph)) * 0.8 * u;
  const wid = (u: number) => 27 * (1 - 0.56 * u ** 0.45) + Math.sin(T * (u * 5 - ph * 3)) * 1.5 * (0.3 + u) + Math.sin(T * (u * 11 - ph * 5) + 1.3) * 0.8;
  const edge = (k: number, s: number) => {
    const pts: [number, number][] = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      pts.push([cx(u) + s * wid(u) * k * 0.5 - wid(u) * 0.12 * (1 - k), ly + u * len]);
    }
    return pts;
  };
  const body = (k: number) => {
    const L = edge(k, -1);
    const Rr = edge(k, 1).reverse();
    c.beginPath();
    c.moveTo(L[0][0], L[0][1]);
    for (const [x, y] of L) c.lineTo(x, y);
    for (const [x, y] of Rr) c.lineTo(x, y);
    c.closePath();
  };
  // the heat round it, soft
  c.save();
  c.lineCap = 'round';
  for (const [w, a] of [[56, 0.06], [38, 0.08], [28, 0.1]] as const) {
    c.strokeStyle = `rgba(255,120,30,${a})`;
    c.lineWidth = w;
    c.beginPath();
    for (let i = 0; i <= N; i += 4) {
      const u = i / N;
      if (i === 0) c.moveTo(cx(u), ly + u * len);
      else c.lineTo(cx(u), ly + u * len);
    }
    c.stroke();
  }
  c.restore();
  // the body, its hotter core set towards the lit side, the white-hot heart
  body(1);
  c.fillStyle = MOLTEN.body;
  c.fill();
  c.strokeStyle = rgba(MOLTEN.edge, 0.9);
  c.lineWidth = 1.6;
  c.stroke();
  body(0.62);
  c.fillStyle = MOLTEN.hot;
  c.fill();
  body(0.26);
  c.fillStyle = MOLTEN.core;
  c.fill();
  // ropes of brighter metal sliding down it (they speed up as it falls) and dark flecks of oxide riding along
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (let s = 0; s < 3; s++) {
    for (let i = 0; i < N; i++) {
      const u0 = i / N;
      const f = (Math.sqrt(u0) * 4 - ph * 2 + s * 0.37) % 1;
      if (f < 0 || f > 0.55) continue;
      const u1 = (i + 1) / N;
      const off = (u: number) => Math.sin(T * (u * 3 - ph) + s * 2.1) * wid(u) * 0.32;
      c.strokeStyle = `rgba(255,250,220,${0.5 - s * 0.1})`;
      c.lineWidth = 2 - s * 0.4;
      c.beginPath();
      c.moveTo(cx(u0) + off(u0), ly + u0 * len);
      c.lineTo(cx(u1) + off(u1), ly + u1 * len);
      c.stroke();
    }
  }
  c.restore();
  for (let i = 0; i < 7; i++) {
    const u = (Math.sqrt(((ph + i / 7) % 1)) * 0.92 + 0.04) % 1;
    const s = Math.sin(i * 2.7) * 0.36;
    c.fillStyle = rgba('#8a3008', 0.55);
    c.beginPath();
    c.ellipse(cx(u) + s * wid(u), ly + u * len, 1.6, 3.4, 0, 0, Math.PI * 2);
    c.fill();
  }
  // where it pours over the lip: a flat ribbon catching the light
  c.fillStyle = rgba(MOLTEN.core, 0.8);
  c.beginPath();
  c.ellipse(lx - 2, ly + 2, 12, 4, -0.2, 0, Math.PI * 2);
  c.fill();
  // at the foot it breaks into beads
  for (let i = 0; i < 5; i++) {
    const q = (ph * 2 + i / 5) % 1;
    const y = ly + len - 18 + q * 22;
    const x = cx(1) + Math.sin(i * 3.1 + ph * T) * 7;
    c.fillStyle = rgba(MOLTEN.hot, 1 - q * 0.6);
    c.beginPath();
    c.arc(x, y, 3.2 - q * 1.6, 0, Math.PI * 2);
    c.fill();
  }
}

/** The splash crown in the basin: frame size, the pool's centre in it. */
export const SPL = { w: 180, h: 120, cx: 90, cy: 92, n: 10 };

export function splashFrame(c: Ctx, ph: number): void {
  const T = Math.PI * 2;
  const { cx, cy } = SPL;
  // the boil where the stream strikes: a white-hot patch, rings running out over the pool
  const g = c.createRadialGradient(cx, cy, 0, cx, cy, 40);
  g.addColorStop(0, rgba(MOLTEN.core, 0.95));
  g.addColorStop(0.4, rgba(MOLTEN.hot, 0.6));
  g.addColorStop(1, rgba(MOLTEN.body, 0));
  c.fillStyle = g;
  c.save();
  c.translate(cx, cy);
  c.scale(1, 0.24);
  c.beginPath();
  c.arc(0, 0, 40, 0, T);
  c.fill();
  c.restore();
  for (let k = 0; k < 3; k++) {
    const q = (ph + k / 3) % 1;
    c.strokeStyle = rgba(MOLTEN.hot, (1 - q) * 0.75);
    c.lineWidth = 2.6 * (1 - q) + 0.6;
    c.beginPath();
    c.ellipse(cx, cy, 8 + q * 36, (8 + q * 36) * 0.22, 0, 0, T);
    c.stroke();
  }
  // the crown: droplets thrown up and falling back, cooling as they fly
  for (let i = 0; i < 12; i++) {
    const q = (ph * 2 + i / 12) % 1;
    const a = -Math.PI / 2 + Math.sin(i * 2.39) * 1.05;
    const v = 200 + ((i * 37) % 90);
    const t = q * 0.62;
    const vx = Math.cos(a) * v * 0.7;
    const vy = Math.sin(a) * v;
    const x = cx + vx * t;
    const y = cy - 4 + vy * t + 0.5 * 700 * t * t;
    const px = cx + vx * (t - 0.03);
    const py = cy - 4 + vy * (t - 0.03) + 0.5 * 700 * (t - 0.03) ** 2;
    if (y > cy + 2) continue;
    const col = q < 0.4 ? MOLTEN.core : q < 0.7 ? MOLTEN.hot : MOLTEN.body;
    c.strokeStyle = rgba(col, 0.9 - q * 0.4);
    c.lineWidth = 3 - q * 1.6;
    c.beginPath();
    c.moveTo(px, py);
    c.lineTo(x, y);
    c.stroke();
  }
  // the skirt the stream throws up round its foot
  c.fillStyle = rgba(MOLTEN.hot, 0.85);
  c.beginPath();
  const sk = 1 + Math.sin(ph * T * 3) * 0.15;
  c.moveTo(cx - 14 * sk, cy);
  c.quadraticCurveTo(cx - 8, cy - 14 * sk, cx, cy - 6);
  c.quadraticCurveTo(cx + 8, cy - 14 * sk, cx + 14 * sk, cy);
  c.closePath();
  c.fill();
}

/** The fume's frame: its source at (FUME.sx, FUME.h - 4), leaning up and to the left. */
const FUME = { w: 90, h: 170, sx: 62, n: 12 };

/**
 * One frame of the fume off the pour (phase 0…1 loops): not puffs but a continuous wispy sheet, many soft lobes
 * overlapping along a sinuous line that leans left as it climbs and widens, broken up by slow noise, lit warm from
 * below on its right (the pool) and thinning to nothing at the top. Painted small and blurred, so it reads as air.
 */
export function fumeFrame(c: Ctx, w: number, h: number, ph: number): void {
  const T = Math.PI * 2;
  const k = 0.5;
  const [cv, g] = makeCanvas(Math.ceil(w * k), Math.ceil(h * k));
  g.scale(k, k);
  const N = 46;
  for (let j = 0; j < N; j++) {
    const u = (ph + j / N) % 1;
    const y = h - 4 - u * (h - 10);
    const x = FUME.sx - u * u * w * 0.42 + Math.sin(T * (u * 1.4 - ph) + j * 0.31) * w * 0.07 * (0.2 + u);
    const rad = w * (0.06 + u * 0.26);
    // the breakup: a slow pattern riding up with the sheet
    const brk = 0.55 + 0.45 * Math.sin(T * (u * 2.3 - ph) + Math.sin(j * 1.7) * 2);
    const al = 0.16 * Math.sin(Math.min(1, u * 3) * Math.PI * 0.5) * (1 - u) ** 1.3 * brk;
    const rg = g.createRadialGradient(x, y, 0, x, y, rad);
    rg.addColorStop(0, rgba('#c08860', al));
    rg.addColorStop(0.7, rgba('#a87050', al * 0.5));
    rg.addColorStop(1, 'rgba(160,110,80,0)');
    g.fillStyle = rg;
    g.beginPath();
    g.ellipse(x, y, rad * 1.3, rad, -0.4, 0, T);
    g.fill();
    // its underside caught by the pool's light
    const lg = g.createRadialGradient(x + rad * 0.3, y + rad * 0.35, 0, x + rad * 0.3, y + rad * 0.35, rad * 0.7);
    lg.addColorStop(0, rgba('#ffc890', al * 0.8 * (1 - u)));
    lg.addColorStop(1, 'rgba(255,200,144,0)');
    g.fillStyle = lg;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  c.save();
  c.filter = 'blur(2px)';
  c.drawImage(cv, 0, 0, w, h);
  c.restore();
}

function pourStill(ctx: Ctx): void {
  // the pour as the still shows it: the stream, the splash, a few sparks off it, the fume
  const [lx, ly] = LIP0;
  ctx.save();
  ctx.translate(FD.basin.x - FUME.sx * 2, FD.basin.y - 8 - FUME.h * 2);
  ctx.scale(2, 2);
  fumeFrame(ctx, FUME.w, FUME.h, 0.35);
  ctx.restore();
  ctx.save();
  ctx.translate(lx - STR.lx, ly - STR.ly);
  ctx.scale(1, (FD.basin.y - 2 - ly) / STR.len);
  streamFrame(ctx, 0.3);
  ctx.restore();
  ctx.save();
  ctx.translate(FD.basin.x - SPL.cx, FD.basin.y - SPL.cy);
  splashFrame(ctx, 0.3);
  ctx.restore();
  glowAt(ctx, FD.basin.x, FD.basin.y - 30, 200, '#ffb050', 0.5, 0.6);
  glowAt(ctx, lx + 6, (ly + FD.basin.y) / 2, 160, '#ffa040', 0.25, 1.6);
  ctx.save();
  ctx.lineCap = 'round';
  // a few sparks caught in flight: short arcs, brightest at their heads
  for (const [dx, dy, ex, ey] of [[26, -26, 62, -30], [-14, -30, -40, -40], [40, -14, 86, 4], [10, -44, 30, -66]] as const) {
    const x0 = FD.basin.x + dx;
    const y0 = FD.basin.y + dy;
    const x1 = FD.basin.x + ex;
    const y1 = FD.basin.y + ey;
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, 'rgba(255,220,150,0)');
    g.addColorStop(1, 'rgba(255,240,190,0.9)');
    ctx.strokeStyle = g;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + x1) / 2, Math.min(y0, y1) - 14, x1, y1);
    ctx.stroke();
  }
  ctx.restore();
}

function chain(ctx: Ctx): void {
  const { x, y1 } = FD.chain;
  ctx.save();
  ctx.shadowColor = 'rgba(8,4,4,0.55)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 10;
  ctx.shadowOffsetY = 12;
  hang(ctx, x, FD.girder.y1, x, y1, 0, '#4a4a52', 5, true);
  ctx.strokeStyle = '#2a2a30';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(x + 9, y1 + 16, 13, Math.PI, Math.PI * 2.55);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = rgba('#ffa860', 0.45);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x + 9, y1 + 16, 15, Math.PI * 1.05, Math.PI * 1.5);
  ctx.stroke();
}

// ——— the table: the casting floor's steel plate ———

function table(ctx: Ctx, r: R): void {
  const front = FD.front;
  const box = { x: 0, y: TY, w: W, h: front - TY + 4 };
  metalPlane(ctx, r, front, '#4e5058', { seamsX: [-1.65, -0.55, 0.55, 1.65], seamsZ: [zAt(860)], lights: [{ x: FD.basin.x, col: '#ffb060', a: 0.32 }, { x: 960, col: '#ff8a3a', a: 0.12 }, { x: HM.x, col: '#ff9a50', a: 0.22 }], seed: 91 });
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  // countersunk bolts along the seams
  const zf = zAt(front);
  for (const X of [-1.65, -0.55, 0.55, 1.65])
    for (let z = ZB - 0.06; z > zf; z -= 0.16) {
      const x = xAt(X, z) + 7;
      const y = yAt(z);
      const s = 1 / (z / ZB);
      ctx.fillStyle = 'rgba(8,8,12,0.5)';
      ctx.beginPath();
      ctx.ellipse(x, y, 3.2 * s, 1.4 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba('#d8dce4', 0.25);
      ctx.beginPath();
      ctx.ellipse(x - 0.6 * s, y - 0.4 * s, 1.6 * s, 0.6 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  // heat: the plate tempered straw and blue near the pour, scorched black in patches, oil
  const tg = ctx.createRadialGradient(FD.basin.x, TY, 20, FD.basin.x, TY, 420);
  tg.addColorStop(0, rgba('#c8a050', 0.18));
  tg.addColorStop(0.5, rgba('#5a5ab0', 0.1));
  tg.addColorStop(1, rgba('#5a5ab0', 0));
  ctx.save();
  ctx.translate(0, TY);
  ctx.scale(1, 0.3);
  ctx.translate(0, -TY);
  ctx.fillStyle = tg;
  ctx.fillRect(0, TY - 420, 1000, 840);
  ctx.restore();
  lay(ctx, noiseMask(7, 93, { cover: 0.28, soft: 0.35, col: '#0a0808' }), box, 0.16);
  lay(ctx, noiseMask(16, 94, { cover: 0.18, soft: 0.2, col: '#141014', w: 320, h: 60 }), box, 0.12);
  // spatter: metal that jumped the runner and froze on the plate, near the back
  for (let i = 0; i < 26; i++) {
    const u = r();
    const x = FD.basin.x - 260 + u * 900 + (r() - 0.5) * 200;
    const y = TY + 8 + r() ** 2 * 70;
    const s = 1 + (y - TY) / 60;
    ctx.fillStyle = rgba('#2a2628', 0.8);
    ctx.beginPath();
    ctx.ellipse(x, y, (2 + r() * 4) * s, (0.8 + r() * 1.2) * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba('#c8c0c0', 0.35);
    ctx.fillRect(x - s, y - 0.8 * s, 1.4 * s, 0.8);
  }
  // the runner's light along the back of the plate, the pour's warm pool on the left, the billet's on the right
  ctx.globalCompositeOperation = 'screen';
  vfill(ctx, FD.runner.x0, TY, FD.runner.x1 - FD.runner.x0, 40, [[0, rgba('#ff8a30', 0.3)], [1, 'rgba(255,138,48,0)']]);
  ctx.globalCompositeOperation = 'source-over';
  lightPool(ctx, FD.basin.x + 40, TY + 40, 460, 90, '#ffa050', 0.2, 'screen');
  lightPool(ctx, HM.x, TY + 30, 300, 60, '#ff8a3a', 0.12, 'screen');
  // the wall's shadow along the back
  vfill(ctx, 0, TY, W, 36, [[0, 'rgba(10,6,6,0.4)'], [1, 'rgba(10,6,6,0)']]);
  ctx.restore();
  tableFalloff(ctx, front, 0.42, '#0a0604');
  tableSeam(ctx, 0.6, '#0a0606', false);
  // the front edge: the plate's thick lip, hazard-striped, the paint chipped and scorched
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, front, W, 1080 - front);
  ctx.clip();
  ctx.fillStyle = '#1a1410';
  ctx.fillRect(0, front, W, 1080 - front);
  for (let x = -80, i = 0; x < W + 80; x += 64, i++) {
    ctx.fillStyle = '#d8a818';
    ctx.beginPath();
    ctx.moveTo(x, front);
    ctx.lineTo(x + 32, front);
    ctx.lineTo(x - 12, 1080);
    ctx.lineTo(x - 44, 1080);
    ctx.closePath();
    ctx.fill();
  }
  grain(ctx, { x: 0, y: front, w: W, h: 1080 - front }, 'cast', 0.45, 1);
  lay(ctx, noiseMask(14, 95, { cover: 0.32, soft: 0.08, col: '#2a2018', w: 360, h: 18 }), { x: 0, y: front, w: W, h: 1080 - front }, 0.75);
  chips(ctx, r, 0, W, front + 2, 40, '#3a3028', 4);
  vfill(ctx, 0, front, W, 1080 - front, [[0, 'rgba(0,0,0,0.2)'], [1, 'rgba(0,0,0,0.55)']]);
  ctx.restore();
  ctx.fillStyle = rgba('#ffd8a0', 0.4);
  ctx.fillRect(0, front - 2, W, 2);
}

// ——— finishing ———

function grade(ctx: Ctx): void {
  gradeAll(ctx, 0.04, '#ff9a50', 0.05, { warm: '#ffb070', cool: '#4a5ab0', a: 0.26 });
}

function shadeOver(ctx: Ctx): void {
  // the HUD's corner calm, the lanes calm, a vignette
  const g = ctx.createRadialGradient(180, 70, 40, 180, 70, 520);
  g.addColorStop(0, 'rgba(8,4,4,0.45)');
  g.addColorStop(0.5, 'rgba(8,4,4,0.22)');
  g.addColorStop(1, 'rgba(8,4,4,0)');
  ctx.save();
  ctx.scale(1, 0.4);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 760, 520);
  ctx.restore();
  calmLanes(ctx, 0.12, '#0a0604', 160, 640);
  vignetteAll(ctx, 0.62, '#050203');
}

// ——— the stack ———

const LADLE_BOX = { x: 116, y: FD.hook.y - 6, w: 374, h: 324 };
const TUP_BOX = { x: HM.x - 70, y: HM.tupTop - 216, w: 150, h: 216 + HM.tupH + 30 };
const CHAIN_BOX = { x: FD.chain.x - 30, y: FD.girder.y1 - 4, w: 80, h: FD.chain.y1 - FD.girder.y1 + 60 };
const FLOW_BOX = { x: FD.runner.x0, y: FD.runner.y - 2, w: FD.runner.x1 - FD.runner.x0, h: FD.runner.h + 4 };
const SHIM_L = { x: 330, y: 440, w: 430, h: FD.runner.y - 6 - 440 };
const SHIM_R = { x: HM.x - 64, y: 470, w: 128, h: HM.billet - 2 - 470 };
const POUR_BOX = { x: FD.basin.x - 140, y: LIP0[1] - 20, w: 300, h: FD.floor - LIP0[1] + 20 };

export const FOUNDRY: SceneSpec = {
  id: 'ironheel',
  info: {
    name: 'The Foundry',
    subtitle: 'Boss: THE IRON HEEL',
    ambient: [],
    glows: [],
    light: '#ff9a50',
    tableTint: '#ffe0c8',
  },
  layers: [
    { id: 'outside', box: WIN_BOX, draw: outside },
    { id: 'wall', box: { x: 0, y: 0, w: W, h: TY + 2 }, draw: wall },
    { id: 'window', box: { x: WIN.x0 - 60, y: WIN.crown - 50, w: WIN.x1 - WIN.x0 + 260, h: TY - WIN.crown + 50 }, draw: windowFrame },
    { id: 'columns', box: { x: 0, y: FD.roof - 20, w: W, h: FD.floor - FD.roof + 40 }, draw: columns },
    { id: 'roof', box: { x: 0, y: 0, w: W, h: FD.hook.y + 20 }, draw: roof },
    { id: 'pipes', box: { x: 1700, y: FD.girder.y1 - 4, w: 220, h: 60 }, draw: pipes },
    { id: 'runner', box: { x: FD.runner.x0 - 20, y: FD.runner.y - 14, w: FD.runner.x1 - FD.runner.x0 + 40, h: FD.floor - FD.runner.y + 30 }, draw: runner },
    { id: 'runnerHeat', box: { x: FD.runner.x0 - 60, y: FD.runner.y - 40, w: FD.runner.x1 - FD.runner.x0 + 120, h: 80 }, draw: (c) => runnerHeat(c) },
    { id: 'flow', box: FLOW_BOX, motion: 'slot', draw: () => {} },
    { id: 'basin', box: { x: FD.basin.x - 80, y: FD.basin.y - 140, w: FD.runner.x0 - (FD.basin.x - 80), h: FD.floor - FD.basin.y + 156 }, draw: basin },
    { id: 'flask', box: { x: FD.runner.x1 + 2, y: FD.flask.y0 - 40, w: FD.flask.x1 - FD.runner.x1 + 30, h: FD.floor - FD.flask.y0 + 54 }, draw: flask },
    { id: 'hammer', box: { x: HM.x - 210, y: HM.head - 20, w: 440, h: TY - HM.head + 20 }, draw: hammerFrame },
    { id: 'shimmerL', box: SHIM_L, motion: 'slot', draw: () => {} },
    { id: 'shimmerR', box: SHIM_R, motion: 'slot', draw: () => {} },
    { id: 'tup', box: TUP_BOX, motion: 'sprite', draw: tup },
    { id: 'cylinder', box: { x: HM.x - 120, y: 0, w: 260, h: HM.head + 30 }, draw: cylinder },
    { id: 'chain', box: CHAIN_BOX, motion: 'sprite', draw: (c) => chain(c) },
    { id: 'ladle', box: LADLE_BOX, motion: 'sprite', draw: ladle },
    { id: 'pour', box: POUR_BOX, stillOnly: true, draw: (c) => pourStill(c) },
    { id: 'table', box: { x: 0, y: TY, w: W, h: 1080 - TY }, draw: table },
    { id: 'fx', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

// ——— live ———

function speckFrame(c: Ctx, i: number): void {
  // a grain of grit or scale: lit on its top left
  const pts = [[2, 6], [5, 2], [9, 3], [10, 8], [6, 10], [3, 9]].map(([x, y]) => [x + Math.sin(i * 3 + x) * 0.8, y + Math.cos(i * 2 + y) * 0.8]);
  c.fillStyle = '#5a4a44';
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts) c.lineTo(x, y);
  c.closePath();
  c.fill();
  c.fillStyle = 'rgba(255,210,170,0.6)';
  c.fillRect(4, 3, 3, 2);
}

registerKitScene(FOUNDRY, (k: KitLive) => {
  const fx = k.slot('fx');
  const flashes = () => save.settings.flashes && !save.settings.reducedMotion;
  const sparks = new Parts(k, { frame: 'spark', add: true, into: fx, max: 220 });
  const embers = new Parts(k, { frame: 'ember', add: true, into: fx, max: 60 });
  const scale = new Parts(k, { frame: 'ember', add: true, into: fx, max: 40 });
  const specKey = sheet(k, 'fd_speck', 12, 12, 4, (c, _p, i) => speckFrame(c, i));
  const grit = new Parts(k, { frame: 'mote', sheet: { key: specKey, n: 4, half: 6 }, into: fx, max: 120 });
  const dust = new Parts(k, { frame: 'puff', into: fx, max: 24 });
  const spark = (x: number, y: number, vx: number, vy: number, hot = 1, floor = FD.floor) =>
    sparks.spawn({ x, y, vx, vy, life: 0.9 + crand() * 0.9, r0: 2.2 + crand() * 1.6 * hot, r1: 1, a: 1, tint: crand() < 0.5 ? 0xfff0b0 : 0xffb050, grav: 1100, drag: 0.4, streak: 0.014, floor, bounce: 0.32 + crand() * 0.15, fade: 0.02 });

  // ——— the runner: molten iron flowing to the flask under a crust that thickens as it cools
  const tileW = 512;
  const TH = FD.runner.h + 4;
  const melt = k.tex('fd_melt', tileW, TH, (c) => {
    const g = c.createLinearGradient(0, 0, 0, TH);
    g.addColorStop(0, '#ffd070');
    g.addColorStop(0.35, '#ffb040');
    g.addColorStop(1, '#d0500e');
    c.fillStyle = g;
    c.fillRect(0, 0, tileW, TH);
    for (let i = 0; i < 34; i++) {
      const x = (i * 97) % tileW;
      const y = 2 + ((i * 53) % (TH - 5));
      const w = 24 + ((i * 31) % 60);
      for (const dx of [0, -tileW]) {
        const gg = c.createLinearGradient(x + dx, 0, x + dx + w, 0);
        gg.addColorStop(0, 'rgba(255,250,220,0)');
        gg.addColorStop(0.5, 'rgba(255,250,220,0.6)');
        gg.addColorStop(1, 'rgba(255,250,220,0)');
        c.fillStyle = gg;
        c.fillRect(x + dx, y, w, 2);
      }
    }
  });
  const crustTex = (key: string, n: number, seed: number) =>
    k.tex(key, tileW, TH, (c) => {
      for (let i = 0; i < n; i++) {
        const x = (i * 131 + seed * 17) % tileW;
        const y = ((i * 7 + seed) % (TH - 4)) + 2;
        const w = 14 + ((i * 47 + seed) % 40);
        const h = 4 + ((i * 13) % 6);
        for (const dx of [0, -tileW, tileW]) {
          c.fillStyle = `rgba(${48 + (i % 3) * 12},${20 + (i % 4) * 5},${10},0.9)`;
          c.beginPath();
          c.ellipse(x + dx, y, w / 2, h / 2, ((i % 5) - 2) * 0.08, 0, Math.PI * 2);
          c.fill();
          c.strokeStyle = 'rgba(255,150,50,0.55)';
          c.lineWidth = 1;
          c.stroke();
          c.fillStyle = 'rgba(160,110,90,0.35)';
          c.fillRect(x + dx - w * 0.3, y - h * 0.3, w * 0.35, 1);
        }
      }
    });
  const crustA = crustTex('fd_crustA', 30, 3);
  const crustB = crustTex('fd_crustB', 18, 11);
  const flow = new Flow(k, FLOW_BOX.x, FLOW_BOX.y, FLOW_BOX.w, FLOW_BOX.h, [
    { key: melt, v: 46 },
    { key: melt, v: 70, alpha: 0.5, add: true, wob: 2 },
    { key: crustA, v: 40 },
    { key: crustB, v: 34 },
  ], k.slot('flow'));
  const [mA, mB, cA, cB] = flow.images;
  // hottest by the basin; the crust closes over it downstream
  mA.setAlpha(1, 0.6, 1, 0.6);
  mB.setAlpha(0.7, 0.05, 0.7, 0.05);
  cA.setAlpha(0.25, 1, 0.25, 1);
  cB.setAlpha(0.05, 0.95, 0.05, 0.95);
  const runGlow = k.glow(820, FD.runner.y + 2, 520, 0xff6a10, 0.12, { into: fx, sy: 0.12 });

  // ——— the pour: the stream (painted frames), the splash crown, the fume, the light
  const streamKey = sheet(k, 'fd_stream', STR.w, STR.h, STR.n, (c, ph) => streamFrame(c, ph));
  const stream = new Loop(k, streamKey, STR.n, LIP0[0], LIP0[1], { into: fx, origin: [STR.lx / STR.w, STR.ly / STR.h], fps: 14 });
  const splashKey = sheet(k, 'fd_splash', SPL.w, SPL.h, SPL.n, (c, ph) => splashFrame(c, ph));
  const splash = new Loop(k, splashKey, SPL.n, FD.basin.x, FD.basin.y, { into: fx, origin: [SPL.cx / SPL.w, SPL.cy / SPL.h], fps: 16 });
  const fumeKey = sheet(k, 'fd_fume', FUME.w, FUME.h, FUME.n, (c, ph) => fumeFrame(c, FUME.w, FUME.h, ph));
  const fume = new Loop(k, fumeKey, FUME.n, FD.basin.x, FD.basin.y - 8, { into: fx, origin: [FUME.sx / FUME.w, 1], scale: 2, fps: 6 });
  const riserKey = sheet(k, 'fd_riser', 40, 110, 12, (c, ph) => smokeFrame(c, 40, 110, ph, { lit: '#ffb070', body: '#5a4a48', shade: '#1a1418', wind: 0.3, lobes: 7, a: 0.4, toLight: [0.2, 1], seed: 5 }));
  const riser = new Loop(k, riserKey, 12, FD.flask.x1 - 26, FD.flask.y0 - 2, { into: fx, origin: [0.5, 1], scale: 2, fps: 6 });
  const pourGlow = k.glow(FD.basin.x - 10, 480, 400, 0xff8a2a, 0.12, { into: fx, sy: 1 });
  const basinGlow = k.glow(FD.basin.x, FD.basin.y - 16, 100, 0xffb050, 0.35, { into: fx, sy: 0.35 });
  const lipGlow = k.glow(LIP0[0], LIP0[1], 60, 0xffd080, 0.4, { into: fx });
  const tablePool = k.glow(FD.basin.x + 40, TY + 40, 380, 0xff9a40, 0.08, { into: fx, sy: 0.18 });
  const sparkRate = new Rate();
  const emberRate = new Rate();
  let surge = 0;

  // ——— the ladle and the chain on their hooks
  const ladleImg = k.pivot(k.sprite('ladle'), FD.hook.x, FD.hook.y);
  const ladleSw = new Swing(ladleImg, { k: 3.2, c: 0.45, idle: 0.004, seed: 1, speed: 0.5 });
  const chainImg = k.pivot(k.sprite('chain'), FD.chain.x, FD.girder.y1);
  const chainSw = new Swing(chainImg, { k: 3.8, c: 0.35, idle: 0.01, seed: 3, speed: 0.6 });

  // ——— heat shimmer: the wall seen through the hot air over the basin and the billet, wavering (thin strips of
  // the painted base nudged sideways by a wave that climbs, faded in from the edges)
  const baseKey = `bgk_${FOUNDRY.id}_base`;
  type Strip = { a: Phaser.GameObjects.Image; b: Phaser.GameObjects.Image; v: number };
  const shimmer = (slot: string, box: { x: number; y: number; w: number; h: number }, rows: number) => {
    const c = k.slot(slot);
    const out: Strip[] = [];
    if (!k.sc.textures.exists(baseKey)) return out;
    const hS = box.h / rows;
    const half = box.w / 2;
    for (let i = 0; i < rows; i++) {
      const y = Math.round(box.y + i * hS);
      const h = Math.round(box.y + (i + 1) * hS) - y;
      const a = k.sc.add.image(0, 0, baseKey).setOrigin(0, 0).setCrop(box.x, y, half, h);
      const b = k.sc.add.image(0, 0, baseKey).setOrigin(0, 0).setCrop(box.x + half, y, box.w - half, h);
      a.setAlpha(0, 1, 0, 1);
      b.setAlpha(1, 0, 1, 0);
      c.add([a, b]);
      out.push({ a, b, v: (i + 0.5) / rows });
    }
    return out;
  };
  const shimL = shimmer('shimmerL', SHIM_L, 44);
  const shimR = shimmer('shimmerR', SHIM_R, 18);
  const waver = (ss: Strip[], h: number, amp: number, t: number) => {
    for (const s of ss) {
      const y = s.v * h;
      const env = Math.sin(Math.min(1, s.v * 1.15) * Math.PI * 0.5) * (0.35 + 0.65 * s.v) * Math.min(1, (1 - s.v) * 8 + 0.4);
      const o = amp * env * (Math.sin(y * 0.11 + t * 6.3) * 0.6 + Math.sin(y * 0.29 + t * 10.1 + 1.7) * 0.4);
      s.a.x = o;
      s.b.x = o;
    }
  };

  // ——— the steam hammer: the tup on its cycle, the billet, its steam
  const tupImg = k.sprite('tup');
  const tupY0 = tupImg.y;
  const billetGlow = k.glow(HM.x, HM.billet + 6, 110, 0xff8a30, 0.35, { into: fx, sy: 0.6 });
  const billetFlash = k.glow(HM.x, HM.billet + 4, 160, 0xfff0c0, 0, { into: fx, sy: 0.55 });
  const hammerPool = k.glow(HM.x, TY + 24, 260, 0xff9a40, 0.06, { into: fx, sy: 0.16 });
  // the blow: the billet white-hot for a frame or two and squashed flat under the die, the wall lit by it
  const billetHot = k.glow(HM.x, HM.billet + 9, 46, 0xffffff, 0, { into: fx, sy: 0.24 });
  const wallFlash = k.glow(HM.x, 500, 330, 0xff9a50, 0, { into: fx, sy: 0.8 });
  const tupX0 = tupImg.x;
  const steamKey = sheet(k, 'fd_steam', 70, 130, 12, (c, ph) => steamFrame(c, 70, 130, ph, { lit: '#fff6ea', body: '#d8d2d4', shade: '#6a6478', a: 0.62, n: 7, seed: 3 }));
  const cocks = [-1, 1].map((s, i) => {
    const l = new Loop(k, steamKey, 12, s < 0 ? HM.cyl.x0 - 18 : HM.cyl.x1 + 18, HM.cyl.y1 - 26, { into: fx, origin: [0.5, 1], scale: 1.4, fps: 16, phase: i * 6 });
    l.each((im) => im.setRotation(s * Math.PI * 0.42));
    return { l, a: 0 };
  });
  const exhaust = { l: new Loop(k, steamKey, 12, EXH.x - 1, EXH.y - 16, { into: fx, origin: [0.5, 1], scale: 1.8, fps: 10 }), a: 0 };
  exhaust.l.each((im) => im.setRotation(-0.8));
  // the cycle: blows in sets (sometimes two light ones then a heavy), each a lift, a hang, a fall and a bounce
  type Blow = { lift: number; heavy: number };
  let set: Blow[] = [];
  let phase: 'rest' | 'lift' | 'hang' | 'fall' = 'rest';
  let pt = 0;
  let restFor = 1.2;
  let blow: Blow = { lift: 1, heavy: 1 };
  let off = HM.drop;
  let bounceV = 0;
  let bounceX = 0;
  let liftFrom: number = HM.drop;
  let flash = 0;
  const strike = (s: number) => {
    flash = Math.max(flash, s);
    // sparks and burning scale off the billet, out to both sides, bouncing on the foundation and the floor
    const n = Math.round((20 + 44 * s) * (0.5 + 0.5 * calm()));
    for (let i = 0; i < n; i++) {
      const side = crand() < 0.5 ? -1 : 1;
      spark(HM.x + side * (20 + crand() * 16), HM.billet + 4 + crand() * 8, side * (120 + crand() * 520 * s), -60 - crand() * 380 * s, 1, FD.floor - 26 - (crand() < 0.4 ? 0 : -26));
    }
    for (let i = 0; i < 3 + s * 6; i++) {
      const side = crand() < 0.5 ? -1 : 1;
      scale.spawn({ x: HM.x + side * 30, y: HM.billet + 6, vx: side * (60 + crand() * 200), vy: -80 - crand() * 200, life: 1.8, r0: 3 + crand() * 2, r1: 2, a: 0.9, tint: 0xff6a20, grav: 800, drag: 0.6, floor: FD.floor - 26, bounce: 0.2, spin: (crand() - 0.5) * 10, fade: 0.02 });
    }
    // steam spat from the drain cocks, grit off the cross-head, dust off the foundation, the chain jolted
    for (const c of cocks) c.a = Math.max(c.a, 0.6 + s * 0.4);
    for (let i = 0; i < 2 + s * 6; i++) grit.spawn({ x: HM.x - 100 + crand() * 200, y: HM.head + 4, vx: (crand() - 0.5) * 30, vy: 20 + crand() * 30, life: 1.6, r0: 1 + crand() * 1.3, a: 0.8, tint: 0xa89a8e, grav: 700, drag: 0.4, floor: FD.floor - 26 });
    for (let i = 0; i < 2 + s * 4; i++) {
      const side = crand() < 0.5 ? -1 : 1;
      dust.spawn({ x: HM.x + side * (60 + crand() * 90), y: FD.floor - 28, vx: side * (30 + crand() * 70), vy: -8 - crand() * 14, life: 1.4, r0: 10, r1: 34 + s * 14, a: 0.12 + s * 0.08, tint: 0x6a5a50, drag: 1.4, fade: 0.15 });
    }
    chainSw.kick((crand() < 0.5 ? 1 : -1) * 0.05 * s);
    ladleSw.kick(0.008 * s);
    bounceV = -70 * s;
  };
  const nextSet = () => {
    set = crand() < 0.4 ? [{ lift: 0.4, heavy: 0.45 }, { lift: 0.4, heavy: 0.45 }, { lift: 1, heavy: 1 }] : [{ lift: 1, heavy: 1 }];
  };
  nextSet();

  return {
    impact(x, _y, p) {
      ladleSw.kick((x < FD.hook.x ? 1 : -1) * (0.03 + 0.07 * p));
      chainSw.kick((x < FD.chain.x ? 1 : -1) * (0.12 + 0.3 * p));
      surge = Math.min(1, surge + 0.4 + p * 0.6);
      for (let i = 0; i < 8 + p * 26; i++) spark(FD.basin.x + (crand() - 0.5) * 30, FD.basin.y - 6, (crand() - 0.3) * 520, -180 - crand() * 460);
      for (let i = 0; i < 3 + p * 12; i++) grit.spawn({ x: Math.max(30, Math.min(W - 30, x + (crand() - 0.5) * 800)), y: FD.girder.y1 + 2, vx: (crand() - 0.5) * 16, vy: 10 + crand() * 30, life: 2.4, r0: 1 + crand() * 1.5, a: 0.75, tint: 0xa89a8e, grav: 400, drag: 0.5, floor: FD.floor });
    },
    update(dt, t) {
      // ——— the ladle, the lip it pours from, the stream following it
      ladleSw.update(dt, t);
      chainSw.update(dt, t);
      const [lx, ly] = lipAt(ladleSw.angle);
      surge = Math.max(0, surge - dt * 0.9);
      const pour = 0.92 + wander(t, 7, 0.4) * 0.07 + surge * 0.22;
      stream.step(dt, 1 + surge * 0.4);
      stream.each((im) => im.setPosition(lx, ly).setScale(pour, (FD.basin.y - 2 - ly) / STR.len));
      lipGlow.setPosition(lx, ly).setAlpha(0.35 + surge * 0.2);
      splash.step(dt, 1 + surge * 0.6);
      splash.each((im) => im.setScale(0.9 + pour * 0.15 + surge * 0.2, 1 + surge * 0.3));
      const fl = flicker(t, 2);
      pourGlow.setAlpha((0.1 + fl * 0.03 + surge * 0.05) * (0.9 + pour * 0.1));
      basinGlow.setAlpha(0.26 + fl * 0.08 + surge * 0.16);
      tablePool.setAlpha(0.06 + fl * 0.02 + surge * 0.04);
      fume.step(dt, calm());
      fume.each((im) => im.setPosition(FD.basin.x + 4 + wander(t, 2, 0.2) * 6, FD.basin.y - 8));
      riser.step(dt, calm());
      // sparks spat from the splash, bouncing on the floor at the wall's foot; embers rising on the heat
      sparkRate.tick((9 + surge * 30) * calm(), dt, () => spark(FD.basin.x + (crand() - 0.5) * 20, FD.basin.y - 6, (crand() - 0.25) * 320, -120 - crand() * 340, 0.8));
      emberRate.tick(4 * calm(), dt, () => {
        const w = crand();
        const [ex, ey] = w < 0.5 ? [FD.basin.x + (crand() - 0.5) * 60, FD.basin.y - 10] : w < 0.8 ? [FD.runner.x0 + crand() * (FD.runner.x1 - FD.runner.x0), FD.runner.y] : [HM.x + (crand() - 0.5) * 60, HM.billet];
        embers.spawn({ x: ex, y: ey, vx: 10 + (crand() - 0.5) * 30, vy: -40 - crand() * 60, life: 2.5 + crand() * 2, r0: 1.6 + crand(), r1: 0.6, a: 0.85, tint: crand() < 0.5 ? 0xff9a3a : 0xffc060, drag: 0.3, grav: -8, fade: 0.1 });
      });
      // ——— the runner
      flow.update(dt, t, 1 + surge * 0.3);
      runGlow.setAlpha(0.075 + flicker(t * 0.5, 3) * 0.03 + surge * 0.03);
      // ——— shimmer
      waver(shimL, SHIM_L.h, 1.8 * calm(), t);
      waver(shimR, SHIM_R.h, 1.3 * calm(), t + 3);

      // ——— the steam hammer
      pt += dt;
      if (phase === 'rest') {
        // between sets the tup lifts clear of the work, so the billet glows between blows
        if (!set.length) {
          const u = Phaser.Math.Clamp((pt - 0.15) / 0.4, 0, 1);
          off = HM.drop - 40 * (u * u * (3 - 2 * u));
        }
        if (pt > restFor) {
          if (!set.length) nextSet();
          blow = set.shift()!;
          phase = 'lift';
          pt = 0;
          liftFrom = off;
        }
      } else if (phase === 'lift') {
        // steam in under the piston: the tup lifts, slow at first, easing to a stop at the top
        const dur = 0.5 + blow.lift * 0.75;
        const u = Math.min(1, pt / dur);
        const e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
        const top = HM.drop * (1 - blow.lift);
        off = liftFrom + (top - liftFrom) * e;
        if (u >= 1) {
          phase = 'hang';
          pt = 0;
          if (blow.heavy > 0.7) exhaust.a = 0.9;
        }
      } else if (phase === 'hang') {
        // it hangs at the top, cocks a hair higher (the valve reversing), and drops
        const dur = 0.18 + blow.heavy * 0.32;
        const u = Math.min(1, pt / dur);
        off = HM.drop * (1 - blow.lift) - Math.sin(u * Math.PI * 0.5) * 7 * blow.heavy;
        if (u >= 1) {
          phase = 'fall';
          pt = 0;
          bounceX = off;
        }
      } else {
        // driven down: accelerating all the way onto the billet
        const dur = 0.1 + 0.06 * blow.lift;
        const u = Math.min(1, pt / dur);
        off = bounceX + (HM.drop - bounceX) * u * u;
        if (u >= 1) {
          off = HM.drop;
          strike(blow.heavy);
          phase = 'rest';
          pt = 0;
          restFor = set.length ? 0.15 + crand() * 0.1 : 1.2 + crand() * 1.4;
          bounceX = 0;
        }
      }
      // the rebound off the billet, damped
      if (phase === 'rest') {
        bounceV += (-bounceX * 900 - bounceV * 22) * Math.min(dt, 1 / 30);
        bounceX += bounceV * Math.min(dt, 1 / 30);
        tupImg.y = tupY0 + off + Math.min(0, bounceX) * calm();
      } else tupImg.y = tupY0 + off;
      // held up there on steam, the tup trembles in its guides
      tupImg.x = tupX0 + (phase === 'hang' ? Math.sin(t * 90) * 1.2 * blow.heavy * calm() : 0);
      flash = Math.max(0, flash - dt * 4);
      const fk = flashes() ? 1 : 0.35;
      billetFlash.setAlpha(flash * 0.8 * fk);
      const hot = Math.max(0, flash - 0.55) / 0.45;
      billetHot.setAlpha(hot * 0.9 * fk).setScale((92 / 256) * (1 + hot * 0.35), (92 / 256) * 0.24 * (1 - hot * 0.3));
      wallFlash.setAlpha(flash * 0.13 * fk * (0.85 + Math.sin(t * 40) * 0.15));
      const near = 1 - Math.min(1, (HM.drop - off) / HM.drop);
      billetGlow.setAlpha(0.3 + flicker(t * 0.7, 6) * 0.06 + flash * 0.25 - near * 0.06);
      hammerPool.setAlpha(0.05 + flash * 0.1 * fk);
      for (const c of cocks) {
        c.a = Math.max(0, c.a - dt * 1.4);
        c.l.alpha = Math.min(1, c.a * 1.4) * 0.9;
        c.l.step(dt);
        c.l.each((im) => im.setScale(1.1 + (1 - c.a) * 0.9));
      }
      exhaust.a = Math.max(0, exhaust.a - dt * 0.6);
      exhaust.l.alpha = Math.min(1, exhaust.a * 1.5) * 0.55;
      exhaust.l.step(dt);
      exhaust.l.each((im) => im.setScale(1.5 + (1 - exhaust.a) * 1.2));

      sparks.update(dt);
      embers.update(dt);
      scale.update(dt);
      grit.update(dt);
      dust.update(dt);
    },
  };
});
