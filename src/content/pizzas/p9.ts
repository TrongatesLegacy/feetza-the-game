// The pizza plan's step 5, batch 2 (docs/pizza-plan.md, section 13): Act 2's Legendaries, from Summer Rush's Beach
// (Sandcastle Sam, King Honk) and its act boss, T-Rex Toes, who guards the Pizzeria's gate.
//   L4 Big Top Pie (Rare Find): King Honk's circus, its cannon firing a cream pie at the toughest foot.
//   L5 Sandcastle Citadel (Pizzeria): Sandcastle Sam's fortress, its wall soaking up stomps.
//   L6 Tidal Tiki (Milestone): the Beach's tide washing over the table.
// Their gates are in src/game/legendary.ts; their perks run in src/game/pizzaLegends.ts; their toppings are drawn in
// src/content/art/toppings-p9.ts; their auras and signatures in src/game/legendAuras.ts.
// perkText must stay at 40 characters or fewer (one card line).
import type { PizzaType } from '../../data/pizzas';

export const pizzas: PizzaType[] = [
  {
    id: 'bigtoppie', name: 'Big Top Pie', perk: 'bigTopCannon', perkText: 'Cannon pie ×8 every 20s; all feet laugh',
    shape: 'round', base: 'tomato', cheese: 0, toppings: ['bigTopCanopy', 'clownNose', 'popcorn', 'confettiSprinkles', 'marqueeCrust'], crust: '#e0a050', cost: 2200, route: 'rare', rarity: 'legendary', act: 2,
  },
  {
    id: 'sandcastlecitadel', name: 'Sandcastle Citadel', perk: 'citadelWall', perkText: 'Each wave the citadel blocks 3 stomps',
    shape: 'round', base: 'white', cheese: 0, toppings: ['citadelSand', 'citadelWalls', 'vongole', 'samphire', 'sandCrust'], crust: '#e0a858', cost: 2600, route: 'pizzeria', rarity: 'legendary', act: 2,
  },
  {
    id: 'tidaltiki', name: 'Tidal Tiki', perk: 'tidalWash', perkText: 'Every 4th wave: feet washed up, +1 slice',
    shape: 'round', base: 'bbq', cheese: 0, toppings: ['tikiSurf', 'grilledPineapple', 'tikiMask', 'hibiscus', 'coconutCrust'], crust: '#d89448', cost: 2300, route: 'milestone', rarity: 'legendary', act: 2,
  },
];
