import Phaser from 'phaser';
import { BACKDROPS, type ArenaId, type BackdropId, type LocationId } from '../art/backdrops';
import { BASE_SLICES, COMBO_BASE_WINDOW, H, MAX_PIZZAS, PIZZA_Y, W } from '../config';
import { FOOT_BY_ID, OUCH, TRAIT_INFO, type FootType } from '../data/feet';
import { PIZZAS, PIZZA_BY_ID } from '../data/pizzas';
import { UPGRADES, UPGRADE_BY_ID } from '../data/upgrades';
import { footPortraitURL } from '../game/assets';
import { BackdropView } from '../game/BackdropView';
import { Foot } from '../game/Foot';
import { Fx } from '../game/Fx';
import { Pizza } from '../game/Pizza';
import { LOCATION_AMBIENCE, LOCATION_MUSIC, Run, backdropFor, bossMusic, isBossWave, locationFor, planWave, type WavePlan } from '../game/Run';
import { audio } from '../systems/audio';
import { markFootSeen, persist, save, updateSettings } from '../systems/save';
import { ui } from '../ui/ui';
import { randomLineup } from './MenuScene';

interface DamageOpts {
  source: 'smack' | 'chain' | 'cutter' | 'olive' | 'slam' | 'explode' | 'garlic' | 'burn' | 'trap';
  canCrit?: boolean;
  knock?: number;
  x?: number;
  y?: number;
  quiet?: boolean;
}

export class GameScene extends Phaser.Scene {
  private run!: Run;
  private pizzas: Pizza[] = [];
  private feet: Foot[] = [];
  private fx!: Fx;
  private backdrop!: BackdropView;
  private pizzaLayer!: Phaser.GameObjects.Container;
  private shadowLayer!: Phaser.GameObjects.Container;
  private feetLayer!: Phaser.GameObjects.Container;
  private fxLayer!: Phaser.GameObjects.Container;
  private cursorLayer!: Phaser.GameObjects.Container;
  private peel!: Phaser.GameObjects.Image;
  private cutters: Phaser.GameObjects.Image[] = [];
  private cutterAngle = 0;
  private cutterCd = new WeakMap<Foot, number>();
  private garlicAuras: Phaser.GameObjects.Image[] = [];
  private grade!: Phaser.GameObjects.Rectangle;

  private lineupIds: string[] = [];
  private plan: WavePlan | null = null;
  private spawnT = 0;
  private waveActive = false;
  private bossPending = false;
  private bossFoot: Foot | null = null;
  private bossSummonT = 0;
  private goldenSpawned = false;
  private waveSlicesLost = 0;
  private oliveT = 0;
  private garlicT = 0;
  private hitStop = 0;
  private slowMo = 0;
  private over = false;
  private paused = false;
  private inUpgrade = false;
  private pointer = { x: W / 2, y: H / 2, touch: false, lastMove: 0 };
  private displayCoins = 0;
  private freeRerollsLeft = 0;
  private healCost = 30;
  private reviveCost = 120;
  private now = 0;
  private currentBackdrop: BackdropId | null = null;
  private currentLocation: LocationId | null = null;
  private tutorial = false;
  private slamHinted = false;
  private keyHandler = (e: KeyboardEvent) => this.onKey(e);
  private visHandler = () => {
    if (document.hidden && this.waveActive && !this.paused && !this.over && !this.inUpgrade) this.togglePause(true);
  };

  constructor() {
    super('Game');
  }

  init(data: { lineup?: string[] }): void {
    this.lineupIds = data.lineup?.length ? data.lineup : randomLineup(3);
  }

