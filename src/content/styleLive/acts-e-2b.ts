// How Medusa, Cerberus and Hades (batch acts-e, part 2b) move in play (src/game/liveKit.ts). Their art is in
// src/content/style/acts-e-2b.ts. All three overheat in their later phases (the heat layer, automatic for bosses,
// plus steam off them).
//
// - MEDUSA: her hair snakes are live sprites hung from the ankle: each writhes through its own cycle, flicks its
//   tongue, trails behind her moves on a spring, recoils when she lands and rears up as she winds up. Her eyes blink
//   and follow your peel, their glow breathes, a faint green gaze-dust drifts off them and stone grit falls from her
//   sole when she lands.
// - CERBERUS: a panting hound (big breath on the rig), the skull tag swings on its ring, the toes knead. Each paw
//   shows its temper (its badge from the fight): fire throws embers and flame licks at the claws, ice pours frost
//   mist and glittering flakes, poison drips green venom off the claws and bubbles. Dark smoke smoulders out of the
//   fur, and loose hairs fall.
// - HADES: blue fire licks up off his greave all the time (behind him and in front), flaring as he winds up, with
//   dark smoke above it; three lost souls orbit him; landing throws a ring of blue fire and soot. The bident and
//   the skull's sockets burn (glow layer); his toes twitch.

import Phaser from 'phaser';
import { CX } from '../../art/feetCommon';
import { type LiveFoot, registerLive } from '../../game/liveKit';
import { save } from '../../systems/save';
import { crand } from '../../systems/cosmeticRandom';
import { CERB_TOES, HADES_FIRE, MED_EYES, MED_SNAKES, SNAKE_FRAMES, hairSnakeFrame, snakeBox } from '../style/acts-e-2b';
import { landDust, overheat } from './bosses';

const R = () => crand();
const pm = () => crand() - 0.5;
const steamEm = (k: LiveFoot) => k.emitter({ frame: 'soft', curl: 60, drag: 1.1, max: 160 });
const calm = () => (save.settings.reducedMotion ? 0.35 : 1);

/** A damped spring (the snakes' own: they're sprites the live kit doesn't know about). */
class Spring {
  x = 0;
  v = 0;
  constructor(private k: number, private c: number) {}
  step(to: number, dt: number): number {
    const n = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      this.v += (-(this.x - to) * this.k - this.v * this.c) * h;
      this.x += this.v * h;
    }
    return this.x;
  }
}

// ════════════════════════════ MEDUSA ════════════════════════════

/** Texels per design unit for the snake sheets (they're small on screen; this keeps eight frames each cheap). */
const SNAKE_RES = 2;

interface Snake {
  img: Phaser.GameObjects.Image;
  base: number;
  side: number;
  spring: Spring;
  t: number;
  rate: number;
  sd: number;
}

