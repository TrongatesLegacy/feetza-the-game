// Persistent settings + meta progression, stored in localStorage (wrapped so private mode still works).
// Version 2 (Feetza 2.0) migrates v1 saves on load: nothing is wiped.

import { STORAGE_KEY } from '../config';
import type { HeatId } from '../data/difficulty';
import { META_COSTS_V1 } from '../data/meta';
import type { RunSnapshot } from '../game/snapshot';

export type AimScheme = 'free' | 'lane';
export type PromptStyle = 'auto' | 'xbox' | 'playstation' | 'switch';
export type ColorBlind = 'off' | 'redgreen' | 'blueyellow';

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
  tutorialDone: boolean;
  milestones: string[];
  // Feetza 2.0
  heat: HeatId;
  /** Best score and wave per heat (Act 1 starts) and for Act 2 starts. */
  best: Partial<Record<HeatId, Best>>;
  bestAct2: Partial<Record<HeatId, Best>>;
  /** Heats on which wave 30 has been beaten (unlocks the next heat and Act 2 starts on it). */
  act1Cleared: HeatId[];
  /** Pre-2.0 best scores kept as a record when a veteran takes a fresh start. */
  oldVersionBest: Best | null;
  seenIntros: string[];
  seenEvents: string[];
  /** Set for upgraded v1 saves until the welcome card has been answered. */
  welcomePending: boolean;
  /** Crusts granted on migration for bosses already beaten (shown on the welcome card). */
  welcomeBonus: number;
  run: RunSnapshot | null;
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
  traitIcons: true,
  reducedMotion: false,
  colorBlind: 'off',
  slowNewCards: true,
  aimScheme: 'free',
  stickSensitivity: 0.6,
  aimAssist: 0.4,
  vibration: true,
  prompts: 'auto',
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
  tutorialDone: false,
  milestones: [],
  heat: 'regular',
  best: {},
  bestAct2: {},
  act1Cleared: [],
  oldVersionBest: null,
  seenIntros: [],
  seenEvents: [],
  welcomePending: false,
  welcomeBonus: 0,
  run: null,
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
  return s;
}

function load(): SaveData {
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

/** Cheapest pizza not yet unlocked (or null if everything is unlocked). */
export function nextLockedPizza<T extends { id: string; cost: number }>(all: T[]): T | null {
  return [...all].filter((p) => !save.unlockedPizzas.includes(p.id)).sort((a, b) => a.cost - b.cost)[0] ?? null;
}
