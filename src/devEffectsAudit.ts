// F.effectsAudit() (docs/effects-plan.md, steps 3 and 4): every item (toppings, pizzas, peels) through the effect
// adapters, on the live Game scene (F.startGame first). `npm run golden` (so `npm run check`) runs it headless and fails
// on any problem (problemsOf). It reports:
// - items that declare no effect (a problem: every item declares at least one, and the types say so too);
// - items whose effects no STATS tile, "More effects" line or perk card shows (a problem: it builds each item alone and
//   reads the STATS tab's own view, as the game does);
// - the off-switch: every trigger goes by the bus's one rule (its scope reads Pizza.perk; a field-wide or own trigger
//   is held while its perk is off), unless it declares that it outlives its pizzas and why (Outlives). Those are
//   listed with their reason; a trigger with an unknown scope or reason, or a topping's or peel's on the field, is a
//   problem;
// - the rules that read the pizza's own perk, whatever it grants (RuleBy.Own), listed;
// - any adapter (describe, tags, scale) that throws (a problem).
// Dev only; it puts the run back as it found it.

import { UPGRADES, kindOf, UpgradeKind, type Upgrade } from './data/upgrades';
import { PIZZAS, type PizzaPerk } from './data/pizzas';
import { Effect, Op, Stat, effects, type ActionData, type EffectData } from './effects';
import { Outlives, Scope } from './effects/trigger';
import { RULE_DEFS, RuleBy } from './effects/rule';
import { Source } from './effects/source';
import { ABILITIES } from './game/abilities';
import { PERK_EFFECTS } from './game/perkEffects';
import { PERK_NONE, PERK_STATS, PERK_TIPS, TABLE_SHAPED } from './game/perkStats';
import { abilityEffects } from './game/peelEffects';
import type { BuildView } from './game/buildStats';
import { save } from './systems/save';

type AnyScene = any; // eslint-disable-line @typescript-eslint/no-explicit-any

const TABLE: readonly PizzaPerk[] = TABLE_SHAPED;
const SCOPES = new Set<string>(Object.values(Scope));
const REASONS = new Set<string>(Object.values(Outlives));

/** A pizza perk's declared effects: its stats (PERK_STATS, at strength 1; Pepperoni's and the luck pizzas' tips are one
 *  sum, PERK_TIPS, declared in Run.buildLedger) and its triggers (PERK_EFFECTS). */
export function perkEffectsOf(perk: PizzaPerk): EffectData[] {
  const stats = PERK_STATS[perk];
  const tips = perk in PERK_TIPS ? [
    Effect.Stat(
      Stat.CoinMult,
      Op.Add(PERK_TIPS[perk as keyof typeof PERK_TIPS]),
    ),
  ] : [];
  return [...(stats && stats !== PERK_NONE ? stats(1) : []), ...tips, ...PERK_EFFECTS.filter(([p]) => p === perk).flatMap(([, l]): readonly EffectData[] => l)];
}

interface Row {
  id: string;
  name: string;
  effects: number;
  kinds: string[];
}

export interface EffectsAudit {
  counts: { toppings: number; pizzas: number; peels: number; effects: number };
  noEffects: { toppings: string[]; pizzas: string[]; peels: string[] };
  /** Built alone, nothing on the STATS tab names it (no tile chip, no More effects line, no perk card). */
  notShown: { toppings: string[]; pizzas: string[]; peels: string[] };
  /** Shown only by its card (a one-use topping's armed line; a pizza whose numbers no tile names: its perk card). */
  cardOnly: { toppings: string[]; pizzas: string[] };
  /** Triggers that run whatever their pizzas' state, each with its declared reason (TriggerOpts.outlives). */
  outlives: string[];
  /** Field-wide and own triggers the bus's off-switch holds (no reason to outlive their pizzas declared). */
  gated: number;
  /** Rules that read the pizza's own perk, whatever it grants (RuleBy.Own). */
  ownRules: string[];
  /** Triggers that skip the off-switch: an unknown scope or reason, or a topping's or a peel's on the field. */
  offSwitch: string[];
  adapterErrors: string[];
  rows: { toppings: Row[]; pizzas: Row[]; peels: Row[] };
}

const kindsOf = (list: readonly EffectData[]) => [...new Set(list.map((e) => e.kind))];

/** An action that does something: an ability with no effects of its own, or a sequence of nothing, doesn't. */
function acts(a: ActionData): boolean {
  if (a.a === 'ability') return a.fx.length > 0;
  if (a.a === 'seq') return a.list.some(acts);
  if (a.a === 'later' || a.a === 'area') return acts(a.act);
  return true;
}
/** An effect that does something (a trigger whose action is empty declares nothing). */
const doesSomething = (e: EffectData): boolean => !('action' in e) || acts(e.action);

/** The STATS tab's chips: every tile's and automatic tile's sources, and the More effects lines. */
function chipsOf(v: BuildView): Set<string> {
  return new Set(v.sections.flatMap((s) => [...s.tiles, ...(s.auto ?? [])].flatMap((t) => t.from.map((f) => f.key))));
}

