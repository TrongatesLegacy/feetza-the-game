// Jotunheim Ice Fields (Stage 15, Act 8, waves 71–74), redrawn with the location kit (src/art/scene): the land of the
// frost giants, at the start of the road to Ragnarök. Night, a hard frost, the moon low on the left and the aurora up
// over the giants' range.
//
// A vast ice sheet runs off to the range's foot, every scale on it a giant's: wind-scoured glare ice, pressure ridges,
// a crevasse, and a trail of footprints long as boats crossing it to the horizon. A giant's sword is stuck in the ice
// in the middle distance, tall as a tower, rimed, a mound of shattered ice round its blade. On the left, a cliff of
// basalt columns (the giants' causeway) with a waterfall frozen solid over its lip, its tiers fringed with icicles, a
// heap of fallen ice at its foot and a giant's helm half buried in the drift; on the right, the ruin of a giant's
// gate: two rune-carved megaliths (the near one runs up out of the picture, the far one snapped off) and their
// lintel fallen in front of them, broken in two, half buried. The runes keep a faint cold light. The table is a
// slab of the same rune-carved granite, frost on its back edge.
//
// The stage's four waves run from that clear aurora night to a blizzard with a red glow on the horizon: high cloud
// comes over (wave 2), it snows under an overcast (3), and the blizzard drives across a dark sky lit red from below
// by the fire far off at the world's end (4).
//
// Live, the heroes:
// - the aurora: painted curtains (frames) folding and rippling along their length, rays running through them,
//   fading as the cloud comes over;
// - the wind and the snow: spindrift plumes streaming off the cliff's lip and the broken megalith (painted frames),
//   snow snakes streaming across the ice (painted frames), diamond dust glinting in the clear cold, snow falling in
//   depths that thickens into the blizzard, its gusts whiting out the far range;
// - the frost giants' runes breathing with cold light, flaring when a stomp shakes the ground, brighter as Ragnarök
//   nears; a stomp also shakes icicles off the frozen falls and the lintel (they fall and shatter) and sends powder
//   off the ledges.

import Phaser from 'phaser';
import { type Air, type Ctx, type PathFn, type R, TY, W, airMix, calmLanes, crevice, glowAt, gradeAll, lightPool, polyPath, vfill, vignetteAll, within } from '../../art/scene/kit';
import type { SceneSpec } from '../../art/scene/layers';
import { grain, tableFalloff, tableSeam } from '../../art/scene/materials';
import { crack, drift, lay, noiseMask, softly, streaks, surface } from '../../art/scene/paint';
import { cloud, horizonGlow, skyFill, stars } from '../../art/scene/sky';
import { ZB, xAt, yAt, zFront } from '../../art/sceneKit';
import { hashStr, makeCanvas, mix, rgba, rng } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { Loop, Parts, Rate, sheet } from '../../game/sceneAnim';
import { type KitLive, calm, lerp, registerKitScene, waveK } from '../../game/sceneLive';
import { wave1 } from './sceneBits';
import type { Pt } from './scene-rink';
import { type Summit, type View, NIGHT, massif, snowTile, topOf } from './scene-slopes';
import { icicle } from './scene-yeti';
import { RUNES } from './scenes-act8';

// ——— layout ———

export const JH = {
  front: 1040,
  /** The far range's foot: the ice sheet's horizon. */
  hor: 548,
  moon: { x: 318, y: 92, r: 24 },
  /** The aurora's frames cover the sky down to here. */
  auroraH: 380,
  /** The basalt cliff on the left: its foot, and the frozen falls' lip (x0…x1 at y). */
  cliffFoot: 700,
  lip: { x0: 200, x1: 314, y: 252 },
  /** The giant's sword stuck in the ice: where its blade goes in, its guard, its pommel. */
  sword: { x: 700, base: 616, guard: 356, pommel: 272 },
  /** The gate: the near megalith (runs out of the top), the far one (snapped off), each on its plinth. */
  p1: { x0: 1698, x1: 1892, foot: 704 },
  p2: { x0: 1384, x1: 1546, foot: 690, top: 330 },
  /** The fallen lintel's front face: its top-left and top-right corners and its height. */
  lintel: { x0: 1262, y0: 704, x1: 1688, y1: 716, h: 40 },
  helm: { x: 150, y: 746 },
};

const P2 = Math.PI * 2;
const INK = '#0a1028';
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const ease = (t: number) => t * t * (3 - 2 * t);
/** How big things are on the ice at screen y (1 at the table's back edge). */
const kAt = (y: number) => Math.max(0.1, (y - 528) / (TY - 528));
const SNOW = { lit: '#eaf2ff', body: '#b0c2e6', shade: '#6a80ba', deep: '#3a4c8a' };
const STONE = { lit: '#8a96b8', body: '#4c5674', shade: '#262c46', deep: '#121628' };
const RUNE = '#7fe8ff';
const AIR: Air = { color: '#1e3456', far: 0.82 };

// ——— the sky ———

function sky(ctx: Ctx, r: R): void {
  const box = { x: 0, y: 0, w: W, h: JH.hor };
  skyFill(ctx, box, [[0, '#02050f'], [0.32, '#061230'], [0.66, '#0f2650'], [0.88, '#18365e'], [1, '#22466a']], 0.04);
  lay(ctx, drift('#14305a', '#02050f', 3, 81, 160, 48), box, 0.22);
  // the milky way, a faint dust band falling to the right
  softly(ctx, box, (g) => {
    g.save();
    g.translate(1240, 170);
    g.rotate(0.42);
    const lg = g.createLinearGradient(0, -100, 0, 100);
    lg.addColorStop(0, 'rgba(150,170,220,0)');
    lg.addColorStop(0.5, 'rgba(150,170,220,0.13)');
    lg.addColorStop(1, 'rgba(150,170,220,0)');
    g.fillStyle = lg;
    g.fillRect(-900, -100, 1800, 200);
    g.restore();
  }, 0.25);
  stars(ctx, r, { x: 0, y: 0, w: W, h: 470 }, 420, '#eef2ff');
  for (let i = 0; i < 240; i++) {
    const u = r();
    const x = 1240 + (u - 0.5) * 1800 * Math.cos(0.42) + (r() - 0.5) * 110;
    const y = 170 + (u - 0.5) * 1800 * Math.sin(0.42) + (r() - 0.5) * 110;
    if (y < 0 || y > 460) continue;
    ctx.fillStyle = rgba('#e4ecff', 0.18 + r() * 0.3);
    ctx.fillRect(x, y, 1, 1);
  }
  // the aurora's green light over the whole sky, strongest low over the range
  glowAt(ctx, 640, 360, 900, '#2affa0', 0.055, 0.42);
  glowAt(ctx, 1380, 300, 760, '#30e0c0', 0.04, 0.42);
  horizonGlow(ctx, JH.hor - 60, 160, '#3a5c86', 0.5);
  // the range's hazy foot (the live layer bakes the range over its sky, cut at the horizon: no seam of sky there)
  vfill(ctx, 0, JH.hor - 16, W, 16, [[0, rgba('#5a78a8', 0)], [1, rgba('#6a86b4', 0.7)]]);
  // the moon, low on the left (the key light), its halo in the frost
  const { x: mx, y: my, r: mr } = JH.moon;
  glowAt(ctx, mx, my, 540, '#5a74c8', 0.22);
  glowAt(ctx, mx, my, 160, '#dfe8ff', 0.36);
  const mg = ctx.createRadialGradient(mx - mr * 0.35, my - mr * 0.35, 0, mx, my, mr);
  mg.addColorStop(0, '#fffef8');
  mg.addColorStop(0.7, '#eceee4');
  mg.addColorStop(1, '#c4c8bc');
  ctx.fillStyle = mg;
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, P2);
  ctx.fill();
  ctx.fillStyle = rgba('#9a9c8c', 0.3);
  for (const [dx, dy, rr] of [[-7, -5, 5.5], [6, 4, 4.5], [-2, 10, 3.2], [9, -7, 2.8], [-11, 5, 2.4]] as const) {
    ctx.beginPath();
    ctx.arc(mx + dx, my + dy, rr, 0, P2);
    ctx.fill();
  }
}

/** The overcast coming over (waves 2–3): stratus banks lit faintly from below by the snow, gaps closing. */
function cloudSky(ctx: Ctx, r: R): void {
  const box = { x: 0, y: 0, w: W, h: JH.hor };
  vfill(ctx, 0, 0, W, JH.hor, [[0, 'rgba(20,28,50,0.92)'], [0.5, 'rgba(36,48,78,0.78)'], [0.85, 'rgba(56,72,104,0.55)'], [1, 'rgba(70,88,120,0.4)']]);
  lay(ctx, noiseMask(10, 91, { cover: 0.5, soft: 0.6, col: '#3e4c70', w: 320, h: 96 }), box, 0.6);
  const o = { lit: '#8a9cc4', body: '#3e4c72', shadow: '#1a2240', sunX: JH.moon.x, sunY: JH.moon.y - 200, rim: 0.25, wisp: 0.6, a: 0.85, kind: 'stratus' as const };
  for (let i = 0; i < 16; i++) {
    const y = 40 + (i / 16) * 380 + r() * 30;
    cloud(ctx, r, r() * W, y, 360 + r() * 460, 30 + r() * 30, { ...o, depth: (y / JH.hor) * 0.5, a: 0.7 - (y / JH.hor) * 0.3 });
  }
}

/** The blizzard's sky (wave 4): dark, heavy, torn cloud, lit red from below at the horizon by the fire far off. */
function stormSky(ctx: Ctx, r: R): void {
  const box = { x: 0, y: 0, w: W, h: JH.hor };
  vfill(ctx, 0, 0, W, JH.hor, [[0, '#0a0c16'], [0.4, '#181c2c'], [0.72, '#2e2a3a'], [0.9, '#5a3438'], [1, '#7a3a30']]);
  lay(ctx, drift('#3a3448', '#0a0c16', 4, 93, 160, 48), box, 0.5);
  const o = { lit: '#7a6a7c', body: '#2a2a3c', shadow: '#0c0c18', sunX: 1200, sunY: JH.hor + 200, rim: 0.4, wisp: 0.7, a: 0.9, kind: 'bank' as const };
  for (let i = 0; i < 18; i++) {
    const y = 30 + (i / 18) * 440 + r() * 30;
    const low = y / JH.hor;
    cloud(ctx, r, r() * W, y, 400 + r() * 520, 40 + r() * 50, { ...o, lit: mix('#6a6478', '#e0603a', low ** 2 * 0.8), body: mix('#26283a', '#5a2c2c', low ** 2), depth: 0.2 });
  }
  // the underside of the cloud deck glowing red over the fire
  vfill(ctx, 0, JH.hor - 170, W, 170, [[0, 'rgba(160,50,30,0)'], [0.7, 'rgba(180,60,34,0.32)'], [1, 'rgba(220,90,40,0.5)']]);
  // smoke rising off the fire far beyond the range, leaning away on the gale, lit red-orange from beneath
  softly(ctx, box, (g) => {
    for (const [sx, sw] of [[1180, 1], [1310, 0.7], [520, 0.5]] as const) {
      for (let i = 0; i < 22; i++) {
        const t = i / 22;
        const x = sx + t * 260 * sw + Math.sin(t * 5 + sx) * 18;
        const y = JH.hor - 10 - t * 360 * sw;
        const rad = (24 + t * 70) * sw;
        const rg = g.createRadialGradient(x, y, 0, x, y, rad);
        const hot = (1 - t) ** 2;
        rg.addColorStop(0, `rgba(${Math.round(40 + hot * 150)},${Math.round(24 + hot * 40)},${Math.round(30 + hot * 10)},${(0.5 * (1 - t * 0.6)).toFixed(3)})`);
        rg.addColorStop(1, 'rgba(30,20,30,0)');
        g.fillStyle = rg;
        g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
    }
  }, 0.25);
}

/** The red glow of the fire at the world's end, behind the range (added in the live layer): a wide glow, and a hot
 * orange heart low on the horizon where the fire is. */
function redGlow(ctx: Ctx): void {
  glowAt(ctx, 1240, JH.hor - 20, 900, '#ff4a20', 0.3, 0.22);
  glowAt(ctx, 1240, JH.hor - 10, 360, '#ff8a3a', 0.32, 0.3);
  glowAt(ctx, 1240, JH.hor - 4, 150, '#ffb060', 0.45, 0.32);
  glowAt(ctx, 460, JH.hor - 10, 600, '#ff3a1a', 0.14, 0.2);
}

// ——— the aurora ———

interface Band {
  x0: number;
  x1: number;
  y: number;
  amp: number;
  wl: number;
  len: number;
  a: number;
  s: number;
}
const BANDS: Band[] = [
  { x0: 320, x1: 1260, y: 262, amp: 42, wl: 250, len: 196, a: 0.85, s: 0 },
  { x0: 860, x1: 1720, y: 196, amp: 32, wl: 200, len: 140, a: 0.62, s: 2.3 },
  { x0: 420, x1: 1180, y: 150, amp: 20, wl: 150, len: 80, a: 0.32, s: 5 },
];

/** A column of curtain light (made once): a pink fringe at the very bottom, a hot green edge, green rays rising,
 * violet at the top. */
let auroraCol: HTMLCanvasElement | null = null;
function auroraColumn(): HTMLCanvasElement {
  if (auroraCol) return auroraCol;
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 128;
  const g = c.getContext('2d')!;
  const lg = g.createLinearGradient(0, 0, 0, 128);
  lg.addColorStop(0, 'rgba(140,70,255,0)');
  lg.addColorStop(0.14, 'rgba(190,80,230,0.22)');
  lg.addColorStop(0.42, 'rgba(110,90,255,0.3)');
  lg.addColorStop(0.7, 'rgba(50,240,170,0.32)');
  lg.addColorStop(0.86, 'rgba(110,255,180,0.75)');
  lg.addColorStop(0.92, 'rgba(210,255,230,1)');
  lg.addColorStop(0.955, 'rgba(90,255,170,0.6)');
  lg.addColorStop(0.98, 'rgba(255,110,170,0.35)');
  lg.addColorStop(1, 'rgba(255,90,160,0)');
  g.fillStyle = lg;
  g.fillRect(0, 0, 4, 128);
  auroraCol = c;
  return c;
}

/** The middle of the sky (where the feet hover) is kept quieter. */
const calmMid = (x: number) => 1 - 0.6 * Math.exp(-(((x - 960) / 360) ** 2));

/** The aurora at phase ph (0…1 loops): folded curtains whose folds travel along them, rays running through. */
function aurora(c: Ctx, ph: number): void {
  const T = P2 * ph;
  const col = auroraColumn();
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (const b of BANDS) {
    for (let x = b.x0; x < b.x1; x += 3) {
      const u = (x - b.x0) / (b.x1 - b.x0);
      const env = Math.sin(u * Math.PI) ** 0.8 * calmMid(x);
      const y = b.y + Math.sin(x / b.wl + b.s + Math.sin(T) * 0.6) * b.amp + Math.sin(x / (b.wl * 0.37) - T + b.s * 2) * b.amp * 0.24;
      const ray = 0.35 + 0.65 * Math.max(0, Math.sin(x / 7 + T * 3 + b.s) * 0.6 + Math.sin(x / 19 - T * 2 + b.s) * 0.5);
      const L = b.len * (0.6 + 0.4 * Math.sin(x / 61 + T + b.s * 3)) * (0.8 + ray * 0.3);
      const fold = 1 + 0.7 * Math.max(0, Math.cos(x / b.wl + b.s + Math.sin(T) * 0.6)) ** 6;
      c.globalAlpha = clamp01(b.a * env * ray * fold * 0.6);
      c.drawImage(col, x - 1.5, y - L, 6, L + 10);
      c.globalAlpha *= 0.35;
      c.drawImage(col, x - 6, y - L * 1.25, 15, L * 1.25 + 14);
    }
  }
  c.restore();
}

// ——— the far range ———

const FAR_VIEW: View = { ...NIGHT, air: AIR, lit: '#c6d8f2', shade: '#2e4470', rock: '#121a32', far: '#2a3e68' };
const HIGHS: Summit[] = [
  [150, 170, 250, 190, 1.3],
  [560, 140, 200, 230, 1.25],
  [1020, 206, 260, 200, 1.35],
  [1420, 160, 210, 210, 1.2],
  [1800, 196, 230, 200, 1.3],
];
const LOWS: Summit[] = [
  [330, 84, 180, 150, 1.1],
  [820, 70, 160, 170, 1],
  [1230, 96, 190, 160, 1.15],
  [1640, 78, 170, 160, 1.05],
];
const highTop = topOf(HIGHS, JH.hor - 14, 40, 17);
const lowTop = topOf(LOWS, JH.hor, 18, 23);

function farRange(ctx: Ctx, r: R): void {
  massif(ctx, r, highTop, JH.hor - 14, HIGHS, { ...FAR_VIEW, lit: mix(FAR_VIEW.lit, FAR_VIEW.far, 0.35), shade: mix(FAR_VIEW.shade, '#1e3058', 0.3) }, 0.82, 0.7);
  // glaciers pouring down between the high peaks: pale tongues in the shade
  for (const x of [360, 790, 1230, 1610]) {
    const y0 = highTop(x) + 20;
    const lg = ctx.createLinearGradient(0, y0, 0, JH.hor);
    lg.addColorStop(0, rgba('#8aa4d4', 0));
    lg.addColorStop(0.4, rgba('#8aa4d4', 0.28));
    lg.addColorStop(1, rgba('#9ab4e0', 0.4));
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(x - 10, y0);
    ctx.quadraticCurveTo(x - 30, (y0 + JH.hor) / 2, x - 70, JH.hor);
    ctx.lineTo(x + 70, JH.hor);
    ctx.quadraticCurveTo(x + 24, (y0 + JH.hor) / 2, x + 10, y0);
    ctx.closePath();
    ctx.fill();
  }
  massif(ctx, r, lowTop, JH.hor, LOWS, { ...FAR_VIEW, lit: mix(FAR_VIEW.lit, '#9ab0dc', 0.2) }, 0.6, 0.55);
  // the cold air lying on the ice at the range's foot
  vfill(ctx, 0, JH.hor - 70, W, 74, [[0, rgba('#5a7aa8', 0)], [1, rgba('#6a86b4', 0.6)]]);
}

/** The blizzard whiting out the far range (live only). */
function farHaze(ctx: Ctx): void {
  vfill(ctx, 0, 260, W, JH.hor - 260 + 120, [[0, 'rgba(120,128,150,0)'], [0.45, 'rgba(126,132,152,0.55)'], [0.75, 'rgba(140,144,162,0.85)'], [1, 'rgba(140,144,162,0)']]);
  softly(ctx, { x: 0, y: 260, w: W, h: 400 }, (g) => {
    const rr = rng(hashStr('jh:haze'));
    for (let i = 0; i < 26; i++) {
      g.fillStyle = `rgba(170,176,196,${(0.15 + rr() * 0.2).toFixed(3)})`;
      g.beginPath();
      g.ellipse(rr() * W, 380 + rr() * 200, 200 + rr() * 300, 30 + rr() * 40, 0, 0, P2);
      g.fill();
    }
  }, 0.25);
}

// ——— the ice sheet ———

/** The ice sheet runs dead flat to the horizon (exactly where the sky and the range stop). */
const plainTop = (_x: number): number => JH.hor;

function footprint(ctx: Ctx, x: number, y: number, k: number, ang: number, left: boolean): void {
  // a frost giant's bare print, sunk deep in the crust and seen low across the ice: a sole (narrow heel, an arch
  // pinched in on the inner side, a broad ball) with five toe pits fanned ahead of it, the snow shoved up in a rim
  // round it; the far inner wall in shadow, the near one and the floor catching the moon
  const L = 58 * k;
  const sq = 0.3;
  const side = left ? 1 : -1;
  const sole = (c: Ctx, grow: number) => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 28; i++) {
      const t = (i / 28) * P2;
      const u = Math.cos(t);
      // the width along the foot: heel 0.3, arch 0.24 (pinched on the inner side), ball 0.42
      const wAt = 0.3 + 0.12 * Math.max(0, u) ** 0.8 - (Math.sin(t) * side > 0 ? 0.08 * Math.exp(-(((u + 0.1) / 0.3) ** 2)) : 0);
      pts.push([u * L * 0.6 + grow * u, Math.sin(t) * L * wAt * sq * 2 + grow * Math.sin(t) * sq]);
    }
    c.beginPath();
    pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
    c.closePath();
  };
  const toes: [number, number, number][] = [];
  for (let t = 0; t < 5; t++) {
    const fan = (t - 2) * side;
    const big = t === (left ? 0 : 4) ? 1.35 : 1;
    toes.push([L * 0.72 - Math.abs(t - (left ? 0 : 4)) * L * 0.035, fan * L * 0.075 * sq * 2.2, L * 0.075 * big]);
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  // the rim of snow shoved up round it, lit
  ctx.fillStyle = rgba(SNOW.lit, 0.4);
  sole(ctx, 7 * k);
  ctx.fill();
  for (const [tx, ty, tr] of toes) {
    ctx.beginPath();
    ctx.ellipse(tx, ty, tr + 4 * k, (tr + 4 * k) * sq * 1.4, 0, 0, P2);
    ctx.fill();
  }
  // the hollows
  ctx.save();
  sole(ctx, 0);
  for (const [tx, ty, tr] of toes) {
    ctx.moveTo(tx + tr, ty);
    ctx.ellipse(tx, ty, tr, tr * sq * 1.4, 0, 0, P2);
  }
  ctx.fillStyle = rgba('#2a3a7a', 0.62);
  ctx.fill('nonzero');
  ctx.clip('nonzero');
  // the floor and the near wall catching a little light; the far wall stays dark
  ctx.fillStyle = rgba('#9cb2e2', 0.42);
  ctx.save();
  ctx.translate(0, L * 0.06);
  sole(ctx, -2 * k);
  ctx.fill();
  ctx.restore();
  ctx.restore();
  ctx.restore();
}

