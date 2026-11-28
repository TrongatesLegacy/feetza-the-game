// Run state: owned upgrades, stat aggregation and wave planning over the journey (STAGES, 10-wave acts).

import type { ArenaId, BackdropId, LocationId } from '../art/backdrops';
import { DEEP_FROM, DEEP_SPAN, HEAT_BY_ID, type HeatId } from '../data/difficulty';
import { FEET, FOOT_BY_ID, type FootType } from '../data/feet';
import { PIZZA_BY_ID, type PizzaPerk, type PizzaType } from '../data/pizzas';
import { MILESTONES, type Milestone } from '../data/meta';
import { PIZZERIA_SPECIAL_MARKUP, TIER_TIPS } from '../data/pizzaRarity';
import { BOSS_CREW, JOURNEY_WAVES, MINI_ESCORT, MINI_WAVE, STAGES, STAGES_PER_ACT, WAVES_PER_STAGE } from '../data/stages';
import { CONSUMABLE_COOLDOWN, RARITY_WEIGHT, UPGRADES, UPGRADE_BY_ID, baseStats, kindOf, type OfferEnv, type Rarity, type Stats, type Upgrade } from '../data/upgrades';
import { freshKitState, type KitState } from './kitState';
import { applyNemesis, homeOf } from './nemesis';
import { save, unlockPizza } from '../systems/save';
import { applyAll, Effect, Op, Phase, Stat, Unit, UnitKind, type EffectData } from '../effects';
import { Ledger, type ValueCtx } from '../effects/ledger';
import { Source, shareEntries, type SourceKey, type SourceRef, type SourceShare } from '../effects/source';
import { STAT_DEFS } from '../effects/stats';
import { PERK_NONE, PERK_STATS, PERK_TIPS } from './perkStats';

/** Golden Crusts for the first time you ever beat a main boss (on top of the usual 5). */
export const FIRST_KILL_CRUSTS = 20;

/** The Pizzeria upgrades the run's stats read (one "Pizzeria upgrades" source on the STATS tab). */
export const RUN_META = ['wrists', 'tips', 'apron', 'opinion'];
/** The ledger source of the Pizzeria's upgrades. */
export const META_SOURCE = Source.Meta;
/** The ledger source of the Ghost's possession. */
export const GHOST_SOURCE = Source.Ghost;

// (the caps live in the stat definitions now)
export { DOUBLE_CAP, TIP_MULT_CAP } from '../effects/stats';

/** A pizza granting a perk now, for the ledger: its perk, its source id and its weight (1; +0.5 enhanced; +0.5 Mystery Meat). */
export interface TableSeat {
  perk: PizzaPerk;
  source: SourceKey;
  weight: number;
}
/** A peel's always-on stat changes (its ability, a hero's passive), from one source. */
export interface PeelStats {
  source: SourceKey;
  mods: Partial<Record<keyof Stats, number>>;
}

export const LOCATIONS: LocationId[] = STAGES.map((s) => s.location);

export const LOCATION_MUSIC: Record<LocationId, string[]> = {
  trattoria: ['music_game'],
  rooftop: ['music_rooftop', 'music_game'],
  beach: ['music_beach', 'music_game'],
  diner: ['music_diner', 'music_game'],
  lodge: ['music_lodge', 'music_menu', 'music_game'],
  space: ['music_space', 'music_rooftop', 'music_game'],
  kitchen: ['music_kitchen', 'music_game'],
  oldtown: ['music_oldtown', 'music_rooftop', 'music_game'],
  pier: ['music_pier', 'music_beach', 'music_game'],
  rink: ['music_rink', 'music_diner', 'music_game'],
  slopes: ['music_slopes', 'music_lodge', 'music_game'],
  cellar: ['music_cellar', 'music_boss_phantomking', 'music_game'],
  // ——— Act 7 · Comics ———
  metropizza: ['music_metropizza', 'music_rooftop', 'music_game'],
  doomlab: ['music_doomlab', 'music_space', 'music_game'],
  // ——— Act 8 · Norse ———
  jotunheim: ['music_jotunheim', 'music_slopes', 'music_game'],
  bifrost: ['music_bifrost', 'music_jotunheim', 'music_game'],
  // ——— Act 9 · Greek myths ———
  labyrinth: ['music_labyrinth', 'music_game'],
  tartarus: ['music_tartarus', 'music_cellar', 'music_game'],
  // ——— Act 10 · Finale ———
  oven: ['music_oven', 'music_space', 'music_game'],
  firstpizzeria: ['music_firstpizzeria', 'music_game'],
  // ——— Nemesis stages (src/game/nemesis.ts) ———
  gotham: ['music_gotham', 'music_metropizza', 'music_game'],
  hotgates: ['music_hotgates', 'music_labyrinth', 'music_game'],
};

export const LOCATION_AMBIENCE: Record<LocationId, string[]> = {
  trattoria: ['ambience_pizzeria'],
  rooftop: ['ambience_rooftop', 'ambience_pizzeria'],
  beach: ['ambience_beach', 'ambience_pizzeria'],
  diner: ['ambience_diner', 'ambience_pizzeria'],
  lodge: ['ambience_lodge', 'ambience_pizzeria'],
  space: ['ambience_space', 'ambience_pizzeria'],
  kitchen: ['ambience_kitchen', 'ambience_pizzeria'],
  oldtown: ['ambience_oldtown', 'ambience_rooftop', 'ambience_pizzeria'],
  pier: ['ambience_pier', 'ambience_beach', 'ambience_pizzeria'],
  rink: ['ambience_rink', 'ambience_diner', 'ambience_pizzeria'],
  slopes: ['ambience_slopes', 'ambience_lodge', 'ambience_pizzeria'],
  cellar: ['ambience_cellar', 'ambience_pizzeria'],
  // ——— Act 7 · Comics ———
  metropizza: ['ambience_metropizza', 'ambience_rooftop', 'ambience_pizzeria'],
  doomlab: ['ambience_doomlab', 'ambience_space', 'ambience_pizzeria'],
  // ——— Act 8 · Norse ———
  jotunheim: ['ambience_jotunheim', 'ambience_slopes', 'ambience_pizzeria'],
  bifrost: ['ambience_bifrost', 'ambience_jotunheim', 'ambience_pizzeria'],
  // ——— Act 9 · Greek myths ———
  labyrinth: ['ambience_labyrinth', 'ambience_pizzeria'],
  tartarus: ['ambience_tartarus', 'ambience_cellar', 'ambience_pizzeria'],
  // ——— Act 10 · Finale ———
  oven: ['ambience_oven', 'ambience_space', 'ambience_pizzeria'],
  firstpizzeria: ['ambience_firstpizzeria', 'ambience_pizzeria'],
  // ——— Nemesis stages (src/game/nemesis.ts) ———
  gotham: ['ambience_gotham', 'ambience_metropizza', 'ambience_pizzeria'],
  hotgates: ['ambience_hotgates', 'ambience_labyrinth', 'ambience_pizzeria'],
};

