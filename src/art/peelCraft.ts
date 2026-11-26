// Living crafted peels: the Classic Peel and the Golden Crust set (and their mastered versions) come alive as the
// material they are made of (src/art/peelCraftArt.ts paints them):
// - wood (the Classic): now and then a broad sheen runs over the varnish; flour sifts off its edge (when it taps the
//   counter in the locker, when it's swung in play); a smack flattens the head, which springs back with a wobble and
//   throws a quick drift of flour off past its rim.
// - marble: the window's reflection drifts on the polish, a glint runs along a vein, mica twinkles; a smack barely
//   moves it (a heavy thud and a shake), gold light floods out along the veins, chips and stone dust fly.
// - copper: the spun metal's radial highlight swings as the light moves, temper colours breathe in the middle (it's
//   fresh from the oven), a glint pops on the rim; a smack rings it like a gong (ripples run out across the face, it
//   hums, sparks fly).
// - neon: data pulses run out along the cyan traces and light the pads they reach, the tubes hum and the pink one
//   stutters now and then; a smack surges every tube white (a flash on the glass), browns them out and sparks fly
//   from the pads.
// - obsidian: light moves slowly through its violet flow bands (the glass's inner fire), and now and then their
//   sheen flashes across it as the light catches them; a smack lights a fracture through the glass from where it landed, and dark shards fly off.
// - place (the place peels): a window in the head onto the location, its hero motion playing in it and its own smack
//   (src/art/peelPlace.ts, src/art/peelPlaceDefs.ts).
// - event and act (the event and act peels): a medallion in the head, the wave event in miniature or the act's places,
//   boss and number (src/art/peelMedal.ts, src/art/peelEventDefs.ts).
// - gem (the jewellery box, its masterworks and the ultra-rares): cut stone, polished metal, pearl, opal or a galaxy
//   under glass, its facets catching a moving light; a smack runs a ring of light through them (src/art/peelGem.ts).
//
// It is built as the living foot peels are (src/art/peelLive.ts): the rig (CraftRig: the head's layers, cut to the
// head's box, and the handle) is built a step at a time in idle time and shared; the motion (CraftLive) is one per
// place it shows. Each frame the head's surface is repainted on a small canvas (its layers and what moves on them,
// kept inside the head), then drawn flexed about where the head meets the handle; what flies off it is a pool of
// painted, lit sprites (flour, chips, sparks, shards) in the peel's world. In the locker that's all one 2D canvas;
// in play (src/game/peelCraftPlay.ts) the surface is a texture stamped flexed into the cursor peel's own texture
// and the sprites live in the play field. Everything cosmetic uses crand(). Only runs while animated peels are on.

import { PEEL_HEAD, PEEL_H, PEEL_W, drawPeelHandle, headPath, sparkleStar, type CraftKind, type PeelLook } from './peelArt';
import {
  PIVOT,
  SB,
  craftHandle,
  craftOver,
  craftReflect,
  craftUnder,
  hasReflect,
  marbleGeo,
  marbleVeinsLit,
  neonGeo,
  neonTracesLit,
  neonTubeLit,
  obsidianFlowLit,
  obsidianGeo,
  obsidianSheen,
  woodGrainLit,
  type Pt,
} from './peelCraftArt';
import { ellipse, makeCanvas, rgba, rng, type Ctx } from './util';
import { CRAFT, PEEL_BY_ID } from '../game/peels';
import { noise1 } from '../game/liveKit';
import { crand } from '../systems/cosmeticRandom';
import { save } from '../systems/save';
import { PEEL_FRAME_WORLD, type PeelWorld } from './peelLive';
import { PlaceLive, placeBaseAsync, placeBaseReady, placeMiniSteps, placeOver, placeUnder, type PlaceEmit, type PlaceMini, type PlaceSpr } from './peelPlace';
import { PizzaLive, pizzaBoard, pizzaMiniSteps, pizzaPaintAsync, pizzaPaintReady, type PizzaEmit, type PizzaMini, type PizzaSpr } from './peelPizza';
import { pizzaPeelLook } from '../game/peels';
import { MedalLive, actPrepAsync, actReady, medalMiniSteps, medalOver, medalUnder, type MedalMini, type MedalSpr } from './peelMedal';
import { PIZZA_BY_ID } from '../data/pizzas';
import { GemLive, gemMiniSteps, gemOver, gemUnder, type GemMini, type GemMote } from './peelGem';

const { x: HX, y: HY, r: R } = PEEL_HEAD;

/** A crafted peel's material (its mastered version's too), or null. */
export function craftOf(peelId: string): CraftKind | null {
  if (!PEEL_BY_ID[peelId]) return null;
  return CRAFT[peelId] ?? (peelId.startsWith('master:') ? CRAFT[peelId.slice(7)] ?? null : null);
}

export const hasPeelCraft = (peelId: string): boolean => !!craftOf(peelId);

// ════════════════════════════ the rig ════════════════════════════

export interface CraftRig {
  id: string;
  kind: CraftKind;
  look: PeelLook;
  /** Canvas pixels per peel unit. */
  RR: number;
  /** The handle and its touches, on a whole peel-sized canvas. */
  handle: HTMLCanvasElement;
  /** The head's layers, each cut to SB: the material (neon's tubes dark), the rims and outline over it, the head's
   *  inside (a mask), the reflection at rest, and the material's lit layers (grain, veins, tubes, flow, sheen). */
  under: HTMLCanvasElement;
  over: HTMLCanvasElement;
  inner: HTMLCanvasElement;
  reflect: HTMLCanvasElement | null;
  lit: HTMLCanvasElement | null;
  lit2: HTMLCanvasElement | null;
  /** A place peel: its window's base and loops (src/art/peelPlace.ts). */
  place: PlaceMini | null;
  /** A pizza peel: its pie's layers (src/art/peelPizza.ts). */
  pizza: PizzaMini | null;
  /** An event or act peel: its medallion's parts (src/art/peelMedal.ts). */
  medal: MedalMini | null;
  /** A gem peel: its stone's geometry and moving layers (src/art/peelGem.ts). */
  gem?: GemMini | null;
  key: string;
}

/** The handle every pizza peel shares, per rig detail. */
const pizzaHandles = new Map<number, HTMLCanvasElement>();
const EMPTY = makeCanvas(1, 1)[0];

function* pizzaRigSteps(peelId: string, RR: number): Generator<void, CraftRig | null> {
  const pid = peelId.slice('pizza:'.length);
  const pz = PIZZA_BY_ID[pid];
  if (!pz) return null;
  // (no top: the rig paints the pizza's own layers)
  const look = pizzaPeelLook(pz, false);
  let handle = pizzaHandles.get(RR);
  if (!handle) {
    const [h, hctx] = makeCanvas(PEEL_W * RR, PEEL_H * RR);
    hctx.scale(RR, RR);
    drawPeelHandle(hctx, look);
    craftHandle(hctx, look);
    pizzaHandles.set(RR, (handle = h));
  }
  const pizza = yield* pizzaMiniSteps(pid, look, RR);
  if (!pizza) return null;
  const under = pizza.pl.round ? pizzaBoard(look, RR) : EMPTY;
  const key = `pc_${peelId.replace(/[^a-z0-9]/gi, '_')}_${RR}`;
  return { id: peelId, kind: 'pizza', look, RR, handle, under, over: EMPTY, inner: EMPTY, reflect: null, lit: null, lit2: null, place: null, pizza, medal: null, key };
}

function boxLayer(RR: number, draw: (ctx: Ctx) => void): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(SB.w * RR, SB.h * RR);
  ctx.setTransform(RR, 0, 0, RR, -SB.x * RR, -SB.y * RR);
  draw(ctx);
  return c;
}

function* rigSteps(peelId: string, kind: CraftKind, RR: number): Generator<void, CraftRig | null> {
  if (kind === 'pizza') return yield* pizzaRigSteps(peelId, RR);
  const look = PEEL_BY_ID[peelId].look();
  if (!look.craft) return null;
  const [handle, hctx] = makeCanvas(PEEL_W * RR, PEEL_H * RR);
  hctx.scale(RR, RR);
  drawPeelHandle(hctx, look);
  craftHandle(hctx, look);
  yield;
  const key = `pc_${peelId.replace(/[^a-z0-9]/gi, '_')}_${RR}`;
  if (kind === 'place') {
    // a place peel: the head round its window, the bezel over it, and the window's mini (its base and loops)
    const under = boxLayer(RR, (ctx) => placeUnder(ctx, look));
    const over = boxLayer(RR, (ctx) => placeOver(ctx, look));
    yield;
    const inner = boxLayer(RR, (ctx) => {
      headPath(ctx, look.shape);
      ctx.fillStyle = '#000';
      ctx.fill();
    });
    const place = look.place ? yield* placeMiniSteps(look.place, look.shape, RR) : null;
    if (!place) return null;
    return { id: peelId, kind, look, RR, handle, under, over, inner, reflect: null, lit: null, lit2: null, place, pizza: null, medal: null, key };
  }
  if (kind === 'gem') {
    // a gem peel: the stone (or plate) at rest, the band, setting and studs over it, and the layers that move
    const under = boxLayer(RR, (ctx) => gemUnder(ctx, look));
    yield;
    const over = boxLayer(RR, (ctx) => gemOver(ctx, look));
    yield;
    const gem = yield* gemMiniSteps(look, RR);
    if (!gem) return null;
    return { id: peelId, kind, look, RR, handle, under, over, inner: EMPTY, reflect: null, lit: null, lit2: null, place: null, pizza: null, medal: null, gem, key };
  }
  if (kind === 'event' || kind === 'act') {
    // an event or act peel: the head round its medallion, the bezel and glass over it, the medallion's parts
    const under = boxLayer(RR, (ctx) => medalUnder(ctx, look));
    yield;
    const over = boxLayer(RR, (ctx) => medalOver(ctx, look));
    yield;
    const medal = yield* medalMiniSteps(look, RR);
    if (!medal) return null;
    return { id: peelId, kind, look, RR, handle, under, over, inner: EMPTY, reflect: null, lit: null, lit2: null, place: null, pizza: null, medal, key };
  }
  const under = boxLayer(RR, (ctx) => {
    headPath(ctx, look.shape);
    ctx.clip();
    craftUnder(ctx, look, false);
  });
  yield;
  const over = boxLayer(RR, (ctx) => craftOver(ctx, look));
  const inner = boxLayer(RR, (ctx) => {
    headPath(ctx, look.shape);
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = 6.4;
    ctx.stroke();
  });
  yield;
  const reflect = hasReflect(kind) ? boxLayer(RR, (ctx) => craftReflect(ctx, kind)) : null;
  let lit: HTMLCanvasElement | null = null;
  let lit2: HTMLCanvasElement | null = null;
  if (kind === 'wood') lit = boxLayer(RR, woodGrainLit);
  if (kind === 'marble') lit = boxLayer(RR, marbleVeinsLit);
  if (kind === 'neon') {
    lit = boxLayer(RR, (ctx) => neonTracesLit(ctx, look));
    lit2 = boxLayer(RR, (ctx) => neonTubeLit(ctx, look));
  }
  if (kind === 'obsidian') {
    lit = boxLayer(RR, obsidianFlowLit);
    lit2 = boxLayer(RR, obsidianSheen);
  }
  return { id: peelId, kind, look, RR, handle, under, over, inner, reflect, lit, lit2, place: null, pizza: null, medal: null, key };
}

