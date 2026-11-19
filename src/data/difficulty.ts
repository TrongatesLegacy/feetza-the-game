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
  /** Which heat must be beaten (wave 30) to unlock this one. */
  unlockAfter?: HeatId;
}

export const HEATS: Heat[] = [
  { id: 'mild', name: 'Mild', chilis: 1, desc: 'Slower, softer feet. Freshness off.', hp: 0.7, speed: 0.85, count: 0.8, tips: 1.2, crusts: 0.5, bossPhases: 2, freshness: 0, rebake: true },
  { id: 'regular', name: 'Regular', chilis: 2, desc: 'The game as designed.', hp: 1, speed: 1, count: 1, tips: 1, crusts: 1, bossPhases: 3, freshness: 1, rebake: true },
  { id: 'hot', name: 'Hot', chilis: 3, desc: 'Tougher, faster, more feet.', hp: 1.3, speed: 1.1, count: 1.15, tips: 0.9, crusts: 1.5, bossPhases: 3, freshness: 1, rebake: true },
  { id: 'extrahot', name: 'Extra Hot', chilis: 4, desc: 'Bosses start with their extra phase.', hp: 1.7, speed: 1.2, count: 1.3, tips: 0.8, crusts: 2, bossPhases: 4, freshness: 1, rebake: true, unlockAfter: 'hot' },
  { id: 'inferno', name: 'Inferno', chilis: 5, desc: 'No Rebake. Freshness drains faster.', hp: 2.2, speed: 1.3, count: 1.45, tips: 0.7, crusts: 3, bossPhases: 4, freshness: 1.5, rebake: false, unlockAfter: 'extrahot' },
];

export const HEAT_BY_ID: Record<HeatId, Heat> = Object.fromEntries(HEATS.map((h) => [h.id, h])) as Record<HeatId, Heat>;
