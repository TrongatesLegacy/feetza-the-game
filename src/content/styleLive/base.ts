// How the base roster's styled feet move in play (src/game/liveKit.ts). Their art is in src/content/style/base-*.ts.
// Cosmetic randomness only through crand() (the balance simulator depends on the game's seeded generator).

import { CX } from '../../art/feetCommon';
import { type LiveFoot, registerLive } from '../../game/liveKit';
import { crand } from '../../systems/cosmeticRandom';
import { drawFly } from '../style/pilot-bare';
import { PATTY, nailTops, toeTips } from '../style/base-bare';

const R = () => crand();
const pm = () => crand() - 0.5;

/** The shared fly sheet (the same one Fruit Fly Fiona uses). */
function flySheet(k: LiveFoot): string {
  return k.sheet('lk_fly', 64, 56, 3, (ctx, i) => {
    ctx.translate(32, 30);
    drawFly(ctx, 1.9, [0, 0.55, 1][i]);
  });
}

/** A twinkle: a short-lived additive glint at a point. */
function twinkle(e: ReturnType<LiveFoot['emitter']>, x: number, y: number, s: number, tint: number, size = 7): void {
  e.emit(x, y, { life: 0.28 + R() * 0.2, r0: size * s, r1: 1 * s, a: 1, tint, fade: 0.3 });
}

const PLAIN_TIPS = toeTips();

// ——— Pedicure Patty: the wet polish twinkles. ———
const PATTY_NAILS = nailTops(PATTY);
registerLive('patty', {
  wiggle: true,
  setup: (k) => ({ glints: k.emitter({ frame: 'ember', add: true, drag: 0, max: 40 }) }),
  tick(k, dt, { glints }) {
    const s = k.f.type.scale;
    glints.rate('polish', 2.6, dt, () => {
      const [x, y] = PATTY_NAILS[Math.floor(R() * 5)];
      twinkle(glints, x - 3 + pm() * 4, y - 2, s, R() < 0.5 ? 0xffe0f0 : 0xffffff, 8);
    });
  },
});

// ——— Baby Toes: never stop wriggling; a bouncier squash. ———
registerLive('baby', { wiggle: true, rig: { squash: 1.4, breath: 1.6 } });

// ——— Hairy Harold: stray hairs drift off him; a landing shakes a few loose. ———
registerLive('harold', {
  wiggle: true,
  setup: (k) => ({ hairs: k.emitter({ frame: 'spark', curl: 30, drag: 1.6, max: 50 }) }),
  tick(k, dt, { hairs }) {
    const s = k.f.type.scale;
    const shed = (n: number) => {
      for (let i = 0; i < n; i++) {
        const side = R() < 0.5 ? -1 : 1;
        hairs.emit(CX + side * (60 + R() * 40), 20 + R() * 150, { vx: side * (10 + R() * 30), vy: 10 + R() * 20, life: 1.4 + R(), r0: 5 * s, r1: 5 * s, a: 0.8, tint: 0x3a2010, spin: pm() * 4, grav: 30, fade: 0.1 });
      }
    };
    hairs.rate('shed', 1.1, dt, () => shed(1));
    if (k.landed) shed(k.burst(6));
  },
});

// ——— Stinky Stan: fumes rise off him and a couple of flies won't leave. ———
registerLive('stan', {
  wiggle: true,
  setup: (k) => ({
    flies: k.swarm({ key: flySheet(k), frames: 3, count: 3, at: [CX, 120], rx: 130, ry: 140, speed: 1.3, jitter: 22, scale: 0.55 }),
    fumes: k.emitter({ frame: 'soft', curl: 70, drag: 0.6, max: 120 }),
  }),
  tick(k, dt, { fumes }) {
    const s = k.f.type.scale;
    fumes.rate('fume', 9, dt, () => {
      fumes.emit(30 + R() * 160, 40 + R() * 200, { vx: pm() * 20, vy: -28 - R() * 30, life: 2 + R(), r0: 10 * s, r1: 44 * s, a: 0.32, tint: R() < 0.6 ? 0xb8c84a : 0x8a9a2a, grav: -10, fade: 0.25 });
    });
  },
});

