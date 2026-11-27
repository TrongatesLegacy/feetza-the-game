// The live kit: what makes a foot redrawn in the style kit (src/art/style) move in play. It grows the Immortals'
// live art (src/game/footLive.ts) into parts any foot can declare cheaply:
//
// - the rig: the art hangs from the ankle and squashes at the sole (Foot.enableRig). Toes curl before a dive,
//   splay on landing and wiggle while hovering (pre-drawn pose frames cross-faded in the toe band), the foot
//   stretches as it falls, squashes and springs back when it lands, breathes, and swings behind sideways moves;
// - sway parts (ears, locks of fur, lace ends, brushes) on damped springs driven by the foot's motion;
// - blinking eyes that can follow the player's peel, twitching noses (any part with frames);
// - a glow layer (the style's emissive art, added on top) that pulses, and a heat layer for the overheat state;
// - world-space emitters (smoke, fog, steam, sparks, embers, drips, bubbles, dust, soot): particles live in the
//   feet layer's frame, so a moving foot leaves trails;
// - critters (flies) that orbit the foot in 3D, passing in front of and behind it, lagging behind its moves.
//
// A foot's behaviour is declared with registerLive(id, def) (src/content/styleLive/*.ts). Everything cosmetic
// uses crand() (never Math.random, the game's seeded generator). Reduced motion calms everything down, and the
// emitters thin out when many live feet are on screen. Textures are built once per foot type, on its first spawn
// (or ahead of time with prewarmLive).

import { feetAnimated } from '../systems/graphics';
import Phaser from 'phaser';
import { CX } from '../art/feetCommon';
import { FOOT_FRAME, footRes, styledCanvas } from '../art/feetArt';
import { type Pose, pose } from '../art/style/kit';
import { type StyleDef, styleFor } from '../art/style/registry';
import { makeCanvas } from '../art/util';
import type { FootType } from '../data/feet';
import { crand } from '../systems/cosmeticRandom';
import { save } from '../systems/save';
import type { Foot } from './Foot';
import { traced } from './packTrace';

// ════════════════════════════ textures ════════════════════════════

/** Pose frames for the toe band: the curl track (splay … rest … curled), then the wiggle cycle. */
const CURL_TRACK = [-1, -0.5, 0, 0.25, 0.5, 0.75, 1];
export const WIGGLE_N = 8;
export const wigglePose = (k: number): Pose => pose({ wiggle: [0, 1, 2, 3, 4].map((i) => Math.sin((k / WIGGLE_N) * Math.PI * 2 + i * 1.25) * 0.85) });

interface LiveTex {
  body: string;
  band?: { key: string; y0: number; n: number; wiggle: boolean };
  parts: Record<string, string>;
  glow?: string;
  heat?: string;
}

const texCache = new Map<string, LiveTex>();

function addSheet(sc: Phaser.Scene, key: string, frames: HTMLCanvasElement[]): string {
  if (sc.textures.exists(key)) return key;
  const fw = frames[0].width;
  const fh = frames[0].height;
  const [c, ctx] = makeCanvas(fw * frames.length, fh);
  frames.forEach((f, i) => ctx.drawImage(f, i * fw, 0));
  // (a plain texture, not a CanvasTexture: that reads every pixel back as it's made, a GPU readback of up to 600 ms
  // for a big sheet; nothing reads these textures' pixels through Phaser)
  const tex = sc.textures.addImage(key, c as unknown as HTMLImageElement);
  frames.forEach((_, i) => tex?.add(i, 0, i * fw, 0, fw, fh));
  return key;
}

function addTex(sc: Phaser.Scene, key: string, c: HTMLCanvasElement): string {
  if (!sc.textures.exists(key)) sc.textures.addImage(key, c as unknown as HTMLImageElement);
  return key;
}

/** Build (once) the textures a styled foot needs in play, one canvas per step (so the work can be spread over idle
 * time: warmLive). */
function* liveSteps(sc: Phaser.Scene, type: FootType, def: LiveDef): Generator<void, LiveTex> {
  const hit = texCache.get(type.id);
  if (hit && sc.textures.exists(hit.body)) return hit;
  const st = styleFor(type.id)!;
  const s = type.scale * footRes(type);
  const out: LiveTex = { body: `lk_${type.id}_body`, parts: {} };
  // the body without its live parts, cut off below the toe band (the band's frames draw the rest)
  if (!sc.textures.exists(out.body)) {
    // (a guard foot's shield is its own piece in play: src/game/guardShield.ts)
    const body = styledCanvas(type, pose({}), { live: true, noShield: true });
    if (st.rig) {
      // the canvas comes back with its design transform still set: clear in texture pixels
      const ctx = body.getContext('2d')!;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, Math.floor((st.rig.to + FOOT_FRAME.padY) * s), body.width, body.height);
    }
    addTex(sc, out.body, body);
    yield;
  }
  // where the toe band is covered in every pose (texture px, band rows from rig.from down): glow and heat are drawn
  // at rest, so in the band they only show where no pose moves the art away (no second set of toes)
  let still: HTMLCanvasElement | undefined;
  if (st.rig) {
    const { from, to } = st.rig;
    const y1 = FOOT_FRAME.h - FOOT_FRAME.padY;
    // draw from well above the band so the shading near its top matches the body's, then keep from `from` down,
    // fading in between from and to
    const lead = 40;
    const poses = [...CURL_TRACK.map((c) => pose({ curl: c })), ...(def.wiggle ? Array.from({ length: WIGGLE_N }, (_, k) => wigglePose(k)) : [])];
    const key = `lk_${type.id}_band`;
    if (!sc.textures.exists(key)) {
      const frames: HTMLCanvasElement[] = [];
      for (const p of poses) {
        const full = styledCanvas(type, p, { live: true, noShield: true }, { y0: from - lead, y1 });
        const [c, ctx] = makeCanvas(full.width, (y1 - from) * s);
        ctx.drawImage(full, 0, -lead * s);
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
        const g = ctx.createLinearGradient(0, 0, 0, (to - from) * s);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, 'rgba(0,0,0,1)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, c.width, c.height);
        frames.push(c);
        yield;
      }
      addSheet(sc, key, frames);
    }
    out.band = { key, y0: from, n: poses.length, wiggle: !!def.wiggle };
  }
  for (const [name, part] of Object.entries(st.parts ?? {})) {
    const key = `lk_${type.id}_p_${name}`;
    if (!sc.textures.exists(key)) {
      const frames = Array.from({ length: part.frames }, (_, i) => {
        const [c, ctx] = makeCanvas(part.box.w * s, part.box.h * s);
        ctx.scale(s, s);
        ctx.translate(-part.box.x, -part.box.y);
        part.draw(ctx, type.art, i);
        return c;
      });
      addSheet(sc, key, frames);
      yield;
    }
    out.parts[name] = key;
  }
  // glow and heat are drawn at rest: in the toe band they keep only where every pose covers the art (`still`), so
  // they never show a second set of toes, yet the hot sole and the ball of the foot still glow
  const offBand = (c: HTMLCanvasElement) => {
    if (!st.rig) return c;
    const ctx = c.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const y0 = Math.round((st.rig.from + FOOT_FRAME.padY) * s);
    if (still) {
      // keep the band only where it's still: cut the band out, then add it back masked
      const [b, bx] = makeCanvas(c.width, Math.max(1, c.height - y0));
      bx.drawImage(c, 0, -y0);
      bx.globalCompositeOperation = 'destination-in';
      bx.drawImage(still, 0, 0);
      ctx.clearRect(0, y0, c.width, c.height - y0);
      ctx.drawImage(b, 0, y0);
      return c;
    }
    // (the pose frames were made earlier: fade the band out instead)
    ctx.globalCompositeOperation = 'destination-out';
    const y1 = (st.rig.to + FOOT_FRAME.padY) * s;
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y0, c.width, c.height - y0);
    return c;
  };
  for (const layer of ['glow', 'heat'] as const) {
    if (!def[layer]) continue;
    const key = `lk_${type.id}_${layer}`;
    if (!sc.textures.exists(key)) {
      addTex(sc, key, offBand(styledCanvas(type, pose({ heat: layer === 'heat' ? 1 : 0 }), { live: true, emissive: layer === 'glow', heat: layer === 'heat' })));
      yield;
    }
    out[layer] = key;
  }
  texCache.set(type.id, out);
  return out;
}

