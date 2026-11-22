// How the bosses and mini-bosses of batch C move in play (src/game/liveKit.ts). Their art is in
// src/content/style/bosses*.ts. Every one of them overheats in its later phases: the heat layer glows from the sole
// up (automatic for bosses) and steam pours off it (overheat() below).

import { CX } from '../../art/feetCommon';
import { type LiveFoot, type WorldEmitter, registerLive } from '../../game/liveKit';
import { crand } from '../../systems/cosmeticRandom';
import { BIG_LOCKS } from '../style/bosses';
import { CROC_HOLES_LIVE, CROC_NOZZLES, KELP, RINK_WHEELS, YETI_TUFTS } from '../style/bosses-2';

const R = () => crand();
const pm = () => crand() - 0.5;

/** Steam off an overheated boss: from random points of `area` (design x, y, w, h), more and bigger as it heats. */
export function overheat(k: LiveFoot, steam: WorldEmitter, dt: number, area: [number, number, number, number], tint = 0xeef2f6, rate = 16): void {
  const h = k.heat;
  if (h < 0.05) return;
  const s = k.f.type.scale;
  steam.rate('overheat', rate * h, dt, () => {
    steam.emit(area[0] + R() * area[2], area[1] + R() * area[3], { vx: pm() * 50, vy: -70 - R() * 70 - h * 40, life: 1 + R() * 0.8, r0: 6 * s, r1: (24 + h * 18) * s, a: 0.3 + h * 0.15, tint, fade: 0.1 });
  });
}

/** A ring of dust thrown out along the sole on landing. */
export function landDust(k: LiveFoot, em: WorldEmitter, n: number, tints: number[], y = 262, spread = 100, power = 1): void {
  if (!k.landed) return;
  const s = k.f.type.scale;
  for (let i = 0, m = k.burst(n); i < m; i++) {
    const side = R() < 0.5 ? -1 : 1;
    em.emit(CX + side * R() * spread, y, { vx: side * (80 + R() * 260) * power, vy: -20 - R() * 80 * power, life: 0.7 + R() * 0.6, r0: 8 * s, r1: 30 * s, a: 0.45, tint: tints[Math.floor(R() * tints.length)], fade: 0.06 });
  }
}

const steamEm = (k: LiveFoot) => k.emitter({ frame: 'soft', curl: 60, drag: 1.1, max: 160 });

// BIGFOOT: the big side locks sway and trail; loose hairs and dust drift off the coat, every stomp throws a ring of
// dust and clods of dirt, and the toes wiggle while it hovers.
registerLive('bigfoot', {
  wiggle: true,
  rig: { swing: 0.8, squash: 1.1, breath: 1.4 },
  sway: Object.fromEntries(BIG_LOCKS.map((_, i) => [`lock${i}`, { k: 44 + i * 4, c: 4.2, gain: i < 2 ? 1.6 : -1.6, idle: 0.08, flop: i < 2 ? 1 : -1 }])),
  heat: {},
  setup: (k) => ({
    steam: steamEm(k),
    dust: k.emitter({ frame: 'puff', curl: 30, drag: 1.6, below: true, max: 120 }),
    bits: k.emitter({ frame: 'flake', drag: 0.9, max: 80 }),
  }),
  tick(k, dt, { steam, dust, bits }) {
    const s = k.f.type.scale;
    bits.rate('hair', 3, dt, () => {
      bits.emit(CX - 100 + R() * 200, 40 + R() * 170, { vx: pm() * 30, vy: 10 + R() * 20, life: 1.6 + R(), r0: 3 * s, r1: 2.4 * s, a: 0.85, tint: R() < 0.5 ? 0x5a3a22 : 0x8a6038, grav: 30, spin: 3, fade: 0.08 });
    });
    landDust(k, dust, 18, [0x8a7458, 0x6a5440, 0xa89070], 262, 110, 1.2);
    if (k.landed)
      for (let i = 0, n = k.burst(10); i < n; i++) bits.emit(CX + pm() * 200, 258, { vx: pm() * 360, vy: -160 - R() * 220, life: 0.8, r0: 5 * s, r1: 4 * s, a: 1, tint: 0x4a3420, grav: 900, spin: 8, fade: 0.02 });
    overheat(k, steam, dt, [CX - 100, 0, 200, 200]);
  },
});

