// Effect.WaveStart: when a wave begins. Its fields are a trigger's (src/effects/trigger.ts: scope, conditions, chance, counted
// or once a wave) and the action it runs.
//
//   Effect.WaveStart(Action.Seq(…), { scope: Scope.Each, chance: Unit.Chance(15) })

import type { ActionData } from './actions';
import { GameEvent } from './events';
import { effectKind } from './kind';
import { triggerSpec, type TriggerData, type TriggerOpts } from './trigger';

export interface WaveStartData extends TriggerData {
  readonly kind: 'waveStart';
}

const make = (action: ActionData, o: TriggerOpts = {}): WaveStartData => ({ kind: 'waveStart', action, ...o });

export const WaveStartEffect = effectKind('waveStart', make, triggerSpec<WaveStartData>(GameEvent.WaveStart, 'waves starting'));