/** Live textures being built a step at a time (warmLive), by foot id. */
const building = new Map<string, { sc: Phaser.Scene; gen: Generator<void, LiveTex> }>();

/** A styled foot's live textures, built now if they aren't yet (finishing a warm-up in progress). */
function liveTextures(sc: Phaser.Scene, type: FootType, def: LiveDef): LiveTex {
  const job = building.get(type.id);
  building.delete(type.id);
  const gen = job && job.sc === sc ? job.gen : liveSteps(sc, type, def);
  for (;;) {
    const r = gen.next();
    if (r.done) return r.value;
  }
}

/** Build a styled foot's live textures now (play builds them lazily instead: warmLive). */
export function prewarmLive(sc: Phaser.Scene, type: FootType): void {
  const def = defs[type.id];
  if (def && styleFor(type.id)) liveTextures(sc, type, def);
}

let pumping = false;
/** When the builder last took a step. */
let lastStep = 0;
const idle = (fn: (d?: IdleDeadline) => void) => {
  if (typeof requestIdleCallback === 'function') requestIdleCallback(fn, { timeout: 400 });
  else setTimeout(() => fn(), 40);
};

/** Is the game in the thick of play (the scene says so)? Then the builder only uses real idle time. */
let busyNow: () => boolean = () => false;

/** Tell the builder when play is busy (a wave running): it then never forces a step into a frame. */
export function setLiveWarmBusy(fn: () => boolean): void {
  busyNow = fn;
}

function pump(d?: IdleDeadline): void {
  // a step costs a few ms (a full redraw of the foot): take one only while the frame has room. Between waves and in
  // the shop one goes anyway when the idle wait timed out or there's no idle callback (Safari), so the queue empties;
  // in a running wave it waits for real idle time (a foot that spawns first builds its own)
  // (a page drawing at a smooth 60 fps hands out idle slots of only a few ms, before the timeout: without the
  // starved check the queue never moved on the title screen)
  const starved = performance.now() - lastStep > 250;
  let forced = (!d || d.didTimeout || starved) && !busyNow();
  while (building.size && (forced || (!!d && d.timeRemaining() > 8))) {
    forced = false;
    const [id, job] = building.entries().next().value!;
    let done = true;
    try {
      // (a job whose game has gone is dropped)
      done = !job.sc.sys?.game || !job.sc.sys.textures || !!job.gen.next().done;
    } catch (e) {
      if (import.meta.env?.DEV) console.error('[liveKit] building', id, e);
    }
    lastStep = performance.now();
    if (done) building.delete(id);
    if (!d) break;
  }
  if (building.size) idle(pump);
  else pumping = false;
}

/**
 * Build the live textures of feet about to appear, in idle time a step at a time (so load time stays flat however
 * many feet are redrawn). Ids already built or queued are skipped; a foot that spawns first finishes its own build.
 */
export function warmLive(sc: Phaser.Scene, ids: Iterable<string>, types: Record<string, FootType>): void {
  for (const id of ids) {
    const type = types[id];
    const def = defs[id];
    if (!type || !def || !styleFor(id)) continue;
    // queued for another (gone) game: start again for this one
    if (building.get(id)?.sc === sc) continue;
    const hit = texCache.get(id);
    if (hit && sc.textures.exists(hit.body)) continue;
    building.set(id, { sc, gen: liveSteps(sc, type, def) });
  }
  if (building.size && !pumping) {
    pumping = true;
    idle(pump);
  }
}

/** Are a foot type's live textures built for this scene (so starting its live layer won't stall a frame)? */
export function liveWarm(sc: Phaser.Scene, id: string): boolean {
  const hit = texCache.get(id);
  return !!hit && sc.textures.exists(hit.body);
}

/**
 * Drop the live textures of feet not in `keep` that nothing on screen shows (src/game/assets.ts: texturesInUse). A
 * foot let go builds them again the next time it's warmed or spawns. Returns the ids let go.
 */
export function evictLive(sc: Phaser.Scene, keep: Set<string>, inUse: Set<string>): string[] {
  const out: string[] = [];
  for (const [id, t] of texCache) {
    if (keep.has(id)) continue;
    const keys = [t.body, t.band?.key, t.glow, t.heat, ...Object.values(t.parts), `still_glow_${id}`].filter((k): k is string => !!k);
    if (keys.some((k) => inUse.has(k))) continue;
    for (const k of keys) if (sc.textures.exists(k)) sc.textures.remove(k);
    texCache.delete(id);
    out.push(id);
  }
  return out;
}

