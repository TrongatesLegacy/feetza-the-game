// The game's moments a trigger effect can wait on (docs/effects-plan.md): typed names, never loose strings. The scene
// (through PizzaPerkKit) fires each one on the trigger bus; effects subscribe through their ctx.

import type { Foot } from '../game/Foot';
import type { Pizza } from '../game/Pizza';

export const GameEvent = {
  /** Every frame of a wave. */
  Tick: 'tick',
  /** A foot was defeated. */
  Kill: 'kill',
  /** A smack landed on a foot. */
  Smack: 'smack',
  /** A swing of the peel landed (once a swing, however many feet it hit). */
  Swing: 'swing',
  /** A smack crit. */
  Crit: 'crit',
  /** A stomp landed on a pizza. */
  Stomp: 'stomp',
  /** A wave begins. */
  WaveStart: 'waveStart',
  /** The wave is clear. */
  WaveClear: 'waveClear',
} as const;
export type GameEventId = (typeof GameEvent)[keyof typeof GameEvent];

/** What each moment carries. `foot` and `pizza` are the ones it's about (none for the wave's own moments). */
export interface EventData {
  tick: { dt: number };
  kill: { foot: Foot; coins: number; echo: boolean };
  smack: { foot: Foot; x: number };
  swing: { foot: Foot };
  crit: { foot: Foot };
  stomp: { foot: Foot; pizza: Pizza };
  waveStart: { wave: number };
  waveClear: { wave: number; perfect: boolean; earned: number };
}
export type AnyEvent = EventData[GameEventId];

/** The foot a moment is about, if any. */
export function footOf(ev: AnyEvent): Foot | null {
  return 'foot' in ev ? ev.foot : null;
}

/** The pizza a moment is about: the one stomped, else the one the foot was over. */
export function pizzaOf(ev: AnyEvent): Pizza | null {
  if ('pizza' in ev) return ev.pizza;
  return 'foot' in ev ? (ev.foot.target ?? null) : null;
}
