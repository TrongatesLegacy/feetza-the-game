// The Feetza 2.0 topping expansion: 106 more toppings (50 common, 40 rare, 30 epic, 20 legendary in all).
// Stat toppings change Stats; proc toppings use the peel-ability engine (triggers + effects), scaled by level.

import { P, TRIG, describeProc, scaleProc, type Proc } from '../game/abilities';
import type { Rarity, Stats, Upgrade } from './upgrades';
import { meterBoostText } from '../game/slamMode';

const { all, peel, hit, rnd, front, tough, nearP, BL, D, B, S, ST, FZ, K, M, C, H, SH, T } = P;
const { every, smack, kill, stomp, wave } = TRIG;

const pc = (n: number) => `${Math.round(n * 100)}%`;

function stat(id: string, name: string, icon: string, rarity: Rarity, max: number, desc: string, apply: (s: Stats) => void): Upgrade {
  return { id, name, icon, rarity, max, desc: () => desc, apply };
}

function proc(id: string, name: string, icon: string, rarity: Rarity, max: number, p: Proc): Upgrade {
  return {
    id,
    name,
    icon,
    rarity,
    max,
    proc: p,
    desc: (l) => (l <= 1 ? describeProc(p) : `${describeProc(scaleProc(p, l))}`),
    apply: () => {},
  };
}

const pr = (trigger: Proc['trigger'], fx: Proc['fx'], color: number, vfx: Proc['vfx']): Proc => ({ trigger, fx, color, vfx });

