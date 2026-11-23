// Zombie feet: what the Zombie Loafer's bite (src/game/bosses/act2b.ts) turns a foot into, and back.
//
// The zombie art is made from the bitten foot's own textures, so it is still that foot (its shoe, its sock, its
// shape), only dead. Every painted piece the foot shows (Foot.artPieces: the leg, the body, the cuff, and its live
// layer's toe band, parts and shield) gets a copy, `zb_<key>`, with the same frames:
//
// - skin (pixels near the foot's own skin colour) turns the Zombie Toes' grey-green (src/content/style/base-bare.ts),
//   keeping its shading, with purple in the shadows and mottled bruising; a bare foot's nails yellow;
// - everything else (cloth, leather, rubber, metal) loses some colour and picks up grime and a sickly cast;
// - painted decals, clipped to the silhouette: on bare feet bruises, rot patches, dark veins, a stitched gash and a
//   toe worn to the bone at its tip; on covered feet grime and rot stains, mould, tears with grey-green skin showing
//   through and ooze running out of them. The decals are planned once per foot type in the foot's own frame, so the
//   body and the toe band (and a blinking eye) line up.
//
// The bite wound is its own image (raw flesh on a bare foot, a torn hole with the flesh in it on a covered one),
// placed on the side the boss bit. Building a set takes a few frames' work: it starts when the boss marks its prey
// (prepareZombie) and steps along in the fight's upkeep, a few rows of pixels at a time. One set per foot type,
// dropped at stage changes like the rest (evictZombieArt, from GameScene.evictArt).
//
// The change itself is a wipe: the old art stays on top under an inverted geometry mask whose hole grows out of the
// bite, with bands of green light riding the edge; the foot convulses (its body squashes from the sole on springs,
// Foot.setBodyScale, and lurches, Foot.leanFx), then a puff, the flies and a groan. The cure runs the same wipe the
// other way, from the middle, in mint. Cosmetic randomness at run time goes through crand(); the textures use a
// generator seeded by the foot's id, so the same foot always rots the same way.

import Phaser from 'phaser';
import { CX } from '../art/feetCommon';
import { blob, hashStr, makeCanvas, rng } from '../art/util';
import { drawFly } from '../content/style/pilot-bare';
import { feetAnimated } from '../systems/graphics';
import { crand } from '../systems/cosmeticRandom';
import { save } from '../systems/save';
import type { Foot } from './Foot';
import { zombifiableType, type FootArt } from '../data/feet';
import { Critters, Spring, WorldEmitter, liveQuality } from './liveKit';

type Piece = Phaser.GameObjects.Image | Phaser.GameObjects.TileSprite;
type RGB = [number, number, number];

const PREFIX = 'zb_';
const WOUND = 'zb_wound';
const WOUND_TORN = 'zb_wound_torn';
const FLY = 'lk_fly';
/** The infection's light at the wipe's edge. */
const INFECT = 0xb6f05a;
/** The cure's light. */
const HEAL = 0x9dffc0;

/**
 * Can this foot be zombified right now (the Zombie Loafer's bite and its spread, the zombie peels' zombify and their
 * bite's targets)? Only an ordinary, living foot (zombifiableType: no boss or mini-boss, no boss fight piece, nothing
 * undead), and not one a boss spawned mid-fight, a stand-in (echo, decoy, twin) or one that's a zombie already.
 */
export function canZombify(f: Foot): boolean {
  return f.alive && zombifiableType(f.type) && !f.zombified && !f.zombieHold && !f.brain.bossSummon && !f.brain.echo && !f.brain.decoy && !f.brain.twin && !f.link;
}

/** A canvas whose pixels are read back (often, in row chunks): kept on the CPU (willReadFrequently). */
export function readCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  return [c, ctx];
}

export const zombieKey = (key: string): string => (key.startsWith(PREFIX) ? key : PREFIX + key);
const plainKey = (key: string): string => (key.startsWith(PREFIX) ? key.slice(PREFIX.length) : key);
const reduced = () => !!save.settings.reducedMotion;
/** The texture a piece draws (a tile sprite's own texture is a scratch canvas: its source is displayTexture). */
const keyOf = (p: Piece): string => (p instanceof Phaser.GameObjects.TileSprite ? (p as unknown as { displayTexture: Phaser.Textures.Texture }).displayTexture.key : p.texture.key);

/**
 * Run `fn` with Math.random drawing from the cosmetic generator. Math.random is the game's seeded sequence (the
 * balance simulator replays runs from it), and Phaser draws on it inside things that are only for show here: a tile
 * sprite's texture key (UUID), particle ranges. A zombie foot's looks must never move that sequence on.
 */
export function cosmetic<T>(fn: () => T): T {
  const was = Math.random;
  Math.random = crand;
  try {
    return fn();
  } finally {
    Math.random = was;
  }
}

// ════════════════════════════ colour and noise ════════════════════════════

