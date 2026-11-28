// Effect.OnSlam: when the peel's meter ability is used, pressed (an active ability) or by itself when the meter fills
// (an automatic one: `when: Cond.AutoSlam`). Its fields are a trigger's (src/effects/trigger.ts) and the action it
// runs: a peel's ability (Action.Ability). Declared for every meter ability (src/game/peelEffects.ts); the scene's
// meter fires it (GameScene.fireAbility).
//
//   Effect.OnSlam(Action.Ability(fx))

import type { ActionData } from './actions';
import { GameEvent } from './events';
import { effectKind } from './kind';
import { triggerSpec, type TriggerData, type TriggerOpts } from './trigger';

export interface OnSlamData extends TriggerData {
  readonly kind: 'onSlam';
}

const make = (action: ActionData, o: TriggerOpts = {}): OnSlamData => ({ kind: 'onSlam', action, ...o });

export const OnSlamEffect = effectKind('onSlam', make, triggerSpec<OnSlamData>(GameEvent.Slam, 'meter ability'));
