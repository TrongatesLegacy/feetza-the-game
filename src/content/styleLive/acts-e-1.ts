// How the Act 9 feet and the Kratos Peel's two feet of batch acts-e (part 1) move in play (src/game/liveKit.ts).
// Their art is in src/content/style/acts-e-1.ts.

import type Phaser from 'phaser';
import { CX } from '../../art/feetCommon';
import { footRes } from '../../art/feetArt';
import { type LiveFoot, registerLive } from '../../game/liveKit';
import type { Foot } from '../../game/Foot';
import { crand } from '../../systems/cosmeticRandom';
import { save } from '../../systems/save';
import { landDust } from './bosses';
import { HARPY_WINGS, SATYR_PIPE, SIREN_FINS, harpyWing } from '../style/acts-e-1';

const R = () => crand();
const pm = () => crand() - 0.5;
const calm = () => (save.settings.reducedMotion ? 0.35 : 1);

/** A music note texture (♪ and ♫), white so it can be tinted. */
function noteSheet(k: LiveFoot): string {
  return k.sheet('lk_ae1_note', 44, 52, 2, (ctx, i) => {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(40,24,16,0.85)';
    ctx.lineWidth = 3;
    const head = (x: number, y: number) => {
      ctx.beginPath();
      ctx.ellipse(x, y, 8, 6, -0.45, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fill();
    };
    if (i === 0) {
      ctx.fillRect(22, 8, 4, 32);
      ctx.strokeRect(22, 8, 4, 32);
      ctx.beginPath();
      ctx.moveTo(26, 8);
      ctx.quadraticCurveTo(40, 16, 34, 30);
      ctx.quadraticCurveTo(36, 18, 26, 18);
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
      head(17, 40);
    } else {
      ctx.fillRect(12, 12, 4, 28);
      ctx.fillRect(32, 6, 4, 28);
      ctx.beginPath();
      ctx.moveTo(12, 12);
      ctx.lineTo(36, 6);
      ctx.lineTo(36, 13);
      ctx.lineTo(12, 19);
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
      ctx.fillRect(12, 12, 4, 28);
      ctx.fillRect(32, 6, 4, 28);
      head(9, 41);
      head(29, 35);
    }
  });
}

/** A note floats up off the foot from a design point, sways and fades (world space: it stays behind as the foot moves). */
function floatNote(k: LiveFoot, key: string, dx: number, dy: number, tint: number): void {
  const f = k.f;
  const layer = f.root.parentContainer;
  if (!layer) return;
  const [wx, wy] = f.styleWorld(dx, dy);
  const s = (0.55 + R() * 0.35) * Math.min(1.3, f.type.scale);
  const img = k.sc.add.image(wx, wy, key, R() < 0.5 ? 0 : 1).setTint(tint).setScale(s * 0.6).setAlpha(0).setAngle(pm() * 30);
  layer.add(img);
  const drift = pm() * 70;
  k.sc.tweens.add({ targets: img, y: wy - 90 - R() * 60, duration: 1500 + R() * 600, ease: 'Sine.Out' });
  k.sc.tweens.add({ targets: img, x: wx + drift, angle: img.angle + pm() * 40, scale: s, duration: 1700, ease: 'Sine.InOut' });
  k.sc.tweens.add({ targets: img, alpha: { from: 0, to: 0.95 }, duration: 260, yoyo: true, hold: 900, onComplete: () => img.destroy() });
}

/** An image on the foot's rig at a design point (it swings and squashes with the foot), from a texture drawn at
 * res texels per design unit × the foot's scale. */
function rigImage(f: Foot, key: string, dx: number, dy: number, ox: number, oy: number, below: boolean): Phaser.GameObjects.Image {
  const ts = f.type.scale;
  const img = f.scene.add.image((dx - CX) * ts, (dy - f.meta.footHeight) * ts, key).setOrigin(ox, oy).setScale(1 / footRes(f.type));
  f.addLiveArt(img, below);
  return img;
}

// ——— Satyr Hooves ———
// The pan pipe swings off the vine; notes drift off it (a little run of them as it crouches to hop), and its hooves
// tap while it waits (the hoof halves bob) and kick up dust when they land.
registerLive('satyr', {
  wiggle: true,
  rig: { swing: 1.2, squash: 1.2 },
  sway: { pipe: { k: 46, c: 3.6, gain: 1.6, idle: 0.14, flop: 1.3 } },
  setup: (k) => ({ note: noteSheet(k), dust: k.emitter({ frame: 'puff', curl: 30, drag: 1.6, below: true, max: 60 }), hair: k.emitter({ frame: 'flake', drag: 1, max: 30 }), tune: { t: 1 + R() * 2, crouched: false } }),
  tick(k, dt, { note, dust, hair, tune }) {
    const f = k.f;
    const s = f.type.scale;
    tune.t -= dt;
    const crouch = !!f.brain.crouched;
    if (crouch && !tune.crouched) for (let i = 0; i < 3; i++) k.sc.time.delayedCall(i * 110, () => f.alive && floatNote(k, note, SATYR_PIPE.x - 10 + i * 8, SATYR_PIPE.y + 10, 0xf6ecc8));
    tune.crouched = crouch;
    if (tune.t <= 0) {
      tune.t = 1.6 + R() * 2.2;
      if (f.state === 'hover') floatNote(k, note, SATYR_PIPE.x, SATYR_PIPE.y + 12, 0xf6ecc8);
    }
    landDust(k, dust, 10, [0x9a8466, 0x7a6448, 0xb8a080], 262, 90);
    hair.rate('hair', 1.2 + Math.min(4, Math.abs(k.vx) / 160), dt, () => {
      hair.emit(CX + pm() * 170, 60 + R() * 100, { vx: pm() * 30, vy: 10, life: 1.4, r0: 2.6 * s, r1: 2 * s, a: 0.9, tint: R() < 0.5 ? 0x5a3e24 : 0x8a6a46, grav: 40, spin: 3, fade: 0.1 });
    });
  },
});

// ——— Cyclops Sandals ———
// The one eye follows your peel and blinks now and then; the toes flex; a heavy landing throws up dust.
registerLive('cyclops', {
  wiggle: true,
  rig: { swing: 0.7, squash: 0.85, breath: 1.2 },
  blink: { iris: { every: 1e6, look: 4 }, lids: { every: 3.2 } },
  setup: (k) => ({ dust: k.emitter({ frame: 'puff', curl: 30, drag: 1.5, below: true, max: 80 }) }),
  tick(k, _dt, { dust }) {
    landDust(k, dust, 14, [0xa89070, 0x8a7458], 278, 110, 1.1);
  },
});

// ——— Harpy Talons ———
// Its wings beat slowly while it hovers, hard as it dives and as it flies off; feathers drift off as they beat and the
// talons flex.
registerLive('harpy', {
  wiggle: true,
  rig: { swing: 1.3, squash: 1.1 },
  setup(k) {
    const f = k.f;
    const res = footRes(f.type);
    const S = f.type.scale * res;
    const violet = f.type.art.primary ?? '#5a4a6a';
    const gold = f.type.art.secondary ?? '#c9a23a';
    const wings = [-1, 1].map((side) => {
      const key = k.sheet(`lk_ae1_harpywing${side}`, Math.ceil(170 * S), Math.ceil(190 * S), 1, (ctx) => {
        ctx.scale(S, S);
        ctx.translate(side < 0 ? 152 : 18, 70);
        // the same colour mix the still art uses
        harpyWing(ctx, side, mixHex(violet, '#a090c0', 0.3), gold);
      });
      const [wx, wy] = HARPY_WINGS[side < 0 ? 0 : 1];
      return { side, img: rigImage(f, key, wx, wy, side < 0 ? 152 / 170 : 18 / 170, 70 / 190, true), ph: R() * 6 };
    });
    return { wings, feathers: k.emitter({ frame: 'flake', drag: 1.4, curl: 40, max: 40 }), dust: k.emitter({ frame: 'puff', curl: 30, drag: 1.6, below: true, max: 40 }) };
  },
  tick(k, dt, { wings, feathers, dust }) {
    const f = k.f;
    const s = f.type.scale;
    const fast = f.state === 'descend' || k.windingUp || f.state === 'lift';
    const rate = (fast ? 7.5 : 2.2) * (save.settings.reducedMotion ? 0.5 : 1);
    const amp = (fast ? 0.42 : 0.16) * calm();
    for (const w of wings) {
      w.ph += dt * rate * Math.PI * 2;
      const beat = Math.sin(w.ph);
      w.img.setRotation(w.side * (0.12 + amp * beat));
      w.img.scaleX = (1 / footRes(f.type)) * (0.9 + 0.1 * Math.cos(w.ph));
    }
    feathers.rate('feather', fast ? 6 : 0.8, dt, () => {
      const side = R() < 0.5 ? -1 : 1;
      feathers.emit(CX + side * (60 + R() * 90), 40 + R() * 90, { vx: side * (30 + R() * 50), vy: 20 + R() * 30, life: 1.8 + R(), r0: 5 * s, r1: 4 * s, a: 0.95, tint: R() < 0.7 ? 0x6a5a82 : 0xc9a23a, grav: 30, spin: 4, fade: 0.05 });
    });
    landDust(k, dust, 8, [0xb8a88a, 0x9a8a70], 292, 70);
  },
});

/** Mix two #rrggbb colours (live textures only). */
function mixHex(a: string, b: string, t: number): string {
  const p = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  const c = [0, 1, 2].map((i) => Math.round(p(a, i) + (p(b, i) - p(a, i)) * t).toString(16).padStart(2, '0'));
  return `#${c.join('')}`;
}

// ——— Titan Toes ———
// Grit and pebbles crumble off it as it moves, moss flakes drift down, and every stomp shakes up a cloud of dust and
// a spray of gravel.
registerLive('titantoes', {
  wiggle: true,
  rig: { swing: 0.45, squash: 0.55, breath: 1.4 },
  setup: (k) => ({ grit: k.emitter({ frame: 'flake', drag: 0.4, max: 80 }), dust: k.emitter({ frame: 'puff', curl: 30, drag: 1.4, below: true, max: 120 }) }),
  tick(k, dt, { grit, dust }) {
    const f = k.f;
    const s = f.type.scale;
    const rising = f.state === 'lift' ? 6 : f.state === 'hover' ? 1.4 : 0.6;
    grit.rate('grit', rising, dt, () => {
      grit.emit(CX + pm() * 190, 40 + R() * 200, { vx: pm() * 40, vy: 10, life: 1.4, r0: (2.5 + R() * 3) * s, r1: 2.5 * s, a: 1, tint: R() < 0.5 ? 0x8a7a6a : 0x5a4e44, grav: 900, spin: 6, fade: 0.02 });
    });
    grit.rate('moss', 0.5, dt, () => {
      grit.emit(CX + pm() * 160, 60 + R() * 120, { vx: pm() * 20, vy: 5, life: 2.2, r0: 3 * s, r1: 2.4 * s, a: 0.9, tint: 0x6f9a3a, grav: 60, spin: 2, fade: 0.1 });
    });
    landDust(k, dust, 22, [0x9a8a7a, 0x7a6a5e, 0xb8a898], 266, 120, 1.4);
    if (k.landed)
      for (let i = 0, n = k.burst(14); i < n; i++) grit.emit(CX + pm() * 200, 262, { vx: pm() * 460, vy: -220 - R() * 260, life: 1, r0: (3 + R() * 3) * s, r1: 3 * s, a: 1, tint: R() < 0.5 ? 0x6a5a4e : 0x9a8a7a, grav: 1100, spin: 9, fade: 0.02 });
  },
});

// ——— Skeleton Hoplite ———
// Its toe bones rattle while it waits, the horsehair crest sways, light glints off the shield's rim, and cold
// underworld wisps curl off its bones.
registerLive('hoplite', {
  wiggle: true,
  rig: { swing: 1, squash: 0.9 },
  sway: { crest: { k: 40, c: 3.4, gain: 1.4, idle: 0.12, flop: 1.2 } },
  setup: (k) => ({ glint: k.emitter({ frame: 'spark', add: true, drag: 0, max: 12 }), wisp: k.emitter({ frame: 'soft', curl: 40, drag: 0.8, add: true, max: 40 }), dust: k.emitter({ frame: 'puff', curl: 30, drag: 1.6, below: true, max: 40 }) }),
  tick(k, dt, { glint, wisp, dust }) {
    const s = k.f.type.scale;
    glint.rate('rim', 1.1, dt, () => {
      // (light off the shield's rim, while it's up in front: src/game/guardShield.ts)
      if (!k.f.guardUp) return;
      const a = Math.PI * (1.0 + R() * 0.6);
      glint.emit(CX + Math.cos(a) * 72, 150 + Math.sin(a) * 72, { life: 0.35, r0: 12 * s, r1: 1 * s, a: 0.95, tint: 0xfff0c0, spin: 2, fade: 0.3 });
    });
    wisp.rate('wisp', 3, dt, () => {
      wisp.emit(CX + pm() * 170, 230 + R() * 40, { vx: pm() * 20, vy: -20 - R() * 30, life: 1.6 + R(), r0: 6 * s, r1: 22 * s, a: 0.22, tint: R() < 0.5 ? 0x5ae0c8 : 0x6a8aff, fade: 0.3 });
    });
    landDust(k, dust, 8, [0xb8b0a0, 0x8a8478], 266, 90);
  },
});

// ——— Siren Slippers ———
// The fins sway as it moves; notes of its song drift off it (faster while it pulls your peel), water drips off the
// slipper's scalloped hem and the odd bubble rises.
registerLive('siren', {
  wiggle: true,
  rig: { swing: 1.1 },
  sway: {
    finL: { k: 52, c: 3.8, gain: 1.5, idle: 0.14, flop: 1.2 },
    finR: { k: 50, c: 3.6, gain: 1.5, idle: 0.14, flop: 1.2 },
  },
  setup: (k) => ({ note: noteSheet(k), song: { t: R() }, drips: k.emitter({ frame: 'drop', drag: 0.2, max: 20 }), bubbles: k.emitter({ frame: 'bubble', curl: 40, drag: 0.8, max: 16 }), glint: k.emitter({ frame: 'spark', add: true, drag: 0, max: 10 }) }),
  tick(k, dt, { note, song, drips, bubbles, glint }) {
    const f = k.f;
    const s = f.type.scale;
    song.t -= dt;
    if (song.t <= 0 && f.state !== 'stomp') {
      song.t = f.state === 'hover' ? 0.55 + R() * 0.5 : 1.2 + R();
      const side = R() < 0.5 ? 0 : 1;
      floatNote(k, note, SIREN_FINS[side][0] + (side ? 20 : -20), SIREN_FINS[side][1] - 10, R() < 0.6 ? 0x9af0e8 : 0xfff4fa);
    }
    drips.rate('drip', 1.4, dt, () => {
      drips.emit(CX - 110 + R() * 220, 176, { vy: 30, life: 0.9, r0: 4 * s, r1: 3 * s, a: 0.85, tint: 0xbff4f0, grav: 800, fade: 0.05 });
    });
    bubbles.rate('bubble', 0.7, dt, () => {
      bubbles.emit(CX + pm() * 180, 100 + R() * 100, { vx: pm() * 10, vy: -40 - R() * 30, life: 1.6, r0: 3 * s, r1: 6 * s, a: 0.6, tint: 0xcff8ff, fade: 0.2 });
    });
    glint.rate('pearl', 1, dt, () => {
      glint.emit(CX - 80 + R() * 170, 40 + R() * 110, { life: 0.3, r0: 8 * s, r1: 1, a: 0.9, tint: 0xffffff, spin: 2, fade: 0.3 });
    });
  },
});

// ——— Gorgon Snake ———
// It sways and weaves (loose on its rig), its tongue flicks, and the light runs along its scales.
registerLive('gorgonsnake', {
  rig: { swing: 1.8, squash: 1.3, breath: 1.6 },
  twitch: { tongue: { every: 1.4 } },
  setup: (k) => ({ glint: k.emitter({ frame: 'spark', add: true, drag: 0, max: 8 }) }),
  tick(k, dt, { glint }) {
    glint.rate('scale', 0.9, dt, () => {
      glint.emit(CX + pm() * 100, 20 + R() * 200, { life: 0.3, r0: 8 * k.f.type.scale, r1: 1, a: 0.8, tint: 0xf0ffb0, spin: 2, fade: 0.3 });
    });
  },
});

// ——— Persian Elephant Feet ———
// The caparison's gold tassels swing; gold glints along the embroidery; it's heavy, so every stomp throws a wide ring
// of dust.
registerLive('elephant', {
  rig: { swing: 0.5, squash: 0.6, breath: 1.3 },
  sway: {
    tassel0: { k: 38, c: 3.2, gain: 1.6, idle: 0.12, flop: 1.4 },
    tassel1: { k: 36, c: 3, gain: 1.6, idle: 0.12, flop: 1.4 },
  },
  setup: (k) => ({ glint: k.emitter({ frame: 'spark', add: true, drag: 0, max: 12 }), dust: k.emitter({ frame: 'puff', curl: 30, drag: 1.4, below: true, max: 100 }) }),
  tick(k, dt, { glint, dust }) {
    const s = k.f.type.scale;
    glint.rate('gold', 1.6, dt, () => {
      glint.emit(CX - 70 + R() * 140, 10 + R() * 60, { life: 0.35, r0: 9 * s, r1: 1, a: 0.95, tint: 0xfff0b0, spin: 2, fade: 0.3 });
    });
    landDust(k, dust, 20, [0xa89070, 0x8a7458, 0xc8b090], 262, 110, 1.3);
  },
});

// ——— Spartan Sandals ———
// The red cloak swings behind its moves, bronze glints on the greave, it marches up dust; once it rages it seethes
// with a red heat haze.
registerLive('spartan', {
  wiggle: true,
  rig: { swing: 1.1, squash: 1.1 },
  sway: { cloak: { k: 34, c: 3.2, gain: 2, idle: 0.14, flop: 1.4 } },
  setup: (k) => ({ glint: k.emitter({ frame: 'spark', add: true, drag: 0, max: 10 }), dust: k.emitter({ frame: 'puff', curl: 30, drag: 1.6, below: true, max: 50 }), rage: k.emitter({ frame: 'soft', curl: 60, drag: 1, add: true, max: 60 }) }),
  tick(k, dt, { glint, dust, rage }) {
    const f = k.f;
    const s = f.type.scale;
    glint.rate('bronze', 1.2, dt, () => {
      glint.emit(CX - 50 + R() * 50, 10 + R() * 60, { life: 0.35, r0: 10 * s, r1: 1, a: 0.95, tint: 0xfff0c0, spin: 2, fade: 0.3 });
    });
    landDust(k, dust, 8, [0xb8a88a, 0x9a8a70], 258, 90);
    if (f.brain.raged)
      rage.rate('rage', 12, dt, () => {
        rage.emit(CX + pm() * 180, 40 + R() * 200, { vx: pm() * 30, vy: -60 - R() * 50, life: 0.8 + R() * 0.4, r0: 6 * s, r1: 22 * s, a: 0.35, tint: R() < 0.5 ? 0xff3a1a : 0xff7a2a, fade: 0.2 });
      });
  },
});
