// Effect.WaveClose: the wave is over, before anything is paid for it: the props and walls come down (the rings, the
// splats, the soot, the sand, the Citadel's pennants, Roar Roast's boost, an open Black Olive Hole). Its fields are a
// trigger's (src/effects/trigger.ts: scope, conditions, chance, counted or once a wave) and the action it runs.
//
//   Effect.WaveClose(C(Custom.HoleClose), { scope: Scope.Field })

import type { ActionData } from './actions';
import { GameEvent } from './events';
import { effectKind } from './kind';
import { triggerSpec, type TriggerData, type TriggerOpts } from './trigger';

export interface WaveCloseData extends TriggerData {
  readonly kind: 'waveClose';
}

const make = (action: ActionData, o: TriggerOpts = {}): WaveCloseData => ({ kind: 'waveClose', action, ...o });

export const WaveCloseEffect = effectKind('waveClose', make, triggerSpec<WaveCloseData>(GameEvent.WaveClose, 'wave closing'));
