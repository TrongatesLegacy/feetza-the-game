// Hall of Kings (the Colossus's arena, the boss of the Lodge's stage), redrawn with the location kit (src/art/scene):
// the great hall of the castle up the mountain from the Lodge, the same night and the same blizzard. Dressed
// limestone under a heavy oak wall plate, its posts and arched braces landing on stone corbels; two tall lancets
// onto the night (moonlit peaks and firs, the snow driving past the leaded quarries, a drift on the outside sill);
// an iron brazier on a tripod before each lancet, its fire lighting the reveal, the wall, the banners and the near
// end of the table; the kings' banners (a crown over the foot) hung from crossbars on cords from iron hooks; the
// Colossus's throne on a rough-hewn dais, forged from the harness of the feet he has beaten: armoured legs for its
// arms, sabatons heaped and fused under the seat, a seat-back lined with lapped greave shells, and a tall uneven fan of
// spear heads, shield rims, broken plate, a great helm and a kettle hat. An oak feasting table.
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
//   glass, painted veils of blown snow sweeping across in the gusts; dust and grit sift off the wall plate at a stomp;
// - the throne: each brazier's light on its iron edges flickers with that fire; a stomp swings the loose plate on its
//   last rivet, makes the kettle hat jump and rattle on its spear, and shakes rust and soot out of the seams.

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
  boxOf,
  calmLanes,
  castShadow,
  crevice,
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
import { aoHalo } from '../../art/scene/light';
import { grain, planksPlane, tableFalloff, tableSeam, varnish, woodGrain } from '../../art/scene/materials';
import { chips, crack, drift, grime, lay, noiseMask, softly, streaks, surface } from '../../art/scene/paint';
import { cloud, farLand, skyFill, stars } from '../../art/scene/sky';
import { ashlar, rivet } from '../../art/scene/surfaces';
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
  /** The throne: its centre, the top of its fan of trophies, its seat. */
  throne: { x: 960, top: 192, seat: 540 },
  /** The dais: the top tread's front edge, its half width (the steps below widen). */
  dais: { y: 658, hw: 212 },
};

const P2 = Math.PI * 2;
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

// ——— the dais and the throne: the Colossus's war trophies forged into a seat ———

type Pt = [number, number];
const TX = HK.throne.x;
const SEAT = HK.throne.seat;
/** The vanishing point's height: treads and the seat's top recede towards it. */
const VY = 300;
/** The dais, top to bottom: each step's tread front edge, its riser's height, half width, and how deep its tread
 * looks from just above (the top one is the platform the throne stands on, deeper than the steps). */
const STEPS = [
  { y: HK.dais.y, h: 30, hw: HK.dais.hw, d: 22 },
  { y: HK.dais.y + 44, h: 26, hw: HK.dais.hw + 52, d: 14 },
  { y: HK.dais.y + 84, h: TY + 2 - (HK.dais.y + 84), hw: HK.dais.hw + 108, d: 14 },
];
/** Where the throne stands: part-way back on the top tread. */
const FL = HK.dais.y - 10;
const TIRON = '#3a3938';
const BLADE = '#5a5c62';
const RUST = '#8a4220';
/** The two fires (the light the throne's edges catch). */
const FIRE_AT: Pt[] = HK.wins.map((x) => [x, HK.brz.coalY - 50]);
/** The fan of trophies springs from behind the seat-back. */
const PIV: Pt = [TX, 540];

/** A point `d` out from o along angle a (0 straight up, positive to the right). */
const along = (a: number, d: number, o: Pt = PIV): Pt => [o[0] + Math.sin(a) * d, o[1] - Math.cos(a) * d];
/** A shape drawn in its own frame (u along its axis, v across it to the right), placed at o pointing along a. */
const placed = (o: Pt, a: number, pts: Pt[]): Pt[] => pts.map(([u, v]) => [o[0] + Math.sin(a) * u + Math.cos(a) * v, o[1] - Math.cos(a) * u + Math.sin(a) * v]);
const mirror = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [2 * TX - x, y] as Pt).reverse();
/** A polyline's points every `step` px along a quadratic curve (for curved edges kept as points). */
function curve(a: Pt, c: Pt, b: Pt, n = 8): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const s = 1 - t;
    out.push([s * s * a[0] + 2 * s * t * c[0] + t * t * b[0], s * s * a[1] + 2 * s * t * c[1] + t * t * b[1]]);
  }
  return out;
}
const ellPts = (cx: number, cy: number, rx: number, ry: number, n = 18, a0 = 0, a1 = P2): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = a0 + ((a1 - a0) * i) / n;
    return [cx + Math.cos(t) * rx, cy + Math.sin(t) * ry] as Pt;
  });

// ——— the trophies' shapes (screen space, fixed: the glints and the live layer use the same ones) ———

/** Spear heads forged onto iron rods, fanned out behind the seat-back: angle, length; some snapped. */
const SPEARS = [
  { a: -0.98, len: 214, broken: true, s: 0.85, wings: false },
  { a: -0.8, len: 290, broken: true, s: 1, wings: false },
  { a: -0.58, len: 338, broken: false, s: 1, wings: false },
  { a: -0.37, len: 300, broken: false, s: 1.15, wings: true },
  { a: -0.2, len: 318, broken: true, s: 0.9, wings: false },
  { a: 0.07, len: 322, broken: false, s: 1.2, wings: true },
  { a: 0.23, len: 304, broken: false, s: 0.8, wings: false },
  { a: 0.42, len: 330, broken: false, s: 1, wings: false },
  { a: 0.6, len: 268, broken: true, s: 1.1, wings: false },
  { a: 0.9, len: 300, broken: false, s: 0.95, wings: true },
  { a: 1.04, len: 236, broken: false, s: 0.8, wings: false },
];
const BLADE_L = 54;
type Spear = (typeof SPEARS)[number];
/** How long a spear's head is. */
const headL = (s: Spear) => BLADE_L * s.s;
/** A spear head in its own frame (u from the socket to the point): a leaf blade, or one snapped off jagged; its two
 * facets either side of the midrib. */
function bladeOf(s: Spear): { full: Pt[]; plus: Pt[]; minus: Pt[] } {
  const L = headL(s);
  const w = s.s;
  const left: Pt[] = s.broken ? [[0, -4], [L * 0.22, -9 * w], [L * 0.42, -8 * w], [L * 0.5, -3]] : [[0, -4], [L * 0.28, -9.5 * w], [L * 0.55, -7.5 * w], [L * 0.82, -3.5 * w]];
  const tip: Pt = s.broken ? [L * 0.44, 0] : [L, 0];
  const right: Pt[] = s.broken ? [[L * 0.56, 3], [L * 0.38, 7 * w], [L * 0.2, 9 * w], [0, 4]] : [[L * 0.82, 3.5 * w], [L * 0.55, 7.5 * w], [L * 0.28, 9.5 * w], [0, 4]];
  return { full: [...left, tip, ...right], plus: [[0, 0], tip, ...right], minus: [[0, 0], tip, ...[...left].reverse()] };
}
const headAt = (s: Spear) => along(s.a, s.len - headL(s));
const BLADES = SPEARS.map((s) => placed(headAt(s), s.a, bladeOf(s).full));

/** Broken plates (greaves and breastplates hammered flat) behind the spears: the fan's jagged dark mass. */
const SHARDS: Pt[][] = [
  [-1.13, -0.7, 172, 216, 188],
  [-0.76, -0.3, 206, 252, 220],
  [-0.34, 0.1, 232, 270, 236],
  [0.06, 0.5, 248, 230, 256],
  [0.45, 0.9, 222, 246, 196],
  [0.84, 1.17, 184, 164, 150],
].map(([a0, a1, r0, rm, r1]) => {
  const am = (a0 + a1) / 2;
  return [along(a0, 90), along(a0, r0), along(a0 + (am - a0) * 0.5, (r0 + rm) / 2 - 14), along(am - 0.04, rm * 0.93), along(am, rm), along(am + 0.05, rm * 0.86), along(a1 - 0.08, (rm + r1) / 2 - 6), along(a1, r1), along(a1, 90)];
});

