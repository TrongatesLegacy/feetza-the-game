// Run state: owned upgrades, stat aggregation and wave planning over the 12-stage, 60-wave journey.

import type { ArenaId, BackdropId, LocationId } from '../art/backdrops';
import { HEAT_BY_ID, type HeatId } from '../data/difficulty';
import { FEET, type FootType } from '../data/feet';
import type { PizzaPerk } from '../data/pizzas';
import { JOURNEY_WAVES, MINI_WAVE, STAGES, WAVES_PER_STAGE } from '../data/stages';
import { CONSUMABLE_COOLDOWN, RARITY_WEIGHT, UPGRADES, UPGRADE_BY_ID, baseStats, kindOf, type Rarity, type Stats, type Upgrade } from '../data/upgrades';
import { save } from '../systems/save';

export const LOCATIONS: LocationId[] = STAGES.map((s) => s.location);

export const LOCATION_MUSIC: Record<LocationId, string[]> = {
  trattoria: ['music_game'],
  rooftop: ['music_rooftop', 'music_game'],
  beach: ['music_beach', 'music_game'],
  diner: ['music_diner', 'music_game'],
  lodge: ['music_lodge', 'music_menu', 'music_game'],
  space: ['music_space', 'music_rooftop', 'music_game'],
  kitchen: ['music_kitchen', 'music_game'],
  oldtown: ['music_oldtown', 'music_rooftop', 'music_game'],
  pier: ['music_pier', 'music_beach', 'music_game'],
  rink: ['music_rink', 'music_diner', 'music_game'],
  slopes: ['music_slopes', 'music_lodge', 'music_game'],
  cellar: ['music_cellar', 'music_boss_phantomking', 'music_game'],
};

export const LOCATION_AMBIENCE: Record<LocationId, string[]> = {
  trattoria: ['ambience_pizzeria'],
  rooftop: ['ambience_rooftop', 'ambience_pizzeria'],
  beach: ['ambience_beach', 'ambience_pizzeria'],
  diner: ['ambience_diner', 'ambience_pizzeria'],
  lodge: ['ambience_lodge', 'ambience_pizzeria'],
  space: ['ambience_space', 'ambience_pizzeria'],
  kitchen: ['ambience_kitchen', 'ambience_pizzeria'],
  oldtown: ['ambience_oldtown', 'ambience_rooftop', 'ambience_pizzeria'],
  pier: ['ambience_pier', 'ambience_beach', 'ambience_pizzeria'],
  rink: ['ambience_rink', 'ambience_diner', 'ambience_pizzeria'],
  slopes: ['ambience_slopes', 'ambience_lodge', 'ambience_pizzeria'],
  cellar: ['ambience_cellar', 'ambience_pizzeria'],
};

/** How many times the journey has been completed before wave n (0 on the first time through). */
export function loopOf(n: number): number {
  return Math.floor((Math.max(1, n) - 1) / JOURNEY_WAVES);
}

export function stageIndex(n: number): number {
  return Math.floor(((Math.max(1, n) - 1) % JOURNEY_WAVES) / WAVES_PER_STAGE);
}

export function waveInStage(n: number): number {
  return ((Math.max(1, n) - 1) % WAVES_PER_STAGE) + 1;
}

export function isBossWave(n: number): boolean {
  return n % WAVES_PER_STAGE === 0;
}

export function isMiniWave(n: number): boolean {
  return waveInStage(n) === MINI_WAVE;
}

export function locationFor(n: number): LocationId {
  return STAGES[stageIndex(n)].location;
}

export function bossFor(n: number): ArenaId {
  return STAGES[stageIndex(n)].boss;
}

