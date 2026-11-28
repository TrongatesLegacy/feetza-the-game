// Thrown props: one shared system for every throw (peel abilities and topping procs). A prop leaves the
// peel's head after a little flick, flies, and its hit lands when it arrives (not at launch). Each prop spins
// or tumbles, leaves a short trail in its colour, squashes on impact with a burst, and fades when it's done.
//
// Rules so the screen stays readable: at most 12 in flight (extras wait in a queue for a moment), props
// never touch pizzas or the peel, and they only pick visible, hittable feet.

import Phaser from 'phaser';
import { H, TABLE_Y, W } from '../config';
import { audio } from '../systems/audio';
import type { ThrowFx, ThrowProp } from './abilities';
import type { Foot } from './Foot';
import type { Fx } from './Fx';
import { cpick, crand } from '../systems/cosmeticRandom';

export const MAX_IN_FLIGHT = 12;
/** A queued throw that can't launch within this long is dropped (its moment has passed). */
const QUEUE_LIFE = 1.5;

type OnHit = (f: Foot, smacks: number) => void;

export interface ThrowHost {
  /** The cursor peel (for the flick). */
  peel: () => Phaser.GameObjects.Image;
  peelPos: () => { x: number; y: number };
  feet: () => Foot[];
}

interface Look {
  /** Display size in px (longest side). */
  size: number;
  color: number;
  /** Spin speed (degrees a second); tumble squashes it as it turns, like a flat thing flipping. */
  spin: number;
  tumble?: boolean;
  /** Points along its flight (arrows, bolts, rockets: drawn nose to the right). */
  point?: boolean;
  launch: string;
  impact: string;
}

// Sound families: soft splats, light hard ticks, spinning discs, heavy lumps, ropes.
const SOFT = { launch: 'sfx_tosssoft', impact: 'sfx_hitsplat' };
const TINK = { launch: 'sfx_tossflick', impact: 'sfx_hittink' };
const DISC = { launch: 'sfx_tossspin', impact: 'sfx_hitclang' };
const BONK = { launch: 'sfx_tossspin', impact: 'sfx_hitbonk' };
const HEAVY = { launch: 'sfx_tossheavy', impact: 'sfx_hitthud' };
const ROPE = { launch: 'sfx_tossrope', impact: 'sfx_hitrope' };

