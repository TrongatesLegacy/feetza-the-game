// Dev-only balance simulator: plays whole runs of the real game as fast as the CPU allows. The game's own code
// runs (every foot, boss, topping and peel as in play); only the drawing and real time are gone: the Phaser loop
// sleeps and the scene is stepped by hand with a fixed delta, with a bot smacking and shopping inside the steps.
// One run is `F.sim.run({ seed, heat, … })`; scripts/sim/run.mjs drives many in parallel and writes the report.
//
// A run ends as 'dead' (game over), 'reached' (got past `waves`), 'stalled' (no progress for STALL_MS of game time:
// a screen the bot can't get past, or a stuck fight) or 'error' (the game threw). Stalls and errors carry what was
// on screen and the field, so they can be fixed before the balance numbers are trusted.

import type Phaser from 'phaser';
import { HEAT_BY_ID, MOMENTUM, type HeatId, type MomentumHeat } from './data/difficulty';
import { META } from './data/meta';
import { PIZZAS } from './data/pizzas';
import { Rarity } from './data/rarity';
import { UPGRADE_BY_ID, UpgradeKind, isAutoTopping, kindOf } from './data/upgrades';
import { artBooted } from './game/assets';
import { seedCosmetic } from './systems/cosmeticRandom';
import { AUTO_SOURCES, GameScene } from './scenes/GameScene';
import { PEELS, PEEL_BY_ID } from './game/peels';
import { migrate, persist, phaseCardsMuted, save } from './systems/save';

type AnyScene = Phaser.Scene & Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export interface SimOpts {
  seed: number;
  heat: HeatId;
  /** Run until this wave is cleared (100 = the whole journey). */
  waves: number;
  /** The ability peel to play (unlocked for the run). Default the Classic. */
  peel?: string;
  /** Chance each smack lands on its target (0–1). */
  accuracy?: number;
  /** Milliseconds of game time between the bot's actions. */
  rate?: number;
  /** Game milliseconds per step (16.67 = 60 steps a game second). */
  dt?: number;
  /** 'fresh': a new player's save. 'veteran': every Pizzeria upgrade, pizza and peel. */
  profile?: 'fresh' | 'veteran';
  /** Give up after this much real time. */
  maxRealMs?: number;
  /** How the bot shops: 'rarity' (the rarest card it can afford) or 'auto' (automatic damage first: timed
   *  procs, orbiting cutters, the drone, auras and burns, then rarity). */
  shop?: 'rarity' | 'auto';
  /** The bot stops smacking (and slamming) from this wave on: how far do the automatic toppings carry a run? */
  idleFrom?: number;
  /** How the bot plays: 'full' (a smack every `rate` ms), 'light' (a smack every `lightRate` ms: a lazy player
   *  leaning on the toppings) or 'idle' (never smacks or slams: the toppings alone). For tuning momentum. */
  bot?: 'full' | 'light' | 'idle';
  /** Milliseconds between the light bot's smacks. */
  lightRate?: number;
  /** Momentum overrides for this run (src/data/difficulty.ts): the heat's floor, drain and grace, and the shared
   *  smackGain and slamGain. Put back after the run. */
  momentum?: Partial<MomentumHeat & typeof MOMENTUM>;
  /** Dev: count random draws per wave, and list where they came from in this wave (finding non-determinism). */
  trace?: number;
  /** Start at this wave instead of wave 1, from the shop with a starter kit sized for it (F.startGame's kit). */
  from?: number;
  /** Dev: the starting table (pizza ids; ignored with `from`), all of them enhanced with `enhance` (checking a perk
   *  family plays out the same before and after a refactor). */
  lineup?: string[];
  enhance?: boolean;
  /** Dev: toppings owned from the start, by id and level (a one-use topping is armed instead): checking a topping
   *  family before and after a refactor. */
  toppings?: Record<string, number>;
}

export interface WaveRow {
  wave: number;
  /** Game seconds since the run began. */
  t: number;
  coins: number;
  slices: number;
  pizzas: number;
  toppings: number;
  /** Slices lost during this wave. */
  lost: number;
  /** Smack hits that did damage this wave (0: the wave was cleared with no smacks). */
  smackHits: number;
  /** Damage this wave from smacks (and what rides on them: chains, splashes) and from automatic sources. */
  smackDmg: number;
  autoDmg: number;
  /** The average automatic-damage multiplier from momentum while the wave was in play (1 = full). */
  momentum: number;
}

