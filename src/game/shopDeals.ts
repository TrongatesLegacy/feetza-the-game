// The shop toppings' sums (src/data/toppingsShop.ts): card counts, topping, reroll, counter and Golden
// Menu prices, and which items are free. Discounts stack additively and stop at 60% off.

import { UpgradeKind, kindOf, upgradePrice, type Upgrade } from '../data/upgrades';
import { save } from '../systems/save';
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

/** A shop's usual topping cards before anything changes them: 3 (4 with the Pizzeria's Indecisive Chef). */
export function usualCards(): number {
  return 3 + (save.meta.indecisive ? 1 : 0);
}

/** The cards a shop deals in all (what STATS' Cards per shop shows): its topping cards (cardCount) and the ledger's
 *  one-use extras (Mac & Cheese's extraConsumable; each dealt when one is free to deal). */
export function shopCardTotal(run: Run): number {
  return cardCount(run, usualCards()) + run.stats.extraConsumable;
}

/** What a deal dealt: its cards, and which of them are Exclusive Menu's guaranteed ones (first in the list). */
export interface Deal {
  cards: Upgrade[];
  exclusive: string[];
}

/**
 * Deal shop cards: every way of dealing them goes through here (a shop opening, boss loot, rerolls, the Stockroom
 * Key's restock, the hero's peek at the next shop, From the Future's shop, and Booster Gouda's coming shop). It reads
 * the ledger's card totals: n topping cards (cardDelta, through cardCount, unless the caller says how many), of which
 * the first Stat.GuaranteedEpic (Exclusive Menu) are Epic or Legendary by their usual weights (a Rare when none is
 * open, else any card), then the one-use extras (extraConsumable, always ordinary one-use cards). Boss loot deals epic
 * or better (any shop's deal when none is open); its one-use extras can be any rarity, as in any shop.
 * `guarantee: false` (a reroll) deals with no guaranteed card.
 */
export function dealCards(run: Run, o: { boss?: boolean; n?: number; exclude?: string[]; guarantee?: boolean } = {}): Deal {
  const exclude = o.exclude ?? [];
  const n = o.n ?? cardCount(run, usualCards());
  const g = o.guarantee === false ? 0 : Math.min(n, run.stats.guaranteedEpic);
  const sure = g > 0 ? run.pickExclusive(g, run.dealable(exclude)) : [];
  const ex = sure.length ? [...exclude, ...sure.map((u) => u.id)] : exclude;
  let picks: Upgrade[] = [];
  if (o.boss && n > sure.length) picks = run.pickBossCards(n - sure.length, ex);
  // (boss loot with nothing epic or better open: an ordinary deal)
  if (!o.boss || (!picks.length && n > sure.length)) {
    const avail = run.dealable(ex);
    picks = [...sure, ...run.pickCards(n - sure.length, avail)];
    run.addExtraConsumables(picks, avail, run.stats.extraConsumable);
  } else {
    picks = [...sure, ...picks];
    run.addExtraConsumables(picks, run.dealable(ex), run.stats.extraConsumable);
  }
  return { cards: picks, exclusive: sure.map((u) => u.id) };
}

/** Every discount on this card right now (negative: a surcharge), capped at 60% off. */
export function toppingDiscount(run: Run, u: Upgrade): number {
  const st = run.stats;
  const k = run.kit.shop;
  let d = st.shopDiscount;
  if (happyHour(run)) d += 0.25;
  if (kindOf(u) === UpgradeKind.Consumable) d += st.consumableDiscount;
  const bulk = run.level('bulkbuy');
  if (bulk && k.bought === 2) d += 0.2 * bulk;
  if (run.level('haggler')) d += Math.min(0.3, 0.1 * k.bought);
  if (k.clearance === u.id) d += 0.5;
  // Exclusive Menu's guaranteed card (LV2+)
  if (k.exclusive.includes(u.id)) d += st.exclusiveDiscount;
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
