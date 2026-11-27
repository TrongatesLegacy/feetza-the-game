// Pizza peels: the pie sits on the head, fresh from the oven, and lives (a crafted kind, 'pizza': src/art/peelCraft.ts).
// One shared rig for every pizza, built from the pizza's own art (src/art/pizzaArt.ts, the drawing the table's pizzas
// use), painted in layers so what moves can move: the crust and sauce, the cheese, the toppings (a few pieces lifted
// onto a layer of their own so they can hop), a light map of where it shines (the cheese's highlights, the toppings'
// oil, wet sauce), and points where it bubbles.
//
// Every pizza: the light moving over it makes the cheese and the oil on the toppings glisten; the cheese blisters
// (bubbles swell and pop; a pie without cheese bubbles its sauce); fat on the cured meats sizzles; steam curls off it;
// in play the pie slides on its board as the peel swings. A smack bounces it on the board, a few toppings hop (cheese
// stretching after them and snapping), crumbs fly off the crust, a puff of steam.
// Its family's touches come from its data, not a recipe per pizza (PizzaTraits): a spicy pie's heat shimmers over it;
// a cold one (its perk chills or freezes) is frosted at the crust, the frost creeping in and back, a cold mist
// spilling off it instead of steam; a sweet one drips syrup (chocolate, honey, strawberry) off its edge; gold leaf and
// pearls glint; a Rare Find keeps its finish (its coloured glow, sparkles; the ghost's breathing); a calzone steams
// from its vents. The five fire pizzas keep their fire over all of it (src/art/lookFire.ts).
//
// The round pies sit on a wooden board, the Classic's beech (the board is painted once and shared). The layers (at the
// art's size) are painted once a step at a time in idle time and saved to the art cache, so the next visit decodes
// them; a rig draws them down to its size. Everything cosmetic uses crand().

import { scrollingNow } from './scrolling';
import {
  PEEL_HEAD,
  PIZZA_BOARD_R,
  drawInPlace,
  drawPizzaHilt,
  pizzaPlacement,
  sparkleStar,
  type PeelLook,
  type PizzaPlace,
} from './peelArt';
import { SB, woodUnder } from './peelCraftArt';
import { downTo } from './peelPlace';
import { CALZONE_CY, CALZONE_VENTS, PIZZA_R, PIZZA_SIZE, SAUCE, pizzaTopSteps, toppingOrder, type ToppingHook } from './pizzaArt';
import { FIRE_PEELS } from './lookFire';
import { INK } from './feetCommon';
import { ellipse, hashStr, makeCanvas, rgba, rng, shade, type Ctx } from './util';
import { PIZZA_BY_ID, type PizzaType, type Topping } from '../data/pizzas';
import { crand } from '../systems/cosmeticRandom';
import { save } from '../systems/save';
import { bitmapCanvas, cachedArt, readArt, writeArt } from '../game/artCache';
import PEEL_VERSION from 'virtual:peel-version';

const { x: HX, y: HY } = PEEL_HEAD;
type Pt = [number, number];

// ════════════════════════════ a pizza's family, from its data ════════════════════════════

/** Toppings too small to read when they hop (flecks, crumbs, herbs). */
const TINY = new Set<string>(['chili', 'parmesan', 'goldLeaf', 'oregano', 'blackPepper', 'chives', 'parsley', 'dill', 'aonori', 'bonito', 'breadcrumbs', 'starDust', 'sprinkles', 'rosemary', 'pepita', 'pineNut', 'caper', 'grahamCrumb', 'pistachio', 'sage', 'springOnion']);
/** Fatty, oily toppings: they glisten more and their fat sizzles. */
const OILY = new Set<string>(['pepperoni', 'salami', 'cupPepperoni', 'chorizo', 'nduja', 'calabreseSalami', 'sausage', 'bacon', 'guanciale', 'lardons', 'andouille', 'meatball', 'wagyu', 'mortadella', 'kebabMeat', 'steak', 'friedChicken', 'ribBone', 'brickChorizo', 'bronzePlates', 'muspelCoals']);
/** Oil poured over the whole pie. */
const OILED = new Set<string>(['grease', 'oliveOil', 'garlicButter']);
const SPICY = new Set<string>(['chili', 'jalapeno', 'hotSauce', 'longChili', 'scotchBonnet', 'nduja', 'pepperoncini', 'infernoCracks', 'lavaVents', 'flambeFlames', 'fireIce', 'cajunShrimp', 'jerkChicken', 'calabreseSalami', 'forgeGlow', 'emberCoals', 'surtrBlade', 'muspelCoals']);
const HOT_PERKS = new Set<string>(['burnStomper', 'burnHits', 'heatAbove', 'burnAbove', 'fireLane', 'hoverFire', 'erupt', 'frostFire', 'forgeWaves', 'emberTrail', 'surtrSpread']);
const COLD_PERKS = new Set<string>(['slowHits', 'firstFreeze', 'frostFire', 'snowball', 'frostbite']);
const GOLDISH = new Set<string>(['goldLeaf', 'pearl', 'fleeceCurls']);
const GOLD_RIMS = new Set<string>(['goldRim', 'crown', 'halo', 'anniv25']);
const SWEET = new Set<string>(['strawberry', 'chocolate', 'marshmallow', 'sprinkles', 'frostingRosette', 'candy', 'marshMountain', 'grahamCrumb', 'miniCreamPie', 'creamSplats', 'sandcastle', 'seaShell']);

/** Syrup colours (dark, body, light). */
const SYRUP = {
  choc: ['#2a1006', '#5c2c12', '#b0703e'],
  honey: ['#7a3c02', '#e09a1e', '#ffe48a'],
  pink: ['#8a1e4a', '#ee6a9e', '#ffd2e4'],
} as const;
export type SyrupKind = keyof typeof SYRUP;
const DROP = { choc: 'choc', honey: 'honey', pink: 'syrup' } as const;

export interface PizzaTraits {
  /** Steam wisps a second (0: none). */
  steam: number;
  /** What blisters: the cheese, the sauce, or nothing. */
  bubbles: 'cheese' | 'sauce' | null;
  /** The bubbles' colours: shade, body, light. */
  bubbleCol: [string, string, string];
  /** 0–1: how much the toppings glisten and sizzle. */
  oil: number;
  /** 0–1: the heat shimmering over it (1: one of the fire pizzas). */
  hot: number;
  cold: boolean;
  syrup: SyrupKind | null;
  sprinkles: boolean;
  gold: boolean;
  goldRim: boolean;
  /** A Rare Find's finish (its glow colour, sparkles, the ghost's breathing). */
  glow: number | null;
  sparkle: boolean;
  ghost: boolean;
  calzone: boolean;
  /** How hard it lands (deep dish and squares are heavy). */
  heavy: number;
  cheese: number;
}

const traitCache = new Map<string, PizzaTraits>();
export function pizzaTraits(p: PizzaType): PizzaTraits {
  const have = traitCache.get(p.id);
  if (have) return have;
  const tops = new Set<string>(p.toppings);
  const has = (s: Set<string>) => p.toppings.some((t) => s.has(t));
  const fire = !!FIRE_PEELS[`pizza:${p.id}`];
  const cold = COLD_PERKS.has(p.perk) || tops.has('fireIce');
  const hot = fire ? 1 : has(SPICY) || HOT_PERKS.has(p.perk) ? 0.6 : 0;
  const sweetTop = has(SWEET);
  const syrup: SyrupKind | null = p.base === 'choc' ? 'choc' : tops.has('honeyDrizzle') ? 'honey' : sweetTop && p.cheese === 0 ? 'pink' : null;
  const cheeseBubbles = p.shape !== 'calzone' && p.cheese >= 0.35;
  const sauceBase = p.base === 'tomato' || p.base === 'bbq' || p.base === 'pesto' || p.base === 'choc' || p.base === 'saffron' || p.base === 'pink';
  const bubbles = cheeseBubbles ? 'cheese' : p.shape !== 'calzone' && sauceBase ? 'sauce' : null;
  const sc = SAUCE[p.base];
  const oilN = p.toppings.filter((t) => OILY.has(t)).length;
  const t: PizzaTraits = {
    steam: cold ? 0 : p.shape === 'calzone' ? 1.6 : p.shape === 'deep' ? 1.4 : 1,
    bubbles,
    bubbleCol: bubbles === 'cheese' ? ['#a8581a', p.base === 'white' ? '#fff3d4' : '#ffe39a', '#fffbea'] : [shade(sc, -0.4), shade(sc, 0.08), shade(sc, 0.55)],
    oil: Math.min(1, oilN * 0.5 + (has(OILED) ? 0.8 : 0)),
    hot,
    cold,
    syrup,
    sprinkles: tops.has('sprinkles') || tops.has('candy'),
    gold: has(GOLDISH) || has(GOLD_RIMS),
    goldRim: has(GOLD_RIMS),
    glow: p.finish?.glow ?? null,
    sparkle: !!p.finish?.sparkle,
    ghost: !!p.finish?.ghost,
    calzone: p.shape === 'calzone',
    heavy: p.shape === 'deep' ? 0.7 : p.shape === 'square' ? 0.8 : 1,
    cheese: p.cheese,
  };
  traitCache.set(p.id, t);
  return t;
}

