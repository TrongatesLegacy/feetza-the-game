// The shared kit for animated peel looks (animatedLooks.ts): the Pen the strokes go through (a Phaser Graphics
// object in play, a 2D canvas in the Peel Locker), a pooled particle system, a ribbon trail, smack rings, and the
// glue that plays a look on the cursor peel or paints it over a locker image.
// Looks are drawn in the peel's own frame: origin at the head's centre (the grip point the peel turns about),
// head radius HEAD_R, the handle running down +y. Nothing here allocates per frame: pools and typed arrays.

import Phaser from 'phaser';
import { crand } from '../systems/cosmeticRandom';

/** The head's radius in the peel's frame (src/art/peelArt.ts). */
export const HEAD_R = 86;
export const INK = 0x2a1810;

/** The strokes a look draws with, on either a Graphics object or a 2D canvas. */
export interface Pen {
  /** A polyline through n points of xy pairs. */
  line(pts: Float32Array, n: number, w: number, color: number, a: number): void;
  seg(x0: number, y0: number, x1: number, y1: number, w: number, color: number, a: number): void;
  dot(x: number, y: number, r: number, color: number, a: number): void;
  /** A filled polygon through n points, with an outline of width lw (0 for none) under the fill's edge. */
  poly(pts: Float32Array, n: number, color: number, a: number, lw: number, lc: number, la: number): void;
  /** A stroked ellipse. */
  ring(x: number, y: number, rx: number, ry: number, w: number, color: number, a: number): void;
  /** A soft radial glow (an ellipse turned by rot). */
  glow(x: number, y: number, rx: number, ry: number, rot: number, color: number, a: number): void;
  /** Drawing over a light menu with normal blending: bolts get a crisper, deeper edge. */
  light?: boolean;
}

// ——— colour ———

export const hex = (c: string): number => parseInt(c.replace('#', '').slice(0, 6), 16) || 0;
export function lerpC(a: number, b: number, t: number): number {
  const k = Math.max(0, Math.min(1, t));
  const r = ((a >> 16) & 255) + ((((b >> 16) & 255) - ((a >> 16) & 255)) * k);
  const g = ((a >> 8) & 255) + ((((b >> 8) & 255) - ((a >> 8) & 255)) * k);
  const bl = (a & 255) + (((b & 255) - (a & 255)) * k);
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl);
}
/** Lighter (k > 0, towards white) or darker (k < 0, towards black). */
export const shadeC = (c: number, k: number): number => (k >= 0 ? lerpC(c, 0xffffff, k) : lerpC(c, 0, -k));
/** A colour's lightness, 0–1. */
export const lum = (c: number): number => (0.3 * ((c >> 16) & 255) + 0.59 * ((c >> 8) & 255) + 0.11 * (c & 255)) / 255;
/** A saturated hue (0–1 round the wheel), lifted towards white by k. */
export function hueC(h: number, k = 0): number {
  const x = ((h % 1) + 1) % 1;
  const f = (n: number) => {
    const q = (n + x * 6) % 6;
    return 1 - Math.max(0, Math.min(1, Math.min(q, 4 - q)));
  };
  const r = f(5);
  const g = f(3);
  const b = f(1);
  return (Math.round((r + (1 - r) * k) * 255) << 16) | (Math.round((g + (1 - g) * k) * 255) << 8) | Math.round((b + (1 - b) * k) * 255);
}
/** A colour round a small palette, t running 0–1 (wrapping), blended between stops. */
export function cycleC(pal: readonly number[], t: number): number {
  const n = pal.length;
  const x = (((t % 1) + 1) % 1) * n;
  const i = Math.floor(x);
  return lerpC(pal[i % n], pal[(i + 1) % n], x - i);
}

// ——— the frame a look is drawn in ———

/** Where the peel is this frame. In the locker it sits still at the origin, unturned. */
export interface Frame {
  x: number;
  y: number;
  rot: number;
  s: number;
  /** Smoothed velocity (px/s) and how far it moved this frame. */
  vx: number;
  vy: number;
  moved: number;
  /** Reduced motion: keep the calm glow, drop the particles and trail. */
  calm: boolean;
  /** Drawn in the locker (small, over a light menu). */
  menu: boolean;
  t: number;
}
const wp = { x: 0, y: 0 };
/** The peel's frame → world. Returns a shared point: copy it before the next call. */
export function toWorld(f: Frame, lx: number, ly: number): { x: number; y: number } {
  const c = Math.cos(f.rot);
  const sn = Math.sin(f.rot);
  wp.x = f.x + f.s * (lx * c - ly * sn);
  wp.y = f.y + f.s * (lx * sn + ly * c);
  return wp;
}
/** "Up" on screen, as an angle in the peel's turned frame (flames lick up whichever way it leans). */
export const upAngle = (f: Frame): number => -Math.PI / 2 - f.rot;
export const rand = (a: number, b: number): number => a + crand() * (b - a);

