// The Titans' Prison (the arena of KRONOS THE TITAN KING, the mini-boss of Tartarus when the Kratos hero peel is
// equipped, wave 88: src/game/nemesis.ts), redrawn with the location kit (src/art/scene). Below the Styx of Tartarus
// (scene-tartarus.ts) and the throne hall's chasm (scene-hades.ts): the deepest prison, where the Titans are chained.
//
// Built at a Titan's scale (Kronos's stone head, rising out of the lava in the fight, is some 1200 px across): a
// chasm of black columnar basalt a couple of hundred metres across, filled with a lake of lava. Its walls are cliffs
// of jointed prisms rising sheer out of the frame and lost in smoke and dark hundreds of metres up, overhanging at the
// top corners; there is no roof to see. Things a man's size give the scale: a stair cut into the left cliff, its
// steps a few pixels high, climbing in switchbacks out of the frame past doorways with a lamp burning in one, a bronze
// ring for a Titan set in the rock beside them, and two galleries of cell doors cut in the right cliff, chain rings
// beside them.
//
// Across the lake, some two hundred metres off and veiled in haze and smoke, the far wall: the prison's great dial cut
// into it, half sunk in the lava (a stone ring of twelve moons, new at the top and full under the lava, a band of
// running waves, a bronze pin at its hub and one hand left, a sickle, the other snapped off; cracked right through,
// a piece of the ring fallen out), and before it, either side, a Titan sunk to the waist in the lava, hunched, head
// bowed between his shoulders, his arms hanging, chained at the wrists down into the lava: huge, dim shapes in the
// haze, backlit by its smoke. Golden sand pours in four streams (stolen time) into the lava, hissing and glittering
// where it lands: two near us out of cracks in the overhangs, two far off beside the Titans, out of the dark.
// The lava is a lake of crust: black plates riding on it, split by glowing seams, smaller and dimmer far off. On the
// left a colossal fluted column stands broken in the lava, a bronze band round its foot and a drum fallen beside it;
// on the right a Titan's statue has toppled, all but its foot, still standing in its sandal on the plinth, broken off
// at the shin, pieces of the rest half sunk round the plinth. Talus of fallen blocks slopes into the lava at the
// cliffs' feet, and each cliff is broken by a tier of fanned, crooked columns over its lower colonnade. Our side is a ledge of basalt, the columns' hexagonal tops worn into a pavement, its lip hot where the lava
// laps it (the lip follows titanDevour.ts's RIDGE exactly: the Titan's head rises out of the lava behind it). The
// table is a slab of the same basalt, polished, its bronze rim in the key pattern of Tartarus.
//
// No chains near us or over the middle: Kronos's own chains (src/game/skyChains.ts) are the only ones that should
// read there. The only chains here bind the far Titans, small and dim in the haze. Every emblem is our own (the
// moons, the waves, the sickle, the sandal's knot).
//
// Live, the heroes:
// - the sand: each stream a painted frame loop of falling grains, clumps and glints, fading in out of the dark and
//   frayed at its foot, a plume of gold dust and a hiss of hot light where it meets the lava, glints falling beside it;
// - the lava: crust domes swelling, splitting, bursting and crusting over again (a painted frame loop), its glow
//   breathing, hot currents drifting under the crust, heat haze over it (a painted frame loop), embers rising;
// - the smoke: two banks of it, lit red from below, drifting slowly across the chasm between us and the far wall;
// and dust and pebbles shaken out of the dark by stomps, falling into the lava with a spit of light.
//
// It answers the fight (the brain in src/game/bosses/titanking.ts emits these):
// - 'titanking-glass' (the hourglass flips): the dial's twelve moons glint gold and fade, the sand glitters;
// - 'titanking-devour' (x: the head rises): the lava surges and boils there, embers burst;
// - 'titanking-pull' (1 when he starts hauling on his chains, 0 when it ends): the sand streams pour thick and dust
//   and stones rain out of the dark;
// - 'titanking-shield' (he's unchained and raises his shield): the whole lake flares.
// The listeners are removed on scene SHUTDOWN. On the stages page the biggest stomps play these cues instead.

import Phaser from 'phaser';
import { type Ctx, type R, TY, W, calmLanes, crevice, lightPool, polyPath, vfill, vignetteAll, within } from '../../art/scene/kit';
import type { SceneSpec } from '../../art/scene/layers';
import { grain, tableFalloff } from '../../art/scene/materials';
import { crack, drift, lay, noiseMask, softly, streaks } from '../../art/scene/paint';
import { ZB, xAt, yAt, zFront } from '../../art/sceneKit';
import { hashStr, makeCanvas, mix, rgba, rng } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { Loop, Parts, Rate, sheet } from '../../game/sceneAnim';
import { type KitLive, calm, flicker, registerKitScene } from '../../game/sceneLive';
import { ridgeAt } from '../../game/bosses/titanDevour';
import { BRZ, KEY_U, SLAB, chain, rimBand } from './scene-tartarus';

