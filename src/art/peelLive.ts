// Living foot peels: a foot, boss or mini-boss peel whose head is a redrawn foot (src/art/style) moves the way the
// foot does in play (src/game/liveKit.ts), adapted to a peel: its emissive glow pulses, its eyes blink and look
// about, sway parts sway, its toes wiggle or curl now and then (and splay when a smack lands), boss metal shimmers
// with heat, shiny foil twinkles, and the foot's own emitters and critters (embers, steam, bubbles, smoke, flies)
// come along, sized to the peel.
//
// It is all built generically from the foot's live def and style:
// - the rig (PeelRig): the peel cut into layers in the peel's own frame (220×360 units, the handle and the hilt,
//   the foot's body without its live parts, the toe band's pose frames, each part's frames, the glow and heat
//   layers), drawn straight from the style at the peel's size, flipped toes-up and finished with the peel's pattern
//   and foil exactly as the still is (src/art/peelArt.ts). Built a step at a time in idle time and shared by every
//   place the peel shows (the locker's canvases and the cursor peel's texture: src/game/peelLivePlay.ts).
// - the motion (PeelLive): one per place it shows. The foot's own def runs against a stand-in for its live foot
//   (setup and tick, so each foot's emitters and critters come along with no per-foot code); what it emits lands in
//   the peel's world (the peel's frame in the locker, the play field in a run) at the peel's scale.
// Everything cosmetic uses crand(). Only drawn while animated peels are on (Settings → Graphics).

import { FOOT_FRAME, styledCanvas } from './feetArt';
import { CX } from './feetCommon';
import { pose, type Pose } from './style/kit';
import { styleFor, type StyleDef } from './style/registry';
import { makeCanvas, type Ctx } from './util';
import { PEEL_H, PEEL_W, drawFootHilt, drawInFootHead, drawPeelHandle, finishFootLayer, footHeadPlace, footHeadShadow, footSparkles, sparkleStar, type PeelLook } from './peelArt';
import { FOOT_BY_ID, type FootType } from '../data/feet';
import { footMeta } from '../game/assets';
import { PARTS_BEHIND, PEEL_BY_ID, footCrop } from '../game/peels';
import { FX_FRAMES, FX_R, WIGGLE_N, fxAtlasCanvas, liveDefOf, noise1, wigglePose, type CritterOpts, type EmitterOpts, type FxFrame, type LiveDef } from '../game/liveKit';
import { crand } from '../systems/cosmeticRandom';
import { save } from '../systems/save';

// ════════════════════════════ the rig ════════════════════════════

