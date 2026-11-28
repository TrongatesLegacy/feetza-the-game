// The hero kit: what signature moves are built from, shared by the heroes (src/game/heroMoves.ts) and the gods.
//
// - HeroHost: the slice of the game scene a move may use (damage, tips, throws, layers, the peel).
// - Transformations: a timed buff with a countdown bar under the meter, a start moment (shout, flash, sound)
//   and an end (puff, hiss). One runs at a time; the meter doesn't charge while it lasts.
// - Overlays: screen-level moments (darkness with a spotlight, red outlines, tints, rain, scanlines), faded in
//   and out, and cleaned up when the wave ends.
// - The registries: MOVES (signature moves by id) and PASSIVES (always-on hooks by peel id).

import Phaser from 'phaser';
import { H, W } from '../config';
import type { HeatId } from '../data/difficulty';
import type { Stats } from '../data/upgrades';
import { audio } from '../systems/audio';
import { save } from '../systems/save';
import type { Effect, ThrowFx } from './abilities';
import type { Foot } from './Foot';
import type { Fx } from './Fx';
import type { Pizza } from './Pizza';
import { traced } from './packTrace';
import '../ui/heroes.css';
import { crand } from '../systems/cosmeticRandom';

export type DmgSource = 'smack' | 'ability' | 'direct' | 'burn' | 'chain' | 'other';

/** The game scene, as the hero moves see it. */
export interface HeroHost {
  scene: Phaser.Scene;
  fx: Fx;
  layers: { under: Phaser.GameObjects.Container; pizzas: Phaser.GameObjects.Container; feet: Phaser.GameObjects.Container; fx: Phaser.GameObjects.Container; cursor: Phaser.GameObjects.Container };
  peel: () => Phaser.GameObjects.Image;
  peelPos: () => { x: number; y: number };
  /** The peel's normal display scale (before any hero size change). */
  peelScale: () => number;
  feet: () => Foot[];
  /** Feet that can be hit right now. */
  live: () => Foot[];
  pizzas: () => Pizza[];
  now: () => number;
  stats: () => Stats;
  wave: () => number;
  heat: () => HeatId;
  location: () => string | null;
  backdrop: () => string | null;
  inWave: () => boolean;
  /** Deal `x` smacks of damage (×1 = one smack at your current damage). */
  hurt: (f: Foot, x: number, o?: { knock?: number; source?: 'ability' | 'direct'; quiet?: boolean }) => void;
  /** Defeat a foot outright (it pays its tips). */
  kill: (f: Foot) => void;
  tips: (n: number, x: number, y: number) => void;
  coins: () => number;
  spend: (n: number) => boolean;
  heal: (p: Pizza, n: number) => void;
  /** Bring a destroyed pizza back on n slices. */
  revive: (p: Pizza, n: number) => void;
  throwAt: (e: ThrowFx, feet: Foot[], color: number, onHit?: (f: Foot, x: number) => void) => void;
  runFx: (fx: Effect[], ctx: { foot?: Foot; x?: number; y?: number }, color: number) => void;
  meter: () => number;
  setMeter: (v: number) => void;
  /** The current combo. */
  combo: () => number;
  /** Keep the combo alive this many seconds longer. */
  holdCombo: (sec: number) => void;
  /** Toppings owned this run, by id (their levels). */
  owned: () => Record<string, number>;
  /** How much of this wave's feet are still to beat (1 at the start, 0 when it's clear). */
  waveLeft: () => number;
  /** Swap in another peel's ability (and look) for a while; null puts the hero back. */
  swapAbility: (peelId: string | null) => void;
  /** Stats changed (an always-on hero passive). */
  recompute: () => void;
  toast: (img: string | null, title: string, text: string) => void;
  /** Where the tips counter is on screen. */
  coinPos: () => { x: number; y: number };
  banner: (big: string, small: string) => void;
  quip: (x: number, y: number, msg: string, color?: string, size?: number) => void;
  shake: (ms: number, k: number) => void;
  flash: (ms: number, r: number, g: number, b: number) => void;
  rumble: (k: number, ms: number) => void;
  /** Next wave's plan, made now (Herald) and used when the wave starts. */
  peekWave: (n: number) => string[];
  /** The next shop's cards, rolled now (From the Future) and dealt when the shop opens. */
  peekShop: () => string[];
}

export const FONT = '"Lilita One", "Fredoka", system-ui, sans-serif';
const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');