// ════════════════════════════ the layers (art space, painted once per pizza) ════════════════════════════

/** A lifted piece's cell on the hop sheet (art px, centred on the piece). */
const CELL = 120;
/** The pie is kept at this size (the biggest rig draws it at 2× its peel size, about 350 px). */
const PIE_PX = 352;
const SPEC_PX = 200;

export interface PaintData {
  /** The lifted pieces' centres (art px), in their cells' order. */
  hops: number[];
  /** Where it bubbles (cheese, else sauce), its oily pieces, its gold: art px, flattened [x, y, …]. */
  cheese: number[];
  sauce: number[];
  oil: number[];
  gold: number[];
}
interface Paint {
  /** The pie with the lifted pieces out, PIE_PX square. */
  pie: HTMLCanvasElement;
  /** Its light map (white, its alpha how much it shines), SPEC_PX square. */
  spec: HTMLCanvasElement;
  /** The lifted pieces, CELL × CELL each, side by side (art px). */
  sheet: HTMLCanvasElement | null;
  d: PaintData;
}

const paints = new Map<string, Paint>();
const PAINT_CAP = 16;
const paintKey = (id: string) => `pzpeel:${PEEL_VERSION}:${id}`;
function keepPaint(id: string, p: Paint): void {
  paints.delete(id);
  paints.set(id, p);
  while (paints.size > PAINT_CAP) paints.delete(paints.keys().next().value!);
}

const smooth01 = (x: number) => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};

/** A canvas kept in memory rather than on the GPU: the layers' pixels are read back (reading a GPU canvas stalls). */
function cpuCanvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  return [c, ctx];
}

/** The pieces to lift: from the last two kinds drawn that are big enough to read. */
function hopKinds(p: PizzaType): Set<string> {
  const order = toppingOrder(p).filter((t) => !TINY.has(t));
  return new Set(order.slice(-2));
}

