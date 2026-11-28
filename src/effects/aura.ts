// Effect.Aura: something continuous a perk does to a foot, every frame it holds (docs/effects-plan.md, step 3). The bus
// asks it once a frame for each foot standing on the field (GameEvent.FootTick): Chicken Pesto's growing slow, Chorizo
// & Pepper's flare, Inferno Calzone's smoulder over the pizza the foot is above; Tikka Time Machine's freeze and
// Burrata's phase heal across the field. `off` runs on a frame it doesn't hold (Chicken Pesto lets its count go).
// Its other fields are a trigger's (src/effects/trigger.ts).
//
//   Effect.Aura(C(Custom.PestoSlow), { scope: Scope.Target, when: Cond.Over, off: C(Custom.PestoLetGo) })

import { actionTags, describeAction, runAction, type ActionData, type Fire } from './actions';
import { GameEvent } from './events';
import { effectKind } from './kind';
import { TriggerKind } from './tags';
import { fireTrigger, scaleTrigger, triggerTags, type TriggerData, type TriggerOpts } from './trigger';

export interface AuraOpts extends TriggerOpts {
  /** What happens on a frame it doesn't hold. */
  off?: ActionData;
}

export interface AuraData extends TriggerData {
  readonly kind: 'aura';
  off?: ActionData;
}

const make = (action: ActionData, o: AuraOpts = {}): AuraData => ({ kind: 'aura', action, ...o });

export const AuraEffect = effectKind('aura', make, {
  apply(e, ctx) {
    const play = ctx.play;
    if (!play) return;
    play.on(
      GameEvent.FootTick,
      (ev) => {
        if (fireTrigger(e, play, ev) || !e.off) return;
        const fire: Fire = { perk: play.perk, ev, foot: ev.foot, pizza: null, pizzas: [], k: () => 0 };
        runAction(e.off, play, fire);
      },
      e.scope,
    );
  },
  describe: (e) => `While it holds, every moment: ${describeAction(e.action)}`,
  scale: (e, k) => scaleTrigger(e, k),
  tags: (e) => [...triggerTags(TriggerKind.Aura, e), ...(e.off ? actionTags(e.off) : [])],
});
