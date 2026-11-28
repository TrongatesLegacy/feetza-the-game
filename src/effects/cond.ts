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
  | { c: 'over' | 'hovering' | 'pierces' | 'fast' | 'bossKind' | 'mini' | 'undead' | 'cold' | 'goldenFoot' }
  | { c: 'stomping' | 'friendly' | 'pinned' | 'inPortal' | 'inTalons' }
  | { c: 'near' | 'full' | 'fullFresh' | 'haunted' | 'enhanced' }
  | { c: 'smack' | 'fresh' | 'night' | 'autoSlam' | 'notByAbility' | 'ready' }
  | { c: 'flag'; id: string }
  | { c: 'down'; y: Px }
  | { c: 'notEcho' | 'perfect' | 'earned' | 'bossWave' | 'afterBoss' | 'actStart' }
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
  // ——— step 3 ———
  /** Hovering or coming down (over the pizza it's after). */
  Over: { c: 'over' } as CondData,
  /** Hovering. */
  Hovering: { c: 'hovering' } as CondData,
  /** Its stomps pierce (a piercing foot). */
  Pierces: { c: 'pierces' } as CondData,
  /** A fast foot (quick on its feet, a rusher or a burster). */
  Fast: { c: 'fast' } as CondData,
  /** A boss or mini-boss by its type (its twins too). */
  BossKind: { c: 'bossKind' } as CondData,
  Mini: { c: 'mini' } as CondData,
  /** Undead (the zombie marking) or zombified in play. */
  Undead: { c: 'undead' } as CondData,
  /** Chilled (slowed: the game draws every slowed foot frosted) or frozen. */
  Cold: { c: 'cold' } as CondData,
  /** Stomping down on its pizza. */
  Stomping: { c: 'stomping' } as CondData,
  /** A friendly zombie (one held for you: Legendaries never move or take it). */
  Friendly: { c: 'friendly' } as CondData,
  /** Pinned in place (by a fight or a perk). */
  Pinned: { c: 'pinned' } as CondData,
  /** Already through Cosmic Crouton Supreme's portal. */
  InPortal: { c: 'inPortal' } as CondData,
  /** A pigeon is swooping on it (Pigeon King's Catch): nothing else takes it meanwhile. */
  InTalons: { c: 'inTalons' } as CondData,
  /** The golden foot, or a kill paid as golden (Midas). */
  Golden: { c: 'goldenFoot' } as CondData,
  /** The foot is over the pizza or close beside it (within 1.3 of its radius). */
  Near: { c: 'near' } as CondData,
  /** The pizza has every slice. */
  Full: { c: 'full' } as CondData,
  /** The pizza is fully fresh (or doesn't go stale). */
  FullFresh: { c: 'fullFresh' } as CondData,
  /** The Ghost is in the pizza. */
  Haunted: { c: 'haunted' } as CondData,
  /** The pizza is enhanced. */
  Enhanced: { c: 'enhanced' } as CondData,
  /** The hit is a smack. */
  Smack: { c: 'smack' } as CondData,
  /** The moment's pizza is fresh: placed now (not a saved run coming back), or destroyed with its perk still on. */
  Fresh: { c: 'fresh' } as CondData,
  /** The meter ability fired by itself (the meter filled), not pressed. */
  AutoSlam: { c: 'autoSlam' } as CondData,
  /** The kill wasn't the peel ability's own (an ability never sets itself off). */
  NotByAbility: { c: 'notByAbility' } as CondData,
  /** A foot could be hit as this pass of the frame began: the pass looks at the field once, for every timer in it
   *  (the toppings' procs: one coming due after another's hit the last foot still goes off, as it always did). */
  Ready: { c: 'ready' } as CondData,
  /** A night location (the wave's). */
  Night: { c: 'night' } as CondData,
  /** Something the game keeps that holds now (typed names: src/game/perkEffects.ts Flag). */
  Flag: <F extends string>(id: F): CondData => ({ c: 'flag', id }),
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
  isBossWave(n: number): boolean;
  isActStart(n: number): boolean;
  waveInStage(n: number): number;
  /** Is the wave's location a night one? */
  isNight?(n: number): boolean;
  /** A flag the game keeps (Cond.Flag). */
  flag?(id: string): boolean;
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
    case 'over':
      return f?.state === 'hover' || f?.state === 'descend';
    case 'hovering':
      return f?.state === 'hover';
    case 'pierces':
      return !!f?.has('pierce');
    case 'fast':
      return !!f && (f.type.speed >= 1.15 || f.has('rush') || f.has('burst'));
    case 'bossKind':
      return !!f?.type.boss;
    case 'mini':
      return !!f?.type.mini;
    case 'undead':
      return !!f && (!!f.type.undead || f.zombified);
    case 'cold':
      return !!f && ((f.stunT > 0 && f.frozen) || (f.slowT > 0 && f.slowPct > 0 && !f.type.traits.includes('immuneSlow')));
    case 'stomping':
      return f?.state === 'stomp';
    case 'friendly':
      return !!f?.zombieHold;
    case 'pinned':
      return !!f?.pinned;
    case 'inPortal':
      return !!f?.brain.portal;
    case 'inTalons':
      return !!f?.brain.pigeon;
    case 'goldenFoot':
      return ('golden' in x.ev && x.ev.golden) || f?.type.id === 'golden';
    case 'near': {
      const p = x.pizza;
      return !!f && !!p && (f.target === p || Math.abs(f.x - p.x) < p.radius * 1.3);
    }
    case 'full':
      return !!x.pizza && x.pizza.slices === x.pizza.maxSlices;
    case 'fullFresh':
      return !!x.pizza && (!x.pizza.freshOn || x.pizza.fresh >= x.pizza.maxFresh);
    case 'haunted':
      return !!x.pizza?.haunted;
    case 'enhanced':
      return !!x.pizza?.enhanced;
    case 'smack':
      return 'smack' in x.ev && x.ev.smack;
    case 'fresh':
      return 'fresh' in x.ev && x.ev.fresh;
    case 'autoSlam':
      return 'auto' in x.ev && x.ev.auto;
    case 'notByAbility':
      return !('byAbility' in x.ev && x.ev.byAbility);
    case 'ready':
      return 'ready' in x.ev && !!x.ev.ready;
    case 'night':
      return !!x.isNight?.(x.wave());
    case 'flag':
      return !!x.flag?.(c.id);
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
