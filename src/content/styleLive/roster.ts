// How the roster batch's feet move in play (src/game/liveKit.ts). Their art is in src/content/style/roster-*.ts.
// Cosmetic randomness only through crand() (the game's seeded generator).

import { CX } from '../../art/feetCommon';
import { type LiveFoot, registerLive } from '../../game/liveKit';
import { crand } from '../../systems/cosmeticRandom';
import { ANT_TIPS } from '../style/roster-1';

const R = () => crand();
const pm = () => crand() - 0.5;
const TOES = [36, 70, 106, 145, 189];
const anyToe = () => TOES[Math.floor(R() * 5)];

/** A puff of dust (or snow, or sand) thrown out sideways when the foot lands. */
function landDust(k: LiveFoot, em: ReturnType<LiveFoot['emitter']>, tint: number, n = 10, y = 258, a = 0.45): void {
  if (!k.landed) return;
  const s = k.f.type.scale;
  for (let i = 0, m = k.burst(n); i < m; i++) {
    const side = R() < 0.5 ? -1 : 1;
    em.emit(CX + side * (40 + R() * 70), y, { vx: side * (80 + R() * 160), vy: -20 - R() * 50, life: 0.6 + R() * 0.5, r0: 8 * s, r1: 26 * s, a, tint, fade: 0.05 });
  }
}

// ——— Trattoria ———

// Waiter Walt: the napkin's corner swings; the patent toe throws a glint now and then.
registerLive('waiter', {
  sway: { napkin: { k: 60, c: 5, gain: 1.4, idle: 0.08, flop: 1.2 } },
  setup: (k) => ({ glint: k.emitter({ frame: 'spark', add: true, drag: 0, max: 6 }) }),
  tick(k, dt, { glint }) {
    glint.rate('shine', 0.5, dt, () => {
      glint.emit(CX - 44 + pm() * 20, 204, { life: 0.35, r0: 2, r1: 16 * k.f.type.scale, a: 0.9, tint: 0xffffff, fade: 0.4 });
    });
  },
});

// Garlic Gary: green garlic fumes curl off his toes and drift up round him, thicker as he hovers.
registerLive('garlicgary', {
  wiggle: true,
  setup: (k) => ({ fume: k.emitter({ frame: 'puff', curl: 40, drag: 0.8, max: 140 }), back: k.emitter({ frame: 'soft', curl: 30, drag: 0.7, below: true, max: 80 }) }),
  tick(k, dt, { fume, back }) {
    const s = k.f.type.scale;
    const hover = k.f.state === 'hover' ? 1.6 : 1;
    fume.rate('toes', 6 * hover, dt, () => {
      fume.emit(anyToe() + pm() * 10, 240 + R() * 16, { vx: pm() * 30, vy: -30 - R() * 30, life: 1.6 + R(), r0: 8 * s, r1: 30 * s, a: 0.4, tint: R() < 0.6 ? 0xb8d050 : 0x8aa82a, fade: 0.25, grav: -20 });
    });
    back.rate('sides', 3, dt, () => {
      const side = R() < 0.5 ? -1 : 1;
      back.emit(CX + side * (90 + R() * 20), 120 + R() * 100, { vx: side * 12, vy: -24 - R() * 20, life: 2 + R(), r0: 12 * s, r1: 40 * s, a: 0.3, tint: 0xa8c040, fade: 0.3 });
    });
  },
});