// ——— building in idle time, shared ———

const rigs = new Map<string, CraftRig | null>();
const RIG_CAP = 24;
interface Job {
  key: string;
  gen: Generator<void, CraftRig | null>;
  waiters: { done: (r: CraftRig | null) => void; wanted: () => boolean }[];
}
const jobs: Job[] = [];
let pumping = false;
const idle = (fn: (d?: IdleDeadline) => void) => {
  if (typeof requestIdleCallback === 'function') requestIdleCallback(fn, { timeout: 120 });
  else setTimeout(() => fn(), 16);
};

function keep(key: string, rig: CraftRig | null): void {
  rigs.delete(key);
  rigs.set(key, rig);
  while (rigs.size > RIG_CAP) rigs.delete(rigs.keys().next().value!);
}

function pump(d?: IdleDeadline): void {
  try {
    const t0 = performance.now();
    const budget = () => (d && !d.didTimeout ? d.timeRemaining() > 4 : performance.now() - t0 < 10);
    while (jobs.length && budget()) {
      const job = jobs[0];
      job.waiters = job.waiters.filter((w) => w.wanted());
      if (!job.waiters.length) {
        jobs.shift();
        continue;
      }
      let r: IteratorResult<void, CraftRig | null>;
      try {
        r = job.gen.next();
      } catch (e) {
        if (import.meta.env?.DEV) console.error('[peelCraft] building', job.key, e);
        r = { done: true, value: null };
      }
      if (r.done) {
        jobs.shift();
        keep(job.key, r.value);
        for (const w of job.waiters) w.done(r.value);
      }
    }
  } finally {
    if (jobs.length) idle(pump);
    else pumping = false;
  }
}

/** A crafted peel's rig, built in idle time (null when it isn't one). As requestRig in src/art/peelLive.ts. */
export function requestCraftRig(peelId: string, done: (r: CraftRig | null) => void, wanted: () => boolean = () => true, urgent = false, RR = 1): void {
  const key = `${peelId}@${RR}`;
  if (rigs.has(key)) {
    const r = rigs.get(key)!;
    keep(key, r);
    done(r);
    return;
  }
  const kind = craftOf(peelId);
  if (!kind) return done(null);
  // a place peel's window base comes from the art cache (decoded off the main thread) or is painted a layer per idle
  // moment first: its rig only draws it down and paints its loops
  const look = kind === 'place' ? PEEL_BY_ID[peelId].look() : null;
  if (look?.place && !placeBaseReady(look.place)) {
    void placeBaseAsync(look.place, look.shape).then(() => wanted() && requestCraftRig(peelId, done, wanted, urgent, RR));
    return;
  }
  // a pizza peel's layers likewise (from the art cache, or painted a layer per idle moment)
  const pid = kind === 'pizza' ? peelId.slice('pizza:'.length) : '';
  if (pid && !pizzaPaintReady(pid)) {
    void pizzaPaintAsync(pid, wanted).then(() => wanted() && requestCraftRig(peelId, done, wanted, urgent, RR));
    return;
  }
  // an act peel's places' windows, its boss's foot and the number's font likewise
  const act = kind === 'act' ? Number(peelId.slice(peelId.indexOf(':') + 1)) : 0;
  if (act && !actReady(act)) {
    void actPrepAsync(act).then(() => wanted() && requestCraftRig(peelId, done, wanted, urgent, RR));
    return;
  }
  let job = jobs.find((j) => j.key === key);
  if (!job) {
    job = { key, gen: rigSteps(peelId, kind, RR), waiters: [] };
    if (urgent) jobs.unshift(job);
    else jobs.push(job);
  } else if (urgent && jobs[0] !== job) {
    jobs.splice(jobs.indexOf(job), 1);
    jobs.unshift(job);
  }
  job.waiters.push({ done, wanted });
  if (!pumping) {
    pumping = true;
    idle(pump);
  }
}

/** Build a rig now (dev tools). */
export function craftRigNow(peelId: string, RR = 1): CraftRig | null {
  const key = `${peelId}@${RR}`;
  if (rigs.has(key)) return rigs.get(key)!;
  const kind = craftOf(peelId);
  if (!kind) return null;
  const gen = rigSteps(peelId, kind, RR);
  for (;;) {
    const r = gen.next();
    if (r.done) {
      keep(key, r.value);
      return r.value;
    }
  }
}

// ════════════════════════════ sprites: what flies off ════════════════════════════

export const enum Spr {
  Flour,
  Speck,
  Dust,
  Chip,
  Shard,
  SparkC,
  SparkN,
  Glint,
  RingO,
  Mote,
  // the place peels' (src/art/peelPlaceDefs.ts)
  Ember,
  SparkB,
  SparkG,
  SparkV,
  Flake,
  Drop,
  Feather,
  Smoke,
  Confetti,
  Steam,
  Sauce,
  // the pizza peels' (src/art/peelPizza.ts)
  Crumb,
  Wisp,
  Mist,
  Choc,
  Honey,
  Syrup,
  // the event and act peels' (src/art/peelMedal.ts)
  Coin,
  Shred,
  Pepper,
  Gold,
  // the gem peels' (src/art/peelGem.ts)
  Fire,
  Ruby,
  White,
  GoldFeather,
}

/** A gem's names for the sprites it throws. */
const GEM_SPR: Record<GemMote | 'glint' | 'feather', Spr> = {
  glint: Spr.Glint,
  fire: Spr.Fire,
  red: Spr.Ruby,
  blue: Spr.SparkB,
  green: Spr.SparkG,
  violet: Spr.SparkV,
  gold: Spr.Gold,
  white: Spr.White,
  feather: Spr.GoldFeather,
};

/** An event or act medallion's names for the sprites it throws. */
const MEDAL_SPR: Record<MedalSpr, Spr> = {
  coin: Spr.Coin,
  shred: Spr.Shred,
  pepper: Spr.Pepper,
  feather: Spr.Feather,
  drop: Spr.Drop,
  smoke: Spr.Smoke,
  dust: Spr.Dust,
  confetti: Spr.Confetti,
  glint: Spr.Glint,
  sparkN: Spr.SparkN,
  spark: Spr.SparkC,
  gold: Spr.Gold,
  crumb: Spr.Crumb,
  ember: Spr.Ember,
};

/** A pizza's names for the sprites it throws. */
const PIZZA_SPR: Record<PizzaSpr, Spr> = {
  crumb: Spr.Crumb,
  speck: Spr.Speck,
  wisp: Spr.Wisp,
  steam: Spr.Steam,
  mist: Spr.Mist,
  flake: Spr.Flake,
  ember: Spr.Ember,
  glint: Spr.Glint,
  sauce: Spr.Sauce,
  choc: Spr.Choc,
  honey: Spr.Honey,
  syrup: Spr.Syrup,
  confetti: Spr.Confetti,
  sparkB: Spr.SparkB,
  sparkG: Spr.SparkG,
  sparkV: Spr.SparkV,
  mote: Spr.Mote,
};

/** A place's names for the sprites it throws. */
const PLACE_SPR: Record<PlaceSpr, Spr> = {
  ember: Spr.Ember,
  spark: Spr.SparkC,
  sparkB: Spr.SparkB,
  sparkG: Spr.SparkG,
  sparkV: Spr.SparkV,
  flake: Spr.Flake,
  drop: Spr.Drop,
  feather: Spr.Feather,
  smoke: Spr.Smoke,
  dust: Spr.Dust,
  glint: Spr.Glint,
  mote: Spr.Mote,
  confetti: Spr.Confetti,
  steam: Spr.Steam,
  sauce: Spr.Sauce,
};
interface SprDef {
  /** Frame size (px) and how many; `anim`: the frames play through its life (else one is picked per particle). */
  w: number;
  h: number;
  n: number;
  anim: boolean;
  /** Drawn along its motion, stretched with speed. */
  streak?: boolean;
  draw: (ctx: Ctx, i: number) => void;
}

/** A drift of fine powder (flour, stone dust): a haze of many small soft dabs in a loose, uneven cluster, lighter on
 *  its top-left side and shaded under; frame i of 8 spreads and thins out to nothing. No lumps: it is dust, not cloud. */