const LOOK: Record<ThrowProp, Look> = {
  tomato: { size: 66, color: 0xe5402a, spin: 540, ...SOFT },
  toenail: { size: 50, color: 0xf3e6c0, spin: 1400, ...TINK },
  polish: { size: 58, color: 0xff4fa8, spin: 300, ...SOFT },
  coin: { size: 58, color: 0xffd23f, spin: 900, tumble: true, ...TINK, impact: 'sfx_hitcoin' },
  crust: { size: 74, color: 0xd99a4a, spin: 480, ...HEAVY },
  plate: { size: 96, color: 0xf4f6fa, spin: 1100, ...DISC },
  duck: { size: 78, color: 0xffd23f, spin: 420, ...BONK, launch: 'sfx_tosssoft', impact: 'sfx_hitsqueak' },
  ring: { size: 96, color: 0xff5a3c, spin: 260, ...ROPE },
  pineapple: { size: 80, color: 0xffd23f, spin: 0, ...HEAVY, impact: 'sfx_hitbonk' },
  spinach: { size: 78, color: 0x4caf50, spin: 520, ...HEAVY, impact: 'sfx_hitclang' },
  grenade: { size: 72, color: 0x6aa84f, spin: 380, ...HEAVY, impact: 'sfx_hitboom' },
  square: { size: 66, color: 0xffc23d, spin: 1300, ...TINK },
  dumbbell: { size: 112, color: 0x8a929e, spin: 360, ...HEAVY },
  dough: { size: 68, color: 0xf6e6c4, spin: 260, ...SOFT },
  rattle: { size: 82, color: 0xff7ad9, spin: 820, ...BONK, launch: 'sfx_tossflick', impact: 'sfx_hitrattle' },
  football: { size: 78, color: 0xffffff, spin: 700, ...BONK },
  bowling: { size: 88, color: 0x4c7dff, spin: 0, ...HEAVY },
  cannon: { size: 82, color: 0x3a3a44, spin: 200, ...HEAVY, impact: 'sfx_hitboom' },
  flatbread: { size: 104, color: 0xe08a3a, spin: 1000, ...DISC, impact: 'sfx_hitbonk' },
  pie: { size: 96, color: 0xfff4e0, spin: 160, ...SOFT },
  olive: { size: 46, color: 0x4a7a2a, spin: 900, ...TINK, impact: 'sfx_hitsplat' },
  clutter: { size: 76, color: 0xff9f1c, spin: 900, ...TINK, impact: 'sfx_hitclang' },
  coconut: { size: 80, color: 0x8a5a32, spin: 420, ...HEAVY },
  lasso: { size: 104, color: 0xc8904a, spin: 600, ...ROPE },
  skateboard: { size: 124, color: 0xff9f1c, spin: 720, tumble: true, ...DISC },
  anchovy: { size: 84, color: 0xa8c4dc, spin: 200, ...SOFT },
  meatball: { size: 64, color: 0xb0603a, spin: 520, ...HEAVY, impact: 'sfx_hitsplat' },
  pizzacutter: { size: 96, color: 0xc7ccd4, spin: 1300, ...DISC },
  calzone: { size: 100, color: 0xe8a040, spin: 320, ...HEAVY, impact: 'sfx_hitboom' },
  napkin: { size: 76, color: 0xfff4e0, spin: 600, tumble: true, ...SOFT },
  cloche: { size: 92, color: 0xe8edf2, spin: 260, ...DISC },
  wheelcutter: { size: 100, color: 0xc7ccd4, spin: 0, ...DISC },
  // hero props (src/content/props/heroes.ts)
  wingrang: { size: 104, color: 0xffd23f, spin: 1300, ...DISC, launch: 'sfx_tossspin', impact: 'sfx_hitclang' },
  shield: { size: 110, color: 0x3a6ad8, spin: 900, ...DISC },
  arrow: { point: true, size: 96, color: 0x7a4a9a, spin: 0, ...TINK },
  card: { size: 70, color: 0xff3d6e, spin: 1500, tumble: true, ...TINK },
  bolt: { point: true, size: 72, color: 0xff7a2a, spin: 0, ...TINK, impact: 'sfx_hittink' },
  rocket: { point: true, size: 92, color: 0x8a929e, spin: 0, ...HEAVY, impact: 'sfx_hitboom' },
  crescent: { size: 70, color: 0xe8edf2, spin: 1200, ...TINK },
  // god props (src/content/props/gods.ts)
  hammer: { size: 100, color: 0x9fd8ff, spin: 900, ...HEAVY, impact: 'sfx_hitclang' },
  // King Leonidas (src/content/props/leonidas.ts)
  spear: { point: true, size: 132, color: 0xc9873a, spin: 0, ...TINK, impact: 'sfx_hitclang' },
};

// sizes above are the drawing's units (src/content/props/throws.ts); on screen they show a quarter bigger,
// so they read next to the feet
for (const l of Object.values(LOOK)) l.size = Math.round(l.size * 1.25);

const CLUTTER = ['t_clutter_mug', 't_clutter_spoon', 't_clutter_clock'];

/** One stretch of a flight: from a point towards a moving destination. */
interface Leg {
  x0: number;
  y0: number;
  dest: () => { x: number; y: number };
  dur: number;
  u: number;
  /** Peak height of the arc (px, upwards). */
  arc: number;
  /** Sideways bow (px, + bows to the left of the flight): boomerangs and wild clutter. */
  bow: number;
  ease: (u: number) => number;
  arrive: () => void;
  /** Hit feet it passes through on the way (pierce, roll). */
  sweep?: number;
  /** Split: bursts into pieces this far through the leg. */
  splitAt?: number;
}

interface Shot {
  e: ThrowFx;
  look: Look;
  color: number;
  onHit: OnHit;
  img: Phaser.GameObjects.Image;
  base: number;
  x: number;
  y: number;
  leg: Leg | null;
  hit: Set<Foot>;
  hitN: number;
  spin: number;
  age: number;
  trailT: number;
  /** Rolling: turns with the distance it covers instead of a fixed spin. */
  rolling: boolean;
  /** Stuck to a foot (stick, or a lasso loop): not in flight any more. */
  stuck: { f: Foot; ox: number; oy: number; t: number } | null;
  done: boolean;
  child: boolean;
}

