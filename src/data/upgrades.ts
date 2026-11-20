// In-run roguelike upgrades. Each upgrade stacks up to `max` levels and modifies Stats.

import type { Proc } from '../game/abilities';
import { MORE_TOPPINGS } from './toppingsMore';

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
}

export function baseStats(): Stats {
  return {
    damage: 10,
    critChance: 0.05,
    critMult: 2.5,
    radius: 26,
    knockback: 260,
    burnDps: 0,
    slowPct: 0,
    chainChance: 0,
    chainCount: 2,
    chainDmg: 0.6,
    cutters: 0,
    cutterDmg: 12,
    garlicDps: 0,
    shields: 0,
    regenPerWave: 0,
    coinMult: 1,
    comboBonus: 0,
    scoreMult: 1,
    stunChance: 0,
    superGain: 1,
    doubleChance: 0,
    shrugChance: 0,
    execute: 0,
    oliveRate: 0,
    oliveDmg: 15,
    explodeDmg: 0,
    speedMult: 1,
    traps: 0,
    luck: 0,
    freeRerolls: 0,
    stompBurn: 0,
    goldenTouch: 0,
    freezeSlam: false,
    angel: 0,
    coinsPerWave: 0,
    slowAbove: 0,
    healWeakest: 0,
    regenAll: 0,
    superStart: 0,
    freshBonus: 0,
    splashDmg: 0,
    bigHurt: 0,
    bossDmg: 0,
    tenthCrit: false,
    quickTips: 0,
    counterDiscount: 0,
    extraConsumable: 0,
    crustBonus: 0,
    slamStun: false,
    miniWeak: 0,
    stunVuln: 0,
    freeTopping: false,
  };
}

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type UpgradeKind = 'permanent' | 'unique' | 'consumable';

