// Trade-off toppings: a big upgrade with a real downside, 10 per rarity. The card shows the
// downside as its own red line.

import type { Rarity, Stats, Upgrade } from './upgrades';
import { freshnessOn } from '../game/heatRules';

function deal(id: string, name: string, icon: string, rarity: Rarity, max: number, up: string, down: string, apply: (s: Stats) => void): Upgrade {
  return { id, name, icon, rarity, max, desc: () => up, downside: down, apply };
}

/**
 * A trade-off paid in freshness, with a different catch on Mild (where freshness is off).
 * freshNow: one-time freshness hit to the pizzas on the table · mild: the Mild downside and its effect.
 */
function freshDeal(
  id: string, name: string, icon: string, rarity: Rarity, max: number, up: string, apply: (s: Stats) => void,
  fresh: { text: string; now?: number; apply?: (s: Stats) => void },
  mild: { text: string; slicesNow?: number; apply?: (s: Stats) => void },
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
    apply: (s) => {
      apply(s);
      if (freshnessOn()) fresh.apply?.(s);
      else mild.apply?.(s);
    },
  };
}

export const TRADEOFF_TOPPINGS: Upgrade[] = [
  // ——— Common ———
  deal('glasspeel', 'Glass Peel', '🔍', 'common', 3, '+40% smack damage', '−15% smack reach', (s) => { s.damage *= 1.4; s.radius *= 0.85; }),
  deal('greedy', 'Greedy Fingers', '🤑', 'common', 3, '+40% tips', 'Feet move 6% faster', (s) => { s.coinMult += 0.4; s.speedMult *= 1.06; }),
  deal('castiron', 'Cast-Iron Peel', '⚫', 'common', 3, '+15% smack damage, +80 knockback', '−20% meter charge', (s) => { s.damage *= 1.15; s.knockback += 80; s.superGain -= 0.2; }),
  deal('sugarhigh', 'Sugar High', '🍬', 'common', 3, '+40% meter charge', '−10% smack damage', (s) => { s.superGain += 0.4; s.damage *= 0.9; }),
  deal('gambler', 'Gambler’s Crust', '🃏', 'common', 3, '+12% crit chance', '−10% smack damage', (s) => { s.critChance += 0.12; s.damage *= 0.9; }),
  deal('fastfood', 'Fast Food', '🍔', 'common', 3, 'Combos last +1s, +20% score', 'Feet move 5% faster', (s) => { s.comboBonus += 1; s.scoreMult += 0.2; s.speedMult *= 1.05; }),
  freshDeal('overproofed', 'Over-Proofed', '🍩', 'common', 2, '+2 slice regrowth on every pizza after each wave', (s) => { s.regenPerWave += 2; }, { text: 'Pizzas on the table lose 2 freshness now', now: 2 }, { text: 'Pizzas on the table lose 1 slice now', slicesNow: 1 }),
  deal('ghostpepper', 'Ghost Pepper', '🥵', 'common', 3, 'Smacks burn feet: +8 dmg/s', '−10% smack reach', (s) => { s.burnDps += 8; s.radius *= 0.9; }),
  freshDeal('cheapcheese', 'Cheap Cheese', '🧀', 'common', 3, '+30% tips, +5 tips after every wave', (s) => { s.coinMult += 0.3; s.coinsPerWave += 5; }, { text: 'Pizzas on the table lose 1 freshness now', now: 1 }, { text: 'Feet move 4% faster', apply: (s) => { s.speedMult *= 1.04; } }),
  deal('bigswing', 'Big Swing', '🏏', 'common', 3, '+20 smack reach', '−12% smack damage', (s) => { s.radius += 20; s.damage *= 0.88; }),

  // ——— Rare ———
  deal('ragepeel', 'Rage Peel', '😡', 'rare', 3, '+50% smack damage', 'Feet move 10% faster', (s) => { s.damage *= 1.5; s.speedMult *= 1.1; }),
  deal('tipleech', 'Tip Leech', '🩸', 'rare', 2, '+25% tips, +2 tips per quick kill', 'Feet have 10% more health', (s) => { s.coinMult += 0.25; s.quickTips += 2; s.footHp *= 1.1; }),
  deal('adrenaline', 'Adrenaline', '💉', 'rare', 3, '+60% meter charge, +8% double-smack chance', '−10% smack reach', (s) => { s.superGain += 0.6; s.doubleChance += 0.08; s.radius *= 0.9; }),
  deal('thincrust', 'Thin Crust', '🥖', 'rare', 2, '+60% smack damage', 'Stomps have a 10% chance to take an extra slice', (s) => { s.damage *= 1.6; s.stompExtra += 0.1; }),
  deal('headsman', 'Headsman', '⚰️', 'rare', 2, 'Smacks finish feet under +15% health', '−15% tips', (s) => { s.execute += 0.15; s.coinMult -= 0.15; }),
  deal('spicemaster', 'Spice Master', '🫚', 'rare', 3, 'Smacks burn feet: +12 dmg/s', '−8% crit chance', (s) => { s.burnDps += 12; s.critChance -= 0.08; }),
  deal('overcharged', 'Overcharged', '🪫', 'rare', 2, '+25% chain lightning chance, +1 chain target', '−25% meter charge', (s) => { s.chainChance += 0.25; s.chainCount += 1; s.superGain -= 0.25; }),
  deal('frenzy', 'Frenzy', '💫', 'rare', 3, '+15% double-smack chance', 'Feet move 8% faster', (s) => { s.doubleChance += 0.15; s.speedMult *= 1.08; }),
  deal('pizzabait', 'Pizza Bait', '🎣', 'rare', 2, 'Feet near pizzas take +15 dmg/s', 'Stomps have an 8% chance to take an extra slice', (s) => { s.garlicDps += 15; s.stompExtra += 0.08; }),
  deal('goldfever', 'Gold Fever', '🏅', 'rare', 2, '8% of feet turn to gold (5× tips)', '−15% smack damage', (s) => { s.goldenTouch += 0.08; s.damage *= 0.85; }),

  // ——— Epic ———
  deal('glasscannon', 'Glass Cannon', '🔮', 'epic', 2, '+100% smack damage', 'Stomps have a 20% chance to take an extra slice', (s) => { s.damage *= 2; s.stompExtra += 0.2; }),
  deal('bloodmoon', 'Blood Moon', '🌘', 'epic', 2, '+25% crit chance, +100% crit damage', 'Feet have 15% more health', (s) => { s.critChance += 0.25; s.critMult += 1; s.footHp *= 1.15; }),
  deal('overdrive', 'Overdrive', '🏎️', 'epic', 2, '+100% meter charge', 'Feet move 12% faster', (s) => { s.superGain += 1; s.speedMult *= 1.12; }),
  deal('wildfire', 'Wildfire', '🪔', 'epic', 2, 'Smacks burn +20 dmg/s; stompers burn +15 dmg/s', '−15% tips', (s) => { s.burnDps += 20; s.stompBurn += 15; s.coinMult -= 0.15; }),
  deal('stormcaller', 'Storm Caller', '🧿', 'epic', 2, '+30% chain lightning chance, +2 chain targets', '−15% smack reach', (s) => { s.chainChance += 0.3; s.chainCount += 2; s.radius *= 0.85; }),
  deal('butcher', 'Butcher', '🥩', 'epic', 2, '+45% smack damage, finish feet under +10% health', '−20% tips', (s) => { s.damage *= 1.45; s.execute += 0.1; s.coinMult -= 0.2; }),
  deal('titangrip', 'Titan Grip', '✊', 'epic', 2, '+30% smack damage, +20 smack reach', 'Feet have 15% more health', (s) => { s.damage *= 1.3; s.radius += 20; s.footHp *= 1.15; }),
  freshDeal('feastfamine', 'Feast or Famine', '🍲', 'epic', 1, 'Every pizza regrows +2 slices after each wave', (s) => { s.regenAll += 2; }, { text: 'Pizzas on the table lose 3 freshness now', now: 3 }, { text: 'Feet have 10% more health', apply: (s) => { s.footHp *= 1.1; } }),
  deal('boomtown', 'Boom Town', '🎉', 'epic', 2, 'Smacked-down feet explode for +40 area damage', '−30% meter charge', (s) => { s.explodeDmg += 40; s.superGain -= 0.3; }),
  deal('nosleep', 'No Sleep', '🦉', 'epic', 2, '+20% chance smacks stun feet', 'Feet move 10% faster', (s) => { s.stunChance += 0.2; s.speedMult *= 1.1; }),

  // ——— Legendary ———
  deal('devilsdeal', 'Devil’s Deal', '😈', 'legendary', 1, '×2 smack damage', 'Feet have 20% more health and move 10% faster', (s) => { s.damage *= 2; s.footHp *= 1.2; s.speedMult *= 1.1; }),
  deal('allin', 'All In', '🎰', 'legendary', 1, '×1.5 smack damage, +30% crit chance', '−40% tips', (s) => { s.damage *= 1.5; s.critChance += 0.3; s.coinMult -= 0.4; }),
  deal('godspeed', 'Godspeed', '🪽', 'legendary', 1, '+50% double-smack chance', 'Feet move 20% faster', (s) => { s.doubleChance += 0.5; s.speedMult *= 1.2; }),
  deal('midascurse', 'Midas’ Curse', '🫅', 'legendary', 1, '25% of feet turn to gold (5× tips)', '−25% smack damage', (s) => { s.goldenTouch += 0.25; s.damage *= 0.75; }),
  deal('oblivion', 'Oblivion Peel', '🌑', 'legendary', 1, '×1.4 smack damage, +25 smack reach', 'Stomps have a 25% chance to take an extra slice', (s) => { s.damage *= 1.4; s.radius += 25; s.stompExtra += 0.25; }),
  freshDeal('sacrifice', 'Sacrifice', '🗿', 'legendary', 1, 'Every pizza regrows +2 slices and gets +1 shield each wave', (s) => { s.regenAll += 2; s.shields += 1; }, { text: 'Every pizza holds 2 less freshness', apply: (s) => { s.freshBonus -= 2; } }, { text: 'Feet have double health', apply: (s) => { s.footHp *= 2; } }),
  deal('phoenixpact', 'Phoenix Pact', '🐦', 'legendary', 1, '×1.3 smack damage, finish feet under +20% health', '−50% meter charge', (s) => { s.damage *= 1.3; s.execute += 0.2; s.superGain -= 0.5; }),
  deal('warlord', 'Warlord', '🏴', 'legendary', 1, '×1.5 smack damage, +30% boss damage', '−30% tips, feet have 10% more health', (s) => { s.damage *= 1.5; s.bossDmg += 0.3; s.coinMult -= 0.3; s.footHp *= 1.1; }),
  deal('overclock', 'Overclock', '🖥️', 'legendary', 1, '+40% chain lightning chance, +3 targets, +30% chain damage', '−20% smack reach', (s) => { s.chainChance += 0.4; s.chainCount += 3; s.chainDmg += 0.3; s.radius *= 0.8; }),
  deal('apex', 'Apex Predator', '🦈', 'legendary', 1, '+60% damage to healthy feet, +40% boss damage', 'Feet have 25% more health', (s) => { s.bigHurt += 0.6; s.bossDmg += 0.4; s.footHp *= 1.25; }),
];
