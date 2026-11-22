// Live art for the Immortals (art in src/content/art/immortals.ts, ported from the approved mockup):
//
// - Immortal Sandals: the foot is living black smoke. Under the mask its body boils through 8 pre-drawn frames
//   (ping-pong, cross-faded), and smoke particles boil off the toes and sides, pour from under the armour's edge
//   and stream from the mask's eyes and mouth.
// - Immortal Brute: the eye looks side to side (an iris sprite that slides) and blinks every 3.4 s (8 pre-drawn lid
//   frames over it), and black smoke, now and then a red wisp, seeps from round the eye, more along the lid line
//   as it blinks. The two burst cuts gnash: each steps through 8 pre-drawn jaw openings on a spring (open slowly,
//   snap shut with a bounce, grind; chatter on the wind-up, gape as he dives, snap shut on landing then roar), smoke
//   seeps out of them and coughs out as they snap, and black drool runs: rivulets creep down the hide leaving a
//   glossy trail, and a bead swells on a stretchy thread off each cut's lower end, swings and lags as he moves and
//   snaps and falls (a landing flings it off), splatting under a landed foot. He's on a light rig: a stretch on the
//   wind-up and the dive and a heavy squash on landing.
//
// Both have a toe band: their toes are pre-drawn at the live kit's curl poses (src/game/liveKit.ts) and the band
// shows the nearest one, so the toes curl on the wind-up, stay part-curled through the dive and the lift, and splay
// for a moment on landing.
//
// The particles live in the feet layer's space, not the foot's, so a moving foot leaves translucent trails: above it
// on a slam, below it as it rises. Each emitter sits inside the foot's container (so it stacks with the foot's art)
// with the inverse of the container's transform, which makes its own frame the layer's. When the foot dies the
// emitters move out to the layer, stop emitting and fade out where they are.
//
// Driven from the feet's contentFx tick hooks (src/game/acts/persians.ts, src/game/acts/leonidas.ts). The foot
// texture is swapped for a variant without the live parts (Foot.setArtTexture); the full texture stays for the
// Peel Locker, the Pizzapedia and the boss lab. Reduced motion and crowds of Immortals thin the smoke out.

import { feetAnimated } from '../systems/graphics';
import Phaser from 'phaser';
import { CX } from '../art/feetCommon';
import { footCanvas } from '../art/feetArt';
import { makeCanvas } from '../art/util';
import {
  BRUTE, BRUTE_TOE_BOX, CUTS, EYE, IMM, IMM_TOE_BOX, IRIS_BOX, LID_BOX, MASK, MASK_HOLES, type MockFrame, TOES, bruteBody,
  bruteCut, bruteHideColour, bruteIris, bruteLids, bruteToes, cutAxes, cutBox, cutLips, cutLowEnd, cutPt, gorgetBottom,
  immortalArmour, immortalLook, immortalToes, mock, noise, smokeBody,
} from '../content/art/immortals';
import { Spring } from './liveKit';
import { pose } from '../art/style/kit';
import type { FootType } from '../data/feet';
import { crand } from '../systems/cosmeticRandom';
import { save } from '../systems/save';
import { ART_RES } from './assets';
import type { Foot } from './Foot';

// tints for the rimmed puff (its core is 12% grey): black smoke with a cold grey edge, lighter curls, a red wisp
const DARK = 0x363a44;
const CURL = 0x8e97a8;
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

/** n frames of a box of the mock frame in one texture (frames 0..n-1), in rows no wider than 4096 px. */
function frameSheet(sc: Phaser.Scene, key: string, type: FootType, F: MockFrame, box: Box, n: number, draw: (ctx: CanvasRenderingContext2D, i: number) => void): string {
  if (sc.textures.exists(key)) return key;
  const s = type.scale * ART_RES;
  const fw = Math.ceil(box.w * F.k * s);
  const fh = Math.ceil(box.h * F.k * s);
  const cols = Math.max(1, Math.min(n, Math.floor(4096 / fw)));
  const [c, ctx] = makeCanvas(fw * cols, fh * Math.ceil(n / cols));
  for (let i = 0; i < n; i++) {
    const [fc, f] = makeCanvas(fw, fh);
    f.scale(s, s);
    f.translate(-(CX + box.x * F.k), -(F.y0 + box.y * F.k));
    mock(f, F, () => draw(f, i));
    ctx.drawImage(fc, (i % cols) * fw, Math.floor(i / cols) * fh);
  }
  const tex = sc.textures.addCanvas(key, c);
  for (let i = 0; i < n; i++) tex?.add(i, 0, (i % cols) * fw, Math.floor(i / cols) * fh, fw, fh);
  return key;
}

