// The Hot Gates (King Leonidas's nemesis stage, in place of the Labyrinth, Stage 16, Act 9, waves 81–84), redrawn with
// the location kit (src/art/scene), painted in Act 9's stone, bronze and painterly finish (scene-labyrinth.ts,
// scene-medusa.ts, scene-tartarus.ts). Ancient Greece, not a film: every emblem and banner here is our own.
//
// We stand on a worn limestone platform on the Greek side of the narrow pass at Thermopylae and look across it. On the
// right, the sheer limestone face of the mountain runs away along the pass to the plain: bedded, jointed, stained rust
// and grey, scrub on its ledges, its far end lost in the haze. On the left the sea breaks on the rocks, the far shore's
// mountains pale across the gulf. Across the pass, the old Phocian wall the Greeks have rebuilt: rough drystone,
// chinked with small stones, the new courses paler on top; a gap broken in it, filled with sharpened stakes, a red
// cloak snagged on one. Round bronze shields stand propped along its foot (a lambda, a star, a club, a meander rim:
// our own simple Greek devices), a stack of spears lashed together between them. At the cliff's foot on the right, the
// hot springs that name the place: rimstone terraces of travertine, milky blue water, steam. Over the wall, the plain
// beyond filling with the Persian host: a sea of men and spears under their standards (our own: gilt sun discs, cloth
// banners), chariots on its flanks, two elephants at the back, the tents of the camp and its smoke beyond, dust over
// all of it. The table is the platform: big worn flags, low in contrast, a Greek key cut along its front.
//
// The stage's four waves (the light, the host's dust and fires, and the sea carry them):
// 1. dawn: a low sun over the far shore, the sky rose and gold, long warm light across the cliff and the wall;
// 2. noon: a bleached sky, hard white glare, the sea glittering, the dust rising off the plain;
// 3. the arrows: the host looses volley after volley; the sky goes dark with dust and arrows, which come down on the
//    plain beyond the wall (never over the table), and stick there;
// 4. a blood-red dusk: the sun low and red, the camp's fires lit across the plain, their smoke lit from below.
//
// Live, the heroes:
// - the surf: painted at 12 phases (a swell rolling in, bursting white over the rocks, pouring off them as lace);
// - the host: its banners rippling (painted cloth frames), dust rolling across it, the campfires' smoke (painted
//   frames), the volley (a painted, fluttering cloud of arrows flying in arcs, arrows thudding in and staying);
// - the springs' steam (painted frames) and the gulls (painted wingbeats) wheeling over the sea and perching on the wall.
// Stomps: the shields rattle on their rims and one slides down flat, dust and grit shake off the wall, the gulls on it
// take off.

import Phaser from 'phaser';
import { type Air, type Ctx, type R, TY, W, airMix, calmLanes, castShadow, crevice, groundShadow, lightPool, polyPath, vfill, vignetteAll, within } from '../../art/scene/kit';
import type { SceneSpec } from '../../art/scene/layers';
import { tableFalloff, tableSeam } from '../../art/scene/materials';
import { crack, drift, lay, noiseMask, softly, streaks, surface } from '../../art/scene/paint';
import { cloud, farLand, skyFill, sun } from '../../art/scene/sky';
import { ZB, xAt, yAt, zFront } from '../../art/sceneKit';
import { hashStr, makeCanvas, rgba, rng, shade } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { Loop, Parts, Rate, Spring, Swing, sheet } from '../../game/sceneAnim';
import { type KitLive, calm, flicker, registerKitScene, waveK } from '../../game/sceneLive';
import { clothFrame, smokeFrame } from './sceneBits';
import { BRONZE } from './scene-labyrinth';

type Pt = [number, number];
type Box = { x: number; y: number; w: number; h: number };
const P2 = Math.PI * 2;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const mixHex = (a: string, b: string, t: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
};
const ease = (t: number) => t * t * (3 - 2 * t);
const boxOfPts = (pts: Pt[], pad = 4): Box => {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x = Math.floor(Math.min(...xs) - pad);
  const y = Math.floor(Math.min(...ys) - pad);
  return { x, y, w: Math.ceil(Math.max(...xs) + pad) - x, h: Math.ceil(Math.max(...ys) + pad) - y };
};
/** Linear interpolation along a polyline given as points sorted by `key` (0 x, 1 y): the other coordinate. */
function along(pts: Pt[], v: number, key: 0 | 1): number {
  const o = key === 0 ? 1 : 0;
  const s = pts[0][key] <= pts[pts.length - 1][key] ? pts : [...pts].reverse();
  if (v <= s[0][key]) return s[0][o];
  for (let i = 1; i < s.length; i++) {
    if (v <= s[i][key]) {
      const t = (v - s[i - 1][key]) / (s[i][key] - s[i - 1][key] || 1);
      return s[i - 1][o] + (s[i][o] - s[i - 1][o]) * t;
    }
  }
  return s[s.length - 1][o];
}

// ——— the layout (screen px) ———

/** The sea's horizon (eye height) and the point down the pass the road and the cliff's beds run to. */
const HZ = 418;
const VPX = 1040;
/** The cliff's silhouette against the sky, top down to its far end on the plain, then its foot along the pass. */
const CLIFF_SKY: Pt[] = [[1352, -6], [1344, 30], [1349, 58], [1334, 84], [1337, 118], [1322, 150], [1318, 194], [1305, 214], [1301, 248], [1286, 276], [1279, 312], [1264, 342], [1255, 372], [1238, 398], [1228, 416], [1220, 428]];
const CLIFF_FOOT: Pt[] = [[1220, 428], [1252, 446], [1300, 480], [1360, 526], [1420, 580], [1478, 634], [1526, 682], [1562, 700], [1640, 707], [1760, 711], [1930, 715]];
const CLIFF: Pt[] = [...CLIFF_SKY, ...CLIFF_FOOT.slice(1), [1930, -6]];
/** The shore, far to near (the sea is to its left). */
const SHORE: Pt[] = [[724, 420], [684, 424], [644, 431], [610, 434], [566, 450], [540, 458], [504, 478], [486, 488], [458, 514], [446, 530], [427, 554], [418, 572], [404, 602], [398, 622], [389, 648], [386, 668], [380, 690], [366, 708], [352, 730], [330, 748], [316, 764]];
const shoreX = (y: number) => along(SHORE, y, 1);
const cliffX = (y: number) => along(CLIFF_FOOT, y, 1);
/** The wall: its ends, its base, its top (irregular), the gap in it. */
export const HG = {
  front: 1040,
  wall: { x0: 372, x1: 1532, base: 690, top: 556 },
  gap: { x0: 1172, x1: 1288, low: 640 },
  /** The near rocks the surf breaks on (the hero's box) and the far ones beyond the wall. */
  surf: { x: 0, y: 396, w: 440, h: 360 },
  /** Shields propped along the wall's foot: x, radius, device. */
  shields: [[452, 31, 'lambda'], [540, 30, 'star'], [626, 31, 'meander'], [828, 32, 'lambda'], [920, 30, 'club'], [1012, 31, 'plain'], [1352, 31, 'lambda'], [1446, 30, 'star']] as [number, number, string][],
  /** The one that slides down flat on a hard stomp. */
  topple: 4,
  /** The spear stack (its foot's middle), the springs, the host's band. */
  spears: { x: 728, y: 742 },
  springs: { x0: 1640, x1: 1920, y0: 700, y1: 762 },
  host: { x0: 600, x1: 1252, y0: 418, y1: 478 },
  /** Where the volleys come down: the strip of plain between the host and the wall. */
  land: { x0: 560, x1: 1240, y0: 488, y1: 548 },
};
const WL = HG.wall;
const GAP = HG.gap;
const wallR = rng(hashStr('hg:walltop'));
const WALL_TOP: Pt[] = (() => {
  const pts: Pt[] = [];
  for (let x = WL.x0; x <= WL.x1 + 1; x += 14) {
    let y = WL.top + Math.sin(x * 0.011) * 5 + Math.sin(x * 0.031 + 2) * 3 + (wallR() - 0.5) * 7;
    // the gap: broken down to a rubble saddle
    const g = clamp01(1 - Math.abs(x - (GAP.x0 + GAP.x1) / 2) / ((GAP.x1 - GAP.x0) / 2 + 26));
    y = y + (GAP.low - WL.top) * ease(Math.min(1, g * 1.5)) + (wallR() - 0.5) * 6 * g;
    // the left end stepped down to the rocks
    if (x < WL.x0 + 60) y += (WL.x0 + 60 - x) * 0.9;
    pts.push([x, y]);
  }
  return pts;
})();
export const wallTop = (x: number) => along(WALL_TOP, x, 0);
/** How much of the wall's top we see (less where it's broken down). */
function capK(x: number): number {
  const g = clamp01(1 - Math.abs(x - (GAP.x0 + GAP.x1) / 2) / ((GAP.x1 - GAP.x0) / 2 + 20));
  return (1 - 0.75 * Math.min(1, g * 1.6)) * (x < WL.x0 + 50 ? 0.5 + (x - WL.x0) / 100 : 1);
}

// ——— the far ranges: the skyline the skies are cut to ———

const ridgeR = rng(hashStr('hg:ridges'));
function ridge(x0: number, x1: number, base: number, peaks: [number, number, number][], rough: number): Pt[] {
  const pts: Pt[] = [];
  for (let x = x0; x <= x1; x += 8) {
    let y = base;
    for (const [px, ph, pw] of peaks) y -= ph * Math.exp(-(((x - px) / pw) ** 2));
    y += Math.sin(x * 0.05) * rough + (ridgeR() - 0.5) * rough;
    pts.push([x, Math.min(HZ, y)]);
  }
  return pts;
}
/** Across the gulf (left, over the sea), the plain's far mountains, and their nearer foothills. */
const GULF = ridge(-10, 760, HZ - 4, [[60, 46, 150], [250, 30, 120], [420, 40, 140], [620, 14, 90]], 2.5);
const RANGE = ridge(520, 1300, HZ - 6, [[700, 44, 110], [880, 70, 150], [1050, 56, 120], [1180, 80, 140]], 3);
const HILLS = ridge(560, 1300, HZ + 2, [[760, 16, 70], [960, 22, 90], [1130, 26, 80]], 1.5);

// ——— colour ———

/** The dawn air: far things go to a rosy haze. */
const AIR: Air = { color: '#d8b4aa', far: 0.62 };
const SUN_AT: Pt = [232, 350];
const LIME = { lit: '#ecd2ae', body: '#b8a088', dark: '#7c6a5e', deep: '#3e3430', warm: '#ffcf9a', cool: '#6a6a96' };
const CLOAK = { lit: '#c8463a', body: '#8e1e1e', dark: '#4a0c12' };
const SEA = { far: '#c8a6b4', deep: '#3c5e82', near: '#244668' };

// ——— the skies ———

interface SkyPal {
  stops: [number, string][];
  sun: Pt;
  sunR: number;
  disc: string;
  glow: string;
  sunA: number;
  bloom: number;
  /** The glow along the horizon and its strength. */
  hz: string;
  hzA: number;
  cloud: { lit: string; body: string; shadow: string };
  clouds: [number, number, number, number, 'cumulus' | 'stratus' | 'bank'][];
  /** A pall of dust or smoke over the plain (colour, strength). */
  pall?: [string, number];
  /** The air the far mountains are seen through under this sky, and their lit ridges. */
  air: Air;
  lit: string;
}

export const SKY_BOX: Box = { x: 0, y: 0, w: 1350, h: HZ + 12 };
const DAWN: SkyPal = {
  stops: [[0, '#4e5e98'], [0.32, '#8c86b2'], [0.62, '#e0aaa6'], [0.84, '#f8c8a2'], [1, '#ffe0b0']],
  sun: SUN_AT,
  sunR: 22,
  disc: '#fff4d8',
  glow: '#ffb478',
  sunA: 0.75,
  bloom: 10,
  hz: '#ffd2a0',
  hzA: 0.55,
  cloud: { lit: '#ffd2aa', body: '#b494b0', shadow: '#6e6292' },
  clouds: [[520, 150, 420, 34, 'stratus'], [980, 96, 520, 40, 'stratus'], [300, 236, 300, 22, 'stratus'], [820, 262, 260, 18, 'stratus'], [1180, 196, 240, 24, 'stratus']],
  air: AIR,
  lit: '#ffd8b4',
};
const NOON: SkyPal = {
  stops: [[0, '#3a78c0'], [0.45, '#7eb0dc'], [0.8, '#d2e0e6'], [1, '#f4eedc']],
  sun: [150, -70],
  sunR: 40,
  disc: '#ffffff',
  glow: '#fff6dc',
  sunA: 0.9,
  bloom: 9,
  hz: '#fff4dc',
  hzA: 0.5,
  cloud: { lit: '#ffffff', body: '#dfe6ee', shadow: '#a4b0c8' },
  clouds: [[760, 300, 200, 60, 'cumulus'], [1100, 322, 160, 44, 'cumulus'], [420, 330, 140, 36, 'cumulus']],
  air: { color: '#dce2e8', far: 0.7 },
  lit: '#ffffff',
};
const ARROWS: SkyPal = {
  stops: [[0, '#222838'], [0.4, '#3a4256'], [0.75, '#626678'], [1, '#8a8a8e']],
  sun: [420, 190],
  sunR: 20,
  disc: '#f4e2c0',
  glow: '#b0b8c8',
  sunA: 0.3,
  bloom: 6,
  hz: '#b8b0a8',
  hzA: 0.3,
  cloud: { lit: '#8a90a0', body: '#3a4050', shadow: '#1c2030' },
  clouds: [[260, 90, 640, 120, 'bank'], [900, 60, 760, 140, 'bank'], [620, 230, 520, 70, 'bank'], [1180, 250, 380, 60, 'bank']],
  pall: ['#5a5a62', 0.5],
  air: { color: '#727888', far: 0.78 },
  lit: '#b8bcc8',
};
const DUSK: SkyPal = {
  stops: [[0, '#241a40'], [0.3, '#4e2448'], [0.62, '#a8342e'], [0.86, '#e8622c'], [1, '#ff9a48']],
  sun: [300, 404],
  sunR: 30,
  disc: '#ffd8a8',
  glow: '#ff5a26',
  sunA: 0.8,
  bloom: 9,
  hz: '#ff7a38',
  hzA: 0.6,
  cloud: { lit: '#ff8a4a', body: '#6a2a40', shadow: '#2a1430' },
  clouds: [[560, 170, 520, 40, 'stratus'], [1040, 120, 560, 46, 'stratus'], [360, 270, 320, 22, 'stratus'], [900, 280, 300, 20, 'stratus']],
  pall: ['#5a1a1a', 0.35],
  air: { color: '#8a3448', far: 0.55 },
  lit: '#ff8a50',
};

function skyPaint(ctx: Ctx, r: R, p: SkyPal, withRanges = false): void {
  const b = SKY_BOX;
  skyFill(ctx, b, p.stops, 0.04);
  // the light along the horizon, strongest under the sun
  const g = ctx.createRadialGradient(p.sun[0], HZ, 0, p.sun[0], HZ, 900);
  g.addColorStop(0, rgba(p.hz, p.hzA));
  g.addColorStop(0.5, rgba(p.hz, p.hzA * 0.35));
  g.addColorStop(1, rgba(p.hz, 0));
  ctx.save();
  ctx.translate(0, HZ);
  ctx.scale(1, 0.32);
  ctx.translate(0, -HZ);
  ctx.fillStyle = g;
  ctx.fillRect(b.x, HZ - 900, b.w, 1000);
  ctx.restore();
  sun(ctx, p.sun[0], p.sun[1], p.sunR, { disc: p.disc, glow: p.glow, a: p.sunA, bloom: p.bloom, squash: p.sun[1] > 300 ? 0.55 : 1 });
  for (const [x, y, w, h, kind] of p.clouds) {
    cloud(ctx, r, x, y, w, h, { ...p.cloud, sunX: p.sun[0], sunY: p.sun[1], kind, rim: kind === 'bank' ? 0.25 : 0.6, depth: Math.min(0.8, y / 420), air: p.air, res: 0.4 });
  }
  // (a later wave's sky brings the far mountains in its own air: they're cut out of the base with it)
  if (withRanges) farRanges(ctx, r, p.air, p.lit, false);
  if (p.pall) {
    // dust or smoke over the plain: thick low down, thinning up the sky
    softly(ctx, b, (c) => {
      for (let i = 0; i < 26; i++) {
        const x = 560 + r() * 760;
        const y = HZ - 20 - r() * 160;
        const rad = 80 + r() * 140;
        const rg = c.createRadialGradient(x, y, 0, x, y, rad);
        rg.addColorStop(0, rgba(p.pall![0], p.pall![1] * 0.5));
        rg.addColorStop(1, rgba(p.pall![0], 0));
        c.fillStyle = rg;
        c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
      vfillC(c, b.x, HZ - 180, b.w, 192, [[0, rgba(p.pall![0], 0)], [1, rgba(p.pall![0], p.pall![1] * 0.6)]]);
    }, 0.25);
  }
}
function vfillC(c: Ctx, x: number, y: number, w: number, h: number, stops: [number, string][]): void {
  const g = c.createLinearGradient(0, y, 0, y + h);
  for (const [t, col] of stops) g.addColorStop(t, col);
  c.fillStyle = g;
  c.fillRect(x, y, w, h);
}

/** The sky's own region with the far mountains: left of the cliff, above the foothills and the sea's horizon. */
function skyClip(c: Ctx): void {
  c.beginPath();
  c.moveTo(-2, -8);
  for (const [x, y] of CLIFF_SKY) c.lineTo(x + 1, y);
  for (let x = 1220; x >= -2; x -= 6) c.lineTo(x, (x >= 560 && x <= 1300 ? Math.min(HZ, along(HILLS, x, 0)) : HZ) + 1.5);
  c.closePath();
  c.clip();
}
/** A sky for a later wave, cut to the sky's region (live only: faded in over the dawn). */
const skyCut = (p: SkyPal) => (ctx: Ctx, r: R) => {
  ctx.save();
  skyClip(ctx);
  skyPaint(ctx, r, p, true);
  ctx.restore();
};

// ——— the far ranges ———

export const FAR_BOX: Box = { x: 0, y: 300, w: 1320, h: HZ - 300 + 8 };
const closeOff = (pts: Pt[], base: number): Pt[] => [...pts, [pts[pts.length - 1][0], base], [pts[0][0], base]];

/** Gullies and spurs on a far range: soft strokes running down from the crest, lit on the side facing the sun. */
function ranges(ctx: Ctx, r: R, pts: Pt[], depth: number, lit: string, dark: string, air: Air): void {
  const path = polyPath(closeOff(pts, HZ + 6));
  within(ctx, path, () => {
    softly(ctx, boxOfPts(pts, 30), (c) => {
      c.lineCap = 'round';
      for (let i = 0; i < 46; i++) {
        const x = pts[0][0] + r() * (pts[pts.length - 1][0] - pts[0][0]);
        const y = along(pts, x, 0);
        const len = 18 + r() * 50;
        const lean = 0.35 + r() * 0.5;
        c.strokeStyle = rgba(lit, 0.15 * (1 - depth * 0.5));
        c.lineWidth = 6 + r() * 8;
        c.beginPath();
        c.moveTo(x, y + 2);
        c.lineTo(x - len * lean * 0.6, y + len);
        c.stroke();
        c.strokeStyle = rgba(dark, 0.13);
        c.lineWidth = 4 + r() * 6;
        c.beginPath();
        c.moveTo(x + 4, y + 3);
        c.lineTo(x + 4 + len * lean * 0.5, y + len);
        c.stroke();
      }
    }, 0.5);
    // the haze thickening down to the plain
    vfill(ctx, 0, HZ - 50, 1320, 58, [[0, rgba(air.color, 0)], [1, rgba(air.color, 0.55 * depth)]]);
  });
}

function farRanges(ctx: Ctx, r: R, air: Air, lit: string, hills: boolean): void {
  // across the gulf: the far shore's mountains, pale as the sky
  farLand(ctx, closeOff(GULF, HZ + 2), HZ, '#6a6496', 0.92, air, lit, 0.45);
  ranges(ctx, r, GULF, 0.9, mixHex(lit, '#ffffff', 0.3), '#7a70a0', air);
  // the plain's far range, and the foothills nearer
  farLand(ctx, closeOff(RANGE, HZ + 4), HZ, '#5e5c88', 0.84, air, lit, 0.5);
  ranges(ctx, r, RANGE, 0.84, lit, '#6a6290', air);
  if (hills) {
    farLand(ctx, closeOff(HILLS, HZ + 6), HZ + 4, '#76687a', 0.62, air, lit, 0.4);
    ranges(ctx, r, HILLS, 0.6, lit, '#5a4a66', air);
  }
}

function far(ctx: Ctx, r: R): void {
  farRanges(ctx, r, AIR, '#ffd2ac', true);
}

// ——— the sea, the rocks ———

const SEA_PTS: Pt[] = [[-4, HZ], [726, HZ], ...SHORE, [-4, 766]];
export const SEA_BOX: Box = { x: 0, y: HZ - 2, w: 730, h: 766 - HZ + 2 };

function sea(ctx: Ctx, r: R): void {
  within(ctx, polyPath(SEA_PTS), () => {
    waterPaint(ctx, r);
    // the shallows over the rocky shelf along the shore: paler, greener
    softly(ctx, SEA_BOX, (c) => {
      c.strokeStyle = rgba('#7aa2a0', 0.22);
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.lineWidth = 22;
      c.beginPath();
      SHORE.forEach(([x, y], i) => (i ? c.lineTo(x - 8, y) : c.moveTo(x - 8, y)));
      c.stroke();
    }, 0.25);
  });
  // the shore's lace
  foamAlong(ctx, r, 0.7);
}

function waterPaint(ctx: Ctx, r: R): void {
  const y0 = HZ;
  const y1 = 766;
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, SEA.far);
  g.addColorStop(0.18, '#7a7ea6');
  g.addColorStop(0.5, SEA.deep);
  g.addColorStop(1, SEA.near);
  ctx.fillStyle = g;
  ctx.fillRect(0, y0, 730, y1 - y0);
  lay(ctx, drift('#6a8cb0', '#1a3456', 5, 33, 256, 32), SEA_BOX, 0.45);
  // swells: long bands, crests lit rose on their sunward faces, troughs dark; closer and fainter towards the horizon
  ctx.lineCap = 'round';
  for (let j = 0; j < 22; j++) {
    const t = ((j + 0.5) / 22) ** 1.8;
    const y = y0 + 4 + t * (y1 - y0 - 10);
    const amp = 0.5 + t * 4;
    const f = 0.014 / (0.3 + t);
    const ph = r() * 10;
    for (const [dy, col, al, w] of [[amp * 1.1, '#14284a', 0.14 + t * 0.2, 1 + t * 4], [-amp * 0.3, '#f4c8b8', 0.1 + t * 0.18, 0.8 + t * 2.2]] as const) {
      ctx.strokeStyle = rgba(col, al);
      ctx.lineWidth = w;
      ctx.beginPath();
      let on = false;
      for (let x = -10; x <= 740; x += 8 + t * 14) {
        const vis = Math.sin(x * f * 2.7 + ph) + Math.sin(x * f * 6.1 + j) > -0.2;
        const yy = y + dy + Math.sin(x * f + ph) * amp;
        if (vis && !on) ctx.moveTo(x, yy);
        else if (vis) ctx.lineTo(x, yy);
        on = vis;
      }
      ctx.stroke();
    }
  }
  // the sky reflected along the horizon
  vfill(ctx, 0, y0, 730, 40, [[0, rgba('#f4c8b4', 0.7)], [1, rgba('#f4c8b4', 0)]]);
}