function* paintSteps(p: PizzaType): Generator<void, Paint> {
  const S = PIZZA_SIZE;
  const C = S / 2;
  const [base, bx] = cpuCanvas(S, S);
  const [chz, cx] = cpuCanvas(S, S);
  const [tops, tx] = cpuCanvas(S, S);
  const [cell, cl] = cpuCanvas(CELL, CELL);
  const kinds = hopKinds(p);
  const hopPts: number[] = [];
  const hopImgs: HTMLCanvasElement[] = [];
  const oil: number[] = [];
  const gold: number[] = [];
  const each: ToppingHook = (t: Topping, x, y, n, draw) => {
    if (OILY.has(t)) oil.push(x, y);
    if (GOLDISH.has(t)) gold.push(x, y);
    let far = Math.hypot(x - C, y - C) < PIZZA_R * 0.64;
    for (let i = 0; far && i < hopPts.length; i += 2) far = Math.hypot(hopPts[i] - x, hopPts[i + 1] - y) > 74;
    if (!kinds.has(t) || n < 3 || hopPts.length >= 10 || !far) {
      draw(tx);
      return;
    }
    // drawn alone in its cell; lifted if it's big enough to read, put back where it was if not
    cl.setTransform(1, 0, 0, 1, 0, 0);
    cl.clearRect(0, 0, CELL, CELL);
    cl.setTransform(1, 0, 0, 1, CELL / 2 - x, CELL / 2 - y);
    draw(cl);
    cl.setTransform(1, 0, 0, 1, 0, 0);
    if (alphaSpan(cl) < 20) {
      tx.drawImage(cell, x - CELL / 2, y - CELL / 2);
      return;
    }
    const [hc, hx] = makeCanvas(CELL, CELL);
    hx.drawImage(cell, 0, 0);
    hopImgs.push(hc);
    hopPts.push(x, y);
  };
  const gen = pizzaTopSteps(p, { base: bx, cheese: cx, tops: tx, each });
  while (!gen.next().done) yield;
  yield;
  // the pie, drawn down to its kept size
  const [full, fx] = cpuCanvas(S, S);
  fx.drawImage(base, 0, 0);
  fx.drawImage(chz, 0, 0);
  fx.drawImage(tops, 0, 0);
  const pie = downTo(full, PIE_PX, PIE_PX);
  yield;
  // the light map and the bubbling points, from the layers at half size
  const N = SPEC_PX;
  const [a, ax] = cpuCanvas(N, N);
  const read = (src: HTMLCanvasElement) => {
    ax.clearRect(0, 0, N, N);
    ax.drawImage(src, 0, 0, N, N);
    return ax.getImageData(0, 0, N, N).data;
  };
  const cd = read(chz);
  const td = read(tops);
  const bd = read(base);
  const out = ax.createImageData(N, N);
  const od = out.data;
  const k = S / N;
  const calz = p.shape === 'calzone';
  const tr = pizzaTraits(p);
  const wet = p.base !== 'white' && p.base !== 'moon';
  const cheesePts: number[] = [];
  const saucePts: number[] = [];
  const lum = (d: Uint8ClampedArray, i: number) => (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
  for (let y = 0; y < N; y++) {
    // (in two idle steps)
    if (y === N / 2) yield;
    for (let x = 0; x < N; x++) {
      const i = (y * N + x) * 4;
      const ca = cd[i + 3] / 255;
      const ta = td[i + 3] / 255;
      const ba = bd[i + 3] / 255;
      const r = Math.hypot(x * k - C, y * k - C) / PIZZA_R;
      let s = 0;
      if (calz) s = ba * smooth01((lum(bd, i) - 0.55) / 0.35) * 0.4;
      else {
        // the cheese's highlights, the toppings' oil and shine, a wet sheen on the sauce
        const sc = ca * smooth01((lum(cd, i) - 0.72) / 0.22) * (1 - ta);
        const st = ta * smooth01((lum(td, i) - 0.58) / 0.32) * (0.4 + 0.5 * tr.oil);
        const sb = wet && r < 0.78 ? ba * (1 - ca) * (1 - ta) * (p.base === 'choc' ? 0.6 : 0.3) * smooth01((0.78 - r) / 0.06) : 0;
        // the crust's puffed rim catches a little
        const cr = r > 0.82 && r < 0.98 ? ba * (1 - ta) * 0.16 * smooth01((lum(bd, i) - 0.5) / 0.3) : 0;
        s = Math.max(sc * 0.9, st, sb, cr);
        if (x % 5 === 2 && y % 5 === 2 && r < 0.66) {
          if (ca > 0.85 && ta < 0.05) cheesePts.push(x * k, y * k);
          else if (ca < 0.08 && ta < 0.05 && ba > 0.9) saucePts.push(x * k, y * k);
        }
      }
      od[i] = od[i + 1] = od[i + 2] = 255;
      od[i + 3] = Math.round(255 * Math.min(1, s));
    }
  }
  ax.putImageData(out, 0, 0);
  const spec = a;
  yield;
  let sheet: HTMLCanvasElement | null = null;
  if (hopImgs.length) {
    const [sh, sx] = makeCanvas(CELL * hopImgs.length, CELL);
    hopImgs.forEach((h, i) => sx.drawImage(h, i * CELL, 0));
    sheet = sh;
  }
  const pick = (pts: number[], n: number, seed: string) => {
    const r = rng(hashStr(p.id + seed));
    const out: number[] = [];
    const idx = Array.from({ length: pts.length / 2 }, (_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    for (const i of idx.slice(0, n)) out.push(Math.round(pts[i * 2]), Math.round(pts[i * 2 + 1]));
    return out;
  };
  const d: PaintData = { hops: hopPts, cheese: pick(cheesePts, 28, 'c'), sauce: pick(saucePts, 20, 's'), oil: pick(oil, 16, 'o'), gold: pick(gold, 12, 'g') };
  return { pie, spec, sheet, d };
}

/** How wide the drawn part of a cell is (px). */
function alphaSpan(ctx: Ctx): number {
  const data = ctx.getImageData(0, 0, CELL, CELL).data;
  let x0 = CELL;
  let x1 = -1;
  let y0 = CELL;
  let y1 = -1;
  for (let y = 0; y < CELL; y += 2)
    for (let x = 0; x < CELL; x += 2)
      if (data[(y * CELL + x) * 4 + 3] > 80) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  return x1 < 0 ? 0 : Math.max(x1 - x0, y1 - y0);
}

/** A pizza's layers from the art cache, if they're there (decoded off the main thread). */
async function paintFromCache(id: string): Promise<boolean> {
  if (paints.has(id)) return true;
  const key = paintKey(id);
  if (!cachedArt(key)) return false;
  const r = await readArt(key, 1500);
  const d = r?.data as PaintData | null;
  if (!r || !d || !Array.isArray(d.hops) || r.bitmaps.length < 2) {
    r?.bitmaps.forEach((b) => b.close());
    return false;
  }
  if (!paints.has(id)) keepPaint(id, { pie: bitmapCanvas(r.bitmaps[0]), spec: bitmapCanvas(r.bitmaps[1]), sheet: r.bitmaps[2] ? bitmapCanvas(r.bitmaps[2]) : null, d });
  else r.bitmaps.forEach((b) => b.close());
  return true;
}

/** Pizzas waiting to be painted, one at a time (a locker tab asks for dozens at once: painting them side by side
 *  would stack their idle steps into long frames). */
interface PaintJob {
  id: string;
  p: PizzaType;
  gen: Generator<void, Paint> | null;
  waiters: { done: () => void; wanted: () => boolean }[];
}
const queue: PaintJob[] = [];
let pumping = false;
// (held back while the player scrolls: src/art/scrolling.ts)
const idle = (fn: (d?: IdleDeadline) => void): void => {
  const go = (d?: IdleDeadline) => (scrollingNow() ? setTimeout(() => idle(fn), 90) : fn(d));
  if (typeof requestIdleCallback === 'function') requestIdleCallback(go, { timeout: 200 });
  else setTimeout(() => go(), 16);
};

function pumpPaint(d?: IdleDeadline): void {
  const t0 = performance.now();
  const budget = () => (d && !d.didTimeout ? d.timeRemaining() > 3 : performance.now() - t0 < 6);
  try {
    while (queue.length && budget()) {
      const job = queue[0];
      if (!job.gen) {
        // (nobody wants it any more, scrolled away: dropped; it's asked for again when it's back)
        job.waiters = job.waiters.filter((w) => w.wanted() || (w.done(), false));
        if (!job.waiters.length) {
          queue.shift();
          continue;
        }
        job.gen = paintSteps(job.p);
      }
      let r: IteratorResult<void, Paint | null>;
      try {
        r = job.gen.next();
      } catch (e) {
        if (import.meta.env?.DEV) console.error('[peelPizza] painting', job.id, e);
        r = { done: true, value: null };
      }
      if (r.done) {
        queue.shift();
        const v = r.value;
        if (v) {
          keepPaint(job.id, v);
          writeArt(paintKey(job.id), v.sheet ? [v.pie, v.spec, v.sheet] : [v.pie, v.spec], v.d, true);
        }
        for (const w of job.waiters) w.done();
      }
    }
  } finally {
    if (queue.length) idle(pumpPaint);
    else pumping = false;
  }
}

/** Have a pizza's layers ready (from the art cache, or painted a layer per idle moment), for its peel's rig. Resolves
 *  early, unpainted, if it stops being wanted before its turn. */
export async function pizzaPaintAsync(id: string, wanted: () => boolean = () => true): Promise<void> {
  const p = PIZZA_BY_ID[id];
  if (paints.has(id) || !p) return;
  if (await paintFromCache(id)) return;
  if (paints.has(id)) return;
  await new Promise<void>((done) => {
    let job = queue.find((j) => j.id === id);
    if (!job) queue.push((job = { id, p, gen: null, waiters: [] }));
    job.waiters.push({ done, wanted });
    if (!pumping) {
      pumping = true;
      idle(pumpPaint);
    }
  });
}

export const pizzaPaintReady = (id: string): boolean => paints.has(id);

/** A pizza's painted layers, for the living table pizzas (src/game/pizzaAlive.ts), once pizzaPaintAsync has them: the
 *  pie with its lifted pieces out (PIE_PX square), its light map (SPEC_PX square), the lifted pieces (CELL px cells
 *  side by side) and the points (art px): where it bubbles, its oily pieces, its gold, the lifted pieces' centres. */
export function pizzaPaintData(id: string): { pie: HTMLCanvasElement; spec: HTMLCanvasElement; sheet: HTMLCanvasElement | null; cell: number; d: PaintData } | null {
  const p = paints.get(id);
  return p ? { pie: p.pie, spec: p.spec, sheet: p.sheet, cell: CELL, d: p.d } : null;
}

// ════════════════════════════ what's painted the same in the still and the rig ════════════════════════════

/** The board: the Classic's beech, turned round, its edge chamfered and lit from the top left, a soft shadow under. */
export function paintBoard(ctx: Ctx, look: PeelLook): void {
  const r = PIZZA_BOARD_R;
  // its shadow on whatever's behind (soft, down and to the right)
  for (let i = 0; i < 4; i++) {
    ellipse(ctx, HX + 1.5, HY + 3.5, r + 1.5 - i * 1.2, r + 1.5 - i * 1.2);
    ctx.fillStyle = `rgba(30,14,4,${0.05 + i * 0.012})`;
    ctx.fill();
  }
  ctx.save();
  ellipse(ctx, HX, HY, r, r);
  ctx.clip();
  woodUnder(ctx, { ...look, shiny: false }, true);
  // the turned edge: a chamfer lit on its top left, shaded on its bottom right
  const g = ctx.createLinearGradient(HX - r * 0.75, HY - r * 0.75, HX + r * 0.75, HY + r * 0.75);
  g.addColorStop(0, 'rgba(255,244,220,0.75)');
  g.addColorStop(0.42, 'rgba(255,244,220,0)');
  g.addColorStop(0.58, 'rgba(58,26,6,0)');
  g.addColorStop(1, 'rgba(58,26,6,0.45)');
  ellipse(ctx, HX, HY, r - 3.5, r - 3.5);
  ctx.strokeStyle = g;
  ctx.lineWidth = 9;
  ctx.stroke();
  ctx.restore();
  ellipse(ctx, HX, HY, r, r);
  ctx.strokeStyle = look.rim ?? INK;
  ctx.lineWidth = 5;
  ctx.stroke();
}

/** The pie's contact shadow: its silhouette, softened, at `px` px per peel unit, with `pad` peel units round it. */
const SHADOW_PAD = 8;
function pieShadow(src: HTMLCanvasElement, pl: PizzaPlace, px: number): HTMLCanvasElement {
  const w = Math.ceil((pl.w + SHADOW_PAD * 2) * px);
  const h = Math.ceil((pl.h + SHADOW_PAD * 2) * px);
  const [c, ctx] = makeCanvas(w, h);
  // (drawn off the canvas, so only its shadow lands on it)
  ctx.shadowColor = 'rgba(0,0,0,1)';
  ctx.shadowBlur = 4.5 * px;
  ctx.shadowOffsetX = w + 40;
  ctx.drawImage(src, SHADOW_PAD * px - w - 40, SHADOW_PAD * px, pl.w * px, pl.h * px);
  return c;
}

/** Draw the shadow, `lift` (0 at rest) raising the pie off the board. */
function drawShadow(ctx: Ctx, sh: HTMLCanvasElement, pl: PizzaPlace, lift: number, cx: number, cy: number, ghost = 1): void {
  const s = 1 + 0.05 * lift;
  ctx.save();
  ctx.globalAlpha = (pl.round ? 0.3 : 0.36) * (1 - 0.35 * lift) * ghost;
  ctx.translate(cx + 1.6 + 3.2 * lift, cy + (pl.round ? 2.6 : 3.4) + 4.6 * lift);
  ctx.scale(s, s);
  ctx.translate(-cx, -cy);
  if (pl.flip) {
    ctx.translate(0, pl.y * 2 + pl.h);
    ctx.scale(1, -1);
  }
  ctx.drawImage(sh, pl.x - SHADOW_PAD, pl.y - SHADOW_PAD, pl.w + SHADOW_PAD * 2, pl.h + SHADOW_PAD * 2);
  ctx.restore();
}

/** Frost on a cold pie (art space, 400 px): the crust rimed (outer), and feathers of frost reaching in (inner). */
const frosts = new Map<string, [HTMLCanvasElement, HTMLCanvasElement]>();
export function frostArt(p: PizzaType): [HTMLCanvasElement, HTMLCanvasElement] {
  const have = frosts.get(p.id);
  if (have) return have;
  const S = PIZZA_SIZE;
  const C = S / 2;
  const R0 = PIZZA_R;
  const r = rng(hashStr(p.id + 'frost'));
  const sq = p.shape === 'square';
  // a point on the rim at u (0–1 round it), d px in from the edge, and the way in
  const rim = (u: number, d: number): [number, number, number, number] => {
    const a = u * Math.PI * 2;
    if (!sq) return [C + Math.cos(a) * (R0 - d), C + Math.sin(a) * (R0 - d), -Math.cos(a), -Math.sin(a)];
    const cx = Math.cos(a);
    const cy = Math.sin(a);
    const m = Math.max(Math.abs(cx), Math.abs(cy));
    const nx = Math.abs(cx) >= Math.abs(cy) ? -Math.sign(cx) : 0;
    const ny = nx ? 0 : -Math.sign(cy);
    return [C + (cx / m) * (R0 - d), C + (cy / m) * (R0 - d), nx, ny];
  };
  const [o, ox] = makeCanvas(S, S);
  // a soft rime over the crust
  if (!sq) {
    const g = ox.createRadialGradient(C, C, R0 * 0.8, C, C, R0 * 1.01);
    g.addColorStop(0, 'rgba(214,236,255,0)');
    g.addColorStop(0.55, 'rgba(214,236,255,0.3)');
    g.addColorStop(0.9, 'rgba(236,246,255,0.5)');
    g.addColorStop(1, 'rgba(200,226,255,0)');
    ox.fillStyle = g;
    ox.fillRect(0, 0, S, S);
  }
  const crystal = (ctx: Ctx, x: number, y: number, nx: number, ny: number, len: number, w: number, a: number, depth: number) => {
    const ang = Math.atan2(ny, nx) + (r() - 0.5) * 1.4;
    const ex = x + Math.cos(ang) * len;
    const ey = y + Math.sin(ang) * len;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(ex, ey);
    ctx.strokeStyle = `rgba(250,253,255,${a})`;
    ctx.lineWidth = w;
    ctx.stroke();
    if (depth > 0)
      for (let b = 0; b < 2; b++) {
        const t = 0.35 + r() * 0.4;
        const bx = x + (ex - x) * t;
        const by = y + (ey - y) * t;
        const ba = ang + (b ? 0.8 : -0.8);
        crystal(ctx, bx, by, Math.cos(ba), Math.sin(ba), len * 0.45, w * 0.7, a * 0.85, depth - 1);
      }
  };
  ox.lineCap = 'round';
  for (let i = 0; i < 110; i++) {
    const [x, y, nx, ny] = rim(r(), r() * 22);
    crystal(ox, x, y, nx, ny, 4 + r() * 9, 1 + r() * 1.2, 0.45 + r() * 0.45, 1);
  }
  for (let i = 0; i < 70; i++) {
    const [x, y] = rim(r(), r() * 26);
    ox.fillStyle = `rgba(255,255,255,${0.5 + r() * 0.5})`;
    ox.beginPath();
    ox.arc(x, y, 0.8 + r() * 1.4, 0, Math.PI * 2);
    ox.fill();
  }
  // feathers of frost reaching in over the cheese, with a breath of rime round them
  const [n, nxc] = makeCanvas(S, S);
  nxc.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    const [x, y, nx, ny] = rim((i + r() * 0.6) / 20, 14 + r() * 8);
    const len = 14 + r() * 16;
    const g = nxc.createRadialGradient(x + nx * len * 0.5, y + ny * len * 0.5, 0, x + nx * len * 0.5, y + ny * len * 0.5, len * 0.75);
    g.addColorStop(0, 'rgba(230,244,255,0.28)');
    g.addColorStop(1, 'rgba(230,244,255,0)');
    nxc.fillStyle = g;
    nxc.fillRect(x + nx * len * 0.5 - len, y + ny * len * 0.5 - len, len * 2, len * 2);
    // a fern: a spine with leaflets
    let px = x;
    let py = y;
    let ang = Math.atan2(ny, nx);
    const steps = 6;
    for (let s = 0; s < steps; s++) {
      ang += (r() - 0.5) * 0.35;
      const sl = len / steps;
      const qx = px + Math.cos(ang) * sl;
      const qy = py + Math.sin(ang) * sl;
      const w = 2.2 * (1 - s / steps) + 0.5;
      nxc.beginPath();
      nxc.moveTo(px, py);
      nxc.lineTo(qx, qy);
      nxc.strokeStyle = `rgba(248,252,255,${0.85 - s * 0.08})`;
      nxc.lineWidth = w;
      nxc.stroke();
      for (const sd of [-1, 1]) {
        const la = ang + sd * (0.9 + r() * 0.3);
        const ll = sl * (1.3 - s / steps) * (0.7 + r() * 0.4);
        nxc.beginPath();
        nxc.moveTo(qx, qy);
        nxc.lineTo(qx + Math.cos(la) * ll, qy + Math.sin(la) * ll);
        nxc.strokeStyle = `rgba(240,248,255,${0.6 - s * 0.06})`;
        nxc.lineWidth = w * 0.6;
        nxc.stroke();
      }
      px = qx;
      py = qy;
    }
  }
  const out: [HTMLCanvasElement, HTMLCanvasElement] = [o, n];
  frosts.set(p.id, out);
  return out;
}

/** Where the inner frost has crept to (a share of the pie's radius from its middle; it shows outside it). */
const FROST_REST = 0.7;
function frostMask(ctx: Ctx, cx: number, cy: number, pr: number, reach: number): void {
  const g = ctx.createRadialGradient(cx, cy, pr * Math.max(0, reach - 0.12), cx, cy, pr * reach);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = g;
  ctx.fillRect(cx - pr * 1.2, cy - pr * 1.2, pr * 2.4, pr * 2.4);
}

/** Where a sweet pie's syrup drips from (peel units): just inside the pie's lower edge, either side of the hilt. */
function dripAnchors(pl: PizzaPlace, cx: number, cy: number, pr: number): { x: number; y: number; end: number }[] {
  return [-0.62, 0.6].map((dx) => {
    const x = cx + dx * pr;
    const y = cy + Math.sqrt(Math.max(0, 1 - dx * dx)) * pr - 3;
    // it runs to the board's edge (or a short way down a pie without one)
    const by = pl.round ? HY + Math.sqrt(Math.max(0, PIZZA_BOARD_R ** 2 - (x - HX) ** 2)) - 2 : y + 9;
    return { x, y, end: by - y };
  });
}

/** A drip of syrup from (x, y) running down `len` (peel units), a bead at its end. */
function drawDrip(ctx: Ctx, kind: SyrupKind, x: number, y: number, len: number, bead: number): void {
  if (len < 0.5) return;
  const [dk, body, lt] = SYRUP[kind];
  const w = 4.4;
  const by = y + len;
  // its shadow on the board, down and to the right
  ctx.beginPath();
  ctx.moveTo(x - w / 2 + 1.2, y + 1.5);
  ctx.quadraticCurveTo(x + 1.5, by - 1, x + 1.2 + w * 0.3, by + 1.5);
  ctx.lineTo(x + 1.2 + w * 0.6, by + 1.5);
  ctx.strokeStyle = 'rgba(30,10,2,0.25)';
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.stroke();
  // the run, tapering a little, and the bead
  const g = ctx.createLinearGradient(x - w, 0, x + w, 0);
  g.addColorStop(0, lt);
  g.addColorStop(0.35, body);
  g.addColorStop(1, dk);
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y - 1);
  ctx.bezierCurveTo(x - w * 0.45, y + len * 0.5, x - w * 0.35, by - bead, x - bead * 0.8, by);
  ctx.arc(x, by, bead, Math.PI, 0, true);
  ctx.bezierCurveTo(x + w * 0.35, by - bead, x + w * 0.45, y + len * 0.5, x + w / 2, y - 1);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = rgba(dk, 0.7);
  ctx.lineWidth = 0.7;
  ctx.stroke();
  // lit: a streak down its left, a glint on the bead
  ctx.beginPath();
  ctx.moveTo(x - w * 0.22, y + 0.5);
  ctx.lineTo(x - w * 0.18, by - bead * 0.6);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 0.7;
  ctx.stroke();
  ellipse(ctx, x - bead * 0.35, by - bead * 0.3, bead * 0.3, bead * 0.22, -0.5);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fill();
}

const DRIP_REST = [0.62, 0.3];

/** Where the pie's middle and radius are (peel units). */
function pieCentre(p: PizzaType, pl: PizzaPlace): [number, number, number] {
  const k = pl.w / PIZZA_SIZE;
  const ay = p.shape === 'calzone' ? CALZONE_CY + PIZZA_R * 0.45 : PIZZA_SIZE / 2;
  return [pl.x + (PIZZA_SIZE / 2) * k, pl.flip ? pl.y + pl.h - ay * k : pl.y + ay * k, PIZZA_R * k];
}

/** A pizza peel's head, whole (the still): the board, the pie at rest on it, its frost or syrup, the hilt. */
export function paintPizzaHead(ctx: Ctx, look: PeelLook): void {
  const art = look.pizzaArt;
  const p = look.pizza ? PIZZA_BY_ID[look.pizza] : undefined;
  if (!art || !p) return;
  const tr = pizzaTraits(p);
  const pl = pizzaPlacement(look, art);
  const [cx, cy, pr] = pieCentre(p, pl);
  if (pl.round) paintBoard(ctx, look);
  const m = ctx.getTransform();
  const RR = Math.max(1, Math.hypot(m.a, m.b));
  drawShadow(ctx, pieShadow(art, pl, RR * 0.5), pl, 0, cx, cy);
  ctx.save();
  ctx.imageSmoothingQuality = 'high';
  drawInPlace(ctx, downTo(art, Math.ceil(pl.w * RR), Math.ceil(pl.h * RR)), pl);
  ctx.restore();
  if (tr.cold && !tr.calzone) {
    const [o, n] = frostArt(p);
    drawInPlace(ctx, o, pl);
    const [fc, fx] = makeCanvas(Math.ceil(pl.w * RR), Math.ceil(pl.h * RR));
    fx.drawImage(n, 0, 0, fc.width, fc.height);
    fx.globalCompositeOperation = 'destination-in';
    fx.setTransform(fc.width / pl.w, 0, 0, fc.height / pl.h, (-pl.x * fc.width) / pl.w, (-pl.y * fc.height) / pl.h);
    frostMask(fx, cx, cy, pr, FROST_REST);
    drawInPlace(ctx, fc, pl);
  }
  if (tr.syrup) dripAnchors(pl, cx, cy, pr).forEach((a, i) => drawDrip(ctx, tr.syrup!, a.x, a.y, a.end * DRIP_REST[i], 2.9));
  drawPizzaHilt(ctx, look, pl.bottom);
}

// ════════════════════════════ the mini: the layers at a rig's size ════════════════════════════

export interface PizzaHop {
  img: HTMLCanvasElement;
  /** Its centre at rest and its cell's size (peel units). */
  x: number;
  y: number;
  s: number;
}

export interface PizzaMini {
  p: PizzaType;
  tr: PizzaTraits;
  look: PeelLook;
  RR: number;
  pl: PizzaPlace;
  /** The pie's middle and radius (peel units). */
  cx: number;
  cy: number;
  pr: number;
  /** The pie with the lifted pieces out, its light map (at half the rig's detail) and contact shadow. */
  pie: HTMLCanvasElement;
  spec: HTMLCanvasElement;
  shadow: HTMLCanvasElement;
  hops: PizzaHop[];
  /** Peel units. */
  cheese: Pt[];
  sauce: Pt[];
  oil: Pt[];
  gold: Pt[];
  vents: Pt[];
  frost: [HTMLCanvasElement, HTMLCanvasElement] | null;
  drips: { x: number; y: number; end: number }[];
}

/** The board, painted once per rig detail and shared by every round pie (SB box). */
const boards = new Map<number, HTMLCanvasElement>();
export function pizzaBoard(look: PeelLook, RR: number): HTMLCanvasElement {
  let b = boards.get(RR);
  if (!b) {
    const [c, ctx] = makeCanvas(SB.w * RR, SB.h * RR);
    ctx.setTransform(RR, 0, 0, RR, -SB.x * RR, -SB.y * RR);
    paintBoard(ctx, look);
    boards.set(RR, (b = c));
  }
  return b;
}

/** A canvas drawn into a pizza's box at RR, flipped for a calzone. */
function inBox(src: HTMLCanvasElement, pl: PizzaPlace, px: number): HTMLCanvasElement {
  const w = Math.ceil(pl.w * px);
  const h = Math.ceil(pl.h * px);
  const d = downTo(src, w, h);
  if (!pl.flip) return d === src ? copy(d) : d;
  const [c, ctx] = makeCanvas(w, h);
  ctx.translate(0, h);
  ctx.scale(1, -1);
  ctx.drawImage(d, 0, 0, w, h);
  return c;
}
function copy(src: HTMLCanvasElement): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(src.width, src.height);
  ctx.drawImage(src, 0, 0);
  return c;
}

