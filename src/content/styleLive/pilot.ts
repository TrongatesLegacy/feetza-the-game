// How the style-kit pilot feet move in play (src/game/liveKit.ts). Their art is in src/content/style/pilot-*.ts.

import { CX } from '../../art/feetCommon';
import { registerLive } from '../../game/liveKit';
import { crand } from '../../systems/cosmeticRandom';
import { drawFly } from '../style/pilot-bare';
import { STACKS } from '../style/pilot-bosses';

const R = () => crand();
const pm = () => crand() - 0.5;

// Barefoot Bob: the plain foot. No effects: his toes wiggle while he hovers (his tell), curl before he drops and
// splay as he lands; he breathes and swings.
registerLive('bob', { wiggle: true });

// Sneaker Steve: the lace ends swing; when he's furious (below half health) the shoe huffs steam from its collar.
registerLive('sneaker', {
  sway: { laces: { k: 70, c: 5, gain: 1.6, idle: 0.1, flop: 1.2 } },
  setup: (k) => k.emitter({ frame: 'soft', curl: 50, drag: 1.4 }),
  tick(k, dt, steam) {
    if (!k.f.enraged) return;
    steam.rate('huff', 10, dt, () => {
      const s = R() < 0.5 ? -1 : 1;
      steam.emit(CX + s * (40 + R() * 20), 4, { vx: s * (20 + R() * 40), vy: -60 - R() * 50, life: 0.9 + R() * 0.5, r0: 5, r1: 26, a: 0.45, tint: 0xf4f6fa });
    });
  },
});

// Fruit Fly Fiona: real flies circle her (thicker and faster as she dives), and a green stink fog drifts off her toes.
registerLive('fruitfly', {
  wiggle: true,
  setup(k) {
    const key = k.sheet('lk_fly', 64, 56, 3, (ctx, i) => {
      ctx.translate(32, 30);
      drawFly(ctx, 1.9, [0, 0.55, 1][i]);
    });
    return {
      flies: k.swarm({ key, frames: 3, count: 7, at: [CX, 150], rx: 150, ry: 150, speed: 1.6, jitter: 26, scale: 0.62 }),
      fogBack: k.emitter({ frame: 'puff', curl: 22, drag: 0.7, below: true, max: 160 }),
      fogFront: k.emitter({ frame: 'soft', curl: 26, drag: 0.8, max: 120 }),
    };
  },
  tick(k, dt, { flies, fogBack, fogFront }) {
    const diving = k.f.state === 'descend' || k.windingUp;
    flies.tight += ((diving ? 0.62 : 1) - flies.tight) * Math.min(1, dt * 3);
    flies.pace += ((diving ? 1.9 : 1) - flies.pace) * Math.min(1, dt * 3);
    const s = k.f.type.scale;
    // a low, heavy fog rolls off the toes and sinks; thinner wisps curl up the sides
    fogBack.rate('toes', 11, dt, () => {
      fogBack.emit(30 + R() * 160, 236 + R() * 24, { vx: pm() * 34, vy: 2 + R() * 8, life: 2.4 + R() * 1.2, r0: 16 * s, r1: 60 * s, a: 0.5, tint: R() < 0.6 ? 0x9ab83a : 0x6f8a22, fade: 0.25 });
    });
    fogFront.rate('wisps', 5, dt, () => {
      const side = R() < 0.5 ? -1 : 1;
      fogFront.emit(CX + side * (70 + R() * 30), 60 + R() * 150, { vx: side * (8 + R() * 16), vy: -14 - R() * 20, life: 2 + R(), r0: 10 * s, r1: 38 * s, a: 0.38, tint: 0xa8c84a, fade: 0.3 });
    });
  },
});

