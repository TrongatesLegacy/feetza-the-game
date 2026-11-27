// Permanent upgrades bought with Golden Crusts in the Pizzeria between runs.

import { JOURNEY_WAVES } from './stages';

export interface MetaUpgrade {
  id: string;
  name: string;
  icon: string;
  desc: string;
  costs: number[]; // cost per level
}

export const META: MetaUpgrade[] = [
  { id: 'wrists', name: 'Strong Wrists', icon: '💪', desc: '+8% smack damage per level', costs: [75, 150, 250, 400, 600] },
  { id: 'tips', name: 'Tip Culture', icon: '🪙', desc: '+10% tips per level', costs: [60, 125, 225, 350, 500] },
  { id: 'pies', name: 'Bigger Pies', icon: '🥧', desc: '+1 slice on every pizza per level', costs: [125, 300, 625] },
  { id: 'apron', name: 'Lucky Apron', icon: '🍀', desc: 'Better upgrade rarities', costs: [150, 350, 750] },
  { id: 'opinion', name: 'Second Opinion', icon: '🎲', desc: '+1 free reroll in every shop', costs: [200, 500] },
  { id: 'preheat', name: 'Pre-Heated Peel', icon: '🔥', desc: 'Start every run with a full meter (Peel Slam or ability)', costs: [250] },
  { id: 'headstart', name: 'Head Start', icon: '🚀', desc: 'Start each run with a rare topping', costs: [375] },
  { id: 'table', name: 'Extra Table Space', icon: '🍽️', desc: 'Start with 4 pizzas instead of 3', costs: [700] },
  { id: 'indecisive', name: 'Indecisive Chef', icon: '🤔', desc: '4 topping cards in every shop, not 3', costs: [1000] },
];

/** Prices before Feetza 2.0, kept so Reset refunds what veterans actually paid. */
export const META_COSTS_V1: Record<string, number[]> = {
  wrists: [30, 60, 100, 160, 240],
  tips: [25, 50, 90, 140, 200],
  pies: [50, 120, 250],
  apron: [60, 140, 300],
  opinion: [80, 200],
  preheat: [100],
  headstart: [150],
  table: [280],
  indecisive: [400],
};

export const META_BY_ID: Record<string, MetaUpgrade> = Object.fromEntries(META.map((m) => [m.id, m]));

/** One-off goals. Each names the pizza it unlocks (its route is 'milestone'); the ones without a
 * pizza pay 50 Golden Crusts. Progress lives in milestoneProgress (game/Run.ts). */
export interface Milestone {
  id: string;
  name: string;
  pizza?: string;
}

