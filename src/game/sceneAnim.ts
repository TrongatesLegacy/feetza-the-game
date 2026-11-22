// Real animation for the location kit's live layers (src/game/sceneLive.ts), at the feet's bar (src/game/liveKit.ts):
//
// - frame loops: a thing painted by the scene's own paint code at n successive phases of its cycle, baked to one
//   sprite sheet, and played by cross-fading neighbouring frames (flames that change shape, steam that billows,
//   cloth that ripples, neon that stutters with its painted glow);
// - hinged parts on damped springs that answer the scene's stomps (a lamp swings, pans clink, a bell rocks);
// - shaped, lit particles with physics: gravity, drag, a floor to bounce or splash on, streaks stretched along their
//   velocity (embers with trails, sparks that bounce, drips that splash, regolith that hangs in low gravity).
//
// Everything cosmetic uses crand(); reduced motion calms the motions (sceneLive's calm()).

import Phaser from 'phaser';
import { makeCanvas } from '../art/util';
import { crand } from '../systems/cosmeticRandom';
import { FX_R, type FxFrame, Spring, fxAtlas } from './liveKit';
import { type KitLive, calm } from './sceneLive';

type Img = Phaser.GameObjects.Image;
type Container = Phaser.GameObjects.Container;
type Ctx = CanvasRenderingContext2D;

export { Spring };

/** A sprite sheet made once per game: n frames of fw×fh, frame i painted by draw(ctx, i / n, i) in the frame's own
 * coordinates. Frame names are 0…n-1. */
export function sheet(k: KitLive, key: string, fw: number, fh: number, n: number, draw: (c: Ctx, phase: number, i: number) => void): string {
  const sc = k.sc;
  if (sc.textures.exists(key)) return key;
  fw = Math.ceil(fw);
  fh = Math.ceil(fh);
  const [c, ctx] = makeCanvas(fw * n, fh);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(i * fw, 0, fw, fh);
    ctx.clip();
    ctx.translate(i * fw, 0);
    draw(ctx, i / n, i);
    ctx.restore();
  }
  const tex = sc.textures.addCanvas(key, c)!;
  for (let i = 0; i < n; i++) tex.add(i, 0, i * fw, 0, fw, fh);
  return key;
}

/** A frame loop played by cross-fading neighbouring frames (two images): smooth at any speed. */
export class Loop {
  readonly a: Img;
  readonly b: Img;
  private ph: number;
  alpha = 1;
  constructor(k: KitLive, key: string, readonly n: number, x: number, y: number, o: { into?: Container; add?: boolean; origin?: [number, number]; scale?: number; sx?: number; sy?: number; tint?: number; fps?: number; phase?: number } = {}) {
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
    this.fps = o.fps ?? 12;
    this.ph = o.phase ?? crand() * n;
  }
  fps: number;
  /** Advance (dt s, speed × fps). */
  step(dt: number, speed = 1): void {
    this.ph = (this.ph + dt * this.fps * speed) % this.n;
    this.show(this.ph);
  }
  /** Show a fractional frame position. */
  show(ph: number): void {
    const i = Math.floor(ph) % this.n;
    const f = ph - Math.floor(ph);
    this.a.setFrame(i).setAlpha(this.alpha);
    this.b.setFrame((i + 1) % this.n).setAlpha(this.alpha * f);
  }
  each(fn: (im: Img) => void): void {
    fn(this.a);
    fn(this.b);
  }
}

