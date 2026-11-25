// The God-King's Pavilion (the arena of XERXES, the boss of King Leonidas's Hot Gates nemesis stage, wave 85), redrawn
// with the location kit (src/art/scene). Of a piece with the Hot Gates and the Goat Path (scene-hotgates.ts,
// scene-immortalbrute.ts): the same coastal plain at Thermopylae, the same limestone massif over the pass, the host's
// own standards (gilt sun discs, crimson, purple and saffron cloths), and a captured bronze shield of the Greeks; but
// at a red-gold dusk, behind the host, in the Great King's travelling war pavilion. Ancient Persia in spirit, not a
// film: every emblem here is our own (the winged disc, the lions and the archers on the glazed bricks, the banners),
// and Xerxes is our own Feetza character.
//
// We stand inside the pavilion, at its open front, and look down its length. The roof is a tent of dyed cloth, panels
// of crimson and saffron piped with lapis, carried on carved and gilded poles; the door flaps, heavy woven wool banded
// like a kilim, are folded back and lashed to the near poles with rope; the roof cloth comes down over the front beam, its
// hem cut into pointed tabs. Its side walls are rolled up under the eaves, so
// through the open sides we see out: on the left the sun going down red over the gulf, its last light coming in long
// across the floor; on the right the cliffs of the pass catching the last of it; and between, the host's camp on the
// plain, tents and standards and the first campfires. At the far end, against hangings of lapis cloth and a dado of
// glazed bricks (gold archers on turquoise), the throne stands on a stepped dais faced with glazed lions, under a great
// golden parasol lined with lapis; flabella on stands either side of it; the empire's banners hanging from the back beam. The back
// poles end in twin-bull capitals. Persian carpets lie layered on the floor; tribute is heaped before the dais
// (chests, one open and spilling coin, amphorae, gold vessels and ingots, ivory, bales and rolls of dyed cloth, the
// captured shield); two incense
// burners smoke at the dais corners and two cast-bronze braziers (deep bowls with a band of
// rosettes, on fluted pedestals with stepped bases) burn at the sides. The table is the pavilion's floor
// of pale polished stone, the edge of the great carpet lying over its back, a gilded step along its front: low in
// contrast, so the pizzas read. The space above the lanes and the table's back edge stay darker and calm, so the
// volleys, the rhino and the elephants read against them.
//
// An arena, not a location: no waves. It answers the fight (the xerxes brain, src/game/bosses/leonidas.ts):
// - 'xerxes-volley' (MY ARROWS WILL BLOT OUT THE SUN!): clouds of arrows sweep across the sky through the open sides,
//   the sun is blotted out and the pavilion goes dark but for its fires, which lean and gutter in the gust;
// - 'xerxes-rhino' (power: the rhino pawing 0.35, its charge 1): the ground shakes: dust sifts from the roof, the
//   parasol and the valance shudder, the tribute jingles and a coin rolls, the braziers throw sparks;
// - 'xerxes-elephants' (BRING THE ELEPHANTS!): four heavy footfalls, each one shaking the pavilion harder;
// - 'xerxes-bribe' (KNEEL, AND YOU MAY KEEP YOUR PIZZA. / I AM GENEROUS.): gold glints run over the throne, the
//   parasol and the tribute, coins spill from the open chest and roll, a warm light swells on the throne.
// On the stages page it plays those cues itself.
//
// Live, the heroes:
// - the braziers' fires: painted at 8 phases (tongues licking, splitting, a loose tongue pinching off), their glow
//   breathing on the floor, the poles and the hangings, sparks and embers with physics, a heat haze of smoke;
// - the cloth: the empire's banners rippling on the back beam (painted cloth frames), the door flaps and the valance
//   breathing in the wind off the plain, the outside standards streaming;
// - the incense: painted smoke curling up from the two burners, lit by the sun on one side and the fire on the other.
// Also: the flabella swaying on their stands, dust turning in the sun's long beam, the camp's smoke rising outside,
// the parasol and the gold vessels on the heap rocking on springs.
// Stomps: the tribute jingles (the vessels rock, a coin rolls off the heap and wobbles down flat), the parasol and the
// valance shudder, sparks jump from the braziers, dust sifts from the roof.

import Phaser from 'phaser';
import { type Air, type Ctx, type R, TY, W, airMix, calmLanes, castShadow, crevice, groundShadow, lightPool, polyPath, rim, vfill, vignetteAll, within } from '../../art/scene/kit';
import type { SceneSpec } from '../../art/scene/layers';
import { tableFalloff, tableSeam } from '../../art/scene/materials';
import { crack, drift, lay, softly, surface } from '../../art/scene/paint';
import { drape } from '../../art/scene/props';
import { cloud, skyFill, sun } from '../../art/scene/sky';
import { ZB, xAt, yAt, zFront } from '../../art/sceneKit';
import { hashStr, makeCanvas, rgba, rng, shade } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { Loop, Parts, Rate, Spring, Swing, sheet, steamFrame } from '../../game/sceneAnim';
import { type KitLive, calm, flicker, registerKitScene } from '../../game/sceneLive';
import { clothFrame } from './sceneBits';
import { BRONZE } from './scene-labyrinth';
import { VOL, bannerCloth, figure, standard, volleyFrame } from './scene-hotgates';

type Pt = [number, number];
type Box = { x: number; y: number; w: number; h: number };
type PathFn = (c: Ctx) => void;
const P2 = Math.PI * 2;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const ease = (t: number) => t * t * (3 - 2 * t);
const mixHex = (a: string, b: string, t: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * clamp01(t)).toString(16).padStart(2, '0')).join('');
};
const boxOfPts = (pts: Pt[], pad = 4): Box => {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x = Math.floor(Math.min(...xs) - pad);
  const y = Math.floor(Math.min(...ys) - pad);
  return { x, y, w: Math.ceil(Math.max(...xs) + pad) - x, h: Math.ceil(Math.max(...ys) + pad) - y };
};
/** A closed path through points, its corners rounded (midpoint quadratics). */
function smoothPath(pts: Pt[]): PathFn {
  return (c) => {
    c.beginPath();
    const n = pts.length;
    const m = (i: number): Pt => [(pts[i % n][0] + pts[(i + 1) % n][0]) / 2, (pts[i % n][1] + pts[(i + 1) % n][1]) / 2];
    c.moveTo(...m(0));
    for (let i = 1; i <= n; i++) c.quadraticCurveTo(pts[i % n][0], pts[i % n][1], ...m(i));
    c.closePath();
  };
}
const ellP = (x: number, y: number, rx: number, ry: number, rot = 0): PathFn => (c) => {
  c.beginPath();
  c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, P2);
};
const rectP = (x: number, y: number, w: number, h: number): PathFn => (c) => {
  c.beginPath();
  c.rect(x, y, w, h);
};

// ——— the pavilion's space ———
//
// One perspective for the pavilion: the eye at VPY (the outside's horizon too), the floor one unit below it, the back
// wall at depth 1. A point X units across, at depth Z, H units above the floor, is at FP(X, Z, H).

const VPX = 960;
const VPY = 430;
const FP = (X: number, Z: number, H = 0): Pt => [VPX + (X * 150) / Z, VPY + ((1 - H) * 150) / Z];
/** The pavilion's half width, the height of its eaves, the near poles' depth. */
const HALF = 2.36;
const EAVE = 2.19;
/** The floor line along the open side (where the pavilion's floor meets the ground outside), and the eave over it. */
const floorL = (x: number) => VPY + (VPX - x) * (150 / (HALF * 150));
const eaveL = (x: number) => VPY - (VPX - x) * ((EAVE - 1) / HALF);
const eaveR = (x: number) => eaveL(W - x);

export const XX = {
  /** Poles: the near ones (x, half width) and the back ones. */
  nearL: 150, nearR: W - 150, nearW: 33,
  backL: 606, backR: W - 606, backW: 19,
  /** The back wall: its foot and the back beam. */
  wallFoot: 580, beam: 252,
  throne: { x: 960, seat: 470, top: 336 },
  /** The braziers: where each stands on the floor, and its bowl's rim. */
  braziers: [{ x: 420, y: 682, rim: 532 }, { x: W - 420, y: 682, rim: 532 }],
  /** The incense burners: foot and the mouth the smoke rises from. */
  incense: [{ x: 640, y: 618, top: 520 }, { x: W - 640, y: 618, top: 520 }],
  /** The banners on the back beam: x and length. */
  banners: [{ x: 692, kind: 0 }, { x: W - 692, kind: 2 }],
  /** The fans on their stands: foot (on the dais) and the fan's centre. */
  fans: [{ x: 778, y: 580, hy: 352 }, { x: W - 778, y: 580, hy: 352 }],
  /** The open chest on the heap (coins spill from it) and the sun. */
  chest: [1196, 616] as Pt,
  sun: [318, 414] as Pt,
  front: 1040,
};

/** The open sides: their inner edges between the poles. */
const OPEN = { l0: XX.nearL + XX.nearW, l1: XX.backL - XX.backW, r0: XX.backR + XX.backW, r1: XX.nearR - XX.nearW };

// ——— palette and air ———

/** Outside: the sunset's haze. */
const AIR_OUT: Air = { color: '#c86a5a', far: 0.6 };
const CRIMSON = { lit: '#c83a3a', body: '#8a1a26', shade: '#4a0a18', deep: '#220610' };
const SAFFRON = { lit: '#f0b04c', body: '#c8821e', shade: '#7a4412', deep: '#3a1e08' };
const LAPIS = { lit: '#4c6cc8', body: '#243a7e', shade: '#141e48', deep: '#0a0e24' };
const TURQ = { lit: '#7adcd0', body: '#2c9c98', shade: '#165a5c', deep: '#0a2a2e' };
const GOLD = { hi: '#fff2b8', lit: '#f2c454', body: '#c08a28', shade: '#6a4212', deep: '#2e1806' };
const GILT = GOLD;
/** Cast bronze (the braziers): darker and browner than the gilding. */
const BRZ = { hi: '#ffd8a0', lit: '#e0a060', body: '#9a5e2a', shade: '#4e2c14', deep: '#1e0e06' };
const FIRE = '#ff8a2a';
const SUNC = '#ff9a50';

/** Gold leaf over a form: a ramp across it (lit from the left, warm), a hot streak, the far side deep, one outline.
 * dir: 'v' a vertical pole (ramp across x), 'h' a horizontal beam (ramp down y), 'r' a round thing. */
function gilt(ctx: Ctx, path: PathFn, box: Box, o: { dir?: 'v' | 'h' | 'r'; lit?: number; line?: number; dim?: number; warm?: number; pal?: typeof GOLD } = {}): void {
  const dir = o.dir ?? 'v';
  const lit = o.lit ?? 1;
  const dim = o.dim ?? 0;
  const GOLD = o.pal ?? GILT;
  const g = dir === 'h' ? ctx.createLinearGradient(0, box.y, 0, box.y + box.h) : dir === 'v' ? ctx.createLinearGradient(box.x, 0, box.x + box.w, 0) : ctx.createRadialGradient(box.x + box.w * 0.32, box.y + box.h * 0.3, 0, box.x + box.w * 0.5, box.y + box.h * 0.5, Math.max(box.w, box.h) * 0.62);
  const c = (col: string) => mixHex(col, GOLD.deep, dim);
  g.addColorStop(0, c(GOLD.shade));
  g.addColorStop(0.14, c(GOLD.body));
  g.addColorStop(0.3, c(mixHex(GOLD.body, GOLD.hi, 0.55 * lit)));
  g.addColorStop(0.42, c(GOLD.lit));
  g.addColorStop(0.7, c(GOLD.body));
  g.addColorStop(0.9, c(GOLD.shade));
  g.addColorStop(1, c(GOLD.deep));
  if (dir === 'r') {
    g.addColorStop(0, c(GOLD.hi));
  }
  ctx.save();
  path(ctx);
  ctx.fillStyle = g;
  ctx.fill();
  if (o.warm) {
    ctx.clip();
    ctx.fillStyle = rgba(FIRE, o.warm);
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillRect(box.x, box.y, box.w, box.h);
  }
  ctx.restore();
  if (o.line !== 0) {
    path(ctx);
    ctx.strokeStyle = rgba(GOLD.deep, 0.85);
    ctx.lineWidth = o.line ?? 1.6;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

/** The low sun from the left on a form: warm on its left flank, turning to cool shade on its right. */
function sunSide(ctx: Ctx, path: PathFn, box: Box, a = 0.3): void {
  within(ctx, path, () => {
    const g = ctx.createLinearGradient(box.x, 0, box.x + box.w, 0);
    g.addColorStop(0, `rgba(255,168,96,${a})`);
    g.addColorStop(0.3, 'rgba(255,168,96,0)');
    g.addColorStop(0.65, 'rgba(30,20,60,0)');
    g.addColorStop(1, `rgba(30,20,60,${a})`);
    ctx.fillStyle = g;
    ctx.fillRect(box.x, box.y, box.w, box.h);
  });
}

/** Our winged disc:a sun disc ringed with rays, three tiers of wing swept up either side, a fanned tail below.
 * Centred at (x, y), s its half span. Painted in gold (or flat in `col` for embroidery and glaze). */
function wingedDisc(ctx: Ctx, x: number, y: number, s: number, o: { col?: string; disc?: string; line?: string; lw?: number; a?: number } = {}): void {
  ctx.save();
  ctx.globalAlpha = o.a ?? 1;
  const col = o.col;
  const line = o.line ?? GOLD.deep;
  const lw = o.lw ?? Math.max(0.8, s * 0.03);
  ctx.lineJoin = 'round';
  // the wings: three feathered tiers, the upper the longest, their tips curling up
  for (const sd of [-1, 1]) {
    for (let t = 0; t < 3; t++) {
      const y0 = y - s * 0.06 + t * s * 0.1;
      const len = s * (0.98 - t * 0.2);
      ctx.beginPath();
      ctx.moveTo(x + sd * s * 0.2, y0 - s * 0.04);
      ctx.bezierCurveTo(x + sd * len * 0.5, y0 - s * (0.16 - t * 0.04), x + sd * len * 0.85, y0 - s * (0.2 - t * 0.05), x + sd * len, y0 - s * (0.3 - t * 0.08));
      ctx.lineTo(x + sd * len * 0.92, y0 + s * 0.02);
      // the feather ends
      const n = 5 - t;
      for (let i = n; i >= 0; i--) {
        const u = i / n;
        const fx = x + sd * (s * 0.2 + (len * 0.92 - s * 0.2) * u);
        ctx.lineTo(fx, y0 + s * (0.1 - t * 0.01) * (1 - u * 0.3) + (i % 2 ? s * 0.025 : 0));
      }
      ctx.closePath();
      if (col) {
        ctx.fillStyle = col;
      } else {
        const g = ctx.createLinearGradient(0, y0 - s * 0.3, 0, y0 + s * 0.1);
        g.addColorStop(0, t === 0 ? GOLD.hi : GOLD.lit);
        g.addColorStop(0.5, GOLD.body);
        g.addColorStop(1, GOLD.shade);
        ctx.fillStyle = g;
      }
      ctx.fill();
      ctx.strokeStyle = line;
      ctx.lineWidth = lw;
      ctx.stroke();
    }
  }
  // the tail: a fan of five feathers
  ctx.beginPath();
  ctx.moveTo(x - s * 0.12, y + s * 0.14);
  for (let i = 0; i <= 5; i++) {
    const a = Math.PI * (0.32 + (i / 5) * 0.36);
    ctx.lineTo(x - Math.cos(a) * s * 0.3, y + s * 0.14 + Math.sin(a) * s * 0.26);
  }
  ctx.lineTo(x + s * 0.12, y + s * 0.14);
  ctx.closePath();
  ctx.fillStyle = col ?? GOLD.body;
  ctx.fill();
  ctx.strokeStyle = line;
  ctx.lineWidth = lw;
  ctx.stroke();
  // the disc and its ring of rays
  const dr = s * 0.2;
  ctx.beginPath();
  ctx.arc(x, y, dr * 1.25, 0, P2);
  ctx.fillStyle = col ?? GOLD.shade;
  ctx.fill();
  ctx.strokeStyle = line;
  ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * P2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * dr * 1.02, y + Math.sin(a) * dr * 1.02);
    ctx.lineTo(x + Math.cos(a) * dr * 1.22, y + Math.sin(a) * dr * 1.22);
    ctx.strokeStyle = col ? line : GOLD.lit;
    ctx.lineWidth = lw * 0.9;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(x, y, dr, 0, P2);
  if (col) ctx.fillStyle = o.disc ?? col;
  else {
    const g = ctx.createRadialGradient(x - dr * 0.35, y - dr * 0.35, 0, x, y, dr);
    g.addColorStop(0, o.disc ? shade(o.disc, 0.35) : GOLD.hi);
    g.addColorStop(1, o.disc ?? GOLD.body);
    ctx.fillStyle = g;
  }
  ctx.fill();
  ctx.strokeStyle = line;
  ctx.lineWidth = lw;
  ctx.stroke();
  ctx.restore();
}

/** A small rosette (glaze, embroidery): petals round a boss. */
function rosette(ctx: Ctx, x: number, y: number, rad: number, petal: string, boss: string, n = 8): void {
  ctx.fillStyle = petal;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * P2;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * rad * 0.55, y + Math.sin(a) * rad * 0.55, rad * 0.42, rad * 0.2, a, 0, P2);
    ctx.fill();
  }
  ctx.fillStyle = boss;
  ctx.beginPath();
  ctx.arc(x, y, rad * 0.28, 0, P2);
  ctx.fill();
}

// ——— outside: the plain at dusk through the open sides ———

const HZ = VPY;
/** The two openings (the outside seen between the poles, under the eaves, over the floor line). */
const openL: Pt[] = [[OPEN.l0, eaveL(OPEN.l0)], [OPEN.l1, eaveL(OPEN.l1)], [OPEN.l1, floorL(OPEN.l1)], [OPEN.l0, floorL(OPEN.l0)]];
const openR: Pt[] = openL.map(([x, y]) => [W - x, y] as Pt).reverse();
const openings = (c: Ctx) => {
  c.beginPath();
  for (const poly of [openL, openR]) {
    c.moveTo(...poly[0]);
    for (const p of poly.slice(1)) c.lineTo(...p);
    c.closePath();
  }
};
export const OUT_BOX: Box = { x: OPEN.l0 - 2, y: 0, w: OPEN.r1 - OPEN.l0 + 4, h: 772 };

/** The cliffs of the pass (on the right, through the right opening): their skyline. */
const CLIFF: Pt[] = (() => {
  // a broken skyline: the massif climbing to the right in buttresses and notches, a few overhanging lips
  const rr = rng(hashStr('xx:cliff'));
  const pts: Pt[] = [[1318, HZ + 2], [1326, 412]];
  let x = 1326;
  while (x < 1740) {
    const u = (x - 1318) / 432;
    const base = 412 - u * 360 - Math.sin(u * 7) * 18;
    x += 8 + rr() * 22;
    const y = base + (rr() - 0.5) * 26;
    pts.push([Math.min(1750, x), y]);
    if (rr() < 0.25) pts.push([Math.min(1750, x + 2 + rr() * 4), y - 8 - rr() * 16]);
  }
  pts.push([1750, 30], [1750, HZ + 2]);
  return pts;
})();

function sky(ctx: Ctx, r: R): void {
  within(ctx, openings, () => {
    const b: Box = { x: OUT_BOX.x, y: 0, w: OUT_BOX.w, h: HZ + 6 };
    skyFill(ctx, b, [[0, '#2a1838'], [0.3, '#5a2242'], [0.58, '#a8302a'], [0.82, '#e8642a'], [1, '#ffb050']], 0.04);
    // the glow along the horizon, strongest under the sun
    const [sx, sy] = XX.sun;
    const g = ctx.createRadialGradient(sx, HZ, 0, sx, HZ, 1100);
    g.addColorStop(0, 'rgba(255,170,90,0.7)');
    g.addColorStop(0.4, 'rgba(255,120,60,0.25)');
    g.addColorStop(1, 'rgba(255,120,60,0)');
    ctx.save();
    ctx.translate(0, HZ);
    ctx.scale(1, 0.3);
    ctx.translate(0, -HZ);
    ctx.fillStyle = g;
    ctx.fillRect(b.x, HZ - 1100, b.w, 1200);
    ctx.restore();
    sun(ctx, sx, sy, 30, { disc: '#ffe0b0', glow: '#ff6a2a', a: 0.85, bloom: 9, squash: 0.55, clipY: HZ - 3 });
    // long bars of cloud lit from beneath
    const cl = { lit: '#ffa060', body: '#7a2a40', shadow: '#2e1430', sunX: sx, sunY: sy, kind: 'stratus' as const, rim: 0.7, air: AIR_OUT, res: 0.4 };
    for (const [x, y, w, h] of [[300, 150, 300, 24], [470, 270, 260, 16], [250, 330, 180, 10], [1450, 120, 360, 30], [1600, 250, 220, 14], [1380, 300, 160, 10]] as [number, number, number, number][]) {
      cloud(ctx, r, x, y, w, h, { ...cl, depth: Math.min(0.8, y / 420) });
    }
  });
}

function plain(ctx: Ctx, r: R): void {
  within(ctx, openings, () => {
    // the gulf on the left: the far shore's hills low against the sun, the sea a bright band under them
    ctx.fillStyle = '#d87a58';
    ctx.fillRect(OPEN.l0, HZ - 4, OPEN.l1 - OPEN.l0, 16);
    const road = ctx.createLinearGradient(XX.sun[0] - 70, 0, XX.sun[0] + 70, 0);
    road.addColorStop(0, 'rgba(255,220,150,0)');
    road.addColorStop(0.5, 'rgba(255,226,160,0.75)');
    road.addColorStop(1, 'rgba(255,220,150,0)');
    ctx.fillStyle = road;
    ctx.fillRect(XX.sun[0] - 70, HZ - 2, 140, 10);
    for (let i = 0; i < 24; i++) {
      ctx.fillStyle = rgba('#fff0c8', 0.3 + r() * 0.4);
      ctx.fillRect(XX.sun[0] - 50 + r() * 100, HZ - 1 + r() * 9, 3 + r() * 10, 1);
    }
    ctx.beginPath();
    ctx.moveTo(OPEN.l0 - 4, HZ + 1);
    const hills: Pt[] = [[OPEN.l0 - 4, HZ - 14], [220, HZ - 22], [262, HZ - 12], [298, HZ - 6], [360, HZ - 9], [420, HZ - 20], [470, HZ - 28], [520, HZ - 16], [OPEN.l1 + 4, HZ - 10]];
    for (const [x, y] of hills) ctx.lineTo(x, y);
    ctx.lineTo(OPEN.l1 + 4, HZ - 3);
    ctx.lineTo(OPEN.l0 - 4, HZ - 3);
    ctx.closePath();
    ctx.fillStyle = airMix('#6a3048', 0.85, AIR_OUT);
    ctx.fill();
    // the cliffs of the pass on the right, lit warm on their faces turned to the sun
    const cliff = polyPath(CLIFF);
    within(ctx, cliff, () => {
      const cb = boxOfPts(CLIFF, 0);
      vfill(ctx, cb.x, cb.y, cb.w, cb.h, [[0, '#8a4a52'], [0.6, '#a85a50'], [1, '#c87a62']]);
      surface(ctx, r, cb, '#a05a52', { over: true, vary: 0.35, cells: 4, mottle: 0.3, strokes: 0.6, strokeAng: 1.4, strokeLen: 80, strokeW: 4, grain: 0.1, seed: 211 });
      // the massif in buttresses: each one's flank turned to the sun lit warm, its front in rosy violet shade, a dark
      // gully between it and the next; the beds of the limestone running across them, scrub on the ledges
      const xs: number[] = [];
      for (let x = 1322; x < 1770; x += 46 + r() * 50) xs.push(x);
      xs.push(1770);
      for (let i = 0; i < xs.length - 1; i++) {
        const x0 = xs[i];
        const x1 = xs[i + 1];
        const w = x1 - x0;
        const t0 = along(CLIFF, x0) - 6;
        const t1 = along(CLIFF, x1) - 6;
        const ar = x0 + w * (0.28 + r() * 0.18);
        const ta = along(CLIFF, ar) - 6;
        const jag = (xa: number, ya: number, k: number): Pt[] => {
          const pts: Pt[] = [];
          for (let y = ya; y < HZ + 4; y += 14 + r() * 16) pts.push([xa + (r() - 0.5) * k + (y - ya) * 0.02, y]);
          pts.push([xa + (r() - 0.5) * k, HZ + 4]);
          return pts;
        };
        const left = jag(x0, t0, 8);
        const arris = jag(ar, ta, 5);
        const right = jag(x1, t1, 8);
        const lit = polyPath([...left, ...[...arris].reverse()]);
        const front = polyPath([...arris, ...[...right].reverse()]);
        within(ctx, lit, () => {
          vfill(ctx, x0 - 10, t0, ar - x0 + 20, HZ - t0, [[0, '#f0a274'], [0.5, '#d88264'], [1, '#c07462']]);
        });
        within(ctx, front, () => {
          vfill(ctx, ar - 10, ta, x1 - ar + 20, HZ - ta, [[0, '#8a4658'], [0.6, '#9a5260'], [1, '#b06a64']]);
          // the warmth of the plain bouncing up into its foot
          vfill(ctx, ar - 10, HZ - 80, x1 - ar + 20, 84, [[0, 'rgba(255,150,100,0)'], [1, 'rgba(255,150,100,0.2)']]);
        });
        // the gully at its left edge
        ctx.strokeStyle = rgba('#3a1430', 0.55);
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        left.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
        // the beds: broken lines across both faces, a pale lip over each dark one
        for (let y = t0 + 18 + r() * 20; y < HZ - 20; y += 22 + r() * 30) {
          const xa = x0 + r() * w * 0.2;
          const xb = x1 - r() * w * 0.3;
          ctx.strokeStyle = rgba('#3a1430', 0.32);
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(xa, y);
          ctx.lineTo(ar, y + 3);
          ctx.lineTo(xb, y - 2 + (r() - 0.5) * 4);
          ctx.stroke();
          ctx.strokeStyle = rgba('#ffc8a0', 0.18);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(xa, y - 1.6);
          ctx.lineTo(ar, y + 1.4);
          ctx.stroke();
          // maquis on the ledge
          if (r() < 0.5) {
            for (let k = 0; k < 4; k++) {
              ctx.fillStyle = rgba(k % 2 ? '#5a4a3a' : '#6a5a40', 0.5);
              ctx.beginPath();
              ctx.ellipse(xa + 6 + r() * Math.max(1, xb - xa - 12), y - 1.5, 2 + r() * 3, 1.2 + r() * 1.2, 0, 0, P2);
              ctx.fill();
            }
          }
        }
      }
      // pines on the crest
      for (let i = 0; i < 7; i++) {
        const x = 1440 + r() * 300;
        const y = along(CLIFF, x) + 2;
        ctx.fillStyle = '#3a2a30';
        ctx.beginPath();
        ctx.moveTo(x - 6, y);
        ctx.lineTo(x, y - 10 - r() * 6);
        ctx.lineTo(x + 6, y);
        ctx.closePath();
        ctx.fill();
      }
      // the haze thickening down to the plain
      vfill(ctx, cb.x, 260, cb.w, HZ - 260, [[0, rgba(AIR_OUT.color, 0)], [1, rgba(AIR_OUT.color, 0.55)]]);
    });
    ctx.strokeStyle = rgba('#ffb888', 0.5);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (const [i, [x, y]] of CLIFF.slice(1, -1).entries()) (i ? ctx.lineTo(x - 1, y + 1) : ctx.moveTo(x - 1, y + 1));
    ctx.stroke();
    // the plain: dusty ground, paler and hazier far off, darker and warmer near
    const pb: Box = { x: OPEN.l0, y: HZ, w: OPEN.r1 - OPEN.l0, h: 772 - HZ };
    ctx.save();
    ctx.beginPath();
    ctx.rect(pb.x, HZ - 1, pb.w, pb.h + 1);
    ctx.clip();
    vfill(ctx, pb.x, HZ - 1, pb.w, pb.h, [[0, '#c27a5a'], [0.1, '#a0604a'], [0.4, '#6e3a34'], [1, '#3a1c1e']]);
    surface(ctx, r, pb, '#7a4438', { over: true, vary: 0.3, cells: 6, mottle: 0.3, strokes: 0.5, strokeAng: 0, strokeLen: 120, strokeW: 3, grain: 0.12, grainKind: 'speckle', seed: 213 });
    // the sun's last light raking across it from the left
    const lg = ctx.createLinearGradient(OPEN.l0, 0, OPEN.l1, 0);
    lg.addColorStop(0, 'rgba(255,150,80,0.22)');
    lg.addColorStop(1, 'rgba(255,150,80,0.04)');
    ctx.fillStyle = lg;
    ctx.fillRect(OPEN.l0, HZ, OPEN.l1 - OPEN.l0, 340);
    ctx.restore();
    camp(ctx, r);
    nearGround(ctx, r);
  });
}
/** The near plain outside the open sides: dusty ground in bands, wheel ruts, stones and tufts of scrub growing larger
 * towards us, the scree fanned out at the cliff's foot. */