type Pt = [number, number];
type Box = { x: number; y: number; w: number; h: number };
const P2 = Math.PI * 2;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (e0: number, e1: number, v: number) => {
  const t = clamp01((v - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
const boxOfPts = (pts: Pt[], pad = 4): Box => {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x = Math.floor(Math.min(...xs) - pad);
  const y = Math.floor(Math.min(...ys) - pad);
  return { x, y, w: Math.ceil(Math.max(...xs) + pad - x), h: Math.ceil(Math.max(...ys) + pad - y) };
};
const line = (ctx: Ctx, a: Pt, b: Pt, col: string, w: number) => {
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
};

// ——— the view ———
//
// Units of about three metres: X across, Y up from the lava, z away. The eye EH above the lava (a little above our
// ledge), the vanishing point in the middle at HZ. The lava's near edge (our ledge's lip) is at z 10, the far wall at
// ZF (some 190 m off), the side walls at ±XW. The walls rise out of the frame; there is no roof to see. (The table has
// the game's own perspective.)

const F = 1100;
const HZ = 400;
const EH = 2.5;
const XW = 21;
const ZF = 62;
const sx = (X: number, z: number) => 960 + (F * X) / z;
const sy = (Y: number, z: number) => HZ + (F * (EH - Y)) / z;
const P = (X: number, Y: number, z: number): Pt => [sx(X, z), sy(Y, z)];
/** Screen px per unit at depth z. */
const pz = (z: number) => F / z;
/** The lava's depth at screen y. */
const zAtY = (y: number) => (F * EH) / Math.max(1, y - HZ);
/** The lava's screen y at depth z. */
const lavaY = (z: number) => sy(0, z);

/** The lava's far shore: the side walls' feet, and the far wall's. */
const SHORE_FAR = lavaY(ZF);
/** Where the left wall meets the far wall (screen x). */
const CORNER = sx(-XW, ZF);
const shoreY = (x: number): number => {
  if (x < CORNER) return HZ + (EH / XW) * (960 - x);
  if (x > W - CORNER) return HZ + (EH / XW) * (x - 960);
  return SHORE_FAR + Math.sin(x * 0.031) * 1;
};
/** The pit's near edge: our ledge's lip (the Titan's head is clipped here: titanDevour.ts). */
const lipY = (x: number) => ridgeAt(Math.max(0, Math.min(W, x))) - 3;

/** The layout the live layer relies on. */
export const TK = {
  front: 1040,
  /** The dial cut in the far wall: its centre and radius (screen px), half sunk in the lava. */
  dial: { x: 960, y: 456, r: 236 },
  /** The sand streams: X and z where they pour into the lava (out of the dark above), and how thick (units). */
  sand: [
    { X: -13.4, z: 20.5, w: 0.34 },
    { X: -19.6, z: 59, w: 0.3 },
    { X: 19.8, z: 59, w: 0.3 },
    { X: 13.6, z: 20.5, w: 0.34 },
  ],
  /** The far Titans chained to the far wall, sunk to the waist in the lava: X, z, size. */
  titans: [
    { X: -13.6, z: 56, s: 1.2, lean: -0.05 },
    { X: 13.8, z: 56.5, s: 1.15, lean: 0.06 },
  ],
};
/** The lip of the overhanging cliffs at the top corners (screen y at screen x, 0 where they end). */
const overhangY = (x: number): number => {
  const d = Math.min(x, W - x);
  const t = Math.min(1, d / 640);
  return Math.max(0, 150 * (1 - t) ** 1.6 - 14 * t + Math.sin(d * 0.07) * 4);
};
/** Each sand stream on screen: x, its top (out of the dark above the frame), its foot (the lava), its width, scale. */
const STREAMS = TK.sand.map((s) => {
  const [x] = P(s.X, 0, s.z);
  return { x, top: s.z < 30 ? overhangY(x) - 6 : -20, bot: lavaY(s.z), w: s.w * pz(s.z), k: pz(s.z) / pz(20), z: s.z };
});

// ——— colours and light ———

const BAS = { deep: '#060408', body: '#141018', mid: '#221c28', lit: '#3a3244', cool: '#525a78' };
const LAVA = { crust: '#140605', deep: '#5a1206', body: '#c8401a', hot: '#ff9a3a' };
const GOLD = { deep: '#6a4410', body: '#d8a040', lit: '#ffe08a', white: '#fff8e0' };
/** The chasm's air at height Y: smoke lit red low over the lava, grey-blue haze higher up. */
const hazeAt = (Y: number) => mix('#4a1a14', '#2a2a38', clamp01(Y / 16));

/** Basalt at height Y facing the pit by `pit` (0…1) and the faint key by `key`: the lava's light rising from below,
 * strongest at its foot, the dark high up. */
function basaltAt(Y: number, pit: number, key: number, tone = 0): string {
  const up = pit * (0.06 + 0.94 * Math.exp(-Math.max(0, Y) / 4));
  let c = mix('#0c0a0e', '#2a2530', clamp01(key * 0.9 + tone * 0.3));
  c = mix(c, BAS.cool, key * 0.14);
  c = mix(c, '#4a1a12', clamp01(up * 1.25));
  c = mix(c, '#b04626', clamp01(up - 0.5) * 0.9);
  c = mix(c, BAS.deep, clamp01((Y - 5) / 18) * 0.85);
  return c;
}

// ——— basalt prisms ———

interface Prism {
  X: number;
  z: number;
  Y0: number;
  Y1: number;
  /** Corners: angle and radius. */
  verts: [number, number][];
  /** Where its joints cross it (Y). */
  joints: number[];
  tone: number;
  seed: number;
}

function makePrism(r: R, X: number, z: number, rad: number, Y0: number, Y1: number, jStep = 1.1, hexRot?: number): Prism {
  const n = hexRot !== undefined ? 6 : 5 + Math.floor(r() * 3);
  const rot = hexRot ?? r() * P2;
  const jit = hexRot !== undefined ? 0.12 : 0.35;
  const verts: [number, number][] = Array.from({ length: n }, (_, i) => [rot + ((i + (r() - 0.5) * jit) / n) * P2, rad * (hexRot !== undefined ? 0.96 + r() * 0.06 : 0.86 + r() * 0.22)]);
  const joints: number[] = [];
  for (let y = Y0 + jStep * (0.3 + r() * 0.7); y < Y1 - 0.05; y += jStep * (0.5 + r() * 0.9)) joints.push(y);
  return { X, z, Y0, Y1, verts, joints, tone: r(), seed: Math.floor(r() * 1e6) };
}

const cornerW = (p: Prism, i: number): Pt => {
  const [a, rr] = p.verts[((i % p.verts.length) + p.verts.length) % p.verts.length];
  return [p.X + Math.cos(a) * rr, p.z + Math.sin(a) * rr];
};
const cornerS = (p: Prism, i: number, Y: number): Pt => {
  const [X, z] = cornerW(p, i);
  return P(X, Y, z);
};

interface Face {
  i: number;
  nx: number;
  nz: number;
  mx: number;
  mz: number;
  d: number;
}

/** The side faces of a prism turned to us, back to front. */
function facesOf(p: Prism): Face[] {
  const out: Face[] = [];
  const n = p.verts.length;
  for (let i = 0; i < n; i++) {
    const [x0, z0] = cornerW(p, i);
    const [x1, z1] = cornerW(p, i + 1);
    let nx = z1 - z0;
    let nz = -(x1 - x0);
    const nl = Math.hypot(nx, nz) || 1;
    nx /= nl;
    nz /= nl;
    const mx = (x0 + x1) / 2;
    const mz = (z0 + z1) / 2;
    if (nx * (mx - p.X) + nz * (mz - p.z) < 0) {
      nx = -nx;
      nz = -nz;
    }
    if (nx * -mx + nz * -mz > 0) out.push({ i, nx, nz, mx, mz, d: Math.hypot(mx, mz) });
  }
  return out.sort((a, b) => b.d - a.d);
}

/** How much a face looks towards the pit's middle (the lava's light). */
const pitFacing = (f: Face) => {
  const dx = 0 - f.mx;
  const dz = 32 - f.mz;
  const l = Math.hypot(dx, dz) || 1;
  return clamp01(0.12 + 0.88 * clamp01((f.nx * dx + f.nz * dz) / l) ** 1.3);
};
const keyFacing = (f: Face) => clamp01(-f.nx * 0.7 - f.nz * 0.35);

/** A basalt prism: its faces lit from below by the lava (a gradient up each face), its joints across it with a lit
 * lower lip, striations down it, its arrises catching the light; its top (when below our eye) or its underside (above
 * it) as asked. */
function prism(ctx: Ctx, p: Prism, o: { heat?: number; top?: boolean; under?: number; air?: number; detail?: number } = {}): void {
  const heat = o.heat ?? 1;
  const air = o.air ?? 0;
  const det = o.detail ?? 1;
  const faces = facesOf(p);
  const k = pz(p.z);
  const fcol: number[] = [];
  for (const f of faces) {
    const quad: Pt[] = [cornerS(p, f.i, p.Y0), cornerS(p, f.i + 1, p.Y0), cornerS(p, f.i + 1, p.Y1), cornerS(p, f.i, p.Y1)];
    const path = polyPath(quad);
    const pit = pitFacing(f) * heat;
    const key = keyFacing(f);
    fcol.push(pit * 0.6 + key);
    const yTop = (quad[2][1] + quad[3][1]) / 2;
    const yBot = (quad[0][1] + quad[1][1]) / 2;
    const g = ctx.createLinearGradient(0, yTop, 0, yBot);
    for (const t of [0, 0.3, 0.6, 0.85, 1]) {
      const Y = p.Y1 + (p.Y0 - p.Y1) * t;
      g.addColorStop(t, mix(basaltAt(Y, pit, key, p.tone), hazeAt(Y), air));
    }
    ctx.fillStyle = g;
    path(ctx);
    ctx.fill();
    if (det > 0 && k > 9) {
      within(ctx, path, () => {
        const fb = boxOfPts(quad, 1);
        // striations: faint cooling lines down the face
        const ns = Math.max(1, Math.round((fb.w / 14) * det));
        for (let s = 0; s < ns; s++) {
          const t = (s + 0.5 + ((p.seed * (s + 3)) % 7) / 14 - 0.25) / ns;
          const a = [quad[0][0] + (quad[1][0] - quad[0][0]) * t, quad[0][1] + (quad[1][1] - quad[0][1]) * t] as Pt;
          const b = [quad[3][0] + (quad[2][0] - quad[3][0]) * t, quad[3][1] + (quad[2][1] - quad[3][1]) * t] as Pt;
          line(ctx, a, b, s % 2 ? 'rgba(0,0,0,0.16)' : rgba('#a08890', 0.035 + key * 0.05), 1);
        }
        // the joints: a dark gap, the lip under it lit from the lava below
        for (const Y of p.joints) {
          const a0 = cornerS(p, f.i, Y);
          const a1 = cornerS(p, f.i + 1, Y);
          line(ctx, a0, a1, 'rgba(2,1,3,0.75)', Math.max(1, k * 0.012));
          const up = pit * Math.exp(-Math.max(0, Y) / 6);
          line(ctx, [a0[0], a0[1] - Math.max(1.2, k * 0.012)], [a1[0], a1[1] - Math.max(1.2, k * 0.012)], rgba(mix('#8a7a88', '#ff7a3a', clamp01(up * 1.6)), 0.06 + up * 0.35 + key * 0.06), 1);
        }
      });
    }
    ctx.strokeStyle = 'rgba(2,1,3,0.8)';
    ctx.lineWidth = Math.max(0.6, Math.min(1.4, k * 0.012));
    path(ctx);
    ctx.stroke();
  }
  // the arrises where a lit face turns into a darker one
  for (let q = 1; q < faces.length; q++) {
    const a = faces[q - 1];
    const b = faces[q];
    const n = p.verts.length;
    const shared = (a.i + 1) % n === b.i ? b.i : (b.i + 1) % n === a.i ? a.i : -1;
    if (shared < 0) continue;
    const y0 = Math.max(p.Y0, 0);
    const g0 = cornerS(p, shared, y0);
    const g1 = cornerS(p, shared, Math.min(p.Y1, 40));
    const g = ctx.createLinearGradient(0, g1[1], 0, g0[1]);
    const lit = Math.abs(fcol[q] - fcol[q - 1]);
    g.addColorStop(0, 'rgba(255,120,60,0)');
    g.addColorStop(0.6, rgba('#ff8a4a', 0.04 + lit * 0.12));
    g.addColorStop(1, rgba('#ffa060', 0.12 + lit * 0.3 * heat));
    line(ctx, g0, g1, '#000', 0);
    ctx.strokeStyle = g;
    ctx.lineWidth = Math.max(0.8, k * 0.012);
    ctx.beginPath();
    ctx.moveTo(g0[0], g0[1]);
    ctx.lineTo(g1[0], g1[1]);
    ctx.stroke();
  }
  const n = p.verts.length;
  if (o.top && p.Y1 < EH - 0.05) {
    // its top, seen from above: worn, the far edge hot with the lava's glow beyond, ash and grit in it
    const top = Array.from({ length: n }, (_, i) => cornerS(p, i, p.Y1));
    const tp = polyPath(top);
    const tb = boxOfPts(top, 1);
    const up = Math.exp(-Math.max(0, p.Y1) / 4) * heat;
    ctx.fillStyle = mix(mix('#3e3440', '#5e4e56', p.tone), '#7a3a26', clamp01(up * 0.45));
    tp(ctx);
    ctx.fill();
    within(ctx, tp, () => {
      const g = ctx.createLinearGradient(0, tb.y, 0, tb.y + tb.h);
      g.addColorStop(0, rgba('#ff6a2a', 0.22 + up * 0.25));
      g.addColorStop(0.55, 'rgba(255,100,40,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.18)');
      ctx.fillStyle = g;
      ctx.fillRect(tb.x, tb.y, tb.w, tb.h);
      if (k > 20) lay(ctx, noiseMask(3, p.seed % 97, { cover: 0.42, soft: 0.35, col: '#9a8a90', w: 14, h: 14 }), tb, 0.4);
    });
    ctx.strokeStyle = 'rgba(2,1,3,0.9)';
    ctx.lineWidth = Math.max(0.6, Math.min(1.3, k * 0.012));
    tp(ctx);
    ctx.stroke();
    for (let i = 0; i < n; i++) {
      const a = top[i];
      const b = top[(i + 1) % n];
      const back = (a[1] + b[1]) / 2 < sy(p.Y1, p.z);
      line(ctx, [a[0], a[1] + (back ? 0.6 : -0.6)], [b[0], b[1] + (back ? 0.6 : -0.6)], back ? rgba('#ff7a3a', 0.25 + up * 0.35) : rgba('#c8b8c8', 0.1), 1);
    }
  }
  if (o.under !== undefined && p.Y0 > EH + 0.05) {
    // its broken underside, seen from below: lit by the lava
    const und = Array.from({ length: n }, (_, i) => cornerS(p, i, p.Y0));
    const up = polyPath(und);
    const ub = boxOfPts(und, 1);
    const u = o.under;
    ctx.fillStyle = mix(mix('#140a0c', '#22100e', p.tone), '#8a3018', clamp01(u));
    up(ctx);
    ctx.fill();
    within(ctx, up, () => {
      const g = ctx.createLinearGradient(0, ub.y, 0, ub.y + ub.h);
      g.addColorStop(0, 'rgba(0,0,0,0.4)');
      g.addColorStop(1, rgba('#ff8a4a', 0.04 + u * 0.18));
      ctx.fillStyle = g;
      ctx.fillRect(ub.x, ub.y, ub.w, ub.h);
      if (k > 60) {
        // a rough broken face: a pit or two and a crack
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(ub.x + ub.w * (0.3 + (p.seed % 5) * 0.1), ub.y + ub.h * 0.5, ub.w * 0.15, ub.h * 0.22, 0, 0, P2);
        ctx.fill();
      }
    });
    ctx.strokeStyle = 'rgba(2,1,3,0.85)';
    ctx.lineWidth = Math.max(0.6, Math.min(1.3, k * 0.012));
    up(ctx);
    ctx.stroke();
    // its near rim catches the glow
    let lo = 0;
    for (let i = 1; i < n; i++) if (und[i][1] > und[lo][1]) lo = i;
    line(ctx, und[(lo + n - 1) % n], und[lo], rgba('#ff9a5a', 0.2 + u * 0.3), 1);
    line(ctx, und[lo], und[(lo + 1) % n], rgba('#ff9a5a', 0.2 + u * 0.3), 1);
  }
}


// ——— the dial ———

const hourA = (h: number) => (h / 12) * P2 - Math.PI / 2;

/** One moon of the dial's ring: phase k of 12 (0 new, 6 full), q px across, in a carved roundel. */
function moon(ctx: Ctx, x: number, y: number, q: number, k: number, worn: number, glint = false): void {
  ctx.save();
  ctx.translate(x, y);
  if (!glint) {
    // the roundel cut into the ring: in shadow, its lower lip lit from below, its upper inside lit
    ctx.fillStyle = 'rgba(4,2,4,0.55)';
    ctx.beginPath();
    ctx.arc(0, 0, q * 1.25, 0, P2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,110,60,0.16)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, q * 1.25, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(180,160,170,0.08)';
    ctx.beginPath();
    ctx.arc(0, 0, q * 1.32, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  }
  const c = Math.cos((k / 12) * P2);
  if (k % 12 === 0) {
    // the new moon: an empty ring
    ctx.strokeStyle = glint ? rgba(GOLD.lit, 0.9) : 'rgba(120,90,90,0.35)';
    ctx.lineWidth = glint ? 2.2 : 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, q * 0.85, 0, P2);
    ctx.stroke();
  } else {
    if (k > 6) ctx.scale(-1, 1);
    ctx.beginPath();
    ctx.arc(0, 0, q, -Math.PI / 2, Math.PI / 2);
    const rx = q * Math.abs(c);
    if (c > 0) ctx.ellipse(0, 0, Math.max(0.01, rx), q, 0, Math.PI / 2, -Math.PI / 2, true);
    else ctx.ellipse(0, 0, Math.max(0.01, rx), q, 0, Math.PI / 2, (Math.PI * 3) / 2, false);
    ctx.closePath();
    if (glint) {
      ctx.fillStyle = rgba(GOLD.lit, 0.85);
      ctx.fill();
    } else {
      const g = ctx.createLinearGradient(0, -q, 0, q);
      g.addColorStop(0, '#2a2028');
      g.addColorStop(0.6, '#3a2a2c');
      g.addColorStop(1, '#7a3220');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = 'rgba(2,1,3,0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  ctx.restore();
  if (worn > 0 && !glint) {
    // worn away: a pitted patch eaten out of it
    ctx.fillStyle = rgba('#1a1418', worn);
    ctx.beginPath();
    ctx.ellipse(x + q * 0.3, y - q * 0.2, q * 0.7, q * 0.5, 0.6, 0, P2);
    ctx.fill();
  }
}

/** The dial's carving (shared by the dial and its live glint): the ring's moons, the wave band, the hand. */
function dialPath(): (c: Ctx) => void {
  const { x, y, r } = TK.dial;
  return (c) => {
    c.beginPath();
    c.arc(x, y, r, 0, P2);
  };
}

function dial(ctx: Ctx, r: R): void {
  const { x, y, r: R0 } = TK.dial;
  const disc = dialPath();
  // the recess: cut flat across the columns, smoother and a shade paler, the columns' seams still in it
  ctx.save();
  within(ctx, disc, () => {
    const g = ctx.createLinearGradient(0, y - R0, 0, y + R0);
    g.addColorStop(0, '#0a070b');
    g.addColorStop(0.45, '#1c161c');
    g.addColorStop(0.8, '#3a1a16');
    g.addColorStop(1, '#5a2214');
    ctx.fillStyle = g;
    ctx.fillRect(x - R0, y - R0, R0 * 2, R0 * 2);
    lay(ctx, drift('#2a2026', '#08060a', 5, 233, 96, 96), { x: x - R0, y: y - R0, w: R0 * 2, h: R0 * 2 }, 0.5);
    for (const p of FAR_COLS) {
      const [cx] = cornerS(p, 0, 2);
      if (Math.abs(cx - x) > R0) continue;
      const xx = sx(p.X + 0.9, p.z);
      line(ctx, [xx, y - R0], [xx, y + R0], 'rgba(0,0,0,0.25)', 1.2);
    }
    grain(ctx, { x: x - R0, y: y - R0, w: R0 * 2, h: R0 * 2 }, 'stone', 0.25, 1.2);
    // the rim's shadow along the bottom inside (the light comes from below), and the top inside wall of the cut lit
    ctx.strokeStyle = 'rgba(2,1,2,0.55)';
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.arc(x, y + 6, R0, Math.PI * 0.05, Math.PI * 0.95);
    ctx.stroke();
  });
  ctx.lineWidth = 7;
  ctx.strokeStyle = rgba('#ff7a3a', 0.12);
  ctx.beginPath();
  ctx.arc(x, y, R0 - 3, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(2,1,3,0.85)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, R0, 0, P2);
  ctx.stroke();
  // the outer edge of the cut catches the lava's light along its lower half
  ctx.strokeStyle = rgba('#ff8a4a', 0.28);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(x, y, R0 + 2, Math.PI * 0.1, Math.PI * 0.9);
  ctx.stroke();

  // the raised ring of the moons
  const r1 = R0 - 14;
  const r2 = R0 - 66;
  ctx.beginPath();
  ctx.arc(x, y, r1, 0, P2);
  ctx.arc(x, y, r2, 0, P2, true);
  const gr = ctx.createLinearGradient(0, y - r1, 0, y + r1);
  gr.addColorStop(0, '#120e12');
  gr.addColorStop(0.5, '#241c22');
  gr.addColorStop(0.85, '#4a2018');
  gr.addColorStop(1, '#6a2a16');
  ctx.fillStyle = gr;
  ctx.fill('evenodd');
  ctx.strokeStyle = 'rgba(2,1,3,0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r1, 0, P2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r2, 0, P2);
  ctx.stroke();
  // its lit lower edges (the light from below), the inner one's top
  ctx.strokeStyle = rgba('#ff7a3a', 0.22);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, r1 - 2, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r2 + 2, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
  // the ticks between the moons, worn
  for (let i = 0; i < 60; i++) {
    if (i % 5 === 0) continue;
    const a = (i / 60) * P2 - Math.PI / 2;
    if (r() < 0.25) continue;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    line(ctx, [x + ca * (r1 - 6), y + sa * (r1 - 6)], [x + ca * (r1 - 16), y + sa * (r1 - 16)], 'rgba(3,1,3,0.6)', 2.2);
  }
  // the twelve moons, new at the top, full at the bottom
  const rm = (r1 + r2) / 2 + 4;
  for (let h = 0; h < 12; h++) {
    const a = hourA(h);
    moon(ctx, x + Math.cos(a) * rm, y + Math.sin(a) * rm, 15, h, r() < 0.3 ? 0.4 + r() * 0.4 : 0);
  }
  // the band of running waves inside it
  const rw = r2 - 26;
  const wave = (dy: number, col: string, wd: number) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = wd;
    ctx.beginPath();
    for (let i = 0; i <= 720; i++) {
      const t = (i / 720) * P2;
      const ph = t * 24;
      const rr = rw + Math.sin(ph) * 8 + Math.sin(ph * 2 + 1) * 2.5;
      const px = x + Math.cos(t) * rr;
      const py = y + Math.sin(t) * rr + dy;
      if (i) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
    ctx.stroke();
  };
  wave(0, 'rgba(3,1,3,0.55)', 3);
  wave(-1.6, 'rgba(255,120,70,0.1)', 1);
  for (const rr of [rw - 14, rw + 14]) {
    ctx.strokeStyle = 'rgba(3,1,3,0.5)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(x, y, rr, 0, P2);
    ctx.stroke();
  }
  // the hub, a tarnished bronze pin through it
  const hub = (rad: number, col: string) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, P2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(2,1,3,0.75)';
    ctx.lineWidth = 2;
    ctx.stroke();
  };
  hub(40, '#1e1820');
  ctx.strokeStyle = rgba('#ff7a3a', 0.2);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, 39, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
  // the sickle: the one hand left, pointing to the eleventh moon, cracked across its blade
  const ha = hourA(10.6);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ha);
  const L = r2 - 6;
  const sickle = (c: Ctx) => {
    c.beginPath();
    c.moveTo(0, -9);
    c.lineTo(L * 0.42, -8);
    // the blade's back, curving round to the point
    c.bezierCurveTo(L * 0.62, -10, L * 0.98, -30, L * 0.96, -82);
    // its edge, back down inside the curve
    c.bezierCurveTo(L * 0.88, -44, L * 0.66, -16, L * 0.44, 9);
    c.lineTo(0, 9);
    c.closePath();
  };
  // (its shadow thrown up the dial by the light below)
  ctx.save();
  ctx.translate(-2, -7);
  ctx.fillStyle = 'rgba(2,1,3,0.45)';
  sickle(ctx);
  ctx.fill();
  ctx.restore();
  const gs = ctx.createLinearGradient(0, -60, 0, 12);
  gs.addColorStop(0, '#1a1418');
  gs.addColorStop(0.6, '#2e2428');
  gs.addColorStop(1, '#5a2818');
  ctx.fillStyle = gs;
  sickle(ctx);
  ctx.fill();
  ctx.strokeStyle = 'rgba(2,1,3,0.8)';
  ctx.lineWidth = 2;
  sickle(ctx);
  ctx.stroke();
  // its edge bevelled, a thin line of old gilding left in it
  ctx.strokeStyle = rgba(GOLD.body, 0.22);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(L * 0.46, 6);
  ctx.bezierCurveTo(L * 0.66, -13, L * 0.86, -40, L * 0.94, -76);
  ctx.stroke();
  line(ctx, [L * 0.72, -36], [L * 0.8, -6], 'rgba(2,1,3,0.85)', 2.4);
  ctx.restore();
  // the other hand: snapped off short
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(hourA(4.2));
  ctx.fillStyle = '#2a2026';
  ctx.beginPath();
  ctx.moveTo(0, -11);
  ctx.lineTo(56, -9);
  ctx.lineTo(62, -3);
  ctx.lineTo(57, 2);
  ctx.lineTo(64, 9);
  ctx.lineTo(0, 11);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(2,1,3,0.8)';
  ctx.lineWidth = 2;
  ctx.stroke();
  line(ctx, [2, 10], [60, 8], rgba('#ff7a3a', 0.25), 1.4);
  ctx.restore();
  hub(17, '#3a2a1e');
  ctx.fillStyle = mix(BRZ.shade, BRZ.green, 0.45);
  ctx.beginPath();
  ctx.arc(x, y, 11, 0, P2);
  ctx.fill();
  ctx.fillStyle = rgba('#ff9a5a', 0.35);
  ctx.beginPath();
  ctx.arc(x + 1, y + 4, 6, 0, Math.PI);
  ctx.fill();

  // the great crack right through it, and the piece of the ring that has fallen out
  const cr: Pt[] = [[x + R0 * 0.56, y - R0 * 0.86], [x + R0 * 0.4, y - R0 * 0.55], [x + R0 * 0.3, y - R0 * 0.42], [x + R0 * 0.12, y - R0 * 0.2], [x + R0 * 0.04, y - 18], [x - 30, y + 26], [x - R0 * 0.28, y + R0 * 0.3], [x - R0 * 0.36, y + R0 * 0.52], [x - R0 * 0.52, y + R0 * 0.72]];
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const [w, col] of [[9, 'rgba(2,1,2,0.9)'], [3.2, 'rgba(0,0,0,0.95)']] as const) {
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.beginPath();
    cr.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.stroke();
  }
  ctx.strokeStyle = rgba('#ff8a4a', 0.2);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  cr.forEach(([px, py], i) => (i ? ctx.lineTo(px + 3, py + 4) : ctx.moveTo(px + 3, py + 4)));
  ctx.stroke();
  for (const [i, ang, len] of [[2, -0.2, 70], [4, 2.4, 50], [6, 3.6, 60], [1, 0.9, 40]] as const) crack(ctx, r, cr[i][0], cr[i][1], ang, len, { w: 2, a: 0.7, col: '#020102', lip: '#ff7a3a' });
  const ch: Pt[] = [];
  for (let a = -0.42; a <= 0.1; a += 0.04) ch.push([x + Math.cos(a) * (R0 + 4 + Math.sin(a * 37) * 5), y + Math.sin(a) * (R0 + 4 + Math.sin(a * 37) * 5)]);
  ch.push([x + Math.cos(0.08) * (r2 - 2), y + Math.sin(0.08) * (r2 - 2)], [x + Math.cos(-0.12) * (r2 + 12), y + Math.sin(-0.12) * (r2 + 12)], [x + Math.cos(-0.3) * (r2 - 4), y + Math.sin(-0.3) * (r2 - 4)], [x + Math.cos(-0.42) * (r2 + 20), y + Math.sin(-0.42) * (r2 + 20)]);
  const chp = polyPath(ch);
  ctx.fillStyle = '#050306';
  chp(ctx);
  ctx.fill();
  within(ctx, chp, () => {
    const bb = boxOfPts(ch, 2);
    vfill(ctx, bb.x, bb.y, bb.w, bb.h, [[0, 'rgba(0,0,0,0)'], [1, rgba('#5a1a10', 0.6)]]);
  });
  ctx.strokeStyle = rgba('#ff8a4a', 0.3);
  ctx.lineWidth = 1.4;
  chp(ctx);
  ctx.stroke();
  // grime: soot run down from the roof over it, darker towards its top
  for (let i = 0; i < 12; i++) streaks(ctx, r, x - R0 + r() * R0 * 2, y - R0 + r() * 40, 10 + r() * 30, 80 + r() * 160, '#020102', 0.14, 3);
  within(ctx, disc, () => vfill(ctx, x - R0 - 10, y - R0 - 10, R0 * 2 + 20, R0, [[0, 'rgba(3,1,3,0.6)'], [1, 'rgba(3,1,3,0)']]));
}

/** The dial's moons and the sickle's gilding in gold (live only: the live layer flashes it when the hourglass
 * flips). */
function dialGlint(ctx: Ctx): void {
  const { x, y, r: R0 } = TK.dial;
  const rm = (R0 - 14 + R0 - 66) / 2 + 4;
  for (let h = 0; h < 12; h++) {
    const a = hourA(h);
    const mx = x + Math.cos(a) * rm;
    const my = y + Math.sin(a) * rm;
    // (the lowest moons are under the lava's shore)
    if (my > SHORE_FAR - 16) continue;
    const g = ctx.createRadialGradient(mx, my, 0, mx, my, 34);
    g.addColorStop(0, rgba(GOLD.lit, 0.4));
    g.addColorStop(1, rgba(GOLD.body, 0));
    ctx.fillStyle = g;
    ctx.fillRect(mx - 34, my - 34, 68, 68);
    moon(ctx, mx, my, 15, h, 0, true);
  }
  ctx.strokeStyle = rgba(GOLD.lit, 0.55);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, R0 - 14, Math.PI * 1.02, Math.PI * 1.98);
  ctx.stroke();
}




// ——— the far wall ———

const FAR_COLS: Prism[] = (() => {
  const r = rng(hashStr('tk:far'));
  const out: Prism[] = [];
  for (let X = -XW - 1.2; X < XW + 1.5; X += 1.6 + r() * 0.35) {
    const z = ZF + 0.6 + (r() - 0.5) * 0.8;
    out.push(makePrism(r, X, z, 0.9 + r() * 0.1, -1, 48, 3));
  }
  return out.sort((a, b) => b.z - a.z);
})();

export const FAR_BOX: Box = { x: Math.floor(CORNER - 60), y: 0, w: Math.ceil(W - 2 * CORNER + 120), h: Math.ceil(SHORE_FAR + 12) };

function farWall(ctx: Ctx, r: R): void {
  const b = FAR_BOX;
  ctx.fillStyle = '#0a0709';
  ctx.fillRect(b.x, b.y, b.w, b.h);
  for (const p of FAR_COLS) prism(ctx, p, { heat: 0.9, air: 0.42, detail: 0.7 });
  ctx.save();
  ctx.beginPath();
  ctx.rect(b.x, b.y, b.w, b.h);
  ctx.clip();
  grain(ctx, b, 'stone', 0.2, 1.3);
  lay(ctx, noiseMask(6, 211, { cover: 0.45, soft: 0.45, col: '#040205', w: 80, h: 60 }), b, 0.4);
  for (let i = 0; i < 30; i++) streaks(ctx, r, b.x + r() * b.w, 60 + r() * 200, 8 + r() * 20, 60 + r() * 160, '#030103', 0.16, 3);
  // up into the dark: the wall lost in smoke hundreds of metres up; down at its foot, the lava's light and smoke
  vfill(ctx, b.x, 0, b.w, b.h, [[0, 'rgba(3,2,4,0.97)'], [0.22, 'rgba(4,3,6,0.75)'], [0.48, rgba('#1a1620', 0.3)], [0.8, rgba('#4a1a14', 0.2)], [1, rgba('#8a2a16', 0.45)]]);
  ctx.restore();
}

// ——— the far Titans, chained to the far wall ———

/** A Titan sunk to the waist in the lava, his arms dragged up by chains into the dark, his head bowed: a huge dim
 * shape in the haze (u across, v up, in his own units). */
function titan(ctx: Ctx, t: (typeof TK.titans)[number], side: -1 | 1): void {
  const k = pz(t.z) * t.s * 0.95;
  const [x, yl] = P(t.X, 0, t.z);
  const L = (u: number, v: number): Pt => [x + (u + v * t.lean) * k, yl - v * k];
  const lineK = (pts: Pt[]) => (c: Ctx) => {
    c.beginPath();
    pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
  };
  // his arms: shoulder, elbow, wrist (each side), thick, raised up and out
  const arms = ([-1, 1] as const).map((s) => [L(s * 4.5, 9.8), L(s * 6.1, 6.1), L(s * 6.5, 2.4)] as Pt[]);
  // the torso: waist, flanks flaring to the ribs and the lats, the shoulders hunched up by the raised arms
  const torso: Pt[] = [];
  const outline: [number, number][] = [[-3.4, -1], [-3.2, 2.5], [-3.7, 5], [-4.5, 7.4], [-5.1, 9.2], [-4.6, 10.5], [-3.2, 11.3], [-1.6, 11.0], [0, 10.6], [1.6, 11.0], [3.2, 11.3], [4.6, 10.5], [5.1, 9.2], [4.5, 7.4], [3.7, 5], [3.2, 2.5], [3.4, -1]];
  for (const [u, v] of outline) torso.push(L(u, v));
  // (a smooth outline through its points: the body rounded, not cut)
  const tp = (c: Ctx) => {
    c.beginPath();
    const n = torso.length;
    c.moveTo(torso[0][0], torso[0][1]);
    for (let i = 1; i < n - 1; i++) {
      const [x1, y1] = torso[i];
      const [x2, y2] = torso[i + 1];
      c.quadraticCurveTo(x1, y1, i === n - 2 ? x2 : (x1 + x2) / 2, i === n - 2 ? y2 : (y1 + y2) / 2);
    }
    c.closePath();
  };
  const head = (c: Ctx) => {
    const [hx, hy] = L(0.35 * side, 10.7);
    c.beginPath();
    c.ellipse(hx, hy, 1.45 * k, 1.6 * k, 0.15 * side, 0, P2);
  };
  // the chains from his wrists up into the dark, and from his manacles back to rings in the wall
  for (const a of arms) {
    const [wx, wy] = a[2];
    const s = 0.42 * k;
    // (from the manacle down into the lava, where it's fixed: no chain hangs over the middle)
    chain(ctx, [[wx, wy], [wx + Math.sign(wx - x) * 0.4 * k, yl + 4]], s * 0.75, 0.25);
  }
  // the body: dark stone-grey skin, lit red from below, a cool rim from the left
  const body = (c: Ctx) => {
    tp(c);
    c.fill();
    head(c);
    c.fill();
    c.lineCap = 'round';
    c.lineJoin = 'round';
    for (const [ai, a] of arms.entries()) {
      // the shoulder's round
      c.beginPath();
      c.arc(a[0][0], a[0][1] - 0.2 * k, 1.75 * k, 0, P2);
      c.fill();
      for (const [seg, wd] of [[0, 2.9], [1, 2.2]] as const) {
        c.lineWidth = wd * k;
        c.beginPath();
        c.moveTo(a[seg][0], a[seg][1]);
        c.lineTo(a[seg + 1][0], a[seg + 1][1]);
        c.stroke();
      }
      void ai;
    }
  };
  ctx.fillStyle = '#15111a';
  ctx.strokeStyle = '#15111a';
  body(ctx);
  const bb = boxOfPts([...torso, ...arms.flat()], 3 * k);
  ctx.save();
  // (paint only where he is: he's on his own canvas)
  ctx.globalCompositeOperation = 'source-atop';
  // his form: the chest's round catching the light in its middle, his flanks turning away into shade
  const [cx0, cy0] = L(0.6, 7);
  const rg = ctx.createRadialGradient(cx0, cy0, 0, cx0, cy0, 6.5 * k);
  rg.addColorStop(0, 'rgba(120,110,130,0.22)');
  rg.addColorStop(0.6, 'rgba(0,0,0,0)');
  rg.addColorStop(1, 'rgba(6,4,10,0.45)');
  ctx.fillStyle = rg;
  ctx.fillRect(bb.x, bb.y, bb.w, bb.h);
  // his arms round: the side away from the light in shade, a lit edge on the other
  ctx.lineCap = 'round';
  for (const a of arms) {
    const out = Math.sign(a[2][0] - x);
    for (const [seg, wd] of [[0, 2.7], [1, 2.1]] as const) {
      const [ax, ay] = a[seg];
      const [bx, by] = a[seg + 1];
      const l = Math.hypot(bx - ax, by - ay) || 1;
      const nx = (-(by - ay) / l) * out;
      const ny = ((bx - ax) / l) * out;
      const off = wd * 0.32 * k;
      ctx.strokeStyle = 'rgba(6,4,10,0.45)';
      ctx.lineWidth = wd * 0.4 * k;
      ctx.beginPath();
      ctx.moveTo(ax + nx * off, ay + ny * off);
      ctx.lineTo(bx + nx * off, by + ny * off);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(150,140,170,0.12)';
      ctx.lineWidth = wd * 0.18 * k;
      ctx.beginPath();
      ctx.moveTo(ax - nx * off * 1.1, ay - ny * off * 1.1);
      ctx.lineTo(bx - nx * off * 1.1, by - ny * off * 1.1);
      ctx.stroke();
    }
  }
  // lit from the lava below, the warm climbing his chest
  vfill(ctx, bb.x, bb.y, bb.w, bb.h, [[0, 'rgba(0,0,0,0)'], [0.5, 'rgba(0,0,0,0)'], [0.82, rgba('#6a2416', 0.5)], [1, rgba('#d8582a', 0.7)]]);
  // his muscles, faint: the chest, the line down his belly, the ribs
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = Math.max(1, k * 0.18);
  const [c0x, c0y] = L(0, 8.6);
  ctx.beginPath();
  ctx.moveTo(...L(-3.6, 8.4));
  ctx.quadraticCurveTo(c0x - 1.6 * k, c0y + 1.4 * k, c0x, c0y);
  ctx.quadraticCurveTo(c0x + 1.6 * k, c0y + 1.4 * k, ...L(3.6, 8.4));
  ctx.moveTo(...L(0, 8.2));
  ctx.lineTo(...L(0.1, 1));
  for (const v of [6.4, 5.2]) {
    ctx.moveTo(...L(-3.5, v));
    ctx.lineTo(...L(-2.4, v - 0.6));
    ctx.moveTo(...L(3.5, v));
    ctx.lineTo(...L(2.4, v - 0.6));
  }
  ctx.stroke();
  // the hair falling forward over his bowed head, his beard on his chest
  ctx.fillStyle = 'rgba(4,2,6,0.5)';
  const [hx, hy] = L(0.35 * side, 10.7);
  ctx.beginPath();
  ctx.ellipse(hx, hy - 0.6 * k, 1.6 * k, 1.2 * k, 0, Math.PI, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(hx - 1.1 * k, hy + 0.6 * k);
  ctx.quadraticCurveTo(hx, hy + 3.4 * k, hx + 1.1 * k, hy + 0.6 * k);
  ctx.fill();
  // a cool rim along his left side and arms, the warm along his right (the lava's glow off the far shore)
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = rgba('#9aa0c0', 0.22);
  ctx.lineWidth = Math.max(1, k * 0.16);
  lineK([L(-4.9, 9.6), L(-4.4, 7.6), L(-3.6, 5), L(-3.1, 2.5)])(ctx);
  ctx.stroke();
  ctx.strokeStyle = rgba('#ff7a3a', 0.3);
  lineK([L(4.9, 9.6), L(4.4, 7.6), L(3.6, 5), L(3.1, 2.5), L(3.3, 0)])(ctx);
  ctx.stroke();
  // his bowed head: the crown of it catching a cool rim, his brow lit faintly from below
  {
    const [hx, hy] = L(0.35 * side, 10.7);
    ctx.strokeStyle = rgba('#9aa0c0', 0.28);
    ctx.lineWidth = Math.max(1, k * 0.14);
    ctx.beginPath();
    ctx.ellipse(hx, hy, 1.55 * k, 1.85 * k, 0.15 * side, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    ctx.strokeStyle = rgba('#ff7a3a', 0.2);
    ctx.beginPath();
    ctx.ellipse(hx, hy, 1.55 * k, 1.85 * k, 0.15 * side, Math.PI * 0.25, Math.PI * 0.75);
    ctx.stroke();
  }
  // the manacles
  for (const a of arms) {
    const [wx, wy] = a[2];
    ctx.fillStyle = mix('#1a1410', BRZ.green, 0.2);
    ctx.beginPath();
    ctx.ellipse(wx, wy + 0.2 * k, 0.8 * k, 0.45 * k, 0, 0, P2);
    ctx.fill();
    ctx.strokeStyle = rgba('#c88a50', 0.18);
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
  // where he stands in the lava: it glows round his waist
  lightPool(ctx, x, yl, 5 * k, 0.6 * k, '#ff7a2a', 0.45);
}

const TITANS_BOX: Box = { x: 300, y: 0, w: W - 600, h: Math.ceil(SHORE_FAR + 16) };

function titans(ctx: Ctx): void {
  // (each painted on its own canvas, so its lighting and the haze over it touch only him)
  const b = TITANS_BOX;
  TK.titans.forEach((t, i) => {
    // the smoke behind him lit, so his dark shape stands against it
    const [tx, ty] = P(t.X, 9, t.z);
    lightPool(ctx, tx, ty, 300, 260, '#6a4048', 0.3);
    lightPool(ctx, tx, ty + 150, 260, 110, '#9a4024', 0.26);
    const [c, q] = makeCanvas(b.w, b.h);
    q.translate(-b.x, -b.y);
    titan(q, t, i ? 1 : -1);
    const [, yl] = P(t.X, 0, t.z);
    const k = pz(t.z);
    // the haze between us and him: grey-blue up high, red-brown over the lava
    q.globalCompositeOperation = 'source-atop';
    const g = q.createLinearGradient(0, yl - 24 * k, 0, yl);
    g.addColorStop(0, rgba('#2a2836', 0.55));
    g.addColorStop(0.45, rgba('#2a2632', 0.35));
    g.addColorStop(1, rgba('#4a1c14', 0.2));
    q.fillStyle = g;
    q.fillRect(b.x, b.y, b.w, b.h);
    ctx.drawImage(c, b.x, b.y);
  });
}

// ——— the side walls: cliffs of columns rising out of the frame ———

const WALL_COLS: Prism[] = (() => {
  const r = rng(hashStr('tk:walls'));
  const out: Prism[] = [];
  for (const s of [-1, 1]) {
    for (let z = 19.5; z < ZF + 0.5; z += 1.75 + r() * 0.35) {
      // (runs of them stand proud of the face, buttresses)
      const proud = Math.max(0, Math.sin(z * 0.37 + s * 1.7) * 1.4 + (r() - 0.5) * 0.6) * clamp01((54 - z) / 16);
      const X = s * (XW - 1 - proud);
      const x = sx(X, z);
      if (x < -120 || x > W + 120) continue;
      out.push(makePrism(r, X, z, 0.95 + r() * 0.12, -1, 90, 3.2));
    }
  }
  return out.sort((a, b) => b.z - a.z);
})();

const WALLS_BOX: Box = { x: 0, y: 0, w: W, h: 560 };
/** The cliff face's X (in front of the columns, where the stair and the doors are cut). */
const FACE = XW - 1.9;

/** A doorway cut in a side wall at (Y, z): figure-sized, dark, a lamp burning in some; a ring beside it. */
function doorway(ctx: Ctx, s: -1 | 1, Y: number, z: number, lamp: boolean, arch = false): void {
  const X = s * FACE;
  const w = 0.6;
  const h = 2.3;
  const q: Pt[] = [P(X, Y, z - w), P(X, Y, z + w), P(X, Y + h, z + w), P(X, Y + h, z - w)];
  const path = arch
    ? (c: Ctx) => {
        c.beginPath();
        c.moveTo(q[0][0], q[0][1]);
        c.lineTo(q[1][0], q[1][1]);
        c.lineTo(q[2][0], q[2][1] + 3);
        c.quadraticCurveTo((q[2][0] + q[3][0]) / 2, (q[2][1] + q[3][1]) / 2 - 5, q[3][0], q[3][1] + 3);
        c.closePath();
      }
    : polyPath(q);
  ctx.fillStyle = '#040203';
  path(ctx);
  ctx.fill();
  if (lamp) {
    within(ctx, path, () => {
      const [lx, ly] = P(X, Y + 0.7, z);
      lightPool(ctx, lx, ly, 10, 12, '#ffb050', 0.6);
    });
    const [lx, ly] = P(X, Y + 1.2, z);
    lightPool(ctx, lx, ly, 26, 22, '#ff9a40', 0.12);
  }
  // the lintel's underside lit from below, the sill's edge
  line(ctx, q[3], q[2], rgba('#ff8a4a', 0.35), 1);
  line(ctx, q[0], q[1], rgba('#ff8a4a', 0.25), 1);
  // a ring beside it, for a chain
  const [rx, ry] = P(X, Y + 1.3, z + s * 1.25);
  ctx.strokeStyle = rgba(BRZ.body, 0.55);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(rx, ry, 1.6, 2.4, 0, 0, P2);
  ctx.stroke();
}

/** A stair cut into a cliff: a notch rising along (Y0, z0) → (Y1, z1), its steps a man's height a few at a time. */
function stairRun(ctx: Ctx, s: -1 | 1, Y0: number, z0: number, Y1: number, z1: number): void {
  const X = s * FACE;
  const n = Math.round((Y1 - Y0) / 0.13);
  const pts: Pt[] = [];
  const under: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const Y = Y0 + (Y1 - Y0) * t;
    const z = z0 + (z1 - z0) * t;
    const zn = z0 + (z1 - z0) * Math.min(1, (i + 1) / n);
    pts.push(P(X, Y, z), P(X, Y, zn));
    under.push(P(X, Y - 0.5, z));
  }
  // the notch over the steps: the wall above them in shadow
  const notch: Pt[] = [...pts, ...pts.slice().reverse().map(([x, y]): Pt => [x, y - Math.max(2.5, pz(z0) * 0.9)])];
  ctx.fillStyle = 'rgba(2,1,2,0.7)';
  polyPath(notch)(ctx);
  ctx.fill();
  // the steps' edges: a jagged line, their risers lit warm from below
  ctx.strokeStyle = rgba('#e07040', 0.45);
  ctx.lineWidth = 1;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  // the stair's outer face: a thin band under the steps
  ctx.strokeStyle = 'rgba(2,1,2,0.6)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  under.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
}

/** A Titan's ring set in the cliff (on the wall plane, foreshortened): a hoop of bronze as tall as a house. */
function titanRing(ctx: Ctx, s: -1 | 1, Y: number, z: number, R0: number): void {
  const X = s * FACE;
  const outer = Array.from({ length: 49 }, (_, i) => {
    const a = (i / 48) * P2;
    return P(X, Y + Math.cos(a) * R0, z + Math.sin(a) * R0);
  });
  const k = pz(z);
  // its staple, a block of bronze bolted to the rock
  const st: Pt[] = [P(X, Y + R0 + 0.9, z - 0.8), P(X, Y + R0 + 0.9, z + 0.8), P(X, Y + R0 - 0.1, z + 0.8), P(X, Y + R0 - 0.1, z - 0.8)];
  ctx.fillStyle = mix(BRZ.deep, BRZ.green, 0.3);
  polyPath(st)(ctx);
  ctx.fill();
  // its shadow on the rock
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 0.55 * k;
  ctx.beginPath();
  outer.forEach(([x, y], i) => (i ? ctx.lineTo(x + 3, y - 3) : ctx.moveTo(x + 3, y - 3)));
  ctx.stroke();
  const g = ctx.createLinearGradient(0, outer[0][1], 0, outer[24][1]);
  g.addColorStop(0, mix(BRZ.deep, BRZ.green, 0.35));
  g.addColorStop(1, mix(BRZ.shade, '#c85a2a', 0.45));
  ctx.strokeStyle = g;
  ctx.lineWidth = 0.42 * k;
  ctx.beginPath();
  outer.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.strokeStyle = rgba('#ff9a5a', 0.3);
  ctx.lineWidth = Math.max(1, 0.08 * k);
  ctx.beginPath();
  outer.slice(16, 33).forEach(([x, y], i) => (i ? ctx.lineTo(x, y + 0.1 * k) : ctx.moveTo(x, y + 0.1 * k)));
  ctx.stroke();
}

/** The top corners: the cliffs overhanging, their undersides lost in the dark, the broken ends of columns hanging. */
function overhang(ctx: Ctx, r: R, s: -1 | 1): void {
  const X = (x: number) => (s < 0 ? x : W - x);
  const edge: Pt[] = [];
  for (let x = 0; x <= 640; x += 16) {
    const t = x / 640;
    edge.push([x, 150 * (1 - t) ** 1.6 - 14 * t + Math.sin(x * 0.07) * 4 + (r() - 0.5) * 3]);
  }
  const pts: Pt[] = [[X(-10), -10], ...edge.map(([x, y]): Pt => [X(x), y]), [X(660), -10]];
  const path = polyPath(pts);
  ctx.fillStyle = '#050306';
  path(ctx);
  ctx.fill();
  // the column ends hanging off its lip: short prisms, their broken ends lit faintly from the lava far below
  for (let i = 0; i < edge.length - 1; i++) {
    const [x0, y0] = edge[i];
    if (y0 < 4) continue;
    const w = 14 + r() * 10;
    const len = 6 + r() * 26 * (1 - x0 / 640);
    const xx = X(x0 + r() * 8);
    ctx.fillStyle = '#0a0709';
    ctx.fillRect(xx - w / 2, y0 - 4, w, len + 4);
    ctx.fillStyle = rgba('#7a2a18', 0.4);
    ctx.beginPath();
    ctx.ellipse(xx, y0 + len, w / 2, 2.5, 0, 0, P2);
    ctx.fill();
    line(ctx, [xx - w / 2, y0], [xx - w / 2, y0 + len], 'rgba(0,0,0,0.6)', 1);
  }
  ctx.strokeStyle = rgba('#a03a1c', 0.18);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  edge.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), y + 1) : ctx.moveTo(X(x), y + 1)));
  ctx.stroke();
}