/** A picture in the peel's frame: its canvas (RR px per peel unit) and where its top-left sits (peel units). */
export interface Layer {
  c: HTMLCanvasElement;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RigPart {
  name: string;
  frames: Layer[];
  kind: 'sway' | 'blink' | 'twitch' | 'still';
  /** Sway: the point it swings round (peel units). */
  px: number;
  py: number;
  sway?: NonNullable<LiveDef['sway']>[string];
  /** Blink: how far its look reaches (peel units) and how often it blinks. */
  look: number;
  every: number;
  /** Drawn under the body (a tail behind the foot). */
  below: boolean;
}

/** The toe band's curl track on a peel (fewer poses than play: it only flexes now and then). */
const CURL = [-1, -0.5, 0, 0.5, 1];

export interface PeelRig {
  id: string;
  type: FootType;
  def: LiveDef;
  look: PeelLook;
  /** Canvas pixels per peel unit. */
  RR: number;
  /** Peel units per design unit, and design → peel. */
  D: number;
  flip: boolean;
  map(dx: number, dy: number): [number, number];
  /** The handle, the shadow and the body without its live parts or toe band. */
  base: Layer;
  hilt: Layer;
  /** The toe band's poses: CURL first, then the wiggle cycle (when the foot wiggles). */
  band: Layer[];
  wiggle: boolean;
  parts: RigPart[];
  glow?: Layer;
  heat?: Layer;
  /** Shiny peels: each sparkle of the foil on its own, cut to the foot (they twinkle). */
  sparkles: (Layer & { cx: number; cy: number })[];
  /** Unique key prefix for textures made from it. */
  key: string;
}

/** The foot an animated peel shows, if its head is a redrawn foot with a live def. */
export function liveFootOf(peelId: string): FootType | null {
  const d = PEEL_BY_ID[peelId];
  if (!d || !(d.group === 'foot' || d.group === 'boss' || d.group === 'shinyFoot')) return null;
  const fid = d.foot ?? peelId.slice(peelId.indexOf(':') + 1);
  const type = FOOT_BY_ID[fid];
  // (no footMeta read here: with art drawn lazily that would draw the foot just to ask; 3 s over every peel)
  if (!type || !styleFor(fid) || !liveDefOf(fid)) return null;
  return type;
}

/** Can this peel come alive (a redrawn foot's peel)? */
export function hasPeelLive(peelId: string): boolean {
  return !!liveFootOf(peelId);
}

/** A canvas drawn in design space at `sc` px per unit, whose pixel (0, 0) is design (ox, oy), as a layer in the
 * peel's frame: flipped toes-up as the head is, then given the peel's pattern and foil. */
function toLayer(src: HTMLCanvasElement, ox: number, oy: number, sc: number, rig: Pick<PeelRig, 'RR' | 'D' | 'flip' | 'map' | 'look'>, finish = true): Layer {
  const [c, ctx] = makeCanvas(src.width, src.height);
  const [x, y0] = rig.map(ox, oy);
  let y = y0;
  if (rig.flip) {
    // the design's top row becomes the layer's bottom
    y = y0 - src.height / sc * rig.D;
    ctx.save();
    ctx.translate(0, src.height);
    ctx.scale(1, -1);
    ctx.drawImage(src, 0, 0);
    ctx.restore();
  } else ctx.drawImage(src, 0, 0);
  if (finish) {
    ctx.setTransform(rig.RR, 0, 0, rig.RR, -x * rig.RR, -y * rig.RR);
    finishFootLayer(c, ctx, rig.look, false);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  return { c, x, y, w: c.width / rig.RR, h: c.height / rig.RR };
}

/** A layer cut down to its drawn pixels (and a pixel round them): smaller, and no blank edges to composite. */
function trimLayer(l: Layer, RR: number): Layer {
  const { width: w, height: h } = l.c;
  const d = l.c.getContext('2d')!.getImageData(0, 0, w, h).data;
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (d[(y * w + x) * 4 + 3]) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 < 0) return { c: makeCanvas(1, 1)[0], x: l.x, y: l.y, w: 1 / RR, h: 1 / RR };
  x0 = Math.max(0, x0 - 1);
  y0 = Math.max(0, y0 - 1);
  x1 = Math.min(w - 1, x1 + 1);
  y1 = Math.min(h - 1, y1 + 1);
  const [c, ctx] = makeCanvas(x1 - x0 + 1, y1 - y0 + 1);
  ctx.drawImage(l.c, -x0, -y0);
  return { c, x: l.x + x0 / RR, y: l.y + y0 / RR, w: c.width / RR, h: c.height / RR };
}

/** Build a peel's rig, one canvas per step (rigs are built in idle time: requestRig). */
function* rigSteps(peelId: string, type: FootType, RR: number): Generator<void, PeelRig | null> {
  const def = liveDefOf(type.id)!;
  const st: StyleDef = styleFor(type.id)!;
  const look = PEEL_BY_ID[peelId].look();
  const crop = footCrop(type.id);
  if (!look.footArt || !crop) return null;
  const p = footHeadPlace(look);
  const sTex = type.scale * footMeta[type.id].textures.res;
  const D = sTex * p.k;
  const flip = p.flip;
  const sg = flip ? -1 : 1;
  const ax = PEEL_W / 2 - p.w / 2 + p.dx + (FOOT_FRAME.padX * sTex - crop.x) * p.k;
  const by = p.bottom - p.h / 2 + sg * (-p.h / 2 + (FOOT_FRAME.padY * sTex - crop.y) * p.k);
  const map = (dx: number, dy: number): [number, number] => [ax + D * dx, by + sg * D * dy];
  const sc = D * RR;
  const base0 = { RR, D, flip, map, look };
  const padX = FOOT_FRAME.padX;
  const padY = FOOT_FRAME.padY;
  // the body without its live parts, cut off below the toe band (the band's frames draw the rest)
  const body = styledCanvas(type, pose({}), { live: true }, undefined, sc);
  if (st.rig) {
    const bx = body.getContext('2d')!;
    bx.setTransform(1, 0, 0, 1, 0, 0);
    bx.clearRect(0, Math.floor((st.rig.to + padY) * sc), body.width, body.height);
  }
  const bodyL = toLayer(body, -padX, -padY, sc, base0);
  yield;
  // the base: handle, the whole foot's soft shadow (from the still art), then the body
  const [bc, bctx] = makeCanvas(PEEL_W * RR, PEEL_H * RR);
  bctx.scale(RR, RR);
  drawPeelHandle(bctx, look);
  const [t, tctx] = makeCanvas(PEEL_W, PEEL_H);
  drawInFootHead(tctx, look.footArt, p, look.footArt.width, look.footArt.height);
  footHeadShadow(bctx, t, RR);
  bctx.drawImage(bodyL.c, bodyL.x, bodyL.y, bodyL.w, bodyL.h);
  const baseL: Layer = { c: bc, x: 0, y: 0, w: PEEL_W, h: PEEL_H };
  // the hilt, on top of everything (a toe band or a glow never covers it)
  const hy0 = p.bottom - 16;
  const [hc, hctx] = makeCanvas(PEEL_W * RR, 42 * RR);
  hctx.setTransform(RR, 0, 0, RR, 0, -hy0 * RR);
  drawFootHilt(hctx, look, p);
  const hiltL: Layer = { c: hc, x: 0, y: hy0, w: PEEL_W, h: 42 };
  yield;
  // the toe band's poses
  const band: Layer[] = [];
  let still: HTMLCanvasElement | undefined;
  if (st.rig) {
    const { from, to } = st.rig;
    const y1 = FOOT_FRAME.h - padY;
    const lead = 40;
    const poses: Pose[] = [...CURL.map((c) => pose({ curl: c })), ...(def.wiggle ? Array.from({ length: WIGGLE_N }, (_, k) => wigglePose(k)) : [])];
    for (const ps of poses) {
      const full = styledCanvas(type, ps, { live: true }, { y0: from - lead, y1 }, sc);
      const [c, ctx] = makeCanvas(full.width, (y1 - from) * sc);
      ctx.drawImage(full, 0, -lead * sc);
      if (def.glow || def.heat) {
        if (!still) {
          still = makeCanvas(c.width, c.height)[0];
          still.getContext('2d')!.drawImage(c, 0, 0);
        } else {
          const x = still.getContext('2d')!;
          x.globalCompositeOperation = 'destination-in';
          x.drawImage(c, 0, 0);
        }
      }
      ctx.globalCompositeOperation = 'destination-in';
      const g = ctx.createLinearGradient(0, 0, 0, (to - from) * sc);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, c.width, c.height);
      band.push(trimLayer(toLayer(c, -padX, from, sc, base0), RR));
      yield;
    }
  }
  // parts: sway parts hang from their pivots; blinking, twitching and still ones sit in their boxes
  const parts: RigPart[] = [];
  for (const [name, part] of Object.entries(st.parts ?? {})) {
    const frames = Array.from({ length: part.frames }, (_, i) => {
      const [c, ctx] = makeCanvas(part.box.w * sc, part.box.h * sc);
      ctx.scale(sc, sc);
      ctx.translate(-part.box.x, -part.box.y);
      part.draw(ctx, type.art, i);
      return toLayer(c, part.box.x, part.box.y, sc, base0);
    });
    const sw = def.sway?.[name];
    const bl = def.blink?.[name];
    const tw = def.twitch?.[name];
    const [px, py] = map(...(part.pivot ?? [part.box.x, part.box.y]));
    parts.push({
      name,
      frames,
      kind: sw ? 'sway' : bl ? 'blink' : tw ? 'twitch' : 'still',
      px,
      py,
      sway: sw,
      look: (bl?.look ?? 0) * D,
      every: bl?.every ?? tw?.every ?? 3.5,
      below: !!sw?.below || (!!sw && PARTS_BEHIND.has(type.id)),
    });
    yield;
  }
  // glow and heat are drawn at rest: in the toe band they keep only where every pose covers the art (`still`), so
  // they never show a second set of toes (as in play)
  const offBand = (c: HTMLCanvasElement) => {
    if (!st.rig) return c;
    const ctx = c.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const y0 = Math.round((st.rig.from + padY) * sc);
    if (still) {
      const [b, bx] = makeCanvas(c.width, Math.max(1, c.height - y0));
      bx.drawImage(c, 0, -y0);
      bx.globalCompositeOperation = 'destination-in';
      bx.drawImage(still, 0, 0);
      ctx.clearRect(0, y0, c.width, c.height - y0);
      ctx.drawImage(b, 0, y0);
    }
    return c;
  };
  let glow: Layer | undefined;
  let heat: Layer | undefined;
  if (def.glow) {
    glow = trimLayer(toLayer(offBand(styledCanvas(type, pose({ heat: 0 }), { live: true, emissive: true }, undefined, sc)), -padX, -padY, sc, base0, false), RR);
    yield;
  }
  if (def.heat) {
    heat = trimLayer(toLayer(offBand(styledCanvas(type, pose({ heat: 1 }), { live: true, heat: true }, undefined, sc)), -padX, -padY, sc, base0, false), RR);
    yield;
  }
  // shiny: the foil's sparkles one by one, each cut to the foot's shape
  const sparkles: PeelRig['sparkles'] = [];
  if (look.shiny) {
    for (const [x, y, r] of footSparkles(look)) {
      const R0 = r * 1.6;
      const [c, ctx] = makeCanvas(R0 * 2 * RR, R0 * 2 * RR);
      ctx.setTransform(RR, 0, 0, RR, -(x - R0) * RR, -(y - R0) * RR);
      // a soft halo and the star, then cut to the foot
      const g = ctx.createRadialGradient(x, y, 0, x, y, R0);
      g.addColorStop(0, 'rgba(255,255,255,0.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - R0, y - R0, R0 * 2, R0 * 2);
      ctx.fillStyle = '#ffffff';
      sparkleStar(ctx, x, y, r);
      ctx.fill();
      ctx.globalCompositeOperation = 'destination-in';
      ctx.drawImage(t, 0, 0);
      sparkles.push({ c, x: x - R0, y: y - R0, w: R0 * 2, h: R0 * 2, cx: x, cy: y });
    }
  }
  return { id: peelId, type, def, look, RR, D, flip, map, base: baseL, hilt: hiltL, band, wiggle: !!def.wiggle, parts, glow, heat, sparkles, key: `pl_${peelId.replace(/[^a-z0-9]/gi, '_')}_${RR}` };
}

// ——— building in idle time, shared ———

const rigs = new Map<string, PeelRig | null>();
const RIG_CAP = 48;
interface Job {
  key: string;
  gen: Generator<void, PeelRig | null>;
  waiters: { done: (r: PeelRig | null) => void; wanted: () => boolean }[];
}
const jobs: Job[] = [];
let pumping = false;

const idle = (fn: (d?: IdleDeadline) => void) => {
  if (typeof requestIdleCallback === 'function') requestIdleCallback(fn, { timeout: 120 });
  else setTimeout(() => fn(), 16);
};

function pump(d?: IdleDeadline): void {
  try {
    pumpSteps(d);
  } finally {
    // (whatever a waiter did, the queue keeps going)
    if (jobs.length) idle(pump);
    else pumping = false;
  }
}

function pumpSteps(d?: IdleDeadline): void {
  const t0 = performance.now();
  // a step costs a few ms (the foot drawn once, small): take a few while the frame has room
  const budget = () => (d && !d.didTimeout ? d.timeRemaining() > 4 : performance.now() - t0 < 10);
  while (jobs.length && budget()) {
    const job = jobs[0];
    // nobody waits for it any more (the tile scrolled away, the locker closed): drop it for now
    job.waiters = job.waiters.filter((w) => w.wanted());
    if (!job.waiters.length) {
      jobs.shift();
      continue;
    }
    let r: IteratorResult<void, PeelRig | null>;
    try {
      r = job.gen.next();
    } catch (e) {
      if (import.meta.env?.DEV) console.error('[peelLive] building', job.key, e);
      r = { done: true, value: null };
    }
    if (r.done) {
      jobs.shift();
      keep(job.key, r.value);
      for (const w of job.waiters) {
        try {
          w.done(r.value);
        } catch (e) {
          if (import.meta.env?.DEV) console.error('[peelLive] starting', job.key, e);
        }
      }
    }
  }
}

function keep(key: string, rig: PeelRig | null): void {
  rigs.delete(key);
  rigs.set(key, rig);
  // the oldest go first (anything still showing keeps its own reference)
  while (rigs.size > RIG_CAP) rigs.delete(rigs.keys().next().value!);
}

/**
 * A peel's rig, built in idle time (null when the peel can't come alive). `wanted` is asked before each step: when
 * nothing wants it any more, the build stops. `urgent` puts it at the front of the queue (the big preview).
 */
export function requestRig(peelId: string, done: (r: PeelRig | null) => void, wanted: () => boolean = () => true, urgent = false, RR = 1): void {
  const key = `${peelId}@${RR}`;
  if (rigs.has(key)) {
    const r = rigs.get(key)!;
    // keep it fresh in the cache
    keep(key, r);
    done(r);
    return;
  }
  const type = liveFootOf(peelId);
  if (!type) return done(null);
  let job = jobs.find((j) => j.key === key);
  if (!job) {
    job = { key, gen: rigSteps(peelId, type, RR), waiters: [] };
    if (urgent) jobs.unshift(job);
    else jobs.push(job);
  } else if (urgent && jobs[0] !== job) {
    jobs.splice(jobs.indexOf(job), 1);
    jobs.unshift(job);
  }
  job.waiters.push({ done, wanted });
  if (!pumping) {
    pumping = true;
    idle(pump);
  }
}

/** Build a rig now (dev tools and tests). */
export function rigNow(peelId: string, RR = 1): PeelRig | null {
  const key = `${peelId}@${RR}`;
  if (rigs.has(key)) return rigs.get(key)!;
  const type = liveFootOf(peelId);
  if (!type) return null;
  const gen = rigSteps(peelId, type, RR);
  for (;;) {
    const r = gen.next();
    if (r.done) {
      keep(key, r.value);
      return r.value;
    }
  }
}

// ════════════════════════════ the motion ════════════════════════════

/** Where a living peel's particles live: the peel's frame → its world, and world units per peel unit. In the locker
 * the world is the peel's frame; in a run it is the play field, so what it sheds trails behind it. */
export interface PeelWorld {
  toWorld(lx: number, ly: number): [number, number];
  scale(): number;
}
export const PEEL_FRAME_WORLD: PeelWorld = { toWorld: (x, y) => [x, y], scale: () => 1 };

/** Particles a little bigger than the foot's own, scaled down, so they still read on a small peel. */
const SIZE_BOOST = 1.3;
/** How much of the foot's emission a peel sheds (it's smaller). */
const RATE = 0.6;
const PMAX = 72;

/** A pool of the foot's particles (its emitters' frames and tints), in world space. */
export class PeelBits {
  n = PMAX;
  x = new Float32Array(PMAX);
  y = new Float32Array(PMAX);
  vx = new Float32Array(PMAX);
  vy = new Float32Array(PMAX);
  age = new Float32Array(PMAX).fill(9);
  life = new Float32Array(PMAX).fill(1);
  r0 = new Float32Array(PMAX);
  r1 = new Float32Array(PMAX);
  a = new Float32Array(PMAX);
  fade = new Float32Array(PMAX);
  rot = new Float32Array(PMAX);
  spin = new Float32Array(PMAX);
  grav = new Float32Array(PMAX);
  sd = new Float32Array(PMAX);
  /** World units per foot pixel for this particle (the curl is in the foot's units). */
  kw = new Float32Array(PMAX);
  tint = new Uint32Array(PMAX);
  /** Which emitter it came from (its frame, blend, curl, drag, layer). */
  em = new Uint8Array(PMAX);
  next = 0;
  t = 0;

