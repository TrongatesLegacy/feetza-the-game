// The Immortals' living peels (foot:immortal, shiny:immortal, boss:immortalbrute). The feet keep their own art
// (src/content/art/immortals.ts) and their own live layer in play (src/game/footLive.ts: the boiling smoke, the eye,
// the jaws, the drool); these are peel-only styles and defs (registerPeelStyle, registerPeelLive) cut from the same
// painters, so the peel moves the way the foot does:
//
// - Immortal Sandals: the body of black smoke boils under the chrome mask (its pre-drawn frames, cross-faded,
//   ping-pong), smoke boils off the toes and sides, pours from under the lamellar and streams from the mask's eyes
//   and mouth; the armoured toes curl now and then. A smack: a cloud of smoke bursts out round the foot, the body
//   boils hard, the eyes and mouth blast smoke and the toes splay.
// - Immortal Brute: the great eye looks about and blinks, smoke seeping round it; the two burst cuts chew (open
//   slowly, snap shut, grind), black drool dropping off their lower ends; the mutant toes curl now and then. A smack:
//   the jaws snap shut and gape in a roar, smoke coughs out of the cuts and the eye, drool is flung, the toes splay.
//
// Each moving piece is a still part the def steps through its frames (partFrame: a peel's def only), so it takes the
// peel's pattern and foil as the still does; the body under them is the foot minus its live parts.

import { CX } from '../../art/feetCommon';
import { type Pose, pose } from '../../art/style/kit';
import { type PartDef, registerPeelStyle } from '../../art/style/registry';
import type { Ctx } from '../../art/util';
import type { FootArt } from '../../data/feet';
import { type LiveFoot, registerPeelLive, type WorldEmitter } from '../../game/liveKit';
import { crand } from '../../systems/cosmeticRandom';
import { save } from '../../systems/save';
import {
  BRUTE, BRUTE_TOE_BOX, CUTS, EYE, IMM, IMM_TOE_BOX, IRIS_BOX, LID_BOX, MASK, MASK_HOLES, type MockFrame, TOES, bruteBody,
  bruteCut, bruteHideColour, bruteIris, bruteLids, bruteToes, cutAxes, cutBox, cutLips, cutLowEnd, cutPt, drawBrute,
  drawImmortal, gorgetBottom, immortalArmour, immortalLook, immortalToes, mock, smokeBody, stillDrool,
} from '../art/immortals';

const R = () => crand();
const pm = () => crand() - 0.5;
const calm = () => (save.settings.reducedMotion ? 0.35 : 1);

/** Smoke on a peel: see-through charcoal with a paler rim, curling as it rises (dark puffs read as smudges on the
 * locker's cream); a smack's flash is light, never a dark or red smear. */
const CHAR = 0x4a505c;
const RIM = 0xb4bccb;
const INK = 0x060509;
const CHROME = 0xf2f6ff;
const EYE_RED = 0xff3a2a;

/** A peel def steps its own parts (src/art/peelLive.ts): frame i, with frame `next` faded in over it by `mix`. */
interface PeelK {
  partFrame?(name: string, i: number, next?: number, mix?: number): void;
}
const partFrame = (k: LiveFoot, name: string, i: number, next = i, mix = 0) => (k as unknown as PeelK).partFrame?.(name, i, next, mix);

type Box = { x: number; y: number; w: number; h: number };
/** A box of a mock frame in design units. */
const designBox = (F: MockFrame, b: Box): Box => ({ x: CX + b.x * F.k, y: F.y0 + b.y * F.k, w: b.w * F.k, h: b.h * F.k });
/** A mock-frame point in design units. */
const md = (F: MockFrame, x: number, y: number): [number, number] => [CX + x * F.k, F.y0 + y * F.k];
/** A part drawn in the mock frame (with the foot's art). */
const mockPart = (F: MockFrame, b: Box, frames: number, draw: (ctx: Ctx, i: number, art: FootArt) => void): PartDef => ({
  box: designBox(F, b),
  frames,
  draw: (ctx, art, i) => mock(ctx, F, () => draw(ctx, i, art)),
});

/** The toes' curl poses (splayed … rest … curled), as the living peels' toe bands use. */
const CURLS = [-1, -0.5, 0, 0.5, 1];
const REST_CURL = 2;

