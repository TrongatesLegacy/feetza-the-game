// Tags: what an effect is, for searches ("which items freeze feet?", "what can Echo Slice copy?") and the step 4
// audit (docs/effects-plan.md). Typed makers, so a search can't ask for a tag that no effect gives:
//
//   Tag.Stat(Stat.Damage)  'stat:damage'          Tag.Trigger(TriggerKind.OnKill)  'trigger:onKill'
//   Tag.Status('freeze')   'status:freeze'        Tag.Cond('bossLike')             'cond:bossLike'
//
// Each kind's tags() returns these (src/effects/kind.ts KindSpec).

import type { CondData } from './cond';
import type { StatKey } from './stats';

/** The trigger kinds (the effects that fire in play). */
export const TriggerKind = {
  Every: 'every',
  OnKill: 'onKill',
  OnSmack: 'onSmack',
  OnSwing: 'onSwing',
  OnCrit: 'onCrit',
  OnStomp: 'onStomp',
  WaveStart: 'waveStart',
  WaveClear: 'waveClear',
  Defend: 'defend',
  Soften: 'soften',
  FrameStart: 'frameStart',
  Aura: 'aura',
  EachFrame: 'eachFrame',
  WaveOpen: 'waveOpen',
  OnPlaced: 'onPlaced',
  OnEnhanced: 'onEnhanced',
  OnDestroyed: 'onDestroyed',
  OnLost: 'onLost',
  PerHit: 'perHit',
  WaveClose: 'waveClose',
  OnSlam: 'onSlam',
  Charged: 'charged',
  OnLosses: 'onLosses',
} as const;
export type TriggerKindId = (typeof TriggerKind)[keyof typeof TriggerKind];

type OpTag = 'add' | 'mul' | 'set' | 'on' | 'atLeast' | 'atMost' | 'none';
type ScopeTag = 'table' | 'each' | 'sum' | 'target' | 'alive' | 'field' | 'own';
type StatusTag = 'burn' | 'slow' | 'stun' | 'freeze' | 'stone';
type ActionTag = 'tips' | 'reroll' | 'heal' | 'meter' | 'crust' | 'knock' | 'damage' | 'ability' | 'area' | 'relane';
/** A condition's name, or one inside a Not / AnyFoot. */
type CondId = Exclude<CondData['c'], 'all' | 'any' | 'not' | 'anyFoot'>;
type CondTag = `${'' | 'not:' | 'anyFoot:' | 'not:anyFoot:' | 'anyFoot:not:'}${CondId}`;

export type TagId =
  | `stat:${StatKey}`
  | `op:${OpTag}`
  | `each:${OpTag}`
  | `trigger:${TriggerKindId}`
  | `scope:${ScopeTag}`
  | `cond:${CondTag}`
  | `status:${StatusTag}`
  | `action:${ActionTag}`
  | `custom:${string}`
  | `hit:${string}`
  | `trick:${string}`
  | `shop:${string}`
  | `deal:${string}`
  | `proc:${string}`
  | `procFx:${string}`
  | `onPick:${string}`
  | `ally:${string}`
  | `charge:${string}`
  | `rule:${string}`
  | `outlives:${string}`
  | 'summons';

export const Tag = {
  Stat: (k: StatKey): TagId => `stat:${k}`,
  Op: (o: OpTag): TagId => `op:${o}`,
  /** An EachLevelUp chain's later op. */
  Each: (o: OpTag): TagId => `each:${o}`,
  Trigger: (k: TriggerKindId): TagId => `trigger:${k}`,
  Scope: (s: ScopeTag): TagId => `scope:${s}`,
  Cond: (c: CondTag): TagId => `cond:${c}`,
  Status: (s: StatusTag): TagId => `status:${s}`,
  Action: (a: ActionTag): TagId => `action:${a}`,
  Custom: (id: string): TagId => `custom:${id}`,
  /** A per-hit number (src/effects/perHit.ts HitStat). */
  Hit: (id: string): TagId => `hit:${id}`,
  /** A scene trick a topping turns on (src/effects/trick.ts). */
  Trick: (id: string): TagId => `trick:${id}`,
  /** A shop price rule (src/effects/shopPrice.ts). */
  Shop: (id: string): TagId => `shop:${id}`,
  /** A deal rule (src/effects/deal.ts). */
  Deal: (id: string): TagId => `deal:${id}`,
  /** A proc's trigger, and each of its effects (src/effects/proc.ts). */
  Proc: (t: string): TagId => `proc:${t}`,
  ProcFx: (e: string): TagId => `procFx:${e}`,
  /** What happens when it's picked (src/effects/onPick.ts). */
  OnPick: (id: string): TagId => `onPick:${id}`,
  Ally: (id: string): TagId => `ally:${id}`,
  /** Where a charged clock takes charge from (src/effects/charged.ts). */
  Charge: (from: string): TagId => `charge:${from}`,
  /** A rule a pizza perk changes in the scene (src/effects/rule.ts). */
  Rule: (id: string): TagId => `rule:${id}`,
  /** Why a trigger runs whatever its pizzas' state (src/effects/trigger.ts Outlives). */
  Outlives: (why: string): TagId => `outlives:${why}`,
  Summons: 'summons' as TagId,
} as const;
