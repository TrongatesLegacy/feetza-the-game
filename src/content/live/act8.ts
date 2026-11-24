// Live layers for Act 8 · Norse (see src/game/liveBackdrop.ts). The weather turns wave by wave on the
// road to Ragnarök: Jotunheim goes from a clear aurora night to a blizzard with a red glow on the
// horizon; Bifröst from shimmering sunlight to storm, lightning and fire. Surtr's bridge burns a
// little more with every phase of the fight. The painted scenes are in src/content/art/scenes-act8.ts.

import Phaser from 'phaser';
import { crand } from '../../systems/cosmeticRandom';
import { aurora, flame, glow } from '../../art/sceneKit';
import { makeCanvas, rgba, rng } from '../../art/util';
import { type LiveCtx, type LiveScene, registerLegacyLive } from '../../game/liveBackdrop';

const W = 1920;

type Img = Phaser.GameObjects.Image;
type Emitter = Phaser.GameObjects.Particles.ParticleEmitter;

// ——— Textures (made once per game) ———

function tex(sc: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): string {
  if (!sc.textures.exists(key)) {
    const [c, ctx] = makeCanvas(w, h);
    draw(ctx);
    sc.textures.addCanvas(key, c);
  }
  return key;
}

/** A soft aurora curtain (green, cyan, violet). */
const auroraTex = (sc: Phaser.Scene) =>
  tex(sc, 'live8_aurora', 1400, 380, (ctx) => {
    ctx.filter = 'blur(6px)';
    aurora(ctx, [[0, 300], [350, 230], [700, 290], [1050, 210], [1400, 280]], ['#3dffb4', '#4ae0ff', '#9a7bff'], 260, 0.5, rng(81));
  });

/** A soft cloud puff (white, tinted in place). */
const cloudTex = (sc: Phaser.Scene) =>
  tex(sc, 'live8_cloud', 420, 200, (ctx) => {
    const r = rng(17);
    ctx.filter = 'blur(3px)';
    for (let i = 0; i < 9; i++) {
      const x = 80 + r() * 260;
      const y = 90 + (r() - 0.5) * 50;
      const rr = 40 + r() * 50;
      const g = ctx.createRadialGradient(x, y - rr * 0.3, rr * 0.2, x, y, rr);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.7, 'rgba(235,240,255,0.9)');
      g.addColorStop(1, 'rgba(220,228,250,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, rr, 0, Math.PI * 2);
      ctx.fill();
    }
  });

/** A long, thin gust of wind-blown snow. */
const streakTex = (sc: Phaser.Scene) =>
  tex(sc, 'live8_streak', 900, 60, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 900, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.filter = 'blur(8px)';
    ctx.beginPath();
    ctx.ellipse(450, 30, 430, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  });

/** A diagonal band of light that sweeps the rainbow. */
const shimmerTex = (sc: Phaser.Scene) =>
  tex(sc, 'live8_shimmer', 260, 600, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 260, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 260, 600);
  });

/** One tongue of fire (it flickers by scaling). */
const flameTex = (sc: Phaser.Scene) =>
  tex(sc, 'live8_flame', 160, 240, (ctx) => {
    glow(ctx, 80, 170, 80, '#ff6a1a', 0.5);
    flame(ctx, 80, 232, 120, 220, rng(5), ['#e8380e', '#ff8a1e', '#ffe28a']);
    flame(ctx, 80, 232, 60, 120, rng(6), ['#ff9a2a', '#ffd060', '#ffffff']);
  });

/** A forked lightning bolt (two shapes). */
const boltTex = (sc: Phaser.Scene, k: number, col: string) =>
  tex(sc, `live8_bolt${k}_${col.slice(1)}`, 300, 560, (ctx) => {
    const r = rng(300 + k);
    const pts: [number, number][] = [[150, 0]];
    let x = 150;
    for (let y = 30; y < 560; y += 30 + r() * 30) {
      x = Math.max(30, Math.min(270, x + (r() - 0.5) * 90));
      pts.push([x, y]);
    }
    ctx.lineJoin = 'round';
    for (const [lw, c] of [[18, rgba(col, 0.25)], [8, rgba(col, 0.8)], [3, '#ffffff']] as [number, string][]) {
      ctx.beginPath();
      pts.forEach(([bx, by], i) => (i ? ctx.lineTo(bx, by) : ctx.moveTo(bx, by)));
      ctx.strokeStyle = c;
      ctx.lineWidth = lw;
      ctx.stroke();
      // a fork off the middle
      const [fx, fy] = pts[Math.floor(pts.length / 2)];
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx + 60, fy + 70);
      ctx.lineTo(fx + 40, fy + 150);
      ctx.stroke();
    }
  });

