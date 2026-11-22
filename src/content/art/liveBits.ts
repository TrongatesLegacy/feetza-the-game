// Live animation bits for the batch-1 backdrops (Rooftop, Diner, Lodge and their arenas), on top of KitLive
// (src/game/sceneLive.ts), at the feet's live-kit bar (src/game/liveKit.ts):
//
// - painted frame loops: a hero element (a flame, a smoke volume, a banner, a wing beat, rain on glass) painted by
//   the same paint code at successive phases of a seamless cycle, baked to one sprite sheet, and played back
//   cross-fading between neighbouring frames, so the shape itself changes, not just its transform;
// - flowing textures: a molten or watery surface as two scrolling copies of a painted tile at different rates under
//   a crust/foam layer of its own, which reads as a flow breaking up rather than one sliding strip;
// - damped springs for secondary motion (lamps, banners, wires swinging after a stomp);
// - shaped, lit particles with physics: sparks that streak along their velocity and bounce, embers that rise and
//   wander with a trail, drips that fall and splash, dust that sifts down, all from small painted textures.
//
// Cosmetic randomness is crand(); reduced motion calms the motion (calm()).

import Phaser from 'phaser';
import { makeCanvas } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { type KitLive, calm } from '../../game/sceneLive';

type Img = Phaser.GameObjects.Image;
type Container = Phaser.GameObjects.Container;

/** A sprite sheet of n frames (w×h each), frame i painted by draw(ctx, i / n): made once per game. */
export function sheet(k: KitLive, key: string, n: number, w: number, h: number, draw: (c: CanvasRenderingContext2D, ph: number, i: number) => void): string {
  const sc = k.sc;
  if (sc.textures.exists(key)) return key;
  const [c, ctx] = makeCanvas(w * n, h);
  for (let i = 0; i < n; i++) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(i * w, 0, w, h);
    ctx.clip();
    ctx.translate(i * w, 0);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    draw(ctx, i / n, i);
    ctx.restore();
  }
  const tex = sc.textures.addCanvas(key, c);
  for (let i = 0; i < n; i++) tex?.add(i, 0, i * w, 0, w, h);
  return key;
}

export interface LoopOpts {
  into?: Container;
  fps?: number;
  add?: boolean;
  origin?: [number, number];
  scale?: number;
  sx?: number;
  sy?: number;
  alpha?: number;
  tint?: number;
  /** Start at a phase (0…1). */
  phase?: number;
}

/** A painted frame loop: two images showing neighbouring frames, cross-faded, so it flows rather than steps. */
export class Loop {
  readonly a: Img;
  readonly b: Img;
  private n: number;
  private t: number;
  fps: number;
  alpha: number;
  constructor(k: KitLive, key: string, x: number, y: number, o: LoopOpts = {}) {
    const tex = k.sc.textures.get(key);
    this.n = tex.frameTotal - 1;
    this.fps = o.fps ?? 10;
    this.alpha = o.alpha ?? 1;
    this.t = (o.phase ?? crand()) * this.n;
    const mk = () => {
      const im = k.sc.add.image(x, y, key, 0).setOrigin(...(o.origin ?? [0.5, 0.5]));
      im.setScale(o.sx ?? o.scale ?? 1, o.sy ?? o.scale ?? 1);
      if (o.add) im.setBlendMode(Phaser.BlendModes.ADD);
      if (o.tint !== undefined) im.setTint(o.tint);
      (o.into ?? k.root).add(im);
      return im;
    };
    this.a = mk();
    this.b = mk();
  }
  update(dt: number): void {
    this.t = (this.t + dt * this.fps) % this.n;
    const i = Math.floor(this.t);
    const f = this.t - i;
    this.a.setFrame(i).setAlpha(this.alpha * (this.a.blendMode === Phaser.BlendModes.ADD ? 1 - f : 1));
    // (normal blending: the lower frame stays opaque and the next fades in over it, so the pair never goes thin)
    this.b.setFrame((i + 1) % this.n).setAlpha(this.alpha * f);
  }
  each(fn: (im: Img) => void): void {
    fn(this.a);
    fn(this.b);
  }
  set visible(v: boolean) {
    this.a.setVisible(v);
    this.b.setVisible(v);
  }
}

/** A damped spring (an angle or an offset): kick it, step it, read x. */
export class Spring {
  x = 0;
  v = 0;
  constructor(public stiff = 30, public damp = 3) {}
  kick(v: number): void {
    this.v += v * calm();
  }
  step(dt: number, target = 0): number {
    const h = Math.min(dt, 1 / 30);
    this.v += (-(this.x - target) * this.stiff - this.v * this.damp) * h;
    this.x += this.v * h;
    return this.x;
  }
}

// ——— flowing surfaces ———

