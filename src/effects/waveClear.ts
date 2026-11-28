// Effect.WaveClear: when the wave is clear. Its fields are a trigger's (src/effects/trigger.ts: scope, conditions, chance, counted
// or once a wave) and the action it runs.
//
//   Effect.WaveClear(Action.Seq(…), { scope: Scope.Each, chance: Unit.Chance(15) })

import type { ActionData } from './actions';
import { GameEvent } from './events';
import { effectKind } from './kind';
import { triggerSpec, type TriggerData, type TriggerOpts } from './trigger';

export interface WaveClearData extends TriggerData {
  readonly kind: 'waveClear';
}

const make = (action: ActionData, o: TriggerOpts = {}): WaveClearData => ({ kind: 'waveClear', action, ...o });

export const WaveClearEffect = effectKind('waveClear', make, triggerSpec<WaveClearData>(GameEvent.WaveClear, 'waves cleared'));
