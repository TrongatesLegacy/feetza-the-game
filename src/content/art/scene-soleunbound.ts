// The Dawn of Time (the arena of THE SOLE PROPRIETOR UNBOUND, the last fight of the game: Act 10, wave 100), redrawn
// with the location kit (src/art/scene). (The old art is kept in scenes-act10.ts for the before/after page.)
//
// The fight happens at the First Pizzeria (scene-firstpizzeria.ts), and the place is painted with the First
// Pizzeria's own painters so the player knows it at once: the same dry-stone wall where the peels hang, the same clay
// beehive oven at FIN.hive, the thatched larder, the sandstone table, the same valley, river, volcano and horizon in
// the last hour before the first sunrise. But the Unbound's power has torn it apart:
// - the sky is ripped open from the top of the sky down to the horizon, a great tear into the magenta and violet void
//   of the Oven Between Worlds (the finale's palette), its lips burning, cracks running off them into the night, its
//   stars pouring out through it; the clouds and the stars of our sky swirl in towards it;
// - the sunrise is frozen under the tear: a hard gold sliver on the horizon that cannot rise;
// - the volcano erupts: lava fountaining from the crater, flows running down both flanks, a plume lit red from below;
// - rocks, clods of earth, logs off the woodpile and the larder's jars float, lifted off the ground and glowing magenta
//   on their undersides; the river runs backwards, lifting off its bend in a ribbon of water that climbs up into the
//   tear; the standing stones on the rise behind the wall glow with his power; the oven blazes, embers whipped up.
//
// An arena, not a location: no waves. It answers the fight (the soleunbound brain in src/game/bosses/act10.ts emits
// 'soleunbound-phase' with the phase as each one starts, 'soleunbound-hole' with x, y when a black hole opens,
// 'soleunbound-hole-closed', and 'soleunbound-beaten' when he falls):
// - the tear widens phase by phase (THE GAUNTLET, FROST AND FIRE, THE STONE GAZE, THE BLACK HOLE);
// - FROST AND FIRE: frost creeps over the table and the coping from both ends while the volcano roars;
// - THE STONE GAZE: everything floating turns to stone, its glow dies, and it drops a little;
// - THE BLACK HOLE: everything floating is dragged towards the hole (and held above the wall of peels);
// - THE LAST SLICE: the tear starts closing, and the frozen sunrise strains to break free;
// - beaten: the tear seals with a flash along its seam, what floated falls, the jars land, and the sun breaks free:
//   real dawn light floods in (the ending then takes over with the First Pizzeria at sunrise).
// On the stages page the wave buttons stand in for the phases (5 is the Last Slice), and a big blow there plays his
// fall.
// A stomp jolts the floating rocks and jars, bursts embers out of the oven, and lifts pebbles off the table.
//
// Hero animations: the tear (its void swirling, a painted loop; its burning lips drawn live as it widens; its stars
// pouring out with physics), the eruption (a painted lava-fountain loop, the plume rolling, lava bombs arcing onto the
// flanks), and the river's ribbon (a painted loop of water twisting up into the sky, drops peeling off it).
//
// Runtime layers to design round (finale.ts): the wall of peels is built here too (inside FIN.wall), and in the Last
// Slice the brain lights every peel on it and pours their power into one golden peel; so the wall's face stays calm
// and even, and nothing still or moving sits over FIN.wall. The middle round y 520–560 (the black hole, the mirror
// shield) is the wall's calm face. The dawn layer (fin_dawn) is off in this wave.

import Phaser from 'phaser';
import { type Air, type Ctx, type PathFn, type R, H, TY, W, calmLanes, crevice, glowAt, groundShadow, lightPool, polyPath, rim, vfill, vignetteAll, within } from '../../art/scene/kit';
import { type SceneLayer, type SceneSpec, layerRng } from '../../art/scene/layers';
import { lay, noiseMask } from '../../art/scene/paint';
import { cloud, horizonGlow, skyFill } from '../../art/scene/sky';
import { nebula } from '../../art/scene/space';
import { makeCanvas, mix, rgba, rng, shade } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { Loop, Parts, Rate, Spring, Swing, sheet } from '../../game/sceneAnim';
import { type KitLive, calm, flicker, registerKitScene, wander } from '../../game/sceneLive';
import { fireFrame, smokeFrame } from './sceneBits';
import { FIRSTPIZZERIA, FP } from './scene-firstpizzeria';

type Pt = [number, number];
type Box = { x: number; y: number; w: number; h: number };
const P2 = Math.PI * 2;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const { SUN, HOR, WALL, HIVE, PLAT, MOUTH, HOLE, FIRE, ROOF, JARS, JAR_FOOT, FERN_TOP, FERNS_R, VOL, VOL_PTS, FAR_RANGE, SMOKE, PLUME, FIREC } = FP;

// ——— the place: the First Pizzeria's own layers, painted with its own random streams (so every stone is where it was)

const fpOf = (id: string): SceneLayer => {
  const l = FIRSTPIZZERIA.layers.find((q) => q.id === id);
  if (!l) throw new Error(`soleunbound: the First Pizzeria has no layer ${id}`);
  return l;
};
/** One of the First Pizzeria's layers as it painted it (its own box, its own random stream), optionally clipped. */
function fp(id: string, o: { box?: Box; clip?: Box } = {}): SceneLayer {
  const l = fpOf(id);
  return {
    id: `fp_${id}`,
    box: o.box ?? l.box,
    motion: l.motion,
    draw: (c) => {
      if (o.clip) {
        c.beginPath();
        c.rect(o.clip.x, o.clip.y, o.clip.w, o.clip.h);
        c.clip();
      }
      l.draw(c, layerRng(FIRSTPIZZERIA, l));
    },
  };
}

// ——— layout ———

/** The tear: from its lower tip on the horizon over the frozen sun, up through the sky and off its top. Local frame:
 * the tip at the origin, the axis up (v negative), rotated by `rot`. Its lips are `hw` apart at most (THE BLACK HOLE);
 * each phase opens it to a fraction of that (`widen`). */
const TEAR = { x: SUN.x + 6, y: HOR - 4, L: 384, rot: Math.atan2(118, 364), hw: 236 };
const COS = Math.cos(TEAR.rot);
const SIN = Math.sin(TEAR.rot);
const toScreen = (u: number, v: number): Pt => [TEAR.x + u * COS - v * SIN, TEAR.y + u * SIN + v * COS];
/** The lens's half-width at t (0 at the tip, 1 at the top): widest a little below the middle. */
const hwAt = (t: number) => TEAR.hw * Math.sin(Math.PI * clamp01(t) ** 0.8) ** 0.7;
/** The tear's middle (where the void is deepest). */
const TC = toScreen(0, -0.44 * TEAR.L);
/** The widths of the phases (1–5), and the still's (the first). */
const WIDEN = [0.56, 0.56, 0.7, 0.84, 1, 0.8];

/** A smooth 1D value noise in -1…1. */
const vnoise = (x: number, seed: number) => {
  const h = (i: number) => {
    const v = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
    return (v - Math.floor(v)) * 2 - 1;
  };
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return h(i) + (h(i + 1) - h(i)) * u;
};
/** The lips: torn, not cut: a slow wander, ragged at every scale, with a few flaps of sky hanging in over the void
 * and a few bites out of it; [t, k] where k scales the half-width. Different on each side. */
const LIPS: Record<-1 | 1, [number, number][]> = (() => {
  const out = { [-1]: [], [1]: [] } as unknown as Record<-1 | 1, [number, number][]>;
  for (const s of [-1, 1] as const) {
    const sd = s < 0 ? 3.1 : 7.7;
    const rr = rng(s < 0 ? 611 : 617);
    const n = 110;
    const flaps = [0.2 + rr() * 0.15, 0.5 + rr() * 0.15, 0.78 + rr() * 0.1];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      let k = 1 + 0.1 * vnoise(t * 5, sd) + 0.07 * vnoise(t * 14, sd + 1) + 0.045 * vnoise(t * 38, sd + 2) + (rr() - 0.5) * 0.035;
      // flaps of torn sky curling in over the void (narrow it), the sky bitten back beside them
      for (const [j, f] of flaps.entries()) {
        const d = (t - f) / 0.035;
        k -= Math.exp(-d * d) * (j === 1 ? 0.22 : 0.15);
        const d2 = (t - f - 0.06) / 0.03;
        k += Math.exp(-d2 * d2) * 0.08;
      }
      out[s].push([t, Math.max(0.35, k)]);
    }
  }
  return out;
})();
const lipPt = (s: -1 | 1, i: number, w: number): Pt => {
  const [t, k] = LIPS[s][i];
  return [s * hwAt(t) * k * w, -t * TEAR.L];
};
/** The tear's outline at a width (local frame). */
const lensPath = (w: number): PathFn => (c) => {
  c.beginPath();
  c.moveTo(0, 0);
  const n = LIPS[-1].length;
  for (let i = 1; i < n; i++) {
    const [x, y] = lipPt(-1, i, w);
    c.lineTo(x, y);
  }
  for (let i = n - 2; i > 0; i--) {
    const [x, y] = lipPt(1, i, w);
    c.lineTo(x, y);
  }
  c.closePath();
};
/** Cracks running off the lips into the sky: where on which lip, which way, how long; each a jagged line. */
const CRACKS: { s: -1 | 1; i: number; pts: Pt[] }[] = (() => {
  const rr = rng(631);
  const out: { s: -1 | 1; i: number; pts: Pt[] }[] = [];
  for (const [s, i, len, ang] of [[-1, 30, 44, -0.5], [-1, 64, 58, 0.35], [1, 22, 40, 0.4], [1, 48, 66, -0.3], [1, 80, 36, 0.2]] as const) {
    const pts: Pt[] = [[0, 0]];
    let a = ang;
    let x = 0;
    let y = 0;
    const n = 5;
    for (let k = 0; k < n; k++) {
      a += (rr() - 0.5) * 0.9;
      const l = (len / n) * (0.7 + rr() * 0.6);
      // outwards from the lip (local +x on the right lip, -x on the left), leaning along the axis by a
      x += s * Math.cos(a) * l;
      y += Math.sin(a) * l;
      pts.push([x, y]);
    }
    out.push({ s, i, pts });
  }
  return out;
})();

/** The frozen sun: its disc under the horizon (only a hard sliver shows), and how far it rises when he falls. */
const SUNC = { x: SUN.x + 2, y: HOR + 8, r: 24, rise: 34 };
const SUN_BOX: Box = { x: SUN.x - 110, y: HOR - 80, w: 220, h: 76 };

/** The volcano's surface height at x (its upper outline). */
const volY = (x: number): number => {
  for (let i = 0; i < VOL_PTS.length - 1; i++) {
    const [ax, ay] = VOL_PTS[i];
    const [bx, by] = VOL_PTS[i + 1];
    if ((x >= ax && x <= bx) || (x <= ax && x >= bx)) {
      const t = bx === ax ? 0 : (x - ax) / (bx - ax);
      // (the outline goes up the left flank and down the right one: take the upper of any two hits)
      return ay + (by - ay) * t;
    }
  }
  return HOR + 10;
};
const LAVA = { w: 120, h: 100, n: 8 };
const LAVA_K = 1.8;

/** The river's ribbon: lifting off the bend in the river and twisting up into the tear. */
const RIB: [Pt, Pt, Pt, Pt] = [[902, 378], [952, 296], [672, 300], [724, 178]];
const RIB_BOX: Box = { x: 676, y: 150, w: 276, h: 236 };
const ribAt = (s: number): Pt => {
  const u = 1 - s;
  const [a, b, c, d] = RIB;
  return [u * u * u * a[0] + 3 * u * u * s * b[0] + 3 * u * s * s * c[0] + s * s * s * d[0], u * u * u * a[1] + 3 * u * u * s * b[1] + 3 * u * s * s * c[1] + s * s * s * d[1]];
};

/** The standing stones on the rise behind the wall (their feet behind the coping), glowing with his power. */
const STONES = [
  { x: 336, w: 64, top: 238, lean: -0.04, seed: 1 },
  { x: 418, w: 46, top: 290, lean: 0.05, seed: 2 },
  { x: 1412, w: 58, top: 264, lean: 0.03, seed: 3 },
  { x: 1494, w: 40, top: 306, lean: -0.06, seed: 4 },
];
const STONE_FOOT = WALL.top + 6;

/** What floats: clods of earth, rocks, a sandstone slab, logs off the woodpile, pebbles (frames of one sheet; the same
 * frames petrified follow them), at their homes and sizes. */
const CHUNK = { w: 132, h: 116, kinds: 6 };
const CHUNKS: { x: number; y: number; s: number; f: number; rot: number }[] = [
  { x: 150, y: 222, s: 0.95, f: 0, rot: -0.08 },
  { x: 292, y: 300, s: 0.5, f: 2, rot: 0.12 },
  { x: 560, y: 250, s: 0.36, f: 5, rot: 0 },
  { x: 1222, y: 214, s: 0.78, f: 3, rot: 0.06 },
  { x: 1340, y: 330, s: 0.44, f: 1, rot: -0.1 },
  { x: 1600, y: 296, s: 0.62, f: 4, rot: -0.3 },
  { x: 470, y: 182, s: 0.42, f: 3, rot: -0.1 },
  { x: 1110, y: 158, s: 0.5, f: 2, rot: 0.08 },
  { x: 1596, y: 196, s: 0.4, f: 0, rot: 0.14 },
  { x: 880, y: 112, s: 0.28, f: 1, rot: -0.2 },
  { x: 1752, y: 132, s: 0.34, f: 5, rot: 0 },
  { x: 1846, y: 340, s: 0.5, f: 1, rot: 0.2 },
  { x: 1050, y: 344, s: 0.3, f: 5, rot: 0.1 },
];
/** How high each jar floats over its place. */
const JAR_LIFT = [74, 96, 84];

const AIR: Air = { color: '#3a2a64', far: 0.62 };
const MAG = '#ff4fd8';
const VIO = '#b06bff';
const CYAN = '#36e0ff';
const GOLD = '#ffb84a';

// ——— small helpers ———

