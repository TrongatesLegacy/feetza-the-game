// Jörmungandr in play (his portrait, his boss card and his peel; in his fight the arena draws his body and this foot
// is hidden, so nothing here shows there). His art: src/content/style/jormungandr.ts. Cosmetic randomness only
// through crand().
//
// - The stone lids blink over the embers, which breathe (the glow layer).
// - The kelp swings on springs from where it's caught, lagging behind as he moves and swinging on after he lands.
// - Steam curls up from the nostrils; as he winds up he draws it back in with a deep breath.
// - Water drips off the kelp's tips and the jaw; landing throws spray off him.

import { registerLive } from '../../game/liveKit';
import { crand } from '../../systems/cosmeticRandom';
import { JORM_DRIPS, JORM_NOSTRILS } from '../style/jormungandr';

const R = () => crand();
const pm = () => crand() - 0.5;

registerLive('jormungandr', {
  glow: { rate: 0.45, depth: 0.5, base: 0.6 },
  blink: { eyes: { every: 3.4 } },
  rig: { swing: 0.5, squash: 0.6, breath: 0.8 },
  sway: {
    kelp0: { k: 34, c: 3.5, gain: 0.9, idle: 0.06, flop: 0.8 },
    kelp1: { k: 30, c: 3.2, gain: 1, idle: 0.05, flop: 0.8 },
    kelp2: { k: 40, c: 4, gain: 0.8, idle: 0.07, flop: 0.8 },
  },
  setup: (k) => ({
    steam: k.emitter({ frame: 'soft', curl: 24, drag: 0.8, max: 40 }),
    drips: k.emitter({ frame: 'drop', drag: 0.15, max: 30 }),
  }),
  tick(k, dt, { steam, drips }) {
    const v = k.f.visualAlpha;
    if (v < 0.2) return;
    const s = k.f.type.scale;
    const breath = k.windingUp ? 1 : 0;
    // steam curling from the nostrils, or drawn back in as he winds up
    steam.rate('nose', breath ? 10 : 3, dt, () => {
      const [x, y] = JORM_NOSTRILS[R() < 0.5 ? 0 : 1];
      if (breath) {
        const a = R() * Math.PI * 2;
        steam.emit(x + Math.cos(a) * 26, y + Math.sin(a) * 16, { vx: -Math.cos(a) * 60, vy: -Math.sin(a) * 40, life: 0.4, r0: 10 * s, r1: 2 * s, a: 0.25 * v, tint: 0xeef2ff, fade: 0.3 });
      } else steam.emit(x, y - 2, { vx: (x < 110 ? -1 : 1) * (6 + R() * 10), vy: -18 - R() * 14, life: 1.6 + R() * 0.6, r0: 3 * s, r1: 16 * s, a: 0.2 * v, tint: 0xe8eef8, fade: 0.3, grav: -6 });
    });
    // water dripping off the kelp's tips and the jaw
    drips.rate('drip', 2.2, dt, () => {
      const [x, y] = JORM_DRIPS[Math.floor(R() * JORM_DRIPS.length)];
      drips.emit(x + pm() * 4, y, { vy: 10, life: 0.9, r0: 2.4 * s, r1: 1.8 * s, a: 0.85 * v, tint: 0xdde8ff, grav: 700, fade: 0.2 });
    });
    if (k.landed)
      for (let i = 0, n = k.burst(12); i < n; i++) {
        const side = R() < 0.5 ? -1 : 1;
        drips.emit(110 + side * (40 + R() * 60), 290, { vx: side * (80 + R() * 160), vy: -120 - R() * 160, life: 0.7, r0: 2.6 * s, r1: 1.6 * s, a: 0.9 * v, tint: 0xe4eeff, grav: 900, fade: 0.05 });
      }
  },
});