/** A tier of a cliff: the band between the lower colonnade and the upper one, where the columns break up into thin
 * crooked prisms fanning every way, lit only along its ragged underside by the lava far below. */
function tier(ctx: Ctx, r: R, s: -1 | 1): void {
  const X = s * (XW - 1.4);
  const Yb = (z: number) => 8.5 + Math.sin(z * 0.27 + s) * 1.3 + Math.sin(z * 0.9) * 0.35;
  const Yt = (z: number) => Yb(z) + 3.2 + Math.sin(z * 0.41 + 2) * 0.9;
  const bot: Pt[] = [];
  const topE: Pt[] = [];
  for (let z = 16; z <= ZF + 0.5; z += 0.5) {
    bot.push(P(X, Yb(z) + (r() - 0.5) * 0.25, z));
    topE.push(P(X, Yt(z), z));
  }
  const pts = [...bot, ...topE.slice().reverse()];
  const path = polyPath(pts);
  ctx.fillStyle = '#0b080c';
  path(ctx);
  ctx.fill();
  within(ctx, path, () => {
    // the fanned prisms: short strokes leaning every way, dark and lit
    ctx.lineCap = 'round';
    for (let i = 0; i < 520; i++) {
      const t = r();
      const z = 16 + t * (ZF - 16);
      const k = pz(z);
      const Y = Yb(z) + r() * (Yt(z) - Yb(z));
      const [x, y] = P(X, Y, z);
      const ang = (r() - 0.5) * 1.6 + s * 0.3;
      const len = (0.5 + r() * 1.4) * k;
      const lit = r() < 0.4;
      ctx.strokeStyle = lit ? rgba(mix('#3a2a30', '#7a3020', clamp01((Yt(z) - Y) / 4) * 0.4), 0.5) : 'rgba(3,1,4,0.6)';
      ctx.lineWidth = Math.max(1, (0.12 + r() * 0.25) * k);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.sin(ang) * len, y - Math.cos(ang) * len);
      ctx.stroke();
    }
    const bb = boxOfPts(pts, 0);
    // the haze far along it, the dark coming down over its top
    const n = ctx.createLinearGradient(s < 0 ? 0 : W, 0, s < 0 ? CORNER : W - CORNER, 0);
    n.addColorStop(0, 'rgba(30,24,34,0)');
    n.addColorStop(1, 'rgba(30,24,34,0.5)');
    ctx.fillStyle = n;
    ctx.fillRect(bb.x, bb.y, bb.w, bb.h);
  });
  // its ragged underside: an overhang catching the lava's light, the colonnade under it in its shadow
  ctx.strokeStyle = rgba('#c8582a', 0.32);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  bot.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  softly(ctx, boxOfPts(bot, 40), (q) => {
    q.strokeStyle = 'rgba(2,1,3,0.6)';
    q.lineWidth = 26;
    q.beginPath();
    bot.forEach(([x, y], i) => (i ? q.lineTo(x, y + 14) : q.moveTo(x, y + 14)));
    q.stroke();
  }, 0.25);
}