/** Dev: how many feet are still waiting for their live textures. */
export function liveWarmPending(): number {
  return building.size;
}

/** Effect particle textures: one atlas so every emitter batches. */
const FX_KEY = 'livekit_fx';
const FX_R = 32;
export type FxFrame = 'puff' | 'soft' | 'spark' | 'ember' | 'drop' | 'bubble' | 'mote' | 'flake';

export const FX_FRAMES: FxFrame[] = ['puff', 'soft', 'spark', 'ember', 'drop', 'bubble', 'mote', 'flake'];
export { FX_R };
let fxCanvas: HTMLCanvasElement | null = null;

/** The effect particles' frames side by side (FX_R × 2 square each, white, to be tinted), drawn once. */
export function fxAtlasCanvas(): HTMLCanvasElement {
  if (fxCanvas) return fxCanvas;
  const names = FX_FRAMES;
  const S = FX_R * 2;
  const [c, x] = makeCanvas(S * names.length, S);
  names.forEach((n, i) => {
    x.save();
    x.translate(i * S + FX_R, FX_R);
    const rg = (stops: [number, string][], r = FX_R) => {
      const g = x.createRadialGradient(0, 0, 0, 0, 0, r);
      for (const [o, col] of stops) g.addColorStop(o, col);
      x.fillStyle = g;
      x.beginPath();
      x.arc(0, 0, r, 0, Math.PI * 2);
      x.fill();
    };
    switch (n) {
      case 'puff':
        // a soft puff with a faint lighter rim, so dark smoke still reads against a dark backdrop
        rg([[0, 'rgba(255,255,255,.95)'], [0.55, 'rgba(255,255,255,.6)'], [0.8, 'rgba(255,255,255,.28)'], [1, 'rgba(255,255,255,0)']]);
        break;
      case 'soft':
        rg([[0, 'rgba(255,255,255,.8)'], [0.4, 'rgba(255,255,255,.35)'], [1, 'rgba(255,255,255,0)']]);
        break;
      case 'spark': {
        x.fillStyle = '#ffffff';
        x.beginPath();
        x.ellipse(0, 0, FX_R * 0.95, FX_R * 0.12, 0, 0, Math.PI * 2);
        x.fill();
        rg([[0, 'rgba(255,255,255,.6)'], [1, 'rgba(255,255,255,0)']], FX_R * 0.45);
        break;
      }
      case 'ember':
        rg([[0, 'rgba(255,255,255,1)'], [0.18, 'rgba(255,255,255,.95)'], [0.4, 'rgba(255,255,255,.3)'], [1, 'rgba(255,255,255,0)']]);
        break;
      case 'drop':
        x.fillStyle = '#ffffff';
        x.beginPath();
        x.moveTo(0, -FX_R * 0.8);
        x.quadraticCurveTo(FX_R * 0.55, FX_R * 0.1, 0, FX_R * 0.6);
        x.quadraticCurveTo(-FX_R * 0.55, FX_R * 0.1, 0, -FX_R * 0.8);
        x.fill();
        break;
      case 'bubble':
        x.strokeStyle = 'rgba(255,255,255,.9)';
        x.lineWidth = 3;
        x.beginPath();
        x.arc(0, 0, FX_R * 0.8, 0, Math.PI * 2);
        x.stroke();
        x.fillStyle = 'rgba(255,255,255,.18)';
        x.fill();
        x.fillStyle = 'rgba(255,255,255,.95)';
        x.beginPath();
        x.ellipse(-FX_R * 0.3, -FX_R * 0.35, FX_R * 0.18, FX_R * 0.1, -0.6, 0, Math.PI * 2);
        x.fill();
        break;
      case 'mote':
        rg([[0, 'rgba(255,255,255,1)'], [0.5, 'rgba(255,255,255,.7)'], [1, 'rgba(255,255,255,0)']], FX_R * 0.35);
        break;
      case 'flake':
        x.fillStyle = '#ffffff';
        x.beginPath();
        x.moveTo(-FX_R * 0.5, -FX_R * 0.2);
        x.lineTo(FX_R * 0.4, -FX_R * 0.35);
        x.lineTo(FX_R * 0.55, FX_R * 0.25);
        x.lineTo(-FX_R * 0.3, FX_R * 0.4);
        x.closePath();
        x.fill();
        break;
    }
    x.restore();
  });
  fxCanvas = c;
  return c;
}

/** The effect particles' atlas as a texture (one, so every emitter batches). */
export function fxAtlas(sc: Phaser.Scene): string {
  if (sc.textures.exists(FX_KEY)) return FX_KEY;
  const S = FX_R * 2;
  // (a copy: a texture's canvas belongs to its game)
  const src = fxAtlasCanvas();
  const [c, x] = makeCanvas(src.width, src.height);
  x.drawImage(src, 0, 0);
  const tex = sc.textures.addCanvas(FX_KEY, c)!;
  FX_FRAMES.forEach((n, i) => tex.add(n, 0, i * S, 0, S, S));
  return FX_KEY;
}

// ════════════════════════════ shared helpers ════════════════════════════

/** 1D value noise in −1…1 (smooth). */
export function noise1(x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const h = (n: number) => {
    let v = (n << 13) ^ n;
    v = (v * (v * v * 15731 + 789221) + 1376312589) & 0x7fffffff;
    return 1 - v / 1073741824;
  };
  const u = f * f * (3 - 2 * f);
  return h(i) * (1 - u) + h(i + 1) * u;
}

/** The live feet about (emitters thin out in a crowd). Counted by their active roots, so feet dropped without a
 * death (a scene restart) never inflate it. */
const liveSet = new Set<LiveFoot>();
function liveCountNow(): number {
  for (const l of liveSet) if (!l.f.root.active) liveSet.delete(l);
  return liveSet.size;
}
const reduced = () => !!save.settings.reducedMotion;
/** Emission multiplier: thinner with reduced motion and with many live feet about. */
export function liveQuality(): number {
  const q = Math.min(1, 4 / Math.max(1, liveCountNow()));
  return Math.max(0.35, q) * (reduced() ? 0.4 : 1);
}