export function miniFor(n: number): string {
  return STAGES[stageIndex(n)].mini;
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
  /** Bosses' own base health already climbs after wave 30, so their multiplier stops at the wave-30 level. */
  bossHpMult: number;
  speedMult: number;
  eliteChance: number;
  boss: string | null;
  mini: string | null;
  golden: boolean;
  loop: number;
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

export function planWave(n: number, luck: number, heatId: HeatId = 'regular'): WavePlan {
  const heat = HEAT_BY_ID[heatId];
  const loop = loopOf(n);
  const inLoop = n - loop * JOURNEY_WAVES;
  const eff = inLoop + loop * 36; // later loops start harder
  const hpMult = (1 + Math.min(inLoop - 1, 29) * 0.1 + Math.max(0, inLoop - 30) * 0.06) * (1 + loop * 0.5) * heat.hp;
  const speedMult = Math.min(1.85, 1 + (Math.min(eff, 40) - 1) * 0.026) * heat.speed;
  const boss = isBossWave(n) ? bossFor(n) : null;
  const mini = isMiniWave(n) ? miniFor(n) : null;
  const home = locationFor(n);
  const pool = FEET.filter((f) => !f.boss && !f.mini && f.weight > 0 && (f.minWave <= inLoop || loop > 0));
  // freshly unlocked feet get the spotlight; feet at home in this location turn up 3x as often
  const weight = (f: FootType) => f.weight * (f.minWave >= inLoop - 1 && loop === 0 ? 3 : 1) * (f.home === home ? 3 : 1);
  let count = Math.round((6 + Math.min(eff, 40) * 2.1 + loop * 4) * heat.count);
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
    interval: Math.max(0.32, 1.85 - Math.min(eff, 40) * 0.055),
    maxAlive: boss ? Math.min(2 + Math.floor(inLoop / 8), 6) : Math.min(3 + Math.floor(Math.min(eff, 40) * 0.6), 12),
    hpMult,
    bossHpMult: (1 + Math.min(inLoop - 1, 29) * 0.1) * (1 + loop * 0.5) * heat.hp * 0.75,
    speedMult,
    eliteChance: n >= 6 ? Math.min(0.3, (n - 5) * 0.012) : 0,
    boss,
    mini,
    golden: n >= 3 && Math.random() < 0.28 + luck * 0.08,
    loop,
  };
}

export class Run {
  heat: HeatId = 'regular';
  act2Start = false;
  wave = 0;
  score = 0;
  coins = 0;
  combo = 0;
  bestCombo = 0;
  comboTimer = 0;
  feetSmacked = 0;
  bossesBeaten: string[] = [];
  /** First-ever boss kills this run (100 crusts each). */
  firstKills = 0;
  owned: Record<string, number> = {};
  /** Consumable id → first wave it may be offered again. */
  cooldowns: Record<string, number> = {};
  /** Consumables bought and waiting to trigger. */
  armed: string[] = [];
  super = 0;
  rerollCost = 10;
  reheatUses = 0;
  stats: Stats = baseStats();
  perkCounts: Partial<Record<PizzaPerk, number>> = {};
  slicesLost = 0;
  pizzasBought = 0;
  /** Golden Crusts from wave events (capped per run). */
  eventCrusts = 0;
  /** Golden menu uses this run, by item id. */
  goldenUsed: Record<string, number> = {};
  secondChances = 0;
  rentedSpecial: string | null = null;
  newUnlocks: string[] = [];
  startTime = performance.now();

