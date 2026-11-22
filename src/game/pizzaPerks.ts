// Phase 3 pizza perks: the 57 new pizzas' effects, kept out of GameScene. The scene calls a hook at
// each moment that matters (wave start and clear, smack, damage, kill, stomp, a pizza destroyed,
// every frame) and the kit does the rest through the Arena and a few scene callbacks.
//
// Strength: an enhanced pizza's perk counts 1.5 (about +50%), Napoletana adds 5% per copy, and
// Mystery Meat's perk is "big" (counts half as much again). Run.perkCounts already sums the enhanced
// half, so table-wide perks read `c(perk)`; perks tied to one pizza read `pk(p)`.

import Phaser from 'phaser';
import { drawChest, drawGhostRing, drawMeatball, drawMeteor } from '../art/perkProps';
import { PIZZAS, enhancedText, type PizzaPerk } from '../data/pizzas';
import { WAVES_PER_ACT, isActStart } from '../data/stages';
import { save } from '../systems/save';
import { audio } from '../systems/audio';
import type { Arena } from './arena';
import type { Foot } from './Foot';
import type { Pizza } from './Pizza';
import { isBossWave, locationFor, waveInStage, type Run } from './Run';
import type { Stats } from '../data/upgrades';

/** Perks Arcobaleno can't borrow: set up when a pizza is placed, tied to its own type, or another borrower. */
const BORROW_SKIP = new Set<PizzaPerk>([
  'rainbow', 'mystery', 'rotate', 'slices', 'bossRegrow', 'neverStale', 'staleHeal', 'riseOnce', 'refund',
  'bigStart', 'erupt', 'surviveOnce', 'firstBack', 'crustWaves', 'crustBonus', 'crustRun',
]);
/** Arcobaleno's pool: every other pizza's perk. */
export const BORROW_POOL: PizzaPerk[] = [...new Set(PIZZAS.map((p) => p.perk))].filter((k) => !BORROW_SKIP.has(k));
/** Mystery Meat's big perks: strong on any table. */
export const MYSTERY_POOL: PizzaPerk[] = ['damage', 'coins', 'crit', 'critDmg', 'double', 'execute', 'burnHits', 'explode', 'splash', 'radius', 'regenAll', 'meteor', 'timeStop', 'fireLane', 'orbitRing', 'ghostPass'];

/** Stages played at night (Night Shift). */
const NIGHT = new Set(['space', 'oldtown', 'cellar']);

/** The perk a borrowing pizza (Arcobaleno, Mystery Meat) has right now, or null. */
export function borrowedPerk(p: Pizza): PizzaPerk | null {
  if (p.type.perk === 'rainbow') return p.flags.borrow === undefined ? null : BORROW_POOL[Number(p.flags.borrow) % BORROW_POOL.length];
  if (p.type.perk === 'mystery') return p.flags.mystery === undefined ? null : MYSTERY_POOL[Number(p.flags.mystery) % MYSTERY_POOL.length];
  return null;
}

/** A perk's card line, plain or enhanced (from the first pizza that has it). */
export function perkTextOf(perk: PizzaPerk, enhanced: boolean): string {
  if (enhanced) return enhancedText(perk);
  return PIZZAS.find((q) => q.perk === perk)?.perkText ?? perk;
}

/** The line a borrowing pizza shows on the table and its shop card. */
export function borrowLine(p: Pizza, enhanced: boolean): string | null {
  if (p.type.perk === 'mystery' && !p.flags.revealed) return enhanced ? enhancedText('mystery') : p.type.perkText;
  const b = borrowedPerk(p);
  return b ? perkTextOf(b, enhanced || p.type.perk === 'mystery') : null;
}

/** What the scene lends the kit (its private parts, as callbacks). */
export interface PerkHost {
  run(): Run;
  dealDamage(f: Foot, amount: number, source: 'explode' | 'olive' | 'cutter' | 'direct', knock?: number): void;
  giveTips(n: number, x: number, y: number): void;
  healPizza(p: Pizza, n: number): void;
  neighbours(p: Pizza): Pizza[];
  recompute(): void;
  /** One more free reroll in the next shop. */
  addReroll(): void;
  toast(id: string, title: string, body: string): void;
}

interface Chest {
  img: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  open: boolean;
}

export class PizzaPerkKit {
  private a: Arena;
  private h: PerkHost;
  private sc: Phaser.Scene;
  private meteorT = 0;
  private timeStopT = 0;
  /** Tikka Time Machine's freeze, waiting for the wave's first feet to arrive. */
  private timeStopPending = 0;
  private rings: { p: Pizza; img: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Image; i: number }[] = [];
  private ringAngle = 0;
  private ringCd = new WeakMap<Foot, number>();
  private phases = new WeakMap<Foot, number>();
  private lastStomp = new WeakMap<Pizza, number>();
  private chest: Chest | null = null;
  /** Seconds this wave with a foot on the table (Speed Slice's goal), and kills this wave. */
  private footTime = 0;
  private waveKills = 0;
  /** A pizza was destroyed this run (Untouchable's goal). */
  private lost = false;

  constructor(arena: Arena, host: PerkHost) {
    this.a = arena;
    this.h = host;
    this.sc = arena.sc;
    const tex: [string, () => HTMLCanvasElement][] = [
      ['pk_meatball', drawMeatball],
      ['pk_meteor', drawMeteor],
      ['pk_ring', drawGhostRing],
      ['pk_chest', () => drawChest(false)],
      ['pk_chest_open', () => drawChest(true)],
    ];
    for (const [k, draw] of tex) if (!this.sc.textures.exists(k)) this.sc.textures.addCanvas(k, draw());
  }

