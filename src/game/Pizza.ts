// A pizza on a plate: slices as HP, footprint decals, shields/traps, and a nervous little face.

import Phaser from 'phaser';
import { PIZZA_CANVAS_H, PIZZA_CANVAS_W, PIZZA_R, PIZZA_SIZE, TILT, renderPizza, sideFor, type Footprint } from '../art/pizzaArt';
import { makeCanvas } from '../art/util';
import { SEASONS, enhancedText, type PizzaPerk, type PizzaType } from '../data/pizzas';
import { ensurePizzaArt, pizzaTops } from './assets';
import { borrowLine, borrowedPerk } from './pizzaPerks';

let uid = 0;

/** Told whenever slices grow back (heal, or a revive from dead), wherever it came from: hero goals count them. */
export const pizzaHooks: { healed?: (p: Pizza, n: number) => void; revived?: (p: Pizza, slices: number) => void } = {};

export class Pizza {
  readonly scene: Phaser.Scene;
  readonly type: PizzaType;
  readonly root: Phaser.GameObjects.Container;
  x: number;
  y: number;
  s: number; // display scale
  alive: boolean[];
  prints: Footprint[] = [];
  shieldCharges = 0;
  traps = 0;
  regenTimer = 0;
  /** Left damp by a Sweaty Sock: the next stomp removes an extra slice. */
  soggy = false;
  dead = false;
  revived = false;
  /** 0..1 how threatened the pizza currently feels (nearest foot proximity). */
  fear = 0;
  /** Waves of freshness left (0 = stale). */
  fresh = 10;
  maxFresh = 10;
  /** Freshness is off on Mild and for Pumpkin Spice. */
  freshOn = true;
  /** Per-pizza flags for perks and boss effects (season, rise used, possessed…). */
  flags: Record<string, number | boolean> = {};
  /** Seconds left with the perk switched off by a boss (sand, ink, icicles). */
  perkFrozenT = 0;
  private frost?: Phaser.GameObjects.Image;
  /** Snowflake badge with the seconds left on a perk freeze. */
  private frostBadge?: Phaser.GameObjects.Container;
  private frostText?: Phaser.GameObjects.Text;
  /** Resting table y; `y` moves with piston lifts. */
  baseY: number;
  private freshBar: Phaser.GameObjects.Graphics;
  /** Enhanced look: a gold rim with a warm glow, a star, and sparkles twinkling round the crust. */
  /** A Rare Find's finish: a coloured glow under it and sparkles drifting up off it. */
  private finishFx?: { glow: Phaser.GameObjects.Image; sparks: Phaser.GameObjects.Image[]; tweens: Phaser.Tweens.Tween[] };
  private gold?: { rim: Phaser.GameObjects.Graphics; glow: Phaser.GameObjects.Image; badge: Phaser.GameObjects.Image; sparks: Phaser.GameObjects.Image[]; tweens: Phaser.Tweens.Tween[] };

