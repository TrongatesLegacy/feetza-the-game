// Animated peel looks: live effects layered over a peel's static art, keyed by peel id. A look plays in two
// places from one set of drawing code:
// - in play, on Phaser Graphics that follow the cursor peel (playLook, from GameScene), plus its smack burst
// - in the Peel Locker, on small canvases laid behind and over the peel's <img> (animateLookImg, from ui.ts)
// Each look draws through a Pen (src/art/lookKit.ts), so the same strokes go to a Graphics object or a 2D canvas.
// Everything is allocated up front (pools and typed arrays) so nothing is created per frame.
// Which peels get which look (lookOf): Zeus's lightning sword is hand-made here; the always-aflame peels burn in
// their own style (FIRE_PEELS in lookFire.ts); the jewellery box, masterworks, ultra-rares, gods, the God Peel and
// the heroes get their family's glow and trail (lookGlow.ts). Only the equipped (or worn) look runs in play.
// A redrawn foot's peel also comes alive (src/art/peelLive.ts), and so do the crafted peels, the Classic and the
// Golden Crust set (src/art/peelCraft.ts), in the same two places.
// All of it runs only with animated peels on (Settings → Graphics): off, looks are painted once (a still) and
// nothing runs per frame.

import Phaser from 'phaser';
import { crand } from '../systems/cosmeticRandom';
import { ZEUS_BLADE } from './godShapes';
import { canvasPen, css, graphicsPen, paintCore, paintMoving, playCore, type Motion, type MovingPainter, type LookCore, type LookFx, type LookHost, type Painter, type Pen } from './lookKit';
import { FIRE_PEELS, fireCore } from './lookFire';
import { glowCore, godPeelStyle, godStyle, heroStyle, jewelStyle, masterStyle, ultraStyle, type GlowStyle } from './lookGlow';
import { PEEL_BY_ID, peelCanvas } from '../game/peels';
import { playPeelLive } from '../game/peelLivePlay';
import { playPeelCraft } from '../game/peelCraftPlay';
import { peelsAnimated } from '../systems/graphics';
import { save } from '../systems/save';
import { PEEL_H, PEEL_W } from './peelArt';
import { PeelLive, drawPeelLive, hasPeelLive, requestRig } from './peelLive';
import { CraftLive, drawCraftLive, hasPeelCraft, requestCraftRig } from './peelCraft';
import { makeCanvas } from './util';

export type { LookFx, LookHost } from './lookKit';

interface AnimatedLook {
  play(h: LookHost): LookFx;
  /** A fresh painter for one locker image: draws a frame in the peel's frame (origin at the peel's grip point). */
  painter(): Painter;
  /** A painter for the look's still (animated peels off): only what belongs on the peel, no loose particles. */
  still?: () => Painter;
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
  still: () => paintCore(make(), calm, false),
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

/** Does this peel animate: a look of its own, a living foot (src/art/peelLive.ts) or a crafted peel
 *  (src/art/peelCraft.ts)? */
export function hasAnimatedLook(id: string): boolean {
  return !!lookOf(id) || hasPeelLive(id) || hasPeelCraft(id);
}

/** The dev look lab: a painter for this peel's look moving along a path. */
export function movingLook(id: string, m: Motion): MovingPainter | null {
  return lookOf(id)?.moving?.(m) ?? null;
}
export { canvasPen, OX as LOOK_OX, OY as LOOK_OY };

/** Two effects on one peel (a living foot that is also aflame). */
function both(a: LookFx | null, b: LookFx | null): LookFx | null {
  if (!a || !b) return a ?? b;
  return {
    ownTrail: a.ownTrail || b.ownTrail,
    tick: (dt) => (a.tick(dt), b.tick(dt)),
    smack: (x, y) => (a.smack(x, y), b.smack(x, y)),
    setActive: (on) => (a.setActive(on), b.setActive(on)),
    destroy: () => (a.destroy(), b.destroy()),
  };
}

/** Start a peel's animation on the cursor peel: its look and, for a redrawn foot's peel or a crafted one, the peel
 *  coming alive (null when it has none of them). With animated peels off (Settings → Graphics) a look shows as a
 *  still instead, baked into the peel's texture, and nothing runs per frame. */
export function playLook(id: string, host: LookHost): LookFx | null {
  if (!peelsAnimated()) return stillLookFx(id, host);
  return both(both(playPeelLive(id, host), playPeelCraft(id, host)), lookOf(id)?.play(host) ?? null);
}

// ——— stills: a look painted once, for when animated peels are off ———

/** Room round the peel (peel units) a still look keeps: flames reach well above the head. */
const SP = { l: 80, r: 80, t: 140, b: 40 };
const SW = PEEL_W + SP.l + SP.r;
const SH = PEEL_H + SP.t + SP.b;
const stills = new Map<string, { back: HTMLCanvasElement | null; front: HTMLCanvasElement } | null>();

/** A look painted once, at a good moment (its glows built up, its flames risen), behind and over the peel: canvases
 *  SW × SH, one px per peel unit, the peel's grip point at (SP.l + OX, SP.t + OY). */
function stillLook(id: string): { back: HTMLCanvasElement | null; front: HTMLCanvasElement } | null {
  if (stills.has(id)) return stills.get(id)!;
  const look = lookOf(id);
  let out: { back: HTMLCanvasElement | null; front: HTMLCanvasElement } | null = null;
  if (look) {
    const [front, fctx] = makeCanvas(SW, SH);
    const [back, bctx] = look.back ? makeCanvas(SW, SH) : [null, null];
    const boost = { w: 1 };
    const fpen = canvasPen(fctx, boost);
    const bpen = bctx ? canvasPen(bctx, boost) : null;
    const paint = look.still?.() ?? look.painter();
    // let it run a second and a half, then keep that frame
    for (let i = 0; i < 45; i++) {
      for (const ctx of [fctx, bctx]) {
        if (!ctx) continue;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, SW, SH);
        ctx.setTransform(1, 0, 0, 1, SP.l + OX, SP.t + OY);
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
      }
      paint({ front: fpen, fctx, back: bpen, bctx }, 1 / 30);
    }
    out = { back, front };
  }
  stills.set(id, out);
  return out;
}