/** How many times the journey has been completed before wave n (0 on the first time through). */
export function loopOf(n: number): number {
  return Math.floor((Math.max(1, n) - 1) / JOURNEY_WAVES);
}

export function stageIndex(n: number): number {
  return Math.floor(((Math.max(1, n) - 1) % JOURNEY_WAVES) / WAVES_PER_STAGE);
}

export function waveInStage(n: number): number {
  return ((Math.max(1, n) - 1) % WAVES_PER_STAGE) + 1;
}

export function isBossWave(n: number): boolean {
  return n % WAVES_PER_STAGE === 0;
}

export function isMiniWave(n: number): boolean {
  return waveInStage(n) === MINI_WAVE;
}

export function locationFor(n: number): LocationId {
  return stageFor(n).location;
}

export function bossFor(n: number): ArenaId {
  return stageFor(n).boss;
}

export function miniFor(n: number): string {
  return stageFor(n).mini;
}

// ——— Act 10 · Finale: Endless+ ———

/** Endless+ (unlocked by beating wave 100): past the journey's end every stage's place, mini-boss and
 * boss are dealt from shuffled decks, a new deal each loop. The scene sets it for the run (seed: the deal). */
export const endlessPlus = { on: false, seed: 1 };


/** The finale's own bosses stay in the finale (the buyout and the ending belong to waves 95 and 100). */
const UNSHUFFLED_BOSSES = new Set(['soleprop', 'soleunbound']);

