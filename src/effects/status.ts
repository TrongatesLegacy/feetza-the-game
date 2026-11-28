// Statuses, defined once (docs/effects-plan.md): what each does to a foot, who is immune, and how a second one stacks
// with what's already on it. Actions (Action.Apply) put them on; nothing else writes a foot's burn, slow or stun.
//
//   Status.Burn(Unit.Seconds(3), Dps.Smack(Unit.Mult(1)))      Hot Honey: 3 s at your smack damage a second
//   Status.Slow(Unit.Seconds(3), Unit.Percent(40))             Sticky: 40% slower (scaled by the perk's strength)
//   Status.Stun(Enh(Unit.Seconds(0.3), Unit.Seconds(0.5)))     Fondue: 0.3 s (enhanced 0.5)
//   Status.Freeze(Enh(Unit.Seconds(2), Unit.Seconds(3)))       Cold Smoked
//
// The rules written once:
// - Burn: immuneBurn feet never burn; a burn keeps the longer time and the hotter fire of the two.
// - Slow: immuneSlow feet never slow. Stack.Refresh (Sticky, Hot Honey) restarts the time and keeps the stronger
//   slow; Stack.Strongest (a dance beat, a snowball, a song) only takes when nothing stronger is on, so it never
//   strengthens (or shortens) a slow already there: a boss's own slow is never made worse.
// - Stun and Freeze: the longer stun stands (Foot.stun); insulated boots shrug off a freeze.

import type { Foot } from '../game/Foot';
import type { Mult, Percent, Seconds } from './units';

/** A value that's one thing plain and another enhanced (not scaled by strength). */
export interface ByEnh<T> {
  plain: T;
  enhanced: T;
}
export const Enh = <T>(plain: T, enhanced: T): ByEnh<T> => ({ plain, enhanced });
export type MaybeEnh<T> = T | ByEnh<T>;
export const pickEnh = <T>(v: MaybeEnh<T>, enhanced: boolean): T => (typeof v === 'object' && v !== null && 'plain' in v ? (enhanced ? v.enhanced : v.plain) : (v as T));

/** How hot a burn is: your smack damage times m (and the perk's strength), or a flat number a second. */
export type DpsData = { d: 'smack'; m: Mult; scaled: boolean } | { d: 'flat'; n: number; scaled: boolean };
export const Dps = {
  /** Smack damage × m a second, × the perk's strength. */
  Smack: (m: Mult): DpsData => ({ d: 'smack', m, scaled: true }),
  /** n a second, × the perk's strength. */
  Flat: (n: number): DpsData => ({ d: 'flat', n, scaled: true }),
  /** n a second, whatever the strength. */
  Fixed: (n: number): DpsData => ({ d: 'flat', n, scaled: false }),
  /** Smack damage × m a second, whatever the strength. */
  Plain: (m: Mult): DpsData => ({ d: 'smack', m, scaled: false }),
} as const;

export const SlowStack = {
  /** Restart its time and keep the stronger slow. */
  Refresh: 'refresh',
  /** Take only when nothing stronger is on (never strengthen a slow already there). */
  Strongest: 'strongest',
} as const;
export type SlowStackId = (typeof SlowStack)[keyof typeof SlowStack];

export type StatusData =
  | { s: 'burn'; sec: MaybeEnh<Seconds>; dps: DpsData }
  | { s: 'slow'; sec: MaybeEnh<Seconds>; pct: Percent; scaled: boolean; stack: SlowStackId }
  | { s: 'stun'; sec: MaybeEnh<Seconds> }
  | { s: 'freeze'; sec: MaybeEnh<Seconds> };

export const Status = {
  Burn: (sec: MaybeEnh<Seconds>, dps: DpsData): StatusData => ({ s: 'burn', sec, dps }),
  /** pct scaled by the perk's strength (Stack.Refresh), unless `fixed`. */
  Slow: (sec: MaybeEnh<Seconds>, pct: Percent, o: { stack?: SlowStackId; fixed?: boolean } = {}): StatusData => ({ s: 'slow', sec, pct, scaled: !o.fixed, stack: o.stack ?? SlowStack.Refresh }),
  Stun: (sec: MaybeEnh<Seconds>): StatusData => ({ s: 'stun', sec }),
  Freeze: (sec: MaybeEnh<Seconds>): StatusData => ({ s: 'freeze', sec }),
} as const;

/** Put a status on f. k: the perk's strength; damage: your smack damage now. False when it didn't take (immune). */
export function applyStatus(st: StatusData, f: Foot, o: { k: number; enhanced: boolean; damage: number }): boolean {
  if (!f.alive) return false;
  switch (st.s) {
    case 'burn': {
      if (f.type.traits.includes('immuneBurn')) return false;
      const d = st.dps;
      const base = d.d === 'smack' ? o.damage * d.m : d.n;
      f.burnT = Math.max(f.burnT, pickEnh(st.sec, o.enhanced));
      f.burnDps = Math.max(f.burnDps, d.scaled ? base * o.k : base);
      return true;
    }
    case 'slow': {
      if (f.type.traits.includes('immuneSlow')) return false;
      const pct = st.scaled ? st.pct * o.k : st.pct;
      const sec = pickEnh(st.sec, o.enhanced);
      if (st.stack === SlowStack.Refresh) {
        f.slowT = sec;
        f.slowPct = Math.max(f.slowPct, pct);
        return true;
      }
      if (f.slowT <= 0 || f.slowPct <= pct) {
        f.slowPct = pct;
        f.slowT = Math.max(f.slowT, sec);
      }
      return true;
    }
    case 'stun':
      f.stun(pickEnh(st.sec, o.enhanced));
      return true;
    case 'freeze':
      f.stun(pickEnh(st.sec, o.enhanced), true);
      return true;
  }
}

export function describeStatus(st: StatusData): string {
  const sec = (v: MaybeEnh<Seconds>) => (typeof v === 'number' ? `${v}s` : `${v.plain}s (enhanced ${v.enhanced}s)`);
  switch (st.s) {
    case 'burn':
      return `set it on fire for ${sec(st.sec)}`;
    case 'slow':
      return `slow it ${Math.round(st.pct * 100)}% for ${sec(st.sec)}`;
    case 'stun':
      return `stun it for ${sec(st.sec)}`;
    case 'freeze':
      return `freeze it for ${sec(st.sec)}`;
  }
}
