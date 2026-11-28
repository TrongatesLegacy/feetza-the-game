// Effect.FrameStart: a frame of a wave begins, before the feet are looked at (Tikka Time Machine's clock stopping once the wave's
// first feet are in). Its fields are a trigger's (src/effects/trigger.ts: scope, conditions, chance, counted or
// once a wave) and the action it runs.
//
//   Effect.FrameStart(C(Custom.TimeStopArrive), { scope: Scope.Field })

import type { ActionData } from './actions';
import { GameEvent } from './events';
import { effectKind } from './kind';
import { triggerSpec, type TriggerData, type TriggerOpts } from './trigger';

export interface FrameStartData extends TriggerData {
  readonly kind: 'frameStart';
}

const make = (action: ActionData, o: TriggerOpts = {}): FrameStartData => ({ kind: 'frameStart', action, ...o });

export const FrameStartEffect = effectKind('frameStart', make, triggerSpec<FrameStartData>(GameEvent.FrameStart, 'frame'));