// Magma Toes: the cracks' glow pulses; embers rise off it, molten drips fall from its toes and a thin smoke curls up.
registerLive('lava', {
  wiggle: true,
  glow: { rate: 0.55, depth: 0.45, base: 0.45 },
  setup: (k) => ({
    embers: k.emitter({ frame: 'ember', add: true, curl: 60, drag: 0.6, max: 200 }),
    drips: k.emitter({ frame: 'drop', add: true, drag: 0.2, max: 40 }),
    smoke: k.emitter({ frame: 'puff', curl: 40, drag: 1, below: true, max: 80 }),
  }),
  tick(k, dt, { embers, drips, smoke }) {
    const s = k.f.type.scale;
    embers.rate('rise', 12, dt, () => {
      embers.emit(30 + R() * 160, 40 + R() * 200, { vx: pm() * 30, vy: -50 - R() * 70, life: 0.9 + R() * 0.9, r0: 3.2 * s, r1: 1.2 * s, a: 0.95, tint: R() < 0.5 ? 0xffb040 : 0xff6a1a, grav: -30, fade: 0.05 });
    });
    drips.rate('drip', 1.1, dt, () => {
      const tx = [36, 70, 106, 145, 189][Math.floor(R() * 5)];
      drips.emit(tx + pm() * 6, 252, { vy: 40, life: 0.8, r0: 5 * s, r1: 3.5 * s, a: 1, tint: 0xff9a2a, grav: 900, fade: 0.02 });
    });
    smoke.rate('smoke', 3, dt, () => {
      smoke.emit(40 + R() * 140, 20 + R() * 120, { vx: pm() * 10, vy: -30 - R() * 25, life: 1.8 + R(), r0: 6 * s, r1: 26 * s, a: 0.22, tint: 0x2a2224, fade: 0.25 });
    });
    // a landing throws a spray of sparks
    if (k.landed) {
      for (let i = 0, n = k.burst(16); i < n; i++) embers.emit(40 + R() * 140, 258, { vx: pm() * 420, vy: -120 - R() * 260, life: 0.5 + R() * 0.4, r0: 3 * s, r1: 1 * s, a: 1, tint: 0xffc060, grav: 900, fade: 0.02 });
    }
  },
});

// Bunny Slipper: ears flop on springs (behind the head), the eyes blink and follow your peel, the nose twitches.
registerLive('bunny', {
  rig: { squash: 1.3 },
  sway: {
    earL: { k: 42, c: 4, gain: 1.7, idle: 0.1, below: true, flop: 1.6 },
    earR: { k: 46, c: 4.4, gain: 1.7, idle: 0.1, below: true, flop: 1.6 },
  },
  blink: { eyes: { every: 3.5, look: 3.5 } },
  twitch: { nose: { every: 2 } },
});

// Werewolf Wally: the big locks on its sides sway and trail behind its zig-zags; claws flex before it strikes.
registerLive('wally', {
  sway: Object.fromEntries([0, 1, 2, 3, 4, 5].map((i) => [`lock${i}`, { k: 50 + i * 4, c: 4.5, gain: i < 3 ? 1.5 : -1.5, idle: 0.07, flop: i < 3 ? 1 : -1 }])),
});

