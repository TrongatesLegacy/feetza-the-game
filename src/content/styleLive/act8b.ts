// How Act 8's last four feet move in play (src/game/liveKit.ts): Raven Talons, Skald Slippers, Dwarf-Forged Boots and
// Muspel Fire-Feet. Their art is in src/content/style/acts-d-5.ts; their trait moments (the skald's song) are flagged
// on the foot's brain by src/game/acts/act8.ts. Cosmetic randomness only through crand() (the game's seeded
// generator).

import { CX } from '../../art/feetCommon';
import { carvedRune } from '../style/acts-d-kit';
import { type LiveFoot, registerLive } from '../../game/liveKit';
import { crand } from '../../systems/cosmeticRandom';
import { save } from '../../systems/save';
import { DWARF_RUNES, LYRE, LYRE_STRINGS, MUSPEL_FLAMES, RAVEN_RING } from '../style/acts-d-5';

const R = () => crand();
const pm = () => crand() - 0.5;
type Em = ReturnType<LiveFoot['emitter']>;

/** A burst of dust (or grit, or ash) thrown out sideways when the foot lands. */
function landPuff(k: LiveFoot, em: Em, n: number, y: number, tint: number, spread = 70, a = 0.5): void {
  if (!k.landed) return;
  const s = k.f.type.scale;
  for (let i = 0, m = k.burst(n); i < m; i++) {
    const side = R() < 0.5 ? -1 : 1;
    em.emit(CX + side * (40 + R() * spread), y, { vx: side * (80 + R() * 160), vy: -30 - R() * 60, life: 0.6 + R() * 0.5, r0: 8 * s, r1: 26 * s, a, tint, fade: 0.05 });
  }
}

// Raven Talons: the wings beat (faster in the dive, and in a flurry when it's knocked back), a black feather drifts
// off now and then, the stolen gold ring glints, and feathers fly when it lands.
registerLive<{ feathers: Em; glint: Em; dust: Em; ph: number; flap: number }>('raven', {
  rig: { swing: 1.5, squash: 1.1 },
  sway: { wingL: { k: 50, c: 5, gain: 0.8, idle: 0.08, below: true }, wingR: { k: 50, c: 5, gain: 0.8, idle: 0.08, below: true } },
  setup: (k) => ({
    feathers: k.emitter({ frame: 'flake', curl: 50, drag: 0.8, max: 16 }),
    glint: k.emitter({ frame: 'spark', add: true, drag: 0, max: 8 }),
    dust: k.emitter({ frame: 'puff', curl: 20, drag: 1.4, below: true, max: 24 }),
    ph: R() * 6,
    flap: 0,
  }),
  tick(k, dt, st) {
    const s = k.f.type.scale;
    const f = k.f;
    // a flurry when it's knocked about (the flutter trait: it rights itself fast)
    if (k.vy < -500) st.flap = 1;
    st.flap = Math.max(0, st.flap - dt * 1.5);
    const fast = f.state === 'descend' || k.windingUp ? 1.8 : 1;
    st.ph += dt * (3.4 * fast + st.flap * 5) * Math.PI * 2;
    const amp = (save.settings.reducedMotion ? 0.2 : 0.42) * (1 + st.flap * 0.5);
    const beat = Math.sin(st.ph) * amp + Math.sin(st.ph * 2) * amp * 0.15;
    for (const [name, sd] of [['wingL', -1], ['wingR', 1]] as const) {
      const img = k.swayImg(name);
      if (img) img.rotation = sd * beat + img.rotation * 0.4;
    }
    st.feathers.rate('feather', 0.5 + st.flap * 3, dt, () => {
      const side = R() < 0.5 ? -1 : 1;
      st.feathers.emit(CX + side * (90 + R() * 40), 50 + R() * 40, { vx: side * (20 + R() * 40), vy: 20, life: 2.2, r0: 6 * s, r1: 5 * s, a: 0.95, tint: R() < 0.5 ? 0x1a1a26 : 0x2a2c44, spin: 2, grav: 30, fade: 0.1 });
    });
    st.glint.rate('ring', f.state === 'hover' ? 1.2 : 0.5, dt, () => {
      st.glint.emit(CX - 20 + R() * 30, RAVEN_RING.y - 2, { life: 0.35, r0: 2, r1: 13 * s, a: 1, tint: 0xffe08a, fade: 0.4 });
    });
    if (k.landed) for (let i = 0, n = k.burst(5); i < n; i++) st.feathers.emit(CX + pm() * 160, 120 + R() * 60, { vx: pm() * 200, vy: -60 - R() * 80, life: 1.6, r0: 6 * s, r1: 5 * s, a: 0.95, tint: 0x1a1a26, spin: 3, grav: 60, fade: 0.1 });
    landPuff(k, st.dust, 8, 262, 0xb8b0c8, 60, 0.4);
  },
});