  // ——— strength ———
  private get run(): Run {
    return this.h.run();
  }

  private boost(): number {
    return 1 + 0.05 * (this.run.perkCounts.perkBoost ?? 0);
  }

  /** Table-wide strength of a perk (0 when no pizza has it). */
  c(perk: PizzaPerk): number {
    return (this.run.perkCounts[perk] ?? 0) * this.boost();
  }

  /** One pizza's strength: 1, 1.5 enhanced, half as much again for Mystery Meat. */
  pk(p: Pizza): number {
    return (1 + (p.enhanced ? 0.5 : 0) + (p.type.perk === 'mystery' ? 0.5 : 0)) * this.boost();
  }

  private with(perk: PizzaPerk): Pizza[] {
    return this.a.alivePizzas().filter((p) => p.perk === perk);
  }

  private wave(): number {
    return this.run.wave;
  }

  /** First wave of an act (waves 1, 11, 21 … of each journey). */
  private actStart(): boolean {
    return isActStart(this.wave());
  }

  /** Which act this is, counting endless loops on (a fresh act each 10 waves). */
  private act(): number {
    return Math.floor((this.wave() - 1) / WAVES_PER_ACT);
  }

  private fast(f: Foot): boolean {
    return f.type.speed >= 1.15 || f.has('rush') || f.has('burst');
  }

  /** Mystery Meat's perk counts as a big (enhanced-strength) one. */
  bigPerks(live: Pizza[]): PizzaPerk[] {
    return live.filter((p) => p.type.perk === 'mystery' && p.perk).map((p) => p.perk!);
  }

  // ——— placing and the run ———
  /** A pizza joins the table: Century Crust's extra slices, the borrowers' first perks. */
  placed(p: Pizza, fresh: boolean): void {
    if (fresh && p.type.perk === 'bigStart') p.addSlices(2);
    if (p.type.perk === 'rainbow' && p.flags.borrow === undefined) p.flags.borrow = Math.floor(Math.random() * BORROW_POOL.length);
    if (p.type.perk === 'mystery' && p.flags.mystery === undefined) p.flags.mystery = Math.floor(Math.random() * MYSTERY_POOL.length);
  }

  /** Enhancing Century Crust grows it to 12 slices. */
  enhanced(p: Pizza): void {
    if (p.type.perk === 'bigStart') p.addSlices(2);
  }

  /** A new run (not a continue): count night runs, start the perfect streak over. */
  runStart(): void {
    const g = save.pizzaGoals;
    const hr = new Date().getHours();
    if (hr >= 22 || hr < 5) g.nightRuns = (g.nightRuns ?? 0) + 1;
    g.perfectStreak = 0;
    this.lost = false;
  }

  /** A saved run comes back: did it lose a pizza already? */
  restored(pizzas: Pizza[]): void {
    this.lost = pizzas.some((p) => p.dead || p.flags.lost);
    // older saves (and dev scenarios) may lack a borrower's pick
    for (const p of pizzas) this.placed(p, false);
  }

  /** The run is over: Untouchable's and Combo King's records. */
  runEnd(victory: boolean): void {
    const g = save.pizzaGoals;
    g.bestCombo = Math.max(g.bestCombo ?? 0, this.run.bestCombo);
    if (victory && !this.lost) g.untouched = 1;
  }

  // ——— stats ———
  /** After the run's stats are worked out: table-shaped perks. */
  afterRecompute(s: Stats, comboBase: number): void {
    const variety = this.c('varietyDmg');
    if (variety) s.damage *= 1 + 0.05 * variety * new Set(this.a.alivePizzas().map((p) => p.type.id)).size;
    const peels = this.c('peelDmg');
    if (peels) s.damage *= 1 + 0.01 * peels * Math.floor(new Set(['classic', ...save.peels]).size / 10);
    const combo = this.c('comboLong');
    if (combo) s.comboBonus = (comboBase + s.comboBonus) * (1 + combo) - comboBase;
    // there's no smack cooldown, so "faster smacks" are extra quick follow-up smacks
    s.doubleChance += 0.15 * this.c('smackSpeed');
    s.crustBonus += 0.1 * this.c('crustRun');
  }

  /** Pizza Romana: follow-up smacks while it has every slice. */
  extraDouble(): number {
    let d = 0;
    for (const p of this.with('fullSpeed')) if (p.slices === p.maxSlices) d += 0.1 * this.pk(p);
    return d;
  }

  shinyMult(): number {
    return 1 + this.c('shinyDouble');
  }

  eventRateMult(): number {
    return 1 + 0.25 * this.c('eventChance');
  }

  eventDropMult(): number {
    return 1 + 0.25 * this.c('eventDrops');
  }

  goldenMult(): number {
    return Math.max(0.4, 1 - 0.25 * this.c('goldenDiscount'));
  }