registerLive('medusa', {
  wiggle: true,
  rig: { swing: 0.7, squash: 0.9, breath: 1.4 },
  blink: { eyes: { every: 3.2, look: 2.5 } },
  glow: { rate: 0.35, depth: 0.5, base: 0.4 },
  heat: {},
  setup(k) {
    const f = k.f;
    const ts = f.type.scale;
    const snakes: Snake[] = MED_SNAKES.map((sn, i) => {
      const box = snakeBox(sn);
      const key = k.sheet(`lk_medusa_snake${i}`, Math.ceil(box.w * SNAKE_RES), Math.ceil(box.h * SNAKE_RES), SNAKE_FRAMES, (ctx, fr) => {
        ctx.scale(SNAKE_RES, SNAKE_RES);
        ctx.translate(-box.x, -box.y);
        hairSnakeFrame(ctx, f.type.art, sn, fr);
      });
      const img = k.sc.add
        .image((sn.x - CX) * ts, (sn.y - f.meta.footHeight) * ts, key, 0)
        .setOrigin((sn.x - box.x) / box.w, (sn.y - box.y) / box.h)
        .setScale(ts / SNAKE_RES);
      f.addLiveArt(img, true);
      return { img, base: 0, side: sn.side, spring: new Spring(46 + i * 5, 4.5), t: R() * SNAKE_FRAMES, rate: 6 + R() * 3, sd: R() * 100 };
    });
    return {
      snakes,
      steam: steamEm(k),
      gaze: k.emitter({ frame: 'mote', add: true, curl: 20, drag: 1, max: 40 }),
      grit: k.emitter({ frame: 'flake', drag: 0.5, max: 60 }),
      dust: k.emitter({ frame: 'puff', curl: 30, drag: 1.5, below: true, max: 80 }),
      tt: 0,
    };
  },
  tick(k, dt, st) {
    const s = k.f.type.scale;
    const c = calm();
    st.tt += dt;
    const wind = k.windingUp ? 1 : 0;
    for (const sn of st.snakes) {
      // writhe: the cycle runs faster as she winds up
      sn.t += dt * sn.rate * (1 + wind * 1.2) * (0.5 + c * 0.5);
      sn.img.setFrame(Math.floor(sn.t) % SNAKE_FRAMES);
      // they trail behind her moves, flop down as she lands, and rear up (towards the top) as she winds up
      const idle = Math.sin(st.tt * 1.3 + sn.sd) * 0.07 + Math.sin(st.tt * 2.9 + sn.sd * 2) * 0.035;
      const push = Phaser.Math.Clamp(-k.vx * 0.0007, -0.35, 0.35);
      const rear = -sn.side * 0.22 * wind;
      if (k.landed) sn.spring.v += sn.side * 4.5 * c;
      sn.img.rotation = sn.spring.step((push + idle + rear) * c, dt);
    }
    // the stare's dust: green motes drifting off her eyes
    st.gaze.rate('gaze', 2.5 + wind * 6, dt, () => {
      const e = MED_EYES[R() < 0.5 ? 0 : 1];
      st.gaze.emit(e.x + pm() * 20, e.y + pm() * 8, { vx: pm() * 40, vy: -20 - R() * 30, life: 0.9 + R() * 0.6, r0: 5 * s, r1: 1.5 * s, a: 0.85, tint: R() < 0.6 ? 0x9dff6a : 0xe8ffb0, fade: 0.2 });
    });
    // landing: stone grit and dust off her gilded sole
    landDust(k, st.dust, 14, [0xa9a69c, 0x8a8880, 0xc8c4b8], 284, 110);
    if (k.landed)
      for (let i = 0, n = k.burst(10); i < n; i++)
        st.grit.emit(CX + pm() * 200, 282, { vx: pm() * 360, vy: -160 - R() * 200, life: 0.8, r0: 4 * s, r1: 3 * s, a: 1, tint: R() < 0.5 ? 0x9a978c : 0xc8c2b0, grav: 900, spin: 9, fade: 0.02 });
    overheat(k, st.steam, dt, [CX - 100, 20, 200, 220]);
  },
});

// ════════════════════════════ CERBERUS ════════════════════════════

type Temper = 'fire' | 'ice' | 'poison' | '';

/** Which temper a paw has: the fight hangs a temper badge on each paw's root (src/game/bosses/act9.ts). */
function temperOf(k: LiveFoot): Temper {
  for (const o of k.f.root.list) {
    const key = (o as Phaser.GameObjects.Image).texture?.key ?? '';
    if (key.startsWith('p9_temper_')) return key.slice(10) as Temper;
  }
  return '';
}

/** The claw tips at rest (design), where fire, frost and venom gather. */
const CLAW_TIPS: [number, number][] = CERB_TOES.map(([x, y, , ry, rot]) => [x - Math.sin(rot) * 14, y + ry + 18]);

