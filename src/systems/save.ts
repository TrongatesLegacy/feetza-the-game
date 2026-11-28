// Persistent settings + meta progression, stored in localStorage (wrapped so private mode still works).
// Version 2 (Feetza 2.0) migrates v1 saves on load: nothing is wiped.

import { STORAGE_KEY } from '../config';
import type { HeatId } from '../data/difficulty';
import { META_COSTS_V1 } from '../data/meta';
import { STAGES, STAGES_PER_ACT } from '../data/stages';
import type { RunSnapshot } from '../game/snapshot';

/** In `save.seenIntros`: the player turned boss phase cards off (src/game/phaseCards.ts). Reset intro cards in
 *  Settings clears it, along with every phase seen. */
export const PHASE_CARDS_OFF = 'phasecards-off';

/** Phase cards off for this page only, never saved: the sim, the bot and dev starts with `intros: false`. */
export const phaseCardsMuted = { on: false };

export type AimScheme = 'free' | 'lane';
export type PromptStyle = 'auto' | 'xbox' | 'playstation' | 'switch';
export type ColorBlind = 'off' | 'redgreen' | 'blueyellow';
/** Smack sounds: each peel's own (src/game/smacks.ts), the classic slap for every peel, or none. */
export type PeelSmacks = 'peel' | 'classic' | 'off';

export interface Settings {
  master: number;
  music: number;
  sfx: number;
  ambience: number;
  muted: boolean;
  screenShake: boolean;
  damageNumbers: boolean;
  flashes: boolean;
  showFps: boolean;
  /** Show the run timer under the wave in the HUD. */
  showTimer: boolean;
  // Feetza 2.0
  traitIcons: boolean;
  reducedMotion: boolean;
  colorBlind: ColorBlind;
  slowNewCards: boolean;
  aimScheme: AimScheme;
  stickSensitivity: number;
  aimAssist: number;
  vibration: boolean;
  prompts: PromptStyle;
  peelSmacks: PeelSmacks;
  // graphics (src/systems/graphics.ts)
  /** The redrawn feet's live animation (off: their still art). */
  animFeet: boolean;
  /** The stages' ambient animation. */
  animBackdrops: boolean;
  /** The peels' animation. */
  animPeels: boolean;
}

export interface Best {
  score: number;
  wave: number;
}

export interface SaveData {
  version: number;
  settings: Settings;
  crusts: number; // meta currency
  meta: Record<string, number>; // meta upgrade levels
  /** Crusts spent on each Pizzeria upgrade, refunded in full by Reset. */
  metaSpent: Record<string, number>;
  unlockedPizzas: string[];
  seenFeet: string[];
  bestScore: number;
  bestWave: number;
  runs: number;
  totalFeet: number;
  bossesBeaten: string[];
  /** Bosses and mini-bosses beaten on Hot or hotter (their peels need it). */
  bossesBeatenHot: string[];
  tutorialDone: boolean;
  milestones: string[];
  // Feetza 2.0
  heat: HeatId;
  /** Best score and wave per heat (runs from wave 1). */
  best: Partial<Record<HeatId, Best>>;
  /** Old saves only: bests from the retired wave-31 starts. Kept as a record; nothing writes it now. */
  bestAct2: Partial<Record<HeatId, Best>>;
  /** Heats on which wave 30 has been beaten (unlocks the next heat). Named for when wave 30 ended Act 1. */
  act1Cleared: HeatId[];
  /** Acts completed (their last boss beaten), on any heat: each unlocks its act peel. */
  actsCleared: number[];
  /** Pre-2.0 best scores kept as a record when a veteran takes a fresh start. */
  oldVersionBest: Best | null;
  /** Intro cards seen (ids), boss phase cards seen (`phase:<boss>:<n>`) and PHASE_CARDS_OFF. */
  seenIntros: string[];
  seenEvents: string[];
  /** Set for upgraded v1 saves until the welcome card has been answered. */
  welcomePending: boolean;
  /** Crusts granted on migration for bosses already beaten (shown on the welcome card). */
  welcomeBonus: number;
  run: RunSnapshot | null;
  // Peel skins and achievements
  /** Feet defeated, per foot type. */
  kills: Record<string, number>;
  /** Zombified feet defeated, per foot type (the Zombie Loafer's zombies and the zombie peels' own): their zombie peels. */
  zombieKills: Record<string, number>;
  /** Waves cleared in each stage (location waves and its boss wave). */
  stageWaves: Record<string, number>;
  /** Wave events dealt with, per event. */
  eventsDone: Record<string, number>;
  /** Cleared waves each pizza was on the table (alive) for. */
  pizzaWaves: Record<string, number>;
  /** Best wave cleared with each peel equipped (prestige goals). */
  peelBest: Record<string, number>;
  /** Unlocked peel ids (the Classic Peel is always owned). */
  peels: string[];
  /** Equipped peel (its ability, and its look unless a look is worn). */
  peel: string;
  /** Peel worn as a look only, over the equipped peel's own ('' = match the equipped peel). */
  skin: string;
  /** The last run-length choice on the new-run screen: end the run at the journey's end, or keep going (endless). */
  endless: boolean;
  /** Peels unlocked but not yet looked at in the locker. */
  peelsNew: string[];
  // Pizza unlock routes and the toppings collection
  /** Toppings dealt in a shop at least once (the Pizzeria's Toppings tab). */
  seenToppings: string[];
  /** Runs each topping was bought in. */
  toppingRuns: Record<string, number>;
  /** Toppings first seen since the Toppings tab was last opened. */
  toppingsNew: string[];
  /** Pizzas unlocked but not yet looked at in the Pizzeria. */
  pizzasNew: string[];
  /** Times each locked pizza has turned up as a Chef's Special. */
  specialSeen: Record<string, number>;
  // ——— Act 10 · Finale ———
  /** Beat wave 100 (the Sole Proprietor Unbound): the Pizza Legend title and gold frame on the title screen. */
  legend: boolean;
  /** Endless+ is unlocked (by the same win) and was the last run-length choice. */
  endlessPlus: boolean;
  endlessPlusPick: boolean;
  /** Rare Finds that have turned up on the new-run screen (shown in the Pizzeria from then on). */
  rareSeen: string[];
  /** Lineup shuffles bought since the last run started (each costs more Golden Crusts; back to the first price when a run starts). */
  shuffles: number;
  /** A Rare Find played this run on trial (not bought): offered to keep when the run ends. */
  rareTrial: string | null;
  /** Milestone records for the phase 3 pizzas: bestCombo, perfectBest, fastWave (best clear in seconds), nightRuns, untouched (1 once done). */
  pizzaGoals: Record<string, number>;
  /** Hero and god peel goals (src/game/heroGoals.ts): counters, bests and flags by key. */
  goals: Record<string, number>;
}