function puff(hi: string, mid: string, lo: string) {
  return (ctx: Ctx, i: number) => {
    const p = i / 7;
    const r = rng(77);
    const A = 0.7 * (1 - 0.75 * p);
    for (let k = 0; k < 46; k++) {
      // (the same dabs every frame, drifting outwards and thinning)
      const a = r() * Math.PI * 2;
      const d0 = Math.sqrt(r()) * 13;
      const d = d0 * (1 + 0.9 * p) + p * 6 * r();
      const x = 32 + Math.cos(a) * d * (1 + 0.15 * Math.cos(a * 3));
      const y = 32 + Math.sin(a) * d * 0.78;
      const rr = (3 + r() * 5) * (1 + 0.6 * p);
      // lit from the top left: dabs there light, the underside shaded
      const lit = Math.max(0, Math.min(1, 0.5 - (x - 32 + (y - 32)) / 40));
      const col = lit > 0.55 ? hi : lit > 0.3 ? mid : lo;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
      g.addColorStop(0, rgba(col, A * (0.5 + r() * 0.5)));
      g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g;
      ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
  };
}

function polyPts(ctx: Ctx, pts: Pt[]): void {
  ctx.beginPath();
  pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}

function spark(edge: string, body: string, hot: string, glow = false) {
  return (ctx: Ctx) => {
    if (glow) {
      // a soft halo of its own light round the streak
      const hg = ctx.createLinearGradient(0, 0, 48, 0);
      hg.addColorStop(0, rgba(body, 0));
      hg.addColorStop(1, rgba(body, 0.35));
      ctx.strokeStyle = hg;
      ctx.lineWidth = 11;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(8, 6);
      ctx.lineTo(42, 6);
      ctx.stroke();
    }
    const g = ctx.createLinearGradient(0, 0, 48, 0);
    g.addColorStop(0, rgba(edge, 0));
    g.addColorStop(0.7, rgba(edge, 0.55));
    g.addColorStop(1, rgba(edge, 0.7));
    ctx.strokeStyle = g;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(4, 6);
    ctx.lineTo(44, 6);
    ctx.stroke();
    const b = ctx.createLinearGradient(0, 0, 48, 0);
    b.addColorStop(0, rgba(body, 0));
    b.addColorStop(0.6, rgba(body, 0.9));
    b.addColorStop(1, hot);
    ctx.strokeStyle = b;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(8, 6);
    ctx.lineTo(44, 6);
    ctx.stroke();
  };
}

/** A glowing mote, round: a hot core in its own soft light (an ember, a spark of soul-fire), filled, no outline. */
function mote(body: string, hot: string) {
  return (ctx: Ctx) => {
    const g = ctx.createRadialGradient(12, 12, 0, 12, 12, 12);
    g.addColorStop(0, hot);
    g.addColorStop(0.22, hot);
    g.addColorStop(0.42, rgba(body, 0.85));
    g.addColorStop(0.7, rgba(body, 0.25));
    g.addColorStop(1, rgba(body, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 24, 24);
  };
}

/** A round drop, lit from the top left: a soft body, a darker rim on its lower right, a white glint (water, sauce). */
function blob(cols: [string, string, string]) {
  return (ctx: Ctx, i: number) => {
    const r = 6 + i * 1.2;
    const g = ctx.createRadialGradient(10, 10, 0, 12, 12, r + 1.5);
    g.addColorStop(0, rgba(cols[2], 0.95));
    g.addColorStop(0.5, rgba(cols[1], 0.85));
    g.addColorStop(0.85, rgba(cols[0], 0.7));
    g.addColorStop(1, rgba(cols[0], 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(12, 12, r + 1.5, 0, Math.PI * 2);
    ctx.fill();
    const w = ctx.createRadialGradient(9.5, 9.5, 0, 9.5, 9.5, 2.6);
    w.addColorStop(0, 'rgba(255,255,255,0.95)');
    w.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = w;
    ctx.fillRect(6, 6, 7, 7);
  };
}

function ring(col: string) {
  return (ctx: Ctx) => {
    const g = ctx.createRadialGradient(48, 48, 26, 48, 48, 47);
    g.addColorStop(0, rgba(col, 0));
    g.addColorStop(0.55, rgba(col, 0.85));
    g.addColorStop(0.7, rgba('#ffffff', 0.9));
    g.addColorStop(0.85, rgba(col, 0.5));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 96, 96);
  };
}

const SPR: Record<Spr, SprDef> = {
  [Spr.Flour]: { w: 64, h: 64, n: 8, anim: true, draw: puff('#ffffff', '#f2eadc', '#c9b89c') },
  [Spr.Speck]: {
    w: 12,
    h: 12,
    n: 3,
    anim: false,
    draw: (ctx, i) => {
      const rr = 2 + i * 0.6;
      ellipse(ctx, 6.6, 6.9, rr, rr);
      ctx.fillStyle = 'rgba(150,128,100,0.55)';
      ctx.fill();
      ellipse(ctx, 6, 6, rr, rr);
      ctx.fillStyle = i === 2 ? '#f4dca0' : '#fffaf0';
      ctx.fill();
      ellipse(ctx, 5.3, 5.2, rr * 0.4, rr * 0.4);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    },
  },
  [Spr.Dust]: { w: 64, h: 64, n: 8, anim: true, draw: puff('#f4f0ea', '#cfc6bc', '#8a8078') },
  [Spr.Chip]: {
    w: 20,
    h: 20,
    n: 3,
    anim: false,
    draw: (ctx, i) => {
      const r = rng(31 + i);
      const pts: Pt[] = [];
      const n = 5 + i;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + r() * 0.5;
        const d = 4.5 + r() * 3.5;
        pts.push([10 + Math.cos(a) * d, 10 + Math.sin(a) * d]);
      }
      // a shadow side, the lit face, a dark edge
      ctx.save();
      ctx.translate(1, 1.3);
      polyPts(ctx, pts);
      ctx.fillStyle = 'rgba(60,52,64,0.55)';
      ctx.fill();
      ctx.restore();
      polyPts(ctx, pts);
      const g = ctx.createLinearGradient(4, 4, 16, 16);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.45, '#e2dcd6');
      g.addColorStop(1, '#8e8690');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = 'rgba(58,52,68,0.95)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(6, 9 + i);
      ctx.lineTo(14, 11 - i);
      ctx.strokeStyle = 'rgba(110,110,130,0.6)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    },
  },
  [Spr.Shard]: {
    w: 24,
    h: 24,
    n: 3,
    anim: false,
    draw: (ctx, i) => {
      // a long glassy sliver: black, a violet edge where the light comes through, a white spec
      const r = rng(53 + i);
      const lean = (r() - 0.5) * 3;
      const pts: Pt[] = [[12 + lean, 1], [15.5 + r() * 1.5, 12], [12 - lean * 0.5, 23], [8.5 - r() * 1.5, 13]];
      polyPts(ctx, pts);
      const g = ctx.createLinearGradient(8, 2, 16, 22);
      g.addColorStop(0, '#3a2a56');
      g.addColorStop(0.35, '#120e1a');
      g.addColorStop(1, '#040306');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = 'rgba(10,4,16,1)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pts[0][0] - 0.4, pts[0][1] + 1.5);
      ctx.lineTo(pts[3][0] + 0.8, pts[3][1]);
      ctx.strokeStyle = 'rgba(196,150,255,0.95)';
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ellipse(ctx, pts[0][0] + 0.6, pts[0][1] + 5, 1.1, 1.8, 0.2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    },
  },
  [Spr.SparkC]: { w: 48, h: 12, n: 1, anim: false, streak: true, draw: spark('#7a2a08', '#ff9a3a', '#fff4c8') },
  [Spr.SparkN]: { w: 48, h: 12, n: 1, anim: false, streak: true, draw: spark('#0a4a5a', '#3ae8ff', '#f0ffff', true) },
  [Spr.Glint]: {
    w: 32,
    h: 32,
    n: 1,
    anim: false,
    draw: (ctx) => {
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
    },
  },
  [Spr.RingO]: { w: 96, h: 96, n: 1, anim: false, draw: ring('#ffb070') },
  [Spr.Mote]: {
    w: 24,
    h: 24,
    n: 1,
    anim: false,
    draw: (ctx) => {
      const g = ctx.createRadialGradient(12, 12, 0, 12, 12, 11);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.25, 'rgba(214,170,255,0.95)');
      g.addColorStop(0.6, 'rgba(140,80,230,0.4)');
      g.addColorStop(1, 'rgba(110,60,200,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 24, 24);
    },
  },
  [Spr.Ember]: { w: 24, h: 24, n: 1, anim: false, draw: mote('#ff7a1a', '#fff4c8') },
  [Spr.SparkB]: { w: 24, h: 24, n: 1, anim: false, draw: mote('#3a98f0', '#eaf8ff') },
  [Spr.SparkG]: { w: 24, h: 24, n: 1, anim: false, draw: mote('#3dff7a', '#f0fff0') },
  [Spr.SparkV]: { w: 24, h: 24, n: 1, anim: false, draw: mote('#b070ff', '#fff4ff') },
  [Spr.Flake]: { w: 20, h: 20, n: 3, anim: false, draw: flake },
  [Spr.Drop]: { w: 24, h: 24, n: 3, anim: false, draw: blob(['#4a8ab8', '#bfe6fa', '#f4fcff']) },
  [Spr.Feather]: { w: 24, h: 24, n: 2, anim: false, draw: feather },
  [Spr.Smoke]: { w: 64, h: 64, n: 8, anim: true, draw: puff('#d8d0ca', '#8e8680', '#4e4844') },
  [Spr.Confetti]: { w: 16, h: 16, n: 4, anim: false, draw: confetti },
  [Spr.Steam]: { w: 64, h: 64, n: 8, anim: true, draw: puff('#ffffff', '#f2eeea', '#b8b0b4') },
  [Spr.Sauce]: { w: 24, h: 24, n: 3, anim: false, draw: blob(['#6a0c02', '#c8301a', '#ff9a7a']) },
  [Spr.Crumb]: { w: 16, h: 16, n: 3, anim: false, draw: crumb },
  [Spr.Wisp]: { w: 40, h: 80, n: 8, anim: true, draw: wisp },
  [Spr.Mist]: { w: 64, h: 64, n: 8, anim: true, draw: puff('#ffffff', '#e4eef8', '#9fb6cc') },
  [Spr.Choc]: { w: 24, h: 24, n: 3, anim: false, draw: blob(['#2a1006', '#5c2c12', '#c88a5a']) },
  [Spr.Honey]: { w: 24, h: 24, n: 3, anim: false, draw: blob(['#7a3c02', '#e09a1e', '#fff0b0']) },
  [Spr.Syrup]: { w: 24, h: 24, n: 3, anim: false, draw: blob(['#8a1e4a', '#ee6a9e', '#ffe0ee']) },
  [Spr.Coin]: { w: 24, h: 24, n: 3, anim: false, draw: coin },
  [Spr.Shred]: { w: 24, h: 24, n: 3, anim: false, draw: shred },
  [Spr.Pepper]: { w: 16, h: 16, n: 3, anim: false, draw: pepper },
  [Spr.Gold]: { w: 24, h: 24, n: 1, anim: false, draw: mote('#ffb020', '#fff8d8') },
  [Spr.Fire]: { w: 24, h: 24, n: 6, anim: false, draw: (ctx, i) => mote(['#ff3a3a', '#ff9a2a', '#ffe03a', '#4aff8a', '#3aa8ff', '#9a5aff'][i], '#ffffff')(ctx) },
  [Spr.Ruby]: { w: 24, h: 24, n: 1, anim: false, draw: mote('#ff2a5a', '#fff0f4') },
  [Spr.White]: { w: 24, h: 24, n: 1, anim: false, draw: mote('#b8d8ff', '#ffffff') },
  [Spr.GoldFeather]: { w: 24, h: 24, n: 2, anim: false, draw: goldFeather },
};

/** A small golden feather: a gold vane, lit on its top, a darker quill. */
function goldFeather(ctx: Ctx, i: number): void {
  ctx.save();
  ctx.translate(12, 12);
  ctx.rotate(i ? 0.5 : -0.3);
  ctx.beginPath();
  ctx.moveTo(-9, 1);
  ctx.quadraticCurveTo(-2, -6, 9, -2);
  ctx.quadraticCurveTo(2, 5, -9, 1);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -6, 0, 5);
  g.addColorStop(0, '#fff6c8');
  g.addColorStop(0.55, '#f0bf3e');
  g.addColorStop(1, '#9a6a0a');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,56,4,0.8)';
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-10, 1.5);
  ctx.quadraticCurveTo(0, -1, 9, -2);
  ctx.strokeStyle = 'rgba(120,80,10,0.9)';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.restore();
}