// ——— Phantom Foot: the core pulses; mist streams off its sides and trails its moves. ———
registerLive('ghost', {
  wiggle: true,
  glow: { rate: 0.4, depth: 0.5, base: 0.35 },
  setup: (k) => ({
    mist: k.emitter({ frame: 'soft', curl: 50, drag: 0.9, below: true, max: 160 }),
    motes: k.emitter({ frame: 'mote', add: true, curl: 40, drag: 0.8, max: 50 }),
  }),
  tick(k, dt, { mist, motes }) {
    const s = k.f.type.scale;
    mist.rate('wisp', 14, dt, () => {
      const side = R() < 0.5 ? -1 : 1;
      mist.emit(CX + side * (50 + R() * 50), 10 + R() * 200, { vx: side * (20 + R() * 30), vy: -20 - R() * 30, life: 1.4 + R() * 0.8, r0: 10 * s, r1: 34 * s, a: 0.4, tint: R() < 0.6 ? 0xcfe9ff : 0x9fc4ff, fade: 0.2 });
    });
    motes.rate('spirit', 3, dt, () => {
      motes.emit(20 + R() * 180, 40 + R() * 200, { vx: pm() * 20, vy: -20 - R() * 20, life: 1.2 + R(), r0: 5 * s, r1: 2 * s, a: 0.9, tint: 0xdff2ff, fade: 0.3 });
    });
  },
});

// ——— Zombie Toes: flies circle it and it drips. ———
registerLive('zombie', {
  wiggle: true,
  setup: (k) => ({
    flies: k.swarm({ key: flySheet(k), frames: 3, count: 4, at: [CX, 140], rx: 140, ry: 150, speed: 1.5, jitter: 24, scale: 0.55 }),
    drips: k.emitter({ frame: 'drop', drag: 0.2, max: 30 }),
    dust: k.emitter({ frame: 'mote', drag: 1, max: 40 }),
  }),
  tick(k, dt, { drips, dust }) {
    const s = k.f.type.scale;
    drips.rate('ooze', 0.9, dt, () => {
      const [x, y] = PLAIN_TIPS[Math.floor(R() * 5)];
      drips.emit(x + pm() * 6, y - 4, { vy: 30, life: 0.9, r0: 5 * s, r1: 4 * s, a: 0.9, tint: R() < 0.5 ? 0x6a8a2a : 0x7a1a2a, grav: 800, fade: 0.05 });
    });
    if (k.landed) for (let i = 0, n = k.burst(10); i < n; i++) dust.emit(30 + R() * 160, 250, { vx: pm() * 160, vy: -40 - R() * 60, life: 0.7 + R() * 0.4, r0: 3 * s, r1: 1.5 * s, a: 0.7, tint: 0x8a8a6a, grav: 300 });
  },
});

// ——— Double Trouble: the nuclei pulse and bubbles rise off it. ———
registerLive('mitosis', {
  wiggle: true,
  glow: { rate: 0.9, depth: 0.55, base: 0.3 },
  setup: (k) => ({ bubbles: k.emitter({ frame: 'bubble', curl: 40, drag: 0.8, max: 40 }) }),
  tick(k, dt, { bubbles }) {
    const s = k.f.type.scale;
    bubbles.rate('bud', 3.5, dt, () => {
      bubbles.emit(30 + R() * 160, 30 + R() * 200, { vx: pm() * 20, vy: -30 - R() * 40, life: 1.2 + R() * 0.8, r0: 3 * s, r1: (6 + R() * 6) * s, a: 0.75, tint: R() < 0.5 ? 0xffb8e8 : 0xd8a0ff, fade: 0.2 });
    });
  },
});

// ——— Tattoo Tony: his toe ring glints; furious, he fumes. ———
registerLive('tony', {
  wiggle: true,
  setup: (k) => ({
    glints: k.emitter({ frame: 'ember', add: true, drag: 0, max: 20 }),
    steam: k.emitter({ frame: 'soft', curl: 50, drag: 1.4, max: 80 }),
  }),
  tick(k, dt, { glints, steam }) {
    const s = k.f.type.scale;
    glints.rate('ring', 0.8, dt, () => twinkle(glints, 136, 216, s, 0xfff0b0, 9));
    if (!k.f.enraged) return;
    steam.rate('huff', 9, dt, () => {
      const side = R() < 0.5 ? -1 : 1;
      steam.emit(CX + side * (40 + R() * 20), 6, { vx: side * (20 + R() * 40), vy: -60 - R() * 50, life: 0.9 + R() * 0.5, r0: 5 * s, r1: 26 * s, a: 0.45, tint: 0xf4f6fa });
    });
  },
});

