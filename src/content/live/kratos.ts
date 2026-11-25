// Live layers for Kratos's nemesis arenas (painted in src/content/art/scenes-kratos.ts; see src/game/liveBackdrop.ts).
// The Titans' Prison: the great clock's hands turn (the minute hand ticks round with a jolt), golden sand pours in
// four streams, embers rise out of the abyss and its glow breathes. The Storm Throne: lightning forks behind the
// colonnade with a flash and thunder, cloud wisps drift past, the braziers burn with blue fire and the thunderbolt
// crest pulses. NzKit is shared by the other nemesis arenas' live layers.

import Phaser from 'phaser';
import { crand } from '../../systems/cosmeticRandom';
import { makeCanvas } from '../../art/util';
import { type LiveCtx, type LiveScene, registerLegacyLive, registerLive } from '../../game/liveBackdrop';
import { audio } from '../../systems/audio';
import { save } from '../../systems/save';
import { ST, TP } from '../art/scenes-kratos';

const W = 1920;
const H = 1080;

type Img = Phaser.GameObjects.Image;
type Emitter = Phaser.GameObjects.Particles.ParticleEmitter;

export const reduced = () => save.settings.reducedMotion;

export function tex(sc: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): string {
  if (!sc.textures.exists(key)) {
    const [c, ctx] = makeCanvas(w, h);
    draw(ctx);
    sc.textures.addCanvas(key, c);
  }
  return key;
}

