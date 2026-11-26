// The gem peels: the jewellery box (Sterling Silver, Solid Gold, Ruby Crown, Sapphire Tide, Emerald Isle, Amethyst
// Dream, Pearl Diver, Chef’s Diamond), their mastered versions and the ultra-rare jewels (Rose Gold, Platinum Prop,
// Fire Opal, Golden Feather, Prismatic, Black Diamond, Crown Jewel, Cosmic Crust), a crafted kind, 'gem'
// (src/art/peelCraft.ts). Each keeps its peel's shape, colours and studs and is made of what it is named for:
//
// - cut stones (ruby, sapphire, emerald, amethyst, diamond, Prismatic, Black Diamond, and the stones set in Rose Gold,
//   Platinum Prop and the Crown Jewel): the head is the stone, held in a polished metal bezel. Its facets are real
//   geometry (a brilliant's table, stars, kites and upper girdles fitted to the head's outline; an emerald's steps),
//   each lit as a tilted mirror by a light that wanders round the top left: as it moves, and as the peel is swung,
//   facets flash in turn, light breaks inside the stone (scintillation), and in the diamonds it breaks into colour
//   (fire). Each stone has its own life: the sapphire's silk shimmering into a soft star, the ruby's red glow, the
//   emerald's garden and its hall of mirrors, the amethyst's colour zoning flushing warm, Prismatic's rainbows.
// - metals (Sterling Silver, Solid Gold, Rose Gold, Platinum Prop, Golden Feather): polished plate, bright-cut into
//   facets that swap light and dark as the light moves, with an engine-turned centre, a brushed field with a circuit of
//   pavé diamonds, or a feather in relief whose barbs catch a sheen.
// - the Pearl: nacre, its orient (pink and green) sliding round the highlight as the light moves.
// - the Fire Opal: play of colour, patches flashing green, blue, violet and red as the light turns (and its fire).
// - Cosmic Crust: a polished dome with a galaxy turning slowly in it, nebulae drifting, stars twinkling.
// - the Crown Jewel: a great cushion-cut stone on purple velvet, ringed with diamonds.
//
// A smack sends a ring of light out through the facets (every facet it crosses flares, the diamonds' in colour), the
// metal chimes (a quick hum), the studs light from the top out, and glints and motes of the stone's colour are thrown
// off. The ultra-rares do more: every few seconds a slow bloom of light runs through them and a glint drifts off.
//
// Built as the batch-1 materials are (one rig per peel per detail, built in idle time, shared): the head's static
// layers (the stone or plate at rest, the band, the studs) are painted once, a few layers that move (silk, opal
// patches, nebulae, the feather's lit barbs) once per rig detail; each frame only what moves is drawn between them
// (vector facets, a few gradients and draws). Everything cosmetic uses crand().

import { PEEL_HEAD, headPath, type PeelLook, type PeelShape } from './peelArt';
import { windowBars } from './peelCraftArt';
import { studSpots } from './peelPlace';
import { INK } from './feetCommon';
import { ellipse, hashStr, makeCanvas, mix, rgba, rng, shade, type Ctx } from './util';
import { crand } from '../systems/cosmeticRandom';
import { save } from '../systems/save';
import { noise1 } from '../game/liveKit';

const { x: HX, y: HY, r: R } = PEEL_HEAD;
type Pt = [number, number];
const TAU = Math.PI * 2;
/** Where the light sits at rest: the top left, as everywhere in the game. */
const L0 = -2.36;

// ════════════════════════════ what each is made of ════════════════════════════

interface Metal {
  hi: string;
  mid: string;
  lo: string;
  deep: string;
}
const GOLD: Metal = { hi: '#fff6cc', mid: '#f0bf3e', lo: '#a8740e', deep: '#4a3004' };
const SILVER: Metal = { hi: '#ffffff', mid: '#cdd3dc', lo: '#7e8898', deep: '#363c48' };
const PLAT: Metal = { hi: '#ffffff', mid: '#e0e5ec', lo: '#9aa4b2', deep: '#46505e' };
const ROSE: Metal = { hi: '#ffece4', mid: '#eaa892', lo: '#a85e4c', deep: '#4e2218' };
const BLACK: Metal = { hi: '#b4aec8', mid: '#4e4860', lo: '#25212e', deep: '#0c0a12' };
const NIGHT: Metal = { hi: '#c4b4ff', mid: '#54449a', lo: '#2a1f5a', deep: '#0e0a26' };

interface Stone {
  cut: 'brilliant' | 'step';
  /** Light, mid and deep body colours. */
  body: [string, string, string];
  /** What light breaking inside it shows as (white in a diamond, its own colour in a coloured stone). */
  flash: string;
  /** Dispersion: how much of the flashing light breaks into colour. */
  fire: number;
  /** How bright its facets flash (lustre). */
  spec: number;
  /** How dark the facets facing away go (contrast). */
  dark: number;
}
const RUBY: Stone = { cut: 'brilliant', body: ['#ff7088', '#cc0c2c', '#3e000c'], flash: '#ff6a86', fire: 0.12, spec: 1, dark: 0.4 };
const SAPPHIRE: Stone = { cut: 'brilliant', body: ['#82b8ff', '#1f50c0', '#06184a'], flash: '#8ac4ff', fire: 0.12, spec: 1, dark: 0.4 };
const EMERALD: Stone = { cut: 'step', body: ['#86f0b0', '#12884a', '#022c14'], flash: '#9affc4', fire: 0.06, spec: 1, dark: 0.36 };
const AMETHYST: Stone = { cut: 'brilliant', body: ['#dcb0ff', '#7a3ac8', '#24084a'], flash: '#e8c8ff', fire: 0.18, spec: 1, dark: 0.38 };
const DIAMOND: Stone = { cut: 'brilliant', body: ['#ffffff', '#cfe6f2', '#36546c'], flash: '#ffffff', fire: 0.95, spec: 1.15, dark: 0.7 };
const PINK: Stone = { cut: 'brilliant', body: ['#ffe0e8', '#f294b0', '#8a2a4a'], flash: '#ffd0de', fire: 0.6, spec: 1.1, dark: 0.45 };
const ASSCHER: Stone = { cut: 'step', body: ['#ffffff', '#dcecf6', '#7a98b0'], flash: '#ffffff', fire: 0.8, spec: 1.15, dark: 0.45 };
const CROWN: Stone = { cut: 'brilliant', body: ['#ff86a4', '#e0123e', '#4a0012'], flash: '#ff7a9a', fire: 0.25, spec: 1.1, dark: 0.42 };
const PRISM: Stone = { cut: 'brilliant', body: ['#ffffff', '#e8e4f4', '#6a6090'], flash: '#ffffff', fire: 1.6, spec: 1.2, dark: 0.55 };
const BLACKD: Stone = { cut: 'brilliant', body: ['#5c5270', '#1c1824', '#040306'], flash: '#e4dcff', fire: 0.22, spec: 1.9, dark: 0.1 };

/** What a smack throws besides glints. */
export type GemMote = 'fire' | 'red' | 'blue' | 'green' | 'violet' | 'gold' | 'white';

interface GemDef {
  form: 'stone' | 'plate' | 'pearl' | 'opal' | 'cosmic' | 'velvet';
  metal: Metal;
  stone?: Stone;
  /** A stone set in the middle of a plate or the velvet: its radius, its outline and its claws. */
  centre?: { r: number; stone: Stone; outline: 'round' | 'cushion' | 'square'; claws: number };
  engrave?: 'guilloche' | 'circuit' | 'feather';
  silk?: boolean;
  garden?: boolean;
  glow?: string;
  zoning?: boolean;
  rainbow?: boolean;
  studs: 'stone' | 'bead' | 'pearl';
  mote: GemMote;
  ultra?: boolean;
}

const GEMS: Record<string, GemDef> = {
  silver: { form: 'plate', metal: SILVER, engrave: 'guilloche', studs: 'stone', mote: 'white' },
  gold: { form: 'plate', metal: GOLD, engrave: 'guilloche', studs: 'bead', mote: 'gold' },
  ruby: { form: 'stone', metal: GOLD, stone: RUBY, glow: '#ff2a4a', studs: 'bead', mote: 'red' },
  sapphire: { form: 'stone', metal: PLAT, stone: SAPPHIRE, silk: true, studs: 'stone', mote: 'blue' },
  emerald: { form: 'stone', metal: GOLD, stone: EMERALD, garden: true, studs: 'bead', mote: 'green' },
  amethyst: { form: 'stone', metal: SILVER, stone: AMETHYST, zoning: true, studs: 'stone', mote: 'violet' },
  pearl: { form: 'pearl', metal: SILVER, studs: 'pearl', mote: 'white' },
  diamond: { form: 'stone', metal: PLAT, stone: DIAMOND, studs: 'stone', mote: 'fire' },
  rosegold: { form: 'plate', metal: ROSE, centre: { r: 27, stone: PINK, outline: 'round', claws: 6 }, studs: 'stone', mote: 'fire', ultra: true },
  platinum: { form: 'plate', metal: PLAT, engrave: 'circuit', centre: { r: 25, stone: ASSCHER, outline: 'square', claws: 4 }, studs: 'stone', mote: 'fire', ultra: true },
  opal: { form: 'opal', metal: GOLD, studs: 'stone', mote: 'fire', ultra: true },
  goldfeather: { form: 'plate', metal: GOLD, engrave: 'feather', studs: 'bead', mote: 'gold', ultra: true },
  prism: { form: 'stone', metal: PLAT, stone: PRISM, rainbow: true, studs: 'stone', mote: 'fire', ultra: true },
  blackdiamond: { form: 'stone', metal: BLACK, stone: BLACKD, studs: 'stone', mote: 'violet', ultra: true },
  crownjewel: { form: 'velvet', metal: GOLD, centre: { r: 33, stone: CROWN, outline: 'cushion', claws: 4 }, studs: 'bead', mote: 'red', ultra: true },
  cosmic: { form: 'cosmic', metal: NIGHT, studs: 'stone', mote: 'violet', ultra: true },
};

/** The gem ids (the jewellery box's and the ultra-rares' own ids, without 'ultra:'). */
export const GEM_IDS = Object.keys(GEMS);

const isMaster = (look: PeelLook) => look.seed.startsWith('master:');
function defOf(look: PeelLook): GemDef {
  const d = GEMS[look.jewel ?? ''] ?? GEMS.silver;
  // a mastered jewel: gold-set (a plate keeps its own metal: the band round it turns gold)
  return isMaster(look) ? { ...d, studs: d.studs === 'pearl' ? 'pearl' : 'bead' } : d;
}
const bandMetal = (look: PeelLook, d: GemDef): Metal => (isMaster(look) ? GOLD : d.metal);

// ════════════════════════════ geometry ════════════════════════════

/** Angles the outline is sampled at. */
const N = 96;
const angOf = (k: number) => -Math.PI + (TAU * k) / N;

interface Facet {
  pts: Pt[];
  /** Its inner part (where fire shows), shrunk about its middle. */
  inner: Pt[];
  cx: number;
  cy: number;
  /** Which way it faces (azimuth, radians) and how far it tilts from facing out of the head. */
  az: number;
  tilt: number;
  /** How far out it is (0 the middle, 1 the girdle) and its own phase. */
  d: number;
  ph: number;
  i: number;
}

export interface Geo {
  c: Pt;
  rad: Float32Array;
  girdle: Pt[];
  facets: Facet[];
  /** The table (a brilliant's octagon, a step cut's middle). */
  table: Pt[];
  /** A mean radius, and the box round the girdle. */
  r0: number;
  box: { x: number; y: number; w: number; h: number };
  cut: 'brilliant' | 'step' | 'none';
}

const CENTRE: Record<PeelShape, Pt> = { round: [HX, HY - 2], oval: [HX, HY - 2], square: [HX, HY - 4], paddle: [HX, HY - 8], spade: [HX, HY + 4] };
/** The band round the stone (peel units): wide enough for the studs to sit on. */
const BAND = 17;

let probe: Ctx | null = null;
function inHead(shape: PeelShape, x: number, y: number, m: number): boolean {
  probe ??= makeCanvas(1, 1)[1];
  headPath(probe, shape);
  if (!probe.isPointInPath(x, y)) return false;
  for (let k = 0; k < 12; k++) {
    const a = (k * TAU) / 12;
    if (!probe.isPointInPath(x + Math.cos(a) * m, y + Math.sin(a) * m)) return false;
  }
  return true;
}

function radAt(rad: Float32Array, a: number): number {
  let u = ((a + Math.PI) / TAU) * N;
  u = ((u % N) + N) % N;
  const i = Math.floor(u);
  const f = u - i;
  return rad[i] * (1 - f) + rad[(i + 1) % N] * f;
}

