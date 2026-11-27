// The 28 Feetza 2.0 pizzas. Toppings not in src/art/pizzaArt.ts or toppingsExtra.ts are drawn in
// src/content/art/toppings-new.ts. perkText must stay at 40 characters or fewer (one card line).
import { slamStunText } from '../../game/slamMode';
import type { PizzaType } from '../../data/pizzas';

export const pizzas: PizzaType[] = [
  // ——— Offence ———
  {
    id: 'nduja', name: 'Nduja', perk: 'splash', perkText: 'Smacks splash 4 dmg onto nearby feet',
    shape: 'round', base: 'tomato', cheese: 0.8, toppings: ['basil', 'nduja'], crust: '#d4923e', cost: 200, route: 'pizzeria', rarity: 'common',
  },
  {
    id: 'hothoney', name: 'Hot Honey Pepperoni', perk: 'bigHurt', perkText: '+15% damage to feet above half HP',
    shape: 'round', base: 'tomato', cheese: 1, toppings: ['chili', 'cupPepperoni', 'honeyDrizzle'], crust: '#cf8a3a', cost: 180, route: 'pizzeria', rarity: 'common',
  },
  {
    id: 'calabrese', name: 'Calabrese', perk: 'bossDmg', perkText: '+20% damage to bosses and mini-bosses',
    shape: 'round', base: 'tomato', cheese: 0.9, toppings: ['calabreseSalami', 'longChili', 'oregano'], crust: '#c9843a', cost: 410, route: 'pizzeria', rarity: 'rare',
  },
  {
    id: 'puttanesca', name: 'Puttanesca', perk: 'tenthCrit', perkText: 'Every 10th smack is a guaranteed crit',
    shape: 'round', base: 'tomato', cheese: 0, toppings: ['olive', 'anchovy', 'caper'], crust: '#d39646', cost: 250, route: 'pizzeria', rarity: 'common',
  },
  {
    id: 'philly', name: 'Philly Cheesesteak', perk: 'cutter', perkText: '+1 orbiting cutter',
    shape: 'round', base: 'white', cheese: 0.5, toppings: ['greenPepper', 'onion', 'provolone', 'steak'], crust: '#d29a4c', cost: 500, route: 'pizzeria', rarity: 'rare',
  },
  // ——— Defence ———
  {
    id: 'grandma', name: 'Grandma Square', perk: 'neighbourShield', perkText: 'Neighbours block 1st stomp each wave',
    shape: 'square', base: 'white', cheese: 0.9, toppings: ['garlic', 'basil', 'crushedTomato'], crust: '#c4843a', cost: 390, route: 'pizzeria', rarity: 'rare',
  },
  {
    id: 'stromboli', name: 'Stromboli', perk: 'sturdyMulti', perkText: 'Immune to double and squash stomps',
    shape: 'square', base: 'tomato', cheese: 0, toppings: ['stromboliLoaf'], crust: '#c98a3e', cost: 160, route: 'milestone', rarity: 'common',
  },
  {
    id: 'whitepie', name: 'Pizza Bianca', perk: 'immuneEffects', perkText: 'Immune to soggy and scorch',
    shape: 'round', base: 'white', cheese: 0.55, toppings: ['basil', 'ricotta', 'lemon'], crust: '#ddb064', cost: 170, route: 'milestone', rarity: 'common',
  },
  {
    id: 'flambee', name: 'Tarte Flambée', perk: 'heatAbove', perkText: 'Feet hovering above burn (3 dmg/s)',
    shape: 'round', base: 'white', cheese: 0, toppings: ['cremeFraiche', 'whiteOnion', 'lardons', 'chives'], crust: '#e2b46a', cost: 260, route: 'pizzeria', rarity: 'common',
  },
  {
    id: 'stagioni', name: 'Quattro Stagioni', perk: 'rotate', perkText: 'Each wave: dmg, tips, regrow or shield',
    shape: 'round', base: 'tomato', cheese: 0.6, toppings: ['stagioni'], crust: '#d6973f', cost: 570, route: 'rare', rarity: 'rare',
  },
  // ——— Economy ———
  {
    id: 'nyslice', name: 'New York Slice', perk: 'quickTips', perkText: '+1 tip per smack within 1s of the last',
    shape: 'round', base: 'tomato', cheese: 1, toppings: ['grease', 'oregano', 'chili'], crust: '#d79a48', cost: 145, route: 'special', rarity: 'rare',
  },
  {
    id: 'kebab', name: 'Kebab Pizza', perk: 'counterDiscount', perkText: 'Pizza counter prices -15%',
    shape: 'round', base: 'tomato', cheese: 0.7, toppings: ['onion', 'kebabMeat', 'pepperoncini', 'garlicSauce'], crust: '#d39646', cost: 150, route: 'special', rarity: 'rare',
  },
  {
    id: 'maccheese', name: 'Mac & Cheese', perk: 'extraConsumable', perkText: '+1 consumable card offered each wave',
    shape: 'round', base: 'white', cheese: 1, toppings: ['macaroni', 'breadcrumbs'], crust: '#d9a050', cost: 460, route: 'milestone', rarity: 'rare',
  },
  {
    id: 'fig', name: 'Fig & Gorgonzola', perk: 'crustBonus', perkText: '+15% Golden Crusts if on table at end',
    shape: 'round', base: 'white', cheese: 0.6, toppings: ['arugula', 'gorgonzola', 'fig', 'balsamic'], crust: '#d4984a', cost: 450, route: 'pizzeria', rarity: 'rare',
  },
  {
    id: 'taglio', name: 'Pizza al Taglio', perk: 'refund', perkText: 'Refunds 50% of its price when swapped',
    shape: 'square', base: 'tomato', cheese: 0.55, toppings: ['zucchini', 'mortadella', 'pistachio'], crust: '#d8a24e', cost: 150, route: 'pizzeria', rarity: 'common',
  },
  // ——— Freshness and healing ———
  {
    id: 'pickle', name: 'Pickle Pie', perk: 'preserve', perkText: 'Neighbours go stale half as fast',
    shape: 'round', base: 'white', cheese: 0.9, toppings: ['garlic', 'pickle', 'dill'], crust: '#d6a050', cost: 190, route: 'pizzeria', rarity: 'common',
  },
  {
    id: 'pumpkin', name: 'Pumpkin Spice', perk: 'neverStale', perkText: 'Never stale; bosses +1 freshness to all',
    shape: 'round', base: 'white', cheese: 0.5, toppings: ['pumpkin', 'sage', 'pepita'], crust: '#c8803a', cost: 530, route: 'milestone', rarity: 'rare',
  },
  {
    id: 'fritta', name: 'Pizza Fritta', perk: 'staleHeal', perkText: 'When it goes stale, heals every other pizza 2 slices',
    shape: 'round', base: 'tomato', cheese: 0, toppings: ['basil', 'friedPuff', 'ricotta'], crust: '#e8a83a', cost: 460, route: 'rare', rarity: 'rare',
  },
  {
    id: 'carbonara', name: 'Carbonara', perk: 'riseOnce', perkText: 'Rises once with 3 slices when destroyed',
    shape: 'round', base: 'white', cheese: 0.7, toppings: ['guanciale', 'blackPepper', 'carbonaraYolk'], crust: '#d8a052', cost: 490, route: 'milestone', rarity: 'rare',
  },
  {
    id: 'lahmacun', name: 'Lahmacun', perk: 'bossRegrow', perkText: '6 slices, all regrow after every boss',
    shape: 'round', base: 'tomato', cheese: 0, toppings: ['mince', 'parsley'], crust: '#dcaa60', cost: 430, route: 'pizzeria', rarity: 'rare',
  },
  // ——— Control ———
  {
    id: 'okonomiyaki', name: 'Okonomiyaki', perk: 'stunVuln', perkText: 'Stunned feet nearby take +50% damage',
    shape: 'round', base: 'bbq', cheese: 0, toppings: ['mayoZigzag', 'aonori', 'bonito', 'pickledGinger'], crust: '#e0b070', cost: 520, route: 'rare', rarity: 'rare',
  },
  {
    id: 'tandoori', name: 'Tandoori', perk: 'markFirst', perkText: '1st attacker each wave takes 2x damage',
    shape: 'round', base: 'tomato', cheese: 0.8, toppings: ['onion', 'tandooriChicken', 'raita', 'parsley'], crust: '#d39040', cost: 230, route: 'pizzeria', rarity: 'common',
  },
  {
    id: 'greek', name: 'Greek', perk: 'disarm', perkText: 'Smacked feet above lose trait for 3s',
    shape: 'round', base: 'tomato', cheese: 0.7, toppings: ['onion', 'feta', 'kalamata', 'oregano'], crust: '#d9a050', cost: 155, route: 'special', rarity: 'rare',
  },
  {
    id: 'cajun', name: 'Cajun Shrimp', perk: 'slamStun', get perkText() { return slamStunText(); },
    shape: 'round', base: 'tomato', cheese: 0.9, toppings: ['greenPepper', 'andouille', 'cajunShrimp'], crust: '#c98238', cost: 510, route: 'milestone', rarity: 'rare',
  },
  {
    id: 'salsiccia', name: 'Salsiccia e Friarielli', perk: 'miniWeak', perkText: 'Mini-bosses spawn with 20% less health',
    shape: 'round', base: 'white', cheese: 0.8, toppings: ['sausage', 'friarielli', 'chili'], crust: '#d29342', cost: 220, route: 'pizzeria', rarity: 'common',
  },
  // ——— Wild ———
  {
    id: 'marshmallow', name: 'Mallow Mountain', perk: 'bounceTop', perkText: 'Wave\'s 1st smack above it: back to top',
    shape: 'round', base: 'choc', cheese: 0, toppings: ['grahamCrumb', 'marshMountain'], crust: '#b98a52', cost: 180, route: 'milestone', rarity: 'common',
  },
  {
    id: 'napoletana', name: 'Napoletana', perk: 'perkBoost', perkText: 'Every other pizza\'s perk is 5% stronger',
    shape: 'round', base: 'tomato', cheese: 0, toppings: ['basil', 'buffalo', 'cherryTomato', 'leopard'], crust: '#e6b86c', cost: 520, route: 'pizzeria', rarity: 'rare',
  },
  {
    id: 'birthday', name: 'Birthday Cake Pizza', perk: 'freeTopping', perkText: 'Every 5th wave: 1 free shop topping',
    shape: 'round', base: 'white', cheese: 0, toppings: ['sprinkles', 'frostingRosette', 'candles'], crust: '#e4b478', cost: 540, route: 'rare', rarity: 'rare',
  },
];
