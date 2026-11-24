// How batch D's feet move in play (src/game/liveKit.ts): Acts 1b, 2a, 7 and 8. Their art is in
// src/content/style/acts-d-*.ts. Cosmetic randomness only through crand() (the game's seeded generator).

import { CX } from '../../art/feetCommon';
import { type LiveFoot, registerLive } from '../../game/liveKit';
import { crand } from '../../systems/cosmeticRandom';
import { HAMMER, JET_NOZZLES } from '../style/acts-d-1';
import { DOOM_EYES, LEX_DOME, ROBO_CORE } from '../style/acts-d-2';
import { DRAUGR_EYELETS, FEN_RUNES, SURTR_FLAMES } from '../style/acts-d-3';
import { drawFly } from '../style/pilot-bare';

const R = () => crand();
const pm = () => crand() - 0.5;
type Em = ReturnType<LiveFoot['emitter']>;

/** How visible the foot is now (bosses fade in from portals, uploads glitch it, the serpent stays hidden): effects
 * thin out with it, and stop when it's gone. */
const shown = (k: LiveFoot): number => k.f.visualAlpha;

/** A puff of dust thrown out sideways when the foot lands. */
function landDust(k: LiveFoot, em: Em, tint: number, n = 10, y = 258, a = 0.45): void {
  if (!k.landed) return;
  const s = k.f.type.scale;
  for (let i = 0, m = k.burst(n); i < m; i++) {
    const side = R() < 0.5 ? -1 : 1;
    em.emit(CX + side * (40 + R() * 70), y, { vx: side * (80 + R() * 160), vy: -20 - R() * 50, life: 0.6 + R() * 0.5, r0: 8 * s, r1: 26 * s, a, tint, fade: 0.05 });
  }
}

/** Wings beating: the wingL and wingR sway parts swing round their roots, mirrored, faster as the foot dives (set
 * after the springs, so the beat rides on their sway). */
function beatWings(k: LiveFoot, st: { ph: number }, dt: number, hz: number, amp: number): void {
  const fast = k.f.state === 'descend' || k.windingUp ? 1.8 : 1;
  st.ph += dt * hz * fast * Math.PI * 2;
  const beat = Math.sin(st.ph) * amp + Math.sin(st.ph * 2) * amp * 0.15;
  for (const [name, s] of [['wingL', -1], ['wingR', 1]] as const) {
    const img = k.swayImg(name);
    if (img) img.rotation = -s * beat + img.rotation * 0.4;
  }
}

// ════════════════════════ Act 1b · Act 2a ════════════════════════

// Blacksmith Boot: the hammer bobs on its grip; embers drift off the apron; landing rings sparks off the steel toe.
registerLive('blacksmith', {
  sway: { hammer: { k: 48, c: 5, gain: 1.2, idle: 0.05, flop: 1.3 } },
  setup: (k) => ({ sparks: k.emitter({ frame: 'spark', add: true, drag: 0.3, max: 60 }), embers: k.emitter({ frame: 'ember', add: true, curl: 30, drag: 0.6, max: 30 }) }),
  tick(k, dt, { sparks, embers }) {
    const s = k.f.type.scale;
    embers.rate('ember', 1.6, dt, () => {
      embers.emit(CX + pm() * 60, 110 + R() * 70, { vx: pm() * 20, vy: -30 - R() * 30, life: 1.2 + R() * 0.8, r0: 2.6 * s, r1: 1 * s, a: 1, tint: R() < 0.5 ? 0xffa03a : 0xffd27a, grav: -20, fade: 0.1 });
    });
    // the hammer head glints as it bobs
    sparks.rate('glint', 0.4, dt, () => {
      sparks.emit(HAMMER.head[0] - 14, HAMMER.head[1] - 26, { life: 0.35, r0: 2, r1: 14 * s, a: 0.9, tint: 0xffffff, fade: 0.4 });
    });
    if (k.landed)
      for (let i = 0, n = k.burst(18); i < n; i++) {
        const side = R() < 0.5 ? -1 : 1;
        sparks.emit(CX + side * (10 + R() * 60), 240, { vx: side * (120 + R() * 260), vy: -80 - R() * 220, life: 0.35 + R() * 0.3, r0: 2.6 * s, r1: 0.8 * s, a: 1, tint: R() < 0.5 ? 0xffd070 : 0xff8a2a, grav: 700, fade: 0.02 });
      }
  },
});

