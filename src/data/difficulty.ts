// Five heat levels. Regular is the game as designed; harder heats pay more Golden Crusts.

export type HeatId = 'mild' | 'regular' | 'hot' | 'extrahot' | 'inferno';

export interface Heat {
  id: HeatId;
  name: string;
  chilis: number;
  desc: string;
  hp: number;
  speed: number;
  count: number;
  tips: number;
  crusts: number;
  /** Main bosses have this many phases (mini-bosses one fewer). */
  bossPhases: number;
  /** Freshness drain multiplier (0 = Freshness off). */
  freshness: number;
  rebake: boolean;
  /** Which heat must be beaten (wave 30, HEAT_UNLOCK_WAVE) to unlock this one. */
  unlockAfter?: HeatId;
  /** Wave crowd: how the foot count, crowding and pace grow through a run at this heat. */
  crowd: Crowd;
}

/** How busy waves get. Mild and Regular grow slower and stop sooner, so a Mild run is hard to lose. */
export interface Crowd {
  /** Feet added to the wave per wave (before the heat's count multiplier). */
  perWave: number;
  /** Most feet a wave can have (endless loops raise it). */
  countCap: number;
  /** Most regular feet on screen at once, before lanes limit it further. */
  aliveCap: number;
  /** Shortest gap between spawns (seconds). */
  intervalFloor: number;
  /** Top speed growth across a run (before the heat's speed multiplier). */
  speedCap: number;
  /** Highest elite chance. */
  eliteCap: number;
  /** Hover-time multiplier before a foot dives (longer = more time to react). */
  hoverMul: number;
  /** First wave in which hovering feet hop to another free lane (0 = never). */
  laneSwitchWave: number;
  /** Past DEEP_FROM (the old journey's end) the crowd caps keep growing, up to ×(1 + deepGrowth) by wave 100. */
  deepGrowth: number;
  /** Foot health added per wave past DEEP_FROM (before the heat's hp multiplier; 0.06 a wave before it). */
  deepHp: number;
}

/** Waves past this on the first time through (acts 7–10) keep climbing gently, so wave 100 on Mild stays very winnable. */
export const DEEP_FROM = 60;
/** Waves over which the deep ramp reaches its full value (wave 100). */
export const DEEP_SPAN = 40;

const GENTLE: Crowd = { perWave: 1.1, countCap: 40, aliveCap: 6, intervalFloor: 0.8, speedCap: 1.4, eliteCap: 0.1, hoverMul: 1.35, laneSwitchWave: 0, deepGrowth: 0.2, deepHp: 0.03 };
// (Regular's deep health ramp is 0.04 a wave, was 0.05: Act 9's tougher feet already made waves 81–90 the wall)
const STEADY: Crowd = { perWave: 1.6, countCap: 60, aliveCap: 9, intervalFloor: 0.5, speedCap: 1.65, eliteCap: 0.2, hoverMul: 1.15, laneSwitchWave: 20, deepGrowth: 0.35, deepHp: 0.04 };
// lanes cap how many feet are on screen, so the hotter heats get their pressure from tempo instead
const FULL: Crowd = { perWave: 2.1, countCap: 999, aliveCap: 12, intervalFloor: 0.32, speedCap: 1.85, eliteCap: 0.3, hoverMul: 0.95, laneSwitchWave: 10, deepGrowth: 0.5, deepHp: 0.06 };
const FULLER: Crowd = { ...FULL, hoverMul: 0.85, laneSwitchWave: 6 };
const FULLEST: Crowd = { ...FULL, hoverMul: 0.75, laneSwitchWave: 4 };

export const HEATS: Heat[] = [
  { id: 'mild', name: 'Mild', chilis: 1, desc: 'Slower, softer feet. Freshness off.', hp: 0.7, speed: 0.85, count: 0.8, tips: 1.2, crusts: 0.5, bossPhases: 2, freshness: 0, rebake: true, crowd: GENTLE },
  { id: 'regular', name: 'Regular', chilis: 2, desc: 'The game as designed.', hp: 1, speed: 1, count: 1, tips: 1, crusts: 1, bossPhases: 3, freshness: 1, rebake: true, crowd: STEADY },
  { id: 'hot', name: 'Hot', chilis: 3, desc: 'Tougher, faster, more feet.', hp: 1.3, speed: 1.1, count: 1.15, tips: 0.9, crusts: 1.5, bossPhases: 3, freshness: 1, rebake: true, crowd: FULL },
  { id: 'extrahot', name: 'Extra Hot', chilis: 4, desc: 'Bosses start with their extra phase.', hp: 1.7, speed: 1.2, count: 1.3, tips: 0.8, crusts: 2, bossPhases: 4, freshness: 1, rebake: true, unlockAfter: 'hot', crowd: FULLER },
  { id: 'inferno', name: 'Inferno', chilis: 5, desc: 'No Rebake. Freshness drains faster.', hp: 2.2, speed: 1.3, count: 1.45, tips: 0.7, crusts: 3, bossPhases: 4, freshness: 1.5, rebake: false, unlockAfter: 'extrahot', crowd: FULLEST },
];

export const HEAT_BY_ID: Record<HeatId, Heat> = Object.fromEntries(HEATS.map((h) => [h.id, h])) as Record<HeatId, Heat>;

/** 0 = Mild … 4 = Inferno. */
export function heatRank(id: HeatId): number {
  return HEATS.findIndex((h) => h.id === id);
}
