// The modifier ledger: every number in Stats goes through it (docs/effects-plan.md, "Numbers: one modifier ledger").
//
// Sources never change the stats themselves. Each adds modifiers ({ stat, op, value, source, phase }), and one
// resolver folds them in a fixed order, so totals never depend on the order things were bought:
//
//   for each phase in turn (Build, Peel, Tricks, Haunt, Table):
//     the highest Set → Adds → Multipliers → On (flags) → the sources' own bounds → caps
//
// Caps come from the stat definitions (src/effects/stats.ts): the floor and the soft ceiling once, at the end of the
// Peel phase (the build's caps), the hard ceiling again after every later phase. The phases keep what is worked out
// on top of the capped build where it always was: The Last Slice doubles capped damage, the Ghost's haunting comes
// off after it, the table-shaped perks (Napoli DOC, Peel Collector, the Forge, the Saga, Kitchen Sink) last.
//
// The resolver keeps a breakdown for each stat: each source's share of the change from the base (adds at face
// value; a phase's multipliers share what they add between them by the log of each, so ×2 counts twice ×1.41;
// caps get their own share). Growing values (Value: fixed, or a function of the run with a `why`) are worked out as
// it resolves, and the shop card's NOW tag reads the same ones.

import type { Stats } from '../data/upgrades';
import { Source, shareEntries, type SourceKey, type SourceRef } from './source';
import { STAT_DEFS, STAT_KEYS, Stack, type StatKey } from './stats';

// ——— phases ———

/** When a modifier applies. Each phase folds on the one before. */
export const Phase = {
  /** The run's build: the Pizzeria's upgrades, toppings, the pizzas' perks. */
  Build: 0,
  /** The peel's and the hero's always-on stats, on the build; then the stat definitions' caps. */
  Peel: 1,
  /** Topping tricks on the capped stats: The Last Slice, Midnight Snack. */
  Tricks: 2,
  /** The Ghost's possession: the haunted pizza's perk turned against you. */
  Haunt: 3,
  /** The table-shaped perks: Napoli DOC, Peel Collector, Combo Champ, the Forge, the Saga, Kitchen Sink… */
  Table: 4,
} as const;
export type PhaseId = (typeof Phase)[keyof typeof Phase];
const PHASES: PhaseId[] = [Phase.Build, Phase.Peel, Phase.Tricks, Phase.Haunt, Phase.Table];

// ——— growing values ———

/** What a growing value can read about the run right now. */
export interface ValueCtx {
  /** Peels owned (the Classic counts). */
  peels: number;
  /** Colossus Forge: waves survived this run. */
  forgeWaves: number;
  /** Skald's Saga: bosses beaten this run (not mini-bosses). */
  bosses: number;
  /** Napoli DOC: kinds of pizza out. */
  kinds: number;
  wave: number;
}

/** A value that grows with the run: worked out each time the ledger resolves, with the reason it is what it is. */
export interface Grows<T> {
  grows: true;
  at: (ctx: ValueCtx) => T;
  why: (ctx: ValueCtx) => string;
}
/** A fixed value, or one that grows with the run. */
export type Value<T> = T | Grows<T>;

export function Grows<T>(at: (ctx: ValueCtx) => T, why: (ctx: ValueCtx) => string): Grows<T> {
  return { grows: true, at, why };
}
export function isGrowing<T>(v: Value<T>): v is Grows<T> {
  return typeof v === 'object' && v !== null && (v as Grows<T>).grows === true;
}
export function valueAt<T>(v: Value<T>, ctx: ValueCtx): T {
  return isGrowing(v) ? v.at(ctx) : v;
}

// ——— operations ———

export type OpData =
  | { op: 'add'; value: Value<number> }
  | { op: 'mul'; value: Value<number> }
  | { op: 'set'; value: Value<number> }
  | { op: 'on' }
  | { op: 'atLeast'; value: Value<number> }
  | { op: 'atMost'; value: Value<number> };
export type OpKind = OpData['op'];

/** Where a modifier comes from: one source, or several sharing it by weight (two Peel Collectors on the table):
 *  typed keys from src/effects/source.ts. */
export type { SourceKey, SourceRef } from './source';

export interface Modifier {
  stat: StatKey;
  op: OpData;
  source: SourceRef;
  phase: PhaseId;
}

// ——— the breakdown ———

/** The cap's share of a stat, in its breakdown. */
export const CAP_SOURCE = Source.Cap;