// ——— particles ———

export const enum Bit {
  /** An outlined ember that cools from c0 to c1 as it rises. */
  Ember,
  /** A short bright streak (a spark), falling with gravity. */
  Spark,
  /** A four-point twinkle. */
  Glint,
  /** A five-point star, turning. */
  Star,
  /** A water drop, outlined. */
  Drop,
  /** A soft smoke puff that grows as it fades. */
  Smoke,
  /** A soft glowing mote. */
  Mote,
  /** A wind streak drawn along its motion. */
  Streak,
  /** A tumbling petal or leaf. */
  Petal,
  /** A tiny lightning flick. */
  Flick,
  /** A dark flake of ash with a hot edge. */
  Ash,
  /** A soul wisp: a pale head and a wavering tail. */
  Wisp,
  /** A bubble ring. */
  Bubble,
  /** A molten drip: a hot outlined blob that falls. */
  Lava,
}

/** A fixed pool of particles in world space (the peel's frame in the locker). The oldest is reused. */
export class Bits {
  readonly n: number;
  x: Float32Array;
  y: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  age: Float32Array;
  life: Float32Array;
  size: Float32Array;
  rot: Float32Array;
  spin: Float32Array;
  grav: Float32Array;
  drag: Float32Array;
  seed: Float32Array;
  kind: Uint8Array;
  c0: Uint32Array;
  c1: Uint32Array;
  next = 0;
  /** Scratch points for shapes. */
  private sp = new Float32Array(24);

  constructor(n = 64) {
    this.n = n;
    this.x = new Float32Array(n);
    this.y = new Float32Array(n);
    this.vx = new Float32Array(n);
    this.vy = new Float32Array(n);
    this.age = new Float32Array(n).fill(9);
    this.life = new Float32Array(n).fill(1);
    this.size = new Float32Array(n);
    this.rot = new Float32Array(n);
    this.spin = new Float32Array(n);
    this.grav = new Float32Array(n);
    this.drag = new Float32Array(n);
    this.seed = new Float32Array(n);
    this.kind = new Uint8Array(n);
    this.c0 = new Uint32Array(n);
    this.c1 = new Uint32Array(n);
  }

  emit(kind: Bit, x: number, y: number, vx: number, vy: number, size: number, life: number, c0: number, c1 = c0, grav = 0, drag = 0): number {
    const i = this.next;
    this.next = (i + 1) % this.n;
    this.kind[i] = kind;
    this.x[i] = x;
    this.y[i] = y;
    this.vx[i] = vx;
    this.vy[i] = vy;
    this.size[i] = size;
    this.life[i] = life;
    this.age[i] = 0;
    this.c0[i] = c0;
    this.c1[i] = c1;
    this.grav[i] = grav;
    this.drag[i] = drag;
    this.rot[i] = crand() * Math.PI * 2;
    this.spin[i] = (crand() * 2 - 1) * 4;
    this.seed[i] = crand() * 100;
    return i;
  }

  clear(): void {
    this.age.fill(9);
  }

  tick(dt: number): void {
    for (let i = 0; i < this.n; i++) {
      if (this.age[i] >= this.life[i]) continue;
      this.age[i] += dt;
      const d = Math.max(0, 1 - this.drag[i] * dt);
      this.vx[i] *= d;
      this.vy[i] = this.vy[i] * d + this.grav[i] * dt;
      this.x[i] += this.vx[i] * dt;
      this.y[i] += this.vy[i] * dt;
      this.rot[i] += this.spin[i] * dt;
    }
  }