function nearGround(ctx: Ctx, r: R): void {
  // scree at the foot of the cliffs, and haze lying over it
  ctx.save();
  ctx.fillStyle = 'rgba(176,120,110,0.55)';
  ctx.beginPath();
  ctx.moveTo(1322, HZ + 4);
  ctx.quadraticCurveTo(1400, HZ - 18, 1470, HZ - 30);
  ctx.quadraticCurveTo(1560, HZ - 14, 1680, HZ + 4);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 60; i++) {
    const x = 1340 + r() * 320;
    const y = HZ - 2 - r() * 20 * Math.sin(((x - 1322) / 360) * Math.PI);
    ctx.fillStyle = rgba(r() < 0.5 ? '#e8b8a0' : '#5a3040', 0.5);
    ctx.fillRect(x, y, 2 + r() * 2, 1.2);
  }
  ctx.restore();
  for (const [x0, x1] of [[OPEN.l0, OPEN.l1], [OPEN.r0, OPEN.r1]] as Pt[]) {
    // bands of dust, closer together far off
    for (let k = 0; k < 26; k++) {
      const u = k / 26;
      const y = HZ + 30 + u * u * 320;
      ctx.fillStyle = rgba(k % 2 ? '#d8946c' : '#3a1a1a', 0.06 + u * 0.05);
      ctx.fillRect(x0, y, x1 - x0, 2 + u * 6);
    }
    // wheel ruts curving away towards the camp
    ctx.strokeStyle = 'rgba(40,16,16,0.3)';
    for (const off of [0, 14]) {
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x0 + (x1 - x0) * 0.3 + off, 772);
      ctx.quadraticCurveTo(x0 + (x1 - x0) * 0.5 + off * 0.6, 560, x0 + (x1 - x0) * 0.62 + off * 0.2, HZ + 40);
      ctx.stroke();
    }
    // stones and tufts, bigger nearer
    for (let i = 0; i < 46; i++) {
      const u = r();
      const y = HZ + 40 + u * u * 320;
      const x = x0 + r() * (x1 - x0);
      const s = 1 + u * u * 6;
      if (r() < 0.45) {
        ctx.fillStyle = 'rgba(30,12,14,0.45)';
        ctx.beginPath();
        ctx.ellipse(x + s * 0.4, y + s * 0.2, s * 1.1, s * 0.35, 0, 0, P2);
        ctx.fill();
        ctx.fillStyle = mixHex('#8a6a5a', '#e0a07a', r() * 0.6);
        ctx.beginPath();
        ctx.ellipse(x, y - s * 0.2, s, s * 0.55, 0, 0, P2);
        ctx.fill();
      } else {
        for (let b = 0; b < 5; b++) {
          ctx.strokeStyle = b % 2 ? '#4a4228' : '#6a5a30';
          ctx.lineWidth = Math.max(0.8, s * 0.25);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + (b - 2) * s * 0.5, y - s * (1.4 + (b % 2) * 0.6));
          ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(255,170,100,0.5)';
        ctx.lineWidth = Math.max(0.6, s * 0.15);
        ctx.beginPath();
        ctx.moveTo(x - s, y - s * 1.3);
        ctx.lineTo(x - s * 0.6, y - s * 1.6);
        ctx.stroke();
      }
    }
  }
}
function along(pts: Pt[], x: number): number {
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    if (x >= Math.min(x0, x1) && x <= Math.max(x0, x1) && x1 !== x0) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  }
  return HZ;
}

/** The camp's fires (lit in the dusk) and the smoke rising from a few of them (painted frames, live). */
export const CAMPFIRES: Pt[] = [[226, 452], [300, 446], [372, 461], [470, 448], [520, 470], [262, 486], [1380, 450], [1442, 462], [1520, 447], [1600, 456], [1676, 470], [1560, 490], [1414, 505], [430, 512]];
export const CAMP_SMOKE: Pt[] = [[372, 461], [470, 448], [1442, 462], [1600, 456]];
/** The near standards outside (the empire's, streaming in the wind off the plain): foot x, y, cloth kind, size. */
export const OUT_STANDARDS: [number, number, number, number][] = [[512, 560, 0, 9], [1418, 556, 1, 9]];

function tent(ctx: Ctx, x: number, y: number, s: number, kind: number, depth: number): void {
  const cols = ['#e8d8c0', '#c84a3a', '#e8b860', '#5a6aa8', '#7a3a6a'];
  const c = airMix(cols[kind % cols.length], depth, AIR_OUT);
  const dk = airMix(shade(cols[kind % cols.length], -0.45), depth, AIR_OUT);
  groundShadow(ctx, x + s * 0.5, y, s * 1.4, s * 0.18, 0.3 * (1 - depth), '#2a0c18');
  if (kind % 2 === 0) {
    // a bell tent with its pole poking out
    ctx.beginPath();
    ctx.moveTo(x - s, y);
    ctx.quadraticCurveTo(x - s * 0.6, y - s * 0.8, x, y - s * 1.3);
    ctx.quadraticCurveTo(x + s * 0.6, y - s * 0.8, x + s, y);
    ctx.closePath();
    ctx.fillStyle = c;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y - s * 1.3);
    ctx.quadraticCurveTo(x + s * 0.6, y - s * 0.8, x + s, y);
    ctx.lineTo(x + s * 0.1, y);
    ctx.closePath();
    ctx.fillStyle = rgba(dk, 0.7);
    ctx.fill();
    ctx.strokeStyle = dk;
    ctx.lineWidth = Math.max(0.6, s * 0.08);
    ctx.beginPath();
    ctx.moveTo(x, y - s * 1.3);
    ctx.lineTo(x, y - s * 1.55);
    ctx.stroke();
    ctx.fillStyle = rgba('#ffb070', 0.4 * (1 - depth));
    ctx.beginPath();
    ctx.moveTo(x - s, y);
    ctx.quadraticCurveTo(x - s * 0.6, y - s * 0.8, x, y - s * 1.3);
    ctx.lineTo(x - s * 0.4, y);
    ctx.closePath();
    ctx.fill();
  } else {
    // a satrap's pavilion: a box with a peaked roof and a dark doorway
    ctx.fillStyle = c;
    ctx.fillRect(x - s, y - s * 0.8, s * 2, s * 0.8);
    ctx.beginPath();
    ctx.moveTo(x - s * 1.15, y - s * 0.8);
    ctx.lineTo(x - s * 0.2, y - s * 1.5);
    ctx.lineTo(x + s * 0.2, y - s * 1.5);
    ctx.lineTo(x + s * 1.15, y - s * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgba(dk, 0.75);
    ctx.fillRect(x, y - s * 0.8, s, s * 0.8);
    ctx.beginPath();
    ctx.moveTo(x + s * 0.2, y - s * 1.5);
    ctx.lineTo(x + s * 1.15, y - s * 0.8);
    ctx.lineTo(x, y - s * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = airMix('#1a0a10', depth, AIR_OUT);
    ctx.fillRect(x - s * 0.55, y - s * 0.55, s * 0.36, s * 0.55);
    ctx.fillStyle = rgba('#ffb070', 0.35 * (1 - depth));
    ctx.fillRect(x - s, y - s * 0.8, s * 0.3, s * 0.8);
  }
}

function camp(ctx: Ctx, r: R): void {
  // rows of tents far across the plain, thick near the horizon, a few big pavilions nearer
  const rows: [number, number, number][] = [[HZ + 4, 1.6, 0.92], [HZ + 10, 2.4, 0.86], [HZ + 18, 3.4, 0.78], [HZ + 30, 4.8, 0.68], [HZ + 46, 7, 0.56], [HZ + 70, 10, 0.44]];
  for (const [y, s, depth] of rows) {
    for (let x = OPEN.l0 - 10; x < OPEN.r1 + 10; x += s * (2.4 + r() * 2.6)) {
      if (x > OPEN.l1 + 10 && x < OPEN.r0 - 10) continue;
      if (x > 1320 && y < along(CLIFF, x) + 4) continue;
      if (r() < 0.2) continue;
      tent(ctx, x, y + (r() - 0.5) * s * 0.4, s * (0.8 + r() * 0.4), Math.floor(r() * 5), depth);
      if (r() < 0.25) figure(ctx, x + s * 1.6, y + s * 0.2, s * 0.32, ['#8a2e2a', '#2e4a7a', '#c89a3a', '#e8dcc4'][Math.floor(r() * 4)], depth, r() < 0.5, false);
    }
    // the dust hanging over the row
    vfill(ctx, OPEN.l0, y - s * 1.6, OPEN.r1 - OPEN.l0, s * 2, [[0, rgba('#d89070', 0)], [1, rgba('#d89070', 0.16 * depth)]]);
  }
  // standards far off over the camp
  for (const [x, y, s] of [[240, 446, 1.6], [400, 452, 2], [540, 458, 2.2], [1394, 448, 2], [1508, 456, 2.2], [1640, 450, 1.8]] as Pt3[]) standard(ctx, x, y, s, 0.6);
  // the fires, lit for the night: a bright point, a pool of light on the ground round it
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [x, y] of CAMPFIRES) {
    const s = 0.6 + (y - HZ) / 60;
    lightPool(ctx, x, y, 16 * s, 5 * s, '#ff8a3a', 0.35);
    lightPool(ctx, x, y - 2 * s, 5 * s, 6 * s, '#ffd080', 0.75);
  }
  ctx.restore();
  // a guy rope or two and the pegs of the near tents' lines on the near ground
  ctx.strokeStyle = rgba('#2a1210', 0.5);
  ctx.lineWidth = 1;
  for (const [x, y] of [[250, 600], [320, 640], [1640, 610], [1580, 650]] as Pt[]) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 6, y + 7);
    ctx.stroke();
  }
}
type Pt3 = [number, number, number];

// ——— the roof: the tent's underside, the back beam ———

/** The ceiling: above the back beam and the eaves. */
const CEIL: Pt[] = [[-4, -4], [W + 4, -4], [W + 4, eaveR(W + 4)], [XX.backR + XX.backW + 30, XX.beam - 14], [XX.backL - XX.backW - 30, XX.beam - 14], [-4, eaveL(-4)]];
export const CEIL_BOX: Box = { x: 0, y: 0, w: W, h: XX.beam + 2 };

function ceiling(ctx: Ctx, r: R): void {
  within(ctx, polyPath(CEIL), () => {
    ctx.fillStyle = CRIMSON.deep;
    ctx.fillRect(0, 0, W, XX.beam);
    // the panels: crimson and saffron in turn, running from the back beam out over us, each sagging a little
    // between its ribs (lit on the side the braziers' glow comes from, shaded in the trough)
    const n = 16;
    const zFar = 1;
    const zNear = 0.28;
    for (let i = 0; i < n; i++) {
      const X0 = -HALF + (i / n) * HALF * 2;
      const X1 = -HALF + ((i + 1) / n) * HALF * 2;
      const q: Pt[] = [FP(X0, zFar, EAVE), FP(X1, zFar, EAVE), FP(X1, zNear, EAVE), FP(X0, zNear, EAVE)];
      const col = i % 2 ? CRIMSON : SAFFRON;
      ctx.save();
      polyPath(q)(ctx);
      ctx.clip();
      const qb = boxOfPts(q, 0);
      const mid = (X0 + X1) / 2;
      // sag: lighter on the panel's crown toward the centre, darker into its edges
      const [ax, ay] = FP(X0, 0.5, EAVE);
      const [bx] = FP(X1, 0.5, EAVE);
      const g = ctx.createLinearGradient(ax, ay, bx, ay);
      g.addColorStop(0, mixHex(col.shade, CRIMSON.deep, 0.5));
      g.addColorStop(0.5 + mid * 0.08, mixHex(col.body, col.shade, 0.35));
      g.addColorStop(1, mixHex(col.shade, CRIMSON.deep, 0.6));
      ctx.fillStyle = g;
      ctx.fillRect(qb.x, qb.y, qb.w, qb.h);
      // dimmer towards the back, where no light reaches
      vfill(ctx, qb.x, qb.y, qb.w, qb.h, [[0, 'rgba(20,4,10,0.05)'], [1, 'rgba(20,4,10,0.45)']]);
      ctx.restore();
    }
    surface(ctx, r, CEIL_BOX, CRIMSON.body, { over: true, vary: 0.25, cells: 5, mottle: 0.25, strokes: 0.3, strokeAng: 0.2, strokeLen: 140, strokeW: 4, grain: 0.16, grainKind: 'canvas', seed: 221 });
    // the seams: lapis piping along each rib, a gilded boss where the ribs meet the back beam
    for (let i = 0; i <= n; i++) {
      const X = -HALF + (i / n) * HALF * 2;
      const a = FP(X, zFar, EAVE);
      const b = FP(X, zNear, EAVE);
      ctx.strokeStyle = rgba(LAPIS.shade, 0.85);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(...a);
      ctx.lineTo(...b);
      ctx.stroke();
      ctx.strokeStyle = rgba(LAPIS.lit, 0.35);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(a[0] - 1, a[1]);
      ctx.lineTo(b[0] - 1.5, b[1]);
      ctx.stroke();
    }
    // a band of gold stars embroidered across the panels near the back
    for (let k = 0; k < 2; k++) {
      const Z = 0.78 - k * 0.2;
      for (let i = 0; i < 30; i++) {
        const X = -HALF + ((i + 0.5) / 30) * HALF * 2;
        const [x, y] = FP(X, Z, EAVE);
        const s = 150 / Z / 150;
        rosette(ctx, x, y, 4 * s, rgba(GOLD.body, 0.55), rgba(GOLD.lit, 0.6), 6);
      }
    }
    // the braziers' glow coming up under the eaves on either side, and the sun's on the left
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of XX.braziers) lightPool(ctx, b.x, XX.beam - 40, 260, 120, FIRE, 0.14);
    lightPool(ctx, 300, 140, 300, 120, SUNC, 0.08);
    ctx.restore();
    // and the dark gathered in the middle, over the lanes
    const dg = ctx.createRadialGradient(VPX, 120, 40, VPX, 120, 520);
    dg.addColorStop(0, 'rgba(18,4,10,0.35)');
    dg.addColorStop(1, 'rgba(18,4,10,0)');
    ctx.fillStyle = dg;
    ctx.fillRect(0, 0, W, XX.beam);
  });
  // the eave beams along the tops of the open sides: gilded
  for (const sd of [-1, 1]) {
    const pts: Pt[] = [FP(sd * HALF, 0.3, EAVE + 0.08), FP(sd * HALF, 1, EAVE + 0.08), FP(sd * HALF, 1, EAVE - 0.02), FP(sd * HALF, 0.3, EAVE - 0.02)];
    gilt(ctx, polyPath(pts), boxOfPts(pts, 0), { dir: 'h', line: 1.2, dim: 0.35 });
  }
}

// ——— the back wall: lapis hangings over a dado of glazed bricks, the back beam ———

export const WALL_BOX: Box = { x: XX.backL, y: XX.beam - 20, w: XX.backR - XX.backL, h: XX.wallFoot - XX.beam + 24 };
const DADO = 468;

function archer(ctx: Ctx, x: number, y: number, s: number, dir: number, body: string, dark: string): void {
  // one of the guard on the glaze, our own: a tall fluted cap, a long robe, a quiver on the back, a spear upright
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-s * 0.32, 0);
  ctx.lineTo(-s * 0.22, -s * 1.35);
  ctx.lineTo(-s * 0.1, -s * 1.55);
  ctx.lineTo(s * 0.14, -s * 1.55);
  ctx.lineTo(s * 0.26, -s * 1.3);
  ctx.lineTo(s * 0.34, 0);
  ctx.closePath();
  ctx.fill();
  // head and cap
  ctx.beginPath();
  ctx.arc(s * 0.04, -s * 1.7, s * 0.15, 0, P2);
  ctx.fill();
  ctx.fillRect(-s * 0.1, -s * 2.06, s * 0.26, s * 0.3);
  // quiver
  ctx.fillStyle = dark;
  ctx.save();
  ctx.translate(-s * 0.24, -s * 1.3);
  ctx.rotate(-0.3);
  ctx.fillRect(-s * 0.07, -s * 0.4, s * 0.14, s * 0.6);
  ctx.restore();
  // the bow over the shoulder, its string; a beard and the cap's band
  ctx.strokeStyle = body;
  ctx.lineWidth = Math.max(0.8, s * 0.06);
  ctx.beginPath();
  ctx.arc(-s * 0.08, -s * 1.3, s * 0.42, Math.PI * 0.6, Math.PI * 1.45);
  ctx.stroke();
  ctx.strokeStyle = dark;
  ctx.lineWidth = Math.max(0.4, s * 0.02);
  ctx.beginPath();
  ctx.moveTo(-s * 0.08 + Math.cos(Math.PI * 0.6) * s * 0.42, -s * 1.3 + Math.sin(Math.PI * 0.6) * s * 0.42);
  ctx.lineTo(-s * 0.08 + Math.cos(Math.PI * 1.45) * s * 0.42, -s * 1.3 + Math.sin(Math.PI * 1.45) * s * 0.42);
  ctx.stroke();
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(s * 0.12, -s * 1.66);
  ctx.lineTo(s * 0.2, -s * 1.5);
  ctx.lineTo(s * 0.06, -s * 1.52);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(-s * 0.1, -s * 1.86, s * 0.26, s * 0.05);
  // spear
  ctx.strokeStyle = dark;
  ctx.lineWidth = Math.max(0.8, s * 0.06);
  ctx.beginPath();
  ctx.moveTo(s * 0.46, s * 0.02);
  ctx.lineTo(s * 0.46, -s * 2.3);
  ctx.stroke();
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(s * 0.46, -s * 2.48);
  ctx.lineTo(s * 0.52, -s * 2.3);
  ctx.lineTo(s * 0.4, -s * 2.3);
  ctx.closePath();
  ctx.fill();
  // the robe's pleats
  ctx.strokeStyle = dark;
  ctx.lineWidth = Math.max(0.5, s * 0.03);
  for (const fx of [-0.12, 0.04, 0.18]) {
    ctx.beginPath();
    ctx.moveTo(s * fx, -s * 0.9);
    ctx.lineTo(s * (fx + 0.04), 0);
    ctx.stroke();
  }
  ctx.restore();
}

