// In-run roguelike upgrades (toppings). Each stacks up to `maxLevel` levels and declares its effects; its card text is
// generated from them (src/game/cardText.ts). The topping families' builders (Topping, KitTopping…) are in
// src/data/toppingDefs.ts.

import type { Proc } from '../game/abilities';
import { MORE_TOPPINGS } from './toppingsMore';
import { TRADEOFF_TOPPINGS } from './toppingsTradeoff';
import { EVENT_TOPPINGS } from './toppingsEvents';
import { MIXED_TOPPINGS } from './toppingsMixed2';
import { SHOP_TOPPINGS } from './toppingsShop';
import { WILD_TOPPINGS } from './toppingsWild';
import { Effect, Op, Stat, Trick, Unit, effects, isAutoTrick, type DealRuleId, type EffectData, type PriceId, type TrickId } from '../effects';
import { RARITY_DEFS, Rarity } from './rarity';
import { isTradeoff } from '../game/cardText';
import { KitTopping, Topping } from './toppingDefs';

export { Rarity, RARITY_DEFS } from './rarity';
export { CONSUMABLE_COOLDOWN, Needs, NeedsMeter, OnPick, UPGRADE_KIND_DEFS, UpgradeKind } from './itemKinds';
import { Needs, NeedsMeter, OnPick, UpgradeKind } from './itemKinds';
import { TIP_MULT_CAP, baseStatsFromDefs } from '../effects/stats';

export interface Stats {
  damage: number;
  critChance: number;
  critMult: number;
  radius: number;
  knockback: number;
  burnDps: number;
  slowPct: number;
  chainChance: number;
  chainCount: number;
  chainDmg: number;
  cutters: number;
  cutterDmg: number;
  garlicDps: number;
  shields: number;
  regenPerWave: number;
  coinMult: number;
  comboBonus: number;
  scoreMult: number;
  stunChance: number;
  superGain: number;
  doubleChance: number;
  shrugChance: number;
  execute: number;
  oliveRate: number;
  oliveDmg: number;
  explodeDmg: number;
  speedMult: number;
  traps: number;
  luck: number;
  freeRerolls: number;
  stompBurn: number;
  goldenTouch: number;
  freezeSlam: boolean;
  angel: number;
  coinsPerWave: number;
  slowAbove: number; // pesto
  healWeakest: number;
  regenAll: number;
  superStart: number;
  /** Extra freshness for every pizza (Fridge Magnet). */
  freshBonus: number;
  splashDmg: number;
  bigHurt: number;
  bossDmg: number;
  tenthCrit: boolean;
  quickTips: number;
  counterDiscount: number;
  extraConsumable: number;
  crustBonus: number;
  slamStun: boolean;
  miniWeak: number;
  stunVuln: number;
  freeTopping: boolean;
  /** Feet health multiplier (trade-off toppings). */
  footHp: number;
  /** Chance a stomp takes an extra slice (trade-off toppings). */
  stompExtra: number;
  // ——— event, mixed, shop and wildcard toppings (src/data/toppings{Events,Mixed2,Shop,Wild}.ts) ———
  /** Wave event chance: base rate × this (event toppings add to it; capped at 100%). */
  eventMult: number;
  eventAlways: boolean;
  /** Events per (non-boss) wave when one happens: Grand Parade makes it 2. */
  eventCount: number;
  noEvents: boolean;
  noGolden: boolean;
  /** Extra share of tips from wave events. */
  eventTips: number;
  /** Seconds flyers stay on screen longer. */
  flyerSec: number;
  flyerBias: boolean;
  seagullCrust: number;
  /** Smacks fewer a pizza box chest takes to open. */
  chestLess: number;
  /** Mimic chance multiplier. */
  mimicMult: number;
  eventRetry: boolean;
  /** Event drop chance: × (1 + dropAdd) × dropMult. */
  dropAdd: number;
  dropMult: number;
  /** Beating a mimic: drop chance multiplier (0: the usual). */
  mimicDrop: number;
  shinyMult: number;
  /** Golden Crusts each shiny foot pays. */
  shinyCrusts: number;
  /** Hero sightings (read by the sighting event): chance multiplier, a guaranteed one every n waves (0: none), smacks to catch (0: the usual). */
  sightingMult: number;
  sightingEvery: number;
  sightingHits: number;
  /** Extra share of end-of-run Golden Crusts. */
  endCrustMult: number;
  /** Topping discount (stacks additively, capped at 60% in the shop; negative is a surcharge). */
  shopDiscount: number;
  /** Extra discount on one-use toppings. */
  consumableDiscount: number;
  /** Topping cards added to (or taken from) every shop. */
  cardDelta: number;
  /** Exclusive Menu: topping cards each shop's first deal makes Epic or Legendary (not a reroll's). */
  guaranteedEpic: number;
  /** Exclusive Menu (LV2+): off the guaranteed card's price (with the shop's other discounts, up to 60%). */
  exclusiveDiscount: number;
  /** Tips off every reroll, and its multiplier. */
  rerollLess: number;
  rerollMult: number;
  /** Share off Golden Menu crust prices. */
  goldenDiscount: number;
  /** Counter pizzas price multiplier (surcharges). */
  counterMult: number;
  /** Levels added to every topping that levels up (Infinite Oven). */
  capBonus: number;
}