// ——— the toe band ———

/** The live kit's curl track (src/game/liveKit.ts): splayed … rest … curled. */
const CURL_TRACK = [-1, -0.5, 0, 0.25, 0.5, 0.75, 1];
const REST_FRAME = CURL_TRACK.indexOf(0);

/** A foot's toes as a sprite that steps through pre-drawn curl poses, timed like the live kit's rig. */
class ToeBand {
  readonly img: Phaser.GameObjects.Image;
  private curl = 0;
  private landT = 9;
  private last = '';

  constructor(sc: Phaser.Scene, private f: Foot, F: MockFrame, box: Box, below: boolean, draw: (ctx: CanvasRenderingContext2D, curl: number) => void) {
    const key = frameSheet(sc, `live_${f.type.id}_toes`, f.type, F, box, CURL_TRACK.length, (ctx, i) => draw(ctx, CURL_TRACK[i]));
    this.img = boxImage(sc, f, key, F, box).setFrame(REST_FRAME);
    f.addLiveArt(this.img, below);
  }

  update(dt: number): void {
    const f = this.f;
    if (f.state !== this.last) {
      // landing: the toes splay at once, then settle
      if (f.state === 'stomp') {
        this.landT = 0;
        this.curl = -1;
      }
      this.last = f.state;
    }
    this.landT += dt;
    // curled on the wind-up (the last moments of a hover), part-curled through the dive and the lift
    const windingUp = f.state === 'hover' && !f.held && !f.pinned && f.stateT > f.hoverTime - 0.45;
    let to = 0;
    if (windingUp) to = 1;
    else if (f.state === 'descend') to = 0.3;
    else if (f.state === 'stomp') to = this.landT < 0.14 ? -1 : 0;
    else if (f.state === 'lift') to = 0.35;
    const rate = to > this.curl ? 7 : 4;
    this.curl += Math.sign(to - this.curl) * Math.min(Math.abs(to - this.curl), rate * dt);
    // one frame at a time: cross-fading two poses would show both sets of toes, ghosted
    let best = 0;
    for (let i = 1; i < CURL_TRACK.length; i++) if (Math.abs(CURL_TRACK[i] - this.curl) < Math.abs(CURL_TRACK[best] - this.curl)) best = i;
    this.img.setFrame(best);
  }
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

