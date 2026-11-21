// Run state: owned upgrades, stat aggregation and wave planning over the journey (STAGES, 10-wave acts).

import type { ArenaId, BackdropId, LocationId } from '../art/backdrops';
import { DEEP_FROM, DEEP_SPAN, HEAT_BY_ID, type HeatId } from '../data/difficulty';
import { FEET, type FootType } from '../data/feet';
import { PIZZA_BY_ID, type PizzaPerk, type PizzaType } from '../data/pizzas';
import { MILESTONES, type Milestone } from '../data/meta';
import { JOURNEY_WAVES, MINI_WAVE, STAGES, WAVES_PER_STAGE } from '../data/stages';
import { CONSUMABLE_COOLDOWN, RARITY_WEIGHT, UPGRADES, UPGRADE_BY_ID, baseStats, kindOf, type OfferEnv, type Rarity, type Stats, type Upgrade } from '../data/upgrades';
import { freshKitState, type KitState } from './kitState';
import { applyNemesis, homeOf } from './nemesis';
import { save, unlockPizza } from '../systems/save';

/** Golden Crusts for the first time you ever beat a main boss (on top of the usual 5). */
export const FIRST_KILL_CRUSTS = 20;

/** The most tip boosts can add up to (see recompute). */
export const TIP_MULT_CAP = 2.5;

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
  // ——— Act 7 · Comics ———
  metropizza: ['music_metropizza', 'music_rooftop', 'music_game'],
  doomlab: ['music_doomlab', 'music_space', 'music_game'],
  // ——— Act 8 · Norse ———
  jotunheim: ['music_jotunheim', 'music_slopes', 'music_game'],
  bifrost: ['music_bifrost', 'music_jotunheim', 'music_game'],
  // ——— Act 9 · Greek myths ———
  labyrinth: ['music_labyrinth', 'music_game'],
  tartarus: ['music_tartarus', 'music_cellar', 'music_game'],
  // ——— Act 10 · Finale ———
  oven: ['music_oven', 'music_space', 'music_game'],
  firstpizzeria: ['music_firstpizzeria', 'music_game'],
  // ——— Nemesis stages (src/game/nemesis.ts) ———
  gotham: ['music_gotham', 'music_metropizza', 'music_game'],
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
  // ——— Act 7 · Comics ———
  metropizza: ['ambience_metropizza', 'ambience_rooftop', 'ambience_pizzeria'],
  doomlab: ['ambience_doomlab', 'ambience_space', 'ambience_pizzeria'],
  // ——— Act 8 · Norse ———
  jotunheim: ['ambience_jotunheim', 'ambience_slopes', 'ambience_pizzeria'],
  bifrost: ['ambience_bifrost', 'ambience_jotunheim', 'ambience_pizzeria'],
  // ——— Act 9 · Greek myths ———
  labyrinth: ['ambience_labyrinth', 'ambience_pizzeria'],
  tartarus: ['ambience_tartarus', 'ambience_cellar', 'ambience_pizzeria'],
  // ——— Act 10 · Finale ———
  oven: ['ambience_oven', 'ambience_space', 'ambience_pizzeria'],
  firstpizzeria: ['ambience_firstpizzeria', 'ambience_pizzeria'],
  // ——— Nemesis stages (src/game/nemesis.ts) ———
  gotham: ['ambience_gotham', 'ambience_metropizza', 'ambience_pizzeria'],
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
  return stageFor(n).location;
}

export function bossFor(n: number): ArenaId {
  return stageFor(n).boss;
}

export function miniFor(n: number): string {
  return stageFor(n).mini;
}

// ——— Act 10 · Finale: Endless+ ———

/** Endless+ (unlocked by beating wave 100): past the journey's end every stage's place, mini-boss and
 * boss are dealt from shuffled decks, a new deal each loop. The scene sets it for the run (seed: the deal). */
export const endlessPlus = { on: false, seed: 1 };

/** The finale's own bosses stay in the finale (the buyout and the ending belong to waves 95 and 100). */
const UNSHUFFLED_BOSSES = new Set(['soleprop', 'soleunbound']);