/** The cursor peel with its look as a still: one texture (the look behind, the peel, the look over it), padded
 *  round the peel, so nothing is drawn per frame. */
function stillLookFx(id: string, h: LookHost): LookFx | null {
  const st = stillLook(id);
  if (!st) return null;
  const { scene, peel } = h;
  const key = `peel_still_${id}`;
  if (!scene.textures.exists(key)) {
    const [c, ctx] = makeCanvas(SW, SH);
    if (st.back) ctx.drawImage(st.back, 0, 0);
    ctx.drawImage(peelCanvas(id), SP.l, SP.t);
    ctx.drawImage(st.front, 0, 0);
    scene.textures.addCanvas(key, c);
  }
  const OXF = OX / PEEL_W;
  const OYF = OY / PEEL_H;
  const apply = () => {
    if (peel.texture.key !== 'peel') return;
    peel.setTexture(key).setOrigin((SP.l + OX) / SW, (SP.t + OY) / SH);
  };
  apply();
  return {
    ownTrail: false,
    tick() {},
    smack() {},
    setActive(on) {
      if (on) apply();
      // another peel's texture is on for a while (its own origin)
      else if (peel.texture.key !== key) peel.setOrigin(OXF, OYF);
    },
    destroy() {
      if (!peel.active) return;
      if (peel.texture.key === key) peel.setTexture('peel');
      peel.setOrigin(OXF, OYF);
    },
  };
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
  /** The look's painter (none on a tile whose look only plays on the big preview). */
  paint: Painter | null;
  /** A living peel (a redrawn foot, a crafted peel): wanted, asked for, and running once its rig is built. */
  foot: { live: Living | null; asked: boolean } | null;
  /** The <img> is hidden while the living foot is drawn in its place. */
  hid: boolean;
  /** Device pixels per peel unit as drawn (set by place()). */
  k: number;
  /** The living peel drawn at its rig's detail, then halved down to near its drawn size (see drawLiving). */
  mips: [HTMLCanvasElement, CanvasRenderingContext2D][];
  /** Painted once (animated peels off): the still look. */
  still: { back: HTMLCanvasElement | null; front: HTMLCanvasElement } | null;
  id: string;
  style: CSSStyleDeclaration;
  /** On screen (tiles scrolled out of view skip their frames). */
  seen: boolean;
}
/** A living peel drawn in place of its image: a redrawn foot or a crafted peel. */
interface Living {
  update(dt: number): void;
  /** On a canvas whose transform is the peel's frame (0, 0 at its top left). */
  draw(ctx: CanvasRenderingContext2D): void;
  smack(): void;
  /** Its rig's detail (canvas pixels per peel unit). */
  RR: number;
}
const footLiving = (l: PeelLive): Living => ({ update: (dt) => l.update(dt), draw: (ctx) => drawPeelLive(ctx, l), smack: () => l.smack(), RR: l.rig.RR });
const craftLiving = (l: CraftLive): Living => ({ update: (dt) => l.update(dt), draw: (ctx) => drawCraftLive(ctx, l), smack: () => l.smack(), RR: l.rig.RR });

/** Room round the peel's frame (peel units) a living peel's particles and critters may use: the overlay's pad. */
const LIV = { x: Math.round(220 * 0.14), y: Math.round(360 * 0.14) };