/**
 * A flowing strip (molten metal in a channel, a lava rivulet, a stream): two copies of a painted tile scrolling at
 * different rates (their sum never repeats visibly), and an optional crust/foam tile over them at a third rate.
 * Tiles should wrap horizontally (paint them periodic in x).
 */
export class Flow {
  private parts: { im: Phaser.GameObjects.TileSprite; v: number; wob: number }[] = [];
  constructor(k: KitLive, x: number, y: number, w: number, h: number, layers: { key: string; v: number; alpha?: number; add?: boolean; wob?: number; scaleY?: number }[], into?: Container) {
    for (const l of layers) {
      const im = k.sc.add.tileSprite(x, y, w, h, l.key).setOrigin(0, 0).setAlpha(l.alpha ?? 1);
      if (l.scaleY) im.setTileScale(1, l.scaleY);
      if (l.add) im.setBlendMode(Phaser.BlendModes.ADD);
      (into ?? k.root).add(im);
      this.parts.push({ im, v: l.v, wob: l.wob ?? 0 });
    }
  }
  update(dt: number, t: number, speed = 1): void {
    for (const p of this.parts) {
      p.im.tilePositionX -= p.v * dt * speed * calm();
      if (p.wob) p.im.tilePositionY = Math.sin(t * 0.7 + p.v) * p.wob;
    }
  }
  setAlpha(a: number): void {
    for (const p of this.parts) p.im.setAlpha(a);
  }
  get images(): Phaser.GameObjects.TileSprite[] {
    return this.parts.map((p) => p.im);
  }
}

// ——— particles ———

/** Small painted particle textures shared by the backdrops. */
export function particleTex(k: KitLive): { spark: string; ember: string; drop: string; dust: string; flake: string; puff: string } {
  const spark = k.tex('lb_spark', 32, 8, (c) => {
    const g = c.createLinearGradient(0, 0, 32, 0);
    g.addColorStop(0, 'rgba(255,200,120,0)');
    g.addColorStop(0.6, 'rgba(255,220,150,0.7)');
    g.addColorStop(1, 'rgba(255,255,240,1)');
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(16, 4, 16, 2.6, 0, 0, Math.PI * 2);
    c.fill();
  });
  const ember = k.tex('lb_ember', 24, 24, (c) => {
    const g = c.createRadialGradient(12, 12, 0, 12, 12, 12);
    g.addColorStop(0, 'rgba(255,250,220,1)');
    g.addColorStop(0.25, 'rgba(255,190,80,0.9)');
    g.addColorStop(0.6, 'rgba(255,90,20,0.35)');
    g.addColorStop(1, 'rgba(255,60,0,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 24, 24);
  });
  const drop = k.tex('lb_drop', 10, 22, (c) => {
    const g = c.createLinearGradient(0, 0, 10, 0);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.5, 'rgba(200,220,255,0.5)');
    g.addColorStop(1, 'rgba(120,140,180,0.7)');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(5, 0);
    c.quadraticCurveTo(10, 14, 5, 21);
    c.quadraticCurveTo(0, 14, 5, 0);
    c.fill();
  });
  const dust = k.tex('lb_dust', 16, 16, (c) => {
    const g = c.createRadialGradient(8, 8, 0, 8, 8, 8);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 16, 16);
  });
  const flake = k.tex('lb_flake', 12, 12, (c) => {
    const g = c.createRadialGradient(5, 5, 0, 6, 6, 6);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.5, 'rgba(240,246,255,0.8)');
    g.addColorStop(1, 'rgba(200,214,240,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 12, 12);
  });
  const puff = k.tex('lb_puff', 64, 64, (c) => {
    // a lumpy little cloud of smoke or dust (several soft lobes, not a disc)
    for (const [x, y, r] of [[26, 34, 18], [38, 30, 16], [32, 22, 14], [22, 26, 12], [42, 40, 12]] as const) {
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, 64, 64);
    }
  });
  return { spark, ember, drop, dust, flake, puff };
}

interface P {
  im: Img;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  age: number;
  kind: 'spark' | 'ember' | 'drop' | 'dust' | 'flake' | 'splash';
  size: number;
  floor: number;
  bounces: number;
  seed: number;
  trail?: Img;
}

/**
 * Particles with physics, each a painted shape: sparks stretch along their velocity, fall and bounce off a floor
 * (losing energy, dying in a scatter); embers rise on the heat, wander and cool through orange to red, a trail
 * behind; drips fall and break into a splash on the floor; dust and flakes sift down, turning.
 */
