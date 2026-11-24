// Damage dealt in play, by where it came from, and the pace you dealt it at: the STATS tab's measured numbers.
// Plain counters only: the damage path adds to one key per hit (no allocation once a key exists), and the
// scene adds frame time while feet are on the table and a count per landed smack.

/** One stretch of play: damage by source, seconds with a foot on the table, smacks that landed, kills, and
 *  foot-seconds (feet on the table × time: over sec, how many feet there were to hit on average). */
export interface TallySpan {
  by: Record<string, number>;
  sec: number;
  feetSec: number;
  smacks: number;
  kills: number;
}

const span = (): TallySpan => ({ by: {}, sec: 0, feetSec: 0, smacks: 0, kills: 0 });

function addInto(to: TallySpan, from: TallySpan): void {
  for (const k in from.by) to.by[k] = (to.by[k] ?? 0) + from.by[k];
  to.sec += from.sec;
  to.feetSec += from.feetSec;
  to.smacks += from.smacks;
  to.kills += from.kills;
}

export class DmgTally {
  /** The wave in play (or the last one, until the next begins). */
  wave: TallySpan = span();
  /** The last wave that finished, and which wave it was. */
  last: TallySpan | null = null;
  lastWave = 0;
  /** Every finished wave this run (the wave in play joins it when it ends). */
  run: TallySpan = span();
  private live = false;

  /** Damage dealt: the only call on the damage path. */
  add(key: string, n: number): void {
    this.wave.by[key] = (this.wave.by[key] ?? 0) + n;
  }

  beginWave(): void {
    this.wave = span();
    this.live = true;
  }

  endWave(n: number): void {
    if (!this.live) return;
    this.live = false;
    this.last = this.wave;
    this.lastWave = n;
    addInto(this.run, this.wave);
    // late hits after the clear (a burn's last tick, a delayed blast) land in a span nobody reads
    this.wave = span();
  }

  /** A frame of play with n feet on the table to hit. */
  tick(sec: number, n: number): void {
    this.wave.sec += sec;
    this.wave.feetSec += sec * n;
  }

  /** The run so far, the wave in play included. */
  runSoFar(): TallySpan {
    const out = span();
    addInto(out, this.run);
    if (this.live) addInto(out, this.wave);
    return out;
  }

  get inWave(): boolean {
    return this.live;
  }

  reset(): void {
    this.wave = span();
    this.last = null;
    this.lastWave = 0;
    this.run = span();
    this.live = false;
  }
}

export function total(s: TallySpan): number {
  let t = 0;
  for (const k in s.by) t += s.by[k];
  return t;
}