  /** `fx`: off the foot's rig (a rigged foot's art squashes and swings; its smoke keeps the layer's frame). */
  constructor(sc: Phaser.Scene, private f: Foot, private F: MockFrame, below: boolean, private fx = false) {
    this.seed = Math.floor(crand() * 2147483646) + 1;
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
    if (fx) f.addLiveFx(this.em, below);
    else f.addLiveArt(this.em, below);
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
    let wx: number;
    let wy: number;
    if (this.fx) {
      // a rigged foot: follow its swing and squash
      [wx, wy] = this.f.styleWorld(CX + mx * this.F.k, this.F.y0 + my * this.F.k);
    } else {
      const ts = this.f.type.scale;
      const lx = mx * this.F.k * ts;
      const ly = (this.F.y0 + my * this.F.k - this.F.contactY) * ts;
      const c = Math.cos(r.rotation);
      const s = Math.sin(r.rotation);
      wx = r.x + (c * lx * r.scaleX - s * ly * r.scaleY);
      wy = r.y + (s * lx * r.scaleX + c * ly * r.scaleY);
    }
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
  toes: ToeBand;
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
  // the armoured toes over the smoke, under the lamellar
  const toes = new ToeBand(sc, f, IMM, IMM_TOE_BOX, true, (ctx, curl) => immortalToes(ctx, o, pose({ curl })));
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
  const st: ImmortalLive = { back, front, toes, a, b, t: crand() * 10, lastY: f.root.y, host };
  immortals.set(f, st);
  return st;
}

/** Ping-pong through the body frames. */
const bodyFrame = (k: number) => {
  const p = BODY_FRAMES * 2 - 2;
  const m = ((k % p) + p) % p;
  return m < BODY_FRAMES ? m : p - m;
};

/** Feet that started with animation off (graphics settings): they keep their still art. */
const still = new WeakSet<Foot>();
const isStill = (f: Foot): boolean => {
  if (still.has(f)) return true;
  if (immortals.has(f) || brutes.has(f) || feetAnimated()) return false;
  still.add(f);
  return true;
};

export function immortalLive(f: Foot, dt: number): void {
  if (isStill(f)) return;
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
  st.toes.update(dt);
  back.follow(dt);
  front.follow(dt);
  // stepping out of the smoke (the return): a cloud boils up round it
  if (f.brain.smokeIn) {
    f.brain.smokeIn = 0;
    for (let i = 0; i < 46; i++) {
      const ang = crand() * Math.PI * 2;
      const d = 40 + crand() * 90;
      back.emit(Math.cos(ang) * d, 150 + Math.sin(ang) * d, Math.cos(ang) * 60, Math.sin(ang) * 40 - 30, 0, 1.2 + crand() * 0.8, 16, 46, 0.5, DARK);
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
    back.emit(px, MASK.my + gorgetBottom(px) * MASK.ms - 4, (rn() - 0.5) * 20, 20 + rn() * 20, vyw, 0.6 + rn() * 0.4, 6, 16, 0.3, DARK);
  });
  back.rate('curl', 30, dt, (rn) => {
    const T = TOES[Math.floor(rn() * 5)];
    back.emit(T[0] + (rn() - 0.5) * 30, T[1] + T[3] * 0.6, (rn() - 0.5) * 24, 8 + rn() * 14, vyw, 0.6 + rn() * 0.4, 5, 15, 0.2, CURL);
  });
  // the armoured toes stand in the smoke: thin wisps curl up over them from the gaps between them
  front.rate('wisp', 24, dt, (rn) => {
    const i = Math.floor(rn() * 4);
    const a = TOES[i];
    const b = TOES[i + 1];
    front.emit((a[0] + a[2] + b[0] - b[2]) / 2 + (rn() - 0.5) * 8, (a[1] + b[1]) / 2 + 6, (rn() - 0.5) * 20, -14 - rn() * 18, vyf, 0.8 + rn() * 0.5, 4, 14, 0.24, rn() < 0.3 ? CURL : DARK);
  });
  // the face: smoke streams from the eye holes and the mouth
  for (const s of [-1, 1]) {
    front.rate(s < 0 ? 'eyeL' : 'eyeR', 46, dt, (rn) => {
      const px = s * MASK_HOLES.eyeX * MASK.ms + (rn() - 0.5) * 14;
      const py = MASK.my + MASK_HOLES.eyeY * MASK.ms + (rn() - 0.5) * 5;
      front.emit(px, py, s * (55 + rn() * 70), -40 - rn() * 50, vyf, 1.5 + rn() * 0.8, 5, 30, 0.5, rn() < 0.25 ? CURL : DARK);
    });
  }
  front.rate('mouth', 26, dt, (rn) => {
    front.emit((rn() - 0.5) * 50 * MASK.ms, MASK.my + MASK_HOLES.mouthY * MASK.ms, (rn() - 0.5) * 70, -20 - rn() * 30, vyf, 1.2 + rn() * 0.5, 5, 24, 0.42, rn() < 0.25 ? CURL : DARK);
  });
}

// ——— the Immortal Brute ———

const LID_FRAMES = 8;
const BLINK_P = 3.4;
const BLINK_D = 0.32;
/** Pre-drawn jaw openings per cut (0 clenched … 1 gaping). */
const JAW_FRAMES = 8;
/** Drool colour and its cold gloss. */
const INK = 0x060509;
const GLOSS = 0xc8d2e6;

/** One burst cut's jaws: the frame sprite and the opening, on a spring so a snap shut bounces. */
interface Jaw {
  img: Phaser.GameObjects.Image;
  o: Spring;
  /** Where it is in its chew (cycles). */
  ph: number;
  /** Chews per second at rest. */
  rate: number;
  /** Opening at the top of this chew. */
  peak: number;
  /** Gnash puffs: once per snap. */
  puffed: boolean;
}

/** A rivulet of black drool running down the hide from a cut's lower lip (mock frame, on the foot). */
interface Run {
  x: number;
  y: number;
  vy: number;
  trail: [number, number][];
  stopAt: number;
  /** 1 while it runs; fades to 0 once it stops (soaked in). */
  life: number;
  sd: number;
}

/** A strand of drool hanging off a cut's lower end, a bead on a viscous thread (world px, the feet layer's frame). */
interface Strand {
  cut: number;
  bx: number;
  by: number;
  vx: number;
  vy: number;
  /** Bead radius, rest length (mock units). */
  r: number;
  rest: number;
  /** Seconds to wait before a new one gathers (after a fall). */
  wait: number;
  /** After the bead drops: the thread snaps back up (1 → 0). */
  recoil: number;
}

interface Drop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  t: number;
  /** Splatted on the ground: a flat stain that fades. */
  splat: boolean;
}