// Little Gargoyle: the wings beat; grit sifts off it; moss crumbs and grit puff out when it lands.
registerLive('gargoylet', {
  wiggle: true,
  sway: { wingL: { k: 50, c: 5, gain: 1, idle: 0.1, below: true }, wingR: { k: 50, c: 5, gain: 1, idle: 0.1, below: true } },
  setup: (k) => ({ grit: k.emitter({ frame: 'mote', drag: 0.3, max: 50 }), dust: k.emitter({ frame: 'puff', curl: 20, drag: 1.4, below: true, max: 30 }), wing: { ph: R() * 6 } }),
  tick(k, dt, { grit, dust, wing }) {
    const s = k.f.type.scale;
    beatWings(k, wing, dt, 2.6, 0.42);
    grit.rate('grit', k.windingUp ? 18 : 4, dt, () => {
      grit.emit(CX + pm() * 160, 60 + R() * 180, { vx: pm() * 20, vy: 10, life: 0.9, r0: 2.2 * s, r1: 1.8 * s, a: 0.95, tint: R() < 0.6 ? 0xc8ab78 : 0x7fb04a, grav: 600, fade: 0.02 });
    });
    landDust(k, dust, 0xd8c49a, 8, 270, 0.5);
  },
});

// ════════════════════════ Act 7 · villain feet ════════════════════════

// Henchman Spats: a jaunty strut, and a glint off the patent toe now and then.
registerLive('henchman', {
  rig: { swing: 1.4 },
  setup: (k) => ({ glint: k.emitter({ frame: 'spark', add: true, drag: 0, max: 6 }), dust: k.emitter({ frame: 'puff', curl: 20, drag: 1.4, below: true, max: 20 }) }),
  tick(k, dt, { glint, dust }) {
    glint.rate('shine', 0.6, dt, () => {
      glint.emit(CX - 44 + pm() * 14, 216, { life: 0.35, r0: 2, r1: 16 * k.f.type.scale, a: 0.9, tint: 0xffffff, fade: 0.4 });
    });
    landDust(k, dust, 0x9a9aa8, 6, 256, 0.3);
  },
});

/** Per-nozzle emitter rate keys (made once). */
const JET_KEYS = JET_NOZZLES.map((_, i) => [`f${i}`, `c${i}`, `s${i}`] as const);

// Jetpack Jackboots: the rockets burn, trailing flame and smoke through the world; they sputter just before it dives
// and roar on the way down.
registerLive('jetpack', {
  rig: { swing: 1.6, squash: 0.7 },
  glow: { rate: 9, depth: 0.25, base: 0.7 },
  setup: (k) => ({ fire: k.emitter({ frame: 'soft', add: true, drag: 1.2, max: 160 }), core: k.emitter({ frame: 'ember', add: true, drag: 1.4, max: 80 }), smoke: k.emitter({ frame: 'puff', curl: 40, drag: 0.9, below: true, max: 90 }), sput: { t: 0 } }),
  tick(k, dt, { fire, core, smoke, sput }) {
    const s = k.f.type.scale;
    const v = shown(k);
    if (v < 0.2) return;
    // a sputter: the jets cut out in short gaps while it winds up
    sput.t -= dt;
    if (k.windingUp && sput.t <= -0.12) sput.t = 0.06 + R() * 0.08;
    const on = !(k.windingUp && sput.t > 0);
    const roar = k.f.state === 'descend' ? 1.8 : 1;
    if (on)
      JET_NOZZLES.forEach(([x, y], i) => {
        fire.rate(JET_KEYS[i][0], 34 * roar, dt, () => {
          fire.emit(x + pm() * 8, y + 6, { vx: pm() * 30, vy: 300 + R() * 160, life: 0.22 + R() * 0.14, r0: 22 * s, r1: 6 * s, a: 0.9 * v, tint: R() < 0.5 ? 0xffa03a : 0xff5a1a, fade: 0.04 });
        });
        core.rate(JET_KEYS[i][1], 26 * roar, dt, () => {
          core.emit(x + pm() * 5, y + 4, { vy: 340 + R() * 120, life: 0.12 + R() * 0.06, r0: 16 * s, r1: 8 * s, a: v, tint: 0xfff2c0, fade: 0.03 });
        });
      });
    JET_NOZZLES.forEach(([x, y], i) =>
      smoke.rate(JET_KEYS[i][2], (on ? 5 : 12) * roar, dt, () => {
        smoke.emit(x + pm() * 10, y + 30, { vx: pm() * 30, vy: 80 + R() * 40, life: 1 + R() * 0.6, r0: 8 * s, r1: 34 * s, a: 0.3 * v, tint: R() < 0.5 ? 0x9a9aa0 : 0x6a6a70, fade: 0.1 });
      }),
    );
  },
});

