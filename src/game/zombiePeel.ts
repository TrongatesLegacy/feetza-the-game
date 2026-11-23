// Zombie Outbreak: the Zombie Toes peel's ability, and the zombie perk every zombified foot peel adds to its foot's
// own (src/game/abilities.ts, ZOMBIE_PERK for the numbers).
//
// - A kill: a chance to heal a slice on the weakest pizza.
// - A smack that lands on an ordinary foot (canZombify: no boss, boss fight piece, undead or zombie): a chance to turn
//   it into a FRIENDLY zombie. It rots as the Zombie Loafer's do (src/game/zombieArt.ts) but holds still and is
//   immune (Foot.zombieHold: not hittable, takes no damage), and wears a leg badge (src/game/legBadge.ts) so it reads
//   as yours: a heart, HUNT with a countdown ring, BITE!, then BOOM! on a flashing fuse.
//   1. It hunts for up to a second for an ordinary foot within reach (the next lane over), then rears back, lunges and
//      bites it for 3×. A kill heals a slice; a foot that lives turns too (it's spared this zombie's burst) and goes
//      through the same steps, up to 4 zombies per smack.
//   2. Then, bite or no bite, it bursts: 4× to every foot round it (its lane and its neighbours'), a green-black gore
//      burst with chunks, a shockwave and a splat. A burst that kills heals a slice. The zombie itself goes down with it
//      (and counts as a zombified foot defeated, for its zombie peel).
// - Every slice it heals counts towards a cap per wave, by heat.
//
// Gameplay rolls use the game's random sequence (Math.random, seeded in the balance sim); everything cosmetic uses
// crand().

import Phaser from 'phaser';
import { ZOMBIE_PERK } from './abilities';
import { rng, blob, makeCanvas } from '../art/util';
import { audio } from '../systems/audio';
import { crand } from '../systems/cosmeticRandom';
import type { Foot } from './Foot';
import type { Fx } from './Fx';
import type { Pizza } from './Pizza';
import { LegBadge, type LegBadgeShow } from './legBadge';
import { ZombieLook, canZombify, cosmetic, prepareZombie, stepZombieBuilds } from './zombieArt';

/** What the outbreak may touch in the scene (GameScene). */
export interface OutbreakHost {
  sc: Phaser.Scene;
  fx: Fx;
  fxLayer: Phaser.GameObjects.Container;
  underLayer: Phaser.GameObjects.Container;
  feet(): Foot[];
  alivePizzas(): Pizza[];
  /** One smack's damage right now. */
  smack(): number;
  /** Peel-ability damage (no crit), knocked away from (kx, ky). */
  damage(f: Foot, amount: number, kx: number, ky: number): void;
  /** Take a foot down as an ability kill (it pays out as usual). */
  kill(f: Foot): void;
  /** Heal a slice on a pizza; how many it healed. */
  heal(p: Pizza, n: number): number;
  heatRank(): number;
  /** A wave is on (not the shop, not over). */
  live(): boolean;
  shake(ms: number, k: number): void;
  /** The ability in use has the zombie perk (zombie art is only built then). */
  zombieOn(): boolean;
  /** A zombie that burst but was spared the killing blow still counts as a zombified foot defeated. */
  zombieDown(f: Foot): void;
}

/** A gore chunk in flight (one shared ticker moves them all). */
interface Chunk {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  spin: number;
  floor: number;
  life: number;
}

type Phase = 'turn' | 'hunt' | 'bite' | 'fuse';

interface Link {
  f: Foot;
  look: ZombieLook;
  badge: LegBadge;
  /** The smack that started it: its zombies so far. */
  chain: { n: number };
  phase: Phase;
  t: number;
  /** The foot it bites, and which way (towards it). */
  prey: Foot | null;
  dir: number;
  bitten: boolean;
  /** Feet its burst leaves alone (the foot it bit is turning). */
  spared: Set<Foot>;
}

