// Data the between-wave shop renders. The game scene owns the state; the shop just draws it and
// calls back.

import type { UpgradeKind, Rarity } from '../data/upgrades';
import type { PizzaRarity } from '../data/pizzaRarity';

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
  /** Exclusive Menu's guaranteed Epic-or-better card (a reroll gives it up). */
  exclusive?: boolean;
  sold: boolean;
}

export interface ShopPizza {
  id: string;
  name: string;
  perk: string;
  /** What a growing perk is worth right now (Peel Collector: +6% damage, from 64 peels owned). */
  now?: { total: string; why: string } | null;
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
  /** Its own Reheat button (null when freshness is off for the run; `need` false when it's already fully fresh). */
  reheat: { cost: number; can: boolean; need: boolean } | null;
  /** A dead pizza's Rebake (its oven-door overlay; null when it isn't dead, or on Inferno). */
  rebake: { cost: number; can: boolean } | null;
  /** Its tier: its tile's frame. */
  rarity: PizzaRarity;
  /** Its own Heal +2 button (`need` false when it has every slice). */
  heal: { cost: number; can: boolean; need: boolean };
  /** This pizza never goes stale (Pumpkin Spice): its freshness shows as ∞. */
  neverStale: boolean;
  /** Freshness is on for the run (off on Mild: no freshness row on any tile). */
  freshness: boolean;
}

export interface ShopOffer {
  id: string;
  name: string;
  perk: string;
  /** The price now (free or half price at last pizza standing), and the usual one. */
  cost: number;
  fullCost: number;
  kind: 'pizza' | 'special' | 'enhanced';
  /** Its tier: its card's frame. */
  rarity: PizzaRarity;
  /** A special that's a Pizzeria pizza (Common or Rare), dealt here now and then. */
  fromPizzeria?: boolean;
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
  /** Your Table's reorder mode: paid for once a shop (cost), then free there; on while it's open. */
  reorder: { cost: number; paid: boolean; on: boolean; can: boolean };
  table: ShopPizza[];
  tableFull: boolean;
  offers: ShopOffer[];
  heal: { cost: number; can: boolean };
  /** Pizza Slots: in the counter's third slot when no Chef's Special turned up. One pull a shop; only three of a
   *  kind pays. `result` is the last pull (fresh: it was just pulled, so the reels spin). */
  slots: { cost: number; can: boolean; crustCost: number; canCrusts: boolean; used: boolean; result: SlotsResult | null; pays: [SlotSymbol, string][] } | null;
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

export type SlotSymbol = 'tips' | 'slices' | 'slam' | 'topping' | 'epic' | 'crust' | 'chef';
export interface SlotsResult {
  reels: [SlotSymbol, SlotSymbol, SlotSymbol];
  win: boolean;
  /** What it paid, in words ('' on a miss). */
  prize: string;
  fresh: boolean;
  /** A topping won: keep it or sell it (half its usual price), until chosen. */
  offer?: { id: string; name: string; rarity: string; sell: number; taken?: 'add' | 'sell' };
}

export interface ShopActions {
  /** Pull Pizza Slots, paying in tips or Golden Crusts. */
  slots(pay: 'tips' | 'crusts'): void;
  /** A topping won on Pizza Slots: keep it, or sell it for half its usual price. */
  slotsTake(choice: 'add' | 'sell'): void;
  buy(cardId: string): void;
  reroll(): void;
  heal(): void;
  /** Rebake the dead pizza at this table index. */
  rebake(index: number): void;
  reheat(index: number): void;
  /** Heal one pizza +2 slices. */
  healPizza(index: number): void;
  /** Move the pizza at one table place to another (in reorder mode): the table in play follows. */
  movePizza(from: number, to: number): void;
  /** Open (paying once a shop) or close the reorder mode. */
  reorder(on: boolean): void;
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