  // ——— damage, tips, score, knockback ———
  damageMult(f: Foot, smack: boolean): number {
    let m = 1;
    if (smack) for (const p of this.with('nearDmg')) if (f.target === p || Math.abs(f.x - p.x) < p.radius * 1.3) m *= 1 + 0.1 * this.pk(p);
    if (this.fast(f)) m *= 1 + 0.15 * this.c('fastDmg');
    if (f.type.boss) {
      for (const p of this.with('fullBoss')) if (p.slices === p.maxSlices) m *= 1 + 0.15 * this.pk(p);
      m *= 1 + 0.2 * this.c('slayer');
    }
    if (f.type.mini) m *= 1 + 0.25 * this.c('miniDmg');
    if (this.actStart()) m *= 1 + 0.1 * this.c('actStart');
    // the cheap count first: the place only matters with a night pizza on the table
    if (this.c('nightDmg') > 0 && NIGHT.has(locationFor(this.wave()))) m *= 1 + 0.2 * this.c('nightDmg');
    // Moon Cheese: double damage the wave after a boss
    if (this.wave() > 1 && isBossWave(this.wave() - 1)) m *= 1 + this.c('postBoss');
    return m;
  }

  tipMult(f: Foot, golden: boolean): number {
    let m = 1;
    for (const p of this.with('freshTips')) if (!p.freshOn || p.fresh >= p.maxFresh) m += 0.1 * this.pk(p);
    if (isBossWave(this.wave())) m += 0.2 * this.c('bossTips');
    if (this.actStart()) m += 0.1 * this.c('actStart');
    if (golden || f.type.id === 'golden') m *= 1 + this.c('goldenDouble');
    return m;
  }

  scoreMult(f: Foot): number {
    const t = f.target;
    return t && t.perk === 'scoreAbove' ? 1 + 0.3 * this.pk(t) : 1;
  }

  knockMult(f: Foot): number {
    const t = f.target;
    return t && !t.dead && t.perk === 'knockAbove' ? 1 + 0.4 * this.pk(t) : 1;
  }

  // ——— hooks ———
  /** A smack landed on f at (x, y): Dragon Fruit Flambé breathes fire. */
  smacked(f: Foot, x: number): void {
    let chance = 0;
    for (const p of this.with('fireLane')) chance += 0.1 * this.pk(p);
    if (chance > 0 && Math.random() < chance) this.fireLane(f.cx || x);
  }

  private fireLane(x: number): void {
    const a = this.a;
    const st = this.run.stats;
    const table = (a.alivePizzas()[0]?.surfaceY ?? 820) - 20;
    // a tall column of fire from the table up through the lane
    const col = this.sc.add.image(x, table, 'glow').setOrigin(0.5, 1).setTint(0xff6a1a).setBlendMode(Phaser.BlendModes.ADD).setScale(0.9, 0.2).setAlpha(0.95);
    const core = this.sc.add.image(x, table, 'glow').setOrigin(0.5, 1).setTint(0xfff0a0).setBlendMode(Phaser.BlendModes.ADD).setScale(0.4, 0.2).setAlpha(1);
    a.fxLayer.add([col, core]);
    this.sc.tweens.add({ targets: col, scaleY: table / 120, duration: 160, ease: 'Quad.Out' });
    this.sc.tweens.add({ targets: core, scaleY: table / 130, duration: 160, ease: 'Quad.Out' });
    this.sc.tweens.add({ targets: [col, core], alpha: 0, scaleX: 0.2, delay: 260, duration: 420, onComplete: () => { col.destroy(); core.destroy(); } });
    for (let y = table; y > 80; y -= 55) this.sc.time.delayedCall((table - y) * 0.25, () => a.fx.burn(x + (Math.random() - 0.5) * 60, y));
    a.quip(x, 260, 'DRAGON FIRE!', '#ff7a3a', 40);
    a.sfx('sfx_fire', { volume: 0.8 });
    a.shake(160, 0.004);
    for (const o of a.allFeet()) {
      if (!o.hittable || Math.abs(o.cx - x) > 120) continue;
      this.h.dealDamage(o, st.damage, 'explode');
      if (o.alive && !o.type.traits.includes('immuneBurn')) {
        o.burnT = Math.max(o.burnT, 3);
        o.burnDps = Math.max(o.burnDps, st.damage * 0.5);
      }
    }
  }

  /** f was defeated (coins: what it paid). */
  killed(f: Foot, coins: number): void {
    this.waveKills++;
    const t = f.target;
    const x = f.cx;
    const y = f.cy;
    if (t && !t.dead && t.perk) {
      const k = this.pk(t);
      if (t.perk === 'tipsAbove') this.h.giveTips(Math.round(k), x, y - 40);
      if (t.perk === 'meatball') this.sc.time.delayedCall(120, () => this.meatball(x, y, t, k));
      if (t.perk === 'killReroll') {
        t.flags.duckKills = Number(t.flags.duckKills ?? 0) + 1;
        if (Number(t.flags.duckKills) >= (t.enhanced ? 7 : 10)) {
          t.flags.duckKills = 0;
          this.h.addReroll();
          this.a.quip(t.x, t.surfaceY - 170, 'FREE REROLL!', '#ffb347', 36);
          audio.sfx('sfx_coin', { rate: 1.3 });
        }
      }
      if (t.perk === 'pinata' && Math.random() < 0.2 * k) {
        this.a.fx.party(x, y, 50);
        this.a.quip(x, y - 120, 'PIÑATA!', '#ff7ad9', 46);
        audio.sfx('sfx_combo', { rate: 1.2 });
        this.h.giveTips(Math.max(6, coins * 3), x, y);
      }
    }
    // Thousand-Foot Feast counts every kill while it's out
    for (const p of this.with('killSlices')) {
      p.flags.feastKills = Number(p.flags.feastKills ?? 0) + 1;
      if (Number(p.flags.feastKills) >= (p.enhanced ? 70 : 100)) {
        p.flags.feastKills = 0;
        for (const q of this.a.alivePizzas()) this.h.healPizza(q, 1);
        this.a.quip(p.x, p.surfaceY - 180, 'FEAST! +1 SLICE ALL ROUND', '#7dff9a', 34);
      }
    }
  }

