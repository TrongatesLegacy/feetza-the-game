// How the bosses and mini-bosses of batch C move in play (src/game/liveKit.ts). Their art is in
// src/content/style/bosses*.ts. Every one of them overheats in its later phases: the heat layer glows from the sole
// up (automatic for bosses) and steam pours off it (overheat() below).

import Phaser from 'phaser';
import { CX } from '../../art/feetCommon';
import { type LiveFoot, Spring, type WorldEmitter, registerLive } from '../../game/liveKit';
import { save } from '../../systems/save';
import { crand } from '../../systems/cosmeticRandom';
import { BIG_LOCKS } from '../style/bosses';
import { drawFly } from '../style/pilot-bare';
import { JELLY_TENTS } from '../style/bosses-4';
import { DOUGH_CONTACT, DOUGH_STRAND, PENNANT, TICKET, saucerWithBeam } from '../style/bosses-3';
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

// THE HEAD WAITER: the tray sways on its spring (and swings up as it dives), light glints off the patent leather.
registerLive('headwaiter', {
  sway: { tray: { k: 46, c: 4.5, gain: -1.2, idle: 0.06, flop: -0.8 } },
  rig: { swing: 0.8, squash: 0.8 },
  heat: {},
  setup: (k) => ({ steam: steamEm(k), glints: k.emitter({ frame: 'spark', add: true, drag: 0, max: 16 }) }),
  tick(k, dt, { steam, glints }) {
    const s = k.f.type.scale;
    glints.rate('g', 1.4, dt, () => {
      glints.emit(CX - 70 + R() * 90, 170 + R() * 60, { life: 0.4, r0: 10 * s, r1: 1 * s, a: 1, tint: 0xffffff, spin: 2, fade: 0.3 });
    });
    overheat(k, steam, dt, [CX - 90, 0, 180, 220]);
  },
});

// SANDCASTLE SAM: the pennant flutters, sand trickles off the castle walls, landings throw up a spray of sand.
registerLive('sandcastle', {
  wiggle: true,
  sway: { pennant: { k: 60, c: 3.5, gain: 1.4, idle: 0.2, flop: 1 } },
  heat: {},
  setup: (k) => ({
    steam: steamEm(k),
    sand: k.emitter({ frame: 'mote', drag: 0.4, max: 120 }),
    spray: k.emitter({ frame: 'puff', curl: 30, drag: 1.5, below: true, max: 100 }),
  }),
  tick(k, dt, { steam, sand, spray }) {
    const s = k.f.type.scale;
    sand.rate('trickle', 8, dt, () => {
      sand.emit(CX - 100 + R() * 200, 40 + R() * 130, { vx: pm() * 10, vy: 20, life: 1, r0: 2.2 * s, r1: 1.8 * s, a: 1, tint: R() < 0.5 ? 0xf0cf8e : 0xc8a060, grav: 500, fade: 0.05 });
    });
    landDust(k, spray, 18, [0xf0d8a0, 0xe0c080], 258, 100);
    overheat(k, steam, dt, [CX - 90, 20, 180, 200]);
    void PENNANT;
  },
});

// SHORT-ORDER SHOE: the order ticket flaps, the grease on it sizzles off in thin smoke and spits, and it steams
// harder when it overheats.
registerLive('shortorder', {
  sway: { ticket: { k: 70, c: 4, gain: 1.6, idle: 0.14, flop: 1.2 } },
  rig: { squash: 1.1, swing: 1.1 },
  heat: {},
  setup: (k) => ({
    steam: steamEm(k),
    smoke: k.emitter({ frame: 'puff', curl: 50, drag: 1, max: 80 }),
    spit: k.emitter({ frame: 'ember', add: true, drag: 0.4, max: 40 }),
  }),
  tick(k, dt, { steam, smoke, spit }) {
    const s = k.f.type.scale;
    smoke.rate('sizzle', 5, dt, () => {
      smoke.emit(CX - 80 + R() * 160, 60 + R() * 160, { vx: pm() * 16, vy: -40 - R() * 30, life: 1.2 + R() * 0.6, r0: 4 * s, r1: 18 * s, a: 0.22, tint: 0xe8e4e0, fade: 0.2 });
    });
    spit.rate('spit', 2.5, dt, () => {
      spit.emit(CX - 80 + R() * 160, 100 + R() * 120, { vx: pm() * 160, vy: -120 - R() * 100, life: 0.4, r0: 3 * s, r1: 1 * s, a: 1, tint: 0xffd070, grav: 600, fade: 0.02 });
    });
    overheat(k, steam, dt, [CX - 90, 20, 180, 220]);
    void TICKET;
  },
});

