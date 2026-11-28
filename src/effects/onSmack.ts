// Effect.OnSmack: when a smack lands on a foot. Its fields are a trigger's (src/effects/trigger.ts: scope, conditions, chance, counted
// or once a wave) and the action it runs.
//
//   Effect.OnSmack(Action.Seq(…), { scope: Scope.Each, chance: Unit.Chance(15) })

import type { ActionData } from './actions';
import { GameEvent } from './events';
import { effectKind } from './kind';
import { triggerSpec, type TriggerData, type TriggerOpts } from './trigger';

export interface OnSmackData extends TriggerData {
  readonly kind: 'onSmack';
}

const make = (action: ActionData, o: TriggerOpts = {}): OnSmackData => ({ kind: 'onSmack', action, ...o });

export const OnSmackEffect = effectKind('onSmack', make, triggerSpec<OnSmackData>(GameEvent.Smack, 'smack'));
