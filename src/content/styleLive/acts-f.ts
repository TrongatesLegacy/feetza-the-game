// How batch F's feet move in play (src/game/liveKit.ts): Gotham, comics, heroes, Kratos, Leonidas and the Persians.
// Their art is in src/content/style/acts-f*.ts. Bosses and mini-bosses overheat in their later phases (the heat
// layer glows from the sole up and steam pours off them). Cosmetic randomness only through crand().

import { CX } from '../../art/feetCommon';
import { FLOWER, VIALS } from '../art/gotham';
import { type LiveFoot, registerLive } from '../../game/liveKit';
import { crand } from '../../systems/cosmeticRandom';
import { landDust, overheat } from './bosses';

const R = () => crand();
const pm = () => crand() - 0.5;
const steamEm = (k: LiveFoot) => k.emitter({ frame: 'soft', curl: 60, drag: 1.1, max: 160 });

// ——— Gotham ———

// BUNION: the Venom veins pulse like a heartbeat, green vapour hisses from the hose couplings, venom drips off the
// empty clamps, and every stomp throws dust and a green splash.
registerLive('bunion', {
  rig: { swing: 0.7, squash: 1.2, breath: 1.6 },
  glow: { rate: 1.1, depth: 0.55, base: 0.4 },
  heat: {},
  setup: (k) => ({
    steam: steamEm(k),
    vapour: k.emitter({ frame: 'puff', curl: 30, drag: 1.2, max: 60 }),
    drops: k.emitter({ frame: 'drop', drag: 0.3, max: 40 }),
    dust: k.emitter({ frame: 'puff', curl: 30, drag: 1.5, below: true, max: 80 }),
  }),
  tick(k, dt, { steam, vapour, drops, dust }) {
    const s = k.f.type.scale;
    vapour.rate('hiss', 2.2, dt, () => {
      const x = [CX - 50, CX + 50, CX + 34][Math.floor(R() * 3)];
      vapour.emit(x, 20, { vx: pm() * 30, vy: -30 - R() * 30, life: 1.1, r0: 4 * s, r1: 20 * s, a: 0.3, tint: 0x9dff8a, fade: 0.15 });
    });
    drops.rate('drip', 0.9, dt, () => {
      const [vx, vy] = VIALS[Math.floor(R() * 3)];
      drops.emit(vx + pm() * 10, vy + 48, { vy: 30, life: 0.9, r0: 4 * s, r1: 3 * s, a: 0.9, tint: 0x7dff6a, grav: 700, fade: 0.04 });
    });
    if (k.landed) for (let i = 0, n = k.burst(10); i < n; i++) drops.emit(CX + pm() * 200, 262, { vx: pm() * 300, vy: -120 - R() * 200, life: 0.7, r0: 4 * s, r1: 2.5 * s, a: 0.9, tint: 0x7dff6a, grav: 900, fade: 0.03 });
    landDust(k, dust, 14, [0x8a8a90, 0x6a6a70], 268, 110, 1.2);
    overheat(k, steam, dt, [CX - 90, 20, 180, 200]);
  },
});

// THE JOKESTER: his eyes follow your peel and blink, the pompom bobs on the curled toe, a wisp of green gas curls
// out of the lapel flower now and then, and confetti spills off him (a shower of it on every stomp).
const CONFETTI = [0x9be23a, 0x8a4ad0, 0xe0202a, 0xf2c14e, 0xffffff];
registerLive('jokester', {
  rig: { swing: 1.2, squash: 1.1 },
  sway: { pom: { k: 40, c: 3.2, gain: 1.6, idle: 0.2, flop: 1.4 } },
  blink: { eyes: { every: 2.6, look: 2.2 } },
  glow: { rate: 0.8, depth: 0.5, base: 0.3 },
  heat: {},
  setup: (k) => ({
    steam: steamEm(k),
    gas: k.emitter({ frame: 'puff', curl: 50, drag: 1, max: 40 }),
    confetti: k.emitter({ frame: 'flake', drag: 0.9, max: 90 }),
  }),
  tick(k, dt, { steam, gas, confetti }) {
    const s = k.f.type.scale;
    gas.rate('wisp', 0.9, dt, () => {
      gas.emit(FLOWER.x + 6, FLOWER.y - 6, { vx: 20 + R() * 30, vy: -20 - R() * 20, life: 1.6, r0: 4 * s, r1: 22 * s, a: 0.28, tint: R() < 0.6 ? 0xb6f07a : 0xc8a0f0, fade: 0.2 });
    });
    const bit = (x: number, y: number, p: number) =>
      confetti.emit(x, y, { vx: pm() * 260 * p, vy: -60 - R() * 220 * p, life: 1.4, r0: 4 * s, r1: 3.5 * s, a: 1, tint: CONFETTI[Math.floor(R() * CONFETTI.length)], grav: 260, spin: 12, fade: 0.02 });
    confetti.rate('spill', 1.2, dt, () => bit(CX + pm() * 160, 120 + R() * 120, 0.3));
    if (k.landed) for (let i = 0, n = k.burst(22); i < n; i++) bit(CX + pm() * 220, 250, 1.3);
    overheat(k, steam, dt, [CX - 80, 20, 200, 220]);
  },
});

// ——— The comic heroes' nemeses ———