/** A tip coin tumbling: gold, lit from the top left, frame i turned edge-on a little more (it spins as it flies). */
function coin(ctx: Ctx, i: number): void {
  const sx = [1, 0.62, 0.25][i];
  ctx.save();
  ctx.translate(12, 12);
  ctx.scale(sx, 1);
  ctx.beginPath();
  ctx.arc(0.6, 0.9, 8.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(90,50,0,0.45)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(-3, -3.5, 0.5, 0, 0, 9);
  g.addColorStop(0, '#fff6b8');
  g.addColorStop(0.45, '#ffd23f');
  g.addColorStop(1, '#b87a0a');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,50,4,0.95)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 5.8, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(160,100,10,0.7)';
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ctx.restore();
  ellipse(ctx, 12 - 3 * sx, 8.5, 1.6 * sx + 0.4, 1.1);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fill();
}

/** A shred of popped balloon: a curled scrap of red rubber, lit on its top. */
function shred(ctx: Ctx, i: number): void {
  const r = rng(91 + i);
  ctx.save();
  ctx.translate(12, 12);
  ctx.rotate(r() * 6);
  ctx.beginPath();
  ctx.moveTo(-7, -1);
  ctx.quadraticCurveTo(-2, -6 - i, 6, -3);
  ctx.quadraticCurveTo(8, 1, 4, 3);
  ctx.quadraticCurveTo(-1, 0, -6, 4);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -6, 0, 4);
  g.addColorStop(0, '#ff9a84');
  g.addColorStop(0.5, '#e03a24');
  g.addColorStop(1, '#8a160c');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(70,10,4,0.9)';
  ctx.lineWidth = 1.1;
  ctx.stroke();
  ctx.restore();
}

/** A flake of pepper: dark, angular, a lit edge. */
function pepper(ctx: Ctx, i: number): void {
  const r = rng(61 + i);
  const pts: Pt[] = [];
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + r() * 0.6;
    const d = 3 + r() * 3;
    pts.push([8 + Math.cos(a) * d, 8 + Math.sin(a) * d]);
  }
  polyPts(ctx, pts);
  const g = ctx.createLinearGradient(3, 3, 13, 13);
  g.addColorStop(0, '#9a7a56');
  g.addColorStop(0.35, '#3a2618');
  g.addColorStop(1, '#0e0804');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(10,4,2,0.9)';
  ctx.lineWidth = 0.9;
  ctx.stroke();
}

/** A crumb of baked crust: an uneven lump, golden on its lit top left, browned under, a pore or two. */
function crumb(ctx: Ctx, i: number): void {
  const r = rng(71 + i);
  const pts: Pt[] = [];
  const n = 6 + i;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + r() * 0.5;
    const d = 3.6 + r() * 2.6;
    pts.push([8 + Math.cos(a) * d, 8 + Math.sin(a) * d * 0.85]);
  }
  ctx.save();
  ctx.translate(0.8, 1.1);
  polyPts(ctx, pts);
  ctx.fillStyle = 'rgba(60,24,4,0.45)';
  ctx.fill();
  ctx.restore();
  polyPts(ctx, pts);
  const g = ctx.createLinearGradient(3, 3, 13, 13);
  g.addColorStop(0, '#f8d898');
  g.addColorStop(0.45, i === 2 ? '#c8803a' : '#dc9a4a');
  g.addColorStop(1, '#7a4012');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(70,30,6,0.85)';
  ctx.lineWidth = 0.9;
  ctx.stroke();
  for (let k = 0; k < 2; k++) {
    ellipse(ctx, 6 + r() * 5, 6 + r() * 5, 0.8, 0.6);
    ctx.fillStyle = 'rgba(90,40,8,0.7)';
    ctx.fill();
  }
  ellipse(ctx, 6, 5.6, 1.3, 0.8, -0.5);
  ctx.fillStyle = 'rgba(255,244,214,0.8)';
  ctx.fill();
}

/** A wisp of steam rising: a curling ribbon of soft dabs, faint at its foot and its tip; frame i of 8 curls more and
 *  spreads thinner. Lit on its left, a breath of grey on its right so it reads on cream. */
function wisp(ctx: Ctx, i: number): void {
  const p = i / 7;
  const A = 3 + 7 * p;
  const ph = p * 2.4;
  for (let y = 74; y >= 6; y -= 2.2) {
    const u = (74 - y) / 68;
    const x = 20 + A * Math.sin(u * 5.2 + ph) * (0.25 + 0.75 * u);
    const env = Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.15)), 0.9);
    const rr = (2.6 + 2.6 * p) * (0.7 + 0.5 * u);
    const a = 0.2 * (1 - 0.55 * p) * env;
    if (a <= 0.005) continue;
    const sg = ctx.createRadialGradient(x + rr * 0.35, y + 0.6, 0, x + rr * 0.35, y + 0.6, rr * 1.2);
    sg.addColorStop(0, rgba('#a8a2ac', a * 0.35));
    sg.addColorStop(1, rgba('#a8a2ac', 0));
    ctx.fillStyle = sg;
    ctx.fillRect(x - rr, y - rr, rr * 3, rr * 3);
    const g = ctx.createRadialGradient(x - rr * 0.2, y, 0, x, y, rr);
    g.addColorStop(0, rgba('#ffffff', a));
    g.addColorStop(1, rgba('#ffffff', 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
}

/** A soft lit flake (snow): a white disc, lit on its top left, a faint cool shade under. */
function flake(ctx: Ctx, i: number): void {
  const rr = 5 + i;
  const g = ctx.createRadialGradient(9, 9, 0, 10, 10, rr + 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.55, 'rgba(240,246,255,0.9)');
  g.addColorStop(0.8, 'rgba(190,210,240,0.45)');
  g.addColorStop(1, 'rgba(190,210,240,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 20, 20);
}

/** A small feather: a quill, a soft vane lit on its top, darker at its tip. */
function feather(ctx: Ctx, i: number): void {
  ctx.save();
  ctx.translate(12, 12);
  ctx.rotate(i ? 0.5 : -0.3);
  ctx.beginPath();
  ctx.moveTo(-9, 1);
  ctx.quadraticCurveTo(-2, -6, 9, -2);
  ctx.quadraticCurveTo(2, 5, -9, 1);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -6, 0, 5);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.6, i ? '#d8d8dc' : '#e8e6e0');
  g.addColorStop(1, i ? '#8a8e98' : '#a8a49a');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,60,70,0.55)';
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-10, 1.5);
  ctx.quadraticCurveTo(0, -1, 9, -2);
  ctx.strokeStyle = 'rgba(120,110,100,0.8)';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.restore();
}

/** A scrap of confetti: a lit card in one of four colours. */
function confetti(ctx: Ctx, i: number): void {
  const col = ['#ff4f7a', '#ffd23f', '#3ae8ff', '#7dff9a'][i];
  ctx.save();
  ctx.translate(8, 8);
  ctx.rotate(0.4 + i);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(-4.4, -2.2, 9.6, 5.2);
  const g = ctx.createLinearGradient(-5, -3, 5, 3);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.35, col);
  g.addColorStop(1, col);
  ctx.fillStyle = g;
  ctx.fillRect(-5, -2.6, 9.6, 5.2);
  ctx.restore();
}

let sprites: HTMLCanvasElement[][] | null = null;
/** Every sprite's frames, painted once. */
export function craftSprites(): HTMLCanvasElement[][] {
  if (!sprites)
    sprites = (Object.keys(SPR) as unknown as Spr[]).map((k) => {
      const d = SPR[k];
      return Array.from({ length: d.n }, (_, i) => {
        const [c, ctx] = makeCanvas(d.w, d.h);
        d.draw(ctx, i);
        return c;
      });
    });
  return sprites;
}
export const sprDef = (s: Spr): { w: number; h: number; n: number; anim: boolean; streak?: boolean } => SPR[s];
export const SPR_COUNT = Object.keys(SPR).length;

/** A pool of what flies off, in world space (the peel's frame in the locker, the play field in a run). */
export class CraftBits {
  readonly n = 64;
  x = new Float32Array(this.n);
  y = new Float32Array(this.n);
  vx = new Float32Array(this.n);
  vy = new Float32Array(this.n);
  grav = new Float32Array(this.n);
  drag = new Float32Array(this.n);
  rot = new Float32Array(this.n);
  spin = new Float32Array(this.n);
  s0 = new Float32Array(this.n);
  s1 = new Float32Array(this.n);
  age = new Float32Array(this.n).fill(9);
  life = new Float32Array(this.n).fill(1);
  a = new Float32Array(this.n);
  fin = new Float32Array(this.n);
  spr = new Uint8Array(this.n);
  frame = new Uint8Array(this.n);
  next = 0;

  tick(dt: number): void {
    for (let i = 0; i < this.n; i++) {
      if (this.age[i] >= this.life[i]) continue;
      this.age[i] += dt;
      const d = Math.max(0, 1 - this.drag[i] * dt);
      this.vx[i] *= d;
      this.vy[i] = this.vy[i] * d + this.grav[i] * dt;
      this.x[i] += this.vx[i] * dt;
      this.y[i] += this.vy[i] * dt;
      this.rot[i] += this.spin[i] * dt;
    }
  }

  /** A particle's look now: [size (world units), alpha, frame], or null when gone. */
  look(i: number): [number, number, number] | null {
    if (this.age[i] >= this.life[i]) return null;
    const k = this.age[i] / this.life[i];
    const a = this.a[i] * Math.min(1, k / Math.max(0.01, this.fin[i])) * (1 - k * k);
    if (a <= 0.01) return null;
    const def = SPR[this.spr[i] as Spr];
    const f = def.anim ? Math.min(def.n - 1, Math.floor(k * def.n)) : this.frame[i];
    return [this.s0[i] + (this.s1[i] - this.s0[i]) * Math.sqrt(k), a, f];
  }
}

// ════════════════════════════ the motion ════════════════════════════

/** How each material takes a smack and a swing: squash (share of the head's height), the spring back (stiffness,
 *  damping), the wobble (radians), a shake (peel units), a hum (copper), and how much a swing bends it. */
