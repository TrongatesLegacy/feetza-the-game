// Pizza varieties. Each pizza on the table grants its perk while it still has slices left.

import { meterBoostText, slamStunText, superStartText } from '../game/slamMode';
import { CONTENT_PIZZAS } from '../content/pizzaData';

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
  | 'redStripes'
  | (string & {}); // Feetza 2.0 toppings, drawn in src/art/toppings2.ts

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
  | 'critDmg'
  // ——— Feetza 2.0 perks ———
  | 'splash' | 'bigHurt' | 'bossDmg' | 'tenthCrit' | 'cutter'
  | 'neighbourShield' | 'sturdyMulti' | 'immuneEffects' | 'heatAbove' | 'rotate'
  | 'quickTips' | 'counterDiscount' | 'extraConsumable' | 'crustBonus' | 'refund'
  | 'preserve' | 'neverStale' | 'staleHeal' | 'riseOnce' | 'bossRegrow'
  | 'stunVuln' | 'markFirst' | 'disarm' | 'slamStun' | 'miniWeak'
  | 'bounceTop' | 'perkBoost' | 'freeTopping'
  // ——— Phase 3 perks (run by src/game/pizzaPerks.ts) ———
  | 'tipsAbove' | 'nearDmg' | 'slowWait' | 'wave5Tips' | 'fullSpeed' | 'stompMeter' | 'meatball' | 'fastDmg'
  | 'bossShield' | 'hoverFire' | 'freshTips' | 'stickyStomp' | 'slipStomp' | 'neighbourRegrow' | 'honeyStomp'
  | 'fullBoss' | 'scoreAbove' | 'crustWaves' | 'phaseHeal' | 'firstFreeze' | 'killReroll' | 'varietyDmg'
  | 'shinyDouble' | 'bossTips' | 'miniDmg' | 'eventDrops' | 'knockAbove' | 'stompCooldown' | 'goldenDouble'
  | 'actStart' | 'slayer' | 'bigStart' | 'killSlices' | 'perfectTips' | 'burnAbove' | 'crustRun' | 'peelDmg'
  | 'comboLong' | 'firstBack' | 'smackSpeed' | 'nightDmg' | 'frostFire' | 'surviveOnce'
  | 'rainbow' | 'postBoss' | 'fireLane' | 'ghostPass' | 'mystery' | 'eventChance' | 'timeStop' | 'meteor'
  | 'erupt' | 'pinata' | 'orbitRing' | 'goldenDiscount' | 'treasure' | 'nonna';

export interface PizzaType {
  id: string;
  name: string;
  perk: PizzaPerk;
  perkText: string;
  shape: 'round' | 'square' | 'calzone' | 'deep';
  base: 'tomato' | 'pesto' | 'bbq' | 'white' | 'choc' | 'saffron' | 'ink' | 'moon' | 'pink';
  cheese: number; // 0..1 cheese coverage
  toppings: Topping[];
  crust: string;
  cost: number; // Golden Crust unlock cost (0 = starter)
  /** How a locked pizza is unlocked: bought at the shop counter as a Chef's Special (coins), bought
   * in the Pizzeria (crusts), won by its milestone (MILESTONES in data/meta.ts names it), or found
   * by luck on the new-run screen (bought there with crusts). Starters are 'pizzeria' at cost 0. */
  route: PizzaRoute;
  /** Rare Finds' special finish: a coloured glow and sparkles on the table, and a see-through ghost. */
  finish?: { glow?: number; sparkle?: boolean; ghost?: boolean };
}

export type PizzaRoute = 'special' | 'pizzeria' | 'milestone' | 'rare';

