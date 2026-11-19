// Run state: owned upgrades, stat aggregation and wave planning.

import type { ArenaId, BackdropId, LocationId } from '../art/backdrops';
import { BOSS_ORDER, FEET, type FootType } from '../data/feet';
import type { PizzaPerk } from '../data/pizzas';
import { RARITY_WEIGHT, UPGRADES, UPGRADE_BY_ID, baseStats, type Rarity, type Stats, type Upgrade } from '../data/upgrades';
import { save } from '../systems/save';

export const LOCATIONS: LocationId[] = ['trattoria', 'rooftop', 'beach', 'diner', 'lodge', 'space'];

export const LOCATION_MUSIC: Record<LocationId, string[]> = {
  trattoria: ['music_game'],
  rooftop: ['music_rooftop', 'music_game'],
  beach: ['music_beach', 'music_game'],
  diner: ['music_diner', 'music_game'],
  lodge: ['music_lodge', 'music_menu', 'music_game'],
  space: ['music_space', 'music_rooftop', 'music_game'],
};

export const LOCATION_AMBIENCE: Record<LocationId, string[]> = {
  trattoria: ['ambience_pizzeria'],
  rooftop: ['ambience_rooftop', 'ambience_pizzeria'],
  beach: ['ambience_beach', 'ambience_pizzeria'],
  diner: ['ambience_diner', 'ambience_pizzeria'],
  lodge: ['ambience_lodge', 'ambience_pizzeria'],
  space: ['ambience_space', 'ambience_pizzeria'],
};

export function isBossWave(n: number): boolean {
  return n % 5 === 0;
}

export function locationFor(n: number): LocationId {
  const idx = Math.floor((Math.max(1, n) - 1) / 5) % LOCATIONS.length;
  return LOCATIONS[idx];
}

export function bossFor(n: number): ArenaId {
  return BOSS_ORDER[(n / 5 - 1) % BOSS_ORDER.length] as ArenaId;
}

export function backdropFor(n: number): BackdropId {
  return isBossWave(n) ? bossFor(n) : locationFor(n);
}

export function bossMusic(id: ArenaId): string[] {
  return [`music_boss_${id}`, 'music_boss'];
}

export interface WavePlan {
  n: number;
  queue: string[]; // foot ids to spawn in order
  interval: number;
  maxAlive: number;
  hpMult: number;
  speedMult: number;
  eliteChance: number;
  boss: string | null;
  golden: boolean;
}

function weightedPick<T>(items: T[], weight: (t: T) => number): T {
  const total = items.reduce((a, t) => a + weight(t), 0);
  let r = Math.random() * total;
  for (const t of items) {
    r -= weight(t);
    if (r <= 0) return t;
  }
  return items[items.length - 1];
}

export function planWave(n: number, luck: number): WavePlan {
  const loop = Math.floor((n - 1) / 30);
  const eff = n - loop * 30 + loop * 18; // later loops start harder
  const hpMult = (1 + (n - 1) * 0.1) * (1 + loop * 0.5);
  const speedMult = Math.min(1.85, 1 + (eff - 1) * 0.034);
  const boss = isBossWave(n) ? bossFor(n) : null;
  const pool = FEET.filter((f) => !f.boss && f.weight > 0 && (f.minWave <= n || loop > 0));
  // freshly unlocked feet get the spotlight
  const weight = (f: FootType) => f.weight * (f.minWave >= n - 1 && loop === 0 ? 3 : 1);
  let count = Math.round(6 + eff * 2.1 + loop * 4);
  if (boss) count = Math.round(count * 0.35);
  const queue: string[] = [];
  while (queue.length < count) {
    const f = weightedPick(pool, weight);
    if (f.traits.includes('swarm')) queue.push(f.id, f.id, f.id);
    else queue.push(f.id);
  }
  return {
    n,
    queue,
    interval: Math.max(0.32, 1.85 - eff * 0.07),
    maxAlive: boss ? Math.min(2 + Math.floor(n / 8), 6) : Math.min(3 + Math.floor(eff * 0.6), 12),
    hpMult,
    speedMult,
    eliteChance: n >= 6 ? Math.min(0.3, (n - 5) * 0.018) : 0,
    boss,
    golden: n >= 3 && Math.random() < 0.28 + luck * 0.08,
  };
}