export interface SimResult {
  opts: SimOpts;
  outcome: 'dead' | 'reached' | 'stalled' | 'error';
  wave: number;
  gameSec: number;
  realMs: number;
  waves: WaveRow[];
  /** The boss or mini-boss on the field when the run ended, if any. */
  boss: string | null;
  /** Feet on the field when the run ended (type ids). */
  field: string[];
  /** Pizzas the run ended with and the toppings it owned. */
  table: string[];
  owned: Record<string, number>;
  crusts: number;
  error?: string;
  stall?: { screen: string; detail: Record<string, unknown> };
  /** Damage dealt by source over the run. */
  damage?: Record<string, number>;
  /** Damage over the run by kind: smacks (and what a smack sets off), automatic (scaled by autoDmg and momentum),
   *  the slam, and the rest (peel abilities, hero passives…). */
  split?: { smack: number; auto: number; slam: number; other: number };
  /** Waves cleared without a single smack hit. */
  noSmackWaves?: number;
  /** Slices lost, by 'boss|…' (a boss or mini-boss on the field) or 'wave|…', then the foot that stomped ('zombie …'
   *  for a turned foot) or the callout of the move that took them. */
  lostBy?: Record<string, number>;
  /** The most turned (zombie) feet on the field at once. */
  peakZombies?: number;
  /** Guard feet's shields: smacks they blocked, shields broken, new ones raised. */
  guard?: { blocked: number; broken: number; rearmed: number; soaked: number; deflected: number; chipSteps: number; slamSteps: number; ttk: Record<string, number[]>; stomps: Record<string, number> };
}

const STALL_MS = 120_000;
/** No single wave may take longer than this much game time. */
const WAVE_MS = 600_000;

// The page's own timers and clock run on game time during a run, so a seed plays out the same every time: the menus'
// timeouts, sound throttles (performance.now) and anything else that would otherwise fire (and draw random numbers)
// on its own real-time schedule. The sim keeps the real ones for itself.
const real = {
  setTimeout: window.setTimeout.bind(window),
  clearTimeout: window.clearTimeout.bind(window),
  setInterval: window.setInterval.bind(window),
  clearInterval: window.clearInterval.bind(window),
  raf: window.requestAnimationFrame.bind(window),
  caf: window.cancelAnimationFrame.bind(window),
  now: performance.now.bind(performance),
  Date,
};
// Where the page's clocks stand as a run starts: the same for every run. They used to start from the real clocks, and
// the numbers the page sees then differ in their last bits from run to run: Date.now() is about 1.8e12, so a step added
// to it rounds to within 2e-4 ms, differently for every start, and Phaser's tweens (a projectile's flight, a tray's
// toss) time themselves by Date.now(): a flight could land a step earlier or later. performance.now() starts later
// than any page's own clock (a stamp the page took before the run reads as long ago, the same in every run), and each
// further run on the same page (--reuse) starts later again, past anything the run before it stamped. The date is a
// fixed one (Monday 5 January 2026, noon UTC: a fixed number, so the tweens round alike on any machine), so goals that
// ask for the time of day or the weekday don't depend on when the sim was run either.
const PERF_BASE = 10_000_000;
/** Between the starts of two runs on one page: longer than any run's game time. */
const PERF_PER_RUN = 1_000_000_000;
const DATE_BASE = Date.UTC(2026, 0, 5, 12);
/** Runs this page has played (each starts its clock past the last). */
let pageRuns = 0;
// during a run only microtasks get a turn (promises settle): a real timer left over from before the run firing
// in between would draw random numbers off the seed's sequence
const yieldNow = () => Promise.resolve();