interface Pending {
  e: ThrowFx;
  target: Foot;
  color: number;
  onHit: OnHit;
  /** Seconds until it leaves the peel (the flick's wind-up). */
  wait: number;
  age: number;
}

export class Projectiles {
  private shots: Shot[] = [];
  private queue: Pending[] = [];
  private tethers: { a: Foot; b: Foot; t: number }[] = [];
  private rope: Phaser.GameObjects.Graphics;
  private blind = new Map<Foot, number>();
  private clock = 0;
  private flickAt = -1;

  constructor(
    private scene: Phaser.Scene,
    private layer: Phaser.GameObjects.Container,
    private fx: Fx,
    private host: ThrowHost,
  ) {
    this.rope = scene.add.graphics();
    layer.add(this.rope);
  }

  /** Props in the air (stuck ones don't count). */
  get inFlight(): number {
    return this.shots.filter((s) => !s.done && !s.stuck).length;
  }

  /** A visible foot a prop can hit: not held off-screen, shielded, phased or mid-transformation. */
  static ok(f: Foot): boolean {
    return (
      f.alive && f.hittable && !f.phased && !f.held && !f.pinned && !f.shielded && !(Number(f.brain.transformT ?? 0) > 0) && f.x > 10 && f.x < W - 10 && f.cy > 30 && f.cy < H - 20
    );
  }

  private live(): Foot[] {
    return this.host.feet().filter(Projectiles.ok);
  }

  /** Throw `e` at each foot picked (one prop each). The flick plays once, then the props leave. */
  launch(e: ThrowFx, picks: Foot[], color: number, onHit: OnHit): void {
    let targets = picks.filter(Projectiles.ok);
    if (!targets.length) {
      const any = this.live();
      if (!any.length) return;
      targets = [Phaser.Utils.Array.GetRandom(any)];
    }
    if (e.how === 'beam') {
      this.flick();
      for (const t of targets) this.beam(e, t, color, onHit);
      return;
    }
    const wind = this.flick();
    targets.forEach((t, i) => this.queue.push({ e, target: t, color, onHit, wait: wind + i * 0.09, age: 0 }));
  }

  /** The peel's flick: a short wind-up, a snap forward, a settle. Returns the wind-up time (s). */
  private flick(): number {
    if (this.clock - this.flickAt < 0.25) return Math.max(0, this.flickAt + 0.07 - this.clock);
    this.flickAt = this.clock;
    const peel = this.host.peel();
    if (!peel.visible) return 0.07;
    this.scene.tweens.chain({
      targets: peel,
      tweens: [
        { angle: -46, duration: 70, ease: 'Quad.Out' },
        { angle: -4, duration: 60, ease: 'Quad.In' },
        { angle: -28, duration: 170, ease: 'Back.Out' },
      ],
    });
    return 0.07;
  }