/** Rims torn off round shields: iron bands, broken off at both ends. */
const RIMS = [
  { cx: 892, cy: 404, r: 98, w: 13, a0: 3.55, a1: 5.15 },
  { cx: 1036, cy: 396, r: 86, w: 12, a0: 4.2, a1: 6.05 },
];
function rimPts(m: (typeof RIMS)[number]): Pt[] {
  const o = ellPts(m.cx, m.cy, m.r + m.w / 2, m.r + m.w / 2, 16, m.a0, m.a1);
  const i = ellPts(m.cx, m.cy, m.r - m.w / 2, m.r - m.w / 2, 16, m.a0 + 0.04, m.a1 - 0.03).reverse();
  // (the ends torn, not cut: a notch in each)
  const end = (a: number, k: number): Pt => [m.cx + Math.cos(a) * (m.r + k), m.cy + Math.sin(a) * (m.r + k)];
  return [...o, end(m.a1 - 0.02, 1), ...i, end(m.a0 + 0.06, -2)];
}
const RIM_PTS = RIMS.map(rimPts);

/** A great helm impaled on a spear (the left), and a kettle hat on another (the right, loose: it rattles). */
const HELM_L = { c: along(-0.58, 264), a: -0.58 - 0.12 };
const HELM_R = { c: along(0.42, 252), a: 0.42 + 0.26 };
const GREAT_HELM: Pt[] = [[-30, -25], [-12, -27.5], [10, -27], [24, -24], [29, -18], [30, 0], [29, 18], [24, 24], [10, 27], [-12, 27.5], [-30, 25], [-32, 0]];
/** The kettle hat: a round crown over a wide brim, seen nearly edge on (u up its axis, v across). */
const KETTLE_CROWN: Pt[] = Array.from({ length: 13 }, (_, i) => {
  const t = (Math.PI * i) / 12;
  return [-5 + 29 * Math.sin(t), -21 * Math.cos(t)] as Pt;
});
const KETTLE: Pt[] = [...KETTLE_CROWN, [-6, 26], [-8, 37], [-13, 33], [-16, 14], [-17, 0], [-16, -14], [-13, -33], [-8, -37], [-6, -26]];
const HELM_L_PTS = placed(HELM_L.c, HELM_L.a, GREAT_HELM);
const HELM_R_PTS = placed(HELM_R.c, HELM_R.a, KETTLE);

/** The seat-back: plates fused into one jagged mass, its top broken into spikes, a crest up the middle. */
const BACK: Pt[] = [
  [TX - 120, SEAT - 6], [TX - 122, 404], [TX - 114, 374], [TX - 94, 362], [TX - 82, 330], [TX - 58, 350], [TX - 40, 316],
  [TX - 18, 336], [TX, 284], [TX + 20, 334], [TX + 40, 312], [TX + 60, 346], [TX + 84, 326], [TX + 98, 362], [TX + 116, 370],
  [TX + 122, 402], [TX + 118, SEAT - 6],
];
/** The hollow he leans in. */
const PANEL: Pt[] = [[TX - 92, SEAT - 10], [TX - 92, 424], ...curve([TX - 92, 424], [TX - 88, 392], [TX, 388], 5).slice(1), ...curve([TX, 388], [TX + 88, 392], [TX + 92, 424], 5).slice(1), [TX + 92, SEAT - 10]];
const SPINE: Pt[] = [[TX - 13, 394], [TX - 16, 334], [TX - 7, 302], [TX, 286], [TX + 7, 302], [TX + 16, 334], [TX + 13, 394]];
/** The arms: an armoured leg (greave, knee cop, sabaton) at each front corner, an arm plate back to the seat-back. */
const POST_X = [TX - 156, TX + 156];
const greave = (px: number): Pt[] => [
  [px - 17, 474], [px - 20, 500], [px - 21, 530], [px - 18, 566], [px - 14, 600], [px - 12, FL - 20],
  [px + 12, FL - 20], [px + 14, 600], [px + 18, 566], [px + 21, 530], [px + 20, 500], [px + 17, 474],
];
const GREAVES = POST_X.map(greave);
const POLEYNS = POST_X.map((px) => ellPts(px, 468, 23, 15, 16));
const WINGS = POST_X.map((px, i): Pt[] => {
  const s = i ? 1 : -1;
  return [[px + s * 12, 460], [px + s * 30, 448], [px + s * 42, 456], [px + s * 42, 474], [px + s * 34, 488], [px + s * 14, 480]];
});
/** (each runs back from its knee cop to the seat-back, so in perspective it climbs in towards the middle) */
const ARMS: Pt[][] = [
  [[POST_X[0] + 6, 455], [TX - 114, 440], [TX - 112, 460], [POST_X[0] + 14, 479]],
  mirror([[POST_X[0] + 6, 455], [TX - 114, 440], [TX - 112, 460], [POST_X[0] + 14, 479]]),
];
/** The seat: its top (seen from just above, running back to the seat-back) and its thick front lip. */
const SEAT_HW = 142;
const SEAT_BACK = SEAT_HW - (SEAT_HW * 16) / (SEAT - VY);
const SEAT_TOP: Pt[] = [[TX - SEAT_BACK, SEAT - 16], [TX + SEAT_BACK, SEAT - 16], [TX + SEAT_HW, SEAT], [TX - SEAT_HW, SEAT]];
const LIP: Pt[] = [
  [TX - SEAT_HW, SEAT], [TX + SEAT_HW, SEAT], [TX + SEAT_HW + 2, SEAT + 8], [TX + SEAT_HW - 4, SEAT + 17], [TX + 70, SEAT + 15],
  [TX + 30, SEAT + 19], [TX - 20, SEAT + 15], [TX - 76, SEAT + 18], [TX - SEAT_HW + 4, SEAT + 16], [TX - SEAT_HW - 2, SEAT + 7],
];
/** Under the seat: the heap of beaten sabatons, fused. */
const HEAP: Pt[] = [
  [TX - 134, SEAT + 12], [TX - 126, SEAT + 48], [TX - 138, FL - 10], [TX - 118, FL], [TX + 122, FL], [TX + 140, FL - 12],
  [TX + 128, SEAT + 50], [TX + 134, SEAT + 12],
];

interface Sabaton {
  out: Pt[];
  lames: [Pt, Pt][];
  cuff: [Pt, Pt];
  toe: Pt;
}
/** A sabaton in profile: heel at (hx, sy) on its sole, the toe `len` away towards dir, its cuff `h` high; tilt
 * turns it about the heel. */
function sabaton(hx: number, sy: number, len: number, dir: 1 | -1, h: number, tilt = 0): Sabaton {
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);
  const P = (u: number, v: number): Pt => [hx + dir * (u * ct + v * st), sy + (v * ct - u * st)];
  // the ankle (the greave's foot, flared), the instep stepping down to the lames, the rounded toe cap
  const top = [[-6, -h], [len * 0.2, -h], [len * 0.24, -h * 0.8], [len * 0.3, -h * 0.64], [len * 0.5, -h * 0.54], [len * 0.7, -h * 0.45], [len * 0.86, -h * 0.36], [len * 0.96, -h * 0.24], [len, -h * 0.1]];
  const out: Pt[] = [P(0, 0), P(-7, -h * 0.2), P(-9, -h * 0.55), ...top.map(([u, v]) => P(u, v)), P(len * 0.98, 0), P(len * 0.5, 1.5)];
  const topAt = (u: number) => {
    for (let i = 1; i < top.length; i++)
      if (u <= top[i][0]) {
        const t = (u - top[i - 1][0]) / (top[i][0] - top[i - 1][0]);
        return top[i - 1][1] + (top[i][1] - top[i - 1][1]) * t;
      }
    return 0;
  };
  const lames = [0.34, 0.46, 0.58, 0.7, 0.82].map((k): [Pt, Pt] => [P(len * k, topAt(len * k) + 1), P(len * (k + 0.06), -1)]);
  return { out, lames, cuff: [P(-8, -h * 0.7), P(len * 0.25, -h * 0.74)], toe: P(len * 0.88, -h * 0.22) };
}
const FEET = POST_X.map((px, i) => sabaton(px + (i ? -12 : 12), FL, 64, i ? 1 : -1, 34, 0.02));
const HEAP_GREAVE: Pt[] = [[TX - 120, SEAT + 20], [TX - 60, SEAT + 16], [TX + 50, SEAT + 18], [TX + 64, SEAT + 26], [TX + 52, SEAT + 37], [TX - 50, SEAT + 40], [TX - 118, SEAT + 36]];
const HEAP_BOOTS = [sabaton(TX + 110, SEAT + 60, 112, -1, 50, 0.1), sabaton(TX - 112, FL - 2, 124, 1, 52, -0.04)];