/** Foam lying along the shore: a lace beyond the wall, and the near wash along the rocks. */
function foamAlong(ctx: Ctx, r: R, a: number): void {
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = rgba('#fbf4ee', a * (0.55 - i * 0.15));
    ctx.lineWidth = 2.2 - i * 0.5;
    ctx.beginPath();
    let on = false;
    for (let y = 422; y < 760; y += 3) {
      const x = shoreX(y) - 3 - i * (3 + (y - 420) * 0.03) + Math.sin(y * 0.2 + i * 2) * (1 + (y - 420) * 0.01);
      const vis = Math.sin(y * 0.09 + i * 3) + Math.sin(y * 0.031 + i) > -0.6 + i * 0.4;
      if (vis && !on) ctx.moveTo(x, y);
      else if (vis) ctx.lineTo(x, y);
      on = vis;
    }
    ctx.stroke();
  }
  ctx.restore();
  void r;
}

/** The sun's road on the sea: a soft glow narrow at the horizon and broadening towards us, broken into glitter on
 * the swells. (Its own piece: the live layer fades it with the light.) */
function sunRoad(ctx: Ctx, r: R, gx: number, col: string, a: number): void {
  const y0 = HZ;
  const y1 = 766;
  softly(ctx, SEA_BOX, (q) => {
    const N = 48;
    for (let i = 0; i < N; i++) {
      const t = i / N;
      const y = y0 + t * (y1 - y0);
      const hw = 14 + t * 220;
      const lg = q.createLinearGradient(gx - hw, 0, gx + hw, 0);
      const al = a * 0.42 * (1 - t * 0.6);
      lg.addColorStop(0, rgba(col, 0));
      lg.addColorStop(0.3, rgba(col, al * 0.35));
      lg.addColorStop(0.5, rgba(col, al));
      lg.addColorStop(0.7, rgba(col, al * 0.35));
      lg.addColorStop(1, rgba(col, 0));
      q.fillStyle = lg;
      q.fillRect(gx - hw, y, hw * 2, (y1 - y0) / N + 1);
    }
  }, 0.2, 'lighter');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 380; i++) {
    const t = r() ** 0.9;
    const y = y0 + 2 + t * (y1 - y0 - 4);
    const spread = 200 * (0.07 + t);
    const x = gx + (r() + r() + r() - 1.5) * spread;
    const len = (5 + r() * 20) * (0.3 + t);
    ctx.fillStyle = rgba(r() < 0.3 ? '#ffffff' : col, a * 0.55 * (0.3 + r() * 0.7) * (1 - t * 0.4));
    ctx.fillRect(x - len / 2, y, len, Math.max(1, 2.2 * (0.3 + t)));
  }
  ctx.restore();
}

function roadStill(ctx: Ctx, r: R): void {
  within(ctx, polyPath(SEA_PTS), () => sunRoad(ctx, r, SUN_AT[0], '#ffd2a0', 1));
}

const ROCKS_NEAR: Pt[][] = [
  [[104, 586], [110, 570], [122, 562], [130, 552], [142, 550], [150, 543], [163, 547], [172, 556], [186, 558], [196, 568], [204, 586]],
  [[-14, 728], [-14, 640], [4, 626], [18, 606], [34, 600], [48, 588], [66, 592], [80, 580], [96, 586], [112, 598], [128, 596], [146, 612], [160, 626], [176, 632], [192, 652], [204, 672], [212, 700], [208, 728]],
  [[196, 740], [198, 712], [210, 690], [222, 676], [236, 670], [248, 656], [262, 660], [276, 652], [290, 664], [302, 676], [310, 694], [316, 716], [312, 740]],
  [[318, 750], [318, 700], [326, 676], [340, 662], [352, 646], [368, 640], [382, 630], [396, 638], [410, 648], [420, 664], [428, 690], [430, 720], [420, 748]],
];
const ROCKS_FAR: Pt[][] = [
  [[470, 520], [488, 506], [512, 508], [526, 522], [520, 532], [474, 534]],
  [[540, 486], [556, 476], [576, 478], [586, 490], [548, 494]],
  [[434, 556], [452, 540], [474, 544], [482, 562], [438, 566]],
];
export const ROCKS_BOX: Box = { x: 0, y: 470, w: 600, h: 296 };

function rock(ctx: Ctx, r: R, pts: Pt[], depth: number, wet: number): void {
  const path = polyPath(pts);
  const bb = boxOfPts(pts, 0);
  const lit = airMix('#cfae92', depth, AIR);
  const body = airMix('#5e5056', depth, AIR);
  const dark = airMix('#221e28', depth, AIR);
  const base = bb.y + bb.h;
  // the wash round its foot, behind it
  ctx.save();
  ctx.lineCap = 'round';
  for (let k = 0; k < 4; k++) {
    ctx.strokeStyle = rgba('#fbf6f2', (0.5 - k * 0.11) * (1 - depth * 0.4));
    ctx.lineWidth = 3 - k * 0.6;
    ctx.beginPath();
    for (let x = bb.x - 14; x <= bb.x + bb.w + 14; x += 5) {
      const y = base - 3 + k * 4 + Math.sin(x * 0.11 + k * 2) * 2;
      if (x === bb.x - 14) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
  within(ctx, path, () => {
    const g = ctx.createLinearGradient(bb.x, bb.y, bb.x + bb.w * 0.7, bb.y + bb.h);
    g.addColorStop(0, lit);
    g.addColorStop(0.35, body);
    g.addColorStop(1, dark);
    ctx.fillStyle = g;
    ctx.fillRect(bb.x, bb.y, bb.w, bb.h);
    surface(ctx, r, bb, body, { over: true, vary: 0.45, cells: 3, mottle: 0.55, strokes: 1.6, strokeAng: 1.3, strokeLen: 26, strokeW: 4, grain: 0.3, grainKind: 'speckle', seed: 41 + Math.floor(r() * 9) });
    // the planes it's broken into: each peak's sunward slope lit, its far slope in shade
    for (let i = 1; i < pts.length - 1; i++) {
      const [px, py] = pts[i];
      if (py > base - bb.h * 0.35) continue;
      const w = bb.w * (0.12 + r() * 0.16);
      ctx.fillStyle = rgba(lit, 0.28 + r() * 0.2);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px - w * 0.7, py + w * 0.9);
      ctx.lineTo(px - w * 0.1, py + w * 1.3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba(dark, 0.3 + r() * 0.2);
      ctx.beginPath();
      ctx.moveTo(px + 1, py);
      ctx.lineTo(px + w * 0.8, py + w * 1.1);
      ctx.lineTo(px + w * 0.1, py + w * 1.4);
      ctx.closePath();
      ctx.fill();
    }
    // pits and grooves the sea has cut in it (karst), each with its lit lower lip
    for (let i = 0; i < bb.w * bb.h / 500; i++) {
      const x = bb.x + r() * bb.w;
      const y = bb.y + r() * bb.h * 0.8;
      const s = 1.5 + r() * 3.5;
      ctx.fillStyle = rgba(dark, 0.5);
      ctx.beginPath();
      ctx.ellipse(x, y, s, s * (0.6 + r()), 0, 0, P2);
      ctx.fill();
      ctx.fillStyle = rgba(lit, 0.35);
      ctx.fillRect(x - s * 0.6, y + s * 0.7, s * 1.4, 1);
    }
    for (let i = 0; i < 3; i++) crack(ctx, r, bb.x + r() * bb.w, bb.y + r() * bb.h * 0.6, 1.2 + r() * 0.6, 12 + r() * 30, { col: dark, lip: lit, w: 1.1, a: 0.55, branch: 0.25 });
    // wet below the tide line: dark and cool, the sky's sheen running down it; weed and barnacles at the water
    const wy = base - bb.h * wet;
    vfill(ctx, bb.x, wy - 6, bb.w, bb.h, [[0, rgba('#1a1c2a', 0)], [0.1, rgba('#1a1c2a', 0.5)], [1, rgba('#10121c', 0.72)]]);
    ctx.strokeStyle = rgba('#f0d0c8', 0.2);
    ctx.lineWidth = 1.2;
    for (let i = 0; i < bb.w / 10; i++) {
      const x = bb.x + r() * bb.w;
      ctx.beginPath();
      ctx.moveTo(x, wy + r() * 6);
      ctx.lineTo(x + (r() - 0.5) * 3, wy + 6 + r() * bb.h * wet * 0.6);
      ctx.stroke();
    }
    ctx.fillStyle = rgba('#34442a', 0.6);
    for (let i = 0; i < bb.w / 2.5; i++) ctx.fillRect(bb.x + r() * bb.w, base - 8 + (r() - 0.5) * 6, 2 + r() * 3, 1.5 + r() * 2);
    // the dawn on its sunward shoulder
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const sg = ctx.createRadialGradient(bb.x + bb.w * 0.25, bb.y, 0, bb.x + bb.w * 0.25, bb.y, bb.w * 0.6);
    sg.addColorStop(0, rgba('#ffb07a', 0.22 * (1 - depth)));
    sg.addColorStop(1, rgba('#ffb07a', 0));
    ctx.fillStyle = sg;
    ctx.fillRect(bb.x, bb.y, bb.w, bb.h);
    ctx.restore();
  });
  ctx.strokeStyle = airMix('#1a141c', depth, AIR);
  ctx.lineWidth = 1.6 - depth * 0.8;
  ctx.lineJoin = 'round';
  path(ctx);
  ctx.stroke();
  // foam lying against its foot, in front
  ctx.strokeStyle = rgba('#fbf6f2', 0.7 * (1 - depth * 0.4));
  ctx.lineWidth = 2;
  ctx.beginPath();
  let on = false;
  for (let x = bb.x + 2; x <= bb.x + bb.w - 2; x += 4) {
    const vis = Math.sin(x * 0.2) + Math.sin(x * 0.07 + 1) > -0.4;
    const y = base - 1 + Math.sin(x * 0.3) * 1.2;
    if (vis && !on) ctx.moveTo(x, y);
    else if (vis) ctx.lineTo(x, y);
    on = vis;
  }
  ctx.stroke();
}

function rocks(ctx: Ctx, r: R): void {
  for (const p of ROCKS_FAR) rock(ctx, r, p, 0.55, 0.3);
  for (const [i, p] of ROCKS_NEAR.entries()) rock(ctx, r, p, i === 0 ? 0.3 : 0.08, i === 3 ? 0.25 : 0.4);
}

// ——— the plain beyond the wall ———

const PLAIN_PTS: Pt[] = [[724, HZ - 1], ...CLIFF_FOOT.slice(0, 7), [1526, 698], [376, 698], ...[...SHORE].reverse().filter(([, y]) => y <= 698)];
export const PLAIN_BOX: Box = { x: 370, y: HZ - 2, w: 1200, h: 700 - HZ + 2 };

/** An olive tree: a twisted trunk, a crown of grey-green leaf clusters lit on the left, its shadow laid long to the
 * right by the low sun. */
function olive(ctx: Ctx, r: R, x: number, y: number, s: number, depth: number): void {
  const air = (c: string) => airMix(c, depth, AIR);
  ctx.save();
  // the long shadow
  ctx.fillStyle = rgba(air('#3a2a20'), 0.32);
  ctx.beginPath();
  ctx.ellipse(x + s * 26, y + s * 1.5, s * 30, s * 3.6, 0.04, 0, P2);
  ctx.fill();
  // the trunk, split and twisted
  ctx.lineCap = 'round';
  for (const [dx, w] of [[-3, 4], [3, 3.4]] as const) {
    ctx.strokeStyle = air('#4a3a2c');
    ctx.lineWidth = w * s;
    ctx.beginPath();
    ctx.moveTo(x + dx * s * 0.6, y);
    ctx.bezierCurveTo(x + dx * s * 2, y - s * 8, x - dx * s, y - s * 12, x + dx * s * 1.6, y - s * 18);
    ctx.stroke();
    ctx.strokeStyle = rgba(air('#c8a888'), 0.6);
    ctx.lineWidth = w * s * 0.3;
    ctx.beginPath();
    ctx.moveTo(x + dx * s * 0.6 - w * s * 0.3, y);
    ctx.bezierCurveTo(x + dx * s * 2 - w * s * 0.3, y - s * 8, x - dx * s - w * s * 0.3, y - s * 12, x + dx * s * 1.6 - w * s * 0.3, y - s * 18);
    ctx.stroke();
  }
  // the crown: clusters of small leaves, dark inside, silvery where the light catches them
  const cy = y - s * 24;
  for (let k = 0; k < 3; k++) {
    for (let i = 0; i < 26; i++) {
      const a = r() * P2;
      const d = r() ** 0.6;
      const lx = x + Math.cos(a) * d * s * 15;
      const ly = cy + Math.sin(a) * d * s * 9;
      const litK = clamp01(0.5 - Math.cos(a) * 0.5 * d - Math.sin(a) * 0.3 * d);
      ctx.fillStyle = air(k === 0 ? '#2e3624' : k === 1 ? mixHex('#4a5636', '#8a9468', litK * 0.6) : mixHex('#6a7652', '#c8ccaa', litK));
      if (k === 2 && litK < 0.35) continue;
      ctx.beginPath();
      ctx.ellipse(lx - k * s, ly - k * s * 0.8, s * (3.4 - k * 0.8), s * (2.2 - k * 0.5), a, 0, P2);
      ctx.fill();
    }
  }
  ctx.restore();
}

const OLIVES: [number, number, number, number][] = [[560, 470, 0.7, 0.5], [1206, 458, 0.55, 0.62], [1330, 528, 1.05, 0.32], [512, 532, 1.1, 0.3], [700, 446, 0.45, 0.7]];

function plain(ctx: Ctx, r: R): void {
  within(ctx, polyPath(PLAIN_PTS), () => {
    vfill(ctx, 370, HZ, 1200, 280, [[0, '#d8b4a0'], [0.12, '#c8a084'], [0.45, '#ac8866'], [1, '#927052']]);
    surface(ctx, r, PLAIN_BOX, '#ac8866', { over: true, vary: 0.35, cells: 5, mottle: 0.3, strokes: 0.5, strokeAng: 0, strokeLen: 120, strokeW: 5, grain: 0.18, grainKind: 'speckle', seed: 51 });
    // the lie of the land: long low swells, lit on their sunward slopes, shaded beyond
    softly(ctx, PLAIN_BOX, (c) => {
      for (let i = 0; i < 14; i++) {
        const y = HZ + 10 + (i / 14) ** 1.3 * 270;
        const t = (y - HZ) / 280;
        c.strokeStyle = rgba(i % 2 ? '#e8c8a0' : '#6a4a34', 0.16 + t * 0.12);
        c.lineWidth = 6 + t * 22;
        c.beginPath();
        c.moveTo(370, y + (r() - 0.5) * 10);
        c.bezierCurveTo(700, y + (r() - 0.5) * 24, 1100, y + (r() - 0.5) * 24, 1560, y + (r() - 0.5) * 10);
        c.stroke();
      }
    }, 0.25);
    // dry grass in patches
    lay(ctx, noiseMask(10, 53, { cover: 0.35, soft: 0.15, col: '#c8a860', w: 200, h: 40 }), { x: 370, y: HZ + 40, w: 1200, h: 240 }, 0.35);
    lay(ctx, noiseMask(14, 55, { cover: 0.25, soft: 0.12, col: '#6a5232', w: 200, h: 40 }), { x: 370, y: HZ + 30, w: 1200, h: 250 }, 0.25);
    // the road down the pass: a paler worn band from the plain to the gap in the wall, ruts in it
    const gx = (GAP.x0 + GAP.x1) / 2;
    softly(ctx, PLAIN_BOX, (c) => {
      c.fillStyle = rgba('#e8caa0', 0.4);
      c.beginPath();
      c.moveTo(VPX - 8, HZ + 6);
      c.lineTo(VPX + 8, HZ + 6);
      c.lineTo(gx + 70, 700);
      c.lineTo(gx - 70, 700);
      c.closePath();
      c.fill();
    }, 0.25);
    ctx.strokeStyle = rgba('#6a4a34', 0.22);
    for (const d of [-24, 22]) {
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(VPX + d * 0.06, HZ + 8);
      ctx.lineTo(gx + d, 700);
      ctx.stroke();
    }
    // the beach: wet shingle along the sea, dry pebbles above it
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const [w, col, a] of [[22, '#e0c8a8', 0.5], [9, '#5a4a44', 0.5], [3, '#3a3036', 0.5]] as const) {
      ctx.strokeStyle = rgba(col, a);
      ctx.beginPath();
      SHORE.forEach(([x, y], i) => {
        const k = 0.4 + (y - HZ) / 300;
        ctx.lineWidth = w * k;
        if (i) ctx.lineTo(x + 2 + w * k * 0.3, y);
        else ctx.moveTo(x + 2, y);
      });
      ctx.stroke();
    }
    // scrub (dry kermes oak, thyme) and stones, each with its shadow, scattered thicker towards the cliff and the shore
    for (let i = 0; i < 260; i++) {
      const y = HZ + 6 + (r() ** 0.8) * 280;
      const xl = shoreX(Math.min(698, y)) + 14;
      const xr = cliffX(Math.min(698, y)) - 6;
      if (xr <= xl) continue;
      const u = r();
      const edge = r() < 0.55 ? (r() < 0.5 ? u * 0.25 : 1 - u * 0.25) : u;
      const x = xl + edge * (xr - xl);
      const s = 0.5 + (y - HZ) / 70;
      const depth = 1 - (y - HZ) / 300;
      if (r() < 0.6) {
        ctx.fillStyle = rgba(airMix('#3a2a1c', depth, AIR), 0.35);
        ctx.beginPath();
        ctx.ellipse(x + s * 5, y + s * 0.5, s * 6, s * 0.8, 0, 0, P2);
        ctx.fill();
        for (let k = 0; k < 7; k++) {
          const kk = k / 7;
          ctx.fillStyle = airMix(kk < 0.4 ? '#34401e' : kk < 0.75 ? '#56602e' : '#9a9452', depth, AIR);
          ctx.beginPath();
          ctx.ellipse(x + (r() - 0.5) * s * 2.6 - kk * s * 0.8, y - s * (0.6 + kk * 1.2) + (r() - 0.5) * s * 0.6, s * (1.3 - kk * 0.5), s * (0.9 - kk * 0.3), 0, 0, P2);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = rgba('#3a2a1c', 0.35);
        ctx.fillRect(x + s * 0.4, y, s * 3, s * 0.5);
        ctx.fillStyle = airMix('#e2cbb0', depth, AIR);
        ctx.fillRect(x, y - s, s * 1.6, s);
        ctx.fillStyle = airMix('#8a7262', depth, AIR);
        ctx.fillRect(x + s * 0.9, y - s, s * 0.7, s);
      }
    }
    for (const [x, y, s, d] of OLIVES) olive(ctx, r, x, y, s, d);
    // the haze lying on the far plain, and the scree along the cliff's foot
    vfill(ctx, 370, HZ, 1200, 60, [[0, rgba('#e8c4b0', 0.6)], [1, rgba('#e8c4b0', 0)]]);
    for (let i = 0; i < 110; i++) {
      const y = HZ + 12 + r() * 270;
      const x = cliffX(y) - r() * (8 + (y - HZ) * 0.15);
      const s = 0.6 + (y - HZ) / 90;
      ctx.fillStyle = rgba(r() < 0.5 ? '#e8d4b8' : '#8a7262', 0.5);
      ctx.fillRect(x, y, s * 2.4, s * 1.2);
    }
  });
}

// ——— the Persian host ———

export const HOST_BOX: Box = { x: 590, y: 372, w: 680, h: 116 };
const DUST = '#d8b496';
const TUNIC = ['#8a2e2a', '#2e4a7a', '#c89a3a', '#e8dcc4', '#5a3a6a', '#3a6a5a', '#a8562a', '#6a5a3a'];
/** The host's standards that ripple: x, the foot of the pole, the cloth's design, size. */
export const BANNERS: [number, number, number, number][] = [
  [688, 472, 0, 6.6], [782, 476, 1, 7.2], [872, 468, 2, 6.2], [1062, 470, 1, 6.6], [1150, 474, 2, 7], [968, 476, 0, 7.4],
  [742, 452, 2, 4.6], [918, 450, 1, 4.6], [1012, 447, 2, 4.2], [1104, 452, 0, 4.6], [828, 440, 0, 3.6], [1186, 444, 1, 3.8],
];
/** The camp's fires (lit at dusk) and the smoke over them. */
export const FIRES: Pt[] = [[700, 421], [736, 420], [776, 423], [850, 420], [884, 422], [940, 421], [1000, 423], [1030, 420], [1080, 424], [1126, 421], [1166, 423], [1196, 420], [744, 436], [930, 440], [1110, 438], [690, 462], [868, 458], [1020, 464], [1180, 460], [806, 486], [972, 490], [1140, 488]];
export const SMOKES: Pt[] = [[736, 421], [884, 420], [1030, 421], [1166, 422]];
const hostDepth = (y: number) => clamp01(1 - (y - HZ) / 72) * 0.85;
const bannerDims = (s: number) => ({ bw: s * 2.6, bh: s * 2.2, top: s * 6.8 });

function figure(ctx: Ctx, x: number, y: number, s: number, tunic: string, depth: number, spear: boolean, shieldF: boolean): void {
  const dark = airMix('#2a1e1a', depth, { color: DUST, far: 0.7 });
  const tun = airMix(tunic, depth, { color: DUST, far: 0.7 });
  ctx.fillStyle = dark;
  ctx.fillRect(x - s * 0.25, y - s * 0.95, s * 0.5, s * 0.95);
  ctx.fillStyle = tun;
  ctx.fillRect(x - s * 0.36, y - s * 2.15, s * 0.72, s * 1.3);
  ctx.fillStyle = rgba('#ffe0c0', 0.35 * (1 - depth));
  ctx.fillRect(x - s * 0.36, y - s * 2.15, s * 0.26, s * 1.3);
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.arc(x, y - s * 2.45, s * 0.32, 0, P2);
  ctx.fill();
  if (spear) {
    ctx.strokeStyle = airMix('#4a3426', depth, { color: DUST, far: 0.6 });
    ctx.lineWidth = Math.max(0.6, s * 0.14);
    ctx.beginPath();
    ctx.moveTo(x + s * 0.4, y - s * 1.1);
    ctx.lineTo(x + s * 0.5, y - s * 4.4);
    ctx.stroke();
    ctx.fillStyle = rgba('#ffe8c4', 0.7 * (1 - depth * 0.6));
    ctx.fillRect(x + s * 0.45, y - s * 4.6, Math.max(0.8, s * 0.16), s * 0.4);
  }
  if (shieldF) {
    // the wicker shield of the front rank
    ctx.fillStyle = airMix('#6a4a2a', depth, { color: DUST, far: 0.7 });
    ctx.fillRect(x - s * 0.5, y - s * 2, s * 1, s * 1.6);
    ctx.fillStyle = rgba('#e8c890', 0.3 * (1 - depth));
    ctx.fillRect(x - s * 0.5, y - s * 2, s * 0.25, s * 1.6);
  }
}

/** A gilt standard: a sun disc with rays on a pole (our own device). */
function standard(ctx: Ctx, x: number, y: number, s: number, depth: number): void {
  ctx.strokeStyle = airMix('#3a2a20', depth, AIR);
  ctx.lineWidth = Math.max(0.8, s * 0.18);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - s * 6.4);
  ctx.stroke();
  const cy = y - s * 6.9;
  ctx.strokeStyle = airMix('#d8a040', depth, AIR);
  ctx.lineWidth = Math.max(0.7, s * 0.12);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * P2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * s * 0.7, cy + Math.sin(a) * s * 0.7);
    ctx.lineTo(x + Math.cos(a) * s * 1.15, cy + Math.sin(a) * s * 1.15);
    ctx.stroke();
  }
  const g = ctx.createRadialGradient(x - s * 0.25, cy - s * 0.25, 0, x, cy, s * 0.7);
  g.addColorStop(0, airMix('#fff0b8', depth, AIR));
  g.addColorStop(1, airMix('#b07a28', depth, AIR));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, cy, s * 0.7, 0, P2);
  ctx.fill();
}