/** The giants' trail: in from behind the gate on the right, across the ice and away to the horizon on the left. */
function trail(t: number): [number, number, number] {
  const p0: Pt = [1340, 744];
  const p1: Pt = [1060, 640];
  const p2: Pt = [430, 572];
  const u = 1 - t;
  const x = u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0];
  const y = u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1];
  const dx = 2 * u * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]);
  const dy = 2 * u * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
  return [x, y, Math.atan2(dy * 0.45, dx)];
}

function plain(ctx: Ctx, r: R): void {
  const path: PathFn = (c) => {
    c.beginPath();
    c.moveTo(-4, TY + 10);
    for (let x = -4; x <= W + 4; x += 6) c.lineTo(x, plainTop(x));
    c.lineTo(W + 4, TY + 10);
    c.closePath();
  };
  path(ctx);
  ctx.fillStyle = SNOW.body;
  ctx.fill();
  within(ctx, path, () => {
    const box = { x: 0, y: JH.hor - 4, w: W, h: TY - JH.hor + 14 };
    vfill(ctx, 0, box.y, W, box.h, [[0, '#6a84b4'], [0.1, '#7690c4'], [0.5, '#8ea6d6'], [1, '#a2b6e0']]);
    surface(ctx, r, box, '#8ca2d2', { over: true, vary: 0.3, cells: 6, mottle: 0.25, strokes: 0.5, strokeAng: 0.02, strokeLen: 280, strokeW: 2, grain: 0.1, seed: 33 });
    // the moon's light from the left; the right darker, in the gate's lee
    const lg = ctx.createLinearGradient(0, 0, W, 0);
    lg.addColorStop(0, 'rgba(232,238,255,0.14)');
    lg.addColorStop(0.45, 'rgba(232,238,255,0.02)');
    lg.addColorStop(0.8, 'rgba(16,24,64,0.1)');
    lg.addColorStop(1, 'rgba(16,24,64,0.28)');
    ctx.fillStyle = lg;
    ctx.fillRect(0, box.y, W, box.h);
    // glare ice: the wind has scoured the snow off in long sheets, the ice dark and polished, the sky and the aurora's
    // green in it, a hard white edge where the snow begins again
    for (let i = 0; i < 26; i++) {
      const y = JH.hor + 6 + r() ** 1.5 * 170;
      const k = kAt(y);
      const x = r() * (W + 200) - 100;
      if (x > 560 && x < 840 && y < 630) continue;
      const len = (120 + r() * 420) * (0.4 + k);
      const h = (3 + r() * 9) * k;
      const sheetPath: PathFn = (c) => {
        c.beginPath();
        c.moveTo(x, y);
        c.bezierCurveTo(x + len * 0.3, y - h, x + len * 0.7, y - h * 0.8, x + len, y + h * 0.2);
        c.bezierCurveTo(x + len * 0.7, y + h * 1.2, x + len * 0.3, y + h, x, y);
        c.closePath();
      };
      sheetPath(ctx);
      const ig = ctx.createLinearGradient(0, y - h, 0, y + h);
      ig.addColorStop(0, '#2e4c8a');
      ig.addColorStop(0.5, '#3c64a4');
      ig.addColorStop(1, '#4e78b4');
      ctx.fillStyle = ig;
      ctx.globalAlpha = 0.75;
      ctx.fill();
      ctx.globalAlpha = 1;
      within(ctx, sheetPath, () => {
        // the aurora's green and the sky's light lying in the polish
        ctx.fillStyle = rgba('#5affc0', 0.1);
        ctx.fillRect(x + len * 0.2, y - h, len * 0.5, h * 0.8);
        ctx.strokeStyle = rgba('#d8ecff', 0.35);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + len * 0.1, y - h * 0.2);
        ctx.lineTo(x + len * 0.8, y - h * 0.4);
        ctx.stroke();
      });
      ctx.strokeStyle = rgba(SNOW.lit, 0.5);
      ctx.lineWidth = Math.max(0.8, 1.4 * k);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + len * 0.3, y - h, x + len * 0.7, y - h * 0.8, x + len, y + h * 0.2);
      ctx.stroke();
    }
    // wind ripples
    for (let i = 0; i < 80; i++) {
      const y = JH.hor + 4 + (i / 80) ** 1.5 * (TY - JH.hor);
      const k = kAt(y);
      const x0 = r() * W - 200;
      const len = 200 + r() * 520;
      ctx.strokeStyle = rgba(i % 2 ? SNOW.lit : SNOW.shade, 0.1 + r() * 0.1);
      ctx.lineWidth = 0.7 + k;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.bezierCurveTo(x0 + len * 0.3, y - 3 * k, x0 + len * 0.7, y + 3 * k, x0 + len, y + r() * 4);
      ctx.stroke();
    }
    // sastrugi: wind-carved ridges, windward (left) faces lit, a shadow tucked under on the lee
    for (let i = 0; i < 120; i++) {
      const y = JH.hor + 10 + r() ** 0.9 * (TY - JH.hor - 14);
      const k = kAt(y);
      const x = r() * (W + 100) - 50;
      const len = (30 + r() * 110) * k;
      const h = (3 + r() * 6) * k;
      ctx.fillStyle = rgba('#34488a', 0.38);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + len * 0.6, y + h * 0.2, x + len, y + h * 0.9);
      ctx.quadraticCurveTo(x + len * 0.5, y + h * 1.3, x + len * 0.05, y + h * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba(SNOW.lit, 0.58);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + len * 0.4, y - h, x + len, y + h * 0.9);
      ctx.quadraticCurveTo(x + len * 0.55, y + h * 0.1, x, y);
      ctx.closePath();
      ctx.fill();
    }
    // a pressure ridge out on the sheet: where two floes ground together, slabs of ice shoved up on edge and leaning
    // on each other, biggest in the middle of the ridge, snow drifted along its windward foot, its lee in shadow
    {
      const slabs: [number, number, number, number, number][] = [];
      for (let i = 0; i < 9; i++) {
        const u = (i + r() * 0.8) / 9;
        const x = 1070 + u * 170 + (r() - 0.5) * 20;
        const y = 606 + (r() - 0.5) * 10;
        const k = kAt(y);
        const env = 0.45 + 0.55 * Math.sin(u * Math.PI) ** 0.6;
        slabs.push([x, y, (10 + r() * 22) * env * k * 2.2, (16 + r() * 22) * k * 1.6, (r() - 0.5) * 0.9]);
      }
      slabs.sort((a, b) => a[1] - b[1]);
      // the lee shadow and the drift along the foot
      ctx.fillStyle = rgba('#2a3e7a', 0.28);
      ctx.beginPath();
      ctx.moveTo(1060, 608);
      ctx.quadraticCurveTo(1160, 618, 1270, 610);
      ctx.quadraticCurveTo(1160, 628, 1066, 614);
      ctx.closePath();
      ctx.fill();
      for (const [x, y, h, w, lean] of slabs) {
        const tip: Pt = [x + lean * h * 0.8, y - h];
        const pts: Pt[] = [[x - w / 2, y], [x - w * 0.42 + lean * h * 0.6, y - h * 0.75], tip, [x + w * 0.4 + lean * h * 0.7, y - h * 0.62], [x + w / 2, y]];
        const path = polyPath(pts);
        path(ctx);
        const sg = ctx.createLinearGradient(x - w / 2, y - h, x + w / 2, y);
        sg.addColorStop(0, '#dcecff');
        sg.addColorStop(0.4, '#8eb2e2');
        sg.addColorStop(1, '#2e4c8c');
        ctx.fillStyle = sg;
        ctx.fill();
        // its broken edge: the face turned from the moon darker, a glint along the top
        ctx.fillStyle = rgba('#1c3474', 0.35);
        ctx.beginPath();
        ctx.moveTo(tip[0], tip[1]);
        ctx.lineTo(x + w * 0.4 + lean * h * 0.7, y - h * 0.62);
        ctx.lineTo(x + w / 2, y);
        ctx.lineTo(x + w * 0.05, y);
        ctx.closePath();
        ctx.fill();
        path(ctx);
        ctx.strokeStyle = rgba(INK, 0.55);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.strokeStyle = rgba('#ffffff', 0.7);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - w * 0.42 + lean * h * 0.6, y - h * 0.75);
        ctx.lineTo(tip[0], tip[1]);
        ctx.stroke();
        // snow heaped at its windward foot
        ctx.fillStyle = rgba(SNOW.lit, 0.85);
        ctx.beginPath();
        ctx.ellipse(x - w * 0.35, y - 1, w * 0.45, Math.max(1.5, h * 0.12), 0, Math.PI, 0);
        ctx.fill();
      }
    }
    // the crevasse: a crack across the sheet, the far wall's blue ice going dark with depth, the far lip catching
    // the moon, the near lip rounded over in shade
    const cy = (x: number) => 666 + (x - 980) * 0.04 + Math.sin(x / 40) * 2 + Math.sin(x / 13) * 0.8;
    const cw = (x: number) => Math.max(0, Math.sin(((x - 960) / 330) * Math.PI)) ** 0.6 * (12 + Math.sin(x / 23) * 3);
    ctx.beginPath();
    for (let x = 960; x <= 1290; x += 3) ctx.lineTo(x, cy(x));
    for (let x = 1290; x >= 960; x -= 3) ctx.lineTo(x, cy(x) + cw(x));
    ctx.closePath();
    const cg = ctx.createLinearGradient(0, 662, 0, 690);
    cg.addColorStop(0, '#9cc8f4');
    cg.addColorStop(0.35, '#4a7cc4');
    cg.addColorStop(0.75, '#16306e');
    cg.addColorStop(1, '#081438');
    ctx.fillStyle = cg;
    ctx.fill();
    for (let x = 972; x < 1280; x += 7 + r() * 9) {
      ctx.strokeStyle = rgba('#d4ecff', 0.32);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, cy(x) + 2);
      ctx.lineTo(x + 1, cy(x) + cw(x) * (0.4 + r() * 0.4));
      ctx.stroke();
    }
    ctx.fillStyle = SNOW.lit;
    ctx.beginPath();
    for (let x = 956; x <= 1294; x += 3) ctx.lineTo(x, cy(x) - 2.2 - Math.abs(Math.sin(x / 17)) * 1.4);
    for (let x = 1294; x >= 956; x -= 3) ctx.lineTo(x, cy(x) + 1.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba('#3a4c8a', 0.7);
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let x = 964; x <= 1286; x += 3) ctx.lineTo(x, cy(x) + cw(x) + 1);
    ctx.stroke();
    // far ice blocks strewn along the horizon
    for (let i = 0; i < 22; i++) {
      const x = r() * W;
      const y = JH.hor + 2 + r() * 14;
      const k = kAt(y);
      const s = (6 + r() * 12) * Math.max(0.3, k);
      ctx.fillStyle = rgba('#30467e', 0.4);
      ctx.fillRect(x, y, s * 1.6, 1.5);
      ctx.fillStyle = airMix('#9ab8e4', 0.5, AIR);
      ctx.beginPath();
      ctx.moveTo(x - s * 0.5, y);
      ctx.lineTo(x - s * 0.3, y - s);
      ctx.lineTo(x + s * 0.4, y - s * 0.8);
      ctx.lineTo(x + s * 0.6, y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = airMix('#4a68a4', 0.5, AIR);
      ctx.beginPath();
      ctx.moveTo(x + s * 0.05, y - s * 0.92);
      ctx.lineTo(x + s * 0.4, y - s * 0.8);
      ctx.lineTo(x + s * 0.6, y);
      ctx.lineTo(x + s * 0.1, y);
      ctx.closePath();
      ctx.fill();
    }
    // the giants' footprints, from the gate away to the horizon
    for (let i = 0; i < 12; i++) {
      const t = 0.03 + (i / 11) * 0.94;
      const [x, y, a] = trail(t);
      const k = kAt(y) * 1.05;
      const side = i % 2 ? 1 : -1;
      footprint(ctx, x + side * 4 * k, y + side * 9 * k, k, a, side > 0);
    }
    // the far ice darker under the range, out of the moon's reach
    vfill(ctx, 0, JH.hor - 4, W, 40, [[0, 'rgba(26,40,90,0.3)'], [1, 'rgba(26,40,90,0)']]);
  });
  ctx.strokeStyle = rgba(SNOW.lit, 0.45);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 6) ctx.lineTo(x, plainTop(x) + 1);
  ctx.stroke();
}