interface BruteLive {
  smoke: Smoke;
  toes: ToeBand;
  iris: Phaser.GameObjects.Image;
  lids: Phaser.GameObjects.Image;
  jaws: Jaw[];
  runs: Run[];
  runT: number[];
  strands: Strand[];
  drops: Drop[];
  hide: Phaser.GameObjects.Graphics;
  world: Phaser.GameObjects.Container;
  air: Phaser.GameObjects.Graphics;
  irisX: number;
  t: number;
  lastY: number;
  lastVy: number;
  sy: Spring;
  sw: Spring;
  landT: number;
  state: string;
}
const brutes = new WeakMap<Foot, BruteLive>();
const CUT_AX = CUTS.map(cutAxes);

/** Keep the items that pass, in place (no new array each frame). */
function compact<T>(a: T[], keep: (v: T) => boolean): void {
  let n = 0;
  for (const v of a) if (keep(v)) a[n++] = v;
  a.length = n;
}

function startBrute(f: Foot): BruteLive {
  const sc = f.scene;
  const base = bruteHideColour(f.type.art);
  f.enableRig();
  f.setArtTexture(variantTexture(sc, f.type, (ctx) => bruteBody(ctx, f.type.art)));
  const irisKey = frameSheet(sc, `live_${f.type.id}_iris`, f.type, BRUTE, IRIS_BOX, 1, (ctx) => bruteIris(ctx, 0));
  const lidKey = frameSheet(sc, `live_${f.type.id}_lids`, f.type, BRUTE, LID_BOX, LID_FRAMES, (ctx, i) => bruteLids(ctx, base, i / (LID_FRAMES - 1)));
  const iris = boxImage(sc, f, irisKey, BRUTE, IRIS_BOX);
  const lids = boxImage(sc, f, lidKey, BRUTE, LID_BOX);
  f.addLiveArt(iris, false);
  f.addLiveArt(lids, false);
  // the cuts' jaws: each its own sheet of openings, each chewing to its own beat
  const jaws = CUTS.map((c, i): Jaw => {
    const box = cutBox(c);
    const key = frameSheet(sc, `live_${f.type.id}_cut${i}`, f.type, BRUTE, box, JAW_FRAMES, (ctx, j) => bruteCut(ctx, c, base, j / (JAW_FRAMES - 1)));
    const img = boxImage(sc, f, key, BRUTE, box);
    f.addLiveArt(img, false);
    return { img, o: new Spring(0.3, 260, 11), ph: crand(), rate: 0.75 + crand() * 0.3, peak: 0.6, puffed: true };
  });
  // the drool running down the hide (drawn in the mock frame, on the rig, under the toes)
  const ts = f.type.scale;
  const hide = sc.add.graphics().setPosition(0, (BRUTE.y0 - BRUTE.contactY) * ts).setScale(BRUTE.k * ts);
  f.addLiveArt(hide, false);
  const toes = new ToeBand(sc, f, BRUTE, BRUTE_TOE_BOX, false, (ctx, curl) => bruteToes(ctx, base, pose({ curl })));
  const smoke = new Smoke(sc, f, BRUTE, false, true);
  // hanging strands and falling drops: in the feet layer's frame (like the smoke), over the foot
  const air = sc.add.graphics();
  const world = sc.add.container(0, 0, [air]);
  f.addLiveFx(world, false);
  let freed = false;
  const release = () => {
    if (freed) return;
    freed = true;
    smoke.release();
    const layer = f.root.parentContainer;
    const st = brutes.get(f);
    if (!layer || !world.active || !st || !sc.sys.isActive()) {
      if (world.active) world.destroy();
      return;
    }
    f.root.remove(world);
    layer.add(world);
    world.setPosition(0, 0).setRotation(0).setScale(1);
    // the strands go with the foot; the drops already falling finish their fall
    st.strands.length = 0;
    const u = BRUTE.k * f.type.scale * f.root.scaleX;
    let t = 0;
    const stop = () => {
      sc.events.off('update', tick);
      sc.events.off('shutdown', stop);
      if (world.active) world.destroy();
    };
    const tick = (_time: number, delta: number) => {
      const dt = Math.min(0.05, delta / 1000);
      t += dt;
      if (!world.active || t > 1.6 || !st.drops.length) return stop();
      air.clear();
      drops(st, air, dt, Infinity, u, 1);
    };
    sc.events.on('update', tick);
    sc.events.once('shutdown', stop);
  };
  f.liveHost = { die: release, destroy: release };
  const st: BruteLive = {
    smoke,
    toes,
    iris,
    lids,
    jaws,
    runs: [],
    runT: CUTS.map(() => 0.4 + crand() * 1.5),
    strands: CUTS.map((_, cut) => ({ cut, bx: 0, by: 0, vx: 0, vy: 0, r: 0, rest: 0, wait: 0.05 + crand() * 1.2, recoil: 0 })),
    drops: [],
    hide,
    world,
    air,
    irisX: iris.x,
    t: crand() * BLINK_P,
    lastY: f.root.y,
    lastVy: 0,
    sy: new Spring(1, 190, 13),
    sw: new Spring(0, 40, 7),
    landT: 9,
    state: '',
  };
  brutes.set(f, st);
  return st;
}

