// The pizza plan's step 4, batch 1 (docs/pizza-plan.md): the 9 Epic Chef's Specials (E1–E9), each inspired by a boss.
// Dealt at the shop counter as an Epic Chef's Special from wave 5; bought with tips, they're yours for good. Their perks
// run in src/game/pizzaPerks.ts; their new toppings are drawn in src/content/art/toppings-p5.ts from each boss's art.
// perkText must stay at 40 characters or fewer (one card line).
import type { PizzaType } from '../../data/pizzas';

export const pizzas: PizzaType[] = [
  {
    id: 'squidinknero', name: 'Squid Ink Nero', perk: 'inkSpray', perkText: 'Smacks spray ink: feet wander for 1.5s',
    shape: 'round', base: 'ink', cheese: 0.1, toppings: ['inkPool', 'squid', 'inkTentacle', 'lemon', 'parsley'], crust: '#3a2a3e', cost: 260, route: 'special', rarity: 'epic',
  },
  {
    id: 'snowballpie', name: 'Snowball Pie', perk: 'snowball', perkText: 'Every 8th smack: a snowball freezes 2s',
    shape: 'round', base: 'white', cheese: 0.2, toppings: ['snowball', 'rosemary', 'whiteOnion', 'frostRim'], crust: '#dcc8a8', cost: 230, route: 'special', rarity: 'epic',
  },
  {
    id: 'creampie', name: 'Cream Pie Supreme', perk: 'pieSplat', perkText: 'Kills leave a pie splat: next foot slips',
    shape: 'round', base: 'pink', cheese: 0, toppings: ['creamSplats', 'strawberry', 'miniCreamPie', 'sprinkles'], crust: '#d9a050', cost: 220, route: 'special', rarity: 'epic',
  },
  {
    id: 'sandcastlesundae', name: 'Sandcastle Sundae', perk: 'sandWall', perkText: 'A sand wall blocks 2 stomps each wave',
    shape: 'round', base: 'white', cheese: 0, toppings: ['beachSand', 'sandcastle', 'seaShell', 'strawberry'], crust: '#e0b068', cost: 250, route: 'special', rarity: 'epic',
  },
  {
    id: 'trexribs', name: 'T-Rex Ribs', perk: 'critQuake', perkText: 'Crits shake the table: +10% dmg for 3s',
    shape: 'round', base: 'bbq', cheese: 0.25, toppings: ['dinoPrints', 'ribBone', 'onion', 'springOnion'], crust: '#b8702e', cost: 240, route: 'special', rarity: 'epic',
  },
  {
    id: 'steambun', name: 'Steam Bun Pie', perk: 'steamVent', perkText: 'Every 20s steam blows diving feet back',
    shape: 'round', base: 'bbq', cheese: 0.1, toppings: ['baoBun', 'carrotGear', 'springOnion', 'chili'], crust: '#d8b07a', cost: 270, route: 'special', rarity: 'epic',
  },
  {
    id: 'chimneysoot', name: 'Chimney Soot Pie', perk: 'sootAbove', perkText: 'Feet above it are lost in soot for 2s',
    shape: 'round', base: 'tomato', cheese: 0.15, toppings: ['brickChorizo', 'blackPepper', 'sootDust'], crust: '#6a4a36', cost: 210, route: 'special', rarity: 'epic',
  },
  {
    id: 'cometcalzone', name: 'Comet Calzone', perk: 'comet', perkText: 'Every 12s a comet hits the toughest ×4',
    shape: 'calzone', base: 'tomato', cheese: 0, toppings: ['cometCalzone'], crust: '#b88a5a', cost: 320, route: 'special', rarity: 'epic',
  },
  {
    id: 'phantomwaltz', name: 'Phantom Waltz', perk: 'ghostAlly', perkText: '15% of kills: a ghost blocks one stomp',
    shape: 'round', base: 'white', cheese: 0.35, toppings: ['ghostMozz', 'ghostRose', 'blackGarlic'], crust: '#c8b8c8', cost: 300, route: 'special', rarity: 'epic',
  },
];