// ——— the giant's sword ———

function sword(ctx: Ctx, r: R): void {
  const { x, base, guard, pommel } = JH.sword;
  const d = 0.42;
  const air = (c: string, dd = d) => airMix(c, dd, AIR);
  const lean = -0.05;
  const X = (y: number) => x + (base - y) * Math.tan(lean);
  // its moon shadow down the ice to the right, from under the mound, fading as it goes
  softly(ctx, { x: x - 30, y: base - 20, w: 360, h: 70 }, (g) => {
    const sg = g.createLinearGradient(x, 0, x + 300, 0);
    sg.addColorStop(0, 'rgba(18,28,80,0.4)');
    sg.addColorStop(1, 'rgba(18,28,80,0)');
    g.fillStyle = sg;
    g.beginPath();
    g.moveTo(x - 10, base);
    g.lineTo(x + 290, base + 18);
    g.lineTo(x + 294, base + 24);
    g.lineTo(x + 10, base + 8);
    g.closePath();
    g.fill();
  }, 0.3);
  ctx.save();
  // the blade: blackened giant's iron, a fuller down its middle, frost on its edges, a notch knocked out of one
  const bw0 = 28;
  const bw1 = 24;
  const blade: PathFn = (c) => {
    c.beginPath();
    c.moveTo(X(guard) - bw0, guard);
    c.lineTo(X(base) - bw1, base + 4);
    c.lineTo(X(base) + bw1, base + 4);
    c.lineTo(X(470) + bw0 - 2, 470);
    c.lineTo(X(462) + bw0 - 9, 462);
    c.lineTo(X(452) + bw0 - 2, 452);
    c.lineTo(X(guard) + bw0, guard);
    c.closePath();
  };
  blade(ctx);
  ctx.fillStyle = air('#3a4260');
  ctx.fill();
  within(ctx, blade, () => {
    const g = ctx.createLinearGradient(X(450) - bw0, 0, X(450) + bw0, 0);
    // steel, not stone: a hard bright bevel on the edge turned to the moon, the flat dark and blue, a cold
    // reflection of the sky sliding down the far bevel
    g.addColorStop(0, '#eef4ff');
    g.addColorStop(0.08, '#b4c4e8');
    g.addColorStop(0.16, '#56688e');
    g.addColorStop(0.5, '#2a3456');
    g.addColorStop(0.62, '#4a5c88');
    g.addColorStop(0.84, '#8496c4');
    g.addColorStop(0.9, '#2a3252');
    g.addColorStop(1, '#141a32');
    ctx.fillStyle = g;
    ctx.fillRect(x - 80, guard, 160, base - guard + 8);
    // the sky's light sliding down the steel in long soft bands
    const vg = ctx.createLinearGradient(0, guard, 0, base);
    vg.addColorStop(0, 'rgba(200,220,255,0.18)');
    vg.addColorStop(0.35, 'rgba(200,220,255,0)');
    vg.addColorStop(0.6, 'rgba(120,255,200,0.07)');
    vg.addColorStop(1, 'rgba(200,220,255,0)');
    ctx.fillStyle = vg;
    ctx.fillRect(x - 80, guard, 160, base - guard + 8);
    // the fuller
    ctx.strokeStyle = air('#161a30');
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(X(guard + 6) + 1, guard + 6);
    ctx.lineTo(X(base - 20) + 1, base - 20);
    ctx.stroke();
    ctx.strokeStyle = rgba(air('#8a98c4'), 0.6);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(X(guard + 6) + 4.5, guard + 6);
    ctx.lineTo(X(base - 20) + 4.5, base - 20);
    ctx.stroke();
    // rust-dark patches and frost bloom
    lay(ctx, noiseMask(6, 111, { cover: 0.4, soft: 0.5, col: '#1a1c2a', w: 64, h: 160 }), { x: x - 30, y: guard, w: 60, h: base - guard }, 0.3);
    lay(ctx, noiseMask(8, 113, { cover: 0.3, soft: 0.5, col: '#d8e8ff', w: 64, h: 160 }), { x: x - 30, y: guard, w: 60, h: base - guard }, 0.2);
    // runes etched down the blade, a faint cold light in them
    for (let i = 0; i < 4; i++) {
      const yy = guard + 30 + i * 34;
      carvedRune(ctx, i * 3 + 2, X(yy) - 7, yy, 22, 0.5, 0.45);
    }
  });
  blade(ctx);
  ctx.strokeStyle = air(INK, 0.3);
  ctx.lineWidth = 2;
  ctx.stroke();
  // the moon along its left edge
  ctx.strokeStyle = rgba('#ffffff', 0.9);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(X(guard + 4) - bw0 + 1.5, guard + 4);
  ctx.lineTo(X(base) - bw1 + 1.5, base);
  ctx.stroke();
  // the grip: leather bound in a spiral, frozen stiff
  const gTop = pommel + 34;
  const grip: PathFn = (c) => {
    c.beginPath();
    c.moveTo(X(gTop) - 11, gTop);
    c.lineTo(X(guard) - 13, guard - 10);
    c.lineTo(X(guard) + 13, guard - 10);
    c.lineTo(X(gTop) + 11, gTop);
    c.closePath();
  };
  grip(ctx);
  const gg = ctx.createLinearGradient(X(gTop) - 12, 0, X(gTop) + 12, 0);
  gg.addColorStop(0, air('#7a6250'));
  gg.addColorStop(0.4, air('#4a3428'));
  gg.addColorStop(1, air('#1e1410'));
  ctx.fillStyle = gg;
  ctx.fill();
  within(ctx, grip, () => {
    for (let y = gTop; y < guard; y += 7) {
      ctx.strokeStyle = rgba('#140c08', 0.6);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(X(y) - 14, y + 4);
      ctx.lineTo(X(y) + 14, y - 2);
      ctx.stroke();
      ctx.strokeStyle = rgba('#d8e4ff', 0.25);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(X(y) - 14, y + 2);
      ctx.lineTo(X(y) - 4, y);
      ctx.stroke();
    }
  });
  grip(ctx);
  ctx.strokeStyle = air(INK, 0.3);
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // the guard: a heavy straight bar, its ends flared, snow along its top, icicles under it
  const gy = guard - 12;
  const guardPath: PathFn = (c) => {
    c.beginPath();
    c.moveTo(X(gy) - 88, gy - 6);
    c.quadraticCurveTo(X(gy) - 44, gy - 2, X(gy), gy - 3);
    c.quadraticCurveTo(X(gy) + 44, gy - 4, X(gy) + 84, gy - 9);
    c.lineTo(X(gy) + 88, gy + 12);
    c.quadraticCurveTo(X(gy) + 44, gy + 14, X(gy), gy + 15);
    c.quadraticCurveTo(X(gy) - 44, gy + 16, X(gy) - 86, gy + 16);
    c.closePath();
  };
  guardPath(ctx);
  const gd = ctx.createLinearGradient(0, gy - 8, 0, gy + 16);
  gd.addColorStop(0, air('#9aa8cc'));
  gd.addColorStop(0.4, air('#4a5478'));
  gd.addColorStop(1, air('#1c2240'));
  ctx.fillStyle = gd;
  ctx.fill();
  within(ctx, guardPath, () => {
    lay(ctx, noiseMask(6, 117, { cover: 0.4, soft: 0.5, col: '#141828', w: 160, h: 24 }), { x: X(gy) - 92, y: gy - 10, w: 184, h: 28 }, 0.35);
    for (const i of [0, 1, 4, 5]) carvedRune(ctx, i * 2 + 1, X(gy) - 72 + i * 26, gy - 1, 13, 0.4, 0.35);
  });
  guardPath(ctx);
  ctx.strokeStyle = air(INK, 0.3);
  ctx.lineWidth = 2;
  ctx.stroke();
  snowCap(ctx, r, X(gy) - 86, X(gy) + 82, (u) => gy - 5 - Math.sin(u * Math.PI) * 1.5 + (u > 0.5 ? -(u - 0.5) * 8 : 0), 5, d);
  const ir = rng(hashStr('jh:guard-icicles'));
  for (let xx = X(gy) - 80; xx < X(gy) + 80; xx += 7 + ir() * 9) {
    if (Math.abs(xx - X(gy)) < 16) continue;
    icicle(ctx, xx, gy + 15, 6 + ir() * 20, 3 + ir() * 3, 0.85);
  }
  // the pommel: three lobes, a frost cap
  const py = pommel;
  const pPath: PathFn = (c) => {
    c.beginPath();
    const px = X(py + 20);
    c.moveTo(px - 30, py + 36);
    c.quadraticCurveTo(px - 38, py + 18, px - 22, py + 10);
    c.quadraticCurveTo(px - 16, py - 4, px - 4, py + 2);
    c.quadraticCurveTo(px + 2, py - 10, px + 10, py + 2);
    c.quadraticCurveTo(px + 22, py - 4, px + 26, py + 10);
    c.quadraticCurveTo(px + 40, py + 18, px + 30, py + 36);
    c.closePath();
  };
  pPath(ctx);
  const pg = ctx.createRadialGradient(X(py) - 14, py + 6, 2, X(py), py + 20, 44);
  pg.addColorStop(0, air('#c4cee6'));
  pg.addColorStop(0.5, air('#56607e'));
  pg.addColorStop(1, air('#1a2038'));
  ctx.fillStyle = pg;
  ctx.fill();
  ctx.strokeStyle = air(INK, 0.3);
  ctx.lineWidth = 2;
  ctx.stroke();
  snowCap(ctx, r, X(py + 20) - 24, X(py + 20) + 22, (u) => py + 6 - Math.sin(u * Math.PI) * 6, 4, d);
  ctx.restore();
  // the ice shattered round it where it went in: a mound of broken plates and drifted snow
  const my = base + 2;
  for (let i = 0; i < 22; i++) {
    const a = (r() - 0.5) * Math.PI;
    const dist = 20 + r() * 80;
    const px = x + Math.sin(a) * dist * 1.6;
    const pyy = my - 2 + Math.cos(a) * dist * 0.08 + r() * 6;
    const s = 5 + r() * 12;
    const tilt = (r() - 0.5) * 1.2 + Math.sin(a) * 0.6;
    ctx.save();
    ctx.translate(px, pyy);
    ctx.rotate(tilt);
    ctx.beginPath();
    ctx.moveTo(-s, 0);
    ctx.lineTo(-s * 0.6, -s * 0.9);
    ctx.lineTo(s * 0.7, -s * 0.7);
    ctx.lineTo(s, 0);
    ctx.closePath();
    const sg = ctx.createLinearGradient(-s, -s, s, 0);
    sg.addColorStop(0, '#d8ecff');
    sg.addColorStop(0.5, '#7aa4d8');
    sg.addColorStop(1, '#2a4884');
    ctx.fillStyle = sg;
    ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.4);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = SNOW.body;
  ctx.beginPath();
  ctx.moveTo(x - 110, my + 8);
  ctx.quadraticCurveTo(x - 60, my - 16, x - 18, my - 12);
  ctx.lineTo(x + 18, my - 12);
  ctx.quadraticCurveTo(x + 70, my - 10, x + 120, my + 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgba(SNOW.lit, 0.85);
  ctx.beginPath();
  ctx.moveTo(x - 104, my + 6);
  ctx.quadraticCurveTo(x - 60, my - 16, x - 20, my - 11);
  ctx.quadraticCurveTo(x - 60, my - 6, x - 104, my + 6);
  ctx.fill();
  crevice(ctx, x - 20, x + 20, my - 12, 6, 0.4, '#101a40');
  // cracks run out across the sheet from it
  for (let i = 0; i < 3; i++) crack(ctx, r, x + 20 + r() * 50, my + 4, 0.05 + (r() - 0.5) * 0.25, 40 + r() * 60, { col: '#1a2c64', lip: '#e8f4ff', w: 1.2, a: 0.4, branch: 0.1 });
}

/** A cap of snow along a top edge (y(u) for u 0…1 between x0 and x1), lit on top, its depth d through the air. */
function snowCap(ctx: Ctx, r: R, x0: number, x1: number, y: (u: number) => number, th: number, d = 0): void {
  const n = Math.max(6, Math.round((x1 - x0) / 8));
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    ctx.lineTo(lerp(x0, x1, u), y(u) - th * (0.6 + 0.4 * Math.sin(u * Math.PI)) - r() * th * 0.25);
  }
  for (let i = n; i >= 0; i--) {
    const u = i / n;
    ctx.lineTo(lerp(x0, x1, u), y(u) + th * 0.35);
  }
  ctx.closePath();
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, airMix(SNOW.lit, d, AIR));
  g.addColorStop(0.7, airMix('#c8d6f2', d, AIR));
  g.addColorStop(1, airMix(SNOW.shade, d, AIR));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.5 * (1 - d));
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

/** A rune cut into stone or iron: the cut in shadow on its upper-left wall, its lower-right lip catching the light,
 * a cold inlay glowing faintly in it. s is its height; glow 0…1. */
function carvedRune(ctx: Ctx, k: number, x: number, y: number, s: number, glow: number, a = 1): void {
  const strokes = RUNES[((k % RUNES.length) + RUNES.length) % RUNES.length];
  const path = (dx: number, dy: number) => {
    ctx.beginPath();
    for (const [x0, y0, x1, y1] of strokes) {
      ctx.moveTo(x + x0 * s * 0.6 + dx, y + y0 * s + dy);
      ctx.lineTo(x + x1 * s * 0.6 + dx, y + y1 * s + dy);
    }
  };
  ctx.save();
  ctx.lineCap = 'round';
  const w = Math.max(1.6, s * 0.13);
  path(0.8, 1);
  ctx.strokeStyle = rgba('#c8d4f0', 0.35 * a);
  ctx.lineWidth = w;
  ctx.stroke();
  path(0, 0);
  ctx.strokeStyle = rgba('#080a16', 0.8 * a);
  ctx.lineWidth = w;
  ctx.stroke();
  if (glow > 0) {
    path(0.3, 0.3);
    ctx.strokeStyle = rgba(RUNE, glow * a);
    ctx.lineWidth = w * 0.45;
    ctx.stroke();
  }
  ctx.restore();
}

// ——— the basalt cliff and the frozen falls ———

/** The cliff's columns: x0, x1, top (the falls' notch is columns 5…7). */
const COLS: [number, number, number][] = (() => {
  const out: [number, number, number][] = [];
  const tops = [168, 150, 178, 160, 198, 252, 254, 250, 214, 200, 232, 282, 352, 452, 560, 636];
  const xs = [-12, 40, 78, 118, 160, 198, 238, 276, 316, 352, 392, 426, 458, 486, 512, 536, 560];
  for (let i = 0; i < tops.length; i++) out.push([xs[i], xs[i + 1], tops[i]]);
  return out;
})();
const cliffPath: PathFn = (c) => {
  c.beginPath();
  c.moveTo(-12, JH.cliffFoot + 8);
  for (const [i, [x0, x1, t]] of COLS.entries()) {
    const tl = t + (i % 3) * 3;
    c.lineTo(x0, tl + 4);
    c.lineTo(x0 + 4, tl);
    c.lineTo(x1 - 6, t - 3);
    c.lineTo(x1, t + 3);
  }
  c.lineTo(570, JH.cliffFoot + 8);
  c.closePath();
};


/** The falls' edges at y (left, right): it spreads as it falls, bellying out on the left, stepping on the right. */
const fallL = (y: number) => {
  const t = clamp01((y - JH.lip.y) / (JH.cliffFoot - JH.lip.y));
  return JH.lip.x0 - 2 - 72 * t ** 1.3 - 18 * Math.sin(t * Math.PI) + Math.sin(y / 40) * 3;
};
const fallR = (y: number) => {
  const t = clamp01((y - JH.lip.y) / (JH.cliffFoot - JH.lip.y));
  return JH.lip.x1 + 2 + 92 * t ** 1.2 + 10 * Math.sin(t * P2) + Math.sin(y / 33 + 1) * 3;
};
const fallsPath: PathFn = (c) => {
  c.beginPath();
  const { y } = JH.lip;
  c.moveTo(fallL(y), y);
  c.lineTo(fallR(y), y);
  for (let yy = y + 10; yy <= JH.cliffFoot; yy += 10) c.lineTo(fallR(yy), yy);
  for (let yy = JH.cliffFoot; yy >= y + 10; yy -= 10) c.lineTo(fallL(yy), yy);
  c.closePath();
};

/** The falls' curtains: columns of candle ice, each where a strand of the water froze, swelling into lobes where it
 * piled up over a ledge, ending in a fringe of icicles. Back to front. */
