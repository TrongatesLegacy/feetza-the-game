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
