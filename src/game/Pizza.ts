// A pizza on a plate: slices as HP, footprint decals, shields/traps, and a nervous little face.

import Phaser from 'phaser';
import { PIZZA_CANVAS_H, PIZZA_CANVAS_W, PIZZA_R, PIZZA_SIZE, TILT, renderPizza, sideFor, type Footprint } from '../art/pizzaArt';
import { makeCanvas } from '../art/util';
import type { PizzaPerk, PizzaType } from '../data/pizzas';
import { pizzaTops } from './assets';

let uid = 0;

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
  /** Resting table y; `y` moves with piston lifts. */
  baseY: number;
  private freshBar: Phaser.GameObjects.Graphics;

  private plate: Phaser.GameObjects.Image;
  private img: Phaser.GameObjects.Image;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private tex: Phaser.Textures.CanvasTexture;
  private texKey: string;
  private shield: Phaser.GameObjects.Image;
  private trapImg: Phaser.GameObjects.Image;
  private face: Phaser.GameObjects.Container;
  private eyes: Phaser.GameObjects.Image[] = [];
  private pupils: Phaser.GameObjects.Image[] = [];
  private squints: Phaser.GameObjects.Image[] = [];
  private mouth: Phaser.GameObjects.Image;
  private label: Phaser.GameObjects.Text;
  private hurtTimer = 0;
  private blinkTimer = 2 + Math.random() * 3;
  private lookX = 0;
  private bob = Math.random() * 10;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer | Phaser.GameObjects.Container, type: PizzaType, x: number, y: number, s: number, slices: number) {
    this.scene = scene;
    this.type = type;
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
    this.shield = scene.add.image(0, -40, 'shield').setVisible(false).setBlendMode(Phaser.BlendModes.ADD);

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
    this.label = scene.add
      .text(0, 0, `${type.name} · ${type.perkText}`, {
        fontFamily: '"Fredoka", system-ui, sans-serif',
        fontStyle: '600',
        fontSize: '22px',
        color: '#fff6e2',
        stroke: '#2a1810',
        strokeThickness: 6,
        align: 'center',
        lineSpacing: -4,
      })
      .setOrigin(0.5, 0)
      .setAlpha(0.92);
    this.freshBar = scene.add.graphics();
    this.root.add([this.plate, this.trapImg, this.img, this.face, this.shield, this.label, this.freshBar]);
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
    this.shield.setScale(s * 0.95).setY(-lift - 30 * s);
    this.trapImg.setScale(s * 1.1).setPosition(-PIZZA_R * s * 1.02, 34 * s);
    this.label.setY((PIZZA_R + 40) * TILT * s + 14);
    this.fitLabel();
    this.drawFresh();
  }

  /** Name and perk sit on two fixed lines and shrink to fit the plate's width instead of wrapping. */
  private fitLabel(): void {
    const s = this.s;
    const room = Math.min(420, Math.max(240, PIZZA_R * 2.3 * s));
    const want = Math.max(0.8, s * 1.1);
    this.label.setScale(1);
    const w = this.label.width;
    this.label.setScale(Math.min(want, room / Math.max(1, w)));
  }

  get stale(): boolean {
    return this.freshOn && !this.dead && this.fresh <= 0;
  }

  /** The perk this pizza currently grants (stale pizzas grant none; Quattro Stagioni rotates). */
  get perk(): PizzaPerk | null {
    if (this.dead || this.stale) return null;
    if (this.type.perk === 'rotate') return (['damage', 'coins', 'regen', 'shield'] as PizzaPerk[])[Number(this.flags.season ?? 0) % 4];
    return this.type.perk;
  }

  get perkLine(): string {
    if (this.dead) return 'PERK LOST';
    if (this.stale) return 'STALE · perk off';
    if (this.type.perk === 'rotate') return ['+10% smack damage', '+20% tips from feet', 'Regrows a slice every 20s', 'Blocks the first stomp each wave'][Number(this.flags.season ?? 0) % 4];
    return this.type.perkText;
  }

  setFresh(n: number): void {
    this.fresh = Phaser.Math.Clamp(n, 0, Math.max(this.maxFresh, n));
    this.maxFresh = Math.max(this.maxFresh, this.fresh);
    this.redraw();
  }

  private drawFresh(): void {
    const g = this.freshBar;
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
    renderPizza(this.ctx, {
      type: this.type,
      top: pizzaTops[this.type.id],
      alive: this.alive,
      prints: this.prints,
      shield: false,
    });
    this.tex.refresh();
    this.face.setVisible(!this.dead);
    this.label.setText(`${this.type.name}\n${this.perkLine}`);
    this.label.setColor(this.dead ? '#ff8a6a' : this.stale ? '#cfe0a8' : '#fff6e2').setAlpha(this.dead ? 0.75 : 0.92);
    if (this.stale) this.img.setTint(0xc8d4a0);
    else this.img.clearTint();
    this.fitLabel();
    this.drawFresh();
  }

  /** Hide the perk caption (the menu screen doesn't need it). */
  hideLabel(): this {
    this.label.setVisible(false);
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
    }
    return healed;
  }

  revive(slices: number): void {
    this.revived = true;
    this.dead = false;
    this.prints = [];
    this.alive = this.alive.map((_, i) => i < slices);
    this.redraw();
  }

  addSlices(n: number): void {
    for (let i = 0; i < n; i++) this.alive.push(true);
    this.redraw();
  }

  setShield(n: number): void {
    this.shieldCharges = n;
    this.shield.setVisible(n > 0 && !this.dead);
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
    if (this.shield.visible) this.shield.setAlpha(0.65 + Math.sin(this.bob * 3) * 0.2);
  }

  destroy(): void {
    this.root.destroy();
    if (this.scene.textures.exists(this.texKey)) this.scene.textures.remove(this.texKey);
  }
}
