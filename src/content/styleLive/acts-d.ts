// How batch D's feet move in play (src/game/liveKit.ts): Acts 1b, 2a, 7 and 8. Their art is in
// src/content/style/acts-d-*.ts. Cosmetic randomness only through crand() (the game's seeded generator).

import type Phaser from 'phaser';
import { CX } from '../../art/feetCommon';
import { type LiveFoot, registerLive } from '../../game/liveKit';
import { crand } from '../../systems/cosmeticRandom';
import { HAMMER, JET_NOZZLES } from '../style/acts-d-1';
import { DOOM_EYES, LEX_DOME, ROBO_CORE } from '../style/acts-d-2';

const R = () => crand();
const pm = () => crand() - 0.5;
type Em = ReturnType<LiveFoot['emitter']>;

/** How visible the foot is now (bosses fade in from portals, uploads glitch it, the serpent stays hidden): effects
 * thin out with it, and stop when it's gone. */
function shown(k: LiveFoot): number {
  const img = (k.f as unknown as { img?: Phaser.GameObjects.Image }).img;
  return img ? img.alpha : 1;
}

/** The live layer's sway parts, in the order the style declares them (a def that drives a part itself, like a wing
 * beat, overrides the rotation the spring gave it this frame). */
function swayImgs(k: LiveFoot): Phaser.GameObjects.Image[] {
  return ((k as unknown as { sways?: { img: Phaser.GameObjects.Image }[] }).sways ?? []).map((s) => s.img);
}

/** A puff of dust thrown out sideways when the foot lands. */
function landDust(k: LiveFoot, em: Em, tint: number, n = 10, y = 258, a = 0.45): void {
  if (!k.landed) return;
  const s = k.f.type.scale;
  for (let i = 0, m = k.burst(n); i < m; i++) {
    const side = R() < 0.5 ? -1 : 1;
    em.emit(CX + side * (40 + R() * 70), y, { vx: side * (80 + R() * 160), vy: -20 - R() * 50, life: 0.6 + R() * 0.5, r0: 8 * s, r1: 26 * s, a, tint, fade: 0.05 });
  }
}

