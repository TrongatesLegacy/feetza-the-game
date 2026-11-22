// Act 10 · Finale's effect layer (through the contentFx registry): memory lane in the Oven Between
// Worlds, the First Pizzeria's dawn and wall of peels, and the echoes' glitch. The layers themselves are
// in src/game/finale.ts.

import type { ActFx } from '../contentFx';
import { Finale, finaleOf } from '../finale';

export const actFx: Record<number, ActFx> = {
  10: {
    enter: (a, n) => (finaleOf(a.sc) ?? new Finale(a.sc)).onWave(n),
    leave: (a) => finaleOf(a.sc)?.clear(),
    tick: (a, dt) => finaleOf(a.sc)?.update(dt),
  },
};
