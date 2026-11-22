// In-play mechanics for the event, mixed and wildcard toppings (src/data/toppings{Events,Mixed2,Wild}.ts).
// The game scene owns one ToppingKit and calls its hooks from the moments that matter (wave start and end,
// smacks, misses, kills, stomps, boss phases); the kit keeps its own drawn things (the Pizza Drone, laces,
// cheese strings, dip pots, crumbs, the pizza stone, Sixth Sense glows) and its run state in run.kit.

import Phaser from 'phaser';
import { HOVER_Y, TABLE_Y } from '../config';
import { P, type Effect, type Vfx } from './abilities';
import { rollEvent, type EventId } from './events';
import type { Clickable } from './arena';
import type { Foot } from './Foot';
import type { Fx } from './Fx';
import type { Pizza } from './Pizza';
import { Projectiles } from './projectiles';
import { TIP_MULT_CAP, type Run } from './Run';
import type { Stats } from '../data/upgrades';
import { audio } from '../systems/audio';

const { hit, D, B, ST, TH } = P;

export interface KitHost {
  sc: Phaser.Scene;
  fx: Fx;
  fxLayer: Phaser.GameObjects.Container;
  underLayer: Phaser.GameObjects.Container;
  run(): Run;
  feet(): Foot[];
  alivePizzas(): Pizza[];
  peelPos(): { x: number; y: number };
  now(): number;
  inWave(): boolean;
  /** Feet in this wave's plan (Delivery Rush gives big waves longer). */
  planSize(): number;
  /** Damage in smacks (× your smack damage). */
  damage(f: Foot, smacks: number, o?: { knock?: number; quiet?: boolean; chain?: boolean }): void;
  /** A full smack on this foot (Fold Over, Echo Chamber). */
  hitFoot(f: Foot, x: number, y: number): void;
  effects(fx: Effect[], ctx: { foot?: Foot; x?: number; y?: number }, color: number, vfx: Vfx): void;
  /** Tips (heat's tip rate applied by the scene). */
  tips(n: number, x: number, y: number): void;
  heal(p: Pizza, n: number): void;
  /** Charge the meter (or bring a timed passive forward) by this fraction. */
  charge(frac: number): void;
  bankCrusts(n: number, x: number, y: number): void;
  addClickable(c: Clickable): void;
  recompute(): void;
  smackRadius(): number;
}

const INK = 0x2a1810;
/** Most Golden Crusts Shiny Hunter pays in a run. */
const SHINY_CRUST_CAP = 100;
/** The Pizza Drone's size on screen. */
const D_SCALE = 0.64;
const ticks = (l: number) => Math.max(0, l - 1);

export class ToppingKit {
  private drone: Phaser.GameObjects.Image | null = null;
  private rotor: Phaser.GameObjects.Image | null = null;
  private droneT = 0;
  private dronePos = { x: 0, y: 0 };
  private g: Phaser.GameObjects.Graphics;
  private laces: { a: Foot; b: Foot; t: number }[] = [];
  private laceT = 0;
  private webs: { a: Foot; b: Foot; t: number }[] = [];
  private glows = new Map<Foot, Phaser.GameObjects.Image>();
  private sensed = new WeakSet<Foot>();
  private rung = new WeakSet<Foot>();
  private crit = new WeakSet<Foot>();
  private landed = 0;
  /** True while a smack the kit made itself is landing (it doesn't count or echo). */
  private inner = false;
  private waveT0 = 0;
  private stoneLeft = 0;
  private stone: Phaser.GameObjects.Image | null = null;
  private stonePizza: Pizza | null = null;
  private napkinLost: Pizza[] = [];
  private shareAcc = new WeakMap<Pizza, number>();
  /** Events that came back this wave (Second Look): they don't come back again. */
  private retried = new Set<EventId>();
  // Dough Spinner
  private spin = { lastX: 0, lastY: 0, heading: NaN, acc: 0, still: 0, cool: 0 };

  constructor(private h: KitHost) {
    this.g = h.sc.add.graphics();
    h.fxLayer.add(this.g);
  }

  private get run(): Run {
    return this.h.run();
  }

  private lv(id: string): number {
    return this.run.level(id);
  }

  // ——— waves ———

  /** Wave start: shields, the pizza stone, timers. */
  waveStart(n: number): void {
    this.waveT0 = this.h.now();
    this.landed = 0;
    this.napkinLost = [];
    this.laces = [];
    this.webs = [];
    this.laceT = 0;
    // the pizza stone sits under the middle pizza
    this.stoneLeft = this.lv('pizzastone');
    this.placeStone();
    if (this.lv('midnightsnack') && n === 50) this.h.recompute();
  }

