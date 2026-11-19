// Permanent upgrades bought with Golden Crusts in the Pizzeria between runs.

export interface MetaUpgrade {
  id: string;
  name: string;
  icon: string;
  desc: string;
  costs: number[]; // cost per level
}

export const META: MetaUpgrade[] = [
  { id: 'wrists', name: 'Strong Wrists', icon: '💪', desc: '+8% smack damage per level', costs: [30, 60, 100, 160, 240] },
  { id: 'tips', name: 'Tip Culture', icon: '🪙', desc: '+10% tips per level', costs: [25, 50, 90, 140, 200] },
  { id: 'pies', name: 'Bigger Pies', icon: '🥧', desc: '+1 slice on every pizza per level', costs: [50, 120, 250] },
  { id: 'apron', name: 'Lucky Apron', icon: '🍀', desc: 'Better upgrade rarities', costs: [60, 140, 300] },
  { id: 'opinion', name: 'Second Opinion', icon: '🎲', desc: '+1 free reroll on every upgrade screen', costs: [80, 200] },
  { id: 'preheat', name: 'Pre-Heated Peel', icon: '🔥', desc: 'Start every run with a full Peel Slam', costs: [100] },
  { id: 'headstart', name: 'Head Start', icon: '🚀', desc: 'Start every run with a random rare upgrade', costs: [150] },
  { id: 'table', name: 'Extra Table Space', icon: '🍽️', desc: 'Start with 4 pizzas instead of 3', costs: [280] },
  { id: 'indecisive', name: 'Indecisive Chef', icon: '🤔', desc: 'Choose from 4 upgrade cards instead of 3', costs: [400] },
];

export const META_BY_ID: Record<string, MetaUpgrade> = Object.fromEntries(META.map((m) => [m.id, m]));

/** One-off achievements that unlock a pizza for free (the cheapest one still locked). */
export interface Milestone {
  id: string;
  name: string;
}

export const MILESTONES: Milestone[] = [
  { id: 'firstWave3', name: 'Survive to wave 3' },
  { id: 'firstBoss', name: 'Beat your first boss' },
  { id: 'feet150', name: 'Smack 150 feet' },
  { id: 'wave10', name: 'Reach wave 10' },
  { id: 'bosses3', name: 'Beat 3 different bosses' },
  { id: 'feet600', name: 'Smack 600 feet' },
  { id: 'wave20', name: 'Reach wave 20' },
  { id: 'allBosses', name: 'Beat all 6 bosses' },
];
