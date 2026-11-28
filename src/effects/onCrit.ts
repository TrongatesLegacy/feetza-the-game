// Effect.OnCrit: when a smack crits. Its fields are a trigger's (src/effects/trigger.ts: scope, conditions, chance, counted
// or once a wave) and the action it runs.
//
//   Effect.OnCrit(Action.Seq(…), { scope: Scope.Each, chance: Unit.Chance(15) })

import type { ActionData } from './actions';
import { GameEvent } from './events';
import { effectKind } from './kind';
import { triggerSpec, type TriggerData, type TriggerOpts } from './trigger';

export interface OnCritData extends TriggerData {
  readonly kind: 'onCrit';
}

const make = (action: ActionData, o: TriggerOpts = {}): OnCritData => ({ kind: 'onCrit', action, ...o });

export const OnCritEffect = effectKind('onCrit', make, triggerSpec<OnCritData>(GameEvent.Crit, 'crit'));
