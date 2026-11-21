// Live backdrop layers: animated scenery drawn over a painted backdrop (a moving aurora, drifting
// clouds, a blizzard that thickens wave by wave, a bridge catching fire). Every module in
// src/content/live/ (loaded by src/content/live.ts) registers its scenes here; BackdropView starts one when its backdrop shows and
// tells it which wave of the stage it is, so weather and light can change across the stage.

import type Phaser from 'phaser';
import type { BackdropId } from '../art/backdrops';

export interface LiveCtx {
  sc: Phaser.Scene;
  /** Above the painted backdrop and its glows, under the ambient particles, pizzas and feet. */
  layer: Phaser.GameObjects.Container;
  /** Wave within the stage: 1–4 for a location, 5 for a boss arena (3 brings the mini-boss). */
  wave: number;
}

export interface LiveScene {
  /** A new wave of the same stage started (weather and light may change). */
  setWave?(wave: number): void;
  update(dt: number): void;
  destroy(): void;
}

export type LiveFactory = (ctx: LiveCtx) => LiveScene;

const live: Partial<Record<BackdropId, LiveFactory>> = {};

export function registerLive(id: BackdropId, f: LiveFactory): void {
  live[id] = f;
}

export function startLive(id: BackdropId, ctx: LiveCtx): LiveScene | null {
  return live[id]?.(ctx) ?? null;
}
