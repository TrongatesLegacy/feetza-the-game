// Hall of Kings (the Colossus's arena, the boss of the Lodge's stage), redrawn with the location kit (src/art/scene):
// the great hall of the castle up the mountain from the Lodge, the same night and the same blizzard. Dressed
// limestone under a heavy oak wall plate, its posts and arched braces landing on stone corbels; two tall lancets
// onto the night (moonlit peaks and firs, the snow driving past the leaded quarries, a drift on the outside sill);
// an iron brazier on a tripod before each lancet, its fire lighting the reveal, the wall, the banners and the near
// end of the table; the kings' banners (a crown over the foot) hung from crossbars on cords from iron hooks; the
// empty throne on its dais under a navy cloth of estate and a tester on chains. An oak feasting table.
//
// Live, the heroes:
// - the braziers: fire painted tongue by tongue in soft layers at 10 phases of its cycle and played cross-faded,
//   smoke curling up into the roof, the coal bed breathing; embers stream up with trails. A stomp knocks the fire
//   down (it ducks and squashes, the hall's light dipping with it), then it flares back; sparks burst and coals jump
//   out of the bowl, falling to the floor behind the table;
// - the banners: each cloth painted with real folds (the art displaced by the folds, lit and shaded by their slope)
//   at 10 phases of a draught rippling down it; banner, crossbar and cord swing as one pendulum from the hook, and a
//   stomp sets them swinging (the ripple quickening with the swing);
// - the blizzard in the lancets: lit flakes at three depths driven by gusts, turning in the wind and kept to the
//   glass, painted veils of blown snow sweeping across in the gusts; dust and grit sift off the wall plate at a stomp.

import Phaser from 'phaser';
import { footPath } from '../../art/backdrops';
import {
  type Air,
  type Box,
  type Ctx,
  type PathFn,
  type R,
  TY,
  W,
  calmLanes,
  castShadow,
  crevice,
  glowAt,
  gradeAll,
  groundShadow,
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
import { aoHalo } from '../../art/scene/light';
import { grain, planksPlane, tableFalloff, tableSeam, varnish, woodGrain } from '../../art/scene/materials';
import { crack, drift, grime, lay, noiseMask, streaks, surface } from '../../art/scene/paint';
import { hang } from '../../art/scene/props';
import { cloud, farLand, skyFill, stars } from '../../art/scene/sky';
import { ashlar } from '../../art/scene/surfaces';
import { hashStr, makeCanvas, mix, rgba, rng, shade } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { Loop, Parts, Rate, Spring, sheet } from '../../game/sceneAnim';
import { type KitLive, calm, flicker, registerKitScene, wander } from '../../game/sceneLive';
import { firSilhouette, smokeFrame, treeLine } from './sceneBits';

// ——— layout ———

export const HK = {
  front: 1040,
  /** The oak wall plate under the roof. */
  plate: { y0: 92, y1: 132 },
  /** The wall posts and their corbels. */
  posts: [480, 1440] as const,
  corbelY: 262,
  /** The two lancets (centre x), their half width, apex and sill. */
  wins: [250, 1670] as const,
  win: { hw: 92, top: 180, sill: 536 },
  /** The braziers stand before the lancets: the bowl's rim, the coals' top. */
  brz: { rimY: 640, rimHW: 82, bowlD: 50, coalY: 622 },
  /** The banners: hook in the wall, crossbar, the cloth. */
  banners: [660, 1260] as const,
  hookY: 146,
  barY: 204,
  bannerW: 168,
  bannerH: 356,
  /** The throne and its cloth of estate. */
  throne: { x: 960, top: 412, seat: 600, hw: 104 },
  dossal: { x0: 820, x1: 1100, top: 312 },
  dais: { y: 702, hw: 230 },
};

const P2 = Math.PI * 2;
/** How deep the dais's treads look, seen from just above. */
const TREAD = 14;
const STONE = ['#8a8174', '#7e776c', '#958b7c', '#837a6e', '#787068'];
const STONE_MID = '#837a6e';
const OAK = '#4e321e';
const IRON = '#34302e';
const FIRE_C = '#ff8a3a';
const NIGHT_AIR: Air = { color: '#3a4a74', far: 0.6 };
const W2 = HK.win;
/** Where the lancet's arcs spring. */
const SPRING = W2.top + Math.sqrt(3) * W2.hw;

// ——— the lancet's geometry ———

/** A pointed (equilateral) arch over jambs, its opening grown outward by g. */
function lancet(cx: number, g = 0, bottom = W2.sill): PathFn {
  const hw = W2.hw;
  const R = 2 * hw + g;
  const a = Math.acos(hw / R);
  return (c) => {
    c.moveTo(cx - hw - g, bottom);
    c.lineTo(cx - hw - g, SPRING);
    c.arc(cx + hw, SPRING, R, Math.PI, Math.PI + a, false);
    c.arc(cx - hw, SPRING, R, P2 - a, P2, false);
    c.lineTo(cx + hw + g, bottom);
    c.closePath();
  };
}
const path = (p: PathFn): PathFn => (c) => {
  c.beginPath();
  p(c);
};

/** How far inside the lancet's glass a point is (px; negative outside). */
function insideLancet(cx: number, x: number, y: number): number {
  const hw = W2.hw;
  const below = Math.min(hw - Math.abs(x - cx), W2.sill - y);
  if (y >= SPRING) return below;
  const R = 2 * hw;
  const d1 = R - Math.hypot(x - (cx + hw), y - SPRING);
  const d2 = R - Math.hypot(x - (cx - hw), y - SPRING);
  return Math.min(d1, d2, W2.sill - y);
}

const GLASS_BOX = (cx: number): Box => ({ x: cx - W2.hw, y: W2.top, w: W2.hw * 2, h: W2.sill - W2.top });

// ——— the wall ———

/** The hall's light on any stone in it (the wall, the window rings, the dais): the night's dark, thickest up in the
 * roof, and the braziers' warm pools, hottest low behind the bowls. In screen space, so separate pieces match. */
function nightLight(ctx: Ctx, box: Box, k = 1): void {
  ctx.fillStyle = `rgba(16,13,24,${(0.52 * k).toFixed(3)})`;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  vfill(ctx, box.x, 0, box.w, TY, [[0, 'rgba(6,5,10,0.85)'], [0.28, 'rgba(6,5,10,0.4)'], [0.62, 'rgba(6,5,10,0.06)'], [1, 'rgba(6,5,10,0.32)']]);
  for (const x of HK.wins) {
    lightPool(ctx, x + (x < 960 ? 40 : -40), 590, 600, 520, FIRE_C, 0.3);
    lightPool(ctx, x, 600, 300, 250, '#ffb060', 0.2);
  }
  // the light falls off towards the middle of the hall, between the fires
  ctx.save();
  ctx.translate(960, 470);
  ctx.scale(1.5, 1);
  const mg = ctx.createRadialGradient(0, 0, 40, 0, 0, 430);
  mg.addColorStop(0, 'rgba(8,6,12,0.28)');
  mg.addColorStop(1, 'rgba(8,6,12,0)');
  ctx.fillStyle = mg;
  ctx.fillRect(-500, -480, 1000, 960);
  ctx.restore();
}

/** A dressed stone's face: its own tone, a gentle cushion lit from the top left, a lit upper arris and a shaded
 * lower one, a little tooling. Paint the hall's light over it afterwards. */
function dressed(ctx: Ctx, r: R, p: PathFn, box: Box, tex = true): void {
  const c0 = shade(STONE[Math.floor(r() * STONE.length)], (r() - 0.5) * 0.1);
  ctx.save();
  p(ctx);
  ctx.clip();
  const g = ctx.createLinearGradient(box.x, box.y, box.x + box.w * 0.4, box.y + box.h);
  g.addColorStop(0, shade(c0, 0.08));
  g.addColorStop(0.55, c0);
  g.addColorStop(1, mix(shade(c0, -0.2), '#141020', 0.2));
  ctx.fillStyle = g;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  if (tex) grain(ctx, box, 'speckle', 0.25, 1);
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(8,6,14,0.45)';
  ctx.save();
  ctx.translate(2, 2.5);
  p(ctx);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = rgba('#fff2d8', 0.16);
  ctx.save();
  ctx.translate(-1.5, -2);
  p(ctx);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
  ctx.strokeStyle = 'rgba(30,24,22,0.9)';
  ctx.lineWidth = 2;
  p(ctx);
  ctx.stroke();
}

function wall(ctx: Ctx, r: R): void {
  const box = { x: 0, y: 0, w: W, h: TY };
  ashlar(ctx, r, box, STONE, '#4a443c', { rowH: 64, minW: 130, maxW: 240, weather: 0.6, seed: 61 });
  surface(ctx, r, box, STONE_MID, { over: true, vary: 0.35, cells: 5, mottle: 0.2, strokes: 0, grain: 0.06, seed: 63, warm: '#b8a07c', cool: '#3e4460' });
  nightLight(ctx, box);
  // soot: the smoke has blackened the stone over each brazier, up past the window's head to the plate
  for (const x of HK.wins) {
    ctx.save();
    ctx.translate(x, 250);
    ctx.scale(1, 2.3);
    const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 150);
    g.addColorStop(0, 'rgba(10,8,8,0.5)');
    g.addColorStop(0.6, 'rgba(10,8,8,0.22)');
    g.addColorStop(1, 'rgba(10,8,8,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-160, -160, 320, 320);
    ctx.restore();
  }
  // the moon's cold light leaking round the lancets onto the stone beside them
  for (const x of HK.wins) {
    lightPool(ctx, x, 380, 190, 250, '#7088c8', 0.05);
    lightPool(ctx, x, W2.sill + 40, 170, 50, '#7a90d0', 0.07);
  }
  // wear: damp runs down from the plate, stains under the sills, cracks where the window heads gather the load
  streaks(ctx, r, 0, HK.plate.y1, W, 200, '#100c0c', 0.2, 12);
  for (const x of HK.wins) {
    streaks(ctx, r, x - 120, W2.sill + 26, 240, 90, '#120e0c', 0.18, 4);
    crack(ctx, r, x - W2.hw - 66, SPRING - 20, 2.3, 90, { col: '#141010', lip: '#c8b8a0', w: 1.6, a: 0.45 });
    crack(ctx, r, x + W2.hw + 70, W2.top + 40, -0.6, 70, { col: '#141010', lip: '#c8b8a0', w: 1.6, a: 0.45 });
  }
  grime(ctx, box, { bottom: 120, a: 0.42, patchy: 0.5, seed: 65, col: '#0e0c0a' });
  // the plinth course along the wall's foot: a projecting base, its chamfered top catching the fire
  const py = TY - 50;
  const plinth = rectPath(-10, py, W + 20, TY - py + 4);
  castShadow(ctx, plinth, 6, 10, 0.4);
  ctx.save();
  plinth(ctx);
  ctx.clip();
  ashlar(ctx, r, { x: 0, y: py, w: W, h: TY - py }, STONE.map((c) => shade(c, -0.06)), '#3e3830', { rowH: 54, minW: 160, maxW: 300, weather: 0.7, seed: 67 });
  vfill(ctx, 0, py, W, TY - py, [[0, 'rgba(10,8,12,0.25)'], [1, 'rgba(10,8,12,0.6)']]);
  for (const x of HK.wins) lightPool(ctx, x, py + 10, 360, 50, FIRE_C, 0.3);
  ctx.restore();
  vfill(ctx, 0, py - 8, W, 9, [[0, 'rgba(255,210,160,0)'], [1, 'rgba(255,210,160,0.1)']]);
  ctx.fillStyle = rgba('#ffd0a0', 0.12);
  ctx.fillRect(0, py, W, 2);
  for (const x of HK.wins) lightPool(ctx, x, py + 1, 300, 6, '#ffb070', 0.35);
  crevice(ctx, 0, W, TY, -60, 0.5);
}

// ——— the roof: the wall plate, posts, braces, corbels ———

function roof(ctx: Ctx, r: R): void {
  const { y0, y1 } = HK.plate;
  // above the plate: the roof's underside lost in the dark, the rafters only just there
  vfill(ctx, 0, 0, W, y0 + 4, [[0, '#07060a'], [1, '#16110e']]);
  for (let x = -40; x < W + 40; x += 96) {
    ctx.strokeStyle = rgba('#3a2a1e', 0.35);
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x + (x - 960) * 0.18, -10);
    ctx.stroke();
    ctx.strokeStyle = rgba('#0a0806', 0.5);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 8, y0);
    ctx.lineTo(x + 8 + (x - 960) * 0.18, -10);
    ctx.stroke();
  }
  vfill(ctx, 0, 0, W, y0, [[0, 'rgba(4,3,6,0.7)'], [1, 'rgba(4,3,6,0.1)']]);
  // the plate: a squared oak beam the length of the hall
  const p = rectPath(-10, y0, W + 20, y1 - y0);
  castShadow(ctx, p, 12, 20, 0.6);
  solid(ctx, p, { x: 0, y: y0, w: W, h: y1 - y0 }, 'wood', OAK, { depth: 0.1, line: false, formSize: 10 });
  within(ctx, p, () => {
    woodGrain(ctx, r, { x: 0, y: y0, w: W, h: y1 - y0 }, OAK, false, 0.8);
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = rgba('#140804', 0.25);
      ctx.beginPath();
      ctx.ellipse(r() * W, y0 + 8 + r() * 24, 22 + r() * 24, 3.5, 0, 0, P2);
      ctx.fill();
    }
    vfill(ctx, 0, y0, W, y1 - y0, [[0, 'rgba(10,4,2,0.6)'], [0.7, 'rgba(10,4,2,0.18)'], [0.86, rgba('#ffb070', 0.1)], [1, 'rgba(10,4,2,0.5)']]);
    for (const x of HK.wins) lightPool(ctx, x, y1, 460, 26, FIRE_C, 0.16);
  });
  ctx.strokeStyle = '#120804';
  ctx.lineWidth = lineAt(0.1);
  ctx.beginPath();
  ctx.moveTo(0, y1);
  ctx.lineTo(W, y1);
  ctx.stroke();
  // the posts down the wall from the plate to the corbels, an arched brace each side of each
  for (const x of HK.posts) post(ctx, r, x);
}

