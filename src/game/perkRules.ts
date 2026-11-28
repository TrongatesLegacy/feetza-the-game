// The pizza perks' rules (Effect.Rule, src/effects/rule.ts), as the scene asks for them: by the rule's typed name, for
// a pizza or for the table, never for a perk by name (docs/effects-plan.md, step 4). The rules are declared with the
// perks' other effects (src/game/perkEffects.ts); this indexes them once.
//
//   ruleOf(p, Rule.ThickCrust)    the chance p's perk blocks a stomp now (undefined: it has none, or its perk is off)
//   hasRule(p, Rule.NeverStale)   by its own perk (RULE_DEFS says whose perk each rule reads)
//   tableRule(run, Rule.TenthCrit) the table's: enhanced when a pizza granting it is

import type { PizzaPerk } from '../data/pizzas';
import { Rule, RULE_DEFS, RuleBy, type RuleData, type RuleId } from '../effects/rule';
import { pickEnh } from '../effects/status';
import type { Pizza } from './Pizza';
import { PERK_EFFECTS } from './perkEffects';

/** Each perk's rules, and the perks declaring each rule (in the order they're declared). */
const BY_PERK = new Map<PizzaPerk, Map<RuleId, RuleData>>();
const BY_RULE = new Map<RuleId, PizzaPerk[]>();
for (const [perk, list] of PERK_EFFECTS)
  for (const e of list) {
    if (e.kind !== 'rule') continue;
    const m = BY_PERK.get(perk) ?? new Map<RuleId, RuleData>();
    m.set(e.rule, e);
    BY_PERK.set(perk, m);
    BY_RULE.set(e.rule, [...(BY_RULE.get(e.rule) ?? []), perk]);
  }

/** A perk's rule, as declared. */
export function perkRule(perk: PizzaPerk | null | undefined, r: RuleId): RuleData | undefined {
  return perk ? BY_PERK.get(perk)?.get(r) : undefined;
}

/** A perk's rule's value as declared, plain (a pizza being placed: Meat Feast's slices), or undefined. */
export function perkValue(perk: PizzaPerk | null | undefined, r: RuleId, which: 'a' | 'b' = 'a'): number | undefined {
  const v = perkRule(perk, r)?.[which];
  return v === undefined ? undefined : pickEnh(v, false);
}

/** Does this perk declare the rule? */
export const declares = (perk: PizzaPerk | null | undefined, r: RuleId): boolean => !!perkRule(perk, r);

/** The perk a rule reads on this pizza: what it grants now, or its own (RULE_DEFS). */
const whose = (p: Pizza, r: RuleId): PizzaPerk | null => (RULE_DEFS[r].by === RuleBy.Own ? p.type.perk : p.perk);

/** Does the pizza have the rule (its perk on, for a granted rule)? */
export function hasRule(p: Pizza | null | undefined, r: RuleId): boolean {
  return !!p && declares(whose(p, r), r);
}

/** The rule's value on this pizza, plain or enhanced (`b`: its second value), or undefined when it hasn't the rule. */
export function ruleOf(p: Pizza | null | undefined, r: RuleId, which: 'a' | 'b' = 'a'): number | undefined {
  if (!p) return undefined;
  const e = perkRule(whose(p, r), r);
  const v = e?.[which];
  return v === undefined ? undefined : pickEnh(v, p.enhanced);
}

/** A table-wide rule's value: as declared, enhanced when a pizza granting its perk is (the run's enhancedPerks). */
export function tableRule(enhancedPerks: ReadonlySet<PizzaPerk>, r: RuleId, which: 'a' | 'b' = 'a'): number {
  const perks = BY_RULE.get(r) ?? [];
  const e = perkRule(perks[0], r);
  const v = e?.[which];
  if (v === undefined) {
    if (import.meta.env?.DEV) console.error(`[effects] no perk declares a value for rule ${r}`);
    return 0;
  }
  return pickEnh(v, perks.some((k) => enhancedPerks.has(k)));
}

/** The perks that declare a rule (for searches, and the borrowers' pools). */
export const perksWith = (r: RuleId): readonly PizzaPerk[] => BY_RULE.get(r) ?? [];

/** Napoletana's boost to every other perk, from the table's counts (Run.perkCounts): 1 + each boost × its pizzas. */
export function boostOf(counts: Partial<Record<PizzaPerk, number>>): number {
  let b = 0;
  for (const perk of perksWith(Rule.Boost)) b += (perkValue(perk, Rule.Boost) ?? 0) * (counts[perk] ?? 0);
  return 1 + b;
}