function fillPath(ctx: Ctx, path: PathFn, fill: string | CanvasGradient): void {
  path(ctx);
  ctx.fillStyle = fill;
  ctx.fill();
}
function strokePath(ctx: Ctx, path: PathFn, col: string, w: number): void {
  path(ctx);
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.lineJoin = 'round';
  ctx.stroke();
}
function lin(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [t, c] of stops) g.addColorStop(t, c);
  return g;
}
function rad(ctx: Ctx, x: number, y: number, r0: number, r1: number, stops: [number, string][]): CanvasGradient {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  for (const [t, c] of stops) g.addColorStop(t, c);
  return g;
}
/** A soft ellipse of light or shade (op: how it lays on). */
function blob(ctx: Ctx, x: number, y: number, rx: number, ry: number, col: string, a: number, op: GlobalCompositeOperation = 'source-over'): void {
  if (rx < 0.5 || ry < 0.5) return;
  ctx.save();
  ctx.globalCompositeOperation = op;
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  ctx.fillStyle = rad(ctx, 0, 0, 0, rx, [[0, rgba(col, a)], [0.55, rgba(col, a * 0.4)], [1, rgba(col, 0)]]);
  ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
  ctx.restore();
}
const lerpCol = (a: number, b: number, t: number) => {
  const ch = (s: number) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};

// ——— the sky, torn ———

function sky(ctx: Ctx, r: R): void {
  const box = { x: 0, y: 0, w: W, h: 430 };
  // the last of the night, gone violet and bruised under his power
  skyFill(ctx, box, [
    [0, '#05030f'],
    [0.18, '#0b0620'],
    [0.38, '#170a34'],
    [0.54, '#271046'],
    [0.64, '#3a1450'],
    [0.7, '#561c58'],
    [0.735, '#7a3050'],
    [0.75, '#5a2444'],
    [1, '#3a1a3a'],
  ], 0.07);
  // the eruption's red over the left of the sky
  lightPool(ctx, VOL.x, VOL.top - 30, 520, 260, '#ff5a2a', 0.12, 'screen');
  // the void's light thrown across the sky round the tear (soft, wide), deeper violet away from it
  lightPool(ctx, TC[0], TC[1] + 30, 900, 420, '#7a2a90', 0.22, 'screen');
  lightPool(ctx, TC[0], TC[1], 460, 300, '#b04ab8', 0.14, 'screen');
  // the earth's shadow low on the right, as before the dawn
  ctx.fillStyle = lin(ctx, SUN.x + 300, 0, W, 0, [[0, 'rgba(14,8,34,0)'], [1, 'rgba(14,8,34,0.5)']]);
  ctx.fillRect(SUN.x + 300, HOR - 60, W, 80);
  // the frozen dawn: a tight, hard band of light on the horizon either side of the sun, not the soft glow of a real one
  horizonGlow(ctx, HOR + 2, 46, '#c8603a', 0.22);
  lightPool(ctx, SUN.x, HOR, 640, 34, '#ff9a4a', 0.32, 'lighter');
  lightPool(ctx, SUN.x, HOR - 2, 260, 12, '#ffd27a', 0.5, 'lighter');
  // the faint stars of our sky, washed out round the tear
  for (let i = 0; i < 700; i++) {
    const x = r() * W;
    const t = r() ** 1.3;
    const y = t * 290;
    const a = (0.18 + r() * 0.5) * (1 - t * 0.75) * clamp01(Math.hypot(x - TC[0], (y - TC[1]) * 1.6) / 300);
    if (a < 0.04) continue;
    ctx.fillStyle = rgba(r() < 0.8 ? '#f4f0ff' : '#ffe0f0', a);
    const s = 0.5 + r() * 0.8;
    ctx.fillRect(x, y, s, s);
  }
}

/** Clouds: long bars of stratus on the right of the sky, lit magenta on the faces turned to the tear; the volcano's ash
 * bank on the left lit red from beneath; low bars over the frozen sun, lit gold from beneath. */
function clouds(ctx: Ctx, r: R): void {
  for (const [x, y, w, h, a] of [[1290, 176, 560, 26, 0.75], [1650, 236, 420, 18, 0.6], [1120, 262, 300, 12, 0.55], [1560, 122, 380, 16, 0.45]] as const) {
    cloud(ctx, r, x, y, w * 0.85, h * 2.2, { kind: 'bank', lit: '#b858b0', body: '#26123e', shadow: '#120a26', sunX: TC[0], sunY: TC[1] - 40, rim: 0.55, wisp: 0.8, a: a * 0.55, depth: 0.55, air: AIR });
  }
  cloud(ctx, r, 170, 132, 460, 54, { kind: 'bank', lit: '#ff6a3a', body: '#2a1424', shadow: '#0e0610', sunX: VOL.x, sunY: VOL.top + 40, rim: 0.7, wisp: 0.6, a: 0.7, depth: 0.5, air: AIR });
  for (const [x, y, w, h, a] of [[520, 288, 420, 14, 0.7], [800, 300, 300, 10, 0.6], [380, 270, 240, 10, 0.45]] as const) {
    cloud(ctx, r, x, y, w, h, { kind: 'stratus', lit: '#ffb060', body: '#3a1c44', shadow: '#1a0e2a', sunX: SUN.x, sunY: HOR + 50, rim: 0.7, wisp: 0.45, a, depth: 0.5, air: AIR });
  }
}

// ——— the tear (its void, its bloom, its burning lips: painted in its own frame) ———

/** The void through the tear, at full width, in the tear's frame: the cosmos of the Oven Between Worlds. */
function tearVoid(ctx: Ctx, r: R): void {
  const p = lensPath(1);
  const L = TEAR.L;
  const box = { x: -TEAR.hw * 1.2, y: -L, w: TEAR.hw * 2.4, h: L };
  within(ctx, p, () => {
    ctx.fillStyle = rad(ctx, 0, -L * 0.44, 10, L * 0.6, [[0, '#2c0c4a'], [0.5, '#1a0830'], [1, '#0c0418']]);
    ctx.fillRect(box.x, box.y, box.w, box.h);
    nebula(ctx, r, box, [VIO, MAG, CYAN], 0.42, 77);
    // a warm heart deep in it (the oven's fire on the far side of everything)
    blob(ctx, 4, -L * 0.42, 60, 120, '#ff9a3a', 0.22, 'screen');
    blob(ctx, 0, -L * 0.46, 34, 150, '#ffe0ff', 0.2, 'screen');
    // its stars: thick as dust, some big
    for (let i = 0; i < 520; i++) {
      const x = box.x + r() * box.w;
      const y = box.y + r() * box.h;
      const a = 0.3 + r() * 0.6;
      ctx.fillStyle = rgba(['#ffffff', '#ffe0fa', '#d8f4ff', '#ffe8c8'][Math.floor(r() * 4)], a);
      const s = 0.6 + r() * 1.1;
      ctx.fillRect(x, y, s, s);
    }
    for (let i = 0; i < 14; i++) {
      const x = (r() - 0.5) * TEAR.hw * 1.2;
      const y = -L * (0.12 + r() * 0.8);
      glowAt(ctx, x, y, 8 + r() * 10, ['#ffffff', '#ffd0ff', '#c8f4ff'][i % 3], 0.5);
    }
    // the raw edge inside the lips: hot light on the void's side
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [wd, a] of [[26, 0.1], [12, 0.14], [5, 0.2]] as const) {
      strokePath(ctx, p, rgba(MAG, a), wd);
    }
    ctx.restore();
  });
}

/** The glow the tear throws round itself (added), at full width, in its frame. */
function tearBloom(ctx: Ctx): void {
  const L = TEAR.L;
  const p = lensPath(1);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  blob(ctx, 0, -L * 0.45, TEAR.hw * 1.5, L * 0.6, '#8a2aa0', 0.32);
  for (const [wd, a, col] of [[90, 0.05, VIO], [52, 0.08, MAG], [26, 0.12, MAG], [12, 0.14, '#ffa0f0']] as const) strokePath(ctx, p, rgba(col, a), wd);
  // light pooling at the lower tip, where it meets the frozen sun
  blob(ctx, 0, -10, 50, 40, '#ffb0e0', 0.3);
  ctx.restore();
}

/** One frame of the void's swirl (added over the void, clipped to the tear): wisps of nebula turning round its heart. */
function tearSwirl(ctx: Ctx, ph: number): void {
  const L = TEAR.L;
  const p = lensPath(1);
  within(ctx, p, () => {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const cx = 0;
    const cy = -L * 0.44;
    for (const [k, col, a, sp] of [[0, MAG, 0.34, 1], [1, CYAN, 0.22, -1], [2, VIO, 0.3, 2]] as const) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(0.55, 1);
      ctx.rotate(sp * ph * P2 * (k === 2 ? 0.5 : 1) + k * 2);
      lay(ctx, noiseMask(4 + k, 91 + k * 5, { cover: 0.3, soft: 0.3, col, w: 96, h: 96 }), { x: -L * 0.5, y: -L * 0.5, w: L, h: L }, a, 'lighter');
      ctx.restore();
    }
    // a bright filament drawn round the heart
    ctx.strokeStyle = rgba('#ffe0ff', 0.22);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const a = ph * P2 + (i / 40) * Math.PI * 1.4;
      const rr = 30 + i * 2.4;
      const x = cx + Math.cos(a) * rr * 0.5;
      const y = cy + Math.sin(a) * rr;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  });
}

/** The torn lips at a width, as strokes (in the tear's frame): the sky's torn edge (its thickness, dark, just
 * outside), then the raw edge burning, hotter in some stretches than others, and hairline fractures running off it into
 * the sky. Painted in the still, drawn live as the tear opens. */
interface LipStroke {
  pts: Pt[];
  w: number;
  col: string;
  a: number;
  add: boolean;
}
function lipStrokes(w: number): LipStroke[] {
  const out: LipStroke[] = [];
  const n = LIPS[-1].length;
  for (const s of [-1, 1] as const) {
    const edge = Array.from({ length: n }, (_, i) => lipPt(s, i, w));
    out.push({ pts: edge.map(([x, y]) => [x + s * 3, y]), w: 4, col: '#08030f', a: 0.5, add: false });
    const SEG = 10;
    for (let g = 0; g * SEG < n - 1; g++) {
      const pts = edge.slice(g * SEG, Math.min(n, (g + 1) * SEG + 1));
      const f = 0.55 + 0.45 * vnoise(g * 0.9, s * 3);
      out.push({ pts, w: 9, col: MAG, a: 0.13 * f, add: true }, { pts, w: 3.5, col: '#ff9ae8', a: 0.32 * f, add: true }, { pts, w: 1.2, col: '#ffeefe', a: 0.78 * f, add: true });
    }
  }
  const g = 0.45 + 0.55 * w;
  for (const c of CRACKS) {
    const [x0, y0] = lipPt(c.s, c.i, w);
    out.push({ pts: [[x0, y0], ...c.pts.map(([px, py]): Pt => [x0 + px * g, y0 + py * g])], w: 1, col: '#ffb0f0', a: 0.38 * clamp01(w * 4), add: true });
  }
  return out;
}
function lipsPaint(ctx: Ctx, w: number): void {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const st of lipStrokes(w)) {
    ctx.globalCompositeOperation = st.add ? 'lighter' : 'source-over';
    ctx.strokeStyle = rgba(st.col, st.a);
    ctx.lineWidth = st.w;
    ctx.beginPath();
    st.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  }
  ctx.restore();
}

function tearStill(ctx: Ctx, r: R): void {
  const w = WIDEN[0];
  ctx.save();
  ctx.translate(TEAR.x, TEAR.y);
  ctx.rotate(TEAR.rot);
  ctx.save();
  ctx.scale(w, 1);
  tearBloom(ctx);
  tearVoid(ctx, r);
  tearSwirl(ctx, 0.3);
  ctx.restore();
  lipsPaint(ctx, w);
  ctx.restore();
  // stars spilling out of it
  pourStill(ctx, r);
}
function pourStill(ctx: Ctx, r: R): void {
  for (let i = 0; i < 46; i++) {
    const s = r() < 0.5 ? -1 : 1;
    const t = 0.08 + r() * 0.8;
    const [u, v] = lipPt(s as -1 | 1, Math.round(t * 110), WIDEN[0]);
    const off = 6 + r() * 60;
    const [x, y] = toScreen(u + s * off, v + off * 0.6 + r() * 30);
    if (y > HOR - 6) continue;
    const a = (0.5 + r() * 0.5) * (1 - off / 80);
    glowAt(ctx, x, y, 4 + r() * 4, ['#ffd0ff', '#d8f4ff', '#ffffff'][i % 3], a * 0.6);
    ctx.fillStyle = rgba('#ffffff', a);
    ctx.fillRect(x - 0.8, y - 0.8, 1.6, 1.6);
  }
}

// ——— the frozen sun ———

/** The sun's disc risen by k (0: frozen, a hard sliver; 1: broken free), cut by the land in front of it. Drawn in
 * screen space (box SUN_BOX). */
function sunPaint(ctx: Ctx, k: number): void {
  const y = SUNC.y - k * SUNC.rise;
  ctx.save();
  // the bloom of it (tight while frozen)
  lightPool(ctx, SUNC.x, Math.min(HOR - 2, y - SUNC.r * 0.4), 70 + k * 40, 22 + k * 20, '#ffcc70', 0.5, 'lighter');
  ctx.fillStyle = rad(ctx, SUNC.x - 4, y - 6, 2, SUNC.r, [[0, '#ffffff'], [0.5, '#fff2c0'], [0.85, '#ffd060'], [1, '#ffb030']]);
  ctx.beginPath();
  ctx.arc(SUNC.x, y, SUNC.r, 0, P2);
  ctx.fill();
  // frozen: a hard flat flare across it, like a crack of light
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = lin(ctx, SUNC.x - 100, 0, SUNC.x + 100, 0, [[0, 'rgba(255,220,140,0)'], [0.5, 'rgba(255,240,200,0.8)'], [1, 'rgba(255,220,140,0)']]);
  ctx.fillRect(SUNC.x - 100, HOR - 7.5, 200, 1.6);
  // the land in front of it
  ctx.globalCompositeOperation = 'destination-out';
  polyPath([...FAR_RANGE.filter((p) => p[0] > SUN_BOX.x - 20 && p[0] < SUN_BOX.x + SUN_BOX.w + 20), [SUN_BOX.x + SUN_BOX.w + 20, HOR + 60], [SUN_BOX.x - 20, HOR + 60]])(ctx);
  ctx.fill();
  ctx.fillRect(SUN_BOX.x - 20, SUN_BOX.y + SUN_BOX.h, SUN_BOX.w + 40, 80);
  ctx.restore();
}

