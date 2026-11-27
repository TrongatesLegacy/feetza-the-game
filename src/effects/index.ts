// The effect vocabulary (docs/effects-plan.md): every kind under one name, and the registry the game runs them
// through. The game never switches on a kind: effects.apply(e, ctx) looks it up.
//
// Step 1 has Effect.Stat (numbers, through the modifier ledger) and Effect.Legacy (the old way, for anything not
// yet ported). The trigger kinds (OnKill, Every, OnStomp…) come in step 2.

import type { EffectCtx, KindSpec } from './kind';
import { LegacyEffect } from './legacy';
import { StatEffect } from './stat';

export const Effect = { Stat: StatEffect, Legacy: LegacyEffect } as const;

/** Any effect, as data. */
export type EffectData = ReturnType<(typeof Effect)[keyof typeof Effect]>;
export type EffectKindId = EffectData['kind'];

// every kind's behaviour, by its tag (a kind missing here, or missing a method, doesn't compile)
const KINDS: { [E in EffectData as E['kind']]: KindSpec<E> } = {
  stat: StatEffect.spec,
  legacy: LegacyEffect.spec,
};

const spec = <E extends EffectData>(e: E) => KINDS[e.kind as E['kind']] as unknown as KindSpec<E>;

export const effects = {
  apply: (e: EffectData, ctx: EffectCtx): void => spec(e).apply(e, ctx),
  describe: (e: EffectData): string => spec(e).describe(e),
  scale: <E extends EffectData>(e: E, k: number): E => spec(e).scale(e, k),
  tags: (e: EffectData): string[] => spec(e).tags(e),
};

/** Apply a list of effects from one source, once for each level (a topping at LV3 applies them for 1, 2 and 3). */
export function applyAll(list: readonly EffectData[], ctx: Omit<EffectCtx, 'level'>, levels = 1): void {
  const c: EffectCtx = { ...ctx, level: 1 };
  for (let l = 1; l <= levels; l++) {
    c.level = l;
    for (const e of list) effects.apply(e, c);
  }
}

export { Op, Levels } from './stat';
export { Stat, STAT_DEFS, Section, Stack, Better } from './stats';
export { Unit } from './units';
export { When } from './when';
export { Ledger, Phase, Grows } from './ledger';
