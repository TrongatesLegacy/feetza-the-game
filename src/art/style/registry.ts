// The registry of feet redrawn in the style kit, keyed by foot id. drawFoot (src/art/feetArt.ts) draws a styled
// foot with its style's draw() instead of its kind's; the rig and live layer (src/game/footRig.ts,
// src/game/liveKit.ts) read the rest of the definition. Batches of the roster register their styles from files
// under src/content/style/.

import type { FootArt } from '../../data/feet';
import type { Ctx } from '../util';
import type { Box, Pose } from './kit';
import type { LegSpec } from './legs';

export interface DrawOpts {
  /** In play: leave out what the live layer draws on its own (eyes, ears, tufts, flies, glow). */
  live: boolean;
  /** Draw only the emissive (glowing) parts, for the additive glow layer. */
  emissive?: boolean;
  /** Draw only the overheat glow (metal heating from the sole up), for the boss heat layer. */
  heat?: boolean;
}

/** A part the live layer draws as its own sprite (an eye's lids, an ear, a tuft), in design space. */
export interface PartDef {
  box: Box;
  /** Frames drawn side by side (a blink, a flap); 1 for a still part. */
  frames: number;
  draw(ctx: Ctx, art: FootArt, i: number): void;
  /** The point it swings round (design space), for parts that sway. */
  pivot?: [number, number];
}

export interface StyleDef {
  /** Draw the foot at a pose in design space (same frame as the old kinds: centre x 110, toes down). */
  draw(ctx: Ctx, art: FootArt, p: Pose, o: DrawOpts): void;
  /** Design y of the sole's contact point (default 260). */
  contactY?: number;
  /** Design half width of the body (default 104). */
  halfWidth?: number;
  /**
   * The toe rig: poses only change the art below `from`. In play the body is drawn once (cut off at `to`) and
   * the band below `from` comes from posed frames that fade in between `from` and `to`.
   */
  rig?: { from: number; to: number; bottom?: number };
  /** Live parts drawn as their own sprites. */
  parts?: Record<string, PartDef>;
  /** The leg in the kit's style, and how it joins the foot (src/art/style/legs.ts). */
  leg?: LegSpec;
  /** How much leg (design units) the Pizzapedia portrait shows above the foot (default 120): less for a foot whose
   * own art is already tall (a feathered ruff), so the foot fills the frame. */
  portraitLeg?: number;
}

const styles: Record<string, StyleDef> = {};

/** Dev: ?dev&legacyFeet plays the whole game with every foot's old art (the old drawers stay in place: a style
 * only takes over drawFoot while one is registered and this is off). */
let legacy = typeof location !== 'undefined' && import.meta.env?.DEV && new URLSearchParams(location.search).has('legacyFeet');

/** Dev: switch the legacy art on or off (textures already made keep their art until they're made again). */
export function useLegacyArt(on: boolean): void {
  legacy = on;
}

/** Is the legacy art on (feet drawn in this mode are kept out of the art cache: src/game/artCache.ts)? */
export function legacyArt(): boolean {
  return !!legacy;
}

export function registerStyle(id: string, d: StyleDef): void {
  styles[id] = d;
}

/** The style a foot is drawn and animated with in play (none in legacy mode). */
export function styleFor(id: string): StyleDef | undefined {
  return legacy ? undefined : styles[id];
}

/** A foot's registered style whatever the mode (the style sheet). */
export function styleDef(id: string): StyleDef | undefined {
  return styles[id];
}

export function styledIds(): string[] {
  return Object.keys(styles);
}