  constructor(readonly emitters: EmitterOpts[]) {}

  get alive(): number {
    let n = 0;
    for (let i = 0; i < this.n; i++) if (this.age[i] < this.life[i]) n++;
    return n;
  }

  tick(dt: number): void {
    this.t += dt;
    for (let i = 0; i < this.n; i++) {
      if (this.age[i] >= this.life[i]) continue;
      this.age[i] += dt;
      const o = this.emitters[this.em[i]];
      if (o.curl) this.vx[i] += noise1(this.sd[i] + this.t * 1.6) * o.curl * this.kw[i] * dt;
      this.vy[i] += this.grav[i] * dt;
      const drag = 1 - (o.drag ?? 1.2) * dt;
      this.vx[i] *= drag;
      this.vy[i] *= drag;
      this.x[i] += this.vx[i] * dt;
      this.y[i] += this.vy[i] * dt;
      this.rot[i] += this.spin[i] * dt;
    }
  }

  /** A particle's look now: radius (world units) and alpha, or null when gone. */
  shape(i: number): [number, number] | null {
    if (this.age[i] >= this.life[i]) return null;
    const t = this.age[i] / this.life[i];
    const a = this.a[i] * Math.min(1, t / Math.max(0.01, this.fade[i])) * (1 - t) * (1 - t * 0.3);
    if (a <= 0.01) return null;
    return [this.r0[i] + (this.r1[i] - this.r0[i]) * Math.sqrt(t), a];
  }
}

/** A critter orbiting the peel (flies, bats, wisps), in the peel's frame. */
export interface PeelCritter {
  sheet: string;
  frames: number;
  ph: number;
  sp: number;
  r: number;
  tilt: number;
  sd: number;
  x: number;
  y: number;
  rot: number;
  /** Size (peel units per sheet pixel), in front of the peel this frame, and how near (−1 far … 1 near). */
  s: number;
  front: boolean;
  depth: number;
  frame: number;
  o: CritterOpts;
  cx: number;
  cy: number;
}

/** Critter sheets made by defs (k.sheet), shared by every place they show. */
export const SHEETS = new Map<string, HTMLCanvasElement[]>();

/** A Phaser-free stand-in for anything a def reaches for that a peel doesn't have (its own sprites and tweens):
 * every property is itself, calling it gives itself, it counts as 0 and iterates as empty. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const NULL: any = new Proxy(function () {}, {
  get(_t, p) {
    if (p === Symbol.toPrimitive) return () => 0;
    if (p === Symbol.iterator) return function* () {};
    if (p === 'then') return undefined;
    if (p === 'length') return 0;
    return NULL;
  },
  apply: () => NULL,
  construct: () => NULL,
  set: () => true,
  has: () => false,
});

/** An object whose missing properties are NULL. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lenient = <T extends object>(o: T): T => new Proxy(o, { get: (t, p) => (p in t ? (t as any)[p] : NULL) });

const reduced = () => !!save.settings.reducedMotion;

/**
 * A def's own sprite on the foot (a spur's rowel, a skate's wheels, Medusa's snakes, a harpy's wings): what the def
 * makes with k.sc.add.image and hangs on the foot with f.addLiveArt, in the foot's local frame. Its sheet is one the
 * def made with k.sheet; the def turns, swaps and fades it as it would in play, and the peel draws it in place.
 */
export class PeelSprite {
  x: number;
  y: number;
  rotation = 0;
  scaleX = 1;
  scaleY = 1;
  originX = 0.5;
  originY = 0.5;
  alpha = 1;
  visible = true;
  frame = 0;
  additive = false;
  below = false;
  constructor(x: number, y: number, readonly key: string, frame: unknown) {
    this.x = Number(x) || 0;
    this.y = Number(y) || 0;
    this.setFrame(frame);
  }
  get angle(): number {
    return (this.rotation * 180) / Math.PI;
  }
  set angle(a: number) {
    this.rotation = (a * Math.PI) / 180;
  }
  setOrigin(x = 0.5, y = x): this {
    this.originX = x;
    this.originY = y;
    return this;
  }
  setScale(x = 1, y = x): this {
    this.scaleX = x;
    this.scaleY = y;
    return this;
  }
  setFrame(f: unknown): this {
    this.frame = Math.max(0, Math.floor(Number(f) || 0));
    return this;
  }
  setRotation(r = 0): this {
    this.rotation = r;
    return this;
  }
  setAngle(a = 0): this {
    this.angle = a;
    return this;
  }
  setAlpha(a = 1): this {
    this.alpha = a;
    return this;
  }
  setVisible(v: boolean): this {
    this.visible = v;
    return this;
  }
  setPosition(x = 0, y = x): this {
    this.x = x;
    this.y = y;
    return this;
  }
  setBlendMode(m: unknown): this {
    // Phaser.BlendModes.ADD is 1
    this.additive = m === 1 || m === 'ADD';
    return this;
  }
}

/** A PeelSprite whose other setters (tint, depth…) chain and do nothing. */
function spriteShim(sp: PeelSprite): PeelSprite {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const px: any = new Proxy(sp, { get: (t, p) => (p in t ? (t as any)[p] : typeof p === 'string' && p.startsWith('set') ? () => px : NULL) });
  return px;
}

/** One place a living peel shows (a locker canvas, the cursor peel). */
export class PeelLive {
  t = crand() * 10;
  bits: PeelBits;
  critters: PeelCritter[] = [];
  /** The def's own sprites on the foot (see PeelSprite). */
  sprites: PeelSprite[] = [];
  /** Toe band frame shown (index into rig.band), or -1 without one. */
  band = -1;
  /** Per part: frame, offset (peel units) and swing (radians, peel space). */
  pf: Int16Array;
  pox: Float32Array;
  poy: Float32Array;
  prot: Float32Array;
  glowA = 0;
  heatA = 0;
  sparkA: Float32Array;
  private emitters: EmitterOpts[] = [];
  private acc: Record<string, number> = {};
  private k: unknown;
  private state: unknown;
  private failed = false;
  // toes: what they're doing, for how long
  private toe: 'rest' | 'wiggle' | 'curl' | 'splay' = 'rest';
  private toeT = 0;
  private toeNext = 1 + crand() * 2.5;
  private curl = 0;
  private wigT = 0;
  // eyes
  private lookX = 0;
  private lookY = 0;
  private lookTX = 0;
  private lookTY = 0;
  private lookNext = 0.5;
  private blinks: { next: number; t: number; dbl: boolean }[];
  private twitches: { next: number; t: number }[];
  private springs: { x: number; v: number; sd: number; set: number | null }[];
  /** Def-driven sway (swayImg): the rotation a def set this frame, in design space. */
  private swayObjs: { rotation: number; touched: boolean }[];
  private heatKick = 0;
  private landed = false;
  private vx = 0;
  private vy = 0;