/** The sun in the still: painted apart (its land is cut out of it, not out of the sky behind). */
function sunStill(ctx: Ctx): void {
  const [c, g] = makeCanvas(SUN_BOX.w, SUN_BOX.h);
  g.translate(-SUN_BOX.x, -SUN_BOX.y);
  sunPaint(g, 0);
  ctx.drawImage(c, SUN_BOX.x, SUN_BOX.y);
}

// ——— the eruption ———

/** Lava running down the face of the cone from the crater in braided flows, glowing hot near the vent and crusting
 * over as it cools (still: the base; the live layer breathes a glow over them). */
function lavaFlows(ctx: Ctx, r: R): void {
  ctx.save();
  polyPath(VOL_PTS)(ctx);
  ctx.clip();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // the cone lit red from the crater and the flows
  blob(ctx, VOL.x, VOL.top + 40, 240, 90, '#ff4a1a', 0.2, 'lighter');
  for (const [s, f0, dx, drop, wig] of [[-1, 0.5, 150, 0.95, 1], [-1, 0.15, 60, 0.6, 1.4], [1, 0.55, 190, 1, 0.8], [1, 0.2, 80, 0.72, 1.2], [1, 0.85, 270, 0.85, 1]] as const) {
    const x0 = VOL.x + s * VOL.cw * f0;
    const y0 = VOL.top + 5;
    const y1 = y0 + (HOR - 8 - y0) * drop;
    const pts: Pt[] = [];
    for (let k = 0; k <= 26; k++) {
      const t = k / 26;
      pts.push([x0 + s * dx * t ** 1.3 + Math.sin(t * 9 + f0 * 7) * 6 * wig + (r() - 0.5) * 2, y0 + (y1 - y0) * t]);
    }
    const end = pts[pts.length - 1];
    for (const [wd, col, a] of [[12, '#ff3a08', 0.16], [5, '#ff6a18', 0.55], [2, '#ffd070', 0.9]] as const) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = wd * (s > 0 && f0 > 0.8 ? 0.7 : 1);
      ctx.strokeStyle = lin(ctx, x0, y0, end[0], end[1], [[0, rgba(col, a)], [0.55, rgba(col, a * 0.55)], [1, rgba(col, 0)]]);
      ctx.beginPath();
      FP.smoothLine(ctx, pts);
      ctx.stroke();
    }
    // crust floating on it as it cools: dark rafts
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 6; i < pts.length - 2; i += 2) {
      if (r() < 0.4) continue;
      ctx.fillStyle = rgba('#2a1010', 0.55);
      ctx.beginPath();
      ctx.ellipse(pts[i][0] + (r() - 0.5) * 2, pts[i][1], 1.6 + r() * 1.6, 1.2, 0, 0, P2);
      ctx.fill();
    }
  }
  ctx.restore();
  glowAt(ctx, VOL.x, VOL.top, 110, '#ff5a1a', 0.42, 0.6);
  glowAt(ctx, VOL.x, VOL.top - 8, 46, '#ffb050', 0.45);
}

/** One frame of the lava fountain over the crater (phase ph), source at the bottom middle of a LAVA.w × LAVA.h frame. */
function lavaFrame(c: Ctx, ph: number): void {
  const cx = LAVA.w / 2;
  const by = LAVA.h - 6;
  c.save();
  c.globalCompositeOperation = 'lighter';
  // the jet's body: a tapering column of glow, swaying
  const sw = Math.sin(ph * P2) * 4;
  c.fillStyle = lin(c, 0, by, 0, by - 70, [[0, 'rgba(255,200,110,0.75)'], [0.5, 'rgba(255,110,40,0.4)'], [1, 'rgba(255,60,20,0)']]);
  c.beginPath();
  c.moveTo(cx - 12, by);
  c.quadraticCurveTo(cx - 6 + sw, by - 40, cx + sw * 1.6, by - 66 - Math.sin(ph * P2 * 2) * 6);
  c.quadraticCurveTo(cx + 6 + sw, by - 40, cx + 12, by);
  c.closePath();
  c.fill();
  // clots of lava on their arcs: each born at the vent, thrown up and out, falling back cooling
  for (let i = 0; i < 14; i++) {
    const q = (ph + i / 14) % 1;
    const vx = Math.sin(i * 2.4) * 34;
    const v0 = 150 + ((i * 37) % 50);
    const T = 1.1;
    const tt = q * T;
    const x = cx + vx * tt;
    const y = by - (v0 * tt - 140 * tt * tt);
    if (y > by + 2) continue;
    const heat = 1 - q;
    const rr = 1.6 + heat * 2.4;
    c.fillStyle = rgba(heat > 0.5 ? '#ffe08a' : '#ff8a30', 0.95 * Math.min(1, heat * 2 + 0.2));
    c.beginPath();
    c.arc(x, y, rr, 0, P2);
    c.fill();
    c.fillStyle = rgba('#ff5020', 0.35 * heat);
    c.beginPath();
    c.arc(x, y, rr * 2.4, 0, P2);
    c.fill();
  }
  c.restore();
}

// ——— the river's ribbon ———

/** One frame of the ribbon of water lifting off the river and twisting up into the tear (phase ph: the flow runs up
 * it, backwards). Screen coordinates. */
function ribbonFrame(c: Ctx, ph: number): void {
  const N = 70;
  const pts: { x: number; y: number; nx: number; ny: number; w: number; f: number; a: number }[] = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const [x, y] = ribAt(s);
    const [x2, y2] = ribAt(Math.min(1, s + 0.01));
    const [x1, y1] = ribAt(Math.max(0, s - 0.01));
    const dx = x2 - x1;
    const dy = y2 - y1;
    const l = Math.hypot(dx, dy) || 1;
    // the twist travels up the ribbon with the flow; the face shown turns from front to back
    const tw = Math.cos(P2 * (s * 1.6 - ph));
    const w = (24 * (1 - s) ** 0.7 + 5) * (0.35 + 0.65 * Math.abs(tw));
    pts.push({ x, y, nx: -dy / l, ny: dx / l, w, f: tw, a: clamp01((1 - s) * 5) * clamp01(s * 30 + 0.3) });
  }
  c.save();
  // its foot: the river's water drawn up in a swirl, rings spreading out over the bend
  for (let k = 0; k < 3; k++) {
    const q = (ph + k / 3) % 1;
    c.strokeStyle = rgba('#e8d0ff', 0.5 * (1 - q));
    c.lineWidth = 1.4;
    c.beginPath();
    c.ellipse(RIB[0][0], RIB[0][1] + 2, 10 + q * 34, 2 + q * 6, 0, 0, P2);
    c.stroke();
  }
  blob(c, RIB[0][0], RIB[0][1], 22, 6, '#ffd0ff', 0.35, 'lighter');
  // the ribbon, quad by quad: its face lit pale where it turns to the tear, its back darker, a glossy line down it
  for (let i = 0; i < N; i++) {
    const p = pts[i];
    const q = pts[i + 1];
    const front = (p.f + q.f) / 2;
    const col = front > 0 ? mix('#7a6ad0', '#eee4ff', front * 0.85) : mix('#40308a', '#6252b0', -front);
    c.fillStyle = rgba(col, 0.92 * Math.min(p.a, q.a));
    c.beginPath();
    c.moveTo(p.x + p.nx * p.w * 0.5, p.y + p.ny * p.w * 0.5);
    c.lineTo(q.x + q.nx * q.w * 0.5, q.y + q.ny * q.w * 0.5);
    c.lineTo(q.x - q.nx * q.w * 0.5, q.y - q.ny * q.w * 0.5);
    c.lineTo(p.x - p.nx * p.w * 0.5, p.y - p.ny * p.w * 0.5);
    c.closePath();
    c.fill();
  }
  // its edges catch the void's light (magenta) on the side facing the tear
  c.globalCompositeOperation = 'lighter';
  c.lineWidth = 1.2;
  for (const s of [1, -1]) {
    c.strokeStyle = rgba(s > 0 ? MAG : '#9ad8ff', 0.4);
    c.beginPath();
    pts.forEach((p, i) => {
      const x = p.x + s * p.nx * p.w * 0.5;
      const y = p.y + s * p.ny * p.w * 0.5;
      if (i) c.lineTo(x, y);
      else c.moveTo(x, y);
    });
    c.stroke();
  }
  // the flow: glints running up it
  for (let k = 0; k < 9; k++) {
    const s = ((k / 9 + ph) % 1) * 0.96;
    const i = Math.floor(s * N);
    const p = pts[i];
    const q = pts[Math.min(N, i + 3)];
    c.strokeStyle = rgba('#ffffff', 0.55 * p.a * (0.5 + 0.5 * Math.max(0, p.f)));
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(p.x, p.y);
    c.lineTo(q.x, q.y);
    c.stroke();
  }
  // beads of water peeling off it and falling upwards
  for (let k = 0; k < 10; k++) {
    const q = (ph * 2 + k / 10) % 1;
    const s = ((k * 0.37) % 0.8) + 0.05;
    const [x, y] = ribAt(s);
    const side = k % 2 ? 1 : -1;
    const bx = x + side * (6 + q * 18);
    const by = y - q * 40;
    c.fillStyle = rgba('#e8e0ff', 0.7 * (1 - q));
    c.beginPath();
    c.arc(bx, by, 1.4 * (1 - q * 0.5), 0, P2);
    c.fill();
  }
  c.restore();
}

// ——— the standing stones ———

/** A standing stone's outline: a rough slab, wider at the shoulder, an oblique broken top, its sides a little
 * irregular. */
