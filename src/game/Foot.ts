// A descending foot: state machine, traits, status effects and its visuals (leg + foot + cuff).

import Phaser from 'phaser';
import { BASE_DESCEND, HOVER_Y } from '../config';
import type { FootType } from '../data/feet';
import { ART_RES, footMeta, type FootMeta } from './assets';
import type { Pizza } from './Pizza';

export type FootState = 'enter' | 'hover' | 'descend' | 'stomp' | 'lift' | 'dying' | 'gone';

export interface FootHooks {
  onStomp(foot: Foot): void;
  pickTarget(foot: Foot): Pizza | null;
  onEscape(foot: Foot): void;
  /** Ability callouts so the scene can show text/sound. */
  onTrait?(foot: Foot, trait: 'switch' | 'clumsy' | 'hop' | 'surface' | 'reveal' | 'guardDown'): void;
  /** Called every frame while alive (medic heals, magnet pull, roll targeting). */
  onTick?(foot: Foot, dt: number): void;
  /** Lane offset (px from pizza centre) if this foot may start its dive now, or null if the pizza's lanes are full. */
  canDescend?(foot: Foot): number | null;
}

const LEG_LEN = 1500;
/** Feet are drawn a touch larger than their texture so they read clearly against the busy backdrops. */
const FOOT_DISPLAY = 1.12;

export class Foot {
  readonly scene: Phaser.Scene;
  readonly type: FootType;
  readonly meta: FootMeta;
  readonly root: Phaser.GameObjects.Container;
  readonly scale: number;
  private leg: Phaser.GameObjects.TileSprite;
  private img: Phaser.GameObjects.Image;
  private cuff?: Phaser.GameObjects.Image;
  readonly shadow: Phaser.GameObjects.Image;
  private hpBar: Phaser.GameObjects.Graphics;
  private stars?: Phaser.GameObjects.Container;
  private hooks: FootHooks;