  /** Bolognese: a meatball drops from the defeated foot and rolls into the next one. */
  private meatball(x: number, y: number, from: Pizza, k: number): void {
    const a = this.a;
    const ball = this.sc.add.image(x, y, 'pk_meatball').setScale(0.9);
    a.fxLayer.add(ball);
    const targets = a.allFeet().filter((o) => o.hittable).sort((p, q) => Math.abs(p.cx - x) - Math.abs(q.cx - x));
    const t = targets[0];
    // it drops to the pizza first, then rolls off to its target (or off the table)
    const floor = from.surfaceY - 40;
    this.sc.tweens.add({
      targets: ball,
      y: floor,
      angle: 180,
      duration: 260,
      ease: 'Bounce.Out',
      onComplete: () => {
        if (!ball.active) return;
        const tx = t ? t.cx : x + (x < 960 ? -700 : 700);
        const ty = t ? t.cy : floor;
        audio.sfx('sfx_boing', { volume: 0.4, rate: 0.7, throttle: 120 });
        this.sc.tweens.add({
          targets: ball,
          x: tx,
          y: ty,
          angle: 180 + (tx > x ? 720 : -720),
          duration: 380,
          ease: 'Quad.In',
          onComplete: () => {
            ball.destroy();
            if (t && t.alive) {
              this.h.dealDamage(t, this.run.stats.damage * k, 'olive', 300);
              a.fx.impact(t.cx, t.cy, false);
              a.fx.splat(t.cx, t.cy, false);
              a.quip(t.x, t.cy - 110, 'MEATBALL!', '#ff8a5a', 34);
            }
          },
        });
      },
    });
  }

  /** Before a stomp lands on p: true when it misses (ghost pass, oyster shell). */
  preStomp(f: Foot, p: Pizza): boolean {
    const a = this.a;
    if (p.perk === 'ghostPass' && Math.random() < 0.25 * this.pk(p)) {
      a.quip(f.x, p.surfaceY - 140, 'PASSED RIGHT THROUGH!', '#bfe8ff', 38);
      a.sfx('sfx_whoosh', { volume: 0.7, rate: 0.6 });
      a.fx.ring(p.x, p.surfaceY - 20, 0xbfe8ff, 2, 0.45);
      this.sc.tweens.add({ targets: p.root, alpha: { from: 0.25, to: 1 }, duration: 600, ease: 'Sine.Out' });
      f.knock(420);
      return true;
    }
    if (p.perk === 'stompCooldown') {
      const last = this.lastStomp.get(p) ?? -99;
      if (a.now() - last < (p.enhanced ? 3 : 2)) {
        a.quip(f.x, p.surfaceY - 140, 'SHELL SHUT!', '#cfe8e0', 38);
        a.sfx('sfx_shield', { volume: 0.7 });
        a.fx.ring(p.x, p.surfaceY - 20, 0xcfe8e0, 2, 0.45);
        f.knock(520);
        return true;
      }
    }
    return false;
  }

  /** A stomp landed on p: the stomper pays for it. */
  afterStomp(f: Foot, p: Pizza): void {
    const a = this.a;
    this.lastStomp.set(p, a.now());
    const perk = p.perk;
    if (!perk || !f.alive) return;
    const k = this.pk(p);
    const canSlow = !f.type.traits.includes('immuneSlow');
    const canBurn = !f.type.traits.includes('immuneBurn');
    switch (perk) {
      case 'stompMeter':
        this.run.super = Math.min(1, this.run.super + 0.05 * k);
        a.quip(p.x, p.surfaceY - 150, 'GARLIC BUTTER: METER UP', '#ffe08a', 30);
        break;
      case 'stickyStomp':
        if (canSlow) {
          f.slowT = 3;
          f.slowPct = Math.max(f.slowPct, 0.4 * k);
          f.tint(0xb07a4a);
          a.quip(f.x, f.cy - 120, 'STICKY!', '#d8a060', 36);
        }
        break;
      case 'slipStomp':
        if (!f.isBossLike) {
          f.stun(p.enhanced ? 0.8 : 0.5);
          a.quip(f.x, f.cy - 120, 'SLIPPED!', '#ff6a4d', 38);
          a.sfx('sfx_boing', { volume: 0.6, rate: 1.4 });
        }
        break;
      case 'honeyStomp':
        if (canSlow) {
          f.slowT = 3;
          f.slowPct = Math.max(f.slowPct, 0.4 * k);
          f.tint(0xffc040);
        }
        if (canBurn) {
          f.burnT = Math.max(f.burnT, 3);
          f.burnDps = Math.max(f.burnDps, this.run.stats.damage * k);
        }
        a.quip(f.x, f.cy - 120, 'HOT HONEY!', '#ffb020', 38);
        a.sfx('sfx_fire', { volume: 0.5 });
        break;
      case 'firstFreeze':
        if (p.flags.salmonWave !== this.wave() && !f.isBossLike) {
          p.flags.salmonWave = this.wave();
          f.stun(p.enhanced ? 3 : 2, true);
          a.fx.frost(f.cx, f.cy);
          a.quip(f.x, f.cy - 120, 'COLD SMOKED!', '#a8e0ff', 38);
          a.sfx('sfx_freeze');
        }
        break;
      case 'frostFire': {
        if (!f.isBossLike) {
          f.stun(p.enhanced ? 2 : 1.5, true);
          a.fx.frost(f.cx, f.cy);
          a.sfx('sfx_freeze');
        }
        a.quip(f.x, f.cy - 120, 'FIRE AND ICE!', '#ffb070', 38);
        const dps = 10 * k;
        this.sc.time.delayedCall(f.isBossLike ? 100 : (p.enhanced ? 2000 : 1500), () => {
          if (!f.alive || !canBurn) return;
          f.burnT = Math.max(f.burnT, 4);
          f.burnDps = Math.max(f.burnDps, dps);
          a.fx.burn(f.cx, f.cy);
          a.sfx('sfx_fire', { volume: 0.6 });
        });
        break;
      }
    }
  }

