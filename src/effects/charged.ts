// Effect.Charged: a charged clock (docs/effects-plan.md, step 4). It fills with time, run faster by what speeds the
// clock (PlayCtx.rate: the peel's meter boosts), and from the other sources of charge it declares: the meter's top-ups,
// an event's slam prize, a wave's head start, Pizza Slots' slam. Once it's full, and `fireIf` holds, its action runs
// and it empties. A timed peel ability is one (src/game/peelEffects.ts):
//
//   Effect.Charged(
//     Unit.Seconds(5),
//     Action.Ability(fx),
//     { fireIf: Cond.AnyFoot(Cond.Hittable), from: [ChargeFrom.Time, ChargeFrom.Meter, ChargeFrom.Event, ChargeFrom.HeadStart, ChargeFrom.Slots] },
//   )
//
// The game sends charge with a GameEvent.Charge moment (PeelBus.charge): a clock that takes it says so (`taken`), so
// the game knows whether to fill the meter instead. How full it is (PeelBus.clockFill, the HUD's meter) is read from
// the clock itself, never kept beside it.

import { actionTags, describeAction, runAction, type ActionData, type Fire } from './actions';
import { condTags, holdsCond, type CondData } from './cond';
import { GameEvent } from './events';
import { effectKind } from './kind';
import { Scope } from './trigger';
import { Tag, TriggerKind } from './tags';
import type { Seconds } from './units';

/** Where charge comes from. Each charges its own way (CHARGE_BY). */
export const ChargeFrom = {
  /** Every frame of a wave: the frame's seconds × how fast the clock runs (PlayCtx.rate). */
  Time: 'time',
  /** The meter's top-ups (a perk or a topping filling the meter: Dough Spinner's spin): that share of a full clock. */
  Meter: 'meter',
  /** An event's slam prize: that share of a full clock. */
  Event: 'event',
  /** As a wave begins, the meter's head start (S'mores, Pre-Heated Peel, Full Tank): at least that share, never more
   *  than a full clock. */
  HeadStart: 'headStart',
  /** Pizza Slots' slam prize: a full clock at once. */
  Slots: 'slots',
} as const;
export type ChargeFromId = (typeof ChargeFrom)[keyof typeof ChargeFrom];

/** How each source charges a clock of `sec` seconds holding `now`, by `share` (in the clock's own seconds). */
const CHARGE_BY: Record<Exclude<ChargeFromId, 'time'>, (now: number, sec: number, share: number) => number> = {
  meter: (now, sec, share) => now + sec * share,
  event: (now, sec, share) => now + sec * share,
  headStart: (now, sec, share) => Math.max(now, sec * Math.min(1, share)),
  slots: (now, sec) => now + sec,
};

const WORDS: Record<ChargeFromId, string> = {
  time: 'time',
  meter: 'meter boosts',
  event: 'events',
  headStart: "the meter's head start",
  slots: 'Pizza Slots',
};

export interface ChargedOpts {
  fireIf?: CondData;
  /** Where it takes charge from (time included: a clock without ChargeFrom.Time only fills from the others). */
  from: ChargeFromId[];
}

export interface ChargedData extends ChargedOpts {
  readonly kind: 'charged';
  seconds: Seconds;
  action: ActionData;
}

/** The bus's state key for a charged clock (PlayCtx.state). */
export const chargedKey = (perk: string): string => `charged:${perk}`;

const make = (seconds: Seconds, action: ActionData, o: ChargedOpts): ChargedData => ({ kind: 'charged', seconds, action, ...o });

export const ChargedEffect = effectKind('charged', make, {
  apply(e, ctx) {
    const play = ctx.play;
    if (!play) return;
    const key = chargedKey(play.perk);
    const from = new Set<ChargeFromId>(e.from);
    play.state[key] = 0;
    play.on(GameEvent.Charge, (ev) => {
      if (ev.from === ChargeFrom.Time || !from.has(ev.from) || !play.grants(Scope.Table, ev).length) return;
      play.state[key] = CHARGE_BY[ev.from](play.state[key], e.seconds, ev.share);
      ev.taken = true;
    });
    play.on(GameEvent.Tick, (ev) => {
      const g = play.grants(Scope.Table, ev)[0];
      if (!g) return;
      if (from.has(ChargeFrom.Time)) play.state[key] += ev.dt * (play.rate?.() ?? 1);
      if (play.state[key] < e.seconds) return;
      if (e.fireIf && !holdsCond(e.fireIf, play.cond(ev))) return;
      play.state[key] = 0;
      const fire: Fire = { perk: play.perk, ev, foot: null, pizza: null, get pizzas() { return g.pizzas; }, k: g.k };
      runAction(e.action, play, fire);
    });
  },
  describe: (e) => `Every ${e.seconds}s (charged by ${e.from.map((f) => WORDS[f]).join(', ')}): ${describeAction(e.action)}`,
  scale: (e, k) => ({ ...e, seconds: (e.seconds / k) as Seconds }),
  tags: (e) => [Tag.Trigger(TriggerKind.Charged), ...e.from.map((f) => Tag.Charge(f)), ...condTags(e.fireIf), ...actionTags(e.action)],
});