registerLive('cerberus', {
  wiggle: true,
  rig: { swing: 1.1, squash: 1.2, breath: 2.2 },
  sway: { tag: { k: 50, c: 3.4, gain: 1.4, idle: 0.1, flop: 1.2 } },
  heat: {},
  setup: (k) => ({
    steam: steamEm(k),
    fx: k.emitter({ frame: 'ember', add: true, curl: 40, drag: 1.1, max: 160 }),
    mist: k.emitter({ frame: 'puff', curl: 30, drag: 1.2, below: true, max: 100 }),
    drip: k.emitter({ frame: 'drop', drag: 0.2, max: 40 }),
    bub: k.emitter({ frame: 'bubble', drag: 1.4, max: 30 }),
    smoke: k.emitter({ frame: 'puff', curl: 40, drag: 1.2, below: true, max: 80 }),
    hair: k.emitter({ frame: 'flake', drag: 0.9, max: 40 }),
    dust: k.emitter({ frame: 'puff', curl: 30, drag: 1.5, below: true, max: 80 }),
    temper: '' as Temper,
    look: 0,
  }),
  tick(k, dt, st) {
    const s = k.f.type.scale;
    st.look -= dt;
    if (!st.temper && st.look <= 0) {
      st.temper = temperOf(k);
      st.look = 0.5;
    }
    const tm = st.temper;
    const flare = k.windingUp ? 2.2 : 1;
    const claw = () => CLAW_TIPS[Math.floor(R() * CLAW_TIPS.length)];
    // every paw smoulders: dark smoke curling out of the fur
    st.smoke.rate('smoke', 3, dt, () => {
      st.smoke.emit(CX + pm() * 170, 60 + R() * 150, { vx: pm() * 30, vy: -40 - R() * 30, life: 1.4 + R() * 0.6, r0: 8 * s, r1: 30 * s, a: 0.22, tint: 0x2a2228, fade: 0.25 });
    });
    if (tm === 'fire' || tm === '') {
      st.fx.rate('ember', (tm ? 9 : 4) * flare, dt, () => {
        st.fx.emit(CX + pm() * 190, 80 + R() * 170, { vx: pm() * 50, vy: -90 - R() * 90, life: 0.8 + R() * 0.6, r0: 4 * s, r1: 1 * s, a: 1, tint: R() < 0.5 ? 0xffb040 : 0xff5a2a, fade: 0.1 });
      });
      if (tm)
        st.fx.rate('lick', 10 * flare, dt, () => {
          const [x, y] = claw();
          st.fx.emit(x + pm() * 10, y - 10, { vx: pm() * 30, vy: -120 - R() * 80, life: 0.35 + R() * 0.2, r0: 14 * s, r1: 3 * s, a: 0.8, tint: R() < 0.4 ? 0xffe080 : 0xff6a1a, fade: 0.05 });
        });
    }
    if (tm === 'ice' || tm === '') {
      st.mist.rate('frost', (tm ? 6 : 2) * flare, dt, () => {
        const [x, y] = claw();
        st.mist.emit(x + pm() * 20, y - 20, { vx: pm() * 40, vy: 20 + R() * 30, life: 1.2 + R() * 0.6, r0: 8 * s, r1: 32 * s, a: 0.35, tint: R() < 0.5 ? 0xcfefff : 0x9ad8ff, fade: 0.2 });
      });
      if (tm)
        st.fx.rate('flake', 5 * flare, dt, () => {
          st.fx.emit(CX + pm() * 200, 120 + R() * 160, { vx: pm() * 30, vy: 20 + R() * 30, life: 1 + R() * 0.5, r0: 3 * s, r1: 1 * s, a: 0.9, tint: 0xe8f8ff, fade: 0.2 });
        });
    }
    if (tm === 'poison' || tm === '') {
      st.drip.rate('venom', (tm ? 2.6 : 0.8) * flare, dt, () => {
        const [x, y] = claw();
        st.drip.emit(x, y, { vx: pm() * 10, vy: 30, life: 0.9, r0: 5 * s, r1: 4 * s, a: 0.95, tint: R() < 0.5 ? 0x7be04a : 0xa8f07a, grav: 700, fade: 0.05 });
      });
      if (tm)
        st.bub.rate('bub', 3 * flare, dt, () => {
          st.bub.emit(CX + pm() * 180, 140 + R() * 120, { vx: pm() * 20, vy: -30 - R() * 30, life: 0.8 + R() * 0.5, r0: 3 * s, r1: 7 * s, a: 0.75, tint: 0x9cff6a, fade: 0.2 });
        });
    }
    st.hair.rate('hair', 1.6, dt, () => {
      st.hair.emit(CX + pm() * 200, 60 + R() * 160, { vx: pm() * 30, vy: 10 + R() * 20, life: 1.6 + R(), r0: 3 * s, r1: 2.2 * s, a: 0.85, tint: R() < 0.5 ? 0x2a2228 : 0x4a3a40, grav: 30, spin: 3, fade: 0.08 });
    });
    landDust(k, st.dust, 16, [0x3a3036, 0x5a4a44, 0x2a2024], 290, 110, 1.2);
    overheat(k, st.steam, dt, [CX - 100, 40, 200, 200]);
  },
});