function walls(ctx: Ctx, r: R): void {
  for (const p of WALL_COLS) prism(ctx, p, { heat: 1, detail: 1, air: clamp01((p.z - 18) / 44) * 0.42 });
  for (const s of [-1, 1] as const) {
    const wx = s < 0 ? 0 : W - CORNER - 30;
    const wb: Box = { x: wx, y: 0, w: CORNER + 30, h: 560 };
    within(ctx, (c) => {
      c.beginPath();
      c.rect(wb.x, wb.y, wb.w, wb.h);
    }, () => {
      grain(ctx, wb, 'stone', 0.3, 1.4);
      lay(ctx, noiseMask(5, s < 0 ? 223 : 227, { cover: 0.42, soft: 0.42, col: '#040205', w: 48, h: 80 }), wb, 0.4);
      for (let i = 0; i < 26; i++) streaks(ctx, r, wb.x + r() * wb.w, 20 + r() * 300, 8 + r() * 20, 60 + r() * 200, '#030103', 0.15, 3);
    });
  }
  // the cliffs' tiers: a band of broken, fanned columns over the lower colonnade, its underside lit from below
  for (const s of [-1, 1] as const) tier(ctx, r, s);
  // what gives the scale: a stair cut in the left cliff climbing out of the frame, doorways on its landings (a lamp
  // in one), a Titan's ring; a gallery of cell doors along the right cliff
  stairRun(ctx, -1, 0.5, 27, 8.6, 49);
  stairRun(ctx, -1, 8.6, 49, 16.6, 33);
  stairRun(ctx, -1, 16.6, 33, 27, 50);
  doorway(ctx, -1, 8.6, 50.6, false);
  doorway(ctx, -1, 16.6, 31.6, true);
  doorway(ctx, -1, 0.6, 25.4, false, true);
  titanRing(ctx, -1, 5.5, 40, 3.2);
  for (const [Y, z0, z1, step] of [[6.5, 24, 56, 3.4], [14.5, 40, 60, 3.6]] as const) {
    // the gallery's ledge: a lit lip along the cliff
    const a = P(FACE, Y, z0 - 1);
    const b = P(FACE, Y, z1 + 1);
    line(ctx, [a[0], a[1] + 1], [b[0], b[1] + 1], 'rgba(2,1,2,0.7)', Math.max(2, pz(z0) * 0.12));
    line(ctx, a, b, rgba('#e07040', 0.4), 1);
    let n = 0;
    for (let z = z0; z <= z1; z += step) doorway(ctx, 1, Y + 0.05, z, (n++ * 7) % 5 === 2, true);
  }
  // the overhanging tops of the cliffs, and the smoke and dark up there
  overhang(ctx, r, -1);
  overhang(ctx, r, 1);
  // the cracks in the overhangs' lips the near streams of sand pour from, gold glowing in them
  for (const st of STREAMS) {
    if (st.top < 0) continue;
    ctx.lineCap = 'round';
    const pts: Pt[] = [];
    for (let i = -4; i <= 4; i++) pts.push([st.x + i * 7 + (r() - 0.5) * 5, st.top - 2 - Math.abs(i) * 3 + (r() - 0.5) * 3]);
    for (const [wd, col] of [[6, 'rgba(0,0,0,0.9)'], [2.6, rgba(GOLD.body, 0.65)], [1, rgba(GOLD.white, 0.75)]] as const) {
      ctx.strokeStyle = col;
      ctx.lineWidth = wd;
      ctx.beginPath();
      pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
      ctx.stroke();
    }
    lightPool(ctx, st.x, st.top, 46, 16, '#ffc860', 0.28);
  }
  for (const s of [-1, 1]) {
    const wx = s < 0 ? 0 : W - CORNER - 30;
    vfill(ctx, wx, 0, CORNER + 30, 380, [[0, 'rgba(3,1,3,0.85)'], [0.4, 'rgba(3,1,3,0.45)'], [1, 'rgba(3,1,3,0)']]);
    // the pit's red climbing the cliff from its foot
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, 540, 0, 260);
    g.addColorStop(0, rgba('#ff5a26', 0.14));
    g.addColorStop(0.5, rgba('#ff4a20', 0.04));
    g.addColorStop(1, 'rgba(255,70,30,0)');
    ctx.fillStyle = g;
    ctx.fillRect(wx, 260, CORNER + 30, 300);
    ctx.restore();
  }
  // the golden sand's light on the cliffs beside the near streams
  for (const s of STREAMS) if (s.z < 30) lightPool(ctx, s.x, s.bot - 160 * s.k, 50 * s.k, 200 * s.k, '#ffb84a', 0.05);
}

// ——— the smoke banks drifting across the chasm (sprites) ———

const SMOKE_FAR: Box = { x: 380, y: 250, w: 1160, h: 230 };
const SMOKE_MID: Box = { x: 160, y: 330, w: 1600, h: 220 };

function smokeBank(ctx: Ctx, b: Box, seed: number, a: number): void {
  const rr = rng(hashStr('tk:smoke' + seed));
  softly(ctx, b, (q) => {
    for (let i = 0; i < 46; i++) {
      const x = b.x + 60 + rr() * (b.w - 120);
      const y = b.y + b.h * (0.35 + rr() * 0.55);
      const rad = 50 + rr() * 110;
      const low = (y - b.y) / b.h;
      const g = q.createRadialGradient(x, y, 0, x, y, rad);
      const col = mix('#3a3440', '#8a3a22', low);
      g.addColorStop(0, rgba(col, a * (0.5 + rr() * 0.5)));
      g.addColorStop(1, rgba(col, 0));
      q.fillStyle = g;
      q.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    // (faded out to its box's edges, so it can drift)
    q.globalCompositeOperation = 'destination-in';
    const gx = q.createLinearGradient(b.x, 0, b.x + b.w, 0);
    gx.addColorStop(0, 'rgba(0,0,0,0)');
    gx.addColorStop(0.15, 'rgba(0,0,0,1)');
    gx.addColorStop(0.85, 'rgba(0,0,0,1)');
    gx.addColorStop(1, 'rgba(0,0,0,0)');
    q.fillStyle = gx;
    q.fillRect(b.x, b.y, b.w, b.h);
    const gy = q.createLinearGradient(0, b.y, 0, b.y + b.h);
    gy.addColorStop(0, 'rgba(0,0,0,0)');
    gy.addColorStop(0.35, 'rgba(0,0,0,1)');
    gy.addColorStop(0.85, 'rgba(0,0,0,1)');
    gy.addColorStop(1, 'rgba(0,0,0,0)');
    q.fillStyle = gy;
    q.fillRect(b.x, b.y, b.w, b.h);
  }, 0.25);
}

// ——— the lava ———

/** The lava's region: from the far shore to our lip. */
const lavaPath = (c: Ctx) => {
  c.beginPath();
  c.moveTo(-10, shoreY(0));
  for (let x = 0; x <= W; x += 8) c.lineTo(x, shoreY(x));
  c.lineTo(W + 10, shoreY(W));
  for (let x = W; x >= 0; x -= 10) c.lineTo(x, lipY(x) + 6);
  c.closePath();
};
const LAVA_BOX: Box = { x: 0, y: 200, w: W, h: 525 };

/** The crust's plates: Voronoi cells (world X, z) of sites spread evenly across the screen and in log depth, so they
 * are about the same width on screen near and far, and foreshortened by the perspective; fixed. */
interface Plate {
  pts: Pt[];
  site: Pt;
  open: boolean;
  tone: number;
  gap: number;
}
const PLATES: Plate[] = (() => {
  const r = rng(hashStr('tk:plates'));
  const nb = 22;
  const b0 = Math.log(9.3);
  const b1 = Math.log(ZF + 1);
  const sites: Pt[] = [];
  for (let j = 0; j < nb; j++) {
    // (bigger plates near us, many small ones far off)
    const na = Math.round(13 + 30 * (j / nb) ** 1.2);
    for (let i = 0; i < na; i++) {
      const z = Math.exp(b0 + ((j + 0.5 + (r() - 0.5) * 0.8) / nb) * (b1 - b0));
      const a = -1.06 + ((i + 0.5 + (r() - 0.5) * 0.85 + (j % 2) * 0.5) / na) * 2.12;
      sites.push([(a * 960 * z) / F, z]);
    }
  }
  const clip = (poly: Pt[], a: Pt, b: Pt): Pt[] => {
    const nx = b[0] - a[0];
    const nz = b[1] - a[1];
    const mx = (a[0] + b[0]) / 2;
    const mz = (a[1] + b[1]) / 2;
    const f = (p: Pt) => (p[0] - mx) * nx + (p[1] - mz) * nz;
    const out: Pt[] = [];
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i];
      const q = poly[(i + 1) % poly.length];
      const fp = f(p);
      const fq = f(q);
      if (fp <= 0) out.push(p);
      if (fp < 0 !== fq < 0 && fp !== fq) {
        const t = fp / (fp - fq);
        out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
      }
    }
    return out;
  };
  return sites.map((s) => {
    const R0 = s[1] * 0.16;
    let poly: Pt[] = [[s[0] - R0, s[1] - R0], [s[0] + R0, s[1] - R0], [s[0] + R0, s[1] + R0], [s[0] - R0, s[1] + R0]];
    for (const o of sites) {
      if (o === s || Math.abs(o[1] - s[1]) > R0 * 2 || Math.abs(o[0] - s[0]) > R0 * 2) continue;
      poly = clip(poly, s, o);
      if (poly.length < 3) break;
    }
    return { pts: poly, site: s, open: r() < 0.04, tone: r(), gap: s[1] * (0.004 + r() * 0.006) };
  });
})();
/** A plate shrunk to leave its seam, on screen. */
function plateScreen(p: Plate, g: number): Pt[] {
  const [cx, cz] = p.site;
  return p.pts.map(([X, z]) => {
    const dx = X - cx;
    const dz = z - cz;
    const l = Math.hypot(dx, dz) || 1;
    const k = Math.max(0, 1 - g / l);
    return P(cx + dx * k, 0, cz + dz * k);
  });
}
/** How hot the lava runs at screen x (calmer behind the middle lanes). */
const hotAt = (x: number) => 0.45 + 0.45 * smooth(160, 600, Math.abs(x - 960));

function lava(ctx: Ctx, r: R): void {
  ctx.save();
  within(ctx, lavaPath, () => {
    // the molten body under the crust: deep red far off in the smoke, hotter towards us
    vfill(ctx, 0, SHORE_FAR - 4, W, 290, [[0, '#4a1408'], [0.18, '#641a08'], [0.5, '#982c10'], [0.8, '#c03e18'], [1, '#cc481a']]);
    lay(ctx, noiseMask(9, 251, { cover: 0.42, soft: 0.5, col: '#ffa040', w: 180, h: 30 }), { x: 0, y: SHORE_FAR, w: W, h: 290 }, 0.32);
    // the crust: plates riding on it, split by seams
    const plates = new Path2D();
    const shapes: { sp: Pt[]; p: Plate }[] = [];
    for (const p of PLATES) {
      if (p.open) continue;
      const [sx0] = P(p.site[0], 0, p.site[1]);
      const sp = plateScreen(p, p.gap * (0.5 + 0.5 * hotAt(sx0)));
      if (sp.every(([, y]) => y > 740) || sp.every(([x]) => x < -20) || sp.every(([x]) => x > W + 20)) continue;
      shapes.push({ sp, p });
      sp.forEach(([x, y], i) => (i ? plates.lineTo(x, y) : plates.moveTo(x, y)));
      plates.closePath();
    }
    ctx.fillStyle = LAVA.crust;
    ctx.fill(plates);
    ctx.save();
    ctx.clip(plates);
    lay(ctx, drift('#341410', '#0a0303', 9, 257, 180, 30), { x: 0, y: SHORE_FAR, w: W, h: 290 }, 0.85);
    lay(ctx, noiseMask(16, 263, { cover: 0.35, soft: 0.25, col: '#4a1e16', w: 280, h: 40 }), { x: 0, y: SHORE_FAR, w: W, h: 290 }, 0.5);
    // each plate: thinner crust round its rim glowing red through, its edge lit by the seam, a faint key on its top
    for (const { sp, p } of shapes) {
      const my = sp.reduce((a, b) => a + b[1], 0) / sp.length;
      const mx = sp.reduce((a, b) => a + b[0], 0) / sp.length;
      const k = pz(zAtY(my));
      const h = hotAt(mx) * (0.35 + 0.65 * clamp01((my - SHORE_FAR) / 190));
      const path = polyPath(sp);
      ctx.strokeStyle = rgba('#d8401a', 0.28 * h);
      ctx.lineWidth = Math.max(1.5, k * 0.2);
      path(ctx);
      ctx.stroke();
      ctx.strokeStyle = rgba('#ffa050', 0.25 * h);
      ctx.lineWidth = Math.max(0.7, k * 0.05);
      ctx.stroke();
      if (p.tone > 0.75) {
        ctx.fillStyle = rgba('#5a1a0e', 0.4);
        path(ctx);
        ctx.fill();
      }
      if (k > 60 && p.tone < 0.4) {
        const a = sp[Math.floor(p.tone * 10) % sp.length];
        line(ctx, a, [mx + (p.tone - 0.2) * k * 0.6, my], rgba('#ff7a2a', 0.3 * h), Math.max(1, k * 0.012));
      }
      ctx.fillStyle = rgba('#8a7a88', 0.04);
      ctx.beginPath();
      ctx.ellipse(mx - k * 0.1, my - k * 0.02, k * 0.18, k * 0.035, 0, 0, P2);
      ctx.fill();
    }
    ctx.restore();
    // open pools glowing
    for (const p of PLATES) {
      if (!p.open) continue;
      const sp = plateScreen(p, p.gap * 0.5);
      const bb = boxOfPts(sp, 0);
      lightPool(ctx, bb.x + bb.w / 2, bb.y + bb.h / 2, bb.w * 0.6, bb.h * 0.6, '#ffc060', 0.28 * hotAt(bb.x));
    }
    // the far lava lost in its own smoke
    vfill(ctx, 0, SHORE_FAR - 4, W, 110, [[0, rgba('#5a1e16', 0.85)], [0.4, rgba('#4a1a12', 0.45)], [1, 'rgba(74,26,18,0)']]);
    // calm over the middle, behind the lanes
    const c = ctx.createRadialGradient(960, 590, 0, 960, 590, 560);
    c.addColorStop(0, 'rgba(16,5,4,0.4)');
    c.addColorStop(1, 'rgba(16,5,4,0)');
    ctx.fillStyle = c;
    ctx.fillRect(0, SHORE_FAR, W, 300);
    // where the sand pours in: a gold-white flare in the lava
    for (const s of STREAMS) {
      lightPool(ctx, s.x, s.bot, 70 * s.k, 14 * s.k, '#ffb040', 0.4);
      lightPool(ctx, s.x, s.bot, 22 * s.k, 5 * s.k, '#fff0c0', 0.55);
    }
    // the meniscus along our lip: lava lapping hot against the rock
    ctx.lineCap = 'round';
    for (const [w, col] of [[10, rgba('#ff7a2a', 0.35)], [4, rgba('#ffc060', 0.5)], [1.6, rgba('#fff0c0', 0.55)]] as const) {
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 8) ctx.lineTo(x, lipY(x) - 1);
      ctx.stroke();
    }
    // and along the far shore and the cliffs' feet
    ctx.strokeStyle = rgba('#ff9a3a', 0.4);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 8) ctx.lineTo(x, shoreY(x) + 1);
    ctx.stroke();
  });
  ctx.restore();
  // the smoke rising off it, lit red from below, against the cliffs' feet and the far wall
  softly(ctx, { x: 0, y: 150, w: W, h: 420 }, (q) => {
    for (let i = 0; i < 30; i++) {
      const x = r() * W;
      const y = shoreY(x) - 10 - r() * 80;
      const rr = 70 + r() * 140;
      const g = q.createRadialGradient(x, y, 0, x, y, rr);
      g.addColorStop(0, rgba('#8a2a18', 0.26));
      g.addColorStop(1, 'rgba(138,42,24,0)');
      q.fillStyle = g;
      q.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
  }, 0.2, 'lighter');
}