/** The toes' state: a curl now and then, a splay when a smack lands (as every living peel's toe band does). */
class Toes {
  constructor(private gap = 2.6) {}
  private curl = 0;
  private to = 0;
  private t = 0;
  private next = 1.2 + R() * 2.5;
  private mode: 'rest' | 'curl' | 'splay' = 'rest';
  update(dt: number, landed: boolean): number {
    this.t += dt;
    this.next -= dt;
    if (landed) {
      this.mode = 'splay';
      this.t = 0;
    } else if (this.mode === 'rest' && this.next <= 0) {
      this.mode = 'curl';
      this.t = 0;
      this.next = this.gap + R() * this.gap * 1.4;
    }
    if (this.mode === 'curl') {
      this.to = this.t < 0.5 ? 1 : 0;
      if (this.t > 0.9) this.mode = 'rest';
    } else if (this.mode === 'splay') {
      this.to = this.t < 0.14 ? -1 : 0;
      if (this.t > 0.5) this.mode = 'rest';
    } else this.to = 0;
    const rate = (this.to > this.curl ? 7 : 4) * (this.mode === 'splay' ? 3 : 1);
    this.curl += Math.sign(this.to - this.curl) * Math.min(Math.abs(this.to - this.curl), rate * dt);
    // (as an index into CURLS, fractional: the frames cross-fade)
    return REST_CURL + this.curl * 2;
  }
}

/** Step a part to a fractional frame: the frame below, the next one fading in. */
function frameAt(k: LiveFoot, name: string, pos: number): void {
  const i = Math.floor(pos);
  partFrame(k, name, i, i + 1, pos - i);
}

const smokeEm = (k: LiveFoot, below: boolean) => k.emitter({ frame: 'soft', curl: 70, drag: 1.1, below, max: 160 });
/** Light: glints, flashes. */
const lightEm = (k: LiveFoot) => k.emitter({ frame: 'mote', add: true, drag: 1.5, max: 60 });
/** A flash: a big soft burst of light over the dark art (light added to the cream round it wouldn't show). */
const flashEm = (k: LiveFoot) => k.emitter({ frame: 'soft', add: true, max: 12 });

/** A mock-frame point's design point, and the mock frame's world units per mock unit. */
function at(k: LiveFoot, F: MockFrame, mx: number, my: number): [number, number, number] {
  const [dx, dy] = md(F, mx, my);
  return [dx, dy, F.k * k.f.type.scale];
}

/** A wisp of smoke at a mock-frame point (sizes and speeds in mock units): a see-through charcoal body and a paler
 * rim a little above it, swelling as they rise and fade. */
function puff(k: LiveFoot, em: WorldEmitter, F: MockFrame, mx: number, my: number, vx: number, vy: number, life: number, r0: number, r1: number, a: number): void {
  const [dx, dy, u] = at(k, F, mx, my);
  em.emit(dx, dy, { vx: vx * u, vy: vy * u, life, r0: r0 * u, r1: r1 * u, a: a * 0.9, tint: CHAR, fade: 0.3 });
  em.emit(dx, dy - r0 * 0.4 * F.k, { vx: vx * u, vy: vy * 1.1 * u, life: life * 0.85, r0: r0 * 0.7 * u, r1: r1 * 0.8 * u, a: a * 0.55, tint: RIM, fade: 0.3 });
}

/** A point of light (a glint, a flash) at a mock-frame point. */
function light(k: LiveFoot, em: WorldEmitter, F: MockFrame, mx: number, my: number, vx: number, vy: number, life: number, r0: number, r1: number, a: number, tint: number): void {
  const [dx, dy, u] = at(k, F, mx, my);
  em.emit(dx, dy, { vx: vx * u, vy: vy * u, life, r0: r0 * u, r1: r1 * u, a, tint, fade: 0.1 });
}

// ════════════════════════════ the Immortal Sandals ════════════════════════════

const BODY_BOX: Box = { x: -112, y: 80, w: 224, h: 240 };
/** Frames of boiling smoke (more than play's 8: a peel is seen up close, still, so the boil is finer). */
const BODY_FRAMES = 12;
const BODY_STEP = 0.1;
/** The armour's box (mock frame): the head-wrap above the mask down to the lamellar's lowest plate. */
const ARMOUR_BOX: Box = { x: -128, y: -44, w: 256, h: 300 };

