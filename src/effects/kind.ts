// An effect kind: written once, in its own file, with its constructor and its behaviour (docs/effects-plan.md).
// effectKind('stat', { make, apply, describe, scale, tags }) gives the maker (Effect.Stat(...)) and the spec the
// registry (src/effects/index.ts) runs. The data an effect makes is plain, tagged with its kind.

import type { Ledger, PhaseId, SourceRef } from './ledger';
import type { TagId } from './tags';
import type { PlayCtx } from './trigger';

/** What an effect may touch while it's applied: the ledger (numbers: Effect.Stat), or the trigger bus in play
 *  (subscribe to a game event, roll, find feet, run an action: the trigger kinds). Each kind uses its own part and
 *  does nothing without it (a stat effect isn't applied on the bus, nor a trigger on the ledger). */
export interface EffectCtx {
  ledger?: Ledger;
  play?: PlayCtx;
  /** Who it's from: Source.Topping('heavy'), Source.Pizza('margherita', 2), Source.Peel, Source.Meta… (or several sharing it: a SourceShare). */
  source: SourceRef;
  /** The phase its numbers go in, unless it says. */
  phase: PhaseId;
  /** The level being applied (a topping applies its effects once for each level it has: 1..owned). */
  level: number;
}

export interface KindSpec<D> {
  /** What it does in play. */
  apply(e: D, ctx: EffectCtx): void;
  /** Card text and STATS note. */
  describe(e: D): string;
  /** Stronger or weaker by a factor (enhanced, Napoletana, Echo Slice copies). */
  scale(e: D, k: number): D;
  /** What it is, for searches (Tag.Stat(Stat.Damage), Tag.Trigger(TriggerKind.OnKill)). */
  tags(e: D): TagId[];
  /** Its card text is written by hand (the scene's own tricks, the shop's rules, a proc's own words): describe() is
   *  for STATS, the audit and searches, never the generated card. */
  quiet?: boolean;
  /** Does it do anything at this level (a topping's level)? Every level, unless it says (Effect.Stat: an EachLevelUp
   *  chain's Op.Nothing, an { atLevel } effect's other levels). Infinite Oven only lifts a topping into levels that do. */
  doesAt?(e: D, level: number): boolean;
}

/** Declare a kind: its maker (which returns its data, tagged with `kind`) and its behaviour. The maker keeps its
 *  own signature (generics too), so Effect.Stat(Stat.CritChance, …) checks the operation against the stat's unit. */
export function effectKind<K extends string, M extends (...a: never[]) => { readonly kind: K }>(
  kind: K,
  make: M,
  spec: KindSpec<ReturnType<M>>,
): M & { readonly kind: K; readonly spec: KindSpec<ReturnType<M>> } {
  return Object.assign(make, { kind, spec });
}
