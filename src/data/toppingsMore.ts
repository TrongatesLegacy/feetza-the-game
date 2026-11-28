// The Feetza 2.0 topping expansion: 106 more toppings (50 common, 40 rare, 30 epic, 20 legendary in all).
// Stat toppings change Stats; proc toppings use the peel-ability engine (triggers + effects), scaled by level.

import { P, TRIG, type Proc } from '../game/abilities';
import type { Upgrade } from './upgrades';
import { NeedsMeter } from './itemKinds';
import { Rarity } from './rarity';
import { Effect, Op, Stat, Unit } from '../effects';
import { ProcTopping, Topping } from './toppingDefs';

const { all, peel, hit, rnd, front, tough, nearP, BL, D, B, S, ST, FZ, K, M, C, H, SH, T } = P;
const { every, smack, kill, stomp, wave } = TRIG;

const pr = (trigger: Proc['trigger'], fx: Proc['fx'], color: number, vfx: Proc['vfx']): Proc => ({ trigger, fx, color, vfx });

export const MORE_TOPPINGS: Upgrade[] = [
  // ——— Common (38) ———
  Topping({
    id: 'rolling', name: 'Rolling Pin', icon: '🪵',
    rarity: Rarity.Common,
    maxLevel: 5,
    effects: [
      Effect.Stat(
        Stat.Damage,
        Op.Mul(Unit.Mult(1.12)),
      ),
      Effect.Stat(
        Stat.Knockback,
        Op.Add(Unit.Px(40)),
      ),
    ],
  }),
  Topping({
    id: 'salt', name: 'Sea Salt', icon: '🧂',
    rarity: Rarity.Common,
    maxLevel: 5,
    effects: [
      Effect.Stat(
        Stat.CritChance,
        Op.Add(Unit.Chance(5)),
      ),
    ],
  }),
  Topping({
    id: 'basil', name: 'Fresh Basil', icon: '🌱',
    rarity: Rarity.Common,
    maxLevel: 3,
    effects: [
      Effect.Stat(
        Stat.FreshBonus,
        Op.Add(Unit.Amount(2)),
      ),
    ],
  }),
  Topping({
    id: 'napkin', name: 'Napkin Snap', icon: '🧻',
    rarity: Rarity.Common,
    maxLevel: 4,
    effects: [
      Effect.Stat(
        Stat.StunChance,
        Op.Add(Unit.Chance(5)),
      ),
    ],
  }),
  Topping({
    id: 'whisk', name: 'Whisk It', icon: '🥄',
    rarity: Rarity.Common,
    maxLevel: 5,
    effects: [
      Effect.Stat(
        Stat.DoubleChance,
        Op.Add(Unit.Chance(6)),
      ),
    ],
  }),
  Topping({
    id: 'oil', name: 'Olive Oil Drizzle', icon: '🫗',
    rarity: Rarity.Common,
    maxLevel: 4,
    effects: [
      Effect.Stat(
        Stat.BurnDps,
        Op.Add(Unit.Amount(3)),
      ),
    ],
  }),
  Topping({
    id: 'icecubes', name: 'Ice Cubes', icon: '🥤',
    rarity: Rarity.Common,
    maxLevel: 4,
    effects: [
      Effect.Stat(
        Stat.SlowPct,
        Op.Add(Unit.Percent(8)),
      ),
    ],
  }),
  Topping({
    id: 'tipcup', name: 'Tip Cup', icon: '☕',
    rarity: Rarity.Common,
    maxLevel: 5,
    effects: [
      Effect.Stat(
        Stat.CoinsPerWave,
        Op.Add(Unit.PerWave(3)),
      ),
    ],
  }),
  Topping({
    id: 'streak', name: 'Hot Streak', icon: '⏲️',
    rarity: Rarity.Common,
    maxLevel: 4,
    effects: [
      Effect.Stat(
        Stat.ComboBonus,
        Op.Add(Unit.Seconds(0.3)),
      ),
    ],
  }),
  Topping({
    id: 'showboat', name: 'Showboat', icon: '🎭',
    rarity: Rarity.Common,
    maxLevel: 5,
    effects: [
      Effect.Stat(
        Stat.ScoreMult,
        Op.Add(Unit.Percent(10)),
      ),
    ],
  }),
  Topping({
    id: 'handle', name: 'Long Handle', icon: '🥢',
    rarity: Rarity.Common,
    maxLevel: 5,
    effects: [
      Effect.Stat(
        Stat.Radius,
        Op.Add(Unit.Px(6)),
      ),
    ],
  }),
  Topping({
    id: 'grip', name: 'Better Grip', icon: '🧤',
    rarity: Rarity.Common,
    maxLevel: 6,
    effects: [
      Effect.Stat(
        Stat.Damage,
        Op.Mul(Unit.Mult(1.1)),
      ),
    ],
  }),
  Topping({
    id: 'dried', name: 'Dried Oregano', icon: '🍂',
    rarity: Rarity.Common,
    maxLevel: 4,
    needsMeter: NeedsMeter.Meter,
    effects: [
      Effect.Stat(
        Stat.SuperGain,
        Op.Add(Unit.Percent(20)),
      ),
    ],
  }),
  Topping({
    id: 'slayer', name: 'Giant Slayer', icon: '🛡️',
    rarity: Rarity.Common,
    maxLevel: 4,
    effects: [
      Effect.Stat(
        Stat.BossDmg,
        Op.Add(Unit.Percent(12)),
      ),
    ],
  }),
  Topping({
    id: 'bully', name: 'Bully Smack', icon: '👊',
    rarity: Rarity.Common,
    maxLevel: 4,
    effects: [
      Effect.Stat(
        Stat.BigHurt,
        Op.Add(Unit.Percent(12)),
      ),
    ],
  }),
  Topping({
    id: 'crumbs', name: 'Crumb Trail', icon: '🥖',
    rarity: Rarity.Common,
    maxLevel: 3,
    effects: [
      Effect.Stat(
        Stat.Execute,
        Op.Add(Unit.Percent(4)),
      ),
    ],
  }),
  Topping({
    id: 'knots', name: 'Garlic Knots', icon: '🥨',
    rarity: Rarity.Common,
    maxLevel: 4,
    effects: [
      Effect.Stat(
        Stat.GarlicDps,
        Op.Add(Unit.Amount(4)),
      ),
    ],
  }),
  Topping({
    id: 'pearls', name: 'Mozzarella Pearls', icon: '⚪',
    rarity: Rarity.Common,
    maxLevel: 3,
    effects: [
      Effect.Stat(
        Stat.ShrugChance,
        Op.Add(Unit.Chance(6)),
      ),
    ],
  }),
  Topping({
    id: 'pepcount', name: 'Pepperoni Count', icon: '🔴',
    rarity: Rarity.Common,
    maxLevel: 4,
    effects: [
      Effect.Stat(
        Stat.CoinMult,
        Op.Add(Unit.Percent(8)),
      ),
    ],
  }),
  Topping({
    id: 'lunchrush', name: 'Lunch Rush', icon: '⏱️',
    rarity: Rarity.Common,
    maxLevel: 3,
    effects: [
      Effect.Stat(
        Stat.QuickTips,
        Op.Add(Unit.Amount(1)),
      ),
    ],
  }),
  Topping({
    id: 'shaker', name: 'Herb Shaker', icon: '🪴',
    rarity: Rarity.Common,
    maxLevel: 4,
    effects: [
      Effect.Stat(
        Stat.CritChance,
        Op.Add(Unit.Chance(3)),
      ),
      Effect.Stat(
        Stat.StunChance,
        Op.Add(Unit.Chance(3)),
      ),
    ],
  }),
  ProcTopping({
    id: 'flour', name: 'Flour Bomb', icon: '💨',
    rarity: Rarity.Common,
    maxLevel: 4,
    proc: pr(kill(0.2), [D(1, hit(150))], 0xffffff, 'burst'),
  }),
  ProcTopping({
    id: 'grinder', name: 'Pepper Grinder', icon: '🫑',
    rarity: Rarity.Common,
    maxLevel: 4,
    proc: pr(smack(0.15), [B(0.6, 3, hit(120))], 0xff9f1c, 'fire'),
  }),
  ProcTopping({
    id: 'saucesplash', name: 'Sauce Splash', icon: '🥫',
    rarity: Rarity.Common,
    maxLevel: 4,
    proc: pr(kill(0.25), [D(0.6, hit(170)), S(0.3, 2, hit(170))], 0xff5a3c, 'burst'),
  }),
  ProcTopping({
    id: 'crustedge', name: 'Crusty Edge', icon: '🥯',
    rarity: Rarity.Common,
    maxLevel: 4,
    proc: pr(smack(0.12), [D(0.8, hit(140))], 0xd9a066, 'burst'),
  }),
  ProcTopping({
    id: 'parmsnow', name: 'Parmesan Snow', icon: '🏔️',
    rarity: Rarity.Common,
    maxLevel: 3,
    proc: pr(every(7), [S(0.25, 2, all)], 0xffffff, 'frost'),
  }),
  ProcTopping({
    id: 'chilioil', name: 'Chili Oil', icon: '🧴',
    rarity: Rarity.Common,
    maxLevel: 4,
    proc: pr(every(6), [B(0.5, 3, rnd(2))], 0xff5a3c, 'fire'),
  }),
  ProcTopping({
    id: 'frisbee', name: 'Dough Frisbee', icon: '🥏',
    rarity: Rarity.Common,
    maxLevel: 4,
    proc: pr(every(6), [D(1.5, rnd(1))], 0xf2dfb0, 'rain'),
  }),
  ProcTopping({
    id: 'orderbell', name: 'Order Bell', icon: '🛎️',
    rarity: Rarity.Common,
    maxLevel: 3,
    proc: pr(wave, [T(6)], 0xffd23f, 'gold'),
  }),
  ProcTopping({
    id: 'boxlid', name: 'Pizza Box Lid', icon: '📦',
    rarity: Rarity.Common,
    maxLevel: 3,
    proc: pr(stomp, [K(600, hit())], 0xd9a066, 'wind'),
  }),
  ProcTopping({
    id: 'spatula', name: 'Spatula Swipe', icon: '🍳',
    rarity: Rarity.Common,
    maxLevel: 4,
    proc: pr(smack(0.15), [K(500, hit(140))], 0xc7ccd4, 'wind'),
  }),
  ProcTopping({
    id: 'anchovy', name: 'Anchovy Fling', icon: '🐟',
    rarity: Rarity.Common,
    maxLevel: 4,
    proc: pr(every(5), [D(1, front(1))], 0x5fd8ff, 'rain'),
  }),
  ProcTopping({
    id: 'cheeseburst', name: 'Cheese Burst', icon: '🫕',
    rarity: Rarity.Common,
    maxLevel: 4,
    proc: pr(kill(0.2), [D(0.8, hit(200))], 0xffd23f, 'burst'),
  }),
  ProcTopping({
    id: 'warmplates', name: 'Warm Plates', icon: '🫖',
    rarity: Rarity.Common,
    maxLevel: 2,
    proc: pr(wave, [H(1, 'weakest')], 0x7be04a, 'heal'),
  }),
  ProcTopping({
    id: 'scoop', name: 'Ice Cream Scoop', icon: '🍨',
    rarity: Rarity.Common,
    maxLevel: 4,
    proc: pr(smack(0.1), [ST(0.6, hit())], 0xff7ad9, 'burst'),
  }),
  ProcTopping({
    id: 'stretch', name: 'Cheese Stretch', icon: '🧵',
    rarity: Rarity.Common,
    maxLevel: 4,
    proc: pr(smack(0.12), [C(0.6, 1)], 0xffd23f, 'zap'),
  }),
  ProcTopping({
    id: 'sesame', name: 'Sesame Seeds', icon: '🌾',
    rarity: Rarity.Common,
    maxLevel: 4,
    proc: pr(kill(0.3), [D(0.5, rnd(3))], 0xf2dfb0, 'rain'),
  }),
  ProcTopping({
    id: 'rocket', name: 'Rocket Leaves', icon: '🥬',
    rarity: Rarity.Common,
    maxLevel: 3,
    proc: pr(every(8), [D(0.8, all)], 0x7be04a, 'wind'),
  }),

  // ——— Rare (28) ———
  Topping({
    id: 'wheel', name: 'Pizza Wheel', icon: '🛞',
    rarity: Rarity.Rare,
    maxLevel: 3,
    effects: [
      Effect.Stat(
        Stat.Cutters,
        Op.Add(Unit.Count(1)),
      ),
      Effect.Stat(
        Stat.CutterDmg,
        Op.Add(Unit.Amount(4)),
      ),
    ],
  }),
  Topping({
    id: 'magnetpeel', name: 'Magnet Peel', icon: '🧲',
    rarity: Rarity.Rare,
    maxLevel: 3,
    effects: [
      Effect.Stat(
        Stat.Radius,
        Op.Add(Unit.Px(10)),
      ),
      Effect.Stat(
        Stat.Knockback,
        Op.Add(Unit.Px(60)),
      ),
    ],
  }),
  Topping({
    id: 'sharp', name: 'Sharpened Edge', icon: '🪒',
    rarity: Rarity.Rare,
    maxLevel: 4,
    effects: [
      Effect.Stat(
        Stat.CritMult,
        Op.Add(Unit.Percent(40)),
      ),
    ],
  }),
  Topping({
    id: 'crowd', name: 'Crowd Control', icon: '🚧',
    rarity: Rarity.Rare,
    maxLevel: 3,
    effects: [
      Effect.Stat(
        Stat.StunChance,
        Op.Add(Unit.Chance(6)),
      ),
      Effect.Stat(
        Stat.SlowPct,
        Op.Add(Unit.Percent(8)),
      ),
    ],
  }),
  Topping({
    id: 'sizzle', name: 'Sizzle Plate', icon: '🥘',
    rarity: Rarity.Rare,
    maxLevel: 3,
    effects: [
      Effect.Stat(
        Stat.StompBurn,
        Op.Add(Unit.Amount(8)),
      ),
    ],
  }),
  Topping({
    id: 'harvest', name: 'Harvest Moon', icon: '🌕',
    rarity: Rarity.Rare,
    maxLevel: 2,
    effects: [
      Effect.Stat(
        Stat.HealWeakest,
        Op.Add(Unit.PerWave(1)),
      ),
    ],
  }),
  Topping({
    id: 'spicerack', name: 'Spice Rack', icon: '🗄️',
    rarity: Rarity.Rare,
    maxLevel: 3,
    effects: [
      Effect.Stat(
        Stat.BurnDps,
        Op.Add(Unit.Amount(3)),
      ),
      Effect.Stat(
        Stat.CritChance,
        Op.Add(Unit.Chance(3)),
      ),
      Effect.Stat(
        Stat.StunChance,
        Op.Add(Unit.Chance(3)),
      ),
    ],
  }),
  Topping({
    id: 'echo', name: 'Echo Smack', icon: '🔊',
    rarity: Rarity.Rare,
    maxLevel: 3,
    effects: [
      Effect.Stat(
        Stat.DoubleChance,
        Op.Add(Unit.Chance(10)),
      ),
    ],
  }),
  Topping({
    id: 'cleaver', name: 'Meat Cleaver', icon: '🪓',
    rarity: Rarity.Rare,
    maxLevel: 3,
    effects: [
      Effect.Stat(
        Stat.Execute,
        Op.Add(Unit.Percent(5)),
      ),
      Effect.Stat(
        Stat.BossDmg,
        Op.Add(Unit.Percent(10)),
      ),
    ],
  }),
  ProcTopping({
    id: 'meatball', name: 'Meatball Mortar', icon: '🧆',
    rarity: Rarity.Rare,
    maxLevel: 4,
    proc: pr(every(5), [D(2, BL(1, 160))], 0xb07a3a, 'rain'),
  }),
  ProcTopping({
    id: 'calzonebomb', name: 'Calzone Bomb', icon: '🥟',
    rarity: Rarity.Rare,
    maxLevel: 4,
    proc: pr(kill(0.3), [D(2, hit(220))], 0xff9f1c, 'burst'),
  }),
  ProcTopping({
    id: 'fireball', name: 'Fireball', icon: '🔥',
    rarity: Rarity.Rare,
    maxLevel: 4,
    proc: pr(every(5), [D(1.5, BL(1, 180)), B(0.8, 3, BL(1, 180))], 0xff5a3c, 'fire'),
  }),
  ProcTopping({
    id: 'frostnova', name: 'Frost Nova', icon: '🥶',
    rarity: Rarity.Rare,
    maxLevel: 3,
    proc: pr(every(9), [FZ(1.2, peel(260))], 0x5fd8ff, 'frost'),
  }),
  ProcTopping({
    id: 'shock', name: 'Static Shock', icon: '🔋',
    rarity: Rarity.Rare,
    maxLevel: 4,
    proc: pr(smack(0.2), [C(0.8, 3)], 0x5fd8ff, 'zap'),
  }),
  ProcTopping({
    id: 'stinkbomb', name: 'Stink Bomb', icon: '🦨',
    rarity: Rarity.Rare,
    maxLevel: 4,
    proc: pr(every(6), [D(1.2, BL(1, 220, 'front')), S(0.3, 2, BL(1, 220, 'front'))], 0x9fbf4a, 'ink'),
  }),
  ProcTopping({
    id: 'sauceflood', name: 'Sauce Flood', icon: '🍅',
    rarity: Rarity.Rare,
    maxLevel: 3,
    proc: pr(every(10), [D(1.2, all), S(0.2, 2, all)], 0xff5a3c, 'wind'),
  }),
  ProcTopping({
    id: 'thunder', name: 'Thunder Crust', icon: '🔌',
    rarity: Rarity.Rare,
    maxLevel: 4,
    proc: pr(kill(0.2), [C(1.2, 4)], 0x5fd8ff, 'zap'),
  }),
  ProcTopping({
    id: 'boomerang', name: 'Boomerang Peel', icon: '🪃',
    rarity: Rarity.Rare,
    maxLevel: 4,
    proc: pr(smack(0.2), [D(1, rnd(2))], 0xd9a066, 'burst'),
  }),
  ProcTopping({
    id: 'greasefire', name: 'Grease Fire', icon: '🍟',
    rarity: Rarity.Rare,
    maxLevel: 3,
    proc: pr(stomp, [B(1.5, 4, hit(200))], 0xff9f1c, 'fire'),
  }),
  ProcTopping({
    id: 'ricochet', name: 'Ricochet', icon: '🎱',
    rarity: Rarity.Rare,
    maxLevel: 4,
    proc: pr(every(3), [D(1.2, front(1))], 0x4c7dff, 'burst'),
  }),
  ProcTopping({
    id: 'pepperspray', name: 'Pepper Spray', icon: '🧯',
    rarity: Rarity.Rare,
    maxLevel: 3,
    proc: pr(smack(0.15), [ST(1, hit(150))], 0xff5a3c, 'ink'),
  }),
  ProcTopping({
    id: 'tremor', name: 'Tremor', icon: '🪨',
    rarity: Rarity.Rare,
    maxLevel: 3,
    proc: pr(every(8), [D(1.5, all), K(300, all)], 0xb07a3a, 'burst'),
  }),
  ProcTopping({
    id: 'tipstorm', name: 'Tip Storm', icon: '💸',
    rarity: Rarity.Rare,
    maxLevel: 3,
    proc: pr(kill(0.15), [T(3)], 0xffd23f, 'gold'),
  }),
  ProcTopping({
    id: 'bookmark', name: 'Mark of the Peel', icon: '🔖',
    rarity: Rarity.Rare,
    maxLevel: 4,
    proc: pr(smack(0.2), [M(1.4, 4, hit())], 0xff7ad9, 'ink'),
  }),
  ProcTopping({
    id: 'shards', name: 'Crust Shards', icon: '🥐',
    rarity: Rarity.Rare,
    maxLevel: 4,
    proc: pr(kill(0.35), [D(0.8, rnd(3))], 0xd9a066, 'rain'),
  }),
  ProcTopping({
    id: 'bubblewrap', name: 'Bubble Wrap', icon: '🫧',
    rarity: Rarity.Rare,
    maxLevel: 2,
    proc: pr(wave, [SH(1, 'weakest')], 0x5fd8ff, 'heal'),
  }),
  ProcTopping({
    id: 'stampede', name: 'Stampede', icon: '🐂',
    rarity: Rarity.Rare,
    maxLevel: 3,
    proc: pr(every(9), [D(2, front(3), 600)], 0xb07a3a, 'wind'),
  }),
  ProcTopping({
    id: 'lemon', name: 'Zesty Lemon', icon: '🍋',
    rarity: Rarity.Rare,
    maxLevel: 4,
    proc: pr(smack(0.18), [D(1.2, hit(130))], 0xfff06a, 'burst'),
  }),

  // ——— Epic (24) ———
  Topping({
    id: 'sawblades', name: 'Saw Blades', icon: '🪚',
    rarity: Rarity.Epic,
    maxLevel: 2,
    effects: [
      Effect.Stat(
        Stat.Cutters,
        Op.Add(Unit.Count(2)),
      ),
      Effect.Stat(
        Stat.CutterDmg,
        Op.Add(Unit.Amount(8)),
      ),
    ],
  }),
  Topping({
    id: 'berserker', name: 'Berserker', icon: '😤',
    rarity: Rarity.Epic,
    maxLevel: 3,
    effects: [
      Effect.Stat(
        Stat.Damage,
        Op.Mul(Unit.Mult(1.35)),
      ),
    ],
  }),
  Topping({
    id: 'critmass', name: 'Critical Mass', icon: '🎇',
    rarity: Rarity.Epic,
    maxLevel: 3,
    effects: [
      Effect.Stat(
        Stat.CritChance,
        Op.Add(Unit.Chance(10)),
      ),
      Effect.Stat(
        Stat.CritMult,
        Op.Add(Unit.Percent(50)),
      ),
    ],
  }),
  Topping({
    id: 'guillotine', name: 'Guillotine', icon: '⚔️',
    rarity: Rarity.Epic,
    maxLevel: 2,
    effects: [
      Effect.Stat(
        Stat.Execute,
        Op.Add(Unit.Percent(10)),
      ),
    ],
  }),
  Topping({
    id: 'hydra', name: 'Hydra Peel', icon: '🐉',
    rarity: Rarity.Epic,
    maxLevel: 2,
    effects: [
      Effect.Stat(
        Stat.ChainChance,
        Op.Add(Unit.Chance(15)),
      ),
      Effect.Stat(
        Stat.ChainCount,
        Op.Add(Unit.Count(1)),
      ),
    ],
  }),
  Topping({
    id: 'radiant', name: 'Radiant Crust', icon: '☀️',
    rarity: Rarity.Epic,
    maxLevel: 2,
    effects: [
      Effect.Stat(
        Stat.GarlicDps,
        Op.Add(Unit.Amount(12)),
      ),
    ],
  }),
  Topping({
    id: 'bossbane', name: 'Bossbane', icon: '👹',
    rarity: Rarity.Epic,
    maxLevel: 3,
    effects: [
      Effect.Stat(
        Stat.BossDmg,
        Op.Add(Unit.Percent(30)),
      ),
    ],
  }),
  Topping({
    id: 'overtime', name: 'Overtime', icon: '⏰',
    rarity: Rarity.Epic,
    maxLevel: 2,
    needsMeter: NeedsMeter.Meter,
    effects: [
      Effect.Stat(
        Stat.SuperGain,
        Op.Add(Unit.Percent(60)),
      ),
    ],
  }),
  Topping({
    id: 'chainreaction', name: 'Chain Reaction', icon: '🔗',
    rarity: Rarity.Epic,
    maxLevel: 2,
    effects: [
      Effect.Stat(
        Stat.ExplodeDmg,
        Op.Add(Unit.Amount(25)),
      ),
    ],
  }),
  // (3 feet, not every foot: burning the whole table 80% of the time let a stacked build clear waves on its own)
  ProcTopping({
    id: 'inferno', name: 'Inferno Crust', icon: '🏮',
    rarity: Rarity.Epic,
    maxLevel: 3,
    proc: pr(every(6), [B(1.5, 4, rnd(3))], 0xff5a3c, 'fire'),
  }),
  ProcTopping({
    id: 'meteor', name: 'Meteor Pepperoni', icon: '🌠',
    rarity: Rarity.Epic,
    maxLevel: 3,
    proc: pr(every(7), [D(4, BL(2, 220))], 0xff9f1c, 'rain'),
  }),
  ProcTopping({
    id: 'blizzard', name: 'Blizzard', icon: '🌨️',
    rarity: Rarity.Epic,
    maxLevel: 2,
    proc: pr(every(12), [FZ(2, all)], 0xffffff, 'frost'),
  }),
  ProcTopping({
    id: 'storm', name: 'Lightning Storm', icon: '⛈️',
    rarity: Rarity.Epic,
    maxLevel: 3,
    proc: pr(every(5), [C(2, 5, rnd(1))], 0x5fd8ff, 'zap'),
  }),
  ProcTopping({
    id: 'firecracker', name: 'Firecracker', icon: '🧨',
    rarity: Rarity.Epic,
    maxLevel: 3,
    proc: pr(kill(0.35), [D(3, hit(260))], 0xff5a3c, 'burst'),
  }),
  ProcTopping({
    id: 'shockwave', name: 'Shockwave', icon: '📯',
    rarity: Rarity.Epic,
    maxLevel: 3,
    proc: pr(smack(0.2), [D(1.5, peel(240))], 0xffd23f, 'burst'),
  }),
  ProcTopping({
    id: 'acid', name: 'Acid Sauce', icon: '🧪',
    rarity: Rarity.Epic,
    maxLevel: 3,
    proc: pr(every(6), [M(1.5, 5, all)], 0x7be04a, 'ink'),
  }),
  ProcTopping({
    id: 'gravitybomb', name: 'Gravity Bomb', icon: '💣',
    rarity: Rarity.Epic,
    maxLevel: 2,
    proc: pr(every(10), [ST(1.5, all), D(2, all)], 0xa77dff, 'burst'),
  }),
  ProcTopping({
    id: 'mortar', name: 'Pizza Mortar', icon: '🎆',
    rarity: Rarity.Epic,
    maxLevel: 3,
    proc: pr(every(4), [D(2.5, BL(1, 200, 'front'))], 0xff9f1c, 'rain'),
  }),
  ProcTopping({
    id: 'cascade', name: 'Cascade', icon: '💦',
    rarity: Rarity.Epic,
    maxLevel: 3,
    proc: pr(kill(0.3), [C(1.2, 4)], 0x4c7dff, 'zap'),
  }),
  ProcTopping({
    id: 'hail', name: 'Hailstorm', icon: '🌧️',
    rarity: Rarity.Epic,
    maxLevel: 3,
    proc: pr(every(6), [D(1.2, rnd(6))], 0xd8f6ff, 'rain'),
  }),
  ProcTopping({
    id: 'goldrain', name: 'Gold Rain', icon: '🪙',
    rarity: Rarity.Epic,
    maxLevel: 3,
    proc: pr(kill(0.2), [T(4), D(1, hit(180))], 0xffd23f, 'gold'),
  }),
  ProcTopping({
    id: 'tornado', name: 'Tornado', icon: '🌪️',
    rarity: Rarity.Epic,
    maxLevel: 2,
    proc: pr(every(8), [K(900, all), D(1.5, all)], 0xc7ccd4, 'wind'),
  }),
  ProcTopping({
    id: 'spikedplates', name: 'Spiked Plates', icon: '📌',
    rarity: Rarity.Epic,
    maxLevel: 3,
    proc: pr(stomp, [D(4, hit(200)), ST(1, hit())], 0xc7ccd4, 'burst'),
  }),
  ProcTopping({
    id: 'volcano', name: 'Volcano', icon: '🌋',
    rarity: Rarity.Epic,
    maxLevel: 3,
    proc: pr(every(9), [D(3, BL(3, 200)), B(1, 3, BL(3, 200))], 0xff5a3c, 'fire'),
  }),

  // ——— Legendary (16) ———
  Topping({
    id: 'handofdough', name: 'Hand of Dough', icon: '🙌',
    rarity: Rarity.Legendary,
    maxLevel: 1,
    effects: [
      Effect.Stat(
        Stat.Damage,
        Op.Mul(Unit.Mult(1.6)),
      ),
    ],
  }),
  Topping({
    id: 'michelin', name: 'Michelin Star', icon: '⭐',
    rarity: Rarity.Legendary,
    maxLevel: 1,
    effects: [
      Effect.Stat(
        Stat.Damage,
        Op.Mul(Unit.Mult(1.3)),
      ),
      Effect.Stat(
        Stat.CritChance,
        Op.Add(Unit.Chance(10)),
      ),
      Effect.Stat(
        Stat.Radius,
        Op.Add(Unit.Px(10)),
      ),
    ],
  }),
  Topping({
    id: 'excalibur', name: 'Excalibur', icon: '🗡️',
    rarity: Rarity.Legendary,
    maxLevel: 1,
    effects: [
      Effect.Stat(
        Stat.CritChance,
        Op.Add(Unit.Chance(20)),
      ),
      Effect.Stat(
        Stat.CritMult,
        Op.Add(Unit.Percent(150)),
      ),
      Effect.Stat(
        Stat.Execute,
        Op.Add(Unit.Percent(8)),
      ),
    ],
  }),
  Topping({
    id: 'feast', name: 'Endless Feast', icon: '🍽️',
    rarity: Rarity.Legendary,
    maxLevel: 1,
    text: { up: 'Every pizza regrows +1 slice after each wave, and your weakest +1 more' },
    effects: [
      Effect.Stat(
        Stat.RegenAll,
        Op.Add(Unit.PerWave(1)),
      ),
      Effect.Stat(
        Stat.HealWeakest,
        Op.Add(Unit.PerWave(1)),
      ),
    ],
  }),
  Topping({
    id: 'goldengod', name: 'Golden God', icon: '🏆',
    rarity: Rarity.Legendary,
    maxLevel: 1,
    effects: [
      Effect.Stat(
        Stat.CoinMult,
        Op.Add(Unit.Percent(40)),
      ),
      Effect.Stat(
        Stat.GoldenTouch,
        Op.Add(Unit.Chance(10)),
      ),
      Effect.Stat(
        Stat.Damage,
        Op.Mul(Unit.Mult(1.15)),
      ),
    ],
  }),
  ProcTopping({
    id: 'apocalypse', name: 'Pizzapocalypse', icon: '☄️',
    rarity: Rarity.Legendary,
    maxLevel: 2,
    proc: pr(every(8), [D(5, BL(3, 240)), B(1, 3, BL(3, 240))], 0xff5a3c, 'fire'),
  }),
  ProcTopping({
    id: 'mjolnir', name: 'Thunder Peel', icon: '🔨',
    rarity: Rarity.Legendary,
    maxLevel: 2,
    proc: pr(smack(0.25), [C(2.5, 6)], 0x5fd8ff, 'zap'),
  }),
  ProcTopping({
    id: 'eclipse', name: 'Total Eclipse', icon: '🌑',
    rarity: Rarity.Legendary,
    maxLevel: 2,
    proc: pr(every(15), [D(8, all), ST(2, all)], 0xa77dff, 'slam'),
  }),
  ProcTopping({
    id: 'singularity', name: 'Singularity', icon: '🌌',
    rarity: Rarity.Legendary,
    maxLevel: 2,
    proc: pr(every(12), [D(6, all), S(0.5, 3, all)], 0xa77dff, 'ink'),
  }),
  ProcTopping({
    id: 'phoenix', name: 'Phoenix Oven', icon: '🦅',
    rarity: Rarity.Legendary,
    maxLevel: 2,
    proc: pr(kill(0.5), [D(3, hit(280)), B(2, 3, hit(280))], 0xff9f1c, 'fire'),
  }),
  ProcTopping({
    id: 'doomsday', name: 'Doomsday Crust', icon: '💀',
    rarity: Rarity.Legendary,
    maxLevel: 2,
    proc: pr(kill(0.15), [D(6, all)], 0xff5a3c, 'slam'),
  }),
  ProcTopping({
    id: 'zeus', name: 'Bolt from the Blue', icon: '🌩️',
    rarity: Rarity.Legendary,
    maxLevel: 2,
    proc: pr(every(4), [C(3, 6, tough(1))], 0x4c7dff, 'zap'),
  }),
  ProcTopping({
    id: 'frostgiant', name: 'Frost Giant', icon: '☃️',
    rarity: Rarity.Legendary,
    maxLevel: 2,
    proc: pr(every(10), [FZ(3, all), D(3, all)], 0x5fd8ff, 'frost'),
  }),
  ProcTopping({
    id: 'dragon', name: 'Dragon’s Breath', icon: '🐲',
    rarity: Rarity.Legendary,
    maxLevel: 2,
    proc: pr(every(5), [B(3, 4, front(4)), D(2, front(4))], 0xff5a3c, 'fire'),
  }),
  ProcTopping({
    id: 'blackhole', name: 'Black Hole', icon: '🕳️',
    rarity: Rarity.Legendary,
    maxLevel: 2,
    proc: pr(every(14), [D(10, tough(3)), ST(2, all)], 0x24202c, 'ink'),
  }),
  ProcTopping({
    id: 'supernova', name: 'Supernova', icon: '🌟',
    rarity: Rarity.Legendary,
    maxLevel: 2,
    proc: pr(kill(0.25), [D(4, hit(320), 900)], 0xffd23f, 'burst'),
  }),
];

void nearP;