/** A hinged part (sprite pivoted at its hinge) on a damped spring: it idles on a gentle sway and swings when kicked. */
export class Swing {
  private s: Spring;
  private kickV = 0;
  constructor(readonly img: Img, private o: { k?: number; c?: number; idle?: number; seed?: number; speed?: number } = {}) {
    this.s = new Spring(0, o.k ?? 9, o.c ?? 1.1);
  }
  /** Kick it (radians per second). */
  kick(v: number): void {
    this.s.v += v * calm();
    this.kickV = v;
  }
  get angle(): number {
    return this.s.x;
  }
  get vel(): number {
    return this.s.v;
  }
  update(dt: number, t: number): void {
    const sd = this.o.seed ?? 0;
    const sp = this.o.speed ?? 1;
    const idle = (Math.sin(t * 0.8 * sp + sd) * 0.6 + Math.sin(t * 1.9 * sp + sd * 2.1) * 0.3) * (this.o.idle ?? 0) * calm();
    this.img.rotation = this.s.step(idle, dt);
    void this.kickV;
  }
}

// ——— particles ———

export interface PartOpts {
  frame: FxFrame;
  add?: boolean;
  into?: Container;
  max?: number;
}

interface P {
  img: Img;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  age: number;
  r0: number;
  r1: number;
  a: number;
  grav: number;
  drag: number;
  /** A floor (screen y) to bounce on (bounce > 0) or die on (splash). */
  floor?: number;
  bounce?: number;
  onFloor?: (p: P) => void;
  /** Stretch along the velocity (a streak or trail): px of length per px/s. */
  streak: number;
  spin: number;
  tint: number;
  fade: number;
}

export interface Spawn {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  life: number;
  r0: number;
  r1?: number;
  a: number;
  tint: number;
  grav?: number;
  drag?: number;
  floor?: number;
  bounce?: number;
  onFloor?: (x: number, y: number, vx: number, vy: number) => void;
  streak?: number;
  spin?: number;
  fade?: number;
}

/** A pool of shaped, lit particles (the live kit's effect frames) moved with simple physics. */
export class Parts {
  private ps: P[] = [];
  private free: Img[] = [];
  private key: string;
  constructor(private k: KitLive, private o: PartOpts) {
    this.key = fxAtlas(k.sc);
  }
  get count(): number {
    return this.ps.length;
  }
  spawn(s: Spawn): void {
    if (this.ps.length >= (this.o.max ?? 160)) return;
    const img = this.free.pop() ?? this.make();
    img.setVisible(true).setTint(s.tint);
    this.ps.push({
      img, x: s.x, y: s.y, vx: s.vx ?? 0, vy: s.vy ?? 0, life: s.life, age: 0, r0: s.r0, r1: s.r1 ?? s.r0, a: s.a, grav: s.grav ?? 0, drag: s.drag ?? 0,
      floor: s.floor, bounce: s.bounce, onFloor: s.onFloor ? (p) => s.onFloor!(p.x, p.y, p.vx, p.vy) : undefined, streak: s.streak ?? 0, spin: s.spin ?? 0, tint: s.tint, fade: s.fade ?? 0.15,
    });
  }
  private make(): Img {
    const im = this.k.sc.add.image(0, 0, this.key, this.o.frame);
    if (this.o.add) im.setBlendMode(Phaser.BlendModes.ADD);
    (this.o.into ?? this.k.root).add(im);
    return im;
  }
  update(dt: number): void {
    for (let i = this.ps.length - 1; i >= 0; i--) {
      const p = this.ps[i];
      p.age += dt;
      const t = p.age / p.life;
      if (t >= 1) {
        p.img.setVisible(false);
        this.free.push(p.img);
        this.ps.splice(i, 1);
        continue;
      }
      p.vy += p.grav * dt;
      const d = Math.max(0, 1 - p.drag * dt);
      p.vx *= d;
      p.vy *= d;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.floor !== undefined && p.y > p.floor && p.vy > 0) {
        if (p.bounce) {
          p.y = p.floor;
          p.vy = -p.vy * p.bounce;
          p.vx *= 0.7;
          if (Math.abs(p.vy) < 20) p.bounce = 0;
        } else {
          p.onFloor?.(p);
          p.age = p.life;
          continue;
        }
      }
      const r = p.r0 + (p.r1 - p.r0) * Math.sqrt(t);
      const sc = r / FX_R;
      const sp = Math.hypot(p.vx, p.vy);
      const len = 1 + (sp * p.streak) / Math.max(1, r);
      p.img.setPosition(p.x, p.y);
      if (p.streak) p.img.setRotation(Math.atan2(p.vy, p.vx)).setScale(sc * len, sc);
      else p.img.setScale(sc).setRotation(p.img.rotation + p.spin * dt);
      p.img.setAlpha(p.a * Math.min(1, t / Math.max(0.01, p.fade)) * (1 - t));
    }
  }
}

