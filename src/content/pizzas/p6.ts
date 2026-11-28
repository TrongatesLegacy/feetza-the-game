// The pizza plan's step 4, batch 2 (docs/pizza-plan.md): the 9 Epic Pizzeria pizzas (E10–E18), each inspired by Act 9's
// myths and its bosses. Bought with Golden Crusts in the Pizzeria (the Epic crust band); per step 1, Epic Pizzeria
// pizzas are never dealt as Pizzeria Specials on the counter. Their perks run in src/game/pizzaPerks.ts; their new
// toppings are drawn in src/content/art/toppings-p6.ts from each boss's art.
// perkText must stay at 40 characters or fewer (one card line).
import type { PizzaType } from '../../data/pizzas';
import { Rarity } from '../../data/rarity';

export const pizzas: PizzaType[] = [
  {
    id: 'colossusforge', name: 'Colossus Forge', perk: 'forgeWaves', perkText: '+1% damage per wave survived (max 40%)',
    shape: 'round', base: 'tomato', cheese: 0.12, toppings: ['forgeGlow', 'bronzePlates', 'chili'], crust: '#a8683a', cost: 950, route: 'pizzeria', rarity: Rarity.Epic,
  },
  {
    id: 'gorgonsgaze', name: "Gorgon's Gaze", perk: 'gorgonGaze', perkText: 'First foot above each wave: stone 3s, ×2',
    shape: 'round', base: 'pesto', cheese: 0.3, toppings: ['stoneMozz', 'gorgonSnake', 'olive', 'basil'], crust: '#b8a888', cost: 880, route: 'pizzeria', rarity: Rarity.Epic,
  },
  {
    id: 'threeheaded', name: 'Three-Headed Hound', perk: 'tripleBite', perkText: 'Every 3rd smack hits three times',
    shape: 'round', base: 'tomato', cheese: 0, toppings: ['threeTempers', 'meatball'], crust: '#8a4a2a', cost: 1000, route: 'pizzeria', rarity: Rarity.Epic,
  },
  {
    id: 'labyrinthlasagne', name: 'Labyrinth Lasagne', perk: 'mazeLost', perkText: 'Stompers get lost: 2s late, a new lane',
    shape: 'square', base: 'tomato', cheese: 0, toppings: ['mazeLasagne', 'parmesan'], crust: '#c8903e', cost: 820, route: 'pizzeria', rarity: Rarity.Epic,
  },
  {
    id: 'embershade', name: 'Ember Shade', perk: 'emberTrail', perkText: 'Kills leave embers: next foot burns 6/s',
    shape: 'round', base: 'ink', cheese: 0.15, toppings: ['shadeSmoke', 'emberCoals', 'chili'], crust: '#4a3a3e', cost: 760, route: 'pizzeria', rarity: Rarity.Epic,
  },
  {
    id: 'sirenssong', name: "Siren's Song", perk: 'sirenSong', perkText: 'Every 25s a song freezes every foot 1.5s',
    shape: 'round', base: 'white', cheese: 0.3, toppings: ['sirenScales', 'shrimp', 'pearl'], crust: '#d8b890', cost: 1050, route: 'pizzeria', rarity: Rarity.Epic,
  },
  {
    id: 'harpyfeather', name: 'Harpy Feather Pie', perk: 'harpyGust', perkText: 'Every 5s feet above are blown 100px up',
    shape: 'round', base: 'bbq', cheese: 0.45, toppings: ['friedChicken', 'harpyFeather', 'chili'], crust: '#b87a40', cost: 720, route: 'pizzeria', rarity: Rarity.Epic,
  },
  {
    id: 'goldenfleece', name: 'Golden Fleece', perk: 'goldenFleece', perkText: 'Bosses and mini-bosses drop +50% tips',
    shape: 'round', base: 'white', cheese: 0, toppings: ['fleeceCurls', 'goldLeaf', 'rosemary'], crust: '#e0b050', cost: 780, route: 'pizzeria', rarity: Rarity.Epic,
  },
  {
    id: 'charybdisswirl', name: 'Charybdis Swirl', perk: 'whirlpool', perkText: '10% of smacks: a whirlpool stuns 1.5s',
    shape: 'round', base: 'tomato', cheese: 0, toppings: ['whirlSauce', 'mussel', 'squid'], crust: '#c89a68', cost: 900, route: 'pizzeria', rarity: Rarity.Epic,
  },
];
