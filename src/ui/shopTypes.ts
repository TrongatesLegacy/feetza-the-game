// Data the between-wave shop renders. The game scene owns the state; the shop just draws it and
// calls back.

import type { UpgradeKind, Rarity } from '../data/upgrades';

export interface ShopCard {
  id: string;
  name: string;
  icon: string;
  rarity: Rarity;
  kind: UpgradeKind;
  desc: string;
  /** Trade-off toppings: the catch. */
  downside?: string;
  lvl: string;
  price: number;
  /** Its usual price, when a shop topping makes it cheaper (shown struck through). */
  was?: number;
  free: boolean;
  /** A ribbon on the card: a sale (Clearance Rack, Happy Hour…). FREE cards always get one. */
  tag?: { text: string; kind: 'sale' };
  sold: boolean;
}

export interface ShopPizza {
  id: string;
  name: string;
  perk: string;
  slices: number;
  max: number;
  fresh: number;
  maxFresh: number;
  freshOn: boolean;
  stale: boolean;
  dead: boolean;
  /** Enhanced this run: perk is the stronger text, basePerk the plain one (shown struck through). */
  enhanced: boolean;
  basePerk: string;
  /** Its perk once enhanced (the enhance picker's preview). */
  enhancedPerk: string;
  /** Its own Reheat button (hidden when freshness is off or it's fully fresh). */
  reheat: { cost: number; can: boolean } | null;
}

export interface ShopOffer {
  id: string;
  name: string;
  perk: string;
  /** The price now (free or half price at last pizza standing), and the usual one. */
  cost: number;
  fullCost: number;
  kind: 'pizza' | 'special' | 'enhanced';
  /** Enhanced offers: the plain perk text, struck through next to perk. */
  basePerk?: string;
}

export interface GoldenItem {
  id: 'rebake' | 'enhance' | 'reroll' | 'topping' | 'fresh';
  name: string;
  desc: string;
  cost: number;
  available: boolean;
  note: string;
}

export interface ShopState {
  title: string;
  sub: string;
  wave: number;
  coins: number;
  crusts: number;
  cards: ShopCard[];
  rerollLabel: string;
  canReroll: boolean;
  table: ShopPizza[];
  tableFull: boolean;
  offers: ShopOffer[];
  heal: { cost: number; can: boolean };
  rebake: { cost: number; can: boolean; shown: boolean };
  /** One pizza left: a free pizza from the counter, and Next Wave waits until one is added. */
  lastStand: boolean;
  /** Toppings you own, for the Your Toppings window. */
  yours: YourTopping[];
  golden: GoldenItem[];
  progress: { runCrusts: number; bank: number; next: { name: string; cost: number } | null };
}

export interface YourTopping {
  id: string;
  lvl: number;
  /** Consumables: bought and waiting to trigger. */
  armed: boolean;
  /** Consumables used up: the wave they're back in the shop from. */
  back: number | null;
  /** Its level cap this run (Infinite Oven raises it). */
  max?: number;
}

export interface ShopActions {
  buy(cardId: string): void;
  reroll(): void;
  heal(): void;
  rebake(): void;
  reheat(index: number): void;
  /** Open the Your Toppings window. */
  toppings(): void;
  buyPizza(id: string): void;
  golden(id: GoldenItem['id']): void;
  next(): void;
  /** Open the pause menu (settings, save and leave, quit). */
  pause(): void;
}

/** The "Unlocked this run" screen after every run. */
export interface RunSummary {
  victory: boolean;
  crusts: number;
  pizzas: { id: string; name: string; why: string }[];
  peels: { id: string; name: string; shiny: boolean; how: string }[];
  milestones: { name: string; pizza?: string }[];
  /** Locked goals that moved closer this run (closest to done first). */
  goals: { kind: 'peel' | 'pizza'; id: string; name: string; have: number; need: number }[];
}