export class Run {
  wave = 0;
  score = 0;
  coins = 0;
  combo = 0;
  bestCombo = 0;
  comboTimer = 0;
  feetSmacked = 0;
  bossesBeaten: string[] = [];
  owned: Record<string, number> = {};
  super = 0;
  rerollCost = 10;
  stats: Stats = baseStats();
  perkCounts: Partial<Record<PizzaPerk, number>> = {};
  angelUsed = false;
  slicesLost = 0;
  pizzasBought = 0;
  newUnlocks: string[] = [];
  startTime = performance.now();

  level(id: string): number {
    return this.owned[id] ?? 0;
  }

  meta(id: string): number {
    return save.meta[id] ?? 0;
  }

  recompute(alivePerks: PizzaPerk[]): void {
    const s = baseStats();
    // meta progression
    s.damage *= 1 + 0.08 * this.meta('wrists');
    s.coinMult += 0.1 * this.meta('tips');
    s.luck += this.meta('apron');
    s.freeRerolls += this.meta('opinion');
    // upgrades
    for (const [id, lvl] of Object.entries(this.owned)) {
      const u = UPGRADE_BY_ID[id];
      if (!u) continue;
      for (let l = 1; l <= lvl; l++) u.apply(s, l);
    }
    // live pizza perks
    const counts: Partial<Record<PizzaPerk, number>> = {};
    for (const p of alivePerks) counts[p] = (counts[p] ?? 0) + 1;
    this.perkCounts = counts;
    const c = (p: PizzaPerk) => counts[p] ?? 0;
    s.damage *= 1 + 0.1 * c('damage');
    s.coinMult += 0.2 * c('coins') + 0.15 * c('luck');
    s.stunChance += 0.08 * c('stun');
    s.explodeDmg += 15 * c('explode');
    s.critChance += 0.06 * c('crit');
    s.superGain += 0.35 * c('super');
    s.scoreMult += 0.25 * c('score');
    s.luck += c('luck');
    s.freeRerolls += c('reroll');
    s.healWeakest += c('healWeakest');
    s.knockback *= 1 + 0.35 * c('knockback');
    s.burnDps += 4 * c('burnHits');
    s.comboBonus += 0.6 * c('combo');
    s.slowPct += 0.2 * c('slowHits');
    s.doubleChance += 0.1 * c('double');
    s.regenAll += c('regenAll');
    s.execute += 0.12 * c('execute');
    s.radius *= 1 + 0.2 * c('radius');
    s.superStart += 0.4 * c('superStart');
    s.coinsPerWave += 8 * c('coinsWave');
    s.critMult += 0.6 * c('critDmg');
    s.slowPct = Math.min(0.7, s.slowPct);
    s.critChance = Math.min(0.85, s.critChance);
    s.execute = Math.min(0.4, s.execute);
    this.stats = s;
  }

  /** Roll upgrade choices. */
  rollChoices(n: number, exclude: string[] = []): Upgrade[] {
    const luck = this.stats.luck;
    const weights: Record<Rarity, number> = {
      common: RARITY_WEIGHT.common / (1 + luck * 0.25),
      rare: RARITY_WEIGHT.rare * (1 + luck * 0.15),
      epic: RARITY_WEIGHT.epic * (1 + luck * 0.35),
      legendary: RARITY_WEIGHT.legendary * (1 + luck * 0.6),
    };
    const avail = UPGRADES.filter((u) => this.level(u.id) < u.max && !exclude.includes(u.id));
    const picks: Upgrade[] = [];
    let guard = 0;
    while (picks.length < n && guard++ < 200) {
      const remaining = avail.filter((u) => !picks.includes(u));
      if (!remaining.length) break;
      picks.push(weightedPick(remaining, (u) => weights[u.rarity]));
    }
    return picks;
  }

  /** Boss chests guarantee epic-or-better. */
  rollBossChoices(n: number, exclude: string[] = []): Upgrade[] {
    const avail = UPGRADES.filter((u) => this.level(u.id) < u.max && !exclude.includes(u.id) && (u.rarity === 'epic' || u.rarity === 'legendary'));
    const picks: Upgrade[] = [];
    while (picks.length < n && avail.length) {
      const u = weightedPick(avail, (x) => (x.rarity === 'legendary' ? 1 : 2.5));
      picks.push(u);
      avail.splice(avail.indexOf(u), 1);
    }
    return picks.length ? picks : this.rollChoices(n, exclude);
  }

  comboMult(): number {
    return 1 + Math.min(4, Math.floor(this.combo / 5) * 0.25);
  }

  crustsEarned(): number {
    return Math.floor(this.score / 250) + Math.max(0, this.wave - 1) * 4 + this.bossesBeaten.length * 30;
  }
}