  /** p has just been destroyed. 'survive': it's back on its feet (Olympian Feast); 'rise': it comes
   * back in a moment (Untouchable); null: it's gone. Volcano Calzone erupts either way. */
  destroyed(p: Pizza): 'survive' | 'rise' | null {
    const a = this.a;
    const fresh = !p.freshOn || p.fresh > 0;
    if (p.type.perk === 'erupt' && fresh) this.erupt(p);
    if (p.type.perk === 'surviveOnce' && fresh && !p.flags.olympUsed) {
      p.flags.olympUsed = true;
      p.revive(p.enhanced ? 3 : 1);
      a.fx.healBurst(p.x, p.surfaceY);
      a.fx.ring(p.x, p.surfaceY - 30, 0xffe680, 2.4, 0.45);
      a.quip(p.x, p.surfaceY - 170, 'THE GODS SAY NOT TODAY!', '#ffe680', 38);
      a.sfx('sfx_shield');
      return 'survive';
    }
    p.flags.lost = true;
    this.lost = true;
    // Untouchable: the first pizza lost each run (it included) comes back
    const keeper = [...this.a.alivePizzas(), p].find((q) => q.type.perk === 'firstBack' && !q.stale && !q.perkFrozen && !q.flags.untouchUsed);
    if (keeper && !this.untouchUsed()) {
      keeper.flags.untouchUsed = true;
      const full = keeper.enhanced;
      this.sc.time.delayedCall(1100, () => {
        p.revive(full ? p.maxSlices : Math.max(2, Math.ceil(p.maxSlices / 2)));
        a.fx.healBurst(p.x, p.surfaceY);
        a.fx.ring(p.x, p.surfaceY - 30, 0xffffff, 2.4, 0.45);
        a.quip(p.x, p.surfaceY - 160, 'UNTOUCHABLE!', '#ffffff', 48);
        a.sfx('sfx_heal');
        this.h.recompute();
      });
      return 'rise';
    }
    return null;
  }

  private untouchUsed(): boolean {
    return this.a.allPizzas().some((q) => q.type.perk === 'firstBack' && q.flags.untouchUsed);
  }

  /** Volcano Calzone: ×10 to every foot on the screen. */
  private erupt(p: Pizza): void {
    const a = this.a;
    const dmg = this.run.stats.damage * (p.enhanced ? 15 : 10);
    a.flash(500, 255, 110, 30);
    a.shake(900, 0.016);
    a.rumble(1, 600);
    a.dramatic(0.6);
    a.fx.explosion(p.x, p.surfaceY - 40, 420);
    a.quip(p.x, p.surfaceY - 220, 'ERUPTION!', '#ff5a1a', 72);
    a.sfx('sfx_explosion');
    a.sfx('sfx_fire');
    // lava bombs arc out of the calzone onto every foot
    for (const f of a.allFeet()) {
      if (!f.hittable) continue;
      const bomb = this.sc.add.image(p.x, p.surfaceY - 40, 'glow').setTint(0xff5a1a).setBlendMode(Phaser.BlendModes.ADD).setScale(0.35);
      a.fxLayer.add(bomb);
      const tx = f.cx;
      const ty = f.cy;
      this.sc.tweens.add({
        targets: bomb,
        x: tx,
        y: ty,
        duration: 420 + Math.random() * 200,
        ease: 'Quad.In',
        onUpdate: () => Math.random() < 0.4 && a.fx.burn(bomb.x, bomb.y),
        onComplete: () => {
          bomb.destroy();
          if (!f.alive) return;
          a.fx.explosion(tx, ty, 140);
          this.h.dealDamage(f, dmg, 'explode', 700);
          if (f.alive && !f.type.traits.includes('immuneBurn')) {
            f.burnT = Math.max(f.burnT, 4);
            f.burnDps = Math.max(f.burnDps, this.run.stats.damage);
          }
        },
      });
    }
    for (let i = 0; i < 24; i++) this.sc.time.delayedCall(i * 40, () => a.fx.burn(p.x + (Math.random() - 0.5) * 220, p.surfaceY - Math.random() * 200));
  }