/** A dark wave crest with a white cap, tileable across. */
const waveTex = (sc: Phaser.Scene) =>
  tex(sc, 'live8_wave', 960, 120, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(0, 120);
    ctx.lineTo(0, 60);
    for (let x = 0; x < 960; x += 120) ctx.quadraticCurveTo(x + 50, 10, x + 120, 60);
    ctx.lineTo(960, 120);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 20, 0, 120);
    g.addColorStop(0, '#2e5470');
    g.addColorStop(1, '#0c1824');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(220,240,255,0.8)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, 60);
    for (let x = 0; x < 960; x += 120) ctx.quadraticCurveTo(x + 50, 10, x + 120, 60);
    ctx.stroke();
  });

/** A loop of serpent's coil rising out of the sea. */
const coilTex = (sc: Phaser.Scene) =>
  tex(sc, 'live8_coil', 320, 170, (ctx) => {
    const x = 160;
    const y = 165;
    const w = 280;
    const h = 120;
    const t = 46;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.bezierCurveTo(x - w / 2, y - h * 1.3, x + w / 2, y - h * 1.3, x + w / 2, y);
    ctx.lineTo(x + w / 2 - t, y);
    ctx.bezierCurveTo(x + w / 2 - t, y - (h - t) * 1.25, x - w / 2 + t, y - (h - t) * 1.25, x - w / 2 + t, y);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, y - h, 0, y);
    g.addColorStop(0, '#4a9a7a');
    g.addColorStop(1, '#173a2c');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#2a1810';
    ctx.lineWidth = 4;
    ctx.stroke();
    for (let k = 1; k < 7; k++) {
      const u = k / 7;
      const a = Math.PI * (1 - u);
      const sx = x + Math.cos(a) * (w / 2 - t / 2);
      const sy = y - Math.sin(a) * h * 0.95;
      ctx.beginPath();
      ctx.moveTo(sx - 8, sy + 4);
      ctx.lineTo(sx + Math.cos(a) * 10, sy - 22);
      ctx.lineTo(sx + 8, sy + 4);
      ctx.closePath();
      ctx.fillStyle = '#e8d36a';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  });

// ——— A small toolkit shared by the scenes ———

/** Everything a live scene made, with smooth fades towards target alphas. */
class Kit {
  readonly root: Phaser.GameObjects.Container;
  t = 0;
  private fades: { o: { alpha: number; setAlpha(a: number): unknown }; to: number; speed: number }[] = [];
  private emitters: Emitter[] = [];
  private timers: Phaser.Time.TimerEvent[] = [];

  constructor(readonly sc: Phaser.Scene, layer: Phaser.GameObjects.Container) {
    this.root = sc.add.container(0, 0).setAlpha(0);
    layer.add(this.root);
    // fade in with the backdrop crossfade
    sc.tweens.add({ targets: this.root, alpha: 1, duration: 1200 });
  }

  img(key: string, x: number, y: number, o: { tint?: number; add?: boolean; alpha?: number; sx?: number; sy?: number; origin?: [number, number] } = {}): Img {
    const im = this.sc.add.image(x, y, key).setAlpha(o.alpha ?? 1).setScale(o.sx ?? 1, o.sy ?? o.sx ?? 1);
    if (o.tint !== undefined) im.setTint(o.tint);
    if (o.add) im.setBlendMode(Phaser.BlendModes.ADD);
    if (o.origin) im.setOrigin(o.origin[0], o.origin[1]);
    this.root.add(im);
    return im;
  }

  rect(color: number, alpha: number, y0 = 0, y1 = 1080, mode?: Phaser.BlendModes): Phaser.GameObjects.Rectangle {
    const r = this.sc.add.rectangle(W / 2, (y0 + y1) / 2, W, y1 - y0, color).setAlpha(alpha);
    if (mode !== undefined) r.setBlendMode(mode);
    this.root.add(r);
    return r;
  }