function backWall(ctx: Ctx, r: R): void {
  const x0 = XX.backL;
  const x1 = XX.backR;
  const top = XX.beam;
  const foot = XX.wallFoot;
  // the hangings: lapis cloth in deep folds, gold rosettes in rows bending with them
  const hang: Box = { x: x0, y: top, w: x1 - x0, h: DADO - top };
  drape(ctx, rectP(hang.x, hang.y, hang.w, hang.h), hang, LAPIS.body, {
    fold: 36,
    depth: 0.7,
    phase: 0.6,
    pattern: (c, fold) => {
      for (let y = top + 34; y < DADO - 10; y += 46) {
        for (let x = x0 + 20 + ((y / 46) % 2) * 26; x < x1; x += 52) {
          const f = fold(x, y);
          rosette(c, x + f * 4, y, 7 * (0.8 + Math.abs(f) * 0.2), rgba(GOLD.body, 0.6 + f * 0.15), rgba(GOLD.lit, 0.7), 8);
        }
      }
      // a border of gold along the hem
      c.fillStyle = rgba(GOLD.shade, 0.8);
      c.fillRect(x0, DADO - 16, x1 - x0, 10);
      c.fillStyle = rgba(GOLD.body, 0.7);
      for (let x = x0; x < x1; x += 14) c.fillRect(x, DADO - 14, 8, 6);
    },
  });
  // the dado: glazed bricks, a turquoise ground with the guard marching in from either side, rosettes above and below
  const db: Box = { x: x0, y: DADO, w: x1 - x0, h: foot - 12 - DADO };
  ctx.save();
  ctx.beginPath();
  ctx.rect(db.x, db.y, db.w, db.h);
  ctx.clip();
  vfill(ctx, db.x, db.y, db.w, db.h, [[0, mixHex(TURQ.body, TURQ.shade, 0.5)], [1, TURQ.deep]]);
  surface(ctx, r, db, TURQ.body, { over: true, vary: 0.35, cells: 8, mottle: 0.4, strokes: 0, grain: 0.18, grainKind: 'speckle', seed: 231 });
  // the rosette bands
  for (const y of [DADO + 7, foot - 19]) {
    ctx.fillStyle = LAPIS.shade;
    ctx.fillRect(x0, y - 7, x1 - x0, 14);
    for (let x = x0 + 8; x < x1; x += 16) rosette(ctx, x, y, 6, rgba('#f4e6c0', 0.85), GOLD.body, 8);
  }
  // the archers, gold on turquoise, marching towards the throne
  for (let x = x0 + 44; x < x1 - 30; x += 70) {
    const dir = x < VPX ? 1 : -1;
    archer(ctx, x, foot - 26, 26, dir, mixHex(GOLD.lit, '#ffe08a', 0.4), TURQ.deep);
  }
  // the brick joints over everything, the glaze crazed and lit on its upper edges
  for (let y = DADO; y < foot; y += 9) {
    ctx.fillStyle = rgba(TURQ.deep, 0.45);
    ctx.fillRect(x0, y, x1 - x0, 1.2);
    ctx.fillStyle = rgba('#e8fff8', 0.12);
    ctx.fillRect(x0, y + 1.2, x1 - x0, 0.8);
    const off = ((y - DADO) / 9) % 2 ? 0 : 14;
    for (let x = x0 + off; x < x1; x += 28) {
      ctx.fillStyle = rgba(TURQ.deep, 0.4);
      ctx.fillRect(x, y, 1, 9);
    }
  }
  ctx.restore();
  // the plinth under it: dark stone
  ctx.fillStyle = '#2a1418';
  ctx.fillRect(x0, foot - 12, x1 - x0, 14);
  ctx.fillStyle = rgba('#c88a6a', 0.25);
  ctx.fillRect(x0, foot - 12, x1 - x0, 1.5);
  // the back beam: gilded, carved with a row of rosettes, its underside in shadow over the hangings
  crevice(ctx, x0, x1, top, 26, 0.6, '#0a0410');
  const beam: Pt[] = [[x0 - 40, top - 16], [x1 + 40, top - 16], [x1 + 40, top + 3], [x0 - 40, top + 3]];
  gilt(ctx, polyPath(beam), boxOfPts(beam, 0), { dir: 'h', line: 1.4, dim: 0.2 });
  for (let x = x0 - 24; x < x1 + 30; x += 24) rosette(ctx, x, top - 6, 5, rgba(GOLD.shade, 0.8), rgba(GOLD.hi, 0.6), 8);
  // the light: the fires warm on either side, the middle in the throne's shadow and dim, the dado's foot dark
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  lightPool(ctx, x0 + 40, 470, 200, 220, FIRE, 0.16);
  lightPool(ctx, x1 - 40, 470, 200, 220, FIRE, 0.16);
  ctx.restore();
  const sg = ctx.createRadialGradient(VPX + 30, 440, 40, VPX + 30, 440, 300);
  sg.addColorStop(0, 'rgba(14,4,12,0.45)');
  sg.addColorStop(1, 'rgba(14,4,12,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(x0, top, x1 - x0, foot - top);
  vfill(ctx, x0, foot - 60, x1 - x0, 60, [[0, 'rgba(14,4,12,0)'], [1, 'rgba(14,4,12,0.4)']]);
  // the far end of the tent is dim: the dusk doesn't reach it, only the fires
  ctx.fillStyle = 'rgba(10,10,30,0.36)';
  ctx.fillRect(x0, top - 20, x1 - x0, foot - top + 24);
}

// ——— the floor: layered carpets on the beaten earth, the sun's long light across them ———

/** The floor, from the back wall's foot to under the table, between the floor lines of the open sides. */
const FLOOR: Pt[] = [[XX.backL, XX.wallFoot], [XX.backR, XX.wallFoot], [W - 150, 774], [150, 774]];
export const FLOOR_BOX: Box = { x: 0, y: XX.wallFoot - 2, w: W, h: 774 - XX.wallFoot + 2 };
const zOfY = (y: number) => 150 / (y - VPY);

interface Rug { X0: number; X1: number; Z0: number; Z1: number; field: string; border: string; guard: string; motif: string; seed: number; medallion: boolean }
/** The carpets, far to near (the ones laid later lie over the earlier). */
const RUGS: Rug[] = [
  { X0: -2.3, X1: -0.9, Z0: 0.58, Z1: 0.98, field: '#6a2a24', border: '#1e2a52', guard: '#c89a4a', motif: '#d8b070', seed: 1, medallion: false },
  { X0: 0.85, X1: 2.3, Z0: 0.52, Z1: 0.96, field: '#2a3a6a', border: '#7a1e22', guard: '#d8a850', motif: '#e8c890', seed: 2, medallion: false },
  { X0: -1.62, X1: 1.62, Z0: 0.44, Z1: 0.81, field: '#8a1e24', border: '#1c2650', guard: '#d4a04c', motif: '#e8c47a', seed: 3, medallion: true },
];

/** A carpet's flat design (length along its depth), RW × RH px. */
const RW = 360;
const RH = 420;
function rugFlat(rug: Rug): HTMLCanvasElement {
  const rr = rng(hashStr('xx:rug' + rug.seed));
  const [c, g] = makeCanvas(RW, RH);
  g.fillStyle = rug.field;
  g.fillRect(0, 0, RW, RH);
  // the field's abrash: bands of the dye lot running across
  for (let y = 0; y < RH; y += 6 + rr() * 20) {
    g.fillStyle = rgba(rr() < 0.5 ? '#000000' : '#ffffff', 0.03 + rr() * 0.04);
    g.fillRect(0, y, RW, 4 + rr() * 16);
  }
  // the field's small motifs: stepped stars in rows
  const star = (x: number, y: number, s: number, col: string) => {
    g.fillStyle = col;
    g.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * P2;
      const rad = i % 2 ? s * 0.45 : s;
      g.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    g.closePath();
    g.fill();
  };
  for (let y = 50; y < RH - 40; y += 34) for (let x = 50 + ((y / 34) % 2) * 20; x < RW - 40; x += 40) star(x, y, 6, rgba(rug.motif, 0.55));
  if (rug.medallion) {
    // the central medallion: a stepped lozenge with hooked edges, its pendants up and down the field
    const lz = (cx: number, cy: number, rx: number, ry: number, col: string) => {
      g.fillStyle = col;
      g.beginPath();
      const n = 8;
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        g.lineTo(cx - rx + rx * 2 * u, cy - ry * (1 - Math.abs(u * 2 - 1)) - (i % 2 ? 6 : 0));
      }
      for (let i = n; i >= 0; i--) {
        const u = i / n;
        g.lineTo(cx - rx + rx * 2 * u, cy + ry * (1 - Math.abs(u * 2 - 1)) + (i % 2 ? 6 : 0));
      }
      g.closePath();
      g.fill();
    };
    lz(RW / 2, RH / 2, 120, 130, mixHex(rug.border, rug.field, 0.3));
    lz(RW / 2, RH / 2, 96, 104, mixHex(rug.guard, rug.field, 0.5));
    lz(RW / 2, RH / 2, 78, 84, rug.field);
    lz(RW / 2, RH / 2, 34, 38, rug.border);
    star(RW / 2, RH / 2, 18, mixHex(rug.motif, rug.field, 0.35));
    for (const sy of [-1, 1]) {
      g.fillStyle = rug.border;
      g.fillRect(RW / 2 - 12, RH / 2 + sy * 150 - 14, 24, 28);
      star(RW / 2, RH / 2 + sy * 150, 10, rug.guard);
    }
  }
  // the borders: guard stripes and the main border with its running lozenges
  const bw = 30;
  g.fillStyle = rug.border;
  g.fillRect(0, 0, RW, bw);
  g.fillRect(0, RH - bw, RW, bw);
  g.fillRect(0, 0, bw, RH);
  g.fillRect(RW - bw, 0, bw, RH);
  g.strokeStyle = rug.guard;
  g.lineWidth = 3;
  g.strokeRect(bw + 2, bw + 2, RW - bw * 2 - 4, RH - bw * 2 - 4);
  g.strokeRect(4, 4, RW - 8, RH - 8);
  g.fillStyle = rug.motif;
  const lozenge = (x: number, y: number) => {
    g.beginPath();
    g.moveTo(x, y - 8);
    g.lineTo(x + 7, y);
    g.lineTo(x, y + 8);
    g.lineTo(x - 7, y);
    g.closePath();
    g.fill();
  };
  for (let x = 18; x < RW - 10; x += 22) for (const y of [bw / 2, RH - bw / 2]) lozenge(x, y);
  for (let y = 18; y < RH - 10; y += 22) for (const x of [bw / 2, RW - bw / 2]) lozenge(x, y);
  // the pile: fine grain, and worn paler where feet have gone
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = rgba(rr() < 0.5 ? '#000000' : '#ffe8c8', 0.06);
    g.fillRect(rr() * RW, rr() * RH, 1.5, 1.5);
  }
  const wg = g.createRadialGradient(RW / 2, RH * 0.7, 10, RW / 2, RH * 0.7, RW * 0.5);
  wg.addColorStop(0, 'rgba(220,180,150,0.14)');
  wg.addColorStop(1, 'rgba(220,180,150,0)');
  g.fillStyle = wg;
  g.fillRect(0, 0, RW, RH);
  // old dyes, deep in the tent's dusk: less saturated and lower in contrast, so the fight reads over them
  g.globalCompositeOperation = 'saturation';
  g.fillStyle = 'rgba(128,128,128,0.42)';
  g.fillRect(0, 0, RW, RH);
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = 'rgba(40,14,18,0.3)';
  g.fillRect(0, 0, RW, RH);
  return c;
}
/** Lay a flat carpet into the floor's perspective (row by row). */
function layRug(ctx: Ctx, rug: Rug): void {
  const flat = rugFlat(rug);
  const yFar = Math.floor(FP(0, rug.Z1)[1]);
  const yNear = Math.min(780, FP(0, rug.Z0)[1]);
  // a soft shadow of its edge and its thickness on what it lies on
  const q: Pt[] = [FP(rug.X0, rug.Z1), FP(rug.X1, rug.Z1), FP(rug.X1, rug.Z0), FP(rug.X0, rug.Z0)];
  ctx.save();
  ctx.translate(4, 2);
  polyPath(q)(ctx);
  ctx.fillStyle = 'rgba(16,4,8,0.5)';
  ctx.fill();
  ctx.restore();
  for (let y = yFar; y < yNear; y += 1) {
    const Z = zOfY(y + 0.5);
    const v = (rug.Z1 - Z) / (rug.Z1 - rug.Z0);
    const xa = VPX + (rug.X0 * 150) / Z;
    const xb = VPX + (rug.X1 * 150) / Z;
    ctx.drawImage(flat, 0, Math.min(RH - 1, Math.max(0, v * RH)), RW, 1, xa, y, xb - xa, 1.15);
  }
  // the far edge's fringe lying on the floor
  const [fx0, fy] = FP(rug.X0, rug.Z1);
  const [fx1] = FP(rug.X1, rug.Z1);
  ctx.strokeStyle = rgba('#e8d8b8', 0.5);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = fx0 + 2; x < fx1 - 2; x += 3) {
    ctx.moveTo(x, fy);
    ctx.lineTo(x + (x - VPX) * 0.004, fy - 3);
  }
  ctx.stroke();
}

function floor(ctx: Ctx, r: R): void {
  within(ctx, polyPath(FLOOR), () => {
    // the beaten earth under the carpets, swept
    vfill(ctx, 0, XX.wallFoot, W, 774 - XX.wallFoot, [[0, '#3a1e1a'], [1, '#2a1412']]);
    surface(ctx, r, FLOOR_BOX, '#3a201a', { over: true, vary: 0.3, cells: 6, mottle: 0.3, strokes: 0.4, strokeAng: 0, strokeLen: 160, strokeW: 3, grain: 0.16, grainKind: 'speckle', seed: 241 });
    for (const rug of RUGS) layRug(ctx, rug);
    // the carpets' dyes are deep in the tent's dusk
    ctx.fillStyle = 'rgba(16,4,10,0.22)';
    ctx.fillRect(0, XX.wallFoot, W, 774 - XX.wallFoot);
    // the dais throws its shadow forward and to the right over the main carpet
    ctx.save();
    ctx.globalAlpha = 0.5;
    softly(ctx, FLOOR_BOX, (c) => {
      c.fillStyle = 'rgba(14,4,8,1)';
      c.beginPath();
      const a = FP(-1.55, 0.8);
      const b = FP(1.55, 0.8);
      c.moveTo(a[0] + 40, a[1]);
      c.lineTo(b[0] + 30, b[1]);
      c.lineTo(b[0] + 140, b[1] + 22);
      c.lineTo(a[0] + 160, a[1] + 22);
      c.closePath();
      c.fill();
    }, 0.25);
    ctx.restore();
    // the sun: its last light comes in low through the left side and lies long across the carpets
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    softly(ctx, FLOOR_BOX, (c) => {
      const g = c.createLinearGradient(260, 0, 1250, 0);
      g.addColorStop(0, 'rgba(255,150,80,0.36)');
      g.addColorStop(0.45, 'rgba(255,130,70,0.18)');
      g.addColorStop(1, 'rgba(255,120,60,0)');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(560, floorL(560) + 2);
      c.lineTo(1250, 612);
      c.lineTo(1300, 690);
      c.lineTo(300, 760);
      c.lineTo(230, floorL(230));
      c.closePath();
      c.fill();
      // cut by the long shadows of the brazier and the incense stand standing in it
      c.globalCompositeOperation = 'destination-out';
      c.fillStyle = 'rgba(0,0,0,0.85)';
      for (const [x, y, w] of [[XX.braziers[0].x, XX.braziers[0].y, 34], [XX.incense[0].x, XX.incense[0].y, 14]] as Pt3[]) {
        c.beginPath();
        c.moveTo(x - w * 0.5, y);
        c.lineTo(x + 520, y - 26);
        c.lineTo(x + 560, y - 8);
        c.lineTo(x + w * 0.5, y + 3);
        c.closePath();
        c.fill();
      }
    }, 0.25);
    // the braziers' firelight pooled round their feet
    for (const b of XX.braziers) {
      lightPool(ctx, b.x, b.y - 4, 220, 50, FIRE, 0.26);
      lightPool(ctx, b.x, b.y - 2, 90, 20, '#ffb060', 0.2);
    }
    ctx.restore();
    // their stands' contact shadows
    for (const b of XX.braziers) groundShadow(ctx, b.x + 6, b.y, 52, 9, 0.5, '#120408');
    for (const s of XX.incense) groundShadow(ctx, s.x + 4, s.y, 20, 5, 0.5, '#120408');
    // the near floor, behind the table, falls into shade (calm behind the pizzas)
    vfill(ctx, 0, 640, W, 134, [[0, 'rgba(14,4,8,0)'], [0.5, 'rgba(14,4,8,0.3)'], [1, 'rgba(14,4,8,0.62)']]);
    for (const b of XX.braziers) {
      lightPool(ctx, b.x + 10, b.y + 2, 200, 40, FIRE, 0.22);
      lightPool(ctx, b.x, b.y, 80, 16, '#ffb060', 0.18);
    }
    // where the side's floor meets the plain: the carpets' edge, sand drifted in
    for (const sd of [-1, 1]) {
      const pts: Pt[] = [];
      for (let x = 150; x <= XX.backL; x += 8) pts.push([sd < 0 ? x : W - x, floorL(x)]);
      ctx.strokeStyle = rgba('#120408', 0.6);
      ctx.lineWidth = 6;
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + 2) : ctx.moveTo(x, y + 2)));
      ctx.stroke();
      ctx.strokeStyle = rgba('#c8885a', sd < 0 ? 0.35 : 0.18);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y - 1) : ctx.moveTo(x, y - 1)));
      ctx.stroke();
    }
  });
  // the side carpets' fringes lying out over the threshold onto the plain
  ctx.lineWidth = 1;
  for (const sd of [-1, 1]) {
    for (let x = 200; x <= XX.backL - 20; x += 3.2) {
      const y = floorL(x);
      const len = 4 + ((x * 7) % 3);
      const sx = sd < 0 ? x : W - x;
      ctx.strokeStyle = rgba('#e0cca8', sd < 0 ? 0.5 : 0.35);
      ctx.beginPath();
      ctx.moveTo(sx, y + 1);
      ctx.lineTo(sx + sd * len * 0.4, y - len);
      ctx.stroke();
    }
  }
}

// ——— the structure: the rolled side walls under the eaves, the poles ———

const ROLL_BOX_L: Box = { x: OPEN.l0 - 10, y: 0, w: OPEN.l1 - OPEN.l0 + 30, h: 300 };
const ROLL_BOX_R: Box = { x: W - (ROLL_BOX_L.x + ROLL_BOX_L.w), y: 0, w: ROLL_BOX_L.w, h: 300 };

/** The side wall rolled up under the eave: a fat roll of striped cloth, tied up at intervals, its ties hanging. */
function roll(ctx: Ctx, r: R, sd: -1 | 1): void {
  const xA = sd < 0 ? OPEN.l0 - 6 : OPEN.r1 + 6;
  const xB = sd < 0 ? OPEN.l1 + 8 : OPEN.r0 - 8;
  const n = 24;
  const top: Pt[] = [];
  const hs: number[] = [];
  for (let i = 0; i <= n; i++) {
    const x = xA + ((xB - xA) * i) / n;
    const s = Math.abs(x - VPX) / HALF;
    top.push([x, VPY - (EAVE - 1) * s - 2]);
    hs.push(0.16 * s);
  }
  const bot: Pt[] = top.map(([x, y], i) => [x, y + hs[i]] as Pt);
  const path = smoothPath([...top, ...[...bot].reverse()]);
  const bx = boxOfPts([...top, ...bot], 2);
  within(ctx, path, () => {
    ctx.fillStyle = CRIMSON.body;
    ctx.fillRect(bx.x, bx.y, bx.w, bx.h);
    // the stripes of the wall wound round it, then its roundness: lit on top by the sky, dark beneath
    for (let i = 0; i < n; i++) {
      const [x, y] = top[i];
      const [x1] = top[i + 1];
      if (i % 3 === 0) {
        ctx.fillStyle = SAFFRON.body;
        ctx.fillRect(Math.min(x, x1), y - 2, Math.abs(x1 - x) * 0.7, hs[i] + 6);
      }
      if (i % 3 === 1) {
        ctx.fillStyle = LAPIS.body;
        ctx.fillRect(Math.min(x, x1) + Math.abs(x1 - x) * 0.4, y - 2, Math.abs(x1 - x) * 0.25, hs[i] + 6);
      }
    }
    for (let i = 0; i < n; i++) {
      const [x, y] = top[i];
      const [x1] = top[i + 1];
      const h = hs[i];
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, 'rgba(255,190,140,0.4)');
      g.addColorStop(0.3, 'rgba(255,190,140,0)');
      g.addColorStop(0.6, 'rgba(20,4,10,0.2)');
      g.addColorStop(1, 'rgba(20,4,10,0.8)');
      ctx.fillStyle = g;
      ctx.fillRect(Math.min(x, x1) - 0.5, y - 3, Math.abs(x1 - x) + 1, h + 8);
    }
    // the cloth's wound edges spiralling round it
    ctx.strokeStyle = rgba(CRIMSON.deep, 0.6);
    ctx.lineWidth = 1.2;
    for (let i = 0; i < n; i += 2) {
      const [x, y] = top[i];
      const h = hs[i];
      ctx.beginPath();
      ctx.moveTo(x - sd * h * 0.2, y);
      ctx.quadraticCurveTo(x + sd * h * 0.25, y + h * 0.5, x - sd * h * 0.1, y + h);
      ctx.stroke();
    }
  });
  path(ctx);
  ctx.strokeStyle = rgba(CRIMSON.deep, 0.9);
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // the ties: cords round the roll, their ends hanging with a tassel
  for (let i = 3; i < n; i += 6) {
    const [x, y] = top[i];
    const h = hs[i];
    ctx.strokeStyle = GOLD.body;
    ctx.lineWidth = Math.max(1.2, h * 0.12);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + sd, y + h + 1);
    ctx.stroke();
    const len = h * (0.9 + r() * 0.5);
    ctx.lineWidth = Math.max(0.8, h * 0.05);
    ctx.strokeStyle = GOLD.shade;
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.quadraticCurveTo(x - sd * 2, y + h + len * 0.5, x + sd, y + h + len);
    ctx.stroke();
    ctx.fillStyle = CRIMSON.lit;
    ctx.beginPath();
    ctx.ellipse(x + sd, y + h + len + h * 0.18, Math.max(1.2, h * 0.1), Math.max(2, h * 0.26), 0, 0, P2);
    ctx.fill();
  }
}

/** A back pole: fluted and gilded, ending in our twin-bull capital that carries the back beam. */
const BACKCOL_BOX = (sd: -1 | 1): Box => {
  const x = sd < 0 ? XX.backL : XX.backR;
  return { x: x - 56, y: XX.beam - 40, w: 112, h: XX.wallFoot - XX.beam + 44 };
};
function bull(ctx: Ctx, x: number, y: number, s: number, dir: number): void {
  // a bull's forepart, kneeling, facing dir: the head with its horns, a folded foreleg
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  const body = (c: Ctx) => {
    c.beginPath();
    c.moveTo(0, -s * 0.5);
    c.quadraticCurveTo(s * 0.5, -s * 0.62, s * 0.8, -s * 0.5);
    c.lineTo(s * 1.18, -s * 0.36);
    c.quadraticCurveTo(s * 1.32, -s * 0.18, s * 1.22, 0);
    c.lineTo(s * 1.0, s * 0.06);
    c.quadraticCurveTo(s * 0.86, s * 0.2, s * 0.78, s * 0.42);
    c.lineTo(s * 0.92, s * 0.5);
    c.lineTo(s * 0.5, s * 0.52);
    c.lineTo(s * 0.46, s * 0.3);
    c.quadraticCurveTo(s * 0.2, s * 0.36, 0, s * 0.3);
    c.closePath();
  };
  gilt(ctx, body, { x: 0, y: -s * 0.62, w: s * 1.32, h: s * 1.14 }, { dir: 'r', line: 1.1, dim: 0.15 });
  // horns, eye, the curls of the forelock
  ctx.strokeStyle = GOLD.shade;
  ctx.lineWidth = Math.max(1, s * 0.07);
  ctx.beginPath();
  ctx.moveTo(s * 0.96, -s * 0.46);
  ctx.quadraticCurveTo(s * 0.98, -s * 0.78, s * 0.8, -s * 0.84);
  ctx.stroke();
  ctx.strokeStyle = GOLD.lit;
  ctx.lineWidth = Math.max(0.6, s * 0.03);
  ctx.beginPath();
  ctx.moveTo(s * 0.94, -s * 0.48);
  ctx.quadraticCurveTo(s * 0.95, -s * 0.76, s * 0.8, -s * 0.82);
  ctx.stroke();
  ctx.fillStyle = GOLD.deep;
  ctx.beginPath();
  ctx.arc(s * 1.04, -s * 0.3, s * 0.035, 0, P2);
  ctx.fill();
  ctx.strokeStyle = rgba(GOLD.deep, 0.6);
  ctx.lineWidth = Math.max(0.5, s * 0.025);
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(s * (0.6 + i * 0.05), -s * (0.2 - i * 0.12), s * 0.05, 0, Math.PI * 1.5);
    ctx.stroke();
  }
  ctx.restore();
}
function backCol(ctx: Ctx, sd: -1 | 1): void {
  const x = sd < 0 ? XX.backL : XX.backR;
  const w = XX.backW;
  const top = XX.beam + 44;
  const foot = XX.wallFoot;
  castShadow(ctx, rectP(x - w, top, w * 2, foot - top), 10, 12, 0.45, '#0a0410');
  groundShadow(ctx, x + 6, foot + 1, w * 2, 5, 0.6, '#0a0206');
  // the shaft: fluted, gilded, darker low down in the wall's shade
  const shaftP = rectP(x - w * 0.8, top, w * 1.6, foot - top - 16);
  gilt(ctx, shaftP, { x: x - w * 0.8, y: top, w: w * 1.6, h: foot - top }, { dir: 'v', line: 1.4, dim: 0.3 });
  sunSide(ctx, shaftP, { x: x - w * 0.8, y: top, w: w * 1.6, h: foot - top }, 0.32);
  within(ctx, shaftP, () => {
    for (let i = -3; i <= 3; i++) {
      ctx.fillStyle = rgba(GOLD.deep, 0.28);
      ctx.fillRect(x + i * w * 0.22 - 1, top, 1.6, foot - top);
    }
    vfill(ctx, x - w, foot - 120, w * 2, 120, [[0, 'rgba(20,6,10,0)'], [1, 'rgba(20,6,10,0.45)']]);
  });
  // the base: a bell of lotus petals
  const bell = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x - w * 0.8, foot - 18);
    c.quadraticCurveTo(x - w * 1.4, foot - 6, x - w * 1.45, foot);
    c.lineTo(x + w * 1.45, foot);
    c.quadraticCurveTo(x + w * 1.4, foot - 6, x + w * 0.8, foot - 18);
    c.closePath();
  };
  gilt(ctx, bell, { x: x - w * 1.5, y: foot - 20, w: w * 3, h: 20 }, { dir: 'v', line: 1.2, dim: 0.25 });
  // the capital: a block of volutes, and over it the twin bulls back to back, the beam in the saddle of their necks
  const vb: Box = { x: x - w * 1.1, y: top - 22, w: w * 2.2, h: 22 };
  gilt(ctx, rectP(vb.x, vb.y, vb.w, vb.h), vb, { dir: 'v', line: 1.2, dim: 0.15 });
  for (const s2 of [-1, 1]) {
    ctx.strokeStyle = GOLD.deep;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x + s2 * w * 0.62, top - 11, 6, 0, P2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + s2 * w * 0.62, top - 11, 2.5, 0, P2);
    ctx.stroke();
  }
  bull(ctx, x - 4, top - 32, 34, -1);
  bull(ctx, x + 4, top - 32, 34, 1);
}