function hex(h: string): RGB {
  let s = h.replace('#', '');
  if (s.length === 3) s = s.split('').map((c) => c + c).join('');
  const n = parseInt(s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hsv(r: number, g: number, b: number): [number, number, number] {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  let h = 0;
  if (d > 0) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, mx ? d / mx : 0, mx / 255];
}

const lum = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

function hash2(x: number, y: number, s: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(s, 982451653);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth value noise (0…1). With `py`, the lattice wraps every py cells in y (a leg tile that repeats). */
function vnoise(x: number, y: number, s: number, py = 0): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const y0 = py ? ((yi % py) + py) % py : yi;
  const y1 = py ? (y0 + 1) % py : yi + 1;
  const a = hash2(xi, y0, s);
  const b = hash2(xi + 1, y0, s);
  const c = hash2(xi, y1, s);
  const d = hash2(xi + 1, y1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// the Zombie Toes' palette (src/content/style/base-bare.ts: ZOMBIE)
const ZB: RGB = hex('#9fb98a');
const ZB_YELLOW: RGB = hex('#b4b47a');
const ZB_BLUE: RGB = hex('#8aa49a');
const ZB_SHADOW: RGB = hex('#3a2050');
const BRUISE: RGB = hex('#5a3a6a');

interface Ref {
  h: number;
  s: number;
}
const refOf = (c: string | undefined): Ref | null => {
  if (!c || !/^#[0-9a-f]{3,6}$/i.test(c)) return null;
  const [r, g, b] = hex(c);
  const [h, s] = hsv(r, g, b);
  return { h, s };
};
const hueDist = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

// ════════════════════════════ the plan (per foot type) ════════════════════════════

type Decal =
  | { k: 'bruise'; x: number; y: number; r: number }
  | { k: 'rot'; x: number; y: number; r: number; sd: number }
  | { k: 'vein'; x: number; y: number; r: number; a: number; sd: number }
  | { k: 'stitch'; x: number; y: number; r: number; a: number }
  | { k: 'bone'; x: number; y: number; r: number; a: number }
  | { k: 'tear'; x: number; y: number; r: number; sd: number; drip: number }
  | { k: 'mould'; x: number; y: number; r: number; sd: number }
  | { k: 'stain'; x: number; y: number; r: number; sd: number }
  | { k: 'ooze'; x: number; y: number; r: number; len: number };

interface Plan {
  id: string;
  seed: number;
  /** Bare skin (true) or covered (boots, socks, robots, armour). */
  bare: boolean;
  /** The silhouette's bounds in the foot's frame (contact point at 0,0; world px at the type's scale). */
  box: { x0: number; y0: number; x1: number; y1: number };
  /** Silhouette width (decals are sized from it). */
  bw: number;
  decals: Decal[];
  skin: Ref | null;
  skinL: number;
  others: Ref[];
  /** Is a point (foot frame) well inside the silhouette? */
  solid: (x: number, y: number, r?: number) => boolean;
}

const plans = new Map<string, Plan>();

/** A texture's pixels (any source) as ImageData. */
function pixels(sc: Phaser.Scene, key: string): { data: Uint8ClampedArray; w: number; h: number } | null {
  if (!sc.textures.exists(key)) return null;
  const src = sc.textures.get(key).getSourceImage() as CanvasImageSource & { width: number; height: number };
  const [c, ctx] = readCanvas(src.width, src.height);
  ctx.drawImage(src, 0, 0);
  return { data: ctx.getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height };
}

function planFor(f: Foot): Plan {
  const id = f.type.id;
  const hit = plans.get(id);
  if (hit) return hit;
  const m = f.meta;
  const px = pixels(f.scene, m.footKey);
  // the play texture: texel (u, v) is the foot's frame ((u − W/2)/res, (v − originY·H)/res)
  const plan = makePlan(id, f.type.art, px, 1 / m.textures.res, 0.5 * (px?.w ?? 1), m.originY * (px?.h ?? 1));
  plans.set(id, plan);
  return plan;
}

/**
 * A plan from any picture of the foot: `px` its pixels, where texel (u, v) is the frame point ((u − ox)·k, (v − oy)·k).
 * The play foot plans in its own frame (world px); the zombie peels plan in the foot's design units (zombieCanvas).
 */
function makePlan(id: string, art: FootArt, px: { data: Uint8ClampedArray; w: number; h: number } | null, k: number, ox: number, oy: number): Plan {
  const W = px?.w ?? 1;
  const H = px?.h ?? 1;
  const alphaAt = (x: number, y: number): number => {
    if (!px) return 0;
    const u = Math.round(x / k + ox);
    const v = Math.round(y / k + oy);
    if (u < 0 || v < 0 || u >= W || v >= H) return 0;
    return px.data[(v * W + u) * 4 + 3];
  };
  const solid = (x: number, y: number, r = 0): boolean => {
    if (alphaAt(x, y) < 200) return false;
    if (r <= 0) return true;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      if (alphaAt(x + Math.cos(a) * r, y + Math.sin(a) * r) < 160) return false;
    }
    return true;
  };
  const skin = refOf(art.skin);
  const others = [art.primary, art.secondary, art.legColor].map(refOf).filter((r): r is Ref => !!r && !(skin && hueDist(r.h, skin.h) < 4 && Math.abs(r.s - skin.s) < 0.04));
  const skinL = art.skin ? lum(...hex(art.skin)) : 180;
  // bounds and how much of the foot is bare skin
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  let solidN = 0;
  let skinN = 0;
  if (px) {
    for (let v = 0; v < H; v += 2) {
      for (let u = 0; u < W; u += 2) {
        const i = (v * W + u) * 4;
        if (px.data[i + 3] < 200) continue;
        const x = (u - ox) * k;
        const y = (v - oy) * k;
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
        solidN++;
        if (skinScore(px.data[i], px.data[i + 1], px.data[i + 2], skin, others) > 0.5) skinN++;
      }
    }
  }
  if (!isFinite(x0)) {
    x0 = -60;
    x1 = 60;
    y0 = -120;
    y1 = 0;
  }
  const bw = Math.max(20, x1 - x0);
  const bh = Math.max(20, y1 - y0);
  // the toe tips: where the silhouette's bottom edge dips lowest (local lows of each column's bottom row)
  const tips: [number, number][] = [];
  if (px) {
    const step = 2;
    const low: number[] = [];
    for (let u = 0; u < W; u += step) {
      let v = H - 1;
      while (v >= 0 && px.data[(v * W + u) * 4 + 3] < 200) v--;
      low.push(v);
    }
    for (let i = 3; i < low.length - 3; i++) {
      const v = low[i];
      if (v < 0 || [1, 2, 3].some((j) => low[i - j] > v || low[i + j] > v)) continue;
      const x = (i * step - ox) * k;
      const y = (v - oy) * k;
      if (x < x0 + bw * 0.12 || x > x1 - bw * 0.12) continue;
      if (tips.length && Math.abs(tips[tips.length - 1][0] - x) < bw * 0.06) continue;
      tips.push([x, y]);
    }
  }
  const bare = solidN > 0 && skinN / solidN > 0.3;
  const seed = hashStr(`zombie:${id}`);
  const r = rng(seed);
  const decals: Decal[] = [];
  /** A point inside the silhouette (in the band of rows v0…v1 of the box, 0 top … 1 bottom). */
  const spot = (rad: number, v0 = 0, v1 = 1): [number, number] | null => {
    for (let i = 0; i < 80; i++) {
      const x = x0 + r() * bw;
      const y = y0 + (v0 + r() * (v1 - v0)) * bh;
      if (solid(x, y, rad * 0.8)) return [x, y];
    }
    return null;
  };
  const add = (n: number, size: [number, number], make: (x: number, y: number, rad: number) => Decal | null, v0 = 0, v1 = 1) => {
    for (let i = 0; i < n; i++) {
      const rad = bw * (size[0] + r() * (size[1] - size[0]));
      const p = spot(rad, v0, v1);
      if (!p) continue;
      const d = make(p[0], p[1], rad);
      if (d) decals.push(d);
    }
  };
  if (bare) {
    add(8, [0.06, 0.12], (x, y, rad) => ({ k: 'bruise', x, y, r: rad }));
    add(2, [0.06, 0.085], (x, y, rad) => ({ k: 'rot', x, y, r: rad, sd: r() * 1e6 }));
    add(4, [0.14, 0.22], (x, y, rad) => ({ k: 'vein', x, y, r: rad, a: r() * Math.PI * 2, sd: r() * 1e6 }), 0, 0.75);
    add(1, [0.16, 0.2], (x, y, rad) => ({ k: 'stitch', x, y, r: rad, a: (r() - 0.5) * 0.7 }), 0.15, 0.6);
    // a toe worn to the bone at its tip (or, with no toes to find, low on the foot)
    const rad = bw * 0.045;
    const tip = tips.length ? tips[Math.floor(r() * tips.length)] : null;
    if (tip && solid(tip[0], tip[1] - rad * 1.5, rad * 0.6)) decals.push({ k: 'bone', x: tip[0], y: tip[1] - rad * 1.5, r: rad, a: Math.PI / 2 + (r() - 0.5) * 0.4 });
    else add(1, [0.045, 0.06], (x, y, rr) => ({ k: 'bone', x, y, r: rr, a: (r() - 0.5) * 0.8 }), 0.74, 0.92);
    add(2, [0.03, 0.05], (x, y, rad) => ({ k: 'mould', x, y, r: rad, sd: r() * 1e6 }));
  } else {
    add(6, [0.1, 0.17], (x, y, rad) => ({ k: 'stain', x, y, r: rad, sd: r() * 1e6 }));
    add(4, [0.05, 0.08], (x, y, rad) => ({ k: 'mould', x, y, r: rad, sd: r() * 1e6 }));
    add(2, [0.05, 0.07], (x, y, rad) => ({ k: 'rot', x, y, r: rad, sd: r() * 1e6 }));
    add(2, [0.1, 0.125], (x, y, rad) => ({ k: 'tear', x, y, r: rad, sd: r() * 1e6, drip: 0.6 + r() * 0.6 }), 0.12, 0.72);
    add(3, [0.02, 0.028], (x, y, rad) => ({ k: 'ooze', x, y, r: rad, len: bh * (0.06 + r() * 0.07) }), 0.05, 0.7);
  }
  return { id, seed, bare, box: { x0, y0, x1, y1 }, bw, decals, skin, skinL, others, solid };
}

/** How much a pixel reads as the foot's own skin (0…1). */
function skinScore(r: number, g: number, b: number, skin: Ref | null, others: Ref[]): number {
  if (!skin) return 0;
  const [h, s, v] = hsv(r, g, b);
  if (s < 0.08 || v < 0.14) return 0;
  const d = (ref: Ref) => hueDist(h, ref.h) / 28 + Math.abs(s - ref.s) / 0.5;
  const ds = d(skin);
  if (ds > 1.25) return 0;
  for (const o of others) if (d(o) < ds) return 0;
  return clamp01((1.25 - ds) / 0.45);
}

// ════════════════════════════ painting ════════════════════════════

/** One octave of noise with cells `cell` px across; a leg tile wraps in y (a whole number of cells per tile). */
function octave(x: number, y: number, cell: number, sd: number, wrapH: number): number {
  if (!wrapH) return vnoise(x / cell, y / cell, sd);
  const py = Math.max(1, Math.round(wrapH / cell));
  return vnoise(x / cell, (y / wrapH) * py, sd, py);
}

/** The recolour of one pixel (in place). (x, y): where it is in the foot's frame, for the noise. */
function recolour(d: Uint8ClampedArray, i: number, x: number, y: number, p: Plan, sc: number, wrapH = 0): void {
  const r = d[i];
  const g = d[i + 1];
  const b = d[i + 2];
  const L = lum(r, g, b);
  const s = skinScore(r, g, b, p.skin, p.others);
  const seed = p.seed;
  const big = octave(x, y, sc * 0.32, seed, wrapH);
  const mid = octave(x, y, sc * 0.09, seed + 7, wrapH);
  const fine = octave(x, y, sc * 0.025, seed + 13, wrapH);
  let sr = 0;
  let sg = 0;
  let sb = 0;
  if (s > 0) {
    // skin: the zombie grey-green, shaded as the original was, yellower or bluer in patches
    const shade = Math.min(1.35, L / Math.max(40, p.skinL));
    const ty = clamp01((big - 0.45) * 2.2);
    const tb = clamp01((0.5 - big) * 2.2) * 0.6;
    let cr = ZB[0] + (ZB_YELLOW[0] - ZB[0]) * ty + (ZB_BLUE[0] - ZB[0]) * tb;
    let cg = ZB[1] + (ZB_YELLOW[1] - ZB[1]) * ty + (ZB_BLUE[1] - ZB[1]) * tb;
    let cb = ZB[2] + (ZB_YELLOW[2] - ZB[2]) * ty + (ZB_BLUE[2] - ZB[2]) * tb;
    cr *= shade;
    cg *= shade;
    cb *= shade;
    // purple in the shadows
    const sh = clamp01((0.8 - shade) * 1.1) * 0.65;
    cr += (ZB_SHADOW[0] - cr) * sh;
    cg += (ZB_SHADOW[1] - cg) * sh;
    cb += (ZB_SHADOW[2] - cb) * sh;
    // mottled bruising
    const mo = clamp01((mid - 0.56) * 3) * 0.35;
    cr += (BRUISE[0] - cr) * mo;
    cg += (BRUISE[1] - cg) * mo;
    cb += (BRUISE[2] - cb) * mo;
    const gr = 1 + (fine - 0.5) * 0.12;
    sr = cr * gr;
    sg = cg * gr;
    sb = cb * gr;
  }
  let mr = r;
  let mg = g;
  let mb = b;
  if (s < 1) {
    // material: some colour gone, grime in patches, a sickly cast; the ink outline stays dark
    const ink = L < 48 ? 0.7 : 0;
    // strong colours (a red sneaker, rainbow stripes, neon) lose much more, so they read as rotten too, not just
    // a little dirty
    const sat = hsv(r, g, b)[1];
    const loud = clamp01((sat - 0.3) / 0.45);
    const de = (0.42 + 0.36 * loud) * (1 - ink);
    mr += (L - mr) * de;
    mg += (L - mg) * de;
    mb += (L - mb) * de;
    const grime = clamp01((big * 0.55 + mid * 0.45 - 0.38) * 1.9 + loud * 0.25) * (0.62 + 0.2 * loud) * (1 - ink);
    mr *= 1 - grime * 0.3;
    mg *= 1 - grime * 0.32;
    mb *= 1 - grime * 0.52;
    mr *= 0.9;
    mg *= 0.97;
    mb *= 0.8;
    // on a bare foot the pale bits are its nails: yellowed, like old horn
    if (p.bare && L > 150 && ink === 0) {
      const k = clamp01((L - 150) / 60) * 0.6;
      mr += (150 - mr) * k;
      mg += (148 - mg) * k;
      mb += (92 - mb) * k;
    }
    const gr = 1 + (fine - 0.5) * 0.14 * (1 - ink);
    mr *= gr;
    mg *= gr;
    mb *= gr;
  }
  d[i] = mr + (sr - mr) * s;
  d[i + 1] = mg + (sg - mg) * s;
  d[i + 2] = mb + (sb - mb) * s;
}

function drip(g: CanvasRenderingContext2D, x: number, y: number, len: number, w: number): void {
  // wide where it runs out, pinched in the middle, a heavy bead at the bottom
  g.beginPath();
  g.moveTo(x - w * 0.75, y);
  g.bezierCurveTo(x - w * 0.5, y + len * 0.25, x - w * 0.22, y + len * 0.55, x - w * 0.3, y + len * 0.8);
  g.arc(x, y + len * 0.86, w * 0.5, Math.PI * 0.95, Math.PI * 0.05, true);
  g.bezierCurveTo(x + w * 0.22, y + len * 0.55, x + w * 0.5, y + len * 0.25, x + w * 0.75, y);
  g.closePath();
  const gr = g.createLinearGradient(x - w, 0, x + w, 0);
  gr.addColorStop(0, '#5e6a1e');
  gr.addColorStop(0.42, '#a4b048');
  gr.addColorStop(1, '#424a12');
  g.fillStyle = gr;
  g.fill();
  g.strokeStyle = 'rgba(36,40,8,.5)';
  g.lineWidth = w * 0.14;
  g.stroke();
  g.fillStyle = 'rgba(246,250,214,.7)';
  g.beginPath();
  g.ellipse(x - w * 0.16, y + len * 0.83, w * 0.13, w * 0.2, -0.3, 0, Math.PI * 2);
  g.fill();
}

/** Paint the plan's decals (foot frame units) onto a canvas already transformed to that frame. */
function paintDecals(g: CanvasRenderingContext2D, p: Plan): void {
  const u = p.bw / 200;
  for (const d of p.decals) {
    const rnd = rng(hashStr(`${p.id}:${d.k}:${Math.round(d.x)}:${Math.round(d.y)}`));
    g.save();
    switch (d.k) {
      case 'bruise': {
        const gr = g.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r);
        gr.addColorStop(0, 'rgba(84,44,104,.42)');
        gr.addColorStop(0.55, 'rgba(70,74,70,.22)');
        gr.addColorStop(1, 'rgba(70,90,60,0)');
        g.fillStyle = gr;
        g.beginPath();
        g.ellipse(d.x, d.y, d.r, d.r * (0.6 + rnd() * 0.4), rnd() * Math.PI, 0, Math.PI * 2);
        g.fill();
        break;
      }
      case 'stain': {
        // a rot stain soaked into the material, darker at its heart and at its tide line
        blob(g, d.x, d.y, d.r, 0.5, rnd, 9);
        const gr = g.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r);
        gr.addColorStop(0, 'rgba(54,48,20,.48)');
        gr.addColorStop(0.55, 'rgba(66,68,28,.3)');
        gr.addColorStop(1, 'rgba(90,100,40,0)');
        g.fillStyle = gr;
        g.fill();
        break;
      }
      case 'rot': {
        // soft-edged decay: a dark sunken middle fading out through olive into the skin, pitted, with a wet sheen
        blob(g, d.x, d.y, d.r, 0.55, rnd, 9);
        const gr = g.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r);
        gr.addColorStop(0, 'rgba(34,26,10,.85)');
        gr.addColorStop(0.45, 'rgba(66,60,22,.62)');
        gr.addColorStop(0.8, 'rgba(110,118,46,.28)');
        gr.addColorStop(1, 'rgba(120,130,50,0)');
        g.fillStyle = gr;
        g.fill();
        blob(g, d.x + (rnd() - 0.5) * d.r * 0.2, d.y + (rnd() - 0.5) * d.r * 0.2, d.r * 0.42, 0.6, rnd, 7);
        g.fillStyle = 'rgba(22,16,6,.55)';
        g.fill();
        for (let i = 0; i < 5; i++) {
          const a = rnd() * Math.PI * 2;
          const rr = (0.3 + rnd() * 0.4) * d.r;
          g.fillStyle = 'rgba(20,16,6,.55)';
          g.beginPath();
          g.arc(d.x + Math.cos(a) * rr, d.y + Math.sin(a) * rr * 0.8, (0.6 + rnd()) * u, 0, Math.PI * 2);
          g.fill();
        }
        g.fillStyle = 'rgba(220,235,170,.35)';
        g.beginPath();
        g.ellipse(d.x - d.r * 0.22, d.y - d.r * 0.2, d.r * 0.18, d.r * 0.07, -0.5, 0, Math.PI * 2);
        g.fill();
        break;
      }
      case 'vein': {
        const walk = (x: number, y: number, a: number, len: number, w: number, depth: number) => {
          const pts: [number, number][] = [[x, y]];
          const n = 7;
          for (let i = 0; i < n; i++) {
            a += (rnd() - 0.5) * 0.9;
            x += Math.cos(a) * (len / n);
            y += Math.sin(a) * (len / n);
            pts.push([x, y]);
          }
          const line = () => {
            g.beginPath();
            g.moveTo(pts[0][0], pts[0][1]);
            for (const q of pts.slice(1)) g.lineTo(q[0], q[1]);
          };
          line();
          g.strokeStyle = 'rgba(52,80,46,.28)';
          g.lineWidth = w * 3.2;
          g.stroke();
          line();
          g.strokeStyle = 'rgba(44,18,60,.72)';
          g.lineWidth = w;
          g.stroke();
          if (depth > 0) {
            const k = 2 + Math.floor(rnd() * 3);
            walk(pts[k][0], pts[k][1], a + (rnd() < 0.5 ? -1 : 1) * (0.6 + rnd() * 0.5), len * 0.5, w * 0.65, depth - 1);
          }
        };
        walk(d.x, d.y, d.a, d.r, 2.3 * u, 2);
        break;
      }
      case 'stitch': {
        // a curved gash, sewn shut with crude cross stitches that follow it
        const c = Math.cos(d.a);
        const s = Math.sin(d.a);
        const at = (t: number, off = 0): [number, number] => [d.x + c * t * d.r - s * off, d.y + s * t * d.r + c * off];
        const P = [at(-1), at(-0.35, -0.34 * d.r), at(0.35, 0.3 * d.r), at(1)];
        const bez = (t: number): [number, number] => {
          const m = 1 - t;
          const k = [m * m * m, 3 * m * m * t, 3 * m * t * t, t * t * t];
          return [k[0] * P[0][0] + k[1] * P[1][0] + k[2] * P[2][0] + k[3] * P[3][0], k[0] * P[0][1] + k[1] * P[1][1] + k[2] * P[2][1] + k[3] * P[3][1]];
        };
        const gash = () => {
          g.beginPath();
          g.moveTo(P[0][0], P[0][1]);
          g.bezierCurveTo(P[1][0], P[1][1], P[2][0], P[2][1], P[3][0], P[3][1]);
        };
        gash();
        g.strokeStyle = 'rgba(122,26,42,.45)';
        g.lineWidth = 7 * u;
        g.stroke();
        gash();
        g.strokeStyle = '#2a0a14';
        g.lineWidth = 3 * u;
        g.stroke();
        for (let i = 0; i < 6; i++) {
          const t = 0.08 + (i / 5) * 0.84;
          const [x, y] = bez(t);
          const [x2, y2] = bez(t + 0.01);
          const a = Math.atan2(y2 - y, x2 - x);
          const tc = Math.cos(a);
          const ts = Math.sin(a);
          const w = 5 * u;
          const cross = () => {
            g.beginPath();
            g.moveTo(x - tc * w + ts * w, y - ts * w - tc * w);
            g.lineTo(x + tc * w - ts * w, y + ts * w + tc * w);
            g.moveTo(x + tc * w + ts * w, y + ts * w - tc * w);
            g.lineTo(x - tc * w - ts * w, y - ts * w + tc * w);
          };
          cross();
          g.strokeStyle = '#1a1410';
          g.lineWidth = 2 * u;
          g.stroke();
          cross();
          g.strokeStyle = 'rgba(200,184,144,.5)';
          g.lineWidth = 0.8 * u;
          g.stroke();
        }
        break;
      }
      case 'bone': {
        // a strip of skin peeled away to the raw flesh, loose skin round it, and the bone showing at one end
        const a = d.a;
        const patch = () => {
          g.save();
          g.translate(d.x, d.y);
          g.rotate(a);
          g.scale(1.5, 0.85);
          blob(g, 0, 0, d.r, 0.45, rng(hashStr(`bone:${Math.round(d.x)}`)), 9);
          g.restore();
        };
        patch();
        const fl = g.createRadialGradient(d.x - d.r * 0.3, d.y - d.r * 0.2, 0, d.x, d.y, d.r * 1.4);
        fl.addColorStop(0, '#d8506a');
        fl.addColorStop(0.55, '#8a1a2a');
        fl.addColorStop(1, '#3a0a14');
        g.fillStyle = fl;
        g.fill();
        g.strokeStyle = 'rgba(232,240,208,.7)';
        g.lineWidth = 1.1 * u;
        g.stroke();
        // the bone: a rounded knuckle end, ink outlined
        const c = Math.cos(a);
        const s2 = Math.sin(a);
        const bx = d.x + c * d.r * 0.55;
        const by = d.y + s2 * d.r * 0.55;
        g.save();
        g.translate(bx, by);
        g.rotate(a);
        g.beginPath();
        g.moveTo(-d.r * 0.9, -d.r * 0.22);
        g.lineTo(0, -d.r * 0.3);
        g.arc(d.r * 0.05, -d.r * 0.02, d.r * 0.42, -Math.PI * 0.6, Math.PI * 0.6);
        g.lineTo(-d.r * 0.9, d.r * 0.24);
        g.closePath();
        const bo = g.createLinearGradient(0, -d.r * 0.4, 0, d.r * 0.4);
        bo.addColorStop(0, '#fbf3da');
        bo.addColorStop(0.6, '#dccfa6');
        bo.addColorStop(1, '#9c8c62');
        g.fillStyle = bo;
        g.fill();
        g.strokeStyle = 'rgba(40,26,16,.85)';
        g.lineWidth = 1.1 * u;
        g.stroke();
        g.fillStyle = 'rgba(255,255,255,.75)';
        g.beginPath();
        g.ellipse(d.r * 0.05, -d.r * 0.16, d.r * 0.16, d.r * 0.06, 0, 0, Math.PI * 2);
        g.fill();
        g.restore();
        break;
      }
      case 'tear': {
        // each tear its own shape: turned, wide or narrow
        const rot = (rnd() - 0.5) * 0.9;
        const asp = 1.05 + rnd() * 0.4;
        const hole = (k = 1) => {
          g.save();
          g.translate(d.x, d.y);
          g.rotate(rot);
          g.scale(k * asp, (k * 0.85) / asp);
          blob(g, 0, 0, d.r, 0.55, rng(hashStr(`tear:${d.sd}`)), 11);
          g.restore();
        };
        // the torn lip of the material, lighter where it frays
        hole(1.16);
        g.fillStyle = 'rgba(236,230,208,.45)';
        g.fill();
        // the hole: grey-green skin, bruised, shadowed under the torn top edge
        hole();
        const sk = g.createRadialGradient(d.x + d.r * 0.15, d.y + d.r * 0.2, 0, d.x, d.y, d.r);
        sk.addColorStop(0, '#b0c894');
        sk.addColorStop(0.6, '#8aa476');
        sk.addColorStop(1, '#55663f');
        g.fillStyle = sk;
        g.fill();
        g.save();
        hole();
        g.clip();
        const br = g.createRadialGradient(d.x - d.r * 0.25, d.y + d.r * 0.25, 0, d.x - d.r * 0.25, d.y + d.r * 0.25, d.r * 0.7);
        br.addColorStop(0, 'rgba(96,56,110,.55)');
        br.addColorStop(1, 'rgba(96,56,110,0)');
        g.fillStyle = br;
        g.fillRect(d.x - d.r * 2, d.y - d.r * 2, d.r * 4, d.r * 4);
        // a dark vein across the skin, its own way each time
        const va = rnd() * Math.PI;
        g.strokeStyle = 'rgba(44,18,60,.6)';
        g.lineWidth = 1.4 * u;
        g.beginPath();
        g.moveTo(d.x - Math.cos(va) * d.r, d.y - Math.sin(va) * d.r * 0.7);
        g.quadraticCurveTo(d.x + (rnd() - 0.5) * d.r * 0.6, d.y + (rnd() - 0.5) * d.r * 0.6, d.x + Math.cos(va) * d.r, d.y + Math.sin(va) * d.r * 0.7);
        g.stroke();
        // (the torn edge shades the skin just under it)
        const sh = g.createLinearGradient(0, d.y - d.r * 0.8, 0, d.y);
        sh.addColorStop(0, 'rgba(20,16,10,.5)');
        sh.addColorStop(1, 'rgba(20,16,10,0)');
        g.fillStyle = sh;
        g.fillRect(d.x - d.r * 2, d.y - d.r * 1.5, d.r * 4, d.r * 1.5);
        g.fillStyle = 'rgba(236,246,214,.45)';
        g.beginPath();
        g.ellipse(d.x + d.r * 0.25, d.y + d.r * 0.2, d.r * 0.25, d.r * 0.1, -0.3, 0, Math.PI * 2);
        g.fill();
        g.restore();
        hole();
        g.strokeStyle = 'rgba(26,20,12,.9)';
        g.lineWidth = 1.6 * u;
        g.stroke();
        // loose threads hanging off the top lip
        for (let i = 0; i < 7; i++) {
          const a = Math.PI * (1.1 + rnd() * 0.8) + rot;
          const x = d.x + Math.cos(a) * d.r * asp * 0.95;
          const y = d.y + Math.sin(a) * d.r * 0.8;
          g.strokeStyle = rnd() < 0.65 ? 'rgba(240,234,210,.7)' : 'rgba(30,24,16,.6)';
          g.lineWidth = 0.9 * u;
          g.beginPath();
          g.moveTo(x, y - d.r * 0.08);
          g.quadraticCurveTo(x + (rnd() - 0.5) * d.r * 0.2, y + d.r * 0.15, x + (rnd() - 0.5) * d.r * 0.3, y + d.r * (0.2 + rnd() * 0.25));
          g.stroke();
        }
        // ooze weeping out of the bottom of it: none, one or two runs
        const n = Math.floor(rnd() * 2.6);
        for (let i = 0; i < n; i++) drip(g, d.x + (rnd() - 0.5) * d.r * asp, d.y + d.r * 0.45, d.r * d.drip * (0.7 + rnd() * 0.9), d.r * (0.22 + rnd() * 0.14));
        break;
      }
      case 'mould': {
        const halo = g.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r * 1.3);
        halo.addColorStop(0, 'rgba(180,200,140,.32)');
        halo.addColorStop(1, 'rgba(180,200,140,0)');
        g.fillStyle = halo;
        g.beginPath();
        g.arc(d.x, d.y, d.r * 1.3, 0, Math.PI * 2);
        g.fill();
        for (let i = 0; i < 26; i++) {
          const a = rnd() * Math.PI * 2;
          const rr = Math.sqrt(rnd()) * d.r;
          g.fillStyle = rnd() < 0.55 ? 'rgba(214,230,176,.8)' : 'rgba(132,164,72,.75)';
          g.beginPath();
          g.arc(d.x + Math.cos(a) * rr, d.y + Math.sin(a) * rr, (0.7 + rnd() * 1.6) * u, 0, Math.PI * 2);
          g.fill();
        }
        break;
      }
      case 'ooze': {
        // ooze run down the material from a wet patch
        blob(g, d.x, d.y, d.r * 1.8, 0.5, rnd, 7);
        g.fillStyle = 'rgba(140,150,52,.4)';
        g.fill();
        drip(g, d.x, d.y, d.len, d.r * 1.8);
        break;
      }
    }
    g.restore();
  }
}