function chariot(ctx: Ctx, x: number, y: number, s: number, dir: number, depth: number): void {
  const c = airMix('#3a2a22', depth, AIR);
  const lit = airMix('#c89870', depth, AIR);
  ctx.fillStyle = c;
  ctx.strokeStyle = c;
  ctx.lineWidth = Math.max(0.7, s * 0.16);
  // two horses, the near one a little lower
  for (const k of [0, 1]) {
    const hx = x + dir * s * (2.2 + k * 0.3);
    const hy = y - s * (1.5 - k * 0.15);
    ctx.beginPath();
    ctx.ellipse(hx, hy, s * 1.15, s * 0.5, 0, 0, P2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(hx + dir * s * 0.9, hy - s * 0.2);
    ctx.lineTo(hx + dir * s * 1.5, hy - s * 1.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(hx + dir * s * 1.6, hy - s * 1.15, s * 0.42, s * 0.2, dir * 0.5, 0, P2);
    ctx.fill();
    for (const lx of [-0.8, -0.5, 0.6, 0.9]) {
      ctx.beginPath();
      ctx.moveTo(hx + lx * s, hy + s * 0.3);
      ctx.lineTo(hx + lx * s + dir * s * 0.15, y);
      ctx.stroke();
    }
    ctx.fillStyle = rgba(lit, 0.6);
    ctx.fillRect(hx - s, hy - s * 0.45, s * 1.2, s * 0.2);
    ctx.fillStyle = c;
  }
  // the car, its wheel, the driver and the archer
  ctx.fillRect(x - s * 0.7, y - s * 2, s * 1.4, s * 1.1);
  ctx.beginPath();
  ctx.arc(x, y - s * 0.65, s * 0.65, 0, P2);
  ctx.stroke();
  for (const fx of [-0.25, 0.3]) {
    ctx.fillRect(x + fx * s - s * 0.22, y - s * 3.2, s * 0.44, s * 1.3);
    ctx.beginPath();
    ctx.arc(x + fx * s, y - s * 3.45, s * 0.26, 0, P2);
    ctx.fill();
  }
  ctx.fillStyle = rgba('#ffd8b0', 0.5 * (1 - depth));
  ctx.fillRect(x - s * 0.7, y - s * 2, s * 0.3, s * 1.1);
}

function elephant(ctx: Ctx, x: number, y: number, s: number, depth: number): void {
  const body = airMix('#7a7078', depth, AIR);
  const lit = airMix('#e0c4b4', depth, AIR);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(x, y - s * 2.2, s * 2.2, s * 1.4, 0, 0, P2);
  ctx.fill();
  for (const lx of [-1.5, -0.7, 0.8, 1.5]) ctx.fillRect(x + lx * s - s * 0.35, y - s * 1.4, s * 0.7, s * 1.4);
  ctx.beginPath();
  ctx.ellipse(x - s * 2.2, y - s * 2.6, s * 0.9, s * 0.95, 0, 0, P2);
  ctx.fill();
  ctx.lineWidth = s * 0.45;
  ctx.strokeStyle = body;
  ctx.beginPath();
  ctx.moveTo(x - s * 2.8, y - s * 2.4);
  ctx.quadraticCurveTo(x - s * 3.3, y - s * 1.2, x - s * 3, y - s * 0.4);
  ctx.stroke();
  ctx.fillStyle = rgba(lit, 0.45);
  ctx.beginPath();
  ctx.ellipse(x - s * 0.5, y - s * 3, s * 1.4, s * 0.4, 0, 0, P2);
  ctx.fill();
  // a driver on its neck, a cloth on its back
  ctx.fillStyle = airMix('#8a2e2a', depth, AIR);
  ctx.fillRect(x - s * 0.8, y - s * 3.5, s * 1.8, s * 0.9);
  ctx.fillStyle = airMix('#2a1e1a', depth, AIR);
  ctx.fillRect(x - s * 1.9, y - s * 4.2, s * 0.5, s * 0.9);
}

function host(ctx: Ctx, r: R): void {
  within(ctx, polyPath(PLAIN_PTS), () => {
    // the camp, far back: tents and pavilions in the haze
    for (let i = 0; i < 90; i++) {
      const y = HZ + 1 + r() * 9;
      const xl = shoreX(y) + 20;
      const xr = cliffX(y) - 12;
      const x = xl + r() * (xr - xl);
      const s = 2 + (y - HZ) * 0.35 + r() * 1.5;
      const depth = 0.9;
      const pav = r() < 0.25;
      ctx.fillStyle = airMix(pav ? ['#c84a3a', '#e8c070', '#5a6aa0'][i % 3] : '#e8dcc8', depth, AIR);
      ctx.beginPath();
      if (pav) {
        ctx.rect(x - s, y - s * 0.9, s * 2, s * 0.9);
        ctx.moveTo(x - s * 1.1, y - s * 0.9);
        ctx.lineTo(x, y - s * 1.7);
        ctx.lineTo(x + s * 1.1, y - s * 0.9);
      } else {
        ctx.moveTo(x - s, y);
        ctx.lineTo(x, y - s * 1.1);
        ctx.lineTo(x + s, y);
      }
      ctx.fill();
      ctx.fillStyle = rgba('#5a4a5a', 0.35);
      ctx.fillRect(x, y - s * 0.9, s, s * 0.9);
    }
    vfill(ctx, 590, HZ - 4, 680, 18, [[0, rgba('#e8c4b0', 0.2)], [1, rgba('#e8c4b0', 0.55)]]);
    // elephants at the back of the host
    elephant(ctx, 1000, 434, 2.2, 0.62);
    elephant(ctx, 1046, 436, 2, 0.64);
    // the host: rank on rank of men, regiments in their own colours, spears up, the front rank behind wicker shields
    const rows = [430, 436, 442, 449, 456, 463, 470, 477];
    for (const [ri, y0] of rows.entries()) {
      const s = 1.5 + (y0 - 428) * 0.115;
      const depth = hostDepth(y0);
      const xl = shoreX(y0) + 24 + r() * 20;
      const xr = cliffX(y0) - 18 - r() * 20;
      let x = xl;
      while (x < xr) {
        const bw = (60 + r() * 140) * (0.6 + s * 0.08);
        const tunic = TUNIC[Math.floor(r() * TUNIC.length)];
        const spears = r() < 0.75;
        const front = ri >= rows.length - 3;
        for (let fx = x; fx < Math.min(xr, x + bw); fx += s * (0.82 + r() * 0.2)) {
          figure(ctx, fx, y0 + (r() - 0.5) * s * 0.5, s, r() < 0.15 ? jitterHex(tunic, r) : tunic, depth, spears && r() < 0.7, front && r() < 0.8);
        }
        x += bw + (r() < 0.35 ? s * (3 + r() * 6) : s * 0.8);
      }
      // the dust kicked up round their feet
      vfill(ctx, 590, y0 - s * 1.2, 680, s * 1.6, [[0, rgba(DUST, 0)], [1, rgba(DUST, 0.32 * (1 - depth * 0.5))]]);
      // standards among them
      if (ri % 2 === 1) for (let k = 0; k < 3; k++) standard(ctx, xl + 40 + r() * (xr - xl - 80), y0, s * 1.1, depth);
    }
    // the poles and crossbars of the cloth banners (the cloths are painted, and move, on their own)
    for (const [x, y, , s] of BANNERS) {
      const depth = hostDepth(y);
      const { bw, top } = bannerDims(s);
      ctx.strokeStyle = airMix('#3a2618', depth, AIR);
      ctx.lineWidth = Math.max(0.8, s * 0.2);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - top - s * 0.9);
      ctx.moveTo(x - bw / 2 - s * 0.2, y - top);
      ctx.lineTo(x + bw / 2 + s * 0.2, y - top);
      ctx.stroke();
      ctx.fillStyle = airMix('#e8b850', depth, AIR);
      ctx.beginPath();
      ctx.arc(x, y - top - s * 1.05, s * 0.32, 0, P2);
      ctx.fill();
    }
    // chariots on the flanks
    chariot(ctx, 628, 482, 5, 1, 0.26);
    chariot(ctx, 690, 479, 4.6, 1, 0.3);
    chariot(ctx, 1200, 478, 4.8, -1, 0.3);
    // the dust they raise, hanging over the front
    softly(ctx, HOST_BOX, (c) => {
      for (let i = 0; i < 40; i++) {
        const x = 610 + r() * 640;
        const y = 440 + r() * 44;
        const rad = 20 + r() * 50;
        const g = c.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, rgba(DUST, 0.32));
        g.addColorStop(1, rgba(DUST, 0));
        c.fillStyle = g;
        c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
    }, 0.25);
  });
}
const jitterHex = (hex: string, r: R) => shade(hex, (r() - 0.5) * 0.3);

/** A cloth banner of the host (our own devices): 0 crimson with a gilt sun disc, 1 purple swallowtail with a gold
 * zigzag, 2 saffron with three blue bars. Painted flat, w×h. */
function bannerCloth(c: Ctx, w: number, h: number, kind: number): void {
  if (kind === 0) {
    c.fillStyle = '#9a2228';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#e8b84a';
    c.beginPath();
    c.arc(w / 2, h * 0.45, Math.min(w, h) * 0.24, 0, P2);
    c.fill();
    c.strokeStyle = '#e8b84a';
    c.lineWidth = Math.max(1, w * 0.04);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * P2;
      c.beginPath();
      c.moveTo(w / 2 + Math.cos(a) * w * 0.28, h * 0.45 + Math.sin(a) * w * 0.28);
      c.lineTo(w / 2 + Math.cos(a) * w * 0.38, h * 0.45 + Math.sin(a) * w * 0.38);
      c.stroke();
    }
  } else if (kind === 1) {
    c.fillStyle = '#4e2a62';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#e0b048';
    c.lineWidth = Math.max(1, h * 0.09);
    c.beginPath();
    for (let i = 0; i <= 6; i++) c.lineTo((i / 6) * w, h * (i % 2 ? 0.3 : 0.5));
    c.stroke();
  } else {
    c.fillStyle = '#d8962c';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#26406e';
    for (let i = 0; i < 3; i++) c.fillRect(0, h * (0.18 + i * 0.26), w, h * 0.12);
  }
  // fringe
  c.fillStyle = 'rgba(40,20,10,0.5)';
  c.fillRect(0, h - Math.max(1, h * 0.06), w, Math.max(1, h * 0.06));
}

/** The frame a banner's cloth is painted in (at k× its size): w, h, and where its hoist sits in it. */
const BANNER_K = 3;
const bannerFrame = (s: number, kk = BANNER_K) => {
  const { bw, bh } = bannerDims(s);
  const amp = bw * 0.1;
  return { fw: (bw + amp * 4) * kk, fh: (bh + 3) * kk, ox: amp * 2, bw, bh, amp };
};
/** One phase of a banner's cloth, painted into its frame at k× (c's origin the frame's top left). */
function bannerAt(c: Ctx, s: number, kind: number, ph: number, depth: number, kk = BANNER_K): void {
  const f = bannerFrame(s, kk);
  c.save();
  c.scale(kk, kk);
  clothFrame(c, f.ox, 0.5, f.bw, f.bh, ph, (cc, w, h) => bannerCloth(cc, w, h, kind), { amp: f.amp, waves: 1.3, tail: kind === 1 ? 'swallow' : 'flat', light: '#fff0d8', dark: '#1a0608' });
  // seen through the dust
  c.globalCompositeOperation = 'source-atop';
  c.fillStyle = rgba(AIR.color, 0.62 * depth ** 1.25);
  c.fillRect(0, 0, f.fw / kk, f.fh / kk);
  c.restore();
}
const BANNER_PH = 0.3;
function bannersStill(ctx: Ctx): void {
  for (const [x, y, kind, s] of BANNERS) {
    const f = bannerFrame(s);
    const { bw, top } = bannerDims(s);
    const [cv, g] = makeCanvas(f.fw, f.fh);
    bannerAt(g, s, kind, BANNER_PH, hostDepth(y));
    ctx.drawImage(cv, x - bw / 2 - f.ox, y - top, f.fw / BANNER_K, f.fh / BANNER_K);
  }
}

/** The camp's smoke in the still (live, painted frames rise there instead). */
const SMOKE_F = { w: 70, h: 220 };
const SMOKE_O = { lit: '#ffd8c0', body: '#9a8a8c', shade: '#4a4050', wind: 0.55, lobes: 15, a: 0.38, toLight: [-1, -0.4] as [number, number], seed: 4 };
function smokeStill(ctx: Ctx): void {
  for (const [i, [x, y]] of SMOKES.entries()) {
    ctx.save();
    ctx.translate(x - SMOKE_F.w * 0.5 * 0.85, y - (SMOKE_F.h - 10) * 0.85);
    ctx.scale(0.85, 0.85);
    smokeFrame(ctx, SMOKE_F.w, SMOKE_F.h, (i * 0.27) % 1, SMOKE_O);
    ctx.restore();
  }
}
export const SMOKE_STILL_BOX: Box = { x: 660, y: 220, w: 620, h: 210 };

// ——— the cliff ———

export const CLIFF_BOX: Box = { x: 1208, y: 0, w: 712, h: 720 };
const BUTTRESS: Pt[] = [[1796, -6], [1778, 70], [1790, 170], [1768, 290], [1778, 400], [1758, 520], [1774, 630], [1800, 712], [1930, 716], [1930, -6]];
/** How far (0 near … 1 far end) a point on the cliff's face is down the pass. */
const faceDepth = (x: number) => clamp01((1920 - x) / 700) ** 1.4 * 0.9;
/** The beds' vanishing point (a little above the pass's: they dip towards us). */
const BED_VP: Pt = [VPX, 372];

/** A clump of scrub clinging to a ledge: small leaf masses, dark below, lit on the upper left, its shadow on the rock. */
function scrub(ctx: Ctx, r: R, x: number, y: number, s: number, depth: number): void {
  ctx.fillStyle = rgba('#1e1a22', 0.3);
  ctx.beginPath();
  ctx.ellipse(x + s * 1.2, y + s * 0.6, s * 2, s * 0.8, 0.2, 0, P2);
  ctx.fill();
  for (let i = 0; i < 14; i++) {
    const u = i / 14;
    const lx = x + (r() - 0.5) * s * 2.8;
    const ly = y - u * s * 1.4 + (r() - 0.5) * s * 0.6;
    const litK = clamp01(u * 0.8 + (x - lx) / (s * 3));
    ctx.fillStyle = airMix(mixHex('#22301c', '#8a8a4a', litK), depth, AIR);
    ctx.beginPath();
    ctx.ellipse(lx, ly, s * (0.5 + r() * 0.35), s * (0.35 + r() * 0.25), r() * 3, 0, P2);
    ctx.fill();
  }
}