  create(): void {
    this.resetState();
    const bg = this.add.container(0, 0);
    const ambient = this.add.container(0, 0);
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

    // pizzas
    const slices = BASE_SLICES + (save.meta.pies ?? 0);
    this.lineupIds.forEach((id) => this.addPizza(id, slices, false));
    this.layoutPizzas(false);

    // cursor peel
    this.peel = this.add.image(W / 2, H / 2, 'peel').setOrigin(0.5, 100 / 360).setScale(0.62).setAngle(-28).setAlpha(0.95);
    this.cursorLayer.add(this.peel);

    // meta perks at run start
    if (save.meta.headstart) {
      const rares = UPGRADES.filter((u) => u.rarity === 'rare');
      const u = Phaser.Utils.Array.GetRandom(rares);
      this.run.owned[u.id] = 1;
    }
    this.recompute();
    if (save.meta.preheat) this.run.super = 1;

    // input
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.movePointer(p));
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.movePointer(p);
      this.smack(p.worldX, p.worldY);
    });
    window.addEventListener('keydown', this.keyHandler);
    document.addEventListener('visibilitychange', this.visHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const p of this.pizzas) p.destroy();
      this.pizzas = [];
      window.removeEventListener('keydown', this.keyHandler);
      document.removeEventListener('visibilitychange', this.visHandler);
      ui.hud.setBoss(null);
      ui.hud.tutorial(false);
    });

    // HUD
    ui.closeAll();
    ui.showHud(true);
    ui.setPlaying(true);
    ui.hud.onPause = () => this.togglePause();
    ui.hud.onSlam = () => this.peelSlam();
    ui.hud.setOwned(this.run.owned);
    ui.hud.setCoins(0);
    ui.hud.setScore(0);
    ui.hud.setBoss(null);
    audio.duck(1);
    this.cameras.main.fadeIn(500, 18, 10, 6);
    this.tutorial = !save.tutorialDone;
    this.time.delayedCall(700, () => this.beginWave(1));
  }

  private resetState(): void {
    this.run = new Run();
    this.pizzas = [];
    this.feet = [];
    this.cutters = [];
    this.cutterCd = new WeakMap();
    this.garlicAuras = [];
    this.plan = null;
    this.waveActive = false;
    this.bossPending = false;
    this.bossFoot = null;
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
    this.tweens.timeScale = 1;
  }

  // ——— Pizzas ———
  private addPizza(id: string, slices: number, animate: boolean): Pizza {
    const type = PIZZA_BY_ID[id];
    const n = type.perk === 'slices' ? slices + 4 : slices;
    const p = new Pizza(this, this.pizzaLayer, type, W / 2, PIZZA_Y, 0.8, n);
    this.pizzas.push(p);
    if (animate) {
      p.root.setScale(0).setY(PIZZA_Y - 200);
      this.tweens.add({ targets: p.root, scale: 1, y: PIZZA_Y, duration: 700, ease: 'Bounce.Out' });
    }
    return p;
  }

  private layoutPizzas(animate = true): void {
    const n = this.pizzas.length;
    const spacing = Math.min(520, 1700 / n);
    const s = Math.min(0.82, (spacing / 496) * 0.92);
    this.pizzas.forEach((p, i) => p.layout(W / 2 + (i - (n - 1) / 2) * spacing, s, animate));
  }

  private alivePizzas(): Pizza[] {
    return this.pizzas.filter((p) => !p.dead);
  }

  private recompute(): void {
    this.run.recompute(this.alivePizzas().map((p) => p.type.perk));
    this.syncCutters();
    this.syncGarlic();
  }

  // ——— Waves ———
  private beginWave(n: number): void {
    if (this.over) return;
    this.run.wave = n;
    this.plan = planWave(n, this.run.stats.luck);
    this.spawnT = 1.2;
    this.goldenSpawned = false;
    this.waveSlicesLost = 0;
    this.freeRerollsLeft = this.run.stats.freeRerolls;
    const st = this.run.stats;
    for (const p of this.alivePizzas()) {
      p.setShield(st.shields + (p.type.perk === 'shield' ? 1 : 0));
      p.setTraps(st.traps);
    }
    this.run.super = Math.max(this.run.super, st.superStart);

    const bd = backdropFor(n);
    const loc = locationFor(n);
    const boss = isBossWave(n);
    const locChanged = this.currentLocation !== loc;
    if (bd !== this.currentBackdrop) {
      const fade = this.currentBackdrop ? 1600 : 0;
      this.backdrop.show(bd, fade);
      this.tintGrade(BACKDROPS[bd].light, fade);
      this.currentBackdrop = bd;
    }
    ui.hud.setWave(n, BACKDROPS[bd].name);
    if (boss) {
      const id = this.plan.boss as ArenaId;
      audio.music(this, bossMusic(id), 1500);
      audio.sfx('sfx_warning');
      if (save.settings.flashes) this.cameras.main.flash(400, 255, 40, 20);
      this.shake(600, 0.006);
      ui.hud.banner('BOSS INCOMING!', FOOT_BY_ID[id].name, 'boss');
      this.bossPending = true;
      this.time.delayedCall(2600, () => this.spawnBoss(id));
      this.waveActive = true;
    } else {
      if (locChanged) {
        this.currentLocation = loc;
        audio.music(this, LOCATION_MUSIC[loc], 1800);
        audio.ambience(this, LOCATION_AMBIENCE[loc], 2400);
        if (n > 1) {
          ui.hud.banner(BACKDROPS[loc].name, 'NEW LOCATION', 'loc');
          audio.sfx('sfx_levelup', { volume: 0.6 });
          this.time.delayedCall(2300, () => ui.hud.banner(`WAVE ${n}`, this.waveSubtitle(n)));
          this.time.delayedCall(2300, () => (this.waveActive = true));
          this.preloadNext(n);
          return;
        }
      }
      ui.hud.banner(`WAVE ${n}`, this.waveSubtitle(n));
      if (n === 1) audio.music(this, LOCATION_MUSIC[loc], 1200);
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
    const fresh = Object.values(FOOT_BY_ID).filter((f) => !f.boss && f.weight > 0 && f.minWave === n);
    if (fresh.length) return `New: ${fresh.map((f) => f.name).join(', ')}`;
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

  private spawnBoss(id: string): void {
    if (this.over) return;
    const target = Phaser.Utils.Array.GetRandom(this.alivePizzas());
    if (!target) {
      // e.g. a Pizza Angel revive is pending: try again shortly rather than skipping the boss
      this.time.delayedCall(500, () => this.spawnBoss(id));
      return;
    }
    this.bossPending = false;
    const f = this.spawnFoot(FOOT_BY_ID[id], target, false);
    this.bossFoot = f;
    this.bossSummonT = 4;
    this.shake(900, 0.01);
    audio.sfx('sfx_stomp');
    ui.hud.setBoss(FOOT_BY_ID[id].name, 1);
  }

  private spawnFoot(type: FootType, target: Pizza | null, allowElite = true, x?: number): Foot {
    const plan = this.plan!;
    const elite = allowElite && !type.boss && type.id !== 'golden' && Math.random() < plan.eliteChance;
    const hpMult = type.boss ? plan.hpMult * 0.75 : plan.hpMult;
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
        onTrait: (ft, trait) => {
          if (trait === 'switch') {
            this.fx.quip(ft.x, ft.cy - 120, 'SWITCH!', '#39ff88', 38);
            audio.sfx('sfx_whoosh', { volume: 0.6, rate: 1.3 });
          } else {
            this.fx.quip(ft.x, ft.cy - 120, 'WHOOPS!', '#ffe14d', 38);
            this.fx.puff(ft.x, ft.y, 6);
            audio.sfx('sfx_boing', { volume: 0.5, rate: 1.2 });
          }
        },
      },
    });
    f.target = target;
    this.feet.push(f);
    return f;
  }

  /** Lanes per pizza: two side-by-side when the table is roomy, one when it's crowded. */
  private lanesFor(p: Pizza): number[] {
    const spacing = this.pizzas.length > 1 ? Math.abs(this.pizzas[1].x - this.pizzas[0].x) : 600;
    if (spacing < 450) return [0];
    const off = Math.min(110, p.radius * 0.62);
    return [-off, off];
  }

  /** A free lane offset for this foot's dive, or null if its pizza is full (it waits above). */
  private laneFor(f: Foot): number | null {
    const p = f.target;
    if (!p || f.type.boss) return 0;
    const divers = this.feet.filter((o) => o !== f && o.alive && o.target === p && (o.state === 'descend' || o.state === 'stomp'));
    if (divers.some((o) => o.type.boss)) return null;
    const lanes = this.lanesFor(p);
    const free = lanes.filter((l) => !divers.some((o) => Math.abs(o.slot - l) < 1));
    if (!free.length) return null;
    // prefer the lane on the side the foot is already hovering
    return free.sort((a, b) => Math.abs(p.x + a - f.x) - Math.abs(p.x + b - f.x))[0];
  }

  private pickTarget(f: Foot): Pizza | null {
    const alive = this.alivePizzas();
    if (!alive.length) return null;
    // prefer pizzas fewer feet are already going for
    const load = (p: Pizza) =>
      this.feet.filter((o) => o !== f && o.alive && o.target === p).reduce((n, o) => n + (o.type.boss ? 3 : 1), 0);
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
        // babies arrive together
        let extra = 0;
        while (plan.queue[0] === id && extra < 2) {
          plan.queue.shift();
          extra++;
        }
        // spawn the whole group this frame (staggered in space, not time) so the wave-end check can't race them
        for (let i = 0; i <= extra; i++) {
          const baby = this.spawnFoot(type, this.pickTarget(null as unknown as Foot));
          baby.y -= i * 90;
        }
      } else {
        this.spawnFoot(type, this.pickTarget(null as unknown as Foot));
      }
      this.spawnT = plan.interval * (0.7 + Math.random() * 0.6) * (this.bossFoot ? 2.2 : 1);
    }
    // golden foot bonus
    const total = this.plan!.queue.length;
    if (plan.golden && !this.goldenSpawned && total < 6) {
      this.goldenSpawned = true;
      const t = this.pickTarget(null as unknown as Foot);
      if (t) {
        this.spawnFoot(FOOT_BY_ID.golden, t, false);
        audio.sfx('sfx_combo', { rate: 1.3 });
        this.fx.quip(t.x, 220, 'GOLDEN FOOT!', '#ffd23f', 50);
      }
    }
    // boss summons reinforcements
    if (this.bossFoot && this.bossFoot.alive) {
      this.bossSummonT -= dt;
      if (this.bossSummonT <= 0 && alive < plan.maxAlive + 1) {
        this.bossSummonT = 6.5;
        const minion = this.bossFoot.type.id === 'bigfoot' ? 'baby' : this.bossFoot.type.id === 'ironheel' ? 'robo' : this.bossFoot.type.id === 'clownking' ? 'clown' : this.bossFoot.type.id === 'trex' ? 'dino' : this.bossFoot.type.id === 'colossus' ? 'stompalot' : 'ghost';
        const t = this.pickTarget(null as unknown as Foot);
        if (t) this.spawnFoot(FOOT_BY_ID[minion], t, false);
      }
    }
  }

  private checkWaveEnd(): void {
    if (!this.waveActive || this.bossPending || !this.plan) return;
    if (this.plan.queue.length) return;
    if (this.aliveFeet().length) return;
    if (this.plan.golden && !this.goldenSpawned) return;
    this.waveClear();
  }

  private waveClear(): void {
    this.waveActive = false;
    const n = this.run.wave;
    const boss = isBossWave(n);
    if (this.tutorial) {
      this.tutorial = false;
      save.tutorialDone = true;
      ui.hud.tutorial(false);
    }
    this.run.combo = 0;
    const perfect = this.waveSlicesLost === 0;
    const bonus = Math.round((5 + n * 2 + this.run.stats.coinsPerWave) * (perfect ? 1.5 : 1));
    this.run.coins += bonus;
    if (perfect) this.addScore(500 * n, false);
    audio.sfx('sfx_levelup');
    ui.hud.banner(boss ? 'BOSS DEFEATED!' : perfect ? 'PERFECT!' : 'WAVE CLEAR!', `+${bonus} tips${perfect ? ' · no slices lost' : ''}`, 'clear');
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
    if (n > save.bestWave) save.bestWave = n;
    persist();
    this.time.delayedCall(boss ? 2400 : 1700, () => this.openUpgrades(boss));
  }

  private healPizza(p: Pizza, n: number): void {
    const healed = p.heal(n);
    if (healed) {
      this.fx.healBurst(p.x, p.surfaceY - 20);
      this.fx.number(p.x, p.surfaceY - 60, healed, 'heal');
      audio.sfx('sfx_heal', { throttle: 80 });
    }
  }

  // ——— Upgrades ———
  private openUpgrades(bossReward: boolean, reuse?: ReturnType<Run['rollChoices']>): void {
    if (this.over) return;
    this.inUpgrade = true;
    ui.setPlaying(false);
    audio.duck(0.55);
    this.displayCoins = this.run.coins;
    const count = 3 + (save.meta.indecisive ? 1 : 0);
    const tableFull = this.pizzas.length >= MAX_PIZZAS && !this.pizzas.some((p) => p.dead);
    const exclude = tableFull ? ['helping'] : [];
    const choices = reuse ?? (bossReward ? this.run.rollBossChoices(count, exclude) : this.run.rollChoices(count, exclude));
    const dead = this.pizzas.filter((p) => p.dead);
    const s = ui.upgrade({
      title: bossReward ? 'BOSS LOOT!' : `WAVE ${this.run.wave} CLEARED!`,
      sub: bossReward ? 'Pick an epic topping' : 'Pick a topping upgrade',
      choices,
      levels: this.run.owned,
      coins: this.run.coins,
      rerollCost: this.run.rerollCost,
      freeRerolls: this.freeRerollsLeft,
      healCost: this.healCost,
      canHeal: this.alivePizzas().some((p) => p.slices < p.maxSlices),
      reviveCost: this.reviveCost,
      canRevive: dead.length > 0,
      onPick: (id) => {
        ui.close(s);
        this.pickUpgrade(id);
      },
      onReroll: () => {
        if (this.freeRerollsLeft > 0) this.freeRerollsLeft--;
        else {
          this.run.coins -= this.run.rerollCost;
          this.run.rerollCost = Math.round(this.run.rerollCost * 1.5 + 5);
        }
        audio.sfx('sfx_boing', { volume: 0.6 });
        ui.close(s);
        this.openUpgrades(bossReward);
      },
      onHeal: () => {
        this.run.coins -= this.healCost;
        this.healCost = Math.round(this.healCost * 1.45 + 10);
        for (const p of this.alivePizzas()) this.healPizza(p, 2);
        ui.close(s);
        this.openUpgrades(bossReward, choices);
      },
      onRevive: () => {
        const p = this.pizzas.find((x) => x.dead);
        if (!p) return;
        this.run.coins -= this.reviveCost;
        this.reviveCost = Math.round(this.reviveCost * 1.8);
        p.revived = false;
        p.revive(Math.ceil(p.maxSlices / 2));
        this.fx.healBurst(p.x, p.surfaceY);
        audio.sfx('sfx_heal');
        this.recompute();
        ui.close(s);
        this.openUpgrades(bossReward, choices);
      },
    });
  }

  private pickUpgrade(id: string): void {
    const u = UPGRADE_BY_ID[id];
    this.run.owned[id] = (this.run.owned[id] ?? 0) + 1;
    audio.sfx('sfx_upgrade');
    if (u.onPick === 'healAll2') for (const p of this.alivePizzas()) this.healPizza(p, 2);
    if (u.onPick === 'extraPizza' && this.pizzas.length >= MAX_PIZZAS) {
      // table full: the new pizza takes the place of a destroyed one
      const dead = this.pizzas.find((p) => p.dead);
      if (dead) {
        this.pizzas.splice(this.pizzas.indexOf(dead), 1);
        dead.destroy();
      }
    }
    if (u.onPick === 'extraPizza' && this.pizzas.length < MAX_PIZZAS) {
      const have = new Set(this.pizzas.map((p) => p.type.id));
      const pool = save.unlockedPizzas.filter((x) => !have.has(x));
      const pick = Phaser.Utils.Array.GetRandom(pool.length ? pool : PIZZAS.map((p) => p.id));
      this.addPizza(pick, BASE_SLICES + (save.meta.pies ?? 0), true);
      this.layoutPizzas(true);
      ui.hud.toast(null, 'NEW PIZZA!', `${PIZZA_BY_ID[pick].name}: ${PIZZA_BY_ID[pick].perkText}`);
    }
    this.recompute();
    ui.hud.setOwned(this.run.owned);
    this.inUpgrade = false;
    ui.setPlaying(true);
    audio.duck(1);
    this.time.delayedCall(500, () => this.beginWave(this.run.wave + 1));
  }

  // ——— Combat ———
  private movePointer(p: Phaser.Input.Pointer): void {
    this.pointer.x = p.worldX;
    this.pointer.y = p.worldY;
    this.pointer.touch = p.wasTouch;
    this.pointer.lastMove = this.now;
  }

  private smack(x: number, y: number): void {
    if (this.over || this.paused || this.inUpgrade || ui.modalOpen) return;
    // swing the peel
    this.tweens.killTweensOf(this.peel);
    this.peel.setAngle(-62).setScale(this.peelScale() * 1.12);
    this.tweens.add({ targets: this.peel, angle: -28, scale: this.peelScale(), duration: 180, ease: 'Back.Out' });
    const r = this.run.stats.radius;
    const hits = this.feet
      .filter((f) => f.hittable)
      .map((f) => ({ f, d: f.distanceTo(x, y) }))
      .filter((o) => o.d <= r)
      .sort((a, b) => a.d - b.d);
    if (!hits.length) {
      if (this.run.combo >= 3) this.fx.quip(x, y - 30, 'MISS', '#ffb0a0', 32, 0);
      this.run.combo = 0;
      this.fx.puff(x, y, 4);
      audio.sfx('sfx_whoosh', { volume: 0.35, rate: 1.3, throttle: 60 });
      return;
    }
    if (this.tutorial) ui.hud.tutorial(false);
    // a basic smack hits the foot you clicked; Bigger Peel turns it into an area smack
    const targets = this.run.level('peel') > 0 ? hits : hits.slice(0, 1);
    for (const { f } of targets) {
      this.hitFoot(f, x, y);
      if (Math.random() < this.run.stats.doubleChance && f.alive) {
        this.time.delayedCall(90, () => f.alive && this.hitFoot(f, x + 12, y - 12));
      }
    }
  }

  private hitFoot(f: Foot, x: number, y: number): void {
    const st = this.run.stats;
    this.dealDamage(f, st.damage, { source: 'smack', canCrit: true, knock: st.knockback, x, y });
  }

  private dealDamage(f: Foot, amount: number, o: DamageOpts): void {
    if (!f.alive) return;
    const st = this.run.stats;
    const smack = o.source === 'smack';
    // defensive abilities that cancel a smack outright
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
    let dmg = amount;
    let crit = false;
    if (o.canCrit && f.has('tender')) {
      crit = true;
      dmg *= st.critMult;
    } else if (o.canCrit && Math.random() < st.critChance) {
      crit = true;
      dmg *= st.critMult;
    }
    let executed = false;
    if (smack && !f.type.boss && st.execute > 0 && f.hp / f.maxHp <= st.execute) {
      executed = true;
      f.wool = 0;
    }
    // armour is a smooth percentage reduction: 2 armour ≈ -17%, 5 ≈ -33%, 10 ≈ -50%
    const armourMult = o.source === 'burn' || o.source === 'garlic' ? 1 : 10 / (10 + Math.max(0, f.armor));
    let dealt = executed ? f.hp : dmg * armourMult;
    if (f.wool > 0) {
      const absorbed = Math.min(f.wool, dealt);
      f.wool -= absorbed;
      dealt -= absorbed;
      if (f.wool <= 0) this.fx.quip(f.x, f.cy - 110, 'WOOL GONE!', '#e9c46a', 38);
      else if (smack) this.fx.puff(o.x ?? f.cx, o.y ?? f.cy, 3);
    }
    f.hp -= dealt;
    if (smack && f.has('crack') && f.armor > 0) {
      f.armor--;
      this.fx.quip(f.x + 60, f.cy - 60, 'CRACK!', '#c7ccd4', 30);
    }
    if (f.has('enrage') && !f.enraged && f.hp > 0 && f.hp < f.maxHp * 0.5) {
      f.enraged = true;
      this.fx.quip(f.x, f.cy - 130, 'NOW I\'M ANGRY!', '#ff4d3d', 40);
      this.fx.puff(f.cx, f.cy - 60, 8);
    }
    f.hitOnce = true;
    const px = o.x ?? f.cx;
    const py = o.y ?? f.cy;
    if (!o.quiet) this.fx.number(px, py - 30, dealt, crit ? 'crit' : o.source === 'chain' ? 'zap' : o.source === 'burn' ? 'burn' : 'normal');

    if (o.source === 'smack') {
      f.flash(crit ? 0xffe066 : 0xffffff, crit ? 110 : 70);
      this.fx.impact(px, py, crit);
      this.fx.blush(f.root, (px - f.x) / f.root.scaleX, (py - f.y) / f.root.scaleY);
      if (crit) {
        audio.sfx('sfx_crit', { throttle: 40 });
        this.hitStop = 0.07;
        this.shake(120, 0.004);
      } else audio.slap(0.8);
      if (o.knock) f.knock(o.knock * (crit ? 1.4 : 1));
      // combo
      this.run.combo++;
      this.run.bestCombo = Math.max(this.run.bestCombo, this.run.combo);
      this.run.comboTimer = COMBO_BASE_WINDOW + st.comboBonus;
      if (this.run.combo % 10 === 0) {
        audio.sfx('sfx_combo', { rate: 1 + Math.min(0.6, this.run.combo / 100) });
        this.fx.quip(W / 2, 330, `${this.run.combo} COMBO!`, '#ffd23f', 56, 0);
      }
      this.run.super = Math.min(1, this.run.super + 0.018 * st.superGain);
      // statuses
      if (st.burnDps > 0 && !f.type.traits.includes('immuneBurn')) {
        f.burnT = 3;
        f.burnDps = Math.max(f.burnDps, st.burnDps);
        audio.sfx('sfx_fire', { volume: 0.4, throttle: 300 });
      }
      if (st.slowPct > 0 && !f.type.traits.includes('immuneSlow')) {
        f.slowT = 2;
        f.slowPct = st.slowPct;
        f.clearTint();
      }
      if (st.stunChance > 0 && Math.random() < st.stunChance && f.alive && !f.type.boss) {
        f.stun(1.2);
        this.fx.quip(f.x, f.cy - 100, 'TICKLED!', '#ffb3c7', 34);
      }
      if (st.chainChance > 0 && Math.random() < st.chainChance) this.chain(f, amount * st.chainDmg);
      if (f.hp > 0 && f.type.traits.includes('dodge') && Math.random() < 0.35) f.dodge();
    } else if (o.source === 'slam' || o.source === 'trap' || o.source === 'olive' || o.source === 'cutter') {
      f.flash(0xffffff, 60);
      if (o.knock) f.knock(o.knock);
    }
    if (f.hp <= 0) this.killFoot(f, o.source);
    else if (f === this.bossFoot) ui.hud.setBoss(f.type.name, f.hp / f.maxHp);
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

  private killFoot(f: Foot, source: DamageOpts['source']): void {
    if (!f.alive) return;
    if (f.type.traits.includes('revive') && !f.reviveUsed) {
      f.revive();
      this.fx.quip(f.x, f.cy - 120, 'NOT DEAD YET!', '#7dff9a', 40);
      audio.sfx('sfx_boing');
      return;
    }
    const st = this.run.stats;
    const boss = !!f.type.boss;
    this.run.feetSmacked++;
    save.totalFeet++;
    // golden touch
    const midas = !boss && f.type.id !== 'golden' && Math.random() < st.goldenTouch;
    // score + coins
    const scoreGain = f.type.score * (f.elite ? 2 : 1) * (midas ? 2 : 1);
    this.addScore(scoreGain, true);
    const coins = Math.max(1, Math.round(f.type.coins * st.coinMult * (f.elite ? 2 : 1) * (midas ? 5 : 1)));
    this.run.coins += coins;
    const flights = Math.min(coins, boss ? 12 : 6);
    this.fx.coinFlight(f.cx, f.cy, flights, ui.hud.coinTarget(), () => {
      this.displayCoins = Math.min(this.run.coins, this.displayCoins + coins / flights);
      audio.sfx('sfx_coin', { throttle: 40, jitter: 0.15 });
    });
    this.run.super = Math.min(1, this.run.super + 0.05 * st.superGain);
    // discovery
    if (markFootSeen(f.type.id)) {
      const ability = f.type.traits.map((t) => TRAIT_INFO[t]).join(' · ');
      ui.hud.toast(footPortraitURL(f.type.id), 'NEW IN THE PIZZAPEDIA', ability ? `${f.type.name}: ${ability}` : f.type.name);
    }
    // effects
    if (midas) {
      this.fx.quip(f.x, f.cy - 120, 'GOLDEN TOUCH!', '#ffd23f', 44);
      this.fx.party(f.cx, f.cy, 25);
    }
    if (f.type.id === 'golden') {
      this.fx.quip(f.x, f.cy - 120, 'JACKPOT!', '#ffd23f', 64);
      this.fx.party(f.cx, f.cy, 80);
      audio.sfx('sfx_levelup', { volume: 0.7 });
    } else if (Math.random() < (boss ? 1 : 0.45)) {
      this.fx.quip(f.x + (Math.random() - 0.5) * 60, f.cy - 110, Phaser.Utils.Array.GetRandom(OUCH), '#ffffff', boss ? 80 : 46);
      audio.sfx('sfx_ouch', { throttle: 250, rate: f.type.scale < 0.8 ? 1.5 : f.type.scale > 1.5 ? 0.7 : 1, jitter: 0.12 });
    }
    audio.sfx('sfx_whoosh', { volume: 0.7, throttle: 50 });
    if (st.explodeDmg > 0 && source !== 'explode') {
      this.time.delayedCall(60, () => this.explode(f.cx, f.cy, st.explodeDmg));
    }
    if (f.type.traits.includes('split')) {
      for (const dx of [-90, 90]) {
        const t = this.pickTarget(f);
        const baby = this.spawnFoot(FOOT_BY_ID.baby, t, false, f.x + dx);
        baby.y = Math.max(140, f.y - 100);
        baby.setState('hover');
      }
    }
    if (boss) this.bossDown(f);
    f.die(boss);
  }

  private explode(x: number, y: number, dmg: number): void {
    this.fx.explosion(x, y, 230);
    audio.sfx('sfx_explosion', { throttle: 80, volume: 0.7 });
    this.shake(160, 0.004);
    for (const o of this.feet) if (o.hittable && Math.hypot(o.cx - x, o.cy - y) < 260) this.dealDamage(o, dmg, { source: 'explode', knock: 200 });
  }

  private bossDown(f: Foot): void {
    this.bossFoot = null;
    ui.hud.setBoss(null);
    this.run.bossesBeaten.push(f.type.id);
    if (!save.bossesBeaten.includes(f.type.id)) save.bossesBeaten.push(f.type.id);
    this.slowMo = 1.4;
    if (save.settings.flashes) this.cameras.main.flash(300, 255, 240, 200);
    this.shake(900, 0.012);
    this.fx.party(f.cx, f.cy, 140);
    this.fx.explosion(f.cx, f.cy, 380);
    audio.sfx('sfx_explosion');
    audio.sfx('sfx_crit');
    // the rest of the boss's entourage flees
    for (const o of this.aliveFeet()) if (o !== f) this.time.delayedCall(400, () => o.alive && this.killFoot(o, 'slam'));
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
    // defences (Stiletto Sasha pierces straight through them)
    const pierce = f.has('pierce');
    if (pierce && (p.traps > 0 || p.shieldCharges > 0)) this.fx.quip(f.x, p.surfaceY - 150, 'PIERCED!', '#ff4d6d', 40);
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
    const big = !!f.type.boss || f.type.stompDmg >= 2;
    if (!pierce && p.type.perk === 'thick' && Math.random() < 0.3) {
      this.fx.quip(f.x, p.surfaceY - 130, 'THICK CRUST!', '#e0a050', 40);
      audio.sfx('sfx_boing', { volume: 0.6, rate: 0.8 });
      f.knock(450);
      return;
    }
    let dmg = f.type.stompDmg + (f.elite ? 1 : 0);
    dmg = Math.max(1, dmg);
    if (p.soggy) {
      dmg++;
      p.soggy = false;
      this.fx.quip(p.x, p.surfaceY - 150, 'SOGGY!', '#8fd3ff', 38);
    }
    this.applyStomp(p, f, dmg, big);
    if (f.has('soggy') && !p.dead) {
      p.soggy = true;
      for (let i = 0; i < 4; i++) this.fx.sweatDrop(p.x + (Math.random() - 0.5) * 120, p.surfaceY - 20);
    }
    if (f.has('scorch')) {
      this.time.delayedCall(2000, () => {
        if (p.dead || this.over) return;
        for (let i = 0; i < 6; i++) this.fx.burn(p.x + (Math.random() - 0.5) * 140, p.surfaceY);
        this.fx.quip(p.x, p.surfaceY - 150, 'SCORCHED!', '#ff8a3d', 40);
        audio.sfx('sfx_fire', { volume: 0.6 });
        const removed = p.takeSlices(1, p.x);
        this.waveSlicesLost += removed.length;
        this.run.slicesLost += removed.length;
        if (p.dead) this.pizzaDestroyed(p);
      });
    }
    if (f.type.boss) {
      // boss stomps rattle the whole table: every pizza flinches
      for (const q of this.alivePizzas()) if (q !== p) q.hurt();
    }
    if (f.type.traits.includes('wide')) {
      const idx = this.pizzas.indexOf(p);
      for (const j of [idx - 1, idx + 1]) {
        const q = this.pizzas[j];
        if (q && !q.dead) this.time.delayedCall(80, () => this.applyStomp(q, f, 1, false));
      }
    }
    // retaliation
    if (!f.type.traits.includes('immuneBurn') && (p.type.perk === 'burnStomper' || st.stompBurn > 0)) {
      f.burnT = 4;
      f.burnDps = Math.max(f.burnDps, (p.type.perk === 'burnStomper' ? 10 : 0) + st.stompBurn);
      this.fx.quip(f.x, f.cy - 100, 'HOT HOT HOT!', '#ff8a3d', 38);
      audio.sfx('sfx_fire', { volume: 0.6 });
    }
  }

  private applyStomp(p: Pizza, f: Foot, dmg: number, big: boolean): void {
    if (p.dead) return;
    const removed = p.takeSlices(dmg, f.x);
    this.waveSlicesLost += removed.length;
    this.run.slicesLost += removed.length;
    const y = p.surfaceY;
    this.fx.splat(p.x + (f.x - p.x) * 0.5, y, big);
    for (let i = 0; i < removed.length; i++) this.fx.slice(`slice_${p.type.id}`, p.x, y - 10, p.s * 0.9);
    audio.sfx('sfx_squish', { throttle: 60 });
    if (big) {
      audio.sfx('sfx_stomp', { throttle: 120 });
      this.shake(f.type.boss ? 420 : 220, f.type.boss ? 0.014 : 0.007);
    } else this.shake(140, 0.004);
    this.fx.number(p.x, y - 90, removed.length, 'normal');
    if (p.dead) this.pizzaDestroyed(p);
  }

  private pizzaDestroyed(p: Pizza): void {
    this.fx.puff(p.x, p.surfaceY, 14);
    this.fx.splat(p.x, p.surfaceY, true);
    this.fx.quip(p.x, p.surfaceY - 160, `${p.type.name.toUpperCase()} IS TOAST!`, '#ff6a4d', 40, 0);
    audio.sfx('sfx_boing', { rate: 0.7 });
    p.setShield(0);
    p.setTraps(0);
    if (this.run.stats.angel > 0 && !this.run.angelUsed) {
      this.run.angelUsed = true;
      this.time.delayedCall(1100, () => {
        p.revive(4);
        this.fx.healBurst(p.x, p.surfaceY);
        this.fx.quip(p.x, p.surfaceY - 160, 'PIZZA ANGEL!', '#ffffff', 52);
        audio.sfx('sfx_heal');
        this.recompute();
      });
    } else ui.hud.toast(null, 'PERK LOST', `${p.type.name}: ${p.type.perkText}`);
    this.recompute();
    if (!this.alivePizzas().length && !(this.run.stats.angel > 0 && this.run.angelUsed && p.revived === false && this.time.now < 0)) {
      // wait a beat in case an angel revive is pending
      this.time.delayedCall(1300, () => {
        if (!this.alivePizzas().length) this.gameOver();
      });
    }
  }

  // ——— Peel Slam ———
  private peelSlam(): void {
    if (this.run.super < 1 || !this.waveActive || this.over || this.paused || this.inUpgrade) return;
    this.run.super = 0;
    const st = this.run.stats;
    const big = this.add.image(-400, 560, 'peel').setScale(3.2).setAngle(-90).setOrigin(0.5, 100 / 360);
    this.fxLayer.add(big);
    audio.sfx('sfx_whoosh', { volume: 1, rate: 0.7 });
    this.tweens.add({ targets: big, x: W + 400, angle: -70, duration: 520, ease: 'Sine.InOut', onComplete: () => big.destroy() });
    this.time.delayedCall(230, () => {
      audio.sfx('sfx_crit');
      audio.sfx('sfx_explosion', { volume: 0.8 });
      this.shake(420, 0.012);
      if (save.settings.flashes) this.cameras.main.flash(180, 255, 230, 160);
      for (const f of this.aliveFeet()) {
        if (f.phased) continue;
        this.fx.impact(f.cx, f.cy, true);
        this.dealDamage(f, 60 + st.damage * 4, { source: 'slam', knock: 1100 });
        if (st.freezeSlam && f.alive) {
          f.stun(3, true);
          this.fx.frost(f.cx, f.cy);
        }
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
      const dps = this.run.stats.garlicDps + (p.type.perk === 'garlic' ? 6 : 0);
      if (dps <= 0) continue;
      const g = this.add.image(p.x, p.surfaceY - 120, 'glow').setTint(0xb8ff7a).setBlendMode(Phaser.BlendModes.ADD).setScale(2.2, 1.6).setAlpha(0.25);
      this.shadowLayer.add(g);
      this.garlicAuras.push(g);
    }
  }

  private passives(dt: number): void {
    const st = this.run.stats;
    // orbiting cutters
    if (this.cutters.length) {
      this.cutterAngle += dt * 4.2;
      this.cutters.forEach((c, i) => {
        const a = this.cutterAngle + (i / this.cutters.length) * Math.PI * 2;
        const cx = this.pointer.x + Math.cos(a) * 125;
        const cy = this.pointer.y + Math.sin(a) * 85;
        c.setPosition(cx, cy).setRotation(c.rotation + dt * 18);
        for (const f of this.feet) {
          if (!f.hittable || f.distanceTo(cx, cy) > 30) continue;
          const cd = this.cutterCd.get(f) ?? 0;
          if (cd > this.now) continue;
          this.cutterCd.set(f, this.now + 0.35);
          this.dealDamage(f, st.cutterDmg + st.damage * 0.4, { source: 'cutter', knock: 60, x: cx, y: cy });
          audio.sfx('sfx_slap_2', { volume: 0.35, rate: 1.6, throttle: 80 });
          this.fx.impact(cx, cy, false);
        }
      });
    }
    // olive launcher
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
    // garlic aura + pesto slow + stink
    this.garlicT += dt;
    const tickGarlic = this.garlicT >= 0.25;
    if (tickGarlic) this.garlicT = 0;
    const cheerers = this.feet.filter((c) => c.alive && c.has('cheer'));
    for (const c of cheerers) if (Math.random() < dt * 4) this.fx.party(c.cx, c.cy - 40, 2);
    for (const f of this.feet) {
      if (!f.alive) continue;
      f.cheer = cheerers.some((c) => c !== f && Math.abs(c.x - f.x) < 450) ? 0.2 : 0;
      const t = f.target;
      f.slowAbove = t && !t.dead && t.type.perk === 'slowAbove' ? 0.25 : 0;
      if (tickGarlic && t && !t.dead && f.y > t.surfaceY - 300 && Math.abs(f.x - t.x) < t.radius * 1.1) {
        const dps = st.garlicDps + (t.type.perk === 'garlic' ? 6 : 0);
        if (dps > 0 && !f.phased) this.dealDamage(f, dps * 0.25, { source: 'garlic', quiet: true });
      }
      // burn ticks
      if (f.burnT > 0 && f.alive) {
        f.burnAcc += f.burnDps * dt;
        if (Math.random() < dt * 14) this.fx.burn(f.cx, f.cy + 20);
        if (f.burnAcc >= 4) {
          const d = f.burnAcc;
          f.burnAcc = 0;
          this.dealDamage(f, d, { source: 'burn' });
        }
      }
      if (f.alive && f.type.traits.includes('stink') && t && !t.dead && (f.state === 'hover' || f.state === 'descend')) {
        f.stink += dt * 0.22;
        if (Math.random() < dt * 6) this.fx.stinkPuff(f.cx, f.cy + 40);
        if (f.stink >= 1) {
          f.stink = 0;
          this.fx.quip(t.x, t.surfaceY - 120, 'PEE-YEW!', '#b8e05a', 46);
          audio.sfx('sfx_squish', { rate: 0.7 });
          const removed = t.takeSlices(1, t.x);
          this.waveSlicesLost += removed.length;
          if (t.dead) this.pizzaDestroyed(t);
        }
      }
    }
    for (const g of this.garlicAuras) g.setAlpha(0.18 + Math.sin(this.now * 3) * 0.07);
    // veggie regrowth
    for (const p of this.alivePizzas()) {
      if (p.type.perk !== 'regen') continue;
      p.regenTimer += dt;
      if (p.regenTimer >= 20) {
        p.regenTimer = 0;
        this.healPizza(p, 1);
      }
    }
  }

  // ——— Frame ———
  update(_time: number, deltaMs: number): void {
    const real = Math.min(0.05, deltaMs / 1000);
    this.now += real;
    this.backdrop.update(real);
    ui.hud.setFps(this.game.loop.actualFps);
    let scale = 1;
    if (this.hitStop > 0) {
      this.hitStop -= real;
      scale = 0.06;
    }
    if (this.slowMo > 0) {
      this.slowMo -= real;
      scale = Math.min(scale, 0.3);
      this.tweens.timeScale = 0.4;
      if (this.slowMo <= 0) this.tweens.timeScale = 1;
    }
    const dt = real * scale;
    // cursor
    const touchIdle = this.pointer.touch && this.now - this.pointer.lastMove > 0.5;
    this.peel.setPosition(this.pointer.x, this.pointer.y).setVisible(!this.inUpgrade && !this.over && !touchIdle);
    if (!this.paused && !this.over && !this.inUpgrade) {
      this.spawnTick(dt);
      for (const f of this.feet) if (f.alive) f.update(dt, 1);
      this.feet = this.feet.filter((f) => f.state !== 'gone');
      // the lowest (most dangerous) foot always draws in front; bosses stay behind regular feet
      this.feetLayer.sort('y');
      this.passives(dt);
      // combo decay
      if (this.run.combo > 0) {
        this.run.comboTimer -= dt;
        if (this.run.comboTimer <= 0) this.run.combo = 0;
      }
      this.checkWaveEnd();
    }
    // pizzas react to the nearest threat
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
    // HUD
    const r = this.run;
    ui.hud.setScore(r.score);
    if (this.displayCoins > r.coins) this.displayCoins = r.coins;
    ui.hud.setCoins(this.inUpgrade ? r.coins : Math.round(this.displayCoins));
    ui.hud.setCombo(r.combo, r.comboMult(), r.comboTimer / (COMBO_BASE_WINDOW + r.stats.comboBonus));
    ui.hud.setSuper(r.super);
    if (r.super >= 1 && !this.slamHinted && this.waveActive) {
      this.slamHinted = true;
      ui.hud.toast(null, 'PEEL SLAM READY!', 'Press SPACE or tap the SLAM button to smack every foot at once');
      audio.sfx('sfx_combo', { rate: 1.4 });
    }
  }

  private shake(ms: number, intensity: number): void {
    if (!save.settings.screenShake) return;
    this.cameras.main.shake(ms, intensity);
  }

  // ——— Pause / game over ———
  private onKey(e: KeyboardEvent): void {
    const k = e.key.toLowerCase();
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
          this.paused = false;
          this.togglePause(true);
        });
      },
      quit: () => {
        ui.closeAll();
        this.scene.resume();
        this.paused = false;
        this.gameOver(true);
      },
      owned: this.run.owned,
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

  private gameOver(quit = false): void {
    if (this.over) return;
    this.over = true;
    this.waveActive = false;
    this.inUpgrade = false;
    this.run.combo = 0;
    ui.closeAll();
    ui.setPlaying(false);
    ui.hud.setBoss(null);
    ui.hud.tutorial(false);
    const r = this.run;
    if (!quit) {
      this.slowMo = 1.2;
      audio.stop('music', 600);
      audio.sfx('sfx_gameover');
      this.time.delayedCall(900, () => audio.sting('music_gameover', 0.9));
    } else audio.stop('music', 400);
    for (const f of this.aliveFeet()) this.time.delayedCall(Math.random() * 600, () => f.alive && f.escape());
    const crusts = r.crustsEarned();
    const newBest = r.score > save.bestScore;
    save.crusts += crusts;
    save.runs++;
    if (newBest) save.bestScore = r.score;
    if (r.wave > save.bestWave) save.bestWave = r.wave;
    save.tutorialDone = true;
    persist();
    const secs = Math.round((performance.now() - r.startTime) / 1000);
    this.time.delayedCall(quit ? 200 : 2000, () => {
      audio.duck(0.6);
      const restart = (lineup: string[]) => {
        ui.closeAll();
        this.cameras.main.fadeOut(350, 18, 10, 6);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart({ lineup }));
      };
      ui.gameOver({
        score: r.score,
        wave: r.wave,
        feet: r.feetSmacked,
        combo: r.bestCombo,
        bosses: r.bossesBeaten.length,
        crusts,
        newBest,
        time: `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`,
        again: () => restart(randomLineup(save.meta.table ? 4 : 3)),
        menu: () => {
          ui.closeAll();
          this.scene.start('Menu');
        },
        pizzeria: () => {
          ui.closeAll();
          ui.pizzeria(() => this.scene.start('Menu'));
        },
      });
    });
  }
}