  /** A wave begins. */
  waveStart(n: number): void {
    const a = this.a;
    this.footTime = 0;
    this.waveKills = 0;
    this.meteorT = 0;
    this.removeChest();
    let changed = false;
    for (const p of a.alivePizzas()) {
      const perk = p.perk;
      // Bufala: shields up for the boss
      if (perk === 'bossShield' && isBossWave(n)) {
        p.setShield(p.shieldCharges + (p.enhanced ? 2 : 1));
        a.fx.ring(p.x, p.surfaceY - 30, 0xffe680, 2, 0.45);
      }
      // Arcobaleno takes a new colour every wave
      if (p.type.perk === 'rainbow' && !p.stale && !p.perkFrozen) {
        const was = Number(p.flags.borrow ?? -1);
        let next = Math.floor(Math.random() * BORROW_POOL.length);
        if (next === was) next = (next + 1) % BORROW_POOL.length;
        p.flags.borrow = next;
        p.redraw();
        changed = true;
        this.sc.time.delayedCall(900, () => p.dead || a.quip(p.x, p.surfaceY - 190, `RAINBOW: ${perkTextOf(BORROW_POOL[next], p.enhanced).toUpperCase()}`, '#ff9ae6', 26));
      }
      // Mystery Meat shows its hand on the first wave it plays
      if (p.type.perk === 'mystery' && !p.flags.revealed) {
        p.flags.revealed = true;
        p.redraw();
        const line = borrowLine(p, p.enhanced) ?? '';
        this.sc.time.delayedCall(1000, () => {
          a.quip(p.x, p.surfaceY - 190, 'MYSTERY MEAT REVEALED!', '#c8a8ff', 34);
          this.h.toast(p.type.id, 'MYSTERY MEAT REVEALED', line);
          a.sfx('sfx_levelup', { volume: 0.5, rate: 1.3 });
        });
      }
    }
    if (changed) this.h.recompute();
    const k = this.c('timeStop');
    // the clock stops once the wave's first feet are on the table (they arrive a moment after the banner)
    this.timeStopPending = k > 0 ? Math.min(5, 3 * k) : 0;
    this.timeStopT = 0;
    if (this.c('postBoss') > 0 && n > 1 && isBossWave(n - 1)) this.sc.time.delayedCall(1400, () => a.quip(960, 330, 'MOON CHEESE: DOUBLE DAMAGE!', '#cfe4ff', 40));
    if (this.c('actStart') > 0 && this.actStart()) this.sc.time.delayedCall(1400, () => a.quip(960, 330, 'VICTORY LAP!', '#ffd23f', 44));
    // Pirate's Treasure: a chest turns up on the 4th wave of every stage
    if (this.c('treasure') > 0 && waveInStage(n) === 4) this.sc.time.delayedCall(4500, () => this.spawnChest());
  }

  /** The wave is clear. earned: tips this wave so far. */
  waveClear(n: number, perfect: boolean, earned: number): void {
    const a = this.a;
    // the rings only move in a wave: off the table until the next one (they'd hang frozen over the shop)
    this.dropRings();
    const g = save.pizzaGoals;
    g.perfectStreak = perfect ? (g.perfectStreak ?? 0) + 1 : 0;
    g.perfectBest = Math.max(g.perfectBest ?? 0, g.perfectStreak);
    g.bestCombo = Math.max(g.bestCombo ?? 0, this.run.bestCombo);
    // Speed Slice's goal: the time feet were on the table, on a wave of 6 or more
    if (this.waveKills >= 6) g.fastWave = Math.min(g.fastWave ?? 99, Math.round(this.footTime * 10) / 10);
    this.removeChest(true);
    const tuna = this.c('wave5Tips');
    if (tuna && n % 5 === 0) {
      const p = this.with('wave5Tips')[0];
      this.h.giveTips(Math.round(25 * tuna), p?.x ?? 960, (p?.surfaceY ?? 800) - 80);
      if (p) a.quip(p.x, p.surfaceY - 170, 'TUNA TIME!', '#ffe08a', 34);
    }
    const perfectK = this.c('perfectTips');
    if (perfect && perfectK && earned > 0) {
      const p = this.with('perfectTips')[0];
      this.h.giveTips(Math.round(earned * 0.5 * perfectK), p?.x ?? 960, (p?.surfaceY ?? 800) - 80);
      if (p) a.quip(p.x, p.surfaceY - 190, 'PERFECT PIE!', '#ffd23f', 36);
    }
    for (const p of a.alivePizzas()) {
      if (p.perk === 'neighbourRegrow') {
        p.flags.supremeWaves = Number(p.flags.supremeWaves ?? 0) + 1;
        if (Number(p.flags.supremeWaves) >= (p.enhanced ? 2 : 3)) {
          p.flags.supremeWaves = 0;
          for (const q of this.h.neighbours(p)) this.h.healPizza(q, 1);
        }
      }
      if (p.perk === 'crustWaves') {
        p.flags.caviarWaves = Number(p.flags.caviarWaves ?? 0) + 1;
        if (Number(p.flags.caviarWaves) >= (p.enhanced ? 7 : 10)) {
          p.flags.caviarWaves = 0;
          this.run.bank(1);
          a.quip(p.x, p.surfaceY - 190, '+1 GOLDEN CRUST', '#ffd23f', 36);
          a.fx.glint(p.x, p.surfaceY - 60, 8);
        }
      }
    }
  }

