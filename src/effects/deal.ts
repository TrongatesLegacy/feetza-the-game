// Effect.Deal: a rule of the shop's deal that a topping turns on (docs/effects-plan.md, step 3): what's free, what's on
// the counter, what comes back on the shelf. The shop (src/game/shopDeals.ts, the scene's shop) asks the run for the
// rule (Run.deal: the level it's held at), never for the topping.
//
//   Effect.Deal(DealRule.FreeLunch)        Free Lunch: once every 10 waves, one topping card free
//
// Its card text is the topping's own (quiet).

import { effectKind } from './kind';
import { Tag, type TagId } from './tags';

/** The shop's deal rules. */
export const DealRule = {
  /** Once every ten-wave block, any one topping card is free. */
  FreeLunch: 'freeLunch',
  /** One free counter pizza every ten-wave block. */
  Bottomless: 'bottomless',
  /** One free counter pizza, once a run. */
  FreeDelivery: 'freeDelivery',
  /** A Chef's Special is always on the counter. */
  ChefsSpecial: 'chefsSpecial',
  /** One topping card in every shop is half price. */
  Clearance: 'clearance',
  /** The first card bought in each shop restocks. */
  Restock: 'restock',
} as const;
export type DealRuleId = (typeof DealRule)[keyof typeof DealRule];

const WORDS: Record<DealRuleId, string> = {
  freeLunch: 'once every 10 waves, one topping card free',
  bottomless: 'one free counter pizza every 10 waves',
  freeDelivery: 'one free counter pizza, once a run',
  chefsSpecial: 'a Chef’s Special always on the counter',
  clearance: 'one topping card in every shop half price',
  restock: 'the first card bought in each shop restocks',
};

export interface DealData {
  readonly kind: 'deal';
  rule: DealRuleId;
}

const make = (rule: DealRuleId): DealData => ({ kind: 'deal', rule });

export const DealEffect = effectKind('deal', make, {
  // (read by the shop through Run.deal; nothing to apply)
  apply: () => {},
  describe: (e) => WORDS[e.rule],
  scale: (e) => e,
  tags: (e): TagId[] => [Tag.Deal(e.rule)],
  quiet: true,
});