function deck<T>(items: T[], seed: number): T[] {
  const out = [...items];
  let a = seed >>> 0 || 1;
  const rnd = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Wave n's stage: the journey's own, or on an Endless+ loop a shuffled place, mini-boss and boss. */
function stageFor(n: number): { location: LocationId; boss: ArenaId; mini: string } {
  // a hero's nemesis stage swaps in its own place and bosses (src/game/nemesis.ts)
  return applyNemesis(dealtStage(n));
}

function dealtStage(n: number): { location: LocationId; boss: ArenaId; mini: string } {
  const st = STAGES[stageIndex(n)];
  const loop = loopOf(n);
  if (!endlessPlus.on || loop === 0) return st;
  const real = STAGES.filter((x) => !x.dev);
  const i = stageIndex(n);
  const s0 = endlessPlus.seed * 7919 + loop * 104729;
  const places = deck(real.map((x) => x.location), s0 + 1);
  const minis = deck(real.map((x) => x.mini), s0 + 2);
  const bosses = deck(real.map((x) => x.boss).filter((b) => !UNSHUFFLED_BOSSES.has(b)), s0 + 3);
  return { location: places[i % places.length], mini: minis[i % minis.length], boss: bosses[i % bosses.length] };
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
  const crowd = heat.crowd;
  // acts 7–10 (waves 61–100 the first time through): health and the crowd caps keep climbing, gently
  const deep = Math.min(DEEP_SPAN, Math.max(0, inLoop - DEEP_FROM));
  const deepUp = 1 + (deep / DEEP_SPAN) * crowd.deepGrowth;
  const hpMult = (1 + Math.min(inLoop - 1, 29) * 0.1 + (Math.min(inLoop, DEEP_FROM) - Math.min(inLoop, 30)) * 0.06 + deep * crowd.deepHp) * (1 + loop * 0.5) * heat.hp;
  const speedMult = Math.min(heat.crowd.speedCap, 1 + (Math.min(eff, 40) - 1) * 0.026) * heat.speed;
  const boss = isBossWave(n) ? bossFor(n) : null;
  const mini = isMiniWave(n) ? miniFor(n) : null;
  // a nemesis place still brings the regular feet of the place it stands in for
  const home = homeOf(locationFor(n));
  const pool = FEET.filter((f) => !f.boss && !f.mini && f.weight > 0 && (f.minWave <= inLoop || loop > 0));
  // freshly unlocked feet get the spotlight; feet at home in this location turn up 3x as often
  const weight = (f: FootType) => f.weight * (f.minWave >= inLoop - 1 && loop === 0 ? 3 : 1) * (f.home === home ? 3 : 1);
  const loopUp = 1 + loop * 0.5;
  let count = Math.min(Math.round(crowd.countCap * loopUp * deepUp), Math.round((6 + Math.min(eff, 40) * crowd.perWave + deep * crowd.perWave * 0.25 + loop * 4) * heat.count));
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
    interval: Math.max(crowd.intervalFloor, 1.85 - Math.min(eff, 40) * 0.055),
    maxAlive: boss ? Math.min(2 + Math.floor(inLoop / 8), Math.min(6, crowd.aliveCap)) : Math.min(3 + Math.floor(Math.min(eff, 40) * 0.6) + Math.floor(deep / 10), Math.round(crowd.aliveCap * loopUp * deepUp)),
    hpMult,
    bossHpMult: (1 + Math.min(inLoop - 1, 29) * 0.1) * (1 + loop * 0.5) * heat.hp * 0.75,
    speedMult,
    eliteChance: n >= 6 ? Math.min(crowd.eliteCap, (n - 5) * 0.012) : 0,
    boss,
    mini,
    golden: n >= 3 && Math.random() < 0.28 + luck * 0.08,
    loop,
  };
}

export interface ActMark {
  wave: number;
  elapsed: number;
  feet: number;
  slices: number;
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
  /** First-ever boss kills this run (20 crusts each). */
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
  /** Crusts already paid into the bank this run (bosses, first kills, events): they're never lost. */
  bankedCrusts = 0;
  /** Golden menu uses this run, by item id. */
  goldenUsed: Record<string, number> = {};
  secondChances = 0;
  newUnlocks: string[] = [];
  /** Why each pizza in newUnlocks was unlocked (for the end-of-run summary). */
  unlockWhy: Record<string, string> = {};
  /** Milestones reached this run. */
  milestonesHit: string[] = [];
  /** Enhance a Pizza uses this run (its crust price doubles each time). */
  enhanceUses = 0;
  /** Toppings bought this run (each counts once towards its run count in the Toppings tab). */
  bought: string[] = [];
  /** Peels owned when the run began, and each locked goal's progress then (end-of-run summary). */
  startPeels: string[] | null = null;
  goalStart: Record<string, number> = {};
  /** Perks of the enhanced pizzas on the table (set by recompute). */
  enhancedPerks = new Set<PizzaPerk>();
  /** Run time in seconds: counts waves and the shop, stops in the pause menu, while the tab is hidden and while away from the run. */
  elapsed = 0;
  /** Endless: the run carries on past the journey's end (JOURNEY_WAVES) instead of ending there. */
  endless = false;
  /** Where the current act began: its first wave and the run's clock, feet and slices lost then (for ACT COMPLETE). */
  actFrom: ActMark | null = null;
  /** Run state for the event, mixed, shop and wildcard toppings (saved with the run). */
  kit: KitState = freshKitState();
  /** Set by the scene: what toppings with an offerIf need to know. */
  env: OfferEnv = { otherPeels: 0, throws: false };

