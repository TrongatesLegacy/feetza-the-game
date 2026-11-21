// Animated peel looks: live effects layered over a peel's static art, keyed by peel id. A look plays in two
// places from one set of drawing code:
// - in play, on Phaser Graphics that follow the cursor peel (playLook, from GameScene), plus its smack burst
// - in the Peel Locker, on a small canvas laid over the peel's <img> (animateLookImg, from ui.ts)
// Each look draws through a Pen, so the same strokes go to a Graphics object or a 2D canvas. Everything is
// allocated up front (pools and typed arrays) so nothing is created per frame.
// To give another peel an animated look, add an entry to LOOKS.

import Phaser from 'phaser';
import { ZEUS_BLADE } from './godShapes';

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

/** The strokes a look draws with, on either a Graphics object or a 2D canvas. */
interface Pen {
  /** A polyline through n points of xy pairs. */
  line(pts: Float32Array, n: number, w: number, color: number, a: number): void;
  seg(x0: number, y0: number, x1: number, y1: number, w: number, color: number, a: number): void;
  dot(x: number, y: number, r: number, color: number, a: number): void;
  /** Drawing over a light menu with normal blending: bolts get a crisper, deeper blue edge. */
  light?: boolean;
}

interface AnimatedLook {
  play(h: LookHost): LookFx;
  /** A fresh painter for one locker canvas: draws a frame in the peel's frame (origin at the peel's grip point). */
  painter(): (pen: Pen, ctx: CanvasRenderingContext2D, dt: number) => void;
}

// ——— shared lightning helpers ———

/** Midpoint displacement on n = 2^k segments: smooth-ish jaggedness with pinned ends, in [-1, 1]. */
function jitter(off: Float32Array, rough = 0.62): void {
  const n = off.length - 1;
  off[0] = 0;
  off[n] = 0;
  let step = n;
  let amp = 1;
  while (step > 1) {
    const half = step >> 1;
    for (let i = half; i < n; i += step) off[i] = (off[i - half] + off[i + half]) / 2 + (Math.random() * 2 - 1) * amp;
    step = half;
    amp *= rough;
  }
}

/** Lay a jagged bolt from (x0,y0) to (x1,y1) into out, using the offsets in off (scaled by amp px). */
function layBolt(out: Float32Array, off: Float32Array, x0: number, y0: number, x1: number, y1: number, amp: number): number {
  const n = off.length - 1;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const d = Math.hypot(dx, dy) || 1;
  const nx = -dy / d;
  const ny = dx / d;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    out[i * 2] = x0 + dx * t + nx * off[i] * amp;
    out[i * 2 + 1] = y0 + dy * t + ny * off[i] * amp;
  }
  return n + 1;
}

/** A bolt in the look's colours: a wide blue haze, a bright blue body and a white-hot core. */
function strokeBolt(pen: Pen, pts: Float32Array, n: number, w: number, a: number, haze = 0x2a8cff, body = 0x8fd8ff): void {
  if (a <= 0.01) return;
  if (pen.light) {
    pen.line(pts, n, w * 2.2, 0x1f6fd8, 0.4 * a);
    pen.line(pts, n, w * 1.3, 0x6cc4ff, 0.9 * a);
    pen.line(pts, n, w * 0.6, 0xffffff, a);
    return;
  }
  pen.line(pts, n, w * 3.6, haze, 0.3 * a);
  pen.line(pts, n, w * 1.7, body, 0.6 * a);
  pen.line(pts, n, w * 0.7, 0xffffff, 0.95 * a);
}

