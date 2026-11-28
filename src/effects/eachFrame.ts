// Effect.EachFrame: every frame of a wave, after the timers: the ticking props (rings, ghosts, the Gorgon's stone, the maze, embers,
// whirlpools, ink, soot, the harpies, the Bifröst, the coils, Nonna's Secret). A prop outlives the moment that made it,
// so most say Scope.Field and tidy themselves up when their pizza goes. Its fields are a trigger's (src/effects/trigger.ts: scope, conditions, chance, counted or
// once a wave) and the action it runs.
//
//   Effect.EachFrame(C(Custom.RingsTick), { scope: Scope.Field })

import type { ActionData } from './actions';
import { GameEvent } from './events';
import { effectKind } from './kind';
import { triggerSpec, type TriggerData, type TriggerOpts } from './trigger';

export interface EachFrameData extends TriggerData {
  readonly kind: 'eachFrame';
}

const make = (action: ActionData, o: TriggerOpts = {}): EachFrameData => ({ kind: 'eachFrame', action, ...o });

export const EachFrameEffect = effectKind('eachFrame', make, triggerSpec<EachFrameData>(GameEvent.Tick, 'frame'));
