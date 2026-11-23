// Nonna's Pantry (Nonna's Slipper's arena, wave 35), redrawn with the location kit (src/art/scene): the cool back
// room off the kitchen, after dark, where Nonna keeps everything and keeps score. Lime-washed walls gone grey with
// damp (the plaster blown round the little barred window, the moon coming through it), the kitchen's black oak beam
// hung with salami and a prosciutto on an iron rail, a floor-to-ceiling dresser of passata, preserves, tins, pasta
// and flour on paper-lace shelves, wall shelves over a strip of the kitchen's majolica, the ragù on a gas ring, a
// basket of onions, a demijohn and a cheese, Nonna's beech worktable floured for the fight. And her rack: an oak board
// of empty pegs, a clean pale shape on it where each weapon hangs (the rolling pin, the great spoon, the slipper),
// because tonight she's using them all; a chalk tally of feet beside it.
// Live (hero animations): the one lamp swings on its flex, its pool of light, its cone in the dusty air and its pool
// on the table all swinging with it and the room's dark leaning away from it; a hard stomp makes the bulb stutter
// and the room dims with it. The ragù blubs through 16 painted frames under painted steam on painted gas. Stomps
// pour flour off the shelves in painted falls that splash on the boards below, sift dust out of the lamplight, and
// swing the meats on their strings.

import Phaser from 'phaser';
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
import { aoHalo, lampOnWall, shaft } from '../../art/scene/light';
import { board, brickPatch, panel, planksPlane, plaster, tableFalloff, tableSeam, varnish, woodGrain } from '../../art/scene/materials';
import { crack, drift, lay, softly, streaks } from '../../art/scene/paint';
import { bottle, hang, pendantLamp } from '../../art/scene/props';
import { skyFill, stars } from '../../art/scene/sky';
import { spec as specHi } from '../../art/style/kit';
import { makeCanvas, rgba, shade } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { calm, flicker, registerKitScene } from '../../game/sceneLive';
import { Loop, Parts, Rate, Swing, flameFrame, sheet, steamFrame } from '../../game/sceneAnim';

// ——— layout ———

export const NPX = {
  beam: 46,
  /** The lamp's flex hangs from the beam; y is its shade's rim. */
  lamp: { x: 960, y: 292 },
  win: { x0: 748, x1: 868, y0: 86, y1: 166 },
  rack: { x0: 724, x1: 1196, y0: 424, y1: 562 },
  tally: { x: 1222, y: 446 },
  /** The dresser on the left (floor to ceiling) and the wall shelves on the right. */
  shelvesL: { x0: 24, x1: 548, ys: [204, 344, 484] },
  shelvesR: { x0: 1372, x1: 1896, ys: [196, 336] },
  rail: { x0: 572, x1: 1366, y: 58 },
  meats: [
    { x: 606, len: 132, kind: 'salami' },
    { x: 664, len: 176, kind: 'salami' },
    { x: 1262, len: 214, kind: 'ham' },
    { x: 1328, len: 146, kind: 'salami' },
  ] as { x: number; len: number; kind: 'salami' | 'ham' }[],
  counter: 600,
  ring: { x: 1640, top: 572 },
  pot: { x: 1640, y: 574, w: 200, h: 126 },
  basket: { x: 250, y: 600 },
  front: 1040,
};

/** Where flour sacks stand on the shelves (x on shelf y): a stomp pours flour off the front of each. */
const SACKS: { x: number; y: number; drop: number }[] = [
  { x: 312, y: NPX.shelvesL.ys[0], drop: NPX.shelvesL.ys[1] - NPX.shelvesL.ys[0] },
  { x: 120, y: NPX.shelvesL.ys[1], drop: NPX.shelvesL.ys[2] - NPX.shelvesL.ys[1] },
  { x: 404, y: NPX.shelvesL.ys[2], drop: NPX.counter - NPX.shelvesL.ys[2] },
  { x: 1716, y: NPX.shelvesR.ys[0], drop: NPX.shelvesR.ys[1] - NPX.shelvesR.ys[0] },
  { x: 1452, y: NPX.shelvesR.ys[1], drop: NPX.counter - NPX.shelvesR.ys[1] },
];
const SACK_W = 62;

const WASH = '#aca290';
const OAK = '#4a2a16';
const LAMP_COL = '#ffc880';
/** The lamp's shade: the kitchen's green enamel. */
const ENAMEL = '#2e5a44';
const GAS: [string, string, string] = ['#1030b0', '#3a6ee0', '#9ec0f8'];

// ——— the room ———

function wall(ctx: Ctx, r: R): void {
  const box = { x: 0, y: 0, w: W, h: TY };
  plaster(ctx, r, box, WASH, { wash: 0.9, patina: 0.85, seed: 31, grime: { top: 110, left: 70, right: 70, bottom: 40, a: 0.5 }, cool: '#5a5448', warm: '#e8dcc4' });
  // damp: a tide line of salts low on the wall, a bloom spreading from under the window's sill
  softly(ctx, box, (g) => {
    g.fillStyle = 'rgba(70,74,56,0.2)';
    g.beginPath();
    g.ellipse(808, 250, 120, 110, 0, 0, Math.PI * 2);
    g.fill();
    const tg = g.createLinearGradient(0, 470, 0, 600);
    tg.addColorStop(0, 'rgba(60,64,48,0)');
    tg.addColorStop(0.6, 'rgba(60,64,48,0.18)');
    tg.addColorStop(1, 'rgba(40,36,28,0.3)');
    g.fillStyle = tg;
    g.fillRect(0, 470, W, 130);
  }, 0.125);
  // the salts' pale crust along the tide line
  ctx.strokeStyle = 'rgba(236,232,220,0.16)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 560; x <= 1372; x += 12) ctx.lineTo(x, 506 + Math.sin(x * 0.03) * 6 + Math.sin(x * 0.11) * 3);
  ctx.stroke();
  // the plaster blown off below the window where the damp got in: the brick under it
  brickPatch(ctx, r, 812, 214, 62, 34, ['#7a3e2a', '#8a4a30', '#6a3424', '#94563a'], '#8a8070', WASH, 40, 16);
  streaks(ctx, r, NPX.win.x0 + 6, NPX.win.y1 + 8, NPX.win.x1 - NPX.win.x0 - 12, 140, '#3a3a28', 0.18, 5);
  const cr = { col: '#3a2a18', lip: '#f0e4cc', w: 1.4, a: 0.5 };
  crack(ctx, r, NPX.win.x1 + 4, NPX.win.y0 - 2, -0.8, 70, cr);
  crack(ctx, r, NPX.win.x0 - 4, NPX.win.y1 + 4, 2.2, 60, cr);
  crack(ctx, r, 1140, NPX.beam + 2, 1.5, 100, cr);
  crack(ctx, r, 580, NPX.beam + 2, 1.7, 70, cr);
  // the light: a cellar's dark gathering at the ceiling and the corners
  vfill(ctx, 0, 0, W, TY, [[0, 'rgba(14,8,4,0.78)'], [0.25, 'rgba(14,8,4,0.5)'], [0.6, 'rgba(14,8,4,0.42)'], [1, 'rgba(14,8,4,0.6)']]);
  const sg = ctx.createLinearGradient(0, 0, W, 0);
  sg.addColorStop(0, 'rgba(10,6,4,0.45)');
  sg.addColorStop(0.3, 'rgba(10,6,4,0)');
  sg.addColorStop(0.7, 'rgba(10,6,4,0)');
  sg.addColorStop(1, 'rgba(10,6,4,0.45)');
  ctx.fillStyle = sg;
  ctx.fillRect(0, 0, W, TY);
  // the ceiling over the lamp stays dark (the shade throws its light down)
  ctx.save();
  ctx.translate(NPX.lamp.x, NPX.lamp.y - 60);
  ctx.scale(1, 0.5);
  const ag = ctx.createRadialGradient(0, 0, 40, 0, 0, 260);
  ag.addColorStop(0, 'rgba(10,4,2,0.25)');
  ag.addColorStop(1, 'rgba(10,4,2,0)');
  ctx.fillStyle = ag;
  ctx.fillRect(-260, -260, 520, 520);
  ctx.restore();
  cellarWindow(ctx, r);
  majolica(ctx, r);
  // the beam (the kitchen's black oak) and the rail under it
  crevice(ctx, 0, W, NPX.beam, 80, 0.6);
  board(ctx, r, 0, 0, W, NPX.beam, OAK);
  within(ctx, rectPath(0, 0, W, NPX.beam), () => lay(ctx, drift('#5a3a24', '#0a0402', 8, 47, 256, 16), { x: 0, y: 0, w: W, h: NPX.beam }, 0.55));
  ctx.fillStyle = rgba('#ffd8a0', 0.12);
  ctx.fillRect(0, NPX.beam - 5, W, 2);
  ctx.fillStyle = 'rgba(10,4,2,0.8)';
  ctx.fillRect(0, NPX.beam - 3, W, 3);
}

/** The little barred window high in the wall: a deep splayed reveal through the old wall, the night through it. */
function cellarWindow(ctx: Ctx, r: R): void {
  const w = NPX.win;
  const sp = 18;
  // the splay: the reveal widening to the wall face, lit on its lower and right faces by the moon
  const outer = polyPath([[w.x0 - sp, w.y0 - sp], [w.x1 + sp, w.y0 - sp], [w.x1 + sp, w.y1 + sp], [w.x0 - sp, w.y1 + sp]]);
  aoHalo(ctx, outer, 18, 0.35, '#0a0604', 6);
  within(ctx, outer, () => {
    ctx.fillStyle = '#5a5246';
    ctx.fillRect(w.x0 - sp, w.y0 - sp, w.x1 - w.x0 + sp * 2, w.y1 - w.y0 + sp * 2);
    // top and left faces in shade, bottom (the sill) and right lit cool
    ctx.fillStyle = 'rgba(14,10,8,0.6)';
    ctx.beginPath();
    ctx.moveTo(w.x0 - sp, w.y0 - sp);
    ctx.lineTo(w.x1 + sp, w.y0 - sp);
    ctx.lineTo(w.x1, w.y0);
    ctx.lineTo(w.x0, w.y0);
    ctx.lineTo(w.x0, w.y1);
    ctx.lineTo(w.x0 - sp, w.y1 + sp);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(150,170,210,0.22)';
    ctx.beginPath();
    ctx.moveTo(w.x0 - sp, w.y1 + sp);
    ctx.lineTo(w.x1 + sp, w.y1 + sp);
    ctx.lineTo(w.x1, w.y1);
    ctx.lineTo(w.x0, w.y1);
    ctx.closePath();
    ctx.fill();
    lay(ctx, drift('#8a8270', '#1a140e', 6, 19, 64, 32), { x: w.x0 - sp, y: w.y0 - sp, w: w.x1 - w.x0 + sp * 2, h: w.y1 - w.y0 + sp * 2 }, 0.3);
  });
  // the night: deep blue, a few stars, the moon's glow from up and to the left, a black line of a roof
  const glass = rectPath(w.x0, w.y0, w.x1 - w.x0, w.y1 - w.y0);
  within(ctx, glass, () => {
    skyFill(ctx, { x: w.x0, y: w.y0, w: w.x1 - w.x0, h: w.y1 - w.y0 }, [[0, '#121a3a'], [0.6, '#24305a'], [1, '#3a4470']], 0.04);
    glowAt(ctx, w.x0 + 10, w.y0 + 8, 70, '#c8d8ff', 0.4);
    stars(ctx, r, { x: w.x0, y: w.y0, w: w.x1 - w.x0, h: 40 }, 6, '#e8eeff');
    ctx.fillStyle = '#0a0c16';
    ctx.beginPath();
    ctx.moveTo(w.x0, w.y1);
    ctx.lineTo(w.x0, w.y1 - 18);
    ctx.lineTo(w.x0 + 50, w.y1 - 30);
    ctx.lineTo(w.x0 + 96, w.y1 - 22);
    ctx.lineTo(w.x1, w.y1 - 26);
    ctx.lineTo(w.x1, w.y1);
    ctx.fill();
    // dusty glass
    ctx.fillStyle = 'rgba(160,170,190,0.12)';
    ctx.fillRect(w.x0, w.y0, w.x1 - w.x0, w.y1 - w.y0);
  });
  // the bars: square iron, each lit cool on its left edge, a rust stain run from its foot
  for (let i = 1; i <= 3; i++) {
    const x = w.x0 + ((w.x1 - w.x0) * i) / 4;
    const bar = rectPath(x - 4, w.y0 - 6, 8, w.y1 - w.y0 + 12);
    castShadow(ctx, bar, 4, 4, 0.4);
    solid(ctx, bar, { x: x - 4, y: w.y0 - 6, w: 8, h: w.y1 - w.y0 + 12 }, 'iron', '#2a2a30', { depth: 0.2, line: 1.5 });
    ctx.fillStyle = 'rgba(110,50,20,0.25)';
    ctx.fillRect(x - 2, w.y1 + sp, 4, 30 + i * 6);
  }
  // a cobweb across the top corner
  ctx.strokeStyle = 'rgba(220,220,230,0.22)';
  ctx.lineWidth = 0.8;
  const cx = w.x0 - sp;
  const cy = w.y0 - sp;
  for (let k = 0; k < 5; k++) {
    const a = (k / 4) * Math.PI * 0.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * 44, cy + Math.sin(a) * 44);
    ctx.stroke();
  }
  for (const rr of [12, 22, 32, 40]) {
    ctx.beginPath();
    for (let k = 0; k <= 4; k++) {
      const a = (k / 4) * Math.PI * 0.5;
      const sag = k > 0 && k < 4 ? 2 : 0;
      ctx.lineTo(cx + Math.cos(a) * (rr - sag), cy + Math.sin(a) * (rr - sag));
    }
    ctx.stroke();
  }
}

