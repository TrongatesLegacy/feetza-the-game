// The shop toppings' sums (src/data/toppingsShop.ts): card counts, topping, reroll, counter and Golden
// Menu prices, and which items are free. Discounts stack additively and stop at 60% off.

import { kindOf, upgradePrice, type Upgrade } from '../data/upgrades';
import { DEAL_BLOCK } from './kitState';
import type { Run } from './Run';

export const MAX_DISCOUNT = 0.6;

const round5 = (n: number) => Math.round(n / 5) * 5;

/** Happy Hour: every 5th wave's shop (the boss loot). */
export function happyHour(run: Run): boolean {
  return run.level('happyhour') > 0 && run.wave > 0 && run.wave % 5 === 0;
}

/** Topping cards in a shop: a plain sum (Extra Shelf +1 a level, Premium Menu +2, Discount Bin −1, Exclusive Menu −2),
 *  never below 1. */
export function cardCount(run: Run, base: number): number {
  return Math.max(1, base + run.stats.cardDelta);
}

/** Every discount on this card right now (negative: a surcharge), capped at 60% off. */
export function toppingDiscount(run: Run, u: Upgrade): number {
  const st = run.stats;
  const k = run.kit.shop;
  let d = st.shopDiscount;
  if (happyHour(run)) d += 0.25;
  if (kindOf(u) === 'consumable') d += st.consumableDiscount;
  const bulk = run.level('bulkbuy');
  if (bulk && k.bought === 2) d += 0.2 * bulk;
  if (run.level('haggler')) d += Math.min(0.3, 0.1 * k.bought);
  if (k.clearance === u.id) d += 0.5;
  return Math.min(MAX_DISCOUNT, d);
}

/** A topping card's price now, and its usual price. */
export function toppingPrice(run: Run, u: Upgrade): { price: number; full: number } {
  const full = upgradePrice(u, run.wave, run.level(u.id));
  return { price: Math.max(0, round5(full * (1 - toppingDiscount(run, u)))), full };
}

/** The ten-wave block a shop belongs to (Free Lunch and Bottomless Pizza come back each block). */
export function dealBlock(wave: number): number {
  return Math.floor(wave / DEAL_BLOCK);
}

/** Free Lunch is ready: every card shows FREE until one is taken. */
export function freeLunchReady(run: Run): boolean {
  return run.level('freelunch') > 0 && run.kit.freeLunchAt !== dealBlock(run.wave);
}

/** What a reroll costs (Coupon Clipper, Rush Order, Owner's Discount). */
/** Moving a pizza to another place on the table (one move, however far): 10 tips, plus 1.5 a wave, in 5s. */
export function movePrice(run: Run): number {
  return round5(10 + 1.5 * run.wave);
}

export function rerollPrice(run: Run): number {
  const st = run.stats;
  const owner = run.level('ownersdiscount') ? 0.75 : 1;
  // (its climbing price plus the wave's, so a reroll stays a real cost later on)
  return Math.max(1, Math.round((run.rerollCost + 1.5 * run.wave - st.rerollLess) * st.rerollMult * owner));
}

/** A free counter pizza from a topping: Bottomless Pizza (every 10 waves) first, then Free Delivery (once a run). Regular pizzas only. */
export function counterFreebie(run: Run, kind: string): 'bottomless' | 'delivery' | null {
  if (kind !== 'pizza') return null;
  if (run.level('bottomless') && run.kit.bottomlessAt !== dealBlock(run.wave)) return 'bottomless';
  if (run.level('freedelivery') && !run.kit.freeDeliveryUsed) return 'delivery';
  return null;
}

/** A counter pizza's price after the shop toppings (Premium Menu, Owner's Discount, Chef's Favourite). */
export function counterPrice(run: Run, cost: number, kind: string): number {
  if (counterFreebie(run, kind)) return 0;
  let k = run.stats.counterMult;
  if (run.level('ownersdiscount')) k *= 0.75;
  if (kind === 'special' && run.level('chefsfav')) k *= 0.75;
  return k === 1 ? cost : round5(cost * k);
}

/** A Golden Menu item's crust price (Golden Ticket, Owner's Discount). */
export function goldenPrice(run: Run, cost: number): number {
  const d = Math.min(MAX_DISCOUNT, run.stats.goldenDiscount);
  return d > 0 ? Math.max(1, Math.round(cost * (1 - d))) : cost;
}