/** Leg decals (in the leg texture's own pixels; it tiles in y, so each is painted three times). */
function paintLegDecals(g: CanvasRenderingContext2D, p: Plan, w: number, h: number, bare: boolean): void {
  const r = rng(p.seed ^ 0x51ed);
  const u = w / 120;
  for (let i = 0; i < (bare ? 4 : 3); i++) {
    const x = w * (0.2 + r() * 0.6);
    const y = r() * h;
    const rad = w * (0.1 + r() * 0.12);
    const sd = r();
    for (const oy of [-h, 0, h]) {
      const gr = g.createRadialGradient(x, y + oy, 0, x, y + oy, rad);
      if (bare) {
        gr.addColorStop(0, 'rgba(84,44,104,.4)');
        gr.addColorStop(1, 'rgba(70,90,60,0)');
      } else {
        gr.addColorStop(0, 'rgba(58,52,22,.45)');
        gr.addColorStop(1, 'rgba(90,100,40,0)');
      }
      g.fillStyle = gr;
      g.beginPath();
      g.ellipse(x, y + oy, rad * (0.7 + sd * 0.4), rad, 0, 0, Math.PI * 2);
      g.fill();
    }
  }
  // a few vertical rot streaks
  for (let i = 0; i < 3; i++) {
    const x = w * (0.15 + r() * 0.7);
    const y = r() * h;
    const len = h * (0.15 + r() * 0.25);
    for (const oy of [-h, 0, h]) {
      g.strokeStyle = bare ? 'rgba(56,28,74,.35)' : 'rgba(50,60,20,.35)';
      g.lineWidth = 1.6 * u;
      g.beginPath();
      g.moveTo(x, y + oy);
      g.quadraticCurveTo(x + (r() - 0.5) * 6 * u, y + oy + len / 2, x + (r() - 0.5) * 4 * u, y + oy + len);
      g.stroke();
    }
  }
}