  /** Every frame of a wave. */
  update(dt: number): void {
    const a = this.a;
    if (!a.inWave()) return;
    const feet = a.allFeet();
    if (feet.some((f) => f.alive && f.hittable)) this.footTime += dt;
    if (this.timeStopPending > 0 && feet.some((f) => f.alive && !f.isBossLike && f.y > 60)) {
      this.timeStopT = this.timeStopPending;
      this.timeStopPending = 0;
      a.flash(300, 140, 220, 255);
      a.quip(960, 300, 'TIME STOP!', '#9ae6ff', 56);
      a.sfx('sfx_freeze', { volume: 0.8 });
      for (const p of this.with('timeStop')) a.fx.ring(p.x, p.surfaceY - 30, 0x9ae6ff, 2.4, 0.45);
    }
    const st = this.run.stats;
    for (const f of feet) {
      if (!f.alive) continue;
      const t = f.target;
      const near = t && !t.dead && (f.state === 'hover' || f.state === 'descend');
      const perk = near ? t.perk : null;
      // Chicken Pesto: the longer a foot waits over it, the slower it gets
      if (perk === 'slowWait') {
        f.brain.pestoT = Number(f.brain.pestoT ?? 0) + dt;
        f.slowAbove = Math.min(0.6, f.slowAbove + 0.1 * this.pk(t!) * Number(f.brain.pestoT));
      } else if (f.brain.pestoT) f.brain.pestoT = 0;
      // Chorizo & Pepper: hover over it too long and catch fire
      if (perk === 'hoverFire' && f.state === 'hover' && !f.type.traits.includes('immuneBurn')) {
        f.brain.chorizoT = Number(f.brain.chorizoT ?? 0) + dt;
        if (Number(f.brain.chorizoT) >= (t!.enhanced ? 1.3 : 2)) {
          f.brain.chorizoT = -99;
          f.burnT = Math.max(f.burnT, 4);
          f.burnDps = Math.max(f.burnDps, 10);
          a.quip(f.x, f.cy - 120, 'CHORIZO FLARE!', '#ff7a3a', 34);
          a.sfx('sfx_fire', { volume: 0.5, throttle: 200 });
        }
      }
      // Inferno Calzone: anything above it smoulders
      if (perk === 'burnAbove' && !f.type.traits.includes('immuneBurn')) {
        f.burnT = Math.max(f.burnT, 0.6);
        f.burnDps = Math.max(f.burnDps, 6 * this.pk(t!));
      }
      // Tikka Time Machine: nothing moves for the first seconds of a wave
      if (this.timeStopT > 0 && !f.isBossLike && f.stunT < this.timeStopT) {
        f.stun(this.timeStopT, true);
        if (Math.random() < dt * 3) a.fx.frost(f.cx, f.cy);
      }
      // Burrata & Heirloom: a boss changing phase heals it
      if (f.isBossLike) {
        const was = this.phases.get(f) ?? f.phase;
        if (f.phase > was) for (const p of this.with('phaseHeal')) {
          this.h.healPizza(p, p.enhanced ? 2 : 1);
          a.quip(p.x, p.surfaceY - 170, 'BURRATA BALM', '#fff6e2', 32);
        }
        this.phases.set(f, f.phase);
      }
    }
    if (this.timeStopT > 0) this.timeStopT -= dt;
    // Meteorite Margherita
    const met = this.c('meteor');
    if (met > 0) {
      this.meteorT += dt;
      if (this.meteorT >= 15 / met) {
        const targets = feet.filter((f) => f.hittable && f.y > 120);
        if (targets.length) {
          this.meteorT = 0;
          this.meteor(Phaser.Utils.Array.GetRandom(targets), st.damage * 3);
        }
      }
    }
    this.ringsTick(dt);
    this.nonnaCheck();
    if (this.chest) this.chest.img.y += Math.sin(a.now() * 3) * 0.3;
  }

  private meteor(f: Foot, dmg: number): void {
    const a = this.a;
    const sx = f.cx + 520;
    const sy = -120;
    const m = this.sc.add.image(sx, sy, 'pk_meteor').setScale(0.85);
    a.fxLayer.add(m);
    a.sfx('sfx_whoosh', { volume: 0.6, rate: 0.7 });
    this.sc.tweens.add({
      targets: m,
      x: f.cx,
      y: f.cy,
      duration: 480,
      ease: 'Quad.In',
      onUpdate: () => Math.random() < 0.5 && a.fx.burn(m.x + 20, m.y - 20),
      onComplete: () => {
        m.destroy();
        a.fx.explosion(f.cx, f.cy, 180);
        a.shake(180, 0.006);
        a.sfx('sfx_explosion', { volume: 0.7, throttle: 80 });
        if (f.alive) {
          this.h.dealDamage(f, dmg, 'explode', 500);
          a.quip(f.x, f.cy - 130, 'METEOR!', '#ff9a3a', 40);
        }
      },
    });
  }

  /** Haunted Hawaiian's pineapple rings circle above it, hitting feet (×1). */
  private ringsTick(dt: number): void {
    const a = this.a;
    const want: { p: Pizza; i: number }[] = [];
    for (const p of this.with('orbitRing')) for (let i = 0; i < (p.enhanced ? 2 : 1); i++) want.push({ p, i });
    // keep the sprites in step with the pizzas that have the perk
    this.rings = this.rings.filter((r) => {
      const keep = want.some((w) => w.p === r.p && w.i === r.i);
      if (!keep) {
        r.img.destroy();
        r.glow.destroy();
      }
      return keep;
    });
    for (const w of want) {
      if (this.rings.some((r) => r.p === w.p && r.i === w.i)) continue;
      const glow = this.sc.add.image(0, 0, 'glow').setTint(0x8aff9a).setBlendMode(Phaser.BlendModes.ADD).setScale(0.85).setAlpha(0.45);
      const img = this.sc.add.image(0, 0, 'pk_ring').setAlpha(0.85);
      a.fxLayer.add([glow, img]);
      this.rings.push({ p: w.p, img, glow, i: w.i });
    }
    if (!this.rings.length) return;
    this.ringAngle += dt * 2.2;
    const dmg = this.run.stats.damage;
    for (const r of this.rings) {
      const n = r.p.enhanced ? 2 : 1;
      const ang = this.ringAngle + (r.i / n) * Math.PI * 2;
      const x = r.p.x + Math.cos(ang) * r.p.radius * 0.95;
      const y = r.p.surfaceY - 260 + Math.sin(ang) * 90;
      r.img.setPosition(x, y).setRotation(ang * 1.5).setScale(1.15 + Math.sin(ang) * 0.12);
      r.glow.setPosition(x, y).setAlpha(0.35 + Math.sin(a.now() * 5) * 0.1);
      for (const f of a.allFeet()) {
        if (!f.hittable || f.distanceTo(x, y) > 70) continue;
        if ((this.ringCd.get(f) ?? 0) > a.now()) continue;
        this.ringCd.set(f, a.now() + 0.6);
        this.h.dealDamage(f, dmg, 'cutter', 120);
        a.fx.impact(x, y, false);
        a.sfx('sfx_slap_2', { volume: 0.35, rate: 1.2, throttle: 80 });
      }
    }
  }