export const PIZZAS: PizzaType[] = [
  {
    id: 'margherita', name: 'Margherita', perk: 'damage', perkText: '+10% smack damage',
    shape: 'round', base: 'tomato', cheese: 0.55, toppings: ['mozzarella', 'basil'], crust: '#d9963f', cost: 0, route: 'pizzeria',
  },
  {
    id: 'pepperoni', name: 'Pepperoni', perk: 'coins', perkText: '+20% tips from feet',
    shape: 'round', base: 'tomato', cheese: 1, toppings: ['pepperoni'], crust: '#d48f3c', cost: 0, route: 'pizzeria',
  },
  {
    id: 'funghi', name: 'Funghi', perk: 'stun', perkText: '+8% chance to stun feet',
    shape: 'round', base: 'tomato', cheese: 1, toppings: ['mushroom'], crust: '#d29342', cost: 0, route: 'pizzeria',
  },
  {
    id: 'hawaiian', name: 'Hawaiian', perk: 'explode', perkText: 'Smacked-down feet explode (15 dmg)',
    shape: 'round', base: 'tomato', cheese: 1, toppings: ['ham', 'pineapple'], crust: '#dc9a48', cost: 40, route: 'special',
  },
  {
    id: 'veggie', name: 'Garden Veggie', perk: 'regen', perkText: 'Regrows a slice every 20s',
    shape: 'round', base: 'tomato', cheese: 0.9, toppings: ['greenPepper', 'redPepper', 'onion', 'olive', 'tomato'], crust: '#d39646', cost: 60, route: 'special',
  },
  {
    id: 'formaggi', name: 'Quattro Formaggi', perk: 'shield', perkText: 'Blocks the first stomp each wave',
    shape: 'round', base: 'white', cheese: 1, toppings: ['blueCheese', 'parmesan', 'mozzarella'], crust: '#dca050', cost: 75, route: 'special',
  },
  {
    id: 'diavola', name: 'Diavola', perk: 'burnStomper', perkText: 'Feet that stomp it catch fire',
    shape: 'round', base: 'tomato', cheese: 0.9, toppings: ['salami', 'chili', 'jalapeno'], crust: '#cf8a38', cost: 105, route: 'special',
  },
  {
    id: 'bbq', name: 'BBQ Chicken', perk: 'crit', perkText: '+6% critical smack chance',
    shape: 'round', base: 'bbq', cheese: 1, toppings: ['chicken', 'onion', 'bbq'], crust: '#c9843a', cost: 135, route: 'special',
  },
  {
    id: 'meat', name: 'Meat Feast', perk: 'slices', perkText: 'Extra hearty: 12 slices instead of 8',
    shape: 'round', base: 'tomato', cheese: 1, toppings: ['pepperoni', 'sausage', 'bacon', 'ham'], crust: '#c88038', cost: 180, route: 'special',
  },
  {
    id: 'pesto', name: 'Pesto Genovese', perk: 'slowAbove', perkText: 'Feet above it move 25% slower',
    shape: 'round', base: 'pesto', cheese: 0.7, toppings: ['tomato', 'mozzarella', 'basil'], crust: '#d9a050', cost: 225, route: 'pizzeria',
  },
  {
    id: 'sicilian', name: 'Sicilian Square', perk: 'thick', perkText: 'Thick crust: 30% chance to block a stomp',
    shape: 'square', base: 'tomato', cheese: 0.85, toppings: ['basil', 'parmesan'], crust: '#c98a3e', cost: 255, route: 'pizzeria',
  },
  {
    id: 'dessert', name: 'Choco-Berry', perk: 'super', get perkText() { return meterBoostText(35); },
    shape: 'round', base: 'choc', cheese: 0, toppings: ['strawberry', 'chocolate'], crust: '#c8874a', cost: 300, route: 'milestone',
  },
  {
    id: 'truffle', name: 'Black Truffle', perk: 'score', perkText: '+25% score',
    shape: 'round', base: 'white', cheese: 0.9, toppings: ['truffle', 'arugula', 'parmesan'], crust: '#d79c52', cost: 390, route: 'milestone',
  },
  {
    id: 'marinara', name: 'Marinara', perk: 'garlic', perkText: 'Garlic aura: feet above it take 6 dmg/s',
    shape: 'round', base: 'tomato', cheese: 0, toppings: ['garlic', 'basil'], crust: '#d39646', cost: 45, route: 'special',
  },
  {
    id: 'capricciosa', name: 'Capricciosa', perk: 'reroll', perkText: '+1 free upgrade reroll each wave',
    shape: 'round', base: 'tomato', cheese: 0.9, toppings: ['ham', 'mushroom', 'artichoke', 'olive'], crust: '#d6973f', cost: 90, route: 'special',
  },
  {
    id: 'calzone', name: 'Calzone', perk: 'healWeakest', perkText: 'Patches the weakest pizza by 1 slice each wave',
    shape: 'calzone', base: 'tomato', cheese: 0, toppings: [], crust: '#d99a48', cost: 120, route: 'special',
  },
  {
    id: 'prosciutto', name: 'Prosciutto e Rucola', perk: 'knockback', perkText: '+35% smack knockback',
    shape: 'round', base: 'tomato', cheese: 0.8, toppings: ['prosciutto', 'arugula', 'parmesan'], crust: '#d7a050', cost: 150, route: 'special',
  },
  {
    id: 'buffalo', name: 'Buffalo Hot', perk: 'burnHits', perkText: 'Smacks set feet on fire (4 dmg/s)',
    shape: 'round', base: 'tomato', cheese: 1, toppings: ['chicken', 'blueCheese', 'hotSauce'], crust: '#cf8a38', cost: 165, route: 'special',
  },
  {
    id: 'breakfast', name: 'Breakfast Club', perk: 'combo', perkText: 'Combos last 0.6s longer',
    shape: 'round', base: 'white', cheese: 0.9, toppings: ['bacon', 'egg', 'cheddar'], crust: '#d79c4a', cost: 195, route: 'special',
  },
  {
    id: 'seafood', name: 'Frutti di Mare', perk: 'slowHits', perkText: 'Smacks chill feet (-20% speed)',
    shape: 'round', base: 'tomato', cheese: 0.5, toppings: ['shrimp', 'mussel', 'squid', 'basil'], crust: '#d39646', cost: 210, route: 'special',
  },
  {
    id: 'taco', name: 'Taco Fiesta', perk: 'double', perkText: '10% chance to smack twice',
    shape: 'round', base: 'tomato', cheese: 1, toppings: ['beef', 'cheddar', 'lettuce', 'tomato', 'nacho'], crust: '#d8a245', cost: 240, route: 'special',
  },
  {
    id: 'spinach', name: 'Spinach & Feta', perk: 'regenAll', perkText: 'Every pizza regrows 1 slice each wave',
    shape: 'round', base: 'white', cheese: 0.7, toppings: ['spinach', 'feta', 'garlic'], crust: '#d9a050', cost: 285, route: 'special',
  },
  {
    id: 'detroit', name: 'Detroit Red Top', perk: 'execute', perkText: 'Feet under 12% HP are smacked out instantly',
    shape: 'square', base: 'white', cheese: 1, toppings: ['pepperoni', 'redStripes'], crust: '#b8742c', cost: 330, route: 'milestone',
  },
  {
    id: 'deepdish', name: 'Chicago Deep Dish', perk: 'radius', perkText: '+20% smack area',
    shape: 'deep', base: 'tomato', cheese: 0, toppings: ['sausage', 'parmesan', 'basil'], crust: '#c88a3e', cost: 360, route: 'milestone',
  },
  {
    id: 'smores', name: 'S\'mores', perk: 'superStart', get perkText() { return superStartText(40); },
    shape: 'round', base: 'choc', cheese: 0, toppings: ['marshmallow', 'chocolate'], crust: '#b97a3e', cost: 420, route: 'milestone',
  },
  {
    id: 'bianca', name: 'Patate e Rosmarino', perk: 'coinsWave', perkText: '+8 tips for every wave cleared',
    shape: 'round', base: 'white', cheese: 0.6, toppings: ['potato', 'rosemary', 'parmesan'], crust: '#dca355', cost: 450, route: 'pizzeria',
  },
  {
    id: 'unicorn', name: 'Unicorn Dream', perk: 'critDmg', perkText: '+60% critical smack damage',
    shape: 'round', base: 'white', cheese: 0, toppings: ['marshmallow', 'sprinkles', 'strawberry'], crust: '#e0a86a', cost: 495, route: 'milestone',
  },
  {
    id: 'golden', name: 'The Golden Pie', perk: 'luck', perkText: 'Better upgrade rarity & +15% tips',
    shape: 'round', base: 'tomato', cheese: 1, toppings: ['pepperoni', 'goldLeaf', 'basil'], crust: '#e0a83e', cost: 600, route: 'milestone',
  },
];

