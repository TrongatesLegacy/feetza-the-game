// Renders the current backdrop with crossfades, animated light glows and ambient particles.

import Phaser from 'phaser';
import { BACKDROPS, type AmbientKind, type BackdropId } from '../art/backdrops';
import { H, W } from '../config';
import { ensureBackdrop } from './assets';

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

  constructor(scene: Phaser.Scene, bgLayer: Phaser.GameObjects.Container, ambientLayer: Phaser.GameObjects.Container) {
    this.scene = scene;
    this.bgA = scene.add.image(W / 2, H / 2, '__DEFAULT').setVisible(false);
    this.bgB = scene.add.image(W / 2, H / 2, '__DEFAULT').setVisible(false);
    this.glowLayer = scene.add.container(0, 0);
    bgLayer.add([this.bgA, this.bgB, this.glowLayer]);
    this.ambientLayer = ambientLayer;
  }

  show(id: BackdropId, fadeMs = 0): void {
    if (this.current === id) return;
    this.current = id;
    const key = ensureBackdrop(this.scene, id);
    // the incoming image goes on top and fades in
    const incoming = this.bgB;
    const outgoing = this.bgA;
    incoming.setTexture(key).setVisible(true).setAlpha(fadeMs ? 0 : 1).setDisplaySize(W, H);
    const parent = incoming.parentContainer;
    parent?.bringToTop(incoming);
    parent?.bringToTop(this.glowLayer);
    this.bgA = incoming;
    this.bgB = outgoing;
    if (fadeMs) {
      this.scene.tweens.add({
        targets: incoming,
        alpha: 1,
        duration: fadeMs,
        ease: 'Sine.InOut',
        onComplete: () => outgoing.setVisible(false),
      });
    } else outgoing.setVisible(false);
    this.buildGlows(id, fadeMs);
    this.buildAmbient(id);
  }

  private buildGlows(id: BackdropId, fadeMs: number): void {
    const old = this.glows;
    this.glows = [];
    for (const g of old) {
      this.scene.tweens.add({ targets: g.img, alpha: 0, duration: fadeMs || 1, onComplete: () => g.img.destroy() });
    }
    for (const spot of BACKDROPS[id].glows) {
      const img = this.scene.add
        .image(spot.x, spot.y, 'glow')
        .setTint(hexNum(spot.color))
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale((spot.r * 2) / 256)
        .setAlpha(0);
      this.glowLayer.add(img);
      this.glows.push({ img, base: 0.55, flicker: spot.flicker, seed: Math.random() * 100 });
    }
  }

  private buildAmbient(id: BackdropId): void {
    for (const e of this.emitters) {
      e.stop();
      this.scene.time.delayedCall(4000, () => e.destroy());
    }
    this.emitters = BACKDROPS[id].ambient.map((k) => this.makeEmitter(k));
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
    for (const g of this.glows) {
      const n = Math.sin(this.t * 7.3 + g.seed) * 0.5 + Math.sin(this.t * 13.1 + g.seed * 2) * 0.3 + Math.sin(this.t * 2.1 + g.seed) * 0.2;
      const target = g.base * (1 - g.flicker * 0.35 + n * g.flicker * 0.35);
      g.img.alpha += (target - g.img.alpha) * Math.min(1, dt * 6);
    }
  }
}