// ——— transformations ———
export interface TransformSpec {
  /** Shown in the bar. */
  label: string;
  sec: number;
  color: number;
  /** A big shout across the screen as it starts. */
  shout?: string;
  sfx?: string;
  /** The end sound (default: a soft hiss). */
  endSfx?: string;
  start?: () => void;
  /** Every frame (real seconds). */
  tick?: (dt: number, left: number) => void;
  end?: () => void;
}

interface Running extends TransformSpec {
  left: number;
}

// ——— overlays ———
export type OverlayKind =
  /** Full-screen colour (multiply darkens, add brightens). */
  | { kind: 'tint'; color: number; alpha: number; blend?: 'multiply' | 'add' | 'normal'; below?: 'feet' | 'fx' }
  /** Darkness with a soft spotlight following the peel. */
  | { kind: 'dark'; alpha: number; spot: number; color?: number }
  /** Scanlines and a soft vignette (the retro tape). */
  | { kind: 'scanlines'; color: number; alpha: number }
  /** Slanted rain streaks over the scene. */
  | { kind: 'rain'; alpha: number; color?: number };

export class Overlay {
  readonly objs: Phaser.GameObjects.GameObject[] = [];
  alive = true;
  private rt: Phaser.GameObjects.RenderTexture | null = null;
  private spot: Phaser.GameObjects.Image | null = null;
  private drops: { x: number; y: number; v: number }[] = [];
  private g: Phaser.GameObjects.Graphics | null = null;
  private base: number;
  constructor(
    private k: HeroKit,
    readonly spec: OverlayKind,
    fadeIn: number,
  ) {
    const sc = k.host.scene;
    const L = k.host.layers;
    this.base = spec.alpha;
    let obj: Phaser.GameObjects.GameObject & { setAlpha(a: number): unknown; alpha: number };
    if (spec.kind === 'tint') {
      const r = sc.add.rectangle(W / 2, H / 2, W, H, spec.color);
      if (spec.blend === 'multiply') r.setBlendMode(Phaser.BlendModes.MULTIPLY);
      else if (spec.blend === 'add') r.setBlendMode(Phaser.BlendModes.ADD);
      if (spec.below === 'feet') sc.children.moveBelow(r as unknown as Phaser.GameObjects.GameObject, L.feet);
      else sc.children.moveBelow(r as unknown as Phaser.GameObjects.GameObject, L.fx);
      obj = r;
    } else if (spec.kind === 'dark') {
      const rt = sc.add.renderTexture(0, 0, W, H).setOrigin(0, 0);
      sc.children.moveBelow(rt as unknown as Phaser.GameObjects.GameObject, L.fx);
      this.rt = rt;
      this.spot = sc.make.image({ key: 'glow', add: false });
      obj = rt;
    } else if (spec.kind === 'scanlines') {
      const g = sc.add.graphics();
      for (let y = 0; y < H; y += 6) {
        g.fillStyle(0x000000, 0.22);
        g.fillRect(0, y, W, 2);
      }
      g.fillStyle(spec.color, 0.12);
      g.fillRect(0, 0, W, H);
      sc.children.moveBelow(g as unknown as Phaser.GameObjects.GameObject, L.cursor);
      obj = g;
    } else {
      const g = sc.add.graphics();
      sc.children.moveBelow(g as unknown as Phaser.GameObjects.GameObject, L.fx);
      this.g = g;
      for (let i = 0; i < 90; i++) this.drops.push({ x: crand() * (W + 300), y: crand() * H, v: 1400 + crand() * 700 });
      obj = g;
    }
    this.objs.push(obj);
    obj.setAlpha(0);
    sc.tweens.add({ targets: obj, alpha: spec.kind === 'dark' || spec.kind === 'rain' ? 1 : spec.alpha, duration: fadeIn });
  }

  update(dt: number): void {
    if (this.rt && this.spot && this.spec.kind === 'dark') {
      const p = this.k.host.peelPos();
      this.rt.clear();
      this.rt.fill(this.spec.color ?? 0x05060f, this.base);
      const s = (this.spec.spot * 2) / Math.max(1, this.spot.width);
      this.spot.setScale(s);
      this.rt.erase(this.spot, p.x, p.y);
      this.spot.setScale(s * 0.6);
      this.rt.erase(this.spot, p.x, p.y);
    }
    if (this.g && this.spec.kind === 'rain') {
      const g = this.g;
      g.clear();
      g.lineStyle(2, this.spec.color ?? 0xbfd8ff, this.base);
      for (const d of this.drops) {
        d.y += d.v * dt;
        d.x -= d.v * 0.25 * dt;
        if (d.y > H) {
          d.y = -40;
          d.x = crand() * (W + 300);
        }
        g.lineBetween(d.x, d.y, d.x - 10, d.y + 40);
      }
    }
  }