// ════════════════════════════ building the textures ════════════════════════════

type PieceMap = { x0: number; y0: number; sx: number; sy: number };

/** A piece's texel → foot frame mapping (rest pose: no rotation): x = x0 + u·sx, y = y0 + v·sy (frame-relative). */
function mapOf(p: Phaser.GameObjects.Image): PieceMap {
  const fw = p.frame.width;
  const fh = p.frame.height;
  return { x0: p.x - p.originX * fw * p.scaleX, y0: p.y - p.originY * fh * p.scaleY, sx: p.scaleX, sy: p.scaleY };
}

const sameMap = (a: PieceMap, b: PieceMap) => Math.abs(a.x0 - b.x0) < 1 && Math.abs(a.y0 - b.y0) < 1 && Math.abs(a.sx - b.sx) < 1e-3 && Math.abs(a.sy - b.sy) < 1e-3;

interface Job {
  key: string;
  gen: Generator<void, void>;
}
const jobs = new Map<string, Job>();
/** Zombie textures whose build failed: never tried again (the piece keeps its own art). */
const failed = new Set<string>();
/** Rows of pixels per build step (a step stays within a few ms). */
const ROWS = 40;

/**
 * Build one zombie texture a slice at a time. `m` maps the texture's frames into the foot's frame (null: a leg tile,
 * which gets its own decals); `decals` is off when pieces at different places share the texture.
 */