/** Seconds: the change, the rear-back before the bite (it lands at the end), the fuse. */
const TURN = 0.55;
const BITE = 0.32;
const FUSE = 0.6;
/** When in the fuse it blinks. */
const FUSE_BLINKS = [0.02, 0.22, 0.36, 0.46, 0.54];
/** How long each blink lasts (short: the rotted art reads between them right up to the burst). */
const BLINK_MS = 30;
/** The friendly zombies' look: a cream patch, a green heart (the Loafer's zombies wear no badge: a green reticle). */
const BADGE_LOOK = { kind: 'patch' as const, base: '#fff1d0', accent: '#34c84a' };
const ALLY = '#8dff7a';
const GORE = [0x9bbf4a, 0x6f8a2a, 0x3a4a18, 0x1a2010];
/** The badge's face centre stays below this (room for its icon, clear of the HUD). */
const BADGE_TOP = 150;

/** Sounds the outbreak plays (preloaded with the peel: they aren't boot sounds). */
export const OUTBREAK_SFX = ['sfx_poltergeist_infect', 'sfx_poltergeist_turn', 'sfx_poltergeist_bite', 'sfx_poltergeist_flies', 'sfx_poltergeist_sick', 'sfx_zpeel_blast', 'sfx_zpeel_splat'];

export class ZombieOutbreak {
  private links: Link[] = [];
  /** Feet turning or bitten mid-chain (nothing else may claim them). */
  private claimed = new Set<Foot>();
  /** Slices healed this wave. */
  healed = 0;
  /** A bite or burst is dealing damage (its kills heal by their own rule, not the kill roll). */
  private dealing = false;
  /** Feet whose zombie art is on its way (built in the background, so a turn never hitches). */
  private prepared = new WeakSet<Foot>();
  private prepT = 0;
  /** Counts for dev checks (F.outbreak()). */
  stats = { turned: 0, bites: 0, biteKills: 0, bursts: 0, burstKills: 0, killHeals: 0, heals: 0, capped: 0 };
  /** Its numbers (dev checks can change them for a test). */
  readonly perk = ZOMBIE_PERK;
  private chunks: Chunk[] = [];

  constructor(private h: OutbreakHost) {
    // one ticker for every gore chunk in flight (on the scene's clock, so slow-mo slows them)
    h.sc.events.on('update', this.chunkTick, this);
  }

  private chunkTick(_t: number, ms: number): void {
    if (!this.chunks.length) return;
    const dt = Math.min(0.05, ms / 1000) * this.h.sc.tweens.timeScale;
    this.chunks = this.chunks.filter((c) => {
      c.life += dt;
      c.vy += 1500 * dt;
      c.vx *= 1 - 0.6 * dt;
      c.img.x += c.vx * dt;
      c.img.y += c.vy * dt;
      c.img.angle += c.spin * dt;
      if (c.img.y > c.floor && c.vy > 0) {
        c.img.y = c.floor;
        c.vy *= -0.25;
        c.vx *= 0.5;
        c.spin *= 0.4;
      }
      if (c.life > 0.9) c.img.setAlpha(Math.max(0, 1 - (c.life - 0.9) / 0.5));
      if (c.life > 1.4 || !c.img.active) {
        c.img.destroy();
        return false;
      }
      return true;
    });
  }

  private get cap(): number {
    return ZOMBIE_PERK.heals[Math.max(0, Math.min(4, this.h.heatRank()))];
  }

  /** A new wave: the heal cap starts again. */
  wave(): void {
    this.healed = 0;
  }

  /** A smack landed on `f` (x: where the peel was). */
  smacked(f: Foot, x: number): void {
    if (!this.h.live() || !f.alive || !f.hittable || this.claimed.has(f) || !canZombify(f)) return;
    if (Math.random() >= ZOMBIE_PERK.turn) return;
    this.turn(f, x < f.x ? -1 : 1, { n: 0 });
  }

  /** A foot went down (any source). The bite and burst heal by their own rule. */
  killed(f: Foot): void {
    if (this.dealing || f.zombieHold) return;
    if (Math.random() < ZOMBIE_PERK.killHeal && this.healOne(f.cx, f.cy)) this.stats.killHeals++;
  }

