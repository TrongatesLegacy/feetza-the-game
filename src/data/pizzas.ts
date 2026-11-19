// Pizza varieties. Each pizza on the table grants its perk while it still has slices left.

export type Topping =
  | 'pepperoni'
  | 'mushroom'
  | 'olive'
  | 'greenPepper'
  | 'redPepper'
  | 'onion'
  | 'pineapple'
  | 'ham'
  | 'basil'
  | 'chili'
  | 'salami'
  | 'chicken'
  | 'bbq'
  | 'sausage'
  | 'bacon'
  | 'blueCheese'
  | 'parmesan'
  | 'truffle'
  | 'arugula'
  | 'strawberry'
  | 'chocolate'
  | 'goldLeaf'
  | 'tomato'
  | 'jalapeno'
  | 'mozzarella'
  | 'garlic'
  | 'artichoke'
  | 'prosciutto'
  | 'egg'
  | 'shrimp'
  | 'mussel'
  | 'squid'
  | 'lettuce'
  | 'nacho'
  | 'feta'
  | 'spinach'
  | 'marshmallow'
  | 'sprinkles'
  | 'potato'
  | 'rosemary'
  | 'hotSauce'
  | 'cheddar'
  | 'beef'
  | 'redStripes';

export type PizzaPerk =
  | 'damage'
  | 'coins'
  | 'stun'
  | 'explode'
  | 'regen'
  | 'shield'
  | 'burnStomper'
  | 'crit'
  | 'slices'
  | 'slowAbove'
  | 'thick'
  | 'super'
  | 'score'
  | 'luck'
  | 'garlic'
  | 'reroll'
  | 'healWeakest'
  | 'knockback'
  | 'burnHits'
  | 'combo'
  | 'slowHits'
  | 'double'
  | 'regenAll'
  | 'execute'
  | 'radius'
  | 'superStart'
  | 'coinsWave'
  | 'critDmg';

export interface PizzaType {
  id: string;
  name: string;
  perk: PizzaPerk;
  perkText: string;
  shape: 'round' | 'square' | 'calzone' | 'deep';
  base: 'tomato' | 'pesto' | 'bbq' | 'white' | 'choc';
  cheese: number; // 0..1 cheese coverage
  toppings: Topping[];
  crust: string;
  cost: number; // Golden Crust unlock cost (0 = starter)
}

