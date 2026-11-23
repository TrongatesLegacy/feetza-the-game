import Phaser from 'phaser';
import { BACKDROPS, type ArenaId, type BackdropId, type LocationId } from '../art/backdrops';
import { BASE_SLICES, COMBO_BASE_WINDOW, H, MAX_PIZZAS, PIZZA_Y, W } from '../config';

/** Lane width: about one foot wide, so feet in neighbouring lanes don't overlap. */
const LANE_W = 250;
import type { HeatId } from '../data/difficulty';
import { FEET, FOOT_BY_ID, OUCH, type FootType } from '../data/feet';
import { MILESTONES } from '../data/meta';
import { PIZZAS, PIZZA_BY_ID, enhancedText } from '../data/pizzas';
import { ACT_COUNT, BOSS_MINION, HEAT_UNLOCK_WAVE, JOURNEY_WAVES, actLabel, actName, actOf, actStartWave, isActEnd, isActStart, waveInJourney } from '../data/stages';
import { UPGRADES, UPGRADE_BY_ID, kindOf, type Rarity, type Upgrade } from '../data/upgrades';
import type { Arena, Clickable } from '../game/arena';
import { evictFootArt, footPortraitURL, pizzaPortraitURL, setArtWarmBusy, texturesInUse, warmFootArt } from '../game/assets';
import { BackdropView } from '../game/BackdropView';
import { prepareLive, releaseLive } from '../game/liveBackdrop';
import { BossDirector } from '../game/bosses';
import { PHASE_CARDS_OFF, phaseCardFor, phaseCardsOn, phaseSeenKey } from '../game/phaseCards';
import { eventName, startEvent, type EventId } from '../game/events';
import { Foot } from '../game/Foot';
import { Fx } from '../game/Fx';
import { Pizza, pizzaHooks } from '../game/Pizza';
import { Projectiles } from '../game/projectiles';
import { DOUBLE_CAP, endlessPlus, LOCATION_AMBIENCE, LOCATION_MUSIC, RARITY_FROM, Run, awardMilestones, milestoneProgress, backdropFor, bestRarity, rarityOpen, specialPrice, bossMusic, isBossWave, isMiniWave, locationFor, loopOf, waveInStage, planWave, footPool, type WavePlan, bossFor, miniFor } from '../game/Run';
import type { CounterSnap, RunSnapshot } from '../game/snapshot';
import { audio, bossSfx, heroSfx } from '../systems/audio';
import { setRunSmack } from '../game/smacks';
import { pad } from '../systems/gamepad';
import { markFootSeen, markToppingsSeen, nextLockedPizza, onSettingsChange, persist, save, updateSettings } from '../systems/save';
import { peelsAnimated } from '../systems/graphics';
import type { GoldenItem, RunSummary, ShopCard, ShopOffer, ShopPizza, ShopState, SlotSymbol, SlotsResult, YourTopping } from '../ui/shopTypes';
import { ui, fmtTime } from '../ui/ui';
import { PEELS, PEEL_BY_ID, abilityPeel, applyPeelLook, hasPeel, lookPeel, checkPeelAchievements, grantShinyFoot, peelCanvas, peelFootId, peelThumbURL, peelTrail, rollEventDrop, PEEL_HEATS, SHINY_FOOT_CHANCE, titleCase, type PeelDef } from '../game/peels';
import { STAGES, WAVES_PER_STAGE } from '../data/stages';
import { passiveBoost, setSlamMode } from '../game/slamMode';
import { guardHits, guardRearm, setRunHeat, slamSteps } from '../game/heatRules';
import { evictShieldArt } from '../game/guardShield';
import { abilityFor, abilityKindLabel, scaleProc, usesMeter, type Ability, type Effect, type Proc, type Target } from '../game/abilities';
import { randomLineup } from './MenuScene';
import { ToppingKit } from '../game/toppingKit';
import { freshKitShop, loadKitState } from '../game/kitState';
import { cardCount, counterFreebie, counterPrice, dealBlock, freeLunchReady, goldenPrice, happyHour, rerollPrice, toppingPrice } from '../game/shopDeals';
import { pickWindow, rouletteWindow, slotsPrizeWindow, type PickOption } from '../ui/pickWindows';
import { abilityKey } from '../game/abilities';
import { PizzaPerkKit } from '../game/pizzaPerks';
import { contentFx } from '../game/contentFx';
import { evictLive, setLiveWarmBusy, styleLive, warmLive } from '../game/liveKit';
import { evictZombieArt } from '../game/zombieArt';
import { ECHO_IDS } from '../game/bosses/act2b';
import { agents as solepropAgents } from '../game/bosses/act10';
import '../content/styleLive';
import { playLook, type LookFx } from '../art/animatedLooks';
import { HeroDirector } from '../game/heroMoves';
import type { HeroHost } from '../game/heroKit';
import { HeroTracker, bestGoal, type RunView } from '../game/heroGoals';
import { maybeSignal, sightingChance, sightingDue } from '../game/sightings';
import { addCanvas } from '../game/assets';
import { heroFootDmg, heroFootStomp, heroFootTick } from '../game/heroFeet';
// ——— Act 10 · Finale: the buyout and the ending (src/game/finale.ts; its layers run from src/game/acts/act10.ts) ———
import { finaleCast, finaleState, playEnding } from '../game/finale';
// ——— Nemesis stages: a hero peel swaps a stage for its nemesis (src/game/nemesis.ts) ———
import { applyNemesis, nemesisOf, setNemesisPeel } from '../game/nemesis';
import { HitboxOverlay, describeNear, labelOf, record, smackLog } from '../game/smackLog';

interface DamageOpts {
  source: 'smack' | 'chain' | 'cutter' | 'olive' | 'slam' | 'explode' | 'garlic' | 'burn' | 'trap' | 'splash' | 'direct' | 'ability';
  canCrit?: boolean;
  knock?: number;
  x?: number;
  y?: number;
  quiet?: boolean;
  /** Damage a topping dealt on its own (a timed or triggered proc, the drone…): scaled by the heat's autoDmg. */
  auto?: boolean;
}

/** Damage sources that are always automatic: they hit without a smack (orbiting cutters, thrown toppings, the
 *  garlic aura, burns, traps). Smacks, the slam, the peel's ability and on-smack effects aren't. */
const AUTO_SOURCES = new Set<DamageOpts['source']>(['cutter', 'olive', 'garlic', 'burn', 'trap']);
/** How much of the automatic damage a raised guard shield soaks counts against it (a step per base smack's worth). */
const GUARD_SOAK = 0.5;

export interface GameStart {
  lineup?: string[];
  heat?: HeatId;
  /** Dev only: start at wave 31 with a starter kit (the old Act 2 start; the new-run screen no longer offers it). */
  act2?: boolean;
  /** Dev only: start in the shop before `wave` with a starter kit sized for that wave (5 pizzas, toppings, tips). */
  kit?: boolean;
  /** Keep going past the journey's end (endless) instead of ending the run there. */
  endless?: boolean;
  /** Endless+: from wave 101 every place, boss and foot is shuffled (unlocked by beating wave 100). */
  endlessPlus?: boolean;
  /** Resume a saved run (or a dev scenario) in its shop. */
  snapshot?: RunSnapshot;
  /** Dev: jump straight to a boss or mini-boss, optionally at a health fraction. */
  boss?: { id: string; hp?: number };
  /** Dev: begin at this wave with this many tips. */
  wave?: number;
  tips?: number;
}

/** A pizza at the shop counter (saved with the run). */
type CounterOffer = CounterSnap & { kind: NonNullable<CounterSnap['kind']> };

const EVENT_RATE: Record<HeatId, number> = { mild: 0.35, regular: 0.25, hot: 0.22, extrahot: 0.2, inferno: 0.18 };
const EVENT_CRUST_CAP = 3;
const FRESH_START = [10, 8, 6, 9, 7];
/** How long a wave event can still be smacked after the wave ends (the shop waits for it). */
const EVENT_GRACE_MS = 4000;
/** A Pizza Slots pull paid in Golden Crusts. */
const SLOTS_CRUSTS = 40;
/** One machine's prizes (each shop rolls its own). */
interface SlotsTable {
  tips: number;
  slices: 'full' | 'four';
  crusts: number;
  legendary: boolean;
}

/** Coins you have after clearing wave 1, at least: enough for a common topping (35 at wave 1). */
const WAVE1_MIN_COINS = 35;

/** The feet each boss was seen to summon this session (some come from outside the wave's pool: the Immortal Brute's
 * Immortals, Kronos's Hoplites): their art is kept and warmed with the boss's (GameScene.evictArt, warmFeet). */
const SUMMONED = new Map<string, Set<string>>();

/** Feet a boss brings on from outside the wave's pool: the ones its fight is known to call up (the Phantom King's
 * echoes, the Sole Proprietor's collection agents) and any seen this session. */
