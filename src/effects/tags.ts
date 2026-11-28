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
} as const;
export type TriggerKindId = (typeof TriggerKind)[keyof typeof TriggerKind];

type OpTag = 'add' | 'mul' | 'set' | 'on' | 'atLeast' | 'atMost' | 'none';
type ScopeTag = 'table' | 'each' | 'sum' | 'target' | 'alive';
type StatusTag = 'burn' | 'slow' | 'stun' | 'freeze';
type ActionTag = 'tips' | 'reroll' | 'heal' | 'meter' | 'crust';
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
  | `ally:${string}`
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
  Ally: (id: string): TagId => `ally:${id}`,
  Summons: 'summons' as TagId,
} as const;