const FEEL: Record<CraftKind, { squash: number; k: number; c: number; wob: number; shake: number; vib: number; sway: number; wk: number; wc: number }> = {
  wood: { squash: 0.15, k: 300, c: 10, wob: 0.07, shake: 0, vib: 0, sway: 1, wk: 110, wc: 7 },
  marble: { squash: 0.03, k: 1100, c: 34, wob: 0.008, shake: 2.4, vib: 0, sway: 0.12, wk: 400, wc: 30 },
  copper: { squash: 0.05, k: 700, c: 20, wob: 0.015, shake: 0, vib: 0.04, sway: 0.3, wk: 260, wc: 16 },
  neon: { squash: 0.07, k: 520, c: 16, wob: 0.025, shake: 0.9, vib: 0, sway: 0.45, wk: 200, wc: 12 },
  obsidian: { squash: 0.035, k: 900, c: 28, wob: 0.01, shake: 1.8, vib: 0, sway: 0.18, wk: 360, wc: 26 },
  place: { squash: 0.06, k: 560, c: 17, wob: 0.022, shake: 1, vib: 0, sway: 0.4, wk: 220, wc: 14 },
  pizza: { squash: 0.025, k: 900, c: 26, wob: 0.012, shake: 0.6, vib: 0, sway: 0.3, wk: 300, wc: 20 },
  event: { squash: 0.05, k: 600, c: 18, wob: 0.02, shake: 0.8, vib: 0, sway: 0.38, wk: 230, wc: 15 },
  act: { squash: 0.035, k: 800, c: 24, wob: 0.012, shake: 1.6, vib: 0, sway: 0.25, wk: 320, wc: 22 },
  // a jewel: hard and heavy, it barely gives; it chimes (a quick hum)
  gem: { squash: 0.03, k: 950, c: 26, wob: 0.01, shake: 0.9, vib: 0.018, sway: 0.2, wk: 340, wc: 24 },
};

const reduced = () => !!save.settings.reducedMotion;
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Scratch canvases the size of a rig's head box, shared (they're used and done with inside one paint). */
const scratches = new Map<number, [HTMLCanvasElement, Ctx][]>();
function scratch(RR: number, i: number): [HTMLCanvasElement, Ctx] {
  let s = scratches.get(RR);
  if (!s) scratches.set(RR, (s = []));
  if (!s[i]) s[i] = makeCanvas(SB.w * RR, SB.h * RR);
  return s[i];
}

/** A point `d` along a polyline (and the polyline's length). */
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

/** A soft glow behind the peel (neon's light on whatever is behind it), in the peel's frame. */
export interface CraftGlow {
  x: number;
  y: number;
  rx: number;
  ry: number;
  color: number;
  a: number;
}

/** One place a crafted peel shows (a locker canvas, the cursor peel). */
export class CraftLive {
  t = crand() * 10;
  /** The head's surface this frame (SB at the rig's resolution) and whether it wants repainting. */
  surface: HTMLCanvasElement;
  private sctx: Ctx;
  /** The flex about the pivot: scale across and along, turn, and shift (peel units). */
  sx = 1;
  sy = 1;
  rot = 0;
  dx = 0;
  dy = 0;
  bits = new CraftBits();
  glows: CraftGlow[] = [];
  private q = 0;
  private qv = 0;
  private w = 0;
  private wv = 0;
  private shakeA = 0;
  private vibA = 0;
  private vibT = 0;
  /** Seconds since the last smack. */
  private sm = 9;
  private paintAcc = 1;
  private feel: (typeof FEEL)[CraftKind];
  // ——— the materials' own clocks ———
  private next = 1.5 + crand() * 2.5;
  private runT = -1;
  private runIdx = 0;
  private tapNext = 4 + crand() * 4;
  private twinkles = [{ x: 0, y: 0, t: 9, s: 0 }, { x: 0, y: 0, t: 9, s: 0 }];
  private twNext = 0.5;
  private stutterT = -1;
  private stutterNext = 3 + crand() * 5;
  private pulses: { tr: number; d: number; wait: number }[] = [];
  private padFlash: Float32Array;
  private pt: Pt = [0, 0];
  private pt2: Pt = [0, 0];
  private lastSpeed = 0;
  private shedAcc = 0;
  /** A place peel's window. */
  readonly place: PlaceLive | null;
  private placeEmit: PlaceEmit = (spr, sx, sy, vx, vy, s0, s1, life, o) => {
    const [lx, ly] = this.place!.toPeel(sx, sy);
    const m = this.menu ? 0.6 : 1;
    this.emit(PLACE_SPR[spr], lx, ly, vx * m, vy * m, s0, this.menu ? s1 * 0.8 : s1, life, o);
  };
  /** A pizza peel's pie. */
  readonly pizza: PizzaLive | null;
  private pizzaEmit: PizzaEmit = (spr, lx, ly, vx, vy, s0, s1, life, o) => this.emit(PIZZA_SPR[spr], lx, ly, vx, vy, s0, s1, life, o);
  /** An event or act peel's medallion. */
  readonly medal: MedalLive | null;
  /** A gem peel's stone. */
  readonly gem: GemLive | null;

  constructor(
    readonly rig: CraftRig,
    readonly world: PeelWorld = PEEL_FRAME_WORLD,
    readonly menu = world === PEEL_FRAME_WORLD,
  ) {
    [this.surface, this.sctx] = makeCanvas(SB.w * rig.RR, SB.h * rig.RR);
    this.feel = FEEL[rig.kind];
    this.place = rig.place ? new PlaceLive(rig.place) : null;
    this.pizza = rig.pizza ? new PizzaLive(rig.pizza) : null;
    this.medal = rig.medal ? new MedalLive(rig.medal) : null;
    this.gem = rig.gem ? new GemLive(rig.gem) : null;
    if (this.gem) {
      this.gem.menu = this.menu;
      this.gem.emit = (spr, lx, ly, vx, vy, s0, s1, life, o) => this.emit(GEM_SPR[spr], lx, ly, vx, vy, s0, this.menu ? s1 * 0.8 : s1, life, o);
      // its glows behind the peel (the ruby's red, Prismatic's rainbow): the same objects, moved by the gem
      this.glows = this.gem.glows;
    }
    if (this.medal) {
      this.medal.menu = this.menu;
      // an act's boss stomps where a smack can land: in play and on the locker's big preview (its ▶)
      if (!this.menu || rig.RR >= 2) this.medal.wantBoss();
      this.medal.emit = (spr, lx, ly, vx, vy, s0, s1, life, o) => this.emit(MEDAL_SPR[spr], lx, ly, vx, vy, s0, s1, life, o);
      this.medal.emitPlace = (spr, lx, ly, vx, vy, s0, s1, life, o) => {
        const m = this.menu ? 0.6 : 1;
        this.emit(PLACE_SPR[spr], lx, ly, vx * m, vy * m, s0, this.menu ? s1 * 0.8 : s1, life, o);
      };
    }
    if (this.pizza) {
      this.pizza.emit = this.pizzaEmit;
      this.pizza.menu = this.menu;
      // a Rare Find's finish: its coloured glow under it, as on the table
      const glow = rig.pizza!.tr.glow;
      if (glow !== null) this.glows = [{ x: HX, y: HY, rx: R * 1.2, ry: R * 1.2, color: glow, a: 0 }];
    }
    const traces = rig.kind === 'neon' ? neonGeo(rig.look.shape).traces : [];
    this.padFlash = new Float32Array(traces.length);
    if (traces.length) for (let i = 0; i < 3; i++) this.pulses.push({ tr: Math.floor(crand() * traces.length), d: crand() * 40, wait: i * 0.4 });
    if (rig.kind === 'neon') this.glows = [{ x: HX, y: HY - 4, rx: R * 1.25, ry: R * 1.3, color: 0xff4fa3, a: 0 }, { x: HX + 2, y: HY + 4, rx: R * 0.8, ry: R * 0.8, color: 0x3ae8ff, a: 0 }];
    this.paint();
  }

  // ——— particles ———

  /** Shed a sprite from (lx, ly) in the peel's frame, moving (lvx, lvy) peel units/s in it; sizes in peel units,
   *  gravity in world units/s² (down the screen, whichever way the peel leans). */
  private emit(spr: Spr, lx: number, ly: number, lvx: number, lvy: number, s0: number, s1: number, life: number, o: { grav?: number; drag?: number; a?: number; fin?: number; spin?: number; rot?: number } = {}): void {
    const b = this.bits;
    const i = b.next;
    b.next = (i + 1) % b.n;
    const W = this.world;
    const [wx, wy] = W.toWorld(lx, ly);
    const [ex, ey] = W.toWorld(lx + lvx * 0.01, ly + lvy * 0.01);
    const k = W.scale();
    b.x[i] = wx;
    b.y[i] = wy;
    b.vx[i] = (ex - wx) * 100;
    b.vy[i] = (ey - wy) * 100;
    b.grav[i] = (o.grav ?? 0) * k;
    b.drag[i] = o.drag ?? 0;
    b.rot[i] = o.rot ?? crand() * Math.PI * 2;
    b.spin[i] = o.spin ?? (crand() - 0.5) * 6;
    b.s0[i] = s0 * k;
    b.s1[i] = s1 * k;
    b.age[i] = 0;
    b.life[i] = life;
    b.a[i] = o.a ?? 1;
    b.fin[i] = o.fin ?? 0.08;
    b.spr[i] = spr;
    b.frame[i] = Math.floor(crand() * SPR[spr].n);
  }

  /** A point on the head's rim (angle in radians, 0 = right, +π/2 = down), pulled in a little. */
  private rim(a: number, inset = 4): [number, number] {
    return [HX + Math.cos(a) * (R - inset), HY + Math.sin(a) * (R - inset)];
  }

  // ——— a smack ———