/** Emit at a rate (per second) across frames. */
export class Rate {
  private acc = 0;
  tick(perSec: number, dt: number, fn: () => void): void {
    this.acc += perSec * dt;
    while (this.acc >= 1) {
      this.acc -= 1;
      fn();
    }
  }
}

// ——— frame painters shared by scenes ———

/**
 * One frame of a rising column of steam or smoke (phase 0…1 loops): soft volumes born at the bottom, swelling, drifting
 * and thinning as they climb, each lit on its top-left and shaded on its lower right; the column sways with the phase.
 * Paints into a w×h frame with the source at (w/2, h - 4).
 */
export function steamFrame(c: Ctx, w: number, h: number, phase: number, o: { lit?: string; body?: string; shade?: string; a?: number; n?: number; lean?: number; seed?: number } = {}): void {
  const n = o.n ?? 7;
  const lit = o.lit ?? '#ffffff';
  const body = o.body ?? '#e8e4e0';
  const sh = o.shade ?? '#9a96a8';
  const a = o.a ?? 0.5;
  const seed = o.seed ?? 1;
  const k = 0.5;
  const [cv, g] = makeCanvas(Math.ceil(w * k), Math.ceil(h * k));
  g.scale(k, k);
  for (let j = 0; j < n; j++) {
    const u = (phase + j / n) % 1;
    const y = h - 6 - u * (h - 20);
    const sway = Math.sin(u * 5 + seed + j * 0.7) * w * 0.08 * (0.3 + u) + (o.lean ?? 0) * u * w * 0.3;
    const x = w / 2 + sway + Math.sin(j * 2.1 + seed) * w * 0.05 * u;
    const rad = w * (0.07 + u * 0.24);
    const al = a * Math.sin(Math.min(1, u * 1.4) * Math.PI) ** 0.8 * (1 - u * 0.4);
    // body, then the lit cap and the shaded underside
    const rg = g.createRadialGradient(x, y, 0, x, y, rad);
    rg.addColorStop(0, rgbaHex(body, al));
    rg.addColorStop(0.6, rgbaHex(body, al * 0.55));
    rg.addColorStop(1, rgbaHex(body, 0));
    g.fillStyle = rg;
    g.beginPath();
    g.ellipse(x, y, rad * 1.15, rad, Math.sin(u * 3 + j) * 0.4, 0, Math.PI * 2);
    g.fill();
    const lg = g.createRadialGradient(x - rad * 0.35, y - rad * 0.4, 0, x - rad * 0.35, y - rad * 0.4, rad * 0.7);
    lg.addColorStop(0, rgbaHex(lit, al * 0.6));
    lg.addColorStop(1, rgbaHex(lit, 0));
    g.fillStyle = lg;
    g.fillRect(x - rad * 1.2, y - rad * 1.2, rad * 2.4, rad * 2.4);
    const dg = g.createRadialGradient(x + rad * 0.4, y + rad * 0.45, 0, x + rad * 0.4, y + rad * 0.45, rad * 0.75);
    dg.addColorStop(0, rgbaHex(sh, al * 0.35));
    dg.addColorStop(1, rgbaHex(sh, 0));
    g.fillStyle = dg;
    g.fillRect(x - rad * 1.2, y - rad * 1.2, rad * 2.4, rad * 2.4);
    // wisps pulled off its edge
    g.strokeStyle = rgbaHex(body, al * 0.14);
    g.lineWidth = Math.max(1, rad * 0.12);
    g.beginPath();
    g.moveTo(x + rad * 0.6, y - rad * 0.2);
    g.quadraticCurveTo(x + rad * 1.1, y - rad * 0.8, x + rad * 0.7 + Math.sin(u * 7 + j) * rad * 0.4, y - rad * 1.4);
    g.stroke();
  }
  c.imageSmoothingEnabled = true;
  c.drawImage(cv, 0, 0, w, h);
}