function* buildSteps(sc: Phaser.Scene, src: string, dst: string, m: PieceMap | null, decals: boolean, plan: () => Plan): Generator<void, void> {
  const p = plan();
  yield;
  const tex = sc.textures.get(src);
  const img = tex.getSourceImage() as CanvasImageSource & { width: number; height: number };
  const [c, ctx] = readCanvas(img.width, img.height);
  ctx.drawImage(img, 0, 0);
  const names = tex.getFrameNames(false);
  const frames = (names.length ? names : ['__BASE']).map((n) => {
    const fr = tex.get(n);
    return { name: n, x: fr.cutX, y: fr.cutY, w: fr.cutWidth, h: fr.cutHeight };
  });
  // (each pixel once, even where frames overlap)
  const done = new Set<string>();
  for (const fr of frames) {
    if (fr.w <= 0 || fr.h <= 0) continue;
    const rect = `${fr.x},${fr.y},${fr.w},${fr.h}`;
    // a leg: bare skin or trousers? its decals follow
    let skinN = 0;
    let n = 0;
    if (!done.has(rect)) {
      done.add(rect);
      for (let v0 = 0; v0 < fr.h; v0 += ROWS) {
        const rows = Math.min(ROWS, fr.h - v0);
        const id = ctx.getImageData(fr.x, fr.y + v0, fr.w, rows);
        const d = id.data;
        for (let v = 0; v < rows; v++) {
          for (let u = 0; u < fr.w; u++) {
            const i = (v * fr.w + u) * 4;
            if (d[i + 3] === 0) continue;
            if (m) recolour(d, i, m.x0 + (u + 0.5) * m.sx, m.y0 + (v0 + v + 0.5) * m.sy, p, p.bw);
            else {
              if (d[i + 3] > 128) {
                n++;
                if (skinScore(d[i], d[i + 1], d[i + 2], p.skin, p.others) > 0.5) skinN++;
              }
              // the leg in its own texels, its noise wrapping with the tile
              recolour(d, i, u + 0.5, v0 + v + 0.5, p, fr.w * 1.6, fr.h);
            }
          }
        }
        ctx.putImageData(id, fr.x, fr.y + v0);
        yield;
      }
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(fr.x, fr.y, fr.w, fr.h);
    ctx.clip();
    ctx.globalCompositeOperation = 'source-atop';
    if (m && decals) {
      // texel (u, v) of this frame ↔ foot frame (x0 + u·sx, y0 + v·sy)
      ctx.setTransform(1 / m.sx, 0, 0, 1 / m.sy, fr.x - m.x0 / m.sx, fr.y - m.y0 / m.sy);
      paintDecals(ctx, p);
    } else if (!m) {
      ctx.translate(fr.x, fr.y);
      paintLegDecals(ctx, p, fr.w, fr.h, n > 0 && skinN / n > 0.4);
    }
    ctx.restore();
    yield;
  }
  if (sc.textures.exists(dst)) sc.textures.remove(dst);
  const out = sc.textures.addCanvas(dst, c);
  if (out && names.length) for (const fr of frames) out.add(fr.name, 0, fr.x, fr.y, fr.w, fr.h);
}

// ════════════════════════════ zombified peels ════════════════════════════

/** Rots canvases of one foot drawn in its design space: pixel (u, v) of `c` is design (ox + u/sc, oy + v/sc). */
export type Zombifier = (c: HTMLCanvasElement, ox: number, oy: number, sc: number, decals?: boolean) => void;

const zombifiers = new Map<string, Zombifier>();

/**
 * The zombified foot peels' rot (src/game/peels.ts, src/art/peelLive.ts): the same recolour and decals the play foot
 * gets, planned once per foot from its peel art (`crop`, the foot's still cut to its pixels: texel (u, v) is design
 * ((u + crop.x)/sTex − padX, (v + crop.y)/sTex − padY)), so the still and every layer of the living peel rot alike and
 * their decals line up. No Phaser: it works on plain canvases, so the locker can use it before any run.
 */
export function peelZombifier(id: string, art: FootArt, crop: { art: HTMLCanvasElement; x: number; y: number }, sTex: number, padX: number, padY: number): Zombifier {
  const hit = zombifiers.get(id);
  if (hit) return hit;
  const src = crop.art;
  const g = src.getContext('2d')!;
  const px = { data: g.getImageData(0, 0, src.width, src.height).data, w: src.width, h: src.height };
  // (seeded by the foot's id, as in play: the same foot always rots the same way)
  const plan = makePlan(id, art, px, 1 / sTex, padX * sTex - crop.x, padY * sTex - crop.y);
  const z: Zombifier = (c, ox, oy, sc, decals = true) => {
    const ctx = c.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const id2 = ctx.getImageData(0, 0, c.width, c.height);
    const d = id2.data;
    for (let v = 0; v < c.height; v++)
      for (let u = 0; u < c.width; u++) {
        const i = (v * c.width + u) * 4;
        if (d[i + 3] === 0) continue;
        recolour(d, i, ox + (u + 0.5) / sc, oy + (v + 0.5) / sc, plan, plan.bw);
      }
    ctx.putImageData(id2, 0, 0);
    if (decals) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.setTransform(sc, 0, 0, sc, -ox * sc, -oy * sc);
      paintDecals(ctx, plan);
      ctx.restore();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  };
  zombifiers.set(id, z);
  return z;
}

/** A zombified peel's flies: frames of a fly for the living peel's critter sheet (src/art/peelLive.ts). */
export function drawPeelFly(ctx: CanvasRenderingContext2D, i: number): void {
  ctx.save();
  ctx.translate(32, 30);
  drawFly(ctx, 1.9, [0, 0.55, 1][i] ?? 0);
  ctx.restore();
}

const isWound = (key: string) => key.startsWith(WOUND);

/** The pieces of a foot that get zombie art (not the wound, not art that's zombie already). */
function plainPieces(f: Foot): Piece[] {
  return f.artPieces().filter((o) => {
    const k = keyOf(o);
    return !k.startsWith(PREFIX) && k !== '__MISSING' && !failed.has(zombieKey(k));
  });
}

/** Queue (or carry on) building the zombie copy of each of the foot's pieces. */
function queue(f: Foot): Piece[] {
  const sc = f.scene;
  const pieces = plainPieces(f);
  // one mapping per texture: pieces at different places that share one get no decals on it
  const maps = new Map<string, { m: PieceMap | null; decals: boolean }>();
  for (const o of pieces) {
    const k = keyOf(o);
    const m = o instanceof Phaser.GameObjects.TileSprite ? null : mapOf(o);
    const had = maps.get(k);
    if (!had) maps.set(k, { m, decals: true });
    else if (!had.m || !m || !sameMap(had.m, m)) had.decals = false;
  }
  for (const [src, { m, decals }] of maps) {
    const dst = zombieKey(src);
    if (sc.textures.exists(dst) || jobs.has(dst)) continue;
    jobs.set(dst, { key: dst, gen: buildSteps(sc, src, dst, m, decals, () => planFor(f)) });
  }
  return pieces;
}

/** Start building a foot's zombie art in the background (the boss has marked it). */
export function prepareZombie(f: Foot): void {
  cosmetic(() => prepareNow(f));
}

function prepareNow(f: Foot): void {
  queue(f);
  // the wound and the flies too, each a step of its own (a first upload can be a hitch by itself)
  const sc = f.scene;
  const extra: [string, () => void][] = [
    [WOUND, () => woundTexture(sc, false)],
    [WOUND_TORN, () => woundTexture(sc, true)],
    [FLY, () => flyTexture(sc)],
  ];
  for (const [k, make] of extra) {
    if (sc.textures.exists(k) || jobs.has(k)) continue;
    jobs.set(k, {
      key: k,
      gen: (function* () {
        make();
      })(),
    });
  }
}

function step(k: string, j: Job): boolean {
  try {
    return !!j.gen.next().done;
  } catch (e) {
    failed.add(k);
    if (import.meta.env?.DEV) console.error('[zombieArt] building', k, e);
    return true;
  }
}

/** Take steps of the background builds for about `budgetMs` (each step is a few rows of pixels). */
export function stepZombieBuilds(budgetMs = 4): void {
  if (jobs.size) cosmetic(() => stepBuilds(budgetMs));
}

function stepBuilds(budgetMs: number): void {
  const t0 = performance.now();
  while (jobs.size && performance.now() - t0 < budgetMs) {
    const [k, j] = jobs.entries().next().value!;
    if (step(k, j)) jobs.delete(k);
  }
}

/** Dev: zombie textures still being built. */
export function zombieBuildsPending(): number {
  return jobs.size;
}

/** Finish building every zombie texture the foot needs now. */
function finish(f: Foot): void {
  const want = new Set(queue(f).map((o) => zombieKey(keyOf(o))));
  for (const k of want) {
    const j = jobs.get(k);
    if (!j) continue;
    while (!step(k, j));
    jobs.delete(k);
  }
}

/**
 * The bite wound: two crescents of torn tooth notches round raw, weeping flesh, flaps of loose skin. `torn` sets it in
 * a ragged hole through the foot's material, with grey-green skin round the flesh. Drawn once each (2× design px).
 */
function woundTexture(sc: Phaser.Scene, torn: boolean): string {
  const key = torn ? WOUND_TORN : WOUND;
  if (sc.textures.exists(key)) return key;
  const S = 2;
  const [c, g] = makeCanvas(150 * S, 140 * S);
  g.scale(S, S);
  const r = rng(hashStr(key));
  const cx = 75;
  const cy = 58;
  // bruised halo
  const halo = g.createRadialGradient(cx, cy, 8, cx, cy, 64);
  halo.addColorStop(0, 'rgba(70,30,80,.55)');
  halo.addColorStop(0.6, 'rgba(70,90,50,.28)');
  halo.addColorStop(1, 'rgba(70,90,50,0)');
  g.fillStyle = halo;
  g.beginPath();
  g.ellipse(cx, cy, 66, 54, 0, 0, Math.PI * 2);
  g.fill();
  if (torn) {
    // the material's torn lip, then grey-green skin in the hole
    g.save();
    g.translate(cx, cy);
    g.scale(1.2, 0.95);
    blob(g, 0, 0, 44, 0.4, rng(11), 12);
    g.restore();
    g.fillStyle = 'rgba(236,230,208,.55)';
    g.fill();
    g.save();
    g.translate(cx, cy);
    g.scale(1.15, 0.9);
    blob(g, 0, 0, 40, 0.4, rng(12), 12);
    g.restore();
    const sk = g.createRadialGradient(cx + 6, cy + 8, 4, cx, cy, 46);
    sk.addColorStop(0, '#b0c894');
    sk.addColorStop(0.7, '#86a070');
    sk.addColorStop(1, '#4a5a38');
    g.fillStyle = sk;
    g.fill();
    g.strokeStyle = 'rgba(26,20,12,.9)';
    g.lineWidth = 2;
    g.stroke();
  }
  // the torn flesh
  blob(g, cx, cy, 25, 0.5, r, 10);
  const fl = g.createRadialGradient(cx - 5, cy - 6, 2, cx, cy, 27);
  fl.addColorStop(0, '#2a0610');
  fl.addColorStop(0.45, '#6a1020');
  fl.addColorStop(0.8, '#b0303e');
  fl.addColorStop(1, '#c8c460');
  g.fillStyle = fl;
  g.fill();
  g.strokeStyle = 'rgba(30,14,10,.9)';
  g.lineWidth = 2;
  g.stroke();
  // the bite: two crescents of torn notches where the teeth went in, each pointing in towards the middle
  const notch = (x: number, y: number, a: number, s: number) => {
    g.save();
    g.translate(x, y);
    g.rotate(a);
    g.beginPath();
    g.moveTo(-5.5 * s, -3 * s);
    g.lineTo(0, 7 * s);
    g.lineTo(5.5 * s, -3 * s);
    g.quadraticCurveTo(0, -5 * s, -5.5 * s, -3 * s);
    g.closePath();
    g.fillStyle = '#2a0810';
    g.fill();
    g.strokeStyle = 'rgba(232,240,208,.55)';
    g.lineWidth = 1;
    g.stroke();
    g.fillStyle = 'rgba(200,50,64,.85)';
    g.beginPath();
    g.ellipse(-1, 0, 1.6, 2.6, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  };
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const a = Math.PI * (0.22 + (i / 3) * 0.56);
      const x = cx + Math.cos(a) * 36;
      const y = cy - side * Math.sin(a) * 30;
      notch(x, y, Math.atan2(cy - y, cx - x) - Math.PI / 2, 1.05 - Math.abs(i - 1.5) * 0.08);
    }
  }
  // flaps of loose skin hanging into it
  for (const [fx, fy, fa] of [[-14, -18, 0.5], [12, 16, -2.5]] as const) {
    g.save();
    g.translate(cx + fx, cy + fy);
    g.rotate(fa);
    g.beginPath();
    g.moveTo(-8, 0);
    g.quadraticCurveTo(0, 9, 8, 0);
    g.quadraticCurveTo(0, 3, -8, 0);
    g.fillStyle = torn ? '#9ab486' : '#a6be92';
    g.fill();
    g.strokeStyle = 'rgba(30,24,16,.8)';
    g.lineWidth = 1;
    g.stroke();
    g.restore();
  }
  // wet glints, and the weeping runs
  g.fillStyle = 'rgba(255,230,230,.6)';
  g.beginPath();
  g.ellipse(cx - 9, cy - 9, 6, 2.6, -0.5, 0, Math.PI * 2);
  g.fill();
  drip(g, cx + 6, cy + 20, 30, 12);
  drip(g, cx - 12, cy + 18, 18, 8);
  sc.textures.addCanvas(key, c);
  return key;
}