  /** Wave cleared (boss or not): refunds, rush tips and interest. Runs after the clear bonus is paid. */
  waveEnd(boss: boolean): void {
    const now = this.h.now();
    // Spare Napkin: the first slices lost this wave grow back
    const back = this.napkinLost.filter((p) => !p.dead);
    back.forEach((p, i) => this.h.sc.time.delayedCall(500 + i * 260, () => this.napkin(p)));
    this.napkinLost = [];
    // Delivery Rush: a quick wave pays (big waves get a little longer)
    const rush = this.lv('deliveryrush');
    if (rush && !boss) {
      const limit = 20 + Math.max(0, this.h.planSize() - 10);
      if (now - this.waveT0 < limit) {
        this.h.tips(30 * rush, 960, 360);
        this.h.fx.quip(960, 300, 'DELIVERY RUSH!', '#ffd23f', 50, 0);
      }
    }
    // Tip Interest: a share of the tips you're holding
    if (this.lv('tipinterest')) {
      const n = Math.min(40, Math.floor(this.run.coins * 0.05));
      if (n > 0) {
        this.run.coins += n;
        this.h.fx.quip(960, 250, `+${n} INTEREST`, '#ffd23f', 40, 0);
      }
    }
    this.hide();
  }

  /** Wave over (or the run): clear the laces and cheese, glows and stone, and park the drone. */
  hide(): void {
    this.laces = [];
    this.webs = [];
    this.g.clear();
    this.clearGlows();
    this.removeStone();
    this.drone?.setVisible(false);
    this.rotor?.setVisible(false);
  }

  /** Every frame while a wave is being fought. dt is game time, real is wall time. */
  tick(dt: number, real: number): void {
    const st = this.run.stats;
    this.droneTick(dt, real);
    this.spinTick(real);
    // Tied Laces
    const lace = this.lv('tiedlaces');
    if (lace) {
      this.laceT += dt;
      const every = 8 / (1 + 0.2 * ticks(lace));
      if (this.laceT >= every) {
        this.laceT = 0;
        this.tie();
      }
    }
    for (const l of this.laces) l.t -= dt;
    this.laces = this.laces.filter((l) => l.t > 0 && l.a.alive && l.b.alive);
    for (const w of this.webs) w.t -= dt;
    this.webs = this.webs.filter((w) => w.t > 0 && w.a.alive && w.b.alive);
    this.draw();
    // Sixth Sense: feet about to stomp glow red
    if (this.lv('sixthsense')) this.senseTick();
    // Doorbell: where each foot is about to arrive glows
    if (this.lv('doorbell')) for (const f of this.h.feet()) {
      if (f.state !== 'enter' || f.held || f.pinned || this.rung.has(f) || f.isBossLike) continue;
      this.rung.add(f);
      this.crit.add(f);
      this.bell(f.laneX ?? f.x, HOVER_Y - 40);
    }
    void st;
  }

  /** Cold Feet: regular feet move at half speed for the first 5 s of a wave. */
  footPace(f: Foot): number {
    return this.lv('coldfeet') && !f.isBossLike && this.h.now() - this.waveT0 < 5 ? 0.5 : 1;
  }

  /** Oven Mitts: nothing can stun, slow, freeze or snatch the peel. */
  peelGuard(): boolean {
    return this.lv('ovenmitts') > 0;
  }

  // ——— smacks ———

  /** A smack missed every foot. */
  onMiss(x: number, y: number): void {
    const l = this.lv('napkinninja');
    if (!l || Math.random() >= 0.2 + 0.1 * ticks(l)) return;
    const f = this.nearest(x, y, 900);
    if (!f) return;
    this.h.effects([TH('napkin', 'straight', 0, hit(), { on: [ST(0.5, hit())] })], { foot: f }, 0xfff4e0, 'burst');
    this.h.fx.quip(x, y - 60, 'NAPKIN!', '#fff4e0', 30);
  }