  end(ms = 500): void {
    if (!this.alive) return;
    this.alive = false;
    const sc = this.k.host.scene;
    for (const o of this.objs) sc.tweens.add({ targets: o, alpha: 0, duration: ms, onComplete: () => o.destroy() });
    this.spot?.destroy();
  }

  kill(): void {
    this.alive = false;
    for (const o of this.objs) o.destroy();
    this.spot?.destroy();
  }
}

/** A thing that lives for a while and updates every frame (fins, webs, a tree, squirrels…). */
export interface Effecty {
  /** Return false when finished. */
  update(dt: number): boolean;
  /** Clear up now (the wave ended). */
  stop(): void;
}

// ——— registries ———
export interface MoveCtx {
  foot?: Foot;
  x?: number;
  y?: number;
}

export type Move = (k: HeroKit, ctx: MoveCtx) => void;

/** Always-on hooks for a hero, by peel id. Every hook is optional. */
export interface Passive {
  /** Every frame while a wave is on (real seconds). */
  tick?: (k: HeroKit, dt: number) => void;
  waveStart?: (k: HeroKit) => void;
  waveClear?: (k: HeroKit) => void;
  /** After a smack hits a foot. */
  hit?: (k: HeroKit, f: Foot, x: number, y: number) => void;
  kill?: (k: HeroKit, f: Foot) => void;
  /** A foot is about to stomp: return true to stop it. */
  stomp?: (k: HeroKit, f: Foot, p: Pizza) => boolean;
  /** A stomp was blocked by a shield (or a trap, Grandma, a thick crust). */
  blocked?: (k: HeroKit, f: Foot, shield: boolean) => void;
  /** Slices a stomp is about to take: return the number it really takes. */
  slices?: (k: HeroKit, p: Pizza, n: number) => number;
  /** Slices just lost. */
  lost?: (k: HeroKit, n: number) => void;
  /** A pizza was destroyed: return true if it's saved. */
  destroyed?: (k: HeroKit, p: Pizza) => boolean;
  dmgMult?: (k: HeroKit, f: Foot, source: DmgSource) => number;
  meterMult?: (k: HeroKit) => number;
  peelImmune?: boolean;
  ignoreShields?: boolean;
  fearless?: boolean;
  keepFresh?: (k: HeroKit) => boolean;
  rerollDiscount?: number;
}

export const MOVES: Record<string, Move> = traced('moves', {});
export const PASSIVES: Record<string, Passive> = traced('passives', {});

export function registerMoves(m: Record<string, Move>): void {
  Object.assign(MOVES, m);
}

export function registerPassives(p: Record<string, Passive>): void {
  Object.assign(PASSIVES, p);
}

/** Everything the hero moves share for one run: the host, transformations, overlays and timed effects. */
export class HeroKit {
  readonly host: HeroHost;
  peelId = 'classic';
  /** The hero's colour (bars, glows). */
  color = 0xffd23f;
  running: Running | null = null;
  overlays: Overlay[] = [];
  effects: Effecty[] = [];
  /** Set while a transformation ends early (replaced, or the wave is over). */
  quietEnd = false;
  /** Set while the scene shuts down: moves finish quietly. */
  closing = false;
  /** Per-run state for moves and passives. */
  st: Record<string, number | boolean | string> = {};
  /** Per-wave state (cleared at every wave start). */
  wv: Record<string, number | boolean> = {};
  /** Damage multiplier, peel size, reach and world speed set by the running move. */
  mods = { dmg: 1, size: 1, reach: 1, world: 1, crit: false };
  /** Per-smack hooks a transformation adds (Berserker, Escrima, Flame On…). */
  onHit: ((f: Foot, x: number, y: number) => void) | null = null;
  private bar: HTMLElement | null = null;
  private barFill: HTMLElement | null = null;

  constructor(host: HeroHost) {
    this.host = host;
  }

  get sc(): Phaser.Scene {
    return this.host.scene;
  }

