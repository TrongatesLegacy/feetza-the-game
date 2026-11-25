// The Goat Path (the arena of THE IMMORTAL BRUTE, the mini-boss of King Leonidas's Hot Gates nemesis stage, wave 83),
// redrawn with the location kit (src/art/scene). Of a piece with the Hot Gates (scene-hotgates.ts): the same limestone
// massif, maquis and pines, drystone, bronze, and the Persian host's fires; but by night, high on the mountain, on the
// hidden track that turned the pass. Ancient Greece, not a film: every emblem here is our own, and the Immortals are
// our own design (tall felt hoods, scale coats, wicker shields; no masks).
//
// We stand on a ledge of the goat path, cut along a steep slope in oak and black-pine forest. The moon hangs over the
// gorge, left of centre, silvering the mist that fills the valley; through the gorge's mouth, far below, the sea's
// glint and the coastal plain, speckled with the faint campfires of the host. On the left a limestone crag rises over
// the gorge, its moonward faces pale; on the right our own mountain climbs to bare crags, and down its forested flank
// the path zig-zags in switchbacks to the valley floor. Up those switchbacks comes the column of the Immortals'
// torches: a river of fire winding through the dark trees, lighting the trunks it passes.
// On our ledge: a shepherd's abandoned fold on the left (a ring of drystone, a hurdle of brushwood in its gate, the
// stone hut with its slab-and-brush roof and a black doorway), an old oak framing it; on the right an oak fallen across
// the path (its end splintered, a broken limb standing up off it), and before it the post of a Phocian sentry who
// left in a hurry: his fire kicked over and still smoking, its hearthstones scattered and the brands spilled, his spear
// dropped on the path, his shield leaning on the trunk (our own device: three springs), his cloak in a heap. A big
// pine frames the right, two tall pines rising from the slope below the ledge behind it. The table is the path's own bedrock: worn grey limestone, polished by hooves, cracked, with
// needles and oak leaves in its cracks; low in contrast, cool in the moon, warmed a little by the sentry's embers.
// The space above the lanes and the table's back edge stay dark and calm, so the whirling blade and the marching
// horde read against them.
//
// An arena, not a location: no waves. It answers the fight (the immortalbrute brain, src/game/bosses/leonidas.ts):
// - 'brute-horde' (THE HORDE MARCHES!): the torch column surges (a wave of light runs up it, its flames flare and it
//   quickens), the trees on the slope catch its light, the owl takes off, and the war horn's echo comes back off the
//   crags;
// - 'brute-whirl' (WHIRL!): the trees thrash: the oak's and the pine's boughs swing hard, leaves and needles shower
//   down, the mist is torn along the gorge;
// - 'brute-feed' (FEED ME!): a cold gust: the moonlight dims, the torches gutter, the sentry's embers flare and
//   throw sparks, the smoke is flattened.
// On the stages page it plays those cues itself.
//
// Live, the heroes:
// - the torch column: painted torch flames (8 phases each) carried by painted marching bearers (8 phases of a stride),
//   advancing up the switchbacks, passing behind the trees, their light on the trunks and the path;
// - the mist: painted banks (8 phases of their lobes swelling and lifting, moonlit on top) drifting through the gorge
//   at three depths, the column's torches glowing through them;
// - the sentry's fire: smoke curling up from the kicked-over brands (painted frames), embers breathing and sparking,
//   two little flames licking the last log (painted frames).
// Also: the owl on the fallen oak's broken limb (painted frames: it blinks and turns its head), flapping off at a
// stomp (painted wingbeats) and gliding back; a second owl crossing the gorge now and then; oak leaves tumbling down.
// Stomps: pebbles and scree rattle down the crag onto the ledge and down the gully on our mountain, leaves and
// needles shower off the boughs, which swing; the owl flaps off; the embers jump.

import Phaser from 'phaser';
import { type Air, type Ctx, type R, TY, W, airMix, calmLanes, castShadow, crevice, creviceV, groundShadow, lightPool, polyPath, rim, vfill, vignetteAll, within } from '../../art/scene/kit';
import type { SceneSpec } from '../../art/scene/layers';
import { grain, tableFalloff, tableSeam } from '../../art/scene/materials';
import { crack, drift, lay, noiseMask, softly, surface } from '../../art/scene/paint';
import { skyFill, stars } from '../../art/scene/sky';
import { VX, yAt, zFront } from '../../art/sceneKit';
import { hashStr, makeCanvas, mix, rgba, rng, shade } from '../../art/util';
import { audio } from '../../systems/audio';
import { crand } from '../../systems/cosmeticRandom';
import { Loop, Parts, Rate, Swing, flameFrame, sheet } from '../../game/sceneAnim';
import { type KitLive, calm, flicker, registerKitScene } from '../../game/sceneLive';
import { firSilhouette, leafMass, smokeFrame } from './sceneBits';
import { BRONZE } from './scene-labyrinth';

type Pt = [number, number];
type Box = { x: number; y: number; w: number; h: number };
const P2 = Math.PI * 2;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const ease = (t: number) => t * t * (3 - 2 * t);
/** Linear interpolation along a polyline sorted by `key` (0 x, 1 y): the other coordinate. */
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
/** A closed path through points, its corners rounded (midpoint quadratics). */
function smoothPath(pts: Pt[]): (c: Ctx) => void {
  return (c) => {
    c.beginPath();
    const n = pts.length;
    const m = (i: number): Pt => [(pts[i % n][0] + pts[(i + 1) % n][0]) / 2, (pts[i % n][1] + pts[(i + 1) % n][1]) / 2];
    c.moveTo(...m(0));
    for (let i = 1; i <= n; i++) c.quadraticCurveTo(pts[i % n][0], pts[i % n][1], ...m(i));
    c.closePath();
  };
}
/** Break a polygon's long edges with small kinks (rock, rough stone). */
function rough(r: R, pts: Pt[], amt = 0.12, max = 8): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    out.push(a);
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (l > 14) {
      const t = 0.3 + r() * 0.4;
      const nx = -(b[1] - a[1]) / l;
      const ny = (b[0] - a[0]) / l;
      const d = (r() - 0.5) * Math.min(max, l * amt);
      out.push([a[0] + (b[0] - a[0]) * t + nx * d, a[1] + (b[1] - a[1]) * t + ny * d]);
    }
  }
  return out;
}

// ——— the layout (screen px) ———

/** The sea's horizon, far below through the gorge's mouth. */
const HZ = 394;
/** The ledge's lip (the drop beyond it), our ledge running from it to the table. */
const LIP = 640;

export const IB = {
  moon: { x: 700, y: 150, r: 36 },
  /** The switchbacks the column climbs, from the valley floor (out of the mist) to where it passes out of sight. */
  path: [[598, 624], [760, 619], [930, 610], [1150, 596], [1196, 588], [1172, 577], [1040, 563], [946, 549], [922, 540], [952, 531], [1130, 513], [1330, 494], [1370, 486], [1346, 476], [1220, 461], [1080, 443], [1058, 435], [1088, 427], [1260, 410], [1410, 394], [1440, 389]] as Pt[],
  /** The sentry's kicked-over fire: its ember bed. */
  fire: [1330, 716] as Pt,
  /** Where the owl sits: the tip of the fallen oak's broken limb. */
  owl: [1694, 558] as Pt,
  /** The oak's and the pine's hinges (where their boughs leave the trunks). */
  oakHinge: [58, 196] as Pt,
  pineHinge: [1852, 120] as Pt,
  /** The crag face the stomp's scree runs down, and the gully on our mountain. */
  scree: [[300, 300], [420, 520]] as Pt[],
  gully: [1514, 180] as Pt,
  front: 1040,
};

/** The night air: far things go into a deep moonlit blue. */
const AIR: Air = { color: '#24305a', far: 0.72 };
/** The moon's light (cool silver) and the torches' (warm). */
const MOON = '#c8d6ff';
const TORCH = '#ff9a3a';
const ROCK = { lit: '#7884a8', body: '#3a425e', shade: '#1a1e30', deep: '#0a0c16' };
const LEAF = { dark: '#060a0c', mid: '#142024', lit: '#4a5c70', rim: '#98aed8' };
const BARK = '#2a2624';

/** The column's scale on screen at a height (nearer and bigger as it climbs round towards us). */
const colScale = (y: number) => 0.5 - clamp01((630 - y) / 240) * 0.14;

/** A point along the path at arclength s (and its direction). */
const PATH_L = (() => {
  const out = [0];
  for (let i = 1; i < IB.path.length; i++) out.push(out[i - 1] + Math.hypot(IB.path[i][0] - IB.path[i - 1][0], IB.path[i][1] - IB.path[i - 1][1]));
  return out;
})();
export const PATH_LEN = PATH_L[PATH_L.length - 1];
export function pathAt(s: number): { x: number; y: number; dx: number; dy: number } {
  const p = IB.path;
  const v = Math.max(0, Math.min(PATH_LEN, s));
  let i = 1;
  while (i < p.length - 1 && PATH_L[i] < v) i++;
  const t = (v - PATH_L[i - 1]) / (PATH_L[i] - PATH_L[i - 1] || 1);
  const dx = p[i][0] - p[i - 1][0];
  const dy = p[i][1] - p[i - 1][1];
  return { x: p[i - 1][0] + dx * t, y: p[i - 1][1] + dy * t, dx, dy };
}

// ——— the sky ———

export const SKY_BOX: Box = { x: 0, y: 0, w: W, h: 600 };

function sky(ctx: Ctx, r: R): void {
  skyFill(ctx, SKY_BOX, [[0, '#03051a'], [0.3, '#07102e'], [0.62, '#13204a'], [0.8, '#1e2c5c'], [1, '#26346a']]);
  lay(ctx, drift('#28366e', '#02040e', 3, 311, 160, 60), SKY_BOX, 0.24);
  // the stars, thinning towards the moon and the haze over the sea
  const sr = rng(hashStr('ib:stars'));
  for (let i = 0; i < 420; i++) {
    const x = sr() * W;
    const y = sr() ** 1.3 * 420;
    const dm = Math.hypot(x - IB.moon.x, y - IB.moon.y);
    const k = clamp01((dm - 120) / 360) * (1 - y / 520);
    if (sr() > k) continue;
    const big = sr() < 0.06;
    ctx.fillStyle = rgba(sr() < 0.2 ? '#ffe8d0' : '#eef2ff', (0.3 + sr() * 0.6) * k);
    ctx.beginPath();
    ctx.arc(x, y, big ? 1.5 : 0.5 + sr() * 0.7, 0, P2);
    ctx.fill();
  }
  stars(ctx, r, { x: 1100, y: 0, w: 820, h: 200 }, 60, '#dfe6ff');
  // the moon: a wide bloom in the haze, a halo, the disc with its seas, a soft limb
  const { x, y, r: rad } = IB.moon;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (const [rr, col, a, sy] of [[rad * 14, '#2e3e80', 0.42, 0.85], [rad * 5.5, '#7a8ed0', 0.3, 1], [rad * 2.2, '#d0dcff', 0.36, 1]] as const) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, sy);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rr);
    g.addColorStop(0, rgba(col, a));
    g.addColorStop(0.35, rgba(col, a * 0.45));
    g.addColorStop(0.7, rgba(col, a * 0.12));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-rr, -rr, rr * 2, rr * 2);
    ctx.restore();
  }
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, rad, 0, P2);
  ctx.clip();
  const g = ctx.createRadialGradient(x - rad * 0.3, y - rad * 0.3, rad * 0.1, x, y, rad);
  g.addColorStop(0, '#fffef6');
  g.addColorStop(0.7, '#eceff6');
  g.addColorStop(1, '#b8c0d8');
  ctx.fillStyle = g;
  ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  lay(ctx, noiseMask(4, 317, { cover: 0.4, soft: 0.3, col: '#8a92ac' }), { x: x - rad, y: y - rad, w: rad * 2, h: rad * 2 }, 0.5);
  for (const [mx, my, mr] of [[-0.28, -0.2, 0.3], [0.2, 0.06, 0.26], [-0.02, 0.4, 0.2], [0.36, -0.34, 0.14]] as const) {
    const mg = ctx.createRadialGradient(x + mx * rad, y + my * rad, 0, x + mx * rad, y + my * rad, mr * rad);
    mg.addColorStop(0, 'rgba(118,126,154,0.42)');
    mg.addColorStop(1, 'rgba(118,126,154,0)');
    ctx.fillStyle = mg;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  const lg = ctx.createRadialGradient(x, y, rad * 0.7, x, y, rad);
  lg.addColorStop(0, 'rgba(60,70,110,0)');
  lg.addColorStop(1, 'rgba(60,70,110,0.32)');
  ctx.fillStyle = lg;
  ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  ctx.restore();
  // long thin bars of cloud: one low over the far shore, silvered on top under the moon; one high on the right
  cloudBar(ctx, r, 560, 340, 820, 20, 0.75);
  cloudBar(ctx, r, 860, 312, 300, 12, 0.4);
  cloudBar(ctx, r, 1250, 92, 520, 26, 0.45);
  cloudBar(ctx, r, 1040, 70, 220, 10, 0.3);
}

/** A long low bar of cloud: a soft dark body, its upper edge lit by the moon (strongest nearest it). */
function cloudBar(ctx: Ctx, r: R, cx: number, cy: number, w: number, h: number, a: number): void {
  const box = { x: cx - w / 2 - 60, y: cy - h * 3, w: w + 120, h: h * 6 };
  const lumps: [number, number, number][] = [];
  for (let i = 0; i < 18; i++) {
    const u = i / 17 - 0.5;
    lumps.push([cx + u * w + (r() - 0.5) * 40, cy + (r() - 0.5) * h * 0.9 - (1 - Math.abs(u) * 2) * h * 0.4, h * (0.5 + Math.max(0, 1 - Math.abs(u) * 1.8) * 0.7) * (0.7 + r() * 0.6)]);
  }
  softly(ctx, box, (g) => {
    for (const [x, y, rad] of lumps) {
      g.save();
      g.translate(x, y);
      g.scale(2.6, 1);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, rad);
      gr.addColorStop(0, rgba('#162048', a * 0.8));
      gr.addColorStop(1, rgba('#162048', 0));
      g.fillStyle = gr;
      g.fillRect(-rad, -rad, rad * 2, rad * 2);
      g.restore();
    }
    for (const [x, y, rad] of lumps) {
      const near = Math.max(0, 1 - Math.hypot(x - IB.moon.x, (y - IB.moon.y) * 2) / 700);
      g.save();
      g.translate(x - 6, y - rad * 0.3);
      g.scale(2.6, 0.5);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, rad * 0.8);
      gr.addColorStop(0, rgba('#c4d0f6', a * (0.18 + near * 0.6)));
      gr.addColorStop(1, rgba('#c4d0f6', 0));
      g.fillStyle = gr;
      g.fillRect(-rad, -rad, rad * 2, rad * 2);
      g.restore();
    }
  }, 0.5);
}

// ——— the far view through the gorge's mouth: the gulf's far shore, the sea's glint, the plain and the host's fires ———

export const FAR_BOX: Box = { x: 280, y: 330, w: 860, h: LIP + 2 - 330 };
const ridgeR = rng(hashStr('ib:ridges'));
function ridgeLine(x0: number, x1: number, base: number, peaks: [number, number, number][], roughness: number): Pt[] {
  const pts: Pt[] = [];
  for (let x = x0; x <= x1; x += 8) {
    let h = 0;
    for (const [px, ph, pw] of peaks) h = Math.max(h, ph * Math.exp(-(((x - px) / pw) ** 2)));
    pts.push([x, base - h - (ridgeR() - 0.5) * roughness - Math.sin(x * 0.05) * roughness * 0.5]);
  }
  return pts;
}
const FAR_SHORE = ridgeLine(280, 1140, HZ, [[360, 30, 90], [520, 18, 120], [700, 40, 130], [880, 26, 100], [1040, 46, 120]], 2);
/** The plain's fires, far below: tiny and faint, clustered in the camp's lines. */
export const CAMPFIRES: Pt[] = (() => {
  const rr = rng(hashStr('ib:camp'));
  const out: Pt[] = [];
  for (let i = 0; i < 70; i++) {
    const cl = rr();
    const x = cl < 0.5 ? 560 + rr() * 260 : 700 + rr() * 320;
    const y = 424 + rr() ** 0.8 * 38;
    out.push([x, y]);
  }
  return out;
})();

function far(ctx: Ctx, r: R): void {
  // the far shore's mountains across the gulf: soft, flat, moonlit along their crests
  const shore: Pt[] = [...FAR_SHORE, [1140, HZ + 2], [280, HZ + 2]];
  ctx.fillStyle = '#26325e';
  polyPath(shore)(ctx);
  ctx.fill();
  within(ctx, polyPath(shore), () => {
    vfill(ctx, 280, HZ - 60, 860, 64, [[0, rgba('#8a9cd4', 0.3)], [0.35, rgba('#8a9cd4', 0.06)], [1, rgba('#3a4a7e', 0.5)]]);
    lay(ctx, drift('#3a4a80', '#141c40', 6, 331, 120, 30), { x: 280, y: HZ - 60, w: 860, h: 64 }, 0.35);
  });
  // the gulf: a thin band of sea, the moon's road laid on it in glints
  const sea = { x: 280, y: HZ, w: 860, h: 26 };
  vfill(ctx, sea.x, sea.y, sea.w, sea.h, [[0, '#3a4a80'], [0.4, '#1c2850'], [1, '#121a3a']]);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 160; i++) {
    const t = r();
    const y = HZ + 1 + t * 22;
    const spread = 26 + t * 70;
    const x = IB.moon.x + (r() + r() - 1) * spread;
    const a = (0.25 + r() * 0.5) * (1 - Math.abs(x - IB.moon.x) / (spread * 1.1));
    if (a <= 0) continue;
    ctx.fillStyle = rgba('#dce6ff', a * 0.6);
    ctx.fillRect(x, y, 2 + r() * 6 * (0.5 + t), 1);
  }
  lightPool(ctx, IB.moon.x, HZ + 10, 120, 14, '#8a9cd8', 0.18);
  ctx.restore();
  // the coastal plain, far below: dark, the shore a pale thread, the camp's fires speckled over it, a smoky glow
  const plain: Pt[] = [[280, 418], [420, 416], [520, 419], [600, 415], [700, 418], [800, 416], [920, 419], [1140, 417], [1140, LIP + 2], [280, LIP + 2]];
  ctx.fillStyle = '#121a34';
  polyPath(plain)(ctx);
  ctx.fill();
  within(ctx, polyPath(plain), () => {
    lay(ctx, drift('#1e2a50', '#080c1c', 7, 337, 160, 40), { x: 280, y: 414, w: 860, h: 160 }, 0.5);
    vfill(ctx, 280, 414, 860, 10, [[0, rgba('#6a7cb4', 0.35)], [1, rgba('#6a7cb4', 0)]]);
  });
  ctx.strokeStyle = rgba('#a8b8e8', 0.3);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 280; x <= 1140; x += 10) {
    const y = along(plain.slice(0, 8), x, 0) + 0.5;
    if (x === 280) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  lightPool(ctx, 780, 440, 260, 22, '#ff8a4a', 0.12);
  for (const [fx, fy] of CAMPFIRES) {
    const a = 0.35 + r() * 0.5;
    lightPool(ctx, fx, fy, 5, 3, '#ff9a4a', a * 0.4);
    ctx.fillStyle = rgba('#ffc890', a);
    ctx.fillRect(fx - 0.6, fy - 0.6, 1.3, 1.2);
  }
  ctx.restore();
  // the gorge's lower shoulders closing the view: forested spurs one behind another, mist lying between them
  for (const [base, peaks, col, depth] of [
    [492, [[340, 60, 120], [640, 30, 90], [800, 20, 110], [1080, 64, 120]] as [number, number, number][], '#1a2448', 0.75],
    [552, [[300, 90, 140], [700, 22, 70], [880, 38, 90], [1050, 80, 140]] as [number, number, number][], '#111832', 0.6],
  ] as const) {
    const pts = ridgeLine(280, 1140, base, peaks, 3);
    const poly: Pt[] = [...pts, [1140, LIP + 2], [280, LIP + 2]];
    ctx.fillStyle = col;
    polyPath(poly)(ctx);
    ctx.fill();
    // a comb of tree tips along the crest, moonlit on their left
    ctx.save();
    for (const [x, y] of pts) {
      if (r() < 0.25) continue;
      firSilhouette(ctx, r, x + (r() - 0.5) * 6, y + 6, 10 + r() * 10, 6 + r() * 4, shade(col, (r() - 0.5) * 0.08), airMix(MOON, depth, AIR), 0.25);
    }
    ctx.restore();
    // the mist lying in the fold below it
    // (fading out again below the fold: a band that stopped at full strength left a hard horizontal edge, Tron)
    const mg = ctx.createLinearGradient(0, base - 40, 0, base + 50);
    mg.addColorStop(0, rgba('#6a7cb8', 0));
    mg.addColorStop(0.45, rgba('#6a7cb8', 0.4));
    mg.addColorStop(1, rgba('#6a7cb8', 0));
    ctx.fillStyle = mg;
    ctx.fillRect(280, base - 40, 860, 90);
  }
  // the valley mist, lit by the moon, filling the gorge's floor
  vfill(ctx, 280, 520, 860, LIP + 2 - 520, [[0, rgba('#8090c8', 0)], [0.35, rgba('#8090c8', 0.36)], [1, rgba('#8090c8', 0.18)]]);
}

// ——— the crag on the left of the gorge ———