// CHIMNEY SWEEP: the boot is a chimney: smoke curls out of the collar, soot sifts off it and its brush bobs.
// Overheated (later phases), its collar glows like a hearth and throws embers and steam.
registerLive('sweep', {
  sway: { brush: { k: 48, c: 4, gain: 1.2, idle: 0.08, below: true } },
  heat: {},
  setup: (k) => ({
    smoke: k.emitter({ frame: 'puff', curl: 70, drag: 0.9, max: 220 }),
    soot: k.emitter({ frame: 'mote', drag: 0.8, max: 120 }),
    embers: k.emitter({ frame: 'ember', add: true, curl: 70, drag: 0.6, max: 160 }),
  }),
  tick(k, dt, { smoke, soot, embers }) {
    const s = k.f.type.scale;
    const h = k.heat;
    smoke.rate('flue', 10 + h * 10, dt, () => {
      smoke.emit(CX - 56 + R() * 112, 6, { vx: pm() * 36, vy: -46 - R() * 46, life: 1.8 + R() * 1.2, r0: 8 * s, r1: (32 + h * 16) * s, a: 0.55, tint: R() < 0.55 ? 0x4a4448 : R() < 0.8 ? 0x6a6468 : 0x2a262a, grav: -18, fade: 0.12 });
    });
    soot.rate('sift', 7, dt, () => {
      soot.emit(30 + R() * 160, 40 + R() * 200, { vx: pm() * 16, vy: 10 + R() * 20, life: 1.2 + R() * 0.8, r0: 2.2 * s, r1: 1.6 * s, a: 0.85, tint: 0x141214, grav: 50, fade: 0.05 });
    });
    if (h > 0.05) {
      embers.rate('hearth', 26 * h, dt, () => {
        embers.emit(CX - 50 + R() * 100, -2, { vx: pm() * 60, vy: -90 - R() * 120, life: 0.8 + R() * 0.8, r0: 3 * s, r1: 1 * s, a: 1, tint: R() < 0.6 ? 0xffb040 : 0xff5a1a, grav: -40, fade: 0.03 });
      });
      smoke.rate('steam', 6 * h, dt, () => {
        smoke.emit(CX - 60 + R() * 120, 6, { vx: pm() * 40, vy: -80 - R() * 40, life: 1 + R() * 0.6, r0: 8 * s, r1: 34 * s, a: 0.35, tint: 0xeef2f6, fade: 0.08 });
      });
    }
  },
});

// THE IRON HEEL: the furnace flickers, the stacks chuff steam in time like an engine and sparks pop from the grate.
// Overheated (later phases, low health), the iron glows from the sole up, the stacks roar and embers stream off it.
registerLive('ironheel', {
  glow: { rate: 1.3, depth: 0.3, base: 0.6 },
  heat: {},
  rig: { swing: 0.6, squash: 0.7 },
  setup: (k) => ({
    steam: k.emitter({ frame: 'soft', curl: 60, drag: 1.1, max: 260 }),
    sparks: k.emitter({ frame: 'ember', add: true, drag: 0.3, max: 160 }),
    chuff: { t: 0 },
  }),
  tick(k, dt, { steam, sparks, chuff }) {
    const s = k.f.type.scale;
    const h = k.heat;
    // the stacks chuff in time, faster and harder as it heats
    chuff.t -= dt;
    if (chuff.t <= 0) {
      chuff.t = 0.95 - h * 0.5;
      STACKS.forEach(([x, y], i) => {
        const dir = i === 0 ? -1 : 1;
        for (let j = 0, n = k.burst(4 + Math.round(h * 5)); j < n; j++)
          steam.emit(x, y, { vx: dir * (40 + R() * 50), vy: -110 - R() * 90 - h * 80, life: 1.1 + R() * 0.6, r0: 6 * s, r1: (22 + h * 18) * s, a: 0.5, tint: 0xeef2f6, fade: 0.06 });
      });
    }
    sparks.rate('grate', 1.5 + h * 14, dt, () => {
      sparks.emit(CX - 30 + R() * 60, 100 + R() * 20, { vx: pm() * 160, vy: -80 - R() * 160, life: 0.5 + R() * 0.5, r0: 2.6 * s, r1: 0.8 * s, a: 1, tint: R() < 0.5 ? 0xffd070 : 0xff8a2a, grav: 600, fade: 0.02 });
    });
    if (h > 0.05) {
      sparks.rate('heat', 18 * h, dt, () => {
        sparks.emit(20 + R() * 180, 150 + R() * 100, { vx: pm() * 40, vy: -40 - R() * 70, life: 0.9 + R() * 0.7, r0: 2.4 * s, r1: 0.8 * s, a: 0.9, tint: 0xff7a1a, grav: -60, fade: 0.04 });
      });
    }
  },
});