  /** A smack landed on f (combo already counted). */
  onSmackLanded(f: Foot, x: number, y: number): void {
    if (this.inner) return;
    this.landed++;
    const r = this.run;
    // Double Cheese: combo milestones regrow a slice
    const dc = this.lv('doublecheese');
    if (dc && r.combo > 0 && r.combo % (dc >= 2 ? 15 : 25) === 0) {
      const weakest = [...this.h.alivePizzas()].filter((p) => p.slices < p.maxSlices).sort((a, b) => a.slices / a.maxSlices - b.slices / b.maxSlices)[0];
      if (weakest) {
        this.h.heal(weakest, 1);
        this.h.fx.quip(weakest.x, weakest.surfaceY - 160, 'DOUBLE CHEESE!', '#ffd23f', 38);
      }
    }
    // Tied Laces: the other foot feels it
    for (const l of this.laces) {
      const other = l.a === f ? l.b : l.b === f ? l.a : null;
      if (other && other.alive) {
        this.h.damage(other, 0.5 + 0.25 * ticks(this.lv('tiedlaces')), { chain: true });
        other.flash(0xfff4e0, 70);
      }
    }
    // Fold Over: every 4th (3rd) smack hits twice
    const fo = this.lv('foldover');
    if (fo && this.landed % (fo >= 2 ? 3 : 4) === 0) this.later(90, () => f.alive && this.again(() => this.h.hitFoot(f, x + 10, y - 10), f, 'FOLD!'));
    // Wood-Fired: every 10th (7th) smack is a fireball
    const wf = this.lv('woodfired');
    if (wf && this.landed % (wf >= 2 ? 7 : 10) === 0 && f.alive) this.fireball(f);
    // Mozzarella Web
    const mw = this.lv('mozzweb');
    if (mw && Math.random() < 0.25 + 0.1 * ticks(mw)) this.web(f);
    // Echo Chamber: the same spot, half a second later
    const ec = this.lv('echochamber');
    if (ec && Math.random() < 0.2 + 0.1 * ticks(ec)) this.echo(x, y);
  }

  /** Doorbell: a foot's first smack after it arrives is a crit. */
  forceCrit(f: Foot): boolean {
    if (!this.crit.has(f)) return false;
    this.crit.delete(f);
    return true;
  }

  /** Damage multiplier on a foot (Sixth Sense). */
  dmgMult(f: Foot): number {
    return this.sensed.has(f) ? 1.25 : 1;
  }

  /** The Last Slice: one pizza left, so every smack hits the whole radius. */
  areaSmack(): boolean {
    return this.lv('lastslice') > 0 && this.h.alivePizzas().length === 1;
  }

  /** Head Chef: one more foot (or the same one again) for every throw. */
  extraThrow(picks: Foot[]): Foot[] {
    if (!this.lv('headchef') || !picks.length) return picks;
    const others = this.h.feet().filter((f) => Projectiles.ok(f) && !picks.includes(f));
    return [...picks, others.length ? Phaser.Utils.Array.GetRandom(others) : picks[0]];
  }

  /** After the run's stats are worked out: The Last Slice and Midnight Snack. */
  afterRecompute(s: Stats, alive: number): void {
    if (this.lv('lastslice') && alive === 1) s.damage *= 2;
    if (this.lv('midnightsnack') && this.run.wave >= 50) {
      s.damage *= 1.25;
      s.coinMult = Math.min(TIP_MULT_CAP, s.coinMult + 0.25);
    }
  }

  // ——— kills, stomps, pizzas ———

  onKill(f: Foot, rollDrop: (ev: EventId) => void): void {
    const st = this.run.stats;
    const x = f.cx;
    const y = f.cy;
    // Shiny Hunter: shinies pay crusts (up to SHINY_CRUST_CAP a run, so stacked shiny toppings can't flood the bank)
    const k = this.run.kit;
    const pay = Math.min(st.shinyCrusts, SHINY_CRUST_CAP - k.shinyCrusts);
    if (f.shiny && pay > 0) {
      k.shinyCrusts += pay;
      this.h.bankCrusts(pay, x, y);
      this.h.fx.quip(f.x, f.cy - 210, `+${pay} GOLDEN CRUSTS`, '#ffd23f', 40);
    }
    // Mimic Whisperer: an opened mimic beaten still rolls its drop
    if (f.type.id === 'mimic' && st.mimicDrop > 0) rollDrop('mimic');
    if (f.isBossLike) return;
    const dip = this.lv('garlicdip');
    if (dip && Math.random() < 0.06 + 0.03 * ticks(dip)) this.dropDip(x, y);
    const cc = this.lv('crustcrumbs');
    if (cc && Math.random() < 0.05 * cc) this.crumb(x, y);
  }

  /** Pizza Stone: the middle pizza's first stomp each wave is blocked. */
  stoneBlock(p: Pizza): boolean {
    if (this.stoneLeft <= 0 || p !== this.stonePizza) return false;
    this.stoneLeft--;
    this.h.fx.ring(p.x, p.surfaceY - 20, 0xb07a4a, 2.2, 0.4);
    this.h.fx.quip(p.x, p.surfaceY - 140, 'PIZZA STONE!', '#e0b080', 44);
    audio.sfx('sfx_shield');
    if (this.stone) this.h.sc.tweens.add({ targets: this.stone, scaleY: { from: this.stone.scaleY * 0.8, to: this.stone.scaleY }, duration: 200, ease: 'Back.Out' });
    if (this.stoneLeft <= 0) this.removeStone();
    return true;
  }