/** The loose plate: a pauldron's lame hanging from one rivet off the seat-back's right shoulder (its other rivet torn
 * out). It swings at a stomp. */
const LOOSE: Pt = [TX + 104, 378];
const LOOSE_PTS: Pt[] = ([[-11, -4], [13, -7], [22, 8], [25, 38], [19, 64], [3, 72], [-12, 62], [-17, 32], [-15, 8]] as Pt[]).map(([x, y]) => [LOOSE[0] + x, LOOSE[1] + y] as Pt);

/** Every part whose edges the fires catch, in the order they're painted (not the moving pieces: they carry their own). */
const LIT_ORDER: Pt[][] = [
  ...SHARDS, ...RIM_PTS, ...BLADES, HELM_L_PTS, BACK, SPINE, ...ARMS,
  ...POST_X.flatMap((_, i) => [GREAVES[i], FEET[i].out, WINGS[i], POLEYNS[i]]),
  HEAP, HEAP_GREAVE, ...HEAP_BOOTS.map((b) => b.out), LIP, SEAT_TOP,
];
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
/** Where a stomp shakes rust and soot loose: the seams of the fan, the rims, the seat's lip, under the loose plate. */
const SHAKE: Pt[] = [along(-0.7, 200), along(-0.2, 236), along(0.3, 232), along(0.8, 200), [892, 308], [1040, 312], [TX - 90, SEAT + 18], [TX + 60, SEAT + 18], [LOOSE[0] + 4, LOOSE[1] + 70], [TX, 300], [TX - 150, 452], [TX + 150, 452]];

// ——— painting iron ———

/**
 * Light along a polygon's edges: every edge whose outward face turns towards `from` gets a thin bright line just
 * inside it (and a soft one round it), the more the more it faces the light: the hard glint steel gives a fire.
 */
function edgeGlint(ctx: Ctx, pts: Pt[], from: Pt, col: string, a: number, w = 1.6, soft = 0.25, min = 0.15): void {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    area += x0 * y1 - x1 * y0;
  }
  const sg = Math.sign(area) || 1;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    const len = Math.hypot(x1 - x0, y1 - y0);
    if (len < 1) continue;
    const nx = (sg * (y1 - y0)) / len;
    const ny = (sg * -(x1 - x0)) / len;
    const fx = from[0] - (x0 + x1) / 2;
    const fy = from[1] - (y0 + y1) / 2;
    const fl = Math.hypot(fx, fy) || 1;
    const d = (nx * fx + ny * fy) / fl;
    if (d < min) continue;
    const k = a * ((d - min) / (1 - min)) ** 0.8;
    const ix = -nx * w * 0.6;
    const iy = -ny * w * 0.6;
    if (soft) {
      ctx.strokeStyle = rgba(col, k * soft);
      ctx.lineWidth = w * 4;
      ctx.beginPath();
      ctx.moveTo(x0 + ix, y0 + iy);
      ctx.lineTo(x1 + ix, y1 + iy);
      ctx.stroke();
    }
    ctx.strokeStyle = rgba(col, k);
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x0 + ix, y0 + iy);
    ctx.lineTo(x1 + ix, y1 + iy);
    ctx.stroke();
  }
  ctx.restore();
}

/** A hammer's dent: its upper-left wall in shade, its lower-right one catching the light. */
function dent(ctx: Ctx, x: number, y: number, s: number): void {
  ctx.fillStyle = 'rgba(6,5,8,0.42)';
  ctx.beginPath();
  ctx.ellipse(x, y, s, s * 0.7, -0.5, Math.PI * 0.85, Math.PI * 1.95);
  ctx.fill();
  ctx.fillStyle = rgba('#ffe4c8', 0.14);
  ctx.beginPath();
  ctx.ellipse(x + s * 0.1, y + s * 0.1, s, s * 0.7, -0.5, -0.15, Math.PI * 0.85);
  ctx.fill();
}

/** A weld: soot in the seam, then a bead of overlapping ripples along it, their tops lit. */
function weld(ctx: Ctx, r: R, pts: Pt[], w = 4): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(6,4,4,0.55)';
  ctx.lineWidth = w + 4;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const n = Math.max(1, Math.floor(Math.hypot(bx - ax, by - ay) / (w * 0.75)));
    const ang = Math.atan2(by - ay, bx - ax);
    for (let j = 0; j < n; j++) {
      const t = j / n;
      const x = ax + (bx - ax) * t + (r() - 0.5);
      const y = ay + (by - ay) * t + (r() - 0.5);
      ctx.fillStyle = '#2c2826';
      ctx.beginPath();
      ctx.ellipse(x, y, w * 0.5, w * 0.72, ang, 0, P2);
      ctx.fill();
      ctx.fillStyle = rgba('#e0d0c0', 0.2);
      ctx.beginPath();
      ctx.ellipse(x - 0.6, y - 0.9, w * 0.26, w * 0.36, ang, 0, P2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Rust blooming on iron: patchy, orange-brown, thickest low on the part. */
function rust(ctx: Ctx, b: Box, a: number, seed: number): void {
  lay(ctx, noiseMask(6, seed, { cover: 0.26, soft: 0.2, col: RUST }), b, a * 0.6);
  lay(ctx, noiseMask(14, seed + 1, { cover: 0.2, soft: 0.1, col: '#5a2610' }), b, a * 0.6);
}

interface IronOpts {
  base?: string;
  dents?: number;
  rust?: number;
  line?: number;
  /** The key light's glint on the upper-left edges. */
  key?: number;
  /** How dark the hall's air leaves it (0…1). */
  dark?: number;
}

/** A forged iron part: the material lit by the key light, hammer dents, rust, the hall's dark over it thickest low,
 * the key light's glint on its upper-left edges and the moon's cold rim on its far ones. */
function iron(ctx: Ctx, r: R, pts: Pt[], o: IronOpts = {}): void {
  const p = polyPath(pts);
  const b = boxOf(pts);
  solid(ctx, p, b, 'iron', o.base ?? TIRON, { depth: 0.12, line: o.line ?? 1.3, ink: '#0a0808', formSize: Math.max(3, Math.min(b.w, b.h) * 0.2), texA: 0.4, spec: false });
  within(ctx, p, () => {
    for (let i = 0; i < (o.dents ?? 0); i++) dent(ctx, b.x + b.w * (0.18 + r() * 0.64), b.y + b.h * (0.18 + r() * 0.64), 2.5 + r() * Math.min(6, b.w * 0.08));
    if (o.rust) rust(ctx, b, o.rust, 3 + Math.floor(r() * 5));
    const dk = o.dark ?? 0.3;
    vfill(ctx, b.x, b.y, b.w, b.h, [[0, `rgba(10,8,12,${(dk * 0.3).toFixed(3)})`], [0.6, `rgba(10,8,12,${dk.toFixed(3)})`], [1, `rgba(6,5,8,${Math.min(0.8, dk + 0.25).toFixed(3)})`]]);
  });
  edgeGlint(ctx, pts, [b.x - 400, b.y - 500], '#f0e2cc', (o.key ?? 0.2) * 0.6, 1.1, 0, 0.6);
}

function rivets(ctx: Ctx, pts: Pt[], rad = 2.6, a = 1): void {
  for (const [x, y] of pts) rivet(ctx, x, y, rad, '#6a6460', a);
}

/** Points every `gap` px along a polyline, inset `inset` px to its right (for a row of rivets along an edge). */
function alongLine(pts: Pt[], gap: number, inset = 0): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const len = Math.hypot(bx - ax, by - ay);
    const nx = -(by - ay) / len;
    const ny = (bx - ax) / len;
    for (let s = gap / 2; s < len; s += gap) out.push([ax + ((bx - ax) * s) / len + nx * inset, ay + ((by - ay) * s) / len + ny * inset]);
  }
  return out;
}

