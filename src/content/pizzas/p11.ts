// The pizza plan's step 5, batch 4 (docs/pizza-plan.md, section 15): Act 4's Legendaries, from Home Cooking's
// Kitchen (the Dough Boy, Nonna) and Old Town (the Pigeon King, the Gargoyle), whose boss, the Gargoyle, guards the
// Pizzeria's gate. Two of the draft's themes were other acts' (the Kraken is Act 5's, the Phantom King Act 6's), so
// those two were re-themed to Act 4 with their perks and routes kept (section 15):
//   L10 Pigeon King's Catch (Milestone; drafted as Kraken's Catch): the Pigeon King's pigeon carries a diving foot off.
//   L11 Second Rise (Pizzeria; drafted as Phantom Banquet): the Dough Boy's dough, beaten feet rising again as dough.
//   L12 Cathedral Crust (Chef's Special): the Gargoyle's cathedral, each pizza's first stomp a wave turned to stone.
// Their gates are in src/game/legendary.ts; their perks are declared in src/game/perkEffects.ts and run in
// src/game/pizzaLegends4.ts, their looks in src/game/legendView4.ts; their toppings are drawn in
// src/content/art/toppings-p11.ts; their auras and signatures in src/game/legendAuras4.ts.
// perkText must stay at 40 characters or fewer (one card line).
import type { PizzaType } from '../../data/pizzas';
import { Rarity } from '../../data/rarity';

export const pizzas: PizzaType[] = [
  {
    id: 'pigeoncatch', name: "Pigeon King's Catch", perk: 'pigeonCatch', perkText: 'Every 10s a pigeon carries off a diver',
    shape: 'round', base: 'tomato', cheese: 0, toppings: ['piazzaCobbles', 'crumbTrail', 'royalFeather', 'kingsCrown', 'lamplitCrust'], crust: '#d49a52', cost: 2500, route: 'milestone', rarity: Rarity.Legendary, act: 4,
  },
  {
    id: 'secondrise', name: 'Second Rise', perk: 'doughRise', perkText: 'Beaten feet rise 6s as dough: bite ×0.5',
    shape: 'round', base: 'white', cheese: 0, toppings: ['provedDough', 'ricottaClouds', 'confitTomato', 'doughKnots', 'basil', 'flourDust', 'risenCrust'], crust: '#e8bf7a', cost: 2700, route: 'pizzeria', rarity: Rarity.Legendary, act: 4,
  },
  {
    id: 'cathedralcrust', name: 'Cathedral Crust', perk: 'stoneFirst', perkText: "Every pie's first stomp a wave: stone",
    shape: 'round', base: 'tomato', cheese: 0, toppings: ['roseWindow', 'stoneMushroom', 'gargoyleWing', 'stoneDust', 'cathedralRim'], crust: '#b8ad9a', cost: 760, route: 'special', rarity: Rarity.Legendary, act: 4,
  },
];
