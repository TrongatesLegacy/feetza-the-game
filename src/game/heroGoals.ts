// Hero and god peel goals: what unlocks each one, and the tracking behind it.
//
// A goal is one row of data (see HeroGoal). Most goals read a counter in save.goals, keyed by what bumps it:
//   - 'sighting:<id>'  a hero sighting caught (src/game/sightings.ts)
//   - 'secret:<id>'    a hidden thing in a backdrop smacked (src/game/sightings.ts)
//   - 'partner:<peel>' waves cleared with that peel equipped (only counted once you own it)
//   - 'time:<key>'     a run played at a real-world time (counted at run start and every wave clear)
//   - anything else    a tracker in TRACKERS, fed game events by the scene through HeroTracker.emit()
//
// To add a goal: give the peel a HeroGoal in its content file (src/content/peels/*.ts). If it needs a new feat,
// add a tracker below: a few hooks on HeroEvents that return true (or a number) when the feat (or progress) happens.
// Per-run state lives in `c.st` (reset at the start of every run).

import type { HeatId } from '../data/difficulty';
import { STAGES, WAVES_PER_STAGE, actWaves, waveInJourney } from '../data/stages';
import { persist, save } from '../systems/save';
import type { Foot } from './Foot';

export type SightingId = 'bird' | 'comet' | 'visor' | 'cassette' | 'kid' | 'saucer' | 'tophat' | 'squirrels';
export type SecretId = 'signal' | (string & {});

/** Real-world timing in the player's local time. Every field given must match. */
export interface When {
  /** 0 Sunday … 6 Saturday. */
  weekday?: number[];
  /** Local hours [from, to): wraps past midnight, so [22, 2] is 10pm to 2am. */
  hours?: [number, number];
  /** 1–12. */
  months?: number[];
  season?: 'spring' | 'summer' | 'autumn' | 'winter';
  /** About a day either side of the real full (or new) moon, computed from the date. */
  moon?: 'full' | 'new';
  /** 7am to 7pm. */
  daylight?: boolean;
}

export type HeroGoal =
  /** Catch a hero sighting n times. */
  | { kind: 'sighting'; id: SightingId; need: number }
  /** Smack a hidden thing in a backdrop n times. */
  | { kind: 'secret'; id: SecretId; need: number }
  /** Buy it in the locker. */
  | { kind: 'crusts'; cost: number }
  /** Own `peel`, then clear `waves` waves with it equipped. */
  | { kind: 'partner'; peel: string; waves: number }
  /** A tracker's counter (TRACKERS[key]) reaches need; with `when`, only progress made at that time counts. */
  | { kind: 'track'; key: string; need: number; when?: When }
  /** Something already in the save (best wave, bosses beaten, peels owned); with `when`, it unlocks only then. */
  | { kind: 'value'; read: () => number; need: number; when?: When }
  /** Play a run at this real-world time (counted at run start and at each wave clear). */
  | { kind: 'time'; key: string; when: When }
  /** Any one of these (the best one shows as progress). */
  | { kind: 'any'; of: HeroGoal[] };

// ——— real-world time ———
const SYNODIC = 29.530588853;
/** A known new moon: 6 Jan 2000, 18:14 UTC. */
const NEW_MOON_2000 = Date.UTC(2000, 0, 6, 18, 14);

/** Days since the last new moon (0 … 29.5). */
export function moonAge(d = new Date()): number {
  const days = (d.getTime() - NEW_MOON_2000) / 86400000;
  return ((days % SYNODIC) + SYNODIC) % SYNODIC;
}

export function isFullMoon(d = new Date()): boolean {
  return Math.abs(moonAge(d) - SYNODIC / 2) <= 1;
}

export function isNewMoon(d = new Date()): boolean {
  const a = moonAge(d);
  return a <= 1 || a >= SYNODIC - 1;
}

/** Meteorological seasons (northern hemisphere): spring is March to May. */
export function seasonOf(d = new Date()): 'spring' | 'summer' | 'autumn' | 'winter' {
  const m = d.getMonth() + 1;
  return m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter';
}