/** A damped spring towards a target. */
export class Spring {
  v = 0;
  constructor(public x: number, private k: number, private c: number) {}
  step(target: number, dt: number): number {
    // semi-implicit Euler, sub-stepped so stiff springs stay stable on slow frames
    const n = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      this.v += (-(this.x - target) * this.k - this.v * this.c) * h;
      this.x += this.v * h;
    }
    return this.x;
  }
}

/** Design point (style space) → the foot container's local frame (before the rig). */
function local(f: Foot, dx: number, dy: number): [number, number] {
  const ts = f.type.scale;
  return [(dx - CX) * ts, (dy - f.meta.footHeight) * ts];
}

// ════════════════════════════ world-space emitters ════════════════════════════

/** What the next emitted particle gets (the emitter ops read it as it fires). */
const next = { vx: 0, vy: 0, life: 1, r0: 1, r1: 1, a: 0.3, fade: 0.15, tint: 0xffffff, sd: 0, spin: 0, grav: 0 };
interface PData {
  life: number;
  r0: number;
  r1: number;
  a: number;
  fade: number;
  sd: number;
  spin: number;
  grav: number;
}
type LP = Phaser.GameObjects.Particles.Particle & { lk?: PData };

class Curl extends Phaser.GameObjects.Particles.ParticleProcessor {
  constructor(private em: WorldEmitter) {
    super(0, 0, true);
  }
  update(p: LP, _delta: number, step: number): void {
    const d = p.lk;
    if (!d) return;
    const o = this.em.opts;
    if (o.curl) p.velocityX += noise1(d.sd + this.em.t * 1.6) * o.curl * step;
    p.velocityY += d.grav * step;
    const drag = o.drag ?? 1.2;
    p.velocityX *= 1 - drag * step;
    p.velocityY *= 1 - drag * step;
    if (d.spin) p.rotation += d.spin * step;
  }
}

export interface EmitterOpts {
  frame: FxFrame;
  /** Additive light (sparks, embers, glows) instead of normal paint. */
  add?: boolean;
  /** Sideways curl strength (world px/s²). */
  curl?: number;
  /** Air drag (per second). */
  drag?: number;
  /** Under the foot's art (true) or over it. */
  below?: boolean;
  max?: number;
}

/** One emitter of a foot, in the feet layer's frame (particles stay where they were emitted as the foot moves). */
export class WorldEmitter {
  readonly em: Phaser.GameObjects.Particles.ParticleEmitter;
  t = 0;
  private acc: Record<string, number> = {};
  private freed = false;

  constructor(sc: Phaser.Scene, private f: Foot, readonly opts: EmitterOpts) {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const cfg: any = {
      frame: opts.frame,
      emitting: false,
      blendMode: opts.add ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL,
      lifespan: {
        onEmit: (p: LP) => {
          const d = (p.lk ??= { life: 1, r0: 1, r1: 1, a: 0, fade: 0.15, sd: 0, spin: 0, grav: 0 });
          d.life = next.life;
          d.r0 = next.r0;
          d.r1 = next.r1;
          d.a = next.a;
          d.fade = next.fade;
          d.sd = next.sd;
          d.spin = next.spin;
          d.grav = next.grav;
          return next.life * 1000;
        },
      },
      speedX: { onEmit: () => next.vx },
      speedY: { onEmit: () => next.vy },
      rotate: { onEmit: () => (next.spin ? crand() * 360 : 0) },
      scale: {
        onEmit: () => next.r0 / FX_R,
        onUpdate: (p: LP, _k: string, t: number) => {
          const d = p.lk!;
          return (d.r0 + (d.r1 - d.r0) * Math.sqrt(t)) / FX_R;
        },
      },
      alpha: {
        onEmit: () => 0,
        onUpdate: (p: LP, _k: string, t: number) => {
          const d = p.lk!;
          return d.a * Math.min(1, t / Math.max(0.01, d.fade)) * (1 - t) * (1 - t * 0.3);
        },
      },
      tint: { onEmit: () => next.tint },
      maxAliveParticles: opts.max ?? 400,
    };
    /* eslint-enable @typescript-eslint/no-explicit-any */
    this.em = sc.add.particles(0, 0, fxAtlas(sc), cfg);
    this.em.addParticleProcessor(new Curl(this));
    f.addLiveFx(this.em, !!opts.below);
  }

  /** Keep the emitter's frame on the feet layer's, whatever the foot's container does. */
  follow(dt: number): void {
    const r = this.f.root;
    this.t += dt;
    const c = Math.cos(-r.rotation);
    const s = Math.sin(-r.rotation);
    this.em.setRotation(-r.rotation).setScale(1 / r.scaleX, 1 / r.scaleY);
    this.em.setPosition((c * -r.x - s * -r.y) / r.scaleX, (s * -r.x + c * -r.y) / r.scaleY);
  }

  /** Emit one particle at a design point of the foot (velocities in world px/s, radii in world px, life in s). */
  emit(dx: number, dy: number, o: { vx?: number; vy?: number; life: number; r0: number; r1: number; a: number; tint: number; fade?: number; spin?: number; grav?: number }): void {
    const [wx, wy] = this.f.styleWorld(dx, dy);
    next.vx = o.vx ?? 0;
    next.vy = o.vy ?? 0;
    next.life = o.life;
    next.r0 = o.r0;
    next.r1 = o.r1;
    next.a = o.a;
    next.tint = o.tint;
    next.fade = o.fade ?? 0.15;
    next.spin = o.spin ?? 0;
    next.grav = o.grav ?? 0;
    next.sd = crand() * 100;
    this.em.emitParticleAt(wx, wy, 1);
  }

  /** Emit at `perSec` (scaled by liveQuality) for this frame. */
  rate(key: string, perSec: number, dt: number, fn: () => void): void {
    const n = (this.acc[key] ?? 0) + perSec * liveQuality() * dt;
    let k = Math.floor(n);
    this.acc[key] = n - k;
    while (k-- > 0) fn();
  }

  /** The foot is gone: leave the particles where they are, stop, and clear up once the last one fades. */
  release(): void {
    if (this.freed) return;
    this.freed = true;
    const r = this.f.root;
    const layer = r.parentContainer;
    if (!layer || !this.em.active) return;
    r.remove(this.em);
    layer.add(this.em);
    this.em.setPosition(0, 0).setRotation(0).setScale(1);
    this.em.scene.time.delayedCall(3200, () => this.em.active && this.em.destroy());
  }
}

