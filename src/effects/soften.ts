// Effect.Soften: a stomp is about to take slices and this may take fewer (Raclette Run's half a slice): its action changes the
// moment's `dmg`. Its fields are a trigger's (src/effects/trigger.ts: scope, conditions, chance, counted or
// once a wave) and the action it runs.
//
//   Effect.Soften(C(Custom.HalfStomp), { scope: Scope.Target })

import type { ActionData } from './actions';
import { GameEvent } from './events';
import { effectKind } from './kind';
import { triggerSpec, type TriggerData, type TriggerOpts } from './trigger';

export interface SoftenData extends TriggerData {
  readonly kind: 'soften';
}

const make = (action: ActionData, o: TriggerOpts = {}): SoftenData => ({ kind: 'soften', action, ...o });

export const SoftenEffect = effectKind('soften', make, triggerSpec<SoftenData>(GameEvent.StompDamage, 'stomp that takes slices'));
