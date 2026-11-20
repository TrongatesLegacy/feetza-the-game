import Phaser from 'phaser';
import { BACKDROPS, type ArenaId, type BackdropId, type LocationId } from '../art/backdrops';
import { BASE_SLICES, COMBO_BASE_WINDOW, H, MAX_PIZZAS, PIZZA_Y, W } from '../config';
import type { HeatId } from '../data/difficulty';
import { FOOT_BY_ID, OUCH, type FootType } from '../data/feet';
import { MILESTONES } from '../data/meta';
import { PIZZAS, PIZZA_BY_ID, type PizzaPerk } from '../data/pizzas';
import { ACT_WAVES, BOSS_MINION, JOURNEY_WAVES } from '../data/stages';
import { UPGRADES, UPGRADE_BY_ID, kindOf, upgradePrice, type Upgrade } from '../data/upgrades';
import type { Arena, Clickable } from '../game/arena';
import { footPortraitURL, pizzaPortraitURL } from '../game/assets';
import { BackdropView } from '../game/BackdropView';
import { BossDirector } from '../game/bosses';
import { eventName, rollEvent, startEvent, type EventId } from '../game/events';
import { Foot } from '../game/Foot';
import { Fx } from '../game/Fx';
import { Pizza } from '../game/Pizza';
import { LOCATION_AMBIENCE, LOCATION_MUSIC, Run, backdropFor, bossMusic, isBossWave, isMiniWave, locationFor, loopOf, planWave, type WavePlan } from '../game/Run';
import type { RunSnapshot } from '../game/snapshot';
import { audio } from '../systems/audio';
import { pad } from '../systems/gamepad';
import { markFootSeen, nextLockedPizza, persist, save, updateSettings } from '../systems/save';
import type { GoldenItem, ShopCard, ShopState } from '../ui/shopTypes';
import { ui } from '../ui/ui';
import { applyEquippedPeel, checkPeelAchievements, grantShinyFoot, peelThumbURL, peelTrail, rollEventDrop, SHINY_FOOT_CHANCE, type PeelDef } from '../game/peels';
import { STAGES, WAVES_PER_STAGE } from '../data/stages';
import { passiveBoost, setSlamMode } from '../game/slamMode';
import { setRunHeat } from '../game/heatRules';
import { abilityFor, abilityKindLabel, scaleProc, usesMeter, type Ability, type Effect, type Proc, type Target } from '../game/abilities';
import { randomLineup } from './MenuScene';

interface DamageOpts {
  source: 'smack' | 'chain' | 'cutter' | 'olive' | 'slam' | 'explode' | 'garlic' | 'burn' | 'trap' | 'splash' | 'direct' | 'ability';
  canCrit?: boolean;
  knock?: number;
  x?: number;
  y?: number;
  quiet?: boolean;
}

export interface GameStart {
  lineup?: string[];
  heat?: HeatId;
  /** Start at wave 31 with an Act 2 starter kit. */
  act2?: boolean;
  /** Resume a saved run (or a dev scenario) in its shop. */
  snapshot?: RunSnapshot;
  /** Dev: jump straight to a boss or mini-boss, optionally at a health fraction. */
  boss?: { id: string; hp?: number };
  /** Dev: begin at this wave with this many tips. */
  wave?: number;
  tips?: number;
}

const EVENT_RATE: Record<HeatId, number> = { mild: 0.35, regular: 0.25, hot: 0.22, extrahot: 0.2, inferno: 0.18 };
const EVENT_CRUST_CAP = 3;
const FRESH_START = [10, 8, 6, 9, 7];

export class GameScene extends Phaser.Scene implements Arena {
  private run!: Run;
  private pizzas: Pizza[] = [];
  private feet: Foot[] = [];
  fx!: Fx;
  private backdrop!: BackdropView;
  private pizzaLayer!: Phaser.GameObjects.Container;
  underLayer!: Phaser.GameObjects.Container;
  private shadowLayer!: Phaser.GameObjects.Container;
  private feetLayer!: Phaser.GameObjects.Container;
  fxLayer!: Phaser.GameObjects.Container;
  private cursorLayer!: Phaser.GameObjects.Container;
  private peel!: Phaser.GameObjects.Image;
  /** The equipped peel's trail colour (null: the Classic Peel has none) and whether it sparkles. */
  private peelTrailColor: number | null = null;
  private peelShiny = false;
  /** The peel this run is played with (prestige goals count it). */
  private peelId = 'classic';
  /** The peel's ability, when it replaces the Peel Slam this run (null: the Peel Slam). */
  private ability: Ability | null = null;
  private abilityT = 0;
  /** Proc toppings owned this run (scaled by level), with their timers. */
  private procs: { id: string; p: Proc; t: number }[] = [];
  /** Damage dealt this run by source (dev balance tooling reads it). */
  dmgLog: Record<string, number> = {};
  /** Tips earned in each wave (wave clear bonus included), for balance tooling. */
  tipLog: { wave: number; earned: number; spent: number }[] = [];
  private coinsAtWaveStart = 0;
  private coinsAtLastClear = 0;
  private lastPeelPos = { x: 0, y: 0 };
  /** Dev: multiplies the shiny-foot chance. */
  shinyBoost = 1;
  private cutters: Phaser.GameObjects.Image[] = [];
  private cutterAngle = 0;
  private cutterCd = new WeakMap<Foot, number>();
  private garlicAuras: Phaser.GameObjects.Image[] = [];
  private grade!: Phaser.GameObjects.Rectangle;
  private director!: BossDirector;
  private clickables: Clickable[] = [];

  private start: GameStart = {};
  private plan: WavePlan | null = null;
  private planSize = 0;
  private spawnT = 0;
  private waveActive = false;
  private bossPending = false;
  private bossFoot: Foot | null = null;
  private miniFoot: Foot | null = null;
  private miniSpawned = false;
  private bossSummonT = 0;
  private goldenSpawned = false;
  private waveEvent: EventId | null = null;
  private eventStarted = false;
  private waveSlicesLost = 0;
  private oliveT = 0;
  private garlicT = 0;
  private hitStop = 0;
  private slowMo = 0;
  /** Crusts banked for the boss this wave, for the BOSS DEFEATED banner. */
  private lastBossCrusts = 0;
  /** Normal tween speed (the dev bot's time warp raises it). */
  tweenBase = 1;
  private over = false;
  private paused = false;
  private inUpgrade = false;
  private pointer = { x: W / 2, y: H / 2, touch: false, lastMove: 0 };
  /** Where the peel actually is: trails the pointer while slowed, offset by magnets. */
  private peelPos = { x: W / 2, y: H / 2 };
  private peelStunT = 0;
  private peelSlowT = 0;
  private hurryT = 0;
  private hurryMult = 1;
  private lastSlam = -99;
  private possessedPizza: Pizza | null = null;
  private orders = new Map<Pizza, number>();
  private displayCoins = 0;
  private freeRerollsLeft = 0;
  /** The shop a Continue resumes into (cards, purchases, counter). */
  private restoredShop: { counter: RunSnapshot['counter']; shop: RunSnapshot['shop'] } | null = null;
  private healCost = 30;
  private reviveCost = 120;
  private nowT = 0;
  private currentBackdrop: BackdropId | null = null;
  private currentLocation: LocationId | null = null;
  private tutorial = false;
  private slamHinted = false;
  private smackCount = 0;
  private lastKillAt = -9;
  private bossBonusGiven = false;
  private shop: { el: HTMLElement; state: ShopState; cards: Upgrade[]; sold: Set<string>; free: string | null; bossReward: boolean; counter: ReturnType<GameScene['rollCounterOffers']>; goldenBought?: GoldenItem['id'] } | null = null;
  private keyHandler = (e: KeyboardEvent) => this.onKey(e);
  private visHandler = () => {
    if (document.hidden && this.waveActive && !this.paused && !this.over && !this.inUpgrade) this.togglePause(true);
  };

  constructor() {
    super('Game');
  }

  // ——— Arena (used by boss brains and wave events) ———
  get sc(): Phaser.Scene {
    return this;
  }
  now(): number {
    return this.nowT;
  }
  allFeet(): Foot[] {
    return this.feet;
  }
  allPizzas(): Pizza[] {
    return this.pizzas;
  }
  alivePizzas(): Pizza[] {
    return this.pizzas.filter((p) => !p.dead);
  }
  peelPoint(): { x: number; y: number } {
    return this.peelPos;
  }
  spawn(id: string, target?: Pizza | null, x?: number): Foot | null {
    const t = FOOT_BY_ID[id];
    if (!t || !this.plan) return null;
    return this.spawnFoot(t, target ?? this.pickTarget(null), false, x);
  }
  hitPizza(p: Pizza, slices: number, label: string, color = '#ff8a6a'): void {
    if (p.dead || this.over) return;
    this.fx.quip(p.x, p.surfaceY - 150, label, color, 40);
    this.applyStomp(p, null, slices, true);
  }
  stunPeel(sec: number, label: string): void {
    this.peelStunT = Math.max(this.peelStunT, sec);
    this.fx.quip(this.peelPos.x, this.peelPos.y - 80, label, '#ffd23f', 34);
    this.peel.setTint(0x9a9a9a);
    this.rumble(0.5, 200);
  }
  slowPeel(sec: number): void {
    this.peelSlowT = Math.max(this.peelSlowT, sec);
  }
  addClickable(c: Clickable): void {
    this.clickables.push(c);
  }
  banner(big: string, small: string, kind: 'boss' | 'loc' | 'clear' | 'phase' = 'boss', desc?: string): void {
    // phase banners explain the move, so they stay up long enough to read (longer on Mild)
    const ms = desc ? (this.run.heat === 'mild' ? 4800 : 3800) : undefined;
    ui.hud.banner(big, small, kind, desc, ms);
  }
  bossMove(f: Foot, name: string, info: string): void {
    if (f !== this.bossFoot && f !== this.miniFoot) return;
    ui.hud.setBossMove(name, info);
  }
  dramatic(sec: number): void {
    if (save.settings.reducedMotion) return;
    this.slowMo = Math.max(this.slowMo, sec);
  }
  quip(x: number, y: number, msg: string, color = '#ffffff', size = 40): void {
    this.fx.quip(x, y, msg, color, size);
  }
  sfx(key: string, opts?: { volume?: number; rate?: number; throttle?: number }): void {
    audio.sfx(key, opts);
  }
  shake(ms: number, intensity: number): void {
    if (!save.settings.screenShake || save.settings.reducedMotion) return;
    this.cameras.main.shake(ms, intensity);
  }
  /** A soft full-screen flash (at most 45% opaque) that fades out, instead of the camera's full-white flash. */
  flash(ms: number, r: number, g: number, b: number): void {
    if (!save.settings.flashes || save.settings.reducedMotion) return;
    const o = this.add.rectangle(W / 2, H / 2, W, H, Phaser.Display.Color.GetColor(r, g, b)).setAlpha(0.45).setDepth(1000);
    this.tweens.add({ targets: o, alpha: 0, duration: Math.max(200, ms * 1.4), ease: 'Quad.Out', onComplete: () => o.destroy() });
  }
  rumble(strength: number, ms: number): void {
    pad.rumble(strength, ms);
  }
  hurry(mult: number, sec: number): void {
    this.hurryMult = mult;
    this.hurryT = sec;
  }
  inWave(): boolean {
    return this.waveActive && !this.over;
  }

  hurrying(): boolean {
    return this.hurryT > 0;
  }
  cancelHurry(): void {
    this.hurryT = 0;
  }
  slammedAt(): number {
    return this.lastSlam;
  }
  order(p: Pizza, n: number): void {
    this.orders.set(p, (this.orders.get(p) ?? 0) + n);
  }
  possess(p: Pizza | null): void {
    if (!this.sys.isActive() && !this.sys.isPaused()) return;
    if (this.possessedPizza) {
      this.possessedPizza.flags.possessed = false;
      this.possessedPizza.redraw();
    }
    this.possessedPizza = p;
    if (p) {
      p.flags.possessed = true;
      this.fx.quip(p.x, p.surfaceY - 170, `${p.type.name.toUpperCase()} IS POSSESSED`, '#c9a8ff', 38);
      p.hurt();
    }
    this.recompute();
  }
  possessed(): Pizza | null {
    return this.possessedPizza;
  }
  bossPhases(): number {
    return this.run.heatDef.bossPhases + (this.plan && this.plan.loop > 0 ? 1 : 0);
  }
  heatCount(): number {
    return this.run.heatDef.count;
  }
  damageFoot(f: Foot, amount: number, label?: string): void {
    if (label) this.fx.quip(f.x, f.cy - 130, label, '#7dff9a', 40);
    this.dealDamage(f, amount, { source: 'direct', x: f.cx, y: f.cy });
  }

  // ——— Lifecycle ———
  init(data: GameStart): void {
    this.start = data ?? {};
  }