  emitter(texture: string, cfg: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig, on: boolean, warm = 5000): Emitter {
    const e = this.sc.add.particles(0, 0, texture, cfg);
    if (on) e.fastForward(warm);
    else e.stop();
    this.root.add(e);
    this.emitters.push(e);
    return e;
  }

  /** Start or stop an emitter (warming it up so the weather doesn't trickle in from nothing). */
  run(e: Emitter, on: boolean): void {
    if (on && !e.emitting) {
      e.start();
      e.fastForward(1500);
    } else if (!on && e.emitting) e.stop();
  }

  /** Ease this object's alpha towards `to` (per second). */
  fade(o: { alpha: number; setAlpha(a: number): unknown }, to: number, speed = 0.6): void {
    const f = this.fades.find((x) => x.o === o);
    if (f) {
      f.to = to;
      f.speed = speed;
    } else this.fades.push({ o, to, speed });
  }

  every(ms: number, fn: () => void): void {
    this.timers.push(this.sc.time.addEvent({ delay: ms, loop: true, callback: fn }));
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
    this.emitters = [];
    this.fades = [];
  }
}

/** Drifting cloud puffs across a band; they wrap round the screen. */
function cloudRow(k: Kit, n: number, y0: number, y1: number, tint: number, alpha: number, speed: number, scale = 1.4): Img[] {
  cloudTex(k.sc);
  const out: Img[] = [];
  for (let i = 0; i < n; i++) {
    const im = k.img('live8_cloud', (i / n) * (W + 600) - 300 + crand() * 120, y0 + crand() * (y1 - y0), { tint, alpha, sx: scale * (0.8 + crand() * 0.6), sy: scale * (0.6 + crand() * 0.4) });
    im.setData('v', speed * (0.7 + crand() * 0.6));
    out.push(im);
  }
  return out;
}

function drift(row: Img[], dt: number): void {
  for (const c of row) {
    c.x += Number(c.getData('v')) * dt;
    if (c.x > W + 340) c.x = -340;
    if (c.x < -340) c.x = W + 340;
  }
}

/** A row of flickering flames (positions given); show the first `n`. */
class Fires {
  readonly ims: { im: Img; glow: Img; seed: number; base: number }[] = [];
  shown = 0;
  constructor(
    private k: Kit,
    pts: [number, number, number][],
  ) {
    flameTex(k.sc);
    for (const [x, y, s] of pts) {
      const gl = k.img('glow', x, y - 60 * s, { tint: 0xff6a1a, add: true, alpha: 0, sx: 1.6 * s, sy: 1.2 * s });
      const im = k.img('live8_flame', x, y, { add: true, alpha: 0, sx: s, origin: [0.5, 0.97] });
      this.ims.push({ im, glow: gl, seed: crand() * 10, base: s });
    }
  }
  show(n: number, a = 1): void {
    this.shown = n;
    this.ims.forEach((f, i) => {
      this.k.fade(f.im, i < n ? a : 0, 0.8);
      this.k.fade(f.glow, i < n ? 0.55 * a : 0, 0.8);
    });
  }
  update(t: number): void {
    for (const f of this.ims) {
      const n = Math.sin(t * 9 + f.seed) * 0.5 + Math.sin(t * 15.3 + f.seed * 2) * 0.5;
      f.im.setScale(f.base * (1 + n * 0.06), f.base * (1 + n * 0.16));
      f.im.rotation = Math.sin(t * 3 + f.seed) * 0.06;
    }
  }
}

/** A lightning strike somewhere across the sky with a white flash. */
function strike(k: Kit, flash: Phaser.GameObjects.Rectangle, col: string, x0 = 200, x1 = 1720, y = 120, a = 0.3): void {
  const kk = Math.floor(crand() * 2);
  const key = boltTex(k.sc, kk, col);
  const im = k.img(key, x0 + crand() * (x1 - x0), y, { add: true, origin: [0.5, 0], sx: 0.8 + crand() * 0.5 });
  if (crand() < 0.5) im.setFlipX(true);
  k.sc.tweens.add({ targets: im, alpha: { from: 1, to: 0 }, duration: 380, ease: 'Quad.In', onComplete: () => im.destroy() });
  flash.setAlpha(a);
  k.sc.tweens.add({ targets: flash, alpha: 0, duration: 420, ease: 'Quad.Out' });
  // a second, smaller flicker a moment later
  k.later(120, () => flash.active && flash.setAlpha(Math.max(flash.alpha, a * 0.5)));
}