  constructor(readonly rig: PeelRig, readonly world: PeelWorld = PEEL_FRAME_WORLD) {
    const n = rig.parts.length;
    this.pf = new Int16Array(n);
    this.pox = new Float32Array(n);
    this.poy = new Float32Array(n);
    this.prot = new Float32Array(n);
    this.sparkA = new Float32Array(rig.sparkles.length);
    // (the first blink comes soon, so a peel glanced at shows it's alive)
    this.blinks = rig.parts.map(() => ({ next: 0.4 + crand() * 1.4, t: -1, dbl: false }));
    this.twitches = rig.parts.map(() => ({ next: 0.5 + crand() * 2, t: -1 }));
    this.springs = rig.parts.map(() => ({ x: 0, v: 0, sd: crand() * 100, set: null }));
    this.swayObjs = rig.parts.map(() => ({ rotation: 0, touched: false }));
    this.bits = new PeelBits(this.emitters);
    if (rig.band.length) this.band = CURL.indexOf(0);
    this.setup();
  }

  // ——— the foot's own def, run against a stand-in ———

  private setup(): void {
    const rig = this.rig;
    const live = this;
    const type = rig.type;
    const fakeFoot = lenient({
      type,
      meta: footMeta[type.id],
      state: 'hover',
      stateT: 0,
      hoverTime: 99,
      hp: 1,
      maxHp: 1,
      phase: 1,
      enraged: false,
      alive: true,
      held: false,
      pinned: false,
      visualAlpha: 1,
      vx: 0,
      vy: 0,
      isBossLike: !!(type.boss || type.mini),
      root: lenient({ x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, list: [] as unknown[] }),
      liveHost: null,
      // flags defs read (a stand-in that answered them with the null object would count as true)
      phased: false,
      revealT: 0,
      brain: {},
      x: 0,
      h: 0,
      get age() {
        return live.t;
      },
      // the def's own sprites: only what it hangs on the foot is drawn (anything else is a world effect it tweens)
      addLiveArt: (o: unknown, below = false, additive = false) => {
        if (!(o instanceof PeelSprite)) return;
        o.below = !!below;
        if (additive) o.additive = true;
        live.sprites.push(o);
      },
      styleWorld: (dx: number, dy: number) => rig.map(dx, dy),
    });
    const sizeK = () => (rig.D / type.scale) * this.world.scale();
    const emitterShim = (o: EmitterOpts) => {
      const idx = this.emitters.length;
      this.emitters.push(o);
      return lenient({
        opts: o,
        t: 0,
        em: NULL,
        follow() {},
        release() {},
        rate(key: string, perSec: number, dt: number, fn: () => void) {
          const n = (live.acc[idx + key] ?? 0) + perSec * RATE * (reduced() ? 0.4 : 1) * dt;
          let k = Math.floor(n);
          live.acc[idx + key] = n - k;
          while (k-- > 0) fn();
        },
        emit(dx: number, dy: number, e: { vx?: number; vy?: number; life: number; r0: number; r1: number; a: number; tint: number; fade?: number; spin?: number; grav?: number }) {
          live.emit(idx, dx, dy, e, sizeK());
        },
      });
    };
    const k = lenient({
      f: fakeFoot,
      sc: lenient({
        add: lenient({ image: (x: number, y: number, key: string, frame?: unknown) => spriteShim(new PeelSprite(x, y, key, frame)) }),
        textures: lenient({ exists: (key: string) => SHEETS.has(key) }),
      }),
      def: rig.def,
      style: styleFor(type.id),
      get t() {
        return live.t;
      },
      heat: 0,
      get vx() {
        return live.vx;
      },
      get vy() {
        return live.vy;
      },
      get landed() {
        return live.landed;
      },
      windingUp: false,
      toeCurl: 0,
      sinceLand: 99,
      burst: (n: number) => Math.max(1, Math.round(n * RATE * (reduced() ? 0.4 : 1))),
      emitter: emitterShim,
      swarm: (o: CritterOpts) => {
        live.addCritters(o);
        return lenient({ tight: 1, pace: 1, t: 0, landed: false, o, burst: (n: number) => Math.max(1, Math.round(n * RATE)), update() {}, release() {} });
      },
      sheet: (key: string, w: number, h: number, n: number, draw: (ctx: CanvasRenderingContext2D, i: number) => void) => {
        if (!SHEETS.has(key))
          SHEETS.set(
            key,
            Array.from({ length: n }, (_, i) => {
              const [c, ctx] = makeCanvas(w, h);
              draw(ctx, i);
              return c;
            }),
          );
        return key;
      },
      swayImg: (name: string) => {
        const i = rig.parts.findIndex((p) => p.name === name && p.kind === 'sway');
        if (i < 0) return undefined;
        const o = this.swayObjs[i];
        return lenient(
          new Proxy(o, {
            set(t, p, v) {
              if (p === 'rotation') {
                t.rotation = v;
                t.touched = true;
              }
              return true;
            },
          }),
        );
      },
    });
    this.k = k;
    try {
      this.state = rig.def.setup?.(k as never);
    } catch (e) {
      this.fail(e);
    }
  }

