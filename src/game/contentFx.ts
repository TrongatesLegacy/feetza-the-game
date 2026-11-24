// Hooks for content that brings its own behaviour to the game loop, so new acts and feet live in new files:
// - an act's effect layer (weather and lighting that change wave by wave, print overlays, impact words), and
// - feet whose abilities need more than a trait (gangs, side entries, bombs) or a say over their own death.
// Modules in src/game/acts/ export `actFx` (keyed by act number) and/or `footFx` (keyed by foot id).
// The game scene calls these; each hook is optional.

import { actOf } from '../data/stages';
import type { Arena } from './arena';
import type { Foot } from './Foot';

export interface ActFx {
  /** A wave of this act is shown (it began, or a saved run resumed into it). n is the run's wave. */
  enter?(a: Arena, n: number): void;
  /** The run moved on to another act, or the scene is ending: remove what `enter` made. */
  leave?(a: Arena): void;
  /** The peel's ability was swapped mid-act (Peel Roulette, Shape-Shift): redo anything built on it. */
  abilityChanged?(a: Arena): void;
  /** Every frame, real time (also in the shop and between waves). */
  tick?(a: Arena, dt: number): void;
  /** Damage landed on a foot (after armour), from any source. */
  hit?(a: Arena, f: Foot, x: number, y: number, dealt: number, crit: boolean, source: string): void;
  /** A foot was defeated. */
  kill?(a: Arena, f: Foot): void;
}

export interface FootFx {
  /** Its first frame on the field. */
  spawn?(a: Arena, f: Foot): void;
  /** Every frame it's alive (game time). */
  tick?(a: Arena, f: Foot, dt: number): void;
  kill?(a: Arena, f: Foot): void;
  /** Damage landed on it (after armour), from any source. */
  hit?(a: Arena, f: Foot, dealt: number, source: string): void;
  /** Its parry turned a smack aside (the 'parry' trait). Return true if it played its own sound (then the stock
   * shield sound is skipped). */
  parry?(a: Arena, f: Foot): boolean;
  /** Return true to cancel a killing blow (the foot stays on 1 HP or whatever the hook sets). */
  spare?(a: Arena, f: Foot, source: string): boolean;
}

const mods = import.meta.glob<{ actFx?: Record<number, ActFx>; footFx?: Record<string, FootFx> }>('./acts/*.ts', { eager: true });
const ACTS: Record<number, ActFx> = {};
const FEET: Record<string, FootFx> = {};
for (const k of Object.keys(mods).sort()) {
  Object.assign(ACTS, mods[k].actFx ?? {});
  Object.assign(FEET, mods[k].footFx ?? {});
}

let current: number | null = null;
let arena: Arena | null = null;

export const contentFx = {
  /** A new scene (or none, when it shuts down): the last act's layer is dropped. */
  reset(a: Arena | null): void {
    if (current !== null && arena) ACTS[current]?.leave?.(arena);
    current = null;
    arena = a;
  },
  wave(a: Arena, n: number): void {
    const act = actOf(n);
    if (act !== current) {
      if (current !== null) ACTS[current]?.leave?.(a);
      current = act;
    }
    ACTS[act]?.enter?.(a, n);
  },
  abilityChanged(a: Arena): void {
    if (current !== null) ACTS[current]?.abilityChanged?.(a);
  },
  tick(a: Arena, dt: number): void {
    if (current !== null) ACTS[current]?.tick?.(a, dt);
  },
  hit(a: Arena, f: Foot, x: number, y: number, dealt: number, crit: boolean, source: string): void {
    if (current !== null) ACTS[current]?.hit?.(a, f, x, y, dealt, crit, source);
    FEET[f.type.id]?.hit?.(a, f, dealt, source);
  },
  parry(a: Arena, f: Foot): boolean {
    return FEET[f.type.id]?.parry?.(a, f) ?? false;
  },
  kill(a: Arena, f: Foot): void {
    if (current !== null) ACTS[current]?.kill?.(a, f);
    FEET[f.type.id]?.kill?.(a, f);
  },
  footTick(a: Arena, f: Foot, dt: number): void {
    const h = FEET[f.type.id];
    if (!h) return;
    if (!f.brain.fxSpawned) {
      f.brain.fxSpawned = true;
      h.spawn?.(a, f);
    }
    h.tick?.(a, f, dt);
  },
  spare(a: Arena, f: Foot, source: string): boolean {
    return FEET[f.type.id]?.spare?.(a, f, source) ?? false;
  },
};
