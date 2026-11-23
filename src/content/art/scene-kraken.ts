// The Shipwreck (Kraken Toes' arena, wave 45), redrawn with the location kit (src/art/scene): the end of the Pier
// stage's storm. Out on the reef under the headland (the same northern sea and coast as scene-pier.ts, the lighthouse
// nearer now) a wrecked ship lies hard aground, and the Kraken has her. We stand on her wet deck at nightfall: the
// bulwark (backlit by the last cold-yellow break low on the left, its inboard face in shade) is stove in amidships,
// the slate sea breaking white on the reef's rocks beyond; the mainmast, snapped off high, its shrouds still set up to
// the rail, with a great purple tentacle that came over the side wound twice round it; a ship's lantern hung on the
// mast, still burning; a second arm hauled over the rail on the right, its tip curled on the deck by the treasure
// chest it guards (the lid thrown back against the bulwark, a heap of gold, a string of pearls, coins spilled on the
// deck). The table is her deck planking, a coil of rope and a few stray coins on it.
//
// Live, the heroes:
// - the arm on the mast: its free end (painted frames) probes and coils in the air, a slow wave running down it and
//   the tip curling tight and opening; a stomp makes it lash (it plays fast and jerks on its root) and squeeze;
// - the sea: swells rolling in, surf bursting on the reef's rocks (painted frames), sheets of spray thrown up behind
//   the bulwark when a sea strikes the hull (painted frames, drops flung over onto the deck, mist blown off), a stomp
//   slamming one up nearest it; far out, now and then, the Kraken's other arms rise out of the sea and sink again
//   (painted frames: a tentacle breaking the surface in a ring of foam, curling, and slipping back under in spray);
// - the storm: rain in two depths with splashes on the deck and the table, lightning over the far sea (the gold
//   flaring in the flash), the lighthouse lit and its beam sweeping round; the lantern swinging on its hook with its
//   flame flickering (painted flame frames) and its light moving with it.

import Phaser from 'phaser';
import {
  type Air,
  type Ctx,
  type PathFn,
  type R,
  TY,
  W,
  calmLanes,
  bounce,
  castShadow,
  crevice,
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
import { aoHalo } from '../../art/scene/light';
import { planksPlane, tableFalloff, tableSeam, water } from '../../art/scene/materials';
import { drift, grime, lay, noiseMask, softly, streaks, surface } from '../../art/scene/paint';
import { hang } from '../../art/scene/props';
import { cloud, skyFill } from '../../art/scene/sky';
import { LIGHT } from '../../art/style/kit';
import { MATS_F } from '../../art/style/materials-acts-f';
import { makeCanvas, rgba, shade } from '../../art/util';
import { xAt, ZB } from '../../art/backdrops';
import { crand } from '../../systems/cosmeticRandom';
import { Loop, Parts, Rate, Spring, Swing, flameFrame, sheet } from '../../game/sceneAnim';
import { type KitLive, calm, flicker, registerKitScene } from '../../game/sceneLive';
import { beamTex, boltFrame, farLeft, glitter, headland, rainTile, surfFrame, swellStrip } from './scene-pier';

// ——— layout ———

export const KR = {
  /** The sea's horizon (the Pier's). */
  hz: 404,
  /** The bulwark: the cap rail's top face, its underside, and the waterway at its foot (the deck's edge). */
  cap: 566,
  capLow: 584,
  foot: 718,
  /** The deck between the bulwark and the table. */
  deck: 744,
  /** Where the bulwark's stove in. */
  gap: { x0: 848, x1: 1084 },
  /** The timberheads (the frames standing up through the cap rail). */
  heads: [70, 560, 780, 1160, 1420, 1880],
  mast: { x: 250, top: 112, base: 744, r: 26 },
  /** The lantern's hook on the mast's iron bracket, and the drop from the hook to the flame. */
  lantern: { x: 318, y: 384, flame: 46 },
  chest: { x: 1640, base: 750 },
  /** The lighthouse's lantern (the Pier's headland drawn 1.25× nearer). */
  lh: { x: 1655, y: 266 },
  /** The last of the light: a break low in the cloud on the left. */
  brk: { x: 380, y: 392 },
  front: 1040,
};

const P2 = Math.PI * 2;
const HZ = KR.hz;
const STORM_AIR: Air = { color: '#5a6272', far: 0.7 };
/** The Kraken's skin (Kraken Toes' purple, darkened by the dusk) and the pale pink of its suckers. */
const SKIN = '#58405f';
const BELLY = '#9c7c8e';
const CUP = '#2a1a28';
const T_INK = '#1a1220';
const WOOD = '#4a3e34';
const WOOD_INK = '#160e0a';
const IRON = '#2c2826';
const NEAR = 1.25;

// ——— a tentacle ———

type Pt = [number, number];

/** A spine walked from (x, y) at angle ang for len px, turning by curv(u) radians per px as it goes (u 0 … 1). */
function spineFrom(x: number, y: number, ang: number, len: number, curv: (u: number) => number, step = 3): Pt[] {
  const pts: Pt[] = [[x, y]];
  const n = Math.max(2, Math.ceil(len / step));
  const s = len / n;
  let a = ang;
  for (let i = 1; i <= n; i++) {
    a += curv(i / n) * s;
    x += Math.cos(a) * s;
    y += Math.sin(a) * s;
    pts.push([x, y]);
  }
  return pts;
}

/** Points along a cubic Bézier. */
function bez(p0: Pt, p1: Pt, p2: Pt, p3: Pt, n: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = (1 - t) ** 3;
    const b = 3 * (1 - t) ** 2 * t;
    const c = 3 * (1 - t) * t * t;
    const d = t ** 3;
    out.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]);
  }
  return out;
}

interface Tube {
  p: Pt[];
  /** Unit normals (left of the direction of travel). */
  n: Pt[];
  /** Widths, arc length, and how much each point's normal faces the light (−1 … 1). */
  w: number[];
  s: number[];
  d: number[];
  len: number;
}

const LT: Pt = (() => {
  const [x, y] = LIGHT.dir;
  const l = Math.hypot(x, y);
  return [x / l, y / l];
})();

function tubeOf(pts: Pt[], width: (u: number) => number): Tube {
  const s = [0];
  for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const len = s[s.length - 1] || 1;
  const n: Pt[] = [];
  const d: number[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const tx = b[0] - a[0];
    const ty = b[1] - a[1];
    const l = Math.hypot(tx, ty) || 1;
    const nx = -ty / l;
    const ny = tx / l;
    n.push([nx, ny]);
    d.push(Math.max(-1, Math.min(1, (nx * LT[0] + ny * LT[1]) * 1.7)));
  }
  return { p: pts, n, w: s.map((v) => width(v / len)), s, d, len };
}

/** A point at k half-widths off the spine (signed along the normal). */
const off = (t: Tube, i: number, k: number): Pt => [t.p[i][0] + t.n[i][0] * t.w[i] * 0.5 * k, t.p[i][1] + t.n[i][1] * t.w[i] * 0.5 * k];

