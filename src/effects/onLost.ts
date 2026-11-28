// Effect.OnLost: a pizza is lost for good (Fenrir's howl; Untouchable may bring it back, answering Answer.Rise). Its fields are a trigger's (src/effects/trigger.ts: scope, conditions, chance, counted or
// once a wave) and the action it runs.
//
//   Effect.OnLost(C(Custom.Untouchable), { scope: Scope.Field })

import type { ActionData } from './actions';
import { GameEvent } from './events';
import { effectKind } from './kind';
import { triggerSpec, type TriggerData, type TriggerOpts } from './trigger';

export interface OnLostData extends TriggerData {
  readonly kind: 'onLost';
}

const make = (action: ActionData, o: TriggerOpts = {}): OnLostData => ({ kind: 'onLost', action, ...o });

export const OnLostEffect = effectKind('onLost', make, triggerSpec<OnLostData>(GameEvent.Lost, 'pizza lost'));