// KING HONK: rubbery (big squash and stretch), the bow bobs on its spring, every stomp pops a burst of confetti and
// glints sparkle over the patent leather.
const CONFETTI = [0xff3d7f, 0x39ff88, 0xffd23f, 0x3aa0ff, 0xb46bff, 0xffffff];
registerLive('clownking', {
  rig: { squash: 1.7, swing: 1.1 },
  sway: { bow: { k: 60, c: 4, gain: 1.3, idle: 0.1, flop: 1.4 } },
  heat: {},
  setup: (k) => ({
    steam: steamEm(k),
    confetti: k.emitter({ frame: 'flake', drag: 1.3, max: 180 }),
    glints: k.emitter({ frame: 'spark', add: true, drag: 0, max: 20 }),
  }),
  tick(k, dt, { steam, confetti, glints }) {
    const s = k.f.type.scale;
    if (k.landed)
      for (let i = 0, n = k.burst(40); i < n; i++)
        confetti.emit(CX + pm() * 260, 230 + R() * 30, { vx: pm() * 520, vy: -200 - R() * 380, life: 1.2 + R() * 0.8, r0: 5 * s, r1: 4 * s, a: 1, tint: CONFETTI[Math.floor(R() * CONFETTI.length)], grav: 520, spin: 10, fade: 0.02 });
    glints.rate('glint', 1.6, dt, () => {
      glints.emit(CX - 110 + R() * 120, 170 + R() * 50, { life: 0.35, r0: 10 * s, r1: 1 * s, a: 0.9, tint: 0xffffff, spin: 2, fade: 0.3 });
    });
    overheat(k, steam, dt, [CX - 120, 0, 240, 200]);
  },
});

// T-REX TOES: heavy: the claws flex out before it strikes (the curl), the ground shakes up dust and grit when it lands.
registerLive('trex', {
  wiggle: true,
  rig: { swing: 0.6, squash: 0.8, breath: 1.3 },
  heat: {},
  setup: (k) => ({
    steam: steamEm(k),
    dust: k.emitter({ frame: 'puff', curl: 30, drag: 1.5, below: true, max: 140 }),
    grit: k.emitter({ frame: 'flake', drag: 0.4, max: 80 }),
  }),
  tick(k, dt, { steam, dust, grit }) {
    const s = k.f.type.scale;
    landDust(k, dust, 22, [0x9a8a6a, 0x7a6a50, 0xb8a888], 280, 110, 1.4);
    if (k.landed)
      for (let i = 0, n = k.burst(14); i < n; i++) grit.emit(CX + pm() * 180, 280, { vx: pm() * 420, vy: -200 - R() * 260, life: 0.9, r0: 4 * s, r1: 3 * s, a: 1, tint: R() < 0.5 ? 0x6a5a44 : 0x8a7a5a, grav: 1000, spin: 9, fade: 0.02 });
    overheat(k, steam, dt, [CX - 90, 0, 180, 200]);
  },
});

// THE COLOSSUS: the stained glass glows from inside and pulses like a candle; light glints off the polished lames.
// Overheated, the steel glows from the sole up and steam vents between the plates.
registerLive('colossus', {
  glow: { rate: 0.4, depth: 0.35, base: 0.55 },
  heat: {},
  rig: { swing: 0.5, squash: 0.6 },
  setup: (k) => ({
    steam: steamEm(k),
    glints: k.emitter({ frame: 'spark', add: true, drag: 0, max: 24 }),
    dust: k.emitter({ frame: 'puff', curl: 30, drag: 1.5, below: true, max: 80 }),
  }),
  tick(k, dt, { steam, glints, dust }) {
    const s = k.f.type.scale;
    glints.rate('glint', 2.2, dt, () => {
      const i = Math.floor(R() * 5);
      glints.emit(CX - 80 + R() * 70, 128 + i * 24, { life: 0.4, r0: 12 * s, r1: 1 * s, a: 0.95, tint: R() < 0.7 ? 0xffffff : 0xffe08a, spin: 2, fade: 0.3 });
    });
    landDust(k, dust, 14, [0x8a8070, 0xa89a88], 262, 90);
    overheat(k, steam, dt, [CX - 100, 110, 200, 130]);
  },
});

