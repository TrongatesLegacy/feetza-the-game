// How Act 8's new Jotunheim feet move in play (src/game/liveKit.ts): Wolf-Pup Paws, Berserker Boots and Shieldmaiden
// Sabatons. Their art is in src/content/style/acts-d-4.ts; their trait moments (the parry, the rage) are flagged on
// the foot's brain by src/game/acts/act8.ts. Cosmetic randomness only through crand() (the game's seeded generator).

import { CX } from '../../art/feetCommon';
import { type LiveFoot, registerLive } from '../../game/liveKit';
import { crand } from '../../systems/cosmeticRandom';
import { BERSERK_PAINT } from '../style/acts-d-4';

const R = () => crand();
const pm = () => crand() - 0.5;
type Em = ReturnType<LiveFoot['emitter']>;

/** A burst of snow thrown out sideways when the foot lands. */
function landSnow(k: LiveFoot, em: Em, n: number, y: number, spread = 70): void {
  if (!k.landed) return;
  const s = k.f.type.scale;
  for (let i = 0, m = k.burst(n); i < m; i++) {
    const side = R() < 0.5 ? -1 : 1;
    em.emit(CX + side * (40 + R() * spread), y, { vx: side * (80 + R() * 160), vy: -30 - R() * 60, life: 0.6 + R() * 0.5, r0: 8 * s, r1: 26 * s, a: 0.6, tint: R() < 0.6 ? 0xf4faff : 0xd8e8f8, fade: 0.05 });
  }
}

// Wolf-Pup Paws: the toes knead, the two big tufts and the rune tag bounce, loose fluff and snow fall off it, and it
// lands in a spray of snow.
registerLive('wolfpup', {
  wiggle: true,
  rig: { swing: 1.5, squash: 1.4, breath: 1.4 },
  sway: {
    tuftL: { k: 46, c: 4, gain: 1.5, idle: 0.12, flop: 1.4 },
    tuftR: { k: 46, c: 4, gain: 1.5, idle: 0.12, flop: 1.4 },
    tag: { k: 60, c: 3, gain: 2.2, idle: 0.1, flop: 1.6 },
  },
  setup: (k) => ({
    fluff: k.emitter({ frame: 'flake', curl: 40, drag: 0.9, max: 20 }),
    snow: k.emitter({ frame: 'puff', curl: 20, drag: 1.4, below: true, max: 30 }),
    crumbs: k.emitter({ frame: 'mote', drag: 0.3, max: 24 }),
  }),
  tick(k, dt, { fluff, snow, crumbs }) {
    const s = k.f.type.scale;
    fluff.rate('fluff', 0.8, dt, () => {
      const side = R() < 0.5 ? -1 : 1;
      fluff.emit(CX + side * (80 + R() * 20), 60 + R() * 120, { vx: side * (10 + R() * 30), vy: 10, life: 1.8, r0: 4 * s, r1: 3 * s, a: 0.8, tint: R() < 0.5 ? 0xc8ccd4 : 0xf0e8d8, spin: 2, grav: 25, fade: 0.15 });
    });
    // snow shaken out of the fur as it scampers
    const moving = Math.min(1, Math.abs(k.vx) / 300 + Math.max(0, k.vy) / 900);
    crumbs.rate('crumb', 1 + moving * 8, dt, () => {
      crumbs.emit(CX + pm() * 170, 160 + R() * 90, { vx: pm() * 30, vy: 10, life: 0.8, r0: 2.6 * s, r1: 2 * s, a: 0.95, tint: 0xf4faff, grav: 600, fade: 0.05 });
    });
    landSnow(k, snow, 10, 256, 60);
  },
});

