// Renders the current backdrop with crossfades, animated light glows and ambient particles.

import Phaser from 'phaser';
import { BACKDROPS, type AmbientKind, type BackdropId, type BackdropInfo, drawLegacyBackdrop, legacyInfo } from '../art/backdrops';
import { H, W } from '../config';
import { crand } from '../systems/cosmeticRandom';
import { addCanvas, ensureBackdrop } from './assets';
import '../content/live';
import { type LiveScene, startLive } from './liveBackdrop';
import { save } from '../systems/save';

type Emitter = Phaser.GameObjects.Particles.ParticleEmitter;

function hexNum(c: string): number {
  return parseInt(c.replace('#', ''), 16);
}

export class BackdropView {
  private scene: Phaser.Scene;
  private bgA: Phaser.GameObjects.Image;
  private bgB: Phaser.GameObjects.Image;
  private glowLayer: Phaser.GameObjects.Container;
  private ambientLayer: Phaser.GameObjects.Container;
  private glows: { img: Phaser.GameObjects.Image; base: number; flicker: number; seed: number }[] = [];
  private emitters: Emitter[] = [];
  private t = 0;
  current: BackdropId | null = null;
  // live layers (src/content/live): animated scenery that can change wave by wave. Each gets a container of its
  // own; on a crossfade the old one keeps running under the incoming backdrop until it has faded in.
  private bgLayer: Phaser.GameObjects.Container;
  private liveLayer: Phaser.GameObjects.Container;
  private live: LiveScene | null = null;
  private fading: { live: LiveScene | null; layer: Phaser.GameObjects.Container; t: number }[] = [];
  private wave = 1;
  /** The scenery's own quake (px of jitter), and a kick that decays on top of it. */
  private quakeAmt = 0;
  private quakeKick = 0;
  /** 'legacy' shows the old art of a redrawn scene (the before/after page). */
  private variant?: 'legacy';

  constructor(scene: Phaser.Scene, bgLayer: Phaser.GameObjects.Container, ambientLayer: Phaser.GameObjects.Container, variant?: 'legacy') {
    this.scene = scene;
    this.variant = variant;
    this.bgLayer = bgLayer;
    this.bgA = scene.add.image(W / 2, H / 2, '__DEFAULT').setVisible(false);
    this.bgB = scene.add.image(W / 2, H / 2, '__DEFAULT').setVisible(false);
    this.glowLayer = scene.add.container(0, 0);
    this.liveLayer = scene.add.container(0, 0);
    bgLayer.add([this.bgA, this.bgB, this.glowLayer, this.liveLayer]);
    this.ambientLayer = ambientLayer;
  }

  /** Shake the scenery itself, not the camera (the walls of Tartarus crumbling while Kronos pulls his chains):
   * a steady jitter of `px` (0 stops it), and `kick` px more that dies away. Gentler with reduced motion. */
  quake(px: number, kick = 0): void {
    this.quakeAmt = Math.max(0, px);
    this.quakeKick = Math.max(this.quakeKick, kick);
    if (!this.quakeAmt && !this.quakeKick) this.bgLayer.setPosition(0, 0).setScale(1);
  }

  /** The wave within the stage (1–5): live layers change their weather and light with it. */
  /** A stomp or a big moment: the live layer reacts (lamps swing, dust sifts, birds take off). */
  impact(x: number, y: number, power: number): void {
    this.live?.impact?.(x, y, power);
  }

  setWave(wave: number): void {
    if (wave === this.wave) return;
    this.wave = wave;
    this.live?.setWave?.(wave);
  }

  /** Show a backdrop (crossfading over fadeMs). `wave` is the wave within its stage, when it changes with it (the old
   * backdrop's live layer, still fading out, keeps its own). */
  show(id: BackdropId, fadeMs = 0, wave?: number): void {
    if (this.current === id) {
      if (wave !== undefined) this.setWave(wave);
      return;
    }
    this.current = id;
    if (wave !== undefined) this.wave = wave;
    // the incoming image goes on top and fades in
    const incoming = this.bgB;
    const outgoing = this.bgA;
    // the old live layer keeps running under the incoming image until the fade is done
    const oldLive = this.live;
    const oldLayer = this.liveLayer;
    if (fadeMs) this.fading.push({ live: oldLive, layer: oldLayer, t: fadeMs / 1000 + 0.1 });
    else {
      oldLive?.destroy();
      oldLayer.destroy();
    }
    this.liveLayer = this.scene.add.container(0, 0);
    this.bgLayer.add(this.liveLayer);
    // a scene painted with the location kit shows a base without its moving parts while its live layer runs (and its
    // layer holds much of the scene: it fades in with the image)
    let base: string | null = null;
    this.live = startLive(id, { sc: this.scene, layer: this.liveLayer, wave: this.wave, setBase: (k) => (base = k) }, this.variant);
    const key = base ?? (this.variant === 'legacy' ? this.legacyKey(id) : ensureBackdrop(this.scene, id));
    incoming.setTexture(key).setVisible(true).setAlpha(fadeMs ? 0 : 1).setDisplaySize(W, H);
    const parent = this.bgLayer;
    parent.bringToTop(incoming);
    parent.bringToTop(this.glowLayer);
    parent.bringToTop(this.liveLayer);
    this.bgA = incoming;
    this.bgB = outgoing;
    if (fadeMs) {
      this.liveLayer.setAlpha(0);
      this.scene.tweens.add({
        targets: [incoming, this.liveLayer],
        alpha: 1,
        duration: fadeMs,
        ease: 'Sine.InOut',
        onComplete: () => outgoing.setVisible(false),
      });
    } else outgoing.setVisible(false);
    // (a kit scene's live layer lights itself: the info's glow spots are for its still)
    this.buildGlows(base ? [] : this.info(id).glows, fadeMs);
    this.buildAmbient(id);
  }

