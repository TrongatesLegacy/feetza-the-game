// Phase 3 pizza perks: the 57 new pizzas' effects, kept out of GameScene. The scene calls a hook at
// each moment that matters (wave start and clear, smack, damage, kill, stomp, a pizza destroyed,
// every frame) and the kit does the rest through the Arena and a few scene callbacks.
//
// Strength: an enhanced pizza's perk counts 1.5 (about +50%), Napoletana adds 5% per copy, and
// Mystery Meat's perk is "big" (counts half as much again). Run.perkCounts already sums the enhanced
// half, so table-wide perks read `c(perk)`; perks tied to one pizza read `pk(p)`.

import Phaser from 'phaser';
import { drawChest, drawDiscoBall, drawGhostRing, drawLightBeam, drawMeatball, drawMeteor, drawMusicNote, drawWaltzGhost, drawComet, drawSandWall } from '../art/perkProps';
import { PIZZAS, enhancedText, type PizzaPerk } from '../data/pizzas';
import { tunaTips } from '../data/perkWave';
import { WAVES_PER_ACT, isActStart } from '../data/stages';
import { save } from '../systems/save';
import { audio } from '../systems/audio';
import type { Arena } from './arena';
import type { Foot } from './Foot';
import type { Pizza } from './Pizza';
import { TIP_MULT_CAP, isBossWave, locationFor, waveInStage, type Run } from './Run';
import type { Stats } from '../data/upgrades';
import { TILT } from '../art/pizzaArt';
import { toppingDrawer } from '../art/registry';
import { makeCanvas, rng } from '../art/util';
import { crand } from '../systems/cosmeticRandom';

/** Perks Arcobaleno can't borrow: set up when a pizza is placed, tied to its own type, or another borrower. */
const BORROW_SKIP = new Set<PizzaPerk>([
  'rainbow', 'mystery', 'rotate', 'slices', 'bossRegrow', 'neverStale', 'staleHeal', 'riseOnce', 'refund',
  'bigStart', 'erupt', 'surviveOnce', 'firstBack', 'crustWaves', 'crustBonus', 'crustRun',
]);
/** Arcobaleno's pool: every other pizza's perk. */
export const BORROW_POOL: PizzaPerk[] = [...new Set(PIZZAS.map((p) => p.perk))].filter((k) => !BORROW_SKIP.has(k));
/** Mystery Meat's big perks: strong on any table. */
export const MYSTERY_POOL: PizzaPerk[] = ['damage', 'coins', 'crit', 'critDmg', 'double', 'execute', 'burnHits', 'explode', 'splash', 'radius', 'regenAll', 'meteor', 'timeStop', 'fireLane', 'orbitRing', 'ghostPass'];

/** Sounds the perks play that aren't loaded at boot (the scene loads them with the run): Granite Crust's stone,
 *  Disco Diner Pie's jukebox, Lodge Fondue Pie's cheese, and the Epic Chef's Specials' sounds from their bosses (the
 *  Kraken's ink, the Yeti's snowball, King Honk's pie, Sandcastle Sam's walls, T-Rex Toes' growl, Iron Heel's steam,
 *  the Chimney Sweep's soot, the Cosmic Croc's meteor, the Phantom King's stir). All CC0 or CC-BY and credited already. */
export const PERK_SFX = [
  'sfx_gargoyle_stone', 'sfx_smack_tail_jukebox', 'sfx_venomnom_goo',
  'sfx_kraken_squirt', 'sfx_kraken_inked', 'sfx_yeti_snowball', 'sfx_smack_snow_heavy', 'sfx_clownking_piesplat', 'sfx_clownking_honk',
  'sfx_sandcastle_walls', 'sfx_sandcastle_sandland', 'sfx_smack_sand_heavy', 'sfx_trex_growl', 'sfx_smack_stone_heavy', 'sfx_ironheel_steam',
  'sfx_ironheel_vent', 'sfx_sweep_soot', 'sfx_cosmiccroc_meteor', 'sfx_cosmiccroc_impact', 'sfx_phantomking_stir', 'sfx_phantomking_fade',
  'sfx_smack_ghost_heavy',
];

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

/** Kitchen Sink's three picks: what it adds this wave (src/game/pizzaPerks.ts afterRecompute). */
export const SINK_PICKS = ['smack damage', 'tips', 'crit chance'] as const;

/** Kitchen Sink's bonus in whole percent at a strength (5% plain; enhanced 7.5% reads 8, as other perks round). */
export function sinkPct(k: number): number {
  return Math.round(5 * k);
}

/** The line a borrowing pizza shows on the table and its shop card (Kitchen Sink: this wave's pick). */
export function borrowLine(p: Pizza, enhanced: boolean): string | null {
  if (p.type.perk === 'kitchenSink') return p.flags.sink === undefined ? null : `This wave: +${sinkPct(enhanced ? 1.5 : 1)}% ${SINK_PICKS[Number(p.flags.sink) % 3]}`;
  if (p.type.perk === 'mystery' && !p.flags.revealed) return enhanced ? enhancedText('mystery') : p.type.perkText;
  const b = borrowedPerk(p);
  return b ? perkTextOf(b, enhanced || p.type.perk === 'mystery') : null;
}

/** What the scene lends the kit (its private parts, as callbacks). */
export interface PerkHost {
  run(): Run;
  /** tag: where the STATS tab files it (each perk's own key). */
  dealDamage(f: Foot, amount: number, source: 'explode' | 'olive' | 'cutter' | 'direct', knock?: number, tag?: string): void;
  giveTips(n: number, x: number, y: number): void;
  healPizza(p: Pizza, n: number): void;
  neighbours(p: Pizza): Pizza[];
  recompute(): void;
  /** One more free reroll in the next shop. */
  addReroll(): void;
  toast(id: string, title: string, body: string): void;
  /** Move a foot to a free lane over another pizza (Squid Ink Nero): the new pizza, or null if none is free. */
  relane(f: Foot): Pizza | null;
}

/** Sandcastle Sundae's wall towers: its sandcastle topping, drawn large. */
function drawSandcastle(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(150, 150);
  ctx.translate(75, 84);
  ctx.scale(2.6, 2.6);
  toppingDrawer('sandcastle')?.draw(ctx, rng(5));
  return c;
}

