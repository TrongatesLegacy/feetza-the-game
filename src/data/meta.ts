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
  { id: 'firstBoss', name: 'Beat your first boss', pizza: 'birthday' },
  { id: 'feet150', name: 'Smack 150 feet', pizza: 'smores' },
  { id: 'wave10', name: 'Reach wave 10', pizza: 'deepdish' },
  { id: 'bosses3', name: 'Beat 3 different bosses', pizza: 'detroit' },
  { id: 'feet600', name: 'Smack 600 feet', pizza: 'maccheese' },
  { id: 'wave20', name: 'Reach wave 20', pizza: 'fritta' },
  { id: 'bosses6', name: 'Beat 6 different bosses', pizza: 'okonomiyaki' },
  { id: 'act1', name: 'Beat wave 30', pizza: 'carbonara' },
  { id: 'bosses12', name: 'Beat 12 different bosses', pizza: 'cajun' },
  { id: 'feet1500', name: 'Smack 1,500 feet', pizza: 'marshmallow' },
  { id: 'wave45', name: 'Reach wave 45', pizza: 'stagioni' },
  { id: 'bosses18', name: 'Beat 18 different bosses', pizza: 'pumpkin' },
  { id: 'journey', name: `Finish the journey (wave ${JOURNEY_WAVES})`, pizza: 'golden' },
  { id: 'allBosses', name: 'Beat all 24 bosses', pizza: 'unicorn' },
  { id: 'hot30', name: 'Beat wave 30 on Hot', pizza: 'truffle' },
  { id: 'extrahot30', name: 'Beat wave 30 on Extra Hot' },
  { id: 'inferno30', name: 'Beat wave 30 on Inferno' },
];

export const MILESTONE_BY_PIZZA: Record<string, Milestone> = Object.fromEntries(MILESTONES.filter((m) => m.pizza).map((m) => [m.pizza!, m]));