// ——— the cliffs' feet: talus of broken columns sloping into the lava ———

const SHORE_BOX: Box = { x: 0, y: 300, w: W, h: 420 };

/** A slope of fallen blocks against a cliff's foot (s: which side), from the corner of the far wall towards us. */
function talus(ctx: Ctx, r: R, s: -1 | 1): void {
  const top: Pt[] = [];
  const toe: Pt[] = [];
  for (let z = 19; z <= ZF + 0.5; z += 0.8) {
    const hgt = 2.2 + Math.sin(z * 0.45 + s) * 0.9 + Math.sin(z * 1.3) * 0.35;
    const wd = 3.2 + Math.sin(z * 0.31 + s * 2) * 1.2;
    top.push(P(s * (XW - 1.2), hgt, z));
    toe.push(P(s * (XW - 1.2 - wd), 0, z));
  }
  const pts = [...top, ...toe.slice().reverse()];
  const path = polyPath(pts);
  ctx.fillStyle = '#120c10';
  path(ctx);
  ctx.fill();
  within(ctx, path, () => {
    const bb = boxOfPts(pts, 0);
    // the blocks: broken lengths of column tumbled together, each lit on its upper edge and red from the lava below,
    // smaller with distance
    for (let i = 0; i < 260; i++) {
      const t = r();
      const z = 19 + t * t * (ZF - 19);
      const k = pz(z);
      const u = r();
      const hgt = (2.2 + Math.sin(z * 0.45 + s) * 0.9) * (1 - u);
      const X = s * (XW - 1.2 - u * (3.2 + Math.sin(z * 0.31 + s * 2) * 1.2));
      const [bx, by] = P(X, hgt, z);
      const w = (0.5 + r() * 0.8) * k;
      const h = (0.3 + r() * 0.5) * k;
      const ang = (r() - 0.5) * 0.8;
      const heat = 1 - u * 0.6;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(ang);
      ctx.fillStyle = mix(mix('#1a1418', '#2e2630', r()), '#6a2414', clamp01((1 - hgt / 3.5) * 0.7 * heat));
      ctx.beginPath();
      ctx.moveTo(-w / 2, -h / 2);
      ctx.lineTo(w * 0.3, -h / 2 - h * 0.15);
      ctx.lineTo(w / 2, -h * 0.1);
      ctx.lineTo(w * 0.45, h / 2);
      ctx.lineTo(-w / 2, h / 2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(2,1,3,0.7)';
      ctx.lineWidth = Math.max(0.6, k * 0.02);
      ctx.stroke();
      line(ctx, [-w / 2, -h / 2], [w * 0.3, -h / 2 - h * 0.15], rgba('#c87050', 0.18 + heat * 0.15), Math.max(0.6, k * 0.02));
      ctx.restore();
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, bb.y, 0, bb.y + bb.h);
    g.addColorStop(0, 'rgba(255,80,30,0)');
    g.addColorStop(1, rgba('#ff5a24', 0.22));
    ctx.fillStyle = g;
    ctx.fillRect(bb.x, bb.y, bb.w, bb.h);
    ctx.restore();
    // far off, in the haze
    const n = ctx.createLinearGradient(s < 0 ? 0 : W, 0, s < 0 ? CORNER : W - CORNER, 0);
    n.addColorStop(0, 'rgba(60,20,16,0)');
    n.addColorStop(1, 'rgba(60,20,16,0.45)');
    ctx.fillStyle = n;
    ctx.fillRect(bb.x, bb.y, bb.w, bb.h);
  });
  // hot where it meets the lava
  ctx.strokeStyle = rgba('#ffa040', 0.55);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  toe.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
}

function shore(ctx: Ctx, r: R): void {
  talus(ctx, r, -1);
  talus(ctx, r, 1);
}

// ——— the broken column (left) ———

const COL = { X: -17, z: 38, rad: 0.78, top: 4.4, sc: 2.7 };
const COL_BOX: Box = (() => {
  const k = pz(COL.z) * COL.sc;
  const [x] = P(COL.X, 0, COL.z);
  const y0 = sy((COL.top + 0.6) * COL.sc, COL.z);
  return { x: Math.floor(x - COL.rad * k - 70), y: Math.floor(y0), w: Math.ceil(COL.rad * k * 2 + 170), h: Math.ceil(lavaY(COL.z - 1.6 * COL.sc) - y0 + 14) };
})();

function column(ctx: Ctx, r: R): void {
  const k = pz(COL.z) * COL.sc;
  const [x, yb] = P(COL.X, -0.2, COL.z);
  const rad = COL.rad * k;
  const yt = sy(COL.top * COL.sc, COL.z);
  // its broken top: jagged, higher at the back left
  const jag: Pt[] = [];
  const nj = 9;
  for (let i = 0; i <= nj; i++) {
    const t = i / nj;
    const bx = x - rad + t * rad * 2;
    const bump = Math.sin(t * 7.3 + 1) * 0.12 + Math.sin(t * 17) * 0.05 + (1 - t) * 0.35;
    jag.push([bx, yt - bump * k + (r() - 0.5) * 4]);
  }
  const shaft: Pt[] = [[x - rad, yb], ...jag, [x + rad, yb]];
  const path = polyPath(shaft);
  // its shadow on the far wall behind (the light comes up from the lava in front)
  ctx.save();
  ctx.translate(14, -22);
  ctx.fillStyle = 'rgba(2,1,3,0.35)';
  path(ctx);
  ctx.fill();
  ctx.restore();
  // the drum: fluted, its curve lit from the pit (from the right, the middle of the cavern) and below
  const g = ctx.createLinearGradient(x - rad, 0, x + rad, 0);
  g.addColorStop(0, '#0c0a0e');
  g.addColorStop(0.3, '#24202a');
  g.addColorStop(0.62, '#3a3238');
  g.addColorStop(0.88, '#6a4038');
  g.addColorStop(1, '#2a1c1c');
  ctx.fillStyle = g;
  path(ctx);
  ctx.fill();
  within(ctx, path, () => {
    // the flutes: concave channels, each shaded on its left inside, lit on its right
    const nf = 14;
    for (let i = 0; i < nf; i++) {
      const a0 = -Math.PI / 2 + (i / nf) * Math.PI;
      const a1 = -Math.PI / 2 + ((i + 1) / nf) * Math.PI;
      const fx0 = x + Math.sin(a0) * rad;
      const fx1 = x + Math.sin(a1) * rad;
      const w = fx1 - fx0;
      const lit = clamp01(Math.sin((a0 + a1) / 2) * 0.7 + 0.4);
      const fg = ctx.createLinearGradient(fx0, 0, fx1, 0);
      fg.addColorStop(0, rgba('#000000', 0.5));
      fg.addColorStop(0.4, 'rgba(0,0,0,0.05)');
      fg.addColorStop(0.8, rgba('#d8a090', 0.1 * lit));
      fg.addColorStop(1, 'rgba(0,0,0,0.2)');
      ctx.fillStyle = fg;
      ctx.fillRect(fx0, yt - 60, w, yb - yt + 60);
      // the ridge between two flutes: a thin lit arris, warmer low down
      const rg = ctx.createLinearGradient(0, yt, 0, yb);
      rg.addColorStop(0, rgba('#a89aa8', 0.05 * lit));
      rg.addColorStop(1, rgba('#ff9a6a', 0.3 * lit));
      ctx.strokeStyle = rg;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(fx1, yt - 60);
      ctx.lineTo(fx1, yb);
      ctx.stroke();
    }
    // the drums' joints, a shallow curve each, and a chipped one
    for (const Y of [1.6, 3.2]) {
      const jy = sy(Y * COL.sc, COL.z);
      ctx.strokeStyle = 'rgba(3,1,3,0.4)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(x, jy, rad, rad * 0.06, 0, 0, Math.PI);
      ctx.stroke();
    }
    grain(ctx, { x: x - rad, y: yt - 60, w: rad * 2, h: yb - yt + 60 }, 'stone', 0.3, 1.2);
    lay(ctx, noiseMask(4, 271, { cover: 0.4, soft: 0.4, col: '#06030a', w: 20, h: 60 }), { x: x - rad, y: yt - 60, w: rad * 2, h: yb - yt + 60 }, 0.45);
    // soot from the top, the lava's red climbing from its foot
    vfill(ctx, x - rad, yt - 60, rad * 2, (yb - yt) * 0.6, [[0, 'rgba(3,1,3,0.7)'], [1, 'rgba(3,1,3,0)']]);
    ctx.globalCompositeOperation = 'lighter';
    vfill(ctx, x - rad, yb - (yb - yt) * 0.5, rad * 2, (yb - yt) * 0.5, [[0, 'rgba(255,80,30,0)'], [1, 'rgba(255,90,40,0.25)']]);
    ctx.globalCompositeOperation = 'source-over';
    // a crack up it from the break
    crack(ctx, r, x - rad * 0.2, yt + 6, 1.7, (yb - yt) * 0.45, { w: 2, a: 0.7, col: '#030103', lip: '#ff7a3a' });
  });
  ctx.strokeStyle = 'rgba(2,1,3,0.9)';
  ctx.lineWidth = 1.6;
  path(ctx);
  ctx.stroke();
  // the break's rough face, its back edge rimmed by the glow beyond
  ctx.strokeStyle = rgba('#ff8a4a', 0.35);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  jag.forEach(([px, py], i) => (i ? ctx.lineTo(px, py + 1.5) : ctx.moveTo(px, py + 1.5)));
  ctx.stroke();
  // the bronze band round its foot, a ring on it and the stub of a chain
  const by = sy(0.75 * COL.sc, COL.z);
  const bh = 0.32 * k;
  const bg = ctx.createLinearGradient(x - rad, 0, x + rad, 0);
  bg.addColorStop(0, mix(BRZ.deep, BRZ.green, 0.3));
  bg.addColorStop(0.4, mix(BRZ.shade, BRZ.green, 0.35));
  bg.addColorStop(0.8, mix(BRZ.body, '#ff7a3a', 0.3));
  bg.addColorStop(1, BRZ.shade);
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(x - rad - 2, by - bh / 2);
  ctx.ellipse(x, by - bh / 2, rad + 2, rad * 0.08, 0, Math.PI, 0, true);
  ctx.lineTo(x + rad + 2, by + bh / 2);
  ctx.ellipse(x, by + bh / 2, rad + 2, rad * 0.08, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(2,1,3,0.85)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  for (let i = 0; i < 7; i++) {
    const t = -0.85 + (i / 6) * 1.7;
    ctx.fillStyle = rgba(BRZ.lit, 0.35 + t * 0.2);
    ctx.beginPath();
    ctx.arc(x + t * rad, by + rad * 0.07 * Math.sqrt(1 - t * t), 2.2, 0, P2);
    ctx.fill();
  }
  // the drum fallen beside it, half sunk in the lava, lying towards us
  const dz = COL.z - 1.3 * COL.sc;
  const dk = pz(dz) * COL.sc;
  const [dx, dy] = P(COL.X + 1.05 * COL.sc, 0.05, dz);
  const dr = 0.62 * dk;
  ctx.save();
  ctx.translate(dx, dy);
  ctx.rotate(-0.12);
  const side: Pt[] = [[-dr * 1.3, 0], [-dr * 1.3, -dr * 0.62], [dr * 0.2, -dr * 0.7], [dr * 0.2, 0]];
  const sg = ctx.createLinearGradient(0, -dr * 0.7, 0, 0);
  sg.addColorStop(0, '#2a2228');
  sg.addColorStop(1, '#8a3a1e');
  ctx.fillStyle = sg;
  polyPath(side)(ctx);
  ctx.fill();
  for (let i = 1; i < 6; i++) line(ctx, [-dr * 1.3, -dr * 0.12 * i], [dr * 0.2, -dr * 0.13 * i], 'rgba(0,0,0,0.28)', 1.4);
  // its broken face towards us: the flutes' scallops round its edge
  ctx.fillStyle = '#3a2a2a';
  ctx.beginPath();
  ctx.ellipse(dr * 0.2, -dr * 0.35, dr * 0.3, dr * 0.42, 0, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(dr * 0.2, 0);
  ctx.fill();
  ctx.strokeStyle = 'rgba(2,1,3,0.85)';
  ctx.lineWidth = 1.2;
  polyPath(side)(ctx);
  ctx.stroke();
  ctx.restore();
  lightPool(ctx, dx - dr * 0.5, dy, dr * 1.6, dr * 0.25, '#ff8a3a', 0.45);
  // where the column stands in the lava: hot round its foot
  lightPool(ctx, x, yb - 2, rad * 1.4, rad * 0.18, '#ffa040', 0.5);
  line(ctx, [x - rad, yb - 3], [x + rad, yb - 3], rgba('#ffc060', 0.6), 2);
}

// ——— the toppled statue (right): its foot still standing on the plinth ———

const STAT = { X: 15.4, z: 38, plinth: 0.9, shin: 3.25, sc: 3.1 };
const STAT_BOX: Box = (() => {
  const k = pz(STAT.z) * STAT.sc;
  const [x] = P(STAT.X, 0, STAT.z);
  const y0 = sy((STAT.shin + 0.3) * STAT.sc, STAT.z);
  return { x: Math.floor(x - 2.4 * k - 60), y: Math.floor(y0), w: Math.ceil(3.9 * k + 120), h: Math.ceil(lavaY(STAT.z - 2.6 * STAT.sc) - y0 + 16) };
})();
/** The statue's stone: pale marble gone grey, lit warm from the lava below. */
const MARB = { shade: '#1e181a', body: '#3e3436', lit: '#5e5250', hot: '#9a4a30' };

function statue(ctx: Ctx, r: R): void {
  const k = pz(STAT.z) * STAT.sc;
  const SC = STAT.sc;
  const [x, yb] = P(STAT.X, -0.2, STAT.z);
  const yp = sy(STAT.plinth * SC, STAT.z);
  // the plinth: two stepped blocks of basalt
  const steps: [number, number, number][] = [[1.35, -0.2, 0.45], [1.15, 0.45, STAT.plinth]];
  for (const [hw0, Y00, Y10] of steps) {
    const hw = hw0 * SC;
    const Y0 = Y00 * SC;
    const Y1 = Y10 * SC;
    const fy0 = sy(Y0, STAT.z - hw * 0.5);
    const fy1 = sy(Y1, STAT.z - hw * 0.5);
    const fx0 = sx(STAT.X - hw, STAT.z - hw * 0.5);
    const fx1 = sx(STAT.X + hw, STAT.z - hw * 0.5);
    // its top, seen from above
    const top: Pt[] = [[fx0, fy1], [fx1, fy1], [sx(STAT.X + hw, STAT.z + hw * 0.5), sy(Y1, STAT.z + hw * 0.5)], [sx(STAT.X - hw, STAT.z + hw * 0.5), sy(Y1, STAT.z + hw * 0.5)]];
    ctx.fillStyle = '#3a2c30';
    polyPath(top)(ctx);
    ctx.fill();
    ctx.strokeStyle = rgba('#ff8a4a', 0.3);
    ctx.lineWidth = 1;
    line(ctx, top[2], top[3], rgba('#ff7a3a', 0.35), 1);
    // its front face, lit from below; its left side (towards the middle of the cavern) lit more
    const front: Pt[] = [[fx0, fy0], [fx1, fy0], [fx1, fy1], [fx0, fy1]];
    const g = ctx.createLinearGradient(0, fy1, 0, fy0);
    g.addColorStop(0, '#1e161a');
    g.addColorStop(1, '#7a2a18');
    ctx.fillStyle = g;
    polyPath(front)(ctx);
    ctx.fill();
    const lside: Pt[] = [[fx0, fy0], [fx0, fy1], top[3], [sx(STAT.X - hw, STAT.z + hw * 0.5), sy(Y0, STAT.z + hw * 0.5)]];
    const g2 = ctx.createLinearGradient(0, fy1, 0, fy0);
    g2.addColorStop(0, '#2a1a1c');
    g2.addColorStop(1, '#a8401c');
    ctx.fillStyle = g2;
    polyPath(lside)(ctx);
    ctx.fill();
    ctx.strokeStyle = 'rgba(2,1,3,0.85)';
    ctx.lineWidth = 1.2;
    polyPath(front)(ctx);
    ctx.stroke();
    polyPath(lside)(ctx);
    ctx.stroke();
    // a moulding: a lit line under the top's edge
    line(ctx, [fx0, fy1 + 3], [fx1, fy1 + 3], rgba('#ff9a5a', 0.25), 1.2);
  }
  // the foot, front on (its toes to us), on the plinth: broken off at the shin
  const fw = 1.85 * k * 0.5;
  const footY = yp + 0.25 * k * 0.3;
  const shinT = sy(STAT.shin * SC, STAT.z);
  const ankY = sy((STAT.plinth + 1.05) * SC, STAT.z);
  const shinW = 0.62 * k;
  // the silhouette: the shin's column, flaring to the ankle and the foot, the toes along its front
  const sil = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x - shinW, shinT + 6);
    // the broken top: jagged
    const bt: number[] = [6, -4, 2, -10, -2, 4, -6, 0];
    bt.forEach((d, i) => c.lineTo(x - shinW + (i / (bt.length - 1)) * shinW * 2, shinT + d));
    c.bezierCurveTo(x + shinW * 1.02, shinT + (ankY - shinT) * 0.5, x + shinW * 0.9, ankY - 6, x + shinW * 1.15, ankY + 10);
    c.bezierCurveTo(x + fw * 0.95, ankY + (footY - ankY) * 0.45, x + fw * 1.05, footY - 18, x + fw, footY - 6);
    c.lineTo(x + fw, footY);
    c.lineTo(x - fw, footY);
    c.lineTo(x - fw * 1.02, footY - 10);
    c.bezierCurveTo(x - fw * 1.05, footY - 30, x - fw * 0.85, ankY + 6, x - shinW * 1.12, ankY + 6);
    c.bezierCurveTo(x - shinW * 0.92, ankY - 8, x - shinW * 1.02, shinT + (ankY - shinT) * 0.5, x - shinW, shinT + 6);
    c.closePath();
  };
  // its shadow up the wall behind
  ctx.save();
  ctx.translate(10, -18);
  ctx.fillStyle = 'rgba(2,1,3,0.35)';
  sil(ctx);
  ctx.fill();
  ctx.restore();
  const g = ctx.createLinearGradient(x - fw, 0, x + fw, 0);
  g.addColorStop(0, MARB.lit);
  g.addColorStop(0.35, MARB.body);
  g.addColorStop(0.8, MARB.shade);
  g.addColorStop(1, '#1a1416');
  ctx.fillStyle = g;
  sil(ctx);
  ctx.fill();
  within(ctx, sil, () => {
    const bb = { x: x - fw - 4, y: shinT - 14, w: fw * 2 + 8, h: footY - shinT + 18 };
    // the lava's light from below and in front, the dark of the cavern above
    vfill(ctx, bb.x, bb.y, bb.w, bb.h, [[0, 'rgba(4,2,4,0.55)'], [0.45, 'rgba(4,2,4,0.15)'], [0.8, rgba('#c8501e', 0.12)], [1, rgba('#ff6a2a', 0.35)]]);
    lay(ctx, drift('#8a7a74', '#2a2022', 3, 281, 24, 40), bb, 0.35);
    grain(ctx, bb, 'stone', 0.35, 1);
    // the shin's roundness: shade on its right, a lit edge on its left
    const sg = ctx.createLinearGradient(x - shinW, 0, x + shinW, 0);
    sg.addColorStop(0, rgba('#c8a090', 0.18));
    sg.addColorStop(0.5, 'rgba(0,0,0,0)');
    sg.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = sg;
    ctx.fillRect(x - shinW, shinT - 10, shinW * 2, ankY - shinT + 10);
    // the ankle bones
    for (const s of [-1, 1]) {
      ctx.fillStyle = s < 0 ? rgba('#c8a090', 0.16) : 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(x + s * shinW * 0.95, ankY + 2, shinW * 0.22, shinW * 0.28, 0, 0, P2);
      ctx.fill();
    }
    // the instep rising to the ankle: shaded towards its far side
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(x + fw * 0.35, ankY + (footY - ankY) * 0.5, fw * 0.55, (footY - ankY) * 0.45, 0, 0, P2);
    ctx.fill();
    // the sandal: a strap across the instep, the knot of its thongs on top (our own knot, a ring tied in three)
    const sy0 = ankY + (footY - ankY) * 0.42;
    ctx.strokeStyle = 'rgba(20,10,8,0.6)';
    ctx.lineWidth = 0.12 * k;
    ctx.beginPath();
    ctx.moveTo(x - fw, sy0 + 10);
    ctx.quadraticCurveTo(x, sy0 - 12, x + fw, sy0 + 10);
    ctx.stroke();
    ctx.strokeStyle = rgba('#d8b8a0', 0.22);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x - fw, sy0 + 10 - 0.05 * k);
    ctx.quadraticCurveTo(x, sy0 - 12 - 0.05 * k, x + fw, sy0 + 10 - 0.05 * k);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(20,10,8,0.55)';
    ctx.lineWidth = 0.08 * k;
    ctx.beginPath();
    ctx.moveTo(x - shinW, ankY + 8);
    ctx.lineTo(x, sy0 - 4);
    ctx.lineTo(x + shinW, ankY + 8);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(20,10,8,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, sy0 - 2, 0.12 * k, 0, P2);
    ctx.stroke();
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i / 3) * P2;
      line(ctx, [x + Math.cos(a) * 0.12 * k, sy0 - 2 + Math.sin(a) * 0.12 * k], [x + Math.cos(a) * 0.2 * k, sy0 - 2 + Math.sin(a) * 0.2 * k], 'rgba(20,10,8,0.55)', 2);
    }
  });
  ctx.strokeStyle = 'rgba(2,1,3,0.9)';
  ctx.lineWidth = 1.6;
  sil(ctx);
  ctx.stroke();
  // the toes along the front: five, each a rounded mass with its nail, the big one chipped
  const toes: [number, number, number][] = [[-0.74, 0.3, 0.27], [-0.32, 0.24, 0.22], [0.04, 0.22, 0.2], [0.38, 0.2, 0.18], [0.68, 0.17, 0.15]];
  for (const [t, hgt, wdt] of toes) {
    const tx = x + t * fw;
    const tw = wdt * fw;
    const th = hgt * k;
    const tp = (c: Ctx) => {
      c.beginPath();
      c.moveTo(tx - tw, footY);
      c.bezierCurveTo(tx - tw * 1.05, footY - th * 0.9, tx - tw * 0.6, footY - th * 1.15, tx, footY - th * 1.12);
      c.bezierCurveTo(tx + tw * 0.6, footY - th * 1.15, tx + tw * 1.05, footY - th * 0.9, tx + tw, footY);
      c.closePath();
    };
    const tg = ctx.createLinearGradient(0, footY - th * 1.15, 0, footY);
    tg.addColorStop(0, mix(MARB.body, MARB.lit, t < 0 ? 0.4 : 0));
    tg.addColorStop(0.6, MARB.body);
    tg.addColorStop(1, mix(MARB.hot, MARB.body, 0.3));
    ctx.fillStyle = tg;
    tp(ctx);
    ctx.fill();
    ctx.strokeStyle = 'rgba(2,1,3,0.85)';
    ctx.lineWidth = 1.2;
    tp(ctx);
    ctx.stroke();
    // its nail, seen from the front: a flat shield on its top
    ctx.fillStyle = rgba('#c8b0a0', 0.25);
    ctx.beginPath();
    ctx.ellipse(tx, footY - th * 0.78, tw * 0.5, th * 0.22, 0, 0, P2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,16,12,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // the big toe's broken corner
  const bx = x - 0.74 * fw - 0.27 * fw * 0.5;
  ctx.fillStyle = '#2a2022';
  ctx.beginPath();
  ctx.moveTo(bx - 6, footY - 0.3 * k * 1.05);
  ctx.lineTo(bx + 4, footY - 0.3 * k * 1.1);
  ctx.lineTo(bx + 1, footY - 0.3 * k * 0.7);
  ctx.closePath();
  ctx.fill();
  // the shin's broken top: rough, rimmed by the glow behind
  line(ctx, [x - shinW, shinT + 4], [x + shinW, shinT + 2], rgba('#ff8a4a', 0.35), 1.2);
  crack(ctx, r, x + shinW * 0.2, shinT + 8, 1.4, (ankY - shinT) * 0.6, { w: 1.6, a: 0.6, col: '#120a0a', lip: '#ff8a5a' });
  // contact: the foot on its plinth
  crevice(ctx, x - fw, x + fw, footY, -6, 0.5, '#000000');
  // the rest of him toppled long ago: broken pieces of the marble half sunk round the plinth's foot
  for (const [dx, dz, w, h] of [[-1.7, -1.0, 0.42, 0.3], [-2.3, -0.3, 0.3, 0.22], [1.4, -1.2, 0.36, 0.26]] as const) {
    const [px, py] = P(STAT.X + dx * SC, 0, STAT.z + dz * SC);
    const kk = pz(STAT.z + dz * SC) * SC;
    const pts: Pt[] = [[px - w * kk, py], [px - w * kk * 0.7, py - h * kk], [px + w * kk * 0.2, py - h * kk * 1.15], [px + w * kk, py - h * kk * 0.4], [px + w * kk * 0.9, py]];
    const pg = ctx.createLinearGradient(0, py - h * kk, 0, py);
    pg.addColorStop(0, MARB.body);
    pg.addColorStop(1, MARB.hot);
    ctx.fillStyle = pg;
    polyPath(pts)(ctx);
    ctx.fill();
    ctx.strokeStyle = 'rgba(2,1,3,0.85)';
    ctx.lineWidth = 1.2;
    polyPath(pts)(ctx);
    ctx.stroke();
    line(ctx, [px - w * kk, py - 1], [px + w * kk * 0.9, py - 1], rgba('#ffc060', 0.6), 1.6);
  }
  lightPool(ctx, x, yb - 2, 1.5 * k, 0.12 * k, '#ffa040', 0.45);
}


// ——— the sand: a stream of falling grains (a frame of its loop), and its splash ———

const SAND_F = { w: 40, h: 192 };
/** One frame of a falling stream of sand (tiles vertically): a gold core with clumps riding down it, loose grains,
 * glints. The pattern moves down a full frame's height over the loop. */
function sandFrame(c: Ctx, ph: number, seed: number, o: { top?: boolean; foot?: boolean } = {}): void {
  const rr = rng(hashStr('tk:sand' + seed));
  const { w, h } = SAND_F;
  const cx = w / 2;
  const fade = (y: number) => (o.top ? smooth(0, h * 0.7, y) : 1) * (o.foot ? 1 - smooth(h * 0.3, h, y) : 1);
  const spread = (y: number) => (o.foot ? 1 + (y / h) * 1.6 : 1);
  // the core: a smooth ribbon of pouring sand, a little denser where clumps ride down it, its edges soft and frayed
  const g = c.createLinearGradient(-9, 0, 9, 0);
  g.addColorStop(0, rgba(GOLD.deep, 0));
  g.addColorStop(0.25, rgba(GOLD.body, 0.35));
  g.addColorStop(0.45, rgba(GOLD.lit, 0.9));
  g.addColorStop(0.6, rgba(GOLD.body, 0.75));
  g.addColorStop(0.8, rgba('#8a5a18', 0.3));
  g.addColorStop(1, rgba(GOLD.deep, 0));
  c.fillStyle = g;
  for (let y = 0; y < h; y++) {
    let dens = 0;
    for (let q = 0; q < 3; q++) {
      const cy = (((q + 0.3 * Math.sin(q * 2.1 + seed)) / 3 + ph) % 1) * h;
      for (const yy of [cy - h, cy, cy + h]) dens += Math.exp(-(((y - yy) / 22) ** 2));
    }
    const sp = spread(y) * (0.85 + dens * 0.25);
    c.globalAlpha = clamp01((0.62 + dens * 0.25) * fade(y));
    c.save();
    c.translate(cx, 0);
    c.scale(sp, 1);
    c.fillRect(-9, y, 18, 1.05);
    c.restore();
  }
  c.globalAlpha = 1;
  // loose grains drifting off its edges, soft
  for (let i = 0; i < 46; i++) {
    const off = (rr() + rr() - 1) * 11;
    const y0 = rr() * h;
    const a = 0.25 + rr() * 0.4;
    const y = (y0 + ph * h) % h;
    for (const yy of [y - h, y]) {
      const f = fade(Math.max(0, Math.min(h, yy)));
      if (f <= 0.01) continue;
      c.fillStyle = rgba(rr() < 0.3 ? GOLD.white : GOLD.lit, a * f);
      c.beginPath();
      c.ellipse(cx + off * spread(yy), yy, 0.6, 1.6, 0, 0, P2);
      c.fill();
    }
  }
  // a glint or two: grains flashing as they turn
  for (let i = 0; i < 3; i++) {
    const off = (rr() - 0.5) * 6;
    const y = (rr() * h + ph * h) % h;
    const tw = Math.max(0, Math.sin((ph * 2 + rr()) * P2));
    if (tw < 0.5) continue;
    const gl = c.createRadialGradient(cx + off, y, 0, cx + off, y, 3);
    gl.addColorStop(0, rgba(GOLD.white, 0.8 * tw * fade(y)));
    gl.addColorStop(1, rgba(GOLD.white, 0));
    c.fillStyle = gl;
    c.fillRect(cx + off - 3, y - 3, 6, 6);
  }
}

const SPLASH = { w: 160, h: 90 };
/** Where a stream hits the lava (a frame of its loop): a plume of gold dust boiling up off the impact, hot light
 * flaring round it, grains bouncing out; the source at (w/2, h - 18). */
function splashFrame(c: Ctx, ph: number, seed: number): void {
  const rr = rng(hashStr('tk:splash' + seed));
  const { w, h } = SPLASH;
  const x0 = w / 2;
  const y0 = h - 18;
  // the hot ring in the lava round it
  const fl = 0.75 + 0.25 * Math.sin(ph * P2 * 2 + seed);
  let g = c.createRadialGradient(x0, y0, 0, x0, y0, 40);
  g.addColorStop(0, rgba('#fff0c0', 0.55 * fl));
  g.addColorStop(0.3, rgba('#ffa040', 0.35 * fl));
  g.addColorStop(1, 'rgba(255,120,40,0)');
  c.save();
  c.translate(x0, y0);
  c.scale(1, 0.3);
  c.translate(-x0, -y0);
  c.fillStyle = g;
  c.fillRect(x0 - 40, y0 - 40, 80, 80);
  c.restore();
  // the plume: soft lobes of gold dust and steam born at the impact, rising and spreading, thinning
  for (let i = 0; i < 9; i++) {
    const q = (ph + i / 9) % 1;
    const dir = Math.sin(i * 2.7 + seed) * 0.9;
    const x = x0 + dir * q * 34 + Math.sin(q * 5 + i) * 3;
    const y = y0 - 4 - q * 46;
    const rad = 6 + q * 18;
    const a = Math.min(1, q * 6) * (1 - q) ** 1.4;
    g = c.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, rgba(i % 3 ? '#e8b860' : '#c89a8a', 0.35 * a));
    g.addColorStop(1, 'rgba(232,184,96,0)');
    c.fillStyle = g;
    c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // grains thrown out in arcs
  for (let i = 0; i < 26; i++) {
    const q = (ph + rr()) % 1;
    const vx = (rr() - 0.5) * 70;
    const vy = -40 - rr() * 50;
    const x = x0 + vx * q;
    const y = y0 + vy * q + 110 * q * q;
    if (y > y0 + 2) continue;
    c.fillStyle = rgba(rr() < 0.4 ? GOLD.white : GOLD.lit, 0.8 * (1 - q));
    c.fillRect(x - 0.7, y - 0.7, 1.4, 1.4);
  }
  // the hiss: a bright core where it lands
  c.fillStyle = rgba('#fff4d0', 0.6 * fl);
  c.beginPath();
  c.ellipse(x0, y0, 7, 2.2, 0, 0, P2);
  c.fill();
}

/** The streams painted still (frame 0 of the loop). */
function sandStill(ctx: Ctx): void {
  for (const [i, s] of STREAMS.entries()) {
    const sc = s.w / 7;
    const segH = SAND_F.h * sc;
    let y = s.top;
    let first = true;
    while (y < s.bot) {
      const foot = y + segH >= s.bot;
      ctx.save();
      ctx.beginPath();
      ctx.rect(s.x - 40, y, 80, Math.min(segH, s.bot - y + 2));
      ctx.clip();
      ctx.translate(s.x - (SAND_F.w / 2) * sc, y);
      ctx.scale(sc, sc);
      // (the far pair dimmer in the haze)
      ctx.globalAlpha = s.z > 40 ? 0.55 : 1;
      sandFrame(ctx, (i * 0.37) % 1, i, { top: first, foot });
      ctx.restore();
      y += segH;
      first = false;
    }
    ctx.save();
    ctx.translate(s.x - (SPLASH.w / 2) * s.k, s.bot - (SPLASH.h - 18) * s.k);
    ctx.scale(s.k, s.k);
    splashFrame(ctx, 0.3 + i * 0.2, i);
    ctx.restore();
  }
}

// ——— the lava's bubbles (a frame of their loop) ———

const BUB = { w: 120, h: 70 };
/** A crust dome on the lava through its cycle (ph 0…1): it swells, its crust splitting with glowing seams; bursts,
 * throwing spatter; the opening glows and crusts over again, rings spreading. Source (w/2, h - 18). */
function bubbleFrame(c: Ctx, ph: number, seed: number): void {
  const { w, h } = BUB;
  const x0 = w / 2;
  const y0 = h - 18;
  const rr = rng(hashStr('tk:bub' + seed));
  const swell = smooth(0.0, 0.55, ph) * (1 - smooth(0.55, 0.6, ph));
  const burst = smooth(0.55, 0.6, ph) * (1 - smooth(0.62, 0.95, ph));
  const heal = smooth(0.6, 1, ph);
  // the glow under it, brightest as it bursts
  const glow = 0.25 + swell * 0.35 + burst * 0.9;
  let g = c.createRadialGradient(x0, y0, 0, x0, y0, 46);
  g.addColorStop(0, rgba('#ffb040', 0.45 * glow));
  g.addColorStop(0.5, rgba('#ff6a1a', 0.2 * glow));
  g.addColorStop(1, 'rgba(255,100,30,0)');
  c.save();
  c.translate(x0, y0);
  c.scale(1, 0.32);
  c.fillStyle = g;
  c.fillRect(-46, -46, 92, 92);
  c.restore();
  // rings spreading after it bursts
  if (ph > 0.6) {
    const q = (ph - 0.6) / 0.4;
    for (const d of [0, 0.3]) {
      const qq = q - d;
      if (qq <= 0) continue;
      c.strokeStyle = rgba('#ffa040', 0.35 * (1 - qq));
      c.lineWidth = 1.6;
      c.beginPath();
      c.ellipse(x0, y0, 12 + qq * 36, (12 + qq * 36) * 0.28, 0, 0, P2);
      c.stroke();
    }
  }
  if (swell > 0.02) {
    // the dome: dark crust, lit at its rim, its seams opening as it swells
    const rw = 6 + swell * 26;
    const rh = 2 + swell * 15;
    c.fillStyle = '#ff7a2a';
    c.beginPath();
    c.ellipse(x0, y0, rw + 2, rh + 2, 0, Math.PI, 0);
    c.ellipse(x0, y0, rw + 2, (rw + 2) * 0.28, 0, 0, Math.PI);
    c.fill();
    g = c.createLinearGradient(0, y0 - rh, 0, y0);
    g.addColorStop(0, '#3a1610');
    g.addColorStop(0.7, '#1e0a08');
    g.addColorStop(1, '#5a1a0c');
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(x0, y0, rw, rh, 0, Math.PI, 0);
    c.ellipse(x0, y0, rw, rw * 0.26, 0, 0, Math.PI);
    c.fill();
    // its seams: cracks over the dome, wider and hotter as it swells
    c.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI * (0.15 + (i / 4) * 0.7) + (rr() - 0.5) * 0.3;
      const x1 = x0 + Math.cos(a) * rw * 0.95;
      const y1 = y0 + Math.sin(a) * rh * 0.95;
      c.strokeStyle = rgba(swell > 0.7 ? '#ffd070' : '#ff7a2a', 0.4 + swell * 0.6);
      c.lineWidth = 0.6 + swell * 2.2;
      c.beginPath();
      c.moveTo(x0 + (rr() - 0.5) * 4, y0 - rh * 0.7);
      c.quadraticCurveTo((x0 + x1) / 2 + (rr() - 0.5) * 6, (y0 - rh + y1) / 2, x1, y1);
      c.stroke();
    }
    // the key's faint glint on its crown
    c.fillStyle = rgba('#d8a890', 0.15 * swell);
    c.beginPath();
    c.ellipse(x0 - rw * 0.3, y0 - rh * 0.75, rw * 0.25, rh * 0.15, -0.3, 0, P2);
    c.fill();
  }
  if (burst > 0.02 || (ph > 0.58 && ph < 1)) {
    // the opening: molten, glowing, crusting over as it heals
    const ow = 26 * (1 - heal * 0.6);
    const oh = ow * 0.3;
    const hot = clamp01(burst * 1.4 + (1 - heal) * 0.4);
    g = c.createRadialGradient(x0, y0, 0, x0, y0, ow);
    g.addColorStop(0, mix('#5a1a0c', '#fff0c0', hot));
    g.addColorStop(0.5, mix('#3a120a', '#ffa040', hot));
    g.addColorStop(1, mix('#1e0a08', '#d8461a', hot * 0.8));
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(x0, y0, ow, oh, 0, 0, P2);
    c.fill();
    // the torn crust round it, folded back
    c.strokeStyle = rgba('#2a0e08', 0.85);
    c.lineWidth = 3 * (1 - heal * 0.5);
    c.beginPath();
    c.ellipse(x0, y0, ow + 2, oh + 1.5, 0, 0, P2);
    c.stroke();
    // crust re-forming over it: dark skins drifting in from the edge
    if (heal > 0.2) {
      c.fillStyle = rgba('#1e0a08', clamp01((heal - 0.2) * 1.4));
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * P2 + seed;
        c.beginPath();
        c.ellipse(x0 + Math.cos(a) * ow * 0.5, y0 + Math.sin(a) * oh * 0.5, ow * 0.55 * heal, oh * 0.55 * heal, a, 0, P2);
        c.fill();
      }
    }
  }
  if (burst > 0.05) {
    // spatter: blobs of lava thrown up, falling back
    const q = (ph - 0.55) / 0.3;
    for (let i = 0; i < 10; i++) {
      const vx = (rr() - 0.5) * 80;
      const vy = -60 - rr() * 70;
      const x = x0 + vx * q;
      const y = y0 + vy * q + 160 * q * q;
      if (y > y0 + 1 || q > 1) continue;
      const s = 1.2 + rr() * 2.4;
      c.fillStyle = rgba(q < 0.4 ? '#fff0c0' : '#ffa040', 0.95 * (1 - q * 0.5));
      c.beginPath();
      c.ellipse(x, y, s * 1.3, s, Math.atan2(vy + 320 * q, vx), 0, P2);
      c.fill();
    }
  }
}

