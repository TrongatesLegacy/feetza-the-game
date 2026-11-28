// Shared boss kit: the Brain interface, timing helpers, projectiles and props every fight uses,
// the heat scaling table, and the set-piece mechanics (lane takeover, retreat, hit-counter props,
// shields, twins). Fights live in act1a/act1b/act2a/act2b.ts.

import { clockOf } from '../../core/clock';
import Phaser from 'phaser';
import { type HeatId, heatRank } from '../../data/difficulty';
import type { Arena } from '../arena';
import type { Foot } from '../Foot';
import type { Pizza } from '../Pizza';
import { crand } from '../../systems/cosmeticRandom';

export interface Brain {
  /** Phase names, index 0 = phase 1. Longer than the boss's phase count is fine. */
  names: string[];
  /** Per phase: what the move does · what to do about it. Shown on the phase banner and under the boss bar. */
  info: string[];
  onPhase?(f: Foot, phase: number, a: Arena): void;
  update?(f: Foot, dt: number, a: Arena): void;
  /** Runs every frame even while the boss is stunned or mid phase change (timers on feet, covers, the hot-water bowl). */
  upkeep?(f: Foot, dt: number, a: Arena): void;
  /** Return true to cancel the smack's damage (parry, decoy, stone, sting). */
  onSmacked?(f: Foot, a: Arena, x: number, y: number, dmg: number): boolean;
  onStomp?(f: Foot, p: Pizza, a: Arena): void;
  /** Stomps from this boss ignore pizza defences right now. */
  pierce?(f: Foot): boolean;
  onDeath?(f: Foot, a: Arena): void;
  /** A fixed phase count for this fight on every heat (default: the heat's, one fewer for mini-bosses). */
  phases?(a: Arena): number;
  /** Per phase (index 0 = phase 1): the card that pauses the fight the first time a player reaches it
   *  (src/ui/phaseCard.ts). A phase without one gets a card made from its `info`. */
  cards?: PhaseCard[];
  /** Fights whose phase list depends on the phase count (Surtr, the Jokester, Hades) set it up for `n` phases here,
   *  so a fresh brain's names and cards match the fight's (phase cards, the boss lab). */
  setPhases?(n: number): void;
  /** Textures the fight draws only once it starts (key → draw), so its phase cards can show them before then. */
  cardArt?(): Record<string, () => HTMLCanvasElement>;
}

/** One phase's intro card: what's happening, what to hit and what happens if you don't, with pictures of the
 *  actual targets drawn from the fight's own textures. */
export interface PhaseCard {
  /** What's happening, one short plain line ("The great hourglass flips over"). */
  what: string;
  /** What to hit or do ("Smash the hourglass before its sand runs out"). */
  hit: string;
  /** What happens if you don't ("He eats the time: your peel slows down"); a function for wording that depends on the
   *  card's heat (a number that changes with it). */
  miss?: string | ((heat: HeatId) => string);
  /** The pictures, in order: what to hit (a HIT THIS ring and its hit count) and anything to watch out for.
   *  '@boss' is the boss itself. With none, the card shows the boss and `icon`. */
  show?: PhaseShow[];
  /** A big emoji beside the boss when there's no prop to show (default ⚔️). */
  icon?: string;
}

export interface PhaseShow {
  /** A texture key the fight uses; '@boss' for the boss's portrait, '@foot:<id>' for a foot it brings. */
  key: string;
  /** A short caption under the picture ("Hourglass", "His toes"). */
  label: string;
  /** Hits it takes, as the fight counts them (heat-scaled the same way: `(h) => h.hits(4)`). */
  hits?: number | ((h: HeatScale) => number);
  /** Not a target: something to dodge or watch (a red WATCH OUT instead of HIT THIS). */
  watch?: boolean;
  /** Tint, as the fight draws it. */
  tint?: number;
}

