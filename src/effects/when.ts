// Run-wide conditions an effect can wait on (typed names: When.Freshness, never a loose string).

import { freshnessOn } from '../game/heatRules';

export const When = {
  /** Freshness is on (every heat but Mild). */
  Freshness: 'freshness',
  /** Freshness is off (Mild). */
  NoFreshness: 'noFreshness',
} as const;
export type WhenId = (typeof When)[keyof typeof When];

const HOLDS: Record<WhenId, () => boolean> = {
  freshness: () => freshnessOn(),
  noFreshness: () => !freshnessOn(),
};

export function holds(w: WhenId | undefined): boolean {
  return w === undefined || HOLDS[w]();
}