// ICE SKATE IVY: the blade glints and gleams (the glow), frost mist rolls off it, and landings throw ice shavings.
registerLive('iceskate', {
  glow: { rate: 0.9, depth: 0.6, base: 0.35 },
  rig: { swing: 1.3 },
  heat: {},
  setup: (k) => ({
    steam: steamEm(k),
    mist: k.emitter({ frame: 'puff', curl: 20, drag: 1, below: true, max: 80 }),
    ice: k.emitter({ frame: 'flake', add: true, drag: 0.6, max: 80 }),
    glints: k.emitter({ frame: 'spark', add: true, drag: 0, max: 12 }),
  }),
  tick(k, dt, { steam, mist, ice, glints }) {
    const s = k.f.type.scale;
    mist.rate('mist', 4, dt, () => {
      mist.emit(CX - 90 + R() * 180, 296, { vx: pm() * 40, vy: 10 + R() * 10, life: 1.6 + R(), r0: 8 * s, r1: 30 * s, a: 0.3, tint: 0xe8f4ff, fade: 0.25 });
    });
    glints.rate('g', 1.2, dt, () => {
      glints.emit(CX - 80 + R() * 170, 288 + pm() * 8, { life: 0.4, r0: 12 * s, r1: 1 * s, a: 1, tint: 0xeaf6ff, spin: 2, fade: 0.3 });
    });
    if (k.landed)
      for (let i = 0, n = k.burst(22); i < n; i++) ice.emit(CX + pm() * 180, 300, { vx: pm() * 380, vy: -100 - R() * 200, life: 0.7, r0: 3 * s, r1: 2 * s, a: 0.9, tint: 0xdff2ff, grav: 700, spin: 8, fade: 0.02 });
    overheat(k, steam, dt, [CX - 80, 20, 160, 240]);
  },
});

// UFO TOE: its pet saucer circles it (passing in front and behind, its lights chasing), the antennae bob, the spots
// and nail glow, and a faint tractor shimmer hangs under it.
registerLive('ufotoe', {
  glow: { rate: 0.7, depth: 0.45, base: 0.4 },
  sway: {
    ant0: { k: 40, c: 3.5, gain: 1.4, idle: 0.14, flop: 1 },
    ant1: { k: 44, c: 3.5, gain: 1.4, idle: 0.14, flop: 1 },
  },
  rig: { squash: 1.3 },
  heat: {},
  setup(k) {
    const key = k.sheet('lk_saucer2', 110, 130, 4, (ctx, i) => {
      ctx.translate(55, 30);
      saucerWithBeam(ctx, 2.1, i / 3);
    });
    return {
      saucer: k.swarm({ key, frames: 4, count: 1, at: [CX, 214], rx: 132, ry: 30, speed: 1.2, jitter: 6, scale: 1, upright: 0.08 }),
      steam: steamEm(k),
      motes: k.emitter({ frame: 'mote', add: true, drag: 0.5, max: 50 }),
    };
  },
  tick(k, dt, { saucer, steam, motes }) {
    const s = k.f.type.scale;
    saucer.pace += ((k.windingUp ? 2.4 : 1) - saucer.pace) * Math.min(1, dt * 3);
    motes.rate('beam', 6, dt, () => {
      motes.emit(CX - 50 + R() * 100, 290, { vx: pm() * 10, vy: -30 - R() * 30, life: 1.2, r0: 3 * s, r1: 1 * s, a: 0.7, tint: 0xd4ff5a, fade: 0.2 });
    });
    overheat(k, steam, dt, [CX - 80, 40, 160, 220]);
  },
});