PIZZAS.push(...CONTENT_PIZZAS);

export const PIZZA_BY_ID: Record<string, PizzaType> = Object.fromEntries(PIZZAS.map((p) => [p.id, p]));

/** Enhance a Pizza: each perk's stronger version. Perks with numbers are about +50% (Run.recompute
 * counts an enhanced pizza as 1.5 of its perk); the rest get an upgraded effect, handled where the
 * perk is (GameScene). Every perk needs an entry, so a new perk can't ship without its enhanced one. */
export const ENHANCED_PERK: Record<PizzaPerk, string | (() => string)> = {
  damage: '+15% smack damage',
  coins: '+30% tips from feet',
  stun: '+12% chance to stun feet',
  explode: 'Smacked-down feet explode (23 dmg)',
  regen: 'Regrows a slice every 13s',
  shield: 'Blocks the first 2 stomps each wave',
  burnStomper: 'Feet that stomp it burn 50% hotter',
  crit: '+9% critical smack chance',
  slices: 'Extra hearty: 14 slices instead of 8',
  slowAbove: 'Feet above it move 38% slower',
  thick: 'Thick crust: 45% chance to block a stomp',
  super: () => meterBoostText(53),
  score: '+38% score',
  luck: 'Better upgrade rarity & +23% tips',
  garlic: 'Garlic aura: feet above it take 9 dmg/s',
  reroll: '+2 free upgrade rerolls each wave',
  healWeakest: 'Patches the weakest pizza by 2 slices each wave',
  knockback: '+53% smack knockback',
  burnHits: 'Smacks set feet on fire (6 dmg/s)',
  combo: 'Combos last 0.9s longer',
  slowHits: 'Smacks chill feet (-30% speed)',
  double: '15% chance to smack twice',
  regenAll: 'Every pizza regrows 2 slices each wave',
  execute: 'Feet under 18% HP are smacked out instantly',
  radius: '+30% smack area',
  superStart: () => superStartText(60),
  coinsWave: '+12 tips for every wave cleared',
  critDmg: '+90% critical smack damage',
  splash: 'Smacks splash 6 dmg onto nearby feet',
  bigHurt: '+23% damage to feet above half HP',
  bossDmg: '+30% damage to bosses and mini-bosses',
  tenthCrit: 'Every 7th smack is a guaranteed crit',
  cutter: '+2 orbiting cutters',
  neighbourShield: 'It and neighbours block 1st stomp',
  sturdyMulti: 'Immune to multi-stomps; 15% stomp block',
  immuneEffects: 'It and neighbours resist soggy, scorch',
  heatAbove: 'Feet hovering above burn (4.5 dmg/s)',
  rotate: 'Each wave: stronger dmg, tips, regrow or shield',
  quickTips: '+2 tips per smack within 1s of the last',
  counterDiscount: 'Pizza counter prices -23%',
  extraConsumable: '+2 consumable cards offered each wave',
  crustBonus: '+23% Golden Crusts if on table at end',
  refund: 'Refunds 75% of its price when swapped',
  preserve: 'Neighbours go stale a quarter as fast',
  neverStale: 'Never stale; bosses +2 freshness to all',
  staleHeal: 'When stale, heals all pizzas 3 slices',
  riseOnce: 'Rises once with 5 slices when destroyed',
  bossRegrow: '8 slices, all regrow after every boss',
  stunVuln: 'Stunned feet nearby take +75% damage',
  markFirst: '1st attacker each wave takes 3x damage',
  disarm: 'Smacked feet above lose trait for 5s',
  slamStun: () => slamStunText().replace('1.5s', '2.5s').replace('may stun', 'often stun'),
  miniWeak: 'Mini-bosses spawn with 30% less health',
  bounceTop: "First 2 smacks above it each wave: to top",
  perkBoost: "Every other pizza's perk is 8% stronger",
  freeTopping: 'Every 3rd wave: 1 free shop topping',
  // Phase 3
  tipsAbove: '+2 tips for every foot defeated above it',
  nearDmg: 'Smacks near it deal +15% damage',
  slowWait: 'Hovering feet slow 15% more per second',
  wave5Tips: 'Every 5th wave: +38 tips',
  fullSpeed: 'Smacks 15% faster with all slices left',
  stompMeter: 'Stomps on it charge your meter 8%',
  meatball: 'Kills above it roll a meatball (×1.5)',
  fastDmg: '+23% damage to fast feet',
  bossShield: '+2 shields at the start of boss waves',
  hoverFire: 'Feet hovering over 1.3s catch fire',
  freshTips: "+15% tips while it's fully fresh",
  stickyStomp: 'Stompers get sticky (60% slow, 3s)',
  slipStomp: 'Its stomper slips (0.8s stun)',
  neighbourRegrow: 'Neighbours regrow a slice every 2 waves',
  honeyStomp: 'Hot honey: 60% slow, burns 1.5×/s',
  fullBoss: 'Bosses take +23% damage at full slices',
  scoreAbove: '+45% score from feet above it',
  crustWaves: '+1 Golden Crust per 7 waves it survives',
  phaseHeal: 'Heals 2 slices when a boss changes phase',
  firstFreeze: "Each wave's first stomper freezes for 3s",
  killReroll: 'Every 7 kills above it: a free reroll',
  varietyDmg: '+8% damage per different pizza out',
  shinyDouble: 'Shiny feet three times as likely',
  bossTips: '+30% tips on boss waves',
  miniDmg: 'Mini-bosses take +38% damage',
  eventDrops: 'Event peel drops 38% more likely',
  knockAbove: '+60% knockback above it',
  stompCooldown: "Can't be stomped twice within 3s",
  goldenDouble: 'Golden feet pay triple tips',
  actStart: "+15% dmg & tips on an act's first wave",
  slayer: '+30% damage to bosses',
  bigStart: 'Starts every run with 12 slices',
  killSlices: 'Every 70 kills: +1 slice on every pizza',
  perfectTips: '+75% tips on perfect waves',
  burnAbove: 'Feet above it burn 50% hotter; fireproof',
  crustRun: '+15% Golden Crusts if on table at end',
  peelDmg: '+1.5% damage for every 10 peels you own',
  comboLong: 'Combos last 2.5 times as long',
  firstBack: 'First pizza lost comes back fully baked',
  smackSpeed: 'Smacks 23% faster',
  nightDmg: '+30% damage on night stages',
  frostFire: 'Stompers frozen 2s, then burned hotter',
  surviveOnce: 'Once a run, it survives on 3 slices',
  rainbow: 'Each wave: borrows an enhanced perk',
  postBoss: '×2.5 damage the wave after a boss',
  fireLane: '15% of smacks breathe fire down a lane',
  ghostPass: '38% of stomps on it pass right through',
  mystery: 'A random huge perk, revealed on wave 1',
  eventChance: 'Wave events 38% more likely',
  timeStop: 'Each wave starts with feet frozen 4.5s',
  meteor: 'Every 10s a meteor hits a foot (×3)',
  erupt: 'Its last slice lost: erupts, ×15 to all',
  pinata: 'Kills above it: 30% burst into tips',
  orbitRing: 'Two ghost pineapple rings orbit it (×1)',
  goldenDiscount: 'Golden Menu items cost 38% less',
  treasure: "A richer chest on each stage's wave 4",
  nonna: 'Twice per act, fully heals every pizza',
};

/** A perk's enhanced text. */
export function enhancedText(perk: PizzaPerk): string {
  const t = ENHANCED_PERK[perk];
  return typeof t === 'function' ? t() : t;
}

/** Quattro Stagioni's seasons: the perk it grants each wave, with its plain and enhanced text. */
export const SEASONS: PizzaPerk[] = ['damage', 'coins', 'regen', 'shield'];