// Espresso Ed: steam curls off the crema; he jitters, and his jitters spill coffee drops over the rim.
registerLive('espresso', {
  rig: { swing: 1.8, breath: 2.5 },
  setup: (k) => ({ steam: k.emitter({ frame: 'soft', curl: 50, drag: 0.9, max: 100 }), drops: k.emitter({ frame: 'drop', drag: 0.2, max: 30 }), jit: { t: 0 } }),
  tick(k, dt, { steam, drops, jit }) {
    const s = k.f.type.scale;
    steam.rate('cup', 7, dt, () => {
      const side = R() < 0.5 ? -1 : 1;
      steam.emit(CX + side * (64 + R() * 22), 122, { vx: side * 6 + pm() * 10, vy: -40 - R() * 30, life: 1.4 + R() * 0.6, r0: 5 * s, r1: 22 * s, a: 0.4, tint: 0xf8f4f0, fade: 0.3 });
    });
    jit.t -= dt;
    if (jit.t <= 0) {
      jit.t = 0.5 + R() * 0.9;
      for (let i = 0, n = k.burst(3); i < n; i++) {
        const side = R() < 0.5 ? -1 : 1;
        drops.emit(CX + side * (70 + R() * 18), 124, { vx: side * (40 + R() * 80), vy: -90 - R() * 80, life: 0.7, r0: 4 * s, r1: 3 * s, a: 1, tint: 0x5a2e14, grav: 700, fade: 0.02 });
      }
    }
  },
});

// Saucy Sal: sauce drips swell and fall from her toes, and splash when she lands.
registerLive('saucysal', {
  wiggle: true,
  setup: (k) => ({ drips: k.emitter({ frame: 'drop', drag: 0.15, max: 50 }) }),
  tick(k, dt, { drips }) {
    const s = k.f.type.scale;
    drips.rate('drip', 1.8, dt, () => {
      drips.emit(anyToe() + pm() * 6, 270, { vy: 30, life: 0.9, r0: 5.5 * s, r1: 4 * s, a: 1, tint: R() < 0.7 ? 0xc8231b : 0xa81a14, grav: 900, fade: 0.02 });
    });
    if (k.landed)
      for (let i = 0, n = k.burst(12); i < n; i++) drips.emit(30 + R() * 160, 262, { vx: pm() * 380, vy: -120 - R() * 220, life: 0.6, r0: 4.5 * s, r1: 3 * s, a: 1, tint: 0xc8231b, grav: 900, fade: 0.02 });
  },
});

// ——— Rooftop ———

// Antenna Andy: the antennas wobble on springs and signal rings pulse off the tips.
registerLive('antenna', {
  sway: {
    antL: { k: 38, c: 3, gain: 1.4, idle: 0.08, flop: 1.4 },
    antR: { k: 42, c: 3.2, gain: 1.4, idle: 0.08, flop: 1.4 },
  },
  setup: (k) => ({ rings: k.emitter({ frame: 'bubble', add: true, drag: 0, max: 40 }) }),
  tick(k, dt, { rings }) {
    const s = k.f.type.scale;
    rings.rate('ping', 2.4, dt, () => {
      const [x, y] = ANT_TIPS[R() < 0.5 ? 0 : 1];
      rings.emit(x, y, { life: 0.8, r0: 4 * s, r1: 34 * s, a: 0.8, tint: 0xffd23a, fade: 0.05 });
    });
  },
});

// Parkour Pablo: speed streaks trail off his sidesteps; grit kicks up when he lands.
registerLive('parkour', {
  wiggle: true,
  rig: { swing: 1.4 },
  setup: (k) => ({ streak: k.emitter({ frame: 'spark', add: true, drag: 0.5, max: 60 }), dust: k.emitter({ frame: 'puff', curl: 20, drag: 1.4, below: true, max: 40 }) }),
  tick(k, dt, { streak, dust }) {
    const s = k.f.type.scale;
    const sp = Math.abs(k.vx);
    if (sp > 120)
      streak.rate('run', Math.min(40, sp / 12), dt, () => {
        streak.emit(CX + (k.vx > 0 ? -1 : 1) * (60 + R() * 40), 40 + R() * 200, { vx: -k.vx * 0.2, life: 0.3, r0: 18 * s, r1: 10 * s, a: 0.55, tint: R() < 0.5 ? 0xffffff : 0xff9a3a, fade: 0.1 });
      });
    landDust(k, dust, 0xb8a88a, 8);
  },
});

// ——— Beach ———