/** A line with a dark groove and a lit lip below it (a lame's overlap, a ridge, a seam hammered in). */
function groove(ctx: Ctx, a: Pt, b: Pt, w = 2, lip: Pt = [0.8, 1.2]): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(8,6,8,0.7)';
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
  ctx.strokeStyle = rgba('#e8d8c4', 0.2);
  ctx.lineWidth = w * 0.6;
  ctx.beginPath();
  ctx.moveTo(a[0] + lip[0], a[1] + lip[1]);
  ctx.lineTo(b[0] + lip[0], b[1] + lip[1]);
  ctx.stroke();
  ctx.restore();
}

function crackOn(ctx: Ctx, r: R, x: number, y: number, ang: number, len: number): void {
  crack(ctx, r, x, y, ang, len, { col: '#060404', lip: '#c8bcb0', w: 1.6, a: 0.7, branch: 0.2 });
}

// ——— the dais ———

/** One rough-hewn step: its tread (seen from just above) and riser, the riser in blocks with wandering joints,
 * hewing marks, its arris knocked about. */
function roughStep(ctx: Ctx, r: R, s: (typeof STEPS)[number], top: boolean): void {
  const { y, h, hw, d } = s;
  const x0 = TX - hw;
  const x1 = TX + hw;
  const back = hw - (hw * d) / (y - VY);
  // the joints between the riser's blocks, and the arris: not quite straight
  const joints: number[] = [x0];
  for (let x = x0 + 70 + r() * 50; x < x1 - 60; x += 90 + r() * 70) joints.push(x);
  joints.push(x1);
  const edge: Pt[] = [];
  joints.forEach((jx, i) => {
    edge.push([jx, y + (i === 0 || i === joints.length - 1 ? 2 : (r() - 0.5) * 3.5)]);
    if (i < joints.length - 1) edge.push([(jx + joints[i + 1]) / 2 + (r() - 0.5) * 20, y + (r() - 0.5) * 4.5]);
  });
  // the riser casts its shadow on the tread below (painted first) and blocks the wall's light
  const face = polyPath([...edge, [x1, y + h], [x0, y + h]]);
  castShadow(ctx, face, 6, 9, 0.55, '#08060a');
  // the tread
  const tread = polyPath([[TX - back, y - d], [TX + back, y - d], ...[...edge].reverse()]);
  const tb = { x: x0, y: y - d, w: hw * 2, h: d };
  dressed(ctx, r, tread, tb);
  within(ctx, tread, () => {
    nightLight(ctx, tb);
    lay(ctx, noiseMask(9, 71, { cover: 0.4, soft: 0.3, col: '#1a1416' }), tb, 0.35);
    // its back in the shade of the riser above (or the throne), the front lit and worn smooth up the middle
    vfill(ctx, x0, y - d, hw * 2, d, [[0, 'rgba(8,6,10,0.5)'], [0.45, rgba('#ffd8b0', 0.07)], [1, rgba('#ffe0c0', 0.22)]]);
    lightPool(ctx, TX, y - d * 0.35, hw * 0.42, d * 0.7, '#d8c8b0', top ? 0.05 : 0.09);
  });
  // the riser's blocks: each its own stone, the joints wandering, the faces left rough from the axe
  for (let i = 0; i < joints.length - 1; i++) {
    const a = joints[i];
    const b = joints[i + 1];
    const ja = i ? (r() - 0.5) * 5 : 0;
    const jb = i < joints.length - 2 ? (r() - 0.5) * 5 : 0;
    const blk: Pt[] = [...edge.filter(([ex]) => ex >= a && ex <= b), [b + jb, y + h * 0.5], [b, y + h], [a, y + h], [a + ja, y + h * 0.5]];
    const bp = polyPath(blk);
    const bb = { x: a, y, w: b - a, h };
    dressed(ctx, r, bp, bb, false);
    within(ctx, bp, () => {
      nightLight(ctx, bb);
      lay(ctx, noiseMask(5, 73 + i, { cover: 0.45, soft: 0.3, col: '#120e10' }), bb, 0.4);
      // the axe's marks: short slanting cuts, each lit on its lower lip
      for (let k = 0; k < (b - a) / 22; k++) {
        const cx = a + 4 + r() * (b - a - 8);
        const cy = y + 4 + r() * (h - 8);
        const l = 3 + r() * 3;
        ctx.strokeStyle = 'rgba(10,8,10,0.26)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + l * 0.5, cy + l * 0.85);
        ctx.stroke();
        ctx.strokeStyle = rgba('#e8d8c0', 0.1);
        ctx.beginPath();
        ctx.moveTo(cx + 1.2, cy + 0.4);
        ctx.lineTo(cx + 1.2 + l * 0.5, cy + 0.4 + l * 0.85);
        ctx.stroke();
      }
      vfill(ctx, a, y, b - a, h, [[0, rgba('#ffd8b0', 0.12)], [0.25, 'rgba(0,0,0,0)'], [1, 'rgba(8,6,10,0.5)']]);
    });
  }
  // the arris catches the light where feet have worn it, and is chipped where things were dropped on it
  ctx.strokeStyle = rgba('#ffe0b8', 0.32);
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  edge.forEach(([ex, ey], i) => (i ? ctx.lineTo(ex, ey - 0.8) : ctx.moveTo(ex + 2, ey - 0.8)));
  ctx.stroke();
  chips(ctx, r, x0 + 10, x1 - 10, y, Math.round(hw / 30), '#8a8174', 4);
  // the corners knocked off: a spalled hollow at each end of the arris, its broken face lit from above
  for (const sd of [-1, 1]) {
    const cx = TX + sd * (hw - 10 - r() * 14);
    const sp = polyPath([[cx - 9, y - 1], [cx + 9, y - 1], [cx + 5, y + 6 + r() * 4], [cx - 6, y + 5]]);
    ctx.fillStyle = 'rgba(14,10,12,0.55)';
    sp(ctx);
    ctx.fill();
    ctx.fillStyle = rgba('#e8d8c0', 0.16);
    ctx.fillRect(cx - 6, y + 4, 10, 1.4);
  }
  if (!top) crack(ctx, r, x0 + hw * (0.3 + r() * 0.2), y + 2, 1.3, h * 0.9, { col: '#141010', lip: '#c8b8a0', w: 1.4, a: 0.5 });
  crevice(ctx, TX - back, TX + back, y - d, 6, 0.55);
}

function dais(ctx: Ctx, r: R): void {
  // bottom first: each riser's shadow falls on the tread below it
  for (let i = STEPS.length - 1; i >= 0; i--) roughStep(ctx, r, STEPS[i], i === 0);
  // where the dais meets the wall's plinth
  const s = STEPS[STEPS.length - 1];
  crevice(ctx, TX - s.hw, TX + s.hw, TY, -10, 0.5);
}

// ——— the throne ———