/** The moon through the window: a cold shaft down across the dark, faint (the lamp is the light in here). */
function moonlight(ctx: Ctx, r: R): void {
  const w = NPX.win;
  shaft(ctx, r, [w.x0 + 6, w.y0 + 10, w.x1, w.y0 + 20], [960, NPX.counter, 1180, NPX.counter], '#b8ccff', 0.06, { streaks: 4, motes: 0 });
}

/** A strip of the kitchen's majolica behind the ragù on the ring: blue tiles, a gold quatrefoil on each. */
function majolica(ctx: Ctx, r: R): void {
  const x0 = NPX.shelvesR.x0 + 12;
  const x1 = W - 20;
  const y0 = NPX.shelvesR.ys[1] + 120;
  const y1 = NPX.counter;
  const s = 36;
  const box = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  const p = rectPath(box.x, box.y, box.w, box.h);
  aoHalo(ctx, p, 12, 0.3, '#0a0604', 4);
  within(ctx, p, () => {
    ctx.fillStyle = '#6a6458';
    ctx.fillRect(box.x, box.y, box.w, box.h);
    for (let y = y0; y < y1; y += s)
      for (let x = x0; x < x1; x += s) {
        const c = shade('#2c5288', (r() - 0.5) * 0.12);
        const g = ctx.createLinearGradient(x, y, x + s * 0.6, y + s);
        g.addColorStop(0, shade(c, 0.1));
        g.addColorStop(1, shade(c, -0.14));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.roundRect(x + 1.5, y + 1.5, s - 3, s - 3, 3);
        ctx.fill();
        const cx = x + s / 2 + (r() - 0.5) * 1.5;
        const cy = y + s / 2 + (r() - 0.5) * 1.5;
        ctx.fillStyle = shade('#c8963a', (r() - 0.5) * 0.15);
        for (let k = 0; k < 4; k++) {
          const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
          ctx.beginPath();
          ctx.ellipse(cx + Math.cos(a) * 6, cy + Math.sin(a) * 6, 4.6, 3.1, a, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#e6dcc0';
        ctx.beginPath();
        ctx.arc(cx, cy, 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(x + 3, y + 2.5, s - 6, 1.5);
      }
    lay(ctx, drift('#ffffff', '#0a1430', 9, 71, 128, 48), box, 0.2);
    // a chipped tile, grease spattered up from the pot, the tiles' far end in the dark
    ctx.fillStyle = '#d8ccb0';
    ctx.beginPath();
    ctx.moveTo(x0 + s * 9, y0);
    ctx.lineTo(x0 + s * 9 + 14, y0);
    ctx.lineTo(x0 + s * 9, y0 + 10);
    ctx.fill();
    softly(ctx, box, (g) => {
      g.fillStyle = 'rgba(80,30,10,0.35)';
      g.beginPath();
      g.ellipse(NPX.pot.x, NPX.pot.y - NPX.pot.h + 10, 150, 60, 0, 0, Math.PI * 2);
      g.fill();
    }, 0.25);
    vfill(ctx, box.x, box.y, box.w, box.h, [[0, 'rgba(14,8,4,0.7)'], [1, 'rgba(14,8,4,0.45)']]);
    const hg = ctx.createLinearGradient(x0, 0, x1, 0);
    hg.addColorStop(0, 'rgba(14,8,4,0)');
    hg.addColorStop(1, 'rgba(14,8,4,0.5)');
    ctx.fillStyle = hg;
    ctx.fillRect(box.x, box.y, box.w, box.h);
  });
  ctx.fillStyle = 'rgba(14,8,4,0.5)';
  ctx.fillRect(x0, y0 - 2, x1 - x0, 2);
}

// ——— the shelves ———

/** A run of shelves: stout planks with paper lace along their fronts, every inch of them full. Uprights (the dresser)
 * or iron brackets (wall shelves). */
function shelves(ctx: Ctx, r: R, x0: number, x1: number, ys: number[], uprights: boolean): void {
  const bottom = uprights ? NPX.counter : ys[ys.length - 1] + 18;
  if (uprights) {
    // the dresser's back: boards in the dark
    const back = rectPath(x0 + 10, NPX.beam, x1 - x0 - 20, bottom - NPX.beam);
    within(ctx, back, () => {
      board(ctx, r, x0 + 10, NPX.beam, x1 - x0 - 20, bottom - NPX.beam, '#3a2416', true);
      for (let x = x0 + 10; x < x1; x += 64) {
        ctx.fillStyle = 'rgba(8,4,2,0.55)';
        ctx.fillRect(x, NPX.beam, 2, bottom - NPX.beam);
      }
      vfill(ctx, x0, NPX.beam, x1 - x0, bottom - NPX.beam, [[0, 'rgba(8,4,2,0.55)'], [1, 'rgba(8,4,2,0.35)']]);
    });
  }
  for (let si = 0; si < ys.length; si++) {
    const y = ys[si];
    const top = si === 0 ? NPX.beam + 10 : ys[si - 1] + 18;
    // the shelf's back in shadow under the plank above
    crevice(ctx, x0 + 10, x1 - 10, top, 40, 0.55, '#0a0604');
    const sacks = SACKS.filter((s) => s.y === y && s.x > x0 && s.x < x1);
    let x = x0 + 34;
    while (x < x1 - 46) {
      const sk = sacks.find((s) => s.x - SACK_W / 2 - 6 < x + 50 && s.x + SACK_W / 2 > x);
      if (sk) {
        x = sk.x + SACK_W / 2 + 10;
        continue;
      }
      const roll = r();
      const room = y - top;
      if (roll < 0.3) {
        // a jar of preserves: peaches, cherries, peppers, artichokes, apricots
        const h = Math.min(room - 14, 58 + r() * 30);
        const col = ['#d8822a', '#7a1424', '#5a7a2a', '#8a8a3a', '#e0a030', '#a83a18'][Math.floor(r() * 6)];
        const wj = h * 0.62;
        if (x + wj > x1 - 30) break;
        bottle(ctx, x + wj / 2, y, h, col, { kind: 'jar', label: '#ece0c4', cork: r() < 0.5 ? '#e8dcc0' : '#c8a050', depth: 0.12 });
        x += wj + 8;
      } else if (roll < 0.5) {
        // tomato tins, stacked two high where there's room
        const n = room > 110 ? 2 : 1;
        for (let k = 0; k < n; k++) tin(ctx, x + 22, y - k * 46, 22, 44);
        x += 50;
      } else if (roll < 0.68) {
        // a bottle of passata or oil
        const oil = r() < 0.4;
        const h = Math.min(room - 10, 100 + r() * 16);
        bottle(ctx, x + 14, y, h, oil ? '#b8982a' : '#8a1a12', { kind: oil ? 'oil' : 'wine', label: '#f0e6cc', cork: oil ? '#c8b088' : '#e8e0d0', depth: 0.12 });
        x += 34;
      } else if (roll < 0.85) {
        // dried pasta in its blue paper packets, stood on end
        const n = 2 + Math.floor(r() * 2);
        for (let k = 0; k < n; k++) packet(ctx, x + k * 30, y, 28, Math.min(room - 14, 78 + r() * 8), r);
        x += n * 30 + 8;
      } else {
        // a stoneware crock with a cloth tied over it
        crock(ctx, x + 32, y, 30, Math.min(room - 14, 64));
        x += 70;
      }
    }
    for (const s of sacks) sack(ctx, s.x, y, Math.min(y - top - 12, 86));
    // the plank, its lit nosing, the paper lace along it, the shadow it throws on the wall below
    const pl = rectPath(x0, y, x1 - x0, 18);
    castShadow(ctx, pl, 18, 18, 0.6, '#0a0604');
    solid(ctx, pl, { x: x0, y, w: x1 - x0, h: 18 }, 'wood', '#5a3420', { depth: 0.12, line: 2.5, formSize: 6 });
    within(ctx, pl, () => {
      ctx.fillStyle = rgba('#ffd8a0', 0.22);
      ctx.fillRect(x0, y, x1 - x0, 2);
    });
    lace(ctx, x0 + 4, x1 - 4, y + 4);
    // flour spilt along the front where the sacks are
    for (const s of sacks) {
      ctx.fillStyle = 'rgba(244,238,226,0.75)';
      ctx.beginPath();
      ctx.ellipse(s.x + 8, y + 1, 34, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      // and caught in the lace's points below it
      for (let k = 0; k < 4; k++) {
        ctx.fillStyle = 'rgba(244,238,226,0.55)';
        ctx.beginPath();
        ctx.arc(s.x - 9 + k * 18, y + 14, 3.5, 0, Math.PI);
        ctx.fill();
      }
    }
  }
  if (uprights) {
    for (const x of [x0, x1 - 22]) {
      const up = rectPath(x, NPX.beam, 22, bottom - NPX.beam);
      castShadow(ctx, up, 14, 14, 0.5, '#0a0604');
      solid(ctx, up, { x, y: NPX.beam, w: 22, h: bottom - NPX.beam }, 'wood', '#4a2c18', { depth: 0.1, line: 2.5, formSize: 8 });
    }
    // the dresser's cornice against the beam
    const co = rectPath(x0 - 6, NPX.beam, x1 - x0 + 12, 16);
    castShadow(ctx, co, 10, 10, 0.5, '#0a0604');
    solid(ctx, co, { x: x0 - 6, y: NPX.beam, w: x1 - x0 + 12, h: 16 }, 'wood', '#4a2c18', { depth: 0.1, line: 2.5, formSize: 6 });
  } else {
    // iron brackets under each plank
    for (const y of ys)
      for (const bx of [x0 + 40, x1 - 40]) {
        const br = (c: Ctx) => {
          c.beginPath();
          c.moveTo(bx - 4, y + 16);
          c.lineTo(bx + 4, y + 16);
          c.lineTo(bx + 4, y + 66);
          c.quadraticCurveTo(bx + 2, y + 40, bx - 24, y + 18);
          c.closePath();
        };
        castShadow(ctx, br, 10, 8, 0.45, '#0a0604');
        solid(ctx, br, { x: bx - 26, y: y + 16, w: 32, h: 52 }, 'iron', '#2a2a2e', { depth: 0.12, line: 2 });
      }
  }
}

/** Paper lace along a shelf's front: Nonna's scalloped edging, cut with little holes, hanging in a fringe. */
function lace(ctx: Ctx, x0: number, x1: number, y: number): void {
  const s = 18;
  const fr = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x0, y);
    for (let x = x0; x < x1; x += s) c.arc(x + s / 2, y + 10, s / 2, Math.PI, 0, true);
    c.lineTo(x1, y);
    c.closePath();
  };
  castShadow(ctx, fr, 4, 3, 0.35, '#0a0604');
  ctx.fillStyle = '#d8cfbc';
  fr(ctx);
  ctx.fill();
  within(ctx, fr, () => {
    vfill(ctx, x0, y, x1 - x0, 20, [[0, 'rgba(255,248,230,0.25)'], [1, 'rgba(60,40,20,0.3)']]);
    // the punched holes
    ctx.fillStyle = 'rgba(40,24,12,0.65)';
    for (let x = x0; x < x1; x += s) {
      ctx.beginPath();
      ctx.arc(x + s / 2, y + 9, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(x + s / 2 - 0.8, y + 2, 1.6, 3);
    }
  });
  ctx.strokeStyle = 'rgba(60,40,20,0.35)';
  ctx.lineWidth = 1;
  fr(ctx);
  ctx.stroke();
}

/** A tomato tin: a steel cylinder, a red and cream label wrapping round it. */
function tin(ctx: Ctx, x: number, y: number, rw: number, h: number): void {
  const p = rrPath(x - rw, y - h, rw * 2, h, 3);
  castShadow(ctx, p, 8, 8, 0.45, '#0a0604');
  solid(ctx, p, { x: x - rw, y: y - h, w: rw * 2, h }, 'chrome', '#b8bcc4', { depth: 0.12, line: 2, formSize: 8 });
  within(ctx, p, () => {
    const g = ctx.createLinearGradient(x - rw, 0, x + rw, 0);
    g.addColorStop(0, '#6a1410');
    g.addColorStop(0.28, '#c8342a');
    g.addColorStop(0.7, '#9a2418');
    g.addColorStop(1, '#3a0806');
    ctx.fillStyle = g;
    ctx.fillRect(x - rw, y - h + 7, rw * 2, h - 14);
    ctx.fillStyle = 'rgba(230,214,186,0.8)';
    ctx.fillRect(x - rw, y - h * 0.6, rw * 2, h * 0.18);
    ctx.fillStyle = '#c8342a';
    ctx.beginPath();
    ctx.arc(x - 4, y - h * 0.51, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a7a2a';
    ctx.fillRect(x - 5, y - h * 0.58, 3, 2);
    // the cylinder's roll on the label
    const cg = ctx.createLinearGradient(x - rw, 0, x + rw, 0);
    cg.addColorStop(0, 'rgba(10,4,2,0.4)');
    cg.addColorStop(0.3, 'rgba(255,230,200,0.12)');
    cg.addColorStop(0.55, 'rgba(10,4,2,0)');
    cg.addColorStop(1, 'rgba(10,4,2,0.5)');
    ctx.fillStyle = cg;
    ctx.fillRect(x - rw, y - h, rw * 2, h);
  });
}

/** A packet of dried pasta: blue paper, a white window, folded top. */
function packet(ctx: Ctx, x: number, y: number, w: number, h: number, r: R): void {
  const p = polyPath([[x, y], [x + 1, y - h + 6], [x + w * 0.5, y - h], [x + w - 1, y - h + 6], [x + w, y]]);
  castShadow(ctx, p, 8, 8, 0.45, '#0a0604');
  const blue = r() < 0.7 ? '#2a4a9a' : '#b83a2a';
  solid(ctx, p, { x, y: y - h, w, h }, 'canvas', blue, { depth: 0.12, line: 2, formSize: 8, texA: 0.1 });
  within(ctx, p, () => {
    ctx.fillStyle = 'rgba(236,228,206,0.85)';
    ctx.fillRect(x + 5, y - h * 0.55, w - 10, h * 0.3);
    // the pasta through the window
    ctx.strokeStyle = 'rgba(220,170,80,0.9)';
    ctx.lineWidth = 2;
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.moveTo(x + 6 + k * 5, y - h * 0.53);
      ctx.lineTo(x + 6 + k * 5, y - h * 0.27);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(10,4,2,0.3)';
    ctx.fillRect(x + w * 0.6, y - h, w * 0.4, h);
  });
}

/** A stoneware crock, a cloth tied over its mouth with string. */
function crock(ctx: Ctx, x: number, y: number, rw: number, h: number): void {
  const body = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x - rw * 0.8, y - h * 0.82);
    c.quadraticCurveTo(x - rw * 1.05, y - h * 0.3, x - rw * 0.8, y);
    c.lineTo(x + rw * 0.8, y);
    c.quadraticCurveTo(x + rw * 1.05, y - h * 0.3, x + rw * 0.8, y - h * 0.82);
    c.closePath();
  };
  castShadow(ctx, body, 10, 10, 0.45, '#0a0604');
  solid(ctx, body, { x: x - rw * 1.05, y: y - h * 0.82, w: rw * 2.1, h: h * 0.82 }, 'enamel', '#a8683a', { depth: 0.12, line: 2.2, formSize: 12 });
  within(ctx, body, () => {
    ctx.fillStyle = 'rgba(230,200,150,0.45)';
    ctx.fillRect(x - rw * 1.1, y - h * 0.82, rw * 2.2, 7);
  });
  const cloth = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x - rw * 0.95, y - h * 0.7);
    c.quadraticCurveTo(x - rw, y - h * 0.95, x - rw * 0.3, y - h);
    c.quadraticCurveTo(x, y - h * 1.05, x + rw * 0.3, y - h);
    c.quadraticCurveTo(x + rw, y - h * 0.95, x + rw * 0.95, y - h * 0.7);
    c.quadraticCurveTo(x, y - h * 0.62, x - rw * 0.95, y - h * 0.7);
    c.closePath();
  };
  solid(ctx, cloth, { x: x - rw, y: y - h * 1.05, w: rw * 2, h: h * 0.43 }, 'canvas', '#e8dcc4', { depth: 0.12, line: 2, formSize: 8, texA: 0.15 });
  ctx.strokeStyle = '#8a6a3a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - rw * 0.85, y - h * 0.74);
  ctx.quadraticCurveTo(x, y - h * 0.68, x + rw * 0.85, y - h * 0.74);
  ctx.stroke();
}