  private fail(e: unknown): void {
    if (!this.failed && import.meta.env?.DEV) console.warn('[peelLive]', this.rig.id, 'def runs without its effects:', e);
    this.failed = true;
  }

  private emit(idx: number, dx: number, dy: number, e: { vx?: number; vy?: number; life: number; r0: number; r1: number; a: number; tint: number; fade?: number; spin?: number; grav?: number }, kw: number): void {
    const [lx, ly] = this.rig.map(dx, dy);
    // nothing comes off the handle (the foot ends at the hilt), and on a toes-up peel what falls (drips, grit) would
    // run down its own art and the handle: it just drops off and is gone (a smack's burst flies a little further)
    if (ly > this.rig.hilt.y + 6) return;
    const falls = (e.grav ?? 0) > 200 && this.rig.flip;
    const b = this.bits;
    // the oldest goes first
    const i = b.next;
    b.next = (i + 1) % b.n;
    const [wx, wy] = this.world.toWorld(lx, ly);
    b.x[i] = wx;
    b.y[i] = wy;
    b.vx[i] = (e.vx ?? 0) * kw;
    b.vy[i] = (e.vy ?? 0) * kw;
    b.age[i] = 0;
    // what falls (drips, grit) runs off a toes-up peel over its own art: it drops away quickly
    b.life[i] = falls ? Math.min(e.life, this.landed ? 0.45 : 0.3) : e.life;
    b.r0[i] = e.r0 * kw * SIZE_BOOST;
    b.r1[i] = e.r1 * kw * SIZE_BOOST;
    b.a[i] = e.a;
    b.fade[i] = e.fade ?? 0.15;
    b.spin[i] = e.spin ?? 0;
    b.rot[i] = e.spin ? crand() * Math.PI * 2 : 0;
    b.grav[i] = (e.grav ?? 0) * kw;
    b.sd[i] = crand() * 100;
    b.kw[i] = kw;
    b.tint[i] = e.tint;
    b.em[i] = idx;
  }

