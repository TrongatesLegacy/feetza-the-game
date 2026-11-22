// The live half of the location kit (src/art/scene): registers a scene painted as a layer stack (layers.ts) and runs
// its live layer. With Animated stages on, the scene's base is painted without its moving layers; each moving layer
// is baked to its own texture and stacked back in place (with any still layers that must draw over it), so the live
// code only has to move them. With it off, nothing here runs and the still shows every layer painted in place.
//
// Helpers for the motions the kit's scenes share: sway (a hinge: palm crowns, curtains, hanging lamps), bob and drift
// (boats, clouds, gulls), flicker (flames, neon), and soft glows; plus the stage's wave as 0 (first wave) … 1 (boss).

import Phaser from 'phaser';
import { type SceneSpec, bakePiece, paintLiveBase, paintShade, paintStill, planLive } from '../art/scene/layers';
import { registerScene } from '../art/registry';
import { crand } from '../systems/cosmeticRandom';
import { save } from '../systems/save';
import { type LiveCtx, registerLive } from './liveBackdrop';

type Img = Phaser.GameObjects.Image;
type Container = Phaser.GameObjects.Container;

/** The light across a stage: 0 on its first wave … 1 on its last wave at the location (wave 4; the boss's wave 5
 * is fought in its arena, so a location's live layer only shows it on the before/after page). */
export const waveK = (w: number): number => Phaser.Math.Clamp((w - 1) / 3, 0, 1);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
/** Reduced motion (Settings): moving scenery moves less. */
export const calm = (): number => (save.settings.reducedMotion ? 0.35 : 1);

/** What a scene's live code gets: its baked layers in place, its slots, and helpers. */
export class KitLive {
  readonly sc: Phaser.Scene;
  readonly root: Container;
  readonly spec: SceneSpec;
  private sprites = new Map<string, Img>();
  private slots = new Map<string, Container>();
  private extra: Phaser.GameObjects.GameObject[] = [];

  constructor(spec: SceneSpec, ctx: LiveCtx) {
    this.sc = ctx.sc;
    this.root = ctx.layer;
    this.spec = spec;
    const keys = bake(ctx.sc, spec);
    ctx.setBase?.(keys.base);
    for (const [i, p] of keys.plan.pieces.entries()) {
      if (p.kind === 'slot') {
        const c = this.sc.add.container(0, 0);
        this.root.add(c);
        this.slots.set(p.layer.id, c);
        continue;
      }
      const img = this.sc.add.image(p.box.x, p.box.y, keys.pieces[i]).setOrigin(0, 0);
      if (p.kind === 'sprite' && p.layer.res) img.setDisplaySize(p.box.w, p.box.h);
      this.root.add(img);
      if (p.kind === 'sprite') {
        this.sprites.set(p.layer.id, img);
        if (p.layer.liveOnly) img.setAlpha(0);
      }
    }
    // the scene's shade (vignette, calm behind the lanes) over the whole stack, from a small texture
    if (keys.shade) this.img(keys.shade, 0, 0, { origin: [0, 0], scale: SHADE_K });
    for (const l of keys.plan.tops) {
      const c = this.sc.add.container(0, 0);
      this.root.add(c);
      this.slots.set(l.id, c);
    }
  }

  /** A moving layer's sprite (placed where it paints). */
  sprite(id: string): Img {
    const s = this.sprites.get(id);
    if (!s) throw new Error(`${this.spec.id}: no moving layer ${id}`);
    return s;
  }

  /** A slot's container (objects added to it sit at that point in the stack). */
  slot(id: string): Container {
    const s = this.slots.get(id);
    if (!s) throw new Error(`${this.spec.id}: no slot ${id}`);
    return s;
  }

  /** Move a sprite's origin to a screen point without moving it (a hinge to sway or a centre to scale about). */
  pivot(img: Img, x: number, y: number): Img {
    const ox = ((x - img.x) / img.scaleX + img.displayOriginX) / img.width;
    const oy = ((y - img.y) / img.scaleY + img.displayOriginY) / img.height;
    img.setOrigin(ox, oy).setPosition(x, y);
    return img;
  }

  /** A canvas texture made once per game. */
  tex(key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void): string {
    if (!this.sc.textures.exists(key)) {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const g = c.getContext('2d')!;
      g.lineJoin = 'round';
      g.lineCap = 'round';
      draw(g);
      this.sc.textures.addCanvas(key, c);
    }
    return key;
  }

  /** An image in a container (the root unless given). */
  img(key: string, x: number, y: number, o: { into?: Container; add?: boolean; alpha?: number; scale?: number; sx?: number; sy?: number; tint?: number; origin?: [number, number] } = {}): Img {
    const im = this.sc.add.image(x, y, key).setAlpha(o.alpha ?? 1);
    im.setScale(o.sx ?? o.scale ?? 1, o.sy ?? o.scale ?? 1);
    if (o.add) im.setBlendMode(Phaser.BlendModes.ADD);
    if (o.tint !== undefined) im.setTint(o.tint);
    if (o.origin) im.setOrigin(o.origin[0], o.origin[1]);
    (o.into ?? this.root).add(im);
    return im;
  }