/** 0 open … 1 shut: a quick blink at the end of every BLINK_P seconds. */
function blinkAt(t: number): number {
  const u = t % BLINK_P;
  return u > BLINK_P - BLINK_D ? Math.sin(((u - (BLINK_P - BLINK_D)) / BLINK_D) * Math.PI) : 0;
}

/** A point of the Brute's mock frame in the feet layer's frame (following the rig). */
const bruteWorld = (f: Foot, mx: number, my: number) => f.styleWorld(CX + mx * BRUTE.k, BRUTE.y0 + my * BRUTE.k);

/** Where a cut's jaws want to be this frame: a slow chew (open, snap shut, grind), a fast chatter on the wind-up, a
 * gape as he dives, and on landing a snap shut that bounces into a roar. */
function jawTarget(j: Jaw, f: Foot, st: BruteLive, windingUp: boolean, calm: number, dt: number): number {
  if (st.landT < 0.09) return 0;
  if (st.landT < 0.7) return 1;
  if (f.state === 'descend') return 1;
  j.ph += dt * (windingUp ? 4.4 : j.rate) * (0.5 + 0.5 * calm);
  const u = j.ph % 1;
  if (u < 0.02) j.peak = (windingUp ? 0.5 : 0.45 + crand() * 0.45) * (0.6 + 0.4 * calm);
  // open slowly, snap shut, then grind clenched for a moment
  if (u < 0.6) return 0.08 + (j.peak - 0.08) * Math.sin((u / 0.6) * Math.PI * 0.5);
  if (u < 0.68) return 0;
  return 0.04 + 0.04 * Math.sin(u * 60);
}

