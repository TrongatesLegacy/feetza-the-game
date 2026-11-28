// Effect.OnKill: when a foot is defeated. Its fields are a trigger's (src/effects/trigger.ts: scope, conditions, chance, counted
// or once a wave) and the action it runs.
//
//   Effect.OnKill(Action.Seq(…), { scope: Scope.Each, chance: Unit.Chance(15) })

import type { ActionData } from './actions';
import { GameEvent } from './events';
import { effectKind } from './kind';
import { triggerSpec, type TriggerData, type TriggerOpts } from './trigger';

export interface OnKillData extends TriggerData {
  readonly kind: 'onKill';
}

const make = (action: ActionData, o: TriggerOpts = {}): OnKillData => ({ kind: 'onKill', action, ...o });

export const OnKillEffect = effectKind('onKill', make, triggerSpec<OnKillData>(GameEvent.Kill, 'kill'));
