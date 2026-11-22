// How the Titans (Kronos, Atlas, Hyperion) and the Minotaur move in play (src/game/liveKit.ts). Their art is in
// src/content/style/acts-e-2a.ts. All four overheat in their later phases: the heat layer glows from the sole up
// (automatic for bosses) and steam pours off them (overheat()).

import Phaser from 'phaser';
import { CX } from '../../art/feetCommon';
import { footRes } from '../../art/feetArt';
import { type LiveFoot, bossHeat, registerLive } from '../../game/liveKit';
import type { Foot } from '../../game/Foot';
import { crand } from '../../systems/cosmeticRandom';
import { save } from '../../systems/save';
import { landDust, overheat } from './bosses';
import { ATLAS_SPHERE, HYPERION_SUN, KRONOS_CLOCK, KRONOS_CRACK_PATHS, MINO_NOSTRILS, corona } from '../style/acts-e-2a';
import { liveClock } from './titanClock';

const R = () => crand();
const pm = () => crand() - 0.5;
const calm = () => (save.settings.reducedMotion ? 0.35 : 1);

/** The Titans aren't bosses (they rise in Hades's fight with their own health): they overheat as they're worn down
 * below half health, or when enraged. */
const titanHeat = { of: (f: Foot) => Math.max(bossHeat(f), Math.min(1, Math.max(0, (0.5 - f.hp / Math.max(1, f.maxHp)) * 2.2))) };

const steamEm = (k: LiveFoot) => k.emitter({ frame: 'soft', curl: 60, drag: 1.1, max: 160 });

/** An image of the live layer at a design point, on the rig (it swings and squashes with the foot). Its texture is
 * drawn at `res` texels per design unit (the foot's own resolution unless told otherwise). */
function rigImg(k: LiveFoot, key: string, dx: number, dy: number, ox: number, oy: number, below: boolean, texRes: number): Phaser.GameObjects.Image {
  const f = k.f;
  const ts = f.type.scale;
  const img = k.sc.add.image((dx - CX) * ts, (dy - f.meta.footHeight) * ts, key, 0).setOrigin(ox, oy).setScale(1 / texRes);
  f.addLiveArt(img, below);
  return img;
}

/** A texture sheet painted in design units (box x0, y0, w, h) at `res` texels per unit of the foot's scale. */
function designSheet(k: LiveFoot, key: string, box: [number, number, number, number], n: number, res: number, draw: (g: CanvasRenderingContext2D, i: number) => void): string {
  const s = k.f.type.scale * res;
  const [x0, y0, w, h] = box;
  return k.sheet(key, Math.ceil(w * s), Math.ceil(h * s), n, (g, i) => {
    g.scale(s, s);
    g.translate(-x0, -y0);
    draw(g, i);
  });
}