// Goon Galoshes: rainwater runs off them in drips and splashes out when they land.
registerLive('goon', {
  rig: { squash: 1.2 },
  setup: (k) => ({ drips: k.emitter({ frame: 'drop', drag: 0.15, max: 50 }), glint: k.emitter({ frame: 'spark', add: true, drag: 0, max: 6 }) }),
  tick(k, dt, { drips, glint }) {
    const s = k.f.type.scale;
    drips.rate('drip', 2.4, dt, () => {
      drips.emit(CX + pm() * 180, 268, { vy: 30, life: 0.8, r0: 4 * s, r1: 3 * s, a: 0.8, tint: 0xcfe8ff, grav: 900, fade: 0.02 });
    });
    glint.rate('buckle', 0.5, dt, () => {
      glint.emit(CX + 30 + R() * 20, 66 + Math.floor(R() * 3) * 38, { life: 0.35, r0: 2, r1: 14 * s, a: 0.9, tint: 0xffffff, fade: 0.4 });
    });
    if (k.landed)
      for (let i = 0, n = k.burst(14); i < n; i++) drips.emit(CX + pm() * 220, 266, { vx: pm() * 380, vy: -120 - R() * 200, life: 0.6, r0: 4 * s, r1: 3 * s, a: 0.85, tint: 0xcfe8ff, grav: 900, fade: 0.02 });
  },
});


/** A boss's overheat: steam rolling off the given design points and embers rising, both scaled by k.heat. */
function overheat(k: LiveFoot, steam: Em, embers: Em, dt: number, pts: [number, number][], tint = 0xf4f6fa, ember = 0xffb040): void {
  const h = k.heat;
  if (h < 0.08) return;
  const s = k.f.type.scale;
  steam.rate('oh', 14 * h, dt, () => {
    const [x, y] = pts[Math.floor(R() * pts.length)];
    steam.emit(x + pm() * 30, y + pm() * 20, { vx: pm() * 40, vy: -50 - R() * 50, life: 1.2 + R() * 0.8, r0: 10 * s, r1: 40 * s, a: 0.35 * h, tint, fade: 0.2, grav: -20 });
  });
  embers.rate('oe', 10 * h, dt, () => {
    embers.emit(CX + pm() * 200, 120 + R() * 150, { vx: pm() * 50, vy: -90 - R() * 90, life: 0.8 + R() * 0.6, r0: 2.6 * s, r1: 0.8 * s, a: 1, tint: ember, grav: -40, fade: 0.05 });
  });
}

// ════════════════════════ Act 7 · bosses ════════════════════════