/** The mini for a rig (canvas px per peel unit RR): its layers drawn down, a step at a time. */
export function* pizzaMiniSteps(id: string, look: PeelLook, RR: number): Generator<void, PizzaMini | null> {
  const p = PIZZA_BY_ID[id];
  if (!p) return null;
  let paint = paints.get(id) ?? null;
  if (!paint) {
    // (let go of since it was asked for: painted again a step at a time)
    paint = yield* paintSteps(p);
    keepPaint(id, paint);
  }
  const tr = pizzaTraits(p);
  const pl = pizzaPlacement(look, paint.pie);
  const [cx, cy, pr] = pieCentre(p, pl);
  const k = pl.w / PIZZA_SIZE;
  const toPeel = (ax: number, ay: number): Pt => [pl.x + ax * k, pl.flip ? pl.y + pl.h - ay * k : pl.y + ay * k];
  const pts = (a: number[]): Pt[] => {
    const out: Pt[] = [];
    for (let i = 0; i < a.length; i += 2) out.push(toPeel(a[i], a[i + 1]));
    return out;
  };
  const pie = inBox(paint.pie, pl, RR);
  const spec = inBox(paint.spec, pl, RR * 0.5);
  yield;
  const shadow = pieShadow(paint.pie, pl, RR * 0.5);
  const hops: PizzaHop[] = [];
  if (paint.sheet) {
    const n = paint.d.hops.length / 2;
    const px = Math.ceil(CELL * k * RR);
    for (let i = 0; i < n; i++) {
      const [c, cctx] = makeCanvas(CELL, CELL);
      cctx.drawImage(paint.sheet, i * CELL, 0, CELL, CELL, 0, 0, CELL, CELL);
      let img = downTo(c, px, px);
      if (pl.flip) {
        const [f, fx] = makeCanvas(px, px);
        fx.translate(0, px);
        fx.scale(1, -1);
        fx.drawImage(img, 0, 0);
        img = f;
      }
      const [x, y] = toPeel(paint.d.hops[i * 2], paint.d.hops[i * 2 + 1]);
      hops.push({ img, x, y, s: CELL * k });
    }
  }
  yield;
  let frost: [HTMLCanvasElement, HTMLCanvasElement] | null = null;
  if (tr.cold && !tr.calzone) {
    const [o, n] = frostArt(p);
    frost = [inBox(o, pl, RR), inBox(n, pl, RR)];
    yield;
  }
  const vents = tr.calzone ? CALZONE_VENTS.map(([x, y]) => toPeel(x, y)) : [];
  return {
    p,
    tr,
    look,
    RR,
    pl,
    cx,
    cy,
    pr,
    pie,
    spec,
    shadow,
    hops,
    cheese: pts(paint.d.cheese),
    sauce: pts(paint.d.sauce),
    oil: pts(paint.d.oil),
    gold: pts(paint.d.gold),
    vents,
    frost,
    drips: tr.syrup ? dripAnchors(pl, cx, cy, pr) : [],
  };
}

