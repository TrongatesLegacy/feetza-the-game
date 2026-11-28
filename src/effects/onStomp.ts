// Effect.OnStomp: when a stomp lands on a pizza (and the stomper is still standing: every one checks that first). Its fields are a trigger's (src/effects/trigger.ts: scope, conditions, chance, counted
// or once a wave) and the action it runs.
//
//   Effect.OnStomp(Action.Seq(…), { scope: Scope.Each, chance: Unit.Chance(15) })

import type { ActionData } from './actions';
import { Cond } from './cond';
import { GameEvent } from './events';
import { effectKind } from './kind';
import { triggerSpec, type TriggerData, type TriggerOpts } from './trigger';

export interface OnStompData extends TriggerData {
  readonly kind: 'onStomp';
}

const make = (action: ActionData, o: TriggerOpts = {}): OnStompData => ({ kind: 'onStomp', action, ...o });

export const OnStompEffect = effectKind('onStomp', make, triggerSpec<OnStompData>(GameEvent.Stomp, 'stomp', Cond.Alive));