function post(ctx: Ctx, r: R, x: number): void {
  const { y1 } = HK.plate;
  const cy = HK.corbelY;
  const pw = 34;
  // the braces: curved oak from the post up into the plate, a timber of even width, its upper edge lit
  for (const s of [-1, 1]) {
    const ax = x + s * (pw * 0.5 + 8);
    const ay = cy - 56;
    const bx = x + s * 140;
    const by = y1 + 8;
    const pts: [number, number][] = [];
    for (let i = 0; i <= 18; i++) {
      const t = i / 18;
      // a quarter-round sweep: up the post, then out along the plate
      pts.push([(1 - t) * (1 - t) * ax + 2 * (1 - t) * t * ax + t * t * bx, (1 - t) * (1 - t) * ay + 2 * (1 - t) * t * by + t * t * by]);
    }
    const b = taper(pts, 22, 22);
    const bb = { x: Math.min(ax, bx) - 14, y: y1, w: Math.abs(bx - ax) + 28, h: ay - y1 + 14 };
    castShadow(ctx, b, 10, 14, 0.55);
    solid(ctx, b, bb, 'wood', shade(OAK, -0.05), { depth: 0.12, line: 1.4, formSize: 6 });
    within(ctx, b, () => {
      woodGrain(ctx, r, bb, OAK, false, 0.4);
      vfill(ctx, bb.x, bb.y, bb.w, bb.h, [[0, 'rgba(8,4,2,0.5)'], [1, 'rgba(8,4,2,0.12)']]);
    });
    // pegs where it's tenoned into the post and the plate
    for (const [px, py] of [[x + s * pw * 0.25, ay + 8], [bx - s * 6, y1 + 12]] as const) {
      ctx.fillStyle = '#1a0e08';
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, P2);
      ctx.fill();
      ctx.fillStyle = rgba('#d0a070', 0.3);
      ctx.fillRect(px - 2, py - 2.5, 2, 1.2);
    }
  }
  const pp = rectPath(x - pw / 2, y1 - 2, pw, cy - y1 + 2);
  castShadow(ctx, pp, 12, 16, 0.6);
  solid(ctx, pp, { x: x - pw / 2, y: y1, w: pw, h: cy - y1 }, 'wood', OAK, { depth: 0.12, line: 1.4, formSize: 8 });
  within(ctx, pp, () => {
    woodGrain(ctx, r, { x: x - pw / 2, y: y1, w: pw, h: cy - y1 }, OAK, true, 0.6);
    vfill(ctx, x - pw / 2, y1, pw, cy - y1, [[0, 'rgba(8,4,2,0.55)'], [1, 'rgba(8,4,2,0.05)']]);
    const g = ctx.createLinearGradient(x - pw / 2, 0, x + pw / 2, 0);
    g.addColorStop(0, rgba('#ffc890', 0.1));
    g.addColorStop(0.5, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(8,4,2,0.4)');
    ctx.fillStyle = g;
    ctx.fillRect(x - pw / 2, y1, pw, cy - y1);
  });
  // the corbel: a moulded stone bracket, a carved crown on its face
  const co = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x - 34, cy);
    c.lineTo(x + 34, cy);
    c.lineTo(x + 30, cy + 12);
    c.quadraticCurveTo(x + 26, cy + 40, x + 8, cy + 62);
    c.lineTo(x - 8, cy + 62);
    c.quadraticCurveTo(x - 26, cy + 40, x - 30, cy + 12);
    c.closePath();
  };
  castShadow(ctx, co, 10, 14, 0.55);
  solid(ctx, co, { x: x - 34, y: cy, w: 68, h: 62 }, 'stone', shade(STONE_MID, -0.1), { depth: 0.12, line: 1.4, formSize: 8 });
  within(ctx, co, () => {
    vfill(ctx, x - 34, cy, 68, 62, [[0, 'rgba(8,6,10,0.1)'], [1, 'rgba(8,6,10,0.55)']]);
    ctx.fillStyle = rgba('#ffe2c0', 0.14);
    ctx.fillRect(x - 34, cy, 68, 3);
    // the crown, cut in low relief: lit on its upper left edges, shadowed under
    const crown = (c: Ctx, ox: number, oy: number) => {
      c.beginPath();
      c.moveTo(ox - 15, oy + 10);
      c.lineTo(ox - 15, oy - 4);
      c.lineTo(ox - 8, oy + 3);
      c.lineTo(ox, oy - 9);
      c.lineTo(ox + 8, oy + 3);
      c.lineTo(ox + 15, oy - 4);
      c.lineTo(ox + 15, oy + 10);
      c.closePath();
    };
    crown(ctx, x + 1.5, cy + 25);
    ctx.fillStyle = 'rgba(10,8,10,0.5)';
    ctx.fill();
    crown(ctx, x - 0.5, cy + 23.5);
    ctx.fillStyle = rgba('#a89a88', 0.55);
    ctx.fill();
  });
  // the post's foot sits on the corbel: occlusion where they meet
  crevice(ctx, x - pw / 2, x + pw / 2, cy, 6, 0.5);
}

// ——— the lancets: the night beyond ———