function flyTexture(sc: Phaser.Scene): string {
  if (sc.textures.exists(FLY)) return FLY;
  const [c, ctx] = makeCanvas(64 * 3, 56);
  for (let i = 0; i < 3; i++) {
    ctx.save();
    ctx.translate(i * 64 + 32, 30);
    drawFly(ctx, 1.9, [0, 0.55, 1][i]);
    ctx.restore();
  }
  const tex = sc.textures.addCanvas(FLY, c);
  for (let i = 0; i < 3; i++) tex?.add(i, 0, i * 64, 0, 64, 56);
  return FLY;
}

/** Let go of zombie art nothing on screen shows (GameScene's stage change, beside evictLive). */
export function evictZombieArt(sc: Phaser.Scene, inUse: Set<string>): void {
  for (const k of sc.textures.getTextureKeys()) if (k.startsWith(PREFIX) && !inUse.has(k)) sc.textures.remove(k);
  for (const [k, j] of jobs) {
    j.gen.return();
    jobs.delete(k);
  }
  plans.clear();
  failed.clear();
}

// ════════════════════════════ the wipe ════════════════════════════

interface Twin {
  src: Piece;
  old: Piece;
  /** The light riding the wipe's edge: one copy per band. */
  glows: Piece[];
}

/** The light at the wipe's edge: bands ending at the edge, each wider and fainter (width × the foot's scale, alpha),
 * so it is brightest at the edge and fades back into the changed art. */
const BANDS: [number, number][] = [
  [16, 0.5],
  [34, 0.3],
  [64, 0.18],
];

function clone(sc: Phaser.Scene, p: Piece, key: string): Piece {
  let o: Piece;
  if (p instanceof Phaser.GameObjects.TileSprite) {
    const t = sc.add.tileSprite(p.x, p.y, p.width, p.height, key).setOrigin(p.originX, p.originY).setTileScale(p.tileScaleX, p.tileScaleY);
    t.tilePositionX = p.tilePositionX;
    t.tilePositionY = p.tilePositionY;
    o = t;
  } else o = sc.add.image(p.x, p.y, key, p.frame.name).setOrigin(p.originX, p.originY).setScale(p.scaleX, p.scaleY).setFlip(p.flipX, p.flipY);
  o.setRotation(p.rotation).setAlpha(p.alpha).setVisible(p.visible).setBlendMode(p.blendMode);
  const parent = p.parentContainer;
  if (parent) parent.addAt(o, parent.getIndex(p) + 1);
  return o;
}

function sync(t: Twin, glowA: number): void {
  const s = t.src;
  for (const o of [t.old, ...t.glows]) {
    if (!o.active) continue;
    o.setPosition(s.x, s.y).setRotation(s.rotation).setVisible(s.visible);
    if (s instanceof Phaser.GameObjects.TileSprite && o instanceof Phaser.GameObjects.TileSprite) {
      o.tilePositionX = s.tilePositionX;
      o.tilePositionY = s.tilePositionY;
      if (o.height !== s.height) o.setSize(s.width, s.height);
    } else if (o instanceof Phaser.GameObjects.Image && s instanceof Phaser.GameObjects.Image) {
      o.setScale(s.scaleX, s.scaleY);
      if (o.frame.name !== s.frame.name && o.texture.has(s.frame.name)) o.setFrame(s.frame.name);
    }
  }
  if (t.old.active) {
    t.old.setAlpha(s.alpha);
    if (s.tintFill) t.old.setTintFill(s.tintTopLeft);
    else if (s.isTinted) t.old.setTint(s.tintTopLeft);
    else t.old.clearTint();
  }
  t.glows.forEach((g, i) => g.active && g.setAlpha(s.alpha * glowA * BANDS[i][1]));
}