/** A fresh run's stats: every stat definition's base (src/effects/stats.ts). */
export function baseStats(): Stats {
  return baseStatsFromDefs();
}

/** What the scene tells the shop about the run, for toppings that only make sense sometimes. */
export interface OfferEnv {
  /** Unlocked peels other than the one in use. */
  otherPeels: number;
  /** Something throws: the peel's ability or a topping you own. */
  throws: boolean;
}

/** A side of a card written by hand: a string, or a function of the level and what the effects say there (`auto`;
 *  `autoAt(l)` is the generated text at another level). */
export type TextLine<A> = string | ((lvl: number, auto: A, autoAt: (lvl: number) => CardText) => A);

/** A card's text (src/game/cardText.ts): the upside, and the downside (the red line), or null. */
export interface CardText {
  up: string;
  down: string | null;
}

/** Card text written by hand, for what the effects can't say, or say worse (src/game/cardText.ts). Anything not
 *  overridden is generated from the effects. A dev check (cardTextAudit) makes sure every number in hand-written text
 *  is one the effects give, so the text can't drift from what the topping does. */
export interface TextOverride {
  up?: TextLine<string>;
  down?: TextLine<string | null>;
  /** Numbers in the hand-written text that the scene owns, not the effects (Mousetraps' 100 damage): the audit lets
   *  these through, and only these. */
  scene?: number[];
}

export interface Upgrade {
  id: string;
  name: string;
  icon: string;
  rarity: Rarity;
  /** How many times it can be taken (1: once). */
  maxLevel: number;
  /** What it changes, applied once for each level owned (1..owned): its Effect.Stat numbers go through the modifier
   *  ledger (src/effects/ledger.ts). Toppings the scene runs itself (procs, kit tricks) have none. The card text is
   *  generated from them (src/game/cardText.ts). */
  effects?: EffectData[];
  /** Card text written by hand (the scene's own toppings, and flavour the effects can't give). */
  text?: TextOverride;
  /** Called once when picked (immediate effects). */
  /** Pick toppings: choose one of 3 random toppings of this rarity, free. */
  pick?: Rarity;
  /** Only offered while this holds (Peel Roulette needs 3 other peels, Head Chef something that throws). */
  offerIf?: (env: OfferEnv) => boolean;
  /** Only offered while wave events can happen (not after Do Not Disturb and friends). */
  needsEvents?: boolean;
  needsMeter?: NeedsMeter;
  /** What else it needs to be offered (the Peel Slam, freshness). */
  needs?: readonly Needs[];
  /** Permanent when left out. */
  kind?: UpgradeKind;
  /** One-time cost when bought: pizzas on the table lose this much freshness (never below 1). */
  freshNow?: number;
  /** One-time cost when bought: pizzas on the table lose this many slices (never below 1). */
  slicesNow?: number;
}