// DOUGH BOY: a blob of dough on soft, under-damped springs of his own (pose). He jiggles and oozes all the time (his
// width breathes out of step with his height); before a dive he sags and spreads, then gathers himself up and in;
// he lands with a wide, flat splat and pulls back with an overshooting wobble (the width lags the height, and the
// mass rocks to his heavy side); as he lifts off, a strand of dough stretches from his sole to the ground, necks
// and snaps, the halves springing back. Flour drifts off his floury top and puffs out when he lands; his eyes blink
// and follow your peel. Overheated, he bakes: a golden crust glow and steam.
interface DoughStrand {
  /** The ground end (world px) and the time since he lifted off (s). */
  gx: number;
  gy: number;
  t: number;
  /** How long it stretches before it snaps (design units), and when it did (s). */
  reach: number;
  snapAt: number;
  /** Snapped: its length and direction then, in the foot's own frame (measured on the first frame drawn after). */
  snap?: { len: number; ux: number; uy: number; measured: boolean };
}

interface DoughLive {
  steam: WorldEmitter;
  flour: WorldEmitter;
  dust: WorldEmitter;
  sy: Spring;
  sx: Spring;
  rock: Spring;
  curl: number;
  ground: [number, number] | null;
  strand: DoughStrand | null;
  gfx: Phaser.GameObjects.Graphics;
  last: string;
}