/** Swap every piece of a foot to another texture with a wipe out of a point of the foot's frame: the old art stays
 * on top, masked to outside a growing circle, with bands of light riding its edge. */
class Wipe {
  private twins: Twin[] = [];
  private hole: Phaser.GameObjects.Graphics | null = null;
  private holeMask: Phaser.Display.Masks.GeometryMask | null = null;
  private bands: { g: Phaser.GameObjects.Graphics; mask: Phaser.Display.Masks.GeometryMask; w: number }[] = [];
  private t = 0;
  /** How far it has to reach (px), how fast it spreads (px/s) and how long that takes in all. */
  private R: number;
  private speed: number;
  private total: number;
  done = false;

  constructor(private f: Foot, to: (key: string) => string, private at: [number, number], dur: number, from: [number, number, number, number], color = INFECT, private glowMax = 1) {
    const sc = f.scene;
    if (sc.sys.renderer.type === Phaser.WEBGL) {
      this.hole = sc.make.graphics({}, false);
      this.holeMask = this.hole.createGeometryMask().setInvertAlpha(true);
      for (const [w] of BANDS) {
        const g = sc.make.graphics({}, false);
        this.bands.push({ g, mask: g.createGeometryMask(), w: w * f.type.scale });
      }
    }
    for (const p of f.artPieces()) {
      const was = keyOf(p);
      if (isWound(was)) continue;
      const now = to(was);
      if (now === was || !sc.textures.exists(now)) continue;
      const old = clone(sc, p, was);
      if (p instanceof Phaser.GameObjects.TileSprite) p.setTexture(now);
      else p.setTexture(now, p.frame.name);
      // (each band just above the old art: the light rides its edge; the widest, faintest lowest)
      const glows: Piece[] = [];
      for (let i = this.bands.length - 1; i >= 0; i--) {
        const gl = clone(sc, old, now);
        gl.setTintFill(color);
        gl.setMask(this.bands[i].mask);
        glows[i] = gl;
      }
      if (this.holeMask) old.setMask(this.holeMask);
      const tw = { src: p, old, glows };
      sync(tw, 0);
      this.twins.push(tw);
    }
    // it covers the foot in most of `dur`, then carries on up the leg to the top of the screen at the same pace
    const [x0, y0, x1, y1] = from;
    const sx = Math.abs(f.root.scaleX);
    let R = 0;
    for (const [x, y] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) R = Math.max(R, Math.hypot(x - at[0], y - at[1]) * sx);
    const [, wy] = this.world();
    this.speed = (R + 20) / (dur * 0.8);
    this.R = Math.max(R, wy + 40) + 30;
    this.total = Math.max(dur, this.R / this.speed);
    this.draw();
  }

  private world(): [number, number] {
    const p = this.f.root.getWorldTransformMatrix().transformPoint(this.at[0], this.at[1]);
    return [p.x, p.y];
  }

  private draw(): void {
    const u = Math.min(1, this.t / this.total);
    // (a moment to gather at the bite, then a steady spread)
    const k = Math.min(1, this.t / 0.08);
    const r = Math.min(this.R, this.speed * Math.max(0, this.t - 0.04) * (0.5 + 0.5 * k));
    const [x, y] = this.world();
    if (this.hole) {
      this.hole.clear().fillStyle(0xffffff).fillCircle(x, y, Math.max(0.5, r));
      for (const b of this.bands) {
        b.g.clear();
        // (a band wider than the circle so far is just the circle)
        if (r <= b.w) b.g.fillStyle(0xffffff).fillCircle(x, y, Math.max(0.5, r));
        else b.g.lineStyle(b.w, 0xffffff).strokeCircle(x, y, r - b.w / 2);
      }
    }
    // the light fades in over the first moment and out as it runs off the top
    const glowA = this.glowMax * Math.min(1, this.t / 0.1) * (u < 0.8 ? 1 : 1 - (u - 0.8) / 0.2);
    for (const t of this.twins) {
      sync(t, glowA);
      // no mask (canvas renderer): a cross-fade instead
      if (!this.hole && t.old.active) t.old.setAlpha(t.src.alpha * (1 - u));
    }
  }

  update(dt: number): void {
    if (this.done) return;
    this.t += dt;
    if (this.t >= this.total || !this.f.root.active) this.end();
    else this.draw();
  }

  end(): void {
    if (this.done) return;
    this.done = true;
    for (const t of this.twins) for (const o of [t.old, ...t.glows]) if (o.active) o.destroy();
    this.twins = [];
    this.holeMask?.destroy();
    this.hole?.destroy();
    for (const b of this.bands) {
      b.mask.destroy();
      b.g.destroy();
    }
    this.bands = [];
    this.hole = null;
    this.holeMask = null;
  }
}

// ════════════════════════════ a zombie foot ════════════════════════════

/** What a zombie foot asks the fight to play (Arena.sfx). */
export type ZombieSound = (key: string, opts?: { volume?: number; rate?: number; throttle?: number }) => void;

/** A foot the boss has bitten: its zombie art, the change itself, and how it carries on (sway, twitches, flies,
 * ooze) until it's cured or dies. */
export class ZombieLook {
  private wipe: Wipe | null = null;
  private wound: Phaser.GameObjects.Image | null = null;
  private flies: Critters | null = null;
  private drips: WorldEmitter | null = null;
  private cloud: WorldEmitter | null = null;
  /** Its lean (radians) and the squash of its body (from the sole): springs its convulsions and twitches kick. */
  private lean = new Spring(0, 70, 7);
  private sqX = new Spring(1, 260, 13);
  private sqY = new Spring(1, 260, 13);
  private t = crand() * 10;
  private twitchIn = 1.5 + crand() * 2;
  private plan: Plan;
  private woundAt: [number, number] = [0, 0];
  /** Seconds since the bite (the convulsions run off it; the flies swarm in after the wipe). */
  private age = 0;
  /** The convulsions still to come: [seconds after the bite, what happens]. */
  private beats: [number, () => void][] = [];
  cured = false;
  private released = false;
  private woundScale = 0;

  constructor(readonly f: Foot, readonly side: number, private sound: ZombieSound = () => {}) {
    this.plan = planFor(f);
    // it runs itself, after the scene's own update (the live layer has posed the foot by then), so the cure's wipe
    // plays out after the boss is gone
    f.scene.events.on('postupdate', this.tick, this);
  }

  private tick(_t: number, ms: number): void {
    // on the scene's clock: slow-mo slows it with everything else
    this.update(Math.min(0.05, ms / 1000) * this.f.scene.tweens.timeScale);
  }

  /** The bite: build what's missing, wipe the zombie art in from the bite, convulse. */
  bite(): void {
    cosmetic(() => this.biteNow());
  }

  private biteNow(): void {
    const f = this.f;
    finish(f);
    const p = this.plan;
    const ts = f.type.scale;
    // the wound: inset from the edge facing the boss, at the foot's middle height
    const y = Math.max(p.box.y0 + p.bw * 0.2, Math.min(p.box.y1 - p.bw * 0.2, -f.meta.footHeight * ts * 0.48));
    const wr = p.bw * 0.2;
    let x = 0;
    const dir = this.side >= 0 ? 1 : -1;
    const edge = dir > 0 ? p.box.x1 : p.box.x0;
    const mid = (p.box.x0 + p.box.x1) / 2;
    for (let k = 0; k <= 60; k++) {
      const tx = edge + (mid - edge) * (k / 60);
      if (p.solid(tx, y)) {
        x = tx - dir * wr * 0.9;
        break;
      }
    }
    if (!p.solid(x, y)) x = mid;
    this.woundAt = [x, y];
    const key = woundTexture(f.scene, !p.bare);
    const img = f.scene.add.image(x, y, key).setScale((p.bw * 0.5) / 300).setFlipX(dir < 0).setAngle(dir * 8).setAlpha(0);
    f.addLiveArt(img, false);
    this.wound = img;
    f.scene.tweens.add({ targets: img, alpha: 1, scale: { from: img.scaleX * 0.6, to: img.scaleX }, duration: 160, ease: 'Back.Out' });
    // the wipe out of the bite (from its outer edge)
    const b = p.box;
    this.wipe = new Wipe(f, zombieKey, [x + dir * wr, y], 0.6, [b.x0, b.y0, b.x1, b.y1]);
    this.convulse();
    this.drips = new WorldEmitter(f.scene, f, { frame: 'drop', drag: 0.2, max: 30 });
  }

  /** The bitten foot fights it: a jolt away from the bite, a squash, a stretch, a shudder, then it lurches over. */
  private convulse(): void {
    const calm = reduced() ? 0.4 : 1;
    const dir = this.side >= 0 ? 1 : -1;
    this.lean.v -= dir * 3.2 * calm;
    this.beats = [
      [0.1, () => ((this.sqY.v -= 5.5 * calm), (this.sqX.v += 3.5 * calm))],
      [0.26, () => ((this.sqY.v += 5 * calm), (this.sqX.v -= 3 * calm))],
      [0.34, () => (this.lean.v += dir * 2.4 * calm)],
      [0.4, () => (this.lean.v -= dir * 2.4 * calm)],
      [0.46, () => (this.lean.v += dir * 4.6 * calm)],
      [0.5, () => (this.sqY.v -= 3 * calm)],
    ];
  }