// Sandy Sandra: sand trickles off the mound; it trembles and sheds more as she's about to surface.
registerLive('sandy', {
  rig: { squash: 0.6, swing: 0.6 },
  setup: (k) => ({ grains: k.emitter({ frame: 'mote', drag: 0.4, max: 120 }), dust: k.emitter({ frame: 'puff', curl: 20, drag: 1.3, below: true, max: 40 }) }),
  tick(k, dt, { grains, dust }) {
    const s = k.f.type.scale;
    const n = k.windingUp ? 40 : 6;
    grains.rate('trickle', n, dt, () => {
      const side = R() < 0.5 ? -1 : 1;
      grains.emit(CX + side * (60 + R() * 56), 190 + R() * 60, { vx: side * (10 + R() * 30), vy: R() * 20, life: 0.8 + R() * 0.5, r0: 2.4 * s, r1: 2 * s, a: 0.95, tint: R() < 0.5 ? 0xe8c47a : 0xc8a058, grav: 600, fade: 0.02 });
    });
    landDust(k, dust, 0xe8cf9a, 12, 262, 0.55);
  },
});

// Seaweed Steph: the kelp ribbons sway on their springs and seawater drips off them.
registerLive('seaweed', {
  wiggle: true,
  sway: Object.fromEntries([0, 1, 2, 3].map((i) => [`kelp${i}`, { k: 26 + i * 4, c: 2.6, gain: 1.8, idle: 0.12, flop: 1.6 }])),
  setup: (k) => ({ drips: k.emitter({ frame: 'drop', drag: 0.1, max: 40 }) }),
  tick(k, dt, { drips }) {
    const s = k.f.type.scale;
    drips.rate('drip', 2.2, dt, () => {
      drips.emit(CX - 50 + R() * 110, 250 + R() * 20, { vy: 20, life: 0.8, r0: 3.6 * s, r1: 3 * s, a: 0.8, tint: 0xbfe8ff, grav: 900, fade: 0.02 });
    });
  },
});

// Coconut Kev: the polished shell throws a gleam now and then; the cocktail umbrella sways.
registerLive('coconut', {
  rig: { squash: 0.7 },
  sway: { umbrella: { k: 40, c: 3, gain: 1.6, idle: 0.1, flop: 1.2 } },
  setup: (k) => ({ gleam: k.emitter({ frame: 'spark', add: true, drag: 0, max: 8 }) }),
  tick(k, dt, { gleam }) {
    if (k.f.hp < k.f.maxHp) return;
    gleam.rate('gleam', 0.7, dt, () => {
      gleam.emit(CX - 58 + pm() * 16, 206 + pm() * 8, { life: 0.4, r0: 2, r1: 20 * k.f.type.scale, a: 1, tint: 0xfff4d8, fade: 0.4 });
    });
  },
});

// Tidepool Tess: the anemone glows (brighter as she heals) and bubbles rise off her.
registerLive('tidepool', {
  wiggle: true,
  glow: { rate: 0.5, depth: 0.5, base: 0.35 },
  setup: (k) => ({ bubbles: k.emitter({ frame: 'bubble', curl: 30, drag: 0.6, max: 60 }) }),
  tick(k, dt, { bubbles }) {
    const s = k.f.type.scale;
    bubbles.rate('rise', 4, dt, () => {
      bubbles.emit(30 + R() * 160, 60 + R() * 180, { vx: pm() * 10, vy: -40 - R() * 40, life: 1.2 + R() * 0.8, r0: 3 * s, r1: 6 * s, a: 0.8, tint: 0xe8ffff, grav: -30, fade: 0.1 });
    });
  },
});

// ——— Diner ———

// Riot Ryan: a blue glint sweeps the shield every few seconds; grit kicks up when the boot lands.
registerLive('riot', {
  rig: { squash: 0.7, swing: 0.7 },
  setup: (k) => ({ glint: k.emitter({ frame: 'spark', add: true, drag: 0, max: 10 }), dust: k.emitter({ frame: 'puff', curl: 20, drag: 1.4, below: true, max: 40 }), t: { v: 1 } }),
  tick(k, dt, { glint, dust, t }) {
    t.v -= dt;
    if (t.v <= 0) {
      t.v = 2.4 + R() * 1.5;
      for (let i = 0; i < 3; i++) glint.emit(CX - 60 + i * 40, 40 + i * 50, { life: 0.5, r0: 4, r1: 30 * k.f.type.scale, a: 0.9, tint: 0x9fd0ff, fade: 0.3 });
    }
    landDust(k, dust, 0x8a8478, 10);
  },
});