// ——— Clumsy Clara: the stubbed big toe throbs. ———
registerLive('clara', {
  wiggle: true,
  setup: (k) => ({ throb: k.emitter({ frame: 'soft', add: true, drag: 0, max: 8 }), t: { next: 0 } }),
  tick(k, dt, { throb, t }) {
    const s = k.f.type.scale;
    t.next -= dt;
    if (t.next <= 0) {
      t.next = 0.85;
      const [x, y] = PLAIN_TIPS[4];
      throb.emit(x - 4, y - 18, { life: 0.5, r0: 18 * s, r1: 30 * s, a: 0.5, tint: 0xff4a3a, fade: 0.25 });
    }
  },
});

// ——— Flip-Flop Phil: sand trickles off his sole; a landing sprays it. ———
registerLive('flipflop', {
  wiggle: true,
  setup: (k) => ({ sand: k.emitter({ frame: 'mote', drag: 0.4, max: 120 }) }),
  tick(k, dt, { sand }) {
    const s = k.f.type.scale;
    const grain = (x: number, y: number, vx: number, vy: number) => sand.emit(x, y, { vx, vy, life: 0.8 + R() * 0.5, r0: 2.4 * s, r1: 2 * s, a: 0.95, tint: R() < 0.5 ? 0xf2d89a : 0xc8a868, grav: 700, fade: 0.05 });
    sand.rate('trickle', 6, dt, () => grain(CX - 100 + R() * 210, 250 + R() * 20, pm() * 20, 10));
    if (k.landed) for (let i = 0, n = k.burst(22); i < n; i++) grain(CX - 110 + R() * 220, 268, pm() * 360, -100 - R() * 220);
  },
});

// ——— Sunburnt Sue: the heat shimmers off her and flakes of skin drift down. ———
registerLive('sue', {
  wiggle: true,
  setup: (k) => ({
    heat: k.emitter({ frame: 'soft', curl: 40, drag: 0.8, max: 60 }),
    flakes: k.emitter({ frame: 'flake', curl: 30, drag: 1.5, max: 40 }),
  }),
  tick(k, dt, { heat, flakes }) {
    const s = k.f.type.scale;
    heat.rate('shimmer', 6, dt, () => {
      heat.emit(30 + R() * 160, 30 + R() * 160, { vx: pm() * 10, vy: -30 - R() * 20, life: 1.2 + R() * 0.6, r0: 10 * s, r1: 30 * s, a: 0.16, tint: 0xffa080, fade: 0.3 });
    });
    flakes.rate('peel', 1.4, dt, () => {
      flakes.emit(40 + R() * 140, 30 + R() * 150, { vx: pm() * 30, vy: 10 + R() * 20, life: 1.6 + R(), r0: 3 * s, r1: 2.6 * s, a: 0.9, tint: 0xffe0d0, spin: pm() * 5, grav: 40, fade: 0.1 });
    });
  },
});

// ——— Frosty Fred: cold mist rolls off him, snow flurries round him and his icicles drip. ———
registerLive('fred', {
  wiggle: true,
  setup: (k) => ({
    mist: k.emitter({ frame: 'puff', curl: 30, drag: 0.9, below: true, max: 120 }),
    snow: k.emitter({ frame: 'flake', curl: 60, drag: 1.2, max: 80 }),
    drips: k.emitter({ frame: 'drop', drag: 0.2, max: 20 }),
  }),
  tick(k, dt, { mist, snow, drips }) {
    const s = k.f.type.scale;
    mist.rate('cold', 8, dt, () => {
      mist.emit(20 + R() * 180, 180 + R() * 80, { vx: pm() * 30, vy: 20 + R() * 30, life: 1.8 + R(), r0: 12 * s, r1: 40 * s, a: 0.3, tint: 0xe8f4ff, fade: 0.25 });
    });
    snow.rate('flurry', 7, dt, () => {
      snow.emit(-20 + R() * 260, -10 + R() * 260, { vx: pm() * 60, vy: 20 + R() * 40, life: 1.4 + R(), r0: 3 * s, r1: 2 * s, a: 0.95, tint: 0xffffff, spin: pm() * 6, fade: 0.15 });
    });
    drips.rate('melt', 0.8, dt, () => {
      const [x, y] = PLAIN_TIPS[Math.floor(R() * 5)];
      drips.emit(x, y + 12, { vy: 30, life: 0.7, r0: 4 * s, r1: 3 * s, a: 0.9, tint: 0xbfe6ff, grav: 900, fade: 0.05 });
    });
  },
});