  get heatDef() {
    return HEAT_BY_ID[this.heat];
  }

  level(id: string): number {
    return this.owned[id] ?? 0;
  }

  meta(id: string): number {
    return save.meta[id] ?? 0;
  }

  /** extra: always-on peel ability stat changes, added before the caps. enhanced: the perks of
   * enhanced pizzas among alivePerks, each worth 1.5 of a plain one. */
  recompute(alivePerks: PizzaPerk[], extra: Partial<Record<keyof Stats, number>> = {}, enhanced: PizzaPerk[] = []): void {
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
    for (const p of enhanced) counts[p] = (counts[p] ?? 0) + 0.5;
    this.perkCounts = counts;
    this.enhancedPerks = new Set(enhanced);
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
    for (const [k, v] of Object.entries(extra)) {
      const key = k as keyof Stats;
      if (typeof s[key] === 'number') (s as unknown as Record<string, number>)[key] += v as number;
    }
    // trade-off toppings can stack their downsides: keep everything playable
    s.superGain = Math.max(0.2, s.superGain);
    s.coinMult = Math.max(0.3, s.coinMult);
    s.radius = Math.max(14, s.radius);
    s.freshBonus = Math.max(-4, s.freshBonus);
    s.critChance = Math.max(0, s.critChance);
    s.stompExtra = Math.min(0.6, s.stompExtra);
    s.speedMult = Math.min(1.6, s.speedMult);
    // golden feet stack fast across toppings, peels and perks: at most 30% of feet turn to gold
    s.goldenTouch = Math.min(0.3, s.goldenTouch);
    s.slowPct = Math.min(0.7, s.slowPct);
    s.critChance = Math.min(0.85, s.critChance);
    s.execute = Math.min(0.4, s.execute);
    // tip boosts: full value up to ×2, half value beyond, never above ×2.5 (late runs piled up 100k+ tips)
    if (s.coinMult > 2) s.coinMult = Math.min(TIP_MULT_CAP, 2 + (s.coinMult - 2) * 0.5);
    this.stats = s;
  }

  /** Can this upgrade be offered right now? */
  /** Set by the scene when a peel ability replaces the Peel Slam: slam-only toppings aren't offered. */
  slamless: { slam: boolean; meter: boolean; tank?: boolean } = { slam: false, meter: false };

  /** A topping's level cap this run (Infinite Oven lifts every one that levels up). */
  maxLevel(u: Upgrade): number {
    return u.max > 1 && kindOf(u) === 'permanent' ? u.max + this.stats.capBonus : u.max;
  }

  offerable(u: Upgrade, wave: number): boolean {
    // rarer toppings arrive as the run builds up (shop cards, rerolls, boss loot, events, Golden Menu)
    if (!rarityOpen(u.rarity, wave)) return false;
    if (this.slamless.slam && u.id === 'freeze') return false;
    if (this.slamless.meter && (u.id === 'oregano' || u.id === 'dried' || u.id === 'overtime' || u.needsMeter)) return false;
    if (u.needsMeter === 'tank' && this.slamless.tank) return false;
    if (u.needsEvents && (this.stats.noEvents || (this.stats.eventMult <= 0 && !this.stats.eventAlways))) return false;
    if (u.offerIf && !u.offerIf(this.env)) return false;
    const k = kindOf(u);
    if (k === 'unique') return this.level(u.id) === 0;
    if (k === 'consumable') return !this.armed.includes(u.id) && (this.cooldowns[u.id] ?? 0) <= wave;
    return this.level(u.id) < this.maxLevel(u);
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
    // Mac & Cheese: one extra consumable card (not past Exclusive Menu's 2-card cap)
    for (let i = 0; i < (this.level('exclusivemenu') ? 0 : this.stats.extraConsumable); i++) {
      const cons = avail.filter((u) => kindOf(u) === 'consumable' && !picks.includes(u));
      if (cons.length) picks.push(weightedPick(cons, () => 1));
    }
    return this.bumpRarity(picks, exclude);
  }