/** A band between two offsets (functions of the point) along the whole tube (or points i0 … i1). */
function band(c: Ctx, t: Tube, k0: (i: number) => number, k1: (i: number) => number, i0 = 0, i1 = t.p.length - 1): void {
  c.beginPath();
  for (let i = i0; i <= i1; i++) {
    const [x, y] = off(t, i, k1(i));
    if (i === i0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  for (let i = i1; i >= i0; i--) {
    const [x, y] = off(t, i, k0(i));
    c.lineTo(x, y);
  }
  c.closePath();
}

/** The tube's silhouette (points i0 … i1, the tip rounded off), grown by `grow` px each side. */
function tubePath(t: Tube, i0 = 0, i1 = t.p.length - 1, grow = 0, fresh = true): PathFn {
  return (c) => {
    if (fresh) c.beginPath();
    for (let i = i0; i <= i1; i++) {
      const k = 1 + grow / Math.max(1, t.w[i] * 0.5);
      const [x, y] = off(t, i, k);
      if (i === i0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    for (let i = i1; i >= i0; i--) {
      const k = 1 + grow / Math.max(1, t.w[i] * 0.5);
      const [x, y] = off(t, i, -k);
      c.lineTo(x, y);
    }
    c.closePath();
  };
}

/** The tube (points i0 … i1, grown by `grow` px) as a run of quads all wound the same way, added to the current
 * path: a clip that can't cancel itself where the tube bends hard. */
function tubeQuads(c: Ctx, t: Tube, i0: number, i1: number, grow: number): void {
  for (let i = i0; i < i1; i++) {
    const k0 = 1 + grow / Math.max(1, t.w[i] * 0.5);
    const k1 = 1 + grow / Math.max(1, t.w[i + 1] * 0.5);
    const q: Pt[] = [off(t, i, k0), off(t, i + 1, k1), off(t, i + 1, -k1), off(t, i, -k0)];
    let area = 0;
    for (let j = 0; j < 4; j++) area += q[j][0] * q[(j + 1) % 4][1] - q[(j + 1) % 4][0] * q[j][1];
    if (area < 0) q.reverse();
    c.moveTo(q[0][0], q[0][1]);
    for (let j = 1; j < 4; j++) c.lineTo(q[j][0], q[j][1]);
    c.closePath();
  }
}

interface TentLook {
  skin: string;
  belly: string;
  cup: string;
  ink: string;
  /** Which side the suckers run down (+1 the normal's side, −1 the other). */
  side: 1 | -1;
  line: number;
  seed: number;
  /** 0 near … 1 far (a far arm is a silhouette in the air). */
  depth?: number;
  /** Wet sheen strength. */
  sheen?: number;
  /** The rim of light along the far edge. */
  rimA?: number;
  /** Suckers smaller than this (px) aren't drawn. */
  minSucker?: number;
}

const NEAR_LOOK: TentLook = { skin: SKIN, belly: BELLY, cup: CUP, ink: T_INK, side: 1, line: 1.7, seed: 1, sheen: 1, rimA: 0.3, minSucker: 1.3 };

/** Deterministic per-point noise (so a tube paints the same every time, the clip trick below relies on it). */
const hash = (i: number, s: number): number => {
  const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * A tentacle: a muscular tapering tube, lit by the one light (a lit flank, a shaded flank, a cool rim), wet (a broken
 * sheen running along it), mottled with darker chromatophores along its back, the pale underside down one edge
 * carrying the suckers: lit rims with dark cups, standing proud of the silhouette, smaller towards the tip.
 */
function tentacle(c: Ctx, t: Tube, o: TentLook): void {
  const N = t.p.length - 1;
  const path = tubePath(t);
  const sd = o.side;
  const sheen = o.sheen ?? 1;
  c.save();
  path(c);
  c.clip();
  // the skin: a flat base, the belly's pale band down one side, a crease between them
  path(c);
  c.fillStyle = o.skin;
  c.fill();
  band(c, t, () => sd * 0.3, () => sd * 1.1);
  c.fillStyle = rgba(o.belly, 0.9);
  c.fill();
  band(c, t, () => sd * 0.22, () => sd * 0.42);
  c.fillStyle = rgba(o.ink, 0.18);
  c.fill();
  // chromatophores: darker freckles and blotches along the back
  for (let i = 2; i < N; i += 2) {
    if (hash(i, o.seed) > 0.42) continue;
    const k = -sd * (0.05 + hash(i, o.seed + 1) * 0.75);
    const [x, y] = off(t, i, k);
    const rr = t.w[i] * (0.04 + hash(i, o.seed + 2) * 0.09);
    c.fillStyle = rgba(shade(o.skin, -0.4), 0.45);
    c.beginPath();
    c.ellipse(x, y, rr * 1.5, rr, Math.atan2(t.n[i][0], -t.n[i][1]), 0, P2);
    c.fill();
  }
  // the form: the flank away from the light shaded in steps, the flank towards it lifted
  // the skin's texture: soft blotches of darker and paler colour
  const bx = Math.min(...t.p.map((q) => q[0])) - 40;
  const by = Math.min(...t.p.map((q) => q[1])) - 40;
  const bw = Math.max(...t.p.map((q) => q[0])) - bx + 80;
  const bh = Math.max(...t.p.map((q) => q[1])) - by + 80;
  lay(c, noiseMask(Math.max(6, Math.round(bw / 40)), 211 + o.seed, { cover: 0.4, soft: 0.35, col: shade(o.skin, -0.45), w: 96, h: 96 }), { x: bx, y: by, w: bw, h: bh }, 0.35);
  lay(c, noiseMask(Math.max(6, Math.round(bw / 30)), 213 + o.seed, { cover: 0.3, soft: 0.35, col: shade(o.skin, 0.3), w: 96, h: 96 }), { x: bx, y: by, w: bw, h: bh }, 0.2);
  // the form: the flank away from the light shaded in steps down to a core shadow, the reflected light at its edge
  for (let k = 0; k < 7; k++) {
    band(c, t, (i) => -t.d[i] * (0.9 - (k + 1) * 0.2), (i) => -t.d[i] * 1.2 - 0.0001);
    c.fillStyle = rgba(shade(o.skin, -0.7), 0.13);
    c.fill();
  }
  band(c, t, (i) => -t.d[i] * 0.86, (i) => -t.d[i] * 1.2 - 0.0001);
  c.fillStyle = rgba('#8a9ac8', 0.12);
  c.fill();
  for (let k = 0; k < 4; k++) {
    band(c, t, (i) => t.d[i] * (1 - (k + 1) * 0.2), (i) => t.d[i] * 0.92 + 0.0001);
    c.fillStyle = rgba('#f8e0f4', 0.08);
    c.fill();
  }
  // wet: a broken sheen along the lit flank, a softer one along the belly
  if (sheen > 0) {
    c.lineCap = 'round';
    // (a slow swell of brightness along the arm: pools of wet light on the bulges, gone between them)
    const glossAt = (i: number) => {
      const v = Math.sin(t.s[i] * 0.045 + o.seed) * 0.6 + Math.sin(t.s[i] * 0.017 + o.seed * 2.3) * 0.4;
      return Math.max(0, v) ** 1.4;
    };
    for (let i = 1; i < N; i++) {
      const g = glossAt(i);
      if (g < 0.04 || t.w[i] < 3) continue;
      const a = off(t, i - 1, t.d[i - 1] * 0.5);
      const b = off(t, i, t.d[i] * 0.5);
      c.strokeStyle = rgba('#f4eaf4', 0.5 * sheen * Math.abs(t.d[i]) * g);
      c.lineWidth = Math.max(0.8, t.w[i] * (0.04 + g * 0.12));
      c.beginPath();
      c.moveTo(a[0], a[1]);
      c.lineTo(b[0], b[1]);
      c.stroke();
    }
  }
  c.restore();
  rim(c, path, o.rimA ?? 0.3, Math.max(1.5, Math.min(3, t.w[0] * 0.06)), '#9ab4e0');
  // one outline
  path(c);
  c.lineJoin = 'round';
  c.strokeStyle = o.ink;
  c.lineWidth = o.line;
  c.stroke();
  // the suckers, standing proud of the belly's edge, smaller and closer towards the tip
  let next = 0;
  const minR = o.minSucker ?? 2;
  let row = 0;
  for (let i = 1; i < N; i++) {
    if (t.s[i] < next) continue;
    const v = hash(i, o.seed + 9);
    const rad = t.w[i] * (0.13 + v * 0.04);
    if (rad < minR) break;
    // two staggered rows while the arm is thick (the inner row half hidden in the belly), one row towards the tip;
    // squashed more where the belly turns away (the side facing the light shows less of it)
    const inner = t.w[i] > 26 && row++ % 2 === 1;
    const [x, y] = off(t, i, sd * (inner ? 0.62 : 0.88));
    const ang = Math.atan2(-t.n[i][0], t.n[i][1]);
    const turn = 0.45 + 0.4 * (1 - Math.abs(t.d[i])) + v * 0.15;
    sucker(c, x, y, rad * (inner ? 0.85 : 1), ang, o, turn);
    next = t.s[i] + rad * (inner ? 1.3 : 2.1);
  }
}

/** One sucker, seen half from the side: a lit muscular rim round a dark cup, a glint on its lip. */
function sucker(c: Ctx, x: number, y: number, rad: number, ang: number, o: TentLook, sq = 0.72): void {
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  const ry = rad * sq;
  // its shadow on the arm
  c.fillStyle = rgba(o.ink, 0.25);
  c.beginPath();
  c.ellipse(rad * 0.2, ry * 0.4, rad, ry, 0, 0, P2);
  c.fill();
  const g = c.createRadialGradient(-rad * 0.35, -ry * 0.5, rad * 0.1, 0, 0, rad);
  g.addColorStop(0, shade(o.belly, 0.18));
  g.addColorStop(0.7, o.belly);
  g.addColorStop(1, shade(o.belly, -0.35));
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(0, 0, rad, ry, 0, 0, P2);
  c.fill();
  c.strokeStyle = rgba(o.ink, 0.65);
  c.lineWidth = Math.max(0.6, Math.min(1.2, rad * 0.12));
  c.stroke();
  // the cup, its far wall lit
  const cg = c.createRadialGradient(rad * 0.15, ry * 0.15, 0, rad * 0.06, ry * 0.05, rad * 0.46);
  cg.addColorStop(0, o.cup);
  cg.addColorStop(1, shade(o.belly, -0.3));
  c.fillStyle = cg;
  c.beginPath();
  c.ellipse(rad * 0.06, ry * 0.05, rad * 0.42, ry * 0.42, 0, 0, P2);
  c.fill();
  c.strokeStyle = rgba(shade(o.belly, 0.08), 0.5);
  c.lineWidth = Math.max(0.5, rad * 0.08);
  c.beginPath();
  c.ellipse(rad * 0.06, ry * 0.05, rad * 0.42, ry * 0.42, 0, 0.2, Math.PI * 0.9);
  c.stroke();
  c.fillStyle = 'rgba(240,232,240,0.4)';
  c.beginPath();
  c.ellipse(-rad * 0.45, -ry * 0.5, rad * 0.2, ry * 0.14, -0.4, 0, P2);
  c.fill();
  c.restore();
}

// ——— the arm on the mast ———

const MAST = KR.mast;
/** The coil: a helix round the mast (radius CR), climbing from the side it came over the rail to behind the mast. */
const CR = MAST.r + 12;
const COIL_Y0 = 548;
const COIL_PITCH = 118;
const TH0 = -Math.PI / 2;
const TH1 = 3 * Math.PI;
const coilAt = (th: number): Pt => [MAST.x + CR * Math.sin(th), COIL_Y0 - (COIL_PITCH * (th - TH0)) / P2 + CR * 0.3 * Math.cos(th)];
/** Where the coil ends behind the mast and the free arm begins. */
const ARM_BASE = coilAt(TH1);

/** The arm round the mast: from over the rail on the left, two turns up the mast, ending behind it. */
function mastCoilTube(): { t: Tube; front: [number, number][] } {
  const lead = bez([-70, 492], [10, 520], [120, 548], [MAST.x - CR, coilAt(TH0)[1]], 40);
  const nh = 160;
  const helix: Pt[] = [];
  for (let i = 1; i <= nh; i++) helix.push(coilAt(TH0 + ((TH1 - TH0) * i) / nh));
  const pts = [...lead, ...helix];
  const t = tubeOf(pts, (u) => 60 - 24 * u);
  // where it grips: drawn in tight at the mast's edges, the muscle bulging out in front between them
  for (let i = 41; i < pts.length; i++) {
    const th = TH0 + ((TH1 - TH0) * (i - 40)) / nh;
    t.w[i] *= 0.9 + 0.16 * Math.max(0, Math.cos(th)) ** 1.5;
  }
  // the runs in front of the mast (the lead-in counts: it's on the near side)
  const front: [number, number][] = [];
  let start = -1;
  for (let i = 0; i < pts.length; i++) {
    const th = i <= 40 ? 0 : TH0 + ((TH1 - TH0) * (i - 40)) / nh;
    const isFront = Math.cos(th) > -0.02;
    if (isFront && start < 0) start = i;
    if (!isFront && start >= 0) {
      front.push([start, i]);
      start = -1;
    }
  }
  if (start >= 0) front.push([start, pts.length - 1]);
  return { t, front };
}

/** The free arm's spine at a phase of its idle loop (phase 0 … 1), from its root behind the mast. */
const ARM_LEN = 260;
function armTube(x: number, y: number, ph: number): Tube {
  const tipK = 6 + 3 * Math.sin(ph * P2);
  const curv = (u: number) => {
    // it rises (turning right from pointing left-up), then the tip curls back on itself
    const rise = u < 0.45 ? 3.4 : 0;
    const tip = u > 0.5 ? -(tipK / 0.2) * ((u - 0.5) / 0.5) ** 1.5 : 0;
    const wave = 3.4 * Math.sin(ph * P2 - u * 6.5) * (0.3 + u);
    return (rise + tip + wave) / ARM_LEN;
  };
  const a0 = Math.atan2(-22, -CR);
  return tubeOf(spineFrom(x, y, a0, ARM_LEN, curv, 3), (u) => Math.max(3.2, 38 * (1 - u) ** 0.8));
}

/** The arm's frame box (relative to its root) and its baking resolution. */
const ARM_BOX = { x: -250, y: -330, w: 400, h: 360 };
const ARM_RES = 0.6;
const ARM_N = 10;

function armPaint(c: Ctx, x: number, y: number, ph: number): void {
  tentacle(c, armTube(x, y, ph), { ...NEAR_LOOK, side: -1, seed: 7 });
}

// ——— the sky ———

function sky(ctx: Ctx, r: R): void {
  const box = { x: 0, y: 0, w: W, h: HZ + 4 };
  skyFill(ctx, box, [[0, '#101724'], [0.35, '#1e2738'], [0.68, '#343c4c'], [0.88, '#5c5c60'], [1, '#86786a']]);
  lay(ctx, drift('#3e4a5c', '#080a12', 3, 131, 160, 48), box, 0.32);
  // the break: a slot of cold yellow light under the cloud base, low on the left where the sun went down
  softly(ctx, { x: 0, y: HZ - 120, w: 1200, h: 124 }, (g) => {
    const { x, y } = KR.brk;
    const lg = g.createRadialGradient(x, y, 0, x, y, 600);
    lg.addColorStop(0, 'rgba(246,222,164,0.95)');
    lg.addColorStop(0.35, 'rgba(214,180,130,0.5)');
    lg.addColorStop(1, 'rgba(120,110,110,0)');
    g.save();
    g.translate(x, y);
    g.scale(1, 0.15);
    g.translate(-x, -y);
    g.fillStyle = lg;
    g.fillRect(-300, y - 700, 1600, 1400);
    g.restore();
  }, 0.25);
  glowAt(ctx, KR.brk.x, KR.brk.y, 420, '#f0d8a0', 0.18, 0.4);
  // the low cloud bars across the break, their undersides caught by it
  cloud(ctx, r, 420, 350, 760, 22, { kind: 'stratus', lit: '#e8c898', body: '#3a3c48', shadow: '#1a1c26', sunX: KR.brk.x, sunY: HZ + 30, rim: 0.7, wisp: 0.6, soft: 14, a: 0.75 });
  // rain shafts sweeping the far sea
  // (each curtain built of thin slanting slices, densest in its middle and fading to nothing at both sides)
  for (const [x, w] of [[760, 260], [1180, 200], [1580, 300]] as const) {
    const n = 24;
    for (let k = 0; k < n; k++) {
      const u = (k + 0.5) / n;
      const a = Math.sin(u * Math.PI) ** 1.5 * 0.08;
      const sx = x + u * w;
      const lg = ctx.createLinearGradient(0, 170, 0, HZ);
      lg.addColorStop(0, 'rgba(36,44,58,0)');
      lg.addColorStop(0.45, rgba('#242c3a', a * 2.6));
      lg.addColorStop(1, rgba('#242c3a', a * 1.2));
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.moveTo(sx - w / n, 170);
      ctx.lineTo(sx + w / n, 170);
      ctx.lineTo(sx + w / n - 90, HZ);
      ctx.lineTo(sx - w / n - 90, HZ);
      ctx.closePath();
      ctx.fill();
    }
  }
  softly(ctx, { x: 0, y: HZ - 60, w: 1500, h: 64 }, (g) => {
    const gg = g.createRadialGradient(KR.brk.x, HZ, 0, KR.brk.x, HZ, 900);
    gg.addColorStop(0, 'rgba(200,176,136,0.4)');
    gg.addColorStop(1, 'rgba(200,176,136,0)');
    g.save();
    g.translate(KR.brk.x, HZ);
    g.scale(1, 0.06);
    g.translate(-KR.brk.x, -HZ);
    g.fillStyle = gg;
    g.fillRect(KR.brk.x - 900, HZ - 900, 1800, 1800);
    g.restore();
  }, 0.25);
}

/** The storm's clouds (a moving sprite): dark rolls of nimbostratus, a towering mass on the right, all lit from below
 * on the left by the break. */
function clouds(ctx: Ctx, r: R): void {
  // long rolls of nimbostratus: each a chain of soft lobes thinning out to nothing at both ends, dark in the body,
  // its underside caught by the break low on the left (strongly near it, hardly at all on the right)
  for (let i = 0; i < 6; i++) {
    const cx = 160 + r() * (W - 320);
    const cy = 120 + i * 36 + r() * 18;
    const w = 700 + r() * 600;
    const h = 30 + r() * 22;
    const n = Math.round(w / 34);
    for (let k = 0; k < n; k++) {
      const u = k / (n - 1);
      const taper = Math.sin(u * Math.PI) ** 0.7;
      const x = cx - w / 2 + u * w;
      const y = cy + Math.sin(u * 9 + i) * h * 0.18 - taper * h * 0.25;
      const rx = (30 + r() * 30) * (0.4 + taper);
      const ry = h * (0.35 + taper * 0.65) * (0.8 + r() * 0.4);
      const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
      g.addColorStop(0, rgba('#1a202c', 0.7 * taper + 0.12));
      g.addColorStop(0.6, rgba('#242c3a', 0.3 * taper + 0.05));
      g.addColorStop(1, rgba('#242c3a', 0));
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, ry / rx);
      ctx.translate(-x, -y);
      ctx.fillStyle = g;
      ctx.fillRect(x - rx, y - rx, rx * 2, rx * 2);
      ctx.restore();
      // the lit underside
      const lit = Math.max(0, 1 - Math.abs(x - KR.brk.x) / 900) * taper;
      if (lit > 0.03) {
        const ly = y + ry * 0.55;
        const lg = ctx.createRadialGradient(x, ly, 0, x, ly, rx * 0.8);
        lg.addColorStop(0, rgba('#c8aa80', 0.35 * lit));
        lg.addColorStop(1, rgba('#c8aa80', 0));
        ctx.save();
        ctx.translate(x, ly);
        ctx.scale(1, 0.22);
        ctx.translate(-x, -ly);
        ctx.fillStyle = lg;
        ctx.fillRect(x - rx, ly - rx, rx * 2, rx * 2);
        ctx.restore();
      }
    }
  }
  // the storm cell over the sea on the right: a heaped tower with a defined edge, its top-left faces lit
  cloud(ctx, r, 1240, 240, 760, 190, { lit: '#5a5c68', body: '#1c222e', shadow: '#080a10', sunX: 300, sunY: -300, rim: 0.4, wisp: 0.3, soft: 8, kind: 'cumulus', a: 0.92 });
}

// ——— the far land: the Pier's coast, nearer and at nightfall ———

/** Paint fn onto an offscreen piece, darken it into the dusk, and lay it back. */
function dusk(ctx: Ctx, box: { x: number; y: number; w: number; h: number }, col: string, a: number, fn: (g: Ctx) => void): void {
  const [cv, g] = makeCanvas(box.w, box.h);
  g.translate(-box.x, -box.y);
  fn(g);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = rgba(col, a);
  g.fillRect(0, 0, box.w, box.h);
  // the break's light along the tops
  const lg = g.createLinearGradient(0, 0, 0, box.h);
  lg.addColorStop(0, 'rgba(232,206,160,0.12)');
  lg.addColorStop(0.4, 'rgba(232,206,160,0)');
  g.fillStyle = lg;
  g.fillRect(0, 0, box.w, box.h);
  ctx.drawImage(cv, box.x, box.y);
}

const HEAD_BOX = { x: 1500, y: 214, w: W - 1500, h: HZ - 214 };
const LEFT_BOX = { x: 0, y: HZ - 50, w: 600, h: 50 };

function farCoast(ctx: Ctx, r: R): void {
  dusk(ctx, LEFT_BOX, '#2a3040', 0.55, (g) => farLeft(g, r));
}

function nearHeadland(ctx: Ctx, r: R): void {
  dusk(ctx, HEAD_BOX, '#1c2232', 0.48, (g) => {
    g.translate(W, HZ);
    g.scale(NEAR, NEAR);
    g.translate(-W, -HZ);
    headland(g, r);
  });
  // the lighthouse lit (the live layer adds its beam)
  glowAt(ctx, KR.lh.x, KR.lh.y, 40, '#fff0c0', 0.5);
  ctx.fillStyle = '#fff4d0';
  ctx.fillRect(KR.lh.x - 6, KR.lh.y - 7, 12, 13);
}

// ——— the sea ———

const ROCKS = [
  { x: 520, y: 470, w: 150, h: 26 },
  { x: 650, y: 486, w: 70, h: 14 },
  { x: 1300, y: 452, w: 110, h: 22 },
  { x: 1440, y: 494, w: 170, h: 30 },
];

function sea(ctx: Ctx, r: R): void {
  water(ctx, r, 0, W, HZ, KR.deck + 4, {
    far: '#646c70', deep: '#26343e', near: '#0e1a22', sky: '#a8a090', skyA: 0.35,
    ripple: '#b8c4c8', ripples: 340, swells: 14, crest: '#d0dadc', seed: 53,
  });
  // the break's dull path down the water
  glitter(ctx, r, KR.brk.x + 30, '#f0dcb0', 0.4);
  // white horses: broken crests in rows, smaller and more crowded towards the horizon
  for (let i = 0; i < 220; i++) {
    // (on the swells' crests: rows that open out and grow as they come nearer, bunched where a crest is high)
    const row = Math.floor(r() ** 1.2 * 12);
    const t = ((row + 0.5) / 12) ** 1.5;
    const x = r() * W;
    if (Math.sin(x * (0.004 + (1 - t) * 0.008) + row * 1.7) < 0.1) continue;
    const y = HZ + 6 + t * (KR.cap - HZ) + Math.sin(x * 0.006 + row) * (1 + t * 4);
    const s = 0.3 + t * 1.5;
    const len = (14 + r() * 30) * s;
    ctx.fillStyle = rgba('#dfe6e6', 0.3 + r() * 0.35);
    ctx.beginPath();
    ctx.moveTo(x - len / 2, y);
    ctx.quadraticCurveTo(x - len * 0.1, y - 3.5 * s, x + len / 2, y + 0.5);
    ctx.quadraticCurveTo(x, y + 1.5 * s, x - len / 2, y);
    ctx.fill();
    ctx.strokeStyle = rgba('#cfd8da', 0.13);
    ctx.lineWidth = Math.max(1, s);
    ctx.beginPath();
    ctx.moveTo(x + len / 2, y + 1);
    ctx.lineTo(x + len * 1.4, y + 2 * s);
    ctx.stroke();
  }
  haze(ctx, HZ - 2, HZ + 44, '#8a8c90', 0.55, 0.1);
  // the reef: black rocks awash, their wet backs catching the break, foam boiling round them
  for (const k of ROCKS) reefRock(ctx, r, k.x, k.y, k.w, k.h);
  // the near water: the wreck's shadow, and the white water working along her side through the breach
  vfill(ctx, 0, KR.foot - 90, W, KR.deck - KR.foot + 94, [[0, 'rgba(4,10,16,0)'], [1, 'rgba(4,10,16,0.55)']]);
  // through the breach: the sea heaving against her side, lines of foam on it
  lightPool(ctx, (KR.gap.x0 + KR.gap.x1) / 2, KR.foot - 40, 160, 60, '#5a7484', 0.35, 'source-over');
  for (let j = 0; j < 7; j++) {
    const y = KR.cap + 20 + j * 19;
    ctx.strokeStyle = rgba('#dfe8ea', 0.2 + j * 0.06);
    ctx.lineWidth = 1.5 + j * 0.4;
    ctx.beginPath();
    for (let x = KR.gap.x0 - 40; x <= KR.gap.x1 + 40; x += 8) {
      const yy = y + Math.sin(x * 0.03 + j * 2) * (2 + j);
      if (x === KR.gap.x0 - 40) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  for (let i = 0; i < 70; i++) {
    const x = KR.gap.x0 - 20 + r() * (KR.gap.x1 - KR.gap.x0 + 40);
    const y = KR.cap + 10 + r() * (KR.foot - KR.cap);
    const len = 14 + r() * 40;
    ctx.strokeStyle = rgba('#dfe8ea', 0.12 + r() * 0.22);
    ctx.lineWidth = 1 + r() * 1.6;
    ctx.beginPath();
    ctx.moveTo(x - len / 2, y);
    ctx.quadraticCurveTo(x, y - 2 - r() * 3, x + len / 2, y + 1);
    ctx.stroke();
  }
}

function reefRock(ctx: Ctx, r: R, x: number, y: number, w: number, h: number): void {
  const pts: Pt[] = [[x - w / 2, y + 2]];
  const n = 9;
  for (let i = 1; i < n; i++) {
    const u = i / n;
    pts.push([x - w / 2 + u * w, y - Math.sin(u * Math.PI) ** 0.7 * h * (0.75 + r() * 0.4)]);
  }
  pts.push([x + w / 2, y + 2]);
  const p = polyPath(pts);
  solid(ctx, p, { x: x - w / 2, y: y - h * 1.2, w, h: h * 1.2 + 3 }, MATS_F.rock, '#2a2e30', { depth: 0.55, air: STORM_AIR, line: 1.2, formSize: 4 });
  within(ctx, p, () => {
    // wet: the backs facing the break pale and glossy
    const g = ctx.createLinearGradient(x - w / 2, y - h, x + w * 0.2, y + h * 0.4);
    g.addColorStop(0, 'rgba(232,214,176,0.45)');
    g.addColorStop(0.4, 'rgba(232,214,176,0.05)');
    g.addColorStop(0.7, 'rgba(6,8,10,0.2)');
    g.addColorStop(1, 'rgba(6,8,10,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(x - w / 2, y - h * 1.3, w, h * 1.3 + 4);
    lay(ctx, noiseMask(10, 141 + Math.round(x), { cover: 0.3, soft: 0.2, col: '#121614', w: 40, h: 12 }), { x: x - w / 2, y: y - h * 1.2, w, h: h * 1.2 + 3 }, 0.4);
  });
  // the wash breaking over its weather (left) shoulder and pouring off it in white runnels
  for (let i = 0; i < 6; i++) {
    const u = r() * 0.4;
    const sx = x - w / 2 + u * w;
    const sy = y - Math.sin(u * Math.PI) ** 0.7 * h * 0.8;
    ctx.strokeStyle = rgba('#e8eeee', 0.35 + r() * 0.3);
    ctx.lineWidth = 1 + r() * 1.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(sx - 3, (sy + y) / 2, sx - 2 + r() * 4, y);
    ctx.stroke();
  }
  // the foam round its foot
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = rgba('#e8eeee', 0.3 + r() * 0.4);
    ctx.beginPath();
    ctx.ellipse(x - w * 0.6 + r() * w * 1.2, y + 1 + r() * 4, 6 + r() * 14, 1.5 + r() * 2, 0, 0, P2);
    ctx.fill();
  }
}

// ——— the bulwark ———

/** The splintered ends of the stove-in section: each strake broken off at its own point. */
const STRAKES = [KR.capLow, 610, 637, 664, 691, KR.foot];
const brokeL = (k: number) => KR.gap.x0 + [10, -24, 26, -8, 40][k];
const brokeR = (k: number) => KR.gap.x1 + [-14, 30, -30, 18, -40][k];

function jaggedEnd(x: number, y0: number, y1: number, dir: 1 | -1, r: R): Pt[] {
  // a splintered break: long spikes along the grain
  // a few splinters of very different lengths along the grain, the notches between them uneven
  const pts: Pt[] = [[x - dir * (2 + r() * 8), y0]];
  const n = 2 + Math.floor(r() * 3);
  let y = y0;
  for (let i = 0; i < n; i++) {
    const seg = (y1 - y0) / n;
    const yt = y + seg * (0.25 + r() * 0.5);
    const long = r() < 0.4 ? 26 + r() * 26 : 6 + r() * 14;
    pts.push([x + dir * long, yt + (r() - 0.5) * 2]);
    y += seg;
    if (i < n - 1) pts.push([x - dir * (2 + r() * 10), y + (r() - 0.5) * 3]);
  }
  pts.push([x - dir * (2 + r() * 8), y1]);
  return pts;
}

function bulwark(ctx: Ctx, r: R): void {
  const { cap, capLow, foot, gap } = KR;
  // the strakes, each a plank across with its own broken end at the gap
  for (let k = 0; k < 5; k++) {
    const y0 = STRAKES[k];
    const y1 = STRAKES[k + 1];
    for (const side of [-1, 1] as const) {
      const xe = side < 0 ? brokeL(k) : brokeR(k);
      const jag = jaggedEnd(xe, y0, y1, side < 0 ? 1 : -1, r);
      const pts: Pt[] = side < 0 ? [[-4, y0], ...jag, [-4, y1]] : [[W + 4, y0], ...jag, [W + 4, y1]];
      const p = polyPath(pts);
      const x0 = side < 0 ? 0 : xe - 20;
      const w = side < 0 ? xe + 20 : W - xe + 20;
      const col = shade(WOOD, (r() - 0.5) * 0.12 - k * 0.02);
      within(ctx, p, () => {
        surface(ctx, r, { x: x0, y: y0, w, h: y1 - y0 }, col, { vary: 0.35, cells: 8, mottle: 0.4, strokes: 0.9, strokeAng: 0, strokeLen: 220, strokeW: 3, grain: 0.25, seed: 150 + k * 2 + (side > 0 ? 1 : 0) });
        // the plank's rounded face: lit along its top, a dark seam of pitch under it
        vfill(ctx, x0, y0, w, y1 - y0, [[0, 'rgba(200,190,170,0.12)'], [0.25, 'rgba(0,0,0,0)'], [0.8, 'rgba(10,6,4,0.1)'], [1, 'rgba(10,6,4,0.45)']]);
        // butt joints
        for (let b = 0; b < 4; b++) {
          const bx = x0 + r() * w;
          ctx.fillStyle = 'rgba(12,8,6,0.7)';
          ctx.fillRect(bx, y0, 2, y1 - y0);
          ctx.fillStyle = 'rgba(190,170,150,0.1)';
          ctx.fillRect(bx + 2, y0, 1, y1 - y0);
        }
      });
      // the plank's thickness at the break, seen at an angle: raw pale wood along the broken end, the splinters'
      // undersides in shade, a dark line where the outboard face shows through
      const dx = side < 0 ? -1 : 1;
      ctx.save();
      p(ctx);
      ctx.clip();
      ctx.strokeStyle = rgba('#b89c74', 0.75);
      ctx.lineWidth = 5;
      ctx.beginPath();
      jag.forEach(([jx, jy], i) => (i ? ctx.lineTo(jx + dx * 2.5, jy) : ctx.moveTo(jx + dx * 2.5, jy)));
      ctx.stroke();
      ctx.strokeStyle = rgba('#2a1a10', 0.5);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      jag.forEach(([jx, jy], i) => (i ? ctx.lineTo(jx + dx * 5, jy + 1.5) : ctx.moveTo(jx + dx * 5, jy + 1.5)));
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = rgba(WOOD_INK, 0.8);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      jag.forEach(([jx, jy], i) => (i ? ctx.lineTo(jx, jy) : ctx.moveTo(jx, jy)));
      ctx.stroke();
      // a long splinter or two bent in towards the deck
      if (k % 2 === 0) {
        const [sx, sy] = jag[1];
        const sp = polyPath([[sx - dx * 2, sy - 1.5], [sx - dx * (22 + k * 4), sy + 6 + k * 2], [sx - dx * 2, sy + 2]]);
        solid(ctx, sp, { x: Math.min(sx, sx - dx * 40) - 2, y: sy - 2, w: 44, h: 18 }, 'wood', '#8a7254', { depth: 0.2, ink: WOOD_INK, line: 0.9, formSize: 2 });
      }
    }
  }
  // in the breach: the frames snapped off short, raw wood at their breaks, the sea surging white round them
  for (const [fx, ft] of [[924, 640], [1012, 668]] as const) {
    const p = polyPath([[fx - 11, KR.foot], [fx - 11, ft + 6], [fx - 6, ft - 10], [fx - 1, ft + 2], [fx + 4, ft - 18], [fx + 8, ft + 4], [fx + 11, ft - 4], [fx + 11, KR.foot]]);
    castShadow(ctx, p, 6, 7, 0.4, '#06080c');
    solid(ctx, p, { x: fx - 11, y: ft - 18, w: 22, h: KR.foot - ft + 18 }, 'wood', '#463a30', { depth: 0.2, ink: WOOD_INK, line: 1.6, formSize: 5 });
    within(ctx, p, () => {
      ctx.fillStyle = rgba('#b89c74', 0.6);
      ctx.fillRect(fx - 11, ft - 18, 22, 14);
      vfill(ctx, fx - 11, ft, 22, KR.foot - ft, [[0, 'rgba(8,10,18,0.1)'], [1, 'rgba(8,10,18,0.4)']]);
    });
    barnacles(ctx, r, fx, KR.foot - 16, 4);
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = rgba('#e4ecee', 0.3 + r() * 0.4);
      ctx.beginPath();
      ctx.ellipse(fx + (r() - 0.5) * 50, KR.foot - 4 - r() * 8, 6 + r() * 12, 1.5 + r() * 2, 0, 0, P2);
      ctx.fill();
    }
  }
  // grime, wet streaks running down from the cap, barnacles and green weed along the waterway
  for (const [x0, x1] of [[0, brokeL(0) + 30], [brokeR(0) - 30, W]] as const) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, capLow, x1 - x0, foot - capLow);
    ctx.clip();
    grime(ctx, { x: x0, y: capLow, w: x1 - x0, h: foot - capLow }, { top: 14, bottom: 30, a: 0.4, patchy: 0.6, seed: 161, col: '#0c0a08' });
    lay(ctx, noiseMask(30, 163, { cover: 0.35, soft: 0.25, col: '#2a4a2e', w: 300, h: 20 }), { x: x0, y: foot - 34, w: x1 - x0, h: 34 }, 0.55);
    for (let i = 0; i < 30; i++) streaks(ctx, r, x0 + r() * (x1 - x0), capLow + 2, 10, 30 + r() * 80, '#1a1410', 0.25, 2);
    ctx.restore();
  }
  for (let i = 0; i < 26; i++) {
    const x = r() * W;
    if (x > brokeL(4) - 10 && x < brokeR(4) + 10) continue;
    barnacles(ctx, r, x, foot - 6 - r() * 40, 3 + Math.floor(r() * 5));
  }
  // the backlight: the inboard face in shade, the break's light only on the cap's top and edges
  vfill(ctx, 0, capLow, W, foot - capLow, [[0, 'rgba(8,10,18,0.25)'], [1, 'rgba(8,10,18,0.1)']]);
  // the timberheads standing up through the cap rail
  for (const hx of KR.heads) timberhead(ctx, r, hx);
  // the cap rail, broken at the gap: its splintered ends
  for (const [x0, x1] of [[-6, gap.x0 + 2], [gap.x1 - 4, W + 6]] as const) {
    const p = polyPath(x0 < 0
      ? [[x0, cap], [x1 - 8, cap], [x1 + 6, cap + 3], [x1 - 2, cap + 9], [x1 + 10, cap + 13], [x1 - 6, capLow], [x0, capLow]]
      : [[x0 + 10, cap], [x1, cap], [x1, capLow], [x0 + 6, capLow], [x0 - 8, capLow - 5], [x0 + 2, cap + 8], [x0 - 10, cap + 3]]);
    castShadow(ctx, p, 5, 6, 0.4, '#06080c');
    solid(ctx, p, { x: Math.max(0, x0), y: cap, w: x1 - x0, h: capLow - cap }, 'wood', '#5a4a3c', { depth: 0.2, ink: WOOD_INK, line: 1.8, formSize: 4 });
    within(ctx, p, () => {
      // the cap's top face catching the break's light, warm on the left fading right
      const g = ctx.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, 'rgba(240,214,164,0.55)');
      g.addColorStop(0.5, 'rgba(200,190,170,0.22)');
      g.addColorStop(1, 'rgba(160,170,190,0.15)');
      ctx.fillStyle = g;
      ctx.fillRect(x0, cap, x1 - x0, 4);
      vfill(ctx, x0, cap + 4, x1 - x0, capLow - cap - 4, [[0, 'rgba(10,6,4,0)'], [1, 'rgba(10,6,4,0.45)']]);
      lay(ctx, noiseMask(30, 171, { cover: 0.3, soft: 0.2, col: '#c8c0b0', w: 300, h: 6 }), { x: x0, y: cap, w: x1 - x0, h: 5 }, 0.3);
    });
  }
  // the gap's floor: the waterway's broken edge, sea washing over it
  crevice(ctx, 0, W, capLow, 10, 0.5, '#06080c');
  // kelp hung over the rail, dark ribbons with a lit edge
  for (const [x, len] of [[452, 60], [690, 44], [1236, 70], [1520, 50]] as const) kelp(ctx, r, x, KR.cap + 2, len);
  // scuppers at the foot, each weeping water down the planking
  for (const x of [400, 680, 1250, 1500]) {
    ctx.fillStyle = '#060404';
    ctx.fillRect(x - 12, foot - 9, 24, 7);
    ctx.fillStyle = rgba('#a8b8c0', 0.25);
    ctx.fillRect(x - 10, foot - 3, 20, 2);
  }
}

function timberhead(ctx: Ctx, r: R, x: number): void {
  const { cap, foot } = KR;
  const p: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - 13, foot);
    c.lineTo(x - 13, cap - 10);
    c.quadraticCurveTo(x - 12, cap - 20, x, cap - 21);
    c.quadraticCurveTo(x + 12, cap - 20, x + 13, cap - 10);
    c.lineTo(x + 13, foot);
    c.closePath();
  };
  castShadow(ctx, p, 6, 7, 0.4, '#06080c');
  solid(ctx, p, { x: x - 13, y: cap - 21, w: 26, h: foot - cap + 21 }, 'wood', '#544438', { depth: 0.18, ink: WOOD_INK, line: 1.8, formSize: 6 });
  within(ctx, p, () => {
    ctx.fillStyle = 'rgba(240,214,164,0.4)';
    ctx.fillRect(x - 12, cap - 21, 9, 6);
    vfill(ctx, x - 13, cap, 26, foot - cap, [[0, 'rgba(8,10,18,0.2)'], [1, 'rgba(8,10,18,0.35)']]);
    // an iron knee bolted on, rust weeping from the bolts
    for (const by of [cap + 30, foot - 34]) {
      ctx.fillStyle = '#1a1210';
      ctx.beginPath();
      ctx.arc(x, by, 3, 0, P2);
      ctx.fill();
      streaks(ctx, r, x - 3, by + 2, 6, 20 + r() * 20, '#7a3a1a', 0.4, 2);
    }
  });
}

