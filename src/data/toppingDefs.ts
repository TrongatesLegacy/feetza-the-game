// The topping families' builders: one typed builder per family, each taking one object with named fields, so a
// declaration says what each value is (docs/effects-plan.md, "Item declarations"):
//
//   Topping({
//     id: 'earplugs', name: 'Earplugs', icon: '🔇',
//     rarity: Rarity.Common,
//     maxLevel: 2,
//     effects: [ … ],
//   })
//
// Card text is generated from the effects (src/game/cardText.ts); `text` overrides it only where the effects can't
// say it (the scene's own toppings) or say it worse.

import type { Proc } from '../game/abilities';
import { Effect, When } from '../effects';
import type { Effects } from '../effects';
import type { StatData } from '../effects/stat';
import type { WhenId } from '../effects/when';
import { freshnessOn } from '../game/heatRules';
import { OnPick, UpgradeKind, type Needs, type NeedsMeter } from './itemKinds';
import type { Rarity } from './rarity';
import type { OfferEnv, TextLine, TextOverride, Upgrade } from './upgrades';

/** What every topping says about itself. */
interface ToppingBase {
  id: string;
  name: string;
  icon: string;
  rarity: Rarity;
  maxLevel: number;
  kind?: UpgradeKind;
  offerIf?: (env: OfferEnv) => boolean;
  needsEvents?: boolean;
  needsMeter?: NeedsMeter;
  needs?: readonly Needs[];
  text?: TextOverride;
}

/** A topping that works through its effects (stats and triggers); its card text comes from them. Trade-offs are
 *  plain toppings too: a change that moves a stat the worse way is their downside, shown in red. */
export function Topping(d: ToppingBase & { effects: Effects }): Upgrade {
  return { ...d };
}

/** A topping the scene runs itself (src/game/toppingKit.ts, keyed by id): its card text is written by hand. */
export function KitTopping(d: ToppingBase & { effects: Effects; text: TextOverride & { up: TextLine<string> } }): Upgrade {
  return { ...d };
}

/** A proc topping: an ability-style trigger and effects (src/game/abilities.ts), scaled by level, declared as its
 *  Effect.Proc; its card text is the proc's own (describeProc). */
export function ProcTopping(d: ToppingBase & { proc: Proc }): Upgrade {
  const { proc, ...rest } = d;
  return {
    ...rest,
    effects: [
      Effect.Proc(proc),
    ],
  };
}

/** A Pick: one use, choose one of 3 random toppings of its rarity, free (its card text says so). */
export function PickTopping(d: Pick<ToppingBase, 'id' | 'name' | 'icon' | 'rarity'>): Upgrade {
  return {
    ...d,
    maxLevel: 1,
    kind: UpgradeKind.Consumable,
    pick: d.rarity,
    effects: [
      Effect.OnPick(OnPick.Pick),
    ],
  };
}

/** A trade-off paid in freshness, with a different catch on Mild (where freshness is off): `fresh` while freshness is
 *  on (a one-time hit to the pizzas on the table, and/or effects), `mild` while it's off (a one-time slice hit, and/or
 *  effects). The catch's effects wait on the heat (When.Freshness / When.NoFreshness), and so does its card text. */
export function FreshTradeoff(
  d: ToppingBase & {
    effects: Effects;
    fresh: { freshNow?: number; effects?: StatData[] };
    mild: { slicesNow?: number; effects?: StatData[] };
  },
): Upgrade {
  const { fresh, mild, ...rest } = d;
  return {
    ...rest,
    get freshNow() {
      return freshnessOn() ? fresh.freshNow : undefined;
    },
    get slicesNow() {
      return freshnessOn() ? undefined : mild.slicesNow;
    },
    effects: [
      ...d.effects,
      ...when(When.Freshness, fresh.effects),
      ...when(When.NoFreshness, mild.effects),
    ],
  };
}

/** Effects that only count while a run-wide condition holds. */
function when(w: WhenId, list: StatData[] = []): StatData[] {
  return list.map((e) => ({ ...e, when: w }));
}