  /** Exclusive Menu: every card is dealt one rarity higher (when that rarity is open and has one to offer). */
  private bumpRarity(picks: Upgrade[], exclude: string[]): Upgrade[] {
    if (!this.level('exclusivemenu')) return picks;
    const up: Record<Rarity, Rarity> = { common: 'rare', rare: 'epic', epic: 'legendary', legendary: 'legendary' };
    const out: Upgrade[] = [];
    for (const u of picks) {
      const r = up[u.rarity];
      const pool = r === u.rarity ? [] : UPGRADES.filter((x) => x.rarity === r && this.offerable(x, this.wave) && !exclude.includes(x.id) && !out.includes(x) && !picks.includes(x));
      out.push(pool.length ? pool[Math.floor(Math.random() * pool.length)] : u);
    }
    return out;
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
    return picks.length ? this.bumpRarity(picks, exclude) : this.rollChoices(n, exclude);
  }

  comboMult(): number {
    return 1 + Math.min(4, Math.floor(this.combo / 5) * 0.25);
  }

  /** Every Golden Crust this run has earned: banked ones plus what the end of the run will pay. */
  crustsEarned(figOnTable = false): number {
    return this.endCrusts(figOnTable) + this.bankedCrusts;
  }

  /** The part paid when the run ends: score and waves cleared. */
  endCrusts(figOnTable = false): number {
    // Vow of Focus adds its share on top
    return endCrustsFor(this.score, this.wave, this.act2Start, this.heat, (figOnTable ? this.stats.crustBonus : 0) + this.stats.endCrustMult);
  }

  /** Crusts for a boss kill, scaled by heat (and Fig & Gorgonzola). */
  bossCrusts(firstKill: boolean, figOnTable = false): number {
    const mult = this.heatDef.crusts * (figOnTable ? 1 + this.stats.crustBonus : 1);
    return Math.round((5 + (firstKill ? FIRST_KILL_CRUSTS : 0)) * mult);
  }

  /** Unlock a pizza for good, noting why for the end-of-run summary. */
  unlock(id: string, why: string): boolean {
    if (!unlockPizza(id)) return false;
    if (!this.newUnlocks.includes(id)) this.newUnlocks.push(id);
    this.unlockWhy[id] = why;
    return true;
  }

  /** Enhance a Pizza's crust price: 30, then doubling each use this run. */
  enhanceCost(): number {
    return 30 * 2 ** this.enhanceUses;
  }

  /** Pay crusts into the bank straight away. */
  bank(n: number): void {
    if (n <= 0) return;
    save.crusts += n;
    this.bankedCrusts += n;
  }
}

/** End-of-run crusts: score on a square-root curve (late combos push scores into the millions, and a
 * linear rate once paid ~19,000 crusts for one Regular journey) plus 2 per wave cleared, times heat.
 * Bosses, first kills and events are banked as they happen, not here. */
export function endCrustsFor(score: number, wave: number, act2Start: boolean, heat: HeatId, figBonus = 0): number {
  const waves = Math.max(0, wave - 1 - (act2Start ? 30 : 0));
  const base = Math.floor(Math.sqrt(Math.max(0, score)) / 8) + waves * 2;
  return Math.floor(base * HEAT_BY_ID[heat].crusts * (1 + figBonus));
}

/** First shop (wave cleared) each rarity can be dealt in: epics from the wave 5 boss shop,
 * legendaries from wave 10. */
export const RARITY_FROM: Record<Rarity, number> = { common: 0, rare: 0, epic: 5, legendary: 10 };

export function rarityOpen(r: Rarity, wave: number): boolean {
  return wave >= RARITY_FROM[r];
}

/** The rarest rarity open at this wave (Golden Reroll guarantees one). */
export function bestRarity(wave: number): Rarity {
  return rarityOpen('legendary', wave) ? 'legendary' : rarityOpen('epic', wave) ? 'epic' : 'rare';
}

/** A pizza's tier, by its crust price: 1 simple, 2 mid, 3 fancy. */
export function pizzaTier(p: PizzaType): number {
  return p.cost < 150 ? 1 : p.cost < 400 ? 2 : 3;
}

