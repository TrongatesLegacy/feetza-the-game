// The slice of the game scene that boss brains and wave events are allowed to use.

import type Phaser from 'phaser';
import type { Foot } from './Foot';
import type { Fx } from './Fx';
import type { Pizza } from './Pizza';
import type { HeatId } from '../data/difficulty';

export interface Clickable {
  x: number;
  y: number;
  r: number;
  /** Called when a smack lands on it. */
  hit(): void;
  /** Smacks prefer this over a foot at the same distance. */
  priority?: number;
  /** A custom hit shape (e.g. a tall beam) instead of the x/y/r circle. */
  contains?(x: number, y: number): boolean;
  alive(): boolean;
  /** A wave event (a flyer or chest): it stays clickable for a moment after the wave ends. */
  event?: boolean;
  /** A name for the dev smack log (src/game/smackLog.ts). */
  label?: string;
}

export interface Arena {
  sc: Phaser.Scene;
  fx: Fx;
  /** Layer above the feet for projectiles, splats and markers. */
  fxLayer: Phaser.GameObjects.Container;
  /** Layer behind the pizzas (pistons, tentacles rising from the table). */
  underLayer: Phaser.GameObjects.Container;
  /** Layer over the feet but under the scene light and the fx layer: a boss's colossal prop that the other feet
   *  pass behind (Kronos's Titan head). */
  overFeetLayer: Phaser.GameObjects.Container;
  now(): number;
  allFeet(): Foot[];
  allPizzas(): Pizza[];
  alivePizzas(): Pizza[];
  peelPoint(): { x: number; y: number };
  /** A boss's summons. When a boss's body covers every lane on the table, summons share a covered lane rather than
   * wait (fights that ward or pin until their summons are cleared need them on the table); `offBoss` ones never do
   * and wait off screen until a lane frees. A `free` one takes no lane at all: the fight moves it by hand (puppet) and
   * places it itself (the Head Waiter's delivery waiters walk in from the side). */
  spawn(id: string, target?: Pizza | null, x?: number, o?: { offBoss?: boolean; free?: boolean }): Foot | null;
  /** Another of a boss already in the fight, at (x, y) with `hpFrac` of its health (the Zombie Loafer's bite on Hot+):
   * its own brain, phases and a second health bar. It pays a tenth and the fight's loot, banner and cleanup wait for
   * the last of them (GameScene.killFoot). */
  spawnExtraBoss?(id: string, x: number, y: number, hpFrac: number): Foot | null;
  /** A non-stomp ability hits a pizza: never blocked by shields, traps or thick crust. */
  /** A pizza loses slices to a move (not a stomp). `shield`: a stomp shield takes it first (a life), as a stomp. */
  hitPizza(p: Pizza, slices: number, label: string, color?: string, o?: { shield?: boolean }): void;
  /** Lock the peel (no smacks) for a moment. */
  stunPeel(sec: number, label: string): void;
  /** The peel trails the pointer (brain freeze, sticky kelp). */
  slowPeel(sec: number): void;
  /** Oven Mitts: the peel can't be stunned, slowed or snatched this run. */
  peelGuarded?(): boolean;
  addClickable(c: Clickable): void;
  banner(big: string, small: string, kind?: 'boss' | 'loc' | 'clear' | 'phase', desc?: string): void;
  /** A boss reached a new phase: its banner, or (the first time a player meets the phase) a card that pauses the
   *  fight to show what to hit. */
  phaseBanner(f: Foot, name: string, info: string): void;
  /** The boss's current move and its answer, shown under the boss bar. */
  bossMove(f: Foot, name: string, info: string): void;
  /** Slow the whole game for a moment (phase changes). */
  dramatic(sec: number): void;
  quip(x: number, y: number, msg: string, color?: string, size?: number): void;
  sfx(key: string, opts?: { volume?: number; rate?: number; throttle?: number }): void;
  shake(ms: number, intensity: number): void;
  flash(ms: number, r: number, g: number, b: number): void;
  rumble(strength: number, ms: number): void;
  /** Speed every regular foot up (roar, avalanche) for a while. */
  hurry(mult: number, sec: number): void;
  hurrying(): boolean;
  /** True while a wave is being fought (false in the shop, after the last kill, or once the run is over). */
  inWave(): boolean;
  cancelHurry(): void;
  /** True for one frame after a Peel Slam lands. */
  slammedAt(): number;
  /** Feet of this id spawned next go for this pizza (Short-Order Shoe). */
  order(p: Pizza, n: number): void;
  possess(p: Pizza | null): void;
  possessed(): Pizza | null;
  layoutPizzas(): void;
  /** Heat: how many phases main bosses get (mini-bosses one fewer). */
  bossPhases(): number;
  /** The heat's foot-count multiplier (Mild 0.8 … Inferno 1.45): scales boss summons. */
  heatCount(): number;
  /** Damage a boss directly (batted-back slippers, cracks). */
  damageFoot(f: Foot, amount: number, label?: string): void;
  /** The run's heat. */
  heat(): HeatId;
  /** Claim (or release) a pizza's lanes for a boss move: regular feet move out and none come in. */
  lockLane(p: Pizza, on: boolean): void;
  /** Pull every regular foot back to the top and pause it (true), or let them carry on (false). No new feet spawn meanwhile. */
  retreat(on: boolean): void;
  isRetreating(): boolean;
  /** A hero's wall stands over the pizzas (King Leonidas's Hold the Line): feet can't get through to them. */
  heroWallUp(): boolean;
  /** While set, the only regular feet that spawn are these ids (a boss's own kind). null = normal. */
  setMinions(ids: string[] | null): void;
  /** While on, the wave's own feet stop arriving (and bosses' reinforcements too): only feet a boss spawns itself
   * come in. Off again with false; it also resets at the end of every wave. */
  pauseSpawns(on: boolean): void;
  /** Switch a pizza's perk off for `sec` (adds to a freeze already running). */
  freezePerk(p: Pizza, sec: number): void;
}