function spear(ctx: Ctx, r: R, i: number): void {
  const s = SPEARS[i];
  const p0 = along(s.a, 96);
  const p1 = along(s.a, s.len - headL(s) + 2);
  // the rod: square iron, dark, its upper-left edge lit
  ctx.save();
  ctx.lineCap = 'butt';
  ctx.strokeStyle = '#1c1a1a';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(p0[0], p0[1]);
  ctx.lineTo(p1[0], p1[1]);
  ctx.stroke();
  const lit = Math.cos(s.a) > 0 ? -1 : 1;
  const [nx, ny] = [Math.cos(s.a) * lit * 2, Math.sin(s.a) * lit * 2];
  ctx.strokeStyle = rgba('#d8ccc0', 0.2);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(p0[0] - Math.abs(nx), p0[1] + ny);
  ctx.lineTo(p1[0] - Math.abs(nx), p1[1] + ny);
  ctx.stroke();
  ctx.restore();
  // the socket, bound with a collar; some heads have lugs (wings) at its top to stop a thrust going too deep
  const o = headAt(s);
  if (s.wings)
    for (const sd of [-1, 1]) iron(ctx, r, placed(o, s.a, [[-3, sd * 5], [-9, sd * 17 * s.s], [-1, sd * 12 * s.s], [4, sd * 6]]), { base: '#34322f', line: 1.1, key: 0.25 });
  const sock = placed(o, s.a, [[-14, -5.5], [2, -6], [2, 6], [-14, 5.5]]);
  iron(ctx, r, sock, { base: '#2e2c2c', line: 1.2, key: 0.25 });
  // the head: a leaf of steel, two facets either side of its midrib (the one turned from the light darker)
  const bp = BLADES[i];
  const bl = bladeOf(s);
  iron(ctx, r, bp, { base: BLADE, line: 1.3, key: 0.3, rust: 0.3, dark: 0.15 });
  // (the facet on the +v side faces the light when its normal points up-left)
  const facesLight = Math.cos(s.a) * -0.6 + Math.sin(s.a) * -0.8 > 0;
  within(ctx, polyPath(bp), () => {
    ctx.fillStyle = 'rgba(8,6,10,0.4)';
    polyPath(placed(o, s.a, facesLight ? bl.minus : bl.plus))(ctx);
    ctx.fill();
  });
  groove(ctx, along(s.a, s.len - headL(s) + 2), along(s.a, s.len - (s.broken ? headL(s) * 0.55 : 6)), 1.2, [0.4, 0.6]);
}

function shard(ctx: Ctx, r: R, pts: Pt[], i: number): void {
  iron(ctx, r, pts, { base: shade(TIRON, -0.14 + (i % 3) * 0.04), dents: 3, rust: 0.4, dark: 0.45, key: 0.16 });
  const p = polyPath(pts);
  within(ctx, p, () => {
    // hammered from something: a greave's ridge or a breastplate's keel runs up some of them
    if (i % 2 === 0) groove(ctx, pts[0], pts[4], 2.2);
    grime(ctx, boxOf(pts), { bottom: 40, a: 0.5, seed: 41 + i, col: '#0a0808' });
  });
  // riveted to its neighbours along one edge
  rivets(ctx, alongLine([pts[1], pts[0]], 26, 7), 2.4, 0.9);
}

function shieldRim(ctx: Ctx, r: R, i: number): void {
  const m = RIMS[i];
  const pts = RIM_PTS[i];
  castShadow(ctx, polyPath(pts), 8, 8, 0.5, '#060406');
  iron(ctx, r, pts, { base: shade(TIRON, 0.06), dents: 4, rust: 0.5, key: 0.28, dark: 0.3 });
  within(ctx, polyPath(pts), () => {
    // the rim's roll: a lit bead along its outer edge, a groove inside it
    ctx.strokeStyle = rgba('#e8dccc', 0.16);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(m.cx, m.cy, m.r + m.w * 0.2, m.a0, m.a1);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(6,4,6,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(m.cx, m.cy, m.r - m.w * 0.1, m.a0, m.a1);
    ctx.stroke();
  });
  const rv: Pt[] = [];
  for (let a = m.a0 + 0.12; a < m.a1 - 0.08; a += 0.26) rv.push([m.cx + Math.cos(a) * m.r, m.cy + Math.sin(a) * m.r]);
  rivets(ctx, rv, 2.4, 0.95);
}

/** The great helm: a flat-topped iron pot, its eye slits and breaths, a cross strap riveted over the face, split
 * by the blow that won it. */
function greatHelm(ctx: Ctx, r: R): void {
  const { c, a } = HELM_L;
  const P = (pts: Pt[]) => placed(c, a, pts);
  castShadow(ctx, polyPath(HELM_L_PTS), 10, 12, 0.6, '#060406');
  iron(ctx, r, HELM_L_PTS, { base: '#4a4644', dents: 3, rust: 0.45, key: 0.3, dark: 0.25 });
  within(ctx, polyPath(HELM_L_PTS), () => {
    // the face: the slits and the breaths
    for (const side of [-1, 1]) {
      const sl = P([[6, side * 4], [10, side * 4], [10, side * 23], [6, side * 23]]);
      ctx.fillStyle = '#040304';
      polyPath(sl)(ctx);
      ctx.fill();
      ctx.strokeStyle = rgba('#e8dccc', 0.22);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sl[3][0], sl[3][1] + 1.2);
      ctx.lineTo(sl[0][0], sl[0][1] + 1.2);
      ctx.stroke();
    }
    for (let ui = 0; ui < 3; ui++)
      for (let vi = 0; vi < 3; vi++) {
        const [hx, hy] = P([[-10 - ui * 6, 9 + vi * 5]])[0];
        ctx.fillStyle = '#050405';
        ctx.beginPath();
        ctx.arc(hx, hy, 1.3, 0, P2);
        ctx.fill();
      }
    // the cross strap
    const st = P([[26, -4], [26, 4], [-30, 4], [-30, -4]]);
    ctx.fillStyle = rgba('#5e5a56', 0.9);
    polyPath(st)(ctx);
    ctx.fill();
    ctx.strokeStyle = 'rgba(6,4,6,0.6)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // the top's flat crown seen just from below: a dark band
    const crown = P([[24, -24], [29, -18], [29, 18], [24, 24]]);
    ctx.fillStyle = 'rgba(6,4,6,0.35)';
    polyPath(crown)(ctx);
    ctx.fill();
    grime(ctx, boxOf(HELM_L_PTS), { bottom: 18, a: 0.5, seed: 47, col: '#0a0808' });
  });
  rivets(ctx, P([[18, 0], [0, 0], [-18, 0], [13, -14], [13, 14]]), 2, 0.95);
  const [kx, ky] = P([[26, 10]])[0];
  crackOn(ctx, r, kx, ky, a + Math.PI / 2 + 0.25, 30);
}

/** The kettle hat (the rattling one): a round crown with a comb, a wide brim knocked out of true, dented and split. */
function kettleHat(ctx: Ctx, r: R): void {
  const { c, a } = HELM_R;
  const P = (pts: Pt[]) => placed(c, a, pts);
  castShadow(ctx, polyPath(HELM_R_PTS), 9, 10, 0.55, '#060406');
  iron(ctx, r, HELM_R_PTS, { base: '#4a4948', dents: 4, rust: 0.25, key: 0.3, dark: 0.22 });
  within(ctx, polyPath(HELM_R_PTS), () => {
    // the brim: its top surface a thin lit band, its underside in shade, the crown's foot in its shadow
    const top = P([[-6, -37], [-4, 0], [-6, 37], [-9, 37], [-8, 0], [-9, -37]]);
    ctx.fillStyle = rgba('#d8d0c8', 0.12);
    polyPath(top)(ctx);
    ctx.fill();
    const under = P([[-10, -36], [-12, 0], [-10, 36], [-14, 33], [-17, 0], [-14, -33]]);
    ctx.fillStyle = 'rgba(6,4,8,0.5)';
    polyPath(under)(ctx);
    ctx.fill();
    groove(ctx, P([[-5, -21]])[0], P([[-5, 21]])[0], 2);
    // the crown's comb, its round lit on the left
    groove(ctx, P([[24, -1]])[0], P([[-3, -2]])[0], 1.6, [-1, 0]);
    const g = ctx.createRadialGradient(...P([[12, -8]])[0], 2, ...P([[8, 0]])[0], 30);
    g.addColorStop(0, rgba('#d8dce8', 0.14));
    g.addColorStop(1, 'rgba(216,220,232,0)');
    ctx.fillStyle = g;
    ctx.fillRect(c[0] - 40, c[1] - 40, 80, 80);
    grime(ctx, boxOf(HELM_R_PTS), { bottom: 12, a: 0.45, seed: 49, col: '#0a0808' });
  });
  rivets(ctx, P([[-3, -16], [-2, -6], [-2, 6], [-3, 16]]), 1.8, 0.95);
  const [kx, ky] = P([[22, 8]])[0];
  crackOn(ctx, r, kx, ky, a + Math.PI * 0.55, 22);
  // its own share of the fires' light (it moves, so it isn't in the glint layers)
  for (const f of FIRE_AT) edgeGlint(ctx, HELM_R_PTS, f, '#ffb468', 0.3, 1.4, 0.3, 0.35);
}

