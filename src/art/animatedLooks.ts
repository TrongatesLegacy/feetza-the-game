// Animated peel looks: live effects layered over a peel's static art, keyed by peel id. A look plays in two
// places from one set of drawing code:
// - in play, on Phaser Graphics that follow the cursor peel (playLook, from GameScene), plus its smack burst
// - in the Peel Locker, on small canvases laid behind and over the peel's <img> (animateLookImg, from ui.ts)
// Each look draws through a Pen (src/art/lookKit.ts), so the same strokes go to a Graphics object or a 2D canvas.
// Everything is allocated up front (pools and typed arrays) so nothing is created per frame.
// Which peels get which look (lookOf): Zeus's lightning sword is hand-made here; the always-aflame peels burn in
// their own style (FIRE_PEELS in lookFire.ts); the jewellery box, masterworks, ultra-rares, gods, the God Peel and
// the heroes get their family's glow and trail (lookGlow.ts). Only the equipped (or worn) look runs in play.

import Phaser from 'phaser';
import { crand } from '../systems/cosmeticRandom';
import { ZEUS_BLADE } from './godShapes';
import { canvasPen, css, graphicsPen, paintCore, paintMoving, playCore, type Motion, type MovingPainter, type LookCore, type LookFx, type LookHost, type Painter, type Pen } from './lookKit';
import { FIRE_PEELS, fireCore } from './lookFire';
import { glowCore, godPeelStyle, godStyle, heroStyle, jewelStyle, masterStyle, ultraStyle, type GlowStyle } from './lookGlow';
import { PEEL_BY_ID } from '../game/peels';
import { save } from '../systems/save';

export type { LookFx, LookHost } from './lookKit';