interface Curtain {
  u: number;
  w: number;
  bottom: number;
  lobes: number[];
  back: boolean;
}
const CURTAINS: Curtain[] = (() => {
  const rr = rng(hashStr('jh:curtains'));
  const out: Curtain[] = [];
  for (let pass = 0; pass < 2; pass++) {
    const n = pass ? 7 : 6;
    for (let i = 0; i < n; i++) {
      const u = (i + (pass ? 0.5 : 0.1) + (rr() - 0.5) * 0.4) / n;
      const lobes: number[] = [];
      for (let y = JH.lip.y + 50 + rr() * 60; y < JH.cliffFoot - 60; y += 70 + rr() * 90) lobes.push(y);
      out.push({ u, w: 0.9 + rr() * 0.8, bottom: JH.cliffFoot - (pass ? rr() * 150 : 0), lobes, back: !pass });
    }
  }
  return out;
})();
const curtainX = (c: Curtain, y: number) => lerp(fallL(y), fallR(y), c.u) + Math.sin(y / 70 + c.u * 9) * 4;
const curtainHW = (c: Curtain, y: number) => {
  const base = ((fallR(y) - fallL(y)) / 7) * c.w * 0.5;
  // a drip ledge: swelling slowly to the lobe, then cut back sharply under it
  const lobe = c.lobes.reduce((s, b) => s + Math.exp(-(((y - b) / (y < b ? 30 : 7)) ** 2)) * 0.32, 0);
  const tip = 1 - clamp01((y - (c.bottom - 50)) / 50) * 0.75;
  return base * (1 + lobe) * tip;
};

function falls(ctx: Ctx, r: R): void {
  const { y: ly } = JH.lip;
  const F = JH.cliffFoot;
  // the falls' own shadow on the rock to its right
  ctx.save();
  ctx.translate(12, 6);
  fallsPath(ctx);
  ctx.fillStyle = 'rgba(4,8,24,0.45)';
  ctx.fill();
  ctx.restore();
  // the back: ice glazed thick over the rock behind the curtains, deep blue, lit from within where it's thickest
  fallsPath(ctx);
  ctx.fillStyle = '#3a64a6';
  ctx.fill();
  within(ctx, fallsPath, () => {
    vfill(ctx, 0, ly, 600, F - ly, [[0, '#6a9ad4'], [0.4, '#3e6aae'], [1, '#22447e']]);
    softly(ctx, { x: 60, y: ly, w: 420, h: F - ly }, (g) => {
      const fr = rng(hashStr('jh:channels'));
      for (let i = 0; i < 4; i++) {
        const gx = 230 + (fr() - 0.5) * 140;
        const gy = 360 + fr() * 260;
        const rg = g.createRadialGradient(gx, gy, 0, gx, gy, 90);
        rg.addColorStop(0, 'rgba(110,200,255,0.4)');
        rg.addColorStop(1, 'rgba(110,200,255,0)');
        g.fillStyle = rg;
        g.fillRect(gx - 100, gy - 100, 200, 200);
      }
    }, 0.25);
  });
  // the curtains
  const ir = rng(hashStr('jh:fall-icicles'));
  for (const c of CURTAINS) {
    // (each spills over the rock lip at its own height, rounded over the edge)
    const y0 = ly - 6 + ((c.u * 97) % 1) * 10;
    const y1 = c.bottom;
    const pts: Pt[] = [];
    for (let y = y0; y <= y1; y += 6) pts.push([curtainX(c, y) - curtainHW(c, y), y]);
    const tipX = curtainX(c, y1) + 1;
    const right: Pt[] = [];
    for (let y = y0; y <= y1; y += 6) right.push([curtainX(c, y) + curtainHW(c, y), y]);
    const path: PathFn = (cx) => {
      cx.beginPath();
      pts.forEach(([x, y], i) => (i ? cx.lineTo(x, y) : cx.moveTo(x, y)));
      cx.quadraticCurveTo(tipX - 2, y1 + 10, tipX, y1 + 16);
      cx.quadraticCurveTo(tipX + 2, y1 + 10, right[right.length - 1][0], right[right.length - 1][1]);
      for (let i = right.length - 1; i >= 0; i--) cx.lineTo(right[i][0], right[i][1]);
      cx.quadraticCurveTo(curtainX(c, y0), y0 - curtainHW(c, y0) * 1.4, pts[0][0], pts[0][1]);
      cx.closePath();
    };
    path(ctx);
    const midY = (y0 + y1) / 2;
    const hw = curtainHW(c, midY) * 1.3;
    const mx = curtainX(c, midY);
    const g = ctx.createLinearGradient(mx - hw, 0, mx + hw, 0);
    const dk = c.back ? 0.25 : 0;
    g.addColorStop(0, mix('#f4fbff', '#5a86c4', dk));
    g.addColorStop(0.28, mix('#c0e0fa', '#3a64a6', dk));
    g.addColorStop(0.62, mix('#82b4e6', '#2a4c8c', dk));
    g.addColorStop(1, mix('#3a68b0', '#16306a', dk));
    ctx.fillStyle = g;
    ctx.fill();
    within(ctx, path, () => {
      // flow lines frozen into it, and the lobes: a lit crown on each swell, a shaded belly under it
      for (let k = 0; k < 3; k++) {
        const off = (k - 1) * 0.45;
        ctx.strokeStyle = rgba(k === 0 ? '#ffffff' : '#1e4a8e', k === 0 ? 0.35 : 0.22);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let y = y0; y <= y1; y += 8) ctx.lineTo(curtainX(c, y) + curtainHW(c, y) * off, y);
        ctx.stroke();
      }
      for (const b of c.lobes) {
        if (b > y1 - 30) continue;
        const bx = curtainX(c, b);
        const bw = curtainHW(c, b);
        ctx.fillStyle = rgba('#14306a', 0.35);
        ctx.beginPath();
        ctx.ellipse(bx + bw * 0.1, b + 14, bw * 1.1, 7, 0, 0, P2);
        ctx.fill();
        ctx.fillStyle = rgba('#ffffff', 0.5);
        ctx.beginPath();
        ctx.ellipse(bx - bw * 0.25, b - 8, bw * 0.55, 4, -0.2, 0, P2);
        ctx.fill();
      }
      // bubbles
      for (let i = 0; i < 6; i++) {
        const y = y0 + 20 + r() * (y1 - y0 - 40);
        const x = curtainX(c, y) + (r() - 0.5) * curtainHW(c, y);
        ctx.strokeStyle = 'rgba(230,246,255,0.5)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(x, y, 0.8 + r() * 1.6, 0, P2);
        ctx.stroke();
      }
    });
    path(ctx);
    ctx.strokeStyle = rgba(INK, c.back ? 0.6 : 0.85);
    ctx.lineWidth = c.back ? 1.4 : 1.8;
    ctx.stroke();
    // icicles under the lobes
    for (const b of c.lobes) {
      if (b > y1 - 30) continue;
      const bw = curtainHW(c, b);
      for (let x = curtainX(c, b) - bw * 0.9; x < curtainX(c, b) + bw * 0.9; x += 4 + ir() * 5) icicle(ctx, x, b + 12, 5 + ir() * 16, 2.5 + ir() * 2.5, c.back ? 0.8 : 1);
    }
  }
  // the moon down the falls' left side; the right of it turned away, into the blue
  within(ctx, fallsPath, () => {
    const lg = ctx.createLinearGradient(110, 0, 420, 0);
    lg.addColorStop(0, 'rgba(240,248,255,0.26)');
    lg.addColorStop(0.35, 'rgba(240,248,255,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(60, ly - 30, 420, F - ly + 34);
    ctx.globalCompositeOperation = 'multiply';
    const mg = ctx.createLinearGradient(110, 0, 420, 0);
    mg.addColorStop(0, '#ffffff');
    mg.addColorStop(0.4, '#e4ecfa');
    mg.addColorStop(0.75, '#8a9ed0');
    mg.addColorStop(1, '#5a6eaa');
    ctx.fillStyle = mg;
    ctx.fillRect(60, ly - 30, 420, F - ly + 34);
    ctx.globalCompositeOperation = 'source-over';
  });
  // the icicle fringes at the curtains' tips
  for (const c of CURTAINS) {
    if (c.bottom > F - 20) continue;
    const tipX = curtainX(c, c.bottom);
    for (let i = 0; i < 4; i++) icicle(ctx, tipX + (i - 1.5) * 4, c.bottom + 4 + ir() * 6, 10 + ir() * 22, 2.5 + ir() * 2, 0.95);
  }
}

/** Where the falls' icicles hang (for the ones a stomp shakes loose): under the curtains' lobes and at their tips. */
export const FALL_SPOTS: Pt[] = (() => {
  const out: Pt[] = [];
  for (const c of CURTAINS) {
    if (c.back) continue;
    for (const b of c.lobes) if (b < c.bottom - 30) out.push([curtainX(c, b), b + 22]);
    if (c.bottom < JH.cliffFoot - 20) out.push([curtainX(c, c.bottom), c.bottom + 20]);
  }
  return out;
})();

function cliff(ctx: Ctx, r: R): void {
  const box = { x: 0, y: 140, w: 580, h: JH.cliffFoot - 132 };
  cliffPath(ctx);
  ctx.fillStyle = STONE.body;
  ctx.fill();
  within(ctx, cliffPath, () => {
    vfill(ctx, box.x, box.y, box.w, box.h, [[0, '#3c4666'], [0.5, '#2a3252'], [1, '#161c34']]);
    surface(ctx, r, box, '#2e3654', { over: true, vary: 0.35, cells: 5, mottle: 0.3, strokes: 0.5, strokeAng: Math.PI / 2, strokeLen: 100, strokeW: 3, grain: 0.14, seed: 41 });
    // each column a hexagonal prism seen side on: a left facet turned to the moon, a broad front facet, a right facet
    // in shade; cross joints break it into drums, each joint a shallow V where it crosses the three facets
    for (const [i, [x0, x1, t]] of COLS.entries()) {
      const w = x1 - x0;
      const a = x0 + w * (0.24 + (i % 2) * 0.06);
      const b = x0 + w * (0.72 + (i % 3) * 0.03);
      const lit = ctx.createLinearGradient(0, t, 0, JH.cliffFoot);
      lit.addColorStop(0, rgba('#c4d0f2', 0.5));
      lit.addColorStop(1, rgba('#8a96c0', 0.2));
      ctx.fillStyle = lit;
      ctx.fillRect(x0, t, a - x0, JH.cliffFoot - t);
      ctx.fillStyle = rgba('#05071a', 0.42);
      ctx.fillRect(b, t, x1 - b, JH.cliffFoot - t);
      ctx.strokeStyle = rgba('#04060e', 0.75);
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(x0, t + 4);
      ctx.lineTo(x0, JH.cliffFoot);
      ctx.stroke();
      ctx.strokeStyle = rgba('#d0dcff', 0.32);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x0 + 2, t + 4);
      ctx.lineTo(x0 + 2, JH.cliffFoot);
      ctx.stroke();
      // the facet edges: the lit arris sharp, the shaded one soft
      ctx.strokeStyle = rgba('#dce6ff', 0.2);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(a, t + 6);
      ctx.lineTo(a, JH.cliffFoot);
      ctx.stroke();
      ctx.strokeStyle = rgba('#04060e', 0.3);
      ctx.beginPath();
      ctx.moveTo(b, t + 6);
      ctx.lineTo(b, JH.cliffFoot);
      ctx.stroke();
      for (let y = t + 40 + r() * 50; y < JH.cliffFoot - 16; y += 50 + r() * 90) {
        const sag = 3 + r() * 3;
        ctx.strokeStyle = rgba('#04060e', 0.65);
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(a, y + sag);
        ctx.lineTo(b, y + sag);
        ctx.lineTo(x1, y);
        ctx.stroke();
        ctx.strokeStyle = rgba('#b8c4e8', 0.24);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x0 + 2, y + 2.5);
        ctx.lineTo(a, y + sag + 2.5);
        ctx.lineTo(b, y + sag + 2.5);
        ctx.stroke();
        // a chip knocked off a drum's corner, now and then
        if (r() < 0.2) {
          ctx.fillStyle = rgba('#05071a', 0.5);
          ctx.beginPath();
          ctx.moveTo(b, y + sag);
          ctx.lineTo(x1, y);
          ctx.lineTo(x1, y + 10 + r() * 10);
          ctx.closePath();
          ctx.fill();
        }
      }
      if (r() < 0.6) streaks(ctx, r, x0 + w * 0.5, t + 10, w * 0.6, 60 + r() * 100, '#04060e', 0.18, 3);
    }
    // ice glazed down the rock either side of the falls, where the water seeped and froze
    for (const [xa, xb] of [[150, 200], [314, 372]] as const) {
      for (let i = 0; i < 7; i++) {
        const xx = xa + r() * (xb - xa);
        const y0 = 230 + r() * 60;
        const len = 120 + r() * 300;
        const lg = ctx.createLinearGradient(0, y0, 0, y0 + len);
        lg.addColorStop(0, rgba('#9ccaf0', 0.45));
        lg.addColorStop(1, rgba('#5a8ac8', 0));
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.moveTo(xx - 3, y0);
        ctx.quadraticCurveTo(xx - 6, y0 + len * 0.5, xx - 2, y0 + len);
        ctx.lineTo(xx + 4, y0 + len);
        ctx.quadraticCurveTo(xx + 6, y0 + len * 0.5, xx + 3, y0);
        ctx.fill();
      }
    }
    // the cliff's right flank turned from the moon, and the chill low down
    const sg = ctx.createLinearGradient(420, 0, 570, 0);
    sg.addColorStop(0, 'rgba(4,6,20,0)');
    sg.addColorStop(1, 'rgba(4,6,20,0.45)');
    ctx.fillStyle = sg;
    ctx.fillRect(420, 200, 150, JH.cliffFoot - 190);
    vfill(ctx, 0, 520, 580, JH.cliffFoot - 512, [[0, 'rgba(6,10,30,0)'], [1, 'rgba(6,10,30,0.45)']]);
    vfill(ctx, 0, 140, 580, 160, [[0, 'rgba(220,230,255,0.14)'], [1, 'rgba(220,230,255,0)']]);
  });
  cliffPath(ctx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6;
  ctx.stroke();
  // snow on the column tops: thin wind-packed caps, the lee edge curling over; icicles under some
  for (const [i, [x0, x1, t]] of COLS.entries()) {

    const tl = t + (i % 3) * 3;
    snowCap(ctx, r, x0 + 1, x1 + 2, (u) => lerp(tl, t, u) - 1, 3 + (i % 2) * 3);
    const ir = rng(hashStr('jh:col-icicles' + i));
    for (let xx = x0 + 6; xx < x1 - 4; xx += 7 + ir() * 8) if (ir() < 0.45) icicle(ctx, xx, lerp(tl, t, (xx - x0) / (x1 - x0)) + 3, 5 + ir() * 14, 2.5 + ir() * 2.5);
  }
}