/** The loose plate, hanging from its last rivet. */
function loosePlate(ctx: Ctx, r: R): void {
  const pts = LOOSE_PTS;
  castShadow(ctx, polyPath(pts), 6, 7, 0.55, '#060406');
  iron(ctx, r, pts, { base: '#46423f', dents: 2, rust: 0.55, key: 0.3, dark: 0.3 });
  within(ctx, polyPath(pts), () => {
    // a lame's turned edges: lit bead down its outer side, overlap lines across
    for (const yy of [22, 44]) groove(ctx, [LOOSE[0] - 16, LOOSE[1] + yy], [LOOSE[0] + 24, LOOSE[1] + yy + 4], 1.8);
    grime(ctx, boxOf(pts), { bottom: 20, a: 0.55, seed: 51, col: '#0a0808' });
  });
  rivet(ctx, LOOSE[0], LOOSE[1], 3.2, '#6a6460');
  // where the second rivet tore out: a ragged hole
  ctx.fillStyle = '#050304';
  ctx.beginPath();
  ctx.ellipse(LOOSE[0] + 4, LOOSE[1] + 60, 3, 2.4, 0.4, 0, P2);
  ctx.fill();
  ctx.strokeStyle = rgba('#e0d4c4', 0.25);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(LOOSE[0] + 4, LOOSE[1] + 60, 3.4, 0.2, 1.8);
  ctx.stroke();
  for (const f of FIRE_AT) edgeGlint(ctx, pts, f, '#ffb468', 0.3, 1.4, 0.3, 0.35);
}

function paintSabaton(ctx: Ctx, r: R, b: Sabaton, o: IronOpts = {}): void {
  iron(ctx, r, b.out, { dents: 2, rust: 0.4, key: 0.24, ...o });
  within(ctx, polyPath(b.out), () => {
    for (const [p, q] of b.lames) groove(ctx, p, q, 1.8, [1.2, 0.4]);
    groove(ctx, b.cuff[0], b.cuff[1], 2.2);
    // the toe cap's dome catching the light
    lightPool(ctx, b.toe[0] - 2, b.toe[1] - 2, 10, 6, '#e8dccc', 0.16);
    grime(ctx, boxOf(b.out), { bottom: 14, a: 0.55, seed: 53, col: '#0a0808' });
  });
  rivets(ctx, b.lames.map(([, q]) => [q[0], q[1] - 4] as Pt), 1.7, 0.85);
}

/** The throne's shadow on the wall behind and its occlusion: every part's silhouette, pushed down-right and softened. */
function wallShadow(ctx: Ctx): void {
  const parts = [...SHARDS, ...RIM_PTS, BACK, HELM_L_PTS, HELM_R_PTS, ...BLADES];
  const box = { x: TX - 300, y: 170, w: 640, h: FL - 170 };
  softly(ctx, box, (g) => {
    g.fillStyle = 'rgba(6,4,8,0.5)';
    for (const pts of parts) {
      polyPath(pts.map(([x, y]) => [x + 22, y + 26] as Pt))(g);
      g.fill();
    }
    g.strokeStyle = 'rgba(6,4,8,0.5)';
    g.lineWidth = 8;
    for (const s of SPEARS) {
      const [ax, ay] = along(s.a, 96);
      const [bx, by] = headAt(s);
      g.beginPath();
      g.moveTo(ax + 22, ay + 26);
      g.lineTo(bx + 22, by + 26);
      g.stroke();
    }
  }, 0.12);
  // a closer, darker occlusion round the mass where it stands nearest the wall
  aoHalo(ctx, polyPath(BACK), 34, 0.5, '#060408', 8);
}

/**
 * The hollow's lining: shells of greaves and sole plates beaten out and lapped like tiles, each row over the one
 * below, no two the same size; each shell's rolled lower edge lit, a dent or two, some riveted at the top.
 */
function scales(ctx: Ctx, r: R, pb: Box): void {
  const rows: number[] = [];
  for (let y = SEAT - 34; y > pb.y - 10; y -= 24 + r() * 10) rows.push(y);
  // bottom row first: each row above laps over it
  rows.forEach((y, ri) => {
    let x = pb.x - 10 - r() * 20 - (ri % 2) * 14;
    while (x < pb.x + pb.w + 6) {
      const w = 34 + r() * 34;
      const x0 = x;
      const x1 = x + w;
      const yb = y + 26 + r() * 8;
      const yt = y - 6;
      const sag = 6 + r() * 6;
      const tilt = (r() - 0.5) * 6;
      const shell = (c: Ctx) => {
        c.beginPath();
        c.moveTo(x0, yt);
        c.lineTo(x1, yt);
        c.lineTo(x1, yb - sag + tilt);
        c.quadraticCurveTo((x0 + x1) / 2, yb + sag, x0, yb - sag - tilt);
        c.closePath();
      };
      // its shadow on the shell below
      ctx.save();
      ctx.translate(2, 4);
      shell(ctx);
      ctx.fillStyle = 'rgba(4,3,6,0.45)';
      ctx.fill();
      ctx.restore();
      const tone = mix('#36332f', '#4c4844', r());
      const g = ctx.createLinearGradient(x0, yt, x0 + w * 0.3, yb + sag);
      g.addColorStop(0, shade(tone, 0.12));
      g.addColorStop(0.55, tone);
      g.addColorStop(1, mix(shade(tone, -0.35), '#0e1020', 0.25));
      shell(ctx);
      ctx.fillStyle = g;
      ctx.fill();
      within(ctx, shell, () => {
        dent(ctx, x0 + w * (0.25 + r() * 0.5), y + 6 + r() * 12, 3 + r() * 4);
        if (r() < 0.5) rust(ctx, { x: x0, y: yt, w, h: yb + sag - yt }, 0.35, 5 + (ri % 3));
        // the rolled edge along its bottom, lit from above
        ctx.strokeStyle = rgba('#e8dccc', 0.16);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, yb - sag + tilt - 2.5);
        ctx.quadraticCurveTo((x0 + x1) / 2, yb + sag - 2.5, x0, yb - sag - tilt - 2.5);
        ctx.stroke();
      });
      shell(ctx);
      ctx.strokeStyle = 'rgba(8,6,8,0.8)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      if (r() < 0.45) rivets(ctx, [[x0 + 6, yt + 6], [x1 - 6, yt + 6]], 1.8, 0.85);
      x = x1 - 4 - r() * 6;
    }
  });
}