export interface Part {
  source: SourceKey;
  /** Its share of the change from the base, in the stat's own units (flags: 1 for each source that turns it on). */
  share: number;
}
export interface Breakdown {
  base: number | boolean;
  total: number | boolean;
  /** Each source's share, largest first; the cap's share under CAP_SOURCE. */
  parts: Part[];
}

export interface Resolved {
  stats: Stats;
  /** What made each stat (worked out the first time it's read: only the STATS tab and the NOW tags need it). */
  readonly breakdown: Record<StatKey, Breakdown>;
}

const EPS = 1e-12;

/** Sources add modifiers; resolve() folds them. A fresh ledger is built every time the stats are worked out. */
export class Ledger {
  readonly mods: Modifier[] = [];
  /** Set by resolve(): the totals and what made them. */
  resolved: Resolved | null = null;
  private ctx: ValueCtx | null = null;

  add(m: Modifier): void {
    if (import.meta.env?.DEV) {
      const st = STAT_DEFS[m.stat]?.stack;
      if (st === undefined) console.error(`[ledger] no stat ${String(m.stat)}`);
      else if ((st === Stack.Flag) !== (m.op.op === 'on')) console.error(`[ledger] ${m.op.op} on ${m.stat} (a ${st} stat) from ${JSON.stringify(m.source)}`);
    }
    this.mods.push(m);
  }

  /** Every modifier a source has a share in (the NOW tag of a pizza's card reads its growing ones). */
  of(source: SourceKey): Modifier[] {
    return this.mods.filter((m) => (typeof m.source === 'string' ? m.source === source : source in m.source));
  }

  /** A modifier's value now, and this source's part of it (by weight, for a shared one; `among` says which sharers
   *  count), and why when it grows. */
  partOf(m: Modifier, source: SourceKey, ctx: ValueCtx | null = this.ctx, among: (id: SourceKey) => boolean = () => true): { value: number; why?: string } | null {
    if (m.op.op === 'on' || !ctx) return null;
    const v = valueAt(m.op.value, ctx);
    let w = 1;
    if (typeof m.source !== 'string') {
      let tot = 0;
      for (const [id, x] of shareEntries(m.source)) if (among(id)) tot += x;
      w = tot ? (m.source[source] ?? 0) / tot : 0;
    }
    // (a multiplier's part is its share of what it adds: ×1.06 shared by two is +3% each)
    const value = m.op.op === 'mul' ? (v - 1) * w : v * w;
    return { value, why: isGrowing(m.op.value) ? m.op.value.why(ctx) : undefined };
  }

