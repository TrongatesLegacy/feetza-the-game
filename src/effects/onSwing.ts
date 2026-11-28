// Effect.OnSwing: when a swing of the peel lands (once a swing, however many feet it hit). Its fields are a trigger's (src/effects/trigger.ts: scope, conditions, chance, counted
// or once a wave) and the action it runs.
//
//   Effect.OnSwing(Action.Seq(…), { scope: Scope.Each, chance: Unit.Chance(15) })

import type { ActionData } from './actions';
import { GameEvent } from './events';
import { effectKind } from './kind';
import { triggerSpec, type TriggerData, type TriggerOpts } from './trigger';

export interface OnSwingData extends TriggerData {
  readonly kind: 'onSwing';
}

const make = (action: ActionData, o: TriggerOpts = {}): OnSwingData => ({ kind: 'onSwing', action, ...o });

export const OnSwingEffect = effectKind('onSwing', make, triggerSpec<OnSwingData>(GameEvent.Swing, 'swings'));