// ——— Golden Foot: it glitters and sheds sparkles. ———
registerLive('golden', {
  wiggle: true,
  glow: { rate: 0.7, depth: 0.5, base: 0.4 },
  setup: (k) => ({ sparks: k.emitter({ frame: 'spark', add: true, drag: 0.4, max: 60 }), glints: k.emitter({ frame: 'ember', add: true, drag: 0, max: 30 }) }),
  tick(k, dt, { sparks, glints }) {
    const s = k.f.type.scale;
    glints.rate('glitter', 4, dt, () => twinkle(glints, 30 + R() * 160, 10 + R() * 240, s, R() < 0.5 ? 0xfff4c0 : 0xffffff, 9));
    sparks.rate('shed', 3, dt, () => {
      sparks.emit(30 + R() * 160, 30 + R() * 200, { vx: pm() * 30, vy: 20 + R() * 40, life: 0.8 + R() * 0.5, r0: 6 * s, r1: 2 * s, a: 0.9, tint: 0xffd84a, spin: pm() * 8, grav: 120, fade: 0.1 });
    });
  },
});

/** A landing's puff of dust (or plaster, or sand) round the sole. */
function landPuff(k: LiveFoot, e: ReturnType<LiveFoot['emitter']>, n: number, y: number, tint: number, a = 0.45, w = 220): void {
  const s = k.f.type.scale;
  for (let i = 0, m = k.burst(n); i < m; i++) {
    const side = R() < 0.5 ? -1 : 1;
    e.emit(CX + side * R() * w * 0.5, y, { vx: side * (80 + R() * 160), vy: -20 - R() * 50, life: 0.7 + R() * 0.5, r0: 8 * s, r1: 30 * s, a, tint, fade: 0.08 });
  }
}

// ——— Sweaty Sock: it drips, a damp haze rises off it, and every stomp splashes. ———
registerLive('sock', {
  wiggle: true,
  setup: (k) => ({ drips: k.emitter({ frame: 'drop', drag: 0.2, max: 60 }), haze: k.emitter({ frame: 'soft', curl: 50, drag: 0.8, max: 60 }) }),
  tick(k, dt, { drips, haze }) {
    const s = k.f.type.scale;
    const drop = (x: number, y: number, vx: number, vy: number) => drips.emit(x, y, { vx, vy, life: 0.8, r0: 4.5 * s, r1: 3.5 * s, a: 0.85, tint: 0xdfeee8, grav: 900, fade: 0.04 });
    drips.rate('sweat', 1.6, dt, () => {
      const [x, y] = PLAIN_TIPS[Math.floor(R() * 5)];
      drop(x + pm() * 8, y - 2, 0, 20);
    });
    haze.rate('damp', 4, dt, () => haze.emit(30 + R() * 160, 30 + R() * 170, { vx: pm() * 14, vy: -24 - R() * 20, life: 1.6 + R(), r0: 10 * s, r1: 34 * s, a: 0.18, tint: 0xd8d8b0, fade: 0.3 }));
    if (k.landed) for (let i = 0, n = k.burst(12); i < n; i++) drop(30 + R() * 160, 250, pm() * 340, -140 - R() * 200);
  },
});

// ——— Toe-Sock Tina: her toes wiggle; lint in every colour drifts off the wool. ———
const TINA_TINTS = [0xff4d6d, 0xff9f1c, 0xffd23f, 0x3ddc97, 0x4cc9f0, 0x7b5cff];
registerLive('tina', {
  wiggle: true,
  setup: (k) => ({ lint: k.emitter({ frame: 'mote', curl: 40, drag: 1.2, max: 30 }) }),
  tick(k, dt, { lint }) {
    const s = k.f.type.scale;
    lint.rate('lint', 1.6, dt, () => lint.emit(20 + R() * 180, 40 + R() * 200, { vx: pm() * 20, vy: 6 + R() * 14, life: 1.6 + R(), r0: 3 * s, r1: 2.4 * s, a: 0.9, tint: TINA_TINTS[Math.floor(R() * 6)], grav: 20, fade: 0.2 }));
  },
});

