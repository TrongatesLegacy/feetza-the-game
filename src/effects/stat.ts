// Effect.Stat: a number goes up or down. Everything about it is here: its fields, what it does (a modifier on the
// ledger), its words, its scaling and its tags. Its STATS tile needs no code: the stat's definition draws it, from
// the ledger's breakdown.
//
//   Effect.Stat(Stat.Damage, Op.Mul(Unit.Mult(1.25)))                    Heavy Hand
//   Effect.Stat(Stat.CritChance, Op.Add(Unit.Chance(8)))                  Critical Crust
//   Effect.Stat(Stat.CoinMult, Op.Add(Unit.Percent(25)))                  Tip Jar (a multiplier stat adds percentages)
//   Effect.Stat(Stat.ChainChance, Op.Add(Unit.Chance(18)).EachLevelUp.Add(Unit.Chance(10)))    Garlic Lightning
//   Effect.Stat(Stat.ChainCount, Op.Nothing.EachLevelUp.Add(Unit.Count(1)))                    (nothing at level 1)
//   Effect.Stat(Stat.OliveRate, Op.Set(Unit.Every(Unit.Seconds(1.6))).EachLevelUp.Mul(Unit.Mult(1.35)))
//
// A topping applies its effects once for each level it has. An op on its own applies at every level; one with
// .EachLevelUp applies its first op at level 1 and the EachLevelUp op once for each level after it (any op can follow
// any other). The chain is plain data: { op, value, each: { op, value } }. (No lowercase `then` anywhere: an object
// with a .then method is taken for a promise.)

import { effectKind } from './kind';
import { isGrowing, Grows, type OpData, type PhaseId, type Value } from './ledger';
import { STAT_DEFS, type AddUnitOf, type StatKey, type UnitOf } from './stats';
import { Unit, UnitKind, type Mult, type Percent, type Units } from './units';
import { Tag } from './tags';
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
/** Nothing at level 1 (only the EachLevelUp op does anything). */
export type NoneOp = { op: 'none' };
/** An op with what each level after the first does instead. */
export type WithEach<O, E> = O & { readonly each: E };

/** The ops a chain's EachLevelUp can take (the same makers as Op's): each gives the chain, as plain data. */
export interface EachOps<O> {
  Add<U extends number>(v: Value<U>): WithEach<O, AddOp<U>>;
  Sub<U extends number>(v: Value<U>): WithEach<O, AddOp<U>>;
  Mul(m: Value<Mult>): WithEach<O, MulOp>;
  Boost(p: Value<Percent>): WithEach<O, MulOp>;
  Cut(p: Value<Percent>): WithEach<O, MulOp>;
  Set<U extends number>(v: Value<U>): WithEach<O, SetOp<U>>;
  AtLeast<U extends number>(v: Value<U>): WithEach<O, BoundOp<U>>;
  AtMost<U extends number>(v: Value<U>): WithEach<O, BoundOp<U>>;
}
/** An op that can be chained (.EachLevelUp is a hidden getter: the op itself stays plain data). */
export type Chain<O> = O & { readonly EachLevelUp: EachOps<O> };

const map = (v: Value<number>, f: (n: number) => number): Value<number> => (isGrowing(v) ? Grows((c) => f(v.at(c)), v.why) : f(v));

const base = {
  Add: <U extends number>(v: Value<U>): AddOp<U> => ({ op: 'add', value: v }),
  Sub: <U extends number>(v: Value<U>): AddOp<U> => ({ op: 'add', value: map(v, (n) => -n) }),
  Mul: (m: Value<Mult>): MulOp => ({ op: 'mul', value: m }),
  Boost: (p: Value<Percent>): MulOp => ({ op: 'mul', value: map(p, (n) => 1 + n) }),
  Cut: (p: Value<Percent>): MulOp => ({ op: 'mul', value: map(p, (n) => 1 - n) }),
  Set: <U extends number>(v: Value<U>): SetOp<U> => ({ op: 'set', value: v }),
  AtLeast: <U extends number>(v: Value<U>): BoundOp<U> => ({ op: 'atLeast', value: v }),
  AtMost: <U extends number>(v: Value<U>): BoundOp<U> => ({ op: 'atMost', value: v }),
};

/** o with its hidden .EachLevelUp: each of Op's makers, giving { ...o, each: that op }. */
function chain<O extends object>(o: O): Chain<O> {
  const each = Object.fromEntries(Object.entries(base).map(([k, make]) => [k, (v: never) => ({ ...o, each: (make as (v: never) => OpData)(v) })])) as unknown as EachOps<O>;
  Object.defineProperty(o, 'EachLevelUp', { value: each, enumerable: false });
  return o as Chain<O>;
}

export const Op = {
  /** Add to the stat (in its add unit: a chance adds a Chance, a multiplier stat a Percent). */
  Add: <U extends number>(v: Value<U>) => chain(base.Add(v)),
  /** Take from the stat. */
  Sub: <U extends number>(v: Value<U>) => chain(base.Sub(v)),
  /** Multiply it. */
  Mul: (m: Value<Mult>) => chain(base.Mul(m)),
  /** Grow it by a percentage (×(1 + p)). */
  Boost: (p: Value<Percent>) => chain(base.Boost(p)),
  /** Shrink it by a percentage (×(1 − p)). */
  Cut: (p: Value<Percent>) => chain(base.Cut(p)),
  /** Set it (the highest set wins, before adds and multipliers). */
  Set: <U extends number>(v: Value<U>) => chain(base.Set(v)),
  /** Turn a flag on. */
  On: (): OnOp => ({ op: 'on' }),
  /** Never below v (after this phase's adds and multipliers). */
  AtLeast: <U extends number>(v: Value<U>) => chain(base.AtLeast(v)),
  /** Never above v. */
  AtMost: <U extends number>(v: Value<U>) => chain(base.AtMost(v)),
  /** Nothing at level 1: Op.Nothing.EachLevelUp.Add(…) does something only from level 2. */
  get Nothing(): Chain<NoneOp> {
    return chain<NoneOp>({ op: 'none' });
  },
} as const;