function stonePts(st: (typeof STONES)[number]): Pt[] {
  const { x, w, top, lean } = st;
  const foot = STONE_FOOT;
  const h = foot - top;
  const rr = rng(700 + st.seed);
  const pts: Pt[] = [];
  const L = (t: number) => x - w * (0.5 - t * 0.06) + lean * h * (1 - t) + (rr() - 0.5) * 3;
  const R0 = (t: number) => x + w * (0.5 - t * 0.04) + lean * h * (1 - t) + (rr() - 0.5) * 3;
  for (let i = 0; i <= 8; i++) pts.push([L(i / 8), foot - (i / 8) * h * 0.9]);
  pts.push([x - w * 0.3 + lean * h * 0.05, top + 8], [x - w * 0.05, top], [x + w * 0.35, top + 6 + rr() * 6]);
  for (let i = 8; i >= 0; i--) pts.push([R0(i / 8), foot - (i / 8) * h * 0.88]);
  return pts;
}
function menhir(ctx: Ctx, r: R, st: (typeof STONES)[number]): void {
  const { x, w, top, lean } = st;
  const h = STONE_FOOT - top;
  const foot = STONE_FOOT;
  const p = polyPath(stonePts(st));
  fillPath(ctx, p, lin(ctx, x - w, 0, x + w, 0, [[0, '#5e5268'], [0.4, '#3a3244'], [1, '#16121e']]));
  within(ctx, p, () => {
    // a second face turned away (the slab's thickness), lichen, the grain of the stone
    ctx.fillStyle = rgba('#0c0a12', 0.4);
    ctx.beginPath();
    ctx.moveTo(x + w * 0.2, top);
    ctx.lineTo(x + w * 0.7, top + 10);
    ctx.lineTo(x + w * 0.7, foot);
    ctx.lineTo(x + w * 0.18, foot);
    ctx.closePath();
    ctx.fill();
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = rgba(r() < 0.6 ? '#6a7a6a' : '#8a8466', 0.12 + r() * 0.1);
      ctx.beginPath();
      ctx.arc(x + (r() - 0.6) * w, top + 10 + r() * h * 0.8, 1.5 + r() * 3, 0, P2);
      ctx.fill();
    }
    // carved: a spiral and cup marks, cut into the stone and glowing with his power
    const cy = top + h * 0.3;
    const cx = x - w * 0.16 + lean * h * 0.65;
    ctx.lineCap = 'round';
    for (const [wd, col, a, op] of [[2.6, '#0a0610', 0.7, 'source-over'], [1.8, MAG, 0.3, 'lighter'], [0.8, '#ffd0f8', 0.3, 'lighter']] as const) {
      ctx.globalCompositeOperation = op;
      ctx.strokeStyle = rgba(col, a);
      ctx.lineWidth = wd;
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const a2 = (i / 40) * Math.PI * 3.6;
        const rr2 = 0.8 + (i / 40) * w * 0.17;
        const px = cx + Math.cos(a2) * rr2;
        const py = cy + Math.sin(a2) * rr2 * 1.1;
        if (i) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.stroke();
      // a cup and ring below it, two plain cups
      ctx.beginPath();
      ctx.arc(cx + w * 0.36, cy + h * 0.3, w * 0.09, 0, P2);
      ctx.stroke();
      for (const [dx, dy] of [[0.36, 0.3], [0.2, 0.5], [0.4, 0.58]] as const) {
        ctx.beginPath();
        ctx.arc(cx + dx * w, cy + h * dy, 1.3, 0, P2);
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    // the void's light on its upper left, the volcano's (or the oven's) red low on the side that faces it
    ctx.fillStyle = lin(ctx, x - w, top, x + w * 0.2, top + h * 0.5, [[0, rgba(MAG, 0.3)], [1, rgba(MAG, 0)]]);
    ctx.fillRect(x - w * 2, top - 4, w * 3, h);
    const warmX = x < 960 ? x - w : x + w;
    ctx.fillStyle = lin(ctx, warmX, 0, x, 0, [[0, rgba('#ff6a2a', 0.22)], [1, 'rgba(255,106,42,0)']]);
    ctx.fillRect(x - w * 2, top + h * 0.3, w * 4, h);
  });
  rim(ctx, p, 0.45, 3, '#ff9ae8');
  strokePath(ctx, p, '#0a0810', 1.4);
}
function stones(ctx: Ctx, r: R, which: number[]): void {
  for (const i of which) menhir(ctx, r, STONES[i]);
}

// ——— what floats ———

/** One floating thing (frame f of the chunk sheet, in a CHUNK.w × CHUNK.h frame, centred): a clod of earth, rocks, a
 * slab, a log, pebbles. Alive: lit by the void above, glowing magenta from beneath, roots dangling. Petrified: grey,
 * cracked, its glow gone. */
function chunkPaint(c: Ctx, f: number, stone: boolean): void {
  const kind = f % CHUNK.kinds;
  const rr = rng(810 + kind * 7);
  const cx = CHUNK.w / 2;
  const cy = 44;
  const pal = stone
    ? { top: '#8a8682', side0: '#6e6a66', side1: '#2e2c2a', turf: '#6a6864', ink: '#1a1816', grass: '#8a8884', under: '#2a2826', glow: 0 }
    : { top: '#4e4466', side0: '#5a3e3a', side1: '#1e1420', turf: '#2a3a26', ink: '#0c0810', grass: '#3e5a32', under: '#3a1440', glow: 1 };
  c.save();
  c.lineJoin = 'round';
  c.lineCap = 'round';
  if (kind === 0 || kind === 3) {
    // a clod of earth torn out of the ground: turf on top, an inverted cone of soil and stones, roots hanging
    const rx = kind === 0 ? 52 : 44;
    const top: Pt[] = [];
    for (let i = 0; i <= 16; i++) {
      const a = Math.PI + (i / 16) * Math.PI;
      top.push([cx + Math.cos(a) * rx * (0.92 + rr() * 0.16), cy + Math.sin(a) * 11 * (0.8 + rr() * 0.4)]);
    }
    // the underside, from the right-hand end of the turf down to a ragged point and up to the left
    const under: Pt[] = [];
    const tipX = cx + (rr() - 0.5) * 16;
    const tipY = cy + (kind === 0 ? 62 : 52);
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const sn = Math.sin(Math.PI * t);
      under.push([cx + rx * Math.cos(Math.PI * t) + (tipX - cx) * sn + (rr() - 0.5) * 8 * sn, cy + 2 + (tipY - cy) * sn ** 1.6 * (0.85 + rr() * 0.3)]);
    }
    const body = polyPath([...top, ...under]);
    // the roots, hanging under it (behind the body)
    c.strokeStyle = pal.ink;
    for (let i = 0; i < 6; i++) {
      // from just inside the ragged underside, dangling clear of it
      const [ux, uy] = under[2 + Math.floor(rr() * 9)];
      const x0 = ux + (cx - ux) * 0.1;
      const y0 = uy - 4;
      const len = Math.min(10 + rr() * 18, CHUNK.h - 4 - y0);
      c.lineWidth = 1 + rr() * 1.4;
      c.strokeStyle = stone ? '#5a5652' : '#3a2418';
      c.beginPath();
      c.moveTo(x0, y0);
      c.quadraticCurveTo(x0 + (rr() - 0.5) * 18, y0 + len * 0.6, x0 + (rr() - 0.5) * 14, y0 + len);
      c.stroke();
    }
    fillPath(c, body, lin(c, cx - rx, 0, cx + rx, 0, [[0, pal.side0], [0.6, shade(pal.side0, -0.3)], [1, pal.side1]]));
    within(c, body, () => {
      // strata and stones in the soil
      for (let i = 0; i < 4; i++) {
        c.strokeStyle = rgba(stone ? '#3a3836' : '#2a1a18', 0.4);
        c.lineWidth = 1.2;
        c.beginPath();
        const y = cy + 10 + i * 11 + rr() * 4;
        c.moveTo(cx - rx, y);
        c.quadraticCurveTo(cx, y + (rr() - 0.5) * 8, cx + rx, y + (rr() - 0.5) * 4);
        c.stroke();
      }
      for (let i = 0; i < 9; i++) {
        const sx = cx + (rr() - 0.5) * rx * 1.4;
        const sy = cy + 10 + rr() * 40;
        const sr = 2.5 + rr() * 5;
        c.fillStyle = stone ? '#8a8682' : '#6a5e6e';
        c.beginPath();
        c.ellipse(sx, sy, sr, sr * 0.7, rr(), 0, P2);
        c.fill();
        c.fillStyle = rgba('#ffffff', 0.15);
        c.beginPath();
        c.ellipse(sx - sr * 0.3, sy - sr * 0.3, sr * 0.45, sr * 0.3, 0, 0, P2);
        c.fill();
      }
      // underside: his power glowing up into it (or, petrified, just shade)
      c.fillStyle = lin(c, 0, tipY, 0, cy, [[0, rgba(pal.glow ? MAG : '#141210', pal.glow ? 0.7 : 0.5)], [0.6, rgba(pal.glow ? '#8a2a90' : '#141210', 0.2)], [1, 'rgba(0,0,0,0)']]);
      c.fillRect(0, cy, CHUNK.w, tipY - cy + 4);
      // the void's light on its upper left
      c.fillStyle = lin(c, cx - rx, cy, cx, cy + 30, [[0, rgba(stone ? '#ffffff' : '#c8a0ff', 0.25)], [1, 'rgba(0,0,0,0)']]);
      c.fillRect(0, 0, CHUNK.w, CHUNK.h);
      if (stone) {
        c.strokeStyle = rgba('#1a1816', 0.6);
        c.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
          let x = cx + (rr() - 0.5) * rx;
          let y = cy + 4;
          c.beginPath();
          c.moveTo(x, y);
          for (let k = 0; k < 5; k++) {
            x += (rr() - 0.5) * 10;
            y += 6 + rr() * 6;
            c.lineTo(x, y);
          }
          c.stroke();
        }
      }
    });
    strokePath(c, body, pal.ink, 1.6);
    // the turf: a lid of grass on top, lit
    const turf = polyPath([...top, [cx + rx * 0.96, cy + 5], [cx, cy + 9], [cx - rx * 0.96, cy + 5]]);
    fillPath(c, turf, lin(c, 0, cy - 12, 0, cy + 8, [[0, shade(pal.turf, 0.35)], [1, pal.turf]]));
    strokePath(c, turf, pal.ink, 1.2);
    for (let i = 0; i < 26; i++) {
      const gx = cx + (rr() - 0.5) * rx * 1.8;
      const gy = cy - 6 + rr() * 8;
      const gh = 4 + rr() * 7;
      c.strokeStyle = rgba(pal.grass, 0.9);
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(gx, gy);
      c.lineTo(gx + (rr() - 0.5) * 5, gy - gh);
      c.stroke();
    }
    if (kind === 3) {
      // a young cycad still rooted in it
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + (i / 6 - 0.5) * 2.4;
        FP.leaf(c, cx + 6, cy - 4, 22 + rr() * 8, 3, a, stone ? '#6a6864' : '#2a4a26', stone ? '#a8a6a2' : '#7aa06a', 0.4);
      }
    }
    if (pal.glow) {
      // his power lighting the ragged underside from below
      within(c, body, () => {
        c.globalCompositeOperation = 'lighter';
        c.strokeStyle = rgba(MAG, 0.5);
        c.lineWidth = 5;
        c.beginPath();
        FP.smoothLine(c, under);
        c.stroke();
      });
    }
  } else if (kind === 1 || kind === 2) {
    // a boulder (faceted), or a slab of layered sandstone
    const pts: Pt[] = [];
    const n = kind === 1 ? 9 : 8;
    const rx = kind === 1 ? 42 : 54;
    const ry = kind === 1 ? 36 : 20;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * P2 + rr() * 0.3;
      pts.push([cx + Math.cos(a) * rx * (0.8 + rr() * 0.3), cy + 14 + Math.sin(a) * ry * (0.8 + rr() * 0.3)]);
    }
    const p = polyPath(pts);
    const base = stone ? '#7a7672' : kind === 1 ? '#4a4252' : '#7a5a48';
    fillPath(c, p, base);
    within(c, p, () => {
      // facets: a lit top plane, a shaded right-hand one
      c.fillStyle = rgba('#ffffff', stone ? 0.18 : 0.1);
      c.beginPath();
      c.moveTo(pts[n - 1][0], pts[n - 1][1]);
      for (let i = 0; i < Math.ceil(n / 2); i++) c.lineTo(pts[(n - 1 + i) % n][0], pts[(n - 1 + i) % n][1]);
      c.lineTo(cx, cy + 10);
      c.closePath();
      c.fill();
      c.fillStyle = rgba('#000000', 0.32);
      c.beginPath();
      c.moveTo(cx + 4, cy + 12);
      c.lineTo(pts[0][0], pts[0][1]);
      c.lineTo(pts[1][0], pts[1][1]);
      c.lineTo(pts[2][0], pts[2][1]);
      c.closePath();
      c.fill();
      if (kind === 2) {
        for (let i = 0; i < 5; i++) {
          c.strokeStyle = rgba(stone ? '#4a4846' : i % 2 ? '#9a7a60' : '#4a3028', 0.5);
          c.lineWidth = 1.4;
          c.beginPath();
          c.moveTo(cx - rx, cy + 6 + i * 6);
          c.lineTo(cx + rx, cy + 10 + i * 6);
          c.stroke();
        }
      } else {
        for (let i = 0; i < 8; i++) {
          c.fillStyle = rgba(stone ? '#5a5856' : '#7a8a6a', 0.3);
          c.beginPath();
          c.arc(cx + (rr() - 0.5) * rx, cy + 4 + rr() * 20, 1.5 + rr() * 3, 0, P2);
          c.fill();
        }
      }
      c.fillStyle = lin(c, 0, cy + 14 + ry, 0, cy, [[0, rgba(pal.glow ? MAG : '#141210', pal.glow ? 0.65 : 0.4)], [1, 'rgba(0,0,0,0)']]);
      c.fillRect(0, cy, CHUNK.w, ry * 2 + 20);
      if (stone) {
        c.strokeStyle = rgba('#1a1816', 0.6);
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(cx - 10, cy);
        c.lineTo(cx - 4, cy + 14);
        c.lineTo(cx - 12, cy + 26);
        c.moveTo(cx + 16, cy + 4);
        c.lineTo(cx + 10, cy + 20);
        c.stroke();
      }
    });
    if (pal.glow) {
      c.save();
      p(c);
      c.clip();
      c.globalCompositeOperation = 'lighter';
      c.strokeStyle = rgba(MAG, 0.5);
      c.lineWidth = 5;
      c.beginPath();
      c.ellipse(cx, cy + 14 + ry * 0.8, rx * 0.8, ry * 0.4, 0, 0.1, Math.PI - 0.1);
      c.stroke();
      c.restore();
    }
    strokePath(c, p, pal.ink, 1.6);
  } else if (kind === 4) {
    // a log off the woodpile: bark, a split end showing its rings, a broken end
    c.save();
    c.translate(cx, cy + 16);
    c.rotate(-0.12);
    const lw = 96;
    const lr = 15;
    const body: PathFn = (g) => {
      g.beginPath();
      g.moveTo(-lw / 2, -lr);
      g.lineTo(lw / 2, -lr + 2);
      g.lineTo(lw / 2 + 4, 0);
      g.lineTo(lw / 2 - 2, lr);
      g.lineTo(-lw / 2, lr);
      g.closePath();
    };
    fillPath(c, body, lin(c, 0, -lr, 0, lr, [[0, stone ? '#8a8682' : '#5a3a26'], [0.4, stone ? '#6a6662' : '#3a2416'], [1, stone ? '#2e2c2a' : '#1a0e08']]));
    within(c, body, () => {
      c.strokeStyle = rgba(stone ? '#3a3836' : '#1a0c06', 0.6);
      c.lineWidth = 1.1;
      for (let i = 0; i < 9; i++) {
        const y = -lr + 3 + i * 3.2 + rr() * 1.5;
        c.beginPath();
        c.moveTo(-lw / 2, y);
        for (let x = -lw / 2; x <= lw / 2; x += 8) c.lineTo(x, y + Math.sin(x * 0.2 + i) * 1.2);
        c.stroke();
      }
      c.fillStyle = lin(c, 0, lr, 0, 0, [[0, rgba(pal.glow ? MAG : '#141210', pal.glow ? 0.6 : 0.3)], [1, 'rgba(0,0,0,0)']]);
      c.fillRect(-lw, 0, lw * 2, lr + 2);
    });
    strokePath(c, body, pal.ink, 1.5);
    // the end grain
    c.fillStyle = stone ? '#9a9692' : '#c89a68';
    c.beginPath();
    c.ellipse(-lw / 2, 0, 6, lr, 0, 0, P2);
    c.fill();
    c.strokeStyle = rgba(stone ? '#4a4846' : '#6a4426', 0.6);
    c.lineWidth = 0.8;
    for (let k = 1; k < 4; k++) {
      c.beginPath();
      c.ellipse(-lw / 2, 0, (6 * k) / 4, (lr * k) / 4, 0, 0, P2);
      c.stroke();
    }
    c.strokeStyle = pal.ink;
    c.lineWidth = 1.4;
    c.beginPath();
    c.ellipse(-lw / 2, 0, 6, lr, 0, 0, P2);
    c.stroke();
    c.restore();
  } else {
    // pebbles, a little cluster
    for (const [dx, dy, sr] of [[-22, 6, 13], [8, -2, 17], [30, 10, 10], [-4, 20, 9]] as const) {
      const p: PathFn = (g) => {
        g.beginPath();
        g.ellipse(cx + dx, cy + 14 + dy, sr, sr * 0.78, 0.2, 0, P2);
      };
      fillPath(c, p, rad(c, cx + dx - sr * 0.3, cy + 14 + dy - sr * 0.4, 1, sr * 1.2, [[0, stone ? '#b0aca8' : '#7a6e86'], [1, stone ? '#4a4846' : '#2a2034']]));
      if (pal.glow) {
        within(c, p, () => {
          c.fillStyle = lin(c, 0, cy + 14 + dy + sr, 0, cy + 14 + dy, [[0, rgba(MAG, 0.6)], [1, 'rgba(0,0,0,0)']]);
          c.fillRect(cx + dx - sr, cy + 14 + dy - sr, sr * 2, sr * 2);
        });
      }
      strokePath(c, p, pal.ink, 1.3);
    }
  }
  c.restore();
}

function chunksStill(ctx: Ctx): void {
  for (const ch of CHUNKS) {
    // the glow under it, then it
    glowAt(ctx, ch.x, ch.y + CHUNK.h * ch.s * 0.32, CHUNK.w * ch.s * 0.6, MAG, 0.18, 0.5);
    ctx.save();
    ctx.translate(ch.x, ch.y);
    ctx.rotate(ch.rot);
    ctx.scale(ch.s, ch.s);
    ctx.translate(-CHUNK.w / 2, -CHUNK.h / 2);
    chunkPaint(ctx, ch.f, false);
    ctx.restore();
  }
}

// ——— the near ground: the jars lifted, the light of his power on the place ———