function barnacles(ctx: Ctx, r: R, x: number, y: number, n: number): void {
  // a crust of acorn barnacles: little grey-brown volcanoes crowded together, lit on the upper left, each with a
  // slit of a mouth in its crater (no round holes: a cluster of those reads as eyes)
  for (let i = 0; i < n; i++) {
    const bx = x + (r() - 0.5) * 20;
    const by = y + (r() - 0.5) * 9;
    const s = 2.2 + r() * 2.6;
    const h = s * (0.7 + r() * 0.5);
    const cone: PathFn = (c) => {
      c.beginPath();
      c.moveTo(bx - s, by + s * 0.35);
      c.lineTo(bx - s * 0.42, by - h);
      c.lineTo(bx + s * 0.42, by - h);
      c.lineTo(bx + s, by + s * 0.35);
      c.quadraticCurveTo(bx, by + s * 0.7, bx - s, by + s * 0.35);
      c.closePath();
    };
    ctx.fillStyle = 'rgba(8,6,6,0.35)';
    ctx.beginPath();
    ctx.ellipse(bx + 1.4, by + s * 0.4, s * 1.1, s * 0.45, 0, 0, P2);
    ctx.fill();
    const g = ctx.createLinearGradient(bx - s, by - h, bx + s, by + s * 0.4);
    g.addColorStop(0, '#b4aa98');
    g.addColorStop(0.5, '#7c7466');
    g.addColorStop(1, '#3e3a34');
    cone(ctx);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(20,16,12,0.55)';
    ctx.lineWidth = 0.7;
    ctx.stroke();
    // the plates' ridges, and the slit in the crater
    ctx.strokeStyle = 'rgba(30,26,20,0.35)';
    ctx.beginPath();
    ctx.moveTo(bx - s * 0.15, by - h);
    ctx.lineTo(bx - s * 0.4, by + s * 0.3);
    ctx.moveTo(bx + s * 0.2, by - h);
    ctx.lineTo(bx + s * 0.45, by + s * 0.25);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(30,24,20,0.8)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(bx - s * 0.25, by - h + 0.6);
    ctx.lineTo(bx + s * 0.25, by - h + 0.3);
    ctx.stroke();
  }
}