/** Wings beating: each wing part swings round its root, mirrored, faster as the foot dives. */
function beatWings(k: LiveFoot, st: { ph: number }, dt: number, hz: number, amp: number, sides: number[]): void {
  const fast = k.f.state === 'descend' || k.windingUp ? 1.8 : 1;
  st.ph += dt * hz * fast * Math.PI * 2;
  const imgs = swayImgs(k);
  const beat = Math.sin(st.ph) * amp + Math.sin(st.ph * 2) * amp * 0.15;
  imgs.forEach((img, i) => {
    const s = sides[i] ?? (i % 2 ? 1 : -1);
    img.rotation = -s * beat + img.rotation * 0.4;
  });
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
  sway: { wingL: { k: 50, c: 5, gain: 1, idle: 0.1 }, wingR: { k: 50, c: 5, gain: 1, idle: 0.1 } },
  setup: (k) => ({ grit: k.emitter({ frame: 'mote', drag: 0.3, max: 50 }), dust: k.emitter({ frame: 'puff', curl: 20, drag: 1.4, below: true, max: 30 }), wing: { ph: R() * 6 } }),
  tick(k, dt, { grit, dust, wing }) {
    const s = k.f.type.scale;
    beatWings(k, wing, dt, 2.6, 0.42, [-1, 1]);
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
      for (const [x, y] of JET_NOZZLES) {
        fire.rate(`f${x}`, 34 * roar, dt, () => {
          fire.emit(x + pm() * 8, y + 6, { vx: pm() * 30, vy: 300 + R() * 160, life: 0.22 + R() * 0.14, r0: 22 * s, r1: 6 * s, a: 0.9 * v, tint: R() < 0.5 ? 0xffa03a : 0xff5a1a, fade: 0.04 });
        });
        core.rate(`c${x}`, 26 * roar, dt, () => {
          core.emit(x + pm() * 5, y + 4, { vy: 340 + R() * 120, life: 0.12 + R() * 0.06, r0: 16 * s, r1: 8 * s, a: v, tint: 0xfff2c0, fade: 0.03 });
        });
      }
    for (const [x, y] of JET_NOZZLES)
      smoke.rate(`s${x}`, (on ? 5 : 12) * roar, dt, () => {
        smoke.emit(x + pm() * 10, y + 30, { vx: pm() * 30, vy: 80 + R() * 40, life: 1 + R() * 0.6, r0: 8 * s, r1: 34 * s, a: 0.3 * v, tint: R() < 0.5 ? 0x9a9aa0 : 0x6a6a70, fade: 0.1 });
      });
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

// Ultoe: the core pulses, a light chases along the LEDs, sparks crackle off the vents; overheated, he vents steam.
registerLive('ultoe', {
  glow: { rate: 1.6, depth: 0.45, base: 0.55 },
  heat: {},
  setup: (k) => ({ fx: k.emitter({ frame: 'mote', add: true, drag: 0, max: 30 }), sparks: k.emitter({ frame: 'spark', add: true, drag: 0.4, max: 40 }), steam: k.emitter({ frame: 'soft', curl: 40, drag: 0.8, max: 80 }), embers: k.emitter({ frame: 'ember', add: true, drag: 0.5, max: 40 }), chase: { t: 0, i: -1 } }),
  tick(k, dt, { fx, sparks, steam, embers, chase }) {
    const v = shown(k);
    if (v < 0.3) return;
    const s = k.f.type.scale;
    ledChase(k, fx, chase, dt, 0xff4a4a, v);
    sparks.rate('vent', 0.8 + k.heat * 6, dt, () => {
      const side = R() < 0.5 ? -1 : 1;
      sparks.emit(CX + side * 70, 70 + R() * 24, { vx: side * (60 + R() * 120), vy: -40 - R() * 80, life: 0.25 + R() * 0.2, r0: 2.4 * s, r1: 0.8 * s, a: v, tint: R() < 0.5 ? 0xffd0d0 : 0xff6a6a, grav: 500, fade: 0.02 });
    });
    overheat(k, steam, embers, dt, [[CX - 36, 6], [CX + 36, 6], [CX - 70, 80], [CX + 70, 80]], 0xf4f6fa, 0xff6a4a);
  },
});

// Ultoe Drones: the grey core flickers as it boots; static crackles off them now and then.
registerLive('ultodrone', {
  glow: { rate: 5, depth: 0.5, base: 0.15 },
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
  rig: { breath: 1.4 },
  setup: (k) => ({ motes: k.emitter({ frame: 'mote', add: true, curl: 30, drag: 0.4, max: 70 }), steam: k.emitter({ frame: 'soft', curl: 40, drag: 0.8, max: 80 }), embers: k.emitter({ frame: 'ember', add: true, drag: 0.5, max: 40 }) }),
  tick(k, dt, { motes, steam, embers }) {
    const v = shown(k);
    if (v < 0.2) return;
    const s = k.f.type.scale;
    motes.rate('cosmos', 8, dt, () => {
      const a = R() * Math.PI * 2;
      motes.emit(CX + Math.cos(a) * 140, 130 + Math.sin(a) * 120, { vx: -Math.sin(a) * 40, vy: Math.cos(a) * 30 - 10, life: 1.4 + R(), r0: 3 * s, r1: 1 * s, a: 0.9 * v, tint: R() < 0.5 ? 0xc88aff : R() < 0.7 ? 0xffd27a : 0x8ad0ff, fade: 0.3 });
    });
    overheat(k, steam, embers, dt, [[CX - 90, 60], [CX + 90, 60], [CX, 30], [CX, 200]], 0xfff4e0, 0xffc040);
  },
});