/** The operations a stat takes, typed by its definition's unit (an EachLevelUp chain's ops too). */
type OneOp<K extends StatKey> = AddOp<Units[AddUnitOf<K>]> | MulOp | SetOp<Units[UnitOf<K>]> | BoundOp<Units[UnitOf<K>]>;
export type StatOp<K extends StatKey> = UnitOf<K> extends 'flag' ? OnOp : OneOp<K> | WithEach<OneOp<K> | NoneOp, OneOp<K>>;

/** A stat effect's op as data: the ledger's op (or nothing) at level 1, and what each later level does. */
export type StatOpData = (OpData | NoneOp) & { each?: OpData };

export interface StatOpts {
  when?: WhenId;
  phase?: PhaseId;
}

export interface StatData extends StatOpts {
  readonly kind: 'stat';
  stat: StatKey;
  op: StatOpData;
}

function makeStat<K extends StatKey>(stat: K, op: StatOp<K>, opts: StatOpts = {}): StatData {
  // (plain data: the chain's hidden EachLevelUp stays behind)
  const o = op as StatOpData;
  const data: StatOpData = 'value' in o ? { op: o.op, value: o.value } as StatOpData : ({ op: o.op } as StatOpData);
  if (o.each) data.each = o.each;
  return { kind: 'stat', stat, op: data, ...opts };
}

/** The ledger's op on its own (the chain's EachLevelUp part left off), or null for Op.Nothing. */
function firstOp(o: StatOpData): OpData | null {
  if (o.op === 'none') return null;
  const { each: _each, ...first } = o;
  return first as OpData;
}

/** The op a level applies: the first at level 1, the EachLevelUp op at every later one (null: nothing). */
export function opAt(o: StatOpData, level: number): OpData | null {
  if (!o.each) return firstOp(o);
  return level <= 1 ? firstOp(o) : o.each;
}

export const StatEffect = effectKind('stat', makeStat, {
  apply(e, ctx) {
    const op = opAt(e.op, ctx.level);
    if (!op || !holds(e.when) || !ctx.ledger) return;
    ctx.ledger.add({ stat: e.stat, op, source: ctx.source, phase: e.phase ?? ctx.phase });
  },
  describe(e) {
    const d = STAT_DEFS[e.stat];
    const what = d.label.toLowerCase();
    const first = opAt(e.op, 1);
    const each = e.op.each ? describeOp(e.stat, e.op.each, 'each') : '';
    if (!first) return `${each} ${what} each level-up`;
    if (!each) return describeOp(e.stat, first, 'one');
    return `${describeOp(e.stat, first, 'head')}, ${each} each level-up`;
  },
  scale(e, k): StatData {
    const s = (o: OpData): OpData => (o.op === 'add' ? { op: 'add', value: map(o.value, (n) => n * k) } : o.op === 'mul' ? { op: 'mul', value: map(o.value, (n) => 1 + (n - 1) * k) } : o);
    const first = firstOp(e.op);
    const op: StatOpData = first ? { ...s(first) } : { op: 'none' };
    if (e.op.each) op.each = s(e.op.each);
    return { ...e, op };
  },
  tags: (e) => [Tag.Stat(e.stat), Tag.Op(e.op.op), ...(e.op.each ? [Tag.Each(e.op.each.op)] : [])],
});

/** One op in words: "+12% chill strength". The head of a chain reads a chance as a chance ("18% arc chance, …"); its
 *  EachLevelUp part reads without the stat's name ("…, +10% each level-up"). */
function describeOp(stat: StatKey, o: OpData, part: 'one' | 'head' | 'each'): string {
  {
    const d = STAT_DEFS[stat];
    const what = d.label.toLowerCase();
    if (o.op === 'on') return d.label;
    const v = o.value;
    if (isGrowing(v)) return `${what}: grows with the run`;
    const unit = d.unit === UnitKind.Flag ? UnitKind.Amount : o.op === 'add' && d.unit === UnitKind.Mult ? UnitKind.Percent : d.unit;
    const amount = (n: number) => (unit === UnitKind.Percent || unit === UnitKind.Chance ? Unit.show.percent(n) : unit === UnitKind.Mult ? Unit.show.mult(n) : `${n < 0 ? '−' : '+'}${Math.abs(n)}`);
    // (the EachLevelUp part reads without the stat's name: "…, +10% each level-up")
    const named = (s: string) => (part === 'each' ? s : `${s} ${what}`);
    switch (o.op) {
      case 'add':
        return part === 'head' && unit === UnitKind.Chance ? `${Unit.show.chance(v)} ${what}` : named(amount(v));
      case 'mul':
        return named(Unit.show.mult(v));
      case 'set':
        if (part === 'each') return `set to ${unit === UnitKind.Percent || unit === UnitKind.Chance ? Unit.show.chance(v) : v}`;
        return `${what}: ${unit === UnitKind.Percent || unit === UnitKind.Chance ? Unit.show.chance(v) : unit === UnitKind.Rate ? Unit.show.rate(v) : v}`;
      case 'atLeast':
        return part === 'each' ? `at least ${v}` : `${what} at least ${v}`;
      case 'atMost':
        return part === 'each' ? `at most ${v}` : `${what} at most ${v}`;
    }
  }
}