// ════════════════════════════ the living pie ════════════════════════════

/** What a pizza peel throws (src/art/peelCraft.ts maps them to its sprites). */
export type PizzaSpr = 'crumb' | 'speck' | 'wisp' | 'steam' | 'mist' | 'flake' | 'ember' | 'glint' | 'sauce' | 'choc' | 'honey' | 'syrup' | 'confetti' | 'sparkB' | 'sparkG' | 'sparkV' | 'mote';
/** Shed a sprite from (lx, ly) in the peel's frame, moving (vx, vy) peel units/s; gravity in world units/s² (negative
 *  rises); `rot` its turn (upright: 0), else a random one. */
export type PizzaEmit = (spr: PizzaSpr, lx: number, ly: number, vx: number, vy: number, s0: number, s1: number, life: number, o?: { grav?: number; drag?: number; a?: number; fin?: number; spin?: number; rot?: number }) => void;

const reduced = () => !!save.settings.reducedMotion;

/** Up and down in arcs (durations, heights): a bounce. */
function arcs(t: number, d: readonly number[], h: readonly number[]): number {
  if (t <= 0) return 0;
  let a = 0;
  for (let i = 0; i < d.length; i++) {
    if (t < a + d[i]) return h[i] * Math.sin((Math.PI * (t - a)) / d[i]);
    a += d[i];
  }
  return 0;
}

interface Bubble {
  x: number;
  y: number;
  r: number;
  t: number;
  life: number;
}
interface HopState {
  delay: number;
  h: number;
  dur: number;
  dx: number;
  spin: number;
}

/** The finish's glow colour as the nearest of the glowing motes (for what flies off a Rare Find). */
function moteFor(c: number): PizzaSpr {
  const r = (c >> 16) & 255;
  const g = (c >> 8) & 255;
  const b = c & 255;
  if (r > 200 && g < 170 && b < 120) return 'ember';
  if (g > r && g > b) return 'sparkG';
  if (b > r && b > g) return r > 150 ? 'sparkV' : 'sparkB';
  if (r > 200 && b > 180) return 'sparkV';
  return 'glint';
}

let glintImg: HTMLCanvasElement | null = null;
function glint(): HTMLCanvasElement {
  if (!glintImg) {
    const [c, ctx] = makeCanvas(32, 32);
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 15);
    g.addColorStop(0, 'rgba(255,255,255,0.7)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
    sparkleStar(ctx, 16, 16, 13);
    ctx.strokeStyle = 'rgba(110,90,70,0.45)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    glintImg = c;
  }
  return glintImg;
}

/** Scratch canvases (shared: used and done with inside one draw). */
const scratches = new Map<string, [HTMLCanvasElement, Ctx]>();
function scratch(w: number, h: number, i: number): [HTMLCanvasElement, Ctx] {
  const key = `${w}x${h}:${i}`;
  let s = scratches.get(key);
  if (!s) scratches.set(key, (s = makeCanvas(w, h)));
  const [, x] = s;
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalAlpha = 1;
  x.globalCompositeOperation = 'source-over';
  x.clearRect(0, 0, w, h);
  return s;
}

/** One place a pizza peel shows (a locker canvas, the cursor peel). */
export class PizzaLive {
  t = crand() * 20;
  /** Seconds since the last smack. */
  sm = 9;
  emit: PizzaEmit = () => {};
  /** In the locker (gentler, nothing swung). */
  menu = true;
  /** The glow behind the peel (a Rare Find's finish): its alpha now. */
  glowA = 0;
  private bubbles: Bubble[] = [];
  private bubNext = 0.3;
  private sizzle: Bubble[] = [];
  private sizNext = 0.4;
  private twinkles: Bubble[] = [];
  private twNext = 0.8;
  private steamAcc = crand();
  private mistAcc = crand();
  private hops: HopState[];
  private slideX = 0;
  private slideY = 0;
  private slideVX = 0;
  private slideVY = 0;
  private sweepT = -1;
  private sweepNext = 2 + crand() * 4;
  private drip: { u: number; gap: number }[];
  private speed = 0;

  constructor(readonly mini: PizzaMini) {
    this.hops = mini.hops.map(() => ({ delay: 0, h: 0, dur: 0.34, dx: 0, spin: 0 }));
    this.drip = mini.drips.map((_, i) => ({ u: DRIP_REST[i] ?? 0.4, gap: 0 }));
  }

