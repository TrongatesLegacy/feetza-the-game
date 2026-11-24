// Thrym the Frost King in play (his art: src/content/style/thrym.ts). Cosmetic randomness only through crand().
//
// - Freezing mist pools under the sole and rolls off its edges, sinking; when he lands it is thrown out in a wave
//   along the table, with chips of ice and a shake of snow off the fur.
// - Frost creeps: tiny rime sparkles bloom and fade along the band, the crystals' roots and the sole's ledge.
// - The rune breathes slow cold light (the glow layer); the crown's crystal tips glint in turn; now and then a flake
//   of ice sheds from a crystal and tumbles down.
// - Winding up (anticipation) he draws the cold in: the crown flares with glints and frost gathers on the sole.
//   The rig squashes him on landing and the broken chain swings on after (follow-through).
// - Overheated: meltwater drips off the icicles, beads run down the boot, steam rolls up off the crown and the
//   flanks, the mist thins.

import { CX } from '../../art/feetCommon';
import { registerLive } from '../../game/liveKit';
import { crand } from '../../systems/cosmeticRandom';
import { THRYM_DRIPS, THRYM_TIPS } from '../style/thrym';

const R = () => crand();
const pm = () => crand() - 0.5;

/** Where frost creeps: along the band's top, the crystals' roots, the sole's ledge (design x range, y). */
const CREEP: [number, number, number][] = [
  [CX - 86, CX + 86, 40],
  [CX - 104, CX + 104, 232],
  [CX - 70, CX + 70, 60],
];