  update(dt: number): void {
    this.clock += dt;
    // queued throws leave when there's room
    for (const p of [...this.queue]) {
      p.age += dt;
      p.wait -= dt;
      if (p.wait > 0) continue;
      if (this.inFlight >= MAX_IN_FLIGHT) {
        if (p.age > QUEUE_LIFE) this.queue.splice(this.queue.indexOf(p), 1);
        continue;
      }
      this.queue.splice(this.queue.indexOf(p), 1);
      const target = Projectiles.ok(p.target) ? p.target : this.nearest(p.target.x, p.target.cy, new Set(), 600);
      if (target) this.spawn(p.e, target, p.color, p.onHit);
    }
    for (const s of this.shots) if (!s.done) this.step(s, dt);
    this.shots = this.shots.filter((s) => !s.done);
    // lassoed pairs: a rope between them until it wears off
    this.rope.clear();
    this.tethers = this.tethers.filter((t) => (t.t -= dt) > 0 && t.a.alive && t.b.alive);
    for (const t of this.tethers) {
      const a = Math.min(1, t.t * 3);
      const mx = (t.a.cx + t.b.cx) / 2;
      const my = (t.a.cy + t.b.cy) / 2 + 40 + Math.sin(this.clock * 6) * 6;
      for (const [w, c] of [[10, 0x2a1810], [5, 0xc8904a]] as const) {
        this.rope.lineStyle(w, c, a);
        const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(t.a.cx, t.a.cy), new Phaser.Math.Vector2(mx, my), new Phaser.Math.Vector2(t.b.cx, t.b.cy));
        curve.draw(this.rope, 20);
      }
    }
  }

  /** A blinded foot misses its stomp (once). Bosses can't be blinded. */
  blindMiss(f: Foot): boolean {
    const until = this.blind.get(f);
    if (until === undefined) return false;
    this.blind.delete(f);
    if (until < this.clock || f.isBossLike) return false;
    this.fx.quip(f.x, f.cy - 120, 'MISSED!', '#fff4e0', 38);
    this.fx.puff(f.x, f.y, 10);
    audio.sfx('sfx_hitsplat', { rate: 0.8, volume: 0.7 });
    for (const s of this.shots) if (s.stuck?.f === f && s.e.blind) s.stuck.t = Math.min(s.stuck.t, 0.15);
    return true;
  }

  /** End of a wave, game over or leaving: props fade out (or vanish, on shutdown). */
  clear(fade = true): void {
    this.queue = [];
    this.tethers = [];
    this.blind.clear();
    this.rope.clear();
    for (const s of this.shots) {
      s.done = true;
      if (!fade || !s.img.scene) {
        s.img.destroy();
        continue;
      }
      this.scene.tweens.add({ targets: s.img, alpha: 0, scale: s.img.scale * 0.6, duration: 200, onComplete: () => s.img.destroy() });
    }
    this.shots = [];
  }

  // ——— flight ———
  private texFor(prop: ThrowProp): string {
    const key = prop === 'clutter' ? cpick(CLUTTER) : `t_${prop}`;
    return this.scene.textures.exists(key) ? key : 'soft';
  }

  private makeShot(e: ThrowFx, color: number, onHit: OnHit, x: number, y: number, child = false): Shot {
    const look = LOOK[e.prop];
    const key = this.texFor(e.prop);
    const img = this.scene.add.image(x, y, key);
    if (key === 'soft') img.setTint(look.color);
    const src = this.scene.textures.get(key).getSourceImage();
    const base = (look.size * (child ? 0.62 : 1)) / Math.max(src.width, src.height);
    img.setScale(base * 0.4).setAngle(crand() * 360);
    this.layer.add(img);
    const wild = e.prop === 'clutter' ? (Math.random() < 0.5 ? -1 : 1) * (1.2 + Math.random()) : 1;
    const s: Shot = { e, look, color, onHit, img, base, x, y, leg: null, hit: new Set(), hitN: 0, spin: look.spin * (crand() < 0.5 ? -1 : 1) * wild, age: 0, trailT: 0, rolling: false, stuck: null, done: false, child };
    this.shots.push(s);
    return s;
  }

  private spawn(e: ThrowFx, target: Foot, color: number, onHit: OnHit): void {
    const p = this.host.peelPos();
    const s = this.makeShot(e, color, onHit, p.x, p.y - 20);
    audio.sfx(s.look.launch, { throttle: 60, volume: 0.9 });
    const how = e.how;
    if (how === 'pierce') return this.pierce(s, target);
    if (how === 'roll') return this.roll(s, target);
    const lobby = how === 'lob' || how === 'explode' || how === 'split';
    const wild = e.prop === 'clutter';
    this.flyTo(s, target, {
      speed: lobby ? 950 : how === 'straight' || how === 'ricochet' ? 1900 : how === 'boomerang' ? 1300 : 1500,
      arc: lobby ? (wild ? 200 + Math.random() * 260 : 260) : how === 'bounce' ? 90 : how === 'stick' ? 60 : 0,
      bow: how === 'boomerang' ? 240 : wild ? (Math.random() - 0.5) * 380 : 0,
      split: how === 'split',
    });
  }

  private flyTo(s: Shot, f: Foot, o: { speed: number; arc: number; bow?: number; split?: boolean }): void {
    let last = { x: f.cx, y: f.cy };
    const dest = () => {
      if (Projectiles.ok(f)) last = { x: f.cx, y: f.cy };
      return last;
    };
    const d = Math.hypot(last.x - s.x, last.y - s.y);
    const lo = o.arc > 150 ? 0.5 : 0.14;
    s.leg = {
      x0: s.x,
      y0: s.y,
      dest,
      dur: Phaser.Math.Clamp(d / o.speed, lo, o.arc > 150 ? 0.95 : 0.6),
      u: 0,
      arc: o.arc,
      bow: o.bow ?? 0,
      // lobs move evenly under their arc; flat throws leave fast and ease in a touch
      ease: o.arc > 150 ? (u) => u : (u) => u * (1.35 - 0.35 * u),
      arrive: () => this.arrive(s, f),
      splitAt: o.split ? 0.5 : undefined,
    };
  }

  private step(s: Shot, dt: number): void {
    s.age += dt;
    if (s.stuck) return this.stepStuck(s, dt);
    const leg = s.leg;
    if (!leg) return;
    leg.u = Math.min(1, leg.u + dt / leg.dur);
    const k = leg.ease(leg.u);
    const d = leg.dest();
    const dx = d.x - leg.x0;
    const dy = d.y - leg.y0;
    const len = Math.hypot(dx, dy) || 1;
    const bow = Math.sin(Math.PI * leg.u) * leg.bow;
    const px = leg.x0 + dx * k + (-dy / len) * bow;
    const py = leg.y0 + dy * k + (dx / len) * bow - leg.arc * 4 * leg.u * (1 - leg.u);
    const moved = Math.hypot(px - s.x, py - s.y);
    if (s.look.point && moved > 0.5) s.img.rotation = Math.atan2(py - s.y, px - s.x);
    s.x = px;
    s.y = py;
    // pop out of the peel, then spin (or roll, or tumble) on the way
    const pop = Math.min(1, s.age / 0.12);
    const sc = s.base * (0.4 + 0.6 * Phaser.Math.Easing.Back.Out(pop));
    if (s.rolling) s.img.angle += ((moved / (s.look.size / 2)) * 180) / Math.PI * Math.sign(dx || 1);
    else if (!s.look.point) s.img.angle += s.spin * dt;
    s.img.setPosition(px, py).setScale(sc, s.look.tumble ? sc * (0.45 + 0.55 * Math.abs(Math.cos(s.age * 9))) : sc);
    s.trailT -= dt;
    if (s.trailT <= 0) {
      s.trailT = 0.018;
      this.fx.propTrail(px, py, s.look.color, s.look.size / 150);
    }
    if (leg.sweep) for (const f of this.live()) if (!s.hit.has(f) && f.distanceTo(px, py) < leg.sweep) this.strike(s, f, false);
    if (leg.splitAt !== undefined && leg.u >= leg.splitAt) return this.split(s);
    if (leg.u >= 1) leg.arrive();
  }

  private stepStuck(s: Shot, dt: number): void {
    const st = s.stuck!;
    st.t -= dt;
    const f = st.f;
    if (f.alive) s.img.setPosition(f.x + st.ox, f.cy + st.oy + Math.sin(s.age * 5) * 3);
    if (st.t <= 0 || !f.alive) {
      s.stuck = null;
      this.finish(s, true);
    }
  }

  /** Damage for the shot's next hit. */
  private dmgNext(s: Shot): number {
    const seq = [s.e.x, ...(s.e.more ?? [])];
    return seq[Math.min(s.hitN, seq.length - 1)];
  }

  /** A hit lands: damage and riders, a squash and a burst in the prop's colour. */
  private strike(s: Shot, f: Foot, squash = true, smacks = this.dmgNext(s)): void {
    s.hit.add(f);
    s.hitN++;
    s.onHit(f, smacks);
    if (s.e.blind && !f.isBossLike) this.blind.set(f, this.clock + s.e.blind);
    this.fx.propBurst(f.cx, f.cy, s.look.color, s.child ? 0.6 : 1);
    audio.sfx(s.look.impact, { throttle: 50, volume: s.child ? 0.6 : 0.9 });
    if (squash) this.squash(s);
  }

  private squash(s: Shot): void {
    const sc = s.base;
    s.img.setScale(sc * 1.4, sc * 0.62);
    this.scene.tweens.add({ targets: s.img, scaleX: sc, scaleY: sc, duration: 140, ease: 'Back.Out' });
  }

  private arrive(s: Shot, f: Foot): void {
    // the foot it was after is gone: anything close by takes the hit instead
    const target = Projectiles.ok(f) ? f : this.nearest(s.x, s.y, s.hit, 130);
    const e = s.e;
    if (!target) return this.miss(s);
    switch (e.how) {
      case 'explode':
        return this.explode(s, target);
      case 'stick':
        this.strike(s, target);
        return this.stick(s, target, Math.max(e.stick ?? 2, e.blind ?? 0));
      case 'bounce': {
        this.strike(s, target);
        if (e.tether) this.loop(s, target);
        const more = (e.more?.length ?? 0) + 1;
        const next = s.hitN < more ? this.nearest(target.cx, target.cy, s.hit, 650) : null;
        if (e.tether && next) this.tethers.push({ a: target, b: next, t: e.tether });
        if (!next) return this.finish(s);
        return this.flyTo(s, next, { speed: 1200, arc: 150 });
      }
      case 'ricochet': {
        this.strike(s, target);
        if (s.hitN > (e.more?.length ?? 0)) return this.finish(s);
        return this.bank(s, target);
      }
      case 'boomerang': {
        this.strike(s, target);
        const back = s.hitN <= (e.more?.length ?? 0) ? this.nearest(target.cx, target.cy, s.hit, 900) : null;
        if (back) return this.flyTo(s, back, { speed: 1300, arc: 0, bow: -240 });
        return this.home(s);
      }
      default:
        this.strike(s, target);
        if (e.prop === 'coconut') this.crack(s);
        return this.finish(s);
    }
  }

  /** Ricochet: off the nearest side wall, then into another foot. */
  private bank(s: Shot, from: Foot): void {
    const next = this.pickOther(s.hit, from);
    if (!next) return this.finish(s);
    const right = from.cx > W / 2;
    const wx = right ? W - 40 : 40;
    const wy = Phaser.Math.Clamp((from.cy + next.cy) / 2 - 80, 120, H - 260);
    s.leg = {
      x0: s.x,
      y0: s.y,
      dest: () => ({ x: wx, y: wy }),
      dur: Phaser.Math.Clamp(Math.hypot(wx - s.x, wy - s.y) / 2000, 0.12, 0.4),
      u: 0,
      arc: 0,
      bow: 0,
      ease: (u) => u,
      arrive: () => {
        this.fx.propBurst(wx, wy, s.look.color, 0.5);
        audio.sfx(s.look.impact, { throttle: 50, volume: 0.5, rate: 1.3 });
        this.squash(s);
        s.spin = -s.spin;
        this.flyTo(s, next, { speed: 1900, arc: 0 });
      },
    };
  }

  /** Back to the peel (a boomerang's catch). */
  private home(s: Shot): void {
    s.leg = {
      x0: s.x,
      y0: s.y,
      dest: () => this.host.peelPos(),
      dur: 0.45,
      u: 0,
      arc: 0,
      bow: 200,
      ease: (u) => u * u * (3 - 2 * u),
      arrive: () => {
        const p = this.host.peelPos();
        this.fx.glint(p.x, p.y - 20, 3);
        this.finish(s);
      },
    };
  }

  private pierce(s: Shot, f: Foot): void {
    const dx = f.cx - s.x;
    const dy = f.cy - s.y;
    const len = Math.hypot(dx, dy) || 1;
    const far = 2600;
    const tx = s.x + (dx / len) * far;
    const ty = s.y + (dy / len) * far;
    s.leg = { x0: s.x, y0: s.y, dest: () => ({ x: tx, y: ty }), dur: far / 1900, u: 0, arc: 0, bow: 0, ease: (u) => u, sweep: 42, arrive: () => this.finish(s) };
    s.e = { ...s.e, more: [] };
    this.offscreenEnd(s);
  }

  /** Pierce and roll end when they leave the screen. */
  private offscreenEnd(s: Shot): void {
    const leg = s.leg!;
    const dest = leg.dest;
    leg.dest = () => {
      if (s.x < -120 || s.x > W + 120 || s.y < -120 || s.y > H + 120) leg.u = 1;
      return dest();
    };
  }

  /** Roll: a short lob down to the lane, then along it, through every foot in the way. */
  private roll(s: Shot, f: Foot): void {
    const dir = f.cx >= s.x ? 1 : -1;
    // rolls above the table, never across the pizzas
    const lane = Phaser.Math.Clamp(f.cy + 30, 160, TABLE_Y - 60);
    const lx = Phaser.Math.Clamp(f.cx - dir * 280, 60, W - 60);
    s.leg = {
      x0: s.x,
      y0: s.y,
      dest: () => ({ x: lx, y: lane }),
      dur: 0.42,
      u: 0,
      arc: 180,
      bow: 0,
      ease: (u) => u,
      arrive: () => {
        this.squash(s);
        this.fx.puff(lx, lane + s.look.size * 0.4, 6);
        audio.sfx('sfx_rollrumble', { throttle: 80, volume: 0.9 });
        s.rolling = true;
        const tx = dir > 0 ? W + 200 : -200;
        s.leg = { x0: lx, y0: lane, dest: () => ({ x: tx, y: lane }), dur: Math.abs(tx - lx) / 1300, u: 0, arc: 0, bow: 0, ease: (u) => u, sweep: Math.max(40, (s.e.r ?? 90) * 0.5), arrive: () => this.finish(s) };
        s.e = { ...s.e, more: [] };
        this.offscreenEnd(s);
      },
    };
  }

  private explode(s: Shot, f: Foot): void {
    const r = s.e.r ?? 160;
    const x = f.cx;
    const y = f.cy;
    this.strike(s, f, false);
    for (const o of this.live()) if (o !== f && o.distanceTo(x, y) <= r) this.strike(s, o, false, s.e.splash ?? s.e.x * 0.5);
    this.fx.explosion(x, y, r);
    this.fx.propBurst(x, y, s.look.color, 1.6);
    if (s.e.prop === 'grenade') {
      // pepper: everything in the blast sneezes
      this.fx.propBurst(x, y, 0x2a2a2a, 1.2);
      let n = 0;
      for (const o of s.hit) if (n++ < 3 && o.alive) this.fx.quip(o.x, o.cy - 120, 'ACHOO!', '#fff6c0', 34);
    }
    s.img.destroy();
    s.done = true;
  }

  private split(s: Shot): void {
    const leg = s.leg!;
    const first = leg.dest();
    // 3 pieces, fewer if the sky is full (the parent's slot becomes one of them)
    const n = Phaser.Math.Clamp(MAX_IN_FLIGHT - this.inFlight + 1, 1, 3);
    const picks: Foot[] = [];
    const t = this.nearest(first.x, first.y, new Set(), 200);
    if (t) picks.push(t);
    for (const o of this.live().sort((a, b) => Math.hypot(a.cx - s.x, a.cy - s.y) - Math.hypot(b.cx - s.x, b.cy - s.y))) {
      if (picks.length >= n) break;
      if (!picks.includes(o)) picks.push(o);
    }
    while (picks.length && picks.length < n) picks.push(picks[0]);
    this.fx.propBurst(s.x, s.y, s.look.color, 0.8);
    audio.sfx(s.look.launch, { rate: 1.4, throttle: 40 });
    for (const p of picks) {
      const c = this.makeShot({ ...s.e, how: 'straight' }, s.color, s.onHit, s.x, s.y, true);
      c.age = 0.12;
      this.flyTo(c, p, { speed: 1500, arc: 60, bow: (Math.random() - 0.5) * 200 });
    }
    s.img.destroy();
    s.done = true;
  }

  private stick(s: Shot, f: Foot, sec: number): void {
    s.leg = null;
    s.stuck = { f, ox: (s.x - f.x) * 0.4, oy: Math.max(-40, Math.min(30, s.y - f.cy)) * 0.5, t: sec };
    s.img.setAngle(Phaser.Math.Clamp(s.img.angle % 360, -20, 20));
    const sc = s.base;
    // splat flat onto it, then wobble back
    if (s.e.prop === 'pie' && this.scene.textures.exists('t_pie_splat')) s.img.setTexture('t_pie_splat');
    s.img.setScale(sc * 1.5, sc * 0.55);
    this.scene.tweens.add({ targets: s.img, scaleX: sc * 1.08, scaleY: sc * 0.92, duration: 260, ease: 'Elastic.Out' });
    if (s.e.prop === 'ring') {
      s.stuck.ox = 0;
      s.stuck.oy = 10;
    }
  }

  /** The lasso leaves a loop on each foot it ropes. */
  private loop(s: Shot, f: Foot): void {
    const key = this.scene.textures.exists('t_lasso_loop') ? 't_lasso_loop' : s.img.texture.key;
    const img = this.scene.add.image(f.cx, f.cy, key);
    const src = this.scene.textures.get(key).getSourceImage();
    img.setScale(90 / Math.max(src.width, src.height));
    this.layer.add(img);
    const loop: Shot = { ...s, img, base: img.scale, leg: null, hit: new Set(), stuck: { f, ox: 0, oy: 20, t: s.e.tether ?? 2 }, done: false, child: true };
    this.shots.push(loop);
  }

  private crack(s: Shot): void {
    for (const side of [-1, 1]) {
      const key = this.scene.textures.exists('t_coconut_half') ? 't_coconut_half' : s.img.texture.key;
      const h = this.scene.add.image(s.x, s.y, key).setScale(s.base).setFlipX(side > 0);
      this.layer.add(h);
      this.scene.tweens.add({ targets: h, x: s.x + side * 90, angle: side * 140, duration: 520, ease: 'Quad.Out' });
      this.scene.tweens.add({ targets: h, y: s.y + 160, duration: 520, ease: 'Back.In' });
      this.scene.tweens.add({ targets: h, alpha: 0, delay: 320, duration: 200, onComplete: () => h.destroy() });
    }
    s.img.setVisible(false);
  }

  /** Done: squash (already played), then drop a little and fade. */
  private finish(s: Shot, soft = false): void {
    s.done = true;
    s.leg = null;
    const img = s.img;
    if (!img.visible) {
      img.destroy();
      return;
    }
    this.scene.tweens.add({
      targets: img,
      alpha: 0,
      y: img.y + (soft ? 40 : 26),
      scaleX: img.scaleX * 0.7,
      scaleY: img.scaleY * 0.7,
      angle: img.angle + (s.spin > 0 ? 40 : -40),
      delay: soft ? 0 : 90,
      duration: 220,
      ease: 'Quad.In',
      onComplete: () => img.destroy(),
    });
  }

  /** Nothing to hit where it landed: it carries on a little and fades. */
  private miss(s: Shot): void {
    const img = s.img;
    s.done = true;
    this.scene.tweens.add({ targets: img, x: img.x + (crand() - 0.5) * 80, y: img.y + 70, alpha: 0, duration: 320, ease: 'Quad.In', onComplete: () => img.destroy() });
  }

  // ——— beams (instant) ———
  private beam(e: ThrowFx, f: Foot, color: number, onHit: OnHit): void {
    const p = this.host.peelPos();
    const dx = f.cx - p.x;
    const dy = f.cy - p.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const far = 2400;
    const hit = new Set<Foot>();
    for (let d = 0; d < far; d += 24) {
      const x = p.x + ux * d;
      const y = p.y + uy * d;
      if (x < -50 || x > W + 50 || y < -50 || y > H + 50) break;
      for (const o of this.live()) if (!hit.has(o) && o.distanceTo(x, y) < 36) hit.add(o);
    }
    const g = this.scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    this.layer.add(g);
    for (const [w, c, a] of [[34, color, 0.3], [16, color, 0.75], [6, 0xffffff, 1]] as const) {
      g.lineStyle(w, c, a);
      g.lineBetween(p.x, p.y, p.x + ux * far, p.y + uy * far);
    }
    this.scene.tweens.add({ targets: g, alpha: 0, duration: 260, ease: 'Quad.In', onComplete: () => g.destroy() });
    audio.sfx('sfx_beam', { throttle: 60 });
    for (const o of hit) {
      onHit(o, e.x);
      this.fx.propBurst(o.cx, o.cy, color, 0.8);
    }
  }

  // ——— picking ———
  private nearest(x: number, y: number, not: Set<Foot>, within: number): Foot | null {
    let best: Foot | null = null;
    let bd = within;
    for (const f of this.live()) {
      if (not.has(f)) continue;
      const d = Math.hypot(f.cx - x, f.cy - y);
      if (d < bd) {
        bd = d;
        best = f;
      }
    }
    return best;
  }

  private pickOther(not: Set<Foot>, from: Foot): Foot | null {
    const pool = this.live().filter((f) => !not.has(f) && f !== from);
    return pool.length ? Phaser.Utils.Array.GetRandom(pool) : null;
  }
}