// Berserker Boots: the bear paw swings, the pelt sheds a hair or two, and it lands hard in a burst of snow. Enraged
// (below half health) it shakes with fury, the paint and leather glow red (its heat layer), steam pours off it and
// sparks of rage fly up off the war paint.
registerLive<{ steam: Em; embers: Em; snow: Em; hair: Em }>('berserker', {
  rig: { swing: 1.4, squash: 1.3 },
  sway: { paw: { k: 64, c: 6, gain: 0.8, idle: 0.06, flop: 0.8 } },
  heat: { of: (f) => (f.enraged ? 0.95 : 0), boost: 0.6 },
  setup: (k) => ({
    steam: k.emitter({ frame: 'soft', curl: 40, drag: 0.8, max: 70 }),
    embers: k.emitter({ frame: 'ember', add: true, drag: 0.5, max: 40 }),
    snow: k.emitter({ frame: 'puff', curl: 20, drag: 1.4, below: true, max: 30 }),
    hair: k.emitter({ frame: 'flake', curl: 40, drag: 0.9, max: 10 }),
  }),
  pose(k, _dt, p) {
    // fury: a fast tremble, harder while it winds up
    if (!k.f.enraged) return p;
    const amp = k.windingUp ? 0.05 : 0.022;
    return { ...p, swing: p.swing + Math.sin(k.t * 47) * amp, sy: p.sy + Math.sin(k.t * 31) * 0.012 };
  },
  tick(k, dt, { steam, embers, snow, hair }) {
    const s = k.f.type.scale;
    hair.rate('hair', 0.5, dt, () => {
      hair.emit(CX + pm() * 200, 70 + R() * 30, { vx: pm() * 30, vy: 10, life: 1.6, r0: 3.5 * s, r1: 2.6 * s, a: 0.8, tint: 0x6a4a30, spin: 2, grav: 30, fade: 0.15 });
    });
    const h = k.heat;
    if (h > 0.08) {
      steam.rate('rage', 16 * h, dt, () => {
        steam.emit(CX + pm() * 200, 20 + R() * 80, { vx: pm() * 40, vy: -60 - R() * 60, life: 1 + R() * 0.6, r0: 10 * s, r1: 42 * s, a: 0.32 * h, tint: R() < 0.5 ? 0xffe4dc : 0xf4f0f0, fade: 0.2, grav: -30 });
      });
      embers.rate('spark', 9 * h, dt, () => {
        const [x0, y0, x1, y1] = BERSERK_PAINT[Math.floor(R() * BERSERK_PAINT.length)];
        const u = R();
        embers.emit(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, { vx: pm() * 50, vy: -80 - R() * 90, life: 0.7 + R() * 0.5, r0: 2.8 * s, r1: 0.8 * s, a: 1, tint: R() < 0.5 ? 0xff5a2a : 0xffb060, grav: -40, fade: 0.05 });
      });
    }
    landSnow(k, snow, 14, 262, 80);
  },
});

// Shieldmaiden Sabatons: the shield hangs on its strap and swings as she moves; when it turns a smack aside it snaps
// out and up with a flash and springs back; snow flies when she lands.
registerLive<{ snow: Em; sparks: Em; seen: number; t: number }>('shieldmaiden', {
  rig: { swing: 0.9, squash: 0.9 },
  sway: { shield: { k: 34, c: 5, gain: 0.9, idle: 0.05, flop: 0.8 } },
  setup: (k) => ({
    snow: k.emitter({ frame: 'puff', curl: 20, drag: 1.4, below: true, max: 30 }),
    sparks: k.emitter({ frame: 'spark', add: true, drag: 0.6, max: 30 }),
    seen: Number(k.f.brain.parries ?? 0),
    t: 9,
  }),
  tick(k, dt, st) {
    const s = k.f.type.scale;
    const parries = Number(k.f.brain.parries ?? 0);
    if (parries !== st.seen) {
      st.seen = parries;
      st.t = 0;
      for (let i = 0; i < 10; i++) st.sparks.emit(CX - 70 + pm() * 40, 120 + pm() * 50, { vx: -120 - R() * 200, vy: pm() * 260, life: 0.35, r0: 3, r1: 14 * s, a: 1, tint: R() < 0.5 ? 0xffe08a : 0xffffff, fade: 0.3 });
    }
    st.t += dt;
    const img = k.swayImg('shield');
    if (img && st.t < 0.6) {
      // snap out (fast), hold, ease back: positive turns it up and out round its strap
      const u = st.t / 0.6;
      const out = u < 0.15 ? u / 0.15 : Math.pow(1 - (u - 0.15) / 0.85, 2);
      img.rotation += 0.55 * out;
    }
    landSnow(k, st.snow, 12, 258, 70);
  },
});