/** Where the jars stood: their shadows gone soft (they float), the ground under them lit magenta. */
function jarGround(ctx: Ctx): void {
  JARS.forEach((j, i) => {
    groundShadow(ctx, j.x + 4, JAR_FOOT + 1, j.w * 0.95, 4, 0.5, '#06040a');
    blob(ctx, j.x, JAR_FOOT, j.w * 1.4, 7, MAG, 0.26, 'lighter');
    // the power holding it up: a faint column of light from the ground to its foot
    blob(ctx, j.x, JAR_FOOT - JAR_LIFT[i] * 0.45, j.w * 0.55, JAR_LIFT[i] * 0.6, MAG, 0.1, 'lighter');
  });
}

/** The jar, lifted off the ground and tilted a little. */
function jarLifted(i: number): SceneLayer {
  const j = JARS[i];
  const l = fpOf(j.id);
  const b = FP.jarBox(j);
  const lift = JAR_LIFT[i];
  return {
    id: j.id,
    box: { x: b.x - 14, y: b.y - lift - 6, w: b.w + 28, h: j.h + 34 },
    motion: 'sprite',
    draw: (c) => {
      c.translate(j.x, JAR_FOOT - lift);
      c.rotate([-0.13, 0.1, -0.2][i]);
      c.translate(-j.x, -JAR_FOOT);
      l.draw(c, layerRng(FIRSTPIZZERIA, l));
      // his power glowing up under it
      within(c, FP.jarPath(j), () => {
        c.fillStyle = lin(c, 0, JAR_FOOT, 0, JAR_FOOT - j.h * 0.4, [[0, rgba(MAG, 0.42)], [1, 'rgba(255,79,216,0)']]);
        c.fillRect(j.x - j.w * 1.4, JAR_FOOT - j.h, j.w * 2.8, j.h + 4);
      });
    },
  };
}

/** The void's light on the coping, and the frozen sun's thin gold low along it (above the peels' box). */
function copeLight(ctx: Ctx): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, WALL.top - 16, W, FIN_Y0 - 2 - (WALL.top - 16));
  ctx.clip();
  for (const c of FP.wallPathTop) {
    const t = Math.min(c.t0, c.t1, c.tm);
    const d = Math.abs((c.x0 + c.x1) / 2 - TC[0]);
    const k = 0.35 + 0.65 * clamp01(1 - d / 1300);
    ctx.fillStyle = lin(ctx, 0, t - 2, 0, t + 14, [[0, rgba('#e070e0', 0.42 * k)], [1, 'rgba(224,112,224,0)']]);
    ctx.beginPath();
    ctx.ellipse((c.x0 + c.x1) / 2 + c.lean * 0.7, t + 4, (c.x1 - c.x0) * 0.45, 6, 0, 0, P2);
    ctx.fill();
  }
  ctx.restore();
}
const FIN_Y0 = 450;

/** The oven blazing: the void's light on its crown and left flank, its mouth's glow thrown wide on the apron. */
function ovenLight(ctx: Ctx): void {
  within(ctx, FP.domePath, () => {
    ctx.fillStyle = rad(ctx, HIVE.x - 120, FP.CROWN + 40, 10, 300, [[0, rgba('#c060e0', 0.22)], [0.6, rgba('#c060e0', 0.05)], [1, 'rgba(192,96,224,0)']]);
    ctx.fillRect(HIVE.x - 260, FP.CROWN - 10, 520, PLAT - FP.CROWN + 10);
    // the blaze pushing up round the mouth, the soot above it lit
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    blob(ctx, MOUTH.x, MOUTH.spring - 30, 150, 90, FIREC, 0.14);
    ctx.restore();
  });
  rim(ctx, FP.domePath, 0.4, 5, '#e080f0');
  lightPool(ctx, MOUTH.x, PLAT + 4, 220, 26, '#ffa050', 0.22, 'lighter');
}
const OVEN_LIGHT_BOX: Box = { x: HIVE.x - 260, y: FP.CROWN - 14, w: 520, h: PLAT + 36 - FP.CROWN };

/** The awning's thatch lit from above by the void, the volcano's red on its left. */
function roofLight(ctx: Ctx): void {
  within(ctx, FP.roofWhole, () => {
    ctx.fillStyle = lin(ctx, 0, ROOF.back, 0, ROOF.eave, [[0, rgba('#d070e0', 0.32)], [1, 'rgba(208,112,224,0.02)']]);
    ctx.fillRect(ROOF.x0, ROOF.back - 10, ROOF.x1 - ROOF.x0 + 10, ROOF.eave - ROOF.back + 20);
  });
}
const ROOF_LIGHT_BOX: Box = { x: 0, y: ROOF.back - 12, w: ROOF.x1 + 14, h: ROOF.eave - ROOF.back + 30 };

/** The oven's fire (still), blazing. */
function fireStill(ctx: Ctx): void {
  ctx.save();
  FP.mouthPath(-3)(ctx);
  ctx.clip();
  fireFrame(ctx, FIRE.x, FIRE.y, FIRE.w, FIRE.h * 1.15, 0.3, { tongues: 6, seed: 2.1 });
  ctx.restore();
  glowAt(ctx, MOUTH.x, PLAT - 40, 170, FIREC, 0.24);
}
/** The smoke from the smoke hole, dragged towards the tear. */
const SMOKE_LEAN = -0.32;
function smokeStill(ctx: Ctx): void {
  ctx.save();
  ctx.translate(HOLE.x, HOLE.y + 6);
  ctx.rotate(SMOKE_LEAN);
  ctx.translate(-SMOKE.w / 2, -SMOKE.h);
  smokeFrame(ctx, SMOKE.w, SMOKE.h, 0.35, SMOKE.o);
  ctx.restore();
}
/** The volcano's plume (still), lit red from beneath. */
const PLUME_K = 1.9;
/** The eruption's ash column: lit red from beneath by the lava (the light below it), leaning off on the wind. */
const ERUPT = { ...PLUME.o, lit: '#ff8a5a', body: '#4a2a3a', shade: '#140810', wind: -0.5, lobes: 11, a: 0.72, toLight: [0.2, 1] as [number, number] };
function plumeStill(ctx: Ctx): void {
  ctx.save();
  ctx.translate(VOL.x, VOL.top + 4);
  ctx.scale(PLUME_K, PLUME_K);
  ctx.translate(-PLUME.w / 2, -PLUME.h);
  smokeFrame(ctx, PLUME.w, PLUME.h, 0.55, ERUPT);
  ctx.restore();
  glowAt(ctx, VOL.x - 10, VOL.top - 50, 120, '#ff5020', 0.22, 0.9);
  ctx.save();
  ctx.restore();
  ctx.save();
  ctx.translate(VOL.x, VOL.top + 6);
  ctx.scale(LAVA_K, LAVA_K);
  ctx.translate(-LAVA.w / 2, -LAVA.h);
  lavaFrame(ctx, 0.4);
  ctx.restore();
}
function embersStill(ctx: Ctx, r: R): void {
  for (let i = 0; i < 26; i++) {
    const t = r();
    const x = MOUTH.x - t * 260 + (r() - 0.5) * 60;
    const y = PLAT - 60 - t * 380 - r() * 40;
    glowAt(ctx, x, y, 5, '#ffa040', 0.4 * (1 - t));
    ctx.fillStyle = rgba('#ffe0a0', 0.9 * (1 - t * 0.6));
    ctx.fillRect(x - 1, y - 1, 2, 2);
  }
}

// ——— the table ———

/** The table under his light: the void's magenta far back, the frozen sun's gold glancing along it (kept low). */
function tableLight(ctx: Ctx): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, FP.FRONT - TY);
  ctx.clip();
  lightPool(ctx, TC[0], TY + 10, 900, 60, '#c050d0', 0.1, 'lighter');
  lightPool(ctx, SUN.x, TY + 4, 500, 14, GOLD, 0.08, 'lighter');
  ctx.restore();
  crevice(ctx, 0, W, TY, 10, 0.3, '#0a0610');
}

/** Frost creeping over the table from one end (FROST AND FIRE): a breath of rime from the front corner, and fern
 * frost growing out of it across the stone, stems and barbs, thinning out before the middle lane. */
function frost(ctx: Ctx, r: R, side: -1 | 1): void {
  const x0 = side < 0 ? 0 : W;
  const box = FROST_BOX(side);
  const F = FP.FRONT;
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  // the rime's breath from the corner: a frosted bloom over the stone, crystals thick as salt near the end
  blob(ctx, x0, F, 480, 220, '#dcefff', 0.36);
  blob(ctx, x0, TY + 16, 300, 50, '#dcefff', 0.2);
  for (let i = 0; i < 2400; i++) {
    const t = r() ** 1.8;
    const x = x0 - side * t * 440;
    const y = TY + 4 + r() * (F - TY - 6);
    const a = (0.25 + r() * 0.45) * (1 - t) ** 1.4;
    if (a < 0.03) continue;
    ctx.fillStyle = rgba(r() < 0.7 ? '#f0f8ff' : '#bcd8f0', a);
    const sz = 1 + r() * 1.6;
    ctx.fillRect(x, y, sz, sz * 0.6);
  }
  ctx.fillStyle = lin(ctx, x0, 0, x0 - side * 460, 0, [[0, 'rgba(236,248,255,0.55)'], [1, 'rgba(236,248,255,0)']]);
  ctx.fillRect(box.x, F - 5, box.w, 4);
  ctx.fillRect(box.x, WALL.foot - 2, box.w, 6);
  // feathers of frost growing out of it: short stems, close-set barbs, finer and fainter as they reach out
  ctx.lineCap = 'round';
  for (let i = 0; i < 110; i++) {
    const t = r() ** 1.3;
    let x = x0 - side * t * 360;
    let y = TY + 6 + r() * (F - TY - 10);
    const k = 1 - t;
    let a = (side < 0 ? 0 : Math.PI) + (r() - 0.5) * 2.2;
    const len = (14 + r() * 26) * (0.5 + k);
    const sy = 0.35 + ((y - TY) / (F - TY)) * 0.65;
    const al = 0.16 + k * 0.42;
    const n = 6;
    for (let j = 0; j < n; j++) {
      const st = len / n;
      const nx = x + Math.cos(a) * st;
      const ny = y + Math.sin(a) * st * sy;
      ctx.strokeStyle = rgba('#f6fcff', al);
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(nx, ny);
      for (const b of [-1, 1]) {
        const bl = st * (1.5 - j * 0.2);
        ctx.moveTo(nx, ny);
        ctx.lineTo(nx + Math.cos(a + b * 0.7) * bl, ny + Math.sin(a + b * 0.7) * bl * sy);
      }
      ctx.stroke();
      x = nx;
      y = ny;
      a += (r() - 0.5) * 0.3;
    }
  }
  ctx.restore();
}
const FROST_BOX = (side: -1 | 1): Box => ({ x: side < 0 ? 0 : W - 560, y: WALL.foot - 6, w: 560, h: H - WALL.foot + 6 });

/** Rime along the coping's tops (FROST AND FIRE), thinner in the middle where the '+N MORE' line sits. */
function frostCope(ctx: Ctx): void {
  for (const c of FP.wallPathTop) {
    const t = Math.min(c.t0, c.t1, c.tm);
    const m = (c.x0 + c.x1) / 2;
    const k = clamp01(Math.abs(m - 815) / 400 - 0.3);
    if (k <= 0) continue;
    ctx.fillStyle = lin(ctx, 0, t - 2, 0, t + 8, [[0, rgba('#f0faff', 0.75 * k)], [1, 'rgba(240,250,255,0)']]);
    ctx.beginPath();
    ctx.ellipse(m + c.lean * 0.7, t + 2, (c.x1 - c.x0) * 0.5, 4, 0, 0, P2);
    ctx.fill();
  }
}
const COPE_FROST_BOX: Box = { x: 0, y: WALL.top - 16, w: W, h: 40 };

// ——— finishing ———

function grade(ctx: Ctx): void {
  ctx.globalCompositeOperation = 'source-atop';
  const g = ctx.createLinearGradient(0, 0, W * 0.85, 1080);
  g.addColorStop(0, rgba('#ff60d0', 0.05));
  g.addColorStop(0.45, 'rgba(255,96,208,0)');
  g.addColorStop(0.62, 'rgba(70,50,190,0)');
  g.addColorStop(1, rgba('#3a30b0', 0.07));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, 1080);
}

function shadeOver(ctx: Ctx): void {
  calmLanes(ctx, 0.12, '#05030e', 80, 390);
  vignetteAll(ctx, 0.65, '#03020a', 0.6);
  vfill(ctx, 0, 0, W, 170, [[0, 'rgba(3,2,10,0.5)'], [1, 'rgba(3,2,10,0)']]);
  for (const [x, y, rr, a] of [[160, 60, 460, 0.42], [1790, 50, 340, 0.42]] as const) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.6);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rr);
    g.addColorStop(0, rgba('#020008', a));
    g.addColorStop(1, rgba('#020008', 0));
    ctx.fillStyle = g;
    ctx.fillRect(-rr, -rr, rr * 2, rr * 2);
    ctx.restore();
  }
}

// ——— the stack ———

const { MOUTH_BOX, SMOKE_BOX, CROWN_BOX, FERNS_BOX } = FP.boxes;
const pad = (b: Box, p: number): Box => ({ x: Math.floor(b.x - p), y: Math.floor(b.y - p), w: Math.ceil(b.w + p * 2), h: Math.ceil(b.h + p * 2) });
/** The tear's slot (its void, bloom and lips go here, behind the land): tight, so only the near half of the far range
 * is laid over it. */
const TEAR_BOX: Box = { x: 380, y: 0, w: 620, h: HOR - 4 };
const PLUME_SLOT: Box = { x: 0, y: 0, w: 700, h: VOL.top + 8 };
/** The far range is laid over the tear and the sun only where they are (its near half, above the valley's top). */
const RANGE_L: Box = { x: 0, y: 200, w: 330, h: HOR + 24 - 200 };
const RANGE_A: Box = { x: 330, y: 200, w: 670, h: HOR - 4 - 200 };
const RANGE_B: Box = { x: 1000, y: 200, w: W - 1000, h: HOR + 24 - 200 };