  /** Slices a stomp took (Spare Napkin remembers the first ones each wave). */
  noteLoss(p: Pizza, n: number): void {
    const l = this.lv('sparenapkin');
    for (let i = 0; i < n && this.napkinLost.length < l; i++) this.napkinLost.push(p);
  }

  /**
   * Pizza Party: a stomp is shared out, half on the stomped pizza and a quarter on each neighbour (three
   * quarters with one neighbour). Fractions carry over. Returns whole slices to take now, or null when off.
   */
  share(p: Pizza, dmg: number, nbrs: Pizza[]): [Pizza, number][] | null {
    if (!this.lv('pizzaparty') || !nbrs.length) return null;
    const parts: [Pizza, number][] = [[p, nbrs.length === 1 ? 0.75 : 0.5], ...nbrs.slice(0, 2).map((q): [Pizza, number] => [q, 0.25])];
    return parts.map(([q, k]) => {
      const acc = (this.shareAcc.get(q) ?? 0) + dmg * k;
      const whole = Math.floor(acc + 1e-6);
      this.shareAcc.set(q, acc - whole);
      return [q, whole];
    });
  }

  /** Second Oven: once per run, the last pizza's loss brings every pizza back. */
  secondOven(): boolean {
    if (!this.lv('secondoven') || this.run.kit.secondOvenUsed) return false;
    this.run.kit.secondOvenUsed = true;
    return true;
  }

  /** A boss changed phase (Party Popper). */
  onPhase(): void {
    if (!this.lv('partypopper')) return;
    for (let i = 0; i < 7; i++) this.h.fx.party(200 + i * 253, 160 + Math.random() * 120, 26);
    audio.sfx('sfx_pop');
    audio.sfx('sfx_combo', { rate: 1.3 });
    this.h.fx.quip(960, 470, 'PARTY POPPER!', '#ff7ad9', 60, -3);
    for (const f of this.h.feet()) if (f.alive && f.hittable) f.stun(f.isBossLike ? 0.5 : 1);
  }

  // ——— events ———

  /** This wave's events (0, 1 or 2), after the event toppings. sighting: the hero sighting chance, rolled first (one a wave at most).
   *  hurt: some pizza is missing slices; without that the delivery drone (a slice) isn't dealt. */
  rollEvents(rate: number, sighting = 0, hurt = true): EventId[] {
    const st = this.run.stats;
    const k = this.run.kit;
    this.retried.clear();
    if (st.noEvents) {
      k.retry = null;
      return [];
    }
    const out: EventId[] = [];
    if (k.retry && !(k.retry === 'drone' && !hurt)) {
      out.push(k.retry);
      this.retried.add(k.retry);
      k.retry = null;
    }
    const chance = st.eventAlways ? 1 : Math.min(1, rate * Math.max(0, st.eventMult));
    // Grand Parade's events are certain, but toppings that cut the event chance (Earplugs) cut the parade:
    // each −50% is one event fewer
    const count = st.eventAlways ? Math.round(st.eventCount * Math.min(1, Math.max(0, st.eventMult))) : st.eventCount;
    for (let i = 0; i < count && out.length < 2; i++) {
      let e = rollEvent(chance, out.includes('sighting') ? 0 : sighting);
      if (!e) break;
      // Bird Feeder: chests mostly become flyers
      if ((e === 'chest' || e === 'mimic') && st.flyerBias && Math.random() < 0.6) e = Phaser.Utils.Array.GetRandom(['balloon', 'balloon', 'drone', 'drone', 'moth', 'seagull'] as EventId[]);
      // Skeleton Key: fewer mimics
      if (e === 'mimic' && Math.random() >= st.mimicMult) e = 'chest';
      // two events in a wave: never two chests (they'd land on the same spot)
      const box = (x: EventId) => x === 'chest' || x === 'mimic';
      if (box(e) && out.some(box)) e = Phaser.Utils.Array.GetRandom(['balloon', 'drone', 'moth', 'seagull'] as EventId[]);
      // the delivery drone brings a slice: only when a pizza is missing one (another flyer otherwise)
      if (e === 'drone' && !hurt) e = Phaser.Utils.Array.GetRandom(['balloon', 'balloon', 'balloon', 'moth', 'moth', 'seagull'] as EventId[]);
      out.push(e);
    }
    return out;
  }

  /** An event left without being dealt with (Second Look brings it back once). */
  eventMissed(id: EventId): void {
    if (!this.run.stats.eventRetry || this.retried.has(id) || this.run.kit.retry || !this.h.inWave()) return;
    this.run.kit.retry = id;
    this.h.fx.quip(960, 260, 'SECOND LOOK: IT’LL BE BACK', '#c9f0ff', 36, 0);
  }

