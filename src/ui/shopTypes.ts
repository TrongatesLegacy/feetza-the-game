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
  free: boolean;
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
}

export interface ShopOffer {
  id: string;
  name: string;
  perk: string;
  cost: number;
  trial: boolean;
}

export interface GoldenItem {
  id: 'rebake' | 'keep' | 'reroll' | 'topping' | 'fresh';
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
  reheat: { cost: number; can: boolean; shown: boolean };
  golden: GoldenItem[];
  progress: { runCrusts: number; bank: number; next: { name: string; cost: number } | null };
}

export interface ShopActions {
  buy(cardId: string): void;
  reroll(): void;
  heal(): void;
  rebake(): void;
  reheat(): void;
  buyPizza(id: string): void;
  golden(id: GoldenItem['id']): void;
  next(): void;
  /** Open the pause menu (settings, save and leave, quit). */
  pause(): void;
}