registerPeelStyle('immortal', {
  draw(ctx, art, _p: Pose, o) {
    if (o.emissive || o.heat) return;
    // the peel's body is its parts (the smoke, the toes, the armour, in that order: they stack as the still does)
    if (!o.live) drawImmortal(ctx, art);
  },
  contactY: IMM.contactY,
  halfWidth: 82,
  parts: {
    smoke: mockPart(IMM, BODY_BOX, BODY_FRAMES, (ctx, i, art) => smokeBody(ctx, i * BODY_STEP, immortalLook(art))),
    toes: mockPart(IMM, IMM_TOE_BOX, CURLS.length, (ctx, i, art) => immortalToes(ctx, immortalLook(art), pose({ curl: CURLS[i] }))),
    armour: mockPart(IMM, ARMOUR_BOX, 1, (ctx, _i, art) => immortalArmour(ctx, immortalLook(art))),
  },
});

interface ImmState {
  back: WorldEmitter;
  front: WorldEmitter;
  light: WorldEmitter;
  flash: WorldEmitter;
  toes: Toes;
  t: number;
  /** A smack's hard boil (1 → 0). */
  boil: number;
  /** Seconds to the next glint off the mask. */
  glint: number;
}

/** Where the chrome mask catches the light (mock frame): the brow ridges, the cheekbones, the nose. */
const MASK_GLINTS: [number, number][] = [
  [-40, 40],
  [38, 44],
  [-58, 110],
  [56, 112],
  [0, 96],
  [-20, 150],
  [22, 150],
];

registerPeelLive<ImmState>('immortal', {
  setup(k) {
    return { back: smokeEm(k, true), front: smokeEm(k, false), light: lightEm(k), flash: flashEm(k), toes: new Toes(1.2), t: R() * 10, boil: 0, glint: 0.5 + R() };
  },
  tick(k, dt, st) {
    const c = calm();
    const landed = k.landed;
    st.boil = Math.max(0, st.boil - dt * 1.4);
    if (landed) st.boil = 1;
    st.t += dt * (1 + st.boil * 1.6) * (0.5 + 0.5 * c);
    // the body boils: back and forth through its frames, each cross-fading into the next
    const span = BODY_FRAMES - 1;
    const m = (st.t / BODY_STEP) % (span * 2);
    frameAt(k, 'smoke', m < span ? m : span * 2 - m);
    frameAt(k, 'toes', st.toes.update(dt, landed));
    const { back, front } = st;
    const boost = 1 + st.boil * 3;
    // smoke curls off the toes and pours from under the armour, thin and see-through
    back.rate('toe', 7 * boost, dt, () => {
      const T = TOES[Math.floor(R() * 5)];
      const ang = Math.PI * (0.1 + R() * 0.8);
      puff(k, back, IMM, T[0] + Math.cos(ang) * T[2], T[1] + Math.sin(ang) * T[3], pm() * 30, -20 - R() * 30, 1 + R() * 0.6, 8, 26, 0.42 * c);
    });
    back.rate('arch', 3 * boost, dt, () => {
      const px = pm() * 150;
      puff(k, back, IMM, px, MASK.my + gorgetBottom(px) * MASK.ms - 4, pm() * 20, -10 - R() * 20, 0.9 + R() * 0.4, 7, 20, 0.36 * c);
    });
    // the face: smoke streams from the eye holes and the mouth, its signature
    for (const s of [-1, 1]) {
      front.rate(s < 0 ? 'eyeL' : 'eyeR', 6 * boost, dt, () => {
        const px = s * MASK_HOLES.eyeX * MASK.ms + pm() * 12;
        const py = MASK.my + MASK_HOLES.eyeY * MASK.ms + pm() * 5;
        puff(k, front, IMM, px, py, s * (50 + R() * 60), -50 - R() * 50, 1.3 + R() * 0.6, 5, 28, 0.55 * c);
      });
    }
    front.rate('mouth', 3 * boost, dt, () => {
      puff(k, front, IMM, pm() * 50 * MASK.ms, MASK.my + MASK_HOLES.mouthY * MASK.ms, pm() * 60, -30 - R() * 30, 1.1 + R() * 0.5, 5, 24, 0.48 * c);
    });
    // the chrome catches the light now and then: a glint runs over a ridge of the mask
    st.glint -= dt;
    if (st.glint <= 0) {
      st.glint = 0.7 + R() * 1.4;
      const [gx, gy] = MASK_GLINTS[Math.floor(R() * MASK_GLINTS.length)];
      light(k, st.light, IMM, gx, MASK.my + gy * MASK.ms, 0, 0, 0.45, 9, 3, 0.9 * c, CHROME);
    }
    if (landed) {
      // a smack: the chrome flashes (glints all over the mask), the eyes and mouth blast smoke, a ring of smoke bursts out
      for (const [gx, gy] of MASK_GLINTS) light(k, st.light, IMM, gx + pm() * 10, MASK.my + gy * MASK.ms, pm() * 40, pm() * 40, 0.35 + R() * 0.2, 24, 6, 1, CHROME);
      light(k, st.flash, IMM, 0, MASK.my + 95 * MASK.ms, 0, 0, 0.3, 60, 95, 0.75, 0xcfe0ff);
      for (let n = k.burst(16); n-- > 0; ) {
        const ang = R() * Math.PI * 2;
        const d = 60 + R() * 60;
        puff(k, R() < 0.5 ? back : front, IMM, Math.cos(ang) * d, 150 + Math.sin(ang) * d * 0.8, Math.cos(ang) * 160, Math.sin(ang) * 110 - 40, 0.8 + R() * 0.5, 14, 46, 0.55 * c);
      }
      for (const s of [-1, 1])
        for (let n = 0; n < 4; n++) puff(k, front, IMM, s * MASK_HOLES.eyeX * MASK.ms, MASK.my + MASK_HOLES.eyeY * MASK.ms, s * (140 + R() * 120), -60 - R() * 80, 0.7 + R() * 0.3, 8, 30, 0.6 * c);
    }
  },
});