  private info(id: BackdropId): BackdropInfo {
    return (this.variant === 'legacy' && legacyInfo(id)) || BACKDROPS[id];
  }

  private legacyKey(id: BackdropId): string {
    const key = `bg_legacy_${id}`;
    if (!this.scene.textures.exists(key)) addCanvas(this.scene, key, drawLegacyBackdrop(id));
    return key;
  }

  /** Stop everything (the before/after page drops cards that scroll away). */
  destroy(): void {
    for (const f of this.fading) {
      f.live?.destroy();
      f.layer.destroy();
    }
    this.fading = [];
    this.live?.destroy();
    this.live = null;
    for (const e of this.emitters) e.destroy();
    this.emitters = [];
    for (const g of this.glows) g.img.destroy();
    this.glows = [];
    this.liveLayer.destroy();
    this.glowLayer.destroy();
    this.bgA.destroy();
    this.bgB.destroy();
  }

  private buildGlows(spots: BackdropInfo['glows'], fadeMs: number): void {
    const old = this.glows;
    this.glows = [];
    for (const g of old) {
      this.scene.tweens.add({ targets: g.img, alpha: 0, duration: fadeMs || 1, onComplete: () => g.img.destroy() });
    }
    for (const spot of spots) {
      const img = this.scene.add
        .image(spot.x, spot.y, 'glow')
        .setTint(hexNum(spot.color))
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale((spot.r * 2) / 256)
        .setAlpha(0);
      this.glowLayer.add(img);
      this.glows.push({ img, base: 0.55, flicker: spot.flicker, seed: crand() * 100 });
    }
  }

  private buildAmbient(id: BackdropId): void {
    for (const e of this.emitters) {
      e.stop();
      this.scene.time.delayedCall(4000, () => e.destroy());
    }
    this.emitters = this.info(id).ambient.map((k) => this.makeEmitter(k));
  }