  /** Nonna's Secret: when a pizza is down to its last 2 slices, Nonna heals every pizza (once an act). */
  private nonnaCheck(): void {
    const a = this.a;
    const nonna = this.with('nonna')[0];
    if (!nonna) return;
    const act = this.act();
    const uses = nonna.flags.nonnaAct === act ? Number(nonna.flags.nonnaUses ?? 0) : 0;
    if (uses >= (nonna.enhanced ? 2 : 1)) return;
    const low = a.alivePizzas().find((p) => p.slices <= 2 && p.maxSlices > 3);
    if (!low) return;
    nonna.flags.nonnaAct = act;
    nonna.flags.nonnaUses = uses + 1;
    a.banner("NONNA'S SECRET!", 'Every pizza back to full', 'clear');
    a.sfx('sfx_heal');
    a.sfx('sfx_levelup', { volume: 0.6 });
    for (const p of a.alivePizzas()) {
      this.h.healPizza(p, p.maxSlices);
      a.fx.ring(p.x, p.surfaceY - 30, 0xff9a9a, 2, 0.45);
    }
  }

  // ——— Pirate's Treasure ———
  private spawnChest(): void {
    const a = this.a;
    if (!a.inWave() || this.chest) return;
    const ps = a.alivePizzas();
    if (!ps.length) return;
    const x = Phaser.Utils.Array.GetRandom(ps).x + (Math.random() - 0.5) * 160;
    const glow = this.sc.add.image(x, 430, 'glow').setTint(0xffd23f).setBlendMode(Phaser.BlendModes.ADD).setScale(1.4).setAlpha(0.5);
    const img = this.sc.add.image(x, -120, 'pk_chest').setScale(0.9);
    a.fxLayer.add([glow, img]);
    const chest: Chest = { img, glow, open: false };
    this.chest = chest;
    this.sc.tweens.add({ targets: img, y: 430, duration: 700, ease: 'Bounce.Out' });
    this.sc.tweens.add({ targets: glow, alpha: { from: 0.3, to: 0.65 }, duration: 700, yoyo: true, repeat: -1 });
    a.quip(x, 300, 'TREASURE! SMACK IT OPEN', '#ffd23f', 40);
    a.sfx('sfx_levelup', { volume: 0.5, rate: 0.9 });
    a.addClickable({
      x,
      y: 430,
      r: 80,
      priority: 1,
      alive: () => this.chest === chest && !chest.open,
      hit: () => this.openChest(chest),
    });
  }

  private openChest(chest: Chest): void {
    const a = this.a;
    if (chest.open) return;
    chest.open = true;
    const rich = this.c('treasure') > 1.2;
    chest.img.setTexture('pk_chest_open');
    this.sc.tweens.add({ targets: chest.img, scaleY: { from: 0.7, to: 0.9 }, duration: 300, ease: 'Back.Out' });
    a.fx.party(chest.img.x, chest.img.y - 40, 70);
    a.shake(160, 0.005);
    audio.sfx('sfx_coin');
    a.sfx('sfx_combo');
    const tips = Math.round((20 + this.wave() * 3) * (rich ? 1.5 : 1));
    const crusts = rich ? 2 : 1;
    this.h.giveTips(tips, chest.img.x, chest.img.y - 40);
    this.run.bank(crusts);
    a.quip(chest.img.x, chest.img.y - 150, `+${crusts} GOLDEN CRUST${crusts > 1 ? 'S' : ''}`, '#ffd23f', 40);
    this.sc.time.delayedCall(1600, () => this.chest === chest && this.removeChest());
  }

  /** The chest goes (sinks away if nobody opened it). */
  private removeChest(missed = false): void {
    const ch = this.chest;
    if (!ch) return;
    this.chest = null;
    if (missed && !ch.open) this.a.quip(ch.img.x, 300, 'THE TREASURE SANK!', '#c8a060', 34);
    this.sc.tweens.killTweensOf(ch.glow);
    this.sc.tweens.add({ targets: [ch.img, ch.glow], alpha: 0, y: '+=60', duration: 500, onComplete: () => { ch.img.destroy(); ch.glow.destroy(); } });
  }

  /** The scene is shutting down. */
  clear(): void {
    this.dropRings();
    this.chest = null;
  }

  private dropRings(): void {
    for (const r of this.rings) {
      r.img.destroy();
      r.glow.destroy();
    }
    this.rings = [];
  }
}