  draw(pen: Pen, t: number): void {
    const sp = this.sp;
    for (let i = 0; i < this.n; i++) {
      const age = this.age[i];
      const life = this.life[i];
      if (age >= life) continue;
      const k = age / life;
      const x = this.x[i];
      const y = this.y[i];
      const r = this.size[i];
      const c0 = this.c0[i];
      const c1 = this.c1[i];
      // fade in fast, out slow
      const a = Math.min(1, k * 8) * (1 - k * k);
      if (a <= 0.01) continue;
      switch (this.kind[i] as Bit) {
        case Bit.Ember: {
          const rr = r * (1 - 0.55 * k);
          pen.dot(x, y, rr + Math.max(1.2, r * 0.35), INK, 0.75 * a);
          pen.dot(x, y, rr, lerpC(c0, c1, k * 1.3), a);
          pen.dot(x - rr * 0.3, y - rr * 0.3, rr * 0.4, 0xffffff, 0.6 * a * (1 - k));
          break;
        }
        case Bit.Spark: {
          const tx = x - this.vx[i] * 0.03;
          const ty = y - this.vy[i] * 0.03;
          pen.seg(x, y, tx, ty, r * 1.9, c1, 0.55 * a);
          pen.seg(x, y, tx, ty, r * 0.8, c0, a);
          break;
        }
        case Bit.Glint:
        case Bit.Star: {
          const star = this.kind[i] === Bit.Star;
          const tw = Math.sin(Math.PI * k);
          const rr = r * (0.45 + 0.55 * tw);
          const pts = star ? 5 : 4;
          const inner = star ? 0.45 : 0.22;
          for (let q = 0; q < pts * 2; q++) {
            const ang = this.rot[i] * (star ? 1 : 0.15) + (q / (pts * 2)) * Math.PI * 2;
            const rad = q % 2 ? rr * inner : rr;
            sp[q * 2] = x + Math.cos(ang) * rad;
            sp[q * 2 + 1] = y + Math.sin(ang) * rad;
          }
          pen.glow(x, y, rr * 1.8, rr * 1.8, 0, c1, 0.35 * a);
          pen.poly(sp, pts * 2, c0, a, Math.max(1.4, r * 0.22), shadeC(c1, -0.55), 0.7 * a);
          pen.dot(x, y, rr * 0.22, 0xffffff, a);
          break;
        }
        case Bit.Drop: {
          // a teardrop pointing back along its motion
          const sp2 = Math.hypot(this.vx[i], this.vy[i]) || 1;
          const dx = -this.vx[i] / sp2;
          const dy = -this.vy[i] / sp2;
          const nx = -dy;
          const ny = dx;
          sp[0] = x + dx * r * 2.3;
          sp[1] = y + dy * r * 2.3;
          // the round front: a half circle from one side, through the leading point, to the other
          for (let q = 0; q <= 6; q++) {
            const th = -Math.PI / 2 + (q / 6) * Math.PI;
            sp[2 + q * 2] = x + (-dx * Math.cos(th) + nx * Math.sin(th)) * r;
            sp[3 + q * 2] = y + (-dy * Math.cos(th) + ny * Math.sin(th)) * r;
          }
          pen.poly(sp, 8, c0, 0.9 * a, Math.max(1.4, r * 0.4), shadeC(c1, -0.5), 0.8 * a);
          pen.dot(x - r * 0.3, y - r * 0.3, r * 0.35, 0xffffff, 0.85 * a);
          break;
        }
        case Bit.Smoke: {
          // soft puffs: a darker body and a lighter top (so it reads on bright and dark backdrops)
          const rr = r * (0.8 + 1.4 * k);
          const sa = Math.sin(Math.PI * k);
          pen.glow(x, y, rr * 1.5, rr * 1.4, 0, c1, 0.7 * sa);
          pen.glow(x + rr * 0.15, y - rr * 0.2, rr, rr * 0.9, 0, c0, 0.75 * sa);
          break;
        }
        case Bit.Mote: {
          const tw = 0.7 + 0.3 * Math.sin(t * 9 + this.seed[i]);
          pen.dot(x, y, r * 2.4, c1, 0.18 * a * tw);
          pen.dot(x, y, r, c0, 0.9 * a * tw);
          break;
        }
        case Bit.Streak: {
          const L = 0.07;
          const tx = x - this.vx[i] * L;
          const ty = y - this.vy[i] * L;
          const sa = Math.sin(Math.PI * k);
          pen.seg(x, y, tx, ty, r * 2.2, c1, 0.25 * sa);
          pen.seg(x, y, (x + tx) / 2, (y + ty) / 2, r, c0, 0.8 * sa);
          break;
        }
        case Bit.Petal: {
          const ca = Math.cos(this.rot[i]);
          const sa = Math.sin(this.rot[i]);
          // squash it as it tumbles
          const w = r * (0.35 + 0.35 * Math.abs(Math.sin(this.rot[i] * 1.7 + this.seed[i])));
          for (let q = 0; q < 6; q++) {
            const ang = (q / 6) * Math.PI * 2;
            const px = Math.cos(ang) * r;
            const py = Math.sin(ang) * w;
            sp[q * 2] = x + px * ca - py * sa;
            sp[q * 2 + 1] = y + px * sa + py * ca;
          }
          pen.poly(sp, 6, c0, a, Math.max(1.2, r * 0.25), shadeC(c1, -0.45), 0.7 * a);
          break;
        }
        case Bit.Flick: {
          // a jagged little bolt, re-jagged ~20 times a second
          const sd = this.seed[i] + Math.floor(age * 20) * 7.1;
          const ang = this.rot[i];
          const cx = Math.cos(ang);
          const cy = Math.sin(ang);
          for (let q = 0; q <= 4; q++) {
            const off = q === 0 || q === 4 ? 0 : Math.sin(sd * (q + 1.3) * 12.9898) * r * 0.45;
            const u = (q / 4) * r * 2.2;
            sp[q * 2] = x + cx * u - cy * off;
            sp[q * 2 + 1] = y + cy * u + cx * off;
          }
          const fa = a * (0.6 + 0.4 * Math.sin(sd));
          pen.line(sp, 5, r * 0.75, c1, 0.4 * fa);
          pen.line(sp, 5, r * 0.32, c0, fa);
          break;
        }
        case Bit.Ash: {
          const ca = Math.cos(this.rot[i]);
          const sa = Math.sin(this.rot[i]);
          sp[0] = x + ca * r;
          sp[1] = y + sa * r;
          sp[2] = x - sa * r * 0.55;
          sp[3] = y + ca * r * 0.55;
          sp[4] = x - ca * r * 0.8;
          sp[5] = y - sa * r * 0.8;
          sp[6] = x + sa * r * 0.4;
          sp[7] = y - ca * r * 0.4;
          pen.poly(sp, 4, c0, 0.9 * a, Math.max(1.2, r * 0.3), lerpC(c1, c0, k), 0.9 * a * (1 - k * 0.6));
          break;
        }
        case Bit.Wisp: {
          // a tail that wavers behind it
          const sp2 = Math.hypot(this.vx[i], this.vy[i]) || 1;
          const dx = -this.vx[i] / sp2;
          const dy = -this.vy[i] / sp2;
          for (let q = 0; q < 6; q++) {
            const u = q * r * 0.9;
            const wob = Math.sin(t * 6 + this.seed[i] + q * 1.1) * r * 0.25 * q;
            sp[q * 2] = x + dx * u - dy * wob;
            sp[q * 2 + 1] = y + dy * u + dx * wob;
          }
          pen.line(sp, 6, r * 1.6, c1, 0.25 * a);
          pen.line(sp, 4, r * 0.8, c0, 0.55 * a);
          pen.dot(x, y, r * 0.9, c0, 0.8 * a);
          pen.dot(x, y, r * 0.45, 0xffffff, 0.85 * a);
          break;
        }
        case Bit.Bubble: {
          pen.ring(x, y, r, r, Math.max(1.4, r * 0.28), shadeC(c1, -0.35), 0.7 * a);
          pen.ring(x, y, r, r, Math.max(0.8, r * 0.14), c0, 0.9 * a);
          pen.dot(x - r * 0.35, y - r * 0.35, r * 0.25, 0xffffff, 0.9 * a);
          break;
        }
        case Bit.Lava: {
          const rr = r * (1 - 0.35 * k);
          // stretched along its fall
          pen.seg(x, y, x - this.vx[i] * 0.02, y - this.vy[i] * 0.03, rr * 2 + 2.4, INK, 0.8 * a);
          pen.seg(x, y, x - this.vx[i] * 0.02, y - this.vy[i] * 0.03, rr * 2, lerpC(c0, c1, k), a);
          pen.dot(x, y, rr * 0.45, 0xfff2c0, 0.8 * a * (1 - k));
          break;
        }
      }
    }
  }
}