// GHOST OF FEET PAST: the spectral glow breathes; ectoplasm streams off its edges and trails behind it, cold mist
// pours off its toes, will-o'-wisps circle it and the broken chain swings. Overheated, it burns with a cold blue
// flame and throws off icy vapour.
registerLive('phantomking', {
  wiggle: true,
  glow: { rate: 0.3, depth: 0.5, base: 0.4 },
  heat: {},
  sway: { chain: { k: 34, c: 4.2, gain: 1.3, idle: 0.12, flop: 0.9 } },
  setup(k) {
    const key = k.sheet('lk_wisp', 48, 48, 1, (ctx) => {
      const g = ctx.createRadialGradient(24, 24, 0, 24, 24, 22);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.25, 'rgba(190,235,255,0.9)');
      g.addColorStop(0.6, 'rgba(90,170,255,0.3)');
      g.addColorStop(1, 'rgba(60,120,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 48, 48);
    });
    return {
      wisps: k.swarm({ key, frames: 1, count: 3, at: [CX, 120], rx: 170, ry: 160, speed: 0.9, jitter: 30, scale: 0.9 }),
      ecto: k.emitter({ frame: 'soft', add: true, curl: 50, drag: 0.8, max: 200 }),
      mist: k.emitter({ frame: 'puff', curl: 20, drag: 0.9, below: true, max: 120 }),
      steam: steamEm(k),
    };
  },
  tick(k, dt, { ecto, mist, steam }) {
    const s = k.f.type.scale;
    ecto.rate('ecto', 9, dt, () => {
      const side = R() < 0.5 ? -1 : 1;
      ecto.emit(CX + side * (60 + R() * 40), 20 + R() * 200, { vx: side * (10 + R() * 30), vy: -30 - R() * 40, life: 1.6 + R(), r0: 8 * s, r1: 30 * s, a: 0.28, tint: R() < 0.5 ? 0x9fdcff : 0xd8f4ff, fade: 0.25 });
    });
    mist.rate('mist', 7, dt, () => {
      mist.emit(30 + R() * 160, 240 + R() * 20, { vx: pm() * 40, vy: 6 + R() * 16, life: 2.2 + R(), r0: 14 * s, r1: 50 * s, a: 0.3, tint: 0xcfe9ff, fade: 0.25 });
    });
    if (k.heat > 0.05)
      ecto.rate('flame', 22 * k.heat, dt, () => {
        ecto.emit(30 + R() * 160, 60 + R() * 200, { vx: pm() * 30, vy: -80 - R() * 90, life: 0.7 + R() * 0.5, r0: 10 * s, r1: 3 * s, a: 0.6, tint: R() < 0.5 ? 0x7fd8ff : 0xe8fbff, grav: -60, fade: 0.1 });
      });
    overheat(k, steam, dt, [CX - 90, 0, 180, 220], 0xdff4ff);
  },
});

// COSMIC CROC: its heel boosters burn all the time and flare before it rockets down; stars twinkle off it and the
// holes glow. Overheated, the boosters roar.
registerLive('cosmiccroc', {
  glow: { rate: 0.8, depth: 0.35, base: 0.55 },
  heat: {},
  setup: (k) => ({
    steam: steamEm(k),
    fire: k.emitter({ frame: 'ember', add: true, curl: 30, drag: 1.2, max: 220 }),
    smoke: k.emitter({ frame: 'puff', curl: 40, drag: 1.2, below: true, max: 100 }),
    stars: k.emitter({ frame: 'spark', add: true, drag: 0.2, max: 40 }),
  }),
  tick(k, dt, { steam, fire, smoke, stars }) {
    const s = k.f.type.scale;
    const flare = k.windingUp || k.f.state === 'descend' ? 1 : 0;
    const pow = 0.5 + flare * 0.9 + k.heat * 0.6;
    for (const [x, y] of CROC_NOZZLES) {
      fire.rate('jet' + x, 40 * pow, dt, () => {
        fire.emit(x + pm() * 10, y, { vx: pm() * 30, vy: -260 * pow - R() * 160, life: 0.35 + R() * 0.25, r0: 20 * s, r1: 4 * s, a: 0.95, tint: R() < 0.4 ? 0xfff0a0 : R() < 0.7 ? 0xffa030 : 0xff5a20, fade: 0.05 });
      });
      smoke.rate('sm' + x, 5 * pow, dt, () => {
        smoke.emit(x + pm() * 10, y - 30, { vx: pm() * 30, vy: -60 - R() * 40, life: 1.2 + R() * 0.6, r0: 8 * s, r1: 30 * s, a: 0.25, tint: 0xc8ccd8, fade: 0.2 });
      });
    }
    stars.rate('tw', 3, dt, () => {
      const [x, y] = CROC_HOLES_LIVE[Math.floor(R() * CROC_HOLES_LIVE.length)];
      stars.emit(x + pm() * 60, y - 60 + pm() * 80, { life: 0.5, r0: 9 * s, r1: 1 * s, a: 1, tint: R() < 0.5 ? 0xffffff : 0x7df9ff, spin: 3, fade: 0.3 });
    });
    overheat(k, steam, dt, [CX - 110, 40, 220, 200]);
  },
});