const DOUGH_FILL = 0xefd3a0;
const DOUGH_SHADE = 0xcf9f62;
const DOUGH_LIT = 0xfff4dc;
const DOUGH_LINE = 0x4a2610;
const calm = () => (save.settings.reducedMotion ? 0.35 : 1);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Draw the dough strand (or its two snapped halves) in the foot's own frame. */
function drawStrand(k: LiveFoot, st: DoughLive): void {
  const g = st.gfx;
  g.clear();
  const s = st.strand;
  if (!s) return;
  const f = k.f;
  const r = f.root;
  const ci = Math.cos(-r.rotation);
  const si = Math.sin(-r.rotation);
  // world → the root's frame
  const loc = (wx: number, wy: number): [number, number] => {
    const lx = wx - r.x;
    const ly = wy - r.y;
    return [(ci * lx - si * ly) / r.scaleX, (si * lx + ci * ly) / r.scaleY];
  };
  // one design unit in the root's frame
  const du = f.type.scale;
  const [tx, ty] = loc(...f.styleWorld(DOUGH_STRAND[0], DOUGH_STRAND[1]));
  const [gx, gy] = loc(s.gx, s.gy);
  /** A tapered rope from a to b: half widths wa at a, wb at b, `neck` at its thinnest (u = at), bowed sideways. */
  const rope = (ax: number, ay: number, bx: number, by: number, wa: number, wb: number, neck: number, at: number, bow: number, alpha: number) => {
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const n = 14;
    const left: Phaser.Math.Vector2[] = [];
    const right: Phaser.Math.Vector2[] = [];
    const lit: Phaser.Math.Vector2[] = [];
    const shaded: Phaser.Math.Vector2[] = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const b = Math.sin(u * Math.PI) * bow;
      const cx = ax + dx * u + nx * b;
      const cy = ay + dy * u + ny * b;
      // thick where it pulls out of the sole and where it's stuck to the ground, necking in between
      const w = neck + (wa - neck) * Math.exp(-(u / Math.max(0.05, at)) * 3) + (wb - neck) * Math.exp(-((1 - u) / Math.max(0.05, 1 - at)) * 3);
      // (n points to the rope's left: the side facing the light)
      left.push(new Phaser.Math.Vector2(cx + nx * w, cy + ny * w));
      right.push(new Phaser.Math.Vector2(cx - nx * w, cy - ny * w));
      lit.push(new Phaser.Math.Vector2(cx + nx * w * 0.5, cy + ny * w * 0.5));
      shaded.push(new Phaser.Math.Vector2(cx - nx * w * 0.55, cy - ny * w * 0.55));
    }
    const poly = [...left, ...right.reverse()];
    g.fillStyle(DOUGH_FILL, alpha).fillPoints(poly, true);
    // its shaded side away from the light, and a lit line down the near side
    g.lineStyle(Math.max(1, du * 1.6), DOUGH_SHADE, 0.7 * alpha).strokePoints(shaded);
    g.lineStyle(Math.max(1, du * 1.1), DOUGH_LIT, 0.75 * alpha).strokePoints(lit);
    g.lineStyle(du * 2.6, DOUGH_LINE, alpha).strokePoints(poly, true);
  };
  const blob = (x: number, y: number, rx: number, ry: number, alpha: number) => {
    g.fillStyle(DOUGH_FILL, alpha).fillEllipse(x, y, rx * 2, ry * 2);
    g.fillStyle(DOUGH_LIT, 0.7 * alpha).fillEllipse(x - rx * 0.3, y - ry * 0.35, rx * 0.8, ry * 0.5);
    g.lineStyle(du * 2.6, DOUGH_LINE, alpha).strokeEllipse(x, y, rx * 2, ry * 2);
  };
  if (!s.snap) {
    // stretching: it necks as it gets longer
    const u = clamp01(Math.hypot(gx - tx, gy - ty) / du / s.reach);
    const neck = Math.max(1.6, 13 * Math.pow(1 - u, 0.9)) * du;
    rope(tx, ty, gx, gy, 24 * du, 28 * du, neck, 0.55, Math.sin(s.t * 9) * 5 * du * (1 - u), 1);
    return;
  }
  // snapped: the top half springs back up into his sole, the bottom half slumps into a little puddle that fades
  const t2 = s.t - s.snapAt;
  const sn = s.snap;
  if (!sn.measured) {
    const len = Math.hypot(gx - tx, gy - ty) || 1;
    Object.assign(sn, { len, ux: (gx - tx) / len, uy: (gy - ty) / len, measured: true });
  }
  const up = Math.max(0, 1 - t2 / 0.14);
  if (up > 0) {
    const len = sn.len * 0.55 * up * up;
    const ex = tx + sn.ux * len;
    const ey = ty + sn.uy * len;
    rope(tx, ty, ex, ey, 20 * du, 5 * du, 3.5 * du, 0.6, 0, 1);
    blob(ex, ey, 6 * du, 7 * du, 1);
  }
  const down = Math.max(0, 1 - t2 / 0.24);
  const fade = Math.max(0, 1 - Math.max(0, t2 - 0.3) / 0.45);
  if (down > 0) {
    const len = sn.len * 0.45 * down;
    rope(gx, gy, gx - sn.ux * len, gy - sn.uy * len, 24 * du, 4.5 * du, 3.5 * du, 0.55, 0, fade);
    blob(gx - sn.ux * len, gy - sn.uy * len, 5.5 * du, 6.5 * du, fade);
  }
  // the puddle it leaves on the ground
  if (fade > 0) blob(gx, gy - 3 * du, (18 + 10 * (1 - down)) * du, (6 + 3 * down) * du, fade);
}