/** A paper sack of flour slumped at a shelf's front edge, its corner torn, flour spilling down its side. */
function sack(ctx: Ctx, x: number, y: number, h: number): void {
  const w = SACK_W;
  const l = x - w / 2;
  const p = (c: Ctx) => {
    c.beginPath();
    c.moveTo(l, y);
    c.lineTo(l + 3, y - h * 0.8);
    c.quadraticCurveTo(l + 6, y - h, l + w * 0.4, y - h * 0.96);
    c.lineTo(l + w * 0.62, y - h * 0.9);
    c.quadraticCurveTo(l + w + 2, y - h * 0.84, l + w - 2, y - h * 0.55);
    c.quadraticCurveTo(l + w + 6, y - h * 0.2, l + w + 4, y);
    c.closePath();
  };
  castShadow(ctx, p, 10, 10, 0.5, '#0a0604');
  solid(ctx, p, { x: l, y: y - h, w: w + 6, h }, 'canvas', '#e4d8bc', { depth: 0.12, line: 2.2, formSize: 14, texA: 0.12 });
  within(ctx, p, () => {
    // the printed band (FARINA 00) and the creases of a half-used sack
    ctx.fillStyle = 'rgba(40,70,150,0.75)';
    ctx.fillRect(l + 8, y - h * 0.56, w - 12, 13);
    ctx.fillStyle = 'rgba(230,224,210,0.85)';
    for (let k = 0; k < 6; k++) ctx.fillRect(l + 12 + k * 7, y - h * 0.56 + 4, 4, 5);
    ctx.strokeStyle = 'rgba(80,60,30,0.3)';
    ctx.lineWidth = 1.5;
    for (const [a, b, c2, d] of [[0.2, 0.75, 0.5, 0.68], [0.55, 0.3, 0.85, 0.36], [0.15, 0.2, 0.4, 0.12]] as const) {
      ctx.beginPath();
      ctx.moveTo(l + w * a, y - h * b);
      ctx.lineTo(l + w * c2, y - h * d);
      ctx.stroke();
    }
    // flour caked down the torn side
    vfill(ctx, l + w * 0.6, y - h * 0.9, w * 0.5, h * 0.9, [[0, 'rgba(250,246,236,0.7)'], [1, 'rgba(250,246,236,0.3)']]);
  });
  // the tear, dark inside, and the little pile in front
  ctx.fillStyle = '#3a2a1a';
  ctx.beginPath();
  ctx.moveTo(l + w * 0.62, y - h * 0.9);
  ctx.quadraticCurveTo(l + w * 0.85, y - h * 0.86, l + w - 2, y - h * 0.58);
  ctx.quadraticCurveTo(l + w * 0.8, y - h * 0.72, l + w * 0.62, y - h * 0.9);
  ctx.fill();
  ctx.fillStyle = 'rgba(248,244,234,0.9)';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.42, y - 3, 20, 5, 0, Math.PI, 0);
  ctx.fill();
}

// ——— Nonna's rack, and her tally ———

/** An oak board of pegs on the wall: every weapon gone tonight, a pale clean shape where each one hangs. */
function rack(ctx: Ctx, r: R): void {
  const k = NPX.rack;
  const bx = { x: k.x0, y: k.y0, w: k.x1 - k.x0, h: k.y1 - k.y0 };
  const b = rrPath(k.x0, k.y0, bx.w, bx.h, 8);
  aoHalo(ctx, b, 24, 0.45, '#0a0402', 8);
  castShadow(ctx, b, 16, 18, 0.55, '#0a0604');
  solid(ctx, b, bx, 'wood', '#5a3620', { depth: 0.12, line: 3, formSize: 20 });
  const pin = rrPath(k.x0 + 56, k.y0 + 28, 360, 24, 12);
  const pinH = [rrPath(k.x0 + 22, k.y0 + 33, 40, 14, 7), rrPath(k.x0 + 410, k.y0 + 33, 40, 14, 7)];
  const spoon = (c: Ctx) => {
    c.beginPath();
    c.moveTo(k.x0 + 40, k.y0 + 116);
    c.lineTo(k.x0 + 222, k.y0 + 88);
    c.bezierCurveTo(k.x0 + 238, k.y0 + 60, k.x0 + 316, k.y0 + 54, k.x0 + 326, k.y0 + 86);
    c.bezierCurveTo(k.x0 + 332, k.y0 + 116, k.x0 + 262, k.y0 + 124, k.x0 + 230, k.y0 + 106);
    c.lineTo(k.x0 + 44, k.y0 + 128);
    c.closePath();
  };
  const sx = k.x1 - 74;
  const sy = k.y0 + 96;
  const slipper = (c: Ctx) => {
    c.beginPath();
    c.moveTo(sx - 54, sy);
    c.bezierCurveTo(sx - 54, sy - 22, sx - 18, sy - 22, sx, sy - 14);
    c.bezierCurveTo(sx + 18, sy - 9, sx + 52, sy - 18, sx + 54, sy);
    c.bezierCurveTo(sx + 52, sy + 17, sx + 18, sy + 10, sx, sy + 14);
    c.bezierCurveTo(sx - 18, sy + 20, sx - 54, sy + 20, sx - 54, sy);
    c.closePath();
  };
  const shapes = [pin, ...pinH, spoon, slipper];
  within(ctx, b, () => {
    woodGrain(ctx, r, bx, '#5a3620');
    // years of kitchen smoke and dust darkened the board everywhere except where the weapons hang
    const dark = makeCanvas(bx.w, bx.h);
    const dg = dark[1];
    dg.translate(-bx.x, -bx.y);
    dg.fillStyle = 'rgba(26,14,6,0.5)';
    dg.fillRect(bx.x, bx.y, bx.w, bx.h);
    lay(dg, drift('#6a5440', '#140a04', 9, 37, 128, 48), bx, 0.35);
    dg.globalCompositeOperation = 'destination-out';
    dg.fillStyle = '#000';
    for (const s of shapes) {
      s(dg);
      dg.fill();
    }
    ctx.drawImage(dark[0], bx.x, bx.y);
    // each clean shape has a dust line round it (a soft rim where the dust banked against the edge)
    ctx.strokeStyle = 'rgba(200,180,150,0.22)';
    ctx.lineWidth = 2;
    for (const s of shapes) {
      s(ctx);
      ctx.stroke();
    }
    varnish(ctx, bx, [{ x: NPX.lamp.x, a: 0.35, w: 120, col: '#ffd8a0' }]);
  });
  const peg = (x: number, y: number) => {
    const p = ellPath(x, y, 7, 7);
    castShadow(ctx, p, 7, 5, 0.55, '#0a0604');
    solid(ctx, p, { x: x - 7, y: y - 7, w: 14, h: 14 }, 'wood', '#2a1810', { depth: 0.1, line: 2 });
    specHi(ctx, x - 2, y - 3, 2.5, 1.4, 0.5, -0.6);
  };
  // the rolling pin's pegs, the spoon's, the slipper's
  peg(k.x0 + 100, k.y0 + 58);
  peg(k.x0 + 372, k.y0 + 58);
  peg(k.x0 + 70, k.y0 + 128);
  peg(k.x0 + 250, k.y0 + 120);
  peg(sx - 16, sy - 24);
  // iron screws at the board's corners
  for (const [x, y] of [[k.x0 + 14, k.y0 + 14], [k.x1 - 14, k.y0 + 14], [k.x0 + 14, k.y1 - 14], [k.x1 - 14, k.y1 - 14]]) {
    ctx.fillStyle = '#1a1210';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,220,170,0.3)';
    ctx.fillRect(x - 2.5, y - 1, 5, 1.2);
  }
}