function bossSummons(boss: string): string[] {
  const known = boss === 'phantomking' ? ECHO_IDS : boss === 'soleprop' ? solepropAgents() : [];
  return [...known, ...(SUMMONED.get(boss) ?? [])];
}

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
  /** The worn look's live effect (Zeus's lightning), if it has one (src/art/animatedLooks.ts). */
  private lookFx: LookFx | null = null;
  /** The peel whose look the cursor peel wears (its animation follows the graphics setting). */
  private lookId = 'classic';
  private peelShiny = false;
  /** The peel this run is played with (prestige goals count it). */
  private peelId = 'classic';
  /** Set on the victory screen at the journey's end, so the clock stops (endless picks it up again). */
  private timerStopped = false;
  /** The peel's ability, when it replaces the Peel Slam this run (null: the Peel Slam). */
  private ability: Ability | null = null;
  private abilityT = 0;
  /** Proc toppings owned this run (scaled by level), with their timers. */
  private procs: { id: string; p: Proc; t: number }[] = [];
  /** Thrown props (peel abilities and topping procs). */
  private throws!: Projectiles;
  /** The event, mixed and wildcard toppings' in-play mechanics. */
  private kit!: ToppingKit;
  /** A Pick or Peel Roulette window is open. */
  private pickOpen = false;
  /** Hero peels: signature moves, transformations, overlays and passives (src/game/heroMoves.ts). */
  private heroes!: HeroDirector;
  /** Hero and god goals: feats, counters and timings (src/game/heroGoals.ts). */
  private tracker!: HeroTracker;
  /** Goal bookkeeping: when the wave and the boss fight began, smacks on the boss, a stunned peel, and the
   * plan and shop a hero showed early (Herald, From the Future). */
  private heroT = GameScene.freshHeroT();
  private static freshHeroT() {
    return { wave: 0, boss: 0, bossSmacks: 0, stunned: false, tick: 0, coins: 0, firstWave: 0, since: 0, bosses: 0, lost: 0, abilityUsed: false, plan: null as (WavePlan & { n: number }) | null, shop: null as Upgrade[] | null };
  }
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
  /** The phase 3 pizzas' perks (src/game/pizzaPerks.ts). */
  private perkKit!: PizzaPerkKit;
  private clickables: Clickable[] = [];
  /** When each target was last live (sweepClickables drops ones dead for a long while). */
  private clickSeen = new WeakMap<Clickable, number>();
  private sweepT = 0;
  /** Drop targets that haven't been live for 60 s (a target can be dormant for a while and come back). */
  private sweepClickables(dt: number): void {
    this.sweepT += dt;
    if (this.sweepT < 2) return;
    this.sweepT = 0;
    this.clickables = this.clickables.filter((c) => {
      if (c.alive()) {
        this.clickSeen.set(c, this.nowT);
        return true;
      }
      return this.nowT - (this.clickSeen.get(c) ?? this.nowT) < 60;
    });
  }
  /** Dev: the hitbox overlay (src/game/smackLog.ts). */
  private hitboxes: HitboxOverlay | null = null;

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
  /** Grand Parade (or Second Look's comeback): a second event later in the wave. */
  private waveEvent2: EventId | null = null;
  private event2Started = false;
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
  /** Save & Menu is on its way out of the run. */
  private leaving = false;
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
  /** Pizzas a boss has claimed for a move: no regular foot may use their lanes. */
  private lockedPizzas = new Set<Pizza>();
  /** True while a boss set-piece has every foot pulled back to the top. */
  private retreating = false;
  /** While set, the only regular feet that spawn (a boss's own kind). */
  private minionPool: string[] | null = null;
  /** A boss has stopped the wave's own feet coming in (Arena.pauseSpawns). */
  private spawnsPaused = false;
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
  private shop: { el: HTMLElement; state: ShopState; cards: Upgrade[]; sold: Set<string>; free: string | null; bossReward: boolean; counter: CounterOffer[]; goldenBought?: GoldenItem['id']; lastStand: boolean; boughtOut?: boolean; slots?: { used: boolean; result: SlotsResult | null; table?: SlotsTable } } | null = null;
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
    // pizzas the Sole Proprietor Unbound has eaten are off the table (and their perks with them) until he lets them go
    return this.pizzas.filter((p) => !p.dead && !p.flags.eaten);
  }
  peelPoint(): { x: number; y: number } {
    return this.peelPos;
  }
  spawn(id: string, target?: Pizza | null, x?: number): Foot | null {
    const t = FOOT_BY_ID[id];
    if (!t || !this.plan) return null;
    const f = this.spawnFoot(t, target ?? this.pickTarget(null), false, x);
    // a boss's own summons (flocks, waiters, blacksmiths) jump the queue for a lane
    f.brain.summoned = true;
    if (f.held) this.bumpForSummon(f);
    return f;
  }
  hitPizza(p: Pizza, slices: number, label: string, color = '#ff8a6a'): void {
    if (p.dead || this.over) return;
    this.fx.quip(p.x, p.surfaceY - 150, label, color, 40);
    this.applyStomp(p, null, slices, true);
  }
  stunPeel(sec: number, label: string): void {
    if (this.kit.peelGuard()) {
      this.fx.quip(this.peelPos.x, this.peelPos.y - 80, 'OVEN MITTS!', '#ffd23f', 30);
      return;
    }
    // Superpeel's Man of Steel
    if (this.heroes.peelImmune()) {
      this.fx.quip(this.peelPos.x, this.peelPos.y - 80, 'MAN OF STEEL', '#7fb0ff', 30);
      return;
    }
    this.heroT.stunned = true;
    this.tracker.emit('peelStunned', {});
    this.peelStunT = Math.max(this.peelStunT, sec);
    this.fx.quip(this.peelPos.x, this.peelPos.y - 80, label, '#ffd23f', 34);
    this.peel.setTint(0x9a9a9a);
    this.rumble(0.5, 200);
  }
  slowPeel(sec: number): void {
    if (this.kit.peelGuard() || this.heroes.peelImmune()) return;
    this.peelSlowT = Math.max(this.peelSlowT, sec);
  }
  peelGuarded(): boolean {
    return this.kit.peelGuard();
  }
  addClickable(c: Clickable): void {
    this.clickables.push(c);
    this.clickSeen.set(c, this.nowT);
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
    // Save & Menu tidies the bosses away: their death sounds stay quiet
    if (this.leaving) return;
    audio.sfx(key, opts);
  }
  shake(ms: number, intensity: number): void {
    // (the scenery reacts to the big moments whatever the shake setting)
    if (intensity >= 0.008) this.backdrop.impact(W / 2, 760, Math.min(1, intensity * 70));
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
  heat(): HeatId {
    return this.run.heat;
  }
  lockLane(p: Pizza, on: boolean): void {
    if (on) this.lockedPizzas.add(p);
    else this.lockedPizzas.delete(p);
  }
  retreat(on: boolean): void {
    this.retreating = on;
    for (const f of this.feet) if (f.alive && !f.isBossLike) f.pinned = on;
  }
  isRetreating(): boolean {
    return this.retreating;
  }
  heroWallUp(): boolean {
    return Number(this.heroes.k.wv.lineUntil ?? 0) > this.now();
  }
  setMinions(ids: string[] | null): void {
    this.minionPool = ids && ids.length ? ids : null;
  }
  pauseSpawns(on: boolean): void {
    this.spawnsPaused = on;
  }
  freezePerk(p: Pizza, sec: number): void {
    if (p.dead) return;
    const was = p.perkFrozen;
    p.freezePerk(sec);
    if (!was) {
      this.fx.quip(p.x, p.surfaceY - 120, 'PERK FROZEN!', '#a8dcff', 36);
      this.recompute();
    }
  }
  damageFoot(f: Foot, amount: number, label?: string): void {
    if (label) this.fx.quip(f.x, f.cy - 130, label, '#7dff9a', 40);
    this.dealDamage(f, amount, { source: 'direct', x: f.cx, y: f.cy });
  }

  // ——— Lifecycle ———
  init(data: GameStart): void {
    this.start = data ?? {};
    this.guardStats = { blocked: 0, broken: 0, rearmed: 0, soaked: 0, chipSteps: 0, slamSteps: 0, ttk: {}, stomps: {} };
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
    this.throws = new Projectiles(this, this.fxLayer, this.fx, { peel: () => this.peel, peelPos: () => this.peelPos, feet: () => this.feet });
    this.director = new BossDirector(this);
    this.kit = new ToppingKit(this.kitHost());
    this.perkKit = new PizzaPerkKit(this, {
      run: () => this.run,
      dealDamage: (f, amount, source, knock) => this.dealDamage(f, amount, { source, knock, x: f.cx, y: f.cy }),
      giveTips: (n, x, y) => this.giveTips(n, x, y),
      healPizza: (p, n) => this.healPizza(p, n),
      neighbours: (p) => this.neighbours(p),
      recompute: () => this.recompute(),
      addReroll: () => this.freeRerollsLeft++,
      toast: (id, title, body) => ui.hud.toast(pizzaPortraitURL(id), title, body),
    });
    this.events.once('shutdown', () => this.perkKit.clear());
    contentFx.reset(this);
    // the run's ability peel brings its nemesis stage, if it has one (a resumed run's peel comes from its save);
    // a dev boss start of a nemesis boss brings its stage too, so it fights in its own arena
    const nmDev = this.start.boss ? nemesisOf(this.start.boss.id) : null;
    setNemesisPeel(nmDev ? nmDev.peels[0] : abilityPeel(this.start.snapshot?.peel).id);
    this.events.once('shutdown', () => setNemesisPeel(''));
    this.heroes = new HeroDirector(this.heroHost());
    this.tracker = new HeroTracker(
      () => this.runView(),
      () => this.peelToasts(checkPeelAchievements()),
    );
    // slices grown back (from anywhere) and pizzas back from the dead feed Demeter's and Persephone's goals
    pizzaHooks.healed = (_p, n) => this.tracker.emit('healed', { n });
    pizzaHooks.revived = (p, n) => {
      this.tracker.emit('revive', { onTable: () => !p.dead && this.pizzas.includes(p) });
      if (n) this.tracker.emit('healed', { n });
    };
    this.events.once('shutdown', () => {
      pizzaHooks.healed = undefined;
      pizzaHooks.revived = undefined;
    });
    finaleState.buyout = false;

    const snap = this.start.snapshot;
    if (snap) {
      this.restore(snap);
      this.perkKit.restored(this.pizzas);
    }
    else {
      const slices = BASE_SLICES + (save.meta.pies ?? 0);
      const ids = this.start.act2 || this.start.kit ? randomLineup(5) : this.start.lineup?.length ? this.start.lineup : randomLineup(save.meta.table ? 4 : 3);
      ids.forEach((id, i) => this.addPizza(id, slices, false, FRESH_START[i % FRESH_START.length]));
      this.layoutPizzas(false);
    }

    // cursor peel
    // the equipped peel brings the ability; a worn look (if any) only changes how it looks
    const peelDef = abilityPeel(this.start.snapshot?.peel);
    const look = applyPeelLook(this, lookPeel(peelDef));
    // smacks sound like the look on the cursor
    setRunSmack(this, look.id);
    this.events.once('shutdown', () => setRunSmack(null, null));
    this.peelTrailColor = peelTrail(look);
    this.peelShiny = !!look.shiny;
    this.peelId = peelDef.id;
    this.heroes.setPeel(peelDef.id, peelTrail(peelDef) ?? 0xffd23f);
    audio.preload(this, heroSfx(peelDef.id.startsWith('hero:')));
    // every peel but the Classic brings its ability (runs saved with the old Peel Slam switch keep their choice)
    const wantAbility = this.start.snapshot?.ability ?? true;
    this.ability = wantAbility && peelDef.id !== 'classic' ? abilityFor(peelDef.id) : null;
    this.abilityT = 0;
    // slam-related toppings and perks reword (and work) for the ability in use; meter boosts are only
    // useless for passives with no timer or chance to speed up
    setSlamMode(this.ability);
    this.events.once('shutdown', () => {
      this.throws.clear(false);
      this.kit.destroy();
      this.heroes.shutdown();
      setSlamMode(undefined);
      setRunHeat(null);
      contentFx.reset(null);
      this.lookFx?.destroy();
      this.lookFx = null;
    });
    const t0 = this.ability?.trigger.t;
    // 'tank': a passive with no meter or timer, so a full meter at the start of a wave does nothing
    this.run.slamless = { slam: false, meter: !!this.ability && (t0 === 'always' || t0 === 'wave' || t0 === 'stomp'), tank: !!this.ability && !usesMeter(this.ability) && t0 !== 'every' };
    ui.hud.setSlamLabel(this.ability ? this.ability.name : null, this.ability ? abilityKindLabel(this.ability) : null);
    this.peel = this.add.image(W / 2, H / 2, 'peel').setOrigin(0.5, 100 / 360).setScale(0.62).setAngle(-28).setAlpha(0.95);
    if (this.peelShiny && peelsAnimated()) this.peel.preFX?.addShine(0.6, 0.4, 3.5);
    this.cursorLayer.add(this.peel);
    this.setLookFx(look.id);
    // animated peels switched on or off (Settings → Graphics) mid-run: the cursor peel follows at once
    let peelAnim = peelsAnimated();
    const offSettings = onSettingsChange(() => {
      if (peelsAnimated() === peelAnim || !this.peel?.active) return;
      peelAnim = peelsAnimated();
      this.peel.preFX?.clear();
      if (this.peelShiny && peelAnim) this.peel.preFX?.addShine(0.6, 0.4, 3.5);
      this.setLookFx(this.lookId);
      this.lookFx?.setActive(this.peel.texture.key !== 'peel_shift');
    });
    this.events.once('shutdown', offSettings);

    if (!snap) {
      // meta perks at run start
      if (save.meta.headstart) {
        const rares = UPGRADES.filter((u) => u.rarity === 'rare' && kindOf(u) === 'permanent');
        this.run.owned[Phaser.Utils.Array.GetRandom(rares).id] = 1;
      }
      if (save.meta.preheat) this.run.super = 1;
      this.run.endless = !!this.start.endless;
      this.perkKit.runStart();
      endlessPlus.on = this.run.endless && !!this.start.endlessPlus;
      endlessPlus.seed = 1 + Math.floor(Math.random() * 1e6);
      if (this.start.act2 || this.start.kit) this.devKit(this.kitWave());
      if (this.start.tips) this.run.coins = this.start.tips;
    }
    // where every goal stands as the run begins, for the end-of-run summary
    if (!this.run.startPeels) this.beginRunGoals();
    this.recompute();
    this.heroT.firstWave = snap ? snap.wave + 1 : this.start.act2 || this.start.kit ? this.kitWave() : (this.start.wave ?? 1);
    this.heroT.coins = this.run.coins;
    this.tracker.emit('runStart', {});

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
      // no tidy: the scene's objects are going. A boss that overrode the smack or the slam on this
      // (reused) scene instance gets the real methods back all the same
      this.director.clear(false);
      const own = this as unknown as Record<string, unknown>;
      delete own.smack;
      delete own.peelSlam;
      for (const p of this.pizzas) p.destroy();
      this.pizzas = [];
      // (feet left on screen: their shield badges' own textures go with them)
      for (const f of this.feet) f.guardFx?.destroy();
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
    this.tutorial = !save.tutorialDone && !snap && !this.start.act2 && !this.start.kit;
    pad.onPlay = (ev) => this.padInput(ev);

    if (snap) {
      // resume in the shop of the wave that was cleared
      this.showLocation(snap.wave, true);
      const rs = snap.shop;
      const cards = rs?.cards.map((id) => UPGRADE_BY_ID[id]).filter(Boolean);
      this.freeRerollsLeft = rs ? rs.freeRerolls : this.run.stats.freeRerolls;
      const keep = rs && cards?.length ? { cards, sold: new Set(rs.sold), free: rs.free, goldenBought: rs.goldenBought, lastStand: rs.lastStand } : undefined;
      // saved on the ACT COMPLETE (or endless victory) screen: back to it, then its shop
      if (snap.actPending && !rs) {
        // the victory screen was saved after the ending played: Continue goes straight back to it
        if (waveInJourney(snap.wave) === JOURNEY_WAVES) this.endingShown = true;
        this.time.delayedCall(500, () => (waveInJourney(snap.wave) === JOURNEY_WAVES ? this.victory() : this.actComplete(snap.wave)));
      } else this.time.delayedCall(500, () => this.openUpgrades(rs?.bossReward ?? isBossWave(snap.wave), keep, 'WELCOME BACK!'));
    } else if ((this.start.act2 || this.start.kit) && !this.start.boss) {
      const kw = this.kitWave();
      this.run.wave = kw - 1;
      this.showLocation(kw, true);
      this.time.delayedCall(600, () => this.openUpgrades(isBossWave(kw - 1), undefined, `${actName(actOf(kw)).toUpperCase()} · STOCK UP`));
    } else if (this.start.boss) {
      const id = this.start.boss.id;
      const t = FOOT_BY_ID[id];
      const wave = t?.minWave ?? 5;
      this.time.delayedCall(700, () => this.beginWave(wave, this.start.boss));
    } else {
      // the opening wave's feet start building now, in the moments before it begins (and the art the title screen
      // made that this stage won't use goes)
      this.evictArt(this.start.wave ?? 1);
      this.warmFeet(this.start.wave ?? 1);
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
    this.hitboxes = null;
    this.plan = null;
    this.waveActive = false;
    this.bossPending = false;
    this.bossFoot = null;
    this.miniFoot = null;
    this.over = false;
    this.leaving = false;
    this.paused = false;
    this.cardOk = null;
    this.cardQueue = [];
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
    this.lockedPizzas = new Set();
    this.retreating = false;
    this.minionPool = null;
    this.spawnsPaused = false;
    this.peelStunT = 0;
    this.peelSlowT = 0;
    this.hurryT = 0;
    this.shop = null;
    // a restart reuses the scene: the last run's victory clock stop and end-of-act screen go with it
    this.timerStopped = false;
    this.actEl = null;
    this.pickOpen = false;
    this.tweens.timeScale = 1;
    // the rest of the per-run bookkeeping: hero goals (a peeked shop or wave plan, boss streaks), the
    // ending, the counters a smack or kill reads, and the shop a Continue resumed into
    this.heroT = GameScene.freshHeroT();
    this.endingShown = false;
    this.restoredShop = null;
    this.smackCount = 0;
    this.lastKillAt = -9;
    this.lastSlam = -99;
    this.waveEvent = null;
    this.waveEvent2 = null;
    this.eventStarted = false;
    this.event2Started = false;
    this.goldenSpawned = false;
    this.miniSpawned = false;
    this.waveSlicesLost = 0;
    this.procs = [];
  }

  /** Dev starts: the wave a kit start begins at (31 for the old Act 2 start). */
  private kitWave(): number {
    return this.start.act2 ? 31 : Math.max(2, this.start.wave ?? 31);
  }

  /** Dev starter kit for a run begun at wave w: 5 pizzas (placed in create), about a topping per 3 waves
   * (epics from wave 30, legendaries from 60), and roughly the tips a run holds by then. The old Act 2 start: 6 at w = 31. */
  private devKit(w: number): void {
    this.run.act2Start = !!this.start.act2;
    const rarities = w >= 60 ? ['common', 'rare', 'epic', 'legendary'] : w >= 30 && !this.start.act2 ? ['common', 'rare', 'epic'] : ['common', 'rare'];
    const pool = UPGRADES.filter((u) => kindOf(u) === 'permanent' && rarities.includes(u.rarity));
    for (let i = 0; i < (this.start.act2 ? 6 : Math.round(w / 3)); i++) {
      const u = Phaser.Utils.Array.GetRandom(pool);
      this.run.owned[u.id] = Math.min(u.max, (this.run.owned[u.id] ?? 0) + 1);
    }
    this.run.coins = this.start.tips ?? Math.round(w * 14);
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
      elapsed: r.elapsed,
      elapsedUs: r.elapsedUs,
      endless: r.endless,
      endlessPlus: endlessPlus.on ? endlessPlus.seed : 0,
      actFrom: r.actFrom,
      actPending: !!this.actEl && !this.shop,
      secondChances: r.secondChances,
      enhanceUses: r.enhanceUses,
      bought: [...r.bought],
      unlockWhy: { ...r.unlockWhy },
      milestonesHit: [...r.milestonesHit],
      startPeels: r.startPeels ?? undefined,
      goalStart: { ...r.goalStart },
      kit: JSON.parse(JSON.stringify(r.kit)),
      pizzas: this.pizzas.map((p) => ({ id: p.type.id, slices: p.slices, max: p.maxSlices, fresh: p.fresh, dead: p.dead, flags: { ...p.flags, possessed: false, eaten: false } })),
      counter: this.shop?.counter ?? this.restoredShop?.counter ?? [],
      bossBonusGiven: this.bossBonusGiven,
      peel: this.peelId,
      ability: !!this.ability,
      shop: this.shop
        ? { cards: this.shop.cards.map((u) => u.id), sold: [...this.shop.sold], free: this.shop.free, bossReward: this.shop.bossReward, freeRerolls: this.freeRerollsLeft, goldenBought: this.shop.goldenBought, lastStand: this.shop.lastStand, boughtOut: this.shop.boughtOut, slotsUsed: !!this.shop.slots?.used }
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
    r.elapsedUs = s.elapsedUs ?? Math.round(s.elapsed * 1e6);
    r.elapsed = r.elapsedUs / 1e6;
    r.endless = s.endless ?? false;
    endlessPlus.on = !!s.endlessPlus;
    endlessPlus.seed = s.endlessPlus || 1;
    r.actFrom = s.actFrom ?? null;
    r.secondChances = s.secondChances;
    r.enhanceUses = s.enhanceUses ?? 0;
    // runs saved before the Toppings tab: what's owned was bought this run
    r.bought = s.bought ? [...s.bought] : Object.keys(s.owned);
    r.unlockWhy = { ...(s.unlockWhy ?? {}) };
    r.milestonesHit = [...(s.milestonesHit ?? [])];
    r.startPeels = s.startPeels ? [...s.startPeels] : null;
    r.goalStart = { ...(s.goalStart ?? {}) };
    r.kit = loadKitState(s.kit);
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
    this.perkKit.placed(p, !exact);
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

  /** Toppings owned that add chain lightning (counted in recompute, read by every goal event). */
  private chainToppings = 0;

  private recompute(): void {
    this.chainToppings = Object.entries(this.run.owned).filter(([id, lvl]) => {
      const u = UPGRADE_BY_ID[id];
      return lvl > 0 && !!u && (/chain lightning/i.test(u.desc(1)) || !!u.proc?.fx.some((e) => e.e === 'chain'));
    }).length;
    const live = this.alivePizzas().filter((p) => p !== this.possessedPizza && p.perk);
    const perks = live.map((p) => p.perk!);
    // an enhanced pizza's perk counts half as much again
    const enhanced = [...live.filter((p) => p.enhanced).map((p) => p.perk!), ...this.perkKit.bigPerks(live)];
    // always-on peel abilities change stats before the caps are applied
    const extra: Record<string, number> = {};
    if (this.ability?.trigger.t === 'always') for (const e of this.ability.fx) if (e.e === 'stat') for (const [k, v] of Object.entries(e.mods)) extra[k] = (extra[k] ?? 0) + (v as number);
    // a hero's always-on passive (its `also`) changes stats the same way
    if (this.ability?.also?.trigger.t === 'always') for (const e of this.ability.also.fx) if (e.e === 'stat') for (const [k, v] of Object.entries(e.mods)) extra[k] = (extra[k] ?? 0) + (v as number);
    this.run.recompute(perks, extra, enhanced);
    this.kit.afterRecompute(this.run.stats, this.alivePizzas().length);
    // the Ghost's possession inverts the haunted pizza's perk
    const inv = this.possessedPizza?.perk;
    if (inv) {
      const s = this.run.stats;
      if (inv === 'coins' || inv === 'luck' || inv === 'coinsWave' || inv === 'quickTips') s.coinMult = Math.max(0.2, s.coinMult - 0.2);
      else if (inv === 'damage' || inv === 'critDmg' || inv === 'bigHurt' || inv === 'bossDmg') s.damage *= 0.9;
      else if (inv === 'crit') s.critChance = Math.max(0, s.critChance - 0.06);
      else s.damage *= 0.95;
    }
    this.perkKit.afterRecompute(this.run.stats, COMBO_BASE_WINDOW);
    // the perks' faster smacks land after Run's caps: cap the follow-up chance again
    this.run.stats.doubleChance = Math.min(DOUBLE_CAP, this.run.stats.doubleChance);
    for (const p of this.pizzas) {
      p.maxFresh = 10 + this.run.stats.freshBonus;
      if (p.fresh > p.maxFresh) p.setFresh(p.maxFresh);
    }
    const timers = new Map(this.procs.map((x) => [x.id, x.t]));
    this.procs = Object.entries(this.run.owned)
      .map(([id, lvl]) => ({ u: UPGRADE_BY_ID[id], lvl }))
      .filter((x) => x.u?.proc && x.lvl > 0)
      .map((x) => ({ id: x.u.id, p: scaleProc(x.u.proc!, x.lvl), t: timers.get(x.u.id) ?? 0 }));
    // a throwing peel's passive throw runs like a proc
    const also = this.ability?.also;
    if (also) this.procs.push({ id: 'peel:also', p: { ...also, color: this.ability!.color, vfx: this.ability!.vfx }, t: timers.get('peel:also') ?? 0 });
    this.syncCutters();
    this.syncGarlic();
    // toppings that only make sense sometimes (Peel Roulette, Head Chef)
    const throwing = (fx: Effect[]) => fx.some((e) => e.e === 'throw');
    this.run.env = {
      otherPeels: this.rouletteOptions(99).length,
      throws: !!this.ability && (throwing(this.ability.fx) || throwing(this.ability.also?.fx ?? [])) || this.procs.some((x) => throwing(x.p.fx)),
    };
  }

  /** What the topping kit may touch. */
  private kitHost(): ConstructorParameters<typeof ToppingKit>[0] {
    return {
      sc: this,
      fx: this.fx,
      fxLayer: this.fxLayer,
      underLayer: this.underLayer,
      run: () => this.run,
      feet: () => this.feet,
      alivePizzas: () => this.alivePizzas(),
      peelPos: () => this.peelPos,
      now: () => this.nowT,
      inWave: () => this.waveActive && !this.over && !this.inUpgrade,
      planSize: () => this.planSize,
      damage: (f, x, o) => this.dealDamage(f, x * this.run.stats.damage, { source: o?.chain ? 'chain' : 'ability', knock: o?.knock ?? 80, quiet: o?.quiet, auto: true }),
      hitFoot: (f, x, y) => this.hitFoot(f, x, y),
      effects: (fx, ctx, color, vfx) => this.runEffects(fx, ctx, color, vfx),
      tips: (n, x, y) => this.giveTips(Math.round(n * this.run.heatDef.tips), x, y),
      heal: (p, n) => this.healPizza(p, n),
      charge: (frac) => this.chargeMeter(frac),
      bankCrusts: (n, x, y) => {
        this.run.bank(n);
        persist();
        this.fx.coinFlight(x, y, Math.min(8, n * 2), ui.hud.coinTarget(), () => audio.sfx('sfx_coin', { throttle: 30 }));
      },
      addClickable: (c) => this.addClickable(c),
      recompute: () => this.recompute(),
      smackRadius: () => this.run.stats.radius,
    };
  }

  /** Charge the meter by a fraction (a timed passive comes round sooner instead). */
  private chargeMeter(frac: number): void {
    if (this.ability?.trigger.t === 'every') this.abilityT += this.ability.trigger.sec * frac;
    else if (!this.ability || usesMeter(this.ability)) this.run.super = Math.min(1, this.run.super + frac);
  }

  /** Peel Roulette's choices: unlocked peels with a different ability from the one in use, one per ability. */
  private rouletteOptions(n: number): string[] {
    const mine = abilityKey(this.peelId);
    const byKey = new Map<string, string[]>();
    for (const d of PEELS) {
      if (d.id === this.peelId || !hasPeel(d.id) || d.group === 'god') continue;
      const k = d.id === 'classic' ? 'classic' : abilityKey(d.id);
      if (k === mine) continue;
      byKey.set(k, [...(byKey.get(k) ?? []), d.id]);
    }
    const ids = [...byKey.values()].map((list) => Phaser.Utils.Array.GetRandom(list));
    return Phaser.Utils.Array.Shuffle(ids).slice(0, n);
  }

  /** Swap the run's peel (Peel Roulette): its ability, meter and slam button, and its look (a worn look stays on top). */
  private swapPeel(id: string): void {
    const def = PEEL_BY_ID[id];
    if (!def) return;
    this.peelId = id;
    // the new peel's nemesis (or none) from the next stage on, as a resumed run would see it
    setNemesisPeel(id);
    const look = applyPeelLook(this, lookPeel(def));
    setRunSmack(this, look.id);
    this.peelTrailColor = peelTrail(look);
    this.peelShiny = !!look.shiny;
    this.peel.setTexture('peel');
    this.peel.preFX?.clear();
    if (this.peelShiny && peelsAnimated()) this.peel.preFX?.addShine(0.6, 0.4, 3.5);
    this.setLookFx(look.id);
    // the hero passive (and its sounds) follow the new peel
    this.heroes.setPeel(id, peelTrail(def) ?? 0xffd23f);
    audio.preload(this, heroSfx(id.startsWith('hero:')));
    this.ability = id !== 'classic' ? abilityFor(id) : null;
    this.abilityT = 0;
    this.run.super = 0;
    setSlamMode(this.ability);
    const t0 = this.ability?.trigger.t;
    const passive = !!this.ability && !usesMeter(this.ability);
    this.run.slamless = { slam: false, meter: !!this.ability && (t0 === 'always' || t0 === 'wave' || t0 === 'stomp'), tank: passive && t0 !== 'every' };
    ui.hud.setSlamLabel(this.ability ? this.ability.name : null, this.ability ? abilityKindLabel(this.ability) : null);
    this.recompute();
    // Act 9's home ground follows the new peel (on for a Greek god, off for anyone else)
    contentFx.abilityChanged(this);
    this.fx.ring(W / 2, H / 2, this.ability?.color ?? 0xffd23f, 3, 1);
    ui.hud.toast(peelThumbURL(id, 96), 'PEEL ROULETTE', `${def.name} · ${this.ability ? this.ability.name : 'Peel Slam'} for the rest of the run`);
  }

  // ——— Waves ———
  private showLocation(n: number, immediate: boolean): void {
    const bd = backdropFor(n);
    const loc = locationFor(n);
    // every stage's live layer follows the wave within the stage (its weather and light change across it)
    if (bd === this.currentBackdrop) this.backdrop.setWave(waveInStage(n));
    if (bd !== this.currentBackdrop) {
      const fade = this.currentBackdrop && !immediate ? 1600 : 0;
      this.backdrop.show(bd, fade, waveInStage(n));
      this.tintGrade(BACKDROPS[bd].light, fade);
      this.currentBackdrop = bd;
    }
    if (!isBossWave(n) && this.currentLocation !== loc) {
      // the stage left behind: free its live textures once it has faded out (the trattoria stays for the menu)
      const prev = this.currentLocation;
      if (prev && prev !== 'trattoria') this.time.delayedCall(2600, () => releaseLive(this, prev));
      this.currentLocation = loc;
      audio.music(this, LOCATION_MUSIC[loc], immediate ? 600 : 1800);
      audio.ambience(this, LOCATION_AMBIENCE[loc], immediate ? 800 : 2400);
    }
    ui.hud.setWave(n, BACKDROPS[bd].name);
    contentFx.wave(this, n);
  }

  private beginWave(n: number, devBoss?: { id: string; hp?: number }): void {
    if (this.over) return;
    this.run.wave = n;
    // the act's stats count from its first wave (or from wherever this run joined it)
    const actFirst = actStartWave(n);
    if (!this.run.actFrom || this.run.actFrom.wave !== actFirst) {
      const r = this.run;
      r.actFrom = { wave: actFirst, elapsed: r.elapsed, feet: r.feetSmacked, slices: r.slicesLost };
    }
    // Herald (Silver Slicer) showed this wave's feet already: use that plan
    this.plan = this.heroT.plan && this.heroT.plan.n === n ? this.heroT.plan : planWave(n, this.run.stats.luck, this.run.heat);
    this.warmFeet(n, this.plan);
    this.heroT.plan = null;
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
    // Vow of Focus: no golden feet
    if (this.run.stats.noGolden) this.plan.golden = false;
    this.planSize = this.plan.queue.length;
    this.spawnT = 1.2;
    this.goldenSpawned = false;
    this.miniSpawned = false;
    this.miniFoot = null;
    this.waveSlicesLost = 0;
    this.orders.clear();
    this.lockedPizzas.clear();
    this.retreat(false);
    this.minionPool = null;
    this.spawnsPaused = false;
    this.thawPerks();
    this.freeRerollsLeft = this.run.stats.freeRerolls;
    this.abilityWaveStart();
    this.coinsAtWaveStart = this.run.coins;
    const st = this.run.stats;
    // Crust Armour: a shield more on every pizza in boss waves
    const armour = isBossWave(n) ? this.run.level('crustarmour') : 0;
    for (const p of this.alivePizzas()) {
      p.setShield(st.shields + armour + (p.perk === 'shield' ? (p.enhanced ? 2 : 1) : 0));
      p.setTraps(st.traps);
      p.flags.markedWave = false;
      p.flags.bounced = 0;
      p.flags.grandma = false;
    }
    // Grandma Square guards both neighbours' first stomp each wave (enhanced: itself too)
    for (const p of this.alivePizzas()) if (p.perk === 'neighbourShield') for (const q of [...this.neighbours(p), ...(p.enhanced ? [p] : [])]) q.flags.grandma = true;
    this.perkKit.waveStart(n);
    this.run.super = Math.max(this.run.super, st.superStart);
    // a passive on a timer gets its head start (S'mores, Pre-Heated Peel) as timer progress
    if (this.ability?.trigger.t === 'every') this.abilityT = Math.max(this.abilityT, this.ability.trigger.sec * Math.min(1, this.run.super));
    const boss = isBossWave(n);
    // event toppings change the odds and can bring a second event (Grand Parade, Second Look); Four-Leaf Clover
    // raises the rate; a hero sighting (Hero Hotline makes it likelier) is rolled first
    const evs = boss || isMiniWave(n) ? [] : this.kit.rollEvents(Math.min(0.9, EVENT_RATE[this.run.heat] * this.perkKit.eventRateMult()), sightingChance(this.run.stats), this.alivePizzas().some((p) => p.slices < p.maxSlices));
    // Hero Summit: a sighting every N waves, guaranteed (boss waves included)
    if (!evs.includes('sighting') && !this.run.stats.noEvents && sightingDue(this.run.stats, this.heroT.since)) evs.splice(0, evs.length, 'sighting', ...evs.slice(0, 1));
    this.heroT.since = evs.includes('sighting') ? 0 : this.heroT.since + 1;
    this.waveEvent = evs[0] ?? null;
    this.waveEvent2 = evs[1] ?? null;
    this.eventStarted = false;
    this.event2Started = false;
    this.kit.waveStart(n);
    this.heroT.wave = this.nowT;
    this.heroes.waveStart();
    this.tracker.emit('waveStart', { boss, mini: isMiniWave(n) });
    // Batpeel's Signal: sometimes, on night stages, partway through the wave
    this.time.delayedCall(6000 + Math.random() * 8000, () => this.waveActive && maybeSignal(this, backdropFor(n), () => this.peelToasts(checkPeelAchievements())));

    const bd = backdropFor(n);
    const loc = locationFor(n);
    const locChanged = this.currentLocation !== loc;
    this.showLocation(n, false);
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
        // a new act opens with its name; any other new stage with the place's
        if (isActStart(n)) ui.hud.banner(actName(actOf(n)).toUpperCase(), `Act ${actOf(n)} · ${BACKDROPS[loc].name}`, 'loc');
        else ui.hud.banner(BACKDROPS[loc].name, 'NEW LOCATION', 'loc');
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
    // the next fight's move sounds (and this wave's, for runs that start mid-journey)
    for (const w of [n, next]) {
      const id = isBossWave(w) ? bossFor(w) : isMiniWave(w) ? miniFor(w) : null;
      if (id) audio.preload(this, bossSfx(id));
    }
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
    this.heroT.boss = this.nowT;
    this.heroT.bossSmacks = 0;
    this.heroT.stunned = false;
    this.heroT.abilityUsed = false;
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
      if (mv && f.alive) this.phaseBanner(f, mv.name, mv.info);
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
    this.heroT.boss = this.nowT;
    this.heroT.bossSmacks = 0;
    this.heroT.stunned = false;
    this.heroT.abilityUsed = false;
    this.director.attach(f);
    audio.sfx('sfx_miniboss');
    audio.duck(0.75);
    this.time.delayedCall(1500, () => !this.paused && audio.duck(1));
    const mv = this.director.moveOf(f);
    ui.hud.setBoss(t.name, 1, this.director.phaseCount(f));
    this.introCard('mini', () => {
      // its first phase's card (the first time), then a short banner; or the banner that explains the move
      if (mv && f.alive) {
        if (!this.phaseCard(f, () => f.alive && this.banner('MINI-BOSS!', `${t.name} · ${mv.name}`, 'boss'))) this.banner('MINI-BOSS!', `${t.name} · ${mv.name}`, 'boss', mv.info);
      } else ui.hud.banner('MINI-BOSS!', t.name, 'boss');
    });
  }

  private spawnFoot(type: FootType, target: Pizza | null, allowElite = true, x?: number): Foot {
    const plan = this.plan!;
    // what a boss summons is kept (and warmed) with it from then on (evictArt, warmFeet)
    if (!type.boss && !type.mini)
      for (const b of this.feet) if (b.alive && (b.type.boss || b.type.mini) && b.type.id !== type.id) {
        let set = SUMMONED.get(b.type.id);
        if (!set) SUMMONED.set(b.type.id, (set = new Set()));
        set.add(type.id);
      }
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
        relane: (ft) => this.relane(ft),
        onTrait: (ft, trait) => this.onTrait(ft, trait),
        onTick: (ft, dt) => this.footTick(ft, dt),
      },
    });
    f.target = target;
    f.setHoverMul(this.run.heatDef.crowd.hoverMul);
    // a guard foot's shield takes more blocked smacks on hotter heats, and is replaced sooner once broken
    f.guardMax = f.guardHp = guardHits(this.run.heat);
    f.guardRearmAfter = guardRearm(this.run.heat);
    this.feet.push(f);
    // regular feet each take their own lane (or wait off screen until one frees up)
    if (!type.boss && !type.mini) {
      this.assignLane(f, target);
      f.laneKey = this.laneCache.key;
      if (x === undefined && f.laneX !== null) f.x = f.laneX;
      if (f.held) f.y = -260;
    }
    if (this.retreating && !f.isBossLike) f.pinned = true;
    // a rare shiny: any regular foot, never a boss, mini-boss or a boss's stand-in
    if (!type.boss && !type.mini && !this.tutorial && (Math.random() < this.kit.shinyChance(SHINY_FOOT_CHANCE * this.perkKit.shinyMult()) * this.shinyBoost || this.kit.forceShiny())) {
      f.makeShiny();
      this.kit.shinySpawned();
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
    } else if (trait === 'guardBreak') {
      this.guardStats.broken++;
      this.fx.quip(ft.x, ft.cy - 150, 'SHIELD BROKEN!', '#ffd23f', 40);
      this.shake(120, 0.004);
    } else if (trait === 'guardRearm') {
      this.guardStats.rearmed++;
      this.fx.quip(ft.x, ft.cy - 150, 'NEW SHIELD!', '#9ad8ff', 34);
    }
  }

  /** Per-frame trait upkeep: magnets pull the peel, medics heal, Tandoori marks. */
  private footTick(f: Foot, dt: number): void {
    contentFx.footTick(this, f, dt);
    styleLive(f, dt);
    heroFootTick(this, f, dt);
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
      f.brain.marked = t.enhanced ? 3 : 2;
      f.tint(0xffb070);
      this.fx.quip(f.x, f.cy - 130, t.enhanced ? 'MARKED: TRIPLE DAMAGE' : 'MARKED: DOUBLE DAMAGE', '#ff8a3d', 32);
    }
  }

  // ——— Lanes: every regular foot hovers in its own lane, so feet never overlap ———
  // Lanes are evenly spaced columns across the table (about one foot wide each, up to two per pizza).
  // Each lane dives onto its nearest pizza. A wide foot takes two lanes; a boss takes every lane it covers.

  private laneCache: { key: string; lanes: { x: number; p: Pizza }[] } = { key: '', lanes: [] };
  /** Frame counter: lanes and boss-blocked lanes are worked out once per frame. */
  private frameNo = 0;
  private laneFrame = -1;
  private blockedCache: { frame: number; set: Set<number> } = { frame: -1, set: new Set() };

  /** The table's lanes, left to right. */
  private lanes(): { x: number; p: Pizza }[] {
    if (this.laneFrame === this.frameNo) return this.laneCache.lanes;
    this.laneFrame = this.frameNo;
    const ps = this.alivePizzas().sort((a, b) => a.x - b.x);
    const key = ps.map((p) => Math.round(p.x)).join(',');
    if (key === this.laneCache.key) return this.laneCache.lanes;
    let lanes: { x: number; p: Pizza }[] = [];
    if (ps.length) {
      const r = ps[0].radius;
      const left = Math.max(110, ps[0].x - r * 0.95);
      const right = Math.min(W - 110, ps[ps.length - 1].x + r * 0.95);
      const n = ps.length === 1 ? 2 : Math.max(ps.length, Math.min(ps.length * 2, Math.floor((right - left) / LANE_W) + 1));
      for (let i = 0; i < n; i++) {
        const x = n === 1 ? (left + right) / 2 : left + ((right - left) * i) / (n - 1);
        const p = ps.reduce((best, q) => (Math.abs(q.x - x) < Math.abs(best.x - x) ? q : best));
        lanes.push({ x, p });
      }
    }
    this.laneCache = { key, lanes };
    return lanes;
  }

  private laneSpacing(): number {
    const l = this.lanes();
    return l.length > 1 ? l[1].x - l[0].x : LANE_W;
  }

  /** How many lanes a foot needs: wide feet take two. */
  private laneSpan(f: Foot): number {
    return f.meta.halfWidth * 2 * f.scale > this.laneSpacing() * 1.3 ? 2 : 1;
  }

  /** Lanes nobody may use: covered by a boss (or its stand-ins) or locked by a boss move.
   * `ignoreBosses` leaves out boss-covered and locked lanes (a boss's own summons may use them when nothing else is free). */
  private blockedLanes(except?: Foot, ignoreBosses = false): Set<number> {
    const cacheable = !ignoreBosses && (!except || !except.isBossLike);
    if (cacheable && this.blockedCache.frame === this.frameNo) return this.blockedCache.set;
    const out = new Set<number>();
    const lanes = this.lanes();
    const sp = this.laneSpacing();
    for (const o of this.feet) {
      if (ignoreBosses || o === except || !o.alive || !o.isBossLike) continue;
      const half = o.meta.halfWidth * o.scale;
      const cx = o.laneX ?? o.target?.x ?? o.x;
      lanes.forEach((l, i) => {
        if (Math.abs(l.x - cx) < half + sp * 0.35) out.add(i);
      });
    }
    // (a boss's summons with nowhere else to go may use locked lanes too, or a held last pizza would shut them out for good)
    if (!ignoreBosses) {
      lanes.forEach((l, i) => {
        if (this.lockedPizzas.has(l.p)) out.add(i);
      });
    }
    if (cacheable) this.blockedCache = { frame: this.frameNo, set: out };
    return out;
  }

  /** Lanes in use by regular feet. */
  private usedLanes(except?: Foot): Set<number> {
    const out = new Set<number>();
    for (const o of this.feet) {
      if (o === except || !o.alive || o.isBossLike || o.held || o.laneSide < 0) continue;
      for (let k = 0; k < o.laneRow; k++) out.add(o.laneSide + k);
    }
    return out;
  }

  /** Free lanes (start indices) for a foot of this span. `avoid` skips lanes over one pizza (a foot switching away from it). */
  private freeLanes(span = 1, except?: Foot, avoid?: Pizza | null, ignoreBosses = false): number[] {
    const lanes = this.lanes();
    const blocked = this.blockedLanes(except, ignoreBosses);
    const used = this.usedLanes(except);
    const out: number[] = [];
    for (let i = 0; i + span <= lanes.length; i++) {
      let ok = true;
      for (let k = 0; k < span; k++) if (blocked.has(i + k) || used.has(i + k) || lanes[i + k].p === avoid) ok = false;
      if (ok) out.push(i);
    }
    return out;
  }

  private hasFreeLane(): boolean {
    return this.freeLanes(1).length > 0;
  }

  /** Put a regular foot in a free lane (preferring `prefer`'s lanes, then the quietest pizza nearest to it). False = none free: it waits off screen. */
  private assignLane(f: Foot, prefer?: Pizza | null, avoid?: Pizza | null): boolean {
    const span = this.laneSpan(f);
    let free = this.freeLanes(span, f, avoid);
    // a wide foot with no double gap squeezes into a single lane rather than waiting forever
    let useSpan = span;
    if (!free.length && span > 1) {
      free = this.freeLanes(1, f, avoid);
      useSpan = 1;
    }
    // a boss's own summons (a flock it hides behind) first take a hovering foot's lane (it waits off screen),
    // and only share the boss's lanes when there's nobody to bump
    if (!free.length && f.brain.summoned && !avoid) {
      const v = this.feet.find((o) => o !== f && o.alive && !o.isBossLike && !o.held && !o.brain.summoned && o.state === 'hover');
      if (v) {
        v.held = true;
        v.laneSide = -1;
        v.laneX = null;
        free = this.freeLanes(1, f);
      }
      if (!free.length) free = this.freeLanes(1, f, avoid, true);
    }
    if (!free.length) {
      if (!avoid) {
        f.held = true;
        f.laneSide = -1;
        f.laneX = null;
      }
      return false;
    }
    const lanes = this.lanes();
    const load = (p: Pizza) => this.feet.filter((o) => o !== f && o.alive && !o.isBossLike && o.target === p).length;
    const ordered = this.orderedPizza();
    const want = prefer && !prefer.dead ? prefer : ordered;
    const pick = free.sort((a, b) => {
      const pa = lanes[a].p;
      const pb = lanes[b].p;
      if (want && (pa === want) !== (pb === want)) return pa === want ? -1 : 1;
      const la = load(pa) - load(pb);
      if (la) return la + (Math.random() - 0.5) * 0.9;
      return Math.abs(lanes[a].x - f.x) - Math.abs(lanes[b].x - f.x) + (Math.random() - 0.5) * 200;
    })[0];
    const p = lanes[pick].p;
    if (p === ordered && f.target !== p) this.orders.set(ordered, (this.orders.get(ordered) ?? 1) - 1);
    f.target = p;
    f.laneSide = pick;
    f.laneRow = useSpan;
    f.laneX = this.laneCentre(pick, useSpan);
    f.slot = 0;
    if (f.held) {
      // drop in from above its new lane
      f.held = false;
      f.x = f.laneX;
    }
    return true;
  }

  private laneCentre(i: number, span: number): number {
    const lanes = this.lanes();
    return (lanes[i].x + lanes[Math.min(lanes.length - 1, i + span - 1)].x) / 2;
  }

  /** Short-Order Shoe: the pizza the next feet go for, if an order is open. */
  private orderedPizza(): Pizza | null {
    for (const [p, n] of this.orders) if (n > 0 && !p.dead) return p;
    return null;
  }

  /** Keep every regular foot in a valid lane: off blocked lanes and dead pizzas, re-placed when the table changes. */
  private laneTick(dt: number): void {
    const crowd = this.run.heatDef.crowd;
    const switchOn = crowd.laneSwitchWave > 0 && this.run.wave >= crowd.laneSwitchWave;
    const lanes = this.lanes();
    const key = this.laneCache.key;
    for (const f of this.feet) {
      if (!f.alive || f.isBossLike) continue;
      f.pinned = this.retreating;
      if (f.held) {
        if (this.assignLane(f)) f.laneKey = key;
        else if (f.brain.summoned) this.bumpForSummon(f);
        continue;
      }
      const busy = f.state === 'descend' || f.state === 'stomp';
      const i = f.laneSide;
      const valid = i >= 0 && i + f.laneRow <= lanes.length && f.laneKey === key;
      if (!valid) {
        // the table changed (a pizza died, moved or was added): find a lane again
        if (!busy || !f.target || f.target.dead) {
          f.laneSide = -1;
          this.assignLane(f, f.target);
          f.laneKey = key;
        }
        continue;
      }
      if (!busy) {
        let blocked = false;
        const bl = this.blockedLanes(f);
        for (let k = 0; k < f.laneRow; k++) if (bl.has(i + k)) blocked = true;
        if (blocked) {
          this.assignLane(f);
          continue;
        }
      }
      f.target = lanes[i].p;
      f.laneX = this.laneCentre(i, f.laneRow);
      // later waves: hovering feet sometimes hop to another free lane
      if (switchOn && f.state === 'hover' && !this.retreating && Math.random() < dt * 0.07) this.relane(f);
    }
  }

  /** Boss perk freezes end with the wave. */
  private thawPerks(): void {
    let any = false;
    for (const p of this.pizzas) if (p.perkFrozenT > 0 && p.tickFreeze(p.perkFrozenT)) any = true;
    if (any) this.recompute();
  }

  /** A boss summon with no free lane takes the lane of a hovering regular foot, which waits off screen instead. */
  private bumpForSummon(f: Foot): void {
    const v = this.feet.find((o) => o !== f && o.alive && !o.isBossLike && !o.held && !o.brain.summoned && o.state === 'hover' && o.laneRow === 1);
    if (!v) return;
    v.held = true;
    v.laneSide = -1;
    v.laneX = null;
    if (this.assignLane(f)) f.laneKey = this.laneCache.key;
  }

  /** Move a foot to a free lane over a different pizza. Returns the new pizza, or null if none is free. */
  private relane(f: Foot): Pizza | null {
    if (f.isBossLike) return null;
    const from = f.target;
    const keep = { side: f.laneSide, span: f.laneRow, laneX: f.laneX, target: f.target };
    if (!this.assignLane(f, null, from)) {
      Object.assign(f, { laneSide: keep.side, laneRow: keep.span, laneX: keep.laneX, target: keep.target });
      return null;
    }
    f.laneKey = this.laneCache.key;
    return f.target;
  }

  private laneFor(f: Foot): number | null {
    const p = f.target;
    // King Honk's shuffled shoes take turns on a shared pizza, so they never land on top of each other
    if (p && f.isBossLike && f.laneX !== null && this.feet.some((o) => o !== f && o.alive && o.isBossLike && o.laneX !== null && o.target === p && (o.state === 'descend' || o.state === 'stomp'))) return null;
    if (!p || f.isBossLike) return 0;
    if (this.retreating || f.held || f.laneSide < 0) return null;
    return 0;
  }

  private pickTarget(f: Foot | null): Pizza | null {
    const alive = this.alivePizzas();
    if (!alive.length) return null;
    // a regular foot keeps its own lane, or gets a new one
    if (f && !f.isBossLike) {
      const p = f.target;
      if (p && !p.dead && f.laneSide >= 0 && f.laneKey === this.laneCache.key) return p;
      this.assignLane(f, p);
      f.laneKey = this.laneCache.key;
      return f.held ? null : f.target;
    }
    const ordered = this.orderedPizza();
    if (ordered && (!f || f.state === 'enter')) return ordered;
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
    if (this.spawnT <= 0 && plan.queue.length && alive < plan.maxAlive && !this.retreating && !this.spawnsPaused && this.hasFreeLane()) {
      // a Persian war band (Act 9): called out as it arrives, and it marches in close together
      const band = plan.band;
      const inBand = !!band && plan.queue.length <= band.at && plan.queue.length > band.at - band.size;
      if (band && plan.queue.length === band.at && !this.minionPool) {
        this.banner('PERSIAN WAR BAND!', 'A Satrap leads the march: take it out first', 'loc');
        audio.sfx('sfx_warhorn', { volume: 0.7 });
      }
      let id = plan.queue.shift()!;
      // during some boss fights the only feet are the boss's own kind
      if (this.minionPool) id = Phaser.Utils.Array.GetRandom(this.minionPool);
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
      } else {
        const f = this.spawnFoot(type, this.pickTarget(null));
        // war band feet take their places in the formation (src/game/acts/persians.ts)
        if (inBand && !this.minionPool) f.brain.band = true;
      }
      this.spawnT = plan.interval * (0.7 + Math.random() * 0.6) * (this.bossFoot ? 2.2 : 1) * (inBand ? 0.6 : 1);
    }
    // mini-boss arrives partway through wave 3 of each stage
    if (plan.mini && !this.miniSpawned && plan.queue.length <= this.planSize * 0.55) this.spawnMini(plan.mini);
    // wave event
    if (this.waveEvent && !this.eventStarted && plan.queue.length <= this.planSize * 0.7) {
      this.eventStarted = true;
      this.startWaveEvent(this.waveEvent);
    }
    if (this.waveEvent2 && !this.event2Started && plan.queue.length <= this.planSize * 0.35) {
      this.event2Started = true;
      this.startWaveEvent(this.waveEvent2);
    }
    // golden foot bonus
    if (plan.golden && !this.goldenSpawned && plan.queue.length < 6) {
      this.goldenSpawned = true;
      const t = this.pickTarget(null);
      if (t) {
        const gf = this.spawnFoot(FOOT_BY_ID.golden, t, false);
        // it gets a lane straight away (a hovering foot waits instead), so it isn't announced off screen
        gf.brain.summoned = true;
        if (gf.held) this.bumpForSummon(gf);
        audio.sfx('sfx_combo', { rate: 1.3 });
        this.fx.quip(t.x, 220, 'GOLDEN FOOT!', '#ffd23f', 50);
      }
    }
    // boss summons reinforcements
    const boss = this.bossFoot;
    if (boss && boss.alive) {
      this.bossSummonT -= dt;
      if (this.bossSummonT <= 0 && alive < plan.maxAlive + 1 && !this.retreating && !this.spawnsPaused && this.hasFreeLane()) {
        this.bossSummonT = boss.brain.summonFast ? 3.2 : 6.5;
        const minion = this.minionPool ? Phaser.Utils.Array.GetRandom(this.minionPool) : (BOSS_MINION[boss.type.id] ?? 'bob');
        const t = this.pickTarget(null);
        if (t && FOOT_BY_ID[minion]) this.spawnFoot(FOOT_BY_ID[minion], t, false);
      }
    }
  }

  private startWaveEvent(id: EventId): void {
    const est = this.run.stats;
    startEvent(this, id, {
      tips: (n, x, y) => this.giveTips(Math.round(n * this.run.heatDef.tips * (1 + est.eventTips)), x, y),
      flyerSec: est.flyerSec,
      chestLess: est.chestLess,
      sightingHits: est.sightingHits,
      // Second Look brings it back; hero goals count missed flyers
      missed: (ev) => {
        this.kit.eventMissed(ev);
        this.tracker.emit('eventMissed', { id: ev });
      },
      hurt: () => this.alivePizzas().some((p) => p.slices < p.maxSlices),
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
        this.tracker.emit('eventDone', { id: ev });
        save.eventsDone[ev] = (save.eventsDone[ev] ?? 0) + 1;
        this.rollDrop(ev, x, y);
        // Bird Feeder: a golden seagull brings an extra crust (outside the event cap)
        if (ev === 'seagull' && est.seagullCrust > 0) {
          this.run.bank(est.seagullCrust);
          this.fx.quip(x, y - 200, `BIRD FEEDER: +${est.seagullCrust} CRUST`, '#ffd23f', 34);
        }
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

  /** Roll an event's rare drop (the drop toppings make it likelier). */
  private rollDrop(ev: EventId, x = W / 2, y = 400): void {
    // drop toppings and Fig & Prosciutto Rose make drops likelier
    const roll = this.kit.dropRoll(ev);
    const dropMult = this.perkKit.eventDropMult();
    // shiny and ultra-rare drops only on Hot or hotter
    const drop = PEEL_HEATS.has(this.run.heat) ? rollEventDrop(ev, () => roll() / dropMult) : null;
    if (drop) {
      this.fx.glint(x, y, 30);
      this.fx.quip(x, y - 150, drop.drop!.chance < 0.01 ? 'ULTRA RARE DROP!' : 'SHINY DROP!', '#fff6c0', 50);
    }
    this.peelToasts([...(drop ? [drop] : []), ...checkPeelAchievements()]);
    persist();
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
    // Picks open a window: they're shop-only
    const cons = UPGRADES.filter((u) => kindOf(u) === 'consumable' && !u.pick && this.run.offerable(u, this.run.wave));
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
    this.throws.clear();
    this.heroes.waveClear();
    this.tracker.emit('waveClear', { boss: isBossWave(this.run.wave), mini: isMiniWave(this.run.wave), secs: this.nowT - this.heroT.wave, slicesLost: this.waveSlicesLost, stageEnd: isBossWave(this.run.wave) });
    this.lockedPizzas.clear();
    this.retreat(false);
    this.minionPool = null;
    this.spawnsPaused = false;
    this.thawPerks();
    const n = this.run.wave;
    const stage = STAGES[Math.floor((n - 1) / WAVES_PER_STAGE) % STAGES.length];
    // a nemesis stage counts for its own place, not the one it stands in for
    const where = stage ? applyNemesis(stage).location : null;
    if (where) save.stageWaves[where] = (save.stageWaves[where] ?? 0) + 1;
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
    // wave events (a chest that dropped right at the end) stay clickable for a moment; boss props go
    this.clickables = this.clickables.filter((c) => c.event && c.alive());
    const perfect = this.waveSlicesLost === 0;
    let bonus = Math.round((5 + n * 2 + this.run.stats.coinsPerWave) * (perfect ? 1.5 : 1) * this.run.heatDef.tips);
    // the first shop should always offer a real choice: wave 1 tops you up to the price of a common topping
    if (n === 1) bonus = Math.max(bonus, WAVE1_MIN_COINS - this.run.coins);
    this.run.coins += bonus;
    this.tipLog.push({ wave: n, earned: this.run.coins - this.coinsAtWaveStart, spent: Math.max(0, this.coinsAtLastClear - this.coinsAtWaveStart) });
    this.coinsAtLastClear = this.run.coins;
    if (perfect) this.addScore(500 * n, false);
    this.kit.waveEnd(boss);
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
    // Aqua-Toe's Tidal Calm: no pizza goes stale at the seaside
    if (!this.heroes.keepFresh()) this.tickFreshness();
    this.perkKit.waveClear(n, perfect, this.run.coins - this.coinsAtWaveStart);
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
    // the journey's end is the full victory (endless can keep going from it); every other act ends on ACT COMPLETE
    if (boss && waveInJourney(n) === JOURNEY_WAVES) {
      this.time.delayedCall(2400, () => this.victory());
      return;
    }
    if (boss && isActEnd(n)) {
      this.time.delayedCall(2400, () => this.actComplete(n));
      return;
    }
    this.afterEvents(boss ? 2400 : 1700, () => this.openUpgrades(boss));
  }

  /** After `ms`, run `then`, but give any wave event still on the table (a chest that dropped as the wave ended,
   *  a flyer still crossing) up to EVENT_GRACE_MS more to be smacked first. */
  private afterEvents(ms: number, then: () => void): void {
    const t0 = this.nowT;
    const wait = () => {
      const live = this.clickables.some((c) => c.event && c.alive());
      if (live && this.nowT - t0 < (ms + EVENT_GRACE_MS) / 1000 && !this.over) {
        this.time.delayedCall(200, wait);
        return;
      }
      this.clickables = this.clickables.filter((c) => !c.event);
      then();
    };
    this.time.delayedCall(ms, wait);
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
      const pickle = this.neighbours(p).filter((q) => q.perk === 'preserve');
      let drain = drainBase * (pickle.some((q) => q.enhanced) ? 0.25 : pickle.length ? 0.5 : 1);
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
        ui.hud.toast(pizzaPortraitURL(p.type.id), 'PIZZA WENT STALE', `${p.type.name}: perk off, -1 slice a wave. Reheat it from its card in the shop.`);
        if (p.type.perk === 'staleHeal' && !p.flags.staleHealed) {
          p.flags.staleHealed = true;
          const n = p.enhanced ? 3 : 2;
          for (const q of this.alivePizzas()) this.healPizza(q, n);
          this.fx.quip(p.x, p.surfaceY - 170, `PIZZA FRITTA: +${n} SLICES FOR ALL`, '#7dff9a', 34);
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

  /** Reheating one pizza: by the freshness it's missing and the wave, so a top-up is cheap and a rescue isn't. */
  private reheatCost(p: Pizza): number {
    const missing = Math.max(0, p.maxFresh - p.fresh);
    return this.boughtOut(Math.max(5, Math.round(((4 + this.run.wave * 0.6) * missing) / 5) * 5));
  }

  /**
   * Two pizzas from your unlocked pool, plus sometimes a Chef's Special: a locked pizza that's
   * unlocked for good when bought. Once every special is unlocked, that slot offers a pizza you own
   * with its perk enhanced instead.
   */
  private rollCounterOffers(): CounterOffer[] {
    const alive = new Set(this.alivePizzas().map((p) => p.type.id));
    const onTable = new Set(this.pizzas.map((p) => p.type.id));
    const price = this.pizzaPrice();
    const wave = this.run.wave;
    // toast pizzas can come back; ones not on the table at all come first
    const owned = Phaser.Utils.Array.Shuffle(save.unlockedPizzas.filter((id) => !alive.has(id) && PIZZA_BY_ID[id])).sort((a, b) => Number(onTable.has(a)) - Number(onTable.has(b)));
    const offers: CounterOffer[] = owned.slice(0, 2).map((id) => ({ id, name: PIZZA_BY_ID[id].name, perk: PIZZA_BY_ID[id].perkText, cost: price, kind: 'pizza' }));
    const specials = PIZZAS.filter((p) => p.route === 'special' && !save.unlockedPizzas.includes(p.id)).sort((a, b) => a.cost - b.cost);
    // Chef's Favourite: a Chef's Special is always on the counter
    if (offers.length < 2 || Math.random() < 0.5 || this.run.level('chefsfav')) {
      if (specials.length) {
        // the simpler specials turn up first
        const p = Phaser.Utils.Array.GetRandom(specials.slice(0, 8));
        offers.push({ id: p.id, name: p.name, perk: p.perkText, cost: specialPrice(price, p, wave), kind: 'special' });
        save.specialSeen[p.id] = (save.specialSeen[p.id] ?? 0) + 1;
        persist();
      } else {
        const pool = save.unlockedPizzas.filter((id) => !alive.has(id) && PIZZA_BY_ID[id] && !offers.some((o) => o.id === id));
        if (pool.length) {
          const p = PIZZA_BY_ID[Phaser.Utils.Array.GetRandom(pool)];
          offers.push({ id: p.id, name: p.name, perk: enhancedText(p.perk), cost: specialPrice(price, p, wave), kind: 'enhanced' });
        }
      }
    }
    return offers;
  }

  /** Last pizza standing: the shop opened with one pizza left and none has been added yet. */
  private lastStandOpen(): boolean {
    return !!this.shop?.lastStand && this.alivePizzas().length < 2;
  }

  /** What a counter offer costs right now: at last pizza standing the regular pizzas are free and the special half price. */
  private offerPrice(o: CounterOffer): number {
    // shop toppings: Premium Menu, Owner's Discount, Chef's Favourite, and the free pizzas
    const cost = counterPrice(this.run, o.cost, o.kind);
    if (!this.lastStandOpen()) return this.boughtOut(cost);
    return o.kind === 'pizza' ? 0 : Math.round(cost / 2 / 5) * 5;
  }

  /** Build the live art of the feet that can turn up in wave n in idle time, before they appear (the shop and the
   * wave's opening seconds): its boss and minion, its mini-boss, its queue (or the feet likeliest in it). */
  private warmFeet(n: number, plan?: WavePlan): void {
    const ids: string[] = [];
    if (isBossWave(n)) {
      const b = bossFor(n);
      ids.push(b);
      if (BOSS_MINION[b]) ids.push(BOSS_MINION[b]);
    }
    if (isMiniWave(n)) ids.push(miniFor(n));
    if (plan) ids.push(...plan.queue, ...(plan.golden ? ['golden'] : []));
    else {
      // no plan yet (it rolls the wave's randomness): the whole pool, newest feet first (they're the likeliest);
      // the shop has the idle time
      ids.push(...footPool(n).sort((a, b) => b.minWave - a.minWave).map((f) => f.id));
    }
    const busy = () => this.waveActive && !this.inUpgrade && this.sys.isActive();
    setLiveWarmBusy(busy);
    warmLive(this, ids, FOOT_BY_ID);
    // their still art first (feet not drawn yet: src/game/assets.ts), then the rest of the stage's: its mini-boss,
    // its boss and its minion, and every foot that can turn up before the stage ends
    const art = [...ids];
    const end = Math.ceil(n / WAVES_PER_STAGE) * WAVES_PER_STAGE;
    for (let w = n + 1; w <= end; w++) if (isMiniWave(w)) art.push(miniFor(w));
    if (end > n) art.push(bossFor(end), ...(BOSS_MINION[bossFor(end)] ? [BOSS_MINION[bossFor(end)]] : []));
    // (and what its boss was seen to summon: a foot from outside the pool)
    if (end > n) art.push(...bossSummons(bossFor(end)));
    if (isBossWave(n)) art.push(...bossSummons(bossFor(n)));
    art.push(...footPool(end).map((f) => f.id));
    // the journey's last stage: the ending's parade too
    if (waveInJourney(n) > JOURNEY_WAVES - WAVES_PER_STAGE) art.push(...finaleCast());
    setArtWarmBusy(busy);
    warmFootArt(art);
  }

  /**
   * Memory: before a new stage, let go of the art (still textures and live layers) of feet that can't turn up in it
   * or the next one: other acts' themed feet, and bosses and mini-bosses (with their minions and what they were seen
   * to summon) of other stages, unless something on screen still shows them. Anything let go comes back through
   * ensureFootArt and warmLive (src/game/assets.ts, src/game/liveKit.ts) when it's warmed or spawned: from the art
   * cache, a decode rather than a redraw.
   */
  private evictArt(n: number): void {
    const t0 = performance.now();
    const keep = new Set<string>();
    const start = (Math.ceil(n / WAVES_PER_STAGE) - 1) * WAVES_PER_STAGE + 1;
    for (let w = n; w < start + 2 * WAVES_PER_STAGE; w++) {
      for (const f of footPool(w)) keep.add(f.id);
      if (isMiniWave(w)) keep.add(miniFor(w));
      if (!isBossWave(w)) continue;
      const b = bossFor(w);
      keep.add(b);
      if (BOSS_MINION[b]) keep.add(BOSS_MINION[b]);
      for (const id of bossSummons(b)) keep.add(id);
    }
    // feet that only come summoned or by event (the golden foot, the mimic, the Titans): small, and any wave may
    // bring one
    for (const f of FEET) if (!f.boss && !f.mini && !(f.weight > 0)) keep.add(f.id);
    if (waveInJourney(n) > JOURNEY_WAVES - WAVES_PER_STAGE) for (const id of finaleCast()) keep.add(id);
    for (const f of this.feet) keep.add(f.type.id);
    // the peel in hand and the look on the cursor (a living peel animates its foot's art)
    for (const pid of [this.peelId, this.lookId]) {
      const fid = peelFootId(pid);
      if (fid) keep.add(fid);
    }
    const inUse = texturesInUse(this.game);
    const still = evictFootArt(keep, inUse);
    const live = evictLive(this, keep, inUse);
    evictShieldArt(this, keep, inUse);
    // (zombie feet only last a Zombie Loafer fight: their art goes whatever the next stage brings)
    evictZombieArt(this, inUse);
    if (import.meta.env.DEV) ((window as unknown as { __evictions?: unknown[] }).__evictions ??= []).push({ wave: n, still, live, ms: Math.round(performance.now() - t0) });
  }

  private openUpgrades(bossReward: boolean, keepCards?: { cards: Upgrade[]; sold: Set<string>; free: string | null; goldenBought?: GoldenItem['id']; lastStand?: boolean }, title?: string): void {
    if (this.over) return;
    // a new stage next: first let go of the art it won't need
    if ((this.run.wave + 1 - 1) % WAVES_PER_STAGE === 0) this.evictArt(this.run.wave + 1);
    this.warmFeet(this.run.wave + 1);
    // the next stage's backdrop: build its live textures while the shop is up, not as its first wave starts
    const nextBd = backdropFor(this.run.wave + 1);
    if (nextBd !== this.currentBackdrop) this.time.delayedCall(500, () => this.inUpgrade && prepareLive(this, nextBd));
    this.inUpgrade = true;
    ui.setPlaying(false);
    audio.duck(0.55);
    this.displayCoins = this.run.coins;
    const count = cardCount(this.run, 3 + (save.meta.indecisive ? 1 : 0));
    const tableFull = this.pizzas.length >= MAX_PIZZAS && !this.pizzas.some((p) => p.dead);
    const exclude = tableFull ? ['helping'] : [];
    let cards = keepCards?.cards;
    let free = keepCards?.free ?? null;
    // From the Future (Booster Gouda) showed these as the wave began
    const future = !bossReward ? this.heroT.shop : null;
    this.heroT.shop = null;
    // a new shop: its deals start over (a resumed shop keeps them, even one saved with no cards left)
    if (!keepCards && !this.restoredShop?.shop) this.run.kit.shop = freshKitShop();
    if (!cards) {
      cards = future ?? (bossReward ? this.run.rollBossChoices(count, exclude) : this.run.rollChoices(count, exclude));
      // boss loot: the lowest-rarity pick dealt is free (a random one of them when several share it) ·
      // Birthday Cake: every 5th wave a random card is free (enhanced: every 3rd)
      const every = this.run.enhancedPerks.has('freeTopping') ? 3 : 5;
      if (bossReward && cards.length) {
        const rank: Record<Rarity, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };
        const low = Math.min(...cards.map((u) => rank[u.rarity]));
        free = Phaser.Utils.Array.GetRandom(cards.filter((u) => rank[u.rarity] === low)).id;
      }
      else if (this.run.stats.freeTopping && this.run.wave % every === every - 1 && cards.length) free = Phaser.Utils.Array.GetRandom(cards).id;
    }
    if (!keepCards) this.pickClearance(cards, free, new Set());
    const restored = this.restoredShop?.counter.length ? this.restoredShop.counter.map((o) => ({ ...o, kind: o.kind ?? (o.trial ? 'special' : 'pizza') }) as CounterOffer) : null;
    const counter = this.shop?.counter && this.shop.state.wave === this.run.wave ? this.shop.counter : restored ?? this.rollCounterOffers();
    // a bought-out shop stays bought out through Save & Menu
    const restoredBuyout = !!this.restoredShop?.shop?.boughtOut;
    const restoredSlots = !!this.restoredShop?.shop?.slotsUsed;
    this.restoredShop = null;
    // one pizza left: a free one from the counter, and Next Wave waits for it
    const lastStand = keepCards?.lastStand ?? (this.alivePizzas().length === 1 && counter.some((o) => o.kind === 'pizza'));
    // the Sole Proprietor bought this shop out (wave 95): every price is doubled
    const boughtOut = !!this.shop?.boughtOut || finaleState.buyout || restoredBuyout;
    finaleState.buyout = false;
    // Pizza Slots: one pull a shop, kept through Save & Menu (a resumed shop shows the machine as pulled)
    const slotsUsed = !!this.shop?.slots?.used && this.shop.state?.wave === this.run.wave ? true : restoredSlots;
    this.shop = { el: null as unknown as HTMLElement, state: null as unknown as ShopState, cards, sold: keepCards?.sold ?? new Set(), free, bossReward, counter, goldenBought: keepCards?.goldenBought, lastStand, boughtOut, slots: slotsUsed ? { used: true, result: this.shop?.slots?.result ?? null } : undefined };
    if (boughtOut) title = title ?? 'BOUGHT OUT! EVERY PRICE ×2';
    this.saveRun();
    const state = this.shopState(title);
    this.shop.state = state;
    this.shop.el = ui.shop(state, {
      buy: (id) => this.shopBuy(id),
      reroll: () => this.shopReroll(),
      heal: () => this.shopHeal(),
      slots: (pay) => this.shopSlots(pay),
      slotsTake: (c) => this.slotsTake(c),
      rebake: () => this.shopRebake(),
      reheat: (i) => this.shopReheat(i),
      toppings: () => this.shopToppings(),
      buyPizza: (id) => this.shopBuyPizza(id),
      golden: (id) => this.shopGolden(id),
      next: () => this.shopNext(),
      pause: () => this.togglePause(),
    });
    // a Pick or Peel Roulette bought before a reload is still waiting
    if (this.run.kit.pendingPick) this.time.delayedCall(300, () => this.openPending());
    if (cards.some((u) => kindOf(u) !== 'permanent')) this.introCard('kinds');
    if (save.crusts >= 25 && this.shop.state.golden.some((g) => g.available)) this.introCard('golden');
  }

  /** Clearance Rack: one card that isn't free is half price. */
  private pickClearance(cards: Upgrade[], free: string | null, sold: Set<string>): void {
    const k = this.run.kit.shop;
    if (!this.run.level('clearance') || (k.clearance && k.clearance !== free && cards.some((u) => u.id === k.clearance))) return;
    const pool = cards.filter((u) => u.id !== free && !sold.has(u.id));
    k.clearance = pool.length ? Phaser.Utils.Array.GetRandom(pool).id : null;
  }

  /** A card's price now, with the shop toppings (and free if it's on the house). */
  private cardPrice(u: Upgrade): { price: number; full: number; free: boolean } {
    const sh = this.shop;
    const free = !!sh && (sh.free === u.id || freeLunchReady(this.run));
    const p = toppingPrice(this.run, u);
    // Act 10: the Sole Proprietor bought this shop out
    return { ...p, price: free ? 0 : this.boughtOut(p.price), free };
  }

  /** The table as the shop draws it (and the enhance picker). */
  private shopPizzas(): ShopPizza[] {
    const reheatOn = this.run.heatDef.freshness > 0;
    return this.pizzas.map((p) => {
      const cost = this.reheatCost(p);
      const needs = reheatOn && p.freshOn && !p.dead && p.fresh < p.maxFresh;
      return {
        id: p.type.id,
        name: p.type.name,
        perk: p.perkLine,
        basePerk: p.basePerkLine,
        enhancedPerk: p.enhancedLine,
        enhanced: p.enhanced && !p.dead,
        slices: p.slices,
        max: p.maxSlices,
        fresh: p.fresh,
        maxFresh: p.maxFresh,
        freshOn: p.freshOn,
        stale: p.stale,
        dead: p.dead,
        reheat: needs ? { cost, can: this.run.coins >= cost } : null,
      };
    });
  }

  private shopState(title?: string): ShopState {
    const r = this.run;
    const sh = this.shop!;
    // every topping dealt counts as seen (the Pizzeria's Toppings tab)
    markToppingsSeen(sh.cards.map((u) => u.id));
    const happy = happyHour(r);
    const cards: ShopCard[] = sh.cards.map((u) => {
      const lvl = r.level(u.id);
      const k = kindOf(u);
      const cp = this.cardPrice(u);
      const tag = r.kit.shop.clearance === u.id ? 'HALF PRICE' : happy ? 'HAPPY HOUR' : cp.price < cp.full ? 'SALE' : null;
      return {
        id: u.id,
        name: u.name,
        icon: u.icon,
        rarity: u.rarity,
        kind: k,
        desc: u.desc(lvl + 1),
        downside: u.downside,
        lvl: k === 'consumable' ? 'One use, back in 3 waves' : k === 'unique' ? 'Once per run' : lvl ? `LV ${lvl} → ${lvl + 1}` : 'NEW',
        price: cp.price,
        was: cp.full,
        free: cp.free,
        tag: tag && !cp.free && cp.price < cp.full ? { text: tag, kind: 'sale' } : undefined,
        sold: sh.sold.has(u.id),
      };
    });
    const dead = this.pizzas.filter((p) => p.dead);
    const next = nextLockedPizza(PIZZAS);
    const used = (id: string) => r.goldenUsed[id] ?? 0;
    const canEnhance = this.alivePizzas().some((p) => !p.enhanced);
    const best = bestRarity(r.wave);
    const legOpen = rarityOpen('legendary', r.wave);
    const golden: GoldenItem[] = [
      { id: 'rebake', name: 'Golden Rebake', desc: 'A destroyed pizza back with full slices', cost: 40, available: dead.length > 0 && used('rebake') < 1 && this.run.heat !== 'inferno', note: this.run.heat === 'inferno' ? 'Off on Inferno' : used('rebake') ? 'Used this run' : dead.length ? '' : 'No pizza lost' },
      { id: 'enhance', name: 'Enhance a Pizza', desc: 'Pick a pizza: its perk gets about 50% stronger for the rest of the run. The price doubles each time.', cost: r.enhanceCost(), available: canEnhance, note: canEnhance ? '' : 'All enhanced' },
      { id: 'reroll', name: 'Golden Reroll', desc: `Reroll with ${best === 'epic' ? 'an' : 'a'} ${best} · ${2 - used('reroll')} left`, cost: 25, available: used('reroll') < 2, note: used('reroll') >= 2 ? 'Used twice' : '' },
      { id: 'topping', name: 'Golden Topping', desc: 'A guaranteed legendary card', cost: 60, available: legOpen && used('topping') < 1, note: !legOpen ? `From wave ${RARITY_FROM.legendary}` : used('topping') ? 'Used this run' : '' },
      { id: 'fresh', name: 'Fresh Batch', desc: 'Every pizza back to full freshness', cost: 30, available: used('fresh') < 1 && this.run.heatDef.freshness > 0, note: this.run.heatDef.freshness > 0 ? (used('fresh') ? 'Used this run' : '') : 'Freshness is off' },
    ];
    // Golden Ticket, Owner's Discount; Royal Wedding
    for (const g of golden) g.cost = Math.max(1, Math.round(goldenPrice(r, g.cost) * this.perkKit.goldenMult()));
    for (const g of golden) g.available = g.available && save.crusts >= g.cost;
    // one Golden Menu pick per shop: once something is bought, the rest wait for the next shop
    const picked = this.shop?.goldenBought;
    if (picked) for (const g of golden) {
      g.available = false;
      g.note = g.id === picked ? 'Bought this shop' : 'One per shop';
    }
    const lastStand = this.lastStandOpen();
    const offers: ShopOffer[] = sh.counter.map((o) => ({
      id: o.id,
      name: o.name,
      perk: o.perk,
      cost: this.offerPrice(o),
      fullCost: o.cost,
      kind: o.kind,
      basePerk: o.kind === 'enhanced' ? PIZZA_BY_ID[o.id]?.perkText : undefined,
    }));
    return {
      title: title ?? (lastStand ? 'ONE PIZZA LEFT' : this.shop?.bossReward ? 'BOSS LOOT!' : `WAVE ${r.wave} CLEARED!`),
      sub: lastStand ? 'Add another pizza before the next wave: one is on the house' : sh.boughtOut ? 'The Sole Proprietor owns this shop now: everything costs double' : this.shop?.bossReward ? 'One pick is on the house' : 'Spend your tips on toppings and pizzas, or bank them',
      wave: r.wave,
      coins: r.coins,
      crusts: save.crusts,
      cards,
      rerollLabel: this.freeRerollsLeft > 0 ? `REROLL · ${this.freeRerollsLeft} free` : `REROLL · ${this.rerollCost()}`,
      canReroll: this.freeRerollsLeft > 0 || r.coins >= this.rerollCost(),
      table: this.shopPizzas(),
      tableFull: this.pizzas.length >= MAX_PIZZAS,
      offers,
      heal: { cost: this.boughtOut(this.healCost), can: this.alivePizzas().some((p) => p.slices < p.maxSlices) && r.coins >= this.boughtOut(this.healCost) },
      rebake: { cost: this.boughtOut(this.reviveCost), can: dead.length > 0 && r.coins >= this.boughtOut(this.reviveCost), shown: this.run.heatDef.rebake },
      slots: this.slotsShown() ? { cost: this.slotsCost(), can: !sh.slots?.used && r.coins >= this.slotsCost(), crustCost: SLOTS_CRUSTS, canCrusts: !sh.slots?.used && save.crusts >= SLOTS_CRUSTS, used: !!sh.slots?.used, result: sh.slots?.result ?? null, pays: this.slotsPays() } : null,
      lastStand,
      yours: this.yourToppings(),
      golden,
      // bank already holds this run's boss and event crusts; only the end-of-run part is still to come
      progress: { runCrusts: r.crustsEarned(this.figOnTable()), bank: save.crusts - r.bankedCrusts, next: next ? { name: next.name, cost: next.cost } : null },
    };
  }

  /** Every topping you own, armed consumables, and used ones waiting to come back. */
  private yourToppings(): YourTopping[] {
    const r = this.run;
    const out: YourTopping[] = Object.entries(r.owned)
      .filter(([id, lvl]) => UPGRADE_BY_ID[id] && lvl > 0)
      .map(([id, lvl]) => ({ id, lvl, armed: false, back: null, max: r.maxLevel(UPGRADE_BY_ID[id]) }));
    for (const id of r.armed) if (UPGRADE_BY_ID[id]) out.push({ id, lvl: 1, armed: true, back: null });
    for (const [id, w] of Object.entries(r.cooldowns)) if (UPGRADE_BY_ID[id] && w > r.wave && !r.armed.includes(id)) out.push({ id, lvl: 0, armed: false, back: w });
    return out;
  }

  private shopToppings(): void {
    if (!this.shop) return;
    ui.yourToppings(this.yourToppings(), this.run.wave);
  }

  private refreshShop(): void {
    if (!this.shop) return;
    this.shop.state = this.shopState(this.shop.state.title === 'WELCOME BACK!' || this.shop.state.title.endsWith('STOCK UP') ? this.shop.state.title : undefined);
    ui.updateShop(this.shop.el, this.shop.state);
    ui.hud.setCoins(this.run.coins);
    ui.hud.setOwned(this.run.owned);
    this.saveRun();
  }

  private shopBuy(id: string): void {
    const sh = this.shop;
    const u = UPGRADE_BY_ID[id];
    if (!sh || !u || sh.sold.has(id)) return;
    const cp = this.cardPrice(u);
    const price = cp.price;
    if (this.run.coins < price) return;
    this.run.coins -= price;
    const k = this.run.kit;
    if (sh.free === id) sh.free = null;
    // Free Lunch: this one's on the house (until the next ten waves)
    else if (cp.free && freeLunchReady(this.run)) k.freeLunchAt = dealBlock(this.run.wave);
    sh.sold.add(id);
    k.shop.bought++;
    // the Toppings tab counts the runs each topping was bought in
    if (!this.run.bought.includes(id)) {
      this.run.bought.push(id);
      save.toppingRuns[id] = (save.toppingRuns[id] ?? 0) + 1;
      persist();
    }
    this.applyUpgrade(u, { paid: price });
    // Stockroom Key: the first card bought in each shop is back on the shelf (or a fresh one in its place)
    if (this.run.level('stockroom') && !k.shop.restocked && u.id !== 'stockroom') {
      k.shop.restocked = true;
      if (this.run.offerable(u, this.run.wave)) sh.sold.delete(id);
      else {
        const fresh = this.run.rollChoices(1, sh.cards.map((c) => c.id))[0];
        if (fresh) sh.cards = sh.cards.map((c) => (c.id === id ? fresh : c));
      }
      ui.hud.toast(null, 'RESTOCKED', 'The Stockroom Key put a card back on the shelf');
    }
    this.refreshShop();
  }

  /** paid: what it cost (a Pick refunds it if there's nothing to pick) · bonus: Buy One Get One's free level (no one-time costs). */
  private applyUpgrade(u: Upgrade, o: { paid?: number; bonus?: boolean } = {}): void {
    const k = kindOf(u);
    if (!o.bonus) audio.sfx('sfx_upgrade');
    if (k !== 'consumable') this.run.owned[u.id] = (this.run.owned[u.id] ?? 0) + 1;
    if (u.onPick === 'healAll2') {
      for (const p of this.alivePizzas()) this.healPizza(p, 2);
      if (k === 'consumable') this.run.consume(u.id);
    }
    if (u.onPick === 'arm') this.run.armed.push(u.id);
    // a Pick or Peel Roulette waits (saved with the run) until its choice is made
    if (u.onPick === 'pick') {
      this.run.consume(u.id);
      this.run.kit.pendingPick = { id: u.id, paid: o.paid ?? 0 };
      this.openPending();
    }
    if (u.onPick === 'roulette') {
      this.run.kit.pendingPick = { id: u.id, paid: o.paid ?? 0 };
      this.openPending();
    }
    if (u.onPick === 'bogo') this.run.kit.bogo = 'ready';
    if (u.onPick === 'crispy') {
      // Extra Crispy: the pizza with the fewest slices to its name gets one more
      const p = [...this.alivePizzas()].sort((a, b) => a.maxSlices - b.maxSlices)[0];
      if (p) {
        p.addSlices(1);
        this.fx.healBurst(p.x, p.surfaceY - 20);
        this.fx.quip(p.x, p.surfaceY - 160, 'EXTRA CRISPY! +1 SLICE', '#ffb070', 38);
      }
    }
    if (u.onPick === 'fridge') for (const p of this.alivePizzas()) if (p.freshOn) p.setFresh(p.fresh + 4);
    // trade-offs paid in freshness: a one-time hit to the pizzas on the table, never enough to make one stale
    if (u.freshNow && !o.bonus) for (const p of this.alivePizzas()) if (p.freshOn && p.fresh > 1) p.setFresh(Math.max(1, p.fresh - u.freshNow));
    // on Mild (no freshness) those trade-offs cost slices instead, never the last one
    if (u.slicesNow && !o.bonus) for (const p of this.alivePizzas()) if (p.slices > 1) p.takeSlices(Math.min(u.slicesNow, p.slices - 1), p.x);
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
    // Buy One Get One: the next topping that levels up gets a second level, free
    const kit = this.run.kit;
    if (!o.bonus && kit.bogo === 'ready' && u.id !== 'bogo' && k === 'permanent' && this.run.level(u.id) < this.run.maxLevel(u)) {
      kit.bogo = 'used';
      this.applyUpgrade(u, { bonus: true });
      ui.hud.toast(null, 'BUY ONE GET ONE', `${u.name}: a free extra level (now LV ${this.run.level(u.id)})`);
    }
  }

  /** Open the window a bought Pick or Peel Roulette is waiting on (again, after a reload). */
  private openPending(): void {
    const pend = this.run.kit.pendingPick;
    if (!pend || !this.shop || this.over || this.pickOpen) return;
    const u = UPGRADE_BY_ID[pend.id];
    if (!u) {
      this.run.kit.pendingPick = null;
      return;
    }
    if (u.onPick === 'roulette') this.openRoulette(pend.paid);
    else this.openPick(u, pend.paid);
  }

  /** A Pick topping: choose 1 of 3 random toppings of its rarity, free (never another Pick or Peel Roulette). */
  private openPick(u: Upgrade, paid: number): void {
    if (!this.shop || this.over) return;
    const tableFull = this.pizzas.length >= MAX_PIZZAS && !this.pizzas.some((p) => p.dead);
    const pool = UPGRADES.filter((x) => x.rarity === u.pick && !x.pick && x.onPick !== 'roulette' && this.run.offerable(x, this.run.wave) && !(tableFull && x.id === 'helping'));
    const picks = Phaser.Utils.Array.Shuffle([...pool]).slice(0, 3);
    if (!picks.length) {
      // nothing left of that rarity: what it cost, back
      this.run.kit.pendingPick = null;
      this.run.coins += paid;
      ui.hud.toast(null, u.name.toUpperCase(), `Nothing left to pick: +${paid} tips back`);
      this.refreshShop();
      return;
    }
    this.pickOpen = true;
    markToppingsSeen(picks.map((x) => x.id));
    const options: PickOption[] = picks.map((x) => {
      const lvl = this.run.level(x.id);
      const k = kindOf(x);
      return { u: x, desc: x.desc(lvl + 1), downside: x.downside, lvl: k === 'consumable' ? 'One use, back in 3 waves' : k === 'unique' ? 'Once per run' : lvl ? `LV ${lvl} → ${lvl + 1}` : 'NEW' };
    });
    pickWindow({
      title: 'CHOOSE ONE, FREE',
      rarity: u.pick!,
      options,
      onPick: (id) => {
        this.pickOpen = false;
        const got = UPGRADE_BY_ID[id];
        if (!got || !this.shop) return;
        this.run.kit.pendingPick = null;
        if (!this.run.bought.includes(id)) {
          this.run.bought.push(id);
          save.toppingRuns[id] = (save.toppingRuns[id] ?? 0) + 1;
          persist();
        }
        this.applyUpgrade(got);
        ui.hud.toast(null, `${u.name.toUpperCase()}: ${got.name.toUpperCase()}`, got.desc(this.run.level(id) || 1));
        this.refreshShop();
      },
    });
  }

  /** Peel Roulette: choose 1 of 3 of your other peels for the rest of the run. */
  private openRoulette(paid: number): void {
    if (!this.shop || this.over) return;
    const options = this.rouletteOptions(3);
    if (!options.length) {
      this.run.kit.pendingPick = null;
      this.run.coins += paid;
      this.refreshShop();
      return;
    }
    this.pickOpen = true;
    rouletteWindow({ current: this.peelId, options, onPick: (id) => {
      this.pickOpen = false;
      this.run.kit.pendingPick = null;
      this.swapPeel(id);
      this.refreshShop();
    } });
  }

  /** A reroll's price: the shop deals, then Gambeet's Gambler (1 less). */
  private rerollCost(): number {
    return this.boughtOut(Math.max(0, rerollPrice(this.run) - this.heroes.rerollDiscount()));
  }

  private shopReroll(): void {
    const sh = this.shop;
    if (!sh) return;
    const cost = this.rerollCost();
    if (this.freeRerollsLeft > 0) this.freeRerollsLeft--;
    else if (this.run.coins >= cost) {
      this.run.coins -= cost;
      this.run.rerollCost = Math.round(this.run.rerollCost * 1.5 + 5);
    } else return;
    audio.sfx('sfx_boing', { volume: 0.6 });
    this.rerollCards(null);
  }

  /** Deal new cards; `best` guarantees one of that rarity (Golden Reroll: the rarest open at this wave). */
  private rerollCards(best: Rarity | null): void {
    const sh = this.shop!;
    // the base count: Mac & Cheese's extra consumable card is added on top by rollChoices
    const count = sh.bossReward ? sh.cards.length : cardCount(this.run, 3 + (save.meta.indecisive ? 1 : 0));
    const tableFull = this.pizzas.length >= MAX_PIZZAS && !this.pizzas.some((p) => p.dead);
    const keep = sh.cards.filter((u) => sh.sold.has(u.id));
    // a reroll never deals back the cards it replaced: roll from everything else first,
    // and only top up with old cards if the pool has run that dry
    const old = sh.cards.filter((u) => !sh.sold.has(u.id)).map((u) => u.id);
    const base = [...keep.map((u) => u.id), ...(tableFull ? ['helping'] : [])];
    const roll = (n: number, ex: string[]) => (sh.bossReward ? this.run.rollBossChoices(n, ex) : this.run.rollChoices(n, ex));
    let fresh = roll(count - keep.length, [...base, ...old]);
    if (fresh.length < count - keep.length) fresh = [...fresh, ...roll(count - keep.length - fresh.length, [...base, ...fresh.map((u) => u.id)]).slice(0, count - keep.length - fresh.length)];
    if (best && !fresh.some((u) => u.rarity === best)) {
      const pool = UPGRADES.filter((u) => u.rarity === best && this.run.offerable(u, this.run.wave) && !keep.includes(u) && !fresh.includes(u) && !(tableFull && u.id === 'helping'));
      const newOnes = pool.filter((u) => !old.includes(u.id));
      if (newOnes.length) pool.splice(0, pool.length, ...newOnes);
      if (pool.length) fresh = [...fresh.slice(0, Math.max(0, fresh.length - 1)), Phaser.Utils.Array.GetRandom(pool)];
    }
    sh.cards = [...keep, ...fresh];
    this.tracker.emit('reroll', { rarities: fresh.map((u) => u.rarity) });
    if (sh.free && !sh.cards.some((u) => u.id === sh.free)) sh.free = null;
    this.pickClearance(sh.cards, sh.free, sh.sold);
    this.refreshShop();
  }

  // ——— Pizza Slots: the counter's third slot when no Chef's Special turned up ———

  /** The machine stands in the counter's third slot: shown when the counter dealt no special (or enhanced) pizza. */
  private slotsShown(): boolean {
    const sh = this.shop;
    if (!sh || sh.lastStand || sh.bossReward) return false;
    return !sh.counter.some((o) => o.kind === 'special' || o.kind === 'enhanced') || !!sh.slots?.used;
  }

  /** This machine's prizes: each shop's machine rolls its own (shown behind its [?]). */
  private slotsTable(): SlotsTable {
    const sh = this.shop!;
    if (!sh.slots) sh.slots = { used: false, result: null };
    if (!sh.slots.table) {
      const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
      sh.slots.table = {
        tips: pick([2, 2.5, 3]),
        slices: pick(['full', 'four'] as const),
        crusts: pick([50, 60, 80]),
        legendary: this.run.wave >= 20 && Math.random() < 0.5,
      };
    }
    return sh.slots.table;
  }

  /** What this machine's three-of-a-kinds pay, in words (the [?] panel), knowing the peel's ability. */
  private slotsPays(): [SlotSymbol, string][] {
    const t = this.slotsTable();
    const cost = this.slotsCost();
    const ab = this.ability;
    const slam = !ab ? 'A full Peel Slam meter' : ab.trigger.t === 'every' ? `${ab.name} fires straight away` : usesMeter(ab) ? `A full ${ab.name} meter` : 'Your pull back';
    return [
      ['tips', `${(Math.round((cost * t.tips) / 5) * 5).toLocaleString('en-US')} tips`],
      ['slices', t.slices === 'full' ? 'Every pizza back to full' : '+4 slices for your hungriest'],
      ['slam', slam],
      ['topping', 'A free rare topping'],
      ['epic', t.legendary ? 'A free legendary topping' : 'A free epic topping'],
      ['crust', `+${t.crusts} Golden Crusts`],
      ['chef', "JACKPOT: a free Chef's Special"],
    ];
  }

  /** A pull costs about 1¼ times a pizza at the counter. */
  private slotsCost(): number {
    return this.boughtOut(Math.round((this.pizzaPrice() * 1.25) / 5) * 5);
  }

  private shopSlots(pay: 'tips' | 'crusts'): void {
    const sh = this.shop;
    if (!sh || sh.slots?.used || !this.slotsShown()) return;
    const cost = this.slotsCost();
    if (pay === 'tips') {
      if (this.run.coins < cost) return;
      this.run.coins -= cost;
    } else {
      if (save.crusts < SLOTS_CRUSTS) return;
      save.crusts -= SLOTS_CRUSTS;
      persist();
    }
    // the outcome is drawn first, then the reels are set to show it: a third of pulls land three of a kind
    const SYMS: SlotSymbol[] = ['tips', 'slices', 'slam', 'topping', 'epic', 'crust', 'chef'];
    const DROPS: [SlotSymbol, number][] = [['tips', 28], ['slices', 22], ['topping', 18], ['slam', 14], ['epic', 8], ['crust', 6], ['chef', 4]];
    const win = Math.random() < 1 / 3;
    let reels: [SlotSymbol, SlotSymbol, SlotSymbol];
    let prize = '';
    if (win) {
      let roll = Math.random() * DROPS.reduce((n, d) => n + d[1], 0);
      const sym = (DROPS.find((d) => (roll -= d[1]) < 0) ?? DROPS[0])[0];
      reels = [sym, sym, sym];
      prize = this.slotsPrize(sym, cost, pay);
    } else {
      // a miss: never three alike (two alike now and then, for the near miss)
      const a = Phaser.Utils.Array.GetRandom(SYMS);
      const b = Math.random() < 0.4 ? a : Phaser.Utils.Array.GetRandom(SYMS.filter((x) => x !== a));
      const c = Phaser.Utils.Array.GetRandom(SYMS.filter((x) => x !== a && x !== b));
      reels = Phaser.Utils.Array.Shuffle([a, b, c]) as [SlotSymbol, SlotSymbol, SlotSymbol];
    }
    sh.slots = { used: true, table: sh.slots?.table, result: { reels, win, prize, fresh: true, offer: this.slotsOffer ?? undefined } };
    this.slotsOffer = null;
    audio.sfx('sfx_coin', { rate: 0.8 });
    this.refreshShop();
    // the reels stop one by one (ui.ts); the win lands with the last
    // (a page timer: the scene may be paused behind the shop)
    window.setTimeout(() => {
      if (this.shop !== sh || !sh.slots?.result) return;
      sh.slots.result.fresh = false;
      const offer = sh.slots.result.offer;
      if (win) {
        audio.sfx('sfx_combo', { rate: 1.2 });
        // a topping: its card in a window, to add or sell; anything else is paid already
        if (offer && !offer.taken && UPGRADE_BY_ID[offer.id]) {
          const u = UPGRADE_BY_ID[offer.id];
          const lvl = this.run.level(u.id);
          const k = kindOf(u);
          slotsPrizeWindow({ u, desc: u.desc(lvl + 1), downside: u.downside, lvl: k === 'consumable' ? 'One use, back in 3 waves' : k === 'unique' ? 'Once per run' : lvl ? `LV ${lvl} → ${lvl + 1}` : 'NEW', sell: offer.sell, onChoose: (c) => this.slotsTake(c) });
        } else ui.hud.toast(null, 'PIZZA SLOTS: THREE OF A KIND!', prize);
      } else audio.sfx('sfx_pop', { rate: 0.7 });
      this.refreshShop();
    }, 1500);
  }

  /** A topping a Pizza Slots win is offering (set while the prize is drawn). */
  private slotsOffer: NonNullable<SlotsResult['offer']> | null = null;

  /** Keep the topping Pizza Slots won, or sell it for half its usual price. */
  private slotsTake(choice: 'add' | 'sell'): void {
    const o = this.shop?.slots?.result?.offer;
    if (!o || o.taken) return;
    const u = UPGRADE_BY_ID[o.id];
    if (!u) return;
    o.taken = choice;
    if (choice === 'add') {
      if (!this.run.bought.includes(u.id)) this.run.bought.push(u.id);
      this.applyUpgrade(u);
      ui.hud.toast(null, `PIZZA SLOTS: ${u.name.toUpperCase()}`, u.desc(this.run.level(u.id) || 1));
      this.shop!.slots!.result!.prize = `Added: ${u.name}`;
    } else {
      this.run.coins += o.sell;
      audio.sfx('sfx_coin', { rate: 1.1 });
      this.shop!.slots!.result!.prize = `Sold ${u.name} for ${o.sell} tips`;
    }
    this.refreshShop();
  }

  /** Pay a Pizza Slots win; returns what it gave, in words. A prize that would do nothing pays the pull back (in
   *  whatever it was paid with). `cost` is the pull's price in tips, which the tips prize scales from. */
  private slotsPrize(sym: SlotSymbol, cost: number, pay: 'tips' | 'crusts'): string {
    const refund = () => {
      if (pay === 'crusts') {
        save.crusts += SLOTS_CRUSTS;
        persist();
        return `Your ${SLOTS_CRUSTS} Golden Crusts back`;
      }
      this.run.coins += cost;
      return `Your ${cost} tips back`;
    };
    // a topping is offered, not applied: keep it or sell it for half its usual price (slotsTake)
    const topping = (rarities: string[]) => {
      const pool = UPGRADES.filter((u) => rarities.includes(u.rarity) && !u.pick && this.run.offerable(u, this.run.wave));
      const u = pool.length ? Phaser.Utils.Array.GetRandom(pool) : null;
      if (!u) return null;
      this.slotsOffer = { id: u.id, name: u.name, rarity: u.rarity, sell: Math.max(5, Math.round(toppingPrice(this.run, u).full / 2 / 5) * 5) };
      return `A ${u.rarity} topping: ${u.name}`;
    };
    switch (sym) {
      case 'tips': {
        const n = Math.round((cost * this.slotsTable().tips) / 5) * 5;
        this.run.coins += n;
        return `${n} tips`;
      }
      case 'slices': {
        // every pizza back to full (or four slices to the hungriest); none missing a slice: the pull back
        const hurt = () => this.alivePizzas().filter((p) => p.slices < p.maxSlices).sort((a, b) => a.slices / a.maxSlices - b.slices / b.maxSlices);
        if (!hurt().length) return refund();
        let n = 0;
        if (this.slotsTable().slices === 'full') {
          for (const p of hurt()) {
            n += p.maxSlices - p.slices;
            this.healPizza(p, p.maxSlices - p.slices);
          }
          return `Every pizza back to full (+${n} slice${n === 1 ? '' : 's'})`;
        }
        for (; n < 4 && hurt().length; n++) this.healPizza(hurt()[0], 1);
        return `+${n} slice${n === 1 ? '' : 's'}`;
      }
      case 'slam': {
        // a full Peel Slam meter (or the ability's timer run down); a peel with neither, or a full meter: the pull back
        if (this.ability?.trigger.t === 'every') {
          this.abilityT += this.ability.trigger.sec;
          return `${this.ability.name} straight away`;
        }
        if (this.ability && !usesMeter(this.ability)) return refund();
        if (this.run.super >= 1) return refund();
        this.run.super = 1;
        return 'A full Peel Slam meter';
      }
      case 'topping':
        return topping(['rare']) ?? topping(['common']) ?? refund();
      case 'epic':
        // some machines (from wave 20) pay a legendary here
        return (this.slotsTable().legendary ? topping(['legendary']) : null) ?? topping(['epic']) ?? topping(['rare']) ?? refund();
      case 'crust': {
        // always more than a crust pull costs
        const n = this.slotsTable().crusts;
        save.crusts += n;
        this.run.bankedCrusts += n;
        persist();
        return `+${n} Golden Crusts`;
      }
      case 'chef': {
        // the jackpot: a Chef's Special on the house (or an enhanced pizza when every special is unlocked)
        const sh = this.shop!;
        const special = PIZZAS.filter((p) => p.route === 'special' && !save.unlockedPizzas.includes(p.id) && !sh.counter.some((o) => o.id === p.id));
        const p = special.length ? Phaser.Utils.Array.GetRandom(special.slice(0, 8)) : null;
        if (p) {
          sh.counter.push({ id: p.id, name: p.name, perk: p.perkText, cost: 0, kind: 'special' });
          return `JACKPOT! ${p.name} is on the house at the counter`;
        }
        const alive = new Set(this.alivePizzas().map((x) => x.type.id));
        const pool = save.unlockedPizzas.filter((id) => !alive.has(id) && PIZZA_BY_ID[id] && !sh.counter.some((o) => o.id === id));
        if (pool.length) {
          const e = PIZZA_BY_ID[Phaser.Utils.Array.GetRandom(pool)];
          sh.counter.push({ id: e.id, name: e.name, perk: enhancedText(e.perk), cost: 0, kind: 'enhanced' });
          return `JACKPOT! An enhanced ${e.name} is on the house at the counter`;
        }
        this.run.coins += cost * 4;
        return `JACKPOT! ${cost * 4} tips`;
      }
    }
  }

  private shopHeal(): void {
    if (this.run.coins < this.boughtOut(this.healCost)) return;
    this.run.coins -= this.boughtOut(this.healCost);
    this.healCost = Math.round(this.healCost * 1.45 + 10);
    for (const p of this.alivePizzas()) this.healPizza(p, 2);
    this.refreshShop();
  }

  private shopRebake(): void {
    const p = this.pizzas.find((x) => x.dead);
    const cost = this.boughtOut(this.reviveCost);
    if (!p || this.run.coins < cost || !this.run.heatDef.rebake) return;
    this.run.coins -= cost;
    this.reviveCost = Math.round(this.reviveCost * 1.8);
    p.revived = false;
    p.revive(Math.ceil(p.maxSlices / 2));
    p.setFresh(p.maxFresh);
    this.fx.healBurst(p.x, p.surfaceY);
    audio.sfx('sfx_heal');
    this.recompute();
    this.refreshShop();
  }

  /** Reheat one pizza back to full freshness. */
  private shopReheat(index: number): void {
    const p = this.pizzas[index];
    if (!p || p.dead || !p.freshOn || p.fresh >= p.maxFresh || this.run.heatDef.freshness <= 0) return;
    const cost = this.reheatCost(p);
    if (this.run.coins < cost) return;
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
    if (!sh || !off) return;
    const cost = this.offerPrice(off);
    if (this.run.coins < cost) return;
    // Bottomless Pizza / Free Delivery made it free (last pizza standing's freebie doesn't use them up)
    const freebie = cost === 0 && !this.lastStandOpen() ? counterFreebie(this.run, off.kind) : null;
    const commit = (index: number) => {
      if (this.run.coins < cost || !sh.counter.includes(off)) return;
      this.run.coins -= cost;
      if (freebie === 'bottomless') this.run.kit.bottomlessAt = dealBlock(this.run.wave);
      if (freebie === 'delivery') this.run.kit.freeDeliveryUsed = true;
      this.run.pizzasBought++;
      sh.counter = sh.counter.filter((o) => o !== off);
      const name = PIZZA_BY_ID[id].name;
      const label = off.kind === 'special' ? `${name} (Chef's Special)` : off.kind === 'enhanced' ? `${name} (enhanced)` : name;
      const p = this.placeNewPizza(id, label, index >= 0 ? index : undefined);
      if (p) {
        p.flags.paid = cost;
        if (off.kind === 'enhanced') this.enhance(p);
      }
      // a Chef's Special is yours for good
      if (off.kind === 'special' && this.run.unlock(id, "Bought as a Chef's Special")) {
        this.time.delayedCall(900, () => ui.hud.toast(pizzaPortraitURL(id), 'NEW PIZZA UNLOCKED', `${name} is on your menu for good`));
      }
      this.refreshShop();
    };
    const full = this.pizzas.length >= MAX_PIZZAS;
    if (!full && !this.pizzas.some((p) => p.dead)) {
      commit(-1);
      return;
    }
    // the swap window opens once its intro card is closed (straight away when that's been seen)
    this.introCard('swap', () => ui.swapPicker({
      id,
      name: off.name,
      perk: off.perk,
      cost,
      coins: this.run.coins,
      canAdd: !full,
      current: this.pizzas.map((p) => ({ id: p.type.id, name: p.type.name, perk: p.perkLine, slices: p.slices, max: p.maxSlices, dead: p.dead, stale: p.stale, fresh: p.fresh, freshOn: p.freshOn })),
      onChoose: commit,
    }));
  }

  /** Enhance a pizza for the rest of the run: about +50% to its perk, or an upgraded effect. */
  private enhance(p: Pizza): void {
    if (p.enhanced) return;
    p.flags.enhanced = true;
    // Meat Feast and Lahmacun: two more slices
    if (p.type.perk === 'slices' || p.type.perk === 'bossRegrow') p.addSlices(2);
    this.perkKit.enhanced(p);
    p.redraw();
    this.fx.healBurst(p.x, p.surfaceY - 20);
    this.fx.ring(p.x, p.surfaceY - 30, 0xffc93a, 2.4, 0.5);
    this.fx.quip(p.x, p.surfaceY - 160, 'ENHANCED!', '#ffd23f', 46);
    this.tweens.add({ targets: p.root, scale: { from: 1.12, to: 1 }, duration: 520, ease: 'Back.Out' });
    audio.sfx('sfx_levelup', { volume: 0.7 });
    this.recompute();
  }

  private shopGolden(id: GoldenItem['id']): void {
    const sh = this.shop;
    const g = sh?.state.golden.find((x) => x.id === id);
    if (!sh || !g || !g.available || save.crusts < g.cost || sh.goldenBought) return;
    const pay = () => {
      save.crusts -= g.cost;
      this.run.goldenUsed[id] = (this.run.goldenUsed[id] ?? 0) + 1;
      sh.goldenBought = id;
      audio.sfx('sfx_levelup', { volume: 0.7 });
    };
    if (id === 'enhance') {
      // pay once a pizza is picked
      ui.enhancePicker({
        cost: g.cost,
        pizzas: this.shopPizzas(),
        onPick: (i) => {
          const p = this.pizzas[i];
          if (!p || p.dead || p.enhanced || this.shop !== sh || sh.goldenBought || save.crusts < g.cost) return;
          pay();
          this.run.enhanceUses++;
          this.enhance(p);
          persist();
          this.refreshShop();
        },
      });
      return;
    }
    pay();
    if (id === 'rebake') {
      const p = this.pizzas.find((x) => x.dead);
      if (p) {
        p.revive(p.maxSlices);
        p.setFresh(p.maxFresh);
        this.fx.healBurst(p.x, p.surfaceY);
      }
    } else if (id === 'reroll') this.rerollCards(bestRarity(this.run.wave));
    else if (id === 'topping') {
      const leg = UPGRADES.filter((u) => u.rarity === 'legendary' && this.run.offerable(u, this.run.wave) && !sh.cards.includes(u));
      if (leg.length) sh.cards.push(Phaser.Utils.Array.GetRandom(leg));
    } else if (id === 'fresh') for (const p of this.alivePizzas()) if (p.freshOn) p.setFresh(p.maxFresh);
    persist();
    this.recompute();
    this.refreshShop();
  }

  private shopNext(): void {
    if (!this.shop) return;
    // a topping won on Pizza Slots and not yet chosen: it's kept
    const won = this.shop.slots?.result?.offer;
    if (won && !won.taken) this.slotsTake('add');
    // a bought Pick or Peel Roulette must be chosen first
    if (this.run.kit.pendingPick) {
      this.openPending();
      return;
    }
    // last pizza standing: add a pizza first (the shop explains, and the counter pulses)
    if (this.lastStandOpen()) {
      audio.sfx('sfx_boing', { volume: 0.5, rate: 0.7 });
      ui.nudgeCounter(this.shop.el);
      return;
    }
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
      // Pizza al Taglio refunds half its price when it leaves (enhanced: three quarters)
      if (old.type.perk === 'refund' && old.flags.paid) {
        const back = Math.round(Number(old.flags.paid) * (old.enhanced ? 0.75 : 0.5));
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
    return this.alivePizzas().some((p) => p.perk === 'crustBonus' || p.perk === 'crustRun');
  }

  /** Award any milestones reached: each unlocks the pizza it names (or 50 crusts). */
  private checkMilestones(): void {
    for (const { m, pizza } of awardMilestones(this.run)) {
      if (pizza) ui.hud.toast(pizzaPortraitURL(pizza.id), `MILESTONE: ${m.name.toUpperCase()}`, `${pizza.name} unlocked for free!`);
      else ui.hud.toast(null, `MILESTONE: ${m.name.toUpperCase()}`, '+50 Golden Crusts');
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

  /** Dev: log a smack (src/game/smackLog.ts) and mark it on the hitbox overlay. */
  private logSmack(x: number, y: number, blocked: string | undefined, result: string | undefined): void {
    if (!smackLog.on) return;
    record({
      t: Math.round(this.nowT * 1000) / 1000,
      wave: this.run.wave,
      pointer: [Math.round(this.pointer.x), Math.round(this.pointer.y)],
      peel: [Math.round(x), Math.round(y)],
      blocked,
      result,
      near: describeNear(this.clickables, x, y),
      feet: this.feet.filter((f) => f.alive && f.distanceTo(x, y) < 200).map((f) => ({ id: f.type.id, d: Math.round(f.distanceTo(x, y)) })),
      state: { slowT: Math.round(this.peelSlowT * 100) / 100, stunT: Math.round(this.peelStunT * 100) / 100, modal: ui.modalOpen },
    });
    this.hitboxes?.mark(x, y, !blocked && !!result && result !== 'miss');
  }

  private smack(x: number, y: number): void {
    if (this.over || this.paused || this.inUpgrade || ui.modalOpen) {
      this.logSmack(x, y, this.over ? 'over' : this.paused ? 'paused' : this.inUpgrade ? 'upgrade' : 'modal', undefined);
      return;
    }
    if (this.peelStunT > 0) {
      this.logSmack(x, y, 'peel stunned', undefined);
      this.fx.quip(x, y - 40, 'PEEL STUNNED', '#ffd23f', 28);
      return;
    }
    this.tweens.killTweensOf(this.peel);
    this.peel.setAngle(-62).setScale(this.peelScale() * 1.12);
    this.tweens.add({ targets: this.peel, angle: -28, scale: this.peelScale(), duration: 180, ease: 'Back.Out' });
    this.lookFx?.smack(x, y);
    const r = this.run.stats.radius * this.heroes.reachMult();
    // Dare-Dough's Fearless: phasing feet can be hit too, but never a boss's own phasing (Jörmungandr
    // submerged, a boss mid-move): that's the fight's answer, not a ghost foot
    const fearless = this.heroes.fearless();
    const hits = this.feet
      .filter((f) => f.hittable || (fearless && f.alive && f.phased && f.y > -20 && !f.type.boss && !f.type.mini && !this.director.brainOf(f)))
      .map((f) => ({ f, d: f.distanceTo(x, y) }))
      .filter((o) => o.d <= r)
      .sort((a, b) => a.d - b.d);
    // boss props and wave events: a smack goes to them only when no foot is closer
    // (targets that aren't live right now are skipped, not dropped: many become live later — a head that's still
    // rising, a blade still swinging in, a piston that unlocks — and dropping them on the first smack while they
    // weren't live made them unclickable for good. Long-dead ones are swept in sweepClickables.)
    const click = this.clickables
      .filter((c) => c.alive())
      .map((c) => ({ c, d: c.contains ? (c.contains(x, y) ? 0 : 1) : Math.hypot(c.x - x, c.y - y) - c.r }))
      .filter((o) => o.d <= 0)
      .sort((a, b) => (b.c.priority ?? 0) - (a.c.priority ?? 0) || a.d - b.d)[0];
    if (click && (!hits.length || (click.c.priority ?? 0) >= 2 || hits[0].d > 18)) {
      this.logSmack(x, y, undefined, `target:${labelOf(click.c)}`);
      click.c.hit();
      return;
    }
    this.logSmack(x, y, undefined, hits.length ? `foot:${hits[0].f.type.id}` : 'miss');
    if (!hits.length) {
      this.tracker.emit('smack', { hits: 0, x, y });
      if (this.run.combo >= 3) this.fx.quip(x, y - 30, 'MISS', '#ffb0a0', 32, 0);
      this.run.combo = 0;
      this.fx.puff(x, y, 4);
      audio.sfx('sfx_whoosh', { volume: 0.35, rate: 1.3, throttle: 60 });
      this.kit.onMiss(x, y);
      return;
    }
    if (this.tutorial) ui.hud.tutorial(false);
    // Bigger Peel (and The Last Slice) hit every foot in range
    const targets = this.heroes.smackHits(this.run.level('peel') > 0 || this.kit.areaSmack() ? hits : hits.slice(0, 1));
    this.tracker.emit('smack', { hits: targets.length, x, y });
    // Pizza Romana's extra is worked out once a smack, and the total stays under the cap
    const double = Math.min(DOUBLE_CAP, this.run.stats.doubleChance + this.perkKit.extraDouble());
    for (const { f } of targets) {
      this.hitFoot(f, x, y);
      if (Math.random() < double && f.alive) this.time.delayedCall(90, () => f.alive && this.hitFoot(f, x + 12, y - 12));
    }
  }

  /** Guard shields this run: smacks blocked, shields broken, new ones raised (the balance sim reads it). */
  guardStats = { blocked: 0, broken: 0, rearmed: 0, soaked: 0, chipSteps: 0, slamSteps: 0, ttk: {} as Record<string, number[]>, stomps: {} as Record<string, number> };

  private hitFoot(f: Foot, x: number, y: number): void {
    const st = this.run.stats;
    const hpBefore = f.hp;
    // due to stomp within 0.3 s (Spider-Pan's goal)
    const lastMoment = f.state === 'descend' && (f.stompY - f.y) / Math.max(1, f.vy) < 0.3;
    if (f === this.bossFoot || f === this.miniFoot) this.heroT.bossSmacks++;
    this.dealDamage(f, st.damage, { source: 'smack', canCrit: true, knock: st.knockback, x, y });
    // smack abilities only when the smack landed (not parried, guarded or dodged)
    const landed = !f.alive || f.hp < hpBefore;
    if (landed && this.ability?.trigger.t === 'smack' && Math.random() < this.ability.trigger.p * passiveBoost(st.superGain).chance) this.fireAbility({ foot: f, x: f.cx, y: f.cy });
    if (landed) this.fireProcs('smack', { foot: f, x: f.cx, y: f.cy });
    if (landed) {
      this.kit.onSmackLanded(f, x, y);
      this.perkKit.smacked(f, x);
      this.tracker.emit('hit', { foot: f, lastMoment, x });
      this.heroes.hit(f, x, y);
      // (Spartan Sandals: a hit in an opening slams the shield back up)
      f.guardReact();
    }
    if (!f.alive) return;
    if (f.has('pinch')) this.stunPeel(0.5, 'PINCHED!');
    if (f.has('sticky')) {
      this.slowPeel(1.4);
      this.fx.quip(x, y - 70, 'STICKY!', '#7ad08a', 30);
    }
    if (f.has('invisible')) f.reveal(1.2);
    // Marshmallow Mountain: the first smack each wave on a foot above it sends it back to the top
    const t = f.target;
    if (t && !t.dead && t.perk === 'bounceTop' && Number(t.flags.bounced ?? 0) < (t.enhanced ? 2 : 1) && !f.isBossLike) {
      t.flags.bounced = Number(t.flags.bounced ?? 0) + 1;
      f.y = 140;
      f.vy = 0;
      f.setState('hover');
      this.fx.quip(f.x, 220, 'BOUNCED TO THE TOP!', '#ffe0f0', 36);
      audio.sfx('sfx_boing', { rate: 0.8 });
    }
  }

  private dealDamage(f: Foot, amount: number, o: DamageOpts): void {
    if (!f.alive) return;
    // twins share one health bar: a hit on either one lands on the boss (unless this one is shielded)
    if (f.link && f.link.alive && f.link !== f) {
      if (f.shielded) {
        this.fx.quip(f.x, f.cy - 110, 'BLOCKED', '#c7ccd4', 32);
        audio.sfx('sfx_kit_shieldblock', { throttle: 150 });
        return;
      }
      f.flash(0xffffff, 70);
      this.dealDamage(f.link, amount, o);
      return;
    }
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
    // a raised guard shield blocks the smack and cracks (its badge's pips show what it can still take); the last
    // one it can take shatters it (onTrait 'guardBreak'). Other damage and a hero's bypass go straight through.
    if (smack && f.guardUp && !this.heroes.ignoreShields()) {
      f.flash(0x9ad8ff, 80);
      f.knock(80);
      this.guardStats.blocked++;
      // (no quip per crack: the badge's bar counts down, and quips piled up on quick smacks; one says it's nearly gone)
      if (!f.guardBlock() && f.guardHp === 1) this.fx.quip(f.x, f.cy - 110, 'ONE MORE!', '#9ad8ff', 30);
      return;
    }
    let dmg = amount;
    // automatic damage is scaled by the heat (half on Mild, three quarters on Regular)
    if (o.auto || AUTO_SOURCES.has(o.source)) dmg *= this.run.heatDef.autoDmg;
    // a raised guard shield takes the rest too (a hero's bypass still goes straight through). A Peel Slam or a peel
    // ability's hit knocks a few steps off (slamSteps); automatic damage (burns, toppings, drones) is soaked at half
    // strength, a step for every base smack's worth. Whatever smashes it carries its leftover through to the foot.
    if (!smack && f.guardUp && !this.heroes.ignoreShields()) {
      const was = f.guardHp;
      // (a passive or topping proc that goes through the ability path is automatic: it's soaked like the rest)
      if ((o.source === 'slam' || o.source === 'ability') && !o.auto) {
        const n = slamSteps(this.run.heat);
        const unused = f.guardKnock(n);
        this.guardStats.slamSteps += was - f.guardHp;
        if (unused <= 0) return;
        dmg *= unused / n;
      } else {
        this.guardStats.soaked += dmg * GUARD_SOAK;
        const carry = f.guardChip(dmg * GUARD_SOAK, st.damage);
        this.guardStats.chipSteps += was - f.guardHp;
        if (carry <= 0) return;
        dmg = carry;
      }
    }
    let crit = false;
    if (smack) {
      this.smackCount++;
      if (st.tenthCrit && this.smackCount % (this.run.enhancedPerks.has('tenthCrit') ? 7 : 10) === 0) crit = true;
    }
    if (o.canCrit && (f.has('tender') || this.heroes.critAlways() || (smack && this.kit.forceCrit(f)))) crit = true;
    else if (o.canCrit && Math.random() < st.critChance) crit = true;
    if (crit) dmg *= st.critMult;
    if (f.isBossLike && (smack || o.source === 'direct') && this.director.onSmacked(f, o.x ?? f.cx, o.y ?? f.cy, dmg)) {
      f.flash(0xc7ccd4, 60);
      if (smack) audio.slap(0.5);
      ui.hud.setBoss(f.type.name, f.hp / f.maxHp, this.director.phaseCount(f), f.phase);
      return;
    }
    if (f.shielded && !(smack && this.heroes.ignoreShields())) {
      this.fx.quip(f.x, f.cy - 110, 'BLOCKED', '#c7ccd4', 32);
      audio.sfx('sfx_kit_shieldblock', { throttle: 150 });
      return;
    }
    // hero passives and transformations (Binary Mode, Moonlit, I can do this all day…)
    dmg *= this.heroes.dmgMult(f, smack ? 'smack' : o.source === 'slam' || o.source === 'ability' ? 'ability' : o.source === 'chain' ? 'chain' : o.source === 'burn' ? 'burn' : o.source === 'direct' ? 'direct' : 'other');
    if (o.source === 'chain') this.tracker.emit('chainHit', {});
    // multipliers: overheats and marks, boss hunters, big-health hunters, stunned near Okonomiyaki
    dmg *= f.vuln * this.kit.dmgMult(f) * heroFootDmg(f, smack);
    if (f.brain.marked) dmg *= Number(f.brain.marked) >= 3 ? 3 : 2;
    if (f.markUntil > this.nowT) dmg *= f.markMult;
    if (f.isBossLike) dmg *= 1 + st.bossDmg;
    if (f.hp > f.maxHp * 0.5) dmg *= 1 + st.bigHurt;
    if (f.stunT > 0 && f.target?.perk === 'stunVuln') dmg *= f.target.enhanced ? 1.75 : 1.5;
    dmg *= this.perkKit.damageMult(f, smack);
    let executed = false;
    if (smack && !f.isBossLike && st.execute > 0 && f.hp / f.maxHp <= st.execute) {
      executed = true;
      f.wool = 0;
    }
    if (smack && f.armor > 0 && this.heroes.breaksArmour()) {
      f.armor = 0;
      this.fx.quip(f.x + 60, f.cy - 60, 'ARMOUR BROKEN!', '#ffb040', 30);
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
    if (dealt > 0) f.regenHold = 2;
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
        audio.critSmack();
        this.hitStop = 0.07;
        this.shake(120, 0.004);
        this.rumble(0.35, 80);
      } else audio.slap(0.8);
      if (o.knock) f.knock(o.knock * (crit ? 1.4 : 1) * this.perkKit.knockMult(f));
      this.run.combo++;
      this.run.bestCombo = Math.max(this.run.bestCombo, this.run.combo);
      this.run.comboTimer = COMBO_BASE_WINDOW + st.comboBonus;
      if (this.run.combo % 10 === 0) {
        audio.sfx('sfx_combo', { rate: 1 + Math.min(0.6, this.run.combo / 100) });
        this.fx.quip(W / 2, 330, `${this.run.combo} COMBO!`, '#ffd23f', 56, 0);
      }
      this.run.super = Math.min(1, this.run.super + 0.018 * st.superGain * (this.ability ? this.ability.charge : 1) * this.heroes.meterMult());
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
      if (f.target?.perk === 'disarm' && !f.isBossLike) f.disarmT = f.target.enhanced ? 5 : 3;
      if (f.hp > 0 && f.has('dodge') && Math.random() < 0.35) f.dodge();
    } else if (o.source === 'slam' || o.source === 'trap' || o.source === 'olive' || o.source === 'cutter' || o.source === 'direct') {
      f.flash(0xffffff, 60);
      if (o.knock) f.knock(o.knock);
    }
    contentFx.hit(this, f, px, py, dealt, crit, o.source);
    if (f.isBossLike) {
      const phase = f.phase;
      this.director.afterDamage(f);
      if (f.phase > phase) this.kit.onPhase();
    }
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
      ui.hud.toast(peelThumbURL(d.id, 96), d.shiny ? 'NEW SHINY PEEL!' : d.group === 'hero' ? 'NEW HERO PEEL!' : 'NEW PEEL', `${d.name} · equip it in the Peel Locker`);
      audio.sfx('sfx_levelup', { volume: 0.5, rate: d.shiny ? 1.5 : 1.2 });
    }
  }

  /** Start the worn look's live effect (or stop the last one). */
  private setLookFx(id: string): void {
    this.lookId = id;
    this.lookFx?.destroy();
    this.lookFx = playLook(id, { scene: this, layer: this.cursorLayer, peel: this.peel, reduced: () => save.settings.reducedMotion });
  }

  /** The equipped peel's trail (and sparkles for shiny peels) while it moves. */
  private peelTrailTick(): void {
    const { x, y } = this.peelPos;
    const moved = Math.hypot(x - this.lastPeelPos.x, y - this.lastPeelPos.y);
    this.lastPeelPos = { x, y };
    if (!this.peel.visible || save.settings.reducedMotion || moved < 8) return;
    if (this.peelTrailColor !== null && !this.lookFx?.ownTrail) this.fx.trail(x, y, this.peelTrailColor);
    if (this.peelShiny && Math.random() < 0.35) this.fx.glint(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 40);
  }

  private killFoot(f: Foot, source: DamageOpts['source']): void {
    if (!f.alive) return;
    // (the balance sim: how long a guard foot lasts on screen)
    if (f.type.traits.includes('guard') && !f.brain.decoy) (this.guardStats.ttk[f.type.id] ??= []).push(Math.round(f.fleeAge * 10) / 10);
    // King Honk's decoys are props: they pop without paying out (the cleanup after his death included)
    if (f.brain.decoy) {
      this.fx.puff(f.cx, f.cy, 12);
      f.die();
      return;
    }
    // content can spare a foot from a killing blow (Doomstomp's last life only ends with a signature move)
    if (contentFx.spare(this, f, source)) return;
    if (f.has('revive') && !f.reviveUsed) {
      f.revive();
      this.fx.quip(f.x, f.cy - 120, 'NOT DEAD YET!', '#7dff9a', 40);
      audio.sfx('sfx_boing');
      return;
    }
    contentFx.kill(this, f);
    const st = this.run.stats;
    const boss = !!f.type.boss;
    const mini = !!f.type.mini;
    if (!f.brain.echo) {
      this.tracker.emit('kill', { foot: f, source });
      this.heroes.kill(f);
    }
    this.run.feetSmacked++;
    save.totalFeet++;
    // achievements count real feet only, never a Ghost echo
    if (!f.brain.echo) save.kills[f.type.id] = (save.kills[f.type.id] ?? 0) + 1;
    const midas = !boss && !mini && f.type.id !== 'golden' && Math.random() < st.goldenTouch;
    // Ghost echoes copy a boss's type but are a fraction of one: they pay a tenth
    const echoCut = f.brain.echo ? 0.1 : 1;
    const scoreGain = Math.round(f.type.score * (f.elite ? 2 : 1) * (midas ? 2 : 1) * echoCut * this.perkKit.scoreMult(f));
    this.addScore(scoreGain, true);
    // later waves bring far more feet, so each one pays a little less after wave 10 (×0.71 at 20, ×0.5 at 35)
    const taper = 1 / (1 + Math.max(0, this.run.wave - 10) / 25);
    let coins = Math.max(1, Math.round(f.type.coins * st.coinMult * (f.elite ? 2 : 1) * (midas ? 5 : 1) * this.run.heatDef.tips * echoCut * taper));
    if (f.type.id === 'mimic') coins *= 2;
    if (f.shiny) coins *= 3;
    coins = Math.max(1, Math.round(coins * this.perkKit.tipMult(f, midas)));
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
    if (source !== 'slam' && source !== 'ability' && !(source === 'burn' && f.burnFromAbility)) this.run.super = Math.min(1, this.run.super + 0.05 * st.superGain * (this.ability ? this.ability.charge : 1) * this.heroes.meterMult());
    if (this.ability?.trigger.t === 'kill' && source !== 'ability' && Math.random() < this.ability.trigger.p * passiveBoost(st.superGain).chance) {
      const at = { x: f.cx, y: f.cy };
      this.time.delayedCall(40, () => this.fireAbility({ x: at.x, y: at.y }));
    }
    if (source !== 'ability' && this.procs.length) {
      const at = { x: f.cx, y: f.cy };
      this.time.delayedCall(40, () => this.fireProcs('kill', { x: at.x, y: at.y }));
    }
    this.perkKit.killed(f, coins);
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
    this.kit.onKill(f, (ev) => this.rollDrop(ev, f.cx, f.cy));
    if (f.shiny) {
      this.fx.glint(f.cx, f.cy, 24);
      this.fx.quip(f.x, f.cy - 170, 'SHINY DEFEATED!', '#fff6c0', 48);
      // shiny peels are a Hot-or-hotter prize
      const g = PEEL_HEATS.has(this.run.heat) ? grantShinyFoot(f.type.id) : null;
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
    if (!mini) this.heroT.bosses++;
    this.tracker.emit('bossDown', { foot: f, mini, secs: this.nowT - this.heroT.boss, smacks: this.heroT.bossSmacks, slicesLost: this.waveSlicesLost, peelStunned: this.heroT.stunned, abilityUsed: this.heroT.abilityUsed });
    // boss peels (after Act 1) need the win on Hot or hotter
    if (PEEL_HEATS.has(this.run.heat) && !(save.bossesBeatenHot ??= []).includes(f.type.id)) save.bossesBeatenHot.push(f.type.id);
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
    const pumpkin = this.alivePizzas().filter((p) => p.perk === 'neverStale');
    if (pumpkin.length) for (const p of this.alivePizzas()) if (p.freshOn) p.setFresh(p.fresh + (pumpkin.some((q) => q.enhanced) ? 2 : 1));
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
    // beating wave 30 unlocks the next heat; the act's last boss completes the act (ACT COMPLETE follows the wave)
    const w = this.run.wave;
    if (waveInJourney(w) === HEAT_UNLOCK_WAVE && !save.act1Cleared.includes(this.run.heat)) save.act1Cleared.push(this.run.heat);
    if (isActEnd(w) && !save.actsCleared.includes(actOf(w))) save.actsCleared.push(actOf(w));
    persist();
  }

  private addScore(base: number, combo: boolean): void {
    const st = this.run.stats;
    this.run.score += Math.round(base * st.scoreMult * (combo ? this.run.comboMult() : 1));
  }

  private onStomp(f: Foot): void {
    const p = f.target;
    if (!p || p.dead) return;
    if (f.type.traits.includes('guard')) this.guardStats.stomps[f.type.id] = (this.guardStats.stomps[f.type.id] ?? 0) + 1;
    const st = this.run.stats;
    if (f.type.stompDmg <= 0) return;
    if (this.throws.blindMiss(f)) return;
    const blocked = (shield: boolean) => {
      this.heroes.blocked(f, shield);
      this.tracker.emit('stomp', { foot: f, blocked: shield ? 'shield' : 'other' });
    };
    // Pizza Fantasma's ghost pass, Oyster Rockefeller's shell
    if (this.perkKit.preStomp(f, p)) {
      blocked(false);
      return;
    }
    if (this.run.combo >= 5) this.fx.quip(W / 2, 200, 'COMBO LOST', '#ff8a6a', 40, 0);
    this.run.combo = 0;
    this.rumble(f.isBossLike ? 0.8 : 0.3, f.isBossLike ? 250 : 90);
    this.backdrop.impact(p.x, p.surfaceY, f.isBossLike ? 1 : 0.45);
    this.director.onStomp(f, p);
    // hero passives can stop a stomp (Bracers, the Lasso of Truth)
    if (this.heroes.stomp(f, p)) {
      this.tracker.emit('stomp', { foot: f, blocked: 'other' });
      return;
    }
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
    // Pizza Stone: the middle pizza's first stomp each wave
    if (!pierce && this.kit.stoneBlock(p)) {
      f.knock(700);
      blocked(false);
      return;
    }
    if (p.traps > 0 && !pierce) {
      p.setTraps(p.traps - 1);
      this.fx.quip(f.x, p.surfaceY - 120, 'SNAP!', '#ffd23f', 64);
      audio.sfx('sfx_crit');
      audio.sfx('sfx_shield', { volume: 0.6 });
      this.dealDamage(f, 100, { source: 'trap' });
      if (f.alive) f.stun(1.5);
      this.shake(150, 0.005);
      blocked(false);
      return;
    }
    if (p.flags.grandma && !pierce) {
      p.flags.grandma = false;
      this.fx.ring(p.x, p.surfaceY - 30, 0xffb070, 2, 0.45);
      this.fx.quip(f.x, p.surfaceY - 130, "GRANDMA'S GOT YOU!", '#ffb070', 40);
      audio.sfx('sfx_shield');
      f.knock(650);
      blocked(false);
      return;
    }
    if (p.shieldCharges > 0 && !pierce) {
      p.setShield(p.shieldCharges - 1);
      this.fx.ring(p.x, p.surfaceY - 30, 0xffe680, 2.2, 0.45);
      this.fx.quip(f.x, p.surfaceY - 130, 'BLOCKED!', '#ffe680', 48);
      audio.sfx('sfx_shield');
      f.knock(700);
      blocked(true);
      return;
    }
    if (!pierce && Math.random() < st.shrugChance) {
      this.fx.quip(f.x, p.surfaceY - 130, 'SHRUGGED IT OFF!', '#ffffff', 40);
      audio.sfx('sfx_boing', { volume: 0.7 });
      f.knock(500);
      blocked(false);
      return;
    }
    const big = f.isBossLike || f.type.stompDmg >= 2;
    // Sicilian's thick crust (enhanced 45%); an enhanced Stromboli blocks 15% too
    if (!pierce && ((p.perk === 'thick' && Math.random() < (p.enhanced ? 0.45 : 0.3)) || (p.perk === 'sturdyMulti' && p.enhanced && Math.random() < 0.15))) {
      this.fx.quip(f.x, p.surfaceY - 130, 'THICK CRUST!', '#e0a050', 40);
      audio.sfx('sfx_boing', { volume: 0.6, rate: 0.8 });
      f.knock(450);
      blocked(false);
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
    this.tracker.emit('stomp', { foot: f, blocked: null });
    this.applyStomp(p, f, dmg, big);
    heroFootStomp(this, f, p);
    // Pizza Bianca (enhanced: its neighbours too)
    // Inferno Calzone is fireproof
    const immune = p.perk === 'immuneEffects' || this.neighbours(p).some((q) => q.perk === 'immuneEffects' && q.enhanced);
    const fireproof = immune || p.perk === 'burnAbove';
    if (f.has('soggy') && !p.dead && !immune) {
      p.soggy = true;
      for (let i = 0; i < 4; i++) this.fx.sweatDrop(p.x + (Math.random() - 0.5) * 120, p.surfaceY - 20);
    }
    if (f.has('scorch') && !fireproof) {
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
      f.burnDps = Math.max(f.burnDps, (p.perk === 'burnStomper' ? (p.enhanced ? 15 : 10) : 0) + st.stompBurn);
      this.fx.quip(f.x, f.cy - 100, 'HOT HOT HOT!', '#ff8a3d', 38);
      audio.sfx('sfx_fire', { volume: 0.6 });
    }
    this.perkKit.afterStomp(f, p);
  }

  private applyStomp(p: Pizza, f: Foot | null, dmg: number, big: boolean): void {
    if (p.dead) return;
    // trade-off toppings: a foot's stomp can take an extra slice
    if (f && dmg > 0 && Math.random() < this.run.stats.stompExtra) {
      dmg += 1;
      this.fx.quip(p.x, p.surfaceY - 190, '+1 SLICE!', '#ff6b6b', 30);
    }
    // Nine Lives (Cat-Toe-Woman) saves a slice now and then
    if (f && dmg > 0) dmg = this.heroes.slices(p, dmg);
    if (dmg <= 0) return;
    // Pizza Party: the stomp is shared out with the neighbours
    const shares = f ? this.kit.share(p, dmg, this.neighbours(p)) : null;
    if (shares) {
      this.fx.splat(p.x + (f!.x - p.x) * 0.5, p.surfaceY, big);
      this.fx.quip(p.x, p.surfaceY - 200, 'PIZZA PARTY: SHARED!', '#ff7ad9', 30);
      for (const [q, n] of shares) if (n > 0) this.applyStomp(q, null, n, big && q === p);
      return;
    }
    const removed = p.takeSlices(dmg, f?.x ?? p.x);
    this.kit.noteLoss(p, removed.length);
    this.waveSlicesLost += removed.length;
    this.run.slicesLost += removed.length;
    this.heroes.stomped(f, removed.length);
    if (removed.length) this.tracker.emit('slices', { n: removed.length });
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
    // Mystic Shield (Doctor Strangeloaf): once a wave, a pizza is saved
    if (this.heroes.destroyed(p) && !p.dead) {
      this.recompute();
      return;
    }
    // Olympian Feast stays standing; Untouchable brings the first loss back; Volcano Calzone erupts
    const kit = this.perkKit.destroyed(p);
    if (kit === 'survive') {
      this.recompute();
      return;
    }
    this.heroT.lost++;
    this.tracker.emit('pizzaLost', {});
    this.fx.puff(p.x, p.surfaceY, 14);
    this.fx.splat(p.x, p.surfaceY, true);
    this.fx.quip(p.x, p.surfaceY - 160, `${p.type.name.toUpperCase()} IS TOAST!`, '#ff6a4d', 40, 0);
    audio.sfx('sfx_boing', { rate: 0.7 });
    p.setShield(0);
    p.setTraps(0);
    if (p === this.possessedPizza) this.possess(null);
    let rises = kit === 'rise';
    if (rises) ui.hud.toast(pizzaPortraitURL(p.type.id), 'UNTOUCHABLE', `${p.type.name} comes back in a moment`);
    else if (this.run.armed.includes('angel')) {
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
        p.revive(p.enhanced ? 5 : 3);
        this.fx.healBurst(p.x, p.surfaceY);
        this.fx.quip(p.x, p.surfaceY - 160, 'CARBONARA RISES!', '#fff6c0', 48);
        audio.sfx('sfx_heal');
        this.recompute();
      });
    } else ui.hud.toast(null, 'PERK LOST', `${p.type.name}: ${p.type.perkText}`);
    this.recompute();
    // Second Oven: once a run, losing the last pizza brings every pizza back on 3 slices
    if (!this.alivePizzas().length && !rises && this.kit.secondOven()) {
      rises = true;
      this.time.delayedCall(1100, () => {
        for (const q of this.pizzas) {
          q.revive(Math.min(3, q.maxSlices));
          this.fx.healBurst(q.x, q.surfaceY);
        }
        this.fx.quip(W / 2, 420, 'SECOND OVEN!', '#ff9f1c', 70, -3);
        this.flash(250, 255, 160, 60);
        audio.sfx('sfx_heal');
        audio.sfx('sfx_levelup', { volume: 0.7 });
        this.recompute();
      });
    }
    if (!this.alivePizzas().length && !rises) {
      this.time.delayedCall(1300, () => {
        if (!this.alivePizzas().length) this.gameOver();
      });
    }
  }

  // ——— Hero peels (src/game/heroMoves.ts) ———
  /** The slice of the scene the hero moves may use. */
  private heroHost(): HeroHost {
    return {
      scene: this,
      fx: this.fx,
      layers: { under: this.underLayer, pizzas: this.pizzaLayer, feet: this.feetLayer, fx: this.fxLayer, cursor: this.cursorLayer },
      peel: () => this.peel,
      peelPos: () => this.peelPos,
      peelScale: () => this.basePeelScale(),
      feet: () => this.feet,
      live: () => this.feet.filter((f) => f.hittable && !f.phased),
      pizzas: () => this.pizzas,
      now: () => this.nowT,
      stats: () => this.run.stats,
      wave: () => this.run.wave,
      heat: () => this.run.heat,
      location: () => this.currentLocation,
      backdrop: () => this.currentBackdrop,
      inWave: () => this.waveActive && !this.over && !this.inUpgrade,
      hurt: (f, x, o) => this.dealDamage(f, x * this.run.stats.damage, { source: o?.source ?? 'ability', knock: o?.knock ?? 120, x: f.cx, y: f.cy, quiet: o?.quiet }),
      kill: (f) => {
        f.wool = 0;
        this.killFoot(f, 'ability');
      },
      tips: (n, x, y) => this.giveTips(n, x, y),
      coins: () => this.run.coins,
      spend: (n) => {
        if (this.run.coins < n) return false;
        this.run.coins -= n;
        this.displayCoins = Math.min(this.displayCoins, this.run.coins);
        return true;
      },
      heal: (p, n) => this.healPizza(p, n),
      revive: (p, n) => {
        p.revive(n);
        this.fx.healBurst(p.x, p.surfaceY);
        this.recompute();
      },
      throwAt: (e, feet, color, onHit) =>
        this.throws.launch(
          e,
          feet,
          color,
          onHit ??
            ((f, x) => {
              if (x > 0) this.dealDamage(f, x * this.run.stats.damage, { source: 'ability', knock: e.knock ?? 120, x: f.cx, y: f.cy });
              for (const r of e.on ?? []) this.applyAbilityEffect(r, { foot: f, x: f.cx, y: f.cy }, color, 'burst');
            }),
        ),
      runFx: (fx, ctx, color) => this.runEffects(fx, ctx, color, 'burst'),
      meter: () => this.run.super,
      setMeter: (v) => (this.run.super = v),
      combo: () => this.run.combo,
      owned: () => this.run.owned,
      waveLeft: () => (this.plan ? Math.min(1, (this.plan.queue.length + this.feet.filter((f) => f.alive && !f.isBossLike).length) / Math.max(1, this.planSize)) : 1),
      holdCombo: (sec) => (this.run.comboTimer = Math.min(COMBO_BASE_WINDOW + this.run.stats.comboBonus, Math.max(this.run.comboTimer, 0) + sec)),
      swapAbility: (id) => this.swapAbility(id),
      recompute: () => this.recompute(),
      toast: (img, title, text) => ui.hud.toast(img, title, text),
      coinPos: () => ui.hud.coinTarget(),
      banner: (big, small) => ui.hud.banner(big, small, 'phase'),
      quip: (x, y, msg, color, size) => this.fx.quip(x, y, msg, color, size),
      shake: (ms, k) => this.shake(ms, k),
      flash: (ms, r, g, b) => this.flash(ms, r, g, b),
      rumble: (k, ms) => this.rumble(k, ms),
      peekWave: (n) => {
        const plan = { ...planWave(n, this.run.stats.luck, this.run.heat), n };
        this.heroT.plan = plan;
        return plan.queue.map((id) => FOOT_BY_ID[id]?.name ?? id);
      },
      peekShop: () => {
        if (isBossWave(this.run.wave)) return [];
        const tableFull = this.pizzas.length >= MAX_PIZZAS && !this.pizzas.some((p) => p.dead);
        // the same number of cards the shop itself will deal
        this.heroT.shop = this.run.rollChoices(cardCount(this.run, 3 + (save.meta.indecisive ? 1 : 0)), tableFull ? ['helping'] : []);
        return this.heroT.shop.map((u) => u.name);
      },
    };
  }

  /** What the goal trackers see of the run. */
  private runView(): RunView {
    return {
      wave: this.run.wave,
      firstWave: this.heroT.firstWave,
      heat: this.run.heat,
      location: this.currentLocation,
      backdrop: this.currentBackdrop,
      peel: this.peelId,
      pizzasAlive: this.alivePizzas().length,
      owned: this.run.owned,
      chainToppings: this.chainToppings,
      bosses: this.heroT.bosses,
      pizzasLost: this.heroT.lost,
      victory: false,
      combo: this.run.combo,
      allFull: this.pizzas.length > 0 && this.pizzas.every((p) => !p.dead && p.slices >= p.maxSlices),
      stale: this.alivePizzas().some((p) => p.freshOn && p.stale),
      freshOn: this.run.heatDef.freshness > 0,
    };
  }

  /** Shape-Shift (Martian Mozzarella): play as another peel for a while (null: back to the hero). */
  private swapAbility(id: string | null): void {
    this.ability = id ? abilityFor(id) : abilityFor(this.peelId);
    if (id) {
      addCanvas(this, 'peel_shift', peelCanvas(id));
      this.peel.setTexture('peel_shift');
    } else this.peel.setTexture('peel');
    // the worn look's live effect rests while another peel's look is borrowed
    this.lookFx?.setActive(!id);
    setSlamMode(this.ability);
    ui.hud.setSlamLabel(this.ability.name, abilityKindLabel(this.ability));
    this.abilityT = 0;
    this.recompute();
    // Act 9's home ground: off for a borrowed ability, back on when the god returns
    contentFx.abilityChanged(this);
    // a borrowed meter ability goes off straight away
    if (id && usesMeter(this.ability)) this.fireAbility();
  }

  /** Every frame: the hero kit, then the goal trackers (four times a second). */
  private heroUpdate(real: number): void {
    this.heroes.update(real);
    // tips earned (never spent) count towards Cat-Toe-Woman
    const dc = this.run.coins - this.heroT.coins;
    if (dc > 0 && !this.inUpgrade) this.tracker.tipsEarned(dc);
    this.heroT.coins = this.run.coins;
    this.heroT.tick += real;
    if (this.heroT.tick < 0.25 || !this.waveActive) return;
    this.heroT.tick = 0;
    this.tracker.emit('tick', { feet: this.feet, now: this.nowT });
    bestGoal('crustPeak', save.crusts);
    // a foot knocked all the way back up to the top of its dive
    for (const f of this.feet) {
      if (!f.alive || f.isBossLike) continue;
      if (f.state !== 'descend') f.brain.topped = 0;
      else if (!f.brain.topped && f.y <= 112) {
        f.brain.topped = 1;
        this.tracker.emit('knockedTop', { foot: f });
      }
    }
  }

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
      this.heroT.abilityUsed = true;
      this.tracker.emit('ability', {});
    }
    if (big && !a.custom) {
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
    } else if (big) {
      // hand-built moves stage their own moment
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
        } else if (!f.isBossLike) f.stun(this.run.enhancedPerks.has('slamStun') ? 2.5 : 1.5);
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
          this.dealDamage(f, e.x * st.damage, { source: 'ability', knock: e.knock ?? 120, x: f.cx, y: f.cy, auto: !fromAbility });
          // a passive ability's hits pick up Freeze Frame (chill) and Cajun Shrimp (sometimes stun)
          if (fromAbility && f.alive && this.ability && !usesMeter(this.ability)) {
            if (st.freezeSlam) {
              f.slowT = Math.max(f.slowT, 2);
              f.slowPct = Math.max(f.slowPct, 0.4);
            }
            if (st.slamStun && !f.isBossLike && Math.random() < (this.run.enhancedPerks.has('slamStun') ? 0.4 : 0.25)) f.stun(1);
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
      case 'throw':
        // Head Chef: one more prop with every throw
        this.throws.launch(e, this.kit.extraThrow(targets(e.at)), color, (f, x) => {
          if (x > 0) this.dealDamage(f, x * st.damage, { source: 'ability', knock: e.knock ?? 120, x: f.cx, y: f.cy });
          for (const r of e.on ?? []) this.applyAbilityEffect(r, { foot: f, x: f.cx, y: f.cy }, color, vfx, undefined, fromAbility);
        });
        break;
      case 'stat':
        break; // applied in recompute()
      case 'move':
        this.heroes.fire(e.id, ctx);
        break;
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
        } else if (st.slamStun && f.alive && !f.isBossLike) f.stun(this.run.enhancedPerks.has('slamStun') ? 2.5 : 1.5);
      }
      if (st.freezeSlam) audio.sfx('sfx_freeze');
      this.fx.quip(W / 2, 420, 'PEEL SLAM!', '#ffd23f', 90, -4);
    });
  }

  // ——— Passive weapons ———
  private peelScale(): number {
    return this.basePeelScale() * (this.heroes?.peelSize() ?? 1);
  }

  /** The peel's size from your smack reach (before a hero grows it). */
  private basePeelScale(): number {
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

  /** Marinara's garlic aura (6 dmg/s) and Tarte Flambée's heat over a hovering foot (3), half as much again when enhanced. */
  private auraDps(p: Pizza, hovering: boolean): number {
    const k = p.enhanced ? 1.5 : 1;
    return (p.perk === 'garlic' ? 6 * k : 0) + (p.perk === 'heatAbove' && hovering ? 3 * k : 0);
  }

  private syncGarlic(): void {
    for (const g of this.garlicAuras) g.destroy();
    this.garlicAuras = [];
    for (const p of this.alivePizzas()) {
      const dps = this.run.stats.garlicDps + this.auraDps(p, true);
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
      if (!f.isBossLike) f.hurry = (this.hurryT > 0 ? this.hurryMult : 1) * this.kit.footPace(f);
      const t = f.target;
      f.slowAbove = t && !t.dead && t.perk === 'slowAbove' ? (t.enhanced ? 0.38 : 0.25) : 0;
      if (tickGarlic && t && !t.dead && f.y > t.surfaceY - 300 && Math.abs(f.x - t.x) < t.radius * 1.1) {
        const dps = st.garlicDps + this.auraDps(t, f.state === 'hover');
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
      if (p.regenTimer >= (p.enhanced ? 13 : 20)) {
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
  private introCard(id: 'kinds' | 'swap' | 'freshness' | 'phases' | 'mini' | 'events' | 'golden', after?: () => void): void {
    if (save.seenIntros.includes(id) || (id === 'freshness' && this.run.heatDef.freshness <= 0)) {
      after?.();
      return;
    }
    save.seenIntros.push(id);
    persist();
    // in the shop nothing is running: the card just opens over it
    if (this.inUpgrade) {
      ui.intro(id, () => after?.());
      return;
    }
    this.fightCard((closed) => {
      const el = ui.intro(id, () => {
        after?.();
        closed();
      });
      return () => el.querySelector<HTMLButtonElement>('.row .btn')?.click();
    });
  }

  /** The card pausing the fight (an intro card or a phase card): Esc presses its OK. */
  private cardOk: (() => void) | null = null;
  /** Cards waiting for the one on screen to close (a mini-boss and the boss changing phase on the same smack). */
  private cardQueue: (() => void)[] = [];

  /** Pause the fight for a card, one at a time. `open` shows it, calls `closed` once it's dismissed (after its own
   *  follow-up, so a card that leads to another keeps the fight paused) and returns a function that presses its OK. */
  private fightCard(open: (closed: () => void) => () => void): void {
    if (this.cardOk) {
      this.cardQueue.push(() => this.fightCard(open));
      return;
    }
    this.paused = true;
    this.scene.pause();
    audio.duck(0.45);
    let done = false;
    this.cardOk = () => {};
    this.cardOk = open(() => {
      if (done) return;
      done = true;
      this.cardOk = null;
      const next = this.cardQueue.shift();
      if (next) {
        next();
        if (this.cardOk) return;
      }
      if (this.over) return;
      this.paused = false;
      this.scene.resume();
      audio.duck(1);
    });
  }

  /** The run is ending with a card up (the last pizza fell on the same frame a phase card opened): forget the card
   *  and its queue, and let the scene run again, so the game over plays out. */
  private dropCards(): void {
    if (!this.cardOk && !this.cardQueue.length) return;
    this.cardOk = null;
    this.cardQueue = [];
    this.paused = false;
    if (this.scene.isPaused()) this.scene.resume();
    audio.duck(1);
  }

  /** A boss reached a new phase (Arena). The first time a player meets it, a card pauses the fight to show what
   *  to hit, then a short banner; after that (or with phase cards off), the explained banner. */
  phaseBanner(f: Foot, name: string, info: string): void {
    if (!this.phaseCard(f, () => f.alive && this.banner(`PHASE ${f.phase}`, name, 'phase'))) this.banner(`PHASE ${f.phase}`, name, 'phase', info);
  }

  /** Show this boss phase's card if the player hasn't seen it (and hasn't turned the cards off). `after` runs once
   *  it's closed. False (and `after` doesn't run) when there's no card to show. */
  private phaseCard(f: Foot, after: () => void): boolean {
    if (!phaseCardsOn() || this.over || !f.alive || (f !== this.bossFoot && f !== this.miniFoot)) return false;
    const id = f.type.id;
    const phase = f.phase;
    const key = phaseSeenKey(id, phase);
    if (save.seenIntros.includes(key)) return false;
    const card = phaseCardFor(id, phase, this.director.phaseCount(f), this.run.heat);
    if (!card) return false;
    this.fightCard((closed) => {
      // (a card waiting in line for a boss that has gone since: skip it, still unseen)
      if (!f.alive || this.over) {
        queueMicrotask(closed);
        return () => {};
      }
      if (!save.seenIntros.includes(key)) save.seenIntros.push(key);
      persist();
      const c = ui.phaseCard(card, (off) => {
        if (off && phaseCardsOn()) {
          save.seenIntros.push(PHASE_CARDS_OFF);
          persist();
        }
        after();
        closed();
      });
      return c.ok;
    });
    return true;
  }

  // ——— Frame ———
  update(_time: number, deltaMs: number): void {
    // dev: the hitbox overlay draws every live target's hit area and recent smacks
    if (smackLog.overlay && !this.hitboxes) this.hitboxes = new HitboxOverlay(this);
    this.hitboxes?.draw(this.clickables);
    this.sweepClickables(Math.min(0.05, deltaMs / 1000));
    this.frameNo++;
    const real = Math.min(0.05, deltaMs / 1000);
    this.nowT += real;
    this.backdrop.update(real);
    contentFx.tick(this, real);
    pad.poll(real);
    ui.hud.setFps(this.game.loop.actualFps);
    // the run clock: real time (not slow-mo), and the scene doesn't update while paused or with the tab hidden
    if (!this.over && !this.timerStopped) {
      // kept in whole microseconds (the frame's timestamp has sub-millisecond precision), shown to the millisecond
      this.run.elapsedUs += Math.round(Math.min(250, deltaMs) * 1000);
      this.run.elapsed = this.run.elapsedUs / 1e6;
      ui.hud.setTime(this.run.elapsed);
    }
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
    // Speed Force (The Flashfoot) slows the world, not the peel
    if (!this.paused && !this.inUpgrade) scale = Math.min(scale, this.heroes.worldScale());
    const dt = real * scale;
    if (!this.paused && !this.over) this.heroUpdate(real);
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
    this.lookFx?.tick(real);
    this.peelTrailTick();
    if (!this.paused && !this.over && !this.inUpgrade) {
      this.spawnTick(dt);
      this.laneTick(dt);
      for (const p of this.pizzas) if (p.tickFreeze(dt)) this.recompute();
      for (const f of this.feet) if (f.alive) f.update(dt, 1);
      this.director.update(dt);
      this.feet = this.feet.filter((f) => f.state !== 'gone');
      this.feetLayer.sort('y');
      this.passives(dt);
      this.perkKit.update(dt);
      this.abilityTick(dt);
      this.procTick(dt);
      this.throws.update(dt);
      if (this.waveActive) this.kit.tick(dt, real);
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
    // (and while a boss prop is down there, e.g. a grabbing hand or a dino)
    {
      const cr = this.game.canvas.getBoundingClientRect();
      ui.hud.setBossFade(cr.left + (this.peelPos.x / W) * cr.width, cr.top + (this.peelPos.y / H) * cr.height);
    }
    ui.hud.setNewFootFade(this.feet.some((f) => f.alive && f.x < 640 && f.y > 380) || this.clickables.some((c) => c.x < 700 && c.y > 380 && c.alive()));
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
    // a card pausing the fight: Esc (or P) presses its OK; nothing else reaches the game
    if (this.cardOk) {
      // (Enter on a focused button already presses that button)
      const onBtn = document.activeElement instanceof HTMLButtonElement && !!document.activeElement.closest('.screen');
      if (k === 'escape' || k === 'p' || (k === 'enter' && !onBtn)) {
        e.preventDefault();
        this.cardOk();
      }
      return;
    }
    if (k === 'escape' || k === 'p') {
      if (this.paused) this.resume();
      // in the shop, Esc opens the pause menu (unless something, like an intro card, is open over it)
      else if (!this.inUpgrade || ui.isTop(this.shop?.el ?? this.actEl)) this.togglePause();
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
    if (this.over || (this.paused && !force)) return;
    // the shop and ACT COMPLETE can pause too (⚙ button or Esc), but only from the screen itself
    const inShop = this.inUpgrade;
    if (inShop && !this.shop && !this.actEl) return;
    if (inShop && !ui.isTop(this.shop?.el ?? this.actEl)) return;
    this.paused = true;
    this.scene.pause();
    ui.setPlaying(false);
    audio.duck(0.45);
    // leaving keeps the run: from the shop exactly as it is, mid-wave from the shop before this wave
    // (nothing is saved until wave 1 or the act's first wave is cleared)
    const canLeave = inShop || !!save.run;
    const leaveNote = this.actEl && !this.shop
      ? 'Save & Menu keeps this run: Continue on the title screen brings you back here.'
      : inShop
      ? 'Save & Menu keeps this run: pick it up from this shop with Continue on the title screen.'
      : canLeave
        ? `Save & Menu keeps this run, but this wave starts over: Continue puts you back in the shop before wave ${this.run.wave}.`
        : 'Clear this wave to be able to save and leave. Quitting ends the run.';
    this.pauseEl = ui.pause({
      inShop,
      leaveNote,
      leave: canLeave ? () => this.leaveRun() : null,
      resume: () => this.resume(),
      toppings: () => ui.yourToppings(this.yourToppings(), this.run.wave),
      toppingCount: this.yourToppings().filter((y) => y.back === null).length,
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
      backLabel: this.actEl && !this.shop ? 'BACK' : undefined,
      act: actName(actOf(Math.max(1, this.run.wave))),
      wave: this.run.wave,
      score: this.run.score,
    });
  }

  private resume(): void {
    if (!this.paused) return;
    // close the pause menu (and settings) but never the shop under it
    ui.closeAll(this.inUpgrade ? (this.shop?.el ?? this.actEl) : null);
    this.pauseEl = null;
    this.paused = false;
    this.scene.resume();
    ui.setPlaying(!this.inUpgrade);
    audio.duck(this.inUpgrade ? 0.55 : 1);
  }

  /** Back to the title screen without ending the run: Continue there picks it up from its last shop. */
  private leaveRun(): void {
    // the shop, or ACT COMPLETE (its clock has kept running since it was saved)
    if (this.inUpgrade && (this.shop || this.actEl)) this.saveRun();
    this.dropCards();
    this.over = true;
    this.leaving = true;
    this.tracker.flush();
    this.waveActive = false;
    // the scene is still whole here, so the bosses tidy up properly: the Last Slice's smack and slam
    // overrides, pistons, statues, possession
    this.director.clear();
    this.throws.clear();
    this.kit.hide();
    this.inUpgrade = false;
    this.shop = null;
    ui.closeAll();
    ui.setPlaying(false);
    ui.hud.setBoss(null);
    ui.hud.tutorial(false);
    this.paused = false;
    this.scene.resume();
    audio.stop('music', 400);
    audio.duck(1);
    this.cameras.main.fadeOut(350, 18, 10, 6);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Menu'));
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

  /** The finale's ending has played this run (the victory screen follows it). */
  private endingShown = false;

  /** A price in a shop the Sole Proprietor bought out (doubled), or as it is. */
  private boughtOut(price: number): number {
    return this.shop?.boughtOut ? price * 2 : price;
  }

  /** The ACT COMPLETE (or endless victory) screen, while it's up: the pause menu works over it. */
  private actEl: HTMLElement | null = null;

  /** An act's last boss is down: celebrate, then keep going (to the boss shop) or bank the run. The clock keeps running, as in the shop. */
  private actComplete(n: number): void {
    if (this.over) return;
    this.inUpgrade = true;
    ui.setPlaying(false);
    audio.duck(0.55);
    audio.sting('music_act', 0.9);
    const r = this.run;
    const act = actOf(n);
    const from = r.actFrom ?? { wave: actStartWave(n), elapsed: 0, feet: 0, slices: 0 };
    const boss = FOOT_BY_ID[bossFor(n)];
    const next = actOf(n + 1);
    this.actEl = ui.actComplete({
      act,
      name: actName(act),
      acts: ACT_COUNT,
      loop: loopOf(n),
      kicker: boss ? `${titleCase(boss.name).toUpperCase()} DEFEATED` : 'ACT COMPLETE',
      time: fmtTime(r.elapsed - from.elapsed),
      feet: r.feetSmacked - from.feet,
      slices: r.slicesLost - from.slices,
      crusts: r.crustsEarned(this.figOnTable()),
      nextLabel: actLabel(next),
      keepGoing: () => {
        if (!this.actEl || this.paused) return;
        ui.close(this.actEl);
        this.actEl = null;
        this.openUpgrades(true);
      },
      bank: () => {
        if (!this.actEl || this.paused) return;
        this.actEl = null;
        this.gameOver(true, false, true);
      },
      pause: () => this.togglePause(),
    });
    this.saveRun();
  }

  /** The journey's end: the full victory. The clock stops; endless runs can keep going (the journey again, harder). */
  private victory(): void {
    if (this.over) return;
    this.inUpgrade = true;
    ui.setPlaying(false);
    const r = this.run;
    // the Sole Proprietor Unbound's fall plays the ending first (the first time through the journey)
    if (bossFor(r.wave) === 'soleunbound' && loopOf(r.wave) === 0 && !this.endingShown) {
      this.endingShown = true;
      this.timerStopped = true;
      playEnding(this, () => this.victory());
      return;
    }
    audio.stop('music', 600);
    this.time.delayedCall(300, () => audio.sting('music_victory', 1));
    this.timerStopped = true;
    const secs = r.elapsed;
    const finalBoss = FOOT_BY_ID[bossFor(r.wave)];
    const el = ui.victory({
      kicker: finalBoss ? `${titleCase(finalBoss.name).toUpperCase()} DEFEATED` : 'JOURNEY COMPLETE',
      acts: ACT_COUNT,
      score: r.score,
      time: fmtTime(secs),
      feet: r.feetSmacked,
      bosses: r.bossesBeaten.length,
      heat: r.heatDef.name,
      crusts: r.crustsEarned(this.figOnTable()),
      legend: this.endingShown,
      bank: () => {
        this.actEl = null;
        this.gameOver(true, true);
      },
      keepGoing: r.endless
        ? () => {
            // once only (a double click or pad press lands while the screen fades out)
            if (!this.actEl || this.paused) return;
            ui.close(el);
            this.actEl = null;
            this.timerStopped = false;
            this.openUpgrades(true, undefined, 'ENDLESS MODE · STOCK UP');
          }
        : null,
    });
    // endless: the run goes on, so it saves here and the pause menu works over the screen
    if (r.endless) {
      this.actEl = el;
      this.saveRun();
    }
  }

  /** Note the peels owned and every locked goal's progress as the run begins. */
  private beginRunGoals(): void {
    const r = this.run;
    r.startPeels = [...save.peels];
    r.goalStart = {};
    for (const d of PEELS) if (d.progress && !hasPeel(d.id)) r.goalStart[`peel:${d.id}`] = d.progress()[0];
    for (const m of MILESTONES) if (!save.milestones.includes(m.id)) r.goalStart[`ms:${m.id}`] = milestoneProgress(m.id)[0];
  }

  /** Everything this run unlocked or moved closer, for the "Unlocked this run" screen. */
  private runSummary(crusts: number, victory: boolean): RunSummary {
    const r = this.run;
    const start = new Set(r.startPeels ?? save.peels);
    const peels = save.peels.filter((id) => !start.has(id) && PEEL_BY_ID[id]).map((id) => ({ id, name: PEEL_BY_ID[id].name, shiny: !!PEEL_BY_ID[id].shiny, how: PEEL_BY_ID[id].how }));
    const goals: RunSummary['goals'] = [];
    for (const d of PEELS) {
      const was = r.goalStart[`peel:${d.id}`];
      if (was === undefined || !d.progress || hasPeel(d.id)) continue;
      const [have, need] = d.progress();
      if (have > was) goals.push({ kind: 'peel', id: d.id, name: d.name, have, need });
    }
    for (const m of MILESTONES) {
      const was = r.goalStart[`ms:${m.id}`];
      if (was === undefined || save.milestones.includes(m.id)) continue;
      const [have, need] = milestoneProgress(m.id);
      const pz = m.pizza ? PIZZA_BY_ID[m.pizza] : null;
      // milestones without a pizza prize (crusts only) have no portrait, so they're left out of GETTING CLOSER
      if (have > was && pz) goals.push({ kind: 'pizza', id: pz.id, name: `${pz.name}: ${m.name}`, have, need });
    }
    // closest to done first
    goals.sort((a, b) => b.have / b.need - a.have / a.need);
    return {
      victory,
      crusts,
      pizzas: r.newUnlocks.filter((id) => PIZZA_BY_ID[id]).map((id) => ({ id, name: PIZZA_BY_ID[id].name, why: r.unlockWhy[id] ?? 'Unlocked' })),
      peels,
      milestones: r.milestonesHit.map((id) => MILESTONES.find((m) => m.id === id)).filter((m): m is (typeof MILESTONES)[number] => !!m).map((m) => ({ name: m.name, pizza: m.pizza ? PIZZA_BY_ID[m.pizza]?.name : undefined })),
      goals: goals.slice(0, 6),
    };
  }

  private gameOver(quit = false, victory = false, banked = false): void {
    if (this.over) return;
    this.dropCards();
    this.actEl = null;
    this.over = true;
    this.waveActive = false;
    this.throws.clear();
    this.kit.hide();
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
    const canSecond = !quit && !victory && !banked && this.run.heat !== 'inferno' && save.crusts >= this.secondChanceCost();
    const finish = () => {
      // the run really ends here, not before the Second Chance choice (taking it keeps the hero going)
      this.tracker.emit('runEnd', { victory });
      this.heroes.shutdown();
      // bosses and events were banked as they happened; the score and waves pay out now
      const crusts = r.crustsEarned(this.figOnTable());
      // records are per heat, by wave (to 100); the retired wave-31 starts (dev only now) don't write any
      const best = save.best[r.heat] ?? { score: 0, wave: 0 };
      const newBest = !r.act2Start && r.score > best.score;
      if (!r.act2Start) save.best[r.heat] = { score: Math.max(best.score, r.score), wave: Math.max(best.wave, r.wave) };
      save.crusts += r.endCrusts(this.figOnTable());
      save.runs++;
      this.perkKit.runEnd(victory);
      if (r.score > save.bestScore) save.bestScore = r.score;
      if (r.wave > save.bestWave) save.bestWave = r.wave;
      // the wave you went out on counts as reached (as it always has), so milestones come after the bests
      this.checkMilestones();
      // peels earned on the last wave show on the summary
      checkPeelAchievements();
      save.tutorialDone = true;
      save.run = null;
      persist();
      return { crusts, newBest };
    };
    const secs = r.elapsed;
    this.time.delayedCall(quit ? 200 : 2000, () => {
      audio.duck(0.6);
      const restart = (data: GameStart) => {
        ui.closeAll();
        this.cameras.main.fadeOut(350, 18, 10, 6);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart(data));
      };
      const show = () => {
        const { crusts, newBest } = finish();
        // what this run unlocked comes first, then the run's stats
        ui.runSummary(this.runSummary(crusts, victory), () => stats(crusts, newBest));
      };
      const stats = (crusts: number, newBest: boolean) => {
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
          act: actName(actOf(Math.max(1, r.wave))),
          banked,
          secondChanceRun: r.secondChances > 0,
          time: fmtTime(secs),
          affordable: PIZZAS.filter((p) => p.route === 'pizzeria' && !save.unlockedPizzas.includes(p.id) && p.cost <= save.crusts)
            .sort((a, b) => a.cost - b.cost)
            .map((p) => p.id),
          next: nextLockedPizza(PIZZAS),
          victory,
          again: () => restart({ lineup: randomLineup(save.meta.table ? 4 : 3), heat: r.heat, endless: r.endless, endlessPlus: endlessPlus.on }),
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