/** A Chef's Special's coin price: about twice a normal counter pizza, plus a bonus for fancier ones
 * that grows with the wave. */
export function specialPrice(normal: number, p: PizzaType, wave: number): number {
  return Math.round((normal * 2 + pizzaTier(p) * (15 + 2 * wave)) / 5) * 5;
}

/** A milestone's progress towards its goal: [have, need]. */
export function milestoneProgress(id: string): [number, number] {
  const nb = save.bossesBeaten.length;
  const wave = save.bestWave;
  const g = save.pizzaGoals ?? {};
  const act1 = (h: HeatId): [number, number] => (save.act1Cleared.includes(h) ? [30, 30] : [Math.min(29, save.best[h]?.wave ?? 0), 30]);
  switch (id) {
    case 'firstWave3': return [Math.min(3, wave), 3];
    case 'firstBoss': return [Math.min(1, nb), 1];
    case 'feet150': return [Math.min(150, save.totalFeet), 150];
    case 'wave10': return [Math.min(10, wave), 10];
    case 'bosses3': return [Math.min(3, nb), 3];
    case 'feet600': return [Math.min(600, save.totalFeet), 600];
    case 'wave20': return [Math.min(20, wave), 20];
    case 'bosses6': return [Math.min(6, nb), 6];
    case 'act1': return save.act1Cleared.length ? [30, 30] : [Math.min(29, wave), 30];
    case 'bosses12': return [Math.min(12, nb), 12];
    case 'feet1500': return [Math.min(1500, save.totalFeet), 1500];
    case 'wave45': return [Math.min(45, wave), 45];
    case 'bosses18': return [Math.min(18, nb), 18];
    case 'journey': return [Math.min(JOURNEY_WAVES, wave), JOURNEY_WAVES];
    case 'allBosses': return [Math.min(24, nb), 24];
    case 'hot30': return act1('hot');
    case 'extrahot30': return act1('extrahot');
    case 'inferno30': return act1('inferno');
    // phase 3 milestone prizes
    case 'act1Lap': return save.act1Cleared.length ? [30, 30] : [Math.min(29, wave), 30];
    case 'slayer24': {
      const original = new Set(STAGES.flatMap((s) => [s.boss, s.mini] as string[]));
      return [Math.min(24, save.bossesBeaten.filter((b) => original.has(b)).length), 24];
    }
    case 'wave100': return [Math.min(100, wave), 100];
    case 'feet5000': return [Math.min(5000, save.totalFeet), 5000];
    case 'perfect10': return [Math.min(10, g.perfectBest ?? 0), 10];
    case 'runs25': return [Math.min(25, save.runs), 25];
    case 'peels100': return [Math.min(100, new Set(['classic', ...save.peels]).size), 100];
    case 'combo150': return [Math.min(150, g.bestCombo ?? 0), 150];
    case 'untouched': return [Math.min(1, g.untouched ?? 0), 1];
    case 'fastWave': return [(g.fastWave ?? 99) < 8 ? 1 : 0, 1];
    case 'night10': return [Math.min(10, g.nightRuns ?? 0), 10];
    case 'surtr': return [save.bossesBeaten.includes('surtr') ? 1 : 0, 1];
    case 'hades': return [save.bossesBeaten.includes('hades') ? 1 : 0, 1];
    default: return [0, 1];
  }
}

/**
 * Award milestones reached (and catch up on ones reached before they named a pizza). Returns the
 * newly awarded ones with their pizza, or crusts when the milestone has no pizza.
 */
export function awardMilestones(run: Run | null): { m: Milestone; pizza: PizzaType | null; crusts: number }[] {
  const out: { m: Milestone; pizza: PizzaType | null; crusts: number }[] = [];
  for (const m of MILESTONES) {
    const [have, need] = milestoneProgress(m.id);
    const fresh = have >= need && !save.milestones.includes(m.id);
    const pizza = m.pizza ? PIZZA_BY_ID[m.pizza] ?? null : null;
    const owed = save.milestones.includes(m.id) && pizza && !save.unlockedPizzas.includes(pizza.id);
    if (!fresh && !owed) continue;
    if (fresh) save.milestones.push(m.id);
    if (pizza) {
      if (run) run.unlock(pizza.id, `Milestone: ${m.name}`);
      else unlockPizza(pizza.id);
    } else save.crusts += 50;
    if (fresh) {
      run?.milestonesHit.push(m.id);
      out.push({ m, pizza, crusts: pizza ? 0 : 50 });
    }
  }
  return out;
}