interface AnimatedLook {
  play(h: LookHost): LookFx;
  /** A fresh painter for one locker image: draws a frame in the peel's frame (origin at the peel's grip point). */
  painter(): Painter;
  /** The dev look lab: a painter for the peel moving along a path (kit looks only). */
  moving?: (m: Motion) => MovingPainter;
  /** Paints behind the image too (glows and flames), on a second canvas. */
  back?: boolean;
  /** Cheap and striking enough to animate on the locker's tiles, not just the big preview. */
  tile?: boolean;
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
    for (let i = half; i < n; i += step) off[i] = (off[i - half] + off[i + half]) / 2 + (crand() * 2 - 1) * amp;
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
  a.u = long ? 0.04 : crand() * 0.55;
  a.du = long ? 0.92 : 0.2 + crand() * 0.22;
  // most arcs cross the blade; some hug an edge and crackle just outside it, where they show against the room
  if (!long && crand() < 0.45) {
    const side = crand() < 0.5 ? -1 : 1;
    a.s0 = side * (0.9 + crand() * 0.3);
    a.s1 = side * (1.15 + crand() * 0.45);
  } else {
    a.s0 = (crand() * 2 - 1) * 0.85;
    a.s1 = (crand() * 2 - 1) * 0.85;
  }
  a.age = 0;
  a.life = long ? 0.22 : 0.35 + crand() * 0.45;
  a.bAt = 2 + Math.floor(crand() * 5);
  a.bAng = (crand() < 0.5 ? -1 : 1) * (0.5 + crand() * 0.7);
  a.bLen = crand() < 0.75 ? 14 + crand() * 20 : 0;
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
  nextFlash = 1 + crand() * 1.5;
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
        a.flick = 0.65 + crand() * 0.35;
      }
    }
    this.flash = Math.max(0, this.flash - dt / 0.16);
    this.nextFlash -= dt;
    if (flashes && this.nextFlash <= 0) {
      this.nextFlash = 1.6 + crand() * 2.2;
      this.flash = 1;
      this.tipAng = (crand() * 2 - 1) * 0.5;
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
    this.life[i] = 0.22 + crand() * 0.22;
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
    b.rot = crand() * Math.PI * 2;
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

// ——— Zeus in play ———

function playZeus(h: LookHost): LookFx {
  const { scene, layer, peel } = h;
  const ADD = Phaser.BlendModes.ADD;
  // behind the peel: a soft blue halo down the blade and the crackling trail; over it: the arcs, then sparks and bursts
  // a wide blue aura round the whole peel, under the blade halo
  // normal blend, so the blue reads on warm, bright backdrops too (added light washes out there)
  const aura = scene.add.image(0, 0, 'glow').setTint(0x3d8cff);
  const halo = scene.add.image(0, 0, 'glow').setTint(0x4aa8ff).setBlendMode(ADD);
  const haloCore = scene.add.image(0, 0, 'glow').setTint(0xbfe8ff).setBlendMode(ADD);
  const trailG = scene.add.graphics().setBlendMode(ADD);
  const arcG = scene.add.graphics().setBlendMode(ADD);
  const worldG = scene.add.graphics().setBlendMode(ADD);
  // the swept trail: a soft glowing ribbon where the blade has been (drawn under the crackle)
  const ribbonG = scene.add.graphics();
  for (const o of [ribbonG, aura, trailG, halo, haloCore]) {
    layer.add(o);
    layer.moveBelow(o as unknown as Phaser.GameObjects.GameObject, peel as unknown as Phaser.GameObjects.GameObject);
  }
  layer.add(arcG);
  layer.add(worldG);
  const all = [ribbonG, aura, halo, haloCore, trailG, arcG, worldG];
  const ribbonPen = graphicsPen(ribbonG);
  // ribbon history: blade middle and tip, a ring
  const RN = 16;
  const rmx = new Float32Array(RN);
  const rmy = new Float32Array(RN);
  const rtx = new Float32Array(RN);
  const rty = new Float32Array(RN);
  const rt = new Float32Array(RN).fill(9);
  let rhead = 0;
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
      // the aura: a broad soft glow round the head and blade, breathing with the storm
      aura.setPosition(m.x, m.y).setRotation(peel.rotation).setScale((430 * s) / 256, (BLADE_LEN * 3.8 * s) / 256).setAlpha(Math.min(0.9, (calm ? 0.6 : 0.75) * gl));
      arcG.clear();
      arcG.setPosition(peel.x, peel.y).setRotation(peel.rotation).setScale(s);
      core.draw(arcPen);
      worldG.clear();
      trailG.clear();
      ribbonG.clear();
      const mvx = peel.x - lastX;
      const mvy = peel.y - lastY;
      const moved = Math.hypot(mvx, mvy);
      lastX = peel.x;
      lastY = peel.y;
      if (!calm) {
        // sparks shed as it moves (and a stray one now and then when it's still)
        const want = moved > 5 ? Math.min(2, moved / 30) : 0.04;
        for (let k = want; k > 0; k--) {
          if (k < 1 && crand() > k) break;
          const p = bladeAt(0.15 + crand() * 0.85, crand() < 0.5 ? -1 : 1);
          const w = toWorld(p.x, p.y);
          const ang = crand() * Math.PI * 2;
          const sp = 60 + crand() * 140;
          sparks.emit(w.x, w.y, Math.cos(ang) * sp - (mvx / Math.max(dt, 0.008)) * 0.12, Math.sin(ang) * sp - 80 - (mvy / Math.max(dt, 0.008)) * 0.12);
        }
        // the swept ribbon: blade-mid and tip positions, joined into a fading band of blue light
        {
          const mid = toWorld(BLADE_MID.x, BLADE_MID.y);
          const mx = mid.x;
          const my = mid.y;
          const tp = toWorld(TIP.x * 0.8, TIP.y * 0.85);
          for (let i = 0; i < RN; i++) rt[i] += dt;
          const rp = (rhead + RN - 1) % RN;
          if (moved > 2 && Math.hypot(mx - rmx[rp], my - rmy[rp]) > 6) {
            rmx[rhead] = mx;
            rmy[rhead] = my;
            rtx[rhead] = tp.x;
            rty[rhead] = tp.y;
            rt[rhead] = 0;
            rhead = (rhead + 1) % RN;
          }
          const RL = 0.42;
          for (let k = 1; k < RN; k++) {
            const i1 = (rhead + k) % RN;
            const i0 = (rhead + k - 1) % RN;
            if (rt[i0] > RL || rt[i1] > RL) continue;
            const a = 1 - rt[i0] / RL;
            // the band between the two edges (mid line and tip line), as a few strokes across
            for (let q = 0; q <= 3; q++) {
              const f = q / 3;
              const x0 = rmx[i0] + (rtx[i0] - rmx[i0]) * f;
              const y0 = rmy[i0] + (rty[i0] - rmy[i0]) * f;
              const x1 = rmx[i1] + (rtx[i1] - rmx[i1]) * f;
              const y1 = rmy[i1] + (rty[i1] - rmy[i1]) * f;
              ribbonPen.seg(x0, y0, x1, y1, 46 * a * s, 0x3d8cff, 0.17 * a);
              ribbonPen.seg(x0, y0, x1, y1, 14 * a * s, 0xbfe9ff, 0.22 * a);
            }
          }
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
          for (let i = 0; i < tj.length; i++) tj[i] = (crand() * 2 - 1) * 7;
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
          trailPen.seg(x0, y0, x1, y1, 14 * a, 0x2a8cff, 0.16 * a);
          trailPen.seg(x0, y0, x1, y1, 6 * a, 0x8fd8ff, 0.36 * a);
          trailPen.seg(x0, y0, x1, y1, 1.5 + 1.5 * a, 0xffffff, 0.6 * a);
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

function paintZeus(): Painter {
  const core = new ZeusCore();
  const sparks = new Sparks();
  return ({ front: pen, fctx: ctx }, dt) => {
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
    if (crand() < dt * 5) {
      const p = bladeAt(0.15 + crand() * 0.8, crand() < 0.5 ? -1 : 1);
      const ang = -Math.PI / 2 + (crand() * 2 - 1) * 1.3;
      sparks.emit(p.x, p.y, Math.cos(ang) * 110, Math.sin(ang) * 110);
    }
    sparks.tick(dt, pen);
  };
}

/** The dev look lab: Zeus's blade on a peel that moves along a path, with the aura, the swept ribbon, the crackling
 *  trail, sparks and smack bursts, as in play (playZeus) but drawn on canvases. */
function movingZeus(motion: Motion): MovingPainter {
  const core = new ZeusCore();
  const sparks = new Sparks();
  const bursts = new Bursts();
  const f = { x: 0, y: 0, rot: 0 };
  let first = true;
  let t = 0;
  const RN = 16;
  const rmx = new Float32Array(RN);
  const rmy = new Float32Array(RN);
  const rtx = new Float32Array(RN);
  const rty = new Float32Array(RN);
  const rt = new Float32Array(RN).fill(9);
  let rhead = 0;
  const TN = 12;
  const tx = new Float32Array(TN);
  const ty = new Float32Array(TN);
  const tt = new Float32Array(TN).fill(9);
  const tj = new Float32Array(TN * 2);
  let head = 0;
  let trailRegen = 0;
  const w = { x: 0, y: 0 };
  const toW = (lx: number, ly: number) => {
    const c = Math.cos(f.rot);
    const sn = Math.sin(f.rot);
    w.x = f.x + lx * c - ly * sn;
    w.y = f.y + lx * sn + ly * c;
    return w;
  };
  return (back, front, dt, peel) => {
    t += dt;
    const m = motion(t);
    const mvx = first ? 0 : m.x - f.x;
    const mvy = first ? 0 : m.y - f.y;
    first = false;
    const moved = Math.hypot(mvx, mvy);
    f.x = m.x;
    f.y = m.y;
    f.rot = m.rot;
    const calm = save.settings.reducedMotion;
    core.tick(dt, !calm);
    if (m.smack) {
      bursts.fire(f.x, f.y + 230);
      if (!calm) core.flash = Math.max(core.flash, 0.7);
    }
    const gl = core.glow();
    const mid = toW(BLADE_MID.x, BLADE_MID.y);
    // behind: the aura and the blade's halo
    back.pen.glow(mid.x, mid.y, 215, BLADE_LEN * 1.9, f.rot, 0x3d8cff, Math.min(0.9, (calm ? 0.6 : 0.75) * gl) * 0.5);
    back.pen.glow(mid.x, mid.y, 60, BLADE_LEN * 0.95, f.rot, 0x4aa8ff, Math.min(1, 0.7 * gl) * 0.6);
    if (!calm) {
      // the swept ribbon between the blade's middle and its tip
      const mx = mid.x;
      const my = mid.y;
      const tp = toW(TIP.x * 0.8, TIP.y * 0.85);
      for (let i = 0; i < RN; i++) rt[i] += dt;
      const rp = (rhead + RN - 1) % RN;
      if (moved > 2 && Math.hypot(mx - rmx[rp], my - rmy[rp]) > 6) {
        rmx[rhead] = mx;
        rmy[rhead] = my;
        rtx[rhead] = tp.x;
        rty[rhead] = tp.y;
        rt[rhead] = 0;
        rhead = (rhead + 1) % RN;
      }
      for (let k = 1; k < RN; k++) {
        const i1 = (rhead + k) % RN;
        const i0 = (rhead + k - 1) % RN;
        if (rt[i0] > 0.42 || rt[i1] > 0.42) continue;
        const a = 1 - rt[i0] / 0.42;
        for (let q = 0; q <= 3; q++) {
          const g = q / 3;
          back.pen.seg(rmx[i0] + (rtx[i0] - rmx[i0]) * g, rmy[i0] + (rty[i0] - rmy[i0]) * g, rmx[i1] + (rtx[i1] - rmx[i1]) * g, rmy[i1] + (rty[i1] - rmy[i1]) * g, 46 * a, 0x3d8cff, 0.17 * a);
          back.pen.seg(rmx[i0] + (rtx[i0] - rmx[i0]) * g, rmy[i0] + (rty[i0] - rmy[i0]) * g, rmx[i1] + (rtx[i1] - rmx[i1]) * g, rmy[i1] + (rty[i1] - rmy[i1]) * g, 14 * a, 0xbfe9ff, 0.22 * a);
        }
      }
      // the crackling trail behind the tip
      const tip = toW(TIP.x * 0.6, TIP.y * 0.75);
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
        for (let i = 0; i < tj.length; i++) tj[i] = (crand() * 2 - 1) * 7;
      }
      for (let k = 1; k < TN; k++) {
        const i1 = (head + k) % TN;
        const i0 = (head + k - 1) % TN;
        if (tt[i0] > 0.2 || tt[i1] > 0.2) continue;
        const a = 1 - tt[i0] / 0.2;
        const x0 = tx[i0] + tj[i0 * 2];
        const y0 = ty[i0] + tj[i0 * 2 + 1];
        const x1 = tx[i1] + tj[i1 * 2];
        const y1 = ty[i1] + tj[i1 * 2 + 1];
        back.pen.seg(x0, y0, x1, y1, 14 * a, 0x2a8cff, 0.16 * a);
        back.pen.seg(x0, y0, x1, y1, 6 * a, 0x8fd8ff, 0.36 * a);
        back.pen.seg(x0, y0, x1, y1, 1.5 + 1.5 * a, 0xffffff, 0.6 * a);
      }
      // sparks shed as it moves
      const want = moved > 5 ? Math.min(2, moved / 30) : 0.04;
      for (let k = want; k > 0; k--) {
        if (k < 1 && crand() > k) break;
        const p = bladeAt(0.15 + crand() * 0.85, crand() < 0.5 ? -1 : 1);
        const q = toW(p.x, p.y);
        const ang = crand() * Math.PI * 2;
        const sp = 60 + crand() * 140;
        sparks.emit(q.x, q.y, Math.cos(ang) * sp - (mvx / Math.max(dt, 0.008)) * 0.12, Math.sin(ang) * sp - 80 - (mvy / Math.max(dt, 0.008)) * 0.12);
      }
    }
    // the peel, then the arcs over it, in its frame
    const ctx = front.ctx;
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rot);
    peel(ctx);
    core.draw(front.pen);
    ctx.restore();
    if (!calm) sparks.tick(dt, front.pen);
    bursts.tick(dt, front.pen);
  };
}

const LOOKS: Record<string, AnimatedLook> = {
  'hero:zeus': { play: playZeus, painter: paintZeus, moving: movingZeus, tile: true },
  // Zeus, King Unbound (src/content/peels/variants.ts): the same living lightning blade on his storm-dark head
  'hero:zeusunbound': { play: playZeus, painter: paintZeus, moving: movingZeus, tile: true },
};

const calm = () => save.settings.reducedMotion;
/** A look built on the shared kit: a fresh core for each place it plays. */
const kitLook = (make: () => LookCore, tile: boolean): AnimatedLook => ({
  play: (h) => playCore(h, make()),
  painter: () => paintCore(make(), calm),
  moving: (m) => paintMoving(make(), calm, m),
  back: true,
  tile,
});
const glowLook = (st: GlowStyle, tile: boolean) => kitLook(() => glowCore(st), tile);

const built = new Map<string, AnimatedLook | null>();
/** A peel's animated look: a hand-made one (Zeus), a fire (lookFire.ts), or its family's glow (lookGlow.ts). */
function lookOf(id: string): AnimatedLook | null {
  if (LOOKS[id]) return LOOKS[id];
  if (built.has(id)) return built.get(id)!;
  let out: AnimatedLook | null = null;
  const fire = FIRE_PEELS[id];
  const d = PEEL_BY_ID[id];
  if (fire) out = kitLook(() => fireCore(fire), true);
  else if (d) {
    if (d.group === 'god') out = glowLook(godPeelStyle(), true);
    else if (d.pantheon) {
      const st = godStyle(id);
      out = st ? glowLook(st, true) : null;
    } else if (d.ultra) out = glowLook(ultraStyle(id, d.look()), true);
    else if (d.group === 'jewel') out = glowLook(jewelStyle(d.look()), false);
    else if (d.group === 'master') out = glowLook(masterStyle(d.look()), false);
    else if (d.group === 'hero') out = glowLook(heroStyle(d.look()), false);
  }
  built.set(id, out);
  return out;
}

export function hasAnimatedLook(id: string): boolean {
  return !!lookOf(id);
}

/** The dev look lab: a painter for this peel's look moving along a path. */
export function movingLook(id: string, m: Motion): MovingPainter | null {
  return lookOf(id)?.moving?.(m) ?? null;
}
export { canvasPen, OX as LOOK_OX, OY as LOOK_OY };

/** Start a peel's animated look on the cursor peel (null when it has none). */
export function playLook(id: string, host: LookHost): LookFx | null {
  return lookOf(id)?.play(host) ?? null;
}

// ——— the locker: canvases laid behind and over the peel's <img> ———

interface Overlay {
  img: HTMLImageElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  pen: Pen;
  back: HTMLCanvasElement | null;
  bctx: CanvasRenderingContext2D | null;
  bpen: Pen | null;
  /** The pens' line-width boost, set each frame from the drawn size. */
  boost: { w: number };
  paint: Painter;
  /** On screen (tiles scrolled out of view skip their frames). */
  seen: boolean;
}
const overlays = new Set<Overlay>();
let raf = 0;
let lastT = 0;
// room round the image for bolts and flames that leap past the peel's edge
const PAD = 0.14;
// tiles only paint while on screen
const seen = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver((es) => {
  for (const e of es) for (const o of overlays) if (o.img === e.target) o.seen = e.isIntersecting;
});

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
      o.back?.remove();
      seen?.unobserve(o.img);
      overlays.delete(o);
      continue;
    }
    if (!o.seen) continue;
    const w = o.img.offsetWidth;
    const hh = o.img.offsetHeight;
    if (!w || !hh) continue;
    const px = Math.round(w * PAD);
    const py = Math.round(hh * PAD);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = Math.round((w + px * 2) * dpr);
    const ch = Math.round((hh + py * 2) * dpr);
    // follow the image's own tilt (the detail panel turns it)
    const tf = getComputedStyle(o.img).transform;
    const op = getComputedStyle(o.img).opacity;
    // object-fit: contain, so the peel sits centred in the image box
    const k = Math.min(w / 220, hh / 360) * dpr;
    const ox = (px + (w - 220 * (k / dpr)) / 2) * dpr;
    const oy = (py + (hh - 360 * (k / dpr)) / 2) * dpr;
    for (const [cv, ctx] of [[o.canvas, o.ctx], [o.back, o.bctx]] as const) {
      if (!cv || !ctx) continue;
      const cs = cv.style;
      if (cv.width !== cw || cv.height !== ch) {
        cv.width = cw;
        cv.height = ch;
        cs.width = `${w + px * 2}px`;
        cs.height = `${hh + py * 2}px`;
      }
      cs.left = `${o.img.offsetLeft - px}px`;
      cs.top = `${o.img.offsetTop - py}px`;
      cs.transform = tf === 'none' ? '' : tf;
      cs.opacity = op;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cw, ch);
      ctx.setTransform(k, 0, 0, k, ox + OX * k, oy + OY * k);
      // menus are light: normal blending, so colour shows on cream (adding light to cream shows nothing)
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
    }
    // about half a peel unit per css pixel or less: thicken the strokes so they don't vanish
    o.boost.w = Math.min(2.2, Math.max(1, 0.5 / (k / dpr)));
    o.paint({ front: o.pen, fctx: o.ctx, back: o.bpen, bctx: o.bctx }, dt);
  }
  if (overlays.size) raf = requestAnimationFrame(frame);
}