// KRONOS (freed; the Titan King's stone and clock, src/content/style/acts-e-2a.ts): the clock in his snapped shackle
// ticks (titanClock.ts), the broken link swings from the open half and the harpe at his side, the gold in his cracks
// pulses and fine sand trickles out of them (a burst of it when he lands), now and then a mote of time drifts up, and
// stone dust and chips fly when he lands. Hot, time races and the sand pours.
registerLive('kronos', {
  wiggle: true,
  rig: { swing: 0.6, squash: 1.1, breath: 1.3 },
  glow: { rate: 0.7, depth: 0.55, base: 0.4 },
  heat: titanHeat,
  sway: {
    harpe: { k: 38, c: 3.6, gain: 1.1, idle: 0.05, below: true, flop: 0.8 },
    link: { k: 26, c: 2.2, gain: 1.6, idle: 0.16, flop: 1.5 },
  },
  setup(k) {
    const gold = k.f.type.art.secondary ?? '#d9c27a';
    // the cracks' segments, for sand to run from anywhere along them
    const segs: [number, number, number, number][] = [];
    for (const { pts } of KRONOS_CRACK_PATHS) for (let i = 1; i < pts.length; i++) segs.push([pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]]);
    return {
      segs,
      clock: liveClock(k, KRONOS_CLOCK, gold, 'kronos_clock'),
      steam: steamEm(k),
      sand: k.emitter({ frame: 'flake', drag: 0.4, max: 140 }),
      shine: k.emitter({ frame: 'mote', add: true, curl: 30, drag: 0.6, max: 50 }),
      dust: k.emitter({ frame: 'puff', curl: 30, drag: 1.5, below: true, max: 120 }),
      chips: k.emitter({ frame: 'flake', drag: 0.4, max: 60 }),
    };
  },
  tick(k, dt, s) {
    const sc = k.f.type.scale;
    s.clock.update(dt);
    const grain = (x: number, y: number, p: number) =>
      s.sand.emit(x + pm() * 2, y + 1, { vx: pm() * 14 * p, vy: 10 + R() * 30 * p, life: 0.9 + R() * 0.5, r0: (2 + R() * 1.2) * sc, r1: 1.5 * sc, a: 1, tint: R() < 0.6 ? 0xe8c060 : R() < 0.5 ? 0xffe9a0 : 0xc89a38, grav: 520, spin: 6, fade: 0.04 });
    const onCrack = (): [number, number] => {
      const [x0, y0, x1, y1] = s.segs[Math.floor(R() * s.segs.length)];
      const t = R();
      return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
    };
    // fine sand trickles out all along them, more when he's hot
    s.sand.rate('trickle', (14 + k.heat * 26) * calm(), dt, () => grain(...onCrack(), 1));
    // and pours in a thin stream from each crack's lowest end
    for (const [i, { pts }] of KRONOS_CRACK_PATHS.entries()) {
      const [x, y] = pts[pts.length - 1];
      s.sand.rate(`pour${i}`, (9 + k.heat * 10) * calm(), dt, () => grain(x, y, 0.4));
    }
    s.shine.rate('time', 2.5 * calm(), dt, () => {
      const [x, y] = onCrack();
      s.shine.emit(x, y, { vx: pm() * 16, vy: -24 - R() * 26, life: 1.3 + R(), r0: 2 * sc, r1: 4.5 * sc, a: 0.85, tint: R() < 0.7 ? 0xffd87a : 0xfff4d0, fade: 0.2 });
    });
    if (k.landed) for (let i = 0, n = k.burst(30); i < n; i++) {
      const [x, y] = onCrack();
      s.sand.emit(x, y, { vx: pm() * 160, vy: -60 - R() * 140, life: 0.9, r0: 1.8 * sc, r1: 1.2 * sc, a: 1, tint: R() < 0.6 ? 0xe8c060 : 0xffe9a0, grav: 700, spin: 8, fade: 0.03 });
    }
    landDust(k, s.dust, 18, [0x8a8a96, 0x6a6a78, 0xa8a8b4], 262, 110, 1.2);
    if (k.landed)
      for (let i = 0, n = k.burst(12); i < n; i++) s.chips.emit(CX + pm() * 190, 256, { vx: pm() * 400, vy: -180 - R() * 240, life: 0.9, r0: 5 * sc, r1: 4 * sc, a: 1, tint: R() < 0.5 ? 0x6a6a78 : 0x9a9aa8, grav: 1000, spin: 9, fade: 0.02 });
    overheat(k, s.steam, dt, [CX - 90, 20, 180, 190]);
  },
});

