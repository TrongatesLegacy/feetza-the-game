// Momentum: automatic damage runs on the player's smacking (the rules and numbers are in src/data/difficulty.ts,
// MomentumHeat and MOMENTUM). A hidden 0..1 per run: smacks that connect fill it, it holds for a grace after each, then
// drains to the heat's floor, and only while there's a foot the player could be smacking. The scene multiplies every
// automatic hit by mult(); the HUD's PEEL SLAM button shows it as the furnace's fire, and the table's automatic
// attacks cool with it (glow()).

import { MOMENTUM, type MomentumHeat } from '../data/difficulty';

export class Momentum {
  /** 0 (cold: automatic damage at the floor) .. 1 (hot: full strength). */
  value = 1;
  /** Seconds left before it starts to drain. */
  private hold = 0;

  /** `heat`: the run's heat's numbers, read each time (the heat is set after the run is made; the sim may tune them). */
  constructor(private heatOf: () => MomentumHeat) {}

  private get heat(): MomentumHeat {
    return this.heatOf();
  }

  /** What automatic damage is multiplied by right now: floor + (1 − floor) × momentum. */
  mult(): number {
    const f = this.heat.floor;
    return f + (1 - f) * this.value;
  }

  /** How hot the table's automatic attacks look (0.55 cold .. 1 hot): cheap visual cooling, never fully out. */
  glow(): number {
    return 0.55 + 0.45 * this.value;
  }

  /** A smack connected (or, with `full`, the Peel Slam or a charged ability went off). */
  hit(full = false): void {
    this.value = Math.min(1, this.value + (full ? MOMENTUM.slamGain : MOMENTUM.smackGain));
    this.hold = this.heat.grace;
  }

  /** A new wave: full, with a fresh grace. */
  reset(): void {
    this.value = 1;
    this.hold = this.heat.grace;
  }

  /** Real seconds of play. `drains`: there's a foot the player could be smacking (otherwise it holds as it is). */
  tick(dt: number, drains: boolean): void {
    if (!drains || this.value <= 0) return;
    if (this.hold > 0) {
      this.hold -= dt;
      if (this.hold > 0) return;
      dt = -this.hold;
      this.hold = 0;
    }
    this.value = Math.max(0, this.value - dt / Math.max(0.1, this.heat.drain));
  }
}
