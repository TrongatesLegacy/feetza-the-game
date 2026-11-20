// Permanent upgrades bought with Golden Crusts in the Pizzeria between runs.

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
  { id: 'bosses6', name: 'Beat 6 different bosses' },
  { id: 'act1', name: 'Finish Act 1 (wave 30)' },
  { id: 'bosses12', name: 'Beat 12 different bosses' },
  { id: 'feet1500', name: 'Smack 1,500 feet' },
  { id: 'wave45', name: 'Reach wave 45' },
  { id: 'bosses18', name: 'Beat 18 different bosses' },
  { id: 'journey', name: 'Finish the journey (wave 60)' },
  { id: 'allBosses', name: 'Beat all 24 bosses' },
  { id: 'hot30', name: 'Finish Act 1 on Hot' },
  { id: 'extrahot30', name: 'Finish Act 1 on Extra Hot' },
  { id: 'inferno30', name: 'Finish Act 1 on Inferno' },
];