  /** Heal a slice on the weakest pizza, under the wave's cap. */
  private healOne(x: number, y: number): boolean {
    if (this.healed >= this.cap) {
      this.stats.capped++;
      return false;
    }
    const p = [...this.h.alivePizzas()].filter((q) => q.slices < q.maxSlices).sort((a, b) => a.slices / a.maxSlices - b.slices / b.maxSlices)[0];
    if (!p || this.h.heal(p, 1) <= 0) return false;
    this.healed++;
    this.stats.heals++;
    // a green heart flies from where it happened to the pizza
    const sc = this.h.sc;
    const hrt = sc.add.image(x, y, ZombieOutbreak.heartTex(sc)).setScale(0.6).setDepth(5);
    this.h.fxLayer.add(hrt);
    sc.tweens.add({ targets: hrt, x: p.x, y: p.surfaceY - 40, scale: 0.9, duration: 420, ease: 'Sine.In', onComplete: () => hrt.destroy() });
    return true;
  }

  /** Turn a foot into a friendly zombie (side: which side the bite or smack came from). */
  private turn(f: Foot, side: number, chain: { n: number }): void {
    const h = this.h;
    // its looks first: if they can't be built, the foot simply carries on as it was (never stuck immune)
    let look: ZombieLook | null = null;
    let badge: LegBadge | null = null;
    try {
      look = new ZombieLook(f, side, (k, o) => audio.sfx(k, o));
      look.bite();
      badge = new LegBadge(h.sc, f.root, 0, -f.meta.footHeight * f.type.scale - 72, BADGE_LOOK);
    } catch (e) {
      look?.release();
      badge?.destroy();
      if (import.meta.env?.DEV) console.error('[zombiePeel] turning', f.type.id, e);
      return;
    }
    chain.n++;
    this.stats.turned++;
    this.claimed.add(f);
    f.zombified = true;
    f.holdAsZombie(true);
    // (a boss's mark on it goes: it's ours now)
    f.brain.marked = false;
    // (its own badge, a guard shield's, makes way for the ally badge)
    f.guardFx?.setBadgeVisible(false);
    const link: Link = { f, look, badge, chain, phase: 'turn', t: 0, prey: null, dir: 1, bitten: false, spared: new Set() };
    this.links.push(link);
    const [wx, wy] = look.woundWorld();
    cosmetic(() => {
      h.fx.ring(wx, wy, 0x8adf4a, 0.7, 0.8);
      h.fx.ring(f.cx, f.cy, 0xfff1d0, 1.1, 0.6);
      h.fx.quip(f.x, Math.max(300, f.cy - 150), chain.n === 1 ? 'ZOMBIE PAL!' : 'IT TURNS!', ALLY, chain.n === 1 ? 40 : 34, (crand() - 0.5) * 12);
    });
    audio.sfx('sfx_poltergeist_infect', { volume: 0.8, throttle: 120 });
    this.badgeTick(link, 0);
  }

  update(dt: number): void {
    const h = this.h;
    // with the perk in use, zombie art builds in the background for every foot that could turn (no other peel pays
    // for it); links already going finish whatever the peel (Shape-Shift can swap it mid-chain)
    if (h.zombieOn()) {
      this.prepT -= dt;
      if (this.prepT <= 0) {
        this.prepT = 0.4;
        for (const f of h.feet()) {
          if (this.prepared.has(f) || !f.alive || !canZombify(f) || f.y < -40) continue;
          this.prepared.add(f);
          prepareZombie(f);
        }
      }
      stepZombieBuilds(3);
    }
    if (this.links.length) for (const l of [...this.links]) this.step(l, dt);
  }