const CRAG: Pt[] = [[-10, 96], [30, 84], [70, 60], [104, 52], [140, 66], [172, 58], [204, 82], [226, 92], [248, 96], [258, 118], [270, 128], [284, 150], [290, 178], [312, 196], [322, 214], [330, 252], [352, 268], [362, 300], [366, 326], [392, 344], [410, 378], [418, 404], [446, 424], [456, 448], [470, 470], [500, 488], [520, 516], [548, 536], [566, 560], [596, 584], [624, 610], [650, 641], [-10, 641]];
const cragEdge = CRAG.slice(8, 32);
export const CRAG_BOX: Box = { x: 0, y: 40, w: 660, h: 601 };

/** A black pine on a crag: a crooked trunk and flat, layered crowns of needles, moonlit on their tops. */
function blackPine(ctx: Ctx, r: R, x: number, y: number, s: number, lean: number, depth: number, toLight: [number, number] = [0.6, -0.8]): void {
  const air = (c: string) => airMix(c, depth, AIR);
  ctx.save();
  ctx.lineCap = 'round';
  const tx = x + lean * s * 26;
  const ty = y - s * 40;
  ctx.strokeStyle = air('#16120e');
  ctx.lineWidth = s * 2.6;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + lean * s * 6, y - s * 22, tx, ty);
  ctx.stroke();
  ctx.strokeStyle = rgba(air(MOON), 0.28);
  ctx.lineWidth = s * 0.7;
  ctx.beginPath();
  ctx.moveTo(x + toLight[0] * s, y);
  ctx.quadraticCurveTo(x + lean * s * 6 + toLight[0] * s, y - s * 22, tx + toLight[0] * s, ty);
  ctx.stroke();
  const blobs: [number, number, number][] = [];
  for (let k = 0; k < 3; k++) {
    const cx = tx + (k - 1) * s * 8 + lean * s * 5;
    const cy = ty - k * s * 4 + (k === 1 ? -s * 5 : 0);
    for (let j = -2; j <= 2; j++) blobs.push([cx + j * s * 3.4, cy + Math.abs(j) * s * 0.6, s * (3.6 - Math.abs(j) * 0.5)]);
  }
  leafMass(ctx, r, blobs, { dark: LEAF.dark, mid: LEAF.mid, lit: LEAF.lit, rim: LEAF.rim, rimA: 0.4, size: Math.max(2, s * 1.4), density: 0.9, shape: 'needle', depth, air: AIR, toLight, angle: (_px, _py, rr) => -Math.PI / 2 + (rr() - 0.5) * 2.2 });
  ctx.restore();
}

/**
 * A limestone cliff by moonlight between x0 and x1 (top(x) its crest, bottom(x) where it ends): a run of buttress
 * ribs with ragged edges, each with a jagged strip of its face turned to the moon catching the light (litLeft: the
 * moon is to the left), fading down it, the rest in cool shade; black fissures between, short broken ledges with
 * their shadows under them, a few slanting fractures, stains run down. k: how strongly the moon reaches it.
 */
function cliffFace(ctx: Ctx, r: R, x0: number, x1: number, top: (x: number) => number, bottom: (x: number) => number, litLeft: boolean, k: number): void {
  let x = x0;
  const step = 16;
  while (x < x1) {
    const w = 30 + r() * 80;
    const xa = x;
    const xb = Math.min(x1 + 20, x + w);
    const t = Math.min(top(xa), top(xb), top((xa + xb) / 2)) - 2;
    const b = Math.max(bottom(xa), bottom(xb)) + 10;
    const kk = k * (0.5 + r() * 0.6);
    // the rib's two ragged edges down it
    const L: Pt[] = [];
    const Rr: Pt[] = [];
    let la = xa;
    let ra = xb;
    for (let y = t; y <= b; y += step) {
      la += (r() - 0.5) * 7;
      ra += (r() - 0.5) * 7;
      L.push([la, y]);
      Rr.push([Math.max(la + 12, ra), y]);
    }
    const rib: Pt[] = [...L, ...[...Rr].reverse()];
    const ribPath = polyPath(rib);
    ctx.save();
    ribPath(ctx);
    ctx.clip();
    ctx.fillStyle = rgba(r() < 0.5 ? ROCK.deep : ROCK.body, 0.12 + r() * 0.12);
    ctx.fillRect(xa - 20, t, w + 40, b - t);
    // the face turned to the moon: a jagged strip along that edge, brightest high up
    const edge = litLeft ? L : Rr;
    const strip: Pt[] = [];
    let lw = w * (0.15 + r() * 0.2);
    for (const [ex, ey] of edge) {
      lw = Math.max(4, Math.min(w * 0.5, lw + (r() - 0.5) * 8));
      strip.push([ex + (litLeft ? lw : -lw), ey]);
    }
    const sp: Pt[] = [...edge.map(([ex, ey]) => [ex + (litLeft ? -2 : 2), ey] as Pt), ...strip.reverse()];
    const sg = ctx.createLinearGradient(0, t, 0, b);
    sg.addColorStop(0, rgba(ROCK.lit, 0.42 * kk));
    sg.addColorStop(0.5, rgba(ROCK.lit, 0.22 * kk));
    sg.addColorStop(1, rgba(ROCK.lit, 0.04 * kk));
    ctx.fillStyle = sg;
    polyPath(sp)(ctx);
    ctx.fill();
    // the shaded side, darkest against the next rib
    const dg = ctx.createLinearGradient(xa, 0, xb, 0);
    dg.addColorStop(litLeft ? 0.55 : 0.45, rgba(ROCK.deep, 0));
    dg.addColorStop(litLeft ? 1 : 0, rgba(ROCK.deep, 0.5));
    ctx.fillStyle = dg;
    ctx.fillRect(xa - 20, t, w + 40, b - t);
    // broken ledges: a lit lip, a shadow under it, a stain run down
    for (let y = t + 14 + r() * 30; y < b - 10; y += 26 + r() * 44) {
      const lx = xa + r() * w * 0.4;
      const lw2 = w * (0.3 + r() * 0.6);
      const dy = (r() - 0.5) * 8;
      ctx.fillStyle = rgba(ROCK.deep, 0.5);
      ctx.beginPath();
      ctx.moveTo(lx, y);
      ctx.lineTo(lx + lw2, y + dy);
      ctx.lineTo(lx + lw2 - 3, y + dy + 4 + r() * 5);
      ctx.lineTo(lx + 2, y + 5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = rgba(MOON, 0.2 * kk);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(lx, y - 0.8);
      ctx.lineTo(lx + lw2, y + dy - 0.8);
      ctx.stroke();
      if (r() < 0.6) {
        const stg = ctx.createLinearGradient(0, y + 4, 0, y + 60);
        stg.addColorStop(0, rgba(ROCK.deep, 0.3));
        stg.addColorStop(1, rgba(ROCK.deep, 0));
        ctx.fillStyle = stg;
        ctx.fillRect(lx + r() * lw2 * 0.6, y + 4, 2 + r() * 7, 56);
      }
    }
    // a slanting fracture
    if (r() < 0.5) {
      const fy = t + r() * (b - t) * 0.6;
      ctx.strokeStyle = rgba(ROCK.deep, 0.55);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(xa, fy);
      ctx.lineTo(xb, fy + (litLeft ? 1 : -1) * w * (0.3 + r() * 0.4));
      ctx.stroke();
    }
    ctx.restore();
    // the fissure between it and the next
    ctx.strokeStyle = rgba(ROCK.deep, 0.75);
    ctx.lineWidth = 1.4 + r() * 1.8;
    ctx.beginPath();
    (litLeft ? Rr : L).forEach(([px, py], j) => (j ? ctx.lineTo(px, py) : ctx.moveTo(px, py + 6)));
    ctx.stroke();
    x = xb - 6;
  }
}

/** A small tree of the forest below, near-black: a conifer's ragged spire or an oak's rounded crown, a thread of the
 * moon on its moonward top; warm underneath or on top where the column passes close. */
function forestTree(ctx: Ctx, r: R, x: number, y: number, s: number, moonLeft: boolean, moonA: number, warm: number, side: number): void {
  const col = shade('#0c1220', -0.35 + r() * 0.4);
  const d = moonLeft ? -1 : 1;
  if (r() < (moonLeft ? 0.6 : 0.9)) {
    const h = s * (2.2 + r() * 0.9);
    const hw = h * 0.26;
    const tiers = 4;
    const pts: Pt[] = [[x, y - h]];
    for (let i = 1; i <= tiers; i++) {
      const u = i / tiers;
      pts.push([x + hw * u * (1 + r() * 0.3), y - h + h * u * 0.92], [x + hw * u * 0.45, y - h + h * u * 0.92 - h * 0.06]);
    }
    pts.push([x + hw * 0.2, y], [x - hw * 0.2, y]);
    for (let i = tiers; i >= 1; i--) {
      const u = i / tiers;
      pts.push([x - hw * u * 0.45, y - h + h * u * 0.92 - h * 0.06], [x - hw * u * (1 + r() * 0.3), y - h + h * u * 0.92]);
    }
    ctx.fillStyle = col;
    polyPath(pts)(ctx);
    ctx.fill();
    // the moon down its moonward side
    if (moonA > 0.2 && r() < 0.5) {
      ctx.strokeStyle = rgba(MOON, moonA * 0.6);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x, y - h + 1);
      ctx.lineTo(x + d * hw * 0.4, y - h * 0.62);
      ctx.stroke();
    }
    if (warm > 0.02) {
      ctx.fillStyle = rgba('#e0803a', warm * 0.4);
      ctx.beginPath();
      ctx.ellipse(x, side > 0 ? y - h * 0.15 : y - h * 0.8, hw * 0.8, h * 0.12, 0, 0, P2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = col;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * P2;
      const rr = s * (0.75 + r() * 0.4);
      ctx.ellipse(x + Math.cos(a) * s * 0.5, y - s * 0.6 + Math.sin(a) * s * 0.35, rr * 0.6, rr * 0.5, 0, 0, P2);
    }
    ctx.fill();
    ctx.fillStyle = rgba(MOON, moonA * 0.35);
    ctx.beginPath();
    ctx.ellipse(x + d * s * 0.25, y - s * 1.05, s * 0.5, s * 0.16, 0, 0, P2);
    ctx.fill();
    if (warm > 0.02) {
      ctx.fillStyle = rgba('#e0803a', warm * 0.45);
      ctx.beginPath();
      ctx.ellipse(x, y - s * 0.6 + side * s * 0.45, s * 0.75, s * 0.25, 0, 0, P2);
      ctx.fill();
    }
  }
}

function crag(ctx: Ctx, r: R): void {
  const path = polyPath(CRAG);
  ctx.save();
  path(ctx);
  ctx.fillStyle = '#1e2338';
  ctx.fill();
  within(ctx, path, () => {
    surface(ctx, r, CRAG_BOX, '#1e2338', { over: true, vary: 0.4, cells: 4, mottle: 0.35, strokes: 1.2, strokeAng: Math.PI / 2, strokeLen: 160, strokeW: 10, grain: 0.2, grainKind: 'speckle', seed: 341 });
    // its face: buttresses, their moonward (right) faces pale
    cliffFace(ctx, r, -20, 660, (x) => along(CRAG, Math.max(-10, Math.min(650, x)), 0), () => 520, false, 0.9);
    lay(ctx, noiseMask(10, 343, { cover: 0.3, soft: 0.12, col: '#05060c', w: 120, h: 160 }), CRAG_BOX, 0.35);
    // its flank turned to the gorge and the moon: a pale face along its edge, stepping down with it, the arris where
    // it turns from the front a hard line, the flank lit most where it faces the moon squarely
    const flank: Pt[] = cragEdge.map(([x, y]) => [x + 2, y] as Pt);
    const inner: Pt[] = cragEdge.map(([x, y], i) => [x - 26 - (y - 110) * 0.09 - Math.sin(i * 1.7) * 7, y + 6] as Pt);
    const fp = polyPath([...flank, ...inner.reverse()]);
    within(ctx, fp, () => {
      const fg = ctx.createLinearGradient(0, 100, 0, 640);
      fg.addColorStop(0, rgba(ROCK.lit, 0.5));
      fg.addColorStop(0.5, rgba(ROCK.lit, 0.3));
      fg.addColorStop(1, rgba(ROCK.lit, 0.08));
      ctx.fillStyle = fg;
      ctx.fillRect(200, 100, 460, 541);
      lay(ctx, noiseMask(12, 345, { cover: 0.35, soft: 0.1, col: '#141828', w: 120, h: 200 }), { x: 200, y: 100, w: 460, h: 541 }, 0.5);
      for (let y = 120; y < 600; y += 14 + r() * 18) {
        ctx.strokeStyle = rgba(ROCK.deep, 0.35);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(along(cragEdge, y, 1) - 60, y);
        ctx.lineTo(along(cragEdge, y, 1) + 4, y - 6);
        ctx.stroke();
      }
    });
    ctx.strokeStyle = rgba(ROCK.deep, 0.6);
    ctx.lineWidth = 2;
    ctx.beginPath();
    [...inner].reverse().forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    // its lower slopes go into forest and the mist: ranks of dark crowns, stepping down into the gorge
    const fl = (x: number) => 430 + Math.sin(x * 0.02) * 14 + Math.sin(x * 0.051 + 1) * 8 + (x / 650) * 40;
    const mass: Pt[] = [];
    for (let x = -10; x <= 660; x += 10) mass.push([x, fl(x) + 8]);
    mass.push([660, 660], [-10, 660]);
    polyPath(mass)(ctx);
    ctx.fillStyle = '#070a12';
    ctx.fill();
    const trees: Pt[] = [];
    for (let i = 0; i < 300; i++) {
      const x = -10 + r() * 660;
      const y = fl(x) + 10 + r() ** 1.6 * 220;
      trees.push([x, y]);
    }
    for (let i = 0; i < 40; i++) {
      const x = -10 + r() * 660;
      trees.push([x, fl(x) - 10 - r() * 50]);
    }
    trees.sort((a, b) => a[1] - b[1]);
    for (const [x, y] of trees) forestTree(ctx, r, x, y, 6 + (y - 380) * 0.035 + r() * 3, false, 0.1 + r() * 0.1, 0, 1);
    vfill(ctx, 0, 470, 660, 172, [[0, rgba('#7888c0', 0)], [0.6, rgba('#7888c0', 0.18)], [1, rgba('#8898d0', 0.36)]]);
  });
  // the crag's crest and its face's edge, rimmed by the moon
  ctx.strokeStyle = rgba(MOON, 0.34);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  CRAG.slice(6, 32).forEach(([px, py], j) => (j ? ctx.lineTo(px - 1, py + 1) : ctx.moveTo(px - 1, py + 1)));
  ctx.stroke();
  ctx.restore();
  // pines on its ledges and its crest, black against the sky
  for (const [px, py, s, lean] of [[240, 112, 1.1, 0.3], [296, 150, 0.8, 0.5], [356, 262, 0.7, 0.6], [410, 352, 0.6, 0.2], [180, 70, 0.9, -0.2]] as const) blackPine(ctx, r, px, py + 4, s, lean, 0.35);
}

// ——— our mountain on the right: bare crags above, the forested flank below, the switchbacks ———

const MT: Pt[] = [[1930, -10], [1860, 8], [1790, 28], [1726, 58], [1668, 78], [1612, 98], [1560, 116], [1520, 140], [1488, 150], [1452, 168], [1420, 180], [1386, 200], [1350, 198], [1318, 222], [1280, 240], [1236, 258], [1190, 284], [1140, 300], [1092, 318], [1050, 344], [1012, 374], [982, 410], [954, 452], [930, 494], [906, 538], [884, 582], [866, 620], [856, 641], [1930, 641]];
const mtEdge = MT.slice(0, 28);
/** The slope's left edge at a height (against the gorge). */
const mtX = (y: number) => along(mtEdge, y, 1);
/** Where the forest gives way to bare crag. */
const treeLineY = (x: number) => 420 - (x - 1000) * 0.12;
export const MT_BOX: Box = { x: 480, y: 0, w: 1440, h: LIP + 2 };


/** How near a point is to the path (0…1 within d px), and whether the path is below (+1) or above (-1) it. */
function nearPath(x: number, y: number, d: number): [number, number] {
  let best = Infinity;
  let side = 1;
  const p = IB.path;
  for (let i = 1; i < p.length; i++) {
    const [ax, ay] = p[i - 1];
    const [bx, by] = p[i];
    const dx = bx - ax;
    const dy = by - ay;
    const t = clamp01(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1));
    const qx = ax + dx * t;
    const qy = ay + dy * t;
    const dd = Math.hypot(x - qx, y - qy);
    if (dd < best) {
      best = dd;
      side = qy > y ? 1 : -1;
    }
  }
  return [clamp01(1 - best / d), side];
}

function mountain(ctx: Ctx, r: R): void {
  const path = polyPath(MT);
  path(ctx);
  ctx.fillStyle = '#121729';
  ctx.fill();
  within(ctx, path, () => {
    surface(ctx, r, { x: 850, y: 0, w: 1070, h: LIP + 2 }, '#141a2e', { over: true, vary: 0.4, cells: 4, mottle: 0.3, strokes: 0, strokeAng: 1.2, strokeLen: 140, strokeW: 10, grain: 0.18, grainKind: 'speckle', seed: 351 });
    // the bare crags: buttresses stepping up to the summit, their moonward (left) faces pale, fading with distance
    // from the moon
    cliffFace(ctx, r, 960, 1930, (x) => along(mtEdge, Math.max(856, x), 0), (x) => treeLineY(x) + 30, true, 0.75);
    lay(ctx, noiseMask(9, 353, { cover: 0.3, soft: 0.12, col: '#04050a', w: 160, h: 120 }), { x: 900, y: 0, w: 1020, h: 460 }, 0.35);
    // the gully: a fan of pale scree spilling down between the buttresses
    const [gx, gy] = IB.gully;
    const gully: Pt[] = [[gx - 8, gy], [gx + 10, gy], [gx + 30, gy + 120], [gx + 60, 330], [gx - 10, 334], [gx + 4, gy + 120]];
    within(ctx, smoothPath(gully), () => {
      vfill(ctx, gx - 20, gy, 100, 160, [[0, '#0e1220'], [1, '#222840']]);
      for (let i = 0; i < 160; i++) {
        const t = r();
        ctx.fillStyle = rgba(r() < 0.4 ? '#4a5478' : '#06080e', 0.35);
        ctx.fillRect(gx - 10 + r() * (20 + t * 70), gy + t * 150, 1.5 + r() * 2, 1.2);
      }
    });
    // pines clinging to the ledges
    for (let i = 0; i < 12; i++) {
      const x = 1040 + r() * 880;
      const y = Math.max(along(mtEdge, x, 0) + 30, 80 + r() * (treeLineY(x) - 100));
      if (y > treeLineY(x) - 10) continue;
      blackPine(ctx, r, x, y, 0.45 + r() * 0.35, (r() - 0.5) * 0.8, 0.3, [-0.6, -0.8]);
    }
    // the forested flank below: oak and pine, rank on rank down the slope, nearer and larger towards the bottom;
    // those by the path take the column's warm light on the side facing it
    vfill(ctx, 850, 300, 1070, 340, [[0, 'rgba(6,8,16,0)'], [0.25, 'rgba(6,8,16,0.7)'], [1, 'rgba(6,8,16,0.85)']]);
    const trees: [number, number, number][] = [];
    for (let y = 320; y < 660; y += 5) {
      const s0 = 5 + (y - 320) * 0.028;
      for (let x = 850 + r() * 14; x < 1930; x += s0 * (1.2 + r() * 0.9)) {
        const yy = y + (r() - 0.5) * 4;
        if (yy < treeLineY(x) - 4 + r() * 16 || x < mtX(yy) + s0 * 0.5) continue;
        trees.push([x + (r() - 0.5) * 4, yy, s0 * (0.8 + r() * 0.5)]);
      }
    }
    for (const [x, y, s] of trees) {
      const [pk, side] = nearPath(x, y, 40);
      // the path's own strip stays open (a cut in the slope)
      if (pk > 0.8) continue;
      forestTree(ctx, r, x, y, s, true, 0.06 + r() * 0.08 + clamp01(1 - (x - 900) / 900) * 0.08, 0, side);
    }
    lay(ctx, drift('#2a3658', '#020308', 5, 357, 160, 70), { x: 850, y: 320, w: 1080, h: 330 }, 0.4);
    for (const [mx, my, mw] of [[1500, 470, 300], [1700, 560, 260], [1180, 600, 240], [1640, 380, 200]] as const) {
      const mg = ctx.createRadialGradient(mx, my, 0, mx, my, mw);
      mg.addColorStop(0, rgba('#7888c0', 0.16));
      mg.addColorStop(1, rgba('#7888c0', 0));
      ctx.save();
      ctx.translate(mx, my);
      ctx.scale(1, 0.25);
      ctx.translate(-mx, -my);
      ctx.fillStyle = mg;
      ctx.fillRect(mx - mw, my - mw, mw * 2, mw * 2);
      ctx.restore();
    }
    // the canopy: masses of oak and pine standing up the slope from the path and away from it
    canopyBehind(ctx);
    // the path: a narrow track cut into the slope, its outer lip dark; the torches' light defines it
    const p = IB.path;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const trace = (dy: number) => {
      ctx.beginPath();
      p.forEach(([px, py], j) => (j ? ctx.lineTo(px, py + dy) : ctx.moveTo(px, py + dy)));
    };
    for (let j = 1; j < p.length; j++) {
      const s = colScale(p[j][1]);
      ctx.strokeStyle = rgba('#16161f', 0.55);
      ctx.lineWidth = 8 * s;
      ctx.beginPath();
      ctx.moveTo(p[j - 1][0], p[j - 1][1]);
      ctx.lineTo(p[j][0], p[j][1]);
      ctx.stroke();
    }
    ctx.strokeStyle = rgba('#02030a', 0.45);
    ctx.lineWidth = 1.6;
    trace(4);
    ctx.stroke();
  });
  // the skyline, rimmed by the moon along its crest
  ctx.strokeStyle = rgba(MOON, 0.3);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  mtEdge.slice(0, 22).forEach(([px, py], j) => (j ? ctx.lineTo(px + 1, py + 1) : ctx.moveTo(px + 1, py + 1)));
  ctx.stroke();
  // and on the skyline, pines in silhouette
  for (const cx0 of [1110, 1300, 1460, 1640]) {
    const n = 2 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) {
      const x = cx0 + (r() - 0.5) * 60;
      blackPine(ctx, r, x, along(mtEdge, x, 0) + 8 + r() * 10, 0.4 + r() * 0.6, (r() - 0.5) * 0.6, 0.3, [-0.6, -0.8]);
    }
  }
  // the valley floor in the gorge: forest under the mist, the first torches' road through it
  const fl = (x: number) => 596 + Math.sin(x * 0.03) * 5 + Math.sin(x * 0.071 + 2) * 3;
  const floor: Pt[] = [];
  const fx1 = mtX(600) + 4;
  for (let x = 500; x <= fx1; x += 10) floor.push([x, fl(x) + 6]);
  for (let y = fl(fx1) + 6; y <= LIP + 2; y += 8) floor.push([mtX(y) + 4, y]);
  floor.push([mtX(LIP) + 4, LIP + 2], [500, LIP + 2]);
  polyPath(floor)(ctx);
  ctx.fillStyle = '#0a0f1e';
  ctx.fill();
  for (let i = 0; i < 90; i++) {
    const x = 500 + r() * (fx1 - 510);
    forestTree(ctx, r, x, fl(x) + 8 + r() ** 2 * 40, 5 + r() * 4, true, 0.1, 0, 1);
  }
  vfill(ctx, 500, 560, fx1 - 500, LIP + 2 - 560, [[0, rgba('#8090c8', 0)], [0.5, rgba('#8090c8', 0.22)], [1, rgba('#8090c8', 0.12)]]);
  // the river of fire: the column's light lying along the path, warm on the bank and the trees round it
  softly(ctx, { x: 560, y: 352, w: 920, h: 289 }, (g) => {
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (const [wd, a] of [[26, 0.05], [10, 0.05]] as const) {
      g.strokeStyle = rgba('#ff8a34', a);
      g.lineWidth = wd;
      g.beginPath();
      IB.path.forEach(([px, py], j) => (j ? g.lineTo(px, py - 3) : g.moveTo(px, py - 3)));
      g.stroke();
    }
  }, 0.25, 'lighter');
}