function kelp(ctx: Ctx, r: R, x: number, y: number, len: number): void {
  for (let k = 0; k < 3; k++) {
    const x0 = x + (k - 1) * 7;
    const sw = (r() - 0.5) * 12;
    const p: PathFn = (c) => {
      c.beginPath();
      c.moveTo(x0 - 4, y - 4);
      c.quadraticCurveTo(x0 - 6 + sw, y + len * 0.5, x0 + sw * 1.4, y + len * (0.7 + k * 0.15));
      c.quadraticCurveTo(x0 + 4 + sw, y + len * 0.5, x0 + 4, y - 4);
      c.closePath();
    };
    solid(ctx, p, { x: x0 - 14, y: y - 4, w: 28, h: len + 10 }, 'slime', '#2e4424', { depth: 0.2, line: 1.2, ink: '#0a1206', formSize: 3 });
  }
  // over the cap's top
  ctx.fillStyle = '#26381e';
  ctx.beginPath();
  ctx.ellipse(x, y - 3, 14, 4, 0, 0, P2);
  ctx.fill();
}

/** The deck between the bulwark and the table: planks laid across, foreshortened, wet, the waterway at the foot. */
function deck(ctx: Ctx, r: R): void {
  const y0 = KR.foot;
  ctx.fillStyle = '#0e0a08';
  ctx.fillRect(0, y0, W, TY - y0 + 2);
  let y = y0;
  let i = 0;
  while (y < TY) {
    const h = 8 + i * 2.6;
    const col = shade('#5a4c40', (r() - 0.5) * 0.12 + i * 0.03);
    surface(ctx, r, { x: 0, y, w: W, h: h - 1.4 }, col, { vary: 0.4, cells: 6, mottle: 0.4, strokes: 0.8, strokeAng: 0, strokeLen: 200, strokeW: 3, grain: 0.2, seed: 180 + i });
    ctx.fillStyle = rgba('#e8d8b8', 0.08);
    ctx.fillRect(0, y, W, 1);
    ctx.fillStyle = 'rgba(6,4,2,0.7)';
    ctx.fillRect(0, y + h - 1.4, W, 1.4);
    y += h;
    i++;
  }
  // wet: the break's light lying along the boards on the left, the water standing in the waterway
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, 'rgba(240,214,164,0.14)');
  g.addColorStop(0.45, 'rgba(240,214,164,0.02)');
  g.addColorStop(1, 'rgba(150,170,200,0.05)');
  ctx.fillStyle = g;
  ctx.fillRect(0, y0, W, TY - y0);
  vfill(ctx, 0, y0, W, 10, [[0, 'rgba(160,180,190,0.3)'], [1, 'rgba(160,180,190,0)']]);
  crevice(ctx, 0, W, y0, 12, 0.6, '#040608');
  grime(ctx, { x: 0, y: y0, w: W, h: TY - y0 }, { top: 8, bottom: 14, a: 0.35, patchy: 0.6, seed: 187, col: '#0a0806' });
}

// ——— the mast and its arm ———

function mastPath(): PathFn {
  const { x, top, base, r: mr } = MAST;
  return (c) => {
    c.beginPath();
    c.moveTo(x - mr, base);
    c.lineTo(x - mr * 0.86, top + 10);
    // the snapped top: long splinters
    c.lineTo(x - mr * 0.7, top - 6);
    c.lineTo(x - mr * 0.45, top + 8);
    c.lineTo(x - mr * 0.2, top - 30);
    c.lineTo(x, top + 4);
    c.lineTo(x + mr * 0.25, top - 14);
    c.lineTo(x + mr * 0.5, top + 12);
    c.lineTo(x + mr * 0.72, top + 2);
    c.lineTo(x + mr * 0.86, top + 16);
    c.lineTo(x + mr, base);
    c.closePath();
  };
}

