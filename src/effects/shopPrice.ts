// Effect.ShopPrice: a price rule of the shop's that a topping turns on (docs/effects-plan.md, step 3). The shop's sums
// (src/game/shopDeals.ts: toppingDiscount, rerollPrice, counterPrice) ask the run for the rule (Run.shopPrice: how
// much off, its cap, the level it's held at), never for the topping.
//
//   Effect.ShopPrice(Price.HappyHour, Unit.Percent(25))                          Happy Hour
//   Effect.ShopPrice(Price.Haggle, Unit.Percent(10), { cap: Unit.Percent(30) })   Haggler: 10% a card, up to 30%
//
// Its card text is the topping's own (quiet).

import { effectKind } from './kind';
import { Tag, type TagId } from './tags';
import type { Percent } from './units';

/** The shop's price rules. */
export const Price = {
  /** Every 5th wave's shop (the boss loot): `off` every topping card. */
  HappyHour: 'happyHour',
  /** The 3rd topping card bought in a shop: `off` for each level. */
  BulkBuy: 'bulkBuy',
  /** Each topping bought in a shop takes `off` more off the next, up to `cap`. */
  Haggle: 'haggle',
  /** Rerolls and counter pizzas: `off`. */
  Owner: 'owner',
  /** A Chef's Special on the counter: `off`. */
  ChefsSpecial: 'chefsSpecial',
} as const;
export type PriceId = (typeof Price)[keyof typeof Price];

const WORDS: Record<PriceId, string> = {
  happyHour: 'every 5th wave’s shop: toppings',
  bulkBuy: 'the 3rd topping bought in a shop (each level)',
  haggle: 'each topping bought takes this off the next',
  owner: 'rerolls and counter pizzas',
  chefsSpecial: 'Chef’s Specials on the counter',
};

export interface ShopPriceData {
  readonly kind: 'shopPrice';
  rule: PriceId;
  off: Percent;
  cap?: Percent;
}

const make = (rule: PriceId, off: Percent, o: { cap?: Percent } = {}): ShopPriceData => ({ kind: 'shopPrice', rule, off, ...o });

export const ShopPriceEffect = effectKind('shopPrice', make, {
  // (read by the shop through Run.shopPrice; nothing to apply)
  apply: () => {},
  describe: (e) => `${Math.round(e.off * 100)}% off ${WORDS[e.rule]}${e.cap !== undefined ? ` (up to ${Math.round(e.cap * 100)}%)` : ''}`,
  scale: (e) => e,
  tags: (e): TagId[] => [Tag.Shop(e.rule)],
  quiet: true,
});