// ——— Zeus: a lightning sword ———
// The blade's spine in the peel's frame, relative to the grip point (110, 100) the peel turns about.
const OX = 110;
const OY = 100;
const SPINE = ZEUS_BLADE.map(([x, y, w]) => [x - OX, y - OY, w] as const);
const TIP = { x: SPINE[SPINE.length - 1][0], y: SPINE[SPINE.length - 1][1] };
const BLADE_MID = { x: 0, y: (SPINE[0][1] + TIP.y) / 2 };
const BLADE_LEN = SPINE[0][1] - TIP.y;
const bp = { x: 0, y: 0 };
/** A point on the blade: u runs hilt (0) to tip (1), s across it (-1 left edge … 1 right edge). */
function bladeAt(u: number, s: number): typeof bp {
  const f = Math.max(0, Math.min(1, u)) * (SPINE.length - 1);
  const i = Math.min(SPINE.length - 2, Math.floor(f));
  const k = f - i;
  const [x0, y0, w0] = SPINE[i];
  const [x1, y1, w1] = SPINE[i + 1];
  const w = w0 + (w1 - w0) * k;
  bp.x = x0 + (x1 - x0) * k + (s * w) / 2;
  bp.y = y0 + (y1 - y0) * k;
  return bp;
}

const SEG = 8;
interface Arc {
  u: number;
  du: number;
  s0: number;
  s1: number;
  age: number;
  life: number;
  flick: number;
  off: Float32Array;
  pts: Float32Array;
  /** A fork off the arc: where it leaves (segment index), its heading and length. */
  bAt: number;
  bAng: number;
  bLen: number;
  boff: Float32Array;
  bpts: Float32Array;
}
const newArc = (): Arc => ({ u: 0, du: 0, s0: 0, s1: 0, age: 1, life: 0, flick: 1, off: new Float32Array(SEG + 1), pts: new Float32Array((SEG + 1) * 2), bAt: 4, bAng: 0, bLen: 0, boff: new Float32Array(5), bpts: new Float32Array(10) });

function spawnArc(a: Arc, long = false): void {
  a.u = long ? 0.04 : Math.random() * 0.55;
  a.du = long ? 0.92 : 0.2 + Math.random() * 0.22;
  // most arcs cross the blade; some hug an edge and crackle just outside it, where they show against the room
  if (!long && Math.random() < 0.45) {
    const side = Math.random() < 0.5 ? -1 : 1;
    a.s0 = side * (0.9 + Math.random() * 0.3);
    a.s1 = side * (1.15 + Math.random() * 0.45);
  } else {
    a.s0 = (Math.random() * 2 - 1) * 0.85;
    a.s1 = (Math.random() * 2 - 1) * 0.85;
  }
  a.age = 0;
  a.life = long ? 0.22 : 0.35 + Math.random() * 0.45;
  a.bAt = 2 + Math.floor(Math.random() * 5);
  a.bAng = (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.7);
  a.bLen = Math.random() < 0.75 ? 14 + Math.random() * 20 : 0;
  jitter(a.off);
  jitter(a.boff);
}

/** The shared Zeus state: crawling arcs on the blade, a flash now and then (a bolt off the tip). */
class ZeusCore {
  arcs = [newArc(), newArc(), newArc()];
  tipOff = new Float32Array(SEG + 1);
  tipPts = new Float32Array((SEG + 1) * 2);
  forkOff = new Float32Array(5);
  forkPts = new Float32Array(10);
  regen = 0;
  nextFlash = 1 + Math.random() * 1.5;
  flash = 0;
  tipAng = 0;
  pulse = 0;

  constructor() {
    this.arcs.forEach((a, i) => {
      spawnArc(a);
      a.age = a.life * (i / 3);
    });
  }

  tick(dt: number, flashes: boolean): void {
    this.pulse += dt;
    this.regen -= dt;
    // the bolts re-jag every few frames (about 20 times a second), not every frame
    const rejag = this.regen <= 0;
    if (rejag) this.regen = 0.05;
    for (const a of this.arcs) {
      a.age += dt;
      a.u += dt * 0.45; // crawl towards the tip
      if (a.age >= a.life || a.u + a.du > 1.02) spawnArc(a);
      else if (rejag) {
        jitter(a.off);
        jitter(a.boff);
        a.flick = 0.65 + Math.random() * 0.35;
      }
    }
    this.flash = Math.max(0, this.flash - dt / 0.16);
    this.nextFlash -= dt;
    if (flashes && this.nextFlash <= 0) {
      this.nextFlash = 1.6 + Math.random() * 2.2;
      this.flash = 1;
      this.tipAng = (Math.random() * 2 - 1) * 0.5;
      jitter(this.tipOff, 0.7);
      jitter(this.forkOff);
      // the whole blade lights up with one long arc
      spawnArc(this.arcs[0], true);
    } else if (rejag && this.flash > 0) {
      jitter(this.tipOff, 0.7);
      jitter(this.forkOff);
    }
  }