export const UPGRADES: Upgrade[] = [
  // ——— Common ———
  Topping({
    id: 'heavy', name: 'Heavy Hand', icon: '💪',
    rarity: Rarity.Common,
    maxLevel: 8,
    effects: [
      Effect.Stat(
        Stat.Damage,
        Op.Mul(Unit.Mult(1.25)),
      ),
    ],
  }),
  Topping({
    id: 'peel', name: 'Bigger Peel', icon: '🏓',
    rarity: Rarity.Common,
    maxLevel: 6,
    // (the scene: from LV1 smacks hit every foot in range)
    text: { up: (l, auto) => (l <= 1 ? `Smacks hit every foot in range, ${auto}` : auto) },
    effects: [
      Effect.Stat(
        Stat.Radius,
        Op.Add(Unit.Px(9)),
      ),
      Effect.Trick(Trick.AreaSmack),
    ],
  }),
  Topping({
    id: 'crit', name: 'Critical Crust', icon: '🎯',
    rarity: Rarity.Common,
    maxLevel: 6,
    effects: [
      Effect.Stat(
        Stat.CritChance,
        Op.Add(Unit.Chance(8)),
      ),
    ],
  }),
  Topping({
    id: 'chili', name: 'Chili Flakes', icon: '🌶️',
    rarity: Rarity.Common,
    maxLevel: 5,
    // (LV1 keeps its words. They were kept for the balance sim's shopping bot, which picked "automatic" toppings by a
    // regex over card text; it reads isAutoTopping now, so the override could go: a card-text change, left for Tron)
    text: { up: (l, auto) => (l <= 1 ? 'Smacks set feet on fire: 6 dmg/s' : auto) },
    effects: [
      Effect.Stat(
        Stat.BurnDps,
        Op.Add(Unit.Amount(6)),
      ),
    ],
  }),
  Topping({
    id: 'freezer', name: 'Freezer Burn', icon: '❄️',
    rarity: Rarity.Common,
    maxLevel: 4,
    effects: [
      Effect.Stat(
        Stat.SlowPct,
        Op.Add(Unit.Percent(20)).EachLevelUp.Add(Unit.Percent(12)),
      ),
    ],
  }),
  Topping({
    id: 'tips', name: 'Tip Jar', icon: '🫙',
    rarity: Rarity.Common,
    maxLevel: 5,
    text: { up: (_l, auto) => `${auto} from feet (all tip boosts top out at ×${TIP_MULT_CAP})`, scene: [TIP_MULT_CAP] },
    effects: [
      Effect.Stat(
        Stat.CoinMult,
        Op.Add(Unit.Percent(25)),
      ),
    ],
  }),
  Topping({
    id: 'combo', name: 'Combo Chef', icon: '👨‍🍳',
    rarity: Rarity.Common,
    maxLevel: 5,
    effects: [
      Effect.Stat(
        Stat.ComboBonus,
        Op.Add(Unit.Seconds(0.4)),
      ),
      Effect.Stat(
        Stat.ScoreMult,
        Op.Add(Unit.Percent(10)),
      ),
    ],
  }),
  Topping({
    id: 'spring', name: 'Spring-Loaded', icon: '🌀',
    rarity: Rarity.Common,
    maxLevel: 4,
    text: { up: (_l, auto) => `${auto}: send feet flying back up` },
    effects: [
      Effect.Stat(
        Stat.Knockback,
        Op.Mul(Unit.Mult(1.4)),
      ),
    ],
  }),
  Topping({
    id: 'oregano', name: 'Oregano Overdrive', icon: '🌿',
    rarity: Rarity.Common,
    maxLevel: 4,
    needsMeter: NeedsMeter.Meter,
    effects: [
      Effect.Stat(
        Stat.SuperGain,
        Op.Add(Unit.Percent(35)),
      ),
    ],
  }),
  KitTopping({
    id: 'oven', name: 'Fresh From the Oven', icon: '🧑‍🍳',
    rarity: Rarity.Common,
    maxLevel: 1,
    kind: UpgradeKind.Consumable,
    text: { up: 'Heal every pizza 2 slices, right now' },
    effects: [
      Effect.OnPick(OnPick.HealAll2),
    ],
  }),
  Topping({
    id: 'proof', name: 'Slow Proof', icon: '🍞',
    rarity: Rarity.Common,
    maxLevel: 3,
    effects: [
      Effect.Stat(
        Stat.RegenPerWave,
        Op.Add(Unit.PerWave(1)),
      ),
    ],
  }),
  Topping({
    id: 'fridge', name: 'Fridge Magnet', icon: '🧊',
    rarity: Rarity.Rare,
    maxLevel: 2,
    needs: [Needs.Freshness],
    // (the scene: onPick tops up the pizzas on the table now)
    text: { up: (_l, auto) => `${auto}, now and for new ones` },
    effects: [
      Effect.Stat(
        Stat.FreshBonus,
        Op.Add(Unit.Amount(4)),
      ),
      Effect.OnPick(OnPick.Fridge),
    ],
  }),
  KitTopping({
    id: 'leftovers', name: 'Leftovers Box', icon: '🥡',
    rarity: Rarity.Common,
    maxLevel: 1,
    needs: [Needs.Freshness],
    kind: UpgradeKind.Consumable,
    text: { up: 'The next pizza to go stale stays fresh 4 more waves' },
    effects: [
      Effect.OnPick(OnPick.Arm),
      Effect.Trick(Trick.Leftovers),
    ],
  }),
  KitTopping({
    id: 'dough', name: 'Emergency Dough', icon: '🫓',
    rarity: Rarity.Rare,
    maxLevel: 1,
    kind: UpgradeKind.Consumable,
    text: { up: 'A pizza that drops to 1 slice regains 3, once' },
    effects: [
      Effect.OnPick(OnPick.Arm),
      Effect.Trick(Trick.LastDough),
    ],
  }),
  // ——— Rare ———
  Topping({
    id: 'zap', name: 'Garlic Lightning', icon: '⚡',
    rarity: Rarity.Rare,
    maxLevel: 4,
    effects: [
      Effect.Stat(
        Stat.ChainChance,
        Op.Add(Unit.Chance(18)).EachLevelUp.Add(Unit.Chance(10)),
      ),
      Effect.Stat(
        Stat.ChainCount,
        Op.Nothing.EachLevelUp.Add(Unit.Count(1)),
      ),
    ],
  }),
  Topping({
    id: 'cutter', name: 'Orbiting Cutter', icon: '⚙️',
    rarity: Rarity.Rare,
    maxLevel: 4,
    effects: [
      Effect.Stat(
        Stat.Cutters,
        Op.Add(Unit.Count(1)),
      ),
    ],
  }),
  Topping({
    id: 'garlic', name: 'Garlic Breath', icon: '🧄',
    rarity: Rarity.Rare,
    maxLevel: 4,
    effects: [
      Effect.Stat(
        Stat.GarlicDps,
        Op.Add(Unit.Amount(8)),
      ),
    ],
  }),
  Topping({
    id: 'shield', name: 'Mozzarella Shield', icon: '🧀',
    rarity: Rarity.Rare,
    maxLevel: 2,
    effects: [
      Effect.Stat(
        Stat.Shields,
        Op.Add(Unit.PerWave(1)),
      ),
    ],
  }),
  Topping({
    id: 'tickle', name: 'Tickle Feather', icon: '🪶',
    rarity: Rarity.Rare,
    maxLevel: 4,
    effects: [
      Effect.Stat(
        Stat.StunChance,
        Op.Add(Unit.Chance(8)),
      ),
    ],
  }),
  Topping({
    id: 'double', name: 'Double Slap', icon: '👏',
    rarity: Rarity.Rare,
    maxLevel: 4,
    effects: [
      Effect.Stat(
        Stat.DoubleChance,
        Op.Add(Unit.Chance(12)),
      ),
    ],
  }),
  Topping({
    id: 'sturdy', name: 'Sturdy Crust', icon: '🧱',
    rarity: Rarity.Rare,
    maxLevel: 3,
    effects: [
      Effect.Stat(
        Stat.ShrugChance,
        Op.Add(Unit.Chance(15)),
      ),
    ],
  }),
  Topping({
    id: 'olive', name: 'Olive Launcher', icon: '🫒',
    rarity: Rarity.Rare,
    maxLevel: 4,
    effects: [
      Effect.Stat(
        Stat.OliveRate,
        Op.Set(Unit.Every(Unit.Seconds(1.6))).EachLevelUp.Mul(Unit.Mult(1.35)),
      ),
    ],
  }),
  Topping({
    id: 'mercy', name: 'Cutter\'s Mercy', icon: '🔪',
    rarity: Rarity.Rare,
    maxLevel: 3,
    effects: [
      Effect.Stat(
        Stat.Execute,
        Op.Add(Unit.Percent(8)),
      ),
    ],
  }),
  Topping({
    id: 'siesta', name: 'Siesta', icon: '😴',
    rarity: Rarity.Rare,
    maxLevel: 3,
    effects: [
      Effect.Stat(
        Stat.SpeedMult,
        Op.Mul(Unit.Mult(0.92)),
      ),
    ],
  }),
  // ——— Epic ———
  Topping({
    id: 'pineapple', name: 'Explosive Pineapple', icon: '🍍',
    rarity: Rarity.Epic,
    maxLevel: 3,
    effects: [
      Effect.Stat(
        Stat.ExplodeDmg,
        Op.Add(Unit.Amount(30)),
      ),
    ],
  }),
  Topping({
    id: 'trap', name: 'Mousetraps', icon: '🪤',
    rarity: Rarity.Epic,
    maxLevel: 2,
    // (the scene: a trap snaps for 100 and stuns)
    text: { up: (_l, auto) => `${auto}: it snaps a stomper (100 dmg + stun)`, scene: [100] },
    effects: [
      Effect.Stat(
        Stat.Traps,
        Op.Add(Unit.Count(1)),
      ),
    ],
  }),
  Topping({
    id: 'brutal', name: 'Brutal Crits', icon: '💥',
    rarity: Rarity.Epic,
    maxLevel: 3,
    effects: [
      Effect.Stat(
        Stat.CritMult,
        Op.Add(Unit.Percent(100)),
      ),
    ],
  }),
  Topping({
    id: 'hotoven', name: 'Hot Plates', icon: '♨️',
    rarity: Rarity.Epic,
    maxLevel: 2,
    effects: [
      Effect.Stat(
        Stat.StompBurn,
        Op.Add(Unit.Amount(15)),
      ),
    ],
  }),
  Topping({
    id: 'lucky', name: 'Lucky Pepperoni', icon: '🍀',
    rarity: Rarity.Epic,
    maxLevel: 3,
    effects: [
      Effect.Stat(
        Stat.Luck,
        Op.Add(Unit.Count(1)),
      ),
    ],
  }),
  Topping({
    id: 'reroll', name: 'Second Opinion', icon: '🎲',
    rarity: Rarity.Epic,
    maxLevel: 2,
    effects: [
      Effect.Stat(
        Stat.FreeRerolls,
        Op.Add(Unit.Count(1)),
      ),
    ],
  }),
  // ——— Legendary ———
  KitTopping({
    id: 'helping', name: 'Second Helping', icon: '🍕',
    rarity: Rarity.Legendary,
    maxLevel: 1,
    kind: UpgradeKind.Unique,
    text: { up: 'A brand-new pizza joins the table' },
    effects: [
      Effect.OnPick(OnPick.ExtraPizza),
    ],
  }),
  KitTopping({
    id: 'angel', name: 'Pizza Angel', icon: '👼',
    rarity: Rarity.Legendary,
    maxLevel: 1,
    kind: UpgradeKind.Consumable,
    text: { up: 'The next pizza destroyed rises again with 4 slices' },
    effects: [
      Effect.OnPick(OnPick.Arm),
      Effect.Trick(Trick.GuardianAngel),
    ],
  }),
  Topping({
    id: 'freeze', name: 'Freeze Frame', icon: '⏳',
    rarity: Rarity.Legendary,
    maxLevel: 1,
    needs: [Needs.Slam],
    effects: [
      Effect.Stat(
        Stat.FreezeSlam,
        Op.On(),
      ),
    ],
  }),
  Topping({
    id: 'midas', name: 'Golden Touch', icon: '👑',
    rarity: Rarity.Legendary,
    maxLevel: 2,
    effects: [
      Effect.Stat(
        Stat.GoldenTouch,
        Op.Add(Unit.Chance(8)),
      ),
    ],
  }),
  ...MORE_TOPPINGS,
  ...TRADEOFF_TOPPINGS,
  ...EVENT_TOPPINGS,
  ...MIXED_TOPPINGS,
  ...SHOP_TOPPINGS,
  ...WILD_TOPPINGS,
];