export function bruteLive(f: Foot, dt: number): void {
  if (isStill(f)) return;
  const st = brutes.get(f) ?? startBrute(f);
  if (dt <= 0) return;
  st.t += dt;
  const r = f.root;
  const vy = (r.y - st.lastY) / dt;
  st.lastY = r.y;
  const accY = (vy - st.lastVy) / dt;
  st.lastVy = vy;
  const reduced = save.settings.reducedMotion;
  const calm = reduced ? 0.35 : 1;
  const windingUp = f.state === 'hover' && !f.held && !f.pinned && f.stateT > f.hoverTime - 0.45;
  if (f.state !== st.state) {
    if (f.state === 'stomp') {
      st.landT = 0;
      // he lands like a dropped anvil: squash hard and spring back
      st.sy.v -= 3.4 * calm;
    }
    st.state = f.state;
  }
  st.landT += dt;
  // ——— the rig: a stretch on the wind-up and the dive, a heavy squash on landing ———
  let syTo = 1 + Math.sin(st.t * 1.5) * 0.01 * calm;
  if (windingUp) syTo = 1 + 0.05 * calm;
  else if (f.state === 'descend') syTo = 1 + Math.min(0.07, Math.max(0, f.vy) / 5200) * calm;
  else if (f.state === 'lift') syTo = 1 + 0.025 * calm;
  const sy = st.sy.step(syTo, dt);
  const swing = st.sw.step(Math.sin(st.t * 0.8) * 0.012 * calm, dt);
  f.setRigPose(swing, 1 + (1 - sy) * 0.65, sy);
  // ——— the eye ———
  const b = reduced ? 0 : blinkAt(st.t);
  const look = Math.sin(st.t * 0.9) * 10;
  st.iris.x = st.irisX + look * BRUTE.k * f.type.scale;
  st.lids.setFrame(Math.round(b * (LID_FRAMES - 1)));
  st.toes.update(dt);
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
  // ——— the jaws ———
  st.jaws.forEach((j, i) => {
    const before = j.o.x;
    const o = Phaser.Math.Clamp(j.o.step(jawTarget(j, f, st, windingUp, calm, dt), dt), 0, 1);
    j.img.setFrame(Math.round(o * (JAW_FRAMES - 1)));
    const c = CUTS[i];
    const ax = CUT_AX[i];
    // smoke seeps out of the cut, more as it gapes; a snap shut coughs a puff out
    smoke.rate(`cut${i}`, (22 + o * 50) * (1 + (windingUp ? 1 : 0)), dt, (rn) => {
      const u = (rn() - 0.5) * ax.L * 0.7;
      const [a, bl] = cutLips(c, ax, u, o);
      const [px, py] = cutPt(ax, u, (a + bl) / 2);
      smoke.emit(px, py, -ax.nx * 20 + (rn() - 0.5) * 24, -30 - rn() * 34, vy * 0.12, 1.1 + rn() * 0.6, 4, 22, 0.38, rn() < 0.05 ? RED : DARK);
    });
    const closing = j.o.v < -4 && before > 0.25 && o <= 0.25;
    if (closing && !j.puffed) {
      j.puffed = true;
      for (let k = 0; k < 7 * calm; k++) {
        const u = (crand() - 0.5) * ax.L * 0.6;
        const [px, py] = cutPt(ax, u, 0);
        smoke.emit(px, py, -ax.nx * 60 + (crand() - 0.5) * 60, -50 - crand() * 50, vy * 0.12, 0.9 + crand() * 0.5, 5, 20, 0.5, DARK);
      }
    } else if (o > 0.4) j.puffed = false;
  });
  // ——— the drool ———
  const ts = f.type.scale;
  const u = BRUTE.k * ts * r.scaleX;
  // rivulets: now and then a run of black drool spills over a lower lip and creeps down the hide
  st.runT.forEach((left, i) => {
    st.runT[i] = left - dt * (windingUp ? 1.8 : 1);
    if (st.runT[i] > 0 || st.runs.length >= 6) return;
    st.runT[i] = 0.9 + crand() * 1.6;
    const ax = CUT_AX[i];
    const lu = cutLowEnd(ax) * (-0.25 + crand() * 0.9);
    const o = st.jaws[i].o.x;
    const [, lo] = cutLips(CUTS[i], ax, lu, Phaser.Math.Clamp(o, 0, 1));
    const [px, py] = cutPt(ax, lu, lo + 1);
    st.runs.push({ x: px, y: py, vy: 2, trail: [[px, py]], stopAt: py + 22 + crand() * 40, life: 1, sd: crand() * 50 });
  });
  for (const run of st.runs) {
    if (run.y < run.stopAt && run.y < 262) {
      // viscous: it creeps, faster as more gathers at its head (and when the foot drops out from under it)
      run.vy = Math.min(26, run.vy + (9 - Math.min(0, accY / 4000)) * dt);
      run.y += run.vy * dt;
      run.x += noise(run.sd + run.y * 0.08) * 6 * dt;
      const last = run.trail[run.trail.length - 1];
      if (Math.hypot(run.x - last[0], run.y - last[1]) > 2) run.trail.push([run.x, run.y]);
    } else run.life -= dt * 0.45;
  }
  compact(st.runs, (run) => run.life > 0);
  const vis = f.visualAlpha;
  const g = st.hide;
  g.clear();
  for (const run of st.runs) {
    const n = run.trail.length;
    const a = Math.min(1, run.life * 1.4) * vis;
    for (let k = 1; k < n; k++) {
      const [x0, y0] = run.trail[k - 1];
      const [x1, y1] = run.trail[k];
      // thickest where it spilled, thinning down to the head
      const wk = 4.4 - (k / n) * 1.8;
      g.lineStyle(wk, INK, 0.94 * a).lineBetween(x0, y0, x1, y1);
      g.lineStyle(0.7, GLOSS, 0.42 * a).lineBetween(x0 - wk * 0.3, y0, x1 - wk * 0.3, y1);
    }
    // the head: a bead that swells as it runs
    const hr = 2.4 + Math.min(1.8, (run.y - run.trail[0][1]) * 0.05);
    g.fillStyle(INK, 0.96 * a).fillCircle(run.x, run.y + hr * 0.3, hr);
    g.fillStyle(0xeef2ff, 0.8 * a).fillCircle(run.x - hr * 0.35, run.y - hr * 0.1, hr * 0.28);
  }
  // strands: a bead on a thread off each cut's lower end. It stretches as it fills, swings and lags as the foot
  // moves, snaps and falls when it's too heavy or yanked (landing flings it off), and the thread recoils
  st.world.setRotation(-r.rotation).setScale(1 / r.scaleX, 1 / r.scaleY);
  {
    const c = Math.cos(-r.rotation);
    const s = Math.sin(-r.rotation);
    st.world.setPosition((c * -r.x - s * -r.y) / r.scaleX, (s * -r.x + c * -r.y) / r.scaleY);
  }
  const air = st.air;
  air.clear();
  for (const sd of st.strands) {
    const ax = CUT_AX[sd.cut];
    const lu = cutLowEnd(ax) * 0.74;
    const o = Phaser.Math.Clamp(st.jaws[sd.cut].o.x, 0, 1);
    const [, lo] = cutLips(CUTS[sd.cut], ax, lu, o);
    const [mx, my] = cutPt(ax, lu, lo + 0.5);
    const [tx, ty] = bruteWorld(f, mx, my);
    if (sd.recoil > 0) {
      sd.recoil = Math.max(0, sd.recoil - dt * 4);
      const len = sd.rest * u * sd.recoil * sd.recoil;
      air.lineStyle(1.4 * u, INK, 0.9 * vis).lineBetween(tx, ty, tx, ty + len);
      air.fillStyle(INK, 0.9 * vis).fillCircle(tx, ty + len, 1.2 * u);
      continue;
    }
    if (sd.wait > 0) {
      sd.wait -= dt;
      if (sd.wait <= 0) {
        sd.bx = tx;
        sd.by = ty;
        sd.vx = 0;
        sd.vy = 0;
        sd.r = 0.8;
        sd.rest = 2;
      }
      continue;
    }
    // it fills: the bead swells and the thread creeps longer
    sd.r = Math.min(5.4, sd.r + dt * (1.4 + (windingUp ? 1.2 : 0)));
    sd.rest += dt * (6 + sd.r * 2.6);
    // a mass on a stretchy, syrupy thread (world px)
    const dx = sd.bx - tx;
    const dy = sd.by - ty;
    const d = Math.hypot(dx, dy) || 1e-6;
    const rest = sd.rest * u;
    const pull = d > rest ? (d - rest) * 260 : 0;
    sd.vx += (-(dx / d) * pull - sd.vx * 4.5) * dt;
    sd.vy += (1500 * (0.4 + sd.r * 0.15) - (dy / d) * pull - sd.vy * 4.5) * dt;
    sd.bx += sd.vx * dt;
    sd.by += sd.vy * dt;
    const stretch = d / Math.max(rest, 1e-3);
    // too heavy, too long or yanked: it snaps and falls
    if ((sd.r >= 5.4 && sd.rest > 30) || d - rest > 18 * u || d > 60 * u) {
      st.drops.push({ x: sd.bx, y: sd.by, vx: sd.vx * 0.6, vy: Math.max(sd.vy, 60), r: sd.r, t: 0, splat: false });
      sd.recoil = 1;
      sd.rest = Math.min(sd.rest, d / u);
      sd.wait = 0.8 + crand() * 1.8;
      continue;
    }
    // draw: thick at the lip, necking thinner the more it stretches, swelling into the bead
    const ux = (sd.bx - tx) / d;
    const uy = (sd.by - ty) / d;
    const nx = -uy;
    const ny = ux;
    const w0 = 3.2 * u;
    const neck = Math.max(0.7 * u, w0 * (0.6 - Math.min(0.4, (stretch - 1) * 0.5)));
    const br = sd.r * u;
    const mxw = tx + (sd.bx - tx) * 0.55;
    const myw = ty + (sd.by - ty) * 0.55;
    air.fillStyle(INK, 0.97 * vis);
    air.beginPath();
    air.moveTo(tx + nx * w0, ty + ny * w0);
    air.lineTo(mxw + nx * neck, myw + ny * neck);
    air.lineTo(sd.bx + nx * br * 0.6, sd.by + ny * br * 0.6);
    air.lineTo(sd.bx - nx * br * 0.6, sd.by - ny * br * 0.6);
    air.lineTo(mxw - nx * neck, myw - ny * neck);
    air.lineTo(tx - nx * w0, ty - ny * w0);
    air.closePath();
    air.fillPath();
    air.fillCircle(sd.bx, sd.by, br);
    air.lineStyle(0.6 * u, GLOSS, 0.45 * vis).lineBetween(tx - nx * w0 * 0.4, ty, mxw - nx * neck * 0.6, myw);
    air.fillStyle(0xeef2ff, 0.85 * vis).fillCircle(sd.bx - br * 0.38, sd.by - br * 0.38, br * 0.26);
  }
  // falling drops, and their splats when they hit the ground under a landed foot
  drops(st, air, dt, f.state === 'stomp' ? r.y + 6 * u : Infinity, u, vis);
}