/** The LED strip under a robot sneaker: a light runs along it. */
function ledChase(k: LiveFoot, em: Em, st: { t: number; i: number }, dt: number, tint: number, a: number): void {
  st.t += dt * 14;
  const i = Math.floor(st.t) % 12;
  if (i === st.i || i > 8) return;
  st.i = i;
  em.emit(CX - 72 + i * 18, 252, { life: 0.22, r0: 10 * k.f.type.scale, r1: 4 * k.f.type.scale, a, tint, fade: 0.1 });
}

/** The fight places Ultoe's core sprite and Thanfoot's stones by the foot's own coordinates: their art holds still. */
const STILL = { swing: 0, squash: 0, breath: 0 };

/** Ultoe and his drones look the same in play (the fight's core sprite is Ultoe's only tell): the grey cores flicker,
 * a light chases along the LEDs, static crackles off them. */
for (const id of ['ultoe', 'ultodrone'])
  registerLive(id, {
    glow: { rate: 5, depth: 0.5, base: 0.15 },
    rig: STILL,
    setup: (k) => ({ fx: k.emitter({ frame: 'mote', add: true, drag: 0, max: 20 }), sparks: k.emitter({ frame: 'spark', add: true, drag: 0.4, max: 20 }), chase: { t: R() * 9, i: -1 } }),
    tick(k, dt, { fx, sparks, chase }) {
      const v = shown(k);
      if (v < 0.3) return;
      ledChase(k, fx, chase, dt, 0x8ab8d8, 0.5 * v);
      sparks.rate('static', 0.5, dt, () => {
        sparks.emit(ROBO_CORE[0] + pm() * 40, ROBO_CORE[1] + pm() * 40, { vx: pm() * 80, vy: pm() * 80, life: 0.15, r0: 2, r1: 10 * k.f.type.scale, a: 0.8 * v, tint: 0xbfd8ff, fade: 0.3 });
      });
    },
  });

// Lex Lugtoe: he blinks behind the glass, the dome glints, the vents breathe green; overheated, the suit steams.
registerLive('lexlugtoe', {
  blink: { face: { every: 3 } },
  glow: { rate: 0.5, depth: 0.3, base: 0.6 },
  heat: {},
  setup: (k) => ({ glint: k.emitter({ frame: 'spark', add: true, drag: 0, max: 6 }), vent: k.emitter({ frame: 'soft', add: true, curl: 20, drag: 1.2, max: 40 }), steam: k.emitter({ frame: 'soft', curl: 40, drag: 0.8, max: 80 }), embers: k.emitter({ frame: 'ember', add: true, drag: 0.5, max: 40 }) }),
  tick(k, dt, { glint, vent, steam, embers }) {
    const s = k.f.type.scale;
    glint.rate('dome', 0.5, dt, () => {
      glint.emit(LEX_DOME.x - 20, LEX_DOME.y - 22, { life: 0.4, r0: 2, r1: 22 * s, a: 0.9, tint: 0xffffff, fade: 0.4 });
    });
    vent.rate('vent', 10, dt, () => {
      vent.emit(CX - 60 + Math.floor(R() * 5) * 30, 262, { vx: pm() * 20, vy: 60 + R() * 40, life: 0.5, r0: 8 * s, r1: 18 * s, a: 0.35, tint: 0x4aff7a, fade: 0.1 });
    });
    overheat(k, steam, embers, dt, [[CX - 60, 0], [CX + 60, 0], [CX - 100, 120], [CX + 100, 120]]);
  },
});