  /** How bright the glow is: a slow breath, a flicker, and the flash. */
  glow(): number {
    return 0.75 + 0.12 * Math.sin(this.pulse * 3.1) + 0.06 * Math.sin(this.pulse * 23.7) + 0.9 * this.flash;
  }

  /** Arcs and the flash bolt, in the peel's frame. */
  draw(pen: Pen): void {
    for (const a of this.arcs) {
      const env = Math.sqrt(Math.sin(Math.PI * Math.min(1, a.age / a.life)));
      const al = env * a.flick;
      const A = bladeAt(a.u, a.s0);
      const x0 = A.x;
      const y0 = A.y;
      const B = bladeAt(a.u + a.du, a.s1);
      const len = Math.hypot(B.x - x0, B.y - y0);
      const n = layBolt(a.pts, a.off, x0, y0, B.x, B.y, Math.min(16, Math.max(5, len * 0.22)));
      strokeBolt(pen, a.pts, n, 3.4, al);
      if (a.bLen > 0) {
        const bx = a.pts[a.bAt * 2];
        const by = a.pts[a.bAt * 2 + 1];
        const ang = Math.atan2(B.y - y0, B.x - x0) + a.bAng;
        const bn = layBolt(a.bpts, a.boff, bx, by, bx + Math.cos(ang) * a.bLen, by + Math.sin(ang) * a.bLen, 5);
        strokeBolt(pen, a.bpts, bn, 2.4, al * 0.85);
      }
    }
    if (this.flash > 0.02) {
      // a bolt leaps off the tip, with a fork
      const len = 38 + 26 * this.flash;
      const ang = -Math.PI / 2 + this.tipAng;
      const ex = TIP.x + Math.cos(ang) * len;
      const ey = TIP.y + Math.sin(ang) * len;
      const n = layBolt(this.tipPts, this.tipOff, TIP.x, TIP.y, ex, ey, 11);
      strokeBolt(pen, this.tipPts, n, 4, this.flash);
      const fx = this.tipPts[8];
      const fy = this.tipPts[9];
      const fa = ang + (this.tipAng > 0 ? -0.8 : 0.8);
      const fn = layBolt(this.forkPts, this.forkOff, fx, fy, fx + Math.cos(fa) * 22, fy + Math.sin(fa) * 22, 5);
      strokeBolt(pen, this.forkPts, fn, 2.6, this.flash * 0.9);
      pen.dot(TIP.x, TIP.y, 9 * this.flash, 0xffffff, 0.8 * this.flash);
    }
  }
}

/** Small sparks shed off the blade: a fixed pool of short streaks with gravity. */
class Sparks {
  x = new Float32Array(28);
  y = new Float32Array(28);
  vx = new Float32Array(28);
  vy = new Float32Array(28);
  life = new Float32Array(28);
  age = new Float32Array(28).fill(9);
  next = 0;

  emit(x: number, y: number, vx: number, vy: number): void {
    const i = this.next;
    this.next = (i + 1) % this.x.length;
    this.x[i] = x;
    this.y[i] = y;
    this.vx[i] = vx;
    this.vy[i] = vy;
    this.age[i] = 0;
    this.life[i] = 0.22 + Math.random() * 0.22;
  }