  private addCritters(o: CritterOpts): void {
    const rig = this.rig;
    const [cx, cy] = rig.map(o.at[0], o.at[1]);
    // a peel's critters keep a little closer in, so they stay round the head
    for (let i = 0; i < o.count; i++)
      this.critters.push({
        sheet: o.key,
        frames: o.frames,
        ph: (i / o.count) * Math.PI * 2 + crand(),
        sp: 0.7 + crand() * 0.6,
        r: 0.75 + crand() * 0.5,
        tilt: (crand() - 0.5) * 0.8,
        sd: crand() * 100,
        x: cx,
        y: cy,
        rot: 0,
        s: o.scale * rig.D * 1.25,
        front: false,
        depth: 0,
        frame: 0,
        o,
        cx,
        cy,
      });
  }

  /** A smack landed (in play): toes splay, eyes shut tight, things swing, metal flares, and the foot's landing
   * effects (dust, a spray of sand) go off. */
  smack(): void {
    if (this.rig.band.length) {
      this.toe = 'splay';
      this.toeT = 0;
    }
    this.blinks.forEach((b, i) => {
      if (this.rig.parts[i].kind === 'blink') {
        b.t = 0;
        b.dbl = false;
      }
    });
    for (const s of this.springs) s.v += (crand() < 0.5 ? -1 : 1) * 5;
    this.heatKick = 1;
    this.landed = true;
  }