// NONNA'S SLIPPER: the wooden spoon wags in its cuff (her tell), flour puffs off her when she lands, and stray
// fibres drift off the wool. Enraged or overheated she steams.
registerLive('nonna', {
  sway: { spoon: { k: 40, c: 4.5, gain: 1.3, idle: 0.22, flop: 0.9 } },
  rig: { squash: 1.2, swing: 1.2 },
  heat: {},
  setup: (k) => ({
    steam: steamEm(k),
    flour: k.emitter({ frame: 'puff', curl: 40, drag: 1.4, max: 120 }),
    fluff: k.emitter({ frame: 'mote', drag: 0.8, max: 40 }),
  }),
  tick(k, dt, { steam, flour, fluff }) {
    const s = k.f.type.scale;
    landDust(k, flour, 16, [0xfff8ee, 0xf4ead8], 270, 100);
    fluff.rate('fib', 2, dt, () => {
      fluff.emit(CX - 100 + R() * 200, 40 + R() * 200, { vx: pm() * 20, vy: -10 - R() * 20, life: 2, r0: 2 * s, r1: 1.5 * s, a: 0.8, tint: R() < 0.5 ? 0xf2c14e : 0xffffff, fade: 0.2 });
    });
    overheat(k, steam, dt, [CX - 100, 0, 200, 220]);
  },
});

// THE GARGOYLE: its stone wings flex on springs (spreading as it moves), grit and pebbles crumble off it, landings
// throw a cloud of stone dust. Overheated, its cracks glow molten and it steams.
registerLive('gargoyle', {
  rig: { swing: 0.5, squash: 0.7 },
  sway: {
    wingL: { k: 38, c: 3.6, gain: 1.4, idle: 0.1, below: true, flop: 1.3 },
    wingR: { k: 38, c: 3.6, gain: -1.4, idle: 0.1, below: true, flop: -1.3 },
  },
  heat: {},
  setup: (k) => ({
    steam: steamEm(k),
    dust: k.emitter({ frame: 'puff', curl: 30, drag: 1.5, below: true, max: 120 }),
    grit: k.emitter({ frame: 'flake', drag: 0.3, max: 80 }),
  }),
  tick(k, dt, { steam, dust, grit }) {
    const s = k.f.type.scale;
    grit.rate('crumble', 2.5 + k.heat * 4, dt, () => {
      grit.emit(CX - 90 + R() * 180, 40 + R() * 180, { vx: pm() * 30, vy: 20, life: 1.2, r0: 3.5 * s, r1: 3 * s, a: 1, tint: R() < 0.5 ? 0x6a6a74 : 0x8b8a90, grav: 700, spin: 6, fade: 0.02 });
    });
    landDust(k, dust, 18, [0x9a98a0, 0x7a7880, 0xb8b6be], 286, 110, 1.2);
    overheat(k, steam, dt, [CX - 90, 20, 180, 200]);
  },
});