// Waffle Wanda: crumbs fall off her and syrup drips; landing throws crumbs.
registerLive('waffle', {
  setup: (k) => ({ crumbs: k.emitter({ frame: 'flake', drag: 0.3, max: 80 }), syrup: k.emitter({ frame: 'drop', drag: 0.1, max: 20 }), hp: { v: k.f.hp } }),
  tick(k, dt, { crumbs, syrup, hp }) {
    const s = k.f.type.scale;
    crumbs.rate('crumb', 3, dt, () => {
      crumbs.emit(CX - 90 + R() * 180, 180 + R() * 80, { vx: pm() * 20, vy: 10, life: 0.9, r0: 3 * s, r1: 2.6 * s, a: 1, tint: R() < 0.5 ? 0xe0a046 : 0xb8742a, grav: 700, spin: 6, fade: 0.02 });
    });
    syrup.rate('syrup', 0.9, dt, () => {
      syrup.emit(CX + 50 + pm() * 4, 200, { vy: 20, life: 0.8, r0: 5 * s, r1: 4 * s, a: 1, tint: 0xa8540e, grav: 800, fade: 0.02 });
    });
    if (k.landed || k.f.hp < hp.v) {
      for (let i = 0, n = k.burst(10); i < n; i++) crumbs.emit(CX - 80 + R() * 160, 150 + R() * 100, { vx: pm() * 260, vy: -60 - R() * 160, life: 0.8, r0: 3.4 * s, r1: 3 * s, a: 1, tint: 0xd8963e, grav: 800, spin: 8, fade: 0.02 });
    }
    hp.v = k.f.hp;
  },
});

// Ketchup Kenny: a blob of ketchup swells on the nozzle and drops; it splats when he lands.
registerLive('ketchup', {
  rig: { squash: 1.3 },
  setup: (k) => ({ blob: k.emitter({ frame: 'drop', drag: 0.1, max: 30 }) }),
  tick(k, dt, { blob }) {
    const s = k.f.type.scale;
    blob.rate('blob', 0.8, dt, () => {
      blob.emit(CX, 288, { vy: 10, life: 1, r0: 9 * s, r1: 10 * s, a: 1, tint: 0xc81818, grav: 700, fade: 0.2 });
    });
    if (k.landed)
      for (let i = 0, n = k.burst(10); i < n; i++) blob.emit(CX + pm() * 40, 282, { vx: pm() * 320, vy: -80 - R() * 160, life: 0.6, r0: 5 * s, r1: 4 * s, a: 1, tint: 0xd81f1f, grav: 900, fade: 0.02 });
  },
});

// Fry Cook Fran: the basket sizzles and spits grease, and a heat shimmer rises off the fries.
registerLive('frycook', {
  setup: (k) => ({ spit: k.emitter({ frame: 'ember', add: true, drag: 0.4, max: 80 }), shimmer: k.emitter({ frame: 'soft', curl: 40, drag: 0.9, max: 40 }) }),
  tick(k, dt, { spit, shimmer }) {
    const s = k.f.type.scale;
    spit.rate('spit', 9, dt, () => {
      spit.emit(CX - 90 + R() * 180, 150 + R() * 10, { vx: pm() * 160, vy: -80 - R() * 160, life: 0.4 + R() * 0.3, r0: 2.6 * s, r1: 1 * s, a: 1, tint: R() < 0.5 ? 0xfff2a0 : 0xffc040, grav: 700, fade: 0.02 });
    });
    shimmer.rate('heat', 3, dt, () => {
      shimmer.emit(CX - 80 + R() * 160, 110, { vx: pm() * 10, vy: -50, life: 1.2, r0: 10 * s, r1: 28 * s, a: 0.18, tint: 0xfff8e8, fade: 0.3 });
    });
  },
});
