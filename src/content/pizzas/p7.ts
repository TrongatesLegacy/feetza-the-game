// The pizza plan's step 4, batch 3 (docs/pizza-plan.md, section 11): the 6 Epic milestone pizzas (E19–E24), each
// inspired by Act 8's Norse bosses (Fenrir, the Bifröst, the Skald, Thrym, Surtr, Jörmungandr), and the Epic Rare Find
// E25 Echo Slice (the Echo Phantom). The milestones' goals are in MILESTONES (src/data/meta.ts): they took over six of
// the goals whose Rare pizzas moved off milestones in step 1. A milestone prize isn't sold: its cost only sorts it.
// Echo Slice is found on the new-run screen and bought there with crusts. Their perks run in src/game/pizzaPerks.ts;
// their new toppings are drawn in src/content/art/toppings-p7.ts from each boss's art.
// perkText must stay at 40 characters or fewer (one card line).
import type { PizzaType } from '../../data/pizzas';

export const pizzas: PizzaType[] = [
  {
    id: 'fenrirshowl', name: "Fenrir's Howl", perk: 'fenrirHowl', perkText: 'Pizza lost: every foot flees to the top',
    shape: 'round', base: 'tomato', cheese: 0, toppings: ['wolfPrints', 'sausage', 'gleipnirChain', 'blackPepper'], crust: '#9a7e62', cost: 800, route: 'milestone', rarity: 'epic',
  },
  {
    id: 'rainbowbridge', name: 'Rainbow Bridge', perk: 'bridgeLane', perkText: 'Each wave a lane is bridged: +40% damage',
    shape: 'round', base: 'white', cheese: 0.12, toppings: ['bifrostSpan', 'starDust', 'basil'], crust: '#d8b890', cost: 900, route: 'milestone', rarity: 'epic',
  },
  {
    id: 'skaldssaga', name: "Skald's Saga", perk: 'skaldSaga', perkText: '+3% damage per boss beaten this run',
    shape: 'round', base: 'tomato', cheese: 0.12, toppings: ['meadGlaze', 'skaldRunes', 'salami', 'onion'], crust: '#c8913a', cost: 850, route: 'milestone', rarity: 'epic',
  },
  {
    id: 'frostbite', name: 'Frostbite', perk: 'frostbite', perkText: 'Chilled or frozen feet take +25% damage',
    shape: 'round', base: 'moon', cheese: 0, toppings: ['thrymIce', 'hailPearls', 'rosemary'], crust: '#b8c8d8', cost: 750, route: 'milestone', rarity: 'epic',
  },
  {
    id: 'surtrsember', name: "Surtr's Ember Crust", perk: 'surtrSpread', perkText: 'Burning kills spread fire to a neighbour',
    shape: 'round', base: 'tomato', cheese: 0, toppings: ['muspelCoals', 'surtrBlade', 'chili'], crust: '#5a2a1a', cost: 950, route: 'milestone', rarity: 'epic',
  },
  {
    id: 'serpentscoil', name: "Serpent's Coil", perk: 'serpentCoil', perkText: 'Once a wave: first diver coiled, held 3s',
    shape: 'round', base: 'pesto', cheese: 0.05, toppings: ['jormCoil', 'venomDrops', 'shrimp'], crust: '#b8a070', cost: 1000, route: 'milestone', rarity: 'epic',
  },
  {
    id: 'echoslice', name: 'Echo Slice', perk: 'echo', perkText: 'Copies the perk of the pizza beside it',
    shape: 'round', base: 'tomato', cheese: 0.3, toppings: ['echoPepperoni', 'echoBasil', 'echoGlitch'], crust: '#c8b8d8', cost: 1050, route: 'rare', rarity: 'epic',
    finish: { glow: 0x7df9ff, ghost: true, sparkle: true },
  },
];
