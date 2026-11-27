// Effect.Legacy: anything not yet ported keeps working unchanged. It changes the stats the old way, at the end of its
// phase's multipliers (in the order the sources were added), and the ledger credits whatever it changed to its
// source. Port it to real effects when its family comes up (docs/effects-plan.md).

import type { Stats } from '../data/upgrades';
import { effectKind } from './kind';

export interface LegacyData {
  readonly kind: 'legacy';
  run: (s: Stats, lvl: number) => void;
  label: string;
}

const makeLegacy = (run: (s: Stats, lvl: number) => void, label = 'legacy'): LegacyData => ({ kind: 'legacy', run, label });

export const LegacyEffect = effectKind('legacy', makeLegacy, {
  apply(e, ctx) {
    const lvl = ctx.level;
    const src = typeof ctx.source === 'string' ? ctx.source : Object.keys(ctx.source)[0];
    ctx.ledger.addLegacy({ source: src, phase: ctx.phase, run: (s) => e.run(s, lvl) });
  },
  describe: (e) => e.label,
  scale: (e) => e,
  tags: () => ['legacy'],
});