// ——— Jotunheim Ice Fields ———
// (redrawn with the location kit in src/content/art/scene-jotunheim.ts, whose own live layer runs the aurora, the
// clouds and the weather by wave; this old layer stays for the before/after page, ?dev&stages)

registerLegacyLive('jotunheim', (ctx: LiveCtx): LiveScene => {
  const k = new Kit(ctx.sc, ctx.layer);
  auroraTex(k.sc);
  streakTex(k.sc);
  const au = [k.img('live8_aurora', 640, 200, { add: true, alpha: 0, sx: 1.2 }), k.img('live8_aurora', 1380, 170, { add: true, alpha: 0, sx: -1.1, sy: 0.9 })];
  const deck = cloudRow(k, 9, 20, 130, 0x2a3668, 0.9, 10, 1.6);
  const low = cloudRow(k, 8, 200, 320, 0x8a96c0, 0, 22, 1.8);
  const red = k.img('glow', 960, 500, { tint: 0xff3a2a, add: true, alpha: 0, sx: 9, sy: 1.4 });
  const white = k.rect(0xeef4ff, 0, 0, 1080);
  const light = k.emitter('soft', {
    x: { min: -100, max: W + 100 }, y: -20, lifespan: 9000, frequency: 70,
    speedY: { min: 50, max: 110 }, speedX: { min: -20, max: 30 }, scale: { min: 0.05, max: 0.13 }, alpha: { min: 0.5, max: 0.9 },
  }, false);
  const heavy = k.emitter('soft', {
    x: { min: -300, max: W + 100 }, y: -20, lifespan: 7000, frequency: 18,
    speedY: { min: 90, max: 170 }, speedX: { min: 20, max: 120 }, scale: { min: 0.06, max: 0.18 }, alpha: { min: 0.55, max: 0.95 },
  }, false);
  const blizz = k.emitter('soft', {
    x: { min: -900, max: W }, y: { min: -40, max: 700 }, lifespan: 4000, frequency: 5,
    speedY: { min: 80, max: 200 }, speedX: { min: 380, max: 680 }, scale: { min: 0.05, max: 0.2 }, alpha: { min: 0.5, max: 1 },
  }, false);
  let gustT = 2;
  const setWave = (w: number) => {
    const i = Math.max(0, Math.min(3, w - 1));
    au.forEach((a) => k.fade(a, [0.65, 0.4, 0.2, 0.08][i], 0.4));
    deck.forEach((c) => k.fade(c, [0.75, 0.9, 1, 1][i], 0.4));
    low.forEach((c) => k.fade(c, [0, 0.25, 0.7, 0.9][i], 0.4));
    k.fade(red, [0, 0, 0.12, 0.42][i], 0.2);
    k.run(light, i === 1);
    k.run(heavy, i === 2);
    k.run(blizz, i === 3);
  };
  setWave(ctx.wave);
  let wave = ctx.wave;
  return {
    setWave: (w) => {
      wave = w;
      setWave(w);
    },
    update: (dt) => {
      k.update(dt);
      au[0].x = 640 + Math.sin(k.t * 0.13) * 160;
      au[1].x = 1380 + Math.sin(k.t * 0.1 + 2) * 140;
      au[0].scaleY = 1.2 * (1 + Math.sin(k.t * 0.7) * 0.08);
      au[1].scaleY = 0.9 * (1 + Math.sin(k.t * 0.6 + 1) * 0.1);
      drift(deck, dt);
      drift(low, dt * (wave >= 4 ? 4 : 1));
      // wave 4: the blizzard comes in gusts, whiting out the valley for a moment
      if (wave >= 4) {
        gustT -= dt;
        if (gustT <= 0) {
          gustT = 2.5 + crand() * 3;
          white.setAlpha(0.18);
          k.sc.tweens.add({ targets: white, alpha: 0.04, duration: 1400, ease: 'Sine.Out' });
          for (let s = 0; s < 4; s++) {
            const st = k.img('live8_streak', -500, 120 + crand() * 560, { alpha: 0.7, sx: 1 + crand(), sy: 1 + crand() * 2 });
            k.sc.tweens.add({ targets: st, x: W + 500, duration: 900 + crand() * 500, delay: s * 120, onComplete: () => st.destroy() });
          }
        }
        // the red on the horizon pulses like a far fire
        red.scaleY = 1.4 + Math.sin(k.t * 1.3) * 0.15;
      } else if (white.alpha > 0) white.setAlpha(Math.max(0, white.alpha - dt * 0.2));
    },
    destroy: () => k.destroy(),
  };
});

