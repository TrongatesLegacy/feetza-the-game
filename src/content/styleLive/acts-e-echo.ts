// How the Act 10 echoes move in play (src/game/liveKit.ts); their art is in src/content/style/acts-e-echo.ts.
// Every echo: the tears and dead pixels flicker (the glow layer), loose pixels in its glitch colour pop off it and
// smear sideways as it moves, and every couple of seconds a burst of red and cyan tear lines flashes across it
// (on top of the finale's GLSL glitch on the art). Each also keeps a touch of the feet it's made of. No toe rig:
// the finale's glitch pass rides the foot's one art image, so the whole echo glitches as one.

import { CX } from '../../art/feetCommon';
import { type LiveFoot, type WorldEmitter, registerLive } from '../../game/liveKit';
import { crand } from '../../systems/cosmeticRandom';
import { landDust } from './bosses';

const R = () => crand();
const pm = () => crand() - 0.5;

const hex = (s: string) => parseInt(s.slice(1), 16);

interface EchoFx {
  pix: WorldEmitter;
  tear: WorldEmitter;
  extra: WorldEmitter;
  burst: number;
  next: number;
  glitch: number;
  was: { phased: boolean };
}

function echoSetup(k: LiveFoot, extra: Parameters<LiveFoot['emitter']>[0]): EchoFx {
  const g = String(k.f.type.art.extra?.glitch ?? '#ff3df0');
  return {
    pix: k.emitter({ frame: 'mote', add: true, drag: 3.2, max: 60 }),
    tear: k.emitter({ frame: 'spark', add: true, drag: 0, max: 30 }),
    extra: k.emitter(extra),
    burst: 0,
    next: 0.6 + R() * 1.6,
    glitch: hex(g),
    was: { phased: false },
  };
}

/** The glitch every echo shares. Returns false while the echo is phased out (nothing else should show). */
function echoTick(k: LiveFoot, dt: number, s: EchoFx): boolean {
  const f = k.f;
  // a phasing echo fades its whole live layer with the art (Foot fades only the art and the leg)
  if (f.phased) f.setVisualAlpha(0.18 + Math.sin(f.age * 30) * 0.06);
  else if (s.was.phased) f.setVisualAlpha(1);
  s.was.phased = f.phased;
  if (f.phased) return false;
  const sc = f.type.scale;
  const cy = k.style.contactY ?? 260;
  // loose pixels pop off the edges and smear the way it's moving
  const speed = Math.min(1, Math.hypot(k.vx, k.vy) / 600);
  s.pix.rate('px', 5 + speed * 22, dt, () => {
    const side = R() < 0.5 ? -1 : 1;
    s.pix.emit(CX + side * (40 + R() * 60), 20 + R() * (cy - 40), {
      vx: side * (60 + R() * 140) - k.vx * 0.25,
      vy: pm() * 20,
      life: 0.25 + R() * 0.3,
      r0: (4 + R() * 4) * sc,
      r1: 2 * sc,
      a: 0.95,
      tint: R() < 0.7 ? s.glitch : R() < 0.5 ? 0xff2d6f : 0x2de1ff,
      fade: 0.05,
    });
  });
  // bursts of torn scanlines in red and cyan
  s.next -= dt;
  if (s.next <= 0) {
    s.next = 1.2 + R() * 2.4;
    s.burst = 0.2;
  }
  if (s.burst > 0) {
    s.burst -= dt;
    s.tear.rate('tear', 60, dt, () => {
      const y = 10 + R() * (cy - 20);
      s.tear.emit(CX + pm() * 60, y, { vx: pm() * 300, life: 0.12 + R() * 0.08, r0: (60 + R() * 70) * sc, r1: (50 + R() * 40) * sc, a: 0.75, tint: R() < 0.4 ? 0xff2d6f : R() < 0.66 ? 0x2de1ff : s.glitch, fade: 0.02 });
    });
  }
  return true;
}

// ECHO ROLLERBOT (robot + roller skates): skate sparks spray off the sole as it weaves, and on landing.
registerLive<EchoFx>('echobot', {
  rig: { swing: 1.2, squash: 0.8 },
  glow: { rate: 2.6, depth: 0.5, base: 0.4 },
  setup: (k) => echoSetup(k, { frame: 'spark', add: true, drag: 1.5, max: 60 }),
  tick(k, dt, s) {
    if (!echoTick(k, dt, s)) return;
    const sc = k.f.type.scale;
    const n = Math.abs(k.vx) > 120 ? 14 : 0;
    s.extra.rate('skate', n, dt, () => {
      s.extra.emit(CX + pm() * 120, 252, { vx: -Math.sign(k.vx) * (120 + R() * 200), vy: -60 - R() * 120, life: 0.3, r0: 10 * sc, r1: 2 * sc, a: 1, tint: R() < 0.5 ? 0xff4fa3 : 0x33e1ff, grav: 600, fade: 0.05 });
    });
    if (k.landed)
      for (let i = 0, m = k.burst(14); i < m; i++)
        s.extra.emit(CX + pm() * 160, 256, { vx: pm() * 520, vy: -100 - R() * 200, life: 0.35, r0: 12 * sc, r1: 2 * sc, a: 1, tint: R() < 0.5 ? 0xff4fa3 : 0x33e1ff, grav: 700, fade: 0.05 });
  },
});