registerLive('thrym', {
  glow: { rate: 0.32, depth: 0.55, base: 0.5 },
  // pale ice: the second, slower heat pass would wash it white
  heat: { boost: 0.35 },
  rig: { breath: 0.8, squash: 1.15, swing: 0.9 },
  sway: { chain: { k: 60, c: 5, gain: 0.9, idle: 0.04, flop: 0.8 } },
  setup: (k) => ({
    mist: k.emitter({ frame: 'soft', curl: 22, drag: 0.9, below: true, max: 120 }),
    frost: k.emitter({ frame: 'spark', add: true, drag: 0, max: 30 }),
    glint: k.emitter({ frame: 'spark', add: true, drag: 0, max: 12 }),
    flakes: k.emitter({ frame: 'flake', curl: 30, drag: 0.5, max: 40 }),
    drips: k.emitter({ frame: 'drop', drag: 0.15, max: 50 }),
    steam: k.emitter({ frame: 'soft', curl: 40, drag: 0.8, max: 70 }),
  }),
  tick(k, dt, { mist, frost, glint, flakes, drips, steam }) {
    const s = k.f.type.scale;
    const v = k.f.visualAlpha;
    if (v < 0.05) return;
    const cold = 1 - k.heat * 0.7;
    const gather = k.windingUp ? 1 : 0;
    // freezing mist: pooling under the sole and spilling off its edges, sinking as it goes (cold air falls)
    mist.rate('pool', 7 * cold, dt, () => {
      const side = R() < 0.5 ? -1 : 1;
      const edge = R() < 0.6;
      const x = edge ? CX + side * (96 + R() * 18) : CX + pm() * 180;
      mist.emit(x, 262 + R() * 14, { vx: (edge ? side * (25 + R() * 35) : pm() * 30), vy: 14 + R() * 18, life: 2.2 + R() * 1.2, r0: 12 * s, r1: (44 + R() * 22) * s, a: 0.3 * v, tint: R() < 0.6 ? 0xe8f6ff : 0xbfe0f8, fade: 0.3, grav: 22 });
    });
    // frost creeping: rime sparkles bloom and fade along the edges where the cold settles
    frost.rate('creep', (3 + gather * 10) * cold, dt, () => {
      const [x0, x1, y] = CREEP[Math.floor(R() * CREEP.length)];
      frost.emit(x0 + R() * (x1 - x0), y + pm() * 6, { vx: pm() * 6, vy: pm() * 6, life: 0.9 + R() * 0.6, r0: 1.2 * s, r1: (3.4 + R() * 2) * s, a: 0.8 * v, tint: R() < 0.5 ? 0xffffff : 0xbff4ff, fade: 0.45 });
    });
    // the crown's tips glint in turn (more as he winds up)
    glint.rate('tips', (1.1 + gather * 6) * cold, dt, () => {
      const [x, y] = THRYM_TIPS[Math.floor(R() * THRYM_TIPS.length)];
      glint.emit(x, y + 2, { life: 0.32, r0: 2, r1: (12 + R() * 8) * s, a: 0.95 * v, tint: 0xeefcff, fade: 0.35 });
    });
    // now and then a flake of ice sheds off a crystal and tumbles down past the boot
    flakes.rate('shed', 0.5 * cold, dt, () => {
      const [x, y] = THRYM_TIPS[Math.floor(R() * THRYM_TIPS.length)];
      flakes.emit(x, y + 6, { vx: (x - CX) * 0.6 + pm() * 20, vy: -20 - R() * 20, life: 1.4 + R() * 0.6, r0: 3.2 * s, r1: 2.4 * s, a: 0.95 * v, tint: R() < 0.5 ? 0xf4fcff : 0xbfe8ff, spin: 4, grav: 260, fade: 0.05 });
    });
    if (k.landed) {
      // the landing throws the pooled mist out along the table in a wave, chips ice off the sole, shakes the fur
      for (let i = 0, n = k.burst(14); i < n; i++) {
        const side = R() < 0.5 ? -1 : 1;
        mist.emit(CX + side * (50 + R() * 70), 266, { vx: side * (120 + R() * 180), vy: -10 - R() * 20, life: 1.4 + R() * 0.8, r0: 16 * s, r1: (60 + R() * 30) * s, a: 0.42 * v, tint: 0xeaf6ff, fade: 0.08, grav: 30 });
      }
      for (let i = 0, n = k.burst(12); i < n; i++) {
        const side = R() < 0.5 ? -1 : 1;
        flakes.emit(CX + side * (40 + R() * 70), 262, { vx: side * (90 + R() * 240), vy: -140 - R() * 220, life: 0.6 + R() * 0.4, r0: (2.6 + R() * 2) * s, r1: 1.6 * s, a: 1 * v, tint: R() < 0.5 ? 0xe8f8ff : 0x9fd8f8, spin: 9, grav: 900, fade: 0.02 });
      }
      for (let i = 0, n = k.burst(8); i < n; i++) flakes.emit(CX + pm() * 170, 20 + R() * 20, { vx: pm() * 60, vy: -30 - R() * 30, life: 1.4, r0: 2.6 * s, r1: 2 * s, a: 0.9 * v, tint: 0xffffff, spin: 3, grav: 160, fade: 0.1 });
    }
    if (k.heat > 0.08) {
      const h = k.heat;
      // meltwater: beads swell and drop off the icicles' tips, trickles run down the boot
      drips.rate('melt', 6 * h, dt, () => {
        const [x, y] = THRYM_DRIPS[Math.floor(R() * THRYM_DRIPS.length)];
        drips.emit(x, y - 1, { vy: 10, life: 0.9, r0: 3.4 * s, r1: 2.6 * s, a: 0.9 * v, tint: 0xcff0ff, grav: 900, fade: 0.25 });
      });
      drips.rate('run', 5 * h, dt, () => {
        drips.emit(CX + pm() * 180, 70 + R() * 120, { vy: 30 + R() * 30, life: 0.9 + R() * 0.5, r0: 2.2 * s, r1: 1.6 * s, a: 0.8 * v, tint: 0xe4f8ff, grav: 50, fade: 0.2 });
      });
      // steam rolling up off the crown and the flanks
      steam.rate('steam', 12 * h, dt, () => {
        const top = R() < 0.5;
        const [x, y] = top ? THRYM_TIPS[Math.floor(R() * THRYM_TIPS.length)] : [CX + (R() < 0.5 ? -1 : 1) * (80 + R() * 25), 110 + R() * 110];
        steam.emit(x, y, { vx: pm() * 30, vy: -50 - R() * 40, life: 1.4 + R() * 0.6, r0: 10 * s, r1: 44 * s, a: 0.32 * h * v, tint: 0xf4f8ff, fade: 0.2, grav: -20 });
      });
    }
  },
});