function mast(ctx: Ctx, r: R): void {
  const { x, top, base, r: mr } = MAST;
  const p = mastPath();
  solid(ctx, p, { x: x - mr, y: top - 30, w: mr * 2, h: base - top + 30 }, 'wood', '#3c2c1c', { depth: 0.12, ink: WOOD_INK, line: 2.2, formSize: 14 });
  within(ctx, p, () => {
    // a round spar: lit on the break's side (left), the lantern's warmth on its right, shaded between
    const g = ctx.createLinearGradient(x - mr, 0, x + mr, 0);
    g.addColorStop(0, 'rgba(240,214,164,0.22)');
    g.addColorStop(0.3, 'rgba(240,214,164,0.03)');
    g.addColorStop(0.7, 'rgba(10,6,4,0.35)');
    g.addColorStop(1, 'rgba(10,6,4,0.2)');
    ctx.fillStyle = g;
    ctx.fillRect(x - mr, top - 30, mr * 2, base - top + 30);
    // grain and checks running up it
    for (let k = 0; k < 9; k++) {
      const gx = x - mr + 4 + r() * (mr * 2 - 8);
      ctx.strokeStyle = rgba(r() < 0.5 ? '#1a1008' : '#a08868', 0.25);
      ctx.lineWidth = 0.8 + r();
      ctx.beginPath();
      ctx.moveTo(gx, top);
      ctx.lineTo(gx + (r() - 0.5) * 4, base);
      ctx.stroke();
    }
    // the raw wood of the break
    ctx.fillStyle = rgba('#c8a878', 0.5);
    ctx.fillRect(x - mr, top - 30, mr * 2, 34);
    vfill(ctx, x - mr, top - 30, mr * 2, 40, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(10,6,4,0.4)']]);
    // iron hoops round it, rust weeping from them
    for (const hy of [190, 300, 470, 640]) {
      ctx.fillStyle = IRON;
      ctx.fillRect(x - mr, hy, mr * 2, 7);
      ctx.fillStyle = rgba('#d8c8a8', 0.25);
      ctx.fillRect(x - mr, hy, mr * 0.7, 1.6);
      streaks(ctx, r, x - mr, hy + 7, mr * 2, 26 + r() * 20, '#7a3a1a', 0.35, 4);
    }
    lay(ctx, noiseMask(14, 191, { cover: 0.3, soft: 0.2, col: '#2a3a20', w: 30, h: 200 }), { x: x - mr, y: base - 140, w: mr * 2, h: 140 }, 0.5);
  });
  // the mast coat where it goes through the deck
  const coat = rrPath(x - mr - 10, base - 18, mr * 2 + 20, 18, 6);
  solid(ctx, coat, { x: x - mr - 10, y: base - 18, w: mr * 2 + 20, h: 18 }, 'canvas', '#4a4036', { depth: 0.1, line: 1.8, formSize: 4 });
  // the iron bracket the lantern hangs from
  const { x: hx, y: hy } = KR.lantern;
  ctx.strokeStyle = '#0c0a08';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x + mr - 2, hy - 30);
  ctx.lineTo(hx, hy - 30);
  ctx.lineTo(hx, hy - 4);
  ctx.moveTo(x + mr - 2, hy - 2);
  ctx.lineTo(hx - 20, hy - 28);
  ctx.stroke();
  ctx.strokeStyle = '#4a4440';
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

/** The shrouds: three set up from the masthead down to deadeyes on the rail, ratlines across them. */
function shrouds(ctx: Ctx): void {
  const top: Pt = [MAST.x - 8, 168];
  const feet: Pt[] = [[22, KR.cap - 6], [74, KR.cap - 6], [126, KR.cap - 6]];
  for (const [fx, fy] of feet) {
    ctx.strokeStyle = '#0c0806';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(top[0], top[1]);
    ctx.lineTo(fx, fy - 26);
    ctx.stroke();
    ctx.strokeStyle = '#5a4a38';
    ctx.lineWidth = 2;
    ctx.stroke();
    // the deadeyes and their lanyard
    for (const dy of [fy - 26, fy - 6]) {
      ctx.fillStyle = '#2a1e14';
      ctx.beginPath();
      ctx.ellipse(fx, dy, 7, 5, 0, 0, P2);
      ctx.fill();
      ctx.strokeStyle = WOOD_INK;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = rgba('#d8c0a0', 0.4);
      ctx.fillRect(fx - 5, dy - 4, 4, 1.4);
    }
    ctx.strokeStyle = '#8a7a60';
    ctx.lineWidth = 1;
    for (const k of [-3, 0, 3]) {
      ctx.beginPath();
      ctx.moveTo(fx + k, fy - 22);
      ctx.lineTo(fx + k, fy - 10);
      ctx.stroke();
    }
  }
  // the ratlines: rungs of tarred line, some parted and hanging
  for (let k = 0; k < 10; k++) {
    const u = 0.18 + k * 0.075;
    const at = (f: Pt): Pt => [top[0] + (f[0] - top[0]) * u, top[1] + (f[1] - 26 - top[1]) * u];
    const a = at(feet[0]);
    const b = at(feet[2]);
    if (k === 6) {
      hang(ctx, a[0], a[1], a[0] + 8, a[1] + 24, 2, '#3a2e22', 1.4);
      continue;
    }
    hang(ctx, a[0], a[1], b[0], b[1], 3, '#3a2e22', 1.4);
  }
}

function mastCoil(ctx: Ctx, r: R): void {
  const { t, front } = mastCoilTube();
  const look = { ...NEAR_LOOK, seed: 3 };
  shrouds(ctx);
  // where the arm lies on the cap rail: its weight pressing down, its shadow
  groundShadow(ctx, 110, KR.cap + 2, 90, 6, 0.6, '#06040a', 0.8);
  tentacle(ctx, t, look);
  // the turns going round behind the mast: in its shade, darkening as they tuck in
  const back: [number, number][] = [];
  for (let k = 0; k < front.length - 1; k++) back.push([front[k][1], front[k + 1][0]]);
  for (const [i0, i1] of back) {
    within(ctx, tubePath(t, i0, i1, 3), () => {
      ctx.fillStyle = 'rgba(8,4,14,0.4)';
      ctx.fillRect(MAST.x - 140, 0, 280, KR.foot);
    });
  }
  mast(ctx, r);
  // the turns in front: their shadow on the mast and on the turns behind (falling down-right), then the arm
  // painted again over it
  ctx.save();
  ctx.beginPath();
  mastPath()(ctx);
  for (const [i0, i1] of back) tubeQuads(ctx, t, i0, i1, 2);
  ctx.clip();
  for (const [i0, i1] of front) castShadow(ctx, tubePath(t, i0, i1), 10, 9, 0.7, '#06030a');
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  for (const [i0, i1] of front) tubeQuads(ctx, t, Math.max(0, i0 - 1), Math.min(t.p.length - 1, i1 + 1), 16);
  ctx.clip();
  tentacle(ctx, t, look);
  ctx.restore();
  // the lantern's warmth: on the mast's right side, and a warm bounce along the turns that face it
  const { x: lx, y: ly } = KR.lantern;
  within(ctx, mastPath(), () => lightPool(ctx, lx, ly + 40, 90, 160, '#ffb860', 0.25, 'source-over'));
  for (const [i0, i1] of front) {
    const p = tubePath(t, i0, i1);
    within(ctx, p, () => lightPool(ctx, lx, ly + 46, 150, 150, '#ffb060', 0.22, 'source-over'));
    bounce(ctx, p, lx, ly + 46, [MAST.x, ly + 60], '#ffb060', 0.35, 5);
  }
}

// ——— the lantern ———

/** The ship's lantern hanging from its hook (x, y): a brass-capped cage of four glass panes, its ring on top. */
function lantern(ctx: Ctx, x: number, y: number): void {
  // the ring
  ctx.strokeStyle = '#0c0a08';
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.ellipse(x, y + 4, 5, 6, 0, 0, P2);
  ctx.stroke();
  ctx.strokeStyle = '#8a7040';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // the cap: a vented cone
  const cap = polyPath([[x - 5, y + 10], [x + 5, y + 10], [x + 17, y + 24], [x - 17, y + 24]]);
  solid(ctx, cap, { x: x - 17, y: y + 10, w: 34, h: 14 }, MATS_F.bronze, '#8a6a34', { depth: 0.1, line: 1.6, formSize: 3 });
  // the glass: lit from inside, the flame's glow strongest low in the middle
  const gx = x - 13;
  const gy = y + 24;
  const gw = 26;
  const gh = 38;
  const glass = rectPath(gx, gy, gw, gh);
  const g = ctx.createRadialGradient(x, gy + gh * 0.62, 2, x, gy + gh * 0.55, gh * 0.75);
  g.addColorStop(0, '#fff6d8');
  g.addColorStop(0.35, '#ffd890');
  g.addColorStop(1, '#c87830');
  ctx.fillStyle = g;
  glass(ctx);
  ctx.fill();
  within(ctx, glass, () => {
    // soot on the inside of the glass at the top
    vfill(ctx, gx, gy, gw, 12, [[0, 'rgba(40,20,10,0.55)'], [1, 'rgba(40,20,10,0)']]);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(gx + 3, gy + 6, 2, gh - 12);
  });
  // the cage: corner posts and two wire guards across
  ctx.strokeStyle = '#141008';
  ctx.lineWidth = 3;
  for (const px of [gx, gx + gw]) {
    ctx.beginPath();
    ctx.moveTo(px, gy);
    ctx.lineTo(px, gy + gh);
    ctx.stroke();
  }
  ctx.lineWidth = 1.6;
  for (const py of [gy + 13, gy + 26]) {
    ctx.beginPath();
    ctx.moveTo(gx, py);
    ctx.quadraticCurveTo(x, py + 3, gx + gw, py);
    ctx.stroke();
  }
  ctx.strokeStyle = rgba('#e8c880', 0.5);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(gx - 1, gy + 1);
  ctx.lineTo(gx - 1, gy + gh - 1);
  ctx.stroke();
  // the base: a brass drum (the font)
  const base = rrPath(x - 16, gy + gh, 32, 10, 3);
  solid(ctx, base, { x: x - 16, y: gy + gh, w: 32, h: 10 }, MATS_F.bronze, '#7a5a2c', { depth: 0.1, line: 1.6, formSize: 3 });
}

const LANTERN_BOX = { x: KR.lantern.x - 30, y: KR.lantern.y - 6, w: 60, h: 90 };

function lanternFlameStill(ctx: Ctx): void {
  const { x, y, flame } = KR.lantern;
  glowAt(ctx, x, y + flame - 4, 80, '#ffc070', 0.22);
  ctx.save();
  ctx.translate(x - 7, y + flame - 18);
  flameFrame(ctx, 14, 20, 0.3);
  ctx.restore();
}

/** The lantern's warmth on the bulwark and the deck (plain alpha: it stays when baked). */
function lanternLight(ctx: Ctx): void {
  const { x, y } = KR.lantern;
  lightPool(ctx, x + 10, KR.cap + 60, 260, 110, '#ffb058', 0.14, 'source-over');
  lightPool(ctx, x + 20, KR.deck - 2, 280, 30, '#ffc070', 0.16, 'source-over');
  void y;
}

// ——— the arm over the rail on the right ———

function rightArmTube(): Tube {
  const over = bez([1990, 640], [1950, 560], [1900, 520], [1846, 540], 30);
  const down = bez([1846, 540], [1806, 556], [1840, 650], [1800, 724], 24).slice(1);
  // the tip lying out along the deck towards the chest, curled: flattened into the deck's foreshortening
  const tip = spineFrom(1800, 724, Math.PI * 0.86, 190, (u) => (u < 0.25 ? 1.2 : -3 - 12 * (u - 0.25) ** 1.3) / 190, 3)
    .map(([x, y]) => [x, 734 + (y - 724) * 0.3] as Pt)
    .slice(1);
  return tubeOf([...over, ...down, ...tip], (u) => Math.max(2.5, 58 * (1 - u) ** 0.8));
}

function rightArm(ctx: Ctx): void {
  const t = rightArmTube();
  // its shadow down the bulwark's face and on the deck
  // (the part still outboard, below the cap rail, is behind the bulwark)
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, KR.cap + 4);
  ctx.rect(0, KR.cap + 4, 1850, 1080);
  ctx.clip();
  castShadow(ctx, tubePath(t), 14, 12, 0.7, '#06040a');
  // where the part on the deck presses down: a dark contact line all along under it
  const N = t.p.length;
  for (let i = Math.floor(N * 0.62); i < N; i += 3) {
    const [x, y] = t.p[i];
    groundShadow(ctx, x + 2, y + t.w[i] * 0.22, t.w[i] * 0.7 + 3, t.w[i] * 0.2 + 1.5, 0.45, '#040206', 0.6);
  }
  // where it bears on the cap rail
  groundShadow(ctx, 1862, KR.cap + 2, 50, 5, 0.7, '#06040a', 0.6);
  tentacle(ctx, t, { ...NEAR_LOOK, side: -1, seed: 11 });
  ctx.restore();
}

// ——— the chest ———

function chest(ctx: Ctx, r: R): void {
  const { x, base } = KR.chest;
  ctx.save();
  ctx.translate(x, base);
  ctx.scale(1.25, 1.25);
  ctx.translate(-x, -base);
  chestAt(ctx, r);
  ctx.restore();
}

function chestAt(ctx: Ctx, r: R): void {
  const { x, base } = KR.chest;
  const L = x - 80;
  const Rt = x + 80;
  const top = base - 72;
  const hinge = top - 8;
  const lidTop = top - 94;
  // its shadow on the deck, thrown down-right, and the occlusion where it sits
  groundShadow(ctx, x + 16, base, 108, 10, 0.7, '#060404', 1.4);
  // the lid, thrown back on its hinges and resting against the bulwark: we see its inside face, the end boards of
  // its dome edge-on down each side, the dome's thickness along its top edge
  // (one hinge has sprung: the lid hangs askew on the other, its right side lifted off the rim)
  ctx.save();
  ctx.translate(L + 2, hinge);
  ctx.rotate(-0.07);
  ctx.translate(-(L + 2), -hinge);
  const lid = polyPath([[L + 2, hinge], [L + 12, lidTop], [Rt - 12, lidTop], [Rt - 2, hinge]]);
  aoHalo(ctx, lid, 12, 0.55, '#060404', 4);
  castShadow(ctx, lid, 12, 10, 0.55, '#060404');
  solid(ctx, lid, { x: L, y: lidTop, w: 160, h: hinge - lidTop }, 'wood', '#3a2a1c', { depth: 0.08, ink: WOOD_INK, line: 2, formSize: 8 });
  within(ctx, lid, () => {
    for (let k = 1; k < 6; k++) {
      const y = lidTop + k * 14;
      ctx.fillStyle = 'rgba(8,4,2,0.55)';
      ctx.fillRect(L, y, 160, 1.6);
      ctx.fillStyle = 'rgba(200,170,130,0.08)';
      ctx.fillRect(L, y + 1.6, 160, 1);
    }
    for (const bx of [L + 30, Rt - 38]) {
      ctx.fillStyle = IRON;
      ctx.fillRect(bx, lidTop, 8, hinge - lidTop);
      ctx.fillStyle = rgba('#c8b090', 0.18);
      ctx.fillRect(bx, lidTop, 2, hinge - lidTop);
      streaks(ctx, r, bx, lidTop + 20, 8, 40, '#7a3a1a', 0.4, 3);
    }
    // lit from the top left, falling into the shadow of the box towards the hinge
    const g = ctx.createLinearGradient(L, lidTop, Rt, hinge);
    g.addColorStop(0, 'rgba(232,206,160,0.16)');
    g.addColorStop(0.5, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(6,4,2,0.4)');
    ctx.fillStyle = g;
    ctx.fillRect(L, lidTop, 160, hinge - lidTop);
    vfill(ctx, L, hinge - 30, 160, 30, [[0, 'rgba(6,4,2,0)'], [1, 'rgba(6,4,2,0.7)']]);
    lay(ctx, noiseMask(12, 199, { cover: 0.35, soft: 0.25, col: '#1a1208', w: 60, h: 40 }), { x: L, y: lidTop, w: 160, h: hinge - lidTop }, 0.4);
  });
  // the end boards, edge-on, and the dome's thick top edge catching the light
  for (const [ex, dir] of [[L + 2, 1], [Rt - 2, -1]] as const) {
    const eb = polyPath([[ex, hinge], [ex + dir * 10, lidTop], [ex + dir * 16, lidTop], [ex + dir * 7, hinge]]);
    solid(ctx, eb, { x: Math.min(ex, ex + dir * 16), y: lidTop, w: 16, h: hinge - lidTop }, 'wood', dir > 0 ? '#5a4430' : '#2e2216', { depth: 0.08, ink: WOOD_INK, line: 1.4, formSize: 3 });
  }
  const edge = polyPath([[L + 12, lidTop], [Rt - 12, lidTop], [Rt - 14, lidTop - 7], [L + 14, lidTop - 7]]);
  solid(ctx, edge, { x: L + 12, y: lidTop - 7, w: 136, h: 7 }, 'wood', '#6a5038', { depth: 0.08, ink: WOOD_INK, line: 1.4, formSize: 3 });
  ctx.restore();
  // the inside of the box behind the gold: a deep dark gap under the lid
  const inside = polyPath([[L + 3, hinge - 2], [Rt - 3, hinge - 12], [Rt - 2, top + 2], [L + 2, top + 2]]);
  inside(ctx);
  ctx.fillStyle = '#0a0604';
  ctx.fill();
  // the hinges: knuckles at the lid's foot
  for (const hx of [L + 34]) {
    ctx.fillStyle = '#0c0a08';
    ctx.fillRect(hx - 9, hinge - 4, 18, 8);
    ctx.fillStyle = '#4a4440';
    ctx.fillRect(hx - 8, hinge - 3, 16, 3);
    ctx.fillStyle = rgba('#d8c8a8', 0.35);
    ctx.fillRect(hx - 8, hinge - 3, 6, 1.2);
  }
  // the gold: a loose heap of coins, its top edge broken by the coins themselves
  const heapTop = (u: number) => top + 2 - Math.sin(u * Math.PI) ** 0.8 * 30 - Math.sin(u * 23) * 2;
  const heap: PathFn = (c) => {
    c.beginPath();
    c.moveTo(L + 3, top + 4);
    for (let k = 0; k <= 24; k++) c.lineTo(L + 3 + (k / 24) * 154, heapTop(k / 24));
    c.lineTo(Rt - 3, top + 4);
    c.closePath();
  };
  heap(ctx);
  ctx.fillStyle = '#7a4e12';
  ctx.fill();
  within(ctx, heap, () => vfill(ctx, L, top - 34, 160, 40, [[0, 'rgba(255,220,140,0.25)'], [1, 'rgba(30,14,0,0.5)']]));
  // coins: piled thick, those along the crest standing proud of it
  for (let i = 0; i < 90; i++) {
    const u = r();
    const crest = heapTop(u);
    const v = r() ** 0.7;
    const cy = crest + 3 + v * (top + 4 - crest);
    coin(ctx, L + 6 + u * 148, cy, 5.5 + r() * 2.5, r() * 0.8 - 0.4, r, 0.35 + r() * 0.3);
  }
  for (let i = 0; i < 16; i++) {
    const u = 0.08 + (i / 16) * 0.84 + (r() - 0.5) * 0.03;
    coin(ctx, L + 3 + u * 154, heapTop(u) + 1, 6 + r() * 2, r() * 1.2 - 0.6, r, 0.3 + r() * 0.5);
  }
  // a gold goblet lying in the heap, a red stone set in it
  const gob = polyPath([[x + 8, top - 30], [x + 30, top - 38], [x + 34, top - 26], [x + 14, top - 18]]);
  solid(ctx, gob, { x: x + 8, y: top - 38, w: 26, h: 20 }, MATS_F.gold, '#e8b23a', { depth: 0.08, line: 1.4, formSize: 4, ink: '#4a2a08' });
  ctx.fillStyle = '#a01828';
  ctx.beginPath();
  ctx.arc(x + 21, top - 28, 3, 0, P2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,220,220,0.8)';
  ctx.fillRect(x + 19.5, top - 30, 1.4, 1.4);
  // the box: planked front, iron corner straps and bands, the hasp and lock
  const box = rectPath(L, top, 160, 72);
  castShadow(ctx, box, 10, 10, 0.55, '#060404');
  solid(ctx, box, { x: L, y: top, w: 160, h: 72 }, 'wood', '#55402e', { depth: 0.08, ink: WOOD_INK, line: 2.2, formSize: 10 });
  within(ctx, box, () => {
    for (let k = 1; k < 4; k++) {
      ctx.fillStyle = 'rgba(10,6,4,0.6)';
      ctx.fillRect(L, top + k * 18, 160, 1.6);
      ctx.fillStyle = 'rgba(220,200,170,0.1)';
      ctx.fillRect(L, top + k * 18 + 1.6, 160, 1);
    }
    for (const bx of [L, L + 40, Rt - 50, Rt - 10]) {
      ctx.fillStyle = IRON;
      ctx.fillRect(bx, top, 10, 72);
      ctx.fillStyle = rgba('#c8b090', 0.22);
      ctx.fillRect(bx, top, 2, 72);
      for (const ry of [top + 8, top + 36, top + 64]) {
        ctx.fillStyle = '#0a0806';
        ctx.beginPath();
        ctx.arc(bx + 5, ry, 1.8, 0, P2);
        ctx.fill();
      }
      streaks(ctx, r, bx, top + 20, 10, 50, '#7a3a1a', 0.4, 3);
    }
    // the lock plate and keyhole
    const lp = rrPath(x - 12, top + 4, 24, 28, 3);
    solid(ctx, lp, { x: x - 12, y: top + 4, w: 24, h: 28 }, MATS_F.bronze, '#8a6a32', { depth: 0.08, line: 1.4, formSize: 4 });
    ctx.fillStyle = '#0a0604';
    ctx.beginPath();
    ctx.arc(x, top + 15, 3, 0, P2);
    ctx.fill();
    ctx.fillRect(x - 1.4, top + 15, 2.8, 9);
    // sea-wear: grime in the seams and corners, weed at its foot
    grime(ctx, { x: L, y: top, w: 160, h: 72 }, { top: 6, bottom: 22, a: 0.45, patchy: 0.6, seed: 195, col: '#0c0804' });
    lay(ctx, noiseMask(14, 197, { cover: 0.35, soft: 0.2, col: '#2a3e22', w: 80, h: 20 }), { x: L, y: base - 22, w: 160, h: 22 }, 0.6);
    // the one light: from the top left, the lower right in shade, darkest where it sits on the deck
    const g = ctx.createLinearGradient(L, top, Rt, base);
    g.addColorStop(0, 'rgba(240,214,170,0.16)');
    g.addColorStop(0.45, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(6,4,2,0.5)');
    ctx.fillStyle = g;
    ctx.fillRect(L, top, 160, 72);
    vfill(ctx, L, base - 16, 160, 16, [[0, 'rgba(4,2,2,0)'], [1, 'rgba(4,2,2,0.6)']]);
  });
  barnacles(ctx, r, L + 12, base - 8, 5);
  barnacles(ctx, r, Rt - 16, base - 10, 4);
  crevice(ctx, L - 6, Rt + 6, base, 5, 0.8, '#040202');
  // coins tumbling over the front rim and down the front to the deck
  for (const [cx, cy, s, rot, sq] of [[L + 18, top + 1, 6.5, 0.6, 0.8], [L + 8, top + 14, 6, -0.4, 0.9], [L - 2, top + 34, 6, 0.3, 0.95], [Rt - 22, top + 2, 6.5, -0.5, 0.7]] as const) {
    ctx.fillStyle = 'rgba(6,4,2,0.4)';
    ctx.beginPath();
    ctx.ellipse(cx + 3, cy + 3, s, s * sq * 0.8, rot, 0, P2);
    ctx.fill();
    coin(ctx, cx, cy, s, rot, r, sq);
  }
  // the pearls: one strand draped over the front edge, another spilling down it to the deck
  const pearl = (px: number, py: number, pr = 3.2) => {
    const g = ctx.createRadialGradient(px - 1.2, py - 1.2, 0.2, px, py, pr + 0.2);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.6, '#e0d8d4');
    g.addColorStop(1, '#8a7a80');
    ctx.fillStyle = 'rgba(10,6,4,0.45)';
    ctx.beginPath();
    ctx.arc(px + 1, py + 1.4, pr, 0, P2);
    ctx.fill();
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, P2);
    ctx.fill();
  };
  for (let i = 0; i <= 16; i++) {
    const u = i / 16;
    pearl(L + 24 + u * 70, top + 2 + Math.sin(u * Math.PI) * 26);
  }
  for (let i = 0; i <= 18; i++) {
    const u = i / 18;
    pearl(Rt - 34 + Math.sin(u * 3) * 6, top + 2 + u * 66, 2.8);
  }
  for (let i = 0; i < 6; i++) pearl(Rt - 30 + i * 6.4, base + 1 - (i % 2), 2.8);
  // coins spilled on the deck: a little slope at its foot and strays, each lying flat with its shadow
  for (const [cx, cy, s] of [[L - 10, base - 2, 7], [L - 22, base + 1, 6.5], [L - 4, base + 3, 7], [L - 36, base + 4, 6], [L - 16, base - 6, 6.5], [Rt + 14, base + 2, 6.5], [Rt + 30, base - 1, 6]] as const) {
    groundShadow(ctx, cx + 3, cy + 2, s * 1.2, s * 0.45, 0.8, '#040202', 0.5);
    coin(ctx, cx, cy, s, 0, r, 0.4);
  }
}