export interface Upgrade {
  id: string;
  name: string;
  icon: string;
  rarity: Rarity;
  max: number;
  desc: (lvl: number) => string; // describes the effect of taking level `lvl`
  apply: (s: Stats, lvl: number) => void; // applied once per owned level (lvl = 1..owned)
  /** Called once when picked (immediate effects). 'arm' = a consumable that waits to trigger. */
  onPick?: 'healAll2' | 'extraPizza' | 'fridge' | 'arm';
  /** permanent (default): levels and stacks · unique: once per run · consumable: one use, back after a cooldown. */
  kind?: UpgradeKind;
  /** Proc toppings: an ability-style trigger and effects (scaled by level), run by the scene. */
  proc?: Proc;
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

export const UPGRADES: Upgrade[] = [
  // ——— Common ———
  {
    id: 'heavy', name: 'Heavy Hand', icon: '💪', rarity: 'common', max: 8,
    desc: () => '+25% smack damage',
    apply: (s) => { s.damage *= 1.25; },
  },
  {
    id: 'peel', name: 'Bigger Peel', icon: '🏓', rarity: 'common', max: 6,
    desc: (l) => (l === 1 ? 'Smacks hit every foot in range, +35% radius' : '+35% smack radius'),
    apply: (s) => { s.radius += 9; },
  },
  {
    id: 'crit', name: 'Critical Crust', icon: '🎯', rarity: 'common', max: 6,
    desc: () => '+8% critical smack chance',
    apply: (s) => { s.critChance += 0.08; },
  },
  {
    id: 'chili', name: 'Chili Flakes', icon: '🌶️', rarity: 'common', max: 5,
    desc: (l) => (l === 1 ? 'Smacks set feet on fire: 6 dmg/s' : '+6 burn dmg/s'),
    apply: (s) => { s.burnDps += 6; },
  },
  {
    id: 'freezer', name: 'Freezer Burn', icon: '❄️', rarity: 'common', max: 4,
    desc: (l) => (l === 1 ? 'Smacks chill feet: -20% speed for 2s' : '+12% chill strength'),
    apply: (s, l) => { s.slowPct += l === 1 ? 0.2 : 0.12; },
  },
  {
    id: 'tips', name: 'Tip Jar', icon: '🫙', rarity: 'common', max: 5,
    desc: () => '+25% tips from feet (all tip boosts top out at ×2.5)',
    apply: (s) => { s.coinMult += 0.25; },
  },
  {
    id: 'combo', name: 'Combo Chef', icon: '👨‍🍳', rarity: 'common', max: 5,
    desc: () => 'Combos last +0.4s and score +10%',
    apply: (s) => { s.comboBonus += 0.4; s.scoreMult += 0.1; },
  },
  {
    id: 'spring', name: 'Spring-Loaded', icon: '🌀', rarity: 'common', max: 4,
    desc: () => '+40% knockback: send feet flying back up',
    apply: (s) => { s.knockback *= 1.4; },
  },
  {
    id: 'oregano', name: 'Oregano Overdrive', icon: '🌿', rarity: 'common', max: 4,
    desc: () => '+35% Peel Slam charge rate',
    apply: (s) => { s.superGain += 0.35; },
  },
  {
    id: 'oven', name: 'Fresh From the Oven', icon: '🧑‍🍳', rarity: 'common', max: 1, kind: 'consumable',
    desc: () => 'Heal every pizza 2 slices, right now',
    apply: () => {},
    onPick: 'healAll2',
  },
  {
    id: 'proof', name: 'Slow Proof', icon: '🍞', rarity: 'common', max: 3,
    desc: () => '+1 slice regrowth on every pizza after each wave',
    apply: (s) => { s.regenPerWave += 1; },
  },
  {
    id: 'fridge', name: 'Fridge Magnet', icon: '🧊', rarity: 'rare', max: 2,
    desc: () => '+4 freshness on every pizza, now and for new ones',
    apply: (s) => { s.freshBonus += 4; },
    onPick: 'fridge',
  },
  {
    id: 'leftovers', name: 'Leftovers Box', icon: '🥡', rarity: 'common', max: 1, kind: 'consumable',
    desc: () => 'The next pizza to go stale stays fresh 4 more waves',
    apply: () => {},
    onPick: 'arm',
  },
  {
    id: 'dough', name: 'Emergency Dough', icon: '🫓', rarity: 'rare', max: 1, kind: 'consumable',
    desc: () => 'A pizza that drops to 1 slice regains 3, once',
    apply: () => {},
    onPick: 'arm',
  },
  // ——— Rare ———
  {
    id: 'zap', name: 'Garlic Lightning', icon: '⚡', rarity: 'rare', max: 4,
    desc: (l) => (l === 1 ? '18% chance a smack arcs to 2 nearby feet' : '+10% arc chance, +1 target'),
    apply: (s, l) => { s.chainChance += l === 1 ? 0.18 : 0.1; if (l > 1) s.chainCount += 1; },
  },
  {
    id: 'cutter', name: 'Orbiting Cutter', icon: '⚙️', rarity: 'rare', max: 4,
    desc: (l) => (l === 1 ? 'A pizza cutter orbits your peel, slicing feet' : '+1 orbiting cutter'),
    apply: (s) => { s.cutters += 1; },
  },
  {
    id: 'garlic', name: 'Garlic Breath', icon: '🧄', rarity: 'rare', max: 4,
    desc: () => 'Feet close to any pizza take 8 dmg/s',
    apply: (s) => { s.garlicDps += 8; },
  },
  {
    id: 'shield', name: 'Mozzarella Shield', icon: '🧀', rarity: 'rare', max: 2,
    desc: () => 'Each pizza blocks +1 stomp every wave',
    apply: (s) => { s.shields += 1; },
  },
  {
    id: 'tickle', name: 'Tickle Feather', icon: '🪶', rarity: 'rare', max: 4,
    desc: () => '+8% chance smacks stun feet for 1.2s',
    apply: (s) => { s.stunChance += 0.08; },
  },
  {
    id: 'double', name: 'Double Slap', icon: '👏', rarity: 'rare', max: 4,
    desc: () => '+12% chance to smack twice',
    apply: (s) => { s.doubleChance += 0.12; },
  },
  {
    id: 'sturdy', name: 'Sturdy Crust', icon: '🧱', rarity: 'rare', max: 3,
    desc: () => '+15% chance pizzas shrug off a stomp',
    apply: (s) => { s.shrugChance += 0.15; },
  },
  {
    id: 'olive', name: 'Olive Launcher', icon: '🫒', rarity: 'rare', max: 4,
    desc: (l) => (l === 1 ? 'Auto-fires an olive at a foot every 1.6s' : 'Fires olives 35% faster'),
    apply: (s, l) => { s.oliveRate = l === 1 ? 1 / 1.6 : s.oliveRate * 1.35; },
  },
  {
    id: 'mercy', name: 'Cutter\'s Mercy', icon: '🔪', rarity: 'rare', max: 3,
    desc: () => 'Smacks instantly finish feet under +8% health',
    apply: (s) => { s.execute += 0.08; },
  },
  {
    id: 'siesta', name: 'Siesta', icon: '😴', rarity: 'rare', max: 3,
    desc: () => 'All feet move 8% slower',
    apply: (s) => { s.speedMult *= 0.92; },
  },
  // ——— Epic ———
  {
    id: 'pineapple', name: 'Explosive Pineapple', icon: '🍍', rarity: 'epic', max: 3,
    desc: () => 'Smacked-down feet explode for 30 area damage',
    apply: (s) => { s.explodeDmg += 30; },
  },
  {
    id: 'trap', name: 'Mousetraps', icon: '🪤', rarity: 'epic', max: 2,
    desc: () => 'Each wave, a trap under every pizza snaps the first stomper (100 dmg + stun)',
    apply: (s) => { s.traps += 1; },
  },
  {
    id: 'brutal', name: 'Brutal Crits', icon: '💥', rarity: 'epic', max: 3,
    desc: () => '+100% critical damage',
    apply: (s) => { s.critMult += 1; },
  },
  {
    id: 'hotoven', name: 'Hot Plates', icon: '♨️', rarity: 'epic', max: 2,
    desc: () => 'Feet that stomp a pizza burn for 15 dmg/s',
    apply: (s) => { s.stompBurn += 15; },
  },
  {
    id: 'lucky', name: 'Lucky Pepperoni', icon: '🍀', rarity: 'epic', max: 3,
    desc: () => 'Better upgrade rarities, more Golden Feet',
    apply: (s) => { s.luck += 1; },
  },
  {
    id: 'reroll', name: 'Second Opinion', icon: '🎲', rarity: 'epic', max: 2,
    desc: () => '+1 free reroll on every upgrade screen',
    apply: (s) => { s.freeRerolls += 1; },
  },
  // ——— Legendary ———
  {
    id: 'helping', name: 'Second Helping', icon: '🍕', rarity: 'legendary', max: 1, kind: 'unique',
    desc: () => 'A brand-new pizza joins the table',
    apply: () => {},
    onPick: 'extraPizza',
  },
  {
    id: 'angel', name: 'Pizza Angel', icon: '👼', rarity: 'legendary', max: 1, kind: 'consumable',
    desc: () => 'The next pizza destroyed rises again with 4 slices',
    apply: () => {},
    onPick: 'arm',
  },
  {
    id: 'freeze', name: 'Freeze Frame', icon: '⏳', rarity: 'legendary', max: 1,
    desc: () => 'Peel Slam also freezes every foot for 3 seconds',
    apply: (s) => { s.freezeSlam = true; },
  },
  {
    id: 'midas', name: 'Golden Touch', icon: '👑', rarity: 'legendary', max: 2,
    desc: () => '8% of smacked-down feet turn to gold: 5x tips',
    apply: (s) => { s.goldenTouch += 0.08; },
  },
  ...MORE_TOPPINGS,
];

export const UPGRADE_BY_ID: Record<string, Upgrade> = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

export const RARITY_WEIGHT: Record<Rarity, number> = { common: 60, rare: 28, epic: 10, legendary: 2.5 };

export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#8fd16a',
  rare: '#4cc9f0',
  epic: '#b06bff',
  legendary: '#ffbf1f',
};

/** Base topping price by rarity; +2 tips per wave. Consumables cost less. */
export const RARITY_PRICE: Record<Rarity, number> = { common: 30, rare: 70, epic: 120, legendary: 235 };

/** Price of the next level: rarity base + 4 per wave, +35% for every level already owned (so stacking
 * one upgrade gets expensive and tips spread across the run); consumables are 30% cheaper. */
export function upgradePrice(u: Upgrade, wave: number, owned = 0): number {
  const base = (RARITY_PRICE[u.rarity] + 4 * wave) * (1 + 0.35 * owned);
  const k = (u.kind ?? 'permanent') === 'consumable' ? 0.7 : 1;
  return Math.round((base * k) / 5) * 5;
}

export function kindOf(u: Upgrade): UpgradeKind {
  return u.kind ?? 'permanent';
}

/** Waves a used consumable stays out of the shop. */
export const CONSUMABLE_COOLDOWN = 3;

export { pct };
