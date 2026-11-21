// Live layers for Batpeel's Gotham (see src/game/liveBackdrop.ts; the painted scenes are in
// src/content/art/scenes-gotham.ts). The storm builds over the stage: wave 61 a drizzle under a half-hidden moon,
// 62 rain and bats across the moon, 63 a downpour with lightning, 64 a full storm with wind-driven rain. The
// searchlight on the right roof throws its pizza-slice signal onto the clouds on every wave. The Pit drips and
// glows green; the Ha-Ha Funhouse's bulbs chase and its eyes flicker under the same storm.

import Phaser from 'phaser';
import { makeCanvas } from '../../art/util';
import { type LiveCtx, type LiveScene, registerLive } from '../../game/liveBackdrop';
import { audio } from '../../systems/audio';
import { save } from '../../systems/save';

const W = 1920;
const H = 1080;

type Img = Phaser.GameObjects.Image;
type Emitter = Phaser.GameObjects.Particles.ParticleEmitter;

const reduced = () => save.settings.reducedMotion;

function tex(sc: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): string {
  if (!sc.textures.exists(key)) {
    const [c, ctx] = makeCanvas(w, h);
    draw(ctx);
    sc.textures.addCanvas(key, c);
  }
  return key;
}

/** A little bat silhouette, wings up and wings down (two frames as two textures). */
const batTex = (sc: Phaser.Scene, up: boolean) =>
  tex(sc, up ? 'livegt_bat_u' : 'livegt_bat_d', 64, 32, (ctx) => {
    ctx.fillStyle = '#05060c';
    ctx.beginPath();
    ctx.moveTo(32, 18);
    const wy = up ? 2 : 28;
    ctx.quadraticCurveTo(18, wy, 2, up ? 6 : 22);
    ctx.quadraticCurveTo(14, 14, 24, 20);
    ctx.lineTo(32, 24);
    ctx.lineTo(40, 20);
    ctx.quadraticCurveTo(50, 14, 62, up ? 6 : 22);
    ctx.quadraticCurveTo(46, wy, 32, 18);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(32, 16, 5, 0, Math.PI * 2);
    ctx.fill();
  });

