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
  /** Move this foot to a free lane over a different pizza (switch, hop, teleport). Returns the new pizza, or null if none is free. */
  relane?(foot: Foot): Pizza | null;
}

/** Where feet wait while every foot is pulled back to the top (a boss set-piece). */
const PINNED_Y = 150;
/** Where a foot with no free lane waits, off the top of the screen. */
const HELD_Y = -260;

const LEG_LEN = 1500;

/** How much further down (world px) a leg's bottom edge must go to tuck inside the foot. The leg is drawn behind
 * the foot, so its square bottom corners show wherever the foot is narrower than the leg (a boot's neck, a narrow
 * cuff). Push the edge down until the foot is at least as wide as the leg, but no more than a third of the foot. */
const tuckCache = new Map<string, number>();
function legTuck(scene: Phaser.Scene, type: FootType, m: FootMeta, footTop: number): number {
  const hit = tuckCache.get(type.id);
  if (hit !== undefined) return hit;
  let tuck = 0;
  try {
    const ft = scene.textures.get(m.footKey).getSourceImage() as HTMLCanvasElement;
    const lt = scene.textures.get(m.legKey).getSourceImage() as HTMLCanvasElement;
    const fw = ft.width;
    const fh = ft.height;
    const fd = ft.getContext('2d')!.getImageData(0, 0, fw, fh).data;
    const ld = lt.getContext('2d')!.getImageData(0, 0, lt.width, 1).data;
    // the leg's solid width (its canvas has a little clear padding)
    let la = -1;
    let lb = -1;
    for (let x = 0; x < lt.width; x++) if (ld[x * 4 + 3] > 128) (la < 0 && (la = x), (lb = x));
    const legSolid = la < 0 ? lt.width : lb - la + 1;
    const rowWidth = (y: number) => {
      let a = -1;
      let b = -1;
      for (let x = 0; x < fw; x++) if (fd[(y * fw + x) * 4 + 3] > 128) (a < 0 && (a = x), (b = x));
      return a < 0 ? 0 : b - a + 1;
    };
    // leg bottom in the foot texture's rows (contact is at originY · height)
    const start = Math.round((-footTop + 16 * type.scale) * ART_RES + m.originY * fh);
    const limit = Math.min(fh - 1, start + Math.round(fh * 0.33));
    let y = Math.max(0, start);
    if (rowWidth(y) < legSolid - 2) {
      while (y < limit && rowWidth(y) < legSolid - 2) y++;
      // only tuck when it actually hides the corners; otherwise leave the leg as drawn
      tuck = y < limit ? (y - start + 2) / ART_RES : 0;
    }
  } catch {
    tuck = 0;
  }
  tuckCache.set(type.id, tuck);
  return tuck;
}
/** Feet are drawn a touch larger than their texture so they read clearly against the busy backdrops. */
const FOOT_DISPLAY = 1.12;

