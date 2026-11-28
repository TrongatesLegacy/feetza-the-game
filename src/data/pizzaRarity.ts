// Pizza rarity tiers (docs/pizza-plan.md): rolling a tier and a pizza of it. Each tier's look, odds and prices live in
// RARITY_DEFS (src/data/rarity.ts, each rarity's `pizza`).
//
// Every pizza has a `rarity` (PizzaType). The tier sets:
//   - its frame wherever a pizza card is shown (src/ui/pizzaTier.ts reads the colours) and the plate its
//     portrait sits on (src/art/pizzaArt.ts);
//   - how often it's dealt: the counter's Chef's Special slot, the owned pizzas on the counter and the new-run
//     screen's Rare Finds all roll the tier first (its pizza weight), then a pizza of that tier;
//   - what it costs: crusts in the Pizzeria and for a Rare Find, tips for a Chef's Special (its `cost`, inside the
//     tier's band), and the counter's price for a pizza you own (its pizza counter).
import { RARITY_DEFS, Rarity } from './rarity';

export type PizzaRarity = Rarity;

/** A Pizzeria pizza (Common or Rare) turning up as a Chef's Special: how often the slot deals one instead (when the
 *  tier rolled has one locked), and its markup over a real special of its tier (crusts stay the reliable way). */
export const PIZZERIA_SPECIAL_CHANCE = 0.12;
export const PIZZERIA_SPECIAL_MARKUP = 1.35;

/** Roll a tier by RARITY_DEFS' pizza weight among the ones given (null when none). */
export function rollTier(tiers: Iterable<PizzaRarity>, rand: () => number = Math.random): PizzaRarity | null {
  const list = [...new Set(tiers)];
  const total = list.reduce((n, t) => n + RARITY_DEFS[t].pizza.weight, 0);
  if (!list.length || total <= 0) return null;
  let x = rand() * total;
  for (const t of list) {
    x -= RARITY_DEFS[t].pizza.weight;
    if (x < 0) return t;
  }
  return list[list.length - 1];
}

/** Pick one from a pool by rarity: the tier first (by its pizza weight, among the tiers in the pool), then any of that
 *  tier at random. */
export function pickByTier<T>(pool: T[], tierOf: (t: T) => PizzaRarity, rand: () => number = Math.random): T | null {
  const t = rollTier(pool.map(tierOf), rand);
  if (!t) return null;
  const here = pool.filter((x) => tierOf(x) === t);
  return here[Math.floor(rand() * here.length)] ?? null;
}