registerLive('doughboy', {
  wiggle: true,
  rig: { swing: 1, squash: 1, breath: 1 },
  blink: { eyes: { every: 3, look: 2 } },
  heat: {},
  setup(k): DoughLive {
    const gfx = k.sc.add.graphics();
    k.f.addLiveFx(gfx, true);
    return {
      steam: steamEm(k),
      flour: k.emitter({ frame: 'puff', curl: 40, drag: 1.4, max: 140 }),
      dust: k.emitter({ frame: 'puff', curl: 30, drag: 1.6, below: true, max: 80 }),
      // soft and under-damped: every move wobbles on after it
      sy: new Spring(1, 150, 7),
      sx: new Spring(1, 240, 12),
      rock: new Spring(0, 80, 5),
      curl: 0,
      ground: null,
      strand: null,
      gfx,
      last: '',
    };
  },
  pose(k, dt, p, st) {
    const f = k.f;
    const c = calm();
    // the constant jiggle, and the ooze: his width breathes out of step with his height
    let syTo = 1 + (Math.sin(k.t * 1.25) * 0.016 + Math.sin(k.t * 2.9 + 1) * 0.007) * c;
    let ooze = Math.sin(k.t * 1.05 + 2) * 0.014 * c;
    let curlTo = 0;
    if (k.windingUp) {
      const u = clamp01((f.stateT - (f.hoverTime - 0.45)) / 0.45);
      if (u < 0.5) {
        // he sags, slumping down and out over his sole…
        syTo = 1 - 0.2 * c;
        ooze += 0.04 * c;
        curlTo = -0.5;
      } else {
        // …then gathers himself up and in
        syTo = 1 + 0.15 * c;
        ooze -= 0.05 * c;
        curlTo = 1;
      }
    } else if (f.state === 'descend') {
      syTo = 1 + Math.min(0.1, Math.max(0, f.vy) / 4200) * c;
      curlTo = 0.5;
    } else if (f.state === 'stomp') curlTo = k.sinceLand < 0.3 ? -1 : 0;
    else if (f.state === 'lift') {
      // the sole sticks for a moment as he pulls away
      syTo = 1 + (st.strand && !st.strand.snap ? 0.1 : 0.03) * c;
      curlTo = 0.3;
    }
    if (k.landed) {
      // splat: wide and flat, then the springs pull him back with an overshooting wobble
      st.sy.v -= 7 * c;
      st.rock.v += 0.9 * c;
      st.curl = -1;
    }
    const sy = Phaser.Math.Clamp(st.sy.step(syTo, dt), 0.66, 1.22);
    const sx = Phaser.Math.Clamp(st.sx.step(1 + (1 - sy) * 0.95 + ooze, dt), 0.85, 1.6);
    const rock = st.rock.step(0, dt);
    st.curl += Math.sign(curlTo - st.curl) * Math.min(Math.abs(curlTo - st.curl), (curlTo > st.curl ? 6 : 4) * dt);
    return { swing: p.swing + rock * 0.08, sx, sy, curl: st.curl };
  },
  tick(k, dt, st) {
    const f = k.f;
    const s = f.type.scale;
    // flour drifting off his floury top
    st.flour.rate('dust', 1.6, dt, () => {
      st.flour.emit(CX - 80 + R() * 170, 10 + R() * 90, { vx: pm() * 20, vy: 8 + R() * 12, life: 1.6, r0: 3 * s, r1: 12 * s, a: 0.28, tint: 0xffffff, fade: 0.2 });
    });
    if (k.landed) {
      // a puff of flour off the sole, and flour shaken off his top
      landDust(k, st.dust, 22, [0xffffff, 0xfff6e4, 0xf3e2c0], DOUGH_CONTACT, 124, 1.15);
      for (let i = 0, n = k.burst(10); i < n; i++) st.flour.emit(CX - 70 + R() * 150, 10 + R() * 70, { vx: pm() * 160, vy: -50 - R() * 70, life: 1 + R() * 0.5, r0: 5 * s, r1: 24 * s, a: 0.34, tint: R() < 0.5 ? 0xffffff : 0xfff6e4, fade: 0.08 });
      st.ground = f.styleWorld(DOUGH_STRAND[0], DOUGH_CONTACT);
      st.strand = null;
    }
    // lifting off: a strand of dough stretches from his sole to where he stood, and snaps
    if (f.state === 'lift' && st.last !== 'lift' && st.ground) {
      st.strand = { gx: st.ground[0], gy: st.ground[1], t: 0, reach: 115 + R() * 30, snapAt: 0 };
      st.ground = null;
    }
    if (f.state === 'descend' || f.state === 'hover') st.ground = null;
    st.last = f.state;
    const sd = st.strand;
    if (sd) {
      sd.t += dt;
      const [tx, ty] = f.styleWorld(DOUGH_STRAND[0], DOUGH_STRAND[1]);
      const len = Math.hypot(sd.gx - tx, sd.gy - ty) || 1;
      // it snaps once it's stretched as far as it goes (or he's been knocked well clear)
      if (!sd.snap && (len / (s * f.root.scaleX) >= sd.reach || sd.t > 0.7)) {
        sd.snapAt = sd.t;
        sd.snap = { len: 0, ux: 0, uy: 1, measured: false };
        // a little puff of flour where it parts (about halfway down: design units below the sole)
        const below = (len * 0.55) / (s * f.root.scaleY);
        for (let i = 0, n = k.burst(5); i < n; i++) st.dust.emit(DOUGH_STRAND[0] + pm() * 30, DOUGH_STRAND[1] + below, { vx: pm() * 90, vy: -10 - R() * 30, life: 0.6, r0: 3 * s, r1: 12 * s, a: 0.3, tint: 0xfff6e4, fade: 0.1 });
      }
      if (sd.snap && sd.t - sd.snapAt > 0.8) st.strand = null;
    }
    drawStrand(k, st);
    overheat(k, st.steam, dt, [CX - 90, 20, 180, 220]);
  },
  die(_k, st) {
    st.strand = null;
    st.gfx.clear();
  },
});