/** The head's outline set in by `inset` (peel units), as radii from `c`, the neck smoothed over. */
function headRadii(shape: PeelShape, c: Pt, inset: number): Float32Array {
  const rad = new Float32Array(N);
  for (let k = 0; k < N; k++) {
    const a = angOf(k);
    let lo = 0;
    let hi = 140;
    for (let it = 0; it < 15; it++) {
      const m = (lo + hi) / 2;
      if (inHead(shape, c[0] + Math.cos(a) * m, c[1] + Math.sin(a) * m, inset)) lo = m;
      else hi = m;
    }
    rad[k] = lo;
  }
  // the neck: straight down the head runs on into the handle; bridge it (a flat edge on the square head, a curve on
  // the rest)
  const W = 0.55;
  const k1 = Math.floor(((Math.PI / 2 - W + Math.PI) / TAU) * N);
  const k2 = Math.ceil(((Math.PI / 2 + W + Math.PI) / TAU) * N);
  const a1 = angOf(k1);
  const a2 = angOf(k2);
  const p1: Pt = [c[0] + Math.cos(a1) * rad[k1], c[1] + Math.sin(a1) * rad[k1]];
  const p2: Pt = [c[0] + Math.cos(a2) * rad[k2], c[1] + Math.sin(a2) * rad[k2]];
  for (let k = k1 + 1; k < k2; k++) {
    const a = angOf(k);
    if (shape === 'square') {
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      const ex = p2[0] - p1[0];
      const ey = p2[1] - p1[1];
      const den = dx * ey - dy * ex;
      rad[k] = ((p1[0] - c[0]) * ey - (p1[1] - c[1]) * ex) / den;
    } else {
      const u = (k - k1) / (k2 - k1);
      const s = u * u * (3 - 2 * u);
      rad[k] = rad[k1] + (rad[k2] - rad[k1]) * s;
    }
  }
  for (let pass = 0; pass < 2; pass++) {
    const src = rad.slice();
    for (let k = 0; k < N; k++) rad[k] = (src[(k + N - 1) % N] + src[k] * 2 + src[(k + 1) % N]) / 4;
  }
  return rad;
}

/** A small stone's outline as radii: round, a cushion or a square with soft corners. */
function shapeRadii(r: number, outline: 'round' | 'cushion' | 'square'): Float32Array {
  const rad = new Float32Array(N);
  const n = outline === 'round' ? 2 : outline === 'cushion' ? 3.2 : 7;
  for (let k = 0; k < N; k++) {
    const a = angOf(k);
    rad[k] = r / Math.pow(Math.pow(Math.abs(Math.cos(a)), n) + Math.pow(Math.abs(Math.sin(a)), n), 1 / n);
  }
  return rad;
}

function shrink(pts: Pt[], k: number): Pt[] {
  let cx = 0;
  let cy = 0;
  for (const [x, y] of pts) {
    cx += x;
    cy += y;
  }
  cx /= pts.length;
  cy /= pts.length;
  return pts.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k] as Pt);
}

function makeGeo(c: Pt, rad: Float32Array, cut: Geo['cut'], seed: string): Geo {
  const r = rng(hashStr(`gem:${seed}`));
  const P = (a: number, k: number): Pt => [c[0] + Math.cos(a) * radAt(rad, a) * k, c[1] + Math.sin(a) * radAt(rad, a) * k];
  const girdle: Pt[] = [];
  for (let k = 0; k < N; k++) girdle.push(P(angOf(k), 1));
  const facets: Facet[] = [];
  let table: Pt[] = [];
  const add = (pts: Pt[], az: number, tilt: number) => {
    let cx = 0;
    let cy = 0;
    for (const [x, y] of pts) {
      cx += x;
      cy += y;
    }
    cx /= pts.length;
    cy /= pts.length;
    const d = Math.min(1, Math.hypot(cx - c[0], cy - c[1]) / Math.max(1, radAt(rad, Math.atan2(cy - c[1], cx - c[0]))));
    facets.push({ pts, inner: shrink(pts, 0.5), cx, cy, az, tilt, d, ph: r() * TAU, i: facets.length });
  };
  const arc = (a0: number, a1: number, k: number, steps: number): Pt[] => Array.from({ length: steps + 1 }, (_, i) => P(a0 + ((a1 - a0) * i) / steps, k));
  if (cut === 'brilliant') {
    const M = 8;
    const a0 = -Math.PI / 2;
    const st = TAU / M;
    const T = (i: number) => P(a0 + i * st, 0.5);
    const S = (i: number) => P(a0 + (i + 0.5) * st, 0.8);
    table = Array.from({ length: M }, (_, i) => T(i));
    add(table, 0, 0);
    for (let i = 0; i < M; i++) {
      const ai = a0 + i * st;
      add([T(i), T(i + 1), S(i)], ai + st / 2, 0.3);
      add([T(i), S(i - 1), P(ai, 1), S(i)], ai, 0.56);
      add([S(i), ...arc(ai, ai + st / 2, 1, 5)], ai + st / 4, 0.8);
      add([S(i), ...arc(ai + st / 2, ai + st, 1, 5)], ai + (3 * st) / 4, 0.8);
    }
  } else if (cut === 'step') {
    const ks = [1, 0.82, 0.65, 0.5];
    const tilts = [0.78, 0.55, 0.34];
    const sides: [number, number, number][] = [
      [-0.75 * Math.PI, -0.25 * Math.PI, -Math.PI / 2],
      [-0.25 * Math.PI, 0.25 * Math.PI, 0],
      [0.25 * Math.PI, 0.75 * Math.PI, Math.PI / 2],
      [0.75 * Math.PI, 1.25 * Math.PI, Math.PI],
    ];
    for (let j = 0; j < 3; j++)
      for (const [s0, s1, az] of sides) {
        const outer = arc(s0, s1, ks[j], 10);
        const inner = arc(s0, s1, ks[j + 1], 10).reverse();
        add([...outer, ...inner], az, tilts[j]);
      }
    table = arc(-Math.PI, Math.PI, 0.5, 32).slice(0, 32);
    add(table, 0, 0);
  }
  let x0 = 1e9;
  let y0 = 1e9;
  let x1 = -1e9;
  let y1 = -1e9;
  let sum = 0;
  for (const [x, y] of girdle) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  for (let k = 0; k < N; k++) sum += rad[k];
  return { c, rad, girdle, facets, table, r0: sum / N, box: { x: x0 - 2, y: y0 - 2, w: x1 - x0 + 4, h: y1 - y0 + 4 }, cut };
}

const geoCache = new Map<string, Geo>();
/** The head's stone (or plate) for a jewel: inside the band. */
function headGeo(look: PeelLook, d: GemDef): Geo {
  const cut: Geo['cut'] = d.form === 'stone' ? d.stone!.cut : d.form === 'plate' && d.engrave === 'guilloche' ? 'brilliant' : d.form === 'plate' && d.centre && !d.engrave ? 'brilliant' : 'none';
  const k = `${look.shape}:${cut}:${look.jewel}`;
  let g = geoCache.get(k);
  if (!g) geoCache.set(k, (g = makeGeo(CENTRE[look.shape], headRadii(look.shape, CENTRE[look.shape], BAND), cut, k)));
  return g;
}
/** A stone set in the middle (Rose Gold, Platinum Prop, the Crown Jewel). */
function centreGeo(look: PeelLook, d: GemDef): Geo | null {
  if (!d.centre) return null;
  const k = `centre:${look.shape}:${look.jewel}`;
  let g = geoCache.get(k);
  const c = CENTRE[look.shape];
  if (!g) geoCache.set(k, (g = makeGeo([c[0], c[1] + (d.form === 'velvet' ? -2 : 0)], shapeRadii(d.centre.r, d.centre.outline), d.centre.stone.cut, k)));
  return g;
}

function polyPath(ctx: Ctx, pts: Pt[], begin = true): void {
  if (begin) ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}

// ——— the Crown Jewel's ring of stones, Platinum Prop's circuit, the Golden Feather ———

interface Ring {
  pts: [number, number, number][];
}
function crownRing(look: PeelLook, g: Geo): Ring {
  const c = g.c;
  const pts: [number, number, number][] = [];
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / n) * TAU;
    const rr = radAt(g.rad, a) - 12;
    if (rr < 40) continue;
    pts.push([c[0] + Math.cos(a) * rr, c[1] - 2 + Math.sin(a) * rr, i % 2 ? 5.2 : 6.4]);
  }
  void look;
  return { pts };
}

interface Trace {
  pts: Pt[];
  len: number;
}
const DIRS: Pt[] = [[1, 0], [Math.SQRT1_2, Math.SQRT1_2], [0, 1], [-Math.SQRT1_2, Math.SQRT1_2], [-1, 0], [-Math.SQRT1_2, -Math.SQRT1_2], [0, -1], [Math.SQRT1_2, -Math.SQRT1_2]];
const traceCache = new Map<string, Trace[]>();
/** Platinum Prop's circuit: traces leaving the centre stone's collet in 45° turns, a pavé diamond at each end. */
function circuit(look: PeelLook, g: Geo, cr: number): Trace[] {
  const k = `${look.shape}:${look.jewel}`;
  const have = traceCache.get(k);
  if (have) return have;
  const r = rng(hashStr('gem:circuit'));
  const [cx, cy] = g.c;
  const taken: Pt[] = [];
  const near = (x: number, y: number, d: number) => taken.some(([a, b]) => Math.hypot(a - x, b - y) < d);
  const fits = (x: number, y: number) => Math.hypot(x - cx, y - cy) < radAt(g.rad, Math.atan2(y - cy, x - cx)) - 9;
  const out: Trace[] = [];
  const starts: [number, number, number][] = [];
  const e = cr + 7;
  for (const t of [-0.45, 0.45]) {
    starts.push([cx + e, cy + t * e, 0], [cx - e, cy + t * e, 4], [cx + t * e, cy - e, 6], [cx + t * e, cy + e, 2]);
  }
  for (const [x0, y0, d0] of starts) {
    for (let attempt = 0; attempt < 40; attempt++) {
      const turn = r() < 0.5 ? 1 : -1;
      const legs: [number, number][] = [[d0, 5 + r() * 10], [(d0 + turn + 8) % 8, 10 + r() * 22]];
      if (r() < 0.7) legs.push([r() < 0.6 ? d0 : (d0 + turn * 2 + 8) % 8, 6 + r() * 18]);
      const pts: Pt[] = [[x0, y0]];
      let x = x0;
      let y = y0;
      let ok = true;
      const samples: Pt[] = [];
      for (const [di, len] of legs) {
        const [dx, dy] = DIRS[di];
        for (let s = 3; s <= len; s += 3) {
          const sx = x + dx * s;
          const sy = y + dy * s;
          if (!fits(sx, sy) || near(sx, sy, 7) || Math.hypot(sx - cx, sy - cy) < cr + 5) ok = false;
          samples.push([sx, sy]);
        }
        if (!ok) break;
        x += dx * len;
        y += dy * len;
        pts.push([x, y]);
      }
      if (!ok) continue;
      let len = 0;
      for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      out.push({ pts, len });
      taken.push(...samples);
      break;
    }
  }
  traceCache.set(k, out);
  return out;
}

interface Barb {
  a: Pt;
  b: Pt;
  c: Pt;
}
/** The Golden Feather's feather: a curved shaft (rachis) and its barbs either side, in peel units. */
function featherGeo(g: Geo): { shaft: Pt[]; barbs: Barb[]; vane: Pt[] } {
  const [cx, cy] = g.c;
  const r = rng(hashStr('gem:feather'));
  const shaft: Pt[] = [];
  const n = 24;
  // from low left to high right, bowed
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const x = cx - 40 + 82 * u + Math.sin(u * Math.PI) * -10;
    const y = cy + 56 - 116 * u + Math.sin(u * Math.PI) * -8;
    shaft.push([x, y]);
  }
  const barbs: Barb[] = [];
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 3; i <= n; i++) {
    const u = i / n;
    const [x, y] = shaft[i];
    const [px, py] = shaft[i - 1];
    const tx = x - px;
    const ty = y - py;
    const tl = Math.hypot(tx, ty) || 1;
    const nx = -ty / tl;
    const ny = tx / tl;
    // the vane is widest a little above the middle and tapers to the tip
    const w = 30 * Math.pow(Math.sin(Math.PI * Math.min(1, (u - 0.08) / 0.98)), 0.7) * (0.92 + r() * 0.16);
    for (const s of [-1, 1]) {
      const sweep = 0.55;
      const ex = x + (nx * s + (tx / tl) * sweep) * w;
      const ey = y + (ny * s + (ty / tl) * sweep) * w;
      const mx = x + nx * s * w * 0.55 + (tx / tl) * w * 0.12;
      const my = y + ny * s * w * 0.55 + (ty / tl) * w * 0.12;
      barbs.push({ a: [x, y], b: [mx, my], c: [ex, ey] });
      (s < 0 ? left : right).push([ex, ey]);
    }
  }
  const vane = [shaft[3], ...left, shaft[n], ...right.reverse()];
  return { shaft, barbs, vane };
}

// ════════════════════════════ painting the parts ════════════════════════════

function dab(ctx: Ctx, x: number, y: number, r: number, col: string, a: number, sy = 1, rot = 0): void {
  if (a <= 0.004 || r <= 0.1) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(1, sy);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, rgba(col, a));
  g.addColorStop(0.5, rgba(col, a * 0.5));
  g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.restore();
}

function girdlePath(ctx: Ctx, g: Geo, begin = true): void {
  polyPath(ctx, g.girdle, begin);
}

/** How a facet faces the light at rest (-1 away … 1 towards). */
const facing = (f: Facet, L = L0) => Math.cos(f.az - L) * Math.sin(f.tilt);

/** A cut stone at rest: its body, each facet's tone (the pavilion behind it), what shows through the table, the facet
 *  edges. Lit from the top left. */
