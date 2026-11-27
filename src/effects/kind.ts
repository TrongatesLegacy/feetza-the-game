// An effect kind: written once, in its own file, with its constructor and its behaviour (docs/effects-plan.md).
// effectKind('stat', { make, apply, describe, scale, tags }) gives the maker (Effect.Stat(...)) and the spec the
// registry (src/effects/index.ts) runs. The data an effect makes is plain, tagged with its kind.

import type { Ledger, PhaseId, SourceRef } from './ledger';

/** What an effect may touch while it's applied. Step 1: the ledger (numbers). The trigger bus comes in step 2. */
export interface EffectCtx {
  ledger: Ledger;
  /** Who it's from: 'top:heavy', 'pizza:margherita@2', 'peel', 'meta'… (or several sharing it). */
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
  /** What it is, for searches ("stat:damage", "legacy"). */
  tags(e: D): string[];
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