export class Every {
  /** Set by the boss director for one update shortly after a phase begins: the first timer that first ran in this phase
   *  and hasn't fired yet fires now (the first such one), so a phase's new move always shows up (instead of the phase being over
   *  before its first cooldown runs out). */
  static kick = false;
  /** The phase the director is updating (each timer remembers the phase it first ran in). */
  static phase = 1;
  t: number;
  private fired = false;
  private born = 0;
  constructor(
    public every: number,
    start = every,
  ) {
    this.t = start;
  }
  tick(dt: number): boolean {
    if (!this.born) this.born = Every.phase;
    // one timer takes the kick (the first the brain runs): a phase's move, not a pile-up of every move at once
    if (Every.kick && !this.fired && this.born === Every.phase && this.t > dt) {
      this.t = dt;
      Every.kick = false;
    }
    this.t -= dt;
    if (this.t <= 0) {
      this.t += this.every;
      this.fired = true;
      return true;
    }
    return false;
  }
}

export const rnd = <T>(a: T[]): T | undefined => a[Math.floor(Math.random() * a.length)];

/** A slow projectile thrown at the peel. Smack it to bat it away; let it land and it hits the peel. */
export function throwAtPeel(a: Arena, key: string, from: { x: number; y: number }, sec: number, onLand: () => void, onSmack: () => void, spin = 6, look: { scale?: number; tint?: number } = {}): void {
  const to = { ...a.peelPoint() };
  const img = a.sc.add.image(from.x, from.y, key).setScale(look.scale ?? 1);
  if (look.tint !== undefined) img.setTint(look.tint);
  a.fxLayer.add(img);
  let done = false;
  const st = { t: 0 };
  clockOf(a.sc).tween({
    targets: st,
    t: 1,
    duration: sec * 1000,
    ease: 'Sine.In',
    onUpdate: () => {
      const k = st.t;
      img.x = from.x + (to.x - from.x) * k;
      img.y = from.y + (to.y - from.y) * k - Math.sin(k * Math.PI) * 160;
      img.rotation += spin * 0.016;
    },
    onComplete: () => {
      if (done) return;
      done = true;
      img.destroy();
      const p = a.peelPoint();
      if (a.inWave() && Math.hypot(p.x - to.x, p.y - to.y) < 220) onLand();
    },
  });
  a.addClickable({
    get x() {
      return img.x;
    },
    get y() {
      return img.y;
    },
    r: 70,
    priority: 2,
    alive: () => !done,
    hit: () => {
      if (done) return;
      done = true;
      a.fx.impact(img.x, img.y, true);
      a.sfx('sfx_slap_2', { volume: 0.8 });
      a.sc.tweens.add({ targets: img, y: img.y - 500, x: img.x + (crand() - 0.5) * 300, angle: 720, alpha: 0, duration: 500, onComplete: () => img.destroy() });
      onSmack();
    },
  });
}

/** A marker that sits on the screen for `sec`. */
export function mark(a: Arena, key: string, x: number, y: number, sec: number, scale = 1): Phaser.GameObjects.Image {
  const img = a.sc.add.image(x, y, key).setScale(scale).setAlpha(0);
  a.fxLayer.add(img);
  a.sc.tweens.add({ targets: img, alpha: 1, duration: 150 });
  a.sc.tweens.add({ targets: img, scale: scale * 1.12, duration: 300, yoyo: true, repeat: -1 });
  a.sc.time.delayedCall(sec * 1000, () => img.destroy());
  return img;
}

/** The pizza in the boss's lane: the alive pizza nearest to it (drops stay in the boss's own lane). */
export function laneOf(a: Arena, f: Foot): Pizza | null {
  const ps = a.alivePizzas();
  if (!ps.length) return null;
  return ps.reduce((best, p) => (Math.abs(p.x - f.x) < Math.abs(best.x - f.x) ? p : best));
}

/** Something falls onto a marked pizza in the boss's lane. It's broadcast first: a reticle on the pizza,
 * a glowing column down the lane, and the object appearing at the top and wobbling for a moment.
 * Then it falls slowly at a steady speed. Smack it any time before it lands; if it lands, the pizza loses a slice. */