// ——— Bifröst Bridge ———
// (redrawn with the location kit in src/content/art/scene-bifrost.ts, whose own live layer runs the bridge's light, the
// cloud sea, the storm and the fire; this old layer stays for the before/after page, ?dev&stages)

registerLegacyLive('bifrost', (ctx: LiveCtx): LiveScene => {
  const k = new Kit(ctx.sc, ctx.layer);
  const below = cloudRow(k, 10, 560, 660, 0xffffff, 0.55, 14, 1.8);
  const dark = k.rect(0x30304a, 0, 0, 700, Phaser.BlendModes.MULTIPLY);
  const ember = k.rect(0xff5020, 0, 0, 700, Phaser.BlendModes.ADD);
  const storm = cloudRow(k, 11, -10, 200, 0x3a3a54, 0, 16, 2.2);
  // Asgard catches first, then the far edge of the cloud sea
  const fires = new Fires(k, [[1300, 405, 0.45], [1560, 400, 0.5], [1720, 408, 0.4], [1420, 398, 0.35], [1880, 640, 0.6], [1100, 650, 0.55], [700, 660, 0.6], [380, 655, 0.55]]);
  const fireGlow = k.img('glow', 1500, 520, { tint: 0xff4a1a, add: true, alpha: 0, sx: 7, sy: 1.6 });
  const flash = k.rect(0xffffff, 0, 0, 1080, Phaser.BlendModes.ADD);
  const embers = k.emitter('soft', {
    x: { min: 0, max: W }, y: { min: 700, max: 760 }, lifespan: 5000, frequency: 60,
    speedY: { min: -140, max: -50 }, speedX: { min: -40, max: 60 }, scale: { start: 0.14, end: 0 }, tint: [0xff9f1c, 0xff5a1f, 0xffd23f], blendMode: 'ADD',
  }, false);
  const rain = k.emitter('soft', {
    x: { min: -200, max: W }, y: -20, lifespan: 1200, frequency: 8,
    speedY: { min: 900, max: 1200 }, speedX: { min: 140, max: 220 }, scaleX: 0.03, scaleY: { min: 0.3, max: 0.5 }, alpha: 0.35, tint: 0xc8d8ff,
  }, false, 1000);
  // a spark of light runs up the rainbow bridge every few seconds, along its arc (brightest on a fair day)
  const spark = k.img('glow', -100, 0, { tint: 0xffffff, add: true, alpha: 0, sx: 0.9, sy: 0.5 });
  const sparkCore = k.img('glow', -100, 0, { tint: 0xfff6d8, add: true, alpha: 0, sx: 0.35, sy: 0.22 });
  const arc = (t: number): [number, number] => {
    // the middle of the bridge's bands (src/content/art/scenes-act8.ts, bridgeArc)
    const P = [[-60, 665], [500, 490], [1000, 280], [1320, 407]];
    const u = 1 - t;
    const x = u * u * u * P[0][0] + 3 * u * u * t * P[1][0] + 3 * u * t * t * P[2][0] + t * t * t * P[3][0];
    const y = u * u * u * P[0][1] + 3 * u * u * t * P[1][1] + 3 * u * t * t * P[2][1] + t * t * t * P[3][1];
    return [x, y];
  };
  let sparkT = 2;
  let sparkRun = -1;
  let wave = ctx.wave;
  let boltT = 3;
  const setWave = (w: number) => {
    wave = w;
    const i = Math.max(0, Math.min(3, w - 1));
    k.fade(dark, [0, 0.25, 0.55, 0.5][i], 0.3);
    k.fade(ember, [0, 0, 0.05, 0.2][i], 0.2);
    storm.forEach((c) => k.fade(c, [0, 0.55, 0.95, 0.95][i], 0.3));
    below.forEach((c) => k.fade(c, [0.55, 0.45, 0.3, 0.2][i], 0.3));
    storm.forEach((c) => c.setTint(i === 3 ? 0x4a2420 : 0x3a3a54));
    fires.show(i === 2 ? 3 : i === 3 ? 8 : 0, i === 3 ? 1 : 0.8);
    k.fade(fireGlow, [0, 0, 0.25, 0.6][i], 0.3);
    k.run(embers, i === 3);
    k.run(rain, i === 2);
  };
  setWave(ctx.wave);
  return {
    setWave,
    update: (dt) => {
      k.update(dt);
      drift(below, dt);
      drift(storm, dt * (wave >= 3 ? 2.5 : 1));
      fires.update(k.t);
      // the spark: up the arc in 2.4 s, fading in and out, every 3-5 s; dimmer as the storm comes, gone in the fire
      sparkT -= dt;
      if (sparkT <= 0 && sparkRun < 0 && wave <= 3) {
        sparkT = 3 + crand() * 2;
        sparkRun = 0;
      }
      if (sparkRun >= 0) {
        sparkRun += dt / 2.4;
        const t = Math.min(1, sparkRun);
        const [x, y] = arc(t);
        const [x2, y2] = arc(Math.min(1, t + 0.01));
        const a = Math.sin(Math.PI * t) * ([0.85, 0.55, 0.3][Math.max(0, wave - 1)] ?? 0);
        spark.setPosition(x, y).setRotation(Math.atan2(y2 - y, x2 - x)).setAlpha(a);
        sparkCore.setPosition(x, y).setAlpha(a);
        if (sparkRun >= 1) {
          sparkRun = -1;
          spark.setAlpha(0);
          sparkCore.setAlpha(0);
        }
      }
      if (wave >= 3) {
        boltT -= dt;
        if (boltT <= 0) {
          boltT = (wave >= 4 ? 4 : 2.6) + crand() * 3;
          strike(k, flash, wave >= 4 ? '#ffb070' : '#d8e4ff', 200, 1720, 60, wave >= 4 ? 0.2 : 0.3);
        }
      }
      fireGlow.setAlpha(fireGlow.alpha);
      if (wave >= 4) fireGlow.scaleY = 1.6 + Math.sin(k.t * 2.1) * 0.2;
    },
    destroy: () => k.destroy(),
  };
});