// ——— the trail: a tapering ribbon along the peel's recent path ———

export const enum TrailKind {
  /** Edge, body and core colours. */
  Ribbon,
  /** A rainbow band whose hues run along it and drift with time. */
  Prism,
}
export interface TrailStyle {
  kind: TrailKind;
  /** Edge (darker, so it reads on bright backdrops), body, core. */
  c: readonly [number, number, number];
  /** Width at the head, in screen px at the default peel size. */
  w: number;
  /** Seconds a point lasts. */
  life: number;
  /** Overall alpha. */
  a: number;
}

export class Trail {
  private N = 26;
  private x = new Float32Array(this.N);
  private y = new Float32Array(this.N);
  private t = new Float32Array(this.N).fill(99);
  private head = 0;
  private count = 0;

  /** Add the peel's current spot (when it has moved far enough); a jump starts a fresh ribbon. */
  push(x: number, y: number, dt: number): void {
    for (let i = 0; i < this.N; i++) this.t[i] += dt;
    const p = (this.head + this.N - 1) % this.N;
    const d = Math.hypot(x - this.x[p], y - this.y[p]);
    if (d > 320) this.count = 0;
    if (this.count === 0 || d > 7) {
      this.x[this.head] = x;
      this.y[this.head] = y;
      this.t[this.head] = 0;
      this.head = (this.head + 1) % this.N;
      this.count = Math.min(this.N, this.count + 1);
    }
  }