  /** A soft additive glow (the shared 'glow' sprite). */
  glow(x: number, y: number, r: number, color: number, alpha: number, o: { into?: Container; sy?: number } = {}): Img {
    return this.img('glow', x, y, { into: o.into, add: true, alpha, sx: (r * 2) / 256, sy: ((r * 2) / 256) * (o.sy ?? 1), tint: color });
  }

  /** A full-screen colour wash (MULTIPLY to darken or tint, ADD to light, SCREEN to lift). */
  wash(color: number, alpha: number, blend: Phaser.BlendModes = Phaser.BlendModes.MULTIPLY, into?: Container): Phaser.GameObjects.Rectangle {
    const r = this.sc.add.rectangle(960, 540, 1920, 1080, color, 1).setAlpha(alpha).setBlendMode(blend);
    (into ?? this.root).add(r);
    return r;
  }

  /** A particle emitter, pre-warmed. */
  emitter(texture: string, cfg: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig, warm = 3000, into?: Container): Phaser.GameObjects.Particles.ParticleEmitter {
    const e = this.sc.add.particles(0, 0, texture, cfg);
    if (warm) e.fastForward(warm);
    (into ?? this.root).add(e);
    this.extra.push(e);
    return e;
  }

  destroy(): void {
    for (const e of this.extra) e.destroy();
    this.root.removeAll(true);
  }
}

export interface KitHooks {
  setWave?(wave: number): void;
  /** A stomp at (x, y) or a big moment shaking the room (power 0…1). */
  impact?(x: number, y: number, power: number): void;
  /** dt and the scene's running time t (s). */
  update(dt: number, t: number): void;
  destroy?(): void;
}

/** Make (once per game) the live base and every baked piece of a scene. */
const SHADE_K = 4;

function bake(sc: Phaser.Scene, spec: SceneSpec): { base: string; pieces: string[]; plan: ReturnType<typeof planLive>; shade: string | null } {
  const plan = planLive(spec);
  let shade: string | null = `bgk_${spec.id}_shade`;
  if (!sc.textures.exists(shade)) {
    const c = paintShade(spec, SHADE_K);
    if (c) sc.textures.addCanvas(shade, c);
    else shade = null;
  }
  const base = `bgk_${spec.id}_base`;
  if (!sc.textures.exists(base)) sc.textures.addCanvas(base, paintLiveBase(spec, plan.base));
  const pieces = plan.pieces.map((p, i) => {
    const key = `bgk_${spec.id}_${i}_${p.kind === 'overlay' ? 'ov' : p.layer.id}`;
    if (p.kind !== 'slot' && !sc.textures.exists(key)) sc.textures.addCanvas(key, bakePiece(spec, p));
    return key;
  });
  return { base, pieces, plan, shade };
}

/** Register a scene painted with the location kit: its still, and its live layer. */
export function registerKitScene(spec: SceneSpec, live?: (k: KitLive, wave: number) => KitHooks): void {
  registerScene(spec.id, { info: spec.info, draw: (ctx) => paintStill(spec, ctx) });
  registerLive(
    spec.id,
    (ctx) => {
      const k = new KitLive(spec, ctx);
      const hooks = live?.(k, ctx.wave) ?? { update: () => {} };
      let t = crand() * 100;
      return {
        setWave: (w) => hooks.setWave?.(w),
        impact: (x, y, p) => hooks.impact?.(x, y, p * calm()),
        update: (dt) => hooks.update(dt, (t += dt)),
        destroy: () => {
          hooks.destroy?.();
          k.destroy();
        },
      };
    },
    (sc) => void bake(sc, spec),
    (sc) => {
      for (const key of sc.textures.getTextureKeys()) if (key.startsWith(`bgk_${spec.id}_`)) sc.textures.remove(key);
    },
  );
}

// ——— motions ———

/** A smooth wandering value in −1…1 (layered sines: never repeats visibly). */
export function wander(t: number, seed: number, speed = 1): number {
  return Math.sin(t * 0.9 * speed + seed) * 0.5 + Math.sin(t * 2.3 * speed + seed * 1.7) * 0.3 + Math.sin(t * 5.1 * speed + seed * 3.1) * 0.2;
}

/** Flame flicker in about 0.6…1.15 (fast, irregular). */
export function flicker(t: number, seed: number): number {
  return 0.88 + Math.sin(t * 9.1 + seed) * 0.12 + Math.sin(t * 15.7 + seed * 2) * 0.08 + Math.sin(t * 23.3 + seed * 3) * 0.05;
}

/** Sway a hinged sprite: gusts on a slow swell, amplitude in radians. */
export function sway(img: Img, t: number, seed: number, amp: number, speed = 1): void {
  img.rotation = (Math.sin(t * 0.8 * speed + seed) * 0.6 + Math.sin(t * 1.9 * speed + seed * 2.1) * 0.3 + Math.sin(t * 4.3 * speed + seed) * 0.1) * amp * calm();
}