export class Foot {
  readonly scene: Phaser.Scene;
  readonly type: FootType;
  readonly meta: FootMeta;
  readonly root: Phaser.GameObjects.Container;
  private readonly baseScale: number;
  /** Size multiplier on top of the type's scale (King Honk's shuffle shrinks his shoes so three fit). */
  sizeMul = 1;
  get scale(): number {
    return this.baseScale * this.sizeMul;
  }
  /** Overrides where this foot hovers (contact y) before diving; null = the usual HOVER_Y. */
  hoverY: number | null = null;
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
  /** The current burn came from a peel ability (its kills don't charge the meter). */
  burnFromAbility = false;
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
  /** Seconds before a regrowing boss starts to heal again after a hit (GameScene sets it on damage). */
  regenHold = 0;
  golden = false; // converted by Golden Touch
  slowAbove = 0;
  /** Speed boost from a nearby Jingle Toes (0..1). */
  cheer = 0;
  /** Horizontal lane offset from the target pizza's centre while diving. */
  slot = 0;
  /** A fixed screen x to hover over instead of the target pizza (King Honk's shuffle keeps each shoe in its own lane). */
  laneX: number | null = null;
  /** Unused by lanes (kept for queued boss stand-ins): waits higher up. */
  waiting = false;
  /** First lane this foot holds (index into the table's lanes), -1 = none. Set by the scene. */
  laneSide = -1;
  /** How many lanes it holds (wide feet take two). */
  laneRow = 1;
  /** The table layout its lane was picked for (the scene re-places it when the table changes). */
  laneKey = '';
  /** No free lane: waits off the top of the screen until one opens. */
  held = false;
  /** Pulled back to the top and paused (a boss set-piece is playing). */
  pinned = false;
  /** Hover time multiplier (the heat's crowd setting). */
  hoverMul = 1;
  /** Seconds actually on screen (not held or pinned). */
  fleeAge = 0;
  /** A twin that shares this foot's health: damage to this foot goes to `link` instead. */
  link: Foot | null = null;
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
  /** Riot shield rhythm: counts up to the next timed drop while hovering or diving. */
  private guardT = 0;
  private guardNext = 2.4 + Math.random() * 0.8;
  private guardWarned = false;
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
  /** Live art layered round the drawn foot (src/game/footLive.ts): images follow its tint, flashes and fades. */
  private liveImgs: Phaser.GameObjects.Image[] = [];
  private liveAbove = 0;
  /** The live art's owner: told when the foot dies, escapes or is destroyed. */
  liveHost: { die(): void; destroy(): void } | null = null;
  /** A boss brain is moving this foot by hand: skip its own movement AI. */
  puppet = false;
  /** Speed multiplier from boss roars, avalanches and enrages. */
  hurry = 1;
  /** A rare shiny: unlocks its shiny peel when defeated. */
  shiny = false;
  /** Peel-ability mark: takes markMult damage until markUntil (scene time). */
  markUntil = 0;
  markMult = 1;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Container, shadowLayer: Phaser.GameObjects.Container, type: FootType, x: number, opts: { hpMult: number; speedMult: number; elite: boolean; hooks: FootHooks }) {
    this.scene = scene;
    this.type = type;
    this.meta = footMeta[type.id];
    this.hooks = opts.hooks;
    this.elite = opts.elite;
    this.baseScale = type.scale * FOOT_DISPLAY * (opts.elite ? 1.08 : 1);
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
    const legBottom = -footTop + 16 * type.scale + legTuck(scene, type, m, footTop);
    this.leg = scene.add.tileSprite(0, legBottom, legW, LEG_LEN, m.legKey).setOrigin(0.5, 1).setTileScale(k, k);
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
    if (this.has('rush')) return 0.12 * this.hoverMul;
    return (base / Math.max(0.7, this.type.speed)) * this.hoverMul;
  }

  /** Set the heat's hover multiplier and re-roll the first hover with it. */
  setHoverMul(m: number): void {
    this.hoverMul = m;
    this.hoverTime = this.freshHoverTime(this.type.traits.includes('flee') ? 0.4 : 0.7 + Math.random() * 0.7);
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
    // the riot shield also drops on a timer (every 2.4–3.2 s for 0.75 s), with a glint half a second before
    if (this.has('guard') && this.alive && (this.state === 'hover' || this.state === 'descend') && this.guardOpen <= 0) {
      this.guardT += dt;
      if (!this.guardWarned && this.guardT >= this.guardNext - 0.5) {
        this.guardWarned = true;
        this.flash(0x9ad8ff, 160);
      }
      if (this.guardT >= this.guardNext) {
        this.guardT = 0;
        this.guardNext = 2.4 + Math.random() * 0.8;
        this.guardWarned = false;
        this.guardOpen = 0.75;
        this.hooks.onTrait?.(this, 'guardDown');
      }
    }
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
    // time on screen (golden feet flee after 7 s of it, not counting time spent waiting for a lane)
    if (!this.held && !this.pinned) this.fleeAge += dt;
    if (this.puppet) {
      // a boss moved by hand still comes out of a stun
      if (this.stunT > 0) {
        this.stunT -= dt;
        if (this.stars) this.stars.rotation += dt * 5;
        if (this.stunT <= 0) this.endStun();
      }
      this.render(dt);
      return;
    }
    // no free lane: wait off the top of the screen
    if (this.held && this.alive) {
      this.y += (HELD_Y - this.y) * Math.min(1, dt * 4);
      if (this.state !== 'enter') this.setState('enter');
      this.render(dt);
      return;
    }
    // a boss set-piece: every foot backs off to the top of its lane and waits
    if (this.pinned && this.alive) {
      // stuns still wear off while pinned (a boss holding a lane can be frozen by a slam)
      if (this.stunT > 0) {
        this.stunT -= dt;
        if (this.stars) this.stars.rotation += dt * 5;
        if (this.stunT <= 0) this.endStun();
      }
      if (this.state !== 'hover') this.setState('hover');
      this.stateT = 0;
      this.vy = 0;
      // bosses holding a lane stay near their usual hover height, clear of the boss bar
      const py = this.isBossLike ? (this.hoverY ?? HOVER_Y) - 40 : PINNED_Y;
      this.y += (py - this.y) * Math.min(1, dt * 5);
      const px = this.laneX ?? (this.target && !this.target.dead ? this.target.x : this.x);
      this.x += (px - this.x) * Math.min(1, dt * 3);
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

    if (this.regenHold > 0) this.regenHold -= dt;
    // regrowing feet heal 4% a second; a boss (the Kraken) only 1%, and only between flurries of hits, so steady
    // smacking always wins (at 4% its regrowth outpaced a whole Mild build and the fight could never end)
    if (this.has('regen') && this.alive && this.hp < this.maxHp && !(this.isBossLike && this.regenHold > 0)) this.hp = Math.min(this.maxHp, this.hp + this.maxHp * (this.isBossLike ? 0.01 : 0.04) * dt);
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
        const hy = this.hoverY ?? HOVER_Y;
        this.y += (hy - 20 - this.y) * Math.min(1, dt * 4);
        if (this.laneX !== null) this.x += (this.laneX - this.x) * Math.min(1, dt * 3);
        else if (target) this.x += (target.x + this.slot - this.x) * Math.min(1, dt * 3);
        if (this.y > hy - 40) this.setState('hover');
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
        if (!target || target.dead) {
          this.target = this.hooks.pickTarget(this);
          if (!this.target) break;
        }
        // each foot hovers in its own lane; a back-row foot waits higher up the same lane
        let hoverX = this.laneX ?? this.target!.x + this.slot;
        // bowling shoe: sways side to side in its lane before it dives
        if (this.has('roll') && this.stateT < this.hoverTime) hoverX += Math.sin(this.age * 3.2) * 70;
        this.x += (hoverX - this.x) * Math.min(1, dt * 3);
        const hy = this.hoverY ?? HOVER_Y;
        this.y += ((this.waiting ? hy - 170 : hy) - this.y) * Math.min(1, dt * 3);
        if (this.type.traits.includes('teleport') && this.stateT > this.hoverTime * 0.6 && Math.random() < dt * 0.8) {
          const from = this.target;
          const other = this.hooks.relane?.(this);
          if (other && other !== from) this.blinkTo(other);
        }
        // a boss holds its hover for a moment as a phase begins, so the phase's first move gets its chance
        if (this.stateT > this.hoverTime && !(Number(this.brain.holdHoverT ?? 0) > 0)) {
          this.buried = false;
          const lane = this.hooks.canDescend ? this.hooks.canDescend(this) : 0;
          if (lane !== null) {
            this.slot = lane;
            this.vy = speed * 0.5;
            this.setState('descend');
          }
        }
        if (this.type.traits.includes('flee') && this.fleeAge > 7) this.escape();
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
        // a laned shoe sharing a pizza dives on its own side of it, never on top of another
        const aimX = this.laneX !== null ? t.x + Phaser.Math.Clamp(this.laneX - t.x, -t.radius * 0.8, t.radius * 0.8) : t.x + this.slot;
        // zig-zag weave
        if (this.type.traits.includes('zigzag')) {
          this.zigBase += dt;
          const weave = aimX + Math.sin(this.zigBase * 3.2) * (this.slot ? 45 : 70);
          // a laned shoe eases into its weave instead of snapping across from its hover spot
          this.x = this.laneX !== null ? this.x + (weave - this.x) * Math.min(1, dt * 6) : weave;
        } else {
          this.x += (aimX - this.x) * Math.min(1, dt * 2);
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
        // (only into a free lane on another pizza, so it never lands on top of another foot)
        if (this.has('switch') && !this.isBossLike && !this.switched && this.y > HOVER_Y + (this.stompY - HOVER_Y) * 0.4) {
          this.switched = true;
          if (this.hooks.relane?.(this)) this.hooks.onTrait?.(this, 'switch');
        }
        // pogo: bounces over to another pizza once, mid-dive
        if (this.has('hop') && !this.hopped && this.y > HOVER_Y + (this.stompY - HOVER_Y) * 0.5) {
          this.hopped = true;
          if (this.hooks.relane?.(this)) {
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
        if (this.type.traits.includes('flee') && this.fleeAge > 7) this.escape();
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
    for (const o of this.liveImgs) o.setAlpha(a);
  }

  /** Add live art round the drawn foot: `below` stacks it under the foot's art (over the leg), otherwise over it.
   * Each call goes above the earlier ones on its side. Images are tinted, flashed and faded with the foot. */
  addLiveArt(o: Phaser.GameObjects.GameObject, below: boolean): void {
    const i = this.root.getIndex(this.img);
    if (below) this.root.addAt(o, i);
    else this.root.addAt(o, i + 1 + this.liveAbove++);
    if (o instanceof Phaser.GameObjects.Image) this.liveImgs.push(o);
  }

  /** Draw the foot with another texture of the same frame (its live art draws the rest). */
  setArtTexture(key: string): void {
    this.img.setTexture(key);
  }

  /** Resize the whole foot (art and hit area) to `mul` of its normal size. */
  setSize(mul: number, ms = 250): void {
    this.sizeMul = mul;
    const rel = (this.baseScale / this.type.scale) * mul;
    if (ms > 0) this.scene.tweens.add({ targets: this.root, scaleX: rel, scaleY: rel, duration: ms, ease: 'Back.Out' });
    else this.root.setScale(rel);
  }

  private auraFx: Phaser.FX.Glow | null = null;
  private auraTween: Phaser.Tweens.Tween | null = null;

  /** A pulsing coloured outline that shows the boss's phase at a glance (null clears it). */
  /** Turn this foot shiny: a white-gold glow and a sweeping shine (sparkles are emitted by the scene). */
  makeShiny(): void {
    this.shiny = true;
    this.img.preFX?.addGlow(0xfff6c0, 5, 0, false, 0.1, 14);
    this.img.preFX?.addShine(0.7, 0.35, 4);
    if (this.leg) this.leg.preFX?.addShine(0.7, 0.35, 4);
  }

  setPhaseAura(color: number | null): void {
    this.auraTween?.remove();
    this.auraTween = null;
    if (this.auraFx) this.img.preFX?.remove(this.auraFx);
    this.auraFx = null;
    if (color === null || !this.img.preFX) return;
    this.auraFx = this.img.preFX.addGlow(color, 6, 0, false, 0.1, 14);
    this.auraTween = this.scene.tweens.add({ targets: this.auraFx, outerStrength: { from: 4, to: 10 }, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  tint(color: number | null): void {
    for (const o of [this.img, this.leg, this.cuff, ...this.liveImgs]) {
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
    for (const o of this.liveImgs) o.setTintFill(color);
  }

  clearTint(): void {
    const slowTint = this.slowT > 0 || this.frozen ? 0xa8dcff : this.burnT > 0 ? 0xffc0a0 : null;
    for (const o of [this.img, this.leg, this.cuff, ...this.liveImgs]) {
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
        // reappear in the lane relane() just gave it, not on the pizza's centre (on top of the foot there)
        this.x = this.laneX ?? p.x + this.slot;
      },
    });
  }

  escape(): void {
    if (!this.alive) return;
    this.setState('dying');
    this.shadow.setVisible(false);
    this.liveHost?.die();
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
    this.auraTween?.remove();
    this.auraTween = null;
    this.setState('dying');
    this.liveHost?.die();
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
    this.auraTween?.remove();
    this.auraTween = null;
    this.state = 'gone';
    this.liveHost?.destroy();
    this.liveHost = null;
    this.root.destroy();
    this.shadow.destroy();
  }
}