const DEFAULT_SETTINGS: Settings = {
  master: 0.8,
  music: 0.55,
  sfx: 0.8,
  ambience: 0.45,
  muted: false,
  screenShake: true,
  damageNumbers: true,
  flashes: true,
  showFps: false,
  showTimer: true,
  traitIcons: true,
  reducedMotion: false,
  colorBlind: 'off',
  slowNewCards: true,
  aimScheme: 'free',
  stickSensitivity: 0.6,
  aimAssist: 0.4,
  vibration: true,
  prompts: 'auto',
  peelSmacks: 'peel',
  animFeet: true,
  animBackdrops: true,
  animPeels: true,
};

const DEFAULTS: SaveData = {
  version: 2,
  settings: DEFAULT_SETTINGS,
  crusts: 0,
  meta: {},
  metaSpent: {},
  unlockedPizzas: ['margherita', 'pepperoni', 'funghi'],
  seenFeet: [],
  bestScore: 0,
  bestWave: 0,
  runs: 0,
  totalFeet: 0,
  bossesBeaten: [],
  bossesBeatenHot: [],
  tutorialDone: false,
  milestones: [],
  heat: 'regular',
  best: {},
  bestAct2: {},
  act1Cleared: [],
  actsCleared: [],
  oldVersionBest: null,
  seenIntros: [],
  seenEvents: [],
  welcomePending: false,
  welcomeBonus: 0,
  run: null,
  kills: {},
  zombieKills: {},
  stageWaves: {},
  eventsDone: {},
  pizzaWaves: {},
  peelBest: {},
  peels: [],
  peel: 'classic',
  skin: '',
  endless: false,
  peelsNew: [],
  seenToppings: [],
  toppingRuns: {},
  toppingsNew: [],
  pizzasNew: [],
  specialSeen: {},
  rareSeen: [],
  shuffles: 0,
  rareTrial: null,
  pizzaGoals: {},
  goals: {},
  legend: false,
  endlessPlus: false,
  endlessPlusPick: false,
};

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/** v1 → v2: keep everything, record what Pizzeria upgrades cost, move bests to Regular. */
export function migrate(parsed: Partial<SaveData>): SaveData {
  const s: SaveData = {
    ...clone(DEFAULTS),
    ...parsed,
    settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
    meta: { ...(parsed.meta ?? {}) },
  };
  if (!parsed.version || parsed.version < 2) {
    s.version = 2;
    s.metaSpent = {};
    for (const [id, lvl] of Object.entries(s.meta)) {
      const costs = META_COSTS_V1[id] ?? [];
      s.metaSpent[id] = costs.slice(0, lvl).reduce((a, b) => a + b, 0);
    }
    s.best = s.bestScore || s.bestWave ? { regular: { score: s.bestScore, wave: s.bestWave } } : {};
    // the first-kill bonus (20 crusts) for bosses already beaten, paid once
    s.welcomeBonus = s.bossesBeaten.length * 20;
    s.crusts += s.welcomeBonus;
    s.welcomePending = s.runs > 0 || s.crusts > 0;
    // the old "all 6 bosses" milestone is now "6 different bosses"
    s.milestones = s.milestones.map((m) => (m === 'allBosses' ? 'bosses6' : m));
    s.run = null;
  }
  // saves from before the Toppings tab: nothing was recorded, so only the run in progress counts
  if (!parsed.seenToppings && s.run) {
    const owned = Object.keys(s.run.owned ?? {});
    s.seenToppings = [...new Set([...owned, ...(s.run.armed ?? []), ...(s.run.shop?.cards ?? [])])];
    s.toppingRuns = Object.fromEntries([...new Set([...owned, ...(s.run.armed ?? [])])].map((id) => [id, 1]));
  }
  // saves from before acts: an act is done if the boss closing it was ever beaten (bosses only appear on their wave)
  if (!parsed.actsCleared) {
    s.actsCleared = [];
    for (let a = 1; a * STAGES_PER_ACT <= STAGES.length; a++) {
      const st = STAGES[a * STAGES_PER_ACT - 1];
      if (!st.dev && s.bossesBeaten.includes(st.boss)) s.actsCleared.push(a);
    }
  }
  // Rare Finds that used to be Chef's Specials (the pizza plan's route moves): one seen on the counter has turned up
  // already, so it isn't a mystery silhouette (idempotent, so it needs no version)
  for (const [id, n] of Object.entries(s.specialSeen ?? {})) if (n > 0 && !s.rareSeen.includes(id)) s.rareSeen.push(id);
  return s;
}