// ——— Lyngvi Isle (Fenrir's Paw) ———
// (redrawn with the location kit in src/content/art/scene-fenrir.ts, whose own live layer runs the aurora, the mist
// and the glitter on the lake and the fetter on the binding stone; this old layer stays for the before/after page,
// ?dev&stages)

registerLegacyLive('fenrir', (ctx: LiveCtx): LiveScene => {
  const k = new Kit(ctx.sc, ctx.layer);
  streakTex(k.sc);
  const halo = k.img('glow', 1380, 190, { tint: 0xcfe0ff, add: true, alpha: 0.25, sx: 2.6 });
  const runes = [784, 844, 904, 964].map((x, i) => k.img('glow', x + 14, 465 + (i % 2) * 20, { tint: 0xc8a0ff, add: true, alpha: 0.4, sx: 0.55 }));
  const mist = cloudRow(k, 12, 560, 720, 0xa8b0e0, 0.22, 18, 2.4);
  const lowMist = cloudRow(k, 8, 700, 760, 0xb8c0f0, 0.3, -12, 2.8);
  let howlT = 4;
  return {
    update: (dt) => {
      k.update(dt);
      drift(mist, dt);
      drift(lowMist, dt);
      halo.setAlpha(0.22 + Math.sin(k.t * 0.8) * 0.06);
      runes.forEach((g, i) => g.setAlpha(0.35 + Math.sin(k.t * 2.2 + i) * 0.25));
      // now and then a howling wind tears across the lake
      howlT -= dt;
      if (howlT <= 0) {
        howlT = 5 + crand() * 4;
        for (let s = 0; s < 3; s++) {
          const st = k.img('live8_streak', -500, 300 + crand() * 380, { alpha: 0.25, sx: 1.4, sy: 1.5, tint: 0xc8d0ff });
          k.sc.tweens.add({ targets: st, x: W + 500, duration: 1600, delay: s * 200, ease: 'Sine.In', onComplete: () => st.destroy() });
        }
      }
    },
    destroy: () => k.destroy(),
  };
});