/** A near pole: lacquered crimson with gilded bands, on a gilt bell base, rising into the valance. */
const NEARCOL_BOX = (sd: -1 | 1): Box => {
  const x = sd < 0 ? XX.nearL : XX.nearR;
  return { x: x - XX.nearW * 1.8 - 2, y: 0, w: XX.nearW * 3.6 + 4, h: 759 };
};
function nearCol(ctx: Ctx, r: R, sd: -1 | 1): void {
  const x = sd < 0 ? XX.nearL : XX.nearR;
  const w = XX.nearW;
  const foot = 774;
  const shaftP = rectP(x - w, -10, w * 2, foot);
  ctx.save();
  shaftP(ctx);
  const g = ctx.createLinearGradient(x - w, 0, x + w, 0);
  g.addColorStop(0, CRIMSON.shade);
  g.addColorStop(0.25, CRIMSON.lit);
  g.addColorStop(0.45, CRIMSON.body);
  g.addColorStop(0.85, CRIMSON.shade);
  g.addColorStop(1, CRIMSON.deep);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  surface(ctx, r, { x: x - w, y: 0, w: w * 2, h: foot }, CRIMSON.body, { over: true, vary: 0.2, cells: 3, mottle: 0.2, strokes: 0.5, strokeAng: Math.PI / 2, strokeLen: 200, strokeW: 3, grain: 0.12, seed: 251 + sd });
  // the lacquer's long highlight
  ctx.fillStyle = 'rgba(255,220,200,0.16)';
  ctx.fillRect(x - w * 0.55, 0, w * 0.18, foot);
  // carved and gilded bands with a running vine between them
  for (const y of [170, 330, 500]) {
    const bb: Box = { x: x - w - 1, y, w: w * 2 + 2, h: 26 };
    gilt(ctx, rectP(bb.x, bb.y, bb.w, bb.h), bb, { dir: 'v', line: 1.2, dim: 0.1 });
    for (let i = 0; i < 5; i++) rosette(ctx, x - w * 0.8 + (i / 4) * w * 1.6, y + 13, 4.5, rgba(GOLD.shade, 0.8), GOLD.hi, 6);
  }
  ctx.strokeStyle = rgba(GOLD.body, 0.55);
  ctx.lineWidth = 2;
  for (const [y0, y1] of [[200, 330], [356, 500]] as Pt[]) {
    ctx.beginPath();
    for (let y = y0; y < y1; y += 4) ctx.lineTo(x + Math.sin(y * 0.09) * w * 0.55, y);
    ctx.stroke();
  }
  // the inner side warmed by the brazier, the foot in the floor's shade
  const wg = ctx.createLinearGradient(x - w, 0, x + w, 0);
  wg.addColorStop(0, `rgba(255,140,60,${sd < 0 ? 0 : 0.24})`);
  wg.addColorStop(0.45, 'rgba(255,140,60,0)');
  wg.addColorStop(0.55, 'rgba(255,140,60,0)');
  wg.addColorStop(1, `rgba(255,140,60,${sd < 0 ? 0.24 : 0})`);
  ctx.fillStyle = wg;
  ctx.fillRect(x - w, 380, w * 2, 400);
  vfill(ctx, x - w, 560, w * 2, 220, [[0, 'rgba(16,4,8,0)'], [1, 'rgba(16,4,8,0.5)']]);
  ctx.restore();
  shaftP(ctx);
  ctx.strokeStyle = rgba(CRIMSON.deep, 0.95);
  ctx.lineWidth = 2.2;
  ctx.stroke();
  // the bell base
  const bell = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x - w, foot - 64);
    c.quadraticCurveTo(x - w * 1.6, foot - 24, x - w * 1.75, foot);
    c.lineTo(x + w * 1.75, foot);
    c.quadraticCurveTo(x + w * 1.6, foot - 24, x + w, foot - 64);
    c.closePath();
  };
  gilt(ctx, bell, { x: x - w * 1.8, y: foot - 66, w: w * 3.6, h: 66 }, { dir: 'v', line: 1.6, dim: 0.35 });
  within(ctx, bell, () => {
    ctx.strokeStyle = rgba(GOLD.deep, 0.5);
    ctx.lineWidth = 1.2;
    for (let i = -4; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * w * 0.24, foot - 64);
      ctx.quadraticCurveTo(x + i * w * 0.36, foot - 20, x + i * w * 0.42, foot);
      ctx.stroke();
    }
  });
}

// ——— the dais: three steps faced with glazed lions, a runner up them ———

const STEPS = [0, 1, 2].map((k) => ({ Z: 0.8 + k * 0.06, hw: 1.55 - k * 0.14, h0: k * 0.14, h1: (k + 1) * 0.14 }));
const PLAT = STEPS[2].h1;
export const DAIS_BOX: Box = (() => {
  const a = FP(-STEPS[0].hw, STEPS[0].Z, 0);
  const b = FP(STEPS[0].hw, STEPS[0].Z, 0);
  const t = FP(0, 1, PLAT);
  return { x: Math.floor(a[0]) - 6, y: Math.floor(t[1]) - 4, w: Math.ceil(b[0] - a[0]) + 12, h: Math.ceil(a[1] - t[1]) + 30 };
})();

/** A lion walking (glazed, gold on turquoise), our own: long body, the mane a ruff of points, the tail curled up. */
function lion(ctx: Ctx, x: number, y: number, s: number, dir: number, body: string, dark: string): void {
  // a lion striding, our own: a long low body, a heavy mane round the head and over the shoulders, the near legs
  // reaching out, the tail curling up to a tuft; facing dir. Foot line at y, s about a third of its length.
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.fillStyle = body;
  ctx.strokeStyle = dark;
  ctx.lineWidth = Math.max(0.6, s * 0.05);
  // body and legs
  ctx.beginPath();
  ctx.moveTo(-s * 1.2, -s * 0.62);
  ctx.quadraticCurveTo(-s * 0.3, -s * 0.78, s * 0.5, -s * 0.66);
  ctx.lineTo(s * 0.62, -s * 0.36);
  ctx.lineTo(s * 0.98, 0); // fore leg reaching
  ctx.lineTo(s * 0.8, 0);
  ctx.lineTo(s * 0.5, -s * 0.24);
  ctx.lineTo(s * 0.34, 0); // the other fore leg
  ctx.lineTo(s * 0.18, 0);
  ctx.lineTo(s * 0.26, -s * 0.3);
  ctx.quadraticCurveTo(-s * 0.3, -s * 0.24, -s * 0.78, -s * 0.3);
  ctx.lineTo(-s * 0.66, 0); // hind legs
  ctx.lineTo(-s * 0.84, 0);
  ctx.lineTo(-s * 1.0, -s * 0.22);
  ctx.lineTo(-s * 1.22, 0);
  ctx.lineTo(-s * 1.38, 0);
  ctx.lineTo(-s * 1.26, -s * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // the tail, curling up over the back to a tuft
  ctx.strokeStyle = body;
  ctx.lineWidth = Math.max(0.8, s * 0.09);
  ctx.beginPath();
  ctx.moveTo(-s * 1.22, -s * 0.56);
  ctx.bezierCurveTo(-s * 1.7, -s * 0.5, -s * 1.6, -s * 1.1, -s * 1.3, -s * 1.08);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(-s * 1.27, -s * 1.1, s * 0.1, s * 0.07, 0.6, 0, P2);
  ctx.fill();
  // the mane: a ruff of flame-shaped locks round the head and shoulders
  ctx.beginPath();
  const mx = s * 0.62;
  const my = -s * 0.78;
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI * 0.55 + (i / 12) * Math.PI * 1.6;
    const rad = s * (i % 2 ? 0.42 : 0.56);
    ctx.lineTo(mx + Math.cos(a) * rad, my + Math.sin(a) * rad * 0.95);
  }
  ctx.closePath();
  ctx.fillStyle = mixHex(body, dark, 0.25);
  ctx.fill();
  ctx.strokeStyle = dark;
  ctx.lineWidth = Math.max(0.6, s * 0.04);
  ctx.stroke();
  // the head and muzzle, the open jaw
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(s * 0.78, -s * 0.8, s * 0.26, s * 0.22, 0, 0, P2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(s * 0.9, -s * 0.86);
  ctx.lineTo(s * 1.18, -s * 0.78);
  ctx.lineTo(s * 1.14, -s * 0.62);
  ctx.lineTo(s * 0.92, -s * 0.66);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = dark;
  ctx.beginPath();
  ctx.moveTo(s * 1.16, -s * 0.7);
  ctx.lineTo(s * 0.98, -s * 0.7);
  ctx.stroke();
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.arc(s * 0.88, -s * 0.88, Math.max(0.5, s * 0.045), 0, P2);
  ctx.fill();
  // the ribs and haunch picked out in the glaze
  ctx.strokeStyle = rgba(dark, 0.6);
  ctx.lineWidth = Math.max(0.4, s * 0.03);
  ctx.beginPath();
  ctx.arc(-s * 0.88, -s * 0.4, s * 0.2, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();
  ctx.restore();
}

function dais(ctx: Ctx, r: R): void {
  // its contact with the floor
  const [ax, ay] = FP(-STEPS[0].hw, STEPS[0].Z);
  const [bx] = FP(STEPS[0].hw, STEPS[0].Z);
  crevice(ctx, ax, bx, ay, 8, 0.6, '#0a0206');
  for (const [k, st] of STEPS.entries()) {
    const fl = FP(-st.hw, st.Z, st.h0);
    const fr = FP(st.hw, st.Z, st.h0);
    const tl = FP(-st.hw, st.Z, st.h1);
    const tr = FP(st.hw, st.Z, st.h1);
    const bl = FP(-st.hw, 1, st.h1);
    const br = FP(st.hw, 1, st.h1);
    // the tread: pale polished stone, the fire's warmth at its ends
    const tread = polyPath([tl, tr, br, bl]);
    within(ctx, tread, () => {
      const tb = boxOfPts([tl, tr, br, bl], 0);
      vfill(ctx, tb.x, tb.y, tb.w, tb.h, [[0, '#6a4e48'], [1, '#94725e']]);
      surface(ctx, r, tb, '#86664e', { over: true, vary: 0.35, cells: 5, mottle: 0.35, strokes: 0.5, strokeAng: 0, strokeLen: 90, strokeW: 2, grain: 0.2, grainKind: 'speckle', seed: 261 + k });
      // dressed limestone slabs: their joints running back, a pale arris along the front edge
      for (let X = -st.hw + 0.38 + (k % 2) * 0.19; X < st.hw; X += 0.38) {
        const a = FP(X, st.Z, st.h1);
        const b2 = FP(X, 1, st.h1);
        ctx.strokeStyle = 'rgba(30,14,12,0.45)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(...a);
        ctx.lineTo(...b2);
        ctx.stroke();
      }
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = rgba(r() < 0.5 ? '#2a1814' : '#e8d0b0', 0.2);
        ctx.fillRect(tb.x + r() * tb.w, tb.y + r() * tb.h, 1.5, 1);
      }
      ctx.fillStyle = 'rgba(255,224,190,0.28)';
      ctx.fillRect(tb.x, tl[1] - 2, tb.w, 1.6);
      // the next step's riser throws its shade back along the tread
      vfill(ctx, tb.x, tb.y, tb.w, tb.h, [[0, 'rgba(14,4,8,0.5)'], [0.6, 'rgba(14,4,8,0.08)'], [1, 'rgba(14,4,8,0)']]);
      const g = ctx.createLinearGradient(tb.x, 0, tb.x + tb.w, 0);
      g.addColorStop(0, 'rgba(255,140,70,0.22)');
      g.addColorStop(0.3, 'rgba(255,140,70,0)');
      g.addColorStop(0.7, 'rgba(20,6,10,0.15)');
      g.addColorStop(1, 'rgba(255,140,70,0.12)');
      ctx.fillStyle = g;
      ctx.fillRect(tb.x, tb.y, tb.w, tb.h);
    });
    // the riser: glazed brick, a frieze of lions walking in towards the middle
    const riser = polyPath([fl, fr, tr, tl]);
    const rb = boxOfPts([fl, fr, tr, tl], 0);
    within(ctx, riser, () => {
      vfill(ctx, rb.x, rb.y, rb.w, rb.h, [[0, TURQ.body], [1, TURQ.shade]]);
      ctx.fillStyle = LAPIS.shade;
      ctx.fillRect(rb.x, rb.y, rb.w, 3);
      ctx.fillRect(rb.x, rb.y + rb.h - 3, rb.w, 3);
      const s = rb.h * 0.5;
      for (let x = rb.x + s * 2; x < rb.x + rb.w - s; x += s * 3.6) {
        if (Math.abs(x - VPX) < s * 3) continue;
        lion(ctx, x, rb.y + rb.h - 4, s, x < VPX ? 1 : -1, mixHex(GOLD.lit, '#f4e6c0', 0.25), TURQ.deep);
      }
      for (let y = rb.y; y < rb.y + rb.h; y += 6.5) {
        ctx.fillStyle = rgba(TURQ.deep, 0.4);
        ctx.fillRect(rb.x, y, rb.w, 0.9);
      }
      // the brazier light along it, dark in the middle
      const g = ctx.createLinearGradient(rb.x, 0, rb.x + rb.w, 0);
      g.addColorStop(0, 'rgba(255,150,80,0.25)');
      g.addColorStop(0.4, 'rgba(14,4,10,0.2)');
      g.addColorStop(0.6, 'rgba(14,4,10,0.2)');
      g.addColorStop(1, 'rgba(255,150,80,0.15)');
      ctx.fillStyle = g;
      ctx.fillRect(rb.x, rb.y, rb.w, rb.h);
    });
    // the nosing: a gilt edge lit along its top
    ctx.fillStyle = GOLD.shade;
    ctx.fillRect(tl[0], tl[1] - 1, tr[0] - tl[0], 3);
    ctx.fillStyle = rgba(GOLD.lit, 0.7);
    ctx.fillRect(tl[0], tl[1] - 1, tr[0] - tl[0], 1);
    ctx.strokeStyle = rgba('#140408', 0.8);
    ctx.lineWidth = 1.2;
    riser(ctx);
    ctx.stroke();
    // the runner over this step: crimson with a gold border, down the middle
    const rw = 0.46;
    const run = polyPath([FP(-rw, 1, st.h1), FP(rw, 1, st.h1), FP(rw, st.Z, st.h1), FP(rw, st.Z, st.h0), FP(-rw, st.Z, st.h0), FP(-rw, st.Z, st.h1)]);
    within(ctx, run, () => {
      const qb = boxOfPts([FP(-rw, 1, st.h1), FP(rw, st.Z, st.h0)], 2);
      ctx.fillStyle = CRIMSON.body;
      ctx.fillRect(qb.x, qb.y, qb.w, qb.h);
      const g = ctx.createLinearGradient(0, qb.y, 0, qb.y + qb.h);
      g.addColorStop(0, 'rgba(20,4,10,0.3)');
      g.addColorStop(0.55, 'rgba(255,160,120,0.06)');
      g.addColorStop(0.62, 'rgba(20,4,10,0.35)');
      g.addColorStop(1, 'rgba(20,4,10,0.45)');
      ctx.fillStyle = g;
      ctx.fillRect(qb.x, qb.y, qb.w, qb.h);
      for (const sx of [-1, 1]) {
        ctx.strokeStyle = rgba(GOLD.body, 0.75);
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(...FP(sx * (rw - 0.06), 1, st.h1));
        ctx.lineTo(...FP(sx * (rw - 0.06), st.Z, st.h1));
        ctx.lineTo(...FP(sx * (rw - 0.06), st.Z, st.h0));
        ctx.stroke();
      }
    });
  }
}

// ——— the throne under its great parasol ———

const TZ = 0.955;
const TP = (X: number, H: number) => FP(X, TZ, PLAT + H);
/** (tight: the crest clears the parasol's tassels above it, the fans stand clear either side) */
export const THRONE_BOX: Box = { x: 862, y: 330, w: 216, h: Math.ceil(FP(0, 0.93, PLAT)[1]) + 12 - 330 };

function throne(ctx: Ctx, r: R): void {
  void r;
  const s = 150 / TZ;
  const [cx] = TP(0, 0);
  const yP = TP(0, 0)[1];
  const ySeat = TP(0, 0.42)[1];
  const yTop = TP(0, 1.0)[1];
  const hw = 0.5 * s;
  // the back: a tall panel, gold frame round a crimson cushion, its crest our winged disc
  const back = (c: Ctx) => {
    c.beginPath();
    c.moveTo(cx - hw, ySeat);
    c.lineTo(cx - hw, yTop + 26);
    c.quadraticCurveTo(cx - hw, yTop, cx - hw + 26, yTop);
    c.lineTo(cx + hw - 26, yTop);
    c.quadraticCurveTo(cx + hw, yTop, cx + hw, yTop + 26);
    c.lineTo(cx + hw, ySeat);
    c.closePath();
  };
  // the parasol's pole, rising behind it
  gilt(ctx, rectP(cx - 4, 326, 8, yTop - 316), { x: cx - 4, y: 326, w: 8, h: yTop - 316 }, { dir: 'v', line: 1, dim: 0.3 });
  castShadow(ctx, back, 12, 10, 0.5, '#0a0208');
  gilt(ctx, back, { x: cx - hw, y: yTop, w: hw * 2, h: ySeat - yTop }, { dir: 'v', line: 2, dim: 0.25 });
  sunSide(ctx, back, { x: cx - hw, y: yTop, w: hw * 2, h: ySeat - yTop }, 0.22);
  const inset = rectP(cx - hw + 12, yTop + 14, hw * 2 - 24, ySeat - yTop - 18);
  within(ctx, inset, () => {
    const ib: Box = { x: cx - hw + 12, y: yTop + 14, w: hw * 2 - 24, h: ySeat - yTop - 18 };
    vfill(ctx, ib.x, ib.y, ib.w, ib.h, [[0, LAPIS.body], [1, LAPIS.deep]]);
    // buttoned: a lozenge of tufts, each puffed and shaded
    for (let y = ib.y + 14; y < ib.y + ib.h; y += 22) {
      for (let x = ib.x + 12 + (((y - ib.y) / 22) % 2) * 11; x < ib.x + ib.w; x += 22) {
        const g = ctx.createRadialGradient(x - 3, y - 3, 0, x, y, 13);
        g.addColorStop(0, 'rgba(140,170,255,0.2)');
        g.addColorStop(1, 'rgba(140,170,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - 13, y - 13, 26, 26);
        ctx.fillStyle = GOLD.body;
        ctx.beginPath();
        ctx.arc(x, y, 1.6, 0, P2);
        ctx.fill();
      }
    }
    // in the shadow of the parasol at the top, the fire on its sides
    vfill(ctx, ib.x, ib.y, ib.w, 50, [[0, 'rgba(10,2,8,0.45)'], [1, 'rgba(10,2,8,0)']]);
  });
  inset(ctx);
  ctx.strokeStyle = GOLD.deep;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // the uprights: posts with bud finials either side of the back
  for (const sd of [-1, 1]) {
    const px = cx + sd * (hw + 6);
    const post = rectP(px - 7, yTop + 4, 14, ySeat - yTop - 4);
    gilt(ctx, post, { x: px - 7, y: yTop, w: 14, h: ySeat - yTop }, { dir: 'v', line: 1.4, dim: 0.1 });
    const bud = (c: Ctx) => {
      c.beginPath();
      c.moveTo(px - 8, yTop + 6);
      c.quadraticCurveTo(px - 10, yTop - 8, px, yTop - 20);
      c.quadraticCurveTo(px + 10, yTop - 8, px + 8, yTop + 6);
      c.closePath();
    };
    gilt(ctx, bud, { x: px - 10, y: yTop - 20, w: 20, h: 26 }, { dir: 'r', line: 1.2 });
  }
  // the crest
  wingedDisc(ctx, cx, yTop - 7, 64, { disc: '#c8302a' });
  // the seat: a box of gold, its front carved with a row of rosettes, a crimson cushion with gold tassels on it
  const seatF = rectP(cx - hw - 14, ySeat - 4, hw * 2 + 28, 22);
  gilt(ctx, seatF, { x: cx - hw - 14, y: ySeat - 4, w: hw * 2 + 28, h: 22 }, { dir: 'h', line: 1.6, dim: 0.1 });
  for (let x = cx - hw; x <= cx + hw; x += 18) rosette(ctx, x, ySeat + 7, 5, rgba(GOLD.shade, 0.9), GOLD.hi, 8);
  const cushion = smoothPath([[cx - hw - 10, ySeat - 2], [cx - hw - 6, ySeat - 16], [cx, ySeat - 20], [cx + hw + 6, ySeat - 16], [cx + hw + 10, ySeat - 2], [cx, ySeat + 2]]);
  within(ctx, cushion, () => {
    vfill(ctx, cx - hw - 12, ySeat - 22, hw * 2 + 24, 26, [[0, CRIMSON.lit], [0.5, CRIMSON.body], [1, CRIMSON.shade]]);
  });
  cushion(ctx);
  ctx.strokeStyle = CRIMSON.deep;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  for (const sd of [-1, 1]) {
    ctx.strokeStyle = GOLD.body;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(cx + sd * (hw + 8), ySeat - 4);
    ctx.lineTo(cx + sd * (hw + 10), ySeat + 14);
    ctx.stroke();
    ctx.fillStyle = GOLD.lit;
    ctx.beginPath();
    ctx.ellipse(cx + sd * (hw + 10), ySeat + 18, 3, 6, 0, 0, P2);
    ctx.fill();
  }
  // the legs: turned, ringed, standing on lion's paws on drums
  for (const sd of [-1, 1]) {
    const lx = cx + sd * (hw + 2);
    const ly0 = ySeat + 18;
    const leg = (c: Ctx) => {
      c.beginPath();
      c.moveTo(lx - 7, ly0);
      c.lineTo(lx - 9, ly0 + (yP - ly0) * 0.3);
      c.quadraticCurveTo(lx - 14, ly0 + (yP - ly0) * 0.55, lx - 8, ly0 + (yP - ly0) * 0.72);
      c.lineTo(lx - 10, yP - 12);
      c.lineTo(lx + 10, yP - 12);
      c.lineTo(lx + 8, ly0 + (yP - ly0) * 0.72);
      c.quadraticCurveTo(lx + 14, ly0 + (yP - ly0) * 0.55, lx + 9, ly0 + (yP - ly0) * 0.3);
      c.lineTo(lx + 7, ly0);
      c.closePath();
    };
    gilt(ctx, leg, { x: lx - 14, y: ly0, w: 28, h: yP - ly0 }, { dir: 'v', line: 1.4, dim: 0.15 });
    for (const t of [0.3, 0.72]) {
      ctx.fillStyle = GOLD.shade;
      ctx.fillRect(lx - 10, ly0 + (yP - ly0) * t - 1, 20, 2.4);
    }
    // the paw: four toes over the drum
    const paw = smoothPath([[lx - 12, yP - 12], [lx + 12, yP - 12], [lx + 14, yP - 5], [lx + 6, yP - 3], [lx, yP - 5], [lx - 6, yP - 3], [lx - 14, yP - 5]]);
    gilt(ctx, paw, { x: lx - 14, y: yP - 14, w: 28, h: 12 }, { dir: 'r', line: 1.2 });
    groundShadow(ctx, lx + 5, yP, 18, 3, 0.55, '#140408');
  }
  // the footstool before it
  const fy = FP(0, 0.93, PLAT)[1];
  const fs = smoothPath([[cx - 42, fy - 14], [cx + 42, fy - 14], [cx + 44, fy - 2], [cx - 44, fy - 2]]);
  groundShadow(ctx, cx + 8, fy, 52, 5, 0.55, '#140408');
  gilt(ctx, fs, { x: cx - 44, y: fy - 16, w: 88, h: 16 }, { dir: 'h', line: 1.4, dim: 0.1 });
  ctx.fillStyle = CRIMSON.body;
  ctx.fillRect(cx - 36, fy - 19, 72, 6);
  ctx.fillStyle = rgba(CRIMSON.lit, 0.6);
  ctx.fillRect(cx - 36, fy - 19, 72, 2);
  // the sun's last light along its left flank, the fire's on its gold edges
  ctx.save();
  ctx.globalAlpha = 0.8;
  rim(ctx, back, 0.25, 3, '#ffb070');
  ctx.restore();
}

/** The great parasol over the throne, seen from below: its underside's ribs, its fringed skirt. A sprite (it
 * shudders when the floor shakes). */
export const PARASOL = { x: 960, rimY: 266, rx: 214, ry: 26, apex: 198, skirt: 22, hub: [960, 248] as Pt };
export const PARASOL_BOX: Box = { x: PARASOL.x - PARASOL.rx - 14, y: PARASOL.apex - 12, w: PARASOL.rx * 2 + 28, h: PARASOL.rimY + PARASOL.ry + PARASOL.skirt + 16 - (PARASOL.apex - 12) };
function parasol(ctx: Ctx, r: R): void {
  void r;
  const P = PARASOL;
  const [hx, hy] = P.hub;
  // the pole up from behind the throne
  gilt(ctx, rectP(hx - 4, hy, 8, 84), { x: hx - 4, y: hy, w: 8, h: 84 }, { dir: 'v', line: 1, dim: 0.3 });
  // the underside: the dome's inside, dark crimson, lit gold round its rim by the fires below
  const under = (c: Ctx) => {
    c.beginPath();
    c.moveTo(P.x - P.rx, P.rimY);
    c.bezierCurveTo(P.x - P.rx * 0.7, P.apex + 10, P.x - P.rx * 0.3, P.apex, P.x, P.apex);
    c.bezierCurveTo(P.x + P.rx * 0.3, P.apex, P.x + P.rx * 0.7, P.apex + 10, P.x + P.rx, P.rimY);
    c.ellipse(P.x, P.rimY, P.rx, P.ry, 0, 0, Math.PI, false);
    c.closePath();
  };
  within(ctx, under, () => {
    const g = ctx.createRadialGradient(hx, hy, 10, hx, hy, P.rx);
    g.addColorStop(0, '#0a1030');
    g.addColorStop(0.6, LAPIS.deep);
    g.addColorStop(1, LAPIS.shade);
    ctx.fillStyle = g;
    ctx.fillRect(P.x - P.rx, P.apex, P.rx * 2, P.rimY - P.apex + P.ry);
    // panels between the ribs, alternate ones saffron
    const n = 16;
    for (let i = 0; i < n; i++) {
      const a0 = Math.PI + (i / n) * Math.PI;
      const a1 = Math.PI + ((i + 1) / n) * Math.PI;
      if (i % 2) continue;
      ctx.fillStyle = rgba(LAPIS.body, 0.55);
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      for (let k = 0; k <= 6; k++) {
        const a = a0 + ((a1 - a0) * k) / 6;
        ctx.lineTo(P.x + Math.cos(a) * P.rx * 1.05, P.rimY + Math.sin(a) * (P.rimY - P.apex + 10));
      }
      ctx.closePath();
      ctx.fill();
    }
    // the ribs: gilt, radiating from the hub
    for (let i = 0; i <= n; i++) {
      const a = Math.PI + (i / n) * Math.PI;
      const ex = P.x + Math.cos(a) * P.rx;
      const ey = P.rimY + Math.sin(a) * (P.rimY - P.apex) * 0.9;
      ctx.strokeStyle = GOLD.shade;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.quadraticCurveTo((hx + ex) / 2, Math.min(hy, ey) - 6, ex, ey);
      ctx.stroke();
      ctx.strokeStyle = rgba(GOLD.lit, 0.5);
      ctx.lineWidth = 0.9;
      ctx.stroke();
    }
    // warm light from below round the rim
    const lg = ctx.createLinearGradient(0, P.apex, 0, P.rimY + P.ry);
    lg.addColorStop(0, 'rgba(255,150,80,0)');
    lg.addColorStop(1, 'rgba(255,150,80,0.25)');
    ctx.fillStyle = lg;
    ctx.fillRect(P.x - P.rx, P.apex, P.rx * 2, P.rimY - P.apex + P.ry);
  });
  under(ctx);
  ctx.strokeStyle = CRIMSON.deep;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // the hub
  gilt(ctx, ellP(hx, hy, 12, 7), { x: hx - 12, y: hy - 7, w: 24, h: 14 }, { dir: 'r', line: 1.2 });
  // the skirt: a band of gold cloth hanging from the near half of the rim, a lapis stripe, a scalloped hem
  const skirt = (c: Ctx) => {
    c.beginPath();
    c.ellipse(P.x, P.rimY, P.rx, P.ry, 0, Math.PI, 0, true);
    const n = 14;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI;
      const x = P.x + Math.cos(a) * P.rx;
      const y = P.rimY + Math.sin(a) * P.ry + P.skirt;
      if (i === 0) c.lineTo(x, y);
      else {
        const am = ((i - 0.5) / n) * Math.PI;
        c.quadraticCurveTo(P.x + Math.cos(am) * P.rx, P.rimY + Math.sin(am) * P.ry + P.skirt + 9, x, y);
      }
    }
    c.closePath();
  };
  gilt(ctx, skirt, { x: P.x - P.rx, y: P.rimY, w: P.rx * 2, h: P.ry + P.skirt + 10 }, { dir: 'v', line: 1.6, dim: 0.1 });
  within(ctx, skirt, () => {
    ctx.strokeStyle = LAPIS.body;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(P.x, P.rimY + 10, P.rx, P.ry, 0, 0, Math.PI);
    ctx.stroke();
    for (let i = 1; i < 14; i++) {
      const a = (i / 14) * Math.PI;
      rosette(ctx, P.x + Math.cos(a) * P.rx, P.rimY + 10 + Math.sin(a) * P.ry, 3.4, GOLD.lit, GOLD.hi, 6);
    }
  });
  // tassels from each scallop
  for (let i = 0; i <= 14; i++) {
    const a = (i / 14) * Math.PI;
    const x = P.x + Math.cos(a) * P.rx;
    const y = P.rimY + Math.sin(a) * P.ry + P.skirt;
    ctx.strokeStyle = GOLD.shade;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + 6);
    ctx.stroke();
    ctx.fillStyle = i % 2 ? CRIMSON.lit : GOLD.lit;
    ctx.beginPath();
    ctx.ellipse(x, y + 9, 2.2, 4, 0, 0, P2);
    ctx.fill();
  }
}

