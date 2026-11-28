// Effect.Proc: an ability-style proc a topping fires (docs/effects-plan.md, step 3): its trigger (every few seconds, on
// a smack, a kill, a stomp…) and its effects, scaled by the topping's level (scaleProc), the same vocabulary the peels'
// abilities speak (src/game/abilities.ts). The scene fires every owned topping's procs (the peel's trigger bus, src/game/peelBus.ts, from its declared trigger: procEffects) and its
// looks react to what they did (abilityFx). Its card text is the proc's own (describeProc in cardText: quiet here).
//
//   ProcTopping({ id: 'anchovy', …, proc: P.proc(every(6), [D(2, rnd(1))], …) })   (the builder declares Effect.Proc)

import type { Proc } from '../game/abilities';
import { effectKind } from './kind';
import { Tag, type TagId } from './tags';

export interface ProcData {
  readonly kind: 'proc';
  proc: Proc;
}

const make = (proc: Proc): ProcData => ({ kind: 'proc', proc });

export const ProcEffect = effectKind('proc', make, {
  // (fired on the peel's bus from its trigger, src/game/peelEffects.ts procEffects; nothing to apply)
  apply: () => {},
  describe: (e) => `a proc: ${e.proc.trigger.t}`,
  scale: (e) => e,
  tags: (e): TagId[] => [Tag.Proc(e.proc.trigger.t), ...e.proc.fx.map((f) => Tag.ProcFx(f.e))],
  quiet: true,
});