// ——— Thrym's Hall ———
// (redrawn with the location kit in src/content/art/scene-thrym.ts, whose own live layer runs the cold fires, the snow
// through the vault and the aurora in the ice windows; this old layer stays for the before/after page, ?dev&stages)

registerLegacyLive('thrym', (ctx: LiveCtx): LiveScene => {
  const k = new Kit(ctx.sc, ctx.layer);
  shimmerTex(k.sc);
  // cold light falling from the two windows onto the floor
  const shafts = [350, 1570].map((x) => {
    const im = k.img('live8_shimmer', x + (x < 960 ? 120 : -120), 470, { add: true, alpha: 0.12, sx: 1.1, sy: 0.9, tint: 0x9fe8ff });
    im.rotation = x < 960 ? -0.35 : 0.35;
    return im;
  });
  const throne = k.img('glow', 960, 420, { tint: 0x7ff4ff, add: true, alpha: 0.3, sx: 2.6, sy: 2 });
  const mist = cloudRow(k, 12, 690, 770, 0xe0f4ff, 0.32, 14, 2.4);
  const spots: [number, number][] = [[180, 120], [520, 120], [1400, 120], [1740, 120], [860, 120], [960, 140], [1060, 120], [960, 300]];
  return {
    update: (dt) => {
      k.update(dt);
      drift(mist, dt);
      shafts.forEach((s, i) => s.setAlpha(0.1 + Math.sin(k.t * 0.9 + i * 2) * 0.05));
      throne.setAlpha(0.26 + Math.sin(k.t * 1.6) * 0.08);
      // icicles glint
      if (crand() < dt * 3) {
        const [x, y] = spots[Math.floor(crand() * spots.length)];
        const g = k.img('star', x + (crand() - 0.5) * 120, y + crand() * 40, { add: true, alpha: 1, sx: 0 });
        k.sc.tweens.add({ targets: g, scale: 0.4, angle: 90, duration: 260, yoyo: true, onComplete: () => g.destroy() });
      }
    },
    destroy: () => k.destroy(),
  };
});

// ——— Edge of the World (Jörmungandr) ———
// (redrawn with the location kit in src/content/art/scene-jormungandr.ts, whose own live layer runs the mist off the
// world's edge, the swell and the spray on the stacks, the far coils and the lightning; this old layer stays for the
// before/after page, ?dev&stages)

registerLegacyLive('jormungandr', (ctx: LiveCtx): LiveScene => {
  const k = new Kit(ctx.sc, ctx.layer);
  coilTex(k.sc);
  waveTex(k.sc);
  // coils rising and sinking far out at sea (each one behind its own wave crest)
  const coils = [[980, 596, 0.45], [140, 610, 0.55], [1540, 618, 0.65]].map(([x, y, s], i) => ({
    im: k.img('live8_coil', x, y, { origin: [0.5, 1], sx: s }),
    y,
    s,
    ph: i * 2.1,
  }));
  const waves = [0, 1, 2].map((i) => {
    const y = 600 + i * 40;
    const a = k.img('live8_wave', 0, y, { origin: [0, 0], sx: 1 + i * 0.2, sy: 0.4 + i * 0.12 });
    const b = k.img('live8_wave', 960 * (1 + i * 0.2), y, { origin: [0, 0], sx: 1 + i * 0.2, sy: 0.4 + i * 0.12 });
    return { a, b, y, speed: (i % 2 ? -1 : 1) * (20 + i * 12), w: 960 * (1 + i * 0.2) };
  });
  const flash = k.rect(0xd8c0ff, 0, 0, 1080, Phaser.BlendModes.ADD);
  k.emitter('soft', {
    x: { min: -300, max: W }, y: -20, lifespan: 1100, frequency: 7,
    speedY: { min: 1000, max: 1300 }, speedX: { min: 220, max: 300 }, scaleX: 0.03, scaleY: { min: 0.3, max: 0.5 }, alpha: 0.3, tint: 0xb8c8e8,
  }, true, 1000);
  let boltT = 2;
  return {
    update: (dt) => {
      k.update(dt);
      for (const c of coils) {
        const u = Math.sin(k.t * 0.45 + c.ph);
        c.im.y = c.y + (1 - u) * 40;
        c.im.scaleY = c.s * (0.55 + 0.45 * (u * 0.5 + 0.5));
        c.im.x += Math.cos(k.t * 0.3 + c.ph) * dt * 6;
      }
      for (const w of waves) {
        w.a.x += w.speed * dt;
        if (w.a.x > 0) w.a.x -= w.w;
        if (w.a.x < -w.w) w.a.x += w.w;
        w.b.x = w.a.x + w.w;
        const bob = Math.sin(k.t * 1.3 + w.y) * 6;
        w.a.y = w.y + bob;
        w.b.y = w.y + bob;
      }
      boltT -= dt;
      if (boltT <= 0) {
        boltT = 3 + crand() * 4;
        strike(k, flash, '#d8b0ff', 200, 1720, 90, 0.25);
      }
    },
    destroy: () => k.destroy(),
  };
});

