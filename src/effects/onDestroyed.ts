// Effect.OnDestroyed: a pizza has just been destroyed (Volcano Calzone erupts; Olympian Feast may keep it, answering Answer.Survive:
// the bus asks no one after that). Its fields are a trigger's (src/effects/trigger.ts: scope, conditions, chance, counted or
// once a wave) and the action it runs.
//
//   Effect.OnDestroyed(C(Custom.Olympian), { scope: Scope.Own, when: Cond.PerkWasOn })

import type { ActionData } from './actions';
import { GameEvent } from './events';
import { effectKind } from './kind';
import { triggerSpec, type TriggerData, type TriggerOpts } from './trigger';

export interface OnDestroyedData extends TriggerData {
  readonly kind: 'onDestroyed';
}

const make = (action: ActionData, o: TriggerOpts = {}): OnDestroyedData => ({ kind: 'onDestroyed', action, ...o });

export const OnDestroyedEffect = effectKind('onDestroyed', make, triggerSpec<OnDestroyedData>(GameEvent.Destroyed, 'pizza destroyed'));