  /** Fold every modifier into the stats, keeping what each source did for the breakdown. */
  resolve(ctx: ValueCtx): Resolved {
    this.ctx = ctx;
    const s = {} as Record<StatKey, number | boolean>;
    for (const k of STAT_KEYS) s[k] = STAT_DEFS[k].base;
    // each source's share, as it's worked out (folded into the breakdown only when it's read)
    const credits: [StatKey, SourceRef, number][] = [];
    const credit = (k: StatKey, src: SourceRef, amount: number) => {
      if (Math.abs(amount) < EPS && STAT_DEFS[k].stack !== Stack.Flag) return;
      credits.push([k, src, amount]);
    };
    // modifiers by phase, then stat (in the order they were added)
    const by: Map<StatKey, Modifier[]>[] = PHASES.map(() => new Map());
    for (const m of this.mods) {
      const ph = by[m.phase];
      const list = ph.get(m.stat);
      if (list) list.push(m);
      else ph.set(m.stat, [m]);
    }
    const muls: [SourceRef, number][] = [];
    for (const phase of PHASES) {
      const ph = by[phase];
      // sets, adds and multipliers, one stat at a time
      for (const [k, list] of ph) {
        const d = STAT_DEFS[k];
        if (d.stack === Stack.Flag) continue;
        let x = s[k] as number;
        // the set that wins: the lowest for a Min stat (a sighting every 10 waves beats every 20), else the highest
        let best: Modifier | null = null;
        let bestV = 0;
        for (const m of list) {
          if (m.op.op !== 'set') continue;
          const v = val(m, ctx);
          if (!best || (d.stack === Stack.Min ? v < bestV : v > bestV)) [best, bestV] = [m, v];
        }
        if (best) {
          credit(k, best.source, bestV - x);
          x = bestV;
        }
        for (const m of list) {
          if (m.op.op !== 'add') continue;
          const v = val(m, ctx);
          x += v;
          credit(k, m.source, v);
        }
        // multipliers one at a time, in the order the sources were added: the same product to the last bit as always
        const p = d.around ?? 0;
        let after = x;
        let M = 1;
        muls.length = 0;
        for (const m of list) {
          if (m.op.op !== 'mul') continue;
          const v = val(m, ctx);
          after = p ? (after + p) * v - p : after * v;
          M *= v;
          muls.push([m.source, v]);
        }
        if (muls.length) {
          attribute(muls, after - x, M, (src, a) => credit(k, src, a));
          x = after;
        }
        s[k] = x;
      }
      // flags and the sources' own bounds
      for (const [k, list] of ph) {
        if (STAT_DEFS[k].stack === Stack.Flag) {
          for (const m of list)
            if (m.op.op === 'on') {
              s[k] = true;
              credit(k, m.source, 1);
            }
          continue;
        }
        let x = s[k] as number;
        for (const m of list) {
          if (m.op.op !== 'atLeast' && m.op.op !== 'atMost') continue;
          const v = val(m, ctx);
          const y = m.op.op === 'atLeast' ? Math.max(x, v) : Math.min(x, v);
          credit(k, m.source, y - x);
          x = y;
        }
        s[k] = x;
      }
      // caps: the whole set where the build is done (after the peel), the ceilings again after every later phase
      if (phase >= Phase.Peel)
        for (const k of CAPPED) {
          const c = STAT_DEFS[k].caps!;
          let x = s[k] as number;
          const x0 = x;
          if (phase === Phase.Peel) {
            if (c.min !== undefined) x = Math.max(c.min, x);
            if (c.soft && x > c.soft.from) x = c.soft.from + (x - c.soft.from) * c.soft.rate;
          }
          if (c.max !== undefined) x = Math.min(c.max, x);
          if (x !== x0) {
            credit(k, CAP_SOURCE, x - x0);
            s[k] = x;
          }
        }
    }
    let breakdown: Record<StatKey, Breakdown> | null = null;
    const stats = s as unknown as Stats;
    this.resolved = {
      stats,
      get breakdown() {
        return (breakdown ??= breakdownOf(stats, credits));
      },
    };
    return this.resolved;
  }
}

/** The stats with caps (the only ones the cap step looks at). */
const CAPPED = STAT_KEYS.filter((k) => STAT_DEFS[k].caps && typeof STAT_DEFS[k].base === 'number');

/** Each stat's sources and their shares, largest first. */
function breakdownOf(s: Stats, credits: [StatKey, SourceRef, number][]): Record<StatKey, Breakdown> {
  const shares = new Map<StatKey, Map<SourceKey, number>>();
  for (const [k, src, amount] of credits) {
    let m = shares.get(k);
    if (!m) shares.set(k, (m = new Map()));
    if (typeof src === 'string') m.set(src, (m.get(src) ?? 0) + amount);
    else {
      const tot = shareEntries(src).reduce((a, [, b]) => a + b, 0) || 1;
      for (const [id, w] of shareEntries(src)) m.set(id, (m.get(id) ?? 0) + (amount * w) / tot);
    }
  }
  const out = {} as Record<StatKey, Breakdown>;
  for (const k of STAT_KEYS) {
    const flag = STAT_DEFS[k].stack === Stack.Flag;
    const parts = [...(shares.get(k) ?? [])].map(([source, share]) => ({ source, share })).filter((p) => flag || Math.abs(p.share) > 1e-9);
    parts.sort((a, b) => Math.abs(b.share) - Math.abs(a.share));
    out[k] = { base: STAT_DEFS[k].base, total: s[k], parts };
  }
  return out;
}

function val(m: Modifier, ctx: ValueCtx): number {
  return m.op.op === 'on' ? 1 : valueAt(m.op.value, ctx);
}

/** Share what a phase's multipliers add (uplift = x·(M − 1)) between them by the log of each: fair whatever the
 *  order, and a ×0.85 gets a negative share. */
function attribute(ms: [SourceRef, number][], uplift: number, M: number, give: (src: SourceRef, a: number) => void): void {
  if (Math.abs(uplift) < EPS) return;
  if (ms.some(([, m]) => m <= 0)) {
    // (a ×0 wipes the rest out: it takes the whole change)
    const zero = ms.filter(([, m]) => m <= 0);
    for (const [src] of zero) give(src, uplift / zero.length);
    return;
  }
  const lnM = Math.log(M);
  if (Math.abs(lnM) < 1e-12) {
    // multipliers that cancel out: nothing to share
    return;
  }
  for (const [src, m] of ms) give(src, (uplift * Math.log(m)) / lnM);
}
