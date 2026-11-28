// F.effectsAudit() (docs/effects-plan.md, step 3; finished in step 4): every item (toppings, pizzas, peels) through
// the effect adapters, on the live Game scene (F.startGame first). It reports:
// - items that declare no effect (still on an old code path);
// - items whose effects no STATS tile, "More effects" line or perk card shows (it builds each item alone and reads the
//   STATS tab's own view, as the game does);
// - effects that skip the stale, frozen and possessed rules: triggers whose scope reads its own off-switch
//   (Scope.Field: props and set-ups; Scope.Own: by the pizza's own perk, whatever it grants);
// - any adapter (describe, tags, scale) that throws.
// Dev only; it puts the run back as it found it.

import { UPGRADES, kindOf, UpgradeKind, type Upgrade } from './data/upgrades';
import { PIZZAS, type PizzaPerk } from './data/pizzas';
import { Effect, Op, Stat, effects, type EffectData } from './effects';
import { Scope } from './effects/trigger';
import { Source } from './effects/source';
import { ABILITIES } from './game/abilities';
import { PERK_EFFECTS } from './game/perkEffects';
import { PERK_NONE, PERK_STATS, PERK_TIPS } from './game/perkStats';
import { abilityEffects } from './game/peelEffects';
import type { BuildView } from './game/buildStats';
import { save } from './systems/save';

type AnyScene = any; // eslint-disable-line @typescript-eslint/no-explicit-any

/** The perks whose numbers PizzaPerkKit.modifiers works out from the whole table (a declared Grows value each). */
const TABLE_SHAPED: PizzaPerk[] = ['varietyDmg', 'peelDmg', 'comboLong', 'smackSpeed', 'crustRun', 'forgeWaves', 'skaldSaga', 'kitchenSink'];

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
  return [...(stats && stats !== PERK_NONE ? stats(1) : []), ...tips, ...PERK_EFFECTS.filter(([p]) => p === perk).flatMap(([, l]) => l)];
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
  /** Triggers that read their own off-switch (Scope.Field / Scope.Own): item, kind and scope. */
  ownOffSwitch: string[];
  adapterErrors: string[];
  rows: { toppings: Row[]; pizzas: Row[]; peels: Row[] };
}

const kindsOf = (list: EffectData[]) => [...new Set(list.map((e) => e.kind))];

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
    ownOffSwitch: [],
    adapterErrors: [],
    rows: { toppings: [], pizzas: [], peels: [] },
  };
  const adapt = (who: string, list: EffectData[]) => {
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
      if (scope === Scope.Field || scope === Scope.Own) out.ownOffSwitch.push(`${who} ${e.kind} (${scope})`);
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
      if (!list.length) out.noEffects.toppings.push(u.id);
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
      if (!list.length && !TABLE_SHAPED.includes(p.perk)) out.noEffects.pizzas.push(`${p.id} (${p.perk})`);
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
      if (!list.length) out.noEffects.peels.push(id);
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