  /** Advance by dt. `vx`, `vy`: the peel's velocity in its own frame (peel units/s), for sway and looks. */
  update(dt: number, vx = 0, vy = 0): void {
    const rig = this.rig;
    const calm = reduced() ? 0.35 : 1;
    this.t += dt;
    this.vx = vx;
    this.vy = vy;
    // ——— toes ———
    if (rig.band.length) {
      this.toeT += dt;
      this.toeNext -= dt;
      if (this.toe === 'rest' && this.toeNext <= 0) {
        this.toeNext = 2.6 + crand() * 4;
        this.toeT = 0;
        this.toe = rig.wiggle && !reduced() && crand() < 0.7 ? 'wiggle' : 'curl';
      }
      let curlTo = 0;
      if (this.toe === 'wiggle') {
        // a little run of wiggles, then back to rest
        this.wigT += dt * 9;
        if (this.toeT > 1.1 + (this.toeNext % 0.6)) {
          this.toe = 'rest';
          this.band = CURL.indexOf(0);
        } else this.band = CURL.length + (Math.floor(this.wigT) % WIGGLE_N);
      } else {
        if (this.toe === 'curl') {
          // curl in, hold, and let go
          curlTo = this.toeT < 0.5 ? 1 : 0;
          if (this.toeT > 0.9) this.toe = 'rest';
        } else if (this.toe === 'splay') {
          curlTo = this.toeT < 0.14 ? -1 : 0;
          if (this.toeT > 0.5) this.toe = 'rest';
        }
        const rate = curlTo > this.curl ? 7 : 4;
        this.curl += Math.sign(curlTo - this.curl) * Math.min(Math.abs(curlTo - this.curl), rate * dt * (this.toe === 'splay' ? 3 : 1));
        let best = 0;
        for (let i = 1; i < CURL.length; i++) if (Math.abs(CURL[i] - this.curl) < Math.abs(CURL[best] - this.curl)) best = i;
        this.band = best;
      }
    }
    // ——— where the eyes look: along a quick move, else about the place ———
    const sp = Math.hypot(vx, vy);
    this.lookNext -= dt;
    if (sp > 260) {
      this.lookTX = vx / sp;
      this.lookTY = vy / sp;
      this.lookNext = 0.6 + crand() * 0.8;
    } else if (this.lookNext <= 0) {
      this.lookNext = 1.2 + crand() * 2.6;
      // now and then straight ahead, otherwise a glance somewhere
      if (crand() < 0.3) {
        this.lookTX = 0;
        this.lookTY = 0;
      } else {
        const a = crand() * Math.PI * 2;
        const m = 0.6 + crand() * 0.4;
        this.lookTX = Math.cos(a) * m;
        this.lookTY = Math.sin(a) * m * 0.7;
      }
    }
    const lk = Math.min(1, dt * 10);
    this.lookX += (this.lookTX - this.lookX) * lk;
    this.lookY += (this.lookTY - this.lookY) * lk;
    // ——— parts ———
    const sg = rig.flip ? -1 : 1;
    rig.parts.forEach((p, i) => {
      if (p.kind === 'blink') {
        const b = this.blinks[i];
        b.next -= dt;
        if (b.t < 0 && b.next <= 0) {
          b.t = 0;
          b.dbl = crand() < 0.2;
          b.next = 2 + crand() * 3.5;
        }
        let kk = 0;
        if (b.t >= 0) {
          b.t += dt;
          const u = b.t / 0.2;
          kk = u < 1 ? Math.sin(u * Math.PI) : 0;
          if (u >= 1) {
            if (b.dbl) {
              b.dbl = false;
              b.t = 0;
            } else b.t = -1;
          }
        }
        this.pf[i] = Math.round(kk * (p.frames.length - 1));
        this.pox[i] = this.lookX * p.look;
        this.poy[i] = this.lookY * p.look * 0.6;
      } else if (p.kind === 'twitch') {
        const w = this.twitches[i];
        w.next -= dt;
        if (w.t < 0 && w.next <= 0) {
          w.t = 0;
          w.next = 0.6 + crand() * 2.4;
        }
        if (w.t >= 0) {
          w.t += dt;
          this.pf[i] = Math.floor(w.t / 0.07) % 2 ? 0 : Math.min(1, p.frames.length - 1);
          if (w.t > 0.3) {
            w.t = -1;
            this.pf[i] = 0;
          }
        }
      } else if (p.kind === 'sway') {
        const o = p.sway ?? {};
        const s = this.springs[i];
        // a peel hangs still, so its idle sway is stronger than the foot's, with a lazy flop now and then
        const idle = (noise1(s.sd + this.t * 0.8) * (o.idle ?? 0.06) * 2.6 + Math.max(0, Math.sin(this.t * 0.7 + s.sd)) ** 6 * 0.22 * (o.gain ?? 1)) * calm;
        // a sideways move pushes it back (in design space: the peel's flip turns it round)
        // (in design space: prot below turns it round for a toes-up peel, so it trails the move as in play)
        const push = -vx * 0.0011 * (o.gain ?? 1);
        const target = Math.max(-0.6, Math.min(0.6, push * calm + idle));
        const kk = o.k ?? 60;
        const c = o.c ?? 6;
        const n = Math.max(1, Math.ceil(dt / (1 / 120)));
        const h = dt / n;
        for (let q = 0; q < n; q++) {
          s.v += (-(s.x - target) * kk - s.v * c) * h;
          s.x += s.v * h;
        }
        this.swayObjs[i].rotation = s.x;
        this.swayObjs[i].touched = false;
      }
    });
    // ——— glow, heat, foil ———
    if (rig.glow) {
      const g = rig.def.glow!;
      const pulse = Math.sin(this.t * Math.PI * 2 * (g.rate ?? 0.6)) * 0.5 + 0.5;
      const flick = noise1(this.t * 4.3) * 0.12;
      // (never much darker than the still's steady glow: a dark-bodied foot looks unlit without it)
      const floor = ((g.base ?? 0.55) + (g.depth ?? 0.4) * 0.5) * 0.8;
      this.glowA = Math.min(1, Math.max(floor, (g.base ?? 0.55) + (pulse * (g.depth ?? 0.4) + flick) * calm) + this.heatKick * 0.25);
    }
    if (rig.heat) {
      // a slow shimmer, flaring when a smack lands
      const sh = 0.5 + 0.5 * Math.sin(this.t * 0.9) * Math.sin(this.t * 0.37 + 1);
      this.heatA = Math.min(1, (0.08 + 0.16 * sh + noise1(this.t * 6.1) * 0.03) * calm + this.heatKick * 0.55);
    }
    this.heatKick = Math.max(0, this.heatKick - dt * 1.6);
    for (let i = 0; i < this.sparkA.length; i++) {
      const w = Math.sin(this.t * (1.3 + (i % 3) * 0.45) + i * 2.1);
      this.sparkA[i] = 0.25 + 0.75 * Math.pow(Math.max(0, w), 3) * calm;
    }
    // ——— the def's own effects ———
    if (!this.failed && rig.def.tick) {
      try {
        rig.def.tick(this.k as never, dt, this.state);
      } catch (e) {
        this.fail(e);
      }
    }
    // a def may drive a sway part itself (a wing beat): it set the rotation after the spring had its turn
    rig.parts.forEach((p, i) => {
      if (p.kind === 'sway') this.prot[i] = this.swayObjs[i].rotation * sg;
    });
    this.landed = false;
    this.bits.tick(dt);
    // ——— critters: an orbit tilted in depth, darting about ———
    for (const c of this.critters) {
      const o = c.o;
      c.ph += dt * o.speed * c.sp * (reduced() ? 0.5 : 1);
      const D = rig.D * 0.62;
      const j = o.jitter * rig.D;
      const ox = Math.cos(c.ph) * o.rx * c.r * D + noise1(c.sd + this.t * 2.3) * j;
      const oz = Math.sin(c.ph);
      const oy = (oz * o.ry * 0.35 + Math.sin(c.ph * 2 + c.tilt) * o.ry * 0.5) * c.r * D + noise1(c.sd + 40 + this.t * 2.1) * j;
      const px = c.x;
      const py = c.y;
      const kk = Math.min(1, dt * 7);
      c.x += (c.cx + ox - c.x) * kk;
      c.y += (c.cy + oy - c.y) * kk;
      const mx = c.x - px;
      const my = c.y - py;
      if (o.upright !== undefined) c.rot = Math.max(-0.35, Math.min(0.35, mx * o.upright));
      else if (Math.abs(mx) + Math.abs(my) > 0.02) c.rot = Math.atan2(my, mx) + Math.PI / 2;
      // always drawn over the peel (one behind the head is lost): further away, smaller and fainter
      c.front = true;
      c.depth = oz;
      c.frame = Math.floor((this.t * 38 + c.sd) % c.frames);
      c.s = o.scale * rig.D * 1.25 * (1 + oz * 0.18);
    }
  }