// ════════════════════════════ critters ════════════════════════════

export interface CritterOpts {
  /** Texture key (frames 0…n-1 flap) made by the def's setup. */
  key: string;
  frames: number;
  count: number;
  /** Orbit centre (design space) and radii (design units). */
  at: [number, number];
  rx: number;
  ry: number;
  /** Orbit speed (radians/s) and how much each critter darts about. */
  speed: number;
  jitter: number;
  /** Display scale. */
  scale: number;
  /** Keep it upright (a saucer, a balloon) instead of facing where it flies: banks this much per pixel of speed. */
  upright?: number;
}

interface Critter {
  img: Phaser.GameObjects.Image;
  ph: number;
  sp: number;
  r: number;
  tilt: number;
  x: number;
  y: number;
  sd: number;
  front: boolean;
}

/** Critters orbiting a foot in world space: they lag behind its moves and pass in front of and behind it. */
export class Critters {
  private list: Critter[] = [];
  private back: Phaser.GameObjects.Container;
  private front: Phaser.GameObjects.Container;
  /** Orbit tightness and speed multipliers (a def can swarm them in as the foot dives). */
  tight = 1;
  pace = 1;
  t = 0;

  constructor(sc: Phaser.Scene, private f: Foot, readonly o: CritterOpts) {
    this.back = sc.add.container(0, 0);
    this.front = sc.add.container(0, 0);
    f.addLiveFx(this.back, true);
    f.addLiveFx(this.front, false);
    const [ax, ay] = f.styleWorld(o.at[0], o.at[1]);
    for (let i = 0; i < o.count; i++) {
      const img = sc.add.image(0, 0, o.key, 0).setScale(o.scale * f.type.scale);
      const c: Critter = { img, ph: (i / o.count) * Math.PI * 2 + crand(), sp: 0.7 + crand() * 0.6, r: 0.75 + crand() * 0.5, tilt: (crand() - 0.5) * 0.8, x: ax, y: ay, sd: crand() * 100, front: false };
      this.back.add(img);
      this.list.push(c);
    }
  }

  /** True on the one frame it lands a stomp. */
  landed = false;

  /** How many of a burst of n to emit (thinner in a crowd and with reduced motion). */
  burst(n: number): number {
    return Math.max(1, Math.round(n * liveQuality()));
  }

  update(dt: number): void {
    const f = this.f;
    const r = f.root;
    this.t += dt;
    this.landed = false;
    const ts = f.type.scale * r.scaleX;
    const [ax, ay] = f.styleWorld(this.o.at[0], this.o.at[1]);
    const ci = Math.cos(-r.rotation);
    const si = Math.sin(-r.rotation);
    for (const c of this.list) {
      c.ph += dt * this.o.speed * c.sp * this.pace * (reduced() ? 0.5 : 1);
      const j = this.o.jitter;
      // an orbit tilted in depth, plus darting noise
      const ox = Math.cos(c.ph) * this.o.rx * c.r * this.tight + noise1(c.sd + this.t * 2.3) * j;
      const oz = Math.sin(c.ph);
      const oy = (oz * this.o.ry * 0.35 + Math.sin(c.ph * 2 + c.tilt) * this.o.ry * 0.5) * c.r * this.tight + noise1(c.sd + 40 + this.t * 2.1) * j;
      const tx = ax + ox * ts;
      const ty = ay + oy * ts;
      // they chase their orbit point, so they trail behind the foot's moves
      const k = Math.min(1, dt * 7);
      const px = c.x;
      const py = c.y;
      c.x += (tx - c.x) * k;
      c.y += (ty - c.y) * k;
      // world → the foot's local frame
      const lx = c.x - r.x;
      const ly = c.y - r.y;
      c.img.setPosition((ci * lx - si * ly) / r.scaleX, (si * lx + ci * ly) / r.scaleY);
      const vx = c.x - px;
      const vy = c.y - py;
      if (this.o.upright !== undefined) c.img.rotation = Math.max(-0.35, Math.min(0.35, vx * this.o.upright)) - r.rotation;
      else if (Math.abs(vx) + Math.abs(vy) > 0.05) c.img.rotation = Math.atan2(vy, vx) + Math.PI / 2 - r.rotation;
      // a little bigger in front, smaller behind
      c.img.setScale(this.o.scale * f.type.scale * (1 + oz * 0.12));
      c.img.setFrame(Math.floor((this.t * 38 + c.sd) % this.o.frames));
      const front = oz > 0;
      if (front !== c.front) {
        c.front = front;
        (front ? this.front : this.back).add(c.img);
      }
    }
  }

  /** The foot is gone: the critters scatter and fade. */
  release(): void {
    for (const c of this.list) {
      if (!c.img.active) continue;
      const a = crand() * Math.PI * 2;
      this.f.scene.tweens.add({ targets: c.img, x: c.img.x + Math.cos(a) * 260, y: c.img.y + Math.sin(a) * 200 - 120, alpha: 0, duration: 900 + crand() * 500, ease: 'Quad.In' });
    }
  }
}

// ════════════════════════════ the live foot ════════════════════════════

export interface LiveDef<S = unknown> {
  /** Wiggle the toes while hovering (bare feet). */
  wiggle?: boolean;
  /** How much the rig moves (0 turns it off): swing, squash and breath. All three at 0 hold the art still (a boss
   * whose fight places things on its art by its own coordinates). */
  rig?: { swing?: number; squash?: number; breath?: number };
  /** Sway parts (names from the style's parts): spring stiffness, damping, and how hard motion pushes them. */
  sway?: Record<string, { k?: number; c?: number; gain?: number; idle?: number; below?: boolean; flop?: number }>;
  /** Blinking parts (frames 0 open … last shut), optionally following the peel by up to `look` design units. */
  blink?: Record<string, { every?: number; look?: number }>;
  /** Twitching parts (frame 0 rest, 1 twitched). */
  twitch?: Record<string, { every?: number }>;
  /** Add the style's emissive layer as a glow that pulses (rate Hz, depth 0…1). */
  glow?: { rate?: number; depth?: number; base?: number };
  /** Add the style's heat layer for the overheat state; heat(f) gives the target 0…1 (default: bosses' phase/HP).
   * `boost` is the second, slower pass's strength (default 1; 0 for pale or glowing art the doubled light washes out). */
  heat?: { of?: (f: Foot) => number; boost?: number };
  /** Make textures, emitters and critters (once, on the foot's first live frame); returns the state tick gets. */
  setup?(k: LiveFoot): S;
  /** Every frame: emit, steer critters. `k.heat` is the current overheat (0…1). */
  tick?(k: LiveFoot, dt: number, s: S): void;
  /** Shape the rig yourself (a foot whose body moves its own way, like a slumping blob of dough): gets the kit's
   * swing, squash (sx, sy) and toe curl for this frame and returns the ones to use. Runs before tick. */
  pose?(k: LiveFoot, dt: number, p: RigPose, s: S): RigPose;
  /** The foot died, escaped or was destroyed: clear away live art of the def's own (emitters and critters are
   * released by the kit). */
  die?(k: LiveFoot, s: S): void;
}

