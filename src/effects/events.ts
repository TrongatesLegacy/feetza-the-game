// The game's moments a trigger effect can wait on (docs/effects-plan.md): typed names, never loose strings. The scene
// (through PizzaPerkKit) fires each one on the trigger bus; effects subscribe through their ctx.

import type { Foot } from '../game/Foot';
import type { Pizza } from '../game/Pizza';
import type { HitQuery } from './perHit';
import type { ChargeFromId } from './charged';

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
  // ——— step 3 ———
  /** A stomp is about to land on a pizza, before anything else (piercing stomps too): a defence may block it. */
  PreStomp: 'preStomp',
  /** A stomp meets the pizza's walls (where Pizza Stone is: a piercing stomp never gets here): a defence may block it. */
  StompWall: 'stompWall',
  /** A stomp is about to take slices: a defence may take fewer (`dmg`). */
  StompDamage: 'stompDamage',
  /** A frame of a wave begins (before the feet are looked at). */
  FrameStart: 'frameStart',
  /** A foot standing on the field, once a frame. */
  FootTick: 'footTick',
  /** A wave opens: the table's own changes, before the field is set (shields, new colours, picks). */
  WaveOpen: 'waveOpen',
  /** A pizza joins the table (`fresh`: bought or placed now, not a saved run coming back). */
  Placed: 'placed',
  /** A pizza was enhanced. */
  Enhanced: 'enhanced',
  /** A pizza has just been destroyed: a perk may keep it (`answer`). */
  Destroyed: 'destroyed',
  /** A pizza is lost (it stayed destroyed): a perk may bring it back (`answer`). */
  Lost: 'lost',
  /** The peel's meter ability is used (pressed, or by itself when the meter fills). */
  Slam: 'slam',
  /** The wave is over, before anything is paid for it: the props and walls come down. */
  WaveClose: 'waveClose',
  /** A hit (or a moment) being worked out: never emitted, asked (Effect.PerHit, src/effects/perHit.ts). */
  Hit: 'hit',
  // ——— step 4 ———
  /** Charge comes to the peel's charged clock (Effect.Charged): from where, how much; `taken` once a clock took it. */
  Charge: 'charge',
  /** Slices were just lost to a stomp (the Incredible Bulk's rage counts them). */
  Losses: 'losses',
} as const;
export type GameEventId = (typeof GameEvent)[keyof typeof GameEvent];

/** What each moment carries. `foot` and `pizza` are the ones it's about (none for the wave's own moments). */
export interface EventData {
  /** `ready`: a pass that looks at the field once, as it begins (the toppings' procs: Cond.Ready). */
  tick: { dt: number; ready?: boolean };
  /** Where it fell (x, y: its middle as it went down); `byAbility`: the peel's ability's own kill. */
  kill: { foot: Foot; coins: number; echo: boolean; byAbility: boolean; x: number; y: number };
  smack: { foot: Foot; x: number };
  swing: { foot: Foot };
  crit: { foot: Foot };
  stomp: { foot: Foot; pizza: Pizza };
  waveStart: { wave: number };
  waveClear: { wave: number; perfect: boolean; earned: number };
  preStomp: { foot: Foot; pizza: Pizza; blocked: boolean };
  stompWall: { foot: Foot; pizza: Pizza; blocked: boolean };
  stompDamage: { foot: Foot; pizza: Pizza; dmg: number };
  frameStart: { dt: number };
  footTick: { foot: Foot; dt: number };
  waveOpen: { wave: number };
  placed: { pizza: Pizza; fresh: boolean };
  enhanced: { pizza: Pizza };
  destroyed: { pizza: Pizza; fresh: boolean; answer: Answer };
  lost: { pizza: Pizza; fresh: boolean; answer: Answer };
  hit: HitQuery;
  waveClose: { wave: number };
  slam: { auto: boolean };
  charge: { from: ChargeFromId; share: number; taken: boolean };
  losses: { n: number };
}

/** What a perk answers when a pizza is destroyed: it survives (back on its feet now), it rises (back in a moment), or
 *  nothing (it's gone). */
export const Answer = { None: null, Survive: 'survive', Rise: 'rise' } as const;
export type Answer = (typeof Answer)[keyof typeof Answer];

/** Moments that ask a question: the bus stops once one is answered (first defence wins). */
export function answered(ev: AnyEvent): boolean {
  return ('blocked' in ev && ev.blocked) || ('answer' in ev && ev.answer !== null);
}
export type AnyEvent = EventData[GameEventId];

/** The foot a moment is about, if any. */
export function footOf(ev: AnyEvent): Foot | null {
  return 'foot' in ev ? ev.foot : null;
}

/** The pizza a moment is about: the one stomped, else the one the foot was over. */
export function pizzaOf(ev: AnyEvent): Pizza | null {
  if ('pizza' in ev) return ev.pizza;
  return 'foot' in ev ? (ev.foot?.target ?? null) : null;
}