/** A fan on its stand (the attendants' flabellum): a fan of feathers on a gilt pole, its eye a gold disc. */
const FAN_BOX = (i: number): Box => {
  const f = XX.fans[i];
  return { x: f.x - 50, y: f.hy - 52, w: 100, h: f.y - f.hy + 60 };
};
function fan(ctx: Ctx, r: R, i: number): void {
  void r;
  const f = XX.fans[i];
  const rad = 46;
  groundShadow(ctx, f.x + 4, f.y, 16, 3, 0.5, '#140408');
  // the stand: a tripod foot and a long gilt pole
  gilt(ctx, rectP(f.x - 3, f.hy + 10, 6, f.y - f.hy - 18), { x: f.x - 3, y: f.hy, w: 6, h: f.y - f.hy }, { dir: 'v', line: 1, dim: 0.2 });
  const foot = smoothPath([[f.x - 16, f.y], [f.x - 4, f.y - 16], [f.x + 4, f.y - 16], [f.x + 16, f.y]]);
  gilt(ctx, foot, { x: f.x - 16, y: f.y - 16, w: 32, h: 16 }, { dir: 'v', line: 1.2, dim: 0.2 });
  // the feathers: a half wheel of long plumes in bands, each with its rib
  const n = 13;
  for (let k = 0; k < n; k++) {
    const a = Math.PI + 0.18 + (k / (n - 1)) * (Math.PI - 0.36);
    const ex = f.x + Math.cos(a) * rad;
    const ey = f.hy + 6 + Math.sin(a) * rad;
    const feather = (c: Ctx) => {
      c.beginPath();
      c.moveTo(f.x, f.hy + 8);
      c.quadraticCurveTo(f.x + Math.cos(a - 0.12) * rad * 0.7, f.hy + 6 + Math.sin(a - 0.12) * rad * 0.7, ex + Math.cos(a - 0.1) * 4, ey + Math.sin(a - 0.1) * 4);
      c.quadraticCurveTo(ex + Math.cos(a) * 8, ey + Math.sin(a) * 8, ex + Math.cos(a + 0.1) * 4, ey + Math.sin(a + 0.1) * 4);
      c.quadraticCurveTo(f.x + Math.cos(a + 0.12) * rad * 0.7, f.hy + 6 + Math.sin(a + 0.12) * rad * 0.7, f.x, f.hy + 8);
      c.closePath();
    };
    const col = k % 3 === 0 ? CRIMSON : k % 3 === 1 ? SAFFRON : LAPIS;
    ctx.save();
    feather(ctx);
    const g = ctx.createRadialGradient(f.x, f.hy + 8, 4, f.x, f.hy + 8, rad + 8);
    g.addColorStop(0, col.shade);
    g.addColorStop(0.6, col.body);
    g.addColorStop(1, col.lit);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = rgba(col.deep, 0.8);
    ctx.lineWidth = 0.9;
    ctx.stroke();
    ctx.restore();
    // the eye near its tip
    ctx.fillStyle = GOLD.lit;
    ctx.beginPath();
    ctx.arc(f.x + Math.cos(a) * rad * 0.8, f.hy + 6 + Math.sin(a) * rad * 0.8, 2.6, 0, P2);
    ctx.fill();
  }
  // the gilt boss the feathers spring from
  gilt(ctx, ellP(f.x, f.hy + 9, 9, 6), { x: f.x - 9, y: f.hy + 3, w: 18, h: 12 }, { dir: 'r', line: 1.1 });
  // in the dim at the back: shade over it, the fire's warmth on its outer side
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = 'rgba(14,4,10,0.25)';
  ctx.fillRect(f.x - 50, f.hy - 52, 100, f.y - f.hy + 60);
  ctx.restore();
}

// ——— the banners on the back beam (painted frames; in the still painted in place) ———

const BAN = { w: 66, h: 206, k: 1.5, amp: 7 };
const BANNER_TOP = XX.beam + 14;
/** One phase of a banner: hanging from a gilt bar on cords from the beam, rippling (frame origin: the bar's left). */
function bannerFrame(c: Ctx, ph: number, kind: number): void {
  c.save();
  c.translate(BAN.amp * 2, 0);
  clothFrame(c, 0, 6, BAN.w, BAN.h, ph, (cc, w, h) => {
    bannerCloth(cc, w, h, kind);
    // our winged disc embroidered near the top, a gold fringe at the hem
    wingedDisc(cc, w / 2, h * 0.16, w * 0.42, { col: GOLD.body, disc: kind === 0 ? '#c8302a' : '#24387e', line: rgba(GOLD.deep, 0.8), lw: 0.8 });
    cc.fillStyle = GOLD.body;
    for (let x = 1; x < w; x += 4) cc.fillRect(x, h - 6, 2, 6);
  }, { amp: BAN.amp, waves: 0.9, tail: 'point', light: '#ffe0c0', dark: '#4a1016' });
  // the bar it hangs from
  c.fillStyle = GOLD.shade;
  c.fillRect(-4, 3, BAN.w + 8, 5);
  c.fillStyle = GOLD.lit;
  c.fillRect(-4, 3, BAN.w + 8, 1.5);
  c.restore();
}
const BAN_FW = BAN.w + BAN.amp * 4;
const BAN_FH = BAN.h + 14;
function bannersStill(ctx: Ctx): void {
  for (const [i, b] of XX.banners.entries()) {
    const [cv, g] = makeCanvas(BAN_FW * BAN.k, BAN_FH * BAN.k);
    g.scale(BAN.k, BAN.k);
    bannerFrame(g, 0.2 + i * 0.4, b.kind);
    // its shadow on the hangings
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.filter = 'blur(6px) brightness(0)';
    ctx.drawImage(cv, b.x - BAN.w / 2 - BAN.amp * 2 + 8, BANNER_TOP + 6, BAN_FW, BAN_FH);
    ctx.restore();
    ctx.drawImage(cv, b.x - BAN.w / 2 - BAN.amp * 2, BANNER_TOP, BAN_FW, BAN_FH);
  }
}
const BANNER_CORDS_BOX: Box = { x: XX.banners[0].x - 40, y: XX.beam - 2, w: XX.banners[1].x - XX.banners[0].x + 80, h: 20 };
function bannerCords(ctx: Ctx): void {
  for (const b of XX.banners) {
    ctx.strokeStyle = GOLD.shade;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(b.x - BAN.w / 2 + 4, XX.beam);
    ctx.lineTo(b.x - BAN.w / 2 + 4, BANNER_TOP + 3);
    ctx.moveTo(b.x + BAN.w / 2 - 4, XX.beam);
    ctx.lineTo(b.x + BAN.w / 2 - 4, BANNER_TOP + 3);
    ctx.stroke();
  }
}

// ——— the incense burners ———

const INC_BOX = (i: number): Box => {
  const s = XX.incense[i];
  return { x: s.x - 34, y: s.top - 16, w: 68, h: s.y - s.top + 24 };
};
function incense(ctx: Ctx, r: R, i: number): void {
  void r;
  const s = XX.incense[i];
  const x = s.x;
  // the stand: three lion's legs, a slender fluted stem, a bowl with a domed and pierced lid (a little tower)
  for (const lx of [-16, 0, 16]) {
    const leg = smoothPath([[x + lx * 0.3 - 2, s.y - 22], [x + lx - 3, s.y - 2], [x + lx + 3, s.y - 2], [x + lx * 0.3 + 2, s.y - 22]]);
    gilt(ctx, leg, { x: x + lx - 4, y: s.y - 24, w: 8, h: 24 }, { dir: 'v', line: 1, dim: lx === 0 ? 0.35 : 0.1 });
  }
  const stem = rectP(x - 3.5, s.top + 34, 7, s.y - s.top - 54);
  gilt(ctx, stem, { x: x - 3.5, y: s.top + 30, w: 7, h: s.y - s.top - 50 }, { dir: 'v', line: 1, dim: 0.15 });
  for (const t of [0.3, 0.62]) gilt(ctx, ellP(x, s.top + 34 + (s.y - s.top - 54) * t, 7, 3), { x: x - 7, y: s.top, w: 14, h: 6 }, { dir: 'r', line: 0.9 });
  const bowl = smoothPath([[x - 18, s.top + 22], [x + 18, s.top + 22], [x + 12, s.top + 34], [x - 12, s.top + 34]]);
  gilt(ctx, bowl, { x: x - 18, y: s.top + 20, w: 36, h: 16 }, { dir: 'v', line: 1.2 });
  const lid = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x - 15, s.top + 22);
    c.quadraticCurveTo(x - 15, s.top + 4, x, s.top - 2);
    c.quadraticCurveTo(x + 15, s.top + 4, x + 15, s.top + 22);
    c.closePath();
  };
  gilt(ctx, lid, { x: x - 15, y: s.top - 2, w: 30, h: 24 }, { dir: 'v', line: 1.2 });
  sunSide(ctx, bowl, { x: x - 18, y: s.top + 20, w: 36, h: 16 }, 0.3);
  // the piercings, glowing with the embers inside
  for (let k = 0; k < 7; k++) {
    const px = x - 9 + (k % 4) * 6 + (k > 3 ? 3 : 0);
    const py = s.top + 10 + (k > 3 ? 6 : 0);
    ctx.fillStyle = '#ffb060';
    ctx.beginPath();
    ctx.ellipse(px, py, 1.4, 2.2, 0, 0, P2);
    ctx.fill();
  }
  // the finial bird
  ctx.fillStyle = GOLD.body;
  ctx.beginPath();
  ctx.ellipse(x, s.top - 5, 3, 4, 0, 0, P2);
  ctx.fill();
}

// ——— the tribute heaped before the dais ———

export const TRIBUTE_L_BOX: Box = { x: 598, y: 574, w: 284, h: 92 };
export const TRIBUTE_R_BOX: Box = { x: 1078, y: 554, w: 260, h: 112 };
/** Gold vessels on the heap that rock on springs at a stomp (sprites): the ewer and the cup (foot x, y). */
export const EWER: Pt = [774, 598];
export const CUP: Pt = [1150, 604];
const EWER_BOX: Box = { x: EWER[0] - 16, y: EWER[1] - 40, w: 32, h: 42 };
const CUP_BOX: Box = { x: CUP[0] - 16, y: CUP[1] - 22, w: 32, h: 24 };

function chest(ctx: Ctx, x: number, y: number, w: number, h: number, d: number, open: boolean): void {
  // a cedar chest bound in bronze: front, top (seen from above a little), bronze corners and a lock plate
  groundShadow(ctx, x + w * 0.1, y, w * 0.65, 6, 0.6, '#0e0206');
  const front = rectP(x - w / 2, y - h, w, h);
  ctx.save();
  front(ctx);
  ctx.fillStyle = '#5a2c1a';
  ctx.fill();
  ctx.clip();
  for (let k = 0; k < 6; k++) {
    ctx.strokeStyle = rgba('#2a120a', 0.5);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y - h + (k + 0.5) * (h / 6) + Math.sin(k) * 2);
    ctx.lineTo(x + w / 2, y - h + (k + 0.5) * (h / 6) - Math.sin(k) * 2);
    ctx.stroke();
  }
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  g.addColorStop(0, 'rgba(255,150,90,0.22)');
  g.addColorStop(1, 'rgba(10,2,6,0.35)');
  ctx.fillStyle = g;
  ctx.fillRect(x - w / 2, y - h, w, h);
  ctx.restore();
  front(ctx);
  ctx.strokeStyle = '#1a0806';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  for (const bx of [x - w / 2 + 2, x + w / 2 - 6]) {
    ctx.fillStyle = BRONZE.body;
    ctx.fillRect(bx, y - h, 4, h);
    ctx.fillStyle = rgba(BRONZE.lit, 0.6);
    ctx.fillRect(bx, y - h, 1.2, h);
  }
  ctx.fillStyle = BRONZE.body;
  ctx.fillRect(x - 5, y - h + 3, 10, 9);
  ctx.fillStyle = BRONZE.deep;
  ctx.fillRect(x - 1, y - h + 6, 2, 4);
  if (!open) {
    const top = polyPath([[x - w / 2, y - h], [x + w / 2, y - h], [x + w / 2 - d * 0.3, y - h - d], [x - w / 2 - d * 0.3, y - h - d]]);
    ctx.save();
    top(ctx);
    ctx.fillStyle = '#7a4024';
    ctx.fill();
    ctx.fillStyle = 'rgba(255,170,110,0.18)';
    ctx.fill();
    ctx.strokeStyle = '#1a0806';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  } else {
    // open: the lid thrown back, the inside heaped with coin catching the light
    const lid = polyPath([[x - w / 2 - 2, y - h - 2], [x + w / 2 + 2, y - h - 2], [x + w / 2 + 4, y - h - h * 0.9], [x - w / 2 - 4, y - h - h * 0.9]]);
    ctx.save();
    lid(ctx);
    ctx.fillStyle = '#3a1a10';
    ctx.fill();
    ctx.strokeStyle = '#1a0806';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = BRONZE.body;
    ctx.fillRect(x - w / 2 - 2, y - h - h * 0.6, w + 4, 3);
    const heap = smoothPath([[x - w / 2 + 2, y - h + 2], [x - w * 0.3, y - h - 8], [x, y - h - 12], [x + w * 0.3, y - h - 9], [x + w / 2 - 2, y - h + 2]]);
    gilt(ctx, heap, { x: x - w / 2, y: y - h - 14, w, h: 16 }, { dir: 'r', line: 1 });
    for (let k = 0; k < 18; k++) {
      const cx = x - w * 0.4 + ((k * 37) % 100) / 100 * w * 0.8;
      const cy = y - h - 2 - ((k * 53) % 10);
      ctx.strokeStyle = rgba(GOLD.shade, 0.9);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 3, 1.5, 0, 0, P2);
      ctx.stroke();
    }
  }
}
function amphora(ctx: Ctx, x: number, y: number, h: number, lean: number, col: string): void {
  groundShadow(ctx, x + 5, y + 1, h * 0.26, 3.5, 0.6, '#0e0206');
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lean);
  const w = h * 0.34;
  const body = (c: Ctx) => {
    c.beginPath();
    c.moveTo(-w * 0.18, -h);
    c.lineTo(w * 0.18, -h);
    c.lineTo(w * 0.16, -h * 0.84);
    c.quadraticCurveTo(w * 0.62, -h * 0.74, w * 0.5, -h * 0.42);
    c.quadraticCurveTo(w * 0.36, -h * 0.12, w * 0.08, 0);
    c.lineTo(-w * 0.08, 0);
    c.quadraticCurveTo(-w * 0.36, -h * 0.12, -w * 0.5, -h * 0.42);
    c.quadraticCurveTo(-w * 0.62, -h * 0.74, -w * 0.16, -h * 0.84);
    c.closePath();
  };
  ctx.save();
  body(ctx);
  const g = ctx.createLinearGradient(-w * 0.6, 0, w * 0.6, 0);
  g.addColorStop(0, shade(col, -0.2));
  g.addColorStop(0.3, shade(col, 0.25));
  g.addColorStop(0.7, col);
  g.addColorStop(1, shade(col, -0.5));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  // a painted band
  ctx.fillStyle = rgba('#1a0a08', 0.7);
  ctx.fillRect(-w, -h * 0.6, w * 2, h * 0.08);
  ctx.restore();
  body(ctx);
  ctx.strokeStyle = '#1a0806';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.strokeStyle = shade(col, -0.3);
  ctx.lineWidth = 2;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * w * 0.16, -h * 0.94);
    ctx.quadraticCurveTo(s * w * 0.46, -h * 0.94, s * w * 0.4, -h * 0.74);
    ctx.stroke();
  }
  ctx.restore();
}
function bolt(ctx: Ctx, x: number, y: number, len: number, rad: number, col: string, stripe: string): void {
  // a roll of dyed cloth lying on the carpet: soft, sagging a little in the middle, its loose end fringed
  groundShadow(ctx, x + 4, y + 1, len * 0.55, 4, 0.55, '#0e0206');
  const x0 = x - len / 2;
  const x1 = x + len / 2;
  const body = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x0, y - rad * 0.2);
    c.quadraticCurveTo(x0 - rad * 0.5, y - rad, x0 + rad * 0.2, y - rad * 1.9);
    c.quadraticCurveTo(x, y - rad * 1.55, x1 - rad * 0.2, y - rad * 1.9);
    c.quadraticCurveTo(x1 + rad * 0.5, y - rad, x1, y - rad * 0.2);
    c.quadraticCurveTo(x, y + rad * 0.15, x0, y - rad * 0.2);
    c.closePath();
  };
  ctx.save();
  body(ctx);
  const g = ctx.createLinearGradient(0, y - rad * 2, 0, y);
  g.addColorStop(0, shade(col, 0.28));
  g.addColorStop(0.45, col);
  g.addColorStop(1, shade(col, -0.5));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  // its woven stripes, bending over the roll
  ctx.strokeStyle = rgba(stripe, 0.7);
  ctx.lineWidth = len * 0.04;
  for (let k = 0; k < 3; k++) {
    const sx = x0 + len * (0.22 + k * 0.26);
    ctx.beginPath();
    ctx.moveTo(sx, y + 2);
    ctx.quadraticCurveTo(sx - rad * 0.3, y - rad, sx, y - rad * 2.2);
    ctx.stroke();
  }
  // the sun on its left end
  const lg = ctx.createLinearGradient(x0, 0, x1, 0);
  lg.addColorStop(0, 'rgba(255,170,110,0.25)');
  lg.addColorStop(0.4, 'rgba(255,170,110,0)');
  ctx.fillStyle = lg;
  ctx.fillRect(x0 - rad, y - rad * 2.2, len + rad * 2, rad * 2.4);
  ctx.restore();
  body(ctx);
  ctx.strokeStyle = rgba('#14040a', 0.85);
  ctx.lineWidth = 1;
  ctx.stroke();
  // the loose end lying out on the carpet, fringed
  const flap = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x1 - rad * 0.4, y - rad * 0.3);
    c.quadraticCurveTo(x1 + rad * 0.8, y - rad * 0.1, x1 + rad * 1.6, y + 1);
    c.lineTo(x1 + rad * 1.7, y + 3);
    c.lineTo(x1 - rad * 0.2, y + 2);
    c.closePath();
  };
  ctx.fillStyle = shade(col, -0.15);
  flap(ctx);
  ctx.fill();
  ctx.strokeStyle = rgba('#14040a', 0.7);
  ctx.stroke();
  ctx.strokeStyle = rgba(stripe, 0.8);
  ctx.lineWidth = 0.8;
  for (let k = 0; k < 6; k++) {
    const fx = x1 + rad * (1.6 + k * 0.05);
    ctx.beginPath();
    ctx.moveTo(fx - k * 0.4, y + 1 + k * 0.3);
    ctx.lineTo(fx + 3, y + 2.5 + k * 0.3);
    ctx.stroke();
  }
}
/** A bale of folded cloth bound with cords (soft, its folds showing at the side). */
function bale(ctx: Ctx, x: number, y: number, w: number, h: number, col: string, band: string): void {
  groundShadow(ctx, x + 4, y + 1, w * 0.6, 4, 0.55, '#0e0206');
  const p = smoothPath([[x - w / 2, y], [x - w / 2 - 2, y - h * 0.5], [x - w / 2 + 2, y - h], [x, y - h - 3], [x + w / 2 - 2, y - h], [x + w / 2 + 2, y - h * 0.5], [x + w / 2, y], [x, y + 2]]);
  ctx.save();
  p(ctx);
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  g.addColorStop(0, shade(col, 0.25));
  g.addColorStop(0.5, col);
  g.addColorStop(1, shade(col, -0.45));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  // the folded layers seen at its side
  ctx.strokeStyle = rgba('#14040a', 0.35);
  ctx.lineWidth = 1;
  for (let k = 1; k < 5; k++) {
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y - (h * k) / 5);
    ctx.quadraticCurveTo(x, y - (h * k) / 5 + 2, x + w / 2, y - (h * k) / 5);
    ctx.stroke();
  }
  ctx.fillStyle = rgba(band, 0.65);
  ctx.fillRect(x - w / 2, y - h * 0.62, w, h * 0.12);
  ctx.restore();
  p(ctx);
  ctx.strokeStyle = rgba('#14040a', 0.85);
  ctx.lineWidth = 1;
  ctx.stroke();
  // the cords crossing it
  ctx.strokeStyle = '#c8a070';
  ctx.lineWidth = 1.6;
  for (const cx of [x - w * 0.22, x + w * 0.22]) {
    ctx.beginPath();
    ctx.moveTo(cx, y + 1);
    ctx.quadraticCurveTo(cx + 2, y - h * 0.5, cx, y - h - 2);
    ctx.stroke();
  }
}
/** A tusk of ivory lying curved on the heap. */
function tusk(ctx: Ctx, x: number, y: number, len: number, flip: number): void {
  const p = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + flip * len * 0.5, y - len * 0.42, x + flip * len, y - len * 0.2);
    c.quadraticCurveTo(x + flip * len * 0.5, y - len * 0.3, x + flip * 2, y - 8);
    c.closePath();
  };
  groundShadow(ctx, x + flip * len * 0.5 + 4, y + 1, len * 0.45, 3, 0.45, '#0e0206');
  ctx.save();
  p(ctx);
  const g = ctx.createLinearGradient(0, y - len * 0.4, 0, y);
  g.addColorStop(0, '#fff4dc');
  g.addColorStop(0.6, '#e0ceaa');
  g.addColorStop(1, '#8a7656');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = '#3a2c1c';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}
