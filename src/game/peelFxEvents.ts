// What a peel ability or a topping proc did, as events (docs/effects-plan.md, step 3: effects never draw). The scene
// runs the effects (GameScene.runEffects: damage, burns, slows, stuns, marks, chains, finishes, shields, blasts) and
// fires one of these for each thing that shows; the ability visuals (src/game/abilityFx.ts) listen and play it. The
// events fire at the moment the old drawing calls did, in the same order, so the cosmetic generator draws the same.

import type { Foot } from './Foot';
import type { Vfx } from './abilities';

export const PeelFx = {
  /** The ability's name over the peel (a timed or wave-start ability), or in the middle (a meter ability). */
  Named: 'named',
  /** A hit landed on a foot: its element's mark (frost, fire, a glint, a raindrop, an impact). */
  Hit: 'hit',
  /** A foot set on fire. */
  Burn: 'burn',
  /** A foot frozen, and the freeze's sound (once for the lot). */
  Freeze: 'freeze',
  FreezeSound: 'freezeSound',
  /** Freeze Frame's freeze on a meter ability: its sound. */
  SlamFreezeSound: 'slamFreezeSound',
  /** A foot marked to take more. */
  Mark: 'mark',
  /** A chain's sound, and each jump of it. */
  ChainSound: 'chainSound',
  Chain: 'chain',
  /** A foot finished off. */
  Finished: 'finished',
  /** A pizza's shield up. */
  Shield: 'shield',
  /** A blast going off, and its sound (once for the lot). */
  Blast: 'blast',
  BlastSound: 'blastSound',
} as const;
export type PeelFxId = (typeof PeelFx)[keyof typeof PeelFx];

export interface PeelFxData {
  named: { name: string; color: number; x: number; y: number; big: boolean };
  hit: { foot: Foot; vfx: Vfx; color: number };
  burn: { foot: Foot };
  freeze: { foot: Foot };
  freezeSound: Record<string, never>;
  slamFreezeSound: Record<string, never>;
  mark: { foot: Foot; color: number };
  chainSound: Record<string, never>;
  chain: { x1: number; y1: number; x2: number; y2: number };
  finished: { foot: Foot };
  shield: { x: number; y: number; color: number };
  blast: { x: number; y: number; r: number };
  blastSound: Record<string, never>;
}

/** A tiny typed emitter: the scene fires, the ability visuals listen. */
export class PeelFxBus {
  private subs = new Map<PeelFxId, ((d: never) => void)[]>();
  on<E extends PeelFxId>(ev: E, fn: (d: PeelFxData[E]) => void): void {
    this.subs.set(ev, [...(this.subs.get(ev) ?? []), fn as (d: never) => void]);
  }
  emit<E extends PeelFxId>(ev: E, d: PeelFxData[E]): void {
    for (const fn of this.subs.get(ev) ?? []) (fn as (d: PeelFxData[E]) => void)(d);
  }
}