/** The rig's pose for a frame: swing (radians round the ankle), squash at the sole and the toe band's curl. */
export interface RigPose {
  swing: number;
  sx: number;
  sy: number;
  curl: number;
}

const defs: Record<string, LiveDef> = traced('liveFeet', {});

/** A styled foot's live behaviour, if it has one (its peel animates from it too: src/art/peelLive.ts). */
export function liveDefOf(id: string): LiveDef | undefined {
  return defs[id];
}

/** Declare a styled foot's live behaviour (see LiveDef). */
export function registerLive<S>(id: string, def: LiveDef<S>): void {
  defs[id] = def as LiveDef;
}

const peelDefs: Record<string, LiveDef> = traced('peelLive', {});

/** Declare how a foot's peel moves when the foot has a live layer of its own in play (the Immortals: a peel-only
 * style, src/art/style/registry.ts registerPeelStyle). Play never runs it. */
export function registerPeelLive<S>(id: string, def: LiveDef<S>): void {
  peelDefs[id] = def as LiveDef;
}

/** The live def a foot's living peel runs: its play def, else a peel-only one. */
export function peelLiveDefOf(id: string): LiveDef | undefined {
  return defs[id] ?? peelDefs[id];
}

interface SwayPart {
  name: string;
  img: Phaser.GameObjects.Image;
  spring: Spring;
  o: NonNullable<LiveDef['sway']>[string];
  sd: number;
}

/** Default overheat for bosses: hotter in later phases, enraged or low on health. */
export function bossHeat(f: Foot): number {
  if (!f.isBossLike) return f.enraged ? 0.5 : 0;
  const hp = f.hp / Math.max(1, f.maxHp);
  return Math.min(1, Math.max(0, (f.phase - 1) * 0.45, f.enraged ? 0.8 : 0, hp < 0.35 ? 1 - hp / 0.35 : 0));
}

/** The live state of one styled foot (what a def's setup and tick get). */
export class LiveFoot {
  readonly sc: Phaser.Scene;
  readonly tex: LiveTex;
  /** Current overheat 0…1 (smoothed). */
  heat = 0;
  t = crand() * 10;
  /** World velocity of the foot (px/s). */
  vx = 0;
  vy = 0;
  private lastX: number;
  private lastY: number;
  private emitters: WorldEmitter[] = [];
  private critters: Critters[] = [];
  private bandA?: Phaser.GameObjects.Image;
  private bandB?: Phaser.GameObjects.Image;
  private sways: SwayPart[] = [];
  private blinks: { img: Phaser.GameObjects.Image; n: number; next: number; t: number; look: number; x0: number; y0: number; dbl: boolean }[] = [];
  private twitches: { img: Phaser.GameObjects.Image; next: number; t: number }[] = [];
  private glowImg?: Phaser.GameObjects.Image;
  private heatImg?: Phaser.GameObjects.Image;
  private heatImg2?: Phaser.GameObjects.Image;
  // the rig
  private curl = 0;
  private sy: Spring;
  private sw: Spring;
  private wigT = crand() * 4;
  private lastState = '';
  private landT = 9;
  private counted = true;
  private shownCurl = 0;

  constructor(readonly f: Foot, readonly def: LiveDef, readonly style: StyleDef) {
    this.sc = f.scene;
    this.tex = liveTextures(this.sc, f.type, def);
    this.lastX = f.root.x;
    this.lastY = f.root.y;
    this.sy = new Spring(1, 190, 13);
    this.sw = new Spring(0, 42, 7);
    f.enableRig();
    f.setArtTexture(this.tex.body);
    const res = footRes(f.type);
    const k = 1 / res;
    const place = (key: string, dx: number, dy: number, below: boolean, ox = 0, oy = 0) => {
      const [lx, ly] = local(f, dx, dy);
      const img = this.sc.add.image(lx, ly, key, 0).setOrigin(ox, oy).setScale(k);
      f.addLiveArt(img, below);
      return img;
    };
    // the toe band: frame a under, frame b fading in over it
    if (this.tex.band) {
      // the band spans the texture's full width: its left edge is design x = −padX
      this.bandA = place(this.tex.band.key, -FOOT_FRAME.padX, this.tex.band.y0, false);
      this.bandB = place(this.tex.band.key, -FOOT_FRAME.padX, this.tex.band.y0, false);
      this.bandB.setAlpha(0);
    }
    // parts: sway parts hang from their pivots; the rest sit in their boxes
    for (const [name, key] of Object.entries(this.tex.parts)) {
      const p = style.parts![name];
      const sw = def.sway?.[name];
      if (sw) {
        const [px, py] = p.pivot ?? [p.box.x, p.box.y];
        const img = place(key, px, py, !!sw.below, (px - p.box.x) / p.box.w, (py - p.box.y) / p.box.h);
        this.sways.push({ name, img, spring: new Spring(0, sw.k ?? 60, sw.c ?? 6), o: sw, sd: crand() * 100 });
        continue;
      }
      const img = place(key, p.box.x, p.box.y, false);
      const bl = def.blink?.[name];
      if (bl) this.blinks.push({ img, n: p.frames, next: 1 + crand() * (bl.every ?? 3.5), t: -1, look: bl.look ?? 0, x0: img.x, y0: img.y, dbl: false });
      const tw = def.twitch?.[name];
      if (tw) this.twitches.push({ img, next: 0.5 + crand() * (tw.every ?? 2), t: -1 });
    }
    if (this.tex.glow) {
      this.glowImg = this.sc.add.image(0, 0, this.tex.glow).setOrigin(0.5, f.meta.originY).setScale(k).setBlendMode(Phaser.BlendModes.ADD);
      f.addLiveArt(this.glowImg, false, true);
    }
    if (this.tex.heat) {
      this.heatImg = this.sc.add.image(0, 0, this.tex.heat).setOrigin(0.5, f.meta.originY).setScale(k).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
      f.addLiveArt(this.heatImg, false, true);
      // a second pass of the same light, so a boss's overheat reads clearly over a busy backdrop in a real fight
      this.heatImg2 = this.sc.add.image(0, 0, this.tex.heat).setOrigin(0.5, f.meta.originY).setScale(k).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
      f.addLiveArt(this.heatImg2, false, true);
    }
    liveSet.add(this);
    this.state = def.setup?.(this);
  }

