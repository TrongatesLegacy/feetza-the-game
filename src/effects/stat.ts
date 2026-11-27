// Effect.Stat: a number goes up or down. Everything about it is here: its fields, what it does (a modifier on the
// ledger), its words, its scaling and its tags. Its STATS tile needs no code: the stat's definition draws it, from
// the ledger's breakdown.
//
//   Effect.Stat(Stat.Damage, Op.Mul(Unit.Mult(1.25)))                    Heavy Hand
//   Effect.Stat(Stat.CritChance, Op.Add(Unit.Chance(8)))                  Critical Crust
//   Effect.Stat(Stat.CoinMult, Op.Add(Unit.Percent(25)))                  Tip Jar (a multiplier stat adds percentages)
//   Effect.Stat(Stat.SlowPct, Op.Add(Unit.Percent(20)), { levels: Levels.First })    Freezer Burn's first level

import { effectKind } from './kind';
import { isGrowing, Grows, type OpData, type PhaseId, type Value } from './ledger';
import { STAT_DEFS, type AddUnitOf, type StatKey, type UnitOf } from './stats';
import { Unit, type Mult, type Percent, type Units } from './units';
import { holds, type WhenId } from './when';

// ——— operations (typed by the stat's unit) ———

declare const V: unique symbol;
/** An operation carrying the unit of its value (only at typecheck). */
type Typed<O, U> = O & { readonly [V]?: U };
export type AddOp<U> = Typed<{ op: 'add'; value: Value<number> }, U>;
export type SetOp<U> = Typed<{ op: 'set'; value: Value<number> }, U>;
export type BoundOp<U> = Typed<{ op: 'atLeast' | 'atMost'; value: Value<number> }, U>;
export type MulOp = { op: 'mul'; value: Value<number> };
export type OnOp = { op: 'on' };

const map = (v: Value<number>, f: (n: number) => number): Value<number> => (isGrowing(v) ? Grows((c) => f(v.at(c)), v.why) : f(v));

export const Op = {
  /** Add to the stat (in its add unit: a chance adds a Chance, a multiplier stat a Percent). */
  Add: <U extends number>(v: Value<U>): AddOp<U> => ({ op: 'add', value: v }),
  /** Take from the stat. */
  Sub: <U extends number>(v: Value<U>): AddOp<U> => ({ op: 'add', value: map(v, (n) => -n) }),
  /** Multiply it. */
  Mul: (m: Value<Mult>): MulOp => ({ op: 'mul', value: m }),
  /** Grow it by a percentage (×(1 + p)). */
  Boost: (p: Value<Percent>): MulOp => ({ op: 'mul', value: map(p, (n) => 1 + n) }),
  /** Shrink it by a percentage (×(1 − p)). */
  Cut: (p: Value<Percent>): MulOp => ({ op: 'mul', value: map(p, (n) => 1 - n) }),
  /** Set it (the highest set wins, before adds and multipliers). */
  Set: <U extends number>(v: Value<U>): SetOp<U> => ({ op: 'set', value: v }),
  /** Turn a flag on. */
  On: (): OnOp => ({ op: 'on' }),
  /** Never below v (after this phase's adds and multipliers). */
  AtLeast: <U extends number>(v: Value<U>): BoundOp<U> => ({ op: 'atLeast', value: v }),
  /** Never above v. */
  AtMost: <U extends number>(v: Value<U>): BoundOp<U> => ({ op: 'atMost', value: v }),
} as const;

/** The operations a stat takes, typed by its definition's unit. */
export type StatOp<K extends StatKey> = UnitOf<K> extends 'flag'
  ? OnOp
  : AddOp<Units[AddUnitOf<K>]> | MulOp | SetOp<Units[UnitOf<K>]> | BoundOp<Units[UnitOf<K>]>;

/** Which of a topping's levels an effect is part of. */
export const Levels = {
  /** Its first level only (Freezer Burn's 20% chill; later levels add 12%). */
  First: 'first',
  /** Every level after the first. */
  Later: 'later',
} as const;
export type LevelsId = (typeof Levels)[keyof typeof Levels];

export interface StatOpts {
  levels?: LevelsId;
  when?: WhenId;
  phase?: PhaseId;
}

export interface StatData extends StatOpts {
  readonly kind: 'stat';
  stat: StatKey;
  op: OpData;
}

function makeStat<K extends StatKey>(stat: K, op: StatOp<K>, opts: StatOpts = {}): StatData {
  return { kind: 'stat', stat, op: op as OpData, ...opts };
}

export const StatEffect = effectKind('stat', makeStat, {
  apply(e, ctx) {
    if (e.levels === 'first' && ctx.level !== 1) return;
    if (e.levels === 'later' && ctx.level < 2) return;
    if (!holds(e.when)) return;
    ctx.ledger.add({ stat: e.stat, op: e.op, source: ctx.source, phase: e.phase ?? ctx.phase });
  },
  describe(e) {
    const d = STAT_DEFS[e.stat];
    const what = d.label.toLowerCase();
    const o = e.op;
    if (o.op === 'on') return d.label;
    const v = o.value;
    if (isGrowing(v)) return `${what}: grows with the run`;
    const unit = d.unit === 'flag' ? 'amount' : o.op === 'add' && d.unit === 'mult' ? 'percent' : d.unit;
    const amount = (n: number) => (unit === 'percent' || unit === 'chance' ? Unit.show.percent(n) : unit === 'mult' ? Unit.show.mult(n) : `${n < 0 ? '−' : '+'}${Math.abs(n)}`);
    switch (o.op) {
      case 'add':
        return `${amount(v)} ${what}`;
      case 'mul':
        return `${Unit.show.mult(v)} ${what}`;
      case 'set':
        return `${what}: ${unit === 'percent' || unit === 'chance' ? Unit.show.chance(v) : v}`;
      case 'atLeast':
        return `${what} at least ${v}`;
      case 'atMost':
        return `${what} at most ${v}`;
    }
  },
  scale(e, k): StatData {
    const o = e.op;
    if (o.op === 'add') return { ...e, op: { op: 'add', value: map(o.value, (n) => n * k) } };
    if (o.op === 'mul') return { ...e, op: { op: 'mul', value: map(o.value, (n) => 1 + (n - 1) * k) } };
    return e;
  },
  tags: (e) => [`stat:${e.stat}`, `op:${e.op.op}`],
});