// ——— the forest on the switchback slope: masses of oak and pine canopy the column threads through ———

export const TREES_BOX: Box = { x: 880, y: 300, w: 560, h: LIP - 10 - 300 };

/** A mass of canopy: several trees' crowns run together, standing on the slope at (x, base). */
interface Clump { x: number; base: number; w: number; h: number; kind: number; seed: number; front: boolean; warm: number }

/** Size on the slope at a height: smaller up the slope, farther off. */
const slopeK = (y: number) => 0.55 + clamp01((y - 340) / 290) * 0.6;

const CLUMPS: Clump[] = (() => {
  const rr = rng(hashStr('ib:clumps'));
  const out: Clump[] = [];
  for (let base = 352; base < LIP - 10; base += 15 + rr() * 10) {
    const k = slopeK(base);
    let x = mtX(base) + 10 + rr() * 30;
    while (x < 1900) {
      const w = (50 + rr() * 90) * k;
      const h = (34 + rr() * 40) * k;
      // a gap now and then: a glade, a rock, the path's own cut
      const gap = rr() < 0.22;
      const cx = x + w / 2;
      // in front of the path when it would hide a stretch of it
      let front = false;
      for (let s = 0; s < PATH_LEN; s += 8) {
        const p = pathAt(s);
        if (Math.abs(p.x - cx) < w * 0.45 && p.y > base - h * 0.85 && p.y < base - 4) {
          front = true;
          break;
        }
      }
      const fits = cx - w * 0.8 > TREES_BOX.x && cx + w * 0.8 < TREES_BOX.x + TREES_BOX.w && base - h * 1.5 > TREES_BOX.y;
      // keep the column glimpsed: only some of the masses that would hide it stand in front
      if (!gap && (!front || (fits && rr() < 0.62))) {
        const [pk0] = nearPath(cx, base - h * 0.4, 60);
        const pk = pk0 * pk0;
        out.push({ x: cx, base, w, h, kind: rr() < 0.5 ? 0 : 1, seed: Math.floor(rr() * 1e6), front, warm: pk });
      }
      x += w * (0.55 + rr() * 0.5) + (gap ? w * 0.6 : 0);
    }
  }
  return out;
})();

/** One mass: its leaves painted on their own canvas, then lit there: the moon along its top, the column's warmth
 * underneath (a mass above the path) or on its upper edge (one in front of it, the torches behind it); a trunk or two
 * showing under it, warm-edged near the torches. */
function clump(ctx: Ctx, c: Clump): void {
  const r = rng(c.seed);
  const k = slopeK(c.base);
  // the trunks under it
  ctx.lineCap = 'round';
  const nt = 1 + Math.floor(r() * 3);
  for (let i = 0; i < nt; i++) {
    const tx = c.x + (r() - 0.5) * c.w * 0.6;
    const tw = (2 + r() * 2) * k;
    ctx.strokeStyle = '#040408';
    ctx.lineWidth = tw;
    ctx.beginPath();
    ctx.moveTo(tx, c.base);
    ctx.lineTo(tx + (r() - 0.5) * 4, c.base - c.h * 0.45);
    ctx.stroke();
    if (c.warm > 0.1) {
      ctx.strokeStyle = rgba('#ff8a3a', c.warm * 0.35);
      ctx.lineWidth = Math.max(0.8, tw * 0.3);
      ctx.beginPath();
      ctx.moveTo(tx + tw * 0.4, c.base);
      ctx.lineTo(tx + tw * 0.4, c.base - c.h * 0.4);
      ctx.stroke();
    }
  }
  groundShadow(ctx, c.x + 4, c.base, c.w * 0.4, 3 * k, 0.45, '#020306');
  // the crowns: a mound of irregular clusters (pines flat and layered, oaks heaped)
  const centres: [number, number, number, number][] = [];
  const n = 2 + Math.floor(c.w / (26 * k));
  for (let i = 0; i < n; i++) {
    const u = n > 1 ? i / (n - 1) - 0.5 : 0;
    const top = c.base - c.h * (0.55 + (1 - Math.abs(u) * 1.4) * 0.3 + (r() - 0.5) * 0.25);
    centres.push([c.x + u * c.w * 0.8 + (r() - 0.5) * 8 * k, top + (c.kind ? 0 : -4 * k), (c.kind ? 26 : 30) * k, Math.round(c.kind ? 9 : 8)]);
  }
  const blobs = scatter(r, centres, [5 * k, 9 * k]).map(([x, y, rad]) => [x, c.kind ? y : y * 0.6 + (c.base - c.h * 0.6) * 0.4, rad] as [number, number, number]);
  const pad = 6;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y, rad] of blobs) {
    x0 = Math.min(x0, x - rad * 1.6);
    y0 = Math.min(y0, y - rad * 1.6);
    x1 = Math.max(x1, x + rad * 1.6);
    y1 = Math.max(y1, y + rad * 1.6);
  }
  const bx = Math.floor(x0 - pad);
  const by = Math.floor(y0 - pad);
  const bw = Math.ceil(x1 - x0 + pad * 2);
  const bh = Math.ceil(y1 - y0 + pad * 2);
  const [cv, g] = makeCanvas(bw, bh);
  g.translate(-bx, -by);
  leafMass(g, r, blobs, { dark: '#020308', mid: '#070b12', lit: '#1c2638', size: Math.max(2.8, 3.8 * k), density: 1, shape: c.kind ? 'needle' : 'leaf', toLight: [-0.6, -0.8], angle: c.kind ? (_px, _py, q) => (q() - 0.5) * 1 + (q() < 0.5 ? 0 : Math.PI) : undefined });
  g.globalCompositeOperation = 'source-atop';
  const lg = g.createLinearGradient(0, by + pad * 0.5, 0, by + bh);
  lg.addColorStop(0, rgba('#a8b8e8', 0.26));
  lg.addColorStop(0.22, rgba('#a8b8e8', 0.04));
  lg.addColorStop(0.5, 'rgba(0,0,0,0)');
  lg.addColorStop(1, 'rgba(0,0,0,0.2)');
  g.fillStyle = lg;
  g.fillRect(bx, by, bw, bh);
  if (c.warm > 0.05) {
    const wg = c.front ? g.createLinearGradient(0, by + pad, 0, by + pad + c.h * 0.3) : g.createLinearGradient(0, by + bh - pad * 0.5, 0, by + bh - pad - c.h * 0.32);
    wg.addColorStop(0, rgba('#ff8a3a', c.warm * (c.front ? 0.2 : 0.3)));
    wg.addColorStop(1, rgba('#ff8a3a', 0));
    g.fillStyle = wg;
    g.fillRect(bx, by, bw, bh);
  }
  ctx.drawImage(cv, bx, by);
}

/** The masses behind the path (up the slope from it, and away from it): painted with the mountain, under the column. */
function canopyBehind(ctx: Ctx): void {
  for (const c of CLUMPS) if (!c.front) clump(ctx, c);
}

function slopeTrees(ctx: Ctx): void {
  for (const c of CLUMPS) if (c.front) clump(ctx, c);
}

// ——— our ledge ———

/** The ledge's lip against the drop: (x, y) left to right. */
const LIP_PTS: Pt[] = (() => {
  const rr = rng(hashStr('ib:lip'));
  const out: Pt[] = [];
  for (let x = -10; x <= 1930; x += 24) out.push([x, LIP + 2 + Math.sin(x * 0.011) * 4 + (rr() - 0.5) * 5]);
  return out;
})();
export const LEDGE_BOX: Box = { x: 0, y: LIP - 10, w: W, h: TY - LIP + 10 };

/** A tuft of dry grass or a sprig of maquis on the lip, black against the mist, moonlit on its tips. */
function tuft(ctx: Ctx, r: R, x: number, y: number, s: number): void {
  ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (r() - 0.5) * 1.6;
    const l = s * (6 + r() * 10);
    const ex = x + Math.cos(a) * l;
    const ey = y + Math.sin(a) * l;
    ctx.strokeStyle = '#0a0c12';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x + (r() - 0.5) * 4, y);
    ctx.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + 2, y + Math.sin(a) * l * 0.5, ex, ey);
    ctx.stroke();
    if (r() < 0.5) {
      ctx.fillStyle = rgba(MOON, 0.35);
      ctx.fillRect(ex - 0.6, ey - 0.6, 1.4, 1.4);
    }
  }
}

/** A loose stone on the ground: rounded, its top silvered, its face dim, a contact shadow. */
function pebble(ctx: Ctx, r: R, x: number, y: number, s: number, warm = 0): void {
  groundShadow(ctx, x + s * 0.5, y + s * 0.2, s * 1.1, s * 0.35, 0.55, '#020306');
  const p = ellPathR(x, y - s * 0.4, s, s * 0.62, (r() - 0.5) * 0.4);
  p(ctx);
  const g = ctx.createLinearGradient(x, y - s, x, y);
  g.addColorStop(0, '#5a6482');
  g.addColorStop(0.45, '#2a3048');
  g.addColorStop(1, '#10141e');
  ctx.fillStyle = g;
  ctx.fill();
  if (warm > 0) {
    within(ctx, p, () => {
      const wg = ctx.createLinearGradient(x + s, 0, x - s, 0);
      wg.addColorStop(0, rgba('#ff8a3a', 0.5 * warm));
      wg.addColorStop(1, rgba('#ff8a3a', 0));
      ctx.fillStyle = wg;
      ctx.fillRect(x - s, y - s * 1.2, s * 2, s * 1.4);
    });
  }
}
const ellPathR = (x: number, y: number, rx: number, ry: number, rot: number) => (c: Ctx) => {
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot, 0, P2);
};

/** The goat track along the ledge: its middle line (x → y) and half-width at x (wider where it's trodden flat). */
const trackY = (x: number) => 700 + Math.sin(x * 0.0042 + 0.6) * 12 + Math.sin(x * 0.011) * 4;
const trackW = (x: number) => 20 + Math.sin(x * 0.007 + 1.3) * 6;

/** A cushion of thyme or a clump of grass on the ledge: a low mound of tiny leaves, its top in the moon, a few pale
 * flowers on the thyme. */
function thyme(ctx: Ctx, r: R, x: number, y: number, s: number, warm: number): void {
  groundShadow(ctx, x + s * 2, y + 1, s * 7, s * 1.6, 0.5, '#020306');
  for (let i = 0; i < 46; i++) {
    const a = r() * Math.PI;
    const d = r() ** 0.6;
    const lx = x + Math.cos(a) * d * s * 7;
    const ly = y - Math.sin(a) * d * s * 4;
    const lit = clamp01((y - ly) / (s * 4) * 0.7 + (x - lx) / (s * 14) + 0.2);
    ctx.fillStyle = mix(mix('#141a1c', '#4a5668', lit), '#c0743a', warm * 0.5 * (1 - lit));
    ctx.fillRect(lx - s * 0.6, ly - s * 0.5, s * 1.3, s);
  }
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = rgba('#9a8ab4', 0.4);
    ctx.fillRect(x + (r() - 0.5) * s * 9, y - r() * s * 4, 1.1, 1.1);
  }
}

/** A root snaking over the ground from a tree: a tapering dark stroke, its top catching the moon, a shadow under it. */
function root(ctx: Ctx, r: R, x0: number, y0: number, dir: number, len: number, w0: number): void {
  const pts: Pt[] = [];
  let x = x0;
  let y = y0;
  let a = dir > 0 ? 0.12 : Math.PI - 0.12;
  for (let i = 0; i <= 10; i++) {
    pts.push([x, y]);
    a += (r() - 0.5) * 0.5;
    x += Math.cos(a) * len / 10;
    y += Math.sin(a) * len / 10 * 0.35 + 0.6;
  }
  ctx.lineCap = 'round';
  for (let i = 1; i < pts.length; i++) {
    const w = w0 * (1 - i / pts.length) + 1;
    ctx.strokeStyle = rgba('#020306', 0.45);
    ctx.lineWidth = w + 2;
    ctx.beginPath();
    ctx.moveTo(pts[i - 1][0] + 2, pts[i - 1][1] + 2);
    ctx.lineTo(pts[i][0] + 2, pts[i][1] + 2);
    ctx.stroke();
    ctx.strokeStyle = '#1e1816';
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(...pts[i - 1]);
    ctx.lineTo(...pts[i]);
    ctx.stroke();
    ctx.strokeStyle = rgba(MOON, 0.2);
    ctx.lineWidth = Math.max(0.8, w * 0.25);
    ctx.beginPath();
    ctx.moveTo(pts[i - 1][0], pts[i - 1][1] - w * 0.35);
    ctx.lineTo(pts[i][0], pts[i][1] - w * 0.35);
    ctx.stroke();
  }
}

function ledge(ctx: Ctx, r: R): void {
  const ground: Pt[] = [...LIP_PTS, [1930, TY + 2], [-10, TY + 2]];
  const gp = polyPath(ground);
  const [fx, fy] = IB.fire;
  const warmAt = (x: number, y: number) => clamp01(1 - Math.hypot(x - fx, (y - fy) * 2.6) / 300);
  gp(ctx);
  ctx.fillStyle = '#24242e';
  ctx.fill();
  within(ctx, gp, () => {
    // goat-trodden earth: stony, a little warmer than the rock, drifting in tone
    surface(ctx, r, LEDGE_BOX, '#262630', { over: true, vary: 0.45, cells: 6, mottle: 0.45, strokes: 0.8, strokeAng: 0, strokeLen: 90, strokeW: 5, grain: 0.3, grainKind: 'speckle', seed: 371, warm: '#4a4448', cool: '#141826' });
    // the track worn into it: trodden flat and pale, its edges cut a little lower, hoof marks pressed into it
    const top: Pt[] = [];
    const bot: Pt[] = [];
    for (let x = -10; x <= 1930; x += 20) {
      top.push([x, trackY(x) - trackW(x)]);
      bot.push([x, trackY(x) + trackW(x)]);
    }
    const tp = polyPath([...top, ...[...bot].reverse()]);
    within(ctx, tp, () => {
      ctx.fillStyle = rgba('#5a5c6c', 0.32);
      ctx.fillRect(0, LIP, W, TY - LIP);
      lay(ctx, drift('#6a6c7c', '#1a1c26', 14, 373, 320, 40), { x: 0, y: 660, w: W, h: 90 }, 0.35);
      for (let i = 0; i < 160; i++) {
        const x = r() * W;
        const y = trackY(x) + (r() - 0.5) * trackW(x) * 1.6;
        ctx.strokeStyle = rgba('#0c0e16', 0.35);
        ctx.lineWidth = 1.1;
        for (const d of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(x + d * 1.8, y, 1.8, Math.PI * 0.1, Math.PI * 0.9);
          ctx.stroke();
        }
      }
    });
    ctx.strokeStyle = rgba('#0a0c14', 0.4);
    ctx.lineWidth = 2;
    ctx.beginPath();
    top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.strokeStyle = rgba(MOON, 0.08);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    bot.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + 1) : ctx.moveTo(x, y + 1)));
    ctx.stroke();
    // bedrock breaking through: humps of grey limestone, their tops in the moon (warm near the fire), their faces
    // towards us in shade, a crevice where they meet the earth, a crack or two
    for (let i = 0; i < 22; i++) {
      const x = r() * W;
      const y = LIP + 16 + r() * 96;
      if (x > fx - 120 && x < fx + 90 && Math.abs(y - fy) < 30) continue;
      const w = 30 + r() * 100;
      const h = 8 + r() * 14;
      const pts = rough(r, [[x, y], [x + w * 0.12, y - h * 0.7], [x + w * 0.35, y - h], [x + w * 0.7, y - h * 0.9], [x + w * 0.9, y - h * 0.5], [x + w, y + 1], [x + w * 0.5, y + 3]], 0.12, 3);
      const rock = smoothPath(pts);
      crevice(ctx, x, x + w, y + 1, 5, 0.4, '#04060c');
      rock(ctx);
      const g = ctx.createLinearGradient(0, y - h, 0, y + 3);
      g.addColorStop(0, '#565e78');
      g.addColorStop(0.35, '#383e54');
      g.addColorStop(1, '#1a1e2c');
      ctx.fillStyle = g;
      ctx.fill();
      const wk = warmAt(x + w / 2, y);
      within(ctx, rock, () => {
        lay(ctx, noiseMask(5, 375 + i, { cover: 0.35, soft: 0.15, col: '#0c0e16', w: 40, h: 16 }), { x, y: y - h, w, h: h + 4 }, 0.4);
        if (wk > 0.02) {
          const wg = ctx.createLinearGradient(fx, 0, x + w / 2, 0);
          wg.addColorStop(0, rgba('#ff8a3a', wk * 0.55));
          wg.addColorStop(1, rgba('#ff8a3a', wk * 0.15));
          ctx.fillStyle = wg;
          ctx.fillRect(x, y - h, w, h + 4);
        }
        ctx.strokeStyle = rgba('#06080e', 0.5);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + w * (0.3 + r() * 0.3), y - h);
        ctx.lineTo(x + w * (0.3 + r() * 0.4), y + 2);
        ctx.stroke();
      });
      // the moon along its crown only
      ctx.strokeStyle = rgba(MOON, 0.2);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      let on = false;
      for (const [px, py] of pts) {
        if (py > y - h * 0.35) {
          on = false;
          continue;
        }
        if (on) ctx.lineTo(px, py + 0.8);
        else ctx.moveTo(px, py + 0.8);
        on = true;
      }
      ctx.stroke();
    }
    // roots: the old oak's out over the earth from the fold, the big pine's in from the right
    root(ctx, r, 140, 708, 1, 220, 9);
    root(ctx, r, 120, 724, 1, 150, 7);
    root(ctx, r, 1840, 744, -1, 260, 11);
    root(ctx, r, 1820, 730, -1, 160, 8);
    // the needles and leaves blown along it, gathered at the track's edges and against the rocks
    for (let i = 0; i < 420; i++) {
      const x = r() * W;
      const edge = r() < 0.5;
      const y = edge ? trackY(x) + (r() < 0.5 ? -1 : 1) * trackW(x) * (0.9 + r() * 0.3) : LIP + 6 + r() * (TY - LIP);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(r() * P2);
      if (r() < 0.7) {
        ctx.strokeStyle = rgba(r() < 0.6 ? '#4a3a2a' : '#141210', 0.6);
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(-3.5, 0);
        ctx.lineTo(3.5, 0.6);
        ctx.stroke();
      } else {
        ctx.fillStyle = rgba(r() < 0.5 ? '#4a3420' : '#2e2618', 0.75);
        ctx.beginPath();
        ctx.ellipse(0, 0, 4, 2, 0, 0, P2);
        ctx.fill();
        ctx.fillStyle = rgba(MOON, 0.12);
        ctx.fillRect(-3, -1.4, 6, 0.8);
      }
      ctx.restore();
    }
    // the near edge, falling into shade before the table
    vfill(ctx, 0, TY - 50, W, 52, [[0, 'rgba(4,6,12,0)'], [1, 'rgba(4,6,12,0.5)']]);
    // the sentry's embers' light on the ground round them
    lightPool(ctx, fx, fy, 270, 60, '#ff7a2a', 0.32);
    lightPool(ctx, fx, fy, 120, 28, '#ffb060', 0.3);
  });
  // the lip: dark against the drop, tufts and stones rimmed by the moon
  ctx.strokeStyle = rgba(MOON, 0.1);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  LIP_PTS.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  crevice(ctx, 0, W, LIP + 2, 12, 0.3, '#04060c');
  for (let i = 0; i < 16; i++) {
    const cx0 = r() * W;
    const n = 1 + Math.floor(r() * 5);
    for (let k = 0; k < n; k++) {
      const x = cx0 + (r() - 0.5) * 50;
      tuft(ctx, r, x, along(LIP_PTS, x, 0) + 3 + r() * 6, 0.5 + r() * 0.9);
    }
  }
  // thyme cushions and grass along the track's edges and between the rocks
  for (let i = 0; i < 26; i++) {
    const x = 380 + r() * 1400;
    const y = r() < 0.6 ? trackY(x) + (r() < 0.5 ? -1 : 1) * (trackW(x) + 6 + r() * 10) : LIP + 14 + r() * 100;
    if (Math.hypot(x - fx, (y - fy) * 2) < 90) continue;
    if (r() < 0.55) thyme(ctx, r, x, y, 1.2 + r() * 0.8, warmAt(x, y));
    else tuft(ctx, r, x, y, 0.6 + r() * 0.6);
  }
  for (let i = 0; i < 60; i++) {
    const x = r() * W;
    const y = LIP + 12 + r() ** 1.4 * (TY - LIP - 14);
    pebble(ctx, r, x, y, 1.6 + r() * 4.5, warmAt(x, y));
  }
}