  /** What the def's setup returned. */
  private state: unknown;

  /** A world-space emitter for this foot (see EmitterOpts). */
  emitter(o: EmitterOpts): WorldEmitter {
    const e = new WorldEmitter(this.sc, this.f, o);
    this.emitters.push(e);
    return e;
  }

  /** A sway part's image by its name (a def that drives the part itself, like a wing beat, sets its rotation in
   * tick, after the spring has had its turn). */
  swayImg(name: string): Phaser.GameObjects.Image | undefined {
    return this.sways.find((s) => s.name === name)?.img;
  }

  /** Critters orbiting this foot (see CritterOpts). */
  swarm(o: CritterOpts): Critters {
    const c = new Critters(this.sc, this.f, o);
    this.critters.push(c);
    return c;
  }

  /** A texture made once per game from a canvas painter (critter frames and the like): n frames side by side. */
  sheet(key: string, w: number, h: number, n: number, draw: (ctx: CanvasRenderingContext2D, i: number) => void): string {
    if (this.sc.textures.exists(key)) return key;
    const frames = Array.from({ length: n }, (_, i) => {
      const [c, ctx] = makeCanvas(w, h);
      draw(ctx, i);
      return c;
    });
    return addSheet(this.sc, key, frames);
  }

  /** Is the foot about to dive (the last moments of its hover)? */
  get windingUp(): boolean {
    const f = this.f;
    return f.state === 'hover' && !f.held && !f.pinned && f.stateT > f.hoverTime - 0.45;
  }

  /** The toe curl the toe band is showing now (−1 splayed … 1 curled; 0 while the toes wiggle). Art that hangs
   * off the toes (a chain on a toe cuff) follows it. */
  get toeCurl(): number {
    return this.shownCurl;
  }

  /** Seconds since it last landed a stomp. */
  get sinceLand(): number {
    return this.landT;
  }

  /** True on the one frame it lands a stomp. */
  landed = false;

  /** How many of a burst of n to emit (thinner in a crowd and with reduced motion). */
  burst(n: number): number {
    return Math.max(1, Math.round(n * liveQuality()));
  }

  update(dt: number): void {
    const f = this.f;
    const r = f.root;
    this.t += dt;
    this.landed = false;
    this.vx = this.vx * 0.7 + ((r.x - this.lastX) / dt) * 0.3;
    this.vy = this.vy * 0.7 + ((r.y - this.lastY) / dt) * 0.3;
    this.lastX = r.x;
    this.lastY = r.y;
    const calm = reduced() ? 0.35 : 1;
    const rigO = this.def.rig ?? {};
    // ——— the rig ———
    if (f.state !== this.lastState) {
      if (f.state === 'stomp') {
        this.landT = 0;
        this.landed = true;
        // land: squash hard and spring back (follow-through), toes splay
        this.sy.v -= 3.6 * (rigO.squash ?? 1) * calm;
        this.curl = -1;
      }
      this.lastState = f.state;
    }
    this.landT += dt;
    let curlTo = 0;
    let syTo = 1 + Math.sin(this.t * 1.7) * 0.012 * (rigO.breath ?? 1) * calm;
    if (this.windingUp) {
      curlTo = 1;
      syTo = 1.045;
    } else if (f.state === 'descend') {
      curlTo = 0.3;
      syTo = 1 + Math.min(0.07, Math.max(0, f.vy) / 5200) * calm;
    } else if (f.state === 'stomp') curlTo = this.landT < 0.14 ? -1 : 0;
    else if (f.state === 'lift') {
      curlTo = 0.35;
      syTo = 1.03;
    }
    const rate = curlTo > this.curl ? 7 : 4;
    this.curl += Math.sign(curlTo - this.curl) * Math.min(Math.abs(curlTo - this.curl), rate * dt);
    const sy = this.sy.step(syTo, dt);
    const sx = 1 + (1 - sy) * 0.65;
    const swing = this.sw.step(Phaser.Math.Clamp(-this.vx * 0.00085, -0.13, 0.13) * (rigO.swing ?? 1) * calm + Math.sin(this.t * 0.9) * 0.018 * calm, dt);
    const still = rigO.swing === 0 && rigO.squash === 0 && rigO.breath === 0;
    let rp: RigPose = { swing, sx, sy, curl: this.curl };
    if (this.def.pose) {
      rp = this.def.pose(this, dt, rp, this.state);
      this.curl = rp.curl;
    }
    if (still) f.setRigPose(0, 1, 1);
    else f.setRigPose(rp.swing, rp.sx, rp.sy);
    this.updateBand(dt, curlTo);
    // ——— heat ———
    if (this.heatImg) {
      const want = this.def.heat?.of ? this.def.heat.of(f) : bossHeat(f);
      this.heat += (want - this.heat) * Math.min(1, dt * 1.2);
      const flick = 0.82 + noise1(this.t * 3.1) * 0.1 + noise1(this.t * 11) * 0.05;
      // fade with the foot (hidden, glitching or phasing)
      this.heatImg.setAlpha(this.heat * flick * f.visualAlpha);
      // the second pass breathes slower, so the heat swells and ebbs
      this.heatImg2?.setAlpha(this.heat * (0.32 + 0.2 * Math.sin(this.t * 2.3)) * (this.def.heat?.boost ?? 1) * f.visualAlpha);
    }
    // ——— glow ———
    if (this.glowImg) {
      const g = this.def.glow!;
      const pulse = Math.sin(this.t * Math.PI * 2 * (g.rate ?? 0.6)) * 0.5 + 0.5;
      const flick = noise1(this.t * 4.3) * 0.12;
      this.glowImg.setAlpha(Math.min(1, (g.base ?? 0.55) + (pulse * (g.depth ?? 0.4) + flick) * calm + this.heat * 0.4) * f.visualAlpha);
    }
    // ——— sway parts ———
    for (const s of this.sways) {
      const o = s.o;
      const idle = noise1(s.sd + this.t * 0.8) * (o.idle ?? 0.06) * calm;
      // sideways moves push it back, falling lifts it, landing flops it
      const push = (-this.vx * 0.0011 - Math.max(0, this.vy) * 0.0002 * (o.flop ?? 1)) * (o.gain ?? 1);
      if (this.landed) s.spring.v += 6 * (o.flop ?? 1) * (o.gain ?? 1) * calm;
      s.img.rotation = s.spring.step(Phaser.Math.Clamp(push * calm + idle, -0.6, 0.6), dt);
    }
    // ——— blinks and looks ———
    const peel = (this.sc as unknown as { peelPos?: { x: number; y: number } }).peelPos;
    for (const b of this.blinks) {
      b.next -= dt;
      if (b.t < 0 && b.next <= 0) {
        b.t = 0;
        b.dbl = crand() < 0.2;
        b.next = 2 + crand() * 3.5;
      }
      let k = 0;
      if (b.t >= 0) {
        b.t += dt;
        const D = 0.2;
        const u = b.t / D;
        k = u < 1 ? Math.sin(u * Math.PI) : 0;
        if (u >= 1) {
          if (b.dbl) {
            b.dbl = false;
            b.t = 0;
          } else b.t = -1;
        }
      }
      b.img.setFrame(Math.round(k * (b.n - 1)));
      if (b.look && peel) {
        const [ex, ey] = f.styleWorld(CX, 130);
        const dx = peel.x - ex;
        const dy = peel.y - ey;
        const d = Math.hypot(dx, dy) || 1;
        const m = Math.min(1, d / 300) * b.look * f.type.scale;
        b.img.x += (b.x0 + (dx / d) * m - b.img.x) * Math.min(1, dt * 6);
        b.img.y += (b.y0 + (dy / d) * m * 0.6 - b.img.y) * Math.min(1, dt * 6);
      }
    }
    for (const w of this.twitches) {
      w.next -= dt;
      if (w.t < 0 && w.next <= 0) {
        w.t = 0;
        w.next = 0.6 + crand() * 2.4;
      }
      if (w.t >= 0) {
        w.t += dt;
        w.img.setFrame(Math.floor(w.t / 0.07) % 2 ? 0 : 1);
        if (w.t > 0.3) {
          w.t = -1;
          w.img.setFrame(0);
        }
      }
    }
    // ——— effects ———
    for (const e of this.emitters) e.follow(dt);
    this.def.tick?.(this, dt, this.state);
    for (const c of this.critters) c.update(dt);
  }