// THE PIGEON KING: struts (a bobbing swing), feathers drift off its ruff, it puffs up before it swoops (the wind-up
// stretch) and a landing throws a flurry of feathers; light glints off its crown.
registerLive('pigeonking', {
  wiggle: true,
  rig: { swing: 1.4, squash: 1.2, breath: 1.6 },
  heat: {},
  setup: (k) => ({
    steam: steamEm(k),
    feathers: k.emitter({ frame: 'flake', drag: 1.6, max: 80 }),
    glints: k.emitter({ frame: 'spark', add: true, drag: 0, max: 10 }),
  }),
  tick(k, dt, { steam, feathers, glints }) {
    const s = k.f.type.scale;
    const tint = () => (R() < 0.6 ? 0x8f93ad : R() < 0.5 ? 0x6a6e88 : 0xc8cce0);
    feathers.rate('drift', 1.5 + (k.windingUp ? 6 : 0), dt, () => {
      feathers.emit(CX - 90 + R() * 180, 60 + R() * 90, { vx: pm() * 40, vy: 10 + R() * 20, life: 2 + R(), r0: 6 * s, r1: 5 * s, a: 0.95, tint: tint(), grav: 40, spin: 2.5, fade: 0.1 });
    });
    if (k.landed)
      for (let i = 0, n = k.burst(14); i < n; i++) feathers.emit(CX + pm() * 160, 140, { vx: pm() * 300, vy: -100 - R() * 160, life: 1.8, r0: 7 * s, r1: 6 * s, a: 1, tint: tint(), grav: 120, spin: 5, fade: 0.05 });
    glints.rate('crown', 0.9, dt, () => glints.emit(CX - 20 + R() * 40, 170 + R() * 20, { life: 0.4, r0: 10 * s, r1: 1 * s, a: 1, tint: 0xfff2a0, spin: 2, fade: 0.3 }));
    overheat(k, steam, dt, [CX - 80, 20, 160, 160]);
  },
});