/** A gold coin lying (squashed by its tilt), its milled rim lit on the upper left. */
function coin(ctx: Ctx, x: number, y: number, s: number, rot: number, r: R, sq = 0.5): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = '#5a3406';
  ctx.beginPath();
  ctx.ellipse(0, 1, s, s * sq, 0, 0, P2);
  ctx.fill();
  const g = ctx.createLinearGradient(-s, -s * sq, s, s * sq);
  g.addColorStop(0, '#fff0a8');
  g.addColorStop(0.45, '#e8b23a');
  g.addColorStop(1, '#8a5a12');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, s, s * sq, 0, 0, P2);
  ctx.fill();
  ctx.strokeStyle = rgba('#6a400a', 0.8);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.68, s * sq * 0.68, 0, 0, P2);
  ctx.stroke();
  if (r() < 0.3) {
    ctx.fillStyle = 'rgba(255,255,240,0.9)';
    ctx.fillRect(-s * 0.5, -s * sq * 0.5, 2, 1.2);
  }
  ctx.restore();
}

// ——— the table: the wreck's deck ———

function table(ctx: Ctx, r: R): void {
  planksPlane(ctx, r, KR.front, '#6a5a4a', 0.24, 0.012);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, KR.front - TY + 4);
  ctx.clip();
  // wet, salt-stained, dark with the sea
  lay(ctx, drift('#d8d0c0', '#2a2018', 5, 201, 256, 48), { x: 0, y: TY, w: W, h: KR.front - TY }, 0.14);
  lay(ctx, noiseMask(30, 203, { cover: 0.3, soft: 0.3, col: '#141c18', w: 384, h: 64 }), { x: 0, y: TY, w: W, h: KR.front - TY }, 0.1);
  // wet: the water lying in the seams catching the sky's glow and the lantern, strongest at the back
  for (let X = -2.88; X <= 2.88; X += 0.24) {
    const x0 = xAt(X, ZB);
    const x1 = xAt(X, ZB * 0.42);
    const warm = Math.max(0, 1 - Math.abs(x0 - KR.lantern.x) / 420);
    const g = ctx.createLinearGradient(0, TY, 0, KR.front);
    g.addColorStop(0, rgba(warm > 0.2 ? '#ffc888' : '#c8c8c0', 0.22 + warm * 0.15));
    g.addColorStop(0.5, rgba('#a8b0b8', 0.06));
    g.addColorStop(1, rgba('#a8b0b8', 0));
    ctx.strokeStyle = g;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x0 + 2, TY);
    ctx.lineTo(x1 + 2, KR.front);
    ctx.stroke();
  }
  // puddles, crisp-edged, lying in the planks' hollows: the sky reflected in them, a bright lip on their far side
  for (const [px, py, pw, ph] of [[700, 812, 130, 12], [1236, 798, 110, 10], [250, 1000, 160, 16], [1700, 1012, 150, 14], [1060, 1010, 90, 10]] as const) {
    const pud: PathFn = (c) => {
      c.beginPath();
      c.ellipse(px, py, pw, ph, 0, 0, P2);
      c.ellipse(px + pw * 0.5, py + ph * 0.3, pw * 0.5, ph * 0.8, 0, 0, P2);
    };
    within(ctx, pud, () => {
      vfill(ctx, px - pw, py - ph, pw * 2.2, ph * 2.2, [[0, 'rgba(120,124,128,0.22)'], [1, 'rgba(30,36,46,0.3)']]);
      ctx.fillStyle = rgba(px < 900 ? '#e8d0a0' : '#a8b4c4', 0.18);
      ctx.fillRect(px - pw * 0.6, py - ph * 0.5, pw * 0.8, 2);
    });
    ctx.strokeStyle = 'rgba(230,226,214,0.18)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(px, py, pw, ph, 0, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
  }
  // standing water: long pale sheets reflecting the break's light at the back
  for (let i = 0; i < 16; i++) {
    const x = r() * W;
    const y = TY + 8 + r() ** 1.6 * 220;
    const w = 60 + r() * 220;
    const g = ctx.createRadialGradient(x, y, 0, x, y, w);
    g.addColorStop(0, rgba(x < 900 ? '#e8d4b0' : '#a8b8c8', 0.12));
    g.addColorStop(1, rgba('#a8b8c8', 0));
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.12);
    ctx.translate(-x, -y);
    ctx.fillStyle = g;
    ctx.fillRect(x - w, y - w, w * 2, w * 2);
    ctx.restore();
  }
  lightPool(ctx, KR.brk.x + 80, TY + 40, 700, 80, '#f0d8a8', 0.08, 'screen');
  lightPool(ctx, KR.lantern.x + 30, TY + 90, 420, 110, '#ffb860', 0.1, 'screen');
  // weed and barnacles crusted along the front edge where the sea comes over
  lay(ctx, noiseMask(40, 207, { cover: 0.3, soft: 0.2, col: '#2a3e24', w: 400, h: 20 }), { x: 0, y: KR.front - 26, w: W, h: 26 }, 0.5);
  for (let i = 0; i < 30; i++) barnacles(ctx, r, r() * W, KR.front - 6 - r() * 14, 2 + Math.floor(r() * 4));
  ctx.restore();
  tableFalloff(ctx, KR.front, 0.38, '#0a0806');
  tableSeam(ctx, 0.55, '#0a0604', false);
  // the front: the deck's heavy edge timber, an iron strap at each joint
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, KR.front, W, 1080 - KR.front);
  ctx.clip();
  surface(ctx, r, { x: 0, y: KR.front, w: W, h: 40 }, '#4a3e32', { vary: 0.4, cells: 8, strokes: 1, strokeAng: 0, strokeLen: 160, strokeW: 3, grain: 0.25, seed: 209 });
  vfill(ctx, 0, KR.front, W, 40, [[0, 'rgba(255,240,220,0.14)'], [0.2, 'rgba(20,14,10,0)'], [1, 'rgba(10,6,4,0.55)']]);
  for (let x = 140; x < W; x += 360) {
    ctx.fillStyle = '#2a2624';
    ctx.fillRect(x, KR.front + 4, 26, 36);
    ctx.fillStyle = rgba('#8a8a88', 0.4);
    ctx.fillRect(x, KR.front + 4, 26, 2);
    for (const by of [KR.front + 12, KR.front + 28]) {
      ctx.fillStyle = '#0e0a08';
      ctx.beginPath();
      ctx.arc(x + 13, by, 3, 0, P2);
      ctx.fill();
    }
    streaks(ctx, r, x, KR.front + 30, 26, 12, '#7a3a1a', 0.4, 3);
  }
  ctx.restore();
  ctx.fillStyle = rgba('#e8dcc8', 0.3);
  ctx.fillRect(0, KR.front - 3, W, 3);
  ctx.fillStyle = 'rgba(10,6,4,0.8)';
  ctx.fillRect(0, KR.front, W, 2);
}

/** A coil of rope flaked down on the table's left corner, its end trailing off. */
function ropeCoil(ctx: Ctx, r: R): void {
  const x = 150;
  const y = 930;
  groundShadow(ctx, x + 18, y + 10, 116, 28, 0.75, '#060402', 1.3);
  const sq = 0.34;
  for (let k = 0; k < 7; k++) {
    const rx = 104 - k * 11;
    const cy = y - k * 3.2;
    // each turn: tarred hemp, its strands' twist lit on the upper left
    ctx.strokeStyle = '#140e08';
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.ellipse(x, cy, rx, rx * sq, 0, 0, P2);
    ctx.stroke();
    ctx.strokeStyle = shade('#8a7450', -k * 0.02);
    ctx.lineWidth = 8;
    ctx.stroke();
    for (let a = 0; a < P2; a += 0.11) {
      const px = x + Math.cos(a) * rx;
      const py = cy + Math.sin(a) * rx * sq;
      const lit = Math.sin(a) < 0 ? 0.35 : 0.12;
      ctx.strokeStyle = rgba('#e8d4a8', lit);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(px - 2.5, py - 3);
      ctx.lineTo(px + 2.5, py + 1);
      ctx.stroke();
      ctx.strokeStyle = rgba('#140e08', 0.35);
      ctx.beginPath();
      ctx.moveTo(px + 0.5, py - 3.4);
      ctx.lineTo(px + 4, py - 0.4);
      ctx.stroke();
    }
  }
  // the shadowed middle
  ctx.fillStyle = 'rgba(10,6,4,0.75)';
  ctx.beginPath();
  ctx.ellipse(x, y - 22, 26, 26 * sq, 0, 0, P2);
  ctx.fill();
  // the end, trailing out over the table to the right and whipped
  const tail = bez([x + 100, y + 6], [x + 150, y + 30], [x + 190, y + 8], [x + 236, y + 34], 30);
  for (const [lw, col] of [[11, '#140e08'], [8, '#8a7450']] as const) {
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    ctx.beginPath();
    tail.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.stroke();
  }
  groundShadow(ctx, x + 200, y + 34, 50, 6, 0.4, '#0a0604', 0.6);
  // the end: whipped with twine (a few tight turns), the strands frayed out past it
  const [ex, ey] = tail[tail.length - 1];
  const [qx, qy] = tail[tail.length - 4];
  const ang = Math.atan2(ey - qy, ex - qx);
  ctx.save();
  ctx.translate(ex, ey);
  ctx.rotate(ang);
  for (let k = 0; k < 4; k++) {
    ctx.fillStyle = k % 2 ? '#3a2e1e' : '#b8a478';
    ctx.fillRect(-12 + k * 2.4, -4.5, 2.2, 9);
  }
  ctx.strokeStyle = '#a08a60';
  ctx.lineWidth = 1.2;
  for (const a of [-0.5, -0.15, 0.2, 0.5]) {
    ctx.beginPath();
    ctx.moveTo(0, a * 6);
    ctx.quadraticCurveTo(5, a * 9, 9 + Math.abs(a) * 4, a * 14);
    ctx.stroke();
  }
  ctx.restore();
  void r;
}

function tableCoins(ctx: Ctx, r: R): void {
  for (const [cx, cy, s] of [[1720, 948, 10], [1734, 944, 10], [1726, 940, 10], [1760, 962, 9.5], [1690, 976, 10], [1800, 940, 9], [1652, 950, 9.5]] as const) {
    groundShadow(ctx, cx + 3, cy + 3, s * 1.25, s * 0.45, 0.85, '#040202', 0.5);
    coin(ctx, cx, cy, s, 0, r, 0.42);
  }
}

// ——— the grade and shade ———