export function dropOn(a: Arena, f: Foot, p: Pizza, key: string, sec: number, label: string, look: { scale?: number; tint?: number; color?: string; fallSfx?: string; landSfx?: string } = {}): void {
  const tx = p.x;
  const ty = p.surfaceY - 30;
  const warn = 0.9;
  const fall = sec + 1.1;
  const top = 90;
  mark(a, 'p_reticle', tx, ty, warn + fall, 0.75);
  // the lane lights up from the drop point down to the pizza
  // drawn in front of the boss (it hovers over the lane), translucent so the boss still reads
  const col = a.sc.add.graphics();
  a.fxLayer.add(col);
  const tint = look.tint ?? 0xffd23f;
  col.fillStyle(tint, 0.13).fillRoundedRect(tx - 60, top - 40, 120, ty - top + 60, 30);
  col.lineStyle(5, tint, 0.6).strokeRoundedRect(tx - 60, top - 40, 120, ty - top + 60, 30);
  a.sc.tweens.add({ targets: col, alpha: { from: 0.5, to: 1 }, duration: 300, yoyo: true, repeat: -1 });
  a.quip(tx, ty - 150, '!', look.color ?? '#ff8a6a', 60);
  const scale = look.scale ?? 0.8;
  const img = a.sc.add.image(tx, top, key).setScale(0);
  if (look.tint !== undefined) img.setTint(look.tint);
  a.fxLayer.add(img);
  a.sfx('sfx_warning', { volume: 0.35, rate: 1.3, throttle: 200 });
  let done = false;
  const finish = () => {
    done = true;
    col.destroy();
  };
  // wind-up: pops in and wobbles at the top of the lane
  a.sc.tweens.add({ targets: img, scale, duration: 220, ease: 'Back.Out' });
  a.sc.tweens.add({ targets: img, angle: { from: -14, to: 14 }, duration: 110, yoyo: true, repeat: Math.max(1, Math.round((warn * 1000) / 220) - 1) });
  a.sc.time.delayedCall(warn * 1000, () => {
    if (done) return;
    if (!f.alive || !a.inWave()) {
      finish();
      img.destroy();
      return;
    }
    a.sfx(look.fallSfx ?? 'sfx_whoosh', look.fallSfx ? { throttle: 200 } : { volume: 0.5, rate: 0.7 });
    clockOf(a.sc).tween({
      targets: img,
      y: ty,
      angle: 200,
      duration: fall * 1000,
      ease: 'Linear',
      // the boss went down (or the wave ended) mid-fall: it goes too, instead of hanging over the pizza
      onUpdate: (tw) => {
        if (done || (f.alive && a.inWave())) return;
        finish();
        tw.stop();
        a.sc.tweens.add({ targets: img, alpha: 0, scale: img.scale * 0.6, duration: 200, onComplete: () => img.destroy() });
      },
      onComplete: () => {
        if (done) return;
        finish();
        img.destroy();
        if (!f.alive || p.dead) return;
        a.fx.explosion(tx, ty, 110);
        if (look.landSfx) a.sfx(look.landSfx);
        a.hitPizza(p, 1, label, look.color ?? '#ff8a6a');
      },
    });
  });
  a.addClickable({
    get x() {
      return img.x;
    },
    get y() {
      return img.y;
    },
    r: 120,
    priority: 2,
    // a forgiving box around the falling object: taller than wide, since it's moving down
    contains: (x, y) => Math.abs(x - img.x) < 110 && Math.abs(y - img.y) < 140,
    alive: () => !done,
    hit: () => {
      if (done) return;
      finish();
      a.sc.tweens.killTweensOf(img);
      a.fx.impact(img.x, img.y, true);
      a.sfx('sfx_slap_2', { volume: 0.8 });
      a.quip(img.x, img.y - 70, 'SMASHED!', '#7dff9a', 34);
      a.sc.tweens.add({ targets: img, alpha: 0, scale: 0.2, duration: 220, onComplete: () => img.destroy() });
    },
  });
  // the wave ending (or the boss going down) clears it
  a.sc.time.delayedCall((warn + fall) * 1000 + 50, () => {
    if (!done) finish();
  });
}

