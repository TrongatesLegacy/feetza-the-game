// The pizza plan's step 5, batch 3 (docs/pizza-plan.md, section 14): Act 3's Legendaries, from Out of This World's
// Alpine Lodge (Ice Skate Ivy, the Colossus) and Space (UFO Toe, the Cosmic Croc), whose boss, the Cosmic Croc, guards
// the Pizzeria's gate.
//   L7 Cosmic Crouton Supreme (Chef's Special): the Cosmic Croc's crouton moon, opening portals that take feet away.
//   L8 Roar Roast (Pizzeria): the Lodge's fireside roast, its hearth roaring up and stunning every foot.
//   L9 Black Olive Hole (Rare Find): Space's black hole, pulling every foot on the table towards it.
// Their gates are in src/game/legendary.ts; their perks run in src/game/pizzaLegends3.ts; their toppings are drawn in
// src/content/art/toppings-p10.ts; their auras and signatures in src/game/legendAuras3.ts.
// perkText must stay at 40 characters or fewer (one card line).
import type { PizzaType } from '../../data/pizzas';
import { Rarity } from '../../data/rarity';

export const pizzas: PizzaType[] = [
  {
    id: 'cosmiccrouton', name: 'Cosmic Crouton Supreme', perk: 'croutonPortal', perkText: '1% of smacks: portal a foot; bosses ×10',
    shape: 'round', base: 'ink', cheese: 0, toppings: ['nebulaSauce', 'planetPepperoni', 'croutonCube', 'cosmicParmesan', 'crocCrust'], crust: '#d89a50', cost: 720, route: 'special', rarity: Rarity.Legendary, act: 3,
  },
  {
    id: 'roarroast', name: 'Roar Roast', perk: 'hearthRoar', perkText: 'Every 25s a roar stuns all 2s; +30% dmg',
    shape: 'round', base: 'bbq', cheese: 0, toppings: ['roastGravy', 'roastBeef', 'roastPotato', 'lingonberry', 'rosemary', 'hearthCrust'], crust: '#c47e3a', cost: 2800, route: 'pizzeria', rarity: Rarity.Legendary, act: 3,
  },
  {
    id: 'blackolivehole', name: 'Black Olive Hole', perk: 'blackHole', perkText: 'Every 20s a black hole pulls in all feet',
    shape: 'round', base: 'ink', cheese: 0, toppings: ['accretionSwirl', 'stretchedOlive', 'starDust', 'blackOliveCore', 'voidCrust'], crust: '#b08048', cost: 3000, route: 'rare', rarity: Rarity.Legendary, act: 3,
  },
];