function view(ctx: Ctx, r: R, cx: number): void {
  const p = path(lancet(cx, 2));
  const b = GLASS_BOX(cx);
  const left = cx < 960;
  ctx.save();
  p(ctx);
  ctx.clip();
  skyFill(ctx, { x: b.x - 4, y: b.y - 4, w: b.w + 8, h: b.h + 8 }, [[0, '#0a1226'], [0.5, '#1a2646'], [0.8, '#2e3c62'], [1, '#3a4a72']], 0.05);
  // the moon behind the storm, high over the left lancet: a pale blur through the cloud
  const mx = left ? cx + 30 : cx - 60;
  const my = left ? W2.top + 70 : W2.top + 150;
  glowAt(ctx, mx, my, left ? 150 : 90, '#c8d4f0', left ? 0.34 : 0.14);
  if (left) glowAt(ctx, mx, my, 26, '#f0f4ff', 0.55);
  stars(ctx, r, { x: b.x, y: b.y, w: b.w, h: 80 }, 6, '#dfe6ff');
  // the storm's cloud: banks driving across, lit from the moon above
  for (let i = 0; i < 4; i++) {
    const y = W2.top + 40 + i * 60 + r() * 20;
    cloud(ctx, r, cx + (r() - 0.5) * 160, y, 260 + r() * 140, 60 + r() * 40, { lit: '#9aa8d0', body: '#3a4670', shadow: '#1a2240', sunX: mx, sunY: my - 200, kind: 'bank', a: 0.7 - i * 0.1, rim: 0.4 });
  }
  // the range: a moonlit peak, snow on its lit faces, the shaded flank in blue
  const base = W2.sill - 70;
  const pk = left ? [cx - 120, cx - 40, cx + 10, cx + 70, cx + 140] : [cx - 140, cx - 60, cx - 10, cx + 50, cx + 130];
  const ph = left ? [base - 60, base - 130, base - 168, base - 110, base - 40] : [base - 40, base - 120, base - 96, base - 150, base - 60];
  const pts: [number, number][] = [[cx - 160, base + 40]];
  pk.forEach((x, i) => pts.push([x, ph[i]]));
  pts.push([cx + 160, base + 40]);
  farLand(ctx, pts, base + 40, '#4a5a86', 0.4, NIGHT_AIR, '#dde6ff', 0.5);
  // snow fields on the faces turned to the moon: pale wedges down from each summit
  for (let i = 1; i < pk.length - 1; i++) {
    const [x, y] = [pk[i], ph[i]];
    ctx.fillStyle = rgba('#c8d4f4', 0.26);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 34, y + 60 + r() * 30);
    ctx.lineTo(x - 12, y + 52);
    ctx.lineTo(x - 4, y + 90);
    ctx.lineTo(x + 6, y + 30);
    ctx.closePath();
    ctx.fill();
  }
  // snow blowing off the ridges in plumes
  ctx.save();
  ctx.filter = 'blur(6px)';
  for (let i = 1; i < pk.length - 1; i++) {
    const g = ctx.createLinearGradient(pk[i], 0, pk[i] - 90, 0);
    g.addColorStop(0, rgba('#d8e0f8', 0.35));
    g.addColorStop(1, rgba('#d8e0f8', 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(pk[i] - 40, ph[i] + 6, 50, 9, -0.15, 0, P2);
    ctx.fill();
  }
  ctx.restore();
  // the forest below: firs in tiers, laden, the nearest dark against the snow
  treeLine(ctx, r, b.x - 20, b.x + b.w + 20, base + 26, 40, 70, '#22304e', { depth: 0.55, air: NIGHT_AIR, rim: '#b8c8f0', rimA: 0.25, mist: '#5a6a96', mistA: 0.3 });
  vfill(ctx, b.x, base + 20, b.w, W2.sill - base - 20, [[0, '#7a88b4'], [1, '#9aa8d0']]);
  for (let i = 0; i < 3; i++) {
    const x = b.x + 20 + r() * (b.w - 40);
    firSilhouette(ctx, r, x, W2.sill - 14, 70 + r() * 40, 36 + r() * 12, '#121a30', '#c8d4f4', 0.3);
  }
  // the drift on the outside sill: snow heaped against the glass, blue in its hollows
  ctx.beginPath();
  ctx.moveTo(b.x - 4, W2.sill + 2);
  for (let x = b.x - 4; x <= b.x + b.w + 4; x += 8) ctx.lineTo(x, W2.sill - 16 - Math.sin((x - b.x) * 0.03 + cx) * 5 - (x - b.x) * (left ? 0.04 : -0.02));
  ctx.lineTo(b.x + b.w + 4, W2.sill + 2);
  ctx.closePath();
  const dg = ctx.createLinearGradient(0, W2.sill - 26, 0, W2.sill);
  dg.addColorStop(0, '#e4ecff');
  dg.addColorStop(1, '#8a98c4');
  ctx.fillStyle = dg;
  ctx.fill();
  ctx.restore();
}

// ——— the lancets: the glazing (over the snow) ———

function glazing(ctx: Ctx, r: R, cx: number): void {
  const p = path(lancet(cx, 2));
  const b = GLASS_BOX(cx);
  ctx.save();
  p(ctx);
  ctx.clip();
  // the old glass: a faint cool body, uneven (each quarry catches the room a little differently)
  ctx.fillStyle = 'rgba(90,110,160,0.08)';
  ctx.fillRect(b.x, b.y, b.w, b.h);
  // frost creeping up from the bottom of the glass and in from its edges
  lay(ctx, noiseMask(9, 71 + cx, { cover: 0.5, soft: 0.35, col: '#e8f0ff' }), { x: b.x, y: W2.sill - 90, w: b.w, h: 90 }, 0.22);
  vfill(ctx, b.x, W2.sill - 50, b.w, 50, [[0, 'rgba(230,238,255,0)'], [1, 'rgba(230,238,255,0.22)']]);
  // the brazier's fire reflected in the glass behind it, low in the middle (plain alpha: it's baked over the snow)
  const rg = ctx.createRadialGradient(cx, W2.sill - 30, 0, cx, W2.sill - 30, 110);
  rg.addColorStop(0, 'rgba(255,170,90,0.3)');
  rg.addColorStop(0.5, 'rgba(255,140,60,0.1)');
  rg.addColorStop(1, 'rgba(255,140,60,0)');
  ctx.fillStyle = rg;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  // the leading: diamond quarries, each came a dark lead strip with a dull lit edge
  const qw = 46;
  const qh = 70;
  ctx.lineCap = 'butt';
  for (const [col, wid, off] of [['#0e0c12', 2.6, 0], [rgba('#a8b0c8', 0.25), 0.8, -1]] as const) {
    ctx.strokeStyle = col;
    ctx.lineWidth = wid;
    ctx.beginPath();
    for (let k = -12; k < 14; k++) {
      const x0 = cx + k * qw;
      ctx.moveTo(x0 + off, b.y - 10);
      ctx.lineTo(x0 + off + ((b.h + 20) * qw) / qh, b.y + b.h + 10);
      ctx.moveTo(x0 + off, b.y - 10);
      ctx.lineTo(x0 + off - ((b.h + 20) * qw) / qh, b.y + b.h + 10);
    }
    ctx.stroke();
  }
  // a stained roundel in the head: the crown on blue in a ruby ring, dark at night, the fire glinting in it
  const ry = W2.top + 92;
  ctx.fillStyle = '#0e0c12';
  ctx.beginPath();
  ctx.arc(cx, ry, 40, 0, P2);
  ctx.fill();
  const jewel = (col: string, rad: number) => {
    const g = ctx.createRadialGradient(cx - rad * 0.3, ry - rad * 0.3, 2, cx, ry, rad);
    g.addColorStop(0, mix(col, '#ffffff', 0.18));
    g.addColorStop(1, shade(col, -0.45));
    return g;
  };
  ctx.fillStyle = jewel('#7a1424', 36);
  ctx.beginPath();
  ctx.arc(cx, ry, 36, 0, P2);
  ctx.fill();
  ctx.fillStyle = jewel('#1c2a6a', 26);
  ctx.beginPath();
  ctx.arc(cx, ry, 25, 0, P2);
  ctx.fill();
  ctx.fillStyle = '#9a7a2a';
  ctx.beginPath();
  ctx.moveTo(cx - 15, ry + 10);
  ctx.lineTo(cx - 15, ry - 5);
  ctx.lineTo(cx - 7, ry + 3);
  ctx.lineTo(cx, ry - 12);
  ctx.lineTo(cx + 7, ry + 3);
  ctx.lineTo(cx + 15, ry - 5);
  ctx.lineTo(cx + 15, ry + 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#0e0c12';
  ctx.lineWidth = 2.6;
  ctx.stroke();
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * P2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 25, ry + Math.sin(a) * 25);
    ctx.lineTo(cx + Math.cos(a) * 37, ry + Math.sin(a) * 37);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(cx, ry, 25, 0, P2);
  ctx.stroke();
  ctx.fillStyle = rgba('#ffd0a0', 0.12);
  ctx.beginPath();
  ctx.ellipse(cx - 12, ry + 16, 12, 6, -0.5, 0, P2);
  ctx.fill();
  // the iron saddle bars across the light, a dull lit top on each
  for (let y = SPRING - 30; y < W2.sill - 20; y += 78) {
    ctx.fillStyle = '#16141a';
    ctx.fillRect(b.x - 4, y, b.w + 8, 5);
    ctx.fillStyle = rgba('#c8a890', 0.3);
    ctx.fillRect(b.x - 4, y, b.w + 8, 1.2);
  }
  // the sheen of the glass: broad pale bands (plain alpha)
  for (const [u, bw, al] of [[0.1, 0.25, 0.06], [0.55, 0.1, 0.04]] as const) {
    const x0 = b.x + b.w * u;
    const g = ctx.createLinearGradient(x0, 0, x0 + b.w * bw, 0);
    g.addColorStop(0, 'rgba(220,230,255,0)');
    g.addColorStop(0.5, rgba('#dce6ff', al));
    g.addColorStop(1, 'rgba(220,230,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x0, b.y + b.h);
    ctx.lineTo(x0 + b.w * bw, b.y + b.h);
    ctx.lineTo(x0 + b.w * bw + b.h * 0.3, b.y);
    ctx.lineTo(x0 + b.h * 0.3, b.y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  void r;
}

// ——— the lancets: reveal, arch stones, hood and sill ———

const REVEAL = 34;
const RING = 30;

function frame(ctx: Ctx, r: R, cx: number): void {
  const hw = W2.hw;
  // the splay: the wall's thickness cut back to the glass, lit from below by the brazier, cool where the moon reaches
  const ring = (g0: number, g1: number, bottom = W2.sill) => (c: Ctx) => {
    c.beginPath();
    lancet(cx, g1, bottom)(c);
    lancet(cx, g0, bottom)(c);
  };
  ctx.save();
  ring(0, REVEAL)(ctx);
  ctx.clip('evenodd');
  const box = { x: cx - hw - REVEAL - 4, y: W2.top - REVEAL * 2, w: (hw + REVEAL) * 2 + 8, h: W2.sill - W2.top + REVEAL * 2 };
  surface(ctx, r, box, shade(STONE_MID, -0.12), { vary: 0.4, cells: 3, mottle: 0.3, strokes: 0.3, strokeAng: Math.PI / 2, strokeLen: 60, grain: 0.18, grainKind: 'speckle', seed: 73 });
  // coursing: the splay is built of the same courses as the wall
  for (let y = W2.top - 40; y < W2.sill; y += 64) {
    ctx.fillStyle = 'rgba(10,8,12,0.4)';
    ctx.fillRect(box.x, y, box.w, 2.5);
    ctx.fillStyle = rgba('#fff2d8', 0.08);
    ctx.fillRect(box.x, y + 2.5, box.w, 1.2);
  }
  nightLight(ctx, box, 1.15);
  // the splayed faces turn towards the room: deeper in shadow up in the head, the fire right under them
  vfill(ctx, box.x, box.y, box.w, box.h, [[0, 'rgba(8,6,12,0.5)'], [0.5, 'rgba(8,6,12,0.18)'], [1, 'rgba(8,6,12,0)']]);
  lightPool(ctx, cx, W2.sill - 20, 170, 240, FIRE_C, 0.2);
  lightPool(ctx, cx, W2.sill - 60, 120, 300, '#7088c8', 0.06);
  // soot up the splay over the fire
  const sg = ctx.createRadialGradient(cx, W2.top + 60, 10, cx, W2.top + 60, 160);
  sg.addColorStop(0, 'rgba(8,6,6,0.5)');
  sg.addColorStop(1, 'rgba(8,6,6,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.restore();
  // the arris where the splay meets the glass: a dark rebate, then a lit edge where it meets the wall
  ctx.strokeStyle = '#0c0a0e';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  lancet(cx, 0)(ctx);
  ctx.stroke();
  // the arch ring: voussoirs round the head, long and short quoins down the jambs
  const R0 = 2 * hw + REVEAL;
  const R1 = R0 + RING;
  const aMax = Math.acos(hw / R0);
  const stones: PathFn[] = [];
  for (const s of [-1, 1]) {
    const ccx = cx - s * hw;
    const n = 5;
    for (let i = 0; i < n; i++) {
      const u0 = i / n;
      const u1 = (i + 1) / n;
      const ang = (u: number) => (s < 0 ? Math.PI + u * Math.acos(hw / R1) : P2 - u * Math.acos(hw / R1));
      const angI = (u: number) => (s < 0 ? Math.PI + u * aMax : P2 - u * aMax);
      stones.push((c) => {
        c.beginPath();
        c.moveTo(ccx + Math.cos(angI(u0)) * R0, SPRING + Math.sin(angI(u0)) * R0);
        c.lineTo(ccx + Math.cos(ang(u0)) * R1, SPRING + Math.sin(ang(u0)) * R1);
        c.arc(ccx, SPRING, R1, ang(u0), ang(u1), s > 0);
        c.lineTo(ccx + Math.cos(angI(u1)) * R0, SPRING + Math.sin(angI(u1)) * R0);
        c.arc(ccx, SPRING, R0, angI(u1), angI(u0), s < 0);
        c.closePath();
      });
    }
    // the jambs
    let y = SPRING;
    for (let i = 0; y < W2.sill; i++) {
      const h = Math.min(W2.sill - y, 58 + r() * 10);
      const long = i % 2 === 0;
      const xa = s < 0 ? cx - hw - REVEAL - (long ? RING + 18 : RING) : cx + hw + REVEAL;
      const w = long ? RING + 18 : RING;
      const yy = y;
      stones.push((c) => {
        c.beginPath();
        c.rect(xa, yy, w, h);
      });
      y += h;
    }
  }
  // the keystone at the apex
  const apexY = SPRING - Math.sqrt(R1 * R1 - hw * hw);
  stones.push((c) => {
    c.beginPath();
    c.moveTo(cx - 12, apexY - 10);
    c.lineTo(cx + 12, apexY - 10);
    c.lineTo(cx + 8, apexY + RING + 4);
    c.lineTo(cx - 8, apexY + RING + 4);
    c.closePath();
  });
  const fullRing = ring(REVEAL, REVEAL + RING + 18);
  const ringBox = { x: cx - hw - 120, y: W2.top - 80, w: hw * 2 + 240, h: W2.sill - W2.top + 100 };
  for (const st of stones) dressed(ctx, r, st, ringBox, false);
  // the ring's light: the hall's (as on the wall), the fire right under it, soot on the crown of the arch
  ctx.save();
  fullRing(ctx);
  ctx.clip('evenodd');
  grain(ctx, ringBox, 'speckle', 0.25, 1);
  nightLight(ctx, ringBox);
  lightPool(ctx, cx, W2.sill, 200, 280, FIRE_C, 0.16);
  const sg2 = ctx.createRadialGradient(cx, W2.top - 20, 10, cx, W2.top - 20, 130);
  sg2.addColorStop(0, 'rgba(8,6,6,0.5)');
  sg2.addColorStop(1, 'rgba(8,6,6,0)');
  ctx.fillStyle = sg2;
  ctx.fillRect(cx - 200, W2.top - 120, 400, 300);
  ctx.restore();
  // the hood mould over the arch, ending in carved stops at the springing
  const hood = R1 + 22;
  const ha = Math.acos(hw / hood);
  const hoodP = (c: Ctx) => {
    c.beginPath();
    c.arc(cx + hw, SPRING, hood, Math.PI, Math.PI + ha);
    c.arc(cx - hw, SPRING, hood, P2 - ha, P2);
  };
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(8,6,10,0.5)';
  ctx.lineWidth = 16;
  ctx.save();
  ctx.translate(3, 5);
  hoodP(ctx);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = shade(STONE_MID, -0.4);
  ctx.lineWidth = 14;
  hoodP(ctx);
  ctx.stroke();
  ctx.strokeStyle = rgba('#e8d8c0', 0.14);
  ctx.lineWidth = 4;
  ctx.save();
  ctx.translate(-1.5, -3);
  hoodP(ctx);
  ctx.stroke();
  ctx.restore();
  for (const s of [-1, 1]) {
    const sx = cx + s * (hood - hw);
    const stop = rrPath(sx - 11, SPRING - 4, 22, 26, 6);
    castShadow(ctx, stop, 5, 6, 0.5);
    solid(ctx, stop, { x: sx - 11, y: SPRING - 4, w: 22, h: 26 }, 'stone', shade(STONE_MID, -0.22), { depth: 0.12, line: 1.2, formSize: 5 });
  }
  // the sill: a deep stone ledge, its top lit by the fire, a shadow under its nose
  const sl = rectPath(cx - hw - REVEAL - 26, W2.sill, (hw + REVEAL + 26) * 2, 20);
  castShadow(ctx, sl, 10, 12, 0.6);
  solid(ctx, sl, { x: cx - hw - REVEAL - 26, y: W2.sill, w: (hw + REVEAL + 26) * 2, h: 20 }, 'stone', shade(STONE_MID, -0.08), { depth: 0.12, line: 1.6, formSize: 5 });
  within(ctx, sl, () => {
    vfill(ctx, cx - 200, W2.sill, 400, 20, [[0, rgba('#ffc890', 0.25)], [0.3, 'rgba(0,0,0,0)'], [1, 'rgba(8,6,10,0.5)']]);
    lightPool(ctx, cx, W2.sill + 6, 160, 16, FIRE_C, 0.35);
  });
  // the reveal's foot: occlusion where the splay meets the sill
  crevice(ctx, cx - hw - REVEAL, cx + hw + REVEAL, W2.sill, -8, 0.45);
}

const FRAME_BOX = (cx: number): Box => ({ x: cx - W2.hw - REVEAL - RING - 40, y: W2.top - 92, w: (W2.hw + REVEAL + RING + 40) * 2, h: W2.sill + 38 - (W2.top - 92) });

// ——— the braziers ———

/** The coal bed's outline over the bowl: a low, lumpy heap. */
function coalHeap(x: number): PathFn {
  const { rimY, rimHW, coalY } = HK.brz;
  return (c) => {
    c.beginPath();
    c.moveTo(x - rimHW + 4, rimY);
    for (let i = 0; i <= 14; i++) {
      const u = i / 14;
      const hump = Math.sin(u * Math.PI) ** 0.7;
      const lump = Math.sin(i * 2.7 + x) * 3 + (i % 2 ? -2 : 2);
      c.lineTo(x - rimHW + 4 + u * (rimHW * 2 - 8), rimY - hump * (rimY - coalY + 10) + lump * hump);
    }
    c.closePath();
  };
}

/** A band of varying width along a centreline (a wrought leg, a stem). */
function taper(pts: [number, number][], w0: number, w1: number): PathFn {
  return (c) => {
    const L: [number, number][] = [];
    const Rr: [number, number][] = [];
    pts.forEach(([x, y], i) => {
      const [ax, ay] = pts[Math.max(0, i - 1)];
      const [bx, by] = pts[Math.min(pts.length - 1, i + 1)];
      const l = Math.hypot(bx - ax, by - ay) || 1;
      const nx = -(by - ay) / l;
      const ny = (bx - ax) / l;
      const w = (w0 + (w1 - w0) * (i / (pts.length - 1))) / 2;
      L.push([x + nx * w, y + ny * w]);
      Rr.push([x - nx * w, y - ny * w]);
    });
    c.beginPath();
    L.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    for (let i = Rr.length - 1; i >= 0; i--) c.lineTo(Rr[i][0], Rr[i][1]);
    c.closePath();
  };
}

function brazier(ctx: Ctx, r: R, x: number): void {
  const { rimY, rimHW, bowlD } = HK.brz;
  const bot = rimY + bowlD;
  // the tripod: three wrought legs from under the bowl, splaying out to scrolled feet standing on the floor
  for (const [dx, near] of [[-96, false], [96, false], [0, true]] as const) {
    const side = Math.sign(dx);
    const cl: [number, number][] = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      // a curve that leaves the bowl steeply and kicks out near the floor
      const px = x + dx * 0.22 + (dx - dx * 0.22) * t ** 1.7;
      const py = bot - 8 + (TY - 14 - (bot - 8)) * t;
      cl.push([px, py]);
    }
    const lp = taper(cl, near ? 10 : 8.5, near ? 7 : 6);
    const lb = { x: x + Math.min(0, dx) - 20, y: bot - 10, w: Math.abs(dx) + 40, h: TY - bot + 10 };
    solid(ctx, lp, lb, 'iron', IRON, { depth: near ? 0.1 : 0.14, line: 1.4, formSize: 4 });
    within(ctx, lp, () => vfill(ctx, lb.x, bot, lb.w, TY - bot, [[0, 'rgba(255,140,60,0.34)'], [0.4, 'rgba(255,140,60,0.06)'], [1, 'rgba(0,0,0,0.3)']]));
    rim(ctx, lp, 0.25, 2, '#9ab0e8');
    // the foot: a scroll curled outward, standing on the floor in its own shadow
    const fx = x + dx + side * 6;
    groundShadow(ctx, fx + 4, TY - 2, 20, 4, 0.6);
    const foot = (c: Ctx) => {
      c.beginPath();
      c.ellipse(fx, TY - 9, 11, 8, 0, 0, P2);
    };
    solid(ctx, foot, { x: fx - 11, y: TY - 17, w: 22, h: 16 }, 'iron', IRON, { depth: 0.12, line: 1.4, formSize: 3 });
    ctx.strokeStyle = rgba('#ff9a50', 0.35);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(fx, TY - 9, 5, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  }
  // the ring that braces the legs
  const ry = bot + 30;
  ctx.strokeStyle = '#141214';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.ellipse(x, ry, 52, 8, 0, 0, Math.PI);
  ctx.stroke();
  ctx.strokeStyle = shade(IRON, 0.25);
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.strokeStyle = rgba('#ffa060', 0.4);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(x, ry - 1.5, 52, 8, 0, 0.15, Math.PI - 0.15);
  ctx.stroke();
  // the bowl: a deep iron dish, its belly turned away from the fire into shade, lit warm under the rim
  const bowl = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x - rimHW, rimY);
    c.bezierCurveTo(x - rimHW, rimY + bowlD * 0.8, x - rimHW * 0.5, bot, x, bot);
    c.bezierCurveTo(x + rimHW * 0.5, bot, x + rimHW, rimY + bowlD * 0.8, x + rimHW, rimY);
    c.closePath();
  };
  solid(ctx, bowl, { x: x - rimHW, y: rimY, w: rimHW * 2, h: bowlD }, 'iron', IRON, { depth: 0.1, line: 1.8, formSize: 12 });
  within(ctx, bowl, () => {
    vfill(ctx, x - rimHW, rimY, rimHW * 2, bowlD, [[0, 'rgba(255,150,70,0.35)'], [0.25, 'rgba(255,150,70,0.06)'], [1, 'rgba(0,0,0,0.35)']]);
    // hammered: dimples catching the light, and bands of rivets
    for (let i = 0; i < 26; i++) {
      const u = r() * 2 - 1;
      const v = r();
      const px = x + u * rimHW * (1 - v * 0.45);
      const py = rimY + 8 + v * (bowlD - 14);
      ctx.fillStyle = rgba('#ffb070', 0.1 + (1 - v) * 0.12);
      ctx.beginPath();
      ctx.ellipse(px - 1, py - 1, 4, 2.5, 0, 0, P2);
      ctx.fill();
    }
    for (let k = -6; k <= 6; k++) {
      const px = x + (k / 6.6) * rimHW * 0.96;
      ctx.fillStyle = '#121012';
      ctx.beginPath();
      ctx.arc(px, rimY + 13, 2.4, 0, P2);
      ctx.fill();
      ctx.fillStyle = rgba('#ffc890', 0.5);
      ctx.fillRect(px - 1.5, rimY + 11, 1.6, 1.2);
    }
  });
  rim(ctx, bowl, 0.3, 2.5, '#9ab0e8');
  // the coals heaped above the rim: black crust, glowing seams, a white-hot heart
  const heap = coalHeap(x);
  ctx.save();
  heap(ctx);
  ctx.clip();
  // the glow between the lumps, then the lumps: charred crusts, each lit on its top by the flames over it, their
  // undersides glowing where the heat comes up through the bed
  vfill(ctx, x - rimHW, HK.brz.coalY - 20, rimHW * 2, rimY - HK.brz.coalY + 22, [[0, '#ffb040'], [0.5, '#f06a18'], [1, '#a82a0a']]);
  for (let i = 0; i < 60; i++) {
    const u = r() * 2 - 1;
    const py = HK.brz.coalY - 10 + (1 - Math.cos(u * 1.4)) * 18 + r() * 22;
    const px = x + u * rimHW;
    const s = 5 + r() * 6;
    const lump = (c: Ctx) => {
      c.beginPath();
      c.moveTo(px - s, py);
      c.lineTo(px - s * 0.4, py - s * 0.75);
      c.lineTo(px + s * 0.7, py - s * 0.55);
      c.lineTo(px + s, py + s * 0.3);
      c.lineTo(px - s * 0.1, py + s * 0.7);
      c.closePath();
    };
    lump(ctx);
    ctx.fillStyle = mix('#140a08', '#3a1a10', r());
    ctx.fill();
    ctx.strokeStyle = rgba('#ff7a2a', 0.55);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = rgba('#ffc070', 0.3 + r() * 0.2);
    ctx.fillRect(px - s * 0.4, py - s * 0.62, s * 0.9, 1.4);
  }
  const hg = ctx.createRadialGradient(x, rimY - 6, 0, x, rimY - 6, rimHW * 0.7);
  hg.addColorStop(0, 'rgba(255,240,190,0.6)');
  hg.addColorStop(1, 'rgba(255,160,60,0)');
  ctx.fillStyle = hg;
  ctx.fillRect(x - rimHW, rimY - 30, rimHW * 2, 40);
  ctx.restore();
  // the rim: a rolled lip, lit along its top by the coals
  ctx.strokeStyle = '#100e10';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(x - rimHW - 2, rimY);
  ctx.lineTo(x + rimHW + 2, rimY);
  ctx.stroke();
  ctx.strokeStyle = mix(IRON, '#ff9a50', 0.45);
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(x - rimHW, rimY - 2);
  ctx.lineTo(x + rimHW, rimY - 2);
  ctx.stroke();
  // handles: rings on the bowl's flanks
  for (const s of [-1, 1]) {
    ctx.strokeStyle = '#141214';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x + s * (rimHW + 6), rimY + 14, 9, 0, P2);
    ctx.stroke();
    ctx.strokeStyle = rgba('#ff9a50', 0.5);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x + s * (rimHW + 6), rimY + 14, 9, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  }
}

// ——— fire (painted frames, shared by the still and the live loop) ———

const FIRE_W = 170;
const FIRE_H = 186;

/**
 * One frame of a brazier's fire (phase 0…1 loops), w×h, the coal bed along the bottom middle: tongues that lick up,
 * lean and fall back on their own beats, painted in soft layers from a deep red skin through orange to a yellow
 * body and a white-hot core low down (each layer painted small and drawn up, so it's soft, the core crisper), and a
 * loose tongue breaking off the top and burning out as it rises.
 */
function brazierFrame(out: Ctx, w: number, h: number, ph: number, seed = 1): void {
  // (painted on its own canvas, its base faded into the coals there, then added to the scene)
  const [oc, c] = makeCanvas(w, h);
  const n = 6;
  const by = h - 6;
  const cx = w / 2;
  const span = w * 0.6;
  const p = ph * P2;
  const tongues: [number, number, number, number][] = [];
  for (let j = 0; j < n; j++) {
    const u = j / (n - 1);
    const mid = 1 - Math.abs(u - 0.5) * 1.35;
    const x = cx + (u - 0.5) * span + Math.sin(p * 2 + j * 2.1 + seed) * w * 0.025;
    const th = h * 0.92 * mid * (0.66 + Math.sin(p * 2 + j * 1.7 + seed) * 0.18 + Math.sin(p * 3 + j * 2.9) * 0.1);
    const tw = (span / n) * 2.7 * (0.9 + Math.sin(p + j) * 0.1);
    const lean = Math.sin(p + j * 1.3 + seed) * 0.12 + 0.04;
    tongues.push([x, th, tw, lean]);
  }
  const shape = (g: Ctx, k: number, grow: number) => {
    for (const [x, th, tw, lean] of tongues) {
      const ww = tw * k;
      const hh = th * (0.5 + k * 0.5) * grow;
      g.beginPath();
      g.moveTo(x - ww / 2, by);
      g.bezierCurveTo(x - ww * 0.72, by - hh * 0.45, x - ww * 0.18 + lean * hh * 0.4, by - hh * 0.75, x + lean * hh, by - hh);
      g.bezierCurveTo(x + ww * 0.22 + lean * hh * 0.4, by - hh * 0.7, x + ww * 0.72, by - hh * 0.42, x + ww / 2, by);
      g.quadraticCurveTo(x, by + ww * 0.2, x - ww / 2, by);
      g.fill();
    }
  };
  const layers: [number, string, number, number][] = [
    [1.1, '#a82008', 0.7, 0.22],
    [0.92, '#e8521a', 0.8, 0.3],
    [0.72, '#ff9428', 0.8, 0.4],
    [0.5, '#ffb84a', 0.6, 0.55],
    [0.24, '#ffe8b0', 0.45, 0.8],
  ];
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (const [k, col, a, res] of layers) {
    const [lc, lg] = makeCanvas(Math.ceil(w * res), Math.ceil(h * res));
    lg.scale(res, res);
    lg.fillStyle = rgba(col, a);
    shape(lg, k, k < 0.4 ? 0.75 : 1);
    c.imageSmoothingEnabled = true;
    c.drawImage(lc, 0, 0, w, h);
  }
  const hg = c.createRadialGradient(0, 0, 0, 0, 0, span * 0.45);
  hg.addColorStop(0, 'rgba(255,230,180,0.3)');
  hg.addColorStop(0.4, 'rgba(255,200,110,0.2)');
  hg.addColorStop(1, 'rgba(255,120,40,0)');
  c.save();
  c.translate(cx, by - 6);
  c.scale(1, 0.4);
  c.fillStyle = hg;
  c.fillRect(-w, -h, w * 2, h * 2);
  c.restore();
  // two loose tongues, half a cycle apart, breaking off the tallest tip and burning out as they rise
  for (const off of [0, 0.5]) {
    const q = (ph + off) % 1;
    if (q > 0.45) continue;
    const k = q / 0.45;
    const [tx, th, tw] = tongues[off ? 2 : 4];
    const ty = by - th - k * h * 0.2;
    const lw = tw * 0.3 * (1 - k * 0.7);
    const [lc, lg] = makeCanvas(Math.ceil(w * 0.4), Math.ceil(h * 0.4));
    lg.scale(0.4, 0.4);
    lg.fillStyle = rgba('#ff9a2a', 0.85 * (1 - k));
    lg.beginPath();
    lg.ellipse(tx + k * 6, ty, lw / 2, lw * 1.25, 0, 0, P2);
    lg.fill();
    lg.fillStyle = rgba('#ffe08a', 0.8 * (1 - k));
    lg.beginPath();
    lg.ellipse(tx + k * 6, ty + lw * 0.2, lw / 4, lw * 0.6, 0, 0, P2);
    lg.fill();
    c.drawImage(lc, 0, 0, w, h);
  }
  c.restore();
  // the base sinks into the coals: no hard cut
  c.save();
  c.globalCompositeOperation = 'destination-in';
  const fg = c.createLinearGradient(0, h - 26, 0, h);
  fg.addColorStop(0, 'rgba(0,0,0,1)');
  fg.addColorStop(1, 'rgba(0,0,0,0.15)');
  c.fillStyle = fg;
  c.fillRect(0, 0, w, h);
  c.restore();
  out.save();
  out.globalCompositeOperation = 'lighter';
  out.drawImage(oc, 0, 0);
  out.restore();
}

function fireStill(ctx: Ctx): void {
  HK.wins.forEach((x, i) => {
    glowAt(ctx, x, HK.brz.coalY - 70, 160, '#ff8a3a', 0.28);
    ctx.save();
    ctx.translate(x - FIRE_W / 2, HK.brz.coalY + 4 - FIRE_H);
    brazierFrame(ctx, FIRE_W, FIRE_H, 0.3 + i * 0.37, 1 + i * 2);
    ctx.restore();
  });
}

// ——— the banners ———

const BW = HK.bannerW;
const BH = HK.bannerH;
const TAIL = 46;
/** The banner frame round the hook: margins for the cord, the swing and the soft shadow. */
const BF = { w: BW + 100, h: HK.barY - HK.hookY + BH + TAIL + 66, hx: (BW + 100) / 2 - 3, hy: 10 };

/** The flat cloth: red wool, a gold border, the crown over the foot on a shield, a gold fringe. */
function bannerArt(c: Ctx, w: number, h: number): void {
  const r = rng(hashStr('hk-banner'));
  const g = c.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#8a1822');
  g.addColorStop(1, '#6a101a');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h + TAIL);
  // the weave and the wool's unevenness
  for (let y = 0; y < h + TAIL; y += 3) {
    c.fillStyle = `rgba(0,0,0,${(0.04 + r() * 0.03).toFixed(3)})`;
    c.fillRect(0, y, w, 1);
  }
  for (let i = 0; i < 40; i++) {
    c.fillStyle = rgba(r() < 0.5 ? '#c0303a' : '#4a0810', 0.08);
    c.beginPath();
    c.ellipse(r() * w, r() * (h + TAIL), 10 + r() * 20, 4 + r() * 10, r() * 3, 0, P2);
    c.fill();
  }
  // the sleeve over the crossbar: a doubled hem, stitched
  c.fillStyle = 'rgba(30,4,8,0.35)';
  c.fillRect(0, 0, w, 20);
  c.strokeStyle = rgba('#e0b060', 0.5);
  c.setLineDash([4, 4]);
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(4, 21);
  c.lineTo(w - 4, 21);
  c.stroke();
  c.setLineDash([]);
  // the gold border, following the swallow-tailed hem
  const tailIn = h + TAIL * 0.1;
  const border = (inset: number) => {
    c.beginPath();
    c.moveTo(inset, 26 + inset * 0.2);
    c.lineTo(w - inset, 26 + inset * 0.2);
    c.lineTo(w - inset, h + TAIL - inset * 1.6);
    c.lineTo(w / 2, tailIn - inset * 0.6);
    c.lineTo(inset, h + TAIL - inset * 1.6);
    c.closePath();
  };
  c.strokeStyle = '#2a0608';
  c.lineWidth = 11;
  border(14);
  c.stroke();
  c.strokeStyle = '#a8803a';
  c.lineWidth = 7;
  c.stroke();
  c.strokeStyle = rgba('#ffe8a0', 0.5);
  c.lineWidth = 1.5;
  border(12.5);
  c.stroke();
  // the crown
  const cx = w / 2;
  const crownY = 96;
  const crown = () => {
    c.beginPath();
    c.moveTo(cx - 36, crownY + 20);
    c.lineTo(cx - 40, crownY - 18);
    c.lineTo(cx - 20, crownY);
    c.lineTo(cx, crownY - 30);
    c.lineTo(cx + 20, crownY);
    c.lineTo(cx + 40, crownY - 18);
    c.lineTo(cx + 36, crownY + 20);
    c.closePath();
  };
  crown();
  const cg = c.createLinearGradient(0, crownY - 30, 0, crownY + 20);
  cg.addColorStop(0, '#c8a048');
  cg.addColorStop(1, '#8a6020');
  c.fillStyle = cg;
  c.fill();
  c.strokeStyle = '#3a1a08';
  c.lineWidth = 2.4;
  c.stroke();
  c.fillStyle = '#5a1a10';
  c.fillRect(cx - 36, crownY + 10, 72, 4);
  for (const [px, py, col] of [[cx - 22, crownY + 2, '#2a4ab0'], [cx, crownY - 4, '#c02030'], [cx + 22, crownY + 2, '#2a4ab0']] as const) {
    c.fillStyle = col;
    c.beginPath();
    c.arc(px, py, 4, 0, P2);
    c.fill();
  }
  for (const [px, py] of [[cx - 40, crownY - 18], [cx, crownY - 30], [cx + 40, crownY - 18]] as const) {
    c.fillStyle = '#f8e090';
    c.beginPath();
    c.arc(px, py - 3, 4.5, 0, P2);
    c.fill();
  }
  // the shield and the foot (the kings' arms)
  const sy = 132;
  const shield = () => {
    c.beginPath();
    c.moveTo(cx - 48, sy);
    c.lineTo(cx + 48, sy);
    c.lineTo(cx + 48, sy + 64);
    c.quadraticCurveTo(cx + 44, sy + 122, cx, sy + 146);
    c.quadraticCurveTo(cx - 44, sy + 122, cx - 48, sy + 64);
    c.closePath();
  };
  shield();
  c.fillStyle = '#8c7a5a';
  c.fill();
  c.strokeStyle = '#a8803a';
  c.lineWidth = 5;
  c.stroke();
  c.fillStyle = '#7a1018';
  c.beginPath();
  footPath(c, cx, sy + 68, 78, true);
  c.fill();
  // the gold fringe along the tails
  c.strokeStyle = '#d0a040';
  c.lineWidth = 1.6;
  for (let x = 2; x < w; x += 3.2) {
    const t = Math.abs(x - w / 2) / (w / 2);
    const y = tailIn + (h + TAIL - tailIn) * t;
    c.beginPath();
    c.moveTo(x, y - 4);
    c.lineTo(x + 0.6, y + 7);
    c.stroke();
  }
}

let bannerFlat: { data: Uint8ClampedArray; w: number; h: number } | null = null;
function flatBanner(): { data: Uint8ClampedArray; w: number; h: number } {
  if (bannerFlat) return bannerFlat;
  const w = BW;
  const h = BH + TAIL + 8;
  const [c, g] = makeCanvas(w, h);
  bannerArt(g, w, BH);
  // the swallow tail: cut out under the hem
  g.globalCompositeOperation = 'destination-out';
  g.beginPath();
  g.moveTo(0, BH + TAIL);
  g.lineTo(w / 2, BH + TAIL * 0.1);
  g.lineTo(w, BH + TAIL);
  g.lineTo(w, h);
  g.lineTo(0, h);
  g.closePath();
  g.fill();
  bannerFlat = { data: g.getImageData(0, 0, w, h).data, w, h };
  void c;
  return bannerFlat;
}

/**
 * The banner cloth at phase ph, warped by its folds into a canvas: the cloth gathered into soft pleats on the bar,
 * a draught's ripple running down it (stronger towards the tails), each pixel sampled from the flat art displaced by
 * the folds and lit by their slope (folds turned to the light lit, the rest in shade).
 */
function clothCanvas(ph: number): HTMLCanvasElement {
  const f = flatBanner();
  const m = 14;
  const ow = f.w + m * 2;
  const oh = f.h + 4;
  const [c, g] = makeCanvas(ow, oh);
  const out = g.createImageData(ow, oh);
  const d = out.data;
  const src = f.data;
  const p = ph * P2;
  // fold depth and slope at (u across 0…1, v down 0…1)
  const fold = (u: number, v: number): [number, number] => {
    const pleat = Math.sin(u * P2 * 4.5) * (0.6 - v * 0.45);
    const rip = Math.sin(u * P2 * 1.6 - p + v * 4.2) * (0.25 + v * 1.1) + Math.sin(u * P2 * 2.7 + p * 2 - v * 3) * v * 0.35;
    const dz = pleat + rip;
    const sl = Math.cos(u * P2 * 4.5) * (0.6 - v * 0.45) * 4.5 + Math.cos(u * P2 * 1.6 - p + v * 4.2) * (0.25 + v * 1.1) * 1.6 + Math.cos(u * P2 * 2.7 + p * 2 - v * 3) * v * 0.35 * 2.7;
    return [dz, sl];
  };
  for (let y = 0; y < oh; y++) {
    const v = Math.min(1, y / BH);
    // the whole cloth drifts a little with the draught, more towards the tails
    const sway = Math.sin(p - v * 2.2) * v * v * 7;
    for (let x = 0; x < ow; x++) {
      const X = x - m - sway;
      const u0 = X / f.w;
      const [dz, sl] = fold(Math.min(1, Math.max(0, u0)), v);
      // the folds pull the art sideways a little (foreshortened where they turn away)
      const sx = X + sl * 1.6 * (0.4 + v);
      const sy = y - Math.abs(dz) * 1.2 * v;
      if (sx < 0 || sx > f.w - 1 || sy < 0 || sy > f.h - 1) continue;
      const x0 = sx | 0;
      const y0 = sy | 0;
      const fx = sx - x0;
      const fy = sy - y0;
      const i00 = (y0 * f.w + x0) * 4;
      const i10 = i00 + 4;
      const i01 = i00 + f.w * 4;
      const i11 = i01 + 4;
      const a = (src[i00 + 3] * (1 - fx) + src[i10 + 3] * fx) * (1 - fy) + (src[i01 + 3] * (1 - fx) + src[i11 + 3] * fx) * fy;
      if (a < 2) continue;
      // light: a fold facing up-left (negative slope) catches it; ambient fades down the cloth
      const lit = (1 - sl * 0.085 + dz * 0.05) * (0.7 + v * 0.12);
      const o = (y * ow + x) * 4;
      for (let k = 0; k < 3; k++) {
        const s = ((src[i00 + k] * src[i00 + 3] * (1 - fx) + src[i10 + k] * src[i10 + 3] * fx) * (1 - fy) + (src[i01 + k] * src[i01 + 3] * (1 - fx) + src[i11 + k] * src[i11 + 3] * fx) * fy) / Math.max(1, a);
        d[o + k] = s * lit;
      }
      d[o + 3] = a;
    }
  }
  g.putImageData(out, 0, 0);
  return c;
}

/**
 * The banner, its crossbar and the cord to the hook, at phase ph, painted with the hook at (hx, hy): the shadow on
 * the wall a hand's width behind, the cloth, the bar and its finials, the cord.
 */
function banner(ctx: Ctx, hx: number, hy: number, ph: number): void {
  const cloth = clothCanvas(ph);
  const bx = hx - cloth.width / 2;
  const by = hy + (HK.barY - HK.hookY) + 4;
  const half = BW / 2 + 22;
  const barY = hy + (HK.barY - HK.hookY);
  // the shadow: the cloth's own silhouette pushed down-right and softened (painted at a third and drawn up)
  const k = 0.33;
  const [sc, sg] = makeCanvas(Math.ceil(cloth.width * k) + 12, Math.ceil(cloth.height * k) + 12);
  sg.filter = 'blur(2.6px)';
  sg.drawImage(cloth, 6, 6, cloth.width * k, cloth.height * k);
  sg.filter = 'none';
  sg.globalCompositeOperation = 'source-in';
  sg.fillStyle = '#0a0608';
  sg.fillRect(0, 0, sc.width, sc.height);
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.drawImage(sc, bx + 12 - 6 / k, by + 16 - 6 / k, sc.width / k, sc.height / k);
  ctx.restore();
  // the cord from the bar's ends to the hook
  ctx.strokeStyle = '#2a1a10';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(hx - half + 10, barY);
  ctx.lineTo(hx, hy + 4);
  ctx.lineTo(hx + half - 10, barY);
  ctx.stroke();
  ctx.strokeStyle = rgba('#c8a070', 0.55);
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.drawImage(cloth, bx, by);
  // the crossbar: turned oak through the sleeve, gilt finials at its ends
  const bar = rrPath(hx - half, barY - 5, half * 2, 10, 5);
  castShadow(ctx, bar, 8, 8, 0.45);
  solid(ctx, bar, { x: hx - half, y: barY - 5, w: half * 2, h: 10 }, 'wood', '#5a3a22', { depth: 0.12, line: 1.4, formSize: 3 });
  for (const s of [-1, 1]) {
    const fx = hx + s * (half + 6);
    const fin = (c: Ctx) => {
      c.beginPath();
      c.ellipse(fx, barY, 8, 9, 0, 0, P2);
    };
    solid(ctx, fin, { x: fx - 8, y: barY - 9, w: 16, h: 18 }, 'chrome', '#c09a48', { depth: 0.12, line: 1.2, formSize: 3 });
    ctx.fillStyle = '#c09a48';
    ctx.beginPath();
    ctx.moveTo(fx + s * 6, barY - 3);
    ctx.lineTo(fx + s * 16, barY);
    ctx.lineTo(fx + s * 6, barY + 3);
    ctx.closePath();
    ctx.fill();
  }
  // the cord's loop over the hook
  ctx.strokeStyle = '#2a1a10';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(hx, hy + 2, 4, Math.PI * 1.1, Math.PI * 1.9 + 0.6);
  ctx.stroke();
}

/** The iron hooks in the wall the banners hang from (still: they don't swing). */
function hooks(ctx: Ctx): void {
  for (const x of HK.banners) {
    const y = HK.hookY;
    const plate = rrPath(x - 9, y - 22, 18, 26, 3);
    castShadow(ctx, plate, 5, 6, 0.5);
    solid(ctx, plate, { x: x - 9, y: y - 22, w: 18, h: 26 }, 'iron', IRON, { depth: 0.12, line: 1.2, formSize: 3 });
    ctx.strokeStyle = '#121012';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x, y - 8);
    ctx.quadraticCurveTo(x + 10, y + 4, x, y + 6);
    ctx.stroke();
    ctx.strokeStyle = shade(IRON, 0.35);
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
}

function bannersStill(ctx: Ctx): void {
  HK.banners.forEach((x, i) => banner(ctx, x, HK.hookY, i * 0.45));
}

/** The braziers' warmth on the banners' near edges (in the still; the live layer lights them with glows). */
function bannerLight(ctx: Ctx): void {
  HK.banners.forEach((x) => {
    const s = x < 960 ? -1 : 1;
    lightPool(ctx, x + s * 70, 470, 110, 200, FIRE_C, 0.1);
  });
}

// ——— the throne under its cloth of estate ———

function dossal(ctx: Ctx, r: R): void {
  const { x0, x1, top } = HK.dossal;
  const bot = HK.dais.y - TREAD;
  const cloth = rectPath(x0, top, x1 - x0, bot - top);
  aoHalo(ctx, cloth, 30, 0.45, '#08060a', 6);
  castShadow(ctx, cloth, 10, 16, 0.5);
  ctx.save();
  cloth(ctx);
  ctx.clip();
  surface(ctx, r, { x: x0, y: top, w: x1 - x0, h: bot - top }, '#1e2846', { vary: 0.3, cells: 3, mottle: 0.3, strokes: 0.3, strokeAng: Math.PI / 2, strokeLen: 80, grain: 0.25, grainKind: 'canvas', seed: 81 });
  // the diaper: small gold crowns in a lattice, worn and dim
  for (let y = top + 30, row = 0; y < bot; y += 46, row++)
    for (let x = x0 + 22 + (row % 2) * 30; x < x1; x += 60) {
      ctx.fillStyle = rgba('#b08a3a', 0.14);
      ctx.beginPath();
      ctx.moveTo(x - 7, y + 5);
      ctx.lineTo(x - 7, y - 3);
      ctx.lineTo(x - 3, y + 1);
      ctx.lineTo(x, y - 6);
      ctx.lineTo(x + 3, y + 1);
      ctx.lineTo(x + 7, y - 3);
      ctx.lineTo(x + 7, y + 5);
      ctx.closePath();
      ctx.fill();
    }
  // the pleats it hangs in: soft vertical folds lit on their left
  for (let x = x0; x < x1; x += 28) {
    const g = ctx.createLinearGradient(x, 0, x + 28, 0);
    g.addColorStop(0, rgba('#aab4e0', 0.07));
    g.addColorStop(0.45, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(4,4,10,0.32)');
    ctx.fillStyle = g;
    ctx.fillRect(x, top, 28, bot - top);
  }
  vfill(ctx, x0, top, x1 - x0, bot - top, [[0, 'rgba(4,4,10,0.65)'], [0.4, 'rgba(4,4,10,0.35)'], [1, 'rgba(4,4,10,0.5)']]);
  // a gold border down each side
  for (const x of [x0 + 4, x1 - 14]) {
    ctx.fillStyle = rgba('#a07a30', 0.6);
    ctx.fillRect(x, top, 10, bot - top);
    ctx.fillStyle = rgba('#ffe0a0', 0.15);
    ctx.fillRect(x, top, 2, bot - top);
  }
  ctx.restore();
  // the tester over it: a shallow carved box, its valance scalloped and fringed, hung on chains from the plate
  const tx0 = x0 - 26;
  const tx1 = x1 + 26;
  const ty = top - 34;
  for (const x of [tx0 + 16, tx1 - 16]) hang(ctx, x, HK.plate.y1, x, ty + 4, 0, '#5a524c', 3.2, true);
  const box = rectPath(tx0, ty, tx1 - tx0, 26);
  castShadow(ctx, box, 12, 16, 0.55);
  solid(ctx, box, { x: tx0, y: ty, w: tx1 - tx0, h: 26 }, 'wood', OAK, { depth: 0.12, line: 1.6, formSize: 6 });
  within(ctx, box, () => {
    woodGrain(ctx, r, { x: tx0, y: ty, w: tx1 - tx0, h: 26 }, OAK, false, 0.5);
    // a carved run of quatrefoils, gilt worn to the wood
    for (let x = tx0 + 18; x < tx1 - 8; x += 26) {
      ctx.strokeStyle = rgba('#b08a40', 0.5);
      ctx.lineWidth = 1.4;
      for (const [dx, dy] of [[-3.5, 0], [3.5, 0], [0, -3.5], [0, 3.5]] as const) {
        ctx.beginPath();
        ctx.arc(x + dx, ty + 13 + dy, 3.5, 0, P2);
        ctx.stroke();
      }
    }
    vfill(ctx, tx0, ty, tx1 - tx0, 26, [[0, rgba('#ffd0a0', 0.12)], [0.4, 'rgba(0,0,0,0)'], [1, 'rgba(8,4,2,0.5)']]);
  });
  const val = (c: Ctx) => {
    c.beginPath();
    c.moveTo(tx0 + 2, ty + 26);
    c.lineTo(tx1 - 2, ty + 26);
    c.lineTo(tx1 - 2, ty + 44);
    for (let x = tx1 - 2; x > tx0 + 2; x -= 24) c.quadraticCurveTo(x - 12, ty + 62, x - 24, ty + 44);
    c.closePath();
  };
  castShadow(ctx, val, 8, 12, 0.5);
  solid(ctx, val, { x: tx0, y: ty + 26, w: tx1 - tx0, h: 34 }, 'canvas', '#4a1018', { depth: 0.12, line: 1.4, formSize: 6, spec: false });
  within(ctx, val, () => {
    vfill(ctx, tx0, ty + 26, tx1 - tx0, 34, [[0, 'rgba(8,2,4,0.55)'], [1, 'rgba(8,2,4,0.15)']]);
    ctx.fillStyle = rgba('#c89a3a', 0.55);
    ctx.fillRect(tx0, ty + 28, tx1 - tx0, 3);
  });
  // gold fringe under the scallops
  ctx.strokeStyle = rgba('#8a6a30', 0.55);
  ctx.lineWidth = 1.2;
  for (let x = tx0 + 4; x < tx1 - 4; x += 3) {
    const u = ((x - tx0 - 2) % 24) / 24;
    const y = ty + 44 + Math.sin(u * Math.PI) * 17;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + 6);
    ctx.stroke();
  }
}

function throne(ctx: Ctx, r: R): void {
  const { x, top, seat, hw } = HK.throne;
  const d = HK.dais;
  /** It stands part-way back on the top tread. */
  const fl = d.y - TREAD * 0.4;
  // the dais: two broad steps of the same stone, the top one worn hollow in the middle
  for (const [y, h, w] of [[d.y + 26, TY - d.y - 26 + 2, d.hw + 40], [d.y, 26, d.hw]] as const) {
    // the tread: the step's top, seen from just above, running back to the wall
    const tread: PathFn = (c) => {
      c.beginPath();
      c.moveTo(x - w, y);
      c.lineTo(x + w, y);
      c.lineTo(x + w - TREAD, y - TREAD);
      c.lineTo(x - w + TREAD, y - TREAD);
      c.closePath();
    };
    dressed(ctx, r, tread, { x: x - w, y: y - TREAD, w: w * 2, h: TREAD });
    within(ctx, tread, () => {
      nightLight(ctx, { x: x - w, y: y - TREAD, w: w * 2, h: TREAD });
      vfill(ctx, x - w, y - TREAD, w * 2, TREAD, [[0, 'rgba(8,6,10,0.5)'], [0.5, rgba('#ffd8b0', 0.06)], [1, rgba('#ffe0c0', 0.16)]]);
    });
    // its worn front edge catches the light
    ctx.fillStyle = rgba('#e8d8c0', 0.22);
    ctx.fillRect(x - w + 2, y - 1, w * 2 - 4, 2);
    const st = rectPath(x - w, y, w * 2, h);
    castShadow(ctx, st, 6, 10, 0.5);
    dressed(ctx, r, st, { x: x - w, y, w: w * 2, h });
    within(ctx, st, () => {
      nightLight(ctx, { x: x - w, y, w: w * 2, h });
      // worn: the treads dished and polished where feet go
      lightPool(ctx, x, y + 3, w * 0.5, 4, '#d8c8b0', 0.1);
      vfill(ctx, x - w, y, w * 2, h, [[0, rgba('#ffd8b0', 0.1)], [0.2, 'rgba(0,0,0,0)'], [1, 'rgba(8,6,10,0.45)']]);
    });
    for (let jx = x - w + 90 + r() * 40; jx < x + w - 40; jx += 110 + r() * 60) {
      ctx.strokeStyle = 'rgba(20,16,18,0.7)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(jx, y + 2);
      ctx.lineTo(jx, y + h - 2);
      ctx.stroke();
    }
  }
  crevice(ctx, x - d.hw + TREAD, x + d.hw - TREAD, d.y - TREAD, 8, 0.5);
  groundShadow(ctx, x + 6, fl + 1, hw + 40, 7, 0.7);
  // the back: a tall panel with a gable and pinnacled posts, the crimson cloth of its seat-back inside a carved frame
  const back = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x - hw + 18, seat);
    c.lineTo(x - hw + 18, top + 60);
    c.lineTo(x, top);
    c.lineTo(x + hw - 18, top + 60);
    c.lineTo(x + hw - 18, seat);
    c.closePath();
  };
  castShadow(ctx, back, 16, 20, 0.6);
  solid(ctx, back, { x: x - hw, y: top, w: hw * 2, h: seat - top }, 'wood', OAK, { depth: 0.14, line: 1.8, formSize: 12 });
  within(ctx, back, () => {
    woodGrain(ctx, r, { x: x - hw, y: top, w: hw * 2, h: seat - top }, OAK, true, 0.5);
    const pan = (c: Ctx) => {
      c.beginPath();
      c.moveTo(x - hw + 40, seat - 10);
      c.lineTo(x - hw + 40, top + 82);
      c.quadraticCurveTo(x - hw + 40, top + 44, x, top + 36);
      c.quadraticCurveTo(x + hw - 40, top + 44, x + hw - 40, top + 82);
      c.lineTo(x + hw - 40, seat - 10);
      c.closePath();
    };
    ctx.save();
    pan(ctx);
    ctx.fillStyle = '#421016';
    ctx.fill();
    ctx.clip();
    surface(ctx, r, { x: x - hw, y: top, w: hw * 2, h: seat - top }, '#421016', { over: true, vary: 0.4, cells: 2, mottle: 0.4, strokes: 0, grain: 0.3, grainKind: 'fleece', seed: 83 });
    // velvet: the nap lighter where it bellies out, gold studs in a diamond
    const g = ctx.createRadialGradient(x - 14, top + 120, 10, x, top + 130, 120);
    g.addColorStop(0, rgba('#a03040', 0.16));
    g.addColorStop(1, 'rgba(10,2,4,0.35)');
    ctx.fillStyle = g;
    ctx.fillRect(x - hw, top, hw * 2, seat - top);
    for (let i = 0; i < 5; i++)
      for (let j = 0; j < 4; j++) {
        const px = x - 48 + j * 32 + (i % 2) * 16;
        const py = top + 80 + i * 22;
        if (Math.abs(px - x) > 56) continue;
        ctx.fillStyle = '#8a6a28';
        ctx.beginPath();
        ctx.arc(px, py, 2.4, 0, P2);
        ctx.fill();
        ctx.fillStyle = rgba('#ffe0a0', 0.6);
        ctx.fillRect(px - 1, py - 1.6, 1.2, 1);
      }
    ctx.restore();
    ctx.strokeStyle = '#140a06';
    ctx.lineWidth = 2;
    pan(ctx);
    ctx.stroke();
    ctx.strokeStyle = rgba('#c09040', 0.35);
    ctx.lineWidth = 1.2;
    ctx.save();
    ctx.translate(-1.5, -1.5);
    pan(ctx);
    ctx.stroke();
    ctx.restore();
    vfill(ctx, x - hw, top, hw * 2, seat - top, [[0, 'rgba(6,3,2,0.5)'], [1, 'rgba(6,3,2,0.15)']]);
  });
  // the crown carved at the gable's peak, gilt
  const cy = top - 6;
  const crownP = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x - 22, cy + 12);
    c.lineTo(x - 25, cy - 12);
    c.lineTo(x - 12, cy - 1);
    c.lineTo(x, cy - 20);
    c.lineTo(x + 12, cy - 1);
    c.lineTo(x + 25, cy - 12);
    c.lineTo(x + 22, cy + 12);
    c.closePath();
  };
  castShadow(ctx, crownP, 8, 10, 0.5);
  solid(ctx, crownP, { x: x - 25, y: cy - 20, w: 50, h: 32 }, 'chrome', '#7a6234', { depth: 0.14, line: 1.4, formSize: 4 });
  // the posts: square oak, pinnacles, the arms running forward
  for (const s of [-1, 1]) {
    const px = x + s * (hw - 10);
    const pp = rectPath(px - 12, top + 70, 24, fl - top - 70);
    castShadow(ctx, pp, 12, 14, 0.55);
    solid(ctx, pp, { x: px - 12, y: top + 70, w: 24, h: fl - top - 70 }, 'wood', shade(OAK, 0.05), { depth: 0.14, line: 1.6, formSize: 5 });
    within(ctx, pp, () => woodGrain(ctx, r, { x: px - 12, y: top + 70, w: 24, h: fl - top - 70 }, OAK, true, 0.5));
    const pin = (c: Ctx) => {
      c.beginPath();
      c.moveTo(px - 13, top + 72);
      c.lineTo(px, top + 30);
      c.lineTo(px + 13, top + 72);
      c.closePath();
    };
    solid(ctx, pin, { x: px - 13, y: top + 30, w: 26, h: 42 }, 'wood', shade(OAK, 0.05), { depth: 0.14, line: 1.4, formSize: 4 });
    ctx.fillStyle = '#a8843a';
    ctx.beginPath();
    ctx.arc(px, top + 28, 4.5, 0, P2);
    ctx.fill();
  }
  // the seat and its front: a box carved with blind arcading, a crimson cushion
  const front = rectPath(x - hw + 2, seat, hw * 2 - 4, fl - seat);
  castShadow(ctx, front, 10, 14, 0.55);
  solid(ctx, front, { x: x - hw, y: seat, w: hw * 2, h: fl - seat }, 'wood', OAK, { depth: 0.14, line: 1.6, formSize: 8 });
  within(ctx, front, () => {
    woodGrain(ctx, r, { x: x - hw, y: seat, w: hw * 2, h: fl - seat }, OAK, false, 0.5);
    for (let i = 0; i < 5; i++) {
      const ax = x - hw + 22 + i * ((hw * 2 - 44) / 4);
      ctx.fillStyle = 'rgba(8,4,2,0.45)';
      ctx.beginPath();
      ctx.moveTo(ax - 13, fl - 12);
      ctx.lineTo(ax - 13, seat + 38);
      ctx.quadraticCurveTo(ax - 13, seat + 20, ax, seat + 18);
      ctx.quadraticCurveTo(ax + 13, seat + 20, ax + 13, seat + 38);
      ctx.lineTo(ax + 13, fl - 12);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = rgba('#d0a870', 0.18);
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    vfill(ctx, x - hw, seat, hw * 2, fl - seat, [[0, rgba('#ffd0a0', 0.12)], [0.15, 'rgba(0,0,0,0)'], [1, 'rgba(6,3,2,0.4)']]);
  });
  const cush = rrPath(x - hw + 14, seat - 14, hw * 2 - 28, 18, 8);
  solid(ctx, cush, { x: x - hw + 14, y: seat - 14, w: hw * 2 - 28, h: 18 }, 'canvas', '#7a1622', { depth: 0.14, line: 1.4, formSize: 6, spec: false });
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#b08a3a';
    ctx.beginPath();
    ctx.arc(x + s * (hw - 16), seat - 2, 4, 0, P2);
    ctx.fill();
  }
  // the arms, seen end on: front posts from the dais up past the seat, capped with a gilt knob
  for (const s of [-1, 1]) {
    const ax = x + s * (hw + 4);
    const ap = rrPath(ax - 13, seat - 58, 26, fl - seat + 58, 5);
    castShadow(ctx, ap, 10, 12, 0.55);
    solid(ctx, ap, { x: ax - 13, y: seat - 58, w: 26, h: fl - seat + 58 }, 'wood', shade(OAK, 0.08), { depth: 0.13, line: 1.6, formSize: 5 });
    within(ctx, ap, () => {
      woodGrain(ctx, r, { x: ax - 13, y: seat - 58, w: 26, h: fl - seat + 58 }, OAK, true, 0.5);
      vfill(ctx, ax - 13, seat - 58, 26, fl - seat + 58, [[0, rgba('#ffd0a0', 0.1)], [0.3, 'rgba(0,0,0,0)'], [1, 'rgba(6,3,2,0.45)']]);
    });
    const knob = (c: Ctx) => {
      c.beginPath();
      c.ellipse(ax, seat - 62, 12, 9, 0, 0, P2);
    };
    solid(ctx, knob, { x: ax - 12, y: seat - 71, w: 24, h: 18 }, 'chrome', '#a8843a', { depth: 0.13, line: 1.3, formSize: 3 });
  }
  // where it stands: a heavy oak plinth on the tread, its shadow pooled round it
  const plinth = rrPath(x - hw - 22, fl - 12, (hw + 22) * 2, 14, 3);
  solid(ctx, plinth, { x: x - hw - 22, y: fl - 12, w: (hw + 22) * 2, h: 14 }, 'wood', shade(OAK, -0.1), { depth: 0.12, line: 1.6, formSize: 5 });
  ctx.fillStyle = rgba('#ffd0a0', 0.18);
  ctx.fillRect(x - hw - 20, fl - 12, (hw + 20) * 2, 2);
  crevice(ctx, x - hw - 24, x + hw + 24, fl + 2, -16, 0.55);
  // the hall's light barely reaches it: the far braziers warm its outer edges only
  rim(ctx, back, 0.18, 3, '#ffb070');
}

