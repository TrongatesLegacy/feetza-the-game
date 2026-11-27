// The pizza plan's step 3 (docs/pizza-plan.md): 10 new Commons and 2 new Rares, all Rare Finds, each inspired by a
// place or a fight. Their perks run in src/game/pizzaPerks.ts (stat bumps in src/game/Run.ts); their new toppings
// are drawn in src/content/art/toppings-p4.ts. perkText must stay at 40 characters or fewer (one card line).
import type { PizzaType } from '../../data/pizzas';

export const pizzas: PizzaType[] = [
  // ——— Commons (Rare Finds, 150–300 crusts) ———
  {
    id: 'seasidefritto', name: 'Seaside Fritto', perk: 'lossTips', perkText: '+12% tips the wave after a slice is lost',
    shape: 'round', base: 'tomato', cheese: 0.3, toppings: ['friedCalamari', 'lemon', 'parsley'], crust: '#d9a24e', cost: 190, route: 'rare', rarity: 'common',
  },
  {
    id: 'blueplate', name: 'Blue Plate Special', perk: 'bluePlate', perkText: '+5% smack damage and +5% tips',
    shape: 'round', base: 'bbq', cheese: 0.8, toppings: ['beef', 'cheddar', 'crinkleFry', 'pickle'], crust: '#d39446', cost: 260, route: 'rare', rarity: 'common',
  },
  {
    id: 'lodgefondue', name: 'Lodge Fondue Pie', perk: 'fondueStick', perkText: 'Feet that stomp it stick for 0.3s',
    shape: 'round', base: 'white', cheese: 0.3, toppings: ['potato', 'fondueSwirl', 'breadCube', 'pickle'], crust: '#c98a40', cost: 210, route: 'rare', rarity: 'common',
  },
  {
    id: 'rooftoprosemary', name: 'Rooftop Rosemary', perk: 'roofKnock', perkText: '+8% knockback on feet above it',
    shape: 'round', base: 'white', cheese: 0.5, toppings: ['rosemary', 'ricotta', 'honeycomb', 'honeyDrizzle'], crust: '#dcaa58', cost: 170, route: 'rare', rarity: 'common',
  },
  {
    id: 'stargazer', name: 'Stargazer Calzone', perk: 'stargazer', perkText: '+3% crit chance, +10% crit damage',
    shape: 'calzone', base: 'tomato', cheese: 0, toppings: ['starCalzone'], crust: '#c8945a', cost: 290, route: 'rare', rarity: 'common',
  },
  {
    id: 'rinkpretzel', name: 'Rinkside Pretzel Pie', perk: 'killRush', perkText: 'Smacks 5% faster for 3s after a kill',
    shape: 'round', base: 'white', cheese: 0.7, toppings: ['sausage', 'pretzelKnot', 'mustardZigzag'], crust: '#a8602a', cost: 220, route: 'rare', rarity: 'common',
  },
  {
    id: 'raclette', name: 'Raclette Run', perk: 'halfStomp', perkText: '1st stomp on it each wave: half a slice',
    shape: 'round', base: 'white', cheese: 0, toppings: ['potato', 'raclette', 'pickle', 'whiteOnion'], crust: '#d8a656', cost: 240, route: 'rare', rarity: 'common',
  },
  {
    id: 'cellarmushroom', name: 'Cellar Mushroom Medley', perk: 'undeadDmg', perkText: '+10% damage to ghosts and the undead',
    shape: 'round', base: 'white', cheese: 0.6, toppings: ['mushroom', 'porcini', 'chanterelle', 'sage'], crust: '#c48c48', cost: 200, route: 'rare', rarity: 'common',
  },
  {
    id: 'oldtowntarte', name: 'Old Town Tarte', perk: 'waveTips', perkText: '+6 tips at the start of every wave',
    shape: 'square', base: 'white', cheese: 0.35, toppings: ['caramelOnion', 'bacon', 'sage'], crust: '#d29c50', cost: 160, route: 'rare', rarity: 'common',
  },
  {
    id: 'kitchensink', name: 'Kitchen Sink', perk: 'kitchenSink', perkText: 'Each wave: +5% damage, tips or crit',
    shape: 'round', base: 'tomato', cheese: 1, toppings: ['pepperoni', 'ham', 'mushroom', 'greenPepper', 'pineapple', 'olive', 'sweetcorn'], crust: '#d2963f', cost: 270, route: 'rare', rarity: 'common',
  },

  // ——— Rares (Rare Finds, 350–600 crusts) ———
  {
    id: 'granite', name: 'Granite Crust', perk: 'stoneStomp', perkText: 'Once a wave a stomp on it turns to stone',
    shape: 'round', base: 'tomato', cheese: 0.6, toppings: ['mozzarella', 'kalamata', 'blackGarlic', 'basil', 'graniteFleck'], crust: '#a49a8a', cost: 520, route: 'rare', rarity: 'rare', finish: { glow: 0xcfc6b4, sparkle: true },
  },
  {
    id: 'discodiner', name: 'Disco Diner Pie', perk: 'danceBeat', perkText: 'Every 30s a dance beat slows feet 30%',
    shape: 'round', base: 'tomato', cheese: 1, toppings: ['vinylPepperoni', 'greenPepper', 'redPepper', 'basil'], crust: '#d8983e', cost: 450, route: 'rare', rarity: 'rare', finish: { glow: 0xff5ad8, sparkle: true },
  },
];