  tick(dt: number, pen: Pen): void {
    for (let i = 0; i < this.x.length; i++) {
      if (this.age[i] >= this.life[i]) continue;
      this.age[i] += dt;
      this.vy[i] += 520 * dt;
      this.x[i] += this.vx[i] * dt;
      this.y[i] += this.vy[i] * dt;
      const a = 1 - this.age[i] / this.life[i];
      if (a <= 0) continue;
      const tx = this.x[i] - this.vx[i] * 0.025;
      const ty = this.y[i] - this.vy[i] * 0.025;
      pen.seg(this.x[i], this.y[i], tx, ty, 3.2, 0x5ab8ff, 0.5 * a);
      pen.seg(this.x[i], this.y[i], tx, ty, 1.3, 0xffffff, a);
    }
  }
}

/** A short lightning burst where a smack lands: radial forked bolts and a white flash. */
class Bursts {
  pool = Array.from({ length: 3 }, () => ({
    x: 0,
    y: 0,
    age: 9,
    rot: 0,
    offs: Array.from({ length: 6 }, () => new Float32Array(SEG + 1)),
    pts: new Float32Array((SEG + 1) * 2),
  }));
  next = 0;
  regen = 0;
  static LIFE = 0.24;

  fire(x: number, y: number): void {
    const b = this.pool[this.next];
    this.next = (this.next + 1) % this.pool.length;
    b.x = x;
    b.y = y;
    b.age = 0;
    b.rot = Math.random() * Math.PI * 2;
    b.offs.forEach((o) => jitter(o));
  }

  tick(dt: number, pen: Pen): void {
    this.regen -= dt;
    const rejag = this.regen <= 0;
    if (rejag) this.regen = 0.04;
    for (const b of this.pool) {
      if (b.age >= Bursts.LIFE) continue;
      b.age += dt;
      const k = Math.min(1, b.age / Bursts.LIFE);
      const a = 1 - k * k;
      // a hot white core that shrinks, then the bolts reach out
      pen.dot(b.x, b.y, 34 * (1 - k) + 8, 0x5ab8ff, 0.28 * a);
      pen.dot(b.x, b.y, 16 * (1 - k) + 4, 0xffffff, 0.85 * a);
      b.offs.forEach((o, i) => {
        if (rejag) jitter(o);
        const ang = b.rot + (i / b.offs.length) * Math.PI * 2 + (i % 2 ? 0.25 : -0.15);
        const len = (i % 2 ? 44 : 66) * (0.55 + 0.45 * Math.min(1, k * 3));
        const n = layBolt(b.pts, o, b.x + Math.cos(ang) * 6, b.y + Math.sin(ang) * 6, b.x + Math.cos(ang) * len, b.y + Math.sin(ang) * len, 9);
        strokeBolt(pen, b.pts, n, 2, a);
      });
    }
  }
}

// ——— pens ———

function graphicsPen(g: Phaser.GameObjects.Graphics): Pen {
  return {
    line(pts, n, w, color, a) {
      g.lineStyle(w, color, a);
      g.beginPath();
      g.moveTo(pts[0], pts[1]);
      for (let i = 1; i < n; i++) g.lineTo(pts[i * 2], pts[i * 2 + 1]);
      g.strokePath();
    },
    seg(x0, y0, x1, y1, w, color, a) {
      g.lineStyle(w, color, a);
      g.lineBetween(x0, y0, x1, y1);
    },
    dot(x, y, r, color, a) {
      g.fillStyle(color, a);
      g.fillCircle(x, y, r);
    },
  };
}