/** Nonna's tally, chalked on the plaster beside her rack: a little foot, then the score, in fives. */
function tally(ctx: Ctx, r: R): void {
  const { x, y } = NPX.tally;
  ctx.save();
  ctx.strokeStyle = 'rgba(236,232,220,0.32)';
  ctx.lineWidth = 2.6;
  // the foot: a sole and five toes
  ctx.beginPath();
  ctx.ellipse(x + 26, y + 26, 13, 22, -0.15, 0, Math.PI * 2);
  ctx.stroke();
  for (const [dx, dy, rr] of [[14, 0, 4.5], [24, -3, 3.6], [32, -1, 3.2], [39, 3, 2.8], [44, 9, 2.4]]) {
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, rr, 0, Math.PI * 2);
    ctx.stroke();
  }
  // the score: rows of five, the fifth struck through
  for (let row = 0; row < 4; row++) {
    const groups = row < 3 ? 2 : 1;
    for (let g = 0; g < groups; g++) {
      const gx = x + 4 + g * 58;
      const gy = y + 62 + row * 32;
      const n = row === 3 ? 3 : 5;
      for (let i = 0; i < Math.min(4, n); i++) {
        ctx.beginPath();
        ctx.moveTo(gx + i * 10 + (r() - 0.5) * 2, gy);
        ctx.lineTo(gx + i * 10 + (r() - 0.5) * 3, gy + 24);
        ctx.stroke();
      }
      if (n === 5) {
        ctx.beginPath();
        ctx.moveTo(gx - 4, gy + 20);
        ctx.lineTo(gx + 38, gy + 4);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
  // a chalk smear where she rubbed one out, and the stub of chalk on a nail
  ctx.fillStyle = 'rgba(236,232,220,0.08)';
  ctx.fillRect(x + 66, y + 158, 34, 18);
}

// ——— the meats ———

/** A cured sausage (or the prosciutto) hung by its string from the rail. */
function meat(ctx: Ctx, r: R, i: number): void {
  const m = NPX.meats[i];
  const y0 = NPX.rail.y + 4;
  // the S-hook and the string
  ctx.strokeStyle = '#1a1412';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(m.x, y0 - 2, 5, Math.PI, Math.PI * 2.3);
  ctx.stroke();
  hang(ctx, m.x, y0 + 3, m.x, y0 + 26, 0, '#d8c8a0', 2);
  const top = y0 + 24;
  const path = m.kind === 'ham'
    ? (c: Ctx) => {
      c.beginPath();
      c.moveTo(m.x - 9, top);
      c.bezierCurveTo(m.x - 20, top + 40, m.x - 58, top + 120, m.x - 42, top + m.len);
      c.quadraticCurveTo(m.x, top + m.len + 28, m.x + 42, top + m.len - 4);
      c.bezierCurveTo(m.x + 56, top + 110, m.x + 18, top + 40, m.x + 9, top);
      c.closePath();
    }
    : (c: Ctx) => {
      // a salami: plump, a little bent, pinched at the tie
      c.beginPath();
      c.moveTo(m.x - 6, top);
      c.bezierCurveTo(m.x - 18, top + 10, m.x - 19, top + m.len * 0.5, m.x - 15, top + m.len - 8);
      c.quadraticCurveTo(m.x - 2, top + m.len + 8, m.x + 15, top + m.len - 10);
      c.bezierCurveTo(m.x + 20, top + m.len * 0.5, m.x + 18, top + 10, m.x + 6, top);
      c.closePath();
    };
  const box = { x: m.x - 58, y: top, w: 116, h: m.len + 28 };
  castShadow(ctx, path, 20, 18, 0.55, '#0a0604');
  solid(ctx, path, box, 'leather', m.kind === 'ham' ? '#a8503a' : '#7a2420', { depth: 0.1, line: 2.8, formSize: m.kind === 'ham' ? 30 : 12 });
  within(ctx, path, () => {
    if (m.kind === 'salami') {
      // the cure's white bloom in patches, the netting of string
      lay(ctx, drift('#f0e8d8', '#7a2420', 4, 11 + i, 24, 64), box, 0.35);
      ctx.strokeStyle = 'rgba(236,224,196,0.7)';
      ctx.lineWidth = 1.4;
      for (let y = top + 12; y < top + m.len; y += 15) {
        ctx.beginPath();
        ctx.moveTo(m.x - 20, y);
        ctx.quadraticCurveTo(m.x, y + 6, m.x + 20, y);
        ctx.stroke();
      }
      for (const dx of [-7, 7]) {
        ctx.beginPath();
        ctx.moveTo(m.x + dx * 0.4, top);
        ctx.quadraticCurveTo(m.x + dx * 1.6, top + m.len * 0.5, m.x + dx * 0.6, top + m.len);
        ctx.stroke();
      }
    } else {
      // the rind's sheen and the cut face of the leg showing pink and fat-white at the bottom
      lay(ctx, drift('#e8a070', '#5a2010', 5, 23, 32, 64), box, 0.3);
      ctx.fillStyle = '#d87a6a';
      ctx.beginPath();
      ctx.ellipse(m.x + 6, top + m.len - 16, 28, 15, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f6ecdc';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(m.x + 6, top + m.len - 16, 28, 15, 0.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,240,230,0.4)';
      ctx.beginPath();
      ctx.ellipse(m.x, top + m.len - 20, 10, 5, 0.3, 0, Math.PI * 2);
      ctx.fill();
      // the string's binding round its shank
      ctx.strokeStyle = 'rgba(236,224,196,0.8)';
      ctx.lineWidth = 2;
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.moveTo(m.x - 12 - k * 2, top + 10 + k * 7);
        ctx.lineTo(m.x + 12 + k * 2, top + 14 + k * 7);
        ctx.stroke();
      }
    }
  });
  // the lamp catches the side towards it
  const toward = m.x < NPX.lamp.x ? 1 : -1;
  within(ctx, path, () => {
    const g = ctx.createLinearGradient(m.x - toward * 30, 0, m.x + toward * 30, 0);
    g.addColorStop(0, 'rgba(255,200,140,0)');
    g.addColorStop(1, 'rgba(255,200,140,0.28)');
    ctx.fillStyle = g;
    ctx.fillRect(box.x, box.y, box.w, box.h);
  });
  rim(ctx, path, 0.25, 3, '#ffd0a0');
  void r;
}
const MEAT_BOX = (i: number) => {
  const m = NPX.meats[i];
  return { x: m.x - 66, y: NPX.rail.y - 10, w: 132 + 34, h: m.len + 96 };
};

/** The iron rail along the beam the meats hang from. */
function railBar(ctx: Ctx): void {
  const { x0, x1, y } = NPX.rail;
  const bar = rrPath(x0, y - 3, x1 - x0, 7, 3);
  castShadow(ctx, bar, 10, 8, 0.5, '#0a0604');
  solid(ctx, bar, { x: x0, y: y - 3, w: x1 - x0, h: 7 }, 'iron', '#2a2626', { depth: 0.12, line: 1.8 });
  for (const x of [x0 + 10, (x0 + x1) / 2, x1 - 10]) {
    ctx.fillStyle = '#1a1412';
    ctx.fillRect(x - 3, NPX.beam - 2, 6, y - NPX.beam + 2);
  }
}

// ——— the worktop, the ragù, the basket ———

function counter(ctx: Ctx, r: R): void {
  const y = NPX.counter;
  const body = rectPath(0, y + 18, W, TY - y - 14);
  solid(ctx, body, { x: 0, y: y + 18, w: W, h: TY - y - 14 }, 'wood', '#4a2a16', { depth: 0.08, line: false, formSize: 20 });
  for (let x = 24; x < W - 100; x += 238) {
    panel(ctx, r, x, y + 38, 214, TY - y - 56, '#4e2c18', { lights: [{ x: NPX.lamp.x, a: 0.22 }] });
    // an iron drop-pull on each door
    const px = x + 107;
    ctx.fillStyle = '#1a1412';
    ctx.beginPath();
    ctx.arc(px, y + 54, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2a2420';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(px, y + 62, 8, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }
  // the dark under the worktop's overhang and along the kick
  vfill(ctx, 0, y + 18, W, TY - y - 14, [[0, 'rgba(8,4,2,0.55)'], [0.25, 'rgba(8,4,2,0.3)'], [1, 'rgba(8,4,2,0.5)']]);
  // the lamp reaches the doors under it; they fall into the dark towards the room's ends
  lightPool(ctx, NPX.lamp.x, y + 90, 520, 110, '#ffb868', 0.16);
  const cg = ctx.createLinearGradient(0, 0, W, 0);
  cg.addColorStop(0, 'rgba(8,4,2,0.45)');
  cg.addColorStop(0.32, 'rgba(8,4,2,0.05)');
  cg.addColorStop(0.68, 'rgba(8,4,2,0.05)');
  cg.addColorStop(1, 'rgba(8,4,2,0.45)');
  ctx.fillStyle = cg;
  ctx.fillRect(0, y + 18, W, TY - y - 14);
  // scuffs along the kick where feet (and slippers) knocked it
  for (const sx of [380, 902, 1130, 1530]) {
    ctx.fillStyle = 'rgba(200,160,120,0.1)';
    ctx.beginPath();
    ctx.ellipse(sx, TY - 10, 40, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const top = rectPath(0, y, W, 22);
  castShadow(ctx, top, 12, 14, 0.6, '#0a0604');
  solid(ctx, top, { x: 0, y, w: W, h: 22 }, 'wood', '#8a5630', { depth: 0.08, line: 2.5, formSize: 6 });
  varnish(ctx, { x: 0, y, w: W, h: 8 }, [{ x: NPX.lamp.x, a: 0.5, w: 260, col: '#ffd8a0' }]);
  ctx.fillStyle = rgba('#ffe0b0', 0.2);
  ctx.fillRect(0, y, W, 2);
  crevice(ctx, 0, W, y, -36, 0.5, '#0a0604');
  creviceV(ctx, 0, 0, y, 90, 0.45);
  creviceV(ctx, W, 0, y, -90, 0.45);
}

/** The ragù on its gas ring: a dented aluminium stockpot on a cast-iron ring, a ladle hooked over the rim. */
function pot(ctx: Ctx): void {
  const p = NPX.pot;
  const g = NPX.ring;
  // the ring: a squat iron drum on three feet, pan supports up from its crown
  groundShadow(ctx, g.x + 10, NPX.counter, 130, 9, 0.6, '#0a0604');
  const drum = rrPath(g.x - 92, g.top + 6, 184, NPX.counter - g.top - 10, 5);
  solid(ctx, drum, { x: g.x - 92, y: g.top + 6, w: 184, h: NPX.counter - g.top - 10 }, 'iron', '#2a2626', { depth: 0.08, line: 2.5 });
  for (const fx of [g.x - 80, g.x + 74]) {
    ctx.fillStyle = '#141212';
    ctx.fillRect(fx, NPX.counter - 6, 8, 6);
  }
  ctx.fillStyle = 'rgba(255,200,150,0.18)';
  ctx.fillRect(g.x - 90, g.top + 7, 180, 1.5);
  // the burner's brass tap on the front
  const tap = ellPath(g.x + 60, g.top + 16, 6, 6);
  solid(ctx, tap, { x: g.x + 54, y: g.top + 10, w: 12, h: 12 }, 'chrome', '#b88a3a', { depth: 0.08, line: 1.5 });
  // the pot
  const top = p.y - p.h;
  const body = (c: Ctx) => {
    c.beginPath();
    c.moveTo(p.x - p.w / 2, top);
    c.lineTo(p.x - p.w / 2 + 4, p.y - 10);
    c.quadraticCurveTo(p.x, p.y + 2, p.x + p.w / 2 - 4, p.y - 10);
    c.lineTo(p.x + p.w / 2, top);
    c.closePath();
  };
  castShadow(ctx, body, 18, 18, 0.55, '#0a0604');
  solid(ctx, body, { x: p.x - p.w / 2, y: top, w: p.w, h: p.h }, 'chrome', '#9aa0a8', { depth: 0.08, formSize: 40, line: 3.5 });
  within(ctx, body, () => {
    // aluminium: soft bands of the room, the lamp's warm streak on the side towards it, the dents
    const bg = ctx.createLinearGradient(p.x - p.w / 2, 0, p.x + p.w / 2, 0);
    bg.addColorStop(0, 'rgba(255,210,150,0.4)');
    bg.addColorStop(0.12, 'rgba(255,210,150,0.12)');
    bg.addColorStop(0.3, 'rgba(10,10,20,0.1)');
    bg.addColorStop(0.5, 'rgba(10,10,20,0.35)');
    bg.addColorStop(0.75, 'rgba(10,10,20,0.15)');
    bg.addColorStop(1, 'rgba(10,10,20,0.6)');
    ctx.fillStyle = bg;
    ctx.fillRect(p.x - p.w / 2, top, p.w, p.h);
    ctx.fillStyle = 'rgba(255,236,210,0.55)';
    ctx.fillRect(p.x - p.w / 2 + 20, top + 8, 3, p.h - 22);
    for (const [dx, dy, s] of [[34, 52, 10], [-58, 86, 7]]) {
      ctx.fillStyle = 'rgba(10,10,20,0.22)';
      ctx.beginPath();
      ctx.ellipse(p.x + dx - 2, top + dy - 2, s, s * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,240,220,0.18)';
      ctx.beginPath();
      ctx.ellipse(p.x + dx + 3, top + dy + 3, s * 0.6, s * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // ragù run down the side, the gas's blue on the bottom, soot on the base
    ctx.fillStyle = 'rgba(96,18,8,0.7)';
    ctx.beginPath();
    ctx.moveTo(p.x - 42, top);
    ctx.quadraticCurveTo(p.x - 39, top + 22, p.x - 41, top + 34);
    ctx.quadraticCurveTo(p.x - 45, top + 22, p.x - 47, top);
    ctx.fill();
    vfill(ctx, p.x - p.w / 2, p.y - 34, p.w, 34, [[0, 'rgba(80,140,255,0)'], [0.6, 'rgba(20,16,20,0.4)'], [1, 'rgba(80,140,255,0.35)']]);
  });
  rim(ctx, body, 0.35, 4, '#ffd8a8');
  // the handles
  for (const s of [-1, 1]) {
    const hx = p.x + s * (p.w / 2 + 12);
    const hd = rrPath(hx - 14, top + 16, 28, 12, 6);
    castShadow(ctx, hd, 6, 5, 0.45, '#0a0604');
    solid(ctx, hd, { x: hx - 14, y: top + 16, w: 28, h: 12 }, 'iron', '#2a2426', { depth: 0.08, line: 2 });
  }
  ragu(ctx, 0);
}
const RAGU_BOX = { x: NPX.pot.x - NPX.pot.w / 2 - 6, y: NPX.pot.y - NPX.pot.h - 22, w: NPX.pot.w + 12, h: 42 };

/** The ragù's surface at a blubbing phase (0…1 loops): thick and dark, turning slowly, oil pooled in amber beads,
 * fat slow bubbles that dome up glossy, stretch and burst into a crater with a lip of sauce thrown up; the ladle's
 * handle hooked over the rim. Paints in screen space (inside RAGU_BOX). */
function ragu(ctx: Ctx, phase: number): void {
  const p = NPX.pot;
  const cx = p.x;
  const cy = p.y - p.h;
  const rx = p.w / 2 - 5;
  const ry = 14;
  const P = Math.PI * 2;
  ctx.save();
  // the rim seen from above: the lip's metal, the inside wall at the back
  ctx.beginPath();
  ctx.ellipse(cx, cy, p.w / 2 + 2, ry + 4, 0, 0, P);
  ctx.fillStyle = '#c8ccd4';
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx, cy + 0.5, p.w / 2 - 2, ry + 2, 0, 0, P);
  ctx.fillStyle = '#3a3638';
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx, cy + 3, rx, ry, 0, 0, P);
  ctx.save();
  ctx.clip();
  const g = ctx.createRadialGradient(cx - 24, cy, 4, cx, cy + 3, rx);
  g.addColorStop(0, '#8a2410');
  g.addColorStop(0.6, '#5e1408');
  g.addColorStop(1, '#220602');
  ctx.fillStyle = g;
  ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2 + 6);
  // the slow roll: oil beads and bits of soffritto carried round
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * P + phase * P;
    const rr = 0.2 + ((i * 37) % 10) / 13;
    const x = cx + Math.cos(a) * rx * rr;
    const y = cy + 3 + Math.sin(a) * ry * rr * 0.9;
    const oil = i % 3 !== 0;
    ctx.fillStyle = oil ? 'rgba(230,120,40,0.3)' : 'rgba(40,10,4,0.5)';
    ctx.beginPath();
    ctx.ellipse(x, y, oil ? 3 : 2.4, oil ? 1.2 : 1, 0, 0, P);
    ctx.fill();
    if (oil) {
      ctx.fillStyle = 'rgba(255,236,200,0.55)';
      ctx.fillRect(x - 1, y - 1, 1.5, 1);
    }
  }
  // fat bubbles, each on its own beat
  const B: [number, number, number, number, number][] = [[-0.4, 0.1, 1.2, 1, 0], [0.18, 0.15, 1.4, 1, 0.5], [0.55, 0.3, 0.9, 2, 0.25], [-0.7, 0.0, 0.8, 2, 0.7], [0.0, 0.45, 0.8, 2, 0.1]];
  for (const [ux, uy, sz, beats, off] of B) {
    const u = (phase * beats + off) % 1;
    const bx = cx + ux * rx;
    const by = cy + 3 + uy * ry;
    if (u < 0.72) {
      const k = u / 0.72;
      const s = (2 + k ** 1.4 * 7) * sz;
      ctx.fillStyle = 'rgba(30,4,2,0.5)';
      ctx.beginPath();
      ctx.ellipse(bx + s * 0.15, by + s * 0.2, s * 1.05, s * 0.45, 0, 0, P);
      ctx.fill();
      const dg = ctx.createRadialGradient(bx - s * 0.35, by - s * 0.55, 0, bx, by - s * 0.25, s);
      dg.addColorStop(0, '#b8401e');
      dg.addColorStop(0.6, '#7a1a0a');
      dg.addColorStop(1, '#3e0c04');
      ctx.fillStyle = dg;
      ctx.beginPath();
      ctx.ellipse(bx, by - s * 0.25, s, s * 0.62 * (1 + k * 0.15), 0, Math.PI, 0);
      ctx.ellipse(bx, by - s * 0.25, s, s * 0.25, 0, 0, Math.PI);
      ctx.fill();
      // the lamp caught on its dome
      ctx.fillStyle = `rgba(255,226,180,${(0.5 + k * 0.4).toFixed(2)})`;
      ctx.beginPath();
      ctx.ellipse(bx - s * 0.35, by - s * 0.6, s * 0.22, s * 0.1, -0.5, 0, P);
      ctx.fill();
    } else {
      // burst: a dark crater, a lip of sauce thrown up and falling back, a ring spreading
      const k = (u - 0.72) / 0.28;
      const s = 10 * sz;
      ctx.fillStyle = `rgba(30,4,2,${(0.6 * (1 - k)).toFixed(2)})`;
      ctx.beginPath();
      ctx.ellipse(bx, by, s * (0.7 + k * 0.4), s * 0.3, 0, 0, P);
      ctx.fill();
      ctx.strokeStyle = `rgba(200,70,30,${(0.6 * (1 - k)).toFixed(2)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(bx, by, s * (0.9 + k * 1.2), s * (0.35 + k * 0.4), 0, 0, P);
      ctx.stroke();
      for (let j = 0; j < 5; j++) {
        const a = Math.PI + (j / 4) * Math.PI;
        const h = Math.sin(k * Math.PI) * s * 1.1;
        ctx.fillStyle = `rgba(170,40,16,${(0.9 * (1 - k)).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(bx + Math.cos(a) * s * (0.6 + k * 0.6), by - h * (0.6 + 0.4 * Math.abs(Math.sin(a))), 1.8, 0, P);
        ctx.fill();
      }
    }
  }
  ctx.restore();
  // the back of the rim in front of the sauce's far edge
  ctx.strokeStyle = 'rgba(255,236,210,0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(cx, cy, p.w / 2 + 1, ry + 3, 0, Math.PI * 1.05, Math.PI * 1.6);
  ctx.stroke();
  // the ladle's handle hooked over the rim at the back right
  ctx.strokeStyle = '#3a3c44';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(cx + 46, cy + 2);
  ctx.lineTo(cx + 64, cy - 14);
  ctx.stroke();
  ctx.strokeStyle = '#b8bec8';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx + 46, cy);
  ctx.lineTo(cx + 63, cy - 16);
  ctx.stroke();
  ctx.restore();
}

/** Under the dresser on the worktop: the basket of onions and garlic, a demijohn in its straw, a cheese. */
function larder(ctx: Ctx, r: R): void {
  const b = NPX.basket;
  const y = NPX.counter;
  groundShadow(ctx, b.x + 12, y, 130, 9, 0.6, '#0a0604');
  for (let i = 0; i < 9; i++) {
    const ox = b.x - 80 + i * 20 + (r() - 0.5) * 8;
    const oy = y - 56 - (i % 3) * 6 - r() * 4;
    const rr = 14 + r() * 4;
    const onion = (c: Ctx) => {
      c.beginPath();
      c.moveTo(ox, oy - rr * 1.15);
      c.quadraticCurveTo(ox + rr * 0.2, oy - rr * 0.8, ox + rr * 0.8, oy - rr * 0.55);
      c.bezierCurveTo(ox + rr * 1.25, oy - rr * 0.2, ox + rr * 1.1, oy + rr * 0.9, ox, oy + rr * 0.92);
      c.bezierCurveTo(ox - rr * 1.1, oy + rr * 0.9, ox - rr * 1.25, oy - rr * 0.2, ox - rr * 0.8, oy - rr * 0.55);
      c.quadraticCurveTo(ox - rr * 0.2, oy - rr * 0.8, ox, oy - rr * 1.15);
      c.closePath();
    };
    castShadow(ctx, onion, 6, 6, 0.45, '#0a0604');
    solid(ctx, onion, { x: ox - rr, y: oy - rr * 1.2, w: rr * 2, h: rr * 2.2 }, 'skin', i % 3 === 1 ? '#ece2d0' : i % 2 ? '#8a2a3a' : '#b87a30', { depth: 0.08, line: 2, formSize: 8 });
    within(ctx, onion, () => {
      ctx.strokeStyle = 'rgba(60,30,10,0.3)';
      ctx.lineWidth = 1;
      for (const dx of [-0.4, 0, 0.4]) {
        ctx.beginPath();
        ctx.moveTo(ox + dx * rr * 0.3, oy - rr);
        ctx.quadraticCurveTo(ox + dx * rr * 1.4, oy, ox + dx * rr * 0.4, oy + rr * 0.9);
        ctx.stroke();
      }
    });
  }
  const bk = polyPath([[b.x - 110, y - 64], [b.x + 110, y - 64], [b.x + 94, y], [b.x - 94, y]]);
  castShadow(ctx, bk, 10, 10, 0.5, '#0a0604');
  solid(ctx, bk, { x: b.x - 110, y: y - 64, w: 220, h: 64 }, 'wood', '#9a6c38', { depth: 0.08, line: 2.8, formSize: 16 });
  within(ctx, bk, () => {
    // the weave: alternating over-under, each strand lit on its top
    for (let row = 0; row < 7; row++) {
      const yy = y - 60 + row * 9;
      for (let x = b.x - 110 + (row % 2) * 12; x < b.x + 110; x += 24) {
        ctx.fillStyle = 'rgba(40,20,6,0.35)';
        ctx.fillRect(x, yy + 5, 12, 3);
        ctx.fillStyle = 'rgba(255,220,160,0.22)';
        ctx.fillRect(x, yy, 12, 2);
      }
    }
    vfill(ctx, b.x - 110, y - 64, 220, 64, [[0, 'rgba(10,4,2,0)'], [1, 'rgba(10,4,2,0.45)']]);
  });
  // the demijohn in its straw jacket
  const dx = 492;
  groundShadow(ctx, dx + 10, y, 62, 7, 0.6, '#0a0604');
  bottle(ctx, dx, y, 108, '#3a6a3a', { kind: 'flask', straw: true, cork: '#c8a878', depth: 0.08 });
  // a wheel of pecorino, a wedge cut out of it
  const cx = 116;
  const cy = y;
  groundShadow(ctx, cx + 8, cy, 66, 7, 0.6, '#0a0604');
  const wheel = (c: Ctx) => {
    c.beginPath();
    c.moveTo(cx - 60, cy - 6);
    c.lineTo(cx - 60, cy - 44);
    c.quadraticCurveTo(cx - 60, cy - 54, cx - 40, cy - 56);
    c.lineTo(cx + 2, cy - 56);
    c.lineTo(cx + 2, cy - 8);
    c.quadraticCurveTo(cx - 30, cy + 2, cx - 60, cy - 6);
    c.closePath();
  };
  solid(ctx, wheel, { x: cx - 60, y: cy - 56, w: 64, h: 58 }, 'enamel', '#c89a4a', { depth: 0.08, line: 2.5, formSize: 12, texA: 0.3 });
  const cut = polyPath([[cx + 2, cy - 56], [cx + 56, cy - 48], [cx + 56, cy - 4], [cx + 2, cy - 8]]);
  solid(ctx, cut, { x: cx + 2, y: cy - 56, w: 54, h: 52 }, 'stone', '#ecdcae', { depth: 0.08, line: 2.2, formSize: 10 });
  within(ctx, cut, () => {
    ctx.fillStyle = 'rgba(160,120,50,0.35)';
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.arc(cx + 10 + ((i * 17) % 40), cy - 48 + ((i * 23) % 38), 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

// ——— the table ———

/** Nonna's beech worktable (the kitchen's): its planks running away from us, floured for the fight, the lamp's
 * pool (painted with the lamp, so it can swing) the only light on it. */
function table(ctx: Ctx, r: R): void {
  const F = NPX.front;
  planksPlane(ctx, r, F, '#c08c58', 0.2, 0.004, false);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, F - TY + 4);
  ctx.clip();
  lay(ctx, drift('#f0dcbc', '#4a2a16', 5, 61, 256, 48), { x: 0, y: TY, w: W, h: F - TY }, 0.14);
  // flour worked into the grain at both ends and a thin drift down the middle (never under the pizzas)
  for (const [x, y, rx, ry, a] of [[110, 960, 250, 90, 0.42], [1810, 960, 240, 80, 0.4], [960, 1012, 700, 36, 0.14]] as const) {
    softly(ctx, { x: x - rx * 1.3, y: y - ry * 1.3, w: rx * 2.6, h: ry * 2.6 }, (g) => {
      g.save();
      g.translate(x, y);
      g.scale(1, ry / rx);
      const fg = g.createRadialGradient(0, 0, 0, 0, 0, rx);
      fg.addColorStop(0, rgba('#f8f0e0', a));
      fg.addColorStop(0.55, rgba('#f8f0e0', a * 0.45));
      fg.addColorStop(1, rgba('#f8f0e0', 0));
      g.fillStyle = fg;
      g.beginPath();
      g.arc(0, 0, rx, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }, 0.25);
  }
  // the night: the table falls into the dark away from the lamp
  const dg = ctx.createRadialGradient(NPX.lamp.x, 880, 200, NPX.lamp.x, 880, 1100);
  dg.addColorStop(0, 'rgba(14,6,2,0)');
  dg.addColorStop(1, 'rgba(14,6,2,0.42)');
  ctx.fillStyle = dg;
  ctx.fillRect(0, TY, W, F - TY);
  varnish(ctx, { x: 0, y: TY, w: W, h: F - TY }, [{ x: NPX.lamp.x, a: 0.08, w: 220, col: '#ffe0b0' }], { sheen: 0.03 });
  ctx.restore();
  tableFalloff(ctx, F, 0.45, '#140804');
  tableSeam(ctx, 0.6, '#140a06', false);
  // the worktop's shadow lying along the table's back edge
  crevice(ctx, 0, W, TY, 26, 0.45, '#0a0604');
  tableProps(ctx, r);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, F, W, 1080 - F);
  ctx.clip();
  board(ctx, r, 0, F, W, 1080 - F, '#6a4224');
  vfill(ctx, 0, F, W, 1080 - F, [[0, 'rgba(14,6,2,0.55)'], [1, 'rgba(14,6,2,0.3)']]);
  ctx.restore();
  ctx.fillStyle = rgba('#ffe0b0', 0.35);
  ctx.fillRect(0, F - 3, W, 3);
  ctx.fillStyle = 'rgba(30,12,4,0.8)';
  ctx.fillRect(0, F, W, 2);
}

/** At the table's ends, out of the lanes: a heap of flour with a well in it and an egg broken into it, nests of
 * fresh tagliatelle on a floured board. */
function tableProps(ctx: Ctx, r: R): void {
  // ——— the flour heap (a fontana): a low soft mound, a well in its top, an egg broken into it, a fork beside
  const fx = 124;
  const fy = 952;
  // (drawn at full size and scaled down about its foot: a low, compact mound that keeps clear of the first pizza)
  ctx.save();
  ctx.translate(fx, fy);
  ctx.scale(0.78, 0.86);
  ctx.translate(-fx, -fy);
  groundShadow(ctx, fx + 20, fy + 10, 130, 16, 0.38, '#2a1206', 1.2);
  // flour scattered round it on the boards
  softly(ctx, { x: fx - 200, y: fy - 60, w: 420, h: 130 }, (g) => {
    g.save();
    g.translate(fx + 10, fy + 8);
    g.scale(1, 0.24);
    const sg = g.createRadialGradient(0, 0, 60, 0, 0, 190);
    sg.addColorStop(0, 'rgba(250,244,232,0.6)');
    sg.addColorStop(1, 'rgba(250,244,232,0)');
    g.fillStyle = sg;
    g.beginPath();
    g.arc(0, 0, 190, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }, 0.25);
  const heap = (c: Ctx) => {
    c.beginPath();
    c.moveTo(fx - 128, fy + 12);
    c.bezierCurveTo(fx - 110, fy - 14, fx - 64, fy - 40, fx - 30, fy - 42);
    c.lineTo(fx + 34, fy - 42);
    c.bezierCurveTo(fx + 70, fy - 40, fx + 112, fy - 14, fx + 128, fy + 12);
    c.bezierCurveTo(fx + 60, fy + 26, fx - 60, fy + 26, fx - 128, fy + 12);
    c.closePath();
  };
  within(ctx, heap, () => {
    const hg = ctx.createLinearGradient(fx - 100, fy - 50, fx + 90, fy + 30);
    hg.addColorStop(0, '#fffaf0');
    hg.addColorStop(0.45, '#efe6d6');
    hg.addColorStop(1, '#b8a68e');
    ctx.fillStyle = hg;
    ctx.fillRect(fx - 130, fy - 50, 260, 80);
    lay(ctx, drift('#ffffff', '#a89478', 6, 83, 64, 24), { x: fx - 130, y: fy - 50, w: 260, h: 80 }, 0.22);
    // the well: a hollow, its far wall lit, its near wall in shade, the egg's white in it
    ctx.save();
    ctx.translate(fx + 2, fy - 36);
    ctx.scale(1, 0.26);
    const wg = ctx.createRadialGradient(-6, 10, 4, 0, 0, 52);
    wg.addColorStop(0, 'rgba(120,96,70,0.6)');
    wg.addColorStop(0.7, 'rgba(160,140,110,0.3)');
    wg.addColorStop(1, 'rgba(160,140,110,0)');
    ctx.fillStyle = wg;
    ctx.beginPath();
    ctx.arc(0, 0, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(250,240,220,0.85)';
    ctx.beginPath();
    ctx.ellipse(fx + 4, fy - 34, 26, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  // only the mound's foot gets a line (flour has no edge but where it meets the board)
  ctx.strokeStyle = 'rgba(90,60,30,0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(fx - 126, fy + 12);
  ctx.bezierCurveTo(fx - 60, fy + 26, fx + 60, fy + 26, fx + 126, fy + 12);
  ctx.stroke();
  const yolk = ellPath(fx + 8, fy - 35, 15, 7.5);
  solid(ctx, yolk, { x: fx - 7, y: fy - 43, w: 30, h: 15 }, 'slime', '#f0a018', { depth: 0.03, line: 1.2, formSize: 4 });
  specHi(ctx, fx + 5, fy - 37, 3.5, 1.5, 0.85, -0.2);
  ctx.restore();
  // the shell's halves and a fork on the boards
  for (const [ex, ey, rot] of [[fx + 104, fy + 30, 0.4], [fx + 118, fy + 14, -0.6]] as const) {
    const sh = ellPath(ex, ey, 12, 8, rot);
    castShadow(ctx, sh, 4, 4, 0.4, '#2a1206');
    solid(ctx, sh, { x: ex - 12, y: ey - 8, w: 24, h: 16 }, 'enamel', '#e8c8a0', { depth: 0.03, line: 1.6, formSize: 5 });
    ctx.fillStyle = 'rgba(70,44,26,0.55)';
    ctx.beginPath();
    ctx.ellipse(ex - 1, ey - 2, 8, 4.5, rot, 0, Math.PI * 2);
    ctx.fill();
  }
  const fork = (c: Ctx) => {
    c.beginPath();
    c.moveTo(fx - 150, fy + 44);
    c.lineTo(fx - 60, fy + 34);
    c.lineTo(fx - 60, fy + 40);
    c.lineTo(fx - 150, fy + 50);
    c.closePath();
    c.moveTo(fx - 60, fy + 32);
    c.lineTo(fx - 28, fy + 26);
    c.lineTo(fx - 26, fy + 44);
    c.lineTo(fx - 60, fy + 42);
    c.closePath();
  };
  // (laid a little in from the table's edge)
  ctx.save();
  ctx.translate(36, 14);
  castShadow(ctx, fork, 5, 4, 0.45, '#2a1206');
  solid(ctx, fork, { x: fx - 150, y: fy + 26, w: 124, h: 24 }, 'chrome', '#b8bec8', { depth: 0.03, line: 1.6 });
  ctx.strokeStyle = 'rgba(40,30,30,0.6)';
  ctx.lineWidth = 1.2;
  for (const dy of [30, 35.5, 41]) {
    ctx.beginPath();
    ctx.moveTo(fx - 50, fy + dy + 0.5);
    ctx.lineTo(fx - 27, fy + dy - 2);
    ctx.stroke();
  }
  ctx.restore();
  // ——— the tagliatelle on a floured board: nests of ribbons, each curled round on itself
  const tx = 1800;
  const ty = 950;
  // (scaled down about its middle: the board stays on the table, clear of the last pizza)
  ctx.save();
  ctx.translate(tx, ty);
  ctx.scale(0.84, 0.9);
  ctx.translate(-tx, -ty);
  groundShadow(ctx, tx + 16, ty + 22, 130, 16, 0.42, '#2a1206', 1.2);
  const bd = polyPath([[tx - 124, ty - 30], [tx + 118, ty - 36], [tx + 132, ty + 20], [tx - 116, ty + 28]]);
  solid(ctx, bd, { x: tx - 124, y: ty - 36, w: 256, h: 64 }, 'wood', '#c89a62', { depth: 0.03, line: 2.4, formSize: 8 });
  within(ctx, bd, () => {
    lay(ctx, drift('#fbf4e6', '#c89a62', 5, 91, 64, 24), { x: tx - 124, y: ty - 36, w: 256, h: 64 }, 0.4);
    ctx.fillStyle = 'rgba(255,240,210,0.25)';
    ctx.fillRect(tx - 124, ty - 36, 256, 3);
  });
  // the board's thick front edge
  const edge = polyPath([[tx - 116, ty + 28], [tx + 132, ty + 20], [tx + 132, ty + 30], [tx - 116, ty + 38]]);
  solid(ctx, edge, { x: tx - 116, y: ty + 20, w: 248, h: 18 }, 'wood', '#8a5a30', { depth: 0.03, line: 2, formSize: 4 });
  for (const [nx, ny, sc] of [[tx - 66, ty - 4, 1], [tx + 4, ty - 10, 0.92], [tx + 70, ty - 2, 1.05]] as const) {
    groundShadow(ctx, nx + 6, ny + 12, 34 * sc, 8, 0.5, '#3a1a08');
    // each ribbon a loop round the nest: all the back halves (in the nest's shade), then the fronts over them
    const loops = Array.from({ length: 16 }, (_, k) => ({
      rx: (16 + r() * 16) * sc,
      ry: (6 + r() * 6) * sc,
      lift: -k * 0.9 * sc,
      ox: (r() - 0.5) * 6,
      rot: (r() - 0.5) * 0.5,
      col: shade('#f4d488', (r() - 0.5) * 0.12),
    }));
    for (const front of [false, true])
      for (const l of loops) {
        ctx.beginPath();
        ctx.ellipse(nx + l.ox, ny + l.lift, l.rx, l.ry, l.rot, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
        ctx.strokeStyle = front ? '#8a6020' : '#5a3a14';
        ctx.lineWidth = 5.2;
        ctx.stroke();
        ctx.strokeStyle = front ? l.col : '#c8a050';
        ctx.lineWidth = 3.6;
        ctx.stroke();
      }
    // the lamp along their tops and a dusting of flour
    ctx.fillStyle = 'rgba(255,244,220,0.45)';
    ctx.beginPath();
    ctx.ellipse(nx - 6 * sc, ny - 18 * sc, 14 * sc, 3 * sc, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ——— the lamp and its light ———

function lamp(ctx: Ctx): void {
  pendantLamp(ctx, NPX.lamp.x, NPX.beam - 2, NPX.lamp.y, ENAMEL, { lit: 1, glow: false, w: 150 });
  // the ceiling rose it hangs from
  const rose = ellPath(NPX.lamp.x, NPX.beam + 2, 14, 6);
  solid(ctx, rose, { x: NPX.lamp.x - 14, y: NPX.beam - 4, w: 28, h: 12 }, 'iron', '#2a2420', { depth: 0.1, line: 1.5 });
}
const LAMP_BOX = { x: NPX.lamp.x - 92, y: NPX.beam - 10, w: 184, h: NPX.lamp.y - NPX.beam + 34 };

/** The lamp's light on the wall: the shade's pool, its hot spot. (x, rimY): the rim's middle. Additive. */
function wallPool(c: Ctx, x: number, rimY: number, a = 1): void {
  lampOnWall(c, x, rimY, 72, { col: LAMP_COL, a: 0.4 * a, reach: 470, spread: 400, gap: 64, above: 0, op: 'lighter' });
}
/** The cone of light through the dusty air under the shade (origin at the rim's middle). Additive. */
function cone(c: Ctx, x: number, y: number, a = 1): void {
  softly(c, { x: x - 420, y, w: 840, h: 520 }, (g) => {
    const lg = g.createLinearGradient(0, y, 0, y + 500);
    lg.addColorStop(0, `rgba(255,214,150,${(0.15 * a).toFixed(3)})`);
    lg.addColorStop(0.45, `rgba(255,206,140,${(0.05 * a).toFixed(3)})`);
    lg.addColorStop(1, 'rgba(255,206,140,0)');
    g.fillStyle = lg;
    g.beginPath();
    g.moveTo(x - 66, y + 4);
    g.lineTo(x + 66, y + 4);
    g.lineTo(x + 330, y + 500);
    g.lineTo(x - 330, y + 500);
    g.closePath();
    g.fill();
  }, 0.125, 'lighter');
}
/** The bulb's own glow under the shade. Additive. */
function bulbGlow(c: Ctx, x: number, y: number, a = 1): void {
  lightPool(c, x, y + 8, 120, 44, '#ffd890', 0.6 * a);
  lightPool(c, x, y + 5, 40, 16, '#ffffff', 0.7 * a);
}
/** The lamp's pool on the table. Additive. */
function tablePool(c: Ctx, x: number, a = 1): void {
  lightPool(c, x, 880, 640, 160, '#ffc070', 0.3 * a);
  lightPool(c, x, 870, 300, 70, '#ffe0b0', 0.16 * a);
}

/** Painted for the still: the lamp's light, the ragù's steam, the gas (live: their moving versions). */
function stillLight(ctx: Ctx): void {
  const { x, y } = NPX.lamp;
  wallPool(ctx, x, y + 2);
  cone(ctx, x, y);
  tablePool(ctx, x);
  bulbGlow(ctx, x, y);
}
function stillPot(ctx: Ctx): void {
  const p = NPX.pot;
  ctx.save();
  ctx.translate(p.x - STEAM.w / 2, p.y - p.h - STEAM.h + 12);
  steamFrame(ctx, STEAM.w, STEAM.h, 0.35, STEAM_LOOK);
  ctx.restore();
  ctx.save();
  ctx.translate(NPX.ring.x - GAS_W / 2, NPX.ring.top - 24);
  gasRow(ctx, 0.3);
  ctx.restore();
}
const STEAM = { w: 240, h: 300 };
const STEAM_LOOK = { a: 0.36, lit: '#fff0dc', body: '#e8ded4', shade: '#8a8090', seed: 5, n: 8 };
const GAS_W = 150;
function gasRow(c: Ctx, ph: number): void {
  for (let i = 0; i < 7; i++) {
    c.save();
    c.translate(i * 21 + 2, 4);
    flameFrame(c, 18, 22, (ph + i * 0.37) % 1, GAS, 1, i);
    c.restore();
  }
}

function grade(ctx: Ctx): void {
  gradeAll(ctx, 0.06, '#ffb070', 0.08, { warm: '#ffb860', cool: '#3a4a90', a: 0.3 });
}

function shadeOver(ctx: Ctx): void {
  // one lamp in a dark room: everything falls into the dark away from it
  ctx.save();
  ctx.translate(NPX.lamp.x, 560);
  ctx.scale(1, 0.62);
  const g = ctx.createRadialGradient(0, 0, 260, 0, 0, 1150);
  g.addColorStop(0, 'rgba(8,4,2,0)');
  g.addColorStop(0.45, 'rgba(8,4,2,0.22)');
  g.addColorStop(1, 'rgba(8,4,2,0.62)');
  ctx.fillStyle = g;
  ctx.fillRect(-1200, -1200, 2400, 2400);
  ctx.restore();
  calmLanes(ctx, 0.12, '#120804', 60, 540);
  vignetteAll(ctx, 0.9, '#060302', 0.45);
  vfill(ctx, 0, 0, W, 180, [[0, 'rgba(6,3,1,0.4)'], [1, 'rgba(6,3,1,0)']]);
}

const SL = NPX.shelvesL;
const SR = NPX.shelvesR;

export const NONNA: SceneSpec = {
  id: 'nonna',
  info: {
    name: "Nonna's Pantry",
    subtitle: "Boss: NONNA'S SLIPPER",
    ambient: [],
    glows: [],
    light: '#ffc880',
    tableTint: '#fff0dc',
  },
  layers: [
    { id: 'wall', box: { x: 0, y: 0, w: W, h: TY }, draw: wall },
    { id: 'moon', box: { x: NPX.win.x0 - 20, y: NPX.win.y0, w: 480, h: NPX.counter - NPX.win.y0 }, draw: moonlight },
    { id: 'shelvesL', box: { x: SL.x0 - 16, y: NPX.beam - 4, w: SL.x1 - SL.x0 + 60, h: NPX.counter - NPX.beam + 16 }, draw: (c, r) => shelves(c, r, SL.x0, SL.x1, SL.ys, true) },
    { id: 'shelvesR', box: { x: SR.x0 - 30, y: NPX.beam - 4, w: SR.x1 - SR.x0 + 60, h: SR.ys[1] - NPX.beam + 110 }, draw: (c, r) => shelves(c, r, SR.x0, SR.x1, SR.ys, false) },
    { id: 'rack', box: { x: NPX.rack.x0 - 40, y: NPX.rack.y0 - 30, w: NPX.rack.x1 - NPX.rack.x0 + 80, h: NPX.rack.y1 - NPX.rack.y0 + 70 }, draw: rack },
    { id: 'tally', box: { x: NPX.tally.x - 10, y: NPX.tally.y - 14, w: 140, h: 200 }, draw: tally },
    { id: 'rail', box: { x: NPX.rail.x0 - 10, y: NPX.beam - 4, w: NPX.rail.x1 - NPX.rail.x0 + 40, h: 40 }, draw: railBar },
    { id: 'counter', box: { x: 0, y: NPX.counter - 40, w: W, h: TY - NPX.counter + 44 }, draw: counter },
    { id: 'larder', box: { x: 0, y: NPX.counter - 130, w: 560, h: 150 }, draw: larder },
    { id: 'pot', box: { x: NPX.pot.x - 140, y: NPX.pot.y - NPX.pot.h - 40, w: 300, h: NPX.pot.h + 80 }, draw: pot },
    ...NPX.meats.map((_, i) => ({ id: `meat${i}`, box: MEAT_BOX(i), motion: 'sprite' as const, draw: (c: Ctx, r: R) => meat(c, r, i) })),
    { id: 'lamp', box: LAMP_BOX, motion: 'sprite', draw: lamp },
    { id: 'table', box: { x: 0, y: TY, w: W, h: 1080 - TY }, draw: table },
    { id: 'lightStill', box: { x: 0, y: NPX.beam, w: W, h: 1080 - NPX.beam }, stillOnly: true, draw: stillLight },
    { id: 'potStill', box: { x: NPX.pot.x - 140, y: NPX.pot.y - NPX.pot.h - STEAM.h, w: 280, h: STEAM.h + NPX.pot.h }, stillOnly: true, draw: stillPot },
    { id: 'fx', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

// ——— live: frame painters ———

/**
 * One frame of flour pouring off a shelf (phase 0…1, played once): a lip of flour tips over the front edge and falls
 * in a thin soft stream that narrows as it speeds up, its head a rounded clot; it lands on the board below and
 * bursts into a low lit puff that rolls out both ways and settles; the stream thins out, lets go of the edge and its
 * last clots fall away. The shelf edge at (w/2, 4), the board below at h - 10. Lit top-left, shaded under; every
 * soft edge fades out well inside the frame.
 */
function pourFrame(c: Ctx, w: number, h: number, u: number): void {
  const cx = w / 2;
  const top = 4;
  const floor = h - 10;
  const fall = floor - top;
  const P = Math.PI * 2;
  // the head falls under gravity, reaching the floor at u = 0.28; the tail lets go of the shelf from u = 0.5
  const head = top + fall * Math.min(1, (u / 0.28) ** 2);
  const tail = u < 0.5 ? top : top + fall * Math.min(1, ((u - 0.5) / 0.3) ** 2);
  const thin = u < 0.4 ? 1 : Math.max(0.35, 1 - (u - 0.4) * 1.3);
  const k = 0.5;
  const [cv, g] = makeCanvas(Math.ceil(w * k), Math.ceil(h * k));
  g.scale(k, k);
  const puff = (x: number, y: number, rad: number, al: number, shadeA = 0.35) => {
    if (al <= 0.005) return;
    const bg = g.createRadialGradient(x - rad * 0.2, y - rad * 0.25, 0, x, y, rad);
    bg.addColorStop(0, `rgba(255,252,246,${al.toFixed(3)})`);
    bg.addColorStop(0.55, `rgba(246,240,228,${(al * 0.55).toFixed(3)})`);
    bg.addColorStop(1, 'rgba(240,232,216,0)');
    g.fillStyle = bg;
    g.beginPath();
    g.arc(x, y, rad, 0, P);
    g.fill();
    const sg = g.createRadialGradient(x + rad * 0.3, y + rad * 0.4, 0, x + rad * 0.3, y + rad * 0.4, rad * 0.7);
    sg.addColorStop(0, `rgba(130,106,84,${(al * shadeA).toFixed(3)})`);
    sg.addColorStop(1, 'rgba(130,106,84,0)');
    g.fillStyle = sg;
    g.beginPath();
    g.arc(x + rad * 0.3, y + rad * 0.4, rad * 0.7, 0, P);
    g.fill();
  };
  // the stream: a tapered soft ribbon from tail to head, wavering, lit on its left edge
  const sway = (y: number) => cx + Math.sin(y * 0.045 + u * 5) * 2 * ((y - top) / fall);
  if (head > tail + 3) {
    const wAt = (y: number) => (7 - ((y - top) / fall) * 5.2) * thin;
    const steps = 16;
    g.beginPath();
    for (let i = 0; i <= steps; i++) {
      const y = tail + ((head - tail) * i) / steps;
      g.lineTo(sway(y) - wAt(y), y);
    }
    for (let i = steps; i >= 0; i--) {
      const y = tail + ((head - tail) * i) / steps;
      g.lineTo(sway(y) + wAt(y), y);
    }
    g.closePath();
    // lit across (bright left, shaded right), then feathered along its length: dense at the lip, breaking up and
    // thinning towards the bottom
    const a = 0.85 * thin;
    const rg = g.createLinearGradient(cx - 7, 0, cx + 7, 0);
    rg.addColorStop(0, `rgba(255,253,248,${(a * 0.55).toFixed(3)})`);
    rg.addColorStop(0.35, `rgba(255,252,246,${a.toFixed(3)})`);
    rg.addColorStop(1, `rgba(214,200,178,${(a * 0.65).toFixed(3)})`);
    g.fillStyle = rg;
    g.fill();
    g.save();
    g.globalCompositeOperation = 'destination-out';
    const fg = g.createLinearGradient(0, top, 0, floor);
    fg.addColorStop(0, 'rgba(0,0,0,0)');
    fg.addColorStop(0.55, 'rgba(0,0,0,0.15)');
    fg.addColorStop(1, 'rgba(0,0,0,0.5)');
    g.fillStyle = fg;
    g.fill();
    // gaps opening in it as it breaks up
    for (let j = 0; j < 6; j++) {
      const y = top + fall * (0.35 + j * 0.11) + Math.sin(u * 11 + j * 2) * 6;
      g.fillStyle = `rgba(0,0,0,${(0.5 * Math.max(0, u - 0.35) * 2).toFixed(3)})`;
      g.fillRect(cx - 10, y, 20, 2 + j * 0.6);
    }
    g.restore();
    // a soft haze of dust round it
    g.strokeStyle = `rgba(248,242,230,${(0.12 * thin).toFixed(3)})`;
    g.lineWidth = 10;
    g.beginPath();
    g.moveTo(sway(tail), tail);
    g.lineTo(sway(head), head);
    g.stroke();
    // the head's clot, while it's still falling
    if (u < 0.3) puff(sway(head), head, 4.5, 0.75, 0.2);
    // late on, the stream breaks: a few clots falling ahead of the tail
    if (u > 0.55) for (let j = 0; j < 3; j++) {
      const y = tail + (head - tail) * (0.2 + j * 0.3) + (u - 0.55) * 60 * (j + 1);
      if (y < floor - 4) puff(sway(y), y, 3.5, 0.7 * thin);
    }
  }
  // the lip tipping over the edge
  if (u < 0.55) puff(cx + 3, top + 3, 9 * (1 - u * 1.4), 0.85);
  // the splash: a low puff rolling out both ways along the board, lifting a little and thinning
  if (u > 0.26) {
    const s = (u - 0.26) / 0.74;
    const out = 1 - (1 - s) ** 2.4;
    const al = Math.sin(Math.min(1, s * 5) * Math.PI * 0.5) * (1 - s) ** 1.2;
    const reachMax = w / 2 - 26;
    for (let i = 0; i < 10; i++) {
      const side = i % 2 ? 1 : -1;
      const reach = (0.25 + ((i * 13) % 7) / 9) * out * reachMax;
      const x = cx + side * reach;
      const mid = 1 - reach / reachMax;
      const lift = out * (2 + ((i * 5) % 4) * 2) + Math.sin(out * Math.PI) * (4 + mid * 12);
      const rad = Math.min(16, 6 + out * 10 * (0.7 + ((i * 3) % 4) / 8));
      puff(x, floor - 3 - lift, rad, 0.8 * al, 0.15);
    }
    // and the little cone it leaves on the board
    const pile = Math.min(1, s * 3);
    g.fillStyle = `rgba(250,246,236,${(0.85 * pile).toFixed(3)})`;
    g.beginPath();
    g.ellipse(cx, floor, 13 * pile, 5 * pile, 0, Math.PI, 0);
    g.fill();
  }
  c.imageSmoothingEnabled = true;
  c.drawImage(cv, 0, 0, w, h);
  // crisp grains thrown off the landing
  for (let i = 0; i < 22; i++) {
    const s = u - 0.27 - (i % 5) * 0.02;
    if (s < 0) continue;
    const a = Math.PI * (1.1 + ((i * 37) % 30) / 37);
    const v = 26 + ((i * 29) % 11) * 5;
    const x = cx + Math.cos(a) * v * s * 1.5;
    const y = floor - 4 + Math.sin(a) * v * s * 1.1 + s * s * 150;
    if (y > floor || Math.abs(x - cx) > w / 2 - 8) continue;
    c.fillStyle = `rgba(255,252,244,${(0.9 * (1 - u)).toFixed(3)})`;
    c.fillRect(x, y, 1.6, 1.6);
  }
}

/** A grain of flour or a fleck of dust, painted (particles): a soft lit speck. */
function speckFrame(c: Ctx, s: number, i: number): void {
  const r0 = s / 2;
  const g = c.createRadialGradient(r0 - 1, r0 - 1, 0, r0, r0, r0);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.5, i % 2 ? 'rgba(240,232,216,0.8)' : 'rgba(255,250,240,0.7)');
  g.addColorStop(1, 'rgba(240,232,216,0)');
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(r0, r0, r0 * (0.7 + (i % 3) * 0.12), r0 * (0.55 + (i % 2) * 0.2), i, 0, Math.PI * 2);
  c.fill();
}

// ——— live ———

registerKitScene(NONNA, (k) => {
  const fx = k.slot('fx');
  const { x: LX, y: LY } = NPX.lamp;
  const L = LY - NPX.beam;
  // the room's dark leaning away from the lamp: a soft shade laid over the side it swings away from
  const leanKey = k.tex('np_lean', 64, 8, (c) => {
    const g = c.createLinearGradient(0, 0, 64, 0);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.55, 'rgba(200,190,200,1)');
    g.addColorStop(1, 'rgba(70,60,70,1)');
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 8);
  });
  const leanL = k.img(leanKey, 0, 0, { into: fx, origin: [0, 0], sx: 960 / 64, sy: 1080 / 8, alpha: 0 });
  leanL.setFlipX(true).setBlendMode(Phaser.BlendModes.MULTIPLY);
  const leanR = k.img(leanKey, 960, 0, { into: fx, origin: [0, 0], sx: 960 / 64, sy: 1080 / 8, alpha: 0 });
  leanR.setBlendMode(Phaser.BlendModes.MULTIPLY);
  // the stutter: the whole room dims with the bulb
  const dim = k.wash(0x1a1020, 0, Phaser.BlendModes.MULTIPLY, fx);

  // ——— hero 1: the lamp on its flex, and all its light swinging with it
  const lampImg = k.pivot(k.sprite('lamp'), LX, NPX.beam);
  const lampSw = new Swing(lampImg, { k: 5.2, c: 0.16, idle: 0.035, seed: 1, speed: 0.55 });
  // (painted at half size: all soft)
  const poolKey = k.tex('np_pool', 450, 280, (c) => {
    c.scale(0.5, 0.5);
    wallPool(c, 450, 30);
  });
  const pool = k.img(poolKey, LX, LY + 2, { into: fx, add: true, origin: [0.5, 30 / 560], scale: 2 });
  const coneKey = k.tex('np_cone', 220, 136, (c) => {
    c.scale(0.25, 0.25);
    cone(c, 440, 8);
  });
  const coneImg = k.img(coneKey, LX, LY, { into: fx, add: true, origin: [0.5, 8 / 544], scale: 4 });
  const tPool = k.glow(LX, 880, 640, 0xffc070, 0.32, { into: fx, sy: 0.25 });
  const tCore = k.glow(LX, 870, 300, 0xffe0b0, 0.17, { into: fx, sy: 0.24 });
  const bulb = k.glow(LX, LY + 8, 120, 0xffd890, 0.6, { into: fx, sy: 0.37 });
  const core = k.glow(LX, LY + 5, 42, 0xffffff, 0.7, { into: fx, sy: 0.4 });
  let stutter = 0;
  let stutterT = 0;
  // dust in the cone: lit motes, only inside the light
  const motes = new Parts(k, { frame: 'mote', add: true, into: fx, max: 70 });
  const moteRate = new Rate();

  // ——— the meats on their strings
  const meats = NPX.meats.map((m, i) => new Swing(k.pivot(k.sprite(`meat${i}`), m.x, NPX.rail.y), { k: 5 + i * 0.8, c: 0.35, idle: 0.008, seed: i * 2.3, speed: 0.6 }));

  // ——— hero 2: the ragù blubbing, its steam, the gas
  const rb = RAGU_BOX;
  const raguKey = sheet(k, 'np_ragu', rb.w, rb.h, 16, (c, ph) => {
    c.translate(-rb.x, -rb.y);
    ragu(c, ph);
  });
  const raguLoop = new Loop(k, raguKey, 16, rb.x, rb.y, { into: fx, origin: [0, 0], fps: 5 });
  const steamKey = sheet(k, 'np_steam', STEAM.w / 2, STEAM.h / 2, 16, (c, ph) => {
    c.scale(0.5, 0.5);
    steamFrame(c, STEAM.w, STEAM.h, ph, STEAM_LOOK);
  });
  const p = NPX.pot;
  const steam = new Loop(k, steamKey, 16, p.x, p.y - p.h + 12, { into: fx, origin: [0.5, 1], fps: 7, scale: 2 });
  const steam2 = new Loop(k, steamKey, 16, p.x + 24, p.y - p.h + 12, { into: fx, origin: [0.5, 1], fps: 5, phase: 8, scale: 1.6 });
  steam2.each((im) => im.setFlipX(true));
  steam2.alpha = 0.6;
  const gasKey = sheet(k, 'np_gas', GAS_W, 30, 10, (c, ph) => gasRow(c, ph));
  const gas = new Loop(k, gasKey, 10, NPX.ring.x, NPX.ring.top + 6, { into: fx, origin: [0.5, 1], add: true, fps: 14 });
  gas.alpha = 0.85;
  const gasGlow = k.glow(NPX.ring.x, NPX.ring.top, 120, 0x4a8aff, 0.22, { into: fx, sy: 0.3 });
  const spat = new Parts(k, { frame: 'drop', into: fx, max: 24 });

  // ——— hero 3: flour pouring off the shelves, and dust sifting down
  // (two sheets, painted to the two drops the shelves have, so a fall is never stretched: the shelf below's 140 px and
  // the wall shelf's long drop to the worktop)
  const PW = 160;
  const PN = 14;
  const pourSheet = (h: number) => sheet(k, `np_pour${h}`, PW, h, PN, (c, ph) => pourFrame(c, PW, h, ph));
  const pours = SACKS.map((s) => {
    // the fall starts under the plank's lace (y + 14) and lands on the board below (frame floor at h - 10)
    const h = s.drop > 200 ? NPX.counter - NPX.shelvesR.ys[1] - 4 : NPX.shelvesL.ys[1] - NPX.shelvesL.ys[0] - 4;
    const l = new Loop(k, pourSheet(h), PN, s.x + 14, s.y + 14, { into: fx, origin: [0.5, 0], sx: 1, sy: (s.drop - 4) / h });
    l.each((im) => im.setVisible(false));
    return { l, s, t: -1, dur: 1.4 };
  });
  const speckKey = sheet(k, 'np_speck', 12, 12, 4, (c, _p, i) => speckFrame(c, 12, i));
  const sift = new Parts(k, { frame: 'mote', sheet: { key: speckKey, n: 4, half: 6 }, into: fx, max: 220 });
  const pour = (s: (typeof pours)[number], power: number) => {
    if (s.t >= 0 && s.t < s.dur * 0.6) return;
    s.t = 0;
    s.dur = 1.3 + s.s.drop / 320 + power * 0.3;
    s.l.each((im) => im.setVisible(true).setFlipX(crand() < 0.5));
  };

  return {
    impact(x, _y, kk) {
      // the lamp and the meats swing away from the stomp
      lampSw.kick((x < LX ? 1 : -1) * (0.3 + kk * 0.6));
      meats.forEach((m, i) => m.kick((x < NPX.meats[i].x ? 1 : -1) * (0.5 + kk * 1.1) * (0.7 + crand() * 0.6)));
      // a hard one makes the bulb stutter
      if (kk > 0.45) {
        stutter = Math.max(stutter, 0.35 + kk * 0.4);
        stutterT = 0;
      }
      // flour pours off the sacks nearest the stomp (more of them the harder it is)
      const order = [...pours].sort((a, b) => Math.abs(a.s.x - x) - Math.abs(b.s.x - x));
      const n = kk > 0.7 ? 3 : kk > 0.35 ? 2 : 1;
      order.slice(0, n).forEach((s) => pour(s, kk));
      // and dust sifts down from every shelf
      const dust = Math.round(14 + kk * 40);
      for (let i = 0; i < dust; i++) {
        const left = crand() < 0.55;
        const sh = left ? NPX.shelvesL : NPX.shelvesR;
        const si = Math.floor(crand() * sh.ys.length);
        const sy = sh.ys[si] + 20;
        const floor = si + 1 < sh.ys.length ? sh.ys[si + 1] : NPX.counter;
        sift.spawn({ x: sh.x0 + 30 + crand() * (sh.x1 - sh.x0 - 60), y: sy, vx: (crand() - 0.5) * 12, vy: 8 + crand() * 26, life: 2.5 + crand() * 2, r0: 1.2 + crand() * 1.6, a: 0.75, tint: 0xf4ead8, grav: 36, drag: 1.4, floor: floor - 2 });
      }
      // the ragù jumps: a few drops thrown up
      if (kk > 0.4)
        for (let i = 0; i < 3 + kk * 4; i++)
          spat.spawn({ x: p.x + (crand() - 0.5) * (p.w - 50), y: p.y - p.h + 3, vx: (crand() - 0.5) * 120, vy: -(120 + crand() * 160) * kk, life: 1.2, r0: 2.4 + crand() * 1.8, a: 0.95, tint: 0x8a1e0c, grav: 900, floor: p.y - p.h + 6, streak: 0.012 });
    },
    update(dt, t) {
      // ——— the lamp
      lampSw.update(dt, t);
      const a = lampSw.angle;
      const bx = LX - Math.sin(a) * L;
      const by = NPX.beam + Math.cos(a) * L;
      // the bulb's stutter: a few hard flickers dying away, plus now and then a faint unprompted buzz
      if (stutter > 0) {
        stutterT += dt;
        stutter = Math.max(0, stutter - dt * 0.9);
      } else if (crand() < dt * 0.03) {
        stutter = 0.18;
        stutterT = 0;
      }
      const buzz = stutter > 0 ? Math.max(0, Math.sin(stutterT * 47) * Math.sin(stutterT * 13.3 + 1)) * stutter * 1.4 : 0;
      const on = Math.max(0.15, (0.96 + flicker(t * 0.25, 2) * 0.04) * (1 - buzz));
      pool.setPosition(bx, by + 2).setRotation(a).setAlpha(on);
      coneImg.setPosition(bx, by).setRotation(a).setAlpha(on);
      bulb.setPosition(bx, by + 8).setAlpha(0.6 * on);
      core.setPosition(bx, by + 5).setAlpha(0.7 * on);
      // where the shade points, the pool lands on the table (further out the further the table is below the bulb)
      const tx = bx - Math.tan(a) * (880 - by) * 1.15;
      tPool.setPosition(tx, 880).setAlpha(0.32 * on);
      tCore.setPosition(tx, 870).setAlpha(0.17 * on);
      const lean = Phaser.Math.Clamp(a / 0.25, -1, 1) * calm();
      // (swung left (a > 0 rotates its foot left): the right of the room falls darker)
      leanR.setAlpha(Math.max(0, lean) * 0.4);
      leanL.setAlpha(Math.max(0, -lean) * 0.4);
      dim.setAlpha((1 - on) * 0.5);
      moteRate.tick(5 * calm(), dt, () => {
        const d = 40 + crand() * 420;
        const across = (crand() - 0.5) * (60 + d * 0.9);
        const ax = -Math.sin(a);
        const ay = Math.cos(a);
        motes.spawn({ x: bx + ax * d + ay * across, y: by + ay * d - ax * across, vx: (crand() - 0.5) * 6, vy: (crand() - 0.4) * 5, life: 5 + crand() * 3, r0: 1.2 + crand() * 1.4, a: 0.45 * (1 - d / 520), tint: 0xffe0b0, fade: 0.3 });
      });
      motes.update(dt);
      for (const m of meats) m.update(dt, t);
      // ——— the ragù
      raguLoop.step(dt);
      steam.step(dt);
      steam2.step(dt);
      gas.step(dt);
      gasGlow.setAlpha(0.18 + flicker(t, 4) * 0.06);
      spat.update(dt);
      // ——— the flour
      for (const s of pours) {
        if (s.t < 0) continue;
        s.t += dt;
        const u = s.t / s.dur;
        if (u >= 1) {
          s.t = -1;
          s.l.each((im) => im.setVisible(false));
        } else s.l.show(Math.min(PN - 1.001, u * (PN - 1)));
      }
      sift.update(dt);
    },
  };
});
