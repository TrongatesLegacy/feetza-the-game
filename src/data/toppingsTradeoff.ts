// Trade-off toppings: a big upgrade with a real downside, 10 per rarity. The card shows the
// downside as its own red line.

import type { Rarity, Upgrade } from './upgrades';
import { freshnessOn } from '../game/heatRules';
import { Effect, Op, Stat, Unit, When, type EffectData } from '../effects';
import type { StatData } from '../effects/stat';
import type { WhenId } from '../effects/when';

function deal(id: string, name: string, icon: string, rarity: Rarity, max: number, up: string, down: string, effects: EffectData[]): Upgrade {
  return { id, name, icon, rarity, max, desc: () => up, downside: down, effects };
}

/**
 * A trade-off paid in freshness, with a different catch on Mild (where freshness is off).
 * freshNow: one-time freshness hit to the pizzas on the table · mild: the Mild downside and its effect.
 */
function freshDeal(
  id: string, name: string, icon: string, rarity: Rarity, max: number, up: string, effects: EffectData[],
  fresh: { text: string; now?: number; effects?: StatData[] },
  mild: { text: string; slicesNow?: number; effects?: StatData[] },
): Upgrade {
  return {
    id, name, icon, rarity, max,
    desc: () => up,
    get downside() {
      return freshnessOn() ? fresh.text : mild.text;
    },
    get freshNow() {
      return freshnessOn() ? fresh.now : undefined;
    },
    get slicesNow() {
      return freshnessOn() ? undefined : mild.slicesNow;
    },
    // (the catch's numbers wait on the heat: freshness on, or Mild)
    effects: [
      ...effects,
      ...when(When.Freshness, fresh.effects),
      ...when(When.NoFreshness, mild.effects),
    ],
  };
}

/** Effects that only count while a run-wide condition holds. */
function when(w: WhenId, list: StatData[] = []): StatData[] {
  return list.map((e) => ({ ...e, when: w }));
}