/**
 * A living peel onto its overlay, smoothly: drawn at its rig's detail on a canvas of its own, then halved (each step
 * a clean 2:1 smoothing) until it's within twice its drawn size, then drawn down. Drawn straight onto a small tile or
 * the tilted preview (a third to a tenth of its detail) its outline came out stair-stepped.
 */
function drawLiving(o: Overlay, live: Living): void {
  const S = Math.max(live.RR, o.k);
  const W = Math.ceil((220 + LIV.x * 2) * S);
  const H = Math.ceil((360 + LIV.y * 2) * S);
  let lvl = 0;
  const mip = (i: number, w: number, h: number) => {
    let m = o.mips[i];
    if (!m) {
      const c = document.createElement('canvas');
      m = o.mips[i] = [c, c.getContext('2d')!];
    }
    if (m[0].width !== w || m[0].height !== h) {
      m[0].width = w;
      m[0].height = h;
    }
    m[1].setTransform(1, 0, 0, 1, 0, 0);
    m[1].clearRect(0, 0, w, h);
    m[1].imageSmoothingQuality = 'high';
    return m;
  };
  const [c0, x0] = mip(0, W, H);
  x0.setTransform(S, 0, 0, S, LIV.x * S, LIV.y * S);
  live.draw(x0);
  let src = c0;
  let s = S;
  while (s / 2 >= o.k && lvl < 4) {
    lvl++;
    const [c, x] = mip(lvl, Math.ceil(src.width / 2), Math.ceil(src.height / 2));
    x.drawImage(src, 0, 0, src.width / 2, src.height / 2);
    src = c;
    s /= 2;
  }
  const ctx = o.ctx;
  ctx.save();
  ctx.imageSmoothingQuality = 'high';
  // (ctx is in the peel's frame about its grip point; the canvas is in units of 1/s, offset by the room)
  ctx.drawImage(src, -OX - LIV.x, -OY - LIV.y, src.width / s, src.height / s);
  ctx.restore();
}

const overlays = new Set<Overlay>();
let raf = 0;
let lastT = 0;
// room round the image for bolts and flames that leap past the peel's edge
const PAD = 0.14;
// overlays only paint while on screen
const seen = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver((es) => {
  for (const e of es)
    for (const o of overlays)
      if (o.img === e.target) {
        o.seen = e.isIntersecting;
        if (o.seen) wake();
      }
});
// stills repaint when their image changes size (no frames run for them)
const resized = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver((es) => {
  for (const e of es) for (const o of overlays) if (o.img === e.target && o.still) place(o) && paintStill(o);
});

function drop(o: Overlay): void {
  o.canvas.remove();
  o.back?.remove();
  seen?.unobserve(o.img);
  resized?.unobserve(o.img);
  if (o.hid) o.img.style.visibility = '';
  overlays.delete(o);
}

/** Size and place an overlay's canvases over its image; false when the image has no size yet. Leaves each ctx's
 *  transform at the peel's frame (origin at the grip point), in device pixels. */
function place(o: Overlay): boolean {
  const w = o.img.offsetWidth;
  const hh = o.img.offsetHeight;
  if (!w || !hh) return false;
  const px = Math.round(w * PAD);
  const py = Math.round(hh * PAD);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cw = Math.round((w + px * 2) * dpr);
  const ch = Math.round((hh + py * 2) * dpr);
  // follow the image's own tilt (the detail panel turns it), fade and filter (a locked peel's)
  const tf = o.style.transform;
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
    cs.opacity = o.style.opacity;
    cs.filter = o.style.filter === 'none' ? '' : o.style.filter;
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
  o.k = k;
  return true;
}

function paintStill(o: Overlay): boolean {
  const st = o.still!;
  o.ctx.drawImage(st.front, -SP.l - OX, -SP.t - OY);
  if (st.back && o.bctx) o.bctx.drawImage(st.back, -SP.l - OX, -SP.t - OY);
  return true;
}