/** Gold ingots stacked crosswise. */
function ingots(ctx: Ctx, x: number, y: number): void {
  groundShadow(ctx, x + 4, y + 1, 26, 3, 0.55, '#0e0206');
  for (let row = 0; row < 3; row++) {
    for (let k = 0; k < 3 - row; k++) {
      const ix = x - 18 + row * 9 + k * 18;
      const iy = y - row * 7;
      const p = polyPath([[ix - 8, iy], [ix + 8, iy], [ix + 6, iy - 6], [ix - 6, iy - 6]]);
      gilt(ctx, p, { x: ix - 8, y: iy - 6, w: 16, h: 6 }, { dir: 'h', line: 0.8 });
    }
  }
}
/** A captured bronze shield of the Greeks leaning on the heap (a lambda: as on the wall at the Hot Gates). */
function captured(ctx: Ctx, x: number, y: number, rad: number): void {
  groundShadow(ctx, x + 6, y, rad * 0.9, 4, 0.55, '#0e0206');
  ctx.save();
  ctx.translate(x, y - rad);
  ctx.scale(0.9, 1);
  ctx.rotate(-0.12);
  const disc = ellP(0, 0, rad, rad);
  gilt(ctx, disc, { x: -rad, y: -rad, w: rad * 2, h: rad * 2 }, { dir: 'r', line: 1.4, dim: 0.35 });
  ctx.strokeStyle = BRONZE.deep;
  ctx.lineWidth = rad * 0.14;
  ctx.beginPath();
  ctx.arc(0, 0, rad * 0.86, 0, P2);
  ctx.stroke();
  ctx.strokeStyle = '#7a1a1a';
  ctx.lineWidth = rad * 0.14;
  ctx.beginPath();
  ctx.moveTo(-rad * 0.42, rad * 0.4);
  ctx.lineTo(0, -rad * 0.5);
  ctx.lineTo(rad * 0.42, rad * 0.4);
  ctx.stroke();
  // verdigris and a dent
  ctx.fillStyle = rgba('#4a8a6a', 0.35);
  ctx.beginPath();
  ctx.ellipse(rad * 0.3, rad * 0.4, rad * 0.3, rad * 0.16, 0.4, 0, P2);
  ctx.fill();
  ctx.restore();
}
function vessel(ctx: Ctx, x: number, y: number, h: number, kind: 'ewer' | 'cup' | 'bowl' | 'horn'): void {
  groundShadow(ctx, x + 2, y, h * 0.4, 2.5, 0.55, '#0e0206');
  let p: PathFn;
  if (kind === 'ewer') {
    p = (c) => {
      c.beginPath();
      c.moveTo(x - h * 0.14, y);
      c.quadraticCurveTo(x - h * 0.34, y - h * 0.4, x - h * 0.08, y - h * 0.66);
      c.lineTo(x - h * 0.1, y - h * 0.86);
      c.lineTo(x + h * 0.22, y - h * 0.98);
      c.lineTo(x + h * 0.08, y - h * 0.82);
      c.lineTo(x + h * 0.08, y - h * 0.66);
      c.quadraticCurveTo(x + h * 0.34, y - h * 0.4, x + h * 0.14, y);
      c.closePath();
    };
  } else if (kind === 'cup') {
    p = (c) => {
      c.beginPath();
      c.moveTo(x - h * 0.4, y - h);
      c.lineTo(x + h * 0.4, y - h);
      c.quadraticCurveTo(x + h * 0.36, y - h * 0.4, x + h * 0.06, y - h * 0.34);
      c.lineTo(x + h * 0.06, y - h * 0.1);
      c.lineTo(x + h * 0.26, y);
      c.lineTo(x - h * 0.26, y);
      c.lineTo(x - h * 0.06, y - h * 0.1);
      c.lineTo(x - h * 0.06, y - h * 0.34);
      c.quadraticCurveTo(x - h * 0.36, y - h * 0.4, x - h * 0.4, y - h);
      c.closePath();
    };
  } else if (kind === 'bowl') {
    p = (c) => {
      c.beginPath();
      c.moveTo(x - h, y - h * 0.5);
      c.lineTo(x + h, y - h * 0.5);
      c.quadraticCurveTo(x + h * 0.8, y, x, y);
      c.quadraticCurveTo(x - h * 0.8, y, x - h, y - h * 0.5);
      c.closePath();
    };
  } else {
    // a drinking horn ending in a ram's head, lying on its side
    p = (c) => {
      c.beginPath();
      c.moveTo(x - h, y - h * 0.5);
      c.quadraticCurveTo(x - h * 0.2, y - h * 0.36, x + h * 0.5, y - h * 0.24);
      c.quadraticCurveTo(x + h * 0.9, y - h * 0.4, x + h, y - h * 0.08);
      c.quadraticCurveTo(x + h * 0.7, y + h * 0.02, x + h * 0.4, y);
      c.quadraticCurveTo(x - h * 0.3, y, x - h, y - h * 0.1);
      c.closePath();
    };
  }
  gilt(ctx, p, { x: x - h, y: y - h, w: h * 2, h }, { dir: kind === 'horn' || kind === 'bowl' ? 'h' : 'v', line: 1.1 });
  if (kind === 'cup' || kind === 'bowl') {
    const top = kind === 'cup' ? y - h : y - h * 0.5;
    const rx = kind === 'cup' ? h * 0.4 : h;
    ctx.fillStyle = GOLD.shade;
    ctx.beginPath();
    ctx.ellipse(x, top, rx, rx * 0.22, 0, 0, P2);
    ctx.fill();
    ctx.strokeStyle = GOLD.lit;
    ctx.lineWidth = 0.9;
    ctx.stroke();
  }
}
function ewerSprite(ctx: Ctx): void {
  vessel(ctx, EWER[0], EWER[1], 34, 'ewer');
}
function cupSprite(ctx: Ctx): void {
  vessel(ctx, CUP[0], CUP[1], 20, 'cup');
}

function tribute(ctx: Ctx, r: R, sd: -1 | 1): void {
  void r;
  if (sd < 0) {
    // the left heap: bales of folded cloth, ivory tusks, gold ingots, a closed chest with the ewer on it, an amphora,
    // the captured shield
    bale(ctx, 640, 628, 50, 30, '#5a2a7a', '#e0b048');
    bale(ctx, 646, 600, 40, 22, '#b07a1e', '#26406e');
    tusk(ctx, 616, 648, 70, 1);
    tusk(ctx, 628, 652, 58, 1);
    ingots(ctx, 690, 654);
    chest(ctx, 770, 640, 82, 40, 14, false);
    amphora(ctx, 836, 646, 64, 0.22, '#a05a34');
    captured(ctx, 712, 652, 22);
    vessel(ctx, 816, 644, 12, 'bowl');
    vessel(ctx, 742, 600, 12, 'cup');
    return;
  }
  // the right heap: the open chest spilling coin, an amphora standing, a horn, cloth, coin on the carpet
  amphora(ctx, 1258, 636, 70, -0.06, '#8a4a30');
  bolt(ctx, 1278, 648, 64, 9, '#8a1a26', '#e8c058');
  chest(ctx, XX.chest[0], XX.chest[1] + 22, 86, 40, 14, true);
  vessel(ctx, 1110, 646, 22, 'horn');
  // coin run out over the lip and down onto the carpet
  for (let k = 0; k < 26; k++) {
    const t = k / 26;
    const cx = XX.chest[0] - 30 - t * 60 + Math.sin(k * 2.3) * 8;
    const cy = XX.chest[1] - 14 + t * 34 + Math.sin(k * 1.7) * 3;
    gilt(ctx, ellP(cx, cy, 3.4, 1.7), { x: cx - 3.4, y: cy - 1.7, w: 6.8, h: 3.4 }, { dir: 'r', line: 0.7 });
  }
}

// ——— the braziers ———

const BRZ_BOX = (i: number): Box => {
  const b = XX.braziers[i];
  return { x: b.x - 76, y: b.rim - 18, w: 152, h: b.y - b.rim + 30 };
};
const BOWL = { rx: 64, ry: 13, d: 34 };
/** A cylinder band seen a little from above (a step of the base, a ring): its side lit round, its top an ellipse. */
function drum(ctx: Ctx, x: number, top: number, rx: number, ry: number, h: number, dim = 0, topLit = 0.35): void {
  const side = (c: Ctx) => {
    c.beginPath();
    c.ellipse(x, top, rx, ry, 0, Math.PI, 0, true);
    c.lineTo(x + rx, top + h);
    c.ellipse(x, top + h, rx, ry, 0, 0, Math.PI);
    c.closePath();
  };
  gilt(ctx, side, { x: x - rx, y: top - ry, w: rx * 2, h: h + ry * 2 }, { dir: 'v', line: 1.2, dim, pal: BRZ });
  const cap = ellP(x, top, rx, ry);
  ctx.save();
  cap(ctx);
  ctx.fillStyle = mixHex(BRZ.body, BRZ.lit, topLit);
  ctx.fill();
  ctx.strokeStyle = rgba(BRZ.deep, 0.8);
  ctx.lineWidth = 1.1;
  ctx.stroke();
  ctx.restore();
}
/** A brazier of our own: a heavy cast-bronze fire bowl with a thick rim and a band of rosettes, on a calyx of
 * petals, a fluted pedestal with a ring at its waist, and a stepped round base sitting on the carpet. Lit by its own
 * fire from above and the low sun from the left. */
function brazier(ctx: Ctx, r: R, i: number): void {
  void r;
  const b = XX.braziers[i];
  const x = b.x;
  const fy = b.y;
  // its contact with the carpet, and the fire's light round its foot
  groundShadow(ctx, x + 8, fy + 1, 66, 9, 0.6, '#0e0206');
  // the stepped base: two drums
  drum(ctx, x, fy - 12, 54, 9, 11, 0.35, 0.3);
  drum(ctx, x, fy - 23, 42, 7, 9, 0.25, 0.4);
  // the foot: a bell flaring from the shaft to the base
  const bell = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x - 13, fy - 66);
    c.quadraticCurveTo(x - 16, fy - 34, x - 34, fy - 25);
    c.ellipse(x, fy - 25, 34, 6, 0, Math.PI, 0, true);
    c.quadraticCurveTo(x + 16, fy - 34, x + 13, fy - 66);
    c.closePath();
  };
  gilt(ctx, bell, { x: x - 34, y: fy - 66, w: 68, h: 42 }, { dir: 'v', line: 1.3, dim: 0.2, pal: BRZ });
  // the shaft: fluted, a ring at its waist
  const top = b.rim + BOWL.d + 14;
  const shaft = rectP(x - 11, top, 22, fy - 66 - top + 2);
  gilt(ctx, shaft, { x: x - 11, y: top, w: 22, h: fy - 66 - top }, { dir: 'v', line: 1.2, dim: 0.15, pal: BRZ });
  within(ctx, shaft, () => {
    for (let k = -2; k <= 2; k++) {
      ctx.fillStyle = rgba(BRZ.deep, 0.35);
      ctx.fillRect(x + k * 4.4 - 0.7, top, 1.4, fy - 66 - top);
    }
  });
  drum(ctx, x, (top + fy - 66) / 2 - 4, 17, 4, 7, 0.1, 0.5);
  // the calyx: a cup of petals under the bowl
  const calyx = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x - 12, top + 4);
    c.quadraticCurveTo(x - 22, top - 4, x - 40, b.rim + BOWL.d - 2);
    c.lineTo(x + 40, b.rim + BOWL.d - 2);
    c.quadraticCurveTo(x + 22, top - 4, x + 12, top + 4);
    c.closePath();
  };
  gilt(ctx, calyx, { x: x - 40, y: b.rim + BOWL.d - 4, w: 80, h: top - b.rim - BOWL.d + 10 }, { dir: 'v', line: 1.2, dim: 0.25, pal: BRZ });
  within(ctx, calyx, () => {
    ctx.strokeStyle = rgba(BRZ.deep, 0.55);
    ctx.lineWidth = 1.1;
    for (let k = -4; k <= 4; k++) {
      ctx.beginPath();
      ctx.moveTo(x + k * 2.6, top + 4);
      ctx.quadraticCurveTo(x + k * 6, top - 4, x + k * 9.6, b.rim + BOWL.d - 2);
      ctx.stroke();
    }
  });
  // the bowl: deep, round-bellied, a thick rolled rim, a band of cast rosettes; soot under the lip
  const bowl = (c: Ctx) => {
    c.beginPath();
    c.ellipse(x, b.rim, BOWL.rx, BOWL.ry, 0, Math.PI, 0, true);
    c.bezierCurveTo(x + BOWL.rx, b.rim + BOWL.d * 0.7, x + BOWL.rx * 0.5, b.rim + BOWL.d + 6, x, b.rim + BOWL.d + 6);
    c.bezierCurveTo(x - BOWL.rx * 0.5, b.rim + BOWL.d + 6, x - BOWL.rx, b.rim + BOWL.d * 0.7, x - BOWL.rx, b.rim);
    c.closePath();
  };
  gilt(ctx, bowl, { x: x - BOWL.rx, y: b.rim, w: BOWL.rx * 2, h: BOWL.d + 6 }, { dir: 'v', line: 1.6, dim: 0.1, pal: BRZ });
  within(ctx, bowl, () => {
    vfill(ctx, x - BOWL.rx, b.rim, BOWL.rx * 2, 16, [[0, 'rgba(24,10,6,0.6)'], [1, 'rgba(24,10,6,0)']]);
    // the cast band
    ctx.fillStyle = rgba(BRZ.deep, 0.5);
    ctx.fillRect(x - BOWL.rx, b.rim + 15, BOWL.rx * 2, 1.4);
    ctx.fillRect(x - BOWL.rx, b.rim + 26, BOWL.rx * 2, 1.4);
    for (let k = -4; k <= 4; k++) {
      const rx = x + k * 13 * (1 - Math.abs(k) * 0.03);
      rosette(ctx, rx, b.rim + 21, 4.6, rgba(BRZ.lit, 0.8), BRZ.hi, 8);
    }
    // the sun on its left flank, the shade turning away on the right, and the coals' glow up under the rim
    const sg = ctx.createLinearGradient(x - BOWL.rx, 0, x + BOWL.rx, 0);
    sg.addColorStop(0, 'rgba(255,170,100,0.3)');
    sg.addColorStop(0.35, 'rgba(255,170,100,0)');
    sg.addColorStop(0.75, 'rgba(20,10,30,0)');
    sg.addColorStop(1, 'rgba(20,10,30,0.35)');
    ctx.fillStyle = sg;
    ctx.fillRect(x - BOWL.rx, b.rim, BOWL.rx * 2, BOWL.d + 8);
  });
  // the coals heaped in its mouth (the far inside of the rim dark, the bed glowing)
  ctx.beginPath();
  ctx.ellipse(x, b.rim, BOWL.rx - 6, BOWL.ry - 3, 0, 0, P2);
  ctx.fillStyle = '#2a0a06';
  ctx.fill();
  const cg = ctx.createRadialGradient(x, b.rim, 2, x, b.rim, BOWL.rx - 6);
  cg.addColorStop(0, 'rgba(255,210,120,0.95)');
  cg.addColorStop(0.5, 'rgba(255,110,30,0.8)');
  cg.addColorStop(1, 'rgba(120,20,6,0.3)');
  ctx.save();
  ctx.translate(x, b.rim);
  ctx.scale(1, (BOWL.ry - 3) / (BOWL.rx - 6));
  ctx.translate(-x, -b.rim);
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.arc(x, b.rim, BOWL.rx - 6, 0, P2);
  ctx.fill();
  ctx.restore();
  for (let k = 0; k < 22; k++) {
    const a = (k / 22) * P2;
    const rr2 = 0.3 + ((k * 37) % 10) / 14;
    ctx.fillStyle = k % 3 ? 'rgba(60,14,6,0.7)' : 'rgba(255,230,160,0.9)';
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * (BOWL.rx - 14) * rr2, b.rim + Math.sin(a) * (BOWL.ry - 5) * rr2, 4, 2.2, 0, 0, P2);
    ctx.fill();
  }
  // the thick rolled rim: its near lip lit by the fire above
  ctx.lineWidth = 5;
  ctx.strokeStyle = BRZ.body;
  ctx.beginPath();
  ctx.ellipse(x, b.rim, BOWL.rx - 1, BOWL.ry - 1, 0, 0, P2);
  ctx.stroke();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = 'rgba(255,200,130,0.85)';
  ctx.beginPath();
  ctx.ellipse(x, b.rim - 1.5, BOWL.rx - 1, BOWL.ry - 1, 0, 0.15, Math.PI - 0.15);
  ctx.stroke();
  ctx.strokeStyle = rgba(BRZ.deep, 0.9);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(x, b.rim, BOWL.rx + 1.5, BOWL.ry + 1.5, 0, 0, P2);
  ctx.stroke();
}

// ——— the near flaps and the valance (sprites: they breathe in the wind and shudder at a stomp) ———

export const FLAP_BOX_L: Box = { x: 0, y: 0, w: 340, h: 759 };
export const FLAP_BOX_R: Box = { x: W - 340, y: 0, w: 340, h: 759 };
/** The door flap's free edge, top to floor: it falls from the eave's corner to the near pole and hangs down the pole's
 * outer side, lashed to it. */
const FLAP_EDGE: Pt[] = [[330, -4], [282, 90], [214, 196], [150, 290], [122, 380], [116, 480], [122, 600], [132, 700], [138, 762]];
/** The lashings round the pole and the flap. */
const LASH = [344, 586];
/** A tent's door flap of heavy woven wool (a kilim's bands across it), folded back to the near pole and lashed there
 * with rope; a guy rope from the pole's head out to its peg. */
function flap(ctx: Ctx, r: R, sd: -1 | 1): void {
  void r;
  ctx.save();
  if (sd > 0) {
    ctx.translate(W, 0);
    ctx.scale(-1, 1);
  }
  const path = smoothPath([[-30, -20], ...FLAP_EDGE, [-30, 780]]);
  const box: Box = { x: -10, y: -4, w: 350, h: 764 };
  castShadow(ctx, path, 12, 14, 0.45, '#0a0208');
  drape(ctx, path, box, '#7a1820', {
    fold: 34,
    depth: 0.5,
    phase: sd < 0 ? 0.3 : 1.4,
    pattern: (c, fold) => {
      // woven bands across it, sagging a little between the folds: saffron, lapis, an ivory running zigzag
      for (let y0 = 40; y0 < 780; y0 += 96) {
        for (let x = -10; x < 340; x += 3) {
          const sag = fold(x, y0) * 2.5;
          c.fillStyle = '#b0701c';
          c.fillRect(x, y0 + sag, 3.2, 10);
          c.fillStyle = '#22306a';
          c.fillRect(x, y0 + 13 + sag, 3.2, 6);
          c.fillStyle = 'rgba(232,214,180,0.85)';
          const zz = Math.abs(((x / 8) % 2) - 1) * 5;
          c.fillRect(x, y0 + 22 + zz + sag, 3.2, 2.2);
          c.fillStyle = '#22306a';
          c.fillRect(x, y0 + 31 + sag, 3.2, 4);
        }
      }
      // the weave: fine horizontal picks
      for (let y = 0; y < 780; y += 3) {
        c.fillStyle = 'rgba(0,0,0,0.06)';
        c.fillRect(-10, y, 360, 1);
      }
      // a plain woven border down its free edge: a saffron band between two dark lines
      for (let y = -4; y < 770; y += 2) {
        const ex = along2(FLAP_EDGE, y);
        c.fillStyle = '#2a0a10';
        c.fillRect(ex - 22, y, 2, 2.2);
        c.fillStyle = '#a86a1e';
        c.fillRect(ex - 20, y, 14, 2.2);
        c.fillStyle = '#2a0a10';
        c.fillRect(ex - 6, y, 2, 2.2);
      }
    },
  });
  // the sun behind it coming through its edge, the near fall in shade
  ctx.save();
  path(ctx);
  ctx.clip();
  const g = ctx.createLinearGradient(0, 0, 330, 0);
  g.addColorStop(0, 'rgba(10,2,6,0.5)');
  g.addColorStop(0.5, 'rgba(10,2,6,0.15)');
  g.addColorStop(1, 'rgba(255,120,60,0.1)');
  ctx.fillStyle = g;
  ctx.fillRect(-10, 0, 350, 770);
  vfill(ctx, -10, 560, 350, 200, [[0, 'rgba(10,2,6,0)'], [1, 'rgba(10,2,6,0.5)']]);
  ctx.restore();
  path(ctx);
  ctx.strokeStyle = '#2a0610';
  ctx.lineWidth = 2.2;
  ctx.stroke();
  // the lashings: a hemp rope wound three times round the pole and the gathered flap, its end hanging
  const px = XX.nearL;
  for (const ly of LASH) {
    for (let k = 0; k < 3; k++) {
      const y = ly + k * 9;
      const rope = (c: Ctx) => {
        c.beginPath();
        c.moveTo(60, y + 6);
        c.quadraticCurveTo(px, y - 4, px + XX.nearW + 4, y + 2);
        c.lineTo(px + XX.nearW + 4, y + 7);
        c.quadraticCurveTo(px, y + 2, 60, y + 11);
        c.closePath();
      };
      ctx.save();
      rope(ctx);
      const rg = ctx.createLinearGradient(0, y - 4, 0, y + 11);
      rg.addColorStop(0, '#d8b888');
      rg.addColorStop(0.5, '#a07a4a');
      rg.addColorStop(1, '#4a3420');
      ctx.fillStyle = rg;
      ctx.fill();
      ctx.strokeStyle = '#2a1a0e';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
      // the twist of the rope
      ctx.strokeStyle = 'rgba(40,24,12,0.5)';
      ctx.lineWidth = 0.8;
      for (let x = 66; x < px + XX.nearW; x += 6) {
        ctx.beginPath();
        ctx.moveTo(x, y + 2 + (x - 66) * -0.02);
        ctx.lineTo(x + 3, y + 8 + (x - 66) * -0.02);
        ctx.stroke();
      }
    }
    ctx.strokeStyle = '#8a6a40';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(px + XX.nearW + 2, ly + 20);
    ctx.quadraticCurveTo(px + XX.nearW + 10, ly + 44, px + XX.nearW + 4, ly + 70);
    ctx.stroke();
    ctx.fillStyle = '#c8a878';
    ctx.beginPath();
    ctx.ellipse(px + XX.nearW + 4, ly + 73, 2.4, 4, 0, 0, P2);
    ctx.fill();
  }
  ctx.restore();
}
function along2(pts: Pt[], y: number): number {
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    if (y >= y0 && y <= y1) return x0 + ((y - y0) / (y1 - y0 || 1)) * (x1 - x0);
  }
  return y < pts[0][1] ? pts[0][0] : pts[pts.length - 1][0];
}

/** The front of the roof: the tent's own cloth run down over the front beam, bands woven across it, its hem cut into
 * pointed tabs in turn crimson, saffron and lapis (a sprite: it breathes and shudders). */
export const VAL_BOX: Box = { x: 0, y: 0, w: W, h: 134 };
const VAL = { y: 88, tab: 40, dip: 24 };
function valance(ctx: Ctx, r: R): void {
  void r;
  const path = rectP(-4, -4, W + 8, VAL.y + 4);
  castShadow(ctx, path, 10, 14, 0.5, '#0a0208');
  drape(ctx, path, { x: 0, y: -4, w: W, h: VAL.y + 8 }, CRIMSON.shade, {
    fold: 72,
    depth: 0.4,
    phase: 0.4,
    pattern: (c, fold) => {
      for (let x = 0; x < W; x += 3) {
        const sag = fold(x, 40) * 1.5;
        c.fillStyle = SAFFRON.shade;
        c.fillRect(x, 8 + sag, 3.2, 8);
        c.fillStyle = LAPIS.shade;
        c.fillRect(x, 20 + sag, 3.2, 18);
        c.fillStyle = 'rgba(232,214,180,0.6)';
        c.fillRect(x, 27 + Math.abs(((x / 10) % 2) - 1) * 4 + sag, 3.2, 2);
        c.fillStyle = SAFFRON.shade;
        c.fillRect(x, 42 + sag, 3.2, 4);
        c.fillStyle = LAPIS.shade;
        c.fillRect(x, 78 + sag, 3.2, 6);
      }
      wingedDisc(c, VPX, 62, 64, { col: rgba(GOLD.body, 0.85), disc: '#7a1a20', line: rgba(GOLD.deep, 0.7), lw: 1 });
      for (let y = 0; y < VAL.y + 6; y += 3) {
        c.fillStyle = 'rgba(0,0,0,0.07)';
        c.fillRect(0, y, W, 1);
      }
    },
  });
  // the tabs along the hem, each its own little fall of cloth with a dark edge
  const cols = [CRIMSON.body, '#a86a1e', LAPIS.body];
  for (let i = 0, x = -VAL.tab / 2; x < W + VAL.tab; i++, x += VAL.tab) {
    const tab = (c: Ctx) => {
      c.beginPath();
      c.moveTo(x - VAL.tab / 2 + 1, VAL.y - 2);
      c.lineTo(x + VAL.tab / 2 - 1, VAL.y - 2);
      c.lineTo(x + 2, VAL.y + VAL.dip);
      c.lineTo(x - 2, VAL.y + VAL.dip);
      c.closePath();
    };
    ctx.save();
    tab(ctx);
    const g = ctx.createLinearGradient(x - VAL.tab / 2, 0, x + VAL.tab / 2, 0);
    g.addColorStop(0, shade(cols[i % 3], 0.12));
    g.addColorStop(0.6, cols[i % 3]);
    g.addColorStop(1, shade(cols[i % 3], -0.4));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.clip();
    vfill(ctx, x - VAL.tab / 2, VAL.y - 2, VAL.tab, VAL.dip + 2, [[0, 'rgba(10,2,6,0.45)'], [1, 'rgba(10,2,6,0.05)']]);
    ctx.restore();
    tab(ctx);
    ctx.strokeStyle = '#1e0408';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
  // in shade under the roof, darker in the middle behind the HUD
  ctx.save();
  path(ctx);
  ctx.clip();
  vfill(ctx, 0, 0, W, VAL.y, [[0, 'rgba(10,2,6,0.5)'], [1, 'rgba(10,2,6,0.05)']]);
  ctx.restore();
  ctx.strokeStyle = '#1e0408';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, VAL.y);
  ctx.lineTo(W, VAL.y);
  ctx.stroke();
}