/** The heap of ice fallen at the falls' foot: blocks and plates, snow drifted over them. */
function fallsFoot(ctx: Ctx, r: R): void {
  const y0 = JH.cliffFoot;
  softly(ctx, { x: 20, y: 660, w: 560, h: 90 }, (g) => {
    g.fillStyle = 'rgba(12,20,60,0.5)';
    g.beginPath();
    g.ellipse(300, y0 + 14, 260, 18, 0, 0, P2);
    g.fill();
  }, 0.25);
  // the snow apron along the cliff's foot
  const apron: PathFn = (c) => {
    c.beginPath();
    c.moveTo(-10, y0 + 24);
    c.lineTo(-10, y0 - 50);
    c.bezierCurveTo(100, y0 - 70, 200, y0 - 36, 300, y0 - 44);
    c.bezierCurveTo(420, y0 - 56, 500, y0 - 30, 570, y0 + 4);
    c.lineTo(584, y0 + 24);
    c.closePath();
  };
  apron(ctx);
  const ag = ctx.createLinearGradient(0, y0 - 70, 0, y0 + 24);
  ag.addColorStop(0, SNOW.lit);
  ag.addColorStop(0.45, '#bccce8');
  ag.addColorStop(1, '#8ea2d2');
  ctx.fillStyle = ag;
  ctx.fill();
  within(ctx, apron, () => {
    const lg = ctx.createLinearGradient(0, 0, 640, 0);
    lg.addColorStop(0, 'rgba(255,255,255,0.1)');
    lg.addColorStop(1, 'rgba(20,30,80,0.25)');
    ctx.fillStyle = lg;
    ctx.fillRect(-10, y0 - 80, 660, 110);
    crevice(ctx, -10, 600, y0 - 52, 14, 0.25, '#0a1440');
  });
  apron(ctx);
  ctx.strokeStyle = rgba(INK, 0.5);
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // blocks of fallen ice heaped at the falls' foot, each lit on its left
  const blocks: [number, number, number][] = [];
  for (let i = 0; i < 16; i++) blocks.push([130 + r() * 280, y0 - 30 + r() * 30, 9 + r() * 20]);
  blocks.sort((a, b) => a[1] - b[1]);
  for (const [bx, by, s] of blocks) {
    const tilt = (r() - 0.5) * 0.7;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(tilt);
    ctx.fillStyle = 'rgba(10,20,60,0.35)';
    ctx.beginPath();
    ctx.ellipse(s * 0.5, 2, s * 1.2, s * 0.22, 0, 0, P2);
    ctx.fill();
    const top: Pt[] = [[-s, 0], [-s * 0.8, -s * 0.9], [s * 0.2, -s * 1.1], [s * 0.9, -s * 0.6], [s, 0]];
    ctx.beginPath();
    top.forEach(([px, py], j) => (j ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.closePath();
    const g = ctx.createLinearGradient(-s, -s, s, 0);
    g.addColorStop(0, '#eef8ff');
    g.addColorStop(0.45, '#9cc6ee');
    g.addColorStop(1, '#2e5aa0');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.fillStyle = rgba('#1a3a80', 0.35);
    ctx.beginPath();
    ctx.moveTo(s * 0.2, -s * 1.1);
    ctx.lineTo(s * 0.9, -s * 0.6);
    ctx.lineTo(s, 0);
    ctx.lineTo(s * 0.1, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.7);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    top.forEach(([px, py], j) => (j ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
  // the drift banked round them
  ctx.fillStyle = SNOW.body;
  ctx.beginPath();
  ctx.moveTo(90, y0 + 10);
  ctx.quadraticCurveTo(170, y0 - 14, 270, y0 - 6);
  ctx.quadraticCurveTo(380, y0 - 16, 450, y0 + 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgba(SNOW.lit, 0.8);
  ctx.beginPath();
  ctx.moveTo(96, y0 + 8);
  ctx.quadraticCurveTo(170, y0 - 14, 250, y0 - 8);
  ctx.quadraticCurveTo(170, y0 - 4, 96, y0 + 8);
  ctx.fill();
}

// ——— the giants' gate ———

/** A megalith's outline: a rough-hewn upright, its edges broken here and there (x at its left, right, y). */
function stonePath(x0: number, x1: number, top: number, foot: number, seed: string, broken: boolean): Pt[] {
  const rr = rng(hashStr(seed));
  const left: Pt[] = [];
  const right: Pt[] = [];
  const taper = (y: number) => ((foot - y) / (foot - top)) * 8;
  for (let y = top + 12; y <= foot; y += 26 + rr() * 30) {
    left.push([x0 + taper(y) + (rr() - 0.5) * 6, y]);
    right.push([x1 - taper(y) + (rr() - 0.5) * 6, y]);
  }
  left.push([x0, foot + 6]);
  right.push([x1, foot + 6]);
  const crown: Pt[] = [];
  if (broken) {
    // a snapped top: a jagged fracture falling to the right
    const n = 6;
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      crown.push([lerp(x0 + 6, x1 - 4, u) + (rr() - 0.5) * 6, top + u * 30 - Math.sin(u * Math.PI) * 8 + (i % 2 ? 11 : -5) * (0.5 + rr()) * (i % 3 ? 1 : 0.4)]);
    }
  } else crown.push([x0 + 6, top], [x1 - 6, top]);
  return [...left.reverse(), ...crown, ...right];
}

const P1_PTS = stonePath(JH.p1.x0, JH.p1.x1, -20, JH.p1.foot, 'jh:p1', false);
const P2_PTS = stonePath(JH.p2.x0, JH.p2.x1, JH.p2.top, JH.p2.foot, 'jh:p2', true);

/** Where the runes run on the gate (x, y, size, glyph), for the live glow too. */
export const GATE_RUNES: [number, number, number, number][] = (() => {
  const out: [number, number, number, number][] = [];
  const cx1 = (JH.p1.x0 + JH.p1.x1) / 2 - 10;
  for (let i = 0; i < 5; i++) out.push([cx1, 196 + i * 46, 34, i * 3 + 1]);
  for (let i = 0; i < 4; i++) out.push([cx1, 474 + i * 46, 34, i * 2 + 5]);
  const cx2 = (JH.p2.x0 + JH.p2.x1) / 2 - 9;
  for (let i = 0; i < 4; i++) out.push([cx2, 396 + i * 42, 30, i * 3 + 2]);
  return out;
})();

function megalith(ctx: Ctx, r: R, pts: Pt[], box: { x: number; y: number; w: number; h: number }, seed: number, bands: number[]): void {
  const path = polyPath(pts);
  path(ctx);
  ctx.fillStyle = STONE.body;
  ctx.fill();
  within(ctx, path, () => {
    vfill(ctx, box.x, box.y, box.w, box.h, [[0, '#4a5474'], [0.6, '#363e5c'], [1, '#1e243c']]);
    surface(ctx, r, box, '#424a6a', { over: true, vary: 0.4, cells: 4, mottle: 0.4, strokes: 0.7, strokeAng: Math.PI / 2 + 0.2, strokeLen: 80, strokeW: 4, grain: 0.14, seed });
    // the tooling of a giant's chisel: broad shallow scallops across the face, each lit along its lower lip
    for (let y = box.y + 10; y < box.y + box.h; y += 18 + r() * 16) {
      for (let x = box.x + r() * 30 - 20; x < box.x + box.w; x += 30 + r() * 30) {
        const w = 26 + r() * 30;
        ctx.strokeStyle = rgba('#0a0c1c', 0.16);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x + w / 2, y - w * 0.6, w * 0.7, Math.PI * 0.3, Math.PI * 0.7);
        ctx.stroke();
        ctx.strokeStyle = rgba('#a8b4d8', 0.08);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x + w / 2, y - w * 0.6 + 2, w * 0.7, Math.PI * 0.3, Math.PI * 0.7);
        ctx.stroke();
      }
    }
    // the moon on the left of the stone, the right in shade
    const lg = ctx.createLinearGradient(box.x, 0, box.x + box.w, 0);
    lg.addColorStop(0, 'rgba(200,214,255,0.22)');
    lg.addColorStop(0.3, 'rgba(200,214,255,0.04)');
    lg.addColorStop(0.7, 'rgba(4,6,20,0.12)');
    lg.addColorStop(1, 'rgba(4,6,20,0.5)');
    ctx.fillStyle = lg;
    ctx.fillRect(box.x, box.y, box.w, box.h);
    // cracks where the frost has worked into it
    for (let i = 0; i < 4; i++) crack(ctx, r, box.x + box.w * (0.2 + r() * 0.6), box.y + r() * box.h, Math.PI / 2 + (r() - 0.5) * 1.2, 40 + r() * 100, { col: '#05070f', lip: '#9aa8d0', w: 1.8, a: 0.7, branch: 0.25 });
    // carved bands: a raised moulding with a chevron cut along it, snow on its top
    for (const by of bands) {
      ctx.fillStyle = 'rgba(4,6,16,0.45)';
      ctx.fillRect(box.x, by + 22, box.w, 7);
      ctx.fillStyle = rgba('#5a6488', 0.9);
      ctx.fillRect(box.x, by, box.w, 22);
      ctx.fillStyle = rgba('#a8b4d8', 0.3);
      ctx.fillRect(box.x, by, box.w, 3);
      ctx.strokeStyle = rgba('#080a18', 0.6);
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = box.x; x <= box.x + box.w; x += 16) {
        ctx.lineTo(x, by + 5);
        ctx.lineTo(x + 8, by + 17);
      }
      ctx.stroke();
      ctx.strokeStyle = rgba('#b8c4e8', 0.25);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = box.x; x <= box.x + box.w; x += 16) {
        ctx.lineTo(x + 1, by + 7);
        ctx.lineTo(x + 9, by + 19);
      }
      ctx.stroke();
      // the moulding's shadow under it, wet streaks running down
      for (let k = 0; k < 2; k++) streaks(ctx, r, box.x + box.w * (0.2 + r() * 0.6), by + 28, 40, 30 + r() * 50, '#04060e', 0.18, 3);
    }
    // rime grown on the windward (left) edge: white feathers pointing into the wind
    softly(ctx, { x: box.x, y: box.y, w: 60, h: box.h }, (g) => {
      for (let i = 1; i < pts.length; i++) {
        const [x, y] = pts[i];
        if (x > box.x + box.w * 0.4 || y < box.y) continue;
        for (let k = 0; k < 7; k++) {
          const yy = y - k * 4 - r() * 4;
          g.strokeStyle = rgba('#eef6ff', 0.3 + r() * 0.3);
          g.lineWidth = 2 + r() * 2;
          g.beginPath();
          g.moveTo(x + 1, yy);
          g.lineTo(x + 4 + r() * 10, yy - 2);
          g.stroke();
        }
      }
    }, 0.5);
    // darker and colder low down, the snow's light bounced into its foot
    vfill(ctx, box.x, box.y + box.h - 160, box.w, 160, [[0, 'rgba(4,6,20,0)'], [0.7, 'rgba(4,6,20,0.3)'], [1, 'rgba(120,140,200,0.18)']]);
  });
  path(ctx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6;
  ctx.stroke();
  ctx.save();
  path(ctx);
  ctx.clip();
  ctx.strokeStyle = rgba('#c8d6ff', 0.4);
  ctx.lineWidth = 5;
  ctx.beginPath();
  const half = pts.slice(0, Math.floor(pts.length / 2));
  half.forEach(([x, y], i) => (i ? ctx.lineTo(x + 2, y) : ctx.moveTo(x + 2, y)));
  ctx.stroke();
  ctx.restore();
}

function plinth(ctx: Ctx, r: R, x0: number, x1: number, foot: number): void {
  const top = foot - 34;
  const path = polyPath([[x0 - 22, foot + 14], [x0 - 18, top + 4], [x0 - 12, top], [x1 + 12, top + 2], [x1 + 18, top + 6], [x1 + 22, foot + 14]]);
  path(ctx);
  ctx.fillStyle = '#3a4262';
  ctx.fill();
  within(ctx, path, () => {
    surface(ctx, r, { x: x0 - 24, y: top, w: x1 - x0 + 48, h: 50 }, '#3a4262', { over: true, vary: 0.3, cells: 3, grain: 0.3, grainKind: 'stone', seed: Math.floor(x0) });
    ctx.fillStyle = rgba('#a8b4d8', 0.25);
    ctx.fillRect(x0 - 24, top, x1 - x0 + 48, 4);
    const lg = ctx.createLinearGradient(x0 - 22, 0, x1 + 22, 0);
    lg.addColorStop(0, 'rgba(200,214,255,0.14)');
    lg.addColorStop(1, 'rgba(4,6,20,0.45)');
    ctx.fillStyle = lg;
    ctx.fillRect(x0 - 24, top, x1 - x0 + 48, 50);
  });
  path(ctx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.stroke();
}

function gate(ctx: Ctx, r: R): void {
  const { p1, p2 } = JH;
  // the stones' long shadows thrown down to the right, off the picture
  softly(ctx, { x: 1360, y: 600, w: 560, h: 160 }, (g) => {
    g.fillStyle = 'rgba(12,20,60,0.45)';
    g.beginPath();
    g.moveTo(p2.x0, p2.foot + 4);
    g.lineTo(p2.x1 + 160, p2.foot + 40);
    g.lineTo(p2.x1 + 240, p2.foot + 34);
    g.lineTo(p2.x1, p2.foot - 4);
    g.closePath();
    g.fill();
  }, 0.12);
  // the far stone, snapped off
  plinth(ctx, r, p2.x0, p2.x1, p2.foot);
  megalith(ctx, r, P2_PTS, { x: p2.x0 - 4, y: p2.top - 20, w: p2.x1 - p2.x0 + 8, h: p2.foot - p2.top + 28 }, 51, [560]);
  // its fracture: a fresh, paler face, and the snow on it
  const crown = P2_PTS.slice((P2_PTS.length - 7) / 2, (P2_PTS.length + 7) / 2);
  snowCap(ctx, r, crown[0][0], crown[crown.length - 1][0], (u) => {
    const i = Math.min(crown.length - 2, Math.floor(u * (crown.length - 1)));
    const f = u * (crown.length - 1) - i;
    return lerp(crown[i][1], crown[i + 1][1], f) + 2;
  }, 8);
  // the near stone, running up out of the picture
  plinth(ctx, r, p1.x0, p1.x1, p1.foot);
  megalith(ctx, r, P1_PTS, { x: p1.x0 - 4, y: -20, w: p1.x1 - p1.x0 + 8, h: p1.foot + 28 }, 53, [140, 420]);
  for (const [x, y, s, g] of GATE_RUNES) carvedRune(ctx, g, x, y, s, 0.6);
  // snow on the mouldings and icicles under them
  const ir = rng(hashStr('jh:gate-icicles'));
  for (const [x0, x1, by] of [[p1.x0 + 2, p1.x1 - 2, 140], [p1.x0 + 2, p1.x1 - 2, 420], [p2.x0 + 2, p2.x1 - 2, 560]] as const) {
    snowCap(ctx, r, x0 - 4, x1 + 4, () => by - 1, 7);
    for (let x = x0 + 6; x < x1 - 4; x += 6 + ir() * 10) if (ir() < 0.7) icicle(ctx, x, by + 22, 8 + ir() * 30, 3 + ir() * 4);
  }
  // drifts heaped against the plinths' windward sides
  for (const [x0, x1, f] of [[p2.x0, p2.x1, p2.foot], [p1.x0, p1.x1, p1.foot]] as const) {
    ctx.fillStyle = SNOW.body;
    ctx.beginPath();
    ctx.moveTo(x0 - 70, f + 14);
    ctx.quadraticCurveTo(x0 - 30, f - 40, x0 + 10, f - 22);
    ctx.quadraticCurveTo(x0 + (x1 - x0) * 0.5, f - 6, x1 + 40, f + 14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgba(SNOW.lit, 0.85);
    ctx.beginPath();
    ctx.moveTo(x0 - 66, f + 12);
    ctx.quadraticCurveTo(x0 - 30, f - 40, x0 + 6, f - 22);
    ctx.quadraticCurveTo(x0 - 30, f - 14, x0 - 66, f + 12);
    ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.4);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x0 - 70, f + 14);
    ctx.quadraticCurveTo(x0 - 30, f - 40, x0 + 10, f - 22);
    ctx.stroke();
  }
}

/** One piece of the fallen lintel in its own frame: its front face from (0, 0) to (len, h), its top running back
 * up to the right by D, its left end turned to the moon; a broken end is a jagged fracture, paler fresh stone. */
function lintelPiece(ctx: Ctx, r: R, len: number, h: number, D: number, breakL: boolean, breakR: boolean, seed: number): void {
  const rr = rng(hashStr('jh:lintel' + seed));
  const jag = (n: number, amp: number) => Array.from({ length: n + 1 }, (_, i) => (i === 0 || i === n ? 0 : (rr() - 0.5) * amp));
  const jr = jag(5, breakR ? 16 : 0);
  const jl = jag(5, breakL ? 14 : 0);
  const dy = -D * 0.7;
  const front: Pt[] = [[jl[0], 0], [len + jr[0], 0], ...jr.map((o, i): Pt => [len + o - (breakR ? 6 * Math.sin((i / 5) * Math.PI) : 0), (h * i) / 5]), [0, h], ...jl.map((o, i): Pt => [o, h - (h * i) / 5])];
  const top: Pt[] = [[0, 0], [D, dy], [len + D - (breakR ? 10 : 0), dy], [len + jr[0], 0]];
  const end: Pt[] = breakL
    ? [[0, 0], [D * 0.4 + jl[1], dy * 0.5 - 2], [D, dy], [D + 3, dy + h * 0.5], [D, dy + h], [D * 0.5 + jl[3], h + dy * 0.4], [0, h]]
    : [[0, 0], [D, dy], [D, dy + h], [0, h]];
  // the end turned to the moon: dressed and lit, or a fresh fracture, paler, its facets catching the light
  const endP = polyPath(end);
  endP(ctx);
  ctx.fillStyle = breakL ? '#8692b6' : '#6e7aa2';
  ctx.fill();
  within(ctx, endP, () => {
    surface(ctx, r, { x: -2, y: dy - 2, w: D + 6, h: h + 4 }, breakL ? '#8692b6' : '#6e7aa2', { over: true, vary: 0.3, grain: 0.2, grainKind: 'speckle', seed: 61 + seed });
    if (breakL) {
      for (let i = 0; i < 4; i++) {
        ctx.strokeStyle = rgba(i % 2 ? '#0a0c1c' : '#d8e2ff', 0.45);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(rr() * D, dy + rr() * h);
        ctx.lineTo(rr() * D, dy + rr() * h);
        ctx.stroke();
      }
    }
  });
  endP(ctx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  // the top, under its snow
  const topP = polyPath(top);
  topP(ctx);
  ctx.fillStyle = '#5a6488';
  ctx.fill();
  topP(ctx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  // the front: the carved face, runes along it, darker low down where it sinks into the drift
  const frontP = polyPath(front);
  frontP(ctx);
  ctx.fillStyle = '#3e4664';
  ctx.fill();
  within(ctx, frontP, () => {
    surface(ctx, r, { x: -20, y: -4, w: len + 40, h: h + 8 }, '#3e4664', { over: true, vary: 0.35, cells: 4, grain: 0.18, grainKind: 'speckle', seed: 63 + seed });
    vfill(ctx, -20, 0, len + 40, h, [[0, 'rgba(180,196,240,0.16)'], [0.6, 'rgba(4,6,20,0.1)'], [1, 'rgba(4,6,20,0.4)']]);
    // a raised border round the rune band, lit along its top
    ctx.strokeStyle = rgba('#a8b4d8', 0.3);
    ctx.lineWidth = 1.2;
    ctx.strokeRect(6, 4, len - 12, h - 11);
    ctx.strokeStyle = rgba('#05070f', 0.5);
    ctx.strokeRect(7, 5.5, len - 12, h - 11);
    for (let x = 14; x < len - 22; x += 28) carvedRune(ctx, Math.floor((x + seed * 31) / 28) * 7, x, 7, 22, 0.55);
    if (breakR) {
      // the fracture's edge spalled: chips gone off the corner
      ctx.fillStyle = rgba('#8692b6', 0.9);
      ctx.beginPath();
      ctx.moveTo(len - 18, 0);
      ctx.lineTo(len, 0);
      ctx.lineTo(len - 4, 12);
      ctx.closePath();
      ctx.fill();
    }
  });
  frontP(ctx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.stroke();
  // the snow lying along its top, a lit crest and the lip curling over the front edge
  snowCap(ctx, r, 2, len + D - (breakR ? 14 : 4), (u) => lerp(0, dy, Math.min(1, u * (len + D) / D) * 0.35) + 1, 6);
}

/** The lintel, fallen in front of the stones and broken in two: the left piece lying where it fell, the right one
 * snapped off, slewed round and sunk deeper in the drift, rubble from the break between them. */
function lintel(ctx: Ctx, r: R): void {
  const { x0, y0, x1, y1, h } = JH.lintel;
  const slope = Math.atan2(y1 - y0, x1 - x0);
  const breakX = 1492;
  const yAtX = (x: number) => lerp(y0, y1, (x - x0) / (x1 - x0));
  // the long moon shadow off it, and the occlusion where each piece lies in the snow
  softly(ctx, { x: x0 - 20, y: y0 - 10, w: x1 - x0 + 240, h: TY - y0 + 10 }, (g) => {
    g.fillStyle = 'rgba(10,18,56,0.5)';
    g.beginPath();
    g.moveTo(x0 + 10, y0 + h - 2);
    g.lineTo(x1 + 180, y1 + h + 20);
    g.lineTo(x1 + 140, y1 + h + 6);
    g.lineTo(x1, y1 + 4);
    g.closePath();
    g.fill();
  }, 0.2);
  // rubble from the break, under and between the pieces
  const rubble = (n: number, cx: number, spread: number) => {
    for (let i = 0; i < n; i++) {
      const bx = cx + (r() - 0.5) * spread;
      const by = yAtX(bx) + h - 2 + r() * 10;
      const s = 4 + r() * 9;
      ctx.fillStyle = 'rgba(8,12,36,0.5)';
      ctx.beginPath();
      ctx.ellipse(bx + s * 0.5, by + s * 0.5, s * 1.1, s * 0.3, 0, 0, P2);
      ctx.fill();
      const g = ctx.createLinearGradient(bx - s, by - s, bx + s, by + s);
      g.addColorStop(0, '#8a96ba');
      g.addColorStop(0.5, '#4c5674');
      g.addColorStop(1, '#1e243a');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(bx - s, by + s * 0.4);
      ctx.lineTo(bx - s * 0.6, by - s * 0.6);
      ctx.lineTo(bx + s * 0.5, by - s * 0.8);
      ctx.lineTo(bx + s, by + s * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = rgba(SNOW.lit, 0.85);
      ctx.beginPath();
      ctx.ellipse(bx - s * 0.1, by - s * 0.62, s * 0.55, s * 0.18, -0.1, 0, P2);
      ctx.fill();
    }
  };
  // the right piece, behind: slewed round and sunk, its broken end lifted on the rubble
  ctx.save();
  ctx.translate(breakX + 10, yAtX(breakX) + 4);
  ctx.rotate(slope + 0.06);
  lintelPiece(ctx, r, x1 - breakX - 10, h, 22, true, false, 2);
  ctx.restore();
  rubble(7, breakX, 60);
  // the left piece, in front, lying where it fell, broken off at its right end
  ctx.save();
  ctx.translate(x0, y0);
  ctx.rotate(slope);
  lintelPiece(ctx, r, breakX - x0, h, 22, false, true, 1);
  ctx.restore();
  rubble(4, breakX + 20, 40);
  crevice(ctx, x0, x1, y1 + h - 4, 10, 0.4, '#0a1440');
  // the drift banked up against them, burying their lower third
  const drift: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x0 - 40, TY);
    for (let x = x0 - 40; x <= x1 + 40; x += 10) c.lineTo(x, yAtX(Math.min(x1, Math.max(x0, x))) + h * 0.62 + Math.sin(x / 37) * 4 - Math.exp(-(((x - x0) / 30) ** 2)) * 10);
    c.lineTo(x1 + 40, TY);
    c.closePath();
  };
  drift(ctx);
  ctx.fillStyle = SNOW.body;
  ctx.fill();
  within(ctx, drift, () => vfill(ctx, x0 - 40, y0 + 10, x1 - x0 + 80, TY - y0, [[0, rgba(SNOW.lit, 0.9)], [1, rgba('#7a90c4', 0.4)]]));
  ctx.strokeStyle = rgba('#ffffff', 0.6);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let x = x0 - 36; x <= x1 + 36; x += 10) ctx.lineTo(x, yAtX(Math.min(x1, Math.max(x0, x))) + h * 0.62 + Math.sin(x / 37) * 4 - Math.exp(-(((x - x0) / 30) ** 2)) * 10 + 1);
  ctx.stroke();
  const ir = rng(hashStr('jh:lintel-icicles'));
  for (let x = x0 + 30; x < breakX - 20; x += 12 + ir() * 20) if (ir() < 0.5) icicle(ctx, x, yAtX(x) + 1, 6 + ir() * 12, 3 + ir() * 3);
}

/** Where the lintel's icicles hang (shaken off by stomps). */
const LINTEL_SPOTS: Pt[] = Array.from({ length: 8 }, (_, i) => {
  const x = JH.lintel.x0 + 60 + i * 48;
  return [x, lerp(JH.lintel.y0, JH.lintel.y1, (x - JH.lintel.x0) / (JH.lintel.x1 - JH.lintel.x0)) + 6] as Pt;
});

// ——— the near snow, the helm ———

/** A frost giant's horned helm, half buried in the drift at the cliff's foot. */
function helm(ctx: Ctx, r: R): void {
  const { x, y } = JH.helm;
  const rx = 84;
  const ry = 66;
  softly(ctx, { x: x - 100, y: y - 20, w: 330, h: 50 }, (g) => {
    g.fillStyle = 'rgba(10,18,56,0.55)';
    g.beginPath();
    g.ellipse(x + 60, y + 2, 150, 12, 0.03, 0, P2);
    g.fill();
  }, 0.25);
  // the horn, curving up and back
  const horn: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x + 52, y - 52);
    c.bezierCurveTo(x + 92, y - 66, x + 112, y - 108, x + 118, y - 150);
    c.bezierCurveTo(x + 136, y - 104, x + 126, y - 42, x + 80, y - 26);
    c.closePath();
  };
  horn(ctx);
  const hg = ctx.createLinearGradient(x + 60, y - 120, x + 120, y - 90);
  hg.addColorStop(0, '#f4ecd8');
  hg.addColorStop(0.45, '#c8b694');
  hg.addColorStop(1, '#5a4634');
  ctx.fillStyle = hg;
  ctx.fill();
  within(ctx, horn, () => {
    // growth rings across it, tighter towards the tip; the tip darkened, the base stained by the iron
    for (let i = 0; i < 10; i++) {
      const t = (i / 10) ** 0.8;
      const ax = lerp(x + 52, x + 116, t);
      const ay = lerp(y - 52, y - 146, t);
      const bx = lerp(x + 80, x + 120, t);
      const by = lerp(y - 26, y - 144, t);
      ctx.strokeStyle = rgba('#3a2a1c', 0.35);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo((ax + bx) / 2 + 6, (ay + by) / 2 + 4, bx + 2, by);
      ctx.stroke();
    }
    vfill(ctx, x + 90, y - 160, 50, 40, [[0, 'rgba(40,28,18,0.55)'], [1, 'rgba(40,28,18,0)']]);
    // frost on its upper side, facing the moon
    ctx.strokeStyle = rgba('#f0f6ff', 0.7);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 56, y - 54);
    ctx.bezierCurveTo(x + 92, y - 68, x + 110, y - 108, x + 116, y - 146);
    ctx.stroke();
  });
  horn(ctx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  // the dome: dark iron plates riveted to a brow band
  const dome: PathFn = (c) => {
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, Math.PI, 0);
    c.closePath();
  };
  dome(ctx);
  const dg = ctx.createRadialGradient(x - 30, y - 50, 4, x, y - 10, rx * 1.1);
  dg.addColorStop(0, '#a8b2cc');
  dg.addColorStop(0.35, '#5a6280');
  dg.addColorStop(1, '#161a2c');
  ctx.fillStyle = dg;
  ctx.fill();
  within(ctx, dome, () => {
    lay(ctx, noiseMask(6, 121, { cover: 0.45, soft: 0.5, col: '#1a1820', w: 120, h: 64 }), { x: x - rx, y: y - ry, w: rx * 2, h: ry }, 0.35);
    // the plates' seams, ridges over the crown
    for (const a of [-0.55, 0, 0.55]) {
      ctx.strokeStyle = rgba('#0a0c18', 0.7);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + Math.sin(a) * rx, y);
      ctx.quadraticCurveTo(x + Math.sin(a) * rx * 0.9, y - ry * 0.9, x + Math.sin(a) * rx * 0.1, y - ry);
      ctx.stroke();
      ctx.strokeStyle = rgba('#c8d2ec', 0.35);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x + Math.sin(a) * rx - 2, y);
      ctx.quadraticCurveTo(x + Math.sin(a) * rx * 0.9 - 2, y - ry * 0.9, x + Math.sin(a) * rx * 0.1 - 2, y - ry);
      ctx.stroke();
    }
    // the brow band
    ctx.fillStyle = '#2a3048';
    ctx.fillRect(x - rx, y - 22, rx * 2, 18);
    ctx.fillStyle = rgba('#a8b4d8', 0.3);
    ctx.fillRect(x - rx, y - 22, rx * 2, 3);
    for (let i = 0; i < 9; i++) {
      const rxp = x - rx + 10 + i * 20;
      ctx.fillStyle = '#7a84a4';
      ctx.beginPath();
      ctx.arc(rxp, y - 13, 3, 0, P2);
      ctx.fill();
      ctx.fillStyle = rgba('#eef2ff', 0.6);
      ctx.fillRect(rxp - 1.5, y - 15, 1.5, 1.5);
    }
    // frost bloom and the snow's light bounced up under it
    lay(ctx, noiseMask(8, 123, { cover: 0.35, soft: 0.5, col: '#e8f2ff', w: 120, h: 64 }), { x: x - rx, y: y - ry, w: rx * 2, h: ry }, 0.25);
  });
  dome(ctx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6;
  ctx.stroke();
  snowCap(ctx, r, x - 60, x + 40, (u) => y - ry * Math.sin(lerp(0.75, 1.7, u) * 1.0) - 2, 6);
  // the horn's socket: a riveted iron collar round its root, set into the dome
  ctx.save();
  ctx.translate(x + 66, y - 40);
  ctx.rotate(-0.7);
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 9, 0, 0, P2);
  const cg = ctx.createLinearGradient(0, -9, 0, 9);
  cg.addColorStop(0, '#a8b2cc');
  cg.addColorStop(0.5, '#4a5270');
  cg.addColorStop(1, '#141828');
  ctx.fillStyle = cg;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  for (const rx2 of [-13, 0, 13]) {
    ctx.fillStyle = '#8a94b4';
    ctx.beginPath();
    ctx.arc(rx2, 1, 2.4, 0, P2);
    ctx.fill();
  }
  ctx.restore();
  // occlusion where the dome goes into the drift
  ctx.fillStyle = 'rgba(8,14,44,0.45)';
  ctx.beginPath();
  ctx.ellipse(x + 6, y - 2, rx * 0.95, 7, 0, 0, P2);
  ctx.fill();
  // the drift it's sunk in
  ctx.fillStyle = SNOW.body;
  ctx.beginPath();
  ctx.moveTo(x - rx - 50, y + 12);
  ctx.quadraticCurveTo(x - rx + 10, y - 22, x - 20, y - 8);
  ctx.quadraticCurveTo(x + 40, y + 2, x + rx + 60, y + 12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgba(SNOW.lit, 0.85);
  ctx.beginPath();
  ctx.moveTo(x - rx - 46, y + 10);
  ctx.quadraticCurveTo(x - rx + 10, y - 22, x - 24, y - 8);
  ctx.quadraticCurveTo(x - rx + 10, y - 10, x - rx - 46, y + 10);
  ctx.fill();
}