  reset(): void {
    this.count = 0;
  }

  draw(pen: Pen, st: TrailStyle, s: number, time: number): void {
    const n = this.count;
    for (let k = 1; k < n; k++) {
      const i1 = (this.head - n + k + this.N * 2) % this.N;
      const i0 = (i1 + this.N - 1) % this.N;
      if (this.t[i1] > st.life) continue;
      // fades with age and tapers towards the tail
      const u = (k / n) * (1 - this.t[i1] / st.life);
      if (u <= 0.02) continue;
      const w = st.w * u * s;
      const x0 = this.x[i0];
      const y0 = this.y[i0];
      const x1 = this.x[i1];
      const y1 = this.y[i1];
      if (st.kind === TrailKind.Prism) {
        const h = time * 0.35 + k * 0.045;
        pen.seg(x0, y0, x1, y1, w * 1.25, hueC(h, 0.05), 0.4 * u * st.a);
        pen.seg(x0, y0, x1, y1, w * 0.7, hueC(h + 0.08, 0.45), 0.6 * u * st.a);
        pen.seg(x0, y0, x1, y1, w * 0.25, 0xffffff, 0.8 * u * st.a);
      } else {
        pen.seg(x0, y0, x1, y1, w * 1.25, st.c[0], 0.4 * u * st.a);
        pen.seg(x0, y0, x1, y1, w * 0.75, st.c[1], 0.6 * u * st.a);
        pen.seg(x0, y0, x1, y1, w * 0.3, st.c[2], 0.8 * u * st.a);
      }
    }
  }
}

// ——— smack rings: a quick expanding ring where a smack lands ———

export class Rings {
  private x = new Float32Array(3);
  private y = new Float32Array(3);
  private age = new Float32Array(3).fill(9);
  private next = 0;
  static LIFE = 0.32;

  fire(x: number, y: number): void {
    const i = this.next;
    this.next = (i + 1) % 3;
    this.x[i] = x;
    this.y[i] = y;
    this.age[i] = 0;
  }

  draw(pen: Pen, dt: number, edge: number, body: number, size = 1): void {
    for (let i = 0; i < 3; i++) {
      if (this.age[i] >= Rings.LIFE) continue;
      this.age[i] += dt;
      const k = Math.min(1, this.age[i] / Rings.LIFE);
      const a = 1 - k;
      const r = (24 + 90 * Math.sqrt(k)) * size;
      pen.ring(this.x[i], this.y[i], r, r * 0.5, 12 * a + 2, edge, 0.4 * a);
      pen.ring(this.x[i], this.y[i], r, r * 0.5, 5 * a + 1.5, body, 0.8 * a);
    }
  }
}

// ——— pens ———

/** A small pool of soft glow images (the 'glow' texture), normal-blended so colour shows on bright backdrops too.
 *  Drawn in order each frame; unused ones hide. */
export class GlowPool {
  imgs: Phaser.GameObjects.Image[];
  used = 0;
  constructor(scene: Phaser.Scene, n: number) {
    this.imgs = Array.from({ length: n }, () => scene.add.image(0, 0, 'glow').setVisible(false));
  }
  begin(): void {
    this.used = 0;
  }
  end(): void {
    for (let i = this.used; i < this.imgs.length; i++) this.imgs[i].setVisible(false);
  }
  put(x: number, y: number, rx: number, ry: number, rot: number, color: number, a: number): void {
    const im = this.imgs[this.used];
    if (!im) return;
    this.used++;
    // the texture's soft edge reaches about half its width, so scale to twice the radius
    im.setVisible(a > 0.005).setPosition(x, y).setRotation(rot).setScale((rx * 2) / 256, (ry * 2) / 256).setTint(color).setAlpha(Math.min(1, a));
  }
}