  /** Event drop roll with the drop toppings (a smaller roll is a better one). */
  dropRoll(ev: EventId): () => number {
    const st = this.run.stats;
    const k = (1 + st.dropAdd) * st.dropMult * (ev === 'mimic' && st.mimicDrop > 0 ? st.mimicDrop : 1);
    return () => Math.random() / k;
  }

  /** Shiny-foot chance with the shiny toppings (never above 1 in 30). */
  shinyChance(base: number): number {
    return Math.min(1 / 30, base * this.run.stats.shinyMult);
  }

  /** Rainbow Road: if no shiny has turned up by wave 17, the next regular foot is one. */
  forceShiny(): boolean {
    return this.lv('rainbowroad') > 0 && !this.run.kit.rainbowDone && this.run.wave >= 17 && this.run.wave < 20;
  }

  shinySpawned(): void {
    this.run.kit.rainbowDone = true;
  }

  // ——— Dough Spinner: swirl the peel to charge the meter ———
  private spinTick(real: number): void {
    const l = this.lv('doughspinner');
    if (!l || !this.h.inWave()) return;
    const s = this.spin;
    const p = this.h.peelPos();
    const dx = p.x - s.lastX;
    const dy = p.y - s.lastY;
    s.lastX = p.x;
    s.lastY = p.y;
    s.cool -= real;
    const speed = Math.hypot(dx, dy) / Math.max(real, 1e-3);
    if (speed < 260) {
      // too slow to count as swirling: the swirl winds down
      s.still += real;
      if (s.still > 0.35) {
        s.acc = 0;
        s.heading = NaN;
      }
      return;
    }
    s.still = 0;
    const hd = Math.atan2(dy, dx);
    if (!Number.isNaN(s.heading)) {
      let d = hd - s.heading;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      // a sharp turn (zig-zagging) isn't a circle
      if (Math.abs(d) > 1.4) d = 0;
      // turning the other way unwinds the swirl
      if (Math.sign(d) !== Math.sign(s.acc) && Math.abs(s.acc) > 0.3) s.acc *= 0.5;
      s.acc += d;
    }
    s.heading = hd;
    if (Math.abs(s.acc) >= Math.PI * 2 && s.cool <= 0) {
      s.acc = 0;
      s.cool = 0.3;
      this.h.charge(l >= 2 ? 0.09 : 0.06);
      this.h.fx.ring(p.x, p.y, 0xf6e6c4, 1.1, 1);
      this.h.fx.quip(p.x, p.y - 80, 'SPIN!', '#f6e6c4', 28);
      audio.sfx('sfx_whoosh', { volume: 0.4, rate: 1.5, throttle: 120 });
    }
  }

  // ——— Pizza Drone ———
  private droneTick(dt: number, real: number): void {
    const l = this.lv('pizzadrone');
    if (!l) {
      if (this.drone) {
        this.drone.destroy();
        this.rotor?.destroy();
        this.drone = this.rotor = null;
      }
      return;
    }
    const p = this.h.peelPos();
    if (!this.drone) {
      this.dronePos = { x: p.x - 120, y: p.y - 110 };
      this.drone = this.h.sc.add.image(this.dronePos.x, this.dronePos.y, 'tp_drone').setScale(D_SCALE);
      this.rotor = this.h.sc.add.image(this.dronePos.x, this.dronePos.y, 'tp_rotor').setScale(D_SCALE).setAlpha(0.85);
      this.h.fxLayer.add([this.drone, this.rotor]);
    }
    const on = this.h.inWave();
    this.drone.setVisible(on);
    this.rotor!.setVisible(on);
    if (!on) return;
    // it trails the peel up and to the left, bobbing, and leans into its flight
    const t = this.h.now();
    // beside the peel's head, kept on screen (the peel often works near the top)
    const tx = Phaser.Math.Clamp(p.x - 130, 70, 1850);
    const ty = Phaser.Math.Clamp(p.y - 70, 90, 900) + Math.sin(t * 3.1) * 10;
    const vx = (tx - this.dronePos.x) * Math.min(1, real * 4);
    this.dronePos.x += vx;
    this.dronePos.y += (ty - this.dronePos.y) * Math.min(1, real * 4);
    this.drone.setPosition(this.dronePos.x, this.dronePos.y).setRotation(Phaser.Math.Clamp(vx * 0.02, -0.35, 0.35));
    // the rotor blur flickers like it's spinning
    this.rotor!.setPosition(this.dronePos.x, this.dronePos.y - 75 * D_SCALE).setScale(D_SCALE * (0.7 + 0.3 * Math.abs(Math.sin(t * 40))), D_SCALE).setRotation(this.drone.rotation);
    this.droneT += dt;
    if (this.droneT < 2) return;
    const f = this.nearest(this.dronePos.x, this.dronePos.y, 800);
    if (!f) return;
    this.droneT = 0;
    this.h.fx.lightning(this.dronePos.x, this.dronePos.y + 45, f.cx, f.cy);
    this.h.fx.glint(this.dronePos.x, this.dronePos.y + 45, 3);
    audio.sfx('sfx_zap', { volume: 0.55, rate: 1.4, throttle: 80 });
    this.h.damage(f, 1.5 * (1 + 0.5 * ticks(l)), { knock: 60 });
    this.h.sc.tweens.add({ targets: this.drone, scale: { from: D_SCALE * 1.15, to: D_SCALE }, duration: 180, ease: 'Back.Out' });
  }