// ════════════════════════════ the Immortal Brute ════════════════════════════

const LID_FRAMES = 8;
/** Pre-drawn jaw openings per cut (0 clenched … 1 gaping). */
const JAW_FRAMES = 8;

registerPeelStyle('immortalbrute', {
  draw(ctx, art, _p: Pose, o) {
    if (o.emissive || o.heat) return;
    // live: the hide, the socket, the lid's shadow and the iron band (the eye, the cuts and the toes are parts)
    if (o.live) bruteBody(ctx, art);
    else drawBrute(ctx, art);
  },
  contactY: BRUTE.contactY,
  halfWidth: 112,
  parts: {
    iris: mockPart(BRUTE, IRIS_BOX, 1, (ctx) => bruteIris(ctx, 0)),
    lids: mockPart(BRUTE, LID_BOX, LID_FRAMES, (ctx, i, art) => bruteLids(ctx, bruteHideColour(art), i / (LID_FRAMES - 1))),
    ...Object.fromEntries(
      CUTS.map((c, n) => {
        const b = cutBox(c);
        // room under the box for the drool hanging off the cut's lower end
        const box = { ...b, h: b.h + 34 };
        return [`cut${n}`, mockPart(BRUTE, box, JAW_FRAMES, (ctx, j, art) => {
          const o = j / (JAW_FRAMES - 1);
          bruteCut(ctx, c, bruteHideColour(art), o);
          stillDrool(ctx, c, o);
        })];
      }),
    ),
    toes: mockPart(BRUTE, { ...BRUTE_TOE_BOX, y: BRUTE_TOE_BOX.y - 10, h: BRUTE_TOE_BOX.h + 10 }, CURLS.length, (ctx, i, art) => bruteToes(ctx, bruteHideColour(art), pose({ curl: CURLS[i] }))),
  },
});

const CUT_AX = CUTS.map(cutAxes);

interface Jaw {
  o: number;
  v: number;
  ph: number;
  rate: number;
  peak: number;
  drip: number;
}

interface BruteState {
  smoke: WorldEmitter;
  drool: WorldEmitter;
  light: WorldEmitter;
  flash: WorldEmitter;
  toes: Toes;
  jaws: Jaw[];
  /** Since the last smack (a snap shut, then a roar). */
  roar: number;
}

/** Where a cut's jaws want to be: a slow chew (open, snap shut, grind), and after a smack a snap shut and a roar. */
function jawTarget(j: Jaw, st: BruteState, dt: number, c: number): number {
  if (st.roar < 0.06) return 0;
  if (st.roar < 0.75) return 1;
  j.ph += dt * j.rate * (0.5 + 0.5 * c);
  const u = j.ph % 1;
  if (u < 0.02) j.peak = (0.45 + R() * 0.45) * (0.6 + 0.4 * c);
  if (u < 0.6) return 0.08 + (j.peak - 0.08) * Math.sin((u / 0.6) * Math.PI * 0.5);
  if (u < 0.68) return 0;
  return 0.04 + 0.04 * Math.sin(u * 60);
}