// Doomstomp: its eyes blink and smoulder, hot breath snorts out between its teeth, landings throw rubble; overheated
// (its later lives), the hide steams and sheds embers.
registerLive('doomstomp', {
  blink: { eyes: { every: 3.5 } },
  glow: { rate: 0.8, depth: 0.5, base: 0.35 },
  heat: {},
  rig: { squash: 1.3, breath: 1.6 },
  setup: (k) => ({ breath: k.emitter({ frame: 'puff', curl: 40, drag: 1, max: 60 }), rubble: k.emitter({ frame: 'flake', drag: 0.3, max: 40 }), dust: k.emitter({ frame: 'puff', curl: 20, drag: 1.4, below: true, max: 40 }), steam: k.emitter({ frame: 'soft', curl: 40, drag: 0.8, max: 80 }), embers: k.emitter({ frame: 'ember', add: true, drag: 0.5, max: 40 }), snort: { t: 1 } }),
  tick(k, dt, { breath, rubble, dust, steam, embers, snort }) {
    const s = k.f.type.scale;
    snort.t -= dt;
    if (snort.t <= 0) {
      snort.t = 1.6 + R() * 2;
      for (let i = 0, n = k.burst(8); i < n; i++) {
        const side = R() < 0.5 ? -1 : 1;
        breath.emit(CX + side * (20 + R() * 50), 246, { vx: side * (30 + R() * 60), vy: 30 + R() * 40, life: 0.9 + R() * 0.4, r0: 8 * s, r1: 30 * s, a: 0.35, tint: 0xe8f0e0, fade: 0.08, grav: -30 });
      }
    }
    if (k.landed) {
      for (let i = 0, n = k.burst(14); i < n; i++) rubble.emit(CX + pm() * 220, 270, { vx: pm() * 400, vy: -120 - R() * 240, life: 0.8, r0: 5 * s, r1: 4 * s, a: 1, tint: R() < 0.5 ? 0x6a6050 : 0x8a7a60, grav: 900, spin: 8, fade: 0.02 });
      landDust(k, dust, 0xa89a80, 14, 270, 0.55);
    }
    overheat(k, steam, embers, dt, [[CX - 80, 60], [CX + 80, 60], [CX, 140], [CX - 30, DOOM_EYES.y]]);
  },
});

// Thanfoot: cosmic motes drift round him, the settings breathe violet, his toes flex; overheated, the gold steams.
registerLive('thanfoot', {
  wiggle: true,
  glow: { rate: 0.4, depth: 0.4, base: 0.5 },
  heat: {},
  rig: STILL,
  setup: (k) => ({ motes: k.emitter({ frame: 'mote', add: true, curl: 30, drag: 0.4, max: 70 }), steam: k.emitter({ frame: 'soft', curl: 40, drag: 0.8, max: 80 }), embers: k.emitter({ frame: 'ember', add: true, drag: 0.5, max: 40 }) }),
  tick(k, dt, { motes, steam, embers }) {
    const v = shown(k);
    if (v < 0.2) return;
    const s = k.f.type.scale;
    motes.rate('cosmos', 8, dt, () => {
      const a = R() * Math.PI * 2;
      motes.emit(CX + Math.cos(a) * 140, 130 + Math.sin(a) * 120, { vx: -Math.sin(a) * 40, vy: Math.cos(a) * 30 - 10, life: 1.4 + R(), r0: 3 * s, r1: 1 * s, a: 0.9 * v, tint: R() < 0.5 ? 0xc88aff : R() < 0.7 ? 0xffd27a : 0x8ad0ff, fade: 0.3 });
    });
    overheat(k, steam, embers, dt, [[CX - 90, 60], [CX + 90, 60], [CX, 30], [CX, 200], [CX - 60, 230], [CX + 60, 230]], 0xfff4e0, 0xff7020);
    // a titan overheating throws more: a second, heavier plume of steam off the hem
    if (k.heat > 0.3) steam.rate('ohhem', 10 * k.heat, dt, () => steam.emit(CX + pm() * 100, 160 + pm() * 10, { vx: pm() * 30, vy: -70 - R() * 50, life: 1.4, r0: 14 * s, r1: 50 * s, a: 0.3 * k.heat, tint: 0xffe8d8, fade: 0.2, grav: -30 }));
  },
});

// ════════════════════════ Act 8 · Norse ════════════════════════