// ════════════════════════════ HADES ════════════════════════════

const BLUES = [0x4fb8ff, 0x7fd8ff, 0x1d7ad8, 0xbff0ff];

registerLive('hades', {
  wiggle: true,
  rig: { swing: 0.6, squash: 0.7, breath: 1.2 },
  glow: { rate: 0.5, depth: 0.45, base: 0.55 },
  heat: {},
  setup(k) {
    const key = k.sheet('lk_soulwisp', 48, 48, 1, (ctx) => {
      const g = ctx.createRadialGradient(24, 24, 0, 24, 24, 22);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.25, 'rgba(190,240,255,0.9)');
      g.addColorStop(0.6, 'rgba(80,170,255,0.3)');
      g.addColorStop(1, 'rgba(40,100,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 48, 48);
    });
    return {
      souls: k.swarm({ key, frames: 1, count: 3, at: [CX, 110], rx: 170, ry: 150, speed: 0.7, jitter: 26, scale: 0.85 }),
      back: k.emitter({ frame: 'ember', add: true, curl: 50, drag: 1, below: true, max: 220 }),
      front: k.emitter({ frame: 'ember', add: true, curl: 40, drag: 1.2, max: 120 }),
      smoke: k.emitter({ frame: 'puff', curl: 40, drag: 1.1, below: true, max: 100 }),
      ring: k.emitter({ frame: 'soft', add: true, drag: 2.4, max: 60 }),
      dust: k.emitter({ frame: 'puff', curl: 30, drag: 1.5, below: true, max: 80 }),
      steam: steamEm(k),
    };
  },
  tick(k, dt, { back, front, smoke, ring, dust, steam }) {
    const s = k.f.type.scale;
    const pow = 1 + (k.windingUp ? 1.1 : 0) + k.heat * 0.8;
    // the fire behind him: tall tongues off both sides of the greave
    back.rate('back', 34 * pow, dt, () => {
      const [x, y] = HADES_FIRE[Math.floor(R() * HADES_FIRE.length)];
      back.emit(x + pm() * 24, y + pm() * 30, { vx: (x - CX) * 0.5 + pm() * 40, vy: -170 - R() * 170, life: 0.45 + R() * 0.35, r0: 26 * s, r1: 5 * s, a: 0.85, tint: BLUES[Math.floor(R() * BLUES.length)], fade: 0.06 });
    });
    // small licks in front, along the greave's edges and the sole's rim
    front.rate('front', 10 * pow, dt, () => {
      const side = R() < 0.5 ? -1 : 1;
      const y = 30 + R() * 160;
      front.emit(CX + side * (64 + (y / 190) * 30), y, { vx: side * 20, vy: -120 - R() * 90, life: 0.3 + R() * 0.2, r0: 12 * s, r1: 2 * s, a: 0.8, tint: R() < 0.4 ? 0xe8fbff : 0x7fd8ff, fade: 0.08 });
    });
    smoke.rate('smoke', 5 * pow, dt, () => {
      smoke.emit(CX + pm() * 220, -20 + R() * 90, { vx: pm() * 30, vy: -60 - R() * 40, life: 1.4 + R() * 0.6, r0: 10 * s, r1: 36 * s, a: 0.24, tint: R() < 0.5 ? 0x1a1828 : 0x2a2440, fade: 0.25 });
    });
    if (k.landed) {
      for (let i = 0, n = k.burst(22); i < n; i++) {
        const side = R() < 0.5 ? -1 : 1;
        ring.emit(CX + side * R() * 100, 284, { vx: side * (160 + R() * 320), vy: -30 - R() * 60, life: 0.6 + R() * 0.3, r0: 16 * s, r1: 4 * s, a: 0.9, tint: BLUES[Math.floor(R() * BLUES.length)], fade: 0.05 });
      }
    }
    landDust(k, dust, 14, [0x1a1828, 0x2a2838, 0x3a3848], 286, 110);
    overheat(k, steam, dt, [CX - 100, 0, 200, 200], 0xdff4ff);
  },
});
