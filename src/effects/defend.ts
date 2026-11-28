// Effect.Defend: a stomp is coming down and this may stop it (docs/effects-plan.md, step 3). The defences run in the
// order they're listed and the first that blocks wins: the bus asks no one after it (src/game/perkBus.ts emit). Its
// fields are a trigger's (src/effects/trigger.ts: scope, conditions, chance, counted or once a wave); the stomp is
// blocked when its action happened (a one-off that says it didn't, such as a slip with no splat there, lets it on).
//
//   Effect.Defend(Guard.Early, Action.Seq(Action.Knock(Unit.Amount(420)), S(Look.GhostPass)), { scope: Scope.Target, chance: Unit.Chance(25) })
//   Effect.Defend(Guard.Wall, C(Custom.Stone), { scope: Scope.Target, oncePerWave: 'stoneWave' })

import { describeAction, type ActionData } from './actions';
import { GameEvent } from './events';
import { effectKind } from './kind';
import { TriggerKind } from './tags';
import { fireTrigger, scaleTrigger, triggerTags, type TriggerData, type TriggerOpts } from './trigger';

/** Where in a stomp a defence stands. */
export const Guard = {
  /** Before anything else, piercing stomps too (a slip, a ghost pass, a shut shell, Nonna's ladle). */
  Early: 'early',
  /** Where Pizza Stone is: a piercing stomp goes through (Granite Crust, the friendly ghosts, the sand walls). */
  Wall: 'wall',
} as const;
export type GuardId = (typeof Guard)[keyof typeof Guard];

export interface DefendData extends TriggerData {
  readonly kind: 'defend';
  guard: GuardId;
}

const make = (guard: GuardId, action: ActionData, o: TriggerOpts = {}): DefendData => ({ kind: 'defend', guard, action, ...o });

export const DefendEffect = effectKind('defend', make, {
  apply(e, ctx) {
    const play = ctx.play;
    if (!play) return;
    const block = (ev: { blocked: boolean }) => {
      if (!ev.blocked && fireTrigger(e, play, ev as never, true)) ev.blocked = true;
    };
    if (e.guard === Guard.Early) play.on(GameEvent.PreStomp, block, e.scope);
    else play.on(GameEvent.StompWall, block, e.scope);
  },
  describe: (e) => `Blocks a stomp${e.chance !== undefined ? ` (${Math.round(e.chance * 100)}% chance)` : ''}${e.oncePerWave ? ', once a wave' : ''}: ${describeAction(e.action)}`,
  scale: (e, k) => scaleTrigger(e, k),
  tags: (e) => triggerTags(TriggerKind.Defend, e),
});