function grade(ctx: Ctx): void {
  gradeAll(ctx, 0.05, '#a8b4c8', 0.05, { warm: '#ffd08a', cool: '#3a5aa0', a: 0.24 });
}

function shadeOver(ctx: Ctx): void {
  calmLanes(ctx, 0.1, '#0a121c', 80, 560);
  vignetteAll(ctx, 0.6, '#04080e');
}

// ——— the stack ———

const SKY_BOX = { x: 0, y: 0, w: W, h: HZ + 4 };
const CLOUD_BOX = { x: 0, y: 30, w: W, h: HZ - 30 };
const SEA_BOX = { x: 0, y: HZ, w: W, h: KR.deck - HZ + 4 };
/** The sea's live things: far arms rising, surf on the reef, spray thrown up behind the bulwark. */
const DEEP_BOX = { x: 0, y: 180, w: W, h: KR.deck - 180 };
const BULWARK_BOX = { x: 0, y: KR.cap - 26, w: W, h: KR.foot - KR.cap + 30 };
const DECK_BOX = { x: 0, y: KR.foot - 4, w: W, h: TY - KR.foot + 4 };
const ARM_SLOT = { x: ARM_BASE[0] + ARM_BOX.x, y: ARM_BASE[1] + ARM_BOX.y, w: ARM_BOX.w, h: ARM_BOX.h };
const COIL_BOX = { x: 0, y: MAST.top - 40, w: MAST.x + 110, h: MAST.base - MAST.top + 46 };
const CHEST_BOX = { x: KR.chest.x - 170, y: KR.chest.base - 230, w: 340, h: TY - KR.chest.base + 230 };
const RIGHT_BOX = { x: 1700, y: 430, w: 220, h: TY - 430 };

export const KRAKEN: SceneSpec = {
  id: 'kraken',
  info: {
    name: 'Shipwreck',
    subtitle: 'Boss: KRAKEN TOES',
    ambient: [],
    // (the lantern, the lighthouse and the gold's glints are the live layer's)
    glows: [],
    light: '#b8c0d0',
    tableTint: '#e8e8ee',
  },
  layers: [
    { id: 'sky', box: SKY_BOX, draw: sky },
    { id: 'clouds', box: CLOUD_BOX, motion: 'sprite', res: 0.5, draw: clouds },
    // lightning and the lighthouse's beam, over the sky and behind the far land
    { id: 'storm', box: { x: 0, y: 0, w: W, h: HZ }, motion: 'slot', draw: () => {} },
    { id: 'farLeft', box: LEFT_BOX, draw: farCoast },
    { id: 'headland', box: HEAD_BOX, draw: nearHeadland },
    { id: 'sea', box: SEA_BOX, draw: sea },
    { id: 'deep', box: DEEP_BOX, motion: 'slot', draw: () => {} },
    { id: 'bulwark', box: BULWARK_BOX, draw: bulwark },
    { id: 'deck', box: DECK_BOX, draw: deck },
    { id: 'lanternLight', box: { x: 0, y: KR.cap - 30, w: 640, h: TY - KR.cap + 30 }, draw: lanternLight },
    { id: 'armStill', box: ARM_SLOT, stillOnly: true, draw: (c) => armPaint(c, ARM_BASE[0], ARM_BASE[1], 0) },
    { id: 'arm', box: ARM_SLOT, motion: 'slot', draw: () => {} },
    { id: 'mastCoil', box: COIL_BOX, draw: mastCoil },
    { id: 'lantern', box: LANTERN_BOX, motion: 'sprite', draw: (c) => lantern(c, KR.lantern.x, KR.lantern.y) },
    { id: 'flameStill', box: { x: KR.lantern.x - 90, y: KR.lantern.y - 40, w: 180, h: 170 }, stillOnly: true, draw: lanternFlameStill },
    { id: 'chest', box: CHEST_BOX, draw: chest },
    { id: 'rightArm', box: RIGHT_BOX, draw: rightArm },
    { id: 'table', box: { x: 0, y: TY, w: W, h: 1080 - TY }, draw: table },
    { id: 'rope', box: { x: 20, y: 860, w: 440, h: 140 }, draw: ropeCoil },
    { id: 'coins', box: { x: 1620, y: 920, w: 210, h: 76 }, draw: tableCoins },
    { id: 'top', motion: 'top', draw: () => {} },
  ],
  grade,
  shade: shadeOver,
};

// ——— live: painted frames ———

/**
 * One frame of a far arm rising out of the sea (t 0 … 1 through its life), w×h, the waterline at (w/2, h - 10): it
 * breaks the surface in a ring of white water, rises curling, hangs, and slips back under, spray falling off it.
 * Seen far off at dusk: a dark form, its back caught by the break's light on the left.
 */
function riseFrame(c: Ctx, w: number, h: number, t: number): void {
  const sm = (a: number, b: number, x: number) => {
    const u = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return u * u * (3 - 2 * u);
  };
  const up = sm(0, 0.35, t) * (1 - sm(0.68, 1, t));
  const wl = h - 10;
  const L = (h - 30) * 1.05;
  const len = Math.max(4, L * up);
  if (up > 0.02) {
    // the arm slides up out of the water tip first: what shows is its last `up` of length, so it always tapers
    const curl = 2 + 4.5 * Math.sin(Math.min(1, t * 1.5) * Math.PI * 0.5);
    const k0 = 1 - up;
    const tube = tubeOf(
      spineFrom(w * 0.42, wl + 4, -Math.PI / 2 + 0.15, len, (v) => {
        const u = k0 + v * up;
        return (0.4 - (curl / 0.12) * Math.max(0, u - 0.6) ** 1.2) / L;
      }, 2),
      (v) => Math.max(1.2, 30 * (1 - (k0 + v * up)) ** 1.15),
    );
    c.save();
    c.beginPath();
    c.rect(0, 0, w, wl + 1);
    c.clip();
    tentacle(c, tube, { skin: '#3a2a4a', belly: '#6a5068', cup: '#1e1426', ink: '#1a1222', side: 1, line: 0.8, seed: 21, sheen: 0.4, rimA: 0.1, minSucker: 1.8 });
    // the break's light along its back
    c.save();
    tubePath(tube)(c);
    c.clip();
    c.strokeStyle = 'rgba(236,212,170,0.35)';
    c.lineWidth = 2;
    c.beginPath();
    tube.p.forEach((_, i) => {
      const [x, y] = off(tube, i, -0.7);
      if (i) c.lineTo(x, y);
      else c.moveTo(x, y);
    });
    c.stroke();
    c.restore();
    c.restore();
  }
  // the white water: a ring boiling up where it breaks the surface, spreading and thinning
  const rr = ((s: number) => () => (s = (s * 16807) % 2147483647) / 2147483647)(77);
  const ring = Math.sin(Math.min(1, t * 1.4) * Math.PI) * 0.8 + 0.2 * up;
  // a ring of churned water spreading out from it: broken white arcs on the dark sea, the far side thinner
  for (let j = 0; j < 3; j++) {
    const rad = 8 + t * 30 + j * 7;
    for (let k = 0; k < 10; k++) {
      const a0 = (k / 10) * P2 + rr() * 0.4;
      const far = Math.sin(a0) < 0;
      c.strokeStyle = `rgba(232,240,242,${(ring * (far ? 0.4 : 0.8) * (1 - j * 0.25)).toFixed(3)})`;
      c.lineWidth = far ? 1 : 1.8;
      c.beginPath();
      c.ellipse(w * 0.42, wl, rad, rad * 0.16, 0, a0, a0 + 0.35 + rr() * 0.3);
      c.stroke();
    }
  }
  // spray thrown up round it as it breaks the surface: crisp drops, lit on top
  const burst = Math.max(0, Math.sin(Math.min(1, t / 0.3) * Math.PI));
  for (let i = 0; i < 26; i++) {
    const x = w * 0.42 + (rr() - 0.5) * 40;
    const y = wl - rr() * 34 * burst;
    const sz = 0.8 + rr() * 1.6;
    if (burst < 0.05) break;
    c.fillStyle = `rgba(80,96,112,${(burst * 0.5).toFixed(3)})`;
    c.beginPath();
    c.arc(x + 0.5, y + 0.6, sz, 0, P2);
    c.fill();
    c.fillStyle = `rgba(240,246,248,${(burst * 0.85).toFixed(3)})`;
    c.beginPath();
    c.arc(x, y, sz * 0.8, 0, P2);
    c.fill();
  }
  // spray running off it as it sinks
  if (t > 0.6) {
    const k = Math.sin(((t - 0.6) / 0.4) * Math.PI);
    for (let i = 0; i < 18; i++) {
      const x = w * 0.42 + (rr() - 0.5) * 30;
      const y = wl - rr() * len * 0.9;
      const l = 3 + rr() * 4;
      const g = c.createLinearGradient(x, y - l, x, y);
      g.addColorStop(0, 'rgba(230,238,242,0)');
      g.addColorStop(1, `rgba(230,238,242,${(0.6 * k).toFixed(3)})`);
      c.strokeStyle = g;
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(x, y - l);
      c.lineTo(x, y);
      c.stroke();
    }
  }
}

function plumeFrameK(c: Ctx, w: number, h: number, t: number): void {
  // A sea striking the hull and thrown up behind the bulwark (t 0 … 1 through its life): a sheet of water that
  // rises in lobes, each lobe a hard white crest over a blue-grey body, breaking up into clots and drops as it
  // tops out and falls back. Its root at (w/2, h - 4).
  const rr = ((s: number) => () => (s = (s * 16807) % 2147483647) / 2147483647)(29);
  const T = 1.6;
  const G = 2.2 * h;
  const by = h - 4;
  // the lobes: each a column of water launched together, drawn as overlapping clots with crisp edges
  for (let l = 0; l < 5; l++) {
    const vx = (l - 2) * w * 0.09 + (rr() - 0.5) * w * 0.08;
    const vy = -h * (1.3 + rr() * 0.5) * (l === 2 ? 1.15 : 1);
    const d = rr() * 0.12;
    const tau = t * T - d;
    if (tau <= 0) continue;
    const life = Math.min(1, tau / (T - d));
    // the clots of this lobe trail from its head back down to the root (the sheet), then break apart
    const nC = 28;
    for (let k = 0; k < nC; k++) {
      const f = k / (nC - 1);
      const tt = tau * (0.35 + f * 0.65);
      const spread = 1 + life * 0.9 * f;
      const x = w / 2 + vx * tt * spread + (rr() - 0.5) * 8 * life;
      const y = by + vy * tt + 0.5 * G * tt * tt;
      if (y > by + 2) continue;
      const rad = (5 + f * 9) * (1 - life * 0.45) * (0.8 + rr() * 0.4);
      const a = (1 - life) ** 0.9 * Math.min(1, tau * 9);
      if (a < 0.02) continue;
      // body: blue-grey water, darker underneath
      c.fillStyle = `rgba(118,140,158,${(a * 0.85).toFixed(3)})`;
      c.beginPath();
      c.arc(x + rad * 0.12, y + rad * 0.18, rad, 0, P2);
      c.fill();
      // the white crest on its upper left, hard-edged
      c.fillStyle = `rgba(242,248,250,${(a * 0.95).toFixed(3)})`;
      c.beginPath();
      c.arc(x - rad * 0.12, y - rad * 0.16, rad * 0.78, 0, P2);
      c.fill();
    }
  }
  // the white water boiling at the root early on
  const sk = Math.max(0, 1 - t * 1.6);
  for (let i = 0; i < 9; i++) {
    const x = w / 2 + (rr() - 0.5) * w * 0.5 * (0.5 + t);
    const y = by - rr() * 16;
    const rad = 8 + rr() * 10;
    c.fillStyle = `rgba(232,240,244,${(sk * 0.7).toFixed(3)})`;
    c.beginPath();
    c.ellipse(x, y, rad * 1.4, rad * 0.6, 0, 0, P2);
    c.fill();
  }
  // drops flung off the tops: crisp, lit, falling faster than the sheet
  for (let i = 0; i < 60; i++) {
    const d = 0.12 + rr() * 0.25;
    const vx = (rr() - 0.5) * w * 0.8;
    const vy = -h * (1.3 + rr() * 0.7);
    const tau = t * T - d;
    if (tau <= 0) continue;
    const x = w / 2 + vx * tau;
    const y = by + vy * tau + 0.5 * G * 1.3 * tau * tau;
    if (y > by || x < 0 || x > w) continue;
    const a = (1 - tau / (T - d)) * 0.95;
    if (a <= 0) continue;
    const sz = 0.9 + rr() * 1.6;
    c.fillStyle = `rgba(90,116,136,${(a * 0.6).toFixed(3)})`;
    c.beginPath();
    c.arc(x + sz * 0.4, y + sz * 0.4, sz, 0, P2);
    c.fill();
    c.fillStyle = `rgba(250,253,255,${a.toFixed(3)})`;
    c.beginPath();
    c.arc(x, y, sz * 0.8, 0, P2);
    c.fill();
  }
  // feather the frame's edges
  c.globalCompositeOperation = 'destination-in';
  const eg = c.createLinearGradient(0, 0, w, 0);
  eg.addColorStop(0, 'rgba(0,0,0,0)');
  eg.addColorStop(0.1, 'rgba(0,0,0,1)');
  eg.addColorStop(0.9, 'rgba(0,0,0,1)');
  eg.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = eg;
  c.fillRect(0, 0, w, h);
  const tg = c.createLinearGradient(0, 0, 0, h);
  tg.addColorStop(0, 'rgba(0,0,0,0)');
  tg.addColorStop(0.08, 'rgba(0,0,0,1)');
  c.fillStyle = tg;
  c.fillRect(0, 0, w, h);
  c.globalCompositeOperation = 'source-over';
}

// ——— live ———