interface FakeTimer {
  id: number;
  at: number;
  fn: (...a: unknown[]) => void;
  args: unknown[];
  every: number;
  raf: boolean;
}
class GameClock {
  ms = 0;
  private base = PERF_BASE + PERF_PER_RUN * pageRuns++;
  private dateBase = DATE_BASE;
  private timers = new Map<number, FakeTimer>();
  private nextId = 1_000_000;
  errors: string[] = [];
  now(): number {
    return this.base + this.ms;
  }
  install(): void {
    const add = (fn: unknown, ms: unknown, args: unknown[], every: number, raf = false) => {
      if (typeof fn !== 'function') return 0;
      const id = this.nextId++;
      this.timers.set(id, { id, at: this.ms + Math.max(0, Number(ms) || 0), fn: fn as FakeTimer['fn'], args, every, raf });
      return id;
    };
    const w = window as unknown as Record<string, unknown>;
    w.setTimeout = (fn: unknown, ms?: unknown, ...args: unknown[]) => add(fn, ms, args, 0);
    w.setInterval = (fn: unknown, ms?: unknown, ...args: unknown[]) => add(fn, ms, args, Math.max(1, Number(ms) || 1));
    w.clearTimeout = w.clearInterval = (id: number) => void this.timers.delete(id);
    w.requestAnimationFrame = (fn: unknown) => add(fn, 16, [], 0, true);
    w.cancelAnimationFrame = (id: number) => void this.timers.delete(id);
    performance.now = () => this.now();
    // Date.now(), and new Date() with no arguments (the hour a night run counts by, the hero goals' weekdays)
    const dateNow = () => this.dateBase + this.ms;
    const RealDate = real.Date;
    const SimDate = function (this: unknown, ...args: unknown[]) {
      if (!new.target) return new RealDate(dateNow()).toString();
      return Reflect.construct(RealDate, args.length ? args : [dateNow()], new.target) as Date;
    } as unknown as DateConstructor;
    Object.setPrototypeOf(SimDate, RealDate);
    (SimDate as unknown as { prototype: Date }).prototype = RealDate.prototype;
    SimDate.now = dateNow;
    w.Date = SimDate;
  }
  uninstall(): void {
    const w = window as unknown as Record<string, unknown>;
    w.setTimeout = real.setTimeout;
    w.clearTimeout = real.clearTimeout;
    w.setInterval = real.setInterval;
    w.clearInterval = real.clearInterval;
    w.requestAnimationFrame = real.raf;
    w.cancelAnimationFrame = real.caf;
    performance.now = real.now;
    w.Date = real.Date;
  }
  /** Move game time on and run whatever timers fell due, in order. */
  advance(dt: number): void {
    this.ms += dt;
    for (let guard = 0; guard < 500; guard++) {
      let due: FakeTimer | null = null;
      for (const t of this.timers.values()) if (t.at <= this.ms && (!due || t.at < due.at || (t.at === due.at && t.id < due.id))) due = t;
      if (!due) return;
      if (due.every) due.at += due.every;
      else this.timers.delete(due.id);
      try {
        if (due.raf) due.fn(this.now());
        else due.fn(...due.args);
      } catch (e) {
        this.errors.push(String((e as Error)?.stack ?? e).split('\n').slice(0, 3).join(' | '));
      }
    }
  }
}

function setProfile(o: SimOpts): void {
  // a clean save, so every run starts the same whatever this browser has played (settings kept)
  const settings = save.settings;
  Object.assign(save, migrate({}), { settings });
  save.tutorialDone = true;
  save.seenIntros = ['shop', 'kinds', 'swap', 'freshness', 'phases', 'mini', 'events', 'golden'];
  phaseCardsMuted.on = true;
  if (o.profile === 'veteran') {
    save.meta = Object.fromEntries(META.map((m) => [m.id, m.costs.length]));
    save.unlockedPizzas = PIZZAS.map((p) => p.id);
    save.peels = PEELS.map((p) => p.id);
  }
  const peel = o.peel && PEEL_BY_ID[o.peel] ? o.peel : 'classic';
  if (peel !== 'classic' && !save.peels.includes(peel)) save.peels.push(peel);
  save.peel = peel;
  save.heat = o.heat;
}

/** What's in front of the bot right now (for stall reports). */
function screenOf(g: AnyScene): string {
  if (g.over) return 'game over';
  if (document.querySelector('.pickwin')) return 'pick window';
  if (document.querySelector('.swap2')) return 'pizza swap';
  if (document.querySelector('.intro')) return 'intro card';
  if (g.inUpgrade && g.shop) return 'shop';
  if (g.inUpgrade && g.actEl) return 'act end';
  if (g.inUpgrade) return 'between waves';
  if (g.waveActive) return 'wave';
  return 'other';
}

/** Shopping, in one go: heal when hurt, reheat stale pizzas, take a free last-stand pizza, rebake, buy the best
 *  affordable card; returns true when it did something (the bot comes back next action), false = next wave. */

