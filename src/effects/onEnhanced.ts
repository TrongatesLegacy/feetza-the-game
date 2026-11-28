// Effect.OnEnhanced: a pizza was enhanced (Century Crust grows, the Citadel flies its fourth pennant). Its fields are a trigger's (src/effects/trigger.ts: scope, conditions, chance, counted or
// once a wave) and the action it runs.
//
//   Effect.OnEnhanced(C(Custom.CenturyGrow), { scope: Scope.Own })

import type { ActionData } from './actions';
import { GameEvent } from './events';
import { effectKind } from './kind';
import { triggerSpec, type TriggerData, type TriggerOpts } from './trigger';

export interface OnEnhancedData extends TriggerData {
  readonly kind: 'onEnhanced';
}

const make = (action: ActionData, o: TriggerOpts = {}): OnEnhancedData => ({ kind: 'onEnhanced', action, ...o });

export const OnEnhancedEffect = effectKind('onEnhanced', make, triggerSpec<OnEnhancedData>(GameEvent.Enhanced, 'pizza enhanced'));