  get heatDef() {
    return HEAT_BY_ID[this.heat];
  }

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
    // live pizza perks (Napoletana makes every other perk 5% stronger)
    const counts: Partial<Record<PizzaPerk, number>> = {};
    for (const p of alivePerks) counts[p] = (counts[p] ?? 0) + 1;
    this.perkCounts = counts;
    const boost = 1 + 0.05 * (counts.perkBoost ?? 0);
    const c = (p: PizzaPerk) => (counts[p] ?? 0) * boost;
    s.damage *= 1 + 0.1 * c('damage');
    s.coinMult += 0.2 * c('coins') + 0.15 * c('luck');
    s.stunChance += 0.08 * c('stun');
    s.explodeDmg += 15 * c('explode');
    s.critChance += 0.06 * c('crit');
    s.superGain += 0.35 * c('super');
    s.scoreMult += 0.25 * c('score');
    s.luck += c('luck');
    s.freeRerolls += Math.round(c('reroll'));
    s.healWeakest += Math.round(c('healWeakest'));
    s.knockback *= 1 + 0.35 * c('knockback');
    s.burnDps += 4 * c('burnHits');
    s.comboBonus += 0.6 * c('combo');
    s.slowPct += 0.2 * c('slowHits');
    s.doubleChance += 0.1 * c('double');
    s.regenAll += Math.round(c('regenAll'));
    s.execute += 0.12 * c('execute');
    s.radius *= 1 + 0.2 * c('radius');
    s.superStart += 0.4 * c('superStart');
    s.coinsPerWave += 8 * c('coinsWave');
    s.critMult += 0.6 * c('critDmg');
    // Feetza 2.0 perks
    s.splashDmg += 4 * c('splash');
    s.bigHurt += 0.15 * c('bigHurt');
    s.bossDmg += 0.2 * c('bossDmg');
    s.tenthCrit = s.tenthCrit || c('tenthCrit') > 0;
    s.cutters += Math.round(c('cutter'));
    s.quickTips += Math.round(c('quickTips'));
    s.counterDiscount = Math.min(0.5, s.counterDiscount + 0.15 * c('counterDiscount'));
    s.extraConsumable += Math.round(c('extraConsumable'));
    s.crustBonus += 0.15 * c('crustBonus');
    s.slamStun = s.slamStun || c('slamStun') > 0;
    s.miniWeak = Math.min(0.5, s.miniWeak + 0.2 * c('miniWeak'));
    s.stunVuln += 0.5 * c('stunVuln');
    s.freeTopping = s.freeTopping || c('freeTopping') > 0;
    s.slowPct = Math.min(0.7, s.slowPct);
    s.critChance = Math.min(0.85, s.critChance);
    s.execute = Math.min(0.4, s.execute);
    this.stats = s;
  }

  /** Can this upgrade be offered right now? */
  offerable(u: Upgrade, wave: number): boolean {
    const k = kindOf(u);
    if (k === 'unique') return this.level(u.id) === 0;
    if (k === 'consumable') return !this.armed.includes(u.id) && (this.cooldowns[u.id] ?? 0) <= wave;
    return this.level(u.id) < u.max;
  }

  /** A consumable was used up: keep it out of the shop for a few waves. */
  consume(id: string): void {
    this.armed = this.armed.filter((x) => x !== id);
    this.cooldowns[id] = this.wave + CONSUMABLE_COOLDOWN + 1;
  }

  /** Roll shop choices. */
  rollChoices(n: number, exclude: string[] = []): Upgrade[] {
    const luck = this.stats.luck;
    const weights: Record<Rarity, number> = {
      common: RARITY_WEIGHT.common / (1 + luck * 0.25),
      rare: RARITY_WEIGHT.rare * (1 + luck * 0.15),
      epic: RARITY_WEIGHT.epic * (1 + luck * 0.35),
      legendary: RARITY_WEIGHT.legendary * (1 + luck * 0.6),
    };
    const avail = UPGRADES.filter((u) => this.offerable(u, this.wave) && !exclude.includes(u.id));
    const picks: Upgrade[] = [];
    let guard = 0;
    while (picks.length < n && guard++ < 200) {
      const remaining = avail.filter((u) => !picks.includes(u));
      if (!remaining.length) break;
      picks.push(weightedPick(remaining, (u) => weights[u.rarity]));
    }
    // Mac & Cheese: one extra consumable card
    for (let i = 0; i < this.stats.extraConsumable; i++) {
      const cons = avail.filter((u) => kindOf(u) === 'consumable' && !picks.includes(u));
      if (cons.length) picks.push(weightedPick(cons, () => 1));
    }
    return picks;
  }

  /** Boss loot guarantees epic-or-better. */
  rollBossChoices(n: number, exclude: string[] = []): Upgrade[] {
    const avail = UPGRADES.filter((u) => this.offerable(u, this.wave) && !exclude.includes(u.id) && (u.rarity === 'epic' || u.rarity === 'legendary'));
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

  /** Golden Crusts this run would pay out now (see the plan's crust table). */
  crustsEarned(figOnTable = false): number {
    const waves = Math.max(0, this.wave - 1 - (this.act2Start ? 30 : 0));
    const base = Math.floor(this.score / 500) + waves * 2 + this.bossesBeaten.length * 5 + this.firstKills * 100;
    const mult = this.heatDef.crusts * (figOnTable ? 1 + this.stats.crustBonus : 1);
    return Math.floor(base * mult) + this.eventCrusts;
  }
}