export const SOLEUNBOUND: SceneSpec = {
  id: 'soleunbound',
  info: {
    name: 'The Dawn of Time',
    subtitle: 'Wave 100',
    ambient: [],
    // (the tear, the eruption, the fire, the floating rocks and the river's ribbon are the live layer's)
    glows: [],
    light: '#ffd0f0',
    tableTint: '#fff0f8',
  },
  layers: [
    { id: 'sky', box: { x: 0, y: 0, w: W, h: 430 }, draw: sky },
    { id: 'clouds', box: { x: 0, y: 0, w: W, h: HOR }, draw: clouds },
    fp('volcano'),
    { id: 'lava', box: { x: 0, y: VOL.top - 100, w: 800, h: HOR + 14 - VOL.top + 100 }, draw: lavaFlows },
    { id: 'plumeStill', box: { x: 0, y: 0, w: 800, h: VOL.top + 10 }, stillOnly: true, draw: (c) => plumeStill(c) },
    { ...fp('range', { box: RANGE_L, clip: RANGE_L }), id: 'rangeL' },
    { ...fp('range', { box: RANGE_B, clip: RANGE_B }), id: 'rangeB' },
    fp('valley'),
    { id: 'stonesL', box: { x: 270, y: 222, w: 190, h: STONE_FOOT - 222 + 4 }, draw: (c, r) => stones(c, r, [0, 1]) },
    { id: 'stonesR', box: { x: 1360, y: 248, w: 170, h: STONE_FOOT - 248 + 4 }, draw: (c, r) => stones(c, r, [2, 3]) },
    { id: 'tearStill', box: TEAR_BOX, stillOnly: true, draw: tearStill },
    { id: 'sunStill', box: SUN_BOX, stillOnly: true, draw: (c) => sunStill(c) },
    // ——— the tear, the sun and the plume move: the near middle of the far range is laid over them (the standing
    // stones cut out of it, so they stand in front)
    { id: 'tear', box: TEAR_BOX, motion: 'slot', draw: () => {} },
    { id: 'sun', box: SUN_BOX, motion: 'slot', draw: () => {} },
    { id: 'plume', box: PLUME_SLOT, motion: 'slot', draw: () => {} },
    {
      id: 'rangeA',
      box: RANGE_A,
      draw: (c, r) => {
        // (clipped round the stones rather than cut out after, so the still keeps them)
        c.beginPath();
        c.rect(RANGE_A.x, RANGE_A.y, RANGE_A.w, RANGE_A.h);
        c.clip();
        c.beginPath();
        c.rect(0, 0, W, H);
        for (const st of STONES.slice(0, 2)) {
          const pts = stonePts(st);
          c.moveTo(pts[0][0], pts[0][1]);
          for (const [x, y] of pts.slice(1)) c.lineTo(x, y);
          c.closePath();
        }
        c.clip('evenodd');
        fp('range').draw(c, r);
      },
    },
    { id: 'ribbonStill', box: RIB_BOX, stillOnly: true, draw: (c) => ribbonFrame(c, 0.2) },
    { id: 'ribbon', box: RIB_BOX, motion: 'slot', draw: () => {} },
    fp('wall'),
    fp('roofShadow'),
    { id: 'jarGround', box: { x: 0, y: JAR_FOOT - 110, w: 260, h: TY - JAR_FOOT + 110 }, draw: (c) => jarGround(c) },
    fp('leanto'),
    fp('tomato'),
    fp('basil'),
    fp('oven'),
    fp('woodpile'),
    fp('peel'),
    fp('fernTrunk'),
    { id: 'ovenLight', box: OVEN_LIGHT_BOX, draw: (c) => ovenLight(c) },
    { id: 'roofLight', box: ROOF_LIGHT_BOX, draw: (c) => roofLight(c) },
    { id: 'copeLight', box: { x: 0, y: WALL.top - 16, w: W, h: FIN_Y0 - 2 - (WALL.top - 16) }, draw: (c) => copeLight(c) },
    { id: 'fireStill', box: pad(MOUTH_BOX, 80), stillOnly: true, draw: (c) => fireStill(c) },
    { id: 'smokeStill', box: { x: SMOKE_BOX.x - 120, y: 0, w: SMOKE_BOX.w + 120, h: SMOKE_BOX.h }, stillOnly: true, draw: (c) => smokeStill(c) },
    // ——— what moves (late, so nothing still after them but the table is pulled into an overlay)
    { id: 'fire', box: MOUTH_BOX, motion: 'slot', draw: () => {} },
    { id: 'smoke', box: SMOKE_BOX, motion: 'slot', draw: () => {} },
    fp('quern'),
    ...JARS.map((_, i) => jarLifted(i)),
    { ...fp('fernsR'), id: 'fernsR', box: FERNS_BOX, motion: 'sprite' as const },
    { ...fp('crown'), id: 'crown', box: CROWN_BOX, motion: 'sprite' as const },
    fp('table'),
    { id: 'tableLight', box: { x: 0, y: TY, w: W, h: FP.FRONT - TY + 12 }, draw: (c) => tableLight(c) },
    { id: 'frostL', box: FROST_BOX(-1), liveOnly: true, res: 0.5, draw: (c, r) => frost(c, r, -1) },
    { id: 'frostR', box: FROST_BOX(1), liveOnly: true, res: 0.5, draw: (c, r) => frost(c, r, 1) },
    { id: 'frostCope', box: COPE_FROST_BOX, liveOnly: true, res: 0.5, draw: (c) => frostCope(c) },
    { id: 'chunksStill', stillOnly: true, draw: (c) => chunksStill(c) },
    { id: 'embersStill', box: { x: 1300, y: 200, w: 500, h: 560 }, stillOnly: true, draw: embersStill },
    { id: 'fx', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

// ——— live ———

type Img = Phaser.GameObjects.Image;

interface Floater {
  img: Img;
  stoneImg: Img;
  glow: Img;
  hx: number;
  hy: number;
  s: number;
  rot0: number;
  ox: Spring;
  oy: Spring;
  or: Spring;
  seed: number;
  /** falling, when he's beaten */
  vy: number;
  fy: number;
  /** a stomp's flare of its glow */
  flare: number;
}

registerKitScene(SOLEUNBOUND, (k: KitLive, wave0: number) => {
  const ADD = Phaser.BlendModes.ADD;
  const sc = k.sc;
  /** In a fight (the game scene has its boss slots), or on the stages page. */
  const inFight = 'miniFoot' in (sc as object);
  const top = k.slot('fx');
  const layer = (into: Phaser.GameObjects.Container = top) => {
    const c = sc.add.container(0, 0);
    into.add(c);
    return c;
  };

  // ——— the fight's state
  let phase = inFight ? 1 : Math.max(1, Math.min(5, wave0));
  let phaseT = 0;
  let hole: { x: number; y: number } | null = null;
  let beaten = false;
  let beatenT = 0;
  let widen = WIDEN[phase];
  let erupt = 0.6;
  let frostK = 0;
  let stoneK = 0;
  let strainK = 0;
  let dawnK = 0;
  let sealK = 0;

  // ——— the tear: its bloom, its void, the void's swirl (a painted loop), its burning lips (drawn live as it opens)
  const tearC = k.slot('tear');
  const [tx0, ty0] = [TEAR.hw * 1.2 + 8, TEAR.L + 8];
  const voidKey = k.tex('su_void', Math.ceil(tx0 * 2), Math.ceil(ty0 + 8), (c) => {
    c.translate(tx0, ty0);
    tearVoid(c, rng(4401));
  });
  const BR = 0.5;
  const [bx0, by0] = [TEAR.hw * 1.2 + 90, TEAR.L + 90];
  const bloomKey = k.tex('su_bloom', Math.ceil(bx0 * 2 * BR), Math.ceil((by0 + 90) * BR), (c) => {
    c.scale(BR, BR);
    c.translate(bx0, by0);
    tearBloom(c);
  });
  const SR = 0.4;
  const swirlKey = sheet(k, 'su_swirl', tx0 * 2 * SR, (ty0 + 8) * SR, 6, (c, ph) => {
    c.scale(SR, SR);
    c.translate(tx0, ty0);
    tearSwirl(c, ph);
  });
  const place = (im: Img, ox: number, oy: number, w: number, h: number) => im.setOrigin(ox / w, oy / h).setPosition(TEAR.x, TEAR.y).setRotation(TEAR.rot);
  const bloom = place(k.img(bloomKey, 0, 0, { into: tearC, add: true }), bx0 * BR, by0 * BR, bx0 * 2 * BR, (by0 + 90) * BR);
  bloom.setScale(1 / BR);
  const voidImg = place(k.img(voidKey, 0, 0, { into: tearC }), tx0, ty0, tx0 * 2, ty0 + 8);
  const swirl = new Loop(k, swirlKey, 6, TEAR.x, TEAR.y, { into: tearC, add: true, origin: [0.5, ty0 / (ty0 + 8)], scale: 1 / SR, fps: 1.2 });
  swirl.each((im) => im.setRotation(TEAR.rot));
  const lipsShade = sc.add.graphics().setPosition(TEAR.x, TEAR.y).setRotation(TEAR.rot);
  const lips = sc.add.graphics().setBlendMode(ADD).setPosition(TEAR.x, TEAR.y).setRotation(TEAR.rot);
  tearC.add([lipsShade, lips]);
  let lipsW = -1;
  const drawLips = (w: number) => {
    lips.clear();
    lipsShade.clear();
    if (w < 0.004) return;
    for (const st of lipStrokes(w)) {
      const g = st.add ? lips : lipsShade;
      g.lineStyle(st.w, parseInt(st.col.slice(1), 16), st.a);
      g.beginPath();
      st.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.strokePath();
    }
  };
  // bright stars deep in the void, twinkling (placed in the tear's frame as it opens)
  const starKey = k.tex('su_star', 32, 32, (c) => {
    const g = c.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.15, 'rgba(255,255,255,0.5)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 32, 32);
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.fillRect(4, 15.5, 24, 1);
    c.fillRect(15.5, 4, 1, 24);
  });
  const sr0 = rng(4411);
  const voidStars = Array.from({ length: 12 }, (_, i) => ({
    u: (sr0() - 0.5) * 1.3,
    t: 0.1 + sr0() * 0.75,
    s: 0.3 + sr0() * 0.5,
    ph: sr0() * 10,
    sp: 0.6 + sr0() * 1.6,
    img: k.img(starKey, 0, 0, { into: tearC, add: true, tint: [0xffffff, 0xffd0ff, 0xc8f4ff][i % 3], alpha: 0 }),
  }));
  // the stars pouring out of it: thrown off the lips, falling and drifting out over our sky, gone at the horizon
  const pour = new Parts(k, { frame: 'spark', add: true, into: tearC, max: 220 });
  const pourRate = new Rate();
  const POUR_T = [0xffffff, 0xffd0ff, 0xc8f4ff, 0xffe0a0];
  const pourStar = (burst = 0) => {
    const s = crand() < 0.5 ? -1 : 1;
    const i = 6 + Math.floor(crand() ** 1.4 * 90);
    const [u, v] = lipPt(s, i, widen);
    const [x, y] = toScreen(u, v);
    // outwards from the lip (and down: they fall out of it)
    const nx = s * COS;
    const ny = s * SIN;
    const sp = 18 + crand() * 40 + burst * 120;
    let vx = nx * sp + (crand() - 0.5) * 12;
    const vy = ny * sp + 10 + crand() * 20;
    // (the black hole bends them towards itself)
    if (hole) vx += Math.sign(hole.x - x) * 20;
    pour.spawn({ x, y, vx, vy, life: 2.4 + crand() * 2.4, r0: 3.2 + crand() * 2.4, r1: 1, a: 1, tint: POUR_T[Math.floor(crand() * 4)], grav: 22, drag: 0.25, streak: 0.03, fade: 0.06, floor: HOR - 10 });
  };
  // the void's light on the sky round it, breathing as it opens
  const skyGlow = k.glow(TC[0], TC[1], 700, 0xa040c0, 0.1, { into: tearC, sy: 0.7 });

  // ——— the frozen sun (a painted sliver at each height it can rise to), its bloom; its rays when it strains
  const sunC = k.slot('sun');
  const sunKey = sheet(k, 'su_sun', SUN_BOX.w, SUN_BOX.h, 6, (c, _ph, i) => {
    c.translate(-SUN_BOX.x, -SUN_BOX.y);
    sunPaint(c, i / 5);
  });
  const sunGlow = k.glow(SUNC.x, HOR - 4, 160, 0xffb050, 0.3, { into: sunC, sy: 0.3 });
  const sun = new Loop(k, sunKey, 6, SUN_BOX.x, SUN_BOX.y, { into: sunC, origin: [0, 0], fps: 0 });
  const rays = Array.from({ length: 9 }, (_, i) => k.img('glow', SUNC.x, HOR - 6, { into: sunC, add: true, tint: i % 2 ? 0xffd890 : 0xffb050, alpha: 0, origin: [0.5, 1] }));

  // ——— the eruption: the plume rolling (the First Pizzeria's loop, lit red and bigger), the lava fountain (a painted
  // loop), lava bombs arcing out onto the flanks, the crater's glow
  const plumeC = k.slot('plume');
  const PS = 0.45;
  const plumeKey = sheet(k, 'su_plume', PLUME.w * PS, PLUME.h * PS, 8, (c, ph) => {
    c.scale(PS, PS);
    smokeFrame(c, PLUME.w, PLUME.h, ph, ERUPT);
  });
  const crater = k.glow(VOL.x, VOL.top + 2, 110, 0xff4a1a, 0.4, { into: plumeC, sy: 0.6 });
  // the eruption's light thrown over the left of the sky (up with the eruption: it roars in FROST AND FIRE)
  const skyRed = k.glow(VOL.x, VOL.top - 40, 520, 0xff5020, 0.1, { into: plumeC, sy: 0.55 });
  const plume = new Loop(k, plumeKey, 8, VOL.x, VOL.top + 6, { into: plumeC, origin: [0.5, 1], scale: PLUME_K / PS, fps: 1.8 });
  const plumeLit = k.glow(VOL.x - 20, VOL.top - 60, 140, 0xff5020, 0.25, { into: plumeC, sy: 0.8 });
  const lavaKey = sheet(k, 'su_lava', LAVA.w, LAVA.h, LAVA.n, (c, ph) => lavaFrame(c, ph));
  const fountain = new Loop(k, lavaKey, LAVA.n, VOL.x, VOL.top + 6, { into: plumeC, add: true, origin: [0.5, 1], scale: LAVA_K, fps: 9 });
  const vent = k.glow(VOL.x, VOL.top, 40, 0xffd070, 0.5, { into: plumeC, sy: 0.6 });
  const bombs = new Parts(k, { frame: 'ember', add: true, into: plumeC, max: 50 });
  const bombRate = new Rate();
  const bomb = (kick = 0) => {
    const s = crand() < 0.5 ? -1 : 1;
    const vx = s * (30 + crand() * 90) * (1 + kick);
    bombs.spawn({ x: VOL.x + (crand() - 0.5) * 20, y: VOL.top, vx, vy: -(140 + crand() * 120) * (1 + kick * 0.5), life: 2.4, r0: 3.2, r1: 1.4, a: 1, tint: crand() < 0.5 ? 0xffb040 : 0xff7020, grav: 220, drag: 0.1, streak: 0.012, fade: 0.02, floor: volY(VOL.x + vx * 1.2) + 6 });
  };
  // the lava flows' glow breathing
  const flowGlows = [-1, 1].map((s) => k.glow(VOL.x + s * 110, VOL.top + 70, 120, 0xff4a10, 0.12, { into: plumeC, sy: 0.5 }));

  // ——— the river's ribbon: a painted loop twisting up into the tear; drops peeling off it
  const ribC = k.slot('ribbon');
  const RR = 0.5;
  const ribKey = sheet(k, 'su_ribbon', RIB_BOX.w * RR, RIB_BOX.h * RR, 8, (c, ph) => {
    c.scale(RR, RR);
    c.translate(-RIB_BOX.x, -RIB_BOX.y);
    ribbonFrame(c, ph);
  });
  const ribbon = new Loop(k, ribKey, 8, RIB_BOX.x, RIB_BOX.y, { into: ribC, origin: [0, 0], scale: 1 / RR, fps: 7 });
  const drops = new Parts(k, { frame: 'drop', into: ribC, max: 40 });
  const dropRate = new Rate();
  const ribFoot = k.glow(RIB[0][0], RIB[0][1], 40, 0xd8a0ff, 0.25, { into: ribC, sy: 0.3 });

  // ——— the standing stones' carvings glowing with his power
  const glowC = layer();
  const stoneGlows = STONES.map((st, i) => ({
    aura: k.glow(st.x, st.top + (STONE_FOOT - st.top) * 0.4, 70 + st.w, 0xff4fd8, 0, { into: glowC, sy: 1.6 }),
    core: k.glow(st.x - st.w * 0.08, st.top + (STONE_FOOT - st.top) * 0.34, st.w * 0.6, 0xffb0f0, 0, { into: glowC }),
    seed: i * 1.9,
  }));

  // ——— the oven blazing: its fire (the First Pizzeria's loop), the glow round the mouth, embers whipped up
  const fireC = k.slot('fire');
  const FW = FIRE.w + 24;
  const FH = FIRE.h + 12;
  const fx0 = FIRE.x - FW / 2;
  const fy0 = FIRE.y + 2 - FH;
  const fireKey = sheet(k, 'fp_fire', FW, FH, 12, (c, ph) => {
    c.save();
    c.translate(-fx0, -fy0);
    FP.mouthPath(-3)(c);
    c.clip();
    c.translate(fx0, fy0);
    fireFrame(c, FW / 2, FH - 2, FIRE.w, FIRE.h, ph, { tongues: 5, seed: 1.3 });
    c.restore();
  });
  const coals = k.glow(FIRE.x, PLAT - 18, 90, 0xff7a2a, 0.5, { into: fireC, sy: 0.35 });
  const fire = new Loop(k, fireKey, 12, FIRE.x, FIRE.y + 2, { into: fireC, add: true, origin: [0.5, 1], fps: 13, sy: 1.08, sx: 1 });
  const boost = new Spring(0, 14, 3);
  let ovenFlash = 0;
  const ovenGlows = [
    { img: k.glow(MOUTH.x, PLAT - 50, 200, 0xff8a3a, 0, { into: glowC }), a: 0.16, seed: 1 },
    { img: k.glow(MOUTH.x, PLAT + 4, 230, 0xffa050, 0, { into: glowC, sy: 0.22 }), a: 0.26, seed: 2 },
    { img: k.glow(MOUTH.x - 30, TY + 34, 420, 0xff8a3a, 0, { into: glowC, sy: 0.2 }), a: 0.12, seed: 3 },
    { img: k.glow(MOUTH.x, MOUTH.spring - 70, 110, 0xff7030, 0, { into: glowC, sy: 0.7 }), a: 0.12, seed: 4 },
  ];
  const smokeC = k.slot('smoke');
  const SS = 0.5;
  const smokeKey = sheet(k, 'fp_smoke', SMOKE.w * SS, SMOKE.h * SS, 12, (c, ph) => {
    c.scale(SS, SS);
    smokeFrame(c, SMOKE.w, SMOKE.h, ph, SMOKE.o);
  });
  const smoke = new Loop(k, smokeKey, 12, HOLE.x, HOLE.y + 6, { into: smokeC, origin: [0.5, 1], scale: 1 / SS, fps: 4.4, tint: 0xe0c0e0 });
  smoke.each((im) => im.setRotation(SMOKE_LEAN));
  const holeGlow = k.glow(HOLE.x, HOLE.y - 2, 36, 0xff7030, 0.3, { into: smokeC, sy: 0.45 });
  const partC = layer();
  const embers = new Parts(k, { frame: 'ember', add: true, into: partC, max: 110 });
  const emberRate = new Rate();
  const holeRate = new Rate();
  /** An ember whipped up out of the mouth or the smoke hole, curling away towards the tear. */
  const ember = (fromHole: boolean, kick = 0) => {
    const x = fromHole ? HOLE.x + (crand() - 0.5) * 14 : MOUTH.x + (crand() - 0.5) * 120;
    const y = fromHole ? HOLE.y - 2 : PLAT - 30 - crand() * 40;
    embers.spawn({ x, y, vx: (fromHole ? -40 - crand() * 80 : -10 - crand() * 40) - kick * 50 + (crand() - 0.5) * (50 + kick * 150), vy: -(fromHole ? 120 : 110) - crand() * 120 - kick * 360, life: 1.6 + crand() * 1.4, r0: 2.6 + kick * 1.6, r1: 0.8, a: 0.95, tint: crand() < 0.5 ? 0xffa040 : 0xffd070, grav: -30, drag: 0.35, streak: 0.022, fade: 0.04 });
  };

  // ——— what floats: rocks, clods, logs, pebbles (a painted sheet, alive and petrified), each with its glow beneath
  const floatC = layer();
  const chunkKey = sheet(k, 'su_chunk', CHUNK.w, CHUNK.h, CHUNK.kinds * 2, (c, _ph, i) => chunkPaint(c, i % CHUNK.kinds, i >= CHUNK.kinds));
  const floaters: Floater[] = CHUNKS.map((ch, i) => {
    const glow = k.glow(ch.x, ch.y + CHUNK.h * ch.s * 0.32, CHUNK.w * ch.s * 0.6, 0xff4fd8, 0.2, { into: floatC, sy: 0.5 });
    const img = k.img(chunkKey, ch.x, ch.y, { into: floatC, scale: ch.s }).setFrame(ch.f).setRotation(ch.rot);
    const stoneImg = k.img(chunkKey, ch.x, ch.y, { into: floatC, scale: ch.s, alpha: 0 }).setFrame(ch.f + CHUNK.kinds).setRotation(ch.rot);
    return { img, stoneImg, glow, hx: ch.x, hy: ch.y, s: ch.s, rot0: ch.rot, ox: new Spring(0, 6, 2.2), oy: new Spring(0, 10, 2.4), or: new Spring(0, 8, 1.6), seed: i * 2.3, vy: 0, fy: 0, flare: 0 };
  });
  // crumbs of earth falling off their undersides
  const pebKey = sheet(k, 'su_pebble', 16, 16, 6, (c, _ph, i) => {
    const rr = rng(900 + i);
    const pts: Pt[] = [];
    for (let q = 0; q < 7; q++) {
      const a = (q / 7) * P2;
      pts.push([8 + Math.cos(a) * (4 + rr() * 3), 8 + Math.sin(a) * (3.5 + rr() * 2.5)]);
    }
    const p = polyPath(pts);
    fillPath(c, p, rad(c, 6, 6, 0.5, 8, [[0, i % 2 ? '#8a7a8a' : '#7a6458'], [1, '#2a1e26']]));
    within(c, p, () => {
      c.fillStyle = lin(c, 0, 14, 0, 8, [[0, rgba(MAG, 0.55)], [1, 'rgba(0,0,0,0)']]);
      c.fillRect(0, 0, 16, 16);
    });
    strokePath(c, p, '#0c0810', 1);
  });
  const crumbs = new Parts(k, { frame: 'puff', sheet: { key: pebKey, n: 6, half: 8 }, into: floatC, max: 60 });
  const crumbRate = new Rate();
  // the jars, floating over their places
  const jars = JARS.map((j, i) => ({
    img: k.pivot(k.sprite(j.id), j.x, JAR_FOOT - JAR_LIFT[i]),
    lift: JAR_LIFT[i],
    oy: new Spring(0, 12, 2.6),
    or: new Spring(0, 10, 2),
    ox: new Spring(0, 8, 2.4),
    glow: k.glow(j.x, JAR_FOOT - JAR_LIFT[i] + 4, j.w * 1.5, 0xff4fd8, 0.2, { into: floatC, sy: 0.4 }),
    seed: i * 3.7,
    landed: false,
  }));
  // pebbles lifted off the table by a stomp (they hang, then drop and bounce)
  const pebbles = new Parts(k, { frame: 'puff', sheet: { key: pebKey, n: 6, half: 8 }, into: partC, max: 40 });

  // ——— the ferns thrashing in the pull of the tear; frost; the light
  const fernsR = new Swing(k.pivot(k.sprite('fernsR'), FERNS_R.x, FERNS_R.y), { k: 10, c: 1.4, idle: 0.05, seed: 3, speed: 1.3 });
  const crownS = new Swing(k.pivot(k.sprite('crown'), FERN_TOP[0], FERN_TOP[1]), { k: 5, c: 0.8, idle: 0.03, seed: 7, speed: 1.1 });
  const frostL = k.sprite('frostL');
  const frostR = k.sprite('frostR');
  const frostC = k.sprite('frostCope');
  const flood = k.wash(0xffb060, 0, ADD, top);
  const dawnGlow = k.glow(SUNC.x, HOR, 1100, 0xffc070, 0, { into: top, sy: 0.45 });
  const seam = k.glow(TC[0], TC[1], 260, 0xffffff, 0, { into: top, sy: 1.6 });
  seam.setRotation(TEAR.rot);

  // ——— the fight's phases
  const setPhase = (n: number) => {
    if (n === phase) return;
    phase = Math.max(1, Math.min(5, n));
    phaseT = 0;
    // a burst of stars as the tear tears further
    if (phase <= 4) for (let i = 0; i < 26; i++) pourStar(1);
    for (const f of floaters) f.oy.v -= 60 * calm();
  };
  const beat = () => {
    if (beaten) return;
    beaten = true;
    beatenT = 0;
    for (const f of floaters) {
      f.vy = -60 - crand() * 90;
      f.fy = 0;
    }
    for (let i = 0; i < 30; i++) pourStar(1.5);
  };
  const unbeat = () => {
    beaten = false;
    dawnK = 0;
    sealK = 0;
    for (const f of floaters) {
      f.vy = 0;
      f.fy = 0;
      f.oy.x = -260;
    }
    for (const j of jars) j.landed = false;
  };
  const ev = sc.events;
  const onPhase = (n: number) => setPhase(n);
  const onHole = (x: number, y: number) => {
    hole = { x, y };
  };
  const onHoleShut = () => {
    hole = null;
  };
  const onBeaten = () => beat();
  ev.on('soleunbound-phase', onPhase);
  ev.on('soleunbound-hole', onHole);
  ev.on('soleunbound-hole-closed', onHoleShut);
  ev.on('soleunbound-beaten', onBeaten);
  const unlisten = () => {
    ev.off('soleunbound-phase', onPhase);
    ev.off('soleunbound-hole', onHole);
    ev.off('soleunbound-hole-closed', onHoleShut);
    ev.off('soleunbound-beaten', onBeaten);
    ev.off(Phaser.Scenes.Events.SHUTDOWN, unlisten);
  };
  ev.once(Phaser.Scenes.Events.SHUTDOWN, unlisten);

  return {
    // (the listeners go with the layer too, when another place takes over without the scene ending)
    destroy: unlisten,
    setWave(w) {
      // (on the stages page the wave buttons stand in for his phases; in the fight the brain says)
      if (inFight) return;
      if (beaten) unbeat();
      setPhase(w);
    },
    impact(x, _y, p) {
      if (p <= 0.02) return;
      // the oven: the fire flares, embers burst out of the mouth and the smoke hole
      boost.v += 2 + p * 5;
      for (let i = 0; i < 10 + p * 26; i++) ember(false, p);
      for (let i = 0; i < 4 + p * 10; i++) ember(true, p);
      ovenFlash = Math.min(1, ovenFlash + p);
      // what floats jolts (the nearer, the more)
      for (const f of floaters) {
        const near = 1 / (1 + Math.abs(f.hx - x) / 900);
        f.oy.v += (crand() * 0.6 + 0.4) * p * 260 * near * calm();
        f.ox.v += (crand() - 0.5) * p * 120 * near * calm();
        f.or.v += (crand() - 0.5) * p * 5 * near * calm();
        f.flare = Math.min(1, f.flare + p * near * 1.4);
        for (let i = 0; i < 2 + p * 4; i++) crumbs.spawn({ x: f.img.x + (crand() - 0.5) * 40 * f.s, y: f.img.y + CHUNK.h * f.s * 0.3, vx: (crand() - 0.5) * 50, vy: 20, life: 1.4, r0: 2.4 + crand() * 2.6, a: 1, tint: 0xffffff, grav: 300, spin: (crand() - 0.5) * 6, fade: 0.02 });
      }
      for (const j of jars) {
        j.oy.v += p * (60 + crand() * 50) * calm();
        j.or.v += (crand() - 0.5) * p * 2.4 * calm();
      }
      // pebbles lift off the table round the blow, hang in his power, then drop and bounce
      for (let i = 0; i < 6 + p * 12; i++) {
        const px = x + (crand() - 0.5) * 420;
        const py = TY + 8 + crand() * 60;
        pebbles.spawn({ x: px, y: py, vx: (crand() - 0.5) * 40, vy: -(90 + crand() * 160) * p, life: 2.4 + crand(), r0: 3.5 + crand() * 4, a: 1, tint: 0xffffff, grav: 90, drag: 1.4, floor: py + 2, bounce: 0.35, spin: (crand() - 0.5) * 4, fade: 0.02 });
      }
      fernsR.kick((crand() - 0.3) * p * 0.6);
      crownS.kick((crand() - 0.5) * p * 0.25);
      // (on the stages page, with no fight to hear, the biggest blow in the Last Slice plays his fall)
      if (!inFight && p >= 0.95 && phase === 5 && !beaten) beat();
    },
    update(dt, t) {
      const cm = calm();
      phaseT += dt;
      if (beaten) beatenT += dt;
      if (!inFight && beaten && beatenT > 10) unbeat();
      // ——— where each part of the place is heading
      let wT = WIDEN[phase];
      if (phase === 5) wT = Math.max(0.4, 0.8 - phaseT * 0.035);
      if (beaten) wT = 0;
      const ease = Math.min(1, dt * (beaten ? 2.2 : 0.9));
      widen += (wT - widen) * ease;
      erupt += ((beaten ? 0.15 : [0, 0.65, 1.15, 0.75, 0.85, 0.95][phase]) - erupt) * Math.min(1, dt * 0.8);
      frostK += ((phase === 2 && !beaten ? 1 : 0) - frostK) * Math.min(1, dt * (phase === 2 ? 0.28 : 0.5));
      stoneK += ((phase === 3 && !beaten ? 1 : 0) - stoneK) * Math.min(1, dt * 0.9);
      strainK += ((phase === 5 && !beaten ? 1 : 0) - strainK) * Math.min(1, dt * 0.7);
      dawnK += ((beaten ? 1 : 0) - dawnK) * Math.min(1, dt * (beaten ? 0.7 : 2));
      sealK = beaten ? Math.max(0, 1 - Math.abs(beatenT - 0.7) / 0.7) : 0;
      // the black hole: where things are dragged (on the stages page, one wanders over the wall)
      const pull = phase === 4 && !beaten ? (hole ?? (inFight ? null : { x: 960 + Math.sin(t * 0.25) * 340, y: 520 })) : null;

      // ——— the tear
      const breath = 1 + 0.015 * Math.sin(t * 1.3) + (phase === 5 ? 0.02 * Math.sin(t * 7.5) : 0);
      const w = Math.max(0.002, widen * breath);
      voidImg.setScale(w, 1).setAlpha(clamp01(widen * 8));
      bloom.setScale((w / BR) * 1.05, 1 / BR).setAlpha(clamp01(widen * 5) * (0.85 + 0.15 * Math.sin(t * 0.9)));
      swirl.step(dt * cm);
      swirl.each((im) => im.setScale(w / SR, 1 / SR));
      swirl.alpha = clamp01(widen * 6) * 0.9;
      if (Math.abs(w - lipsW) > 0.003) {
        drawLips(w);
        lipsW = w;
      }
      lips.setAlpha(clamp01(widen * 10) * (0.85 + 0.15 * flicker(t * 0.5, 4)) + sealK);
      lipsShade.setAlpha(clamp01(widen * 10));
      for (const s of voidStars) {
        const [x, y] = toScreen(s.u * hwAt(s.t) * w, -s.t * TEAR.L);
        s.img.setPosition(x, y).setScale(s.s).setAlpha(clamp01(widen * 4) * (0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph))));
      }
      skyGlow.setAlpha((0.05 + widen * 0.12) * (1 - dawnK));
      pourRate.tick((10 + widen * 30) * cm * (beaten ? 0 : 1), dt, () => pourStar());
      pour.update(dt);
      seam.setAlpha(sealK * 0.7).setScale((260 * 2) / 256 * 0.25, (260 * 2 * 1.6) / 256);

      // ——— the sun: frozen; straining in the Last Slice; breaking free when he falls
      const rise = beaten ? clamp01(beatenT / 3) ** 0.7 : strainK * (0.12 + 0.06 * Math.sin(t * 9) + 0.05 * Math.sin(t * 13.7));
      sun.show(Math.min(4.999, rise * 5));
      sunGlow.setAlpha(0.3 + strainK * 0.25 * (0.6 + 0.4 * Math.sin(t * 6)) + dawnK * 0.5).setScale((320 + dawnK * 500) / 256, ((320 + dawnK * 500) / 256) * 0.3);
      rays.forEach((ry, i) => {
        const a = -Math.PI / 2 + (i / (rays.length - 1) - 0.5) * 2.2;
        const len = 300 + strainK * 260 * (0.7 + 0.3 * Math.sin(t * 3 + i)) + dawnK * 700;
        ry.setRotation(a + Math.PI / 2 + Math.sin(t * 0.7 + i) * 0.03).setScale(0.09, len / 128).setAlpha((strainK * 0.16 + dawnK * 0.22) * (0.6 + 0.4 * flicker(t * 0.4, i)));
      });

      // ——— the eruption
      const e = erupt;
      plume.step(dt * cm * (0.7 + e * 0.5));
      plume.each((im) => im.setAlpha(clamp01(0.6 + e * 0.4)).setTint(lerpCol(0xffffff, 0xffe8d8, dawnK)));
      fountain.step(dt * cm, 0.8 + e * 0.4);
      fountain.alpha = clamp01(e * 1.1);
      crater.setAlpha((0.3 + e * 0.25) * (0.85 + 0.15 * flicker(t * 0.5, 1)));
      vent.setAlpha((0.35 + e * 0.3) * flicker(t, 2));
      plumeLit.setAlpha(0.12 + e * 0.15);
      for (const [i, g] of flowGlows.entries()) g.setAlpha((0.08 + e * 0.08) * (0.85 + 0.15 * Math.sin(t * 0.8 + i * 2)));
      bombRate.tick(e * e * 5 * cm, dt, () => bomb());
      skyRed.setAlpha(0.06 + e * 0.12 * (0.85 + 0.15 * flicker(t * 0.3, 5)));
      bombs.update(dt);

      // ——— the ribbon (it falls back into the river when he's beaten)
      const ribA = beaten ? clamp01(1 - beatenT / 1.6) : 1;
      ribbon.step(dt * cm);
      ribbon.alpha = ribA;
      ribFoot.setAlpha((0.2 + 0.08 * Math.sin(t * 2)) * ribA);
      dropRate.tick(7 * cm * ribA, dt, () => {
        const s = crand() < 0.4 ? crand() * 0.08 : 0.1 + crand() * 0.75;
        const [x, y] = ribAt(s);
        drops.spawn({ x: x + (crand() - 0.5) * 10, y, vx: (crand() - 0.5) * 20, vy: -20 - crand() * 30, life: 1.4 + crand(), r0: 2.2, r1: 1, a: 0.8, tint: 0xe0d8ff, grav: -30, drag: 0.3, streak: 0.02, fade: 0.1 });
      });
      if (beaten && beatenT < 1.2) dropRate.tick(30 * cm, dt, () => {
        const [x, y] = ribAt(crand() * 0.8);
        drops.spawn({ x, y, vx: (crand() - 0.5) * 30, vy: 20, life: 1.2, r0: 2.4, r1: 1, a: 0.85, tint: 0xe0d8ff, grav: 300, streak: 0.02, fade: 0.05, floor: 384 });
      });
      drops.update(dt);

      // ——— the standing stones
      const pulse = phase === 5 ? Math.max(0, Math.sin(t * 7.6)) ** 6 : 0.5 + 0.5 * Math.sin(t * 1.4);
      for (const g of stoneGlows) {
        const k2 = (1 - dawnK) * (1 - stoneK * 0.6) * (0.7 + 0.3 * pulse) * (0.9 + 0.1 * flicker(t * 0.3, g.seed));
        g.aura.setAlpha(0.16 * k2 * (pull ? 1.4 : 1));
        g.core.setAlpha(0.32 * k2);
      }

      // ——— the oven
      const b = boost.step(0, dt);
      const fk = (1.15 - dawnK * 0.3) * (1 + Math.max(0, b) * 0.4);
      fire.alpha = Math.min(1, fk);
      fire.step(dt, 1.1 + Math.max(0, b) * 0.6);
      coals.setAlpha((0.42 + 0.1 * Math.sin(t * 1.3) + 0.06 * Math.sin(t * 3.7)) * fk);
      ovenFlash = Math.max(0, ovenFlash - dt * 2.5);
      for (const l of ovenGlows) l.img.setAlpha(l.a * flicker(t, l.seed) * fk * (1 + ovenFlash * 1.5));
      holeGlow.setAlpha((0.24 + 0.08 * flicker(t * 0.7, 9)) * fk);
      smoke.step(dt * cm);
      emberRate.tick((4 + erupt * 2) * cm * (1 - dawnK * 0.6), dt, () => ember(false));
      holeRate.tick(4 * cm * (1 - dawnK * 0.6), dt, () => ember(true));
      embers.update(dt);

      // ——— what floats
      for (const f of floaters) {
        let tx = 0;
        let ty = 0;
        if (stoneK > 0.01) ty += 24 * stoneK;
        if (pull) {
          // dragged towards the hole, but held above the wall of peels
          const dx = pull.x - f.hx;
          tx = Math.max(-300, Math.min(300, dx * 0.4));
          const maxY = 404 - CHUNK.h * f.s * 0.45;
          ty = Math.min(maxY - f.hy, Math.max(0, (maxY - f.hy) * 0.7));
        }
        const ox = f.ox.step(tx, dt);
        const oy = f.oy.step(ty, dt);
        const spin = pull ? Math.sin(t * 2 + f.seed) * 0.35 + (pull.x - f.hx) * 0.0004 : 0;
        const orr = f.or.step(spin, dt);
        const heavy = 1 - stoneK * 0.8;
        const bob = (Math.sin(t * 0.9 + f.seed) * 6 + wander(t * 0.3, f.seed) * 3) * heavy * cm;
        let x = f.hx + ox + wander(t * 0.2, f.seed + 4) * 4 * heavy * cm;
        let y = f.hy + oy + bob;
        if (phase === 5 && !beaten) {
          x += Math.sin(t * 31 + f.seed) * 0.8;
          y += Math.sin(t * 27 + f.seed * 2) * 0.8;
        }
        let a = 1;
        if (beaten) {
          f.vy += 340 * dt;
          f.fy += f.vy * dt;
          y += f.fy;
          a = clamp01(1 - (y - 360) / 80);
        }
        const rot = f.rot0 + orr + Math.sin(t * 0.6 + f.seed) * 0.05 * heavy;
        f.img.setPosition(x, y).setRotation(rot).setAlpha(a * (1 - stoneK));
        f.stoneImg.setPosition(x, y).setRotation(rot).setAlpha(a * stoneK);
        f.flare = Math.max(0, f.flare - dt * 1.5);
        f.glow.setPosition(x, y + CHUNK.h * f.s * 0.34).setAlpha(a * (0.2 + 0.06 * Math.sin(t * 2.1 + f.seed) + f.flare * 0.4) * (1 - stoneK) * (1 - dawnK));
      }
      crumbRate.tick(1.6 * cm * (1 - stoneK * 0.7) * (beaten ? 0 : 1), dt, () => {
        const f = floaters[Math.floor(crand() * floaters.length)];
        crumbs.spawn({ x: f.img.x + (crand() - 0.5) * 40 * f.s, y: f.img.y + CHUNK.h * f.s * 0.35, vx: (crand() - 0.5) * 10, vy: 10, life: 1.2, r0: 1.4 + crand() * 1.6, a: 1, tint: stoneK > 0.5 ? 0x9a9a9a : 0xffffff, grav: 260, spin: (crand() - 0.5) * 6, fade: 0.02 });
      });
      crumbs.update(dt);
      for (const [ji, j] of jars.entries()) {
        let ty = stoneK * 10;
        let tr = 0;
        let tx = 0;
        if (pull) {
          tr = Math.sign(pull.x - j.img.x) * 0.16;
          tx = Math.sign(pull.x - j.img.x) * 14;
        }
        if (beaten) ty = j.lift;
        const oy = j.oy.step(ty, dt);
        const ox = j.ox.step(tx, dt);
        const or = j.or.step(tr, dt);
        const heavy = beaten ? 0 : 1 - stoneK * 0.8;
        let y = JAR_FOOT - j.lift + oy + Math.sin(t * 1.1 + j.seed) * 4 * heavy * cm;
        if (beaten && y > JAR_FOOT) {
          // landed: a bounce on the ground
          y = JAR_FOOT;
          if (!j.landed) {
            j.landed = true;
            j.oy.v = -Math.abs(j.oy.v) * 0.3;
            for (let i = 0; i < 4; i++) crumbs.spawn({ x: j.img.x + (crand() - 0.5) * 40, y: JAR_FOOT - 2, vx: (crand() - 0.5) * 60, vy: -40 - crand() * 40, life: 0.8, r0: 1.6, a: 1, tint: 0xb0a090, grav: 400, floor: JAR_FOOT + 2, bounce: 0.3, fade: 0.02 });
          }
        }
        j.img.setPosition(JARS[ji].x + ox, y).setRotation(or + Math.sin(t * 0.8 + j.seed) * 0.03 * heavy);
        j.img.setTint(stoneK > 0.01 ? lerpCol(0xffffff, 0xa8a4a0, stoneK) : 0xffffff);
        j.glow.setPosition(j.img.x, JAR_FOOT - j.lift + 6 + oy).setAlpha((0.16 + 0.06 * Math.sin(t * 2 + j.seed)) * (1 - stoneK) * (1 - dawnK));
      }
      pebbles.update(dt);

      // ——— frost creeping in from both ends (FROST AND FIRE), and going
      const cw = (img: Img, k2: number, fromRight: boolean) => {
        const fw = img.frame.width;
        const fh = img.frame.height;
        const cut = Math.max(1, fw * clamp01(k2 * 1.15));
        img.setCrop(fromRight ? fw - cut : 0, 0, cut, fh).setAlpha(clamp01(k2 * 3) * 0.95);
      };
      cw(frostL, frostK, false);
      cw(frostR, frostK, true);
      frostC.setAlpha(clamp01(frostK * 1.5 - 0.3) * 0.9);

      // ——— the ferns in the pull
      fernsR.update(dt, t);
      crownS.update(dt, t);

      // ——— the dawn when he falls
      flood.setAlpha(dawnK * 0.2);
      dawnGlow.setAlpha(dawnK * 0.4);
    },
  };
});