export class Particles {
  private ps: P[] = [];
  private pool: Img[] = [];
  private tex: ReturnType<typeof particleTex>;
  constructor(private k: KitLive, private into: Container, private max = 160) {
    this.tex = particleTex(k);
  }
  private img(key: string, add: boolean): Img {
    const im = this.pool.pop() ?? this.k.sc.add.image(0, 0, key);
    im.setTexture(key).setVisible(true).setAlpha(1).setRotation(0).setScale(1);
    im.setBlendMode(add ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);
    if (!im.parentContainer) this.into.add(im);
    return im;
  }
  get count(): number {
    return this.ps.length;
  }
  emit(kind: P['kind'], x: number, y: number, vx: number, vy: number, o: { life?: number; size?: number; floor?: number; tint?: number } = {}): void {
    if (this.ps.length >= this.max) return;
    const key = kind === 'spark' ? this.tex.spark : kind === 'ember' ? this.tex.ember : kind === 'drop' || kind === 'splash' ? this.tex.drop : kind === 'flake' ? this.tex.flake : this.tex.dust;
    const im = this.img(key, kind === 'spark' || kind === 'ember');
    if (o.tint !== undefined) im.setTint(o.tint);
    else im.clearTint();
    const p: P = { im, x, y, vx, vy, life: o.life ?? 1.5, age: 0, kind, size: o.size ?? 1, floor: o.floor ?? 2000, bounces: 0, seed: crand() * 10 };
    if (kind === 'ember') {
      p.trail = this.img(this.tex.spark, true);
      p.trail.setTint(0xff7a2a);
    }
    this.ps.push(p);
  }
  update(dt: number, t: number): void {
    for (let i = this.ps.length - 1; i >= 0; i--) {
      const p = this.ps[i];
      p.age += dt;
      const u = p.age / p.life;
      if (u >= 1) {
        this.kill(i);
        continue;
      }
      if (p.kind === 'spark') {
        p.vy += 1500 * dt;
        p.vx *= 1 - dt * 0.4;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.y > p.floor && p.vy > 0) {
          p.y = p.floor;
          p.vy *= -0.38;
          p.vx *= 0.6;
          p.bounces++;
          if (p.bounces > 2) p.age = Math.max(p.age, p.life * 0.85);
        }
        const sp = Math.hypot(p.vx, p.vy);
        p.im.setPosition(p.x, p.y).setRotation(Math.atan2(p.vy, p.vx)).setScale(Math.min(2.4, 0.3 + sp / 500) * p.size, 0.9 * p.size).setAlpha(1 - u * u);
        p.im.setTint(u < 0.4 ? 0xfff2c0 : u < 0.7 ? 0xffb050 : 0xff6a20);
      } else if (p.kind === 'ember') {
        p.vy -= 30 * dt;
        p.vx += Math.sin(t * 3 + p.seed) * 60 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const s = (0.5 + (1 - u) * 0.5) * p.size;
        const col = u < 0.3 ? 0xffe0a0 : u < 0.65 ? 0xff9a40 : 0xff4a18;
        p.im.setPosition(p.x, p.y).setScale(s).setAlpha((1 - u) * (0.7 + Math.sin(t * 17 + p.seed) * 0.3)).setTint(col);
        if (p.trail) p.trail.setPosition(p.x - p.vx * 0.04, p.y - p.vy * 0.04).setRotation(Math.atan2(p.vy, p.vx)).setScale(Math.hypot(p.vx, p.vy) / 260 * p.size, 0.6 * p.size).setAlpha((1 - u) * 0.6);
      } else if (p.kind === 'drop') {
        p.vy += 1800 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.im.setPosition(p.x, p.y).setScale(0.5 * p.size, (0.5 + Math.min(1, p.vy / 900)) * p.size).setAlpha(0.85);
        if (p.y > p.floor) {
          // the splash: a crown of droplets
          for (let j = 0; j < 4; j++) this.emit('splash', p.x, p.floor - 2, (crand() - 0.5) * 220, -120 - crand() * 140, { life: 0.35, size: 0.35 * p.size, floor: p.floor + 4, tint: p.im.tintTopLeft });
          this.kill(i);
          continue;
        }
      } else if (p.kind === 'splash') {
        p.vy += 1600 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.im.setPosition(p.x, p.y).setScale(p.size).setAlpha(1 - u);
      } else {
        // dust and flakes: sift down, turning and drifting
        p.vy += (p.kind === 'flake' ? 20 : 40) * dt;
        p.vy = Math.min(p.vy, p.kind === 'flake' ? 70 : 90);
        p.x += (p.vx + Math.sin(t * 1.6 + p.seed) * 22) * dt;
        p.y += p.vy * dt;
        p.im.setPosition(p.x, p.y).setScale(p.size * (0.8 + Math.sin(t * 4 + p.seed) * 0.2), p.size).setAlpha(Math.min(1, u * 6) * (1 - u) * 0.9);
      }
    }
  }
  private kill(i: number): void {
    const p = this.ps[i];
    p.im.setVisible(false);
    this.pool.push(p.im);
    if (p.trail) {
      p.trail.setVisible(false);
      this.pool.push(p.trail);
    }
    this.ps.splice(i, 1);
  }
}
