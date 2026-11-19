// The slice of the game scene that boss brains and wave events are allowed to use.

import type Phaser from 'phaser';
import type { Foot } from './Foot';
import type { Fx } from './Fx';
import type { Pizza } from './Pizza';

export interface Clickable {
  x: number;
  y: number;
  r: number;
  /** Called when a smack lands on it. */
  hit(): void;
  /** Smacks prefer this over a foot at the same distance. */
  priority?: number;
  alive(): boolean;
}

export interface Arena {
  sc: Phaser.Scene;
  fx: Fx;
  /** Layer above the feet for projectiles, splats and markers. */
  fxLayer: Phaser.GameObjects.Container;
  /** Layer behind the pizzas (pistons, tentacles rising from the table). */
  underLayer: Phaser.GameObjects.Container;
  now(): number;
  allFeet(): Foot[];
  allPizzas(): Pizza[];
  alivePizzas(): Pizza[];
  peelPoint(): { x: number; y: number };
  spawn(id: string, target?: Pizza | null, x?: number): Foot | null;
  /** A non-stomp ability hits a pizza: never blocked by shields, traps or thick crust. */
  hitPizza(p: Pizza, slices: number, label: string, color?: string): void;
  /** Lock the peel (no smacks) for a moment. */
  stunPeel(sec: number, label: string): void;
  /** The peel trails the pointer (brain freeze, sticky kelp). */
  slowPeel(sec: number): void;
  addClickable(c: Clickable): void;
  banner(big: string, small: string, kind?: 'boss' | 'loc' | 'clear' | 'phase'): void;
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
  /** Damage a boss directly (batted-back slippers, cracks). */
  damageFoot(f: Foot, amount: number, label?: string): void;
}