// Frost Giant Toes: freezing mist pours off the toes and sinks, snowflakes drift round it, frost glints; the toes flex.
registerLive('frostgiant', {
  wiggle: true,
  rig: { breath: 0.8, squash: 0.8 },
  setup: (k) => ({ mist: k.emitter({ frame: 'soft', curl: 24, drag: 0.8, below: true, max: 120 }), snow: k.emitter({ frame: 'flake', curl: 30, drag: 0.4, max: 50 }), glint: k.emitter({ frame: 'spark', add: true, drag: 0, max: 10 }), dust: k.emitter({ frame: 'puff', curl: 20, drag: 1.4, below: true, max: 30 }) }),
  tick(k, dt, { mist, snow, glint, dust }) {
    const s = k.f.type.scale;
    mist.rate('mist', 9, dt, () => {
      mist.emit(20 + R() * 180, 230 + R() * 30, { vx: pm() * 30, vy: 20 + R() * 20, life: 2 + R(), r0: 14 * s, r1: 54 * s, a: 0.22, tint: R() < 0.6 ? 0xe8f6ff : 0xbfe0f8, fade: 0.25, grav: 10 });
    });
    snow.rate('snow', 4, dt, () => {
      snow.emit(CX + pm() * 260, -20 + R() * 200, { vx: pm() * 20, vy: 20 + R() * 20, life: 2, r0: 3 * s, r1: 2.4 * s, a: 0.9, tint: 0xffffff, spin: 3, fade: 0.2, grav: 20 });
    });
    glint.rate('frost', 1.2, dt, () => {
      glint.emit(20 + R() * 180, R() < 0.5 ? R() * 60 : 190 + R() * 50, { life: 0.4, r0: 2, r1: 14 * s, a: 0.9, tint: 0xe8f8ff, fade: 0.4 });
    });
    landDust(k, dust, 0xf0f8ff, 14, 262, 0.6);
  },
});

// Draugr Boots: blue grave-fire flickers in the eyelets and wisps up off them, barrow earth crumbles away, the loose
// grave cloth swings.
registerLive('draugr', {
  sway: { tail: { k: 40, c: 4, gain: 1.4, idle: 0.1, flop: 1.2, below: true } },
  glow: { rate: 2.6, depth: 0.45, base: 0.5 },
  setup: (k) => ({ fire: k.emitter({ frame: 'ember', add: true, curl: 40, drag: 0.6, max: 80 }), earth: k.emitter({ frame: 'mote', drag: 0.3, max: 40 }) }),
  tick(k, dt, { fire, earth }) {
    const s = k.f.type.scale;
    const v = shown(k);
    if (v < 0.15) return;
    fire.rate('wisp', 8, dt, () => {
      const [x, y] = DRAUGR_EYELETS[Math.floor(R() * DRAUGR_EYELETS.length)];
      fire.emit(x + pm() * 4, y, { vx: pm() * 20, vy: -40 - R() * 40, life: 0.6 + R() * 0.4, r0: 5 * s, r1: 1.5 * s, a: 0.9 * v, tint: R() < 0.5 ? 0x7fe8ff : 0xc8faff, grav: -40, fade: 0.1 });
    });
    earth.rate('earth', k.windingUp ? 14 : 3, dt, () => {
      earth.emit(CX + pm() * 190, 200 + R() * 50, { vx: pm() * 20, vy: 10, life: 0.8, r0: 2.6 * s, r1: 2 * s, a: v, tint: R() < 0.6 ? 0x5a3e28 : 0x8a8070, grav: 700, fade: 0.02 });
    });
  },
});