/** The near snow at the table's back edge: a wind-scoured lip. */
function bank(ctx: Ctx, r: R): void {
  const top = (x: number) => TY - 10 - Math.max(0, Math.sin(x / 150 + 0.4)) * 9 - wave1(x, 11) * 3;
  const path: PathFn = (c) => {
    c.beginPath();
    c.moveTo(-4, TY + 4);
    for (let x = -4; x <= W + 4; x += 6) c.lineTo(x, top(x));
    c.lineTo(W + 4, TY + 4);
    c.closePath();
  };
  path(ctx);
  const g = ctx.createLinearGradient(0, TY - 30, 0, TY + 4);
  g.addColorStop(0, SNOW.lit);
  g.addColorStop(0.5, '#c0d0ee');
  g.addColorStop(1, '#7a90c4');
  ctx.fillStyle = g;
  ctx.fill();
  within(ctx, path, () => {
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = rgba('#5a70b0', 0.25);
      ctx.beginPath();
      ctx.ellipse(r() * W, TY - 2, 20 + r() * 40, 2 + r() * 2, 0, 0, P2);
      ctx.fill();
    }
    const lg = ctx.createLinearGradient(0, 0, W, 0);
    lg.addColorStop(0, 'rgba(255,255,255,0.1)');
    lg.addColorStop(1, 'rgba(10,20,60,0.2)');
    ctx.fillStyle = lg;
    ctx.fillRect(0, TY - 30, W, 36);
  });
  ctx.strokeStyle = rgba('#ffffff', 0.6);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 6) ctx.lineTo(x, top(x) + 1);
  ctx.stroke();
}

// ——— the table: a slab of the gate's rune-carved granite ———