  /** Frames of particles, critters and parts a renderer walks (see drawPeelLive and src/game/peelLivePlay.ts). */
  get emitterOpts(): readonly EmitterOpts[] {
    return this.emitters;
  }
}

// ════════════════════════════ drawing on a 2D canvas ════════════════════════════

const tinted = new Map<string, HTMLCanvasElement>();
/** An effect frame in one colour (white frames, coloured like a Phaser tint), made once. */
function fxSprite(frame: FxFrame, tint: number): HTMLCanvasElement {
  const key = `${frame}:${tint}`;
  let c = tinted.get(key);
  if (!c) {
    const S = FX_R * 2;
    const [cv, ctx] = makeCanvas(S, S);
    ctx.drawImage(fxAtlasCanvas(), FX_FRAMES.indexOf(frame) * S, 0, S, S, 0, 0, S, S);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = `#${tint.toString(16).padStart(6, '0')}`;
    ctx.fillRect(0, 0, S, S);
    c = cv;
    if (tinted.size > 400) tinted.clear();
    tinted.set(key, c);
  }
  return c;
}

/** Hand-tuned: sprites too small to read on a peel, drawn bigger (Cowboy Cal's spur rowel). */
const SPRITE_BOOST: Record<string, number> = { cowboy: 1.7 };

/** Where a def's sprite sits on the peel: its origin (peel units), turn, and scale (peel units per sheet pixel; y
 * negative on a peel flipped toes-up). */
export function spriteXform(live: PeelLive, sp: PeelSprite): [number, number, number, number, number] {
  const rig = live.rig;
  const ts = rig.type.scale;
  const [x, y] = rig.map(sp.x / ts + CX, sp.y / ts + footMeta[rig.type.id].footHeight);
  const k = rig.D / ts;
  const sg = rig.flip ? -1 : 1;
  const b = SPRITE_BOOST[rig.type.id] ?? 1;
  return [x, y, sp.rotation * sg, sp.scaleX * k * b, sp.scaleY * k * sg * b];
}

const mips = new Map<string, HTMLCanvasElement>();
/** A def's sheet frame shrunk (by halves, smoothly) to about `k` of its size: the sheets are drawn for a big foot,
 * and drawn straight down to a peel's size they shimmer and lose fine lines (tongues, rims) to aliasing. */
export function sheetFrameAt(key: string, frame: number, k: number): HTMLCanvasElement | null {
  const src = SHEETS.get(key)?.[frame];
  if (!src) return null;
  if (k >= 0.7) return src;
  const mk = `${key}|${frame}|${k.toFixed(2)}`;
  let c = mips.get(mk);
  if (!c) {
    let cur: HTMLCanvasElement = src;
    const tw = Math.max(1, Math.round(src.width * k));
    const th = Math.max(1, Math.round(src.height * k));
    while (cur.width / 2 > tw) {
      const [n, nx] = makeCanvas(Math.ceil(cur.width / 2), Math.ceil(cur.height / 2));
      nx.imageSmoothingQuality = 'high';
      nx.drawImage(cur, 0, 0, n.width, n.height);
      cur = n;
    }
    const [n, nx] = makeCanvas(tw, th);
    nx.imageSmoothingQuality = 'high';
    nx.drawImage(cur, 0, 0, tw, th);
    c = n;
    if (mips.size > 600) mips.clear();
    mips.set(mk, c);
  }
  return c;
}

function drawSprites(ctx: Ctx, live: PeelLive, below: boolean): void {
  for (const sp of live.sprites) {
    if (sp.below !== below || !sp.visible || sp.alpha <= 0.01) continue;
    const [x, y, rot, sx, sy] = spriteXform(live, sp);
    const src = SHEETS.get(sp.key)?.[sp.frame];
    const fr = sheetFrameAt(sp.key, sp.frame, Math.abs(sx));
    if (!fr || !src) continue;
    const m = src.width / fr.width;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(sx * m, sy * m);
    ctx.globalAlpha = Math.min(1, sp.alpha);
    if (sp.additive) ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(fr, -sp.originX * fr.width, -sp.originY * fr.height);
    ctx.restore();
  }
}

function drawLayer(ctx: Ctx, l: Layer): void {
  ctx.drawImage(l.c, l.x, l.y, l.w, l.h);
}

function drawBits(ctx: Ctx, live: PeelLive, below: boolean): void {
  const b = live.bits;
  const ems = live.emitterOpts;
  for (let i = 0; i < b.n; i++) {
    const o = ems[b.em[i]];
    if (!o || !!o.below !== below) continue;
    const sh = b.shape(i);
    if (!sh) continue;
    const [r, a] = sh;
    ctx.globalAlpha = Math.min(1, a);
    ctx.globalCompositeOperation = o.add ? 'lighter' : 'source-over';
    const img = fxSprite(o.frame, b.tint[i]);
    if (b.rot[i]) {
      ctx.save();
      ctx.translate(b.x[i], b.y[i]);
      ctx.rotate(b.rot[i]);
      ctx.drawImage(img, -r, -r, r * 2, r * 2);
      ctx.restore();
    } else ctx.drawImage(img, b.x[i] - r, b.y[i] - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

function drawCritters(ctx: Ctx, live: PeelLive, front: boolean): void {
  for (const c of live.critters) {
    if (c.front !== front) continue;
    const fr = SHEETS.get(c.sheet)?.[c.frame];
    if (!fr) continue;
    ctx.save();
    ctx.globalAlpha = 0.7 + 0.3 * (c.depth + 1) * 0.5;
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rot);
    ctx.drawImage(fr, (-fr.width / 2) * c.s, (-fr.height / 2) * c.s, fr.width * c.s, fr.height * c.s);
    ctx.restore();
  }
}

/** The peel itself as it is this frame (the head's layers, the handle and the hilt), in the peel's frame (0, 0 at
 * its top-left, 220 × 360). */
export function drawPeelBody(ctx: Ctx, live: PeelLive): void {
  const rig = live.rig;
  const parts = rig.parts;
  const part = (i: number) => {
    const p = parts[i];
    const l = p.frames[Math.max(0, Math.min(p.frames.length - 1, live.pf[i]))];
    if (p.kind === 'sway') {
      ctx.save();
      ctx.translate(p.px, p.py);
      ctx.rotate(live.prot[i]);
      ctx.drawImage(l.c, l.x - p.px, l.y - p.py, l.w, l.h);
      ctx.restore();
    } else ctx.drawImage(l.c, l.x + live.pox[i], l.y + live.poy[i], l.w, l.h);
  };
  for (let i = 0; i < parts.length; i++) if (parts[i].below) part(i);
  drawSprites(ctx, live, true);
  drawLayer(ctx, rig.base);
  if (live.band >= 0 && rig.band[live.band]) drawLayer(ctx, rig.band[live.band]);
  for (let i = 0; i < parts.length; i++) if (!parts[i].below) part(i);
  drawSprites(ctx, live, false);
  rig.sparkles.forEach((s, i) => {
    ctx.globalAlpha = live.sparkA[i];
    drawLayer(ctx, s);
  });
  ctx.globalCompositeOperation = 'lighter';
  if (rig.glow && live.glowA > 0.01) {
    ctx.globalAlpha = live.glowA;
    drawLayer(ctx, rig.glow);
  }
  if (rig.heat && live.heatA > 0.01) {
    ctx.globalAlpha = live.heatA;
    drawLayer(ctx, rig.heat);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  drawLayer(ctx, rig.hilt);
}

/** The whole living peel on a canvas whose transform is the peel's frame (its world: the locker's canvases). */
export function drawPeelLive(ctx: Ctx, live: PeelLive): void {
  drawCritters(ctx, live, false);
  drawBits(ctx, live, true);
  drawPeelBody(ctx, live);
  drawBits(ctx, live, false);
  drawCritters(ctx, live, true);
}