// Skald Slippers: the lyre swings on its cord; gold runes drift round him, and when he sings (the brain's `sang`
// count changes) the strings shimmer, a burst of runes lifts off them and the runes circle faster for a while.
registerLive<{ runes: ReturnType<LiveFoot['swarm']>; sparks: Em; dust: Em; seen: number; t: number }>('skald', {
  rig: { swing: 1.1, squash: 1.1, breath: 1.4 },
  sway: { lyre: { k: 30, c: 3, gain: 1.2, idle: 0.08, flop: 1.2 } },
  setup(k) {
    const key = k.sheet('lk_skaldrune', 40, 40, 3, (ctx, i) => {
      carvedRune(ctx, [0, 3, 6][i], 12, 8, 16, 24, '#000', '#ffcf5a');
    });
    return {
      runes: k.swarm({ key, frames: 3, count: 4, at: [CX, 110], rx: 150, ry: 120, speed: 0.7, jitter: 18, scale: 0.75, upright: 0.002 }),
      sparks: k.emitter({ frame: 'spark', add: true, drag: 0.6, max: 40 }),
      dust: k.emitter({ frame: 'puff', curl: 20, drag: 1.4, below: true, max: 20 }),
      seen: Number(k.f.brain.sang ?? 0),
      t: 9,
    };
  },
  tick(k, dt, st) {
    const s = k.f.type.scale;
    const sang = Number(k.f.brain.sang ?? 0);
    // where the lyre's strings are (turned by its tilt about its cord)
    const [px, py] = LYRE.pivot;
    const at = (dx: number, dy: number): [number, number] => {
      const x = LYRE.x + dx - px;
      const y = LYRE.y + dy - py;
      const c = Math.cos(LYRE.tilt);
      const sn = Math.sin(LYRE.tilt);
      return [px + x * c - y * sn, py + x * sn + y * c];
    };
    if (sang !== st.seen) {
      st.seen = sang;
      st.t = 0;
      for (let i = 0, n = k.burst(14); i < n; i++) {
        const [x, y] = at(LYRE_STRINGS[Math.floor(R() * LYRE_STRINGS.length)], pm() * LYRE.hh * 1.2);
        st.sparks.emit(x, y, { vx: pm() * 120, vy: -60 - R() * 120, life: 0.6 + R() * 0.4, r0: 3 * s, r1: 10 * s, a: 1, tint: R() < 0.6 ? 0xffd86a : 0xfff4c0, fade: 0.3, grav: -20 });
      }
    }
    st.t += dt;
    const singing = st.t < 2.5;
    st.runes.pace += ((singing ? 2.2 : 1) - st.runes.pace) * Math.min(1, dt * 3);
    st.sparks.rate('string', singing ? 10 : 1.2, dt, () => {
      const [x, y] = at(LYRE_STRINGS[Math.floor(R() * LYRE_STRINGS.length)], pm() * LYRE.hh * 1.2);
      st.sparks.emit(x, y, { vx: pm() * 30, vy: -20 - R() * 30, life: 0.45, r0: 2 * s, r1: 8 * s, a: 0.9, tint: 0xffe08a, fade: 0.4 });
    });
    landPuff(k, st.dust, 8, 256, 0xc8c0d8, 60, 0.4);
  },
});

// Dwarf-Forged Boots: the toe cap's runes pulse with forge-light and spit an ember now and then; a landing rings sparks
// off the hobnails and throws grit. (The shield is its own piece: src/game/guardShield.ts.)
registerLive<{ embers: Em; sparks: Em; grit: Em }>('dwarfboot', {
  rig: { swing: 0.8, squash: 0.9 },
  glow: { rate: 0.8, depth: 0.45, base: 0.55 },
  setup: (k) => ({
    embers: k.emitter({ frame: 'ember', add: true, drag: 0.5, max: 30 }),
    sparks: k.emitter({ frame: 'spark', add: true, drag: 0.3, max: 30 }),
    grit: k.emitter({ frame: 'puff', curl: 20, drag: 1.4, below: true, max: 24 }),
  }),
  tick(k, dt, { embers, sparks, grit }) {
    const s = k.f.type.scale;
    embers.rate('rune', 2.2, dt, () => {
      const [x, y] = DWARF_RUNES[Math.floor(R() * DWARF_RUNES.length)];
      embers.emit(x + pm() * 12, y + pm() * 14, { vx: pm() * 30, vy: -40 - R() * 40, life: 0.8 + R() * 0.5, r0: 2.6 * s, r1: 0.8 * s, a: 1, tint: R() < 0.5 ? 0xffb04a : 0xffe08a, grav: -30, fade: 0.1 });
    });
    if (k.landed) for (let i = 0, n = k.burst(14); i < n; i++) sparks.emit(CX + pm() * 180, 264, { vx: pm() * 420, vy: -80 - R() * 220, life: 0.35 + R() * 0.25, r0: 2.4 * s, r1: 0.8 * s, a: 1, tint: R() < 0.5 ? 0xffe0a0 : 0xffffff, grav: 900, fade: 0.02 });
    landPuff(k, grit, 10, 266, 0x8a8078, 80, 0.45);
  },
});