// ——— the table: the pavilion's floor of pale polished stone, the great carpet's edge over its back, a gilt step ———

export const TABLE_BOX: Box = { x: 0, y: TY, w: W, h: 1080 - TY };

function table(ctx: Ctx, r: R): void {
  const f = XX.front;
  const box = { x: 0, y: TY, w: W, h: f - TY };
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, f - TY + 4);
  ctx.clip();
  vfill(ctx, 0, TY, W, f - TY, [[0, '#5e4440'], [0.45, '#765850'], [1, '#806258']]);
  surface(ctx, r, box, '#745650', { over: true, vary: 0.3, cells: 5, mottle: 0.25, strokes: 0.3, strokeAng: 0, strokeLen: 240, strokeW: 5, grain: 0.12, grainKind: 'speckle', seed: 271 });
  lay(ctx, drift('#a88a7a', '#3e2a2a', 9, 273, 240, 40), box, 0.2);
  // the flags: big slabs in courses in perspective, polished, faint veining
  const zf = zFront(f);
  const rows: number[] = [];
  for (let z = ZB; z > zf; z -= 0.62 * (z / ZB) + 0.05) rows.push(z);
  rows.push(zf);
  for (let j = 0; j < rows.length - 1; j++) {
    const z0 = rows[j];
    const z1 = rows[j + 1];
    const off = (j % 2) * 0.9 + (r() - 0.5) * 0.3;
    let X = -4.2 + off;
    while (X < 4.2) {
      const wX = 1.5 + r() * 0.8;
      const q: Pt[] = [[xAt(X, z0), yAt(z0)], [xAt(X + wX, z0), yAt(z0)], [xAt(X + wX, z1), yAt(z1)], [xAt(X, z1), yAt(z1)]];
      const qb = boxOfPts(q, 0);
      ctx.save();
      polyPath(q)(ctx);
      ctx.clip();
      ctx.fillStyle = rgba(r() < 0.5 ? '#b89488' : '#3a2626', 0.05 + r() * 0.08);
      ctx.fillRect(qb.x, qb.y, qb.w, qb.h);
      for (let k = 0; k < 3; k++) {
        ctx.strokeStyle = rgba('#d8bcae', 0.08);
        ctx.lineWidth = 1;
        ctx.beginPath();
        const vx = qb.x + r() * qb.w;
        ctx.moveTo(vx, qb.y);
        ctx.bezierCurveTo(vx + 30, qb.y + qb.h * 0.3, vx - 20, qb.y + qb.h * 0.7, vx + 10, qb.y + qb.h);
        ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = rgba('#24161a', 0.36);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(xAt(X, z0), yAt(z0));
      ctx.lineTo(xAt(X, z1), yAt(z1));
      ctx.stroke();
      X += wX;
    }
    const y = yAt(z1);
    ctx.fillStyle = rgba('#24161a', 0.34);
    ctx.fillRect(0, y - 1, W, 2);
    ctx.fillStyle = rgba('#e8d0c0', 0.1);
    ctx.fillRect(0, y + 1.2, W, 1);
  }
  for (let i = 0; i < 4; i++) crack(ctx, r, r() * W, TY + 60 + r() * (f - TY - 90), (r() - 0.5) * 0.8, 40 + r() * 70, { col: '#2a1a1a', lip: '#e0c8b8', w: 1, a: 0.25, branch: 0.3 });
  // the great carpet's edge lying over the back of it: its border band, then the fringe on the stone
  const cz = ZB - 0.14;
  const cy = yAt(cz);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, cy - TY);
  ctx.clip();
  vfill(ctx, 0, TY, W, cy - TY, [[0, '#2a1428'], [1, '#22102a']]);
  ctx.fillStyle = rgba('#d4a04c', 0.22);
  ctx.fillRect(0, TY + 3, W, 2);
  ctx.fillRect(0, cy - 6, W, 2);
  for (let x = 0; x < W; x += 34) {
    ctx.fillStyle = rgba('#8a1e24', 0.4);
    ctx.beginPath();
    ctx.moveTo(x, TY + 6);
    ctx.lineTo(x + 10, (TY + cy) / 2);
    ctx.lineTo(x, cy - 7);
    ctx.lineTo(x - 10, (TY + cy) / 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgba('#e8c47a', 0.18);
    ctx.fillRect(x - 1.5, (TY + cy) / 2 - 1.5, 3, 3);
  }
  ctx.restore();
  ctx.fillStyle = rgba('#0e0408', 0.55);
  ctx.fillRect(0, cy, W, 3);
  ctx.strokeStyle = rgba('#d8c4a4', 0.42);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x < W; x += 3.2) {
    const len = 6 + Math.sin(x * 0.31) * 1.5 + r() * 2;
    ctx.moveTo(x, cy + 1);
    ctx.lineTo(x + (x - VPX) * 0.006 + (r() - 0.5), cy + 1 + len);
  }
  ctx.stroke();
  // the light: the braziers warm at the sides, dim in the middle under the pizzas, the far end in shade
  for (const b of XX.braziers) lightPool(ctx, b.x, TY + 30, 420, 120, FIRE, 0.07);
  lightPool(ctx, 320, TY + 60, 500, 140, SUNC, 0.05);
  ctx.restore();
  tableFalloff(ctx, f, 0.34, '#120608');
  tableSeam(ctx, 0.5, '#1a0a0c', false);
  crevice(ctx, 0, W, TY, 14, 0.55, '#0e0408');
  // the front: a gilt step, a band of turquoise glaze with rosettes along it, low in contrast
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, f, W, 1080 - f);
  ctx.clip();
  vfill(ctx, 0, f, W, 1080 - f, [[0, '#8a6430'], [1, '#5a3e1c']]);
  surface(ctx, r, { x: 0, y: f, w: W, h: 1080 - f }, '#7a5628', { over: true, vary: 0.25, cells: 6, mottle: 0.3, strokes: 0, grain: 0.14, grainKind: 'speckle', seed: 281 });
  ctx.fillStyle = mixHex(TURQ.shade, '#3a2a20', 0.35);
  ctx.fillRect(0, f + 11, W, 16);
  for (let x = 12; x < W; x += 26) rosette(ctx, x, f + 19, 5.5, rgba('#e8d8b0', 0.45), rgba(GOLD.lit, 0.5), 8);
  ctx.fillStyle = rgba('#2a1808', 0.6);
  ctx.fillRect(0, f + 10, W, 1.4);
  ctx.fillRect(0, f + 27, W, 1.4);
  vfill(ctx, 0, f, W, 1080 - f, [[0, 'rgba(14,6,10,0)'], [1, 'rgba(14,6,10,0.35)']]);
  ctx.restore();
  ctx.fillStyle = '#a88040';
  ctx.fillRect(0, f - 5, W, 5);
  ctx.fillStyle = rgba('#ffe8b0', 0.45);
  ctx.fillRect(0, f - 5, W, 1.4);
  ctx.fillStyle = rgba('#140608', 0.7);
  ctx.fillRect(0, f, W, 1.6);
}

// ——— the shade ———

function shadeOver(ctx: Ctx): void {
  // the HUD's corners
  for (const [x, y] of [[170, 60], [1750, 60]] as Pt[]) {
    const g = ctx.createRadialGradient(x, y, 30, x, y, 480);
    g.addColorStop(0, 'rgba(10,2,8,0.32)');
    g.addColorStop(1, 'rgba(10,2,8,0)');
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.4);
    ctx.translate(-x, -y);
    ctx.fillStyle = g;
    ctx.fillRect(x - 480, y - 480, 960, 960);
    ctx.restore();
  }
  calmLanes(ctx, 0.24, '#0c0208', 120, 720);
  // the band behind the pizzas and the table's back edge, darker and quiet
  vfill(ctx, 0, 560, W, 200, [[0, 'rgba(10,2,8,0)'], [0.55, 'rgba(10,2,8,0.2)'], [1, 'rgba(10,2,8,0.34)']]);
  vignetteAll(ctx, 0.5, '#0a0206');
}

// ——— frames for the live layer (and their stills) ———

/** A brazier's fire: a bed of tongues licking up out of the coals (8 phases), w×h, its base at (w/2, h - 12). */
const FF = { w: 130, h: 160 };
const FIRE_COLS: [string, string, string] = ['#d8380c', '#ff9426', '#fff0b4'];
/**
 * A brazier's fire at phase ph (8 frames loop): a steady body rising out of the coals, its tongues licking up and
 * falling back on their own beats at the top only (the core keeps its shape, so it flickers rather than boils), the
 * tallest tips thinning and leaning. Base at (w/2, h - 12); everything stays well inside the frame (no hard edge).
 */
function fireF(c: Ctx, ph: number, seed: number): void {
  const bx = FF.w / 2;
  const by = FF.h - 12;
  const n = 7;
  const W0 = 88;
  const H0 = 104;
  const tongues: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const mid = 1 - Math.abs(u - 0.5) * 1.25;
    const p = P2 * ph;
    const lick = 0.82 + Math.sin(p + i * 2.1 + seed) * 0.1 + Math.sin(p * 2 + i * 1.3) * 0.05;
    const sway = Math.sin(p + i * 0.9 + seed) * 3;
    tongues.push([bx - W0 * 0.42 + u * W0 * 0.84 + sway, by - H0 * mid * lick]);
  }
  const body = (k: number) => {
    c.beginPath();
    const hw = (W0 / 2) * k;
    c.moveTo(bx - hw, by);
    c.quadraticCurveTo(bx - hw * 1.08, by - H0 * 0.22 * k, tongues[0][0] * k + bx * (1 - k), by - (by - tongues[0][1]) * k);
    for (let i = 1; i < n; i++) {
      const [px, py] = tongues[i - 1];
      const [qx, qy] = tongues[i];
      const ax = px * k + bx * (1 - k);
      const ay = by - (by - py) * k;
      const cx = qx * k + bx * (1 - k);
      const cy = by - (by - qy) * k;
      c.quadraticCurveTo((ax + cx) / 2, Math.max(ay, cy) + H0 * 0.2 * k, cx, cy);
    }
    c.quadraticCurveTo(bx + hw * 1.08, by - H0 * 0.22 * k, bx + hw, by);
    c.quadraticCurveTo(bx, by + 6 * k, bx - hw, by);
    c.closePath();
  };
  c.save();
  c.globalCompositeOperation = 'lighter';
  // a soft halo, round and well inside the frame
  const halo = c.createRadialGradient(bx, by - 40, 0, bx, by - 40, 58);
  halo.addColorStop(0, 'rgba(255,150,60,0.22)');
  halo.addColorStop(1, 'rgba(255,150,60,0)');
  c.fillStyle = halo;
  c.beginPath();
  c.arc(bx, by - 40, 58, 0, P2);
  c.fill();
  for (const [k, col, a] of [[1, FIRE_COLS[0], 0.85], [0.74, FIRE_COLS[1], 0.9], [0.44, FIRE_COLS[2], 0.95]] as [number, string, number][]) {
    body(k);
    const g = c.createLinearGradient(0, by - H0 * k, 0, by);
    g.addColorStop(0, rgba(col, 0));
    g.addColorStop(0.3, rgba(col, a * 0.75));
    g.addColorStop(1, rgba(col, a));
    c.fillStyle = g;
    c.fill();
  }
  c.restore();
}
function fireStill(ctx: Ctx): void {
  for (const [i, b] of XX.braziers.entries()) {
    const [cv, g] = makeCanvas(FF.w, FF.h);
    fireF(g, 0.3 + i * 0.4, i + 1);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    lightPool(ctx, b.x, b.rim - 50, 140, 120, FIRE, 0.16);
    ctx.drawImage(cv, b.x - FF.w / 2, b.rim + 2 - FF.h + 12);
    ctx.restore();
  }
}
export const FIRE_STILL_BOX: Box = { x: 240, y: 300, w: W - 480, h: 260 };

/** Incense: two thin ribbons of smoke rising from the lid, curling as they climb and breaking into wisps; lit by the
 * sun on one side and the fire on the other. Loops in phase (the curls travel up). Source at (w/2, h - 4). */
const SMK = { w: 110, h: 300 };
function incenseF(c: Ctx, ph: number, seed: number): void {
  const k = 0.5;
  const [cv, g] = makeCanvas(SMK.w * k, SMK.h * k);
  g.scale(k, k);
  for (let strand = 0; strand < 2; strand++) {
    const sd = seed + strand * 2.7;
    for (let i = 0; i < 160; i++) {
      const u = i / 160;
      const y = SMK.h - 4 - u * (SMK.h - 20);
      const amp = (2 + u * u * 30) * (strand ? 0.6 : 1);
      const x = SMK.w / 2 + Math.sin(u * (strand ? 6.2 : 8.5) + u * u * (strand ? 9 : 5) - ph * P2 * (strand + 1) + sd) * amp + Math.sin(u * 2.3 + sd * 1.7 - ph * P2) * amp * 0.45 + u * u * (strand ? -10 : 16);
      const rad = 1.6 + u * 12;
      const a = (strand ? 0.45 : 0.8) * Math.min(1, u * 12) * (1 - u) ** 2 * 0.24 * (0.7 + 0.3 * Math.sin(u * 23 + ph * P2 * 3 + sd));
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, `rgba(200,190,200,${a})`);
      gr.addColorStop(1, 'rgba(200,190,200,0)');
      g.fillStyle = gr;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      // the sun's side warm, the far side cool
      g.fillStyle = `rgba(255,190,140,${a * 0.45})`;
      g.fillRect(x - rad * 0.8, y - rad * 0.3, rad * 0.5, rad * 0.6);
    }
  }
  c.imageSmoothingEnabled = true;
  c.drawImage(cv, 0, 0, SMK.w, SMK.h);
}
function incenseStill(ctx: Ctx): void {
  for (const [i, s] of XX.incense.entries()) {
    ctx.save();
    ctx.translate(s.x - SMK.w / 2, s.top - SMK.h + 2);
    incenseF(ctx, 0.25 + i * 0.5, i * 3 + 1);
    ctx.restore();
  }
}
export const INC_STILL_BOX: Box = { x: 560, y: 200, w: 800, h: 330 };

/** The camp's smoke, rising thin from a few fires and leaning off with the wind. */
const CS = { w: 50, h: 150 };
const CAMP_SMOKE_O = { lit: '#ffc8a8', body: '#9a7a80', shade: '#4a3448', a: 0.3, n: 7, lean: 0.5, seed: 6 };
/** The near standards outside: a small flag streaming from its crossbar (frame origin: the bar's left). */
const SF = { w: 26, h: 22, amp: 4 };
function standardFlag(c: Ctx, ph: number, kind: number): void {
  c.save();
  c.translate(SF.amp * 2, 0);
  // (painted at 4× and drawn down, so the cloth's strips are finer than a pixel: no mesh lines across the device)
  c.scale(0.25, 0.25);
  clothFrame(c, 0, 6, SF.w * 4, SF.h * 4, ph, (cc, w, h) => bannerCloth(cc, w, h, kind), { amp: SF.amp * 4, waves: 1.4, tail: kind === 1 ? 'swallow' : 'flat', light: '#fff0d8', dark: '#4a1418' });
  c.restore();
}
function standardPole(ctx: Ctx, x: number, y: number, s: number): void {
  // the pole and crossbar of a near standard, a gilt disc on top, its shadow out on the plain
  ctx.strokeStyle = '#2a1410';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - s * 8.4);
  ctx.moveTo(x - SF.w / 2 - 2, y - s * 7.6);
  ctx.lineTo(x + SF.w / 2 + 2, y - s * 7.6);
  ctx.stroke();
  gilt(ctx, ellP(x, y - s * 8.9, 4, 4), { x: x - 4, y: y - s * 8.9 - 4, w: 8, h: 8 }, { dir: 'r', line: 1 });
  groundShadow(ctx, x + 10, y, 18, 2, 0.4, '#1a0608');
}
function outsideStill(ctx: Ctx): void {
  for (const [i, [x, y]] of CAMP_SMOKE.entries()) {
    const s = 0.5 + (y - HZ) / 60;
    ctx.save();
    ctx.translate(x - CS.w * 0.5 * s, y - (CS.h - 10) * s);
    ctx.scale(s, s);
    steamFrame(ctx, CS.w, CS.h, (i * 0.31) % 1, CAMP_SMOKE_O);
    ctx.restore();
  }
  for (const [i, [x, y, kind, s]] of OUT_STANDARDS.entries()) {
    ctx.save();
    ctx.translate(x - SF.w / 2 - SF.amp * 2, y - s * 7.6);
    standardFlag(ctx, 0.2 + i * 0.5, kind);
    ctx.restore();
  }
}
const OUT_POLES_BOX: Box = { x: OPEN.l0, y: 460, w: OPEN.r1 - OPEN.l0, h: 110 };
function outsidePoles(ctx: Ctx): void {
  for (const [x, y, , s] of OUT_STANDARDS) standardPole(ctx, x, y, s);
}

/** The sun's long beam through the left side, in the dusty air (in the still; live, a texture that fades). */
const BEAM: Pt[] = [[430, 260], [610, 300], [1260, 560], [1320, 700], [440, 610]];
const BEAM_BOX: Box = boxOfPts(BEAM, 20);
function beamPaint(c: Ctx, a: number): void {
  const g = c.createLinearGradient(430, 0, 1320, 0);
  g.addColorStop(0, `rgba(255,170,100,${a})`);
  g.addColorStop(0.5, `rgba(255,150,90,${a * 0.45})`);
  g.addColorStop(1, 'rgba(255,140,80,0)');
  c.fillStyle = g;
  smoothPath(BEAM)(c);
  c.fill();
  // streaks along it where the air's dust is thicker
  c.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 7; i++) {
    c.fillStyle = `rgba(0,0,0,${0.25 + (i % 3) * 0.12})`;
    c.beginPath();
    const y0 = 300 + i * 46;
    c.moveTo(430, y0);
    c.lineTo(1300, y0 + 220 + i * 8);
    c.lineTo(1300, y0 + 236 + i * 8);
    c.lineTo(430, y0 + 12 + (i % 2) * 10);
    c.closePath();
    c.fill();
  }
}
function beamStill(ctx: Ctx): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  softly(ctx, BEAM_BOX, (c) => beamPaint(c, 0.11), 0.25);
  ctx.restore();
}

// ——— the stack ———
//
// Far to near. The outside (sky, cliffs, plain and camp), the roof, the back wall and the floor go into the base; the
// two open sides get a slot each (the camp's smoke and standards, the volleys crossing the sky), so the rolled walls
// and the poles painted after them are baked over them (small overlays). The parasol, the fans, the vessels on the
// heap, the door flaps and the valance are sprites. The fires, the incense, the banners and the sun's beam are painted
// frames and textures in the live layer, painted in place only in the still.

const OUT_SLOT_L: Box = { x: OPEN.l0 + 30, y: 60, w: OPEN.l1 - OPEN.l0 - 26, h: 506 };
const OUT_SLOT_R: Box = { x: OPEN.r0 - 4, y: 60, w: OPEN.r1 - OPEN.r0 - 26, h: 506 };

export const XERXES: SceneSpec = {
  id: 'xerxes',
  info: {
    name: 'The God-King’s Pavilion',
    subtitle: 'Boss: XERXES',
    ambient: [],
    // (the braziers, the incense, the sun's beam and the motes are the live layer's)
    glows: [],
    light: '#ffc8a0',
    tableTint: '#fff0e8',
  },
  layers: [
    { id: 'sky', box: OUT_BOX, draw: sky },
    { id: 'plain', box: OUT_BOX, draw: plain },
    { id: 'ceiling', box: CEIL_BOX, draw: ceiling },
    { id: 'backWall', box: WALL_BOX, draw: backWall },
    { id: 'floor', box: FLOOR_BOX, draw: floor },
    { id: 'outPoles', box: OUT_POLES_BOX, draw: (c) => outsidePoles(c) },
    { id: 'cords', box: BANNER_CORDS_BOX, draw: (c) => bannerCords(c) },
    { id: 'rollL', box: ROLL_BOX_L, draw: (c, r) => roll(c, r, -1) },
    { id: 'rollR', box: ROLL_BOX_R, draw: (c, r) => roll(c, r, 1) },
    { id: 'outL', box: OUT_SLOT_L, motion: 'slot', draw: () => {} },
    { id: 'outR', box: OUT_SLOT_R, motion: 'slot', draw: () => {} },
    { id: 'outStill', box: OUT_BOX, stillOnly: true, draw: (c) => outsideStill(c) },
    { id: 'backColL', box: BACKCOL_BOX(-1), draw: (c) => backCol(c, -1) },
    { id: 'backColR', box: BACKCOL_BOX(1), draw: (c) => backCol(c, 1) },
    { id: 'bannersStill', box: { x: 600, y: XX.beam, w: 720, h: 240 }, stillOnly: true, draw: (c) => bannersStill(c) },
    { id: 'dais', box: DAIS_BOX, draw: dais },
    { id: 'parasol', box: PARASOL_BOX, motion: 'sprite', draw: parasol },
    { id: 'fanL', box: FAN_BOX(0), motion: 'sprite', draw: (c, r) => fan(c, r, 0) },
    { id: 'fanR', box: FAN_BOX(1), motion: 'sprite', draw: (c, r) => fan(c, r, 1) },
    { id: 'throne', box: THRONE_BOX, draw: throne },
    { id: 'incL', box: INC_BOX(0), draw: (c, r) => incense(c, r, 0) },
    { id: 'incR', box: INC_BOX(1), draw: (c, r) => incense(c, r, 1) },
    { id: 'tributeL', box: TRIBUTE_L_BOX, draw: (c, r) => tribute(c, r, -1) },
    { id: 'tributeR', box: TRIBUTE_R_BOX, draw: (c, r) => tribute(c, r, 1) },
    { id: 'ewer', box: EWER_BOX, motion: 'sprite', draw: (c) => ewerSprite(c) },
    { id: 'cup', box: CUP_BOX, motion: 'sprite', draw: (c) => cupSprite(c) },
    { id: 'brzL', box: BRZ_BOX(0), draw: (c, r) => brazier(c, r, 0) },
    { id: 'brzR', box: BRZ_BOX(1), draw: (c, r) => brazier(c, r, 1) },
    { id: 'nearColL', box: NEARCOL_BOX(-1), draw: (c, r) => nearCol(c, r, -1) },
    { id: 'nearColR', box: NEARCOL_BOX(1), draw: (c, r) => nearCol(c, r, 1) },
    { id: 'beamStill', box: BEAM_BOX, stillOnly: true, draw: (c) => beamStill(c) },
    { id: 'incStill', box: INC_STILL_BOX, stillOnly: true, draw: (c) => incenseStill(c) },
    { id: 'fireStill', box: FIRE_STILL_BOX, stillOnly: true, draw: (c) => fireStill(c) },
    { id: 'flapL', box: FLAP_BOX_L, motion: 'sprite', draw: (c, r) => flap(c, r, -1) },
    { id: 'flapR', box: FLAP_BOX_R, motion: 'sprite', draw: (c, r) => flap(c, r, 1) },
    { id: 'valance', box: VAL_BOX, motion: 'sprite', draw: valance },
    { id: 'table', box: TABLE_BOX, draw: table },
    { id: 'top', motion: 'top', draw: () => {} },
  ],
  shade: shadeOver,
};

// ——— live ———

