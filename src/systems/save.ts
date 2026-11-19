// Persistent settings + meta progression, stored in localStorage (wrapped so private mode still works).

import { STORAGE_KEY } from '../config';

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
}

export interface SaveData {
  settings: Settings;
  crusts: number; // meta currency
  meta: Record<string, number>; // meta upgrade levels
  unlockedPizzas: string[];
  seenFeet: string[];
  bestScore: number;
  bestWave: number;
  runs: number;
  totalFeet: number;
  bossesBeaten: string[];
  tutorialDone: boolean;
}

const DEFAULTS: SaveData = {
  settings: {
    master: 0.8,
    music: 0.55,
    sfx: 0.8,
    ambience: 0.45,
    muted: false,
    screenShake: true,
    damageNumbers: true,
    flashes: true,
    showFps: false,
  },
  crusts: 0,
  meta: {},
  unlockedPizzas: ['margherita', 'pepperoni', 'funghi'],
  seenFeet: [],
  bestScore: 0,
  bestWave: 0,
  runs: 0,
  totalFeet: 0,
  bossesBeaten: [],
  tutorialDone: false,
};

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function load(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return clone(DEFAULTS);
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return {
      ...clone(DEFAULTS),
      ...parsed,
      settings: { ...DEFAULTS.settings, ...(parsed.settings ?? {}) },
      meta: { ...(parsed.meta ?? {}) },
    };
  } catch {
    return clone(DEFAULTS);
  }
}

export const save: SaveData = load();

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

export function resetProgress(): void {
  const settings = save.settings;
  Object.assign(save, clone(DEFAULTS), { settings });
  persist();
}