/** Step and draw the falling drops (world px) and their splats at `ground`. */
function drops(st: BruteLive, air: Phaser.GameObjects.Graphics, dt: number, ground: number, u: number, vis: number): void {
  for (const d of st.drops) {
    d.t += dt;
    if (d.splat) continue;
    d.vy += 2200 * dt;
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    if (d.y >= ground) {
      d.y = ground;
      d.splat = true;
      d.t = 0;
    }
  }
  compact(st.drops, (d) => (d.splat ? d.t < 1.2 : d.t < 1.4));
  for (const d of st.drops) {
    const br = d.r * u;
    if (d.splat) {
      const a = (1 - d.t / 1.2) * vis;
      air.fillStyle(INK, 0.85 * a).fillEllipse(d.x, d.y, br * 5, br * 1.2);
      air.fillStyle(GLOSS, 0.35 * a).fillEllipse(d.x - br * 0.8, d.y - br * 0.2, br * 1.4, br * 0.3);
      continue;
    }
    const a = Math.min(1, (1.4 - d.t) * 3) * vis;
    // stretched along its fall
    const sl = Math.min(2.2, 1 + d.vy / 1400);
    air.fillStyle(INK, 0.96 * a).fillEllipse(d.x, d.y, br * 2 / Math.sqrt(sl), br * 2 * sl);
    air.fillStyle(0xeef2ff, 0.8 * a).fillCircle(d.x - br * 0.3, d.y - br * 0.4 * sl, br * 0.25);
  }
}
