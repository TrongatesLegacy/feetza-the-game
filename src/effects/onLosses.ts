// Effect.OnLosses: once a wave, when that many slices have gone to stomps this wave (docs/effects-plan.md, step 4). The
// Incredible Bulk hulks out on his third lost slice (src/game/peelEffects.ts):
//
//   Effect.OnLosses(
//     Unit.Count(3),
//     Action.Ability(fx),
//     { when: Cond.Flag(PeelFlag.InWave) },
//   )
//
// The count starts again with each wave; it counts every loss, and fires the first time the count is reached while
// `when` holds (a loss that doesn't fire it leaves it to the next).

import { actionTags, describeAction, runAction, type ActionData, type Fire } from './actions';
import { condTags, holdsCond, type CondData } from './cond';
import { GameEvent } from './events';
import { effectKind } from './kind';
import { Scope } from './trigger';
import { Tag, TriggerKind } from './tags';
import type { Count } from './units';

export interface OnLossesOpts {
  when?: CondData;
}

export interface OnLossesData extends OnLossesOpts {
  readonly kind: 'onLosses';
  n: Count;
  action: ActionData;
}

const make = (n: Count, action: ActionData, o: OnLossesOpts = {}): OnLossesData => ({ kind: 'onLosses', n, action, ...o });

export const OnLossesEffect = effectKind('onLosses', make, {
  apply(e, ctx) {
    const play = ctx.play;
    if (!play) return;
    const lost = `losses:${play.perk}`;
    const fired = `lossesFired:${play.perk}`;
    play.state[lost] = 0;
    play.state[fired] = 0;
    play.on(GameEvent.WaveStart, () => {
      play.state[lost] = 0;
      play.state[fired] = 0;
    });
    play.on(GameEvent.Losses, (ev) => {
      play.state[lost] += ev.n;
      if (play.state[lost] < e.n || play.state[fired]) return;
      const g = play.grants(Scope.Table, ev)[0];
      if (!g || (e.when && !holdsCond(e.when, play.cond(ev)))) return;
      play.state[fired] = 1;
      const fire: Fire = { perk: play.perk, ev, foot: null, pizza: null, get pizzas() { return g.pizzas; }, k: g.k };
      runAction(e.action, play, fire);
    });
  },
  describe: (e) => `Once a wave, at the ${e.n}${e.n === 1 ? 'st' : e.n === 2 ? 'nd' : e.n === 3 ? 'rd' : 'th'} slice lost: ${describeAction(e.action)}`,
  scale: (e) => e,
  tags: (e) => [Tag.Trigger(TriggerKind.OnLosses), ...condTags(e.when), ...actionTags(e.action)],
});