  /** The flies find it (after the wipe). */
  private swarm(): void {
    if (this.flies || !this.f.alive) return;
    const f = this.f;
    this.flies = new Critters(f.scene, f, { key: flyTexture(f.scene), frames: 3, count: 3, at: [CX, f.meta.footHeight * 0.5], rx: 130, ry: 120, speed: 1.4, jitter: 22, scale: 0.5 });
    // they come in from a wide circle
    this.flies.tight = 3.2;
    this.sound('sfx_poltergeist_flies', { volume: 0.55, rate: 0.95 + crand() * 0.1, throttle: 400 });
  }

  /** It rears back from a neighbour it's about to bite (`dir`: towards the neighbour). */
  windup(dir: number): void {
    if (this.cured || this.released) return;
    const calm = reduced() ? 0.4 : 1;
    this.lean.v -= dir * 2.6 * calm;
    this.sqY.v += 2 * calm;
  }

  /** It lunges at the neighbour and bites. */
  lunge(dir: number): void {
    if (this.cured || this.released) return;
    const calm = reduced() ? 0.4 : 1;
    this.lean.v += dir * 6 * calm;
    this.sqX.v += 3 * calm;
    this.sqY.v -= 3.5 * calm;
  }

  /** It swells as it turns into something worse (a second Loafer): a shudder and a heave. */
  swell(): void {
    if (this.cured || this.released) return;
    const calm = reduced() ? 0.4 : 1;
    this.sqX.v += 4 * calm;
    this.sqY.v += 5 * calm;
    this.lean.v += (crand() < 0.5 ? -1 : 1) * 3 * calm;
  }

  /** A green puff of rot off the whole foot (its own emitter: cosmetic randomness only). */
  puff(): void {
    cosmetic(() => this.puffNow());
  }

  private puffNow(): void {
    const f = this.f;
    if (!f.alive || !f.root.active) return;
    this.cloud ??= new WorldEmitter(f.scene, f, { frame: 'puff', curl: 30, drag: 1.1, max: 40 });
    const s = f.type.scale;
    const hw = this.plan.bw / s / 2;
    for (let i = 0, n = Math.max(3, Math.round(8 * liveQuality())); i < n; i++) {
      this.cloud.emit(CX + (crand() - 0.5) * hw * 1.6, f.meta.footHeight * (0.2 + crand() * 0.7), { vx: (crand() - 0.5) * 80, vy: -40 - crand() * 50, life: 1.1 + crand() * 0.5, r0: 14 * s, r1: 46 * s, a: 0.5, tint: [0x9fbf4a, 0x7a9a2a, 0xb8c96a][Math.floor(crand() * 3)], fade: 0.15 });
    }
  }

  /** Where the wound is in world space (for its drips and the scene's effects). */
  woundWorld(): [number, number] {
    const ts = this.f.type.scale;
    return this.f.styleWorld(this.woundAt[0] / ts + CX, this.woundAt[1] / ts + this.f.meta.footHeight);
  }

  /** Step the springs and pose the foot with them. */
  private pose(dt: number, sway: number): void {
    const f = this.f;
    f.leanFx = Math.max(-0.3, Math.min(0.3, this.lean.step(sway, dt)));
    const sx = Math.max(0.75, Math.min(1.25, this.sqX.step(1, dt)));
    const sy = Math.max(0.75, Math.min(1.25, this.sqY.step(1, dt)));
    f.setBodyScale(sx, sy);
  }

  private settled(): boolean {
    return Math.abs(this.sqX.x - 1) + Math.abs(this.sqY.x - 1) + Math.abs(this.lean.x) < 0.004 && Math.abs(this.sqY.v) + Math.abs(this.lean.v) < 0.05;
  }

  update(dt: number): void {
    if (!this.released) cosmetic(() => this.step(dt));
  }

  private step(dt: number): void {
    const f = this.f;
    if (this.released) return;
    if (!f.alive || !f.root.active) {
      this.release();
      return;
    }
    this.t += dt;
    this.age += dt;
    this.wipe?.update(dt);
    if (this.wipe?.done) this.wipe = null;
    if (this.cured) {
      // (the cure's wipe runs out, the wound closes and the foot settles, then everything goes)
      this.pose(dt, 0);
      const w = this.wound;
      if (w?.active) {
        const k = Math.max(0, 1 - this.age / 0.45);
        w.setAlpha(k).setScale(this.woundScale * (0.5 + 0.5 * k));
        if (k <= 0) {
          this.wound = null;
          f.removeLiveArt(w);
        }
      }
      if (!this.wipe && !this.wound && (this.settled() || this.age > 3)) this.release();
      return;
    }
    while (this.beats.length && this.age >= this.beats[0][0]) this.beats.shift()![1]();
    this.cloud?.follow(dt);
    if (this.age > 0.6) this.swarm();
    if (this.flies) {
      this.flies.tight += (1 - this.flies.tight) * Math.min(1, dt * 2.2);
      this.flies.update(dt);
    }
    // the sickly sway and the odd twitch (still feet keep still: graphics settings), now and then with a groan
    const calm = reduced() ? 0.35 : 1;
    const moving = feetAnimated();
    this.twitchIn -= dt;
    if (moving && this.twitchIn <= 0 && this.age > 1.5) {
      this.twitchIn = 1.6 + crand() * 2.8;
      this.lean.v += (crand() < 0.5 ? -1 : 1) * (1.6 + crand() * 1.6) * calm;
      this.sqY.v -= 2.2 * calm;
      if (crand() < 0.3) this.sound('sfx_poltergeist_turn', { volume: 0.3, rate: 1.15 + crand() * 0.2, throttle: 2500 });
    }
    const sway = moving ? Math.sin(this.t * 1.15) * 0.04 * calm + Math.sin(this.t * 2.9 + 1) * 0.012 * calm : 0;
    this.pose(dt, sway);
    // ooze drips off the wound and the sole
    if (this.drips) {
      this.drips.follow(dt);
      const s = f.type.scale;
      this.drips.rate('wound', 1.1, dt, () => {
        this.drips!.emit(this.woundAt[0] / s + CX + (crand() - 0.5) * 8, this.woundAt[1] / s + f.meta.footHeight + 16, { vy: 20, life: 0.9, r0: 5 * s, r1: 3.5 * s, a: 0.9, tint: crand() < 0.6 ? 0xa4b048 : 0x6a7424, grav: 700, fade: 0.04 });
      });
      this.drips.rate('sole', 0.7, dt, () => {
        this.drips!.emit(CX + ((crand() - 0.5) * this.plan.bw * 0.8) / s, f.meta.footHeight - 4, { vy: 20, life: 0.8, r0: 4.5 * s, r1: 3 * s, a: 0.85, tint: crand() < 0.5 ? 0x98a640 : 0x5e6a1e, grav: 800, fade: 0.04 });
      });
    }
    // anything that swapped its own art back since (a shield's still body, a late live layer) rots too
    if (!this.wipe) {
      let fresh = false;
      for (const o of f.artPieces()) {
        const k = keyOf(o);
        if (k.startsWith(PREFIX) || failed.has(zombieKey(k))) continue;
        if (!fresh) {
          finish(f);
          fresh = true;
        }
        const z = zombieKey(k);
        if (!f.scene.textures.exists(z)) continue;
        if (o instanceof Phaser.GameObjects.TileSprite) o.setTexture(z);
        else o.setTexture(z, o.frame.name);
      }
    }
  }

  /** The boss is down: wipe the original art back from the middle out. Returns where the heal burst goes. */
  cure(): [number, number] {
    return cosmetic(() => this.cureNow());
  }

  private cureNow(): [number, number] {
    const f = this.f;
    this.cured = true;
    this.beats = [];
    this.wipe?.end();
    const p = this.plan;
    const c: [number, number] = [(p.box.x0 + p.box.x1) / 2, (p.box.y0 + p.box.y1) / 2];
    if (f.alive && f.root.active) {
      this.wipe = new Wipe(f, plainKey, c, 0.7, [p.box.x0, p.box.y0, p.box.x1, p.box.y1], HEAL, 0.8);
      // (the wound closes up as the wipe passes: update)
      this.woundScale = this.wound?.scaleX ?? 0;
      // it straightens up
      this.sqY.v += 3;
      this.sqX.v -= 1.5;
    }
    this.flies?.release();
    this.flies = null;
    this.drips?.release();
    this.drips = null;
    this.cloud?.release();
    this.cloud = null;
    this.age = 0;
    const m = f.root.getWorldTransformMatrix().transformPoint(c[0], c[1]);
    return [m.x, m.y];
  }

  /** The foot died or left (or came round): the flies scatter, the ooze stops, its pose lets go. */
  release(): void {
    if (!this.released) cosmetic(() => this.releaseNow());
  }

  private releaseNow(): void {
    if (this.released) return;
    this.released = true;
    this.f.scene.events.off('postupdate', this.tick, this);
    this.wipe?.end();
    this.wipe = null;
    this.flies?.release();
    this.drips?.release();
    this.cloud?.release();
    this.flies = null;
    this.drips = null;
    this.cloud = null;
    this.f.leanFx = 0;
    if (this.f.root.active) this.f.setBodyScale(1, 1);
    // (a cured foot's wound goes; a dead one's leaves with the foot)
    if (this.cured && this.wound?.active) this.f.removeLiveArt(this.wound);
    this.wound = null;
  }
}
