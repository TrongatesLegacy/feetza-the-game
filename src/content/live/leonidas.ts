// Live layers for King Leonidas's Hot Gates (painted in src/content/art/scenes-leonidas.ts; see
// src/game/liveBackdrop.ts). The Hot Gates: surf breaks white on the rocks, dust blows across the pass, and the light
// moves across the stage's waves: a pink dawn (81), a white noon (82), a sky dark with arrow volleys arcing over the
// wall (83), and a blood-red dusk with smoke (84). The Goat Path: the Immortals' torches flicker and sway up the
// mountain. The God-King's Pavilion: the braziers roar and gold motes drift under the canopy.

import Phaser from 'phaser';
import { crand } from '../../systems/cosmeticRandom';
import { type LiveCtx, type LiveScene, registerLegacyLive, registerLive } from '../../game/liveBackdrop';
import { GP, HG, XP } from '../art/scenes-leonidas';
import { NzKit, reduced } from './kratos';

const W = 1920;

/** Per wave of the stage (1–4): the light over the pass, its strength, and whether arrows fly. */
const LIGHT: [number, number, boolean][] = [
  [0xff9a8a, 0.14, false],
  [0xfff6e0, 0.05, false],
  [0x2a2030, 0.3, true],
  [0xc8301a, 0.22, true],
];

// (redrawn with the location kit in src/content/art/scene-hotgates.ts, whose own live layer runs the surf, the host,
// the volleys and the light by wave; this old layer stays for the before/after page, ?dev&stages)
registerLegacyLive('hotgates', (ctx: LiveCtx): LiveScene => {
  const k = new NzKit(ctx.sc, ctx.layer);
  const tint = k.rect(0xffffff, 0, Phaser.BlendModes.MULTIPLY);
  // surf on the rocks
  k.emitter('soft', {
    x: { min: 60, max: 520 }, y: { min: HG.sea - 40, max: HG.sea + 120 }, lifespan: 1400, frequency: 90,
    speedY: { min: -60, max: -20 }, speedX: { min: -20, max: 20 }, scale: { min: 0.05, max: 0.12 },
    alpha: { values: [0, 0.8, 0] }, tint: 0xffffff, blendMode: 'ADD',
  }, 1400);
  // dust blowing through the pass
  k.emitter('soft', {
    x: -60, y: { min: 400, max: 760 }, lifespan: 9000, frequency: 120,
    speedX: { min: 140, max: 260 }, speedY: { min: -10, max: 10 }, scaleX: { min: 1, max: 2 }, scaleY: { min: 0.2, max: 0.4 },
    alpha: { values: [0, 0.18, 0] }, tint: 0xd8b878,
  }, 6000);
  let arrows = false;
  let next = 2;
  const volley = () => {
    // a dark cloud of arrows arcing from the plain over the wall
    for (let i = 0; i < 14; i++) {
      const a = k.img('t_arrow', 900 + crand() * 500, 360, { sx: 0.25, tint: 0x2a1810 });
      const dx = (crand() - 0.5) * 1400;
      const st = { t: 0 };
      k.sc.tweens.add({
        targets: st,
        t: 1,
        duration: 1300 + crand() * 400,
        delay: i * 40,
        onUpdate: () => {
          a.setPosition(1100 + dx * st.t, 360 - Math.sin(st.t * Math.PI) * 260 + st.t * 300);
          a.setRotation(Math.atan2(-Math.cos(st.t * Math.PI) * 260 * Math.PI + 300, dx) );
        },
        onComplete: () => a.destroy(),
      });
    }
  };
  const set = (wave: number) => {
    const [col, a, arr] = LIGHT[Math.max(0, Math.min(3, wave - 1))];
    tint.setFillStyle(col, 1);
    k.sc.tweens.add({ targets: tint, alpha: a, duration: 1500 });
    arrows = arr;
  };
  set(ctx.wave);
  return {
    setWave: set,
    update: (dt) => {
      k.update(dt);
      if (!arrows || reduced()) return;
      next -= dt;
      if (next <= 0) {
        next = 3 + crand() * 3;
        volley();
      }
    },
    destroy: () => k.destroy(),
  };
});

registerLive('immortalbrute', (ctx: LiveCtx): LiveScene => {
  const k = new NzKit(ctx.sc, ctx.layer);
  const flames = GP.torches.map(([x, y]) => k.img('glow', x, y - 6, { tint: 0xff9a3a, add: true, alpha: 0.6, sx: 0.5 }));
  for (const [x, y] of GP.torches) {
    k.emitter('soft', {
      x: { min: x - 6, max: x + 6 }, y: y - 10, lifespan: 600, frequency: 60,
      speedY: { min: -90, max: -50 }, scale: { start: 0.08, end: 0.01 }, alpha: { start: 0.9, end: 0 },
      tint: [0xffb040, 0xff6a1a], blendMode: 'ADD',
    }, 600);
  }
  return {
    update: (dt) => {
      k.update(dt);
      flames.forEach((f, i) => f.setAlpha(0.45 + 0.2 * Math.sin(k.t * 9 + i * 2) + 0.1 * Math.sin(k.t * 23 + i)));
    },
    destroy: () => k.destroy(),
  };
});

registerLive('xerxes', (ctx: LiveCtx): LiveScene => {
  const k = new NzKit(ctx.sc, ctx.layer);
  for (const b of XP.braziers) {
    k.emitter('soft', {
      x: { min: b.x - 50, max: b.x + 50 }, y: b.y - 96, lifespan: 800, frequency: 25,
      speedY: { min: -260, max: -150 }, speedX: { min: -20, max: 20 }, scale: { start: 0.2, end: 0.02 },
      alpha: { start: 0.9, end: 0 }, tint: [0xffd23f, 0xff8a1a, 0xff4a1a], blendMode: 'ADD',
    }, 800);
  }
  k.emitter('soft', {
    x: { min: 300, max: W - 300 }, y: { min: 200, max: 600 }, lifespan: 6000, frequency: 200,
    speedY: { min: -12, max: 12 }, speedX: { min: -12, max: 12 }, scale: { min: 0.02, max: 0.05 },
    alpha: { values: [0, 0.8, 0] }, tint: 0xffe080, blendMode: 'ADD',
  }, 5000);
  const sun = k.img('glow', XP.throne.x, XP.throne.y - 340, { tint: 0xffd23f, add: true, alpha: 0.3, sx: 2 });
  return {
    update: (dt) => {
      k.update(dt);
      sun.setAlpha(0.25 + Math.sin(k.t * 1.6) * 0.1);
    },
    destroy: () => k.destroy(),
  };
});