export const UPGRADE_BY_ID: Record<string, Upgrade> = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

/** What a keyed effect is keyed by: a scene trick, a shop price rule or a deal rule. */
export type DeclKey = `trick:${TrickId}` | `shopPrice:${PriceId}` | `deal:${DealRuleId}`;
const keyOf = (e: EffectData): DeclKey | null =>
  e.kind === 'trick' ? `trick:${e.trick}` : e.kind === 'shopPrice' ? `shopPrice:${e.rule}` : e.kind === 'deal' ? `deal:${e.rule}` : null;
/** Which toppings declare each keyed effect (docs/effects-plan.md, step 3): worked out once from the declarations, so
 *  the game asks for the trick or the rule (Run.trick, Run.shopPrice, Run.deal) and never names a topping. */
const DECLARED = new Map<DeclKey, { id: string; e: EffectData }[]>();
for (const u of UPGRADES)
  for (const e of u.effects ?? []) {
    const k = keyOf(e);
    if (k) DECLARED.set(k, [...(DECLARED.get(k) ?? []), { id: u.id, e }]);
  }
/** The toppings declaring a keyed effect, with the effect each declares. */
export function declaring(k: DeclKey): readonly { id: string; e: EffectData }[] {
  return DECLARED.get(k) ?? [];
}