function cliff(ctx: Ctx, r: R): void {
  const path = polyPath(CLIFF);
  const bedAt = (yR: number, t: number): Pt => [1920 + (BED_VP[0] - 1920) * t * 0.8, yR + (BED_VP[1] - yR) * t * 0.8];
  within(ctx, path, () => {
    // the face, lit by the low sun along the pass, the far end lost in the haze
    const g = ctx.createLinearGradient(1210, 0, 1920, 0);
    g.addColorStop(0, airMix('#d8bc9c', 0.85, AIR));
    g.addColorStop(0.3, airMix('#d0b494', 0.45, AIR));
    g.addColorStop(0.7, '#a89280');
    g.addColorStop(1, '#76665e');
    ctx.fillStyle = g;
    ctx.fillRect(1208, 0, 712, 720);
    surface(ctx, r, CLIFF_BOX, '#a89280', { over: true, vary: 0.55, cells: 5, mottle: 0.5, strokes: 0.8, strokeAng: 1.45, strokeLen: 120, strokeW: 12, grain: 0.2, grainKind: 'speckle', seed: 61 });
    // its big planes: broad facets of the rock, each turned to the sun or away from it, painted soft
    softly(ctx, CLIFF_BOX, (c) => {
      for (let i = 0; i < 46; i++) {
        const t = r() ** 0.8 * 0.95;
        const near = 1 - t * 0.8;
        const [cx, cy] = bedAt(-200 + r() * 1000, t);
        const s = (50 + r() * 90) * near;
        const n = 5 + Math.floor(r() * 3);
        const pts: Pt[] = [];
        for (let k = 0; k < n; k++) {
          const a = (k / n) * P2 + r() * 0.5;
          pts.push([cx + Math.cos(a) * s * (0.6 + r() * 0.5) * 0.7, cy + Math.sin(a) * s * (0.6 + r() * 0.6)]);
        }
        const litF = r() < 0.5;
        c.fillStyle = litF ? rgba('#fff0d8', 0.18 + r() * 0.18) : rgba(r() < 0.6 ? '#3a3050' : '#5a4650', 0.2 + r() * 0.22);
        polyPath(pts)(c);
        c.fill();
      }
      // buttresses and bays: lit sunward edges, cool hollows
      let x = 1900;
      while (x > 1250) {
        const near = 1 - faceDepth(x);
        const w = (x - VPX) * (0.18 + r() * 0.18);
        const lg = c.createLinearGradient(x - w, 0, x, 0);
        lg.addColorStop(0, rgba('#fff0d4', 0));
        lg.addColorStop(0.3, rgba('#fff0d4', 0.16 * near + 0.04));
        lg.addColorStop(0.6, rgba('#fff0d4', 0));
        lg.addColorStop(0.8, rgba(LIME.cool, 0.24 * near + 0.06));
        lg.addColorStop(1, rgba(LIME.cool, 0.36 * near + 0.08));
        c.fillStyle = lg;
        c.fillRect(x - w, 0, w, 720);
        x -= w;
      }
    }, 0.25);
    // ledges: short runs of the bedding standing out, a lit top, a soft shadow under the overhang
    const ledges: Pt[][] = [];
    for (let i = 0; i < 18; i++) {
      const t0 = r() ** 0.9 * 0.9;
      const t1 = Math.min(1, t0 + 0.06 + r() * 0.2);
      const yR = -160 + r() * 900;
      const pts: Pt[] = [];
      for (let k = 0; k <= 10; k++) {
        const t = t0 + ((t1 - t0) * k) / 10;
        const [x, y] = bedAt(yR, t);
        pts.push([x, y + (r() - 0.5) * 4 * (1 - t * 0.8)]);
      }
      ledges.push(pts);
    }
    softly(ctx, CLIFF_BOX, (c) => {
      c.lineCap = 'round';
      for (const pts of ledges) {
        const near = 1 - faceDepth(pts[0][0]);
        c.strokeStyle = rgba('#241c30', 0.5);
        c.lineWidth = 6 + near * 16;
        c.beginPath();
        pts.forEach(([x, y], k) => (k ? c.lineTo(x, y + 4 + near * 8) : c.moveTo(x, y + 4 + near * 8)));
        c.stroke();
      }
    }, 0.33);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const pts of ledges) {
      const near = 1 - faceDepth(pts[0][0]);
      ctx.strokeStyle = rgba('#2a2230', 0.45);
      ctx.lineWidth = 1.2 + near * 1.6;
      ctx.beginPath();
      pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y + 1.5) : ctx.moveTo(x, y + 1.5)));
      ctx.stroke();
      ctx.strokeStyle = rgba('#fff0d4', 0.4);
      ctx.lineWidth = 1 + near * 1.4;
      ctx.beginPath();
      pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y - 1) : ctx.moveTo(x, y - 1)));
      ctx.stroke();
    }
    // fractures: jagged, mostly upright, wedging open; each a dark crack with a lit lip on its sunward side
    for (let i = 0; i < 20; i++) {
      const tt = r() ** 1.2 * 0.9;
      const near = 1 - tt * 0.8;
      let [x, y] = bedAt(760 - r() * 900, tt);
      const len = (60 + r() * 200) * near;
      const pts: Pt[] = [[x, y]];
      for (let s = 0; s < len; s += 10) {
        x += (r() - 0.5) * 8 * near;
        y -= 10;
        pts.push([x, y]);
      }
      const w = 1 + near * 3 * r();
      ctx.fillStyle = rgba('#1e1620', 0.55);
      ctx.beginPath();
      pts.forEach(([px, py], j) => {
        const ww = w * Math.sin((j / (pts.length - 1)) * Math.PI) + 0.6;
        if (j) ctx.lineTo(px + ww, py);
        else ctx.moveTo(px + ww, py);
      });
      for (let j = pts.length - 1; j >= 0; j--) {
        const ww = w * Math.sin((j / (pts.length - 1)) * Math.PI) + 0.6;
        ctx.lineTo(pts[j][0] - ww, pts[j][1]);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = rgba('#fff0d8', 0.25);
      ctx.lineWidth = 0.8 + near * 0.6;
      ctx.beginPath();
      pts.forEach(([px, py], j) => (j ? ctx.lineTo(px - w - 1.2, py) : ctx.moveTo(px - w - 1.2, py)));
      ctx.stroke();
    }
    // stains running down from the ledges: rust and grey
    for (const pts of ledges) {
      const near = 1 - faceDepth(pts[0][0]);
      const [sx, sy] = pts[Math.floor(r() * pts.length)];
      streaks(ctx, r, sx, sy + 2, 12 + near * 30, 50 + near * 180, r() < 0.5 ? '#9a5a34' : '#3e3a44', 0.14 + near * 0.12, 3);
    }
    // fresh scars where rock has fallen: pale, angular, a shaded underside
    for (let i = 0; i < 6; i++) {
      const sx = 1340 + r() * 400;
      const sy = 140 + r() * 380;
      const near = 1 - faceDepth(sx);
      const s = 10 + near * 24;
      ctx.fillStyle = rgba('#f4e2c8', 0.32);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + s * 0.9, sy + s * 0.1);
      ctx.lineTo(sx + s * 0.7, sy + s * 0.9);
      ctx.lineTo(sx + s * 0.1, sy + s * 1.2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba('#2a2230', 0.3);
      ctx.beginPath();
      ctx.moveTo(sx + s * 0.1, sy + s * 1.2);
      ctx.lineTo(sx + s * 0.7, sy + s * 0.9);
      ctx.lineTo(sx + s * 0.8, sy + s * 1.15);
      ctx.lineTo(sx + s * 0.2, sy + s * 1.4);
      ctx.closePath();
      ctx.fill();
    }
    // scrub on the ledges
    for (let i = 0; i < 26; i++) {
      const pts = ledges[Math.floor(r() * ledges.length)];
      const [sx, sy] = pts[Math.floor(r() * pts.length)];
      if (sy < 40 || sy > 690) continue;
      scrub(ctx, r, sx, sy - 1, 2 + (1 - faceDepth(sx)) * 8, faceDepth(sx));
    }
    // the near buttress: a spur of the mountain standing out of the face, its front turned to us in shade
    const bp = polyPath(BUTTRESS);
    castShadow(ctx, bp, 30, 30, 0.35, '#2a2238');
    within(ctx, bp, () => {
      vfill(ctx, 1750, 0, 180, 720, [[0, '#5a4c5c'], [0.5, '#746062'], [1, '#56484e']]);
      surface(ctx, r, { x: 1750, y: 0, w: 180, h: 720 }, '#6a5a60', { over: true, vary: 0.4, cells: 3, mottle: 0.5, strokes: 1, strokeAng: 1.5, strokeLen: 80, strokeW: 10, grain: 0.22, grainKind: 'speckle', seed: 67 });
      softly(ctx, { x: 1740, y: 0, w: 190, h: 720 }, (c) => {
        for (let i = 0; i < 16; i++) {
          const cx = 1760 + r() * 170;
          const cy = r() * 720;
          const s = 30 + r() * 50;
          c.fillStyle = r() < 0.5 ? rgba('#c8a898', 0.18) : rgba('#241c24', 0.22);
          c.beginPath();
          c.moveTo(cx - s * 0.5, cy - s * 0.3);
          c.lineTo(cx + s * 0.6, cy - s * 0.1);
          c.lineTo(cx + s * 0.4, cy + s * 0.6);
          c.lineTo(cx - s * 0.4, cy + s * 0.4);
          c.closePath();
          c.fill();
        }
      }, 0.33);
      let by = 10;
      while (by < 700) {
        const h = 40 + r() * 60;
        ctx.strokeStyle = rgba('#241c24', 0.4);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(1750, by + h);
        ctx.lineTo(1840, by + h + 8 + (r() - 0.5) * 8);
        ctx.lineTo(1930, by + h + 16 + (r() - 0.5) * 8);
        ctx.stroke();
        ctx.strokeStyle = rgba('#d8b8a0', 0.25);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(1750, by + h - 2);
        ctx.lineTo(1930, by + h + 14);
        ctx.stroke();
        by += h;
      }
      for (let i = 0; i < 8; i++) scrub(ctx, r, 1790 + r() * 120, 80 + r() * 560, 7 + r() * 4, 0.05);
      // its sunward edge catches the dawn
      ctx.strokeStyle = rgba('#ffc896', 0.45);
      ctx.lineWidth = 6;
      ctx.beginPath();
      BUTTRESS.slice(0, 8).forEach(([px, py], i) => (i ? ctx.lineTo(px + 3, py) : ctx.moveTo(px + 3, py)));
      ctx.stroke();
    });
    // shade high up (the HUD's corner) and the cool of the shadowed foot
    vfill(ctx, 1208, 0, 712, 260, [[0, rgba('#2a2238', 0.5)], [1, rgba('#2a2238', 0)]]);
    vfill(ctx, 1208, 540, 712, 180, [[0, rgba('#3a3050', 0)], [1, rgba('#3a3050', 0.38)]]);
  });
  // the silhouette's lit edge against the sky
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba('#ffd8b0', 0.5);
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  CLIFF_SKY.forEach(([x, y], i) => (i ? ctx.lineTo(x + 1.5, y) : ctx.moveTo(x + 1.5, y)));
  ctx.stroke();
  ctx.strokeStyle = airMix('#3a2a2e', 0.4, AIR);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  CLIFF_SKY.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.restore();
}

// ——— the hot springs at the cliff's foot ———

export const SPRINGS_BOX: Box = { x: 1600, y: 590, w: 320, h: 176 };
const APRON: Pt[] = [[1640, 768], [1652, 736], [1682, 702], [1712, 668], [1744, 638], [1774, 614], [1822, 604], [1880, 610], [1930, 620], [1930, 768]];

/** The rimstone terraces, back to front: each a shallow pool held behind a curved dam (its middle x, the y of its
 * lip's middle, its width). */
const TERRACES: [number, number, number][] = [[1830, 632, 116], [1778, 654, 150], [1872, 666, 120], [1748, 682, 170], [1868, 700, 140], [1724, 716, 190], [1850, 734, 190]];
/** The vents the steam rises from. */
export const VENTS: Pt[] = [[1812, 612], [1750, 660], [1890, 634]];

function springs(ctx: Ctx, r: R): void {
  const ap = polyPath(APRON);
  castShadow(ctx, ap, 6, 10, 0.3, '#2a2030');
  within(ctx, ap, () => {
    // flowstone: cream mineral laid down over the rock in rounded bulges, stained orange where the water runs
    vfill(ctx, 1600, 600, 320, 168, [[0, '#d4c2a4'], [0.5, '#bca482'], [1, '#9a8064']]);
    surface(ctx, r, SPRINGS_BOX, '#c0a888', { over: true, vary: 0.45, cells: 3, mottle: 0.5, strokes: 1.2, strokeAng: 1.5, strokeLen: 30, strokeW: 4, grain: 0.18, grainKind: 'speckle', seed: 71 });
    ctx.lineCap = 'round';
    for (let i = 0; i < 80; i++) {
      const x = 1650 + r() * 280;
      const y = 610 + r() * 130;
      ctx.strokeStyle = rgba(r() < 0.6 ? '#b8682e' : '#6a4430', 0.18 + r() * 0.25);
      ctx.lineWidth = 1.5 + r() * 4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (r() - 0.5) * 6, y + 10 + r() * 30);
      ctx.stroke();
    }
    crevice(ctx, 1600, 1930, 604, 16, 0.4, '#2a2030');
    for (const [cx, ly, w] of TERRACES) {
      const hw = w / 2;
      const lip = (x: number) => ly - ((x - cx) / hw) ** 2 * 8;
      const x0 = cx - hw;
      const x1 = cx + hw;
      const dam = (x: number) => 15 + (1 - ((x - cx) / hw) ** 2) * 7 + Math.sin(x * 0.31) * 2.5;
      // the dam's face below the lip: travertine bulging in rounded lobes, cream at the lip, stained orange and rust
      // below, wet where the water slips over it
      const face = (c: Ctx) => {
        c.beginPath();
        c.moveTo(x0, lip(x0));
        for (let x = x0; x <= x1; x += 5) c.lineTo(x, lip(x));
        for (let x = x1; x >= x0; x -= 5) c.lineTo(x, lip(x) + dam(x));
        c.closePath();
      };
      castShadow(ctx, face, 5, 6, 0.35, '#2a1a18');
      const lg = ctx.createLinearGradient(0, ly - 6, 0, ly + 22);
      lg.addColorStop(0, '#e6d8bc');
      lg.addColorStop(0.35, '#c8a87a');
      lg.addColorStop(0.75, '#9a6a46');
      lg.addColorStop(1, '#5e4232');
      face(ctx);
      ctx.fillStyle = lg;
      ctx.fill();
      within(ctx, face, () => {
        // the lobes: rounded bulges, each lit on its left, shaded on its right
        for (let x = x0 + 4; x < x1; x += 9 + r() * 6) {
          const g = ctx.createLinearGradient(x - 5, 0, x + 5, 0);
          g.addColorStop(0, rgba('#fff0d8', 0.3));
          g.addColorStop(0.5, rgba('#fff0d8', 0));
          g.addColorStop(1, rgba('#3a2018', 0.3));
          ctx.fillStyle = g;
          ctx.fillRect(x - 5, lip(x), 10, dam(x) + 2);
        }
        ctx.strokeStyle = rgba('#e8fff8', 0.4);
        ctx.lineWidth = 1;
        for (let x = x0 + 6; x < x1; x += 7 + r() * 12) {
          ctx.beginPath();
          ctx.moveTo(x, lip(x));
          ctx.lineTo(x + (r() - 0.5) * 2, lip(x) + 6 + r() * 12);
          ctx.stroke();
        }
      });
      // the pool on top: a thin sheet of milky water seen at a low angle, the dawn in it
      const pool = (c: Ctx) => {
        c.beginPath();
        c.moveTo(x0 + 4, lip(x0 + 4) - 1);
        for (let x = x0 + 4; x <= x1 - 4; x += 5) c.lineTo(x, lip(x) - 1.5);
        for (let x = x1 - 4; x >= x0 + 4; x -= 5) c.lineTo(x, lip(x) - 1.5 - (1 - ((x - cx) / hw) ** 2) * 7);
        c.closePath();
      };
      const pg = ctx.createLinearGradient(0, ly - 10, 0, ly);
      pg.addColorStop(0, '#d8d8cc');
      pg.addColorStop(0.5, '#8ec4bc');
      pg.addColorStop(1, '#5a9a9c');
      pool(ctx);
      ctx.fillStyle = pg;
      ctx.fill();
      ctx.strokeStyle = rgba('#fffaf0', 0.6);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      for (let x = x0; x <= x1; x += 5) (x === x0 ? ctx.moveTo(x, lip(x) - 0.5) : ctx.lineTo(x, lip(x) - 0.5));
      ctx.stroke();
    }
    // the vents: dark mouths in the cliff's foot, the mineral bright round them
    for (const [vx, vy] of VENTS) {
      lightPool(ctx, vx, vy + 2, 26, 8, '#fff8e8', 0.3, 'source-over');
      ctx.fillStyle = '#24323a';
      ctx.beginPath();
      ctx.ellipse(vx, vy, 8, 3, 0, 0, P2);
      ctx.fill();
    }
    vfill(ctx, 1600, 700, 320, 68, [[0, rgba('#1e1828', 0)], [1, rgba('#1e1828', 0.3)]]);
  });
}

/** Steam (phase ph loops) in a w×h frame, rising from its foot's middle: soft swelling lobes drifting with the wind,
 * thinning as they climb, warm on their tops, cool beneath. */
function steamPuffs(c: Ctx, w: number, h: number, ph: number, seed: number): void {
  const n = 18;
  for (let j = 0; j < n; j++) {
    const u = (ph + j / n) % 1;
    const rr = rng(hashStr('hg:stm' + seed + ':' + j));
    const y = h - 10 - u * (h - 60);
    const x = w * 0.5 + u * u * w * 0.22 + Math.sin(u * 5 + j * 1.3 + seed) * w * 0.07 * (0.3 + u);
    const rad = w * (0.1 + u * 0.32) * (0.8 + rr() * 0.4);
    const a = 0.42 * Math.sin(Math.PI * u) ** 0.7 * (1 - u * 0.4);
    const g = c.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, rgba('#f4f0f0', a));
    g.addColorStop(0.35, rgba('#eee8ea', a * 0.72));
    g.addColorStop(0.7, rgba('#e0d8e0', a * 0.26));
    g.addColorStop(1, rgba('#d8d0dc', 0));
    c.fillStyle = g;
    c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    const lg = c.createRadialGradient(x - rad * 0.3, y - rad * 0.35, 0, x - rad * 0.3, y - rad * 0.35, rad * 0.6);
    lg.addColorStop(0, rgba('#fff2e4', a * 0.6));
    lg.addColorStop(1, rgba('#fff2e4', 0));
    c.fillStyle = lg;
    c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    const sg = c.createRadialGradient(x + rad * 0.35, y + rad * 0.4, 0, x + rad * 0.35, y + rad * 0.4, rad * 0.6);
    sg.addColorStop(0, rgba('#7a7494', a * 0.55));
    sg.addColorStop(1, rgba('#8a84a0', 0));
    c.fillStyle = sg;
    c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
}

const STEAM_F = { w: 150, h: 340 };
export const STEAM_STILL_BOX: Box = { x: 1660, y: 260, w: 260, h: 420 };
function steamStill(ctx: Ctx): void {
  for (const [i, [x, y]] of VENTS.entries()) {
    ctx.save();
    ctx.translate(x - STEAM_F.w / 2, y - STEAM_F.h + 6);
    steamPuffs(ctx, STEAM_F.w, STEAM_F.h, (i * 0.37 + 0.2) % 1, i);
    ctx.restore();
  }
}

// ——— the wall ———

export const WALL_BOX: Box = { x: 320, y: 526, w: 1226, h: 172 };
const CAP = 10;

const wallPath = polyPath([...WALL_TOP.map(([x, y]) => [x, y - CAP * capK(x)] as Pt), [WL.x1 + 4, WL.base + 4], [WL.x0 - 4, WL.base + 4]]);

/** One rough drystone block: an irregular polygon with straight, broken edges, lit on its top left, its own shadow
 * along its lower right. */
function stone(ctx: Ctx, r: R, pts0: Pt[], base: string, depth = 0.3): void {
  // break its long edges
  const pts: Pt[] = [];
  for (let i = 0; i < pts0.length; i++) {
    const a = pts0[i];
    const b = pts0[(i + 1) % pts0.length];
    pts.push(a);
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (l > 18) {
      const t = 0.3 + r() * 0.4;
      const nx = -(b[1] - a[1]) / l;
      const ny = (b[0] - a[0]) / l;
      const d = (r() - 0.5) * Math.min(6, l * 0.12);
      pts.push([a[0] + (b[0] - a[0]) * t + nx * d, a[1] + (b[1] - a[1]) * t + ny * d]);
    }
  }
  const bb = boxOfPts(pts, 0);
  const path = polyPath(pts);
  const col = airMix(base, depth, AIR);
  const g = ctx.createLinearGradient(bb.x, bb.y, bb.x + bb.w * 0.6, bb.y + bb.h * 1.1);
  g.addColorStop(0, shade(col, 0.2));
  g.addColorStop(0.45, col);
  g.addColorStop(1, shade(col, -0.3));
  path(ctx);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  path(ctx);
  ctx.clip();
  // a face or two where it was split: a plane catching the light, or turned away from it
  if (bb.w > 20 && r() < 0.6) {
    const fx = bb.x + r() * bb.w * 0.6;
    ctx.fillStyle = rgba(r() < 0.5 ? '#fff0d8' : '#2a1c14', 0.14);
    ctx.beginPath();
    ctx.moveTo(fx, bb.y - 2);
    ctx.lineTo(fx + bb.w * 0.4, bb.y - 2);
    ctx.lineTo(fx + bb.w * (0.25 + r() * 0.3), bb.y + bb.h + 2);
    ctx.lineTo(fx - bb.w * 0.1, bb.y + bb.h + 2);
    ctx.closePath();
    ctx.fill();
  }
  // its own shadow along the lower right, its lit arris along the top left
  const sw = Math.max(2, Math.min(bb.w, bb.h) * 0.18);
  ctx.lineWidth = sw;
  ctx.strokeStyle = rgba('#20140c', 0.34);
  ctx.translate(-sw * 0.5, -sw * 0.5);
  path(ctx);
  ctx.stroke();
  ctx.translate(sw, sw);
  ctx.lineWidth = Math.max(1.2, sw * 0.45);
  ctx.strokeStyle = rgba('#fff0d4', 0.42);
  path(ctx);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = rgba('#3a2a20', 0.3);
  for (let i = 0; i < (bb.w * bb.h) / 240; i++) ctx.fillRect(bb.x + r() * bb.w, bb.y + r() * bb.h, 1.4, 1.2);
}

/** A rubble stone in a course: its own height in the course, its corners knocked off, set a little high or low. */
function rubbleStone(r: R, x: number, w: number, top: number, hgt: number): Pt[] {
  const hs = hgt * (0.62 + r() * 0.38);
  const y0 = top + (hgt - hs) * r();
  const y1 = y0 + hs;
  const c = () => 0.06 + r() * 0.28;
  const [a, b, d, e] = [c(), c(), c(), c()];
  const G = 1.8;
  const x0 = x + G;
  const x1 = x + w - G;
  return [[x0 + w * a, y0 + G], [x1 - w * b, y0 + G + (r() - 0.5) * 3], [x1, y0 + hs * b], [x1 + (r() - 0.5) * 3, y1 - hs * d], [x1 - w * d, y1 - G], [x0 + w * e, y1 - G + (r() - 0.5) * 3], [x0, y1 - hs * e], [x0 + (r() - 0.5) * 3, y0 + hs * a]];
}