/** A jagged lightning bolt, top to bottom. */
const boltTex = (sc: Phaser.Scene, n: number) =>
  tex(sc, `livegt_bolt${n}`, 220, 520, (ctx) => {
    let x = 110;
    const pts: [number, number][] = [[x, 0]];
    for (let y = 40; y <= 520; y += 40) {
      x += (Math.sin(y * 0.07 + n * 3) + (Math.random() - 0.5)) * 34;
      pts.push([Math.max(20, Math.min(200, x)), y]);
    }
    for (const [lw, col] of [[16, 'rgba(170,190,255,0.35)'], [7, 'rgba(220,230,255,0.9)'], [3, '#ffffff']] as const) {
      ctx.beginPath();
      pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
      ctx.strokeStyle = col;
      ctx.lineWidth = lw;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  });

/** The pieces a live layer is built from; everything is destroyed with it. */
class Kit {
  readonly root: Phaser.GameObjects.Container;
  private fades: { o: Img | Phaser.GameObjects.Rectangle; to: number; speed: number }[] = [];
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
  emitter(key: string, cfg: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig, on = true, warm = 0): Emitter {
    const e = this.sc.add.particles(0, 0, key, cfg);
    if (!on) e.stop();
    else if (warm) e.fastForward(warm);
    this.root.add(e);
    return e;
  }
  run(e: Emitter, on: boolean): void {
    if (on && !e.emitting) e.start();
    else if (!on && e.emitting) e.stop();
  }
  fade(o: Img | Phaser.GameObjects.Rectangle, to: number, speed = 0.5): void {
    const f = this.fades.find((x) => x.o === o);
    if (f) {
      f.to = to;
      f.speed = speed;
    } else this.fades.push({ o, to, speed });
  }
  later(ms: number, fn: () => void): void {
    this.timers.push(this.sc.time.delayedCall(ms, fn));
  }
  update(dt: number): void {
    this.t += dt;
    for (const f of this.fades) {
      const a = f.o.alpha;
      const step = f.speed * dt;
      if (Math.abs(f.to - a) <= step) f.o.setAlpha(f.to);
      else f.o.setAlpha(a + Math.sign(f.to - a) * step);
    }
  }
  destroy(): void {
    for (const t of this.timers) t.remove();
    this.timers = [];
    this.sc.tweens.killTweensOf([this.root, ...this.root.list]);
    this.root.destroy();
    this.fades = [];
  }
}

/** A strike across the sky: a bolt, a white flash over the scene, and thunder a moment later. */
function strike(k: Kit, flash: Phaser.GameObjects.Rectangle, a: number, x0 = 160, x1 = 1760): void {
  const im = k.img(boltTex(k.sc, Math.floor(Math.random() * 3)), x0 + Math.random() * (x1 - x0), 0, { add: true, origin: [0.5, 0], sx: 0.7 + Math.random() * 0.5 });
  if (Math.random() < 0.5) im.setFlipX(true);
  k.sc.tweens.add({ targets: im, alpha: { from: 1, to: 0 }, duration: 420, ease: 'Quad.In', onComplete: () => im.destroy() });
  flash.setAlpha(reduced() ? a * 0.3 : a);
  k.sc.tweens.add({ targets: flash, alpha: 0, duration: 460, ease: 'Quad.Out' });
  k.later(130, () => flash.active && flash.setAlpha(Math.max(flash.alpha, a * 0.45)));
  k.later(250 + Math.random() * 600, () => audio.sfx('sfx_thunder', { volume: 0.35 + a, throttle: 800 }));
}

function rainEmitter(k: Kit, freq: number, wind: number): Emitter {
  return k.emitter('p_a7_rain', {
    x: { min: -300, max: W + 100 },
    y: -60,
    lifespan: 1100,
    speedY: { min: 1500, max: 1900 },
    speedX: { min: wind * 0.8, max: wind * 1.2 },
    rotate: -Math.atan2(wind, 1700) * (180 / Math.PI),
    scale: { min: 0.6, max: 1.1 },
    alpha: { min: 0.25, max: 0.55 },
    frequency: reduced() ? freq * 4 : freq,
  }, false);
}

/** The run's wave within its stage (1–5), read off the game scene; 0 outside a run. */
function runWave(sc: Phaser.Scene): number {
  const g = sc as unknown as { run?: { wave?: number }; waveActive?: boolean };
  // between waves (the shop) the backdrop already shows the wave that's coming
  const n = (g.run?.wave ?? 0) + (g.waveActive ? 0 : 1);
  return n > 0 ? ((n - 1) % 5) + 1 : 0;
}

// ——— Goth-Ham Rooftops ———

registerLive('gotham', (ctx: LiveCtx): LiveScene => {
  const k = new Kit(ctx.sc, ctx.layer);
  batTex(k.sc, true);
  batTex(k.sc, false);
  // cloud wisps that drift across the moon (it peeks out between them)
  const clouds = [0, 1, 2, 3].map((i) =>
    k.img('p_gt_cloud', 1100 + i * 260, 110 + (i % 2) * 70, { tint: i % 2 ? 0x2a3254 : 0x3a4468, alpha: 0.92, sx: 1.1 + (i % 2) * 0.3, sy: 0.8 }),
  );
  // the searchlight beam and the signal it throws on the clouds
  const beam = k.img('p_a7_searchlight', 1620, 568, { add: true, origin: [0.5, 1], alpha: 0, sx: 1.25, sy: 1.15 });
  beam.setTint(0xfff2c0);
  const signal = k.img('p_gt_signal', 1160, 170, { add: true, alpha: 0, sx: 0.95, sy: 0.85 });
  const lampGlow = k.img('glow', 1620, 560, { tint: 0xfff4c0, add: true, alpha: 0, sx: 2.2, sy: 1.6 });
  // a storm grade that deepens wave by wave, and the lightning flash
  const storm = k.rect(0x101830, 0, Phaser.BlendModes.MULTIPLY);
  const flash = k.rect(0xdde6ff, 0);
  const rains = [rainEmitter(k, 34, 120), rainEmitter(k, 16, 200), rainEmitter(k, 8, 300), rainEmitter(k, 4, 520)];
  // water pouring from the gargoyles' mouths, and splashes along the cornice
  const spouts = [
    k.emitter('soft', { x: { min: 306, max: 316 }, y: 590, lifespan: 700, frequency: 60, speedY: { min: 200, max: 320 }, speedX: { min: 20, max: 60 }, gravityY: 900, scaleX: 0.03, scaleY: 0.12, alpha: 0.5, tint: 0xc8d8ff }, false),
    k.emitter('soft', { x: { min: 1644, max: 1654 }, y: 590, lifespan: 700, frequency: 60, speedY: { min: 200, max: 320 }, speedX: { min: -60, max: -20 }, gravityY: 900, scaleX: 0.03, scaleY: 0.12, alpha: 0.5, tint: 0xc8d8ff }, false),
  ];
  const splash = k.emitter('soft', { x: { min: 0, max: W }, y: 628, lifespan: 260, frequency: 40, speedY: { min: -120, max: -40 }, speedX: { min: -60, max: 60 }, scale: { start: 0.05, end: 0 }, alpha: 0.6, tint: 0xd8e4ff }, false);
  let wave = ctx.wave;
  let boltT = 4;
  let batT = 3;
  let flickT = 0;
  const setWave = (w: number) => {
    wave = w;
    const i = Math.max(0, Math.min(3, w - 1));
    k.fade(storm, [0.05, 0.16, 0.26, 0.36][i], 0.2);
    rains.forEach((e, j) => k.run(e, j === i));
    spouts.forEach((e) => k.run(e, i >= 1));
    k.run(splash, i >= 1);
    k.fade(beam, [0.35, 0.42, 0.5, 0.5][i], 0.4);
    k.fade(lampGlow, 0.55, 0.4);
  };
  const w0 = runWave(k.sc) || ctx.wave;
  setWave(w0);
  rains[Math.max(0, Math.min(3, w0 - 1))].fastForward(1200);
  const bats = () => {
    // a little flock across the moon
    const n = 4 + Math.floor(Math.random() * 4);
    for (let j = 0; j < n; j++) {
      const im = k.img('livegt_bat_u', 1100 + Math.random() * 120, 150 + Math.random() * 80, { sx: 0.5 + Math.random() * 0.4 });
      const vx = -(220 + Math.random() * 120);
      const vy = -10 + Math.random() * 30;
      let t = 0;
      const ev = k.sc.time.addEvent({
        delay: 16,
        loop: true,
        callback: () => {
          if (!im.active) return ev.remove();
          t += 0.016;
          im.x += vx * 0.016;
          im.y += vy * 0.016 + Math.sin(t * 9 + j) * 0.8;
          im.setTexture(Math.floor(t * 10 + j) % 2 ? 'livegt_bat_u' : 'livegt_bat_d');
          if (im.x < -60) {
            ev.remove();
            im.destroy();
          }
        },
      });
    }
  };
  return {
    setWave,
    update: (dt) => {
      k.update(dt);
      // Act 7's layer doesn't pass the wave on, so follow the run's wave within the stage here
      const rw = runWave(k.sc);
      if (rw && rw !== wave) setWave(rw);
      const t = k.t;
      // clouds crawl across the moon and wrap
      clouds.forEach((c, i) => {
        c.x -= dt * (10 + i * 4) * (wave >= 4 ? 2.2 : 1);
        if (c.x < 980) c.x = 1960;
      });
      // the beam sways; the signal rides its end on the cloud deck
      beam.rotation = -0.62 + Math.sin(t * 0.25) * 0.12;
      const len = 560;
      signal.setPosition(beam.x + Math.sin(beam.rotation) * len, beam.y - Math.cos(beam.rotation) * len * 0.75);
      // the signal dims as clouds pass in front, and flickers like an old lamp
      flickT -= dt;
      const flick = flickT > 0 ? 0.4 : 1;
      if (flickT <= -3 - Math.random() * 6) flickT = 0.12;
      const behind = clouds.some((c) => Math.abs(c.x - signal.x) < 160) ? 0.75 : 1;
      signal.setAlpha(beam.alpha * 1.6 * flick * behind);
      if (wave >= 3) {
        boltT -= dt;
        if (boltT <= 0) {
          boltT = wave >= 4 ? 3 + Math.random() * 3 : 6 + Math.random() * 4;
          strike(k, flash, wave >= 4 ? 0.42 : 0.3);
        }
      }
      if (wave >= 2) {
        batT -= dt;
        if (batT <= 0) {
          batT = 14 + Math.random() * 10;
          bats();
        }
      }
    },
    destroy: () => k.destroy(),
  };
});

// ——— The Pit (Bunion) ———

registerLive('bunion', (ctx: LiveCtx): LiveScene => {
  const k = new Kit(ctx.sc, ctx.layer);
  // dust drifting down the light shaft from the opening
  k.emitter('soft', {
    x: { min: 620, max: 1300 }, y: { min: 60, max: 200 }, lifespan: 7000, frequency: 90,
    speedY: { min: 30, max: 60 }, speedX: { min: -10, max: 10 }, scale: { min: 0.02, max: 0.05 }, alpha: { values: [0, 0.6, 0] }, tint: 0xd8e4ff, blendMode: 'ADD',
  }, true, 6000);
  // drips from the rim far above
  k.emitter('soft', {
    x: { min: 640, max: 1280 }, y: 90, lifespan: 1100, frequency: 420,
    speedY: { min: 400, max: 600 }, gravityY: 400, scaleX: 0.02, scaleY: 0.08, alpha: 0.5, tint: 0xa8c0e8,
  }, true, 1000);
  // Venom bubbling up the two tanks, and their glow breathing
  const glows: Img[] = [];
  for (const x of [250, 1670]) {
    k.emitter('soft', {
      x: { min: x - 50, max: x + 50 }, y: 680, lifespan: 2400, frequency: 110,
      speedY: { min: -170, max: -100 }, speedX: { min: -8, max: 8 }, scale: { min: 0.04, max: 0.1 }, alpha: { values: [0, 0.9, 0] }, tint: 0xc8ffb0, blendMode: 'ADD',
    }, true, 2400);
    glows.push(k.img('glow', x, 520, { tint: 0x7dff6a, add: true, alpha: 0.2, sx: 2.6, sy: 3.4 }));
  }
  return {
    update: (dt) => {
      k.update(dt);
      glows.forEach((gl, i) => gl.setAlpha(0.18 + Math.sin(k.t * 1.6 + i * 2) * 0.08));
    },
    destroy: () => k.destroy(),
  };
});

// ——— Ha-Ha Funhouse (the Jokester) ———

registerLive('jokester', (ctx: LiveCtx): LiveScene => {
  const k = new Kit(ctx.sc, ctx.layer);
  const flash = k.rect(0xe6dcff, 0);
  const rain = rainEmitter(k, 14, 160);
  rain.start();
  rain.fastForward(1200);
  // the bulbs along the swag, chasing in three colours
  const bulbs: Img[] = [];
  const cols = [0xffd23f, 0x9be23a, 0xff5a8a];
  for (let x = 20; x < W; x += 44) {
    const y = 100 + Math.sin(((x % 480) / 480) * Math.PI) * 60 + 8;
    const b = k.img('glow', x, y, { tint: cols[bulbs.length % 3], add: true, alpha: 0.6, sx: 0.22 });
    bulbs.push(b);
  }
  // the face's diamond eyes flicker, sometimes both at once like a wink
  const eyes = [k.img('glow', 830, 290, { tint: 0xd8ff6a, add: true, alpha: 0.5, sx: 1.1 }), k.img('glow', 1090, 290, { tint: 0xd8ff6a, add: true, alpha: 0.5, sx: 1.1 })];
  let boltT = 5;
  let winkT = 4;
  return {
    update: (dt) => {
      k.update(dt);
      const t = k.t;
      const step = Math.floor(t * 6);
      bulbs.forEach((b, i) => b.setAlpha((i + step) % 3 === 0 ? 0.9 : 0.25));
      winkT -= dt;
      const wink = winkT < 0 && winkT > -0.2;
      if (winkT < -0.2) winkT = 3 + Math.random() * 5;
      eyes.forEach((e, i) => e.setAlpha(wink && i === 1 ? 0.05 : 0.45 + Math.sin(t * 7 + i) * 0.12));
      boltT -= dt;
      if (boltT <= 0) {
        boltT = 7 + Math.random() * 6;
        strike(k, flash, 0.25, 100, 600);
      }
    },
    destroy: () => k.destroy(),
  };
});
