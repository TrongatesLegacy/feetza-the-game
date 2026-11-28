// Trade-off toppings: a big upgrade with a real downside, 10 per rarity. The card shows the
// downside as its own red line.

import type { Upgrade } from './upgrades';
import { Rarity } from './rarity';
import { Effect, Op, Stat, Unit } from '../effects';
import { FreshTradeoff, Topping } from './toppingDefs';

export const TRADEOFF_TOPPINGS: Upgrade[] = [
  // ——— Common ———
  Topping({
    id: 'glasspeel', name: 'Glass Peel', icon: '🔍',
    rarity: Rarity.Common,
    maxLevel: 3,
    effects: [
      Effect.Stat(
        Stat.Damage,
        Op.Mul(Unit.Mult(1.4)),
      ),
      Effect.Stat(
        Stat.Radius,
        Op.Mul(Unit.Mult(0.85)),
      ),
    ],
  }),
  Topping({
    id: 'greedy', name: 'Greedy Fingers', icon: '🤑',
    rarity: Rarity.Common,
    maxLevel: 3,
    effects: [
      Effect.Stat(
        Stat.CoinMult,
        Op.Add(Unit.Percent(40)),
      ),
      Effect.Stat(
        Stat.SpeedMult,
        Op.Mul(Unit.Mult(1.06)),
      ),
    ],
  }),
  Topping({
    id: 'castiron', name: 'Cast-Iron Peel', icon: '⚫',
    rarity: Rarity.Common,
    maxLevel: 3,
    effects: [
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
    ],
  }),
  Topping({
    id: 'sugarhigh', name: 'Sugar High', icon: '🍬',
    rarity: Rarity.Common,
    maxLevel: 3,
    effects: [
      Effect.Stat(
        Stat.SuperGain,
        Op.Add(Unit.Percent(40)),
      ),
      Effect.Stat(
        Stat.Damage,
        Op.Mul(Unit.Mult(0.9)),
      ),
    ],
  }),
  Topping({
    id: 'gambler', name: 'Gambler’s Crust', icon: '🃏',
    rarity: Rarity.Common,
    maxLevel: 3,
    effects: [
      Effect.Stat(
        Stat.CritChance,
        Op.Add(Unit.Chance(12)),
      ),
      Effect.Stat(
        Stat.Damage,
        Op.Mul(Unit.Mult(0.9)),
      ),
    ],
  }),
  Topping({
    id: 'fastfood', name: 'Fast Food', icon: '🍔',
    rarity: Rarity.Common,
    maxLevel: 3,
    effects: [
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
    ],
  }),
  FreshTradeoff({
    id: 'overproofed', name: 'Over-Proofed', icon: '🍩',
    rarity: Rarity.Common,
    maxLevel: 2,
    effects: [
      Effect.Stat(
        Stat.RegenPerWave,
        Op.Add(Unit.PerWave(2)),
      ),
    ],
    fresh: { freshNow: 2 },
    mild: { slicesNow: 1 },
  }),
  Topping({
    id: 'ghostpepper', name: 'Ghost Pepper', icon: '🥵',
    rarity: Rarity.Common,
    maxLevel: 3,
    effects: [
      Effect.Stat(
        Stat.BurnDps,
        Op.Add(Unit.Amount(8)),
      ),
      Effect.Stat(
        Stat.Radius,
        Op.Mul(Unit.Mult(0.9)),
      ),
    ],
  }),
  FreshTradeoff({
    id: 'cheapcheese', name: 'Cheap Cheese', icon: '🧀',
    rarity: Rarity.Common,
    maxLevel: 3,
    effects: [
      Effect.Stat(
        Stat.CoinMult,
        Op.Add(Unit.Percent(30)),
      ),
      Effect.Stat(
        Stat.CoinsPerWave,
        Op.Add(Unit.PerWave(5)),
      ),
    ],
    fresh: { freshNow: 1 },
    mild: {
      effects: [
        Effect.Stat(
          Stat.SpeedMult,
          Op.Mul(Unit.Mult(1.04)),
        ),
      ],
    },
  }),
  Topping({
    id: 'bigswing', name: 'Big Swing', icon: '🏏',
    rarity: Rarity.Common,
    maxLevel: 3,
    effects: [
      Effect.Stat(
        Stat.Radius,
        Op.Add(Unit.Px(20)),
      ),
      Effect.Stat(
        Stat.Damage,
        Op.Mul(Unit.Mult(0.88)),
      ),
    ],
  }),

  // ——— Rare ———
  Topping({
    id: 'ragepeel', name: 'Rage Peel', icon: '😡',
    rarity: Rarity.Rare,
    maxLevel: 3,
    effects: [
      Effect.Stat(
        Stat.Damage,
        Op.Mul(Unit.Mult(1.5)),
      ),
      Effect.Stat(
        Stat.SpeedMult,
        Op.Mul(Unit.Mult(1.5)),
      ),
    ],
  }),
  Topping({
    id: 'tipleech', name: 'Tip Leech', icon: '🩸',
    rarity: Rarity.Rare,
    maxLevel: 2,
    effects: [
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
    ],
  }),
  Topping({
    id: 'adrenaline', name: 'Adrenaline', icon: '💉',
    rarity: Rarity.Rare,
    maxLevel: 3,
    effects: [
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
    ],
  }),
  Topping({
    id: 'thincrust', name: 'Thin Crust', icon: '🥖',
    rarity: Rarity.Rare,
    maxLevel: 2,
    effects: [
      Effect.Stat(
        Stat.Damage,
        Op.Mul(Unit.Mult(1.6)),
      ),
      Effect.Stat(
        Stat.StompExtra,
        Op.Add(Unit.Chance(10)),
      ),
    ],
  }),
  Topping({
    id: 'headsman', name: 'Headsman', icon: '⚰️',
    rarity: Rarity.Rare,
    maxLevel: 2,
    effects: [
      Effect.Stat(
        Stat.Execute,
        Op.Add(Unit.Percent(15)),
      ),
      Effect.Stat(
        Stat.CoinMult,
        Op.Sub(Unit.Percent(15)),
      ),
    ],
  }),
  Topping({
    id: 'spicemaster', name: 'Spice Master', icon: '🫚',
    rarity: Rarity.Rare,
    maxLevel: 3,
    effects: [
      Effect.Stat(
        Stat.BurnDps,
        Op.Add(Unit.Amount(12)),
      ),
      Effect.Stat(
        Stat.CritChance,
        Op.Sub(Unit.Chance(8)),
      ),
    ],
  }),
  Topping({
    id: 'overcharged', name: 'Overcharged', icon: '🪫',
    rarity: Rarity.Rare,
    maxLevel: 2,
    effects: [
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
    ],
  }),
  Topping({
    id: 'frenzy', name: 'Frenzy', icon: '💫',
    rarity: Rarity.Rare,
    maxLevel: 3,
    effects: [
      Effect.Stat(
        Stat.DoubleChance,
        Op.Add(Unit.Chance(15)),
      ),
      Effect.Stat(
        Stat.SpeedMult,
        Op.Mul(Unit.Mult(1.08)),
      ),
    ],
  }),
  Topping({
    id: 'pizzabait', name: 'Pizza Bait', icon: '🎣',
    rarity: Rarity.Rare,
    maxLevel: 2,
    effects: [
      Effect.Stat(
        Stat.GarlicDps,
        Op.Add(Unit.Amount(15)),
      ),
      Effect.Stat(
        Stat.StompExtra,
        Op.Add(Unit.Chance(8)),
      ),
    ],
  }),
  Topping({
    id: 'goldfever', name: 'Gold Fever', icon: '🏅',
    rarity: Rarity.Rare,
    maxLevel: 2,
    effects: [
      Effect.Stat(
        Stat.GoldenTouch,
        Op.Add(Unit.Chance(8)),
      ),
      Effect.Stat(
        Stat.Damage,
        Op.Mul(Unit.Mult(0.85)),
      ),
    ],
  }),

  // ——— Epic ———
  Topping({
    id: 'glasscannon', name: 'Glass Cannon', icon: '🔮',
    rarity: Rarity.Epic,
    maxLevel: 2,
    effects: [
      Effect.Stat(
        Stat.Damage,
        Op.Mul(Unit.Mult(2)),
      ),
      Effect.Stat(
        Stat.StompExtra,
        Op.Add(Unit.Chance(20)),
      ),
    ],
  }),
  Topping({
    id: 'bloodmoon', name: 'Blood Moon', icon: '🌘',
    rarity: Rarity.Epic,
    maxLevel: 2,
    effects: [
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
    ],
  }),
  Topping({
    id: 'overdrive', name: 'Overdrive', icon: '🏎️',
    rarity: Rarity.Epic,
    maxLevel: 2,
    effects: [
      Effect.Stat(
        Stat.SuperGain,
        Op.Add(Unit.Percent(100)),
      ),
      Effect.Stat(
        Stat.SpeedMult,
        Op.Mul(Unit.Mult(1.12)),
      ),
    ],
  }),
  Topping({
    id: 'wildfire', name: 'Wildfire', icon: '🪔',
    rarity: Rarity.Epic,
    maxLevel: 2,
    effects: [
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
    ],
  }),
  Topping({
    id: 'stormcaller', name: 'Storm Caller', icon: '🧿',
    rarity: Rarity.Epic,
    maxLevel: 2,
    effects: [
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
    ],
  }),
  Topping({
    id: 'butcher', name: 'Butcher', icon: '🥩',
    rarity: Rarity.Epic,
    maxLevel: 2,
    effects: [
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
    ],
  }),
  Topping({
    id: 'titangrip', name: 'Titan Grip', icon: '✊',
    rarity: Rarity.Epic,
    maxLevel: 2,
    effects: [
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
    ],
  }),
  FreshTradeoff({
    id: 'feastfamine', name: 'Feast or Famine', icon: '🍲',
    rarity: Rarity.Epic,
    maxLevel: 1,
    effects: [
      Effect.Stat(
        Stat.RegenAll,
        Op.Add(Unit.PerWave(2)),
      ),
    ],
    fresh: { freshNow: 3 },
    mild: {
      effects: [
        Effect.Stat(
          Stat.FootHp,
          Op.Mul(Unit.Mult(1.1)),
        ),
      ],
    },
  }),
  Topping({
    id: 'boomtown', name: 'Boom Town', icon: '🎉',
    rarity: Rarity.Epic,
    maxLevel: 2,
    effects: [
      Effect.Stat(
        Stat.ExplodeDmg,
        Op.Add(Unit.Amount(40)),
      ),
      Effect.Stat(
        Stat.SuperGain,
        Op.Sub(Unit.Percent(30)),
      ),
    ],
  }),
  Topping({
    id: 'nosleep', name: 'No Sleep', icon: '🦉',
    rarity: Rarity.Epic,
    maxLevel: 2,
    effects: [
      Effect.Stat(
        Stat.StunChance,
        Op.Add(Unit.Chance(20)),
      ),
      Effect.Stat(
        Stat.SpeedMult,
        Op.Mul(Unit.Mult(1.1)),
      ),
    ],
  }),

  // ——— Legendary ———
  Topping({
    id: 'devilsdeal', name: 'Devil’s Deal', icon: '😈',
    rarity: Rarity.Legendary,
    maxLevel: 1,
    effects: [
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
    ],
  }),
  Topping({
    id: 'allin', name: 'All In', icon: '🎰',
    rarity: Rarity.Legendary,
    maxLevel: 1,
    effects: [
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
    ],
  }),
  Topping({
    id: 'godspeed', name: 'Godspeed', icon: '🪽',
    rarity: Rarity.Legendary,
    maxLevel: 1,
    effects: [
      Effect.Stat(
        Stat.DoubleChance,
        Op.Add(Unit.Chance(50)),
      ),
      Effect.Stat(
        Stat.SpeedMult,
        Op.Mul(Unit.Mult(1.2)),
      ),
    ],
  }),
  Topping({
    id: 'midascurse', name: 'Midas’ Curse', icon: '🫅',
    rarity: Rarity.Legendary,
    maxLevel: 1,
    effects: [
      Effect.Stat(
        Stat.GoldenTouch,
        Op.Add(Unit.Chance(25)),
      ),
      Effect.Stat(
        Stat.Damage,
        Op.Mul(Unit.Mult(0.75)),
      ),
    ],
  }),
  Topping({
    id: 'oblivion', name: 'Oblivion Peel', icon: '🌑',
    rarity: Rarity.Legendary,
    maxLevel: 1,
    effects: [
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
    ],
  }),
  FreshTradeoff({
    id: 'sacrifice', name: 'Sacrifice', icon: '🗿',
    rarity: Rarity.Legendary,
    maxLevel: 1,
    text: { up: 'Every pizza regrows +2 slices, +1 shield a wave' },
    effects: [
      Effect.Stat(
        Stat.RegenAll,
        Op.Add(Unit.PerWave(2)),
      ),
      Effect.Stat(
        Stat.Shields,
        Op.Add(Unit.PerWave(1)),
      ),
    ],
    fresh: {
      effects: [
        Effect.Stat(
          Stat.FreshBonus,
          Op.Sub(Unit.Amount(2)),
        ),
      ],
    },
    mild: {
      effects: [
        Effect.Stat(
          Stat.FootHp,
          Op.Mul(Unit.Mult(2)),
        ),
      ],
    },
  }),
  Topping({
    id: 'phoenixpact', name: 'Phoenix Pact', icon: '🐦',
    rarity: Rarity.Legendary,
    maxLevel: 1,
    effects: [
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
    ],
  }),
  Topping({
    id: 'warlord', name: 'Warlord', icon: '🏴',
    rarity: Rarity.Legendary,
    maxLevel: 1,
    effects: [
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
    ],
  }),
  Topping({
    id: 'overclock', name: 'Overclock', icon: '🖥️',
    rarity: Rarity.Legendary,
    maxLevel: 1,
    // (the generated "+40% chain lightning, +3 chain targets, +30% chain damage" runs a line past a narrow card's block)
    text: { up: '+40% chain lightning: +3 targets, +30% damage' },
    effects: [
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
    ],
  }),
  Topping({
    id: 'apex', name: 'Apex Predator', icon: '🦈',
    rarity: Rarity.Legendary,
    maxLevel: 1,
    effects: [
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
    ],
  }),
];