  /** Pick and cross-fade the toe band's frames for the current curl (or the idle wiggle). */
  private updateBand(dt: number, curlTo: number): void {
    const a = this.bandA;
    const b = this.bandB;
    if (!a || !b || !this.tex.band) return;
    const nCurl = CURL_TRACK.length;
    const idle = this.tex.band.wiggle && this.f.state === 'hover' && !this.windingUp && Math.abs(this.curl) < 0.05 && Math.abs(curlTo) < 0.05 && !reduced();
    // one frame at a time: cross-fading two poses would show both sets of toes, ghosted
    b.setVisible(false);
    if (idle) {
      this.wigT += dt * 9;
      a.setFrame(nCurl + (Math.floor(this.wigT) % WIGGLE_N));
      this.shownCurl = 0;
      return;
    }
    let best = 0;
    for (let i = 1; i < nCurl; i++) if (Math.abs(CURL_TRACK[i] - this.curl) < Math.abs(CURL_TRACK[best] - this.curl)) best = i;
    a.setFrame(best);
    this.shownCurl = CURL_TRACK[best];
  }

  die(): void {
    if (!this.counted) return;
    this.counted = false;
    liveSet.delete(this);
    for (const e of this.emitters) e.release();
    for (const c of this.critters) c.release();
    this.def.die?.(this, this.state);
  }
}

const lives = new WeakMap<Foot, LiveFoot | null>();

/** A still foot (animation off) keeps its emissive art as a steady glow: some feet (neon, magma) are drawn dark
 * underneath it, and without it they'd go dull. One canvas, built once per foot type. */
function stillGlow(f: Foot, def: LiveDef): void {
  if (!def.glow) return;
  const sc = f.scene;
  const key = `still_glow_${f.type.id}`;
  if (!sc.textures.exists(key)) addTex(sc, key, styledCanvas(f.type, pose({ heat: 0 }), { live: false, emissive: true }));
  const g = def.glow;
  const img = sc.add.image(0, 0, key).setOrigin(0.5, f.meta.originY).setScale(1 / footRes(f.type)).setBlendMode(Phaser.BlendModes.ADD);
  img.setAlpha(Math.min(1, (g.base ?? 0.55) + (g.depth ?? 0.4) * 0.5));
  f.addLiveArt(img, false, true);
}

/** Run a styled foot's live layer for a frame (GameScene calls this for every foot; others return at once). */
export function styleLive(f: Foot, dt: number): void {
  let st = lives.get(f);
  if (st === undefined) {
    const def = defs[f.type.id];
    const style = styleFor(f.type.id);
    // animation off (graphics settings): the foot keeps its still art, decided once when it first ticks
    st = def && style && !f.liveHost && feetAnimated() && !f.forceStill ? new LiveFoot(f, def, style) : null;
    if (def && style && !st && !f.liveHost) stillGlow(f, def);
    lives.set(f, st);
    if (st) {
      const s = st;
      f.liveHost = { die: () => s.die(), destroy: () => s.die() };
    }
  }
  if (!st || dt <= 0 || !f.alive) return;
  st.update(dt);
}

/** The live state of a foot, if it has one (dev tools and the style sheet). */
export function liveOf(f: Foot): LiveFoot | null {
  return lives.get(f) ?? null;
}
