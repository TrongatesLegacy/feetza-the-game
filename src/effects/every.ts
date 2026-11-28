// Effect.Every: a timer. Every `seconds` of wave (÷ the table's strength: two pies, twice as often) its action runs.
// Everything about it is here: its fields, the clock it keeps on the bus, its words, scale and tags.
//
//   Effect.Every(Unit.Seconds(15), Action.Custom(Custom.Meteor), { at: Pick.Random(InPlay), reset: Reset.Wave })
//   Effect.Every(Unit.Seconds(25), Action.Custom(Custom.SirenSong), { tickIf: FeetOn, fireIf: FeetOn })
//
// The clock runs while the table has the perk (it stands still, keeping its time, while none does). It's due once it
// reaches its time; then it fires when `fireIf` holds and `at` finds a foot (else it waits, due, for the next frame),
// and starts again from 0. `tickIf`: the clock only runs while it holds. Reset.Wave starts it over at every wave's
// start, Reset.Run only with a new run (it carries over between waves).

import { actionTags, describeAction, runAction, type ActionData, type Fire } from './actions';
import { condTags, holdsCond, type CondData } from './cond';
import { GameEvent } from './events';
import { effectKind } from './kind';
import type { Foot } from '../game/Foot';
import { Scope } from './trigger';
import { Tag, TriggerKind } from './tags';
import type { Seconds } from './units';

export const Reset = { Wave: 'wave', Run: 'run' } as const;
export type ResetId = (typeof Reset)[keyof typeof Reset];

/** Which foot a timed action goes for: a random one, or the toughest (most hp), of those matching. */
export type PickData = { pick: 'random' | 'toughest'; of: CondData };
export const Pick = {
  Random: (of: CondData): PickData => ({ pick: 'random', of }),
  Toughest: (of: CondData): PickData => ({ pick: 'toughest', of }),
} as const;

export interface EveryOpts {
  reset?: ResetId;
  tickIf?: CondData;
  fireIf?: CondData;
  at?: PickData;
}

export interface EveryData extends EveryOpts {
  readonly kind: 'every';
  seconds: Seconds;
  action: ActionData;
}

const make = (seconds: Seconds, action: ActionData, o: EveryOpts = {}): EveryData => ({ kind: 'every', seconds, action, ...o });

export const EveryEffect = effectKind('every', make, {
  apply(e, ctx) {
    const play = ctx.play;
    if (!play) return;
    const key = `every:${play.perk}`;
    const reset = e.reset ?? Reset.Run;
    play.state[key] = 0;
    play.on(GameEvent.WaveStart, () => {
      if (reset === Reset.Wave) play.state[key] = 0;
    });
    play.on(GameEvent.Tick, (ev) => {
      const g = play.grants(Scope.Table, ev)[0];
      if (!g) return;
      const k = g.k();
      const cc = play.cond(ev);
      if (!e.tickIf || holdsCond(e.tickIf, cc)) play.state[key] += ev.dt;
      if (play.state[key] < e.seconds / k) return;
      if (e.fireIf && !holdsCond(e.fireIf, cc)) return;
      let foot: Foot | null = null;
      if (e.at) {
        const at = e.at;
        const pool = play.feet().filter((f) => holdsCond(at.of, cc, f));
        if (!pool.length) return;
        // (Phaser's GetRandom's draw: one Math.random, floored)
        foot = at.pick === 'random' ? pool[Math.floor(Math.random() * pool.length)] : pool.sort((p, q) => q.hp - p.hp)[0];
      }
      play.state[key] = 0;
      const fire: Fire = { perk: play.perk, ev, foot, pizza: null, get pizzas() { return g.pizzas; }, k: g.k };
      runAction(e.action, play, fire);
    });
  },
  describe: (e) => `Every ${e.seconds}s: ${describeAction(e.action)}`,
  // (two pies: twice as often; the table's strength already divides the time)
  scale: (e, k) => ({ ...e, seconds: (e.seconds / k) as Seconds }),
  tags: (e) => [Tag.Trigger(TriggerKind.Every), ...condTags(e.fireIf), ...actionTags(e.action)],
});