// ——— the table ———

function table(ctx: Ctx, r: R): void {
  planksPlane(ctx, r, HK.front, '#5a3a22', 0.3, 0.008);
  const box = { x: 0, y: TY, w: W, h: HK.front - TY };
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, HK.front - TY + 4);
  ctx.clip();
  lay(ctx, drift('#8a5a34', '#1a0c06', 5, 91, 256, 48), box, 0.2);
  // the dark of the hall over the boards, the braziers' ends lit
  ctx.fillStyle = 'rgba(10,6,8,0.32)';
  ctx.fillRect(0, TY, W, HK.front - TY);
  varnish(ctx, box, [...HK.wins.map((x) => ({ x, a: 0.32, w: 130, col: '#ffa860' })), { x: 960, a: 0.05, w: 200, col: '#a8b8e8' }], { sheen: 0.04, seed: 93 });
  for (const x of HK.wins) {
    lightPool(ctx, x + (x < 960 ? 60 : -60), 840, 520, 140, '#ff9a4a', 0.22, 'screen');
    lightPool(ctx, x, TY + 20, 300, 44, '#ffb070', 0.3);
  }
  // calm under the pizzas: the middle eased down
  const g = ctx.createRadialGradient(W / 2, 900, 100, W / 2, 900, 820);
  g.addColorStop(0, 'rgba(14,8,8,0.22)');
  g.addColorStop(1, 'rgba(14,8,8,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, TY, W, HK.front - TY);
  // the back edge falls into the wall's shade
  vfill(ctx, 0, TY, W, 90, [[0, 'rgba(8,4,4,0.6)'], [0.3, 'rgba(8,4,4,0.2)'], [1, 'rgba(8,4,4,0)']]);
  // old wear: a pale track where plates and elbows go, rings left by cups
  for (let i = 0; i < 6; i++) {
    const x = 120 + r() * (W - 240);
    if (Math.abs(x - 960) < 600 && Math.abs(x - 960) > 120) continue;
    const y = TY + 40 + r() * 180;
    ctx.strokeStyle = rgba('#1a0c06', 0.18);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, 18 + r() * 6, 6 + r() * 2, 0, 0, P2);
    ctx.stroke();
  }
  ctx.restore();
  tableFalloff(ctx, HK.front, 0.42, '#0a0604');
  tableSeam(ctx, 0.6, '#140a04', false);
  // the front: a thick moulded oak edge, its lip lit, then down into shade
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, HK.front, W, 1080 - HK.front);
  ctx.clip();
  vfill(ctx, 0, HK.front, W, 1080 - HK.front, [[0, '#6a4428'], [0.1, '#4a2e1a'], [0.4, '#2a180c'], [1, '#140a04']]);
  grain(ctx, { x: 0, y: HK.front, w: W, h: 1080 - HK.front }, 'wood', 0.45, 1);
  for (const x of HK.wins) lightPool(ctx, x, HK.front + 10, 340, 30, '#ff9a4a', 0.18);
  ctx.fillStyle = 'rgba(8,4,2,0.5)';
  ctx.fillRect(0, HK.front + 12, W, 3);
  ctx.restore();
  ctx.fillStyle = rgba('#ffd8a8', 0.3);
  ctx.fillRect(0, HK.front - 2, W, 2);
}