  // ——— transformations ———
  transform(spec: TransformSpec): void {
    if (this.running) this.endTransform(true);
    const r: Running = { ...spec, left: spec.sec };
    this.running = r;
    if (spec.shout) this.shout(spec.shout, spec.color);
    if (spec.sfx) audio.sfx(spec.sfx, { volume: 1 });
    this.showBar(spec.label, spec.color);
    spec.start?.();
  }

  get transforming(): boolean {
    return !!this.running;
  }

  endTransform(quiet = false): void {
    const r = this.running;
    if (!r) return;
    this.running = null;
    this.mods = { dmg: 1, size: 1, reach: 1, world: 1, crit: false };
    this.onHit = null;
    // a quiet end (replaced, or the wave ended) skips a move's finale
    this.quietEnd = quiet;
    r.end?.();
    this.quietEnd = false;
    this.hideBar();
    if (!quiet) {
      const p = this.host.peelPos();
      this.host.fx.puff(p.x, p.y, 10);
      audio.sfx(r.endSfx ?? 'sfx_hero_end', { volume: 0.7 });
    }
    this.syncPeel();
  }

  /** Put the peel's size back in line with the current mods. */
  syncPeel(ms = 260): void {
    const peel = this.host.peel();
    this.sc.tweens.killTweensOf(peel);
    this.sc.tweens.add({ targets: peel, scale: this.host.peelScale() * this.mods.size, duration: ms, ease: 'Back.Out' });
  }

  private showBar(label: string, color: number): void {
    const hud = document.querySelector('.hud');
    if (!hud) return;
    this.bar?.remove();
    const fill = document.createElement('i');
    const b = document.createElement('div');
    b.className = 'hero-bar';
    b.style.setProperty('--c', hex(color));
    const t = document.createElement('span');
    t.textContent = label;
    b.append(fill, t);
    hud.append(b);
    this.bar = b;
    this.barFill = fill;
  }

  private hideBar(): void {
    const b = this.bar;
    this.bar = null;
    this.barFill = null;
    if (!b) return;
    b.classList.add('out');
    window.setTimeout(() => b.remove(), 400);
  }

  // ——— overlays ———
  overlay(spec: OverlayKind, fadeIn = 400): Overlay {
    const o = new Overlay(this, spec, fadeIn);
    this.overlays.push(o);
    return o;
  }

  /** Run something every frame until it says it's done (or the wave ends). */
  effect(e: Effecty): void {
    this.effects.push(e);
  }

