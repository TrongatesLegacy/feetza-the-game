// Juice: floating numbers, quips, particle bursts, lightning, shockwaves, coin flights.

import Phaser from 'phaser';
import { save } from '../systems/save';
import { cosmetic, crand } from '../systems/cosmeticRandom';

const FONT = '"Lilita One", "Fredoka", system-ui, sans-serif';

export class Fx {
  private scene: Phaser.Scene;
  private layer: Phaser.GameObjects.Container;
  private textPool: Phaser.GameObjects.Text[] = [];
  private crumbs: Phaser.GameObjects.Particles.ParticleEmitter;
  private sauce: Phaser.GameObjects.Particles.ParticleEmitter;
  private peps: Phaser.GameObjects.Particles.ParticleEmitter;
  private stars: Phaser.GameObjects.Particles.ParticleEmitter;
  private sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private flames: Phaser.GameObjects.Particles.ParticleEmitter;
  private stink: Phaser.GameObjects.Particles.ParticleEmitter;
  private ice: Phaser.GameObjects.Particles.ParticleEmitter;
  private smoke: Phaser.GameObjects.Particles.ParticleEmitter;
  private confetti: Phaser.GameObjects.Particles.ParticleEmitter;
  private cheese: Phaser.GameObjects.Particles.ParticleEmitter;
  private sweat: Phaser.GameObjects.Particles.ParticleEmitter;
  private heal: Phaser.GameObjects.Particles.ParticleEmitter;
  private glints: Phaser.GameObjects.Particles.ParticleEmitter;
  private trailEm: Phaser.GameObjects.Particles.ParticleEmitter;
  private propTrailEm: Phaser.GameObjects.Particles.ParticleEmitter;
  private propTrailBig: Phaser.GameObjects.Particles.ParticleEmitter;
  private propBits: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Container) {
    this.scene = scene;
    this.layer = layer;
    const em = (tex: string, cfg: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig) => {
      const e = scene.add.particles(0, 0, tex, { emitting: false, ...cfg });
      layer.add(e);
      return e;
    };
    this.crumbs = em('crumb', {
      lifespan: 900, speed: { min: 180, max: 520 }, angle: { min: 200, max: 340 }, gravityY: 1400,
      scale: { min: 0.6, max: 1.3 }, rotate: { min: 0, max: 360 }, alpha: { start: 1, end: 0.6 },
    });
    this.sauce = em('soft', {
      lifespan: 600, speed: { min: 120, max: 420 }, angle: { min: 190, max: 350 }, gravityY: 1200,
      scale: { start: 0.45, end: 0.15 }, tint: [0xc22f1c, 0xa8261a, 0xe0402a], alpha: { start: 0.95, end: 0 },
    });
    this.peps = em('pep', {
      lifespan: 1100, speed: { min: 260, max: 600 }, angle: { min: 220, max: 320 }, gravityY: 1500,
      scale: { min: 0.8, max: 1.2 }, rotate: { min: 0, max: 360 },
    });
    this.cheese = em('cheese', {
      lifespan: 800, speed: { min: 150, max: 380 }, angle: { min: 230, max: 310 }, gravityY: 1300,
      scale: { min: 0.7, max: 1.2 }, rotate: { min: -40, max: 40 },
    });
    this.stars = em('star', {
      lifespan: 450, speed: { min: 220, max: 520 }, scale: { start: 0.55, end: 0 }, blendMode: 'ADD',
      tint: [0xffffff, 0xfff1a0, 0xffd34d],
    });
    this.sparks = em('soft', {
      lifespan: 500, speed: { min: 300, max: 800 }, scale: { start: 0.35, end: 0 }, blendMode: 'ADD', gravityY: 600,
      tint: [0xffe066, 0xff9f1c, 0xffffff],
    });
    this.flames = em('flame', {
      lifespan: 500, speedY: { min: -220, max: -120 }, speedX: { min: -30, max: 30 }, scale: { start: 0.9, end: 0.2 },
      alpha: { start: 0.95, end: 0 }, blendMode: 'ADD',
    });
    this.stink = em('soft', {
      lifespan: 1400, speedY: { min: -70, max: -30 }, speedX: { min: -40, max: 40 }, scale: { start: 0.6, end: 1.8 },
      alpha: { start: 0.45, end: 0 }, tint: [0x9fbf4a, 0x7a9a2a, 0xb8c96a],
    });
    this.ice = em('shard', {
      lifespan: 600, speed: { min: 150, max: 420 }, gravityY: 900, rotate: { min: 0, max: 360 }, scale: { start: 1, end: 0.3 },
    });
    this.smoke = em('soft', {
      lifespan: 800, speed: { min: 40, max: 160 }, scale: { start: 0.8, end: 2.4 }, alpha: { start: 0.5, end: 0 },
      tint: [0xdedede, 0xbdbdbd],
    });
    this.confetti = em('confetti', {
      lifespan: 2200, speed: { min: 300, max: 900 }, angle: { min: 220, max: 320 }, gravityY: 900,
      rotate: { min: 0, max: 360 }, scaleX: { min: 0.8, max: 1.4 }, scaleY: { min: 0.6, max: 1.2 },
      tint: [0xff4d6d, 0xffd23f, 0x3ddc97, 0x4cc9f0, 0xb06bff, 0xff9f1c],
    });
    this.sweat = em('sweat', {
      lifespan: 700, speedX: { min: -120, max: 120 }, speedY: { min: -200, max: -80 }, gravityY: 900, scale: { start: 1, end: 0.6 },
    });
    this.heal = em('star', {
      lifespan: 900, speedY: { min: -180, max: -60 }, speedX: { min: -60, max: 60 }, scale: { start: 0.5, end: 0 },
      tint: [0x7be04a, 0xc8ff9a, 0xffffff], blendMode: 'ADD',
    });
    // shiny feet and shiny peels: slow rainbow glints
    this.glints = em('star', {
      lifespan: 700, speed: { min: 10, max: 60 }, scale: { start: 0.42, end: 0 }, rotate: { min: 0, max: 90 }, blendMode: 'ADD',
      tint: [0xffffff, 0xfff06a, 0x7dff9a, 0x5fd8ff, 0xff7ad9, 0xa77dff],
    });
    // the equipped peel's trail
    this.trailEm = em('soft', {
      lifespan: 260, speed: { min: 0, max: 20 }, scale: { start: 0.32, end: 0 }, alpha: { start: 0.7, end: 0 }, blendMode: 'ADD',
    });
    // thrown props: a short trail in the prop's colour (normal blend, so it reads on bright stages too)
    this.propTrailEm = em('soft', {
      lifespan: 230, speed: { min: 0, max: 14 }, scale: { start: 0.62, end: 0 }, alpha: { start: 0.5, end: 0 },
    });
    this.propTrailBig = em('soft', {
      lifespan: 250, speed: { min: 0, max: 18 }, scale: { start: 1, end: 0 }, alpha: { start: 0.45, end: 0 },
    });
    // …and the chunky bits it throws off when it lands
    this.propBits = em('soft', {
      lifespan: 420, speed: { min: 160, max: 460 }, gravityY: 1100, scale: { start: 0.26, end: 0.04 }, alpha: { start: 1, end: 0.2 },
    });
  }

  /** A burst of particles: Phaser rolls their ranges with Math.random, so it's run on the cosmetic generator (a look
   *  never moves the game's own random sequence on). */
  private emit(em: Phaser.GameObjects.Particles.ParticleEmitter, n: number, x: number, y: number): void {
    cosmetic(() => em.explode(n, x, y));
  }

  /** A thrown prop's trail puff (size ≈ the prop's size / 150). */
  propTrail(x: number, y: number, color: number, size = 0.5): void {
    const em = size >= 0.6 ? this.propTrailBig : this.propTrailEm;
    em.setParticleTint(color);
    this.emit(em, 1, x, y);
  }

  /** A thrown prop lands: a pop, a ring and a spray of bits in its colour. */
  propBurst(x: number, y: number, color: number, size = 1): void {
    this.propBits.setParticleTint(color);
    this.emit(this.propBits, Math.round(7 * size), x, y);
    const b = this.scene.add.image(x, y, 'burst').setScale(0.22 * size).setAngle(crand() * 360).setTint(color);
    this.layer.add(b);
    this.scene.tweens.add({ targets: b, scale: 0.5 * size, alpha: 0, duration: 200, ease: 'Quad.Out', onComplete: () => b.destroy() });
    this.ring(x, y, color, 0.55 * size, 0.7);
    this.emit(this.stars, 3, x, y);
  }

  glint(x: number, y: number, n = 1): void {
    this.emit(this.glints, n, x, y);
  }

  trail(x: number, y: number, color: number): void {
    this.trailEm.setParticleTint(color);
    this.emit(this.trailEm, 1, x, y);
  }

  private text(): Phaser.GameObjects.Text {
    const t = this.textPool.pop() ?? this.scene.add.text(0, 0, '', { fontFamily: FONT });
    this.layer.add(t);
    t.setActive(true).setVisible(true).setAlpha(1).setScale(1).setAngle(0);
    return t;
  }

  private release(t: Phaser.GameObjects.Text): void {
    t.setVisible(false).setActive(false);
    this.textPool.push(t);
  }

  number(x: number, y: number, value: number, kind: 'normal' | 'crit' | 'burn' | 'zap' | 'heal' | 'coin' = 'normal'): void {
    if (!save.settings.damageNumbers && kind !== 'coin') return;
    // numbers float up 80px: start low enough to stay on screen
    x = Math.min(Math.max(x, 60), 1860);
    y = Math.min(Math.max(y, 150), 1040);
    const t = this.text();
    const styles = {
      normal: { size: 34, fill: '#ffffff' },
      crit: { size: 54, fill: '#ffd23f' },
      burn: { size: 26, fill: '#ff8a3d' },
      zap: { size: 30, fill: '#8fe8ff' },
      heal: { size: 34, fill: '#8fff6a' },
      coin: { size: 30, fill: '#ffd34d' },
    }[kind];
    t.setText(kind === 'coin' ? `+${value}` : kind === 'heal' ? `+${value}` : `${Math.round(value)}${kind === 'crit' ? '!' : ''}`);
    t.setStyle({ fontFamily: FONT, fontSize: `${styles.size}px`, color: styles.fill, stroke: '#2a1810', strokeThickness: kind === 'crit' ? 10 : 8 });
    t.setOrigin(0.5).setPosition(x + (crand() - 0.5) * 40, y);
    t.setScale(kind === 'crit' ? 0.4 : 0.7);
    this.scene.tweens.add({ targets: t, scale: 1, duration: 160, ease: 'Back.Out' });
    this.scene.tweens.add({
      targets: t,
      y: y - (kind === 'crit' ? 120 : 80),
      alpha: 0,
      delay: 250,
      duration: 650,
      ease: 'Quad.In',
      onComplete: () => this.release(t),
    });
  }

  quip(x: number, y: number, msg: string, color = '#ffffff', size = 44, angle = (crand() - 0.5) * 16): void {
    const t = this.text();
    t.setText(msg);
    t.setStyle({ fontFamily: FONT, fontSize: `${size}px`, color, stroke: '#2a1810', strokeThickness: 10 });
    // keep callouts fully on screen, clear of the top HUD (score, boss bar, tips)
    const half = t.width / 2 + 20;
    x = Math.min(Math.max(x, half), 1920 - half);
    // (low enough that the float-up stays under the boss bar's move line)
    y = Math.min(Math.max(y, 290), 1000);
    t.setOrigin(0.5).setPosition(x, y).setAngle(angle).setScale(0.2);
    this.scene.tweens.add({ targets: t, scale: 1, duration: 260, ease: 'Back.Out' });
    this.scene.tweens.add({ targets: t, y: y - 60, alpha: 0, delay: 600, duration: 500, onComplete: () => this.release(t) });
  }

  impact(x: number, y: number, crit: boolean): void {
    const b = this.scene.add.image(x, y, 'burst').setScale(crit ? 0.5 : 0.32).setAngle(crand() * 360).setTint(crit ? 0xffd23f : 0xffffff);
    this.layer.add(b);
    this.scene.tweens.add({ targets: b, scale: crit ? 1 : 0.6, alpha: 0, duration: crit ? 260 : 180, ease: 'Quad.Out', onComplete: () => b.destroy() });
    this.emit(this.stars, crit ? 10 : 5, x, y);
    if (crit) this.emit(this.sparks, 14, x, y);
  }

  blush(foot: Phaser.GameObjects.Container, x: number, y: number): void {
    const m = this.scene.add.image(x, y, 'blush').setScale(0.7).setBlendMode(Phaser.BlendModes.MULTIPLY);
    foot.add(m);
    this.scene.tweens.add({ targets: m, alpha: 0, scale: 0.9, delay: 300, duration: 700, onComplete: () => m.destroy() });
  }

  splat(x: number, y: number, big = false): void {
    this.emit(this.sauce, big ? 26 : 14, x, y);
    this.emit(this.crumbs, big ? 18 : 10, x, y);
    this.emit(this.cheese, big ? 10 : 5, x, y);
    this.emit(this.peps, big ? 5 : 2, x, y);
  }

  slice(key: string, x: number, y: number, scale: number): void {
    const s = this.scene.add.image(x, y, key).setScale(scale, scale * 0.5);
    this.layer.add(s);
    const dir = crand() < 0.5 ? -1 : 1;
    this.scene.tweens.add({ targets: s, x: x + dir * (160 + crand() * 120), duration: 900, ease: 'Linear' });
    this.scene.tweens.add({
      targets: s,
      y: { value: y - 160, duration: 380, ease: 'Quad.Out', yoyo: true },
      angle: dir * 360,
      duration: 900,
    });
    this.scene.tweens.add({ targets: s, alpha: 0, delay: 650, duration: 300, onComplete: () => s.destroy() });
  }

  burn(x: number, y: number): void {
    this.emit(this.flames, 1, x + (crand() - 0.5) * 60, y);
  }

  stinkPuff(x: number, y: number): void {
    this.emit(this.stink, 1, x + (crand() - 0.5) * 80, y);
  }

  frost(x: number, y: number): void {
    this.emit(this.ice, 6, x, y);
  }

  puff(x: number, y: number, n = 8): void {
    this.emit(this.smoke, n, x, y);
  }

  party(x: number, y: number, n = 60): void {
    this.emit(this.confetti, n, x, y);
  }

  sweatDrop(x: number, y: number): void {
    this.emit(this.sweat, 1, x, y);
  }

  healBurst(x: number, y: number): void {
    this.emit(this.heal, 12, x, y);
  }

  ring(x: number, y: number, color = 0xffffff, size = 1, squash = 0.4): void {
    const r = this.scene.add.image(x, y, 'ring').setScale(0.1, 0.1 * squash).setTint(color).setBlendMode(Phaser.BlendModes.ADD);
    this.layer.add(r);
    this.scene.tweens.add({ targets: r, scaleX: size, scaleY: size * squash, alpha: 0, duration: 450, ease: 'Quad.Out', onComplete: () => r.destroy() });
  }

  explosion(x: number, y: number, radius: number): void {
    this.ring(x, y, 0xffd23f, (radius * 2) / 256, 1);
    this.emit(this.sparks, 24, x, y);
    this.emit(this.smoke, 10, x, y);
    const b = this.scene.add.image(x, y, 'burst').setTint(0xff9f1c).setScale(0.3);
    this.layer.add(b);
    this.scene.tweens.add({ targets: b, scale: (radius / 100) * 0.9, alpha: 0, angle: 40, duration: 320, onComplete: () => b.destroy() });
  }

  lightning(x0: number, y0: number, x1: number, y1: number): void {
    const g = this.scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    this.layer.add(g);
    const pts: [number, number][] = [[x0, y0]];
    const segs = 9;
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      pts.push([x0 + (x1 - x0) * t + (crand() - 0.5) * 50, y0 + (y1 - y0) * t + (crand() - 0.5) * 50]);
    }
    pts.push([x1, y1]);
    for (const [w, c, a] of [[14, 0x4cc9f0, 0.35], [6, 0xbff4ff, 0.9], [2, 0xffffff, 1]] as const) {
      g.lineStyle(w, c, a);
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (const p of pts.slice(1)) g.lineTo(p[0], p[1]);
      g.strokePath();
    }
    this.scene.tweens.add({ targets: g, alpha: 0, duration: 220, onComplete: () => g.destroy() });
  }

  coinFlight(x: number, y: number, n: number, to: { x: number; y: number }, onEach: () => void): void {
    const count = Math.min(n, 12);
    for (let i = 0; i < count; i++) {
      const c = this.scene.add.image(x, y, 'coin').setScale(0.8);
      this.layer.add(c);
      const ang = crand() * Math.PI * 2;
      const r = 40 + crand() * 70;
      this.scene.tweens.add({
        targets: c,
        x: x + Math.cos(ang) * r,
        y: y + Math.sin(ang) * r - 40,
        duration: 260,
        ease: 'Quad.Out',
        onComplete: () => {
          this.scene.tweens.add({
            targets: c,
            x: to.x,
            y: to.y,
            scale: 0.5,
            delay: i * 30,
            duration: 520,
            ease: 'Cubic.In',
            onComplete: () => {
              c.destroy();
              onEach();
            },
          });
        },
      });
    }
  }
}