export function effectsAudit(g: AnyScene): EffectsAudit {
  const out: EffectsAudit = {
    counts: { toppings: 0, pizzas: 0, peels: 0, effects: 0 },
    noEffects: { toppings: [], pizzas: [], peels: [] },
    notShown: { toppings: [], pizzas: [], peels: [] },
    cardOnly: { toppings: [], pizzas: [] },
    outlives: [],
    gated: 0,
    ownRules: [],
    offSwitch: [],
    adapterErrors: [],
    rows: { toppings: [], pizzas: [], peels: [] },
  };
  const adapt = (who: string, list: readonly EffectData[]) => {
    out.counts.effects += list.length;
    for (const e of list) {
      try {
        effects.describe(e);
        effects.tags(e);
        effects.scale(e, 1.5);
        effects.doesAt(e, 2);
      } catch (err) {
        out.adapterErrors.push(`${who} ${e.kind}: ${String(err)}`);
      }
      const scope = 'scope' in e ? e.scope : undefined;
      const why = 'outlives' in e ? e.outlives : undefined;
      if (scope !== undefined && !SCOPES.has(scope)) out.offSwitch.push(`${who} ${e.kind}: an unknown scope (${scope})`);
      if (why !== undefined && !REASONS.has(why)) out.offSwitch.push(`${who} ${e.kind}: an unknown reason to outlive its pizzas (${why})`);
      if (scope === Scope.Field || scope === Scope.Own) {
        if (!who.startsWith('pizza')) out.offSwitch.push(`${who} ${e.kind}: a ${scope} trigger, which only a pizza perk has`);
        else if (why) out.outlives.push(`${who} ${e.kind} (${scope}): ${why}`);
        else out.gated++;
      } else if (why) out.offSwitch.push(`${who} ${e.kind}: outlives its pizzas but its scope (${scope ?? Scope.Table}) holds it anyway`);
      if (e.kind === 'rule' && RULE_DEFS[e.rule].by === RuleBy.Own) out.ownRules.push(`${who} ${e.rule}`);
    }
  };
  const r = g.run;
  const was = { owned: { ...r.owned }, armed: [...r.armed], ability: g.ability, table: g.pizzas.map((p: AnyScene) => p.type.id) };
  const peelsBefore = [...save.peels];
  const table = (ids: string[]) => {
    g.possessedPizza = null;
    for (const p of g.pizzas) p.destroy();
    g.pizzas = [];
    for (const id of ids) g.addPizza(id, 8, false, undefined, true);
    g.layoutPizzas(false);
  };
  try {
    // ——— toppings ———
    table(['margherita', 'pepperoni', 'funghi']);
    g.ability = null;
    for (const u of UPGRADES as Upgrade[]) {
      out.counts.toppings++;
      const list = u.effects ?? [];
      out.rows.toppings.push({ id: u.id, name: u.name, effects: list.length, kinds: kindsOf(list) });
      if (!list.some(doesSomething)) out.noEffects.toppings.push(u.id);
      adapt(`topping ${u.id}`, list);
      if (kindOf(u) === UpgradeKind.Consumable) {
        out.cardOnly.toppings.push(u.id);
        continue;
      }
      r.owned = { [u.id]: 1 };
      r.armed = [];
      const v: BuildView = g.statsView();
      if (!chipsOf(v).has(Source.Topping(u.id))) out.notShown.toppings.push(u.id);
    }
    // ——— pizzas ———
    r.owned = {};
    const seen = new Set<string>();
    for (const p of PIZZAS) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.counts.pizzas++;
      const list = perkEffectsOf(p.perk);
      out.rows.pizzas.push({ id: p.id, name: p.name, effects: list.length, kinds: kindsOf(list) });
      if (!list.some(doesSomething) && !TABLE.includes(p.perk)) out.noEffects.pizzas.push(`${p.id} (${p.perk})`);
      adapt(`pizza ${p.id}`, list);
      table([p.id, 'margherita', 'pepperoni']);
      const v: BuildView = g.statsView();
      const card = v.pizzas.some((c) => c.id === p.id);
      const chip = [...chipsOf(v)].some((k) => k === `pizza:${p.id}`);
      if (!chip && !card) out.notShown.pizzas.push(p.id);
      else if (!chip) out.cardOnly.pizzas.push(p.id);
    }
    // ——— peels ———
    table(['margherita', 'pepperoni', 'funghi']);
    for (const [id, a] of Object.entries(ABILITIES)) {
      out.counts.peels++;
      const list = abilityEffects(a);
      out.rows.peels.push({ id, name: a.name, effects: list.length, kinds: kindsOf(list) });
      if (!list.some(doesSomething)) out.noEffects.peels.push(id);
      adapt(`peel ${id}`, list);
      g.ability = a;
      const v: BuildView = g.statsView();
      if (!chipsOf(v).has('peel')) out.notShown.peels.push(id);
    }
  } finally {
    r.owned = was.owned;
    r.armed = was.armed;
    g.ability = was.ability;
    save.peels = peelsBefore;
    table(was.table);
    g.computeStats();
  }
  return out;
}

/** What fails the check (npm run golden): an item declaring nothing, an item nothing shows, a trigger skipping the
 *  off-switch, an adapter that throws. */
export function problemsOf(a: EffectsAudit): string[] {
  const out: string[] = [];
  for (const [what, ids] of Object.entries(a.noEffects)) for (const id of ids) out.push(`${what}: ${id} declares no effect`);
  for (const [what, ids] of Object.entries(a.notShown)) for (const id of ids) out.push(`${what}: ${id} shows on neither STATS nor a card`);
  out.push(...a.offSwitch.map((s) => `off-switch: ${s}`));
  out.push(...a.adapterErrors.map((s) => `adapter: ${s}`));
  return out;
}
