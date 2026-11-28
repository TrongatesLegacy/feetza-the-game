// Effect.PerHit: a number worked out hit by hit, because it depends on the foot, the pizza or the moment
// (docs/effects-plan.md, step 3): the damage a hit does, the tips and score a kill pays, how far a smack knocks, the
// follow-up smack chance. Table-wide numbers the scene reads as it goes (shiny feet, events, drops, Golden Menu prices)
// fold the same way, with no foot.
//
//   Effect.PerHit(HitStat.Damage, Grow.Mul(Unit.Percent(10)), { scope: Scope.Each, when: Cond.All(Cond.Smack, Cond.Near) })
//   Effect.PerHit(HitStat.Tips, Grow.Add(Unit.Percent(20)), { when: Cond.BossWave })
//   Effect.PerHit(HitStat.Damage, Grow.By(Factor.Stone), { scope: Scope.Field })
//
// A stat's number starts at its base and each effect on it folds in the order they're listed (the order the old code
// multiplied and added them in, so every number is the same to the last bit), once for each grant that holds:
// Grow.Add adds per × strength, Grow.Mul multiplies by 1 + per × strength, Grow.Cut takes per × strength off,
// Grow.By multiplies by a one-off's own factor (a prop's: the Gorgon's stone, the Bifröst). Then the stat's floor.
// The strength is the grant's: the table's for Scope.Table, the pizza's own for Scope.Each and Scope.Target.

import type { Foot } from '../game/Foot';
import { condTags, holdsCond, type CondData } from './cond';
import { pizzaOf } from './events';
import { effectKind } from './kind';
import { Tag, TriggerKind, type TagId } from './tags';
import { Scope, type OutlivesId, type ScopeId } from './trigger';
import type { Percent } from './units';

/** The numbers worked out per hit (or per moment). */
export const HitStat = {
  /** What a hit does (× every other multiplier). */
  Damage: 'damage',
  /** What every hit in a wave is worth, whatever the foot (Victory Lap, Night Shift, Moon Cheese). */
  WaveDamage: 'waveDamage',
  /** What a kill pays in tips. */
  Tips: 'tips',
  /** What a kill scores. */
  Score: 'score',
  /** How far a smack knocks a foot. */
  Knock: 'knock',
  /** Follow-up smacks: added to the double-smack chance. */
  ExtraDouble: 'extraDouble',
  /** How often shiny feet turn up. */
  ShinyRate: 'shinyRate',
  /** How often wave events roll. */
  EventRate: 'eventRate',
  /** How much an event drops. */
  EventDrops: 'eventDrops',
  /** What the Golden Menu costs. */
  GoldenPrice: 'goldenPrice',
} as const;
export type HitStatId = (typeof HitStat)[keyof typeof HitStat];

/** Each per-hit number: where it starts, its floor, and how it reads. */
export const HIT_STATS: Record<HitStatId, { base: number; floor?: number; noun: string }> = {
  damage: { base: 1, noun: 'damage' },
  waveDamage: { base: 1, noun: 'damage this wave' },
  tips: { base: 1, noun: 'tips' },
  score: { base: 1, noun: 'score' },
  knock: { base: 1, noun: 'knockback' },
  extraDouble: { base: 0, noun: 'double smacks' },
  shinyRate: { base: 1, noun: 'shiny feet' },
  eventRate: { base: 1, noun: 'wave events' },
  eventDrops: { base: 1, noun: 'event drops' },
  goldenPrice: { base: 1, floor: 0.4, noun: 'Golden Menu prices' },
};

/** A hit (or a moment) being worked out. */
export interface HitQuery {
  foot: Foot | null;
  /** A smack (not a perk's or a topping's own hit). */
  smack: boolean;
  /** Paid as golden (Midas). */
  golden: boolean;
  /** The wave it's for. */
  wave: number;
}

export type GrowData = { g: 'add' | 'mul' | 'cut'; per: Percent } | { g: 'by'; factor: string };
export const Grow = {
  Add: (per: Percent): GrowData => ({ g: 'add', per }),
  Mul: (per: Percent): GrowData => ({ g: 'mul', per }),
  Cut: (per: Percent): GrowData => ({ g: 'cut', per }),
  /** A one-off's own factor (typed names: src/game/perkEffects.ts Factor). */
  By: <F extends string>(factor: F): GrowData => ({ g: 'by', factor }),
} as const;

export interface PerHitOpts {
  scope?: ScopeId;
  /** A Field one that runs whatever its pizzas' state (its props: a stone foot), and why. */
  outlives?: OutlivesId;
  /** Checked for each grant, with its pizza. */
  when?: CondData;
}

export interface PerHitData extends PerHitOpts {
  readonly kind: 'perHit';
  stat: HitStatId;
  grow: GrowData;
}

const make = (stat: HitStatId, grow: GrowData, o: PerHitOpts = {}): PerHitData => ({ kind: 'perHit', stat, grow, ...o });

/** Fold one effect into the number so far. */
function fold(e: PerHitData, m: number, k: number, factor: () => number): number {
  const g = e.grow;
  if (g.g === 'add') return m + g.per * k;
  if (g.g === 'mul') return m * (1 + g.per * k);
  if (g.g === 'cut') return m - g.per * k;
  return m * factor();
}

export const PerHitEffect = effectKind('perHit', make, {
  apply(e, ctx) {
    const play = ctx.play;
    if (!play) return;
    const scope = e.scope ?? Scope.Table;
    play.per(e.stat, (q, m) => {
      const g = e.grow;
      for (const gr of play.grants(scope, q, undefined, e.outlives)) {
        if (e.when && !holdsCond(e.when, { ...play.cond(q), pizza: gr.pizza ?? pizzaOf(q) })) continue;
        m = fold(e, m, gr.k(), () => (g.g === 'by' ? play.factor(g.factor, q) : 1));
      }
      return m;
    });
  },
  describe: (e) => {
    const g = e.grow;
    const noun = HIT_STATS[e.stat].noun;
    if (g.g === 'by') return `${noun}: ${g.factor.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()}`;
    const pc = Math.round(g.per * 100);
    return g.g === 'cut' ? `−${pc}% ${noun}` : `+${pc}% ${noun}`;
  },
  scale: (e, k) => (e.grow.g === 'by' ? e : { ...e, grow: { ...e.grow, per: (e.grow.per * k) as Percent } }),
  tags: (e): TagId[] => [Tag.Trigger(TriggerKind.PerHit), Tag.Hit(e.stat), Tag.Scope(e.scope ?? Scope.Table), ...(e.outlives ? [Tag.Outlives(e.outlives)] : []), ...condTags(e.when)],
});
