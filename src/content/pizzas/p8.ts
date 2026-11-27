// The pizza plan's step 5, batch 1 (docs/pizza-plan.md, section 12): the first Legendaries, Act 1's three.
//   L1 Nonna's Masterpiece (Pizzeria): Nonna's dish at the Trattoria, her ladle swatting the first stomp each wave.
//   L2 Silver Service (Milestone): the Head Waiter's silver tray skimming the table.
//   L3 The First Bake (Chef's Special): Opening Night's first pie out of the wood oven.
// Their gates (the Pizzeria's act boss on Hot, the milestone's feat, the counter only in Act 1's stages) are in
// src/game/legendary.ts; their perks run in src/game/pizzaLegends.ts; their toppings are drawn in
// src/content/art/toppings-p8.ts; their auras and signatures in src/game/legendAuras.ts.
// perkText must stay at 40 characters or fewer (one card line).
import type { PizzaType } from '../../data/pizzas';

export const pizzas: PizzaType[] = [
  {
    id: 'nonnasmasterpiece', name: "Nonna's Masterpiece", perk: 'nonnaLadle', perkText: 'Once a wave the ladle blocks a stomp: ×5',
    shape: 'round', base: 'tomato', cheese: 0, toppings: ['nonnaRagu', 'fiorDiLatte', 'parmShavings', 'basil', 'nonnaSpoon', 'flourDust'], crust: '#d8954a', cost: 2400, route: 'pizzeria', rarity: 'legendary', act: 1,
  },
  {
    id: 'silverservice', name: 'Silver Service', perk: 'silverTray', perkText: 'Every 15s a tray bats all divers back up',
    shape: 'round', base: 'white', cheese: 0, toppings: ['cremeSpiral', 'salmonRose', 'cremeRosette', 'caviarPearls', 'silverLeaf', 'dill', 'silverCrust'], crust: '#c4914f', cost: 2000, route: 'milestone', rarity: 'legendary', act: 1,
  },
  {
    id: 'firstbake', name: 'The First Bake', perk: 'firstBake', perkText: 'Fresh every wave; once, a slice over max',
    shape: 'round', base: 'tomato', cheese: 0, toppings: ['oilPools', 'sanMarzano', 'fiorDiLatte', 'basil', 'seaSalt', 'wheatSprig', 'woodfireCrust'], crust: '#e0a050', cost: 650, route: 'special', rarity: 'legendary', act: 1,
  },
];