// THE RED SOLE: a stiff military march (little swing), the skull's sockets smoulder, a glint runs down the mirror
// patent now and then, and his hobnailed heels strike sparks on every stomp.
registerLive('redsole', {
  rig: { swing: 0.45, squash: 0.9 },
  glow: { rate: 0.7, depth: 0.6, base: 0.35 },
  heat: {},
  setup: (k) => ({
    steam: steamEm(k),
    sparks: k.emitter({ frame: 'spark', add: true, drag: 1.2, max: 40 }),
    shine: k.emitter({ frame: 'spark', add: true, drag: 0.2, max: 10 }),
    dust: k.emitter({ frame: 'puff', curl: 30, drag: 1.5, below: true, max: 60 }),
  }),
  tick(k, dt, { steam, sparks, shine, dust }) {
    const s = k.f.type.scale;
    shine.rate('glint', 0.7, dt, () => shine.emit(CX - 46 + R() * 8, 50 + R() * 70, { vy: 40, life: 0.5, r0: 2, r1: 16 * s, a: 0.9, tint: 0xe8eeff, fade: 0.4 }));
    if (k.landed)
      for (let i = 0, n = k.burst(14); i < n; i++) {
        const side = R() < 0.5 ? -1 : 1;
        sparks.emit(CX + side * (60 + R() * 40), 266, { vx: side * (120 + R() * 300), vy: -80 - R() * 200, life: 0.35 + R() * 0.25, r0: 3, r1: 10 * s, a: 1, tint: R() < 0.5 ? 0xffd27a : 0xfff4d0, grav: 900, fade: 0.05 });
      }
    landDust(k, dust, 10, [0x8a8a90, 0x6a6a70], 266, 100);
    overheat(k, steam, dt, [CX - 70, 20, 140, 200]);
  },
});

// VENOMNOM: the goo never stops moving: its tendrils whip, its eyes narrow and follow your peel, its tongue licks
// out (its tell), drool strings off its teeth and black goo drips from the lobes under it.
registerLive('venomnom', {
  rig: { swing: 1.2, squash: 1.3, breath: 1.8 },
  sway: {
    tendL: { k: 26, c: 2.6, gain: 1.6, idle: 0.3, flop: 1.2 },
    tendR: { k: 24, c: 2.4, gain: 1.6, idle: 0.3, flop: 1.2 },
  },
  blink: { eyes: { every: 2.4, look: 2.6 } },
  twitch: { tongue: { every: 1.8 } },
  glow: { rate: 0.9, depth: 0.5, base: 0.35 },
  heat: {},
  setup: (k) => ({
    steam: steamEm(k),
    goo: k.emitter({ frame: 'drop', drag: 0.3, max: 40 }),
    drool: k.emitter({ frame: 'drop', drag: 0.4, max: 30 }),
  }),
  tick(k, dt, { steam, goo, drool }) {
    const s = k.f.type.scale;
    goo.rate('drip', 1.6, dt, () => {
      const x = [CX - 54, CX + 36, CX - 84, CX + 80][Math.floor(R() * 4)];
      goo.emit(x, 268, { vy: 20, life: 1, r0: 6 * s, r1: 4 * s, a: 0.95, tint: 0x2a2840, grav: 650, fade: 0.04 });
    });
    drool.rate('drool', 1.2, dt, () => drool.emit(CX + pm() * 120, 214, { vy: 10, life: 0.9, r0: 3.5 * s, r1: 2.5 * s, a: 0.8, tint: 0xe8d8f0, grav: 500, fade: 0.05 }));
    if (k.landed) for (let i = 0, n = k.burst(12); i < n; i++) goo.emit(CX + pm() * 220, 262, { vx: pm() * 360, vy: -100 - R() * 220, life: 0.8, r0: 6 * s, r1: 4 * s, a: 0.95, tint: 0x24223a, grav: 900, fade: 0.03 });
    overheat(k, steam, dt, [CX - 80, 20, 160, 200], 0xf0d8f0);
  },
});

// THE CHEETOE: her tail lashes, her eyes follow your peel and her whiskers twitch, cheese dust sparkles off her coat
// and streams behind her when she runs; her claws glint before a pounce.
registerLive('cheetoe', {
  rig: { swing: 1.4, squash: 1.2 },
  sway: { tail: { k: 22, c: 2.2, gain: 2, idle: 0.32, below: true, flop: 1.2 } },
  blink: { eyes: { every: 3, look: 2.4 } },
  twitch: { whiskers: { every: 1.4 } },
  glow: { rate: 0.5, depth: 0.4, base: 0.25 },
  heat: {},
  setup: (k) => ({
    steam: steamEm(k),
    dust: k.emitter({ frame: 'mote', add: true, curl: 40, drag: 1, max: 80 }),
    glint: k.emitter({ frame: 'spark', add: true, drag: 0.2, max: 12 }),
  }),
  tick(k, dt, { steam, dust, glint }) {
    const s = k.f.type.scale;
    const fast = Math.min(30, Math.abs(k.vx) / 18);
    dust.rate('cheese', 3 + fast, dt, () =>
      dust.emit(CX + pm() * 180, 20 + R() * 220, { vx: -Math.sign(k.vx) * fast * 6 + pm() * 30, vy: -10 - R() * 20, life: 1.2, r0: 3 * s, r1: 6 * s, a: 0.7, tint: R() < 0.5 ? 0xffb030 : 0xffe080, fade: 0.2 }),
    );
    if (k.windingUp) glint.rate('claw', 6, dt, () => glint.emit(CX + pm() * 100, 268, { life: 0.3, r0: 2, r1: 14 * s, a: 1, tint: 0xffffff, fade: 0.4 }));
    overheat(k, steam, dt, [CX - 80, 20, 160, 200]);
  },
});