  // ——— moments ———
  /** A huge shout slammed onto the screen. */
  shout(text: string, color: number, size = 120): void {
    const t = this.sc.add
      .text(W / 2, 400, text, { fontFamily: FONT, fontSize: `${size}px`, color: hex(color), stroke: '#2a1810', strokeThickness: 18 })
      .setOrigin(0.5)
      .setScale(2.4)
      .setAlpha(0)
      .setAngle(-4);
    this.host.layers.fx.add(t);
    this.sc.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 220, ease: 'Back.Out' });
    this.sc.tweens.add({ targets: t, alpha: 0, y: 340, delay: 1100, duration: 380, onComplete: () => t.destroy() });
    this.host.shake(260, 0.008);
    this.host.rumble(0.6, 220);
  }

  flashC(color: number, ms = 180): void {
    this.host.flash(ms, (color >> 16) & 255, (color >> 8) & 255, color & 255);
  }

  /** An image on the fx layer (props drawn in src/content/props/heroes.ts). */
  img(key: string, x: number, y: number, scale = 1): Phaser.GameObjects.Image {
    const i = this.sc.add.image(x, y, this.sc.textures.exists(key) ? key : 'soft').setScale(scale);
    this.host.layers.fx.add(i);
    return i;
  }

  /** A glowing line from a to b that fades (beams, chains, arcs). */
  beam(x0: number, y0: number, x1: number, y1: number, color: number, width = 18, ms = 260): void {
    const g = this.sc.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    this.host.layers.fx.add(g);
    for (const [w, c, a] of [[width * 2, color, 0.3], [width, color, 0.75], [width * 0.35, 0xffffff, 1]] as const) {
      g.lineStyle(w, c, a);
      g.lineBetween(x0, y0, x1, y1);
    }
    this.sc.tweens.add({ targets: g, alpha: 0, duration: ms, ease: 'Quad.In', onComplete: () => g.destroy() });
  }

  /** A lightning bolt from the sky onto a point. */
  strike(x: number, y: number, color = 0xd8f0ff): void {
    const g = this.sc.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    this.host.layers.fx.add(g);
    const pts: [number, number][] = [[x + (crand() - 0.5) * 120, -20]];
    const n = 7;
    for (let i = 1; i < n; i++) pts.push([x + (crand() - 0.5) * 70, (y * i) / n]);
    pts.push([x, y]);
    for (const [w, c, a] of [[22, color, 0.3], [9, color, 0.85], [3, 0xffffff, 1]] as const) {
      g.lineStyle(w, c, a);
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (const [px, py] of pts.slice(1)) g.lineTo(px, py);
      g.strokePath();
    }
    this.sc.tweens.add({ targets: g, alpha: 0, duration: 240, onComplete: () => g.destroy() });
    this.host.fx.ring(x, y, color, 0.6, 0.6);
  }

  /** Feet whose body is within `r` of the segment a→b. */
  feetOnLine(x0: number, y0: number, x1: number, y1: number, r: number): Foot[] {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len2 = dx * dx + dy * dy || 1;
    return this.host.live().filter((f) => {
      const t = Phaser.Math.Clamp(((f.cx - x0) * dx + (f.cy - y0) * dy) / len2, 0, 1);
      return f.distanceTo(x0 + dx * t, y0 + dy * t) <= r;
    });
  }

  toughest(n: number, skipBoss = false): Foot[] {
    return [...this.host.live()].filter((f) => !skipBoss || !f.isBossLike).sort((a, b) => Number(b.isBossLike) - Number(a.isBossLike) || b.hp - a.hp).slice(0, n);
  }

  front(n: number, skipBoss = false): Foot[] {
    return [...this.host.live()].filter((f) => !skipBoss || !f.isBossLike).sort((a, b) => b.y - a.y).slice(0, n);
  }

  random(n: number): Foot[] {
    return Phaser.Utils.Array.Shuffle([...this.host.live()]).slice(0, n);
  }

  /** Bosses shrug off half of any stun. */
  stun(f: Foot, sec: number, freeze = false): void {
    f.stun(f.isBossLike ? sec / 2 : sec, freeze);
    if (freeze) this.host.fx.frost(f.cx, f.cy);
  }

  burn(f: Foot, x: number, sec: number): void {
    if (f.type.traits.includes('immuneBurn')) return;
    f.burnFromAbility = true;
    f.burnT = Math.max(f.burnT, sec);
    f.burnDps = Math.max(f.burnDps, x * this.host.stats().damage);
  }

  mark(f: Foot, mult: number, sec: number): void {
    f.markMult = Math.max(f.markUntil > this.host.now() ? f.markMult : 1, mult);
    f.markUntil = this.host.now() + sec;
  }

  slow(f: Foot, pct: number, sec: number): void {
    f.slowT = Math.max(f.slowT, sec);
    f.slowPct = Math.max(f.slowPct, pct);
  }

  // ——— the frame ———
  update(dt: number): void {
    const r = this.running;
    if (r) {
      r.left -= dt;
      r.tick?.(dt, r.left);
      if (this.barFill) this.barFill.style.width = `${Math.max(0, (r.left / r.sec) * 100)}%`;
      // the last 3 seconds flicker
      if (this.bar) this.bar.classList.toggle('ending', r.left < 3);
      if (r.left <= 0) this.endTransform();
    }
    this.overlays = this.overlays.filter((o) => o.alive);
    for (const o of this.overlays) o.update(dt);
    this.effects = this.effects.filter((e) => e.update(dt));
  }

  /** The wave is over (or the run): every move stops and every overlay fades. now: the scene is shutting down,
   * so nothing may touch the game any more (moves check `closing`). */
  clear(now = false): void {
    this.closing = now;
    const safe = (fn: () => void) => {
      try {
        fn();
      } catch (err) {
        // the scene's objects are already being torn down: nothing left to clean
        if (!now) throw err;
      }
    };
    if (this.running) safe(() => this.endTransform(true));
    for (const o of this.overlays) safe(() => (now ? o.kill() : o.end(400)));
    this.overlays = [];
    for (const e of this.effects) safe(() => e.stop());
    this.effects = [];
    this.bar?.remove();
    this.bar = null;
  }

  get reducedMotion(): boolean {
    return save.settings.reducedMotion;
  }
}