  // ——— drawn bits ———

  private draw(): void {
    const g = this.g;
    g.clear();
    // shoelaces: a white lace with red tips, sagging between two feet, a bow in the middle
    for (const l of this.laces) {
      const a = Math.min(1, l.t * 2);
      const mx = (l.a.cx + l.b.cx) / 2;
      const my = (l.a.cy + l.b.cy) / 2 + 60 + Math.sin(this.h.now() * 5) * 6;
      const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(l.a.cx, l.a.cy + 30), new Phaser.Math.Vector2(mx, my), new Phaser.Math.Vector2(l.b.cx, l.b.cy + 30));
      for (const [w, c] of [[26, INK], [15, 0xfff4e0]] as const) {
        g.lineStyle(w, c, a);
        curve.draw(g, 24);
      }
      // red aglets where the lace meets each foot
      for (const e of [l.a, l.b]) {
        g.fillStyle(INK, a).fillCircle(e.cx, e.cy + 30, 11);
        g.fillStyle(0xe5402a, a).fillCircle(e.cx, e.cy + 30, 7);
      }
      const mid = curve.getPoint(0.5);
      for (const s of [-1, 1]) {
        g.fillStyle(INK, a).fillEllipse(mid.x + s * 20, mid.y, 40, 26);
        g.fillStyle(0xfff4e0, a).fillEllipse(mid.x + s * 20, mid.y, 30, 17);
      }
      g.fillStyle(INK, a).fillCircle(mid.x, mid.y, 10);
      g.fillStyle(0xe5402a, a).fillCircle(mid.x, mid.y, 6);
    }
    // cheese strings: stretchy yellow strands that droop and thin out as they wear off
    for (const w of this.webs) {
      const a = Math.min(1, w.t * 1.5);
      for (let i = 0; i < 2; i++) {
        const sag = 40 + i * 26 + Math.sin(this.h.now() * 4 + i) * 8;
        const mx = (w.a.cx + w.b.cx) / 2;
        const my = (w.a.cy + w.b.cy) / 2 + sag;
        const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(w.a.cx, w.a.cy + i * 14), new Phaser.Math.Vector2(mx, my), new Phaser.Math.Vector2(w.b.cx, w.b.cy + i * 14));
        const th = 2 + 3 * Math.min(1, w.t / 3);
        for (const [lw, c] of [[th * 2 + 8, 0x8a5a10], [th * 2 + 3, 0xffc93a], [th, 0xfff0a0]] as const) {
          g.lineStyle(lw, c, a);
          curve.draw(g, 20);
        }
      }
    }
  }

  private tie(): void {
    const live = this.h.feet().filter((f) => Projectiles.ok(f) && !this.laces.some((l) => l.a === f || l.b === f));
    let best: [Foot, Foot] | null = null;
    let bd = 700;
    for (let i = 0; i < live.length; i++)
      for (let j = i + 1; j < live.length; j++) {
        const d = Math.hypot(live[i].cx - live[j].cx, live[i].cy - live[j].cy);
        if (d < bd) {
          bd = d;
          best = [live[i], live[j]];
        }
      }
    if (!best) return;
    this.laces.push({ a: best[0], b: best[1], t: 5 });
    this.h.fx.quip((best[0].cx + best[1].cx) / 2, Math.min(best[0].cy, best[1].cy) - 110, 'TIED!', '#fff4e0', 36);
    audio.sfx('sfx_tossrope', { volume: 0.6 });
  }

  private web(f: Foot): void {
    const near = this.h
      .feet()
      .filter((o) => o !== f && Projectiles.ok(o))
      .map((o) => ({ o, d: Math.hypot(o.cx - f.cx, o.cy - f.cy) }))
      .filter((x) => x.d < 600)
      .sort((a, b) => a.d - b.d)
      .slice(0, 2);
    if (!near.length) return;
    for (const { o } of near) {
      if (!o.has('immuneSlow')) {
        o.slowT = Math.max(o.slowT, 3);
        o.slowPct = Math.max(o.slowPct, 0.5);
      }
      this.webs.push({ a: f, b: o, t: 3 });
    }
    audio.sfx('sfx_hitsplat', { volume: 0.5, rate: 1.3, throttle: 120 });
    this.h.fx.quip(f.x, f.cy - 120, 'CHEESY!', '#ffd23f', 30);
  }

  private fireball(f: Foot): void {
    const p = this.h.peelPos();
    const ball = this.h.sc.add.image(p.x, p.y, 'glow').setTint(0xff7a2a).setBlendMode(Phaser.BlendModes.ADD).setScale(0.9);
    this.h.fxLayer.add(ball);
    this.h.sc.tweens.add({
      targets: ball,
      x: f.cx,
      y: f.cy,
      scale: 0.5,
      duration: 160,
      onComplete: () => {
        ball.destroy();
        if (!f.alive) return;
        this.h.fx.explosion(f.cx, f.cy, 130);
        this.h.fx.quip(f.x, f.cy - 140, 'WOOD-FIRED!', '#ff9f1c', 40);
        audio.sfx('sfx_fire', { volume: 0.8 });
        this.again(() => this.h.effects([D(4, hit()), B(1, 3, hit())], { foot: f }, 0xff7a2a, 'fire'), f);
      },
    });
  }

  private echo(x: number, y: number): void {
    this.later(500, () => {
      if (!this.h.inWave()) return;
      const ghost = this.h.sc.add.image(x, y, 'peel').setOrigin(0.5, 100 / 360).setScale(0.6).setAngle(-62).setAlpha(0.8).setTint(0x9fe8ff);
      this.h.fxLayer.add(ghost);
      this.h.sc.tweens.add({ targets: ghost, angle: -28, alpha: 0, scale: 0.7, duration: 520, ease: 'Quad.Out', onComplete: () => ghost.destroy() });
      this.h.fx.ring(x, y, 0x9fe8ff, 0.9, 1);
      const f = this.nearest(x, y, this.h.smackRadius() + 40);
      if (!f) return;
      this.h.fx.quip(x, y - 70, 'ECHO!', '#9fe8ff', 30);
      this.again(() => this.h.hitFoot(f, x, y), f);
    });
  }

  private bell(x: number, y: number): void {
    const glow = this.h.sc.add.image(x, y, 'glow').setTint(0xffe27a).setBlendMode(Phaser.BlendModes.ADD).setScale(1.6, 1).setAlpha(0);
    this.h.fxLayer.add(glow);
    this.h.sc.tweens.add({ targets: glow, alpha: 0.75, duration: 250, yoyo: true, hold: 500, onComplete: () => glow.destroy() });
    this.h.fx.ring(x, y + 30, 0xffe27a, 1.2, 0.4);
    audio.sfx('sfx_shortorder_bell', { volume: 0.25, rate: 1.4, throttle: 400 });
  }

  private senseTick(): void {
    for (const f of this.h.feet()) {
      const soon = f.alive && f.state === 'descend' && !f.phased && (f.stompY - f.y) / Math.max(f.vy, 180) < 1;
      let gl = this.glows.get(f);
      if (soon) {
        this.sensed.add(f);
        if (!gl) {
          gl = this.h.sc.add.image(f.cx, f.cy, 'glow').setTint(0xff2a2a).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
          this.h.fxLayer.add(gl);
          this.glows.set(f, gl);
          this.h.sc.tweens.add({ targets: gl, alpha: 0.95, duration: 120 });
          f.flash(0xff4040, 160);
        }
        const pulse = 1 + 0.12 * Math.sin(this.h.now() * 18);
        gl.setPosition(f.cx, f.cy).setScale(1.9 * f.scale * pulse, 2.3 * f.scale * pulse);
      } else {
        this.sensed.delete(f);
        if (gl) {
          gl.destroy();
          this.glows.delete(f);
        }
      }
    }
  }

  private clearGlows(): void {
    for (const g of this.glows.values()) g.destroy();
    this.glows.clear();
  }

  private placeStone(): void {
    this.removeStone();
    if (this.stoneLeft <= 0) return;
    const ps = [...this.h.alivePizzas()].sort((a, b) => a.x - b.x);
    const p = ps[Math.floor((ps.length - 1) / 2)];
    if (!p) return;
    this.stonePizza = p;
    this.stone = this.h.sc.add.image(p.x, p.surfaceY + 10, 'tp_stone').setScale(p.s * 1.15).setAlpha(0);
    this.h.underLayer.add(this.stone);
    this.h.sc.tweens.add({ targets: this.stone, alpha: 1, duration: 400 });
  }

  private removeStone(): void {
    if (this.stone) {
      const s = this.stone;
      this.h.sc.tweens.add({ targets: s, alpha: 0, duration: 300, onComplete: () => s.destroy() });
    }
    this.stone = null;
    this.stonePizza = null;
  }

  /** Spare Napkin: a napkin floats down onto the pizza and a slice grows back. */
  private napkin(p: Pizza): void {
    if (p.dead || !p.root.scene) return;
    const n = this.h.sc.add.image(p.x + 140, p.surfaceY - 260, 't_napkin').setScale(0.6).setAngle(-30);
    this.h.fxLayer.add(n);
    this.h.sc.tweens.add({
      targets: n,
      x: p.x,
      y: p.surfaceY - 40,
      angle: 12,
      duration: 520,
      ease: 'Sine.InOut',
      onComplete: () => {
        this.h.sc.tweens.add({ targets: n, alpha: 0, scale: 0.4, duration: 260, onComplete: () => n.destroy() });
        if (p.dead) return;
        this.h.heal(p, 1);
        this.h.fx.quip(p.x, p.surfaceY - 160, 'SPARE NAPKIN!', '#fff4e0', 36);
      },
    });
  }

  /** Garlic Dip: a dip pot drops to the table; smack it for tips before it goes. */
  private dropDip(x: number, y: number): void {
    const pot = this.h.sc.add.image(x, y, 'tp_dip').setScale(0.5);
    this.h.fxLayer.add(pot);
    const floor = TABLE_Y - 70;
    let done = false;
    this.h.sc.tweens.add({ targets: pot, y: floor, duration: 520, ease: 'Bounce.Out' });
    this.h.sc.tweens.add({ targets: pot, scale: { from: 0.3, to: 0.5 }, duration: 260, ease: 'Back.Out' });
    const wob = this.h.sc.tweens.add({ targets: pot, angle: { from: -6, to: 6 }, duration: 260, yoyo: true, repeat: -1, delay: 600 });
    const gone = () => {
      done = true;
      wob.stop();
    };
    this.h.addClickable({
      get x() {
        return pot.x;
      },
      get y() {
        return pot.y;
      },
      r: 70,
      priority: 1,
      alive: () => !done && this.h.inWave(),
      hit: () => {
        if (done) return;
        gone();
        this.h.fx.party(pot.x, pot.y - 20, 18);
        audio.sfx('sfx_pop', { volume: 0.7 });
        this.h.tips(5, pot.x, pot.y);
        this.h.sc.tweens.add({ targets: pot, y: pot.y - 160, alpha: 0, angle: 160, duration: 420, onComplete: () => pot.destroy() });
      },
    });
    this.later(6000, () => {
      if (done) return;
      gone();
      this.h.sc.tweens.add({ targets: pot, alpha: 0, duration: 300, onComplete: () => pot.destroy() });
    });
  }

  /** Crust Crumbs: a crumb pops off; ten make a Golden Crust. */
  private crumb(x: number, y: number): void {
    const k = this.run.kit;
    k.crumbs++;
    const c = this.h.sc.add.image(x, y, 'tp_crumb').setScale(0.75);
    this.h.fxLayer.add(c);
    this.h.sc.tweens.add({ targets: c, y: y - 150, angle: 200, duration: 700, ease: 'Quad.Out' });
    this.h.sc.tweens.add({ targets: c, alpha: 0, delay: 450, duration: 300, onComplete: () => c.destroy() });
    if (k.crumbs >= 10) {
      k.crumbs = 0;
      this.h.bankCrusts(1, x, y);
      this.h.fx.quip(x, y - 170, 'CRUMBS: +1 GOLDEN CRUST!', '#ffd23f', 40);
    } else this.h.fx.quip(x, y - 140, `CRUMB ${k.crumbs}/10`, '#e8b878', 28);
  }

  // ——— helpers ———

  private nearest(x: number, y: number, r: number): Foot | null {
    let best: Foot | null = null;
    let bd = r;
    for (const f of this.h.feet()) {
      if (!Projectiles.ok(f)) continue;
      const d = f.distanceTo(x, y);
      if (d < bd) {
        bd = d;
        best = f;
      }
    }
    return best;
  }

  /** Run a smack the kit makes itself, so it doesn't count towards (or set off) the kit's own triggers. */
  private again(fn: () => void, f: Foot, label?: string): void {
    if (!f.alive) return;
    this.inner = true;
    try {
      fn();
    } finally {
      this.inner = false;
    }
    if (label && f.alive) this.h.fx.quip(f.x + 40, f.cy - 120, label, '#ffe0a0', 28);
  }

  private later(ms: number, fn: () => void): void {
    this.h.sc.time.delayedCall(ms, fn);
  }

  /** End of the run or leaving: drop the drawn bits. */
  destroy(): void {
    this.clearGlows();
    this.drone?.destroy();
    this.rotor?.destroy();
    this.drone = this.rotor = null;
    this.g.destroy();
  }
}