function table(ctx: Ctx, r: R): void {
  const f = JH.front;
  const box = { x: 0, y: TY, w: W, h: f - TY };
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, f - TY + 4);
  ctx.clip();
  vfill(ctx, 0, TY, W, f - TY, [[0, '#262e48'], [0.45, '#333c5a'], [1, '#3e4866']]);
  surface(ctx, r, box, '#343c5a', { over: true, vary: 0.3, cells: 6, mottle: 0.2, strokes: 0.3, strokeAng: 0, strokeLen: 300, strokeW: 4, grain: 0.12, seed: 71 });
  // granite: a fine speckle of feldspar and mica through it, and the key light's soft sheen on the polish from the left
  grain(ctx, box, 'speckle', 0.22, 1.2);
  lightPool(ctx, 360, TY + 90, 760, 120, '#c8d6ff', 0.07);
  // the slab's joints running into it in perspective, and cracks
  for (const X of [-1.4, 1.3]) {
    ctx.strokeStyle = rgba('#0a0c1a', 0.55);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(xAt(X, ZB), TY);
    ctx.lineTo(xAt(X, zFront(f)), f);
    ctx.stroke();
    ctx.strokeStyle = rgba('#8a96bc', 0.25);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(xAt(X, ZB) + 2, TY);
    ctx.lineTo(xAt(X, zFront(f)) + 3, f);
    ctx.stroke();
  }
  for (let i = 0; i < 7; i++) {
    let X = (r() - 0.5) * 4.4;
    let z = ZB - r() * 0.3;
    const pts: Pt[] = [[xAt(X, z), yAt(z)]];
    const zf = zFront(f);
    for (let k = 0; k < 6 && z > zf; k++) {
      X += (r() - 0.5) * 0.3;
      z -= 0.05 + r() * 0.12;
      pts.push([xAt(X, z), yAt(z)]);
    }
    for (const [dy, col, a, w] of [[1.2, '#06080f', 0.45, 1.6], [0, '#9aa8cc', 0.22, 1]] as const) {
      ctx.strokeStyle = rgba(col, a);
      ctx.lineWidth = w;
      ctx.beginPath();
      pts.forEach(([x, y], j) => (j ? ctx.lineTo(x, y + dy) : ctx.moveTo(x, y + dy)));
      ctx.stroke();
    }
  }
  // hoarfrost: thick on the back edge where the drift meets it, blooming in from the corners, feathered
  vfill(ctx, 0, TY, W, 30, [[0, rgba('#eef4ff', 0.5)], [1, rgba('#dce6f8', 0)]]);
  for (const [cx, sx] of [[0, 1], [W, -1]] as const) {
    softly(ctx, { x: sx > 0 ? 0 : W - 520, y: TY, w: 520, h: f - TY }, (g) => {
      const rg = g.createRadialGradient(cx, f, 0, cx, f, 420);
      rg.addColorStop(0, 'rgba(226,238,255,0.4)');
      rg.addColorStop(0.6, 'rgba(226,238,255,0.12)');
      rg.addColorStop(1, 'rgba(226,238,255,0)');
      g.fillStyle = rg;
      g.fillRect(sx > 0 ? 0 : W - 520, TY, 520, f - TY);
    }, 0.25);
    // the frost's crystal net, thick in the corner and thinning out into the polish
    const bx = sx > 0 ? 0 : W - 520;
    const [fc, fg] = makeCanvas(520, f - TY);
    lay(fg, noiseMask(16, 131 + sx, { kind: 'web', cover: 0.5, soft: 0.08, col: '#eef6ff', w: 260, h: 70 }), { x: 0, y: 0, w: 520, h: f - TY }, 1);
    fg.globalCompositeOperation = 'destination-in';
    const mg = fg.createRadialGradient(cx - bx, f - TY, 0, cx - bx, f - TY, 380);
    mg.addColorStop(0, 'rgba(0,0,0,0.36)');
    mg.addColorStop(0.5, 'rgba(0,0,0,0.12)');
    mg.addColorStop(1, 'rgba(0,0,0,0)');
    fg.fillStyle = mg;
    fg.fillRect(0, 0, 520, f - TY);
    ctx.drawImage(fc, bx, TY);
    // the rime thickest right in the corner: a bright bloom of hoarfrost
    softly(ctx, { x: bx, y: TY, w: 520, h: f - TY }, (g) => {
      const cg = g.createRadialGradient(cx, f, 0, cx, f, 150);
      cg.addColorStop(0, 'rgba(240,248,255,0.5)');
      cg.addColorStop(0.5, 'rgba(230,242,255,0.18)');
      cg.addColorStop(1, 'rgba(230,242,255,0)');
      g.fillStyle = cg;
      g.fillRect(bx, TY, 520, f - TY);
    }, 0.25);
  }
  // the moon's sheen on the polished stone, on the left; the aurora's green faint in it
  const sh = ctx.createRadialGradient(520, 880, 0, 520, 880, 520);
  sh.addColorStop(0, 'rgba(220,232,255,0.1)');
  sh.addColorStop(1, 'rgba(220,232,255,0)');
  ctx.fillStyle = sh;
  ctx.save();
  ctx.translate(520, 880);
  ctx.scale(1, 0.28);
  ctx.translate(-520, -880);
  ctx.fillRect(0, 300, 1100, 1200);
  ctx.restore();
  vfill(ctx, 0, TY + 30, W, 100, [[0, 'rgba(60,255,170,0)'], [0.4, 'rgba(60,255,170,0.04)'], [1, 'rgba(60,255,170,0)']]);
  ctx.restore();
  tableFalloff(ctx, f, 0.3, '#060a1c');
  tableSeam(ctx, 0.45, '#0e1430', false);
  // the slab's front: a carved frieze of runes, their inlay faintly lit
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, f, W, 1080 - f);
  ctx.clip();
  vfill(ctx, 0, f, W, 1080 - f, [[0, '#2e3654'], [0.4, '#20263e'], [1, '#10142a']]);
  surface(ctx, r, { x: 0, y: f, w: W, h: 40 }, '#252c48', { over: true, vary: 0.3, cells: 8, grain: 0.35, grainKind: 'stone', seed: 77 });
  for (let x = 24, i = 0; x < W - 10; x += 32, i++) carvedRune(ctx, i * 7 + (i % 3), x, f + 9, 24, 0.5);
  ctx.restore();
  ctx.fillStyle = rgba('#e8f2ff', 0.55);
  ctx.fillRect(0, f - 2, W, 2.5);
  ctx.fillStyle = rgba('#060814', 0.85);
  ctx.fillRect(0, f, W, 1.6);
}

// ——— the grade and the shade ———

function grade(ctx: Ctx): void {
  gradeAll(ctx, 0.04, '#d0e0ff', 0.05, { warm: '#ffe4bc', cool: '#3a5ab8', a: 0.2 });
}

function shadeOver(ctx: Ctx): void {
  calmLanes(ctx, 0.12, '#060c22', 70, 640);
  vignetteAll(ctx, 0.55, '#02040e');
}

// ——— spindrift and snow snakes (frames) ———

const PLW = 420;
const PLH = 150;
const PL_SRC: Pt = [14, 60];

/** One frame of a spindrift plume (ph 0…1 loops): puffs of snow torn off an edge, swelling and thinning as they stream
 * away to the right, lit on top by the moon, their bellies blue. */
function plumeFrame(c: Ctx, ph: number, seed: string): void {
  const N = 32;
  for (let i = 0; i < N; i++) {
    const rr = rng(hashStr(seed + i));
    const age = (i / N + ph + rr() * 0.02) % 1;
    const x = PL_SRC[0] + age ** 0.85 * (PLW - 80) + (rr() - 0.5) * 20 * age;
    const y = PL_SRC[1] - age * 10 + Math.sin(age * 7 + i * 1.3) * 12 * age + (rr() - 0.5) * 26 * age;
    const rad = 8 + age * (38 + rr() * 18);
    const a = 0.58 * (1 - age) ** 1.1 * Math.min(1, age * 4);
    if (a < 0.01) continue;
    const g = c.createRadialGradient(x - rad * 0.3, y - rad * 0.35, 0, x, y, rad);
    g.addColorStop(0, `rgba(240,246,255,${a.toFixed(3)})`);
    g.addColorStop(0.55, `rgba(176,196,236,${(a * 0.55).toFixed(3)})`);
    g.addColorStop(1, 'rgba(120,140,200,0)');
    c.fillStyle = g;
    c.save();
    c.translate(x, y);
    c.scale(1.7, 0.7);
    c.translate(-x, -y);
    c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    c.restore();
  }
  for (let i = 0; i < 36; i++) {
    const rr = rng(hashStr(seed + 's' + i));
    const age = (i / 36 + ph * 2) % 1;
    if (age < 0.15) continue;
    const x = PL_SRC[0] + age * (PLW - 60);
    const y = PL_SRC[1] - age * 6 + (rr() - 0.5) * 50 * (0.3 + age);
    const l = 10 + rr() * 24;
    c.strokeStyle = `rgba(236,242,255,${(0.4 * (1 - age)).toFixed(3)})`;
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + l, y + l * 0.05);
    c.stroke();
  }
}

/** The plumes' sources: the falls' lip and the broken megalith's top. */
const PLUMES: { x: number; y: number; s: number; seed: string }[] = [
  { x: JH.lip.x1 - 50, y: 216, s: 1, seed: 'jh:plumeA' },

  { x: JH.p2.x0 + 40, y: JH.p2.top - 2, s: 0.8, seed: 'jh:plumeB' },
];

/** The snow snakes' bands across the ice (far to near): the band's top and height on screen, its scale, and the
 * wind speed it streams at (px/s, before the gusts). */
const SNAKE_BANDS: { y: number; h: number; k: number; v: number }[] = [
  { y: 556, h: 40, k: 0.3, v: 50 },
  { y: 600, h: 70, k: 0.55, v: 110 },
  { y: 668, h: 96, k: 0.9, v: 220 },
];
const SNAKE_TW = 1024;
/** The open ice the snakes can be seen on (x0, y0, x1, y1): between the cliff and the gate, round the sword's blade,
 * over the lintel, between the stones, and along the near drift either side of the helm. */
const SNAKE_OPEN: [number, number, number, number][] = [
  [584, 548, 668, 770],
  [668, JH.sword.base + 6, 736, 770],
  [736, 548, 1262, 770],
  [1262, 548, JH.p2.x0 - 8, 686],
  [JH.p2.x1 + 6, 548, JH.p1.x0 - 8, 686],
  [0, 724, JH.helm.x - 90, 770],
  [JH.helm.x + 130, 724, 584, 770],
];

/** A tile of snow snakes (seamless across its width): ribbons of blown snow skimming the crust, snaking, broken into
 * runs, each run a string of soft streaks lit on top. */
function snakeTile(c: Ctx, h: number, k: number, seed: number): void {
  const w = SNAKE_TW;
  const rr = rng(hashStr('jh:snakes' + seed));
  const rows = 3 + Math.round(k * 3);
  for (let j = 0; j < rows; j++) {
    const y0 = h * (0.15 + 0.7 * ((j + rr() * 0.5) / rows));
    const m = 1 + Math.floor(rr() * 3);
    const m2 = 2 + Math.floor(rr() * 3);
    const off = rr() * P2;
    const off2 = rr() * P2;
    for (let x = 0; x < w; x += 3) {
      const gate = Math.max(0, Math.sin((x / w) * P2 * m + off)) ** 1.6;
      if (gate < 0.06) continue;
      const y = y0 + Math.sin((x / w) * P2 * m2 + off2) * 5 * k;
      const rad = (2 + gate * 5) * k + 1;
      const a = 0.22 * gate;
      // a soft body, and the ragged streaks of grains it's made of, torn out ahead of it on the wind
      const streaks = [[rr() - 0.5, 6 + rr() * 26], [rr() - 0.5, 4 + rr() * 18]].map(([dy, len]) => [dy * rad * 1.4, len * k * (0.5 + gate)] as const);
      for (const ox of [0, -w, w]) {
        const cx = x + ox;
        if (cx < -rad * 12 || cx > w + rad * 12) continue;
        const g = c.createRadialGradient(cx, y, 0, cx, y, rad * 2);
        g.addColorStop(0, `rgba(240,246,255,${(a * 0.6).toFixed(3)})`);
        g.addColorStop(1, 'rgba(200,214,245,0)');
        c.fillStyle = g;
        c.save();
        c.translate(cx, y);
        c.scale(3.2, 0.5);
        c.translate(-cx, -y);
        c.fillRect(cx - rad * 2, y - rad * 2, rad * 4, rad * 4);
        c.restore();
        if (x % 6 === 0) {
          for (const [dy, len] of streaks) {
            c.strokeStyle = `rgba(244,248,255,${(a * 0.9).toFixed(3)})`;
            c.lineWidth = Math.max(0.8, 1.4 * k);
            c.beginPath();
            c.moveTo(cx, y + dy);
            c.lineTo(cx + len, y + dy - len * 0.03);
            c.stroke();
          }
        }
      }
    }
  }
}

/** A long horizontal streak tile of driving snow (the blizzard's). */
function streakTile(c: Ctx, w: number, h: number): void {
  const rr = rng(hashStr('jh:streaks'));
  for (let i = 0; i < 160; i++) {
    const x = rr() * w;
    const y = rr() * h;
    const len = 20 + rr() * 70;
    const a = 0.25 + rr() * 0.5;
    for (const ox of [0, -w, w]) {
      const g = c.createLinearGradient(x + ox, 0, x + ox + len, 0);
      g.addColorStop(0, 'rgba(240,246,255,0)');
      g.addColorStop(0.7, `rgba(240,246,255,${a.toFixed(3)})`);
      g.addColorStop(1, 'rgba(240,246,255,0)');
      c.strokeStyle = g;
      c.lineWidth = 1 + rr() * 1.6;
      c.beginPath();
      c.moveTo(x + ox, y);
      c.lineTo(x + ox + len, y + len * 0.18);
      c.stroke();
    }
  }
}

/** The runes' cold light (added in the live layer): a halo round every carved rune on the gate and the lintel. */
function runeGlow(ctx: Ctx): void {
  for (const [x, y, s] of GATE_RUNES) glowAt(ctx, x + s * 0.3, y + s * 0.5, s * 1.4, RUNE, 0.32);
  for (let x = JH.lintel.x0 + 16; x < JH.lintel.x1 - 20; x += 30) glowAt(ctx, x + 7, lerp(JH.lintel.y0, JH.lintel.y1, (x - JH.lintel.x0) / (JH.lintel.x1 - JH.lintel.x0)) + 20, 26, RUNE, 0.22);
}

// ——— the stack ———
//
// The live sky (the overcast, the storm, the red glow, the aurora and the clouds) all ends at the horizon, where the
// ice sheet begins; whatever rises above the horizon in front of it (the range, the sword, the cliff and the falls,
// the gate) is split there, so only its upper half has to be baked over the live sky and the rest stays in the base.

const HOR = JH.hor;
const SKY_BOX = { x: 0, y: 0, w: W, h: HOR };
const AURORA_BOX = { x: 0, y: 0, w: W, h: JH.auroraH };
const FAR_BOX = { x: 0, y: 290, w: W, h: HOR - 290 };
const PLAIN_BOX = { x: 0, y: HOR, w: W, h: TY + 12 - HOR };
const SWORD_BOX = { x: 586, y: JH.sword.pommel - 16, w: 440, h: JH.sword.base + 50 - JH.sword.pommel };
const CLIFF_BOX = { x: 0, y: 132, w: 580, h: JH.cliffFoot + 14 - 132 };
const FALLS_BOX = { x: 70, y: JH.lip.y - 30, w: 380, h: JH.cliffFoot + 40 - JH.lip.y };
const FOOT_BOX = { x: 0, y: 620, w: 600, h: TY - 620 };
const GATE_BOX = { x: 1290, y: 0, w: W - 1290, h: JH.p1.foot + 30 };
const LINTEL_BOX = { x: 1240, y: 660, w: W - 1240, h: TY - 660 };
const HELM_BOX = { x: 20, y: 560, w: 340, h: TY - 560 };
const RUNE_BOX = { x: 1240, y: 150, w: W - 1240, h: 620 };

/** A tall thing standing up over the horizon, as two layers split at it: the half below (in the base) and the half
 * over the live sky (baked over it). Both paint with the same random stream, so they match; the upper half runs a few
 * px down over the lower one, so when the stage is drawn scaled the filtering at its bottom edge picks up the same
 * paint underneath, not the sky. (Every lower half comes before every upper half in the stack, or that overlap would
 * pull the lower halves after it out of the base too; things in front still paint over things behind, as the upper
 * halves repaint the overlap in the same order.) */
function halves(parts: [string, { x: number; y: number; w: number; h: number }, (c: Ctx, r: R) => void, { x: number; w: number }?][]): SceneSpec['layers'] {
  const OVER = 4;
  const part = (id: string, box: { x: number; w: number }, draw: (c: Ctx, r: R) => void, y0: number, y1: number) => (c: Ctx) => {
    c.beginPath();
    c.rect(box.x, y0, box.w, y1 - y0);
    c.clip();
    draw(c, rng(hashStr('jh:' + id)));
  };
  return [
    ...parts.map(([id, box, draw]) => ({ id: id + 'Low', box: { x: box.x, y: HOR, w: box.w, h: box.y + box.h - HOR }, draw: part(id, box, draw, HOR, box.y + box.h) })),
    // (an upper half can be cut narrower than the whole: only what stands above the horizon)
    ...parts.map(([id, box, draw, top = box]) => ({ id: id + 'Top', box: { x: top.x, y: box.y, w: top.w, h: HOR + OVER - box.y }, draw: part(id, top, draw, box.y, HOR + OVER) })),
  ];
}