// JELLYFISH FLIP-FLOP: the jelly glows and pulses (brighter as it drops: its tell), the tentacles under the sole
// sway and trail, it drips and bubbles rise off it.
registerLive('jellyfish', {
  wiggle: true,
  glow: { rate: 0.5, depth: 0.5, base: 0.4 },
  sway: Object.fromEntries(JELLY_TENTS.map((_, i) => [`tent${i}`, { k: 26 + i * 3, c: 3.2, gain: 1.4, idle: 0.16, flop: 1.2, below: true }])),
  heat: {},
  setup: (k) => ({
    steam: steamEm(k),
    drips: k.emitter({ frame: 'drop', add: true, drag: 0.2, max: 50 }),
    bubbles: k.emitter({ frame: 'bubble', curl: 40, drag: 0.8, max: 50 }),
    sparks: k.emitter({ frame: 'mote', add: true, drag: 0.6, max: 60 }),
  }),
  tick(k, dt, { steam, drips, bubbles, sparks }) {
    const s = k.f.type.scale;
    drips.rate('drip', 1.6, dt, () => {
      drips.emit(CX - 100 + R() * 200, 300 + R() * 20, { vy: 30, life: 0.7, r0: 4 * s, r1: 3 * s, a: 0.9, tint: 0xff9ad8, grav: 900, fade: 0.02 });
    });
    bubbles.rate('bub', 2.5, dt, () => {
      bubbles.emit(CX - 110 + R() * 220, 180 + R() * 80, { vx: pm() * 20, vy: -40 - R() * 40, life: 1.4, r0: 3 * s, r1: 5 * s, a: 0.7, tint: 0xffd0f0, fade: 0.1 });
    });
    sparks.rate('bio', k.windingUp || k.f.state === 'descend' ? 24 : 5, dt, () => {
      sparks.emit(CX - 90 + R() * 180, 270 + R() * 60, { vx: pm() * 20, vy: -10 - R() * 20, life: 0.8, r0: 4 * s, r1: 1 * s, a: 0.9, tint: R() < 0.5 ? 0xff7ac8 : 0xc8a4ff, fade: 0.2 });
    });
    overheat(k, steam, dt, [CX - 90, 20, 180, 220]);
  },
});

// MILKSHAKE MAX: the cherry wobbles on top (its tell), condensation runs down the glass and drips off the foot, the
// cream oozes a little. Overheated, it melts and steams.
registerLive('milkshake', {
  sway: { cherry: { k: 50, c: 3, gain: 1.8, idle: 0.14, flop: 1.6 } },
  rig: { squash: 1.2 },
  heat: {},
  setup: (k) => ({
    steam: steamEm(k),
    drips: k.emitter({ frame: 'drop', drag: 0.3, max: 60 }),
    cream: k.emitter({ frame: 'drop', drag: 1, max: 30 }),
  }),
  tick(k, dt, { steam, drips, cream }) {
    const s = k.f.type.scale;
    drips.rate('cond', 1.8, dt, () => {
      const side = R() < 0.5 ? -1 : 1;
      drips.emit(CX + side * (30 + R() * 50), 120 + R() * 100, { vx: -side * 6, vy: 30, life: 1.2, r0: 3 * s, r1: 2.5 * s, a: 0.7, tint: 0xeaf6ff, grav: 260, fade: 0.05 });
    });
    cream.rate('ooze', 0.6 + k.heat * 4, dt, () => {
      cream.emit(CX - 100 + R() * 200, 60, { vy: 12, life: 1.2, r0: 5 * s, r1: 4 * s, a: 1, tint: 0xfff8f4, grav: 120 + k.heat * 400, fade: 0.05 });
    });
    overheat(k, steam, dt, [CX - 100, 10, 200, 120]);
  },
});