/** A topping's proc (Effect.Proc), if it has one. */
export function procOf(u: Upgrade): Proc | undefined {
  for (const e of u.effects ?? []) if (e.kind === 'proc') return e.proc;
  return undefined;
}

/** What happens the moment a topping is picked (Effect.OnPick), if anything. */
export function onPickOf(u: Upgrade): OnPick | undefined {
  for (const e of u.effects ?? []) if (e.kind === 'onPick') return e.pick;
  return undefined;
}

/** The toppings that put a pizza on the table when picked (Effect.OnPick(OnPick.ExtraPizza)): kept out of a deal while
 *  the table is full. */
export const ADDS_PIZZA: readonly string[] = UPGRADES.filter((u) => onPickOf(u) === OnPick.ExtraPizza).map((u) => u.id);

/** A topping's level cap with `bonus` more levels (Infinite Oven's Stat.CapBonus): only a topping that levels up is
 *  lifted, and only into levels its effects do something at (a level adds nothing when none of its effects applies
 *  there: Exclusive Menu's LV5 and LV6). */
export function liftedMax(u: Upgrade, bonus: number): number {
  if (u.maxLevel <= 1 || kindOf(u) !== UpgradeKind.Permanent) return u.maxLevel;
  let top = u.maxLevel;
  while (top < u.maxLevel + bonus && (u.effects ?? []).some((e) => effects.doesAt(e, top + 1))) top++;
  return top;
}

