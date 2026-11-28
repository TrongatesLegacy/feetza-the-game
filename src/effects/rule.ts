// Effect.Rule: a rule a pizza perk changes in the scene's own code (docs/effects-plan.md, step 4): a stomp's walls, the
// table's freshness, a pizza's slices, what a smack over it does. The scene asks for the rule by its typed name, for
// the pizza in question (src/game/perkRules.ts), never for a perk by name, so the perk that declares it, a borrower
// copying it (Echo Slice, Arcobaleno) and a pizza whose perk is off (stale, frozen, possessed: Pizza.perk) all read
// right. Its numbers are declared here, plain or enhanced (Enh), and its words are the pizza's own card (quiet).
//
//   Effect.Rule(Rule.ThickCrust, Enh(Unit.Chance(30), Unit.Chance(45)))     Sicilian Square: blocks 30% of stomps
//   Effect.Rule(Rule.FewerSlices, Unit.Count(2), Unit.Count(4))             Lahmacun: 2 fewer slices, at least 4
//
// RULE_DEFS says, for each rule, what its values are and whose perk it reads: the perk the pizza grants now (off when
// its perk is off), or its own (a pizza being placed, going stale, destroyed or swapped out still has its own).

import { effectKind } from './kind';
import type { MaybeEnh } from './status';
import { Tag, type TagId } from './tags';

export const Rule = {
  // ——— shields and walls ———
  /** More shields each wave (Quattro Formaggi): a = how many. */
  ExtraShields: 'extraShields',
  /** It lights up when a shield on it blocks (Quattro Formaggi, Bufala): the shields are its doing. */
  ShieldGlow: 'shieldGlow',
  /** Guards its neighbours' first stomp each wave (Grandma Square): a = 1 when it guards itself too. */
  Guard: 'guard',
  /** A thick crust: a chance to block a stomp (Sicilian Square; an enhanced Stromboli): a = the chance. */
  ThickCrust: 'thickCrust',
  /** Holds against the second half of a double stomp and a wide foot's spill (Stromboli). */
  Sturdy: 'sturdy',
  /** Immune to soggy and scorch (Pizza Bianca): a = 1 when its neighbours are too. */
  Immune: 'immune',
  /** Never scorched (Inferno Calzone). */
  Fireproof: 'fireproof',
  // ——— slices and freshness ———
  /** More slices when placed (Meat Feast): a = how many. */
  MoreSlices: 'moreSlices',
  /** Fewer slices when placed (Lahmacun): a = how many, b = never below. */
  FewerSlices: 'fewerSlices',
  /** More slices when enhanced (Meat Feast, Lahmacun): a = how many. */
  EnhanceSlices: 'enhanceSlices',
  /** Regrows a slice every a seconds (Garden Veggie). */
  Regen: 'regen',
  /** Regrows every slice after a boss (Lahmacun). */
  BossRegrow: 'bossRegrow',
  /** Never goes stale (Pumpkin Spice). */
  NeverStale: 'neverStale',
  /** After a boss, every pizza +a freshness (Pumpkin Spice). */
  BossFreshen: 'bossFreshen',
  /** Its neighbours go stale at a × the pace (Pickle Pie). */
  Preserve: 'preserve',
  /** As it goes stale it heals every other pizza a slices (Pizza Fritta). */
  StaleHeal: 'staleHeal',
  /** Rises once with a slices when destroyed (Carbonara). */
  Rise: 'rise',
  /** Refunds a share of its price when swapped out (Pizza al Taglio). */
  Refund: 'refund',
  /** Its perk turns with the seasons each wave (Quattro Stagioni). */
  Seasons: 'seasons',
  // ——— the feet over it ———
  /** Feet above it are slowed by a (Pesto Genovese). */
  SlowAbove: 'slowAbove',
  /** Feet near it burn for a dmg/s (Marinara's garlic). */
  Aura: 'aura',
  /** Feet hovering above it burn for a dmg/s (Tarte Flambée). */
  HoverAura: 'hoverAura',
  /** Feet that stomp it catch fire at a dmg/s (Diavola). */
  StompBurn: 'stompBurn',
  /** Possessed by the Ghost, it sets itself alight when stomped (Diavola). */
  HauntedFire: 'hauntedFire',
  /** The wave's first foot above it takes a × damage (Tandoori). */
  MarkFirst: 'markFirst',
  /** Smacked feet above it lose their trait for a seconds (Greek). */
  Disarm: 'disarm',
  /** The wave's first a smacks above it send the foot back to the top (Mallow Mountain). */
  BounceTop: 'bounceTop',
  /** A stunned foot above it takes a × damage (Okonomiyaki). */
  StunnedDmg: 'stunnedDmg',
  // ——— the table's ———
  /** It lights up when the wave's regrowth lands (Spinach & Feta). */
  RegrowGlow: 'regrowGlow',
  /** It lights up when the wave's heal for the weakest pizza lands (the Calzone). */
  WeakestGlow: 'weakestGlow',
  /** A free card every a-th shop (Birthday Cake). */
  FreeEvery: 'freeEvery',
  /** Every a-th smack crits (Hawaiian's tenth). */
  TenthCrit: 'tenthCrit',
  /** The slam (or a meter ability) stuns for a seconds; an ability's hit stuns at b chance (Cajun Shrimp). */
  SlamStun: 'slamStun',
  /** It earns Golden Crusts (the Fig's): the run's crusts count it. */
  CrustEarner: 'crustEarner',
  /** Every other pizza's perk is a stronger (Napoletana). */
  Boost: 'boost',
  // ——— the borrowers ———
  /** Copies the perk of the pizza beside it (Echo Slice). */
  Echo: 'echo',
  /** Borrows another pizza's perk, a new one each wave (Arcobaleno). */
  Borrow: 'borrow',
  /** A hidden big perk, revealed on its first wave (Mystery Meat): its perk counts a × as strong. */
  Mystery: 'mystery',
  /** Picks a bonus each wave (Kitchen Sink). */
  Sink: 'sink',
} as const;
export type RuleId = (typeof Rule)[keyof typeof Rule];