  /** How high the pie is off the board now (0 at rest). */
  private lift(): number {
    return arcs(this.sm, [0.2, 0.11, 0.06], [1, 0.26, 0.07]) * this.mini.tr.heavy * (reduced() ? 0.5 : 1);
  }

  smack(): void {
    this.sm = 0;
    const m = this.mini;
    const tr = m.tr;
    const n = reduced() ? 0.4 : 1;
    const sp = this.menu ? 0.6 : 1;
    // a few toppings hop, each its own height and moment
    this.hops.forEach((h) => {
      h.delay = 0.02 + crand() * 0.06;
      h.h = (0.75 + crand() * 0.5) * (reduced() ? 0.5 : 1);
      h.dur = 0.3 + crand() * 0.08;
      h.dx = (crand() - 0.5) * 6;
      h.spin = (crand() - 0.5) * 2.4;
    });
    const { cx, cy, pr } = m;
    // crumbs off the crust
    for (let i = 0; i < Math.round(8 * n); i++) {
      const a = -Math.PI / 2 + (crand() - 0.5) * Math.PI * (tr.calzone ? 0.9 : 1.7);
      const v = (110 + crand() * 150) * sp;
      this.emit('crumb', cx + Math.cos(a) * pr * 0.95, cy + Math.sin(a) * pr * 0.92, Math.cos(a) * v, Math.sin(a) * v - 90 * sp, 7 + crand() * 4, 6, 0.35 + crand() * 0.2, { grav: 620, drag: 0.6, spin: (crand() - 0.5) * 14, fin: 0.01 });
    }
    for (let i = 0; i < Math.round(5 * n); i++) {
      const a = crand() * Math.PI * 2;
      const v = (60 + crand() * 90) * sp;
      this.emit('speck', cx + Math.cos(a) * pr * 0.9, cy + Math.sin(a) * pr * 0.9, Math.cos(a) * v, Math.sin(a) * v - 40, 4 + crand() * 2, 3, 0.3 + crand() * 0.2, { grav: 300, drag: 1.5 });
    }
    // a puff of what's in the air over it
    if (tr.cold) {
      for (let i = 0; i < Math.round(3 * n); i++) this.emit('mist', cx + (crand() - 0.5) * pr, cy + (crand() - 0.2) * pr * 0.6, (crand() - 0.5) * 60, 20, 30, this.menu ? 64 : 90, 0.8 + crand() * 0.3, { grav: 40, drag: 2, a: 0.55, rot: 0, spin: 0 });
      for (let i = 0; i < Math.round(7 * n); i++) {
        const a = crand() * Math.PI * 2;
        const v = (70 + crand() * 110) * sp;
        this.emit('flake', cx + Math.cos(a) * pr * 0.85, cy + Math.sin(a) * pr * 0.85, Math.cos(a) * v, Math.sin(a) * v - 50, 6 + crand() * 3, 5, 0.7 + crand() * 0.4, { grav: 90, drag: 1.6 });
      }
    } else if (tr.steam > 0) {
      // a breath of steam knocked up off its top edge
      for (let i = 0; i < Math.round(3 * n); i++) this.emit('wisp', cx + (crand() - 0.5) * pr * 0.9, cy - pr * (0.55 + crand() * 0.3), (crand() - 0.5) * 30, -70 * sp, 16, 26, 0.4 + crand() * 0.12, { grav: -60, drag: 2.5, a: 0.55, fin: 0.1, rot: 0, spin: 0 });
    }
    if (tr.hot > 0)
      for (let i = 0; i < Math.round(4 * tr.hot * n); i++) this.emit('ember', cx + (crand() - 0.5) * pr, cy + (crand() - 0.5) * pr * 0.8, (crand() - 0.5) * 70, (-60 - crand() * 80) * sp, 9 + crand() * 4, 3, 0.6 + crand() * 0.4, { grav: -80, drag: 1.2 });
    if (tr.syrup)
      for (let i = 0; i < Math.round(3 * n); i++) {
        const a = -Math.PI / 2 + (crand() - 0.5) * 2.4;
        const v = (90 + crand() * 100) * sp;
        this.emit(DROP[tr.syrup], cx + Math.cos(a) * pr * 0.6, cy + Math.sin(a) * pr * 0.6, Math.cos(a) * v, Math.sin(a) * v - 70, 6 + crand() * 3, 5, 0.6 + crand() * 0.3, { grav: 640, drag: 0.4 });
      }
    if (tr.sprinkles)
      for (let i = 0; i < Math.round(6 * n); i++) {
        const a = crand() * Math.PI * 2;
        const v = (80 + crand() * 120) * sp;
        this.emit('confetti', cx + Math.cos(a) * pr * 0.55, cy + Math.sin(a) * pr * 0.55, Math.cos(a) * v, Math.sin(a) * v - 70, 7, 6, 0.6 + crand() * 0.3, { grav: 520, drag: 0.6, spin: (crand() - 0.5) * 16 });
      }
    if (tr.gold)
      for (let i = 0; i < Math.round(3 * n); i++) {
        const [x, y] = m.gold.length ? m.gold[Math.floor(crand() * m.gold.length)] : [cx + (crand() - 0.5) * pr, cy + (crand() - 0.5) * pr];
        this.emit('glint', x, y, (crand() - 0.5) * 40, -30 - crand() * 40, 14, 4, 0.45 + crand() * 0.2, { drag: 1.5, spin: 0 });
      }
    if (tr.glow !== null && tr.sparkle) {
      const spr = moteFor(tr.glow);
      for (let i = 0; i < Math.round(6 * n); i++) {
        const a = crand() * Math.PI * 2;
        const v = (50 + crand() * 80) * sp;
        this.emit(spr, cx + Math.cos(a) * pr * 0.7, cy + Math.sin(a) * pr * 0.7, Math.cos(a) * v, Math.sin(a) * v - 40, spr === 'glint' ? 12 : 11, 4, 0.6 + crand() * 0.4, { drag: 1.4, grav: -30, spin: 0 });
      }
    }
    if (tr.calzone)
      // steam jets from the vents, sauce spits
      m.vents.forEach(([x, y], i) => {
        this.emit('wisp', x, y - 10, (i - 1) * 20, -90 * sp, 12, 22, 0.4 + crand() * 0.1, { grav: -50, drag: 2.5, a: 0.6, fin: 0.05, rot: 0, spin: 0 });
        if (i !== 1 || crand() < 0.5) this.emit('sauce', x, y, (i - 1) * 40 + (crand() - 0.5) * 30, (-120 - crand() * 60) * sp, 6, 5, 0.5, { grav: 700 });
      });
  }