// Troll Feet: flies circle the stink, the toadstool nods, spores drift off the moss, the toes flex.
registerLive('troll', {
  wiggle: true,
  sway: { shroom: { k: 50, c: 4, gain: 1.6, idle: 0.1, flop: 1.4 } },
  setup: (k) => {
    const key = k.sheet('lk_fly', 64, 56, 3, (ctx, i) => {
      ctx.translate(32, 30);
      drawFly(ctx, 1.9, [0, 0.55, 1][i]);
    });
    return {
      flies: k.swarm({ key, frames: 3, count: 4, at: [CX, 120], rx: 140, ry: 130, speed: 1.4, jitter: 22, scale: 0.55 }),
      spores: k.emitter({ frame: 'mote', add: true, curl: 30, drag: 0.6, max: 40 }),
      dust: k.emitter({ frame: 'puff', curl: 20, drag: 1.4, below: true, max: 30 }),
    };
  },
  tick(k, dt, { flies, spores, dust }) {
    const s = k.f.type.scale;
    const diving = k.f.state === 'descend' || k.windingUp;
    flies.tight += ((diving ? 0.65 : 1) - flies.tight) * Math.min(1, dt * 3);
    spores.rate('spore', 3, dt, () => {
      spores.emit(CX - 8 + pm() * 130, 30 + pm() * 40, { vx: pm() * 20, vy: -20 - R() * 20, life: 1.6 + R(), r0: 2.4 * s, r1: 1 * s, a: 0.7, tint: R() < 0.5 ? 0xc8e88a : 0xe8f0b0, grav: -10, fade: 0.2 });
    });
    landDust(k, dust, 0x8a9a6a, 10, 264, 0.5);
  },
});

// Valkyrie-Cursed Clogs: the swan wings beat fast, a feather drifts loose now and then, gold motes trail it.
registerLive('valkyrie', {
  rig: { swing: 1.4 },
  sway: { wingL: { k: 50, c: 5, gain: 1, idle: 0.1, below: true }, wingR: { k: 50, c: 5, gain: 1, idle: 0.1, below: true } },
  setup: (k) => ({ feathers: k.emitter({ frame: 'flake', curl: 50, drag: 0.8, max: 12 }), motes: k.emitter({ frame: 'mote', add: true, curl: 30, drag: 0.6, max: 40 }), wing: { ph: R() * 6 } }),
  tick(k, dt, { feathers, motes, wing }) {
    const s = k.f.type.scale;
    beatWings(k, wing, dt, 4.2, 0.5);
    feathers.rate('feather', 0.6, dt, () => {
      const side = R() < 0.5 ? -1 : 1;
      feathers.emit(CX + side * 120, 60 + R() * 30, { vx: side * (20 + R() * 40), vy: 20, life: 2.4, r0: 6 * s, r1: 5 * s, a: 0.95, tint: 0xf8f6f0, spin: 2, grav: 30, fade: 0.1 });
    });
    motes.rate('gold', 5, dt, () => {
      motes.emit(CX + pm() * 220, 40 + R() * 200, { vx: pm() * 20, vy: -10 - R() * 20, life: 1 + R() * 0.6, r0: 2.4 * s, r1: 0.8 * s, a: 0.9, tint: R() < 0.6 ? 0xffd86a : 0xfff4c0, fade: 0.2 });
    });
  },
});