  private step(l: Link, dt: number): void {
    const f = l.f;
    if (!f.alive || !f.root.active) return this.drop(l);
    l.t += dt;
    switch (l.phase) {
      case 'turn':
        if (l.t >= TURN * 0.55 && l.t - dt < TURN * 0.55) audio.sfx('sfx_poltergeist_turn', { volume: 0.7, rate: 1.05 + crand() * 0.15, throttle: 250 });
        if (l.t >= TURN) this.go(l, 'hunt');
        break;
      case 'hunt': {
        const prey = this.findPrey(f);
        if (prey && this.h.live()) {
          l.prey = prey;
          l.dir = Math.sign(prey.x - f.x) || 1;
          this.claimed.add(prey);
          l.look.windup(l.dir);
          this.go(l, 'bite');
        } else if (l.t >= ZOMBIE_PERK.hunt) this.go(l, 'fuse');
        break;
      }
      case 'bite':
        if (!l.bitten && l.t >= BITE) this.bite(l);
        if (l.t >= BITE + 0.28) this.go(l, 'fuse');
        break;
      case 'fuse':
        if (l.t - dt <= 0.001) {
          l.look.swell();
          audio.sfx('sfx_poltergeist_sick', { volume: 0.55, rate: 1.2, throttle: 120 });
        }
        // it blinks, faster and faster, as the fuse runs down (a bomb's tick)
        for (const at of FUSE_BLINKS) if (l.t >= at && l.t - dt < at) f.flash(0xe8ffc8, BLINK_MS);
        if (l.t >= FUSE) return this.burst(l);
        break;
    }
    this.badgeTick(l, dt);
  }

  private go(l: Link, p: Phase): void {
    l.phase = p;
    l.t = 0;
    l.badge.bump();
  }

  /** The nearest ordinary foot within reach that nothing else has claimed. */
  private findPrey(z: Foot): Foot | null {
    let best: Foot | null = null;
    let bd = Infinity;
    for (const o of this.h.feet()) {
      // (not a foot a boss has marked: the Zombie Loafer's bite is on its way to it)
      if (o === z || !o.hittable || this.claimed.has(o) || o.brain.marked || !canZombify(o)) continue;
      const dx = Math.abs(o.x - z.x);
      const d = Math.hypot(o.cx - z.cx, o.cy - z.cy);
      if (dx > ZOMBIE_PERK.reach || d > ZOMBIE_PERK.reach * 1.25 || o.cy < 120) continue;
      if (d < bd) {
        bd = d;
        best = o;
      }
    }
    return best;
  }

  /** The lunge: jaws snap shut on the prey, 3×. A kill heals; a foot that lives turns too (and is spared the burst). */
  private bite(l: Link): void {
    const h = this.h;
    l.bitten = true;
    const t = l.prey;
    l.look.lunge(l.dir);
    // (what it reared back at may have gone under, phased, been carried off or left the screen since)
    if (!t || !t.alive || !t.hittable) {
      if (t) this.claimed.delete(t);
      return;
    }
    this.stats.bites++;
    this.jaws(l.f, t);
    audio.sfx('sfx_poltergeist_bite', { volume: 0.9, throttle: 60 });
    cosmetic(() => h.fx.impact(t.cx, t.cy, true));
    const was = t.alive;
    this.dealing = true;
    try {
      h.damage(t, ZOMBIE_PERK.bite * h.smack(), l.f.cx, l.f.cy);
    } finally {
      this.dealing = false;
    }
    this.claimed.delete(t);
    if (was && !t.alive) {
      this.stats.biteKills++;
      cosmetic(() => h.fx.quip(t.x, Math.max(300, t.cy - 140), 'CHOMP!', ALLY, 40, (crand() - 0.5) * 12));
      this.healOne(t.cx, t.cy);
    } else if (t.alive && l.chain.n < ZOMBIE_PERK.links && canZombify(t) && h.live()) {
      l.spared.add(t);
      this.turn(t, -l.dir, l.chain);
    } else if (t.alive) cosmetic(() => h.fx.quip(t.x, Math.max(300, t.cy - 140), 'CHOMP!', ALLY, 34, (crand() - 0.5) * 12));
  }