function wall(ctx: Ctx, r: R): void {
  within(ctx, wallPath, () => {
    // the joints: no mortar, just the dark between the stones
    vfill(ctx, 360, 526, 1186, 172, [[0, '#4e3e32'], [1, '#2a1e16']]);
    const PAL = ['#a48e74', '#968068', '#ae9a80', '#8c7864', '#a08a76', '#9a846c', '#8a7a6a'];
    const NEW = ['#bca88c', '#b4a084', '#c2ae90'];
    // rough courses: each stone its own height and shape, set a little high or low in its course; big footing
    // stones at the bottom, smaller rebuilt work above
    let y = WL.base + 6;
    let k = 0;
    while (y > WL.top - 36) {
      const hgt = (k === 0 ? 34 : y > 640 ? 26 : 20) + r() * 10;
      const top = y - hgt;
      let x = WL.x0 - 10 - r() * 40;
      while (x < WL.x1 + 10) {
        const w = hgt * (k === 0 ? 1.4 + r() * 1.8 : 0.8 + r() * 1.8);
        const topHere = Math.min(wallTop(Math.max(WL.x0, Math.min(WL.x1, x))), wallTop(Math.max(WL.x0, Math.min(WL.x1, x + w))));
        if (top + hgt * 0.5 > topHere - 14) {
          const upper = top < 612;
          const pal = upper && r() < 0.5 ? NEW : PAL;
          stone(ctx, r, rubbleStone(r, x, w, top + (r() - 0.5) * 4, hgt), pal[Math.floor(r() * pal.length)], 0.28);
        }
        x += w + (r() < 0.18 ? hgt * 0.2 : 0);
      }
      y = top;
      k++;
    }
    // chinking: small stones driven into the gaps
    for (let i = 0; i < 170; i++) {
      const cx = WL.x0 + r() * (WL.x1 - WL.x0);
      const cy = wallTop(cx) + 10 + r() * (WL.base - wallTop(cx) - 10);
      const s = 3 + r() * 4;
      stone(ctx, r, [[cx, cy], [cx + s * 1.4, cy - s * 0.2], [cx + s * 1.2, cy + s * 0.8], [cx - s * 0.1, cy + s]], PAL[Math.floor(r() * PAL.length)], 0.3);
    }
    surface(ctx, r, WALL_BOX, '#a08a70', { over: true, vary: 0.45, cells: 6, mottle: 0.3, strokes: 0, grain: 0.16, grainKind: 'speckle', seed: 81 });
    // lichen on the old courses (grey-green and orange), rain streaks down from the top
    lay(ctx, noiseMask(18, 83, { cover: 0.18, soft: 0.08, col: '#8a9a6a', w: 320, h: 40 }), { x: 360, y: 610, w: 1186, h: 86 }, 0.35);
    lay(ctx, noiseMask(26, 85, { cover: 0.08, soft: 0.04, col: '#d88a3a', w: 320, h: 40 }), { x: 360, y: 600, w: 1186, h: 96 }, 0.4);
    for (let i = 0; i < 18; i++) {
      const sx = WL.x0 + 30 + r() * (WL.x1 - WL.x0 - 60);
      streaks(ctx, r, sx, wallTop(sx) + 6, 18, 60 + r() * 50, '#3e342e', 0.14, 3);
    }
    // the dawn from the left: raking warm across it, the right end and the foot falling into shade
    const lg = ctx.createLinearGradient(WL.x0, 0, WL.x1, 0);
    lg.addColorStop(0, rgba('#ffc890', 0.16));
    lg.addColorStop(0.5, rgba('#ffc890', 0.03));
    lg.addColorStop(1, rgba('#2a2240', 0.28));
    ctx.fillStyle = lg;
    ctx.fillRect(360, 526, 1186, 172);
    vfill(ctx, 360, 596, 1186, 102, [[0, rgba('#1e1620', 0)], [1, rgba('#1e1620', 0.45)]]);
    // the top of the wall, seen from above: flat capstones, lit by the sky and the low sun
    const capTop = (c: Ctx) => {
      c.beginPath();
      WALL_TOP.forEach(([x, yy], i) => (i ? c.lineTo(x, yy - CAP * capK(x)) : c.moveTo(x, yy - CAP * capK(x))));
      for (let i = WALL_TOP.length - 1; i >= 0; i--) c.lineTo(WALL_TOP[i][0], WALL_TOP[i][1] + 0.5);
      c.closePath();
    };
    within(ctx, capTop, () => {
      vfill(ctx, 360, 526, 1186, 60, [[0, '#d0bc9e'], [1, '#b8a286']]);
      let cx = WL.x0;
      while (cx < WL.x1) {
        const w = 30 + r() * 50;
        const yy = wallTop(cx);
        ctx.fillStyle = rgba(r() < 0.5 ? '#fff0d8' : '#5a4838', 0.08 + r() * 0.14);
        ctx.fillRect(cx, yy - CAP - 2, w, CAP + 3);
        ctx.strokeStyle = rgba('#2a1c14', 0.55);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(cx, yy + 0.5);
        ctx.lineTo(VPX + (cx - VPX) * 0.985, yy - CAP * capK(cx) - 1);
        ctx.stroke();
        cx += w;
      }
      ctx.fillStyle = rgba('#3a2c24', 0.25);
      for (let i = 0; i < 160; i++) {
        const px = WL.x0 + r() * (WL.x1 - WL.x0);
        ctx.fillRect(px, wallTop(px) - r() * CAP, 1.5, 1);
      }
    });
  });
  // the capstones' lit front arris and dark back edge
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba('#ffe8c4', 0.5);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  WALL_TOP.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + 0.8) : ctx.moveTo(x, y + 0.8)));
  ctx.stroke();
  ctx.strokeStyle = rgba('#2a1c14', 0.6);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  WALL_TOP.forEach(([x, y], i) => (i ? ctx.lineTo(x, y - CAP * capK(x)) : ctx.moveTo(x, y - CAP * capK(x))));
  ctx.stroke();
  ctx.restore();
  // the rubble of the breach, spilling forward from the gap
  const RUB = ['#b4a088', '#a08a70', '#c8b294', '#8e7a64'];
  for (let i = 0; i < 30; i++) {
    const t = r();
    const x = GAP.x0 - 24 + t * (GAP.x1 - GAP.x0 + 48);
    const yy = 662 + r() * 30 + Math.abs(t - 0.5) * 8;
    const s = 7 + r() * 13;
    const a = r() * 0.8;
    stone(ctx, r, [[x, yy], [x + s * Math.cos(a) * 1.4, yy - s * 0.3], [x + s * 1.2, yy + s * 0.6], [x + s * 0.1, yy + s * 0.75]], RUB[Math.floor(r() * RUB.length)], 0.2);
  }
  for (let i = 0; i < 22; i++) {
    const t = r();
    const x = WL.x0 - 34 + t * 70 + (r() - 0.5) * 10;
    const yy = 606 + (1 - t) * 40 + r() * 70;
    const s = 8 + r() * 12;
    stone(ctx, r, [[x, yy], [x + s * 1.3, yy - s * 0.25], [x + s * 1.2, yy + s * 0.6], [x + s * 0.1, yy + s * 0.75]], RUB[Math.floor(r() * RUB.length)], 0.15);
  }
  stakes(ctx, r);
}

// The stakes in the breach: sharpened trunks driven into the rubble, leaning out at the enemy, lashed together.
const STAKES: [number, number, number, number][] = [[1188, 668, -0.32, 96], [1207, 660, -0.16, 112], [1229, 656, 0.02, 124], [1250, 658, 0.14, 110], [1270, 666, 0.3, 96]];
const stakeTip = (i: number, f = 1): Pt => {
  const [x, y, a, l] = STAKES[i];
  return [x + Math.sin(a) * l * f, y - Math.cos(a) * l * 0.92 * f];
};
/** Where the cloak is snagged (on the middle stake). */
export const SNAG: Pt = (() => stakeTip(2, 0.62))();

function stakes(ctx: Ctx, r: R): void {
  for (const [i, [x, y, a]] of STAKES.entries()) {
    const [tx, ty] = stakeTip(i);
    const [px, py] = stakeTip(i, 0.84);
    const nx = Math.cos(a);
    const ny = Math.sin(a);
    const w0 = 5.2;
    const w1 = 4;
    const path = polyPath([[x - nx * w0, y - ny * w0], [px - nx * w1, py - ny * w1], [tx, ty], [px + nx * w1, py + ny * w1], [x + nx * w0, y + ny * w0]]);
    castShadow(ctx, path, 8, 5, 0.35, '#1a1210');
    const g = ctx.createLinearGradient(x - nx * w0, y - ny * w0, x + nx * w0, y + ny * w0);
    g.addColorStop(0, '#b48c5c');
    g.addColorStop(0.4, '#6a4a30');
    g.addColorStop(1, '#2e2018');
    ctx.fillStyle = g;
    path(ctx);
    ctx.fill();
    // the bark, and the pale cut wood of the sharpened point
    within(ctx, path, () => {
      ctx.strokeStyle = rgba('#2a1a10', 0.4);
      ctx.lineWidth = 0.8;
      for (let k = 0; k < 7; k++) {
        const f = r() * 0.8;
        const [bx, by] = stakeTip(i, f);
        ctx.beginPath();
        ctx.moveTo(bx - nx * 4, by - ny * 4);
        ctx.lineTo(bx + nx * 4, by + ny * 4 + 1);
        ctx.stroke();
      }
      ctx.fillStyle = '#e2c290';
      ctx.beginPath();
      ctx.moveTo(px - nx * w1, py - ny * w1);
      ctx.lineTo(tx, ty);
      ctx.lineTo(px + nx * w1, py + ny * w1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba('#5a3a20', 0.45);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(tx, ty);
      ctx.lineTo(px + nx * w1, py + ny * w1);
      ctx.closePath();
      ctx.fill();
    });
    ctx.strokeStyle = '#24160e';
    ctx.lineWidth = 1.4;
    path(ctx);
    ctx.stroke();
  }
  // the lashing: a rope run along them, wound round each
  ctx.strokeStyle = '#7a6040';
  ctx.lineWidth = 2;
  ctx.beginPath();
  STAKES.forEach((_, i) => {
    const [x, y] = stakeTip(i, 0.3);
    if (i) ctx.quadraticCurveTo(x - 10, y + 5, x, y);
    else ctx.moveTo(x, y);
  });
  ctx.stroke();
  ctx.strokeStyle = rgba('#e8d0a0', 0.6);
  ctx.lineWidth = 0.8;
  for (let i = 0; i < STAKES.length; i++) {
    const [x, y] = stakeTip(i, 0.3);
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath();
      ctx.moveTo(x - 5, y + k * 2.2 - 1);
      ctx.lineTo(x + 5, y + k * 2.2 + 1);
      ctx.stroke();
    }
  }
}

// ——— the cloak snagged on a stake ———

export const CLOAK_BOX: Box = { x: SNAG[0] - 32, y: SNAG[1] - 8, w: 96, h: 104 };
function cloak(ctx: Ctx, r: R): void {
  const [sx, sy] = SNAG;
  // a long red wool cloak caught by a corner on the stake: it hangs in a twisted fold, its lower end lying out over
  // the rubble, its hem ragged and dusty
  const outline: Pt[] = [[sx - 4, sy - 3], [sx + 5, sy - 2], [sx + 12, sy + 16], [sx + 22, sy + 40], [sx + 34, sy + 62], [sx + 52, sy + 74], [sx + 56, sy + 82], [sx + 42, sy + 84], [sx + 30, sy + 80], [sx + 18, sy + 88], [sx + 6, sy + 82], [sx - 6, sy + 90], [sx - 16, sy + 84], [sx - 22, sy + 86], [sx - 18, sy + 58], [sx - 10, sy + 26]];
  const path = polyPath(outline);
  castShadow(ctx, path, 9, 7, 0.42, '#1a0c0c');
  ctx.fillStyle = CLOAK.body;
  path(ctx);
  ctx.fill();
  within(ctx, path, () => {
    // the folds: running down from the snag and fanning out, each lit on its left, shaded on its right
    for (let k = 0; k < 8; k++) {
      const u = k / 7;
      const ex = sx - 20 + u * 72;
      const ey = sy + 88 - u * 10;
      const mx = sx - 8 + u * 30;
      const lg = ctx.createLinearGradient(mx - 6, sy + 40, mx + 6, sy + 40);
      lg.addColorStop(0, rgba(CLOAK.lit, 0.6));
      lg.addColorStop(0.45, rgba(CLOAK.body, 0));
      lg.addColorStop(1, rgba(CLOAK.dark, 0.75));
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.moveTo(sx - 1, sy);
      ctx.quadraticCurveTo(mx - 3, sy + 40, ex - 4, ey);
      ctx.lineTo(ex + 5, ey);
      ctx.quadraticCurveTo(mx + 4, sy + 40, sx + 2, sy);
      ctx.closePath();
      ctx.fill();
    }
    surface(ctx, r, CLOAK_BOX, CLOAK.body, { over: true, vary: 0.2, cells: 2, mottle: 0.3, strokes: 0, grain: 0.3, grainKind: 'canvas', seed: 91 });
    // the twist under the snag, dust caked on the hem
    vfill(ctx, CLOAK_BOX.x, sy - 4, CLOAK_BOX.w, 24, [[0, rgba('#2a0a0a', 0.55)], [1, rgba('#2a0a0a', 0)]]);
    vfill(ctx, CLOAK_BOX.x, sy + 62, CLOAK_BOX.w, 32, [[0, rgba('#a88a6a', 0)], [1, rgba('#a88a6a', 0.55)]]);
  });
  ctx.strokeStyle = '#2a0a0c';
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  path(ctx);
  ctx.stroke();
  // the stake's tip through the cloth's corner
  ctx.fillStyle = '#e2c290';
  ctx.beginPath();
  ctx.ellipse(sx, sy - 1, 2.6, 2, 0, 0, P2);
  ctx.fill();
}

// ——— our side of the wall: the ground ———

export const GROUND_BOX: Box = { x: 300, y: 682, w: 1620, h: 84 };
const GROUND_PTS: Pt[] = [[398, 692], [WL.x1, 690], [1562, 700], [1640, 707], [1760, 711], [1930, 715], [1930, 768], [366, 768], [392, 730]];
function ground(ctx: Ctx, r: R): void {
  within(ctx, polyPath(GROUND_PTS), () => {
    vfill(ctx, 300, 682, 1620, 86, [[0, '#7e644e'], [1, '#6a5242']]);
    surface(ctx, r, GROUND_BOX, '#76604c', { over: true, vary: 0.35, cells: 6, mottle: 0.4, strokes: 2, strokeAng: 0, strokeLen: 70, strokeW: 3, grain: 0.3, grainKind: 'speckle', seed: 101 });
    // the worn path from the breach to the platform
    const gx = (GAP.x0 + GAP.x1) / 2;
    softly(ctx, GROUND_BOX, (c) => {
      c.fillStyle = rgba('#b8987a', 0.22);
      c.beginPath();
      c.moveTo(gx - 50, 694);
      c.lineTo(gx + 50, 694);
      c.lineTo(gx + 120, 768);
      c.lineTo(gx - 120, 768);
      c.closePath();
      c.fill();
    }, 0.25);
    // pebbles, each lit with its shadow; footprints and scuffs; tufts of dry grass
    for (let i = 0; i < 260; i++) {
      const x = 380 + r() * 1540;
      const y = 696 + r() * 66;
      const s = 1 + r() * 2.6 * ((y - 680) / 80 + 0.5);
      if (r() < 0.75) {
        ctx.fillStyle = rgba('#24180f', 0.35);
        ctx.fillRect(x + s * 0.4, y + s * 0.3, s * 1.8, s * 0.6);
        ctx.fillStyle = r() < 0.5 ? '#c8b094' : '#9a8470';
        ctx.fillRect(x, y - s * 0.4, s * 1.6, s * 0.8);
        ctx.fillStyle = rgba('#fff0d8', 0.4);
        ctx.fillRect(x, y - s * 0.4, s * 0.6, s * 0.3);
      } else {
        ctx.fillStyle = rgba('#3a2a1e', 0.18);
        ctx.beginPath();
        ctx.ellipse(x, y, 5 + s, 1.6 + s * 0.4, 0.1, 0, P2);
        ctx.fill();
      }
    }
    ctx.lineCap = 'round';
    for (let i = 0; i < 40; i++) {
      const x = 400 + r() * 1500;
      const y = 696 + r() * 14;
      for (let k = 0; k < 5; k++) {
        ctx.strokeStyle = rgba(k % 2 ? '#c8a868' : '#8a7448', 0.7);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + k * 1.5, y);
        ctx.lineTo(x + k * 1.5 + (k - 2) * 2.5, y - 6 - r() * 6);
        ctx.stroke();
      }
    }
    // the wall's foot: occlusion where it meets the ground, its shadow reaching a little forward
    crevice(ctx, 380, WL.x1, 692, 16, 0.55, '#1a1008');
    // the dawn raking in from the left, dying away to the right
    const lg = ctx.createLinearGradient(380, 0, 1920, 0);
    lg.addColorStop(0, rgba('#ffc890', 0.14));
    lg.addColorStop(0.6, rgba('#ffc890', 0));
    lg.addColorStop(1, rgba('#1e1830', 0.18));
    ctx.fillStyle = lg;
    ctx.fillRect(300, 682, 1620, 86);
  });
  helmet(ctx, r);
}

/** A bronze helmet (Corinthian, its cheek-pieces long, its eye-holes dark) set down on a stone. */
export const HELMET: Pt = [656, 748];
function helmet(ctx: Ctx, r: R): void {
  ctx.save();
  ctx.translate(HELMET[0], HELMET[1]);
  ctx.scale(1.45, 1.45);
  ctx.translate(-HELMET[0], -HELMET[1]);
  helmetAt(ctx, r);
  ctx.restore();
}
function helmetAt(ctx: Ctx, r: R): void {
  const [x, y] = HELMET;
  groundShadow(ctx, x + 8, y + 1, 26, 4, 0.5, '#140c08');
  // the stone
  const st = polyPath([[x - 24, y + 2], [x - 20, y - 12], [x - 4, y - 18], [x + 16, y - 15], [x + 24, y - 4], [x + 22, y + 3]]);
  st(ctx);
  const sg = ctx.createLinearGradient(x - 20, y - 18, x + 20, y + 4);
  sg.addColorStop(0, '#b8a28a');
  sg.addColorStop(1, '#5a4a3e');
  ctx.fillStyle = sg;
  ctx.fill();
  ctx.strokeStyle = '#2a1c14';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // the helmet: dome, cheek-pieces, nose-guard, the eye openings in shadow, a horsehair crest on top
  const hy = y - 16;
  ctx.fillStyle = '#5a1a14';
  ctx.beginPath();
  ctx.moveTo(x - 16, hy - 16);
  ctx.quadraticCurveTo(x - 6, hy - 34, x + 14, hy - 26);
  ctx.quadraticCurveTo(x + 22, hy - 18, x + 18, hy - 8);
  ctx.quadraticCurveTo(x + 4, hy - 24, x - 16, hy - 16);
  ctx.fill();
  ctx.strokeStyle = rgba('#c8584a', 0.6);
  ctx.lineWidth = 1;
  for (let k = 0; k < 6; k++) {
    ctx.beginPath();
    ctx.moveTo(x - 12 + k * 4, hy - 20 - Math.sin(k * 0.6) * 6);
    ctx.lineTo(x - 8 + k * 4.4, hy - 26 - Math.sin(k * 0.5) * 4);
    ctx.stroke();
  }
  const helm = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x - 15, hy);
    c.bezierCurveTo(x - 17, hy - 22, x + 15, hy - 26, x + 15, hy - 4);
    c.lineTo(x + 13, hy + 6);
    c.lineTo(x + 5, hy + 4);
    c.lineTo(x + 3, hy - 4);
    c.lineTo(x - 1, hy + 2);
    c.lineTo(x - 5, hy - 4);
    c.lineTo(x - 7, hy + 4);
    c.lineTo(x - 14, hy + 6);
    c.closePath();
  };
  helm(ctx);
  const hg = ctx.createRadialGradient(x - 6, hy - 14, 1, x, hy - 6, 22);
  hg.addColorStop(0, '#d8a868');
  hg.addColorStop(0.4, '#8a5a28');
  hg.addColorStop(1, '#2e1a0c');
  ctx.fillStyle = hg;
  ctx.fill();
  within(ctx, helm, () => {
    lay(ctx, noiseMask(4, 141, { cover: 0.3, soft: 0.1, col: '#4a6450', w: 24, h: 24 }), { x: x - 16, y: hy - 24, w: 32, h: 32 }, 0.5);
    ctx.fillStyle = '#140c08';
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(x + d * 6 - 1, hy - 6, 3.6, 2.2, d * 0.3, 0, P2);
      ctx.fill();
    }
    ctx.strokeStyle = rgba('#fff0d4', 0.5);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x - 2, hy - 8, 12, Math.PI * 1.1, Math.PI * 1.5);
    ctx.stroke();
  });
  helm(ctx);
  ctx.strokeStyle = '#1e1208';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  void r;
}

// ——— the shields ———