/** A splat on the screen that hides what's behind it until smacked `hits` times. */
export function screenSplat(a: Arena, key: string, x: number, y: number, hits: number, label: string): void {
  const img = a.sc.add.image(x, y, key).setScale(0.2).setAlpha(0.95);
  a.fxLayer.add(img);
  a.sc.tweens.add({ targets: img, scale: 1, duration: 260, ease: 'Back.Out' });
  let left = hits;
  a.addClickable({
    x,
    y,
    r: 230,
    priority: 1,
    alive: () => left > 0,
    hit: () => {
      left--;
      a.fx.puff(x + (crand() - 0.5) * 160, y + (crand() - 0.5) * 120, 8);
      a.sfx('sfx_squish', { volume: 0.6, rate: 1.2 });
      img.setScale(img.scale * 0.8);
      if (left <= 0) {
        a.quip(x, y - 80, label, '#ffffff', 40);
        a.sc.tweens.add({ targets: img, alpha: 0, scale: 0.2, duration: 200, onComplete: () => img.destroy() });
      }
    },
  });
  a.sc.time.delayedCall(9000, () => {
    if (left > 0) {
      left = 0;
      a.sc.tweens.add({ targets: img, alpha: 0, duration: 600, onComplete: () => img.destroy() });
    }
  });
}

/** A wind-up over a pizza: smack the boss `need` times before it lands to cancel. */
export function windup(a: Arena, f: Foot, key: string, sec: number, label: string, need: number, land: () => void): void {
  f.brain.windup = need;
  f.brain.windupCancelled = false;
  a.quip(f.x, f.cy - 160, label, '#ffd23f', 44);
  f.tint(0xffb0a0);
  a.sc.tweens.add({ targets: f.root, scaleY: f.root.scaleY * 0.88, duration: sec * 500, yoyo: true });
  a.sc.time.delayedCall(sec * 1000, () => {
    f.tint(null);
    const cancelled = !!f.brain.windupCancelled;
    f.brain.windup = 0;
    if (!f.alive || cancelled) return;
    land();
  });
  void key;
}

/** Called from onSmacked: counts a hit against an active wind-up. Returns true if it just got cancelled. */
export function hitWindup(f: Foot, a: Arena, stun = 1.5): boolean {
  const left = Number(f.brain.windup ?? 0);
  if (left <= 0) return false;
  f.brain.windup = left - 1;
  if (left - 1 <= 0) {
    f.brain.windupCancelled = true;
    f.tint(null);
    a.quip(f.x, f.cy - 140, 'INTERRUPTED!', '#7dff9a', 46);
    a.sfx('sfx_crit');
    f.stun(stun);
    return true;
  }
  return false;
}

/** Phase colours: amber, red, violet. Every shoe in the fight wears its phase (decoys too). */
export function auraFor(phase: number): number | null {
  return phase <= 1 ? null : phase === 2 ? 0xffa53d : phase === 3 ? 0xff3d3d : 0xc04dff;
}

// ——— Heat scaling ———

/** Default scaling for every set-piece (a fight's own numbers win where it has them). Mild … Inferno. */
export function heat(a: Arena): HeatScale {
  return heatScale(a.heat());
}

export type HeatScale = ReturnType<typeof heatScale>;

/** heat()'s tables for a heat id, without an arena (phase cards, the boss lab). */
export function heatScale(id: HeatId) {
  const r = heatRank(id);
  return {
    /** 0 = Mild … 4 = Inferno. */
    rank: r,
    /** Hits to clear a prop. */
    hits: (base: number) => base + [0, 0, 1, 2, 3][r],
    /** Slices a missed move takes. */
    slices: (base: number) => base + [0, 0, 0, 1, 1][r],
    /** Seconds between uses of a move. */
    cooldown: (sec: number) => sec * [1.5, 1.2, 1, 0.85, 0.7][r],
    /** Wind-up before a move lands. */
    windup: (sec: number) => sec * [1.4, 1.2, 1, 0.9, 0.8][r],
    /** Adds summoned (waiters, pigeons, blacksmiths). */
    adds: (base: number) => base + [0, 1, 1, 2, 3][r],
    /** Peel stun and perk freeze length. */
    stun: (sec: number) => sec * [0.7, 1, 1, 1.2, 1.4][r],
  };
}

// ——— Lane takeover ———

export interface Takeover {
  p: Pizza;
  /** Give the lane back: the boss carries on as normal and feet may use the lane again. */
  release(): void;
}

/** The boss claims a pizza's lanes and holds still over them, just above its usual hover height: regular
 * feet move out and none come in until `release()`. The boss doesn't dive while it holds the lane. */
