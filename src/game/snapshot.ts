// A saved run, rewritten after every shop action and when Next Wave is pressed (a reload mid-wave
// goes back to that shop, as it was left). The same shape drives Continue run,
// Act 2 starts and dev scenario starts.

import type { HeatId } from '../data/difficulty';
import type { KitState } from './kitState';

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
  /** Full coin price (last pizza standing discounts it in the shop). */
  cost: number;
  /** Old saves: a rented Chef's Special. */
  trial?: boolean;
  /** pizza: one you own · special: a locked pizza, unlocked for good when bought · enhanced: one you own, arriving enhanced. */
  kind?: 'pizza' | 'special' | 'enhanced';
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
  /** Endless run (older saves: ask at wave 60, as before). */
  endless?: boolean;
  /** Endless+ (Act 10): the shuffle's seed, 0 when off. */
  endlessPlus?: number;
  /** Where the current act began (ACT COMPLETE's act stats), and whether the run was saved on that screen. */
  actFrom?: { wave: number; elapsed: number; feet: number; slices: number } | null;
  actPending?: boolean;
  secondChances: number;
  /** Old saves only: renting is gone (buying a Chef's Special unlocks it). */
  rentedSpecial?: string | null;
  enhanceUses?: number;
  bought?: string[];
  unlockWhy?: Record<string, string>;
  milestonesHit?: string[];
  startPeels?: string[];
  goalStart?: Record<string, number>;
  /** The event, mixed, shop and wildcard toppings' run state (crumbs, once-per-run uses, this shop's deals). */
  kit?: KitState;
  pizzas: PizzaSnap[];
  counter: CounterSnap[];
  bossBonusGiven: boolean;
  /** The open shop, so a reload doesn't reroll it or undo purchases. */
  shop?: { cards: string[]; sold: string[]; free: string | null; bossReward: boolean; freeRerolls: number; goldenBought?: 'rebake' | 'enhance' | 'reroll' | 'topping' | 'fresh'; lastStand?: boolean; lastStandDone?: boolean; boughtOut?: boolean };
}
