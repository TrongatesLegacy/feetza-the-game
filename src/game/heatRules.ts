// Heat rules that change wording and effects outside the heat data itself.
// Freshness is off on Mild, so toppings that cost freshness need a different catch there.

import { HEAT_BY_ID, type HeatId, heatRank } from '../data/difficulty';
import { save } from '../systems/save';

let current: HeatId | null = null;

/** Set by the game scene for the run in progress (null: follow the saved heat). */
export function setRunHeat(h: HeatId | null): void {
  current = h;
}

/** The run's heat rank (0 Mild … 4 Inferno; the saved heat outside a run): for wording that depends on it. */
export function runHeatRank(): number {
  return heatRank(current ?? save.heat);
}

export function freshnessOn(): boolean {
  return (HEAT_BY_ID[current ?? save.heat]?.freshness ?? 1) > 0;
}

/** Blocked smacks a guard foot's shield takes before it shatters: 4 on Mild, 6 on Regular and Hot, 8 from Extra Hot
 * up (there are other ways through: wait for the drop, non-smack damage, a hero's bypass). */
export function guardHits(h: HeatId | null = current): number {
  const r = heatRank(h ?? save.heat);
  return r <= 0 ? 4 : r >= 3 ? 8 : 6;
}

/** Steps a Peel Slam (or any peel ability's hit) knocks off a raised guard shield: 4 on Mild, 3 on Regular and Hot,
 * 2 from Extra Hot up. If that smashes it, the rest of the blow goes through (its share of the unused steps). */
export function slamSteps(h: HeatId | null = current): number {
  const r = heatRank(h ?? save.heat);
  return r <= 0 ? 4 : r >= 3 ? 2 : 3;
}

/** Seconds from a guard foot's shield breaking to it raising a new one (whatever happens meanwhile): 12 on Mild, 9 on
 * Regular and Hot, 7.5 from Extra Hot up. */
export function guardRearm(h: HeatId | null = current): number {
  const r = heatRank(h ?? save.heat);
  return r <= 0 ? 12 : r >= 3 ? 7.5 : 9;
}