  private makeEmitter(kind: AmbientKind): Emitter {
    const s = this.scene;
    const cfg: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = (() => {
      switch (kind) {
        case 'dust':
          return {
            x: { min: 0, max: W }, y: { min: 100, max: 760 }, lifespan: 9000, frequency: 160,
            speedX: { min: -8, max: 8 }, speedY: { min: -10, max: 6 }, scale: { min: 0.05, max: 0.14 },
            alpha: { values: [0, 0.55, 0] }, tint: 0xffe2b0, blendMode: 'ADD',
          };
        case 'fireflies':
          return {
            x: { min: 0, max: W }, y: { min: 300, max: 800 }, lifespan: 6000, frequency: 260,
            speedX: { min: -20, max: 20 }, speedY: { min: -25, max: 10 }, scale: { min: 0.08, max: 0.16 },
            alpha: { values: [0, 1, 0.3, 1, 0] }, tint: [0xd9ff7a, 0xfff2a0], blendMode: 'ADD',
          };
        case 'sparkle':
          return {
            texture: 'star', x: { min: 0, max: W }, y: { min: 420, max: 740 }, lifespan: 700, frequency: 70,
            scale: { start: 0, end: 0.35, ease: 'Sine.Out' }, alpha: { start: 1, end: 0 }, blendMode: 'ADD', tint: [0xfff6c0, 0xffffff],
          };
        case 'neon':
          return {
            x: { min: 0, max: W }, y: { min: 120, max: 700 }, lifespan: 2400, frequency: 260,
            scale: { min: 0.5, max: 1.4 }, alpha: { values: [0, 0.18, 0] }, tint: [0xff4fd8, 0x36e0ff, 0xb06bff], blendMode: 'ADD',
          };
        case 'snow':
          return {
            x: { min: -100, max: W + 100 }, y: -20, lifespan: 9000, frequency: 40,
            speedY: { min: 60, max: 140 }, speedX: { min: -30, max: 30 }, scale: { min: 0.05, max: 0.16 },
            alpha: { min: 0.5, max: 0.95 }, tint: 0xffffff,
          };
        case 'stars':
          return {
            texture: 'star', x: { min: 0, max: W }, y: { min: 90, max: 640 }, lifespan: 1800, frequency: 120,
            scale: { values: [0, 0.22, 0] }, alpha: 0.9, blendMode: 'ADD', tint: [0xffffff, 0xbfe6ff],
          };
        case 'fog':
          return {
            x: { min: -200, max: W }, y: { min: 560, max: 800 }, lifespan: 14000, frequency: 600,
            speedX: { min: 15, max: 40 }, scale: { min: 6, max: 10 }, alpha: { values: [0, 0.09, 0] }, tint: [0xc8d8e8, 0xb8c8d8],
          };
        case 'sparks':
          return {
            x: { min: 100, max: W - 100 }, y: { min: 700, max: 780 }, lifespan: 1400, frequency: 90,
            speedY: { min: -420, max: -160 }, speedX: { min: -120, max: 120 }, gravityY: 500, scale: { start: 0.12, end: 0 },
            tint: [0xffd23f, 0xff8a1c, 0xffffff], blendMode: 'ADD',
          };
        case 'confetti':
          return {
            texture: 'confetti', x: { min: 0, max: W }, y: -20, lifespan: 7000, frequency: 90,
            speedY: { min: 80, max: 160 }, speedX: { min: -40, max: 40 }, rotate: { min: 0, max: 360 },
            scaleX: { min: 0.6, max: 1.2 }, scaleY: { min: 0.4, max: 1 },
            tint: [0xff4d6d, 0xffd23f, 0x3ddc97, 0x4cc9f0, 0xb06bff], alpha: 0.85,
          };
        case 'embers':
          return {
            x: { min: 0, max: W }, y: { min: 760, max: 820 }, lifespan: 5000, frequency: 120,
            speedY: { min: -120, max: -40 }, speedX: { min: -30, max: 30 }, scale: { start: 0.14, end: 0 },
            tint: [0xff9f1c, 0xff5a1f, 0xffd23f], blendMode: 'ADD',
          };
        case 'torch':
          return {
            x: { min: 0, max: W }, y: { min: 100, max: 700 }, lifespan: 5000, frequency: 300,
            speedY: { min: -30, max: -10 }, scale: { min: 0.05, max: 0.12 }, alpha: { values: [0, 0.8, 0] }, tint: 0xffb46a, blendMode: 'ADD',
          };
        case 'wisps':
          return {
            x: { min: 0, max: W }, y: { min: 300, max: 800 }, lifespan: 6000, frequency: 280,
            speedY: { min: -60, max: -20 }, speedX: { min: -30, max: 30 }, scale: { min: 0.5, max: 1.3 },
            alpha: { values: [0, 0.28, 0] }, tint: [0x8fffe0, 0x9fc8ff], blendMode: 'ADD',
          };
      }
    })();
    const texture = (cfg as { texture?: string }).texture ?? 'soft';
    delete (cfg as { texture?: string }).texture;
    const e = s.add.particles(0, 0, texture, cfg);
    // pre-warm so the scene doesn't start empty
    e.fastForward(kind === 'snow' || kind === 'fog' ? 8000 : 3000);
    this.ambientLayer.add(e);
    return e;
  }

  update(dt: number): void {
    this.t += dt;
    if (this.quakeAmt > 0 || this.quakeKick > 0) {
      this.quakeKick = Math.max(0, this.quakeKick - dt * 30);
      const q = (this.quakeAmt + this.quakeKick) * (save.settings.reducedMotion ? 0.3 : 1);
      // zoomed in just enough that the jitter never shows an edge
      const s = 1 + (q * 2.4) / H;
      this.bgLayer.setScale(s).setPosition((W / 2) * (1 - s) + (crand() - 0.5) * 2 * q, (H / 2) * (1 - s) + (crand() - 0.5) * 2 * q);
      if (this.quakeAmt <= 0 && this.quakeKick <= 0) this.bgLayer.setPosition(0, 0).setScale(1);
    }
    this.live?.update(dt);
    for (const f of this.fading) {
      f.live?.update(dt);
      f.t -= dt;
      if (f.t <= 0) {
        f.live?.destroy();
        f.layer.destroy();
      }
    }
    if (this.fading.length) this.fading = this.fading.filter((f) => f.t > 0);
    for (const g of this.glows) {
      const n = Math.sin(this.t * 7.3 + g.seed) * 0.5 + Math.sin(this.t * 13.1 + g.seed * 2) * 0.3 + Math.sin(this.t * 2.1 + g.seed) * 0.2;
      const target = g.base * (1 - g.flicker * 0.35 + n * g.flicker * 0.35);
      g.img.alpha += (target - g.img.alpha) * Math.min(1, dt * 6);
    }
  }
}