function throne(ctx: Ctx, r: R): void {
  dais(ctx, r);
  wallShadow(ctx);
  // where it stands: its weight's shadow pooled on the tread
  groundShadow(ctx, TX + 8, FL + 1, 215, 10, 0.95, '#050305');
  // ——— the fan: plates, shield rims, spear heads, the great helm
  SHARDS.forEach((pts, i) => shard(ctx, r, pts, i));
  for (let i = 0; i < RIMS.length; i++) shieldRim(ctx, r, i);
  for (let i = 0; i < SPEARS.length; i++) spear(ctx, r, i);
  greatHelm(ctx, r);
  // ——— the seat-back: a jagged mass of fused plate, the hollow he leans in, a crest up the middle
  castShadow(ctx, polyPath(BACK), 14, 16, 0.6, '#060406');
  iron(ctx, r, BACK, { base: '#38342f', dents: 6, rust: 0.35, key: 0.22, dark: 0.35 });
  const bb = boxOf(BACK);
  within(ctx, polyPath(BACK), () => {
    // the plates it was forged from: seams welded up from the hollow to the notches between the spikes
    for (const i of [3, 5, 9, 11, 13]) {
      const q = BACK[i];
      const p = PANEL.reduce((m, c) => (Math.hypot(c[0] - q[0], c[1] - q[1]) < Math.hypot(m[0] - q[0], m[1] - q[1]) ? c : m));
      weld(ctx, r, [p, [(q[0] + p[0]) / 2 + (r() - 0.5) * 8, (q[1] + p[1]) / 2], q], 3.4);
    }
    rust(ctx, bb, 0.3, 17);
    grime(ctx, bb, { top: 30, bottom: 50, left: 16, right: 16, a: 0.55, seed: 55, col: '#0a0808' });
  });
  // the hollow: dished, so its left wall is in shade and its right one lit; his back has polished its middle
  const pp = polyPath(PANEL);
  const pb = boxOf(PANEL);
  aoHalo(ctx, pp, 10, 0.5, '#060406');
  iron(ctx, r, PANEL, { base: '#34302d', dents: 4, rust: 0.2, key: 0.1, dark: 0.3, line: 2 });
  within(ctx, pp, () => {
    const g = ctx.createLinearGradient(pb.x, 0, pb.x + pb.w, 0);
    g.addColorStop(0, 'rgba(6,4,8,0.55)');
    g.addColorStop(0.3, 'rgba(6,4,8,0.08)');
    g.addColorStop(0.8, 'rgba(255,220,180,0.04)');
    g.addColorStop(1, rgba('#ffd8b0', 0.12));
    ctx.fillStyle = g;
    ctx.fillRect(pb.x, pb.y, pb.w, pb.h);
    scales(ctx, r, pb);
    // polished where his back has worn it: the steel shows through, cold, with the fires' warmth in it
    const sh = ctx.createRadialGradient(TX - 8, 470, 6, TX, 474, 70);
    sh.addColorStop(0, rgba('#c8ccd8', 0.2));
    sh.addColorStop(0.5, rgba('#9aa4c0', 0.08));
    sh.addColorStop(1, 'rgba(154,164,192,0)');
    ctx.fillStyle = sh;
    ctx.fillRect(TX - 90, 400, 180, 140);
    // soot settled in the top of the hollow, under the crest
    vfill(ctx, pb.x, pb.y, pb.w, 50, [[0, 'rgba(6,4,6,0.5)'], [1, 'rgba(6,4,6,0)']]);
  });
  streaks(ctx, r, pb.x + 10, pb.y + 40, pb.w - 20, 120, '#5a2a14', 0.14, 6);
  rivets(ctx, alongLine(PANEL.slice(0, 2), 26, -9).concat(alongLine(PANEL.slice(-2), 26, -9)), 2.4, 0.9);
  // the crest: a greave hammered flat and stood on end, its ridge lit
  iron(ctx, r, SPINE, { base: '#46413c', dents: 2, rust: 0.3, key: 0.3, dark: 0.2 });
  groove(ctx, [TX - 1, 392], [TX - 1, 292], 1.6, [-1.2, 0]);
  rivets(ctx, [[TX, 316], [TX, 346], [TX, 376]], 2.6, 1);
  crackOn(ctx, r, TX + 10, 330, 1.9, 22);
  // ——— the arms: a plate back to the seat-back, an armoured leg at each corner
  for (const pts of ARMS) {
    castShadow(ctx, polyPath(pts), 8, 10, 0.55, '#060406');
    iron(ctx, r, pts, { base: '#3e3a36', dents: 1, rust: 0.3, key: 0.3 });
    const b = boxOf(pts);
    // its top edge polished by his hands
    edgeGlint(ctx, pts, [b.x + b.w / 2, b.y - 200], '#c8ccd8', 0.25, 2, 0, 0.5);
    rivets(ctx, [[b.x + b.w * 0.5, b.y + b.h * 0.55]], 2.2, 0.9);
  }
  POST_X.forEach((px, i) => {
    const s = i ? 1 : -1;
    const gp = GREAVES[i];
    castShadow(ctx, polyPath(gp), 10, 12, 0.6, '#060406');
    iron(ctx, r, gp, { base: '#423e3a', dents: 3, rust: 0.4, key: 0.28 });
    within(ctx, polyPath(gp), () => {
      // the shin's ridge, lit on its left, and the straps that held it
      groove(ctx, [px - 2, 478], [px - 1, FL - 22], 1.8, [-1.2, 0]);
      const rg = ctx.createLinearGradient(px - 21, 0, px + 21, 0);
      rg.addColorStop(0, rgba('#ffd8b0', 0.08));
      rg.addColorStop(0.45, 'rgba(0,0,0,0)');
      rg.addColorStop(1, 'rgba(6,4,8,0.45)');
      ctx.fillStyle = rg;
      ctx.fillRect(px - 22, 470, 44, FL - 470);
      for (const yy of [520, 588]) {
        ctx.fillStyle = 'rgba(14,10,10,0.85)';
        ctx.fillRect(px - 24, yy, 48, 7);
        ctx.fillStyle = rgba('#d8c8b0', 0.12);
        ctx.fillRect(px - 24, yy, 48, 1.4);
      }
      grime(ctx, boxOf(gp), { bottom: 40, a: 0.55, seed: 57 + i, col: '#0a0808' });
    });
    rivets(ctx, [[px - 14, 523], [px + 14, 523], [px - 12, 591], [px + 12, 591]], 2.1, 0.95);
    // its sabaton on the tread, toe turned out
    groundShadow(ctx, px + s * 30, FL + 1, 44, 4, 0.75, '#060406');
    paintSabaton(ctx, r, FEET[i]);
    // the knee cop: a wing on its outer side, a domed cap catching the light
    iron(ctx, r, WINGS[i], { base: '#3e3a36', dents: 1, rust: 0.35, key: 0.26 });
    const w = WINGS[i];
    groove(ctx, w[0], w[3], 1.4);
    castShadow(ctx, polyPath(POLEYNS[i]), 6, 8, 0.55, '#060406');
    iron(ctx, r, POLEYNS[i], { base: '#4c4844', dents: 1, rust: 0.15, key: 0.35, dark: 0.15 });
    // (worn bright where his hands grip it)
    lightPool(ctx, px - 6, 462, 13, 6, '#d8dce8', 0.22);
    rivets(ctx, [[px + s * 16, 469]], 2.4, 1);
  });
  // ——— the heap under the seat: beaten sabatons fused into a block, deep in the seat's shadow
  castShadow(ctx, polyPath(HEAP), 8, 10, 0.55, '#060406');
  iron(ctx, r, HEAP, { base: '#2e2a28', dents: 3, rust: 0.3, key: 0.12, dark: 0.5 });
  within(ctx, polyPath(HEAP), () => vfill(ctx, TX - 140, SEAT + 10, 280, 50, [[0, 'rgba(4,3,6,0.7)'], [1, 'rgba(4,3,6,0)']]));
  // a greave lying crossways under the lip, then the boots
  castShadow(ctx, polyPath(HEAP_GREAVE), 6, 8, 0.6, '#060406');
  iron(ctx, r, HEAP_GREAVE, { base: '#4c4a48', dents: 3, rust: 0.35, key: 0.45, dark: 0.15 });
  rivets(ctx, [[TX - 104, SEAT + 28], [TX + 46, SEAT + 27]], 2, 0.9);
  groove(ctx, [TX - 100, SEAT + 27], [TX + 40, SEAT + 25], 1.6);
  HEAP_BOOTS.forEach((b, i) => paintSabaton(ctx, r, b, { dark: i ? 0.4 : 0.6, base: '#3a3938', key: i ? 0.24 : 0.12 }));
  // all of it deep under the seat: the lip's shadow over the top of the heap, the boots sunk in it
  within(ctx, polyPath(HEAP), () => vfill(ctx, TX - 140, SEAT + 10, 280, FL - SEAT - 10, [[0, 'rgba(4,3,6,0.6)'], [0.45, 'rgba(4,3,6,0.25)'], [1, 'rgba(4,3,6,0.4)']]));
  weld(ctx, r, [[TX - 126, SEAT + 40], [TX - 124, FL - 48]], 3.2);
  weld(ctx, r, [[TX + 126, SEAT + 44], [TX + 128, FL - 44]], 3.2);
  // ——— the seat: its top worn bright up the middle where he sits; the lip riveted, lumpy from the hammer
  castShadow(ctx, polyPath(LIP), 6, 8, 0.6, '#060406');
  iron(ctx, r, LIP, { base: '#3e3a36', dents: 4, rust: 0.4, key: 0.3, dark: 0.3 });
  within(ctx, polyPath(LIP), () => grime(ctx, boxOf(LIP), { bottom: 10, a: 0.5, seed: 59, col: '#0a0808' }));
  rivets(ctx, alongLine([[TX - SEAT_HW + 10, SEAT + 9], [TX + SEAT_HW - 10, SEAT + 9]], 30), 2.4, 1);
  iron(ctx, r, SEAT_TOP, { base: '#4a4642', dents: 3, rust: 0.15, key: 0.35, dark: 0.1 });
  within(ctx, polyPath(SEAT_TOP), () => {
    vfill(ctx, TX - SEAT_HW, SEAT - 16, SEAT_HW * 2, 16, [[0, 'rgba(6,4,6,0.55)'], [1, 'rgba(6,4,6,0)']]);
    lightPool(ctx, TX - 8, SEAT - 6, 80, 7, '#c8d0e0', 0.22);
    lightPool(ctx, TX + 4, SEAT - 4, 40, 3, '#f4f0ff', 0.16);
    lightPool(ctx, TX - 30, SEAT - 3, 50, 4, '#ffb070', 0.14);
  });
  // the edge where seat meets back: soot thick in it
  crevice(ctx, TX - SEAT_BACK, TX + SEAT_BACK, SEAT - 16, 10, 0.6, '#060406');
  // ——— contact: where it bears on the tread
  crevice(ctx, TX - 190, TX + 190, FL + 1, -14, 0.6, '#060406');
  // the hall's warmth reaches only its outer edges; the middle stays in the dark between the fires
  ctx.save();
  ctx.translate(TX, 420);
  ctx.scale(1, 1.6);
  const mg = ctx.createRadialGradient(0, 0, 30, 0, 0, 170);
  mg.addColorStop(0, 'rgba(8,6,10,0.18)');
  mg.addColorStop(1, 'rgba(8,6,10,0)');
  ctx.fillStyle = mg;
  ctx.fillRect(-180, -180, 360, 360);
  ctx.restore();
}

