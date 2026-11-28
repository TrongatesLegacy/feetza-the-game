// The effect vocabulary (docs/effects-plan.md): every kind under one name, and the registry the game runs them
// through. The game never switches on a kind: effects.apply(e, ctx) looks it up.
//
// Effect.Stat (numbers, through the modifier ledger) and the trigger kinds (step 2), which subscribe on the trigger
// bus in play (src/game/perkBus.ts): Effect.Every (a timer), OnKill, OnSmack, OnSwing, OnCrit, OnStomp, WaveStart and
// WaveClear. Anything not yet ported stays in its old code path (listed in docs/effects-plan.md), never wrapped.

import { EveryEffect } from './every';
import type { EffectCtx, KindSpec } from './kind';
import type { TagId } from './tags';
import { OnCritEffect } from './onCrit';
import { OnKillEffect } from './onKill';
import { OnSmackEffect } from './onSmack';
import { OnStompEffect } from './onStomp';
import { OnSwingEffect } from './onSwing';
import { StatEffect } from './stat';
import { WaveClearEffect } from './waveClear';
import { WaveStartEffect } from './waveStart';
import { DefendEffect } from './defend';
import { SoftenEffect } from './soften';
import { FrameStartEffect } from './frameStart';
import { AuraEffect } from './aura';
import { EachFrameEffect } from './eachFrame';
import { WaveOpenEffect } from './waveOpen';
import { OnPlacedEffect } from './onPlaced';
import { OnEnhancedEffect } from './onEnhanced';
import { OnDestroyedEffect } from './onDestroyed';
import { OnLostEffect } from './onLost';
import { PerHitEffect } from './perHit';
import { WaveCloseEffect } from './waveClose';
import { TrickEffect } from './trick';
import { ShopPriceEffect } from './shopPrice';
import { DealEffect } from './deal';
import { ProcEffect } from './proc';
import { OnPickEffect } from './onPick';
import { OnSlamEffect } from './onSlam';

export const Effect = {
  Stat: StatEffect,
  Every: EveryEffect,
  OnKill: OnKillEffect,
  OnSmack: OnSmackEffect,
  OnSwing: OnSwingEffect,
  OnCrit: OnCritEffect,
  OnStomp: OnStompEffect,
  WaveStart: WaveStartEffect,
  WaveClear: WaveClearEffect,
  Defend: DefendEffect,
  Soften: SoftenEffect,
  FrameStart: FrameStartEffect,
  Aura: AuraEffect,
  EachFrame: EachFrameEffect,
  WaveOpen: WaveOpenEffect,
  OnPlaced: OnPlacedEffect,
  OnEnhanced: OnEnhancedEffect,
  OnDestroyed: OnDestroyedEffect,
  OnLost: OnLostEffect,
  PerHit: PerHitEffect,
  WaveClose: WaveCloseEffect,
  Trick: TrickEffect,
  ShopPrice: ShopPriceEffect,
  Deal: DealEffect,
  Proc: ProcEffect,
  OnPick: OnPickEffect,
  OnSlam: OnSlamEffect,
} as const;

/** Any effect, as data. */
export type EffectData = ReturnType<(typeof Effect)[keyof typeof Effect]>;
export type EffectKindId = EffectData['kind'];

// every kind's behaviour, by its tag (a kind missing here, or missing a method, doesn't compile)
const KINDS: { [E in EffectData as E['kind']]: KindSpec<E> } = {
  stat: StatEffect.spec,
  every: EveryEffect.spec,
  onKill: OnKillEffect.spec,
  onSmack: OnSmackEffect.spec,
  onSwing: OnSwingEffect.spec,
  onCrit: OnCritEffect.spec,
  onStomp: OnStompEffect.spec,
  waveStart: WaveStartEffect.spec,
  waveClear: WaveClearEffect.spec,
  defend: DefendEffect.spec,
  soften: SoftenEffect.spec,
  frameStart: FrameStartEffect.spec,
  aura: AuraEffect.spec,
  eachFrame: EachFrameEffect.spec,
  waveOpen: WaveOpenEffect.spec,
  onPlaced: OnPlacedEffect.spec,
  onEnhanced: OnEnhancedEffect.spec,
  onDestroyed: OnDestroyedEffect.spec,
  onLost: OnLostEffect.spec,
  perHit: PerHitEffect.spec,
  waveClose: WaveCloseEffect.spec,
  trick: TrickEffect.spec,
  shopPrice: ShopPriceEffect.spec,
  deal: DealEffect.spec,
  proc: ProcEffect.spec,
  onPick: OnPickEffect.spec,
  onSlam: OnSlamEffect.spec,
};

const spec = <E extends EffectData>(e: E) => KINDS[e.kind as E['kind']] as unknown as KindSpec<E>;

export const effects = {
  apply: (e: EffectData, ctx: EffectCtx): void => spec(e).apply(e, ctx),
  describe: (e: EffectData): string => spec(e).describe(e),
  scale: <E extends EffectData>(e: E, k: number): E => spec(e).scale(e, k),
  tags: (e: EffectData): TagId[] => spec(e).tags(e),
  /** Its card text is written by hand (KindSpec.quiet). */
  quiet: (e: EffectData): boolean => !!spec(e).quiet,
  /** Does it do anything at this level (KindSpec.doesAt)? */
  doesAt: (e: EffectData, level: number): boolean => spec(e).doesAt?.(e, level) ?? true,
};

/** Apply a list of effects from one source, once for each level (a topping at LV3 applies them for 1, 2 and 3). */
export function applyAll(list: readonly EffectData[], ctx: Omit<EffectCtx, 'level'>, levels = 1): void {
  const c: EffectCtx = { ...ctx, level: 1 };
  for (let l = 1; l <= levels; l++) {
    c.level = l;
    for (const e of list) effects.apply(e, c);
  }
}

export { Op } from './stat';
export { Stat, STAT_DEFS, Section, Stack, Better } from './stats';
export { Unit, UnitKind } from './units';
export { When } from './when';
export { GameEvent, Answer, type EventData, type GameEventId } from './events';
export { Guard } from './defend';
export { Trick, TRICK_DEFS, isAutoTrick, type TrickId } from './trick';
export { Price, type PriceId } from './shopPrice';
export { DealRule, type DealRuleId } from './deal';
export { HitStat, Grow, type HitQuery, type HitStatId } from './perHit';
export { Cond, type CondData } from './cond';
export { Status, Enh, Dps, SlowStack } from './status';
export { Action, Pay, At, Who, Ally, Hit, type ActionData, type ActionHost, type Fire } from './actions';
export { Scope, Nth, type PlayCtx, type Grant } from './trigger';
export { Pick, Reset } from './every';
export { Tag, TriggerKind, type TagId, type TriggerKindId } from './tags';
export { Ledger, Phase, Grows } from './ledger';