// ——— The Burning Bridge (Surtr) ———
// (redrawn with the location kit in src/content/art/scene-surtr.ts, whose own live layer burns the bridge and breaks
// it up by the fight's phase; this old layer stays for the before/after page, ?dev&stages)

registerLegacyLive('surtr', (ctx: LiveCtx): LiveScene => {
  const k = new Kit(ctx.sc, ctx.layer);
  const sky = k.rect(0xff3a10, 0.05, 0, 700, Phaser.BlendModes.ADD);
  const smoke = cloudRow(k, 10, 60, 260, 0x1a0806, 0.6, 12, 2.4);
  // the fire spreads along the bridge's back rail, from the far left, phase by phase
  const rail: [number, number, number][] = [];
  for (let x = 60; x < W; x += 150) rail.push([x + (crand() - 0.5) * 40, 700 + crand() * 10, 0.55 + crand() * 0.25]);
  const fires = new Fires(k, rail);
  // and leaps higher off the sea of fire behind it
  const sea = new Fires(k, [[200, 640, 0.8], [520, 650, 0.9], [860, 640, 0.75], [1180, 655, 0.9], [1500, 640, 0.8], [1800, 650, 0.85]]);
  const flash = k.rect(0xffa040, 0, 0, 1080, Phaser.BlendModes.ADD);
  k.emitter('soft', {
    x: { min: 0, max: W }, y: { min: 640, max: 760 }, lifespan: 4500, frequency: 30,
    speedY: { min: -220, max: -70 }, speedX: { min: -60, max: 80 }, scale: { start: 0.16, end: 0 }, tint: [0xff9f1c, 0xff5a1f, 0xffd23f], blendMode: 'ADD',
  }, true);
  let phase = 0;
  const setPhase = (p: number) => {
    if (p === phase) return;
    const first = phase === 0;
    phase = p;
    // phase 1: a few fires; each phase the rail burns further along
    fires.show(Math.min(rail.length, 2 + (p - 1) * 4));
    sea.show(Math.min(6, 2 + p), 0.7 + p * 0.08);
    k.fade(sky, 0.05 + (p - 1) * 0.06, 0.2);
    if (!first) {
      flash.setAlpha(0.35);
      k.sc.tweens.add({ targets: flash, alpha: 0, duration: 700 });
    }
  };
  setPhase(1);
  return {
    update: (dt) => {
      k.update(dt);
      drift(smoke, dt);
      fires.update(k.t);
      sea.update(k.t + 3);
      const boss = (k.sc as unknown as { bossFoot?: { alive: boolean; phase: number } | null }).bossFoot;
      if (boss && boss.alive) setPhase(Math.max(1, Math.min(4, boss.phase)));
      sky.setAlpha(Math.max(0, sky.alpha + Math.sin(k.t * 2.4) * 0.002));
    },
    destroy: () => k.destroy(),
  };
});
