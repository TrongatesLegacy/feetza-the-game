// Live art for the Immortals (art in src/content/art/immortals.ts, ported from the approved mockup):
//
// - Immortal Sandals: the foot is living black smoke. Under the mask its body boils through 8 pre-drawn frames
//   (ping-pong, cross-faded), and smoke particles boil off the toes and sides, pour from under the armour's edge
//   and stream from the mask's eyes and mouth.
// - Immortal Brute: the eye looks side to side (an iris sprite that slides) and blinks every 3.4 s (8 pre-drawn lid
//   frames over it), and black smoke, now and then a red wisp, seeps from round the eye, more along the lid line
//   as it blinks.
//
// The particles live in the feet layer's space, not the foot's, so a moving foot leaves translucent trails: above it
// on a slam, below it as it rises. Each emitter sits inside the foot's container (so it stacks with the foot's art)
// with the inverse of the container's transform, which makes its own frame the layer's. When the foot dies the
// emitters move out to the layer, stop emitting and fade out where they are.
//
// Driven from the feet's contentFx tick hooks (src/game/acts/persians.ts, src/game/acts/leonidas.ts). The foot
// texture is swapped for a variant without the live parts (Foot.setArtTexture); the full texture stays for the
// Peel Locker, the Pizzapedia and the boss lab. Reduced motion and crowds of Immortals thin the smoke out.

import Phaser from 'phaser';
import { CX } from '../art/feetCommon';
import { footCanvas } from '../art/feetArt';
import { makeCanvas } from '../art/util';
import {
  BRUTE, EYE, IMM, IRIS_BOX, LID_BOX, MASK, type MockFrame, TOES, bruteBody, bruteHideColour, bruteIris, bruteLids,
  immortalArmour, immortalLook, mock, noise, smokeBody,
} from '../content/art/immortals';
import type { FootType } from '../data/feet';
import { save } from '../systems/save';
import { ART_RES } from './assets';
import type { Foot } from './Foot';

// tints for the rimmed puff (its core is 12% grey): black smoke with a grey edge, lighter curls, a red wisp
const DARK = 0x3a3642;
const CURL = 0x9a90aa;
const RED = 0xe0202a;
/** The particle texture's radius in px. */
const PR = 32;

// ——— textures ———