// ——— the shepherd's fold and his hut ———

export const FOLD_BOX: Box = { x: 0, y: 470, w: 480, h: TY - 470 };

/** Drystone filling a box: courses of rough stones, each lit on its top edge, shaded under, dark chinks between. */
function drystone(ctx: Ctx, r: R, box: Box, base: string, ch: number, o: { lit?: number; warm?: (x: number, y: number) => number } = {}): void {
  ctx.fillStyle = '#05060c';
  ctx.fillRect(box.x, box.y, box.w, box.h);
  for (let y = box.y - ch * 0.3; y < box.y + box.h; ) {
    const h = ch * (0.6 + r() * 0.6);
    for (let x = box.x - r() * ch; x < box.x + box.w; ) {
      const w = ch * (0.8 + r() * 1.9);
      const sh = h * (0.7 + r() * 0.5);
      const oy = (r() - 0.5) * h * 0.3;
      const pts = rough(r, [[x + 1.5 + r() * 2, y + oy + 1.5 + r() * 3], [x + w - 1.5 - r() * 3, y + oy + 1.5 + r() * 3], [x + w - 1, y + oy + sh - 1.5], [x + 1 + r() * 2, y + oy + sh - 1]], 0.25, 4);
      const col = shade(base, (r() - 0.5) * 0.3);
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, shade(col, 0.18 * (o.lit ?? 1)));
      g.addColorStop(0.4, col);
      g.addColorStop(1, shade(col, -0.45));
      smoothPath(pts)(ctx);
      ctx.fillStyle = g;
      ctx.fill();
      const wk = o.warm ? o.warm(x + w / 2, y + h / 2) : 0;
      if (wk > 0.02) {
        ctx.fillStyle = rgba('#ff8a3a', wk * 0.35);
        ctx.fill();
      }
      ctx.strokeStyle = rgba(MOON, 0.16 * (o.lit ?? 1));
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pts[0][0] + 2, pts[0][1] + 0.5);
      ctx.lineTo(pts[1][0] - 2, pts[1][1] + 0.5);
      ctx.stroke();
      x += w;
    }
    y += h;
  }
  lay(ctx, noiseMask(8, 381, { cover: 0.28, soft: 0.1, col: '#4a5a4a', w: 90, h: 60 }), box, 0.25);
}

const HUT = { x0: 90, x1: 290, side: 342, foot: 690, eave: 556, ridge: 524 };
const WALL_TOP = (x: number) => 668 + Math.sin(x * 0.018) * 3 + (x > 300 ? (x - 300) * 0.04 : 0);
const GATE = [326, 384];

function fold(ctx: Ctx, r: R): void {
  const H = HUT;
  // the hut: drystone walls under a roof of stone slabs and brush weighed down with stones; we see its front (in the
  // shade, the moon being behind it) and its right flank (turned to the moon, pale)
  groundShadow(ctx, (H.x0 + H.side) / 2 + 20, H.foot + 2, 150, 10, 0.6, '#020306');
  const front = polyPath([[H.x0, H.foot], [H.x0, H.eave], [H.x1, H.eave - 2], [H.x1, H.foot]]);
  const flank = polyPath([[H.x1, H.foot], [H.x1, H.eave - 2], [H.side, H.eave - 14], [H.side, H.foot - 12]]);
  within(ctx, front, () => {
    drystone(ctx, r, { x: H.x0, y: H.eave - 4, w: H.x1 - H.x0, h: H.foot - H.eave + 6 }, '#323a54', 13, { lit: 0.8 });
    vfill(ctx, H.x0, H.eave, H.x1 - H.x0, 100, [[0, 'rgba(4,6,14,0.45)'], [1, 'rgba(4,6,14,0.15)']]);
  });
  within(ctx, flank, () => {
    drystone(ctx, r, { x: H.x1, y: H.eave - 16, w: H.side - H.x1, h: H.foot - H.eave + 8 }, '#56628a', 11, { lit: 1.4 });
    vfill(ctx, H.x1, H.eave - 16, H.side - H.x1, 30, [[0, 'rgba(4,6,14,0.5)'], [1, 'rgba(4,6,14,0)']]);
  });
  creviceV(ctx, H.x1, H.eave, H.foot, 8, 0.4);
  // the doorway: a black opening under a big lintel stone
  const dx = 150;
  const door = polyPath([[dx, H.foot], [dx + 2, H.eave + 36], [dx + 48, H.eave + 34], [dx + 50, H.foot]]);
  door(ctx);
  ctx.fillStyle = '#020306';
  ctx.fill();
  within(ctx, door, () => vfill(ctx, dx, H.eave + 34, 50, 60, [[0, 'rgba(0,0,0,0)'], [1, rgba('#1a2030', 0.5)]]));
  // its jambs: the wall's thickness, the right one catching the moon
  ctx.fillStyle = rgba('#4a5478', 0.5);
  ctx.fillRect(dx + 44, H.eave + 36, 6, H.foot - H.eave - 36);
  ctx.fillStyle = rgba('#05060c', 0.6);
  ctx.fillRect(dx, H.eave + 36, 5, H.foot - H.eave - 36);
  // weeds and nettles grown up round the hut's foot
  for (let i = 0; i < 12; i++) tuft(ctx, r, H.x0 + r() * (H.side - H.x0), H.foot - 1 - r() * 4, 0.7 + r() * 0.6);
  const lintel = polyPath(rough(r, [[dx - 14, H.eave + 36], [dx - 10, H.eave + 22], [dx + 64, H.eave + 20], [dx + 66, H.eave + 35]], 0.1, 2));
  lintel(ctx);
  ctx.fillStyle = '#3a4260';
  ctx.fill();
  ctx.strokeStyle = rgba(MOON, 0.3);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(dx - 10, H.eave + 22);
  ctx.lineTo(dx + 64, H.eave + 20);
  ctx.stroke();
  castShadow(ctx, lintel, 3, 3, 0.4, '#020306');
  // the roof: slabs overlapping, brush and old branches over them, stones holding it down; its top in the moon
  const roof: Pt[] = [[H.x0 - 16, H.eave + 4], [H.x0 + 10, H.ridge + 6], [H.x1 + 10, H.ridge], [H.side + 10, H.eave - 18], [H.side + 6, H.eave - 10], [H.x1 + 6, H.eave + 4]];
  castShadow(ctx, polyPath(roof), 8, 10, 0.5, '#020306');
  polyPath(roof)(ctx);
  ctx.fillStyle = '#1a1e2c';
  ctx.fill();
  within(ctx, polyPath(roof), () => {
    for (let i = 0; i < 26; i++) {
      const x = H.x0 - 10 + r() * (H.side - H.x0 + 10);
      const y = H.ridge + r() * (H.eave - H.ridge + 4);
      const w = 30 + r() * 40;
      ctx.fillStyle = shade('#3a4260', (r() - 0.5) * 0.3);
      ctx.beginPath();
      ctx.ellipse(x, y, w / 2, 5 + r() * 3, -0.05, 0, P2);
      ctx.fill();
      ctx.fillStyle = rgba(MOON, 0.16);
      ctx.beginPath();
      ctx.ellipse(x - 2, y - 2, w / 2 - 4, 2, -0.05, 0, P2);
      ctx.fill();
    }
    // brush: dry branches across it
    ctx.lineCap = 'round';
    for (let i = 0; i < 40; i++) {
      const x = H.x0 - 10 + r() * (H.side - H.x0);
      const y = H.ridge + r() * 30;
      ctx.strokeStyle = r() < 0.3 ? rgba('#8a8070', 0.4) : '#0e0c10';
      ctx.lineWidth = 1 + r() * 1.6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 20 + r() * 40, y + (r() - 0.6) * 10);
      ctx.stroke();
    }
    vfill(ctx, H.x0, H.ridge, H.side - H.x0, 50, [[0, rgba(MOON, 0.14)], [1, rgba(MOON, 0)]]);
  });
  // weighting stones on the roof
  for (const [sx, sy, ss] of [[130, H.ridge + 8, 8], [196, H.ridge + 4, 10], [262, H.ridge + 3, 7], [316, H.ridge + 16, 8]] as const) pebble(ctx, r, sx, sy, ss);
  // the fold's ring of drystone in front of it: its front arc, the gate in it blocked by a brushwood hurdle
  const wallBase = (x: number) => 712 - Math.abs(x - 180) * 0.03;
  for (const [x0, x1] of [[-10, GATE[0]], [GATE[1], 478]] as const) {
    const top: Pt[] = [];
    for (let x = x0; x <= x1; x += 10) top.push([x, WALL_TOP(x) + (r() - 0.5) * 3]);
    const wall: Pt[] = [...top, [x1, wallBase(x1)], [x0, wallBase(x0)]];
    groundShadow(ctx, (x0 + x1) / 2 + 20, wallBase((x0 + x1) / 2) + 2, (x1 - x0) / 2, 8, 0.6, '#020306');
    within(ctx, polyPath(wall), () => {
      drystone(ctx, r, { x: x0, y: 640, w: x1 - x0, h: 80 }, '#2e3650', 12, { lit: 0.9 });
      vfill(ctx, x0, 650, x1 - x0, 66, [[0, 'rgba(4,6,14,0)'], [0.4, 'rgba(4,6,14,0.25)'], [1, 'rgba(4,6,14,0.55)']]);
    });
    // its capstones, set on edge, their tops in the moon
    for (let x = x0 + 4; x < x1 - 6; x += 12 + r() * 8) {
      const y = WALL_TOP(x);
      const cap = polyPath(rough(r, [[x, y + 2], [x + 2, y - 9 - r() * 4], [x + 10, y - 8 - r() * 4], [x + 11, y + 2]], 0.15, 2));
      cap(ctx);
      ctx.fillStyle = shade('#262c42', (r() - 0.5) * 0.3);
      ctx.fill();
      ctx.strokeStyle = rgba(MOON, 0.12);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  // the hurdle in the gate: woven brushwood between two stakes, sagging
  const hy0 = 674;
  const hy1 = 712;
  ctx.lineCap = 'round';
  for (const sx of [GATE[0] + 4, GATE[1] - 4]) {
    ctx.strokeStyle = '#100c0c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(sx, hy1 + 2);
    ctx.lineTo(sx + (r() - 0.5) * 4, hy0 - 10);
    ctx.stroke();
  }
  for (let i = 0; i < 9; i++) {
    const y = hy0 + 3 + i * 5.5;
    ctx.strokeStyle = i % 2 ? '#1a1416' : '#2a2224';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(GATE[0] + 2, y);
    ctx.quadraticCurveTo((GATE[0] + GATE[1]) / 2, y + 4 + r() * 3, GATE[1] - 2, y + (r() - 0.5) * 2);
    ctx.stroke();
    if (i % 3 === 0) {
      ctx.strokeStyle = rgba(MOON, 0.18);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  groundShadow(ctx, (GATE[0] + GATE[1]) / 2 + 10, hy1 + 2, 34, 5, 0.6, '#020306');
}

// ——— the old oak by the fold (its trunk; its bough is a sprite) ———

export const OAK_BOX: Box = { x: 0, y: 0, w: 150, h: 700 };
const oakPath = polyPath([[-20, 700], [-10, 600], [12, 470], [30, 330], [26, 240], [44, 170], [36, 100], [50, 30], [44, -6], [118, -6], [108, 60], [96, 150], [104, 230], [92, 320], [102, 430], [124, 560], [148, 690], [-20, 702]]);

function oak(ctx: Ctx, r: R): void {
  oakPath(ctx);
  ctx.fillStyle = BARK;
  ctx.fill();
  within(ctx, oakPath, () => {
    surface(ctx, r, OAK_BOX, '#2a2420', { over: true, vary: 0.4, cells: 3, mottle: 0.4, strokes: 6, strokeAng: Math.PI / 2, strokeLen: 90, strokeW: 4, grain: 0.35, grainKind: 'wood', seed: 391 });
    // deep oak bark: a net of thick ridges, the moon's side (right) catching their edges
    for (let i = 0; i < 120; i++) {
      const x = r() * 150;
      const y = r() * 700;
      const l = 14 + r() * 30;
      ctx.strokeStyle = 'rgba(2,2,4,0.75)';
      ctx.lineWidth = 2 + r() * 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (r() - 0.5) * 6, y + l);
      ctx.stroke();
      ctx.strokeStyle = rgba(MOON, 0.1);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 2.4, y);
      ctx.lineTo(x + 2.4 + (r() - 0.5) * 6, y + l);
      ctx.stroke();
    }
    // round: the moon's side (right) pale, the left falling into black
    const g = ctx.createLinearGradient(0, 0, 150, 0);
    g.addColorStop(0, 'rgba(1,2,6,0.85)');
    g.addColorStop(0.45, 'rgba(1,2,6,0.5)');
    g.addColorStop(0.8, rgba('#8ea0d0', 0.04));
    g.addColorStop(1, rgba('#8ea0d0', 0.28));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 150, 700);
    lay(ctx, noiseMask(6, 393, { cover: 0.35, soft: 0.2, col: '#16241a', w: 40, h: 160 }), { x: 0, y: 420, w: 80, h: 280 }, 0.45);
    vfill(ctx, 0, 0, 150, 160, [[0, 'rgba(1,2,6,0.7)'], [1, 'rgba(1,2,6,0)']]);
  });
  rim(ctx, oakPath, 0.25, 3, MOON);
}

// ——— the fallen oak across the path ———

export const FALLEN_BOX: Box = { x: 1440, y: 520, w: 480, h: TY - 520 };
const LOG = { x0: 1462, y0: 714, x1: 1930, y1: 648, r0: 22, r1: 38 };
const logY = (x: number) => LOG.y0 + ((x - LOG.x0) / (LOG.x1 - LOG.x0)) * (LOG.y1 - LOG.y0);
const logR = (x: number) => LOG.r0 + ((x - LOG.x0) / (LOG.x1 - LOG.x0)) * (LOG.r1 - LOG.r0);

function fallen(ctx: Ctx, r: R): void {
  // its shadow on the path, thrown down and to the right of it
  const top: Pt[] = [];
  const bot: Pt[] = [];
  for (let x = LOG.x0; x <= LOG.x1; x += 12) {
    top.push([x, logY(x) - logR(x) + Math.sin(x * 0.07) * 1.5]);
    bot.push([x, logY(x) + logR(x) * 0.7]);
  }
  const log = polyPath([...top, ...bot.reverse()]);
  castShadow(ctx, log, 10, 12, 0.45, '#020306');
  groundShadow(ctx, 1700, logY(1700) + logR(1700) * 0.7, 260, 12, 0.6, '#020306');
  // a broken limb off its upper side, standing up into the air (the owl's perch), and the snapped stubs of others
  ctx.lineCap = 'round';
  const limb = (x0: number, y0: number, x1: number, y1: number, w0: number, w1: number) => {
    const n = 8;
    for (let i = 0; i < n; i++) {
      const t0 = i / n;
      const t1 = (i + 1) / n;
      ctx.strokeStyle = '#141014';
      ctx.lineWidth = w0 + (w1 - w0) * t0;
      ctx.beginPath();
      ctx.moveTo(x0 + (x1 - x0) * t0 + Math.sin(t0 * 5) * 3, y0 + (y1 - y0) * t0);
      ctx.lineTo(x0 + (x1 - x0) * t1 + Math.sin(t1 * 5) * 3, y0 + (y1 - y0) * t1);
      ctx.stroke();
    }
    ctx.strokeStyle = rgba(MOON, 0.28);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x0 - w0 * 0.35, y0);
    ctx.lineTo(x1 - w1 * 0.35 + Math.sin(5) * 3, y1);
    ctx.stroke();
  };
  limb(1702, logY(1702) - logR(1702) + 6, IB.owl[0], IB.owl[1] + 2, 12, 6);
  limb(1600, logY(1600) - logR(1600) + 4, 1576, 628, 8, 4);
  limb(1520, logY(1520) - 6, 1470, 650, 7, 3);
  limb(1500, logY(1500), 1450, 690, 6, 2.5);
  // the splintered end of the broken limb, pale
  ctx.fillStyle = rgba('#9a8a7a', 0.6);
  ctx.beginPath();
  ctx.moveTo(IB.owl[0] - 4, IB.owl[1] + 3);
  ctx.lineTo(IB.owl[0] - 1, IB.owl[1] - 4);
  ctx.lineTo(IB.owl[0] + 2, IB.owl[1] + 1);
  ctx.lineTo(IB.owl[0] + 4, IB.owl[1] - 2);
  ctx.lineTo(IB.owl[0] + 4, IB.owl[1] + 4);
  ctx.closePath();
  ctx.fill();
  // the trunk: deep-ridged bark running along it, round (its top in the moon, its underside black), moss below
  log(ctx);
  ctx.fillStyle = BARK;
  ctx.fill();
  within(ctx, log, () => {
    surface(ctx, r, FALLEN_BOX, '#2e2824', { over: true, vary: 0.35, cells: 3, mottle: 0.4, strokes: 4, strokeAng: -0.15, strokeLen: 80, strokeW: 3, grain: 0.3, grainKind: 'wood', seed: 401 });
    for (let i = 0; i < 90; i++) {
      const x = LOG.x0 + r() * (LOG.x1 - LOG.x0);
      const y = logY(x) + (r() - 0.5) * logR(x) * 1.5;
      const l = 12 + r() * 26;
      ctx.strokeStyle = 'rgba(2,2,4,0.7)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + l, y - l * 0.15);
      ctx.stroke();
      ctx.strokeStyle = rgba(MOON, 0.08);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y - 2);
      ctx.lineTo(x + l, y - 2 - l * 0.15);
      ctx.stroke();
    }
    for (let x = LOG.x0; x <= LOG.x1; x += 6) {
      const y = logY(x);
      const rr = logR(x);
      const g = ctx.createLinearGradient(0, y - rr, 0, y + rr * 0.7);
      g.addColorStop(0, rgba('#9aaad8', 0.3));
      g.addColorStop(0.25, rgba('#9aaad8', 0.04));
      g.addColorStop(0.6, 'rgba(2,2,6,0.4)');
      g.addColorStop(1, 'rgba(2,2,6,0.85)');
      ctx.fillStyle = g;
      ctx.fillRect(x, y - rr - 2, 6.5, rr * 1.8 + 4);
    }
    // the sentry's embers warm its left end
    const wg = ctx.createRadialGradient(IB.fire[0], IB.fire[1], 40, IB.fire[0], IB.fire[1], 260);
    wg.addColorStop(0, rgba('#ff8a3a', 0.4));
    wg.addColorStop(1, rgba('#ff8a3a', 0));
    ctx.fillStyle = wg;
    ctx.fillRect(LOG.x0, 600, 300, 140);
    lay(ctx, noiseMask(7, 403, { cover: 0.35, soft: 0.15, col: '#1e3020', w: 120, h: 30 }), { x: LOG.x0, y: 640, w: 470, h: 90 }, 0.6);
  });
  // its broken end: splintered, pale heartwood
  const ex = LOG.x0;
  const ey = LOG.y0;
  const end = polyPath([[ex - 6, ey - LOG.r0], [ex + 2, ey - LOG.r0 + 4], [ex - 4, ey - 4], [ex + 4, ey + 2], [ex - 2, ey + LOG.r0 * 0.7], [ex - 10, ey + 4], [ex - 14, ey - 8]]);
  end(ctx);
  ctx.fillStyle = '#5a4a3c';
  ctx.fill();
  ctx.strokeStyle = 'rgba(2,2,4,0.6)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // dead leaves still on it, a few sprigs
  for (let i = 0; i < 40; i++) {
    const x = 1450 + r() * 160;
    const y = 640 + r() * 70;
    ctx.fillStyle = rgba(r() < 0.4 ? '#5a3e2a' : '#1a1210', 0.8);
    ctx.beginPath();
    ctx.ellipse(x, y, 4, 2, r() * 3, 0, P2);
    ctx.fill();
  }
}