function frame(now: number): void {
  raf = 0;
  const dt = Math.min(0.05, (now - lastT) / 1000);
  // ~30 fps is plenty for a menu
  if (dt < 0.03) {
    raf = requestAnimationFrame(frame);
    return;
  }
  lastT = now;
  let running = 0;
  for (const o of overlays) {
    // gone with the locker (or a re-render): clean up
    if (!o.img.isConnected || !o.canvas.isConnected) {
      drop(o);
      continue;
    }
    if (o.still || !o.seen) continue;
    const f = o.foot;
    // a living foot: its rig is built in idle time, the still image showing until it's ready
    if (f && !f.asked) {
      f.asked = true;
      const big = !o.img.closest('.peel-tile');
      // scrolled away before it was built: asked again when it's back in view
      const wanted = () => {
        const want = overlays.has(o) && o.img.isConnected && o.seen;
        if (!want) f.asked = false;
        return want;
      };
      // (the big preview is drawn larger: its rig at twice the detail)
      if (hasPeelCraft(o.id))
        requestCraftRig(
          o.id,
          (rig) => {
            if (!overlays.has(o)) return;
            if (rig) f.live = craftLiving(new CraftLive(rig));
            else o.foot = null;
          },
          wanted,
          big,
          big ? 2 : 1,
        );
      else
        requestRig(
          o.id,
          (rig) => {
            if (!overlays.has(o)) return;
            if (rig) f.live = footLiving(new PeelLive(rig));
            else o.foot = null;
          },
          wanted,
          big,
          big ? 2 : 1,
        );
    }
    if (!o.paint && !o.foot) continue;
    // (on screen with something to show, or a living foot about to be: the frames go on)
    running++;
    if (!o.paint && !f?.live) continue;
    if (!place(o)) continue;
    if (f?.live) {
      f.live.update(dt);
      drawLiving(o, f.live);
      if (!o.hid) {
        o.hid = true;
        o.img.style.visibility = 'hidden';
      }
    }
    o.paint?.({ front: o.pen, fctx: o.ctx, back: o.bpen, bctx: o.bctx }, dt);
  }
  if (running) raf = requestAnimationFrame(frame);
}

/** Drop overlays whose image has left the page (a re-render), once the page has settled: images are often set up
 *  before their tile is in the page. Stills have no frames to notice it themselves. */
let sweeping = 0;
function sweepSoon(): void {
  if (sweeping) return;
  sweeping = window.setTimeout(() => {
    sweeping = 0;
    for (const o of [...overlays]) if (!o.img.isConnected) drop(o);
  }, 500);
}

function wake(): void {
  if (!raf && [...overlays].some((o) => !o.still)) {
    lastT = performance.now();
    raf = requestAnimationFrame(frame);
  }
}

const overlayCanvas = (z: string) => {
  const c = document.createElement('canvas');
  c.className = 'look-fx';
  c.setAttribute('aria-hidden', 'true');
  Object.assign(c.style, { position: 'absolute', pointerEvents: 'none', zIndex: z });
  return c;
};

/** Animate a peel over its <img> (in the Peel Locker): its look, and a redrawn foot's or crafted peel coming alive.
 *  Does nothing for peels with none of them; on the grid's tiles only the showpiece looks play (the rest play on the
 *  big preview), while living peels move on their tiles too. With animated peels off (Settings → Graphics) a look is
 *  painted once instead, and living peels keep their still image. The overlay removes itself when the image leaves
 *  the page; stopLookOverlays() clears them all at once. */
export function animateLookImg(img: HTMLImageElement, id: string): void {
  const parent = img.parentElement;
  if (!parent) return;
  for (const o of overlays) if (o.img === img) return;
  sweepSoon();
  const anim = peelsAnimated();
  const look = lookOf(id);
  const isTile = !!img.closest('.peel-tile');
  const lookHere = !!look && (!isTile || look.tile);
  const footHere = anim && (hasPeelLive(id) || hasPeelCraft(id));
  const still = !anim && lookHere ? stillLook(id) : null;
  if (!footHere && !(anim && lookHere) && !still) return;
  if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
  const canvas = overlayCanvas('1');
  img.after(canvas);
  const boost = { w: 1 };
  let back: HTMLCanvasElement | null = null;
  let bctx: CanvasRenderingContext2D | null = null;
  if (lookHere && look!.back) {
    // glows and flames go on a canvas behind the image: positioned, it paints in page order, so the image
    // (positioned too) sits over it
    back = overlayCanvas('auto');
    img.before(back);
    if (getComputedStyle(img).position === 'static') img.style.position = 'relative';
    bctx = back.getContext('2d')!;
  }
  const ctx = canvas.getContext('2d')!;
  const o: Overlay = {
    img,
    canvas,
    ctx,
    pen: canvasPen(ctx, boost),
    back,
    bctx,
    bpen: bctx ? canvasPen(bctx, boost) : null,
    boost,
    paint: anim && lookHere ? look!.painter() : null,
    foot: footHere ? { live: null, asked: false } : null,
    hid: false,
    k: 1,
    mips: [],
    still,
    id,
    style: getComputedStyle(img),
    // (everything waits to be seen: a page of looks, like the look lab, only animates what's in view)
    seen: !seen,
  };
  overlays.add(o);
  if (still) {
    // painted now if the image has its size, else when it gets it
    if (resized) resized.observe(img);
    else if (place(o)) paintStill(o);
    return;
  }
  seen?.observe(img);
  wake();
}

/** A smack on a locker image's living peel (the locker's ▶ plays its smack: the peel answers it as in play). */
export function smackLookImg(img: HTMLImageElement): void {
  for (const o of overlays) if (o.img === img) o.foot?.live?.smack();
}

/** Stop every locker overlay (the locker closed). */
export function stopLookOverlays(): void {
  for (const o of [...overlays]) drop(o);
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
}