/** Where the bubbles boil (world X, z; size), fixed: the still paints them at rest. */
const BUBBLES: [number, number, number][] = [
  [-7.2, 11.6, 1.6],
  [-3.6, 14.4, 1.4],
  [2.2, 12.8, 1.5],
  [6.2, 11.4, 1.6],
  [8.6, 16.8, 1.5],
  [-9.6, 19.5, 1.6],
  [-1.2, 22, 1.7],
  [5.8, 27, 1.8],
];

function pitStill(ctx: Ctx): void {
  for (const [i, [X, z, s]] of BUBBLES.entries()) {
    const k = (pz(z) / 100) * s;
    const [x, y] = P(X, 0, z);
    ctx.save();
    ctx.translate(x - (BUB.w / 2) * k, y - (BUB.h - 18) * k);
    ctx.scale(k, k);
    bubbleFrame(ctx, [0.3, 0.75, 0.5, 0.15, 0.9, 0.45][i % 6], i);
    ctx.restore();
  }
}

// ——— our ledge: the pit's near lip, and the pavement of the columns' tops ———

const LEDGE_BOX: Box = { x: 0, y: 650, w: W, h: TY - 650 };

/** The pavement: the basalt columns' hexagonal tops worn flat (world X, z), fixed. */
const PAVERS: { X: number; z: number; rad: number; rot: number; tone: number }[] = (() => {
  const r = rng(hashStr('tk:pave'));
  const out: { X: number; z: number; rad: number; rot: number; tone: number }[] = [];
  const rad = 0.56;
  const dz = rad * 1.5;
  for (let row = 0; row < 6; row++) {
    const z = 7.3 + row * dz;
    for (let X = -12 + (row % 2) * rad * 0.87; X < 12; X += rad * 1.73) out.push({ X: X + (r() - 0.5) * 0.06, z: z + (r() - 0.5) * 0.05, rad: rad * (0.97 + r() * 0.06), rot: Math.PI / 6 + (r() - 0.5) * 0.12, tone: r() });
  }
  return out.sort((a, b) => b.z - a.z);
})();