// ——— the sentry's post: the kicked-over fire, the dropped spear, the shield on the trunk, the cloak ———

export const POST_BOX: Box = { x: 1040, y: 642, w: 580, h: TY - 642 };
const SHIELD = { x: 1572, y: 704, r: 34 };

function post(ctx: Ctx, r: R): void {
  const [fx, fy] = IB.fire;
  // the ash, kicked out in a fan to the left, the hearthstones scattered
  softly(ctx, { x: fx - 120, y: fy - 20, w: 180, h: 46 }, (g) => {
    g.fillStyle = rgba('#5a5a62', 0.55);
    g.beginPath();
    g.ellipse(fx - 30, fy + 2, 70, 9, -0.05, 0, P2);
    g.fill();
    g.fillStyle = rgba('#0a0808', 0.7);
    g.beginPath();
    g.ellipse(fx + 4, fy + 1, 30, 7, 0, 0, P2);
    g.fill();
  }, 0.5);
  for (const [sx, sy, ss] of [[fx + 34, fy - 4, 9], [fx + 22, fy - 12, 7], [fx + 40, fy + 6, 8], [fx - 72, fy + 12, 8], [fx - 104, fy + 4, 6], [fx - 46, fy + 20, 7]] as const) pebble(ctx, r, sx, sy, ss, 0.9);
  // the brands, spilled: charred sticks, their ends still glowing
  ctx.lineCap = 'round';
  for (const [x0, y0, x1, y1, w] of [[fx - 4, fy - 2, fx - 74, fy + 8, 6], [fx + 6, fy + 2, fx - 40, fy + 16, 5], [fx - 10, fy - 6, fx + 24, fy - 14, 5]] as const) {
    ctx.strokeStyle = '#0c0a0a';
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.strokeStyle = rgba('#5a5048', 0.45);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x0, y0 - w * 0.35);
    ctx.lineTo(x1, y1 - w * 0.35);
    ctx.stroke();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    lightPool(ctx, x0, y0, 8, 4, '#ff6a1a', 0.7);
    ctx.restore();
    ctx.fillStyle = '#ffb050';
    ctx.fillRect(x0 - 1.5, y0 - 1, 3, 2);
  }
  // the ember bed
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 40; i++) {
    const x = fx + (r() - 0.5) * 44;
    const y = fy + (r() - 0.5) * 8;
    lightPool(ctx, x, y, 3 + r() * 4, 2 + r() * 1.5, r() < 0.3 ? '#ffd080' : '#ff6a1a', 0.5 + r() * 0.4);
  }
  ctx.restore();
  // the spear, dropped along the path: an ash shaft, its bronze leaf-shaped head to the left, the butt spike right
  const sp = { x0: 1052, y0: 748, x1: 1262, y1: 732 };
  groundShadow(ctx, (sp.x0 + sp.x1) / 2 + 8, (sp.y0 + sp.y1) / 2 + 4, 110, 3, 0.55, '#020306');
  ctx.strokeStyle = '#241c18';
  ctx.lineWidth = 4.6;
  ctx.beginPath();
  ctx.moveTo(sp.x0 + 30, sp.y0 - 2.3);
  ctx.lineTo(sp.x1 - 14, sp.y1 + 1);
  ctx.stroke();
  ctx.strokeStyle = rgba(MOON, 0.3);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(sp.x0 + 30, sp.y0 - 4);
  ctx.lineTo(sp.x1 - 14, sp.y1 - 0.8);
  ctx.stroke();
  const head = polyPath([[sp.x0, sp.y0 - 1], [sp.x0 + 14, sp.y0 - 6], [sp.x0 + 32, sp.y0 - 3.5], [sp.x0 + 32, sp.y0 - 1], [sp.x0 + 14, sp.y0 + 2.5]]);
  head(ctx);
  ctx.fillStyle = mix(BRONZE.shade, '#2a3048', 0.3);
  ctx.fill();
  ctx.strokeStyle = rgba(BRONZE.lit, 0.5);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(sp.x0 + 1, sp.y0 - 1.5);
  ctx.lineTo(sp.x0 + 30, sp.y0 - 3);
  ctx.stroke();
  const butt = polyPath([[sp.x1 - 16, sp.y1 - 1.5], [sp.x1, sp.y1 - 0.2], [sp.x1 - 16, sp.y1 + 3]]);
  butt(ctx);
  ctx.fillStyle = BRONZE.shade;
  ctx.fill();
  // his cloak, left in a heap: coarse wool in a dull red, its folds' tops catching the embers
  const ck = { x: 1430, y: 742 };
  groundShadow(ctx, ck.x + 10, ck.y + 2, 46, 6, 0.6, '#020306');
  const heap = smoothPath([[ck.x - 44, ck.y + 2], [ck.x - 36, ck.y - 14], [ck.x - 14, ck.y - 22], [ck.x + 8, ck.y - 18], [ck.x + 30, ck.y - 24], [ck.x + 46, ck.y - 8], [ck.x + 48, ck.y + 3]]);
  heap(ctx);
  ctx.fillStyle = '#3e1614';
  ctx.fill();
  within(ctx, heap, () => {
    grain(ctx, { x: ck.x - 50, y: ck.y - 30, w: 100, h: 36 }, 'canvas', 0.3, 0.6);
    for (const [ax, ay, bx, by] of [[ck.x - 30, ck.y - 10, ck.x - 4, ck.y - 16], [ck.x - 8, ck.y - 4, ck.x + 30, ck.y - 18], [ck.x + 10, ck.y, ck.x + 40, ck.y - 6]] as const) {
      ctx.strokeStyle = 'rgba(8,2,4,0.6)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo((ax + bx) / 2, ay - 6, bx, by);
      ctx.stroke();
      ctx.strokeStyle = rgba('#d86a4a', 0.35);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(ax - 2, ay - 3);
      ctx.quadraticCurveTo((ax + bx) / 2 - 2, ay - 9, bx - 2, by - 3);
      ctx.stroke();
    }
    vfill(ctx, ck.x - 50, ck.y - 30, 100, 36, [[0, rgba('#ff8a5a', 0.12)], [1, 'rgba(4,2,4,0.5)']]);
  });
  // his shield, leaning on the fallen trunk: bronze rim, its face painted with our own device, three springs
  const S = SHIELD;
  const face = ellPathR(S.x, S.y, S.r * 0.78, S.r, -0.22);
  groundShadow(ctx, S.x + 20, S.y + S.r - 2, S.r * 1.1, 6, 0.6, '#020306');
  castShadow(ctx, face, 6, 8, 0.5, '#020306');
  face(ctx);
  ctx.fillStyle = mix(BRONZE.shade, '#2a3048', 0.25);
  ctx.fill();
  within(ctx, face, () => {
    const g = ctx.createLinearGradient(S.x - S.r, S.y - S.r, S.x + S.r, S.y + S.r);
    g.addColorStop(0, rgba('#c8d6ff', 0.2));
    g.addColorStop(0.5, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = g;
    ctx.fillRect(S.x - S.r, S.y - S.r, S.r * 2, S.r * 2);
    // the face, inside the rim: dark paint, the device in pale ochre
    const inner = ellPathR(S.x, S.y, S.r * 0.64, S.r * 0.82, -0.22);
    inner(ctx);
    ctx.fillStyle = '#1e1a20';
    ctx.fill();
    ctx.strokeStyle = '#8a7450';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath();
      for (let x = -13; x <= 13; x += 2) {
        const y = S.y + k * 11 + Math.sin((x / 13) * Math.PI * 1.5) * 3.2 - x * 0.22;
        if (x === -13) ctx.moveTo(S.x + x, y);
        else ctx.lineTo(S.x + x, y);
      }
      ctx.stroke();
    }
    // the embers' light on its left, scuffs on the paint
    const wg = ctx.createLinearGradient(S.x - S.r, 0, S.x + S.r, 0);
    wg.addColorStop(0, rgba('#ff8a3a', 0.3));
    wg.addColorStop(1, rgba('#ff8a3a', 0));
    ctx.fillStyle = wg;
    ctx.fillRect(S.x - S.r, S.y - S.r, S.r * 2, S.r * 2);
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = rgba('#8a7a6a', 0.3);
      ctx.fillRect(S.x + (r() - 0.5) * S.r * 1.2, S.y + (r() - 0.5) * S.r * 1.3, 3 + r() * 4, 1);
    }
  });
  ctx.strokeStyle = rgba(MOON, 0.4);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(S.x, S.y, S.r * 0.78 - 1, S.r - 1, -0.22, Math.PI * 0.9, Math.PI * 1.5);
  ctx.stroke();
  ctx.strokeStyle = '#140c08';
  ctx.lineWidth = 1.6;
  face(ctx);
  ctx.stroke();
}

// ——— the big pine on the right (its trunk; its boughs are a sprite) ———

export const PINE_BOX: Box = { x: 1770, y: 0, w: 150, h: TY };
const pinePath = polyPath([[1806, TY], [1822, 660], [1830, 500], [1838, 300], [1846, 120], [1852, -6], [1930, -6], [1930, TY]]);

/** A pine's bark down a trunk path: long irregular plates between dark wandering furrows, each plate's upper edge
 * catching the moon on the lit side; round (lit on `litLeft`'s side, falling into black on the other). */
function pineBark(ctx: Ctx, r: R, box: Box, cx: (y: number) => number, hw: (y: number) => number, litLeft: boolean, seed: number): void {
  surface(ctx, r, box, '#2e231e', { over: true, vary: 0.35, cells: 3, mottle: 0.4, strokes: 4, strokeAng: Math.PI / 2, strokeLen: 120, strokeW: 4, grain: 0.3, grainKind: 'wood', seed });
  const nF = Math.max(4, Math.round((hw(box.y + box.h) * 2) / 12));
  for (let i = 0; i <= nF; i++) {
    let u = -1 + (2 * i) / nF + (r() - 0.5) * 0.1;
    // a furrow wandering down, and the plates on its right cut by slanting cross-cracks
    ctx.strokeStyle = 'rgba(2,1,4,0.8)';
    ctx.lineWidth = 2.6 * (1 - Math.abs(u) * 0.5);
    ctx.beginPath();
    const pts: Pt[] = [];
    for (let y = box.y - 10; y < box.y + box.h + 10; y += 12) {
      u = Math.max(-1, Math.min(1, u + (r() - 0.5) * 0.06));
      pts.push([cx(y) + Math.sin((u * Math.PI) / 2) * hw(y), y]);
    }
    pts.forEach(([px, py], j) => (j ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.stroke();
    for (let j = 0; j < pts.length - 1; j += 2 + Math.floor(r() * 4)) {
      const [px, py] = pts[j];
      const pw = (hw(py) * 2) / nF;
      const face = litLeft ? -Math.sin((u * Math.PI) / 2) : Math.sin((u * Math.PI) / 2);
      ctx.fillStyle = rgba(r() < 0.5 ? '#4a3a30' : '#140e0c', 0.3);
      ctx.fillRect(px + 1.5, py, pw - 3, 10 + r() * 18);
      ctx.strokeStyle = 'rgba(2,1,4,0.6)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(px, py + (r() - 0.5) * 4);
      ctx.lineTo(px + pw, py + (r() - 0.5) * 8);
      ctx.stroke();
      ctx.strokeStyle = rgba('#a8b6e0', 0.06 + Math.max(0, face) * 0.12);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px + 1, py + 2);
      ctx.lineTo(px + pw - 1, py + 2 + (r() - 0.5) * 4);
      ctx.stroke();
    }
  }
  const g = ctx.createLinearGradient(box.x, 0, box.x + box.w, 0);
  const lit = rgba('#9aaad8', 0.26);
  g.addColorStop(0, litLeft ? lit : 'rgba(1,2,6,0.85)');
  g.addColorStop(0.25, litLeft ? rgba('#9aaad8', 0.03) : 'rgba(1,2,6,0.6)');
  g.addColorStop(0.55, 'rgba(1,2,6,0.5)');
  g.addColorStop(0.8, litLeft ? 'rgba(1,2,6,0.7)' : rgba('#9aaad8', 0.03));
  g.addColorStop(1, litLeft ? 'rgba(1,2,6,0.88)' : lit);
  ctx.fillStyle = g;
  ctx.fillRect(box.x, box.y, box.w, box.h);
}

function pine(ctx: Ctx, r: R): void {
  groundShadow(ctx, 1880, TY - 4, 120, 10, 0.7, '#020306');
  pinePath(ctx);
  ctx.fillStyle = '#2a201c';
  ctx.fill();
  within(ctx, pinePath, () => {
    pineBark(ctx, r, PINE_BOX, (y) => 1890 - (y / TY) * 30, (y) => 50 + (y / TY) * 22, true, 411);
    // the embers' glow on its foot
    const wg = ctx.createRadialGradient(1640, TY, 20, 1640, TY, 280);
    wg.addColorStop(0, rgba('#ff8a3a', 0.22));
    wg.addColorStop(1, rgba('#ff8a3a', 0));
    ctx.fillStyle = wg;
    ctx.fillRect(1800, 500, 130, 270);
    vfill(ctx, 1800, -10, 130, 200, [[0, 'rgba(1,2,6,0.75)'], [1, 'rgba(1,2,6,0)']]);
  });
}

// ——— the wood on the right: tall pines rising from the slope below the ledge, framing the mountain ———

export const WOOD_BOX: Box = { x: 1444, y: 0, w: 340, h: LIP + 4 };
const WOOD: [number, number, number, number][] = [[1526, 12, 0.06, 220], [1636, 16, -0.03, 160]];

function wood(ctx: Ctx, r: R): void {
  // a rank of younger pines on the slope just below the ledge, darker and nearer than the forest beyond
  for (let i = 0; i < 18; i++) {
    const x = 1460 + r() * 360;
    forestTree(ctx, r, x, LIP - 4 - r() * 50, 14 + r() * 10, true, 0.08, 0, 1);
  }
  // two old black pines rising from below the lip: tapering trunks, the stubs of dead limbs, flat crowns spread in
  // layers high up, black against the crags, their tops on the moon's side silvered
  for (const [x, w, lean, top] of WOOD) {
    const cx = (y: number) => x + lean * (LIP - y) * 0.15 + Math.sin(y * 0.01) * 4;
    const hw = (y: number) => w * (0.45 + clamp01((y - top) / (LIP - top)) * 0.6);
    const pts: Pt[] = [];
    for (let y = top; y <= LIP + 4; y += 16) pts.push([cx(y) - hw(y), y]);
    for (let y = LIP + 4; y >= top; y -= 16) pts.push([cx(y) + hw(y), y]);
    const tp = polyPath(pts);
    tp(ctx);
    ctx.fillStyle = '#1a1412';
    ctx.fill();
    within(ctx, tp, () => {
      pineBark(ctx, r, { x: x - w * 2, y: top, w: w * 4, h: LIP + 4 - top }, cx, hw, true, 413 + x);
      vfill(ctx, x - w * 2, 300, w * 4, LIP - 290, [[0, 'rgba(2,3,8,0)'], [1, 'rgba(2,3,8,0.45)']]);
    });
    rim(ctx, tp, 0.2, 2, MOON);
    ctx.lineCap = 'round';
    for (let y = top + 140 + r() * 40; y < LIP - 60; y += 60 + r() * 70) {
      const d = r() < 0.5 ? -1 : 1;
      const l = 8 + r() * 18;
      ctx.strokeStyle = '#100c0c';
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.moveTo(cx(y) + d * hw(y) * 0.8, y);
      ctx.lineTo(cx(y) + d * (hw(y) + l), y - l * 0.5);
      ctx.stroke();
      ctx.strokeStyle = rgba(MOON, 0.22);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx(y) + d * hw(y) * 0.8, y - 1.5);
      ctx.lineTo(cx(y) + d * (hw(y) + l), y - l * 0.5 - 1.5);
      ctx.stroke();
    }
    // the crown: limbs fanning out from the top of the trunk, each carrying a flat layered spray
    const tx = cx(top);
    const blobs: [number, number, number][] = [];
    const sprays = [[-1, 0.9, 30], [1, 0.8, 22], [-1, 0.55, -12], [1, 0.6, -20], [0, 0.4, -46]] as const;
    for (const [d, k, dy] of sprays) {
      const l = 70 * k + r() * 20;
      const ex = Math.max(1478, Math.min(1900, tx + d * l));
      const ey = top + dy - 10;
      ctx.strokeStyle = '#120e0c';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(tx, top + 30);
      ctx.quadraticCurveTo((tx + ex) / 2, top + dy + 14, ex, ey);
      ctx.stroke();
      for (const [bx, by, br] of scatter(r, [[ex, ey, 60, 26], [(tx + ex) / 2, ey + 6, 40, 10]], [6, 10])) blobs.push([Math.max(1480, Math.min(1900, bx)), Math.min(by, ey + 16), br]);
    }
    leafMass(ctx, r, blobs, { dark: '#020307', mid: '#070a10', lit: '#1e2838', rim: '#8a9cc8', rimA: 0.45, size: 5, density: 1.3, shape: 'needle', toLight: [-0.7, -0.7], body: false, angle: (_px, _py, rr) => (rr() < 0.5 ? Math.PI * 0.6 : Math.PI * 0.4) + (rr() - 0.5) * 0.8 });
  }
}

/** Foliage as a cloud of small leaf clusters scattered round centres (x, y, spread, count): an irregular mass with a
 * ragged edge, not a heap of balls. */
function scatter(r: R, centres: [number, number, number, number][], size: [number, number]): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (const [cx, cy, sp, n] of centres) {
    for (let i = 0; i < n; i++) {
      const a = r() * P2;
      const d = Math.sqrt(-2 * Math.log(1 - r() * 0.98)) * sp * 0.5;
      out.push([cx + Math.cos(a) * d * 1.3, cy + Math.sin(a) * d * 0.8, size[0] + r() * (size[1] - size[0])]);
    }
  }
  return out;
}

// ——— the boughs over the top corners (sprites: they sway, and thrash on the whirl) ———

export const OAK_BOUGH_BOX: Box = { x: 0, y: 0, w: 640, h: 300 };
function oakBough(ctx: Ctx, r: R): void {
  const [hx, hy] = IB.oakHinge;
  // the limb: thick at the trunk, reaching up and out to the right, twigs off it
  const limbPts: Pt[] = [[hx, hy], [160, 150], [280, 108], [400, 82], [500, 66], [572, 60]];
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 1; i < limbPts.length; i++) {
    const w = 30 * (1 - i / limbPts.length) + 4;
    ctx.strokeStyle = '#100c0e';
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(...limbPts[i - 1]);
    ctx.lineTo(...limbPts[i]);
    ctx.stroke();
    ctx.strokeStyle = rgba(MOON, 0.22);
    ctx.lineWidth = Math.max(1, w * 0.18);
    ctx.beginPath();
    ctx.moveTo(limbPts[i - 1][0] + 2, limbPts[i - 1][1] - w * 0.4);
    ctx.lineTo(limbPts[i][0] + 2, limbPts[i][1] - w * 0.4);
    ctx.stroke();
  }
  const twigs: Pt[] = [];
  for (let i = 0; i < 14; i++) {
    const t = 0.15 + r() * 0.85;
    const k = Math.min(limbPts.length - 2, Math.floor(t * (limbPts.length - 1)));
    const u = t * (limbPts.length - 1) - k;
    const x = limbPts[k][0] + (limbPts[k + 1][0] - limbPts[k][0]) * u;
    const y = limbPts[k][1] + (limbPts[k + 1][1] - limbPts[k][1]) * u;
    const a = (r() < 0.6 ? Math.PI * 0.4 : -Math.PI * 0.3) + (r() - 0.5) * 0.8;
    if (x > 500) continue;
    const l = 30 + r() * 60;
    const ex = x + Math.cos(a) * l;
    const ey = y + Math.sin(a) * l;
    ctx.strokeStyle = '#100c0e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + 6, y + Math.sin(a) * l * 0.5 - 4, ex, ey);
    ctx.stroke();
    twigs.push([ex, ey]);
  }
  // leaves hanging off it in loose clusters along it and at its twigs' ends: black, their edges silvered by the moon
  const centres: [number, number, number, number][] = [];
  for (const [tx, ty] of twigs) if (tx < 560 && Math.hypot(tx - IB.moon.x, ty - IB.moon.y) > 130) centres.push([tx, ty + 4, 36, 22]);
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    const k = Math.min(limbPts.length - 2, Math.floor(t * (limbPts.length - 1)));
    const u = t * (limbPts.length - 1) - k;
    const x = limbPts[k][0] + (limbPts[k + 1][0] - limbPts[k][0]) * u;
    const y = limbPts[k][1] + (limbPts[k + 1][1] - limbPts[k][1]) * u;
    if (x > 520) continue;
    centres.push([x + (r() - 0.5) * 20, y + 18, 54, 26]);
  }
  centres.push([40, 110, 70, 40], [70, 220, 50, 18]);
  const blobs = scatter(r, centres, [8, 13]);
  leafMass(ctx, r, blobs, { dark: '#020307', mid: '#070a10', lit: '#1e2838', rim: '#8a9cc8', rimA: 0.45, size: 5.5, density: 1.2, shape: 'leaf', toLight: [0.7, -0.7], body: false });
}

