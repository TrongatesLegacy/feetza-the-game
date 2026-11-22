// Live backdrop layers: animated scenery drawn over a painted backdrop (a moving aurora, drifting
// clouds, a blizzard that thickens wave by wave, a bridge catching fire). Every module in
// src/content/live/ (loaded by src/content/live.ts) registers its scenes here; BackdropView starts one when its backdrop shows and
// tells it which wave of the stage it is, so weather and light can change across the stage.

import { backdropsAnimated } from '../systems/graphics';
import type Phaser from 'phaser';
import type { BackdropId } from '../art/backdrops';

export interface LiveCtx {
  sc: Phaser.Scene;
  /** Above the painted backdrop and its glows, under the ambient particles, pizzas and feet. */
  layer: Phaser.GameObjects.Container;
  /** Wave within the stage: 1–4 for a location, 5 for a boss arena (3 brings the mini-boss). */
  wave: number;
  /** Show this texture as the painted backdrop instead of the still (a scene painted with the location kit draws
   * its moving parts itself, so its base leaves them out: src/game/sceneLive.ts). Called while starting. */
  setBase?(key: string): void;
}

export interface LiveScene {
  /** A new wave of the same stage started (weather and light may change). */
  setWave?(wave: number): void;
  /** Something hit the table at screen x (a foot's stomp): k 0…1 (a boss's is 1). The scenery may react. */
  impact?(x: number, k: number): void;
  update(dt: number): void;
  destroy(): void;
}

export type LiveFactory = (ctx: LiveCtx) => LiveScene;

const live: Partial<Record<BackdropId, LiveFactory>> = {};
/** The old live layers of redrawn scenes, kept for the before/after page (?dev&stages). */
const legacy: Partial<Record<BackdropId, LiveFactory>> = {};
/** Builds what a scene's live layer shows (its base and baked layers) ahead of time, e.g. while loading. */
const prepares: Partial<Record<BackdropId, (sc: Phaser.Scene) => void>> = {};

/** Frees what prepare built (a stage left behind for good). */
const releases: Partial<Record<BackdropId, (sc: Phaser.Scene) => void>> = {};

export function registerLive(id: BackdropId, f: LiveFactory, prepare?: (sc: Phaser.Scene) => void, release?: (sc: Phaser.Scene) => void): void {
  live[id] = f;
  if (prepare) prepares[id] = prepare;
  if (release) releases[id] = release;
}

/** Free a scene's live textures (it can build them again if it comes back). */
export function releaseLive(sc: Phaser.Scene, id: BackdropId): void {
  releases[id]?.(sc);
}

export function registerLegacyLive(id: BackdropId, f: LiveFactory): void {
  legacy[id] = f;
}

export function startLive(id: BackdropId, ctx: LiveCtx, variant?: 'legacy'): LiveScene | null {
  if (!backdropsAnimated()) return null;
  return (variant === 'legacy' ? legacy[id] : live[id])?.(ctx) ?? null;
}

/** Make the textures a backdrop will show when its live layer will run (its live base and baked layers). Returns
 * false when it won't (the caller paints the still instead). */
export function prepareLive(sc: Phaser.Scene, id: BackdropId): boolean {
  const p = prepares[id];
  if (!p || !backdropsAnimated()) return false;
  p(sc);
  return true;
}