/** One fire's light caught along the throne's edges, the parts in front hiding it on the parts behind (painted on its
 * own canvas, then laid on: the still has both fires; live, each is a layer that flickers with its fire). */
function throneLight(ctx: Ctx, fi: number, k: number, add: boolean): void {
  const f = FIRE_AT[fi];
  const b = GLINT_BOX;
  const [c, g] = makeCanvas(b.w, b.h);
  g.translate(-b.x, -b.y);
  for (const pts of LIT_ORDER) {
    g.save();
    g.globalCompositeOperation = 'destination-out';
    polyPath(pts)(g);
    g.fill();
    g.restore();
    // (fainter the further the edge is from the fire)
    const [cx, cy] = pts[0];
    const fall = clamp01(1.25 - Math.hypot(cx - f[0], cy - f[1]) / 1000);
    edgeGlint(g, pts, f, '#ffb468', 0.5 * k * fall, 1.4, 0.14, 0.45);
  }
  // the warm cast over the near side of the mass
  const near = fi ? 1 : -1;
  lightPool(g, TX + near * 140, 470, 110, 200, '#ff9a48', 0.06 * k);
  ctx.save();
  if (add) ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(c, b.x, b.y);
  ctx.restore();
}

const THRONE_BOX: Box = { x: TX - STEPS[2].hw - 30, y: 170, w: (STEPS[2].hw + 30) * 2, h: TY + 4 - 170 };
const GLINT_BOX: Box = { x: TX - 250, y: 180, w: 500, h: FL + 12 - 180 };
const HELM_BOX: Box = (() => {
  const b = boxOf(HELM_R_PTS, 6);
  return { x: b.x - 4, y: b.y - 4, w: b.w + 26, h: b.h + 28 };
})();
const PLATE_BOX: Box = (() => {
  const b = boxOf(LOOSE_PTS, 6);
  return { x: b.x - 4, y: b.y - 4, w: b.w + 20, h: b.h + 20 };
})();

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
    { id: 'throne', box: THRONE_BOX, draw: throne },
    // the fires' light on the throne's iron (each flickers with its fire), then its loose pieces (they rattle at a stomp)
    { id: 'thrFire', box: GLINT_BOX, stillOnly: true, draw: (c) => FIRE_AT.forEach((_, i) => throneLight(c, i, 0.9, true)) },
    { id: 'thrFireL', box: GLINT_BOX, liveOnly: true, draw: (c) => throneLight(c, 0, 1, false) },
    { id: 'thrFireR', box: GLINT_BOX, liveOnly: true, draw: (c) => throneLight(c, 1, 1, false) },
    { id: 'thrHelm', box: HELM_BOX, motion: 'sprite', draw: kettleHat },
    { id: 'thrPlate', box: PLATE_BOX, motion: 'sprite', draw: loosePlate },
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
      light: 1,
      sq: new Spring(0, 30, 5),
      rate: new Rate(),
    };
  });
  const embers = new Parts(k, { frame: 'ember', add: true, into: hall, max: 110 });
  const lumps = new Parts(k, { frame: 'ember', sheet: { key: lumpKey, n: 4, half: 10 }, into: hall, max: 16 });
  const dust = new Parts(k, { frame: 'mote', into: hall, max: 80 });
  // the hall's light dipping when the fires are knocked down
  const dip = k.wash(0x5a4038, 0, Phaser.BlendModes.MULTIPLY, top);

  // ——— the throne: each fire's light on its iron flickering with the fire; a loose plate swinging on its last
  // rivet and a helm rattling on its spear at a stomp, rust and soot shaken out of the seams
  const thrFire = ['thrFireL', 'thrFireR'].map((id) => k.sprite(id).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.9));
  const plate = k.pivot(k.sprite('thrPlate'), LOOSE[0], LOOSE[1]);
  const helm = k.pivot(k.sprite('thrHelm'), HELM_R.c[0], HELM_R.c[1]);
  const helmY0 = helm.y;
  const plateS = new Spring(0, 38, 1.3);
  const helmS = new Spring(0, 520, 10);
  const helmH = new Spring(0, 420, 12);
  const flakes = new Parts(k, { frame: 'mote', into: hall, max: 70 });

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
      // the throne: the loose plate swings, the helm jumps and rattles on its spear, rust and soot sift down
      const q = p * calm();
      plateS.v += (x < LOOSE[0] ? 1 : -1) * (1.4 + crand() * 0.6) * q;
      helmS.v += (crand() < 0.5 ? -1 : 1) * (3 + crand() * 2) * q;
      helmH.v -= (180 + crand() * 60) * q;
      for (let i = 0; i < 10 + q * 30; i++) {
        const [sx, sy] = SHAKE[Math.floor(crand() * SHAKE.length)];
        const soot = crand() < 0.45;
        flakes.spawn({ x: sx + (crand() - 0.5) * 24, y: sy + (crand() - 0.5) * 8, vx: (crand() - 0.5) * 24, vy: 6 + crand() * 30, life: 1.6 + crand() * 1.2, r0: soot ? 2.4 + crand() * 2.6 : 1.6 + crand() * 2, a: soot ? 0.6 : 0.85, tint: soot ? 0x2a2422 : 0xc0703a, grav: soot ? 50 : 180 + crand() * 140, drag: soot ? 1.4 : 0.5, floor: FL + crand() * 6, fade: 0.12 });
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
        f.light = light;
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
      fires.forEach((f, i) => thrFire[i].setAlpha(clamp(0.9 * f.light, 0, 1)));
      plate.setRotation(plateS.step(0, dt));
      helm.setRotation(helmS.step(0, dt));
      helm.y = helmY0 + Math.min(0, helmH.step(0, dt));
      flakes.update(dt);
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

