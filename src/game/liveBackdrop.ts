// Live backdrop layers: animated scenery drawn over a painted backdrop (a moving aurora, drifting
// clouds, a blizzard that thickens wave by wave, a bridge catching fire). Every module in
// src/content/live/ (loaded by src/content/live.ts) registers its scenes here; BackdropView starts one when its backdrop shows and
// tells it which wave of the stage it is, so weather and light can change across the stage.

import { backdropsAnimated } from '../systems/graphics';
import type Phaser from 'phaser';
import type { BackdropId } from '../art/backdrops';
import { backdropReady, dropBackdrop, prepareBackdrop } from './packs';
import { traced } from './packTrace';

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
  /** Something hit the table or shook the room (a stomp at x, y; power 0…1): hanging things swing, dust sifts. */
  impact?(x: number, y: number, power: number): void;
  update(dt: number): void;
  destroy(): void;
}

export type LiveFactory = (ctx: LiveCtx) => LiveScene;

const live: Partial<Record<BackdropId, LiveFactory>> = traced('liveBackdrops', {});
/** The old live layers of redrawn scenes, kept for the before/after page (?dev&stages). */
const legacy: Partial<Record<BackdropId, LiveFactory>> = traced('legacyLive', {});
/** Builds what a scene's live layer shows (its base and baked layers) ahead of time, e.g. while loading. */
const prepares: Partial<Record<BackdropId, (sc: Phaser.Scene) => void>> = traced('livePrepares', {});

/** Frees what prepare built (a stage left behind for good). */
const releases: Partial<Record<BackdropId, (sc: Phaser.Scene) => void>> = traced('liveReleases', {});

export function registerLive(id: BackdropId, f: LiveFactory, prepare?: (sc: Phaser.Scene) => void, release?: (sc: Phaser.Scene) => void): void {
  live[id] = f;
  if (prepare) prepares[id] = prepare;
  if (release) releases[id] = release;
}

/** Free a scene's live textures (it can build them again if it comes back). */
export function releaseLive(sc: Phaser.Scene, id: BackdropId): void {
  releases[id]?.(sc);
  // (and any of its pre-built frames still waiting for their painter)
  dropBackdrop(id);
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

/** Decode a backdrop's pre-built textures (src/game/packs.ts) ahead of showing it: its live layer's with Animated
 * stages on, its still otherwise. Resolves when they're ready, or after `ms` (they're then painted as before). */
export function preparePacked(sc: Phaser.Scene, id: BackdropId, ms = 8000): Promise<void> {
  const work = prepareBackdrop(id, backdropsAnimated(), (k) => sc.textures.exists(k));
  return Promise.race([work, new Promise<void>((r) => setTimeout(r, ms))]);
}

/** Can this backdrop show without painting (its packed textures decoded, or nothing packed to wait for)? */
export function packedReady(sc: Phaser.Scene, id: BackdropId): boolean {
  return backdropReady(id, backdropsAnimated(), (k) => sc.textures.exists(k));
}