// ——— Argyle Arthur: wool fluff drifts off the thick sock. ———
registerLive('arthur', {
  wiggle: true,
  setup: (k) => ({ fluff: k.emitter({ frame: 'mote', curl: 40, drag: 1.2, max: 30 }) }),
  tick(k, dt, { fluff }) {
    const s = k.f.type.scale;
    fluff.rate('fluff', 1.6, dt, () => fluff.emit(20 + R() * 180, 40 + R() * 200, { vx: pm() * 20, vy: 6 + R() * 14, life: 1.6 + R(), r0: 3.4 * s, r1: 2.6 * s, a: 0.85, tint: R() < 0.5 ? 0xf2e8c8 : 0xe9c46a, grav: 20, fade: 0.2 }));
  },
});

// ——— Socks & Sandals Dad: so comfortable it heals: soft green sparkles rise off him while he's hurt. ———
registerLive('dad', {
  wiggle: true,
  setup: (k) => ({ comfy: k.emitter({ frame: 'ember', add: true, curl: 30, drag: 0.8, max: 40 }) }),
  tick(k, dt, { comfy }) {
    const s = k.f.type.scale;
    const hurt = k.f.hp < k.f.maxHp;
    comfy.rate('heal', hurt ? 5 : 0.8, dt, () => comfy.emit(30 + R() * 160, 40 + R() * 180, { vx: pm() * 16, vy: -40 - R() * 30, life: 1 + R() * 0.6, r0: 5 * s, r1: 1.5 * s, a: 0.9, tint: R() < 0.6 ? 0x8affb0 : 0xffffff, fade: 0.2 }));
  },
});

// ——— Mummy Toes: the loose end of its wrapping sways; dust sifts off the old linen. ———
registerLive('mummy', {
  wiggle: true,
  sway: { end: { k: 40, c: 3.6, gain: 1.4, idle: 0.12, flop: 1.4 } },
  setup: (k) => ({ dust: k.emitter({ frame: 'mote', curl: 30, drag: 1, max: 60 }), puff: k.emitter({ frame: 'puff', curl: 40, drag: 2, below: true, max: 30 }) }),
  tick(k, dt, { dust, puff }) {
    const s = k.f.type.scale;
    dust.rate('sift', 4, dt, () => dust.emit(30 + R() * 160, 20 + R() * 220, { vx: pm() * 10, vy: 10 + R() * 20, life: 1.4 + R(), r0: 2.4 * s, r1: 1.8 * s, a: 0.8, tint: 0xc8b890, grav: 60, fade: 0.1 }));
    if (k.landed) landPuff(k, puff, 8, 250, 0xd8c8a0, 0.4);
  },
});

// ——— Broken Bill: his toes wiggle out of the cast; landing puffs plaster dust off it. ———
registerLive('bill', {
  wiggle: true,
  rig: { squash: 0.7 },
  setup: (k) => ({ puff: k.emitter({ frame: 'puff', curl: 40, drag: 2, below: true, max: 30 }), chips: k.emitter({ frame: 'flake', drag: 0.6, max: 30 }) }),
  tick(k, dt, { puff, chips }) {
    const s = k.f.type.scale;
    chips.rate('crumble', 0.6, dt, () => chips.emit(30 + R() * 160, 40 + R() * 140, { vx: pm() * 20, vy: 10, life: 1.2, r0: 3 * s, r1: 2.5 * s, a: 0.95, tint: 0xf2eee4, spin: pm() * 6, grav: 500, fade: 0.05 }));
    if (k.landed) {
      landPuff(k, puff, 10, 190, 0xf4f0e8, 0.5);
      for (let i = 0, n = k.burst(6); i < n; i++) chips.emit(30 + R() * 160, 190, { vx: pm() * 260, vy: -100 - R() * 160, life: 0.8, r0: 3 * s, r1: 2.5 * s, a: 1, tint: 0xf2eee4, spin: pm() * 10, grav: 900, fade: 0.03 });
    }
  },
});