  /** Advance by dt; vx, vy: the peel's velocity in its own frame (peel units/s). */
  update(dt: number, vx = 0, vy = 0): void {
    const m = this.mini;
    const tr = m.tr;
    const calm = reduced() ? 0.5 : 1;
    this.t += dt;
    this.sm += dt;
    this.speed = Math.hypot(vx, vy);
    // swung, the pie slides on its board and springs back
    const tx = Math.max(-3.5, Math.min(3.5, -vx * 0.0022)) * calm;
    const ty = Math.max(-2.5, Math.min(2.5, -vy * 0.0016)) * calm;
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / steps;
    for (let s = 0; s < steps; s++) {
      this.slideVX += (-(this.slideX - tx) * 170 - this.slideVX * 12) * h;
      this.slideVY += (-(this.slideY - ty) * 170 - this.slideVY * 12) * h;
      this.slideX += this.slideVX * h;
      this.slideY += this.slideVY * h;
    }
    // the light's sweep across it, every few seconds
    if (this.sweepT >= 0) {
      this.sweepT += dt / 1.3;
      if (this.sweepT >= 1) {
        this.sweepT = -1;
        this.sweepNext = 4.5 + crand() * 4;
      }
    } else if ((this.sweepNext -= dt) <= 0) this.sweepT = 0;
    // bubbles: blisters on the cheese (or the sauce) swell and pop
    const bpts = tr.bubbles === 'cheese' ? m.cheese : tr.bubbles === 'sauce' ? m.sauce : tr.calzone ? m.vents : [];
    for (const b of this.bubbles) b.t += dt;
    this.bubbles = this.bubbles.filter((b) => b.t < b.life + 0.7);
    if (bpts.length && (this.bubNext -= dt) <= 0) {
      this.bubNext = (tr.calzone ? 0.5 : 0.28) + crand() * 0.45;
      if (this.bubbles.length < (tr.calzone ? 3 : 6)) {
        const [x, y] = bpts[Math.floor(crand() * bpts.length)];
        const r = tr.calzone ? 2.2 + crand() * 1 : (tr.bubbles === 'cheese' ? 2.4 : 1.8) + crand() * 2.2;
        this.bubbles.push({ x: x + (crand() - 0.5) * 3, y: y + (crand() - 0.5) * 3, r, t: 0, life: (0.9 + crand() * 1.3) / (reduced() ? 0.6 : 1) });
      }
    }
    // fat sizzling on the cured meats
    for (const b of this.sizzle) b.t += dt;
    this.sizzle = this.sizzle.filter((b) => b.t < b.life);
    if (tr.oil > 0 && m.oil.length && (this.sizNext -= dt) <= 0) {
      this.sizNext = (0.12 + crand() * 0.3) / tr.oil;
      if (this.sizzle.length < 5) {
        const [x, y] = m.oil[Math.floor(crand() * m.oil.length)];
        this.sizzle.push({ x: x + (crand() - 0.5) * 6, y: y + (crand() - 0.5) * 6, r: 0.7 + crand() * 0.6, t: 0, life: 0.22 + crand() * 0.15 });
      }
    }
    // twinkles: gold leaf and pearls, frost, a Rare Find's sparkle
    for (const b of this.twinkles) b.t += dt;
    this.twinkles = this.twinkles.filter((b) => b.t < b.life);
    const twinkly = tr.gold || tr.cold || tr.sparkle;
    if (twinkly && (this.twNext -= dt) <= 0) {
      this.twNext = 0.35 + crand() * 0.6;
      if (this.twinkles.length < 3) {
        let x: number;
        let y: number;
        if (tr.gold && m.gold.length && crand() < 0.7) [x, y] = m.gold[Math.floor(crand() * m.gold.length)];
        else {
          const a = crand() * Math.PI * 2;
          const d = tr.cold || tr.goldRim ? m.pr * (0.86 + crand() * 0.1) : Math.sqrt(crand()) * m.pr * 0.75;
          x = m.cx + Math.cos(a) * d;
          y = m.cy + Math.sin(a) * d;
        }
        this.twinkles.push({ x, y, r: 4 + crand() * 4, t: 0, life: 0.5 + crand() * 0.3 });
      }
    }
    // steam curling off it (or a cold mist spilling off its lower edge)
    if (tr.steam > 0) {
      this.steamAcc += dt * tr.steam * (this.menu ? 1 : 1.25) * calm;
      while (this.steamAcc >= 1) {
        this.steamAcc -= 1;
        let x: number;
        let y: number;
        if (tr.calzone) [x, y] = m.vents[Math.floor(crand() * m.vents.length)];
        else {
          // (off its upper half, so it rises clear of the pie rather than hazing it)
          x = m.cx + (crand() - 0.5) * m.pr * 1.1;
          y = m.cy - m.pr * (0.15 + crand() * 0.55);
        }
        // (a calzone's: thin and short, rising straight off its vents)
        const k = tr.calzone ? 0.6 : 1;
        this.emit('wisp', x, y - 16 * k, (crand() - 0.5) * 6, -10, (22 + crand() * 8) * k, (40 + crand() * 12) * k, (1.7 + crand() * 0.7) * k, { grav: -34, drag: 0.8, a: 0.26 + crand() * 0.1, fin: 0.3, rot: 0, spin: 0 });
      }
    }
    if (tr.cold) {
      this.mistAcc += dt * 1.1 * calm;
      while (this.mistAcc >= 1) {
        this.mistAcc -= 1;
        const x = m.cx + (crand() - 0.5) * m.pr * 1.3;
        this.emit('mist', x, m.cy + m.pr * (0.72 + crand() * 0.2), (crand() - 0.5) * 8, 4, 22, 54, 1.8 + crand() * 0.6, { grav: 26, drag: 1.2, a: 0.32, fin: 0.3, rot: 0, spin: 0 });
      }
    }
    // syrup running off the edge, a drop falling now and then
    this.drip.forEach((d, i) => {
      const a = m.drips[i];
      if (d.gap > 0) {
        d.gap -= dt;
        d.u = Math.max(0.12, d.u - dt * 2.5);
        return;
      }
      d.u += (dt / (2.6 + i * 0.9)) * calm;
      if (d.u >= 1) {
        this.emit(DROP[tr.syrup!], a.x, a.y + a.end + 1, 0, 30, 7.5, 6, 0.32, { grav: 500, drag: 0.2 });
        d.u = 0.95;
        d.gap = 0.8 + crand() * 1.6;
      }
    });
    this.glowA = tr.glow !== null ? 0.2 + 0.08 * Math.sin(this.t * 2.2) : 0;
  }

