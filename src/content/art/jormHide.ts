// The world serpent's hide (src/content/art/jormungandr.ts paints him with it): weathered stone plates over living
// flesh, lit per pixel. A hide is a height field (the body's own form plus every plate's bevelled slab) shaded by the
// Edge of the World's light: the wan, greenish sun high on the left, the storm sky's cool fill, and the void's violet
// glow from behind and below as a rim. Each plate is a slab of its own (its slate tone, tilt, lift and weathering:
// pits, chips, lichen, salt crust in the crevices, a wet sheen); between them, dark crevices. Where the flesh shows
// (the pale ribbed throat and belly) it's soft, ribbed and glistening.
//
// Plates are a Voronoi tessellation of seeds laid out in a "plate space" (a uv map of the body: the head's own
// coordinates, the neck's tile, a coil's length and girth), so they follow the body and move with it.

import { makeCanvas, type Ctx } from '../../art/util';

export type Pt = [number, number];
type RGB = [number, number, number];

// ——— noise ———

function hash(ix: number, iy: number, s: number): number {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(s + 1, 982451653);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Smooth value noise, 0…1 (periodic in y with period py lattice cells when py > 0). */
export function vnoise(x: number, y: number, s = 0, py = 0): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const y0 = py ? ((iy % py) + py) % py : iy;
  const y1 = py ? (((iy + 1) % py) + py) % py : iy + 1;
  const a = hash(ix, y0, s);
  const b = hash(ix + 1, y0, s);
  const c = hash(ix, y1, s);
  const d = hash(ix + 1, y1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Fractal noise, 0…1 (periodic in y over `py` units at the base scale when py > 0). */
export function fbm(x: number, y: number, s = 0, oct = 4, py = 0): number {
  let t = 0;
  let amp = 0.5;
  let f = 1;
  let n = 0;
  for (let i = 0; i < oct; i++) {
    t += vnoise(x * f, y * f, s + i * 17, py ? py * f : 0) * amp;
    n += amp;
    amp *= 0.5;
    f *= 2;
  }
  return t / n;
}

/** A periodic fbm table (256²), so per-pixel painting samples noise instead of computing it. */
const TS = 256;
const tables: Record<number, Float32Array> = {};
function noiseTable(seed: number): Float32Array {
  const t = tables[seed];
  if (t) return t;
  const out = new Float32Array(TS * TS);
  for (let y = 0; y < TS; y++)
    for (let x = 0; x < TS; x++) {
      // four octaves, each periodic over the table (lattice 16, 32, 64, 128 cells across)
      let v = 0;
      let amp = 0.5;
      let n = 0;
      for (let o = 0, cells = 16; o < 4; o++, cells *= 2) {
        const k = cells / TS;
        v += periodic(x * k, y * k, cells, seed + o * 17) * amp;
        n += amp;
        amp *= 0.5;
      }
      out[y * TS + x] = v / n;
    }
  tables[seed] = out;
  return out;
}
function periodic(x: number, y: number, p: number, s: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const x0 = ((ix % p) + p) % p;
  const x1 = (x0 + 1) % p;
  const y0 = ((iy % p) + p) % p;
  const y1 = (y0 + 1) % p;
  const a = hash(x0, y0, s);
  const b = hash(x1, y0, s);
  const c = hash(x0, y1, s);
  const d = hash(x1, y1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
/** Sample a noise table (texel coordinates, wrapping), bilinear. */
function tab(t: Float32Array, x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const x0 = ix & 255;
  const y0 = iy & 255;
  const x1 = (x0 + 1) & 255;
  const y1 = (y0 + 1) & 255;
  const a = t[y0 * TS + x0];
  const b = t[y0 * TS + x1];
  const c = t[y1 * TS + x0];
  const d = t[y1 * TS + x1];
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0 || 1e-6));
  return t * t * (3 - 2 * t);
};
export function hexRGB(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// ——— the light (the Edge of the World) ———

/** The key light: the wan sun high on the left (towards the viewer), unit vector. */
const L = (() => {
  const v = [-0.5, -0.72, 0.55];
  const m = Math.hypot(v[0], v[1], v[2]);
  return v.map((k) => k / m) as [number, number, number];
})();
const HV = (() => {
  const v = [L[0], L[1], L[2] + 1];
  const m = Math.hypot(v[0], v[1], v[2]);
  return v.map((k) => k / m) as [number, number, number];
})();
/** Its colour (pale green-white), the storm's fill (cool blue-violet), the void's rim (violet). */
const SUN: RGB = [236, 244, 214];
const FILL: RGB = [92, 100, 150];
const RIM: RGB = [178, 160, 255];

// ——— materials ———

export interface StoneTone {
  /** Slate tones the plates are picked from. */
  tones: string[];
  /** Crevice colour. */
  crevice: string;
  /** Lichen colours. */
  lichen: string[];
  /** Salt crust. */
  salt: string;
}

export const STONE: StoneTone = {
  tones: ['#7c8478', '#86887e', '#727a76', '#7a8288', '#8a8a84', '#6e766e', '#808680', '#767c84', '#909088', '#687068'],
  crevice: '#0a0b16',
  lichen: ['#7e8a76', '#8c8866', '#6e7a6c', '#98906a'],
  salt: '#e8ecee',
};

export const FLESH = { pale: '#9c8882', mid: '#7a5e64', shade: '#34284a', rib: '#9a7a82' };

export interface Plate {
  x: number;
  y: number;
  /** albedo */
  c: RGB;
  /** slab tilt (height per plate-space px) */
  tx: number;
  ty: number;
  /** lift (proud plates stand higher) */
  lift: number;
  /** lichen cover 0…1 */
  lichen: number;
  lichenC: RGB;
  /** wet gloss 0…1 */
  wet: number;
  /** weathering (pits) 0…1 */
  wear: number;
}

/** Lay out plate seeds over a box of plate space, spaced by size(u, v) (dart throwing), with their looks. */
export function layPlates(seed: number, x0: number, y0: number, w: number, h: number, size: (u: number, v: number) => number, o: { tries?: number; tone?: StoneTone; wrapH?: number; lichen?: number; fixed?: [number, number, number][]; mirror?: number } = {}): Plate[] {
  const r = mulberry(seed);
  const tone = o.tone ?? STONE;
  const pts: { x: number; y: number; s: number }[] = [];
  const tries = o.tries ?? Math.round((w * h) / 30);
  // a coarse grid of what's laid, to check spacing fast
  const G = 24;
  const gw = Math.ceil(w / G) + 1;
  const gh = Math.ceil(h / G) + 1;
  const grid: number[][] = Array.from({ length: gw * gh }, () => []);
  const wrapH = o.wrapH ?? 0;
  const place = (x: number, y: number, s: number) => {
    const gx = Math.min(gw - 1, Math.max(0, Math.floor((x - x0) / G)));
    const gy = Math.min(gh - 1, Math.max(0, Math.floor((y - y0) / G)));
    grid[gy * gw + gx].push(pts.length);
    pts.push({ x, y, s });
  };
  // seeds laid out by hand first (a serpent's head shields, a row of lip scales)
  for (const [x, y, s] of o.fixed ?? []) place(x, y, s);
  const xw = o.mirror !== undefined ? o.mirror - x0 : w;
  for (let i = 0; i < tries; i++) {
    const x = x0 + r() * xw;
    const y = y0 + r() * h;
    const s = size(x, y);
    if (s <= 0) continue;
    const gx = Math.floor((x - x0) / G);
    const gy = Math.floor((y - y0) / G);
    const reach = Math.ceil((s * 1.2) / G) + 1;
    let ok = true;
    for (let dy = -reach; dy <= reach && ok; dy++)
      for (let dx = -reach; dx <= reach && ok; dx++) {
        let yy = gy + dy;
        let wy = 0;
        if (wrapH) {
          const n = Math.round(h / G);
          if (yy < 0) {
            yy += n;
            wy = -h;
          } else if (yy >= n) {
            yy -= n;
            wy = h;
          }
        }
        const xx = gx + dx;
        if (xx < 0 || yy < 0 || xx >= gw || yy >= gh) continue;
        for (const k of grid[yy * gw + xx]) {
          const p = pts[k];
          const md = (p.s + s) * 0.5 * 0.82;
          if (Math.hypot(p.x - x, p.y + wy - y) < md) ok = false;
        }
      }
    if (!ok) continue;
    grid[gy * gw + gx].push(pts.length);
    pts.push({ x, y, s });
  }
  // symmetric: the left half's seeds mirrored onto the right (those on the middle line stay single)
  if (o.mirror !== undefined) {
    const m = o.mirror;
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      if (p.x < m - p.s * 0.3) pts.push({ x: 2 * m - p.x + (r() - 0.5) * 3, y: p.y + (r() - 0.5) * 3, s: p.s });
    }
  }
  return pts.map((p) => {
    const c = hexRGB(tone.tones[Math.floor(r() * tone.tones.length)]);
    const k = 0.74 + r() * 0.5;
    const lc = hexRGB(tone.lichen[Math.floor(r() * tone.lichen.length)]);
    return {
      x: p.x,
      y: p.y,
      c: [c[0] * k, c[1] * k, c[2] * k * (0.97 + r() * 0.06)] as RGB,
      tx: (r() - 0.5) * 0.36,
      ty: (r() - 0.5) * 0.36,
      lift: (r() - 0.3) * 3 + p.s * 0.06,
      lichen: r() < (o.lichen ?? 0.3) ? 0.2 + r() * 0.6 : 0,
      lichenC: lc,
      wet: r() < 0.25 ? 0.5 + r() * 0.5 : r() * 0.25,
      wear: r(),
    };
  });
}

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A grid over plate seeds for nearest-two lookups. */
class PlateGrid {
  private cells: number[][];
  private gw: number;
  private gh: number;
  constructor(readonly plates: Plate[], readonly x0: number, readonly y0: number, readonly w: number, readonly h: number, readonly G: number, readonly wrapH = 0) {
    this.gw = Math.ceil(w / G) + 2;
    this.gh = Math.ceil(h / G) + 2;
    this.cells = Array.from({ length: this.gw * this.gh }, () => []);
    plates.forEach((p, i) => {
      const gx = Math.floor((p.x - x0) / G) + 1;
      const gy = Math.floor((p.y - y0) / G) + 1;
      if (gx >= 0 && gy >= 0 && gx < this.gw && gy < this.gh) this.cells[gy * this.gw + gx].push(i);
    });
  }
  /** Nearest and second-nearest plate to (u, v): [i1, i2, wrap offset of i1, wrap offset of i2]. */
  near(u: number, v: number, out: { i1: number; i2: number; w1: number; w2: number; d1: number; d2: number }): void {
    let d1 = 1e18;
    let d2 = 1e18;
    let i1 = -1;
    let i2 = -1;
    let w1 = 0;
    let w2 = 0;
    const G = this.G;
    const gx = Math.floor((u - this.x0) / G) + 1;
    const wraps = this.wrapH ? [0, -this.wrapH, this.wrapH] : [0];
    for (const wo of wraps) {
      const gy = Math.floor((v + wo - this.y0) / G) + 1;
      for (let dy = -2; dy <= 2; dy++) {
        const yy = gy + dy;
        if (yy < 0 || yy >= this.gh) continue;
        for (let dx = -2; dx <= 2; dx++) {
          const xx = gx + dx;
          if (xx < 0 || xx >= this.gw) continue;
          for (const k of this.cells[yy * this.gw + xx]) {
            const p = this.plates[k];
            const ex = u - p.x;
            const ey = v + wo - p.y;
            const d = ex * ex + ey * ey;
            if (d < d1) {
              d2 = d1;
              i2 = i1;
              w2 = w1;
              d1 = d;
              i1 = k;
              w1 = wo;
            } else if (d < d2) {
              d2 = d;
              i2 = k;
              w2 = wo;
            }
          }
        }
      }
    }
    out.i1 = i1;
    out.i2 = i2;
    out.w1 = w1;
    out.w2 = w2;
    out.d1 = d1;
    out.d2 = d2;
  }
}

export interface HideJob {
  w: number;
  h: number;
  /** Coverage 0…255 per pixel (the body's silhouette). */
  mask: Uint8ClampedArray;
  /** The body's own form: height (px) at a pixel. */
  form: (x: number, y: number) => number;
  /** Pixel → plate space (default: the pixel itself). */
  uv?: (x: number, y: number, out: Pt) => void;
  /** How much plate space a pixel spans (to keep bevels and crevices in px; default 1). */
  uvScale?: number;
  plates: Plate[];
  /** Plate space's box and grid cell (≥ the biggest plate spacing / 2). */
  box: { x: number; y: number; w: number; h: number };
  cell: number;
  /** Plate space repeats every wrapH in v (a tiling texture). */
  wrapH?: number;
  /** Flesh weight 0…1 at a pixel (pale ribbed throat, belly) and its ribs' height there. */
  flesh?: (x: number, y: number, u: number, v: number) => number;
  ribs?: (x: number, y: number, u: number, v: number) => number;
  /** Crevice width and bevel width (px). */
  crevice?: number;
  bevel?: number;
  /** How proud the plates stand (height px of a full bevel). */
  relief?: number;
  /** Shingle: plates' lower edges stand proud (height px per px of v below the seed). */
  shingle?: number;
  /** Scale of the form's normals (steeper = more modelled). */
  formK?: number;
  /** Exposure and the rim's strength. */
  exposure?: number;
  rim?: number;
  /** Extra darkening towards the water (a pixel's y → 0…1 of wet darkness). */
  wetDark?: (x: number, y: number) => number;
  /** Noise seed. */
  seed?: number;
  /** How far plate edges wander (px) and how chipped they are. */
  warp?: number;
  chip?: number;
  /** How uneven each plate's face is (px). */
  lump?: number;
  /** Gloss of the stone (0…1, default 0.5). */
  gloss?: number;
}

/** Paint a hide into ctx at (0, 0) (w × h), its alpha from the mask. */
export function paintHide(ctx: Ctx, j: HideJob): void {
  const { w, h } = j;
  const N = w * h;
  const height = new Float32Array(N);
  const plateId = new Int32Array(N).fill(-1);
  const edgeD = new Float32Array(N);
  // which way the nearest edge lies: +1 the neighbour plate is below (this plate's lower lip), −1 above
  const edgeDir = new Float32Array(N);
  const fleshW = new Float32Array(N);
  const grid = new PlateGrid(j.plates, j.box.x, j.box.y, j.box.w, j.box.h, j.cell, j.wrapH ?? 0);
  const near = { i1: -1, i2: -1, w1: 0, w2: 0, d1: 0, d2: 0 };
  const uv: Pt = [0, 0];
  const crev = j.crevice ?? 1.6;
  const bev = j.bevel ?? 6;
  const relief = j.relief ?? 5;
  const shingle = j.shingle ?? 0.05;
  const uvs = j.uvScale ?? 1;
  const seed = j.seed ?? 7;
  const wrapH = j.wrapH ?? 0;
  // noise frequencies (texels per plate-space px), snapped so a tiling hide's noise tiles too
  const kf = (want: number) => (wrapH ? (Math.max(1, Math.round((want * wrapH) / TS)) * TS) / wrapH : want);
  const T = noiseTable(seed);
  const kPit = kf(4.5);
  const kTone = kf(1.1);
  const kLich = kf(1.5);
  const kSpot = kf(6);
  const kSalt = kf(3.5);
  const kWarp = kf(0.7);
  const kLump = kf(0.6);
  const lumpA = j.lump ?? 6;
  const kChip = kf(3);
  const warp = j.warp ?? 14;
  const chip = j.chip ?? 2.6;
  // the height field
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      // a margin round the mask keeps the normals clean at the edge
      if (j.mask[i] === 0 && !(x > 0 && j.mask[i - 1]) && !(x < w - 1 && j.mask[i + 1]) && !(y > 0 && j.mask[i - w]) && !(y < h - 1 && j.mask[i + w])) continue;
      let u = x;
      let v = y;
      if (j.uv) {
        j.uv(x, y, uv);
        u = uv[0];
        v = uv[1];
      }
      let H = j.form(x, y);
      const fw = j.flesh ? clamp01(j.flesh(x, y, u, v)) : 0;
      fleshW[i] = fw;
      if (fw < 1) {
        // warp the plate space a little, so plate edges wander and break like stone, not a polygon net
        const wu = u + (tab(T, u * kWarp + 71, v * kWarp + 3) - 0.5) * warp;
        const wv = v + (tab(T, u * kWarp + 151, v * kWarp + 89) - 0.5) * warp;
        grid.near(wu, wv, near);
        if (near.i1 >= 0) {
          const p = j.plates[near.i1];
          let d = 99;
          if (near.i2 >= 0) {
            const q = j.plates[near.i2];
            const sx = q.x - p.x;
            const sy = q.y - near.w2 + near.w1 - p.y;
            const sl = Math.hypot(sx, sy) || 1;
            d = ((near.d2 - near.d1) / (2 * sl)) / uvs;
            edgeDir[i] = sy / sl;
            // chipped edges
            d += (tab(T, u * kChip + 19, v * kChip + 37) - 0.5) * chip;
          }
          edgeD[i] = d;
          plateId[i] = near.i1;
          const b = Math.min(1, Math.max(0, d - crev) / bev);
          const prof = b * b * (3 - 2 * b);
          const lu = u - p.x;
          const lv = v + near.w1 - p.y;
          // each slab's own uneven, pitted face
          const lump = (tab(T, u * kLump + p.x * 0.37 + 11, v * kLump + p.y * 0.29 + 5) - 0.5) * lumpA;
          const pits = (tab(T, u * kPit + 31, v * kPit) - 0.5) * (1 + p.wear * 3);
          const hp = prof * (relief + p.lift + (p.tx * lu + p.ty * lv) / uvs + (shingle * lv) / uvs + lump + pits);
          H += hp * (1 - fw);
        }
      }
      if (fw > 0 && j.ribs) H += j.ribs(x, y, u, v) * fw;
      height[i] = H;
    }
  }
  // shade
  const img = ctx.createImageData(w, h);
  const D = img.data;
  const fk = j.formK ?? 1;
  const exp = j.exposure ?? 1;
  const rimK = j.rim ?? 1;
  const gloss = j.gloss ?? 0.5;
  const creC = hexRGB(STONE.crevice);
  const salt = hexRGB(STONE.salt);
  const fp = hexRGB(FLESH.pale);
  const fm = hexRGB(FLESH.mid);
  const fs = hexRGB(FLESH.shade);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const m = j.mask[i];
      if (m === 0) continue;
      const hx0 = x > 0 && (j.mask[i - 1] || plateId[i - 1] >= 0) ? height[i - 1] : height[i];
      const hx1 = x < w - 1 && (j.mask[i + 1] || plateId[i + 1] >= 0) ? height[i + 1] : height[i];
      const hy0 = y > 0 && (j.mask[i - w] || plateId[i - w] >= 0) ? height[i - w] : height[i];
      const hy1 = y < h - 1 && (j.mask[i + w] || plateId[i + w] >= 0) ? height[i + w] : height[i];
      let nx = -(hx1 - hx0) * 0.5 * fk;
      let ny = -(hy1 - hy0) * 0.5 * fk;
      let nz = 1;
      const nl = Math.hypot(nx, ny, nz);
      nx /= nl;
      ny /= nl;
      nz /= nl;
      const fw = fleshW[i];
      const pid = plateId[i];
      let r: number;
      let g: number;
      let b: number;
      let wet = 0.2;
      let ao = 1;
      let rough = 0;
      if (pid >= 0 && fw < 1) {
        const p = j.plates[pid];
        const d = edgeD[i];
        [r, g, b] = p.c;
        // weathering: pale bleached faces, dark pitting
        let u = x;
        let v = y;
        if (j.uv) {
          j.uv(x, y, uv);
          u = uv[0];
          v = uv[1];
        }
        const n1 = tab(T, u * kTone + 101, v * kTone + 7);
        // mottled, and grimy towards its edges
        const tone = (0.78 + n1 * 0.44) * (0.8 + 0.2 * smooth(crev, crev + bev * 2.5, d));
        r *= tone;
        g *= tone;
        b *= tone;
        // lichen on the plates that have it, in crusty patches
        if (p.lichen > 0) {
          const ln = tab(T, u * kLich + 57, v * kLich + 133);
          const lw = smooth(0.62 - p.lichen * 0.2, 0.7 - p.lichen * 0.2, ln) * (0.5 + 0.5 * Math.max(0, -ny + 0.3));
          if (lw > 0) {
            const spot = 0.85 + tab(T, u * kSpot + 13, v * kSpot + 191) * 0.3;
            r += (p.lichenC[0] * spot - r) * lw;
            g += (p.lichenC[1] * spot - g) * lw;
            b += (p.lichenC[2] * spot - b) * lw;
            rough = lw;
          }
        }
        // crevices: dark, salt crusted along their lips
        if (d < crev + 3.2) {
          const sn = tab(T, u * kSalt + 211, v * kSalt + 77);
          const sw = smooth(0.55, 0.75, sn) * smooth(crev + 3.2, crev + 0.6, d) * (d > crev * 0.5 ? 1 : 0.3);
          r += (salt[0] - r) * sw * 0.8;
          g += (salt[1] - g) * sw * 0.8;
          b += (salt[2] - b) * sw * 0.8;
          rough = Math.max(rough, sw);
        }
        // overlapping plates: under a plate's lower lip the next one lies in its shadow (wide, soft); a plate's own
        // lower lip catches the light; along the sides only a thin dark seam
        const ed = edgeDir[i];
        const under = smooth(-0.2, -0.7, ed);
        const lip = smooth(0.2, 0.7, ed);
        ao = 1 - (1 - smooth(0, crev + 2 + under * 8, d)) * (0.25 + under * 0.45) * (1 - lip * 0.5);
        if (d < crev * 0.7) {
          const k = (d / (crev * 0.7)) * 0.7;
          r = creC[0] + (r - creC[0]) * k;
          g = creC[1] + (g - creC[1]) * k;
          b = creC[2] + (b - creC[2]) * k;
        }
        wet = p.wet * (1 - rough);
      } else {
        r = g = b = 0;
      }
      if (fw > 0) {
        // pale flesh: shadows go violet, a little warm in the light
        const t = clamp01(0.5 + ny * -0.6);
        const fr = fs[0] + (fp[0] - fs[0]) * (0.55 + t * 0.45);
        const fg = fs[1] + (fp[1] - fs[1]) * (0.55 + t * 0.45);
        const fb = fs[2] + (fp[2] - fs[2]) * (0.55 + t * 0.45);
        const mm = 0.25 * (1 - t);
        r = r * (1 - fw) + (fr * (1 - mm) + fm[0] * mm) * fw;
        g = g * (1 - fw) + (fg * (1 - mm) + fm[1] * mm) * fw;
        b = b * (1 - fw) + (fb * (1 - mm) + fm[2] * mm) * fw;
        wet = wet * (1 - fw) + 0.35 * fw;
        ao = ao * (1 - fw) + fw;
      }
      // light
      const ndl = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
      const amb = 0.26 + 0.14 * (-ny * 0.5 + 0.5);
      const rimT = Math.pow(1 - nz, 1.6) * Math.max(0, nx * 0.75 + ny * 0.55) * rimK;
      const ndh = Math.max(0, nx * HV[0] + ny * HV[1] + nz * HV[2]);
      const spec = (Math.pow(ndh, 18) * 0.3 + Math.pow(ndh, 90) * 0.8) * wet * (fw > 0 ? 1 : gloss);
      let wd = 0;
      if (j.wetDark) wd = j.wetDark(x, y);
      const kd = exp * ao * (1 - wd * 0.45);
      let R = (r / 255) * (FILL[0] / 255 * amb + SUN[0] / 255 * ndl * 1.2) * 255 * kd + RIM[0] * rimT * 0.55 + SUN[0] * spec * ao;
      let G = (g / 255) * (FILL[1] / 255 * amb + SUN[1] / 255 * ndl * 1.2) * 255 * kd + RIM[1] * rimT * 0.55 + SUN[1] * spec * ao;
      let B = (b / 255) * (FILL[2] / 255 * amb + SUN[2] / 255 * ndl * 1.2) * 255 * kd + RIM[2] * rimT * 0.55 + SUN[2] * spec * ao;
      if (wd > 0) {
        R += 6 * wd;
        G += 8 * wd;
        B += 18 * wd;
      }
      D[i * 4] = R;
      D[i * 4 + 1] = G;
      D[i * 4 + 2] = B;
      D[i * 4 + 3] = m;
    }
  }
  // compose (putImageData ignores the transform: go through a canvas)
  const [c, g] = makeCanvas(w, h);
  g.putImageData(img, 0, 0);
  ctx.drawImage(c, 0, 0);
}

/** The coverage mask of a path (filled white on a w × h canvas). */
export function maskOf(w: number, h: number, draw: (c: Ctx) => void): Uint8ClampedArray {
  const [, g] = makeCanvas(w, h);
  g.fillStyle = '#fff';
  draw(g);
  const d = g.getImageData(0, 0, w, h).data;
  const out = new Uint8ClampedArray(w * h);
  for (let i = 0; i < out.length; i++) out[i] = d[i * 4 + 3];
  return out;
}

/** A smooth bump: height `a` at (x0, y0), falling off over radii rx, ry. */
export function bump(x: number, y: number, x0: number, y0: number, rx: number, ry: number, a: number): number {
  const dx = (x - x0) / rx;
  const dy = (y - y0) / ry;
  const d = dx * dx + dy * dy;
  return d >= 1 ? 0 : a * (1 - d) * (1 - d);
}