  smack(): void {
    const f = this.feel;
    const calm = reduced() ? 0.4 : 1;
    this.sm = 0;
    this.q = f.squash * calm;
    this.qv = 0;
    this.wv += (crand() < 0.5 ? -1 : 1) * f.wob * 14 * calm;
    this.shakeA = f.shake * calm;
    this.vibA = f.vib * calm;
    this.vibT = 0;
    this.paintAcc = 1;
    const n = reduced() ? 0.4 : 1;
    const m = this.menu ? 0.55 : 1;
    switch (this.rig.kind) {
      case 'wood': {
        // a quick drift of flour thrown off the face and out past the rim, gone in under half a second
        const pm = this.menu ? 0.75 : 1.2;
        for (let i = 0; i < Math.round(8 * n); i++) {
          const a = (i / 8) * Math.PI * 2 + crand() * 0.6;
          const d = R * (0.55 + crand() * 0.3);
          this.emit(Spr.Flour, HX + Math.cos(a) * d, HY + 6 + Math.sin(a) * d * 0.9, Math.cos(a) * (150 + crand() * 90) * pm, Math.sin(a) * (120 + crand() * 80) * pm - 30, 34, this.menu ? 72 : 120, 0.32 + crand() * 0.12, { drag: 3.2, a: 1, fin: 0.05, spin: (crand() - 0.5) * 1.2 });
        }
        for (let i = 0; i < Math.round(14 * n); i++) {
          const a = crand() * Math.PI * 2;
          const sp = (90 + crand() * 170) * m;
          this.emit(Spr.Speck, HX + 4 + Math.cos(a) * 40, HY + 14 + Math.sin(a) * 34, Math.cos(a) * sp, Math.sin(a) * sp - 60, 7 + crand() * 4, 5, 0.45 + crand() * 0.3, { grav: 420, drag: 1.5 });
        }
        break;
      }
      case 'marble': {
        for (let i = 0; i < Math.round(5 * n); i++) {
          const a = -Math.PI / 2 + (crand() - 0.5) * 2.6;
          const sp = (110 + crand() * 150) * m;
          this.emit(Spr.Chip, HX + Math.cos(a) * R * 0.75, HY + Math.sin(a) * R * 0.7, Math.cos(a) * sp * 1.5, Math.sin(a) * sp * 1.5 - 90, 20 + crand() * 8, 17, 0.65 + crand() * 0.3, { grav: 700, drag: 0.4, spin: (crand() - 0.5) * 16, fin: 0.01 });
        }
        for (let i = 0; i < Math.round(3 * n); i++) {
          const a = crand() * Math.PI * 2;
          this.emit(Spr.Dust, HX + Math.cos(a) * R * 0.7, HY + Math.sin(a) * R * 0.65, Math.cos(a) * 120, Math.sin(a) * 90 - 20, 40, this.menu ? 80 : 110, 0.45 + crand() * 0.2, { drag: 2.8, a: 0.9 });
        }
        break;
      }
      case 'copper': {
        for (let i = 0; i < Math.round(7 * n); i++) {
          const a = crand() * Math.PI * 2;
          const sp = (160 + crand() * 220) * m;
          this.emit(Spr.SparkC, HX + Math.cos(a) * 30, HY + Math.sin(a) * 30, Math.cos(a) * sp, Math.sin(a) * sp - 80, 24 + crand() * 10, 14, 0.3 + crand() * 0.25, { grav: 700, fin: 0.01 });
        }
        if (!this.menu) this.emit(Spr.RingO, HX, HY, 0, 0, 60, 300, 0.42, { a: 0.6, fin: 0.02, spin: 0 });
        break;
      }
      case 'neon': {
        const traces = neonGeo(this.rig.look.shape).traces;
        this.padFlash.fill(1);
        traces.forEach((tr, i) => {
          if (i % 2 && n < 1) return;
          const [px, py] = tr.pts[tr.pts.length - 1];
          const a = Math.atan2(py - HY, px - HX) + (crand() - 0.5) * 0.8;
          const sp = (120 + crand() * 180) * m;
          this.emit(Spr.SparkN, px, py, Math.cos(a) * sp * 1.3, Math.sin(a) * sp * 1.3 - 60, 34 + crand() * 10, 18, 0.28 + crand() * 0.2, { grav: 600, fin: 0.01 });
        });
        break;
      }
      case 'place':
        this.place?.smack(this.placeEmit);
        break;
      case 'pizza':
        this.pizza?.smack();
        break;
      case 'event':
      case 'act':
        this.medal?.smack();
        break;
      case 'gem':
        this.gem?.smack();
        break;
      case 'obsidian': {
        for (let i = 0; i < Math.round(6 * n); i++) {
          const a = crand() * Math.PI * 2;
          const sp = (120 + crand() * 170) * m;
          this.emit(Spr.Shard, HX + Math.cos(a) * R * 0.72, HY + Math.sin(a) * R * 0.85, Math.cos(a) * sp * 1.4, Math.sin(a) * sp * 1.4 - 80, 22 + crand() * 8, 20, 0.5 + crand() * 0.3, { grav: 620, drag: 0.5, spin: (crand() - 0.5) * 18 });
        }
        for (let i = 0; i < Math.round(6 * n); i++) {
          const a = crand() * Math.PI * 2;
          const sp = (40 + crand() * 70) * m;
          this.emit(Spr.Mote, HX + Math.cos(a) * 10, HY + Math.sin(a) * 10, Math.cos(a) * sp, Math.sin(a) * sp - 30, 16, 6, 0.5 + crand() * 0.4, { drag: 1.5 });
        }
        break;
      }
    }
  }

  // ——— each frame ———

  /** Advance by dt. `vx`, `vy`: the peel's velocity in its own frame (peel units/s). */
  update(dt: number, vx = 0, vy = 0): void {
    const f = this.feel;
    const calm = reduced() ? 0.35 : 1;
    this.t += dt;
    this.sm += dt;
    this.paintAcc += dt;
    // ——— the flex ———
    const n = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / n;
    // a swing bends it back (wood most), then it springs
    const target = Math.max(-0.08, Math.min(0.08, -vx * 0.00011 * f.sway)) * calm;
    for (let s = 0; s < n; s++) {
      this.qv += (-this.q * f.k - this.qv * f.c) * h;
      this.q += this.qv * h;
      this.wv += (-(this.w - target) * f.wk - this.wv * f.wc) * h;
      this.w += this.wv * h;
    }
    this.shakeA *= Math.exp(-dt / 0.07);
    this.vibA *= Math.exp(-dt / 0.16);
    this.vibT += dt;
    const vib = this.vibA * Math.sin(this.vibT * Math.PI * 2 * 26);
    this.sx = 1 + this.q * 0.55 + vib;
    this.sy = 1 - this.q - vib;
    this.rot = this.w;
    this.dx = this.shakeA * noise1(this.t * 60);
    this.dy = this.shakeA * noise1(this.t * 60 + 17) * 0.6;
    // ——— the materials' own life ———
    const speed = Math.hypot(vx, vy);
    this.lastSpeed = speed;
    switch (this.rig.kind) {
      case 'wood':
        this.woodTick(dt, speed, vx);
        break;
      case 'marble':
        this.marbleTick(dt);
        break;
      case 'copper':
        this.copperTick(dt);
        break;
      case 'neon':
        this.neonTick(dt);
        break;
      case 'obsidian':
        this.obsidianTick(dt);
        break;
      case 'place':
        this.place?.update(dt);
        break;
      case 'pizza':
        if (this.pizza) {
          this.pizza.update(dt, vx, vy);
          if (this.glows[0]) this.glows[0].a = this.pizza.glowA;
        }
        break;
      case 'event':
      case 'act':
        this.medal?.update(dt);
        break;
      case 'gem':
        this.gem?.update(dt, vx);
        break;
    }
    this.bits.tick(dt);
  }

  /** A sweep that runs every few seconds: its progress 0–1, or -1 between runs. */
  private sweep(dt: number, dur: number, gap: [number, number]): number {
    if (this.runT < 0) {
      this.next -= dt;
      if (this.next <= 0) this.runT = 0;
      return -1;
    }
    this.runT += dt / dur;
    if (this.runT >= 1) {
      this.runT = -1;
      this.next = gap[0] + crand() * (gap[1] - gap[0]);
      return -1;
    }
    return this.runT;
  }

  private woodTick(dt: number, speed: number, vx: number): void {
    this.sweep(dt, 1.5, [4.5, 7.5]);
    if (this.menu) {
      // now and then it taps the counter: a little bounce, and flour sifts off its lower edge
      this.tapNext -= dt;
      if (this.tapNext <= 0) {
        this.tapNext = 6.5 + crand() * 4;
        if (!reduced()) {
          this.q = Math.max(this.q, 0.035);
          for (let i = 0; i < 4; i++) {
            const [x, y] = this.rim(Math.PI * (0.3 + crand() * 0.4), 10);
            this.emit(Spr.Speck, x + (crand() - 0.5) * 20, y - 6, (crand() - 0.5) * 30, 10 + crand() * 20, 4 + crand() * 2, 3.5, 1 + crand() * 0.5, { grav: 60, drag: 2 });
          }
        }
      }
    } else if (!reduced()) {
      // swung, it sheds flour off its trailing edge (and a speck now and then when it's still)
      this.shedAcc += dt * (0.25 + Math.min(1, speed / 1400) * 9);
      while (this.shedAcc >= 1) {
        this.shedAcc -= 1;
        const side = vx > 0 ? Math.PI : 0;
        const [x, y] = this.rim(side + (crand() - 0.5) * 1.6, 12);
        this.emit(Spr.Speck, x, y, -vx * 0.08 + (crand() - 0.5) * 30, (crand() - 0.5) * 30, 4 + crand() * 2.5, 3, 0.7 + crand() * 0.5, { grav: 160, drag: 2.5 });
      }
    }
  }

  private marbleTick(dt: number): void {
    // a glint runs along a vein
    if (this.runT < 0 && this.next - dt <= 0) this.runIdx = Math.floor(crand() * marbleGeo().veins.length);
    this.sweep(dt, 1.7, [2.5, 4.5]);
    // mica twinkles
    this.twNext -= dt;
    for (const tw of this.twinkles) tw.t += dt;
    if (this.twNext <= 0) {
      this.twNext = 0.35 + crand() * 0.7;
      const tw = this.twinkles.find((w) => w.t > 0.55);
      if (tw) {
        const a = crand() * Math.PI * 2;
        const d = Math.sqrt(crand()) * R * 0.78;
        tw.x = HX + Math.cos(a) * d;
        tw.y = HY + Math.sin(a) * d * 0.9;
        tw.t = 0;
        tw.s = 4 + crand() * 4;
      }
    }
  }

  private copperTick(dt: number): void {
    this.sweep(dt, 0.5, [2.8, 5]);
  }

  private neonTick(dt: number): void {
    const traces = neonGeo(this.rig.look.shape).traces;
    for (let i = 0; i < this.padFlash.length; i++) this.padFlash[i] = Math.max(0, this.padFlash[i] - dt * 3.2);
    for (const p of this.pulses) {
      if (p.wait > 0) {
        p.wait -= dt;
        continue;
      }
      p.d += dt * 78;
      if (p.d >= traces[p.tr].len) {
        this.padFlash[p.tr] = 1;
        p.tr = Math.floor(crand() * traces.length);
        p.d = 0;
        p.wait = 0.15 + crand() * 0.9;
      }
    }
    // the pink tube stutters now and then
    if (this.stutterT >= 0) {
      this.stutterT += dt;
      if (this.stutterT > 0.55) {
        this.stutterT = -1;
        this.stutterNext = 4.5 + crand() * 6;
      }
    } else {
      this.stutterNext -= dt;
      if (this.stutterNext <= 0 && !reduced()) this.stutterT = 0;
    }
    const [ta, pa] = this.neonLevels();
    this.glows[0].a = 0.2 * pa;
    this.glows[1].a = 0.12 * ta;
  }