const SH_Y = 695;
const shieldBox = (i: number): Box => {
  const [x, rad] = HG.shields[i];
  return { x: Math.floor(x - rad - 8), y: Math.floor(SH_Y - rad * 1.9 - 8), w: Math.ceil(rad * 2 + 34), h: Math.ceil(rad * 1.9 + 24) };
};
/** A round bronze hoplite shield propped against the wall's foot (leaning back: a little foreshortened). */
function shieldPaint(ctx: Ctx, r: R, i: number): void {
  const [x, rad, dev] = HG.shields[i];
  const rx = rad;
  const ry = rad * 0.93;
  const cx = x;
  const cy = SH_Y - ry;
  const outer = (c: Ctx) => {
    c.beginPath();
    c.ellipse(cx, cy, rx, ry, 0, 0, P2);
  };
  castShadow(ctx, outer, 11, 9, 0.62, '#140c08');
  groundShadow(ctx, cx + 4, SH_Y + 1, rx * 0.85, 4, 0.75, '#140c08');
  // the face: a bronze dome inside a flat rim, the low sun on its upper left
  const g = ctx.createRadialGradient(cx - rx * 0.4, cy - ry * 0.45, rx * 0.05, cx, cy, rx * 1.05);
  g.addColorStop(0, '#c89a5e');
  g.addColorStop(0.3, '#8a5c2a');
  g.addColorStop(0.75, '#4a2e16');
  g.addColorStop(1, '#22140a');
  outer(ctx);
  ctx.fillStyle = g;
  ctx.fill();
  within(ctx, outer, () => {
    // patina and wear: green in the dents, bright scratches
    lay(ctx, noiseMask(5, 111 + i * 3, { cover: 0.34, soft: 0.12, col: '#4a6450', w: 48, h: 48 }), { x: cx - rx, y: cy - ry, w: rx * 2, h: ry * 2 }, 0.6);
    ctx.strokeStyle = rgba('#ffe0a8', 0.35);
    ctx.lineWidth = 0.8;
    for (let k = 0; k < 6; k++) {
      const a = r() * P2;
      const d = r() * rx * 0.7;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.93);
      ctx.lineTo(cx + Math.cos(a) * d + (r() - 0.5) * 8, cy + Math.sin(a) * d * 0.93 + (r() - 0.5) * 5);
      ctx.stroke();
    }
    // the device, painted on the bronze and worn
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (dev === 'lambda') {
      ctx.strokeStyle = rgba('#6e1412', 0.85);
      ctx.lineWidth = rx * 0.17;
      ctx.beginPath();
      ctx.moveTo(cx - rx * 0.42, cy + ry * 0.46);
      ctx.lineTo(cx, cy - ry * 0.5);
      ctx.lineTo(cx + rx * 0.42, cy + ry * 0.46);
      ctx.stroke();
    } else if (dev === 'star') {
      ctx.strokeStyle = rgba('#1e120a', 0.75);
      ctx.lineWidth = rx * 0.07;
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * P2 + 0.2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * rx * 0.12, cy + Math.sin(a) * ry * 0.12);
        ctx.lineTo(cx + Math.cos(a) * rx * 0.52, cy + Math.sin(a) * ry * 0.52);
        ctx.stroke();
      }
      ctx.fillStyle = rgba('#1e120a', 0.8);
      ctx.beginPath();
      ctx.arc(cx, cy, rx * 0.12, 0, P2);
      ctx.fill();
    } else if (dev === 'club') {
      // a knotted club, laid on the diagonal
      ctx.fillStyle = rgba('#1e120a', 0.8);
      ctx.beginPath();
      ctx.moveTo(cx - rx * 0.4, cy + ry * 0.42);
      ctx.lineTo(cx - rx * 0.32, cy + ry * 0.5);
      ctx.lineTo(cx + rx * 0.36, cy - ry * 0.28);
      ctx.quadraticCurveTo(cx + rx * 0.46, cy - ry * 0.56, cx + rx * 0.2, cy - ry * 0.48);
      ctx.closePath();
      ctx.fill();
      for (const [kx, ky] of [[0.06, -0.06], [0.22, -0.3], [-0.12, 0.16]]) {
        ctx.beginPath();
        ctx.arc(cx + kx * rx, cy + ky * ry, rx * 0.07, 0, P2);
        ctx.fill();
      }
    } else if (dev === 'plain') {
      ctx.strokeStyle = rgba('#3a200c', 0.5);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * 0.3, ry * 0.3, 0, 0, P2);
      ctx.stroke();
    }
    ctx.restore();
    // the dome's specular: a soft bloom and a sharp crescent on its upper left
    lightPool(ctx, cx - rx * 0.35, cy - ry * 0.4, rx * 0.45, ry * 0.36, '#ffe0b0', 0.22);
    ctx.strokeStyle = rgba('#fff0d4', 0.42);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * 0.7, ry * 0.7, 0, Math.PI * 1.05, Math.PI * 1.42);
    ctx.stroke();
    // the rim: a flat band, lit along the top left, a groove inside it
    ctx.strokeStyle = rgba('#2a1608', 0.6);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * 0.83, ry * 0.83, 0, 0, P2);
    ctx.stroke();
    const rg = ctx.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry);
    rg.addColorStop(0, rgba('#ffd894', 0.38));
    rg.addColorStop(0.5, rgba('#ffd894', 0));
    rg.addColorStop(1, rgba('#0e0804', 0.4));
    ctx.strokeStyle = rg;
    ctx.lineWidth = rx * 0.15;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * 0.92, ry * 0.92, 0, 0, P2);
    ctx.stroke();
    if (dev === 'meander') {
      // a Greek key run round the rim
      ctx.strokeStyle = rgba('#1e120a', 0.7);
      ctx.lineWidth = 1;
      for (let k = 0; k < 20; k++) {
        const a = (k / 20) * P2;
        const px = cx + Math.cos(a) * rx * 0.91;
        const py = cy + Math.sin(a) * ry * 0.91;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(a + Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(-3, 1.6);
        ctx.lineTo(-3, -1.6);
        ctx.lineTo(2, -1.6);
        ctx.lineTo(2, 0.6);
        ctx.lineTo(-0.6, 0.6);
        ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = rgba('#6e1412', 0.75);
      ctx.beginPath();
      ctx.arc(cx, cy, rx * 0.2, 0, P2);
      ctx.fill();
    }
    // the cool of the sky on its lower right edge
    ctx.strokeStyle = rgba('#b8c8e8', 0.25);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx - 1, cy - 1, rx - 1.5, ry - 1.5, 0, 0.1, 1.4);
    ctx.stroke();
  });
  if (i === 1 || i === 4 || i === 6) {
    outer(ctx);
    ctx.fillStyle = rgba('#1a1208', 0.22);
    ctx.fill();
  }
  outer(ctx);
  ctx.strokeStyle = '#22140a';
  ctx.lineWidth = 2;
  ctx.stroke();
}

// ——— the spears, stacked ———

export const SPEARS_BOX: Box = { x: 686, y: 492, w: 100, h: 262 };
const SPEAR_N = 7;
const spearLines = (() => {
  const rr = rng(hashStr('hg:spears'));
  const T: Pt = [HG.spears.x + 2, 600];
  return Array.from({ length: SPEAR_N }, (_, i) => {
    const bx = HG.spears.x + (i - (SPEAR_N - 1) / 2) * 8.5 + (rr() - 0.5) * 4;
    const by = HG.spears.y - (i % 2) * 5 + rr() * 3;
    const tx = T[0] + (rr() - 0.5) * 5;
    const ty = T[1] + (rr() - 0.5) * 4;
    const dx = tx - bx;
    const dy = ty - by;
    const l = Math.hypot(dx, dy);
    const L = 228 + rr() * 16;
    return { bx, by, ux: dx / l, uy: dy / l, L };
  });
})();

function spears(ctx: Ctx, r: R): void {
  // their long shadow cast on the ground and up the wall's foot
  const shadowPath = (c: Ctx) => {
    c.beginPath();
    for (const s of spearLines) {
      const nx = -s.uy * 2.2;
      const ny = s.ux * 2.2;
      const ex = s.bx + s.ux * s.L;
      const ey = s.by + s.uy * s.L;
      c.moveTo(s.bx + nx, s.by + ny);
      c.lineTo(ex + nx, ey + ny);
      c.lineTo(ex - nx, ey - ny);
      c.lineTo(s.bx - nx, s.by - ny);
      c.closePath();
    }
  };
  ctx.save();
  ctx.beginPath();
  ctx.rect(SPEARS_BOX.x, 560, SPEARS_BOX.w, 180);
  ctx.clip();
  castShadow(ctx, shadowPath, 16, 6, 0.55, '#140c08');
  ctx.restore();
  groundShadow(ctx, HG.spears.x + 10, HG.spears.y + 2, 40, 6, 0.7, '#140c08');
  for (const s of spearLines) {
    const ex = s.bx + s.ux * s.L;
    const ey = s.by + s.uy * s.L;
    const nx = -s.uy;
    const ny = s.ux;
    // the ash shaft: dark, its sunward side lit
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#3a2616';
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.moveTo(s.bx, s.by);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.strokeStyle = '#a88052';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(s.bx + nx * 0.9 + s.ux * 12, s.by + ny * 0.9 + s.uy * 12);
    ctx.lineTo(ex + nx * 0.9 - s.ux * 18, ey + ny * 0.9 - s.uy * 18);
    ctx.stroke();
    // the leaf-shaped head (iron, lit) and the bronze butt-spike
    const head = (c: Ctx) => {
      c.beginPath();
      c.moveTo(ex - s.ux * 22, ey - s.uy * 22);
      c.quadraticCurveTo(ex - s.ux * 12 + nx * 5, ey - s.uy * 12 + ny * 5, ex + s.ux * 4, ey + s.uy * 4);
      c.quadraticCurveTo(ex - s.ux * 12 - nx * 5, ey - s.uy * 12 - ny * 5, ex - s.ux * 22, ey - s.uy * 22);
      c.closePath();
    };
    const hg = ctx.createLinearGradient(ex + nx * 5, ey + ny * 5, ex - nx * 5, ey - ny * 5);
    hg.addColorStop(0, '#f0e4cc');
    hg.addColorStop(0.5, '#9a9088');
    hg.addColorStop(1, '#3a3430');
    head(ctx);
    ctx.fillStyle = hg;
    ctx.fill();
    ctx.strokeStyle = '#1e1814';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.strokeStyle = BRONZE.body;
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(s.bx + s.ux * 12, s.by + s.uy * 12);
    ctx.lineTo(s.bx, s.by + 2);
    ctx.stroke();
    ctx.strokeStyle = rgba(BRONZE.lit, 0.8);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s.bx + s.ux * 11 + nx, s.by + s.uy * 11 + ny);
    ctx.lineTo(s.bx + nx * 0.6, s.by + 1);
    ctx.stroke();
  }
  // the cord lashing them at the crossing
  ctx.strokeStyle = '#c8b080';
  ctx.lineWidth = 1.4;
  for (let k = 0; k < 5; k++) {
    ctx.beginPath();
    ctx.moveTo(HG.spears.x - 9, 596 + k * 2.6 + r() * 0.6);
    ctx.lineTo(HG.spears.x + 12, 599 + k * 2.6);
    ctx.stroke();
  }
  ctx.strokeStyle = rgba('#3a2a16', 0.6);
  ctx.lineWidth = 0.8;
  for (let k = 0; k < 5; k++) {
    ctx.beginPath();
    ctx.moveTo(HG.spears.x - 9, 597.4 + k * 2.6);
    ctx.lineTo(HG.spears.x + 12, 600.4 + k * 2.6);
    ctx.stroke();
  }
}

// ——— the table: the platform's worn flags ———

export const TABLE_BOX: Box = { x: 0, y: TY, w: W, h: 1080 - TY };

function table(ctx: Ctx, r: R): void {
  const f = HG.front;
  const box = { x: 0, y: TY, w: W, h: f - TY };
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, f - TY + 4);
  ctx.clip();
  vfill(ctx, 0, TY, W, f - TY, [[0, '#6e6254'], [0.45, '#84786a'], [1, '#8e8272']]);
  surface(ctx, r, box, '#857868', { over: true, vary: 0.3, cells: 5, mottle: 0.25, strokes: 0.3, strokeAng: 0, strokeLen: 240, strokeW: 5, grain: 0.14, grainKind: 'speckle', seed: 121 });
  lay(ctx, drift('#b8a890', '#4e4438', 9, 123, 240, 40), box, 0.22);
  // the flags: big slabs laid in courses in perspective, each its own tone, the joints packed with dust
  const zf = zFront(f);
  const rows: number[] = [];
  for (let z = ZB; z > zf; z -= 0.55 * (z / ZB) + 0.05) rows.push(z);
  rows.push(zf);
  for (let j = 0; j < rows.length - 1; j++) {
    const z0 = rows[j];
    const z1 = rows[j + 1];
    const off = (j % 2) * 0.8 + (r() - 0.5) * 0.3;
    let X = -4.2 + off;
    while (X < 4.2) {
      const wX = 1.3 + r() * 0.9;
      const q: Pt[] = [[xAt(X, z0), yAt(z0)], [xAt(X + wX, z0), yAt(z0)], [xAt(X + wX, z1), yAt(z1)], [xAt(X, z1), yAt(z1)]];
      const qb = boxOfPts(q, 0);
      ctx.save();
      polyPath(q)(ctx);
      ctx.clip();
      ctx.fillStyle = rgba(r() < 0.5 ? '#c4b49c' : '#3e342a', 0.06 + r() * 0.1);
      ctx.fillRect(qb.x, qb.y, qb.w, qb.h);
      // worn: the middle polished paler, grime gathered along the joints
      const jg = ctx.createLinearGradient(0, qb.y, 0, qb.y + qb.h);
      jg.addColorStop(0, 'rgba(30,22,16,0.2)');
      jg.addColorStop(0.25, 'rgba(30,22,16,0)');
      jg.addColorStop(0.8, 'rgba(30,22,16,0)');
      jg.addColorStop(1, 'rgba(30,22,16,0.22)');
      ctx.fillStyle = jg;
      ctx.fillRect(qb.x, qb.y, qb.w, qb.h);
      // fossil shell and pits in the limestone
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = rgba(r() < 0.5 ? '#3a3026' : '#e8dcc4', 0.18);
        ctx.beginPath();
        ctx.ellipse(qb.x + r() * qb.w, qb.y + r() * qb.h, 1 + r() * 3, 0.6 + r() * 1.5, 0, 0, P2);
        ctx.fill();
      }
      ctx.restore();
      // the joint: a dark line with dust packed in it, its far lip lit
      ctx.strokeStyle = rgba('#2a2018', 0.42);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(xAt(X, z0), yAt(z0));
      ctx.lineTo(xAt(X, z1), yAt(z1));
      ctx.stroke();
      ctx.strokeStyle = rgba('#e8dcc4', 0.12);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(xAt(X, z0) + 2, yAt(z0));
      ctx.lineTo(xAt(X, z1) + 2.5, yAt(z1));
      ctx.stroke();
      X += wX;
    }
    const y = yAt(z1);
    ctx.fillStyle = rgba('#2a2018', 0.4);
    ctx.fillRect(0, y - 1.2, W, 2.4);
    ctx.fillStyle = rgba('#e8dcc4', 0.14);
    ctx.fillRect(0, y + 1.4, W, 1.2);
  }
  // wear: chipped arrises, a few old cracks, grit blown across
  for (let i = 0; i < 6; i++) crack(ctx, r, r() * W, TY + 30 + r() * (f - TY - 60), (r() - 0.5) * 0.8, 40 + r() * 90, { col: '#3e3228', lip: '#e8dcc4', w: 1.1, a: 0.3, branch: 0.3 });
  for (let i = 0; i < 200; i++) {
    const y = TY + 4 + r() ** 1.5 * (f - TY - 8);
    ctx.fillStyle = rgba(r() < 0.5 ? '#c8b494' : '#3a2e24', 0.3);
    ctx.fillRect(r() * W, y, 1.4 + r() * 1.6, 1.2);
  }
  // lichen creeping in from the sides
  lay(ctx, noiseMask(14, 127, { cover: 0.22, soft: 0.06, col: '#9a9a6a', w: 200, h: 40 }), { x: 0, y: TY, w: 260, h: f - TY }, 0.3);
  lay(ctx, noiseMask(14, 129, { cover: 0.22, soft: 0.06, col: '#9a9a6a', w: 200, h: 40 }), { x: W - 260, y: TY, w: 260, h: f - TY }, 0.3);
  // the dawn across it from the left, dying away to the right; the sea's cool on the far left
  const lg = ctx.createLinearGradient(0, TY, W * 0.8, f + 200);
  lg.addColorStop(0, 'rgba(255,214,170,0.1)');
  lg.addColorStop(0.5, 'rgba(255,214,170,0)');
  lg.addColorStop(1, 'rgba(20,16,36,0.2)');
  ctx.fillStyle = lg;
  ctx.fillRect(0, TY, W, f - TY);
  ctx.restore();
  tableFalloff(ctx, f, 0.3, '#140e14');
  tableSeam(ctx, 0.45, '#22180f', false);
  crevice(ctx, 0, W, TY, 14, 0.5, '#140e14');
  // the platform's front: dressed blocks, a Greek key cut along it
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, f, W, 1080 - f);
  ctx.clip();
  vfill(ctx, 0, f, W, 1080 - f, [[0, '#a69884'], [1, '#7a6c5c']]);
  surface(ctx, r, { x: 0, y: f, w: W, h: 1080 - f }, '#958774', { over: true, vary: 0.3, cells: 6, mottle: 0.3, strokes: 0, grain: 0.2, grainKind: 'speckle', seed: 131 });
  for (let x = -40 + r() * 40; x < W; x += 180 + r() * 80) {
    ctx.fillStyle = rgba('#2a2018', 0.5);
    ctx.fillRect(x, f, 2, 1080 - f);
    ctx.fillStyle = rgba('#f0e4cc', 0.25);
    ctx.fillRect(x + 2, f, 1, 1080 - f);
  }
  // the key: a cut channel (its lower lip lit, its upper in shadow)
  const ky = f + 12;
  const kh = 16;
  const step = kh * 1.25;
  const key = (c: Ctx, dy: number) => {
    c.beginPath();
    for (let x = -step; x < W + step; x += step * 2) {
      c.moveTo(x, ky + kh + dy);
      c.lineTo(x, ky + dy);
      c.lineTo(x + step * 1.5, ky + dy);
      c.lineTo(x + step * 1.5, ky + kh * 0.66 + dy);
      c.lineTo(x + step * 0.5, ky + kh * 0.66 + dy);
      c.lineTo(x + step * 0.5, ky + kh * 0.33 + dy);
      c.lineTo(x + step, ky + kh * 0.33 + dy);
      c.moveTo(x, ky + kh + dy);
      c.lineTo(x + step * 2, ky + kh + dy);
    }
  };
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = rgba('#2a2018', 0.5);
  key(ctx, 0);
  ctx.stroke();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = rgba('#f4e8d0', 0.3);
  key(ctx, 1.6);
  ctx.stroke();
  vfill(ctx, 0, f, W, 1080 - f, [[0, 'rgba(20,14,20,0)'], [1, 'rgba(20,14,20,0.35)']]);
  ctx.restore();
  ctx.fillStyle = '#b4a690';
  ctx.fillRect(0, f - 5, W, 5);
  ctx.fillStyle = rgba('#fff0d8', 0.5);
  ctx.fillRect(0, f - 5, W, 1.4);
  ctx.fillStyle = rgba('#140e10', 0.7);
  ctx.fillRect(0, f, W, 1.6);
}

// ——— the shade ———

function shadeOver(ctx: Ctx): void {
  // the HUD's corners
  for (const [x, y] of [[170, 60], [1750, 60]] as Pt[]) {
    const g = ctx.createRadialGradient(x, y, 30, x, y, 480);
    g.addColorStop(0, 'rgba(16,10,20,0.3)');
    g.addColorStop(1, 'rgba(16,10,20,0)');
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.4);
    ctx.translate(-x, -y);
    ctx.fillStyle = g;
    ctx.fillRect(x - 480, y - 480, 960, 960);
    ctx.restore();
  }
  calmLanes(ctx, 0.12, '#1a1020', 120, 720);
  // the wall's band behind the pizzas a little lower in value
  vfill(ctx, 0, 560, W, 200, [[0, 'rgba(20,12,16,0)'], [0.6, 'rgba(20,12,16,0.12)'], [1, 'rgba(20,12,16,0.2)']]);
  vignetteAll(ctx, 0.42, '#120a10');
}

// ——— frames for the live layer ———

const ROCK_PATHS = ROCKS_NEAR.map((p) => polyPath(p));
const BURSTS: [number, number, number, number][] = [[152, 546, 78, 0.36], [80, 584, 112, 0.44], [262, 656, 84, 0.54]];
const RS = 0.5;

/** A heap of foam (its blobs: x, y, radius, alpha): one soft white mass, blue-grey in its lower right shade. */
function foam(c: Ctx, blobs: [number, number, number, number][], box: Box): void {
  const k = 0.5;
  const [m, g] = makeCanvas(box.w * k, box.h * k);
  g.scale(k, k);
  g.translate(-box.x, -box.y);
  g.fillStyle = '#ffffff';
  for (const [x, y, rad, a] of blobs) {
    g.globalAlpha = Math.min(1, a);
    g.beginPath();
    g.arc(x, y, rad, 0, P2);
    g.fill();
  }
  const [t, tg] = makeCanvas(m.width, m.height);
  tg.drawImage(m, 0, 0);
  tg.globalCompositeOperation = 'source-in';
  tg.fillStyle = '#7e8aa8';
  tg.fillRect(0, 0, t.width, t.height);
  c.save();
  c.imageSmoothingEnabled = true;
  c.globalAlpha = 0.75;
  c.drawImage(t, box.x + 3, box.y + 4, box.w, box.h);
  c.globalAlpha = 1;
  c.drawImage(m, box.x - 1, box.y - 1.5, box.w, box.h);
  c.restore();
}

/**
 * The surf at phase ph (0…1 loops), in HG.surf's box: a swell rolling in from the open sea between the rocks,
 * steepening, its crest feathering white; bursting up white off the rocks one after another (heaps of foam swelling
 * and falling, spray thrown in arcs, lit on their tops, blue-grey in their shade); then pouring off the rocks in
 * sheets and spreading as lace round their feet, fading as the next swell comes.
 */
