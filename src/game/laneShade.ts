// Lanes a boss's colossal prop stands in, for things drawn over the table that should step back from it while it's
// up. Kronos's Titan head (src/game/bosses/titanDevour.ts) marks the lane it's eating from; King Leonidas's shield
// wall (src/game/acts/leonidas.ts) reads it every frame and fades the shields in front of it, so the head and the
// pizza it's pulling in stay clear to see and hit. One flag per owner and scene; the strongest one over an x wins.

import type Phaser from 'phaser';

interface Shade {
  x0: number;
  x1: number;
  /** 0 = not obscured … 1 = fully. */
  k: number;
}

const shades = new WeakMap<Phaser.Scene, Map<object, Shade>>();

/** Mark the screen's x0…x1 as obscured by `owner` (k 0…1); k 0 (or clearLane) takes the flag away. */
export function obscureLane(sc: Phaser.Scene, owner: object, x0: number, x1: number, k: number): void {
  let m = shades.get(sc);
  if (!m) shades.set(sc, (m = new Map()));
  if (k <= 0) m.delete(owner);
  else m.set(owner, { x0, x1, k: Math.min(1, k) });
}

export function clearLane(sc: Phaser.Scene, owner: object): void {
  shades.get(sc)?.delete(owner);
}

/** How obscured the lane at x is (0…1). */
export function laneObscured(sc: Phaser.Scene, x: number): number {
  const m = shades.get(sc);
  if (!m?.size) return 0;
  let k = 0;
  for (const s of m.values()) if (x >= s.x0 && x <= s.x1) k = Math.max(k, s.k);
  return k;
}