function smokeTexture(sc: Phaser.Scene): string {
  const key = 'live_smoke_rim';
  if (sc.textures.exists(key)) return key;
  const [c, x] = makeCanvas(PR * 2, PR * 2);
  // a near-black puff with a soft lighter rim baked in: tinted grey, its core is black and its edge a faint grey,
  // so the smoke still reads against a dark night sky
  const g = x.createRadialGradient(PR, PR, 0, PR, PR, PR);
  g.addColorStop(0, 'rgba(30,30,30,1)');
  g.addColorStop(0.5, 'rgba(40,40,40,.7)');
  g.addColorStop(0.78, 'rgba(255,255,255,.32)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, PR * 2, PR * 2);
  sc.textures.addCanvas(key, c);
  return key;
}

/** The foot's art without its live parts, in its texture's frame. */
function variantTexture(sc: Phaser.Scene, type: FootType, draw: (ctx: CanvasRenderingContext2D) => void): string {
  const key = `live_${type.id}_art`;
  if (!sc.textures.exists(key)) sc.textures.addCanvas(key, footCanvas(type, draw));
  return key;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** n frames of a box of the mock frame, side by side in one texture (frames 0..n-1). */
function frameSheet(sc: Phaser.Scene, key: string, type: FootType, F: MockFrame, box: Box, n: number, draw: (ctx: CanvasRenderingContext2D, i: number) => void): string {
  if (sc.textures.exists(key)) return key;
  const s = type.scale * ART_RES;
  const fw = Math.ceil(box.w * F.k * s);
  const fh = Math.ceil(box.h * F.k * s);
  const [c, ctx] = makeCanvas(fw * n, fh);
  for (let i = 0; i < n; i++) {
    const [fc, f] = makeCanvas(fw, fh);
    f.scale(s, s);
    f.translate(-(CX + box.x * F.k), -(F.y0 + box.y * F.k));
    mock(f, F, () => draw(f, i));
    ctx.drawImage(fc, i * fw, 0);
  }
  const tex = sc.textures.addCanvas(key, c);
  for (let i = 0; i < n; i++) tex?.add(i, 0, i * fw, 0, fw, fh);
  return key;
}

/** An image of a frame sheet, placed where its box sits on the foot (in the foot container's frame). */
function boxImage(sc: Phaser.Scene, f: Foot, key: string, F: MockFrame, box: Box): Phaser.GameObjects.Image {
  const ts = f.type.scale;
  return sc.add
    .image(box.x * F.k * ts, (F.y0 + box.y * F.k - F.contactY) * ts, key, 0)
    .setOrigin(0, 0)
    .setScale(1 / ART_RES);
}

// ——— smoke particles ———

interface Puff {
  life: number;
  r0: number;
  r1: number;
  a: number;
  sd: number;
}
type SmokeParticle = Phaser.GameObjects.Particles.Particle & { sm?: Puff };

/** What the next emitted particle gets (the emitter ops read it as it fires). */
const next = { vx: 0, vy: 0, tone: DARK, life: 1, r0: 1, r1: 1, a: 0.3, sd: 0 };
const puff = (p: SmokeParticle) => p.sm!;

let smoky = 0;
/** Emission multiplier: thinner with reduced motion and with many smoky feet about. */
function quality(): number {
  const q = Math.min(1, 3 / Math.max(1, smoky));
  return Math.max(0.3, q) * (save.settings.reducedMotion ? 0.4 : 1);
}

class Drift extends Phaser.GameObjects.Particles.ParticleProcessor {
  constructor(private smoke: Smoke) {
    super(0, 0, true);
  }
  update(p: SmokeParticle, _delta: number, step: number): void {
    const d = p.sm;
    if (!d) return;
    // the mockup's curl: a slow noise push sideways, and the air's drag
    p.velocityX += noise(d.sd + this.smoke.t * 1.7) * 60 * this.smoke.u * step;
    p.velocityX *= 1 - 1.4 * step;
    p.velocityY *= 1 - 1.1 * step;
  }
}

/** One smoke layer of a foot: an emitter in the feet layer's frame, fed in mockup units. */
class Smoke {
  readonly em: Phaser.GameObjects.Particles.ParticleEmitter;
  /** World px per mockup unit (set each tick). */
  u = 1;
  t = 0;
  private acc: Record<string, number> = {};
  private seed: number;
  private freed = false;

  constructor(sc: Phaser.Scene, private f: Foot, private F: MockFrame, below: boolean) {
    this.seed = Math.floor(Math.random() * 2147483646) + 1;
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const cfg: any = {
      emitting: false,
      lifespan: {
        onEmit: (p: SmokeParticle) => {
          const d = (p.sm ??= { life: 1, r0: 1, r1: 1, a: 0, sd: 0 });
          d.life = next.life;
          d.r0 = next.r0;
          d.r1 = next.r1;
          d.a = next.a;
          d.sd = next.sd;
          return next.life * 1000;
        },
      },
      speedX: { onEmit: () => next.vx },
      speedY: { onEmit: () => next.vy },
      scale: {
        onEmit: () => next.r0 / PR,
        onUpdate: (p: SmokeParticle, _k: string, t: number) => {
          const d = puff(p);
          return (d.r0 + (d.r1 - d.r0) * Math.sqrt(t)) / PR;
        },
      },
      alpha: {
        onEmit: () => 0,
        onUpdate: (p: SmokeParticle, _k: string, t: number) => {
          const d = puff(p);
          return d.a * (1 - t) * (1 - t) * Math.min(1, t * d.life * 10);
        },
      },
      tint: { onEmit: () => next.tone },
      maxAliveParticles: 900,
    };
    /* eslint-enable @typescript-eslint/no-explicit-any */
    this.em = sc.add.particles(0, 0, smokeTexture(sc), cfg);
    this.em.addParticleProcessor(new Drift(this));
    f.addLiveArt(this.em, below);
  }

  private rnd(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return this.seed / 2147483647;
  }

  /** Keep the emitter's frame on the feet layer's, whatever the foot's container does. */
  follow(dt: number): void {
    const r = this.f.root;
    this.t += dt;
    this.u = this.F.k * this.f.type.scale * r.scaleX;
    const c = Math.cos(-r.rotation);
    const s = Math.sin(-r.rotation);
    this.em.setRotation(-r.rotation).setScale(1 / r.scaleX, 1 / r.scaleY);
    this.em.setPosition((c * -r.x - s * -r.y) / r.scaleX, (s * -r.x + c * -r.y) / r.scaleY);
    this.em.gravityY = -26 * this.u;
  }

  /** Emit a puff at a mock-frame point: velocity in mock units/s plus `vyWorld` (world px/s), life in s, radii in mock units. */
  emit(mx: number, my: number, vx: number, vy: number, vyWorld: number, life: number, r0: number, r1: number, a: number, tone: number): void {
    const r = this.f.root;
    const ts = this.f.type.scale;
    const lx = mx * this.F.k * ts;
    const ly = (this.F.y0 + my * this.F.k - this.F.contactY) * ts;
    const c = Math.cos(r.rotation);
    const s = Math.sin(r.rotation);
    const wx = r.x + (c * lx * r.scaleX - s * ly * r.scaleY);
    const wy = r.y + (s * lx * r.scaleX + c * ly * r.scaleY);
    next.vx = vx * this.u;
    next.vy = vy * this.u + vyWorld;
    next.life = life;
    next.r0 = r0 * this.u;
    next.r1 = r1 * this.u;
    next.a = a;
    next.tone = tone;
    next.sd = this.rnd() * 100;
    this.em.emitParticleAt(wx, wy, 1);
  }

  /** Emit at `perSec` (scaled by quality) for this frame. */
  rate(key: string, perSec: number, dt: number, fn: (r: () => number) => void): void {
    const n = (this.acc[key] ?? 0) + perSec * quality() * dt;
    let k = Math.floor(n);
    this.acc[key] = n - k;
    while (k-- > 0) fn(() => this.rnd());
  }

  /** The foot is gone: leave the smoke where it is, stop, and clear up once the last puff fades. */
  release(): void {
    if (this.freed) return;
    this.freed = true;
    const r = this.f.root;
    const layer = r.parentContainer;
    if (!layer || !this.em.active) return;
    r.remove(this.em);
    layer.add(this.em);
    this.em.setPosition(0, 0).setRotation(0).setScale(1);
    this.em.scene.time.delayedCall(2600, () => this.em.active && this.em.destroy());
  }
}

// ——— the Immortal Sandals ———

const BODY_BOX: Box = { x: -112, y: 80, w: 224, h: 240 };
const BODY_FRAMES = 8;
const BODY_STEP = 0.14;

interface ImmortalLive {
  back: Smoke;
  front: Smoke;
  a: Phaser.GameObjects.Image;
  b: Phaser.GameObjects.Image;
  t: number;
  lastY: number;
  host: { die(): void; destroy(): void };
}
const immortals = new WeakMap<Foot, ImmortalLive>();

function startImmortal(f: Foot): ImmortalLive {
  const sc = f.scene;
  const o = immortalLook(f.type.art);
  f.setArtTexture(variantTexture(sc, f.type, (ctx) => mock(ctx, IMM, () => immortalArmour(ctx, o))));
  const key = frameSheet(sc, `live_${f.type.id}_body`, f.type, IMM, BODY_BOX, BODY_FRAMES, (ctx, i) => smokeBody(ctx, i * BODY_STEP, o));
  const back = new Smoke(sc, f, IMM, true);
  const a = boxImage(sc, f, key, IMM, BODY_BOX);
  const b = boxImage(sc, f, key, IMM, BODY_BOX);
  f.addLiveArt(a, true);
  f.addLiveArt(b, true);
  const front = new Smoke(sc, f, IMM, false);
  smoky++;
  let counted = true;
  const host = {
    die: () => {
      back.release();
      front.release();
      if (counted) smoky--;
      counted = false;
    },
    destroy: () => host.die(),
  };
  f.liveHost = host;
  const st: ImmortalLive = { back, front, a, b, t: Math.random() * 10, lastY: f.root.y, host };
  immortals.set(f, st);
  return st;
}

/** Ping-pong through the body frames. */
const bodyFrame = (k: number) => {
  const p = BODY_FRAMES * 2 - 2;
  const m = ((k % p) + p) % p;
  return m < BODY_FRAMES ? m : p - m;
};

export function immortalLive(f: Foot, dt: number): void {
  const st = immortals.get(f) ?? startImmortal(f);
  if (dt <= 0) return;
  st.t += dt;
  const r = f.root;
  const vy = (r.y - st.lastY) / dt;
  st.lastY = r.y;
  // the body boils: frame k under, frame k+1 fading in over it
  const pos = st.t / BODY_STEP;
  const k = Math.floor(pos);
  st.a.setFrame(bodyFrame(k));
  st.b.setFrame(bodyFrame(k + 1)).setAlpha((pos - k) * st.a.alpha);
  const { back, front } = st;
  back.follow(dt);
  front.follow(dt);
  // stepping out of the smoke (the return): a cloud boils up round it
  if (f.brain.smokeIn) {
    f.brain.smokeIn = 0;
    for (let i = 0; i < 46; i++) {
      const ang = Math.random() * Math.PI * 2;
      const d = 40 + Math.random() * 90;
      back.emit(Math.cos(ang) * d, 150 + Math.sin(ang) * d, Math.cos(ang) * 60, Math.sin(ang) * 40 - 30, 0, 1.2 + Math.random() * 0.8, 16, 46, 0.5, DARK);
    }
  }
  const vyw = vy * 0.15;
  const vyf = vy * 0.12;
  // the foot itself: smoke boils off the toes and the sides, and pours out from under the armour
  back.rate('toe', 150, dt, (rn) => {
    const T = TOES[Math.floor(rn() * 5)];
    const ang = Math.PI * (0.1 + rn() * 0.8);
    back.emit(T[0] + Math.cos(ang) * T[2], T[1] + Math.sin(ang) * T[3], (rn() - 0.5) * 30, 10 + rn() * 30, vyw, 0.7 + rn() * 0.6, 7, 22, 0.32, DARK);
  });
  back.rate('side', 70, dt, (rn) => {
    const s = rn() < 0.5 ? -1 : 1;
    back.emit(s * (84 + rn() * 5), 110 + rn() * 120, s * (20 + rn() * 30), -10 - rn() * 20, vyw, 0.8 + rn() * 0.5, 6, 20, 0.28, DARK);
  });
  back.rate('arch', 40, dt, (rn) => {
    const px = (rn() - 0.5) * 150;
    back.emit(px, MASK.my + 192 * MASK.ms - Math.abs(px) * 0.1, (rn() - 0.5) * 20, 20 + rn() * 20, vyw, 0.6 + rn() * 0.4, 6, 16, 0.3, DARK);
  });
  back.rate('curl', 30, dt, (rn) => {
    const T = TOES[Math.floor(rn() * 5)];
    back.emit(T[0] + (rn() - 0.5) * 30, T[1] + T[3] * 0.6, (rn() - 0.5) * 24, 8 + rn() * 14, vyw, 0.6 + rn() * 0.4, 5, 15, 0.2, CURL);
  });
  // the face: smoke streams from the eye holes and the mouth
  for (const s of [-1, 1]) {
    front.rate(s < 0 ? 'eyeL' : 'eyeR', 46, dt, (rn) => {
      const px = s * 42 * MASK.ms + (rn() - 0.5) * 14;
      const py = MASK.my + 66 * MASK.ms + (rn() - 0.5) * 5;
      front.emit(px, py, s * (55 + rn() * 70), -40 - rn() * 50, vyf, 1.5 + rn() * 0.8, 5, 30, 0.5, rn() < 0.25 ? CURL : DARK);
    });
  }
  front.rate('mouth', 26, dt, (rn) => {
    front.emit((rn() - 0.5) * 50 * MASK.ms, MASK.my + 160 * MASK.ms, (rn() - 0.5) * 70, -20 - rn() * 30, vyf, 1.2 + rn() * 0.5, 5, 24, 0.42, rn() < 0.25 ? CURL : DARK);
  });
}

// ——— the Immortal Brute ———

const LID_FRAMES = 8;
const BLINK_P = 3.4;
const BLINK_D = 0.32;

interface BruteLive {
  smoke: Smoke;
  iris: Phaser.GameObjects.Image;
  lids: Phaser.GameObjects.Image;
  irisX: number;
  t: number;
  lastY: number;
}
const brutes = new WeakMap<Foot, BruteLive>();

function startBrute(f: Foot): BruteLive {
  const sc = f.scene;
  const base = bruteHideColour(f.type.art);
  f.setArtTexture(variantTexture(sc, f.type, (ctx) => bruteBody(ctx, f.type.art)));
  const irisKey = frameSheet(sc, `live_${f.type.id}_iris`, f.type, BRUTE, IRIS_BOX, 1, (ctx) => bruteIris(ctx, 0));
  const lidKey = frameSheet(sc, `live_${f.type.id}_lids`, f.type, BRUTE, LID_BOX, LID_FRAMES, (ctx, i) => bruteLids(ctx, base, i / (LID_FRAMES - 1)));
  const iris = boxImage(sc, f, irisKey, BRUTE, IRIS_BOX);
  const lids = boxImage(sc, f, lidKey, BRUTE, LID_BOX);
  f.addLiveArt(iris, false);
  f.addLiveArt(lids, false);
  const smoke = new Smoke(sc, f, BRUTE, false);
  f.liveHost = { die: () => smoke.release(), destroy: () => smoke.release() };
  const st: BruteLive = { smoke, iris, lids, irisX: iris.x, t: Math.random() * BLINK_P, lastY: f.root.y };
  brutes.set(f, st);
  return st;
}

/** 0 open … 1 shut: a quick blink at the end of every BLINK_P seconds. */
function blinkAt(t: number): number {
  const u = t % BLINK_P;
  return u > BLINK_P - BLINK_D ? Math.sin(((u - (BLINK_P - BLINK_D)) / BLINK_D) * Math.PI) : 0;
}

export function bruteLive(f: Foot, dt: number): void {
  const st = brutes.get(f) ?? startBrute(f);
  if (dt <= 0) return;
  st.t += dt;
  const r = f.root;
  const vy = (r.y - st.lastY) / dt;
  st.lastY = r.y;
  const b = save.settings.reducedMotion ? 0 : blinkAt(st.t);
  const look = Math.sin(st.t * 0.9) * 10;
  st.iris.x = st.irisX + look * BRUTE.k * f.type.scale;
  st.lids.setFrame(Math.round(b * (LID_FRAMES - 1)));
  const { smoke } = st;
  smoke.follow(dt);
  const { y, w, h } = EYE;
  // smoke seeps from all round the eye, and squeezes out along the lid line when it blinks
  smoke.rate('eye', 110 + b * 110, dt, (rn) => {
    const ang = rn() * Math.PI * 2;
    const px = Math.cos(ang) * w * 0.46;
    const py = y + Math.sin(ang) * h * 0.4 * (1 - b * 0.8);
    smoke.emit(px, py, px * 0.25 + (rn() - 0.5) * 16, -45 - rn() * 45, vy * 0.12, 1.4 + rn() * 0.8, 5, 28, 0.45, rn() < 0.06 ? RED : DARK);
  });
}