export const PINE_BOUGH_BOX: Box = { x: 1300, y: 0, w: 620, h: 270 };
function pineBough(ctx: Ctx, r: R): void {
  const [hx, hy] = IB.pineHinge;
  const limbs: Pt[][] = [
    [[hx, hy], [1740, 130], [1620, 116], [1500, 96], [1380, 84]],
    [[hx, hy - 90], [1760, 40], [1640, 24], [1540, 14]],
  ];
  ctx.lineCap = 'round';
  const blobs: [number, number, number][] = [];
  for (const pts of limbs) {
    for (let i = 1; i < pts.length; i++) {
      const w = 16 * (1 - i / pts.length) + 3;
      ctx.strokeStyle = '#120e0c';
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(...pts[i - 1]);
      ctx.lineTo(...pts[i]);
      ctx.stroke();
      ctx.strokeStyle = rgba(MOON, 0.2);
      ctx.lineWidth = Math.max(1, w * 0.2);
      ctx.beginPath();
      ctx.moveTo(pts[i - 1][0], pts[i - 1][1] - w * 0.4);
      ctx.lineTo(pts[i][0], pts[i][1] - w * 0.4);
      ctx.stroke();
      // flat sprays of needles along it, drooping at their tips
      for (let k = 0; k < 3; k++) {
        const t = (k + 0.5) / 3;
        const x = pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t;
        const y = pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t;
        for (const [bx, by, br] of scatter(r, [[x, y + 12, 36, 16]], [7, 11])) blobs.push([bx, by, br]);
      }
    }
  }
  leafMass(ctx, r, blobs, { dark: '#020307', mid: '#070a10', lit: '#1a2230', rim: '#8a9cc8', rimA: 0.45, size: 5, density: 1.3, shape: 'needle', toLight: [-0.7, -0.7], body: false, angle: (_px, _py, rr) => Math.PI * 0.5 + (rr() - 0.5) * 1.6 });
}

// ——— painted frames for the live layer ———

/** A torch (frame ph of its flicker), logical 16×36, the bundle's foot at (8, 35): a pitch-soaked bundle bound on the
 * staff's head, its flame licking up, splitting and pinching off. */
const TF = { w: 16, h: 36 };
function torchFrame(c: Ctx, ph: number): void {
  c.save();
  // the halo the flame lights in the smoky air round it
  const g = c.createRadialGradient(8, 16, 0, 8, 16, 10);
  g.addColorStop(0, rgba('#ff9a3a', 0.35));
  g.addColorStop(1, rgba('#ff9a3a', 0));
  c.fillStyle = g;
  c.fillRect(0, 4, 16, 26);
  c.translate(0, 1);
  flameFrame(c, 16, 28, ph, ['#c8300a', '#ff8a1a', '#fff0b8'], 3, 2.2);
  c.restore();
  // the bundle: dark rags, glowing where the pitch burns, bound with cord
  const bp = (cc: Ctx) => {
    cc.beginPath();
    cc.moveTo(4.5, 27);
    cc.quadraticCurveTo(8, 25, 11.5, 27);
    cc.lineTo(10.5, 34);
    cc.quadraticCurveTo(8, 35, 5.5, 34);
    cc.closePath();
  };
  bp(c);
  c.fillStyle = '#1a1210';
  c.fill();
  c.fillStyle = rgba('#ff7a2a', 0.5 + 0.3 * Math.sin(ph * P2));
  c.fillRect(5, 26.5, 6, 1.6);
  c.strokeStyle = '#3a2a1e';
  c.lineWidth = 0.7;
  for (const y of [30, 32.5]) {
    c.beginPath();
    c.moveTo(5.2, y);
    c.lineTo(10.8, y);
    c.stroke();
  }
  c.fillStyle = '#20160e';
  c.fillRect(7.2, 34, 1.6, 2);
}

/** One of the column: an Immortal of our own design (a tall felt hood with long flaps, a cloth drawn over the lower
 * face, a long coat of small bronze scales over trousers, a wicker shield slung on his back, a short spear) striding
 * to the right at phase ph of a step, his torch held up before him (the torch is its own sprite, at his hand).
 * Logical 30×60, his feet at (15, 59). Lit by his own torch from the front and above, the moon on his back. */
const BF = { w: 30, h: 60 };
const HAND: Pt = [24, 18];
function bearerFrame(c: Ctx, ph: number): void {
  const a = Math.sin(ph * P2);
  const lift = Math.abs(Math.cos(ph * P2));
  const bob = lift * 1.2;
  c.save();
  c.translate(0, -bob);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  const warm = '#ff9a4a';
  // the legs (trousers, soft boots): the far leg first
  const leg = (sw: number, near: boolean) => {
    const hx = 15;
    const hy = 40;
    const kx = hx + sw * 5;
    const ky = hy + 8 - Math.max(0, -sw) * 1.5;
    const fx = hx + sw * 8 + (sw < 0 ? -1 : 1);
    const fy = 59 + bob - Math.max(0, sw) * 2;
    c.strokeStyle = near ? '#1e1820' : '#120e14';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(hx, hy);
    c.lineTo(kx, ky);
    c.lineTo(fx, fy - 1);
    c.stroke();
    c.fillStyle = near ? '#2a1e18' : '#18120e';
    c.beginPath();
    c.ellipse(fx + 1.6, fy - 0.6, 3, 1.4, 0, 0, P2);
    c.fill();
    if (near) {
      c.strokeStyle = rgba(warm, 0.5);
      c.lineWidth = 0.9;
      c.beginPath();
      c.moveTo(hx + 1.8, hy);
      c.lineTo(kx + 1.8, ky);
      c.lineTo(fx + 1.6, fy - 1);
      c.stroke();
    }
  };
  leg(-a, false);
  // the shield on his back: an oval of wicker, its weave lit at the edge
  c.fillStyle = '#3a2e1c';
  c.beginPath();
  c.ellipse(9, 30, 5, 10, 0.15, 0, P2);
  c.fill();
  c.strokeStyle = rgba('#8a7048', 0.5);
  c.lineWidth = 0.6;
  for (let i = -3; i <= 3; i++) {
    c.beginPath();
    c.moveTo(5.5, 30 + i * 2.6);
    c.lineTo(12.5, 30 + i * 2.6 + 0.5);
    c.stroke();
  }
  // the spear, sloped back over his shoulder
  c.strokeStyle = '#2a1e14';
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(18, 40);
  c.lineTo(4, 4);
  c.stroke();
  c.fillStyle = '#a8a090';
  c.beginPath();
  c.moveTo(4, 4);
  c.lineTo(2.6, -0.5);
  c.lineTo(5, 3);
  c.closePath();
  c.fill();
  // the coat: small scales from the shoulders to below the knee, belted, flaring as he strides
  const coat = (cc: Ctx) => {
    cc.beginPath();
    cc.moveTo(11, 18);
    cc.quadraticCurveTo(15, 16, 19.5, 18.5);
    cc.lineTo(21 + Math.max(0, a) * 1.5, 46);
    cc.quadraticCurveTo(15, 48, 9 - Math.max(0, -a) * 1.5, 46);
    cc.closePath();
  };
  coat(c);
  c.fillStyle = '#2a2018';
  c.fill();
  c.save();
  coat(c);
  c.clip();
  for (let y = 19; y < 48; y += 2.2) {
    for (let x = 8 + ((y * 10) % 2); x < 23; x += 2.2) {
      const k = clamp01((x - 10) / 12) * clamp01(1 - (y - 18) / 40);
      c.strokeStyle = rgba(mix('#5a4a30', '#ffb060', k), 0.35 + k * 0.4);
      c.lineWidth = 0.6;
      c.beginPath();
      c.arc(x, y, 1.1, 0.2, Math.PI - 0.2);
      c.stroke();
    }
  }
  // the belt and the sash's tail
  c.fillStyle = '#6a2a1e';
  c.fillRect(8, 31, 15, 2);
  // the torch's light down his front, the moon on his back
  const lg = c.createLinearGradient(9, 0, 22, 0);
  lg.addColorStop(0, rgba('#8a9ac8', 0.18));
  lg.addColorStop(0.4, 'rgba(0,0,0,0.3)');
  lg.addColorStop(1, rgba(warm, 0.35));
  c.fillStyle = lg;
  c.fillRect(6, 16, 20, 34);
  c.restore();
  leg(a, true);
  // the torch arm, raised forward to the hand
  c.strokeStyle = '#2a1e18';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(18, 20);
  c.quadraticCurveTo(23, 24, HAND[0], HAND[1] + 1);
  c.stroke();
  c.strokeStyle = rgba(warm, 0.7);
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(19, 19);
  c.quadraticCurveTo(23.5, 22, HAND[0] + 0.6, HAND[1]);
  c.stroke();
  // the hood: tall, soft-topped felt, its flaps down to his shoulders; the cloth across his face; his eyes in shadow
  const hood = (cc: Ctx) => {
    cc.beginPath();
    cc.moveTo(11, 19);
    cc.quadraticCurveTo(10, 11, 12.5, 4);
    cc.quadraticCurveTo(15, 0, 17.5, 3.5);
    cc.quadraticCurveTo(19.5, 9, 20.5, 13);
    cc.lineTo(19.5, 19.5);
    cc.quadraticCurveTo(15, 21, 11, 19);
    cc.closePath();
  };
  hood(c);
  c.fillStyle = '#3a2434';
  c.fill();
  c.save();
  hood(c);
  c.clip();
  c.fillStyle = '#4a2c24';
  c.fillRect(16.5, 11, 5, 5);
  c.fillStyle = '#0c080c';
  c.fillRect(17, 9.2, 4, 1.6);
  c.fillStyle = '#c8b8a0';
  c.fillRect(16.5, 12.2, 5, 4);
  c.fillStyle = rgba('#000000', 0.25);
  c.fillRect(16.5, 14, 5, 2.2);
  const hg = c.createLinearGradient(10, 0, 21, 0);
  hg.addColorStop(0, rgba('#9aaad0', 0.25));
  hg.addColorStop(0.5, 'rgba(0,0,0,0.2)');
  hg.addColorStop(1, rgba(warm, 0.45));
  c.fillStyle = hg;
  c.fillRect(9, 0, 13, 21);
  c.restore();
  c.strokeStyle = rgba('#0a060a', 0.7);
  c.lineWidth = 0.8;
  hood(c);
  c.stroke();
  c.restore();
}

/** A bank of valley mist at phase ph: a lying layer, lobes swelling and lifting along it, moonlit on their tops,
 * shaded under; logical MF, soft at every edge so banks overlap without seams. */
const MF = { w: 520, h: 150 };
function mistFrame(c: Ctx, ph: number, seed: number): void {
  const rr = rng(seed);
  const { w, h } = MF;
  const lg = c.createLinearGradient(0, h * 0.35, 0, h);
  lg.addColorStop(0, 'rgba(140,156,210,0)');
  lg.addColorStop(0.5, rgba('#8a9cd0', 0.28));
  lg.addColorStop(0.7, rgba('#7a8cc4', 0.18));
  lg.addColorStop(1, 'rgba(120,136,196,0)');
  c.fillStyle = lg;
  c.fillRect(0, 0, w, h);
  // fade the ends
  for (let i = 0; i < 18; i++) {
    const x0 = 40 + rr() * (w - 80);
    const k = 1 + Math.floor(rr() * 2);
    const sp = rr() * P2;
    const life = Math.sin(ph * P2 * k + sp);
    const rad = (18 + rr() * 22) * (0.85 + life * 0.18);
    const y = h * 0.6 - rad * 0.35 - (life + 1) * 4;
    const al = (0.45 + rr() * 0.3) * (0.75 + life * 0.25) * Math.min(1, x0 / 120, (w - x0) / 120);
    const x = x0 + Math.sin(ph * P2 + sp) * 8;
    c.save();
    c.translate(x, y);
    c.scale(2, 1);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, rad);
    g.addColorStop(0, rgba('#98a8d8', al));
    g.addColorStop(0.6, rgba('#8090c8', al * 0.5));
    g.addColorStop(1, rgba('#8090c8', 0));
    c.fillStyle = g;
    c.fillRect(-rad, -rad, rad * 2, rad * 2);
    const tg = c.createRadialGradient(-rad * 0.15, -rad * 0.45, 0, -rad * 0.15, -rad * 0.45, rad * 0.7);
    tg.addColorStop(0, rgba('#e2eaff', al * 0.5));
    tg.addColorStop(1, rgba('#e2eaff', 0));
    c.fillStyle = tg;
    c.fillRect(-rad, -rad, rad * 2, rad * 2);
    const sg = c.createRadialGradient(rad * 0.1, rad * 0.5, 0, rad * 0.1, rad * 0.5, rad * 0.7);
    sg.addColorStop(0, rgba('#141a38', al * 0.3));
    sg.addColorStop(1, rgba('#141a38', 0));
    c.fillStyle = sg;
    c.fillRect(-rad, -rad, rad * 2, rad * 2);
    c.restore();
  }
  // the ends feathered out
  c.save();
  c.globalCompositeOperation = 'destination-in';
  const eg = c.createLinearGradient(0, 0, w, 0);
  eg.addColorStop(0, 'rgba(0,0,0,0)');
  eg.addColorStop(0.18, 'rgba(0,0,0,1)');
  eg.addColorStop(0.82, 'rgba(0,0,0,1)');
  eg.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = eg;
  c.fillRect(0, 0, w, h);
  c.restore();
}

/** A scops owl on its perch (frame ph of its idle: the head turns slowly one way and the other, a blink), logical
 * 28×40, its feet at (14, 39): mottled grey-brown, small ear tufts, the moon on its crown and right side. */
const OF = { w: 28, h: 40 };
function owlFrame(c: Ctx, ph: number): void {
  const turn = Math.sin(ph * P2) * 0.8;
  const blink = ph > 0.42 && ph < 0.55;
  c.save();
  // the tail and the body: a teardrop, feathers streaked
  const body = (cc: Ctx) => {
    cc.beginPath();
    cc.moveTo(14, 16);
    cc.bezierCurveTo(23, 17, 22, 32, 17, 38);
    cc.lineTo(11, 38);
    cc.bezierCurveTo(6, 32, 5, 17, 14, 16);
    cc.closePath();
  };
  body(c);
  c.fillStyle = '#4a4440';
  c.fill();
  c.save();
  body(c);
  c.clip();
  c.strokeStyle = 'rgba(20,16,14,0.6)';
  c.lineWidth = 0.7;
  for (let i = 0; i < 14; i++) {
    const x = 8 + (i % 5) * 3 + (i * 0.7) % 1.5;
    const y = 20 + Math.floor(i / 5) * 5 + (i % 2) * 2;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + 0.4, y + 3);
    c.stroke();
  }
  const bg = c.createLinearGradient(6, 0, 22, 0);
  bg.addColorStop(0, 'rgba(4,4,8,0.55)');
  bg.addColorStop(0.6, 'rgba(4,4,8,0.1)');
  bg.addColorStop(1, rgba('#b8c8f0', 0.35));
  c.fillStyle = bg;
  c.fillRect(4, 14, 22, 26);
  c.restore();
  // the wing's edge
  c.strokeStyle = 'rgba(10,8,8,0.7)';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(19, 21);
  c.quadraticCurveTo(20, 31, 16.5, 37);
  c.stroke();
  // the feet on the branch
  c.fillStyle = '#8a7a60';
  c.fillRect(11.5, 37.5, 2, 1.6);
  c.fillRect(15, 37.5, 2, 1.6);
  // the head: round, ear tufts, the facial disc turned with it
  const hx = 14 + turn * 1.2;
  c.fillStyle = '#4e4844';
  c.beginPath();
  c.ellipse(14, 12, 7.5, 6.8, 0, 0, P2);
  c.fill();
  for (const d of [-1, 1]) {
    c.beginPath();
    c.moveTo(14 + d * 4 + turn, 7);
    c.lineTo(14 + d * 6.5 + turn, 2.5);
    c.lineTo(14 + d * 6.2 + turn, 8);
    c.closePath();
    c.fill();
  }
  c.fillStyle = '#6a6058';
  c.beginPath();
  c.ellipse(hx + turn * 1.5, 13, 5.4 * (1 - Math.abs(turn) * 0.25), 4.8, 0, 0, P2);
  c.fill();
  for (const d of [-1, 1]) {
    const ex = hx + turn * 2 + d * 2.4 * (1 - Math.abs(turn) * 0.3);
    if (blink) {
      c.strokeStyle = '#1a1410';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(ex - 1.4, 12.6);
      c.lineTo(ex + 1.4, 12.6);
      c.stroke();
    } else {
      c.fillStyle = '#e8c040';
      c.beginPath();
      c.arc(ex, 12.4, 1.5, 0, P2);
      c.fill();
      c.fillStyle = '#100c08';
      c.beginPath();
      c.arc(ex, 12.5, 0.8, 0, P2);
      c.fill();
      c.fillStyle = '#ffffff';
      c.fillRect(ex - 0.6, 11.6, 0.6, 0.6);
    }
  }
  c.fillStyle = '#2a2420';
  c.beginPath();
  c.moveTo(hx + turn * 2 - 0.8, 14);
  c.lineTo(hx + turn * 2 + 0.8, 14);
  c.lineTo(hx + turn * 2, 15.8);
  c.closePath();
  c.fill();
  // the moon on its crown and its right side
  const mg = c.createLinearGradient(8, 5, 20, 12);
  mg.addColorStop(0, 'rgba(200,214,255,0)');
  mg.addColorStop(1, 'rgba(200,214,255,0.22)');
  c.fillStyle = mg;
  c.beginPath();
  c.ellipse(14.6, 11, 6.6, 5.8, 0, -Math.PI * 0.7, Math.PI * 0.1);
  c.fill();
  c.restore();
}

/** The owl flying (frame ph of a wingbeat), logical 60×34, its body at the middle, heading right: broad rounded wings,
 * the downstroke slow and full, the upstroke folding the tips. */
const FF = { w: 60, h: 34 };
function owlFlyFrame(c: Ctx, ph: number): void {
  const cx = 30;
  const cy = 18;
  const flap = Math.sin(ph * P2);
  const fold = Math.max(0, Math.cos(ph * P2)) * 0.35;
  for (const d of [-1, 1]) {
    const tipX = cx + d * 28 * (1 - fold);
    const tipY = cy - 1 - flap * 15;
    const elbX = cx + d * 13;
    const elbY = cy - 2 - flap * 8;
    c.fillStyle = d < 0 ? '#3a3430' : '#4a4440';
    c.beginPath();
    c.moveTo(cx - 3, cy - 2);
    c.quadraticCurveTo(elbX, elbY - 5, tipX, tipY);
    c.quadraticCurveTo(tipX + d * 2, tipY + 8, tipX - d * 5, tipY + 9);
    c.quadraticCurveTo((elbX + tipX) / 2, elbY + 10, elbX, elbY + 8);
    c.quadraticCurveTo(cx + d * 6, cy + 5, cx + 3, cy + 3);
    c.closePath();
    c.fill();
    // the bars across the flight feathers, the moon along the leading edge
    c.strokeStyle = 'rgba(12,10,10,0.5)';
    c.lineWidth = 0.8;
    for (let k = 1; k <= 3; k++) {
      const t = 0.4 + k * 0.15;
      c.beginPath();
      c.moveTo(cx + (tipX - cx) * t, cy + (tipY - cy) * t - 1);
      c.lineTo(cx + (tipX - cx) * t - d * 1.5, cy + (tipY - cy) * t + 5);
      c.stroke();
    }
    c.strokeStyle = rgba('#c8d6ff', 0.5);
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(cx, cy - 2.5);
    c.quadraticCurveTo(elbX, elbY - 4.5, tipX, tipY - 0.5);
    c.stroke();
  }
  c.fillStyle = '#4e4844';
  c.beginPath();
  c.ellipse(cx, cy + 2, 4, 7, 0, 0, P2);
  c.fill();
  c.beginPath();
  c.arc(cx + 1, cy - 4, 4, 0, P2);
  c.fill();
  c.fillStyle = '#e8c040';
  c.fillRect(cx + 2.2, cy - 5, 1.4, 1.2);
}

/** Oak leaves (and a few pine sprigs) tumbling: 8 frames, logical 14×14 each. */
const LF = 14;
function leafFrame(c: Ctx, i: number): void {
  c.save();
  c.translate(LF / 2, LF / 2);
  if (i >= 6) {
    // a sprig of needles
    c.strokeStyle = i === 6 ? '#3a4a3a' : '#5a4a30';
    c.lineWidth = 0.8;
    for (let k = -3; k <= 3; k++) {
      c.beginPath();
      c.moveTo(-5, 0);
      c.lineTo(5, k * 1.4);
      c.stroke();
    }
    c.restore();
    return;
  }
  const cols = ['#5a3e24', '#6a4a2a', '#3a3a24', '#4a3020', '#2e3624', '#7a5a34'];
  // a lobed oak leaf: a wavy outline round a midrib
  c.rotate(i * 0.9);
  c.beginPath();
  c.moveTo(-6, 0);
  for (let k = 0; k <= 4; k++) {
    const x = -6 + k * 3;
    c.quadraticCurveTo(x - 1.5, -4.2 + (k % 2) * 1.2, x, -2.2);
  }
  c.lineTo(6.5, 0);
  for (let k = 4; k >= 0; k--) {
    const x = -6 + k * 3;
    c.quadraticCurveTo(x + 1.5, 4.2 - (k % 2) * 1.2, x, 2.2);
  }
  c.closePath();
  c.fillStyle = cols[i];
  c.fill();
  const g = c.createLinearGradient(0, -4, 0, 4);
  g.addColorStop(0, rgba('#c8d6ff', 0.35));
  g.addColorStop(1, 'rgba(0,0,0,0.3)');
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = 'rgba(20,12,8,0.6)';
  c.lineWidth = 0.6;
  c.beginPath();
  c.moveTo(-6.5, 0);
  c.lineTo(6.5, 0);
  c.stroke();
  c.restore();
}