  create(): void {
    this.resetState();
    this.run.heat = this.start.snapshot?.heat ?? this.start.heat ?? save.heat;
    setRunHeat(this.run.heat);
    this.registry.set('traitIcons', save.settings.traitIcons);
    const bg = this.add.container(0, 0);
    const ambient = this.add.container(0, 0);
    this.underLayer = this.add.container(0, 0);
    this.pizzaLayer = this.add.container(0, 0);
    this.shadowLayer = this.add.container(0, 0);
    this.feetLayer = this.add.container(0, 0);
    this.fxLayer = this.add.container(0, 0);
    // scene-light colour grade: feet + pizzas pick up each location's lighting
    this.grade = this.add.rectangle(W / 2, H / 2, W, H, 0xffffff).setBlendMode(Phaser.BlendModes.MULTIPLY).setAlpha(0.28);
    this.children.moveBelow(this.grade, this.fxLayer);
    this.add.image(W / 2, H / 2, 'vignette').setDisplaySize(W, H);
    this.cursorLayer = this.add.container(0, 0);
    this.backdrop = new BackdropView(this, bg, ambient);
    this.fx = new Fx(this, this.fxLayer);
    this.director = new BossDirector(this);

    const snap = this.start.snapshot;
    if (snap) this.restore(snap);
    else {
      const slices = BASE_SLICES + (save.meta.pies ?? 0);
      const ids = this.start.act2 ? randomLineup(5) : this.start.lineup?.length ? this.start.lineup : randomLineup(save.meta.table ? 4 : 3);
      ids.forEach((id, i) => this.addPizza(id, slices, false, FRESH_START[i % FRESH_START.length]));
      this.layoutPizzas(false);
    }

    // cursor peel
    const peelDef = applyEquippedPeel(this, this.start.snapshot?.peel);
    this.peelTrailColor = peelTrail(peelDef);
    this.peelShiny = !!peelDef.shiny;
    this.peelId = peelDef.id;
    const wantAbility = this.start.snapshot?.ability ?? save.useAbility;
    this.ability = wantAbility && peelDef.id !== 'classic' ? abilityFor(peelDef.id) : null;
    this.abilityT = 0;
    // slam-related toppings and perks reword (and work) for the ability in use; meter boosts are only
    // useless for passives with no timer or chance to speed up
    setSlamMode(this.ability);
    this.events.once('shutdown', () => {
      setSlamMode(undefined);
      setRunHeat(null);
    });
    const t0 = this.ability?.trigger.t;
    this.run.slamless = { slam: false, meter: !!this.ability && (t0 === 'always' || t0 === 'wave' || t0 === 'stomp') };
    ui.hud.setSlamLabel(this.ability ? this.ability.name : null, this.ability ? abilityKindLabel(this.ability) : null);
    this.peel = this.add.image(W / 2, H / 2, 'peel').setOrigin(0.5, 100 / 360).setScale(0.62).setAngle(-28).setAlpha(0.95);
    if (this.peelShiny) this.peel.preFX?.addShine(0.6, 0.4, 3.5);
    this.cursorLayer.add(this.peel);

    if (!snap) {
      // meta perks at run start
      if (save.meta.headstart) {
        const rares = UPGRADES.filter((u) => u.rarity === 'rare' && kindOf(u) === 'permanent');
        this.run.owned[Phaser.Utils.Array.GetRandom(rares).id] = 1;
      }
      if (save.meta.preheat) this.run.super = 1;
      if (this.start.act2) this.act2Kit();
      if (this.start.tips) this.run.coins = this.start.tips;
    }
    this.recompute();

    // input
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.movePointer(p));
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.movePointer(p);
      this.smack(this.peelPos.x, this.peelPos.y);
    });
    window.addEventListener('keydown', this.keyHandler);
    document.addEventListener('visibilitychange', this.visHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      // nothing may touch pizzas or feet after this: the scene's objects are being torn down
      this.possessedPizza = null;
      this.over = true;
      this.director.clear(false);
      for (const p of this.pizzas) p.destroy();
      this.pizzas = [];
      window.removeEventListener('keydown', this.keyHandler);
      document.removeEventListener('visibilitychange', this.visHandler);
      ui.hud.setBoss(null);
      ui.hud.tutorial(false);
      pad.onPlay = null;
    });

    // HUD
    ui.closeAll();
    ui.showHud(true);
    ui.setPlaying(true);
    ui.hud.onPause = () => this.togglePause();
    ui.hud.onSlam = () => this.peelSlam();
    ui.hud.setOwned(this.run.owned);
    ui.hud.setCoins(this.run.coins);
    this.displayCoins = this.run.coins;
    ui.hud.setScore(this.run.score);
    ui.hud.setBoss(null);
    audio.duck(1);
    this.cameras.main.fadeIn(500, 18, 10, 6);
    this.tutorial = !save.tutorialDone && !snap && !this.start.act2;
    pad.onPlay = (ev) => this.padInput(ev);

    if (snap) {
      // resume in the shop of the wave that was cleared
      this.showLocation(snap.wave, true);
      const rs = snap.shop;
      const cards = rs?.cards.map((id) => UPGRADE_BY_ID[id]).filter(Boolean);
      this.freeRerollsLeft = rs ? rs.freeRerolls : this.run.stats.freeRerolls;
      const keep = rs && cards?.length ? { cards, sold: new Set(rs.sold), free: rs.free, goldenBought: rs.goldenBought } : undefined;
      this.time.delayedCall(500, () => this.openUpgrades(rs?.bossReward ?? isBossWave(snap.wave), keep, 'WELCOME BACK!'));
    } else if (this.start.act2) {
      this.run.wave = ACT_WAVES;
      this.showLocation(ACT_WAVES + 1, true);
      this.time.delayedCall(600, () => this.openUpgrades(false, undefined, 'ACT 2 · STOCK UP'));
    } else if (this.start.boss) {
      const id = this.start.boss.id;
      const t = FOOT_BY_ID[id];
      const wave = t?.minWave ?? 5;
      this.time.delayedCall(700, () => this.beginWave(wave, this.start.boss));
    } else {
      this.time.delayedCall(700, () => this.beginWave(this.start.wave ?? 1));
    }
  }

  private resetState(): void {
    this.run = new Run();
    this.dmgLog = {};
    this.tipLog = [];
    this.pizzas = [];
    this.feet = [];
    this.cutters = [];
    this.cutterCd = new WeakMap();
    this.garlicAuras = [];
    this.clickables = [];
    this.plan = null;
    this.waveActive = false;
    this.bossPending = false;
    this.bossFoot = null;
    this.miniFoot = null;
    this.over = false;
    this.paused = false;
    this.inUpgrade = false;
    this.displayCoins = 0;
    this.healCost = 30;
    this.reviveCost = 120;
    this.currentBackdrop = null;
    this.currentLocation = null;
    this.hitStop = 0;
    this.slowMo = 0;
    this.slamHinted = false;
    this.bossBonusGiven = false;
    this.possessedPizza = null;
    this.orders = new Map();
    this.peelStunT = 0;
    this.peelSlowT = 0;
    this.hurryT = 0;
    this.shop = null;
    this.tweens.timeScale = 1;
  }

  /** Act 2 starter kit: 5 pizzas (placed in create), ~6 toppings, and the tips a wave-30 run usually holds. */
  private act2Kit(): void {
    this.run.act2Start = true;
    const pool = UPGRADES.filter((u) => kindOf(u) === 'permanent' && (u.rarity === 'common' || u.rarity === 'rare'));
    for (let i = 0; i < 6; i++) {
      const u = Phaser.Utils.Array.GetRandom(pool);
      this.run.owned[u.id] = Math.min(u.max, (this.run.owned[u.id] ?? 0) + 1);
    }
    this.run.coins = 420;
    this.run.pizzasBought = 2;
  }

  // ——— Run save ———
  private snapshot(): RunSnapshot {
    const r = this.run;
    return {
      version: 1,
      heat: r.heat,
      act2Start: r.act2Start,
      wave: r.wave,
      score: r.score,
      coins: r.coins,
      owned: { ...r.owned },
      cooldowns: { ...r.cooldowns },
      armed: [...r.armed],
      super: r.super,
      rerollCost: r.rerollCost,
      healCost: this.healCost,
      reviveCost: this.reviveCost,
      reheatUses: r.reheatUses,
      bestCombo: r.bestCombo,
      feetSmacked: r.feetSmacked,
      bossesBeaten: [...r.bossesBeaten],
      firstKills: r.firstKills,
      slicesLost: r.slicesLost,
      pizzasBought: r.pizzasBought,
      eventCrusts: r.eventCrusts,
      bankedCrusts: r.bankedCrusts,
      goldenUsed: { ...r.goldenUsed },
      newUnlocks: [...r.newUnlocks],
      elapsed: (performance.now() - r.startTime) / 1000,
      secondChances: r.secondChances,
      rentedSpecial: r.rentedSpecial,
      pizzas: this.pizzas.map((p) => ({ id: p.type.id, slices: p.slices, max: p.maxSlices, fresh: p.fresh, dead: p.dead, flags: { ...p.flags, possessed: false } })),
      counter: this.shop?.counter ?? this.restoredShop?.counter ?? [],
      bossBonusGiven: this.bossBonusGiven,
      peel: this.peelId,
      ability: !!this.ability,
      shop: this.shop
        ? { cards: this.shop.cards.map((u) => u.id), sold: [...this.shop.sold], free: this.shop.free, bossReward: this.shop.bossReward, freeRerolls: this.freeRerollsLeft, goldenBought: this.shop.goldenBought }
        : this.restoredShop?.shop,
    };
  }

  private restore(s: RunSnapshot): void {
    const r = this.run;
    r.heat = s.heat;
    r.act2Start = s.act2Start;
    r.wave = s.wave;
    r.score = s.score;
    r.coins = s.coins;
    r.owned = { ...s.owned };
    r.cooldowns = { ...s.cooldowns };
    r.armed = [...s.armed];
    r.super = s.super;
    r.rerollCost = s.rerollCost;
    this.healCost = s.healCost;
    this.reviveCost = s.reviveCost;
    r.reheatUses = s.reheatUses;
    r.bestCombo = s.bestCombo;
    r.feetSmacked = s.feetSmacked;
    r.bossesBeaten = [...s.bossesBeaten];
    r.firstKills = s.firstKills;
    r.slicesLost = s.slicesLost;
    r.pizzasBought = s.pizzasBought;
    r.eventCrusts = s.eventCrusts;
    r.bankedCrusts = s.bankedCrusts ?? 0;
    r.goldenUsed = { ...s.goldenUsed };
    r.newUnlocks = [...s.newUnlocks];
    r.startTime = performance.now() - s.elapsed * 1000;
    r.secondChances = s.secondChances;
    r.rentedSpecial = s.rentedSpecial;
    this.bossBonusGiven = s.bossBonusGiven;
    this.restoredShop = { counter: s.counter, shop: s.shop };
    for (const ps of s.pizzas) {
      if (!PIZZA_BY_ID[ps.id]) continue;
      const p = this.addPizza(ps.id, ps.max, false, ps.fresh, true);
      p.alive = p.alive.map((_, i) => i < ps.slices);
      p.dead = ps.dead || ps.slices === 0;
      p.flags = { ...(ps.flags ?? {}) };
      p.redraw();
    }
    this.layoutPizzas(false);
  }

  private saveRun(): void {
    save.run = this.snapshot();
    persist();
  }

  // ——— Pizzas ———
  private addPizza(id: string, slices: number, animate: boolean, fresh?: number, exact = false): Pizza {
    const type = PIZZA_BY_ID[id];
    let n = exact ? slices : type.perk === 'slices' ? slices + 4 : type.perk === 'bossRegrow' ? Math.max(4, slices - 2) : slices;
    n = Math.max(1, n);
    const p = new Pizza(this, this.pizzaLayer, type, W / 2, PIZZA_Y, 0.8, n);
    p.freshOn = this.run.heatDef.freshness > 0 && type.perk !== 'neverStale';
    p.maxFresh = 10 + (this.run.stats?.freshBonus ?? 0);
    p.setFresh(fresh ?? p.maxFresh);
    if (type.perk === 'rotate' && p.flags.season === undefined) p.flags.season = 0;
    this.pizzas.push(p);
    if (animate) {
      p.root.setScale(0).setY(PIZZA_Y - 200);
      this.tweens.add({ targets: p.root, scale: 1, y: PIZZA_Y, duration: 700, ease: 'Bounce.Out' });
    }
    return p;
  }

  layoutPizzas(animate = true): void {
    const n = this.pizzas.length;
    // a full table pulls in a little so the end pizzas' captions clear the corner buttons
    const spacing = Math.min(520, (n >= 5 ? 1560 : 1700) / n);
    const s = Math.min(0.82, (spacing / 496) * 0.92);
    this.pizzas.forEach((p, i) => p.layout(W / 2 + (i - (n - 1) / 2) * spacing, s, animate));
  }

  private neighbours(p: Pizza): Pizza[] {
    const sorted = [...this.pizzas].sort((a, b) => a.x - b.x);
    const i = sorted.indexOf(p);
    return [sorted[i - 1], sorted[i + 1]].filter((q): q is Pizza => !!q && !q.dead);
  }

  private recompute(): void {
    const perks = this.alivePizzas()
      .filter((p) => p !== this.possessedPizza)
      .map((p) => p.perk)
      .filter((x): x is PizzaPerk => !!x);
    // always-on peel abilities change stats before the caps are applied
    const extra: Record<string, number> = {};
    if (this.ability?.trigger.t === 'always') for (const e of this.ability.fx) if (e.e === 'stat') for (const [k, v] of Object.entries(e.mods)) extra[k] = (extra[k] ?? 0) + (v as number);
    this.run.recompute(perks, extra);
    // the Ghost's possession inverts the haunted pizza's perk
    const inv = this.possessedPizza?.perk;
    if (inv) {
      const s = this.run.stats;
      if (inv === 'coins' || inv === 'luck' || inv === 'coinsWave' || inv === 'quickTips') s.coinMult = Math.max(0.2, s.coinMult - 0.2);
      else if (inv === 'damage' || inv === 'critDmg' || inv === 'bigHurt' || inv === 'bossDmg') s.damage *= 0.9;
      else if (inv === 'crit') s.critChance = Math.max(0, s.critChance - 0.06);
      else s.damage *= 0.95;
    }
    for (const p of this.pizzas) {
      p.maxFresh = 10 + this.run.stats.freshBonus;
      if (p.fresh > p.maxFresh) p.setFresh(p.maxFresh);
    }
    const timers = new Map(this.procs.map((x) => [x.id, x.t]));
    this.procs = Object.entries(this.run.owned)
      .map(([id, lvl]) => ({ u: UPGRADE_BY_ID[id], lvl }))
      .filter((x) => x.u?.proc && x.lvl > 0)
      .map((x) => ({ id: x.u.id, p: scaleProc(x.u.proc!, x.lvl), t: timers.get(x.u.id) ?? 0 }));
    this.syncCutters();
    this.syncGarlic();
  }

  // ——— Waves ———
  private showLocation(n: number, immediate: boolean): void {
    const bd = backdropFor(n);
    const loc = locationFor(n);
    if (bd !== this.currentBackdrop) {
      const fade = this.currentBackdrop && !immediate ? 1600 : 0;
      this.backdrop.show(bd, fade);
      this.tintGrade(BACKDROPS[bd].light, fade);
      this.currentBackdrop = bd;
    }
    if (!isBossWave(n) && this.currentLocation !== loc) {
      this.currentLocation = loc;
      audio.music(this, LOCATION_MUSIC[loc], immediate ? 600 : 1800);
      audio.ambience(this, LOCATION_AMBIENCE[loc], immediate ? 800 : 2400);
    }
    ui.hud.setWave(n, BACKDROPS[bd].name);
  }

  private beginWave(n: number, devBoss?: { id: string; hp?: number }): void {
    if (this.over) return;
    this.run.wave = n;
    this.plan = planWave(n, this.run.stats.luck, this.run.heat);
    if (devBoss) {
      const t = FOOT_BY_ID[devBoss.id];
      if (t?.boss) this.plan.boss = devBoss.id;
      if (t?.mini) {
        this.plan.mini = devBoss.id;
        // dev shortcut: the mini-boss arrives straight away
        this.time.delayedCall(1500, () => {
          if (this.miniSpawned) return;
          this.spawnMini(devBoss.id);
          if (devBoss.hp && this.miniFoot) {
            this.miniFoot.hp = Math.round(this.miniFoot.maxHp * devBoss.hp);
            this.director.afterDamage(this.miniFoot, true);
            ui.hud.setBoss(this.miniFoot.type.name, this.miniFoot.hp / this.miniFoot.maxHp, this.director.phaseCount(this.miniFoot), this.miniFoot.phase);
          }
        });
      }
    }
    this.planSize = this.plan.queue.length;
    this.spawnT = 1.2;
    this.goldenSpawned = false;
    this.miniSpawned = false;
    this.miniFoot = null;
    this.waveSlicesLost = 0;
    this.orders.clear();
    this.freeRerollsLeft = this.run.stats.freeRerolls;
    this.abilityWaveStart();
    this.coinsAtWaveStart = this.run.coins;
    const st = this.run.stats;
    for (const p of this.alivePizzas()) {
      p.setShield(st.shields + (p.perk === 'shield' ? 1 : 0));
      p.setTraps(st.traps);
      p.flags.markedWave = false;
      p.flags.bounced = false;
      p.flags.grandma = false;
    }
    // Grandma Square guards both neighbours' first stomp each wave
    for (const p of this.alivePizzas()) if (p.perk === 'neighbourShield') for (const q of this.neighbours(p)) q.flags.grandma = true;
    this.run.super = Math.max(this.run.super, st.superStart);
    // a passive on a timer gets its head start (S'mores, Pre-Heated Peel) as timer progress
    if (this.ability?.trigger.t === 'every') this.abilityT = Math.max(this.abilityT, this.ability.trigger.sec * Math.min(1, this.run.super));
    const boss = isBossWave(n);
    this.waveEvent = boss || isMiniWave(n) ? null : rollEvent(EVENT_RATE[this.run.heat]);
    this.eventStarted = false;

    const bd = backdropFor(n);
    const loc = locationFor(n);
    const locChanged = this.currentLocation !== loc;
    this.showLocation(n, false);
    if (n === ACT_WAVES + 1 && loopOf(n) === 0 && !this.run.act2Start) this.time.delayedCall(200, () => ui.hud.banner('ACT 2', 'The journey goes on', 'loc'));
    if (boss) {
      const id = this.plan.boss as ArenaId;
      audio.music(this, bossMusic(id), 1500);
      audio.sfx('sfx_warning');
      this.flash(400, 255, 40, 20);
      this.shake(600, 0.006);
      ui.hud.banner('BOSS INCOMING!', FOOT_BY_ID[id]?.name ?? 'BOSS', 'boss');
      this.bossPending = true;
      this.time.delayedCall(2600, () => this.spawnBoss(id, devBoss?.hp));
      this.waveActive = true;
    } else {
      if (locChanged && n > 1) {
        ui.hud.banner(BACKDROPS[loc].name, 'NEW LOCATION', 'loc');
        audio.sfx('sfx_levelup', { volume: 0.6 });
        this.time.delayedCall(2300, () => ui.hud.banner(`WAVE ${n}`, this.waveSubtitle(n)));
        this.time.delayedCall(2300, () => (this.waveActive = true));
        this.preloadNext(n);
        void bd;
        return;
      }
      ui.hud.banner(`WAVE ${n}`, this.waveSubtitle(n));
      this.waveActive = true;
      if (this.tutorial && n === 1) this.time.delayedCall(1200, () => this.tutorial && ui.hud.tutorial(true));
    }
    this.preloadNext(n);
  }

  private tintGrade(hex: string, ms: number): void {
    const to = Phaser.Display.Color.HexStringToColor(hex);
    const from = Phaser.Display.Color.IntegerToColor(this.grade.fillColor);
    if (!ms) {
      this.grade.setFillStyle(to.color);
      return;
    }
    this.tweens.addCounter({
      from: 0,
      to: 100,
      duration: ms,
      onUpdate: (tw) => {
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(from, to, 100, tw.getValue() ?? 0);
        this.grade.setFillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
      },
    });
  }

  private waveSubtitle(n: number): string {
    const inLoop = ((n - 1) % JOURNEY_WAVES) + 1;
    const fresh = Object.values(FOOT_BY_ID).filter((f) => !f.boss && !f.mini && f.weight > 0 && f.minWave === inLoop);
    if (fresh.length) {
      const names = fresh.map((f) => f.name);
      return names.length > 2 ? `New: ${names.slice(0, 2).join(', ')} +${names.length - 2}` : `New: ${names.join(', ')}`;
    }
    if (isMiniWave(n)) return 'A mini-boss is coming…';
    if (isBossWave(n + 1)) return 'Boss next wave!';
    return `${this.plan!.queue.length} hungry feet`;
  }

  private preloadNext(n: number): void {
    const next = n + 1;
    const keys: string[] = [];
    if (isBossWave(next)) keys.push(...bossMusic(backdropFor(next) as ArenaId));
    const nl = locationFor(next + (isBossWave(next) ? 1 : 0));
    keys.push(...LOCATION_MUSIC[nl], ...LOCATION_AMBIENCE[nl]);
    audio.preload(this, keys.filter((k) => audio.has(k)).slice(0, 4));
  }

  private spawnBoss(id: string, hpFrac?: number): void {
    if (this.over) return;
    const target = Phaser.Utils.Array.GetRandom(this.alivePizzas());
    if (!target) {
      this.time.delayedCall(500, () => this.spawnBoss(id, hpFrac));
      return;
    }
    this.bossPending = false;
    if (!FOOT_BY_ID[id]) return;
    const f = this.spawnFoot(FOOT_BY_ID[id], target, false);
    if (hpFrac) f.hp = Math.round(f.maxHp * hpFrac);
    this.bossFoot = f;
    this.bossSummonT = 4;
    this.director.attach(f);
    // phase 1 gets its own introduction: what the boss does first and how to answer it
    this.director.afterDamage(f, true);
    this.shake(900, 0.01);
    this.rumble(1, 400);
    audio.sfx('sfx_stomp');
    ui.hud.setBoss(FOOT_BY_ID[id].name, f.hp / f.maxHp, this.director.phaseCount(f), f.phase);
    // the current phase gets its own introduction (after the first-time phases card, if that shows)
    const mv = this.director.moveOf(f);
    this.introCard('phases', () => {
      if (mv && f.alive) this.banner(`PHASE ${f.phase}`, mv.name, 'phase', mv.info);
    });
  }

  private spawnMini(id: string): void {
    const t = FOOT_BY_ID[id];
    if (!t) {
      this.miniSpawned = true;
      return;
    }
    const target = this.pickTarget(null);
    if (!target) return;
    this.miniSpawned = true;
    const f = this.spawnFoot(t, target, false);
    f.maxHp = f.hp = Math.round(f.maxHp * (1 - this.run.stats.miniWeak));
    this.miniFoot = f;
    this.director.attach(f);
    audio.sfx('sfx_miniboss');
    audio.duck(0.75);
    this.time.delayedCall(1500, () => !this.paused && audio.duck(1));
    const mv = this.director.moveOf(f);
    ui.hud.setBoss(t.name, 1, this.director.phaseCount(f));
    this.introCard('mini', () => {
      if (mv && f.alive) this.banner('MINI-BOSS!', `${t.name} · ${mv.name}`, 'boss', mv.info);
      else ui.hud.banner('MINI-BOSS!', t.name, 'boss');
    });
  }

  private spawnFoot(type: FootType, target: Pizza | null, allowElite = true, x?: number): Foot {
    const plan = this.plan!;
    const elite = allowElite && !type.boss && !type.mini && type.id !== 'golden' && Math.random() < plan.eliteChance;
    const hpMult = (type.boss || type.mini ? plan.bossHpMult : plan.hpMult) * this.run.stats.footHp;
    const f = new Foot(this, this.feetLayer, this.shadowLayer, type, x ?? target?.x ?? W / 2, {
      hpMult,
      speedMult: plan.speedMult * this.run.stats.speedMult,
      elite,
      hooks: {
        onStomp: (ft) => this.onStomp(ft),
        pickTarget: (ft) => this.pickTarget(ft),
        onEscape: (ft) => {
          this.fx.quip(ft.x, 260, 'IT GOT AWAY!', '#ffd23f', 46);
          audio.sfx('sfx_whoosh');
        },
        canDescend: (ft) => this.laneFor(ft),
        onTrait: (ft, trait) => this.onTrait(ft, trait),
        onTick: (ft, dt) => this.footTick(ft, dt),
      },
    });
    f.target = target;
    this.feet.push(f);
    // a rare shiny: any regular foot, never a boss, mini-boss or a boss's stand-in
    if (!type.boss && !type.mini && !this.tutorial && Math.random() < SHINY_FOOT_CHANCE * this.shinyBoost) {
      f.makeShiny();
      this.time.delayedCall(250, () => {
        if (!f.alive) return;
        this.fx.quip(f.x, Math.max(140, f.cy - 120), 'SHINY!', '#fff6c0', 46);
        this.fx.glint(f.cx, f.cy, 12);
        audio.sfx('sfx_levelup', { volume: 0.45, rate: 1.4 });
      });
    }
    // first sighting: a NEW FOOT card with its ability and how to beat it
    if (markFootSeen(type.id) && !type.boss) {
      const wait = ui.hud.newFoot(footPortraitURL(type.id), type, type.mini ? 'NEW MINI-BOSS' : 'NEW FOOT');
      // the slow-down lands when the card appears (it waits for any centre banner first)
      if (save.settings.slowNewCards && !save.settings.reducedMotion && (this.run.heat === 'mild' || this.run.heat === 'regular')) {
        window.setTimeout(() => {
          if (this.sys.isActive() && !this.over) this.slowMo = Math.max(this.slowMo, 0.6);
        }, wait);
      }
    }
    return f;
  }

  private onTrait(ft: Foot, trait: string): void {
    if (trait === 'switch') {
      this.fx.quip(ft.x, ft.cy - 120, 'SWITCH!', '#39ff88', 38);
      audio.sfx('sfx_whoosh', { volume: 0.6, rate: 1.3 });
    } else if (trait === 'clumsy') {
      this.fx.quip(ft.x, ft.cy - 120, 'WHOOPS!', '#ffe14d', 38);
      this.fx.puff(ft.x, ft.y, 6);
      audio.sfx('sfx_boing', { volume: 0.5, rate: 1.2 });
    } else if (trait === 'hop') {
      this.fx.quip(ft.x, ft.cy - 120, 'BOING!', '#ffd23f', 38);
      audio.sfx('sfx_boing', { volume: 0.6, rate: 1.4 });
    } else if (trait === 'surface') {
      this.fx.puff(ft.x, ft.y, 10);
      this.fx.quip(ft.x, ft.cy - 120, 'SURPRISE!', '#f8dca0', 36);
    } else if (trait === 'guardDown') {
      this.fx.quip(ft.x, ft.cy - 140, 'SHIELD DOWN!', '#9ad8ff', 32);
      this.fx.ring(ft.cx, ft.cy, 0x9ad8ff, 0.7, 0.8);
    }
  }

  /** Per-frame trait upkeep: magnets pull the peel, medics heal, Tandoori marks. */
  private footTick(f: Foot, dt: number): void {
    if (f.shiny && Math.random() < dt * 9) this.fx.glint(f.cx + (Math.random() - 0.5) * 90 * f.scale, f.cy + (Math.random() - 0.5) * 120 * f.scale);
    if (f.has('magnet') && (f.state === 'hover' || f.state === 'descend')) {
      const dx = f.cx - this.peelPos.x;
      const dy = f.cy - this.peelPos.y;
      const d = Math.hypot(dx, dy);
      if (d < 520 && d > 30) {
        this.pointer.x += (dx / d) * 70 * dt;
        this.pointer.y += (dy / d) * 70 * dt;
      }
    }
    if (f.has('medic') && Math.random() < dt * 2) {
      for (const o of this.feet) {
        if (o === f || !o.alive || o.isBossLike || Math.abs(o.x - f.x) > 320 || o.hp >= o.maxHp) continue;
        o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.06);
        this.fx.healBurst(o.cx, o.cy);
      }
    }
    const t = f.target;
    if (t && !t.dead && t.perk === 'markFirst' && !t.flags.markedWave && !f.isBossLike) {
      t.flags.markedWave = true;
      f.brain.marked = true;
      f.tint(0xffb070);
      this.fx.quip(f.x, f.cy - 130, 'MARKED: DOUBLE DAMAGE', '#ff8a3d', 32);
    }
  }

  /** Lanes per pizza: two side-by-side when the table is roomy, one when it's crowded. */
  private lanesFor(p: Pizza): number[] {
    const spacing = this.pizzas.length > 1 ? Math.abs(this.pizzas[1].x - this.pizzas[0].x) : 600;
    if (spacing < 450) return [0];
    const off = Math.min(110, p.radius * 0.62);
    return [-off, off];
  }

  private laneFor(f: Foot): number | null {
    const p = f.target;
    // King Honk's shuffled shoes take turns on a shared pizza, so they never land on top of each other
    if (p && f.laneX !== null && this.feet.some((o) => o !== f && o.alive && o.laneX !== null && o.target === p && (o.state === 'descend' || o.state === 'stomp'))) return null;
    if (!p || f.isBossLike) return 0;
    const divers = this.feet.filter((o) => o !== f && o.alive && o.target === p && (o.state === 'descend' || o.state === 'stomp'));
    if (divers.some((o) => o.isBossLike)) return null;
    const lanes = this.lanesFor(p);
    const free = lanes.filter((l) => !divers.some((o) => Math.abs(o.slot - l) < 1));
    if (!free.length) return null;
    return free.sort((a, b) => Math.abs(p.x + a - f.x) - Math.abs(p.x + b - f.x))[0];
  }

  private pickTarget(f: Foot | null): Pizza | null {
    const alive = this.alivePizzas();
    if (!alive.length) return null;
    // Short-Order Shoe: the next few feet all go for the ordered pizza
    for (const [p, n] of this.orders) {
      if (n > 0 && !p.dead && (!f || f.state === 'enter')) {
        this.orders.set(p, n - 1);
        return p;
      }
    }
    const load = (p: Pizza) => this.feet.filter((o) => o !== f && o.alive && o.target === p).reduce((n, o) => n + (o.isBossLike ? 3 : 1), 0);
    const sorted = [...alive].sort((a, b) => load(a) - load(b) + (Math.random() - 0.5) * 1.2);
    return sorted[0];
  }

  private aliveFeet(): Foot[] {
    return this.feet.filter((f) => f.alive);
  }

  private spawnTick(dt: number): void {
    const plan = this.plan;
    if (!plan || !this.waveActive) return;
    this.spawnT -= dt;
    const alive = this.aliveFeet().length;
    if (this.spawnT <= 0 && plan.queue.length && alive < plan.maxAlive) {
      const id = plan.queue.shift()!;
      const type = FOOT_BY_ID[id];
      if (type.traits.includes('swarm')) {
        let extra = 0;
        while (plan.queue[0] === id && extra < 2) {
          plan.queue.shift();
          extra++;
        }
        for (let i = 0; i <= extra; i++) {
          const baby = this.spawnFoot(type, this.pickTarget(null));
          baby.y -= i * 90;
        }
      } else this.spawnFoot(type, this.pickTarget(null));
      this.spawnT = plan.interval * (0.7 + Math.random() * 0.6) * (this.bossFoot ? 2.2 : 1);
    }
    // mini-boss arrives partway through wave 3 of each stage
    if (plan.mini && !this.miniSpawned && plan.queue.length <= this.planSize * 0.55) this.spawnMini(plan.mini);
    // wave event
    if (this.waveEvent && !this.eventStarted && plan.queue.length <= this.planSize * 0.7) {
      this.eventStarted = true;
      this.startWaveEvent(this.waveEvent);
    }
    // golden foot bonus
    if (plan.golden && !this.goldenSpawned && plan.queue.length < 6) {
      this.goldenSpawned = true;
      const t = this.pickTarget(null);
      if (t) {
        this.spawnFoot(FOOT_BY_ID.golden, t, false);
        audio.sfx('sfx_combo', { rate: 1.3 });
        this.fx.quip(t.x, 220, 'GOLDEN FOOT!', '#ffd23f', 50);
      }
    }
    // boss summons reinforcements
    const boss = this.bossFoot;
    if (boss && boss.alive) {
      this.bossSummonT -= dt;
      if (this.bossSummonT <= 0 && alive < plan.maxAlive + 1) {
        this.bossSummonT = boss.brain.summonFast ? 3.2 : 6.5;
        const minion = BOSS_MINION[boss.type.id] ?? 'bob';
        const t = this.pickTarget(null);
        if (t && FOOT_BY_ID[minion]) this.spawnFoot(FOOT_BY_ID[minion], t, false);
      }
    }
  }

  private startWaveEvent(id: EventId): void {
    startEvent(this, id, {
      tips: (n, x, y) => this.giveTips(Math.round(n * this.run.heatDef.tips), x, y),
      heal: (n) => {
        const ps = [...this.alivePizzas()].sort((a, b) => a.slices / a.maxSlices - b.slices / b.maxSlices);
        if (ps[0]) this.healPizza(ps[0], n);
      },
      slam: (frac) => {
        if (this.ability?.trigger.t === 'every') this.abilityT += this.ability.trigger.sec * frac;
        else if (this.ability && !usesMeter(this.ability)) this.giveTips(15, W / 2, 300);
        else this.run.super = Math.min(1, this.run.super + frac);
      },
      crust: (n, x, y) => {
        const cap = Math.round(EVENT_CRUST_CAP * this.run.heatDef.crusts);
        const got = Math.max(0, Math.min(n, cap - this.run.eventCrusts));
        this.run.eventCrusts += got;
        this.run.bank(got);
        persist();
        if (got) this.fx.coinFlight(x, y, got * 3, ui.hud.coinTarget(), () => audio.sfx('sfx_coin', { throttle: 30 }));
        return got;
      },
      consumable: () => this.freeConsumable(),
      spawnMimic: (x) => {
        const t = this.pickTarget(null);
        if (FOOT_BY_ID.mimic) {
          const m = this.spawnFoot(FOOT_BY_ID.mimic, t, false, x);
          m.y = 500;
          m.setState('hover');
        }
      },
      done: (ev, x, y) => {
        save.eventsDone[ev] = (save.eventsDone[ev] ?? 0) + 1;
        const drop = rollEventDrop(ev);
        if (drop) {
          this.fx.glint(x, y, 30);
          this.fx.quip(x, y - 150, drop.drop!.chance < 0.01 ? 'ULTRA RARE DROP!' : 'SHINY DROP!', '#fff6c0', 50);
        }
        this.peelToasts([...(drop ? [drop] : []), ...checkPeelAchievements()]);
        persist();
      },
      firstSighting: (ev) => {
        if (save.seenEvents.includes(ev)) return;
        save.seenEvents.push(ev);
        persist();
        ui.hud.toast(null, 'NEW EVENT', `${eventName(ev)}: smack it if you can spare the time`);
        this.introCard('events');
      },
    });
  }

  private giveTips(n: number, x: number, y: number): void {
    if (n <= 0) return;
    this.run.coins += n;
    const flights = Math.min(n, 8);
    this.fx.coinFlight(x, y, flights, ui.hud.coinTarget(), () => {
      this.displayCoins = Math.min(this.run.coins, this.displayCoins + n / flights);
      audio.sfx('sfx_coin', { throttle: 40, jitter: 0.15 });
    });
    this.fx.number(x, y - 40, n, 'coin');
  }

  /** A free consumable: applied now if it's an instant one, otherwise armed. */
  private freeConsumable(): void {
    const cons = UPGRADES.filter((u) => kindOf(u) === 'consumable' && this.run.offerable(u, this.run.wave));
    const u = cons.length ? Phaser.Utils.Array.GetRandom(cons) : null;
    if (!u) {
      this.giveTips(30, W / 2, 400);
      return;
    }
    this.applyUpgrade(u);
    ui.hud.toast(null, 'FREE CONSUMABLE', `${u.name}: ${u.desc(1)}`);
  }

  private checkWaveEnd(): void {
    if (!this.waveActive || this.bossPending || !this.plan) return;
    if (this.plan.queue.length) return;
    if (this.plan.mini && !this.miniSpawned) return;
    if (this.aliveFeet().length) return;
    if (this.plan.golden && !this.goldenSpawned) return;
    this.waveClear();
  }

  private waveClear(): void {
    this.waveActive = false;
    const n = this.run.wave;
    const stage = STAGES[Math.floor((n - 1) / WAVES_PER_STAGE) % STAGES.length];
    if (stage) save.stageWaves[stage.location] = (save.stageWaves[stage.location] ?? 0) + 1;
    for (const p of this.alivePizzas()) save.pizzaWaves[p.type.id] = (save.pizzaWaves[p.type.id] ?? 0) + 1;
    const eqId = this.peelId;
    save.peelBest[eqId] = Math.max(save.peelBest[eqId] ?? 0, n);
    this.time.delayedCall(1200, () => this.peelToasts(checkPeelAchievements()));
    const boss = isBossWave(n);
    if (this.tutorial) {
      this.tutorial = false;
      save.tutorialDone = true;
      ui.hud.tutorial(false);
    }
    this.run.combo = 0;
    this.clickables = [];
    const perfect = this.waveSlicesLost === 0;
    const bonus = Math.round((5 + n * 2 + this.run.stats.coinsPerWave) * (perfect ? 1.5 : 1) * this.run.heatDef.tips);
    this.run.coins += bonus;
    this.tipLog.push({ wave: n, earned: this.run.coins - this.coinsAtWaveStart, spent: Math.max(0, this.coinsAtLastClear - this.coinsAtWaveStart) });
    this.coinsAtLastClear = this.run.coins;
    if (perfect) this.addScore(500 * n, false);
    audio.sfx('sfx_levelup');
    const crustNote = boss && this.lastBossCrusts ? ` · +${this.lastBossCrusts} Golden Crusts` : perfect ? ' · no slices lost' : '';
    this.lastBossCrusts = 0;
    ui.hud.banner(boss ? 'BOSS DEFEATED!' : perfect ? 'PERFECT!' : 'WAVE CLEAR!', `+${bonus} tips${crustNote}`, 'clear');
    const target = ui.hud.coinTarget();
    this.fx.coinFlight(W / 2, 420, Math.min(12, bonus), target, () => {
      this.displayCoins = Math.min(this.run.coins, this.displayCoins + bonus / Math.min(12, bonus));
      audio.sfx('sfx_coin', { throttle: 30 });
    });
    // regrowth
    const st = this.run.stats;
    for (const p of this.alivePizzas()) {
      const amt = st.regenPerWave + st.regenAll;
      if (amt > 0) this.healPizza(p, amt);
    }
    for (let i = 0; i < st.healWeakest; i++) {
      const weakest = [...this.alivePizzas()].sort((a, b) => a.slices / a.maxSlices - b.slices / b.maxSlices)[0];
      if (weakest) this.healPizza(weakest, 1);
    }
    this.tickFreshness();
    // Quattro Stagioni turns to its next season
    for (const p of this.alivePizzas()) if (p.type.perk === 'rotate') {
      p.flags.season = (Number(p.flags.season ?? 0) + 1) % 4;
      p.redraw();
    }
    this.recompute();
    const best = save.best[this.run.heat] ?? { score: 0, wave: 0 };
    if (!this.run.act2Start && n > best.wave) save.best[this.run.heat] = { ...best, wave: n };
    if (n > save.bestWave) save.bestWave = n;
    persist();
    this.checkMilestones();
    const journeyDone = boss && n % JOURNEY_WAVES === 0;
    if (journeyDone) {
      this.time.delayedCall(2400, () => this.victory());
      return;
    }
    this.time.delayedCall(boss ? 2400 : 1700, () => this.openUpgrades(boss));
  }

  /** Each wave every pizza loses a little freshness; stale pizzas lose their perk and a slice a wave. */
  private tickFreshness(): void {
    const drainBase = this.run.heatDef.freshness;
    if (drainBase <= 0) return;
    let anyLow = false;
    for (const p of this.alivePizzas()) {
      if (!p.freshOn) continue;
      if (p.stale) {
        const removed = p.takeSlices(1, p.x);
        this.run.slicesLost += removed.length;
        this.fx.quip(p.x, p.surfaceY - 130, 'STALE: -1 SLICE', '#cfe0a8', 32);
        if (p.dead) this.pizzaDestroyed(p);
        continue;
      }
      const pickled = this.neighbours(p).some((q) => q.perk === 'preserve');
      let drain = drainBase * (pickled ? 0.5 : 1);
      // fractional drain (Inferno 1.5x, Pickle Pie 0.5x) accumulates
      const acc = Number(p.flags.freshAcc ?? 0) + drain;
      drain = Math.floor(acc);
      p.flags.freshAcc = acc - drain;
      if (!drain) continue;
      const before = p.fresh;
      p.setFresh(p.fresh - drain);
      if (p.fresh <= 3 && p.fresh > 0) anyLow = true;
      if (before > 0 && p.fresh <= 0) {
        if (this.run.armed.includes('leftovers')) {
          this.run.consume('leftovers');
          p.setFresh(4);
          this.fx.quip(p.x, p.surfaceY - 150, 'LEFTOVERS BOX: +4 FRESH', '#7dff9a', 34);
          continue;
        }
        audio.sfx('sfx_stale');
        ui.hud.toast(pizzaPortraitURL(p.type.id), 'PIZZA WENT STALE', `${p.type.name}: perk off, -1 slice a wave. Reheat it at the counter.`);
        if (p.type.perk === 'staleHeal' && !p.flags.staleHealed) {
          p.flags.staleHealed = true;
          for (const q of this.alivePizzas()) this.healPizza(q, 2);
          this.fx.quip(p.x, p.surfaceY - 170, 'PIZZA FRITTA: +2 SLICES FOR ALL', '#7dff9a', 34);
        }
      }
    }
    if (anyLow) this.introCard('freshness');
  }

  private healPizza(p: Pizza, n: number): void {
    const healed = p.heal(n);
    if (healed) {
      this.fx.healBurst(p.x, p.surfaceY - 20);
      this.fx.number(p.x, p.surfaceY - 60, healed, 'heal');
      audio.sfx('sfx_heal', { throttle: 80 });
    }
  }

  // ——— Shop ———
  private pizzaPrice(): number {
    const base = 100 + 50 * this.run.pizzasBought + 8 * this.run.wave;
    return Math.round((base * (1 - this.run.stats.counterDiscount)) / 5) * 5;
  }

  private reheatCost(): number {
    return Math.round((this.pizzaPrice() * 0.4) / 5) * 5;
  }

  /** Two pizzas from your unlocked pool, plus sometimes a locked "Chef's Special" you can rent. */
  private rollCounterOffers(): { id: string; name: string; perk: string; cost: number; trial: boolean }[] {
    const onTable = new Set(this.pizzas.map((p) => p.type.id));
    const price = this.pizzaPrice();
    const owned = Phaser.Utils.Array.Shuffle(save.unlockedPizzas.filter((id) => !onTable.has(id) && PIZZA_BY_ID[id]));
    const offers = owned.slice(0, 2).map((id) => ({ id, name: PIZZA_BY_ID[id].name, perk: PIZZA_BY_ID[id].perkText, cost: price, trial: false }));
    const locked = PIZZAS.filter((p) => !save.unlockedPizzas.includes(p.id) && !onTable.has(p.id))
      .sort((a, b) => a.cost - b.cost)
      .slice(0, 10);
    if (locked.length && (offers.length < 2 || Math.random() < 0.5)) {
      const p = Phaser.Utils.Array.GetRandom(locked);
      offers.push({ id: p.id, name: p.name, perk: p.perkText, cost: Math.round((price * 1.5) / 5) * 5, trial: true });
    }
    return offers;
  }

  private openUpgrades(bossReward: boolean, keepCards?: { cards: Upgrade[]; sold: Set<string>; free: string | null; goldenBought?: GoldenItem['id'] }, title?: string): void {
    if (this.over) return;
    this.inUpgrade = true;
    ui.setPlaying(false);
    audio.duck(0.55);
    this.displayCoins = this.run.coins;
    const count = 3 + (save.meta.indecisive ? 1 : 0);
    const tableFull = this.pizzas.length >= MAX_PIZZAS && !this.pizzas.some((p) => p.dead);
    const exclude = tableFull ? ['helping'] : [];
    let cards = keepCards?.cards;
    let free = keepCards?.free ?? null;
    if (!cards) {
      cards = bossReward ? this.run.rollBossChoices(count, exclude) : this.run.rollChoices(count, exclude);
      // boss loot: one epic-or-better pick is free · Birthday Cake: every 5th wave a random card is free
      if (bossReward && cards.length) free = cards[0].id;
      else if (this.run.stats.freeTopping && this.run.wave % 5 === 4 && cards.length) free = Phaser.Utils.Array.GetRandom(cards).id;
    }
    const restored = this.restoredShop?.counter.length ? this.restoredShop.counter : null;
    const counter = this.shop?.counter && this.shop.state.wave === this.run.wave ? this.shop.counter : restored ?? this.rollCounterOffers();
    this.restoredShop = null;
    this.shop = { el: null as unknown as HTMLElement, state: null as unknown as ShopState, cards, sold: keepCards?.sold ?? new Set(), free, bossReward, counter, goldenBought: keepCards?.goldenBought };
    this.saveRun();
    const state = this.shopState(title);
    this.shop.state = state;
    this.shop.el = ui.shop(state, {
      buy: (id) => this.shopBuy(id),
      reroll: () => this.shopReroll(),
      heal: () => this.shopHeal(),
      rebake: () => this.shopRebake(),
      reheat: () => this.shopReheat(),
      buyPizza: (id) => this.shopBuyPizza(id),
      golden: (id) => this.shopGolden(id),
      next: () => this.shopNext(),
    });
    this.introCard('shop');
    if (cards.some((u) => kindOf(u) !== 'permanent')) this.introCard('kinds');
    if (save.crusts >= 25 && this.shop.state.golden.some((g) => g.available)) this.introCard('golden');
  }

  private shopState(title?: string): ShopState {
    const r = this.run;
    const sh = this.shop!;
    const cards: ShopCard[] = sh.cards.map((u) => {
      const lvl = r.level(u.id);
      const k = kindOf(u);
      return {
        id: u.id,
        name: u.name,
        icon: u.icon,
        rarity: u.rarity,
        kind: k,
        desc: u.desc(lvl + 1),
        downside: u.downside,
        lvl: k === 'consumable' ? 'One use, back in 3 waves' : k === 'unique' ? 'Once per run' : lvl ? `LV ${lvl} → ${lvl + 1}` : 'NEW',
        price: sh.free === u.id ? 0 : upgradePrice(u, r.wave, r.level(u.id)),
        free: sh.free === u.id,
        sold: sh.sold.has(u.id),
      };
    });
    const dead = this.pizzas.filter((p) => p.dead);
    const next = nextLockedPizza(PIZZAS);
    const used = (id: string) => r.goldenUsed[id] ?? 0;
    const golden: GoldenItem[] = [
      { id: 'rebake', name: 'Golden Rebake', desc: 'A destroyed pizza back with full slices', cost: 40, available: dead.length > 0 && used('rebake') < 1 && this.run.heat !== 'inferno', note: this.run.heat === 'inferno' ? 'Off on Inferno' : used('rebake') ? 'Used this run' : dead.length ? '' : 'No pizza lost' },
      { id: 'keep', name: 'Keep the Special', desc: 'Unlock your rented pizza at half price', cost: r.rentedSpecial ? Math.round(PIZZA_BY_ID[r.rentedSpecial].cost / 2) : 0, available: !!r.rentedSpecial && !save.unlockedPizzas.includes(r.rentedSpecial), note: r.rentedSpecial ? '' : 'Rent a Chef’s Special first' },
      { id: 'reroll', name: 'Golden Reroll', desc: `Reroll with a legendary · ${2 - used('reroll')} left`, cost: 25, available: used('reroll') < 2, note: used('reroll') >= 2 ? 'Used twice' : '' },
      { id: 'topping', name: 'Golden Topping', desc: 'A guaranteed legendary card', cost: 60, available: used('topping') < 1, note: used('topping') ? 'Used this run' : '' },
      { id: 'fresh', name: 'Fresh Batch', desc: 'Every pizza back to full freshness', cost: 30, available: used('fresh') < 1 && this.run.heatDef.freshness > 0, note: this.run.heatDef.freshness > 0 ? (used('fresh') ? 'Used this run' : '') : 'Freshness is off' },
    ];
    for (const g of golden) g.available = g.available && save.crusts >= g.cost;
    // one Golden Menu pick per shop: once something is bought, the rest wait for the next shop
    const picked = this.shop?.goldenBought;
    if (picked) for (const g of golden) {
      g.available = false;
      g.note = g.id === picked ? 'Bought this shop' : 'One per shop';
    }
    const stalest = [...this.alivePizzas()].filter((p) => p.freshOn && p.fresh < p.maxFresh).sort((a, b) => a.fresh - b.fresh)[0];
    return {
      title: title ?? (this.shop?.bossReward ? 'BOSS LOOT!' : `WAVE ${r.wave} CLEARED!`),
      sub: this.shop?.bossReward ? 'One epic pick is on the house' : 'Spend your tips on toppings and pizzas, or bank them',
      wave: r.wave,
      coins: r.coins,
      crusts: save.crusts,
      cards,
      rerollLabel: this.freeRerollsLeft > 0 ? `REROLL · ${this.freeRerollsLeft} free` : `REROLL · ${r.rerollCost}`,
      canReroll: this.freeRerollsLeft > 0 || r.coins >= r.rerollCost,
      table: this.pizzas.map((p) => ({ id: p.type.id, name: p.type.name, perk: p.perkLine, slices: p.slices, max: p.maxSlices, fresh: p.fresh, maxFresh: p.maxFresh, freshOn: p.freshOn, stale: p.stale, dead: p.dead })),
      tableFull: this.pizzas.length >= MAX_PIZZAS,
      offers: this.shop!.counter,
      heal: { cost: this.healCost, can: this.alivePizzas().some((p) => p.slices < p.maxSlices) && r.coins >= this.healCost },
      rebake: { cost: this.reviveCost, can: dead.length > 0 && r.coins >= this.reviveCost, shown: this.run.heatDef.rebake },
      reheat: { cost: this.reheatCost(), can: !!stalest && r.coins >= this.reheatCost(), shown: this.run.heatDef.freshness > 0 },
      golden,
      // bank already holds this run's boss and event crusts; only the end-of-run part is still to come
      progress: { runCrusts: r.crustsEarned(this.figOnTable()), bank: save.crusts - r.bankedCrusts, next: next ? { name: next.name, cost: next.cost } : null },
    };
  }

  private refreshShop(): void {
    if (!this.shop) return;
    this.shop.state = this.shopState(this.shop.state.title === 'WELCOME BACK!' || this.shop.state.title.startsWith('ACT 2') ? this.shop.state.title : undefined);
    ui.updateShop(this.shop.el, this.shop.state);
    ui.hud.setCoins(this.run.coins);
    ui.hud.setOwned(this.run.owned);
    this.saveRun();
  }

  private shopBuy(id: string): void {
    const sh = this.shop;
    const u = UPGRADE_BY_ID[id];
    if (!sh || !u || sh.sold.has(id)) return;
    const price = sh.free === id ? 0 : upgradePrice(u, this.run.wave, this.run.level(id));
    if (this.run.coins < price) return;
    this.run.coins -= price;
    if (sh.free === id) sh.free = null;
    sh.sold.add(id);
    this.applyUpgrade(u);
    this.refreshShop();
  }

  private applyUpgrade(u: Upgrade): void {
    const k = kindOf(u);
    audio.sfx('sfx_upgrade');
    if (k !== 'consumable') this.run.owned[u.id] = (this.run.owned[u.id] ?? 0) + 1;
    if (u.onPick === 'healAll2') {
      for (const p of this.alivePizzas()) this.healPizza(p, 2);
      if (k === 'consumable') this.run.consume(u.id);
    }
    if (u.onPick === 'arm') this.run.armed.push(u.id);
    if (u.onPick === 'fridge') for (const p of this.alivePizzas()) if (p.freshOn) p.setFresh(p.fresh + 4);
    // trade-offs paid in freshness: a one-time hit to the pizzas on the table, never enough to make one stale
    if (u.freshNow) for (const p of this.alivePizzas()) if (p.freshOn && p.fresh > 1) p.setFresh(Math.max(1, p.fresh - u.freshNow));
    // on Mild (no freshness) those trade-offs cost slices instead, never the last one
    if (u.slicesNow) for (const p of this.alivePizzas()) if (p.slices > 1) p.takeSlices(Math.min(u.slicesNow, p.slices - 1), p.x);
    if (u.onPick === 'extraPizza') {
      if (this.pizzas.length >= MAX_PIZZAS) {
        const dead = this.pizzas.find((p) => p.dead);
        if (dead) {
          this.pizzas.splice(this.pizzas.indexOf(dead), 1);
          dead.destroy();
        }
      }
      if (this.pizzas.length < MAX_PIZZAS) {
        const have = new Set(this.pizzas.map((p) => p.type.id));
        const pool = save.unlockedPizzas.filter((x) => !have.has(x) && PIZZA_BY_ID[x]);
        const pick = Phaser.Utils.Array.GetRandom(pool.length ? pool : PIZZAS.map((p) => p.id));
        this.placeNewPizza(pick, PIZZA_BY_ID[pick].name);
      }
    }
    this.recompute();
  }

  private shopReroll(): void {
    const sh = this.shop;
    if (!sh) return;
    if (this.freeRerollsLeft > 0) this.freeRerollsLeft--;
    else if (this.run.coins >= this.run.rerollCost) {
      this.run.coins -= this.run.rerollCost;
      this.run.rerollCost = Math.round(this.run.rerollCost * 1.5 + 5);
    } else return;
    audio.sfx('sfx_boing', { volume: 0.6 });
    this.rerollCards(false);
  }

  private rerollCards(withLegendary: boolean): void {
    const sh = this.shop!;
    // the base count: Mac & Cheese's extra consumable card is added on top by rollChoices
    const count = sh.bossReward ? sh.cards.length : 3 + (save.meta.indecisive ? 1 : 0);
    const tableFull = this.pizzas.length >= MAX_PIZZAS && !this.pizzas.some((p) => p.dead);
    const keep = sh.cards.filter((u) => sh.sold.has(u.id));
    // a reroll never deals back the cards it replaced: roll from everything else first,
    // and only top up with old cards if the pool has run that dry
    const old = sh.cards.filter((u) => !sh.sold.has(u.id)).map((u) => u.id);
    const base = [...keep.map((u) => u.id), ...(tableFull ? ['helping'] : [])];
    const roll = (n: number, ex: string[]) => (sh.bossReward ? this.run.rollBossChoices(n, ex) : this.run.rollChoices(n, ex));
    let fresh = roll(count - keep.length, [...base, ...old]);
    if (fresh.length < count - keep.length) fresh = [...fresh, ...roll(count - keep.length - fresh.length, [...base, ...fresh.map((u) => u.id)]).slice(0, count - keep.length - fresh.length)];
    if (withLegendary && !fresh.some((u) => u.rarity === 'legendary')) {
      const leg = UPGRADES.filter((u) => u.rarity === 'legendary' && this.run.offerable(u, this.run.wave) && !keep.includes(u) && !fresh.includes(u) && !(tableFull && u.id === 'helping'));
      const newLeg = leg.filter((u) => !old.includes(u.id));
      if (newLeg.length) leg.splice(0, leg.length, ...newLeg);
      if (leg.length) fresh = [...fresh.slice(0, Math.max(0, fresh.length - 1)), Phaser.Utils.Array.GetRandom(leg)];
    }
    sh.cards = [...keep, ...fresh];
    if (sh.free && !sh.cards.some((u) => u.id === sh.free)) sh.free = null;
    this.refreshShop();
  }

  private shopHeal(): void {
    if (this.run.coins < this.healCost) return;
    this.run.coins -= this.healCost;
    this.healCost = Math.round(this.healCost * 1.45 + 10);
    for (const p of this.alivePizzas()) this.healPizza(p, 2);
    this.refreshShop();
  }

  private shopRebake(): void {
    const p = this.pizzas.find((x) => x.dead);
    if (!p || this.run.coins < this.reviveCost || !this.run.heatDef.rebake) return;
    this.run.coins -= this.reviveCost;
    this.reviveCost = Math.round(this.reviveCost * 1.8);
    p.revived = false;
    p.revive(Math.ceil(p.maxSlices / 2));
    p.setFresh(p.maxFresh);
    this.fx.healBurst(p.x, p.surfaceY);
    audio.sfx('sfx_heal');
    this.recompute();
    this.refreshShop();
  }

  private shopReheat(): void {
    const cost = this.reheatCost();
    const p = [...this.alivePizzas()].filter((q) => q.freshOn && q.fresh < q.maxFresh).sort((a, b) => a.fresh - b.fresh)[0];
    if (!p || this.run.coins < cost) return;
    this.run.coins -= cost;
    this.run.reheatUses++;
    p.setFresh(p.maxFresh);
    this.fx.healBurst(p.x, p.surfaceY);
    audio.sfx('sfx_reheat');
    this.fx.quip(p.x, p.surfaceY - 150, 'REHEATED!', '#ffb070', 40);
    this.recompute();
    this.refreshShop();
  }

  private shopBuyPizza(id: string): void {
    const sh = this.shop;
    const off = sh?.counter.find((o) => o.id === id);
    if (!sh || !off || this.run.coins < off.cost) return;
    const commit = (index: number) => {
      if (this.run.coins < off.cost) return;
      this.run.coins -= off.cost;
      this.run.pizzasBought++;
      if (off.trial) this.run.rentedSpecial = off.id;
      sh.counter = sh.counter.filter((o) => o !== off);
      const label = off.trial ? `${PIZZA_BY_ID[id].name} (Chef's Special, this run only)` : PIZZA_BY_ID[id].name;
      const p = this.placeNewPizza(id, label, index >= 0 ? index : undefined);
      if (p) p.flags.paid = off.cost;
      this.refreshShop();
    };
    const full = this.pizzas.length >= MAX_PIZZAS;
    if (!full && !this.pizzas.some((p) => p.dead)) {
      commit(-1);
      return;
    }
    this.introCard('swap');
    ui.swapPicker({
      id,
      name: off.name,
      perk: off.perk,
      cost: off.cost,
      coins: this.run.coins,
      canAdd: !full,
      current: this.pizzas.map((p) => ({ id: p.type.id, name: p.type.name, perk: p.perkLine, slices: p.slices, max: p.maxSlices, dead: p.dead, stale: p.stale, fresh: p.fresh, freshOn: p.freshOn })),
      onChoose: commit,
    });
  }

  private shopGolden(id: GoldenItem['id']): void {
    const g = this.shop?.state.golden.find((x) => x.id === id);
    if (!g || !g.available || save.crusts < g.cost) return;
    if (this.shop!.goldenBought) return;
    save.crusts -= g.cost;
    this.run.goldenUsed[id] = (this.run.goldenUsed[id] ?? 0) + 1;
    this.shop!.goldenBought = id;
    audio.sfx('sfx_levelup', { volume: 0.7 });
    if (id === 'rebake') {
      const p = this.pizzas.find((x) => x.dead);
      if (p) {
        p.revive(p.maxSlices);
        p.setFresh(p.maxFresh);
        this.fx.healBurst(p.x, p.surfaceY);
      }
    } else if (id === 'keep' && this.run.rentedSpecial) {
      save.unlockedPizzas.push(this.run.rentedSpecial);
      this.run.newUnlocks.push(this.run.rentedSpecial);
      ui.hud.toast(pizzaPortraitURL(this.run.rentedSpecial), 'UNLOCKED FOR GOOD', PIZZA_BY_ID[this.run.rentedSpecial].name);
      this.run.rentedSpecial = null;
    } else if (id === 'reroll') this.rerollCards(true);
    else if (id === 'topping') {
      const leg = UPGRADES.filter((u) => u.rarity === 'legendary' && this.run.offerable(u, this.run.wave) && !this.shop!.cards.includes(u));
      if (leg.length) this.shop!.cards.push(Phaser.Utils.Array.GetRandom(leg));
    } else if (id === 'fresh') for (const p of this.alivePizzas()) if (p.freshOn) p.setFresh(p.maxFresh);
    persist();
    this.recompute();
    this.refreshShop();
  }

  private shopNext(): void {
    if (!this.shop) return;
    this.saveRun();
    ui.close(this.shop.el);
    this.shop = null;
    this.inUpgrade = false;
    ui.setPlaying(true);
    audio.duck(1);
    this.time.delayedCall(400, () => this.beginWave(this.run.wave + 1));
  }

  /** Put a new pizza on the table: into the given slot (swapping that pizza out), or a new plate. */
  private placeNewPizza(id: string, label: string, swapIndex?: number): Pizza | null {
    const slices = BASE_SLICES + (save.meta.pies ?? 0);
    if (swapIndex !== undefined && this.pizzas[swapIndex]) {
      const old = this.pizzas[swapIndex];
      // Pizza al Taglio refunds half its price when it leaves
      if (old.type.perk === 'refund' && old.flags.paid) {
        const back = Math.round(Number(old.flags.paid) / 2);
        this.run.coins += back;
        ui.hud.toast(null, 'REFUND', `+${back} tips for the ${old.type.name}`);
      }
      if (old === this.possessedPizza) this.possessedPizza = null;
      const fresh = this.addPizza(id, slices, true);
      this.pizzas.pop();
      this.pizzas.splice(swapIndex, 1, fresh);
      this.fx.puff(old.x, old.surfaceY, 10);
      old.destroy();
      this.layoutPizzas(false);
      fresh.root.setScale(0).setY(PIZZA_Y - 200);
      this.tweens.add({ targets: fresh.root, scale: 1, y: PIZZA_Y, duration: 700, ease: 'Bounce.Out' });
      this.recompute();
      audio.sfx('sfx_levelup', { volume: 0.6 });
      ui.hud.toast(pizzaPortraitURL(id), 'PIZZA SWAPPED', `${label} replaces ${old.type.name}`);
      return fresh;
    }
    if (this.pizzas.length >= MAX_PIZZAS) {
      const dead = this.pizzas.find((p) => p.dead);
      if (!dead) return null;
      this.pizzas.splice(this.pizzas.indexOf(dead), 1);
      dead.destroy();
    }
    const p = this.addPizza(id, slices, true);
    this.layoutPizzas(true);
    this.recompute();
    audio.sfx('sfx_levelup', { volume: 0.6 });
    ui.hud.toast(pizzaPortraitURL(id), 'NEW PIZZA ON THE TABLE', `${label}: ${PIZZA_BY_ID[id].perkText}`);
    return p;
  }

  private figOnTable(): boolean {
    return this.alivePizzas().some((p) => p.perk === 'crustBonus');
  }

  /** Award any milestones reached: each unlocks the cheapest locked pizza for free. */
  private checkMilestones(): void {
    const r = this.run;
    const nb = save.bossesBeaten.length;
    const reached: Record<string, boolean> = {
      firstWave3: r.wave >= 3,
      firstBoss: nb >= 1,
      feet150: save.totalFeet >= 150,
      wave10: r.wave >= 10,
      bosses3: nb >= 3,
      feet600: save.totalFeet >= 600,
      wave20: r.wave >= 20,
      bosses6: nb >= 6,
      act1: save.act1Cleared.length > 0,
      bosses12: nb >= 12,
      feet1500: save.totalFeet >= 1500,
      wave45: r.wave >= 45,
      bosses18: nb >= 18,
      journey: save.bestWave >= JOURNEY_WAVES,
      allBosses: nb >= 24,
      hot30: save.act1Cleared.includes('hot'),
      extrahot30: save.act1Cleared.includes('extrahot'),
      inferno30: save.act1Cleared.includes('inferno'),
    };
    for (const m of MILESTONES) {
      if (!reached[m.id] || save.milestones.includes(m.id)) continue;
      save.milestones.push(m.id);
      const prize = nextLockedPizza(PIZZAS);
      if (prize) {
        save.unlockedPizzas.push(prize.id);
        r.newUnlocks.push(prize.id);
        ui.hud.toast(pizzaPortraitURL(prize.id), `MILESTONE: ${m.name.toUpperCase()}`, `${prize.name} unlocked for free!`);
      } else {
        save.crusts += 50;
        ui.hud.toast(null, `MILESTONE: ${m.name.toUpperCase()}`, '+50 Golden Crusts');
      }
      audio.sfx('sfx_levelup', { volume: 0.7 });
    }
    persist();
  }

  // ——— Combat ———
  private movePointer(p: Phaser.Input.Pointer): void {
    this.pointer.x = p.worldX;
    this.pointer.y = p.worldY;
    this.pointer.touch = p.wasTouch;
    this.pointer.lastMove = this.nowT;
    if (this.peelSlowT <= 0) {
      this.peelPos.x = p.worldX;
      this.peelPos.y = p.worldY;
    }
    pad.usedMouse();
  }

  private smack(x: number, y: number): void {
    if (this.over || this.paused || this.inUpgrade || ui.modalOpen) return;
    if (this.peelStunT > 0) {
      this.fx.quip(x, y - 40, 'PEEL STUNNED', '#ffd23f', 28);
      return;
    }
    this.tweens.killTweensOf(this.peel);
    this.peel.setAngle(-62).setScale(this.peelScale() * 1.12);
    this.tweens.add({ targets: this.peel, angle: -28, scale: this.peelScale(), duration: 180, ease: 'Back.Out' });
    const r = this.run.stats.radius;
    const hits = this.feet
      .filter((f) => f.hittable)
      .map((f) => ({ f, d: f.distanceTo(x, y) }))
      .filter((o) => o.d <= r)
      .sort((a, b) => a.d - b.d);
    // boss props and wave events: a smack goes to them only when no foot is closer
    this.clickables = this.clickables.filter((c) => c.alive());
    const click = this.clickables
      .map((c) => ({ c, d: c.contains ? (c.contains(x, y) ? 0 : 1) : Math.hypot(c.x - x, c.y - y) - c.r }))
      .filter((o) => o.d <= 0)
      .sort((a, b) => (b.c.priority ?? 0) - (a.c.priority ?? 0) || a.d - b.d)[0];
    if (click && (!hits.length || (click.c.priority ?? 0) >= 2 || hits[0].d > 18)) {
      click.c.hit();
      return;
    }
    if (!hits.length) {
      if (this.run.combo >= 3) this.fx.quip(x, y - 30, 'MISS', '#ffb0a0', 32, 0);
      this.run.combo = 0;
      this.fx.puff(x, y, 4);
      audio.sfx('sfx_whoosh', { volume: 0.35, rate: 1.3, throttle: 60 });
      return;
    }
    if (this.tutorial) ui.hud.tutorial(false);
    const targets = this.run.level('peel') > 0 ? hits : hits.slice(0, 1);
    for (const { f } of targets) {
      this.hitFoot(f, x, y);
      if (Math.random() < this.run.stats.doubleChance && f.alive) this.time.delayedCall(90, () => f.alive && this.hitFoot(f, x + 12, y - 12));
    }
  }

  private hitFoot(f: Foot, x: number, y: number): void {
    const st = this.run.stats;
    const hpBefore = f.hp;
    this.dealDamage(f, st.damage, { source: 'smack', canCrit: true, knock: st.knockback, x, y });
    // smack abilities only when the smack landed (not parried, guarded or dodged)
    const landed = !f.alive || f.hp < hpBefore;
    if (landed && this.ability?.trigger.t === 'smack' && Math.random() < this.ability.trigger.p * passiveBoost(st.superGain).chance) this.fireAbility({ foot: f, x: f.cx, y: f.cy });
    if (landed) this.fireProcs('smack', { foot: f, x: f.cx, y: f.cy });
    if (!f.alive) return;
    if (f.has('pinch')) this.stunPeel(0.5, 'PINCHED!');
    if (f.has('sticky')) {
      this.slowPeel(1.4);
      this.fx.quip(x, y - 70, 'STICKY!', '#7ad08a', 30);
    }
    if (f.has('invisible')) f.reveal(1.2);
    // Marshmallow Mountain: the first smack each wave on a foot above it sends it back to the top
    const t = f.target;
    if (t && !t.dead && t.perk === 'bounceTop' && !t.flags.bounced && !f.isBossLike) {
      t.flags.bounced = true;
      f.y = 140;
      f.vy = 0;
      f.setState('hover');
      this.fx.quip(f.x, 220, 'BOUNCED TO THE TOP!', '#ffe0f0', 36);
      audio.sfx('sfx_boing', { rate: 0.8 });
    }
  }

  private dealDamage(f: Foot, amount: number, o: DamageOpts): void {
    if (!f.alive) return;
    const st = this.run.stats;
    const smack = o.source === 'smack';
    // Ghost echoes and King Honk's decoys pop in one hit and hurt nothing
    if (f.brain.decoy) {
      this.fx.puff(f.cx, f.cy, 14);
      this.fx.quip(f.x, f.cy - 110, 'DECOY!', '#b06bff', 40);
      audio.sfx('sfx_boing', { rate: 1.5 });
      f.die();
      return;
    }
    if (smack && f.glossy) {
      f.glossy = false;
      f.flash(0xff9fd0, 90);
      f.knock(120);
      this.fx.quip(f.x, f.cy - 110, 'SLIPPED!', '#ff7ab8', 40);
      audio.sfx('sfx_boing', { volume: 0.5, rate: 1.6 });
      return;
    }
    if (smack && f.has('parry') && f.parryReady && f.state === 'descend') {
      f.parryReady = false;
      f.flash(0xd9a441, 90);
      this.fx.ring(o.x ?? f.cx, o.y ?? f.cy, 0xffd34d, 0.8, 1);
      this.fx.quip(f.x, f.cy - 110, 'PARRIED!', '#ffd34d', 42);
      audio.sfx('sfx_shield');
      return;
    }
    if (smack && f.has('guard') && f.guardOpen <= 0) {
      f.flash(0x9ad8ff, 80);
      f.knock(80);
      this.fx.quip(f.x, f.cy - 110, 'SHIELD! Wait for it to drop', '#9ad8ff', 30);
      audio.sfx('sfx_shield', { volume: 0.6 });
      return;
    }
    let dmg = amount;
    let crit = false;
    if (smack) {
      this.smackCount++;
      if (st.tenthCrit && this.smackCount % 10 === 0) crit = true;
    }
    if (o.canCrit && f.has('tender')) crit = true;
    else if (o.canCrit && Math.random() < st.critChance) crit = true;
    if (crit) dmg *= st.critMult;
    if (f.isBossLike && (smack || o.source === 'direct') && this.director.onSmacked(f, o.x ?? f.cx, o.y ?? f.cy, dmg)) {
      f.flash(0xc7ccd4, 60);
      if (smack) audio.slap(0.5);
      ui.hud.setBoss(f.type.name, f.hp / f.maxHp, this.director.phaseCount(f), f.phase);
      return;
    }
    if (f.shielded) {
      this.fx.quip(f.x, f.cy - 110, 'BLOCKED', '#c7ccd4', 32);
      return;
    }
    // multipliers: overheats and marks, boss hunters, big-health hunters, stunned near Okonomiyaki
    dmg *= f.vuln;
    if (f.brain.marked) dmg *= 2;
    if (f.markUntil > this.nowT) dmg *= f.markMult;
    if (f.isBossLike) dmg *= 1 + st.bossDmg;
    if (f.hp > f.maxHp * 0.5) dmg *= 1 + st.bigHurt;
    if (f.stunT > 0 && f.target?.perk === 'stunVuln') dmg *= 1.5;
    let executed = false;
    if (smack && !f.isBossLike && st.execute > 0 && f.hp / f.maxHp <= st.execute) {
      executed = true;
      f.wool = 0;
    }
    const armourMult = o.source === 'burn' || o.source === 'garlic' || o.source === 'direct' ? 1 : 10 / (10 + Math.max(0, f.armor));
    let dealt = executed ? f.hp : dmg * armourMult;
    if (f.wool > 0) {
      const absorbed = Math.min(f.wool, dealt);
      f.wool -= absorbed;
      dealt -= absorbed;
      if (f.wool <= 0) this.fx.quip(f.x, f.cy - 110, 'WOOL GONE!', '#e9c46a', 38);
      else if (smack) this.fx.puff(o.x ?? f.cx, o.y ?? f.cy, 3);
    }
    f.hp -= dealt;
    this.dmgLog[o.source] = (this.dmgLog[o.source] ?? 0) + dealt;
    if (smack && f.has('crack') && f.armor > 0) {
      f.armor--;
      this.fx.quip(f.x + 60, f.cy - 60, 'CRACK!', '#c7ccd4', 30);
    }
    if (f.has('bulk') && smack && f.bulk > 0) {
      f.armor -= f.bulk;
      f.bulk = 0;
    }
    if (f.has('enrage') && !f.enraged && f.hp > 0 && f.hp < f.maxHp * 0.5) {
      f.enraged = true;
      this.fx.quip(f.x, f.cy - 130, "NOW I'M ANGRY!", '#ff4d3d', 40);
      this.fx.puff(f.cx, f.cy - 60, 8);
    }
    f.hitOnce = true;
    const px = o.x ?? f.cx;
    const py = o.y ?? f.cy;
    if (!o.quiet && save.settings.damageNumbers) this.fx.number(px, py - 30, dealt, crit ? 'crit' : o.source === 'chain' ? 'zap' : o.source === 'burn' ? 'burn' : 'normal');

    if (smack) {
      f.flash(crit ? 0xffe066 : 0xffffff, crit ? 110 : 70);
      this.fx.impact(px, py, crit);
      this.fx.blush(f.root, (px - f.x) / f.root.scaleX, (py - f.y) / f.root.scaleY);
      if (crit) {
        audio.sfx('sfx_crit', { throttle: 40 });
        this.hitStop = 0.07;
        this.shake(120, 0.004);
        this.rumble(0.35, 80);
      } else audio.slap(0.8);
      if (o.knock) f.knock(o.knock * (crit ? 1.4 : 1));
      this.run.combo++;
      this.run.bestCombo = Math.max(this.run.bestCombo, this.run.combo);
      this.run.comboTimer = COMBO_BASE_WINDOW + st.comboBonus;
      if (this.run.combo % 10 === 0) {
        audio.sfx('sfx_combo', { rate: 1 + Math.min(0.6, this.run.combo / 100) });
        this.fx.quip(W / 2, 330, `${this.run.combo} COMBO!`, '#ffd23f', 56, 0);
      }
      this.run.super = Math.min(1, this.run.super + 0.018 * st.superGain * (this.ability ? this.ability.charge : 1));
      if (st.burnDps > 0 && !f.type.traits.includes('immuneBurn')) {
        f.burnFromAbility = false;
        f.burnT = 3;
        f.burnDps = Math.max(f.burnDps, st.burnDps);
        audio.sfx('sfx_fire', { volume: 0.4, throttle: 300 });
      }
      if (st.slowPct > 0 && !f.type.traits.includes('immuneSlow')) {
        f.slowT = 2;
        f.slowPct = st.slowPct;
        f.clearTint();
      }
      if (st.stunChance > 0 && Math.random() < st.stunChance && f.alive && !f.isBossLike) {
        f.stun(1.2);
        this.fx.quip(f.x, f.cy - 100, 'TICKLED!', '#ffb3c7', 34);
      }
      if (st.chainChance > 0 && Math.random() < st.chainChance) this.chain(f, amount * st.chainDmg);
      if (st.splashDmg > 0) for (const q of this.feet) if (q !== f && q.hittable && Math.hypot(q.cx - f.cx, q.cy - f.cy) < 200) this.dealDamage(q, st.splashDmg, { source: 'splash', quiet: true });
      if (f.target?.perk === 'disarm' && !f.isBossLike) f.disarmT = 3;
      if (f.hp > 0 && f.has('dodge') && Math.random() < 0.35) f.dodge();
    } else if (o.source === 'slam' || o.source === 'trap' || o.source === 'olive' || o.source === 'cutter' || o.source === 'direct') {
      f.flash(0xffffff, 60);
      if (o.knock) f.knock(o.knock);
    }
    if (f.isBossLike) this.director.afterDamage(f);
    if (f.hp <= 0) this.killFoot(f, o.source);
    else if (f === this.bossFoot || f === this.miniFoot) ui.hud.setBoss(f.type.name, f.hp / f.maxHp, this.director.phaseCount(f), f.phase);
  }

  private chain(from: Foot, dmg: number): void {
    const targets = this.feet
      .filter((o) => o !== from && o.hittable)
      .map((o) => ({ o, d: Math.hypot(o.cx - from.cx, o.cy - from.cy) }))
      .filter((x) => x.d < 650)
      .sort((a, b) => a.d - b.d)
      .slice(0, this.run.stats.chainCount);
    if (!targets.length) return;
    audio.sfx('sfx_zap', { throttle: 60 });
    let prev = from;
    for (const { o } of targets) {
      this.fx.lightning(prev.cx, prev.cy, o.cx, o.cy);
      this.dealDamage(o, dmg, { source: 'chain' });
      prev = o;
    }
  }

  /** NEW PEEL toasts for freshly unlocked peels. */
  private peelToasts(list: PeelDef[]): void {
    for (const d of list) {
      ui.hud.toast(peelThumbURL(d.id, 96), d.shiny ? 'NEW SHINY PEEL!' : 'NEW PEEL', `${d.name} · equip it in the Peel Locker`);
      audio.sfx('sfx_levelup', { volume: 0.5, rate: d.shiny ? 1.5 : 1.2 });
    }
  }

  /** The equipped peel's trail (and sparkles for shiny peels) while it moves. */
  private peelTrailTick(): void {
    const { x, y } = this.peelPos;
    const moved = Math.hypot(x - this.lastPeelPos.x, y - this.lastPeelPos.y);
    this.lastPeelPos = { x, y };
    if (!this.peel.visible || save.settings.reducedMotion || moved < 8) return;
    if (this.peelTrailColor !== null) this.fx.trail(x, y, this.peelTrailColor);
    if (this.peelShiny && Math.random() < 0.35) this.fx.glint(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 40);
  }

  private killFoot(f: Foot, source: DamageOpts['source']): void {
    if (!f.alive) return;
    // King Honk's decoys are props: they pop without paying out (the cleanup after his death included)
    if (f.brain.decoy) {
      this.fx.puff(f.cx, f.cy, 12);
      f.die();
      return;
    }
    if (f.has('revive') && !f.reviveUsed) {
      f.revive();
      this.fx.quip(f.x, f.cy - 120, 'NOT DEAD YET!', '#7dff9a', 40);
      audio.sfx('sfx_boing');
      return;
    }
    const st = this.run.stats;
    const boss = !!f.type.boss;
    const mini = !!f.type.mini;
    this.run.feetSmacked++;
    save.totalFeet++;
    // achievements count real feet only, never a Ghost echo
    if (!f.brain.echo) save.kills[f.type.id] = (save.kills[f.type.id] ?? 0) + 1;
    const midas = !boss && !mini && f.type.id !== 'golden' && Math.random() < st.goldenTouch;
    // Ghost echoes copy a boss's type but are a fraction of one: they pay a tenth
    const echoCut = f.brain.echo ? 0.1 : 1;
    const scoreGain = Math.round(f.type.score * (f.elite ? 2 : 1) * (midas ? 2 : 1) * echoCut);
    this.addScore(scoreGain, true);
    // later waves bring far more feet, so each one pays a little less after wave 10 (×0.71 at 20, ×0.5 at 35)
    const taper = 1 / (1 + Math.max(0, this.run.wave - 10) / 25);
    let coins = Math.max(1, Math.round(f.type.coins * st.coinMult * (f.elite ? 2 : 1) * (midas ? 5 : 1) * this.run.heatDef.tips * echoCut * taper));
    if (f.type.id === 'mimic') coins *= 2;
    if (f.shiny) coins *= 3;
    // New York Slice: +1 tip per quick kill
    if (st.quickTips && this.nowT - this.lastKillAt < 1) coins += st.quickTips;
    this.lastKillAt = this.nowT;
    // a Thief gives back what it stole
    if (f.stolen) {
      coins += f.stolen;
      this.fx.quip(f.x, f.cy - 150, `+${f.stolen} RECOVERED`, '#ffd23f', 34);
    }
    this.run.coins += coins;
    const flights = Math.min(coins, boss ? 12 : 6);
    this.fx.coinFlight(f.cx, f.cy, flights, ui.hud.coinTarget(), () => {
      this.displayCoins = Math.min(this.run.coins, this.displayCoins + coins / flights);
      audio.sfx('sfx_coin', { throttle: 40, jitter: 0.15 });
    });
    // kills charge the Peel Slam, except kills by the slam itself (it would refill its own meter)
    // the slam and abilities never refill their own meter (their burns included)
    if (source !== 'slam' && source !== 'ability' && !(source === 'burn' && f.burnFromAbility)) this.run.super = Math.min(1, this.run.super + 0.05 * st.superGain * (this.ability ? this.ability.charge : 1));
    if (this.ability?.trigger.t === 'kill' && source !== 'ability' && Math.random() < this.ability.trigger.p * passiveBoost(st.superGain).chance) {
      const at = { x: f.cx, y: f.cy };
      this.time.delayedCall(40, () => this.fireAbility({ x: at.x, y: at.y }));
    }
    if (source !== 'ability' && this.procs.length) {
      const at = { x: f.cx, y: f.cy };
      this.time.delayedCall(40, () => this.fireProcs('kill', { x: at.x, y: at.y }));
    }
    if (f.has('crusty')) {
      const cap = Math.round(EVENT_CRUST_CAP * this.run.heatDef.crusts);
      const got = Math.max(0, Math.min(1 + Math.floor(Math.random() * 3), cap - this.run.eventCrusts));
      this.run.eventCrusts += got;
      this.run.bank(got);
      persist();
      this.fx.quip(f.x, f.cy - 140, got ? `+${got} GOLDEN CRUST${got > 1 ? 'S' : ''}` : 'CRUST CAP REACHED', '#ffd23f', 42);
    }
    if (midas) {
      this.fx.quip(f.x, f.cy - 120, 'GOLDEN TOUCH!', '#ffd23f', 44);
      this.fx.party(f.cx, f.cy, 25);
    }
    if (f.type.id === 'golden' || f.type.id === 'crusty') {
      this.fx.quip(f.x, f.cy - 120, 'JACKPOT!', '#ffd23f', 64);
      this.fx.party(f.cx, f.cy, 80);
      audio.sfx('sfx_levelup', { volume: 0.7 });
    } else if (Math.random() < (boss || mini ? 1 : 0.45)) {
      this.fx.quip(f.x + (Math.random() - 0.5) * 60, f.cy - 110, Phaser.Utils.Array.GetRandom(OUCH), '#ffffff', boss ? 80 : 46);
      audio.sfx('sfx_ouch', { throttle: 250, rate: f.type.scale < 0.8 ? 1.5 : f.type.scale > 1.5 ? 0.7 : 1, jitter: 0.12 });
    }
    audio.sfx('sfx_whoosh', { volume: 0.7, throttle: 50 });
    if (st.explodeDmg > 0 && source !== 'explode') this.time.delayedCall(60, () => this.explode(f.cx, f.cy, st.explodeDmg));
    if (f.has('split')) {
      for (const dx of [-90, 90]) {
        const t = this.pickTarget(f);
        const baby = this.spawnFoot(FOOT_BY_ID.baby, t, false, f.x + dx);
        baby.y = Math.max(140, f.y - 100);
        baby.setState('hover');
      }
    }
    // echoes and decoys are boss-typed stand-ins: they never count as the boss going down
    if ((boss || mini) && !f.brain.echo && !f.brain.decoy) this.bossDown(f);
    if (f.shiny) {
      this.fx.glint(f.cx, f.cy, 24);
      this.fx.quip(f.x, f.cy - 170, 'SHINY DEFEATED!', '#fff6c0', 48);
      const g = grantShinyFoot(f.type.id);
      if (g) this.peelToasts([g]);
    }
    this.peelToasts(checkPeelAchievements());
    f.die(boss);
  }

  private explode(x: number, y: number, dmg: number): void {
    this.fx.explosion(x, y, 230);
    audio.sfx('sfx_explosion', { throttle: 80, volume: 0.7 });
    this.shake(160, 0.004);
    for (const o of this.feet) if (o.hittable && Math.hypot(o.cx - x, o.cy - y) < 260) this.dealDamage(o, dmg, { source: 'explode', knock: 200 });
  }

  private bossDown(f: Foot): void {
    const mini = !!f.type.mini;
    if (f === this.bossFoot) this.bossFoot = null;
    if (f === this.miniFoot) this.miniFoot = null;
    ui.hud.setBoss(null);
    // the wave ends with the boss: no golden foot arrives afterwards
    if (!mini) this.goldenSpawned = true;
    this.run.bossesBeaten.push(f.type.id);
    const firstKill = !save.bossesBeaten.includes(f.type.id);
    if (firstKill) {
      save.bossesBeaten.push(f.type.id);
      if (!mini) this.run.firstKills++;
    }
    // boss crusts go straight into the bank, where you can see them (and they're never lost)
    // (shown on the BOSS DEFEATED / MINI-BOSS DOWN banner)
    const crusts = this.run.bossCrusts(firstKill && !mini, this.figOnTable());
    this.run.bank(crusts);
    this.lastBossCrusts = crusts;
    persist();
    audio.sfx('sfx_coin', { rate: 0.8 });
    if (firstKill && !mini) ui.hud.toast(footPortraitURL(f.type.id), 'FIRST KILL', `${f.type.name}: +${crusts} Golden Crusts, banked`);
    if (mini) {
      // mini-boss loot: a pile of tips and a free consumable, no separate loot screen
      this.giveTips(Math.round(40 * this.run.heatDef.tips + this.run.wave * 2), f.cx, f.cy);
      this.freeConsumable();
      this.fx.party(f.cx, f.cy, 60);
      audio.sfx('sfx_levelup', { volume: 0.8 });
      ui.hud.banner('MINI-BOSS DOWN!', `${f.type.name} · +${crusts} Golden Crusts`, 'clear');
      return;
    }
    // the first boss of every run brings a new pizza to a small table
    if (!this.bossBonusGiven && this.pizzas.length < 4) {
      this.bossBonusGiven = true;
      const have = new Set(this.pizzas.map((p) => p.type.id));
      const pool = save.unlockedPizzas.filter((x) => !have.has(x) && PIZZA_BY_ID[x]);
      if (pool.length) {
        const pick = Phaser.Utils.Array.GetRandom(pool);
        this.time.delayedCall(1600, () => !this.over && this.placeNewPizza(pick, `Boss bonus: ${PIZZA_BY_ID[pick].name}`));
      }
    }
    // Lahmacun regrows every slice after a boss; Pumpkin Spice freshens the table
    for (const p of this.alivePizzas()) {
      if (p.perk === 'bossRegrow') this.healPizza(p, p.maxSlices);
    }
    if (this.alivePizzas().some((p) => p.perk === 'neverStale')) for (const p of this.alivePizzas()) if (p.freshOn) p.setFresh(p.fresh + 1);
    this.possess(null);
    for (const p of this.pizzas) p.setLift(0);
    this.slowMo = 1.4;
    this.flash(300, 255, 240, 200);
    this.shake(900, 0.012);
    this.rumble(1, 600);
    this.fx.party(f.cx, f.cy, 140);
    this.fx.explosion(f.cx, f.cy, 380);
    audio.sfx('sfx_explosion');
    audio.sfx('sfx_crit');
    // the boss wave ends with its boss: the rest of its entourage flees
    if (this.plan) this.plan.queue = [];
    for (const o of this.aliveFeet()) if (o !== f) this.time.delayedCall(400, () => o.alive && this.killFoot(o, 'slam'));
    // Act 1 complete at wave 30
    const w = this.run.wave;
    if (w % JOURNEY_WAVES === ACT_WAVES) {
      if (!save.act1Cleared.includes(this.run.heat)) save.act1Cleared.push(this.run.heat);
      persist();
      this.time.delayedCall(900, () => {
        ui.hud.banner('ACT 1 COMPLETE!', 'Six stages down. Six to go.', 'clear');
        audio.sting('music_act', 0.9);
      });
    }
  }

  private addScore(base: number, combo: boolean): void {
    const st = this.run.stats;
    this.run.score += Math.round(base * st.scoreMult * (combo ? this.run.comboMult() : 1));
  }

  private onStomp(f: Foot): void {
    const p = f.target;
    if (!p || p.dead) return;
    const st = this.run.stats;
    if (f.type.stompDmg <= 0) return;
    if (this.run.combo >= 5) this.fx.quip(W / 2, 200, 'COMBO LOST', '#ff8a6a', 40, 0);
    this.run.combo = 0;
    this.rumble(f.isBossLike ? 0.8 : 0.3, f.isBossLike ? 250 : 90);
    this.director.onStomp(f, p);
    if (this.ability?.trigger.t === 'stomp') this.fireAbility({ foot: f, x: f.cx, y: f.cy });
    this.fireProcs('stomp', { foot: f, x: f.cx, y: f.cy });
    // Graffiti Gina tags the pizza; the next foot on it stomps twice as hard
    let tagged = false;
    if (p.flags.tagged && !f.has('tag')) {
      tagged = true;
      p.flags.tagged = false;
    }
    if (f.has('tag')) {
      p.flags.tagged = true;
      this.fx.quip(p.x, p.surfaceY - 150, 'TAGGED!', '#ff4fd8', 40);
    }
    // a Thief swipes tips
    if (f.has('thief')) {
      const n = Math.min(this.run.coins, Math.max(5, Math.round(this.run.coins * 0.1)));
      if (n > 0) {
        this.run.coins -= n;
        this.displayCoins = Math.min(this.displayCoins, this.run.coins);
        f.stolen += n;
        this.fx.quip(f.x, f.cy - 130, `-${n} TIPS STOLEN!`, '#ffd23f', 38);
        audio.sfx('sfx_steal');
      }
    }
    // Fruit Fly Fiona spoils freshness instead of eating slices
    if (f.has('spoil') && p.freshOn) {
      p.setFresh(p.fresh - 2);
      this.fx.quip(p.x, p.surfaceY - 140, 'SPOILED: -2 FRESH', '#a0c060', 36);
      if (p.stale) this.recompute();
      return;
    }
    // defences (piercing stomps go straight through)
    const pierce = f.has('pierce') || this.director.pierces(f);
    if (pierce && (p.traps > 0 || p.shieldCharges > 0 || p.flags.grandma)) this.fx.quip(f.x, p.surfaceY - 150, 'PIERCED!', '#ff4d6d', 40);
    if (p.traps > 0 && !pierce) {
      p.setTraps(p.traps - 1);
      this.fx.quip(f.x, p.surfaceY - 120, 'SNAP!', '#ffd23f', 64);
      audio.sfx('sfx_crit');
      audio.sfx('sfx_shield', { volume: 0.6 });
      this.dealDamage(f, 100, { source: 'trap' });
      if (f.alive) f.stun(1.5);
      this.shake(150, 0.005);
      return;
    }
    if (p.flags.grandma && !pierce) {
      p.flags.grandma = false;
      this.fx.ring(p.x, p.surfaceY - 30, 0xffb070, 2, 0.45);
      this.fx.quip(f.x, p.surfaceY - 130, "GRANDMA'S GOT YOU!", '#ffb070', 40);
      audio.sfx('sfx_shield');
      f.knock(650);
      return;
    }
    if (p.shieldCharges > 0 && !pierce) {
      p.setShield(p.shieldCharges - 1);
      this.fx.ring(p.x, p.surfaceY - 30, 0xffe680, 2.2, 0.45);
      this.fx.quip(f.x, p.surfaceY - 130, 'BLOCKED!', '#ffe680', 48);
      audio.sfx('sfx_shield');
      f.knock(700);
      return;
    }
    if (!pierce && Math.random() < st.shrugChance) {
      this.fx.quip(f.x, p.surfaceY - 130, 'SHRUGGED IT OFF!', '#ffffff', 40);
      audio.sfx('sfx_boing', { volume: 0.7 });
      f.knock(500);
      return;
    }
    const big = f.isBossLike || f.type.stompDmg >= 2;
    if (!pierce && p.perk === 'thick' && Math.random() < 0.3) {
      this.fx.quip(f.x, p.surfaceY - 130, 'THICK CRUST!', '#e0a050', 40);
      audio.sfx('sfx_boing', { volume: 0.6, rate: 0.8 });
      f.knock(450);
      return;
    }
    // Stromboli shrugs off the second half of double stomps
    if (p.perk === 'sturdyMulti' && f.has('double') && f.brain.stompedOnce) {
      this.fx.quip(f.x, p.surfaceY - 130, 'STROMBOLI HOLDS!', '#e0a050', 36);
      f.brain.stompedOnce = false;
      return;
    }
    if (f.has('double')) f.brain.stompedOnce = !f.brain.stompedOnce;
    let dmg = f.type.stompDmg + (f.elite ? 1 : 0) + (f.type.id === 'mimic' ? 1 : 0);
    dmg = Math.max(1, dmg);
    if (tagged) {
      dmg *= 2;
      this.fx.quip(p.x, p.surfaceY - 170, 'TAG HIT: DOUBLE!', '#ff4fd8', 38);
    }
    if (p.soggy) {
      dmg++;
      p.soggy = false;
      this.fx.quip(p.x, p.surfaceY - 150, 'SOGGY!', '#8fd3ff', 38);
    }
    this.applyStomp(p, f, dmg, big);
    const immune = p.perk === 'immuneEffects';
    if (f.has('soggy') && !p.dead && !immune) {
      p.soggy = true;
      for (let i = 0; i < 4; i++) this.fx.sweatDrop(p.x + (Math.random() - 0.5) * 120, p.surfaceY - 20);
    }
    if (f.has('scorch') && !immune) {
      this.time.delayedCall(2000, () => {
        if (p.dead || this.over || !this.waveActive) return;
        for (let i = 0; i < 6; i++) this.fx.burn(p.x + (Math.random() - 0.5) * 140, p.surfaceY);
        this.fx.quip(p.x, p.surfaceY - 150, 'SCORCHED!', '#ff8a3d', 40);
        audio.sfx('sfx_fire', { volume: 0.6 });
        const removed = p.takeSlices(1, p.x);
        this.waveSlicesLost += removed.length;
        this.run.slicesLost += removed.length;
        if (p.dead) this.pizzaDestroyed(p);
      });
    }
    if (f.type.boss) for (const q of this.alivePizzas()) if (q !== p) q.hurt();
    if (f.has('wide')) {
      for (const q of this.neighbours(p)) {
        if (q.perk === 'sturdyMulti') {
          this.fx.quip(q.x, q.surfaceY - 130, 'STROMBOLI HOLDS!', '#e0a050', 32);
          continue;
        }
        this.time.delayedCall(80, () => this.applyStomp(q, f, 1, false));
      }
    }
    // the possessed Diavola sets your own pizza alight
    if (p === this.possessedPizza && p.type.perk === 'burnStomper') this.time.delayedCall(600, () => !p.dead && this.hitPizza(p, 1, 'CURSED FIRE!', '#c9a8ff'));
    // retaliation
    if (!f.type.traits.includes('immuneBurn') && ((p.perk === 'burnStomper' && p !== this.possessedPizza) || st.stompBurn > 0)) {
      f.burnT = 4;
      f.burnDps = Math.max(f.burnDps, (p.perk === 'burnStomper' ? 10 : 0) + st.stompBurn);
      this.fx.quip(f.x, f.cy - 100, 'HOT HOT HOT!', '#ff8a3d', 38);
      audio.sfx('sfx_fire', { volume: 0.6 });
    }
  }

  private applyStomp(p: Pizza, f: Foot | null, dmg: number, big: boolean): void {
    if (p.dead) return;
    // trade-off toppings: a foot's stomp can take an extra slice
    if (f && dmg > 0 && Math.random() < this.run.stats.stompExtra) {
      dmg += 1;
      this.fx.quip(p.x, p.surfaceY - 190, '+1 SLICE!', '#ff6b6b', 30);
    }
    const removed = p.takeSlices(dmg, f?.x ?? p.x);
    this.waveSlicesLost += removed.length;
    this.run.slicesLost += removed.length;
    const y = p.surfaceY;
    this.fx.splat(p.x + ((f?.x ?? p.x) - p.x) * 0.5, y, big);
    for (let i = 0; i < removed.length; i++) this.fx.slice(`slice_${p.type.id}`, p.x, y - 10, p.s * 0.9);
    audio.sfx('sfx_squish', { throttle: 60 });
    if (big) {
      audio.sfx('sfx_stomp', { throttle: 120 });
      this.shake(f?.type.boss ? 420 : 220, f?.type.boss ? 0.014 : 0.007);
    } else this.shake(140, 0.004);
    this.fx.number(p.x, y - 90, removed.length, 'normal');
    // Emergency Dough: a pizza down to its last slice regains 3, once
    if (!p.dead && p.slices === 1 && this.run.armed.includes('dough')) {
      this.run.consume('dough');
      this.time.delayedCall(300, () => {
        this.healPizza(p, 3);
        this.fx.quip(p.x, p.surfaceY - 160, 'EMERGENCY DOUGH!', '#f6e6c4', 42);
      });
    }
    if (p.dead) this.pizzaDestroyed(p);
  }

  private pizzaDestroyed(p: Pizza): void {
    this.fx.puff(p.x, p.surfaceY, 14);
    this.fx.splat(p.x, p.surfaceY, true);
    this.fx.quip(p.x, p.surfaceY - 160, `${p.type.name.toUpperCase()} IS TOAST!`, '#ff6a4d', 40, 0);
    audio.sfx('sfx_boing', { rate: 0.7 });
    p.setShield(0);
    p.setTraps(0);
    if (p === this.possessedPizza) this.possess(null);
    let rises = false;
    if (this.run.armed.includes('angel')) {
      this.run.consume('angel');
      rises = true;
      this.time.delayedCall(1100, () => {
        p.revive(4);
        this.fx.healBurst(p.x, p.surfaceY);
        this.fx.quip(p.x, p.surfaceY - 160, 'PIZZA ANGEL!', '#ffffff', 52);
        audio.sfx('sfx_heal');
        this.recompute();
      });
    } else if (p.type.perk === 'riseOnce' && !p.flags.rose) {
      p.flags.rose = true;
      rises = true;
      this.time.delayedCall(1100, () => {
        p.revive(3);
        this.fx.healBurst(p.x, p.surfaceY);
        this.fx.quip(p.x, p.surfaceY - 160, 'CARBONARA RISES!', '#fff6c0', 48);
        audio.sfx('sfx_heal');
        this.recompute();
      });
    } else ui.hud.toast(null, 'PERK LOST', `${p.type.name}: ${p.type.perkText}`);
    this.recompute();
    if (!this.alivePizzas().length && !rises) {
      this.time.delayedCall(1300, () => {
        if (!this.alivePizzas().length) this.gameOver();
      });
    }
  }

  // ——— Peel Slam ———
  // ——— Peel abilities ———
  private abilityTick(dt: number): void {
    const a = this.ability;
    if (!a || !this.waveActive) return;
    if (a.trigger.t === 'auto' && this.run.super >= 1 && this.feet.some((f) => f.hittable)) {
      this.run.super = 0;
      this.fireAbility();
    } else if (a.trigger.t === 'every') {
      this.abilityT += dt * passiveBoost(this.run.stats.superGain).timer;
      if (this.abilityT >= a.trigger.sec && this.feet.some((f) => f.hittable)) {
        this.abilityT = 0;
        this.fireAbility();
      }
    }
  }

  /** Wave-start abilities: heals, shields, tips. */
  private abilityWaveStart(): void {
    if (this.ability?.trigger.t === 'wave') this.time.delayedCall(600, () => this.fireAbility({ x: W / 2, y: 520 }));
    if (this.procs.some((x) => x.p.trigger.t === 'wave')) this.time.delayedCall(700, () => this.fireProcs('wave', { x: W / 2, y: 520 }));
  }

  private abilityTargets(t: Target, ctx: { foot?: Foot; x?: number; y?: number }): Foot[] {
    const live = this.feet.filter((f) => f.hittable && !f.phased);
    switch (t.to) {
      case 'all':
        return live;
      case 'peel':
        return live.filter((f) => f.distanceTo(this.peelPos.x, this.peelPos.y) <= t.r);
      case 'hit': {
        const x = ctx.foot?.cx ?? ctx.x ?? this.peelPos.x;
        const y = ctx.foot?.cy ?? ctx.y ?? this.peelPos.y;
        if (!t.r) return ctx.foot && ctx.foot.alive ? [ctx.foot] : live.filter((f) => f.distanceTo(x, y) <= 60).slice(0, 1);
        return live.filter((f) => f === ctx.foot || f.distanceTo(x, y) <= t.r!);
      }
      case 'random':
        return Phaser.Utils.Array.Shuffle([...live]).slice(0, t.n);
      case 'front':
        return [...live].sort((a, b) => b.y - a.y).slice(0, t.n);
      case 'toughest':
        return [...live].sort((a, b) => Number(b.isBossLike) - Number(a.isBossLike) || b.hp - a.hp).slice(0, t.n);
      case 'pizzas': {
        const ps = this.alivePizzas();
        return live.filter((f) => ps.some((p) => Math.hypot(f.cx - p.x, f.cy - (p.surfaceY - 80)) <= t.r));
      }
      case 'blast': {
        const picks =
          t.pick === 'front'
            ? [...live].sort((a, b) => b.y - a.y).slice(0, t.n)
            : t.pick === 'toughest'
              ? [...live].sort((a, b) => Number(b.isBossLike) - Number(a.isBossLike) || b.hp - a.hp).slice(0, t.n)
              : Phaser.Utils.Array.Shuffle([...live]).slice(0, t.n);
        const out = new Set<Foot>();
        for (const c of picks) {
          this.fx.explosion(c.cx, c.cy, t.r);
          for (const f of live) if (f.distanceTo(c.cx, c.cy) <= t.r) out.add(f);
        }
        if (picks.length) audio.sfx('sfx_explosion', { throttle: 90, volume: 0.6 });
        return [...out];
      }
    }
  }

  /** Run the peel's ability. ctx: the foot (and point) that set it off, for smack, kill and stomp triggers. */
  private fireAbility(ctx: { foot?: Foot; x?: number; y?: number } = {}): void {
    const a = this.ability;
    if (!a || this.over || this.inUpgrade) return;
    const st = this.run.stats;
    const color = a.color;
    const big = a.trigger.t === 'active' || a.trigger.t === 'auto';
    if (big) {
      if (a.vfx === 'slam') {
        const sweep = this.add.image(-400, 560, 'peel').setScale(3.2).setAngle(-90).setOrigin(0.5, 100 / 360);
        this.fxLayer.add(sweep);
        this.tweens.add({ targets: sweep, x: W + 400, angle: -70, duration: 520, ease: 'Sine.InOut', onComplete: () => sweep.destroy() });
      }
      audio.sfx('sfx_whoosh', { volume: 1, rate: 0.8 });
      audio.sfx(a.vfx === 'frost' ? 'sfx_freeze' : a.vfx === 'zap' ? 'sfx_zap' : 'sfx_crit');
      this.shake(300, 0.009);
      this.rumble(0.8, 250);
      this.flash(160, (color >> 16) & 255, (color >> 8) & 255, color & 255);
      this.fx.quip(W / 2, 420, `${a.name.toUpperCase()}!`, '#' + color.toString(16).padStart(6, '0'), 72, -4);
      this.lastSlam = this.nowT;
    } else if (a.trigger.t === 'every' || a.trigger.t === 'wave') {
      this.fx.quip(ctx.x ?? this.peelPos.x, (ctx.y ?? this.peelPos.y) - 90, a.name, '#' + color.toString(16).padStart(6, '0'), 30, 0);
    }
    this.runEffects(a.fx, ctx, color, a.vfx, true);
    // Freeze Frame and Cajun Shrimp work on a meter ability the way they do on the Peel Slam
    if (big && (st.freezeSlam || st.slamStun)) {
      for (const f of this.feet) {
        if (!f.alive || !f.hittable) continue;
        if (st.freezeSlam) {
          f.stun(3, true);
          this.fx.frost(f.cx, f.cy);
        } else if (!f.isBossLike) f.stun(1.5);
      }
      if (st.freezeSlam) audio.sfx('sfx_freeze');
    }
  }

  /** Topping procs for one trigger kind (smack, kill, stomp, wave). */
  private fireProcs(kind: 'smack' | 'kill' | 'stomp' | 'wave', ctx: { foot?: Foot; x?: number; y?: number }): void {
    if (this.over || this.inUpgrade) return;
    for (const pr of this.procs) {
      const t = pr.p.trigger;
      if (t.t !== kind) continue;
      if ((t.t === 'smack' || t.t === 'kill') && Math.random() >= t.p) continue;
      this.runEffects(pr.p.fx, ctx, pr.p.color, pr.p.vfx);
    }
  }

  private procTick(dt: number): void {
    if (!this.waveActive || !this.procs.length) return;
    const any = this.feet.some((f) => f.hittable);
    for (const pr of this.procs) {
      if (pr.p.trigger.t !== 'every') continue;
      pr.t += dt;
      if (pr.t < pr.p.trigger.sec || !any) continue;
      pr.t = 0;
      this.runEffects(pr.p.fx, { x: this.peelPos.x, y: this.peelPos.y }, pr.p.color, pr.p.vfx);
    }
  }

  /** Run a list of effects; effects that share a target hit the same feet ("…then burn them"). */
  private runEffects(fx: Effect[], ctx: { foot?: Foot; x?: number; y?: number }, color: number, vfx: Ability['vfx'], fromAbility = false): void {
    const cache = new Map<string, Foot[]>();
    for (const e of fx) this.applyAbilityEffect(e, ctx, color, vfx, cache, fromAbility);
  }

  private applyAbilityEffect(e: Effect, ctx: { foot?: Foot; x?: number; y?: number }, color: number, vfx: Ability['vfx'], cache?: Map<string, Foot[]>, fromAbility = false): void {
    const st = this.run.stats;
    const targets = (t: Target): Foot[] => {
      const k = JSON.stringify(t);
      const hitList = cache?.get(k);
      if (hitList) return hitList.filter((f) => f.alive && f.hittable);
      const list = this.abilityTargets(t, ctx);
      cache?.set(k, list);
      return list;
    };
    const mark = (f: Foot) => {
      if (vfx === 'frost') this.fx.frost(f.cx, f.cy);
      else if (vfx === 'fire') this.fx.burn(f.cx, f.cy);
      else if (vfx === 'zap' || vfx === 'gold') this.fx.glint(f.cx, f.cy, 3);
      else if (vfx === 'rain') {
        const drop = this.add.image(f.cx, f.cy - 320, 'glow').setTint(color).setBlendMode(Phaser.BlendModes.ADD).setScale(0.35, 0.9).setAlpha(0.9);
        this.fxLayer.add(drop);
        this.tweens.add({ targets: drop, y: f.cy, duration: 160, ease: 'Quad.In', onComplete: () => drop.destroy() });
      } else this.fx.impact(f.cx, f.cy, false);
    };
    switch (e.e) {
      case 'dmg':
        for (const f of targets(e.at)) {
          mark(f);
          this.dealDamage(f, e.x * st.damage, { source: 'ability', knock: e.knock ?? 120, x: f.cx, y: f.cy });
          // a passive ability's hits pick up Freeze Frame (chill) and Cajun Shrimp (sometimes stun)
          if (fromAbility && f.alive && this.ability && !usesMeter(this.ability)) {
            if (st.freezeSlam) {
              f.slowT = Math.max(f.slowT, 2);
              f.slowPct = Math.max(f.slowPct, 0.4);
            }
            if (st.slamStun && !f.isBossLike && Math.random() < 0.25) f.stun(1);
          }
        }
        break;
      case 'burn':
        for (const f of targets(e.at)) {
          if (f.has('immuneBurn')) continue;
          this.fx.burn(f.cx, f.cy);
          f.burnFromAbility = true;
          f.burnT = Math.max(f.burnT, e.sec);
          f.burnDps = Math.max(f.burnDps, e.x * st.damage);
        }
        break;
      case 'slow':
        for (const f of targets(e.at)) {
          f.slowT = Math.max(f.slowT, e.sec);
          f.slowPct = Math.max(f.slowPct, e.pct);
        }
        break;
      case 'stun':
        for (const f of targets(e.at)) {
          // bosses shrug off half of it
          f.stun(f.isBossLike ? e.sec / 2 : e.sec, !!e.freeze);
          if (e.freeze) this.fx.frost(f.cx, f.cy);
        }
        if (e.freeze) audio.sfx('sfx_freeze', { throttle: 200 });
        break;
      case 'knock':
        for (const f of targets(e.at)) if (!f.isBossLike) f.knock(e.px);
        break;
      case 'mark':
        for (const f of targets(e.at)) {
          f.markMult = Math.max(f.markUntil > this.nowT ? f.markMult : 1, e.mult);
          f.markUntil = this.nowT + e.sec;
          f.flash(color, 120);
        }
        break;
      case 'chain': {
        const from = targets(e.at)[0];
        if (!from) break;
        let prev = from;
        const done = new Set<Foot>([from]);
        audio.sfx('sfx_zap', { throttle: 60 });
        for (let i = 0; i < e.jumps; i++) {
          const next = this.feet
            .filter((o) => o.hittable && !done.has(o))
            .sort((a, b) => Math.hypot(a.cx - prev.cx, a.cy - prev.cy) - Math.hypot(b.cx - prev.cx, b.cy - prev.cy))[0];
          if (!next || Math.hypot(next.cx - prev.cx, next.cy - prev.cy) > 700) break;
          this.fx.lightning(prev.cx, prev.cy, next.cx, next.cy);
          this.dealDamage(next, e.x * st.damage, { source: 'ability' });
          done.add(next);
          prev = next;
        }
        break;
      }
      case 'execute':
        for (const f of targets(e.at)) {
          if (f.isBossLike || !f.alive || f.shielded || f.hp / f.maxHp > e.below) continue;
          this.fx.quip(f.x, f.cy - 120, 'FINISHED!', '#ff8a6a', 36);
          f.wool = 0;
          this.killFoot(f, 'ability');
        }
        break;
      case 'heal': {
        const ps = this.alivePizzas();
        const list = e.who === 'all' ? ps : [...ps].sort((a, b) => a.slices / a.maxSlices - b.slices / b.maxSlices).slice(0, 1);
        for (const p of list) if (p.slices < p.maxSlices) this.healPizza(p, e.n);
        break;
      }
      case 'shield': {
        const ps = this.alivePizzas();
        const list = e.who === 'all' ? ps : [...ps].sort((a, b) => a.shieldCharges - b.shieldCharges || a.slices - b.slices).slice(0, 1);
        for (const p of list) {
          p.setShield(p.shieldCharges + e.n);
          this.fx.ring(p.x, p.surfaceY - 40, color, 0.8, 0.4);
        }
        break;
      }
      case 'fresh': {
        const ps = this.alivePizzas().filter((p) => p.freshOn);
        const list = e.who === 'all' ? ps : [...ps].sort((a, b) => a.fresh - b.fresh).slice(0, 1);
        for (const p of list) p.setFresh(Math.min(p.maxFresh, p.fresh + e.n));
        break;
      }
      case 'tips':
        this.giveTips(Math.round(e.n * this.run.heatDef.tips), ctx.x ?? this.peelPos.x, ctx.y ?? this.peelPos.y);
        break;
      case 'stat':
        break; // applied in recompute()
    }
  }

  private peelSlam(): void {
    if (this.run.super < 1 || !this.waveActive || this.over || this.paused || this.inUpgrade) return;
    if (this.ability) {
      // the peel's ability replaces the slam: only active ones are pressed
      if (this.ability.trigger.t !== 'active') return;
      this.run.super = 0;
      this.fireAbility();
      return;
    }
    this.run.super = 0;
    const st = this.run.stats;
    const big = this.add.image(-400, 560, 'peel').setScale(3.2).setAngle(-90).setOrigin(0.5, 100 / 360);
    this.fxLayer.add(big);
    audio.sfx('sfx_whoosh', { volume: 1, rate: 0.7 });
    this.tweens.add({ targets: big, x: W + 400, angle: -70, duration: 520, ease: 'Sine.InOut', onComplete: () => big.destroy() });
    this.time.delayedCall(230, () => {
      this.lastSlam = this.nowT;
      audio.sfx('sfx_crit');
      audio.sfx('sfx_explosion', { volume: 0.8 });
      this.shake(420, 0.012);
      this.rumble(1, 350);
      this.flash(180, 255, 230, 160);
      for (const f of this.aliveFeet()) {
        if (f.phased) continue;
        this.fx.impact(f.cx, f.cy, true);
        this.dealDamage(f, 60 + st.damage * 4, { source: 'slam', knock: 1100 });
        if (st.freezeSlam && f.alive) {
          f.stun(3, true);
          this.fx.frost(f.cx, f.cy);
        } else if (st.slamStun && f.alive && !f.isBossLike) f.stun(1.5);
      }
      if (st.freezeSlam) audio.sfx('sfx_freeze');
      this.fx.quip(W / 2, 420, 'PEEL SLAM!', '#ffd23f', 90, -4);
    });
  }

  // ——— Passive weapons ———
  private peelScale(): number {
    return 0.5 + (this.run.stats.radius - 26) / 130;
  }

  private syncCutters(): void {
    const n = this.run.stats.cutters;
    while (this.cutters.length < n) {
      const c = this.add.image(0, 0, 'cutter').setScale(0.8);
      this.cursorLayer.add(c);
      this.cutters.push(c);
    }
    while (this.cutters.length > n) this.cutters.pop()!.destroy();
  }

  private syncGarlic(): void {
    for (const g of this.garlicAuras) g.destroy();
    this.garlicAuras = [];
    for (const p of this.alivePizzas()) {
      const dps = this.run.stats.garlicDps + (p.perk === 'garlic' ? 6 : 0) + (p.perk === 'heatAbove' ? 3 : 0);
      if (dps <= 0) continue;
      const g = this.add.image(p.x, p.surfaceY - 120, 'glow').setTint(p.perk === 'heatAbove' ? 0xffa060 : 0xb8ff7a).setBlendMode(Phaser.BlendModes.ADD).setScale(2.2, 1.6).setAlpha(0.25);
      this.shadowLayer.add(g);
      this.garlicAuras.push(g);
    }
  }

  private passives(dt: number): void {
    const st = this.run.stats;
    if (this.cutters.length) {
      this.cutterAngle += dt * 4.2;
      this.cutters.forEach((c, i) => {
        const a = this.cutterAngle + (i / this.cutters.length) * Math.PI * 2;
        const cx = this.peelPos.x + Math.cos(a) * 125;
        const cy = this.peelPos.y + Math.sin(a) * 85;
        c.setPosition(cx, cy).setRotation(c.rotation + dt * 18);
        for (const f of this.feet) {
          if (!f.hittable || f.distanceTo(cx, cy) > 30) continue;
          const cd = this.cutterCd.get(f) ?? 0;
          if (cd > this.nowT) continue;
          this.cutterCd.set(f, this.nowT + 0.35);
          this.dealDamage(f, st.cutterDmg + st.damage * 0.4, { source: 'cutter', knock: 60, x: cx, y: cy });
          audio.sfx('sfx_slap_2', { volume: 0.35, rate: 1.6, throttle: 80 });
          this.fx.impact(cx, cy, false);
        }
      });
    }
    if (st.oliveRate > 0) {
      this.oliveT += dt;
      if (this.oliveT >= 1 / st.oliveRate) {
        this.oliveT = 0;
        const targets = this.feet.filter((f) => f.hittable && f.y > 150);
        const src = Phaser.Utils.Array.GetRandom(this.alivePizzas());
        if (targets.length && src) {
          const f = targets.sort((a, b) => b.y - a.y)[0];
          const o = this.add.image(src.x, src.surfaceY - 20, 'olive');
          this.fxLayer.add(o);
          audio.sfx('sfx_boing', { volume: 0.25, rate: 1.8, throttle: 100 });
          this.tweens.add({
            targets: o,
            x: f.cx,
            y: f.cy,
            angle: 720,
            duration: 300,
            ease: 'Quad.In',
            onComplete: () => {
              o.destroy();
              if (f.alive) {
                this.dealDamage(f, st.oliveDmg + st.damage * 0.5, { source: 'olive', knock: 140 });
                this.fx.impact(f.cx, f.cy, false);
              }
            },
          });
        }
      }
    }
    this.garlicT += dt;
    const tickGarlic = this.garlicT >= 0.25;
    if (tickGarlic) this.garlicT = 0;
    const cheerers = this.feet.filter((c) => c.alive && c.has('cheer'));
    for (const c of cheerers) if (Math.random() < dt * 4) this.fx.party(c.cx, c.cy - 40, 2);
    for (const f of this.feet) {
      if (!f.alive) continue;
      f.cheer = cheerers.some((c) => c !== f && Math.abs(c.x - f.x) < 450) ? 0.2 : 0;
      if (!f.isBossLike) f.hurry = this.hurryT > 0 ? this.hurryMult : 1;
      const t = f.target;
      f.slowAbove = t && !t.dead && t.perk === 'slowAbove' ? 0.25 : 0;
      if (tickGarlic && t && !t.dead && f.y > t.surfaceY - 300 && Math.abs(f.x - t.x) < t.radius * 1.1) {
        const dps = st.garlicDps + (t.perk === 'garlic' ? 6 : 0) + (t.perk === 'heatAbove' && f.state === 'hover' ? 3 : 0);
        if (dps > 0 && !f.phased) this.dealDamage(f, dps * 0.25, { source: 'garlic', quiet: true });
      }
      if (f.burnT > 0 && f.alive) {
        f.burnAcc += f.burnDps * dt;
        if (Math.random() < dt * 14) this.fx.burn(f.cx, f.cy + 20);
        if (f.burnAcc >= 4) {
          const d = f.burnAcc;
          f.burnAcc = 0;
          this.dealDamage(f, d, { source: 'burn' });
        }
      }
      if (f.alive && f.has('stink') && t && !t.dead && (f.state === 'hover' || f.state === 'descend')) {
        f.stink += dt * 0.22;
        if (Math.random() < dt * 6) this.fx.stinkPuff(f.cx, f.cy + 40);
        if (f.stink >= 1) {
          f.stink = 0;
          this.fx.quip(t.x, t.surfaceY - 120, 'PEE-YEW!', '#b8e05a', 46);
          audio.sfx('sfx_squish', { rate: 0.7 });
          const removed = t.takeSlices(1, t.x);
          this.waveSlicesLost += removed.length;
          this.run.slicesLost += removed.length;
          if (t.dead) this.pizzaDestroyed(t);
        }
      }
    }
    for (const g of this.garlicAuras) g.setAlpha(0.18 + Math.sin(this.nowT * 3) * 0.07);
    for (const p of this.alivePizzas()) {
      if (p.perk !== 'regen') continue;
      p.regenTimer += dt;
      if (p.regenTimer >= 20) {
        p.regenTimer = 0;
        this.healPizza(p, 1);
      }
    }
  }

  // ——— Controller ———
  private padInput(ev: { type: 'aim'; dx: number; dy: number } | { type: 'lane'; dir: number } | { type: 'smack' } | { type: 'slam' } | { type: 'pause' } | { type: 'mute' }): void {
    if (ev.type === 'pause') {
      if (this.paused) this.resume();
      else this.togglePause();
      return;
    }
    if (this.paused || this.over || this.inUpgrade || ui.modalOpen) return;
    if (ev.type === 'aim') {
      this.pointer.x = Phaser.Math.Clamp(this.pointer.x + ev.dx, 20, W - 20);
      this.pointer.y = Phaser.Math.Clamp(this.pointer.y + ev.dy, 20, H - 20);
      // aim assist: a gentle pull toward the nearest smackable foot
      const assist = save.settings.aimAssist;
      if (assist > 0) {
        const near = this.feet.filter((f) => f.hittable).map((f) => ({ f, d: Math.hypot(f.cx - this.pointer.x, f.cy - this.pointer.y) })).sort((a, b) => a.d - b.d)[0];
        if (near && near.d < 220) {
          this.pointer.x += (near.f.cx - this.pointer.x) * assist * 0.12;
          this.pointer.y += (near.f.cy - this.pointer.y) * assist * 0.12;
        }
      }
      this.pointer.lastMove = this.nowT;
      this.pointer.touch = false;
      if (this.peelSlowT <= 0) Object.assign(this.peelPos, { x: this.pointer.x, y: this.pointer.y });
    } else if (ev.type === 'lane') {
      // lane mode: pick a pizza; Smack hits the lowest foot above it
      const ps = [...this.alivePizzas()].sort((a, b) => a.x - b.x);
      if (!ps.length) return;
      let i = ps.findIndex((p) => Math.abs(p.x - this.pointer.x) < 5);
      i = i < 0 ? Math.floor(ps.length / 2) : Phaser.Math.Clamp(i + ev.dir, 0, ps.length - 1);
      this.pointer.x = ps[i].x;
      this.pointer.y = ps[i].surfaceY - 200;
      Object.assign(this.peelPos, { x: this.pointer.x, y: this.pointer.y });
    } else if (ev.type === 'smack') {
      if (save.settings.aimScheme === 'lane') {
        const ps = [...this.alivePizzas()].sort((a, b) => Math.abs(a.x - this.pointer.x) - Math.abs(b.x - this.pointer.x));
        const lane = ps[0];
        const low = this.feet.filter((f) => f.hittable && lane && Math.abs(f.x - lane.x) < lane.radius * 1.2).sort((a, b) => b.y - a.y)[0];
        if (low) {
          Object.assign(this.peelPos, { x: low.cx, y: low.cy });
          this.smack(low.cx, low.cy);
          return;
        }
      }
      this.smack(this.peelPos.x, this.peelPos.y);
    } else if (ev.type === 'slam') this.peelSlam();
    else if (ev.type === 'mute') {
      updateSettings({ muted: !save.settings.muted });
      ui.hud.syncMute();
    }
  }

  // ——— Onboarding ———
  /** A first-time card; `after` runs once it's closed (or straight away if it isn't shown). */
  private introCard(id: 'shop' | 'kinds' | 'swap' | 'freshness' | 'phases' | 'mini' | 'events' | 'golden', after?: () => void): void {
    if (save.seenIntros.includes(id) || (id === 'freshness' && this.run.heatDef.freshness <= 0)) {
      after?.();
      return;
    }
    save.seenIntros.push(id);
    persist();
    const inPlay = !this.inUpgrade;
    if (inPlay) {
      this.paused = true;
      this.scene.pause();
    }
    ui.intro(id, () => {
      if (inPlay) {
        this.paused = false;
        this.scene.resume();
      }
      after?.();
    });
  }

  // ——— Frame ———
  update(_time: number, deltaMs: number): void {
    const real = Math.min(0.05, deltaMs / 1000);
    this.nowT += real;
    this.backdrop.update(real);
    pad.poll(real);
    ui.hud.setFps(this.game.loop.actualFps);
    let scale = 1;
    if (this.hitStop > 0) {
      this.hitStop -= real;
      scale = 0.06;
    }
    if (this.slowMo > 0) {
      this.slowMo -= real;
      scale = Math.min(scale, 0.3);
      this.tweens.timeScale = 0.4 * this.tweenBase;
      if (this.slowMo <= 0) this.tweens.timeScale = this.tweenBase;
    }
    const dt = real * scale;
    // peel: stunned, slowed (trails the pointer) or free
    if (this.peelStunT > 0) {
      this.peelStunT -= real;
      if (this.peelStunT <= 0) this.peel.clearTint();
    }
    if (this.peelSlowT > 0) {
      this.peelSlowT -= real;
      this.peelPos.x += (this.pointer.x - this.peelPos.x) * Math.min(1, real * 2.5);
      this.peelPos.y += (this.pointer.y - this.peelPos.y) * Math.min(1, real * 2.5);
      this.peel.setTint(0xa8dcff);
      if (this.peelSlowT <= 0 && this.peelStunT <= 0) this.peel.clearTint();
    } else {
      this.peelPos.x = this.pointer.x;
      this.peelPos.y = this.pointer.y;
    }
    if (this.hurryT > 0) this.hurryT -= dt;
    const touchIdle = this.pointer.touch && this.nowT - this.pointer.lastMove > 0.5;
    this.peel.setPosition(this.peelPos.x, this.peelPos.y).setVisible(!this.inUpgrade && !this.over && !touchIdle);
    this.peelTrailTick();
    if (!this.paused && !this.over && !this.inUpgrade) {
      this.spawnTick(dt);
      for (const f of this.feet) if (f.alive) f.update(dt, 1);
      this.director.update(dt);
      this.feet = this.feet.filter((f) => f.state !== 'gone');
      this.feetLayer.sort('y');
      this.passives(dt);
      this.abilityTick(dt);
      this.procTick(dt);
      if (this.run.combo > 0) {
        this.run.comboTimer -= dt;
        if (this.run.combo > 0 && this.run.comboTimer <= 0) this.run.combo = 0;
      }
      this.checkWaveEnd();
    }
    for (const p of this.pizzas) {
      let best: Foot | null = null;
      let threat = 0;
      for (const f of this.feet) {
        if (!f.alive || f.target !== p) continue;
        const t = Phaser.Math.Clamp((f.y - 300) / (p.surfaceY - 300), 0, 1);
        if (t > threat) {
          threat = t;
          best = f;
        }
      }
      p.update(real, best ? best.x : null, threat);
      if (threat > 0.75 && Math.random() < real * 2) this.fx.sweatDrop(p.x + (Math.random() - 0.5) * 60, p.surfaceY - 30);
    }
    // the tips counter fades while a foot is behind it
    ui.hud.setCoinFade(this.feet.some((f) => f.alive && f.x > 1460 && f.y < 520));
    // …and the NEW FOOT card (bottom-left) while one comes down over the left of the table
    ui.hud.setNewFootFade(this.feet.some((f) => f.alive && f.x < 640 && f.y > 380));
    const r = this.run;
    ui.hud.setScore(r.score);
    if (this.displayCoins > r.coins) this.displayCoins = r.coins;
    ui.hud.setCoins(this.inUpgrade ? r.coins : Math.round(this.displayCoins));
    ui.hud.setCombo(r.combo, r.comboMult(), r.comboTimer / (COMBO_BASE_WINDOW + r.stats.comboBonus));
    const ab = this.ability;
    if (!ab || usesMeter(ab)) ui.hud.setSuper(r.super);
    else ui.hud.setSuper(ab.trigger.t === 'every' ? this.abilityT / ab.trigger.sec : 0);
    if (ab && ab.trigger.t !== 'active') this.slamHinted = true;
    if (r.super >= 1 && !this.slamHinted && this.waveActive) {
      this.slamHinted = true;
      ui.hud.toast(null, 'PEEL SLAM READY!', pad.active ? 'Press X to smack every foot at once' : 'Press SPACE or tap the SLAM button to smack every foot at once');
      audio.sfx('sfx_combo', { rate: 1.4 });
    }
  }

  // ——— Pause / game over ———
  private onKey(e: KeyboardEvent): void {
    const k = e.key.toLowerCase();
    pad.usedMouse();
    if (k === 'escape' || k === 'p') {
      if (this.paused) this.resume();
      else this.togglePause();
    } else if (k === ' ' || k === 'spacebar') {
      e.preventDefault();
      this.peelSlam();
    } else if (k === 'm') {
      updateSettings({ muted: !save.settings.muted });
      ui.hud.syncMute();
    }
  }

  private pauseEl: HTMLElement | null = null;

  private togglePause(force = false): void {
    if (this.over || this.inUpgrade || (this.paused && !force)) return;
    this.paused = true;
    this.scene.pause();
    ui.setPlaying(false);
    audio.duck(0.45);
    this.pauseEl = ui.pause({
      resume: () => this.resume(),
      settings: () => {
        if (this.pauseEl) ui.close(this.pauseEl);
        this.pauseEl = null;
        ui.settings(() => {
          this.registry.set('traitIcons', save.settings.traitIcons);
          for (const f of this.feet) f.syncIcons();
          this.paused = false;
          this.togglePause(true);
        }, true);
      },
      quit: () => {
        ui.closeAll();
        this.scene.resume();
        this.paused = false;
        this.gameOver(true);
      },
      owned: this.run.owned,
      armed: this.run.armed,
      wave: this.run.wave,
      score: this.run.score,
    });
  }

  private resume(): void {
    if (!this.paused) return;
    ui.closeAll();
    this.pauseEl = null;
    this.paused = false;
    this.scene.resume();
    ui.setPlaying(!this.inUpgrade);
    audio.duck(1);
  }

  private secondChanceCost(): number {
    return 80 * 2 ** this.run.secondChances;
  }

  /** Replay the wave you lost with 3 pizzas at half slices. */
  private useSecondChance(): void {
    const cost = this.secondChanceCost();
    if (save.crusts < cost) return;
    save.crusts -= cost;
    this.run.secondChances++;
    persist();
    ui.closeAll();
    this.over = false;
    const dead = [...this.pizzas].sort((a, b) => b.maxSlices - a.maxSlices).slice(0, 3);
    for (const p of dead) {
      p.revive(Math.ceil(p.maxSlices / 2));
      p.setFresh(Math.max(p.fresh, 4));
    }
    for (const f of this.feet) if (f.alive) f.escape();
    this.director.clear();
    this.bossFoot = null;
    this.miniFoot = null;
    this.clickables = [];
    this.possess(null);
    this.recompute();
    ui.setPlaying(true);
    audio.duck(1);
    ui.hud.banner('SECOND CHANCE', `Wave ${this.run.wave} again`, 'loc');
    const w = this.run.wave;
    this.time.delayedCall(1800, () => this.beginWave(w));
    const loc = locationFor(w);
    audio.music(this, isBossWave(w) ? bossMusic(backdropFor(w) as ArenaId) : LOCATION_MUSIC[loc], 800);
  }

  /** Finished the 60-wave journey. */
  private victory(): void {
    this.inUpgrade = true;
    ui.setPlaying(false);
    audio.stop('music', 600);
    this.time.delayedCall(300, () => audio.sting('music_victory', 1));
    const r = this.run;
    const secs = Math.round((performance.now() - r.startTime) / 1000);
    ui.victory({
      score: r.score,
      time: `${Math.floor(secs / 3600)}:${String(Math.floor(secs / 60) % 60).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`,
      feet: r.feetSmacked,
      bosses: r.bossesBeaten.length,
      heat: r.heatDef.name,
      crusts: r.crustsEarned(this.figOnTable()),
      keepGoing: () => {
        ui.closeAll();
        this.openUpgrades(true, undefined, 'ENDLESS MODE · STOCK UP');
      },
      bank: () => this.gameOver(true, true),
    });
  }

  private gameOver(quit = false, victory = false): void {
    if (this.over) return;
    this.over = true;
    this.waveActive = false;
    this.inUpgrade = false;
    this.run.combo = 0;
    ui.closeAll();
    ui.setPlaying(false);
    ui.hud.setBoss(null);
    ui.hud.tutorial(false);
    this.director.clear();
    const r = this.run;
    if (!quit) {
      this.slowMo = 1.2;
      audio.stop('music', 600);
      audio.sfx('sfx_gameover');
      this.time.delayedCall(900, () => audio.sting('music_gameover', 0.9));
    } else audio.stop('music', 400);
    for (const f of this.aliveFeet()) this.time.delayedCall(Math.random() * 600, () => f.alive && f.escape());
    const canSecond = !quit && !victory && this.run.heat !== 'inferno' && save.crusts >= this.secondChanceCost();
    const finish = () => {
      this.checkMilestones();
      // bosses and events were banked as they happened; the score and waves pay out now
      const crusts = r.crustsEarned(this.figOnTable());
      const table = r.act2Start ? save.bestAct2 : save.best;
      const best = table[r.heat] ?? { score: 0, wave: 0 };
      const newBest = r.score > best.score;
      table[r.heat] = { score: Math.max(best.score, r.score), wave: Math.max(best.wave, r.wave) };
      save.crusts += r.endCrusts(this.figOnTable());
      save.runs++;
      if (r.score > save.bestScore) save.bestScore = r.score;
      if (r.wave > save.bestWave) save.bestWave = r.wave;
      save.tutorialDone = true;
      save.run = null;
      persist();
      return { crusts, newBest };
    };
    const secs = Math.round((performance.now() - r.startTime) / 1000);
    this.time.delayedCall(quit ? 200 : 2000, () => {
      audio.duck(0.6);
      const restart = (data: GameStart) => {
        ui.closeAll();
        this.cameras.main.fadeOut(350, 18, 10, 6);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart(data));
      };
      const show = () => {
        const { crusts, newBest } = finish();
        ui.gameOver({
          score: r.score,
          wave: r.wave,
          feet: r.feetSmacked,
          combo: r.bestCombo,
          bosses: r.bossesBeaten.length,
          crusts,
          newBest,
          heat: r.heatDef.name,
          location: BACKDROPS[backdropFor(Math.max(1, r.wave))].name,
          secondChanceRun: r.secondChances > 0,
          time: `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`,
          unlocked: r.newUnlocks,
          affordable: PIZZAS.filter((p) => !save.unlockedPizzas.includes(p.id) && p.cost <= save.crusts)
            .sort((a, b) => a.cost - b.cost)
            .map((p) => p.id),
          next: nextLockedPizza(PIZZAS),
          victory,
          again: () => restart({ lineup: randomLineup(save.meta.table ? 4 : 3), heat: r.heat }),
          menu: () => {
            ui.closeAll();
            this.scene.start('Menu');
          },
          pizzeria: () => {
            ui.closeAll();
            ui.pizzeria(() => this.scene.start('Menu'));
          },
        });
      };
      if (canSecond) {
        ui.secondChance({
          wave: r.wave,
          cost: this.secondChanceCost(),
          bank: save.crusts,
          nextCost: this.secondChanceCost() * 2,
          use: () => this.useSecondChance(),
          decline: () => {
            ui.closeAll();
            show();
          },
        });
      } else show();
    });
  }
}