const ledgePath = (c: Ctx) => {
  c.beginPath();
  for (let x = -10; x <= W + 10; x += 8) c.lineTo(x, lipY(x));
  c.lineTo(W + 10, TY + 4);
  c.lineTo(-10, TY + 4);
  c.closePath();
};

function ledge(ctx: Ctx, r: R): void {
  ctx.fillStyle = '#16101a';
  ledgePath(ctx);
  ctx.fill();
  within(ctx, ledgePath, () => {
    const b = LEDGE_BOX;
    vfill(ctx, 0, 650, W, TY + 6 - 650, [[0, '#3a1a16'], [0.25, '#241820'], [1, '#141018']]);
    lay(ctx, drift('#2e2430', '#0a080c', 6, 301, 120, 12), b, 0.6);
    // the hexagonal tops, worn into a pavement: each its own tone, its joints dark, the far edge of each lit by the lava
    for (const pv of PAVERS) {
      const pts: Pt[] = [];
      for (let i = 0; i < 6; i++) {
        const a = pv.rot + (i / 6) * P2;
        pts.push(P(pv.X + Math.cos(a) * pv.rad, 0.2, pv.z + Math.sin(a) * pv.rad));
      }
      // (lowered: the shelf is a little above the lava)
      const yo = 0;
      const sp = pts.map(([x, y]): Pt => [x, y + yo]);
      if (sp.every(([, y]) => y < 640) || sp.every(([, y]) => y > TY + 8)) continue;
      const path = polyPath(sp);
      const near = clamp01((sp[0][1] - 670) / 90);
      ctx.fillStyle = mix(mix('#1c1519', '#2a2026', pv.tone), '#100b10', near * 0.5);
      path(ctx);
      ctx.fill();
      ctx.strokeStyle = 'rgba(2,1,3,0.75)';
      ctx.lineWidth = 1.6 - near * 0.4;
      ctx.stroke();
      // its back edges catch the lava's glow, its front edges a faint key
      let top = 0;
      for (let i = 1; i < 6; i++) if (sp[i][1] < sp[top][1]) top = i;
      const back1 = sp[(top + 5) % 6];
      const back2 = sp[(top + 1) % 6];
      const glowK = 1 - clamp01((sp[top][1] - 670) / 80);
      line(ctx, back1, [sp[top][0], sp[top][1] + 0.8], rgba('#ff7a3a', 0.15 + glowK * 0.35), 1.2);
      line(ctx, [sp[top][0], sp[top][1] + 0.8], back2, rgba('#ff7a3a', 0.15 + glowK * 0.35), 1.2);
    }
    lay(ctx, noiseMask(8, 307, { cover: 0.4, soft: 0.35, col: '#4a3a40', w: 200, h: 14 }), b, 0.18);
    grain(ctx, b, 'stone', 0.3, 1.3);
    // ash and grit gathered in the joints, a few loose stones
    for (let i = 0; i < 60; i++) {
      const x = r() * W;
      const y = lipY(x) + 10 + r() * (TY - lipY(x) - 10);
      const s = 1 + r() * 2.5;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.ellipse(x + 1, y + s * 0.5, s * 1.2, s * 0.5, 0, 0, P2);
      ctx.fill();
      ctx.fillStyle = mix('#4a3a40', '#8a4a30', 1 - clamp01((y - 680) / 70));
      ctx.beginPath();
      ctx.ellipse(x, y, s, s * 0.7, r() * 3, 0, P2);
      ctx.fill();
    }
    // the lava's light over the lip, falling off towards us; the table's back edge throws the near pavement into shade
    const g = ctx.createLinearGradient(0, 665, 0, 735);
    g.addColorStop(0, rgba('#ff6a2a', 0.42));
    g.addColorStop(0.35, rgba('#ff5a20', 0.12));
    g.addColorStop(1, 'rgba(255,90,32,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.fillRect(0, 650, W, 90);
    ctx.globalCompositeOperation = 'source-over';
    crevice(ctx, 0, W, TY + 2, -30, 0.55, '#000000');
  });
  // the lip itself: the rock's rounded edge, hot where the lava touches it
  ctx.lineCap = 'round';
  for (const [dy, w, col] of [[2.5, 5, 'rgba(10,4,4,0.9)'], [0.5, 2.2, rgba('#ff9a4a', 0.75)], [-0.3, 1, rgba('#fff0c0', 0.6)]] as const) {
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.beginPath();
    for (let x = -10; x <= W + 10; x += 8) ctx.lineTo(x, lipY(x) + dy);
    ctx.stroke();
  }
  // splashes of lava cooled on the lip: dark drips with a hot core here and there
  for (let x = 30 + r() * 80; x < W; x += 90 + r() * 160) {
    const y = lipY(x);
    const s = 3 + r() * 5;
    ctx.fillStyle = '#2a0c08';
    ctx.beginPath();
    ctx.ellipse(x, y + s * 0.6, s * 1.6, s * 0.7, 0, 0, P2);
    ctx.fill();
    ctx.fillStyle = rgba('#ff8a3a', 0.6);
    ctx.beginPath();
    ctx.ellipse(x - s * 0.2, y + s * 0.4, s * 0.6, s * 0.25, 0, 0, P2);
    ctx.fill();
  }
}

// ——— the table: polished basalt ———

function table(ctx: Ctx, r: R): void {
  const f = TK.front;
  const zf = zFront(f);
  const box = { x: 0, y: TY, w: W, h: f - TY };
  const T = (X: number, z: number): Pt => [xAt(X, z), yAt(z)];
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, f - TY + 4);
  ctx.clip();
  vfill(ctx, 0, TY, W, f - TY + 4, [[0, '#0c0a0e'], [0.5, '#131016'], [1, '#18141b']]);
  lay(ctx, drift('#241a20', '#08080e', 4, 311, 160, 40), box, 0.4);
  lay(ctx, drift('#1c161c', '#0c0a10', 16, 313, 200, 50), box, 0.25);
  // the faint hexagons of its jointing, healed and polished over: only their lines, in the slab's perspective
  ctx.lineWidth = 1;
  const rad = 0.42;
  for (let row = 0; row < 40; row++) {
    const z = ZB + row * rad * 0.75 * 0.3;
    if (z > zf) break;
    for (let X = -10 + (row % 2) * rad * 0.87; X < 10; X += rad * 1.73) {
      const pts: Pt[] = [];
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 6 + (i / 6) * P2;
        pts.push(T(X + Math.cos(a) * rad, z + Math.sin(a) * rad * 0.3));
      }
      if (pts.every(([x]) => x < -20 || x > W + 20)) continue;
      ctx.strokeStyle = rgba(r() < 0.5 ? '#000000' : '#6a5a70', 0.06 + r() * 0.05);
      polyPath(pts)(ctx);
      ctx.stroke();
    }
  }
  // its polish: the lava's red mirrored along its back, soft, and a faint sheen down the middle
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  softly(ctx, { x: 0, y: TY, w: W, h: f - TY }, (q) => {
    const g = q.createLinearGradient(0, TY, 0, TY + 160);
    g.addColorStop(0, rgba('#ff5a26', 0.14));
    g.addColorStop(1, 'rgba(255,90,38,0)');
    q.fillStyle = g;
    q.fillRect(0, TY, W, 160);
    for (const s of STREAMS) {
      const sg = q.createLinearGradient(0, TY, 0, f);
      sg.addColorStop(0, rgba('#ffc060', 0.05));
      sg.addColorStop(1, 'rgba(255,192,96,0)');
      q.fillStyle = sg;
      const xb = s.x + (s.x - 960) * 0.25;
      q.beginPath();
      q.moveTo(s.x - 16, TY);
      q.lineTo(s.x + 16, TY);
      q.lineTo(xb + 60, f);
      q.lineTo(xb - 60, f);
      q.closePath();
      q.fill();
    }
  }, 0.05, 'lighter');
  ctx.restore();
  // the slabs' joints on the rim's spacing
  for (let n = -4; n <= 4; n++) {
    const xf = 960 + (n + 0.5) * KEY_U * SLAB;
    const X = (xf - 960) * (zf / 1210);
    line(ctx, [xAt(X, ZB), TY], [xAt(X, zf), f + 4], 'rgba(0,0,0,0.6)', 2.2);
    line(ctx, [xAt(X, ZB) + 2, TY], [xAt(X, zf) + 3, f + 4], 'rgba(200,120,90,0.07)', 1.2);
  }
  // chips along the front edge
  for (let x = 30 + r() * 60; x < W - 20; x += 110 + r() * 160) {
    const rw = 10 + r() * 20;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(x, f - 1, rw, 5 + r() * 5, 0, Math.PI, 0);
    ctx.fill();
  }
  grain(ctx, box, 'stone', 0.07, 1.4);
  ctx.restore();
  tableFalloff(ctx, f, 0.4, '#040205');
  crevice(ctx, 0, W, TY, 26, 0.55, '#000000');
  ctx.fillStyle = rgba('#ff8a5a', 0.16);
  ctx.fillRect(0, TY, W, 2);
  rimBand(ctx, f);
}


// ——— the shade ———

function shadeOver(ctx: Ctx): void {
  calmLanes(ctx, 0.2, '#050204', 140, 700);
  vignetteAll(ctx, 0.5, '#030103');
  // under the HUD: the dark above kept dark
  vfill(ctx, 0, 0, W, 200, [[0, 'rgba(2,1,3,0.6)'], [1, 'rgba(2,1,3,0)']]);
}

// ——— the stack ———

const DIAL_BOX: Box = { x: TK.dial.x - TK.dial.r - 30, y: TK.dial.y - TK.dial.r - 30, w: TK.dial.r * 2 + 60, h: Math.ceil(SHORE_FAR + 20 - (TK.dial.y - TK.dial.r - 30)) };
const TABLE_BOX: Box = { x: 0, y: TY, w: W, h: 1080 - TY };
const PIT_BOX: Box = { x: 160, y: 430, w: W - 320, h: 272 };
const SAND_BOX: Box = (() => {
  const xs = STREAMS.map((s) => s.x);
  return { x: Math.floor(Math.min(...xs) - 90), y: -20, w: Math.ceil(Math.max(...xs) - Math.min(...xs) + 180), h: Math.ceil(Math.max(...STREAMS.map((s) => s.bot)) + 40) };
})();
const DIAL_GLINT_BOX: Box = { x: TK.dial.x - TK.dial.r - 40, y: TK.dial.y - TK.dial.r - 40, w: TK.dial.r * 2 + 80, h: Math.ceil(SHORE_FAR - (TK.dial.y - TK.dial.r - 40)) };

export const TITANKING: SceneSpec = {
  id: 'titanking',
  info: {
    name: 'The Titans’ Prison',
    subtitle: 'Mini-boss: KRONOS THE TITAN KING',
    ambient: [],
    // (the lava's light and the sand are the live layer's)
    glows: [],
    light: '#e8b8a0',
    tableTint: '#f2e6e0',
  },
  layers: [
    { id: 'far', box: FAR_BOX, draw: farWall },
    { id: 'dial', box: DIAL_BOX, draw: dial },
    { id: 'walls', box: WALLS_BOX, draw: walls },
    { id: 'titans', box: TITANS_BOX, draw: (c) => titans(c) },
    { id: 'lava', box: LAVA_BOX, draw: lava },
    { id: 'shore', box: SHORE_BOX, draw: shore },
    { id: 'column', box: COL_BOX, draw: column },
    { id: 'statue', box: STAT_BOX, draw: statue },
    { id: 'dialGlint', box: DIAL_GLINT_BOX, liveOnly: true, res: 0.5, draw: (c) => dialGlint(c) },
    { id: 'smokeFar', box: SMOKE_FAR, motion: 'sprite', res: 0.5, draw: (c) => smokeBank(c, SMOKE_FAR, 1, 0.16) },
    { id: 'smokeMid', box: SMOKE_MID, motion: 'sprite', res: 0.5, draw: (c) => smokeBank(c, SMOKE_MID, 2, 0.14) },
    { id: 'pit', box: PIT_BOX, motion: 'slot', draw: () => {} },
    { id: 'pitStill', box: PIT_BOX, stillOnly: true, draw: (c) => pitStill(c) },
    { id: 'sand', box: SAND_BOX, motion: 'slot', draw: () => {} },
    { id: 'sandStill', box: SAND_BOX, stillOnly: true, draw: (c) => sandStill(c) },
    { id: 'ledge', box: LEDGE_BOX, draw: ledge },
    { id: 'table', box: TABLE_BOX, draw: table },
    { id: 'top', motion: 'top', draw: () => {} },
  ],
  shade: shadeOver,
};