const css = (c: number, a: number) => `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;
/** m: a line-width boost, so bolts stay crisp when the peel is drawn small. */
function canvasPen(ctx: CanvasRenderingContext2D, m: { w: number }): Pen {
  return {
    light: true,
    line(pts, n, w, color, a) {
      ctx.beginPath();
      ctx.moveTo(pts[0], pts[1]);
      for (let i = 1; i < n; i++) ctx.lineTo(pts[i * 2], pts[i * 2 + 1]);
      ctx.strokeStyle = css(color, a);
      ctx.lineWidth = w * m.w;
      ctx.stroke();
    },
    seg(x0, y0, x1, y1, w, color, a) {
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.strokeStyle = css(color, a);
      ctx.lineWidth = w * m.w;
      ctx.stroke();
    },
    dot(x, y, r, color, a) {
      ctx.beginPath();
      ctx.arc(x, y, r * Math.sqrt(m.w), 0, Math.PI * 2);
      ctx.fillStyle = css(color, a);
      ctx.fill();
    },
  };
}

// ——— Zeus in play ———

function playZeus(h: LookHost): LookFx {
  const { scene, layer, peel } = h;
  const ADD = Phaser.BlendModes.ADD;
  // behind the peel: a soft blue halo down the blade and the crackling trail; over it: the arcs, then sparks and bursts
  const halo = scene.add.image(0, 0, 'glow').setTint(0x4aa8ff).setBlendMode(ADD);
  const haloCore = scene.add.image(0, 0, 'glow').setTint(0xbfe8ff).setBlendMode(ADD);
  const trailG = scene.add.graphics().setBlendMode(ADD);
  const arcG = scene.add.graphics().setBlendMode(ADD);
  const worldG = scene.add.graphics().setBlendMode(ADD);
  for (const o of [trailG, halo, haloCore]) {
    layer.add(o);
    layer.moveBelow(o as unknown as Phaser.GameObjects.GameObject, peel as unknown as Phaser.GameObjects.GameObject);
  }
  layer.add(arcG);
  layer.add(worldG);
  const all = [halo, haloCore, trailG, arcG, worldG];
  const arcPen = graphicsPen(arcG);
  const worldPen = graphicsPen(worldG);
  const trailPen = graphicsPen(trailG);
  const core = new ZeusCore();
  const sparks = new Sparks();
  const bursts = new Bursts();
  // the trail: the last few tip positions (a ring), re-jagged every couple of frames
  const TN = 12;
  const tx = new Float32Array(TN);
  const ty = new Float32Array(TN);
  const tt = new Float32Array(TN).fill(9);
  const tj = new Float32Array(TN * 2);
  let head = 0;
  let trailRegen = 0;
  let lastX = peel.x;
  let lastY = peel.y;
  let active = true;
  const world = { x: 0, y: 0 };
  // peel frame → world
  const toWorld = (lx: number, ly: number) => {
    const s = peel.scale;
    const c = Math.cos(peel.rotation);
    const sn = Math.sin(peel.rotation);
    world.x = peel.x + s * (lx * c - ly * sn);
    world.y = peel.y + s * (lx * sn + ly * c);
    return world;
  };
  return {
    ownTrail: true,
    tick(dt) {
      const on = active && peel.visible;
      for (const o of all) o.setVisible(on);
      if (!on) {
        lastX = peel.x;
        lastY = peel.y;
        return;
      }
      const calm = h.reduced();
      core.tick(dt, !calm);
      const s = peel.scale;
      // the halo: a tall soft oval down the blade, breathing, and flaring with each flash
      const gl = core.glow();
      const m = toWorld(BLADE_MID.x, BLADE_MID.y);
      halo.setPosition(m.x, m.y).setRotation(peel.rotation).setScale((120 * s) / 256, (BLADE_LEN * 1.9 * s) / 256).setAlpha(Math.min(1, 0.7 * gl));
      haloCore.setPosition(m.x, m.y).setRotation(peel.rotation).setScale((60 * s) / 256, (BLADE_LEN * 1.35 * s) / 256).setAlpha(Math.min(1, 0.5 * gl));
      arcG.clear();
      arcG.setPosition(peel.x, peel.y).setRotation(peel.rotation).setScale(s);
      core.draw(arcPen);
      worldG.clear();
      trailG.clear();
      const mvx = peel.x - lastX;
      const mvy = peel.y - lastY;
      const moved = Math.hypot(mvx, mvy);
      lastX = peel.x;
      lastY = peel.y;
      if (!calm) {
        // sparks shed as it moves (and a stray one now and then when it's still)
        const want = moved > 5 ? Math.min(2, moved / 30) : 0.04;
        for (let k = want; k > 0; k--) {
          if (k < 1 && Math.random() > k) break;
          const p = bladeAt(0.15 + Math.random() * 0.85, Math.random() < 0.5 ? -1 : 1);
          const w = toWorld(p.x, p.y);
          const ang = Math.random() * Math.PI * 2;
          const sp = 60 + Math.random() * 140;
          sparks.emit(w.x, w.y, Math.cos(ang) * sp - (mvx / Math.max(dt, 0.008)) * 0.12, Math.sin(ang) * sp - 80 - (mvy / Math.max(dt, 0.008)) * 0.12);
        }
        // the crackling trail behind the tip
        const tip = toWorld(TIP.x * 0.6, TIP.y * 0.75);
        for (let i = 0; i < TN; i++) tt[i] += dt;
        const prev = (head + TN - 1) % TN;
        if (moved > 3 && Math.hypot(tip.x - tx[prev], tip.y - ty[prev]) > 8) {
          tx[head] = tip.x;
          ty[head] = tip.y;
          tt[head] = 0;
          head = (head + 1) % TN;
        }
        trailRegen -= dt;
        if (trailRegen <= 0) {
          trailRegen = 0.035;
          for (let i = 0; i < tj.length; i++) tj[i] = (Math.random() * 2 - 1) * 7;
        }
        const LIFE = 0.2;
        for (let k = 1; k < TN; k++) {
          const i1 = (head + k) % TN;
          const i0 = (head + k - 1) % TN;
          if (tt[i0] > LIFE || tt[i1] > LIFE) continue;
          const a = 1 - tt[i0] / LIFE;
          const x0 = tx[i0] + tj[i0 * 2];
          const y0 = ty[i0] + tj[i0 * 2 + 1];
          const x1 = tx[i1] + tj[i1 * 2];
          const y1 = ty[i1] + tj[i1 * 2 + 1];
          trailPen.seg(x0, y0, x1, y1, 14 * a, 0x2a8cff, 0.28 * a);
          trailPen.seg(x0, y0, x1, y1, 6 * a, 0x8fd8ff, 0.6 * a);
          trailPen.seg(x0, y0, x1, y1, 1.5 + 1.5 * a, 0xffffff, 0.95 * a);
        }
        sparks.tick(dt, worldPen);
      }
      bursts.tick(dt, worldPen);
    },
    smack(x, y) {
      if (!active) return;
      bursts.fire(x, y);
      if (!h.reduced()) core.flash = Math.max(core.flash, 0.7);
    },
    setActive(on) {
      active = on;
    },
    destroy() {
      for (const o of all) o.destroy();
    },
  };
}

function paintZeus(): (pen: Pen, ctx: CanvasRenderingContext2D, dt: number) => void {
  const core = new ZeusCore();
  const sparks = new Sparks();
  return (pen, ctx, dt) => {
    core.tick(dt, true);
    // the overlay sits over the art, so a standing halo would blur it: the blade only blooms with a flash
    if (core.flash > 0.02) {
      ctx.save();
      ctx.translate(BLADE_MID.x, BLADE_MID.y);
      ctx.scale(0.6, 0.6);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, BLADE_LEN * 0.7);
      g.addColorStop(0, css(0xffffff, 0.55 * core.flash));
      g.addColorStop(0.5, css(0x8fd8ff, 0.3 * core.flash));
      g.addColorStop(1, css(0x4aa8ff, 0));
      ctx.fillStyle = g;
      ctx.fillRect(-BLADE_LEN, -BLADE_LEN, BLADE_LEN * 2, BLADE_LEN * 2);
      ctx.restore();
    }
    core.draw(pen);
    // a stray spark now and then, falling off an edge
    if (Math.random() < dt * 5) {
      const p = bladeAt(0.15 + Math.random() * 0.8, Math.random() < 0.5 ? -1 : 1);
      const ang = -Math.PI / 2 + (Math.random() * 2 - 1) * 1.3;
      sparks.emit(p.x, p.y, Math.cos(ang) * 110, Math.sin(ang) * 110);
    }
    sparks.tick(dt, pen);
  };
}

const LOOKS: Record<string, AnimatedLook> = {
  'hero:zeus': { play: playZeus, painter: paintZeus },
};

export function hasAnimatedLook(id: string): boolean {
  return id in LOOKS;
}

/** Start a peel's animated look on the cursor peel (null when it has none). */
export function playLook(id: string, host: LookHost): LookFx | null {
  return LOOKS[id]?.play(host) ?? null;
}

// ——— the locker: a canvas laid over the peel's <img> ———

interface Overlay {
  img: HTMLImageElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  pen: Pen;
  /** The pen's line-width boost, set each frame from the drawn size. */
  boost: { w: number };
  paint: (pen: Pen, ctx: CanvasRenderingContext2D, dt: number) => void;
}
const overlays = new Set<Overlay>();
let raf = 0;
let lastT = 0;
// room round the image for bolts that leap past the peel's edge
const PAD = 0.14;

function frame(now: number): void {
  raf = 0;
  const dt = Math.min(0.05, (now - lastT) / 1000);
  // ~30 fps is plenty for a menu
  if (dt < 0.03) {
    raf = requestAnimationFrame(frame);
    return;
  }
  lastT = now;
  for (const o of overlays) {
    // gone with the locker (or a re-render): clean up
    if (!o.img.isConnected || !o.canvas.isConnected) {
      o.canvas.remove();
      overlays.delete(o);
      continue;
    }
    const w = o.img.offsetWidth;
    const hh = o.img.offsetHeight;
    if (!w || !hh) continue;
    const px = Math.round(w * PAD);
    const py = Math.round(hh * PAD);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = Math.round((w + px * 2) * dpr);
    const ch = Math.round((hh + py * 2) * dpr);
    const cs = o.canvas.style;
    if (o.canvas.width !== cw || o.canvas.height !== ch) {
      o.canvas.width = cw;
      o.canvas.height = ch;
      cs.width = `${w + px * 2}px`;
      cs.height = `${hh + py * 2}px`;
    }
    cs.left = `${o.img.offsetLeft - px}px`;
    cs.top = `${o.img.offsetTop - py}px`;
    // follow the image's own tilt (the detail panel turns it)
    const tf = getComputedStyle(o.img).transform;
    cs.transform = tf === 'none' ? '' : tf;
    cs.opacity = getComputedStyle(o.img).opacity;
    const ctx = o.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    // object-fit: contain, so the peel sits centred in the image box
    const k = Math.min(w / 220, hh / 360) * dpr;
    const ox = (px + (w - 220 * (k / dpr)) / 2) * dpr;
    const oy = (py + (hh - 360 * (k / dpr)) / 2) * dpr;
    ctx.setTransform(k, 0, 0, k, ox + OX * k, oy + OY * k);
    // about half a peel unit per css pixel or less: thicken the bolts so they don't vanish
    o.boost.w = Math.min(2.2, Math.max(1, 0.5 / (k / dpr)));
    // menus are light: normal blending, so the blue haze shows on cream (adding light to cream shows nothing)
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    o.paint(o.pen, ctx, dt);
  }
  if (overlays.size) raf = requestAnimationFrame(frame);
}

/** Animate a peel's look over its <img> (in the Peel Locker). Does nothing for peels without one. The overlay
 *  removes itself when the image leaves the page; stopLookOverlays() clears them all at once. */
export function animateLookImg(img: HTMLImageElement, id: string): void {
  const look = LOOKS[id];
  const parent = img.parentElement;
  if (!look || !parent) return;
  for (const o of overlays) if (o.img === img) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'look-fx';
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { position: 'absolute', pointerEvents: 'none', zIndex: '1' });
  if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
  img.after(canvas);
  const ctx = canvas.getContext('2d')!;
  const boost = { w: 1 };
  overlays.add({ img, canvas, ctx, pen: canvasPen(ctx, boost), boost, paint: look.painter() });
  if (!raf) {
    lastT = performance.now();
    raf = requestAnimationFrame(frame);
  }
}

/** Stop every locker overlay (the locker closed). */
export function stopLookOverlays(): void {
  for (const o of overlays) o.canvas.remove();
  overlays.clear();
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
}