// THE LUMBERJACK: the strapped axe swings with its moves, wood chips fly as it winds up a chop and on every chop,
// sawdust sifts off it.
registerLive('lumberjack', {
  sway: { axe: { k: 36, c: 4.5, gain: 1.2, idle: 0.06, below: true, flop: 0.8 } },
  rig: { swing: 0.7, squash: 0.9 },
  heat: {},
  setup: (k) => ({
    steam: steamEm(k),
    chips: k.emitter({ frame: 'flake', drag: 0.5, max: 80 }),
    dust: k.emitter({ frame: 'puff', curl: 30, drag: 1.5, below: true, max: 80 }),
  }),
  tick(k, dt, { steam, chips, dust }) {
    const s = k.f.type.scale;
    const chip = (x: number, y: number, p: number) =>
      chips.emit(x, y, { vx: pm() * 320 * p, vy: -120 - R() * 200 * p, life: 0.9, r0: 5 * s, r1: 4 * s, a: 1, tint: R() < 0.5 ? 0xd8a860 : 0xb07a3a, grav: 800, spin: 10, fade: 0.02 });
    if (k.windingUp) chips.rate('wind', 14, dt, () => chip(CX + pm() * 200, 40 + R() * 180, 0.7));
    if (k.landed) for (let i = 0, n = k.burst(16); i < n; i++) chip(CX + pm() * 200, 266, 1.2);
    chips.rate('saw', 1.5, dt, () => chips.emit(CX - 80 + R() * 160, 60 + R() * 150, { vx: pm() * 10, vy: 20, life: 1.2, r0: 2.5 * s, r1: 2 * s, a: 0.9, tint: 0xe8c890, grav: 200, spin: 4, fade: 0.05 }));
    landDust(k, dust, 12, [0xb8a080, 0x9a8460], 266, 100);
    overheat(k, steam, dt, [CX - 90, 20, 180, 220]);
  },
});

// THE ZOMBIE LOAFER: flies buzz round it, the eyeball swings on its thread, its tongue licks its lips (its tell),
// it drools green slime and a faint rot fog drifts off it.
registerLive('poltergeist', {
  rig: { swing: 1.1, squash: 1.1 },
  sway: { eye: { k: 30, c: 3.6, gain: 1.4, idle: 0.14, flop: 1 } },
  twitch: { tongue: { every: 1.6 } },
  heat: {},
  setup(k) {
    const key = k.sheet('lk_fly', 64, 56, 3, (ctx, i) => {
      ctx.translate(32, 30);
      drawFly(ctx, 1.9, [0, 0.55, 1][i]);
    });
    return {
      flies: k.swarm({ key, frames: 3, count: 5, at: [CX, 140], rx: 140, ry: 140, speed: 1.5, jitter: 24, scale: 0.55 }),
      steam: steamEm(k),
      drool: k.emitter({ frame: 'drop', drag: 0.3, max: 40 }),
      fog: k.emitter({ frame: 'puff', curl: 24, drag: 0.8, below: true, max: 80 }),
    };
  },
  tick(k, dt, { flies, steam, drool, fog }) {
    const s = k.f.type.scale;
    const diving = k.f.state === 'descend' || k.windingUp;
    flies.tight += ((diving ? 0.6 : 1) - flies.tight) * Math.min(1, dt * 3);
    drool.rate('drool', 1.4, dt, () => {
      drool.emit(CX - 50 + R() * 100, 250, { vy: 20, life: 1, r0: 4.5 * s, r1: 3 * s, a: 0.9, tint: 0xa8d84a, grav: 600, fade: 0.03 });
    });
    fog.rate('rot', 4, dt, () => {
      fog.emit(30 + R() * 160, 200 + R() * 60, { vx: pm() * 30, vy: -6 - R() * 10, life: 2.2, r0: 12 * s, r1: 44 * s, a: 0.28, tint: 0x8aa04a, fade: 0.25 });
    });
    overheat(k, steam, dt, [CX - 90, 10, 180, 200], 0xe0f0d0);
  },
});