// Muspel Fire-Feet: its seams pulse; flames lick up its sides and between its toes, embers stream up, smoke and ash
// drift off its top; as it drops, the seams flare white-hot (its heat layer) and the flames roar; it lands in a
// splash of sparks.
registerLive<{ fire: Em; embers: Em; smoke: Em; ash: Em }>('muspel', {
  rig: { breath: 1.2, squash: 1.1 },
  glow: { rate: 0.6, depth: 0.45, base: 0.55 },
  heat: { of: (f) => (f.state === 'descend' ? 1 : 0), boost: 0.5 },
  setup: (k) => ({
    fire: k.emitter({ frame: 'soft', add: true, curl: 60, drag: 0.8, max: 120 }),
    embers: k.emitter({ frame: 'ember', add: true, curl: 40, drag: 0.5, max: 70 }),
    smoke: k.emitter({ frame: 'puff', curl: 40, drag: 0.8, below: true, max: 50 }),
    ash: k.emitter({ frame: 'mote', drag: 0.8, max: 30 }),
  }),
  tick(k, dt, { fire, embers, smoke, ash }) {
    const s = k.f.type.scale;
    const roar = 1 + k.heat * 1.4;
    fire.rate('lick', 14 * roar, dt, () => {
      const [x, y, h, , lean] = MUSPEL_FLAMES[Math.floor(R() * MUSPEL_FLAMES.length)];
      fire.emit(x + pm() * 10, y - h * 0.3, { vx: lean * 3 + pm() * 20, vy: -100 - R() * 80, life: 0.35 + R() * 0.25, r0: 14 * s, r1: 3 * s, a: 0.7, tint: R() < 0.4 ? 0xffd27a : R() < 0.75 ? 0xff8a1a : 0xff4a0a, fade: 0.08 });
    });
    fire.rate('toes', 6 * roar, dt, () => {
      fire.emit(CX - 70 + R() * 150, 214 + R() * 10, { vx: pm() * 20, vy: -90 - R() * 60, life: 0.3 + R() * 0.2, r0: 10 * s, r1: 2 * s, a: 0.6, tint: R() < 0.5 ? 0xffb040 : 0xff6a1a, fade: 0.08 });
    });
    embers.rate('embers', 7 * roar, dt, () => {
      embers.emit(CX + pm() * 200, 40 + R() * 200, { vx: pm() * 50, vy: -80 - R() * 100, life: 1 + R() * 0.8, r0: 3 * s, r1: 1 * s, a: 1, tint: R() < 0.5 ? 0xffc060 : 0xff7a2a, grav: -40, fade: 0.05 });
    });
    smoke.rate('smoke', 2.4, dt, () => {
      smoke.emit(CX + pm() * 110, 20, { vx: pm() * 20, vy: -50 - R() * 30, life: 1.8 + R(), r0: 12 * s, r1: 44 * s, a: 0.26, tint: R() < 0.5 ? 0x3a2a26 : 0x5a4a44, fade: 0.2, grav: -20 });
    });
    ash.rate('ash', 2, dt, () => {
      ash.emit(CX + pm() * 160, 30 + R() * 60, { vx: pm() * 20, vy: -10 - R() * 20, life: 1.6, r0: 2.4 * s, r1: 1.6 * s, a: 0.8, tint: R() < 0.5 ? 0x9a9290 : 0x6a6260, fade: 0.2 });
    });
    if (k.landed)
      for (let i = 0, n = k.burst(16); i < n; i++) embers.emit(CX + pm() * 200, 262, { vx: pm() * 420, vy: -120 - R() * 260, life: 0.5 + R() * 0.4, r0: 3.4 * s, r1: 1 * s, a: 1, tint: R() < 0.5 ? 0xffc060 : 0xff8a1a, grav: 900, fade: 0.02 });
  },
});