  /** The burst: 4× round it, then it goes down. */
  private burst(l: Link): void {
    const h = this.h;
    const z = l.f;
    const x = z.cx;
    const y = z.cy;
    this.stats.bursts++;
    cosmetic(() => this.gore(z));
    let kills = 0;
    this.dealing = true;
    try {
      for (const o of [...h.feet()]) {
        if (o === z || !o.hittable || l.spared.has(o)) continue;
        if (Math.hypot(o.cx - x, o.cy - y) > ZOMBIE_PERK.radius) continue;
        const was = o.alive;
        h.damage(o, ZOMBIE_PERK.blast * h.smack(), x, y);
        if (was && !o.alive) kills++;
      }
    } finally {
      this.dealing = false;
    }
    if (kills) {
      this.stats.burstKills += kills;
      this.healOne(x, y);
    }
    // it goes down with it (a zombified foot defeated: GameScene.killFoot counts it), no getting back up
    this.drop(l);
    z.holdAsZombie(false);
    z.reviveUsed = true;
    z.wool = 0;
    this.dealing = true;
    try {
      h.kill(z);
    } finally {
      this.dealing = false;
    }
    if (z.alive) {
      // (spared the killing blow by something: it's gone anyway, and still counts as a zombified foot defeated)
      h.zombieDown(z);
      z.die();
    }
    // nothing left of it: the foot is gone in the burst (not yanked off as a smacked foot is)
    h.sc.tweens.add({ targets: z.root, alpha: 0, scaleX: z.root.scaleX * 1.25, scaleY: z.root.scaleY * 0.8, duration: 70, ease: 'Quad.Out' });
  }

  /** It's done (burst, or killed some other way): its badge and look go, its claim lifts. */
  private drop(l: Link): void {
    const i = this.links.indexOf(l);
    if (i >= 0) this.links.splice(i, 1);
    this.claimed.delete(l.f);
    if (l.prey) this.claimed.delete(l.prey);
    l.badge.destroy();
    l.look.release();
    if (l.f.alive) {
      l.f.holdAsZombie(false);
      l.f.guardFx?.setBadgeVisible(true);
    }
  }

  /** End everything (the scene is going, or the run ended). */
  clear(): void {
    for (const l of [...this.links]) this.drop(l);
    this.claimed.clear();
    for (const c of this.chunks) c.img.destroy();
    this.chunks = [];
    this.h.sc.events.off('update', this.chunkTick, this);
  }

  // ——— the badge ———

  private badgeTick(l: Link, dt: number): void {
    const f = l.f;
    let show: LegBadgeShow;
    switch (l.phase) {
      case 'turn':
        show = { word: 'ALLY', icon: 'allyHeart', ring: { frac: l.t / TURN, color: '#34c84a' } };
        break;
      case 'hunt':
        show = { word: 'HUNT', icon: 'allyHunt', ring: { frac: 1 - l.t / ZOMBIE_PERK.hunt, color: '#34c84a' } };
        break;
      case 'bite':
        show = { word: 'BITE!', icon: 'allyBite', state: 'go' };
        break;
      default: {
        const flash = Math.floor(l.t / 0.09) % 2 === 0;
        show = { word: 'BOOM!', icon: 'allyBomb', ring: { frac: 1 - l.t / FUSE, color: '#ff8a1c' }, state: flash ? 'hot' : 'bad' };
      }
    }
    l.badge.set(show);
    // on the leg just above the foot; with the leg off the top of the screen it rides over the foot (as the guard
    // shield's badge does)
    const rs = f.root.scaleY || 1;
    const ankle = -f.meta.footHeight * f.type.scale;
    const want = ankle - 72;
    const minY = f.legCropped ? -Infinity : (BADGE_TOP - f.root.y) / rs;
    l.badge.img.setPosition(0, minY <= want ? want : minY);
    l.badge.update(dt, -f.root.rotation);
  }

  // ——— the looks ———

  /** The table line under x: the nearest pizza's surface (the plates sit on it), or the pizzas' usual line. */
  private tableY(x: number): number {
    let best: Pizza | null = null;
    for (const p of this.h.alivePizzas()) if (!best || Math.abs(p.x - x) < Math.abs(best.x - x)) best = p;
    return best ? best.surfaceY + 34 : 900;
  }

