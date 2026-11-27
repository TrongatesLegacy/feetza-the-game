// Pizza rarity tiers (docs/pizza-plan.md): the one place each tier's look, odds and prices live.
//
// Every pizza has a `rarity` (PizzaType). The tier sets:
//   - its frame wherever a pizza card is shown (src/ui/pizzaTier.ts reads the colours below) and the plate its
//     portrait sits on (src/art/pizzaArt.ts);
//   - how often it's dealt: the counter's Chef's Special slot, the owned pizzas on the counter and the new-run
//     screen's Rare Finds all roll the tier first (TIER_WEIGHT), then a pizza of that tier;
//   - what it costs: crusts in the Pizzeria and for a Rare Find, tips for a Chef's Special (its `cost`, inside the
//     tier's band), and the counter's price for a pizza you own (TIER_COUNTER).
import type { Rarity } from './upgrades';

export type PizzaRarity = Rarity;
export const PIZZA_RARITIES: PizzaRarity[] = ['common', 'rare', 'epic', 'legendary'];

/** A tier's frame. `a` and `b` are the frame's two tones (dark, light), `edge` its outline, `gem` the small mark
 *  (peel tiles), `ink` text on the tier's label, `label` the label's fill. */
export interface TierLook {
  name: string;
  a: string;
  b: string;
  edge: string;
  gem: string;
  label: string;
  ink: string;
}

export const TIER_LOOK: Record<PizzaRarity, TierLook> = {
  // plain wood: a warm board
  common: { name: 'Common', a: '#a8703c', b: '#e2b47a', edge: '#5a3518', gem: '#c48a50', label: '#f3dcb8', ink: '#4a2a10' },
  // silver: cool polished metal (the sheen is CSS)
  rare: { name: 'Rare', a: '#8c99a8', b: '#f4f8fc', edge: '#3c4654', gem: '#d4dde8', label: '#e6edf5', ink: '#28323e' },
  // purple and gold (the sparkles are CSS)
  epic: { name: 'Epic', a: '#6a2fc8', b: '#ffd23f', edge: '#2e0f62', gem: '#a463ff', label: '#7a3ae0', ink: '#ffffff' },
  // gold, with a living border (for the legendaries to come)
  legendary: { name: 'Legendary', a: '#d08a08', b: '#fff0a0', edge: '#5e3a00', gem: '#ffbf1f', label: '#ffc93a', ink: '#3e2400' },
};

/** Deal odds by tier (Tron, 2026-11-27): the counter's Chef's Special, the counter's owned pizzas, Rare Finds. */
export const TIER_WEIGHT: Record<PizzaRarity, number> = { common: 60, rare: 28, epic: 10, legendary: 2 };

/** Price bands: crusts (the Pizzeria, Rare Finds) and a Chef's Special's tips before wave scaling. */
export const TIER_CRUSTS: Record<PizzaRarity, [number, number]> = { common: [150, 300], rare: [350, 600], epic: [700, 1100], legendary: [1500, 3000] };
export const TIER_TIPS: Record<PizzaRarity, [number, number]> = { common: [40, 80], rare: [90, 160], epic: [200, 350], legendary: [500, 800] };

/** The counter's price for a pizza you own, by tier: times the counter's base (150 + 75 a pizza bought + 12 a wave).
 *  Common the cheapest, Epic the dearest of today's, Legendary dearer still; across today's 113 it averages about 1. */
export const TIER_COUNTER: Record<PizzaRarity, number> = { common: 0.9, rare: 1.05, epic: 1.3, legendary: 1.6 };

/** A Pizzeria pizza (Common or Rare) turning up as a Chef's Special: how often the slot deals one instead (when the
 *  tier rolled has one locked), and its markup over a real special of its tier (crusts stay the reliable way). */
export const PIZZERIA_SPECIAL_CHANCE = 0.12;
export const PIZZERIA_SPECIAL_MARKUP = 1.35;

export function tierRank(r: PizzaRarity): number {
  return PIZZA_RARITIES.indexOf(r);
}

/** Roll a tier by TIER_WEIGHT among the ones given (null when none). */
export function rollTier(tiers: Iterable<PizzaRarity>, rand: () => number = Math.random): PizzaRarity | null {
  const list = [...new Set(tiers)];
  const total = list.reduce((n, t) => n + TIER_WEIGHT[t], 0);
  if (!list.length || total <= 0) return null;
  let x = rand() * total;
  for (const t of list) {
    x -= TIER_WEIGHT[t];
    if (x < 0) return t;
  }
  return list[list.length - 1];
}

/** Pick one from a pool by rarity: the tier first (by TIER_WEIGHT, among the tiers in the pool), then any of that
 *  tier at random. */
export function pickByTier<T>(pool: T[], tierOf: (t: T) => PizzaRarity, rand: () => number = Math.random): T | null {
  const t = rollTier(pool.map(tierOf), rand);
  if (!t) return null;
  const here = pool.filter((x) => tierOf(x) === t);
  return here[Math.floor(rand() * here.length)] ?? null;
}