/**
 * One frame of a flame (phase 0…1 loops): a body of tongues that lick up, split and recombine, each tongue's tip
 * pinching off and rising; hot core, orange body, dark-red edge. Base at (w/2, h - 2).
 */
export function flameFrame(c: Ctx, w: number, h: number, phase: number, cols: [string, string, string] = ['#d8400c', '#ff9a24', '#fff2c0'], tongues = 3, seed = 1): void {
  const bx = w / 2;
  const by = h - 2;
  const P = Math.PI * 2;
  const shape = (scale: number) => {
    c.beginPath();
    const hw = w * 0.32 * scale;
    c.moveTo(bx - hw, by);
    // the left flank up to the tongues, the tongues, the right flank down
    const pts: [number, number][] = [];
    for (let i = 0; i <= tongues; i++) {
      const u = i / tongues;
      const tx = bx - hw * 0.8 + u * hw * 1.6;
      const lick = 0.55 + 0.45 * Math.sin(phase * P + i * 2.3 + seed);
      const ty = by - h * (0.42 + 0.5 * lick * (1 - Math.abs(u - 0.5) * 0.9)) * scale;
      const sway = Math.sin(phase * P * 2 + i * 1.7 + seed) * w * 0.06;
      pts.push([tx + sway, ty]);
    }
    c.quadraticCurveTo(bx - hw * 1.05, by - h * 0.25 * scale, pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      const [px, py] = pts[i - 1];
      const [qx, qy] = pts[i];
      const mx = (px + qx) / 2;
      const my = Math.max(py, qy) + h * 0.16 * scale;
      c.quadraticCurveTo(mx, my, qx, qy);
    }
    c.quadraticCurveTo(bx + hw * 1.05, by - h * 0.25 * scale, bx + hw, by);
    c.quadraticCurveTo(bx, by + h * 0.04, bx - hw, by);
    c.closePath();
  };
  c.save();
  c.globalCompositeOperation = 'lighter';
  const halo = c.createRadialGradient(bx, by - h * 0.35, 0, bx, by - h * 0.35, h * 0.6);
  halo.addColorStop(0, rgbaHex(cols[1], 0.25));
  halo.addColorStop(1, rgbaHex(cols[1], 0));
  c.fillStyle = halo;
  c.fillRect(0, 0, w, h);
  c.restore();
  const layers: [number, string, number][] = [[1, cols[0], 0.9], [0.78, cols[1], 0.95], [0.48, cols[2], 1]];
  for (const [s, col, a] of layers) {
    shape(s);
    const g = c.createLinearGradient(0, by - h * s, 0, by);
    g.addColorStop(0, rgbaHex(col, 0));
    g.addColorStop(0.25, rgbaHex(col, a * 0.8));
    g.addColorStop(1, rgbaHex(col, a));
    c.fillStyle = g;
    c.fill();
  }
  // a tip pinching off and rising
  const u = phase;
  const tx = bx + Math.sin(u * P + seed) * w * 0.12;
  const ty = by - h * (0.75 + u * 0.22);
  c.fillStyle = rgbaHex(cols[1], 0.7 * (1 - u));
  c.beginPath();
  c.ellipse(tx, ty, w * 0.05 * (1 - u * 0.6), h * 0.06 * (1 - u * 0.5), 0, 0, P);
  c.fill();
}

const rgbaHex = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
};