// ATLAS: he strains under the sky: deep heavy breaths, sweat running off him (more as he winds up), the stars of the
// sphere twinkle and star dust drifts up off it; the loose end of his wrap swings, and the ground cracks up dust
// when he lands.
registerLive('atlas', {
  wiggle: true,
  rig: { swing: 0.55, squash: 0.75, breath: 2.4 },
  glow: { rate: 1.8, depth: 0.55, base: 0.45 },
  heat: titanHeat,
  sway: { tail: { k: 34, c: 3.2, gain: 1.4, idle: 0.1, flop: 1.2 } },
  setup: (k) => ({
    steam: steamEm(k),
    sweat: k.emitter({ frame: 'drop', drag: 0.2, max: 40 }),
    stars: k.emitter({ frame: 'mote', add: true, curl: 30, drag: 0.5, max: 40 }),
    dust: k.emitter({ frame: 'puff', curl: 30, drag: 1.5, below: true, max: 120 }),
    grit: k.emitter({ frame: 'flake', drag: 0.4, max: 60 }),
  }),
  tick(k, dt, { steam, sweat, stars, dust, grit }) {
    const s = k.f.type.scale;
    sweat.rate('sweat', (k.windingUp ? 6 : 1.4) + k.heat * 3, dt, () => {
      sweat.emit(CX - 90 + R() * 180, 120 + R() * 110, { vy: 20, life: 0.9, r0: 3.4 * s, r1: 2.6 * s, a: 0.75, tint: 0xe8f4ff, grav: 700, fade: 0.1 });
    });
    stars.rate('stars', 2.4 * calm(), dt, () => {
      const ang = R() * Math.PI * 2;
      const d = R() * ATLAS_SPHERE.r;
      stars.emit(ATLAS_SPHERE.x + Math.cos(ang) * d, ATLAS_SPHERE.y + Math.sin(ang) * d, { vx: pm() * 30, vy: -20 - R() * 30, life: 1.4 + R(), r0: 1.5 * s, r1: 4 * s, a: 0.95, tint: R() < 0.6 ? 0xfff2b0 : 0x9ab8ff, fade: 0.25 });
    });
    landDust(k, dust, 22, [0x9a7a5a, 0x7a5e44, 0xb8a080], 264, 120, 1.4);
    if (k.landed)
      for (let i = 0, n = k.burst(12); i < n; i++) grit.emit(CX + pm() * 200, 262, { vx: pm() * 420, vy: -200 - R() * 240, life: 0.9, r0: 4 * s, r1: 3 * s, a: 1, tint: R() < 0.5 ? 0x6a5444 : 0x8a7058, grav: 1000, spin: 9, fade: 0.02 });
    overheat(k, steam, dt, [CX - 90, 20, 180, 190]);
  },
});

// HYPERION: a corona of flame rays turns slowly behind him (two layers, counter-rotating, breathing), heat shimmers
// up off him, embers rise, and every few seconds a flare arcs off his edge and falls back. Landing throws sparks.
registerLive('hyperion', {
  wiggle: true,
  rig: { swing: 0.6, squash: 0.8, breath: 1.2 },
  glow: { rate: 0.5, depth: 0.3, base: 0.7 },
  heat: titanHeat,
  setup(k) {
    const art = k.f.type.art;
    const fire = art.primary ?? '#e8742a';
    const white = art.secondary ?? '#fff2a8';
    // soft art: drawn at half the foot's resolution and scaled up
    const res = footRes(k.f.type) * 0.5;
    const { x, y } = HYPERION_SUN;
    const big = 156;
    const keyA = designSheet(k, 'lk_hyperion_coronaA', [x - big, y - big, big * 2, big * 2], 1, res, (g) => corona(g, x, y, 78, 150, 20, 0, fire, white));
    const keyB = designSheet(k, 'lk_hyperion_coronaB', [x - big, y - big, big * 2, big * 2], 1, res, (g) => corona(g, x, y, 70, 124, 14, 0.2, '#ff5a10', white, 0.8));
    const a = rigImg(k, keyA, x, y + 6, 0.5, 0.5, true, res);
    const b = rigImg(k, keyB, x, y + 6, 0.5, 0.5, true, res);
    return {
      a,
      b,
      k0: 1 / res,
      flareT: 1 + R() * 2,
      steam: steamEm(k),
      embers: k.emitter({ frame: 'ember', add: true, curl: 70, drag: 0.5, max: 120 }),
      haze: k.emitter({ frame: 'soft', add: true, curl: 50, drag: 0.8, max: 50 }),
      sparks: k.emitter({ frame: 'spark', add: true, drag: 0.6, max: 60 }),
    };
  },
  tick(k, dt, s) {
    const sc = k.f.type.scale;
    const c = calm();
    s.a.rotation += dt * 0.12 * c * (1 + k.heat);
    s.b.rotation -= dt * 0.2 * c * (1 + k.heat);
    const pulse = Math.sin(k.t * 2.1) * 0.5 + 0.5;
    s.a.setScale(s.k0 * (1 + pulse * 0.05 * c));
    s.b.setAlpha(0.65 + pulse * 0.3);
    s.embers.rate('embers', 9 + k.heat * 10, dt, () => {
      s.embers.emit(CX + pm() * 190, 30 + R() * 200, { vx: pm() * 50, vy: -70 - R() * 90, life: 0.9 + R() * 0.8, r0: 3 * sc, r1: 1 * sc, a: 1, tint: R() < 0.5 ? 0xffd040 : 0xff7a1a, fade: 0.1 });
    });
    s.haze.rate('haze', 3 * c, dt, () => {
      s.haze.emit(CX + pm() * 120, 10 + R() * 60, { vx: pm() * 20, vy: -60 - R() * 40, life: 1.2, r0: 14 * sc, r1: 40 * sc, a: 0.12, tint: 0xffc060, fade: 0.3 });
    });
    // a solar flare: a loop of embers thrown off the edge that arcs over and falls back
    s.flareT -= dt;
    if (s.flareT <= 0) {
      s.flareT = 1.8 + R() * 2.2;
      const side = R() < 0.5 ? -1 : 1;
      const y0 = 60 + R() * 110;
      for (let i = 0, n = k.burst(16); i < n; i++) {
        const u = i / n;
        s.embers.emit(CX + side * (96 + u * 6), y0 + u * 10, { vx: side * (160 + u * 140), vy: -260 + u * 80, life: 0.9, r0: 5 * sc, r1: 1.5 * sc, a: 1, tint: u < 0.5 ? 0xfff2a8 : 0xff8a1a, grav: 520, fade: 0.05 });
      }
    }
    if (k.landed)
      for (let i = 0, n = k.burst(24); i < n; i++) s.sparks.emit(CX + pm() * 200, 258, { vx: pm() * 600, vy: -120 - R() * 300, life: 0.5 + R() * 0.3, r0: 8 * sc, r1: 2 * sc, a: 1, tint: R() < 0.5 ? 0xffe070 : 0xff7a1a, grav: 700, spin: 2, fade: 0.02 });
    overheat(k, s.steam, dt, [CX - 90, 10, 180, 190], 0xffe8c8, 12);
  },
});