registerKitScene(KRAKEN, (k: KitLive) => {
  const clamp = Phaser.Math.Clamp;
  const top = k.slot('top');
  const deep = k.slot('deep');
  const stormSlot = k.slot('storm');
  const armSlot = k.slot('arm');
  const cloudsS = k.sprite('clouds');
  const cloudX = cloudsS.x;

  // ——— hero: the arm on the mast ———
  const AW = Math.ceil(ARM_BOX.w * ARM_RES);
  const AH = Math.ceil(ARM_BOX.h * ARM_RES);
  const armKey = sheet(k, 'kr_arm', AW, AH, ARM_N, (c, ph) => {
    c.scale(ARM_RES, ARM_RES);
    armPaint(c, -ARM_BOX.x, -ARM_BOX.y, ph);
  });
  const arm = new Loop(k, armKey, ARM_N, ARM_BASE[0], ARM_BASE[1], { into: armSlot, origin: [-ARM_BOX.x / ARM_BOX.w, -ARM_BOX.y / ARM_BOX.h], scale: 1 / ARM_RES, fps: 1.4 });
  const armJerk = new Spring(0, 30, 3.2);
  let armFast = 0;

  // ——— hero: the sea ———
  const SWW = 960;
  const SWH = 40;
  const swellKey = sheet(k, 'kr_swell', SWW, SWH, 3, (c, _p, i) => swellStrip(c, SWW, SWH, i));
  const swells = Array.from({ length: 7 }, (_, i) => ({
    img: k.img(swellKey, 960, HZ, { into: deep, tint: 0xa8b4bc }).setFrame(i % 3).setAlpha(0),
    u: i / 7,
    dx: (crand() - 0.5) * 300,
  }));
  const SFW = 140;
  const SFH = 50;
  const surfKey = sheet(k, 'kr_surf', SFW, SFH, 8, (c, ph) => surfFrame(c, SFW, SFH, ph));
  const surfs = ROCKS.map((rk, i) => new Loop(k, surfKey, 8, rk.x, rk.y + 4, { into: deep, origin: [0.5, 1], fps: 3 + i * 0.4, sx: rk.w / 130, sy: 0.3 + rk.h / 90, phase: i * 2.3 }));
  // the far arms: rising out of the sea now and then
  const RFW = 130;
  const RFH = 210;
  const RN = 10;
  const riseKey = sheet(k, 'kr_rise', RFW, RFH, RN, (c, ph) => riseFrame(c, RFW, RFH, ph + 0.5 / RN));
  type Rise = { loop: Loop; age: number; dur: number; on: boolean };
  const rises: Rise[] = Array.from({ length: 2 }, () => {
    const loop = new Loop(k, riseKey, RN, 0, 0, { into: deep, origin: [0.5, (RFH - 10) / RFH] });
    loop.each((im) => im.setVisible(false));
    return { loop, age: 0, dur: 5, on: false };
  });
  let nextRise = 3 + crand() * 4;
  const rise = () => {
    const r0 = rises.find((q) => !q.on);
    if (!r0) return;
    r0.on = true;
    r0.age = 0;
    r0.dur = 4.5 + crand() * 2;
    const x = 560 + crand() * 840;
    const s = 0.9 + crand() * 0.6;
    const y = HZ + 8 + (s - 0.9) * 50;
    r0.loop.each((im) => im.setVisible(true).setPosition(x, y).setScale(s * (crand() < 0.5 ? -1 : 1), s));
  };

  // spray thrown up behind the bulwark
  const PW = 160;
  const PH = 170;
  const PN = 10;
  const plumeKey = sheet(k, 'kr_plume', PW, PH, PN, (c, ph) => plumeFrameK(c, PW, PH, ph + 0.5 / PN));
  type Plume = { loop: Loop; age: number; dur: number; on: boolean; x: number; drops: boolean };
  const plumes: Plume[] = Array.from({ length: 4 }, () => {
    const loop = new Loop(k, plumeKey, PN, 0, KR.foot + 20, { into: deep, origin: [0.5, 1], scale: 2, tint: 0xe4eaee });
    loop.each((im) => im.setVisible(false));
    return { loop, age: 0, dur: 1.7, on: false, x: 0, drops: false };
  });
  const drops = new Parts(k, { frame: 'drop', into: top, max: 160 });
  const mist = new Parts(k, { frame: 'puff', into: top, max: 40 });
  const splashes = new Parts(k, { frame: 'mote', into: top, max: 140 });
  const splash = (x: number, y: number) => {
    for (let i = 0; i < 3; i++) splashes.spawn({ x, y, vx: (crand() - 0.5) * 60, vy: -30 - crand() * 50, life: 0.3, r0: 3, r1: 1.5, a: 0.55, tint: 0xdce6ec, grav: 600, fade: 0.05 });
  };
  const plume = (x: number, power: number) => {
    const p = plumes.find((q) => !q.on) ?? plumes.reduce((a, b) => (a.age > b.age ? a : b));
    p.on = true;
    p.age = 0;
    p.x = clamp(x, 60, W - 60);
    p.drops = false;
    p.dur = 1.5 + power * 0.4;
    const sc = 1.5 + power * 1.3;
    p.loop.each((im) => im.setVisible(true).setPosition(p.x, KR.foot + 20).setScale(sc * (crand() < 0.5 ? -1 : 1), sc));
  };

  // ——— the lantern: swinging on its hook, its flame flickering, its light moving with it ———
  const lan = k.pivot(k.sprite('lantern'), KR.lantern.x, KR.lantern.y);
  const lanS = new Swing(lan, { k: 9, c: 0.5, idle: 0.04, seed: 3 });
  const flameKey = sheet(k, 'kr_flame', 28, 40, 8, (c, ph) => flameFrame(c, 28, 40, ph));
  const flame = new Loop(k, flameKey, 8, KR.lantern.x, KR.lantern.y + KR.lantern.flame, { into: top, origin: [0.5, 0.95], scale: 0.5, fps: 9 });
  const lanCore = k.glow(0, 0, 40, 0xffe0a0, 0.6, { into: top });
  const lanHalo = k.glow(0, 0, 150, 0xffb058, 0.3, { into: top });
  const lanPool = k.glow(KR.lantern.x + 20, KR.deck, 240, 0xffb060, 0.2, { into: top, sy: 0.15 });

  // ——— the gold: glints on the heap, more when the lightning flashes ———
  const glints = new Parts(k, { frame: 'spark', add: true, into: top, max: 40 });
  const glintRate = new Rate();
  const { x: chx, base: chb } = KR.chest;
  const glint = (big = 1) => {
    const u = crand();
    glints.spawn({ x: chx - 70 + u * 140, y: chb - 72 - Math.sin(u * Math.PI) * 28 + crand() * 14, life: 0.25 + crand() * 0.35, r0: (5 + crand() * 6) * big, r1: 1, a: 0.9, tint: 0xfff0c0, fade: 0.3 });
  };

  // ——— the storm ———
  const BW = 150;
  const BH = 270;
  const boltKey = sheet(k, 'kr_bolt', BW, BH, 3, (c, _p, i) => boltFrame(c, BW, BH, i));
  const bolt = k.img(boltKey, 800, HZ, { into: stormSlot, add: true, origin: [0.5, 1] }).setAlpha(0);
  const skyFlash = k.wash(0xc8d0ff, 0, Phaser.BlendModes.ADD, stormSlot);
  const beamKey = k.tex('kr_beam', 512, 64, (c) => beamTex(c, 512, 64));
  const beam = k.img(beamKey, KR.lh.x, KR.lh.y, { into: stormSlot, add: true, origin: [0, 0.5] }).setAlpha(0);
  const lhGlow = k.glow(KR.lh.x, KR.lh.y, 70, 0xfff0c0, 0.5, { into: top });
  const lhFlash = k.glow(KR.lh.x, KR.lh.y, 60, 0xfff4d8, 0, { into: top });
  let boltT = 0;
  let nextBolt = 3 + crand() * 4;
  let flash = 0;
  const T = 256;
  const rainFar = k.sc.add.tileSprite(0, 0, W, 1080, k.tex('kr_rain0', T, T, (c) => rainTile(c, T, 0))).setOrigin(0, 0).setAlpha(0.45);
  const rainNear = k.sc.add.tileSprite(0, 0, W, 1080, k.tex('kr_rain1', T, T, (c) => rainTile(c, T, 1))).setOrigin(0, 0).setAlpha(0.35);
  top.add([rainFar, rainNear]);
  const flashTop = k.wash(0xe0e8ff, 0, Phaser.BlendModes.ADD, top);
  const splashRate = new Rate();
  const plumeRate = new Rate();
  const dripRate = new Rate();

  return {
    impact(x, _y, p) {
      // the wreck shudders on the reef: a sea slams up her side nearest the stomp
      plume(x + (crand() - 0.5) * 120, clamp(0.45 + p * 0.55, 0, 1));
      lanS.kick((x < KR.lantern.x ? 1 : -1) * (0.5 + crand() * 0.4) * p + (crand() - 0.5) * 0.4 * p);
      // the arm on the mast lashes and squeezes
      armFast = Math.max(armFast, 0.6 + p);
      armJerk.v += (crand() < 0.5 ? -1 : 1) * 1.4 * p;
      for (let i = 0; i < 6 * p; i++) glint(1.2);
      // water shaken off the cap rail
      for (let i = 0; i < 10 * p; i++) drops.spawn({ x: x + (crand() - 0.5) * 500, y: KR.cap + 4, vx: (crand() - 0.5) * 30, vy: crand() * 40, life: 1.2, r0: 3, a: 0.65, tint: 0xd4e0e8, grav: 900, floor: KR.deck + crand() * 40, onFloor: splash, streak: 0.02 });
      if (p > 0.7 && crand() < 0.35) rise();
    },
    update(dt, t) {
      cloudsS.x = cloudX + Math.sin(t * 0.03) * 50 * calm();
      const wind = 2;

      // ——— the arm on the mast
      armFast = Math.max(0, armFast - dt * 0.7);
      arm.step(dt, (1 + armFast * 3.5) * calm());
      const jerk = armJerk.step(0, dt);
      arm.each((im) => im.setRotation(jerk * 0.12 + Math.sin(t * 0.7) * 0.02 * calm()));

      // ——— the sea
      for (const sw of swells) {
        sw.u += (dt / (16 / wind)) * calm();
        if (sw.u >= 1) {
          sw.u -= 1;
          sw.dx = (crand() - 0.5) * 300;
          sw.img.setFrame(Math.floor(crand() * 3));
        }
        const u = sw.u;
        const y = HZ + 6 + u ** 1.6 * (KR.cap - HZ + 20);
        sw.img.setPosition(960 + sw.dx * (1 - u), y).setScale(2.2 + u * 0.6, 0.12 + u * 1.8).setAlpha(Math.sin(u * Math.PI) * 0.8);
      }
      for (const s of surfs) {
        s.step(dt, wind * 0.6 * calm());
        s.alpha = 0.75;
      }
      nextRise -= dt;
      if (nextRise <= 0) {
        nextRise = 9 + crand() * 8;
        rise();
      }
      for (const r0 of rises) {
        if (!r0.on) continue;
        r0.age += dt * calm();
        const u = r0.age / r0.dur;
        if (u >= 1) {
          r0.on = false;
          r0.loop.each((im) => im.setVisible(false));
          continue;
        }
        r0.loop.alpha = 0.95;
        r0.loop.show(u * (RN - 1));
        const lit = 1 + flash * 0.6;
        r0.loop.each((im) => im.setTint(Phaser.Display.Color.GetColor(Math.min(255, 190 * lit), Math.min(255, 196 * lit), Math.min(255, 210 * lit))));
      }
      plumeRate.tick(0.28 * calm(), dt, () => plume(160 + crand() * 1600, 0.35 + crand() * 0.35));
      for (const p of plumes) {
        if (!p.on) continue;
        p.age += dt;
        const u = p.age / p.dur;
        if (u >= 1) {
          p.on = false;
          p.loop.each((im) => im.setVisible(false));
          continue;
        }
        p.loop.alpha = Math.min(1, (1 - u) * 3) * 0.95;
        p.loop.show(u * (PN - 1));
        if (!p.drops && u > 0.22) {
          p.drops = true;
          const sc = Math.abs(p.loop.a.scaleX);
          const n = Math.round(10 + sc * 10);
          for (let i = 0; i < n; i++) drops.spawn({ x: p.x + (crand() - 0.5) * 120 * sc, y: KR.cap - 30 - crand() * 120 * sc, vx: (crand() - 0.5) * 160 - wind * 30, vy: -60 - crand() * 220, life: 1.6, r0: 3 + crand() * 3, a: 0.8, tint: 0xe6eef2, grav: 1100, floor: KR.deck + 10 + crand() * 220, onFloor: splash, streak: 0.025 });
          for (let i = 0; i < 3 + sc * 2; i++) mist.spawn({ x: p.x + (crand() - 0.5) * 140, y: KR.cap - 60 - crand() * 100, vx: -30 - wind * 25, vy: -10 + crand() * 20, life: 2 + crand(), r0: 20, r1: 70 + crand() * 40, a: 0.2, tint: 0xdce4ea, drag: 0.4, fade: 0.2 });
        }
      }
      drops.update(dt);
      mist.update(dt);

      // ——— the lantern
      lanS.update(dt, t);
      const a = lan.rotation;
      const fx = KR.lantern.x - Math.sin(a) * KR.lantern.flame;
      const fy = KR.lantern.y + Math.cos(a) * KR.lantern.flame;
      flame.step(dt);
      flame.each((im) => im.setPosition(fx, fy).setRotation(a * 0.5));
      const n = 0.9 + flicker(t * 1.3, 7) * 0.1;
      lanCore.setPosition(fx, fy - 6).setAlpha(0.5 * n);
      lanHalo.setPosition(fx, fy - 4).setAlpha(0.22 * n);
      lanPool.setX(KR.lantern.x + 20 - Math.sin(a) * 260).setAlpha(0.16 * n);

      // ——— the gold
      glintRate.tick(2.5 * calm(), dt, () => glint());
      glints.update(dt);

      // ——— the lighthouse's beam sweeping round
      const th = t * 0.9;
      const cs = Math.cos(th);
      const sn = Math.sin(th);
      beam.setScale(cs * 1.6, 0.6 + (1 - Math.abs(cs)) * 1.6).setRotation(0.03 * Math.sign(cs)).setAlpha((0.28 + Math.max(0, sn) * 0.35) * Math.abs(cs) ** 0.3);
      lhGlow.setAlpha(0.6);
      lhFlash.setAlpha(Math.max(0, sn) ** 8 * 0.45);

      // ——— lightning
      boltT += dt;
      if (boltT > nextBolt) {
        boltT = 0;
        nextBolt = 5 + crand() * 7;
        flash = 1;
        bolt.setFrame(Math.floor(crand() * 3)).setPosition(300 + crand() * 1100, HZ + 2).setScale((crand() < 0.5 ? -1 : 1) * (0.8 + crand() * 0.5), 0.9 + crand() * 0.3);
        for (let i = 0; i < 6; i++) glint(1.4);
      }
      if (flash > 0) flash = Math.max(0, flash - dt * 2.6);
      const fl = flash * (0.6 + 0.4 * Math.sin(flash * 40));
      bolt.setAlpha(clamp(fl * 1.4, 0, 1));
      skyFlash.setAlpha(fl * 0.35);
      flashTop.setAlpha(fl * 0.08);

      // ——— the rain, splashes on the deck and the table, drips off the cap rail
      rainFar.tilePositionY -= 380 * dt * calm();
      rainFar.tilePositionX += 90 * wind * dt * calm();
      rainNear.tilePositionY -= 900 * dt * calm();
      rainNear.tilePositionX += 220 * wind * dt * calm();
      splashRate.tick(30 * calm(), dt, () => splash(crand() * W, KR.foot + crand() * (KR.front - KR.foot)));
      dripRate.tick(4 * calm(), dt, () => drops.spawn({ x: crand() * W, y: KR.capLow, life: 1, r0: 2.5, a: 0.55, tint: 0xd4e0e8, grav: 900, floor: KR.deck + crand() * 16, onFloor: splash, streak: 0.02 }));
      splashes.update(dt);
    },
  };
});