registerKitScene(XERXES, (k: KitLive) => {
  const MUL = Phaser.BlendModes.MULTIPLY;
  const top = k.slot('top');
  const outL = k.slot('outL');
  const outR = k.slot('outR');

  // ——— outside: the camp's smoke, the near standards streaming, the volleys crossing the sky ———
  const CR = 0.5;
  const campKey = sheet(k, 'xx_campsmoke', CS.w * CR, CS.h * CR, 8, (c, ph) => {
    c.scale(CR, CR);
    steamFrame(c, CS.w, CS.h, ph, CAMP_SMOKE_O);
  });
  const campSmoke = CAMP_SMOKE.map(([x, y], i) => {
    const s = 0.5 + (y - HZ) / 60;
    return new Loop(k, campKey, 8, x, y + 10 * s, { into: x < VPX ? outL : outR, origin: [0.5, 1], scale: s / CR, fps: 1.2 + i * 0.15, phase: i * 2.1 });
  });
  const SFK = 2;
  const flagKeys = [0, 1].map((kind) => sheet(k, 'xx_flag' + kind, (SF.w + SF.amp * 4) * SFK, (SF.h + 4) * SFK, 8, (c, ph) => {
    c.scale(SFK, SFK);
    standardFlag(c, ph, kind);
  }));
  const flags = OUT_STANDARDS.map(([x, y, kind, s], i) => new Loop(k, flagKeys[kind], 8, x - SF.w / 2 - SF.amp * 2, y - s * 7.6, { into: x < VPX ? outL : outR, origin: [0, 0], scale: 1 / SFK, fps: 7 + i, phase: i * 3 }));
  const volKey = sheet(k, 'hg_vol0', VOL.w, VOL.h, 6, (c, ph) => volleyFrame(c, ph, 0));
  type Vol = { l: Loop; t: number; dur: number; x0: number; x1: number; y0: number; arc: number; s: number };
  const vols: Vol[] = [];
  const launch = (side: 0 | 1, delay: number, y0: number, s: number) => {
    const l = new Loop(k, volKey, 6, -999, -999, { into: side ? outR : outL, fps: 10, scale: s, tint: 0x2a1418 });
    l.alpha = 0;
    l.show(0);
    const [x0, x1] = side ? [OPEN.r0 - 200, OPEN.r1 + 160] : [OPEN.l0 - 220, OPEN.l1 + 140];
    vols.push({ l, t: -delay, dur: 2.2 + crand() * 0.6, x0, x1, y0, arc: 40 + crand() * 30, s });
  };

  // ——— the cloth: the banners on the back beam, the flaps and the valance breathing ———
  const banners = XX.banners.map((b, i) => {
    const BR = 0.75;
    const key = sheet(k, 'xx_banner' + b.kind, BAN_FW * BR, BAN_FH * BR, 8, (c, ph) => {
      c.scale(BR, BR);
      bannerFrame(c, ph, b.kind);
    });
    return new Loop(k, key, 8, b.x, BANNER_TOP, { into: top, origin: [0.5, 0], scale: 1 / BR, fps: 2.2 + i * 0.3, phase: i * 3.3 });
  });
  const flapL = k.pivot(k.sprite('flapL'), 0, 0);
  const flapR = k.pivot(k.sprite('flapR'), W, 0);
  const val = k.sprite('valance');
  const valY = val.y;
  const valS = new Spring(0, 260, 9);
  let gust = 0;

  // ——— the parasol, the fans, the vessels on the heap ———
  const paraImg = k.pivot(k.sprite('parasol'), PARASOL.hub[0], PARASOL.hub[1]);
  const para = new Swing(paraImg, { k: 60, c: 4, idle: 0.002, seed: 2, speed: 0.6 });
  const paraY = paraImg.y;
  const paraBob = new Spring(0, 300, 10);
  const fans = XX.fans.map((f, i) => new Swing(k.pivot(k.sprite(i ? 'fanR' : 'fanL'), f.x, f.y), { k: 14, c: 1.6, idle: 0.012, seed: 1 + i * 2.4, speed: 0.7 }));
  const ewer = new Swing(k.pivot(k.sprite('ewer'), EWER[0], EWER[1]), { k: 160, c: 5, idle: 0, seed: 1 });
  const cup = new Swing(k.pivot(k.sprite('cup'), CUP[0], CUP[1]), { k: 200, c: 6, idle: 0, seed: 2 });

  // ——— the incense, and the braziers' smoke ———
  const SR = 0.5;
  const smkKeys = [1, 4].map((seed) => sheet(k, 'xx_incense' + seed, SMK.w * SR, SMK.h * SR, 8, (c, ph) => {
    c.scale(SR, SR);
    incenseF(c, ph, seed);
  }));
  const incense = XX.incense.map((s, i) => new Loop(k, smkKeys[i], 8, s.x, s.top + 2, { into: top, origin: [0.5, 1], scale: 1 / SR, fps: 1.6 + i * 0.2, phase: i * 3 }));
  const brzSmoke = XX.braziers.map((b, i) => new Loop(k, smkKeys[1 - i], 8, b.x, b.rim - 110, { into: top, origin: [0.5, 1], sx: 1.7 / SR, sy: 1.1 / SR, fps: 2.2, phase: i * 4, tint: 0x6a4a4a }));
  for (const s of brzSmoke) s.alpha = 0.5;

  // ——— the light: the volley's dark, the sun's beam with its motes ———
  const dim = k.wash(0x2a1830, 0, MUL, top);
  const beamKey = k.tex('xx_beam', Math.ceil(BEAM_BOX.w / 4), Math.ceil(BEAM_BOX.h / 4), (c) => {
    c.scale(0.25, 0.25);
    c.translate(-BEAM_BOX.x, -BEAM_BOX.y);
    c.filter = 'blur(10px)';
    beamPaint(c, 0.11);
  });
  const beam = k.img(beamKey, BEAM_BOX.x, BEAM_BOX.y, { into: top, add: true, origin: [0, 0], scale: 4 });
  const motes = new Parts(k, { frame: 'mote', add: true, into: top, max: 70 });
  const moteRate = new Rate();
  const inBeam = (): Pt => {
    const u = crand();
    const x = 470 + u * 760;
    const y0 = 290 + u * 280;
    return [x, y0 + crand() * (150 - u * 30)];
  };
  for (let i = 0; i < 40; i++) {
    const [x, y] = inBeam();
    motes.spawn({ x, y, vx: 4 + crand() * 6, vy: (crand() - 0.5) * 4, life: 6 + crand() * 6, r0: 0.9 + crand() * 1.2, a: 0.55, tint: 0xffd0a0, fade: 0.3 });
  }
  const sunGlow = k.glow(XX.sun[0], XX.sun[1], 120, 0xff8a4a, 0.12, { into: top, sy: 0.6 });

  // ——— the braziers' fires: painted frames, their glow breathing, sparks and embers ———
  // (one sheet for both, a little under size: the second brazier plays it mirrored and out of phase)
  const FR = 0.8;
  const fireKey = sheet(k, 'xx_fire', FF.w * FR, FF.h * FR, 8, (c, ph) => {
    c.scale(FR, FR);
    fireF(c, ph, 1);
  });
  const fires = XX.braziers.map((b, i) => ({
    l: new Loop(k, fireKey, 8, b.x, b.rim + 2, { into: top, origin: [0.5, (FF.h - 12) / FF.h], fps: 9 + i * 1.3, add: true, phase: i * 3.5 }),
    dir: i ? -1 : 1,
    glow: k.glow(b.x, b.rim - 60, 140, 0xff7a2a, 0.14, { into: top }),
    pool: k.glow(b.x, b.y - 4, 230, 0xff7a2a, 0.12, { into: top, sy: 0.24 }),
    core: k.glow(b.x, b.rim - 4, 60, 0xffc070, 0.35, { into: top, sy: 0.4 }),
    seed: i * 2.7 + 1,
    flare: 0,
  }));
  const sparks = new Parts(k, { frame: 'spark', add: true, into: top, max: 120 });
  const embers = new Parts(k, { frame: 'ember', add: true, into: top, max: 90 });
  const emberRate = new Rate();
  const spark = (b: (typeof XX.braziers)[number], n: number, pw: number) => {
    for (let i = 0; i < n; i++) {
      sparks.spawn({ x: b.x + (crand() - 0.5) * 70, y: b.rim - 10 - crand() * 30, vx: (crand() - 0.5) * 220 * pw, vy: -160 - crand() * 340 * pw, life: 0.8 + crand() * 0.8, r0: 1.6, r1: 0.5, a: 1, tint: crand() < 0.5 ? 0xffc060 : 0xff8a30, grav: 420, drag: 0.4, streak: 0.012, floor: b.y + 10 - crand() * 40, bounce: 0.3, fade: 0.02 });
    }
  };

  // ——— the roof's dust, shaken down ———
  const dust = new Parts(k, { frame: 'puff', into: top, max: 70 });
  const grit = new Parts(k, { frame: 'mote', into: top, max: 120 });
  const sift = (p: number) => {
    for (let i = 0; i < 4 + p * 16; i++) {
      const x = 260 + crand() * 1400;
      const y = 120 + crand() * 120;
      grit.spawn({ x, y, vx: (crand() - 0.5) * 10, vy: 20 + crand() * 40, life: 2.4 + crand(), r0: 0.8 + crand() * 0.8, a: 0.7, tint: 0xd8a888, grav: 140, drag: 1.2, fade: 0.05 });
    }
    for (let i = 0; i < 2 + p * 6; i++) dust.spawn({ x: 300 + crand() * 1320, y: 130 + crand() * 80, vx: (crand() - 0.5) * 8, vy: 14, life: 3 + crand(), r0: 8, r1: 40, a: 0.12 + p * 0.06, tint: 0x8a6a68, drag: 0.6, fade: 0.25 });
  };

  // ——— the coins: off the open chest, rolling on their edge across the carpet, wobbling down flat ———
  const coinKey = k.tex('xx_coin', 24, 24, (c) => {
    const g = c.createRadialGradient(9, 9, 0, 12, 12, 12);
    g.addColorStop(0, GOLD.hi);
    g.addColorStop(0.5, GOLD.lit);
    g.addColorStop(1, GOLD.shade);
    c.fillStyle = g;
    c.beginPath();
    c.arc(12, 12, 11, 0, P2);
    c.fill();
    c.strokeStyle = GOLD.deep;
    c.lineWidth = 1.4;
    c.stroke();
    c.beginPath();
    c.arc(12, 12, 8, 0, P2);
    c.strokeStyle = rgba(GOLD.shade, 0.8);
    c.lineWidth = 1;
    c.stroke();
    // our archer stamped on it
    c.fillStyle = GOLD.shade;
    c.fillRect(11, 7, 2.4, 9);
    c.beginPath();
    c.arc(12, 6, 1.8, 0, P2);
    c.fill();
    c.strokeStyle = GOLD.shade;
    c.beginPath();
    c.arc(9, 11, 4, -1.2, 1.2);
    c.stroke();
  });
  type Coin = { im: Phaser.GameObjects.Image; sh: Phaser.GameObjects.Image; x: number; y: number; vx: number; vy: number; fy: number; vf: number; spin: number; state: number; t: number; wob: number };
  const coins: Coin[] = [];
  const shadowKey = 'glow';
  const roll = (n: number) => {
    for (let i = 0; i < n; i++) {
      let c = coins.find((q) => q.state < 0);
      if (!c) {
        if (coins.length >= 10) return;
        c = { im: k.img(coinKey, 0, 0, { into: top }), sh: k.img(shadowKey, 0, 0, { into: top, tint: 0x000000, alpha: 0 }), x: 0, y: 0, vx: 0, vy: 0, fy: 0, vf: 0, spin: 0, state: 0, t: 0, wob: 0 };
        c.sh.setBlendMode(Phaser.BlendModes.NORMAL);
        top.moveDown(c.sh);
        coins.push(c);
      }
      c.x = XX.chest[0] - 34 + crand() * 10;
      c.y = XX.chest[1] - 16;
      c.vx = -(70 + crand() * 120) * (crand() < 0.25 ? -0.6 : 1);
      c.vy = -60 - crand() * 80;
      c.fy = 640 + crand() * 14;
      c.vf = 14 + crand() * 22;
      c.spin = 0;
      c.state = 0;
      c.t = 0;
      c.wob = 0;
      c.im.setVisible(true).setAlpha(1).setScale(0.42);
      c.sh.setVisible(true);
    }
  };

  // ——— the glints of the bribe ———
  const glintKey = k.tex('xx_glint', 48, 48, (c) => {
    c.translate(24, 24);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 10);
    g.addColorStop(0, 'rgba(255,255,240,1)');
    g.addColorStop(1, 'rgba(255,230,160,0)');
    c.fillStyle = g;
    c.fillRect(-12, -12, 24, 24);
    c.fillStyle = 'rgba(255,248,220,0.95)';
    for (let i = 0; i < 4; i++) {
      c.rotate(Math.PI / 2);
      c.beginPath();
      c.moveTo(0, -1.6);
      c.lineTo(23, 0);
      c.lineTo(0, 1.6);
      c.closePath();
      c.fill();
    }
  });
  const GLINTS: Pt[] = [[960, XX.throne.top - 14], [911, 330], [1009, 332], [896, 470], [1028, 470], [880, 520], [1046, 520], [760, 290], [1160, 290], [960, 300], [XX.chest[0], XX.chest[1] - 20], [XX.chest[0] - 50, XX.chest[1] + 6], [EWER[0], EWER[1] - 30], [CUP[0], CUP[1] - 20], [742, 590], [1110, 634], [XX.braziers[0].x - 40, XX.braziers[0].rim + 6], [XX.braziers[1].x + 30, XX.braziers[1].rim + 6], [XX.backL, XX.beam + 20], [XX.backR, XX.beam + 20], [700, XX.beam - 6], [1220, XX.beam - 6]];
  const glints = GLINTS.map(([x, y]) => ({ im: k.img(glintKey, x, y, { into: top, add: true, alpha: 0, scale: 0.5 }), t: -1, delay: 0 }));
  const throneGlow = k.glow(960, 420, 220, 0xffc060, 0, { into: top, sy: 1.2 });
  let bribe = 0;

  // ——— the fight, heard (the xerxes brain, src/game/bosses/leonidas.ts) ———
  const inFight = 'bossFoot' in (k.sc as object);
  let darkT = -1;
  let gutter = 0;
  const shake = (p: number) => {
    sift(p);
    valS.v += (60 + p * 140) * calm();
    paraBob.v += (40 + p * 120) * calm();
    para.kick((crand() < 0.5 ? -1 : 1) * (0.02 + p * 0.05));
    ewer.kick((crand() < 0.5 ? -1 : 1) * (0.4 + p * 1.2));
    cup.kick((crand() < 0.5 ? -1 : 1) * (0.5 + p * 1.4));
    for (const f of fans) f.kick((crand() - 0.5) * (0.04 + p * 0.1));
    for (const [i, b] of XX.braziers.entries()) {
      spark(b, Math.round(3 + p * 14), 0.5 + p);
      fires[i].flare = Math.max(fires[i].flare, 0.3 + p * 0.5);
    }
    if (p > 0.45 || crand() < p) roll(p > 0.8 ? 2 : 1);
    gust = Math.min(1.5, gust + p * 0.5);
  };
  const onVolley = () => {
    darkT = 0;
    gutter = 1;
    gust = 1.4;
    for (let i = 0; i < 3; i++) {
      launch(0, i * 0.7, 190 + i * 50 + crand() * 30, 1 - i * 0.12);
      launch(1, 0.9 + i * 0.7, 200 + i * 45 + crand() * 30, 0.95 - i * 0.12);
    }
  };
  const onRhino = (p?: number) => shake(typeof p === 'number' ? p : 1);
  const thuds: number[] = [];
  const onElephants = () => {
    thuds.length = 0;
    for (let i = 0; i < 4; i++) thuds.push(0.4 + i * 0.62);
  };
  const onBribe = () => {
    bribe = 1;
    for (const [i, g] of glints.entries()) {
      g.t = 0;
      g.delay = (i / glints.length) * 1.1 + crand() * 0.25;
    }
    roll(3);
    ewer.kick(0.6);
  };
  const ev = k.sc.events;
  ev.on('xerxes-volley', onVolley);
  ev.on('xerxes-rhino', onRhino);
  ev.on('xerxes-elephants', onElephants);
  ev.on('xerxes-bribe', onBribe);
  const unlisten = () => {
    ev.off('xerxes-volley', onVolley);
    ev.off('xerxes-rhino', onRhino);
    ev.off('xerxes-elephants', onElephants);
    ev.off('xerxes-bribe', onBribe);
    ev.off(Phaser.Scenes.Events.SHUTDOWN, unlisten);
  };
  ev.once(Phaser.Scenes.Events.SHUTDOWN, unlisten);
  const DEMO: (() => void)[] = [onVolley, () => onRhino(1), onElephants, onBribe];
  let demoI = 0;
  let demoT = 4;
  let thudT = 0;

  return {
    impact(x, _y, p) {
      sift(p * 0.6);
      valS.v += (30 + p * 90) * calm();
      paraBob.v += (20 + p * 80) * calm();
      para.kick((x < VPX ? 1 : -1) * (0.01 + p * 0.035));
      ewer.kick((crand() < 0.5 ? -1 : 1) * (0.3 + p * 1.1));
      cup.kick((crand() < 0.5 ? -1 : 1) * (0.4 + p * 1.3));
      for (const [i, b] of XX.braziers.entries()) {
        const near = 1 - Math.min(1, Math.abs(x - b.x) / 1200);
        spark(b, Math.round(2 + p * 10 * (0.5 + near)), 0.4 + p * near);
        fires[i].flare = Math.max(fires[i].flare, 0.2 + p * 0.4 * near);
      }
      if (p > 0.3 || crand() < 0.4) roll(1);
    },
    update(dt, t) {
      const cm = calm();
      if (!inFight) {
        demoT -= dt;
        if (demoT < 0) {
          demoT = 7;
          DEMO[demoI++ % DEMO.length]();
        }
      }
      gust = Math.max(0, gust - dt * 0.6);
      gutter = Math.max(0, gutter - dt / 1.8);
      bribe = Math.max(0, bribe - dt / 2.4);
      // the elephants' footfalls
      if (thuds.length) {
        thudT += dt;
        while (thuds.length && thudT >= thuds[0]) {
          thuds.shift();
          shake(0.45 + (4 - thuds.length) * 0.14);
        }
        if (!thuds.length) thudT = 0;
      }
      // the volley's dark: in quickly, held, then the sun comes back
      let dk = 0;
      if (darkT >= 0) {
        darkT += dt;
        dk = darkT < 0.5 ? ease(darkT / 0.5) : darkT < 4.7 ? 1 : 1 - ease(Math.min(1, (darkT - 4.7) / 0.8));
        if (darkT > 5.5) darkT = -1;
      }
      dim.setAlpha(dk * 0.36);
      beam.setAlpha((1 - dk * 0.95) * (0.9 + Math.sin(t * 0.4) * 0.1));
      sunGlow.setAlpha(0.12 * (1 - dk));

      // outside
      for (const s of campSmoke) {
        s.step(dt, cm);
        s.each((im) => im.setRotation(0.1 + gust * 0.1));
      }
      for (const f of flags) f.step(dt, (1 + gust * 0.8) * cm);
      for (const v of vols) {
        v.t += dt;
        if (v.t < 0) continue;
        const u = v.t / v.dur;
        if (u >= 1) {
          v.l.alpha = 0;
          v.l.show(0);
          continue;
        }
        const x = v.x0 + (v.x1 - v.x0) * u;
        const y = Math.max(v.y0 - Math.sin(u * Math.PI) * v.arc + u * 40, (x < VPX ? eaveL(x) : eaveR(x)) + (0.16 * Math.abs(x - VPX)) / HALF + 48 * v.s);
        v.l.step(dt);
        v.l.alpha = clamp01(u * 6) * clamp01((1 - u) * 6) * 0.9;
        v.l.each((im) => im.setPosition(x, y).setRotation(Math.atan2(-Math.cos(u * Math.PI) * v.arc * Math.PI + 40, v.x1 - v.x0) * 0.8));
      }
      for (let i = vols.length - 1; i >= 0; i--) {
        if (vols[i].t >= vols[i].dur) {
          vols[i].l.each((im) => im.destroy());
          vols.splice(i, 1);
        }
      }

      // the cloth
      for (const [i, b] of banners.entries()) {
        b.step(dt, (1 + gust * 1.2) * cm);
        b.each((im) => im.setRotation((Math.sin(t * 0.7 + i * 2) * 0.016 + Math.sin(t * 1.9 + i) * 0.006) * cm + gust * 0.01 * (i ? -1 : 1)));
      }
      const br = Math.sin(t * 0.55) * 0.6 + Math.sin(t * 1.37 + 1) * 0.3 + Math.sin(t * 2.9) * 0.1;
      flapL.setScale(1 + (br * 0.012 + gust * 0.018) * cm, 1);
      flapR.setScale(1 + (Math.sin(t * 0.5 + 2) * 0.012 + gust * 0.018) * cm, 1);
      flapL.rotation = (br * 0.003 + gust * 0.004) * cm;
      flapR.rotation = -(Math.sin(t * 0.5 + 2) * 0.003 + gust * 0.004) * cm;
      val.y = valY + valS.step(0, dt) * 0.06 + Math.sin(t * 0.8) * 0.8 * cm;
      val.setScale(1, 1 + (Math.sin(t * 0.9 + 0.4) * 0.006 + gust * 0.01) * cm);

      // the parasol, the fans, the vessels
      para.update(dt, t);
      paraImg.y = paraY + paraBob.step(0, dt) * 0.04;
      for (const f of fans) f.update(dt, t);
      ewer.update(dt, t);
      cup.update(dt, t);

      // the incense and the braziers' smoke
      for (const [i, s] of incense.entries()) {
        s.step(dt, (1 + gust * 0.8) * cm);
        s.alpha = 0.95 - gutter * 0.3;
        s.each((im) => im.setRotation((gust * 0.16 + Math.sin(t * 0.3 + i) * 0.03) * cm));
      }
      for (const s of brzSmoke) {
        s.step(dt, cm);
        s.each((im) => im.setRotation(gust * 0.2 * cm));
      }

      // the fires
      for (const [i, f] of fires.entries()) {
        const b = XX.braziers[i];
        f.flare = Math.max(0, f.flare - dt / 1.4);
        const fk = flicker(t, f.seed);
        const gut = gutter * (1 - gutter) * 4;
        f.l.step(dt, 1 + f.flare * 0.8 + gust * 0.4);
        f.l.alpha = clamp01(0.95 - gut * 0.25 + f.flare * 0.2);
        const sc = (1 + f.flare * 0.3 - gut * 0.2) / FR;
        f.l.each((im) => im.setScale(f.dir * sc * (1 + Math.sin(t * 5 + f.seed) * 0.03), sc * (1 + f.flare * 0.2 + Math.sin(t * 3.3 + f.seed) * 0.05)).setRotation((-gust * 0.22 + Math.sin(t * 1.3 + f.seed) * 0.03) * (i ? -0.4 : 1)));
        const glowA = (0.15 + f.flare * 0.18 + dk * 0.1) * fk;
        f.glow.setAlpha(glowA);
        f.pool.setAlpha((0.11 + f.flare * 0.08 + dk * 0.06) * fk);
        f.core.setAlpha((0.32 + f.flare * 0.25) * fk);
        emberRate.tick((2.2 + f.flare * 12) * cm, dt, () => embers.spawn({ x: b.x + (crand() - 0.5) * 70, y: b.rim - 20 - crand() * 40, vx: (crand() - 0.5) * 20 - gust * 40, vy: -40 - crand() * 70, life: 1.6 + crand() * 1.2, r0: 1.3, r1: 0.3, a: 0.95, tint: crand() < 0.5 ? 0xffb050 : 0xff7a2a, drag: 0.3, grav: -14, fade: 0.06 }));
      }

      // the motes turning in the beam (dimmed with it)
      moteRate.tick(3 * cm, dt, () => {
        const [x, y] = inBeam();
        motes.spawn({ x, y, vx: 3 + crand() * 6 + gust * 20, vy: (crand() - 0.5) * 4, life: 6 + crand() * 6, r0: 0.9 + crand() * 1.2, a: 0.55 * (1 - dk), tint: 0xffd0a0, fade: 0.3 });
      });

      // the coins
      for (const c of coins) {
        if (c.state < 0) continue;
        c.t += dt;
        if (c.state === 0) {
          // in the air off the heap, then rolling on its edge: spinning, drifting towards us, slowing
          c.vy += 900 * dt;
          c.x += c.vx * dt;
          c.y += c.vy * dt;
          c.fy = Math.min(736, c.fy + c.vf * dt);
          if (c.y >= c.fy) {
            c.y = c.fy;
            c.vy = c.vy > 120 ? -c.vy * 0.3 : 0;
            c.vx *= 1 - dt * 0.9;
            c.vf *= 1 - dt * 0.9;
            if (Math.abs(c.vx) < 18 && c.vy === 0) {
              c.state = 1;
              c.t = 0;
            }
          }
          c.spin += (c.vx / 5) * dt;
          c.im.setPosition(c.x, c.y - 5).setRotation(c.spin).setScale(0.42, 0.42);
          c.sh.setPosition(c.x, c.fy + 1).setScale(0.07, 0.015).setAlpha(0.35);
        } else if (c.state === 1) {
          // the wobble down: tilting over, rattling faster and faster, then flat
          const u = Math.min(1, c.t / 1.1);
          const tilt = 1 - u * 0.6;
          c.wob += dt * (8 + u * 30);
          c.x += c.vx * dt * (1 - u);
          c.im.setPosition(c.x + Math.sin(c.wob) * 2 * (1 - u), c.y - 5 * tilt).setScale(0.42 * (0.7 + 0.3 * Math.abs(Math.cos(c.wob))), 0.42 * tilt).setRotation(Math.sin(c.wob) * 0.3 * (1 - u));
          if (u >= 1) {
            c.state = 2;
            c.t = 0;
          }
        } else {
          // lying there, then gone
          c.im.setAlpha(clamp01(1 - (c.t - 4) / 1.5));
          c.sh.setAlpha(0.35 * clamp01(1 - (c.t - 4) / 1.5));
          if (c.t > 5.5) {
            c.state = -1;
            c.im.setVisible(false);
            c.sh.setVisible(false);
          }
        }
      }

      // the bribe: glints running over the gold, a warm light swelling on the throne
      for (const g of glints) {
        if (g.t < 0) continue;
        g.t += dt;
        const u = (g.t - g.delay) / 0.55;
        if (u < 0) continue;
        if (u >= 1) {
          g.t = -1;
          g.im.setAlpha(0);
          continue;
        }
        const a = Math.sin(u * Math.PI);
        g.im.setAlpha(a).setScale(0.35 + a * 0.75).setRotation(u * 1.2);
      }
      throneGlow.setAlpha(Math.sin(Math.min(1, bribe) * Math.PI) * 0.3);

      sparks.update(dt);
      embers.update(dt);
      motes.update(dt);
      dust.update(dt);
      grit.update(dt);
    },
    destroy: unlisten,
  };
});
