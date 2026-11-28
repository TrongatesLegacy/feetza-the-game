// Effect.OnPick: what happens the moment a topping is picked (docs/effects-plan.md, step 3): heal the table, top its
// freshness up, arm a consumable that waits to trigger, open a Pick or Peel Roulette, a free extra level, an extra
// pizza. The scene runs it (GameScene.applyUpgrade) by the typed name (OnPick in src/data/itemKinds.ts), never by the
// topping.
//
//   Effect.OnPick(OnPick.Fridge)          Fridge Magnet: +4 freshness to the pizzas on the table now
//
// Its card text is the topping's own (quiet).

import { OnPick } from '../data/itemKinds';
import { effectKind } from './kind';
import { Tag, type TagId } from './tags';

const WORDS: Record<OnPick, string> = {
  healAll2: 'every pizza regrows 2 slices now',
  extraPizza: 'an extra pizza on the table now',
  fridge: 'pizzas on the table +4 freshness now',
  arm: 'waits, armed, until it triggers',
  pick: 'choose 1 of 3 toppings, free',
  roulette: 'spin for a peel',
  crispy: 'the pizza with the fewest slices gets one more',
  bogo: 'the next topping you level up gets a free extra level',
};

export interface OnPickData {
  readonly kind: 'onPick';
  pick: OnPick;
}

const make = (pick: OnPick): OnPickData => ({ kind: 'onPick', pick });

export const OnPickEffect = effectKind('onPick', make, {
  // (run by the scene when it's picked, GameScene.applyUpgrade; nothing to apply)
  apply: () => {},
  describe: (e) => WORDS[e.pick],
  scale: (e) => e,
  tags: (e): TagId[] => [Tag.OnPick(e.pick)],
  quiet: true,
});

export { OnPick };