function stoneBase(ctx: Ctx, g: Geo, st: Stone): void {
  const [cx, cy] = g.c;
  const rr = g.r0;
  ctx.save();
  girdlePath(ctx, g);
  ctx.clip();
  const bg = ctx.createRadialGradient(cx - rr * 0.2, cy - rr * 0.24, rr * 0.04, cx, cy, rr * 1.06);
  bg.addColorStop(0, st.body[0]);
  bg.addColorStop(0.45, st.body[1]);
  bg.addColorStop(1, st.body[2]);
  ctx.fillStyle = bg;
  ctx.fillRect(g.box.x, g.box.y, g.box.w, g.box.h);
  for (const f of g.facets) {
    if (f.tilt === 0) continue;
    // (a step cut's steps alternate light and dark, band by band: its hall of mirrors)
    const alt = g.cut === 'step' ? (f.tilt === 0.55 ? -0.3 : 0.18) : f.i % 2 ? 0.1 : -0.1;
    const v = facing(f) * 0.62 + alt + Math.sin(f.ph) * 0.12;
    polyPath(ctx, f.pts);
    ctx.fillStyle = v > 0 ? rgba(st.body[0], Math.min(0.7, v * 0.6)) : rgba(st.body[2], Math.min(0.8, -v * 0.75));
    ctx.fill();
  }
  if (g.cut === 'brilliant') {
    // through the table: the pavilion's mains, dark arrows from the middle, light between
    const t = g.table;
    for (let i = 0; i < t.length; i++) {
      const [ax, ay] = t[i];
      const [bx, by] = t[(i + 1) % t.length];
      const mx = (ax + bx) / 2;
      const my = (ay + by) / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(ax + (mx - ax) * 0.45, ay + (my - ay) * 0.45);
      ctx.lineTo(mx, my);
      ctx.lineTo(bx + (mx - bx) * 0.45, by + (my - by) * 0.45);
      ctx.closePath();
      ctx.fillStyle = rgba(st.body[2], 0.3 + (i % 2) * 0.12);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(ax, ay);
      ctx.strokeStyle = rgba(st.body[0], 0.35);
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }
  } else if (g.cut === 'step') {
    // through the table: the steps reflected (a hall of mirrors), and the corners' diagonals
    for (const [k, a] of [[0.36, 0.5], [0.24, 0.42], [0.13, 0.36]] as [number, number][]) {
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const an = angOf(i);
        const x = cx + Math.cos(an) * radAt(g.rad, an) * k;
        const y = cy + Math.sin(an) * radAt(g.rad, an) * k;
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = rgba(st.body[2], a);
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.strokeStyle = rgba(st.body[0], a * 0.8);
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
    for (const a of [-0.75, -0.25, 0.25, 0.75]) {
      const an = a * Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(an) * 4, cy + Math.sin(an) * 4);
      ctx.lineTo(cx + Math.cos(an) * radAt(g.rad, an), cy + Math.sin(an) * radAt(g.rad, an));
      ctx.strokeStyle = rgba(st.body[0], 0.32);
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  }
  // the facet edges: fine lit lines with a dark line beside them
  ctx.lineJoin = 'round';
  for (const f of g.facets) {
    polyPath(ctx, f.pts);
    ctx.strokeStyle = rgba(st.body[2], 0.35);
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.strokeStyle = rgba('#ffffff', 0.36);
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }
  ctx.restore();
}

/** Bright-cut metal at rest: each facet a mirror of the room, bright towards the light, dark away. */
const metalTone = (f: Facet, L: number) => Math.max(0, Math.min(1, 0.5 + 1.3 * facing(f, L) + 0.18 * Math.sin(f.ph)));
function plateBase(ctx: Ctx, g: Geo, m: Metal): void {
  const [cx, cy] = g.c;
  const rr = g.r0;
  ctx.save();
  girdlePath(ctx, g);
  ctx.clip();
  const bg = ctx.createLinearGradient(cx - rr, cy - rr, cx + rr, cy + rr);
  bg.addColorStop(0, m.hi);
  bg.addColorStop(0.45, m.mid);
  bg.addColorStop(1, m.lo);
  ctx.fillStyle = bg;
  ctx.fillRect(g.box.x, g.box.y, g.box.w, g.box.h);
  for (const f of g.facets) {
    if (f.tilt === 0) continue;
    const v = metalTone(f, L0);
    polyPath(ctx, f.pts);
    const fg = ctx.createLinearGradient(f.pts[0][0], f.pts[0][1], f.cx, f.cy);
    const c = v > 0.5 ? mix(m.mid, m.hi, (v - 0.5) * 2) : mix(mix(m.lo, m.deep, 0.45), m.mid, v * 2);
    fg.addColorStop(0, shade(c, 0.22));
    fg.addColorStop(1, shade(c, -0.06));
    ctx.fillStyle = fg;
    ctx.fill();
  }
  for (const f of g.facets) {
    polyPath(ctx, f.pts);
    ctx.strokeStyle = rgba('#ffffff', 0.5);
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
  ctx.restore();
}

/** A polished field (no facets): the metal's own gradient, a broad soft bloom top left, a shade bottom right. */
function fieldBase(ctx: Ctx, g: Geo, m: Metal, brushed: boolean): void {
  const [cx, cy] = g.c;
  const rr = g.r0;
  ctx.save();
  girdlePath(ctx, g);
  ctx.clip();
  const bg = ctx.createLinearGradient(cx - rr, cy - rr, cx + rr, cy + rr);
  bg.addColorStop(0, m.hi);
  bg.addColorStop(0.4, m.mid);
  bg.addColorStop(1, m.lo);
  ctx.fillStyle = bg;
  ctx.fillRect(g.box.x, g.box.y, g.box.w, g.box.h);
  dab(ctx, cx - rr * 0.4, cy - rr * 0.45, rr * 0.9, '#ffffff', 0.35, 0.6, -0.7);
  if (brushed) {
    // brushed across: fine lines, uneven
    const r = rng(hashStr('gem:brushed'));
    for (let i = 0; i < 150; i++) {
      const y = g.box.y + r() * g.box.h;
      const x = g.box.x + r() * g.box.w * 0.6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 20 + r() * 60, y + (r() - 0.5) * 0.6);
      ctx.strokeStyle = r() < 0.5 ? rgba('#ffffff', 0.14 + r() * 0.16) : rgba(m.deep, 0.06 + r() * 0.08);
      ctx.lineWidth = 0.5 + r() * 0.5;
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Engine-turned guilloché in a plate's table: wavy rings cut into the metal, lit on one side. */
function guilloche(ctx: Ctx, g: Geo, m: Metal): void {
  const [cx, cy] = g.c;
  ctx.save();
  polyPath(ctx, g.table);
  ctx.clip();
  const tr = g.r0 * 0.5;
  dab(ctx, cx - tr * 0.25, cy - tr * 0.3, tr * 0.9, '#ffffff', 0.35);
  for (let k = 1; k <= 6; k++) {
    const rho = (k / 6.5) * tr;
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const a = (i / 120) * TAU;
      const rr = rho * (1 + 0.035 * Math.sin(a * 8 + k * 0.9));
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.strokeStyle = rgba(m.deep, 0.45);
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.save();
    ctx.translate(-0.6, -0.6);
    ctx.strokeStyle = rgba('#ffffff', 0.6);
    ctx.lineWidth = 0.55;
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

/** Platinum Prop's circuit cut into the brushed platinum: channels with a lit lip, pavé pads. */
function circuitBase(ctx: Ctx, traces: Trace[], m: Metal): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const t of traces) {
    polyline(ctx, t.pts);
    ctx.strokeStyle = rgba(m.deep, 0.55);
    ctx.lineWidth = 3.2;
    ctx.stroke();
    ctx.save();
    ctx.translate(0.7, 0.7);
    polyline(ctx, t.pts);
    ctx.strokeStyle = rgba('#ffffff', 0.7);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
    polyline(ctx, t.pts);
    ctx.strokeStyle = rgba(m.lo, 0.9);
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
}

function polyline(ctx: Ctx, pts: Pt[]): void {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
}

/** A tiny set brilliant (a stud, a pavé stone, a ring stone): its body, a star of facet lines and a glint. */
function smallStone(ctx: Ctx, x: number, y: number, r: number, col: string, setting: Metal | null): void {
  if (setting) {
    ctx.beginPath();
    ctx.arc(x + 0.5, y + 0.8, r + 1.8, 0, TAU);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, r + 1.6, 0, TAU);
    const mg = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    mg.addColorStop(0, setting.hi);
    mg.addColorStop(0.5, setting.mid);
    mg.addColorStop(1, setting.lo);
    ctx.fillStyle = mg;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, 0, x, y, r);
  g.addColorStop(0, shade(col, 0.75));
  g.addColorStop(0.55, col);
  g.addColorStop(1, shade(col, -0.45));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = rgba(shade(col, -0.6), 0.6);
  ctx.lineWidth = Math.max(0.5, r * 0.12);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r * 0.42, y + Math.sin(a) * r * 0.42);
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    ctx.stroke();
  }
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.2;
    if (i) ctx.lineTo(x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.45);
    else ctx.moveTo(x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.45);
  }
  ctx.closePath();
  ctx.strokeStyle = rgba('#ffffff', 0.55);
  ctx.lineWidth = Math.max(0.4, r * 0.08);
  ctx.stroke();
  ellipse(ctx, x - r * 0.38, y - r * 0.4, r * 0.28, r * 0.18, -0.6);
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.fill();
}

function bead(ctx: Ctx, x: number, y: number, r: number, col: string): void {
  ctx.beginPath();
  ctx.arc(x + 0.8, y + 1.2, r, 0, TAU);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, 0.4, x, y, r * 1.1);
  g.addColorStop(0, shade(col, 0.7));
  g.addColorStop(0.55, col);
  g.addColorStop(1, shade(col, -0.45));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.75);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ellipse(ctx, x - r * 0.32, y - r * 0.34, r * 0.32, r * 0.24, -0.6);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fill();
}

function seedPearl(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x + 0.7, y + 1.1, r, 0, TAU);
  ctx.fillStyle = 'rgba(40,30,40,0.25)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.42, 0.3, x, y, r * 1.1);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.45, '#f6eee6');
  g.addColorStop(0.8, '#d6c8cc');
  g.addColorStop(1, '#a8989e');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.55);
  ctx.lineWidth = 1.1;
  ctx.stroke();
  dab(ctx, x + r * 0.25, y + r * 0.3, r * 0.7, '#ffc8dc', 0.35);
  ellipse(ctx, x - r * 0.35, y - r * 0.38, r * 0.3, r * 0.2, -0.6);
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.fill();
}

/** The studs round the band: little set stones, metal beads or seed pearls. */
function studs(ctx: Ctx, look: PeelLook, d: GemDef, m: Metal): void {
  if (!look.studs) return;
  for (const [x, y] of studSpots(look.shape)) {
    if (d.studs === 'pearl') seedPearl(ctx, x, y, 4.8);
    else if (d.studs === 'bead') bead(ctx, x, y, 4.6, look.studs);
    else smallStone(ctx, x, y, 3.6, look.studs, m);
  }
}

/** The band round the stone: polished metal, its outer edge domed (lit top left), its inner bevel sloping down to the
 *  stone (lit bottom right), the stone's edge in shadow under it at the top left. */
