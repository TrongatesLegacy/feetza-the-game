// A saved run, rewritten after every shop action and when Next Wave is pressed (a reload mid-wave
// goes back to that shop, as it was left). The same shape drives Continue run,
// Act 2 starts and dev scenario starts.

import type { HeatId } from '../data/difficulty';

export interface PizzaSnap {
  id: string;
  slices: number;
  max: number;
  fresh: number;
  dead: boolean;
  /** Per-pizza flags (Carbonara rise, Pizza Fritta heal, Quattro Stagioni season…). */
  flags?: Record<string, number | boolean>;
}

export interface CounterSnap {
  id: string;
  name: string;
  perk: string;
  cost: number;
  trial: boolean;
}

export interface RunSnapshot {
  version: 1;
  heat: HeatId;
  act2Start: boolean;
  /** Last wave cleared; the run resumes in that wave's shop. */
  wave: number;
  score: number;
  coins: number;
  owned: Record<string, number>;
  /** Consumable id → first wave it may be offered again. */
  cooldowns: Record<string, number>;
  /** Consumables bought and waiting to trigger (Pizza Angel, Emergency Dough, Leftovers Box). */
  armed: string[];
  super: number;
  rerollCost: number;
  healCost: number;
  reviveCost: number;
  reheatUses: number;
  bestCombo: number;
  feetSmacked: number;
  bossesBeaten: string[];
  firstKills: number;
  slicesLost: number;
  pizzasBought: number;
  eventCrusts: number;
  /** Crusts already paid into the bank this run. */
  bankedCrusts?: number;
  /** The peel this run is played with, and whether its ability replaces the Peel Slam (always, unless it's the Classic). */
  peel?: string;
  ability?: boolean;
  goldenUsed: Record<string, number>;
  newUnlocks: string[];
  elapsed: number;
  secondChances: number;
  rentedSpecial: string | null;
  pizzas: PizzaSnap[];
  counter: CounterSnap[];
  bossBonusGiven: boolean;
  /** The open shop, so a reload doesn't reroll it or undo purchases. */
  shop?: { cards: string[]; sold: string[]; free: string | null; bossReward: boolean; freeRerolls: number; goldenBought?: 'rebake' | 'keep' | 'reroll' | 'topping' | 'fresh' };
}
