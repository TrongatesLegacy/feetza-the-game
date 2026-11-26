// Waiter Walt (data in src/content/feet/roster.ts), through the contentFx foot hooks: his silver tray is a light guard
// shield (src/game/guardShield.ts: 2 smacks on Mild and Regular, 3 from Hot up). When smacks knock it off it doesn't
// break: he flings it at the pizza below (src/game/trayToss.ts), a small, gentle version of the Head Waiter's toss
// (slower with a longer tell on Mild). Smack it back at him for a chunk of his health and a short stun, or it clangs
// down for a slice. The usual re-arm wait later someone in the kitchen tosses him a fresh one (the guard's fetch).

import type { Arena } from '../arena';
import { laneOf } from '../bosses/kit';
import type { FootFx } from '../contentFx';
import type { Foot } from '../Foot';
import type { GuardSnap } from '../guardShield';
import { runHeatRank } from '../heatRules';
import { spinAway, tossTray } from '../trayToss';

/** By heat (Mild … Inferno): seconds the flung tray hangs at his side, its flight, and his stun when it's batted back. */
const TELL = [0.9, 0.7, 0.55, 0.45, 0.4];
const FLIGHT = [2.4, 2.0, 1.7, 1.5, 1.4];
const STUN = [1.6, 1.3, 1.1, 1, 0.9];
/** A batted-back tray takes this share of his health. */
const BAT = 0.4;

function fling(a: Arena, f: Foot, snap: GuardSnap): void {
  const p = f.target && !f.target.dead ? f.target : laneOf(a, f);
  const r = Math.min(4, Math.max(0, runHeatRank()));
  if (!p || !a.inWave()) {
    // nowhere to fling it: it just spins away
    spinAway(a, snap, f.x < 960 ? 1 : -1);
    return;
  }
  tossTray(a, f, snap, p, {
    tell: TELL[r],
    flight: FLIGHT[r],
    bat: Math.round(f.maxHp * BAT),
    stun: STUN[r],
    slices: 1,
    grow: 1.1,
    shout: 'HEADS UP!',
    sfx: { toss: 'sfx_whoosh', bat: 'sfx_hitclang', land: 'sfx_trayclatter' },
  });
}

export const footFx: Record<string, FootFx> = {
  waiter: {
    spawn: (a, f) => {
      f.guardCatch = (snap) => fling(a, f, snap);
    },
  },
};