  /** The traces' and the pink tube's brightness now (0–1, more in a surge). */
  private neonLevels(): [number, number] {
    let ta = 0.9 + 0.06 * noise1(this.t * 9);
    let pa = 0.92 + 0.05 * noise1(this.t * 11 + 4);
    if (this.stutterT >= 0) pa *= noise1(this.t * 38) > -0.15 ? 1 : 0.18;
    const s = this.sm;
    if (s < 0.12) {
      ta = pa = 1.6;
    } else if (s < 0.4) {
      const fl = 0.22 + 0.25 * Math.max(0, noise1(this.t * 45));
      ta *= fl;
      pa *= fl;
    } else if (s < 0.75) {
      const k = smoothstep(0.4, 0.75, s);
      ta *= 0.45 + 0.55 * k;
      pa *= 0.45 + 0.55 * k;
    }
    return [ta, pa];
  }

  private obsidianTick(dt: number): void {
    this.sweep(dt, 1.4, [4, 6.5]);
  }

  /** Does the surface want repainting this frame? In play the head repaints at about 30 fps, every frame for a moment
   *  after a smack; in the locker, every frame (the locker runs at 30). */
  wantsPaint(): boolean {
    if (this.menu || this.sm < 0.9 || this.paintAcc >= 1 / 30) {
      this.paintAcc = 0;
      return true;
    }
    return false;
  }

  // ——— the surface ———

  /** Repaint the head's surface: its material, what moves on it (kept inside the head), its rim and outline. */
  paint(): void {
    const rig = this.rig;
    const RR = rig.RR;
    const c = this.sctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    c.clearRect(0, 0, this.surface.width, this.surface.height);
    c.drawImage(rig.under, 0, 0);
    if (this.pizza) {
      // a pizza peel: the board, then the pie and all on it (it keeps itself where it belongs: no mask)
      c.setTransform(RR, 0, 0, RR, -SB.x * RR, -SB.y * RR);
      this.pizza.draw(c);
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalAlpha = 1;
      return;
    }
    if (this.gem) {
      // a gem peel: the stone alive (it keeps itself inside the band), then the band, setting and studs, then their glints
      c.setTransform(RR, 0, 0, RR, -SB.x * RR, -SB.y * RR);
      this.gem.draw(c);
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
      c.drawImage(rig.over, 0, 0);
      c.setTransform(RR, 0, 0, RR, -SB.x * RR, -SB.y * RR);
      this.gem.drawOver(c);
      c.setTransform(1, 0, 0, 1, 0, 0);
      return;
    }
    if (this.medal) {
      // an event or act peel: the medallion (it keeps itself inside its glass), then the bezel and the head over it
      c.setTransform(RR, 0, 0, RR, -SB.x * RR, -SB.y * RR);
      this.medal.draw(c);
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
      c.drawImage(rig.over, 0, 0);
      c.setTransform(RR, 0, 0, RR, -SB.x * RR, -SB.y * RR);
      this.medal.drawOver(c);
      c.setTransform(1, 0, 0, 1, 0, 0);
      return;
    }
    const [ac, ax] = scratch(RR, 0);
    ax.setTransform(1, 0, 0, 1, 0, 0);
    ax.globalAlpha = 1;
    ax.globalCompositeOperation = 'source-over';
    ax.clearRect(0, 0, ac.width, ac.height);
    ax.setTransform(RR, 0, 0, RR, -SB.x * RR, -SB.y * RR);
    this.effects(ax);
    // kept inside the head
    ax.setTransform(1, 0, 0, 1, 0, 0);
    ax.globalAlpha = 1;
    ax.globalCompositeOperation = 'destination-in';
    ax.drawImage(rig.inner, 0, 0);
    ax.globalCompositeOperation = 'source-over';
    c.drawImage(ac, 0, 0);
    c.drawImage(rig.over, 0, 0);
    c.setTransform(RR, 0, 0, RR, -SB.x * RR, -SB.y * RR);
    this.onTop(c);
    c.setTransform(1, 0, 0, 1, 0, 0);
  }

  /** A layer (SB box) drawn into `acc` only where `mask` paints (in peel units), at alpha `a`. */
  private masked(acc: Ctx, layer: HTMLCanvasElement, mask: (ctx: Ctx) => void, a: number): void {
    if (a <= 0.005) return;
    const RR = this.rig.RR;
    const [mc, mx] = scratch(RR, 1);
    mx.setTransform(1, 0, 0, 1, 0, 0);
    mx.globalAlpha = 1;
    mx.globalCompositeOperation = 'source-over';
    mx.clearRect(0, 0, mc.width, mc.height);
    mx.drawImage(layer, 0, 0);
    mx.globalCompositeOperation = 'destination-in';
    mx.setTransform(RR, 0, 0, RR, -SB.x * RR, -SB.y * RR);
    mask(mx);
    mx.globalCompositeOperation = 'source-over';
    acc.save();
    acc.setTransform(1, 0, 0, 1, 0, 0);
    acc.globalAlpha = Math.min(1, a);
    acc.drawImage(mc, 0, 0);
    acc.restore();
  }

  /** A soft band across the head, along the light's diagonal: u runs -1 (top left) … 1 (bottom right). */
  private band(ctx: Ctx, u: number, width: number, a = 1, col = '#ffffff', ang = Math.PI / 4): void {
    const cx = HX + Math.cos(ang) * u * R * 1.2;
    const cy = HY + Math.sin(ang) * u * R * 1.2;
    const dx = Math.cos(ang) * width;
    const dy = Math.sin(ang) * width;
    const g = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
    g.addColorStop(0, rgba(col, 0));
    g.addColorStop(0.5, rgba(col, a));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(SB.x, SB.y, SB.w, SB.h);
  }

  private drawLayer(ctx: Ctx, l: HTMLCanvasElement | null, a: number, ox = 0, oy = 0): void {
    if (!l || a <= 0.005) return;
    ctx.globalAlpha = Math.min(1, a);
    ctx.drawImage(l, SB.x + ox, SB.y + oy, SB.w, SB.h);
    ctx.globalAlpha = 1;
  }

  /** The reflection drifting as the light moves (and as the peel swings). */
  private reflectDrift(ctx: Ctx, a = 1): void {
    const sw = Math.max(-1, Math.min(1, this.lastSpeed / 1500));
    const ox = noise1(this.t * 0.17) * 5 - sw * 4;
    const oy = noise1(this.t * 0.13 + 7) * 4;
    this.drawLayer(ctx, this.rig.reflect, a * (0.85 + 0.15 * noise1(this.t * 0.3 + 3)), ox, oy);
  }