  private plate: Phaser.GameObjects.Image;
  private img: Phaser.GameObjects.Image;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private tex: Phaser.Textures.CanvasTexture;
  private texKey: string;
  private shield: Phaser.GameObjects.Image;
  /** The shield's shimmer (a band sweeping its dome) and its hits-left pips on the base ring. */
  private shieldSweep: Phaser.GameObjects.Image;
  private shieldPips: Phaser.GameObjects.Text;
  private shieldFlash = 0;
  private trapImg: Phaser.GameObjects.Image;
  private face: Phaser.GameObjects.Container;
  private eyes: Phaser.GameObjects.Image[] = [];
  private pupils: Phaser.GameObjects.Image[] = [];
  private squints: Phaser.GameObjects.Image[] = [];
  private mouth: Phaser.GameObjects.Image;
  private label: Phaser.GameObjects.Text;
  /** The perk line under the name (crossed out while the pizza is stale). */
  private perkLabel: Phaser.GameObjects.Text;
  private strike: Phaser.GameObjects.Graphics;
  private hurtTimer = 0;
  private blinkTimer = 2 + Math.random() * 3;
  private lookX = 0;
  private bob = Math.random() * 10;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer | Phaser.GameObjects.Container, type: PizzaType, x: number, y: number, s: number, slices: number) {
    this.scene = scene;
    this.type = type;
    // its top and slice sprite, drawn now if nothing warmed them first (src/game/assets.ts)
    ensurePizzaArt(type.id);
    this.x = x;
    this.y = y;
    this.s = s;
    this.alive = new Array(Math.max(1, slices)).fill(true);
    this.baseY = y;
    this.root = scene.add.container(x, y);
    layer.add(this.root);

    this.plate = scene.add.image(0, 0, 'plate');
    [this.canvas, this.ctx] = makeCanvas(PIZZA_CANVAS_W, PIZZA_CANVAS_H);
    const key = `pz_inst_${uid++}`;
    this.texKey = key;
    this.tex = scene.textures.addCanvas(key, this.canvas)!;
    this.img = scene.add.image(0, 0, key);
    // pizza centre in canvas space
    this.img.setOrigin((10 + PIZZA_SIZE / 2) / PIZZA_CANVAS_W, (6 + (PIZZA_SIZE / 2) * TILT) / PIZZA_CANVAS_H);
    this.trapImg = scene.add.image(-PIZZA_R * 0.95, 30, 'trap').setVisible(false).setScale(0.9);
    // the shield: a force-field dome over the pizza (standing on the plate), a shimmer sweeping it and a small
    // count of the stomps it still blocks on its rim
    this.shield = scene.add.image(0, -40, 'shield').setOrigin(0.5, 240 / 366).setVisible(false).setBlendMode(Phaser.BlendModes.ADD);
    this.shieldSweep = scene.add.image(0, -40, 'shieldSweep').setOrigin(0.5, 240 / 366).setVisible(false).setBlendMode(Phaser.BlendModes.ADD);
    this.shieldPips = scene.add
      .text(0, 0, '', { fontFamily: 'Lilita One, Fredoka, sans-serif', fontSize: '22px', color: '#e6fbff', stroke: '#0a3a52', strokeThickness: 5 })
      .setOrigin(0.5)
      .setVisible(false);

    this.face = scene.add.container(0, 0);
    for (const sx of [-1, 1]) {
      const e = scene.add.image(sx * 30, 0, 'eye');
      const p = scene.add.image(sx * 30, 2, 'pupil');
      const q = scene.add.image(sx * 30, 0, sx < 0 ? 'squintL' : 'squintR').setVisible(false);
      this.eyes.push(e);
      this.pupils.push(p);
      this.squints.push(q);
      this.face.add([e, p, q]);
    }
    this.mouth = scene.add.image(0, 34, 'mouthSmile');
    this.face.add(this.mouth);
    const labelStyle = {
      fontFamily: '"Fredoka", system-ui, sans-serif',
      fontStyle: '600',
      fontSize: '22px',
      color: '#fff6e2',
      stroke: '#2a1810',
      strokeThickness: 6,
      align: 'center',
    };
    this.label = scene.add.text(0, 0, type.name, labelStyle).setOrigin(0.5, 0).setAlpha(0.92);
    this.perkLabel = scene.add.text(0, 0, type.perkText, labelStyle).setOrigin(0.5, 0).setAlpha(0.92);
    this.strike = scene.add.graphics();
    this.freshBar = scene.add.graphics();
    this.root.add([this.plate, this.trapImg, this.img, this.face, this.shield, this.shieldSweep, this.shieldPips, this.label, this.perkLabel, this.strike, this.freshBar]);
    this.makeFinish();
    this.applyScale();
    this.redraw();
  }

  get slices(): number {
    return this.alive.filter(Boolean).length;
  }

  get maxSlices(): number {
    return this.alive.length;
  }

  /** World-space y of the pizza's top surface centre. */
  get surfaceY(): number {
    return this.y - sideFor(this.type.shape) * this.s;
  }

  get radius(): number {
    return PIZZA_R * this.s;
  }

  private applyScale(): void {
    const s = this.s;
    const lift = sideFor(this.type.shape) * s;
    this.plate.setScale(s);
    this.img.setScale(s).setY(-lift);
    this.face.setScale(Math.max(0.75, s * 1.15)).setY(-lift + PIZZA_R * TILT * s * 0.32);
    this.shield.setScale(s).setY(0);
    this.shieldSweep.setScale(s).setY(0);
    // (the count sits on the dome's rim, up and to the right, clear of the face)
    this.shieldPips.setScale(Math.max(0.8, s)).setPosition(222 * s * 0.72, -222 * 0.92 * s * 0.7);
    this.trapImg.setScale(s * 1.1).setPosition(-PIZZA_R * s * 1.02, 34 * s);
    this.label.setY((PIZZA_R + 40) * TILT * s + 14);
    this.fitLabel();
    this.drawFresh();
    this.drawGold();
    this.placeFinish();
  }

  private makeFinish(): void {
    const f = this.type.finish;
    if (!f?.glow) return;
    const sc = this.scene;
    const glow = sc.add.image(0, 0, 'glow').setTint(f.glow).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.45);
    this.root.addAt(glow, 1);
    const tweens = [sc.tweens.add({ targets: glow, alpha: { from: 0.3, to: 0.6 }, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.InOut' })];
    const sparks: Phaser.GameObjects.Image[] = [];
    if (f.sparkle) {
      for (let i = 0; i < 5; i++) {
        const sp = sc.add.image(0, 0, 'star').setTint(f.glow).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
        this.root.add(sp);
        sparks.push(sp);
        tweens.push(
          sc.tweens.add({
            targets: sp,
            alpha: { from: 0, to: 0.9 },
            scale: { from: 0.15, to: 0.6 },
            angle: { from: 0, to: 120 },
            duration: 700,
            yoyo: true,
            repeat: -1,
            repeatDelay: 600 + i * 230,
            delay: i * 340,
            onRepeat: () => this.placeSparkle(sp),
          }),
        );
        this.placeSparkle(sp);
      }
    }
    // Pizza Fantasma drifts gently, like a ghost should
    if (f.ghost) tweens.push(sc.tweens.add({ targets: this.img, alpha: { from: 0.75, to: 1 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.InOut' }));
    this.finishFx = { glow, sparks, tweens };
  }

  private placeFinish(): void {
    const fx = this.finishFx;
    if (!fx) return;
    const s = this.s;
    const cy = -sideFor(this.type.shape) * s;
    fx.glow.setPosition(0, cy).setScale((PIZZA_R * s * 3) / 256, (PIZZA_R * TILT * s * 3.8) / 256);
    for (const o of [fx.glow, ...fx.sparks]) o.setVisible(!this.dead);
  }

  /** A sparkle somewhere over the pizza's surface. */
  private placeSparkle(sp: Phaser.GameObjects.Image): void {
    const a = Math.random() * Math.PI * 2;
    const d = Math.sqrt(Math.random()) * 0.9;
    const cy = -sideFor(this.type.shape) * this.s;
    sp.setPosition(Math.cos(a) * PIZZA_R * this.s * d, cy + Math.sin(a) * PIZZA_R * TILT * this.s * d - 20 * this.s);
  }

  /** Enhanced (Golden Menu): its perk is stronger for the rest of the run. Kept in flags, so it's saved with the run. */
  get enhanced(): boolean {
    return !!this.flags.enhanced;
  }

  /** Gold rim, glow, star and sparkles for an enhanced pizza (made on first use). */
  private drawGold(): void {
    const on = this.enhanced && !this.dead;
    if (!on && !this.gold) return;
    if (!this.gold) {
      const sc = this.scene;
      const glow = sc.add.image(0, 0, 'glow').setTint(0xffc93a).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5);
      const rim = sc.add.graphics();
      const badge = sc.add.image(0, 0, 'star5');
      const sparks = Array.from({ length: 7 }, () => sc.add.image(0, 0, 'star').setTint(0xfff0a0).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0));
      // the glow sits under the pizza, the rim on its crust, the star and sparkles over it
      this.root.addAt(glow, 2);
      this.root.addAt(rim, this.root.getIndex(this.img) + 1);
      this.root.add([badge, ...sparks]);
      const tweens = sparks.map((sp, i) =>
        sc.tweens.add({
          targets: sp,
          alpha: { from: 0, to: 1 },
          scale: { from: 0.1, to: 0.8 },
          angle: { from: 0, to: 90 },
          duration: 520,
          yoyo: true,
          repeat: -1,
          repeatDelay: 380 + i * 170,
          delay: i * 260,
          onRepeat: () => this.placeSpark(sp),
        }),
      );
      sparks.forEach((sp) => this.placeSpark(sp));
      tweens.push(sc.tweens.add({ targets: glow, alpha: { from: 0.35, to: 0.6 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.InOut' }));
      this.gold = { rim, glow, badge, sparks, tweens };
    }
    const g = this.gold;
    for (const o of [g.rim, g.glow, g.badge, ...g.sparks]) o.setVisible(on);
    if (!on) return;
    const s = this.s;
    const cy = -sideFor(this.type.shape) * s;
    const rx = PIZZA_R * s * 1.01;
    const ry = PIZZA_R * TILT * s * 1.01;
    g.glow.setPosition(0, cy).setScale((rx * 2.9) / 256, (ry * 3.6) / 256);
    // a gold band round the crust: dark outline, gold, then a bright highlight on top
    g.rim.clear();
    g.rim.lineStyle(20 * s, 0x2a1810, 1).strokeEllipse(0, cy, rx * 2, ry * 2);
    g.rim.lineStyle(13 * s, 0xf2b316, 1).strokeEllipse(0, cy, rx * 2, ry * 2);
    g.rim.lineStyle(5 * s, 0xfff0a0, 1).strokeEllipse(0, cy - 3 * s, rx * 2 - 4 * s, ry * 2 - 4 * s);
    g.badge.setPosition(rx * 0.82, cy - ry * 0.95).setScale(Math.max(0.7, s * 1.25));
  }

  /** A sparkle somewhere on the gold rim. */
  private placeSpark(sp: Phaser.GameObjects.Image): void {
    const a = Math.random() * Math.PI * 2;
    const cy = -sideFor(this.type.shape) * this.s;
    sp.setPosition(Math.cos(a) * PIZZA_R * this.s * 1.01, cy + Math.sin(a) * PIZZA_R * TILT * this.s * 1.01);
  }

  /** Name and perk sit on two fixed lines and shrink to fit the plate's width instead of wrapping. */
  private fitLabel(): void {
    const s = this.s;
    const room = Math.min(420, Math.max(240, PIZZA_R * 2.3 * s));
    const want = Math.max(0.8, s * 1.1);
    this.label.setScale(1);
    this.perkLabel.setScale(1);
    const w = Math.max(this.label.width, this.perkLabel.width);
    const k = Math.min(want, room / Math.max(1, w));
    this.label.setScale(k);
    this.perkLabel.setScale(k).setY(this.label.y + (this.label.height - 10) * k);
    // stale: a line through the perk (it's switched off until the pizza is reheated)
    this.strike.clear();
    if ((this.stale || this.perkFrozen) && this.perkLabel.visible) {
      const pw = (this.perkLabel.width - 8) * k;
      const y = this.perkLabel.y + this.perkLabel.height * k * 0.52;
      this.strike.lineStyle(6 * k, 0x2a1810, 1).lineBetween(-pw / 2 - 4, y, pw / 2 + 4, y);
      this.strike.lineStyle(3 * k, 0xff8a6a, 1).lineBetween(-pw / 2 - 3, y, pw / 2 + 3, y);
    }
  }

  get perkFrozen(): boolean {
    return this.perkFrozenT > 0 && !this.dead;
  }

  /** Switch the perk off for `sec` (a second freeze adds to the time left, up to 15 s). */
  freezePerk(sec: number): void {
    // a pizza already taken off the table (swapped, or the scene torn down) has no badge left to write to: writing
    // to its destroyed text threw inside Phaser's update and froze the game
    if (!this.root.active) return;
    // a second freeze extends it, up to 15 s left
    this.perkFrozenT = Math.min(15, this.perkFrozenT > 0 ? this.perkFrozenT + sec : sec);
    if (!this.frost) {
      this.frost = this.scene.add.image(0, -10, 'glow').setTint(0x9ad8ff).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.55);
      this.root.add(this.frost);
    }
    this.frost.setScale((PIZZA_R * 2.4) / 256, (PIZZA_R * 1.1) / 256).setVisible(true);
    if (!this.frostBadge) {
      const disc = this.scene.add.circle(0, 0, 30, 0x1d4a6e, 0.95).setStrokeStyle(4, 0xd8f2ff);
      const flake = this.scene.add.text(0, -2, '❄', { fontFamily: 'Fredoka, sans-serif', fontSize: '34px', color: '#e8f8ff' }).setOrigin(0.5);
      this.frostText = this.scene.add.text(0, 44, '', { fontFamily: 'Lilita One, Fredoka, sans-serif', fontSize: '28px', color: '#e8f8ff', stroke: '#1d4a6e', strokeThickness: 6 }).setOrigin(0.5);
      this.frostBadge = this.scene.add.container(PIZZA_R * 0.95, -PIZZA_R * 0.55, [disc, flake, this.frostText]);
      this.root.add(this.frostBadge);
    }
    this.frostBadge.setVisible(true).setScale(0.3);
    this.scene.tweens.add({ targets: this.frostBadge, scale: 1, duration: 260, ease: 'Back.Out' });
    this.frostText?.setText(`${Math.ceil(this.perkFrozenT)}s`);
    this.redraw();
  }

  /** Count the freeze down (game time). Returns true the moment it ends. */
  tickFreeze(dt: number): boolean {
    if (this.perkFrozenT <= 0) return false;
    this.perkFrozenT -= dt;
    if (!this.root.active) return false;
    if (this.frost) this.frost.setAlpha(0.55 + Math.sin(this.bob * 4) * 0.2);
    this.frostText?.setText(`${Math.max(1, Math.ceil(this.perkFrozenT))}s`);
    if (this.perkFrozenT > 0) return false;
    this.perkFrozenT = 0;
    this.frost?.setVisible(false);
    this.frostBadge?.setVisible(false);
    this.redraw();
    return true;
  }

  get stale(): boolean {
    return this.freshOn && !this.dead && this.fresh <= 0;
  }

  /** The perk this pizza currently grants (stale pizzas grant none; Quattro Stagioni rotates). */
  get perk(): PizzaPerk | null {
    if (this.dead || this.stale || this.perkFrozen) return null;
    if (this.type.perk === 'rotate') return SEASONS[Number(this.flags.season ?? 0) % 4];
    // Arcobaleno and Mystery Meat grant the perk they've borrowed
    return borrowedPerk(this) ?? this.type.perk;
  }

  /** The perk's text. A stale pizza still shows it (crossed out), so you can see what reheating brings back. */
  get perkLine(): string {
    if (this.dead) return 'PERK LOST';
    if (this.type.perk === 'rotate') {
      const season = SEASONS[Number(this.flags.season ?? 0) % 4];
      return this.enhanced ? enhancedText(season) : ['+10% smack damage', '+20% tips from feet', 'Regrows a slice every 20s', 'Blocks the first stomp each wave'][Number(this.flags.season ?? 0) % 4];
    }
    const borrowed = borrowLine(this, this.enhanced);
    if (borrowed) return borrowed;
    return this.enhanced ? enhancedText(this.type.perk) : this.type.perkText;
  }

  /** What the perk would read enhanced (the enhance picker previews it). */
  get enhancedLine(): string {
    const borrowed = borrowLine(this, true);
    if (borrowed) return borrowed;
    return enhancedText(this.type.perk === 'rotate' ? SEASONS[Number(this.flags.season ?? 0) % 4] : this.type.perk);
  }

  /** The plain perk text (an enhanced pizza's card shows it struck through). */
  get basePerkLine(): string {
    if (this.dead) return 'PERK LOST';
    if (this.type.perk === 'rotate') return ['+10% smack damage', '+20% tips from feet', 'Regrows a slice every 20s', 'Blocks the first stomp each wave'][Number(this.flags.season ?? 0) % 4];
    return borrowLine(this, false) ?? this.type.perkText;
  }

  setFresh(n: number): void {
    this.fresh = Phaser.Math.Clamp(n, 0, Math.max(this.maxFresh, n));
    this.maxFresh = Math.max(this.maxFresh, this.fresh);
    this.redraw();
  }

  private drawFresh(): void {
    const g = this.freshBar;
    if (!g.active) return;
    g.clear();
    if (!this.freshOn || this.dead) return;
    const s = Math.max(0.8, this.s * 1.1);
    const w = 120 * s;
    const y = -sideFor(this.type.shape) * this.s - PIZZA_R * TILT * this.s - 22 * s;
    const f = Phaser.Math.Clamp(this.fresh / this.maxFresh, 0, 1);
    g.fillStyle(0x2a1810, 0.8).fillRoundedRect(-w / 2 - 3, y - 3, w + 6, 12 * s, 6 * s);
    if (f > 0) g.fillStyle(f <= 0.3 ? 0xe5402a : 0x6fd35a, 1).fillRoundedRect(-w / 2, y, Math.max(6, w * f), 6 * s, 3 * s);
  }

  /** Piston lift: positive dy raises the pizza (world px). */
  setLift(dy: number, ms = 350): void {
    const to = this.baseY - dy;
    this.scene.tweens.add({ targets: this, y: to, duration: ms, ease: 'Back.Out', onUpdate: () => (this.root.y = this.y) });
  }

  /** Slide along the table to a new x (rolling pizzas). */
  rollTo(x: number, ms = 700): void {
    this.x = x;
    this.scene.tweens.add({ targets: this.root, x, duration: ms, ease: 'Sine.InOut' });
  }

  layout(x: number, s: number, animate = true): void {
    this.x = x;
    this.s = s;
    if (animate) {
      this.scene.tweens.add({ targets: this.root, x, duration: 600, ease: 'Back.Out' });
    } else this.root.x = x;
    this.applyScale();
  }

  redraw(): void {
    if (!this.root.active) return;
    renderPizza(this.ctx, {
      type: this.type,
      top: pizzaTops[this.type.id],
      alive: this.alive,
      prints: this.prints,
      shield: false,
    });
    this.tex.refresh();
    this.face.setVisible(!this.dead);
    this.label.setText(this.type.name);
    this.perkLabel.setText(this.perkLine);
    const col = this.dead ? '#ff8a6a' : this.stale ? '#cfe0a8' : '#fff6e2';
    this.label.setColor(col).setAlpha(this.dead ? 0.75 : 0.92);
    // an enhanced perk reads in gold
    this.perkLabel.setColor(this.enhanced && !this.dead && !this.stale ? '#ffd23f' : col).setAlpha(this.dead ? 0.75 : this.stale ? 0.8 : this.enhanced ? 1 : 0.92);
    if (this.perkFrozen) this.img.setTint(0xb8e2ff);
    else if (this.stale) this.img.setTint(0xc8d4a0);
    else this.img.clearTint();
    this.fitLabel();
    this.drawFresh();
    this.drawGold();
    this.placeFinish();
  }

  /** Re-read the perk's line (perks whose text counts with the wave, like Tuna & Sweetcorn's), without a redraw. */
  refreshPerkLine(): void {
    if (!this.root.active || !this.perkLabel.visible) return;
    const line = this.perkLine;
    if (line === this.perkLabel.text) return;
    this.perkLabel.setText(line);
    this.fitLabel();
  }

  /** Hide the perk caption (the menu screen doesn't need it). */
  hideLabel(): this {
    this.label.setVisible(false);
    this.perkLabel.setVisible(false);
    this.strike.clear();
    return this;
  }

  /** Remove up to n slices. Returns the indices removed. */
  takeSlices(n: number, worldX: number): number[] {
    const removed: number[] = [];
    for (let k = 0; k < n; k++) {
      const idx = this.alive.map((a, i) => (a ? i : -1)).filter((i) => i >= 0);
      if (!idx.length) break;
      const pick = idx[Math.floor(Math.random() * idx.length)];
      this.alive[pick] = false;
      removed.push(pick);
    }
    // footprint decal in top-down pizza space
    const local = (worldX - this.x) / this.s;
    this.prints.push({
      x: PIZZA_SIZE / 2 + Phaser.Math.Clamp(local, -90, 90) + (Math.random() - 0.5) * 40,
      y: PIZZA_SIZE / 2 + (Math.random() - 0.5) * 80,
      rot: (Math.random() - 0.5) * 0.8,
      s: 0.8 + Math.random() * 0.4,
    });
    if (this.prints.length > 5) this.prints.shift();
    if (this.slices === 0) this.dead = true;
    this.hurtTimer = 0.9;
    this.redraw();
    this.scene.tweens.add({ targets: this.root, scaleY: { from: 0.86, to: 1 }, scaleX: { from: 1.08, to: 1 }, duration: 380, ease: 'Elastic.Out' });
    return removed;
  }

  heal(n: number): number {
    if (this.dead) return 0;
    let healed = 0;
    for (let i = 0; i < this.alive.length && healed < n; i++) {
      if (!this.alive[i]) {
        this.alive[i] = true;
        healed++;
      }
    }
    if (healed) {
      this.dead = false;
      if (this.slices >= this.maxSlices * 0.75) this.prints = this.prints.slice(-1);
      this.redraw();
      pizzaHooks.healed?.(this, healed);
    }
    return healed;
  }

  revive(slices: number): void {
    const wasDead = this.dead;
    this.revived = true;
    this.dead = false;
    this.prints = [];
    this.alive = this.alive.map((_, i) => i < slices);
    this.redraw();
    if (wasDead) pizzaHooks.revived?.(this, this.slices);
  }

  addSlices(n: number): void {
    for (let i = 0; i < n; i++) this.alive.push(true);
    this.redraw();
  }

  setShield(n: number): void {
    // a charge spent: the field flares (and flickers as it reforms, or bursts when the last one goes)
    if (n < this.shieldCharges) this.shieldFlash = 1;
    this.shieldCharges = n;
    const on = n > 0 && !this.dead;
    this.shield.setVisible(on);
    this.shieldSweep.setVisible(on);
    // the hits it still blocks: a small count on its rim (×2…), none for a single one
    this.shieldPips.setVisible(on && n > 1).setText(n > 1 ? `×${n}` : '');
  }

  setTraps(n: number): void {
    this.traps = n;
    this.trapImg.setVisible(n > 0 && !this.dead);
  }

  hurt(): void {
    this.hurtTimer = 0.8;
  }

  update(dt: number, threatX: number | null, threat: number): void {
    this.fear = threat;
    this.bob += dt;
    if (this.dead) return;
    // eyes track the most threatening foot
    const target = threatX === null ? Math.sin(this.bob * 0.6) * 0.4 : Phaser.Math.Clamp((threatX - this.x) / 200, -1, 1);
    this.lookX += (target - this.lookX) * Math.min(1, dt * 8);
    const scared = threat > 0.55;
    const eyeScale = 1 + threat * 0.35;
    this.blinkTimer -= dt;
    let blink = 1;
    if (this.blinkTimer < 0) {
      blink = Math.max(0.1, Math.abs(this.blinkTimer + 0.06) / 0.06);
      if (this.blinkTimer < -0.12) this.blinkTimer = 2 + Math.random() * 4;
    }
    this.hurtTimer -= dt;
    const hurt = this.hurtTimer > 0;
    for (let i = 0; i < 2; i++) {
      this.eyes[i].setScale(eyeScale, eyeScale * (hurt ? 0 : blink)).setVisible(!hurt);
      this.pupils[i]
        .setVisible(!hurt && blink > 0.5)
        .setPosition((i ? 30 : -30) + this.lookX * 7, (scared ? -6 : 2) - threat * 4)
        .setScale(scared ? 0.7 : 1);
      this.squints[i].setVisible(hurt);
    }
    this.mouth.setTexture(hurt ? 'mouthWobble' : scared ? 'mouthO' : 'mouthSmile');
    // nervous shiver
    const shake = scared ? Math.sin(this.bob * 60) * 1.5 * threat : 0;
    this.face.x = shake;
    if (this.shield.visible) {
      // the field breathes, and flickers back after a hit
      this.shieldFlash = Math.max(0, this.shieldFlash - 0.04);
      const flick = this.shieldFlash > 0 ? (Math.sin(this.bob * 90) > 0 ? 1 : 0.4) * this.shieldFlash : 0;
      this.shield.setAlpha(0.8 + Math.sin(this.bob * 3) * 0.12 + flick * 0.4);
      // the shimmer sweeps across the dome every couple of seconds
      const ph = (this.bob * 0.45) % 1;
      const w = PIZZA_R * this.s;
      this.shieldSweep.setX(-w + ph * 2 * w).setAlpha(Math.sin(ph * Math.PI) * 0.7);
    }
  }

  destroy(): void {
    this.gold?.tweens.forEach((t) => t.remove());
    this.finishFx?.tweens.forEach((t) => t.remove());
    this.root.destroy();
    if (this.scene.textures.exists(this.texKey)) this.scene.textures.remove(this.texKey);
  }
}