export const TRADEOFF_TOPPINGS: Upgrade[] = [
  // ——— Common ———
  deal('glasspeel', 'Glass Peel', '🔍', 'common', 3, '+40% smack damage', '−15% base smack reach', [
    Effect.Stat(
      Stat.Damage,
      Op.Mul(Unit.Mult(1.4)),
    ),
    Effect.Stat(
      Stat.Radius,
      Op.Mul(Unit.Mult(0.85)),
    ),
  ]),
  deal('greedy', 'Greedy Fingers', '🤑', 'common', 3, '+40% tips', 'Feet move 6% faster', [
    Effect.Stat(
      Stat.CoinMult,
      Op.Add(Unit.Percent(40)),
    ),
    Effect.Stat(
      Stat.SpeedMult,
      Op.Mul(Unit.Mult(1.06)),
    ),
  ]),
  deal('castiron', 'Cast-Iron Peel', '⚫', 'common', 3, '+15% smack damage, +80 knockback', '−20% meter charge', [
    Effect.Stat(
      Stat.Damage,
      Op.Mul(Unit.Mult(1.15)),
    ),
    Effect.Stat(
      Stat.Knockback,
      Op.Add(Unit.Px(80)),
    ),
    Effect.Stat(
      Stat.SuperGain,
      Op.Sub(Unit.Percent(20)),
    ),
  ]),
  deal('sugarhigh', 'Sugar High', '🍬', 'common', 3, '+40% meter charge', '−10% smack damage', [
    Effect.Stat(
      Stat.SuperGain,
      Op.Add(Unit.Percent(40)),
    ),
    Effect.Stat(
      Stat.Damage,
      Op.Mul(Unit.Mult(0.9)),
    ),
  ]),
  deal('gambler', 'Gambler’s Crust', '🃏', 'common', 3, '+12% crit chance', '−10% smack damage', [
    Effect.Stat(
      Stat.CritChance,
      Op.Add(Unit.Chance(12)),
    ),
    Effect.Stat(
      Stat.Damage,
      Op.Mul(Unit.Mult(0.9)),
    ),
  ]),
  deal('fastfood', 'Fast Food', '🍔', 'common', 3, 'Combos last +1s, +20% score', 'Feet move 5% faster', [
    Effect.Stat(
      Stat.ComboBonus,
      Op.Add(Unit.Seconds(1)),
    ),
    Effect.Stat(
      Stat.ScoreMult,
      Op.Add(Unit.Percent(20)),
    ),
    Effect.Stat(
      Stat.SpeedMult,
      Op.Mul(Unit.Mult(1.05)),
    ),
  ]),
  freshDeal('overproofed', 'Over-Proofed', '🍩', 'common', 2, '+2 slice regrowth on every pizza after each wave', [
    Effect.Stat(
      Stat.RegenPerWave,
      Op.Add(Unit.PerWave(2)),
    ),
  ], { text: 'Pizzas on the table lose 2 freshness now', now: 2 }, { text: 'Pizzas on the table lose 1 slice now', slicesNow: 1 }),
  deal('ghostpepper', 'Ghost Pepper', '🥵', 'common', 3, 'Smacks burn feet: +8 dmg/s', '−10% base smack reach', [
    Effect.Stat(
      Stat.BurnDps,
      Op.Add(Unit.Amount(8)),
    ),
    Effect.Stat(
      Stat.Radius,
      Op.Mul(Unit.Mult(0.9)),
    ),
  ]),
  freshDeal('cheapcheese', 'Cheap Cheese', '🧀', 'common', 3, '+30% tips, +5 tips after every wave', [
    Effect.Stat(
      Stat.CoinMult,
      Op.Add(Unit.Percent(30)),
    ),
    Effect.Stat(
      Stat.CoinsPerWave,
      Op.Add(Unit.PerWave(5)),
    ),
  ], { text: 'Pizzas on the table lose 1 freshness now', now: 1 }, { text: 'Feet move 4% faster', effects: [
    Effect.Stat(
      Stat.SpeedMult,
      Op.Mul(Unit.Mult(1.04)),
    ),
  ] }),
  deal('bigswing', 'Big Swing', '🏏', 'common', 3, '+20 smack reach', '−12% smack damage', [
    Effect.Stat(
      Stat.Radius,
      Op.Add(Unit.Px(20)),
    ),
    Effect.Stat(
      Stat.Damage,
      Op.Mul(Unit.Mult(0.88)),
    ),
  ]),

  // ——— Rare ———
  deal('ragepeel', 'Rage Peel', '😡', 'rare', 3, '+50% smack damage', 'Feet move 50% faster', [
    Effect.Stat(
      Stat.Damage,
      Op.Mul(Unit.Mult(1.5)),
    ),
    Effect.Stat(
      Stat.SpeedMult,
      Op.Mul(Unit.Mult(1.5)),
    ),
  ]),
  deal('tipleech', 'Tip Leech', '🩸', 'rare', 2, '+25% tips, +2 tips per quick kill', 'Feet have 10% more health', [
    Effect.Stat(
      Stat.CoinMult,
      Op.Add(Unit.Percent(25)),
    ),
    Effect.Stat(
      Stat.QuickTips,
      Op.Add(Unit.Amount(2)),
    ),
    Effect.Stat(
      Stat.FootHp,
      Op.Mul(Unit.Mult(1.1)),
    ),
  ]),
  deal('adrenaline', 'Adrenaline', '💉', 'rare', 3, '+60% meter charge, +8% double-smack chance', '−10% base smack reach', [
    Effect.Stat(
      Stat.SuperGain,
      Op.Add(Unit.Percent(60)),
    ),
    Effect.Stat(
      Stat.DoubleChance,
      Op.Add(Unit.Chance(8)),
    ),
    Effect.Stat(
      Stat.Radius,
      Op.Mul(Unit.Mult(0.9)),
    ),
  ]),
  deal('thincrust', 'Thin Crust', '🥖', 'rare', 2, '+60% smack damage', 'Stomps have a 10% chance to take an extra slice', [
    Effect.Stat(
      Stat.Damage,
      Op.Mul(Unit.Mult(1.6)),
    ),
    Effect.Stat(
      Stat.StompExtra,
      Op.Add(Unit.Chance(10)),
    ),
  ]),
  deal('headsman', 'Headsman', '⚰️', 'rare', 2, 'Smacks finish feet under +15% health', '−15% tips', [
    Effect.Stat(
      Stat.Execute,
      Op.Add(Unit.Percent(15)),
    ),
    Effect.Stat(
      Stat.CoinMult,
      Op.Sub(Unit.Percent(15)),
    ),
  ]),
  deal('spicemaster', 'Spice Master', '🫚', 'rare', 3, 'Smacks burn feet: +12 dmg/s', '−8% crit chance', [
    Effect.Stat(
      Stat.BurnDps,
      Op.Add(Unit.Amount(12)),
    ),
    Effect.Stat(
      Stat.CritChance,
      Op.Sub(Unit.Chance(8)),
    ),
  ]),
  deal('overcharged', 'Overcharged', '🪫', 'rare', 2, '+25% chain lightning chance, +1 chain target', '−25% meter charge', [
    Effect.Stat(
      Stat.ChainChance,
      Op.Add(Unit.Chance(25)),
    ),
    Effect.Stat(
      Stat.ChainCount,
      Op.Add(Unit.Count(1)),
    ),
    Effect.Stat(
      Stat.SuperGain,
      Op.Sub(Unit.Percent(25)),
    ),
  ]),
  deal('frenzy', 'Frenzy', '💫', 'rare', 3, '+15% double-smack chance', 'Feet move 8% faster', [
    Effect.Stat(
      Stat.DoubleChance,
      Op.Add(Unit.Chance(15)),
    ),
    Effect.Stat(
      Stat.SpeedMult,
      Op.Mul(Unit.Mult(1.08)),
    ),
  ]),
  deal('pizzabait', 'Pizza Bait', '🎣', 'rare', 2, 'Feet near pizzas take +15 dmg/s', 'Stomps have an 8% chance to take an extra slice', [
    Effect.Stat(
      Stat.GarlicDps,
      Op.Add(Unit.Amount(15)),
    ),
    Effect.Stat(
      Stat.StompExtra,
      Op.Add(Unit.Chance(8)),
    ),
  ]),
  deal('goldfever', 'Gold Fever', '🏅', 'rare', 2, '8% of feet turn to gold (5× tips)', '−15% smack damage', [
    Effect.Stat(
      Stat.GoldenTouch,
      Op.Add(Unit.Chance(8)),
    ),
    Effect.Stat(
      Stat.Damage,
      Op.Mul(Unit.Mult(0.85)),
    ),
  ]),

  // ——— Epic ———
  deal('glasscannon', 'Glass Cannon', '🔮', 'epic', 2, '+100% smack damage', 'Stomps have a 20% chance to take an extra slice', [
    Effect.Stat(
      Stat.Damage,
      Op.Mul(Unit.Mult(2)),
    ),
    Effect.Stat(
      Stat.StompExtra,
      Op.Add(Unit.Chance(20)),
    ),
  ]),
  deal('bloodmoon', 'Blood Moon', '🌘', 'epic', 2, '+25% crit chance, +100% crit damage', 'Feet have 15% more health', [
    Effect.Stat(
      Stat.CritChance,
      Op.Add(Unit.Chance(25)),
    ),
    Effect.Stat(
      Stat.CritMult,
      Op.Add(Unit.Percent(100)),
    ),
    Effect.Stat(
      Stat.FootHp,
      Op.Mul(Unit.Mult(1.15)),
    ),
  ]),
  deal('overdrive', 'Overdrive', '🏎️', 'epic', 2, '+100% meter charge', 'Feet move 12% faster', [
    Effect.Stat(
      Stat.SuperGain,
      Op.Add(Unit.Percent(100)),
    ),
    Effect.Stat(
      Stat.SpeedMult,
      Op.Mul(Unit.Mult(1.12)),
    ),
  ]),
  deal('wildfire', 'Wildfire', '🪔', 'epic', 2, 'Smacks burn +20 dmg/s; stompers burn +15 dmg/s', '−15% tips', [
    Effect.Stat(
      Stat.BurnDps,
      Op.Add(Unit.Amount(20)),
    ),
    Effect.Stat(
      Stat.StompBurn,
      Op.Add(Unit.Amount(15)),
    ),
    Effect.Stat(
      Stat.CoinMult,
      Op.Sub(Unit.Percent(15)),
    ),
  ]),
  deal('stormcaller', 'Storm Caller', '🧿', 'epic', 2, '+30% chain lightning chance, +2 chain targets', '−15% base smack reach', [
    Effect.Stat(
      Stat.ChainChance,
      Op.Add(Unit.Chance(30)),
    ),
    Effect.Stat(
      Stat.ChainCount,
      Op.Add(Unit.Count(2)),
    ),
    Effect.Stat(
      Stat.Radius,
      Op.Mul(Unit.Mult(0.85)),
    ),
  ]),
  deal('butcher', 'Butcher', '🥩', 'epic', 2, '+45% smack damage, finish feet under +10% health', '−20% tips', [
    Effect.Stat(
      Stat.Damage,
      Op.Mul(Unit.Mult(1.45)),
    ),
    Effect.Stat(
      Stat.Execute,
      Op.Add(Unit.Percent(10)),
    ),
    Effect.Stat(
      Stat.CoinMult,
      Op.Sub(Unit.Percent(20)),
    ),
  ]),
  deal('titangrip', 'Titan Grip', '✊', 'epic', 2, '+30% smack damage, +20 smack reach', 'Feet have 15% more health', [
    Effect.Stat(
      Stat.Damage,
      Op.Mul(Unit.Mult(1.3)),
    ),
    Effect.Stat(
      Stat.Radius,
      Op.Add(Unit.Px(20)),
    ),
    Effect.Stat(
      Stat.FootHp,
      Op.Mul(Unit.Mult(1.15)),
    ),
  ]),
  freshDeal('feastfamine', 'Feast or Famine', '🍲', 'epic', 1, 'Every pizza regrows +2 slices after each wave', [
    Effect.Stat(
      Stat.RegenAll,
      Op.Add(Unit.PerWave(2)),
    ),
  ], { text: 'Pizzas on the table lose 3 freshness now', now: 3 }, { text: 'Feet have 10% more health', effects: [
    Effect.Stat(
      Stat.FootHp,
      Op.Mul(Unit.Mult(1.1)),
    ),
  ] }),
  deal('boomtown', 'Boom Town', '🎉', 'epic', 2, 'Smacked-down feet explode for +40 area damage', '−30% meter charge', [
    Effect.Stat(
      Stat.ExplodeDmg,
      Op.Add(Unit.Amount(40)),
    ),
    Effect.Stat(
      Stat.SuperGain,
      Op.Sub(Unit.Percent(30)),
    ),
  ]),
  deal('nosleep', 'No Sleep', '🦉', 'epic', 2, '+20% chance smacks stun feet', 'Feet move 10% faster', [
    Effect.Stat(
      Stat.StunChance,
      Op.Add(Unit.Chance(20)),
    ),
    Effect.Stat(
      Stat.SpeedMult,
      Op.Mul(Unit.Mult(1.1)),
    ),
  ]),

  // ——— Legendary ———
  deal('devilsdeal', 'Devil’s Deal', '😈', 'legendary', 1, '×2 smack damage', 'Feet have 20% more health and move 10% faster', [
    Effect.Stat(
      Stat.Damage,
      Op.Mul(Unit.Mult(2)),
    ),
    Effect.Stat(
      Stat.FootHp,
      Op.Mul(Unit.Mult(1.2)),
    ),
    Effect.Stat(
      Stat.SpeedMult,
      Op.Mul(Unit.Mult(1.1)),
    ),
  ]),
  deal('allin', 'All In', '🎰', 'legendary', 1, '×1.5 smack damage, +30% crit chance', '−40% tips', [
    Effect.Stat(
      Stat.Damage,
      Op.Mul(Unit.Mult(1.5)),
    ),
    Effect.Stat(
      Stat.CritChance,
      Op.Add(Unit.Chance(30)),
    ),
    Effect.Stat(
      Stat.CoinMult,
      Op.Sub(Unit.Percent(40)),
    ),
  ]),
  deal('godspeed', 'Godspeed', '🪽', 'legendary', 1, '+50% double-smack chance', 'Feet move 20% faster', [
    Effect.Stat(
      Stat.DoubleChance,
      Op.Add(Unit.Chance(50)),
    ),
    Effect.Stat(
      Stat.SpeedMult,
      Op.Mul(Unit.Mult(1.2)),
    ),
  ]),
  deal('midascurse', 'Midas’ Curse', '🫅', 'legendary', 1, '25% of feet turn to gold (5× tips)', '−25% smack damage', [
    Effect.Stat(
      Stat.GoldenTouch,
      Op.Add(Unit.Chance(25)),
    ),
    Effect.Stat(
      Stat.Damage,
      Op.Mul(Unit.Mult(0.75)),
    ),
  ]),
  deal('oblivion', 'Oblivion Peel', '🌑', 'legendary', 1, '×1.4 smack damage, +25 smack reach', 'Stomps have a 25% chance to take an extra slice', [
    Effect.Stat(
      Stat.Damage,
      Op.Mul(Unit.Mult(1.4)),
    ),
    Effect.Stat(
      Stat.Radius,
      Op.Add(Unit.Px(25)),
    ),
    Effect.Stat(
      Stat.StompExtra,
      Op.Add(Unit.Chance(25)),
    ),
  ]),
  freshDeal('sacrifice', 'Sacrifice', '🗿', 'legendary', 1, 'Every pizza regrows +2 slices and gets +1 shield each wave', [
    Effect.Stat(
      Stat.RegenAll,
      Op.Add(Unit.PerWave(2)),
    ),
    Effect.Stat(
      Stat.Shields,
      Op.Add(Unit.PerWave(1)),
    ),
  ], { text: 'Every pizza holds 2 less freshness', effects: [
    Effect.Stat(
      Stat.FreshBonus,
      Op.Sub(Unit.Amount(2)),
    ),
  ] }, { text: 'Feet have double health', effects: [
    Effect.Stat(
      Stat.FootHp,
      Op.Mul(Unit.Mult(2)),
    ),
  ] }),
  deal('phoenixpact', 'Phoenix Pact', '🐦', 'legendary', 1, '×1.3 smack damage, finish feet under +20% health', '−50% meter charge', [
    Effect.Stat(
      Stat.Damage,
      Op.Mul(Unit.Mult(1.3)),
    ),
    Effect.Stat(
      Stat.Execute,
      Op.Add(Unit.Percent(20)),
    ),
    Effect.Stat(
      Stat.SuperGain,
      Op.Sub(Unit.Percent(50)),
    ),
  ]),
  deal('warlord', 'Warlord', '🏴', 'legendary', 1, '×1.5 smack damage, +30% boss damage', '−30% tips, feet have 10% more health', [
    Effect.Stat(
      Stat.Damage,
      Op.Mul(Unit.Mult(1.5)),
    ),
    Effect.Stat(
      Stat.BossDmg,
      Op.Add(Unit.Percent(30)),
    ),
    Effect.Stat(
      Stat.CoinMult,
      Op.Sub(Unit.Percent(30)),
    ),
    Effect.Stat(
      Stat.FootHp,
      Op.Mul(Unit.Mult(1.1)),
    ),
  ]),
  deal('overclock', 'Overclock', '🖥️', 'legendary', 1, '+40% chain lightning chance, +3 targets, +30% chain damage', '−20% base smack reach', [
    Effect.Stat(
      Stat.ChainChance,
      Op.Add(Unit.Chance(40)),
    ),
    Effect.Stat(
      Stat.ChainCount,
      Op.Add(Unit.Count(3)),
    ),
    Effect.Stat(
      Stat.ChainDmg,
      Op.Add(Unit.Percent(30)),
    ),
    Effect.Stat(
      Stat.Radius,
      Op.Mul(Unit.Mult(0.8)),
    ),
  ]),
  deal('apex', 'Apex Predator', '🦈', 'legendary', 1, '+60% damage to healthy feet, +40% boss damage', 'Feet have 25% more health', [
    Effect.Stat(
      Stat.BigHurt,
      Op.Add(Unit.Percent(60)),
    ),
    Effect.Stat(
      Stat.BossDmg,
      Op.Add(Unit.Percent(40)),
    ),
    Effect.Stat(
      Stat.FootHp,
      Op.Mul(Unit.Mult(1.25)),
    ),
  ]),
];