// ——— Gladiator Gus: his strap tails sway, his brass glints and he stamps up arena dust. ———
registerLive('gus', {
  wiggle: true,
  sway: {
    tailL: { k: 46, c: 4, gain: 1.3, idle: 0.08, flop: 1.2 },
    tailR: { k: 50, c: 4.2, gain: 1.3, idle: 0.08, flop: 1.2 },
  },
  setup: (k) => ({ puff: k.emitter({ frame: 'puff', curl: 40, drag: 2, below: true, max: 30 }), glints: k.emitter({ frame: 'ember', add: true, drag: 0, max: 10 }) }),
  tick(k, dt, { puff, glints }) {
    const s = k.f.type.scale;
    glints.rate('brass', 0.7, dt, () => twinkle(glints, 116, 86, s, 0xffe8a0, 10));
    if (k.landed) landPuff(k, puff, 10, 262, 0xd8b888, 0.45);
  },
});

// ——— Quackfoot: the toes paddle, water drips off the webs, a feather drifts down now and then. ———
registerLive('quack', {
  wiggle: true,
  setup: (k) => ({ drips: k.emitter({ frame: 'drop', drag: 0.2, max: 40 }), feathers: k.emitter({ frame: 'flake', curl: 70, drag: 2.2, max: 6 }) }),
  tick(k, dt, { drips, feathers }) {
    const s = k.f.type.scale;
    const drop = (x: number, y: number, vx: number, vy: number) => drips.emit(x, y, { vx, vy, life: 0.8, r0: 4.5 * s, r1: 3.5 * s, a: 0.85, tint: 0xbfe6ff, grav: 900, fade: 0.04 });
    drips.rate('drip', 2, dt, () => {
      const x = [CX - 108, CX - 52, CX, CX + 52, CX + 108][Math.floor(R() * 5)];
      drop(x + pm() * 10, 236 + R() * 24, 0, 20);
    });
    feathers.rate('feather', 0.25, dt, () => feathers.emit(20 + R() * 180, 30 + R() * 100, { vx: pm() * 30, vy: 10, life: 3, r0: 7 * s, r1: 6 * s, a: 0.95, tint: 0xfffaf0, spin: pm() * 2, grav: 20, fade: 0.1 }));
    if (k.landed) for (let i = 0, n = k.burst(12); i < n; i++) drop(CX + pm() * 220, 262, pm() * 380, -140 - R() * 200);
  },
});

// ——— Xeno Toes: its pads and veins pulse; motes of green light spark off it. ———
registerLive('xeno', {
  wiggle: true,
  glow: { rate: 1.1, depth: 0.5, base: 0.4 },
  setup: (k) => ({ motes: k.emitter({ frame: 'ember', add: true, curl: 60, drag: 0.8, max: 50 }) }),
  tick(k, dt, { motes }) {
    const s = k.f.type.scale;
    motes.rate('spark', 4, dt, () => motes.emit(20 + R() * 180, 40 + R() * 240, { vx: pm() * 30, vy: -30 - R() * 40, life: 0.9 + R() * 0.6, r0: 4 * s, r1: 1 * s, a: 0.95, tint: R() < 0.7 ? 0x7dffb0 : 0xd8b0ff, fade: 0.2 }));
    if (k.landed) for (let i = 0, n = k.burst(10); i < n; i++) motes.emit(CX + pm() * 200, 270, { vx: pm() * 300, vy: -80 - R() * 160, life: 0.6, r0: 4 * s, r1: 1 * s, a: 1, tint: 0x7dffb0, grav: 300, fade: 0.05 });
  },
});

// ——— Dino Stomper: its claws flex out before it drops; every stomp shakes up dust and grit. ———
registerLive('dino', {
  wiggle: true,
  rig: { squash: 1.2 },
  setup: (k) => ({ puff: k.emitter({ frame: 'puff', curl: 40, drag: 2, below: true, max: 40 }), grit: k.emitter({ frame: 'flake', drag: 0.4, max: 40 }) }),
  tick(k, _dt, { puff, grit }) {
    const s = k.f.type.scale;
    if (k.landed) {
      landPuff(k, puff, 14, 286, 0xb8a888, 0.5, 260);
      for (let i = 0, n = k.burst(10); i < n; i++) grit.emit(CX + pm() * 220, 284, { vx: pm() * 300, vy: -160 - R() * 220, life: 0.8, r0: 4 * s, r1: 3 * s, a: 1, tint: R() < 0.5 ? 0x6a5a40 : 0x8a7a5a, spin: pm() * 10, grav: 1000, fade: 0.03 });
    }
  },
});