/** Phantom Waltz's friendly ghost: a sprite guarding a pizza (never a foot, so nothing can zombify it). */
interface Ghost {
  p: Pizza;
  img: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  ph: number;
  ready: boolean;
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
  /** Seaside Fritto: a slice was lost last wave, so this one pays more (saved with the run). */
  lostLastWave = false;
  /** Rinkside Pretzel Pie: smacks are quicker until then (arena seconds). */
  private rushUntil = -99;
  /** Disco Diner Pie: seconds of wave since the last dance beat (it carries over between waves). */
  private danceT = 0;
  // ——— the Epic Chef's Specials (step 4, batch 1) ———
  /** Squid Ink Nero: inked feet, wandering off to a new lane until then (arena seconds), and the ink on them. */
  private inked = new Map<Foot, { until: number; bx: number; ph: number; blobs: Phaser.GameObjects.Image[]; tintAt: number }>();
  /** Cream Pie Supreme: the pie splat left on a pizza, where it lies. */
  private splats = new Map<Pizza, { img: Phaser.GameObjects.Image; dx: number }>();
  /** Sandcastle Sundae: stomps the sand wall can still block this wave, and its towers beside the pies. */
  private sandLeft = 0;
  private sandTowers: Phaser.GameObjects.Image[] = [];
  /** T-Rex Ribs: the table shakes (+damage) until then (arena seconds); when its last shake played. */
  private quakeUntil = -99;
  private quakeFx = -99;
  /** Steam Bun Pie: seconds of wave since the last vent (it carries over between waves). */
  private steamT = 0;
  /** Chimney Soot Pie: the pizza each foot was last sooted over (once per arrival), and the soot on it now. */
  private sootFor = new WeakMap<Foot, Pizza>();
  private sooted = new Map<Foot, { until: number; bx: number; ph: number; clouds: Phaser.GameObjects.Image[]; tintAt: number }>();
  /** Comet Calzone: seconds since the last comet this wave. */
  private cometT = 0;
  /** Phantom Waltz: the friendly ghosts guarding pizzas (sprites, never feet: nothing can zombify them). */
  private ghosts: Ghost[] = [];
  /** When a quip of each kind last played (they'd stack up over a busy wave). */
  private quipAt: Record<string, number> = {};

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
      ['pk_disco', drawDiscoBall],
      ['pk_note', drawMusicNote],
      ['pk_beam', drawLightBeam],
      ['pk_waltzghost', drawWaltzGhost],
      ['pk_comet', drawComet],
      ['pk_sandcastle', drawSandcastle],
      ['pk_sandwall', drawSandWall],
    ];
    for (const [k, draw] of tex) if (!this.sc.textures.exists(k)) this.sc.textures.addCanvas(k, draw());
  }

  // ——— strength ———
  private get run(): Run {
    return this.h.run();
  }

  /** Napoletana's boost to every other perk. */
  boost(): number {
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

  /** The pizzas granting a perk now (a possessed pizza's perk is the Ghost's, not yours: left out, as Tuna is). */
  private with(perk: PizzaPerk): Pizza[] {
    const ghost = this.a.possessed();
    return this.a.alivePizzas().filter((p) => p.perk === perk && p !== ghost);
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
    if (p.perk === 'kitchenSink' && p.flags.sink === undefined) p.flags.sink = Math.floor(Math.random() * 3);
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
    this.lostLastWave = false;
    this.danceT = 0;
    this.steamT = 0;
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
  afterRecompute(s: Stats, comboBase: number, skip: (Pizza | null | undefined)[] = []): void {
    const variety = this.c('varietyDmg');
    if (variety) s.damage *= 1 + 0.05 * variety * new Set(this.a.alivePizzas().map((p) => p.type.id)).size;
    const peels = this.c('peelDmg');
    if (peels) s.damage *= 1 + 0.01 * peels * Math.floor(new Set(['classic', ...save.peels]).size / 10);
    const combo = this.c('comboLong');
    if (combo) s.comboBonus = (comboBase + s.comboBonus) * (1 + combo) - comboBase;
    // there's no smack cooldown, so "faster smacks" are extra quick follow-up smacks
    s.doubleChance += 0.15 * this.c('smackSpeed');
    s.crustBonus += 0.1 * this.c('crustRun');
    // Kitchen Sink: this wave's pick
    for (const p of this.with('kitchenSink')) {
      if (p.flags.sink === undefined || skip.includes(p)) continue;
      const k = 0.05 * this.pk(p);
      const pick = Number(p.flags.sink) % 3;
      if (pick === 0) s.damage *= 1 + k;
      else if (pick === 1) s.coinMult = Math.min(TIP_MULT_CAP, s.coinMult + k);
      else s.critChance = Math.min(0.85, s.critChance + k);
    }
  }

  /** Pizza Romana: follow-up smacks while it has every slice. */
  extraDouble(): number {
    let d = 0;
    for (const p of this.with('fullSpeed')) if (p.slices === p.maxSlices) d += 0.1 * this.pk(p);
    if (this.rushing()) for (const p of this.with('killRush')) d += 0.05 * this.pk(p);
    return d;
  }

  /** Rinkside Pretzel Pie's rush: the 3 s after a kill. */
  rushing(): boolean {
    return this.a.now() < this.rushUntil;
  }

  /** Seaside Fritto pays more this wave (a slice was lost last wave). */
  lossTipsOn(): boolean {
    return this.lostLastWave && this.c('lossTips') > 0;
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
    // Cellar Mushroom Medley: ghosts and the undead (the zombie marking), and any foot zombified in play
    if (f.type.undead || f.zombified) m *= 1 + 0.1 * this.c('undeadDmg');
    // T-Rex Ribs: the table's shaking after a crit
    if (this.quaking()) m *= 1 + 0.1 * this.c('critQuake');
    return m * this.waveDmgMult(this.wave());
  }

  /** What every hit in wave n is worth, whatever the foot: Victory Lap, Night Shift, Moon Cheese. */
  waveDmgMult(n: number): number {
    let m = 1;
    if (isActStart(n)) m *= 1 + 0.1 * this.c('actStart');
    // the cheap count first: the place only matters with a night pizza on the table
    if (this.c('nightDmg') > 0 && NIGHT.has(locationFor(n))) m *= 1 + 0.2 * this.c('nightDmg');
    // Moon Cheese: double damage the wave after a boss
    if (n > 1 && isBossWave(n - 1)) m *= 1 + this.c('postBoss');
    return m;
  }

  tipMult(f: Foot, golden: boolean): number {
    let m = 1;
    for (const p of this.with('freshTips')) if (!p.freshOn || p.fresh >= p.maxFresh) m += 0.1 * this.pk(p);
    if (isBossWave(this.wave())) m += 0.2 * this.c('bossTips');
    if (this.actStart()) m += 0.1 * this.c('actStart');
    if (this.lostLastWave) m += 0.12 * this.c('lossTips');
    if (golden || f.type.id === 'golden') m *= 1 + this.c('goldenDouble');
    return m;
  }

  scoreMult(f: Foot): number {
    const t = f.target;
    return t && t.perk === 'scoreAbove' ? 1 + 0.3 * this.pk(t) : 1;
  }

  knockMult(f: Foot): number {
    const t = f.target;
    if (!t || t.dead) return 1;
    if (t.perk === 'knockAbove') return 1 + 0.4 * this.pk(t);
    if (t.perk === 'roofKnock') return 1 + 0.08 * this.pk(t);
    return 1;
  }

  // ——— hooks ———
  /** A smack landed on f at (x, y): Dragon Fruit Flambé breathes fire. */
  smacked(f: Foot, x: number): void {
    let chance = 0;
    for (const p of this.with('fireLane')) chance += 0.1 * this.pk(p);
    if (chance > 0 && Math.random() < chance) this.fireLane(f.cx || x);
    // Squid Ink Nero: the smack sprays ink
    const ink = this.with('inkSpray');
    if (ink.length && f.alive) this.inkSpray(f, ink);
    // Snowball Pie: every 8th smack (enhanced: 5th) throws a snowball
    for (const p of this.with('snowball')) {
      p.flags.snowN = Number(p.flags.snowN ?? 0) + 1;
      if (Number(p.flags.snowN) >= (p.enhanced ? 5 : 8) && this.snowball(p)) p.flags.snowN = 0;
    }
  }

  /** A smack crit f: T-Rex Ribs shakes the table. */
  crit(f: Foot): void {
    const k = this.c('critQuake');
    if (k <= 0) return;
    this.quake(f, k);
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
    for (const p of this.with('fireLane')) p.perkFired({ quip: false });
    a.shake(160, 0.004);
    for (const o of a.allFeet()) {
      if (!o.hittable || Math.abs(o.cx - x) > 120) continue;
      this.h.dealDamage(o, st.damage, 'explode', undefined, 'perk:fireLane');
      if (o.alive && !o.type.traits.includes('immuneBurn')) {
        o.burnT = Math.max(o.burnT, 3);
        o.burnDps = Math.max(o.burnDps, st.damage * 0.5);
      }
    }
  }

  /** f was defeated (coins: what it paid). */
  killed(f: Foot, coins: number): void {
    this.waveKills++;
    // Cream Pie Supreme leaves a splat where it fell; Phantom Waltz may raise a friendly ghost
    if (this.c('pieSplat') > 0) this.pieSplat(f);
    const waltz = this.c('ghostAlly');
    if (waltz > 0 && Math.random() < Math.min(0.6, 0.15 * waltz)) this.raiseGhost(f);
    // Rinkside Pretzel Pie: a kill gets the smacks going (its pop shows when a rush starts, not on every kill)
    if (this.c('killRush') > 0) {
      if (!this.rushing()) for (const p of this.with('killRush')) p.perkFired({ quip: false });
      this.rushUntil = this.a.now() + 3;
    }
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
          t.perkFired({ quip: false });
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
        p.perkFired({ quip: false });
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
              this.h.dealDamage(t, this.run.stats.damage * k, 'olive', 300, 'perk:meatball');
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
    // Cream Pie Supreme: the next foot down on a splat slips on it (a piercing stomp goes through)
    if (!f.has('pierce') && this.slip(f, p)) return true;
    if (p.perk === 'ghostPass' && Math.random() < 0.25 * this.pk(p)) {
      a.quip(f.x, p.surfaceY - 140, 'PASSED RIGHT THROUGH!', '#bfe8ff', 38);
      p.perkFired({ quip: false });
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
        p.perkFired({ quip: false });
        a.sfx('sfx_shield', { volume: 0.7 });
        a.fx.ring(p.x, p.surfaceY - 20, 0xcfe8e0, 2, 0.45);
        f.knock(520);
        return true;
      }
    }
    return false;
  }

  /** Granite Crust: the stomp turns to stone on the pie. The pie flashes grey and cracks, stone dust bursts off it,
   *  and the foot greys over and stands stunned (a boss is only blocked). */
  stoneStomp(f: Foot, p: Pizza): boolean {
    if (p.perk !== 'stoneStomp' || p.flags.stoneWave === this.wave() || p === this.a.possessed()) return false;
    p.flags.stoneWave = this.wave();
    this.stone(f, p);
    return true;
  }

  /** Phantom Waltz's ghost guarding p, then Sandcastle Sundae's sand wall: true when the stomp is blocked (checked where
   *  Pizza Stone is, so a piercing stomp goes through). */
  guardStomp(f: Foot, p: Pizza): boolean {
    if (p === this.a.possessed()) return false;
    const g = this.ghosts.find((o) => o.p === p && o.ready);
    if (g) {
      this.ghostBlock(g, f);
      return true;
    }
    if (this.sandLeft > 0) {
      this.sandBlock(f, p);
      return true;
    }
    return false;
  }

  private stone(f: Foot, p: Pizza): void {
    const a = this.a;
    const boss = f.isBossLike;
    p.stoneFlash(boss ? 650 : p.enhanced ? 1500 : 1000);
    p.perkFired({ quip: false });
    a.quip(f.x, p.surfaceY - 150, 'TURNED TO STONE!', '#f2ece0', 44);
    a.sfx('sfx_gargoyle_stone', { volume: 0.75, rate: 1.15 });
    a.shake(140, 0.004);
    a.fx.ring(p.x, p.surfaceY - 24, 0xcfc6b4, 2.2, 0.45);
    a.fx.ring(f.x, p.surfaceY - 60, 0xffffff, 1.4, 0.5);
    // the dust and chips flying off the stone
    for (let i = 0; i < 14; i++) {
      const ang = Math.PI + Math.random() * Math.PI;
      const sp = 140 + Math.random() * 260;
      const chip = this.sc.add.image(f.x + (Math.random() - 0.5) * 80, p.surfaceY - 40, i % 3 ? 'crumb2' : 'shard').setTint(i % 2 ? 0x9a9488 : 0xcfc6b4).setScale(0.5 + Math.random() * 0.5);
      a.fxLayer.add(chip);
      this.sc.tweens.add({ targets: chip, x: chip.x + Math.cos(ang) * sp * 0.5, y: chip.y + Math.sin(ang) * sp * 0.4 + 60, angle: (Math.random() - 0.5) * 360, alpha: 0, duration: 520 + Math.random() * 260, ease: 'Quad.Out', onComplete: () => chip.destroy() });
    }
    for (let i = 0; i < 5; i++) a.fx.puff(f.x + (Math.random() - 0.5) * 120, p.surfaceY - 30, 2);
    if (!f.alive || boss) return;
    f.knock(700);
    const sec = p.enhanced ? 1.5 : 1;
    f.stun(sec);
    // a pale flash of stone, then it stays grey while it stands there
    f.flash(0xe8e0d0, 110);
    this.sc.time.delayedCall(130, () => f.alive && f.stunT > 0 && f.tint(0xa09c96));
  }

  /** Raclette Run: its first stomp each wave (enhanced: two) takes half a slice. The half left over waits on the
   *  pizza, so two such stomps make one whole slice. Returns the slices this stomp takes. */
  stompDmg(f: Foot, p: Pizza, dmg: number): number {
    if (p.perk !== 'halfStomp' || p === this.a.possessed()) return dmg;
    const w = this.wave();
    const used = p.flags.halfWave === w ? Number(p.flags.halfUses ?? 0) : 0;
    if (used >= (p.enhanced ? 2 : 1)) return dmg;
    p.flags.halfWave = w;
    p.flags.halfUses = used + 1;
    const owed = Number(p.flags.halfOwed ?? 0) + dmg / 2;
    const whole = Math.floor(owed + 1e-9);
    p.flags.halfOwed = owed - whole;
    this.a.quip(f.x, p.surfaceY - 150, whole > 0 ? 'ONLY HALF A SLICE!' : 'HALF A SLICE: SAVED!', '#ffe08a', 36);
    this.a.sfx('sfx_boing', { volume: 0.5, rate: 0.85 });
    p.perkFired({ quip: false });
    return whole;
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
        p.perkFired({ quip: false });
        break;
      case 'stickyStomp':
        if (canSlow) {
          f.slowT = 3;
          f.slowPct = Math.max(f.slowPct, 0.4 * k);
          f.tint(0xb07a4a);
          a.quip(f.x, f.cy - 120, 'STICKY!', '#d8a060', 36);
        }
        break;
      case 'fondueStick':
        if (!f.isBossLike && p !== a.possessed()) {
          f.stun(p.enhanced ? 0.5 : 0.3);
          f.tint(0xffd870);
          a.quip(f.x, f.cy - 120, 'STUCK IN THE FONDUE!', '#ffd870', 34);
          a.sfx('sfx_venomnom_goo', { volume: 0.45, rate: 1.25, throttle: 200 });
          p.perkFired({ quip: false });
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
        p.perkFired({ quip: false });
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
      p.perkFired({ quip: false });
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
        p.perkFired({ quip: false });
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
    p.perkFired({ quip: false });
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
          this.h.dealDamage(f, dmg, 'explode', 700, 'perk:erupt');
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
    this.cometT = 0;
    this.removeChest();
    // the ghosts come back out to guard their pizzas (one whose pizza left the table in the shop goes with it)
    const table = a.alivePizzas();
    this.ghosts = this.ghosts.filter((g) => {
      if (table.includes(g.p)) return true;
      g.img.destroy();
      g.glow.destroy();
      return false;
    });
    for (const g of this.ghosts) {
      g.img.setVisible(true);
      g.glow.setVisible(true);
    }
    let changed = false;
    for (const p of a.alivePizzas()) {
      const perk = p.perk;
      // Bufala: shields up for the boss
      if (perk === 'bossShield' && isBossWave(n)) {
        p.setShield(p.shieldCharges + (p.enhanced ? 2 : 1));
        a.fx.ring(p.x, p.surfaceY - 30, 0xffe680, 2, 0.45);
        p.perkFired({ quip: false });
      }
      // Arcobaleno takes a new colour every wave
      if (p.type.perk === 'rainbow' && !p.stale && !p.perkFrozen) {
        const was = Number(p.flags.borrow ?? -1);
        let next = Math.floor(Math.random() * BORROW_POOL.length);
        if (next === was) next = (next + 1) % BORROW_POOL.length;
        p.flags.borrow = next;
        p.redraw();
        changed = true;
        this.sc.time.delayedCall(900, () => {
          if (p.dead) return;
          a.quip(p.x, p.surfaceY - 190, `RAINBOW: ${perkTextOf(BORROW_POOL[next], p.enhanced).toUpperCase()}`, '#ff9ae6', 26);
          p.perkFired({ quip: false });
        });
      }
      // Mystery Meat shows its hand on the first wave it plays
      if (p.type.perk === 'mystery' && !p.flags.revealed) {
        p.flags.revealed = true;
        p.redraw();
        const line = borrowLine(p, p.enhanced) ?? '';
        this.sc.time.delayedCall(1000, () => {
          a.quip(p.x, p.surfaceY - 190, 'MYSTERY MEAT REVEALED!', '#c8a8ff', 34);
          p.perkFired({ quip: false });
          this.h.toast(p.type.id, 'MYSTERY MEAT REVEALED', line);
          a.sfx('sfx_levelup', { volume: 0.5, rate: 1.3 });
        });
      }
    }
    // Kitchen Sink: this wave's pick (made when it was placed or the last wave cleared, so the shop shows it)
    for (const p of this.with('kitchenSink')) {
      if (p.flags.sink === undefined) {
        p.flags.sink = Math.floor(Math.random() * 3);
        p.redraw();
        changed = true;
      }
      this.sc.time.delayedCall(900, () => {
        if (p.dead) return;
        a.quip(p.x, p.surfaceY - 190, `KITCHEN SINK: +${sinkPct(this.pk(p))}% ${SINK_PICKS[Number(p.flags.sink) % 3].toUpperCase()}`, '#ffd23f', 28);
        p.perkFired({ quip: false });
      });
    }
    if (changed) this.h.recompute();
    // Sandcastle Sundae: the wall goes up (after Arcobaleno's new colour, which may be it)
    this.sandUp();
    // Old Town Tarte: tips as the wave starts
    for (const p of this.with('waveTips'))
      this.sc.time.delayedCall(700, () => {
        if (p.dead) return;
        const n = Math.round(6 * this.pk(p));
        this.h.giveTips(n, p.x, p.surfaceY - 80);
        a.quip(p.x, p.surfaceY - 170, `OLD TOWN: +${n} TIPS`, '#ffd23f', 32);
        p.perkFired({ quip: false });
      });
    // Seaside Fritto: a slice went last wave, so this one pays more
    if (this.lossTipsOn())
      this.sc.time.delayedCall(1200, () => {
        const ps = this.with('lossTips');
        if (!ps.length) return;
        a.quip(ps[0].x, ps[0].surfaceY - 190, `SEASIDE FRITTO: +${Math.round(12 * this.c('lossTips'))}% TIPS`, '#8fe0ff', 30);
        for (const p of ps) p.perkFired({ quip: false });
      });
    const k = this.c('timeStop');
    // the clock stops once the wave's first feet are on the table (they arrive a moment after the banner)
    this.timeStopPending = k > 0 ? Math.min(5, 3 * k) : 0;
    this.timeStopT = 0;
    if (this.c('postBoss') > 0 && n > 1 && isBossWave(n - 1))
      this.sc.time.delayedCall(1400, () => {
        a.quip(960, 330, 'MOON CHEESE: DOUBLE DAMAGE!', '#cfe4ff', 40);
        for (const p of this.with('postBoss')) p.perkFired({ quip: false });
      });
    if (this.c('actStart') > 0 && this.actStart()) this.sc.time.delayedCall(1400, () => a.quip(960, 330, 'VICTORY LAP!', '#ffd23f', 44));
    // Pirate's Treasure: a chest turns up on the 4th wave of every stage
    if (this.c('treasure') > 0 && waveInStage(n) === 4) this.sc.time.delayedCall(4500, () => this.spawnChest());
  }

  /** The wave is clear. earned: tips this wave so far. */
  waveClear(n: number, perfect: boolean, earned: number): void {
    const a = this.a;
    // the rings only move in a wave: off the table until the next one (they'd hang frozen over the shop)
    this.dropRings();
    // the splats, the soot, the ink and the sand wall go with the wave; the ghosts wait out the shop unseen
    this.clearEpics(false);
    const g = save.pizzaGoals;
    g.perfectStreak = perfect ? (g.perfectStreak ?? 0) + 1 : 0;
    g.perfectBest = Math.max(g.perfectBest ?? 0, g.perfectStreak);
    g.bestCombo = Math.max(g.bestCombo ?? 0, this.run.bestCombo);
    // Speed Slice's goal: the time feet were on the table, on a wave of 6 or more
    if (this.waveKills >= 6) g.fastWave = Math.min(g.fastWave ?? 99, Math.round(this.footTime * 10) / 10);
    this.removeChest(true);
    // Seaside Fritto pays more next wave when a slice went in this one
    this.lostLastWave = !perfect;
    // Kitchen Sink picks the next wave's bonus now, so the shop shows the one you'll get
    for (const p of a.alivePizzas()) if (p.perk === 'kitchenSink') {
      p.flags.sink = Math.floor(Math.random() * 3);
      p.redraw();
    }
    // Tuna & Sweetcorn: every wave pays 5 tips × the wave number (enhanced: 10 ×)
    const tunas = this.with('wave5Tips').filter((p) => p !== this.a.possessed());
    if (tunas.length) {
      const p = tunas[0];
      this.h.giveTips(Math.round(tunas.reduce((t, q) => t + tunaTips(n, q.enhanced), 0) * this.boost()), p.x, p.surfaceY - 80);
      a.quip(p.x, p.surfaceY - 170, 'TUNA TIME!', '#ffe08a', 34);
      p.perkFired({ quip: false });
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
          p.perkFired({ quip: false });
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
      for (const p of this.with('timeStop')) {
        a.fx.ring(p.x, p.surfaceY - 30, 0x9ae6ff, 2.4, 0.45);
        p.perkFired({ quip: false });
      }
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
          p.perkFired({ quip: false });
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
          for (const p of this.with('meteor')) p.perkFired();
        }
      }
    }
    // Disco Diner Pie: the jukebox drops a beat every 30 s (two pies: every 15)
    const disco = this.c('danceBeat');
    if (disco > 0) {
      this.danceT += dt;
      if (this.danceT >= 30 / disco && feet.some((f) => f.alive && f.hittable)) {
        this.danceT = 0;
        this.danceBeat();
      }
    }
    // Steam Bun Pie: the vents blow every 20 s (two pies: every 10), once a foot is diving
    const steam = this.c('steamVent');
    if (steam > 0) {
      this.steamT += dt;
      if (this.steamT >= 20 / steam && feet.some((f) => f.alive && f.hittable && f.state === 'descend' && f.y > 300)) {
        this.steamT = 0;
        this.steamVents();
      }
    }
    // Comet Calzone: every 12 s a comet finds the toughest foot
    const comet = this.c('comet');
    if (comet > 0) {
      this.cometT += dt;
      if (this.cometT >= 12 / comet) {
        const tough = feet.filter((f) => f.hittable && f.y > 120).sort((p, q) => q.hp - p.hp)[0];
        if (tough) {
          this.cometT = 0;
          this.comet(tough);
        }
      }
    }
    this.inkTick(dt);
    this.sootTick(dt);
    this.ghostTick();
    this.ringsTick(dt);
    this.nonnaCheck();
    if (this.chest) this.chest.img.y += Math.sin(a.now() * 3) * 0.3;
  }

  /** Disco Diner Pie: a dance beat. The mirror ball drops in over the pie, coloured lights sweep the table, notes
   *  bounce over every foot and they all slow 30% for 2 s, dancing. */
  danceBeat(): void {
    const a = this.a;
    const pies = this.with('danceBeat');
    const src = pies[0];
    const cols = [0xff4a9a, 0x38d8ff, 0xffd23f, 0x7dff7a];
    a.quip(960, 300, 'DANCE BREAK!', '#ff7ad9', 54);
    a.sfx('sfx_smack_tail_jukebox', { volume: 0.9 });
    this.sc.time.delayedCall(260, () => a.sfx('sfx_smack_tail_jukebox', { volume: 0.7, rate: 1.26 }));
    for (const p of pies) p.perkFired({ quip: false });
    if (src) {
      // the ball drops in above the pie, spins its light about and goes back up
      const bx = src.x;
      const by = src.surfaceY - 330;
      const ball = this.sc.add.image(bx, -140, 'pk_disco').setScale(1.15);
      const halo = this.sc.add.image(bx, by, 'glow').setTint(0xffd8f4).setBlendMode(Phaser.BlendModes.ADD).setScale(1.6).setAlpha(0);
      a.fxLayer.add([halo, ball]);
      this.sc.tweens.add({ targets: ball, y: by, duration: 320, ease: 'Back.Out' });
      this.sc.tweens.add({ targets: halo, alpha: 0.55, duration: 300, yoyo: true, hold: 1300 });
      this.sc.tweens.add({ targets: ball, angle: { from: -8, to: 8 }, duration: 300, yoyo: true, repeat: 3, ease: 'Sine.InOut' });
      this.sc.tweens.add({ targets: ball, y: -160, delay: 1900, duration: 360, ease: 'Back.In', onComplete: () => { ball.destroy(); halo.destroy(); } });
      // four beams of coloured light swing out of the ball across the table
      for (let i = 0; i < 4; i++) {
        const beam = this.sc.add.image(bx, by, 'pk_beam').setOrigin(0.5, 0).setTint(cols[i]).setBlendMode(Phaser.BlendModes.ADD).setScale(1.6, 1.5).setAlpha(0);
        beam.setRotation(-0.9 + i * 0.6);
        a.fxLayer.addAt(beam, 0);
        this.sc.tweens.add({ targets: beam, alpha: 0.75, duration: 220, delay: 200 + i * 60 });
        this.sc.tweens.add({ targets: beam, rotation: beam.rotation + (i % 2 ? -0.7 : 0.7), duration: 900, delay: 200, yoyo: true, ease: 'Sine.InOut' });
        this.sc.tweens.add({ targets: beam, alpha: 0, delay: 1800, duration: 300, onComplete: () => beam.destroy() });
      }
    }
    for (const f of a.allFeet()) {
      if (!f.alive || !f.hittable) continue;
      if (!f.type.traits.includes('immuneSlow')) {
        // (a stronger slow already on it keeps its own time; a weaker or finished one becomes the beat's)
        if (f.slowT <= 0 || f.slowPct <= 0.3) {
          f.slowPct = 0.3;
          f.slowT = Math.max(f.slowT, 2);
        }
      }
      // a note bouncing over it in time, and a ring of the light on it
      for (let n = 0; n < 2; n++) {
        const note = this.sc.add.image(f.cx + (n ? 40 : -40), f.cy - 90, 'pk_note').setTint(cols[(n + Math.floor(f.cx)) % 4]).setScale(0.75).setAlpha(0);
        a.fxLayer.add(note);
        this.sc.tweens.add({ targets: note, alpha: 1, duration: 140, delay: n * 220 });
        this.sc.tweens.add({ targets: note, y: note.y - 36, duration: 260, delay: n * 220, yoyo: true, repeat: 2, ease: 'Sine.InOut' });
        this.sc.tweens.add({ targets: note, alpha: 0, x: note.x + (n ? 30 : -30), delay: 1500 + n * 220, duration: 400, onComplete: () => note.destroy() });
      }
      a.fx.ring(f.cx, f.cy + 40, cols[Math.floor(f.cx) % 4], 1.3, 0.4);
    }
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
          this.h.dealDamage(f, dmg, 'explode', 500, 'perk:meteor');
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
        this.h.dealDamage(f, dmg, 'cutter', 120, 'perk:orbitRing');
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
    nonna.perkFired({ quip: false });
  }

  // ——— the Epic Chef's Specials (step 4, batch 1): each from a boss, its props and its sounds ———

  /** A quip (or a pizza's moment) of this kind at most every `gap` seconds. */
  private every(key: string, gap: number): boolean {
    const now = this.a.now();
    if (now - (this.quipAt[key] ?? -99) < gap) return false;
    this.quipAt[key] = now;
    return true;
  }

  /** A boss or mini-boss is in the fight: the perks' effects play lighter. */
  private bossOn(): boolean {
    return this.a.allFeet().some((f) => f.alive && f.isBossLike);
  }

  /** Squid Ink Nero: the smack sprays the Kraken's ink. A foot loses its lane (it's given another, if one's free) and
   *  wanders off towards it, unable to dive, for 1.5 s (enhanced 2.5). Bosses and mini-bosses are only splattered. */
  private inkSpray(f: Foot, pies: Pizza[]): void {
    const a = this.a;
    const now = a.now();
    const light = this.bossOn();
    // the spray: ink drops flung off the foot
    for (let i = 0; i < (light ? 3 : 6); i++) {
      const ang = -Math.PI / 2 + (crand() - 0.5) * 2.6;
      const sp = 90 + crand() * 160;
      const d = this.sc.add.image(f.cx + (crand() - 0.5) * 40, f.cy + (crand() - 0.5) * 40, 'p_ink').setScale(0.03 + crand() * 0.04).setAlpha(0.95);
      a.fxLayer.add(d);
      this.sc.tweens.add({ targets: d, x: d.x + Math.cos(ang) * sp, y: d.y + Math.sin(ang) * sp * 0.6 + 70, scale: d.scale * 0.5, alpha: 0, duration: 420 + crand() * 200, ease: 'Quad.Out', onComplete: () => d.destroy() });
    }
    a.sfx('sfx_kraken_squirt', { volume: 0.45, rate: 1.1 + crand() * 0.2, throttle: 140 });
    // (bosses and mini-bosses are only splattered; a foot a fight moves by hand keeps its place)
    if (f.isBossLike || f.puppet || f.brain.free) return;
    const sec = pies.some((p) => p.enhanced) ? 2.5 : 1.5;
    const have = this.inked.get(f);
    if (have) {
      have.until = Math.max(have.until, now + sec);
      return;
    }
    // it loses its lane (another, if there's one free) and can't dive till the ink wears off
    this.holdDive(f, sec);
    this.h.relane(f);
    const blobs = [0, 1].map((i) => {
      const b = this.sc.add.image(f.cx, f.cy, 'p_inkblob').setScale(0.32 - i * 0.08).setAlpha(0.9).setRotation(crand() * 6);
      a.fxLayer.add(b);
      return b;
    });
    // (it's tinted inky once the smack's flash is over: a flash clears it. Its wander is gameplay: Math.random)
    this.inked.set(f, { until: now + sec, bx: f.x, ph: Math.random() * 6, blobs, tintAt: 0 });
    if (this.every('inkQuip', 1.2)) a.quip(f.x, f.cy - 130, 'INKED! LOST ITS LANE', '#c8a8ff', 32);
    if (this.every('inkFire', 1.5)) {
      a.sfx('sfx_kraken_inked', { volume: 0.4, throttle: 400 });
      for (const p of pies) p.perkFired({ quip: false });
    }
  }

  /** Ink and soot: the foot can't dive for `sec` more. A diving foot is pulled back to its hover, at the end of its
   *  wait (so a mole doesn't bury itself again); the hover is held with holdHoverT, as a boss holds its own. */
  private holdDive(f: Foot, sec: number): void {
    if (f.state === 'descend') {
      f.setState('hover');
      f.stateT = f.hoverTime;
    }
    f.brain.holdHoverT = sec;
  }

  /** Ink or soot wore off: the foot may dive again (unless the other still holds it: its tick holds it again), and its
   *  tint goes. */
  private release(f: Foot): void {
    if (!f.alive || this.inked.has(f) || this.sooted.has(f)) return;
    f.brain.holdHoverT = 0;
    if (f.stunT <= 0) f.clearTint();
  }

  /** Keep a foot tinted while the effect lasts: every smack's flash clears a tint, so it goes back on after. */
  private keepTint(f: Foot, col: number, at: number, now: number): number {
    if (f.flashing || f.stunT > 0 || now - at < 0.2) return at;
    f.tint(col);
    return now;
  }

  /** Inked feet wander, weaving towards their new lane, and can't dive; the ink rides on them. */
  private inkTick(dt: number): void {
    if (!this.inked.size) return;
    const now = this.a.now();
    for (const [f, ink] of this.inked) {
      const end = !f.alive || now >= ink.until;
      ink.blobs.forEach((b, i) => b.setPosition(f.cx + (i ? 26 : -18), f.cy + (i ? -30 : 10)));
      if (end) {
        this.inked.delete(f);
        this.dropImgs(ink.blobs);
        this.release(f);
        continue;
      }
      ink.tintAt = this.keepTint(f, 0x6a5a8a, ink.tintAt, now);
      this.holdDive(f, ink.until - now);
      if (f.state !== 'hover' || f.stunT > 0 || f.held || f.pinned) continue;
      ink.bx += ((f.laneX ?? ink.bx) - ink.bx) * Math.min(1, dt * 1.6);
      const off = Math.sin(now * 3.1 + ink.ph) * 70 + Math.sin(now * 1.7 + ink.ph * 2) * 40;
      f.x = Phaser.Math.Clamp(ink.bx + off, 90, 1830);
    }
  }

  /** Snowball Pie: the Yeti's snowball, lobbed from the pie at the foot nearest the table (bosses aren't frozen: it
   *  chills them 30% for 2 s). */
  private snowball(p: Pizza): boolean {
    const a = this.a;
    const feet = a.allFeet().filter((f) => f.alive && f.hittable && f.y > 60 && !(f.stunT > 0 && f.frozen));
    const pool = feet.filter((f) => !f.isBossLike);
    const t = (pool.length ? pool : feet).sort((x, y) => y.y - x.y)[0];
    if (!t) return false;
    const sx = p.x;
    const sy = p.surfaceY - 70;
    const ball = this.sc.add.image(sx, sy, 'p_snowball').setScale(0.85);
    a.fxLayer.add(ball);
    a.sfx('sfx_yeti_snowball', { volume: 0.55, throttle: 120 });
    p.perkFired({ quip: false });
    this.sc.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 380,
      onUpdate: (tw) => {
        const u = tw.getValue() ?? 0;
        ball.setPosition(sx + (t.cx - sx) * u, sy + (t.cy - sy) * u - Math.sin(Math.PI * u) * 170).setRotation(u * 7);
        if (crand() < 0.35) a.fx.propTrail(ball.x, ball.y, 0xdff2ff, 0.4);
      },
      onComplete: () => {
        ball.destroy();
        a.fx.frost(t.cx, t.cy);
        a.fx.ring(t.cx, t.cy + 30, 0xbfe8ff, 1.3, 0.45);
        // packed snow bursting off it
        for (let i = 0; i < 8; i++) {
          const ang = crand() * Math.PI * 2;
          const c = this.sc.add.image(t.cx, t.cy, 'p_snowball').setScale(0.18 + crand() * 0.14);
          a.fxLayer.add(c);
          this.sc.tweens.add({ targets: c, x: c.x + Math.cos(ang) * 90, y: c.y + Math.sin(ang) * 60 + 50, alpha: 0, scale: 0.05, duration: 420, ease: 'Quad.Out', onComplete: () => c.destroy() });
        }
        a.sfx('sfx_smack_snow_heavy', { volume: 0.6, throttle: 100 });
        if (!t.alive) return;
        if (!t.isBossLike) {
          t.stun(2, true);
          a.quip(t.x, t.cy - 130, t.insulated ? 'SNOWBALL! (INSULATED)' : 'SNOWBALL! FROZEN', '#bfe8ff', 34);
        } else {
          if (!t.type.traits.includes('immuneSlow') && (t.slowT <= 0 || t.slowPct <= 0.3)) {
            t.slowPct = 0.3;
            t.slowT = Math.max(t.slowT, 2);
          }
          a.quip(t.x, t.cy - 130, 'SNOWBALL! CHILLED', '#bfe8ff', 34);
        }
      },
    });
    return true;
  }

  /** T-Rex Ribs is shaking the table (+damage to every foot). */
  quaking(): boolean {
    return this.a.now() < this.quakeUntil;
  }

  /** T-Rex Ribs: a crit stamps the table like T-Rex Toes: it shakes, dust jumps off round the pies, and every foot
   *  takes +10% (enhanced 15%) for 3 s. */
  private quake(f: Foot, k: number): void {
    const a = this.a;
    const now = a.now();
    const was = this.quaking();
    this.quakeUntil = now + 3;
    if (now - this.quakeFx < 0.4) return;
    this.quakeFx = now;
    const light = this.bossOn();
    a.shake(light ? 80 : 130, light ? 0.002 : 0.0035);
    a.sfx('sfx_smack_stone_heavy', { volume: 0.4, rate: 0.7, throttle: 250 });
    a.fx.ring(f.cx, f.cy + 40, 0xffb070, 1.2, 0.4);
    for (const p of a.alivePizzas()) for (let i = 0; i < (light ? 1 : 2); i++) a.fx.puff(p.x + (crand() - 0.5) * p.radius * 1.7, p.surfaceY + p.radius * 0.32, 2);
    if (was) return;
    a.sfx('sfx_trex_growl', { volume: 0.5, throttle: 1500 });
    if (this.every('quakeQuip', 2.5)) a.quip(960, 300, `TABLE SHAKE! +${Math.round(10 * k)}% DAMAGE`, '#ffb070', 40);
    for (const p of this.with('critQuake')) p.perkFired({ quip: false });
  }

  /** Cream Pie Supreme: a smacked-down foot drops one of King Honk's pies on the pizza it was over: a splat lies there
   *  (one a pizza) until the next foot comes down on it. */
  private pieSplat(f: Foot): void {
    const p = f.target;
    if (!p || p.dead || p === this.a.possessed() || this.splats.has(p)) return;
    const a = this.a;
    const r = p.radius;
    const dx = Phaser.Math.Clamp(f.x - p.x, -r * 0.55, r * 0.55);
    // (on the back half of the pie, where the feet come down: its face is on the front half)
    const ly = p.surfaceY - p.y - r * TILT * 0.42;
    const img = this.sc.add.image(dx, ly, 'p_creamsplat').setAlpha(0.96);
    img.setDisplaySize(r * 0.62, r * 0.62 * TILT);
    const sx = img.scaleX;
    const sy = img.scaleY;
    img.setScale(0);
    p.addOnPie(img);
    this.splats.set(p, { img, dx });
    // the pie falls from where the foot went down and lands face first
    const pie = this.sc.add.image(f.cx, f.cy, 'p_pie2').setScale(0.4);
    a.fxLayer.add(pie);
    this.sc.tweens.add({
      targets: pie,
      x: p.x + dx,
      y: p.surfaceY - r * TILT * 0.42,
      angle: 200,
      duration: 260,
      ease: 'Quad.In',
      onComplete: () => {
        pie.destroy();
        if (!img.active) return;
        this.sc.tweens.add({ targets: img, scaleX: sx, scaleY: sy, duration: 160, ease: 'Back.Out' });
        for (let i = 0; i < 6; i++) {
          const ang = Math.PI + crand() * Math.PI;
          const c = this.sc.add.image(p.x + dx, p.surfaceY - r * TILT * 0.42, 'p_cream').setScale(0.03 + crand() * 0.03);
          a.fxLayer.add(c);
          this.sc.tweens.add({ targets: c, x: c.x + Math.cos(ang) * 80, y: c.y + Math.sin(ang) * 40 + 30, alpha: 0, duration: 380, ease: 'Quad.Out', onComplete: () => c.destroy() });
        }
        a.sfx('sfx_clownking_piesplat', { volume: 0.5, throttle: 150 });
        if (this.every('pieQuip', 1.5)) a.quip(p.x + dx, p.surfaceY - 120, 'PIE SPLAT!', '#fff0e0', 30);
      },
    });
  }

  /** The next foot down on a splat slips on it: its stomp misses, and it's stunned 1 s (enhanced 1.5). */
  private slip(f: Foot, p: Pizza): boolean {
    const sp = this.splats.get(p);
    if (!sp || f.isBossLike) return false;
    const a = this.a;
    this.splats.delete(p);
    this.sc.tweens.add({ targets: sp.img, scaleX: sp.img.scaleX * 1.7, alpha: 0, duration: 380, ease: 'Quad.Out', onComplete: () => sp.img.destroy() });
    const sec = this.with('pieSplat').some((q) => q.enhanced) ? 1.5 : 1;
    f.knock(650);
    f.stun(sec);
    f.flash(0xfff4e4, 120);
    for (let i = 0; i < 8; i++) {
      const ang = -Math.PI / 2 + (crand() - 0.5) * 2.4;
      const c = this.sc.add.image(f.x + (crand() - 0.5) * 60, p.surfaceY - 30, 'p_cream').setScale(0.03 + crand() * 0.04);
      a.fxLayer.add(c);
      this.sc.tweens.add({ targets: c, x: c.x + Math.cos(ang) * 120, y: c.y + Math.sin(ang) * 90 + 60, alpha: 0, angle: crand() * 300, duration: 520, ease: 'Quad.Out', onComplete: () => c.destroy() });
    }
    a.sfx('sfx_clownking_honk', { volume: 0.4, throttle: 300 });
    a.sfx('sfx_boing', { volume: 0.5, rate: 1.3 });
    a.quip(f.x, p.surfaceY - 150, 'SLIPPED ON THE PIE!', '#fff0e0', 36);
    for (const q of this.with('pieSplat')) q.perkFired({ quip: false });
    return true;
  }

  /** Sandcastle Sundae: Sandcastle Sam's wall goes up as the wave starts, 2 stomps' worth a pie (enhanced 3), a sand
   *  tower for each standing on the table at the plate's sides. */
  private sandUp(): void {
    const a = this.a;
    this.dropImgs(this.sandTowers);
    this.sandTowers = [];
    const ps = this.with('sandWall');
    this.sandLeft = ps.reduce((n, p) => n + (p.enhanced ? 3 : 2), 0);
    if (!this.sandLeft) return;
    for (const p of ps) {
      const n = p.enhanced ? 3 : 2;
      for (let i = 0; i < n; i++) {
        // alternately left and right of the plate, stepping outwards
        const side = i % 2 ? 1 : -1;
        const x = p.x + side * p.radius * (1.12 + Math.floor(i / 2) * 0.2);
        const t = this.sc.add.image(x, p.y + p.radius * TILT * 0.5, 'pk_sandcastle').setOrigin(0.5, 0.92);
        t.setScale((p.radius * 0.3) / t.width);
        const s = t.scaleY;
        t.setScale(t.scaleX, 0);
        a.fxLayer.addAt(t, 0);
        this.sandTowers.push(t);
        this.sc.tweens.add({ targets: t, scaleY: s, delay: 500 + i * 120, duration: 300, ease: 'Back.Out' });
      }
    }
    this.sc.time.delayedCall(560, () => a.sfx('sfx_sandcastle_sandland', { volume: 0.45 }));
    this.sc.time.delayedCall(900, () => {
      const p = ps.find((q) => !q.dead);
      if (!p || !this.sandLeft) return;
      a.quip(p.x, p.surfaceY - 170, `SAND WALL: ${this.sandLeft} STOMPS`, '#ffd88a', 30);
      p.perkFired({ quip: false });
    });
  }

  /** The wall takes a stomp: sand bursts up under the foot, a wall of it, and the foot bounces off; a tower crumbles. */
  private sandBlock(f: Foot, p: Pizza): void {
    const a = this.a;
    this.sandLeft--;
    const tower = this.sandTowers.pop();
    if (tower) {
      this.sc.tweens.killTweensOf(tower);
      this.sc.tweens.add({ targets: tower, scaleY: 0, alpha: 0, duration: 300, ease: 'Quad.In', onComplete: () => tower.destroy() });
    }
    // (it rises from the back of the pie, between the foot and it, clear of the pie's face)
    const wall = this.sc.add.image(f.x, p.surfaceY - p.radius * TILT * 0.35, 'pk_sandwall').setOrigin(0.5, 1).setScale(0.72, 0);
    a.fxLayer.addAt(wall, 0);
    this.sc.tweens.add({ targets: wall, scaleY: 0.72, duration: 150, ease: 'Back.Out' });
    this.sc.tweens.add({ targets: wall, scaleY: 0, alpha: 0, delay: 520, duration: 320, ease: 'Quad.In', onComplete: () => wall.destroy() });
    for (let i = 0; i < 12; i++) {
      const ang = -Math.PI / 2 + (crand() - 0.5) * 2.2;
      const sp = 120 + crand() * 200;
      const g = this.sc.add.image(f.x + (crand() - 0.5) * 150, p.surfaceY - 20, 'crumb2').setTint(crand() < 0.5 ? 0xe2b46a : 0xc89a52).setScale(0.5 + crand() * 0.5);
      a.fxLayer.add(g);
      this.sc.tweens.add({ targets: g, x: g.x + Math.cos(ang) * sp * 0.5, y: g.y + Math.sin(ang) * sp * 0.5 + 80, angle: crand() * 360, alpha: 0, duration: 600, ease: 'Quad.Out', onComplete: () => g.destroy() });
    }
    f.knock(750);
    a.shake(100, 0.003);
    a.sfx('sfx_sandcastle_walls', { volume: 0.55, throttle: 120 });
    a.sfx('sfx_smack_sand_heavy', { volume: 0.5 });
    a.quip(f.x, p.surfaceY - 160, this.sandLeft > 0 ? 'SAND WALL!' : 'SAND WALL CRUMBLED!', '#ffd88a', 40);
    for (const q of this.with('sandWall')) q.perkFired({ quip: false });
  }

  /** Steam Bun Pie: Iron Heel's vents burst open under every diving foot and blow it back up the lane. */
  private steamVents(): void {
    const a = this.a;
    const light = this.bossOn();
    a.quip(960, 300, 'STEAM VENTS!', '#e8f0ff', 50);
    a.sfx('sfx_ironheel_vent', { volume: 0.75 });
    a.sfx('sfx_ironheel_steam', { volume: 0.6 });
    for (const p of this.with('steamVent')) p.perkFired({ quip: false });
    const table = (a.alivePizzas()[0]?.surfaceY ?? 820) - 10;
    for (const f of a.allFeet()) {
      if (!f.alive || !f.hittable || (f.state !== 'descend' && f.state !== 'stomp')) continue;
      const x = f.cx;
      // a jet of steam rushing up the lane from the table to the foot, its glow behind it
      const jet = this.sc.add.image(x, table, 'glow').setOrigin(0.5, 1).setTint(0xf4f8ff).setBlendMode(Phaser.BlendModes.ADD).setScale(0.7, 0.2).setAlpha(0.7);
      a.fxLayer.addAt(jet, 0);
      this.sc.tweens.add({ targets: jet, scaleY: Math.max(0.5, (table - f.cy) / 110), duration: 140, ease: 'Quad.Out' });
      this.sc.tweens.add({ targets: jet, alpha: 0, scaleX: 0.25, delay: 200, duration: 380, onComplete: () => jet.destroy() });
      for (let i = 0; i < (light ? 4 : 7); i++) {
        const puff = this.sc.add.image(x + (crand() - 0.5) * 40, table, 'p_steam').setScale(0.2).setAlpha(0.85);
        a.fxLayer.addAt(puff, 0);
        this.sc.tweens.add({ targets: puff, y: f.cy + 40 + crand() * 80, x: puff.x + (crand() - 0.5) * 60, scale: 0.45 + crand() * 0.25, alpha: 0, delay: i * 35, duration: 520 + crand() * 200, ease: 'Quad.Out', onComplete: () => puff.destroy() });
      }
      a.fx.ring(x, table - 10, 0xe8f0ff, 1.2, 0.35);
      f.knock(1100);
    }
  }

  /** Chimney Soot Pie: a foot arriving over it (once each time it comes) is lost in the Chimney Sweep's soot for 2 s
   *  (enhanced 3): it can't find the pie to dive on it, and gropes about. Bosses and mini-bosses see through it. */
  private sootTick(dt: number): void {
    const a = this.a;
    const now = a.now();
    const ghost = a.possessed();
    if (this.c('sootAbove') > 0)
      for (const f of a.allFeet()) {
        if (!f.alive || f.isBossLike || f.puppet || f.brain.free || f.zombieHold || f.state !== 'hover' || f.y < 40) continue;
        const t = f.target;
        if (!t || t.dead || t.perk !== 'sootAbove' || t === ghost || this.sootFor.get(f) === t) continue;
        this.sootFor.set(f, t);
        this.soot(f, t);
      }
    for (const [f, s] of this.sooted) {
      const end = !f.alive || now >= s.until;
      s.clouds.forEach((c, i) => c.setPosition(f.cx + Math.cos(now * 1.3 + i * 2.1) * 50, f.cy + Math.sin(now * 1.1 + i * 2.1) * 34 - 10).setRotation(now * 0.3 + i));
      if (end) {
        this.sooted.delete(f);
        this.dropImgs(s.clouds);
        this.release(f);
        continue;
      }
      if (!this.inked.has(f)) s.tintAt = this.keepTint(f, 0x6a6462, s.tintAt, now);
      this.holdDive(f, s.until - now);
      if (f.state !== 'hover' || f.stunT > 0 || f.held || f.pinned || this.inked.has(f)) continue;
      s.bx += ((f.laneX ?? s.bx) - s.bx) * Math.min(1, dt * 3);
      f.x = Phaser.Math.Clamp(s.bx + Math.sin(now * 2.4 + s.ph) * 45, 90, 1830);
    }
  }

  private soot(f: Foot, t: Pizza): void {
    const a = this.a;
    const sec = t.enhanced ? 3 : 2;
    // a gust of soot up the chimney (a column off the pie), then the cloud wraps the foot
    const col = this.sc.add.image(f.cx, t.surfaceY - 20, 'p_sootcol').setOrigin(0.5, 1).setAlpha(0.75);
    col.setScale(0.32, 0.05);
    a.fxLayer.addAt(col, 0);
    this.sc.tweens.add({ targets: col, scaleY: Math.max(0.1, (t.surfaceY - f.cy) / col.height), duration: 220, ease: 'Quad.Out' });
    this.sc.tweens.add({ targets: col, alpha: 0, delay: 260, duration: 400, onComplete: () => col.destroy() });
    const clouds = [0, 1, 2].map((i) => {
      const c = this.sc.add.image(f.cx, f.cy, 'p_soot').setScale(0.1).setAlpha(0);
      a.fxLayer.add(c);
      this.sc.tweens.add({ targets: c, scale: 0.4 + i * 0.06, alpha: 0.78, delay: 120 + i * 60, duration: 260, ease: 'Quad.Out' });
      return c;
    });
    // (its groping is gameplay: Math.random)
    this.sooted.set(f, { until: a.now() + sec, bx: f.x, ph: Math.random() * 6, clouds, tintAt: 0 });
    f.tint(0x6a6462);
    a.sfx('sfx_sweep_soot', { volume: 0.5, throttle: 250 });
    if (this.every('sootQuip', 1.2)) a.quip(f.x, f.cy - 140, 'LOST IN SOOT!', '#cfc6bc', 34);
    if (this.every('sootFire', 1.5)) t.perkFired({ quip: false });
  }

  /** Comet Calzone: the Cosmic Croc's comet streaks down onto the toughest foot on the table for ×4. */
  private comet(f: Foot): void {
    const a = this.a;
    const dmg = this.run.stats.damage * 4;
    const light = this.bossOn();
    const dir = f.cx > 1200 ? -1 : 1;
    const sx = f.cx + dir * 640;
    const sy = -90;
    // (its tail streams up behind it, whichever side it comes from)
    const m = this.sc.add.image(sx, sy, 'pk_comet').setScale(0.9).setFlipX(dir < 0).setOrigin(dir < 0 ? 1 - 110 / 320 : 110 / 320, 210 / 320);
    const halo = this.sc.add.image(sx, sy, 'glow').setTint(0x7ab8ff).setBlendMode(Phaser.BlendModes.ADD).setScale(1.1).setAlpha(0.8);
    a.fxLayer.add([halo, m]);
    a.sfx('sfx_cosmiccroc_meteor', { volume: 0.6, throttle: 200 });
    for (const p of this.with('comet')) p.perkFired({ quip: false });
    this.sc.tweens.add({
      targets: [m, halo],
      x: f.cx,
      y: f.cy,
      duration: 480,
      ease: 'Sine.In',
      onUpdate: () => {
        if (crand() < 0.7) a.fx.propTrail(m.x + dir * 14, m.y - 14, crand() < 0.5 ? 0x9ad0ff : 0xffffff, 0.7);
      },
      onComplete: () => {
        m.destroy();
        halo.destroy();
        a.fx.explosion(f.cx, f.cy, light ? 120 : 170);
        a.fx.ring(f.cx, f.cy + 20, 0x9ad0ff, 2, 0.45);
        a.shake(light ? 110 : 170, light ? 0.004 : 0.006);
        a.sfx('sfx_cosmiccroc_impact', { volume: 0.6, throttle: 120 });
        if (!f.alive) return;
        this.h.dealDamage(f, dmg, 'explode', 500, 'perk:comet');
        a.quip(f.x, f.cy - 140, 'COMET! ×4', '#9ad0ff', 42);
      },
    });
  }

  /** Phantom Waltz: a fallen foot rises as a friendly ghost of the Phantom King's court. It waltzes a turn, then glides
   *  to a pizza with no ghost (the one it fell over, else the most hurt) and guards it from the next stomp. It's a
   *  sprite, never a foot: nothing zombifies it, smacks pass through it, and it waits out the shop. */
  private raiseGhost(f: Foot): void {
    const a = this.a;
    const free = a.alivePizzas().filter((p) => p !== a.possessed() && !this.ghosts.some((g) => g.p === p));
    if (!free.length) return;
    const p = f.target && free.includes(f.target) ? f.target : free.sort((x, y) => x.slices / x.maxSlices - y.slices / y.maxSlices)[0];
    const img = this.sc.add.image(f.cx, f.cy, 'pk_waltzghost').setScale(0.2).setAlpha(0);
    const glow = this.sc.add.image(f.cx, f.cy, 'glow').setTint(0xc8a8ff).setBlendMode(Phaser.BlendModes.ADD).setScale(0.9).setAlpha(0);
    a.fxLayer.add([glow, img]);
    const g = { p, img, glow, ph: crand() * 6, ready: false };
    this.ghosts.push(g);
    const [gx, gy] = this.ghostSpot(p);
    // up out of the fallen foot, a twirl, then off to its pizza
    this.sc.tweens.add({ targets: img, alpha: 0.92, scale: 0.72, y: f.cy - 90, duration: 380, ease: 'Quad.Out' });
    this.sc.tweens.add({ targets: glow, alpha: 0.5, y: f.cy - 90, duration: 380, ease: 'Quad.Out' });
    this.sc.tweens.add({ targets: img, angle: 360, delay: 380, duration: 520, ease: 'Sine.InOut' });
    this.sc.tweens.add({
      targets: [img, glow],
      x: gx,
      y: gy,
      delay: 900,
      duration: 620,
      ease: 'Sine.InOut',
      onComplete: () => {
        img.setAngle(0);
        g.ready = true;
      },
    });
    a.sfx('sfx_phantomking_stir', { volume: 0.45, throttle: 400 });
    if (this.every('ghostQuip', 1.5)) a.quip(f.x, f.cy - 150, 'A FRIENDLY GHOST!', '#d8c8ff', 32);
    for (const q of this.with('ghostAlly')) q.perkFired({ quip: false });
  }

  /** Where a ghost guards its pizza: beside the pie, over its rim, clear of its face. */
  private ghostSpot(p: Pizza): [number, number] {
    const side = p.x > 960 ? -1 : 1;
    return [p.x + side * p.radius * 0.95, p.surfaceY - 150];
  }

  /** The ghosts bob and sway (a slow waltz) by their pizzas; one whose pizza is gone drifts away. */
  private ghostTick(): void {
    if (!this.ghosts.length) return;
    const now = this.a.now();
    for (const g of [...this.ghosts]) {
      if (g.p.dead) {
        this.ghosts.splice(this.ghosts.indexOf(g), 1);
        this.sc.tweens.killTweensOf([g.img, g.glow]);
        this.sc.tweens.add({ targets: [g.img, g.glow], alpha: 0, y: '-=120', duration: 700, onComplete: () => { g.img.destroy(); g.glow.destroy(); } });
        continue;
      }
      if (!g.ready) continue;
      const [gx, gy] = this.ghostSpot(g.p);
      const x = gx + Math.sin(now * 1.4 + g.ph) * 14;
      const y = gy + Math.sin(now * 2.2 + g.ph) * 9;
      g.img.setPosition(x, y).setRotation(Math.sin(now * 1.4 + g.ph) * 0.14);
      g.glow.setPosition(x, y + 6).setAlpha(0.38 + Math.sin(now * 3 + g.ph) * 0.1);
    }
  }

  /** A ghost takes the stomp for its pizza: it swoops into the foot with a "BOO!" and is gone. */
  private ghostBlock(g: Ghost, f: Foot): void {
    const a = this.a;
    const p = g.p;
    g.ready = false;
    this.ghosts.splice(this.ghosts.indexOf(g), 1);
    this.sc.tweens.killTweensOf([g.img, g.glow]);
    this.sc.tweens.add({
      targets: [g.img, g.glow],
      x: f.cx,
      y: f.cy + 20,
      duration: 140,
      ease: 'Quad.In',
      onComplete: () => {
        a.fx.ring(f.cx, f.cy, 0xc8a8ff, 1.6, 0.45);
        this.sc.tweens.add({ targets: [g.img, g.glow], alpha: 0, scale: 0.9, duration: 360, ease: 'Quad.Out', onComplete: () => { g.img.destroy(); g.glow.destroy(); } });
      },
    });
    f.knock(800);
    if (!f.isBossLike) f.stun(0.5);
    a.quip(f.x, p.surfaceY - 160, 'BOO! BLOCKED!', '#d8c8ff', 44);
    a.sfx('sfx_smack_ghost_heavy', { volume: 0.55 });
    a.sfx('sfx_phantomking_fade', { volume: 0.4, throttle: 300 });
    for (const q of this.with('ghostAlly')) q.perkFired({ quip: false });
  }

  /** Phantom Waltz's ghosts on the table now (the STATS tab). */
  ghostCount(): number {
    return this.ghosts.length;
  }

  /** The wave's over (or the scene's going): the ink, soot, splats and sand go; the ghosts hide till the next wave
   *  (all: they go too). */
  private clearEpics(all: boolean): void {
    const held = [...this.inked.keys(), ...this.sooted.keys()];
    for (const ink of this.inked.values()) this.dropImgs(ink.blobs, all);
    for (const so of this.sooted.values()) this.dropImgs(so.clouds, all);
    this.inked.clear();
    this.sooted.clear();
    if (!all) for (const f of held) this.release(f);
    for (const sp of this.splats.values()) if (sp.img.active) sp.img.destroy();
    this.splats.clear();
    this.dropImgs(this.sandTowers, all);
    this.sandTowers = [];
    this.sandLeft = 0;
    for (const g of this.ghosts) {
      if (all) {
        g.img.destroy();
        g.glow.destroy();
        continue;
      }
      this.sc.tweens.killTweensOf([g.img, g.glow]);
      g.img.setAngle(0).setScale(0.72).setAlpha(0.92).setVisible(false);
      g.glow.setAlpha(0.4).setVisible(false);
      g.ready = true;
    }
    if (all) this.ghosts = [];
  }

  /** Fade images out (now: the scene is going, so destroy them without starting tweens). */
  private dropImgs(imgs: Phaser.GameObjects.Image[], now = false): void {
    for (const o of imgs) {
      if (!o.active) continue;
      this.sc.tweens.killTweensOf(o);
      if (now) o.destroy();
      else this.sc.tweens.add({ targets: o, alpha: 0, duration: 250, onComplete: () => o.destroy() });
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
    this.clearEpics(true);
  }

  private dropRings(): void {
    for (const r of this.rings) {
      r.img.destroy();
      r.glow.destroy();
    }
    this.rings = [];
  }
}