/** Scree: little lit stones (6 frames, logical 10×10). */
const PF = 10;
function pebbleFrame(c: Ctx, i: number): void {
  const rr = rng(hashStr('ib:peb' + i));
  const pts: Pt[] = [];
  const n = 6 + Math.floor(rr() * 3);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * P2;
    const d = 2.5 + rr() * 2;
    pts.push([5 + Math.cos(a) * d, 5 + Math.sin(a) * d * 0.8]);
  }
  polyPath(pts)(c);
  const g = c.createLinearGradient(2, 1, 8, 9);
  g.addColorStop(0, '#8a96b8');
  g.addColorStop(0.5, '#4a5270');
  g.addColorStop(1, '#1a1e2c');
  c.fillStyle = g;
  c.fill();
}

/** The sentry's fire: the smoke's options, the little flames licking the last brand. */
const SMOKE_F = { w: 160, h: 300 };
const SMOKE_O = { lit: '#9aa8d8', body: '#4a4a5a', shade: '#14141e', wind: 0.75, lobes: 28, a: 0.3, toLight: [-0.4, -0.9] as [number, number], seed: 5 };
const FLF = { w: 18, h: 30 };

// ——— the still's live parts, painted in place ———

/** Where the torches stand in the still (and where the live column starts). */
const N_TORCH = 34;
const torchS = (i: number) => ((i + 0.35) / N_TORCH) * PATH_LEN + Math.sin(i * 2.7) * 14;

function paintAt(ctx: Ctx, w: number, h: number, k: number, draw: (c: Ctx) => void, x: number, y: number, s: number, ox: number, oy: number, flip = false): void {
  const [cv, g] = makeCanvas(Math.ceil(w * k), Math.ceil(h * k));
  g.scale(k, k);
  draw(g);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip ? -s : s, s);
  ctx.drawImage(cv, -ox, -oy, w, h);
  ctx.restore();
}

function columnStill(ctx: Ctx): void {
  for (let i = 0; i < N_TORCH; i++) {
    const p = pathAt(torchS(i));
    const s = colScale(p.y);
    const dir = p.dx < 0 ? -1 : 1;
    const ph = (i * 0.37) % 1;
    paintAt(ctx, BF.w, BF.h, 2, (c) => bearerFrame(c, ph), p.x, p.y, s, BF.w / 2, BF.h - 1, dir < 0);
    const hx = p.x + (HAND[0] - BF.w / 2) * s * dir;
    const hy = p.y + (HAND[1] - BF.h + 1) * s;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    lightPool(ctx, hx, hy - 10 * s, 30 * s, 30 * s, TORCH, 0.22);
    ctx.restore();
    paintAt(ctx, TF.w, TF.h, 2, (c) => torchFrame(c, (i * 0.29) % 1), hx, hy + 2 * s, s, TF.w / 2, TF.h - 1);
  }
}

/** The mist banks: (x, y of the bank's top, seed, scale, alpha), the gorge's floor, the valley beyond, wisps on the
 * slope. */
const BANKS: [number, number, number, number, number][] = [
  [300, 450, 41, 1.2, 0.6],
  [700, 464, 43, 1.1, 0.55],
  [330, 452, 47, 0.9, 0.26],
  [620, 452, 41, 0.8, 0.34],
  [920, 492, 43, 0.9, 0.32],
];
function mistStill(ctx: Ctx): void {
  for (const [x, y, seed, s, a] of BANKS) {
    const [cv, g] = makeCanvas(MF.w / 2, MF.h / 2);
    g.scale(0.5, 0.5);
    mistFrame(g, 0.3, seed);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.drawImage(cv, x, y, MF.w * s, MF.h * s);
    ctx.restore();
  }
}

function fireStill(ctx: Ctx): void {
  const [fx, fy] = IB.fire;
  paintAt(ctx, SMOKE_F.w, SMOKE_F.h, 0.5, (c) => smokeFrame(c, SMOKE_F.w, SMOKE_F.h, 0.4, SMOKE_O), fx - 6, fy + 4, 1, SMOKE_F.w / 2, SMOKE_F.h - 10);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  paintAt(ctx, FLF.w, FLF.h, 2, (c) => flameFrame(c, FLF.w, FLF.h, 0.3, ['#a8200a', '#ff6a1a', '#ffd080'], 2, 4), fx - 12, fy + 1, 0.8, FLF.w / 2, FLF.h - 2);
  paintAt(ctx, FLF.w, FLF.h, 2, (c) => flameFrame(c, FLF.w, FLF.h, 0.7, ['#a8200a', '#ff6a1a', '#ffd080'], 2, 7), fx + 10, fy - 1, 0.6, FLF.w / 2, FLF.h - 2);
  ctx.restore();
}

function owlStill(ctx: Ctx): void {
  paintAt(ctx, OF.w, OF.h, 2, (c) => owlFrame(c, 0.1), IB.owl[0], IB.owl[1] + 1, 1, OF.w / 2, OF.h - 1);
}

// ——— the table: the path's own bedrock ———

export const TABLE_BOX: Box = { x: 0, y: TY, w: W, h: 1080 - TY };

function table(ctx: Ctx, r: R): void {
  const f = IB.front;
  const box = { x: 0, y: TY, w: W, h: f - TY };
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, f - TY + 2);
  ctx.clip();
  vfill(ctx, 0, TY, W, f - TY, [[0, '#2a3044'], [0.4, '#384058'], [1, '#424a62']]);
  surface(ctx, r, box, '#3a4258', { over: true, vary: 0.35, cells: 5, mottle: 0.3, strokes: 0.4, strokeAng: 0, strokeLen: 260, strokeW: 6, grain: 0.14, grainKind: 'speckle', seed: 421 });
  lay(ctx, drift('#5a6482', '#1e2232', 8, 423, 240, 40), box, 0.22);
  lay(ctx, drift('#4e5874', '#161a26', 22, 425, 480, 80), box, 0.2);
  // the rock's bedding: long bands running across, converging away, each a slightly different grey; the path's
  // middle polished pale by hooves and feet
  const zf = zFront(f);
  for (let z = 5.6; z > zf; z -= 0.3 + r() * 0.45) {
    const y = yAt(z);
    ctx.fillStyle = rgba(r() < 0.5 ? '#6a748e' : '#1a1e2c', 0.04 + r() * 0.05);
    ctx.fillRect(0, y, W, 3 + (y - TY) * 0.05);
    ctx.strokeStyle = rgba('#0e1018', 0.14);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y + (r() - 0.5) * 3);
    for (let x = 0; x <= W; x += 80) ctx.lineTo(x, y + Math.sin(x * 0.01 + z) * 1.5);
    ctx.stroke();
  }
  const pg = ctx.createRadialGradient(VX, (TY + f) / 2, 60, VX, (TY + f) / 2, 900);
  pg.addColorStop(0, rgba('#8a94b4', 0.1));
  pg.addColorStop(1, rgba('#8a94b4', 0));
  ctx.save();
  ctx.translate(0, (TY + f) / 2);
  ctx.scale(1, 0.25);
  ctx.translate(0, -(TY + f) / 2);
  ctx.fillStyle = pg;
  ctx.fillRect(0, TY - 800, W, 1600 + (f - TY));
  ctx.restore();
  // the bedrock's joints: a few long ones running away from us, and the cross joints between them, each a dark line
  // with its far lip catching the moon; the slabs between a touch different in tone
  const jr = rng(hashStr('ib:joints'));
  const xs = [-3.4, -1.9, -0.6, 0.9, 2.3, 3.6].map((X) => X + (jr() - 0.5) * 0.5);
  const xAt2 = (X: number, z: number) => VX + (1210 * X) / z;
  for (const X of xs) {
    ctx.strokeStyle = rgba('#0a0c14', 0.3);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let z = 5.6; z >= zf; z -= 0.2) {
      const xx = xAt2(X + Math.sin(z * 3 + X) * 0.06, z);
      if (z === 5.6) ctx.moveTo(xx, yAt(z));
      else ctx.lineTo(xx, yAt(z));
    }
    ctx.stroke();
  }
  for (let z = 5.0; z > zf + 0.3; z -= 0.6 + jr() * 0.7) {
    const X0 = -4 + jr() * 6;
    const X1 = X0 + 1 + jr() * 2.5;
    ctx.strokeStyle = rgba('#0a0c14', 0.24);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(xAt2(X0, z), yAt(z));
    ctx.lineTo(xAt2(X1, z + (jr() - 0.5) * 0.15), yAt(z) + (jr() - 0.5) * 4);
    ctx.stroke();
    ctx.strokeStyle = rgba('#9aa6c8', 0.08);
    ctx.beginPath();
    ctx.moveTo(xAt2(X0, z), yAt(z) + 1.6);
    ctx.lineTo(xAt2(X1, z), yAt(z) + 1.6);
    ctx.stroke();
  }
  // cracks with needles and oak leaves lodged in them; small hoof scuffs; lichen in from the sides
  for (let i = 0; i < 6; i++) crack(ctx, r, 120 + r() * (W - 240), TY + 30 + r() * (f - TY - 60), (r() - 0.5) * 0.6, 70 + r() * 140, { col: '#0a0c14', lip: '#8a96b8', w: 1.3, a: 0.3, branch: 0.35 });
  for (let i = 0; i < 70; i++) {
    const x = r() * W;
    const y = TY + 8 + r() ** 1.3 * (f - TY - 12);
    const k = 0.6 + (y - TY) / (f - TY) * 0.8;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(r() * P2);
    ctx.scale(k, k * 0.5);
    if (r() < 0.6) {
      ctx.strokeStyle = rgba(r() < 0.5 ? '#4a3a28' : '#2a2a22', 0.45);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.lineTo(6, 1);
      ctx.stroke();
    } else {
      ctx.fillStyle = rgba(r() < 0.5 ? '#4a3420' : '#3a3424', 0.4);
      ctx.beginPath();
      ctx.ellipse(0, 0, 6, 3, 0, 0, P2);
      ctx.fill();
    }
    ctx.restore();
  }
  for (let i = 0; i < 26; i++) {
    const x = 200 + r() * 1520;
    const y = TY + 20 + r() * (f - TY - 50);
    const k = 0.7 + (y - TY) / (f - TY) * 0.6;
    ctx.strokeStyle = rgba('#14161e', 0.22);
    ctx.lineWidth = 1.6 * k;
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x + d * 3 * k, y, 3 * k, Math.PI * 0.1, Math.PI * 0.9);
      ctx.stroke();
    }
  }
  // the track worn along it by hooves and feet: a smoother, paler band wandering across, grit swept to its sides
  ctx.save();
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 3; i++) {
    const zc = zf + (5.6 - zf) * (0.38 + i * 0.04);
    const y = yAt(zc);
    const g = ctx.createLinearGradient(0, y - 40, 0, y + 50);
    g.addColorStop(0, 'rgba(120,132,170,0)');
    g.addColorStop(0.5, 'rgba(120,132,170,0.07)');
    g.addColorStop(1, 'rgba(120,132,170,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y - 40, W, 90);
  }
  ctx.restore();
  for (let i = 0; i < 320; i++) {
    const x = r() * W;
    const y = TY + 4 + r() ** 1.2 * (f - TY - 6);
    const k = 0.6 + ((y - TY) / (f - TY)) * 0.9;
    ctx.fillStyle = rgba(r() < 0.5 ? '#7a84a4' : '#0c0e16', 0.18 + r() * 0.2);
    ctx.fillRect(x, y, (0.8 + r() * 1.6) * k, (0.6 + r()) * k * 0.7);
  }
  // lichen: small crisp rosettes, grey-green and a few rust, thickest at the sides
  for (let i = 0; i < 150; i++) {
    const [px, py, pr] = r() < 0.6 ? [230, 960, 120] : [1720, 800, 80];
    const a = r() * P2;
    const d = r() ** 0.7 * pr;
    const x = px + Math.cos(a) * d;
    const y = py + Math.sin(a) * d * 0.35;
    const k = 0.6 + ((y - TY) / (f - TY)) * 0.8;
    ctx.fillStyle = rgba(r() < 0.8 ? '#6a7a6a' : '#8a6a4a', 0.12 + r() * 0.14);
    ctx.beginPath();
    ctx.ellipse(x, y, (2 + r() * 5) * k, (1 + r() * 2.4) * k, 0, 0, P2);
    ctx.fill();
  }
  lay(ctx, noiseMask(26, 427, { cover: 0.2, soft: 0.04, col: '#5a6a5a', w: 280, h: 280 }), { x: 0, y: TY, w: 280, h: f - TY }, 0.22);
  lay(ctx, noiseMask(26, 429, { cover: 0.2, soft: 0.04, col: '#5a6a5a', w: 280, h: 280 }), { x: W - 280, y: TY, w: 280, h: f - TY }, 0.22);
  // the moon from far off: cool over all of it; the embers' warmth faint on its right
  const wg = ctx.createRadialGradient(IB.fire[0], TY - 20, 40, IB.fire[0], TY - 20, 560);
  wg.addColorStop(0, rgba('#ff8a3a', 0.12));
  wg.addColorStop(1, rgba('#ff8a3a', 0));
  ctx.save();
  ctx.translate(IB.fire[0], TY);
  ctx.scale(1, 0.4);
  ctx.translate(-IB.fire[0], -TY);
  ctx.fillStyle = wg;
  ctx.fillRect(IB.fire[0] - 600, TY - 600, 1200, 1200);
  ctx.restore();
  ctx.restore();
  tableFalloff(ctx, f, 0.35, '#06080e');
  tableSeam(ctx, 0.5, '#06080e', false);
  crevice(ctx, 0, W, TY, 16, 0.55, '#04060c');
  // the ledge's broken front: rough rock, moss on it
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, f, W, 1080 - f);
  ctx.clip();
  vfill(ctx, 0, f, W, 1080 - f, [[0, '#2e3448'], [1, '#141824']]);
  surface(ctx, r, { x: 0, y: f, w: W, h: 1080 - f }, '#262c3e', { over: true, vary: 0.35, cells: 6, mottle: 0.4, strokes: 0, grain: 0.25, grainKind: 'speckle', seed: 431 });
  // the ledge's broken edge: blocks of rock of their own sizes, each lit along its top in the moon, a dark joint
  // between, some standing proud, some fallen back
  let bx = -20;
  while (bx < W) {
    const bw = 40 + r() * 140;
    const top = f + (r() - 0.3) * 6;
    const blk = polyPath(rough(r, [[bx + 2, top + 3], [bx + bw * 0.2, top], [bx + bw * 0.7, top + 1 + r() * 3], [bx + bw - 2, top + 4], [bx + bw - 6, 1084], [bx + 4, 1084]], 0.12, 4));
    blk(ctx);
    ctx.fillStyle = shade('#262c3e', (r() - 0.5) * 0.25);
    ctx.fill();
    within(ctx, blk, () => {
      vfill(ctx, bx, top, bw, 1084 - top, [[0, rgba('#8a96b8', 0.22)], [0.15, rgba('#8a96b8', 0.03)], [1, 'rgba(4,6,12,0.4)']]);
      ctx.strokeStyle = rgba('#06080e', 0.4);
      ctx.lineWidth = 1;
      for (let j = 0; j < 2; j++) {
        const y = top + 10 + r() * 24;
        ctx.beginPath();
        ctx.moveTo(bx, y);
        ctx.lineTo(bx + bw, y + (r() - 0.5) * 6);
        ctx.stroke();
      }
    });
    ctx.strokeStyle = rgba('#03040a', 0.8);
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(bx + bw - 3, top + 3);
    ctx.lineTo(bx + bw - 6 + (r() - 0.5) * 4, 1084);
    ctx.stroke();
    bx += bw - 4;
  }
  lay(ctx, noiseMask(10, 433, { cover: 0.3, soft: 0.1, col: '#2a4030', w: 240, h: 16 }), { x: 0, y: f + 6, w: W, h: 1080 - f - 6 }, 0.4);
  ctx.restore();
}

// ——— the shade ———

function shadeOver(ctx: Ctx): void {
  for (const [x, y] of [[170, 60], [1750, 60]] as Pt[]) {
    const g = ctx.createRadialGradient(x, y, 30, x, y, 480);
    g.addColorStop(0, 'rgba(2,4,10,0.32)');
    g.addColorStop(1, 'rgba(2,4,10,0)');
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.4);
    ctx.translate(-x, -y);
    ctx.fillStyle = g;
    ctx.fillRect(x - 480, y - 480, 960, 960);
    ctx.restore();
  }
  calmLanes(ctx, 0.16, '#03050c', 120, 720);
  const sg = ctx.createRadialGradient(1170, 500, 40, 1170, 500, 360);
  sg.addColorStop(0, 'rgba(3,5,12,0.2)');
  sg.addColorStop(1, 'rgba(3,5,12,0)');
  ctx.save();
  ctx.translate(1170, 500);
  ctx.scale(1, 0.55);
  ctx.translate(-1170, -500);
  ctx.fillStyle = sg;
  ctx.fillRect(810, 140, 720, 720);
  ctx.restore();
  // the band behind the pizzas and the table's back edge, darker and quiet
  vfill(ctx, 0, 560, W, 200, [[0, 'rgba(3,5,12,0)'], [0.55, 'rgba(3,5,12,0.14)'], [1, 'rgba(3,5,12,0.26)']]);
  vignetteAll(ctx, 0.55, '#02030a');
}

// ——— the stack ———
//
// Far to near. The column (its torches and bearers) and the mist live in one slot between the mountain and the trees
// on the slope, so the column passes behind the trees and the mist lies over its first switchbacks; the fold (whose
// wall crosses the slot's box) is baked over them. The boughs over the top corners are sprites (they sway and
// thrash). The torches, mist, fire and owl are painted in place only in the still.

export const COLUMN_BOX: Box = { x: 300, y: 340, w: 1140, h: LIP - 10 - 340 };

export const IMMORTALBRUTE: SceneSpec = {
  id: 'immortalbrute',
  info: {
    name: 'The Goat Path',
    subtitle: 'Mini-boss: THE IMMORTAL BRUTE',
    ambient: [],
    // (the torches, the embers and the moon are the live layer's)
    glows: [],
    light: '#c4cae8',
    tableTint: '#eceef8',
  },
  layers: [
    { id: 'sky', box: SKY_BOX, draw: sky },
    { id: 'far', box: FAR_BOX, draw: far },
    { id: 'crag', box: CRAG_BOX, draw: crag },
    { id: 'mountain', box: MT_BOX, draw: mountain },
    { id: 'column', box: COLUMN_BOX, motion: 'slot', draw: () => {} },
    { id: 'columnStill', box: COLUMN_BOX, stillOnly: true, draw: (c) => columnStill(c) },
    { id: 'mistStill', box: COLUMN_BOX, stillOnly: true, draw: (c) => mistStill(c) },
    { id: 'slopeTrees', box: TREES_BOX, draw: slopeTrees },
    { id: 'wood', box: WOOD_BOX, draw: wood },
    { id: 'ledge', box: LEDGE_BOX, draw: ledge },
    { id: 'oak', box: OAK_BOX, draw: oak },
    { id: 'fold', box: FOLD_BOX, draw: fold },
    { id: 'fallen', box: FALLEN_BOX, draw: fallen },
    { id: 'post', box: POST_BOX, draw: post },
    { id: 'pine', box: PINE_BOX, draw: pine },
    { id: 'oakBough', box: OAK_BOUGH_BOX, motion: 'sprite', draw: oakBough },
    { id: 'pineBough', box: PINE_BOUGH_BOX, motion: 'sprite', draw: pineBough },
    { id: 'fireStill', box: { x: 1240, y: 400, w: 180, h: 330 }, stillOnly: true, draw: (c) => fireStill(c) },
    { id: 'owlStill', box: { x: 1670, y: 510, w: 50, h: 56 }, stillOnly: true, draw: (c) => owlStill(c) },
    { id: 'table', box: TABLE_BOX, draw: table },
    { id: 'top', motion: 'top', draw: () => {} },
  ],
  shade: shadeOver,
};

// ——— live ———