function shopOnce(g: AnyScene, mode: 'rarity' | 'auto' = 'rarity'): boolean {
  const st = g.shop?.state;
  if (!st) return false;
  const hurt = st.table.some((p: any) => !p.dead && p.slices <= p.max / 2); // eslint-disable-line @typescript-eslint/no-explicit-any
  if (hurt && st.heal.can && st.coins >= st.heal.cost + 20) return g.shopHeal(), true;
  const stale = st.table.findIndex((p: any) => p.reheat?.can && p.fresh <= 2); // eslint-disable-line @typescript-eslint/no-explicit-any
  if (stale >= 0) return g.shopReheat(stale), true;
  if (st.lastStand) {
    const free = st.offers.find((o: any) => o.cost <= st.coins); // eslint-disable-line @typescript-eslint/no-explicit-any
    if (free) return g.shopBuyPizza(free.id), true;
  }
  const dead = st.table.findIndex((p: any) => p.rebake?.can); // eslint-disable-line @typescript-eslint/no-explicit-any
  if (dead >= 0) return g.shopRebake(dead), true;
  // (rarer first: Common 1 up to Legendary 4, as before)
  const score = (c: any) => Rarity.rank(c.rarity) + 1 + (mode === 'auto' && UPGRADE_BY_ID[c.id] && isAutoTopping(UPGRADE_BY_ID[c.id]) ? 10 : 0); // eslint-disable-line @typescript-eslint/no-explicit-any
  const card = st.cards.filter((c: any) => !c.sold && (c.free || st.coins >= c.price)).sort((a: any, b: any) => score(b) - score(a))[0]; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (card) return g.shopBuy(card.id), true;
  return false;
}

/** Clear any window the run is waiting on (intro cards, Pick and Roulette windows, the pizza swap, act ends,
 *  the second chance offer). True if it pressed something. */
function clearWindows(g: AnyScene): boolean {
  const click = (sel: string) => {
    const el = document.querySelector<HTMLElement>(sel);
    if (!el) return false;
    el.click();
    return true;
  };
  if (click('.intro .btn')) return true;
  if (click('.pickwin .card, .pickwin .roul-tile')) return true;
  if (click('.swap2 .swapfoot .btn.green')) return true;
  // the second chance offer: decline (it costs crusts the sim doesn't spend)
  if (click('.second .btn.cream')) return true;
  if (g.inUpgrade && !g.shop && g.actEl) {
    const b = g.actEl.querySelector('.v-choice .btn.green') as HTMLElement | null;
    if (b) return b.click(), true;
  }
  return false;
}

function smack(g: AnyScene, accuracy: number): void {
  const prop = (g.clickables ?? []).find((c: any) => c.alive() && (c.priority ?? 0) >= 2); // eslint-disable-line @typescript-eslint/no-explicit-any
  // the lowest foot, skipping any with a guard up (as a player would) unless that's all there is: then it smacks the
  // raised shield, which cracks it and in the end breaks it (src/game/guardShield.ts)
  const ts = (g.feet ?? []).filter((f: any) => f.hittable).sort((a: any, b: any) => b.y - a.y); // eslint-disable-line @typescript-eslint/no-explicit-any
  // a foot a boss has marked for a move (the Zombie Loafer's bite, a zombie's spreading bite) first, as a player would;
  // with more than one of a boss up (a second Zombie Loafer), the weakest of them before the rest of the field
  const marked = ts.find((f: any) => f.brain?.marked && !f.shielded); // eslint-disable-line @typescript-eslint/no-explicit-any
  const extras = ts.filter((f: any) => f.isBossLike && !f.shielded && ts.some((o: any) => o !== f && o.type.id === f.type.id && (o.brain?.extraBoss || f.brain?.extraBoss))); // eslint-disable-line @typescript-eslint/no-explicit-any
  const twins = extras.sort((a: any, b: any) => a.hp - b.hp)[0]; // eslint-disable-line @typescript-eslint/no-explicit-any
  const t = marked ?? twins ?? ts.find((f: any) => !f.shielded && !f.guardUp) ?? ts.find((f: any) => !f.shielded) ?? ts[0]; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (prop && Math.random() < accuracy) {
    g.pointer.x = prop.x;
    g.pointer.y = prop.y;
    g.smack(prop.x, prop.y);
  } else if (t && Math.random() < accuracy) {
    g.pointer.x = t.cx;
    g.pointer.y = t.cy;
    g.peelPos.x = t.cx;
    g.peelPos.y = t.cy;
    g.smack(t.cx, t.cy);
  }
  if (g.run?.super >= 1 && (Math.random() < 0.05 || (g.feet ?? []).some((f: any) => f.alive && f.brain?.swordWindow))) g.peelSlam(); // eslint-disable-line @typescript-eslint/no-explicit-any
}