function deck<T>(items: T[], seed: number): T[] {
  const out = [...items];
  let a = seed >>> 0 || 1;
  const rnd = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** The last Endless+ deal, kept: stageFor runs on every damage tick (night damage reads the place). */
let dealt: { key: string; places: LocationId[]; minis: string[]; bosses: ArenaId[] } | null = null;

function loopDecks(seed: number, loop: number): { places: LocationId[]; minis: string[]; bosses: ArenaId[] } {
  const key = `${seed}:${loop}`;
  if (dealt?.key === key) return dealt;
  const real = STAGES.filter((x) => !x.dev);
  const s0 = seed * 7919 + loop * 104729;
  dealt = {
    key,
    places: deck(real.map((x) => x.location), s0 + 1),
    minis: deck(real.map((x) => x.mini), s0 + 2),
    bosses: deck(real.map((x) => x.boss).filter((b) => !UNSHUFFLED_BOSSES.has(b)), s0 + 3),
  };
  return dealt;
}

/** Wave n's stage: the journey's own, or on an Endless+ loop a shuffled place, mini-boss and boss. */
function stageFor(n: number): { location: LocationId; boss: ArenaId; mini: string } {
  // a hero's nemesis stage swaps in its own place and bosses (src/game/nemesis.ts)
  return applyNemesis(dealtStage(n));
}

function dealtStage(n: number): { location: LocationId; boss: ArenaId; mini: string } {
  const st = STAGES[stageIndex(n)];
  const loop = loopOf(n);
  if (!endlessPlus.on || loop === 0) return st;
  const i = stageIndex(n);
  const { places, minis, bosses } = loopDecks(endlessPlus.seed, loop);
  return { location: places[i % places.length], mini: minis[i % minis.length], boss: bosses[i % bosses.length] };
}

export function backdropFor(n: number): BackdropId {
  return isBossWave(n) ? bossFor(n) : locationFor(n);
}

export function bossMusic(id: ArenaId): string[] {
  return [`music_boss_${id}`, 'music_boss'];
}

export interface WavePlan {
  n: number;
  queue: string[]; // foot ids to spawn in order
  interval: number;
  maxAlive: number;
  hpMult: number;
  /** Bosses' own base health already climbs after wave 30, so their multiplier stops at the wave-30 level. */
  bossHpMult: number;
  /** A Persian war band in this wave: the queue position (feet still queued) where it starts, and its size. */
  band: { at: number; size: number } | null;
  speedMult: number;
  eliteChance: number;
  boss: string | null;
  mini: string | null;
  golden: boolean;
  loop: number;
}

function weightedPick<T>(items: T[], weight: (t: T) => number): T {
  const total = items.reduce((a, t) => a + weight(t), 0);
  let r = Math.random() * total;
  for (const t of items) {
    r -= weight(t);
    if (r <= 0) return t;
  }
  return items[items.length - 1];
}

/** The act a location belongs to. A themed foot's act is its home's (feet without a home are everyday feet). */
function actOfLocation(loc: string | undefined): number | null {
  const i = loc ? STAGES.findIndex((s) => s.location === loc) : -1;
  return i < 0 ? null : Math.floor(i / STAGES_PER_ACT) + 1;
}
const homeAct = (f: FootType) => actOfLocation(f.home);
/** Themed feet (with a home location) only appear in their own act; everyday feet (no home) anywhere. So at any
 * time the game needs only one act's feet in memory (their art is released when the act is left). */
export const THEMED_TAPER = 0;
/** Everyday feet's (no home) weight by act. Acts 3–9 are made of their own themed feet; the everyday cast stays in
 * Acts 1–2 and comes back at full weight in Act 10 for the reunion. At 0 they're out of the act's pool altogether
 * (footPool), so weightedPick never sees them and their art isn't warmed or kept there (GameScene.warmFeet and
 * evictArt both go by footPool). Acts not listed: 1. */
export const EVERYDAY_WEIGHT: Record<number, number> = {
  3: 0,
  5: 0,
  6: 0,
  8: 0,
  9: 0,
  // Acts 4 and 7 keep the everyday feet until their own new feet land (too few themed kinds yet): then 0 too
  4: 1,
  7: 1,
};
const everydayWeight = (act: number): number => EVERYDAY_WEIGHT[act] ?? 1;
/** Act 9 (Greek myths) is where Persian Elephant Feet gather (300 of them unlock the Kratos Peel). */
const ELEPHANT_ACT = 9;
/** Elephants' weight multiplier all through Act 9 (both stages), in place of the fresh and home bonuses: those
 * stacked to ×13 at waves 81–82 and a herd of 650-health elephants flattened the table in a minute. */
const ELEPHANT_ACT_MULT = 3;
/** Chance an Act 9 location wave brings a Persian war band (a Satrap, elephants, cavalry and archers, with Spartan
 * Sandals guarding). */
const BAND_CHANCE = 0.5;

/** The act a wave's location belongs to. */
export function actOfWave(n: number): number {
  return actOfLocation(homeOf(locationFor(n))) ?? Math.floor(stageIndex(n) / STAGES_PER_ACT) + 1;
}

/** The regular feet that can turn up in wave n: unlocked, and either everyday feet (where their act weight isn't 0:
 * EVERYDAY_WEIGHT) or at home in the wave's act. (Its boss's crew and its mini-boss's escort come on top: crewOf,
 * escortOf.) */
export function footPool(n: number): FootType[] {
  const loop = loopOf(n);
  const inLoop = n - loop * JOURNEY_WAVES;
  const act = actOfWave(n);
  const open = FEET.filter((f) => {
    if (f.boss || f.mini || f.weight <= 0 || !(f.minWave <= inLoop || loop > 0)) return false;
    const own = homeAct(f);
    return own === null || own === act || (f.id === 'elephant' && act === ELEPHANT_ACT);
  });
  if (everydayWeight(act) > 0) return open;
  const themed = open.filter((f) => homeAct(f) !== null);
  // (an act with none of its own feet unlocked yet keeps the everyday ones rather than an empty pool)
  return themed.length ? themed : open;
}

/** Feet by id, as types (unknown ids, bosses and fight pieces dropped: a crew or escort is ordinary wave feet);
 * null when there are none. */
function feetOf(ids: string[] | undefined): FootType[] | null {
  const feet = (ids ?? []).map((id) => FOOT_BY_ID[id]).filter((f): f is FootType => !!f && !f.boss && !f.mini && !f.summoned);
  if (import.meta.env.DEV && feet.length !== (ids ?? []).length) console.error('[crews] unknown, boss or summoned ids in', ids);
  return feet.length ? feet : null;
}
/** A boss's crew (BOSS_CREW): its boss wave's whole queued crowd. Null: no crew, the wave's usual crowd. By boss
 * id, so it follows the boss through nemesis swaps and Endless+ deals. */
export const crewOf = (boss: string): FootType[] | null => feetOf(BOSS_CREW[boss]);
/** A mini-boss's escort (MINI_ESCORT): they arrive with it and the rest of the wave leans towards them. */
export const escortOf = (mini: string): FootType[] | null => feetOf(MINI_ESCORT[mini]);
/** How often each crew foot is picked when the crowd is filled: all alike (they're all invited), so each kind makes up
 * about the same share of the crowd (a swarm foot, which queues three, a third as often). */
const crewWeight = (f: FootType): number => (f.traits.includes('swarm') ? 1 / 3 : 1);
/** Odds the rest of a mini-boss's wave leans its way: three to one towards its escort. */
const ESCORT_LEAN = 0.75;
/** Bosses whose fight opens with a Persian war band marching in, at the head of the boss wave's queue. */
const BAND_BOSSES = new Set(['xerxes']);

const isSwarm = (f: FootType | undefined): boolean => !!f?.traits.includes('swarm');
/** A foot's queue entries: a swarm foot queues three. */
const unitOf = (f: FootType): string[] => (isSwarm(f) ? [f.id, f.id, f.id] : [f.id]);

/** Queue feet picked from `pool` until there are `count`. */
function fill(queue: string[], count: number, pool: FootType[], weight: (f: FootType) => number): void {
  while (queue.length < count) queue.push(...unitOf(weightedPick(pool, weight)));
}

/** A queue in spawn units: a swarm foot's run of up to three ids is one unit (spawnTick sends them in together). */
function queueUnits(queue: string[]): string[][] {
  const units: string[][] = [];
  for (let i = 0; i < queue.length; ) {
    let n = 1;
    if (isSwarm(FOOT_BY_ID[queue[i]])) while (n < 3 && queue[i + n] === queue[i]) n++;
    units.push(queue.slice(i, i + n));
    i += n;
  }
  return units;
}

/** A mini-boss arrives with its escort: `count` escort feet come in place of the next `count` queued units (so the
 * wave's size stays about the same), and the rest of the queue leans its way, each unit becoming one of the escort
 * three times in four. Returns the escort feet to bring in now (GameScene.spawnMini). */
export function escortArrival(queue: string[], escort: FootType[], count: number): FootType[] {
  const pick = () => escort[Math.floor(Math.random() * escort.length)];
  const now = Array.from({ length: count }, pick);
  // (a swarm escort is three feet a unit: it leans a third as hard, so the wave doesn't swell to two or three times its size)
  const lean = escort.every((f) => isSwarm(f)) ? ESCORT_LEAN / 3 : ESCORT_LEAN;
  const rest = queueUnits(queue).slice(count).map((u) => (Math.random() < lean ? unitOf(pick()) : u));
  queue.splice(0, queue.length, ...rest.flat());
  return now;
}

/** A Persian war band, in marching order: a Satrap's Slipper leading, a pair of Spartan Sandals defending (the first
 * brings its partner), 2 elephants in front, cavalry riding in on the flanks and an archer behind: 7 queued feet
 * (half the time a second archer rides in place of a horse). Lanes and roles are set by the feet themselves
 * (src/game/acts/persians.ts). Xerxes's opening band (`boss`) brings two Immortals in place of the elephants: in his
 * fight only the elephants he calls ward him, and plain ones marching in first would read as if they did. */
function bandIds(boss = false): string[] {
  const beasts = boss ? ['immortal', 'immortal'] : ['elephant', 'elephant'];
  return ['satrap', 'spartan', ...beasts, 'cavalry', ...(Math.random() < 0.5 ? ['cavalry', 'archer'] : ['archer', 'archer'])];
}

/** Wave n's plan. `bossId` puts another boss in its boss wave (the dev boss shortcut), with that boss's crew. */
export function planWave(n: number, luck: number, heatId: HeatId = 'regular', bossId?: string): WavePlan {
  const heat = HEAT_BY_ID[heatId];
  const loop = loopOf(n);
  const inLoop = n - loop * JOURNEY_WAVES;
  const eff = inLoop + loop * 36; // later loops start harder
  const crowd = heat.crowd;
  // acts 7–10 (waves 61–100 the first time through): health and the crowd caps keep climbing, gently
  const deep = Math.min(DEEP_SPAN, Math.max(0, inLoop - DEEP_FROM));
  const deepUp = 1 + (deep / DEEP_SPAN) * crowd.deepGrowth;
  // foot health climbs through the journey; an endless loop carries on from where the last one ended (it used to
  // restart from wave 1's level ×1.5, so wave 101's feet had a fifth of wave 100's health)
  const climb = (w: number) => Math.min(w - 1, 29) * 0.1 + (Math.min(w, DEEP_FROM) - Math.min(w, 30)) * 0.06 + Math.min(DEEP_SPAN, Math.max(0, w - DEEP_FROM)) * crowd.deepHp;
  const hpMult = (1 + climb(inLoop) + loop * climb(JOURNEY_WAVES)) * heat.hp;
  const speedMult = Math.min(heat.crowd.speedCap, 1 + (Math.min(eff, 40) - 1) * 0.026) * heat.speed;
  const boss = isBossWave(n) ? (bossId ?? bossFor(n)) : null;
  const mini = isMiniWave(n) ? miniFor(n) : null;
  // a nemesis place still brings the regular feet of the place it stands in for
  const home = homeOf(locationFor(n));
  // The act of this wave's location (Endless+ shuffles locations, so this follows the place, not the wave number)
  const act = actOfWave(n);
  const pool = footPool(n);
  // (where it's 0 footPool has already taken them out; this is for weights between 0 and 1. A pool of nothing but
  // everyday feet is footPool's fallback, at full weight.)
  const everyday = pool.some((f) => homeAct(f) !== null) ? everydayWeight(act) : 1;
  // freshly unlocked feet get the spotlight; feet at home in this location turn up 3x as often
  const weight = (f: FootType) => {
    if (f.id === 'elephant' && act === ELEPHANT_ACT) return f.weight * ELEPHANT_ACT_MULT;
    const own = homeAct(f);
    return f.weight * (f.minWave >= inLoop - 1 && loop === 0 ? 3 : 1) * (f.home === home ? 3 : 1)
      // themed feet taper off outside their own act (an act's feet stay its own)
      * (own !== null && own !== act ? THEMED_TAPER : 1)
      // and everyday feet by the act (EVERYDAY_WEIGHT)
      * (own === null ? everyday : 1);
  };
  const loopUp = 1 + loop * 0.5;
  let count = Math.min(Math.round(crowd.countCap * loopUp * deepUp), Math.round((6 + Math.min(eff, 40) * crowd.perWave + deep * crowd.perWave * 0.25 + loop * 4) * heat.count));
  if (boss) count = Math.round(count * 0.35);
  const queue: string[] = [];
  // a boss with a crew (BOSS_CREW) brings its crowd from that alone, whatever their minWave or home
  const crew = boss ? crewOf(boss) : null;
  fill(queue, count, crew ?? pool, crew ? crewWeight : weight);
  // a Persian war band (bandIds): the old band's most was a Spartan and 4–6 elephants. It takes the place of feet
  // already queued, so the wave's size and caps stay the same.
  let band: WavePlan['band'] = null;
  if (act === ELEPHANT_ACT && !boss && !mini && queue.length >= 16 && Math.random() < BAND_CHANCE) {
    const ids = bandIds();
    // somewhere in the middle of the wave, never its first or last feet
    const start = Math.floor(queue.length * (0.25 + Math.random() * 0.4));
    queue.splice(start, ids.length, ...ids);
    band = { at: queue.length - start, size: ids.length };
  }
  // Xerxes's fight opens with one marching in, at the head of the queue
  if (boss && BAND_BOSSES.has(boss) && queue.length) {
    const ids = bandIds(true);
    queue.splice(0, ids.length, ...ids);
    band = { at: queue.length, size: ids.length };
  }
  return {
    n,
    queue,
    interval: Math.max(crowd.intervalFloor, 1.85 - Math.min(eff, 40) * 0.055),
    maxAlive: boss ? Math.min(2 + Math.floor(inLoop / 8), Math.min(6, crowd.aliveCap)) : Math.min(3 + Math.floor(Math.min(eff, 40) * 0.6) + Math.floor(deep / 10), Math.round(crowd.aliveCap * loopUp * deepUp)),
    hpMult,
    // (endless loops shuffle the bosses, so an early stage's boss there starts from the wave-30 level, not wave 1's)
    bossHpMult: (1 + Math.min((loop > 0 ? 30 : inLoop) - 1, 29) * 0.1) * (1 + loop * 0.5) * heat.hp * 0.75,
    band,
    speedMult,
    eliteChance: n >= 6 ? Math.min(crowd.eliteCap, (n - 5) * 0.012) : 0,
    boss,
    mini,
    golden: n >= 3 && Math.random() < 0.28 + luck * 0.08,
    loop,
  };
}

export interface ActMark {
  wave: number;
  elapsed: number;
  feet: number;
  slices: number;
}

/** Toppings that only touch freshness: never dealt where freshness is off. */
const FRESH_ONLY = new Set(['basil', 'fridge', 'leftovers']);

export class Run {
  heat: HeatId = 'regular';
  act2Start = false;
  wave = 0;
  score = 0;
  coins = 0;
  combo = 0;
  bestCombo = 0;
  comboTimer = 0;
  feetSmacked = 0;
  bossesBeaten: string[] = [];
  /** First-ever boss kills this run (20 crusts each). */
  firstKills = 0;
  owned: Record<string, number> = {};
  /** Consumable id → first wave it may be offered again. */
  cooldowns: Record<string, number> = {};
  /** Consumables bought and waiting to trigger. */
  armed: string[] = [];
  super = 0;
  rerollCost = 10;
  reheatUses = 0;
  stats: Stats = baseStats();
  perkCounts: Partial<Record<PizzaPerk, number>> = {};
  slicesLost = 0;
  pizzasBought = 0;
  /** Golden Crusts from wave events (capped per run). */
  eventCrusts = 0;
  /** Crusts already paid into the bank this run (bosses, first kills, events): they're never lost. */
  bankedCrusts = 0;
  /** Golden menu uses this run, by item id. */
  goldenUsed: Record<string, number> = {};
  secondChances = 0;
  newUnlocks: string[] = [];
  /** Why each pizza in newUnlocks was unlocked (for the end-of-run summary). */
  unlockWhy: Record<string, string> = {};
  /** Milestones reached this run. */
  milestonesHit: string[] = [];
  /** Enhance a Pizza uses this run (its crust price doubles each time). */
  enhanceUses = 0;
  /** Toppings bought this run (each counts once towards its run count in the Toppings tab). */
  bought: string[] = [];
  /** Peels owned when the run began, and each locked goal's progress then (end-of-run summary). */
  startPeels: string[] | null = null;
  goalStart: Record<string, number> = {};
  /** Perks of the enhanced pizzas on the table (set by recompute). */
  enhancedPerks = new Set<PizzaPerk>();
  /** Run time in seconds: counts waves and the shop, stops in the pause menu, while the tab is hidden and while away from the run. */
  elapsed = 0;
  /** The run clock in whole microseconds (elapsed is it in seconds). */
  elapsedUs = 0;
  /** Endless: the run carries on past the journey's end (JOURNEY_WAVES) instead of ending there. */
  endless = false;
  /** Where the current act began: its first wave and the run's clock, feet and slices lost then (for ACT COMPLETE). */
  actFrom: ActMark | null = null;
  /** Run state for the event, mixed, shop and wildcard toppings (saved with the run). */
  kit: KitState = freshKitState();
  /** Set by the scene: what toppings with an offerIf need to know. */
  env: OfferEnv = { otherPeels: 0, throws: false };

  get heatDef() {
    return HEAT_BY_ID[this.heat];
  }

  level(id: string): number {
    return this.owned[id] ?? 0;
  }

  meta(id: string): number {
    return save.meta[id] ?? 0;
  }

  /** The run's modifier ledger, as last resolved (what made each stat: the STATS tab and the NOW tags read it). */
  ledger: Ledger | null = null;

  /**
   * A fresh ledger with the run's build in it (src/effects/ledger.ts): the Pizzeria's upgrades, the toppings' effects
   * and the table's perks (Phase.Build), the peel's and the hero's always-on stats (Phase.Peel). The scene adds the
   * later phases (topping tricks, the Ghost, the table-shaped perks) and settles it.
   * seats: the pizzas granting a perk now, each with its weight (1; +0.5 enhanced; +0.5 Mystery Meat).
   * enhanced: the perks of enhanced pizzas (and Mystery Meat's), for the perks that read "enhanced" in play.
   */
  buildLedger(seats: TableSeat[], peel: PeelStats[] = [], enhanced: PizzaPerk[] = []): Ledger {
    const L = new Ledger();
    const build = (source: SourceRef, list: EffectData[], levels = 1) => applyAll(list, { ledger: L, source, phase: Phase.Build }, levels);
    // the Pizzeria's upgrades
    const meta = (id: string) => this.meta(id);
    const metaFx: EffectData[] = [];
    if (meta('wrists')) metaFx.push(Effect.Stat(Stat.Damage, Op.Boost(Unit.scale(Unit.Percent(8), meta('wrists')))));
    if (meta('tips')) metaFx.push(Effect.Stat(Stat.CoinMult, Op.Add(Unit.scale(Unit.Percent(10), meta('tips')))));
    if (meta('apron')) metaFx.push(Effect.Stat(Stat.Luck, Op.Add(Unit.Count(meta('apron')))));
    if (meta('opinion')) metaFx.push(Effect.Stat(Stat.FreeRerolls, Op.Add(Unit.Count(meta('opinion')))));
    build(META_SOURCE, metaFx);
    // toppings: each level applies the topping's effects once
    for (const [id, lvl] of Object.entries(this.owned)) {
      const u = UPGRADE_BY_ID[id];
      if (u?.effects && lvl > 0) build(Source.Topping(id), u.effects, lvl);
    }
    // live pizza perks, shared by the pizzas granting them (Napoletana makes every other perk 5% stronger)
    const counts: Partial<Record<PizzaPerk, number>> = {};
    const who: Partial<Record<PizzaPerk, SourceShare>> = {};
    for (const t of seats) {
      counts[t.perk] = (counts[t.perk] ?? 0) + t.weight;
      const w = (who[t.perk] ??= {});
      w[t.source] = (w[t.source] ?? 0) + t.weight;
    }
    this.perkCounts = counts;
    this.enhancedPerks = new Set(enhanced);
    this.boosters = who.perkBoost ?? {};
    const boost = 1 + 0.05 * (counts.perkBoost ?? 0);
    const c = (p: PizzaPerk) => (counts[p] ?? 0) * boost;
    // Pepperoni's and the luck pizzas' tips: one sum, shared by their pizzas by what each adds
    if (c('coins') > 0 || c('luck') > 0) {
      const src: SourceShare = {};
      for (const k of ['coins', 'luck'] as const) for (const [id, w] of shareEntries(who[k] ?? {})) src[id] = (src[id] ?? 0) + PERK_TIPS[k] * w;
      build(this.withBoost(src), [Effect.Stat(Stat.CoinMult, Op.Add(Unit.of(UnitKind.Percent, PERK_TIPS.coins * c('coins') + PERK_TIPS.luck * c('luck'))))]);
    }
    // the rest, perk by perk in their old order
    for (const [perk, fx] of Object.entries(PERK_STATS) as [PizzaPerk, (n: number) => EffectData[]][]) if (fx !== PERK_NONE && c(perk) > 0) build(this.withBoost(who[perk]!), fx(c(perk)));
    // always-on peel and hero stats, on the build (before the caps). (Raw numbers: an ability's `stat` effect is
    // written in the stats' own stored units, src/game/abilities.ts; it becomes Effect.Stat when peels port, step 3.)
    for (const p of peel)
      for (const [k, v] of Object.entries(p.mods) as [keyof Stats, number][])
        if (typeof STAT_DEFS[k]?.base === 'number' && v) L.add({ stat: k, op: Op.Add(v), source: p.source, phase: Phase.Peel });
    return L;
  }

  /** The Napoletanas on the table now (their ledger sources and weights): set by buildLedger. */
  boosters: SourceShare = {};

  /** A perk's sources with Napoletana's share added: its boost is part of every other perk's strength, so it gets the
   *  part of each it adds (×1.05: 1/21 of the perk). src is weighted by strength before the boost. */
  withBoost(src: SourceShare): SourceShare {
    const n = shareEntries(this.boosters).reduce((a, [, b]) => a + b, 0);
    if (!n) return src;
    const W = shareEntries(src).reduce((a, [, b]) => a + b, 0);
    const out = { ...src };
    for (const [id, w] of shareEntries(this.boosters)) out[id] = (out[id] ?? 0) + W * 0.05 * w;
    return out;
  }

  /** Resolve a ledger into the run's stats (and keep it for the STATS tab). */
  settle(L: Ledger, ctx: ValueCtx): Stats {
    this.stats = L.resolve(ctx).stats;
    this.ledger = L;
    return this.stats;
  }

  /** Can this upgrade be offered right now? */
  /** Set by the scene when a peel ability replaces the Peel Slam: slam-only toppings aren't offered. */
  slamless: { slam: boolean; meter: boolean; tank?: boolean } = { slam: false, meter: false };

  /** A topping's level cap this run (Infinite Oven lifts every one that levels up). */
  maxLevel(u: Upgrade): number {
    return u.max > 1 && kindOf(u) === 'permanent' ? u.max + this.stats.capBonus : u.max;
  }

  offerable(u: Upgrade, wave: number): boolean {
    // rarer toppings arrive as the run builds up (shop cards, rerolls, boss loot, events, Golden Menu)
    if (!rarityOpen(u.rarity, wave)) return false;
    if (this.slamless.slam && u.id === 'freeze') return false;
    if (this.slamless.meter && (u.id === 'oregano' || u.id === 'dried' || u.id === 'overtime' || u.needsMeter)) return false;
    if (u.needsMeter === 'tank' && this.slamless.tank) return false;
    if (u.needsEvents && (this.stats.noEvents || (this.stats.eventMult <= 0 && !this.stats.eventAlways))) return false;
    if (u.offerIf && !u.offerIf(this.env)) return false;
    // freshness toppings do nothing where freshness is off (Mild)
    if (FRESH_ONLY.has(u.id) && this.heatDef.freshness <= 0) return false;
    const k = kindOf(u);
    if (k === 'unique') return this.level(u.id) === 0;
    if (k === 'consumable') return !this.armed.includes(u.id) && (this.cooldowns[u.id] ?? 0) <= wave;
    return this.level(u.id) < this.maxLevel(u);
  }

  /** A consumable was used up: keep it out of the shop for a few waves. */
  consume(id: string): void {
    this.armed = this.armed.filter((x) => x !== id);
    this.cooldowns[id] = this.wave + CONSUMABLE_COOLDOWN + 1;
  }

  /** What can be dealt now, less `exclude`. */
  dealable(exclude: string[] = []): Upgrade[] {
    return UPGRADES.filter((u) => this.offerable(u, this.wave) && !exclude.includes(u.id));
  }

  /** n cards weighted by rarity (luck tips it rarer) from `avail`: the deal's picks (src/game/shopDeals.ts dealCards). */
  pickCards(n: number, avail: Upgrade[]): Upgrade[] {
    const luck = this.stats.luck;
    const weights: Record<Rarity, number> = {
      common: RARITY_WEIGHT.common / (1 + luck * 0.25),
      rare: RARITY_WEIGHT.rare * (1 + luck * 0.15),
      epic: RARITY_WEIGHT.epic * (1 + luck * 0.35),
      legendary: RARITY_WEIGHT.legendary * (1 + luck * 0.6),
    };
    const picks: Upgrade[] = [];
    let guard = 0;
    while (picks.length < n && guard++ < 200) {
      const remaining = avail.filter((u) => !picks.includes(u));
      if (!remaining.length) break;
      picks.push(weightedPick(remaining, (u) => weights[u.rarity]));
    }
    return picks;
  }

  /** Boss loot's n picks: epic or better (none when none is open). */
  pickBossCards(n: number, exclude: string[] = []): Upgrade[] {
    const avail = this.dealable(exclude).filter((u) => u.rarity === 'epic' || u.rarity === 'legendary');
    const picks: Upgrade[] = [];
    while (picks.length < n && avail.length) {
      const u = weightedPick(avail, (x) => (x.rarity === 'legendary' ? 1 : 2.5));
      picks.push(u);
      avail.splice(avail.indexOf(u), 1);
    }
    return picks;
  }

  /** `extra` one-use cards more (Mac & Cheese's, from the ledger's total), each when one is free to deal. */
  addExtraConsumables(picks: Upgrade[], avail: Upgrade[], extra: number): void {
    for (let i = 0; i < extra; i++) {
      const cons = avail.filter((u) => kindOf(u) === 'consumable' && !picks.includes(u));
      if (cons.length) picks.push(weightedPick(cons, () => 1));
    }
  }

  /** Exclusive Menu: every card is dealt one rarity higher (when that rarity is open and has one to offer). */
  bumpRarity(picks: Upgrade[], exclude: string[]): Upgrade[] {
    const up: Record<Rarity, Rarity> = { common: 'rare', rare: 'epic', epic: 'legendary', legendary: 'legendary' };
    const out: Upgrade[] = [];
    for (const u of picks) {
      const r = up[u.rarity];
      const pool = r === u.rarity ? [] : UPGRADES.filter((x) => x.rarity === r && this.offerable(x, this.wave) && !exclude.includes(x.id) && !out.includes(x) && !picks.includes(x));
      out.push(pool.length ? pool[Math.floor(Math.random() * pool.length)] : u);
    }
    return out;
  }

  comboMult(): number {
    return 1 + Math.min(4, Math.floor(this.combo / 5) * 0.25);
  }

  /** Every Golden Crust this run has earned: banked ones plus what the end of the run will pay. */
  crustsEarned(figOnTable = false): number {
    return this.endCrusts(figOnTable) + this.bankedCrusts;
  }

  /** The part paid when the run ends: score and waves cleared. */
  endCrusts(figOnTable = false): number {
    // Vow of Focus adds its share on top
    return endCrustsFor(this.score, this.wave, this.act2Start, this.heat, (figOnTable ? this.stats.crustBonus : 0) + this.stats.endCrustMult);
  }

  /** Crusts for a boss kill, scaled by heat (and Fig & Gorgonzola). */
  bossCrusts(firstKill: boolean, figOnTable = false): number {
    const mult = this.heatDef.crusts * (figOnTable ? 1 + this.stats.crustBonus : 1);
    return Math.round((5 + (firstKill ? FIRST_KILL_CRUSTS : 0)) * mult);
  }

  /** Unlock a pizza for good, noting why for the end-of-run summary. */
  unlock(id: string, why: string): boolean {
    if (!unlockPizza(id)) return false;
    if (!this.newUnlocks.includes(id)) this.newUnlocks.push(id);
    this.unlockWhy[id] = why;
    return true;
  }

  /** Enhance a Pizza's crust price: 30, then doubling each use this run. */
  enhanceCost(): number {
    return 30 * 2 ** this.enhanceUses;
  }

  /** Pay crusts into the bank straight away. */
  bank(n: number): void {
    if (n <= 0) return;
    save.crusts += n;
    this.bankedCrusts += n;
  }
}

/** End-of-run crusts: score on a square-root curve (late combos push scores into the millions, and a
 * linear rate once paid ~19,000 crusts for one Regular journey) plus 2 per wave cleared, times heat.
 * Bosses, first kills and events are banked as they happen, not here. */
export function endCrustsFor(score: number, wave: number, act2Start: boolean, heat: HeatId, figBonus = 0): number {
  const waves = Math.max(0, wave - 1 - (act2Start ? 30 : 0));
  const base = Math.floor(Math.sqrt(Math.max(0, score)) / 8) + waves * 2;
  return Math.floor(base * HEAT_BY_ID[heat].crusts * (1 + figBonus));
}

/** First shop (wave cleared) each rarity can be dealt in: epics from the wave 5 boss shop,
 * legendaries from wave 10. */
export const RARITY_FROM: Record<Rarity, number> = { common: 0, rare: 0, epic: 5, legendary: 10 };

export function rarityOpen(r: Rarity, wave: number): boolean {
  return wave >= RARITY_FROM[r];
}

/** The rarest rarity open at this wave (Golden Reroll guarantees one). */
export function bestRarity(wave: number): Rarity {
  return rarityOpen('legendary', wave) ? 'legendary' : rarityOpen('epic', wave) ? 'epic' : 'rare';
}

/** A locked Pizzeria pizza dealt as a Chef's Special. */
const pizzeriaSpecial = (p: PizzaType) => p.route === 'pizzeria' && !save.unlockedPizzas.includes(p.id);

/** A pizza's Chef's Special tips before wave scaling: a special's own price (inside its tier's band); a Pizzeria
 * pizza dealt as one, the top of its tier's band; anything else (a pizza you own, enhanced), the band's middle. */
export function specialTips(p: PizzaType): number {
  if (p.route === 'special') return p.cost;
  const [lo, hi] = TIER_TIPS[p.rarity];
  return pizzeriaSpecial(p) ? hi : Math.round((lo + hi) / 2);
}

/** A Chef's Special's tip price: about twice that pizza at the counter (`normal`, its tier's price), plus its own
 * tips, which grow with the wave. A Pizzeria pizza dealt as one costs a good deal more (crusts stay the reliable way). */
export function specialPrice(normal: number, p: PizzaType, wave: number): number {
  const price = (normal * 2 + specialTips(p) * (0.4 + 0.035 * wave)) * (pizzeriaSpecial(p) ? PIZZERIA_SPECIAL_MARKUP : 1);
  return Math.round(price / 5) * 5;
}

/** Everyday feet that leave pizzas soggy or scorched (Pizza Bianca's goal). */
const SOGGY_SCORCH = (): string[] => FEET.filter((f) => !f.boss && !f.mini && (f.traits.includes('soggy') || f.traits.includes('scorch'))).map((f) => f.id);
/** Every mini-boss (Lobster Thermidor's goal). */
const MINI_IDS = (): string[] => FEET.filter((f) => f.mini).map((f) => f.id);

/** A milestone's progress towards its goal: [have, need]. */
export function milestoneProgress(id: string): [number, number] {
  const nb = save.bossesBeaten.length;
  const wave = save.bestWave;
  const g = save.pizzaGoals ?? {};
  const act1 = (h: HeatId): [number, number] => (save.act1Cleared.includes(h) ? [30, 30] : [Math.min(29, save.best[h]?.wave ?? 0), 30]);
  switch (id) {
    case 'firstWave3': return [Math.min(3, wave), 3];
    case 'feet150': return [Math.min(150, save.totalFeet), 150];
    case 'wave10': return [Math.min(10, wave), 10];
    case 'bosses3': return [Math.min(3, nb), 3];
    case 'feet600': return [Math.min(600, save.totalFeet), 600];
    case 'wave20': return [Math.min(20, wave), 20];
    case 'bosses6': return [Math.min(6, nb), 6];
    case 'act1': return save.act1Cleared.length ? [30, 30] : [Math.min(29, wave), 30];
    case 'bosses12': return [Math.min(12, nb), 12];
    case 'feet1500': return [Math.min(1500, save.totalFeet), 1500];
    case 'wave45': return [Math.min(45, wave), 45];
    case 'bosses18': return [Math.min(18, nb), 18];
    case 'journey': return [Math.min(JOURNEY_WAVES, wave), JOURNEY_WAVES];
    case 'allBosses': return [Math.min(24, nb), 24];
    case 'hot30': return act1('hot');
    case 'extrahot30': return act1('extrahot');
    case 'inferno30': return act1('inferno');
    // phase 3 milestone prizes
    case 'act1Lap': return save.act1Cleared.length ? [30, 30] : [Math.min(29, wave), 30];
    case 'slayer24': {
      // the first 12 stages' bosses and mini-bosses: the 24 the game began with (acts 1–6)
      const original = new Set(STAGES.slice(0, 12).flatMap((s) => [s.boss, s.mini] as string[]));
      return [Math.min(24, save.bossesBeaten.filter((b) => original.has(b)).length), 24];
    }
    case 'wave100': return [Math.min(100, wave), 100];
    case 'feet5000': return [Math.min(5000, save.totalFeet), 5000];
    case 'perfect10': return [Math.min(10, g.perfectBest ?? 0), 10];
    case 'runs25': return [Math.min(25, save.runs), 25];
    case 'peels100': return [Math.min(100, new Set(['classic', ...save.peels]).size), 100];
    case 'combo150': return [Math.min(150, g.bestCombo ?? 0), 150];
    case 'untouched': return [Math.min(1, g.untouched ?? 0), 1];
    case 'fastWave': return [(g.fastWave ?? 99) < 8 ? 1 : 0, 1];
    case 'night10': return [Math.min(10, g.nightRuns ?? 0), 10];
    case 'surtr': return [save.bossesBeaten.includes('surtr') ? 1 : 0, 1];
    case 'hades': return [save.bossesBeaten.includes('hades') ? 1 : 0, 1];
    // the pizza plan's new milestone prizes (all counted from the save, on any heat)
    case 'wave60': return [Math.min(60, wave), 60];
    case 'soggyScorch': return [Math.min(150, SOGGY_SCORCH().reduce((n, id) => n + (save.kills[id] ?? 0), 0)), 150];
    case 'pier25': return [Math.min(25, save.stageWaves.pier ?? 0), 25];
    case 'minis25': return [Math.min(25, MINI_IDS().reduce((n, id) => n + (save.kills[id] ?? 0), 0)), 25];
    case 'pizzas40': return [Math.min(40, save.unlockedPizzas.filter((id) => PIZZA_BY_ID[id]).length), 40];
    case 'feet3000': return [Math.min(3000, save.totalFeet), 3000];
    case 'golden25': return [Math.min(25, save.kills.golden ?? 0), 25];
    case 'events40': return [Math.min(40, Object.values(save.eventsDone).reduce((n, v) => n + v, 0)), 40];
    // the Epic milestones (docs/pizza-plan.md, section 11)
    case 'hot20': return [Math.min(20, Math.max(...(['hot', 'extrahot', 'inferno'] as HeatId[]).map((h) => save.best[h]?.wave ?? 0))), 20];
    case 'bifrost76': return [Math.min(76, wave), 76];
    case 'bosses32': return [Math.min(32, nb), 32];
    case 'hotBosses6': return [Math.min(6, (save.bossesBeatenHot ?? []).length), 6];
    case 'combo200': return [Math.min(200, g.bestCombo ?? 0), 200];
    case 'feet8000': return [Math.min(8000, save.totalFeet), 8000];
    // the Legendary milestones (docs/pizza-plan.md, section 12): feats recorded as they happen (save.pizzaGoals)
    case 'waiterHot': return [g.waiterHot ? 1 : 0, 1];
    case 'beachHot': return [g.beachHot ? 1 : 0, 1];
    default: return [0, 1];
  }
}

/**
 * Award milestones reached (and catch up on ones reached before they named a pizza). Returns the
 * newly awarded ones with their pizza, or crusts when the milestone has no pizza.
 */
export function awardMilestones(run: Run | null): { m: Milestone; pizza: PizzaType | null; crusts: number }[] {
  const out: { m: Milestone; pizza: PizzaType | null; crusts: number }[] = [];
  for (const m of MILESTONES) {
    const [have, need] = milestoneProgress(m.id);
    const fresh = have >= need && !save.milestones.includes(m.id);
    const pizza = m.pizza ? PIZZA_BY_ID[m.pizza] ?? null : null;
    const owed = save.milestones.includes(m.id) && pizza && !save.unlockedPizzas.includes(pizza.id);
    if (!fresh && !owed) continue;
    if (fresh) save.milestones.push(m.id);
    // a goal reached for a pizza that's already yours (bought before it became a milestone prize, or won by its other
    // route): nothing more to give, so it's ticked off quietly
    if (fresh && pizza && save.unlockedPizzas.includes(pizza.id)) continue;
    if (pizza) {
      if (run) run.unlock(pizza.id, `Milestone: ${m.name}`);
      else unlockPizza(pizza.id);
    } else save.crusts += 50;
    if (fresh) {
      run?.milestonesHit.push(m.id);
      out.push({ m, pizza, crusts: pizza ? 0 : 50 });
    }
  }
  return out;
}