/** A pen on a Graphics object. Glows go to the pool (placed in world space through the frame) when there is one,
 *  else to stacked soft discs. */
export function graphicsPen(g: Phaser.GameObjects.Graphics, pool?: GlowPool, frame?: () => Frame, local = false): Pen {
  return {
    line(pts, n, w, color, a) {
      if (a <= 0.005 || n < 2) return;
      g.lineStyle(w, color, a);
      g.beginPath();
      g.moveTo(pts[0], pts[1]);
      for (let i = 1; i < n; i++) g.lineTo(pts[i * 2], pts[i * 2 + 1]);
      g.strokePath();
    },
    seg(x0, y0, x1, y1, w, color, a) {
      if (a <= 0.005) return;
      g.lineStyle(w, color, a);
      g.lineBetween(x0, y0, x1, y1);
    },
    dot(x, y, r, color, a) {
      if (a <= 0.005 || r <= 0.05) return;
      g.fillStyle(color, a);
      g.fillCircle(x, y, r);
    },
    poly(pts, n, color, a, lw, lc, la) {
      if (a <= 0.005) return;
      g.beginPath();
      g.moveTo(pts[0], pts[1]);
      for (let i = 1; i < n; i++) g.lineTo(pts[i * 2], pts[i * 2 + 1]);
      g.closePath();
      if (lw > 0) {
        g.lineStyle(lw, lc, la);
        g.strokePath();
      }
      g.fillStyle(color, a);
      g.fillPath();
    },
    ring(x, y, rx, ry, w, color, a) {
      if (a <= 0.005) return;
      g.lineStyle(w, color, a);
      g.strokeEllipse(x, y, rx * 2, ry * 2);
    },
    glow(x, y, rx, ry, rot, color, a) {
      if (a <= 0.005) return;
      if (pool && frame) {
        const f = frame();
        if (local) {
          const p = toWorld(f, x, y);
          pool.put(p.x, p.y, rx * f.s, ry * f.s, rot + f.rot, color, a);
        } else pool.put(x, y, rx, ry, rot, color, a);
        return;
      }
      // stacked discs, thinning outwards
      for (let i = 0; i < 4; i++) {
        const k = 1 - i * 0.22;
        g.fillStyle(color, a * 0.22);
        g.fillEllipse(x, y, rx * 2 * k, ry * 2 * k);
      }
    },
  };
}