registerKitScene(IMMORTALBRUTE, (k: KitLive) => {
  const MUL = Phaser.BlendModes.MULTIPLY;
  const col = k.slot('column');
  const top = k.slot('top');
  const K2 = 2;

  // ——— the column: bearers striding up the switchbacks, each with his torch; their light on the trees ———
  const torchKey = sheet(k, 'ib_torch', TF.w * K2, TF.h * K2, 8, (c, ph) => {
    c.scale(K2, K2);
    torchFrame(c, ph);
  });
  const bearerKey = sheet(k, 'ib_bearer', BF.w * K2, BF.h * K2, 8, (c, ph) => {
    c.scale(K2, K2);
    bearerFrame(c, ph);
  });
  const torches = Array.from({ length: N_TORCH }, (_, i) => {
    const body = new Loop(k, bearerKey, 8, 0, 0, { into: col, origin: [0.5, (BF.h - 1) / BF.h], fps: 7, phase: (i * 0.37 * 8) % 8 });
    const flame = new Loop(k, torchKey, 8, 0, 0, { into: col, origin: [0.5, (TF.h - 1) / TF.h], fps: 10 + (i % 4), add: false });
    const glow = k.glow(0, 0, 40, 0xff8a3a, 0, { into: top });
    const pool = k.glow(0, 0, 30, 0xff7a2a, 0, { into: top, sy: 0.35 });
    return { s: torchS(i), body, flame, glow, pool, seed: i * 1.91, boost: 0 };
  });
  /** The column's pace (px of path a second), its surge on the horde, and the wave of light that runs up it. */
  const PACE = 9;
  let surge = 0;
  let waveS = -1;
  let gutter = 0;

  // ——— the mist banks ———
  const MR = 0.5;
  const mistKeys = [41, 43, 47].map((seed) => sheet(k, 'ib_mist' + seed, MF.w * MR, MF.h * MR, 8, (c, ph) => {
    c.scale(MR, MR);
    mistFrame(c, ph, seed);
  }));
  const banks = BANKS.map(([x, y, seed, s, a], i) => ({
    l: new Loop(k, mistKeys[[41, 43, 47].indexOf(seed)], 8, x, y, { into: col, origin: [0, 0], scale: s / MR, fps: 0.5 + i * 0.07, phase: i * 1.7 }),
    x, y, s, a, v: 5 + i * 1.6,
  }));
  let tear = 0;

  // ——— the gorge owl, now and then, and scree down the crag and the gully ———
  const flyKey = sheet(k, 'ib_owlfly', FF.w * K2, FF.h * K2, 8, (c, ph) => {
    c.scale(K2, K2);
    owlFlyFrame(c, ph);
  });
  const glider = { l: new Loop(k, flyKey, 8, 0, 0, { into: col, fps: 6, scale: 0.36 / K2, tint: 0x8a92b0 }), t: -1, wait: 8 + crand() * 10 };
  glider.l.alpha = 0;
  glider.l.show(0);
  const pebKey = sheet(k, 'ib_peb', PF, PF, 6, (c, _ph, i) => pebbleFrame(c, i));
  const scree = new Parts(k, { frame: 'mote', sheet: { key: pebKey, n: 6, half: PF / 2 }, into: col, max: 90 });
  const dust = new Parts(k, { frame: 'puff', into: col, max: 50 });
  const rattle = (p: number) => {
    // down the crag's moonlit face into the gorge
    for (let i = 0; i < 4 + p * 14; i++) {
      const y0 = 300 + crand() * 220;
      const x0 = along(cragEdge, y0, 1) - 6 - crand() * 30;
      const s = 2 + crand() * 3;
      scree.spawn({ x: x0, y: y0, vx: 10 + crand() * 40, vy: -20 - crand() * 40, life: 2.2, r0: s, a: 1, tint: 0xd0d8f0, grav: 800, bounce: 0.35, floor: Math.min(LIP - 12, y0 + 60 + crand() * 80), spin: (crand() - 0.5) * 12, fade: 0.02 });
    }
    for (let i = 0; i < 2 + p * 4; i++) {
      const y0 = 330 + crand() * 200;
      dust.spawn({ x: along(cragEdge, y0, 1) - 10, y: y0, vx: 8, vy: 10, life: 2 + crand(), r0: 6, r1: 26, a: 0.25, tint: 0x8a96c0, drag: 0.8, fade: 0.2 });
    }
    // and a trickle down the gully high on our mountain
    const [gx, gy] = IB.gully;
    for (let i = 0; i < 3 + p * 8; i++) scree.spawn({ x: gx + crand() * 10, y: gy + crand() * 30, vx: 6 + crand() * 14, vy: 10, life: 1.6, r0: 1.2 + crand() * 1.4, a: 0.9, tint: 0xb8c4e8, grav: 500, drag: 0.4, fade: 0.05 });
    dust.spawn({ x: gx + 20, y: gy + 80, vx: 10, vy: 20, life: 2.4, r0: 6, r1: 30, a: 0.18, tint: 0x8a96c0, drag: 0.6, fade: 0.2 });
  };

  // ——— the boughs over the corners ———
  const oakB = k.pivot(k.sprite('oakBough'), IB.oakHinge[0], IB.oakHinge[1]);
  const pineB = k.pivot(k.sprite('pineBough'), IB.pineHinge[0], IB.pineHinge[1]);
  const oakSw = new Swing(oakB, { k: 7, c: 1.3, idle: 0.01, seed: 1, speed: 0.8 });
  const pineSw = new Swing(pineB, { k: 9, c: 1.5, idle: 0.012, seed: 4, speed: 0.9 });
  let thrash = 0;
  let thrashKick = 0;

  // ——— the leaves: tumbling down (painted leaves and sprigs that flutter, turn over and settle) ———
  const leafKey = sheet(k, 'ib_leaf', LF * K2, LF * K2, 8, (c, _ph, i) => {
    c.scale(K2, K2);
    leafFrame(c, i);
  });
  type Leaf = { im: Phaser.GameObjects.Image; x: number; y: number; vy: number; amp: number; w: number; ph: number; floor: number; age: number; rest: number; s: number };
  const leaves: Leaf[] = [];
  const dropLeaf = (x: number, y: number, sprig = false) => {
    let lf = leaves.find((l) => l.age < 0);
    if (!lf) {
      if (leaves.length >= 60) return;
      lf = { im: k.img(leafKey, x, y, { into: top }), x, y, vy: 0, amp: 0, w: 0, ph: 0, floor: 0, age: 0, rest: 0, s: 1 };
      leaves.push(lf);
    }
    lf.x = x;
    lf.y = y;
    lf.vy = 34 + crand() * 30;
    lf.amp = 26 + crand() * 30;
    lf.w = 1.6 + crand() * 1.6;
    lf.ph = crand() * P2;
    lf.floor = TY + 10 + crand() ** 1.5 * 260;
    lf.age = 0;
    lf.rest = 0;
    lf.s = 0.8 + crand() * 0.5;
    lf.im.setFrame(sprig ? 6 + Math.floor(crand() * 2) : Math.floor(crand() * 6)).setVisible(true).setAlpha(1);
  };
  const shower = (n: number) => {
    for (let i = 0; i < n; i++) {
      if (crand() < 0.6) dropLeaf(30 + crand() * 520, 80 + crand() * 160);
      else dropLeaf(1340 + crand() * 480, 40 + crand() * 160, true);
    }
  };
  const leafRate = new Rate();

  // ——— the sentry's fire: its smoke, two little flames on the last brand, the embers breathing ———
  const [fx, fy] = IB.fire;
  const SR = 0.5;
  const smokeKey = sheet(k, 'ib_smoke', SMOKE_F.w * SR, SMOKE_F.h * SR, 8, (c, ph) => {
    c.scale(SR, SR);
    smokeFrame(c, SMOKE_F.w, SMOKE_F.h, ph, SMOKE_O);
  });
  const smoke = new Loop(k, smokeKey, 8, fx - 6, fy + 4, { into: top, origin: [0.5, (SMOKE_F.h - 10) / SMOKE_F.h], scale: 1 / SR, fps: 1.1 });
  const flKey = sheet(k, 'ib_flame', FLF.w * K2, FLF.h * K2, 8, (c, ph) => {
    c.scale(K2, K2);
    flameFrame(c, FLF.w, FLF.h, ph, ['#a8200a', '#ff6a1a', '#ffd080'], 2, 4);
  });
  const flames = [
    new Loop(k, flKey, 8, fx - 12, fy + 1, { into: top, origin: [0.5, (FLF.h - 2) / FLF.h], scale: 0.8 / K2, fps: 9, add: true }),
    new Loop(k, flKey, 8, fx + 10, fy - 1, { into: top, origin: [0.5, (FLF.h - 2) / FLF.h], scale: 0.6 / K2, fps: 11, add: true, phase: 3 }),
  ];
  const bed = k.glow(fx, fy, 70, 0xff6a1a, 0.3, { into: top, sy: 0.35 });
  const bedCore = k.glow(fx, fy - 2, 26, 0xffb050, 0.4, { into: top, sy: 0.5 });
  const embers = new Parts(k, { frame: 'ember', add: true, into: top, max: 70 });
  const emberRate = new Rate();
  let flare = 0;

  // ——— the owl on the broken limb ———
  const perchKey = sheet(k, 'ib_owl', OF.w * K2, OF.h * K2, 8, (c, ph) => {
    c.scale(K2, K2);
    owlFrame(c, ph);
  });
  const perch = new Loop(k, perchKey, 8, IB.owl[0], IB.owl[1] + 1, { into: top, origin: [0.5, (OF.h - 1) / OF.h], scale: 1 / K2, fps: 1.1, phase: 0.8 });
  const flier = new Loop(k, flyKey, 8, 0, 0, { into: top, fps: 8, scale: 0.8 / K2, tint: 0x9aa0b8 });
  flier.alpha = 0;
  flier.show(0);
  const owl = { state: 0, t: 0, x: IB.owl[0], y: IB.owl[1], vx: 0, vy: 0 };
  const flee = () => {
    if (owl.state !== 0) return;
    owl.state = 1;
    owl.t = 0;
    owl.x = IB.owl[0];
    owl.y = IB.owl[1] - 14;
    owl.vx = -120 - crand() * 40;
    owl.vy = -70 - crand() * 30;
  };

  // ——— the light ———
  const dim = k.wash(0x4a5890, 0, MUL, top);
  const moonGlow = k.glow(IB.moon.x, IB.moon.y, 170, 0xb8c8ff, 0.1, { into: top });

  // ——— the fight, heard (the immortalbrute brain, src/game/bosses/leonidas.ts) ———
  const inFight = 'miniFoot' in (k.sc as object);
  const onHorde = () => {
    surge = 1;
    waveS = 0;
    flee();
    if (inFight) k.sc.time.delayedCall(900, () => audio.sfx('sfx_immortalbrute_horde', { volume: 0.28, rate: 0.92 }));
  };
  const onWhirl = () => {
    thrash = 2.6;
    thrashKick = 0;
    tear = 1;
    shower(14);
    flee();
  };
  const onFeed = () => {
    gutter = 1;
    flare = 1;
    for (let i = 0; i < 26; i++) embers.spawn({ x: fx + (crand() - 0.5) * 40, y: fy - 4, vx: 40 + crand() * 80, vy: -60 - crand() * 140, life: 1.6 + crand(), r0: 1.4, r1: 0.4, a: 1, tint: 0xffa040, drag: 0.6, grav: -10, fade: 0.05 });
  };
  const ev = k.sc.events;
  ev.on('brute-horde', onHorde);
  ev.on('brute-whirl', onWhirl);
  ev.on('brute-feed', onFeed);
  const unlisten = () => {
    ev.off('brute-horde', onHorde);
    ev.off('brute-whirl', onWhirl);
    ev.off('brute-feed', onFeed);
    ev.off(Phaser.Scenes.Events.SHUTDOWN, unlisten);
  };
  ev.once(Phaser.Scenes.Events.SHUTDOWN, unlisten);
  const DEMO: (() => void)[] = [onHorde, onWhirl, onFeed];
  let demoI = 0;
  let demoT = 5;
  let gust = 0;

  return {
    impact(x, _y, p) {
      rattle(p);
      shower(Math.round(4 + p * 12));
      oakSw.kick((crand() < 0.5 ? -1 : 1) * (0.02 + p * 0.06) * (x < 960 ? 1.4 : 0.7));
      pineSw.kick((crand() < 0.5 ? -1 : 1) * (0.02 + p * 0.06) * (x > 960 ? 1.4 : 0.7));
      if (p > 0.25 || crand() < 0.5) flee();
      for (let i = 0; i < 6 + p * 18; i++) embers.spawn({ x: fx + (crand() - 0.5) * 40, y: fy - 2, vx: (crand() - 0.5) * 60, vy: -40 - crand() * 120 * (0.5 + p), life: 1.2 + crand(), r0: 1.2, r1: 0.4, a: 1, tint: 0xffa040, drag: 0.8, grav: 40, fade: 0.05 });
      flare = Math.max(flare, 0.4 + p * 0.4);
      gust = Math.min(1.5, gust + p);
    },
    update(dt, t) {
      const cm = calm();
      if (!inFight) {
        demoT -= dt;
        if (demoT < 0) {
          demoT = 6;
          DEMO[demoI++ % DEMO.length]();
        }
      }
      surge = Math.max(0, surge - dt / 6);
      gutter = Math.max(0, gutter - dt / 2.4);
      flare = Math.max(0, flare - dt / 1.6);
      tear = Math.max(0, tear - dt / 4);
      gust = Math.max(0, gust - dt * 0.8);
      if (waveS >= 0) {
        waveS += dt * (PATH_LEN / 2.4);
        if (waveS > PATH_LEN + 200) waveS = -1;
      }
      const gut = Math.sin(Math.min(1, gutter) * Math.PI) * (gutter > 0 ? 1 : 0);
      // the light: a cold gust dims the moonlight for a breath on FEED ME
      dim.setAlpha(gut * 0.3);
      moonGlow.setAlpha(0.1 - gut * 0.06);

      // the column
      const pace = PACE * (1 + surge * 2.2) * cm;
      for (const tc of torches) {
        tc.s += pace * dt;
        if (tc.s > PATH_LEN) tc.s -= PATH_LEN;
        const p = pathAt(tc.s);
        const s = colScale(p.y);
        const dir = p.dx < 0 ? -1 : 1;
        // fading in out of the mist at the bottom, out of sight among the trees at the top
        const vis = clamp01(tc.s / 60) * clamp01((PATH_LEN - tc.s) / 40);
        const wb = waveS >= 0 ? clamp01(1 - Math.abs(tc.s - waveS) / 160) : 0;
        tc.boost = Math.max(tc.boost - dt * 0.7, wb);
        const fk = flicker(t * 1.2, tc.seed) * (1 - gut * 0.45);
        tc.body.step(dt, (pace / PACE) * 0.9);
        tc.body.alpha = vis;
        tc.body.each((im) => im.setPosition(p.x, p.y).setScale((dir * s) / K2, s / K2));
        const hx = p.x + (HAND[0] - BF.w / 2) * s * dir;
        const hy = p.y + (HAND[1] - BF.h + 1) * s + 2 * s;
        const fs = (s / K2) * (1 + tc.boost * 0.5 + surge * 0.15 - gut * 0.3);
        tc.flame.step(dt, 1 + tc.boost + gust * 0.5);
        tc.flame.alpha = vis;
        tc.flame.each((im) => im.setPosition(hx, hy).setScale(fs, fs * (1 + Math.sin(t * 7 + tc.seed) * 0.05)).setRotation(-gust * 0.2 + Math.sin(t * 2 + tc.seed) * 0.05));
        tc.glow.setPosition(hx, hy - 10 * s).setAlpha(vis * (0.11 + tc.boost * 0.3 + surge * 0.06) * fk).setScale(((36 + tc.boost * 30) * s * 2) / 256);
        tc.pool.setPosition(p.x, p.y).setAlpha(vis * (0.1 + tc.boost * 0.2) * fk);
      }

      // the mist: drifting along the gorge, torn faster on the whirl
      for (const b of banks) {
        b.l.step(dt, cm);
        b.x += b.v * (1 + tear * 5) * dt * cm;
        const span = MF.w * b.s;
        if (b.x > 1440) b.x = 160 - span;
        const edge = clamp01((b.x + span - 160) / 240) * clamp01((1440 - b.x) / 240);
        b.l.alpha = b.a * edge * (1 - tear * 0.3);
        b.l.each((im) => im.setPosition(b.x, b.y + Math.sin(t * 0.2 + b.v) * 4));
      }

      // the owl that crosses the gorge now and then
      if (glider.t < 0) {
        glider.wait -= dt;
        if (glider.wait <= 0) glider.t = 0;
      } else {
        glider.t += dt / 9;
        const u = glider.t;
        const x = 330 + u * 760;
        const y = 360 + u * 70 + Math.sin(u * 7) * 8;
        // beats a few times, then glides on spread wings
        const beating = (u * 9) % 3 < 1;
        if (beating) glider.l.step(dt, 1);
        else glider.l.show(0.1);
        glider.l.alpha = clamp01(u * 8) * clamp01((1 - u) * 8) * 0.9;
        glider.l.each((im) => im.setPosition(x, y));
        if (u >= 1) {
          glider.t = -1;
          glider.wait = 18 + crand() * 16;
          glider.l.alpha = 0;
          glider.l.show(0);
        }
      }

      // the boughs: an idle stir, the stomps' swing, the whirl's thrashing
      if (thrash > 0) {
        thrash -= dt;
        thrashKick -= dt;
        if (thrashKick <= 0) {
          thrashKick = 0.22 + crand() * 0.12;
          oakSw.kick((crand() - 0.5) * 0.16);
          pineSw.kick((crand() - 0.5) * 0.16);
          if (crand() < 0.6) shower(2);
        }
      }
      oakSw.update(dt, t);
      pineSw.update(dt, t);

      // the leaves
      leafRate.tick((0.35 + gust * 2) * cm, dt, () => dropLeaf(40 + crand() * 520, 120 + crand() * 100, crand() < 0.2));
      for (const lf of leaves) {
        if (lf.age < 0) continue;
        lf.age += dt;
        if (lf.rest > 0) {
          lf.rest += dt;
          lf.im.setAlpha(clamp01(1 - (lf.rest - 1.5) / 1.5));
          if (lf.rest > 3) {
            lf.age = -1;
            lf.im.setVisible(false);
          }
          continue;
        }
        const sw = Math.sin(t * lf.w + lf.ph);
        lf.x += (sw * lf.amp + 14 + gust * 40) * dt;
        lf.y += lf.vy * (0.55 + 0.45 * Math.abs(Math.cos(t * lf.w + lf.ph))) * dt;
        lf.im.setPosition(lf.x, lf.y).setRotation(sw * 1.1 + lf.ph).setScale((lf.s / K2) * Math.cos(t * lf.w * 0.7 + lf.ph), lf.s / K2);
        if (lf.y >= lf.floor) {
          lf.rest = 0.01;
          lf.im.setScale(lf.s / K2, (lf.s / K2) * 0.55);
        }
      }

      // the fire
      smoke.step(dt, (1 + gust * 0.6 + flare) * cm);
      smoke.alpha = 0.9 - gut * 0.3;
      smoke.each((im) => im.setRotation(gust * 0.25 + gut * 0.35).setScale((1 / SR) * (1 + flare * 0.15), (1 / SR) * (1 - gut * 0.3)));
      const fk = flicker(t, 3.1);
      for (const [i, fl] of flames.entries()) {
        fl.step(dt, 1 + flare);
        fl.alpha = clamp01(0.75 + flare * 0.5) * fk;
        fl.each((im) => im.setScale(((i ? 0.6 : 0.8) / K2) * (1 + flare * 0.6), ((i ? 0.6 : 0.8) / K2) * (1 + flare * 0.9)));
      }
      const breathe = 0.75 + 0.25 * Math.sin(t * 0.9) + 0.1 * Math.sin(t * 3.7);
      bed.setAlpha((0.22 * breathe + flare * 0.3) * fk);
      bedCore.setAlpha((0.32 * breathe + flare * 0.4) * fk);
      emberRate.tick((1.5 + flare * 10) * cm, dt, () => embers.spawn({ x: fx + (crand() - 0.5) * 40, y: fy - 3, vx: (crand() - 0.3) * 14 + gust * 30, vy: -20 - crand() * 30, life: 1.4 + crand(), r0: 1, r1: 0.3, a: 0.9, tint: 0xffa040, drag: 0.4, fade: 0.08 }));

      // the owl
      if (owl.state === 0) {
        perch.step(dt, cm);
        perch.alpha = 1;
      } else {
        owl.t += dt;
        if (owl.state === 1) {
          // off over the gorge, beating hard, then gliding away small into the dark
          owl.vy += 30 * dt;
          owl.x += owl.vx * dt;
          owl.y += owl.vy * dt;
          flier.step(dt, 1.2);
          const sc = (0.8 / K2) * Math.max(0.35, 1 - owl.t * 0.18);
          flier.alpha = clamp01(1 - (owl.t - 2.5) / 1.5);
          flier.each((im) => im.setPosition(owl.x, owl.y).setScale(-sc, sc));
          perch.alpha = 0;
          perch.show(0);
          if (owl.t > 9) {
            owl.state = 2;
            owl.t = 0;
          }
        } else {
          // gliding back in from the dark and settling
          const u = clamp01(owl.t / 3);
          const e = ease(u);
          const x = 1440 + (IB.owl[0] - 1440) * e;
          const y = 380 + (IB.owl[1] - 12 - 380) * e + Math.sin(u * Math.PI) * -20;
          const sc = (0.8 / K2) * (0.5 + 0.5 * e);
          flier.alpha = clamp01(u * 4) * (u < 0.92 ? 1 : 0);
          if (u > 0.75) flier.step(dt, 1.6);
          else flier.show(0.1);
          flier.each((im) => im.setPosition(x, y).setScale(sc, sc));
          perch.alpha = u >= 0.92 ? 1 : 0;
          perch.show(0);
          if (u >= 1) {
            owl.state = 0;
            flier.alpha = 0;
            flier.show(0);
          }
        }
      }

      scree.update(dt);
      dust.update(dt);
      embers.update(dt);
    },
    destroy: unlisten,
  };
});