// KRAKEN TOES: the tentacles writhe (the toe band's wiggle) and curl up before it slams; kelp sways, water drips
// off the tentacle tips and bubbles rise round it. Overheated, it boils.
registerLive('kraken', {
  wiggle: true,
  sway: {
    kelp0: { k: 30, c: 5.5, gain: 0.9, idle: 0.14, flop: 0.6 },
    kelp1: { k: 34, c: 5.5, gain: 0.9, idle: 0.14, flop: 0.6 },
  },
  heat: {},
  setup: (k) => ({
    steam: steamEm(k),
    drips: k.emitter({ frame: 'drop', drag: 0.2, max: 60 }),
    bubbles: k.emitter({ frame: 'bubble', curl: 40, drag: 0.8, max: 60 }),
  }),
  tick(k, dt, { steam, drips, bubbles }) {
    const s = k.f.type.scale;
    drips.rate('drip', 2.2, dt, () => {
      const x = [CX - 150, CX - 70, CX + 4, CX + 74, CX + 150][Math.floor(R() * 5)];
      drips.emit(x + pm() * 20, 280, { vy: 30, life: 0.8, r0: 4.5 * s, r1: 3.5 * s, a: 0.85, tint: 0x9adcff, grav: 900, fade: 0.02 });
    });
    bubbles.rate('bub', 3 + k.heat * 10, dt, () => {
      bubbles.emit(CX - 120 + R() * 240, 60 + R() * 220, { vx: pm() * 20, vy: -40 - R() * 50, life: 1.4 + R(), r0: (3 + R() * 4) * s, r1: (5 + R() * 4) * s, a: 0.7, tint: 0xcfefff, fade: 0.1 });
    });
    void KELP;
    overheat(k, steam, dt, [CX - 120, 40, 240, 220]);
  },
});

// QUEEN OF THE RINK: her neon wheels pulse (fast, like a disco), glitter trails off her as she weaves and sparkles
// pop round her crown.
registerLive('rinkqueen', {
  glow: { rate: 1.6, depth: 0.5, base: 0.45 },
  rig: { swing: 1.3, squash: 1.1 },
  heat: {},
  setup: (k) => ({
    steam: steamEm(k),
    glitter: k.emitter({ frame: 'spark', add: true, drag: 1.2, max: 160 }),
  }),
  tick(k, dt, { steam, glitter }) {
    const s = k.f.type.scale;
    const speed = Math.min(1, Math.abs(k.vx) / 500);
    glitter.rate('trail', 6 + speed * 30, dt, () => {
      const [x, y] = RINK_WHEELS[Math.floor(R() * 2)];
      glitter.emit(x + pm() * 40, y + pm() * 20, { vx: pm() * 40, vy: 10 + R() * 40, life: 0.6 + R() * 0.5, r0: 8 * s, r1: 1 * s, a: 0.9, tint: [0xff3fa4, 0xffd23f, 0x39f3ff, 0xffffff][Math.floor(R() * 4)], spin: 4, fade: 0.1 });
    });
    glitter.rate('crown', 3, dt, () => {
      glitter.emit(CX + pm() * 150, 20 + pm() * 30, { life: 0.45, r0: 11 * s, r1: 1 * s, a: 1, tint: 0xfff2a0, spin: 3, fade: 0.3 });
    });
    overheat(k, steam, dt, [CX - 100, 20, 200, 220]);
  },
});

// THE YETI SKI BOOT: snow sifts off it all the time, the fur tufts sway, and every stomp throws up a burst of powder.
// Overheated, the snow melts to steam and drips.
registerLive('yeti', {
  rig: { swing: 0.5, squash: 0.7 },
  sway: Object.fromEntries(YETI_TUFTS.map((_, i) => [`tuft${i}`, { k: 50, c: 4, gain: i ? -1.3 : 1.3, idle: 0.1, flop: i ? -1 : 1 }])),
  heat: {},
  setup: (k) => ({
    steam: steamEm(k),
    snow: k.emitter({ frame: 'mote', curl: 30, drag: 0.8, max: 140 }),
    powder: k.emitter({ frame: 'puff', curl: 30, drag: 1.5, max: 140 }),
    drips: k.emitter({ frame: 'drop', drag: 0.2, max: 40 }),
  }),
  tick(k, dt, { steam, snow, powder, drips }) {
    const s = k.f.type.scale;
    snow.rate('sift', 10 * (1 - k.heat * 0.7), dt, () => {
      snow.emit(CX - 110 + R() * 220, R() * 260, { vx: pm() * 30, vy: 20 + R() * 30, life: 1.6 + R(), r0: 3 * s, r1: 2 * s, a: 0.95, tint: 0xffffff, fade: 0.1 });
    });
    landDust(k, powder, 22, [0xffffff, 0xe8f2ff, 0xd8e6f8], 292, 140, 1.3);
    if (k.heat > 0.05)
      drips.rate('melt', 4 * k.heat, dt, () => {
        drips.emit(CX - 100 + R() * 200, 260, { vy: 30, life: 0.7, r0: 4 * s, r1: 3 * s, a: 0.8, tint: 0xbfe6ff, grav: 900, fade: 0.02 });
      });
    overheat(k, steam, dt, [CX - 100, 0, 200, 260]);
  },
});