export function takeLane(a: Arena, f: Foot, p?: Pizza | null): Takeover | null {
  const pick = p && !p.dead ? p : rnd(a.alivePizzas());
  if (!pick) return null;
  f.target = pick;
  f.pinned = true;
  a.lockLane(pick, true);
  a.sfx('sfx_kit_lane', { throttle: 300 });
  let done = false;
  return {
    p: pick,
    release: () => {
      if (done) return;
      done = true;
      a.lockLane(pick, false);
      f.pinned = false;
    },
  };
}

// ——— Retreat ———

/** Every regular foot backs off to the top and waits; no new feet arrive. Returns the function that ends it. */
export function retreat(a: Arena): () => void {
  a.retreat(true);
  a.quip(960, 230, 'STAND BACK!', '#ffffff', 40);
  a.sfx('sfx_kit_retreat', { throttle: 400 });
  let done = false;
  return () => {
    if (done) return;
    done = true;
    a.retreat(false);
  };
}

// ——— Hit-counter props ———

export interface Prop {
  img: Phaser.GameObjects.Image;
  /** Hits still needed. */
  left(): number;
  alive(): boolean;
  /** Remove it as cleared (no onFail). */
  clear(): void;
  /** Remove it quietly (the fight ended). */
  destroy(): void;
}

export interface PropOpts {
  key: string;
  x: number;
  y: number;
  scale?: number;
  tint?: number;
  /** Hits to clear it. */
  hits: number;
  /** Hit radius (px), or a custom shape. */
  r?: number;
  contains?: (x: number, y: number) => boolean;
  /** Seconds before it fails on its own (calls onFail). Omit for no time limit. */
  sec?: number;
  /** Where it should be each frame (it follows a moving thing). Return null to stop following. */
  follow?: () => { x: number; y: number } | null;
  /** Under the pizzas instead of over the feet. */
  under?: boolean;
  onHit?: (left: number) => void;
  onClear?: () => void;
  onFail?: () => void;
  /** Quip when it's cleared. */
  label?: string;
  /** Badge offset from the prop's centre. */
  badgeDy?: number;
  /** Themed sounds for a hit and for the clearing hit (default: the kit's prop hit and clear). */
  hitSfx?: string;
  clearSfx?: string;
}