function bandOver(ctx: Ctx, look: PeelLook, d: GemDef, g: Geo): void {
  const m = bandMetal(look, d);
  const [cx, cy] = g.c;
  ctx.save();
  headPath(ctx, look.shape);
  girdlePath(ctx, g, false);
  const bg = ctx.createLinearGradient(HX - R, HY - R, HX + R, HY + R);
  bg.addColorStop(0, m.hi);
  bg.addColorStop(0.35, m.mid);
  bg.addColorStop(0.7, m.lo);
  bg.addColorStop(1, m.deep);
  ctx.fillStyle = bg;
  ctx.fill('evenodd');
  ctx.clip('evenodd');
  // a polished bloom on the top left and a sharp reflection along the band
  dab(ctx, HX - R * 0.55, HY - R * 0.6, R * 0.75, '#ffffff', 0.55, 0.55, -0.75);
  dab(ctx, HX + R * 0.62, HY + R * 0.5, R * 0.5, m.deep, 0.35, 0.55, -0.75);
  // the inner bevel: facing the middle, so lit on its bottom right
  const ig = ctx.createLinearGradient(cx - g.r0, cy - g.r0, cx + g.r0, cy + g.r0);
  ig.addColorStop(0, rgba(m.deep, 0.75));
  ig.addColorStop(0.45, rgba(m.lo, 0.3));
  ig.addColorStop(0.6, rgba(m.hi, 0.2));
  ig.addColorStop(1, rgba('#ffffff', 0.85));
  girdlePath(ctx, g);
  ctx.strokeStyle = ig;
  ctx.lineWidth = 7;
  ctx.stroke();
  // the outer edge: domed, lit on its top left
  const og = ctx.createLinearGradient(HX - R, HY - R, HX + R, HY + R);
  og.addColorStop(0, rgba('#ffffff', 0.9));
  og.addColorStop(0.45, rgba(m.hi, 0.1));
  og.addColorStop(0.55, rgba(m.lo, 0.1));
  og.addColorStop(1, rgba(m.deep, 0.8));
  headPath(ctx, look.shape);
  ctx.strokeStyle = og;
  ctx.lineWidth = 7;
  ctx.stroke();
  // a mastered jewel's milgrain: a row of tiny beads along the inner edge
  if (isMaster(look)) {
    for (let k = 0; k < N; k += 1) {
      const a = angOf(k);
      const rr = radAt(g.rad, a) + 3.6;
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      ctx.beginPath();
      ctx.arc(x, y, 1.25, 0, TAU);
      ctx.fillStyle = Math.cos(a - L0) > 0 ? '#fff8d8' : '#b8860b';
      ctx.fill();
    }
  }
  ctx.restore();
  // the band's shadow on the stone's top-left edge, and the seam
  ctx.save();
  girdlePath(ctx, g);
  ctx.clip();
  const sg = ctx.createLinearGradient(cx - g.r0, cy - g.r0, cx + g.r0 * 0.3, cy + g.r0 * 0.3);
  sg.addColorStop(0, 'rgba(10,6,16,0.55)');
  sg.addColorStop(1, 'rgba(10,6,16,0)');
  girdlePath(ctx, g);
  ctx.strokeStyle = sg;
  ctx.lineWidth = 9;
  ctx.stroke();
  ctx.restore();
  girdlePath(ctx, g);
  ctx.strokeStyle = rgba(INK, 0.6);
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

/** A stone set in the middle of a plate or the velvet: its collet and claws (over the living stone). */
function centreSetting(ctx: Ctx, d: GemDef, cg: Geo, m: Metal): void {
  const c = d.centre!;
  const [cx, cy] = cg.c;
  // the collet: a polished ring round the stone
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < N; i++) {
    const a = angOf(i);
    const rr = radAt(cg.rad, a) + 3.4;
    if (i) ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    else ctx.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath();
  girdlePath(ctx, cg, false);
  const rg = ctx.createLinearGradient(cx - c.r, cy - c.r, cx + c.r, cy + c.r);
  rg.addColorStop(0, m.hi);
  rg.addColorStop(0.5, m.mid);
  rg.addColorStop(1, m.lo);
  ctx.fillStyle = rg;
  ctx.fill('evenodd');
  ctx.strokeStyle = rgba(INK, 0.7);
  ctx.lineWidth = 1.3;
  ctx.stroke();
  ctx.restore();
  // the claws, each a lit rounded tip gripping the stone
  for (let i = 0; i < c.claws; i++) {
    const a = (c.outline === 'round' ? -Math.PI / 2 : -Math.PI / 4) + (i / c.claws) * TAU;
    const rr = radAt(cg.rad, a);
    const x = cx + Math.cos(a) * (rr + 0.5);
    const y = cy + Math.sin(a) * (rr + 0.5);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.ellipse(0, 0, 4.6, 3.3, 0, 0, TAU);
    const g = ctx.createRadialGradient(-1.2, -1.2, 0.2, 0, 0, 4.6);
    g.addColorStop(0, m.hi);
    g.addColorStop(0.55, m.mid);
    g.addColorStop(1, m.lo);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.75);
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.restore();
    ellipse(ctx, x - 1, y - 1.1, 1.3, 0.9, -0.6);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fill();
  }
}

/** The pearl's nacre at rest: a soft dome, cream to dove grey, a translucent lit rim. */
function pearlBase(ctx: Ctx, g: Geo): void {
  const [cx, cy] = g.c;
  const rr = g.r0;
  ctx.save();
  girdlePath(ctx, g);
  ctx.clip();
  const bg = ctx.createRadialGradient(cx - rr * 0.32, cy - rr * 0.36, rr * 0.05, cx, cy, rr * 1.05);
  bg.addColorStop(0, '#fffdf8');
  bg.addColorStop(0.4, '#f6eee6');
  bg.addColorStop(0.7, '#d4c6c8');
  bg.addColorStop(1, '#857684');
  ctx.fillStyle = bg;
  ctx.fillRect(g.box.x, g.box.y, g.box.w, g.box.h);
  // the nacre's faint growth: soft uneven dabs
  const r = rng(hashStr('gem:pearl'));
  for (let i = 0; i < 26; i++) {
    const a = r() * TAU;
    const dd = Math.sqrt(r()) * rr * 0.85;
    dab(ctx, cx + Math.cos(a) * dd, cy + Math.sin(a) * dd, 8 + r() * 18, r() < 0.5 ? '#ffffff' : '#e8dcd8', 0.12 + r() * 0.1, 0.6 + r() * 0.4, r() * 3);
  }
  // the translucent rim: light comes back through the edge
  const eg = ctx.createRadialGradient(cx, cy, rr * 0.82, cx, cy, rr * 1.02);
  eg.addColorStop(0, 'rgba(255,250,246,0)');
  eg.addColorStop(0.7, 'rgba(255,250,246,0.22)');
  eg.addColorStop(1, 'rgba(255,250,246,0.05)');
  ctx.fillStyle = eg;
  ctx.fillRect(g.box.x, g.box.y, g.box.w, g.box.h);
  ctx.restore();
}

/** The Fire Opal's body at rest: translucent orange, glowing inside, deeper at its edge. */
function opalBase(ctx: Ctx, g: Geo): void {
  const [cx, cy] = g.c;
  const rr = g.r0;
  ctx.save();
  girdlePath(ctx, g);
  ctx.clip();
  const bg = ctx.createRadialGradient(cx - rr * 0.25, cy - rr * 0.28, rr * 0.05, cx, cy, rr * 1.05);
  bg.addColorStop(0, '#ffd8a8');
  bg.addColorStop(0.35, '#ffa45e');
  bg.addColorStop(0.75, '#e0601e');
  bg.addColorStop(1, '#8a2a08');
  ctx.fillStyle = bg;
  ctx.fillRect(g.box.x, g.box.y, g.box.w, g.box.h);
  const r = rng(hashStr('gem:opalbody'));
  for (let i = 0; i < 14; i++) {
    const a = r() * TAU;
    const dd = Math.sqrt(r()) * rr * 0.8;
    dab(ctx, cx + Math.cos(a) * dd, cy + Math.sin(a) * dd, 10 + r() * 20, r() < 0.5 ? '#ffe2b0' : '#c84a10', 0.18, 0.7, r() * 3);
  }
  ctx.restore();
}

/** Cosmic Crust at rest: deep space in a dome, a dust of faint stars. */
function cosmicBase(ctx: Ctx, g: Geo): void {
  const [cx, cy] = g.c;
  const rr = g.r0;
  ctx.save();
  girdlePath(ctx, g);
  ctx.clip();
  const bg = ctx.createRadialGradient(cx - rr * 0.1, cy - rr * 0.1, 0, cx, cy, rr * 1.05);
  bg.addColorStop(0, '#2a1a6a');
  bg.addColorStop(0.55, '#140c3e');
  bg.addColorStop(1, '#06041a');
  ctx.fillStyle = bg;
  ctx.fillRect(g.box.x, g.box.y, g.box.w, g.box.h);
  const r = rng(hashStr('gem:cosmicstars'));
  for (let i = 0; i < 90; i++) {
    const a = r() * TAU;
    const dd = Math.sqrt(r()) * rr;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * dd, cy + Math.sin(a) * dd, 0.35 + r() * 0.7, 0, TAU);
    ctx.fillStyle = rgba(r() < 0.3 ? '#c8d8ff' : '#ffffff', 0.35 + r() * 0.5);
    ctx.fill();
  }
  ctx.restore();
}

/** The Crown Jewel's velvet: deep purple, its pile catching light at the edges (velvet glows where it turns away). */
function velvetBase(ctx: Ctx, g: Geo, ring: Ring): void {
  const [cx, cy] = g.c;
  const rr = g.r0;
  ctx.save();
  girdlePath(ctx, g);
  ctx.clip();
  const bg = ctx.createRadialGradient(cx + rr * 0.1, cy + rr * 0.1, rr * 0.2, cx, cy, rr * 1.05);
  bg.addColorStop(0, '#2a0648');
  bg.addColorStop(0.6, '#4a1478');
  bg.addColorStop(0.88, '#7a34b0');
  bg.addColorStop(1, '#9a54cc');
  ctx.fillStyle = bg;
  ctx.fillRect(g.box.x, g.box.y, g.box.w, g.box.h);
  // the pile: a fine uneven nap
  const r = rng(hashStr('gem:velvet'));
  for (let i = 0; i < 700; i++) {
    const x = g.box.x + r() * g.box.w;
    const y = g.box.y + r() * g.box.h;
    ctx.fillStyle = r() < 0.5 ? 'rgba(200,150,255,0.07)' : 'rgba(10,0,24,0.09)';
    ctx.fillRect(x, y, 1.2, 1.2);
  }
  // the centre stone and the ring stones press into it: a soft hollow round each
  dab(ctx, cx + 2, cy + 3, 46, '#12001e', 0.45);
  for (const [x, y, s] of ring.pts) {
    dab(ctx, x + 0.8, y + 1.2, s * 2, '#12001e', 0.45);
    smallStone(ctx, x, y, s, '#f4fbff', null);
  }
  ctx.restore();
}

