// Effect.OnPlaced: a pizza joins the table (Century Crust's extra slices, the borrowers' first picks). `Cond.Fresh`: placed now,
// not a saved run coming back. Its fields are a trigger's (src/effects/trigger.ts: scope, conditions, chance, counted or
// once a wave) and the action it runs.
//
//   Effect.OnPlaced(C(Custom.BorrowFirst), { scope: Scope.Own })

import type { ActionData } from './actions';
import { GameEvent } from './events';
import { effectKind } from './kind';
import { triggerSpec, type TriggerData, type TriggerOpts } from './trigger';

export interface OnPlacedData extends TriggerData {
  readonly kind: 'onPlaced';
}

const make = (action: ActionData, o: TriggerOpts = {}): OnPlacedData => ({ kind: 'onPlaced', action, ...o });

export const OnPlacedEffect = effectKind('onPlaced', make, triggerSpec<OnPlacedData>(GameEvent.Placed, 'pizza placed'));