/** The balance sim (?sim) keeps its save in memory only. The browser's storage is shared by every tab of the page: a
 *  sim tab used to load whatever another tab had saved mid-run (its peel, what it had seen and unlocked), and the title
 *  screen picks its pizzas, its demo foot and the peel's sounds from the save, so a seeded run's start depended on
 *  which runs another tab happened to be playing. Every sim page starts from a new player's save. */
const SIM = !!import.meta.env?.DEV && typeof location !== 'undefined' && new URLSearchParams(location.search).has('sim');

function load(): SaveData {
  if (SIM) return clone(DEFAULTS);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return clone(DEFAULTS);
    return migrate(JSON.parse(raw) as Partial<SaveData>);
  } catch {
    return clone(DEFAULTS);
  }
}

export const save: SaveData = load();
persist();

type Listener = () => void;
const listeners = new Set<Listener>();

export function onSettingsChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function persist(): void {
  if (SIM) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {
    /* storage unavailable (private mode / quota) — keep playing */
  }
}

export function updateSettings(patch: Partial<Settings>): void {
  Object.assign(save.settings, patch);
  persist();
  listeners.forEach((fn) => fn());
}

export function markFootSeen(id: string): boolean {
  if (save.seenFeet.includes(id)) return false;
  save.seenFeet.push(id);
  persist();
  return true;
}

/** Wipe all progress but keep settings. */
export function resetProgress(): void {
  const settings = save.settings;
  Object.assign(save, clone(DEFAULTS), { settings });
  persist();
  listeners.forEach((fn) => fn());
}

/** Factory reset: progress and settings. */
export function resetEverything(): void {
  Object.assign(save, clone(DEFAULTS));
  persist();
  listeners.forEach((fn) => fn());
}

/** Refund every crust spent on Pizzeria upgrades and clear their levels. Returns the refund. */
export function resetMeta(): number {
  const refund = Object.values(save.metaSpent).reduce((a, b) => a + b, 0);
  save.crusts += refund;
  save.meta = {};
  save.metaSpent = {};
  persist();
  return refund;
}

export function metaRefundValue(): number {
  return Object.values(save.metaSpent).reduce((a, b) => a + b, 0);
}

/** Fresh start for a veteran: wipe progress, keep settings, keep old bests as a record. */
export function freshStart(): void {
  const old = { score: save.bestScore, wave: save.bestWave };
  resetProgress();
  save.oldVersionBest = old.score || old.wave ? old : null;
  persist();
}

export function bestFor(heat: HeatId, act2 = false): Best {
  return (act2 ? save.bestAct2 : save.best)[heat] ?? { score: 0, wave: 0 };
}

/** Cheapest pizza still to buy in the Pizzeria (or null if they're all unlocked). */
export function nextLockedPizza<T extends { id: string; cost: number; route: string }>(all: T[]): T | null {
  return [...all].filter((p) => p.route === 'pizzeria' && !save.unlockedPizzas.includes(p.id)).sort((a, b) => a.cost - b.cost)[0] ?? null;
}

/** Unlock a pizza for good. It carries a NEW badge in the Pizzeria until that's opened. */
export function unlockPizza(id: string): boolean {
  if (save.unlockedPizzas.includes(id)) return false;
  save.unlockedPizzas.push(id);
  if (!save.pizzasNew.includes(id)) save.pizzasNew.push(id);
  persist();
  return true;
}

/** Record toppings dealt in a shop. New ones get a NEW badge in the Toppings tab. */
export function markToppingsSeen(ids: string[]): void {
  let changed = false;
  for (const id of ids) {
    if (save.seenToppings.includes(id)) continue;
    save.seenToppings.push(id);
    save.toppingsNew.push(id);
    changed = true;
  }
  if (changed) persist();
}