/** Does this topping declare a deal rule (Effect.Deal)? */
export function hasDeal(u: Upgrade, r: DealRuleId): boolean {
  return (u.effects ?? []).some((e) => e.kind === 'deal' && e.rule === r);
}

/** Does this topping turn on a scene trick (Effect.Trick)? */
export function hasTrick(u: Upgrade, t: TrickId): boolean {
  return (u.effects ?? []).some((e) => e.kind === 'trick' && e.trick === t);
}

/** Price of the next level: the rarity's base + its price a wave (RARITY_DEFS), +35% for every level already owned (so
 * stacking one upgrade gets expensive and tips spread across the run); consumables are 30% cheaper, and trade-offs
 * (a card with a downside) 20%. */
export function upgradePrice(u: Upgrade, wave: number, owned = 0): number {
  // tips per wave roughly triple from wave 10 to wave 30, so prices climb faster later on (×1.07 at 10, ×1.6 at 30, ×2.2 cap)
  const late = 1 + Math.min(1.2, 0.6 * (wave / 30) ** 2);
  const r = RARITY_DEFS[u.rarity];
  const base = (r.price + r.perWave * wave) * late * (1 + 0.35 * owned);
  // consumables are one-use; trade-offs pay part of their price in the downside
  const k = (kindOf(u) === UpgradeKind.Consumable ? 0.7 : 1) * (isTradeoff(u) ? 0.8 : 1);
  return Math.round((base * k) / 5) * 5;
}

export function kindOf(u: Upgrade): UpgradeKind {
  return u.kind ?? UpgradeKind.Permanent;
}


/** Topping tricks whose own damage is automatic: every trick that hits through the kit's damage() or effects()
 *  (src/game/toppingKit.ts; the scene marks those auto). Keep in step when a trick learns to hit. */
/** Stats that hit on their own. */
const AUTO_STATS = new Set<keyof Stats>(['cutters', 'cutterDmg', 'oliveRate', 'oliveDmg', 'garlicDps', 'burnDps', 'traps', 'stompBurn']);

/** Toppings whose damage is automatic (it hits without a smack, so momentum cools it when the player stops smacking,
 *  src/game/momentum.ts): a topping proc, orbiting cutters, olives, garlic, burns, traps, burning stompers, the drone… */
export function isAutoTopping(u: Upgrade): boolean {
  // (a proc, or a scene trick that hits by itself: TRICK_DEFS auto)
  if ((u.effects ?? []).some((e) => e.kind === 'proc' || (e.kind === 'trick' && isAutoTrick(e.trick)))) return true;
  // (what its first level does: an EachLevelUp-only effect, Op.Nothing first, doesn't count)
  return (u.effects ?? []).some((e) => e.kind === 'stat' && e.op.op !== 'none' && AUTO_STATS.has(e.stat));
}

/** The line Your Toppings adds under an automatic topping. */
export const AUTO_TOPPING_NOTE = '🔥 Runs hot while you keep smacking; stop and it cools off.';

