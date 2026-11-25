// Live layers for the comic heroes' nemesis arenas (painted in src/content/art/scenes-comics.ts; see
// src/game/liveBackdrop.ts). The HYDRANT Bunker: two alarm beacons sweep red light round the walls and the empty
// cradle's blue glow pulses. The Symbiote Lab: the strip lights stutter, goo drips from the smashed tank and the
// sonic emitters' lamps blink. The Night Conservatory: fireflies drift through the leaves and moonbeams slowly shift
// across the glass.

import { type LiveCtx, type LiveScene, registerLegacyLive, registerLive } from '../../game/liveBackdrop';
import { crand } from '../../systems/cosmeticRandom';
import { NC, RB, VL } from '../art/scenes-comics';
import { NzKit, reduced } from './kratos';

// ——— The HYDRANT Bunker ———
// (redrawn with the location kit in src/content/art/scene-redsole.ts, whose own live layer turns the beacons, crackles
// the cradle and stirs the banners; this stays for the before/after page)

registerLegacyLive('redsole', (ctx: LiveCtx): LiveScene => {
  const k = new NzKit(ctx.sc, ctx.layer);
  const beams = RB.beacons.map((b) => k.img('p_a7_searchlight', b.x, b.y - 10, { add: true, origin: [0.5, 1], alpha: 0.35, sx: 0.8, sy: 0.9, tint: 0xff3a2a }));
  const lamps = RB.beacons.map((b) => k.img('glow', b.x, b.y - 14, { tint: 0xff3a2a, add: true, alpha: 0.6, sx: 0.9 }));
  const cradle = k.img('glow', RB.cradle.x, RB.cradle.y - 80, { tint: 0x5fb8ff, add: true, alpha: 0.4, sx: 2.6 });
  // dust motes drifting through the red light
  k.emitter('soft', {
    x: { min: 0, max: 1920 }, y: { min: 100, max: 700 }, lifespan: 6000, frequency: 160,
    speedX: { min: -12, max: 12 }, speedY: { min: -6, max: 10 }, scale: { min: 0.02, max: 0.05 },
    alpha: { values: [0, 0.5, 0] }, tint: 0xffb0a0, blendMode: 'ADD',
  }, 5000);
  return {
    update: (dt) => {
      k.update(dt);
      const spin = reduced() ? 0.3 : 1.6;
      beams.forEach((b, i) => b.setRotation(Math.sin(k.t * spin + i * Math.PI) * 1.2));
      lamps.forEach((l, i) => l.setAlpha(0.45 + 0.35 * Math.max(0, Math.sin(k.t * spin * 2 + i * Math.PI))));
      cradle.setAlpha(0.32 + Math.sin(k.t * 2.2) * 0.12);
    },
    destroy: () => k.destroy(),
  };
});

// ——— The Symbiote Lab ———
// (redrawn with the location kit in src/content/art/scene-venomnom.ts, whose own live layer oozes the goo, stutters the
// strip lights and answers the fight; this stays for the before/after page)

registerLegacyLive('venomnom', (ctx: LiveCtx): LiveScene => {
  const k = new NzKit(ctx.sc, ctx.layer);
  const dark = k.rect(0x05060a, 0, 0);
  const lamps = VL.emitters.map((e) => k.img('glow', e.x + 60, e.y - 70, { tint: 0x7dff9a, add: true, alpha: 0.5, sx: 0.3 }));
  // goo dripping off the broken glass and the ceiling
  k.emitter('soft', {
    x: { min: VL.tank.x - 110, max: VL.tank.x + 110 }, y: VL.tank.y - 60, lifespan: 1200, frequency: 380,
    speedY: { min: 200, max: 320 }, gravityY: 500, scaleX: 0.05, scaleY: 0.12, alpha: 0.9, tint: 0x14141c,
  }, 1200);
  k.emitter('soft', {
    x: { min: 600, max: 1400 }, y: 80, lifespan: 1400, frequency: 700,
    speedY: { min: 260, max: 380 }, gravityY: 400, scaleX: 0.03, scaleY: 0.09, alpha: 0.85, tint: 0x14141c,
  }, 1400);
  let flick = 2;
  return {
    update: (dt) => {
      k.update(dt);
      lamps.forEach((l, i) => l.setAlpha(0.35 + 0.3 * Math.abs(Math.sin(k.t * 3 + i))));
      // the strip lights stutter now and then
      flick -= dt;
      if (flick <= 0) {
        flick = 1.5 + crand() * 3;
        if (!reduced()) {
          dark.setAlpha(0.45);
          k.later(70, () => dark.active && dark.setAlpha(0.1));
          k.later(140, () => dark.active && dark.setAlpha(0.35));
          k.later(230, () => dark.active && dark.setAlpha(0));
        }
      }
    },
    destroy: () => k.destroy(),
  };
});

// ——— The Night Conservatory ———

registerLive('cheetoe', (ctx: LiveCtx): LiveScene => {
  const k = new NzKit(ctx.sc, ctx.layer);
  const rays = [0, 1, 2].map((i) => k.img('p_a7_searchlight', NC.moon.x - 200 + i * 160, 0, { add: true, origin: [0.5, 0], alpha: 0.12, sx: 1.4, sy: 1.6, tint: 0xd8e8ff }));
  rays.forEach((r) => r.setFlipY(true));
  // fireflies wandering through the leaves
  k.emitter('soft', {
    x: { min: 0, max: 1920 }, y: { min: 300, max: 700 }, lifespan: 5000, frequency: 140,
    speedX: { min: -30, max: 30 }, speedY: { min: -25, max: 15 }, scale: { min: 0.04, max: 0.08 },
    alpha: { values: [0, 1, 0.3, 1, 0] }, tint: [0xd8ff6a, 0xffe680], blendMode: 'ADD',
  }, 4000);
  return {
    update: (dt) => {
      k.update(dt);
      rays.forEach((r, i) => {
        r.setRotation(0.35 + Math.sin(k.t * 0.25 + i) * 0.08);
        r.setAlpha(0.08 + 0.05 * Math.sin(k.t * 0.6 + i * 2));
      });
    },
    destroy: () => k.destroy(),
  };
});