  /** Jaws close on the prey, a green streak from the zombie. */
  private jaws(z: Foot, t: Foot): void {
    const sc = this.h.sc;
    const key = ZombieOutbreak.jawTex(sc);
    const g = sc.add.graphics();
    this.h.fxLayer.add(g);
    const x0 = z.cx;
    const y0 = z.cy - 20;
    const x1 = t.cx;
    const y1 = t.cy;
    const mx = (x0 + x1) / 2;
    const my = Math.min(y0, y1) - 80;
    sc.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 260,
      onUpdate: (tw) => {
        const k = tw.getValue() ?? 0;
        g.clear();
        g.lineStyle(14 * (1 - k * 0.6), 0x6f9a2a, 0.75 * (1 - k));
        const c = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(x0, y0), new Phaser.Math.Vector2(mx, my), new Phaser.Math.Vector2(x1, y1));
        c.draw(g, 16);
      },
      onComplete: () => g.destroy(),
    });
    for (const s of [-1, 1]) {
      const j = sc.add.image(x1, y1 + s * 70, key).setFlipY(s > 0).setScale(0.9).setAlpha(0);
      this.h.fxLayer.add(j);
      sc.tweens.add({ targets: j, alpha: 1, duration: 60 });
      sc.tweens.add({ targets: j, y: y1 + s * 14, duration: 140, ease: 'Back.In', onComplete: () => sc.tweens.add({ targets: j, alpha: 0, scale: 1.1, duration: 260, delay: 120, onComplete: () => j.destroy() }) });
    }
  }

  /** The burst: a flash, a green-black gore burst with chunks, a shockwave ring and a splat on the floor. */
  private gore(z: Foot): void {
    const h = this.h;
    const sc = h.sc;
    const x = z.cx;
    const y = z.cy;
    const R = ZOMBIE_PERK.radius;
    audio.sfx('sfx_zpeel_blast', { volume: 1, rate: 0.95 + crand() * 0.1, throttle: 80 });
    sc.time.delayedCall(200, () => audio.sfx('sfx_zpeel_splat', { volume: 0.9, rate: 0.9 + crand() * 0.2, throttle: 80 }));
    h.shake(260, 0.009);
    // a local burst of sickly light (not a screen flash: it lands on a busy screen, often in a chain)
    const glow = sc.add.image(x, y, 'glow').setTint(0x9bff6a).setBlendMode(Phaser.BlendModes.ADD).setScale(0.6).setAlpha(0.9);
    h.fxLayer.add(glow);
    sc.tweens.add({ targets: glow, scale: (R / 100) * 1.6, alpha: 0, duration: 300, ease: 'Quad.Out', onComplete: () => glow.destroy() });
    // the core: a dark bloom under a bright green one
    for (const [tint, s0, s1, a, dur, blend] of [
      [0x10180a, 0.4, (R / 100) * 1.25, 1, 480, Phaser.BlendModes.NORMAL],
      [0x4a6a1c, 0.3, (R / 100) * 1.0, 1, 380, Phaser.BlendModes.NORMAL],
      [0xb8ff7a, 0.2, (R / 100) * 0.75, 0.95, 240, Phaser.BlendModes.ADD],
    ] as const) {
      const b = sc.add.image(x, y, 'burst').setTint(tint).setScale(s0).setAlpha(a).setAngle(crand() * 360).setBlendMode(blend);
      h.fxLayer.add(b);
      sc.tweens.add({ targets: b, scale: s1, alpha: 0, angle: b.angle + 50, duration: dur, ease: 'Quad.Out', onComplete: () => b.destroy() });
    }
    // the shockwave: a fat ring racing out to the edge of the blast, a thin bright one inside it
    const ring = sc.add.graphics();
    h.fxLayer.add(ring);
    sc.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 380,
      ease: 'Cubic.Out',
      onUpdate: (tw) => {
        const k = tw.getValue() ?? 0;
        ring.clear();
        ring.lineStyle(26 * (1 - k) + 2, 0x2a3a14, 0.7 * (1 - k));
        ring.strokeEllipse(x, y, R * 2 * k, R * 1.5 * k);
        ring.lineStyle(6 * (1 - k) + 1, 0xc8ff8a, 0.9 * (1 - k));
        ring.strokeEllipse(x, y, R * 1.9 * k, R * 1.42 * k);
      },
      onComplete: () => ring.destroy(),
    });
    h.fx.ring(x, y, 0x9bff6a, (R * 2) / 256, 0.75);
    // chunks: lumps of rotten foot, bone chips and globs of black ichor, flung out and falling
    const key = ZombieOutbreak.chunkTex(sc);
    // the table: the line the pizzas sit on under it (gore lands there, not in mid-air under a hovering foot)
    const floor = this.tableY(x);
    for (let i = 0, n = 22; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + crand() * 0.4;
      const sp = 380 + crand() * 520;
      const vx = Math.cos(a) * sp;
      const vy = Math.sin(a) * sp * 0.8 - 360;
      const c = sc.add.image(x + Math.cos(a) * 20, y + Math.sin(a) * 20, key, Math.floor(crand() * 4)).setScale(0.7 + crand() * 0.6).setAngle(crand() * 360);
      h.fxLayer.add(c);
      const spin = (crand() - 0.5) * 900;
      this.chunks.push({ img: c, vx, vy, spin, floor: floor - 6 + crand() * 18, life: 0 });
    }
    // a spray of droplets
    for (let i = 0; i < 26; i++) {
      const a = crand() * Math.PI * 2;
      const d = R * (0.35 + crand() * 0.75);
      const dot = sc.add.circle(x, y, 6 + crand() * 9, GORE[Math.floor(crand() * 4)], 1);
      h.fxLayer.add(dot);
      sc.tweens.add({ targets: dot, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.7 + 40, alpha: 0, scale: 0.4, duration: 380 + crand() * 300, ease: 'Quad.Out', onComplete: () => dot.destroy() });
    }
    h.fx.puff(x, y, 6);
    // the splat it leaves where it stood, under everything, fading
    const sp = sc.add.image(x, floor, ZombieOutbreak.splatTex(sc)).setScale(0.3, 0.2).setAlpha(0.95).setAngle((crand() - 0.5) * 10);
    h.underLayer.add(sp);
    sc.tweens.add({ targets: sp, scaleX: 1.15, scaleY: 0.8, duration: 160, ease: 'Back.Out' });
    sc.tweens.add({ targets: sp, alpha: 0, delay: 1800, duration: 900, onComplete: () => sp.destroy() });
    h.fx.quip(x, Math.max(300, y - 170), 'SPLAT!', '#c8ff8a', 52, (crand() - 0.5) * 14);
  }

  // ——— textures (drawn once) ———

  static heartTex(sc: Phaser.Scene): string {
    const k = 'zp_heart';
    if (sc.textures.exists(k)) return k;
    const [c, g] = makeCanvas(64, 60);
    g.translate(32, 30);
    g.beginPath();
    g.moveTo(0, 24);
    g.bezierCurveTo(-32, 2, -24, -26, 0, -11);
    g.bezierCurveTo(24, -26, 32, 2, 0, 24);
    g.closePath();
    const gr = g.createLinearGradient(0, -26, 0, 24);
    gr.addColorStop(0, '#b8ff9a');
    gr.addColorStop(1, '#2c9a3a');
    g.fillStyle = gr;
    g.fill();
    g.lineWidth = 4;
    g.strokeStyle = '#123d18';
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.7)';
    g.beginPath();
    g.ellipse(-10, -8, 5, 3, -0.6, 0, Math.PI * 2);
    g.fill();
    sc.textures.addCanvas(k, c);
    return k;
  }

  /** A jaw: a curved gum line with teeth (the top one; flipped for the bottom). */
  static jawTex(sc: Phaser.Scene): string {
    const k = 'zp_jaw';
    if (sc.textures.exists(k)) return k;
    const [c, g] = makeCanvas(150, 64);
    g.translate(75, 10);
    g.beginPath();
    g.moveTo(-70, 8);
    g.quadraticCurveTo(0, -14, 70, 8);
    g.lineTo(64, 22);
    g.quadraticCurveTo(0, 6, -64, 22);
    g.closePath();
    g.fillStyle = '#6a8a3a';
    g.fill();
    g.lineWidth = 4;
    g.strokeStyle = '#1e2a0e';
    g.stroke();
    for (let i = -4; i <= 4; i++) {
      const tx = i * 14;
      const ty = 14 - Math.abs(i) * 1.2;
      const len = i === -3 || i === 3 ? 34 : 22;
      g.beginPath();
      g.moveTo(tx - 6, ty);
      g.lineTo(tx + 6, ty);
      g.lineTo(tx + 1, ty + len);
      g.closePath();
      g.fillStyle = '#e8e2b8';
      g.fill();
      g.lineWidth = 2.5;
      g.strokeStyle = '#2a2a14';
      g.stroke();
    }
    sc.textures.addCanvas(k, c);
    return k;
  }

  /** Gore chunks, 4 frames: a rotten lump, a torn strip, a bone chip, a glob of black ichor. */
  static chunkTex(sc: Phaser.Scene): string {
    const k = 'zp_chunk';
    if (sc.textures.exists(k)) return k;
    const S = 56;
    const [c, g] = makeCanvas(S * 4, S);
    const r = rng(0x20b1e);
    for (let i = 0; i < 4; i++) {
      g.save();
      g.translate(i * S + S / 2, S / 2);
      if (i === 2) {
        // a bone chip
        g.rotate(0.5);
        g.beginPath();
        g.roundRect(-16, -5, 32, 10, 5);
        for (const s of [-1, 1]) {
          g.moveTo(s * 16 + 6, -6);
          g.arc(s * 16, -4, 6, 0, Math.PI * 2);
          g.moveTo(s * 16 + 6, 6);
          g.arc(s * 16, 4, 6, 0, Math.PI * 2);
        }
        g.fillStyle = '#e8e0c0';
        g.fill();
        g.lineWidth = 3;
        g.strokeStyle = '#3a3420';
        g.stroke();
      } else {
        blob(g, 0, 0, i === 3 ? 16 : 20, 0.6, r, 9);
        const gr = g.createRadialGradient(-6, -6, 2, 0, 0, 22);
        if (i === 3) {
          gr.addColorStop(0, '#4a5a2a');
          gr.addColorStop(1, '#0c1008');
        } else {
          gr.addColorStop(0, i === 0 ? '#b8c878' : '#9a6a7a');
          gr.addColorStop(0.6, i === 0 ? '#7f9a4a' : '#6a3a4a');
          gr.addColorStop(1, '#2a3414');
        }
        g.fillStyle = gr;
        g.fill();
        g.lineWidth = 3;
        g.strokeStyle = '#141a0a';
        g.stroke();
        g.fillStyle = 'rgba(255,255,220,0.5)';
        g.beginPath();
        g.ellipse(-7, -7, 5, 3, -0.5, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
    }
    const tex = sc.textures.addCanvas(k, c)!;
    for (let i = 0; i < 4; i++) tex.add(i, 0, i * S, 0, S, S);
    return k;
  }

  /** The splat on the floor: dark green-black blots with a lighter rim and droplets round them. */
  static splatTex(sc: Phaser.Scene): string {
    const k = 'zp_splat';
    if (sc.textures.exists(k)) return k;
    const [c, g] = makeCanvas(360, 150);
    const r = rng(0x5b1a7);
    g.translate(180, 75);
    g.save();
    g.scale(1, 0.42);
    blob(g, 0, 0, 120, 0.5, r, 16);
    g.fillStyle = '#2a3614';
    g.fill();
    blob(g, 0, 0, 90, 0.45, r, 14);
    g.fillStyle = '#121808';
    g.fill();
    g.restore();
    for (let i = 0; i < 22; i++) {
      const a = r() * Math.PI * 2;
      const d = 110 + r() * 60;
      g.beginPath();
      g.ellipse(Math.cos(a) * d, Math.sin(a) * d * 0.4, 4 + r() * 9, (4 + r() * 9) * 0.5, 0, 0, Math.PI * 2);
      g.fillStyle = r() < 0.5 ? '#3a4a18' : '#6f8a2a';
      g.fill();
    }
    g.fillStyle = 'rgba(180,230,120,0.35)';
    g.beginPath();
    g.ellipse(-30, -14, 40, 8, -0.1, 0, Math.PI * 2);
    g.fill();
    sc.textures.addCanvas(k, c);
    return k;
  }
}
