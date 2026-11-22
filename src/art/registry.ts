// Plug-in registry for Feetza 2.0 content. Content modules in src/content/art register foot kinds,
// pizza toppings and scene backdrops here, so new content lives in new files only.

import type { FootArt } from '../data/feet';
import type { BackdropId, BackdropInfo } from './backdrops';
import type { Ctx } from './util';

export interface KindDrawer {
  /** Draw the foot in design space (same frame as the built-in kinds in feetArt.ts / feetKinds2.ts). */
  draw(ctx: Ctx, art: FootArt, r: () => number): void;
  /** Design-space y of the sole's contact point (default 260). */
  contactY?: number;
  /** Design-space half width of the foot body (default 104). */
  halfWidth?: number;
}

export interface ToppingDrawer {
  /** Draw one topping piece centred at the origin (pizza top-down space). */
  draw(ctx: Ctx, rand: () => number): void;
  /** How many pieces a pizza with only this topping gets (default 8). */
  count?: number;
  /** Minimum spacing between pieces (default 28). */
  minDist?: number;
}

export interface SceneDef {
  info: Omit<BackdropInfo, 'id'>;
  /** Paint the full 1920x1080 backdrop. */
  draw(ctx: Ctx, r: () => number): void;
}

const kinds: Record<string, KindDrawer> = {};
const toppings: Record<string, ToppingDrawer> = {};
const scenes: Partial<Record<BackdropId, SceneDef>> = {};
const sceneListeners: ((id: BackdropId, def: SceneDef) => void)[] = [];

export function registerKind(kind: string, d: KindDrawer): void {
  kinds[kind] = d;
}
export function kindDrawer(kind: string): KindDrawer | undefined {
  return kinds[kind];
}

export function registerTopping(id: string, d: ToppingDrawer): void {
  toppings[id] = d;
}
export function toppingDrawer(id: string): ToppingDrawer | undefined {
  return toppings[id];
}

export function registerScene(id: BackdropId, def: SceneDef): void {
  scenes[id] = def;
  for (const l of sceneListeners) l(id, def);
}
export function sceneDef(id: BackdropId): SceneDef | undefined {
  return scenes[id];
}

/** The old art of scenes redrawn with the location kit (src/art/scene), for the before/after page. */
const legacyScenes: Partial<Record<BackdropId, SceneDef>> = {};
export function registerLegacyScene(id: BackdropId, def: SceneDef): void {
  legacyScenes[id] = def;
}
export function legacySceneDef(id: BackdropId): SceneDef | undefined {
  return legacyScenes[id];
}
export function onSceneRegistered(fn: (id: BackdropId, def: SceneDef) => void): void {
  sceneListeners.push(fn);
  for (const [id, def] of Object.entries(scenes) as [BackdropId, SceneDef][]) fn(id, def);
}