/** The game's art is built (several tabs booting at once can take a while). */
/** Ready for a run: the title's art built. (Under ?sim no other art is drawn in idle time, and none comes from the
 *  art cache: every run starts from the same art, whatever real time the page had. src/game/assets.ts NO_WARMER) */
export function simReady(): boolean {
  return artBooted();
}

export async function simRun(game: Phaser.Game, o: SimOpts, start: (opts: Record<string, unknown>) => void): Promise<SimResult> {
  const opts: Required<SimOpts> = { lineup: [], enhance: false, toppings: {}, peel: 'classic', accuracy: 0.9, rate: 260, dt: 1000 / 60, profile: 'fresh', maxRealMs: 600_000, trace: 0, idleFrom: 0, shop: 'rarity', from: 0, bot: 'full', lightRate: 2000, momentum: {}, ...o };
  // momentum overrides: set once the run has started (a run that fails to start throws before them), and put back
  // when it's done
  const heatMo = HEAT_BY_ID[opts.heat].momentum;
  const moBefore = { heat: { ...heatMo }, shared: { ...MOMENTUM } };
  const { smackGain, slamGain, ...perHeat } = opts.momentum;
  const actRate = opts.bot === 'light' ? opts.lightRate : opts.rate;
  // the game's art must be built first (several tabs booting at once can take a while)
  for (let i = 0; i < 600 && !artBooted(); i++) await new Promise((r) => setTimeout(r, 100));
  // the browser's own save comes back when the run is done
  const before = JSON.stringify(save);
  setProfile(opts);
  const errors: string[] = [];
  const onErr = (e: ErrorEvent) => errors.push(`${e.message} @ ${e.filename?.split('/').pop()}:${e.lineno}`);
  window.addEventListener('error', onErr);
  // the loop sleeps from the start and game time takes over the page's clock, so the scene is built (and every
  // random number drawn) on the sim's own steps
  game.loop.sleep();
  // cosmetic randomness from the same seed every run (it can reach play: src/systems/cosmeticRandom.ts)
  seedCosmetic(opts.seed);
  const clock = new GameClock();
  clock.install();
  let g: AnyScene | null = null;
  const t0 = real.now();
  let gameMs = 0;
  // the loop sleeps, so its frame figures would stay whatever the last real frame left (real time, varying with the
  // machine's load and the page's boot): code that reads them (a waiter's tray flies by game.loop.delta) gets the
  // sim's own step instead. They're put back when the run is done.
  const loop = game.loop as unknown as Record<'delta' | 'rawDelta' | 'actualFps' | 'time' | 'now', number>;
  const loopBefore = { delta: loop.delta, rawDelta: loop.rawDelta, actualFps: loop.actualFps, time: loop.time, now: loop.now };
  const step = () => {
    loop.delta = loop.rawDelta = opts.dt;
    loop.actualFps = 1000 / opts.dt;
    loop.time = loop.now = clock.now();
    game.scene.update(clock.now(), opts.dt);
    clock.advance(opts.dt);
    gameMs += opts.dt;
  };
  try {
    // a brand-new game scene each run: Phaser restarts reuse the scene object, and fields a run doesn't reset
    // (the garlic timer…) would carry over and nudge the next run off its seed
    const old = game.scene.getScene('Game');
    if (old) {
      game.scene.stop('Game');
      game.scene.remove('Game');
    }
    game.scene.add('Game', GameScene, false);
    for (const k of game.scene.getScenes(true).map((x) => x.sys.settings.key)) if (k !== 'Game') game.scene.stop(k);
    start({ heat: opts.heat, intros: false, seed: opts.seed, ...(opts.from ? { wave: opts.from, kit: true } : opts.lineup?.length ? { lineup: opts.lineup } : {}) });
    for (let i = 0; i < 600 && !(g?.run && (g.waveActive || g.inUpgrade)); i++) {
      step();
      g = game.scene.getScene('Game') as AnyScene;
      if (i % 30 === 0) await yieldNow();
    }
  } catch (e) {
    clock.uninstall();
    throw e;
  }
  if (!g?.run) {
    clock.uninstall();
    game.loop.wake();
    throw new Error('the game scene did not start');
  }
  g.scene.setVisible(false);
  if (opts.enhance) {
    for (const p of g.pizzas ?? []) p.flags.enhanced = true;
    g.recompute();
  }
  if (Object.keys(opts.toppings).length) {
    for (const [id, lvl] of Object.entries(opts.toppings)) {
      const u = UPGRADE_BY_ID[id];
      if (!u) continue;
      if (kindOf(u) === UpgradeKind.Consumable) g.run.armed.push(id);
      else g.run.owned[id] = lvl;
    }
    g.recompute();
  }
  // (the start loop above may have begun the first wave: only its grace came from the unchanged numbers)
  Object.assign(heatMo, perHeat);
  if (smackGain !== undefined) MOMENTUM.smackGain = smackGain;
  if (slamGain !== undefined) MOMENTUM.slamGain = slamGain;
  gameMs = 0;
  // where the damage comes from: smacks, the slam/ability, or the automatic sources (procs, cutters, burns…)
  const dmgBy: Record<string, number> = {};
  const split = { smack: 0, auto: 0, slam: 0, other: 0 };
  // this wave's: smack hits, smack and automatic damage, and momentum sampled each step in play
  const wv = { hits: 0, smack: 0, auto: 0, mo: 0, moN: 0 };
  const deal = g.dealDamage;
  g.dealDamage = function (this: AnyScene, f: any, amount: number, o: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    const before = f?.hp ?? 0;
    const r = deal.call(this, f, amount, o);
    const done = Math.max(0, before - Math.max(0, f?.hp ?? 0));
    if (done > 0) {
      dmgBy[o?.source ?? 'other'] = (dmgBy[o?.source ?? 'other'] ?? 0) + done;
      // the same test the scene uses for automatic damage (GameScene.dealDamage)
      const auto = !!o?.auto || AUTO_SOURCES.has(o?.source);
      const kind = o?.source === 'slam' ? 'slam' : auto ? 'auto' : o?.source === 'smack' || o?.source === 'splash' || o?.source === 'chain' || o?.source === 'explode' ? 'smack' : 'other';
      split[kind] += done;
      if (o?.source === 'smack') wv.hits++;
      if (kind === 'smack') wv.smack += done;
      else if (kind === 'auto') wv.auto += done;
    }
    return r;
  };
  // where the slices go: by the foot that stomped (a turned foot marked 'zombie') or the move's
  // callout (a boss's bite, a munch…), split by whether a boss or mini-boss was on the field at the time
  const lostBy: Record<string, number> = {};
  let label = '';
  const hitPizza = g.hitPizza;
  g.hitPizza = function (this: AnyScene, p: any, n: number, l: string, c?: string) { // eslint-disable-line @typescript-eslint/no-explicit-any
    label = l;
    try {
      return hitPizza.call(this, p, n, l, c);
    } finally {
      label = '';
    }
  };
  const applyStomp = g.applyStomp;
  // (a stomp shared out with the neighbours calls in again: count only the outer call)
  let depth = 0;
  g.applyStomp = function (this: AnyScene, p: any, f: any, dmg: number, big: boolean) { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (depth) return applyStomp.call(this, p, f, dmg, big);
    const before = (this.pizzas ?? []).reduce((n: number, q: any) => n + (q.dead ? 0 : (q.slices ?? 0)), 0); // eslint-disable-line @typescript-eslint/no-explicit-any
    depth++;
    let r;
    try {
      r = applyStomp.call(this, p, f, dmg, big);
    } finally {
      depth--;
    }
    const lost = before - (this.pizzas ?? []).reduce((n: number, q: any) => n + (q.dead ? 0 : (q.slices ?? 0)), 0); // eslint-disable-line @typescript-eslint/no-explicit-any
    if (lost > 0) {
      const boss = (this.feet ?? []).some((o: any) => o.alive && o.isBossLike); // eslint-disable-line @typescript-eslint/no-explicit-any
      const k = `${boss ? 'boss' : 'wave'}|${f ? `${f.zombified ? 'zombie ' : ''}${f.type.id}` : label || 'other'}`;
      lostBy[k] = (lostBy[k] ?? 0) + lost;
    }
    return r;
  };
  // the most feet a boss had turned (the Zombie Loafer's zombies) at once
  let peakZombies = 0;
  // tracing: count every random draw, by wave, and where each came from in the traced wave
  const draws: number[] = [];
  const where: Record<string, number> = {};
  const seq: string[] = [];
  const frames: string[] = [];
  if (opts.trace) {
    const log = g.logSmack;
    g.logSmack = function (this: AnyScene, x: number, y: number, blocked?: string, result?: string) {
      if (g?.run?.wave === opts.trace) frames.push(`${Math.round(gameMs)}|smack ${Math.round(x)},${Math.round(y)} ${blocked ?? ''} ${result ?? ''} r=${this.run.stats.radius}`);
      return log.call(this, x, y, blocked, result);
    };
  }
  const seeded = Math.random;
  if (opts.trace) {
    Math.random = () => {
      const w = g?.run?.wave ?? 0;
      draws[w] = (draws[w] ?? 0) + 1;
      if (w === opts.trace) {
        const at = (new Error().stack ?? '').split('\n').slice(2, 5).map((l) => l.trim().replace(/^at /, '').replace(/\(?https?:\/\/[^/]+\/src\//, '').replace(/\?t=\d+/, '').replace(/\)$/, '')).join(' < ');
        where[at] = (where[at] ?? 0) + 1;
        if (seq.length < 30000) seq.push(`${Math.round(gameMs)}|${at}`);
      }
      return seeded();
    };
  }

  let actMs = 0;
  let checkMs = 0;
  let lastSig = '';
  let stillMs = 0;
  let waveStartMs = 0;
  let wave = g.run.wave;
  let lostAtWave = g.run.slicesLost ?? 0;
  const rows: WaveRow[] = [];
  let outcome: SimResult['outcome'] | null = null;
  let stall: SimResult['stall'];
  let steps = 0;

  const row = (w: number) => {
    const live = (g!.pizzas ?? []).filter((p: any) => !p.dead); // eslint-disable-line @typescript-eslint/no-explicit-any
    rows.push({
      wave: w,
      t: Math.round(gameMs / 1000),
      coins: Math.round(g!.run.coins ?? 0),
      slices: live.reduce((n: number, p: any) => n + (p.slices ?? 0), 0), // eslint-disable-line @typescript-eslint/no-explicit-any
      pizzas: live.length,
      toppings: Object.values(g!.run.owned ?? {}).reduce((n: number, v) => n + Number(v), 0),
      lost: (g!.run.slicesLost ?? 0) - lostAtWave,
      smackHits: wv.hits,
      smackDmg: Math.round(wv.smack),
      autoDmg: Math.round(wv.auto),
      momentum: wv.moN ? Math.round((wv.mo / wv.moN) * 1000) / 1000 : 1,
    });
    lostAtWave = g!.run.slicesLost ?? 0;
    Object.assign(wv, { hits: 0, smack: 0, auto: 0, mo: 0, moN: 0 });
  };

  try {
    while (!outcome) {
      if (errors.length) {
        outcome = 'error';
        break;
      }
      // the journey's end (the ending and its victory screen): a win
      if (g.endingShown && wave >= opts.waves) {
        row(wave);
        outcome = 'reached';
        break;
      }
      if (g.over) {
        // the second chance offer and the run-end screens: give the UI a moment, then call it
        clearWindows(g);
        await yieldNow();
        if (g.over) {
          outcome = 'dead';
          break;
        }
      }
      // between waves (and now and then during one), let the page's own timers run and clear any windows
      if (g.inUpgrade || steps % 600 === 0) {
        if (!clearWindows(g) && g.inUpgrade && g.shop && actMs >= opts.rate) {
          actMs = 0;
          if (!shopOnce(g, opts.shop)) g.shopNext();
        }
        await yieldNow();
      }
      step();
      // tracing: the field's state each step of the traced wave (finding a change that draws no random number)
      if (opts.trace && g.run?.wave === opts.trace && frames.length < 20000)
        frames.push(`${Math.round(gameMs)}|${(g.feet ?? []).map((f: any) => `${f.type.id}:${Math.round(f.x)},${Math.round(f.y)},${Math.round(f.hp * 10)},${f.state},${Math.round((f.slowT ?? 0) * 100)},${Math.round((f.stunT ?? 0) * 100)}`).join(';')}|${Math.round(g.run.coins)}`); // eslint-disable-line @typescript-eslint/no-explicit-any
      if (clock.errors.length) errors.push(...clock.errors.splice(0));
      actMs += opts.dt;
      checkMs += opts.dt;
      steps++;
      if (g.waveActive && !g.over && !g.inUpgrade && g.momentum) {
        wv.mo += g.momentum.mult();
        wv.moN++;
      }
      if (g.waveActive && !g.over && actMs >= actRate) {
        actMs = 0;
        if (opts.bot !== 'idle' && (!opts.idleFrom || wave < opts.idleFrom)) smack(g, opts.accuracy);
      }
      const w = g.run?.wave ?? wave;
      if (w !== wave) {
        row(wave);
        wave = w;
        waveStartMs = gameMs;
        if (wave > opts.waves) {
          outcome = 'reached';
          break;
        }
      }
      // the watchdog: something must change every STALL_MS of game time
      if (checkMs >= 2000) {
        checkMs = 0;
        const boss = (g.feet ?? []).find((f: any) => f.alive && f.isBossLike); // eslint-disable-line @typescript-eslint/no-explicit-any
        peakZombies = Math.max(peakZombies, (g.feet ?? []).filter((f: any) => f.alive && f.zombified).length); // eslint-disable-line @typescript-eslint/no-explicit-any
        const sig = [wave, g.run.feetSmacked, g.run.slicesLost, Math.round(g.run.coins ?? 0), (g.feet ?? []).filter((f: any) => f.alive).length, boss ? Math.round(boss.hp) : -1, screenOf(g)].join('|'); // eslint-disable-line @typescript-eslint/no-explicit-any
        stillMs = sig === lastSig ? stillMs + 2000 : 0;
        lastSig = sig;
        const tooLong = gameMs - waveStartMs > WAVE_MS;
        if (stillMs >= STALL_MS || tooLong || real.now() - t0 > opts.maxRealMs) {
          outcome = 'stalled';
          stall = {
            screen: tooLong ? `${screenOf(g)} (wave over ${WAVE_MS / 60000} min)` : real.now() - t0 > opts.maxRealMs ? `${screenOf(g)} (real-time cap)` : screenOf(g),
            detail: {
              waveActive: g.waveActive,
              inUpgrade: g.inUpgrade,
              queue: g.plan?.queue?.length,
              feet: (g.feet ?? []).filter((f: any) => f.alive).map((f: any) => `${f.type.id}:${f.state}${f.held ? ':held' : ''}${f.pinned ? ':pinned' : ''}${f.shielded ? ':shielded' : ''}${f.guardBroken ? ':guardbroken' : f.guardUp ? ':guardup' : ''}`), // eslint-disable-line @typescript-eslint/no-explicit-any
              windows: [...document.querySelectorAll('.screen:not(.leaving), .modal, .pickwin, .intro')].map((e) => e.className).slice(0, 8),
              snapshot: g.inUpgrade ? save.run : null,
            },
          };
        }
      }
    }
  } catch (e) {
    outcome = 'error';
    errors.push(String((e as Error)?.stack ?? e).split('\n').slice(0, 4).join(' | '));
  } finally {
    window.removeEventListener('error', onErr);
    clock.uninstall();
  }

  const field = (g.feet ?? []).filter((f: any) => f.alive); // eslint-disable-line @typescript-eslint/no-explicit-any
  const boss = field.find((f: any) => f.isBossLike); // eslint-disable-line @typescript-eslint/no-explicit-any
  const result: SimResult = {
    opts,
    outcome: outcome ?? 'error',
    wave,
    gameSec: Math.round(gameMs / 1000),
    realMs: Math.round(real.now() - t0),
    waves: rows,
    boss: boss?.type.id ?? null,
    field: field.map((f: any) => f.type.id), // eslint-disable-line @typescript-eslint/no-explicit-any
    table: (g.pizzas ?? []).map((p: any) => `${p.type?.id}${p.dead ? ':dead' : ''}`), // eslint-disable-line @typescript-eslint/no-explicit-any
    owned: { ...(g.run.owned ?? {}) },
    crusts: Math.round(typeof g.run.crustsEarned === 'function' ? g.run.crustsEarned() : 0),
    error: errors[0],
    stall,
    damage: Object.fromEntries(Object.entries(dmgBy).map(([k, v]) => [k, Math.round(v)])),
    split: { smack: Math.round(split.smack), auto: Math.round(split.auto), slam: Math.round(split.slam), other: Math.round(split.other) },
    // (every row is a wave that was cleared: the one a run dies in gets none)
    noSmackWaves: rows.filter((r) => r.smackHits === 0).length,
    guard: g.guardStats ? JSON.parse(JSON.stringify(g.guardStats)) : undefined,
    lostBy,
    peakZombies,
  };
  if (opts.trace) {
    Math.random = seeded;
    (result as unknown as Record<string, unknown>).trace = { draws, where, seq, frames };
  }
  // leave the game quiet for the next run, and put the browser's save back (and momentum's numbers)
  Object.assign(heatMo, moBefore.heat);
  Object.assign(MOMENTUM, moBefore.shared);
  Object.assign(loop, loopBefore);
  game.loop.wake();
  Object.assign(save, JSON.parse(before));
  persist();
  return result;
}
