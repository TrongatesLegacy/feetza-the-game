// Rarity: the four tiers by name (Rarity.Common … Rarity.Legendary) and one definition for each (RARITY_DEFS), the one
// place everything rarity-keyed lives: its order and label, the toppings' deal weight, colour, price and first wave,
// and the pizzas' tier frame, odds and prices (docs/pizza-plan.md). A rarity missing a field doesn't compile.
//
// The names are the strings saves, CSS classes (`.card.epic`) and the golden snapshot already use ('epic'), so
// nothing stored changes; code never types them: Rarity.Epic, Rarity.atLeast(r, Rarity.Epic), Rarity.next(r).

const NAMES = { Common: 'common', Rare: 'rare', Epic: 'epic', Legendary: 'legendary' } as const;
export type Rarity = (typeof NAMES)[keyof typeof NAMES];

/** A pizza tier's frame. `a` and `b` are the frame's two tones (dark, light), `edge` its outline, `gem` the small
 *  mark (peel tiles), `ink` text on the tier's label, `label` the label's fill. */
export interface TierLook {
  a: string;
  b: string;
  edge: string;
  gem: string;
  label: string;
  ink: string;
}

export interface RarityDef {
  /** 0 for Common up to 3 for Legendary: what "rarer" means. */
  order: number;
  /** Its name as players read it: "Epic". */
  label: string;
  // ——— toppings ———
  /** A topping card's deal weight (luck tips it rarer: Run.pickCards). */
  weight: number;
  /** A topping card's colour (its frame, chips and tabs). */
  color: string;
  /** A topping's base price in tips, plus `perWave` a wave (rarer toppings stay proportionally dearer all run). */
  price: number;
  perWave: number;
  /** The first shop (wave cleared) a topping of this rarity can be dealt in. */
  from: number;
  // ——— pizzas (docs/pizza-plan.md) ———
  pizza: {
    /** Its frame wherever a pizza card is shown (src/ui/pizzaTier.ts) and its portrait's plate (src/art/pizzaArt.ts). */
    look: TierLook;
    /** Deal odds (Tron, 2026-11-27): the counter's Chef's Special, the counter's owned pizzas, Rare Finds. */
    weight: number;
    /** Price band in crusts (the Pizzeria, Rare Finds). */
    crusts: [number, number];
    /** A Chef's Special's price band in tips before wave scaling. */
    tips: [number, number];
    /** The counter's price for a pizza you own: times the counter's base (150 + 75 a pizza bought + 12 a wave). Common
     *  the cheapest, Epic the dearest of today's, Legendary dearer still; across today's 113 it averages about 1. */
    counter: number;
  };
}

/** Every rarity's definition. */
export const RARITY_DEFS: Record<Rarity, RarityDef> = {
  common: {
    order: 0,
    label: 'Common',
    weight: 60,
    color: '#8fd16a',
    price: 40,
    perWave: 4,
    from: 0,
    // plain wood: a warm board
    pizza: { look: { a: '#a8703c', b: '#e2b47a', edge: '#5a3518', gem: '#c48a50', label: '#f3dcb8', ink: '#4a2a10' }, weight: 60, crusts: [150, 300], tips: [40, 80], counter: 0.9 },
  },
  rare: {
    order: 1,
    label: 'Rare',
    weight: 28,
    color: '#4cc9f0',
    price: 90,
    perWave: 6,
    from: 0,
    // silver: cool polished metal (the sheen is CSS)
    pizza: { look: { a: '#8c99a8', b: '#f4f8fc', edge: '#3c4654', gem: '#d4dde8', label: '#e6edf5', ink: '#28323e' }, weight: 28, crusts: [350, 600], tips: [90, 160], counter: 1.05 },
  },
  epic: {
    order: 2,
    label: 'Epic',
    weight: 10,
    color: '#b06bff',
    price: 160,
    perWave: 8,
    // from the wave 5 boss shop
    from: 5,
    // purple and gold (the sparkles are CSS)
    pizza: { look: { a: '#6a2fc8', b: '#ffd23f', edge: '#2e0f62', gem: '#a463ff', label: '#7a3ae0', ink: '#ffffff' }, weight: 10, crusts: [700, 1100], tips: [200, 350], counter: 1.3 },
  },
  legendary: {
    order: 3,
    label: 'Legendary',
    weight: 2.5,
    color: '#ffbf1f',
    price: 260,
    perWave: 12,
    from: 10,
    // gold, with a living border
    pizza: { look: { a: '#d08a08', b: '#fff0a0', edge: '#5e3a00', gem: '#ffbf1f', label: '#ffc93a', ink: '#3e2400' }, weight: 2, crusts: [1500, 3000], tips: [500, 800], counter: 1.6 },
  },
};

/** Every rarity, Common first. */
const ALL: readonly Rarity[] = (Object.keys(RARITY_DEFS) as Rarity[]).sort((a, b) => RARITY_DEFS[a].order - RARITY_DEFS[b].order);

/** How rare r is: 0 for Common up to 3 for Legendary. */
const rank = (r: Rarity): number => RARITY_DEFS[r].order;

export const Rarity = {
  ...NAMES,
  /** Every rarity, Common first. */
  all: ALL,
  rank,
  /** r is `min` or rarer: Rarity.atLeast(r, Rarity.Epic) is Epic or Legendary. */
  atLeast: (r: Rarity, min: Rarity): boolean => rank(r) >= rank(min),
  /** r is `max` or commoner: Rarity.atMost(r, Rarity.Rare) is Common or Rare. */
  atMost: (r: Rarity, max: Rarity): boolean => rank(r) <= rank(max),
  /** The next rarity up (Legendary stays Legendary). */
  next: (r: Rarity): Rarity => ALL[Math.min(ALL.length - 1, rank(r) + 1)],
  /** For sorting: Common first. */
  compare: (a: Rarity, b: Rarity): number => rank(a) - rank(b),
  /** The rarest of these (null when none). */
  rarest: (list: Iterable<Rarity>): Rarity | null => {
    let best: Rarity | null = null;
    for (const r of list) if (best === null || rank(r) > rank(best)) best = r;
    return best;
  },
} as const;