  /** The pie on its board this frame (peel units): its shadow, the pie and what moves on it, what's lifted. */
  draw(ctx: Ctx): void {
    const m = this.mini;
    const tr = m.tr;
    const pl = m.pl;
    const lift = this.lift();
    const ghost = tr.ghost ? 0.84 + 0.14 * Math.sin(this.t * 1.9) : 1;
    const ox = this.slideX - 0.8 * lift;
    const oy = this.slideY - 2.4 * lift;
    const s = 1 + 0.055 * lift;
    drawShadow(ctx, m.shadow, pl, lift, m.cx + this.slideX * 0.4, m.cy + this.slideY * 0.4, ghost);
    ctx.save();
    ctx.translate(m.cx + ox, m.cy + oy);
    ctx.scale(s, s);
    ctx.translate(-m.cx, -m.cy);
    ctx.globalAlpha = ghost;
    if (tr.hot > 0 && !reduced()) this.shimmer(ctx);
    else ctx.drawImage(m.pie, pl.x, pl.y, pl.w, pl.h);
    ctx.globalAlpha = 1;
    this.drawBubbles(ctx);
    this.glisten(ctx);
    if (m.frost) this.drawFrost(ctx);
    if (tr.hot > 0) {
      // the heat over it, breathing
      const a = (0.08 + 0.05 * Math.sin(this.t * 2.6)) * tr.hot + 0.12 * tr.hot * Math.max(0, 1 - this.sm / 0.5);
      const g = ctx.createRadialGradient(m.cx, m.cy - m.pr * 0.1, 0, m.cx, m.cy, m.pr * 1.05);
      g.addColorStop(0, `rgba(255,120,40,${a})`);
      g.addColorStop(0.7, `rgba(255,90,30,${a * 0.5})`);
      g.addColorStop(1, 'rgba(255,90,30,0)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = g;
      ctx.fillRect(m.cx - m.pr * 1.05, m.cy - m.pr * 1.05, m.pr * 2.1, m.pr * 2.1);
      // and the crust glowing hot round its edge
      const ra = (0.16 + 0.07 * Math.sin(this.t * 3.1 + 1)) * tr.hot;
      const rg = ctx.createRadialGradient(m.cx, m.cy, m.pr * 0.78, m.cx, m.cy, m.pr * 1.14);
      rg.addColorStop(0, 'rgba(255,110,30,0)');
      rg.addColorStop(0.5, `rgba(255,120,36,${ra})`);
      rg.addColorStop(1, 'rgba(255,90,20,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(m.cx - m.pr * 1.15, m.cy - m.pr * 1.15, m.pr * 2.3, m.pr * 2.3);
      ctx.globalCompositeOperation = 'source-over';
    }
    this.drawSizzle(ctx);
    this.drawHops(ctx);
    this.drawTwinkles(ctx);
    ctx.restore();
    if (tr.syrup) this.drip.forEach((d, i) => {
      const a = m.drips[i];
      const bead = 2.7 + 1.3 * Math.max(0, (d.u - 0.6) / 0.4);
      drawDrip(ctx, tr.syrup!, a.x + ox * 0.6, a.y + oy * 0.6, a.end * Math.min(1, d.u), bead);
    });
    drawPizzaHilt(ctx, m.look, pl.bottom);
  }

  /** Heat shimmering over a spicy pie: the pie drawn in bands, each nudged by a wave running up it. */
  private shimmer(ctx: Ctx): void {
    const m = this.mini;
    const pl = m.pl;
    const n = 22;
    const bh = pl.h / n;
    const sh = m.pie.height / n;
    const amp = 1.1 * m.tr.hot * (1 + 1.5 * Math.max(0, 1 - this.sm / 0.6));
    for (let i = 0; i < n; i++) {
      // stronger towards the top (the heat rises off it), the wave running upwards
      const up = 1 - i / n;
      const dx = Math.sin(i * 0.9 + this.t * 7.5) * amp * (0.35 + 0.65 * up);
      ctx.drawImage(m.pie, 0, i * sh, m.pie.width, sh + 0.6, pl.x + dx, pl.y + i * bh, pl.w, bh + 0.3);
    }
  }

  private glisten(ctx: Ctx): void {
    const m = this.mini;
    const pl = m.pl;
    const sp = m.spec;
    const [sc, sx] = scratch(sp.width, sp.height, 0);
    const unit = () => sx.setTransform(sp.width / pl.w, 0, 0, sp.height / pl.h, (-pl.x * sp.width) / pl.w, (-pl.y * sp.height) / pl.h);
    // the light pooling top left, drifting as the light moves (and as the peel's swung)
    const sw = Math.max(-1, Math.min(1, this.speed / 1400));
    const lx = m.cx - m.pr * 0.32 + m.pr * 0.26 * Math.sin(this.t * 0.23) - sw * 10;
    const ly = m.cy - m.pr * 0.3 + m.pr * 0.22 * Math.sin(this.t * 0.31 + 1.3);
    const pool = 0.62 + 0.2 * Math.sin(this.t * 0.7) + 0.4 * Math.max(0, 1 - this.sm / 0.35);
    sx.drawImage(sp, 0, 0);
    sx.globalCompositeOperation = 'destination-in';
    unit();
    const g = sx.createRadialGradient(lx, ly, 0, lx, ly, m.pr * 0.62);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.5, 'rgba(0,0,0,0.55)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    sx.fillStyle = g;
    sx.fillRect(pl.x, pl.y, pl.w, pl.h);
    // and now and then the light sweeps across it
    const u = this.sweepT;
    ctx.globalAlpha = Math.min(1, pool);
    ctx.drawImage(sc, pl.x, pl.y, pl.w, pl.h);
    if (u >= 0) {
      const [bc, bx] = scratch(sp.width, sp.height, 1);
      bx.drawImage(sp, 0, 0);
      bx.globalCompositeOperation = 'destination-in';
      bx.setTransform(sp.width / pl.w, 0, 0, sp.height / pl.h, (-pl.x * sp.width) / pl.w, (-pl.y * sp.height) / pl.h);
      const b = -1.3 + 2.6 * u;
      const bcx = m.cx + Math.SQRT1_2 * b * m.pr;
      const bcy = m.cy + Math.SQRT1_2 * b * m.pr;
      const w = m.pr * 0.36;
      const lg = bx.createLinearGradient(bcx - w * Math.SQRT1_2, bcy - w * Math.SQRT1_2, bcx + w * Math.SQRT1_2, bcy + w * Math.SQRT1_2);
      lg.addColorStop(0, 'rgba(0,0,0,0)');
      lg.addColorStop(0.5, 'rgba(0,0,0,1)');
      lg.addColorStop(1, 'rgba(0,0,0,0)');
      bx.fillStyle = lg;
      bx.fillRect(pl.x, pl.y, pl.w, pl.h);
      ctx.globalAlpha = 0.9 * Math.sin(Math.PI * u);
      ctx.drawImage(bc, pl.x, pl.y, pl.w, pl.h);
    }
    ctx.globalAlpha = 1;
  }

  private drawBubbles(ctx: Ctx): void {
    const [dk, body, lt] = this.mini.tr.bubbleCol;
    for (const b of this.bubbles) {
      if (b.t < b.life) {
        // swelling: a dome lit on its top left, its shadow on the bottom right, a glint
        const u = b.t / b.life;
        const rr = b.r * (1 - (1 - u) * (1 - u));
        if (rr < 0.3) continue;
        const sg = ctx.createRadialGradient(b.x + rr * 0.35, b.y + rr * 0.45, 0, b.x + rr * 0.35, b.y + rr * 0.45, rr * 1.25);
        sg.addColorStop(0, rgba(dk, 0.42));
        sg.addColorStop(1, rgba(dk, 0));
        ctx.fillStyle = sg;
        ctx.fillRect(b.x - rr * 1.2, b.y - rr * 1.1, rr * 2.9, rr * 2.9);
        const g = ctx.createRadialGradient(b.x - rr * 0.3, b.y - rr * 0.35, 0, b.x, b.y, rr);
        g.addColorStop(0, rgba(lt, 0.95));
        g.addColorStop(0.55, rgba(body, 0.75));
        g.addColorStop(1, rgba(body, 0));
        ctx.fillStyle = g;
        ctx.fillRect(b.x - rr, b.y - rr, rr * 2, rr * 2);
        ellipse(ctx, b.x - rr * 0.36, b.y - rr * 0.4, rr * 0.26, rr * 0.18, -0.6);
        ctx.fillStyle = `rgba(255,255,255,${0.8 * u})`;
        ctx.fill();
      } else {
        // popped: a ring that spreads and fades, a browned spot where it was
        const k = (b.t - b.life) / 0.7;
        const a = 1 - k;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * (1 + 0.6 * Math.min(1, k * 4)), 0, Math.PI * 2);
        ctx.strokeStyle = rgba(dk, 0.45 * Math.max(0, 1 - k * 3));
        ctx.lineWidth = 0.7;
        ctx.stroke();
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        g.addColorStop(0, rgba(dk, 0.28 * a));
        g.addColorStop(1, rgba(dk, 0));
        ctx.fillStyle = g;
        ctx.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
      }
    }
  }

  private drawSizzle(ctx: Ctx): void {
    for (const b of this.sizzle) {
      const u = b.t / b.life;
      const a = Math.sin(Math.PI * u);
      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r * 3);
      g.addColorStop(0, `rgba(255,250,230,${0.9 * a})`);
      g.addColorStop(0.3, `rgba(255,230,170,${0.45 * a})`);
      g.addColorStop(1, 'rgba(255,220,150,0)');
      ctx.fillStyle = g;
      ctx.fillRect(b.x - b.r * 3, b.y - b.r * 3, b.r * 6, b.r * 6);
      if (u > 0.6) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * (1 + (u - 0.6) * 5), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,248,226,${0.6 * (1 - u) * 2.5})`;
        ctx.lineWidth = 0.45;
        ctx.stroke();
      }
    }
  }

  private drawTwinkles(ctx: Ctx): void {
    const img = glint();
    const col = this.mini.tr.glow;
    for (const b of this.twinkles) {
      const e = Math.sin((Math.PI * b.t) / b.life);
      const size = b.r * e;
      if (size < 0.4) continue;
      if (col !== null && this.mini.tr.sparkle) {
        const c = `${(col >> 16) & 255},${(col >> 8) & 255},${col & 255}`;
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, size * 1.6);
        g.addColorStop(0, `rgba(${c},${0.6 * e})`);
        g.addColorStop(1, `rgba(${c},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(b.x - size * 1.6, b.y - size * 1.6, size * 3.2, size * 3.2);
      }
      ctx.globalAlpha = Math.min(1, e);
      ctx.drawImage(img, b.x - size, b.y - size, size * 2, size * 2);
      ctx.globalAlpha = 1;
    }
  }

  private drawFrost(ctx: Ctx): void {
    const m = this.mini;
    const pl = m.pl;
    const [o, inner] = m.frost!;
    ctx.drawImage(o, pl.x, pl.y, pl.w, pl.h);
    // the feathers creep in and back, slowly (and the smack knocks them back a little)
    const reach = FROST_REST + 0.07 * Math.sin(this.t * 0.42) + 0.08 * Math.max(0, 1 - this.sm / 0.8);
    const [fc, fx] = scratch(inner.width, inner.height, 2);
    fx.drawImage(inner, 0, 0);
    fx.globalCompositeOperation = 'destination-in';
    fx.setTransform(inner.width / pl.w, 0, 0, inner.height / pl.h, (-pl.x * inner.width) / pl.w, (-pl.y * inner.height) / pl.h);
    frostMask(fx, m.cx, m.cy, m.pr, reach);
    ctx.drawImage(fc, pl.x, pl.y, pl.w, pl.h);
  }

  private drawHops(ctx: Ctx): void {
    const m = this.mini;
    const stringy = m.tr.cheese >= 0.45;
    m.hops.forEach((hp, i) => {
      const st = this.hops[i];
      const t = this.sm - st.delay;
      const z = st.h > 0 ? arcs(t, [st.dur, 0.13], [st.h, st.h * 0.16]) : 0;
      const half = hp.s / 2;
      if (z <= 0.002) {
        ctx.drawImage(hp.img, hp.x - half, hp.y - half, hp.s, hp.s);
        return;
      }
      const x = hp.x + st.dx * z - 1.4 * z;
      const y = hp.y - 7.5 * z;
      // its shadow where it sat
      const sr = hp.s * 0.2;
      const g = ctx.createRadialGradient(hp.x + 2.5 * z, hp.y + 3.5 * z, 0, hp.x + 2.5 * z, hp.y + 3.5 * z, sr * (1 + 0.3 * z));
      g.addColorStop(0, `rgba(40,14,4,${0.32 * (1 - 0.4 * z)})`);
      g.addColorStop(1, 'rgba(40,14,4,0)');
      ctx.fillStyle = g;
      ctx.fillRect(hp.x - sr * 2, hp.y - sr * 2, sr * 4 + 8, sr * 4 + 8);
      // the cheese stretching after it, then snapping
      if (stringy && t < st.dur * 0.7) {
        const k = t / (st.dur * 0.7);
        const a = k < 0.75 ? 0.9 : 0.9 * (1 - (k - 0.75) / 0.25);
        for (const sd of [-1, 1]) {
          const x0 = hp.x + sd * 2.2;
          const y0 = hp.y + 1.5;
          const x1 = x + sd * 1.6;
          const y1 = y + 2;
          const midX = (x0 + x1) / 2 + sd * 1.2;
          const midY = (y0 + y1) / 2 + 2.5 * (1 - z);
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.quadraticCurveTo(midX, midY, x1, y1);
          ctx.strokeStyle = `rgba(214,156,52,${a * 0.8})`;
          ctx.lineWidth = Math.max(0.5, 1.7 - z * 0.9);
          ctx.lineCap = 'round';
          ctx.stroke();
          ctx.strokeStyle = `rgba(255,236,168,${a})`;
          ctx.lineWidth = Math.max(0.3, 0.9 - z * 0.5);
          ctx.stroke();
        }
      }
      const s = hp.s * (1 + 0.32 * z);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(st.spin * z);
      ctx.drawImage(hp.img, -s / 2, -s / 2, s, s);
      ctx.restore();
    });
  }
}