// Surtr: flames lick up off the crown, embers stream up, lava drips off the sole and splashes when he lands;
// overheated, the fire roars and throws sparks.
registerLive('surtr', {
  glow: { rate: 0.7, depth: 0.4, base: 0.6 },
  heat: {},
  rig: { breath: 1.2 },
  setup: (k) => ({ fire: k.emitter({ frame: 'soft', add: true, curl: 60, drag: 0.8, max: 160 }), embers: k.emitter({ frame: 'ember', add: true, curl: 40, drag: 0.5, max: 80 }), lava: k.emitter({ frame: 'drop', add: true, drag: 0.15, max: 40 }), smoke: k.emitter({ frame: 'puff', curl: 40, drag: 0.8, below: true, max: 60 }) }),
  tick(k, dt, { fire, embers, lava, smoke }) {
    const s = k.f.type.scale;
    const roar = 1 + k.heat * 1.5;
    fire.rate('crown', 30 * roar, dt, () => {
      const f = SURTR_FLAMES[Math.floor(R() * SURTR_FLAMES.length)];
      fire.emit(f.x + pm() * 10, 56 - f.h * 0.5, { vx: pm() * 30, vy: -120 - R() * 100, life: 0.4 + R() * 0.25, r0: 18 * s, r1: 4 * s, a: 0.7, tint: R() < 0.4 ? 0xffd27a : R() < 0.75 ? 0xff8a1a : 0xff4a0a, fade: 0.08 });
    });
    embers.rate('embers', 8 * roar, dt, () => {
      embers.emit(CX + pm() * 200, 40 + R() * 220, { vx: pm() * 50, vy: -80 - R() * 100, life: 1 + R() * 0.8, r0: 3 * s, r1: 1 * s, a: 1, tint: R() < 0.5 ? 0xffc060 : 0xff7a2a, grav: -40, fade: 0.05 });
    });
    smoke.rate('smoke', 3 * roar, dt, () => {
      smoke.emit(CX + pm() * 120, 10, { vx: pm() * 20, vy: -50 - R() * 30, life: 1.8 + R(), r0: 14 * s, r1: 50 * s, a: 0.3, tint: R() < 0.5 ? 0x3a2a26 : 0x5a4a44, fade: 0.2, grav: -20 });
    });
    lava.rate('drip', 1.4, dt, () => {
      lava.emit(CX + pm() * 180, 272, { vy: 20, life: 0.8, r0: 6 * s, r1: 4 * s, a: 1, tint: R() < 0.5 ? 0xff8a1a : 0xffc04a, grav: 900, fade: 0.02 });
    });
    if (k.landed)
      for (let i = 0, n = k.burst(16); i < n; i++) lava.emit(CX + pm() * 200, 270, { vx: pm() * 420, vy: -120 - R() * 260, life: 0.6, r0: 6 * s, r1: 3 * s, a: 1, tint: R() < 0.5 ? 0xff8a1a : 0xffd27a, grav: 900, fade: 0.02 });
  },
});

// Fenrir's Paw: the shaggy locks stir, Gleipnir's runes pulse and spark, frost breath curls off it, snow flies when
// it lands; overheated, the runes burn red and the fur steams.
registerLive('fenrir', {
  wiggle: true,
  sway: { lock0: { k: 40, c: 4, gain: 1.1, idle: 0.08 }, lock1: { k: 36, c: 4, gain: 1.2, idle: 0.08 }, lock2: { k: 40, c: 4, gain: 1.1, idle: 0.08 }, lock3: { k: 36, c: 4, gain: 1.2, idle: 0.08 } },
  glow: { rate: 0.9, depth: 0.5, base: 0.4 },
  heat: {},
  rig: { swing: 1.2, squash: 1.2 },
  setup: (k) => ({ sparks: k.emitter({ frame: 'spark', add: true, drag: 0.4, max: 30 }), mist: k.emitter({ frame: 'soft', curl: 30, drag: 0.8, below: true, max: 80 }), dust: k.emitter({ frame: 'puff', curl: 20, drag: 1.4, below: true, max: 40 }), steam: k.emitter({ frame: 'soft', curl: 40, drag: 0.8, max: 80 }), embers: k.emitter({ frame: 'ember', add: true, drag: 0.5, max: 40 }) }),
  tick(k, dt, { sparks, mist, dust, steam, embers }) {
    const s = k.f.type.scale;
    sparks.rate('rune', 1.4, dt, () => {
      sparks.emit(FEN_RUNES[Math.floor(R() * FEN_RUNES.length)], 44, { vx: pm() * 60, vy: -30 - R() * 40, life: 0.35, r0: 2, r1: 10 * s, a: 1, tint: k.heat > 0.5 ? 0xff6a4a : 0x8af0ff, fade: 0.3 });
    });
    mist.rate('breath', 4, dt, () => {
      mist.emit(CX + pm() * 200, 250 + R() * 30, { vx: pm() * 30, vy: 10 + R() * 10, life: 2 + R(), r0: 12 * s, r1: 46 * s, a: 0.22, tint: 0xe0ecff, fade: 0.25 });
    });
    landDust(k, dust, 0xf0f6ff, 14, 286, 0.6);
    overheat(k, steam, embers, dt, [[CX - 80, 100], [CX + 80, 100], [CX, 40]]);
  },
});