  /** What moves on the surface, in peel units (kept inside the head after). */
  private effects(ctx: Ctx): void {
    const rig = this.rig;
    const s = this.sm;
    const u = this.runT;
    switch (rig.kind) {
      case 'place':
        this.place?.draw(ctx);
        break;
      case 'wood': {
        if (u >= 0) {
          // the sheen runs over the varnish, the grain catching it
          const b = -1.25 + 2.5 * u;
          const env = Math.sin(Math.PI * u);
          this.band(ctx, b, 52, 0.26 * env, '#fff6e4');
          this.masked(ctx, rig.lit!, (m) => this.band(m, b, 40), 0.22 * env);
        }
        break;
      }
      case 'marble': {
        this.reflectDrift(ctx);
        if (u >= 0) {
          // a glint running along a vein, lighting it as it goes
          const v = marbleGeo().veins[this.runIdx];
          const at = u * (v.pts.length - 1);
          const env = Math.sin(Math.PI * u);
          ctx.lineCap = 'round';
          for (let i = Math.max(0, Math.floor(at) - 4); i < Math.min(v.pts.length - 1, Math.ceil(at) + 1); i++) {
            const k = 1 - Math.min(1, Math.abs(i + 0.5 - at) / 4.5);
            ctx.beginPath();
            ctx.moveTo(v.pts[i][0], v.pts[i][1]);
            ctx.lineTo(v.pts[i + 1][0], v.pts[i + 1][1]);
            ctx.strokeStyle = rgba('#ffc860', 0.85 * k * env);
            ctx.lineWidth = v.w * 1.5;
            ctx.stroke();
          }
          const i0 = Math.min(v.pts.length - 2, Math.floor(at));
          const fk = at - i0;
          this.star(ctx, v.pts[i0][0] + (v.pts[i0 + 1][0] - v.pts[i0][0]) * fk, v.pts[i0][1] + (v.pts[i0 + 1][1] - v.pts[i0][1]) * fk, 9 * env, env);
        }
        for (const tw of this.twinkles) if (tw.t < 0.55) this.star(ctx, tw.x, tw.y, tw.s * Math.sin((Math.PI * tw.t) / 0.55), 0.9);
        if (s < 0.9) {
          // the smack's light floods out along the veins
          const k = s / 0.9;
          const rf = 8 + 150 * Math.pow(k, 0.7);
          this.masked(
            ctx,
            rig.lit!,
            (m) => {
              const g = m.createRadialGradient(HX, HY, Math.max(0, rf - 46), HX, HY, rf + 6);
              g.addColorStop(0, 'rgba(0,0,0,0.25)');
              g.addColorStop(0.8, 'rgba(0,0,0,1)');
              g.addColorStop(1, 'rgba(0,0,0,0)');
              m.fillStyle = g;
              m.fillRect(SB.x, SB.y, SB.w, SB.h);
            },
            (1 - k * k) * 1.6,
          );
          // the veins stay lit gold a moment, and a warm flash where it landed
          this.drawLayer(ctx, rig.lit, 0.45 * (1 - k));
          const fk = Math.max(0, 1 - s / 0.3);
          if (fk > 0) this.dot(ctx, HX, HY, 60, '#ffd890', 0.75 * fk);
        }
        break;
      }
      case 'copper': {
        // the spun highlight swings as the light moves
        const turn = 0.5 * Math.sin(this.t * 0.37) + 0.12 * noise1(this.t * 0.5);
        const cg = ctx.createConicGradient(turn, HX, HY);
        const lobe = (at: number, w: number, a: number) => {
          cg.addColorStop(Math.max(0, at - w), 'rgba(255,240,225,0)');
          cg.addColorStop(at, `rgba(255,240,225,${a})`);
          cg.addColorStop(Math.min(1, at + w), 'rgba(255,240,225,0)');
        };
        cg.addColorStop(0, 'rgba(255,240,225,0)');
        lobe(0.125, 0.035, 0.22);
        lobe(0.625, 0.04, 0.46);
        cg.addColorStop(1, 'rgba(255,240,225,0)');
        ctx.fillStyle = cg;
        ctx.fillRect(SB.x, SB.y, SB.w, SB.h);
        // temper colours breathing in the middle: it's fresh from the oven
        const br = 0.75 + 0.25 * Math.sin(this.t * 0.42);
        const rr = R * (0.8 + 0.07 * Math.sin(this.t * 0.31));
        const hg = ctx.createRadialGradient(HX + 3, HY + 6, 0, HX + 3, HY + 6, rr);
        hg.addColorStop(0, 'rgba(255,214,140,0)');
        hg.addColorStop(0.32, `rgba(255,206,120,${0.12 * br})`);
        hg.addColorStop(0.52, `rgba(196,86,150,${0.13 * br})`);
        hg.addColorStop(0.7, `rgba(84,104,226,${0.11 * br})`);
        hg.addColorStop(0.88, 'rgba(84,104,226,0)');
        ctx.fillStyle = hg;
        ctx.fillRect(SB.x, SB.y, SB.w, SB.h);
        this.reflectDrift(ctx);
        if (s < 0.6) {
          // it rings: ripples run out from the middle, light on their leading side, shadow behind
          ctx.lineCap = 'round';
          for (let i = 0; i < 3; i++) {
            const ti = s - i * 0.075;
            if (ti <= 0 || ti >= 0.5) continue;
            const k = ti / 0.5;
            const r0 = 4 + R * 0.98 * Math.pow(k, 0.75);
            const a = Math.pow(1 - k, 1.4) * (1 - i * 0.22);
            ctx.beginPath();
            ctx.arc(HX, HY, r0, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255,238,216,${0.8 * a})`;
            ctx.lineWidth = 2.8 * (1 - k) + 0.8;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(HX, HY, Math.max(1, r0 - 3.2), 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(80,24,4,${0.4 * a})`;
            ctx.lineWidth = 2 * (1 - k) + 0.6;
            ctx.stroke();
          }
          const fk = Math.max(0, 1 - s / 0.18);
          if (fk > 0) {
            const g = ctx.createRadialGradient(HX, HY, 0, HX, HY, 34);
            g.addColorStop(0, `rgba(255,248,236,${0.7 * fk})`);
            g.addColorStop(1, 'rgba(255,248,236,0)');
            ctx.fillStyle = g;
            ctx.fillRect(HX - 34, HY - 34, 68, 68);
          }
        }
        break;
      }
      case 'neon': {
        const [ta, pa] = this.neonLevels();
        this.drawLayer(ctx, rig.lit, ta);
        this.drawLayer(ctx, rig.lit2, pa);
        if (ta > 1 || pa > 1) {
          // a surge: everything white-hot for a moment, a white flash on the glass
          ctx.globalCompositeOperation = 'lighter';
          this.drawLayer(ctx, rig.lit, (ta - 1) * 1.6);
          this.drawLayer(ctx, rig.lit2, (pa - 1) * 1.6);
          ctx.globalCompositeOperation = 'source-over';
          this.dot(ctx, HX, HY, R * 0.95, '#e8fcff', 0.5 * (1 - this.sm / 0.12));
        }
        const traces = neonGeo(rig.look.shape).traces;
        // data running out along the traces
        ctx.lineCap = 'round';
        for (const p of this.pulses) {
          if (p.wait > 0) continue;
          const tr = traces[p.tr];
          for (let k = 0; k < 9; k++) {
            const d0 = p.d - k * 4;
            if (d0 < 0) break;
            along(tr.pts, d0, this.pt);
            along(tr.pts, Math.max(0, d0 - 4), this.pt2);
            ctx.beginPath();
            ctx.moveTo(this.pt[0], this.pt[1]);
            ctx.lineTo(this.pt2[0], this.pt2[1]);
            ctx.strokeStyle = `rgba(232,254,255,${0.95 * (1 - k / 9) * Math.min(1, ta)})`;
            ctx.lineWidth = 3.2;
            ctx.stroke();
          }
          along(tr.pts, p.d, this.pt);
          this.dot(ctx, this.pt[0], this.pt[1], 12, '#3ae8ff', 0.6 * Math.min(1, ta));
          this.dot(ctx, this.pt[0], this.pt[1], 3.6, '#ffffff', Math.min(1, ta));
        }
        traces.forEach((tr, i) => {
          const fl = this.padFlash[i];
          if (fl <= 0.01) return;
          const [x, y] = tr.pts[tr.pts.length - 1];
          this.dot(ctx, x, y, 11, '#3ae8ff', 0.55 * fl);
          this.dot(ctx, x, y, 3.4, '#ffffff', 0.95 * fl);
        });
        this.reflectDrift(ctx);
        break;
      }
      case 'obsidian': {
        // light moving slowly through the flow bands
        const ang = Math.PI / 4 + 0.6 * Math.sin(this.t * 0.11);
        const b = 0.9 * Math.sin(this.t * 0.33);
        this.drawLayer(ctx, rig.lit, 0.05 + 0.04 * Math.sin(this.t * 0.8));
        this.masked(ctx, rig.lit!, (m) => this.band(m, b, 36, 1, '#000000', ang), 0.5);
        if (u >= 0) {
          // as the light catches the bands, their sheen flashes across the glass
          const bb = -1.3 + 2.6 * u;
          const env = Math.sin(Math.PI * u);
          this.masked(ctx, rig.lit2!, (m) => this.band(m, bb, 34), 0.38 * env);
          this.band(ctx, bb, 26, 0.08 * env);
        }
        this.reflectDrift(ctx);
        if (s < 0.6) {
          // the fracture lights up through the glass from where it landed
          const grow = Math.min(1, s / 0.1);
          const a = 1 - smoothstep(0.1, 0.6, s);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          for (const cr of obsidianGeo().cracks) {
            const nPts = Math.max(2, Math.round(cr.length * grow));
            ctx.beginPath();
            ctx.moveTo(cr[0][0], cr[0][1]);
            for (let i = 1; i < nPts; i++) ctx.lineTo(cr[i][0], cr[i][1]);
            ctx.strokeStyle = `rgba(170,110,255,${0.45 * a})`;
            ctx.lineWidth = 5;
            ctx.stroke();
            ctx.strokeStyle = `rgba(248,240,255,${0.95 * a})`;
            ctx.lineWidth = 1.3;
            ctx.stroke();
          }
          this.dot(ctx, HX, HY, 30, '#b080ff', 0.5 * a);
        }
        break;
      }
    }
  }

  /** On the surface over the rim (a glint on copper's rim). */
  private onTop(ctx: Ctx): void {
    if (this.rig.kind === 'copper' && this.runT >= 0) {
      const env = Math.sin(Math.PI * this.runT);
      this.star(ctx, HX - 55, HY - 58, 10 * env, env);
    }
  }

  private dot(ctx: Ctx, x: number, y: number, r: number, col: string, a: number): void {
    if (a <= 0.01) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(col, a));
    g.addColorStop(0.45, rgba(col, a * 0.5));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  private star(ctx: Ctx, x: number, y: number, size: number, a: number): void {
    if (size <= 0.3 || a <= 0.01) return;
    const img = craftSprites()[Spr.Glint][0];
    ctx.globalAlpha = Math.min(1, a);
    ctx.drawImage(img, x - size, y - size, size * 2, size * 2);
    ctx.globalAlpha = 1;
  }
}

// ════════════════════════════ drawing on a 2D canvas (the locker) ════════════════════════════

/** The canvas round a locker image reaches this far past the peel (peel units): what flies off fades out before
 *  its edge (a sprite cut off by the edge would show as a hard line). */
const MENU_ROOM = { l: -26, r: PEEL_W + 26, t: -44, b: PEEL_H + 44 };

function edgeFade(x: number, y: number, r: number): number {
  const m = Math.min(x - r - MENU_ROOM.l, MENU_ROOM.r - x - r, y - r - MENU_ROOM.t, MENU_ROOM.b - y - r);
  return Math.max(0, Math.min(1, m / 14));
}

/** Draw the pool's sprites (world = the canvas's transform). */
export function drawCraftBits(ctx: Ctx, live: CraftLive, menu: boolean): void {
  const b = live.bits;
  const sp = craftSprites();
  for (let i = 0; i < b.n; i++) {
    const lk = b.look(i);
    if (!lk) continue;
    const [size, a0, f] = lk;
    const s = b.spr[i] as Spr;
    const def = SPR[s];
    const a = menu ? a0 * edgeFade(b.x[i], b.y[i], size * 0.5) : a0;
    if (a <= 0.01) continue;
    const img = sp[s][f];
    ctx.save();
    ctx.translate(b.x[i], b.y[i]);
    ctx.globalAlpha = Math.min(1, a);
    if (def.streak) {
      const v = Math.hypot(b.vx[i], b.vy[i]);
      ctx.rotate(Math.atan2(b.vy[i], b.vx[i]));
      const len = size * (1 + Math.min(1.5, v / 400));
      ctx.drawImage(img, -len * 0.9, -size * 0.14, len, size * 0.28);
    } else {
      ctx.rotate(b.rot[i]);
      const h = (size * def.h) / def.w;
      ctx.drawImage(img, -size / 2, -h / 2, size, h);
    }
    ctx.restore();
  }
}

/** The whole living peel on a canvas whose transform is the peel's frame (0, 0 at its top left, 220 × 360). */
export function drawCraftLive(ctx: Ctx, live: CraftLive): void {
  const rig = live.rig;
  for (const g of live.glows) {
    if (g.a <= 0.01) continue;
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.scale(g.rx, g.ry);
    const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    const col = `${(g.color >> 16) & 255},${(g.color >> 8) & 255},${g.color & 255}`;
    gr.addColorStop(0, `rgba(${col},${g.a})`);
    gr.addColorStop(0.5, `rgba(${col},${g.a * 0.45})`);
    gr.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = gr;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  }
  // (a tile shows the peel at a third of its size or less: smooth it down, or its outline shimmers)
  const q = ctx.imageSmoothingQuality;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(rig.handle, 0, 0, PEEL_W, PEEL_H);
  if (live.wantsPaint()) live.paint();
  ctx.save();
  ctx.translate(PIVOT.x + live.dx, PIVOT.y + live.dy);
  ctx.rotate(live.rot);
  ctx.scale(live.sx, live.sy);
  ctx.translate(-PIVOT.x, -PIVOT.y);
  ctx.drawImage(live.surface, SB.x, SB.y, SB.w, SB.h);
  ctx.restore();
  ctx.imageSmoothingQuality = q;
  drawCraftBits(ctx, live, true);
}