// ——— live ———

registerKitScene(TITANKING, (k: KitLive) => {
  const top = k.slot('top');
  const pitC = k.slot('pit');
  const sandC = k.slot('sand');
  const ev = k.sc.events;

  // ——— the sand streams ———
  const sandKeys = ([['tk_sand', {}], ['tk_sandTop', { top: true }], ['tk_sandFoot', { foot: true }]] as const).map(([key, o]) =>
    sheet(k, key, SAND_F.w, SAND_F.h, 8, (c, ph) => sandFrame(c, ph, 0, o)),
  );
  const splashKey = sheet(k, 'tk_splash', SPLASH.w, SPLASH.h, 8, (c, ph) => splashFrame(c, ph, 2));
  const streams = STREAMS.map((s, i) => {
    const sc = s.w / 7;
    const segH = SAND_F.h * sc;
    const segs: Loop[] = [];
    const phase = i * 2.3;
    for (let y = s.top, n = 0; y < s.bot; y += segH, n++) {
      const foot = y + segH >= s.bot;
      const key = foot ? sandKeys[2] : n === 0 ? sandKeys[1] : sandKeys[0];
      segs.push(new Loop(k, key, 8, s.x, y, { into: sandC, origin: [0.5, 0], scale: sc, fps: 9, phase }));
    }
    const splash = new Loop(k, splashKey, 8, s.x, s.bot + 18 * s.k, { into: sandC, origin: [0.5, 1], scale: s.k, fps: 10, phase: i * 1.7 });
    const glow = k.glow(s.x, s.bot, 60 * s.k, 0xffa040, 0.25, { into: sandC, sy: 0.3 });
    return { s, sc, segs, splash, glow, rate: new Rate() };
  });
  const glints = new Parts(k, { frame: 'spark', add: true, into: sandC, max: 80 });
  let thick = 0;
  let thickT = 0;
  let sparkle = 0;

  // ——— the smoke banks drifting across the chasm ———
  const banks = (['smokeFar', 'smokeMid'] as const).map((id, i) => {
    const img = k.sprite(id);
    return { img, x0: img.x, y0: img.y, a0: img.alpha, seed: i * 2.1, amp: i ? 50 : 36, speed: i ? 0.05 : 0.035 };
  });

  // ——— the lava ———
  const bubKey = sheet(k, 'tk_bubble', BUB.w, BUB.h, 12, (c, ph) => bubbleFrame(c, ph, 5));
  const bubbles = BUBBLES.map(([X, z, s]) => {
    const kk = (pz(z) / 100) * s;
    const [x, y] = P(X, 0, z);
    const l = new Loop(k, bubKey, 12, x, y + 18 * kk, { into: pitC, origin: [0.5, 1], scale: kk, fps: 0.8 + crand() * 0.5, phase: crand() * 12 });
    return { l, x };
  });
  // the lava's breathing glow, hot currents drifting under the crust
  const breath = [
    k.glow(420, 600, 440, 0xff5a1a, 0.12, { into: pitC, sy: 0.2 }),
    k.glow(960, 630, 520, 0xff4a1a, 0.07, { into: pitC, sy: 0.18 }),
    k.glow(1500, 600, 440, 0xff5a1a, 0.12, { into: pitC, sy: 0.2 }),
  ];
  const currents = [0, 1, 2, 3, 4, 5].map((i) => ({ img: k.glow(0, 0, 140, i % 2 ? 0xff8a2a : 0xffb040, 0, { into: pitC, sy: 0.2 }), t: crand(), z: 11 + i * 3.2, speed: 0.01 + crand() * 0.008, dir: i % 2 ? 1 : -1 }));
  // heat shimmer over it (painted at 8 phases)
  const SHW = 90;
  const SHH = 200;
  const shimmerKey = sheet(k, 'tk_shimmer', SHW, SHH, 8, (c, ph) => {
    c.globalCompositeOperation = 'lighter';
    for (let j = 0; j < 5; j++) {
      const x0 = SHW * (0.15 + j * 0.17);
      c.strokeStyle = rgba(j % 2 ? '#ffb070' : '#ff7040', 0.07);
      c.lineWidth = 6 + (j % 3) * 3;
      c.beginPath();
      for (let y = SHH; y >= 0; y -= 6) {
        const t = 1 - y / SHH;
        const x = x0 + Math.sin(t * 9 - ph * P2 * 2 + j * 1.3) * (3 + t * 7) + Math.sin(t * 23 - ph * P2 * 3 + j) * 1.5;
        if (y === SHH) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();
    }
    c.globalCompositeOperation = 'destination-in';
    const g = c.createLinearGradient(0, 0, 0, SHH);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.4, 'rgba(0,0,0,0.6)');
    g.addColorStop(0.85, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, SHW, SHH);
  });
  const shimmers = [
    { x: 330, y: 668, s: 1.6 },
    { x: 760, y: 676, s: 1.4 },
    { x: 1180, y: 676, s: 1.4 },
    { x: 1600, y: 672, s: 1.6 },
    { x: 560, y: 540, s: 1.0 },
    { x: 1380, y: 540, s: 1.0 },
  ].map((m, i) => new Loop(k, shimmerKey, 8, m.x, m.y, { into: top, add: true, origin: [0.5, 1], scale: m.s, fps: 5, phase: i * 2.7 }));
  const embers = new Parts(k, { frame: 'ember', add: true, into: top, max: 140 });
  const emberRate = new Rate();
  const spatter = new Parts(k, { frame: 'drop', add: true, into: pitC, max: 90 });
  const surge = k.glow(960, 640, 520, 0xff7a2a, 0, { into: pitC, sy: 0.4 });
  let surgeK = 0;
  let surgeX = 960;
  let boil = 0;
  let flare = 0;

  // ——— out of the dark above: dust and stones shaken loose ———
  const CS = 14;
  const chipKey = sheet(k, 'tk_chip', CS, CS, 6, (c, _p, i) => {
    const rr = rng(hashStr('tk:chip' + i));
    const n = 5 + (i % 3);
    const pts: Pt[] = [];
    for (let j = 0; j < n; j++) {
      const a = (j / n) * P2 + rr() * 0.5;
      const rad = CS * (0.25 + rr() * 0.2);
      pts.push([CS / 2 + Math.cos(a) * rad, CS / 2 + Math.sin(a) * rad]);
    }
    c.fillStyle = '#1a1216';
    polyPath(pts)(c);
    c.fill();
    c.fillStyle = rgba('#ff7a3a', 0.45);
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    c.lineTo(pts[1][0], pts[1][1]);
    c.lineTo(CS / 2, CS / 2);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.6)';
    c.lineWidth = 0.8;
    polyPath(pts)(c);
    c.stroke();
  });
  const pebbles = new Parts(k, { frame: 'spark', sheet: { key: chipKey, n: 6, half: CS / 2 }, into: top, max: 50 });
  const grit = new Parts(k, { frame: 'mote', into: top, max: 160 });
  const dust = new Parts(k, { frame: 'puff', into: top, max: 90 });
  const hiss = new Parts(k, { frame: 'spark', add: true, into: top, max: 60 });
  const dustRate = new Rate();
  /** The lava's y under screen x at depth z. */
  const lavaUnder = (x: number, z: number) => Math.max(shoreY(x) + 3, Math.min(lipY(x) - 4, lavaY(z)));
  const shed = (n: number, p: number) => {
    for (let i = 0; i < n; i++) {
      const z = 13 + crand() * 30;
      const x = 80 + crand() * 1760;
      const y0 = -10 + crand() * 60;
      const floor = lavaUnder(x, z);
      const kk = pz(z) / 60;
      if (crand() < 0.45)
        pebbles.spawn({ x, y: y0, vx: (crand() - 0.5) * 30, vy: crand() * 60, life: 3, r0: (1.5 + crand() * 2.5) * kk, a: 1, tint: 0xffffff, grav: 900, drag: 0.1, spin: (crand() - 0.5) * 10, floor, onFloor: (fx, fy) => plop(fx, fy, kk), fade: 0.02 });
      else grit.spawn({ x, y: y0, vx: (crand() - 0.5) * 16, vy: crand() * 40, life: 3, r0: 0.8 + crand() * 1.2, a: 0.8, tint: crand() < 0.5 ? 0x8a6a68 : 0x5a4a50, grav: 700, drag: 0.3, floor, fade: 0.02 });
    }
    for (let i = 0; i < Math.round(1 + p * 4); i++) {
      const x = 120 + crand() * 1680;
      dust.spawn({ x, y: 20 + crand() * 120, vx: (crand() - 0.5) * 10, vy: 20 + crand() * 26, life: 2.8 + crand(), r0: 8, r1: 30 + crand() * 22, a: 0.18, tint: 0x6a5056, grav: 16, drag: 1.1, fade: 0.15 });
    }
  };
  /** Something small lands in the lava: a spit of light and a spark or two. */
  const plop = (x: number, y: number, s: number) => {
    for (let i = 0; i < 3; i++) hiss.spawn({ x, y: y - 1, vx: (crand() - 0.5) * 60 * s, vy: (-60 - crand() * 80) * s, life: 0.4 + crand() * 0.3, r0: 1.4 * s + 0.6, r1: 0.4, a: 1, tint: crand() < 0.5 ? 0xffd080 : 0xff8a3a, grav: 500, streak: 0.03, fade: 0.1 });
  };

  // ——— the dial's moons ———
  const dialG = k.sprite('dialGlint');
  dialG.setBlendMode(Phaser.BlendModes.ADD);
  let dialK = 0;

  const emberBurst = (p: number, x?: number) => {
    const ex = x !== undefined ? x + (crand() - 0.5) * 500 : 160 + crand() * 1600;
    const z = 10.5 + crand() * 25;
    const y = lavaUnder(ex, z);
    embers.spawn({ x: ex, y, vx: (crand() - 0.5) * 30 * p, vy: (-40 - crand() * 90) * p, life: 2 + crand() * 2.4, r0: (1.2 + crand() * 1.8) * Math.min(1.4, pz(z) / 80), r1: 0.4, a: 0.9, tint: crand() < 0.35 ? 0xffd27a : crand() < 0.6 ? 0xff8a2a : 0xff5a1c, grav: -14, drag: 0.35, streak: 0.02, fade: 0.1 });
  };

  // ——— the fight, heard ———
  const onGlass = () => {
    dialK = 1;
    sparkle = 1;
  };
  const onDevour = (x?: number) => {
    surgeX = typeof x === 'number' ? Math.max(560, Math.min(W - 560, x)) : 960;
    surgeK = 1;
    boil = 1;
    for (let i = 0; i < 30; i++) emberBurst(1.8, surgeX);
  };
  const onPull = (on?: number) => {
    thickT = on === 0 ? 0 : 1;
    if (thickT) shed(16, 1);
  };
  const onShield = () => {
    flare = 1;
    sparkle = 1;
    dialK = 1;
    for (let i = 0; i < 40; i++) emberBurst(2);
    shed(24, 1);
  };
  ev.on('titanking-glass', onGlass);
  ev.on('titanking-devour', onDevour);
  ev.on('titanking-pull', onPull);
  ev.on('titanking-shield', onShield);
  const unlisten = () => {
    ev.off('titanking-glass', onGlass);
    ev.off('titanking-devour', onDevour);
    ev.off('titanking-pull', onPull);
    ev.off('titanking-shield', onShield);
    ev.off(Phaser.Scenes.Events.SHUTDOWN, unlisten);
  };
  ev.once(Phaser.Scenes.Events.SHUTDOWN, unlisten);
  /** In a fight (the game scene has its boss slots), or on the stages page. */
  const inFight = 'miniFoot' in (k.sc as object);
  let demo = 0;
  let demoPull = 0;

  return {
    impact(x, _y, p) {
      // a stomp: dust and stones out of the dark, sparks jump from the lava
      shed(Math.round(4 + p * 14), p);
      for (let i = 0; i < Math.round(p * 8); i++) emberBurst(1.4, x);
      // (on the stages page, with no fight to hear, the biggest blows play the fight's cues in turn)
      if (!inFight && p >= 0.95) {
        const cue = demo++ % 4;
        if (cue === 0) onGlass();
        else if (cue === 1) onDevour(560 + crand() * 800);
        else if (cue === 2) {
          onPull(1);
          demoPull = 6;
        } else onShield();
      }
    },
    update(dt, t) {
      const cm = calm();
      surgeK = Math.max(0, surgeK - dt * 0.25);
      boil = Math.max(0, boil - dt * 0.18);
      flare = Math.max(0, flare - dt * 0.35);
      dialK = Math.max(0, dialK - dt * 0.33);
      sparkle = Math.max(0, sparkle - dt * 0.3);
      if (demoPull > 0) {
        demoPull -= dt;
        if (demoPull <= 0) onPull(0);
      }
      thick += (thickT - thick) * Math.min(1, dt * 1.2);
      const fl2 = flare * flare;

      // the sand: pouring, thicker while he hauls on his chains
      for (const st of streams) {
        const sp = (1 + thick * 0.5) * cm;
        const wk = 1 + thick * 0.7 + fl2 * 0.3;
        for (const l of st.segs) {
          l.alpha = st.s.z > 40 ? 0.55 : 1;
          l.step(dt, sp);
          l.each((im) => im.setScale(st.sc * wk, st.sc));
        }
        st.splash.step(dt, sp);
        st.splash.each((im) => im.setScale(st.s.k * (1 + thick * 0.4)));
        st.glow.setAlpha((0.22 + 0.06 * flicker(t * 0.7, st.s.x) + thick * 0.2 + fl2 * 0.3) * cm + 0.05);
        st.rate.tick((3 + thick * 10 + sparkle * 14) * cm, dt, () => {
          const y = Math.max(40, st.s.top + crand() * (st.s.bot - st.s.top) * 0.9);
          glints.spawn({ x: st.s.x + (crand() - 0.5) * st.s.w * (2 + thick * 2), y, vx: (crand() - 0.5) * 8, vy: 160 + crand() * 120, life: 0.6 + crand() * 0.6, r0: 1.2 * st.s.k + crand(), r1: 0.3, a: 1, tint: crand() < 0.5 ? 0xfff0c0 : 0xffd27a, grav: 300, floor: st.s.bot, fade: 0.3 });
        });
      }
      glints.update(dt);

      // the smoke banks drifting, slowly, each its own way
      for (const b of banks) {
        b.img.x = b.x0 + Math.sin(t * b.speed + b.seed) * b.amp * cm;
        b.img.y = b.y0 + Math.sin(t * b.speed * 1.7 + b.seed * 2) * 6 * cm;
        b.img.setAlpha(Math.min(1, (0.85 + 0.15 * Math.sin(t * 0.11 + b.seed)) * (1 + thick * 0.2)));
      }

      // the lava: breathing, its bubbles boiling (faster round the head), currents drifting under the crust
      const br = 0.85 + 0.15 * Math.sin(t * 0.5) * Math.sin(t * 0.31 + 1);
      for (const [i, g] of breath.entries()) g.setAlpha(((i === 1 ? 0.06 : 0.11) * br + fl2 * 0.25) * cm + 0.02);
      for (const b of bubbles) {
        const near = Math.abs(b.x - surgeX) < 600 ? boil : 0;
        b.l.step(dt, (1 + near * 3) * cm);
      }
      for (const c of currents) {
        c.t = (c.t + dt * c.speed * c.dir * cm + 1) % 1;
        const X = (c.t - 0.5) * 2 * ((1000 * c.z) / F);
        const [x, y] = P(X, 0, c.z);
        const s = (pz(c.z) / 100) * (280 / 256);
        c.img.setPosition(x, y).setScale(s, s * 0.2);
        c.img.setAlpha((0.1 + 0.05 * Math.sin(t * 0.4 + c.z)) * Math.sin(c.t * Math.PI) * cm + fl2 * 0.1);
      }
      surge.setPosition(surgeX, lipY(surgeX) - 30).setAlpha(surgeK * surgeK * 0.6 + fl2 * 0.3);
      for (const [i, s] of shimmers.entries()) {
        s.step(dt, (1 + surgeK + fl2) * cm);
        s.alpha = (0.55 + 0.2 * flicker(t * 0.5, i) + surgeK * 0.4) * cm;
      }
      emberRate.tick((6 + surgeK * 40 + fl2 * 50) * cm, dt, () => emberBurst(1 + surgeK, surgeK > 0.3 && crand() < 0.6 ? surgeX : undefined));
      if (boil > 0.1 && crand() < boil * dt * 20) {
        // lava thrown up round the rising head
        const x = surgeX + (crand() - 0.5) * 900;
        const y = lipY(x) - 6 - crand() * 30;
        for (let i = 0; i < 4; i++) spatter.spawn({ x, y, vx: (crand() - 0.5) * 120, vy: -120 - crand() * 160, life: 1.2, r0: 2 + crand() * 2.5, r1: 1, a: 1, tint: crand() < 0.4 ? 0xffd080 : 0xff7a2a, grav: 700, floor: y + 4, streak: 0.02, fade: 0.05 });
      }
      embers.update(dt);
      spatter.update(dt);

      // dust and stones out of the dark while the prison crumbles
      dustRate.tick((thick * 8 + fl2 * 10) * cm, dt, () => shed(1, 0.3));
      grit.update(dt);
      pebbles.update(dt);
      dust.update(dt);
      hiss.update(dt);

      // the dial's moons glinting gold when the hourglass flips
      dialG.setAlpha(dialK * dialK * 0.9 * (0.85 + 0.15 * Math.sin(t * 6)));
    },
    destroy() {
      unlisten();
    },
  };
});