export const css = (c: number, a: number): string => `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;
/** A pen on a 2D canvas. m: a line-width boost, so strokes stay crisp when the peel is drawn small. Glows are
 *  kept inside the canvas's margin round the peel (a glow cut off by the canvas edge shows as a box). */
export function canvasPen(ctx: CanvasRenderingContext2D, m: { w: number }): Pen {
  const maxR = HEAD_R * 1.6;
  // one soft unit-circle gradient per colour, reused (alpha goes through globalAlpha)
  const grads = new Map<number, CanvasGradient>();
  const grad = (c: number) => {
    let gr = grads.get(c);
    if (!gr) {
      gr = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      gr.addColorStop(0, css(c, 1));
      gr.addColorStop(0.35, css(c, 0.6));
      gr.addColorStop(1, css(c, 0));
      grads.set(c, gr);
    }
    return gr;
  };
  return {
    light: true,
    line(pts, n, w, color, a) {
      if (a <= 0.005 || n < 2) return;
      ctx.beginPath();
      ctx.moveTo(pts[0], pts[1]);
      for (let i = 1; i < n; i++) ctx.lineTo(pts[i * 2], pts[i * 2 + 1]);
      ctx.strokeStyle = css(color, a);
      ctx.lineWidth = w * m.w;
      ctx.stroke();
    },
    seg(x0, y0, x1, y1, w, color, a) {
      if (a <= 0.005) return;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.strokeStyle = css(color, a);
      ctx.lineWidth = w * m.w;
      ctx.stroke();
    },
    dot(x, y, r, color, a) {
      if (a <= 0.005 || r <= 0.05) return;
      ctx.beginPath();
      ctx.arc(x, y, r * Math.sqrt(m.w), 0, Math.PI * 2);
      ctx.fillStyle = css(color, a);
      ctx.fill();
    },
    poly(pts, n, color, a, lw, lc, la) {
      if (a <= 0.005) return;
      ctx.beginPath();
      ctx.moveTo(pts[0], pts[1]);
      for (let i = 1; i < n; i++) ctx.lineTo(pts[i * 2], pts[i * 2 + 1]);
      ctx.closePath();
      if (lw > 0) {
        ctx.strokeStyle = css(lc, la);
        ctx.lineWidth = lw * m.w;
        ctx.stroke();
      }
      ctx.fillStyle = css(color, a);
      ctx.fill();
    },
    ring(x, y, rx, ry, w, color, a) {
      if (a <= 0.005) return;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      ctx.strokeStyle = css(color, a);
      ctx.lineWidth = w * m.w;
      ctx.stroke();
    },
    glow(x, y, rx, ry, rot, color, a) {
      if (a <= 0.005) return;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.scale(Math.max(1, Math.min(rx, maxR - Math.abs(x))), Math.max(1, Math.min(ry, maxR - Math.abs(y))));
      ctx.globalAlpha = Math.min(1, a);
      ctx.fillStyle = grad(color);
      ctx.fillRect(-1, -1, 2, 2);
      ctx.restore();
    },
  };
}

// ——— a look's moving parts, and how it plays in game and in the locker ———

/** One look's state and drawing, shared by play and the locker. */
export interface LookCore {
  /** Advance by dt, shedding particles (into world space, through the frame). */
  tick(dt: number, f: Frame): void;
  /** World space, behind the peel: the trail. */
  under(pen: Pen, f: Frame, dt: number): void;
  /** The peel's frame, behind it: glows and flames. */
  back(pen: Pen, f: Frame): void;
  /** The peel's frame, over it: rims, sheens, cracks. */
  front(pen: Pen, f: Frame): void;
  /** World space, over the peel: particles and smack rings. */
  over(pen: Pen, f: Frame, dt: number): void;
  smack(x: number, y: number, f: Frame): void;
  /** Forget the trail and particles (the look was hidden for a while). */
  reset(): void;
}

/** What a look needs from the game scene. */
export interface LookHost {
  scene: Phaser.Scene;
  /** The cursor layer the peel lives in. */
  layer: Phaser.GameObjects.Container;
  peel: Phaser.GameObjects.Image;
  /** Reduced motion: keep the calm parts (glow, arcs) and drop the flashes, sparks and trail. */
  reduced: () => boolean;
}

/** A look playing on the cursor peel. */
export interface LookFx {
  tick(dt: number): void;
  /** A smack landed (or missed) at this point. */
  smack(x: number, y: number): void;
  /** Hide it (another texture is on the peel for a while) or show it again. */
  setActive(on: boolean): void;
  destroy(): void;
  /** The look draws its own trail, so the plain trail puffs can stay off. */
  ownTrail: boolean;
}

const below = (layer: Phaser.GameObjects.Container, o: Phaser.GameObjects.GameObject, peel: Phaser.GameObjects.Image) =>
  layer.moveBelow(o, peel as unknown as Phaser.GameObjects.GameObject);

/** Play a look on the cursor peel. Back to front: the trail, glows and flames behind the peel, the peel, then the
 *  look's front strokes and the particles. Back glows are normal-blended images (soft on any backdrop). */
export function playCore(h: LookHost, core: LookCore, ownTrail = true): LookFx {
  const { scene, layer, peel } = h;
  const underG = scene.add.graphics();
  const pool = new GlowPool(scene, 4);
  const backG = scene.add.graphics();
  const frontPool = new GlowPool(scene, 2);
  const frontG = scene.add.graphics();
  // soft glows for particles (smoke, twinkle halos), under their crisp strokes
  const overPool = new GlowPool(scene, 24);
  const overG = scene.add.graphics();
  const behind: Phaser.GameObjects.GameObject[] = [underG, ...pool.imgs, backG];
  for (const o of behind) {
    layer.add(o);
    below(layer, o, peel);
  }
  layer.add([...frontPool.imgs, frontG, ...overPool.imgs, overG]);
  const all: Phaser.GameObjects.GameObject[] = [...behind, ...frontPool.imgs, frontG, ...overPool.imgs, overG];
  const f: Frame = { x: peel.x, y: peel.y, rot: peel.rotation, s: peel.scale, vx: 0, vy: 0, moved: 0, calm: false, menu: false, t: 0 };
  const getF = () => f;
  const underPen = graphicsPen(underG);
  const backPen = graphicsPen(backG, pool, getF, true);
  const frontPen = graphicsPen(frontG, frontPool, getF, true);
  const overPen = graphicsPen(overG, overPool, getF);
  let active = true;
  let wasOn = true;
  return {
    ownTrail,
    tick(dt) {
      const on = active && peel.visible;
      for (const o of all) (o as Phaser.GameObjects.Graphics).setVisible(on);
      if (!on) {
        if (wasOn) core.reset();
        wasOn = false;
        f.x = peel.x;
        f.y = peel.y;
        return;
      }
      wasOn = true;
      const d = Math.max(dt, 0.004);
      const mvx = peel.x - f.x;
      const mvy = peel.y - f.y;
      f.moved = Math.hypot(mvx, mvy);
      // a smoothed velocity, so shed particles drift back along the path without jitter
      const k = Math.min(1, dt * 12);
      f.vx += (mvx / d - f.vx) * k;
      f.vy += (mvy / d - f.vy) * k;
      if (f.moved > 320) {
        f.vx = 0;
        f.vy = 0;
      }
      f.x = peel.x;
      f.y = peel.y;
      f.rot = peel.rotation;
      f.s = peel.scale;
      f.calm = h.reduced();
      f.t += dt;
      core.tick(dt, f);
      for (const g of [underG, backG, frontG, overG]) g.clear();
      backG.setPosition(f.x, f.y).setRotation(f.rot).setScale(f.s);
      frontG.setPosition(f.x, f.y).setRotation(f.rot).setScale(f.s);
      pool.begin();
      frontPool.begin();
      overPool.begin();
      core.under(underPen, f, dt);
      core.back(backPen, f);
      core.front(frontPen, f);
      core.over(overPen, f, dt);
      pool.end();
      frontPool.end();
      overPool.end();
    },
    smack(x, y) {
      if (active) core.smack(x, y, f);
    },
    setActive(on) {
      active = on;
    },
    destroy() {
      for (const o of all) o.destroy();
    },
  };
}

/** What a locker painter is handed each frame: a canvas behind the peel's image and one over it. */
export interface PaintCtx {
  front: Pen;
  fctx: CanvasRenderingContext2D;
  back: Pen | null;
  bctx: CanvasRenderingContext2D | null;
}
export type Painter = (p: PaintCtx, dt: number) => void;

/** A peel moving through a canvas (the dev look lab): its path, in peel units, and when it smacks. */
export interface Motion {
  (t: number): { x: number; y: number; rot: number; smack?: boolean };
}
/** Paint a look on a peel that moves around (so its trail and smacks show). The canvas's base transform is the
 *  world; `peel(ctx)` draws the peel's own image in its frame (origin at the grip point), between back and front. */
export type MovingPainter = (back: { pen: Pen; ctx: CanvasRenderingContext2D }, front: { pen: Pen; ctx: CanvasRenderingContext2D }, dt: number, peel: (ctx: CanvasRenderingContext2D) => void) => void;
export function paintMoving(core: LookCore, calm: () => boolean, motion: Motion): MovingPainter {
  const f: Frame = { x: 0, y: 0, rot: 0, s: 1, vx: 0, vy: 0, moved: 0, calm: false, menu: false, t: 0 };
  // drawn as in play (menu: false), so the trail, dust and full-height flames show
  let first = true;
  return (back, front, dt, peel) => {
    f.calm = calm();
    f.t += dt;
    const m = motion(f.t);
    const d = Math.max(dt, 0.004);
    const mvx = first ? 0 : m.x - f.x;
    const mvy = first ? 0 : m.y - f.y;
    first = false;
    f.moved = Math.hypot(mvx, mvy);
    const k = Math.min(1, dt * 12);
    f.vx += (mvx / d - f.vx) * k;
    f.vy += (mvy / d - f.vy) * k;
    f.x = m.x;
    f.y = m.y;
    f.rot = m.rot;
    core.tick(dt, f);
    if (m.smack) core.smack(f.x, f.y, f);
    const local = (ctx: CanvasRenderingContext2D, draw: () => void) => {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rot);
      draw();
      ctx.restore();
    };
    core.under(back.pen, f, dt);
    local(back.ctx, () => core.back(back.pen, f));
    local(front.ctx, () => {
      peel(front.ctx);
      core.front(front.pen, f);
    });
    core.over(front.pen, f, dt);
  };
}

/** Paint a look in the locker: the peel sits still at the origin of its own frame. */
export function paintCore(core: LookCore, calm: () => boolean): Painter {
  const f: Frame = { x: 0, y: 0, rot: 0, s: 1, vx: 0, vy: 0, moved: 0, calm: false, menu: true, t: 0 };
  return (p, dt) => {
    f.calm = calm();
    f.t += dt;
    core.tick(dt, f);
    if (p.back) core.back(p.back, f);
    core.front(p.front, f);
    core.over(p.front, f, dt);
  };
}