/** Whose perk a rule reads: the pizza's perk now (off while it's stale, frozen, possessed or eaten), or its own. */
export const RuleBy = { Granted: 'granted', Own: 'own' } as const;
export type RuleById = (typeof RuleBy)[keyof typeof RuleBy];

/** Each rule's words and whose perk it reads. */
export const RULE_DEFS: Record<RuleId, { by: RuleById; words: string }> = {
  extraShields: { by: RuleBy.Granted, words: 'more shields each wave' },
  shieldGlow: { by: RuleBy.Granted, words: 'its shields light it up' },
  guard: { by: RuleBy.Granted, words: "guards its neighbours' first stomp each wave" },
  thickCrust: { by: RuleBy.Granted, words: 'a chance to block a stomp' },
  sturdy: { by: RuleBy.Granted, words: 'holds against double and wide stomps' },
  immune: { by: RuleBy.Granted, words: 'immune to soggy and scorch' },
  fireproof: { by: RuleBy.Granted, words: 'never scorched' },
  moreSlices: { by: RuleBy.Own, words: 'more slices' },
  fewerSlices: { by: RuleBy.Own, words: 'fewer slices' },
  enhanceSlices: { by: RuleBy.Own, words: 'more slices when enhanced' },
  regen: { by: RuleBy.Granted, words: 'regrows a slice' },
  bossRegrow: { by: RuleBy.Granted, words: 'regrows after a boss' },
  neverStale: { by: RuleBy.Own, words: 'never stale' },
  bossFreshen: { by: RuleBy.Granted, words: 'freshens the table after a boss' },
  preserve: { by: RuleBy.Granted, words: 'its neighbours go stale slower' },
  staleHeal: { by: RuleBy.Own, words: 'heals the table as it goes stale' },
  rise: { by: RuleBy.Own, words: 'rises once' },
  refund: { by: RuleBy.Own, words: 'refunds part of its price' },
  seasons: { by: RuleBy.Own, words: 'turns with the seasons' },
  slowAbove: { by: RuleBy.Granted, words: 'slows the feet above it' },
  aura: { by: RuleBy.Granted, words: 'burns the feet near it' },
  hoverAura: { by: RuleBy.Granted, words: 'burns the feet hovering above it' },
  stompBurn: { by: RuleBy.Granted, words: 'sets its stompers alight' },
  hauntedFire: { by: RuleBy.Own, words: 'burns itself while possessed' },
  markFirst: { by: RuleBy.Granted, words: "marks the wave's first foot" },
  disarm: { by: RuleBy.Granted, words: 'disarms the feet smacked above it' },
  bounceTop: { by: RuleBy.Granted, words: 'bounces feet back to the top' },
  stunnedDmg: { by: RuleBy.Granted, words: 'stunned feet above it take more' },
  regrowGlow: { by: RuleBy.Granted, words: "the wave's regrowth lights it up" },
  weakestGlow: { by: RuleBy.Granted, words: "the wave's heal for the weakest lights it up" },
  freeEvery: { by: RuleBy.Granted, words: 'a free card now and then' },
  tenthCrit: { by: RuleBy.Granted, words: 'every so many smacks crit' },
  slamStun: { by: RuleBy.Granted, words: 'the slam stuns' },
  crustEarner: { by: RuleBy.Granted, words: 'earns Golden Crusts' },
  boost: { by: RuleBy.Granted, words: "every other pizza's perk is stronger" },
  echo: { by: RuleBy.Own, words: 'copies its neighbour' },
  borrow: { by: RuleBy.Own, words: "borrows another pizza's perk" },
  mystery: { by: RuleBy.Own, words: 'a hidden big perk' },
  sink: { by: RuleBy.Own, words: 'picks a bonus each wave' },
};

export interface RuleData {
  readonly kind: 'rule';
  rule: RuleId;
  a?: MaybeEnh<number>;
  b?: MaybeEnh<number>;
}

const make = (rule: RuleId, a?: MaybeEnh<number>, b?: MaybeEnh<number>): RuleData => ({ kind: 'rule', rule, ...(a !== undefined ? { a } : {}), ...(b !== undefined ? { b } : {}) });

export const RuleEffect = effectKind('rule', make, {
  // (read by the scene, src/game/perkRules.ts; nothing to apply)
  apply: () => {},
  describe: (e) => RULE_DEFS[e.rule].words,
  scale: (e) => e,
  tags: (e): TagId[] => [Tag.Rule(e.rule)],
  quiet: true,
});