// ——— grade and shade ———

function grade(ctx: Ctx): void {
  gradeAll(ctx, 0.05, '#ffb880', 0.05, { warm: '#ffbe72', cool: '#5a70c8', a: 0.22 });
}

function shadeOver(ctx: Ctx): void {
  // calm under the HUD and the boss bar: the roof's band and the top of the wall into the dark
  vfill(ctx, 0, 0, W, 230, [[0, 'rgba(4,3,8,0.5)'], [1, 'rgba(4,3,8,0)']]);
  calmLanes(ctx, 0.16, '#0c0a12', 80, 650);
  vignetteAll(ctx, 0.62, '#06040a');
}

// ——— the stack ———

const BANNER_STILL = { x: HK.banners[0] - BF.hx - 4, y: HK.hookY - 14, w: HK.banners[1] - HK.banners[0] + BF.w + 8, h: BF.h + 10 };
const BRZ_BOX = (x: number): Box => ({ x: x - 150, y: HK.brz.rimY - 30, w: 300, h: TY - HK.brz.rimY + 32 });

export const HALL: SceneSpec = {
  id: 'colossus',
  info: {
    name: 'Hall of Kings',
    subtitle: 'Boss: THE COLOSSUS',
    ambient: [],
    glows: HK.wins.map((x) => ({ x, y: HK.brz.coalY - 60, r: 260, color: '#ff8a30', flicker: 0.7 })),
    light: '#ffc890',
    tableTint: '#fff0dc',
  },
  layers: [
    { id: 'wall', box: { x: 0, y: 0, w: W, h: TY + 2 }, draw: wall },
    { id: 'roof', box: { x: 0, y: 0, w: W, h: HK.corbelY + 90 }, draw: roof },
    { id: 'hooks', box: { x: HK.banners[0] - 30, y: HK.hookY - 40, w: HK.banners[1] - HK.banners[0] + 60, h: 60 }, draw: (c) => hooks(c) },
    { id: 'viewL', box: GLASS_BOX(HK.wins[0]), draw: (c, r) => view(c, r, HK.wins[0]) },
    { id: 'viewR', box: GLASS_BOX(HK.wins[1]), draw: (c, r) => view(c, r, HK.wins[1]) },
    { id: 'snowStill', box: { x: 0, y: W2.top, w: W, h: W2.sill - W2.top }, stillOnly: true, draw: snowStill },
    // the blizzard beyond the glass (the slots sit between the view and the glazing)
    { id: 'snowL', box: GLASS_BOX(HK.wins[0]), motion: 'slot', draw: () => {} },
    { id: 'snowR', box: GLASS_BOX(HK.wins[1]), motion: 'slot', draw: () => {} },
    { id: 'glazeL', box: GLASS_BOX(HK.wins[0]), draw: (c, r) => glazing(c, r, HK.wins[0]) },
    { id: 'frameL', box: FRAME_BOX(HK.wins[0]), draw: (c, r) => frame(c, r, HK.wins[0]) },
    { id: 'glazeR', box: GLASS_BOX(HK.wins[1]), draw: (c, r) => glazing(c, r, HK.wins[1]) },
    { id: 'frameR', box: FRAME_BOX(HK.wins[1]), draw: (c, r) => frame(c, r, HK.wins[1]) },
    { id: 'dossal', box: { x: HK.dossal.x0 - 60, y: HK.plate.y1 - 10, w: HK.dossal.x1 - HK.dossal.x0 + 120, h: HK.dais.y - HK.plate.y1 + 40 }, draw: dossal },
    { id: 'throne', box: { x: HK.throne.x - HK.dais.hw - 60, y: HK.throne.top - 40, w: (HK.dais.hw + 60) * 2, h: TY - HK.throne.top + 42 }, draw: throne },
    { id: 'brazierL', box: BRZ_BOX(HK.wins[0]), draw: (c, r) => brazier(c, r, HK.wins[0]) },
    { id: 'brazierR', box: BRZ_BOX(HK.wins[1]), draw: (c, r) => brazier(c, r, HK.wins[1]) },
    { id: 'table', box: { x: 0, y: TY, w: W, h: 1080 - TY }, draw: table },
    { id: 'banners', box: BANNER_STILL, stillOnly: true, draw: (c) => bannersStill(c) },
    { id: 'bannerLight', box: { x: 0, y: 200, w: W, h: 500 }, stillOnly: true, draw: (c) => bannerLight(c) },
    { id: 'fire', box: { x: 0, y: HK.brz.coalY - FIRE_H - 40, w: W, h: FIRE_H + 80 }, stillOnly: true, draw: (c) => fireStill(c) },
    // the banners, the fires, their smoke and sparks: last in the stack (nothing after them), under the shade
    { id: 'hall', box: { x: 0, y: 0, w: W, h: TY }, motion: 'slot', draw: () => {} },
    { id: 'top', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

// ——— snow (painted: the still's flakes; the live layer moves its own) ———

/** A flake lit on its top left, soft. */
function flake(c: Ctx, x: number, y: number, s: number, a: number): void {
  const g = c.createRadialGradient(x - s * 0.3, y - s * 0.35, 0, x, y, s);
  g.addColorStop(0, `rgba(255,255,255,${a.toFixed(3)})`);
  g.addColorStop(0.55, `rgba(222,232,252,${(a * 0.7).toFixed(3)})`);
  g.addColorStop(1, 'rgba(190,204,236,0)');
  c.fillStyle = g;
  c.fillRect(x - s, y - s, s * 2, s * 2);
}

function snowStill(ctx: Ctx, r: R): void {
  for (const cx of HK.wins) {
    ctx.save();
    path(lancet(cx, 2))(ctx);
    ctx.clip();
    for (let i = 0; i < 70; i++) {
      const z = r();
      const x = cx - W2.hw + r() * W2.hw * 2;
      const y = W2.top + r() * (W2.sill - W2.top);
      if (z > 0.75) {
        // the near ones streaked by the wind
        ctx.strokeStyle = rgba('#eef2ff', 0.45);
        ctx.lineWidth = 2 + z * 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 9, y - 6);
        ctx.stroke();
      } else flake(ctx, x, y, 1.4 + z * 2.6, 0.5 + z * 0.4);
    }
    ctx.restore();
  }
}

/** One frame of blown snow (phase 0…1 loops), w×h: veils of fine snow raking down to the left with the wind,
 * undulating as they go, each sheet crossing the frame a whole number of times per cycle (seamless). */
function veilFrame(c: Ctx, w: number, h: number, ph: number): void {
  let s = 37;
  const rr = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 16; i++) {
    const y0 = rr() * h * 1.3 - h * 0.2;
    const amp = 2 + rr() * 5;
    const k = 1 + Math.floor(rr() * 2);
    const width = 2 + rr() * 6;
    const a = 0.14 + rr() * 0.22;
    const x0 = ((rr() + 1 - ((ph * k) % 1)) % 1) * w * 2 - w * 0.5;
    const len = w * (0.5 + rr() * 0.6);
    for (const off of [0, -w * 2]) {
      const xa = x0 + off;
      const g = c.createLinearGradient(xa, 0, xa + len, 0);
      g.addColorStop(0, 'rgba(236,242,255,0)');
      g.addColorStop(0.45, `rgba(236,242,255,${a.toFixed(3)})`);
      g.addColorStop(1, 'rgba(236,242,255,0)');
      c.strokeStyle = g;
      c.lineWidth = width;
      c.beginPath();
      for (let u = 0; u <= 1.001; u += 0.1) {
        const x = xa + u * len;
        const y = y0 + Math.sin(u * 4 + ph * P2 * k + i) * amp + (1 - u) * len * 0.5;
        if (u === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();
    }
  }
}

// ——— live ———

registerKitScene(HALL, (k: KitLive) => {
  const clamp = Phaser.Math.Clamp;
  const hall = k.slot('hall');
  const top = k.slot('top');
  const snowSlots = [k.slot('snowL'), k.slot('snowR')];
  const { rimY, coalY, rimHW } = HK.brz;

  // ——— hero: the banners (painted folds, graded like the still), swinging from their hooks ———
  const BN = 8;
  const gx = HK.banners[0] - BF.hx;
  const gy = HK.hookY - BF.hy;
  const bKey = sheet(k, 'hk_banner', BF.w, BF.h, BN, (c, ph) => {
    // painted on its own canvas at its place on the screen so the grade matches the still, then dropped in
    const [fc, fg] = makeCanvas(BF.w, BF.h);
    fg.translate(-gx, -gy);
    banner(fg, HK.banners[0], HK.hookY, ph);
    grade(fg);
    c.drawImage(fc, 0, 0);
  });
  const banners = HK.banners.map((x, i) => {
    const loop = new Loop(k, bKey, BN, x, HK.hookY, { into: hall, fps: 5, phase: i * 3.5, origin: [BF.hx / BF.w, BF.hy / BF.h] });
    // (the second banner's sheet is the first's: its hook sits at the same place in the frame)
    return { x, loop, s: new Spring(0, 9, 0.9), warm: k.glow(x + (x < 960 ? -70 : 70), 470, 130, 0xff8a40, 0.08, { into: top, sy: 1.8 }) };
  });

  // ——— hero: the braziers ———
  const FN = 8;
  const fireKey = sheet(k, 'hk_fire', FIRE_W, FIRE_H, FN, (c, ph) => brazierFrame(c, FIRE_W, FIRE_H, ph, 1));
  const SW = 100;
  const SH = 280;
  const smokeKey = sheet(k, 'hk_smoke', SW, SH, 6, (c, ph) => {
    smokeFrame(c, SW, SH, ph, { lit: '#e09a68', body: '#6a5a58', shade: '#1a1216', wind: 0.1, lobes: 8, a: 0.85, toLight: [0, 1], seed: 5 });
    // (it thins out as it climbs into the roof)
    c.globalCompositeOperation = 'destination-in';
    const g = c.createLinearGradient(0, 0, 0, SH);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.4, 'rgba(0,0,0,0.9)');
    g.addColorStop(1, 'rgba(0,0,0,0.7)');
    c.fillStyle = g;
    c.fillRect(0, 0, SW, SH);
  });
  // the coal bed's seams glowing and breathing over the painted coals
  const coalKey = k.tex('hk_coals', rimHW * 2, 34, (c) => {
    let s = 9;
    const rr = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 40; i++) {
      const x = 8 + rr() * (rimHW * 2 - 16);
      const y = 8 + rr() * 22;
      const hot = y / 34;
      c.strokeStyle = rgba(hot > 0.5 ? '#ffc060' : '#ff6a20', 0.35 + hot * 0.55);
      c.lineWidth = 1 + hot * 1.6;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + 4 + rr() * 6, y + (rr() - 0.5) * 6);
      c.lineTo(x + 8 + rr() * 9, y + (rr() - 0.5) * 7);
      c.stroke();
    }
  });
  // coals knocked out of the bowl: a lump of black crust with glowing seams (4 painted variants)
  const lumpKey = sheet(k, 'hk_lump', 20, 20, 4, (c, _ph, i) => {
    let s = 11 + i * 7;
    const rr = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    c.beginPath();
    for (let j = 0; j < 7; j++) {
      const a = (j / 7) * P2;
      const rad = 5 + rr() * 3.5;
      c.lineTo(10 + Math.cos(a) * rad, 10 + Math.sin(a) * rad);
    }
    c.closePath();
    const lg = c.createRadialGradient(8, 8, 0, 10, 10, 9);
    lg.addColorStop(0, '#ffd080');
    lg.addColorStop(0.45, '#e8601c');
    lg.addColorStop(1, '#3a140a');
    c.fillStyle = lg;
    c.fill();
    c.fillStyle = 'rgba(30,12,8,0.55)';
    c.beginPath();
    c.ellipse(12, 12, 4, 3, 0.5, 0, P2);
    c.fill();
  });
  const fires = HK.wins.map((x, i) => {
    const smoke = new Loop(k, smokeKey, 6, x + 4, coalY - 110, { into: hall, origin: [0.5, 1], fps: 5, phase: i * 3 });
    const fire = new Loop(k, fireKey, FN, x, coalY + 4, { into: hall, fps: 11, add: true, origin: [0.5, 1], phase: i * 4.3 });
    const coals = k.img(coalKey, x, rimY - 8, { into: hall, add: true, alpha: 0.6 });
    return {
      x,
      smoke,
      fire,
      coals,
      // the light it throws: a halo, the wall round it, the reveal and sill, the near end of the table
      halo: k.glow(x, coalY - 70, 150, 0xff9a3a, 0.3, { into: top }),
      wallPool: k.glow(x, coalY - 60, 480, 0xff7a2a, 0.07, { into: top, sy: 1.05 }),
      tablePool: k.glow(x, TY + 60, 380, 0xff8a3a, 0.1, { into: top, sy: 0.22 }),
      bed: k.glow(x, rimY - 6, 110, 0xff5a10, 0.4, { into: top, sy: 0.3 }),
      gut: 0,
      flare: 0,
      sq: new Spring(0, 30, 5),
      rate: new Rate(),
    };
  });
  const embers = new Parts(k, { frame: 'ember', add: true, into: hall, max: 110 });
  const lumps = new Parts(k, { frame: 'ember', sheet: { key: lumpKey, n: 4, half: 10 }, into: hall, max: 16 });
  const dust = new Parts(k, { frame: 'mote', into: hall, max: 80 });
  // the hall's light dipping when the fires are knocked down
  const dip = k.wash(0x5a4038, 0, Phaser.BlendModes.MULTIPLY, top);

  // ——— hero: the blizzard in the lancets ———
  const flakeKey = k.tex('hk_flake', 16, 16, (c) => flake(c, 8, 8, 7.5, 0.95));
  type Flake = { img: Phaser.GameObjects.Image; x: number; y: number; z: number; ph: number };
  const VW = Math.ceil((W2.hw * 2) / 3);
  const VH = Math.ceil((W2.sill - W2.top) / 3);
  const VN = 8;
  const veilKey = sheet(k, 'hk_veil', VW, VH, VN, (c, ph) => {
    veilFrame(c, VW, VH, ph);
    // kept to the glass: the lancet's shape, feathered
    c.globalCompositeOperation = 'destination-in';
    c.filter = 'blur(2px)';
    c.fillStyle = '#000';
    c.beginPath();
    c.scale(1 / 3, 1 / 3);
    c.translate(-(HK.wins[0] - W2.hw), -W2.top);
    lancet(HK.wins[0], -6)(c);
    c.fill();
  });
  const wins = HK.wins.map((cx, wi) => {
    const into = snowSlots[wi];
    const flakes: Flake[] = Array.from({ length: 80 }, () => {
      const z = crand();
      const img = k.img(flakeKey, 0, 0, { into, scale: 0.18 + z * 0.55 });
      return { img, x: cx - W2.hw + crand() * W2.hw * 2.4, y: W2.top + crand() * (W2.sill - W2.top), z, ph: crand() * 10 };
    });
    // nearer first on top
    flakes.sort((a, b) => a.z - b.z).forEach((f) => into.bringToTop(f.img));
    const veils = [0, 1].map((j) => new Loop(k, veilKey, VN, cx - W2.hw, W2.top, { into, origin: [0, 0], scale: 3, fps: 7 + j * 3, phase: j * 4 + wi * 2 }));
    return { cx, flakes, veils, seed: wi * 3.7 };
  });

  const t0 = crand() * 100;
  return {
    impact(x, _y, p) {
      for (const f of fires) {
        const near = 1 - Math.min(1, Math.abs(f.x - x) / 1400) * 0.5;
        const q = p * near;
        f.gut = Math.max(f.gut, 0.45 + q * 0.5);
        f.sq.v -= 7 * q;
        // sparks thrown up out of the bed, arcing over and falling to the floor behind the table
        for (let i = 0; i < 10 + q * 24; i++)
          embers.spawn({ x: f.x + (crand() - 0.5) * rimHW * 1.4, y: coalY - crand() * 10, vx: (crand() - 0.5) * 260, vy: -200 - crand() * 340 * q, life: 1.2 + crand() * 0.8, r0: 9 + crand() * 5, r1: 3, a: 1, tint: crand() < 0.4 ? 0xffe080 : 0xff8a30, grav: 520, drag: 0.5, floor: TY - 2, streak: 0.014, fade: 0.04 });
        // coals jumping out over the rim
        for (let i = 0; i < Math.round(1 + q * 3); i++) {
          const side = crand() < 0.5 ? -1 : 1;
          lumps.spawn({ x: f.x + side * rimHW * (0.3 + crand() * 0.5), y: coalY, vx: side * (60 + crand() * 140), vy: -180 - crand() * 220 * q, life: 2.2, r0: 4 + crand() * 2, a: 1, tint: 0xffffff, grav: 900, floor: TY - 3, spin: (crand() - 0.5) * 12, fade: 0.01,
            onFloor: (fx, fy) => {
              for (let j = 0; j < 5; j++) embers.spawn({ x: fx, y: fy, vx: (crand() - 0.5) * 160, vy: -60 - crand() * 120, life: 0.5 + crand() * 0.4, r0: 4, r1: 1, a: 1, tint: 0xffa040, grav: 500, streak: 0.01, fade: 0.02 });
            } });
        }
      }
      // the banners swing out from the stomp, the nearer one harder
      for (const b of banners) {
        const near = 1 - Math.min(1, Math.abs(b.x - x) / 1200) * 0.6;
        b.s.v += (x < b.x ? 1 : -1) * (0.16 + crand() * 0.05) * p * near * calm();
      }
      // dust and grit shaken off the plate and the corbels, lit where the fire reaches
      for (let i = 0; i < 8 + p * 26; i++) {
        const dx = crand() * W;
        dust.spawn({ x: dx, y: HK.plate.y1 + crand() * 6, vx: (crand() - 0.5) * 20, vy: 14 + crand() * 30, life: 2.4 + crand() * 1.6, r0: 2 + crand() * 2.4, a: 0.55, tint: 0xb8a890, grav: 40, drag: 1.2, fade: 0.05 });
      }
      for (const px of HK.posts)
        for (let i = 0; i < 2 + p * 5; i++) dust.spawn({ x: px + (crand() - 0.5) * 50, y: HK.corbelY + 56, vx: (crand() - 0.5) * 30, vy: 20 + crand() * 30, life: 2, r0: 1.6 + crand() * 2, a: 0.6, tint: 0xa89a88, grav: 260, drag: 0.4, fade: 0.05 });
    },
    update(dt, tt) {
      const t = tt + t0;
      // ——— the fires
      let dipK = 0;
      for (const f of fires) {
        f.gut = Math.max(0, f.gut - dt * 0.9);
        // (it comes back with a flare as the knock clears)
        f.flare = f.gut > 0.05 ? Math.max(f.flare, 1 - f.gut) * (f.gut > 0.3 ? 0 : 1) : Math.max(0, f.flare - dt * 0.8);
        const g = Phaser.Math.Easing.Quadratic.Out(clamp(f.gut / 0.6, 0, 1));
        const sq = f.sq.step(0, dt);
        f.fire.alpha = 0.8 - g * 0.45;
        f.fire.step(dt, (1 + f.flare * 0.6) * calm());
        f.fire.each((im) => im.setScale(1 + f.flare * 0.12 - sq * 0.12 + g * 0.15, Math.max(0.45, 1 + f.flare * 0.32 + sq * 0.35 - g * 0.4)));
        f.smoke.step(dt, (1 + f.flare * 0.8) * calm());
        f.smoke.alpha = 0.75 + g * 0.25;
        const n = flicker(t, f.x);
        const light = (1 - g * 0.5) * (1 + f.flare * 0.35) * (0.9 + n * 0.12);
        f.halo.setAlpha(0.28 * light);
        f.wallPool.setAlpha(0.075 * light);
        f.tablePool.setAlpha(0.1 * light);
        f.bed.setAlpha((0.34 + n * 0.1 + g * 0.2) * calm() + 0.06);
        f.coals.setAlpha(clamp(0.45 + flicker(t * 0.5, f.x + 3) * 0.3 + g * 0.3, 0, 1));
        dipK = Math.max(dipK, g);
        f.rate.tick((3 + f.flare * 16) * calm(), dt, () => {
          embers.spawn({ x: f.x + (crand() - 0.5) * rimHW, y: coalY - 70 - crand() * 40, vx: (crand() - 0.5) * 50, vy: -90 - crand() * 110, life: 1.4 + crand() * 1.2, r0: 5 + crand() * 3, r1: 1.5, a: 0.9, tint: crand() < 0.3 ? 0xffd070 : 0xff7a2a, grav: -20, drag: 0.6, streak: 0.01, fade: 0.1 });
        });
      }
      dip.setAlpha(dipK * 0.1);
      embers.update(dt);
      lumps.update(dt);
      dust.update(dt);
      // ——— the banners: a pendulum from the hook (a slow draught keeps them alive), the ripple quickening as they swing
      for (const b of banners) {
        const draught = (Math.sin(t * 0.5 + b.x) * 0.6 + Math.sin(t * 1.3 + b.x * 2) * 0.4) * 0.012 * calm();
        const a = b.s.step(draught, dt);
        b.loop.step(dt, (1 + Math.min(2.5, Math.abs(b.s.v) * 8)) * calm());
        b.loop.each((im) => im.setRotation(a));
        b.warm.setAlpha(0.07 * (0.9 + flicker(t, b.x) * 0.12));
      }
      // ——— the blizzard: gusts drive it; the flakes turn in the wind and stay on the glass
      for (const w of wins) {
        const gust = clamp(0.5 + wander(t * 0.35, w.seed) * 0.6, 0, 1);
        const wind = (40 + gust * 190) * calm();
        for (const f of w.flakes) {
          const sp = 0.45 + f.z * 0.9;
          f.x += (-wind * sp + Math.sin(t * 1.4 + f.ph) * 22 * f.z) * dt;
          f.y += ((55 + f.z * 95) * (0.8 + gust * 0.4) + Math.cos(t * 1.1 + f.ph) * 14) * dt * calm();
          if (f.y > W2.sill + 4 || f.x < w.cx - W2.hw - 20) {
            // back in at the top, or in from the right edge with the wind
            if (crand() < 0.55) {
              f.x = w.cx - W2.hw + crand() * (W2.hw * 2 + 80);
              f.y = W2.top - 6 + crand() * 30;
            } else {
              f.x = w.cx + W2.hw + 6;
              f.y = W2.top + crand() * (W2.sill - W2.top);
            }
          }
          const inside = insideLancet(w.cx, f.x, f.y);
          f.img.setPosition(f.x, f.y).setAlpha(clamp(inside / 10, 0, 1) * (0.35 + f.z * 0.6));
        }
        w.veils.forEach((v, j) => {
          v.alpha = clamp(gust * 1.5 - 0.15 - j * 0.15, 0, 1);
          v.step(dt, (0.6 + gust * 1.4) * calm());
        });
      }
    },
  };
});

