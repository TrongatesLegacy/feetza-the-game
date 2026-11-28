// Typed conditions a trigger effect can wait on (docs/effects-plan.md): about the foot a moment is about (Cond.Boss,
// Cond.Burning…), about the moment itself (Cond.NotEcho, Cond.Perfect) or the field (Cond.AnyFoot(…)), combined with
// Cond.All, Cond.Any and Cond.Not. They're plain data, so "which perks care about bosses?" is a search.

import type { Foot } from '../game/Foot';
import type { Pizza } from '../game/Pizza';
import type { AnyEvent } from './events';
import type { TagId } from './tags';
import { Tag } from './tags';
import type { Px } from './units';

export type CondData =
  | { c: 'alive' | 'hittable' | 'bossLike' | 'trueBoss' | 'diving' | 'burning' | 'puppet' | 'free' | 'decoy' | 'slowable' | 'burnable' }
  | { c: 'down'; y: Px }
  | { c: 'notEcho' | 'perfect' | 'earned' | 'bossWave' | 'afterBoss' | 'actStart' | 'notPossessed' }
  | { c: 'waveInStage'; n: number }
  | { c: 'anyFoot'; of: CondData }
  | { c: 'all' | 'any'; of: CondData[] }
  | { c: 'not'; of: CondData };

export const Cond = {
  /** The foot is still standing. */
  Alive: { c: 'alive' } as CondData,
  /** It can be hit now. */
  Hittable: { c: 'hittable' } as CondData,
  /** A boss or mini-boss (or one of a boss's twins). */
  Boss: { c: 'bossLike' } as CondData,
  /** A boss proper (not a mini-boss). */
  TrueBoss: { c: 'trueBoss' } as CondData,
  /** Coming down on a pizza. */
  Diving: { c: 'diving' } as CondData,
  /** On fire. */
  Burning: { c: 'burning' } as CondData,
  /** A foot a fight moves by hand (a puppet). */
  Puppet: { c: 'puppet' } as CondData,
  /** A free foot (a boss's own helper, never sent off). */
  Free: { c: 'free' } as CondData,
  /** A boss's decoy. */
  Decoy: { c: 'decoy' } as CondData,
  /** Not immune to slows / burns (Status.Slow and Status.Burn check this themselves). */
  Slowable: { c: 'slowable' } as CondData,
  Burnable: { c: 'burnable' } as CondData,
  /** Further down the screen than y (on the table, not still coming in). */
  Down: (y: Px): CondData => ({ c: 'down', y }),
  /** The kill isn't a boss's Ghost echo or one of several of a boss while another stands (they pay a tenth). */
  NotEcho: { c: 'notEcho' } as CondData,
  /** The wave was cleared without losing a slice. */
  Perfect: { c: 'perfect' } as CondData,
  /** Tips were earned this wave. */
  Earned: { c: 'earned' } as CondData,
  BossWave: { c: 'bossWave' } as CondData,
  /** The wave right after a boss wave. */
  AfterBoss: { c: 'afterBoss' } as CondData,
  /** The first wave of an act. */
  ActStart: { c: 'actStart' } as CondData,
  /** The n-th wave of its stage. */
  WaveInStage: (n: number): CondData => ({ c: 'waveInStage', n }),
  /** The pizza the moment is about isn't the Ghost's. */
  NotPossessed: { c: 'notPossessed' } as CondData,
  /** Some foot on the field matches. */
  AnyFoot: (of: CondData): CondData => ({ c: 'anyFoot', of }),
  All: (...of: CondData[]): CondData => ({ c: 'all', of }),
  Any: (...of: CondData[]): CondData => ({ c: 'any', of }),
  Not: (of: CondData): CondData => ({ c: 'not', of }),
} as const;

/** What a condition is checked against. */
export interface CondCtx {
  foot: Foot | null;
  pizza: Pizza | null;
  ev: AnyEvent;
  feet(): Foot[];
  wave(): number;
  possessed(): Pizza | null;
  isBossWave(n: number): boolean;
  isActStart(n: number): boolean;
  waveInStage(n: number): number;
}

/** Does the condition hold for this foot (the moment's, unless given)? */
export function holdsCond(c: CondData, x: CondCtx, f: Foot | null = x.foot): boolean {
  switch (c.c) {
    case 'alive':
      return !!f?.alive;
    case 'hittable':
      return !!f?.hittable;
    case 'bossLike':
      return !!f?.isBossLike;
    case 'trueBoss':
      return !!f && !!f.type.boss && !f.type.mini;
    case 'diving':
      return f?.state === 'descend';
    case 'burning':
      return !!f && f.burnT > 0 && f.burnDps > 0;
    case 'puppet':
      return !!f?.puppet;
    case 'free':
      return !!f?.brain.free;
    case 'decoy':
      return !!f?.brain.decoy;
    case 'slowable':
      return !!f && !f.type.traits.includes('immuneSlow');
    case 'burnable':
      return !!f && !f.type.traits.includes('immuneBurn');
    case 'down':
      return !!f && f.y > c.y;
    case 'notEcho':
      return !('echo' in x.ev && x.ev.echo);
    case 'perfect':
      return 'perfect' in x.ev && x.ev.perfect;
    case 'earned':
      return 'earned' in x.ev && x.ev.earned > 0;
    case 'bossWave':
      return x.isBossWave(x.wave());
    case 'afterBoss':
      return x.wave() > 1 && x.isBossWave(x.wave() - 1);
    case 'actStart':
      return x.isActStart(x.wave());
    case 'waveInStage':
      return x.waveInStage(x.wave()) === c.n;
    case 'notPossessed':
      return x.pizza !== x.possessed();
    case 'anyFoot':
      return x.feet().some((o) => holdsCond(c.of, x, o));
    case 'all':
      return c.of.every((o) => holdsCond(o, x, f));
    case 'any':
      return c.of.some((o) => holdsCond(o, x, f));
    case 'not':
      return !holdsCond(c.of, x, f);
  }
}

/** Every condition named in c (for tags and searches): Tag.Cond('bossLike'), Tag.Cond('not:bossLike')… */
export function condTags(c: CondData | undefined, pre = ''): TagId[] {
  if (!c) return [];
  if (c.c === 'all' || c.c === 'any') return c.of.flatMap((o) => condTags(o, pre));
  if (c.c === 'not' || c.c === 'anyFoot') return condTags(c.of, `${pre}${c.c}:`);
  return [Tag.Cond(`${pre}${c.c}` as Parameters<typeof Tag.Cond>[0])];
}