/** The Golden Feather in relief on its plate: the vane's shadow, each barb lit on its top-left edge, the shaft. */
function featherBase(ctx: Ctx, fg: ReturnType<typeof featherGeo>, m: Metal): void {
  ctx.save();
  ctx.translate(1.6, 2.2);
  polyPath(ctx, fg.vane);
  ctx.fillStyle = rgba(m.deep, 0.35);
  ctx.fill();
  ctx.restore();
  polyPath(ctx, fg.vane);
  const vg = ctx.createLinearGradient(HX - 50, HY - 60, HX + 50, HY + 60);
  vg.addColorStop(0, m.hi);
  vg.addColorStop(0.5, m.mid);
  vg.addColorStop(1, m.lo);
  ctx.fillStyle = vg;
  ctx.fill();
  ctx.lineCap = 'round';
  for (const b of fg.barbs) {
    ctx.beginPath();
    ctx.moveTo(b.a[0], b.a[1]);
    ctx.quadraticCurveTo(b.b[0], b.b[1], b.c[0], b.c[1]);
    ctx.strokeStyle = rgba(m.deep, 0.45);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.save();
    ctx.translate(-0.6, -0.6);
    ctx.beginPath();
    ctx.moveTo(b.a[0], b.a[1]);
    ctx.quadraticCurveTo(b.b[0], b.b[1], b.c[0], b.c[1]);
    ctx.strokeStyle = rgba('#ffffff', 0.5);
    ctx.lineWidth = 0.7;
    ctx.stroke();
    ctx.restore();
  }
  polyPath(ctx, fg.vane);
  ctx.strokeStyle = rgba(m.deep, 0.6);
  ctx.lineWidth = 1.3;
  ctx.stroke();
  // the shaft: a raised quill, lit along its top
  polyline(ctx, fg.shaft);
  ctx.strokeStyle = rgba(m.deep, 0.7);
  ctx.lineWidth = 4.2;
  ctx.stroke();
  polyline(ctx, fg.shaft);
  ctx.strokeStyle = m.mid;
  ctx.lineWidth = 2.8;
  ctx.stroke();
  ctx.save();
  ctx.translate(-0.7, -0.7);
  polyline(ctx, fg.shaft);
  ctx.strokeStyle = rgba('#ffffff', 0.8);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

/** The feather's lit barbs (a layer the light runs along). */
function featherLit(ctx: Ctx, fg: ReturnType<typeof featherGeo>): void {
  ctx.lineCap = 'round';
  for (const b of fg.barbs) {
    ctx.beginPath();
    ctx.moveTo(b.a[0], b.a[1]);
    ctx.quadraticCurveTo(b.b[0], b.b[1], b.c[0], b.c[1]);
    ctx.strokeStyle = '#fffbe8';
    ctx.lineWidth = 1.3;
    ctx.stroke();
  }
  polyline(ctx, fg.shaft);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();
}

// ════════════════════════════ the head, in layers ════════════════════════════

/** Under what moves: the stone, plate, pearl, opal, space or velvet at rest (inside the band). */
export function gemUnder(ctx: Ctx, look: PeelLook): void {
  const d = defOf(look);
  const g = headGeo(look, d);
  // the band's area is filled too, so nothing shows through at the head's edge while it flexes
  headPath(ctx, look.shape);
  ctx.fillStyle = d.metal.mid;
  ctx.fill();
  switch (d.form) {
    case 'stone':
      stoneBase(ctx, g, d.stone!);
      if (d.garden) garden(ctx, g);
      if (d.zoning) zoning(ctx, g);
      break;
    case 'plate':
      if (g.cut === 'brilliant') plateBase(ctx, g, d.metal);
      else fieldBase(ctx, g, d.metal, d.engrave === 'circuit');
      ctx.save();
      girdlePath(ctx, g);
      ctx.clip();
      if (d.engrave === 'guilloche') guilloche(ctx, g, d.metal);
      if (d.engrave === 'circuit') circuitBase(ctx, circuit(look, g, d.centre!.r), d.metal);
      if (d.engrave === 'feather') featherBase(ctx, featherGeo(g), d.metal);
      ctx.restore();
      break;
    case 'pearl':
      pearlBase(ctx, g);
      break;
    case 'opal':
      opalBase(ctx, g);
      break;
    case 'cosmic':
      cosmicBase(ctx, g);
      break;
    case 'velvet':
      velvetBase(ctx, g, crownRing(look, g));
      break;
  }
  const cg = centreGeo(look, d);
  if (cg) {
    dab(ctx, cg.c[0] + 1.5, cg.c[1] + 2.5, d.centre!.r * 1.35, '#000000', 0.3);
    stoneBase(ctx, cg, d.centre!.stone);
  }
}

function garden(ctx: Ctx, g: Geo): void {
  // an emerald's jardin: wisps of feathery inclusions and a few tiny crystals, deep in the stone
  const r = rng(hashStr('gem:garden'));
  const [cx, cy] = g.c;
  ctx.save();
  girdlePath(ctx, g);
  ctx.clip();
  for (let i = 0; i < 7; i++) {
    const a = r() * TAU;
    const dd = Math.sqrt(r()) * g.r0 * 0.7;
    const x = cx + Math.cos(a) * dd;
    const y = cy + Math.sin(a) * dd;
    const ang = r() * Math.PI;
    for (let k = 0; k < 5; k++) {
      ctx.beginPath();
      const l = 5 + r() * 9;
      const o = (k - 2) * 1.6;
      ctx.moveTo(x - Math.cos(ang) * l + Math.sin(ang) * o, y - Math.sin(ang) * l - Math.cos(ang) * o);
      ctx.quadraticCurveTo(x + Math.sin(ang) * (o + 2), y - Math.cos(ang) * (o + 2), x + Math.cos(ang) * l + Math.sin(ang) * o, y + Math.sin(ang) * l - Math.cos(ang) * o);
      ctx.strokeStyle = rgba('#d8ffe4', 0.12 + r() * 0.1);
      ctx.lineWidth = 0.9;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(x + (r() - 0.5) * 8, y + (r() - 0.5) * 8, 0.8 + r() * 0.8, 0, TAU);
    ctx.fillStyle = 'rgba(2,30,12,0.6)';
    ctx.fill();
  }
  ctx.restore();
}

function zoning(ctx: Ctx, g: Geo): void {
  // an amethyst's colour zoning: deeper purple in angular bands, as the crystal grew
  const [cx, cy] = g.c;
  ctx.save();
  girdlePath(ctx, g);
  ctx.clip();
  for (let k = 0; k < 3; k++) {
    const rr = g.r0 * (0.95 - k * 0.24);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + 0.3 + k * 0.2;
      const x = cx + Math.cos(a) * rr;
      const y = cy - 8 + Math.sin(a) * rr;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(60,8,110,0.22)';
    ctx.lineWidth = 8;
    ctx.stroke();
  }
  ctx.restore();
}

/** Over what moves: the band, a centre stone's setting, the ring stones' collets, the studs and the outline. */
export function gemOver(ctx: Ctx, look: PeelLook): void {
  const d = defOf(look);
  const g = headGeo(look, d);
  const m = bandMetal(look, d);
  bandOver(ctx, look, d, g);
  const cg = centreGeo(look, d);
  if (cg) centreSetting(ctx, d, cg, m);
  if (d.form === 'velvet') {
    for (const [x, y, s] of crownRing(look, g).pts) {
      ctx.beginPath();
      ctx.arc(x, y, s + 1.7, 0, TAU);
      ctx.arc(x, y, s, 0, TAU, true);
      const rg = ctx.createLinearGradient(x - s, y - s, x + s, y + s);
      rg.addColorStop(0, m.hi);
      rg.addColorStop(0.5, m.mid);
      rg.addColorStop(1, m.lo);
      ctx.fillStyle = rg;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, s + 1.7, 0, TAU);
      ctx.strokeStyle = rgba(INK, 0.6);
      ctx.lineWidth = 0.9;
      ctx.stroke();
    }
  }
  if (d.engrave === 'circuit') {
    // the pavé stones at the traces' ends
    for (const t of circuit(look, g, d.centre!.r)) {
      const [x, y] = t.pts[t.pts.length - 1];
      smallStone(ctx, x, y, 3, '#f4fbff', d.metal);
    }
  }
  studs(ctx, look, d, m);
  headPath(ctx, look.shape);
  ctx.strokeStyle = look.rim ?? INK;
  ctx.lineWidth = 6;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

// ════════════════════════════ the mini: what a rig holds ════════════════════════════

interface Layer {
  c: HTMLCanvasElement;
  x: number;
  y: number;
  w: number;
  h: number;
}
function layer(box: Geo['box'], RR: number, draw: (ctx: Ctx) => void): Layer {
  const [c, ctx] = makeCanvas(box.w * RR, box.h * RR);
  ctx.setTransform(RR, 0, 0, RR, -box.x * RR, -box.y * RR);
  draw(ctx);
  return { c, x: box.x, y: box.y, w: box.w, h: box.h };
}
const drawLayer = (ctx: Ctx, l: Layer, a: number) => {
  if (a <= 0.005) return;
  ctx.globalAlpha = Math.min(1, a);
  ctx.drawImage(l.c, l.x, l.y, l.w, l.h);
  ctx.globalAlpha = 1;
};

export interface GemMini {
  look: PeelLook;
  def: GemDef;
  geo: Geo;
  centre: Geo | null;
  RR: number;
  /** Layers that move: the sapphire's silk (three directions), the opal's colour (three sets of patches), the cosmic
   *  nebulae and galaxy, the feather's lit barbs. */
  layers: Layer[];
  traces: Trace[];
  ring: Ring | null;
}

const SILK_DIRS = [0.2, 0.2 + Math.PI / 3, 0.2 + (2 * Math.PI) / 3];

export function* gemMiniSteps(look: PeelLook, RR: number): Generator<void, GemMini | null> {
  const def = defOf(look);
  const geo = headGeo(look, def);
  const centre = centreGeo(look, def);
  const layers: Layer[] = [];
  const [cx, cy] = geo.c;
  const box = geo.box;
  const r = rng(hashStr(`gem:layers:${look.jewel}`));
  const inG = (x: number, y: number, m = 0) => Math.hypot(x - cx, y - cy) < radAt(geo.rad, Math.atan2(y - cy, x - cx)) - m;
  if (def.silk) {
    for (const dir of SILK_DIRS) {
      layers.push(
        layer(box, RR, (ctx) => {
          ctx.lineCap = 'round';
          for (let i = 0; i < 230; i++) {
            const x = box.x + r() * box.w;
            const y = box.y + r() * box.h;
            if (!inG(x, y, 3)) continue;
            const l = 2 + r() * 6;
            const a = dir + (r() - 0.5) * 0.08;
            ctx.beginPath();
            ctx.moveTo(x - Math.cos(a) * l, y - Math.sin(a) * l);
            ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
            ctx.strokeStyle = `rgba(235,245,255,${0.35 + r() * 0.45})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }),
      );
      yield;
    }
  }
  if (def.form === 'opal') {
    const sets = [
      ['#3aff8a', '#2ad8ff', '#a8ff3a'],
      ['#3a7aff', '#9a5aff', '#2ae8ff'],
      ['#ff3a6a', '#ffd23a', '#ff8a2a'],
    ];
    for (const cols of sets) {
      layers.push(
        layer(box, RR, (ctx) => {
          // flakes of colour lying in the grain of the stone, overlapping: one set flashes as the light comes round to it
          const flow = 0.6;
          for (let i = 0; i < 34; i++) {
            const a = r() * TAU;
            const dd = Math.sqrt(r()) * geo.r0 * 0.95;
            const x = cx + Math.cos(a) * dd;
            const y = cy + Math.sin(a) * dd;
            const s = 3 + r() * r() * 16;
            const col = cols[Math.floor(r() * cols.length)];
            const rot = flow + (r() - 0.5) * 0.9;
            const pts: Pt[] = [];
            const n = 5 + Math.floor(r() * 3);
            for (let k = 0; k < n; k++) {
              const an = (k / n) * TAU + (r() - 0.5) * 0.6;
              const rr = s * (0.55 + r() * 0.55);
              const px = Math.cos(an) * rr;
              const py = Math.sin(an) * rr * 0.5;
              pts.push([x + px * Math.cos(rot) - py * Math.sin(rot), y + px * Math.sin(rot) + py * Math.cos(rot)]);
            }
            dab(ctx, x, y, s * 1.3, col, 0.2, 0.6, rot);
            polyPath(ctx, pts);
            // lit across the flake: one edge bright, fading to the colour, then clear
            const pg = ctx.createLinearGradient(x - Math.cos(rot + 1.2) * s, y - Math.sin(rot + 1.2) * s, x + Math.cos(rot + 1.2) * s, y + Math.sin(rot + 1.2) * s);
            pg.addColorStop(0, rgba(shade(col, 0.6), 0.9));
            pg.addColorStop(0.45, rgba(col, 0.75));
            pg.addColorStop(1, rgba(shade(col, -0.3), 0.2));
            ctx.fillStyle = pg;
            ctx.fill();
          }
        }),
      );
      yield;
    }
  }
  if (def.form === 'cosmic') {
    // a nebula drifting in a broad band, a warmer one smaller, and a spiral galaxy in the middle
    const neb = (cols: string[], n: number, spread: number, rr0: number) => (ctx: Ctx) => {
      for (let i = 0; i < n; i++) {
        const u = r();
        const a = u * TAU * 1.2;
        const dd = rr0 * (0.25 + u * 0.75) + (r() - 0.5) * spread;
        const x = cx + Math.cos(a) * dd;
        const y = cy + Math.sin(a) * dd * 0.8;
        dab(ctx, x, y, 8 + r() * 16, cols[Math.floor(r() * cols.length)], 0.12 + r() * 0.14, 0.6 + r() * 0.4, r() * 3);
      }
    };
    layers.push(layer(box, RR, neb(['#7a4aff', '#c04aff', '#3a8aff', '#ff5ad0'], 90, 22, geo.r0 * 0.85)));
    yield;
    layers.push(layer(box, RR, neb(['#ff8a5a', '#ff5aa0', '#ffd08a'], 40, 14, geo.r0 * 0.55)));
    yield;
    layers.push(
      layer(box, RR, (ctx) => {
        for (let arm = 0; arm < 2; arm++)
          for (let i = 0; i < 70; i++) {
            const u = i / 70;
            const a = arm * Math.PI + u * 4.2;
            const dd = 3 + u * 26;
            const x = cx + Math.cos(a) * dd + (r() - 0.5) * 3;
            const y = cy + Math.sin(a) * dd * 0.62 + (r() - 0.5) * 2;
            dab(ctx, x, y, 2.5 + (1 - u) * 3, u < 0.3 ? '#fff4e0' : r() < 0.5 ? '#c8b8ff' : '#8ac8ff', 0.3 * (1 - u * 0.6));
          }
        dab(ctx, cx, cy, 9, '#fff8e8', 0.9, 0.62);
      }),
    );
    yield;
  }
  if (def.engrave === 'feather') {
    const fg = featherGeo(geo);
    layers.push(layer(box, RR, (ctx) => featherLit(ctx, fg)));
    yield;
  }
  const traces = def.engrave === 'circuit' ? circuit(look, geo, def.centre!.r) : [];
  const ring = def.form === 'velvet' ? crownRing(look, geo) : null;
  return { look, def, geo, centre, RR, layers, traces, ring };
}

function gemMiniNow(look: PeelLook, RR: number): GemMini | null {
  const gen = gemMiniSteps(look, RR);
  for (;;) {
    const r = gen.next();
    if (r.done) return r.value;
  }
}

// ════════════════════════════ the living gem ════════════════════════════

const SPECTRUM = ['#ff3a3a', '#ff8a2a', '#ffe03a', '#8aff4a', '#2affa8', '#2ad8ff', '#3a7aff', '#8a5aff', '#e04aff', '#ff4aa8'].map((h) => {
  const n = parseInt(h.slice(1), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
});
const rgbOf = (h: string) => {
  const n = parseInt(h.slice(1), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
};

let starImg: HTMLCanvasElement | null = null;
/** A glint: a soft bloom and a thin four-pointed star with a longer cross. */
function star(): HTMLCanvasElement {
  if (starImg) return starImg;
  const [c, ctx] = makeCanvas(64, 64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 22);
  g.addColorStop(0, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.25)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const ray = (a: number, len: number, w: number) => {
    ctx.save();
    ctx.translate(32, 32);
    ctx.rotate(a);
    const lg = ctx.createLinearGradient(-len, 0, len, 0);
    lg.addColorStop(0, 'rgba(255,255,255,0)');
    lg.addColorStop(0.5, 'rgba(255,255,255,1)');
    lg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(-len, 0);
    ctx.quadraticCurveTo(0, -w, len, 0);
    ctx.quadraticCurveTo(0, w, -len, 0);
    ctx.fill();
    ctx.restore();
  };
  ray(0, 31, 2.6);
  ray(Math.PI / 2, 31, 2.6);
  ray(Math.PI / 4, 14, 1.4);
  ray(-Math.PI / 4, 14, 1.4);
  starImg = c;
  return c;
}

export type GemEmit = (spr: GemMote | 'glint' | 'feather', lx: number, ly: number, vx: number, vy: number, s0: number, s1: number, life: number, o?: { grav?: number; drag?: number; a?: number; fin?: number; spin?: number }) => void;

/** A glow behind the peel (as CraftGlow in src/art/peelCraft.ts). */
export interface GemGlow {
  x: number;
  y: number;
  rx: number;
  ry: number;
  color: number;
  a: number;
}

interface Tw {
  x: number;
  y: number;
  t: number;
  s: number;
}

const reduced = () => !!save.settings.reducedMotion;

export class GemLive {
  t = crand() * 30;
  /** Seconds since the last smack. */
  sm = 9;
  menu = true;
  emit: GemEmit | null = null;
  readonly glows: GemGlow[] = [];
  /** The light: its azimuth and elevation now, and the half-vector the facets mirror towards the eye. */
  private L = L0;
  private e = 0.95;
  private hx = 0;
  private hy = 0;
  private hz = 1;
  private hx2 = 0;
  private hy2 = 0;
  private hz2 = 1;
  private swing = 0;
  private catchT = -1;
  private catchNext = 1.5 + crand() * 2.5;
  private catchDir = 1;
  private bloomT = -1;
  private bloomNext = 3 + crand() * 3;
  private tw: Tw[] = [{ x: 0, y: 0, t: 9, s: 0 }, { x: 0, y: 0, t: 9, s: 0 }, { x: 0, y: 0, t: 9, s: 0 }];
  private twNext = 0.3;
  private best = -1;
  private bestV = 0;
  private studT = 0;
  private studs: Pt[];
  private driftNext = 0.8;
  private pulses: { tr: number; d: number; wait: number }[] = [];
  private padFlash: Float32Array;
  private ringFlash: Float32Array;
  private ringNext = 0.6;

  constructor(readonly mini: GemMini) {
    const d = mini.def;
    this.studs = mini.look.studs ? studSpots(mini.look.shape) : [];
    this.padFlash = new Float32Array(mini.traces.length);
    this.ringFlash = new Float32Array(mini.ring?.pts.length ?? 0);
    for (let i = 0; i < Math.min(3, mini.traces.length); i++) this.pulses.push({ tr: Math.floor(crand() * mini.traces.length), d: crand() * 30, wait: i * 0.5 });
    const [cx, cy] = mini.geo.c;
    if (d.glow) this.glows.push({ x: cx, y: cy, rx: R * 1.15, ry: R * 1.2, color: parseInt(d.glow.slice(1), 16), a: 0 });
    if (d.rainbow)
      for (let i = 0; i < 3; i++) this.glows.push({ x: cx, y: cy, rx: R * 0.9, ry: R * 0.9, color: 0xffffff, a: 0 });
    this.light();
  }

  get calm(): number {
    return reduced() ? 0.35 : 1;
  }

  /** At rest (the still): the light where it sits, nothing running. */
  rest(): void {
    this.t = 0;
    this.sm = 9;
    this.catchT = -1;
    this.bloomT = -1;
    this.swing = 0;
    this.light();
  }

  private light(): void {
    const t = this.t;
    let off = 0;
    if (this.catchT >= 0) off = this.catchDir * 1.05 * Math.sin(Math.PI * this.catchT) * this.calm;
    this.L = L0 + (0.5 * Math.sin(t * 0.21) + 0.22 * noise1(t * 0.37 + 3)) * this.calm + off + this.swing * 0.9;
    this.e = 0.95 + 0.24 * Math.sin(t * 0.29 + 1.3) * this.calm - Math.abs(off) * 0.25;
    const lx = Math.cos(this.e) * Math.cos(this.L);
    const ly = Math.cos(this.e) * Math.sin(this.L);
    const lz = Math.sin(this.e);
    let n = Math.hypot(lx, ly, lz + 1);
    this.hx = lx / n;
    this.hy = ly / n;
    this.hz = (lz + 1) / n;
    // a second, softer light low on the right (a window): it catches the steep facets
    const L2 = -0.6 + 0.4 * Math.sin(t * 0.17 + 2) * this.calm + off * 0.6 + this.swing * 0.6;
    const e2 = 0.3;
    const mx = Math.cos(e2) * Math.cos(L2);
    const my = Math.cos(e2) * Math.sin(L2);
    const mz = Math.sin(e2);
    n = Math.hypot(mx, my, mz + 1);
    this.hx2 = mx / n;
    this.hy2 = my / n;
    this.hz2 = (mz + 1) / n;
  }

  update(dt: number, vx = 0): void {
    this.t += dt;
    this.sm += dt;
    const d = this.mini.def;
    // swung, the light runs over the facets as the stone turns
    const target = Math.max(-1, Math.min(1, vx / 1400));
    this.swing += (target - this.swing) * Math.min(1, dt * 5);
    // now and then the stone catches the light: it swings across the facets and back
    if (this.catchT >= 0) {
      this.catchT += dt / 1.3;
      if (this.catchT >= 1) {
        this.catchT = -1;
        this.catchNext = 2.8 + crand() * 3;
      }
    } else {
      this.catchNext -= dt;
      if (this.catchNext <= 0 && !reduced()) {
        this.catchT = 0;
        this.catchDir = crand() < 0.5 ? -1 : 1;
      }
    }
    // the ultra-rares: a slow bloom of light runs through them every few seconds
    if (d.ultra) {
      if (this.bloomT >= 0) {
        this.bloomT += dt / 1.6;
        if (this.bloomT >= 1) {
          this.bloomT = -1;
          this.bloomNext = 4 + crand() * 3;
        }
      } else {
        this.bloomNext -= dt;
        if (this.bloomNext <= 0) this.bloomT = 0;
      }
      // a glint drifts off the rim now and then, as light leaving the stone
      this.driftNext -= dt;
      if (this.driftNext <= 0 && this.emit && !reduced()) {
        this.driftNext = 0.7 + crand() * 0.9;
        const a = L0 + (crand() - 0.5) * 2.4;
        const [cx, cy] = this.mini.geo.c;
        const rr = radAt(this.mini.geo.rad, a) + 8;
        const m = this.menu ? 0.6 : 1;
        this.emit(crand() < 0.6 ? 'glint' : d.mote, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, Math.cos(a) * 26 * m, (Math.sin(a) * 26 - 14) * m, 11, 4, 0.9 + crand() * 0.5, { drag: 0.6, fin: 0.3 });
      }
    }
    this.light();
    // glints pop on whichever facet flashes brightest
    for (const w of this.tw) w.t += dt;
    this.twNext -= dt;
    if (this.twNext <= 0 && this.best >= 0 && this.bestV > 0.45) {
      this.twNext = (0.28 + crand() * 0.45) / this.calm;
      const w = this.tw.find((x) => x.t > 0.5);
      const g = this.best >= 1000 ? this.mini.centre : this.mini.geo;
      const f = g?.facets[this.best % 1000];
      if (w && f) {
        // at the facet's corner nearest the light
        let bx = f.pts[0][0];
        let by = f.pts[0][1];
        let bv = -1e9;
        for (const [x, y] of f.pts) {
          const v = (x - g!.c[0]) * Math.cos(this.L) + (y - g!.c[1]) * Math.sin(this.L);
          if (v > bv) {
            bv = v;
            bx = x;
            by = y;
          }
        }
        w.x = bx + (f.cx - bx) * 0.25;
        w.y = by + (f.cy - by) * 0.25;
        w.t = 0;
        w.s = 7 + crand() * 6 + (d.stone?.fire ?? 0) * 3;
      }
    }
    // the studs glint in turn
    this.studT += dt * 2.6 * this.calm;
    // Platinum Prop's light pulses along its circuit
    const tr = this.mini.traces;
    for (let i = 0; i < this.padFlash.length; i++) this.padFlash[i] = Math.max(0, this.padFlash[i] - dt * 2.6);
    for (const p of this.pulses) {
      if (p.wait > 0) {
        p.wait -= dt;
        continue;
      }
      p.d += dt * 60;
      if (p.d >= tr[p.tr].len) {
        this.padFlash[p.tr] = 1;
        p.tr = Math.floor(crand() * tr.length);
        p.d = 0;
        p.wait = 0.2 + crand() * 0.9;
      }
    }
    // the Crown Jewel's ring stones twinkle in turn
    for (let i = 0; i < this.ringFlash.length; i++) this.ringFlash[i] = Math.max(0, this.ringFlash[i] - dt * 3);
    this.ringNext -= dt;
    if (this.ringNext <= 0 && this.ringFlash.length) {
      this.ringNext = 0.25 + crand() * 0.5;
      this.ringFlash[Math.floor(crand() * this.ringFlash.length)] = 1;
    }
    // glows behind: the ruby's red, Prismatic's rainbow
    if (d.glow && this.glows[0]) this.glows[0].a = (0.16 + 0.06 * Math.sin(this.t * 1.3)) * (1 + 1.6 * this.hit(0.7));
    if (d.rainbow)
      for (let i = 0; i < 3; i++) {
        const gl = this.glows[i];
        const a = this.L + Math.PI + (i - 1) * 0.5;
        const [cx, cy] = this.mini.geo.c;
        gl.x = cx + Math.cos(a) * 34;
        gl.y = cy + Math.sin(a) * 34;
        const s = SPECTRUM[(Math.floor(((this.L * 1.5 + i * 0.9 + this.t * 0.25) / TAU) * 10) % 10 + 10) % 10].split(',').map(Number);
        gl.color = (s[0] << 16) | (s[1] << 8) | s[2];
        gl.a = 0.12 + 0.1 * this.hit(0.8);
      }
  }

  /** The still's glint: on the facet that flashes brightest at rest, at its peak (after a draw). */
  pinGlint(): void {
    this.twNext = 0;
    this.bestV = Math.max(this.bestV, 0.5);
    const t = this.t;
    this.update(0);
    this.t = t;
    const w = this.tw.find((x) => x.t === 0);
    if (w) w.t = 0.25;
  }

  /** The smack's strength, falling from 1 over `len` s. */
  hit(len: number): number {
    const u = this.sm / len;
    return u >= 1 ? 0 : (1 - u) * (1 - u);
  }

  smack(): void {
    this.sm = 0;
    const d = this.mini.def;
    const g = this.mini.geo;
    const [cx, cy] = g.c;
    if (!this.emit) return;
    const n = reduced() ? 0.4 : 1;
    const m = this.menu ? 0.55 : 1;
    // a chime of glints off the rim, and motes of the stone's colour
    for (let i = 0; i < Math.round(9 * n); i++) {
      const a = (i / 9) * TAU + crand() * 0.5;
      const rr = radAt(g.rad, a) + 6;
      const sp = (110 + crand() * 130) * m;
      this.emit('glint', cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, Math.cos(a) * sp, Math.sin(a) * sp - 20, 20 + crand() * 8, 6, 0.38 + crand() * 0.2, { drag: 2.2, fin: 0.02, spin: 0 });
    }
    for (let i = 0; i < Math.round(12 * n); i++) {
      const a = crand() * TAU;
      const rr = radAt(g.rad, a) * (0.5 + crand() * 0.5);
      const sp = (80 + crand() * 150) * m;
      this.emit(d.mote, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, Math.cos(a) * sp, Math.sin(a) * sp - 30, 12 + crand() * 6, 4, 0.5 + crand() * 0.35, { drag: 1.6, grav: 60 });
    }
    if (d.engrave === 'feather')
      for (let i = 0; i < Math.round(5 * n); i++) {
        const a = -Math.PI / 2 + (crand() - 0.5) * 2.6;
        const sp = (90 + crand() * 120) * m;
        this.emit('feather', cx + Math.cos(a) * 40, cy + Math.sin(a) * 40, Math.cos(a) * sp, Math.sin(a) * sp - 40, 18 + crand() * 6, 16, 0.9 + crand() * 0.4, { drag: 2.4, grav: 120, spin: (crand() - 0.5) * 5 });
      }
    this.padFlash.fill(1);
    this.ringFlash.fill(1);
  }

  // ——— drawing ———

  /** Inside the band (peel units): the stone, plate or dome alive. */
  draw(ctx: Ctx): void {
    const mini = this.mini;
    const d = mini.def;
    const g = mini.geo;
    this.best = -1;
    this.bestV = 0;
    ctx.save();
    girdlePath(ctx, g);
    ctx.clip();
    switch (d.form) {
      case 'stone':
        this.facets(ctx, g, d.stone!, false, 0);
        if (d.silk) this.silk(ctx);
        if (d.glow) this.fluoresce(ctx, d.glow);
        if (d.zoning) this.flush(ctx);
        if (d.rainbow) this.rainbows(ctx);
        this.glass(ctx, 0.28);
        break;
      case 'plate':
        if (g.cut === 'brilliant') this.facets(ctx, g, null, true, 0);
        if (d.engrave === 'guilloche') this.spin(ctx);
        else if (d.engrave === 'feather') this.featherSheen(ctx);
        else this.sheen(ctx);
        if (d.engrave === 'circuit') this.circuitLive(ctx);
        break;
      case 'pearl':
        this.pearl(ctx);
        break;
      case 'opal':
        this.opal(ctx);
        break;
      case 'cosmic':
        this.cosmic(ctx);
        break;
      case 'velvet':
        this.velvet(ctx);
        break;
    }
    if (d.ultra) this.bloom(ctx, g);
    ctx.restore();
    if (mini.centre) {
      ctx.save();
      girdlePath(ctx, mini.centre);
      ctx.clip();
      this.facets(ctx, mini.centre, d.centre!.stone, false, 1000);
      this.glass(ctx, 0.25, mini.centre);
      ctx.restore();
    }
  }

  /** Over the band: the studs glinting in turn, the glints on the facets, a smack's flash. */
  drawOver(ctx: Ctx): void {
    const d = this.mini.def;
    const n = this.studs.length;
    if (n) {
      const s = this.hit(0.7);
      for (let i = 0; i < n; i++) {
        const [x, y] = this.studs[i];
        // in turn round the band (and on a smack, from the top outwards)
        const k = (((this.studT - i * 0.55) % (n * 0.55 + 3)) + n * 0.55 + 3) % (n * 0.55 + 3);
        let a = k < 0.6 ? Math.sin((Math.PI * k) / 0.6) : 0;
        if (s > 0) {
          const ord = Math.abs(i - (n - 1) / 2) / ((n - 1) / 2);
          const u = this.sm / 0.4 - ord * 0.6;
          a = Math.max(a, u > 0 && u < 1 ? Math.sin(Math.PI * u) : 0);
        }
        if (a > 0.02) this.glint(ctx, x - 1.4, y - 1.4, 7 * a, 0.95 * a);
      }
    }
    for (const w of this.tw) if (w.t < 0.5) this.glint(ctx, w.x, w.y, w.s * Math.sin((Math.PI * w.t) / 0.5), 1);
    // the Crown Jewel's ring stones
    if (this.mini.ring)
      this.mini.ring.pts.forEach(([x, y, s], i) => {
        const f = this.ringFlash[i];
        if (f > 0.02) this.glint(ctx, x - s * 0.2, y - s * 0.25, s * 1.8 * f, f);
      });
    // Platinum Prop's pavé pads
    this.mini.traces.forEach((t, i) => {
      const f = this.padFlash[i];
      if (f <= 0.02) return;
      const [x, y] = t.pts[t.pts.length - 1];
      this.glint(ctx, x, y, 7 * f, f);
    });
    // a smack: a flash off the middle
    const k = this.sm / 0.2;
    if (k < 1) {
      const [cx, cy] = this.mini.geo.c;
      dab(ctx, cx, cy, 70, '#ffffff', 0.5 * (1 - k));
      this.glint(ctx, cx - 6, cy - 8, 26 * (1 - k * 0.5), 1 - k);
    }
    void d;
  }

  private glint(ctx: Ctx, x: number, y: number, size: number, a: number): void {
    if (size <= 0.3 || a <= 0.01) return;
    ctx.globalAlpha = Math.min(1, a);
    ctx.drawImage(star(), x - size, y - size, size * 2, size * 2);
    ctx.globalAlpha = 1;
  }

  /** Every facet lit as a tilted mirror: it flashes when it turns the light to the eye, light breaks inside the stone
   *  (in colour, where it has fire), facets turned away go dark; a smack's ring of light runs out through them. */
  private facets(ctx: Ctx, g: Geo, st: Stone | null, metal: boolean, id0: number): void {
    const mt = metal ? this.mini.def.metal : null;
    const flash = st ? rgbOf(st.flash) : '255,255,255';
    const deep = st ? rgbOf(st.body[2]) : rgbOf(mt!.deep);
    const fire = st ? st.fire : 0;
    const specK = st ? st.spec : 1.05;
    const dark = st ? st.dark : 0;
    const L = this.L;
    const e = this.e;
    const sm = this.sm;
    const rr = (sm / 0.42) * 1.25;
    const ringA = Math.max(0, 1 - sm / 0.6);
    const bl = this.bloomT >= 0 ? this.bloomT : -1;
    const bloomR = bl >= 0 ? bl * 1.5 - 0.2 : -9;
    const bloomA = bl >= 0 ? Math.sin(Math.PI * bl) : 0;
    for (const f of g.facets) {
      const st2 = Math.sin(f.tilt);
      const nx = st2 * Math.cos(f.az);
      const ny = st2 * Math.sin(f.az);
      const nz = Math.cos(f.tilt);
      const d1 = Math.max(0, nx * this.hx + ny * this.hy + nz * this.hz);
      const d2 = Math.max(0, nx * this.hx2 + ny * this.hy2 + nz * this.hz2);
      let spec = (Math.pow(d1, 70) + 0.55 * Math.pow(d2, 50)) * specK;
      let a: number;
      if (metal) {
        // a mirror of the room: the facet's tone follows the light round, bright towards it, dark away
        const dv = metalTone(f, L) - metalTone(f, L0);
        polyPath(ctx, f.pts);
        if (dv > 0.02) {
          ctx.fillStyle = `rgba(255,255,255,${Math.min(0.75, dv * 0.85)})`;
          ctx.fill();
        } else if (dv < -0.02) {
          ctx.fillStyle = `rgba(${deep},${Math.min(0.7, -dv * 0.75)})`;
          ctx.fill();
        }
      } else {
        // facets turned from the light go dark
        const dk = dark * Math.pow(0.5 + 0.5 * Math.cos(f.az - L - Math.PI + f.ph * 0.35), 3) * (f.tilt ? 1 : 0.3);
        if (dk > 0.02) {
          polyPath(ctx, f.pts);
          ctx.fillStyle = `rgba(${deep},${Math.min(0.85, dk)})`;
          ctx.fill();
        }
        // light breaking inside it (scintillation)
        const sc = Math.pow(0.5 + 0.5 * Math.cos(3 * (f.az - L) + f.ph + 2 * e), 10) * (f.tilt ? 1 : 0.5);
        if (sc > 0.02) {
          polyPath(ctx, f.pts);
          ctx.fillStyle = `rgba(${flash},${Math.min(0.75, sc * 0.6)})`;
          ctx.fill();
        }
        // and in colour (fire): a soft flash of one colour inside the facet
        if (fire > 0 && f.tilt) {
          const fv = Math.pow(0.5 + 0.5 * Math.cos(4.2 * (f.az - L) + f.ph * 2 + 3 * e), 12) * fire;
          if (fv > 0.04) {
            const hue = SPECTRUM[(Math.floor(((f.az - L) * 1.6 + f.ph + e * 2) * (10 / TAU)) % 10 + 10) % 10];
            this.fireSpot(ctx, f, hue, Math.min(0.95, fv * 0.85));
          }
        }
      }
      // a smack's ring of light running out through the facets, the ultra-rares' bloom more slowly
      let ring = 0;
      if (ringA > 0) ring = Math.exp(-(((f.d - rr) / 0.17) ** 2)) * ringA;
      if (bloomA > 0) ring = Math.max(ring, Math.exp(-(((f.d - bloomR) / 0.3) ** 2)) * bloomA * 0.6);
      if (ring > 0.03) {
        polyPath(ctx, f.pts);
        ctx.fillStyle = `rgba(255,255,255,${Math.min(0.85, ring * 0.8)})`;
        ctx.fill();
        if (fire > 0.3 && f.tilt) this.fireSpot(ctx, f, SPECTRUM[(f.i * 3 + Math.floor(sm * 20)) % 10], Math.min(0.9, ring * 0.8 * Math.min(1, fire)));
      }
      spec = Math.min(1.2, spec);
      if (spec > 0.03) {
        a = Math.min(0.92, spec * 0.85);
        // the flash rolls across the facet with the light
        polyPath(ctx, f.pts);
        const lx = Math.cos(L) * 14;
        const ly = Math.sin(L) * 14;
        const fg = ctx.createLinearGradient(f.cx + lx, f.cy + ly, f.cx - lx, f.cy - ly);
        fg.addColorStop(0, `rgba(255,255,255,${a})`);
        fg.addColorStop(1, `rgba(255,255,255,${a * 0.35})`);
        ctx.fillStyle = fg;
        ctx.fill();
        if (spec > 0.4) {
          ctx.strokeStyle = `rgba(255,255,255,${Math.min(0.9, spec * 0.7)})`;
          ctx.lineWidth = 0.9;
          ctx.stroke();
        }
        if (spec > this.bestV) {
          this.bestV = spec;
          this.best = id0 + f.i;
        }
      }
    }
  }

  /** A flash of colour inside a facet: soft, round, hottest in its middle, clipped to the facet. */
  private fireSpot(ctx: Ctx, f: Facet, rgb: string, a: number): void {
    let r = 0;
    for (const [x, y] of f.pts) r = Math.max(r, Math.hypot(x - f.cx, y - f.cy));
    r *= 0.62;
    ctx.save();
    polyPath(ctx, f.pts);
    ctx.clip();
    const g = ctx.createRadialGradient(f.cx, f.cy, 0, f.cx, f.cy, r);
    g.addColorStop(0, `rgba(255,255,255,${a * 0.7})`);
    g.addColorStop(0.25, `rgba(${rgb},${a})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(f.cx - r, f.cy - r, r * 2, r * 2);
    ctx.restore();
  }

  /** The reflection of the room on the stone's polish, drifting as the light moves. */
  private glass(ctx: Ctx, a: number, g = this.mini.geo): void {
    const [cx, cy] = g.c;
    const k = g.r0 / 70;
    const ox = Math.cos(this.L) * 4 + noise1(this.t * 0.17) * 3;
    const oy = Math.sin(this.L) * 3 + noise1(this.t * 0.13 + 7) * 2;
    windowBars(ctx, cx - 30 * k + ox, cy - 34 * k + oy, 46 * k, a, 0.08);
  }

  /** The sapphire's silk: fine needles in three directions, each set glinting as the light lines up with it, and
   *  where the light sits a soft six-rayed star. */
  private silk(ctx: Ctx): void {
    const L = this.L;
    const [cx, cy] = this.mini.geo.c;
    let star6 = 0;
    SILK_DIRS.forEach((dir, i) => {
      const a = Math.pow(Math.max(0, Math.cos(2 * (L - dir - Math.PI / 2))), 4);
      star6 += a;
      drawLayer(ctx, this.mini.layers[i], 0.15 + 0.55 * a);
    });
    const px = cx + Math.cos(L) * this.mini.geo.r0 * 0.35;
    const py = cy + Math.sin(L) * this.mini.geo.r0 * 0.35;
    const sa = 0.22 + 0.12 * (star6 / 3) + 0.4 * this.hit(0.6);
    for (const dir of SILK_DIRS) {
      const len = this.mini.geo.r0 * 0.95;
      const dx = Math.cos(dir + Math.PI / 2) * len;
      const dy = Math.sin(dir + Math.PI / 2) * len;
      const g = ctx.createLinearGradient(px - dx, py - dy, px + dx, py + dy);
      g.addColorStop(0, 'rgba(220,236,255,0)');
      g.addColorStop(0.5, `rgba(235,245,255,${sa})`);
      g.addColorStop(1, 'rgba(220,236,255,0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(px - dx, py - dy);
      ctx.lineTo(px + dx, py + dy);
      ctx.stroke();
    }
    dab(ctx, px, py, 16, '#eaf4ff', sa * 1.2);
  }

  /** The ruby's red glow (it fluoresces), stronger where the light falls and on a smack. */
  private fluoresce(ctx: Ctx, col: string): void {
    const [cx, cy] = this.mini.geo.c;
    const a = 0.16 + 0.06 * Math.sin(this.t * 1.3) + 0.4 * this.hit(0.6);
    dab(ctx, cx + Math.cos(this.L + Math.PI) * 14, cy + Math.sin(this.L + Math.PI) * 14, this.mini.geo.r0 * 0.75, col, a);
  }

  /** The amethyst flushes warmer and cooler as the light changes (its red flashes). */
  private flush(ctx: Ctx): void {
    const [cx, cy] = this.mini.geo.c;
    const w = 0.5 + 0.5 * Math.sin(this.t * 0.4 + this.L);
    dab(ctx, cx + Math.cos(this.L) * 20, cy + Math.sin(this.L) * 20, this.mini.geo.r0 * 0.8, '#ff4a9a', 0.12 * w);
    dab(ctx, cx - Math.cos(this.L) * 20, cy - Math.sin(this.L) * 20, this.mini.geo.r0 * 0.7, '#4a3aff', 0.1 * (1 - w));
  }

  /** Prismatic: rainbows sweeping through it as the light moves. */
  private rainbows(ctx: Ctx): void {
    const g = this.mini.geo;
    const [cx, cy] = g.c;
    const L = this.L;
    for (let i = 0; i < 2; i++) {
      const u = Math.sin(this.t * 0.35 + i * 2.1 + L) * 0.7;
      const ang = L + Math.PI / 2 + i * 0.9;
      const px = cx + Math.cos(ang - Math.PI / 2) * u * g.r0;
      const py = cy + Math.sin(ang - Math.PI / 2) * u * g.r0;
      const w = 16;
      const dx = Math.cos(ang - Math.PI / 2) * w;
      const dy = Math.sin(ang - Math.PI / 2) * w;
      const gr = ctx.createLinearGradient(px - dx, py - dy, px + dx, py + dy);
      const a = 0.22 + 0.25 * this.hit(0.7);
      gr.addColorStop(0, `rgba(${SPECTRUM[0]},0)`);
      for (let k = 0; k < 7; k++) gr.addColorStop(0.15 + k * 0.115, `rgba(${SPECTRUM[k]},${a})`);
      gr.addColorStop(1, `rgba(${SPECTRUM[7]},0)`);
      ctx.fillStyle = gr;
      ctx.fillRect(g.box.x, g.box.y, g.box.w, g.box.h);
    }
  }

  /** Guilloché: the engine-turned centre throws a two-lobed highlight that turns with the light. */
  private spin(ctx: Ctx): void {
    const g = this.mini.geo;
    const [cx, cy] = g.c;
    ctx.save();
    polyPath(ctx, g.table);
    ctx.clip();
    const turn = this.L + Math.PI / 2;
    const cg = ctx.createConicGradient(turn, cx, cy);
    const lobe = (at: number, w: number, a: number) => {
      cg.addColorStop(Math.max(0, at - w), 'rgba(255,255,255,0)');
      cg.addColorStop(at, `rgba(255,255,255,${a})`);
      cg.addColorStop(Math.min(1, at + w), 'rgba(255,255,255,0)');
    };
    cg.addColorStop(0, 'rgba(255,255,255,0)');
    const a = 0.5 + 0.4 * this.hit(0.5);
    lobe(0.25, 0.06, a);
    lobe(0.75, 0.06, a * 0.75);
    cg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = cg;
    ctx.fillRect(cx - 50, cy - 50, 100, 100);
    ctx.restore();
  }

  /** A polished field: a broad soft highlight drifting with the light. */
  private sheen(ctx: Ctx): void {
    const g = this.mini.geo;
    const [cx, cy] = g.c;
    const px = cx + Math.cos(this.L) * g.r0 * 0.45;
    const py = cy + Math.sin(this.L) * g.r0 * 0.4;
    dab(ctx, px, py, g.r0 * 0.7, '#ffffff', 0.3 + 0.3 * this.hit(0.5), 0.5, this.L + Math.PI / 2);
    // brushed metal: the highlight stretched across the brushing
    if (this.mini.def.engrave === 'circuit') {
      const y = cy + Math.sin(this.L) * g.r0 * 0.6 + (this.e - 0.95) * 60;
      const lg = ctx.createLinearGradient(0, y - 14, 0, y + 14);
      lg.addColorStop(0, 'rgba(255,255,255,0)');
      lg.addColorStop(0.5, `rgba(255,255,255,${0.3 + 0.3 * this.hit(0.5)})`);
      lg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(g.box.x, y - 14, g.box.w, 28);
    }
  }

  /** The Golden Feather: a sheen runs up its barbs as the light moves. */
  private featherSheen(ctx: Ctx): void {
    const g = this.mini.geo;
    const [cx, cy] = g.c;
    const lit = this.mini.layers[0];
    const u = ((this.t * 0.22 + (this.L - L0) * 0.4) % 1.6) - 0.3;
    const at = cy + 70 - u * 150;
    const a = 0.75 + 0.5 * this.hit(0.6);
    // the lit barbs through a band crossing the feather (a gradient used as the layer's mask)
    ctx.save();
    ctx.beginPath();
    ctx.rect(g.box.x, at - 22, g.box.w, 44);
    ctx.clip();
    drawLayer(ctx, lit, a * 0.55);
    ctx.restore();
    dab(ctx, cx - 10 + (cy - at) * 0.35, at, 34, '#fff6d0', 0.22 * a, 0.45, -0.75);
    if (this.sm < 0.5) drawLayer(ctx, lit, (1 - this.sm / 0.5) * 0.45);
    this.sheen(ctx);
  }

  /** Platinum Prop: light pulses running out along the circuit to the pavé pads. */
  private circuitLive(ctx: Ctx): void {
    const tr = this.mini.traces;
    const pt: Pt = [0, 0];
    for (const p of this.pulses) {
      if (p.wait > 0) continue;
      const t = tr[p.tr];
      for (let k = 0; k < 7; k++) {
        const d0 = p.d - k * 3;
        if (d0 < 0) break;
        along(t.pts, d0, pt);
        dab(ctx, pt[0], pt[1], 4.5 - k * 0.4, '#ffffff', 0.9 * (1 - k / 7));
      }
      along(t.pts, p.d, pt);
      dab(ctx, pt[0], pt[1], 9, '#cfe6ff', 0.5);
    }
    // a smack: every trace lights at once
    const h = this.hit(0.5);
    if (h > 0.02)
      for (const t of tr) {
        polyline(ctx, t.pts);
        ctx.strokeStyle = `rgba(235,246,255,${0.9 * h})`;
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }
  }

  /** The pearl: the highlight where the light falls, its orient (pink one side, green the other) sliding round it, a
   *  warm reflected light under; a smack sends a ring of iridescence across it. */
  private pearl(ctx: Ctx): void {
    const g = this.mini.geo;
    const [cx, cy] = g.c;
    const rr = g.r0;
    const L = this.L;
    const at = (a: number, k: number): Pt => [cx + Math.cos(a) * rr * k, cy + Math.sin(a) * rr * k];
    const [p1x, p1y] = at(L + 0.95, 0.42);
    const [p2x, p2y] = at(L - 0.95, 0.45);
    const [p3x, p3y] = at(L + Math.PI, 0.5);
    dab(ctx, p1x, p1y, rr * 0.62, '#ff9ac4', 0.55, 0.8, L);
    dab(ctx, p2x, p2y, rr * 0.58, '#7ee8cc', 0.46, 0.8, L);
    dab(ctx, p3x, p3y, rr * 0.62, '#b494f0', 0.32, 0.8, L);
    // the reflected light under it, warm
    const [qx, qy] = at(L + Math.PI, 0.7);
    dab(ctx, qx, qy, rr * 0.35, '#fff0d8', 0.35, 0.5, L + Math.PI / 2);
    // the highlight: a broad soft bloom and a sharp core, with the room's window in it
    const [hx, hy] = at(L, 0.4 + (1.05 - this.e) * 0.3);
    dab(ctx, hx, hy, rr * 0.45, '#ffffff', 0.75, 0.85, L);
    ellipse(ctx, hx, hy, 9, 5.2, L + Math.PI / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fill();
    windowBars(ctx, hx + 2, hy + 2, 22, 0.35, 0.05);
    const h = this.sm / 0.6;
    if (h < 1) {
      // a ring of orient runs out across it
      const r0 = 6 + rr * 1.05 * Math.pow(h, 0.8);
      // (a soft sheen: wide, pale, fading at both edges)
      for (const [w, a] of [[22, 0.12], [12, 0.18], [5, 0.22]] as [number, number][]) {
        const cg = ctx.createConicGradient(this.t, cx, cy);
        for (let k = 0; k <= 10; k++) cg.addColorStop(k / 10, `rgba(${SPECTRUM[k % 10]},${a * (1 - h)})`);
        ctx.beginPath();
        ctx.arc(cx, cy, r0, 0, TAU);
        ctx.strokeStyle = cg;
        ctx.lineWidth = w * (1 - h * 0.5);
        ctx.stroke();
      }
    }
    if (this.bloomT >= 0) dab(ctx, cx, cy, rr, '#fff4fa', 0.2 * Math.sin(Math.PI * this.bloomT));
  }

  /** The Fire Opal's play of colour: three sets of patches, each flashing as the light comes round to it. */
  private opal(ctx: Ctx): void {
    const L = this.L;
    const h = this.hit(0.8);
    for (let k = 0; k < 3; k++) {
      const v = Math.pow(0.5 + 0.5 * Math.cos(L * 2.4 - k * 2.1 + this.t * 0.12 + this.e), 2);
      drawLayer(ctx, this.mini.layers[k], 0.12 + 0.85 * v + 0.6 * h);
    }
    // pinfire: tiny points of colour winking in and out
    const g = this.mini.geo;
    const [cx, cy] = g.c;
    for (let i = 0; i < 6; i++) {
      const ph = i * 1.7;
      const a = Math.pow(Math.max(0, Math.sin(this.t * (1.3 + i * 0.2) + ph)), 8);
      if (a < 0.05) continue;
      const an = i * 2.4 + 0.4;
      const dd = g.r0 * (0.25 + ((i * 0.37) % 0.6));
      dab(ctx, cx + Math.cos(an) * dd, cy + Math.sin(an) * dd, 5, `#${['3affa0', '3ac8ff', 'a05aff', 'ff4a8a', 'ffd23a', '5aff5a'][i]}`, 0.9 * a);
    }
    // the dome: deeper at its edge, its polish where the light falls
    const vg = ctx.createRadialGradient(cx, cy, g.r0 * 0.55, cx, cy, g.r0 * 1.05);
    vg.addColorStop(0, 'rgba(90,20,0,0)');
    vg.addColorStop(1, 'rgba(90,20,0,0.5)');
    ctx.fillStyle = vg;
    ctx.fillRect(g.box.x, g.box.y, g.box.w, g.box.h);
    const [hx, hy] = [cx + Math.cos(L) * g.r0 * 0.45, cy + Math.sin(L) * g.r0 * 0.45];
    dab(ctx, hx, hy, g.r0 * 0.4, '#fff6ea', 0.55, 0.7, L);
    ellipse(ctx, hx, hy, 7, 3.6, L + Math.PI / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fill();
    this.glass(ctx, 0.4);
  }

  /** Cosmic Crust: nebulae drifting, a galaxy turning, stars twinkling under a polished dome; a smack is a supernova. */
  private cosmic(ctx: Ctx): void {
    const g = this.mini.geo;
    const [cx, cy] = g.c;
    const [nebA, nebB, gal] = this.mini.layers;
    const turn = (l: Layer, a: number, alpha: number, op: GlobalCompositeOperation = 'source-over') => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(a);
      ctx.translate(-cx, -cy);
      ctx.globalCompositeOperation = op;
      drawLayer(ctx, l, alpha);
      ctx.restore();
    };
    const c = this.calm;
    turn(nebA, this.t * 0.04 * c, 0.9);
    turn(nebB, -this.t * 0.07 * c + 1, 0.7, 'lighter');
    turn(gal, this.t * 0.3 * c, 0.85 + 0.5 * this.hit(0.6), 'lighter');
    // stars twinkling, a few big ones with crosses
    for (let i = 0; i < 9; i++) {
      const a = Math.pow(0.5 + 0.5 * Math.sin(this.t * (0.9 + i * 0.23) + i * 2.3), 6);
      if (a < 0.05) continue;
      const an = i * 2.39 + 0.7;
      const dd = g.r0 * (0.3 + ((i * 0.29) % 0.62));
      this.glint(ctx, cx + Math.cos(an) * dd, cy + Math.sin(an) * dd * 0.9, 4 + (i % 3) * 2.5, a);
    }
    // a supernova on a smack: a white star at the middle, rays, a ring blowing out
    const k = this.sm / 0.7;
    if (k < 1) {
      dab(ctx, cx, cy, 20 + 60 * k, '#e8e0ff', 0.9 * (1 - k));
      this.glint(ctx, cx, cy, 40 * (1 - k * 0.4), 1 - k);
      ctx.beginPath();
      ctx.arc(cx, cy, 6 + g.r0 * 1.1 * Math.pow(k, 0.7), 0, TAU);
      ctx.strokeStyle = `rgba(200,180,255,${0.7 * (1 - k)})`;
      ctx.lineWidth = 6 * (1 - k) + 1;
      ctx.stroke();
      // stars streaking out
      for (let i = 0; i < 12; i++) {
        const an = (i / 12) * TAU + 0.2;
        const d0 = g.r0 * (0.15 + k * 0.9);
        const d1 = d0 + 10 + 18 * (1 - k);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(an) * d0, cy + Math.sin(an) * d0);
        ctx.lineTo(cx + Math.cos(an) * d1, cy + Math.sin(an) * d1);
        ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - k)})`;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
    }
    // the dome: dark at its edge, a polished highlight
    const vg = ctx.createRadialGradient(cx, cy, g.r0 * 0.6, cx, cy, g.r0 * 1.05);
    vg.addColorStop(0, 'rgba(4,2,14,0)');
    vg.addColorStop(1, 'rgba(4,2,14,0.6)');
    ctx.fillStyle = vg;
    ctx.fillRect(g.box.x, g.box.y, g.box.w, g.box.h);
    this.glass(ctx, 0.42);
  }

  /** The Crown Jewel's velvet: its pile catching the light on the side it comes from. */
  private velvet(ctx: Ctx): void {
    const g = this.mini.geo;
    const [cx, cy] = g.c;
    const px = cx + Math.cos(this.L) * g.r0 * 0.85;
    const py = cy + Math.sin(this.L) * g.r0 * 0.85;
    dab(ctx, px, py, g.r0 * 0.7, '#c890ff', 0.18, 0.55, this.L + Math.PI / 2);
  }

  /** The ultra-rares' bloom: a slow wash of light running out through the whole head. */
  private bloom(ctx: Ctx, g: Geo): void {
    if (this.bloomT < 0) return;
    const [cx, cy] = g.c;
    const u = this.bloomT;
    const r0 = g.r0 * (0.1 + 1.2 * u);
    const a = Math.sin(Math.PI * u) * 0.35;
    const bg = ctx.createRadialGradient(cx, cy, Math.max(0, r0 - 24), cx, cy, r0 + 10);
    bg.addColorStop(0, 'rgba(255,255,255,0)');
    bg.addColorStop(0.7, `rgba(255,255,255,${a})`);
    bg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(g.box.x, g.box.y, g.box.w, g.box.h);
  }
}

/** A point `d` along a polyline. */
function along(pts: Pt[], d: number, out: Pt): Pt {
  let rest = d;
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (rest <= l || i === pts.length - 1) {
      const k = l ? Math.max(0, Math.min(1, rest / l)) : 0;
      out[0] = pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k;
      out[1] = pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k;
      return out;
    }
    rest -= l;
  }
  out[0] = pts[0][0];
  out[1] = pts[0][1];
  return out;
}

// ════════════════════════════ the still ════════════════════════════

const stillMinis = new Map<string, GemMini | null>();

/** A gem peel's head, whole (the still): the stone at rest with its light, the band and studs. Drawn over the handle
 *  (it is the look's `custom`). */
export function paintGemHead(ctx: Ctx, look: PeelLook): void {
  const m = ctx.getTransform();
  const RR = Math.max(1, Math.min(3, Math.round(Math.hypot(m.a, m.b))));
  const key = `${look.seed}@${RR}`;
  let mini = stillMinis.get(key);
  if (mini === undefined) stillMinis.set(key, (mini = gemMiniNow(look, RR)));
  gemUnder(ctx, look);
  if (mini) {
    const live = new GemLive(mini);
    live.rest();
    live.draw(ctx);
    live.pinGlint();
    gemOver(ctx, look);
    live.drawOver(ctx);
  } else gemOver(ctx, look);
}
