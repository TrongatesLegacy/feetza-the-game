// Effect.WaveOpen: a wave opens, before its field is set: the table's own changes (Bufala's shields, Arcobaleno's colour, Mystery
// Meat's reveal, Kitchen Sink's pick). Scope.Alive and Scope.Own triggers that sit together go pizza by pizza, as one
// pass over the table, so their random draws keep their order. Its fields are a trigger's (src/effects/trigger.ts: scope, conditions, chance, counted or
// once a wave) and the action it runs.
//
//   Effect.WaveOpen(C(Custom.RainbowShift), { scope: Scope.Own })

import type { ActionData } from './actions';
import { GameEvent } from './events';
import { effectKind } from './kind';
import { triggerSpec, type TriggerData, type TriggerOpts } from './trigger';

export interface WaveOpenData extends TriggerData {
  readonly kind: 'waveOpen';
}

const make = (action: ActionData, o: TriggerOpts = {}): WaveOpenData => ({ kind: 'waveOpen', action, ...o });

export const WaveOpenEffect = effectKind('waveOpen', make, triggerSpec<WaveOpenData>(GameEvent.WaveOpen, 'wave opening'));