registerPeelLive<BruteState>('immortalbrute', {
  blink: { iris: { every: 3.4, look: 9 }, lids: { every: 3.4, look: 0 } },
  setup(k) {
    return {
      smoke: smokeEm(k, false),
      drool: k.emitter({ frame: 'drop', drag: 0.4, max: 30 }),
      light: lightEm(k),
      flash: flashEm(k),
      toes: new Toes(1.2),
      jaws: CUTS.map(() => ({ o: 0.3, v: 0, ph: R(), rate: 0.75 + R() * 0.3, peak: 0.6, drip: 0.4 + R() * 1.5 })),
      roar: 9,
    };
  },
  tick(k, dt, st) {
    const c = calm();
    const landed = k.landed;
    if (landed) st.roar = 0;
    st.roar += dt;
    frameAt(k, 'toes', st.toes.update(dt, landed));
    const u = BRUTE.k * k.f.type.scale;
    st.jaws.forEach((j, n) => {
      // a spring: a snap shut bounces
      const to = jawTarget(j, st, dt, c);
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / steps;
      for (let q = 0; q < steps; q++) {
        j.v += (-(j.o - to) * 300 - j.v * 11) * h;
        j.o += j.v * h;
      }
      const o = Math.max(0, Math.min(1, j.o));
      frameAt(k, `cut${n}`, o * (JAW_FRAMES - 1));
      // smoke seeps out of the cut while it's open
      const ax = CUT_AX[n];
      st.smoke.rate(`cut${n}`, 2 + o * 4, dt, () => {
        const [mx, my] = cutPt(ax, pm() * ax.L * 0.8, 0);
        puff(k, st.smoke, BRUTE, mx, my, pm() * 40, -40 - R() * 40, 1 + R() * 0.5, 5, 22, 0.42 * c);
      });
      // drool drops off the lower end now and then (a smack flings it)
      j.drip -= dt;
      if (j.drip <= 0 || landed) {
        j.drip = 1.2 + R() * 2.2;
        const uu = cutLowEnd(ax) * 0.72;
        const [, b] = cutLips(CUTS[n], ax, uu, o);
        const [mx, my] = cutPt(ax, uu, b);
        const [dx, dy] = md(BRUTE, mx, my + 30);
        for (let q = landed ? 3 : 1; q-- > 0; )
          st.drool.emit(dx + pm() * 4, dy, { vx: (landed ? pm() * 260 : pm() * 10) * u, vy: (landed ? -120 - R() * 160 : 20) * u, life: 0.7, r0: 4.2 * u, r1: 3.2 * u, a: 0.95, tint: INK, grav: 900 * u, fade: 0.1 });
      }
    });
    // smoke seeps from round the eye
    const { y, w, h } = EYE;
    st.smoke.rate('eye', 8, dt, () => {
      const ang = R() * Math.PI * 2;
      const px = Math.cos(ang) * w * 0.5;
      const py = y + Math.sin(ang) * h * 0.45;
      puff(k, st.smoke, BRUTE, px, py, px * 0.3 + pm() * 16, -50 - R() * 40, 1.1 + R() * 0.5, 5, 24, 0.42 * c);
    });
    // a red glint in the eye now and then (light, not a smear)
    st.smoke.rate('glow', 0.6, dt, () => light(k, st.light, BRUTE, pm() * 16, y, 0, 0, 0.5, 6, 14, 0.7 * c, EYE_RED));
    if (landed) {
      // a smack: the eye flashes red-hot, the jaws snap and roar (above), smoke coughs out of the cuts
      light(k, st.flash, BRUTE, 0, y, 0, 0, 0.36, 70, 120, 0.9, EYE_RED);
      light(k, st.flash, BRUTE, 0, y, 0, 0, 0.22, 30, 55, 0.9, 0xffd8b0);
      for (let n = 0; n < 8; n++) {
        const a = (n / 8) * Math.PI * 2 + R() * 0.4;
        light(k, st.light, BRUTE, Math.cos(a) * 30, y + Math.sin(a) * 16, Math.cos(a) * 260, Math.sin(a) * 200, 0.35 + R() * 0.15, 8, 2, 1, n % 2 ? EYE_RED : 0xffd0a0);
      }
      for (let n = k.burst(10); n-- > 0; ) {
        const ax = CUT_AX[n % 2];
        const [mx, my] = cutPt(ax, pm() * ax.L, 0);
        puff(k, st.smoke, BRUTE, mx, my, pm() * 180, -80 - R() * 120, 0.7 + R() * 0.4, 10, 34, 0.55 * c);
      }
    }
  },
});