/** Dev: pretend it's this date (null: the real clock). */
let fakeNow: Date | null = null;
export function setFakeNow(d: Date | null): void {
  fakeNow = d;
}
export function now(): Date {
  return fakeNow ? new Date(fakeNow) : new Date();
}

export function matches(w: When, d = now()): boolean {
  if (w.weekday && !w.weekday.includes(d.getDay())) return false;
  if (w.months && !w.months.includes(d.getMonth() + 1)) return false;
  if (w.season && seasonOf(d) !== w.season) return false;
  if (w.moon === 'full' && !isFullMoon(d)) return false;
  if (w.moon === 'new' && !isNewMoon(d)) return false;
  const h = d.getHours() + d.getMinutes() / 60;
  if (w.daylight !== undefined && w.daylight !== (h >= 7 && h < 19)) return false;
  if (w.hours) {
    const [a, b] = w.hours;
    const inside = a <= b ? h >= a && h < b : h >= a || h < b;
    if (!inside) return false;
  }
  return true;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const hr = (h: number) => (h === 0 ? 'midnight' : h === 12 ? 'noon' : h < 12 ? `${h}am` : `${h - 12}pm`);

/** "on a Thursday", "during a full moon", "in autumn (September to November)". */
export function whenText(w: When): string {
  const parts: string[] = [];
  if (w.weekday) parts.push(`on a ${w.weekday.map((d) => DAYS[d]).join(' or ')}`);
  if (w.season) parts.push(`in ${w.season} (${{ spring: 'March to May', summer: 'June to August', autumn: 'September to November', winter: 'December to February' }[w.season]})`);
  if (w.moon) parts.push(`during a real ${w.moon} moon`);
  if (w.hours) parts.push(`between ${hr(w.hours[0])} and ${hr(w.hours[1])} (your local time)`);
  if (w.daylight) parts.push('in daylight (your local time)');
  return parts.join(', ');
}

// ——— counters ———
export function goalCount(key: string): number {
  return save.goals[key] ?? 0;
}

/** Add to a goal counter (sightings, secrets, partners, trackers). */
export function bumpGoal(key: string, n = 1): void {
  save.goals[key] = (save.goals[key] ?? 0) + n;
  persist();
}

/** Raise a goal's best (a value that only ever goes up). */
export function bestGoal(key: string, v: number): void {
  if (v > (save.goals[key] ?? 0)) {
    save.goals[key] = v;
    persist();
  }
}

const owns = (peel: string) => peel === 'classic' || save.peels.includes(peel);

/** [have, need] for the locker's progress bar. */
export function goalProgress(g: HeroGoal): [number, number] {
  switch (g.kind) {
    case 'sighting':
      return [Math.min(g.need, goalCount(`sighting:${g.id}`)), g.need];
    case 'secret':
      return [Math.min(g.need, goalCount(`secret:${g.id}`)), g.need];
    case 'crusts':
      return [Math.min(g.cost, save.crusts), g.cost];
    case 'partner':
      return [owns(g.peel) ? Math.min(g.waves, goalCount(`partner:${g.peel}`)) : 0, g.waves];
    case 'track':
      return [Math.min(g.need, goalCount(g.when ? `${g.key}@${whenKey(g.when)}` : g.key)), g.need];
    case 'value': {
      const v = Math.min(g.need, g.read());
      // a timed value waits for its day: one short of done until then
      return [g.when && v >= g.need && !matches(g.when) ? g.need - 1 : v, g.need];
    }
    case 'time':
      return [Math.min(1, goalCount(`time:${g.key}`)), 1];
    case 'any': {
      const all = g.of.map(goalProgress);
      return all.sort((a, b) => b[0] / b[1] - a[0] / a[1])[0] ?? [0, 1];
    }
  }
}

const whenKey = (w: When) => JSON.stringify(w);

/** Default "how to unlock" text (content can write its own). */
export function goalHow(g: HeroGoal): string {
  switch (g.kind) {
    case 'sighting':
      return `Catch the ${SIGHTING_NAME[g.id]} sighting ${g.need} times (a rare flyby across the top of the screen: smack it twice).`;
    case 'secret':
      return `Find and smack a hidden secret ${g.need} times.`;
    case 'crusts':
      return `Buy for ${g.cost.toLocaleString()} Golden Crusts.`;
    case 'partner':
      return `Partner: own the ${g.peel} peel, then clear ${g.waves} waves with it equipped.`;
    case 'track':
      return `${TRACK_TEXT[g.key] ?? g.key}${g.when ? `, ${whenText(g.when)}` : ''}.`;
    case 'value':
      return g.when ? `Then, ${whenText(g.when)}.` : '';
    case 'time':
      return `Play a run ${whenText(g.when)}.`;
    case 'any':
      return g.of.map(goalHow).join(' Or: ');
  }
}

export const SIGHTING_NAME: Record<SightingId, string> = {
  bird: 'Is it a bird?',
  comet: 'green comet',
  visor: 'visor glint',
  cassette: 'cassette ship',
  kid: 'lightning kid',
  saucer: 'green saucer',
  tophat: 'top hat',
  squirrels: 'squirrel parade',
};

// ——— registered goals (filled by the peel content modules) ———
export interface GoalEntry {
  peel: string;
  goal: HeroGoal;
}
export const GOALS: GoalEntry[] = [];

export function registerGoals(list: GoalEntry[]): void {
  GOALS.push(...list);
}

/** Time goals, flattened out of 'any' goals too. */
function timeGoals(): Extract<HeroGoal, { kind: 'time' }>[] {
  const out: Extract<HeroGoal, { kind: 'time' }>[] = [];
  const walk = (g: HeroGoal) => {
    if (g.kind === 'time') out.push(g);
    else if (g.kind === 'any') g.of.forEach(walk);
  };
  for (const e of GOALS) walk(e.goal);
  return out;
}

function timedTracks(): Extract<HeroGoal, { kind: 'track' }>[] {
  const out: Extract<HeroGoal, { kind: 'track' }>[] = [];
  const walk = (g: HeroGoal) => {
    if (g.kind === 'track' && g.when) out.push(g);
    else if (g.kind === 'any') g.of.forEach(walk);
  };
  for (const e of GOALS) walk(e.goal);
  return out;
}

/** Sightings that can still turn up: their peel isn't unlocked yet. */
export function openSightings(): SightingId[] {
  const out: SightingId[] = [];
  for (const e of GOALS) if (e.goal.kind === 'sighting' && !owns(e.peel)) out.push(e.goal.id);
  return out;
}

/** Secrets still worth hiding: their peel isn't unlocked yet. */
export function openSecrets(): SecretId[] {
  const out: SecretId[] = [];
  for (const e of GOALS) if (e.goal.kind === 'secret' && !owns(e.peel)) out.push(e.goal.id);
  return out;
}

// ——— trackers: feats and counters fed by game events ———

/** What the scene tells the tracker, as it happens. */
export interface HeroEvents {
  runStart: Record<string, never>;
  waveStart: { boss: boolean; mini: boolean };
  /** secs: from the first foot to the wave clearing; slicesLost: this wave. */
  waveClear: { boss: boolean; mini: boolean; secs: number; slicesLost: number; stageEnd: boolean };
  /** A smack: hits = feet it hit (0 is a miss; smacks on a wave event aren't sent). */
  smack: { hits: number; x: number; y: number };
  /** A smack hit a foot. lastMoment: it was due to stomp within 0.3 s. */
  hit: { foot: Foot; lastMoment: boolean; x: number };
  kill: { foot: Foot; source: string };
  /** A foot came down on a pizza. blocked: what stopped it (null: it landed). */
  stomp: { foot: Foot; blocked: 'shield' | 'other' | null };
  slices: { n: number };
  pizzaLost: Record<string, never>;
  peelStunned: Record<string, never>;
  bossDown: { foot: Foot; mini: boolean; secs: number; smacks: number; slicesLost: number; peelStunned: boolean; abilityUsed: boolean };
  eventDone: { id: string };
  eventMissed: { id: string };
  chainHit: Record<string, never>;
  knockedTop: { foot: Foot };
  /** A shop reroll dealt these rarities. */
  reroll: { rarities: string[] };
  /** Four times a second while a wave is on. */
  tick: { feet: Foot[]; now: number };
  runEnd: { victory: boolean };
}

/** What the trackers can see of the run. */
export interface RunView {
  wave: number;
  /** The wave this run began on. */
  firstWave: number;
  heat: HeatId;
  location: string | null;
  backdrop: string | null;
  peel: string;
  pizzasAlive: number;
  owned: Record<string, number>;
  /** Toppings that add chain lightning, owned this run. */
  chainToppings: number;
  /** Main bosses beaten this run. */
  bosses: number;
  pizzasLost: number;
  victory: boolean;
}

export interface TrackCtx {
  /** This tracker's state for the run. */
  st: Record<string, number | boolean>;
  run: RunView;
}

export type Tracker = { [E in keyof HeroEvents]?: (e: HeroEvents[E], c: TrackCtx) => number | boolean | void };

/** The locker text for each tracker key (goalHow appends a timing, if the goal has one). */
export const TRACK_TEXT: Record<string, string> = {};

/** Feats and counters by key. Return true (or a number) to bump save.goals[key]. */
export const TRACKERS: Record<string, Tracker> = {};

/** Add trackers: key → [locker text, hooks]. */
export function registerTrackers(list: Record<string, [string, Tracker]>): void {
  for (const [k, [text, t]] of Object.entries(list)) {
    TRACK_TEXT[k] = text;
    TRACKERS[k] = t;
  }
}

const HIGH: HeatId[] = ['hot', 'extrahot', 'inferno'];
const FROZEN = (f: Foot) => f.alive && f.frozen && f.stunT > 0;
const BURNING = (f: Foot) => f.alive && f.burnT > 0;

/** Distinct statuses on a foot (burn, slow, stun, freeze, mark, and the hero ones in brain). */
export function statusesOf(f: Foot, now: number): string[] {
  const out: string[] = [];
  if (f.burnT > 0) out.push('burn');
  if (f.slowT > 0) out.push('slow');
  if (f.stunT > 0) out.push(f.frozen ? 'freeze' : 'stun');
  if (f.markUntil > now || f.brain.marked) out.push('mark');
  if (f.sizeMul < 0.95) out.push('shrink');
  for (const k of ['bleed', 'webbed', 'hexed', 'rooted', 'lassoed']) if (f.brain[k]) out.push(k);
  return out;
}

registerTrackers({
  bossNoSlices: ['Beat a boss without losing a slice', {
    bossDown: (e) => !e.mini && e.slicesLost === 0,
  }],
  fastWave: ['Clear a wave in under 8 seconds', {
    waveClear: (e) => !e.boss && e.secs < 8,
  }],
  gullStreak: ['Deal with 10 Golden Seagulls in a row without missing one', {
    // the streak carries across runs; a gull that gets away starts it again
    eventDone: (e) => e.id === 'seagull',
    eventMissed: (e) => {
      if (e.id === 'seagull' && (save.goals.gullStreak ?? 0) < 10) save.goals.gullStreak = 0;
    },
  }],
  lastMoment: ['Smack feet in the last 0.3 seconds before they stomp', {
    hit: (e) => e.lastMoment,
  }],
  ironheelUnstunned: ['Beat the Iron Heel without your peel ever being stunned', {
    bossDown: (e) => e.foot.type.id === 'ironheel' && !e.peelStunned,
  }],
  shieldBlocks: ['Block stomps with shields', {
    stomp: (e) => e.blocked === 'shield',
  }],
  bulkWave: ['Lose 5 slices in one wave and still clear it', {
    waveClear: (e) => e.slicesLost >= 5,
  }],
  highWave: ['Clear a wave without a single foot reaching the bottom half of the screen', {
    waveStart: (_e, c) => {
      c.st.low = false;
    },
    tick: (e, c) => {
      if (e.feet.some((f) => f.alive && !f.isBossLike && f.y > 540)) c.st.low = true;
    },
    waveClear: (e, c) => !e.boss && !c.st.low,
  }],
  tripleHits: ['Hit 3 feet with one smack', {
    smack: (e) => e.hits >= 3,
  }],
  comeback: ['Come back from one pizza left to win the run', {
    tick: (_e, c) => {
      if (c.run.pizzasAlive === 1) c.st.one = true;
    },
    runEnd: (e, c) => e.victory && !!c.st.one,
  }],
  rainyKill: ['Beat Rainy Ray while his downpour is falling (he’s hovering over his pizza)', {
    kill: (e) => e.foot.type.id === 'rainy' && e.foot.state === 'hover',
  }],
  // the old Act 2 (waves 31–60), which is Acts 4 to 6 since the journey went to 10-wave acts
  act2Run: ['Clear waves 31–60 (Acts 4 to 6) in one run', {
    waveClear: (e, c) => c.run.wave === actWaves(6)[1] && e.boss && c.run.firstWave <= actWaves(4)[0],
  }],
  fiveStatuses: ['Have 5 different status effects on feet at once', {
    tick: (e, c) => {
      if (c.st.done) return;
      const set = new Set<string>();
      for (const f of e.feet) if (f.alive) for (const s of statusesOf(f, e.now)) set.add(s);
      if (set.size >= 5) {
        c.st.done = true;
        return true;
      }
    },
  }],
  quickMini: ['Beat a mini-boss in 25 smacks or fewer', {
    bossDown: (e) => e.mini && e.smacks <= 25,
  }],
  cleanCellar: ['Clear a Haunted Cellar wave without missing a smack', {
    waveStart: (_e, c) => {
      c.st.miss = false;
    },
    smack: (e, c) => {
      if (e.hits === 0) c.st.miss = true;
    },
    waveClear: (_e, c) => c.run.location === 'cellar' && !c.st.miss,
  }],
  pizzasLost: ['Lose pizzas', {
    pizzaLost: () => true,
  }],
  hotSpace: ['Clear Orbital Pizzeria on Hot (or hotter)', {
    waveClear: (e, c) => e.boss && STAGES[Math.floor((waveInJourney(c.run.wave) - 1) / WAVES_PER_STAGE)]?.boss === 'cosmiccroc' && HIGH.includes(c.run.heat),
  }],
  fiveThroughStage: ['Keep 5 pizzas alive through a whole stage', {
    waveStart: (_e, c) => {
      // a stage starts on waves 1, 6, 11 …
      if ((c.run.wave - 1) % 5 === 0) {
        c.st.ok = c.run.pizzasAlive >= 5;
        c.st.from = c.run.wave;
      }
    },
    pizzaLost: (_e, c) => {
      c.st.ok = false;
    },
    waveClear: (e, c) => e.stageEnd && !!c.st.ok && c.run.pizzasAlive >= 5 && c.st.from === c.run.wave - 4,
  }],
  crocNoSlices: ['Beat the Cosmic Croc without losing a slice', {
    bossDown: (e) => e.foot.type.id === 'cosmiccroc' && e.slicesLost === 0,
  }],
  chainBoss: ['Beat a boss with 3 chain-lightning toppings', {
    bossDown: (e, c) => !e.mini && c.run.chainToppings >= 3,
  }],
  // counted by HeroTracker.tipsEarned()
  tipsRun: ['Earn 5,000 tips in one run', {}],
  knockTop: ['Knock feet off the top of the screen', {
    knockedTop: () => true,
  }],
  edges: ['Smack feet at both screen edges within 1 second', {
    hit: (e, c) => {
      const t = performance.now() / 1000;
      if (e.x < 320) c.st.l = t;
      else if (e.x > 1600) c.st.r = t;
      else return;
      const l = Number(c.st.l ?? -9);
      const r = Number(c.st.r ?? -9);
      if (Math.abs(l - r) <= 1) {
        c.st.l = -9;
        c.st.r = -9;
        return true;
      }
    },
  }],
  chainZaps: ['Zap feet with chain lightning', {
    chainHit: () => true,
  }],
  beachUntouched: ['Clear a wave at Shack Attack Beach Bar without a foot ever touching a pizza', {
    waveStart: (_e, c) => {
      c.st.touched = false;
    },
    stomp: (_e, c) => {
      c.st.touched = true;
    },
    waveClear: (_e, c) => c.run.location === 'beach' && !c.st.touched,
  }],
  fastBoss: ['Beat a boss in under 60 seconds', {
    bossDown: (e) => !e.mini && e.secs < 60,
  }],
  threeBossesNoLoss: ['Beat 3 bosses in one run without losing a pizza', {
    bossDown: (e, c) => {
      if (e.mini || c.st.done) return;
      if (c.run.bosses >= 3 && c.run.pizzasLost === 0) {
        c.st.done = true;
        return true;
      }
    },
  }],
  killStreak: ['Defeat 20 feet in a row without missing a smack', {
    smack: (e, c) => {
      if (e.hits === 0) c.st.n = 0;
    },
    kill: (_e, c) => {
      const n = Number(c.st.n ?? 0) + 1;
      c.st.n = n;
      if (n === 20) return true;
    },
  }],
  gambles: ['Win 3 shop gambles in one run (a reroll that deals an epic or legendary topping)', {
    reroll: (e, c) => {
      if (!e.rarities.some((r) => r === 'epic' || r === 'legendary')) return;
      const n = Number(c.st.n ?? 0) + 1;
      c.st.n = n;
      if (n === 3) return true;
    },
  }],
  frozenAtOnce: ['Freeze 8 feet at once', {
    tick: (e, c) => {
      if (c.st.done || e.feet.filter(FROZEN).length < 8) return;
      c.st.done = true;
      return true;
    },
  }],
  burningAtOnce: ['Have 6 feet burning at the same time', {
    tick: (e, c) => {
      if (c.st.done || e.feet.filter(BURNING).length < 6) return;
      c.st.done = true;
      return true;
    },
  }],
  daylightRun: ['Play a run that starts and ends in daylight (your local time)', {
    runStart: (_e, c) => {
      c.st.day = matches({ daylight: true });
    },
    runEnd: (_e, c) => !!c.st.day && matches({ daylight: true }) && c.run.wave >= 5,
  }],
});

/** The scene's side of goal tracking: one per run. */
export class HeroTracker {
  private st: Record<string, Record<string, number | boolean>> = {};
  private tipsRun = 0;
  constructor(
    private view: () => RunView,
    /** Something moved: check for unlocks (and toast them). */
    private changed: () => void,
  ) {}

  emit<E extends keyof HeroEvents>(ev: E, e: HeroEvents[E]): void {
    const run = this.view();
    let any = false;
    // a new run starts with clean per-run state (before its runStart hooks store anything)
    if (ev === 'runStart') this.st = {};
    for (const [key, t] of Object.entries(TRACKERS)) {
      const fn = t[ev] as ((e: HeroEvents[E], c: TrackCtx) => number | boolean | void) | undefined;
      if (!fn) continue;
      const st = (this.st[key] ??= {});
      const r = fn(e, { st, run });
      if (!r) continue;
      const n = r === true ? 1 : r;
      save.goals[key] = (save.goals[key] ?? 0) + n;
      // timed goals count only what's done at their time
      for (const g of timedTracks()) {
        if (g.key !== key || !g.when || !matches(g.when)) continue;
        const k = `${key}@${whenKey(g.when)}`;
        save.goals[k] = (save.goals[k] ?? 0) + n;
      }
      any = true;
    }
    if (ev === 'runStart' || ev === 'waveClear') any = this.checkTime() || any;
    if (ev === 'waveClear') any = this.partner(run.peel) || any;
    if (any) {
      persist();
      this.changed();
    }
  }

  /** Tips earned this run (the scene sums them as they come in). */
  tipsEarned(n: number): void {
    if (n <= 0) return;
    this.tipsRun += n;
    if (this.tipsRun >= 5000 && !(save.goals.tipsRun > 0)) {
      save.goals.tipsRun = 1;
      persist();
      this.changed();
    }
  }

  private checkTime(): boolean {
    let any = false;
    for (const g of timeGoals()) {
      if (goalCount(`time:${g.key}`) > 0 || !matches(g.when)) continue;
      save.goals[`time:${g.key}`] = 1;
      any = true;
    }
    return any;
  }

  private partner(peel: string): boolean {
    if (!GOALS.some((e) => e.goal.kind === 'partner' && e.goal.peel === peel) || !owns(peel)) return false;
    save.goals[`partner:${peel}`] = (save.goals[`partner:${peel}`] ?? 0) + 1;
    return true;
  }
}