export const JOTUNHEIM: SceneSpec = {
  id: 'jotunheim',
  info: {
    name: 'Jotunheim Ice Fields',
    subtitle: 'Waves 71–74',
    ambient: [],
    // (the aurora, the snow, the runes' light are the live layer's)
    glows: [],
    light: '#c8d8f8',
    tableTint: '#e8f0fc',
  },
  layers: [
    { id: 'sky', box: SKY_BOX, draw: sky },
    { id: 'cloudSky', box: SKY_BOX, liveOnly: true, res: 0.3, draw: cloudSky },
    { id: 'stormSky', box: SKY_BOX, liveOnly: true, res: 0.3, draw: stormSky },
    { id: 'redGlow', box: { x: 0, y: 300, w: W, h: HOR - 300 }, liveOnly: true, res: 0.25, draw: (c) => redGlow(c) },
    { id: 'auroraStill', box: AURORA_BOX, stillOnly: true, draw: (c) => aurora(c, 0.15) },
    { id: 'aurora', box: AURORA_BOX, motion: 'slot', draw: () => {} },
    { id: 'far', box: FAR_BOX, draw: (c, r) => {
      c.beginPath();
      c.rect(0, 0, W, HOR);
      c.clip();
      farRange(c, r);
    } },
    { id: 'farHaze', box: { x: 0, y: 240, w: W, h: HOR - 240 }, liveOnly: true, res: 0.25, draw: (c) => farHaze(c) },
    { id: 'plain', box: PLAIN_BOX, draw: plain },
    ...halves([
      ['sword', SWORD_BOX, sword, { x: 592, w: 210 }],
      ['cliff', CLIFF_BOX, cliff],
      ['falls', FALLS_BOX, falls],
      ['gate', GATE_BOX, gate, { x: JH.p2.x0 - 14, w: W - JH.p2.x0 + 14 }],
    ]),
    { id: 'fallsFoot', box: FOOT_BOX, draw: fallsFoot },
    { id: 'lintel', box: LINTEL_BOX, draw: lintel },
    { id: 'helm', box: HELM_BOX, draw: helm },
    { id: 'plumesStill', box: { x: 0, y: 80, w: W, h: 420 }, stillOnly: true, draw: (c) => {
      for (const p of PLUMES) {
        c.save();
        c.translate(p.x, p.y);
        c.scale(p.s, p.s);
        c.translate(-PL_SRC[0], -PL_SRC[1]);
        c.globalAlpha = 0.45;
        plumeFrame(c, 0.3, p.seed);
        c.restore();
      }
    } },
    { id: 'bank', box: { x: 0, y: TY - 40, w: W, h: 46 }, draw: bank },
    { id: 'table', box: { x: 0, y: TY, w: W, h: 1080 - TY }, draw: table },
    // (the runes' cold light goes over everything it touches: last, so nothing has to be baked over it)
    { id: 'runeGlow', box: RUNE_BOX, liveOnly: true, res: 0.33, draw: (c) => runeGlow(c) },
    { id: 'top', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

// ——— live ———

/** An icicle shard (frame i of a few), half px square. */
function shardFrame(c: Ctx, half: number, i: number): void {
  const rr = rng(hashStr('jh:shard' + i));
  const len = half * (0.9 + rr() * 0.5);
  icicle(c, half, half - len / 2, len, 4 + rr() * 4);
}

registerKitScene(JOTUNHEIM, (k: KitLive, wave0: number) => {
  const top = k.slot('top');
  const auroraSlot = k.slot('aurora');
  const cloudS = k.sprite('cloudSky');
  const stormS = k.sprite('stormSky');
  const redS = k.sprite('redGlow').setBlendMode(Phaser.BlendModes.ADD);
  const hazeS = k.sprite('farHaze');
  const runeS = k.sprite('runeGlow').setBlendMode(Phaser.BlendModes.ADD);

  // ——— hero: the aurora ———
  const RA = 0.22;
  const AN = 10;
  const AH = JH.auroraH;
  const aKey = sheet(k, 'jh_aurora', W * RA, AH * RA, AN, (c, ph) => {
    c.scale(RA, RA);
    aurora(c, ph);
  });
  const aur = new Loop(k, aKey, AN, 0, 0, { into: auroraSlot, origin: [0, 0], scale: 1 / RA, add: true, fps: 1.1 });
  const aurGlow = k.glow(760, 300, 760, 0x30ffa0, 0.06, { into: auroraSlot, sy: 0.4 });

  // the clouds coming over: soft banks drifting right behind the range, wrapping round
  const CW = 520;
  const CH = 150;
  // (painted at half size, shown doubled: they're soft)
  const cloudKeys = [0, 1].map((i) => k.tex('jh_cloud' + i, CW / 2, CH / 2, (c) => {
    c.scale(0.5, 0.5);
    const rr = rng(hashStr('jh:cloud' + i));
    cloud(c, rr, CW / 2, CH - 30, CW * 0.7, 46 + i * 8, { lit: '#c4d0ec', body: '#7a88b0', shadow: '#2e3858', sunX: -400, sunY: -300, rim: 0.3, wisp: 0.6, kind: i ? 'stratus' : 'bank', res: 0.5 });
  }));
  const clouds = Array.from({ length: 9 }, (_, i) => {
    const y = 70 + (i % 5) * 80 + crand() * 30;
    const s = 1.1 + (y / JH.hor) * 0.4 + crand() * 0.5;
    const im = k.img(cloudKeys[i % 2], (i / 9) * (W + CW) - CW / 2, y, { into: auroraSlot, alpha: 0, sx: s * 2, sy: s * 1.6 });
    im.setData('v', 6 + crand() * 8);
    return im;
  });

  // ——— hero: the wind and the snow ———
  const RP = 0.35;
  const PN = 10;
  const plumes = PLUMES.map((p, i) => {
    const key = sheet(k, 'jh_plume' + i, PLW * RP, PLH * RP, PN, (c, ph) => {
      c.scale(RP, RP);
      plumeFrame(c, ph, p.seed);
    });
    return { p, loop: new Loop(k, key, PN, p.x, p.y, { into: top, origin: [PL_SRC[0] / PLW, PL_SRC[1] / PLH], scale: p.s / RP, fps: 1.6 }) };
  });
  // snow snakes streaming across the ice: a seamless band of them at each depth, scrolled with the wind (faster and
  // bigger nearer us), each band twice over at two speeds so the runs pass through each other and never repeat
  // (they skim the open ice only: masked off where the cliff, the sword's blade, the stones, the lintel and the helm
  // stand in front of them)
  const snakeC = k.sc.add.container(0, 0);
  top.add(snakeC);
  const open = k.sc.make.graphics({}, false);
  open.fillStyle(0xffffff, 1);
  for (const [x0, y0, x1, y1] of SNAKE_OPEN) open.fillRect(x0, y0, x1 - x0, y1 - y0);
  snakeC.setMask(open.createGeometryMask());
  const snakes = SNAKE_BANDS.map((b, i) => {
    const key = k.tex('jh_snakes' + i, SNAKE_TW, b.h, (c) => snakeTile(c, b.h, b.k, i));
    const mk = (sx: number) => {
      const ts = k.sc.add.tileSprite(0, b.y, W, b.h, key).setOrigin(0, 0).setAlpha(0).setTileScale(sx, 1);
      snakeC.add(ts);
      return ts;
    };
    return { b, a: mk(1), c: mk(1.6).setFlipY(true) };
  });

  const T = 256;
  const snowFar = k.sc.add.tileSprite(0, 0, W, 1080, k.tex('jh_snow0', T, T, (c) => snowTile(c, T, 0))).setOrigin(0, 0).setAlpha(0);
  const snowNear = k.sc.add.tileSprite(0, 0, W, 1080, k.tex('jh_snow1', T, T, (c) => snowTile(c, T, 1))).setOrigin(0, 0).setAlpha(0);
  const ST = 256;
  // (the driving streaks stay over the land: the table and the pizzas on it stay clear for the frost to read)
  const streaks0 = k.sc.add.tileSprite(0, 0, W, TY + 6, k.tex('jh_streak', ST, ST, (c) => streakTile(c, ST, ST))).setOrigin(0, 0).setAlpha(0).setTileScale(2, 2);
  const streaks1 = k.sc.add.tileSprite(0, 0, W, TY + 6, 'jh_streak').setOrigin(0, 0).setAlpha(0).setTileScale(3.6, 3.6);
  top.add([snowFar, snowNear, streaks0, streaks1]);
  // a whiteout veil: the gusts' snow filling the air for a moment
  const veil = k.sc.add.rectangle(W / 2, 540, W, 1080, 0xc8d2e8, 1).setAlpha(0);
  top.add(veil);

  // the light over everything: dimming and cooling as the cloud comes over, the storm's dark
  const dim = k.wash(0x8a94b0, 0, Phaser.BlendModes.MULTIPLY, top);
  const storm = k.wash(0x5a5a70, 0, Phaser.BlendModes.MULTIPLY, top);
  const ember = k.glow(1240, JH.hor + 40, 1100, 0xff4a20, 0, { into: top, sy: 0.3 });

  // diamond dust: ice crystals glinting in the still, clear cold
  const dust = new Parts(k, { frame: 'spark', add: true, into: top, max: 60 });
  const dustRate = new Rate();
  const glints = new Parts(k, { frame: 'spark', add: true, into: top, max: 30 });
  const glintRate = new Rate();
  // spindrift skimming the ice in the gusts
  const skimP = new Parts(k, { frame: 'soft', into: top, max: 90 });
  const skimRate = new Rate();

  // stomps: powder, icicle shards, snow off the ledges
  const powder = new Parts(k, { frame: 'puff', into: top, max: 60 });
  const motes = new Parts(k, { frame: 'mote', into: top, max: 160 });
  const shardKey = sheet(k, 'jh_shard', 32, 32, 4, (c, _p, i) => shardFrame(c, 16, i));
  const shards = new Parts(k, { frame: 'mote', sheet: { key: shardKey, n: 4, half: 16 }, into: top, max: 40 });
  const puff = (x: number, y: number, n: number, big = 1) => {
    for (let i = 0; i < n; i++) powder.spawn({ x: x + (crand() - 0.5) * 40 * big, y: y - crand() * 10, vx: (crand() - 0.3) * 80 * big, vy: -20 - crand() * 50 * big, life: 1.4 + crand(), r0: 10 * big, r1: (36 + crand() * 30) * big, a: 0.35, tint: 0xdce6fa, drag: 1.2, fade: 0.15 });
  };
  const burst = (x: number, y: number) => {
    for (let i = 0; i < 7; i++) motes.spawn({ x, y, vx: (crand() - 0.5) * 140, vy: -60 - crand() * 120, life: 0.6, r0: 3, r1: 1.5, a: 0.9, tint: 0xe4f2ff, grav: 700, fade: 0.05 });
    glints.spawn({ x, y: y - 4, life: 0.25, r0: 10, r1: 2, a: 0.8, tint: 0xd8f0ff, fade: 0.2 });
  };
  const dropIcicle = (sx: number, sy: number, floor: number) => {
    shards.spawn({ x: sx, y: sy, vx: (crand() - 0.5) * 20, vy: 10, life: 2.4, r0: 12 + crand() * 7, a: 1, tint: 0xffffff, grav: 1400, floor, onFloor: (x, y) => burst(x, y), spin: (crand() - 0.5) * 2 });
  };
  const sift = (x0: number, x1: number, y: number, floor: number, n: number) => {
    for (let i = 0; i < n; i++) motes.spawn({ x: x0 + crand() * (x1 - x0), y, vx: 6 + crand() * 20, vy: 10 + crand() * 30, life: 2.4, r0: 2 + crand() * 2.5, a: 0.85, tint: 0xeef4ff, grav: 260, drag: 0.6, floor, fade: 0.05 });
  };

  let kw = waveK(wave0);
  let shown = kw;
  let gust = 0.3;
  let gustT = 3;
  let flare = 0;

  return {
    setWave: (w) => (kw = waveK(w)),
    destroy: () => {
      snakeC.clearMask(true);
      open.destroy();
    },
    impact(x, _y, p) {
      flare = Math.min(1.5, flare + 0.6 + p);
      gust = Math.min(1.6, gust + 0.5 * p);
      const n = Math.round(2 + p * 4);
      for (let i = 0; i < n; i++) {
        if (x < 960 || crand() < 0.3) {
          const [sx, sy] = FALL_SPOTS[Math.floor(crand() * FALL_SPOTS.length)];
          dropIcicle(sx, sy, JH.cliffFoot - 30 + crand() * 20);
        } else {
          const [sx, sy] = LINTEL_SPOTS[Math.floor(crand() * LINTEL_SPOTS.length)];
          dropIcicle(sx, sy, sy + 26 + crand() * 8);
        }
      }
      // snow shaken off the falls' brink, sifting down its face
      sift(JH.lip.x0, JH.lip.x1, 224, JH.cliffFoot - 30, Math.round(3 + p * 6));
      if (p > 0.3) {
        // powder slides off the column tops and the broken stone, and boils up at the falls' foot
        sift(20, 440, 190, JH.cliffFoot - 20, Math.round(6 * p));
        sift(JH.p2.x0 + 10, JH.p2.x1 - 10, JH.p2.top + 10, JH.p2.foot - 10, Math.round(5 * p));
        k.sc.time.delayedCall(380, () => puff(260, JH.cliffFoot - 10, 3 + p * 4, 1.1));
      }
      puff(Math.max(40, Math.min(W - 40, x)), TY - 6, 3 + p * 4, 0.8);
    },
    update(dt, t) {
      const cm = calm();
      shown += (kw - shown) * Math.min(1, dt * 0.6);
      // 0 the clear aurora night … 0.33 high cloud … 0.66 snow under an overcast … 1 the blizzard, the horizon red
      const cloudK = ease(clamp01(shown / 0.5));
      const stormK = ease(clamp01((shown - 0.55) / 0.45));
      const snowK = clamp01((shown - 0.2) / 0.5);
      const clearK = 1 - cloudK;
      cloudS.setAlpha(cloudK * (1 - stormK * 0.6));
      stormS.setAlpha(stormK);
      hazeS.setAlpha(clamp01((shown - 0.45) / 0.55) * (0.45 + 0.35 * gust));
      redS.setAlpha(stormK * (0.75 + 0.25 * Math.sin(t * 1.1) * Math.sin(t * 0.37 + 1)));
      ember.setAlpha(stormK * 0.08 * (0.8 + 0.2 * Math.sin(t * 1.3)));
      dim.setAlpha(cloudK * 0.32);
      storm.setAlpha(stormK * 0.35);

      // the aurora: slow folding, breathing; going out as the cloud comes over
      aur.step(dt, cm);
      const br = 0.85 + 0.15 * Math.sin(t * 0.21) * Math.sin(t * 0.13 + 1);
      aur.alpha = br * clamp01(1 - shown * 1.6);
      aurGlow.setAlpha(0.06 * br * clearK);
      for (const c of clouds) {
        c.x += Number(c.getData('v')) * (1 + stormK * 3) * dt * cm;
        if (c.x > W + CW) c.x = -CW;
        c.setAlpha(cloudK * (1 - stormK * 0.3) * 0.85);
        const v = Math.round(255 - stormK * 120);
        c.setTint(Phaser.Display.Color.GetColor(v, Math.round(v * (1 - stormK * 0.12)), Math.round(v * (1 - stormK * 0.06))));
      }

      // the wind: calm and clear at first, gusting harder wave by wave
      const base = 0.2 + shown * 0.7 + 0.25 * Math.max(0, Math.sin(t * 0.23) * Math.sin(t * 0.61 + 2));
      gust += (base - gust) * Math.min(1, dt * 0.8);
      if (stormK > 0.5) {
        gustT -= dt;
        if (gustT <= 0) {
          gustT = 2.5 + crand() * 3.5;
          gust = Math.min(1.8, gust + 0.6);
          veil.setAlpha(Math.max(veil.alpha, 0.13 * stormK));
        }
      }
      veil.setAlpha(Math.max(0, veil.alpha - dt * 0.09));
      for (const { loop } of plumes) {
        loop.step(dt, (0.6 + gust) * cm);
        loop.alpha = clamp01(0.45 + gust * 0.5);
      }
      for (const { b, a, c } of snakes) {
        const v = b.v * (0.4 + gust * 1.6) * cm;
        a.tilePositionX -= v * dt;
        c.tilePositionX -= (v * 1.35 * dt) / 1.6;
        const al = clamp01(0.15 + gust * 0.7);
        a.setAlpha(al);
        c.setAlpha(al * 0.7);
      }
      // snow: none in the clear, falling under the overcast, driving sideways in the blizzard
      snowFar.setAlpha(snowK * 0.45);
      snowNear.setAlpha(snowK * 0.3);
      snowFar.tilePositionY -= (40 - stormK * 10) * dt * cm;
      snowFar.tilePositionX -= (20 + gust * 160) * dt * cm;
      snowNear.tilePositionY -= (90 - stormK * 20) * dt * cm;
      snowNear.tilePositionX -= (50 + gust * 380) * dt * cm;
      streaks0.setAlpha(stormK * (0.2 + 0.16 * gust));
      streaks1.setAlpha(stormK * (0.12 + 0.14 * gust));
      streaks0.tilePositionX -= ((700 + gust * 400) * dt * cm) / 2;
      streaks0.tilePositionY -= (120 * dt * cm) / 2;
      streaks1.tilePositionX -= ((1100 + gust * 600) * dt * cm) / 3.6;
      streaks1.tilePositionY -= (200 * dt * cm) / 3.6;
      skimRate.tick((3 + gust * 30) * cm, dt, () => {
        const y = JH.hor + 30 + crand() ** 0.7 * (TY - JH.hor - 40);
        const kk = kAt(y);
        const vx = (160 + gust * 360) * kk;
        skimP.spawn({ x: crand() * W * 0.8, y, vx, vy: -4 * kk, life: 0.6 + crand() * 0.9, r0: 3 * kk, r1: 7 * kk, a: 0.3, tint: 0xe8f0ff, streak: 0.05, fade: 0.35 });
      });
      // diamond dust in the clear cold, drifting and winking
      dustRate.tick(6 * clearK * cm, dt, () => {
        dust.spawn({ x: 80 + crand() * (W - 160), y: 120 + crand() * 560, vx: 6 + crand() * 10, vy: 4 + crand() * 8, life: 2 + crand() * 2, r0: 3 + crand() * 4, r1: 1, a: 0.6 + crand() * 0.3, tint: crand() < 0.3 ? 0xc0ffe8 : 0xe8f2ff, fade: 0.45 });
      });
      // moonlight glinting off the falls and the ice while the sky is clear
      glintRate.tick(1.6 * clearK * cm, dt, () => {
        const pick = crand();
        const [gx, gy] = pick < 0.45 ? [120 + crand() * 280, 270 + crand() * 420] : [crand() * W, JH.hor + 10 + crand() * 190];
        glints.spawn({ x: gx, y: gy, life: 0.3 + crand() * 0.3, r0: 6 + crand() * 5, r1: 1, a: 0.7, tint: 0xd8ecff, fade: 0.4 });
      });

      // the runes: breathing, flaring on a stomp, brighter as Ragnarök nears
      flare = Math.max(0, flare - dt * 0.8);
      const breathe = 0.75 + 0.25 * Math.sin(t * 0.9) * Math.sin(t * 0.37 + 2);
      runeS.setAlpha(clamp01((0.35 + shown * 0.4) * breathe + flare * 0.5));

      dust.update(dt);
      glints.update(dt);
      skimP.update(dt);
      powder.update(dt);
      motes.update(dt);
      shards.update(dt);
    },
  };
});