const overlayCanvas = (z: string) => {
  const c = document.createElement('canvas');
  c.className = 'look-fx';
  c.setAttribute('aria-hidden', 'true');
  Object.assign(c.style, { position: 'absolute', pointerEvents: 'none', zIndex: z });
  return c;
};

/** Animate a peel's look over its <img> (in the Peel Locker). Does nothing for peels without one; on the grid's
 *  tiles only the showpieces animate (the rest play on the big preview). The overlay removes itself when the
 *  image leaves the page; stopLookOverlays() clears them all at once. */
export function animateLookImg(img: HTMLImageElement, id: string): void {
  const look = lookOf(id);
  const parent = img.parentElement;
  if (!look || !parent) return;
  const isTile = !!img.closest('.peel-tile');
  if (isTile && !look.tile) return;
  for (const o of overlays) if (o.img === img) return;
  if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
  const canvas = overlayCanvas('1');
  img.after(canvas);
  const boost = { w: 1 };
  let back: HTMLCanvasElement | null = null;
  let bctx: CanvasRenderingContext2D | null = null;
  if (look.back) {
    // glows and flames go on a canvas behind the image: positioned, it paints in page order, so the image
    // (positioned too) sits over it
    back = overlayCanvas('auto');
    img.before(back);
    if (getComputedStyle(img).position === 'static') img.style.position = 'relative';
    bctx = back.getContext('2d')!;
  }
  const ctx = canvas.getContext('2d')!;
  const o: Overlay = { img, canvas, ctx, pen: canvasPen(ctx, boost), back, bctx, bpen: bctx ? canvasPen(bctx, boost) : null, boost, paint: look.painter(), seen: !isTile || !seen };
  overlays.add(o);
  if (isTile) seen?.observe(img);
  if (!raf) {
    lastT = performance.now();
    raf = requestAnimationFrame(frame);
  }
}

/** Stop every locker overlay (the locker closed). */
export function stopLookOverlays(): void {
  for (const o of overlays) {
    o.canvas.remove();
    o.back?.remove();
    seen?.unobserve(o.img);
  }
  overlays.clear();
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
}