export const MORE_TOPPINGS: Upgrade[] = [
  // ——— Common (38) ———
  stat('rolling', 'Rolling Pin', '🪵', 'common', 5, '+12% smack damage, +40 knockback', (s) => { s.damage *= 1.12; s.knockback += 40; }),
  stat('salt', 'Sea Salt', '🧂', 'common', 5, `+${pc(0.05)} critical smack chance`, (s) => { s.critChance += 0.05; }),
  stat('basil', 'Fresh Basil', '🌱', 'common', 3, '+2 freshness on every pizza', (s) => { s.freshBonus += 2; }),
  stat('napkin', 'Napkin Snap', '🧻', 'common', 4, `+${pc(0.05)} chance smacks stun feet`, (s) => { s.stunChance += 0.05; }),
  stat('whisk', 'Whisk It', '🥄', 'common', 5, `+${pc(0.06)} chance to smack twice`, (s) => { s.doubleChance += 0.06; }),
  stat('oil', 'Olive Oil Drizzle', '🫗', 'common', 4, 'Smacks burn feet: +3 dmg/s', (s) => { s.burnDps += 3; }),
  stat('icecubes', 'Ice Cubes', '🥤', 'common', 4, 'Smacks chill feet: +8% slow', (s) => { s.slowPct += 0.08; }),
  stat('tipcup', 'Tip Cup', '☕', 'common', 5, '+3 tips after every wave', (s) => { s.coinsPerWave += 3; }),
  stat('streak', 'Hot Streak', '⏲️', 'common', 4, 'Combos last +0.3s', (s) => { s.comboBonus += 0.3; }),
  stat('showboat', 'Showboat', '🎭', 'common', 5, '+10% score', (s) => { s.scoreMult += 0.1; }),
  stat('handle', 'Long Handle', '🥢', 'common', 5, '+6 smack reach', (s) => { s.radius += 6; }),
  stat('grip', 'Better Grip', '🧤', 'common', 6, '+10% smack damage', (s) => { s.damage *= 1.1; }),
  { ...stat('dried', 'Dried Oregano', '🍂', 'common', 4, '', (s) => { s.superGain += 0.2; }), desc: () => meterBoostText(20) },
  stat('slayer', 'Giant Slayer', '🛡️', 'common', 4, '+12% damage to bosses', (s) => { s.bossDmg += 0.12; }),
  stat('bully', 'Bully Smack', '👊', 'common', 4, '+12% damage to feet above half health', (s) => { s.bigHurt += 0.12; }),
  stat('crumbs', 'Crumb Trail', '🥖', 'common', 3, 'Smacks finish feet under +4% health', (s) => { s.execute += 0.04; }),
  stat('knots', 'Garlic Knots', '🥨', 'common', 4, 'Feet near pizzas take +4 dmg/s', (s) => { s.garlicDps += 4; }),
  stat('pearls', 'Mozzarella Pearls', '⚪', 'common', 3, `+${pc(0.06)} chance pizzas shrug off a stomp`, (s) => { s.shrugChance += 0.06; }),
  stat('pepcount', 'Pepperoni Count', '🔴', 'common', 4, '+8% tips', (s) => { s.coinMult += 0.08; }),
  stat('lunchrush', 'Lunch Rush', '⏱️', 'common', 3, '+1 tip for every quick kill', (s) => { s.quickTips += 1; }),
  stat('shaker', 'Herb Shaker', '🪴', 'common', 4, '+3% crit and +3% stun chance', (s) => { s.critChance += 0.03; s.stunChance += 0.03; }),
  proc('flour', 'Flour Bomb', '💨', 'common', 4, pr(kill(0.2), [D(1, hit(150))], 0xffffff, 'burst')),
  proc('grinder', 'Pepper Grinder', '🫑', 'common', 4, pr(smack(0.15), [B(0.6, 3, hit(120))], 0xff9f1c, 'fire')),
  proc('saucesplash', 'Sauce Splash', '🥫', 'common', 4, pr(kill(0.25), [D(0.6, hit(170)), S(0.3, 2, hit(170))], 0xff5a3c, 'burst')),
  proc('crustedge', 'Crusty Edge', '🥯', 'common', 4, pr(smack(0.12), [D(0.8, hit(140))], 0xd9a066, 'burst')),
  proc('parmsnow', 'Parmesan Snow', '🏔️', 'common', 3, pr(every(7), [S(0.25, 2, all)], 0xffffff, 'frost')),
  proc('chilioil', 'Chili Oil', '🧴', 'common', 4, pr(every(6), [B(0.5, 3, rnd(2))], 0xff5a3c, 'fire')),
  proc('frisbee', 'Dough Frisbee', '🥏', 'common', 4, pr(every(6), [D(1.5, rnd(1))], 0xf2dfb0, 'rain')),
  proc('orderbell', 'Order Bell', '🛎️', 'common', 3, pr(wave, [T(6)], 0xffd23f, 'gold')),
  proc('boxlid', 'Pizza Box Lid', '📦', 'common', 3, pr(stomp, [K(600, hit())], 0xd9a066, 'wind')),
  proc('spatula', 'Spatula Swipe', '🍳', 'common', 4, pr(smack(0.15), [K(500, hit(140))], 0xc7ccd4, 'wind')),
  proc('anchovy', 'Anchovy Fling', '🐟', 'common', 4, pr(every(5), [D(1, front(1))], 0x5fd8ff, 'rain')),
  proc('cheeseburst', 'Cheese Burst', '🫕', 'common', 4, pr(kill(0.2), [D(0.8, hit(200))], 0xffd23f, 'burst')),
  proc('warmplates', 'Warm Plates', '🫖', 'common', 2, pr(wave, [H(1, 'weakest')], 0x7be04a, 'heal')),
  proc('scoop', 'Ice Cream Scoop', '🍨', 'common', 4, pr(smack(0.1), [ST(0.6, hit())], 0xff7ad9, 'burst')),
  proc('stretch', 'Cheese Stretch', '🧵', 'common', 4, pr(smack(0.12), [C(0.6, 1)], 0xffd23f, 'zap')),
  proc('sesame', 'Sesame Seeds', '🌾', 'common', 4, pr(kill(0.3), [D(0.5, rnd(3))], 0xf2dfb0, 'rain')),
  proc('rocket', 'Rocket Leaves', '🥬', 'common', 3, pr(every(8), [D(0.8, all)], 0x7be04a, 'wind')),

  // ——— Rare (28) ———
  stat('wheel', 'Pizza Wheel', '🛞', 'rare', 3, '+1 orbiting cutter, cutters deal +4', (s) => { s.cutters += 1; s.cutterDmg += 4; }),
  stat('magnetpeel', 'Magnet Peel', '🧲', 'rare', 3, '+10 smack reach, +60 knockback', (s) => { s.radius += 10; s.knockback += 60; }),
  stat('sharp', 'Sharpened Edge', '🪒', 'rare', 4, '+40% critical damage', (s) => { s.critMult += 0.4; }),
  stat('crowd', 'Crowd Control', '🚧', 'rare', 3, '+6% stun chance and +8% slow', (s) => { s.stunChance += 0.06; s.slowPct += 0.08; }),
  stat('sizzle', 'Sizzle Plate', '🥘', 'rare', 3, 'Feet that stomp a pizza burn for +8 dmg/s', (s) => { s.stompBurn += 8; }),
  stat('harvest', 'Harvest Moon', '🌕', 'rare', 2, 'Your weakest pizza regrows +1 slice after each wave', (s) => { s.healWeakest += 1; }),
  stat('spicerack', 'Spice Rack', '🗄️', 'rare', 3, '+3 burn, +3% crit, +3% stun', (s) => { s.burnDps += 3; s.critChance += 0.03; s.stunChance += 0.03; }),
  stat('echo', 'Echo Smack', '🔊', 'rare', 3, `+${pc(0.1)} chance to smack twice`, (s) => { s.doubleChance += 0.1; }),
  stat('cleaver', 'Meat Cleaver', '🪓', 'rare', 3, 'Finish feet under +5% health, +10% boss damage', (s) => { s.execute += 0.05; s.bossDmg += 0.1; }),
  proc('meatball', 'Meatball Mortar', '🧆', 'rare', 4, pr(every(5), [D(2, BL(1, 160))], 0xb07a3a, 'rain')),
  proc('calzonebomb', 'Calzone Bomb', '🥟', 'rare', 4, pr(kill(0.3), [D(2, hit(220))], 0xff9f1c, 'burst')),
  proc('fireball', 'Fireball', '🔥', 'rare', 4, pr(every(5), [D(1.5, BL(1, 180)), B(0.8, 3, BL(1, 180))], 0xff5a3c, 'fire')),
  proc('frostnova', 'Frost Nova', '🥶', 'rare', 3, pr(every(9), [FZ(1.2, peel(260))], 0x5fd8ff, 'frost')),
  proc('shock', 'Static Shock', '🔋', 'rare', 4, pr(smack(0.2), [C(0.8, 3)], 0x5fd8ff, 'zap')),
  proc('stinkbomb', 'Stink Bomb', '🦨', 'rare', 4, pr(every(6), [D(1.2, BL(1, 220, 'front')), S(0.3, 2, BL(1, 220, 'front'))], 0x9fbf4a, 'ink')),
  proc('sauceflood', 'Sauce Flood', '🍅', 'rare', 3, pr(every(10), [D(1.2, all), S(0.2, 2, all)], 0xff5a3c, 'wind')),
  proc('thunder', 'Thunder Crust', '🔌', 'rare', 4, pr(kill(0.2), [C(1.2, 4)], 0x5fd8ff, 'zap')),
  proc('boomerang', 'Boomerang Peel', '🪃', 'rare', 4, pr(smack(0.2), [D(1, rnd(2))], 0xd9a066, 'burst')),
  proc('greasefire', 'Grease Fire', '🍟', 'rare', 3, pr(stomp, [B(1.5, 4, hit(200))], 0xff9f1c, 'fire')),
  proc('ricochet', 'Ricochet', '🎱', 'rare', 4, pr(every(3), [D(1.2, front(1))], 0x4c7dff, 'burst')),
  proc('pepperspray', 'Pepper Spray', '🧯', 'rare', 3, pr(smack(0.15), [ST(1, hit(150))], 0xff5a3c, 'ink')),
  proc('tremor', 'Tremor', '🪨', 'rare', 3, pr(every(8), [D(1.5, all), K(300, all)], 0xb07a3a, 'burst')),
  proc('tipstorm', 'Tip Storm', '💸', 'rare', 3, pr(kill(0.15), [T(3)], 0xffd23f, 'gold')),
  proc('bookmark', 'Mark of the Peel', '🔖', 'rare', 4, pr(smack(0.2), [M(1.4, 4, hit())], 0xff7ad9, 'ink')),
  proc('shards', 'Crust Shards', '🥐', 'rare', 4, pr(kill(0.35), [D(0.8, rnd(3))], 0xd9a066, 'rain')),
  proc('bubblewrap', 'Bubble Wrap', '🫧', 'rare', 2, pr(wave, [SH(1, 'weakest')], 0x5fd8ff, 'heal')),
  proc('stampede', 'Stampede', '🐂', 'rare', 3, pr(every(9), [D(2, front(3), 600)], 0xb07a3a, 'wind')),
  proc('lemon', 'Zesty Lemon', '🍋', 'rare', 4, pr(smack(0.18), [D(1.2, hit(130))], 0xfff06a, 'burst')),

  // ——— Epic (24) ———
  stat('sawblades', 'Saw Blades', '🪚', 'epic', 2, '+2 orbiting cutters, cutters deal +8', (s) => { s.cutters += 2; s.cutterDmg += 8; }),
  stat('berserker', 'Berserker', '😤', 'epic', 3, '+35% smack damage', (s) => { s.damage *= 1.35; }),
  stat('critmass', 'Critical Mass', '🎇', 'epic', 3, '+10% crit chance, +50% crit damage', (s) => { s.critChance += 0.1; s.critMult += 0.5; }),
  stat('guillotine', 'Guillotine', '⚔️', 'epic', 2, 'Smacks finish feet under +10% health', (s) => { s.execute += 0.1; }),
  stat('hydra', 'Hydra Peel', '🐉', 'epic', 2, '+15% chain lightning chance, +1 chain target', (s) => { s.chainChance += 0.15; s.chainCount += 1; }),
  stat('radiant', 'Radiant Crust', '☀️', 'epic', 2, 'Feet near pizzas take +12 dmg/s', (s) => { s.garlicDps += 12; }),
  stat('bossbane', 'Bossbane', '👹', 'epic', 3, '+30% damage to bosses', (s) => { s.bossDmg += 0.3; }),
  { ...stat('overtime', 'Overtime', '⏰', 'epic', 2, '', (s) => { s.superGain += 0.6; }), desc: () => meterBoostText(60) },
  stat('chainreaction', 'Chain Reaction', '🔗', 'epic', 2, 'Smacked-down feet explode for +25 area damage', (s) => { s.explodeDmg += 25; }),
  proc('inferno', 'Inferno Crust', '🏮', 'epic', 3, pr(every(6), [B(1.5, 4, all)], 0xff5a3c, 'fire')),
  proc('meteor', 'Meteor Pepperoni', '🌠', 'epic', 3, pr(every(7), [D(4, BL(2, 220))], 0xff9f1c, 'rain')),
  proc('blizzard', 'Blizzard', '🌨️', 'epic', 2, pr(every(12), [FZ(2, all)], 0xffffff, 'frost')),
  proc('storm', 'Lightning Storm', '⛈️', 'epic', 3, pr(every(5), [C(2, 5, rnd(1))], 0x5fd8ff, 'zap')),
  proc('firecracker', 'Firecracker', '🧨', 'epic', 3, pr(kill(0.35), [D(3, hit(260))], 0xff5a3c, 'burst')),
  proc('shockwave', 'Shockwave', '📯', 'epic', 3, pr(smack(0.2), [D(1.5, peel(240))], 0xffd23f, 'burst')),
  proc('acid', 'Acid Sauce', '🧪', 'epic', 3, pr(every(6), [M(1.5, 5, all)], 0x7be04a, 'ink')),
  proc('gravitybomb', 'Gravity Bomb', '💣', 'epic', 2, pr(every(10), [ST(1.5, all), D(2, all)], 0xa77dff, 'burst')),
  proc('mortar', 'Pizza Mortar', '🎆', 'epic', 3, pr(every(4), [D(2.5, BL(1, 200, 'front'))], 0xff9f1c, 'rain')),
  proc('cascade', 'Cascade', '💦', 'epic', 3, pr(kill(0.3), [C(1.2, 4)], 0x4c7dff, 'zap')),
  proc('hail', 'Hailstorm', '🌧️', 'epic', 3, pr(every(6), [D(1.2, rnd(6))], 0xd8f6ff, 'rain')),
  proc('goldrain', 'Gold Rain', '🪙', 'epic', 3, pr(kill(0.2), [T(4), D(1, hit(180))], 0xffd23f, 'gold')),
  proc('tornado', 'Tornado', '🌪️', 'epic', 2, pr(every(8), [K(900, all), D(1.5, all)], 0xc7ccd4, 'wind')),
  proc('spikedplates', 'Spiked Plates', '📌', 'epic', 3, pr(stomp, [D(4, hit(200)), ST(1, hit())], 0xc7ccd4, 'burst')),
  proc('volcano', 'Volcano', '🌋', 'epic', 3, pr(every(9), [D(3, BL(3, 200)), B(1, 3, BL(3, 200))], 0xff5a3c, 'fire')),

  // ——— Legendary (16) ———
  stat('handofdough', 'Hand of Dough', '🙌', 'legendary', 1, '+60% smack damage', (s) => { s.damage *= 1.6; }),
  stat('michelin', 'Michelin Star', '⭐', 'legendary', 1, '+30% smack damage, +10% crit chance, +10 smack reach', (s) => { s.damage *= 1.3; s.critChance += 0.1; s.radius += 10; }),
  stat('excalibur', 'Excalibur', '🗡️', 'legendary', 1, '+20% crit chance, +150% crit damage, finish feet under 8% health', (s) => { s.critChance += 0.2; s.critMult += 1.5; s.execute += 0.08; }),
  stat('feast', 'Endless Feast', '🍽️', 'legendary', 1, 'Every pizza regrows +1 slice after each wave, and your weakest +1 more', (s) => { s.regenAll += 1; s.healWeakest += 1; }),
  stat('goldengod', 'Golden God', '🏆', 'legendary', 1, '+40% tips, 10% of feet turn to gold, +15% smack damage', (s) => { s.coinMult += 0.4; s.goldenTouch += 0.1; s.damage *= 1.15; }),
  proc('apocalypse', 'Pizzapocalypse', '☄️', 'legendary', 2, pr(every(8), [D(5, BL(3, 240)), B(1, 3, BL(3, 240))], 0xff5a3c, 'fire')),
  proc('mjolnir', 'Thunder Peel', '🔨', 'legendary', 2, pr(smack(0.25), [C(2.5, 6)], 0x5fd8ff, 'zap')),
  proc('eclipse', 'Total Eclipse', '🌑', 'legendary', 2, pr(every(15), [D(8, all), ST(2, all)], 0xa77dff, 'slam')),
  proc('singularity', 'Singularity', '🌌', 'legendary', 2, pr(every(12), [D(6, all), S(0.5, 3, all)], 0xa77dff, 'ink')),
  proc('phoenix', 'Phoenix Oven', '🦅', 'legendary', 2, pr(kill(0.5), [D(3, hit(280)), B(2, 3, hit(280))], 0xff9f1c, 'fire')),
  proc('doomsday', 'Doomsday Crust', '💀', 'legendary', 2, pr(kill(0.15), [D(6, all)], 0xff5a3c, 'slam')),
  proc('zeus', 'Bolt from the Blue', '🌩️', 'legendary', 2, pr(every(4), [C(3, 6, tough(1))], 0x4c7dff, 'zap')),
  proc('frostgiant', 'Frost Giant', '☃️', 'legendary', 2, pr(every(10), [FZ(3, all), D(3, all)], 0x5fd8ff, 'frost')),
  proc('dragon', 'Dragon’s Breath', '🐲', 'legendary', 2, pr(every(5), [B(3, 4, front(4)), D(2, front(4))], 0xff5a3c, 'fire')),
  proc('blackhole', 'Black Hole', '🕳️', 'legendary', 2, pr(every(14), [D(10, tough(3)), ST(2, all)], 0x24202c, 'ink')),
  proc('supernova', 'Supernova', '🌟', 'legendary', 2, pr(kill(0.25), [D(4, hit(320), 900)], 0xffd23f, 'burst')),
];

void nearP;