/** A jagged lightning fork, top to bottom (n picks one of a few shapes). */
export const forkTex = (sc: Phaser.Scene, n: number, tint = 'rgba(170,200,255,0.4)') =>
  tex(sc, `livenz_fork${n}`, 240, 560, (ctx) => {
    let x = 120;
    const pts: [number, number][] = [[x, 0]];
    for (let y = 40; y <= 560; y += 40) {
      x += (Math.sin(y * 0.06 + n * 2.3) + (crand() - 0.5)) * 36;
      pts.push([Math.max(20, Math.min(220, x)), y]);
    }
    for (const [lw, col] of [[18, tint], [7, 'rgba(225,238,255,0.9)'], [3, '#ffffff']] as const) {
      ctx.beginPath();
      pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
      ctx.strokeStyle = col;
      ctx.lineWidth = lw;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  });

/** The pieces a live layer is built from; everything is destroyed with it. */
export class NzKit {
  readonly root: Phaser.GameObjects.Container;
  private timers: Phaser.Time.TimerEvent[] = [];
  t = 0;
  constructor(
    readonly sc: Phaser.Scene,
    layer: Phaser.GameObjects.Container,
  ) {
    this.root = sc.add.container(0, 0);
    layer.add(this.root);
  }
  img(key: string, x: number, y: number, o: { tint?: number; add?: boolean; alpha?: number; sx?: number; sy?: number; origin?: [number, number] } = {}): Img {
    const im = this.sc.add.image(x, y, key).setAlpha(o.alpha ?? 1).setScale(o.sx ?? 1, o.sy ?? o.sx ?? 1);
    if (o.tint !== undefined) im.setTint(o.tint);
    if (o.add) im.setBlendMode(Phaser.BlendModes.ADD);
    if (o.origin) im.setOrigin(o.origin[0], o.origin[1]);
    this.root.add(im);
    return im;
  }
  rect(color: number, alpha: number, blend = Phaser.BlendModes.ADD): Phaser.GameObjects.Rectangle {
    const r = this.sc.add.rectangle(W / 2, H / 2, W, H, color, 1).setAlpha(alpha).setBlendMode(blend);
    this.root.add(r);
    return r;
  }
  gfx(add = false): Phaser.GameObjects.Graphics {
    const g = this.sc.add.graphics();
    if (add) g.setBlendMode(Phaser.BlendModes.ADD);
    this.root.add(g);
    return g;
  }
  emitter(key: string, cfg: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig, warm = 0): Emitter {
    const e = this.sc.add.particles(0, 0, key, { ...cfg, frequency: reduced() && cfg.frequency ? Number(cfg.frequency) * 3 : cfg.frequency });
    if (warm) e.fastForward(warm);
    this.root.add(e);
    return e;
  }
  later(ms: number, fn: () => void): void {
    this.timers.push(this.sc.time.delayedCall(ms, fn));
  }
  /** A fork of lightning across the sky with a flash over the scene and thunder a moment later. */
  strike(flash: Phaser.GameObjects.Rectangle, a: number, x0: number, x1: number, y = 0, scale = 1): void {
    const im = this.img(forkTex(this.sc, Math.floor(crand() * 3)), x0 + crand() * (x1 - x0), y, { add: true, origin: [0.5, 0], sx: scale * (0.7 + crand() * 0.5) });
    if (crand() < 0.5) im.setFlipX(true);
    this.sc.tweens.add({ targets: im, alpha: { from: 1, to: 0 }, duration: 420, ease: 'Quad.In', onComplete: () => im.destroy() });
    flash.setAlpha(reduced() ? a * 0.3 : a);
    this.sc.tweens.add({ targets: flash, alpha: 0, duration: 460, ease: 'Quad.Out' });
    this.later(250 + crand() * 600, () => audio.sfx('sfx_thunder', { volume: 0.3 + a, throttle: 800 }));
  }
  update(dt: number): void {
    this.t += dt;
  }
  destroy(): void {
    for (const t of this.timers) t.remove();
    this.timers = [];
    this.sc.tweens.killTweensOf([this.root, ...this.root.list]);
    this.root.destroy();
  }
}

// ——— The Titans' Prison ———

// (redrawn with the location kit in src/content/art/scene-titanking.ts, whose own live layer runs the sand, the lava,
// the chains and the fight's cues; this old layer stays for the before/after page, ?dev&stages)
registerLegacyLive('titanking', (ctx: LiveCtx): LiveScene => {
  const k = new NzKit(ctx.sc, ctx.layer);
  const C = TP.clock;
  // the abyss glow breathing under the ledge
  const pit = k.img('glow', 960, 760, { tint: 0xff6a1a, add: true, alpha: 0.3, sx: 9, sy: 1.6 });
  // the clock's hands: an hour hand drifting, a minute hand that ticks round with a jolt
  const hands = k.gfx();
  const face = k.img('glow', C.x, C.y, { tint: 0xffb040, add: true, alpha: 0.12, sx: 3.4 });
  let minute = -Math.PI / 2 + 0.4;
  let tickT = 0;
  let jolt = 0;
  const drawHands = () => {
    hands.clear();
    const hour = k.t * 0.04 - Math.PI / 2 + 2.2;
    for (const [a, len, w] of [[hour, C.r * 0.45, 26], [minute + jolt, C.r * 0.72, 16]] as const) {
      const ex = C.x + Math.cos(a) * len;
      const ey = C.y + Math.sin(a) * len;
      hands.lineStyle(w + 8, 0x2a1810, 1);
      hands.lineBetween(C.x, C.y, ex, ey);
      hands.lineStyle(w, 0xc9873a, 1);
      hands.lineBetween(C.x, C.y, ex, ey);
      hands.lineStyle(w * 0.3, 0xffd890, 0.8);
      hands.lineBetween(C.x, C.y, C.x + Math.cos(a) * len * 0.9, C.y + Math.sin(a) * len * 0.9);
      // an hourglass tip on each hand
      hands.fillStyle(0xffd27a, 1);
      hands.fillTriangle(ex - Math.sin(a) * w, ey + Math.cos(a) * w, ex + Math.sin(a) * w, ey - Math.cos(a) * w, ex + Math.cos(a) * w * 1.6, ey + Math.sin(a) * w * 1.6);
    }
    hands.fillStyle(0xc9873a, 1);
    hands.fillCircle(C.x, C.y, 26);
    hands.lineStyle(5, 0x2a1810, 1);
    hands.strokeCircle(C.x, C.y, 26);
  };
  // four streams of golden sand pouring down into the pit
  const sands = TP.sand.map((x) =>
    k.emitter('soft', {
      x: { min: x - 12, max: x + 12 }, y: { min: -20, max: 40 }, lifespan: 2200, frequency: 40,
      speedY: { min: 300, max: 420 }, speedX: { min: -8, max: 8 }, scale: { min: 0.03, max: 0.07 },
      alpha: { values: [0, 0.8, 0.7, 0] }, tint: [0xffd27a, 0xf0c860, 0xffe8a8], blendMode: 'ADD',
    }, 2200),
  );
  void sands;
  // embers rising out of the abyss
  k.emitter('soft', {
    x: { min: 0, max: W }, y: 760, lifespan: 5000, frequency: 120,
    speedY: { min: -90, max: -40 }, speedX: { min: -20, max: 20 }, scale: { min: 0.03, max: 0.08 },
    alpha: { values: [0, 0.9, 0] }, tint: [0xff9a3a, 0xffd27a, 0xff5a1a], blendMode: 'ADD',
  }, 4000);
  drawHands();
  return {
    update: (dt) => {
      k.update(dt);
      tickT += dt;
      if (tickT > 1.2) {
        tickT = 0;
        minute += Math.PI / 30;
        jolt = 0.06;
        face.setAlpha(0.22);
      }
      jolt *= Math.pow(0.02, dt);
      face.setAlpha(Math.max(0.12, face.alpha - dt * 0.2));
      pit.setAlpha(0.26 + Math.sin(k.t * 1.3) * 0.08);
      drawHands();
    },
    destroy: () => k.destroy(),
  };
});

// ——— The Storm Throne ———

registerLive('zeus', (ctx: LiveCtx): LiveScene => {
  const k = new NzKit(ctx.sc, ctx.layer);
  const flash = k.rect(0xdde8ff, 0);
  // cloud wisps drifting across the colonnade
  k.emitter('soft', {
    x: -200, y: { min: 160, max: 640 }, lifespan: 26000, frequency: 900,
    speedX: { min: 60, max: 110 }, scaleX: { min: 2.4, max: 4 }, scaleY: { min: 0.5, max: 0.9 },
    alpha: { values: [0, 0.22, 0.18, 0] }, tint: [0xb8b8e8, 0x8a8ac8],
  }, 20000);
  // blue lightning-fire in the braziers
  for (const b of ST.braziers) {
    k.emitter('soft', {
      x: { min: b.x - 40, max: b.x + 40 }, y: b.y - 90, lifespan: 700, frequency: 30,
      speedY: { min: -240, max: -140 }, speedX: { min: -20, max: 20 }, scale: { start: 0.18, end: 0.02 },
      alpha: { start: 0.9, end: 0 }, tint: [0x7fc8ff, 0xd8f0ff, 0x4f8aff], blendMode: 'ADD',
    }, 700);
  }
  const crest = k.img('glow', ST.throne.x, ST.throne.y - 300, { tint: 0x9fd8ff, add: true, alpha: 0.3, sx: 2.2 });
  const rift = k.img('glow', ST.rift.x, ST.rift.y + 10, { tint: 0xd8ecff, add: true, alpha: 0.2, sx: 7, sy: 1.4 });
  let next = 2.5;
  return {
    update: (dt) => {
      k.update(dt);
      crest.setAlpha(0.26 + Math.sin(k.t * 2.4) * 0.1);
      rift.setAlpha(0.18 + Math.sin(k.t * 0.9) * 0.06);
      next -= dt;
      if (next <= 0) {
        next = 3 + crand() * 4;
        k.strike(flash, 0.22, 180, W - 180, 60, 0.9);
        if (crand() < 0.4) k.later(160, () => k.strike(flash, 0.12, 180, W - 180, 60, 0.7));
      }
    },
    destroy: () => k.destroy(),
  };
});