// THE MINOTAUR: his red eyes blink and glare at your peel, he snorts steam out of both nostrils (and keeps snorting
// as he winds up to charge), the nose ring swings, and his hooves paw up dust and clods when he lands.
registerLive('minotaur', {
  rig: { swing: 0.8, squash: 0.9, breath: 1.6 },
  glow: { rate: 0.7, depth: 0.45, base: 0.4 },
  heat: {},
  blink: { eyes: { every: 3.2, look: 3 } },
  sway: { ring: { k: 48, c: 3.2, gain: 1.5, idle: 0.08, flop: 1.3 } },
  setup: (k) => ({
    snortT: 1 + R() * 2,
    steam: steamEm(k),
    snort: k.emitter({ frame: 'soft', curl: 50, drag: 1.6, max: 80 }),
    dust: k.emitter({ frame: 'puff', curl: 30, drag: 1.5, below: true, max: 120 }),
    clods: k.emitter({ frame: 'flake', drag: 0.4, max: 60 }),
  }),
  tick(k, dt, s) {
    const sc = k.f.type.scale;
    const puff = (strong: number) => {
      for (const [nx, ny] of MINO_NOSTRILS) {
        const side = nx < CX ? -1 : 1;
        for (let i = 0, n = k.burst(Math.round(4 * strong)); i < n; i++)
          s.snort.emit(nx + side * 4, ny + 4, { vx: side * (90 + R() * 120) * strong, vy: 40 + R() * 60, life: 0.6 + R() * 0.4, r0: 5 * sc, r1: (18 + strong * 10) * sc, a: 0.55, tint: 0xf4f6f8, fade: 0.05 });
      }
    };
    s.snortT -= dt;
    if (k.windingUp) {
      s.snort.rate('rage', 10, dt, () => puff(0.5));
    } else if (s.snortT <= 0) {
      s.snortT = 2.2 + R() * 2.4;
      puff(1);
    }
    landDust(k, s.dust, 20, [0x7a6450, 0x5e4a38, 0x9a8468], 276, 110, 1.3);
    if (k.landed)
      for (let i = 0, n = k.burst(12); i < n; i++) s.clods.emit(CX + pm() * 180, 272, { vx: pm() * 380, vy: -160 - R() * 260, life: 0.9, r0: 5 * sc, r1: 4 * sc, a: 1, tint: R() < 0.5 ? 0x4a3424 : 0x6a5038, grav: 1000, spin: 8, fade: 0.02 });
    overheat(k, s.steam, dt, [CX - 80, 10, 160, 170]);
  },
});