// ECHO PHANTOM FLIPPER (ghost + flipper): cold mist pours off it and sea water drips from the flipper bands; it all
// fades with it while it's phased out.
registerLive<EchoFx>('echoghost', {
  rig: { swing: 1.1, breath: 1.6 },
  glow: { rate: 1.8, depth: 0.5, base: 0.4 },
  setup: (k) => echoSetup(k, { frame: 'soft', curl: 40, drag: 1.2, below: true, max: 80 }),
  tick(k, dt, s) {
    if (!echoTick(k, dt, s)) return;
    const sc = k.f.type.scale;
    s.extra.rate('mist', 7, dt, () => {
      s.extra.emit(CX + pm() * 200, 140 + R() * 110, { vx: pm() * 30, vy: 10 + R() * 25, life: 1.4 + R() * 0.6, r0: 10 * sc, r1: 34 * sc, a: 0.22, tint: R() < 0.5 ? 0xcfe9ff : 0x7df9ff, fade: 0.2 });
    });
    s.extra.rate('drip', 2.5, dt, () => {
      s.extra.emit(CX + pm() * 190, 250, { vy: 40, life: 0.7, r0: 5 * sc, r1: 4 * sc, a: 0.7, tint: 0x18b5c9, grav: 700, fade: 0.05 });
    });
  },
});

// ECHO JETPACK COWBOY (cowboy boot + jetpack): the thrusters flare from under the heel before a real dive (a dip
// without the flare is a fake), puff on every hop, and kick up trail dust on landing.
registerLive<EchoFx & { dust?: WorldEmitter }>('echocowboy', {
  rig: { swing: 1.1, squash: 1 },
  glow: { rate: 2.2, depth: 0.5, base: 0.4 },
  setup: (k) => ({ ...echoSetup(k, { frame: 'ember', add: true, drag: 1.6, max: 90 }), dust: k.emitter({ frame: 'puff', curl: 30, drag: 1.6, below: true, max: 60 }) }),
  tick(k, dt, s) {
    if (!echoTick(k, dt, s)) return;
    const sc = k.f.type.scale;
    const f = k.f;
    const flare = k.windingUp ? 1 : f.state === 'descend' ? 0.6 : 0.12;
    s.extra.rate('jet', 40 * flare, dt, () => {
      const side = R() < 0.5 ? -1 : 1;
      s.extra.emit(CX + side * (64 + R() * 10), 240, { vx: side * 20 + pm() * 30, vy: 260 + R() * 160, life: 0.25 + R() * 0.15, r0: (12 + flare * 10) * sc, r1: 3 * sc, a: 0.95, tint: R() < 0.5 ? 0x7df9ff : 0xffd23f, fade: 0.05 });
    });
    if (s.dust) landDust(k, s.dust, 12, [0xc8a878, 0xa88a60], 268, 90);
  },
});

// ECHO KNIGHT CLOWN (clown shoe + armour): the armour clanks sparks on every stomp (it stomps twice), a little
// confetti pops with them.
registerLive<EchoFx & { bits?: WorldEmitter }>('echoclown', {
  rig: { squash: 1.4, swing: 0.8 },
  glow: { rate: 2.4, depth: 0.5, base: 0.4 },
  setup: (k) => ({ ...echoSetup(k, { frame: 'spark', add: true, drag: 1.2, max: 60 }), bits: k.emitter({ frame: 'flake', drag: 1.3, max: 80 }) }),
  tick(k, dt, s) {
    if (!echoTick(k, dt, s)) return;
    const sc = k.f.type.scale;
    if (k.landed) {
      for (let i = 0, m = k.burst(12); i < m; i++)
        s.extra.emit(CX + pm() * 240, 250 + R() * 20, { vx: pm() * 600, vy: -120 - R() * 260, life: 0.35, r0: 12 * sc, r1: 2 * sc, a: 1, tint: R() < 0.6 ? 0xfff2c0 : 0xff5a3c, grav: 800, fade: 0.04 });
      if (s.bits)
        for (let i = 0, m = k.burst(16); i < m; i++)
          s.bits.emit(CX + pm() * 200, 240, { vx: pm() * 420, vy: -160 - R() * 260, life: 1 + R() * 0.6, r0: 5 * sc, r1: 4 * sc, a: 1, tint: [0xe5242f, 0xffd400, 0x2fa3ff, 0xffffff][Math.floor(R() * 4)], grav: 520, spin: 10, fade: 0.02 });
    }
  },
});

// ECHO DINO HOPLITE (dino claw + skeleton greave): underworld wisps curl off it, the ground cracks up dust and grit
// when it lands.
registerLive<EchoFx & { grit?: WorldEmitter }>('echodino', {
  rig: { swing: 0.9, squash: 0.9, breath: 1.3 },
  glow: { rate: 2, depth: 0.5, base: 0.4 },
  setup: (k) => ({ ...echoSetup(k, { frame: 'puff', curl: 30, drag: 1.5, below: true, max: 80 }), grit: k.emitter({ frame: 'flake', drag: 0.4, max: 50 }) }),
  tick(k, dt, s) {
    if (!echoTick(k, dt, s)) return;
    const sc = k.f.type.scale;
    s.pix.rate('wisp', 2, dt, () => {
      s.pix.emit(CX + pm() * 140, 60 + R() * 120, { vx: pm() * 20, vy: -30 - R() * 30, life: 1, r0: 6 * sc, r1: 14 * sc, a: 0.35, tint: R() < 0.5 ? 0x7af0d8 : 0xb06bff, fade: 0.3 });
    });
    landDust(k, s.extra, 14, [0x9a8a6a, 0x7a6a50], 288, 100);
    if (k.landed && s.grit)
      for (let i = 0, m = k.burst(10); i < m; i++)
        s.grit.emit(CX + pm() * 160, 286, { vx: pm() * 380, vy: -180 - R() * 220, life: 0.8, r0: 4 * sc, r1: 3 * sc, a: 1, tint: R() < 0.5 ? 0x6a5a44 : 0xe8dcc0, grav: 1000, spin: 9, fade: 0.02 });
  },
});
