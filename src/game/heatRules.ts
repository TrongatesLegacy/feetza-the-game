// Heat rules that change wording and effects outside the heat data itself.
// Freshness is off on Mild, so toppings that cost freshness need a different catch there.

import { HEAT_BY_ID, type HeatId } from '../data/difficulty';
import { save } from '../systems/save';

let current: HeatId | null = null;

/** Set by the game scene for the run in progress (null: follow the saved heat). */
export function setRunHeat(h: HeatId | null): void {
  current = h;
}

export function freshnessOn(): boolean {
  return (HEAT_BY_ID[current ?? save.heat]?.freshness ?? 1) > 0;
}