  hp: number;
  maxHp: number;
  armor: number;
  speedMul: number;
  elite: boolean;
  state: FootState = 'enter';
  target: Pizza | null = null;
  x: number;
  y: number;
  vy = 0;
  stateT = 0;
  age = 0;
  hoverTime = 1;
  burnT = 0;
  burnDps = 0;
  burnAcc = 0;
  slowT = 0;
  slowPct = 0;
  stunT = 0;
  frozen = false;
  phased = false;
  feinted = false;
  reviveUsed = false;
  stink = 0;
  trapped = false;
  hitOnce = false;
  lastHitBy = 0;
  golden = false; // converted by Golden Touch
  slowAbove = 0;
  /** Speed boost from a nearby Jingle Toes (0..1). */
  cheer = 0;
  /** Horizontal lane offset from the target pizza's centre while diving. */
  slot = 0;
  /** True while queued above a busy pizza. */
  waiting = false;
  private waitT = 0;
  private hoverOffset = (Math.random() - 0.5) * 110;
  glossy: boolean;
  wool: number;
  parryReady = true;
  enraged = false;
  private switched = false;
  private stompedTwice = false;
  private phaseT = Math.random() * 2;
  private burstT = 0;
  private zigBase = 0;
  private wobbleT = Math.random() * 10;
  private flashT = 0;
  /** Riot shield is down for a moment right after a stomp. */
  guardOpen = 0;
  /** Gym Bro: armour gained while unhit. */
  bulk = 0;
  private bulkT = 0;
  private hopped = false;
  /** Sandy: buried (untouchable) while hovering. */
  buried = false;
  /** Seconds the foot stays visible after being revealed (Mime). */
  revealT = 0;
  /** Tips stolen by a Thief, returned when it is smacked down. */
  stolen = 0;
  /** Greek perk: traits switched off for a few seconds. */
  disarmT = 0;
  /** Boss phase (1-based). */
  phase = 1;
  /** Extra state for boss brains. */
  brain: Record<string, number | boolean> = {};
  /** Damage-taken multiplier (overheat windows, marks). */
  vuln = 1;
  /** Hard invulnerability (stone form, decoys handled by brains). */
  shielded = false;
  private icons?: Phaser.GameObjects.Container;
  /** A boss brain is moving this foot by hand: skip its own movement AI. */
  puppet = false;
  /** Speed multiplier from boss roars, avalanches and enrages. */
  hurry = 1;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Container, shadowLayer: Phaser.GameObjects.Container, type: FootType, x: number, opts: { hpMult: number; speedMult: number; elite: boolean; hooks: FootHooks }) {
    this.scene = scene;
    this.type = type;
    this.meta = footMeta[type.id];
    this.hooks = opts.hooks;
    this.elite = opts.elite;
    this.scale = type.scale * FOOT_DISPLAY * (opts.elite ? 1.08 : 1);
    this.maxHp = Math.round(type.hp * opts.hpMult * (opts.elite ? 1.8 : 1));
    this.hp = this.maxHp;
    this.armor = type.armor + (opts.elite ? 1 : 0);
    this.speedMul = opts.speedMult;
    this.x = x;
    this.y = -80;

    const m = this.meta;
    const k = 1 / ART_RES;
    const rel = this.scale / type.scale; // elite enlargement relative to the drawn texture
    this.root = scene.add.container(x, this.y);
    this.root.setScale(rel);
    const legTex = scene.textures.get(m.legKey).getSourceImage() as HTMLCanvasElement;
    const legW = legTex.width * k;
    const footTop = m.footHeight * type.scale; // world px from contact up to ankle
    this.leg = scene.add.tileSprite(0, -footTop + 16 * type.scale, legW, LEG_LEN, m.legKey).setOrigin(0.5, 1).setTileScale(k, k);
    this.img = scene.add.image(0, 0, m.footKey).setOrigin(0.5, m.originY).setScale(k);
    this.root.add([this.leg, this.img]);
    if (m.cuffKey) {
      this.cuff = scene.add.image(0, -footTop + 4 * type.scale, m.cuffKey).setScale(k);
      this.root.add(this.cuff);
    }
    this.hpBar = scene.add.graphics();
    this.root.add(this.hpBar);
    layer.add(this.root);

    this.shadow = scene.add.image(x, 0, 'shadow').setAlpha(0).setVisible(false);
    shadowLayer.add(this.shadow);

    if (type.art.ghost) {
      this.leg.setAlpha(0.7);
      this.img.setAlpha(0.8);
    }
    if (opts.elite || type.id === 'golden') {
      this.img.preFX?.addGlow(opts.elite ? 0xff4dd2 : 0xffe066, 4, 0, false, 0.1, 12);
    }
    if (type.mini) this.root.setScale(rel);
    this.glossy = type.traits.includes('glossy');
    this.buildIcons();
    this.wool = type.traits.includes('woolly') ? 15 : 0;
    this.hoverTime = this.freshHoverTime(type.traits.includes('flee') ? 0.4 : 0.7 + Math.random() * 0.7);
  }

  has(t: FootType['traits'][number]): boolean {
    if (this.disarmT > 0) return false;
    return this.type.traits.includes(t);
  }

  get isBossLike(): boolean {
    return !!this.type.boss || !!this.type.mini;
  }

  /** Trait badges on the cuff, so players can see what a foot does before it does it. */
  private buildIcons(): void {
    const ts = this.type.traits.filter((t) => t !== 'tiny').slice(0, 3);
    if (!ts.length || this.type.boss || !this.scene.textures.exists(`trait_${ts[0]}`)) return;
    const c = this.scene.add.container(0, -this.meta.footHeight * this.type.scale - 70);
    ts.forEach((t, i) => {
      const k = `trait_${t}`;
      if (!this.scene.textures.exists(k)) return;
      c.add(this.scene.add.image((i - (ts.length - 1) / 2) * 46, 0, k).setScale(0.9));
    });
    this.icons = c;
    this.root.add(c);
    this.syncIcons();
  }

  syncIcons(): void {
    if (!this.icons) return;
    const on = (this.scene.registry.get('traitIcons') as boolean | undefined) ?? true;
    this.icons.setVisible(on && this.alive);
  }

  private freshHoverTime(base: number): number {
    if (this.has('rush')) return 0.12;
    return base / Math.max(0.7, this.type.speed);
  }

  get alive(): boolean {
    return this.state !== 'dying' && this.state !== 'gone';
  }

  get hittable(): boolean {
    return this.alive && !this.phased && !this.buried && this.y > -20;
  }

  get stompY(): number {
    return this.target ? this.target.surfaceY + 4 : 880;
  }

  /** Distance from point to this foot's body (foot + lower leg), in world px. */
  distanceTo(px: number, py: number): number {
    const s = this.scale;
    const hw = this.meta.halfWidth * s * 0.92;
    const fh = this.meta.footHeight * s;
    const top = this.y - fh;
    const dxFoot = Math.max(0, Math.abs(px - this.x) - hw);
    const dyFoot = Math.max(0, top - py, py - this.y);
    const dFoot = Math.hypot(dxFoot, dyFoot);
    const lw = this.meta.legWidth * s * 0.45;
    const legTop = top - 320;
    const dxLeg = Math.max(0, Math.abs(px - this.x) - lw);
    const dyLeg = Math.max(0, legTop - py, py - top);
    return Math.min(dFoot, Math.hypot(dxLeg, dyLeg));
  }

  /** Centre of the foot body (for effects). */
  get cx(): number {
    return this.x;
  }

  get cy(): number {
    return this.y - this.meta.footHeight * this.scale * 0.45;
  }

  setState(s: FootState): void {
    this.state = s;
    this.stateT = 0;
    if (s === 'descend') this.parryReady = true;
    if (s === 'lift') {
      this.switched = false;
      this.stompedTwice = false;
    }
  }

  update(dt: number, globalSlow: number): void {
    this.age += dt;
    this.stateT += dt;
    this.wobbleT += dt;
    // statuses
    if (this.burnT > 0) this.burnT -= dt;
    if (this.slowT > 0) this.slowT -= dt;
    if (this.flashT > 0) {
      this.flashT -= dt;
      if (this.flashT <= 0) this.clearTint();
    }
    if (this.disarmT > 0) this.disarmT -= dt;
    if (this.guardOpen > 0) this.guardOpen -= dt;
    if (this.revealT > 0) this.revealT -= dt;
    // Mime: invisible (only its shadow shows) until it commits to a stomp or gets smacked
    if (this.has('invisible') && this.alive) {
      const seen = this.state === 'stomp' || this.revealT > 0 || this.state === 'lift';
      const a = seen ? 1 : 0.07;
      this.img.setAlpha(a);
      this.leg.setAlpha(a);
      this.cuff?.setAlpha(a);
      this.icons?.setAlpha(seen ? 1 : 0.5);
    }
    // Gym Bro: bulks up while nobody hits it
    if (this.has('bulk') && this.alive) {
      this.bulkT += dt;
      if (this.bulkT > 1.5 && this.bulk < 6) {
        this.bulkT = 0;
        this.bulk++;
        this.armor++;
        this.scene.tweens.add({ targets: this.img, scaleX: this.img.scaleX * 1.05, duration: 120, yoyo: true });
      }
    }
    this.hooks.onTick?.(this, dt);
    if (this.type.traits.includes('phase') && this.alive) {
      this.phaseT += dt;
      const cycle = this.type.boss ? 3.2 : 2.6;
      const t = this.phaseT % cycle;
      this.phased = t > cycle - 0.9 && this.state !== 'stomp';
      const a = this.phased ? 0.18 + Math.sin(this.age * 30) * 0.06 : this.type.art.ghost ? 0.82 : 1;
      this.img.setAlpha(a);
      this.leg.setAlpha(a * 0.85);
    }
    if (this.puppet) {
      this.render(dt);
      return;
    }
    if (this.stunT > 0) {
      this.stunT -= dt;
      if (this.stars) this.stars.rotation += dt * 5;
      if (this.stunT <= 0) this.endStun();
      this.render(dt);
      return;
    }

    if (this.has('regen') && this.alive && this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.04 * dt);
    const slowF =
      (this.slowT > 0 && !this.type.traits.includes('immuneSlow') ? 1 - this.slowPct : 1) *
      globalSlow *
      (1 - this.slowAbove) *
      (1 + this.cheer) *
      (this.enraged ? 1.5 : 1) *
      this.hurry;
    const speed = BASE_DESCEND * this.type.speed * this.speedMul * slowF;
    const target = this.target;

    switch (this.state) {
      case 'enter': {
        this.y += (HOVER_Y - 20 - this.y) * Math.min(1, dt * 4);
        if (target) this.x += (target.x - this.x) * Math.min(1, dt * 3);
        if (this.y > HOVER_Y - 40) this.setState('hover');
        break;
      }
      case 'hover': {
        if (this.has('bury')) {
          const was = this.buried;
          this.buried = this.stateT < this.hoverTime * 0.9;
          this.img.setAlpha(this.buried ? 0.25 : 1);
          this.leg.setAlpha(this.buried ? 0.25 : 1);
          if (was && !this.buried) this.hooks.onTrait?.(this, 'surface');
        }
        if (this.has('roll') && this.stateT < this.hoverTime) {
          // bowling shoe: rolls sideways across the table before picking its lane
          this.x += Math.sin(this.age * 1.6) * 260 * dt;
          const t = this.hooks.pickTarget(this);
          if (t && Math.abs(t.x - this.x) < 200) this.target = t;
        }
        if (!target || target.dead) {
          this.target = this.hooks.pickTarget(this);
          if (!this.target) break;
        }
        // queued feet wait higher up, fanned out, so they never stack on the divers below
        const hoverX = this.target!.x + (this.waiting ? this.hoverOffset * 1.6 : this.hoverOffset);
        this.x += (hoverX - this.x) * Math.min(1, dt * 3);
        this.y += ((this.waiting ? HOVER_Y - 170 : HOVER_Y) - this.y) * Math.min(1, dt * 3);
        if (this.type.traits.includes('teleport') && this.stateT > this.hoverTime * 0.6 && Math.random() < dt * 0.8) {
          const other = this.hooks.pickTarget(this);
          if (other && other !== this.target) this.blinkTo(other);
        }
        if (this.stateT > this.hoverTime) {
          this.buried = false;
          const lane = this.hooks.canDescend ? this.hooks.canDescend(this) : 0;
          if (lane !== null) {
            this.slot = lane;
            this.waiting = false;
            this.waitT = 0;
            this.vy = speed * 0.5;
            this.setState('descend');
          } else {
            this.waiting = true;
            this.waitT += dt;
            // every so often look for a pizza with a free lane
            if (this.waitT > 1.1) {
              this.waitT = 0;
              const other = this.hooks.pickTarget(this);
              if (other) this.target = other;
            }
          }
        }
        if (this.type.traits.includes('flee') && this.age > 7) this.escape();
        break;
      }
      case 'descend': {
        if (!target || target.dead) {
          this.target = this.hooks.pickTarget(this);
          if (!this.target) {
            this.vy = -300;
            this.setState('lift');
            break;
          }
        }
        const t = this.target!;
        // zig-zag weave
        if (this.type.traits.includes('zigzag')) {
          this.zigBase += dt;
          this.x = t.x + this.slot + Math.sin(this.zigBase * 3.2) * (this.slot ? 45 : 70);
        } else {
          this.x += (t.x + this.slot - this.x) * Math.min(1, dt * 2);
        }
        let want = speed;
        if (this.type.traits.includes('burst')) {
          this.burstT += dt;
          const ph = this.burstT % 1.1;
          want = ph < 0.3 ? speed * 3.4 : speed * 0.15;
        }
        const recover = this.type.traits.includes('flutter') ? 2400 : this.type.traits.includes('floaty') ? 420 : 1000;
        if (this.vy < want) this.vy = Math.min(want, this.vy + recover * dt);
        else this.vy += (want - this.vy) * Math.min(1, dt * 4);
        this.y += this.vy * dt;
        if (this.y < 110) {
          this.y = 110;
          this.vy = Math.max(this.vy, 0);
        }
        // striker: switch pizzas once, mid-dive
        if (this.has('switch') && !this.switched && this.y > HOVER_Y + (this.stompY - HOVER_Y) * 0.4) {
          this.switched = true;
          let other = this.hooks.pickTarget(this);
          for (let i = 0; i < 6 && other === this.target; i++) other = this.hooks.pickTarget(this);
          if (other && other !== this.target) {
            const prev = this.target;
            this.target = other;
            const lane = this.hooks.canDescend ? this.hooks.canDescend(this) : 0;
            if (lane === null) this.target = prev; // no room on the other pizza: stay put
            else {
              this.slot = lane;
              this.hooks.onTrait?.(this, 'switch');
            }
          }
        }
        // pogo: bounces over to another pizza once, mid-dive
        if (this.has('hop') && !this.hopped && this.y > HOVER_Y + (this.stompY - HOVER_Y) * 0.5) {
          this.hopped = true;
          const other = this.hooks.pickTarget(this);
          if (other && other !== this.target) {
            this.target = other;
            this.slot = 0;
            this.vy = -420;
            this.hooks.onTrait?.(this, 'hop');
          }
        }
        // astronaut: floats back up partway through every dive
        if (this.has('antigrav') && this.y > HOVER_Y + (this.stompY - HOVER_Y) * 0.55 && Math.random() < dt * 0.9) {
          this.vy = -260;
        }
        // clumsy: occasionally trips and stumbles back up on its own
        if (this.has('clumsy') && this.vy > 0 && Math.random() < dt * 0.35) {
          this.vy = -380;
          this.hooks.onTrait?.(this, 'clumsy');
        }
        // ballerina feint: fake out once at the halfway point
        if (this.type.traits.includes('feint') && !this.feinted && this.y > (HOVER_Y + this.stompY) / 2) {
          this.feinted = true;
          this.vy = -520;
        }
        if (this.type.traits.includes('flee') && this.age > 7) this.escape();
        if (this.y >= this.stompY) {
          this.y = this.stompY;
          this.vy = 0;
          this.setState('stomp');
          if (this.has('guard')) {
            this.guardOpen = 1.1;
            this.hooks.onTrait?.(this, 'guardDown');
          }
          this.hooks.onStomp(this);
        }
        break;
      }
      case 'stomp': {
        // dino: a second stomp before lifting off
        if (this.has('double') && !this.stompedTwice && this.stateT > 0.32) {
          this.stompedTwice = true;
          this.scene.tweens.add({ targets: this, y: this.y - 60, duration: 90, yoyo: true, ease: 'Quad.Out' });
          this.scene.time.delayedCall(180, () => this.alive && this.state === 'stomp' && this.hooks.onStomp(this));
          this.stateT = 0.05;
        }
        if (this.stateT > 0.5) {
          this.vy = -560;
          this.setState('lift');
        }
        break;
      }
      case 'lift': {
        this.vy += 700 * dt;
        this.y += this.vy * dt;
        if (this.vy >= 0 || this.y <= HOVER_Y) {
          this.target = this.hooks.pickTarget(this);
          this.feinted = false;
          this.hopped = false;
          this.hoverTime = this.freshHoverTime(0.4 + Math.random() * 0.6);
          this.setState('hover');
        }
        break;
      }
      default:
        break;
    }
    this.render(dt);
  }

  /** Show the foot regardless of invisibility (Mime) for a moment. */
  reveal(sec: number): void {
    this.revealT = Math.max(this.revealT, sec);
  }

  setVisualAlpha(a: number): void {
    this.img.setAlpha(a);
    this.leg.setAlpha(a);
    this.cuff?.setAlpha(a);
  }

  tint(color: number | null): void {
    for (const o of [this.img, this.leg, this.cuff]) {
      if (!o) continue;
      if (color === null) o.clearTint();
      else o.setTint(color);
    }
  }

  render(dt: number): void {
    if (!this.alive) return;
    const lean = this.state === 'descend' ? Phaser.Math.Clamp(this.vy / 2400, -0.08, 0.08) : 0;
    const wob = this.state === 'hover' ? Math.sin(this.wobbleT * 5) * 0.03 : Math.sin(this.wobbleT * 9) * 0.008;
    this.root.setPosition(this.x, this.y);
    this.root.rotation += (wob + lean * (this.x > 960 ? -1 : 1) - this.root.rotation) * Math.min(1, dt * 10);
    // telegraph shadow on the target pizza
    const t = this.target;
    if (t && !t.dead && (this.state === 'descend' || this.state === 'hover' || this.state === 'stomp')) {
      const prox = Phaser.Math.Clamp(1 - (this.stompY - this.y) / (this.stompY - HOVER_Y + 60), 0, 1);
      const w = this.meta.halfWidth * 2 * this.scale;
      this.shadow
        .setVisible(true)
        .setPosition(this.x, t.surfaceY + 6)
        .setScale(((0.45 + 0.55 * prox) * w) / 300, ((0.45 + 0.55 * prox) * w * 0.38) / 110)
        .setAlpha(0.18 + 0.55 * prox);
    } else {
      this.shadow.setAlpha(Math.max(0, this.shadow.alpha - dt * 3));
    }
    this.drawHp();
  }

  private drawHp(): void {
    const g = this.hpBar;
    g.clear();
    if (!this.hitOnce || this.isBossLike || this.hp <= 0) return;
    if (this.has('invisible') && this.revealT <= 0 && this.state !== 'stomp') return;
    const w = 90;
    const y = -this.meta.footHeight * this.type.scale - 34;
    const f = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    g.fillStyle(0x2a1810, 0.85).fillRoundedRect(-w / 2 - 3, y - 3, w + 6, 14, 7);
    g.fillStyle(f > 0.5 ? 0x7be04a : f > 0.25 ? 0xffc42e : 0xff4d3d, 1).fillRoundedRect(-w / 2, y, Math.max(6, w * f), 8, 4);
    if (this.armor > 0) {
      g.fillStyle(0xc7ccd4, 1).fillCircle(-w / 2 - 10, y + 4, 7);
      g.lineStyle(2, 0x2a1810, 1).strokeCircle(-w / 2 - 10, y + 4, 7);
    }
  }

  flash(color = 0xffffff, ms = 70): void {
    this.flashT = ms / 1000;
    this.img.setTintFill(color);
    this.leg.setTintFill(color);
    this.cuff?.setTintFill(color);
  }

  clearTint(): void {
    const slowTint = this.slowT > 0 || this.frozen ? 0xa8dcff : this.burnT > 0 ? 0xffc0a0 : null;
    for (const o of [this.img, this.leg, this.cuff]) {
      if (!o) continue;
      o.clearTint();
      if (slowTint) o.setTint(slowTint);
    }
  }

  /** Apply knockback (positive = upward impulse). */
  knock(power: number): void {
    if (this.state === 'stomp') {
      this.setState('lift');
      this.vy = -power * 1.2;
      return;
    }
    if (this.state !== 'descend' && this.state !== 'hover') return;
    let p = power;
    if (this.type.traits.includes('heavy')) p *= 0.35;
    if (this.type.traits.includes('floaty')) p *= 1.8;
    if (this.isBossLike) p *= 0.4;
    if (this.state === 'hover') {
      this.y -= p * 0.12;
      this.stateT = Math.min(this.stateT, this.hoverTime * 0.5);
      return;
    }
    this.vy = Math.min(this.vy, 0) - p;
    this.scene.tweens.add({ targets: this.root, scaleY: { from: 0.86, to: this.root.scaleX }, duration: 220, ease: 'Back.Out' });
  }

  dodge(): void {
    const dir = this.x < 960 ? 1 : -1;
    const dx = dir * (90 + Math.random() * 60);
    this.scene.tweens.add({ targets: this, x: this.x + dx, duration: 180, ease: 'Quad.Out' });
  }

  stun(sec: number, frozen = false): void {
    if (!this.alive) return;
    this.stunT = Math.max(this.stunT, sec);
    this.frozen = frozen;
    if (frozen) this.clearTint();
    if (!this.stars && !frozen) {
      const c = this.scene.add.container(0, -this.meta.footHeight * this.type.scale - 10);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        c.add(this.scene.add.image(Math.cos(a) * 46, Math.sin(a) * 14, 'star5').setScale(0.55));
      }
      this.stars = c;
      this.root.add(c);
    }
  }

  private endStun(): void {
    this.stars?.destroy();
    this.stars = undefined;
    this.frozen = false;
    this.clearTint();
  }

  private blinkTo(p: Pizza): void {
    this.target = p;
    this.scene.tweens.add({
      targets: this.root,
      alpha: { from: 1, to: 0 },
      duration: 120,
      yoyo: true,
      onYoyo: () => {
        this.x = p.x;
      },
    });
  }

  escape(): void {
    if (!this.alive) return;
    this.setState('dying');
    this.shadow.setVisible(false);
    this.hooks.onEscape(this);
    this.scene.tweens.add({ targets: this.root, y: -900, duration: 700, ease: 'Back.In', onComplete: () => this.destroy() });
  }

  revive(): void {
    this.reviveUsed = true;
    this.hp = Math.round(this.maxHp * 0.5);
    this.stun(1.4);
    this.flash(0x7dff9a, 300);
  }

  /** Comedic yank off-screen. */
  die(boss = false): void {
    this.setState('dying');
    // the killing blow flashes white; make sure the flash clears since update() stops running now
    this.scene.time.delayedCall(boss ? 140 : 70, () => {
      this.flashT = 0;
      if (this.root.active) this.clearTint();
    });
    this.hpBar.clear();
    this.icons?.setVisible(false);
    this.stars?.destroy();
    this.shadow.setVisible(false);
    const spin = (Math.random() < 0.5 ? -1 : 1) * (boss ? 0.15 : 0.35);
    this.scene.tweens.add({
      targets: this.root,
      scaleY: this.root.scaleX * 0.78,
      duration: boss ? 500 : 90,
      yoyo: !boss,
      ease: 'Quad.Out',
      onComplete: () => {
        this.scene.tweens.add({
          targets: this.root,
          y: -this.meta.footHeight * this.scale - 200,
          rotation: spin,
          duration: boss ? 900 : 380,
          ease: 'Back.In',
          onComplete: () => this.destroy(),
        });
      },
    });
  }

  destroy(): void {
    this.state = 'gone';
    this.root.destroy();
    this.shadow.destroy();
  }
}