export const PIZZAS: PizzaType[] = [
  {
    id: 'margherita', name: 'Margherita', perk: 'damage', perkText: '+10% smack damage',
    shape: 'round', base: 'tomato', cheese: 0.55, toppings: ['mozzarella', 'basil'], crust: '#d9963f', cost: 0,
  },
  {
    id: 'pepperoni', name: 'Pepperoni', perk: 'coins', perkText: '+20% tips from feet',
    shape: 'round', base: 'tomato', cheese: 1, toppings: ['pepperoni'], crust: '#d48f3c', cost: 0,
  },
  {
    id: 'funghi', name: 'Funghi', perk: 'stun', perkText: '+8% chance to stun feet',
    shape: 'round', base: 'tomato', cheese: 1, toppings: ['mushroom'], crust: '#d29342', cost: 0,
  },
  {
    id: 'hawaiian', name: 'Hawaiian', perk: 'explode', perkText: 'Smacked-down feet explode (15 dmg)',
    shape: 'round', base: 'tomato', cheese: 1, toppings: ['ham', 'pineapple'], crust: '#dc9a48', cost: 25,
  },
  {
    id: 'veggie', name: 'Garden Veggie', perk: 'regen', perkText: 'Regrows a slice every 20s',
    shape: 'round', base: 'tomato', cheese: 0.9, toppings: ['greenPepper', 'redPepper', 'onion', 'olive', 'tomato'], crust: '#d39646', cost: 40,
  },
  {
    id: 'formaggi', name: 'Quattro Formaggi', perk: 'shield', perkText: 'Blocks the first stomp each wave',
    shape: 'round', base: 'white', cheese: 1, toppings: ['blueCheese', 'parmesan', 'mozzarella'], crust: '#dca050', cost: 50,
  },
  {
    id: 'diavola', name: 'Diavola', perk: 'burnStomper', perkText: 'Feet that stomp it catch fire',
    shape: 'round', base: 'tomato', cheese: 0.9, toppings: ['salami', 'chili', 'jalapeno'], crust: '#cf8a38', cost: 70,
  },
  {
    id: 'bbq', name: 'BBQ Chicken', perk: 'crit', perkText: '+6% critical smack chance',
    shape: 'round', base: 'bbq', cheese: 1, toppings: ['chicken', 'onion', 'bbq'], crust: '#c9843a', cost: 90,
  },
  {
    id: 'meat', name: 'Meat Feast', perk: 'slices', perkText: 'Extra hearty: 12 slices instead of 8',
    shape: 'round', base: 'tomato', cheese: 1, toppings: ['pepperoni', 'sausage', 'bacon', 'ham'], crust: '#c88038', cost: 120,
  },
  {
    id: 'pesto', name: 'Pesto Genovese', perk: 'slowAbove', perkText: 'Feet above it move 25% slower',
    shape: 'round', base: 'pesto', cheese: 0.7, toppings: ['tomato', 'mozzarella', 'basil'], crust: '#d9a050', cost: 150,
  },
  {
    id: 'sicilian', name: 'Sicilian Square', perk: 'thick', perkText: 'Thick crust: 30% chance to block a stomp',
    shape: 'square', base: 'tomato', cheese: 0.85, toppings: ['basil', 'parmesan'], crust: '#c98a3e', cost: 170,
  },
  {
    id: 'dessert', name: 'Choco-Berry', perk: 'super', perkText: '+35% Peel Slam charge',
    shape: 'round', base: 'choc', cheese: 0, toppings: ['strawberry', 'chocolate'], crust: '#c8874a', cost: 200,
  },
  {
    id: 'truffle', name: 'Black Truffle', perk: 'score', perkText: '+25% score',
    shape: 'round', base: 'white', cheese: 0.9, toppings: ['truffle', 'arugula', 'parmesan'], crust: '#d79c52', cost: 260,
  },
  {
    id: 'marinara', name: 'Marinara', perk: 'garlic', perkText: 'Garlic aura: feet above it take 6 dmg/s',
    shape: 'round', base: 'tomato', cheese: 0, toppings: ['garlic', 'basil'], crust: '#d39646', cost: 30,
  },
  {
    id: 'capricciosa', name: 'Capricciosa', perk: 'reroll', perkText: '+1 free upgrade reroll each wave',
    shape: 'round', base: 'tomato', cheese: 0.9, toppings: ['ham', 'mushroom', 'artichoke', 'olive'], crust: '#d6973f', cost: 60,
  },
  {
    id: 'calzone', name: 'Calzone', perk: 'healWeakest', perkText: 'Patches the weakest pizza by 1 slice each wave',
    shape: 'calzone', base: 'tomato', cheese: 0, toppings: [], crust: '#d99a48', cost: 80,
  },
  {
    id: 'prosciutto', name: 'Prosciutto e Rucola', perk: 'knockback', perkText: '+35% smack knockback',
    shape: 'round', base: 'tomato', cheese: 0.8, toppings: ['prosciutto', 'arugula', 'parmesan'], crust: '#d7a050', cost: 100,
  },
  {
    id: 'buffalo', name: 'Buffalo Hot', perk: 'burnHits', perkText: 'Smacks set feet on fire (4 dmg/s)',
    shape: 'round', base: 'tomato', cheese: 1, toppings: ['chicken', 'blueCheese', 'hotSauce'], crust: '#cf8a38', cost: 110,
  },
  {
    id: 'breakfast', name: 'Breakfast Club', perk: 'combo', perkText: 'Combos last 0.6s longer',
    shape: 'round', base: 'white', cheese: 0.9, toppings: ['bacon', 'egg', 'cheddar'], crust: '#d79c4a', cost: 130,
  },
  {
    id: 'seafood', name: 'Frutti di Mare', perk: 'slowHits', perkText: 'Smacks chill feet (-20% speed)',
    shape: 'round', base: 'tomato', cheese: 0.5, toppings: ['shrimp', 'mussel', 'squid', 'basil'], crust: '#d39646', cost: 140,
  },
  {
    id: 'taco', name: 'Taco Fiesta', perk: 'double', perkText: '10% chance to smack twice',
    shape: 'round', base: 'tomato', cheese: 1, toppings: ['beef', 'cheddar', 'lettuce', 'tomato', 'nacho'], crust: '#d8a245', cost: 160,
  },
  {
    id: 'spinach', name: 'Spinach & Feta', perk: 'regenAll', perkText: 'Every pizza regrows 1 slice each wave',
    shape: 'round', base: 'white', cheese: 0.7, toppings: ['spinach', 'feta', 'garlic'], crust: '#d9a050', cost: 190,
  },
  {
    id: 'detroit', name: 'Detroit Red Top', perk: 'execute', perkText: 'Feet under 12% HP are smacked out instantly',
    shape: 'square', base: 'white', cheese: 1, toppings: ['pepperoni', 'redStripes'], crust: '#b8742c', cost: 220,
  },
  {
    id: 'deepdish', name: 'Chicago Deep Dish', perk: 'radius', perkText: '+20% smack area',
    shape: 'deep', base: 'tomato', cheese: 0, toppings: ['sausage', 'parmesan', 'basil'], crust: '#c88a3e', cost: 240,
  },
  {
    id: 'smores', name: 'S\'mores', perk: 'superStart', perkText: 'Start each wave with 40% Peel Slam',
    shape: 'round', base: 'choc', cheese: 0, toppings: ['marshmallow', 'chocolate'], crust: '#b97a3e', cost: 280,
  },
  {
    id: 'bianca', name: 'Patate e Rosmarino', perk: 'coinsWave', perkText: '+8 tips for every wave cleared',
    shape: 'round', base: 'white', cheese: 0.6, toppings: ['potato', 'rosemary', 'parmesan'], crust: '#dca355', cost: 300,
  },
  {
    id: 'unicorn', name: 'Unicorn Dream', perk: 'critDmg', perkText: '+60% critical smack damage',
    shape: 'round', base: 'white', cheese: 0, toppings: ['marshmallow', 'sprinkles', 'strawberry'], crust: '#e0a86a', cost: 330,
  },
  {
    id: 'golden', name: 'The Golden Pie', perk: 'luck', perkText: 'Better upgrade rarity & +15% tips',
    shape: 'round', base: 'tomato', cheese: 1, toppings: ['pepperoni', 'goldLeaf', 'basil'], crust: '#e0a83e', cost: 400,
  },
];

export const PIZZA_BY_ID: Record<string, PizzaType> = Object.fromEntries(PIZZAS.map((p) => [p.id, p]));