export const MILESTONES: Milestone[] = [
  { id: 'firstWave3', name: 'Survive to wave 3', pizza: 'dessert' },
  { id: 'feet150', name: 'Smack 150 feet', pizza: 'smores' },
  { id: 'wave10', name: 'Reach wave 10', pizza: 'deepdish' },
  { id: 'bosses3', name: 'Beat 3 different bosses', pizza: 'detroit' },
  { id: 'feet600', name: 'Smack 600 feet', pizza: 'maccheese' },
  { id: 'act1', name: 'Beat wave 30', pizza: 'carbonara' },
  { id: 'bosses12', name: 'Beat 12 different bosses', pizza: 'cajun' },
  { id: 'feet1500', name: 'Smack 1,500 feet', pizza: 'marshmallow' },
  { id: 'bosses18', name: 'Beat 18 different bosses', pizza: 'pumpkin' },
  { id: 'journey', name: `Finish the journey (wave ${JOURNEY_WAVES})`, pizza: 'golden' },
  { id: 'allBosses', name: 'Beat all 24 bosses', pizza: 'unicorn' },
  { id: 'hot30', name: 'Beat wave 30 on Hot', pizza: 'truffle' },
  { id: 'extrahot30', name: 'Beat wave 30 on Extra Hot' },
  { id: 'inferno30', name: 'Beat wave 30 on Inferno', pizza: 'infernocalzone' },
  // phase 3 milestone prizes (progress in milestoneProgress, records in save.pizzaGoals)
  { id: 'act1Lap', name: 'Beat wave 30', pizza: 'victorylap' },
  { id: 'wave100', name: 'Reach wave 100', pizza: 'century' },
  { id: 'perfect10', name: '10 perfect waves in a row', pizza: 'perfectpie' },
  { id: 'runs25', name: 'Play 25 runs', pizza: 'anniversary' },
  { id: 'peels100', name: 'Own 100 peels', pizza: 'peelcollector' },
  { id: 'untouched', name: 'Finish a run without losing a pizza', pizza: 'untouchable' },
  { id: 'fastWave', name: 'Clear a wave in under 8s', pizza: 'speedslice' },
  { id: 'night10', name: 'Play 10 runs after 10pm', pizza: 'nightshift' },
  { id: 'surtr', name: 'Beat Surtr', pizza: 'ragnarok' },
  { id: 'hades', name: 'Beat Hades', pizza: 'olympian' },
  // the pizza plan's route moves (docs/pizza-plan.md, step 1): eight Common Pizzeria pizzas became milestone prizes.
  { id: 'wave60', name: 'Reach wave 60', pizza: 'stromboli' },
  { id: 'soggyScorch', name: 'Defeat 150 feet that leave pizzas soggy or scorched', pizza: 'whitepie' },
  { id: 'pier25', name: 'Clear 25 waves at The Pier', pizza: 'saffronlobster' },
  { id: 'minis25', name: 'Beat 25 mini-bosses', pizza: 'thermidor' },
  { id: 'pizzas40', name: 'Unlock 40 pizzas', pizza: 'wagyu' },
  { id: 'feet3000', name: 'Defeat 3,000 feet', pizza: 'marrow' },
  { id: 'golden25', name: 'Catch 25 golden feet', pizza: 'goldmargherita' },
  { id: 'events40', name: 'Deal with 40 wave events', pizza: 'figrose' },
  // the pizza plan's Epic milestones (docs/pizza-plan.md, section 11): six of the goals whose Rare pizzas moved off
  // milestones in step 1 passed to them, each made an Epic's goal (new ids, so a goal met under its old wording doesn't
  // count; records the save already keeps do, if they really meet the new one):
  //   Pizza Fritta's 'Reach wave 20' → Fenrir's Howl, on Hot or hotter; Quattro Stagioni's 'Reach wave 45' → Rainbow
  //   Bridge, as far as the Bifröst; Boss Slayer Supreme's 'Beat all 24 original bosses' → Skald's Saga, 32 different
  //   bosses; Okonomiyaki's 'Beat 6 different bosses' → Frostbite, on Hot or hotter; Combo King's 'Reach a 150 combo'
  //   → Surtr's Ember Crust, a 200 combo; Thousand-Foot Feast's 'Defeat 5,000 feet' → Serpent's Coil, 8,000 feet.
  // The seventh, Birthday Cake Pizza's 'Beat your first boss' ('firstBoss'), went to step 5's Silver Service as its own
  // feat under a new id (beat the Head Waiter, the first boss you meet, on Hot without losing a slice in its wave), so
  // nobody wins a Legendary for a goal met long ago. The old pizzas keep only their new routes.
  { id: 'hot20', name: 'Reach wave 20 on Hot or hotter', pizza: 'fenrirshowl' },
  { id: 'bifrost76', name: 'Reach the Bifröst (wave 76)', pizza: 'rainbowbridge' },
  { id: 'bosses32', name: 'Beat 32 different bosses', pizza: 'skaldssaga' },
  { id: 'hotBosses6', name: 'Beat 6 different bosses on Hot or hotter', pizza: 'frostbite' },
  { id: 'combo200', name: 'Reach a 200 combo', pizza: 'surtrsember' },
  { id: 'feet8000', name: 'Defeat 8,000 feet', pizza: 'serpentscoil' },
  // the pizza plan's Legendary milestones (docs/pizza-plan.md, section 12): a feat in the pizza's act, on Hot or hotter
  { id: 'waiterHot', name: 'Beat the Head Waiter on Hot or hotter without losing a slice', pizza: 'silverservice' },
];

export const MILESTONE_BY_PIZZA: Record<string, Milestone> = Object.fromEntries(MILESTONES.filter((m) => m.pizza).map((m) => [m.pizza!, m]));