function surfFrame(c: Ctx, ph: number): void {
  const B = HG.surf;
  c.save();
  c.translate(-B.x, -B.y);
  const rr = rng(hashStr('hg:surf'));
  // 1. the swell (on the water only: the rocks are cut out of it below)
  const sp = (ph + 0.08) % 1;
  const swellY = (x: number, y: number) => y + Math.sin(x * 0.018 + 1) * 10 + (x / 450) * 26;
  if (sp < 0.5) {
    const t = sp / 0.5;
    const y = 524 + 78 * ease(t);
    const a = Math.sin(Math.PI * Math.min(1, t * 1.2)) * 0.9;
    c.lineCap = 'round';
    for (const [dy, col, al, w] of [[9, '#10203a', 0.3, 14], [0, '#c8dce8', 0.4, 4], [-2, '#ffffff', 0.65 * t, 2.5]] as const) {
      c.strokeStyle = rgba(col, al * a);
      c.lineWidth = w * (0.6 + t * 0.6);
      c.beginPath();
      for (let x = -10; x <= 450; x += 10) {
        const yy = swellY(x, y) + dy;
        if (x === -10) c.moveTo(x, yy);
        else c.lineTo(x, yy);
      }
      c.stroke();
    }
    if (t > 0.6) {
      for (let i = 0; i < 30; i++) {
        const x = rr() * 440;
        const yy = swellY(x, y) - 4 - rr() * 10 * (t - 0.6) * 2.5;
        c.fillStyle = rgba('#ffffff', 0.5 * a * rr());
        c.fillRect(x, yy, 1.5 + rr() * 3, 1.2);
      }
    }
  }
  // 2. the lace on the water round the rocks' feet after each burst
  for (const [bi, [bx, , , t0]] of BURSTS.entries()) {
    const br = rng(hashStr('hg:lace' + bi));
    let p = ph - (t0 + 0.14);
    if (p < 0) p += 1;
    if (p >= 0.6) continue;
    const u = p / 0.6;
    const a = Math.sin(Math.PI * Math.min(1, u * 1.8)) * (1 - u) * 1.3;
    const base = boxOfPts(ROCKS_NEAR[bi], 0);
    const fy = base.y + base.h;
    for (let k = 0; k < 40; k++) {
      const ang = br() * P2;
      const d = (20 + br() * 60) * (0.5 + u);
      const x = bx + Math.cos(ang) * d * 1.5;
      const y = fy - 4 + Math.sin(ang) * d * 0.25;
      c.strokeStyle = rgba('#f4f8ff', a * 0.55 * (0.4 + br() * 0.6));
      c.lineWidth = 1 + br() * 1.8;
      c.beginPath();
      c.arc(x, y, 3 + br() * 10, ang, ang + 1.2 + br() * 2);
      c.stroke();
    }
  }
  // (cut the rocks out of what's on the water)
  c.save();
  c.globalCompositeOperation = 'destination-out';
  for (const p of ROCK_PATHS) {
    p(c);
    c.fill();
  }
  c.restore();
  // 3. the bursts: heaps of foam climbing off the rock in a fan and falling back, spray thrown in arcs
  for (const [bi, [bx, by, bh, t0]] of BURSTS.entries()) {
    const br = rng(hashStr('hg:burst' + bi));
    let q = ph - t0;
    if (q < 0) q += 1;
    const dur = 0.36;
    if (q < dur) {
      const u = q / dur;
      const rise = Math.sin(Math.PI * Math.min(1, u * 1.1)) ** 0.8;
      const fade = u < 0.1 ? u / 0.1 : (1 - u) ** 0.8;
      const blobs: [number, number, number, number][] = [];
      for (let k = 0; k < 60; k++) {
        const s = br() ** 0.8;
        const y = by + 10 - s * bh * rise;
        const x = bx - 10 + (br() - 0.5) * (30 + s * bh * 1.1 * (0.4 + u)) + s * bh * 0.35 * (0.3 + u);
        const rad = (5 + br() * 10) * (0.8 + s * 0.7) * (0.6 + u) * (bh / 120);
        blobs.push([x, y, rad, fade * (0.75 - s * 0.45) * (0.6 + br() * 0.4)]);
      }
      for (let k = 0; k < 16; k++) {
        const x = bx + (br() - 0.5) * 110 * (0.5 + u * 0.7);
        blobs.push([x, by + 8 + br() * 10 + u * 8, (5 + br() * 7) * (bh / 120) * (0.8 + u), fade * 0.8]);
      }
      // jets of white water shot up off the rock, thinning to spray at their tips
      c.lineCap = 'round';
      for (let k = 0; k < 12; k++) {
        const ang = -Math.PI / 2 + 0.35 + (br() - 0.5) * 0.9;
        const len = bh * rise * (0.45 + br() * 0.7);
        const x0 = bx - 10 + (br() - 0.5) * 40;
        const y0 = by + 8;
        for (let j = 0; j < 6; j++) {
          const f0 = j / 6;
          const f1 = (j + 1) / 6;
          c.strokeStyle = rgba('#ffffff', fade * 0.55 * (1 - f0));
          c.lineWidth = (7 - f0 * 6) * (bh / 120);
          c.beginPath();
          c.moveTo(x0 + Math.cos(ang) * len * f0, y0 + Math.sin(ang) * len * f0 + f0 * f0 * u * 30);
          c.lineTo(x0 + Math.cos(ang) * len * f1, y0 + Math.sin(ang) * len * f1 + f1 * f1 * u * 30);
          c.stroke();
        }
      }
      foam(c, blobs, { x: bx - 150, y: by - bh - 70, w: 320, h: bh + 120 });
      for (let k = 0; k < 70; k++) {
        const vx = (br() - 0.5) * 200;
        const vy = -(80 + br() * 170) * (bh / 120);
        const tt = u * 1.5;
        const x = bx + vx * tt;
        const y = by + vy * tt + 0.5 * 260 * tt * tt;
        if (y > by + 24) continue;
        c.fillStyle = rgba('#ffffff', fade * (0.4 + br() * 0.5));
        const s = 1 + br() * 2.2;
        c.fillRect(x, y, s, s);
      }
    }
    // 4. pouring off the rock in sheets
    let p = ph - (t0 + 0.14);
    if (p < 0) p += 1;
    if (p < 0.5) {
      const u = p / 0.5;
      const a = Math.sin(Math.PI * Math.min(1, u * 1.6)) * (1 - u) * 1.2;
      c.save();
      ROCK_PATHS[bi](c);
      c.clip();
      c.lineCap = 'round';
      for (let k = 0; k < 18; k++) {
        const x = bx + (br() - 0.5) * 130;
        const y0 = by + br() * 16 + u * 30;
        const len = (16 + br() * 60) * Math.min(1, u * 2.5);
        c.strokeStyle = rgba('#ffffff', a * (0.15 + br() * 0.3));
        c.lineWidth = 1.5 + br() * 3;
        c.beginPath();
        c.moveTo(x, y0);
        c.lineTo(x + (br() - 0.5) * 6, y0 + len);
        c.stroke();
      }
      c.restore();
    }
  }
  // (the wall's end stands in front of it all)
  c.globalCompositeOperation = 'destination-out';
  c.beginPath();
  c.moveTo(WL.x0 - 3, WL.base + 6);
  for (let x = WL.x0 - 3; x <= B.x + B.w + 4; x += 6) c.lineTo(x, wallTop(Math.max(WL.x0, x)) - CAP * capK(Math.max(WL.x0, x)) - 1);
  c.lineTo(B.x + B.w + 4, WL.base + 6);
  c.closePath();
  c.fill();
  c.restore();
}

/** The surf in the still (painted apart: it cuts the rocks out of its own water). */
function surfStill(ctx: Ctx): void {
  const B = HG.surf;
  const [cv, g] = makeCanvas(B.w, B.h);
  surfFrame(g, 0.5);
  ctx.drawImage(cv, B.x, B.y);
}

/** A gull (frame ph of its wingbeat): white body, pale grey wings with black tips, seen from a little below. */
const GULL = { w: 44, h: 26 };
function gullFrame(c: Ctx, ph: number): void {
  const cx = GULL.w / 2;
  const cy = GULL.h / 2 + 2;
  const flap = Math.sin(ph * P2);
  for (const d of [-1, 1]) {
    const tipY = cy - 2 - flap * 9;
    const elbY = cy - 3 - flap * 5;
    c.fillStyle = '#c8ccd8';
    c.beginPath();
    c.moveTo(cx + d * 2, cy - 1);
    c.quadraticCurveTo(cx + d * 9, elbY - 2, cx + d * 12, elbY);
    c.lineTo(cx + d * 21, tipY);
    c.quadraticCurveTo(cx + d * 13, elbY + 3, cx + d * 3, cy + 2.5);
    c.closePath();
    c.fill();
    c.fillStyle = '#1e1c22';
    c.beginPath();
    c.moveTo(cx + d * 16, (elbY + tipY) / 2 - 0.5);
    c.lineTo(cx + d * 21, tipY);
    c.lineTo(cx + d * 15.5, (elbY + tipY) / 2 + 2);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.8)';
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(cx + d * 3, cy - 1.2);
    c.quadraticCurveTo(cx + d * 9, elbY - 2.2, cx + d * 12, elbY - 0.8);
    c.stroke();
  }
  c.fillStyle = '#f8f6f2';
  c.beginPath();
  c.ellipse(cx, cy + 0.5, 3, 6.5, 0, 0, P2);
  c.fill();
  c.fillStyle = '#e8c040';
  c.fillRect(cx - 0.6, cy - 7.5, 1.2, 2);
}
/** A gull standing (side on, facing left), its own soft shadow under it. */
function gullPerched(c: Ctx): void {
  c.fillStyle = 'rgba(20,12,10,0.35)';
  c.beginPath();
  c.ellipse(10, 17.5, 7, 1.4, 0, 0, P2);
  c.fill();
  c.strokeStyle = '#c87a4a';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(9, 13);
  c.lineTo(9, 17.5);
  c.moveTo(11, 13);
  c.lineTo(11.5, 17.5);
  c.stroke();
  c.fillStyle = '#f6f2ec';
  c.beginPath();
  c.ellipse(11, 10, 6.5, 3.6, -0.15, 0, P2);
  c.fill();
  c.fillStyle = '#a8acbc';
  c.beginPath();
  c.ellipse(12.5, 8.8, 6, 2.4, -0.2, 0, P2);
  c.fill();
  c.fillStyle = '#1e1c22';
  c.beginPath();
  c.moveTo(17, 8.5);
  c.lineTo(21, 9.8);
  c.lineTo(17, 10.4);
  c.closePath();
  c.fill();
  c.fillStyle = '#f6f2ec';
  c.beginPath();
  c.arc(5.6, 6.4, 2.6, 0, P2);
  c.fill();
  c.fillStyle = '#e8c040';
  c.fillRect(1.4, 6.2, 2.6, 1);
  c.fillStyle = 'rgba(255,214,170,0.6)';
  c.fillRect(6, 7.2, 8, 1.2);
}
/** Where gulls stand: on the wall's left end, and the far rocks. */
const PERCH: Pt[] = [[430, wallTop(430)], [462, wallTop(462)], [512, 506], [168, 548]];
export const GULLS_STILL_BOX: Box = { x: 150, y: 470, w: 340, h: 110 };
function gullsStill(ctx: Ctx): void {
  const [cv, g] = makeCanvas(22, 20);
  gullPerched(g);
  for (const [i, [x, y]] of PERCH.entries()) {
    const s = i === 2 ? 0.8 : 1.3;
    ctx.save();
    ctx.translate(x, y);
    if (i % 2) ctx.scale(-1, 1);
    ctx.drawImage(cv, -10 * s, -17.5 * s, 22 * s, 20 * s);
    ctx.restore();
  }
}

/** A cloud of arrows in flight (its own frame: flying towards +x), fluttering at phase ph: shafts, fletching, the
 * odd glint on a head; a faint blur of their speed behind them. */
const VOL = { w: 240, h: 90 };
function volleyFrame(c: Ctx, ph: number, seed: number): void {
  const rr = rng(hashStr('hg:vol' + seed));
  c.lineCap = 'round';
  for (let i = 0; i < 70; i++) {
    const gx = (rr() + rr() + rr()) / 3;
    const gy = (rr() + rr()) / 2;
    const x = 20 + gx * (VOL.w - 50) + Math.sin(ph * P2 + i * 1.3) * 3;
    const y = 10 + gy * (VOL.h - 20) + Math.sin(ph * P2 * 2 + i) * 1.6;
    const a = (rr() - 0.5) * 0.1 + Math.sin(ph * P2 + i * 2.1) * 0.05;
    const len = 12 + rr() * 6;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    c.strokeStyle = 'rgba(30,22,18,0.16)';
    c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(x - ca * len * 1.6, y - sa * len * 1.6);
    c.lineTo(x, y);
    c.stroke();
    c.strokeStyle = 'rgba(26,18,14,0.92)';
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(x - ca * len, y - sa * len);
    c.lineTo(x, y);
    c.stroke();
    // the fletching
    c.strokeStyle = 'rgba(60,40,30,0.85)';
    c.lineWidth = 1;
    for (const d of [-1, 1]) {
      c.beginPath();
      c.moveTo(x - ca * len + sa * 0, y - sa * len);
      c.lineTo(x - ca * (len - 4) - sa * d * 2.4, y - sa * (len - 4) + ca * d * 2.4);
      c.stroke();
    }
    if (rr() < 0.25) {
      c.fillStyle = 'rgba(255,236,200,0.8)';
      c.fillRect(x - 1, y - 0.6, 2.2, 1.2);
    }
  }
}
/** An arrow stuck in the ground, leaning (its foot at the frame's bottom middle). */
function stuckArrow(c: Ctx): void {
  c.lineCap = 'round';
  c.strokeStyle = '#2a1e16';
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(7, 22);
  c.lineTo(12, 3);
  c.stroke();
  c.strokeStyle = 'rgba(255,230,200,0.6)';
  c.lineWidth = 0.6;
  c.beginPath();
  c.moveTo(6.4, 21);
  c.lineTo(11.4, 3);
  c.stroke();
  c.strokeStyle = '#6a4434';
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(12, 3);
  c.lineTo(9, 7);
  c.moveTo(12, 3);
  c.lineTo(14.6, 6.6);
  c.stroke();
  c.fillStyle = 'rgba(30,20,14,0.4)';
  c.beginPath();
  c.ellipse(9, 22.5, 4, 1.2, 0, 0, P2);
  c.fill();
}

// ——— the stack ———
//
// Far to near. The later waves' skies are live-only sprites cut to the sky's own region, after everything that stands
// in front of the sky, so nothing after them overlaps their box. The shields and the cloak are sprites (they rattle,
// slide and sway); the surf, the host's banners and smoke, the springs' steam and the gulls are painted frames in the
// live layer, painted in place only in the still.

const shieldLayer = (i: number) => ({ id: 'shield' + i, box: shieldBox(i), motion: 'sprite' as const, draw: (c: Ctx, r: R) => shieldPaint(c, r, i) });

export const HOTGATES: SceneSpec = {
  id: 'hotgates',
  info: {
    name: 'The Hot Gates',
    subtitle: 'Waves 81–84 · with King Leonidas',
    ambient: [],
    // (the sun, the fires and the glare are the live layer's)
    glows: [],
    light: '#ffe0c0',
    tableTint: '#fff2e4',
  },
  layers: [
    { id: 'sky', box: SKY_BOX, draw: (c, r) => skyPaint(c, r, DAWN) },
    { id: 'far', box: FAR_BOX, draw: far },
    { id: 'sea', box: SEA_BOX, draw: sea },
    { id: 'roadStill', box: SEA_BOX, stillOnly: true, draw: roadStill },
    { id: 'plain', box: PLAIN_BOX, draw: plain },
    { id: 'host', box: HOST_BOX, draw: host },
    { id: 'bannersStill', box: { x: 600, y: 380, w: 620, h: 100 }, stillOnly: true, draw: (c) => bannersStill(c) },
    { id: 'smokeStill', box: SMOKE_STILL_BOX, stillOnly: true, draw: (c) => smokeStill(c) },
    { id: 'rocks', box: ROCKS_BOX, draw: rocks },
    { id: 'cliff', box: CLIFF_BOX, draw: cliff },
    { id: 'noonSky', box: SKY_BOX, liveOnly: true, res: 0.5, draw: skyCut(NOON) },
    { id: 'arrowSky', box: SKY_BOX, liveOnly: true, res: 0.5, draw: skyCut(ARROWS) },
    { id: 'duskSky', box: SKY_BOX, liveOnly: true, res: 0.5, draw: skyCut(DUSK) },
    { id: 'wall', box: WALL_BOX, draw: wall },
    { id: 'cloak', box: CLOAK_BOX, motion: 'sprite', draw: cloak },
    { id: 'ground', box: GROUND_BOX, draw: ground },
    ...HG.shields.map((_, i) => shieldLayer(i)),
    { id: 'spears', box: SPEARS_BOX, draw: spears },
    { id: 'springs', box: SPRINGS_BOX, draw: springs },
    { id: 'surfStill', box: HG.surf, stillOnly: true, draw: (c) => surfStill(c) },
    { id: 'steamStill', box: STEAM_STILL_BOX, stillOnly: true, draw: (c) => steamStill(c) },
    { id: 'gullsStill', box: GULLS_STILL_BOX, stillOnly: true, draw: (c) => gullsStill(c) },
    { id: 'table', box: TABLE_BOX, draw: table },
    { id: 'top', motion: 'top', draw: () => {} },
  ],
  shade: shadeOver,
};

// ——— live ———