/** A whackable thing with a visible count of hits left. It fails into `onFail` if `sec` runs out first. */
export function hitProp(a: Arena, o: PropOpts): Prop {
  const img = a.sc.add.image(o.x, o.y, o.key).setScale(0);
  if (o.tint !== undefined) img.setTint(o.tint);
  (o.under ? a.underLayer : a.fxLayer).add(img);
  const scale = o.scale ?? 1;
  a.sc.tweens.add({ targets: img, scale, duration: 240, ease: 'Back.Out' });
  const badge = a.sc.add.container(o.x, o.y + (o.badgeDy ?? -80));
  // a chunky counter with a pulsing ring, so "hit this N times" reads at a glance
  const pulse = a.sc.add.circle(0, 0, 34, 0xffd23f, 0).setStrokeStyle(5, 0xffd23f, 0.9);
  const disc = a.sc.add.circle(0, 0, 34, 0x2a1810, 0.94).setStrokeStyle(5, 0xfff6e2);
  const txt = a.sc.add.text(0, 1, String(o.hits), { fontFamily: 'Lilita One, Fredoka, sans-serif', fontSize: '44px', color: '#fff6e2' }).setOrigin(0.5);
  badge.add([pulse, disc, txt]);
  a.sc.tweens.add({ targets: pulse, scale: { from: 1, to: 1.6 }, alpha: { from: 0.9, to: 0 }, duration: 900, repeat: -1 });
  a.fxLayer.add(badge);
  let left = o.hits;
  let live = true;
  const ticker = a.sc.time.addEvent({
    delay: 16,
    loop: true,
    callback: () => {
      if (!live) return;
      const at = o.follow?.();
      if (at) img.setPosition(at.x, at.y);
      // the hit count stays on screen and clear of the top HUD and the boss bar, however high the prop rides
      const bx = Phaser.Math.Clamp(img.x, 50, 1870);
      const by = img.y + (o.badgeDy ?? -80) * (img.scale / scale || 1);
      badge.setPosition(bx, Math.max(by, bx > 470 && bx < 1450 ? 268 : 165));
    },
  });
  const end = (fade = true) => {
    live = false;
    ticker.remove();
    badge.destroy();
    if (fade) a.sc.tweens.add({ targets: img, alpha: 0, scale: scale * 0.3, duration: 220, onComplete: () => img.destroy() });
    else img.destroy();
  };
  const timer = o.sec !== undefined
    ? a.sc.time.delayedCall(o.sec * 1000, () => {
        if (!live) return;
        end();
        o.onFail?.();
      })
    : null;
  a.addClickable({
    get x() {
      return img.x;
    },
    get y() {
      return img.y;
    },
    label: o.key.replace(/^p_(nz_)?/, ''),
    r: o.r ?? 90,
    priority: 2,
    contains: o.contains,
    alive: () => live,
    hit: () => {
      if (!live) return;
      left--;
      txt.setText(String(Math.max(0, left)));
      a.fx.impact(img.x, img.y, left <= 0);
      if (left <= 0) a.sfx(o.clearSfx ?? 'sfx_kit_propclear');
      else a.sfx(o.hitSfx ?? 'sfx_kit_prophit', { throttle: 60 });
      a.sc.tweens.add({ targets: badge, scale: { from: 1.35, to: 1 }, duration: 160 });
      a.sc.tweens.add({ targets: img, angle: { from: -6, to: 6 }, duration: 60, yoyo: true });
      o.onHit?.(left);
      if (left <= 0) {
        timer?.remove();
        if (o.label) a.quip(img.x, img.y - 90, o.label, '#7dff9a', 38);
        end();
        o.onClear?.();
      }
    },
  });
  return {
    img,
    left: () => left,
    alive: () => live,
    clear: () => {
      if (!live) return;
      timer?.remove();
      end();
    },
    destroy: () => {
      if (!live) return;
      timer?.remove();
      end(false);
    },
  };
}

// ——— Shields ———

const bubbles = new WeakMap<Foot, Phaser.GameObjects.Image>();

/** A visible force field: the boss takes no damage while it's up (smacks show BLOCKED). */
export function shield(a: Arena, f: Foot, on: boolean): void {
  f.shielded = on;
  // survive the phase-change beat, which restores the shield state from before it
  f.brain.wasShielded = on;
  let b = bubbles.get(f);
  if (on && !b) {
    b = a.sc.add.image(0, -f.meta.footHeight * f.type.scale * 0.5, 'p_bubble').setAlpha(0);
    b.setScale((f.meta.halfWidth * f.type.scale * 2.6) / 512);
    f.root.add(b);
    bubbles.set(f, b);
    a.sc.tweens.add({ targets: b, alpha: 0.85, duration: 200 });
    a.sc.tweens.add({ targets: b, scaleX: b.scaleX * 1.04, scaleY: b.scaleY * 0.97, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    a.sfx('sfx_kit_shieldup');
  } else if (!on && b) {
    bubbles.delete(f);
    const img = b;
    a.sc.tweens.killTweensOf(img);
    a.sc.tweens.add({ targets: img, alpha: 0, scale: img.scale * 1.3, duration: 220, onComplete: () => img.destroy() });
    a.sfx('sfx_kit_shielddown');
  }
}

// ——— Twins ———

/** A second copy of the boss that shares its health bar (every hit lands on `f`). It joins from above
 * another pizza. The brain moves both; kill it in onDeath with `twin.die()`. */
export function twin(a: Arena, f: Foot): Foot | null {
  const others = a.alivePizzas().filter((p) => p !== f.target);
  const p = rnd(others) ?? f.target;
  const t = a.spawn(f.type.id, p ?? null, p?.x);
  if (!t) return null;
  t.link = f;
  t.brain.twin = true;
  t.maxHp = f.maxHp;
  t.hp = f.hp;
  t.phase = f.phase;
  t.speedMul = f.speedMul;
  t.setPhaseAura(auraFor(f.phase));
  t.y = -300;
  a.quip(t.x, 220, 'TWO OF THEM!', '#ff8a6a', 50);
  return t;
}