registerKitScene(HOTGATES, (k: KitLive, wave0: number) => {
  const MUL = Phaser.BlendModes.MULTIPLY;
  const SCR = Phaser.BlendModes.SCREEN;
  const top = k.slot('top');
  const noonSky = k.sprite('noonSky');
  const arrowSky = k.sprite('arrowSky');
  const duskSky = k.sprite('duskSky');
  const Col = Phaser.Display.Color;
  const lerpCol = (a: number, b: number, t: number) => {
    const ca = Col.IntegerToRGB(a);
    const cb = Col.IntegerToRGB(b);
    return Col.GetColor(Math.round(ca.r + (cb.r - ca.r) * t), Math.round(ca.g + (cb.g - ca.g) * t), Math.round(ca.b + (cb.b - ca.b) * t));
  };

  // ——— the sea: the sun's glitter twinkling, the surf breaking on the rocks ———
  const ROAD_R = 0.5;
  const roadKey = k.tex('hg_road', SEA_BOX.w * ROAD_R, SEA_BOX.h * ROAD_R, (c) => {
    c.scale(ROAD_R, ROAD_R);
    c.translate(-SEA_BOX.x, -SEA_BOX.y);
    roadStill(c, rng(hashStr('hg:road')));
    c.globalCompositeOperation = 'destination-out';
    for (const p of [...ROCKS_NEAR, ...ROCKS_FAR]) {
      polyPath(p)(c);
      c.fill();
    }
  });
  const road = k.img(roadKey, SEA_BOX.x, SEA_BOX.y, { into: top, origin: [0, 0], scale: 1 / ROAD_R, add: true });
  const glit = new Parts(k, { frame: 'spark', add: true, into: top, max: 70 });
  const glitRate = new Rate();
  const surfKey = sheet(k, 'hg_surf', HG.surf.w * RS, HG.surf.h * RS, 12, (c, ph) => {
    c.scale(RS, RS);
    surfFrame(c, ph);
  });
  const SURF_T = 5.6;
  const surf = new Loop(k, surfKey, 12, HG.surf.x, HG.surf.y, { into: top, origin: [0, 0], scale: 1 / RS, fps: 0 });
  let surfPh = 0.2;
  const spray = new Parts(k, { frame: 'drop', into: top, max: 90 });

  // ——— the gulls: wheeling over the sea, standing on the wall's end ———
  const gullKey = sheet(k, 'hg_gull', GULL.w, GULL.h, 8, (c, ph) => gullFrame(c, ph));
  const perchKey = k.tex('hg_gullP', 22, 20, gullPerched);
  const flyers = [0, 1, 2, 3].map((i) => ({
    l: new Loop(k, gullKey, 8, 300, 200, { into: top, fps: 7 + i, scale: 0.75 + (i % 3) * 0.16 }),
    cx: 220 + i * 110, cy: 190 + (i % 2) * 70, ax: 120 + i * 30, ay: 40 + i * 10, w: 0.18 + i * 0.05, ph: i * 1.7,
  }));
  const perched = PERCH.map(([x, y], i) => {
    const s = i === 2 ? 0.8 : 1.3;
    const im = k.img(perchKey, x, y, { into: top, origin: [10 / 22, 17.5 / 20], scale: s });
    if (i % 2) im.setScale(-s, s);
    const fly = new Loop(k, gullKey, 8, x, y, { into: top, fps: 9, scale: s * 0.8 });
    fly.alpha = 0;
    fly.show(0);
    return { im, x, y, s, fly, state: 0, t: 0, vx: 0, vy: 0, fx: x, fy: y };
  });

  // ——— the host: banners rippling, dust rolling, the camp's smoke, its fires at dusk ———
  const BK = 2;
  const banners = BANNERS.map(([x, y, kind, s], i) => {
    const f = bannerFrame(s, BK);
    const { bw, top: tp } = bannerDims(s);
    const key = sheet(k, 'hg_ban' + i, f.fw, f.fh, 8, (c, ph) => bannerAt(c, s, kind, ph, hostDepth(y), BK));
    return new Loop(k, key, 8, x - bw / 2 - f.ox, y - tp, { into: top, origin: [0, 0], scale: 1 / BK, fps: 5 + (i % 4) * 0.9, phase: BANNER_PH * 8 + i * 0.7 });
  });
  const dust = new Parts(k, { frame: 'puff', into: top, max: 80 });
  const dustRate = new Rate();
  const hostSpan = (y: number): [number, number] => [shoreX(y) + 30, cliffX(y) - 20];
  const puff = (warm: boolean) => {
    const y = HZ + 6 + crand() * 70;
    const [x0, x1] = hostSpan(y);
    const x = x0 + crand() * (x1 - x0);
    const s = 0.5 + (y - HZ) / 70;
    dust.spawn({ x, y, vx: 6 + crand() * 14, vy: -2 - crand() * 4, life: 7 + crand() * 5, r0: 14 * s, r1: (40 + crand() * 40) * s, a: 0.3, tint: warm ? 0xe8caa8 : 0xd8b896, drag: 0.05, fade: 0.35 });
  };
  for (let i = 0; i < 40; i++) puff(true);
  const SMK_R = 0.5;
  const smokeKey = sheet(k, 'hg_smoke', SMOKE_F.w * SMK_R, SMOKE_F.h * SMK_R, 8, (c, ph) => {
    c.scale(SMK_R, SMK_R);
    smokeFrame(c, SMOKE_F.w, SMOKE_F.h, ph, SMOKE_O);
  });
  const smokes = SMOKES.map(([x, y], i) => new Loop(k, smokeKey, 8, x, y + 1, { into: top, origin: [0.5, (SMOKE_F.h - 10) / SMOKE_F.h], scale: 0.85 / SMK_R, fps: 1.2 + i * 0.15, phase: i * 2.2 }));

  // ——— the springs' steam ———
  const STM_R = 0.5;
  const steams = VENTS.map(([x, y], i) => {
    const key = sheet(k, 'hg_steam' + i, STEAM_F.w * STM_R, STEAM_F.h * STM_R, 10, (c, ph) => {
      c.scale(STM_R, STM_R);
      steamPuffs(c, STEAM_F.w, STEAM_F.h, ph, i);
    });
    return new Loop(k, key, 10, x, y + 6, { into: top, origin: [0.5, 1], scale: 1 / STM_R, fps: 1.2 + i * 0.25, phase: (i * 0.37 + 0.2) * 10 });
  });

  // ——— the arrows: a cloud of them in flight, single arrows coming down, arrows stuck in the plain ———
  const volKeys = [0, 1].map((sd) => sheet(k, 'hg_vol' + sd, VOL.w, VOL.h, 6, (c, ph) => volleyFrame(c, ph, sd)));
  const arrowKey = k.tex('hg_arrow', 28, 28, (c) => {
    c.lineCap = 'round';
    c.strokeStyle = '#1e1610';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(2, 14);
    c.lineTo(26, 14);
    c.stroke();
    c.strokeStyle = '#5a3a2a';
    c.beginPath();
    c.moveTo(2, 14);
    c.lineTo(6, 11);
    c.moveTo(2, 14);
    c.lineTo(6, 17);
    c.stroke();
  });
  const stuckKey = k.tex('hg_stuck', 18, 24, stuckArrow);
  type Flight = { l: Loop; x0: number; y0: number; x1: number; y1: number; h: number; t: number; dur: number; delay: number; dropped: boolean; on: boolean };
  const flights: Flight[] = Array.from({ length: 14 }, (_, i) => {
    const l = new Loop(k, volKeys[i % 2], 6, 0, 0, { into: top, fps: 9 + (i % 3), tint: 0xffffff });
    l.alpha = 0;
    l.show(0);
    return { l, x0: 0, y0: 0, x1: 0, y1: 0, h: 0, t: 0, dur: 1, delay: 0, dropped: false, on: false };
  });
  const singles = new Parts(k, { frame: 'spark', sheet: { key: arrowKey, n: 1, half: 14 }, into: top, max: 90 });
  const streaks = new Parts(k, { frame: 'drop', into: top, max: 140 });
  const stuck: { im: Phaser.GameObjects.Image; age: number }[] = [];
  const landDust = new Parts(k, { frame: 'puff', into: top, max: 60 });
  const stick = (x: number, y: number) => {
    if (y > HG.land.y1 + 4) return;
    let s = stuck.find((a) => a.age < 0);
    if (!s) {
      if (stuck.length >= 70) s = stuck.reduce((a, b) => (a.age > b.age ? a : b));
      else {
        s = { im: k.img(stuckKey, x, y, { into: top, origin: [7 / 18, 22 / 24] }), age: 0 };
        stuck.push(s);
      }
    }
    const d = 0.45 + ((y - HG.land.y0) / (HG.land.y1 - HG.land.y0)) * 0.4;
    s.im.setPosition(x, y).setScale(crand() < 0.5 ? d : -d, d).setRotation((crand() - 0.5) * 0.4).setAlpha(1).setVisible(true);
    s.age = 0;
    landDust.spawn({ x, y: y - 2, vx: (crand() - 0.5) * 20, vy: -8 - crand() * 10, life: 1.2 + crand() * 0.6, r0: 3 * d, r1: 16 * d, a: 0.4, tint: 0xd8bc9a, drag: 1.2, fade: 0.1 });
  };
  let vdir = 1;
  let vx0 = 900;
  const volley = () => {
    const n = 6 + Math.floor(crand() * 3);
    let used = 0;
    // (each volley sweeps one way: loosed from one wing of the host towards the far side of the plain)
    vdir = crand() < 0.5 ? -1 : 1;
    vx0 = vdir > 0 ? 960 + crand() * 160 : 640 + crand() * 140;
    for (let i = 0; i < 46; i++) {
      const sx = Math.max(600, Math.min(1180, vx0 + (crand() - 0.5) * 360));
      const sy = 440 + crand() * 20;
      const tx = sx - vdir * (300 + crand() * 200);
      const dur = 1.5 + crand() * 0.4;
      const hh = 260 + crand() * 120;
      streaks.spawn({ x: sx, y: sy, vx: (tx - sx) / dur, vy: -hh * 4 / dur + (crand() - 0.5) * 20, life: dur * 0.9, r0: 2.2, r1: 2.6, a: 0.55, tint: 0x1a1612, grav: (hh * 8) / (dur * dur), streak: 0.09, fade: 0.25 });
    }
    for (const f of flights) {
      if (f.on || used >= n) continue;
      f.on = true;
      f.dropped = false;
      f.t = 0;
      f.delay = used * (0.14 + crand() * 0.1);
      f.x0 = Math.max(620, Math.min(1150, vx0 + (crand() - 0.5) * 120 - used * 38 * vdir));
      f.y0 = 444 + crand() * 18;
      f.x1 = Math.max(HG.land.x0 + 40, Math.min(HG.land.x1 - 40, f.x0 - vdir * (240 + crand() * 160)));
      f.y1 = HG.land.y0 + 6 + crand() * (HG.land.y1 - HG.land.y0 - 14);
      f.h = 250 + crand() * 90;
      f.dur = 2 + crand() * 0.5;
      used++;
    }
  };
  let volleyT = 1.5;

  // ——— the wall: its shields (rattling, one sliding down flat), the cloak, dust and grit shaken off it ———
  const shields = HG.shields.map(([x], i) => {
    const im = k.pivot(k.sprite('shield' + i), x, SH_Y);
    return { im, x, sw: new Swing(im, { k: 1300, c: 11 }), hop: new Spring(0, 900, 14) };
  });
  const tp = shields[HG.topple];
  const fall = { state: 0, t: 0, sy: new Spring(1, 500, 18), cool: 0 };
  const cloakImg = k.pivot(k.sprite('cloak'), SNAG[0], SNAG[1]);
  const cloakSw = new Swing(cloakImg, { k: 7, c: 1.4, idle: 0.04, seed: 3, speed: 1.3 });
  const grit = new Parts(k, { frame: 'mote', into: top, max: 140 });
  const wallDust = new Parts(k, { frame: 'puff', into: top, max: 70 });

  // ——— the light: washes over everything, then the glows that the washes don't dim ———
  const noonW = k.wash(0xfff2dc, 0, SCR, top);
  const darkW = k.wash(0x5e6878, 0, MUL, top);
  const redW = k.wash(0xe86a46, 0, MUL, top);
  const dimW = k.wash(0x483668, 0, MUL, top);
  const sunGlow = k.glow(DUSK.sun[0], DUSK.sun[1], 260, 0xff5a26, 0, { into: top, sy: 0.6 });
  const fires = FIRES.map(([x, y], i) => {
    const s = 0.5 + (y - HZ) / 70;
    return {
      glow: k.glow(x, y - 2, 26 * s, 0xff7a2a, 0, { into: top, sy: 0.7 }),
      pool: k.glow(x + 2, y + 1, 24 * s, 0xff6a2a, 0, { into: top, sy: 0.25 }),
      core: k.img('glow', x, y - 1, { into: top, add: true, alpha: 0, sx: (5 * s) / 128, sy: (4 * s) / 128, tint: 0xffd890 }),
      seed: i * 1.37,
      x, y, s,
    };
  });
  const embers = new Parts(k, { frame: 'ember', add: true, into: top, max: 50 });
  const emberRate = new Rate();

  let kw = waveK(wave0);
  let shown = kw;
  let lightTint = 0xffffff;
  let gust = 0;

  /** Grit and dust shaken off the wall near x (power p). */
  const shake = (x: number, p: number) => {
    for (let i = 0; i < 6 + p * 22; i++) {
      const gx = Math.max(WL.x0 + 30, Math.min(WL.x1 - 10, x + (crand() - 0.5) * (500 + p * 600)));
      const gy = wallTop(gx) + 2 + crand() * 10;
      grit.spawn({ x: gx, y: gy, vx: (crand() - 0.5) * 30, vy: crand() * 30, life: 2.2, r0: 1 + crand() * 1.6, a: 0.9, tint: lerpCol(0xcab498, lightTint, 0.5), grav: 700, drag: 0.2, floor: WL.base + 2 + crand() * 8, bounce: 0.25, fade: 0.02 });
    }
    for (let i = 0; i < 3 + p * 8; i++) {
      const gx = Math.max(WL.x0 + 30, Math.min(WL.x1 - 10, x + (crand() - 0.5) * (400 + p * 500)));
      wallDust.spawn({ x: gx, y: wallTop(gx) - 4, vx: (crand() - 0.5) * 30, vy: -14 - crand() * 18, life: 1.8 + crand(), r0: 8, r1: 34 + crand() * 22, a: 0.55, tint: lerpCol(0xe8d8c0, lightTint, 0.6), drag: 1.2, fade: 0.08 });
      wallDust.spawn({ x: gx, y: wallTop(gx) + 10 + crand() * 40, vx: (crand() - 0.5) * 10, vy: 16 + crand() * 26, life: 1.6 + crand(), r0: 5, r1: 22 + crand() * 18, a: 0.45, tint: lerpCol(0xe0ccb0, lightTint, 0.6), grav: 20, drag: 1.3, fade: 0.12 });
      wallDust.spawn({ x: gx + (crand() - 0.5) * 60, y: WL.base - 4, vx: (crand() - 0.5) * 40, vy: -6 - crand() * 10, life: 1.4 + crand(), r0: 6, r1: 30 + crand() * 20, a: 0.4, tint: lerpCol(0xc8b090, lightTint, 0.6), drag: 1.1, fade: 0.12 });
    }
  };

  return {
    setWave: (w) => (kw = waveK(w)),
    impact(x, _y, p) {
      shake(x, p);
      for (const s of shields) {
        const near = clamp01(1.25 - Math.abs(s.x - x) / 900);
        if (s === tp && fall.state) continue;
        s.sw.kick((crand() - 0.5) * (1 + p * 3) * near);
        s.hop.v -= (20 + p * 60) * near;
      }
      if (p > 0.5 && fall.state === 0 && fall.cool <= 0) {
        fall.state = 1;
        fall.t = 0;
      }
      cloakSw.kick((x < SNAG[0] ? 1 : -1) * (0.3 + p * 0.8));
      gust = Math.min(1.5, gust + p);
      // the gulls on the wall take off
      for (const g of perched) {
        if (g.state !== 0 || (p < 0.3 && crand() < 0.5)) continue;
        g.state = 1;
        g.t = 0;
        g.fx = g.x;
        g.fy = g.y - 6 * g.s;
        g.vx = -40 - crand() * 60;
        g.vy = -90 - crand() * 40;
      }
    },
    update(dt, t) {
      const cm = calm();
      shown += (kw - shown) * Math.min(1, dt * 0.6);
      // 0 dawn … 1/3 noon … 2/3 the arrows … 1 dusk
      const noonK = clamp01(1 - Math.abs(shown - 1 / 3) * 3);
      const arrowK = clamp01(1 - Math.abs(shown - 2 / 3) * 3);
      const duskK = ease(clamp01((shown - 2 / 3) * 3));
      noonSky.setAlpha(ease(clamp01(shown * 3)));
      arrowSky.setAlpha(ease(clamp01((shown - 1 / 3) * 3)));
      duskSky.setAlpha(duskK);
      let inFlight = 0;
      for (const f of flights) if (f.on && f.delay <= 0 && f.t < 0.9) inFlight++;
      noonW.setAlpha(noonK * 0.17);
      darkW.setAlpha(arrowK * 0.42 + Math.min(0.12, inFlight * 0.02) * arrowK);
      redW.setAlpha(duskK * 0.5);
      dimW.setAlpha(duskK * 0.22);
      sunGlow.setAlpha(duskK * 0.28);
      lightTint = lerpCol(lerpCol(lerpCol(0xffffff, 0xfff8f0, noonK), 0x8a909e, arrowK), 0xd88a70, duskK);

      // the sea: the sun's glitter, the surf (rougher as the day goes on)
      const gx = 232 + duskK * 70;
      road.setAlpha(clamp01(1 - noonK * 0.85 - arrowK * 0.9 + duskK * 0.1)).setTint(lerpCol(0xffffff, 0xff8a5a, duskK));
      glitRate.tick((14 + noonK * 26 - arrowK * 10) * cm, dt, () => {
        const tt = crand() ** 0.9;
        const y = HZ + 4 + tt * 300;
        const spread = noonK > 0.5 ? 330 : 200 * (0.1 + tt);
        const x = Math.max(4, Math.min(shoreX(y) - 10, gx + (crand() + crand() - 1) * spread));
        if (y > 540 && x < 440) return;
        glit.spawn({ x, y, vx: (crand() - 0.5) * 4, life: 0.4 + crand() * 0.6, r0: 1.5 + tt * 3, r1: 0.5, a: 0.8 * (1 - arrowK * 0.7), tint: duskK > 0.5 ? 0xff9a6a : noonK > 0.5 ? 0xffffff : 0xffd8a8, fade: 0.4 });
      });
      const prev = surfPh;
      surfPh = (surfPh + (dt / SURF_T) * (1 + arrowK * 0.25 + duskK * 0.15) * cm) % 1;
      surf.show(surfPh * 12);
      surf.each((im) => im.setTint(lightTint));
      for (const [bx, by, bh, t0] of BURSTS) {
        const crossed = prev <= surfPh ? prev < t0 && surfPh >= t0 : prev < t0 || surfPh >= t0;
        if (!crossed) continue;
        for (let i = 0; i < 14; i++) {
          spray.spawn({ x: bx + (crand() - 0.5) * 50, y: by - crand() * 10, vx: (crand() - 0.5) * 140, vy: -(120 + crand() * 220) * (bh / 120), life: 1.4, r0: 1.5 + crand() * 2, a: 0.85, tint: lerpCol(0xffffff, lightTint, 0.7), grav: 520, drag: 0.3, streak: 0.012, floor: by + 30 + crand() * 40, fade: 0.05 });
        }
      }

      // the gulls
      const gullA = 1 - arrowK * 0.8 - duskK * 0.3;
      for (const g of flyers) {
        const tt = t * g.w * cm + g.ph;
        const x = g.cx + Math.sin(tt) * g.ax;
        const y = g.cy + Math.sin(tt * 2 + 0.7) * g.ay;
        g.l.step(dt, cm);
        g.l.alpha = gullA;
        g.l.each((im) => {
          im.setPosition(x, y);
          im.setRotation(Math.cos(tt) * 0.25);
          im.setTint(lightTint);
        });
      }
      for (const g of perched) {
        g.im.setTint(lightTint);
        if (g.state === 0) continue;
        g.t += dt;
        if (g.state === 1) {
          g.vy += 20 * dt;
          g.fx += g.vx * dt;
          g.fy += g.vy * dt;
          g.fly.step(dt, 1.4);
          g.fly.alpha = clamp01(1 - (g.t - 3) / 2);
          g.fly.each((im) => im.setPosition(g.fx, g.fy).setScale(g.s * 0.8 * (1 + g.t * 0.1)));
          g.im.setAlpha(0);
          if (g.t > 12) {
            g.state = 2;
            g.t = 0;
          }
        } else {
          // back again, quietly
          g.fly.alpha = 0;
          g.fly.show(0);
          g.im.setAlpha(clamp01(g.t / 1.5));
          if (g.t > 1.5) g.state = 0;
        }
      }

      // the host
      for (const b of banners) {
        b.step(dt, (1 + gust * 0.3 + noonK * 0.2) * cm);
        b.each((im) => im.setTint(lightTint));
      }
      dustRate.tick((3 + noonK * 3 + arrowK * 4 + duskK * 1.5) * cm, dt, () => puff(duskK < 0.5));
      for (const [i, s] of smokes.entries()) {
        s.step(dt, cm);
        s.alpha = 0.55 + duskK * 0.4 - noonK * 0.25;
        s.each((im) => im.setTint(lerpCol(lightTint, 0xffb090, duskK * (0.6 + 0.2 * Math.sin(t * 2 + i)))));
      }
      for (const f of fires) {
        const fk = flicker(t * 1.1, f.seed);
        f.glow.setAlpha(duskK * 0.38 * fk);
        f.pool.setAlpha(duskK * 0.16 * fk);
        f.core.setAlpha(duskK * 0.9 * fk);
      }
      emberRate.tick(duskK * 6 * cm, dt, () => {
        const f = fires[Math.floor(crand() * fires.length)];
        embers.spawn({ x: f.x + (crand() - 0.5) * 4, y: f.y - 3, vx: (crand() - 0.3) * 8, vy: -12 - crand() * 14, life: 1.2 + crand(), r0: 0.8 * f.s, r1: 0.3, a: 0.9, tint: 0xffa040, drag: 0.3, fade: 0.1 });
      });

      // the arrows
      if (arrowK > 0.55) {
        volleyT -= dt;
        if (volleyT <= 0) {
          volleyT = 3.2 + crand() * 2.4;
          volley();
        }
      }
      for (const f of flights) {
        if (!f.on) continue;
        if (f.delay > 0) {
          f.delay -= dt;
          continue;
        }
        f.t += dt / f.dur;
        const tt = Math.min(1, f.t);
        const x = f.x0 + (f.x1 - f.x0) * tt;
        const y = f.y0 + (f.y1 - f.y0) * tt - f.h * 4 * tt * (1 - tt);
        const dx = f.x1 - f.x0;
        const dy = f.y1 - f.y0 - f.h * 4 * (1 - 2 * tt);
        const s = 0.55 + 0.85 * tt ** 1.4;
        f.l.step(dt, 1);
        f.l.alpha = clamp01(tt / 0.08) * clamp01((0.9 - tt) / 0.1) * 0.95;
        f.l.each((im) => im.setPosition(x, y).setRotation(Math.atan2(dy, dx)).setScale(s).setTint(lightTint));
        if (!f.dropped && tt > 0.8) {
          // the cloud breaks up into arrows coming down one by one, each sticking where it lands
          f.dropped = true;
          const sp = Math.hypot(dx, dy) / f.dur;
          for (let i = 0; i < 9; i++) {
            const ox = (crand() - 0.5) * 90 * s;
            const oy = (crand() - 0.5) * 40 * s;
            const fy = f.y1 + (crand() - 0.5) * 30;
            singles.spawn({ x: x + ox, y: y + oy, vx: (dx / Math.hypot(dx, dy)) * sp * 0.9 + (crand() - 0.5) * 30, vy: (dy / Math.hypot(dx, dy)) * sp * 0.9, life: 2, r0: 11 * s, a: 0.95, tint: lerpCol(0xffffff, lightTint, 0.8), grav: 300, streak: 0.0004, floor: Math.max(HG.land.y0, Math.min(HG.land.y1, fy)), onFloor: (lx, ly) => stick(lx, ly), fade: 0.05 });
          }
        }
        if (f.t >= 1) {
          f.on = false;
          f.l.alpha = 0;
          f.l.show(0);
        }
      }
      for (const s of stuck) {
        if (s.age < 0) continue;
        s.age += dt;
        // they stay while the arrows fly; after, the dusk's dust and dark take them
        const life = arrowK > 0.3 ? 30 : 6;
        s.im.setAlpha(clamp01((life - s.age) / 2)).setTint(lightTint);
        if (s.age > life) {
          s.age = -1;
          s.im.setVisible(false);
        }
      }

      // the springs' steam: thick in the cool of dawn and dusk, thin in the noon heat
      for (const st of steams) {
        st.step(dt, (1 + gust * 0.3) * cm);
        st.alpha = 0.9 - noonK * 0.45 - arrowK * 0.2;
        st.each((im) => im.setTint(lightTint));
      }

      // the shields
      for (const s of shields) {
        if (s === tp && fall.state) continue;
        s.sw.update(dt, t);
        s.im.y = SH_Y + Math.min(0, s.hop.step(0, dt));
      }
      fall.cool -= dt;
      if (fall.state === 1) {
        // sliding down the wall: its foot kicks out, it goes over face up and lands flat with a clatter
        fall.t += dt;
        const u = clamp01(fall.t / 0.42);
        tp.im.setScale(1, 1 - 0.52 * u * u);
        tp.im.y = SH_Y + 18 * u * u;
        tp.im.x = tp.x + 6 * u;
        tp.im.rotation = Math.sin(u * Math.PI) * 0.12;
        if (u >= 1) {
          fall.state = 2;
          fall.t = 0;
          fall.sy.x = 0.48;
          fall.sy.v = -1.6;
          for (let i = 0; i < 6; i++) wallDust.spawn({ x: tp.x + (crand() - 0.5) * 50, y: SH_Y + 12, vx: (crand() - 0.5) * 60, vy: -10 - crand() * 16, life: 1.3 + crand(), r0: 5, r1: 24, a: 0.45, tint: lerpCol(0xc8b090, lightTint, 0.6), drag: 1.3, fade: 0.1 });
        }
      } else if (fall.state === 2) {
        // lying there, rocking on its rim, then (out of sight of the fight) propped up again
        fall.t += dt;
        tp.im.setScale(1, fall.sy.step(0.48, dt));
        tp.im.rotation = Math.sin(fall.t * 18) * 0.05 * Math.exp(-fall.t * 3);
        if (fall.t > 9) tp.im.setAlpha(clamp01(1 - (fall.t - 9) / 0.6));
        if (fall.t > 9.6) {
          fall.state = 3;
          fall.t = 0;
          tp.im.setScale(1, 1).setRotation(0);
          tp.im.x = tp.x;
          tp.im.y = SH_Y;
        }
      } else if (fall.state === 3) {
        fall.t += dt;
        tp.im.setAlpha(clamp01(fall.t / 0.6));
        if (fall.t > 0.6) {
          fall.state = 0;
          fall.cool = 4;
        }
      }
      cloakSw.update(dt, t * (1 + gust * 0.5));
      gust = Math.max(0, gust - dt * 0.8);

      glit.update(dt);
      spray.update(dt);
      dust.update(dt);
      embers.update(dt);
      singles.update(dt);
      streaks.update(dt);
      landDust.update(dt);
      grit.update(dt);
      wallDust.update(dt);
    },
  };
});
